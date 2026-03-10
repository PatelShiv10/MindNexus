from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


# ──────────────────────────────────────────────
# Sub-document: Message
# ──────────────────────────────────────────────

class Message(BaseModel):
    role: Literal["user", "ai"]
    content: str
    sources: list[str] = []
    timestamp: Optional[datetime] = None


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────

class ChatSessionCreate(BaseModel):
    user_id: str
    title: str


class ChatSessionOut(BaseModel):
    id: str
    title: str
    messages: list[Message] = []
    updated_at: Optional[datetime] = None


class ChatSessionListItem(BaseModel):
    id: str
    title: str
    updated_at: Optional[datetime] = None


# ──────────────────────────────────────────────
# Collection helpers
# ──────────────────────────────────────────────

def get_chat_collection(db):
    """Return the 'chatsessions' collection from a Motor database."""
    return db["chatsessions"]
