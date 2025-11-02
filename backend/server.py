from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'videomakers_platform')]

# Create the main app without a prefix
app = FastAPI(
    title="Plataforma de Videomakers API",
    description="API completa para marketplace de videomakers (Uber dos videomakers)",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Health check
@api_router.get("/")
async def root():
    return {
        "message": "Plataforma de Videomakers API",
        "version": "1.0.0",
        "status": "online"
    }

@api_router.get("/health")
async def health_check():
    try:
        # Test MongoDB connection
        await db.command("ping")
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e)
            }
        )

# Import and include routers
from routers import auth, users, jobs, proposals, payments, ratings, chat, admin, notifications

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(jobs.router)
api_router.include_router(proposals.router)
api_router.include_router(payments.router)
api_router.include_router(ratings.router)
api_router.include_router(chat.router)
api_router.include_router(admin.router)
api_router.include_router(notifications.router)

# Include the router in the main app
app.include_router(api_router)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiter Middleware
from middleware.rate_limiter import rate_limiter

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Skip rate limiting for health checks
    if request.url.path in ["/api/health", "/api/"]:
        return await call_next(request)
    
    try:
        await rate_limiter.check_rate_limit(request)
    except Exception as e:
        return JSONResponse(
            status_code=429,
            content={"detail": str(e)}
        )
    
    response = await call_next(request)
    return response

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Plataforma de Videomakers API iniciada")
    logger.info(f"📦 Banco de dados: {os.environ.get('DB_NAME', 'videomakers_platform')}")
    
    # Inicializa configuração padrão se não existir
    config_exists = await db.platform_config.find_one({"id": "platform_config"})
    if not config_exists:
        from models.config import PlatformConfig
        from datetime import datetime, timezone
        
        default_config = PlatformConfig()
        config_dict = default_config.model_dump()
        config_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.platform_config.insert_one(config_dict)
        logger.info("✅ Configuração padrão criada")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("🔌 Conexão com banco de dados fechada")