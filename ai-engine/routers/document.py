from fastapi import APIRouter
from services.graph_service import delete_document_data, purge_all_data

router = APIRouter(tags=["document"])


@router.delete("/document/{doc_id}")
async def delete_document_endpoint(doc_id: str):
    return await delete_document_data(doc_id)


@router.delete("/purge")
async def purge_endpoint():
    return await purge_all_data()
