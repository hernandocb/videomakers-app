from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class Chat(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    client_id: str
    videomaker_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageCreate(BaseModel):
    chat_id: str
    content: str
    attachments: List[str] = []  # GridFS file IDs

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_id: str
    sender_id: str
    content: str
    attachments: List[str] = []
    blocked: bool = False  # Se foi bloqueado pela moderação
    blocked_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read_at: Optional[datetime] = None

class MessageResponse(BaseModel):
    id: str
    chat_id: str
    sender_id: str
    content: str
    attachments: List[str]
    blocked: bool
    blocked_reason: Optional[str]
    created_at: datetime
    read_at: Optional[datetime]
