import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import api from "../api";

export default function DocsPage() {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef();

  async function fetchDocs() {
    try {
      const res = await api.get("/api/documents/");
      setDocs(res.data);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDocs(); }, []);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      await api.post("/api/documents/upload", formData);
      toast.success(`"${file.name}" uploaded successfully!`);
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      fileRef.current.value = "";
    }
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await api.delete(`/api/documents/${id}`);
      toast.success("Document deleted");
      setDocs((d) => d.filter((doc) => doc.id !== id));
    } catch {
      toast.error("Delete failed");
    }
  }

  function formatSize(bytes) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>📄 Documents</h2>
          <p style={styles.sub}>Upload and manage your knowledge base documents</p>
        </div>
        <label className="btn btn-primary" style={{ cursor: "pointer" }}>
          {uploading ? "Uploading…" : "⬆ Upload Document"}
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.doc" style={{ display: "none" }} onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {loading ? (
        <div style={styles.empty}>Loading documents…</div>
      ) : docs.length === 0 ? (
        <div className="card" style={styles.empty}>
          <div style={{ fontSize: 48 }}>📭</div>
          <p>No documents yet. Upload your first document to get started.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {docs.map((doc) => (
            <div className="card" key={doc.id} style={styles.docCard}>
              <div style={styles.docIcon}>{doc.file_type === "pdf" ? "📕" : doc.file_type === "docx" ? "📘" : "📄"}</div>
              <div style={styles.docInfo}>
                <div style={styles.docTitle}>{doc.title}</div>
                <div style={styles.docMeta}>
                  <span className="badge">{doc.file_type.toUpperCase()}</span>
                  <span style={styles.metaText}>{formatSize(doc.file_size)}</span>
                  <span style={styles.metaText}>{doc.chunk_count} chunks</span>
                </div>
                <div style={styles.metaText}>Uploaded by <strong>{doc.uploaded_by}</strong> · {new Date(doc.uploaded_at).toLocaleDateString()}</div>
              </div>
              <button className="btn btn-danger" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => handleDelete(doc.id, doc.title)}>🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: 900, margin: "0 auto", padding: "32px 16px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 700 },
  sub: { color: "#6b7280", fontSize: 14, marginTop: 4 },
  empty: { textAlign: "center", padding: "60px 24px", color: "#6b7280", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  grid: { display: "flex", flexDirection: "column", gap: 12 },
  docCard: { display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" },
  docIcon: { fontSize: 32, flexShrink: 0 },
  docInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 6 },
  docTitle: { fontWeight: 600, fontSize: 16 },
  docMeta: { display: "flex", alignItems: "center", gap: 10 },
  metaText: { fontSize: 13, color: "#6b7280" },
};
