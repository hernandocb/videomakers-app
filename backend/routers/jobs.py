from fastapi import APIRouter, HTTPException, status, Depends, Query
from middleware.auth_middleware import get_current_user
from models.job import JobCreate, Job, JobResponse
from services.value_calculator import ValueCalculator
from typing import Optional, List
from datetime import datetime, timezone

router = APIRouter(prefix="/jobs", tags=["Jobs"])

from server import db

@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(job_data: JobCreate, user: dict = Depends(get_current_user)):
    """Cria um novo job (pedido de gravação)"""
    
    # Verifica se é cliente
    if user.get("role") != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas clientes podem criar jobs"
        )
    
    # Busca configurações da plataforma
    config = await db.platform_config.find_one({"id": "platform_config"})
    valor_hora_base = config.get("valor_hora_base", 120.0) if config else 120.0
    
    # Calcula valor mínimo
    valor_minimo = ValueCalculator.calculate_minimum_value(
        job_data.duracao_horas,
        job_data.extras,
        valor_hora_base
    )
    
    # Cria job
    job = Job(
        client_id=user["sub"],
        titulo=job_data.titulo,
        descricao=job_data.descricao,
        categoria=job_data.categoria,
        data_gravacao=job_data.data_gravacao,
        duracao_horas=job_data.duracao_horas,
        local=job_data.local,
        extras=job_data.extras,
        valor_minimo=valor_minimo
    )
    
    # Salva no banco
    job_dict = job.model_dump()
    job_dict['created_at'] = job_dict['created_at'].isoformat()
    job_dict['updated_at'] = job_dict['updated_at'].isoformat()
    job_dict['data_gravacao'] = job_dict['data_gravacao'].isoformat()
    # local já é dict após model_dump()
    
    await db.jobs.insert_one(job_dict)
    
    return JobResponse(
        id=job.id,
        client_id=job.client_id,
        titulo=job.titulo,
        descricao=job.descricao,
        categoria=job.categoria,
        data_gravacao=job.data_gravacao,
        duracao_horas=job.duracao_horas,
        local=job.local,
        extras=job.extras,
        valor_minimo=job.valor_minimo,
        status=job.status,
        videomaker_id=job.videomaker_id,
        created_at=job.created_at,
        updated_at=job.updated_at
    )

@router.get("", response_model=List[JobResponse])
async def list_jobs(
    status_filter: Optional[str] = Query(None, alias="status"),
    cidade: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    """Lista jobs com filtros"""
    
    query = {}
    
    # Clientes veem apenas seus jobs
    if user.get("role") == "client":
        query["client_id"] = user["sub"]
    
    # Videomakers veem apenas jobs abertos ou seus jobs aceitos
    elif user.get("role") == "videomaker":
        query["$or"] = [
            {"status": "open"},
            {"videomaker_id": user["sub"]}
        ]
    
    if status_filter:
        query["status"] = status_filter
    
    if cidade:
        query["local.cidade"] = cidade
    
    if categoria:
        query["categoria"] = categoria
    
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(1000)
    
    # Converte para JobResponse
    response = []
    for job_dict in jobs:
        from models.job import JobLocation
        
        response.append(JobResponse(
            id=job_dict["id"],
            client_id=job_dict["client_id"],
            titulo=job_dict["titulo"],
            descricao=job_dict["descricao"],
            categoria=job_dict["categoria"],
            data_gravacao=datetime.fromisoformat(job_dict["data_gravacao"]) if isinstance(job_dict["data_gravacao"], str) else job_dict["data_gravacao"],
            duracao_horas=job_dict["duracao_horas"],
            local=JobLocation(**job_dict["local"]),
            extras=job_dict.get("extras", []),
            valor_minimo=job_dict["valor_minimo"],
            status=job_dict["status"],
            videomaker_id=job_dict.get("videomaker_id"),
            created_at=datetime.fromisoformat(job_dict["created_at"]) if isinstance(job_dict["created_at"], str) else job_dict["created_at"],
            updated_at=datetime.fromisoformat(job_dict["updated_at"]) if isinstance(job_dict["updated_at"], str) else job_dict["updated_at"]
        ))
    
    return response

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, user: dict = Depends(get_current_user)):
    """Obtém detalhes de um job"""
    
    job_dict = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job não encontrado"
        )
    
    # Verifica permissão
    if user.get("role") == "client" and job_dict["client_id"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para ver este job"
        )
    
    from models.job import JobLocation
    
    return JobResponse(
        id=job_dict["id"],
        client_id=job_dict["client_id"],
        titulo=job_dict["titulo"],
        descricao=job_dict["descricao"],
        categoria=job_dict["categoria"],
        data_gravacao=datetime.fromisoformat(job_dict["data_gravacao"]) if isinstance(job_dict["data_gravacao"], str) else job_dict["data_gravacao"],
        duracao_horas=job_dict["duracao_horas"],
        local=JobLocation(**job_dict["local"]),
        extras=job_dict.get("extras", []),
        valor_minimo=job_dict["valor_minimo"],
        status=job_dict["status"],
        videomaker_id=job_dict.get("videomaker_id"),
        created_at=datetime.fromisoformat(job_dict["created_at"]) if isinstance(job_dict["created_at"], str) else job_dict["created_at"],
        updated_at=datetime.fromisoformat(job_dict["updated_at"]) if isinstance(job_dict["updated_at"], str) else job_dict["updated_at"]
    )

