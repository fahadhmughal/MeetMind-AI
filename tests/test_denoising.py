"""Unit tests for FFmpeg audio denoising and graceful fallback."""

import os
import pytest
from unittest.mock import patch, MagicMock
from pipeline.ingestion.audio_processor import AudioProcessor


def test_denoise_audio_success():
    fake_input_bytes = b"RIFF1234WAVEfmt "
    fake_denoised_bytes = b"RIFF5678WAVEfmt_DENOISED"

    def mock_run(cmd, stdout=None, stderr=None, timeout=None):
        output_file = cmd[-1]
        with open(output_file, "wb") as f:
            f.write(fake_denoised_bytes)
        res = MagicMock()
        res.returncode = 0
        res.stderr = b""
        return res

    with patch("subprocess.run", side_effect=mock_run):
        result = AudioProcessor.denoise_audio(fake_input_bytes, "test.wav")
        assert result == fake_denoised_bytes


def test_denoise_audio_fallback_on_ffmpeg_error():
    fake_input_bytes = b"RIFF1234WAVEfmt "

    with patch("subprocess.run", side_effect=FileNotFoundError("ffmpeg not found")):
        result = AudioProcessor.denoise_audio(fake_input_bytes, "test.wav")
        # Should gracefully fall back to original bytes on error
        assert result == fake_input_bytes


def test_denoise_audio_fallback_on_nonzero_exit():
    fake_input_bytes = b"RIFF1234WAVEfmt "

    res_mock = MagicMock()
    res_mock.returncode = 1
    res_mock.stderr = b"Invalid audio header"

    with patch("subprocess.run", return_value=res_mock):
        result = AudioProcessor.denoise_audio(fake_input_bytes, "corrupted.wav")
        assert result == fake_input_bytes
