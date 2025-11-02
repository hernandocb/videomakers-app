import firebase_admin
from firebase_admin import credentials, messaging
import os
import logging
from typing import List, Optional, Dict
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class NotificationService:
    """Serviço para envio de notificações push via Firebase Cloud Messaging"""
    
    _initialized = False
    
    @classmethod
    def initialize(cls):
        """Inicializa Firebase Admin SDK"""
        if cls._initialized:
            return
        
        try:
            # Verifica se já existe uma app inicializada
            firebase_admin.get_app()
            cls._initialized = True
            logger.info("Firebase já inicializado")
        except ValueError:
            # Inicializa com credenciais do ambiente ou service account
            firebase_credentials_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
            
            if firebase_credentials_path and os.path.exists(firebase_credentials_path):
                cred = credentials.Certificate(firebase_credentials_path)
                firebase_admin.initialize_app(cred)
                cls._initialized = True
                logger.info("Firebase inicializado com credenciais do arquivo")
            else:
                # Modo de desenvolvimento sem credenciais reais
                logger.warning("Firebase não configurado - notificações desabilitadas no modo dev")
                cls._initialized = False
    
    @classmethod
    async def send_notification(
        cls,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        image_url: Optional[str] = None
    ) -> bool:
        """
        Envia notificação push para um dispositivo específico
        
        Args:
            token: Device token do usuário
            title: Título da notificação
            body: Corpo da mensagem
            data: Dados adicionais (opcional)
            image_url: URL da imagem (opcional)
        
        Returns:
            bool: True se enviado com sucesso, False caso contrário
        """
        cls.initialize()
        
        if not cls._initialized:
            logger.warning(f"Notificação não enviada (Firebase não configurado): {title}")
            return False
        
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                    image=image_url
                ),
                data=data or {},
                token=token,
                android=messaging.AndroidConfig(
                    priority='high',
                    notification=messaging.AndroidNotification(
                        sound='default',
                        color='#0E76FF'
                    )
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound='default',
                            badge=1
                        )
                    )
                )
            )
            
            response = messaging.send(message)
            logger.info(f"Notificação enviada com sucesso: {response}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao enviar notificação: {str(e)}")
            return False
    
    @classmethod
    async def send_notification_to_multiple(
        cls,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict] = None
    ) -> Dict[str, int]:
        """
        Envia notificação para múltiplos dispositivos
        
        Args:
            tokens: Lista de device tokens
            title: Título da notificação
            body: Corpo da mensagem
            data: Dados adicionais (opcional)
        
        Returns:
            Dict com estatísticas de envio (success_count, failure_count)
        """
        cls.initialize()
        
        if not cls._initialized:
            logger.warning(f"Notificações não enviadas (Firebase não configurado)")
            return {"success_count": 0, "failure_count": len(tokens)}
        
        if not tokens:
            return {"success_count": 0, "failure_count": 0}
        
        try:
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {},
                tokens=tokens,
                android=messaging.AndroidConfig(priority='high'),
            )
            
            response = messaging.send_multicast(message)
            
            logger.info(
                f"Notificações enviadas: {response.success_count} sucesso, "
                f"{response.failure_count} falhas"
            )
            
            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count
            }
            
        except Exception as e:
            logger.error(f"Erro ao enviar notificações em lote: {str(e)}")
            return {"success_count": 0, "failure_count": len(tokens)}
    
    @classmethod
    async def send_notification_to_topic(
        cls,
        topic: str,
        title: str,
        body: str,
        data: Optional[Dict] = None
    ) -> bool:
        """
        Envia notificação para um tópico (broadcast)
        
        Args:
            topic: Nome do tópico
            title: Título da notificação
            body: Corpo da mensagem
            data: Dados adicionais (opcional)
        
        Returns:
            bool: True se enviado com sucesso
        """
        cls.initialize()
        
        if not cls._initialized:
            logger.warning(f"Notificação de tópico não enviada (Firebase não configurado)")
            return False
        
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {},
                topic=topic
            )
            
            response = messaging.send(message)
            logger.info(f"Notificação de tópico enviada: {response}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao enviar notificação de tópico: {str(e)}")
            return False


# Funções auxiliares para notificações específicas do negócio

