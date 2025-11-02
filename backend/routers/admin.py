from fastapi import APIRouter, HTTPException, status, Depends, Query
from middleware.auth_middleware import get_current_user, require_role
from models.config import PlatformConfig, ConfigUpdate
from models.user import UserResponse
from typing import List, Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/admin", tags=["Admin"])

from server import db

async def admin_only(user: dict = Depends(get_current_user)):
    """Middleware para verificar se é admin"""
    await require_role(user, ["admin"])
    return user

@router.get("/config", response_model=PlatformConfig)
async def get_platform_config(user: dict = Depends(admin_only)):
    """Obtém configurações da plataforma"""
    
    config = await db.platform_config.find_one({"id": "platform_config"}, {"_id": 0})
    
    if not config:
        # Cria config padrão
        default_config = PlatformConfig()
        config_dict = default_config.model_dump()
        config_dict['updated_at'] = config_dict['updated_at'].isoformat()
        
        await db.platform_config.insert_one(config_dict)
        return default_config
    
    return PlatformConfig(
        id=config["id"],
        taxa_comissao=config["taxa_comissao"],
        valor_hora_base=config["valor_hora_base"],
        updated_at=datetime.fromisoformat(config["updated_at"]) if isinstance(config["updated_at"], str) else config["updated_at"],
        updated_by=config.get("updated_by", "system")
    )

