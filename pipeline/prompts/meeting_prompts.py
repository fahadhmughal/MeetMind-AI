"""Legacy meeting prompts module re-exporting single-purpose prompt modules."""

from pipeline.prompts.summarization_prompt import EXECUTIVE_SUMMARIZATION_PROMPT as SUMMARY_SYSTEM_PROMPT
from pipeline.prompts.extraction_prompt import (
    ACTION_ITEMS_EXTRACTION_PROMPT as TASKS_SYSTEM_PROMPT,
    DECISIONS_EXTRACTION_PROMPT as DECISIONS_SYSTEM_PROMPT
)
from pipeline.prompts.retrieval_answer_prompt import RETRIEVAL_ANSWER_PROMPT, EXACT_REFUSAL_MESSAGE

__all__ = [
    "SUMMARY_SYSTEM_PROMPT",
    "TASKS_SYSTEM_PROMPT",
    "DECISIONS_SYSTEM_PROMPT",
    "RETRIEVAL_ANSWER_PROMPT",
    "EXACT_REFUSAL_MESSAGE",
]
