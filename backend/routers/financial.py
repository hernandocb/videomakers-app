from fastapi import APIRouter, HTTPException, status, Depends, Query
from middleware.auth_middleware import get_current_user, require_role
from models.coupon import (
    CouponCreate, Coupon, CouponResponse, 
    CouponValidation, CouponValidationResponse, CouponUsage
)
from datetime import datetime, timezone
from typing import List, Optional

router = APIRouter(prefix="/financial", tags=["Financial"])

from server import db

async def admin_only(user: dict = Depends(get_current_user)):
    """Middleware para verificar se é admin"""
    await require_role(user, ["admin"])
    return user


# ==================== CUPONS ====================

@router.post("/coupons", response_model=CouponResponse, dependencies=[Depends(admin_only)])
async def create_coupon(
    coupon_data: CouponCreate,
    admin_user: dict = Depends(admin_only)
):
    """Cria novo cupom de desconto (Admin only)"""
    
    # Verifica se código já existe
    existing = await db.coupons.find_one({"code": coupon_data.code.upper()}, {"_id": 0})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de cupom já existe"
        )
    
    # Valida tipo
    if coupon_data.tipo not in ["percentage", "fixed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo deve ser 'percentage' ou 'fixed'"
        )
    
    # Valida percentual
    if coupon_data.tipo == "percentage" and coupon_data.valor > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Desconto percentual não pode ser maior que 100%"
        )
    
    coupon = Coupon(
        code=coupon_data.code.upper(),
        tipo=coupon_data.tipo,
        valor=coupon_data.valor,
        valor_minimo_job=coupon_data.valor_minimo_job,
        max_usos=coupon_data.max_usos,
        max_usos_por_usuario=coupon_data.max_usos_por_usuario,
        data_expiracao=coupon_data.data_expiracao,
        ativo=coupon_data.ativo,
        descricao=coupon_data.descricao,
        created_by=admin_user["sub"]
    )
    
    coupon_dict = coupon.model_dump()
    coupon_dict['created_at'] = coupon_dict['created_at'].isoformat()
    if coupon_dict.get('data_expiracao'):
        coupon_dict['data_expiracao'] = coupon_dict['data_expiracao'].isoformat()
    
    await db.coupons.insert_one(coupon_dict)
    
    return CouponResponse(**coupon.model_dump())


@router.get("/coupons", response_model=List[CouponResponse], dependencies=[Depends(admin_only)])
async def list_coupons(
    ativo: Optional[bool] = None,
    admin_user: dict = Depends(admin_only)
):
    """Lista todos os cupons (Admin only)"""
    
    query = {}
    if ativo is not None:
        query["ativo"] = ativo
    
    coupons = await db.coupons.find(query, {"_id": 0}).to_list(1000)
    
    response = []
    for coupon_dict in coupons:
        response.append(CouponResponse(
            id=coupon_dict["id"],
            code=coupon_dict["code"],
            tipo=coupon_dict["tipo"],
            valor=coupon_dict["valor"],
            valor_minimo_job=coupon_dict.get("valor_minimo_job"),
            max_usos=coupon_dict.get("max_usos"),
            usos_totais=coupon_dict.get("usos_totais", 0),
            ativo=coupon_dict["ativo"],
            descricao=coupon_dict.get("descricao"),
            data_expiracao=datetime.fromisoformat(coupon_dict["data_expiracao"]) if coupon_dict.get("data_expiracao") else None,
            created_at=datetime.fromisoformat(coupon_dict["created_at"]) if isinstance(coupon_dict["created_at"], str) else coupon_dict["created_at"]
        ))
    
    return response