@router.put("/config")
async def update_platform_config(
    config_update: ConfigUpdate,
    user: dict = Depends(admin_only)
):
    """Atualiza configurações da plataforma"""
    
    update_dict = {
        "taxa_comissao": config_update.taxa_comissao,
        "valor_hora_base": config_update.valor_hora_base,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["sub"]
    }
    
    result = await db.platform_config.update_one(
        {"id": "platform_config"},
        {"$set": update_dict},
        upsert=True
    )
    
    # Log de auditoria
    await db.audit_logs.insert_one({
        "user_id": user["sub"],
        "action": "update_platform_config",
        "details": update_dict,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": "Configurações atualizadas",
        "config": update_dict
    }

@router.get("/users", response_model=List[UserResponse])
async def list_all_users(
    role: Optional[str] = Query(None),
    ativo: Optional[bool] = Query(None),
    verificado: Optional[bool] = Query(None),
    user: dict = Depends(admin_only)
):
    """Lista todos os usuários com filtros"""
    
    query = {}
    
    if role:
        query["role"] = role
    if ativo is not None:
        query["ativo"] = ativo
    if verificado is not None:
        query["verificado"] = verificado
    
    users = await db.users.find(query, {"_id": 0}).to_list(10000)
    
    response = []
    for user_dict in users:
        response.append(UserResponse(
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
        ))
    
    return response

@router.put("/users/{user_id}/ban")
async def ban_user(
    user_id: str,
    reason: str,
    admin_user: dict = Depends(admin_only)
):
    """Banir/desativar usuário"""
    
    user_dict = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "ativo": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log de auditoria
    await db.audit_logs.insert_one({
        "user_id": admin_user["sub"],
        "action": "ban_user",
        "target_user_id": user_id,
        "reason": reason,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"Usuário {user_dict['nome']} banido"
    }

@router.put("/users/{user_id}/unban")
async def unban_user(
    user_id: str,
    admin_user: dict = Depends(admin_only)
):
    """Desbanir/reativar usuário"""
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "ativo": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # Log de auditoria
    await db.audit_logs.insert_one({
        "user_id": admin_user["sub"],
        "action": "unban_user",
        "target_user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": "Usuário reativado"
    }

@router.put("/users/{user_id}/verify")
async def verify_user(
    user_id: str,
    admin_user: dict = Depends(admin_only)
):
    """Verificar usuário manualmente"""
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "verificado": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    return {
        "success": True,
        "message": "Usuário verificado"
    }

@router.get("/jobs")
async def admin_list_jobs(
    status_filter: Optional[str] = Query(None, alias="status"),
    user: dict = Depends(admin_only)
):
    """Lista todos os jobs (admin)"""
    
    query = {}
    if status_filter:
        query["status"] = status_filter
    
    jobs = await db.jobs.find(query, {"_id": 0}).to_list(10000)
    
    return jobs

@router.get("/payments")
async def admin_list_payments(
    status_filter: Optional[str] = Query(None, alias="status"),
    user: dict = Depends(admin_only)
):
    """Lista todos os pagamentos (admin)"""
    
    query = {}
    if status_filter:
        query["status"] = status_filter
    
    payments = await db.payments.find(query, {"_id": 0}).to_list(10000)
    
    return payments

@router.get("/moderation-logs")
async def get_moderation_logs(
    chat_id: Optional[str] = Query(None),
    user: dict = Depends(admin_only)
):
    """Lista logs de moderação de chat"""
    
    query = {}
    if chat_id:
        query["chat_id"] = chat_id
    
    logs = await db.moderation_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    
    return logs

@router.get("/audit-logs")
async def get_audit_logs(
    action: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    admin_user: dict = Depends(admin_only)
):
    """Lista logs de auditoria"""
    
    query = {}
    if action:
        query["action"] = action
    if user_id:
        query["user_id"] = user_id
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    
    return logs

@router.get("/stats")
async def get_platform_stats(user: dict = Depends(admin_only)):
    """Estatísticas gerais da plataforma"""
    
    # Conta usuários
    total_users = await db.users.count_documents({})
    total_clients = await db.users.count_documents({"role": "client"})
    total_videomakers = await db.users.count_documents({"role": "videomaker"})
    
    # Conta jobs
    total_jobs = await db.jobs.count_documents({})
    jobs_open = await db.jobs.count_documents({"status": "open"})
    jobs_in_progress = await db.jobs.count_documents({"status": "in_progress"})
    jobs_completed = await db.jobs.count_documents({"status": "completed"})
    jobs_cancelled = await db.jobs.count_documents({"status": "cancelled"})
    
    # Pagamentos
    total_payments = await db.payments.count_documents({})
    payments_held = await db.payments.count_documents({"status": "held"})
    payments_released = await db.payments.count_documents({"status": "released"})
    
    # Receita total da plataforma (comissões)
    pipeline = [
        {"$match": {"status": "released"}},
        {"$group": {"_id": None, "total": {"$sum": "$comissao_plataforma"}}}
    ]
    revenue_result = await db.payments.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "users": {
            "total": total_users,
            "clients": total_clients,
            "videomakers": total_videomakers
        },
        "jobs": {
            "total": total_jobs,
            "open": jobs_open,
            "in_progress": jobs_in_progress,
            "completed": jobs_completed,
            "cancelled": jobs_cancelled
        },
        "payments": {
            "total": total_payments,
            "held": payments_held,
            "released": payments_released
        },
        "revenue": {
            "total_commission": round(total_revenue, 2),
            "currency": "BRL"
        }
    }

@router.get("/analytics/growth")
async def get_growth_analytics(
    months: int = Query(6, ge=1, le=24),
    user: dict = Depends(admin_only)
):
    """Analytics de crescimento ao longo do tempo (usuários e jobs por mês)"""
    from datetime import datetime, timedelta
    
    # Calcular data de início
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=months * 30)
    
    # Pipeline para usuários por mês
    users_pipeline = [
        {
            "$match": {
                "created_at": {"$gte": start_date.isoformat()}
            }
        },
        {
            "$group": {
                "_id": {
                    "$substr": ["$created_at", 0, 7]  # YYYY-MM
                },
                "clients": {
                    "$sum": {"$cond": [{"$eq": ["$role", "client"]}, 1, 0]}
                },
                "videomakers": {
                    "$sum": {"$cond": [{"$eq": ["$role", "videomaker"]}, 1, 0]}
                },
                "total": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    # Pipeline para jobs por mês
    jobs_pipeline = [
        {
            "$match": {
                "created_at": {"$gte": start_date.isoformat()}
            }
        },
        {
            "$group": {
                "_id": {
                    "$substr": ["$created_at", 0, 7]
                },
                "total": {"$sum": 1},
                "completed": {
                    "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                }
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    users_growth = await db.users.aggregate(users_pipeline).to_list(100)
    jobs_growth = await db.jobs.aggregate(jobs_pipeline).to_list(100)
    
    return {
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "months": months
        },
        "users_growth": users_growth,
        "jobs_growth": jobs_growth
    }

@router.get("/analytics/revenue")
async def get_revenue_analytics(
    months: int = Query(6, ge=1, le=24),
    user: dict = Depends(admin_only)
):
    """Analytics de receita mensal detalhada"""
    from datetime import datetime, timedelta
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=months * 30)
    
    pipeline = [
        {
            "$match": {
                "created_at": {"$gte": start_date.isoformat()},
                "status": {"$in": ["held", "released"]}
            }
        },
        {
            "$group": {
                "_id": {
                    "$substr": ["$created_at", 0, 7]
                },
                "total_valor": {"$sum": "$valor_total"},
                "total_comissao": {"$sum": "$comissao_plataforma"},
                "total_videomaker": {"$sum": "$valor_videomaker"},
                "count": {"$sum": 1},
                "released_count": {
                    "$sum": {"$cond": [{"$eq": ["$status", "released"]}, 1, 0]}
                }
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    revenue_data = await db.payments.aggregate(pipeline).to_list(100)
    
    # Calcular médias
    total_transactions = sum(item["count"] for item in revenue_data)
    total_commission = sum(item["total_comissao"] for item in revenue_data)
    avg_transaction_value = sum(item["total_valor"] for item in revenue_data) / total_transactions if total_transactions > 0 else 0
    
    return {
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "months": months
        },
        "monthly_revenue": revenue_data,
        "summary": {
            "total_transactions": total_transactions,
            "total_commission": round(total_commission, 2),
            "avg_transaction_value": round(avg_transaction_value, 2)
        }
    }

@router.get("/analytics/conversion")
async def get_conversion_analytics(user: dict = Depends(admin_only)):
    """Taxa de conversão e métricas de performance"""
    
    # Total de propostas
    total_proposals = await db.proposals.count_documents({})
    accepted_proposals = await db.proposals.count_documents({"status": "accepted"})
    rejected_proposals = await db.proposals.count_documents({"status": "rejected"})
    pending_proposals = await db.proposals.count_documents({"status": "pending"})
    
    # Taxa de conversão
    conversion_rate = (accepted_proposals / total_proposals * 100) if total_proposals > 0 else 0
    
    # Jobs com pelo menos uma proposta
    jobs_with_proposals = await db.proposals.distinct("job_id")
    total_jobs = await db.jobs.count_documents({})
    job_engagement_rate = (len(jobs_with_proposals) / total_jobs * 100) if total_jobs > 0 else 0
    
    # Tempo médio para aceitar proposta (em horas)
    pipeline = [
        {
            "$match": {"status": "accepted"}
        },
        {
            "$lookup": {
                "from": "jobs",
                "localField": "job_id",
                "foreignField": "id",
                "as": "job"
            }
        },
        {
            "$unwind": "$job"
        }
    ]
    
    accepted_data = await db.proposals.aggregate(pipeline).to_list(1000)
    
    return {
        "proposals": {
            "total": total_proposals,
            "accepted": accepted_proposals,
            "rejected": rejected_proposals,
            "pending": pending_proposals,
            "conversion_rate": round(conversion_rate, 2)
        },
        "engagement": {
            "jobs_with_proposals": len(jobs_with_proposals),
            "total_jobs": total_jobs,
            "engagement_rate": round(job_engagement_rate, 2)
        }
    }

@router.get("/analytics/top-performers")
async def get_top_performers(
    limit: int = Query(10, ge=1, le=50),
    user: dict = Depends(admin_only)
):
    """Top videomakers e clientes mais ativos"""
    
    # Top videomakers por jobs completados
    top_videomakers_pipeline = [
        {
            "$match": {"status": "completed"}
        },
        {
            "$group": {
                "_id": "$videomaker_id",
                "jobs_completed": {"$sum": 1},
                "total_earned": {"$sum": "$valor_minimo_sugerido"}
            }
        },
        {"$sort": {"jobs_completed": -1}},
        {"$limit": limit}
    ]
    
    top_videomakers_data = await db.jobs.aggregate(top_videomakers_pipeline).to_list(limit)
    
    # Enriquecer com dados do usuário
    top_videomakers = []
    for item in top_videomakers_data:
        if item["_id"]:
            user_data = await db.users.find_one({"id": item["_id"]}, {"_id": 0, "nome": 1, "email": 1, "rating_medio": 1, "total_avaliacoes": 1})
            if user_data:
                top_videomakers.append({
                    "id": item["_id"],
                    "nome": user_data.get("nome"),
                    "email": user_data.get("email"),
                    "rating": user_data.get("rating_medio", 0),
                    "total_reviews": user_data.get("total_avaliacoes", 0),
                    "jobs_completed": item["jobs_completed"],
                    "total_earned": round(item.get("total_earned", 0), 2)
                })
    
    # Top clientes por jobs criados
    top_clients_pipeline = [
        {
            "$group": {
                "_id": "$client_id",
                "jobs_created": {"$sum": 1},
                "jobs_completed": {
                    "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                }
            }
        },
        {"$sort": {"jobs_created": -1}},
        {"$limit": limit}
    ]
    
    top_clients_data = await db.jobs.aggregate(top_clients_pipeline).to_list(limit)
    
    # Enriquecer com dados do usuário
    top_clients = []
    for item in top_clients_data:
        user_data = await db.users.find_one({"id": item["_id"]}, {"_id": 0, "nome": 1, "email": 1})
        if user_data:
            top_clients.append({
                "id": item["_id"],
                "nome": user_data.get("nome"),
                "email": user_data.get("email"),
                "jobs_created": item["jobs_created"],
                "jobs_completed": item["jobs_completed"]
            })
    
    return {
        "top_videomakers": top_videomakers,
        "top_clients": top_clients
    }

@router.get("/analytics/real-time")
async def get_realtime_analytics(user: dict = Depends(admin_only)):
    """Métricas em tempo real (hoje)"""
    from datetime import datetime, timedelta
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_str = today_start.isoformat()
    
    # Usuários cadastrados hoje
    users_today = await db.users.count_documents({"created_at": {"$gte": today_start_str}})
    
    # Jobs criados hoje
    jobs_today = await db.jobs.count_documents({"created_at": {"$gte": today_start_str}})
    
    # Propostas enviadas hoje
    proposals_today = await db.proposals.count_documents({"created_at": {"$gte": today_start_str}})
    
    # Pagamentos hoje
    payments_today = await db.payments.count_documents({"created_at": {"$gte": today_start_str}})
    
    # Receita hoje
    pipeline = [
        {
            "$match": {
                "created_at": {"$gte": today_start_str},
                "status": "released"
            }
        },
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$comissao_plataforma"}
            }
        }
    ]
    revenue_today_result = await db.payments.aggregate(pipeline).to_list(1)
    revenue_today = revenue_today_result[0]["total"] if revenue_today_result else 0
    
    # Últimos 7 dias para comparação
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    users_week = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    jobs_week = await db.jobs.count_documents({"created_at": {"$gte": week_ago}})
    
    return {
        "today": {
            "date": today_start.strftime("%Y-%m-%d"),
            "users": users_today,
            "jobs": jobs_today,
            "proposals": proposals_today,
            "payments": payments_today,
            "revenue": round(revenue_today, 2)
        },
        "last_7_days": {
            "users": users_week,
            "jobs": jobs_week,
            "avg_users_per_day": round(users_week / 7, 1),
            "avg_jobs_per_day": round(jobs_week / 7, 1)
        }
    }
