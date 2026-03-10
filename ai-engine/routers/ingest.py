from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks
from services.ingest_service import ingest_document

router = APIRouter(tags=["ingest"])


@router.post("/ingest")
async def ingest_endpoint(
    file: UploadFile = File(...),
    doc_id: str = Form(...),
    user_id: str = Form(...),
    background_tasks: BackgroundTasks = None,
):
    return await ingest_document(file, doc_id, user_id, background_tasks)
