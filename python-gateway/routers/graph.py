import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.config import settings
from core.database import get_db
from core.security import get_current_user

router = APIRouter(prefix="/api/graph", tags=["Graph"])


# ──────────────────────────────────────────────
# GET /api/graph/
# ──────────────────────────────────────────────

@router.get("")
async def get_graph(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Proxy graph data request to the AI Engine.
    Forwards all query parameters and injects user_id.
    """
    params = dict(request.query_params)
    params["user_id"] = current_user["id"]

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            ai_response = await client.get(
                f"{settings.AI_ENGINE_URL}/graph",
                params=params,
            )
            ai_response.raise_for_status()
        return ai_response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        print(f"Error fetching graph data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching graph data")