@router.post("/coupons/validate", response_model=CouponValidationResponse)
async def validate_coupon(
    validation: CouponValidation,
    user: dict = Depends(get_current_user)
):
    """Valida um cupom e calcula desconto"""
    
    # Busca cupom
    coupon = await db.coupons.find_one({"code": validation.code.upper()}, {"_id": 0})
    
    if not coupon:
        return CouponValidationResponse(
            valido=False,
            message="Cupom não encontrado"
        )
    
    # Verifica se está ativo
    if not coupon["ativo"]:
        return CouponValidationResponse(
            valido=False,
            message="Cupom inativo"
        )
    
    # Verifica expiração
    if coupon.get("data_expiracao"):
        expiracao = datetime.fromisoformat(coupon["data_expiracao"]) if isinstance(coupon["data_expiracao"], str) else coupon["data_expiracao"]
        if datetime.now(timezone.utc) > expiracao:
            return CouponValidationResponse(
                valido=False,
                message="Cupom expirado"
            )
    
    # Verifica valor mínimo
    if coupon.get("valor_minimo_job") and validation.valor_job < coupon["valor_minimo_job"]:
        return CouponValidationResponse(
            valido=False,
            message=f"Valor mínimo do job: R$ {coupon['valor_minimo_job']:.2f}"
        )
    
    # Verifica limite total de usos
    if coupon.get("max_usos") and coupon.get("usos_totais", 0) >= coupon["max_usos"]:
        return CouponValidationResponse(
            valido=False,
            message="Cupom atingiu limite de usos"
        )
    
    # Verifica limite de usos por usuário
    user_uses = await db.coupon_usages.count_documents({
        "coupon_id": coupon["id"],
        "user_id": user["sub"]
    })
    
    if user_uses >= coupon.get("max_usos_por_usuario", 1):
        return CouponValidationResponse(
            valido=False,
            message="Você já utilizou este cupom o máximo de vezes permitido"
        )
    
    # Calcula desconto
    if coupon["tipo"] == "percentage":
        desconto = validation.valor_job * (coupon["valor"] / 100)
    else:  # fixed
        desconto = min(coupon["valor"], validation.valor_job)
    
    valor_final = max(0, validation.valor_job - desconto)
    
    return CouponValidationResponse(
        valido=True,
        message="Cupom válido!",
        desconto=round(desconto, 2),
        valor_final=round(valor_final, 2),
        coupon_id=coupon["id"]
    )


