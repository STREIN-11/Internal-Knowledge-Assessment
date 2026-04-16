# 🧠 Internal Knowledge Assistant

A full-stack RAG (Retrieval-Augmented Generation) application that lets users upload internal documents and CVs, then search and chat with them using AI — with citations for every answer.

---

## 🚀 Quick Start (Docker)

```bash
# 1. Clone / navigate to the project
cd project

# 2. Copy environment file
cp .env.example .env

# 3. (Optional) Add your OpenAI key in .env for LLM answers
#    Leave blank to use extractive fallback (no API key needed)
OPENAI_API_KEY=sk-...

# 4. Start everything
docker compose up --build

# 5. Open the app
open http://localhost:3000
```

**Default credentials:** Register a new account on the login screen.

---

## 📋 Setup Steps

### Prerequisites
- Docker Desktop (v24+)
- Docker Compose v2

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | JWT signing secret | `changeme-secret-key-for-dev` |
| `DATABASE_URL` | SQLite or PostgreSQL URL | `sqlite:///./knowledge_assistant.db` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | _(blank = extractive fallback)_ |
| `OPENAI_MODEL` | OpenAI model name | `gpt-3.5-turbo` |
| `CHROMA_PATH` | ChromaDB persistence path | `./chroma_db` |
| `CHUNK_SIZE` | Words per chunk | `500` |
| `CHUNK_OVERLAP` | Overlap between chunks | `50` |
| `TOP_K` | Chunks retrieved per query | `5` |
| `UPLOAD_DIR` | File upload directory | `./uploads` |

### Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

### Sample Documents

5 sample CVs are provided in `sample_docs/`. Upload them via the UI after logging in:

- `cv_sarah_johnson_software_engineer.txt`
- `cv_michael_chen_data_scientist.txt`
- `cv_priya_patel_devops_engineer.txt`
- `cv_james_okafor_product_manager.txt`
- `cv_elena_vasquez_architect.txt`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│              React SPA (port 3000)                          │
│   Login │ Docs Page │ Chat Page                             │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP (nginx proxy)
┌──────────────────▼──────────────────────────────────────────┐
│                   FastAPI Backend (port 8000)               │
│                                                             │
│  /api/auth    → JWT register/login                          │
│  /api/documents → upload, list, delete                      │
│  /api/chat    → RAG query endpoint                          │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  Extractor  │  │  RAG Service │  │   LLM Service    │    │
│  │ PDF/DOCX/TXT│  │  ChromaDB    │  │ OpenAI / Fallback│    │
│  └─────────────┘  └──────────────┘  └──────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  SQLite (users + document metadata)                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### RAG Flow

```
User Query
    │
    ▼
Embed query (sentence-transformers: all-MiniLM-L6-v2)
    │
    ▼
Vector similarity search → ChromaDB → Top-K chunks
    │
    ▼
Build prompt: [System] + [Context chunks] + [Query]
    │
    ▼
LLM (OpenAI GPT) or Extractive fallback
    │
    ▼
Response + Citations (doc title + snippet)
```

### Document Ingestion Flow

```
Upload file (PDF / DOCX / TXT)
    │
    ▼
Extract text (PyPDF2 / python-docx / plain text)
    │
    ▼
Chunk text (fixed-size word chunks, configurable overlap)
    │
    ▼
Embed chunks (sentence-transformers)
    │
    ▼
Store vectors in ChromaDB + metadata in SQLite
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router, Axios, react-hot-toast |
| Backend | Python 3.11, FastAPI, SQLAlchemy |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Vector Store | ChromaDB (local, persistent) |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| LLM | OpenAI GPT-3.5/4 (optional) or extractive fallback |
| Database | SQLite (default) |
| File Parsing | PyPDF2, python-docx |
| DevOps | Docker, Docker Compose, nginx |

---

## 📁 Project Structure

```
project/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + CORS + routes
│   │   ├── database.py      # SQLAlchemy engine + session
│   │   ├── models.py        # User + Document ORM models
│   │   ├── auth.py          # JWT + password utilities
│   │   ├── extractor.py     # PDF/DOCX/TXT text extraction
│   │   ├── rag_service.py   # Chunking, embedding, ChromaDB
│   │   ├── llm_service.py   # OpenAI + extractive fallback
│   │   └── routes/
│   │       ├── auth.py      # /api/auth endpoints
│   │       ├── documents.py # /api/documents endpoints
│   │       └── chat.py      # /api/chat endpoint
│   ├── tests/
│   │   ├── conftest.py      # pytest fixtures
│   │   └── test_api.py      # auth + docs + chat tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js           # Router + private routes
│   │   ├── api.js           # Axios client + interceptors
│   │   ├── index.js         # React entry point
│   │   ├── index.css        # Global styles
│   │   ├── pages/
│   │   │   ├── LoginPage.js # Login + Register
│   │   │   ├── DocsPage.js  # Upload + list documents
│   │   │   └── ChatPage.js  # Chat + citations
│   │   └── components/
│   │       └── Navbar.js    # Navigation bar
│   ├── public/index.html
│   ├── nginx.conf           # nginx reverse proxy config
│   ├── Dockerfile
│   └── package.json
├── sample_docs/             # 5 sample CVs (txt format)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ✅ Acceptance Criteria

| Criteria | Status |
|---|---|
| `docker compose up` starts the app | ✅ |
| Login / Register works | ✅ |
| Upload documents (PDF, DOCX, TXT) | ✅ |
| List documents with metadata | ✅ |
| Ask questions, get RAG answers | ✅ |
| Citations/sources shown per answer | ✅ |
| Works without OpenAI key (extractive fallback) | ✅ |
| README + .env.example | ✅ |
| At least 3 backend tests | ✅ (7 tests) |
| 5 sample CVs provided | ✅ |

---

## ⚖️ Tradeoffs & What I'd Improve Next

### Current Tradeoffs

- **SQLite over PostgreSQL**: Simpler setup for local dev, but not suitable for production scale or concurrent writes.
- **Local ChromaDB**: Persistent but single-node. For production, would use a managed vector DB (Pinecone, Weaviate, or pgvector on RDS).
- **sentence-transformers on CPU**: Works well for small-medium datasets. For large scale, would use GPU inference or a hosted embedding API.
- **No streaming**: LLM responses are returned in full. Streaming would improve perceived latency.
- **Simple JWT auth**: No refresh tokens, no OAuth2 social login.
- **Fixed-size chunking**: Sentence-aware or semantic chunking would improve retrieval quality.

### What I'd Improve Next

1. **Streaming responses** – Use SSE or WebSockets for real-time token streaming from the LLM
2. **Better chunking** – Implement semantic/sentence-aware chunking using NLTK or spaCy
3. **Re-ranking** – Add a cross-encoder re-ranker (e.g., `cross-encoder/ms-marco-MiniLM`) after initial retrieval
4. **Conversation history** – Maintain multi-turn chat context for follow-up questions
5. **PostgreSQL + pgvector** – Replace SQLite + ChromaDB with a single PostgreSQL instance using pgvector extension
6. **Role-based access** – Admin vs. regular user roles; document-level access control
7. **Async processing** – Use Celery + Redis for background document ingestion (large files)
8. **Monitoring** – Add OpenTelemetry tracing, structured logging, and a metrics dashboard
9. **More file types** – Support Excel, PowerPoint, HTML, Markdown
10. **Evaluation** – Add RAG evaluation metrics (faithfulness, relevance) using RAGAS framework
