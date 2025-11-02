# Constantes da Plataforma de Videomakers

# Roles
class UserRole:
    CLIENT = "client"
    VIDEOMAKER = "videomaker"
    ADMIN = "admin"

# Status de Jobs
class JobStatus:
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

# Status de Propostas
class ProposalStatus:
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

# Status de Pagamentos
class PaymentStatus:
    HELD = "held"  # Em escrow
    RELEASED = "released"  # Liberado para videomaker
    REFUNDED = "refunded"  # Reembolsado
    DISPUTED = "disputed"  # Em disputa

# Configurações padrão
DEFAULT_COMMISSION_RATE = 0.20  # 20%
DEFAULT_HOURLY_RATE = 120.0  # R$ 120/hora
MAX_VIDEO_SIZE_MB = 25
MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024

# Extras disponíveis
EXTRAS = {
    "edicao_basica": 50.0,
    "edicao_avancada": 150.0,
    "drone": 100.0,
    "equipamento_especial": 80.0,
    "iluminacao_profissional": 120.0,
    "audio_profissional": 90.0,
}

# Categorias de Jobs
CATEGORIES = [
    "evento",
    "corporativo",
    "casamento",
    "aniversario",
    "produto",
    "imovel",
    "social_media",
    "documentario",
    "outro"
]

# Rate limiting
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_WINDOW_SECONDS = 60
