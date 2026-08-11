"""API Key Manager handling rotation, cooldowns, and fallback pools for LLM providers."""

import time
from typing import List, Optional, Callable, Any
from config.settings import settings
from config.constants import MAX_KEY_RETRIES, INITIAL_BACKOFF_SECONDS, BACKOFF_EXPONENT_FACTOR, KEY_COOLDOWN_SECONDS
from utils.logger import get_logger

logger = get_logger(__name__)


class APIKeyStatus:
    """Tracks state and cooldown for an individual API key."""

    def __init__(self, key: str, provider: str, index: int):
        self.key = key
        self.provider = provider
        self.index = index
        self.is_active = True
        self.cooldown_until = 0.0
        self.failure_count = 0

    @property
    def is_available(self) -> bool:
        """Returns True if the key is active and not currently in a cooldown window."""
        if not self.is_active:
            return False
        if time.time() < self.cooldown_until:
            return False
        return True

    def mark_failed(self, cooldown_seconds: float = KEY_COOLDOWN_SECONDS):
        """Puts the key into a temporary cooldown window after rate limit or error."""
        self.failure_count += 1
        self.cooldown_until = time.time() + cooldown_seconds
        logger.warning(
            f"Key [{self.provider.upper()} #{self.index}] marked temporarily unavailable for "
            f"{cooldown_seconds}s (Failures: {self.failure_count})"
        )


# Alias for backward compatibility in tests
KeyHealth = APIKeyStatus


class AllKeysExhaustedError(Exception):
    """Raised when all keys in primary and fallback pools are rate-limited or exhausted."""
    pass


class KeyManager:
    """Manages pools of Gemini and OpenRouter API keys with automatic rotation and retry logic."""

    def __init__(
        self,
        gemini_keys: Optional[List[str]] = None,
        openrouter_keys: Optional[List[str]] = None
    ):
        self.gemini_pool: List[APIKeyStatus] = []
        self.openrouter_pool: List[APIKeyStatus] = []
        self.max_retries_per_key = MAX_KEY_RETRIES

        self._initialize_pools(gemini_keys=gemini_keys, openrouter_keys=openrouter_keys)

    def _initialize_pools(
        self,
        gemini_keys: Optional[List[str]] = None,
        openrouter_keys: Optional[List[str]] = None
    ):
        """Loads non-placeholder keys from settings or parameter lists and builds provider pools."""
        g_keys = gemini_keys if gemini_keys is not None else settings.gemini_keys
        o_keys = openrouter_keys if openrouter_keys is not None else settings.openrouter_keys

        self.gemini_pool = []
        for i, key in enumerate(g_keys, 1):
            if key and not key.startswith("your-") and not key.startswith("placeholder"):
                self.gemini_pool.append(APIKeyStatus(key=key, provider="gemini", index=i))

        self.openrouter_pool = []
        for i, key in enumerate(o_keys, 1):
            if key and not key.startswith("your-") and not key.startswith("placeholder"):
                self.openrouter_pool.append(APIKeyStatus(key=key, provider="openrouter", index=i))

        logger.info(
            f"KeyManager initialized with {len(self.gemini_pool)} Gemini keys and "
            f"{len(self.openrouter_pool)} OpenRouter fallback keys."
        )

    def is_rate_limit_error(self, exception: Exception) -> bool:
        """Helper detecting 429 rate limit or quota exhaustion errors."""
        err_msg = str(exception).lower()
        rate_limit_indicators = [
            "429",
            "401",
            "404",
            "not_found",
            "not found",
            "unauthenticated",
            "invalid authentication credentials",
            "resource_exhausted",
            "quota",
            "rate limit",
            "too many requests"
        ]
        return any(indicator in err_msg for indicator in rate_limit_indicators)

    def execute_with_retry(
        self,
        func: Callable[[str, str], Any],
        provider: str = "gemini",
        *args: Any,
        **kwargs: Any
    ) -> Any:
        """Executes a function with an API key, retrying with exponential backoff on errors,
        and rotating keys on 429/quota exhaustion.
        """
        pool = self.gemini_pool if provider == "gemini" else self.openrouter_pool

        if not pool:
            if provider == "gemini" and self.openrouter_pool:
                logger.warning("Gemini pool empty. Falling back to OpenRouter pool.")
                return self.execute_with_retry(func, provider="openrouter", *args, **kwargs)
            raise AllKeysExhaustedError(f"No valid API keys configured for provider '{provider}'.")

        last_exception: Optional[Exception] = None

        for key_obj in pool:
            if not key_obj.is_available:
                continue

            logger.info(f"Using [{key_obj.provider.upper()} Key #{key_obj.index}]")

            for attempt in range(1, self.max_retries_per_key + 1):
                try:
                    result = func(key_obj.key, key_obj.provider, *args, **kwargs)
                    key_obj.failure_count = 0
                    return result

                except Exception as exc:
                    last_exception = exc
                    is_rate_limit = self.is_rate_limit_error(exc)

                    logger.warning(
                        f"Attempt {attempt}/{self.max_retries_per_key} failed on "
                        f"[{key_obj.provider.upper()} Key #{key_obj.index}]: {exc}"
                    )

                    if is_rate_limit:
                        logger.warning(
                            f"Rate limit / Quota error detected on [{key_obj.provider.upper()} Key #{key_obj.index}]. "
                            f"Rotating to next key..."
                        )
                        key_obj.mark_failed(cooldown_seconds=KEY_COOLDOWN_SECONDS)
                        break

                    if attempt < self.max_retries_per_key:
                        backoff = INITIAL_BACKOFF_SECONDS * (BACKOFF_EXPONENT_FACTOR ** (attempt - 1))
                        logger.info(f"Backing off for {backoff:.2f} seconds before retry...")
                        time.sleep(backoff)
                    else:
                        key_obj.mark_failed()

        if provider == "gemini" and self.openrouter_pool:
            logger.warning(
                f"WARNING: Request fell through the entire Gemini key pool ({len(self.gemini_pool)} keys)! "
                f"Check if target model version is deprecated, quota is exceeded, or API keys are invalid. Falling back to OpenRouter pool..."
            )
            try:
                return self.execute_with_retry(func, provider="openrouter", *args, **kwargs)
            except AllKeysExhaustedError:
                pass

        logger.error(f"All keys exhausted for provider pool '{provider}'.")
        raise AllKeysExhaustedError(
            f"All API keys exhausted. Last error: {last_exception}"
        ) from last_exception


# Global singleton instance
key_manager = KeyManager()
