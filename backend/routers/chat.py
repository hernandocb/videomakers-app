from fastapi import APIRouter, HTTPException, status, Depends, WebSocket, WebSocketDisconnect, UploadFile, File
from middleware.auth_middleware import get_current_user
from models.chat import MessageCreate, Message, MessageResponse
from services.storage_service import StorageService
from utils.validators import contains_blocked_content
from typing import List, Dict
from datetime import datetime, timezone
import json

router = APIRouter(prefix="/chat", tags=["Chat"])

from server import db

storage_service = StorageService(db)

# Gerenciador de conexões WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, chat_id: str):
        await websocket.accept()
        if chat_id not in self.active_connections:
            self.active_connections[chat_id] = []
        self.active_connections[chat_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, chat_id: str):
        if chat_id in self.active_connections:
            self.active_connections[chat_id].remove(websocket)
            if not self.active_connections[chat_id]:
                del self.active_connections[chat_id]
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast(self, message: str, chat_id: str):
        if chat_id in self.active_connections:
            for connection in self.active_connections[chat_id]:
                await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/{chat_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: str):
    """WebSocket para chat em tempo real"""
    
    await manager.connect(websocket, chat_id)
    
    try:
        while True:
            # Recebe mensagem do cliente
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Verifica chat
            chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
            if not chat:
                await manager.send_personal_message(
                    json.dumps({"error": "Chat não encontrado"}),
                    websocket
                )
                continue
            
            # Valida que sender é participante
            sender_id = message_data.get("sender_id")
            if sender_id not in [chat["client_id"], chat["videomaker_id"]]:
                await manager.send_personal_message(
                    json.dumps({"error": "Você não é participante deste chat"}),
                    websocket
                )
                continue
            
            # Moderação de conteúdo
            content = message_data.get("content", "")
            is_blocked, blocked_reason = contains_blocked_content(content)
            
            # Cria mensagem
            message = Message(
                chat_id=chat_id,
                sender_id=sender_id,
                content=content,
                attachments=message_data.get("attachments", []),
                blocked=is_blocked,
                blocked_reason=blocked_reason
            )
            
            # Salva no banco
            message_dict = message.model_dump()
            message_dict['created_at'] = message_dict['created_at'].isoformat()
            
            await db.messages.insert_one(message_dict)
            
            # Se bloqueada, notifica apenas remetente
            if is_blocked:
                await manager.send_personal_message(
                    json.dumps({
                        "type": "blocked",
                        "message": "Mensagem bloqueada",
                        "reason": blocked_reason,
                        "hint": "Não é permitido compartilhar números, emails ou links"
                    }),
                    websocket
                )
                
                # Log de moderação
                await db.moderation_logs.insert_one({
                    "chat_id": chat_id,
                    "message_id": message.id,
                    "sender_id": sender_id,
                    "reason": blocked_reason,
                    "content": content,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            else:
                # Envia para todos no chat
                response = {
                    "type": "message",
                    "data": {
                        "id": message.id,
                        "chat_id": message.chat_id,
                        "sender_id": message.sender_id,
                        "content": message.content,
                        "attachments": message.attachments,
                        "created_at": message.created_at.isoformat()
                    }
                }
                await manager.broadcast(json.dumps(response), chat_id)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, chat_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, chat_id)

@router.post("/message", response_model=MessageResponse)
async def send_message(
    message_data: MessageCreate,
    user: dict = Depends(get_current_user)
):
    """Envia mensagem via HTTP (alternativa ao WebSocket)"""
    
    # Verifica chat
    chat = await db.chats.find_one({"id": message_data.chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat não encontrado"
        )
    
    # Verifica se usuário é participante
    if user["sub"] not in [chat["client_id"], chat["videomaker_id"]]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não é participante deste chat"
        )
    
    # Moderação
    is_blocked, blocked_reason = contains_blocked_content(message_data.content)
    
    if is_blocked:
        # Log de moderação
        await db.moderation_logs.insert_one({
            "chat_id": message_data.chat_id,
            "sender_id": user["sub"],
            "reason": blocked_reason,
            "content": message_data.content,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mensagem bloqueada: não é permitido compartilhar {blocked_reason}"
        )
    
    # Cria mensagem
    message = Message(
        chat_id=message_data.chat_id,
        sender_id=user["sub"],
        content=message_data.content,
        attachments=message_data.attachments
    )
    
    # Salva no banco
    message_dict = message.model_dump()
    message_dict['created_at'] = message_dict['created_at'].isoformat()
    
    await db.messages.insert_one(message_dict)
    
    return MessageResponse(
        id=message.id,
        chat_id=message.chat_id,
        sender_id=message.sender_id,
        content=message.content,
        attachments=message.attachments,
        blocked=message.blocked,
        blocked_reason=message.blocked_reason,
        created_at=message.created_at,
        read_at=message.read_at
    )

@router.get("/{chat_id}/messages", response_model=List[MessageResponse])
async def get_chat_messages(
    chat_id: str,
    user: dict = Depends(get_current_user)
):
    """Obtém histórico de mensagens de um chat"""
    
    # Verifica chat
    chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat não encontrado"
        )
    
    # Verifica se usuário é participante
    if user["sub"] not in [chat["client_id"], chat["videomaker_id"]]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não é participante deste chat"
        )
    
    # Busca mensagens (exceto bloqueadas)
    messages = await db.messages.find(
        {"chat_id": chat_id, "blocked": False},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    response = []
    for msg_dict in messages:
        response.append(MessageResponse(
            id=msg_dict["id"],
            chat_id=msg_dict["chat_id"],
            sender_id=msg_dict["sender_id"],
            content=msg_dict["content"],
            attachments=msg_dict.get("attachments", []),
            blocked=msg_dict.get("blocked", False),
            blocked_reason=msg_dict.get("blocked_reason"),
            created_at=datetime.fromisoformat(msg_dict["created_at"]) if isinstance(msg_dict["created_at"], str) else msg_dict["created_at"],
            read_at=datetime.fromisoformat(msg_dict["read_at"]) if msg_dict.get("read_at") and isinstance(msg_dict["read_at"], str) else msg_dict.get("read_at")
        ))
    
    return response

@router.post("/attachment")
async def upload_attachment(
    chat_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload de arquivo para chat"""
    
    # Verifica chat
    chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat não encontrado"
        )
    
    # Verifica se usuário é participante
    if user["sub"] not in [chat["client_id"], chat["videomaker_id"]]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não é participante deste chat"
        )
    
    # Faz upload
    file_id = await storage_service.upload_file(
        file,
        metadata={"chat_id": chat_id, "sender_id": user["sub"], "type": "attachment"}
    )
    
    return {
        "success": True,
        "file_id": file_id,
        "message": "Arquivo enviado"
    }

@router.get("/my-chats")
async def get_my_chats(user: dict = Depends(get_current_user)):
    """Lista todos os chats do usuário"""
    
    # Busca chats onde usuário é participante
    query = {
        "$or": [
            {"client_id": user["sub"]},
            {"videomaker_id": user["sub"]}
        ]
    }
    
    chats = await db.chats.find(query, {"_id": 0}).to_list(1000)
    
    # Para cada chat, busca última mensagem
    result = []
    for chat in chats:
        last_message = await db.messages.find_one(
            {"chat_id": chat["id"]},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        # Busca informações do job
        job = await db.jobs.find_one({"id": chat["job_id"]}, {"_id": 0, "titulo": 1})
        
        result.append({
            "chat_id": chat["id"],
            "job_id": chat["job_id"],
            "job_titulo": job.get("titulo") if job else "Job não encontrado",
            "client_id": chat["client_id"],
            "videomaker_id": chat["videomaker_id"],
            "last_message": last_message.get("content") if last_message else None,
            "last_message_at": last_message.get("created_at") if last_message else None,
            "created_at": chat["created_at"]
        })
    
    return result
