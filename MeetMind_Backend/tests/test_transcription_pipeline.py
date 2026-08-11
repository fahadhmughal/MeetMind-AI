"""Integration test for full end-to-end transcription pipeline."""

import pytest
from unittest.mock import MagicMock, patch
from pipeline.transcription_pipeline import TranscriptionPipeline
from models.providers.assemblyai_provider import Utterance


@patch("pipeline.transcription_pipeline.supabase_service")
@patch("pipeline.transcription_pipeline.AssemblyAIProvider")
def test_transcription_pipeline_end_to_end(mock_provider_class, mock_supabase):
    mock_provider = MagicMock()
    mock_provider.transcribe_audio.return_value = [
        Utterance("Speaker 1", "Let's begin the review.", 0.0, 3.5),
        Utterance("Speaker 2", "Project status is on track.", 4.0, 8.0)
    ]
    mock_provider_class.return_value = mock_provider

    mock_supabase.upload_audio.return_value = "meeting_123.wav"
    mock_supabase.get_audio_download_url.return_value = "https://supabase.co/signed/meeting_123.wav"
    mock_supabase.insert.side_effect = lambda table, data: {"id": "meeting-uuid-999", **data}

    pipeline = TranscriptionPipeline(
        assemblyai_provider=mock_provider,
        supabase_client=mock_supabase
    )

    audio_bytes = b"RIFF....WAVEfmt ...."
    result = pipeline.process_meeting_audio(
        file_bytes=audio_bytes,
        file_name="sample_meeting.wav",
        title="Weekly Sync Meeting",
        description="Team updates"
    )

    assert result["meeting_id"] == "meeting-uuid-999"
    assert result["status"] == "completed"
    assert result["duration_seconds"] == 8
    assert len(result["utterances"]) == 2
    assert result["utterances"][0]["speaker"] == "Speaker 1"
    assert result["utterances"][1]["speaker"] == "Speaker 2"

    mock_supabase.upload_audio.assert_called_once()
    mock_supabase.insert.assert_called()
