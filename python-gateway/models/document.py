from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


class DocumentBase(BaseModel):
    title: str
    file_type: str
    size: int


class DocumentCreate(DocumentBase):
    user_id: str


class DocumentOut(BaseModel):
    id: str = Field(alias="_id")
    title: str
    user: str
    file_type: str
    size: int
    status: Literal["processing", "ready", "error"]
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True


def get_document_collection(db):
    """Return the 'documents' collection from a Motor database."""
    return db["documents"]
