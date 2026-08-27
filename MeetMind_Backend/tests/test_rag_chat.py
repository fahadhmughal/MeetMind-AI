"""Unit tests for RAG Chat grounding, exact refusal message, scope filtering, and error handling."""

import pytest
from unittest.mock import MagicMock, patch
from pipeline.rag_pipeline import RAGPipeline, EXACT_REFUSAL_MESSAGE, ChatAnswer


@patch("key_manager.key_manager.execute_with_retry")
def test_rag_chat_grounded_answer(mock_execute):
    mock_execute.side_effect = lambda fn, **kwargs: fn("fake_key", "gemini")
    mock_retriever = MagicMock()
    mock_retriever.search.return_value = [
        {"content": "Speaker A: The deployment is scheduled for Friday at 5 PM.", "rrf_score": 0.03}
    ]

    mock_llm = MagicMock()
    mock_llm.generate_structured.return_value = ChatAnswer(
        answer="The deployment is scheduled for Friday at 5 PM.",
        sources=["Speaker A: The deployment is scheduled for Friday at 5 PM."]
    )

    pipeline = RAGPipeline(
        retriever=mock_retriever,
        supabase_client=MagicMock()
    )
    pipeline.llm_factory = mock_llm

    result = pipeline.answer_query(
        meeting_id="m123",
        query="When is deployment scheduled?",
        scope="meeting"
    )

    assert result["answer"] == "The deployment is scheduled for Friday at 5 PM."
    assert len(result["sources"]) == 1


def test_rag_chat_exact_refusal_when_no_context_found():
    mock_retriever = MagicMock()
    mock_retriever.search.return_value = []  # No candidate context returned

    pipeline = RAGPipeline(
        retriever=mock_retriever,
        supabase_client=MagicMock()
    )

    result = pipeline.answer_query(
        meeting_id="m123",
        query="What is the weather in Paris?",
        scope="meeting"
    )

    # Must return the exact refusal message
    assert result["answer"] == EXACT_REFUSAL_MESSAGE
    assert result["sources"] == []


def test_rag_chat_scope_filtering():
    mock_retriever = MagicMock()
    mock_retriever.search.return_value = []

    pipeline = RAGPipeline(
        retriever=mock_retriever,
        supabase_client=MagicMock()
    )

    pipeline.answer_query(
        meeting_id="m123",
        query="What decisions were made?",
        scope="organization",
        organization_id="org_777"
    )

    mock_retriever.search.assert_called_once_with(
        query="What decisions were made?",
        top_k=5,
        where_filter={"organization_id": "org_777"}
    )


def test_rag_chat_empty_query_raises_error():
    pipeline = RAGPipeline()
    with pytest.raises(ValueError, match="Query string cannot be empty"):
        pipeline.answer_query(meeting_id="m123", query="   ")


@patch("key_manager.key_manager.execute_with_retry")
def test_rag_chat_json_string_unwrapping(mock_execute):
    mock_execute.side_effect = lambda fn, **kwargs: fn("fake_key", "gemini")
    mock_retriever = MagicMock()
    mock_retriever.search.return_value = [
        {"content": "Speaker A: We decided to deploy on Friday.", "rrf_score": 0.03}
    ]

    mock_llm = MagicMock()
    # Mock return value where answer is a JSON string
    mock_llm.generate_structured.return_value = ChatAnswer(
        answer='{"response": "We decided to deploy on Friday."}',
        sources=["Speaker A: We decided to deploy on Friday."]
    )

    pipeline = RAGPipeline(
        retriever=mock_retriever,
        supabase_client=MagicMock()
    )
    pipeline.llm_factory = mock_llm

    result = pipeline.answer_query(
        meeting_id="m123",
        query="What decision was made?",
        scope="meeting"
    )

    assert result["answer"] == "We decided to deploy on Friday."
