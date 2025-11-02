import math
from typing import List, Optional, Tuple
from models.search import VideomakerSearchFilters, SortOrder

class GeoService:
    """Serviço para cálculos geográficos"""
    
    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calcula distância entre dois pontos usando fórmula de Haversine
        
        Returns:
            Distância em km
        """
        # Raio da Terra em km
        R = 6371.0
        
        # Converte para radianos
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Diferenças
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        # Fórmula de Haversine
        a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        distance = R * c
        return round(distance, 2)
    
    @staticmethod
    def get_bounding_box(lat: float, lon: float, radius_km: float) -> Tuple[float, float, float, float]:
        """
        Calcula bounding box para otimizar busca por raio
        
        Returns:
            (min_lat, max_lat, min_lon, max_lon)
        """
        # Aproximação: 1 grau de latitude ≈ 111 km
        lat_delta = radius_km / 111.0
        
        # Longitude varia com a latitude
        lon_delta = radius_km / (111.0 * math.cos(math.radians(lat)))
        
        return (
            lat - lat_delta,  # min_lat
            lat + lat_delta,  # max_lat
            lon - lon_delta,  # min_lon
            lon + lon_delta   # max_lon
        )


class SearchService:
    """Serviço para busca avançada de videomakers"""
    
    @staticmethod
    async def build_search_query(db, filters: VideomakerSearchFilters) -> dict:
        """Constrói query MongoDB baseada nos filtros"""
        
        query = {
            "role": "videomaker",
            "ativo": True
        }
        
        # Busca por texto (nome, bio, especialidades)
        if filters.query:
            text_regex = {"$regex": filters.query, "$options": "i"}
            query["$or"] = [
                {"nome": text_regex},
                {"bio": text_regex},
                {"especialidades": text_regex}
            ]
        
        # Categoria
        if filters.category:
            query["especialidades"] = filters.category
        elif filters.categories:
            query["especialidades"] = {"$in": filters.categories}
        
        # Rating
        if filters.min_rating is not None:
            query["rating_medio"] = {"$gte": filters.min_rating}
        
        if filters.min_reviews is not None:
            query["total_avaliacoes"] = {"$gte": filters.min_reviews}
        
        # Preço
        price_conditions = []
        if filters.min_price is not None:
            price_conditions.append({"preco_hora": {"$gte": filters.min_price}})
            price_conditions.append({"preco_minimo": {"$gte": filters.min_price}})
        
        if filters.max_price is not None:
            price_conditions.append({"preco_hora": {"$lte": filters.max_price}})
            price_conditions.append({"preco_minimo": {"$lte": filters.max_price}})
        
        if price_conditions:
            query["$or"] = query.get("$or", []) + price_conditions
        
        # Localização por cidade/estado
        if filters.cidade:
            query["cidade"] = {"$regex": filters.cidade, "$options": "i"}
        
        if filters.estado:
            query["estado"] = {"$regex": filters.estado, "$options": "i"}
        
        # Localização por raio (bounding box para otimização)
        if filters.latitude and filters.longitude and filters.radius_km:
            min_lat, max_lat, min_lon, max_lon = GeoService.get_bounding_box(
                filters.latitude,
                filters.longitude,
                filters.radius_km
            )
            
            query["latitude"] = {"$gte": min_lat, "$lte": max_lat}
            query["longitude"] = {"$gte": min_lon, "$lte": max_lon}
        
        # Verificado
        if filters.verified_only:
            query["verificado"] = True
        
        return query
    
    @staticmethod
    async def apply_badge_filter(db, user_ids: List[str], badge_codes: List[str]) -> List[str]:
        """Filtra usuários por badges"""
        
        if not badge_codes:
            return user_ids
        
        # Busca usuários que têm TODOS os badges solicitados
        user_badges = await db.user_badges.find(
            {
                "user_id": {"$in": user_ids},
                "badge_code": {"$in": badge_codes}
            },
            {"_id": 0, "user_id": 1, "badge_code": 1}
        ).to_list(10000)
        
        # Agrupa badges por user
        user_badge_map = {}
        for ub in user_badges:
            user_id = ub["user_id"]
            if user_id not in user_badge_map:
                user_badge_map[user_id] = set()
            user_badge_map[user_id].add(ub["badge_code"])
        
        # Filtra usuários que têm todos os badges
        filtered_users = [
            user_id for user_id, badges in user_badge_map.items()
            if all(badge in badges for badge in badge_codes)
        ]
        
        return filtered_users
    
    @staticmethod
    async def apply_availability_filter(db, user_ids: List[str], date: str) -> List[str]:
        """Filtra usuários disponíveis em uma data"""
        
        available = await db.availability.find(
            {
                "videomaker_id": {"$in": user_ids},
                "date": date,
                "status": "available"
            },
            {"_id": 0, "videomaker_id": 1}
        ).to_list(10000)
        
        return [a["videomaker_id"] for a in available]
    
    @staticmethod
    def calculate_distances(videomakers: List[dict], lat: float, lon: float) -> List[dict]:
        """Calcula distância de cada videomaker"""
        
        for vm in videomakers:
            if vm.get("latitude") and vm.get("longitude"):
                vm["distance_km"] = GeoService.calculate_distance(
                    lat, lon,
                    vm["latitude"], vm["longitude"]
                )
            else:
                vm["distance_km"] = None
        
        return videomakers
    
    @staticmethod
    def filter_by_radius(videomakers: List[dict], radius_km: float) -> List[dict]:
        """Filtra videomakers dentro do raio"""
        
        return [
            vm for vm in videomakers
            if vm.get("distance_km") is not None and vm["distance_km"] <= radius_km
        ]
    
    @staticmethod
    def sort_results(videomakers: List[dict], sort_by: SortOrder) -> List[dict]:
        """Ordena resultados baseado no critério"""
        
        if sort_by == SortOrder.NEAREST:
            # Ordena por distância (null no final)
            return sorted(
                videomakers,
                key=lambda x: (x.get("distance_km") is None, x.get("distance_km") or float('inf'))
            )
        
        elif sort_by == SortOrder.HIGHEST_RATED:
            # Ordena por rating (maior primeiro)
            return sorted(
                videomakers,
                key=lambda x: (x.get("rating_medio", 0), x.get("total_avaliacoes", 0)),
                reverse=True
            )
        
        elif sort_by == SortOrder.LOWEST_PRICE:
            # Ordena por preço (menor primeiro, null no final)
            return sorted(
                videomakers,
                key=lambda x: (
                    x.get("preco_hora") is None and x.get("preco_minimo") is None,
                    x.get("preco_hora") or x.get("preco_minimo") or float('inf')
                )
            )
        
        elif sort_by == SortOrder.MOST_EXPERIENCED:
            # Ordena por jobs concluídos (maior primeiro)
            return sorted(
                videomakers,
                key=lambda x: x.get("total_jobs_completed", 0),
                reverse=True
            )
        
        elif sort_by == SortOrder.NEWEST:
            # Ordena por data de cadastro (mais recente primeiro)
            return sorted(
                videomakers,
                key=lambda x: x.get("created_at", ""),
                reverse=True
            )
        
        return videomakers
    
    @staticmethod
    async def calculate_aggregations(db, videomakers: List[dict]) -> dict:
        """Calcula agregações dos resultados"""
        
        if not videomakers:
            return {
                "total_results": 0,
                "categories": {},
                "avg_rating": 0,
                "avg_price": None,
                "price_range": {"min": None, "max": None},
                "locations": {}
            }
        
        # Contadores por categoria
        categories = {}
        for vm in videomakers:
            for esp in vm.get("especialidades", []):
                categories[esp] = categories.get(esp, 0) + 1
        
        # Rating médio
        ratings = [vm.get("rating_medio", 0) for vm in videomakers if vm.get("rating_medio")]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0
        
        # Preço médio e range
        prices = []
        for vm in videomakers:
            if vm.get("preco_hora"):
                prices.append(vm["preco_hora"])
            elif vm.get("preco_minimo"):
                prices.append(vm["preco_minimo"])
        
        avg_price = sum(prices) / len(prices) if prices else None
        price_range = {
            "min": min(prices) if prices else None,
            "max": max(prices) if prices else None
        }
        
        # Contadores por localização
        locations = {}
        for vm in videomakers:
            cidade = vm.get("cidade")
            estado = vm.get("estado")
            if estado:
                loc_key = f"{cidade}, {estado}" if cidade else estado
                locations[loc_key] = locations.get(loc_key, 0) + 1
        
        return {
            "total_results": len(videomakers),
            "categories": categories,
            "avg_rating": round(avg_rating, 2),
            "avg_price": round(avg_price, 2) if avg_price else None,
            "price_range": price_range,
            "locations": locations
        }
