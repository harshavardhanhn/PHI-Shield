"""
PHI-Shield — detector.py
Full HIPAA Safe Harbor (18 identifiers) detection pipeline.
Layer 1: Regex  →  Layer 2: spaCy NER  →  Layer 3: Medical term spotting
"""

import re
import html
import spacy
from dataclasses import dataclass, field
from typing import List, Tuple

# ── HIPAA 18 identifier weights ──────────────────────────────────────────────
PHI_WEIGHTS = {
    "SSN":          10,
    "MRN":           8,
    "DIAGNOSIS":     7,
    "MEDICATION":    5,
    "PERSON":        4,
    "DOB":           6,
    "PHONE":         5,
    "EMAIL":         4,
    "ADDRESS":       4,
    "ZIP":           3,
    "DATE":          2,
    "AGE_OVER_89":   7,
    "DEVICE_ID":     6,
    "URL":           3,
    "IP":            5,
    "BIOMETRIC":     8,
    "PHOTO":         7,
    "ACCOUNT":       6,
}

# ── Risk bands ────────────────────────────────────────────────────────────────
def risk_band(score: int) -> str:
    if score < 30:
        return "low"
    if score <= 70:
        return "medium"
    return "high"

def action_for_score(score: int) -> str:
    if score < 30:
        return "pass"
    if score <= 70:
        return "redact"
    return "block"

