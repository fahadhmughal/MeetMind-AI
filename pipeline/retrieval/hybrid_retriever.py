"""Hybrid Retriever combining Chroma dense vectors, BM25 keyword search, and RRF reranking."""

import math
from typing import List, Dict, Any, Optional
from rank_bm25 import BM25Okapi
from embeddings.embedding_manager import embedding_manager, EmbeddingManager
from vectordb.chroma_store import chroma_store, ChromaVectorStore
from pipeline.retrieval.query_normalizer import QueryNormalizer
from utils.logger import get_logger

logger = get_logger(__name__)


class HybridRetriever:
    """Hybrid retrieval engine combining dense vector search and BM25 keyword matching with LRU caching."""

    def __init__(
        self,
        embedder: Optional[EmbeddingManager] = None,
        vector_store: Optional[ChromaVectorStore] = None,
        cache_size: int = 100
    ):
        self.embedder = embedder or embedding_manager
        self.vector_store = vector_store or chroma_store
        self.query_cache: Dict[str, List[Dict[str, Any]]] = {}
        self.cache_size = cache_size

    def search(
        self,
        query: str,
        top_k: int = 5,
        where_filter: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Executes hybrid retrieval: query normalization -> dense vector search + BM25 -> RRF reranking."""
        if not query or not query.strip():
            logger.warning("Empty query passed to HybridRetriever.")
            return []

        # Check Cache
        cache_key = f"{query.strip().lower()}_{top_k}_{str(where_filter)}"
        if cache_key in self.query_cache:
            logger.info(f"Cache hit for query: '{query.strip()}'")
            return self.query_cache[cache_key]

        # Step 1: Normalize Query (Roman Urdu support)
        normalized_query, is_ru, original_query = QueryNormalizer.normalize_query(query)

        # Step 2: Dense Vector Retrieval
        logger.info(f"Generating query embedding for: '{normalized_query}'...")
        query_vec = self.embedder.embed_text(normalized_query)
        dense_results = self.vector_store.query_vectors(
            query_embedding=query_vec,
            n_results=top_k * 2,
            where_filter=where_filter
        )

        if not dense_results:
            logger.warning("No dense vector results returned from vector store.")
            return []

        # Step 3: BM25 Keyword Search over candidate pool
        candidate_docs = [r["content"] for r in dense_results]
        tokenized_corpus = [doc.lower().split() for doc in candidate_docs]
        tokenized_query = normalized_query.lower().split()

        bm25 = BM25Okapi(tokenized_corpus)
        bm25_scores = bm25.get_scores(tokenized_query)

        # Step 4: Reciprocal Rank Fusion (RRF) & Reranking
        # Sort BM25 rank order
        bm25_ranked_indices = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)
        bm25_ranks = {idx: rank + 1 for rank, idx in enumerate(bm25_ranked_indices)}

        rrf_constant = 60
        final_candidates: List[Dict[str, Any]] = []

        for dense_rank, candidate in enumerate(dense_results, 1):
            cand_idx = dense_rank - 1
            bm25_rank = bm25_ranks.get(cand_idx, len(dense_results))

            # RRF score formula: 1 / (60 + dense_rank) + 1 / (60 + bm25_rank)
            rrf_score = (1.0 / (rrf_constant + dense_rank)) + (1.0 / (rrf_constant + bm25_rank))

            candidate_copy = dict(candidate)
            candidate_copy["rrf_score"] = round(rrf_score, 5)
            candidate_copy["is_roman_urdu_query"] = is_ru
            final_candidates.append(candidate_copy)

        # Sort candidates by RRF score descending
        final_candidates.sort(key=lambda x: x["rrf_score"], reverse=True)
        top_results = final_candidates[:top_k]

        # Update Cache
        if len(self.query_cache) >= self.cache_size:
            # Evict oldest entry
            oldest_key = next(iter(self.query_cache))
            del self.query_cache[oldest_key]
        self.query_cache[cache_key] = top_results

        logger.info(f"Hybrid retrieval complete. Returning top-{len(top_results)} context matches.")
        return top_results


# Global HybridRetriever instance
hybrid_retriever = HybridRetriever()
