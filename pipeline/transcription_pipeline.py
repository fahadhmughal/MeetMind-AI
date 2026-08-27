"""Transcription Pipeline orchestrating audio ingestion, AssemblyAI transcription, and DB persistence."""

import os
import json
import uuid
import tempfile
from typing import Dict, Any, List, Optional
from api.supabase_client import supabase_service
from models.providers.assemblyai_provider import AssemblyAIProvider, Utterance
from models.llm_factory import LLMFactory
from pipeline.ingestion.audio_processor import AudioProcessor, AudioValidationError
from pipeline.extraction_schemas import CleanedTranscript
from pipeline.prompts.transcript_cleanup_prompt import TRANSCRIPT_CLEANUP_PROMPT
from utils.logger import get_logger
from utils.text_cleaner import strip_devanagari

logger = get_logger(__name__)


class TranscriptionPipeline:
    """Orchestrates end-to-end meeting audio ingestion, denoising, transcription, and cleanup."""

    def __init__(
        self,
        assemblyai_provider: Optional[AssemblyAIProvider] = None,
        supabase_client: Optional[Any] = None,
        llm_factory: Optional[LLMFactory] = None
    ):
        self._assemblyai_provider = assemblyai_provider
        self.supabase = supabase_client or supabase_service
        self._llm_factory = llm_factory

    @property
    def assemblyai_provider(self) -> AssemblyAIProvider:
        if self._assemblyai_provider is None:
            self._assemblyai_provider = AssemblyAIProvider()
        return self._assemblyai_provider

    @assemblyai_provider.setter
    def assemblyai_provider(self, value: AssemblyAIProvider) -> None:
        self._assemblyai_provider = value

    @property
    def llm_factory(self) -> LLMFactory:
        if self._llm_factory is None:
            self._llm_factory = LLMFactory()
        return self._llm_factory

    @llm_factory.setter
    def llm_factory(self, value: LLMFactory) -> None:
        self._llm_factory = value

    def clean_transcript(self, raw_utterances: List[Utterance]) -> List[Utterance]:
        """Runs post-transcription LLM cleanup to remove speech noise artifacts.

        If cleanup fails or returns invalid structure, logs failure and returns raw_utterances.
        """
        if not raw_utterances:
            return []

        try:
            utterance_dicts = [u.to_dict() for u in raw_utterances]
            prompt = TRANSCRIPT_CLEANUP_PROMPT.format(
                transcript_json=json.dumps(utterance_dicts, indent=2)
            )
            logger.info("Executing post-transcription transcript cleanup LLM pass...")

            cleaned_res: CleanedTranscript = self.llm_factory.generate_structured(
                prompt=prompt,
                response_schema=CleanedTranscript
            )

            if not cleaned_res.utterances:
                logger.warning("Transcript cleanup returned 0 utterances. Falling back to raw transcript.")
                return raw_utterances

            cleaned_utterances: List[Utterance] = []
            for idx, raw_u in enumerate(raw_utterances):
                if idx < len(cleaned_res.utterances):
                    cu = cleaned_res.utterances[idx]
                    cleaned_content = strip_devanagari(cu.content) or raw_u.content
                    cleaned_utterances.append(Utterance(
                        speaker=raw_u.speaker,
                        content=cleaned_content,
                        start_time=raw_u.start_time,
                        end_time=raw_u.end_time
                    ))
                else:
                    cleaned_utterances.append(raw_u)

            logger.info(f"Transcript cleanup completed successfully for {len(cleaned_utterances)} utterances.")
            return cleaned_utterances

        except Exception as exc:
            logger.warning(f"Post-transcription transcript cleanup failed: {exc}. Falling back to raw transcript.")
            return raw_utterances

    def process_meeting_audio(
        self,
        file_bytes: bytes,
        file_name: str,
        title: str,
        description: Optional[str] = None,
        user_id: Optional[str] = None,
        existing_meeting_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Executes full transcription pipeline: validation -> denoising -> upload -> transcribe -> cleanup -> persist.

        Returns:
            Dictionary containing meeting_id, status, duration_seconds, and utterances.
        """
        logger.info(f"Starting Transcription Pipeline for meeting '{title}' (file: {file_name})")

        # Step 1: Validate Audio File
        AudioProcessor.validate_audio_file(file_bytes, file_name)

        # Step 2: Backend Denoising Pass
        denoised_bytes = AudioProcessor.denoise_audio(file_bytes, file_name)

        # Step 3: Storage Upload & Initial DB Record
        file_uuid = uuid.uuid4()
        original_storage_filename = f"original_{file_uuid}_{file_name}"
        denoised_storage_filename = f"denoised_{file_uuid}_{file_name}"

        logger.info(f"Uploading original audio to Supabase Storage as '{original_storage_filename}'...")
        try:
            self.supabase.upload_audio(original_storage_filename, file_bytes)
        except Exception as exc:
            logger.warning(f"Failed to upload original audio backup to Supabase Storage: {exc}")

        logger.info(f"Uploading denoised audio to Supabase Storage as '{denoised_storage_filename}'...")
        try:
            self.supabase.upload_audio(denoised_storage_filename, denoised_bytes)
            audio_url = self.supabase.get_audio_download_url(denoised_storage_filename)
        except Exception as exc:
            logger.error(f"Failed to upload denoised audio to Supabase Storage: {exc}")
            raise exc

        if existing_meeting_id:
            meeting_id = existing_meeting_id
            try:
                self.supabase.client.table("meetings").update({
                    "audio_url": denoised_storage_filename
                }).eq("id", meeting_id).execute()
            except Exception as upd_err:
                logger.warning(f"Notice updating audio_url for existing meeting '{meeting_id}': {upd_err}")
        else:
            # Create meeting record in DB (status='processing')
            meeting_data = {
                "title": title,
                "description": description or "",
                "status": "processing",
                "audio_url": denoised_storage_filename,
                "duration_seconds": 0
            }
            if user_id:
                if hasattr(self.supabase, "ensure_user_exists"):
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

        # Step 4: AssemblyAI Transcription using denoised audio
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file_name)[1]) as temp_file:
                temp_file.write(denoised_bytes)
                temp_file_path = temp_file.name

            try:
                raw_utterances: List[Utterance] = self.assemblyai_provider.transcribe_audio(temp_file_path)
            finally:
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)

            # Step 5: Transcript Cleanup Pass
            cleaned_utterances = self.clean_transcript(raw_utterances)

            # Calculate total duration from last utterance timestamp
            duration_sec = int(cleaned_utterances[-1].end_time) if cleaned_utterances else 0

            # Step 6: Persist Participants and Transcripts
            unique_speakers = sorted(list({u.speaker for u in raw_utterances}))
            logger.info(f"Extracting {len(unique_speakers)} participants: {unique_speakers}")

            for speaker in unique_speakers:
                self.supabase.insert("participants", {
                    "meeting_id": meeting_id,
                    "name": speaker,
                    "speaker_label": speaker
                })

            for raw_u, clean_u in zip(raw_utterances, cleaned_utterances):
                clean_text = strip_devanagari(clean_u.content) or clean_u.content
                raw_text = raw_u.content
                transcript_data = {
                    "meeting_id": meeting_id,
                    "speaker": clean_u.speaker,
                    "content": clean_text,
                    "raw_content": raw_text,
                    "start_time": clean_u.start_time,
                    "end_time": clean_u.end_time
                }
                try:
                    self.supabase.insert("transcripts", transcript_data)
                except Exception as insert_err:
                    err_str = str(insert_err).lower()
                    if "raw_content" in err_str or "pgrst204" in err_str or "schema cache" in err_str:
                        logger.warning("Supabase 'transcripts' table does not have 'raw_content' column yet. Retrying insert without 'raw_content'...")
                        transcript_data.pop("raw_content", None)
                        self.supabase.insert("transcripts", transcript_data)
                    else:
                        raise insert_err

            # Step 7: Update Meeting Status to 'completed'
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
                "utterances": [u.to_dict() for u in cleaned_utterances]
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
        user_id: Optional[str] = None,
        existing_meeting_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Wrapper method providing backwards-compatibility for audio upload calls."""
        target_filename = filename or file_name or "recording.wav"
        return self.process_meeting_audio(
            file_bytes=file_bytes,
            file_name=target_filename,
            title=title,
            description=description,
            user_id=user_id,
            existing_meeting_id=existing_meeting_id
        )


# Global pipeline instance
transcription_pipeline = TranscriptionPipeline()
