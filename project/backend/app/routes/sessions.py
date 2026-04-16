import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user

router = APIRouter()

@router.post("/", status_code=201)
def create_session(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = models.ChatSession(title="New Chat", owner_id=current_user.id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"id": session.id, "title": session.title, "created_at": session.created_at.isoformat(), "message_count": 0}

@router.get("/")
def list_sessions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    sessions = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.owner_id == current_user.id)
        .order_by(models.ChatSession.updated_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
            "message_count": len(s.messages),
        }
        for s in sessions
    ]

@router.get("/{session_id}/messages")
def get_messages(session_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.owner_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "citations": json.loads(m.citations) if m.citations else [],
            "created_at": m.created_at.isoformat(),
        }
        for m in session.messages
    ]

@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.owner_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
