from fastapi import APIRouter, Depends
from models.search import (
    VideomakerSearchFilters, VideomakerSearchResult,
    VideomakerSearchResponse, SearchAggregations
)
from services.search_service import SearchService, GeoService
from middleware.auth_middleware import get_current_user
from typing import Optional
import math

router = APIRouter(prefix="/search", tags=["Search"])

from server import db


@router.post("/videomakers", response_model=VideomakerSearchResponse)
async def search_videomakers(filters: VideomakerSearchFilters):
    """
    Busca avançada de videomakers com filtros combinados
    
    Filtros disponíveis:
    - query: Busca por texto (nome, bio, especialidade)
    - category/categories: Especialidade(s)
    - min_rating: Rating mínimo
    - min_reviews: Mínimo de avaliações
    - min_price/max_price: Faixa de preço
    - cidade/estado: Localização
    - latitude/longitude/radius_km: Busca por raio
    - badges: Lista de badges obrigatórios
    - verified_only: Apenas verificados
    - available_on: Data de disponibilidade
    - sort_by: Ordenação (nearest, highest_rated, lowest_price, most_experienced, newest)
    - page/limit: Paginação
    """
    
    # 1. Constrói query base
    query = await SearchService.build_search_query(db, filters)
    
    # 2. Busca videomakers
    videomakers = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(10000)
    
    # 3. Filtra por badges (se especificado)
    if filters.badges and videomakers:
        user_ids = [vm["id"] for vm in videomakers]
        filtered_user_ids = await SearchService.apply_badge_filter(db, user_ids, filters.badges)
        videomakers = [vm for vm in videomakers if vm["id"] in filtered_user_ids]
    
    # 4. Filtra por disponibilidade (se especificado)
    if filters.available_on and videomakers:
        user_ids = [vm["id"] for vm in videomakers]
        available_user_ids = await SearchService.apply_availability_filter(db, user_ids, filters.available_on)
        
        for vm in videomakers:
            vm["available_on_search_date"] = vm["id"] in available_user_ids
        
        # Opcionalmente, pode filtrar apenas os disponíveis
        # videomakers = [vm for vm in videomakers if vm["id"] in available_user_ids]
    
    # 5. Calcula distâncias (se busca por localização)
    if filters.latitude and filters.longitude:
        videomakers = SearchService.calculate_distances(
            videomakers,
            filters.latitude,
            filters.longitude
        )
        
        # Filtra por raio exato (pós-processamento do bounding box)
        if filters.radius_km:
            videomakers = SearchService.filter_by_radius(videomakers, filters.radius_km)
    
    # 6. Enriquece com badges
    for vm in videomakers:
        user_badges = await db.user_badges.find(
            {"user_id": vm["id"]},
            {"_id": 0}
        ).to_list(100)
        
        badges_data = []
        for ub in user_badges:
            badge = await db.badges.find_one({"code": ub["badge_code"]}, {"_id": 0})
            if badge:
                badges_data.append(badge)
        
        vm["badges"] = badges_data
    
    # 7. Enriquece com estatísticas
    for vm in videomakers:
        # Total jobs concluídos
        total_jobs = await db.jobs.count_documents({
            "videomaker_id": vm["id"],
            "status": "completed"
        })
        vm["total_jobs_completed"] = total_jobs
    
    # 8. Ordena resultados
    videomakers = SearchService.sort_results(videomakers, filters.sort_by)
    
    # 9. Calcula agregações
    aggregations_data = await SearchService.calculate_aggregations(db, videomakers)
    
    # 10. Paginação
    skip = (filters.page - 1) * filters.limit
    total_results = len(videomakers)
    total_pages = math.ceil(total_results / filters.limit)
    
    paginated_videomakers = videomakers[skip:skip + filters.limit]
    
    # 11. Monta response
    results = []
    for vm in paginated_videomakers:
        results.append(VideomakerSearchResult(
            id=vm["id"],
            nome=vm["nome"],
            email=vm["email"],
            telefone=vm.get("telefone"),
            bio=vm.get("bio"),
            cidade=vm.get("cidade"),
            estado=vm.get("estado"),
            latitude=vm.get("latitude"),
            longitude=vm.get("longitude"),
            distance_km=vm.get("distance_km"),
            portfolio_videos=vm.get("portfolio_videos"),
            especialidades=vm.get("especialidades"),
            rating_medio=vm.get("rating_medio", 0),
            total_avaliacoes=vm.get("total_avaliacoes", 0),
            total_jobs_completed=vm.get("total_jobs_completed"),
            preco_hora=vm.get("preco_hora"),
            preco_minimo=vm.get("preco_minimo"),
            badges=vm.get("badges"),
            verificado=vm.get("verificado", False),
            available_on_search_date=vm.get("available_on_search_date")
        ))
    
    aggregations = SearchAggregations(**aggregations_data)
    
    return VideomakerSearchResponse(
        results=results,
        aggregations=aggregations,
        page=filters.page,
        limit=filters.limit,
        total_pages=total_pages
    )


