import os
import logging
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from typing import List, Dict

logger = logging.getLogger(__name__)

CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "500"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "50"))
TOP_K = int(os.getenv("TOP_K", "5"))

_client = None
_collection = None
_embedder = None

def get_chroma_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
        _collection = _client.get_or_create_collection("documents")
    return _collection

def get_embedder():
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder

def chunk_text(text: str) -> List[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), CHUNK_SIZE - CHUNK_OVERLAP):
        chunk = " ".join(words[i:i + CHUNK_SIZE])
        if chunk.strip():
            chunks.append(chunk.strip())
    return chunks

def embed_and_store(doc_id: str, doc_title: str, text: str) -> int:
    chunks = chunk_text(text)
    if not chunks:
        return 0
    embedder = get_embedder()
    collection = get_chroma_collection()
    embeddings = embedder.encode(chunks).tolist()
    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"doc_id": doc_id, "doc_title": doc_title, "chunk_index": i} for i in range(len(chunks))]
    collection.upsert(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)
    logger.info(f"Stored {len(chunks)} chunks for doc {doc_id}")
    return len(chunks)

def retrieve_top_k(query: str, k: int = TOP_K) -> List[Dict]:
    embedder = get_embedder()
    collection = get_chroma_collection()
    query_embedding = embedder.encode([query]).tolist()
    results = collection.query(query_embeddings=query_embedding, n_results=k)
    chunks = []
    if results and results["documents"]:
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i]
            chunks.append({
                "text": doc,
                "doc_id": meta.get("doc_id"),
                "doc_title": meta.get("doc_title"),
                "chunk_index": meta.get("chunk_index"),
                "distance": results["distances"][0][i] if results.get("distances") else None,
            })
    return chunks

def delete_doc_chunks(doc_id: str):
    collection = get_chroma_collection()
    results = collection.get(where={"doc_id": doc_id})
    if results and results["ids"]:
        collection.delete(ids=results["ids"])
        logger.info(f"Deleted {len(results['ids'])} chunks for doc {doc_id}")
