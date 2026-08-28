"""Embedding Manager for local dense vector generation using SentenceTransformers."""

from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
from utils.logger import get_logger

logger = get_logger(__name__)

# Default lightweight high-performance local embedding model (optimized for cloud/Render deployment)
DEFAULT_EMBEDDING_MODEL: str = "paraphrase-MiniLM-L3-v2"


class EmbeddingManager:
    """Generates local dense vector embeddings for text chunks, summaries, tasks, and decisions."""

    def __init__(self, model_name: str = DEFAULT_EMBEDDING_MODEL):
        self.model_name: str = model_name
        self._model: Optional[SentenceTransformer] = None
        logger.info(f"EmbeddingManager initialized with model '{self.model_name}'.")

    @property
    def model(self) -> SentenceTransformer:
        """Lazy initializer for local SentenceTransformer model."""
        if self._model is None:
            logger.info(f"Loading SentenceTransformer model '{self.model_name}' locally...")
            try:
                self._model = SentenceTransformer(self.model_name)
                logger.info(f"SentenceTransformer model '{self.model_name}' loaded successfully.")
            except Exception as exc:
                logger.error(f"Failed to load embedding model '{self.model_name}': {exc}")
                raise exc
        return self._model

    def embed_text(self, text: str) -> List[float]:
        """Generates a single dense vector embedding for a input text string."""
        if not text or not text.strip():
            raise ValueError("Cannot generate embedding for empty text.")

        embedding = self.model.encode(text.strip(), convert_to_numpy=True)
        return embedding.tolist()

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generates dense vector embeddings for a list of text strings."""
        cleaned_texts = [t.strip() for t in texts if t and t.strip()]
        if not cleaned_texts:
            return []

        embeddings = self.model.encode(cleaned_texts, batch_size=32, convert_to_numpy=True)
        return [e.tolist() for e in embeddings]


# Global cached EmbeddingManager instance
embedding_manager = EmbeddingManager()
