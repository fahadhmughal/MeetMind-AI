"""Dedicated prompt templates for action item tasks and key decision extraction."""

from pipeline.prompts.system_prompt import SYSTEM_PERSONA

ACTION_ITEMS_EXTRACTION_PROMPT: str = SYSTEM_PERSONA + """

TASK: Extract all explicit action items, tasks, and follow-ups from the meeting transcript.

CRITICAL RULES:
1. Extract ONLY tasks or commitments explicitly assigned or stated in the transcript.
2. Identify the assignee name if stated (e.g. "Sarah"). If unassigned, set as null.
3. DEADLINE & DUE DATE EXTRACTION (CRITICAL):
   - Extract any stated or implied deadline or timeframe for each action item (e.g., exact dates like "August 14th", relative dates like "this Thursday", "next Tuesday", "end of day today").
   - Explicitly populate the due_date field with this value. Do NOT leave due_date as null or empty when any deadline, day, or target timeframe was mentioned for that task.
4. DEDUPLICATION (CRITICAL):
   - Do NOT output duplicate or near-identical tasks for the same action item and assignee. Combine redundant mentions into a single unique action item entry.
5. Priority: Assign priority ('low', 'medium', 'high') based on urgency.
6. Title & Description: Provide a clear task title and brief description.
7. SCRIPT RULE: Respond in Roman Urdu or English only. Never output Devanagari script.

TRANSCRIPT:
{transcript_text}

Provide the output formatted strictly according to the requested JSON schema.
"""

DECISIONS_EXTRACTION_PROMPT: str = SYSTEM_PERSONA + """

TASK: Extract all key decisions agreed upon during the meeting.

CRITICAL RULES:
1. Extract ONLY decisions explicitly agreed upon by participants in the transcript.
2. Include brief context or rationale for each decision if discussed.
3. DO NOT include tentative suggestions or unresolved debates as decisions.
4. SCRIPT RULE: Respond in Roman Urdu or English only. Never output Devanagari script.

TRANSCRIPT:
{transcript_text}

Provide the output formatted strictly according to the requested JSON schema.
"""
