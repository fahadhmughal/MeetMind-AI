"""Supabase client service wrapper for Database, Auth, and Audio Storage interactions."""

from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from config.settings import settings
from config.constants import AUDIO_BUCKET_NAME
from utils.logger import get_logger

logger = get_logger(__name__)


class SupabaseService:
    """Reusable wrapper around Supabase Client for DB, Auth, and Storage."""

    def __init__(self, url: Optional[str] = None, service_key: Optional[str] = None):
        self.url: str = url or settings.supabase_url
        self.service_key: str = service_key or settings.supabase_service_role_key
        self._client: Optional[Client] = None

    @property
    def client(self) -> Client:
        """Lazy initializer for Supabase client."""
        if self._client is None:
            if not self.url or not self.service_key or "your-project" in self.url:
                raise ValueError("Supabase URL and Service Role Key must be configured in .env")
            try:
                self._client = create_client(self.url, self.service_key)
                logger.info("Supabase admin client initialized successfully.")
            except Exception as exc:
                logger.error(f"Failed to initialize Supabase client: {exc}")
                raise exc
        return self._client

    # Database Helpers
    def select(self, table: str, columns: str = "*", limit: int = 100) -> List[Dict[str, Any]]:
        """Executes a SELECT query on a target table."""
        try:
            res = self.client.table(table).select(columns).limit(limit).execute()
            return res.data or []
        except Exception as exc:
            logger.error(f"Error querying table '{table}': {exc}")
            raise exc

    def insert(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts a single record into a target table."""
        try:
            res = self.client.table(table).insert(data).execute()
            return res.data[0] if res.data else {}
        except Exception as exc:
            logger.error(f"Error inserting into table '{table}': {exc}")
            raise exc

    def ensure_user_exists(self, user_id: str, email: Optional[str] = None) -> bool:
        """Ensures a user record exists in public.users to satisfy foreign key constraints."""
        if not user_id:
            return False
        try:
            res = self.client.table("users").select("id").eq("id", user_id).execute()
            if not res.data:
                user_email = email or f"user_{user_id[:8]}@meetmind.ai"
                self.client.table("users").insert({
                    "id": user_id,
                    "email": user_email,
                    "full_name": "MeetMind User"
                }).execute()
                logger.info(f"Auto-provisioned public.users record for user_id '{user_id}'.")
            return True
        except Exception as exc:
            logger.warning(f"Could not auto-provision public.users record for {user_id}: {exc}")
            return False

    # Storage Helpers
    def upload_audio(self, file_name: str, file_bytes: bytes, content_type: str = "audio/wav") -> str:
        """Uploads an audio file to the private 'meeting-audio' bucket."""
        try:
            storage_res = self.client.storage.from_(AUDIO_BUCKET_NAME).upload(
                path=file_name,
                file=file_bytes,
                file_options={"content-type": content_type}
            )
            logger.info(f"Audio file '{file_name}' uploaded successfully to bucket '{AUDIO_BUCKET_NAME}'.")
            return file_name
        except Exception as exc:
            logger.error(f"Error uploading audio file '{file_name}': {exc}")
            raise exc

    def get_audio_download_url(self, file_name: str, expires_in: int = 3600) -> str:
        """Generates a signed download URL for a private audio file."""
        try:
            res = self.client.storage.from_(AUDIO_BUCKET_NAME).create_signed_url(
                path=file_name,
                expires_in=expires_in
            )
            return res.get("signedUrl", "")
        except Exception as exc:
            logger.error(f"Error generating signed URL for '{file_name}': {exc}")
            raise exc


# Global reusable singleton instance
supabase_service = SupabaseService()
