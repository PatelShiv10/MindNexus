from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, Body
from services.ingest_service import ingest_document, ingest_youtube

router = APIRouter(tags=["ingest"])


@router.post("/ingest")
async def ingest_endpoint(
    file: UploadFile = File(...),
    doc_id: str = Form(...),
    user_id: str = Form(...),
    background_tasks: BackgroundTasks = None,
):
    return await ingest_document(file, doc_id, user_id, background_tasks)


@router.post("/ingest/youtube")
async def ingest_youtube_endpoint(
    url: str = Body(...),
    # Use optional forms, but practically we should just ensure gateway uses Body payload for doc_id/user_id in reality.
    # Gateway passes { url } currently in client side axios request but we'll adapt to standard payload. 
    # For now gateway isn't passing doc_id and user_id for YouTube explicitly in the user payload but is required.
    # Let's let Gateway handle the forwarding, Gateway actually forwards to ai-engine, so we need to match Gateway API
):
    pass

