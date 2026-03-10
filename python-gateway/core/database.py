from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import settings

_client: AsyncIOMotorClient | None = None


async def connect_db() -> None:
    """Create the Motor client and select the database."""
    global _client
    _client = AsyncIOMotorClient(settings.MONGO_URI)
    print("✅  MongoDB connected")


async def close_db() -> None:
    """Close the Motor client on shutdown."""
    global _client
    if _client:
        _client.close()
        print("❌  MongoDB disconnected")


def get_db() -> AsyncIOMotorDatabase:
    """
    FastAPI dependency — inject into route handlers with:
        db: AsyncIOMotorDatabase = Depends(get_db)
    """
    if _client is None:
        raise RuntimeError("Database client is not initialised. Call connect_db() first.")
    return _client.get_default_database()
