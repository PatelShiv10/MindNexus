from typing import Optional
from fastapi import APIRouter
from services.graph_service import get_graph_data

router = APIRouter(tags=["graph"])


@router.get("/graph")
async def graph_endpoint(
    doc_id: Optional[str] = None,
    user_id: Optional[str] = None,
):
    return await get_graph_data(doc_id, user_id)
