from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class ProposalCreate(BaseModel):
    job_id: str
    valor_proposto: float
    mensagem: Optional[str] = None
    data_entrega_estimada: datetime

class Proposal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    videomaker_id: str
    valor_proposto: float
    mensagem: Optional[str] = None
    data_entrega_estimada: datetime
    status: str = "pending"  # pending, accepted, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProposalResponse(BaseModel):
    id: str
    job_id: str
    videomaker_id: str
    valor_proposto: float
    mensagem: Optional[str]
    data_entrega_estimada: datetime
    status: str
    created_at: datetime
