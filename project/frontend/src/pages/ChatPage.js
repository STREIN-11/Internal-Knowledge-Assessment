import React, { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../api";

function CitationToggle({ citations }) {
  const [open, setOpen] = React.useState(false);
  const unique = citations.filter((c, i, arr) => arr.findIndex(x => x.doc_title === c.doc_title) === i);
  return (
    <div style={styles.citations}>
      <button onClick={() => setOpen(o => !o)} style={styles.citToggle}>
        📎 {unique.length} Source{unique.length > 1 ? "s" : ""} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={styles.citList}>
          {unique.map((c, j) => (
            <div key={j} style={styles.citItem}>📄 {c.doc_title}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionMenu({ sessionId, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        style={styles.menuBtn}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
      >⋮</button>
      {open && (
        <div style={styles.dropdown}>
          <button style={styles.dropItem} onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(sessionId); }}>
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get("/api/sessions/");
      setSessions(res.data);
    } catch {
      toast.error("Failed to load chat sessions");
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  async function loadSession(sessionId) {
    setActiveSessionId(sessionId);
    try {
      const res = await api.get(`/api/sessions/${sessionId}/messages`);
      setMessages(res.data.map(m => ({
        role: m.role,
        text: m.role === "user" ? m.content : undefined,
        answer: m.role === "assistant" ? m.content : undefined,
        citations: m.citations || [],
      })));
    } catch {
      toast.error("Failed to load messages");
    }
  }

  async function newChat() {
    try {
      const res = await api.post("/api/sessions/");
      setSessions(s => [res.data, ...s]);
      setActiveSessionId(res.data.id);
      setMessages([]);
    } catch {
      toast.error("Failed to create new chat");
    }
  }

  async function deleteSession(sessionId) {
    try {
      await api.delete(`/api/sessions/${sessionId}`);
      setSessions(s => s.filter(x => x.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
      toast.success("Chat deleted");
    } catch {
      toast.error("Failed to delete chat");
    }
  }

  async function sendMessage() {
    const q = query.trim();
    if (!q) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const res = await api.post("/api/sessions/");
        sessionId = res.data.id;
        setSessions(s => [res.data, ...s]);
        setActiveSessionId(sessionId);
      } catch {
        toast.error("Failed to create session");
        return;
      }
    }

    setQuery("");
    setMessages(m => [...m, { role: "user", text: q }]);
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ role: m.role, content: m.role === "user" ? m.text : m.answer }));

      const res = await api.post("/api/chat/", { query: q, top_k: 5, history, session_id: sessionId });
      setMessages(m => [...m, { role: "assistant", ...res.data }]);

      // Update session title in sidebar
      setSessions(s => s.map(x =>
        x.id === sessionId
          ? { ...x, title: x.title === "New Chat" ? q.slice(0, 50) : x.title, message_count: (x.message_count || 0) + 2 }
          : x
      ));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Chat failed");
      setMessages(m => [...m, { role: "assistant", answer: "Sorry, something went wrong.", citations: [] }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <button className="btn btn-primary" style={styles.newChatBtn} onClick={newChat}>
          + New Chat
        </button>
        <div style={styles.sessionList}>
          {sessions.length === 0 && (
            <div style={styles.emptySession}>No chats yet. Start a new one!</div>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              style={{ ...styles.sessionTab, ...(s.id === activeSessionId ? styles.activeTab : {}) }}
              onClick={() => loadSession(s.id)}
            >
              <div style={styles.sessionInfo}>
                <div style={styles.sessionTitle}>{s.title}</div>
                <div style={styles.sessionMeta}>{s.message_count} messages</div>
              </div>
              <SessionMenu sessionId={s.id} onDelete={deleteSession} />
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div style={styles.chatArea}>
        <div style={styles.messages}>
          {messages.length === 0 && (
            <div style={styles.welcome}>
              <div style={{ fontSize: 56 }}>💬</div>
              <h2>Ask anything about your documents</h2>
              <p style={{ color: "#6b7280" }}>Select a chat or start a new one.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{ ...styles.bubble, ...(msg.role === "user" ? styles.userBubble : styles.aiBubble) }}>
              {msg.role === "user" ? (
                <div style={styles.userText}>{msg.text}</div>
              ) : (
                <div>
                  <div style={styles.aiLabel}>
                    🤖 Assistant
                    {msg.method && <span className="badge" style={{ marginLeft: 8 }}>{msg.method}</span>}
                    {msg.latency_ms && <span style={styles.latency}>⏱ {msg.latency_ms}ms</span>}
                  </div>
                  <div style={styles.aiText}>{msg.answer}</div>
                  {msg.citations?.length > 0 && <CitationToggle citations={msg.citations} />}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ ...styles.bubble, ...styles.aiBubble }}>
              <div style={styles.aiLabel}>🤖 Assistant</div>
              <div style={styles.typing}><span /><span /><span /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={styles.inputRow}>
          <textarea
            style={styles.textarea}
            rows={2}
            placeholder="Ask a question about your documents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button className="btn btn-primary" style={styles.sendBtn} onClick={sendMessage} disabled={loading || !query.trim()}>
            {loading ? "…" : "Send ➤"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        .typing span { display:inline-block; width:8px; height:8px; margin:0 2px; background:#4f46e5; border-radius:50%; animation:bounce 1.4s infinite ease-in-out; }
        .typing span:nth-child(2){animation-delay:.16s}
        .typing span:nth-child(3){animation-delay:.32s}
      `}</style>
    </div>
  );
}

const styles = {
  page: { display: "flex", height: "calc(100vh - 60px)", overflow: "hidden" },

  // Sidebar
  sidebar: { width: 260, display: "flex", flexDirection: "column", borderRight: "1px solid #e5e7eb", background: "#fff" },
  newChatBtn: { margin: 12, justifyContent: "center" },
  sessionList: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, padding: "0 8px 12px" },
  emptySession: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 24, padding: "0 12px" },
  sessionTab: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, cursor: "pointer", transition: "background 0.15s" },
  activeTab: { background: "#ede9fe" },
  sessionInfo: { flex: 1, minWidth: 0 },
  sessionTitle: { fontSize: 13, fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  sessionMeta: { fontSize: 11, color: "#9ca3af", marginTop: 2 },

  // 3-dot menu
  menuBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9ca3af", padding: "0 4px", lineHeight: 1, borderRadius: 4 },
  dropdown: { position: "absolute", right: 0, top: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 50, minWidth: 120 },
  dropItem: { display: "block", width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#ef4444", textAlign: "left" },

  // Chat area
  chatArea: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  messages: { flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 16 },
  welcome: { textAlign: "center", margin: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  bubble: { maxWidth: "80%", borderRadius: 12, padding: "14px 18px" },
  userBubble: { alignSelf: "flex-end", background: "#4f46e5", color: "#fff" },
  aiBubble: { alignSelf: "flex-start", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
  userText: { fontSize: 15 },
  aiLabel: { fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8, display: "flex", alignItems: "center" },
  aiText: { fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap" },
  latency: { marginLeft: 8, fontSize: 11, color: "#9ca3af" },
  citations: { marginTop: 10, paddingTop: 10, borderTop: "1px solid #e5e7eb" },
  citToggle: { background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#4f46e5", padding: 0 },
  citList: { marginTop: 8, display: "flex", flexDirection: "column", gap: 4 },
  citItem: { fontSize: 12, color: "#6b7280", padding: "4px 8px", background: "#f3f4f6", borderRadius: 6 },
  inputRow: { display: "flex", gap: 12, padding: "16px 32px", borderTop: "1px solid #e5e7eb", background: "#fff" },
  textarea: { flex: 1, resize: "none", borderRadius: 10, fontSize: 15 },
  sendBtn: { alignSelf: "flex-end", padding: "10px 20px" },
  typing: { display: "flex", alignItems: "center", height: 24 },
};
