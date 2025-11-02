from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class SortOrder(str, Enum):
    """Opções de ordenação"""
    NEAREST = "nearest"  # Mais próximo
    HIGHEST_RATED = "highest_rated"  # Melhor avaliado
    LOWEST_PRICE = "lowest_price"  # Menor preço
    MOST_EXPERIENCED = "most_experienced"  # Mais experiência
    NEWEST = "newest"  # Mais recente

class VideomakerSearchFilters(BaseModel):
    """Filtros para busca de videomakers"""
    
    # Busca por texto
    query: Optional[str] = Field(None, description="Busca por nome, bio, especialidade")
    
    # Categoria/Especialidade
    category: Optional[str] = Field(None, description="casamento, corporativo, evento, etc")
    categories: Optional[List[str]] = Field(None, description="Lista de categorias")
    
    # Rating
    min_rating: Optional[float] = Field(None, ge=0, le=5, description="Rating mínimo")
    min_reviews: Optional[int] = Field(None, ge=0, description="Mínimo de avaliações")
    
    # Preço
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    
    # Localização
    cidade: Optional[str] = None
    estado: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    radius_km: Optional[float] = Field(None, gt=0, description="Raio em km")
    
    # Badges
    badges: Optional[List[str]] = Field(None, description="Lista de badge codes")
    verified_only: Optional[bool] = Field(False, description="Apenas verificados")
    
    # Disponibilidade
    available_on: Optional[str] = Field(None, description="Data YYYY-MM-DD")
    
    # Ordenação
    sort_by: Optional[SortOrder] = Field(SortOrder.HIGHEST_RATED, description="Critério de ordenação")
    
    # Paginação
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)

class VideomakerSearchResult(BaseModel):
    """Resultado de busca de videomaker"""
    id: str
    nome: str
    email: str
    telefone: Optional[str]
    bio: Optional[str]
    cidade: Optional[str]
    estado: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    distance_km: Optional[float] = Field(None, description="Distância em km (se busca por localização)")
    
    # Portfolio
    portfolio_videos: Optional[List[str]]
    especialidades: Optional[List[str]]
    
    # Ratings
    rating_medio: float
    total_avaliacoes: int
    
    # Estatísticas
    total_jobs_completed: Optional[int]
    
    # Preço
    preco_hora: Optional[float]
    preco_minimo: Optional[float]
    
    # Badges
    badges: Optional[List[dict]]
    verificado: bool
    
    # Disponibilidade
    available_on_search_date: Optional[bool]

class SearchAggregations(BaseModel):
    """Agregações da busca"""
    total_results: int
    categories: dict = Field(default_factory=dict, description="Contadores por categoria")
    avg_rating: float
    avg_price: Optional[float]
    price_range: dict = Field(default_factory=dict)
    locations: dict = Field(default_factory=dict, description="Contadores por localização")

class VideomakerSearchResponse(BaseModel):
    """Response completo da busca"""
    results: List[VideomakerSearchResult]
    aggregations: SearchAggregations
    page: int
    limit: int
    total_pages: int
