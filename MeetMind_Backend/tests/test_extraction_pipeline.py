"""Unit tests for ExtractionPipeline with mocked LLMFactory responses."""

import pytest
from unittest.mock import MagicMock
from pipeline.extraction_pipeline import ExtractionPipeline
from pipeline.extraction_schemas import (
    ExecutiveSummary,
    TaskList,
    ExtractedTask,
    DecisionList,
    ExtractedDecision
)


def test_extraction_pipeline_analyze_meeting():
    mock_supabase = MagicMock()
    mock_supabase.select.return_value = [{"id": "meeting-123", "title": "Design Review"}]

    mock_transcripts_exec = MagicMock()
    mock_transcripts_exec.data = [
        {"speaker": "Speaker A", "content": "Let's launch feature X on Monday.", "start_time": 0.0, "end_time": 5.0},
        {"speaker": "Speaker B", "content": "Agreed. I will finalize the documentation.", "start_time": 5.5, "end_time": 10.0}
    ]
    mock_supabase.client.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = mock_transcripts_exec

    mock_llm_factory = MagicMock()

    def mock_generate_structured(prompt, response_schema, provider="gemini"):
        if response_schema == ExecutiveSummary:
            return ExecutiveSummary(
                executive_summary="Feature X launch approved for Monday.",
                key_discussion_points=["Documentation to be finalized by Speaker B."]
            )
        elif response_schema == TaskList:
            return TaskList(
                tasks=[
                    ExtractedTask(
                        title="Finalize documentation",
                        description="Complete feature X docs",
                        assignee_name="Speaker B",
                        due_date="Monday",
                        priority="high"
                    )
                ]
            )
        elif response_schema == DecisionList:
            return DecisionList(
                decisions=[
                    ExtractedDecision(
                        decision_text="Launch feature X on Monday",
                        context="Feature readiness confirmed"
                    )
                ]
            )

    mock_llm_factory.generate_structured.side_effect = mock_generate_structured

    pipeline = ExtractionPipeline(supabase_client=mock_supabase, llm_factory=mock_llm_factory)
    result = pipeline.analyze_meeting("meeting-123")

    assert result.summary.executive_summary == "Feature X launch approved for Monday."
    assert len(result.tasks) == 1
    assert result.tasks[0].title == "Finalize documentation"
    assert result.tasks[0].assignee_name == "Speaker B"
    assert len(result.decisions) == 1
    assert result.decisions[0].decision_text == "Launch feature X on Monday"

    mock_supabase.client.table("meetings").update.assert_called()
    mock_supabase.insert.assert_called()
