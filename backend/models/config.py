from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone

class PlatformConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = "platform_config"
    taxa_comissao: float = 0.20  # 20%
    valor_hora_base: float = 120.0  # R$ 120/hora
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: str = "system"

class ConfigUpdate(BaseModel):
    taxa_comissao: float = Field(..., ge=0.0, le=1.0)
    valor_hora_base: float = Field(..., gt=0.0)
