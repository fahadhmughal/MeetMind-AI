"""Dedicated prompt template for cleaning transcript filler words, garbled ASR misfires, and duplicate word artifacts."""

from pipeline.prompts.system_prompt import SYSTEM_PERSONA

TRANSCRIPT_CLEANUP_PROMPT: str = SYSTEM_PERSONA + """

TASK: Clean the following meeting transcript utterances by removing speech noise artifacts while strictly preserving all original meaning, speaker labels, timestamps, and structure.

CRITICAL INSTRUCTIONS:
1. NOISE & ARTIFACT REMOVAL:
   - Remove filler words used purely as noise (excessive "um", "uh", stutter/repeated words caused by ASR glitch).
   - Remove clearly garbled or nonsensical ASR misfire fragments.
   - Remove duplicate word artifacts resulting from speech-to-text duplication errors.
2. CONSERVATIVE CLEANUP MANDATE:
   - DO NOT change the actual meaning or intent of any sentence.
   - DO NOT add any information or words that were not spoken.
   - DO NOT remove genuine content or conversational statements, even if informally phrased.
   - DO NOT rewrite or summarize the transcript into formal text.
3. LANGUAGE & SCRIPT PRESERVATION:
   - Preserve English and Roman Urdu language mixing exactly as spoken.
   - DO NOT translate between languages.
   - Respond in Roman Urdu or English only. Never output Devanagari script.
4. STRUCTURE & TIMESTAMPS:
   - Preserve speaker labels, start_time, and end_time for each utterance exactly as given.

TRANSCRIPT UTTERANCES:
{transcript_json}

Provide the output formatted strictly according to the requested JSON schema.
"""
