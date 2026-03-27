# 🧠 MindNexus

> **An AI-powered learning platform** that transforms your documents into an interactive knowledge system — featuring RAG-based chat, 3D knowledge graphs, AI-generated podcasts, Socratic tutoring, and adaptive exam sessions.

---

## 📚 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)

---

## Overview

MindNexus is a full-stack, microservice-based platform that lets you upload documents (PDFs, etc.), automatically processes them into a vector store (ChromaDB) and a knowledge graph (Neo4j), and then exposes a suite of AI-powered learning tools:

- 💬 **Chat** — RAG-powered Q&A over your documents
- 🕸️ **Knowledge Graph** — Interactive 3D graph of concepts extracted from your content
- 🎙️ **Podcasts** — Auto-generated audio summaries using edge-tts
- 🧑‍🏫 **Socratic Tutor** — Guided Socratic dialogue for deep understanding
- 📝 **Training & Exams** — AI-generated quizzes and exam sessions with reports
- 🗄️ **Archives** — Manage uploaded documents stored in AWS S3

---

## Architecture

MindNexus is composed of **four services** that work together:

```
┌───────────────────────────────────────────────────────────┐
│                          Client                           │
│              React 18 + Vite  (port 5173)                 │
└──────────┬────────────────────────────┬───────────────────┘
           │                            │
           ▼                            ▼
┌──────────────────┐        ┌───────────────────────────┐
│  Auth Server     │        │    Python Gateway         │
│  Node.js/Express │        │    FastAPI  (port 8080)   │
│  (port 3000)     │        │    Documents, Chat, Graph │
└──────────┬───────┘        └──────────────┬────────────┘
           │                               │
           ▼                               ▼
      MongoDB (27017)           ┌──────────────────────┐
                                │     AI Engine        │
                                │  FastAPI (port 8000) │
                                │  LangChain + Groq    │
                                │  ChromaDB + Neo4j    │
                                │  AWS S3 + edge-tts   │
                                └──────────────────────┘
```

| Service | Role | Port |
|---|---|---|
| `client` | React frontend | 5173 |
| `server` | Auth (signup/login/JWT) via Node.js + MongoDB | 3000 |
| `python-gateway` | Proxy for documents, chat, and graph (JWT-protected) | 8080 |
| `ai-engine` | RAG pipeline, graph extraction, podcast generation, S3 | 8000 |

> **Databases** are managed via Docker Compose: MongoDB (27017) and Neo4j (7474/7687).

---

## Features

| Feature | Description |
|---|---|
| 📄 Document Upload | Upload PDFs directly to AWS S3 with presigned URLs |
| 🔍 RAG Chat | Ask questions and get answers grounded in your documents |
| 🕸️ Knowledge Graph | Visualize concept relationships extracted by the LLM as a 3D graph |
| 🎙️ AI Podcast | Generate a listenable audio summary of any document |
| 🧑‍🏫 Socratic Tutor | AI-guided deep-learning conversations |
| 📝 Adaptive Exams | Generate, take, and review AI-created exams from your documents |
| 📦 Archives | Browse, filter, and download all uploaded documents |
| 👤 Auth | JWT-based signup/login with role support (user/doctor/admin) |
| ⚙️ Settings | Manage profile, API keys, preferences, and privacy |

---

## Tech Stack

### Frontend (`client`)
- **React 18** + Vite
- **Tailwind CSS** + Framer Motion (animations)
- **react-force-graph-3d** (knowledge graph visualisation)
- **react-markdown** (chat rendering)
- **react-dropzone** (file upload)
- Lucide React icons, Headless UI

### Auth Server (`server`)
- **Node.js** + Express
- **Mongoose** (MongoDB ODM)
- **bcryptjs** (password hashing), **jsonwebtoken** (JWT)
- **Nodemailer** (email), Multer

### Python Gateway (`python-gateway`)
- **FastAPI** + Uvicorn
- **Motor** (async MongoDB driver)
- **PyJWT** (JWT validation), httpx (AI engine proxy)

### AI Engine (`ai-engine`)
- **FastAPI** + Uvicorn
- **LangChain** (0.3.x) — RAG, text splitting, Neo4j graph chain
- **ChromaDB** — vector store for document embeddings
- **Groq API** — LLM inference (Llama 3.1 8B Instant by default)
- **Ollama** (`nomic-embed-text`) — local embeddings
- **Neo4j** — knowledge graph storage
- **edge-tts** — text-to-speech podcast generation
- **AWS S3** — file storage (presigned upload/download URLs)
- **PyPDF** — PDF parsing

---

## Prerequisites

Make sure the following are installed before running the project:

| Tool | Version |
|---|---|
| Node.js | >= 18 |
| Python | >= 3.10 |
| Docker & Docker Compose | Latest |
| Ollama | Latest (for local embeddings) |

