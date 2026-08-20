"""Pipeline orchestrator for LLM meeting transcript analysis and DB persistence."""

from typing import Dict, Any, List, Optional, Type
from api.supabase_client import supabase_service
from models.llm_factory import LLMFactory
from pipeline.extraction_schemas import (
    ExecutiveSummary,
    TaskList,
    DecisionList,
    MeetingAnalysisResult,
    ExtractedTask,
    ExtractedDecision
)
from pipeline.prompts.summarization_prompt import EXECUTIVE_SUMMARIZATION_PROMPT
from pipeline.prompts.extraction_prompt import (
    ACTION_ITEMS_EXTRACTION_PROMPT,
    DECISIONS_EXTRACTION_PROMPT
)
from utils.date_parser import parse_to_iso_date
from utils.logger import get_logger
from utils.text_cleaner import strip_devanagari

logger = get_logger(__name__)


class ExtractionPipeline:
    """Orchestrates structured LLM extraction from meeting transcripts."""

    def __init__(self, supabase_client: Optional[Any] = None, llm_factory: Optional[Type[LLMFactory]] = None):
        self.supabase = supabase_client or supabase_service
        self.llm_factory = llm_factory or LLMFactory

    def analyze_meeting(self, meeting_id: str) -> MeetingAnalysisResult:
        """Runs executive summary, task, and decision extraction on a meeting transcript."""
        logger.info(f"Starting LLM Extraction Pipeline for meeting ID: {meeting_id}")

        # Step 1: Fetch Meeting and Transcripts
        meetings = self.supabase.select("meetings", limit=100)
        target_meeting = next((m for m in meetings if str(m.get("id")) == meeting_id), None)
        if not target_meeting:
            raise ValueError(f"Meeting '{meeting_id}' not found in database.")

        transcripts_res = self.supabase.client.table("transcripts").select("*").eq("meeting_id", meeting_id).order("start_time").execute()
        transcripts = transcripts_res.data or []

        if not transcripts:
            logger.warning(f"No transcripts found for meeting '{meeting_id}'. Cannot run analysis.")
            raise ValueError(f"No transcripts found for meeting '{meeting_id}'.")

        # Format continuous transcript text
        formatted_lines = [f"{t.get('speaker', 'Speaker')}: {t.get('content', '')}" for t in transcripts]
        transcript_text = "\n".join(formatted_lines)
        logger.info(f"Formatted transcript context ({len(transcript_text)} chars) for meeting {meeting_id}")

        # Step 2: Extract Summary (Separate explicit try/except)
        summary_res = None
        summary_err_msg = None
        try:
            logger.info("Extracting Executive Summary...")
            summary_prompt = EXECUTIVE_SUMMARIZATION_PROMPT.format(transcript_text=transcript_text)
            summary_res = self.llm_factory.generate_structured(
                prompt=summary_prompt,
                response_schema=ExecutiveSummary,
                provider="gemini"
            )
        except Exception as exc:
            logger.error(f"Executive Summary LLM call failed for meeting '{meeting_id}': {exc}")
            summary_err_msg = str(exc)

        # Step 3: Extract Action Items
        tasks_res = None
        try:
            logger.info("Extracting Action Items / Tasks...")
            tasks_prompt = ACTION_ITEMS_EXTRACTION_PROMPT.format(transcript_text=transcript_text)
            tasks_res = self.llm_factory.generate_structured(
                prompt=tasks_prompt,
                response_schema=TaskList,
                provider="gemini"
            )
        except Exception as exc:
            logger.error(f"Action Items LLM call failed for meeting '{meeting_id}': {exc}")

        # Step 4: Extract Key Decisions
        decisions_res = None
        try:
            logger.info("Extracting Key Decisions...")
            decisions_prompt = DECISIONS_EXTRACTION_PROMPT.format(transcript_text=transcript_text)
            decisions_res = self.llm_factory.generate_structured(
                prompt=decisions_prompt,
                response_schema=DecisionList,
                provider="gemini"
            )
        except Exception as exc:
            logger.error(f"Decisions LLM call failed for meeting '{meeting_id}': {exc}")

        # Fallback handling for failed parts
        if not summary_res:
            if summary_err_msg:
                exec_summary_text = f"Summary generation failed — {summary_err_msg}"
            else:
                summary_lines = [strip_devanagari(t.get("content", "")) for t in transcripts if t.get("content")]
                full_text = " ".join([l for l in summary_lines if l])
                exec_summary_text = full_text or "No executive summary available."

            summary_res = ExecutiveSummary(
                executive_summary=exec_summary_text,
                key_discussion_points=["Full meeting transcript recorded."]
            )

        if not tasks_res:
            tasks_res = TaskList(tasks=[])

        if not decisions_res:
            decisions_res = DecisionList(decisions=[])

        # Step 5: Python Deduplication on Extracted Tasks
        unique_tasks: List[ExtractedTask] = []
        seen_task_keys = set()
        for task in tasks_res.tasks:
            task_title_clean = strip_devanagari(task.title).strip()
            if not task_title_clean:
                continue
            assignee_clean = strip_devanagari(task.assignee_name or "").strip()
            dedup_key = (task_title_clean.lower(), assignee_clean.lower())

            if dedup_key not in seen_task_keys:
                seen_task_keys.add(dedup_key)
                task.title = task_title_clean
                task.assignee_name = assignee_clean or None
                unique_tasks.append(task)

        # Step 6: Database Persistence & Idempotency
        cleaned_summary = strip_devanagari(summary_res.executive_summary)
        cleaned_highlights = [strip_devanagari(pt) for pt in summary_res.key_discussion_points if strip_devanagari(pt)]

        summary_text = cleaned_summary
        if cleaned_highlights:
            summary_text += "\n\nKey Highlights:\n" + "\n".join(f"• {pt}" for pt in cleaned_highlights)

        # Update main meeting description
        logger.info("Persisting summary to meeting record...")
        self.supabase.client.table("meetings").update({
            "description": summary_text
        }).eq("id", meeting_id).execute()

        # Upsert into public.summaries table so get_meeting_details retrieves summary directly
        try:
            self.supabase.client.table("summaries").upsert({
                "meeting_id": meeting_id,
                "executive_summary": cleaned_summary,
                "key_discussion_points": cleaned_highlights
            }, on_conflict="meeting_id").execute()
            logger.info("Successfully persisted to 'summaries' table.")
        except Exception as sum_db_err:
            logger.warning(f"Summaries table upsert warning: {sum_db_err}")

        # IDEMPOTENCY FIX: Delete existing tasks and decisions for this meeting before inserting fresh extraction
        logger.info(f"Clearing previous tasks and decisions for meeting '{meeting_id}' to maintain idempotency...")
        try:
            self.supabase.client.table("tasks").delete().eq("meeting_id", meeting_id).execute()
            self.supabase.client.table("decisions").delete().eq("meeting_id", meeting_id).execute()
        except Exception as del_err:
            logger.warning(f"Failed clearing previous tasks/decisions for meeting '{meeting_id}': {del_err}")

        # Insert deduplicated tasks with due_date persistence
        logger.info(f"Persisting {len(unique_tasks)} extracted tasks to database...")
        for task in unique_tasks:
            raw_due_date = task.due_date
            iso_due_date = parse_to_iso_date(raw_due_date)
            desc = task.description or ""
            if task.priority:
                desc = f"{desc}\n[Priority: {task.priority.capitalize()}]".strip()
            if raw_due_date and not iso_due_date and "Deadline:" not in desc:
                desc = f"{desc}\n[Deadline: {raw_due_date}]".strip()

            task_payload = {
                "meeting_id": meeting_id,
                "title": task.title,
                "description": desc,
                "assignee_name": task.assignee_name or "",
                "due_date": iso_due_date,
                "status": "pending"
            }

            try:
                self.supabase.insert("tasks", task_payload)
            except Exception as task_insert_err:
                logger.warning(f"Task insert failed with iso_due_date={iso_due_date}: {task_insert_err}. Retrying with due_date=None...")
                try:
                    task_payload["due_date"] = None
                    if raw_due_date and "Deadline:" not in desc:
                        task_payload["description"] = f"{desc}\n[Deadline: {raw_due_date}]".strip()
                    self.supabase.insert("tasks", task_payload)
                except Exception as retry_err:
                    logger.error(f"Failed inserting task '{task.title}': {retry_err}")

        # Insert decisions
        logger.info(f"Persisting {len(decisions_res.decisions)} extracted decisions to database...")
        for decision in decisions_res.decisions:
            self.supabase.insert("decisions", {
                "meeting_id": meeting_id,
                "decision_text": strip_devanagari(decision.decision_text),
                "context": strip_devanagari(decision.context or "")
            })

        logger.info(f"LLM Extraction Pipeline completed successfully for meeting ID: {meeting_id}")

        return MeetingAnalysisResult(
            summary=summary_res,
            tasks=unique_tasks,
            decisions=decisions_res.decisions
        )


# Global extraction pipeline instance
extraction_pipeline = ExtractionPipeline()
