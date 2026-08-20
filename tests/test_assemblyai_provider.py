"""Unit tests for AssemblyAIProvider speech-to-text integration."""

import pytest
from unittest.mock import MagicMock, patch
from models.providers.assemblyai_provider import AssemblyAIProvider, Utterance


@patch("models.providers.assemblyai_provider.aai.Transcriber")
def test_assemblyai_transcribe_success(mock_transcriber_class):
    mock_transcriber = MagicMock()
    mock_transcript = MagicMock()
    mock_transcript.status = "completed"

    mock_u1 = MagicMock()
    mock_u1.speaker = "A"
    mock_u1.text = "Welcome to the meeting."
    mock_u1.start = 1000  # 1.0s
    mock_u1.end = 4000    # 4.0s

    mock_u2 = MagicMock()
    mock_u2.speaker = "B"
    mock_u2.text = "Thanks for organizing."
    mock_u2.start = 4500  # 4.5s
    mock_u2.end = 7500    # 7.5s

    mock_transcript.utterances = [mock_u1, mock_u2]
    mock_transcriber.transcribe.return_value = mock_transcript
    mock_transcriber_class.return_value = mock_transcriber

    provider = AssemblyAIProvider(api_key="test_key")
    utterances = provider.transcribe_audio("dummy_path.wav")

    assert len(utterances) == 2
    assert utterances[0].speaker == "Speaker A"
    assert utterances[0].content == "Welcome to the meeting."
    assert utterances[0].start_time == 1.0
    assert utterances[0].end_time == 4.0

    assert utterances[1].speaker == "Speaker B"
    assert utterances[1].start_time == 4.5
    assert utterances[1].end_time == 7.5