@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    update_data: dict,
    user: dict = Depends(get_current_user)
):
    """Atualiza um job (apenas cliente dono pode atualizar)"""
    
    # Busca job
    job_dict = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job não encontrado"
        )
    
    # Verifica permissão
    if job_dict["client_id"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para atualizar este job"
        )
    
    # Verifica se job ainda está aberto
    if job_dict["status"] != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas jobs abertos podem ser atualizados"
        )
    
    # Campos permitidos
    allowed_fields = ["titulo", "descricao", "data_gravacao", "duracao_horas", "extras"]
    update_dict = {
        k: v for k, v in update_data.items() 
        if k in allowed_fields and v is not None
    }
    
    # Recalcula valor mínimo se necessário
    if "duracao_horas" in update_dict or "extras" in update_dict:
        config = await db.platform_config.find_one({"id": "platform_config"})
        valor_hora_base = config.get("valor_hora_base", 120.0) if config else 120.0
        
        duracao = update_dict.get("duracao_horas", job_dict["duracao_horas"])
        extras = update_dict.get("extras", job_dict["extras"])
        
        update_dict["valor_minimo"] = ValueCalculator.calculate_minimum_value(
            duracao, extras, valor_hora_base
        )
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.jobs.update_one(
        {"id": job_id},
        {"$set": update_dict}
    )
    
    # Retorna job atualizado
    job_dict = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    from models.job import JobLocation
    
    return JobResponse(
        id=job_dict["id"],
        client_id=job_dict["client_id"],
        titulo=job_dict["titulo"],
        descricao=job_dict["descricao"],
        categoria=job_dict["categoria"],
        data_gravacao=datetime.fromisoformat(job_dict["data_gravacao"]) if isinstance(job_dict["data_gravacao"], str) else job_dict["data_gravacao"],
        duracao_horas=job_dict["duracao_horas"],
        local=JobLocation(**job_dict["local"]),
        extras=job_dict.get("extras", []),
        valor_minimo=job_dict["valor_minimo"],
        status=job_dict["status"],
        videomaker_id=job_dict.get("videomaker_id"),
        created_at=datetime.fromisoformat(job_dict["created_at"]) if isinstance(job_dict["created_at"], str) else job_dict["created_at"],
        updated_at=datetime.fromisoformat(job_dict["updated_at"]) if isinstance(job_dict["updated_at"], str) else job_dict["updated_at"]
    )

@router.delete("/{job_id}")
async def cancel_job(job_id: str, user: dict = Depends(get_current_user)):
    """Cancela um job"""
    
    job_dict = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job não encontrado"
        )
    
    # Verifica permissão
    if job_dict["client_id"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para cancelar este job"
        )
    
    # Atualiza status
    await db.jobs.update_one(
        {"id": job_id},
        {"$set": {
            "status": "cancelled",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Job cancelado com sucesso"
    }
