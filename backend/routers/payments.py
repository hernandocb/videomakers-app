from fastapi import APIRouter, HTTPException, status, Depends
from middleware.auth_middleware import get_current_user
from models.payment import PaymentCreate, Payment, PaymentResponse, TransactionLog
from services.payment_service import PaymentService
from services.value_calculator import ValueCalculator
from datetime import datetime, timezone
from services.notification_service import notify_payment_released, notify_job_completed

router = APIRouter(prefix="/payments", tags=["Pagamentos"])

from server import db

payment_service = PaymentService()

@router.post("/hold", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_hold(
    payment_data: PaymentCreate,
    user: dict = Depends(get_current_user)
):
    """Cliente realiza pagamento que fica retido em escrow"""
    
    # Verifica se é cliente
    if user.get("role") != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas clientes podem realizar pagamentos"
        )
    
    # Busca job
    job = await db.jobs.find_one({"id": payment_data.job_id}, {"_id": 0})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job não encontrado"
        )
    
    # Verifica se cliente é dono do job
    if job["client_id"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para pagar este job"
        )
    
    # Verifica se job tem videomaker atribuído
    if not job.get("videomaker_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job não tem videomaker atribuído"
        )
    
    # Verifica se já existe pagamento
    existing_payment = await db.payments.find_one({"job_id": payment_data.job_id})
    if existing_payment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pagamento já realizado para este job"
        )
    
    # Busca configuração de comissão
    config = await db.platform_config.find_one({"id": "platform_config"})
    taxa_comissao = config.get("taxa_comissao", 0.20) if config else 0.20
    
    # Calcula valores
    valores = ValueCalculator.calculate_commission(payment_data.valor_total, taxa_comissao)
    
    # Busca cliente para email
    client = await db.users.find_one({"id": user["sub"]}, {"_id": 0})
    
    # Cria PaymentIntent no Stripe
    stripe_result = await payment_service.create_payment_intent(
        amount=payment_data.valor_total,
        customer_email=client["email"],
        metadata={
            "job_id": payment_data.job_id,
            "client_id": user["sub"],
            "videomaker_id": job["videomaker_id"]
        }
    )
    
    if not stripe_result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar pagamento: {stripe_result['error']}"
        )
    
    # Cria registro de pagamento
    payment = Payment(
        job_id=payment_data.job_id,
        client_id=user["sub"],
        videomaker_id=job["videomaker_id"],
        valor_total=payment_data.valor_total,
        comissao_plataforma=valores["comissao_plataforma"],
        valor_videomaker=valores["valor_videomaker"],
        stripe_payment_intent_id=stripe_result["payment_intent_id"],
        status="held"
    )
    
    # Salva no banco
    payment_dict = payment.model_dump()
    payment_dict['created_at'] = payment_dict['created_at'].isoformat()
    
    await db.payments.insert_one(payment_dict)
    
    # Log de transação
    transaction_log = TransactionLog(
        payment_id=payment.id,
        action="hold",
        user_id=user["sub"],
        details={
            "stripe_payment_intent_id": stripe_result["payment_intent_id"],
            "valor_total": payment_data.valor_total
        }
    )
    
    transaction_dict = transaction_log.model_dump()
    transaction_dict['created_at'] = transaction_dict['created_at'].isoformat()
    
    await db.transaction_logs.insert_one(transaction_dict)
    
    return PaymentResponse(
        id=payment.id,
        job_id=payment.job_id,
        client_id=payment.client_id,
        videomaker_id=payment.videomaker_id,
        valor_total=payment.valor_total,
        comissao_plataforma=payment.comissao_plataforma,
        valor_videomaker=payment.valor_videomaker,
        status=payment.status,
        created_at=payment.created_at
    )

