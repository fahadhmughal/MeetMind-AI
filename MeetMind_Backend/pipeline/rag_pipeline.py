"""RAG Pipeline orchestrating document indexing, hybrid retrieval, and grounded Q&A."""

import json
import uuid
from typing import Dict, Any, List, Optional, Type
from pydantic import BaseModel, Field
from api.supabase_client import supabase_service
from embeddings.embedding_manager import embedding_manager, EmbeddingManager
from vectordb.chroma_store import chroma_store, ChromaVectorStore
from pipeline.retrieval.hybrid_retriever import hybrid_retriever, HybridRetriever
from models.llm_factory import LLMFactory
from utils.logger import get_logger

logger = get_logger(__name__)

from pipeline.prompts.retrieval_answer_prompt import RETRIEVAL_ANSWER_PROMPT as STRICT_RAG_PROMPT_TEMPLATE, EXACT_REFUSAL_MESSAGE


class ChatAnswer(BaseModel):
    """Schema for structured RAG Chat answers."""
    answer: str = Field(description="Direct, accurate answer grounded strictly in the meeting context.")
    sources: List[str] = Field(default_factory=list, description="Source context quotes or speaker references.")


class RAGPipeline:
    """Orchestrates RAG indexing and grounded Q&A querying with scope filtering and audit logging."""

    def __init__(
        self,
        embedder: Optional[EmbeddingManager] = None,
        vector_store: Optional[ChromaVectorStore] = None,
        retriever: Optional[HybridRetriever] = None,
        supabase_client: Optional[Any] = None,
        llm_factory: Optional[Type[LLMFactory]] = None
    ):
        self.embedder = embedder or embedding_manager
        self.vector_store = vector_store or chroma_store
        self.retriever = retriever or hybrid_retriever
        self.supabase = supabase_client or supabase_service
        self.llm_factory = llm_factory or LLMFactory

    def index_meeting(self, meeting_id: str, organization_id: Optional[str] = None) -> int:
        """Embeds and indexes all transcripts for a meeting into ChromaDB."""
        logger.info(f"Indexing meeting '{meeting_id}' into Chroma Vector Database...")

        transcripts_res = self.supabase.client.table("transcripts").select("*").eq("meeting_id", meeting_id).order("start_time").execute()
        transcripts = transcripts_res.data or []

        if not transcripts:
            logger.warning(f"No transcript documents found to index for meeting ID '{meeting_id}'.")
            return 0

        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []
        ids: List[str] = []

        for idx, t in enumerate(transcripts):
            speaker = t.get("speaker", "Speaker")
            content = t.get("content", "")
            doc_str = f"{speaker}: {content}"

            documents.append(doc_str)
            meta: Dict[str, Any] = {
                "meeting_id": str(meeting_id),
                "speaker": str(speaker),
                "start_time": float(t.get("start_time", 0.0)),
                "end_time": float(t.get("end_time", 0.0)),
                "doc_type": "transcript",
                "chunk_id": str(idx)
            }
            if organization_id:
                meta["organization_id"] = str(organization_id)

            metadatas.append(meta)
            ids.append(f"{meeting_id}_tr_{idx}")

        embeddings = self.embedder.embed_batch(documents)
        self.vector_store.add_documents(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )

        logger.info(f"Successfully indexed {len(documents)} transcript chunks for meeting '{meeting_id}'.")
        return len(documents)

    def answer_query(
        self,
        meeting_id: str,
        query: str,
        scope: str = "meeting",
        organization_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Runs RAG retrieval and generates a strictly grounded Q&A response."""
        if not query or not query.strip():
            raise ValueError("Query string cannot be empty.")

        logger.info(
            f"Audit Log - RAG Chat Query: '{query.strip()}' | Scope: '{scope}' | "
            f"MeetingID: '{meeting_id}' | OrgID: '{organization_id}'"
        )

        # Step 1: Construct Scope Metadata Filter
        where_filter: Dict[str, Any] = {}
        if scope == "organization" and organization_id:
            where_filter["organization_id"] = str(organization_id)
        else:
            where_filter["meeting_id"] = str(meeting_id)

        # Step 2: Retrieve candidate passages via Hybrid Retriever
        candidates = self.retriever.search(
            query=query,
            top_k=5,
            where_filter=where_filter
        )

        # Auto-index if vector store has no entries for this meeting yet
        if not candidates and scope == "meeting":
            logger.info(f"No vector indexes found for meeting '{meeting_id}'. Triggering auto-indexing...")
            indexed_count = self.index_meeting(meeting_id, organization_id=organization_id)
            if indexed_count > 0:
                candidates = self.retriever.search(
                    query=query,
                    top_k=5,
                    where_filter=where_filter
                )

        # Step 3: Fetch DB transcripts as robust fallback context if needed
        transcripts_res = self.supabase.client.table("transcripts").select("*").eq("meeting_id", meeting_id).order("start_time").execute()
        db_transcripts = transcripts_res.data if isinstance(transcripts_res.data, list) else []

        if candidates and max((c.get("rrf_score", 0.0) for c in candidates), default=0.0) > 0.0:
            context_parts = [c["content"] for c in candidates]
            context_text = "\n".join(context_parts)
        elif isinstance(db_transcripts, list) and len(db_transcripts) > 0:
            logger.info(f"Using direct DB transcripts context fallback ({len(db_transcripts)} rows) for meeting '{meeting_id}'")
            context_parts = [f"{t.get('speaker', 'Speaker')}: {t.get('content', '')}" for t in db_transcripts]
            context_text = "\n".join(context_parts)
        else:
            logger.info(f"Audit Log - Refusal: No relevant context found for query '{query.strip()}'")
            return {
                "answer": EXACT_REFUSAL_MESSAGE,
                "sources": []
            }

        # Step 4: Format Context Block & Audit Log
        total_context_bytes = len(context_text.encode("utf-8"))
        logger.info(
            f"Audit Log - Formatted RAG context ({total_context_bytes} bytes) for query '{query.strip()}'"
        )

        # Step 5: LLM Structured Generation via KeyManager
        prompt = STRICT_RAG_PROMPT_TEMPLATE.format(
            refusal_message=EXACT_REFUSAL_MESSAGE,
            context_text=context_text,
            user_query=query
        )

        try:
            from key_manager import key_manager

            def _call_llm(key: str, active_provider: str) -> ChatAnswer:
                return self.llm_factory.generate_structured(
                    prompt=prompt,
                    response_schema=ChatAnswer,
                    provider=active_provider
                )

            chat_result: ChatAnswer = key_manager.execute_with_retry(_call_llm, provider="gemini")
            clean_answer = chat_result.answer
            try:
                parsed_inner = json.loads(clean_answer)
                if isinstance(parsed_inner, dict):
                    clean_answer = parsed_inner.get("response") or parsed_inner.get("answer") or parsed_inner.get("summary") or clean_answer
            except Exception:
                pass

            logger.info(f"Audit Log - Successfully generated RAG answer for query '{query.strip()}'")
            return {
                "answer": clean_answer,
                "sources": chat_result.sources
            }

        except Exception as exc:
            logger.error(f"Error generating RAG answer: {exc}. Providing structured transcript answer fallback.")
            clean_context = context_text.strip()
            return {
                "answer": f"Based on the meeting transcript context:\n{clean_context}",
                "sources": ["Meeting Transcript"]
            }


# Global RAG pipeline instance
rag_pipeline = RAGPipeline()
