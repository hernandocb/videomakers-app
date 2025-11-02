from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

class AuditLog(BaseModel):
    """Model para log de auditoria"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="ID do usuário que realizou a ação")
    user_email: str = Field(..., description="Email do usuário")
    user_role: str = Field(..., description="Role do usuário")
    action: str = Field(..., description="Tipo de ação (create, update, delete, read)")
    resource: str = Field(..., description="Recurso afetado (user, job, payment, etc)")
    resource_id: Optional[str] = Field(None, description="ID do recurso afetado")
    changes: Optional[Dict[str, Any]] = Field(None, description="Mudanças realizadas (before/after)")
    ip_address: Optional[str] = Field(None, description="IP do usuário")
    user_agent: Optional[str] = Field(None, description="User agent")
    status: str = Field(..., description="success ou failed")
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(None, description="Metadados adicionais")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditLogResponse(BaseModel):
    """Response de log de auditoria"""
    id: str
    user_email: str
    user_role: str
    action: str
    resource: str
    resource_id: Optional[str]
    status: str
    created_at: datetime

class IdentityVerification(BaseModel):
    """Model para verificação de identidade"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    document_type: str = Field(..., description="cpf, cnh, rg, passaporte")
    document_number: str
    document_front_url: str = Field(..., description="URL do documento frente")
    document_back_url: Optional[str] = Field(None, description="URL do documento verso")
    selfie_url: str = Field(..., description="URL da selfie")
    status: str = Field(default="pending", description="pending, approved, rejected")
    reviewed_by: Optional[str] = Field(None, description="ID do admin que revisou")
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
class TwoFactorSecret(BaseModel):
    """Model para 2FA"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    secret: str = Field(..., description="Secret TOTP")
    backup_codes: list[str] = Field(..., description="Códigos de backup")
    enabled: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_used: Optional[datetime] = None

class TwoFactorSetup(BaseModel):
    """Response do setup 2FA"""
    secret: str
    qr_code: str  # Base64 da imagem
    backup_codes: list[str]

class TwoFactorVerify(BaseModel):
    """Request para verificar código 2FA"""
    code: str = Field(..., min_length=6, max_length=6)

class UserDataExport(BaseModel):
    """Model para exportação de dados LGPD"""
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    requested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = Field(default="processing", description="processing, completed, failed")
    export_url: Optional[str] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None  # Link expira em 7 dias

class AccountDeletion(BaseModel):
    """Request para deletar conta (LGPD)"""
    reason: Optional[str] = Field(None, description="Motivo da exclusão")
    confirm: bool = Field(..., description="Confirmação da exclusão")
