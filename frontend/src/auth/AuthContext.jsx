import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const AuthContext = createContext(null);
const TOKEN_KEY = "wellai_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }

    let active = true;
    api
      .get("/auth/me")
      .then(({ data }) => {
        if (active) setUser(data);
      })
      .catch(() => {
        if (active) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    const currentUser = await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setUser(currentUser.data);
    return currentUser.data;
  }

  async function register(name, email, password) {
    await api.post("/auth/register", { name, email, password });
    return login(email, password);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