@router.post("/{payment_id}/release")
async def release_payment(
    payment_id: str,
    user: dict = Depends(get_current_user)
):
    """Libera pagamento do escrow para o videomaker após entrega"""
    
    # Busca pagamento
    payment_dict = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado"
        )
    
    # Verifica se é cliente dono
    if payment_dict["client_id"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para liberar este pagamento"
        )
    
    # Verifica se pagamento está retido
    if payment_dict["status"] != "held":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pagamento não está em estado de escrow"
        )
    
    # Captura pagamento no Stripe
    stripe_result = await payment_service.capture_payment(
        payment_dict["stripe_payment_intent_id"],
        payment_dict["valor_total"]
    )
    
    if not stripe_result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao capturar pagamento: {stripe_result['error']}"
        )
    
    # Atualiza pagamento
    await db.payments.update_one(
        {"id": payment_id},
        {"$set": {
            "status": "released",
            "released_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Atualiza job para completo
    await db.jobs.update_one(
        {"id": payment_dict["job_id"]},
        {"$set": {
            "status": "completed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log de transação
    transaction_log = TransactionLog(
        payment_id=payment_id,
        action="release",
        user_id=user["sub"],
        details={
            "captured_at": stripe_result["captured_at"].isoformat()
        }
    )
    
    transaction_dict = transaction_log.model_dump()
    transaction_dict['created_at'] = transaction_dict['created_at'].isoformat()
    
    await db.transaction_logs.insert_one(transaction_dict)
    
    # 🔔 Envia notificação para o videomaker sobre pagamento liberado
    await notify_payment_released(db, payment_id)
    
    # 🔔 Envia notificação para o cliente sobre job concluído
    await notify_job_completed(db, payment_dict["job_id"])
    
    return {
        "success": True,
        "message": "Pagamento liberado para o videomaker",
        "valor_videomaker": payment_dict["valor_videomaker"]
    }

@router.post("/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    user: dict = Depends(get_current_user)
):
    """Reembolsa pagamento"""
    
    # Busca pagamento
    payment_dict = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado"
        )
    
    # Admin ou cliente podem reembolsar
    if user.get("role") != "admin" and payment_dict["client_id"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para reembolsar este pagamento"
        )
    
    # Verifica se pagamento pode ser reembolsado
    if payment_dict["status"] == "refunded":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pagamento já foi reembolsado"
        )
    
    # Reembolsa no Stripe
    stripe_result = await payment_service.refund_payment(
        payment_dict["stripe_payment_intent_id"],
        payment_dict["valor_total"]
    )
    
    if not stripe_result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao reembolsar: {stripe_result['error']}"
        )
    
    # Atualiza pagamento
    await db.payments.update_one(
        {"id": payment_id},
        {"$set": {
            "status": "refunded",
            "refunded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Atualiza job
    await db.jobs.update_one(
        {"id": payment_dict["job_id"]},
        {"$set": {
            "status": "cancelled",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log de transação
    transaction_log = TransactionLog(
        payment_id=payment_id,
        action="refund",
        user_id=user["sub"],
        details={
            "refund_id": stripe_result["refund_id"],
            "refunded_at": stripe_result["refunded_at"].isoformat()
        }
    )
    
    transaction_dict = transaction_log.model_dump()
    transaction_dict['created_at'] = transaction_dict['created_at'].isoformat()
    
    await db.transaction_logs.insert_one(transaction_dict)
    
    return {
        "success": True,
        "message": "Pagamento reembolsado com sucesso"
    }

@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment_status(
    payment_id: str,
    user: dict = Depends(get_current_user)
):
    """Consulta status de um pagamento"""
    
    payment_dict = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado"
        )
    
    # Verifica permissão
    if (user.get("role") not in ["admin"] and 
        payment_dict["client_id"] != user["sub"] and 
        payment_dict["videomaker_id"] != user["sub"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para ver este pagamento"
        )
    
    return PaymentResponse(
        id=payment_dict["id"],
        job_id=payment_dict["job_id"],
        client_id=payment_dict["client_id"],
        videomaker_id=payment_dict["videomaker_id"],
        valor_total=payment_dict["valor_total"],
        comissao_plataforma=payment_dict["comissao_plataforma"],
        valor_videomaker=payment_dict["valor_videomaker"],
        status=payment_dict["status"],
        created_at=datetime.fromisoformat(payment_dict["created_at"]) if isinstance(payment_dict["created_at"], str) else payment_dict["created_at"]
    )
