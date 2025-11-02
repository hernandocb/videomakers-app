from fastapi import APIRouter, HTTPException, status, Depends
from middleware.auth_middleware import get_current_user, require_role
from models.notification import DeviceTokenCreate, NotificationCreate, BroadcastNotification
from services.notification_service import NotificationService
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/notifications", tags=["Notifications"])

from server import db

async def admin_only(user: dict = Depends(get_current_user)):
    """Middleware para verificar se é admin"""
    await require_role(user, ["admin"])
    return user


@router.post("/register-token")
async def register_device_token(
    token_data: DeviceTokenCreate,
    user: dict = Depends(get_current_user)
):
    """
    Registra ou atualiza o device token do usuário para receber notificações push
    """
    user_id = user["sub"]
    
    # Verifica se usuário já tem token registrado
    existing_token = await db.device_tokens.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    token_doc = {
        "id": existing_token["id"] if existing_token else str(uuid.uuid4()),
        "user_id": user_id,
        "device_token": token_data.device_token,
        "platform": token_data.platform,
        "device_info": token_data.device_info or {},
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "active": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert: atualiza se existe, cria se não existe
    await db.device_tokens.update_one(
        {"user_id": user_id},
        {"$set": token_doc},
        upsert=True
    )
    
    # Também atualiza o campo device_token no documento do usuário (para acesso rápido)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"device_token": token_data.device_token}}
    )
    
    return {
        "success": True,
        "message": "Device token registrado com sucesso",
        "token_id": token_doc["id"]
    }


@router.delete("/unregister-token")
async def unregister_device_token(user: dict = Depends(get_current_user)):
    """
    Remove o device token do usuário (quando faz logout ou desinstala o app)
    """
    user_id = user["sub"]
    
    await db.device_tokens.update_one(
        {"user_id": user_id},
        {"$set": {"active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.users.update_one(
        {"id": user_id},
        {"$unset": {"device_token": ""}}
    )
    
    return {
        "success": True,
        "message": "Device token removido com sucesso"
    }


@router.post("/send", dependencies=[Depends(admin_only)])
async def send_notification_manual(
    notification: NotificationCreate,
    admin_user: dict = Depends(admin_only)
):
    """
    Envia notificação manual para usuários específicos (Admin only)
    """
    if not notification.user_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lista de user_ids é obrigatória. Use /broadcast para enviar para todos"
        )
    
    # Busca device tokens dos usuários
    users = await db.users.find(
        {"id": {"$in": notification.user_ids}},
        {"_id": 0, "id": 1, "device_token": 1}
    ).to_list(1000)
    
    tokens = [u["device_token"] for u in users if u.get("device_token")]
    
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum usuário com device token encontrado"
        )
    
    # Envia notificações
    result = await NotificationService.send_notification_to_multiple(
        tokens=tokens,
        title=notification.title,
        body=notification.body,
        data=notification.data
    )
    
    # Log da notificação
    log_doc = {
        "id": str(uuid.uuid4()),
        "user_ids": notification.user_ids,
        "title": notification.title,
        "body": notification.body,
        "data": notification.data,
        "sent_by": admin_user["sub"],
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "success_count": result["success_count"],
        "failure_count": result["failure_count"]
    }
    
    await db.notification_logs.insert_one(log_doc)
    
    return {
        "success": True,
        "message": f"Notificação enviada para {result['success_count']} usuários",
        "details": result
    }


@router.post("/broadcast", dependencies=[Depends(admin_only)])
async def send_broadcast_notification(
    broadcast: BroadcastNotification,
    admin_user: dict = Depends(admin_only)
):
    """
    Envia notificação broadcast para todos os usuários ou filtrado por role (Admin only)
    """
    # Busca usuários
    query = {}
    if broadcast.role:
        query["role"] = broadcast.role
    
    users = await db.users.find(
        query,
        {"_id": 0, "id": 1, "device_token": 1}
    ).to_list(10000)
    
    tokens = [u["device_token"] for u in users if u.get("device_token")]
    
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum usuário com device token encontrado"
        )
    
    # Envia notificações em lote (Firebase suporta até 500 por vez)
    total_success = 0
    total_failure = 0
    
    batch_size = 500
    for i in range(0, len(tokens), batch_size):
        batch_tokens = tokens[i:i + batch_size]
        result = await NotificationService.send_notification_to_multiple(
            tokens=batch_tokens,
            title=broadcast.title,
            body=broadcast.body,
            data=broadcast.data
        )
        total_success += result["success_count"]
        total_failure += result["failure_count"]
    
    # Log da notificação broadcast
    log_doc = {
        "id": str(uuid.uuid4()),
        "type": "broadcast",
        "role_filter": broadcast.role,
        "title": broadcast.title,
        "body": broadcast.body,
        "data": broadcast.data,
        "sent_by": admin_user["sub"],
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "total_recipients": len(tokens),
        "success_count": total_success,
        "failure_count": total_failure
    }
    
    await db.notification_logs.insert_one(log_doc)
    
    return {
        "success": True,
        "message": f"Broadcast enviado para {total_success} de {len(tokens)} usuários",
        "details": {
            "total_recipients": len(tokens),
            "success_count": total_success,
            "failure_count": total_failure
        }
    }


@router.get("/logs", dependencies=[Depends(admin_only)])
async def get_notification_logs(
    limit: int = 50,
    admin_user: dict = Depends(admin_only)
):
    """
    Lista logs de notificações enviadas (Admin only)
    """
    logs = await db.notification_logs.find(
        {},
        {"_id": 0}
    ).sort("sent_at", -1).limit(limit).to_list(limit)
    
    return {
        "logs": logs,
        "total": len(logs)
    }


@router.get("/stats", dependencies=[Depends(admin_only)])
async def get_notification_stats(admin_user: dict = Depends(admin_only)):
    """
    Estatísticas de notificações (Admin only)
    """
    # Total de device tokens ativos
    total_tokens = await db.device_tokens.count_documents({"active": True})
    
    # Tokens por plataforma
    android_tokens = await db.device_tokens.count_documents({"active": True, "platform": "android"})
    ios_tokens = await db.device_tokens.count_documents({"active": True, "platform": "ios"})
    
    # Total de notificações enviadas (últimos 30 dias)
    from datetime import timedelta
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    recent_logs = await db.notification_logs.find(
        {"sent_at": {"$gte": thirty_days_ago}},
        {"_id": 0}
    ).to_list(10000)
    
    total_sent = sum(log.get("success_count", 0) for log in recent_logs)
    total_failed = sum(log.get("failure_count", 0) for log in recent_logs)
    
    return {
        "device_tokens": {
            "total": total_tokens,
            "android": android_tokens,
            "ios": ios_tokens
        },
        "last_30_days": {
            "notifications_sent": total_sent,
            "notifications_failed": total_failed,
            "success_rate": round((total_sent / (total_sent + total_failed) * 100), 2) if (total_sent + total_failed) > 0 else 0
        }
    }
