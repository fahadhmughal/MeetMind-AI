"""Unit tests for AudioProcessor validation and transcript stitching logic."""

import pytest
from pipeline.ingestion.audio_processor import AudioProcessor, AudioValidationError
from models.providers.assemblyai_provider import Utterance


def test_validate_audio_file_success():
    valid_bytes = b"RIFF....WAVEfmt ...."
    AudioProcessor.validate_audio_file(valid_bytes, "sample_meeting.wav")


def test_validate_audio_file_empty_rejection():
    with pytest.raises(AudioValidationError, match="is empty"):
        AudioProcessor.validate_audio_file(b"", "empty.mp3")


def test_validate_audio_file_invalid_extension():
    with pytest.raises(AudioValidationError, match="Unsupported audio format"):
        AudioProcessor.validate_audio_file(b"data", "document.pdf")


def test_stitch_transcripts_cumulative_offsets():
    chunk1 = [
        Utterance("Speaker A", "Hello everyone", 0.0, 5.0),
        Utterance("Speaker B", "Hi there", 5.5, 10.0)
    ]
    chunk2 = [
        Utterance("Speaker A", "Let's review the agenda", 0.0, 4.0),
        Utterance("Speaker B", "Sounds good", 4.5, 8.0)
    ]

    durations = [12.0, 10.0]
    stitched = AudioProcessor.stitch_transcripts([chunk1, chunk2], durations)

    assert len(stitched) == 4
    # Chunk 1 timestamps remain unchanged
    assert stitched[0].start_time == 0.0
    assert stitched[0].end_time == 5.0
    assert stitched[1].start_time == 5.5
    assert stitched[1].end_time == 10.0

    # Chunk 2 timestamps shifted by chunk 1 duration (12.0s)
    assert stitched[2].start_time == 12.0  # 0.0 + 12.0
    assert stitched[2].end_time == 16.0    # 4.0 + 12.0
    assert stitched[3].start_time == 16.5  # 4.5 + 12.0
    assert stitched[3].end_time == 20.0    # 8.0 + 12.0
