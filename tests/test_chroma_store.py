"""Unit tests for ChromaVectorStore indexing and metadata filtering."""

import pytest
import shutil
from pathlib import Path
from vectordb.chroma_store import ChromaVectorStore


@pytest.fixture
def temp_chroma_store(tmp_path):
    store = ChromaVectorStore(
        collection_name="test_collection",
        persist_directory=tmp_path / "chroma_db"
    )
    yield store
    # Cleanup
    if (tmp_path / "chroma_db").exists():
        shutil.rmtree(tmp_path / "chroma_db", ignore_errors=True)


def test_chroma_store_add_and_query(temp_chroma_store):
    docs = ["Speaker A: We decided to deploy on Friday.", "Speaker B: Agreed."]
    embeddings = [[0.1] * 384, [0.2] * 384]
    metadatas = [
        {"meeting_id": "m123", "speaker": "Speaker A"},
        {"meeting_id": "m123", "speaker": "Speaker B"}
    ]
    ids = ["id1", "id2"]

    temp_chroma_store.add_documents(docs, embeddings, metadatas, ids)

    # Query with metadata filter
    results = temp_chroma_store.query_vectors(
        query_embedding=[0.1] * 384,
        n_results=2,
        where_filter={"meeting_id": "m123"}
    )

    assert len(results) == 2
    assert "Speaker A" in results[0]["content"] or "Speaker B" in results[0]["content"]
    assert results[0]["metadata"]["meeting_id"] == "m123"
