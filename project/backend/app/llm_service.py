import os
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

SYSTEM_PROMPT = """You are a helpful assistant. Answer questions based on the provided document context.
If the answer is not in the context, say "I don't have enough information to answer that."
Cite the document title for each fact you use."""

def generate_answer(query: str, chunks: List[Dict], history: Optional[List] = None) -> Dict:
    if not chunks:
        return {
            "answer": "No relevant documents found to answer your question.",
            "citations": [],
            "method": "no_context",
        }

    citations = [
        {"doc_title": c["doc_title"], "doc_id": c["doc_id"], "snippet": c["text"][:200]}
        for c in chunks
    ]

    context = "\n\n".join(f"[Source: {c['doc_title']}]\n{c['text']}" for c in chunks)

    if OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)

            messages = [{"role": "system", "content": SYSTEM_PROMPT}]

            # Add conversation history (last 6 messages to stay within token limits)
            for h in (history or [])[-6:]:
                messages.append({"role": h.role, "content": h.content})

            # Add current query with retrieved context
            messages.append({
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {query}"
            })

            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                max_tokens=600,
                temperature=0.2,
            )
            answer = response.choices[0].message.content.strip()
            return {"answer": answer, "citations": citations, "method": "openai"}
        except Exception as e:
            logger.warning(f"OpenAI call failed: {e}, falling back to extractive")

    # Extractive fallback
    best = chunks[0]
    answer = f"Based on '{best['doc_title']}':\n\n{best['text'][:600]}"
    return {"answer": answer, "citations": citations, "method": "extractive"}
