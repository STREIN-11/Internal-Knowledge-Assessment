# Architecture Document
## Internal Knowledge Assistant

**Version:** 1.1  
**Date:** April 2026  
**Type:** Full-Stack RAG (Retrieval-Augmented Generation) Application

---

## 1. Executive Summary

The Internal Knowledge Assistant is a full-stack web application that enables users to upload internal documents and CVs, then interact with them through a conversational AI interface. The system uses a RAG pipeline to retrieve relevant document chunks and generate contextually accurate answers with source citations. It supports persistent multi-turn chat sessions per user — all conversations are stored and restored on login.

---

## 2. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User (Browser)                             │
│                    http://localhost:3000                            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────────────┐
│                    Frontend (React SPA)                             │
│              served via nginx (:80) or npm start (:3000)            │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐    │
│  │  LoginPage  │  │   DocsPage   │  │        ChatPage          │    │
│  │  Register   │  │ Upload / List│  │  Sessions sidebar        │    │
│  └─────────────┘  └──────────────┘  │  Chat + Citations        │    │
│                                     │  3-dot delete menu       │    │
│                                     └──────────────────────────┘    │
│  nginx proxies /api/* → backend:8000                                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────────────┐
│                    Backend (FastAPI + Uvicorn :8000)                │
│                                                                     │
│  ┌────────────┐  ┌───────────────┐  ┌──────────┐  ┌─────────────┐   │
│  │ /api/auth  │  │/api/documents │  │/api/chat │  │/api/sessions│   │
│  │ register   │  │ upload / list │  │ RAG query│  │ list/create │   │     
│  │ login      │  │ delete        │  │ + history│  │ delete      │   │           
│  └────────────┘  └──────┬────────┘  └────┬─────┘  └─────────────┘   │
│                         │                │                          │
│  ┌─────────────┐  ┌─────▼──────────┐  ┌──▼──────────────────────┐   │
│  │   auth.py   │  │  extractor.py  │  │     rag_service.py      │   │
│  │ JWT + bcrypt│  │ PDF/DOCX/TXT   │  │  chunk → embed → store  │   │
│  └─────────────┘  └────────────────┘  └──────────┬──────────────┘   │
│                                                   │                 │
│                                        ┌──────────▼──────────────┐  │
│                                        │     llm_service.py      │  │
│                                        │  OpenAI / Extractive    │  │
│                                        └─────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────┐   ┌─────────────────────────────────┐ │
│  │      SQLite Database     │   │    ChromaDB (Vector Store)      │ │
│  │  users, documents,       │   │    embeddings + chunk metadata  │ │
│  │  chat_sessions,          │   │    (persistent volume)          │ │
│  │  chat_messages           │   └─────────────────────────────────┘ │
│  └──────────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend Framework | React | 18.3.1 | SPA UI |
| Frontend Routing | React Router | 6.23.1 | Client-side routing |
| HTTP Client | Axios | 1.7.2 | API communication |
| Notifications | react-hot-toast | 2.4.1 | Toast messages |
| Web Server | nginx | alpine | Serve React + proxy API (Docker) |
| Backend Framework | FastAPI | 0.111.0 | REST API |
| ASGI Server | Uvicorn | 0.29.0 | Python async server |
| Authentication | python-jose + passlib | 3.3.0 / 1.7.4 | JWT + bcrypt |
| ORM | SQLAlchemy | 2.0.30 | Database abstraction |
| Database | SQLite | built-in | Users, documents, chat sessions |
| Vector Store | ChromaDB | 0.4.24 | Embedding storage + retrieval |
| Embeddings | sentence-transformers | 2.7.0 | all-MiniLM-L6-v2 model |
| LLM (optional) | OpenAI API | 1.30.1 | GPT-3.5/4 answer generation |
| PDF Parsing | PyPDF2 | 3.0.1 | Extract text from PDFs |
| DOCX Parsing | python-docx | 1.1.2 | Extract text from Word docs |
| Containerization | Docker + Compose | 29.x | Containerized deployment |

---

## 4. Component Architecture

### 4.1 Frontend

```
frontend/src/
├── App.js              # Router, private route guard
├── api.js              # Axios instance, JWT interceptor, 401 redirect
├── index.js            # React entry point
├── index.css           # Global styles
├── pages/
│   ├── LoginPage.js    # Login + Register (toggle mode)
│   ├── DocsPage.js     # Upload, list, delete documents
│   └── ChatPage.js     # Session tabs, chat, citations, 3-dot delete
└── components/
    └── Navbar.js       # Navigation, logout
```

**Key design decisions:**
- JWT token stored in `localStorage`, injected into every request via Axios interceptor
- 401 responses automatically redirect to `/login` and clear stored token
- Chat sessions loaded from backend on page load — persisted across logins
- Conversation history sent with each request for multi-turn context awareness
- Citations rendered as collapsable toggles to keep the UI clean
- Private routes redirect unauthenticated users to `/login`

### 4.2 Backend

```
backend/app/
├── main.py             # FastAPI app, CORS middleware, route registration
├── database.py         # SQLAlchemy engine, session factory, get_db dependency
├── models.py           # User, Document, ChatSession, ChatMessage ORM models
├── auth.py             # JWT creation/validation, password hashing, get_current_user
├── extractor.py        # Text extraction: PDF (PyPDF2), DOCX (python-docx), TXT
├── rag_service.py      # Chunking, embedding (sentence-transformers), ChromaDB ops
├── llm_service.py      # Prompt building, OpenAI call, extractive fallback
└── routes/
    ├── auth.py         # POST /api/auth/register, POST /api/auth/login
    ├── documents.py    # POST /upload, GET /, DELETE /{id}
    ├── chat.py         # POST /api/chat/ (saves messages to session)
    └── sessions.py     # POST /, GET /, GET /{id}/messages, DELETE /{id}
```

### 4.3 Data Models

**User**
| Field | Type | Description |
|---|---|---|
| id | Integer (PK) | Auto-increment |
| username | String (unique) | Login identifier |
| email | String (unique) | Email address |
| hashed_password | String | bcrypt hash |
| created_at | DateTime | Registration timestamp |

**Document**
| Field | Type | Description |
|---|---|---|
| id | Integer (PK) | Auto-increment |
| title | String | Filename without extension |
| filename | String | Original filename |
| file_type | String | pdf / docx / txt |
| file_size | Integer | Bytes |
| chunk_count | Integer | Number of vector chunks stored |
| uploaded_at | DateTime | Upload timestamp |
| owner_id | Integer (FK) | References users.id |

**ChatSession**
| Field | Type | Description |
|---|---|---|
| id | Integer (PK) | Auto-increment |
| title | String | Auto-generated from first message (50 chars) |
| created_at | DateTime | Session creation time |
| updated_at | DateTime | Last message time (used for ordering) |
| owner_id | Integer (FK) | References users.id |

**ChatMessage**
| Field | Type | Description |
|---|---|---|
| id | Integer (PK) | Auto-increment |
| role | String | `user` or `assistant` |
| content | Text | Message text |
| citations | Text | JSON array of source citations |
| created_at | DateTime | Message timestamp |
| session_id | Integer (FK) | References chat_sessions.id |

---

## 5. Chat Session Flow

```
User clicks "+ New Chat"
         │
         ▼
  POST /api/sessions/ → creates ChatSession (title="New Chat")
         │
         ▼
  User types query → sends to POST /api/chat/
  with { query, history, session_id }
         │
         ▼
  RAG retrieval → LLM generation → answer + citations
         │
         ▼
  Save ChatMessage (role=user) to session
  Save ChatMessage (role=assistant) to session
  Auto-title session from first query (if title="New Chat")
         │
         ▼
  Return answer to frontend
         │
         ▼
  On next login → GET /api/sessions/ → list all user sessions
  Click session → GET /api/sessions/{id}/messages → restore full chat
```

---

## 6. RAG Pipeline

### 6.1 Document Ingestion Flow

```
User uploads file (PDF / DOCX / TXT)
         │
         ▼
  Validate file type (pdf, docx, txt, doc only)
         │
         ▼
  Save raw file to /uploads
         │
         ▼
  Extract text
  ├── PDF  → PyPDF2 (page-by-page)
  ├── DOCX → python-docx (paragraph-by-paragraph)
  └── TXT  → plain read (utf-8)
         │
         ▼
  Save Document metadata → SQLite
         │
         ▼
  Chunk text (fixed-size word chunks)
  ├── CHUNK_SIZE   = 500 words
  └── CHUNK_OVERLAP = 50 words
         │
         ▼
  Embed chunks → sentence-transformers all-MiniLM-L6-v2
  (384-dimensional dense vectors)
         │
         ▼
  Upsert into ChromaDB
  └── id: "{doc_id}_chunk_{i}"
      metadata: { doc_id, doc_title, chunk_index }
         │
         ▼
  Update chunk_count in SQLite
```

### 6.2 Query / Chat Flow

```
User sends query + conversation history + session_id
         │
         ▼
  Embed query (all-MiniLM-L6-v2)
         │
         ▼
  Vector similarity search → ChromaDB → top_k=5 chunks
         │
         ▼
  Build LLM messages array
  ├── [system]  → role + citation instructions
  ├── [history] → last 6 turns (user + assistant)
  └── [user]    → context chunks + current query
         │
         ▼
  Generate answer
  ├── Option A: OpenAI GPT-3.5/4 (if OPENAI_API_KEY set)
  └── Option B: Extractive fallback (best chunk text)
         │
         ▼
  Persist messages to ChatSession in SQLite
         │
         ▼
  Return: { answer, citations, method, latency_ms }
```

### 6.3 Embedding Model

- **Model:** `all-MiniLM-L6-v2` (sentence-transformers)
- **Dimensions:** 384
- **Runs:** locally on CPU — no external API required

---

## 7. Authentication & Security

### 7.1 Auth Flow

```
Register → hash password (bcrypt) → store in SQLite
Login    → verify bcrypt hash → issue JWT (HS256, 24h expiry)
Request  → Bearer token in Authorization header
           → decode JWT → lookup user in DB → inject into route
```

### 7.2 Security Details

| Concern | Implementation |
|---|---|
| Password storage | bcrypt via passlib |
| Token format | JWT signed with HS256 |
| Token expiry | 24 hours |
| Secret key | Env var `SECRET_KEY` |
| CORS | `allow_origins=["*"]` — restrict in production |
| Protected routes | All `/api/documents/*`, `/api/chat/*`, `/api/sessions/*` require JWT |
| Session isolation | Sessions filtered by `owner_id` — users only see their own chats |

---

## 8. Infrastructure & Deployment

### 8.1 Option A — Docker (Recommended)

```bash
cp .env.example .env
docker compose up --build
# open http://localhost:3000
```

```
Services:
  backend   → FastAPI (port 8000), volumes: uploads_data, chroma_data
  frontend  → nginx serving React build (port 3000 → 80)

Volumes:
  uploads_data  → /app/uploads    (raw files)
  chroma_data   → /app/chroma_db  (vector embeddings)
```

### 8.2 Option B — Local (Without Docker)

**Terminal 1 — Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm start
# open http://localhost:3000
```

### 8.3 Network Flow (Docker)

```
Browser :3000 → nginx (:80)
                  ├── /        → React static files
                  ├── /api/*   → proxy → backend:8000
                  └── /health  → proxy → backend:8000/health
```

---

## 9. API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | None | Register new user |
| POST | /api/auth/login | None | Login, returns JWT |

### Documents
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/documents/upload | JWT | Upload + ingest document |
| GET | /api/documents/ | JWT | List all documents |
| DELETE | /api/documents/{id} | JWT | Delete document + vector chunks |

### Chat
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/chat/ | JWT | RAG query with history, saves to session |

### Sessions
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/sessions/ | JWT | Create new chat session |
| GET | /api/sessions/ | JWT | List all sessions for current user |
| GET | /api/sessions/{id}/messages | JWT | Get all messages in a session |
| DELETE | /api/sessions/{id} | JWT | Delete session + all its messages |

### System
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /health | None | Health check |

---

## 10. Configuration (Environment Variables)

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `changeme-...` | JWT signing secret |
| `DATABASE_URL` | `sqlite:///./knowledge_assistant.db` | DB connection string |
| `OPENAI_API_KEY` | _(empty)_ | OpenAI key — blank = extractive fallback |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | OpenAI model name |
| `CHROMA_PATH` | `./chroma_db` | ChromaDB persistence directory |
| `CHUNK_SIZE` | `500` | Words per chunk |
| `CHUNK_OVERLAP` | `50` | Overlap words between chunks |
| `TOP_K` | `5` | Chunks retrieved per query |
| `UPLOAD_DIR` | `./uploads` | File upload directory |

---

## 11. Key Design Decisions & Tradeoffs

| Decision | Rationale | Tradeoff |
|---|---|---|
| SQLite over PostgreSQL | Zero-config, no extra container | Not suitable for concurrent writes at scale |
| ChromaDB (local) over Pinecone | No external service, works offline | Single-node, no managed scaling |
| sentence-transformers (local) | No embedding API cost, works offline | CPU-only, slower for large datasets |
| Fixed-size word chunking | Simple, predictable | Semantic boundaries may be split |
| Extractive fallback | Works without any API key | Lower quality than LLM-generated answers |
| JWT in localStorage | Simple implementation | Vulnerable to XSS — use httpOnly cookies in production |
| Conversation history (last 6 turns) | Enables follow-up questions | Older context dropped beyond 6 turns |
| Sessions stored in SQLite | Persistent across logins, no extra service | Not horizontally scalable without migration |
| Auto-title from first message | Better UX than "New Chat" | Title may be truncated mid-sentence |
| CORS allow_origins=["*"] | Easy local development | Must be restricted in production |

---

## 12. What Would Be Improved in Production

1. **PostgreSQL + pgvector** — Replace SQLite + ChromaDB with a single managed PostgreSQL instance
2. **Async document ingestion** — Use Celery + Redis for background processing of large files
3. **Streaming responses** — SSE or WebSockets for real-time token streaming from LLM
4. **Semantic chunking** — Sentence-aware chunking using spaCy or NLTK for better retrieval
5. **Re-ranking** — Cross-encoder re-ranker after initial vector retrieval for higher precision
6. **HTTPS + secure cookies** — Replace localStorage JWT with httpOnly secure cookies
7. **Role-based access control** — Admin vs. user roles, document-level permissions
8. **Monitoring** — OpenTelemetry tracing, structured JSON logging, Grafana dashboard
9. **Rate limiting** — Per-user request throttling on chat and upload endpoints
10. **CI/CD pipeline** — GitHub Actions for automated testing and container image builds
11. **Session search** — Full-text search across past chat sessions
12. **Token-aware chunking** — Chunk by token count instead of word count for precise LLM context window management
