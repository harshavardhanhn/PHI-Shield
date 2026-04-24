import json
from datetime import datetime

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from detector import PHIDetector
from models import RedactResponse, ScanLog, ScanRequest, ScanResponse

app = FastAPI(title="Real-Time PHI Leak Prevention System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
detector = PHIDetector()


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "phi-leak-prevention",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/scan", response_model=ScanResponse)
def scan_message(payload: ScanRequest, db: Session = Depends(get_db)):
    result = detector.scan(payload.message)

    log_entry = ScanLog(
        message=payload.message,
        highlighted_text=result["highlighted_text"],
        risk_score=result["risk_score"],
        is_sensitive=result["is_sensitive"],
        detected_entities_json=json.dumps(result["detected_entities"]),
    )
    db.add(log_entry)
    db.commit()

    return result


@app.post("/redact", response_model=RedactResponse)
def redact_message(payload: ScanRequest):
    redacted = detector.redact(payload.message)
    return {"redacted_message": redacted}


@app.get("/logs")
def get_logs(db: Session = Depends(get_db)):
    logs = db.query(ScanLog).order_by(ScanLog.created_at.desc()).all()

    output = []
    for item in logs:
        output.append(
            {
                "id": item.id,
                "message": item.message,
                "highlighted_text": item.highlighted_text,
                "risk_score": item.risk_score,
                "is_sensitive": item.is_sensitive,
                "detected_entities": json.loads(item.detected_entities_json),
                "timestamp": item.created_at.isoformat(),
            }
        )
    return output
