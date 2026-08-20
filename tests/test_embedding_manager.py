"""Unit tests for EmbeddingManager local vector generation."""

import pytest
from embeddings.embedding_manager import EmbeddingManager


def test_embed_text_returns_vector():
    em = EmbeddingManager()
    vector = em.embed_text("Test transcript sentence.")
    assert isinstance(vector, list)
    assert len(vector) > 0
    assert isinstance(vector[0], float)


def test_embed_empty_text_raises_error():
    em = EmbeddingManager()
    with pytest.raises(ValueError, match="Cannot generate embedding"):
        em.embed_text("   ")


def test_embed_batch_returns_list_of_vectors():
    em = EmbeddingManager()
    texts = ["First transcript chunk", "Second transcript chunk"]
    vectors = em.embed_batch(texts)
    assert len(vectors) == 2
    assert len(vectors[0]) == len(vectors[1])
