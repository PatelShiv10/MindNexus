import httpx
from bson import ObjectId
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.config import settings
from core.database import get_db
from core.security import get_current_user

router = APIRouter(prefix="/api/documents", tags=["Documents"])


def _doc_to_dict(doc: dict) -> dict:
    """Serialise a MongoDB document to a JSON-safe dict."""
    doc["_id"] = str(doc["_id"])
    if "user" in doc and isinstance(doc["user"], ObjectId):
        doc["user"] = str(doc["user"])
    return doc


# ──────────────────────────────────────────────
# POST /api/documents/upload
# ──────────────────────────────────────────────

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Receive a file, persist a Document record in MongoDB as 'processing',
    forward the file to the AI Engine /ingest endpoint, then mark as 'ready'.
    """
    collection = db["documents"]

    # 1. Create initial DB record
    doc = {
        "title": file.filename,
        "user": ObjectId(current_user["id"]),
        "fileType": file.content_type,
        "size": 0,
        "status": "processing",
        "createdAt": datetime.now(timezone.utc),
    }
    result = await collection.insert_one(doc)
    doc_id = str(result.inserted_id)

    # 2. Read file bytes
    file_bytes = await file.read()
    doc["size"] = len(file_bytes)
    await collection.update_one({"_id": result.inserted_id}, {"$set": {"size": len(file_bytes)}})

    # 3. Forward to AI Engine
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            ai_response = await client.post(
                f"{settings.AI_ENGINE_URL}/ingest",
                files={"file": (file.filename, file_bytes, file.content_type)},
                data={"doc_id": doc_id, "user_id": current_user["id"]},
            )
            if ai_response.status_code == 200:
                await collection.update_one(
                    {"_id": result.inserted_id}, {"$set": {"status": "ready"}}
                )
                doc["status"] = "ready"
            else:
                await collection.update_one(
                    {"_id": result.inserted_id}, {"$set": {"status": "error"}}
                )
                doc["status"] = "error"
    except Exception as e:
        print(f"AI Engine Ingest Error: {e}")
        await collection.update_one(
            {"_id": result.inserted_id}, {"$set": {"status": "error"}}
        )
        doc["status"] = "error"

    doc["_id"] = doc_id
    doc["user"] = current_user["id"]
    return doc

# ──────────────────────────────────────────────
# POST /api/documents/reindex/{doc_id}
# ──────────────────────────────────────────────
@router.post("/reindex/{doc_id}", status_code=status.HTTP_200_OK)
async def reindex_document_metadata(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    collection = db["documents"]
    doc = await collection.find_one({"_id": ObjectId(doc_id), "user": ObjectId(current_user["id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await collection.update_one({"_id": ObjectId(doc_id)}, {"$set": {"status": "processing"}})

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            ai_response = await client.post(
                f"{settings.AI_ENGINE_URL}/reindex/{doc_id}",
                data={"user_id": current_user["id"]},
            )
            if ai_response.status_code == 200:
                await collection.update_one(
                    {"_id": ObjectId(doc_id)}, {"$set": {"status": "ready"}}
                )
                return {"message": "Re-indexing started successfully", "doc_id": doc_id}
            else:
                await collection.update_one(
                    {"_id": ObjectId(doc_id)}, {"$set": {"status": "error"}}
                )
                raise HTTPException(status_code=400, detail="AI Engine Failed to Re-Index")
    except Exception as e:
        await collection.update_one(
            {"_id": ObjectId(doc_id)}, {"$set": {"status": "error"}}
        )
        raise HTTPException(status_code=500, detail=str(e))

# ──────────────────────────────────────────────
# POST /api/documents/youtube
# ──────────────────────────────────────────────

from pydantic import BaseModel

class YouTubeIngestRequest(BaseModel):
    url: str

@router.post("/youtube", status_code=status.HTTP_201_CREATED)
async def ingest_youtube_url(
    request: YouTubeIngestRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Receive a YouTube URL, embed transcript into ChromaDB (chatbot only),
    and create a dedicated chat session. Does NOT store in the documents archive.
    """
    import uuid
    # Use a ephemeral doc_id — not stored in the documents collection
    doc_id = str(uuid.uuid4())

    # Forward to AI Engine for embedding
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            ai_response = await client.post(
                f"{settings.AI_ENGINE_URL}/ingest/youtube",
                json={"url": request.url},
                params={"doc_id": doc_id, "user_id": current_user["id"]}
            )

            if ai_response.status_code == 200:
                ai_data = ai_response.json()
                title = ai_data.get("title", "YouTube Video")

                # Create a dedicated chat session for this video
                chats_collection = db["chatsessions"]
                ai_message = {
                    "_id": ObjectId(),
                    "role": "assistant",
                    "content": f'"{title}" has been analyzed successfully! I\'m ready for your questions about this video.',
                    "sources": [],
                    "createdAt": datetime.now(timezone.utc)
                }
                new_session = {
                    "user": ObjectId(current_user["id"]),
                    "title": f"YouTube: {title}",
                    "messages": [ai_message],
                    "createdAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc)
                }
                session_result = await chats_collection.insert_one(new_session)

                return {
                    "status": "success",
                    "title": title,
                    "session_id": str(session_result.inserted_id)
                }

            else:
                error_text = ai_response.text
                print(f"🚨 EXACT PYTHON ERROR: {error_text}")
                raise HTTPException(status_code=400, detail=f"Python AI Engine Failed: {error_text}")

    except HTTPException:
        raise
    except Exception as e:
        print(f"AI Engine Ingest YouTube Error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Gateway Error: {str(e)}")


