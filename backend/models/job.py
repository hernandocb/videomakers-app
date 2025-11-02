from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class JobLocation(BaseModel):
    endereco: str
    cidade: str
    estado: str
    latitude: float
    longitude: float

class JobCreate(BaseModel):
    titulo: str
    descricao: str
    categoria: str
    data_gravacao: datetime
    duracao_horas: float
    local: JobLocation
    extras: List[str] = []  # Lista de IDs de extras

class Job(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    titulo: str
    descricao: str
    categoria: str
    data_gravacao: datetime
    duracao_horas: float
    local: JobLocation
    extras: List[str] = []
    valor_minimo: float = 0.0  # Calculado automaticamente
    status: str = "open"  # open, in_progress, completed, cancelled
    videomaker_id: Optional[str] = None
    proposta_aceita_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JobResponse(BaseModel):
    id: str
    client_id: str
    titulo: str
    descricao: str
    categoria: str
    data_gravacao: datetime
    duracao_horas: float
    local: JobLocation
    extras: List[str]
    valor_minimo: float
    status: str
    videomaker_id: Optional[str]
    created_at: datetime
    updated_at: datetime
