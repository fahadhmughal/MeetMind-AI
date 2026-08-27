import uuid
import inspect
import starlette.routing

if "on_startup" not in inspect.signature(starlette.routing.Router.__init__).parameters:
    _orig_router_init = starlette.routing.Router.__init__
    def _compat_router_init(self, *args, **kwargs):
        kwargs.pop("on_startup", None)
        kwargs.pop("on_shutdown", None)
        _orig_router_init(self, *args, **kwargs)
    starlette.routing.Router.__init__ = _compat_router_init

from typing import Optional, Dict
from pydantic import BaseModel, Field
from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException, status, BackgroundTasks
from pipeline.transcription_pipeline import transcription_pipeline
from pipeline.extraction_pipeline import extraction_pipeline
from api.supabase_client import supabase_service
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/meetings", tags=["Meetings"])


def _run_background_pipeline(
    meeting_id: str,
    file_bytes: bytes,
    filename: str,
    title: str,
    description: Optional[str],
    user_id: Optional[str]
):
    try:
        transcription_pipeline.process_meeting_audio(
            file_bytes=file_bytes,
            file_name=filename,
            title=title,
            description=description,
            user_id=user_id,
            existing_meeting_id=meeting_id
        )
        try:
            extraction_pipeline.analyze_meeting(meeting_id)
        except Exception as ext_err:
            logger.warning(f"Background analysis warning for meeting '{meeting_id}': {ext_err}")
    except Exception as exc:
        logger.error(f"Async meeting processing failed for meeting '{meeting_id}': {exc}")
        try:
            supabase_service.client.table("meetings").update({"status": "failed"}).eq("id", meeting_id).execute()
        except Exception:
            pass


class SpeakerRenameRequest(BaseModel):
    """Schema for speaker renaming request payload."""
    speaker_map: Dict[str, str] = Field(
        description="Mapping from raw speaker labels to new names (e.g. {'Speaker 1': 'Alex'})"
    )