# ──────────────────────────────────────────────
# GET /api/documents/
# ──────────────────────────────────────────────

@router.get("")
async def get_user_documents(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return all documents belonging to the authenticated user, newest first."""
    collection = db["documents"]
    cursor = collection.find({"user": ObjectId(current_user["id"])}).sort("createdAt", -1)
    docs = [_doc_to_dict(d) async for d in cursor]
    return docs


# ──────────────────────────────────────────────
# DELETE /api/documents/purge
# ──────────────────────────────────────────────

@router.delete("/purge")
async def purge_all_data(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    1. Call AI Engine /purge (wipe Chroma + Neo4j).
    2. Delete all documents for the user from MongoDB.
    3. Delete all chat sessions for the user from MongoDB.
    """
    # AI Engine purge (best-effort)
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            await client.delete(f"{settings.AI_ENGINE_URL}/purge")
            print("AI Memory Purged")
    except Exception as e:
        print(f"AI Engine Purge Error: {e}")

    user_oid = ObjectId(current_user["id"])
    await db["documents"].delete_many({"user": user_oid})
    await db["chatsessions"].delete_many({"user": user_oid})

    return {"message": "System Reset Complete"}


# ──────────────────────────────────────────────
# DELETE /api/documents/{id}
# ──────────────────────────────────────────────

@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a single document — wipe from AI Engine first, then MongoDB."""
    collection = db["documents"]
    doc = await collection.find_one({"_id": ObjectId(doc_id)})

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if str(doc["user"]) != current_user["id"]:
        raise HTTPException(status_code=401, detail="Not authorized")

    # AI Engine delete (best-effort)
    try:
        s3_uri = doc.get("s3_uri")
        params = {"s3_uri": s3_uri} if s3_uri else None
        
        async with httpx.AsyncClient(timeout=30) as client:
            await client.delete(f"{settings.AI_ENGINE_URL}/document/{doc_id}", params=params)
            print(f"AI Memory and S3 wiped for doc: {doc_id}")
    except Exception as e:
        print(f"AI Engine Delete Error: {e}")

    await collection.delete_one({"_id": ObjectId(doc_id)})
    return {"message": "Document removed"}

# ──────────────────────────────────────────────
# GET /api/documents/{doc_id}/download
# ──────────────────────────────────────────────

@router.get("/{doc_id}/download")
async def get_document_download_url(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get a pre-signed S3 URL to download the document with its original filename."""
    collection = db["documents"]
    doc = await collection.find_one({"_id": ObjectId(doc_id), "user": ObjectId(current_user["id"])})
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    s3_uri = doc.get("s3_uri")
    if not s3_uri:
        raise HTTPException(status_code=400, detail="Document does not have an associated file in S3")
        
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Request presigned URL from AI Engine
            ai_response = await client.post(
                f"{settings.AI_ENGINE_URL}/document/download-url",
                json={
                    "s3_uri": s3_uri, 
                    "filename": doc.get("title", "download.file")
                }
            )
            
            if ai_response.status_code == 200:
                return ai_response.json()
            else:
                error_text = ai_response.text
                raise HTTPException(status_code=400, detail=f"Failed to generate download link: {error_text}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Error connecting to AI Engine: {e}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ──────────────────────────────────────────────
# POST /api/documents/podcast
# ──────────────────────────────────────────────

@router.post("/podcast")
async def generate_podcast(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """Proxy a podcast generation request to the AI Engine."""
    doc_id = body.get("doc_id")
    if not doc_id:
        raise HTTPException(status_code=400, detail="Document ID is required")

    try:
        async with httpx.AsyncClient(timeout=300) as client:
            ai_response = await client.post(
                f"{settings.AI_ENGINE_URL}/podcast",
                json={"doc_id": doc_id},
            )
        return ai_response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate podcast: {e}")


# ──────────────────────────────────────────────
# GET /api/documents/podcast-status/{doc_id}
# ──────────────────────────────────────────────

@router.get("/podcast-status/{doc_id}")
async def get_podcast_status(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Check if a podcast is ready, still generating, or not started."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            ai_response = await client.get(
                f"{settings.AI_ENGINE_URL}/podcast/status/{doc_id}",
            )
        return ai_response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check podcast status: {e}")
