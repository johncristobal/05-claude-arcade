"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  login: (user: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): User | null {
  try {
    return JSON.parse(localStorage.getItem("av_user") || "null");
  } catch {
    return null;
  }
}

function getServerSnapshot(): User | null {
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const storedUser = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [override, setOverride] = useState<{ value: User | null } | null>(null);
  const user = override ? override.value : storedUser;

  const login = (u: User) => {
    localStorage.setItem("av_user", JSON.stringify(u));
    setOverride({ value: u });
  };

  const signOut = () => {
    localStorage.removeItem("av_user");
    setOverride({ value: null });
  };

  return (
    <AuthContext.Provider value={{ user, login, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
