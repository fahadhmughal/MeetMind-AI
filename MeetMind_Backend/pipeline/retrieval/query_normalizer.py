"""Query normalization and Roman Urdu detection & translation module."""

import re
from typing import Tuple, Dict
from utils.logger import get_logger

logger = get_logger(__name__)

# Common Roman Urdu indicator words
ROMAN_URDU_KEYWORDS: set[str] = {
    "kya", "kia", "kaun", "kon", "kaunsa", "konsa", "kab", "kahan", "kis", "kisi",
    "batao", "bataen", "bolo", "tha", "thi", "thay", "huye", "hua", "huwa",
    "gaya", "gayi", "hain", "hai", "kaunse", "kisne", "kabse", "karne", "karo", "kaha"
}

# Basic dictionary mapping common Roman Urdu query terms to English equivalents for embedding lookup
ROMAN_URDU_MAP: Dict[str, str] = {
    "kya": "what",
    "kia": "what",
    "kaun": "who",
    "kon": "who",
    "kaunsa": "which",
    "konsa": "which",
    "kab": "when",
    "kahan": "where",
    "kisne": "who",
    "batao": "tell me",
    "bataen": "explain",
    "decision": "decision",
    "decisions": "decisions",
    "action item": "action item",
    "task": "task",
    "tasks": "tasks",
    "meeting": "meeting",
    "mein": "in",
    "tha": "was",
    "thay": "were",
    "huye": "made",
    "hua": "happened"
}


class QueryNormalizer:
    """Detects Roman Urdu / code-mixed queries and normalizes them for vector lookup."""

    @staticmethod
    def is_roman_urdu(query: str) -> bool:
        """Determines if a query string contains Roman Urdu / code-mixed tokens."""
        tokens = set(re.findall(r'\w+', query.lower()))
        matching_count = len(tokens.intersection(ROMAN_URDU_KEYWORDS))
        return matching_count >= 1

    @staticmethod
    def normalize_query(query: str) -> Tuple[str, bool, str]:
        """Normalizes and translates Roman Urdu query terms to improve semantic lookup.

        Returns:
            Tuple of (normalized_query_for_embedding, is_roman_urdu_flag, original_query)
        """
        if not query or not query.strip():
            return "", False, ""

        original = query.strip()
        is_ru = QueryNormalizer.is_roman_urdu(original)

        if not is_ru:
            return original, False, original

        # Normalize words based on dictionary mapping
        words = original.split()
        normalized_words = [ROMAN_URDU_MAP.get(w.lower(), w) for w in words]
        normalized_str = " ".join(normalized_words)

        logger.info(f"Roman Urdu query detected: '{original}' -> Normalized for search: '{normalized_str}'")
        return normalized_str, True, original
