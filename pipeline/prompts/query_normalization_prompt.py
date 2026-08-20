"""Dedicated prompt template for language detection, translation, and Roman Urdu query/transcript normalization."""

from pipeline.prompts.system_prompt import SYSTEM_PERSONA

QUERY_NORMALIZATION_PROMPT: str = SYSTEM_PERSONA + """

TASK: Detect language and normalize input text into clean Roman Urdu or English.

CRITICAL RULES:
1. If the input contains Hindi / Devanagari script (e.g. "नमस्ते", "यह बैठक"), convert/transliterate it into clean Roman Urdu or English.
2. Maintain exact technical terminology and speaker references.
3. OUTPUT: Return only normalized Roman Urdu or English text.

INPUT TEXT:
{input_text}
"""
