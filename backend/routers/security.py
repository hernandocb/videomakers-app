from fastapi import APIRouter, HTTPException, status, Depends, Request, UploadFile, File
from middleware.auth_middleware import get_current_user, require_role
from models.security import (
    AuditLogResponse, TwoFactorSetup, TwoFactorVerify, 
    AccountDeletion, IdentityVerification
)
from services.security_service import AuditService, LGPDService
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import pyotp
import qrcode
import io
import base64
import secrets
import json

router = APIRouter(prefix="/security", tags=["Security"])

from server import db

async def admin_only(user: dict = Depends(get_current_user)):
    """Middleware para verificar se é admin"""
    await require_role(user, ["admin"])
    return user


# ==================== AUDIT TRAIL ====================

@router.get("/audit-logs", dependencies=[Depends(admin_only)])
async def get_audit_logs(
    limit: int = 100,
    action: Optional[str] = None,
    resource: Optional[str] = None,
    user_email: Optional[str] = None,
    admin_user: dict = Depends(admin_only)
):
    """Lista logs de auditoria (Admin only)"""
    
    query = {}
    if action:
        query["action"] = action
    if resource:
        query["resource"] = resource
    if user_email:
        query["user_email"] = {"$regex": user_email, "$options": "i"}
    
    logs = await db.audit_logs.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "logs": logs,
        "total": len(logs)
    }


@router.get("/audit-logs/export", dependencies=[Depends(admin_only)])
async def export_audit_logs(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin_user: dict = Depends(admin_only)
):
    """Exporta logs de auditoria em JSON (Admin only)"""
    
    query = {}
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    logs = await db.audit_logs.find(query, {"_id": 0}).to_list(10000)
    
    # Log da exportação
    await AuditService.log(
        db=db,
        user_id=admin_user["sub"],
        user_email=admin_user["email"],
        user_role=admin_user["role"],
        action="export",
        resource="audit_logs",
        status="success",
        metadata={"total_logs": len(logs)}
    )
    
    return {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "total_logs": len(logs),
        "logs": logs
    }


# ==================== 2FA (Two-Factor Authentication) ====================

@router.post("/2fa/setup", response_model=TwoFactorSetup)
async def setup_2fa(user: dict = Depends(get_current_user)):
    """Setup 2FA para o usuário"""
    
    user_id = user["sub"]
    
    # Verifica se já tem 2FA ativo
    existing = await db.two_factor_secrets.find_one({"user_id": user_id, "enabled": True})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA já está ativo"
        )
    
    # Gera secret
    secret = pyotp.random_base32()
    
    # Gera códigos de backup (8 códigos de 8 dígitos)
    backup_codes = [secrets.token_hex(4).upper() for _ in range(8)]
    
    # Gera QR Code
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=user["email"],
        issuer_name="VideoConnect"
    )
    
    # Cria imagem QR Code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Converte para base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_code_base64 = base64.b64encode(buffered.getvalue()).decode()
    
    # Salva no banco (ainda não habilitado)
    two_factor_doc = {
        "id": str(pyotp.random_base32()),
        "user_id": user_id,
        "secret": secret,
        "backup_codes": backup_codes,
        "enabled": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.two_factor_secrets.update_one(
        {"user_id": user_id},
        {"$set": two_factor_doc},
        upsert=True
    )
    
    return TwoFactorSetup(
        secret=secret,
        qr_code=f"data:image/png;base64,{qr_code_base64}",
        backup_codes=backup_codes
    )


@router.post("/2fa/enable")
async def enable_2fa(
    verification: TwoFactorVerify,
    user: dict = Depends(get_current_user)
):
    """Ativa 2FA após validar código"""
    
    user_id = user["sub"]
    
    # Busca secret
    two_factor = await db.two_factor_secrets.find_one({"user_id": user_id})
    if not two_factor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="2FA não configurado"
        )
    
    # Verifica código
    totp = pyotp.TOTP(two_factor["secret"])
    if not totp.verify(verification.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código inválido"
        )
    
    # Ativa 2FA
    await db.two_factor_secrets.update_one(
        {"user_id": user_id},
        {"$set": {"enabled": True}}
    )
    
    # Atualiza usuário
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"two_factor_enabled": True}}
    )
    
    # Log
    await AuditService.log(
        db=db,
        user_id=user_id,
        user_email=user["email"],
        user_role=user["role"],
        action="enable",
        resource="2fa",
        status="success"
    )
    
    return {"success": True, "message": "2FA ativado com sucesso"}


@router.post("/2fa/verify")
async def verify_2fa_code(
    verification: TwoFactorVerify,
    user: dict = Depends(get_current_user)
):
    """Verifica código 2FA"""
    
    user_id = user["sub"]
    
    two_factor = await db.two_factor_secrets.find_one({"user_id": user_id, "enabled": True})
    if not two_factor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="2FA não ativo"
        )
    
    # Verifica código TOTP
    totp = pyotp.TOTP(two_factor["secret"])
    if totp.verify(verification.code):
        await db.two_factor_secrets.update_one(
            {"user_id": user_id},
            {"$set": {"last_used": datetime.now(timezone.utc).isoformat()}}
        )
        return {"valid": True}
    
    # Verifica se é código de backup
    if verification.code.upper() in two_factor["backup_codes"]:
        # Remove código usado
        await db.two_factor_secrets.update_one(
            {"user_id": user_id},
            {
                "$pull": {"backup_codes": verification.code.upper()},
                "$set": {"last_used": datetime.now(timezone.utc).isoformat()}
            }
        )
        return {"valid": True, "backup_code_used": True}
    
    return {"valid": False}


