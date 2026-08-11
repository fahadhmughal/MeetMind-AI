"""Chroma Vector Database integration for persistent vector indexing and filtering."""

from pathlib import Path
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from config.constants import BASE_DIR
from utils.logger import get_logger

logger = get_logger(__name__)

VECTORDB_DIR: Path = BASE_DIR / "vectordb" / "data"


class ChromaVectorStore:
    """Manages persistent Chroma vector database storage and metadata-filtered search."""

    def __init__(self, collection_name: str = "meetmind_transcripts", persist_directory: Optional[Path] = None):
        self.persist_dir = persist_directory or VECTORDB_DIR
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self.collection_name = collection_name

        logger.info(f"Initializing Persistent ChromaDB client at '{self.persist_dir}'")
        self.client = chromadb.PersistentClient(
            path=str(self.persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        logger.info(f"Chroma collection '{self.collection_name}' ready. Count: {self.collection.count()}")

    def add_documents(
        self,
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        ids: List[str]
    ) -> None:
        """Adds embedded documents and metadata to the Chroma vector store."""
        if not documents or not embeddings or not ids:
            logger.warning("Empty documents or embeddings passed to add_documents. Skipping.")
            return

        logger.info(f"Adding {len(documents)} documents to Chroma collection '{self.collection_name}'...")
        try:
            self.collection.add(
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas,
                ids=ids
            )
            logger.info(f"Successfully indexed {len(documents)} items in Chroma.")
        except Exception as exc:
            logger.error(f"Error adding documents to Chroma: {exc}")
            raise exc

    def query_vectors(
        self,
        query_embedding: List[float],
        n_results: int = 5,
        where_filter: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Queries nearest vector embeddings with optional metadata filtering.

        Args:
            query_embedding: Vector embedding for search query.
            n_results: Maximum candidate matches to return.
            where_filter: Metadata filter (e.g. {"meeting_id": "xxx"} or {"doc_type": "transcript"}).
        """
        if self.collection.count() == 0:
            logger.warning("Chroma collection is empty. Returning empty search results.")
            return []

        try:
            kwargs: Dict[str, Any] = {
                "query_embeddings": [query_embedding],
                "n_results": min(n_results, self.collection.count())
            }
            if where_filter:
                kwargs["where"] = where_filter

            results = self.collection.query(**kwargs)

            candidates: List[Dict[str, Any]] = []
            if results and results.get("documents") and results["documents"][0]:
                docs = results["documents"][0]
                metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
                dists = results["distances"][0] if results.get("distances") else [0.0] * len(docs)
                ids = results["ids"][0] if results.get("ids") else [""] * len(docs)

                for doc, meta, dist, item_id in zip(docs, metas, dists, ids):
                    # Convert distance to similarity score (cosine space)
                    similarity = 1.0 - max(0.0, dist)
                    candidates.append({
                        "id": item_id,
                        "content": doc,
                        "metadata": meta,
                        "score": round(similarity, 4)
                    })

            return candidates

        except Exception as exc:
            logger.error(f"Error querying Chroma vector store: {exc}")
            return []


# Global ChromaVectorStore instance
chroma_store = ChromaVectorStore()
