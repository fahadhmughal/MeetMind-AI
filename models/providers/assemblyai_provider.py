"""AssemblyAI Speech-to-Text Provider with Speaker Diarization."""

import os
import assemblyai as aai
from typing import List, Dict, Any, Optional
from config.settings import settings
from utils.logger import get_logger

logger = get_logger(__name__)


class Utterance:
    """Represents a single speaker utterance with timestamps."""

    def __init__(self, speaker: str, content: str, start_time: float, end_time: float):
        self.speaker: str = speaker
        self.content: str = content
        self.start_time: float = start_time  # In seconds
        self.end_time: float = end_time      # In seconds

    def to_dict(self) -> Dict[str, Any]:
        return {
            "speaker": self.speaker,
            "content": self.content,
            "start_time": round(self.start_time, 2),
            "end_time": round(self.end_time, 2)
        }


class AssemblyAIProvider:
    """Wrapper around AssemblyAI SDK for audio transcription with speaker diarization."""

    def __init__(self, api_key: Optional[str] = None):
        key = api_key or settings.assemblyai_api_key
        if not key or "your-assemblyai" in key:
            raise ValueError("ASSEMBLYAI_API_KEY must be configured in .env")
        aai.settings.api_key = key
        self.transcriber = aai.Transcriber()
        logger.info("AssemblyAIProvider initialized successfully.")

    def transcribe_audio(self, audio_source: str) -> List[Utterance]:
        """Transcribes an audio file or URL and returns speaker-labeled utterances.

        Args:
            audio_source: Local file path or accessible remote URL.

        Returns:
            List of Utterance objects with speaker, text, and start/end timestamps.
        """
        logger.info(f"Starting AssemblyAI transcription for source: {audio_source}")

        # Enable speaker diarization
        config = aai.TranscriptionConfig(
            speaker_labels=True,
            punctuate=True,
            format_text=True
        )

        try:
            transcript = self.transcriber.transcribe(audio_source, config=config)

            if transcript.status == aai.TranscriptStatus.error:
                err_msg = str(transcript.error)
                logger.error(f"AssemblyAI transcription error: {err_msg}")

                if "no spoken audio" in err_msg.lower() or "no speech" in err_msg.lower():
                    logger.warning("No spoken audio detected by AssemblyAI. Providing silent fallback utterance.")
                    return [
                        Utterance(
                            speaker="Speaker 1",
                            content="[No speech detected in recorded audio. Please ensure microphone is unmuted and speak clearly.]",
                            start_time=0.0,
                            end_time=1.0
                        )
                    ]

                raise RuntimeError(f"AssemblyAI transcription failed: {err_msg}")

            utterances: List[Utterance] = []

            if transcript.utterances:
                for u in transcript.utterances:
                    # AssemblyAI timestamps are in milliseconds -> convert to seconds
                    start_sec = u.start / 1000.0
                    end_sec = u.end / 1000.0
                    speaker_label = f"Speaker {u.speaker}" if isinstance(u.speaker, str) else f"Speaker {u.speaker}"

                    utterances.append(Utterance(
                        speaker=speaker_label,
                        content=u.text,
                        start_time=start_sec,
                        end_time=end_sec
                    ))
            elif transcript.text:
                # Fallback if diarization returns a single block text
                utterances.append(Utterance(
                    speaker="Speaker 1",
                    content=transcript.text,
                    start_time=0.0,
                    end_time=0.0
                ))
            else:
                utterances.append(Utterance(
                    speaker="Speaker 1",
                    content="[No speech detected in recorded audio. Please ensure microphone is unmuted and speak clearly.]",
                    start_time=0.0,
                    end_time=1.0
                ))

            logger.info(f"AssemblyAI transcription complete. Extracted {len(utterances)} utterances.")
            return utterances

        except Exception as exc:
            exc_str = str(exc).lower()
            if "no spoken audio" in exc_str or "no speech" in exc_str:
                logger.warning("Captured 'no spoken audio' exception. Returning fallback utterance.")
                return [
                    Utterance(
                        speaker="Speaker 1",
                        content="[No speech detected in recorded audio. Please ensure microphone is unmuted and speak clearly.]",
                        start_time=0.0,
                        end_time=1.0
                    )
                ]
            logger.error(f"AssemblyAI transcription exception: {exc}")
            raise exc