async def notify_new_proposal(db, proposal_id: str):
    """Notifica cliente sobre nova proposta recebida"""
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        return
    
    job = await db.jobs.find_one({"id": proposal["job_id"]}, {"_id": 0})
    if not job:
        return
    
    videomaker = await db.users.find_one({"id": proposal["videomaker_id"]}, {"_id": 0})
    client = await db.users.find_one({"id": job["client_id"]}, {"_id": 0})
    
    if client and client.get("device_token"):
        await NotificationService.send_notification(
            token=client["device_token"],
            title="🎬 Nova Proposta Recebida!",
            body=f"{videomaker.get('nome', 'Um videomaker')} enviou uma proposta de R$ {proposal['valor_proposto']:.2f}",
            data={
                "type": "new_proposal",
                "proposal_id": proposal_id,
                "job_id": job["id"],
                "screen": "ProposalsScreen"
            }
        )


async def notify_proposal_accepted(db, proposal_id: str):
    """Notifica videomaker que sua proposta foi aceita"""
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        return
    
    job = await db.jobs.find_one({"id": proposal["job_id"]}, {"_id": 0})
    videomaker = await db.users.find_one({"id": proposal["videomaker_id"]}, {"_id": 0})
    
    if videomaker and videomaker.get("device_token"):
        await NotificationService.send_notification(
            token=videomaker["device_token"],
            title="🎉 Proposta Aceita!",
            body=f"Sua proposta para '{job.get('titulo', 'o job')}' foi aceita!",
            data={
                "type": "proposal_accepted",
                "proposal_id": proposal_id,
                "job_id": job["id"],
                "screen": "MyJobsScreen"
            }
        )


async def notify_proposal_rejected(db, proposal_id: str):
    """Notifica videomaker que sua proposta foi rejeitada"""
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        return
    
    job = await db.jobs.find_one({"id": proposal["job_id"]}, {"_id": 0})
    videomaker = await db.users.find_one({"id": proposal["videomaker_id"]}, {"_id": 0})
    
    if videomaker and videomaker.get("device_token"):
        await NotificationService.send_notification(
            token=videomaker["device_token"],
            title="❌ Proposta Não Aceita",
            body=f"Sua proposta para '{job.get('titulo', 'o job')}' não foi selecionada desta vez.",
            data={
                "type": "proposal_rejected",
                "proposal_id": proposal_id,
                "job_id": job["id"]
            }
        )


async def notify_new_message(db, chat_id: str, sender_id: str, message_content: str):
    """Notifica sobre nova mensagem no chat"""
    chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        return
    
    # Encontra o destinatário (não é o remetente)
    recipient_id = chat["client_id"] if chat["videomaker_id"] == sender_id else chat["videomaker_id"]
    
    sender = await db.users.find_one({"id": sender_id}, {"_id": 0})
    recipient = await db.users.find_one({"id": recipient_id}, {"_id": 0})
    
    if recipient and recipient.get("device_token"):
        # Truncar mensagem se muito longa
        preview = message_content[:50] + "..." if len(message_content) > 50 else message_content
        
        await NotificationService.send_notification(
            token=recipient["device_token"],
            title=f"💬 {sender.get('nome', 'Alguém')}",
            body=preview,
            data={
                "type": "new_message",
                "chat_id": chat_id,
                "sender_id": sender_id,
                "screen": "ChatScreen"
            }
        )


async def notify_payment_released(db, payment_id: str):
    """Notifica videomaker que o pagamento foi liberado"""
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        return
    
    videomaker = await db.users.find_one({"id": payment["videomaker_id"]}, {"_id": 0})
    
    if videomaker and videomaker.get("device_token"):
        await NotificationService.send_notification(
            token=videomaker["device_token"],
            title="💰 Pagamento Liberado!",
            body=f"Você recebeu R$ {payment['valor_videomaker']:.2f}",
            data={
                "type": "payment_released",
                "payment_id": payment_id,
                "amount": str(payment["valor_videomaker"])
            }
        )


async def notify_job_completed(db, job_id: str):
    """Notifica cliente que o job foi marcado como concluído"""
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        return
    
    client = await db.users.find_one({"id": job["client_id"]}, {"_id": 0})
    
    if client and client.get("device_token"):
        await NotificationService.send_notification(
            token=client["device_token"],
            title="✅ Job Concluído!",
            body=f"O job '{job.get('titulo', 'seu job')}' foi marcado como concluído. Avalie o videomaker!",
            data={
                "type": "job_completed",
                "job_id": job_id,
                "screen": "RatingScreen"
            }
        )
