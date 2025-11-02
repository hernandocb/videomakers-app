from fastapi import APIRouter, HTTPException, status, Depends, Request
from models.user import UserCreate, User, UserLogin, TokenResponse, UserResponse
from services.auth_service import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from services.security_service import AuditService
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
import os

router = APIRouter(prefix="/auth", tags=["Autenticação"])

# Dependência para obter o banco de dados (será injetado no server.py)
from server import db, limiter

class GoogleSignInRequest(BaseModel):
    token: str
    role: str = "client"  # Default role for Google sign-in users

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate):
    """Cadastro de novo usuário (cliente ou videomaker)"""
    
    # Verifica se email já existe
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )
    
    # Valida role
    if user_data.role not in ["client", "videomaker", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role inválida. Use: client, videomaker ou admin"
        )
    
    # Cria usuário
    user = User(
        email=user_data.email,
        nome=user_data.nome,
        telefone=user_data.telefone,
        role=user_data.role,
        cidade=user_data.cidade,
        estado=user_data.estado,
        latitude=user_data.latitude,
        longitude=user_data.longitude,
        password_hash=hash_password(user_data.password),
        raio_atuacao_km=user_data.raio_atuacao_km
    )
    
    # Salva no banco
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['updated_at'] = user_dict['updated_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Gera tokens
    access_token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    # Log de auditoria
    await db.audit_logs.insert_one({
        "user_id": user.id,
        "action": "signup",
        "ip": "0.0.0.0",  # Será preenchido no middleware
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        nome=user.nome,
        telefone=user.telefone,
        role=user.role,
        cidade=user.cidade,
        estado=user.estado,
        verificado=user.verificado,
        rating_medio=user.rating_medio,
        total_avaliacoes=user.total_avaliacoes,
        portfolio_videos=user.portfolio_videos,
        raio_atuacao_km=user.raio_atuacao_km,
        created_at=user.created_at
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login de usuário"""
    
    # Busca usuário
    user_dict = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos"
        )
    
    # Verifica senha
    if not verify_password(credentials.password, user_dict["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos"
        )
    
    # Verifica se usuário está ativo
    if not user_dict.get("ativo", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário banido ou inativo"
        )
    
    # Gera tokens
    access_token = create_access_token(
        data={"sub": user_dict["id"], "email": user_dict["email"], "role": user_dict["role"]}
    )
    refresh_token = create_refresh_token(data={"sub": user_dict["id"]})
    
    # Log de auditoria
    await db.audit_logs.insert_one({
        "user_id": user_dict["id"],
        "action": "login",
        "ip": "0.0.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    user_response = UserResponse(
        id=user_dict["id"],
        email=user_dict["email"],
        nome=user_dict["nome"],
        telefone=user_dict["telefone"],
        role=user_dict["role"],
        cidade=user_dict.get("cidade"),
        estado=user_dict.get("estado"),
        verificado=user_dict.get("verificado", False),
        rating_medio=user_dict.get("rating_medio", 0.0),
        total_avaliacoes=user_dict.get("total_avaliacoes", 0),
        portfolio_videos=user_dict.get("portfolio_videos", []),
        raio_atuacao_km=user_dict.get("raio_atuacao_km", 50.0),
        created_at=datetime.fromisoformat(user_dict["created_at"]) if isinstance(user_dict["created_at"], str) else user_dict["created_at"]
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )

@router.post("/refresh", response_model=dict)
async def refresh_token(refresh_token: str):
    """Renova access token usando refresh token"""
    
    payload = decode_token(refresh_token, "refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado"
        )
    
    user_id = payload.get("sub")
    user_dict = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado"
        )
    
    # Gera novo access token
    access_token = create_access_token(
        data={"sub": user_dict["id"], "email": user_dict["email"], "role": user_dict["role"]}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/google", response_model=TokenResponse)
async def google_signin(request: GoogleSignInRequest):
    """Autenticação via Google Sign-In"""
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            request.token, 
            google_requests.Request(),
            None  # We're not verifying the audience for now
        )
        
        # Get user info from Google
        email = idinfo['email']
        nome = idinfo.get('name', email.split('@')[0])
        picture = idinfo.get('picture', '')
        
        # Check if user exists
        user_dict = await db.users.find_one({"email": email}, {"_id": 0})
        
        if user_dict:
            # User exists, log them in
            user_id = user_dict["id"]
            role = user_dict["role"]
        else:
            # Create new user
            user = User(
                email=email,
                nome=nome,
                telefone="",
                role=request.role,
                password_hash="",  # No password for Google users
                profile_picture=picture
            )
            
            user_dict = user.model_dump()
            user_dict['created_at'] = user_dict['created_at'].isoformat()
            user_dict['updated_at'] = user_dict['updated_at'].isoformat()
            
            await db.users.insert_one(user_dict)
            user_id = user.id
            role = user.role
            
            # Log de auditoria
            await db.audit_logs.insert_one({
                "user_id": user_id,
                "action": "google_signup",
                "ip": "0.0.0.0",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # Generate tokens
        access_token = create_access_token(
            data={"sub": user_id, "email": email, "role": role}
        )
        refresh_token = create_refresh_token(data={"sub": user_id})
        
        # Log de auditoria for login
        await db.audit_logs.insert_one({
            "user_id": user_id,
            "action": "google_login",
            "ip": "0.0.0.0",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Get fresh user data
        user_dict = await db.users.find_one({"id": user_id}, {"_id": 0})
        
        user_response = UserResponse(
            id=user_dict["id"],
            email=user_dict["email"],
            nome=user_dict["nome"],
            telefone=user_dict["telefone"],
            role=user_dict["role"],
            cidade=user_dict.get("cidade"),
            estado=user_dict.get("estado"),
            verificado=user_dict.get("verificado", False),
            rating_medio=user_dict.get("rating_medio", 0.0),
            total_avaliacoes=user_dict.get("total_avaliacoes", 0),
            portfolio_videos=user_dict.get("portfolio_videos", []),
            raio_atuacao_km=user_dict.get("raio_atuacao_km", 50.0),
            created_at=datetime.fromisoformat(user_dict["created_at"]) if isinstance(user_dict["created_at"], str) else user_dict["created_at"]
        )
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_response
        )
        
    except ValueError as e:
        # Token verification failed
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token do Google inválido"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao autenticar com Google: {str(e)}"
        )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
