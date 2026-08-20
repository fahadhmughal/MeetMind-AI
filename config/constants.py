"""Application constants for MeetMind AI Backend."""

import os
from pathlib import Path

# Paths
BASE_DIR: Path = Path(__file__).resolve().parent.parent
LOG_DIR: Path = BASE_DIR / "logs"

# Key Manager Retry & Backoff Configuration
DEFAULT_MAX_RETRIES_PER_KEY: int = 3
MAX_KEY_RETRIES: int = DEFAULT_MAX_RETRIES_PER_KEY
INITIAL_BACKOFF_SECONDS: float = 1.0
BACKOFF_EXPONENT_FACTOR: float = 2.0
KEY_COOLDOWN_SECONDS: float = 60.0

# CORS Allowed Origins
DEFAULT_CORS_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:3000",
]

# Audio Storage Bucket
AUDIO_BUCKET_NAME: str = "meeting-audio"

# HTTP Status Codes for Rate Limiting & Auth Errors
RATE_LIMIT_HTTP_CODES: set[int] = {429, 402}
