import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    NEO4J_URL: str = os.getenv("NEO4J_URL", "bolt://localhost:7687")
    NEO4J_USERNAME: str = os.getenv("NEO4J_USERNAME", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "password")

    PORT: int = int(os.getenv("PORT", 8000))
    CHROMA_PATH: str = os.getenv("CHROMA_PATH", "./chroma_db")
    STATIC_DIR: str = "static"
    AUDIO_DIR: str = "static/audio"
    TEMP_DIR: str = "temp_uploads"


settings = Settings()
