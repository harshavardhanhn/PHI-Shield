from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


class ScanRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10_000)
    sender: Optional[str] = "anonymous"
    channel: Optional[str] = "email"


class PHIEntityOut(BaseModel):
    phi_type: str
    value: str
    start: int
    end: int
    weight: int


class ScanResponse(BaseModel):
    detected_entities: List[PHIEntityOut]
    highlighted_text: str
    risk_score: int
    risk_band: str          # low | medium | high
    action: str             # pass | redact | block
    is_sensitive: bool
    phi_type_counts: Dict[str, int]


class RedactRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10_000)


class RedactResponse(BaseModel):
    redacted_message: str


class LogEntry(BaseModel):
    id: int
    timestamp: datetime
    sender: str
    channel: str
    action: str
    risk_score: int
    risk_band: str
    phi_types: str          # comma-separated
    message_preview: str    # first 80 chars only


class StatsResponse(BaseModel):
    total_scans: int
    total_blocked: int
    total_redacted: int
    total_passed: int
    phi_type_breakdown: Dict[str, int]