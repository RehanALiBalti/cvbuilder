import { createContext, useContext, useMemo, useState } from "react";

const AUTH_KEY = "cvbuilder_user";
const USERS_KEY = "cvbuilder_users";

const AuthContext = createContext(null);

function loadUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,

    signup(name, email, password) {
      const users = loadUsers();
      const normalized = email.trim().toLowerCase();
      if (users.some((u) => u.email === normalized)) {
        throw new Error("An account with this email already exists.");
      }
      if (!name.trim() || !password || password.length < 6) {
        throw new Error("Name required and password must be at least 6 characters.");
      }
      const newUser = {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: normalized,
        password,
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      const session = { id: newUser.id, name: newUser.name, email: newUser.email };
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      setUser(session);
      return session;
    },

    login(email, password) {
      const users = loadUsers();
      const normalized = email.trim().toLowerCase();
      const match = users.find((u) => u.email === normalized && u.password === password);
      if (!match) {
        throw new Error("Invalid email or password.");
      }
      const session = { id: match.id, name: match.name, email: match.email };
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      setUser(session);
      return session;
    },

    logout() {
      localStorage.removeItem(AUTH_KEY);
      setUser(null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
