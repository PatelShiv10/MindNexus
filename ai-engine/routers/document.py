from fastapi import APIRouter, Query
from services.graph_service import delete_document_data, purge_all_data
from services.s3_service import delete_s3_object

router = APIRouter(tags=["document"])

@router.delete("/document/{doc_id}")
async def delete_document_endpoint(doc_id: str, s3_uri: str = Query(None)):
    if s3_uri:
        delete_s3_object(s3_uri)
    return await delete_document_data(doc_id)


@router.delete("/purge")
async def purge_endpoint():
    return await purge_all_data()

from pydantic import BaseModel
from services.s3_service import generate_presigned_get

class DownloadRequest(BaseModel):
    s3_uri: str
    filename: str

@router.post("/document/download-url")
def get_download_url(req: DownloadRequest):
    url = generate_presigned_get(req.s3_uri, original_filename=req.filename)
    if not url:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Could not generate download URL")
    return {"url": url}
