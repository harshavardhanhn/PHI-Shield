# PHI-Shield v2.0

Real-time HIPAA PHI leak prevention — scans outbound messages for Protected Health Information, blocks or redacts before transmission, and logs every event for compliance audits.

## What changed in v2.0

### Backend

| Area | Change |
|---|---|
| **detector.py** | Full HIPAA 18-identifier coverage (was SSN + phone + DOB + email only). Added MRN, ZIP, IP, URL, account numbers, device IDs, age >89, biometric, address. |
| **detector.py** | Combination-bonus scoring: 2+ high-weight PHI types escalate the risk score by +15, matching real-world severity. |
| **detector.py** | PHI highlighting now returns typed HTML `<mark class="phi-high|medium|low">` — frontend renders with colour-coded underlines. |
| **detector.py** | Span deduplication: regex, NER, and term-spotting results never overlap — no double-counting a single entity. |
| **detector.py** | 30 diagnosis terms + 30 medication terms (was ~10 each). |
| **database.py** | Stores `phi_type_counts` as JSON per row — enables the `/stats` PHI breakdown chart without re-scanning. |
| **database.py** | Stores `risk_band` column — dashboard filters by band without recomputing. |
| **database.py** | Never stores raw message — only first 80 chars as preview, for compliance. |
| **main.py** | Added `GET /stats` endpoint — returns totals + per-type breakdown for dashboard. |
| **main.py** | Added `GET /health` endpoint. |
| **main.py** | Added pagination to `GET /logs` (`limit` + `offset` query params). |
| **main.py** | FastAPI `lifespan` context replaces deprecated `on_event("startup")`. |
| **models.py** | Pydantic v2 compatible. Added `StatsResponse`, `risk_band`, `action`, `phi_type_counts` fields. |

### Frontend

| Area | Change |
|---|---|
| **Routing** | React Router v6 with three pages: Compose, Dashboard, Audit Log. |
| **ComposePage** | Three built-in demo messages (safe / medium / high) to load with one click. |
| **ComposePage** | PHI highlighting renders inline below the compose area — colour-coded by severity. |
| **ComposePage** | Redact button fetches `/redact` and shows cleaned text inline — no page reload. |
| **DashboardPage** | Live stats cards + Recharts horizontal bar chart for PHI type breakdown. |
| **DashboardPage** | Auto-refreshes every 5 seconds via `setInterval`. |
| **LogsPage** | Full paginated audit log table (25 rows per page). |
| **api.js** | Centralised Axios client with proxy — no hardcoded `localhost:8000` in components. |
| **index.css** | PHI `<mark>` classes with colour-coded bottom borders (red = high, amber = medium, blue = low). |

## Quick start

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`

## API reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/scan` | Scan message for PHI. Body: `{message, sender?, channel?}` |
| `POST` | `/redact` | Redact PHI. Body: `{message}` |
| `GET` | `/logs` | Audit log. Params: `limit`, `offset` |
| `GET` | `/stats` | Dashboard stats + PHI type breakdown |
| `GET` | `/health` | Health check |

## Risk scoring

| PHI type | Weight |
|---|---|
| SSN | 10 |
| Age >89 | 7, Biometric 8, Photo 7 |
| MRN | 8 |
| Diagnosis | 7 |
| DOB | 6 |
| Account / Device ID | 6 |
| Medication / Phone / IP | 5 |
| Person / Email / Address | 4 |
| ZIP / URL / Date | 2–3 |

Score < 30 → **pass** · 30–70 → **redact** · >70 → **block**

Two or more PHI types with weight ≥ 5 adds a +15 combination penalty.