@router.get("", status_code=status.HTTP_200_OK)
@router.get("/", status_code=status.HTTP_200_OK)
async def list_meetings(
    user_id: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id")
):
    """Lists meeting records isolated by user account."""
    target_user_id = user_id or x_user_id

    # If authorization header is present, attempt to extract user ID from Supabase token
    if not target_user_id and authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1]
        try:
            user_response = supabase_service.client.auth.get_user(token)
            if user_response and user_response.user:
                target_user_id = user_response.user.id
        except Exception as auth_err:
            logger.warning(f"Could not extract user from token: {auth_err}")

    logger.info(f"Fetching meetings from Supabase DB for user_id: '{target_user_id}'...")
    try:
        if target_user_id:
            try:
                res = supabase_service.client.table("meetings") \
                    .select("*") \
                    .or_(f"created_by.eq.{target_user_id},created_by.is.null") \
                    .order("created_at", desc=True) \
                    .execute()
                return {
                    "status": "success",
                    "meetings": res.data or []
                }
            except Exception as filter_err:
                logger.warning(f"Error filtering meetings by created_by column: {filter_err}. Retrying without created_by filter...")
                res = supabase_service.client.table("meetings").select("*").order("created_at", desc=True).execute()
                return {
                    "status": "success",
                    "meetings": res.data or []
                }

        # Return all meetings if target_user_id is not specified
        res = supabase_service.client.table("meetings").select("*").order("created_at", desc=True).execute()
        return {
            "status": "success",
            "meetings": res.data or []
        }
    except Exception as exc:
        logger.error(f"Failed to list meetings: {exc}")
        return {
            "status": "success",
            "meetings": []
        }


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_and_process_meeting(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id")
):
    """API endpoint to upload meeting audio and queue processing asynchronously in background."""
    logger.info(f"Received audio upload request for meeting: '{title}' ({file.filename})")

    target_user_id = user_id or x_user_id
    if not target_user_id and authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1]
        try:
            user_response = supabase_service.client.auth.get_user(token)
            if user_response and user_response.user:
                target_user_id = user_response.user.id
        except Exception:
            pass

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided.")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded audio file is empty.")

    try:
        from pipeline.ingestion.audio_processor import AudioProcessor
        AudioProcessor.validate_audio_file(contents, file.filename)
    except Exception as val_err:
        logger.warning(f"Validation error during audio upload: {val_err}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))

    meeting_id = str(uuid.uuid4())
    meeting_data = {
        "id": meeting_id,
        "title": title,
        "description": description or "",
        "status": "processing",
        "duration_seconds": 0
    }
    if target_user_id:
        if hasattr(supabase_service, "ensure_user_exists"):
            supabase_service.ensure_user_exists(target_user_id)
        meeting_data["created_by"] = target_user_id

    logger.info(f"Pre-inserting meeting record '{meeting_id}' into Supabase DB...")
    try:
        meeting_record = supabase_service.insert("meetings", meeting_data)
    except Exception as insert_err:
        err_str = str(insert_err).lower()
        if "meetings_created_by_fkey" in err_str or "foreign key constraint" in err_str or "23503" in err_str:
            logger.warning(f"Foreign key constraint notice for user '{target_user_id}'. Retrying without created_by link...")
            meeting_data.pop("created_by", None)
            meeting_record = supabase_service.insert("meetings", meeting_data)
        else:
            logger.error(f"Failed to pre-insert meeting record: {insert_err}")
            meeting_record = {"id": meeting_id}

    created_id = meeting_record.get("id") or meeting_id

    background_tasks.add_task(
        _run_background_pipeline,
        meeting_id=created_id,
        file_bytes=contents,
        filename=file.filename,
        title=title,
        description=description,
        user_id=target_user_id
    )

    logger.info(f"Queued background processing for meeting '{created_id}'. Returning 201 Created immediately.")

    return {
        "status": "success",
        "message": "Meeting audio uploaded. Processing started in background.",
        "meeting_id": created_id,
        "id": created_id,
        "title": title,
        "status_detail": "processing"
    }


@router.get("/{meeting_id}", status_code=status.HTTP_200_OK)
async def get_meeting_details(meeting_id: str):
    """Fetches complete meeting record, transcripts, summary, tasks, and decisions."""
    logger.info(f"Fetching details for meeting ID: '{meeting_id}'")

    meeting_res = supabase_service.client.table("meetings").select("*").eq("id", meeting_id).execute()
    if not meeting_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found.")

    meeting = meeting_res.data[0]

    # Fetch Transcripts
    transcripts_res = supabase_service.client.table("transcripts").select("*").eq("meeting_id", meeting_id).order("start_time").execute()
    transcripts = transcripts_res.data or []

    # Fetch Summaries
    try:
        summary_res = supabase_service.client.table("summaries").select("*").eq("meeting_id", meeting_id).execute()
        summary = summary_res.data[0] if summary_res.data else None
    except Exception as sum_err:
        logger.warning(f"Summaries table lookup warning (Schema cache issue): {sum_err}. Using meeting record summary fallback.")
        summary = {
            "executive_summary": meeting.get("description", "No summary available."),
            "key_discussion_points": []
        }

    # Fetch Tasks
    tasks_res = supabase_service.client.table("tasks").select("*").eq("meeting_id", meeting_id).execute()
    tasks = tasks_res.data or []

    # Fetch Decisions
    decisions_res = supabase_service.client.table("decisions").select("*").eq("meeting_id", meeting_id).execute()
    decisions = decisions_res.data or []

    return {
        "status": "success",
        "meeting": meeting,
        "transcripts": transcripts,
        "summary": summary,
        "tasks": tasks,
        "decisions": decisions
    }


@router.patch("/{meeting_id}/speakers", status_code=status.HTTP_200_OK)
async def rename_meeting_speakers(meeting_id: str, request: SpeakerRenameRequest):
    """Renames speaker labels across transcript utterances for a meeting."""
    logger.info(f"Renaming speakers for meeting '{meeting_id}': {request.speaker_map}")

    if not request.speaker_map:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Speaker map cannot be empty.")

    updated_count = 0
    for old_speaker, new_speaker in request.speaker_map.items():
        if not new_speaker or not new_speaker.strip():
            continue

        res = supabase_service.client.table("transcripts") \
            .update({"speaker": new_speaker.strip()}) \
            .eq("meeting_id", meeting_id) \
            .eq("speaker", old_speaker) \
            .execute()

        if res.data:
            updated_count += len(res.data)

    logger.info(f"Updated {updated_count} transcript utterance speaker labels for meeting '{meeting_id}'.")
    return {
        "status": "success",
        "meeting_id": meeting_id,
        "updated_utterances": updated_count,
        "speaker_map": request.speaker_map
    }


@router.post("/{meeting_id}/analyze", status_code=status.HTTP_200_OK)
async def analyze_meeting(meeting_id: str):
    """Runs LLM pipeline to extract executive summary, action items, and decisions."""
    logger.info(f"Received analysis request for meeting ID: '{meeting_id}'")

    try:
        result = extraction_pipeline.analyze_meeting(meeting_id)
        return {
            "status": "success",
            "meeting_id": meeting_id,
            "analysis": result
        }

    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))
    except Exception as exc:
        logger.error(f"Failed to analyze meeting '{meeting_id}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Meeting analysis failed: {str(exc)}"
        )


@router.delete("/{meeting_id}", status_code=status.HTTP_200_OK)
async def delete_meeting(meeting_id: str):
    """Deletes meeting record and associated transcripts, summaries, tasks, and decisions."""
    logger.info(f"Received delete request for meeting ID: '{meeting_id}'")

    try:
        # Delete related child records
        for table in ["transcripts", "tasks", "decisions", "summaries", "participants"]:
            try:
                supabase_service.client.table(table).delete().eq("meeting_id", meeting_id).execute()
            except Exception:
                pass

        # Delete meeting record
        supabase_service.client.table("meetings").delete().eq("id", meeting_id).execute()

        logger.info(f"Successfully deleted meeting record '{meeting_id}' and related sub-entities.")
        return {
            "status": "success",
            "message": f"Meeting '{meeting_id}' deleted successfully.",
            "meeting_id": meeting_id
        }
    except Exception as exc:
        logger.error(f"Failed to delete meeting '{meeting_id}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete meeting: {str(exc)}"
        )
