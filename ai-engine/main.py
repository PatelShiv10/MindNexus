import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings

import core.chroma
import core.neo4j  
import core.llm 

from routers import health, ingest, chat, graph, document, podcast, upload

app = FastAPI(title="MindNexus AI Engine", version="2.0.0")

os.makedirs(settings.AUDIO_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(ingest.router)
app.include_router(chat.router)
app.include_router(graph.router)
app.include_router(document.router)
app.include_router(podcast.router)
app.include_router(upload.router)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
