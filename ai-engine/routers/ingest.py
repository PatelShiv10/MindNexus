from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, Body
from services.ingest_service import ingest_document, ingest_youtube, reindex_document

router = APIRouter(tags=["ingest"])


@router.post("/ingest")
async def ingest_endpoint(
    file: UploadFile = File(...),
    doc_id: str = Form(...),
    user_id: str = Form(...),
    background_tasks: BackgroundTasks = None,
):
    return await ingest_document(file, doc_id, user_id, background_tasks)


from pydantic import BaseModel

class YouTubeRequest(BaseModel):
    url: str

@router.post("/ingest/youtube")
async def ingest_youtube_endpoint(
    request: YouTubeRequest,
    doc_id: str,
    user_id: str,
    background_tasks: BackgroundTasks = None
):
    try:
        # Call the ingest_youtube service functionality
        result = await ingest_youtube(
            url=request.url,
            doc_id=doc_id,
            user_id=user_id,
            background_tasks=background_tasks
        )
        # Match expected backend output
        return {
            "status": "success", 
            "message": "YouTube video successfully embedded.", 
            "chunks": result.get("chunks", 0), 
            "title": result.get("title", "")
        }
    except Exception as e:
        # The service handles its own exceptions and raises HTTPException, so this provides a fallback
        raise

@router.post("/reindex/{doc_id}")
async def reindex_endpoint(
    doc_id: str,
    user_id: str = Form(...),
    background_tasks: BackgroundTasks = None
):
    return await reindex_document(doc_id, user_id, background_tasks)
