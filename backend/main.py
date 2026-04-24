"""
PHI-Shield — main.py
FastAPI application entry point.

Run:  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from models import (
    ScanRequest, ScanResponse,
    RedactRequest, RedactResponse,
    LogEntry, StatsResponse,
)
from detector import detect, redact as do_redact
from database import init_db, log_scan, get_logs, get_stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="PHI-Shield API",
    description="Real-time HIPAA PHI detection, redaction, and audit logging.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# POST /scan
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/scan", response_model=ScanResponse, summary="Scan message for PHI")
def scan_message(req: ScanRequest):
    if not req.message.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty.")

    result = detect(req.message)

    # Persist to audit log (never store raw message, only preview)
    log_scan(
        sender=req.sender or "anonymous",
        channel=req.channel or "email",
        action=result["action"],
        risk_score=result["risk_score"],
        risk_band=result["risk_band"],
        phi_types=list(result["phi_type_counts"].keys()),
        phi_type_counts=result["phi_type_counts"],
        message=req.message,
    )

    return result


# ─────────────────────────────────────────────────────────────────────────────
# POST /redact
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/redact", response_model=RedactResponse, summary="Redact PHI from message")
def redact_message(req: RedactRequest):
    if not req.message.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty.")
    return {"redacted_message": do_redact(req.message)}


# ─────────────────────────────────────────────────────────────────────────────
# GET /logs
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/logs", summary="Retrieve audit log")
def get_audit_logs(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    return get_logs(limit=limit, offset=offset)


# ─────────────────────────────────────────────────────────────────────────────
# GET /stats
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/stats", response_model=StatsResponse, summary="Dashboard statistics")
def get_dashboard_stats():
    return get_stats()


# ─────────────────────────────────────────────────────────────────────────────
# GET /health
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/health", summary="Health check")
def health():
    return {"status": "ok", "version": "2.0.0"}