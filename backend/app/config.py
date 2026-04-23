from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    )
    SUPABASE_JWT_SECRET: str = ""
    ANTHROPIC_API_KEY: str = ""

    APP_NAME: str = "AutoAppli"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    CORS_ORIGINS: str = "https://auto-appli.vercel.app"
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    MAX_UPLOAD_SIZE_MB: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


    def validate_required_env(self) -> list[str]:
        """Return a list of missing required env vars. Call at startup."""
        missing: list[str] = []
        if not self.ANTHROPIC_API_KEY.strip():
            missing.append("ANTHROPIC_API_KEY")
        if not self.DEBUG:
            for k in ("SUPABASE_URL", "SUPABASE_KEY", "SUPABASE_JWT_SECRET"):
                if not getattr(self, k).strip():
                    missing.append(k)
            if "*" in self.CORS_ORIGINS:
                missing.append("CORS_ORIGINS (wildcard not allowed when DEBUG=false)")
        return missing

    @property
    def cors_origins_list(self) -> list[str]:
        return [x.strip() for x in self.CORS_ORIGINS.split(",") if x.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
