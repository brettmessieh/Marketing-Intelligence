import { createContext, useContext, useState, useEffect } from "react";
import { XANO_BASE } from "../api/xano";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if we have a stored token and validate it
  useEffect(() => {
    const token = localStorage.getItem("xano_token");
    if (token) {
      fetch(`${XANO_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => {
          if (!r.ok) throw new Error("Invalid token");
          return r.json();
        })
        .then((userData) => {
          setUser(userData);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem("xano_token");
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await fetch(`${XANO_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Invalid email or password");
    }

    const { authToken } = await res.json();
    localStorage.setItem("xano_token", authToken);

    // Fetch user profile
    const meRes = await fetch(`${XANO_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const userData = await meRes.json();
    setUser(userData);
    return userData;
  };

  const signup = async (name, email, password) => {
    const res = await fetch(`${XANO_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role: "viewer" }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Signup failed");
    }

    const { authToken } = await res.json();
    localStorage.setItem("xano_token", authToken);

    const meRes = await fetch(`${XANO_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const userData = await meRes.json();
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem("xano_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
