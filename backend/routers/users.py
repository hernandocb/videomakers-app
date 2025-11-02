from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Query
from middleware.auth_middleware import get_current_user
from models.user import UserResponse
from services.storage_service import StorageService
from services.geolocation_service import find_nearby_users
from utils.constants import MAX_VIDEO_SIZE_BYTES
from typing import Optional, List
from datetime import datetime, timezone

router = APIRouter(prefix="/users", tags=["Usuários"])

from server import db

storage_service = StorageService(db)

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(user: dict = Depends(get_current_user)):
    """Obtém perfil do usuário autenticado"""
    
    user_dict = await db.users.find_one({"id": user["sub"]}, {"_id": 0})
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    return UserResponse(
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

@router.put("/me", response_model=UserResponse)
async def update_profile(update_data: dict, user: dict = Depends(get_current_user)):
    """Atualiza perfil do usuário autenticado"""
    
    # Campos permitidos para atualização
    allowed_fields = ["nome", "telefone", "cidade", "estado", "latitude", "longitude", "raio_atuacao_km"]
    
    update_dict = {
        k: v for k, v in update_data.items() 
        if k in allowed_fields and v is not None
    }
    
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum campo válido para atualizar"
        )
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.update_one(
        {"id": user["sub"]},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # Retorna perfil atualizado
    user_dict = await db.users.find_one({"id": user["sub"]}, {"_id": 0})
    
    return UserResponse(
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

@router.post("/portfolio/upload")
async def upload_portfolio_video(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload de vídeo para portfólio (máx 25MB)"""
    
    # Verifica se é videomaker
    if user.get("role") != "videomaker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas videomakers podem fazer upload de portfólio"
        )
    
    # Verifica tipo de arquivo
    if not file.content_type.startswith("video/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas vídeos são permitidos"
        )
    
    # Verifica tamanho
    content = await file.read()
    if len(content) > MAX_VIDEO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Vídeo muito grande. Máximo: 25MB"
        )
    
    # Reseta ponteiro do arquivo
    await file.seek(0)
    
    # Faz upload para GridFS
    file_id = await storage_service.upload_file(
        file,
        metadata={"user_id": user["sub"], "type": "portfolio"}
    )
    
    # Adiciona ao portfólio do usuário
    await db.users.update_one(
        {"id": user["sub"]},
        {"$push": {"portfolio_videos": file_id}}
    )
    
    return {
        "success": True,
        "file_id": file_id,
        "message": "Vídeo adicionado ao portfólio"
    }

@router.delete("/portfolio/{file_id}")
async def delete_portfolio_video(
    file_id: str,
    user: dict = Depends(get_current_user)
):
    """Remove vídeo do portfólio"""
    
    # Remove do array de portfólio
    result = await db.users.update_one(
        {"id": user["sub"]},
        {"$pull": {"portfolio_videos": file_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vídeo não encontrado no portfólio"
        )
    
    # Deleta do GridFS
    await storage_service.delete_file(file_id)
    
    return {
        "success": True,
        "message": "Vídeo removido do portfólio"
    }

@router.get("/videomakers", response_model=List[UserResponse])
async def search_videomakers(
    latitude: float = Query(..., description="Latitude do local do job"),
    longitude: float = Query(..., description="Longitude do local do job"),
    cidade: Optional[str] = Query(None),
    max_distance_km: Optional[float] = Query(50, description="Distância máxima em km"),
    min_rating: Optional[float] = Query(0, ge=0, le=5),
    user: dict = Depends(get_current_user)
):
    """Busca videomakers por geolocalização e filtros"""
    
    # Busca todos os videomakers ativos
    query = {
        "role": "videomaker",
        "ativo": True,
        "verificado": True
    }
    
    if cidade:
        query["cidade"] = cidade
    
    if min_rating > 0:
        query["rating_medio"] = {"$gte": min_rating}
    
    videomakers = await db.users.find(query, {"_id": 0}).to_list(1000)
    
    # Filtra por geolocalização
    nearby_videomakers = find_nearby_users(
        videomakers,
        latitude,
        longitude,
        max_distance_km
    )
    
    # Converte para UserResponse
    response = []
    for vm in nearby_videomakers:
        response.append(UserResponse(
            id=vm["id"],
            email=vm["email"],
            nome=vm["nome"],
            telefone=vm["telefone"],
            role=vm["role"],
            cidade=vm.get("cidade"),
            estado=vm.get("estado"),
            verificado=vm.get("verificado", False),
            rating_medio=vm.get("rating_medio", 0.0),
            total_avaliacoes=vm.get("total_avaliacoes", 0),
            portfolio_videos=vm.get("portfolio_videos", []),
            raio_atuacao_km=vm.get("raio_atuacao_km", 50.0),
            created_at=datetime.fromisoformat(vm["created_at"]) if isinstance(vm["created_at"], str) else vm["created_at"]
        ))
    
    return response

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: str):
    """Obtém perfil público de um usuário"""
    
    user_dict = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    return UserResponse(
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
