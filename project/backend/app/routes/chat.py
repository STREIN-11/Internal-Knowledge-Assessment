import json
import time
import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.auth import get_current_user
from app import models
from app.database import get_db
from sqlalchemy.orm import Session
from app.rag_service import retrieve_top_k
from app.llm_service import generate_answer

router = APIRouter()
logger = logging.getLogger(__name__)

class HistoryMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str
    top_k: int = 5
    history: Optional[List[HistoryMessage]] = []
    session_id: Optional[int] = None

@router.post("/")
def chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    start = time.time()
    chunks = retrieve_top_k(req.query, k=req.top_k)
    result = generate_answer(req.query, chunks, history=req.history)
    latency_ms = round((time.time() - start) * 1000)
    logger.info(f"Chat query by {current_user.username}: '{req.query}' | method={result['method']} | latency={latency_ms}ms")

    # Save messages to session
    if req.session_id:
        session = db.query(models.ChatSession).filter(
            models.ChatSession.id == req.session_id,
            models.ChatSession.owner_id == current_user.id
        ).first()
        if session:
            # Auto-title session from first user message
            if session.title == "New Chat":
                session.title = req.query[:50] + ("..." if len(req.query) > 50 else "")
            db.add(models.ChatMessage(role="user", content=req.query, session_id=session.id))
            db.add(models.ChatMessage(
                role="assistant",
                content=result["answer"],
                citations=json.dumps(result["citations"]),
                session_id=session.id
            ))
            from datetime import datetime
            session.updated_at = datetime.utcnow()
            db.commit()

    return {
        "answer": result["answer"],
        "citations": result["citations"],
        "method": result["method"],
        "latency_ms": latency_ms,
    }
