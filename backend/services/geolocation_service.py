from math import radians, cos, sin, asin, sqrt

def haversine(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Calcula a distância entre dois pontos em km usando a fórmula de Haversine"""
    # Converter de graus para radianos
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    
    # Fórmula de Haversine
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    # Raio da Terra em km
    r = 6371
    
    return c * r

def is_within_radius(user_lat: float, user_lon: float, 
                    target_lat: float, target_lon: float, 
                    radius_km: float) -> bool:
    """Verifica se um ponto está dentro do raio de atuação"""
    distance = haversine(user_lon, user_lat, target_lon, target_lat)
    return distance <= radius_km

def find_nearby_users(users: list, target_lat: float, target_lon: float, 
                     max_radius_km: float = 50) -> list:
    """Filtra usuários que estão dentro do raio de atuação"""
    nearby_users = []
    
    for user in users:
        if user.get('latitude') and user.get('longitude'):
            if is_within_radius(
                user['latitude'], user['longitude'],
                target_lat, target_lon,
                user.get('raio_atuacao_km', max_radius_km)
            ):
                # Adiciona a distância ao usuário
                distance = haversine(
                    user['longitude'], user['latitude'],
                    target_lon, target_lat
                )
                user['distance_km'] = round(distance, 2)
                nearby_users.append(user)
    
    # Ordena por distância
    nearby_users.sort(key=lambda x: x['distance_km'])
    
    return nearby_users
