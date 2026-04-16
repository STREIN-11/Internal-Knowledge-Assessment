import io
import pytest

# ── Auth Tests ──────────────────────────────────────────────────────────────

def test_register_and_login(client):
    res = client.post("/api/auth/register", json={
        "username": "testuser", "email": "test@example.com", "password": "secret123"
    })
    assert res.status_code == 201

    res = client.post("/api/auth/login", data={"username": "testuser", "password": "secret123"})
    assert res.status_code == 200
    assert "access_token" in res.json()

def test_login_invalid_credentials(client):
    res = client.post("/api/auth/login", data={"username": "nobody", "password": "wrong"})
    assert res.status_code == 401

def test_duplicate_register(client):
    client.post("/api/auth/register", json={
        "username": "dupuser", "email": "dup@example.com", "password": "pass"
    })
    res = client.post("/api/auth/register", json={
        "username": "dupuser", "email": "dup2@example.com", "password": "pass"
    })
    assert res.status_code == 400

# ── Document Tests ───────────────────────────────────────────────────────────

def _get_token(client, username="docuser", email="doc@example.com", password="pass123"):
    client.post("/api/auth/register", json={"username": username, "email": email, "password": password})
    res = client.post("/api/auth/login", data={"username": username, "password": password})
    return res.json()["access_token"]

def test_list_documents_requires_auth(client):
    res = client.get("/api/documents/")
    assert res.status_code == 401

def test_upload_txt_document(client):
    token = _get_token(client)
    content = b"Alice is a software engineer with 5 years of experience in Python and AWS."
    res = client.post(
        "/api/documents/upload",
        files={"file": ("sample_cv.txt", io.BytesIO(content), "text/plain")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "sample_cv"
    assert data["chunk_count"] >= 1

def test_list_documents(client):
    token = _get_token(client, "listuser", "list@example.com", "pass")
    res = client.get("/api/documents/", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)

# ── Chat Tests ───────────────────────────────────────────────────────────────

def test_chat_requires_auth(client):
    res = client.post("/api/chat/", json={"query": "Who is Alice?"})
    assert res.status_code == 401

def test_chat_returns_answer(client):
    token = _get_token(client, "chatuser", "chat@example.com", "pass")
    # Upload a doc first
    content = b"Bob is a data scientist specializing in machine learning and NLP."
    client.post(
        "/api/documents/upload",
        files={"file": ("bob_cv.txt", io.BytesIO(content), "text/plain")},
        headers={"Authorization": f"Bearer {token}"},
    )
    res = client.post(
        "/api/chat/",
        json={"query": "What does Bob specialize in?"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert "answer" in body
    assert "citations" in body
    assert "latency_ms" in body