@router.put("/coupons/{coupon_id}", dependencies=[Depends(admin_only)])
async def update_coupon(
    coupon_id: str,
    ativo: Optional[bool] = None,
    admin_user: dict = Depends(admin_only)
):
    """Ativa/desativa cupom (Admin only)"""
    
    update_dict = {}
    if ativo is not None:
        update_dict["ativo"] = ativo
    
    result = await db.coupons.update_one(
        {"id": coupon_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cupom não encontrado"
        )
    
    return {"success": True, "message": "Cupom atualizado"}


@router.delete("/coupons/{coupon_id}", dependencies=[Depends(admin_only)])
async def delete_coupon(
    coupon_id: str,
    admin_user: dict = Depends(admin_only)
):
    """Deleta cupom (Admin only)"""
    
    result = await db.coupons.delete_one({"id": coupon_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cupom não encontrado"
        )
    
    return {"success": True, "message": "Cupom deletado"}


# ==================== HISTÓRICO FINANCEIRO ====================

@router.get("/transactions/my-history")
async def get_my_transactions(
    user: dict = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200)
):
    """Histórico de transações do usuário"""
    
    user_id = user["sub"]
    role = user.get("role")
    
    # Busca pagamentos onde o usuário está envolvido
    query = {}
    if role == "client":
        query["client_id"] = user_id
    elif role == "videomaker":
        query["videomaker_id"] = user_id
    else:
        query["$or"] = [{"client_id": user_id}, {"videomaker_id": user_id}]
    
    payments = await db.payments.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enriquece com dados do job
    transactions = []
    for payment in payments:
        job = await db.jobs.find_one({"id": payment["job_id"]}, {"_id": 0, "titulo": 1, "categoria": 1})
        
        transaction = {
            "id": payment["id"],
            "job_id": payment["job_id"],
            "job_titulo": job.get("titulo", "Job") if job else "Job",
            "job_categoria": job.get("categoria") if job else None,
            "valor_total": payment["valor_total"],
            "tipo": "saída" if payment["client_id"] == user_id else "entrada",
            "valor": payment["valor_total"] if payment["client_id"] == user_id else payment.get("valor_videomaker", 0),
            "status": payment["status"],
            "created_at": payment["created_at"],
            "released_at": payment.get("released_at")
        }
        
        transactions.append(transaction)
    
    # Calcula resumo
    total_entrada = sum(t["valor"] for t in transactions if t["tipo"] == "entrada" and t["status"] == "released")
    total_saida = sum(t["valor"] for t in transactions if t["tipo"] == "saída" and t["status"] in ["held", "released"])
    
    return {
        "transactions": transactions,
        "summary": {
            "total_entrada": round(total_entrada, 2),
            "total_saida": round(total_saida, 2),
            "saldo": round(total_entrada - total_saida, 2)
        }
    }


@router.get("/videomaker/earnings")
async def get_videomaker_earnings(
    user: dict = Depends(get_current_user),
    months: int = Query(6, ge=1, le=24)
):
    """Gráfico de ganhos do videomaker ao longo do tempo"""
    
    if user.get("role") != "videomaker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas videomakers podem acessar esta rota"
        )
    
    from datetime import timedelta
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=months * 30)
    
    # Busca pagamentos liberados do videomaker
    pipeline = [
        {
            "$match": {
                "videomaker_id": user["sub"],
                "status": "released",
                "created_at": {"$gte": start_date.isoformat()}
            }
        },
        {
            "$group": {
                "_id": {
                    "$substr": ["$created_at", 0, 7]  # YYYY-MM
                },
                "total_ganhos": {"$sum": "$valor_videomaker"},
                "total_jobs": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    earnings = await db.payments.aggregate(pipeline).to_list(100)
    
    # Total geral
    total_ganhos = sum(e["total_ganhos"] for e in earnings)
    total_jobs = sum(e["total_jobs"] for e in earnings)
    
    return {
        "monthly_earnings": earnings,
        "summary": {
            "total_ganhos": round(total_ganhos, 2),
            "total_jobs": total_jobs,
            "media_por_job": round(total_ganhos / total_jobs, 2) if total_jobs > 0 else 0,
            "periodo_meses": months
        }
    }


@router.get("/admin/financial-report", dependencies=[Depends(admin_only)])
async def get_financial_report(
    month: Optional[str] = None,  # formato: YYYY-MM
    admin_user: dict = Depends(admin_only)
):
    """Relatório financeiro mensal detalhado (Admin only)"""
    
    from datetime import timedelta
    
    # Se mês não especificado, usa mês atual
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Define período
    start_date = datetime.fromisoformat(f"{month}-01T00:00:00+00:00")
    if start_date.month == 12:
        end_date = start_date.replace(year=start_date.year + 1, month=1)
    else:
        end_date = start_date.replace(month=start_date.month + 1)
    
    start_str = start_date.isoformat()
    end_str = end_date.isoformat()
    
    # Pagamentos do mês
    payments = await db.payments.find({
        "created_at": {"$gte": start_str, "$lt": end_str}
    }, {"_id": 0}).to_list(10000)
    
    # Calcula métricas
    total_transacoes = len(payments)
    total_volume = sum(p["valor_total"] for p in payments)
    total_comissoes = sum(p.get("comissao_plataforma", 0) for p in payments)
    total_videomakers = sum(p.get("valor_videomaker", 0) for p in payments if p["status"] == "released")
    
    # Por status
    held = [p for p in payments if p["status"] == "held"]
    released = [p for p in payments if p["status"] == "released"]
    refunded = [p for p in payments if p["status"] == "refunded"]
    
    # Ticket médio
    ticket_medio = total_volume / total_transacoes if total_transacoes > 0 else 0
    
    # Top videomakers do mês
    videomaker_earnings = {}
    for p in released:
        vm_id = p.get("videomaker_id")
        if vm_id:
            if vm_id not in videomaker_earnings:
                videomaker_earnings[vm_id] = 0
            videomaker_earnings[vm_id] += p.get("valor_videomaker", 0)
    
    top_videomakers = sorted(
        videomaker_earnings.items(),
        key=lambda x: x[1],
        reverse=True
    )[:10]
    
    # Enriquece com dados dos videomakers
    top_vm_details = []
    for vm_id, earnings in top_videomakers:
        vm = await db.users.find_one({"id": vm_id}, {"_id": 0, "nome": 1, "email": 1})
        if vm:
            top_vm_details.append({
                "id": vm_id,
                "nome": vm.get("nome"),
                "email": vm.get("email"),
                "ganhos": round(earnings, 2)
            })
    
    return {
        "periodo": {
            "mes": month,
            "inicio": start_str,
            "fim": end_str
        },
        "metricas_gerais": {
            "total_transacoes": total_transacoes,
            "volume_total": round(total_volume, 2),
            "comissoes_plataforma": round(total_comissoes, 2),
            "pagamentos_videomakers": round(total_videomakers, 2),
            "ticket_medio": round(ticket_medio, 2)
        },
        "por_status": {
            "em_escrow": {
                "quantidade": len(held),
                "valor": round(sum(p["valor_total"] for p in held), 2)
            },
            "liberados": {
                "quantidade": len(released),
                "valor": round(sum(p["valor_total"] for p in released), 2)
            },
            "reembolsados": {
                "quantidade": len(refunded),
                "valor": round(sum(p["valor_total"] for p in refunded), 2)
            }
        },
        "top_videomakers": top_vm_details
    }