You also need accounts / API keys for:
- [Groq](https://console.groq.com) — LLM inference
- [AWS S3](https://aws.amazon.com/s3/) — file storage (bucket + IAM credentials)

---

## Environment Variables

### `server/.env`

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/mindnexus
JWT_SECRET=your_jwt_secret_at_least_32_chars_long
```

### `python-gateway/.env`

```env
PORT=8080
MONGO_URI=mongodb://localhost:27017/mindnexus - change this if you are using a different port for mongodb
JWT_SECRET=your jwt secret at least 32 chars long   # Must match server
AI_ENGINE_URL=http://localhost:8000
```

### `ai-engine/.env`

```env
PORT=8000

# LLM
GROQ_API_KEY=your_groq_api_key
LLM_MODEL=llama-3.1-8b-instant

# Embeddings (Ollama)
EMBEDDING_MODEL=nomic-embed-text
OLLAMA_BASE_URL=http://localhost:XXXX - change this if you are using a different port for ollama

# Vector Store
CHROMA_PATH=./chroma_db

# Neo4j
NEO4J_URL=bolt://localhost:XXXX - change this if you are using a different port for neo4j
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password - change this if you are using a different password for neo4j

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1 - change this if you are using a different region for aws s3
AWS_S3_BUCKET_NAME=your_bucket_name

# Auth
MONGO_URI=mongodb://localhost:27017/mindnexus - change this if you are using a different port for mongodb
JWT_SECRET=your jwt secret at least 32 chars long
```

> ⚠️ **Important:** `JWT_SECRET` must be identical across all three backend services.

---

## Running the Project

### Step 1 — Start Databases (Docker)

```bash
docker compose up -d
```

This starts:
- **MongoDB** on port `27017`
- **Neo4j** on port `7474` (browser) and `7687` (bolt)

### Step 2 — Start Ollama (local embeddings)

```bash
ollama serve
ollama pull nomic-embed-text
```

### Step 3 — Start the AI Engine

```bash
cd ai-engine
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

Runs on **http://localhost:8000**

### Step 4 — Start the Python Gateway

```bash
cd python-gateway
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

Runs on **http://localhost:8080**

### Step 5 — Start the Auth Server (Node.js)

```bash
cd server
npm install
npm run dev
```

Runs on **http://localhost:3000**

### Step 6 — Start the Frontend

```bash
cd client
npm install
npm run dev
```

Opens at **http://localhost:5173**

---

## Project Structure

```
MindNexus/
├── docker-compose.yml          # MongoDB + Neo4j containers
│
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── public/         # Landing page, Login, Signup
│   │   │   └── dashboard/      # Main app pages
│   │   │       ├── NexusHome.jsx       # Dashboard home
│   │   │       ├── Training.jsx        # Document chat & RAG
│   │   │       ├── SocraticTutor.jsx   # Socratic AI tutor
│   │   │       ├── ExamSession.jsx     # Exam-taking UI
│   │   │       ├── ExamReport.jsx      # Post-exam analytics
│   │   │       ├── Archives.jsx        # Document manager
│   │   │       └── Settings.jsx        # Profile & preferences
│   │   ├── components/         # Reusable UI components
│   │   ├── context/            # React context (Auth state)
│   │   └── layouts/            # Dashboard layout wrapper
│
├── server/                     # Node.js auth server
│   ├── index.js                # Express entry point
│   ├── routes/authRoutes.js    # Signup, login, JWT issuance
│   └── models/                 # Mongoose user models
│
├── python-gateway/             # FastAPI API gateway
│   ├── main.py                 # App entry point
│   ├── routers/
│   │   ├── documents.py        # Document CRUD + S3
│   │   ├── chat.py             # Chat session management
│   │   ├── graph.py            # Graph proxy
│   │   └── system.py          # Health check
│   ├── middleware/             # JWT auth, logging
│   └── core/database.py       # Motor/MongoDB connection
│
└── ai-engine/                  # FastAPI AI processing engine
    ├── main.py                 # App entry point
    ├── core/
    │   ├── config.py           # Settings (env vars)
    │   ├── chroma.py           # ChromaDB client
    │   ├── neo4j.py            # Neo4j driver
    │   └── llm.py              # Groq LLM setup
    ├── routers/
    │   ├── ingest.py           # Document ingestion pipeline
    │   ├── chat.py             # RAG Q&A endpoint
    │   ├── graph.py            # Knowledge graph endpoints
    │   ├── podcast.py          # Audio generation
    │   ├── upload.py           # S3 presigned URL / upload
    │   └── document.py         # Document utilities
    └── services/
        ├── ingest_service.py   # PDF parsing + chunking + embedding
        ├── chat_service.py     # LangChain RAG chain
        ├── graph_service.py    # Neo4j graph extraction
        ├── podcast_service.py  # edge-tts audio pipeline
        ├── s3_service.py       # AWS S3 operations
        └── background_service.py # Async batch processing
```

---

## API Overview

### Auth Server (`:3000`)

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/health` | Health check |

### Python Gateway (`:8080`)

| Method | Route | Description |
|---|---|---|
| GET | `/documents` | List user's documents |
| DELETE | `/documents/:id` | Delete a document |
| POST | `/chat/sessions` | Create a chat session |
| GET | `/chat/sessions` | List chat sessions |
| POST | `/graph/proxy` | Proxy to AI engine graph |

### AI Engine (`:8000`)

| Method | Route | Description |
|---|---|---|
| POST | `/api/upload-and-process` | Upload file → S3 → ingest pipeline |
| POST | `/api/generate-upload-url` | Get presigned S3 POST URL |
| POST | `/api/ingest` | Ingest a document into ChromaDB |
| POST | `/api/chat` | RAG chat with documents |
| GET | `/api/graph` | Get knowledge graph data |
| POST | `/api/podcast/generate` | Generate audio podcast |
| GET | `/api/health` | Health check |

---

## Notes

- The platform uses **batch sliding-window processing** for large documents to avoid LLM token limits.
- Neo4j runs with **APOC plugin** enabled — no authentication required in development (`NEO4J_AUTH=none`).
- Podcast audio files are served as static files from `ai-engine/static/audio/`.
- For production, lock down CORS origins and set strong secrets.
