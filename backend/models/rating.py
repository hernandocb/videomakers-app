from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class RatingCreate(BaseModel):
    job_id: str
    to_user_id: str
    rating: int = Field(..., ge=1, le=5)
    comentario: Optional[str] = None

class Rating(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    from_user_id: str
    to_user_id: str
    rating: int = Field(..., ge=1, le=5)
    comentario: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RatingResponse(BaseModel):
    id: str
    job_id: str
    from_user_id: str
    to_user_id: str
    rating: int
    comentario: Optional[str]
    created_at: datetime
