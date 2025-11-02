from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class CouponCreate(BaseModel):
    """Model para criar cupom"""
    code: str = Field(..., min_length=3, max_length=20, description="Código do cupom (ex: PROMO10)")
    tipo: str = Field(..., description="percentage ou fixed")
    valor: float = Field(..., gt=0, description="Valor do desconto (% ou R$)")
    valor_minimo_job: Optional[float] = Field(None, ge=0, description="Valor mínimo do job para aplicar")
    max_usos: Optional[int] = Field(None, ge=1, description="Máximo de usos (None = ilimitado)")
    max_usos_por_usuario: Optional[int] = Field(1, ge=1, description="Máximo de usos por usuário")
    data_expiracao: Optional[datetime] = None
    ativo: bool = True
    descricao: Optional[str] = None

class Coupon(BaseModel):
    """Model de cupom"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    tipo: str  # "percentage" ou "fixed"
    valor: float
    valor_minimo_job: Optional[float] = None
    max_usos: Optional[int] = None
    max_usos_por_usuario: int = 1
    usos_totais: int = 0
    data_expiracao: Optional[datetime] = None
    ativo: bool = True
    descricao: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None  # Admin que criou

class CouponResponse(BaseModel):
    """Response de cupom"""
    id: str
    code: str
    tipo: str
    valor: float
    valor_minimo_job: Optional[float]
    max_usos: Optional[int]
    usos_totais: int
    ativo: bool
    descricao: Optional[str]
    data_expiracao: Optional[datetime]
    created_at: datetime

class CouponValidation(BaseModel):
    """Model para validar cupom"""
    code: str
    valor_job: float

class CouponValidationResponse(BaseModel):
    """Response da validação"""
    valido: bool
    message: str
    desconto: Optional[float] = None
    valor_final: Optional[float] = None
    coupon_id: Optional[str] = None

class CouponUsage(BaseModel):
    """Registro de uso de cupom"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    coupon_id: str
    user_id: str
    job_id: str
    valor_original: float
    desconto_aplicado: float
    valor_final: float
    used_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
