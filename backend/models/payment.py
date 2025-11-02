from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class PaymentCreate(BaseModel):
    job_id: str
    valor_total: float

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    client_id: str
    videomaker_id: str
    valor_total: float
    comissao_plataforma: float
    valor_videomaker: float
    stripe_payment_intent_id: Optional[str] = None
    status: str = "held"  # held, released, refunded, disputed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    released_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None

class PaymentResponse(BaseModel):
    id: str
    job_id: str
    client_id: str
    videomaker_id: str
    valor_total: float
    comissao_plataforma: float
    valor_videomaker: float
    status: str
    created_at: datetime

class TransactionLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_id: str
    action: str  # hold, release, refund
    user_id: str
    details: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
