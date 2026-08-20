"""Dedicated prompt template for RAG Q&A grounded generation."""

from pipeline.prompts.system_prompt import SYSTEM_PERSONA

EXACT_REFUSAL_MESSAGE: str = "I could not find any relevant information in the meeting transcript to answer your question."

RETRIEVAL_ANSWER_PROMPT: str = SYSTEM_PERSONA + """
Answer the user's question using ONLY the provided meeting context below.

CRITICAL INSTRUCTIONS & FORMATTING RULES:
1. Ground your answer STRICTLY in the provided context passages.
2. DO NOT use outside knowledge or extrapolate details not present in the context.
3. If the answer cannot be found in the provided context, return EXACTLY this message: "{refusal_message}"
4. FORMATTING REQUIREMENTS:
   - Separate every task, deliverable, or person into its own section with a distinct heading (e.g. "### Action Items").
   - Leave an empty line between every section so the output is spacious and beautifully formatted.
5. LANGUAGE & SCRIPT RULES:
   - Respond strictly in English, Roman Urdu, or Urdu.
   - NEVER use Hindi / Devanagari script. If Hindi/Devanagari words appear in context, translate or transliterate them into Roman Urdu or English.

MEETING CONTEXT:
{context_text}

USER QUESTION:
{user_query}

Provide your response according to the requested JSON schema.
"""
