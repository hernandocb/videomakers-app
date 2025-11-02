from models.security import AuditLog
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class AuditService:
    """Serviço para registro de logs de auditoria"""
    
    @staticmethod
    async def log(
        db,
        user_id: str,
        user_email: str,
        user_role: str,
        action: str,
        resource: str,
        resource_id: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = "success",
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Registra uma ação no audit trail
        
        Args:
            db: Database connection
            user_id: ID do usuário
            user_email: Email do usuário
            user_role: Role do usuário
            action: Tipo de ação (create, update, delete, read, login, logout)
            resource: Recurso afetado (user, job, payment, config, etc)
            resource_id: ID do recurso
            changes: Dicionário com before/after das mudanças
            ip_address: IP do usuário
            user_agent: User agent
            status: success ou failed
            error_message: Mensagem de erro se falhou
            metadata: Metadados adicionais
        """
        try:
            audit_log = AuditLog(
                user_id=user_id,
                user_email=user_email,
                user_role=user_role,
                action=action,
                resource=resource,
                resource_id=resource_id,
                changes=changes,
                ip_address=ip_address,
                user_agent=user_agent,
                status=status,
                error_message=error_message,
                metadata=metadata
            )
            
            log_dict = audit_log.model_dump()
            log_dict['created_at'] = log_dict['created_at'].isoformat()
            
            await db.audit_logs.insert_one(log_dict)
            
            logger.info(
                f"Audit log created: {user_email} ({user_role}) {action} {resource} "
                f"{resource_id or ''} - {status}"
            )
            
        except Exception as e:
            logger.error(f"Failed to create audit log: {str(e)}")
            # Não lança exceção para não quebrar a operação principal


class BackupService:
    """Serviço para backup automático"""
    
    @staticmethod
    async def create_backup(db, backup_type: str = "full"):
        """
        Cria backup do banco de dados
        
        Args:
            db: Database connection
            backup_type: full ou incremental
        """
        import subprocess
        from datetime import datetime
        import os
        
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_dir = "/tmp/backups"
            os.makedirs(backup_dir, exist_ok=True)
            
            backup_file = f"{backup_dir}/backup_{timestamp}.gz"
            
            # Comando mongodump
            cmd = [
                "mongodump",
                "--uri=mongodb://localhost:27017",
                "--db=test_database",
                f"--archive={backup_file}",
                "--gzip"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                # Salva metadata do backup no banco
                backup_metadata = {
                    "id": str(uuid.uuid4()),
                    "filename": backup_file,
                    "type": backup_type,
                    "size_bytes": os.path.getsize(backup_file),
                    "status": "completed",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.backups.insert_one(backup_metadata)
                
                logger.info(f"Backup created successfully: {backup_file}")
                return backup_metadata
            else:
                logger.error(f"Backup failed: {result.stderr}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating backup: {str(e)}")
            return None


class LGPDService:
    """Serviço para compliance LGPD"""
    
    @staticmethod
    async def export_user_data(db, user_id: str):
        """
        Exporta todos os dados do usuário (LGPD Art. 18)
        
        Args:
            db: Database connection
            user_id: ID do usuário
        
        Returns:
            Dict com todos os dados do usuário
        """
        try:
            # Busca dados do usuário
            user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
            
            if not user:
                return None
            
            # Busca jobs criados (se cliente)
            jobs = await db.jobs.find({"client_id": user_id}, {"_id": 0}).to_list(1000)
            
            # Busca propostas enviadas (se videomaker)
            proposals = await db.proposals.find({"videomaker_id": user_id}, {"_id": 0}).to_list(1000)
            
            # Busca pagamentos
            payments = await db.payments.find(
                {"$or": [{"client_id": user_id}, {"videomaker_id": user_id}]},
                {"_id": 0}
            ).to_list(1000)
            
            # Busca avaliações
            ratings = await db.ratings.find(
                {"$or": [{"avaliador_id": user_id}, {"avaliado_id": user_id}]},
                {"_id": 0}
            ).to_list(1000)
            
            # Busca mensagens de chat
            chats = await db.chats.find(
                {"$or": [{"client_id": user_id}, {"videomaker_id": user_id}]},
                {"_id": 0}
            ).to_list(1000)
            
            messages = []
            for chat in chats:
                chat_messages = await db.messages.find(
                    {"chat_id": chat["id"]},
                    {"_id": 0}
                ).to_list(10000)
                messages.extend(chat_messages)
            
            # Compila todos os dados
            export_data = {
                "export_date": datetime.now(timezone.utc).isoformat(),
                "user_id": user_id,
                "personal_data": user,
                "jobs": jobs,
                "proposals": proposals,
                "payments": payments,
                "ratings": ratings,
                "chats": chats,
                "messages": messages,
                "data_categories": {
                    "personal_info": ["nome", "email", "telefone", "cidade", "estado"],
                    "professional_info": ["portfolio_videos", "rating_medio", "total_avaliacoes"],
                    "financial_data": ["payments"],
                    "communication_data": ["messages", "chats"],
                    "usage_data": ["jobs", "proposals", "ratings"]
                }
            }
            
            return export_data
            
        except Exception as e:
            logger.error(f"Error exporting user data: {str(e)}")
            return None
    
    @staticmethod
    async def delete_user_account(db, user_id: str):
        """
        Deleta conta e todos dados relacionados (LGPD Art. 18)
        
        Args:
            db: Database connection
            user_id: ID do usuário
        
        Returns:
            Dict com resultado da operação
        """
        try:
            deleted_count = {
                "user": 0,
                "jobs": 0,
                "proposals": 0,
                "payments": 0,
                "ratings": 0,
                "chats": 0,
                "messages": 0,
                "device_tokens": 0,
                "verification": 0,
                "2fa": 0
            }
            
            # Deleta usuário
            result = await db.users.delete_one({"id": user_id})
            deleted_count["user"] = result.deleted_count
            
            # Deleta jobs criados
            result = await db.jobs.delete_many({"client_id": user_id})
            deleted_count["jobs"] = result.deleted_count
            
            # Deleta propostas
            result = await db.proposals.delete_many({"videomaker_id": user_id})
            deleted_count["proposals"] = result.deleted_count
            
            # Anonimiza pagamentos (mantém para histórico financeiro)
            await db.payments.update_many(
                {"$or": [{"client_id": user_id}, {"videomaker_id": user_id}]},
                {"$set": {
                    "client_id": "DELETED_USER",
                    "videomaker_id": "DELETED_USER"
                }}
            )
            
            # Deleta avaliações
            result = await db.ratings.delete_many(
                {"$or": [{"avaliador_id": user_id}, {"avaliado_id": user_id}]}
            )
            deleted_count["ratings"] = result.deleted_count
            
            # Deleta chats
            chats = await db.chats.find(
                {"$or": [{"client_id": user_id}, {"videomaker_id": user_id}]},
                {"_id": 0, "id": 1}
            ).to_list(1000)
            
            chat_ids = [chat["id"] for chat in chats]
            
            if chat_ids:
                result = await db.messages.delete_many({"chat_id": {"$in": chat_ids}})
                deleted_count["messages"] = result.deleted_count
                
                result = await db.chats.delete_many({"id": {"$in": chat_ids}})
                deleted_count["chats"] = result.deleted_count
            
            # Deleta device tokens
            result = await db.device_tokens.delete_many({"user_id": user_id})
            deleted_count["device_tokens"] = result.deleted_count
            
            # Deleta verificação de identidade
            result = await db.identity_verifications.delete_many({"user_id": user_id})
            deleted_count["verification"] = result.deleted_count
            
            # Deleta 2FA
            result = await db.two_factor_secrets.delete_many({"user_id": user_id})
            deleted_count["2fa"] = result.deleted_count
            
            logger.info(f"User account deleted: {user_id} - {deleted_count}")
            
            return {
                "success": True,
                "deleted_count": deleted_count,
                "message": "Conta e todos dados relacionados foram deletados com sucesso"
            }
            
        except Exception as e:
            logger.error(f"Error deleting user account: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


import uuid
