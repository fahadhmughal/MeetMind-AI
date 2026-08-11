"""Utility functions for script cleaning and transcript text normalization."""

import re

DEVANAGARI_REGEX = re.compile(r'[\u0900-\u097F]+')


def strip_devanagari(text: str) -> str:
    """Removes Devanagari/Hindi script characters and normalizes whitespace."""
    if not text:
        return ""
    cleaned = DEVANAGARI_REGEX.sub('', text)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned
