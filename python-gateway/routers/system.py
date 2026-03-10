import httpx
from fastapi import APIRouter

from core.config import settings

router = APIRouter(prefix="/api", tags=["System"])


# ──────────────────────────────────────────────
# GET /api/system-status
# ──────────────────────────────────────────────

@router.get("/system-status")
async def system_status():
    """Check the health of the Python gateway and the AI Engine."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            ai_response = await client.get(f"{settings.AI_ENGINE_URL}/health")
        if ai_response.json().get("status") == "healthy":
            return {"gateway": "Online", "ai_engine": "Online"}
        return {"gateway": "Online", "ai_engine": "Offline"}
    except Exception as e:
        print(f"Error connecting to AI Engine: {e}")
        return {"gateway": "Online", "ai_engine": "Offline"}
