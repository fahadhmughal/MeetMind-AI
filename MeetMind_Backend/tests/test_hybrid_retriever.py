"""Unit tests for HybridRetriever and QueryNormalizer."""

import pytest
from pipeline.retrieval.query_normalizer import QueryNormalizer
from pipeline.retrieval.hybrid_retriever import HybridRetriever


def test_query_normalizer_english():
    norm_text, is_ru, orig = QueryNormalizer.normalize_query("What were the action items?")
    assert not is_ru
    assert norm_text == "What were the action items?"
    assert orig == "What were the action items?"


def test_query_normalizer_roman_urdu():
    norm_text, is_ru, orig = QueryNormalizer.normalize_query("kaunsa decision hua tha meeting mein?")
    assert is_ru
    assert "decision" in norm_text.lower()
    assert orig == "kaunsa decision hua tha meeting mein?"


def test_hybrid_retriever_search_empty():
    retriever = HybridRetriever()
    results = retriever.search("")
    assert results == []
