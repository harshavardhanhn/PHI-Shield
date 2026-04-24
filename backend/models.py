from datetime import datetime

from pydantic import BaseModel
from sqlalchemy import Boolean, DateTime, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class ScanLog(Base):
    __tablename__ = "scan_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    message: Mapped[str] = mapped_column(Text)
    highlighted_text: Mapped[str] = mapped_column(Text)
    risk_score: Mapped[int] = mapped_column(Integer)
    is_sensitive: Mapped[bool] = mapped_column(Boolean)
    detected_entities_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ScanRequest(BaseModel):
    message: str


class DetectedEntity(BaseModel):
    text: str
    label: str
    start: int
    end: int
    source: str


class ScanResponse(BaseModel):
    detected_entities: list[DetectedEntity]
    highlighted_text: str
    risk_score: int
    is_sensitive: bool


class RedactResponse(BaseModel):
    redacted_message: str
