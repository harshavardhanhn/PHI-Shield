# Real-Time PHI Leak Prevention System

A production-style hackathon demo that scans outgoing messages for Protected Health Information (PHI), scores risk, blocks risky messages with an alert modal, and supports redaction before send.

## Tech Stack

- Backend: Python, FastAPI, spaCy, Regex, SQLite
- Frontend: React (Vite), Axios, Tailwind CSS, Recharts

## Project Structure

- `backend/`
  - `main.py`
  - `detector.py`
  - `models.py`
  - `database.py`
  - `requirements.txt`
- `frontend/`
  - `package.json`
  - `src/`
    - `App.jsx`
    - `components/`
    - `pages/`

## Backend Setup

1. Open terminal in `backend/`
2. Create and activate virtual environment
   - Windows PowerShell:
     - `python -m venv .venv`
     - `.\.venv\Scripts\Activate.ps1`
3. Install dependencies:
   - `pip install -r requirements.txt`
4. Install an NLP model (choose one):
   - `python -m spacy download en_core_web_sm`
   - Optional biomedical model: install SciSpaCy-compatible setup and `en_core_sci_sm`
5. Run API server:
   - `uvicorn main:app --reload --port 8000`

Backend API base URL: `http://127.0.0.1:8000`

## Frontend Setup

1. Open a new terminal in `frontend/`
2. Install dependencies:
   - `npm install`
3. Start Vite dev server:
   - `npm run dev`
4. Open the shown local URL (usually `http://127.0.0.1:5173`)

## API Endpoints

- `POST /scan`
  - Request: `{ "message": "..." }`
  - Response includes:
    - `detected_entities`
    - `highlighted_text`
    - `risk_score` (0-100)
    - `is_sensitive`
- `POST /redact`
  - Request: `{ "message": "..." }`
  - Response: `{ "redacted_message": "..." }`
- `GET /logs`
  - Returns full scan history with timestamps

## Detection Layers

1. Regex layer:
   - SSN
   - Phone numbers
   - DOB patterns
   - Email addresses
2. NLP layer (spaCy):
   - Person names
   - Medical terms (disease/medication via NLP + term spotting)
3. Contextual layer (simulated LLM logic):
   - Multiple sensitive entity combinations increase risk to medium/high.

## Risk Score Bands

- Low: `< 30`
- Medium: `30 - 70`
- High: `> 70`

## Demo Test Messages

1. `Meeting at 5 PM` -> Safe (Low)
2. `Patient John Doe, diabetic, DOB 1990` -> Medium risk
3. `John Doe SSN 123-45-6789` -> High risk

## Notes

- All scans are logged in SQLite file `phi_logs.db` generated inside `backend/`.
- If NLP model is missing, detector falls back gracefully to a blank model and still uses regex + medical term logic.