# ── Regex patterns (HIPAA 18) ─────────────────────────────────────────────────
REGEX_PATTERNS: List[Tuple[str, str, str]] = [
    ("SSN",      r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b",                                         "[SSN]"),
    ("MRN",      r"\b(?:MRN|mrn|Medical Record|patient\s*#?)\s*[:\-]?\s*[A-Z]?\d{5,10}\b",   "[MRN]"),
    ("PHONE",    r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",                 "[PHONE]"),
    ("DOB",      r"\b(?:DOB|D\.O\.B|Date of Birth|born)[:\s]+\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b",
                 "[DOB]"),
    ("DATE",     r"\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b",                               "[DATE]"),
    ("EMAIL",    r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b",                    "[EMAIL]"),
    ("ZIP",      r"\b\d{5}(?:-\d{4})?\b",                                                      "[ZIP]"),
    ("IP",       r"\b(?:\d{1,3}\.){3}\d{1,3}\b",                                              "[IP]"),
    ("URL",      r"https?://[^\s]+",                                                            "[URL]"),
    ("ACCOUNT",  r"\b(?:account|acct|policy|member)\s*(?:no|num|number|#)?[:\s]*\d{5,16}\b",  "[ACCOUNT]"),
    ("DEVICE_ID",r"\b(?:device|serial|IMEI|UUID)\s*[:\-]?\s*[A-Z0-9\-]{8,}\b",               "[DEVICE_ID]"),
    ("AGE_OVER_89", r"\b(9[0-9]|1[0-9]{2})\s*(?:years?\s*old|y\.?o\.?)\b",                  "[AGE_OVER_89]"),
]

# ── Medical term lists ────────────────────────────────────────────────────────
DIAGNOSIS_TERMS = [
    "diabetes", "diabetic", "hypertension", "cancer", "hiv", "aids", "tuberculosis",
    "hepatitis", "alzheimer", "dementia", "schizophrenia", "bipolar", "depression",
    "anxiety", "asthma", "copd", "heart failure", "stroke", "epilepsy", "lupus",
    "multiple sclerosis", "parkinson", "osteoporosis", "renal failure", "ckd",
    "sepsis", "pneumonia", "covid", "appendicitis", "fracture", "surgery",
    "chemotherapy", "radiation", "dialysis", "transplant", "icu", "intubated",
]

MEDICATION_TERMS = [
    "metformin", "insulin", "lisinopril", "amlodipine", "atorvastatin", "omeprazole",
    "levothyroxine", "metoprolol", "aspirin", "warfarin", "heparin", "morphine",
    "oxycodone", "fentanyl", "prednisone", "amoxicillin", "azithromycin", "cipro",
    "gabapentin", "sertraline", "fluoxetine", "lorazepam", "alprazolam", "zolpidem",
    "adalimumab", "humira", "remdesivir", "dexamethasone", "furosemide", "digoxin",
]

# ── Load spaCy model ─────────────────────────────────────────────────────────
def _load_nlp():
    for model in ("en_core_sci_sm", "en_core_web_md", "en_core_web_sm"):
        try:
            return spacy.load(model)
        except OSError:
            continue
    # Graceful fallback: blank English model
    return spacy.blank("en")

NLP = _load_nlp()


@dataclass
class PHIEntity:
    phi_type: str
    value: str
    start: int
    end: int
    weight: int = field(init=False)

    def __post_init__(self):
        self.weight = PHI_WEIGHTS.get(self.phi_type, 3)


def detect(text: str) -> dict:
    """
    Run all three detection layers and return a unified result dict.
    """
    entities: List[PHIEntity] = []
    covered_spans: List[Tuple[int, int]] = []

    def _span_free(start, end):
        for s, e in covered_spans:
            if not (end <= s or start >= e):
                return False
        return True

    # ── Layer 1: Regex ────────────────────────────────────────────────────────
    for phi_type, pattern, _ in REGEX_PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            if _span_free(m.start(), m.end()):
                entities.append(PHIEntity(phi_type, m.group(), m.start(), m.end()))
                covered_spans.append((m.start(), m.end()))

    # ── Layer 2: spaCy NER ────────────────────────────────────────────────────
    doc = NLP(text)
    for ent in doc.ents:
        if ent.label_ in ("PERSON", "GPE", "ORG", "FAC", "LOC") and _span_free(ent.start_char, ent.end_char):
            phi_type = "PERSON" if ent.label_ == "PERSON" else "ADDRESS"
            entities.append(PHIEntity(phi_type, ent.text, ent.start_char, ent.end_char))
            covered_spans.append((ent.start_char, ent.end_char))

    # ── Layer 3: Medical term spotting ───────────────────────────────────────
    lower = text.lower()
    for term in DIAGNOSIS_TERMS:
        idx = lower.find(term)
        while idx != -1:
            start, end = idx, idx + len(term)
            if _span_free(start, end):
                entities.append(PHIEntity("DIAGNOSIS", text[start:end], start, end))
                covered_spans.append((start, end))
            idx = lower.find(term, idx + 1)

    for term in MEDICATION_TERMS:
        idx = lower.find(term)
        while idx != -1:
            start, end = idx, idx + len(term)
            if _span_free(start, end):
                entities.append(PHIEntity("MEDICATION", text[start:end], start, end))
                covered_spans.append((start, end))
            idx = lower.find(term, idx + 1)

    # ── Scoring ───────────────────────────────────────────────────────────────
    # Unique type penalty: multiple high-weight types multiply risk
    type_weights = {}
    for e in entities:
        type_weights[e.phi_type] = max(type_weights.get(e.phi_type, 0), e.weight)

    base_score = sum(type_weights.values())
    # Combination bonus: any 2+ types of weight≥5 escalates score
    heavy = [w for w in type_weights.values() if w >= 5]
    if len(heavy) >= 2:
        base_score = min(100, base_score + 15)

    risk_score = min(100, base_score)

    # ── Highlighted text ──────────────────────────────────────────────────────
    highlighted = _build_highlighted(text, entities)

    return {
        "detected_entities": [
            {"phi_type": e.phi_type, "value": e.value, "start": e.start, "end": e.end, "weight": e.weight}
            for e in sorted(entities, key=lambda x: x.start)
        ],
        "highlighted_text": highlighted,
        "risk_score": risk_score,
        "risk_band": risk_band(risk_score),
        "action": action_for_score(risk_score),
        "is_sensitive": risk_score >= 30,
        "phi_type_counts": _count_types(entities),
    }


def redact(text: str) -> str:
    """Replace all detected PHI with typed placeholder tokens."""
    result = detect(text)
    entities = sorted(result["detected_entities"], key=lambda x: x["start"], reverse=True)
    chars = list(text)
    for e in entities:
        replacement = f"[{e['phi_type']}]"
        chars[e["start"]:e["end"]] = list(replacement)
    return "".join(chars)


def _build_highlighted(text: str, entities: List[PHIEntity]) -> str:
    """Build HTML with <mark> spans for each detected entity."""
    sorted_ents = sorted(entities, key=lambda x: x.start)
    result = []
    cursor = 0
    for e in sorted_ents:
        if e.start > cursor:
            result.append(html.escape(text[cursor:e.start]))
        css_class = _css_for_type(e.phi_type)
        result.append(
            f'<mark class="{css_class}" data-type="{e.phi_type}">'
            f'{html.escape(text[e.start:e.end])}'
            f'</mark>'
        )
        cursor = e.end
    result.append(html.escape(text[cursor:]))
    return "".join(result)


def _css_for_type(phi_type: str) -> str:
    high = {"SSN", "MRN", "DOB", "AGE_OVER_89", "BIOMETRIC", "PHOTO", "DEVICE_ID", "ACCOUNT"}
    medium = {"DIAGNOSIS", "MEDICATION", "PHONE", "IP"}
    if phi_type in high:
        return "phi-high"
    if phi_type in medium:
        return "phi-medium"
    return "phi-low"


def _count_types(entities: List[PHIEntity]) -> dict:
    counts = {}
    for e in entities:
        counts[e.phi_type] = counts.get(e.phi_type, 0) + 1
    return counts