from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routes import auth, documents, chat, sessions

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Internal Knowledge Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])

@app.get("/health")
def health():
    return {"status": "ok"}
