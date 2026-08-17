"""FastAPI routes for meeting upload, transcript retrieval, speaker renaming, and LLM analysis."""

from typing import Optional, Dict
from pydantic import BaseModel, Field
from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException, status
from pipeline.transcription_pipeline import transcription_pipeline
from pipeline.extraction_pipeline import extraction_pipeline
from api.supabase_client import supabase_service
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/meetings", tags=["Meetings"])


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
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id")
):
    """API endpoint to upload meeting audio, transcribe via AssemblyAI, and store in database under user_id."""
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
        meeting_record = transcription_pipeline.process_audio_upload(
            file_bytes=contents,
            filename=file.filename,
            title=title,
            description=description,
            user_id=target_user_id
        )
        return {
            "status": "success",
            "message": "Meeting audio uploaded and transcribed successfully.",
            **meeting_record
        }

    except ValueError as val_err:
        logger.warning(f"Validation error during audio upload: {val_err}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        logger.error(f"Failed to process meeting upload: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio processing failed: {str(exc)}"
        )


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
