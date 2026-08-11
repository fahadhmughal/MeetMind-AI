"""Settings configuration loading environment variables cleanly via Pydantic V2."""

import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application Settings model powered by Pydantic."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Server Configuration
    environment: str = Field(default="development", alias="ENVIRONMENT")
    port: int = Field(default=8000, alias="PORT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # Supabase Configuration
    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")

    # Gemini API Key Pool (5 Keys)
    gemini_api_key_1: str = Field(default="", alias="GEMINI_API_KEY_1")
    gemini_api_key_2: str = Field(default="", alias="GEMINI_API_KEY_2")
    gemini_api_key_3: str = Field(default="", alias="GEMINI_API_KEY_3")
    gemini_api_key_4: str = Field(default="", alias="GEMINI_API_KEY_4")
    gemini_api_key_5: str = Field(default="", alias="GEMINI_API_KEY_5")

    # OpenRouter API Key (1 Key)
    openrouter_api_key_1: str = Field(default="", alias="OPENROUTER_API_KEY_1")
    openrouter_api_key: str = Field(default="", alias="OPENROUTER_API_KEY")

    # AssemblyAI Configuration
    assemblyai_api_key: str = Field(default="", alias="ASSEMBLYAI_API_KEY")

    @property
    def gemini_keys(self) -> List[str]:
        """Returns non-empty Gemini API keys."""
        raw_keys = [
            self.gemini_api_key_1,
            self.gemini_api_key_2,
            self.gemini_api_key_3,
            self.gemini_api_key_4,
            self.gemini_api_key_5,
        ]
        return [k.strip() for k in raw_keys if k and not k.startswith("your-")]

    @property
    def openrouter_keys(self) -> List[str]:
        """Returns non-empty OpenRouter API key(s)."""
        key = self.openrouter_api_key_1 or self.openrouter_api_key
        if key and not key.startswith("your-"):
            return [key.strip()]
        return []


# Global cached settings instance
settings = Settings()
