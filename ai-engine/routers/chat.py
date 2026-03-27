from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.chat_service import run_rag_chat, generate_chat_title

router = APIRouter(tags=["chat"])

class ChatRequest(BaseModel):
    query: str
    chat_history: list[dict] = []
    doc_ids: list[str] = []
    image: Optional[str] = None  

class TitleRequest(BaseModel):
    query: str

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    return await run_rag_chat(
        request.query, request.chat_history, request.doc_ids, request.image
    )

@router.post("/chat/title")
async def generate_title_endpoint(request: TitleRequest):
    title = await generate_chat_title(request.query)
    return {"title": title}
