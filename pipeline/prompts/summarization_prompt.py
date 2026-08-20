"""Dedicated prompt template for Executive Summaries and Key Discussion Points."""

from pipeline.prompts.system_prompt import SYSTEM_PERSONA

EXECUTIVE_SUMMARIZATION_PROMPT: str = SYSTEM_PERSONA + """

TASK: Summarize the following meeting transcript.

CRITICAL INSTRUCTIONS:
1. EXECUTIVE SUMMARY: Write a clear, professional 2-4 paragraph synthesis covering the meeting purpose, key discussions, status updates, and main outcomes. DO NOT copy-paste raw transcript sentences.
2. KEY DISCUSSION POINTS / HIGHLIGHTS: Extract 3-5 major milestones, critical decisions, key deadlines, or project risks discussed in the call. CRITICAL MANDATE: Every highlight MUST explicitly include all specific dates, deadlines, target days, or time-sensitive commitments mentioned in the transcript (e.g. "Font size fix by Thursday, August 14th", "Backend API endpoints due August 20th"). Never reduce highlights to generic talking points when deadlines or dates exist in the call.
3. TYPOGRAPHY & SCRIPT: Respond in clean Roman Urdu or English only. Never output Devanagari script.

TRANSCRIPT:
{transcript_text}

Provide the output formatted strictly according to the requested JSON schema.
"""
