"""Transcription Pipeline orchestrating audio ingestion, AssemblyAI transcription, and DB persistence."""

import os
import uuid
import tempfile
from typing import Dict, Any, List, Optional
from api.supabase_client import supabase_service
from models.providers.assemblyai_provider import AssemblyAIProvider, Utterance
from pipeline.ingestion.audio_processor import AudioProcessor, AudioValidationError
from utils.logger import get_logger
from utils.text_cleaner import strip_devanagari

logger = get_logger(__name__)


class TranscriptionPipeline:
    """Orchestrates end-to-end meeting audio ingestion and transcription."""

    def __init__(
        self,
        assemblyai_provider: Optional[AssemblyAIProvider] = None,
        supabase_client: Optional[Any] = None
    ):
        self.assemblyai_provider = assemblyai_provider or AssemblyAIProvider()
        self.supabase = supabase_client or supabase_service

    def process_meeting_audio(
        self,
        file_bytes: bytes,
        file_name: str,
        title: str,
        description: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Executes full transcription pipeline: upload -> transcribe -> persist.

        Returns:
            Dictionary containing meeting_id, status, duration_seconds, and utterances.
        """
        logger.info(f"Starting Transcription Pipeline for meeting '{title}' (file: {file_name})")

        # Step 1: Validate Audio File
        AudioProcessor.validate_audio_file(file_bytes, file_name)

        # Step 2: Storage Upload & Initial DB Record
        storage_filename = f"{uuid.uuid4()}_{file_name}"
        logger.info(f"Uploading audio file to Supabase Storage as '{storage_filename}'...")
        
        try:
            self.supabase.upload_audio(storage_filename, file_bytes)
            audio_url = self.supabase.get_audio_download_url(storage_filename)
        except Exception as exc:
            logger.error(f"Failed to upload audio to Supabase Storage: {exc}")
            raise exc

        # Create meeting record in DB (status='processing')
        meeting_data = {
            "title": title,
            "description": description or "",
            "status": "processing",
            "audio_url": storage_filename,
            "duration_seconds": 0
        }
        if user_id:
            self.supabase.ensure_user_exists(user_id)
            meeting_data["created_by"] = user_id

        logger.info("Inserting initial meeting record into Supabase DB...")
        try:
            meeting_record = self.supabase.insert("meetings", meeting_data)
        except Exception as insert_err:
            err_str = str(insert_err).lower()
            if "meetings_created_by_fkey" in err_str or "foreign key constraint" in err_str or "23503" in err_str:
                logger.warning(f"Foreign key constraint notice for user '{user_id}'. Retrying meeting insertion without created_by link...")
                meeting_data.pop("created_by", None)
                meeting_record = self.supabase.insert("meetings", meeting_data)
            else:
                raise insert_err

        meeting_id = meeting_record.get("id")

        # Step 3: AssemblyAI Transcription
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file_name)[1]) as temp_file:
                temp_file.write(file_bytes)
                temp_file_path = temp_file.name

            try:
                utterances: List[Utterance] = self.assemblyai_provider.transcribe_audio(temp_file_path)
            finally:
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)

            # Calculate total duration from last utterance timestamp
            duration_sec = int(utterances[-1].end_time) if utterances else 0

            # Step 4: Persist Participants and Transcripts
            unique_speakers = sorted(list({u.speaker for u in utterances}))
            logger.info(f"Extracting {len(unique_speakers)} participants: {unique_speakers}")

            for speaker in unique_speakers:
                self.supabase.insert("participants", {
                    "meeting_id": meeting_id,
                    "name": speaker,
                    "speaker_label": speaker
                })

            for u in utterances:
                clean_content = strip_devanagari(u.content) or u.content
                self.supabase.insert("transcripts", {
                    "meeting_id": meeting_id,
                    "speaker": u.speaker,
                    "content": clean_content,
                    "start_time": u.start_time,
                    "end_time": u.end_time
                })

            # Step 5: Update Meeting Status to 'completed'
            self.supabase.client.table("meetings").update({
                "status": "completed",
                "duration_seconds": duration_sec
            }).eq("id", meeting_id).execute()

            logger.info(f"Transcription Pipeline completed successfully for meeting ID: {meeting_id}")

            return {
                "meeting_id": meeting_id,
                "title": title,
                "status": "completed",
                "duration_seconds": duration_sec,
                "utterances": [u.to_dict() for u in utterances]
            }

        except Exception as exc:
            logger.error(f"Error in transcription pipeline for meeting {meeting_id}: {exc}")
            if meeting_id:
                try:
                    self.supabase.client.table("meetings").update({
                        "status": "failed"
                    }).eq("id", meeting_id).execute()
                except Exception:
                    pass
            raise exc

    def process_audio_upload(
        self,
        file_bytes: bytes,
        filename: Optional[str] = None,
        file_name: Optional[str] = None,
        title: str = "Meeting",
        description: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Wrapper method providing backwards-compatibility for audio upload calls."""
        target_filename = filename or file_name or "recording.wav"
        return self.process_meeting_audio(
            file_bytes=file_bytes,
            file_name=target_filename,
            title=title,
            description=description,
            user_id=user_id
        )


# Global pipeline instance
transcription_pipeline = TranscriptionPipeline()
