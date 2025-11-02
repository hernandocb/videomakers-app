from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, date
import uuid

# ==================== FAVORITOS ====================

class Favorite(BaseModel):
    """Model para favoritos"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    videomaker_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FavoriteResponse(BaseModel):
    """Response de favorito com dados do videomaker"""
    id: str
    videomaker_id: str
    videomaker_nome: str
    videomaker_email: str
    videomaker_rating: float
    videomaker_total_avaliacoes: int
    videomaker_cidade: Optional[str]
    videomaker_estado: Optional[str]
    created_at: datetime


# ==================== BADGES ====================

class Badge(BaseModel):
    """Model para badges/certificações"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str = Field(..., description="verificado, top_rated, new_talent, fast_responder, etc")
    name: str = Field(..., description="Nome do badge")
    description: str = Field(..., description="Descrição do badge")
    icon: str = Field(..., description="Emoji ou URL do ícone")
    color: str = Field(..., description="Cor do badge (hex)")
    criteria: Optional[str] = Field(None, description="Critérios para obter o badge")
    active: bool = True

class UserBadge(BaseModel):
    """Model para badge de usuário"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    badge_code: str
    earned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None


# ==================== DISPONIBILIDADE ====================

class Availability(BaseModel):
    """Model para disponibilidade do videomaker"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    videomaker_id: str
    date: str = Field(..., description="Data no formato YYYY-MM-DD")
    status: str = Field(..., description="available, booked, unavailable")
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AvailabilityBulkUpdate(BaseModel):
    """Model para atualizar disponibilidade em lote"""
    dates: List[str] = Field(..., description="Lista de datas YYYY-MM-DD")
    status: str = Field(..., description="available, booked, unavailable")


# ==================== DISPUTAS ====================

class Dispute(BaseModel):
    """Model para disputas"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    payment_id: Optional[str] = None
    opened_by: str = Field(..., description="ID do usuário que abriu a disputa")
    reason: str = Field(..., description="Motivo da disputa")
    description: str = Field(..., description="Descrição detalhada")
    evidence_urls: Optional[List[str]] = Field(None, description="URLs de evidências")
    status: str = Field(default="open", description="open, under_review, resolved, rejected")
    resolution: Optional[str] = Field(None, description="Resolução da disputa")
    resolved_by: Optional[str] = Field(None, description="ID do admin que resolveu")
    resolved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DisputeCreate(BaseModel):
    """Request para criar disputa"""
    job_id: str
    payment_id: Optional[str] = None
    reason: str = Field(..., min_length=10, max_length=200)
    description: str = Field(..., min_length=50, max_length=2000)
    evidence_urls: Optional[List[str]] = None

class DisputeResolve(BaseModel):
    """Request para resolver disputa"""
    resolution: str = Field(..., min_length=20)
    action: str = Field(..., description="refund, release, partial, custom")
    refund_amount: Optional[float] = None


# ==================== DOCUMENTOS DO JOB ====================

class JobDocument(BaseModel):
    """Model para documentos do job"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    uploaded_by: str = Field(..., description="ID do usuário que fez upload")
    document_type: str = Field(..., description="contract, briefing, script, storyboard, other")
    filename: str
    file_url: str
    file_size: int = Field(..., description="Tamanho em bytes")
    mime_type: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JobDocumentUpload(BaseModel):
    """Request para upload de documento"""
    document_type: str
    filename: str
    file_url: str
    file_size: int
    mime_type: str
    description: Optional[str] = None


# ==================== CHAT COM ARQUIVOS ====================

class ChatAttachment(BaseModel):
    """Model para anexos no chat"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message_id: str
    chat_id: str
    file_type: str = Field(..., description="image, video, document, audio")
    filename: str
    file_url: str
    file_size: int
    mime_type: str
    thumbnail_url: Optional[str] = None
    duration: Optional[int] = Field(None, description="Duração em segundos (para vídeo/áudio)")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageWithAttachment(BaseModel):
    """Request para mensagem com anexo"""
    content: str
    attachment: Optional[dict] = Field(None, description="Dados do anexo")


# ==================== PORTFOLIO AVANÇADO ====================

class PortfolioItem(BaseModel):
    """Model para item do portfolio"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., max_length=500)
    video_url: str
    thumbnail_url: Optional[str] = None
    category: str = Field(..., description="casamento, corporativo, evento, publicidade, etc")
    tags: List[str] = Field(default_factory=list)
    featured: bool = False
    views: int = 0
    likes: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PortfolioItemCreate(BaseModel):
    """Request para criar item do portfolio"""
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., max_length=500)
    video_url: str
    thumbnail_url: Optional[str] = None
    category: str
    tags: Optional[List[str]] = None
    featured: bool = False

class PortfolioItemUpdate(BaseModel):
    """Request para atualizar item do portfolio"""
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    featured: Optional[bool] = None
