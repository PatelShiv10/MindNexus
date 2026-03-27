import uuid
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.s3_service import generate_presigned_post

router = APIRouter(prefix="/api", tags=["Storage"])



class UploadUrlRequest(BaseModel):
    filename: str = Field(..., example="lecture_notes.pdf")
    content_type: str = Field(..., example="application/pdf")


class UploadUrlResponse(BaseModel):
    url: str
    fields: dict
    s3_uri: str
    object_key: str



@router.post(
    "/generate-upload-url",
    response_model=UploadUrlResponse,
    summary="Generate a pre-signed S3 POST URL for direct browser upload",
)
async def generate_upload_url(body: UploadUrlRequest):
    """
    Returns a pre-signed POST URL + form fields so the React frontend can
    upload files directly to S3 — bypassing the FastAPI server entirely.

    The returned `s3_uri` is what you store in MongoDB to reference the file.

    **Flow:**
    1. Frontend calls this endpoint → receives `{ url, fields, s3_uri }`
    2. Frontend POSTs the file directly to S3 using those fields (multipart/form-data)
    3. Frontend saves `s3_uri` in the document record via your Node.js gateway
    """
    ext = os.path.splitext(body.filename)[1]          
    safe_name = os.path.splitext(body.filename)[0]    
    object_key = f"uploads/{uuid.uuid4().hex}_{safe_name}{ext}"

    try:
        data = generate_presigned_post(object_key, body.content_type)
    except EnvironmentError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return UploadUrlResponse(
        url=data["url"],
        fields=data["fields"],
        s3_uri=data["s3_uri"],
        object_key=object_key,
    )

from fastapi import UploadFile, File, Request, BackgroundTasks
from services.s3_service import upload_fileobj_to_s3
from services.ingest_service import ingest_document
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone
import jwt


MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/mindnexus")
JWT_SECRET = os.getenv("JWT_SECRET", "mindnexus_super_secret_jwt_key_that_is_at_least_32_bytes_long_123!")

motor_client = AsyncIOMotorClient(MONGO_URI)
db = motor_client.get_default_database()


@router.post(
    "/upload-and-process",
    summary="Upload file to S3 and trigger processing pipeline",
)
async def upload_and_process(
    request: Request, 
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Receives an uploaded file, pushes it natively to AWS S3,
    then executes the LangChain embedding pipeline 
    and saves the document metadata to MongoDB using Motor.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized: Bearer token missing")
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("id")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid token")

    ext = os.path.splitext(file.filename)[1]
    safe_name = os.path.splitext(file.filename)[0].replace(" ", "_")
    object_key = f"uploads/{uuid.uuid4().hex}_{safe_name}{ext}"
    content_type = file.content_type or "application/octet-stream"

    import io
    try:

        file_bytes = await file.read()
        s3_uri = upload_fileobj_to_s3(io.BytesIO(file_bytes), object_key, content_type)
        
        await file.seek(0)
    except EnvironmentError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    collection = db["documents"]
    doc = {
        "title": file.filename,
        "user": ObjectId(user_id),
        "fileType": content_type,
        "size": len(file_bytes),
        "s3_uri": s3_uri,
        "status": "processing",
        "createdAt": datetime.now(timezone.utc),
    }
    result = await collection.insert_one(doc)
    doc_id = str(result.inserted_id)

    try:
        ingest_res = await ingest_document(file, doc_id, user_id, background_tasks)
        
        await collection.update_one(
            {"_id": result.inserted_id},
            {"$set": {
                "status": "ready",
                "chroma_id": doc_id,
                "chunks": ingest_res.get("chunks", 0)
            }}
        )
        doc["status"] = "ready"
        doc["chroma_id"] = doc_id
        doc["chunks"] = ingest_res.get("chunks", 0)
    except Exception as e:
        await collection.update_one(
            {"_id": result.inserted_id},
            {"$set": {"status": "error"}}
        )
        doc["status"] = "error"
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")

    doc["_id"] = doc_id
    doc["user"] = str(doc["user"])

    return doc
