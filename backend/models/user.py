from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class UserBase(BaseModel):
    email: EmailStr
    nome: str
    telefone: str
    role: str  # client, videomaker, admin
    cidade: Optional[str] = None
    estado: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    profile_picture: Optional[str] = None  # URL for profile picture

class UserCreate(UserBase):
    password: str
    raio_atuacao_km: Optional[float] = 50.0  # Para videomakers
    aceite_lgpd: bool = True

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    password_hash: str
    verificado: bool = False
    rating_medio: float = 0.0
    total_avaliacoes: int = 0
    portfolio_videos: List[str] = []  # GridFS file IDs
    raio_atuacao_km: float = 50.0
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    id: str
    email: str
    nome: str
    telefone: str
    role: str
    cidade: Optional[str]
    estado: Optional[str]
    verificado: bool
    rating_medio: float
    total_avaliacoes: int
    portfolio_videos: List[str]
    raio_atuacao_km: float
    created_at: datetime

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
