"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { GAMES } from "@/lib/data";
import { saveScore as saveScoreRemote } from "@/lib/supabase/scores";
import { useAuth } from "@/components/AuthProvider";
import { useRocasGame } from "@/lib/games/rocas/useRocasGame";
import {
  useCaidaGame,
  UseGameEngineResult,
} from "@/lib/games/caida/useCaidaGame";

// Usado cuando el juego activo no tiene motor real (placeholders fake) —
// mantiene la forma de UseGameEngineResult para poder destructurar sin
// condicionales.
const NULL_ENGINE: UseGameEngineResult = {
  canvasRef: () => {},
  score: 0,
  lives: 0,
  level: 1,
  state: "playing",
  paused: false,
  pause: () => {},
  resume: () => {},
  forceGameOver: () => {},
  restart: () => {},
  dispose: () => {},
};

export default function GamePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const game = GAMES.find((g) => g.id === id);

  const rocas = useRocasGame();
  const caida = useCaidaGame();

  const REAL_GAME_ENGINES: Record<string, UseGameEngineResult> = {
    rocas,
    caida,
  };
  const engine = game ? REAL_GAME_ENGINES[game.id] : undefined;
  const isReal = !!engine;

  // Se destructura de inmediato: leer `engine.campo` repetidas veces en el
  // render hace que el linter de React Compiler trate todo el objeto como
  // si contuviera una ref (por `canvasRef`) y bloquee la lectura de los
  // demás campos durante el render. Destructurar una vez evita eso.
  const {
    canvasRef: engineCanvasRef,
    score: engineScore,
    lives: engineLives,
    level: engineLevel,
    state: engineState,
    paused: enginePaused,
    pause: enginePause,
    resume: engineResume,
    forceGameOver: engineForceGameOver,
    restart: engineRestart,
    dispose: engineDispose,
  } = engine ?? NULL_ENGINE;

  const [fakeScore, setFakeScore] = useState(0);
  const [fakeLives, setFakeLives] = useState(3);
  const [fakePaused, setFakePaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const name = nameOverride ?? (user ? user.name : "INVITADO");

  const score = isReal ? engineScore : fakeScore;
  const lives = isReal ? engineLives : fakeLives;
  const paused = isReal ? enginePaused : fakePaused;
  const level = isReal ? engineLevel : Math.floor(fakeScore / 2500) + 1;
  const gameOver = isReal ? engineState === "gameover" : over;

  useEffect(() => {
    if (!game || over || fakePaused || isReal) return;
    const t = setInterval(
      () => setFakeScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [game, over, fakePaused, isReal]);

  if (!game) notFound();

  const togglePause = () => {
    if (isReal) {
      if (enginePaused) engineResume();
      else enginePause();
    } else {
      setFakePaused((p) => !p);
    }
  };

  const endGame = () => {
    if (isReal) engineForceGameOver();
    else setOver(true);
  };

  const exit = () => {
    if (isReal && engineState === "playing" && !enginePaused) {
      if (!window.confirm("¿Salir ahora? Perderás la partida en curso."))
        return;
      engineDispose();
    }
    router.push(`/juegos/${game.id}`);
  };

  const restart = () => {
    if (isReal) engineRestart();
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
    saveScoreRemote({ gameId: game.id, name, score }).then(() =>
      setSaved(true),
    );
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
          {isReal ? (
            <canvas
              ref={engineCanvasRef}
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
