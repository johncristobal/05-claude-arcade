"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { GAMES } from "@/lib/data";
import type { SavedScore } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { useRocasGame } from "@/lib/games/rocas/useRocasGame";

export default function GamePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const game = GAMES.find((g) => g.id === id);
  const isRocas = game?.id === "rocas";

  // Se destructura de inmediato: leer `rocas.campo` repetidas veces en el
  // render hace que el linter de React Compiler trate todo el objeto como
  // si contuviera una ref (por `canvasRef`) y bloquee la lectura de los
  // demás campos durante el render. Destructurar una vez evita eso.
  const {
    canvasRef: rocasCanvasRef,
    score: rocasScore,
    lives: rocasLives,
    level: rocasLevel,
    state: rocasState,
    paused: rocasPaused,
    pause: rocasPause,
    resume: rocasResume,
    forceGameOver: rocasForceGameOver,
    restart: rocasRestart,
    dispose: rocasDispose,
  } = useRocasGame();

  const [fakeScore, setFakeScore] = useState(0);
  const [fakeLives, setFakeLives] = useState(3);
  const [fakePaused, setFakePaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const name = nameOverride ?? (user ? user.name : "INVITADO");

  const score = isRocas ? rocasScore : fakeScore;
  const lives = isRocas ? rocasLives : fakeLives;
  const paused = isRocas ? rocasPaused : fakePaused;
  const level = isRocas ? rocasLevel : Math.floor(fakeScore / 2500) + 1;
  const gameOver = isRocas ? rocasState === "gameover" : over;

  useEffect(() => {
    if (!game || over || fakePaused || isRocas) return;
    const t = setInterval(
      () => setFakeScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [game, over, fakePaused, isRocas]);

  if (!game) notFound();

  const togglePause = () => {
    if (isRocas) {
      if (rocasPaused) rocasResume();
      else rocasPause();
    } else {
      setFakePaused((p) => !p);
    }
  };

  const endGame = () => {
    if (isRocas) rocasForceGameOver();
    else setOver(true);
  };

  const exit = () => {
    if (isRocas && rocasState === "playing" && !rocasPaused) {
      if (!window.confirm("¿Salir ahora? Perderás la partida en curso."))
        return;
      rocasDispose();
    }
    router.push(`/juegos/${game.id}`);
  };

  const restart = () => {
    if (isRocas) rocasRestart();
    else {
      setFakeScore(0);
      setFakeLives(3);
      setFakePaused(false);
    }
    setOver(false);
    setSaved(false);
    setNameOverride(null);
  };

  const saveScore = () => {
    try {
      const all: SavedScore[] = JSON.parse(
        localStorage.getItem("av_scores") || "[]",
      );
      all.push({ game: game.id, score, name, at: Date.now() });
      localStorage.setItem("av_scores", JSON.stringify(all));
    } catch {
      // ignore
    }
    setSaved(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button className="btn ghost" onClick={exit}>
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isRocas ? (
            <canvas
              ref={rocasCanvasRef}
              width={800}
              height={600}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {gameOver && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setNameOverride(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={saveScore}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button className="btn magenta" onClick={() => router.push("/")}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
