"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isRecovery: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signInWithOAuth: (
    provider: "google" | "github",
  ) => Promise<{ error: string | null }>;
  signOut: () => void;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function deriveUser(session: Session | null): User | null {
  if (!session?.user?.email) return null;
  const email = session.user.email;
  return {
    id: session.user.id,
    email,
    name: email.split("@")[0].toUpperCase().slice(0, 10),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(deriveUser(session));
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsRecovery(true);
        } else if (event === "SIGNED_OUT") {
          setIsRecovery(false);
        }
        setUser(deriveUser(session));
        setLoading(false);
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, [supabase]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error ? error.message : null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error ? error.message : null };
  };

  const signInWithOAuth = async (provider: "google" | "github") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
    return { error: error ? error.message : null };
  };

  const signOut = () => {
    void supabase.auth.signOut();
  };

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/iniciar-sesion`,
    });
    return { error: error ? error.message : null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setIsRecovery(false);
    return { error: error ? error.message : null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isRecovery,
        login,
        signUp,
        signInWithOAuth,
        signOut,
        resetPasswordForEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
