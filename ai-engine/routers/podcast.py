import os
import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.chroma import collection
from core.neo4j import graph
from core.config import settings
from services.background_service import active_podcast_tasks
from services.podcast_service import generate_script, synthesize_audio

router = APIRouter(tags=["podcast"])


class PodcastRequest(BaseModel):
    doc_id: str


@router.get("/podcast/status/{doc_id}")
async def podcast_status(doc_id: str):
    file_path = os.path.join(settings.AUDIO_DIR, f"podcast_{doc_id}.mp3")
    timeline_path = os.path.join(settings.AUDIO_DIR, f"podcast_{doc_id}.json")

    if os.path.exists(file_path) and os.path.exists(timeline_path):
        return {"status": "ready", "doc_id": doc_id}
    if doc_id in active_podcast_tasks:
        return {"status": "processing", "doc_id": doc_id}
    return {"status": "not_started", "doc_id": doc_id}


@router.post("/podcast")
async def generate_podcast_endpoint(request: PodcastRequest):
    doc_id = request.doc_id
    filename = f"podcast_{doc_id}.mp3"
    file_path = os.path.join(settings.AUDIO_DIR, filename)
    timeline_path = os.path.join(settings.AUDIO_DIR, f"podcast_{doc_id}.json")

    if os.path.exists(file_path) and os.path.exists(timeline_path):
        print(f"DEBUG [podcast]: Returning cached files for {doc_id}")
        with open(timeline_path, "r") as f:
            timeline = json.load(f)
        return {
            "audio_url": f"http://localhost:{settings.PORT}/static/audio/{filename}",
            "timeline": timeline,
        }

    if doc_id in active_podcast_tasks:
        return {
            "status": "processing",
            "message": "Podcast is already being generated in the background. Please wait.",
        }

    results = collection.get(where={"doc_id": doc_id})
    documents = results.get("documents", [])
    if not documents:
        raise HTTPException(status_code=404, detail="Document not found in knowledge base.")
    full_text = "\n".join(documents)
    # Truncate to ~12 000 chars (~3 000 tokens) to stay under Groq free-tier TPM limit
    MAX_CHARS = 12_000
    if len(full_text) > MAX_CHARS:
        full_text = full_text[:MAX_CHARS]
        print(f"DEBUG [podcast]: Text truncated to {MAX_CHARS} chars for LLM.")

    node_ids: list[str] = []
    if graph:
        try:
            data = graph.query(
                "MATCH (n {doc_id: $doc_id}) RETURN n.id AS id",
                params={"doc_id": doc_id},
            )
            node_ids = [r["id"] for r in data if r.get("id")]
            print(f"DEBUG [podcast]: {len(node_ids)} nodes for sync.")
        except Exception as e:
            print(f"WARNING [podcast]: Could not fetch nodes: {e}")

    try:
        script = generate_script(full_text)
        _, timeline = await synthesize_audio(script, filename, node_ids)
    except Exception as e:
        print(f"ERROR [podcast]: Generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Podcast generation failed: {e}")

    return {
        "audio_url": f"http://localhost:{settings.PORT}/static/audio/{filename}",
        "timeline": timeline,
    }
