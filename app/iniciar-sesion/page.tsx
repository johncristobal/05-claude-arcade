"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthPage() {
  const router = useRouter();
  const {
    login,
    signUp,
    signInWithOAuth,
    signOut,
    isRecovery,
    resetPasswordForEmail,
    updatePassword,
  } = useAuth();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(
    null,
  );
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const changeTab = (next: "in" | "up") => {
    setTab(next);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === "up" && pass.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    const result =
      tab === "in" ? await login(email, pass) : await signUp(email, pass);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (tab === "up") {
      setRegistered(true);
    } else {
      router.push("/");
    }
  };

  const guest = () => {
    signOut();
    router.push("/");
  };

  const oauth = async (provider: "google" | "github") => {
    setError(null);
    setOauthLoading(provider);
    const result = await signInWithOAuth(provider);
    if (result.error) {
      setError(result.error);
      setOauthLoading(null);
    }
  };

  const openForgot = () => {
    setForgotMode(true);
    setError(null);
  };

  const closeForgot = () => {
    setForgotMode(false);
    setForgotSent(false);
    setError(null);
  };

  const submitForgot = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await resetPasswordForEmail(forgotEmail);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setForgotSent(true);
  };

  const submitRecovery = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    const result = await updatePassword(newPassword);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/");
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        {isRecovery ? (
          <>
            <p className="mono" style={{ fontSize: 12, margin: "16px 0" }}>
              Elegí una nueva contraseña para tu cuenta.
            </p>
            <form onSubmit={submitRecovery}>
              <div className="field">
                <label>Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <button
                className="btn lg"
                type="submit"
                style={{ width: "100%", marginTop: 8 }}
                disabled={submitting}
              >
                {submitting ? "ENVIANDO…" : "GUARDAR CONTRASEÑA"}
              </button>
            </form>
            {error && <div className="contact-error">{error}</div>}
          </>
        ) : registered ? (
          <div
            className="mono"
            style={{ textAlign: "center", padding: "24px 0" }}
          >
            <p style={{ marginBottom: 12 }}>
              Revisá tu correo para confirmar la cuenta.
            </p>
            <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>
              Te enviamos un link de confirmación a {email}.
            </p>
          </div>
        ) : forgotMode ? (
          <>
            {forgotSent ? (
              <div
                className="mono"
                style={{ textAlign: "center", padding: "24px 0" }}
              >
                <p style={{ marginBottom: 12 }}>Revisá tu correo.</p>
                <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                  Te enviamos un link para restablecer tu contraseña a{" "}
                  {forgotEmail}.
                </p>
              </div>
            ) : (
              <>
                <p className="mono" style={{ fontSize: 12, margin: "16px 0" }}>
                  Ingresá tu correo y te enviamos un link para restablecer tu
                  contraseña.
                </p>
                <form onSubmit={submitForgot}>
                  <div className="field">
                    <label>Correo electrónico</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="jugador@vault.gg"
                    />
                  </div>
                  <button
                    className="btn lg"
                    type="submit"
                    style={{ width: "100%", marginTop: 8 }}
                    disabled={submitting}
                  >
                    {submitting ? "ENVIANDO…" : "ENVIAR LINK"}
                  </button>
                </form>
                {error && <div className="contact-error">{error}</div>}
              </>
            )}
            <button
              type="button"
              className="btn ghost"
              style={{ width: "100%", marginTop: 10 }}
              onClick={closeForgot}
            >
              VOLVER
            </button>
          </>
        ) : (
          <>
            <div className="auth-tabs">
              <button
                className={tab === "in" ? "on" : ""}
                onClick={() => changeTab("in")}
              >
                INICIAR SESIÓN
              </button>
              <button
                className={tab === "up" ? "on" : ""}
                onClick={() => changeTab("up")}
              >
                CREAR CUENTA
              </button>
            </div>

            <form onSubmit={submit}>
              <div className="field">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jugador@vault.gg"
                />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {tab === "in" && (
                <button
                  type="button"
                  className="mono"
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: "var(--ink-faint)",
                    textDecoration: "underline",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  onClick={openForgot}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}

              <button
                className="btn lg"
                type="submit"
                style={{ width: "100%", marginTop: 8 }}
                disabled={submitting}
              >
                {submitting
                  ? "ENVIANDO…"
                  : tab === "in"
                    ? "ENTRAR AL VAULT"
                    : "CREAR Y JUGAR"}
              </button>
            </form>

            <button
              className="btn ghost"
              style={{ width: "100%", marginTop: 10 }}
              onClick={guest}
            >
              JUGAR COMO INVITADO
            </button>

            <div className="auth-divider">O CONTINÚA CON</div>
            <div className="social">
              <button
                className="btn ghost"
                type="button"
                onClick={() => oauth("google")}
                disabled={oauthLoading !== null}
              >
                {oauthLoading === "google" ? "REDIRIGIENDO…" : "◆ GOOGLE"}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => oauth("github")}
                disabled={oauthLoading !== null}
              >
                {oauthLoading === "github" ? "REDIRIGIENDO…" : "▣ GITHUB"}
              </button>
            </div>

            {error && <div className="contact-error">{error}</div>}

            <div
              style={{
                marginTop: 18,
                textAlign: "center",
                fontSize: 11,
                color: "var(--ink-faint)",
                letterSpacing: "0.1em",
              }}
            >
              AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
            </div>
          </>
        )}
      </div>
    </div>
  );
}
