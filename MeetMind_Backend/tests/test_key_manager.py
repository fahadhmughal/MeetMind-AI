"""Unit tests for KeyManager rotation, backoff, and fallback logic."""

import pytest
from unittest.mock import MagicMock
from key_manager import KeyManager, KeyHealth, AllKeysExhaustedError


def test_key_manager_initialization():
    g_keys = ["gemini_1", "gemini_2", "gemini_3"]
    o_keys = ["openrouter_1"]
    km = KeyManager(gemini_keys=g_keys, openrouter_keys=o_keys)

    assert len(km.gemini_pool) == 3
    assert len(km.openrouter_pool) == 1
    assert km.gemini_pool[0].key == "gemini_1"
    assert km.openrouter_pool[0].key == "openrouter_1"


def test_execute_success_first_attempt():
    km = KeyManager(gemini_keys=["g_key1"], openrouter_keys=["o_key1"])

    mock_func = MagicMock(return_value="Success Result")
    result = km.execute_with_retry(mock_func, provider="gemini")

    assert result == "Success Result"
    mock_func.assert_called_once_with("g_key1", "gemini")


def test_key_rotation_on_429_error():
    g_keys = ["g_key1", "g_key2"]
    km = KeyManager(gemini_keys=g_keys, openrouter_keys=[])

    call_history = []

    def mock_func(key, provider):
        call_history.append(key)
        if key == "g_key1":
            raise Exception("429 RESOURCE_EXHAUSTED rate limit exceeded")
        return "Success from Key 2"

    result = km.execute_with_retry(mock_func, provider="gemini")

    assert result == "Success from Key 2"
    assert call_history == ["g_key1", "g_key2"]
    assert km.gemini_pool[0].failure_count == 1
    assert not km.gemini_pool[0].is_available


def test_fallback_to_openrouter_when_gemini_exhausted():
    km = KeyManager(gemini_keys=["g_key1"], openrouter_keys=["o_key1"])

    call_history = []

    def mock_func(key, provider):
        call_history.append((key, provider))
        if provider == "gemini":
            raise Exception("429 Quota Exceeded")
        return "Success from OpenRouter"

    result = km.execute_with_retry(mock_func, provider="gemini")

    assert result == "Success from OpenRouter"
    assert call_history == [("g_key1", "gemini"), ("o_key1", "openrouter")]


def test_all_keys_exhausted_raises_exception():
    km = KeyManager(gemini_keys=["g_key1"], openrouter_keys=["o_key1"])

    def mock_func(key, provider):
        raise Exception("429 Quota Exceeded")

    with pytest.raises(AllKeysExhaustedError):
        km.execute_with_retry(mock_func, provider="gemini")


def test_rate_limit_detection():
    km = KeyManager(gemini_keys=[], openrouter_keys=[])
    assert km.is_rate_limit_error(Exception("429 RESOURCE_EXHAUSTED"))
    assert km.is_rate_limit_error(Exception("Rate limit exceeded"))
    assert km.is_rate_limit_error(Exception("Quota failure"))
    assert not km.is_rate_limit_error(Exception("Syntax error in query"))
