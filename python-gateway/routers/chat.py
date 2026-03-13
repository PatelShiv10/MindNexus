import httpx
from bson import ObjectId
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import Optional

from core.config import settings
from core.database import get_db
from core.security import get_current_user

router = APIRouter(prefix="/api/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    query: str
    systemPrompt: Optional[str] = None
    chat_history: list[dict] = []
    doc_ids: list[str] = []
    sessionId: Optional[str] = None
    image: Optional[str] = None  # base64-encoded image from the frontend


def _session_to_dict(session: dict) -> dict:
    session["_id"] = str(session["_id"])
    if "user" in session and isinstance(session["user"], ObjectId):
        session["user"] = str(session["user"])
        
    for field in ["createdAt", "updatedAt"]:
        if field in session and session[field]:
            if session[field].tzinfo is None:
                session[field] = session[field].replace(tzinfo=timezone.utc)
    if "messages" in session:
        for m in session["messages"]:
            # Serialize ObjectId _id on individual messages (e.g. from YouTube ingestion)
            if "_id" in m and isinstance(m["_id"], ObjectId):
                m["_id"] = str(m["_id"])
            if "timestamp" in m and m.get("timestamp"):
                if m["timestamp"].tzinfo is None:
                    m["timestamp"] = m["timestamp"].replace(tzinfo=timezone.utc)
            if "createdAt" in m and m.get("createdAt"):
                if m["createdAt"].tzinfo is None:
                    m["createdAt"] = m["createdAt"].replace(tzinfo=timezone.utc)
    return session


# ──────────────────────────────────────────────
# POST /api/chat/
# ──────────────────────────────────────────────

@router.post("/")
async def chat_with_cortex(
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Send a query + doc_ids to the AI Engine /chat endpoint,
    then persist the conversation in a ChatSession document.
    """
    collection = db["chatsessions"]

    # 1. Call AI Engine
    try:
        combined_query = f"{body.systemPrompt}\n\nStudent: {body.query}" if body.systemPrompt else body.query
        async with httpx.AsyncClient(timeout=120) as client:
            ai_response = await client.post(
                f"{settings.AI_ENGINE_URL}/chat",
                json={
                    "query": combined_query,
                    "chat_history": body.chat_history,
                    "doc_ids": body.doc_ids,
                    "image": body.image,   # forward base64 image to AI engine
                },
            )
            ai_response.raise_for_status()
    except Exception as e:
        print(f"AI Engine Error: {e}")
        raise HTTPException(status_code=500, detail="Error communicating with AI Engine")

    ai_data = ai_response.json()
    answer = ai_data.get("answer", "")
    sources = ai_data.get("sources", [])

    now = datetime.now(timezone.utc)

    # 2. Handle session persistence
    if body.sessionId:
        session = await collection.find_one(
            {"_id": ObjectId(body.sessionId), "user": ObjectId(current_user["id"])}
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        await collection.update_one(
            {"_id": ObjectId(body.sessionId)},
            {
                "$push": {
                    "messages": {
                        "$each": [
                            {
                                "role": "user",
                                "content": body.query,
                                "image": body.image,   # persist image in MongoDB
                                "sources": [],
                                "timestamp": now,
                            },
                            {"role": "ai", "content": answer, "sources": sources, "timestamp": now},
                        ]
                    }
                },
                "$set": {"updatedAt": now},
            },
        )
        session_id = body.sessionId
    else:
        title = body.query[:30] + ("..." if len(body.query) > 30 else "")
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                title_res = await client.post(
                    f"{settings.AI_ENGINE_URL}/chat/title",
                    json={"query": body.query},
                )
                if title_res.status_code == 200:
                    title = title_res.json().get("title", title)
        except Exception as e:
            print(f"Title Generation Error: {e}")
            
        new_session = {
            "user": ObjectId(current_user["id"]),
            "title": title,
            "messages": [
                {
                    "role": "user",
                    "content": body.query,
                    "image": body.image,   # persist image for new sessions too
                    "sources": [],
                    "timestamp": now,
                },
                {"role": "ai", "content": answer, "sources": sources, "timestamp": now},
            ],
            "createdAt": now,
            "updatedAt": now,
        }
        result = await collection.insert_one(new_session)
        session_id = str(result.inserted_id)

    return {"answer": answer, "sources": sources, "sessionId": session_id}


# ──────────────────────────────────────────────
# GET /api/chat/
# ──────────────────────────────────────────────

@router.get("/")
async def get_chat_history(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return a list of all chat sessions (id, title, updatedAt) for the user."""
    collection = db["chatsessions"]
    cursor = collection.find(
        {"user": ObjectId(current_user["id"])},
        {"_id": 1, "title": 1, "updatedAt": 1},
    ).sort("updatedAt", -1)
    sessions = []
    async for s in cursor:
        updated_at = s.get("updatedAt")
        if updated_at and updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)
        sessions.append({
            "_id": str(s["_id"]),
            "title": s.get("title"),
            "updatedAt": updated_at
        })
    return sessions


# ──────────────────────────────────────────────
# GET /api/chat/{session_id}
# ──────────────────────────────────────────────

@router.get("/{session_id}")
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return the full chat session (including all messages)."""
    collection = db["chatsessions"]
    session = await collection.find_one(
        {"_id": ObjectId(session_id), "user": ObjectId(current_user["id"])}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return _session_to_dict(session)


# ──────────────────────────────────────────────
# DELETE /api/chat/{session_id}
# ──────────────────────────────────────────────

@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a single chat session."""
    collection = db["chatsessions"]
    result = await collection.find_one_and_delete(
        {"_id": ObjectId(session_id), "user": ObjectId(current_user["id"])}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted"}
