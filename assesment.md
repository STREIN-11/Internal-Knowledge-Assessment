

Full Stack / Architect POC
Objective of the POC is to give you the candidate an opportunity to present your
capability and depth of knowledge. It should not take more than 2-3 days to turn this
around and HR will get in touch with you and schedule an interview.
1-day (3–5 hours) POC / practical activity that will help you  demonstrate full-stack
ability plus the backend + AI/RAG strengths in their profile, without being unrealistically
big.

POC: “Internal Knowledge Assistant” (Full-Stack + RAG)
## Goal
Build a small full-stack application that lets a user:
- Upload or select internal documents, CV (provided sample docs and explain,
use a sample size of 5)
- Search + chat with those docs using a RAG (Retrieval-Augmented Generation)
flow
- View citations/sources for each answer
- Deploy/run locally via Docker Compose with a clean README
This mirrors real work: API design, DB, vector search, prompt engineering, UI, and
DevOps basics.
RAG requirements (minimum viable)
- Chunk docs (simple fixed size or sentence-based)
- Create embeddings + store vectors
- Retrieve top-K chunks for a query
- Build prompt with retrieved chunks
- Generate response with citations (at least doc title + snippet)
- Option 1 (preferred): Local embeddings + local LLM (if they can)
- Option 2: OpenAI/hosted LLM with env var key

- Option 3 (fallback): If no LLM available, return “extractive answer” by ranking
chunks and returning the best snippet(s) with a short summary.
Vector store options (pick one)
Database options (pick one)

B) Frontend (React preferred)
Required UI screens
## 1. Login
- Docs page
o Upload doc
o List docs + basic metadata
- Chat page
o Chat input
o Show assistant response
o Show sources/citations under each response
o Optional: show latency
Nice-to-have UX
- Loading states
- Error toasts/messages
- Simple styling (Tailwind or basic CSS)

C) DevOps / Quality (must-have)
- docker-compose.yml that runs:
o frontend
o backend
o database (if used)

- .env.example showing required env vars
- README.md with:
o setup steps
o architecture explanation
o tradeoffs and what they’d improve next
- Basic logging + error handling
- At least 3 tests (backend preferred)

Acceptance Criteria (What “Done” Looks Like)
App runs locally with docker compose up
Can login and access the app
Can upload docs and list them
Can ask a question like:
- “What’s the role ? Can you give me additional information about the company?
- “What are the rounds of interview and how will my data get stored and managed
in the system?
Has a README + .env.example
Has tests + reasonable code structure
- Note: Please pick / generate some CV from the Internet minimum 5 need to be
ingested
- Refer to the CV retention, company information and data management policy