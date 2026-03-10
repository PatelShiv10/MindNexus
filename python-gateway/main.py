from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import connect_db, close_db
from middleware.logging import RequestLoggingMiddleware
from routers import documents, chat, graph, system


# ──────────────────────────────────────────────
# Lifespan: DB connect / disconnect
# ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


# ──────────────────────────────────────────────
# App
# ──────────────────────────────────────────────

app = FastAPI(
    title="MindNexus Python Gateway",
    description=(
        "Python FastAPI gateway for MindNexus. "
        "Handles documents, chat sessions, and graph proxying. "
        "Authentication (login/signup) remains in the Node.js server."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (mirror the JS server — allow all origins for development) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request Logger ──
app.add_middleware(RequestLoggingMiddleware)

# ── Routers ──
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(graph.router)
app.include_router(system.router)


# ──────────────────────────────────────────────
# Root health check
# ──────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {"status": "MindNexus Python Gateway is running 🚀"}
