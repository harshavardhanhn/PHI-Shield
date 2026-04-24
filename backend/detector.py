import html
import re
from collections import Counter

import spacy


class PHIDetector:
    def __init__(self) -> None:
        self.patterns = {
            "SSN": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
            "PHONE": re.compile(r"\b(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b"),
            "DOB": re.compile(
                r"\b(?:DOB[:\s]*)?(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|(?:19|20)\d{2})\b",
                re.IGNORECASE,
            ),
            "EMAIL": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
        }

        # Fallback strategy keeps the demo runnable if biomedical model is unavailable.
        self.nlp = self._load_nlp_model()
        self.medical_terms = {
            "diabetic",
            "diabetes",
            "hypertension",
            "asthma",
            "cancer",
            "insulin",
            "metformin",
            "amoxicillin",
            "ibuprofen",
            "paracetamol",
            "alzheimer",
            "stroke",
            "depression",
        }

    def _load_nlp_model(self):
        model_candidates = ["en_core_sci_sm", "en_core_web_sm"]
        for model_name in model_candidates:
            try:
                return spacy.load(model_name)
            except Exception:
                continue
        return spacy.blank("en")

    def detect_regex_entities(self, text: str) -> list[dict]:
        entities: list[dict] = []
        for label, pattern in self.patterns.items():
            for match in pattern.finditer(text):
                entities.append(
                    {
                        "text": match.group(),
                        "label": label,
                        "start": match.start(),
                        "end": match.end(),
                        "source": "regex",
                    }
                )
        return entities

    def detect_nlp_entities(self, text: str) -> list[dict]:
        entities: list[dict] = []
        doc = self.nlp(text)

        for ent in doc.ents:
            if ent.label_ in {"PERSON", "ORG", "GPE"}:
                entities.append(
                    {
                        "text": ent.text,
                        "label": "PERSON" if ent.label_ == "PERSON" else "CONTEXT_ENTITY",
                        "start": ent.start_char,
                        "end": ent.end_char,
                        "source": "nlp",
                    }
                )

        # Medical term spotting supports lightweight domain detection in hackathon demos.
        for token in doc:
            token_l = token.text.lower().strip(".,;:!?()[]{}\"'")
            if token_l in self.medical_terms:
                entities.append(
                    {
                        "text": token.text,
                        "label": "MEDICAL_TERM",
                        "start": token.idx,
                        "end": token.idx + len(token.text),
                        "source": "nlp",
                    }
                )

        return entities

    def _dedupe_and_sort(self, entities: list[dict]) -> list[dict]:
        # Keep longest span when overlaps happen between regex and NLP matches.
        entities_sorted = sorted(entities, key=lambda e: (e["start"], -(e["end"] - e["start"])))
        filtered: list[dict] = []
        for entity in entities_sorted:
            if not filtered:
                filtered.append(entity)
                continue
            prev = filtered[-1]
            overlap = entity["start"] < prev["end"]
            if overlap:
                prev_len = prev["end"] - prev["start"]
                curr_len = entity["end"] - entity["start"]
                if curr_len > prev_len:
                    filtered[-1] = entity
            else:
                filtered.append(entity)

        # Remove exact duplicates that can occur in repeated matching stages.
        seen = set()
        unique: list[dict] = []
        for entity in filtered:
            key = (entity["text"], entity["label"], entity["start"], entity["end"], entity["source"])
            if key not in seen:
                seen.add(key)
                unique.append(entity)
        return unique

    def score_risk(self, entities: list[dict]) -> int:
        if not entities:
            return 0

        weights = {
            "SSN": 45,
            "DOB": 20,
            "PHONE": 15,
            "EMAIL": 10,
            "PERSON": 15,
            "MEDICAL_TERM": 18,
            "CONTEXT_ENTITY": 8,
        }

        score = 0
        labels = Counter()
        for entity in entities:
            label = entity["label"]
            labels[label] += 1
            score += weights.get(label, 5)

        # Simulated LLM/contextual layer: compound sensitive context increases risk.
        has_identifier = any(label in labels for label in ["SSN", "DOB", "PHONE", "EMAIL"])
        has_health_context = any(label in labels for label in ["PERSON", "MEDICAL_TERM"])

        if has_identifier and has_health_context:
            score += 20
        if len(labels.keys()) >= 3:
            score += 15
        if labels.get("SSN", 0) > 0 and labels.get("PERSON", 0) > 0:
            score += 20

        return max(0, min(100, score))

    def _apply_mask(self, text: str, entities: list[dict], mask: str) -> str:
        if not entities:
            return html.escape(text)

        output = []
        cursor = 0
        for entity in entities:
            start, end = entity["start"], entity["end"]
            output.append(html.escape(text[cursor:start]))
            output.append(mask)
            cursor = end
        output.append(html.escape(text[cursor:]))
        return "".join(output)

    def highlight(self, text: str, entities: list[dict]) -> str:
        if not entities:
            return html.escape(text)

        output = []
        cursor = 0
        for entity in entities:
            start, end = entity["start"], entity["end"]
            output.append(html.escape(text[cursor:start]))
            span = html.escape(text[start:end])
            label = html.escape(entity["label"])
            output.append(f"<mark class='phi-hit' title='{label}'>{span}</mark>")
            cursor = end
        output.append(html.escape(text[cursor:]))
        return "".join(output)

    def scan(self, text: str) -> dict:
        regex_entities = self.detect_regex_entities(text)
        nlp_entities = self.detect_nlp_entities(text)
        entities = self._dedupe_and_sort(regex_entities + nlp_entities)
        risk_score = self.score_risk(entities)

        return {
            "detected_entities": entities,
            "highlighted_text": self.highlight(text, entities),
            "risk_score": risk_score,
            "is_sensitive": risk_score >= 30,
        }

    def redact(self, text: str, entities: list[dict] | None = None) -> str:
        if entities is None:
            entities = self.scan(text)["detected_entities"]
        return self._apply_mask(text, entities, "[REDACTED]")