@router.get("/categories")
async def get_categories():
    """Lista todas as categorias/especialidades disponíveis com contadores"""
    
    pipeline = [
        {"$match": {"role": "videomaker", "ativo": True}},
        {"$unwind": "$especialidades"},
        {"$group": {
            "_id": "$especialidades",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}}
    ]
    
    categories = await db.users.aggregate(pipeline).to_list(100)
    
    return [
        {"name": cat["_id"], "count": cat["count"]}
        for cat in categories
    ]


@router.get("/locations")
async def get_locations():
    """Lista todas as localizações disponíveis com contadores"""
    
    pipeline = [
        {"$match": {"role": "videomaker", "ativo": True, "estado": {"$exists": True}}},
        {"$group": {
            "_id": {
                "cidade": "$cidade",
                "estado": "$estado"
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}}
    ]
    
    locations = await db.users.aggregate(pipeline).to_list(1000)
    
    return [
        {
            "cidade": loc["_id"].get("cidade"),
            "estado": loc["_id"]["estado"],
            "count": loc["count"]
        }
        for loc in locations
    ]


@router.get("/price-range")
async def get_price_range():
    """Retorna faixa de preços dos videomakers"""
    
    pipeline = [
        {"$match": {"role": "videomaker", "ativo": True}},
        {"$group": {
            "_id": None,
            "min_preco_hora": {"$min": "$preco_hora"},
            "max_preco_hora": {"$max": "$preco_hora"},
            "avg_preco_hora": {"$avg": "$preco_hora"},
            "min_preco_minimo": {"$min": "$preco_minimo"},
            "max_preco_minimo": {"$max": "$preco_minimo"},
            "avg_preco_minimo": {"$avg": "$preco_minimo"}
        }}
    ]
    
    result = await db.users.aggregate(pipeline).to_list(1)
    
    if result:
        return result[0]
    
    return {
        "min_preco_hora": None,
        "max_preco_hora": None,
        "avg_preco_hora": None,
        "min_preco_minimo": None,
        "max_preco_minimo": None,
        "avg_preco_minimo": None
    }


@router.get("/suggestions")
async def get_search_suggestions(q: str):
    """Sugestões de busca (autocomplete)"""
    
    if len(q) < 2:
        return []
    
    # Busca em nomes
    names = await db.users.find(
        {
            "role": "videomaker",
            "ativo": True,
            "nome": {"$regex": f"^{q}", "$options": "i"}
        },
        {"_id": 0, "nome": 1}
    ).limit(5).to_list(5)
    
    # Busca em especialidades
    specialties = await db.users.aggregate([
        {"$match": {"role": "videomaker", "ativo": True}},
        {"$unwind": "$especialidades"},
        {"$match": {"especialidades": {"$regex": q, "$options": "i"}}},
        {"$group": {"_id": "$especialidades"}},
        {"$limit": 5}
    ]).to_list(5)
    
    suggestions = []
    
    for name in names:
        suggestions.append({
            "type": "name",
            "value": name["nome"],
            "label": f"👤 {name['nome']}"
        })
    
    for spec in specialties:
        suggestions.append({
            "type": "specialty",
            "value": spec["_id"],
            "label": f"🎬 {spec['_id']}"
        })
    
    return suggestions


@router.get("/nearby")
async def find_nearby_videomakers(
    latitude: float,
    longitude: float,
    radius_km: float = 50,
    limit: int = 10
):
    """Busca videomakers próximos (simplificada)"""
    
    min_lat, max_lat, min_lon, max_lon = GeoService.get_bounding_box(
        latitude, longitude, radius_km
    )
    
    videomakers = await db.users.find(
        {
            "role": "videomaker",
            "ativo": True,
            "latitude": {"$gte": min_lat, "$lte": max_lat},
            "longitude": {"$gte": min_lon, "$lte": max_lon}
        },
        {"_id": 0, "nome": 1, "latitude": 1, "longitude": 1, "rating_medio": 1, "cidade": 1, "estado": 1}
    ).to_list(1000)
    
    # Calcula distâncias exatas
    for vm in videomakers:
        if vm.get("latitude") and vm.get("longitude"):
            vm["distance_km"] = GeoService.calculate_distance(
                latitude, longitude,
                vm["latitude"], vm["longitude"]
            )
    
    # Filtra por raio exato
    videomakers = [vm for vm in videomakers if vm.get("distance_km", float('inf')) <= radius_km]
    
    # Ordena por distância
    videomakers.sort(key=lambda x: x.get("distance_km", float('inf')))
    
    return videomakers[:limit]
