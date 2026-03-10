from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    MONGO_URI: str = "mongodb://localhost:27017/mindnexus"
    JWT_SECRET: str = "mindnexus_super_secret_jwt_key_that_is_at_least_32_bytes_long_123!"
    AI_ENGINE_URL: str = "http://localhost:8000"
    PORT: int = 8001

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
