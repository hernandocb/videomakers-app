from fastapi import APIRouter, HTTPException, status, Depends
from middleware.auth_middleware import get_current_user
from models.proposal import ProposalCreate, Proposal, ProposalResponse
from typing import List
from datetime import datetime, timezone
from services.notification_service import notify_new_proposal, notify_proposal_accepted, notify_proposal_rejected

router = APIRouter(prefix="/proposals", tags=["Propostas"])

from server import db

@router.post("", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
async def create_proposal(
    proposal_data: ProposalCreate,
    user: dict = Depends(get_current_user)
):
    """Videomaker cria proposta para um job"""
    
    # Verifica se é videomaker
    if user.get("role") != "videomaker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas videomakers podem criar propostas"
        )
    
    # Verifica se job existe e está aberto
    job = await db.jobs.find_one({"id": proposal_data.job_id}, {"_id": 0})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job não encontrado"
        )
    
    if job["status"] != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job não está aberto para propostas"
        )
    
    # Verifica se valor proposto é maior ou igual ao mínimo
    if proposal_data.valor_proposto < job["valor_minimo"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Valor proposto deve ser no mínimo R$ {job['valor_minimo']:.2f}"
        )
    
    # Verifica se já existe proposta deste videomaker para este job
    existing_proposal = await db.proposals.find_one({
        "job_id": proposal_data.job_id,
        "videomaker_id": user["sub"],
        "status": {"$ne": "rejected"}
    })
    
    if existing_proposal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você já tem uma proposta pendente para este job"
        )
    
    # Cria proposta
    proposal = Proposal(
        job_id=proposal_data.job_id,
        videomaker_id=user["sub"],
        valor_proposto=proposal_data.valor_proposto,
        mensagem=proposal_data.mensagem,
        data_entrega_estimada=proposal_data.data_entrega_estimada
    )
    
    # Salva no banco
    proposal_dict = proposal.model_dump()
    proposal_dict['created_at'] = proposal_dict['created_at'].isoformat()
    proposal_dict['updated_at'] = proposal_dict['updated_at'].isoformat()
    proposal_dict['data_entrega_estimada'] = proposal_dict['data_entrega_estimada'].isoformat()
    
    await db.proposals.insert_one(proposal_dict)
    
    # 🔔 Envia notificação para o cliente
    await notify_new_proposal(db, proposal.id)
    
    return ProposalResponse(
        id=proposal.id,
        job_id=proposal.job_id,
        videomaker_id=proposal.videomaker_id,
        valor_proposto=proposal.valor_proposto,
        mensagem=proposal.mensagem,
        data_entrega_estimada=proposal.data_entrega_estimada,
        status=proposal.status,
        created_at=proposal.created_at
    )

@router.get("/job/{job_id}", response_model=List[ProposalResponse])
async def get_job_proposals(
    job_id: str,
    user: dict = Depends(get_current_user)
):
    """Lista propostas de um job"""
    
    # Verifica se job existe
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job não encontrado"
        )
    
    # Verifica permissão (apenas cliente dono do job)
    if user.get("role") == "client" and job["client_id"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para ver propostas deste job"
        )
    
    # Busca propostas
    proposals = await db.proposals.find(
        {"job_id": job_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Converte para ProposalResponse
    response = []
    for prop_dict in proposals:
        response.append(ProposalResponse(
            id=prop_dict["id"],
            job_id=prop_dict["job_id"],
            videomaker_id=prop_dict["videomaker_id"],
            valor_proposto=prop_dict["valor_proposto"],
            mensagem=prop_dict.get("mensagem"),
            data_entrega_estimada=datetime.fromisoformat(prop_dict["data_entrega_estimada"]) if isinstance(prop_dict["data_entrega_estimada"], str) else prop_dict["data_entrega_estimada"],
            status=prop_dict["status"],
            created_at=datetime.fromisoformat(prop_dict["created_at"]) if isinstance(prop_dict["created_at"], str) else prop_dict["created_at"]
        ))
    
    return response

@router.put("/{proposal_id}/accept")
async def accept_proposal(
    proposal_id: str,
    user: dict = Depends(get_current_user)
):
    """Cliente aceita uma proposta"""
    
    # Verifica se é cliente
    if user.get("role") != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas clientes podem aceitar propostas"
        )
    
    # Busca proposta
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposta não encontrada"
        )
    
    # Busca job
    job = await db.jobs.find_one({"id": proposal["job_id"]}, {"_id": 0})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job não encontrado"
        )
    
    # Verifica se cliente é dono do job
    if job["client_id"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para aceitar esta proposta"
        )
    
    # Verifica se job ainda está aberto
    if job["status"] != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job não está mais aberto"
        )
    
    # Aceita proposta
    await db.proposals.update_one(
        {"id": proposal_id},
        {"$set": {
            "status": "accepted",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Rejeita outras propostas do mesmo job
    await db.proposals.update_many(
        {
            "job_id": proposal["job_id"],
            "id": {"$ne": proposal_id},
            "status": "pending"
        },
        {"$set": {
            "status": "rejected",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Atualiza job
    await db.jobs.update_one(
        {"id": proposal["job_id"]},
        {"$set": {
            "status": "in_progress",
            "videomaker_id": proposal["videomaker_id"],
            "proposta_aceita_id": proposal_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Cria chat entre cliente e videomaker
    from models.chat import Chat
    chat = Chat(
        job_id=proposal["job_id"],
        client_id=user["sub"],
        videomaker_id=proposal["videomaker_id"]
    )
    
    chat_dict = chat.model_dump()
    chat_dict['created_at'] = chat_dict['created_at'].isoformat()
    
    await db.chats.insert_one(chat_dict)
    
    return {
        "success": True,
        "message": "Proposta aceita com sucesso",
        "chat_id": chat.id,
        "next_step": "Realize o pagamento para iniciar o job"
    }

@router.put("/{proposal_id}/reject")
async def reject_proposal(
    proposal_id: str,
    user: dict = Depends(get_current_user)
):
    """Cliente rejeita uma proposta"""
    
    # Busca proposta
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposta não encontrada"
        )
    
    # Busca job
    job = await db.jobs.find_one({"id": proposal["job_id"]}, {"_id": 0})
    if not job or job["client_id"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para rejeitar esta proposta"
        )
    
    # Rejeita proposta
    await db.proposals.update_one(
        {"id": proposal_id},
        {"$set": {
            "status": "rejected",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Proposta rejeitada"
    }

@router.get("/my-proposals", response_model=List[ProposalResponse])
async def get_my_proposals(user: dict = Depends(get_current_user)):
    """Videomaker vê suas próprias propostas"""
    
    if user.get("role") != "videomaker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas videomakers podem acessar esta rota"
        )
    
    proposals = await db.proposals.find(
        {"videomaker_id": user["sub"]},
        {"_id": 0}
    ).to_list(1000)
    
    response = []
    for prop_dict in proposals:
        response.append(ProposalResponse(
            id=prop_dict["id"],
            job_id=prop_dict["job_id"],
            videomaker_id=prop_dict["videomaker_id"],
            valor_proposto=prop_dict["valor_proposto"],
            mensagem=prop_dict.get("mensagem"),
            data_entrega_estimada=datetime.fromisoformat(prop_dict["data_entrega_estimada"]) if isinstance(prop_dict["data_entrega_estimada"], str) else prop_dict["data_entrega_estimada"],
            status=prop_dict["status"],
            created_at=datetime.fromisoformat(prop_dict["created_at"]) if isinstance(prop_dict["created_at"], str) else prop_dict["created_at"]
        ))
    
    return response
