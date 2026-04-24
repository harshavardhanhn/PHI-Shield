"""
PHI-Shield — database.py
Async SQLite persistence using aiosqlite.
Falls back to sync sqlite3 if aiosqlite is unavailable.
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "phi_logs.db"


def get_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS scan_logs (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp       TEXT    NOT NULL,
                sender          TEXT    NOT NULL DEFAULT 'anonymous',
                channel         TEXT    NOT NULL DEFAULT 'email',
                action          TEXT    NOT NULL,
                risk_score      INTEGER NOT NULL,
                risk_band       TEXT    NOT NULL,
                phi_types       TEXT    NOT NULL DEFAULT '',
                phi_type_counts TEXT    NOT NULL DEFAULT '{}',
                message_preview TEXT    NOT NULL DEFAULT ''
            )
        """)

        # Backward-compatible migration for older local DB files.
        columns = {row[1] for row in conn.execute("PRAGMA table_info(scan_logs)").fetchall()}

        legacy_columns = {
            "message", "highlighted_text", "is_sensitive", "detected_entities_json", "created_at"
        }

        if "timestamp" not in columns and legacy_columns.issubset(columns):
            conn.execute("ALTER TABLE scan_logs RENAME TO scan_logs_legacy")
            conn.execute("""
                CREATE TABLE scan_logs (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp       TEXT    NOT NULL,
                    sender          TEXT    NOT NULL DEFAULT 'anonymous',
                    channel         TEXT    NOT NULL DEFAULT 'email',
                    action          TEXT    NOT NULL,
                    risk_score      INTEGER NOT NULL,
                    risk_band       TEXT    NOT NULL,
                    phi_types       TEXT    NOT NULL DEFAULT '',
                    phi_type_counts TEXT    NOT NULL DEFAULT '{}',
                    message_preview TEXT    NOT NULL DEFAULT ''
                )
            """)

            conn.execute("""
                INSERT INTO scan_logs (
                    id, timestamp, sender, channel, action, risk_score, risk_band,
                    phi_types, phi_type_counts, message_preview
                )
                SELECT
                    id,
                    COALESCE(created_at, ?),
                    'anonymous',
                    'email',
                    CASE WHEN is_sensitive = 1 THEN 'redact' ELSE 'pass' END,
                    COALESCE(risk_score, 0),
                    CASE
                        WHEN COALESCE(risk_score, 0) > 70 THEN 'high'
                        WHEN COALESCE(risk_score, 0) >= 30 THEN 'medium'
                        ELSE 'low'
                    END,
                    '',
                    '{}',
                    substr(COALESCE(message, ''), 1, 80)
                FROM scan_logs_legacy
            """, (datetime.utcnow().isoformat(),))

            conn.execute("DROP TABLE scan_logs_legacy")
            conn.commit()
            return

        columns = {row[1] for row in conn.execute("PRAGMA table_info(scan_logs)").fetchall()}

        def add_column_if_missing(name: str, ddl: str):
            if name not in columns:
                conn.execute(f"ALTER TABLE scan_logs ADD COLUMN {name} {ddl}")

        add_column_if_missing("timestamp", "TEXT")
        add_column_if_missing("sender", "TEXT NOT NULL DEFAULT 'anonymous'")
        add_column_if_missing("channel", "TEXT NOT NULL DEFAULT 'email'")
        add_column_if_missing("action", "TEXT NOT NULL DEFAULT 'pass'")
        add_column_if_missing("risk_band", "TEXT NOT NULL DEFAULT 'low'")
        add_column_if_missing("phi_types", "TEXT NOT NULL DEFAULT ''")
        add_column_if_missing("phi_type_counts", "TEXT NOT NULL DEFAULT '{}'")
        add_column_if_missing("message_preview", "TEXT NOT NULL DEFAULT ''")

        # If this DB came from v1, backfill newly expected fields from legacy columns.
        if "created_at" in columns:
            conn.execute("""
                UPDATE scan_logs
                SET timestamp = COALESCE(
                    NULLIF(timestamp, ''),
                    created_at,
                    ?
                )
                WHERE timestamp IS NULL OR timestamp = ''
            """, (datetime.utcnow().isoformat(),))
        else:
            conn.execute("""
                UPDATE scan_logs
                SET timestamp = COALESCE(NULLIF(timestamp, ''), ?)
                WHERE timestamp IS NULL OR timestamp = ''
            """, (datetime.utcnow().isoformat(),))

        if "message" in columns:
            conn.execute("""
                UPDATE scan_logs
                SET message_preview = COALESCE(
                    NULLIF(message_preview, ''),
                    substr(COALESCE(message, ''), 1, 80)
                )
                WHERE message_preview IS NULL OR message_preview = ''
            """)
        conn.commit()


def log_scan(sender: str, channel: str, action: str, risk_score: int,
             risk_band: str, phi_types: list, phi_type_counts: dict,
             message: str):
    preview = message[:80] + ("..." if len(message) > 80 else "")
    with get_connection() as conn:
        columns = {row[1] for row in conn.execute("PRAGMA table_info(scan_logs)").fetchall()}
        now = datetime.utcnow().isoformat()

        values_by_column = {
            "timestamp": now,
            "sender": sender,
            "channel": channel,
            "action": action,
            "risk_score": risk_score,
            "risk_band": risk_band,
            "phi_types": ", ".join(phi_types),
            "phi_type_counts": json.dumps(phi_type_counts),
            "message_preview": preview,
            # Legacy v1 compatibility columns.
            "message": "",
            "highlighted_text": "",
            "is_sensitive": 1 if risk_score >= 30 else 0,
            "detected_entities_json": "[]",
            "created_at": now,
        }

        insert_columns = [c for c in values_by_column if c in columns]
        placeholders = ", ".join(["?"] * len(insert_columns))
        sql = f"INSERT INTO scan_logs ({', '.join(insert_columns)}) VALUES ({placeholders})"
        conn.execute(sql, [values_by_column[c] for c in insert_columns])
        conn.commit()


def get_logs(limit: int = 100, offset: int = 0):
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT id, timestamp, sender, channel, action, risk_score, risk_band,
                      phi_types, message_preview
               FROM scan_logs
               ORDER BY id DESC LIMIT ? OFFSET ?""",
            (limit, offset)
        ).fetchall()
    return [dict(r) for r in rows]


def get_stats():
    with get_connection() as conn:
        total     = conn.execute("SELECT COUNT(*) FROM scan_logs").fetchone()[0]
        blocked   = conn.execute("SELECT COUNT(*) FROM scan_logs WHERE action='block'").fetchone()[0]
        redacted  = conn.execute("SELECT COUNT(*) FROM scan_logs WHERE action='redact'").fetchone()[0]
        passed    = conn.execute("SELECT COUNT(*) FROM scan_logs WHERE action='pass'").fetchone()[0]
        type_rows = conn.execute("SELECT phi_type_counts FROM scan_logs").fetchall()

    # Aggregate phi_type_counts across all rows
    breakdown: dict = {}
    for row in type_rows:
        try:
            counts = json.loads(row[0])
        except (json.JSONDecodeError, TypeError):
            counts = {}
        for k, v in counts.items():
            breakdown[k] = breakdown.get(k, 0) + v

    return {
        "total_scans": total,
        "total_blocked": blocked,
        "total_redacted": redacted,
        "total_passed": passed,
        "phi_type_breakdown": breakdown,
    }