import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>SSM</div>
          <h1 style={styles.title}>Command Center</h1>
          <p style={styles.subtitle}>Sleep Science Mattress - Marketing Intelligence</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@sleepsciencemattress.com"
            required
            style={styles.input}
            autoFocus
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            style={styles.input}
          />

          <button type="submit" disabled={loading} style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={styles.footer}>
          Contact your admin for access credentials.
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100vw",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1a1d23 0%, #0f1117 50%, #1a1d23 100%)",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#22252d",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.06)",
    padding: "40px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
  },
  logoArea: {
    textAlign: "center",
    marginBottom: "32px",
  },
  logoIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "64px",
    height: "64px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    fontSize: "18px",
    fontWeight: "700",
    letterSpacing: "1px",
    marginBottom: "16px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#e8eaed",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "13px",
    color: "#9ca3af",
    fontWeight: "400",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#9ca3af",
    marginTop: "8px",
    marginBottom: "2px",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    background: "#1a1d23",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    color: "#e8eaed",
    fontSize: "14px",
    fontFamily: "'Outfit', sans-serif",
    outline: "none",
    transition: "border-color 0.2s",
  },
  button: {
    width: "100%",
    padding: "12px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    fontFamily: "'Outfit', sans-serif",
    marginTop: "20px",
    transition: "opacity 0.2s, transform 0.1s",
  },
  error: {
    padding: "10px 14px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "8px",
    color: "#ef4444",
    fontSize: "13px",
    textAlign: "center",
  },
  footer: {
    textAlign: "center",
    marginTop: "24px",
    fontSize: "12px",
    color: "#6b7280",
  },
};
