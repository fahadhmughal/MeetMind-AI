"""AI Model configuration for Gemini and OpenRouter providers."""

from typing import Final

# Primary AI Provider Model Slugs
PRIMARY_GEMINI_MODEL: Final[str] = "gemini-3.5-flash-lite"
FALLBACK_GEMINI_MODEL: Final[str] = "gemini-3.5-flash-lite"

# OpenRouter Fallback Model Slugs
OPENROUTER_PRIMARY_MODEL: Final[str] = "meta-llama/llama-3.3-70b-instruct:free"
OPENROUTER_FALLBACK_MODEL: Final[str] = "google/gemini-2.5-flash"

# Default Model Generation Parameters
DEFAULT_TEMPERATURE: Final[float] = 0.2
DEFAULT_MAX_OUTPUT_TOKENS: Final[int] = 2048
REQUEST_TIMEOUT_SECONDS: Final[float] = 30.0
