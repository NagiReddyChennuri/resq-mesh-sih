from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

class SOSCreate(BaseModel):
    client_packet_id: str
    latitude: float
    longitude: float
    category: str  # 'Trapped', 'Medical', 'Food/Water', 'Structural Collapse'
    voice_note_transcript: Optional[str] = None
    victims_count: int = 1
    offline_hop_count: int = 0  # Number of mesh hops before reaching internet

class SOSResponse(SOSCreate):
    id: int
    confidence_score: float
    status: str  # 'Pending', 'Dispatched', 'Resolved'
    created_at: datetime

    class Config:
        orm_mode = True