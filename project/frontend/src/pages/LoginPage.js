import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        await api.post("/api/auth/register", form);
        toast.success("Registered! Please log in.");
        setMode("login");
      } else {
        const params = new URLSearchParams({ username: form.username, password: form.password });
        const res = await api.post("/api/auth/login", params, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("username", res.data.username);
        navigate("/");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div className="card" style={styles.card}>
        <div style={styles.logo}>🧠</div>
        <h1 style={styles.title}>Internal Knowledge Assistant</h1>
        <p style={styles.sub}>{mode === "login" ? "Sign in to your account" : "Create a new account"}</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input name="username" placeholder="Username" value={form.username} onChange={handleChange} required />
          {mode === "register" && (
            <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          )}
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Register"}
          </button>
        </form>

        <p style={styles.toggle}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span style={styles.link} onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Register" : "Sign In"}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  card: { width: "100%", maxWidth: 420, textAlign: "center" },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 },
  sub: { color: "#6b7280", fontSize: 14, marginBottom: 24 },
  form: { display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 },
  toggle: { fontSize: 14, color: "#6b7280" },
  link: { color: "#4f46e5", fontWeight: 600, cursor: "pointer" },
};
