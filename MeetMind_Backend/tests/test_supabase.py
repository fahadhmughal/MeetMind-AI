"""Unit tests for SupabaseService wrapper and database operations."""

import pytest
from unittest.mock import MagicMock, patch
from api.supabase_client import SupabaseService


def test_supabase_service_initialization():
    service = SupabaseService(url="https://test.supabase.co", service_key="test_key")
    assert service.url == "https://test.supabase.co"
    assert service.service_key == "test_key"


def test_supabase_unconfigured_raises_error():
    service = SupabaseService(url="https://your-project.supabase.co", service_key="your-key")
    with pytest.raises(ValueError, match="Supabase URL and Service Role Key must be configured"):
        _ = service.client


@patch("api.supabase_client.create_client")
def test_supabase_select_query(mock_create_client):
    mock_client = MagicMock()
    mock_execute = MagicMock()
    mock_execute.data = [{"id": "test-uuid-1", "title": "Test Meeting"}]
    mock_client.table.return_value.select.return_value.limit.return_value.execute.return_value = mock_execute
    mock_create_client.return_value = mock_client

    service = SupabaseService(url="https://valid.supabase.co", service_key="valid_key")
    results = service.select("meetings", limit=1)

    assert len(results) == 1
    assert results[0]["title"] == "Test Meeting"
    mock_client.table.assert_called_once_with("meetings")
