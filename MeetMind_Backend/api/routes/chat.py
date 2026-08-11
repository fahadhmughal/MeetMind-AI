"""FastAPI routes for meeting transcript Q&A chat endpoint."""

from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status
from pipeline.rag_pipeline import rag_pipeline, EXACT_REFUSAL_MESSAGE
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/meetings", tags=["Chat"])


class ChatRequest(BaseModel):
    """Schema for grounded RAG chat query payload."""
    query: str = Field(description="Question about the meeting transcript.")
    scope: str = Field(default="meeting", description="Search scope: 'meeting' or 'organization'.")
    organization_id: Optional[str] = Field(default=None, description="Optional Organization ID for org-wide searches.")


@router.post("/{meeting_id}/chat", status_code=status.HTTP_200_OK)
async def chat_with_meeting(meeting_id: str, request: ChatRequest):
    """Answers user questions about a meeting transcript using grounded RAG retrieval."""
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query string cannot be empty.")

    if request.scope not in {"meeting", "organization"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scope must be 'meeting' or 'organization'.")

    logger.info(
        f"Received chat request for meeting '{meeting_id}' (scope: {request.scope}): '{request.query}'"
    )

    try:
        result = rag_pipeline.answer_query(
            meeting_id=meeting_id,
            query=request.query,
            scope=request.scope,
            organization_id=request.organization_id
        )
        return {
            "status": "success",
            "meeting_id": meeting_id,
            "scope": request.scope,
            "result": result
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error executing chat query for meeting '{meeting_id}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat query: {str(exc)}"
        )
