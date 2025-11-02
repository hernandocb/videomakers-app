from fastapi import APIRouter, HTTPException, status, Depends, Query
from middleware.auth_middleware import get_current_user, require_role
from models.features import (
    Favorite, FavoriteResponse, Badge, UserBadge,
    Availability, AvailabilityBulkUpdate,
    Dispute, DisputeCreate, DisputeResolve,
    JobDocument, JobDocumentUpload,
    ChatAttachment, MessageWithAttachment,
    PortfolioItem, PortfolioItemCreate, PortfolioItemUpdate
)
from services.security_service import AuditService
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import uuid

router = APIRouter(prefix="/features", tags=["Features"])

from server import db

async def admin_only(user: dict = Depends(get_current_user)):
    """Middleware para verificar se é admin"""
    await require_role(user, ["admin"])
    return user


# ==================== FAVORITOS ====================

@router.post("/favorites/{videomaker_id}")
async def add_favorite(
    videomaker_id: str,
    user: dict = Depends(get_current_user)
):
    """Adiciona videomaker aos favoritos"""
    
    if user["role"] != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas clientes podem favoritar videomakers"
        )
    
    client_id = user["sub"]
    
    # Verifica se videomaker existe
    videomaker = await db.users.find_one({"id": videomaker_id, "role": "videomaker"})
    if not videomaker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Videomaker não encontrado"
        )
    
    # Verifica se já está nos favoritos
    existing = await db.favorites.find_one({
        "client_id": client_id,
        "videomaker_id": videomaker_id
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Videomaker já está nos favoritos"
        )
    
    favorite = Favorite(
        client_id=client_id,
        videomaker_id=videomaker_id
    )
    
    favorite_dict = favorite.model_dump()
    favorite_dict['created_at'] = favorite_dict['created_at'].isoformat()
    
    await db.favorites.insert_one(favorite_dict)
    
    return {"success": True, "message": "Videomaker adicionado aos favoritos"}


@router.delete("/favorites/{videomaker_id}")
async def remove_favorite(
    videomaker_id: str,
    user: dict = Depends(get_current_user)
):
    """Remove videomaker dos favoritos"""
    
    client_id = user["sub"]
    
    result = await db.favorites.delete_one({
        "client_id": client_id,
        "videomaker_id": videomaker_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorito não encontrado"
        )
    
    return {"success": True, "message": "Videomaker removido dos favoritos"}


@router.get("/favorites/my-favorites", response_model=List[FavoriteResponse])
async def get_my_favorites(user: dict = Depends(get_current_user)):
    """Lista meus favoritos"""
    
    client_id = user["sub"]
    
    favorites = await db.favorites.find(
        {"client_id": client_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Enriquece com dados do videomaker
    response = []
    for fav in favorites:
        videomaker = await db.users.find_one(
            {"id": fav["videomaker_id"]},
            {"_id": 0, "nome": 1, "email": 1, "rating_medio": 1, "total_avaliacoes": 1, "cidade": 1, "estado": 1}
        )
        
        if videomaker:
            response.append(FavoriteResponse(
                id=fav["id"],
                videomaker_id=fav["videomaker_id"],
                videomaker_nome=videomaker.get("nome"),
                videomaker_email=videomaker.get("email"),
                videomaker_rating=videomaker.get("rating_medio", 0),
                videomaker_total_avaliacoes=videomaker.get("total_avaliacoes", 0),
                videomaker_cidade=videomaker.get("cidade"),
                videomaker_estado=videomaker.get("estado"),
                created_at=datetime.fromisoformat(fav["created_at"]) if isinstance(fav["created_at"], str) else fav["created_at"]
            ))
    
    return response


# ==================== BADGES ====================

@router.get("/badges")
async def list_badges():
    """Lista todos os badges disponíveis"""
    
    badges = await db.badges.find({"active": True}, {"_id": 0}).to_list(100)
    return badges


@router.get("/badges/user/{user_id}")
async def get_user_badges(user_id: str):
    """Lista badges de um usuário"""
    
    user_badges = await db.user_badges.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    # Enriquece com dados do badge
    response = []
    for ub in user_badges:
        badge = await db.badges.find_one({"code": ub["badge_code"]}, {"_id": 0})
        if badge:
            response.append({
                **ub,
                "badge": badge
            })
    
    return response


@router.post("/badges/award", dependencies=[Depends(admin_only)])
async def award_badge(
    user_id: str,
    badge_code: str,
    expires_at: Optional[str] = None,
    admin_user: dict = Depends(admin_only)
):
    """Concede badge a um usuário (Admin only)"""
    
    # Verifica se badge existe
    badge = await db.badges.find_one({"code": badge_code})
    if not badge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Badge não encontrado"
        )
    
    # Verifica se usuário já tem o badge
    existing = await db.user_badges.find_one({
        "user_id": user_id,
        "badge_code": badge_code
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário já possui este badge"
        )
    
    user_badge = UserBadge(
        user_id=user_id,
        badge_code=badge_code,
        expires_at=datetime.fromisoformat(expires_at) if expires_at else None
    )
    
    user_badge_dict = user_badge.model_dump()
    user_badge_dict['earned_at'] = user_badge_dict['earned_at'].isoformat()
    if user_badge_dict.get('expires_at'):
        user_badge_dict['expires_at'] = user_badge_dict['expires_at'].isoformat()
    
    await db.user_badges.insert_one(user_badge_dict)
    
    # Audit log
    await AuditService.log(
        db=db,
        user_id=admin_user["sub"],
        user_email=admin_user["email"],
        user_role=admin_user["role"],
        action="award",
        resource="badge",
        resource_id=user_badge.id,
        status="success",
        metadata={"user_id": user_id, "badge_code": badge_code}
    )
    
    return {"success": True, "message": f"Badge '{badge['name']}' concedido"}


# ==================== DISPONIBILIDADE ====================

@router.get("/availability/{videomaker_id}")
async def get_availability(
    videomaker_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Busca disponibilidade de um videomaker"""
    
    query = {"videomaker_id": videomaker_id}
    
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    availability = await db.availability.find(query, {"_id": 0}).to_list(1000)
    
    return availability


@router.post("/availability")
async def set_availability(
    availability_data: Availability,
    user: dict = Depends(get_current_user)
):
    """Define disponibilidade (Videomaker only)"""
    
    if user["role"] != "videomaker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas videomakers podem definir disponibilidade"
        )
    
    availability_data.videomaker_id = user["sub"]
    
    # Upsert: atualiza se existe, cria se não
    await db.availability.update_one(
        {"videomaker_id": user["sub"], "date": availability_data.date},
        {"$set": availability_data.model_dump()},
        upsert=True
    )
    
    return {"success": True, "message": "Disponibilidade atualizada"}


@router.post("/availability/bulk")
async def set_availability_bulk(
    bulk_data: AvailabilityBulkUpdate,
    user: dict = Depends(get_current_user)
):
    """Define disponibilidade para múltiplas datas"""
    
    if user["role"] != "videomaker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas videomakers podem definir disponibilidade"
        )
    
    operations = []
    for date in bulk_data.dates:
        operations.append({
            "update_one": {
                "filter": {"videomaker_id": user["sub"], "date": date},
                "update": {
                    "$set": {
                        "videomaker_id": user["sub"],
                        "date": date,
                        "status": bulk_data.status,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                "upsert": True
            }
        })
    
    if operations:
        await db.availability.bulk_write(operations)
    
    return {
        "success": True,
        "message": f"Disponibilidade atualizada para {len(bulk_data.dates)} datas"
    }


# ==================== DISPUTAS ====================

@router.post("/disputes", response_model=dict)
async def create_dispute(
    dispute_data: DisputeCreate,
    user: dict = Depends(get_current_user)
):
    """Abre uma disputa"""
    
    # Verifica se job existe e se usuário faz parte
    job = await db.jobs.find_one({"id": dispute_data.job_id}, {"_id": 0})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job não encontrado"
        )
    
    # Verifica permissão
    if user["sub"] not in [job.get("client_id"), job.get("videomaker_id")]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para abrir disputa neste job"
        )
    
    dispute = Dispute(
        job_id=dispute_data.job_id,
        payment_id=dispute_data.payment_id,
        opened_by=user["sub"],
        reason=dispute_data.reason,
        description=dispute_data.description,
        evidence_urls=dispute_data.evidence_urls
    )
    
    dispute_dict = dispute.model_dump()
    dispute_dict['created_at'] = dispute_dict['created_at'].isoformat()
    
    await db.disputes.insert_one(dispute_dict)
    
    # Atualiza status do job
    await db.jobs.update_one(
        {"id": dispute_data.job_id},
        {"$set": {"status": "disputed"}}
    )
    
    return {
        "success": True,
        "dispute_id": dispute.id,
        "message": "Disputa aberta. Nossa equipe irá analisar em breve."
    }


@router.get("/disputes/my-disputes")
async def get_my_disputes(user: dict = Depends(get_current_user)):
    """Lista disputas do usuário"""
    
    # Busca jobs onde o usuário está envolvido
    jobs = await db.jobs.find(
        {"$or": [{"client_id": user["sub"]}, {"videomaker_id": user["sub"]}]},
        {"_id": 0, "id": 1}
    ).to_list(1000)
    
    job_ids = [job["id"] for job in jobs]
    
    disputes = await db.disputes.find(
        {"job_id": {"$in": job_ids}},
        {"_id": 0}
    ).to_list(1000)
    
    return disputes


@router.put("/disputes/{dispute_id}/resolve", dependencies=[Depends(admin_only)])
async def resolve_dispute(
    dispute_id: str,
    resolution_data: DisputeResolve,
    admin_user: dict = Depends(admin_only)
):
    """Resolve uma disputa (Admin only)"""
    
    dispute = await db.disputes.find_one({"id": dispute_id})
    if not dispute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disputa não encontrada"
        )
    
    # Atualiza disputa
    await db.disputes.update_one(
        {"id": dispute_id},
        {"$set": {
            "status": "resolved",
            "resolution": resolution_data.resolution,
            "resolved_by": admin_user["sub"],
            "resolved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Executa ação baseada na resolução
    if resolution_data.action == "refund" and dispute.get("payment_id"):
        # Atualiza pagamento
        await db.payments.update_one(
            {"id": dispute["payment_id"]},
            {"$set": {"status": "refunded"}}
        )
    elif resolution_data.action == "release" and dispute.get("payment_id"):
        await db.payments.update_one(
            {"id": dispute["payment_id"]},
            {"$set": {"status": "released"}}
        )
    
    # Atualiza job
    await db.jobs.update_one(
        {"id": dispute["job_id"]},
        {"$set": {"status": "completed" if resolution_data.action == "release" else "cancelled"}}
    )
    
    # Audit log
    await AuditService.log(
        db=db,
        user_id=admin_user["sub"],
        user_email=admin_user["email"],
        user_role=admin_user["role"],
        action="resolve",
        resource="dispute",
        resource_id=dispute_id,
        status="success",
        metadata={"action": resolution_data.action, "job_id": dispute["job_id"]}
    )
    
    return {"success": True, "message": "Disputa resolvida"}


# ==================== DOCUMENTOS DO JOB ====================

@router.post("/jobs/{job_id}/documents")
async def upload_job_document(
    job_id: str,
    document: JobDocumentUpload,
    user: dict = Depends(get_current_user)
):
    """Faz upload de documento para o job"""
    
    # Verifica se job existe e se usuário faz parte
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job não encontrado"
        )
    
    if user["sub"] not in [job.get("client_id"), job.get("videomaker_id")]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para fazer upload neste job"
        )
    
    job_document = JobDocument(
        job_id=job_id,
        uploaded_by=user["sub"],
        document_type=document.document_type,
        filename=document.filename,
        file_url=document.file_url,
        file_size=document.file_size,
        mime_type=document.mime_type,
        description=document.description
    )
    
    doc_dict = job_document.model_dump()
    doc_dict['created_at'] = doc_dict['created_at'].isoformat()
    
    await db.job_documents.insert_one(doc_dict)
    
    return {
        "success": True,
        "document_id": job_document.id,
        "message": "Documento enviado com sucesso"
    }


@router.get("/jobs/{job_id}/documents")
async def get_job_documents(
    job_id: str,
    user: dict = Depends(get_current_user)
):
    """Lista documentos do job"""
    
    # Verifica permissão
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job não encontrado"
        )
    
    if user["sub"] not in [job.get("client_id"), job.get("videomaker_id")]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para ver documentos deste job"
        )
    
    documents = await db.job_documents.find(
        {"job_id": job_id},
        {"_id": 0}
    ).to_list(1000)
    
    return documents


@router.delete("/jobs/documents/{document_id}")
async def delete_job_document(
    document_id: str,
    user: dict = Depends(get_current_user)
):
    """Deleta documento do job"""
    
    document = await db.job_documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado"
        )
    
    # Apenas quem fez upload pode deletar
    if document["uploaded_by"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para deletar este documento"
        )
    
    await db.job_documents.delete_one({"id": document_id})
    
    return {"success": True, "message": "Documento deletado"}


# ==================== PORTFOLIO AVANÇADO ====================

@router.post("/portfolio")
async def add_portfolio_item(
    item: PortfolioItemCreate,
    user: dict = Depends(get_current_user)
):
    """Adiciona item ao portfolio (Videomaker only)"""
    
    if user["role"] != "videomaker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas videomakers podem adicionar itens ao portfolio"
        )
    
    portfolio_item = PortfolioItem(
        user_id=user["sub"],
        title=item.title,
        description=item.description,
        video_url=item.video_url,
        thumbnail_url=item.thumbnail_url,
        category=item.category,
        tags=item.tags or [],
        featured=item.featured
    )
    
    item_dict = portfolio_item.model_dump()
    item_dict['created_at'] = item_dict['created_at'].isoformat()
    item_dict['updated_at'] = item_dict['updated_at'].isoformat()
    
    await db.portfolio_items.insert_one(item_dict)
    
    return {
        "success": True,
        "item_id": portfolio_item.id,
        "message": "Item adicionado ao portfolio"
    }


@router.get("/portfolio/{user_id}")
async def get_user_portfolio(
    user_id: str,
    category: Optional[str] = None,
    featured_only: bool = False
):
    """Busca portfolio de um usuário"""
    
    query = {"user_id": user_id}
    
    if category:
        query["category"] = category
    if featured_only:
        query["featured"] = True
    
    items = await db.portfolio_items.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    return items


@router.put("/portfolio/{item_id}")
async def update_portfolio_item(
    item_id: str,
    updates: PortfolioItemUpdate,
    user: dict = Depends(get_current_user)
):
    """Atualiza item do portfolio"""
    
    item = await db.portfolio_items.find_one({"id": item_id})
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item não encontrado"
        )
    
    if item["user_id"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para editar este item"
        )
    
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.portfolio_items.update_one(
        {"id": item_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Item atualizado"}


@router.delete("/portfolio/{item_id}")
async def delete_portfolio_item(
    item_id: str,
    user: dict = Depends(get_current_user)
):
    """Deleta item do portfolio"""
    
    item = await db.portfolio_items.find_one({"id": item_id})
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item não encontrado"
        )
    
    if item["user_id"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para deletar este item"
        )
    
    await db.portfolio_items.delete_one({"id": item_id})
    
    return {"success": True, "message": "Item deletado"}


@router.post("/portfolio/{item_id}/view")
async def increment_portfolio_views(item_id: str):
    """Incrementa contador de views"""
    
    await db.portfolio_items.update_one(
        {"id": item_id},
        {"$inc": {"views": 1}}
    )
    
    return {"success": True}


@router.post("/portfolio/{item_id}/like")
async def toggle_portfolio_like(
    item_id: str,
    user: dict = Depends(get_current_user)
):
    """Like/unlike em item do portfolio"""
    
    # Verifica se já deu like
    like = await db.portfolio_likes.find_one({
        "item_id": item_id,
        "user_id": user["sub"]
    })
    
    if like:
        # Remove like
        await db.portfolio_likes.delete_one({"_id": like["_id"]})
        await db.portfolio_items.update_one(
            {"id": item_id},
            {"$inc": {"likes": -1}}
        )
        return {"liked": False}
    else:
        # Adiciona like
        await db.portfolio_likes.insert_one({
            "item_id": item_id,
            "user_id": user["sub"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.portfolio_items.update_one(
            {"id": item_id},
            {"$inc": {"likes": 1}}
        )
        return {"liked": True}
