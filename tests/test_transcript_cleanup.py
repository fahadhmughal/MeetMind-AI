"""Unit tests for transcript cleanup LLM pass and graceful fallback handling."""

import pytest
from unittest.mock import MagicMock
from models.providers.assemblyai_provider import Utterance
from pipeline.transcription_pipeline import TranscriptionPipeline
from pipeline.extraction_schemas import CleanedTranscript, CleanedUtterance


def test_clean_transcript_removes_noise_and_preserves_metadata():
    mock_llm_factory = MagicMock()
    mock_llm_factory.generate_structured.return_value = CleanedTranscript(
        utterances=[
            CleanedUtterance(speaker="Speaker 1", content="Let's start the meeting.", start_time=0.0, end_time=2.5),
            CleanedUtterance(speaker="Speaker 2", content="Status update is ready.", start_time=3.0, end_time=6.0)
        ]
    )

    pipeline = TranscriptionPipeline(
        assemblyai_provider=MagicMock(),
        supabase_client=MagicMock(),
        llm_factory=mock_llm_factory
    )

    raw_utterances = [
        Utterance("Speaker 1", "Um uh let's start start the meeting.", 0.0, 2.5),
        Utterance("Speaker 2", "Status update is um ready.", 3.0, 6.0)
    ]

    cleaned = pipeline.clean_transcript(raw_utterances)

    assert len(cleaned) == 2
    assert cleaned[0].speaker == "Speaker 1"
    assert cleaned[0].content == "Let's start the meeting."
    assert cleaned[0].start_time == 0.0
    assert cleaned[0].end_time == 2.5

    assert cleaned[1].speaker == "Speaker 2"
    assert cleaned[1].content == "Status update is ready."
    assert cleaned[1].start_time == 3.0
    assert cleaned[1].end_time == 6.0


def test_clean_transcript_unchanged_for_clean_input():
    mock_llm_factory = MagicMock()
    mock_llm_factory.generate_structured.return_value = CleanedTranscript(
        utterances=[
            CleanedUtterance(speaker="Speaker 1", content="The deployment was successful.", start_time=1.0, end_time=4.0)
        ]
    )

    pipeline = TranscriptionPipeline(
        assemblyai_provider=MagicMock(),
        supabase_client=MagicMock(),
        llm_factory=mock_llm_factory
    )

    raw_utterances = [
        Utterance("Speaker 1", "The deployment was successful.", 1.0, 4.0)
    ]

    cleaned = pipeline.clean_transcript(raw_utterances)

    assert len(cleaned) == 1
    assert cleaned[0].content == "The deployment was successful."
    assert cleaned[0].speaker == "Speaker 1"
    assert cleaned[0].start_time == 1.0
    assert cleaned[0].end_time == 4.0


def test_clean_transcript_fallback_on_llm_failure():
    mock_llm_factory = MagicMock()
    mock_llm_factory.generate_structured.side_effect = RuntimeError("Rate limit exceeded")

    pipeline = TranscriptionPipeline(
        assemblyai_provider=MagicMock(),
        supabase_client=MagicMock(),
        llm_factory=mock_llm_factory
    )

    raw_utterances = [
        Utterance("Speaker 1", "Um test message.", 0.0, 2.0)
    ]

    # Must fall back gracefully to raw utterances without crashing
    cleaned = pipeline.clean_transcript(raw_utterances)

    assert len(cleaned) == 1
    assert cleaned[0].content == "Um test message."
    assert cleaned[0].speaker == "Speaker 1"
