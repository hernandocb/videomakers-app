from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime, timezone

class DeviceTokenCreate(BaseModel):
    """Model para registrar device token"""
    device_token: str = Field(..., description="FCM device token")
    platform: str = Field(..., description="android ou ios")
    device_info: Optional[Dict] = Field(None, description="Informações do dispositivo")

class DeviceTokenResponse(BaseModel):
    """Response do device token"""
    user_id: str
    device_token: str
    platform: str
    registered_at: datetime
    active: bool = True

class NotificationCreate(BaseModel):
    """Model para criar notificação manual"""
    user_ids: Optional[list[str]] = Field(None, description="IDs dos usuários (ou None para broadcast)")
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=1, max_length=200)
    data: Optional[Dict] = Field(None, description="Dados adicionais")
    image_url: Optional[str] = None

class BroadcastNotification(BaseModel):
    """Model para notificação broadcast (todos os usuários)"""
    role: Optional[str] = Field(None, description="client, videomaker ou None para todos")
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=1, max_length=200)
    data: Optional[Dict] = None

class NotificationLog(BaseModel):
    """Model para log de notificações enviadas"""
    id: str
    user_id: Optional[str]
    title: str
    body: str
    data: Optional[Dict]
    status: str  # "sent", "failed"
    sent_at: datetime
    sent_by: Optional[str] = Field(None, description="ID do admin que enviou (se manual)")
