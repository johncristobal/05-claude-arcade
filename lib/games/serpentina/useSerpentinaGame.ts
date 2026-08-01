"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EngineSnapshot, EngineState, SerpentinaEngine } from "./engine";
import { DEFAULT_SKIN, SkinId } from "../skins";

export interface UseGameEngineResult {
  canvasRef: (node: HTMLCanvasElement | null) => void;
  score: number;
  lives: number; // 1 hasta gameover, luego 0
  level: number;
  state: EngineState;
  paused: boolean;
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
  dispose: () => void;
}

const ARROW_TO_DIRECTION = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
} as const;

// `skin` es reactivo (no solo "valor inicial"): el motor expone setSkin() y
// este hook lo llama en un efecto cuando cambia, sin forzar un remount del
// <canvas> (la creación del SerpentinaEngine solo pasa por canvasRef) —
// mismo patrón que useRocasGame.ts.
export function useSerpentinaGame(
  skin: SkinId = DEFAULT_SKIN,
): UseGameEngineResult {
  const engineRef = useRef<SerpentinaEngine | null>(null);
  const skinRef = useRef<SkinId>(skin);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const stateRef = useRef<EngineState>("playing");
  const lastSnapshotRef = useRef<EngineSnapshot>({
    score: 0,
    lives: 1,
    level: 1,
    state: "playing",
  });
  const teardownInputRef = useRef<() => void>(() => {});

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(1);
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<EngineState>("playing");
  const [paused, setPaused] = useState(false);

  const teardown = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    teardownInputRef.current();
    teardownInputRef.current = () => {};
    engineRef.current?.destroy();
    engineRef.current = null;
    lastTimeRef.current = null;
  }, []);

  // React llama esta función una vez al montar el <canvas> (node) y una
  // vez al desmontar (node === null) — misma vida útil que tenía el
  // useEffect original, sin depender de un RefObject expuesto.
  const canvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      teardown();
      if (!node) return;

      const engine = new SerpentinaEngine(node, skinRef.current);
      engineRef.current = engine;
      lastSnapshotRef.current = engine.getSnapshot();
      stateRef.current = lastSnapshotRef.current.state;
      pausedRef.current = false;

      // Mientras el modal de fin ("gameover") está abierto o el juego está
      // en pausa, ignorar las flechas para no interferir con el input de
      // iniciales del modal ni mover la serpiente en pausa (ver Riesgos).
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!(e.code in ARROW_TO_DIRECTION)) return;
        e.preventDefault();
        if (stateRef.current === "gameover" || pausedRef.current) return;
        const dir =
          ARROW_TO_DIRECTION[e.code as keyof typeof ARROW_TO_DIRECTION];
        engine.setDirection(dir);
      };
      window.addEventListener("keydown", handleKeyDown);
      teardownInputRef.current = () => {
        window.removeEventListener("keydown", handleKeyDown);
      };

      function tick(ts: number) {
        const activeEngine = engineRef.current;
        if (!activeEngine) return;

        if (!pausedRef.current) {
          const dt =
            lastTimeRef.current === null
              ? 0
              : Math.min((ts - lastTimeRef.current) / 1000, 0.05);
          lastTimeRef.current = ts;
          activeEngine.update(dt);
        } else {
          lastTimeRef.current = ts;
        }

        activeEngine.draw();

        const snap = activeEngine.getSnapshot();
        const prev = lastSnapshotRef.current;
        if (snap.score !== prev.score) setScore(snap.score);
        if (snap.lives !== prev.lives) setLives(snap.lives);
        if (snap.level !== prev.level) setLevel(snap.level);
        if (snap.state !== prev.state) setState(snap.state);
        lastSnapshotRef.current = snap;
        stateRef.current = snap.state;

        rafRef.current = requestAnimationFrame(tick);
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [teardown],
  );

  // Cambia la paleta activa en caliente cuando el usuario elige otro skin —
  // no recrea el canvas (evita perder la partida en curso). skinRef solo se
  // lee al montar el motor (dentro de canvasRef), nunca durante el render.
  useEffect(() => {
    skinRef.current = skin;
    engineRef.current?.setSkin(skin);
  }, [skin]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    lastTimeRef.current = null; // evita salto grande de dt tras reanudar
    setPaused(false);
  }, []);

  const forceGameOver = useCallback(() => {
    engineRef.current?.forceGameOver();
  }, []);

  const restart = useCallback(() => {
    pausedRef.current = false;
    lastTimeRef.current = null;
    setPaused(false);
    engineRef.current?.restart();
  }, []);

  const dispose = useCallback(() => {
    teardown();
  }, [teardown]);

  return {
    canvasRef,
    score,
    lives,
    level,
    state,
    paused,
    pause,
    resume,
    forceGameOver,
    restart,
    dispose,
  };
}
