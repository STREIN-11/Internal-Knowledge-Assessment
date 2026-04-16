import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def extract_text(file_path: str, file_type: str) -> str:
    ext = file_type.lower().strip(".")
    try:
        if ext == "pdf":
            return _extract_pdf(file_path)
        elif ext in ("docx", "doc"):
            return _extract_docx(file_path)
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
    except Exception as e:
        logger.error(f"Text extraction failed for {file_path}: {e}")
        return ""

def _extract_pdf(path: str) -> str:
    import PyPDF2
    text = []
    with open(path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            text.append(page.extract_text() or "")
    return "\n".join(text)

def _extract_docx(path: str) -> str:
    from docx import Document
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs)
