"""Audio file ingestion, validation, chunking, and transcript stitching utility."""

import os
from typing import List, Dict, Any, Tuple
from models.providers.assemblyai_provider import Utterance
from utils.logger import get_logger

logger = get_logger(__name__)

ALLOWED_EXTENSIONS: set[str] = {".mp3", ".wav", ".m4a", ".webm", ".ogg", ".aac", ".flac"}
MAX_FILE_SIZE_BYTES: int = 500 * 1024 * 1024  # 500 MB limit


class AudioValidationError(Exception):
    """Raised when an uploaded audio file is invalid, empty, or corrupted."""
    pass


class AudioProcessor:
    """Handles validation, duration calculation, chunking, and transcript stitching."""

    @staticmethod
    def validate_audio_file(file_bytes: bytes, file_name: str) -> None:
        """Validates that audio file is non-empty, within size limits, and has allowed extension."""
        if not file_bytes or len(file_bytes) == 0:
            logger.error(f"Validation failed for '{file_name}': File is empty (0 bytes).")
            raise AudioValidationError(f"Audio file '{file_name}' is empty (0 bytes).")

        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            logger.error(f"Validation failed for '{file_name}': Exceeds max size limit.")
            raise AudioValidationError(f"Audio file '{file_name}' exceeds 500MB size limit.")

        ext = os.path.splitext(file_name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            logger.error(f"Validation failed for '{file_name}': Unsupported format '{ext}'.")
            raise AudioValidationError(
                f"Unsupported audio format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )

        logger.info(f"Audio file '{file_name}' ({len(file_bytes)} bytes) validated successfully.")

    @staticmethod
    def stitch_transcripts(
        chunks_utterances: List[List[Utterance]],
        chunk_durations: List[float]
    ) -> List[Utterance]:
        """Stitches multiple chunk utterance lists into one continuous timestamped timeline.

        Args:
            chunks_utterances: List of Utterance lists, one per chunk.
            chunk_durations: List of durations in seconds for each chunk.

        Returns:
            Unified List of Utterance objects with cumulative time offsets applied.
        """
        stitched: List[Utterance] = []
        cumulative_offset: float = 0.0

        for idx, (chunk_utterances, duration) in enumerate(zip(chunks_utterances, chunk_durations)):
            logger.info(
                f"Stitching chunk #{idx + 1}: Applying offset {cumulative_offset:.2f}s "
                f"to {len(chunk_utterances)} utterances."
            )
            for u in chunk_utterances:
                stitched.append(Utterance(
                    speaker=u.speaker,
                    content=u.content,
                    start_time=u.start_time + cumulative_offset,
                    end_time=u.end_time + cumulative_offset
                ))
            cumulative_offset += duration

        logger.info(f"Successfully stitched {len(stitched)} total utterances across {len(chunks_utterances)} chunks.")
        return stitched