@router.post("/2fa/disable")
async def disable_2fa(user: dict = Depends(get_current_user)):
    """Desativa 2FA"""
    
    user_id = user["sub"]
    
    result = await db.two_factor_secrets.delete_one({"user_id": user_id})
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"two_factor_enabled": False}}
    )
    
    # Log
    await AuditService.log(
        db=db,
        user_id=user_id,
        user_email=user["email"],
        user_role=user["role"],
        action="disable",
        resource="2fa",
        status="success"
    )
    
    return {"success": True, "message": "2FA desativado"}


# ==================== LGPD COMPLIANCE ====================

@router.get("/lgpd/export-my-data")
async def export_my_data(user: dict = Depends(get_current_user)):
    """Exporta todos os dados do usuário (LGPD Art. 18)"""
    
    user_id = user["sub"]
    
    # Exporta dados
    export_data = await LGPDService.export_user_data(db, user_id)
    
    if not export_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # Cria registro de exportação
    export_record = {
        "request_id": str(secrets.token_hex(16)),
        "user_id": user_id,
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "status": "completed",
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.data_exports.insert_one(export_record)
    
    # Log
    await AuditService.log(
        db=db,
        user_id=user_id,
        user_email=user["email"],
        user_role=user["role"],
        action="export",
        resource="user_data",
        status="success"
    )
    
    return export_data


@router.delete("/lgpd/delete-my-account")
async def delete_my_account(
    deletion: AccountDeletion,
    user: dict = Depends(get_current_user)
):
    """Deleta conta e todos dados relacionados (LGPD Art. 18)"""
    
    if not deletion.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmação necessária"
        )
    
    user_id = user["sub"]
    
    # Deleta conta
    result = await LGPDService.delete_user_account(db, user_id)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"]
        )
    
    # Log (antes de deletar)
    await AuditService.log(
        db=db,
        user_id=user_id,
        user_email=user["email"],
        user_role=user["role"],
        action="delete",
        resource="account",
        status="success",
        metadata={"reason": deletion.reason}
    )
    
    return result


# ==================== IDENTITY VERIFICATION ====================

@router.post("/identity-verification/submit")
async def submit_identity_verification(
    document_type: str,
    document_number: str,
    document_front_url: str,
    document_back_url: Optional[str] = None,
    selfie_url: str = None,
    user: dict = Depends(get_current_user)
):
    """Submete documentos para verificação de identidade"""
    
    user_id = user["sub"]
    
    # Verifica se já tem verificação pendente ou aprovada
    existing = await db.identity_verifications.find_one({
        "user_id": user_id,
        "status": {"$in": ["pending", "approved"]}
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe uma verificação {existing['status']}"
        )
    
    verification_doc = {
        "id": str(secrets.token_hex(16)),
        "user_id": user_id,
        "document_type": document_type,
        "document_number": document_number,
        "document_front_url": document_front_url,
        "document_back_url": document_back_url,
        "selfie_url": selfie_url,
        "status": "pending",
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.identity_verifications.insert_one(verification_doc)
    
    # Log
    await AuditService.log(
        db=db,
        user_id=user_id,
        user_email=user["email"],
        user_role=user["role"],
        action="submit",
        resource="identity_verification",
        resource_id=verification_doc["id"],
        status="success"
    )
    
    return {
        "success": True,
        "verification_id": verification_doc["id"],
        "message": "Documentos submetidos para análise"
    }


@router.get("/identity-verification/status")
async def get_verification_status(user: dict = Depends(get_current_user)):
    """Verifica status da verificação de identidade"""
    
    verification = await db.identity_verifications.find_one(
        {"user_id": user["sub"]},
        {"_id": 0}
    )
    
    if not verification:
        return {"status": "not_submitted"}
    
    return verification


@router.put("/identity-verification/{verification_id}/review", dependencies=[Depends(admin_only)])
async def review_identity_verification(
    verification_id: str,
    approved: bool,
    rejection_reason: Optional[str] = None,
    admin_user: dict = Depends(admin_only)
):
    """Aprova ou rejeita verificação de identidade (Admin only)"""
    
    verification = await db.identity_verifications.find_one({"id": verification_id})
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verificação não encontrada"
        )
    
    new_status = "approved" if approved else "rejected"
    
    update_data = {
        "status": new_status,
        "reviewed_by": admin_user["sub"],
        "reviewed_at": datetime.now(timezone.utc).isoformat()
    }
    
    if not approved and rejection_reason:
        update_data["rejection_reason"] = rejection_reason
    
    await db.identity_verifications.update_one(
        {"id": verification_id},
        {"$set": update_data}
    )
    
    # Atualiza usuário
    if approved:
        await db.users.update_one(
            {"id": verification["user_id"]},
            {"$set": {"verificado": True}}
        )
    
    # Log
    await AuditService.log(
        db=db,
        user_id=admin_user["sub"],
        user_email=admin_user["email"],
        user_role=admin_user["role"],
        action="review",
        resource="identity_verification",
        resource_id=verification_id,
        status="success",
        metadata={"approved": approved, "user_affected": verification["user_id"]}
    )
    
    return {
        "success": True,
        "status": new_status,
        "message": f"Verificação {'aprovada' if approved else 'rejeitada'}"
    }
