"""Unit tests for LLMFactory and ModelSelector with mocked LLM responses."""

import pytest
from unittest.mock import MagicMock, patch
from models.llm_factory import LLMFactory, LLMParseError
from models.model_selector import ModelSelector
from pipeline.extraction_schemas import ExecutiveSummary


def test_model_selector_params():
    g_params = ModelSelector.get_model_params("gemini")
    assert g_params["model_name"] == "gemini-3.5-flash-lite"

    o_params = ModelSelector.get_model_params("openrouter")
    assert "llama" in o_params["model_name"] or "google" in o_params["model_name"]


def test_clean_json_output():
    raw_markdown = "```json\n{\"executive_summary\": \"Test summary\", \"key_discussion_points\": [\"Point 1\"]}\n```"
    cleaned = LLMFactory._clean_json_output(raw_markdown)
    assert cleaned == "{\"executive_summary\": \"Test summary\", \"key_discussion_points\": [\"Point 1\"]}"


@patch("models.llm_factory.key_manager.execute_with_retry")
def test_generate_structured_success(mock_execute):
    mock_execute.return_value = '{"executive_summary": "Meeting went well.", "key_discussion_points": ["Item 1"]}'

    result = LLMFactory.generate_structured(
        prompt="Summarize meeting",
        response_schema=ExecutiveSummary,
        provider="gemini"
    )

    assert isinstance(result, ExecutiveSummary)
    assert result.executive_summary == "Meeting went well."
    assert result.key_discussion_points == ["Item 1"]


@patch("models.llm_factory.key_manager.execute_with_retry")
def test_generate_structured_invalid_json_raises_error(mock_execute):
    mock_execute.return_value = "Invalid non-json output text"

    with pytest.raises(LLMParseError, match="Malformed LLM JSON output"):
        LLMFactory.generate_structured(
            prompt="Summarize meeting",
            response_schema=ExecutiveSummary,
            provider="gemini"
        )
