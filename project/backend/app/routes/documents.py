import os
import logging
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user
from app.extractor import extract_text
from app.rag_service import embed_and_store, delete_doc_chunks

router = APIRouter()
logger = logging.getLogger(__name__)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
ALLOWED_TYPES = {"pdf", "docx", "txt", "doc"}

os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", status_code=201)
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' not supported. Allowed: {ALLOWED_TYPES}")

    save_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = os.path.getsize(save_path)
    text = extract_text(save_path, ext)
    if not text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from document")

    doc = models.Document(
        title=file.filename.rsplit(".", 1)[0],
        filename=file.filename,
        file_type=ext,
        file_size=file_size,
        owner_id=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    chunk_count = embed_and_store(str(doc.id), doc.title, text)
    doc.chunk_count = chunk_count
    db.commit()

    logger.info(f"User {current_user.username} uploaded doc {doc.id} with {chunk_count} chunks")
    return {"id": doc.id, "title": doc.title, "chunk_count": chunk_count}

@router.get("/")
def list_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    docs = db.query(models.Document).all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "filename": d.filename,
            "file_type": d.file_type,
            "file_size": d.file_size,
            "chunk_count": d.chunk_count,
            "uploaded_at": d.uploaded_at.isoformat(),
            "uploaded_by": d.owner.username if d.owner else "unknown",
        }
        for d in docs
    ]

@router.delete("/{doc_id}", status_code=204)
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    delete_doc_chunks(str(doc_id))
    file_path = os.path.join(UPLOAD_DIR, doc.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    db.delete(doc)
    db.commit()
