from fastapi import APIRouter
from core.chroma import collection

router = APIRouter(tags=["health"])


@router.get("/")
def read_root():
    return {"status": "MindNexus Cortex Online", "service": "Python"}


@router.get("/health")
def health_check():
    return {"status": "healthy"}


@router.get("/debug/count")
def count_vectors():
    count = collection.count()
    return {"total_chunks": count}
