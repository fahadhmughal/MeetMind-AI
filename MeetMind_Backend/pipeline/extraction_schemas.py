"""Pydantic schemas for structured output parsing of meeting analyses."""

from typing import List, Optional
from pydantic import BaseModel, Field


class ExecutiveSummary(BaseModel):
    """Schema for meeting executive summary and key points."""
    executive_summary: str = Field(
        description="A concise 2-4 sentence executive overview of the meeting purpose and main outcomes."
    )
    key_discussion_points: List[str] = Field(
        default_factory=list,
        description="Bullet points highlighting key discussion topics and highlights."
    )


class ExtractedTask(BaseModel):
    """Schema for individual action item / task extracted from meeting transcript."""
    title: str = Field(description="Action item title or short action phrase.")
    description: Optional[str] = Field(default=None, description="Detailed context or instructions for the task.")
    assignee_name: Optional[str] = Field(default=None, description="Name of person assigned to task if mentioned.")
    due_date: Optional[str] = Field(default=None, description="Due date or deadline if specified (YYYY-MM-DD or text).")
    priority: str = Field(default="medium", description="Priority level: 'low', 'medium', or 'high'.")


class TaskList(BaseModel):
    """Schema wrapper for a collection of extracted action items."""
    tasks: List[ExtractedTask] = Field(default_factory=list, description="List of extracted action items.")


class ExtractedDecision(BaseModel):
    """Schema for a key decision made during the meeting."""
    decision_text: str = Field(description="Clear statement of the decision made.")
    context: Optional[str] = Field(default=None, description="Background context or rationale behind the decision.")


class DecisionList(BaseModel):
    """Schema wrapper for a collection of extracted key decisions."""
    decisions: List[ExtractedDecision] = Field(default_factory=list, description="List of extracted key decisions.")


class MeetingAnalysisResult(BaseModel):
    """Combined analysis result model."""
    summary: ExecutiveSummary
    tasks: List[ExtractedTask] = Field(default_factory=list)
    decisions: List[ExtractedDecision] = Field(default_factory=list)
