"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RanariaEngine, EngineSnapshot, EngineState } from "./engine";
import { DEFAULT_SKIN, SkinId } from "../skins";

export interface UseGameEngineResult {
  canvasRef: (node: HTMLCanvasElement | null) => void;
  score: number;
  lives: number;
  level: number;
  state: EngineState;
  paused: boolean;
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
  dispose: () => void;
}

const GAME_KEY_CODES = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

// `skin` es reactivo (no solo "valor inicial"): el motor expone setSkin() y
// este hook lo llama en un efecto cuando cambia, sin forzar un remount del
// <canvas> (mismo patrón que useRocasGame.ts/useCaidaGame.ts).
export function useRanariaGame(skin: SkinId = DEFAULT_SKIN): UseGameEngineResult {
  const engineRef = useRef<RanariaEngine | null>(null);
  const skinRef = useRef<SkinId>(skin);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const stateRef = useRef<EngineState>("playing");
  const lastSnapshotRef = useRef<EngineSnapshot>({
    score: 0,
    lives: 3,
    level: 1,
    state: "playing",
  });
  const teardownInputRef = useRef<() => void>(() => {});
  const tickRef = useRef<((ts: number) => void) | null>(null);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<EngineState>("playing");
  const [paused, setPaused] = useState(false);

  const teardown = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    tickRef.current = null;
    teardownInputRef.current();
    teardownInputRef.current = () => {};
    engineRef.current?.destroy();
    engineRef.current = null;
    lastTimeRef.current = null;
  }, []);

  const canvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      teardown();
      if (!node) return;

      const engine = new RanariaEngine(node, skinRef.current);
      engineRef.current = engine;
      lastSnapshotRef.current = engine.getSnapshot();
      stateRef.current = lastSnapshotRef.current.state;
      pausedRef.current = false;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (pausedRef.current || stateRef.current === "gameover") return;
        if (GAME_KEY_CODES.includes(e.code)) e.preventDefault();
        engine.handleKeyDown(e.code);
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
              : Math.min(ts - lastTimeRef.current, 50);
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

        rafRef.current =
          snap.state === "gameover" ? null : requestAnimationFrame(tick);
      }

      tickRef.current = tick;
      rafRef.current = requestAnimationFrame(tick);
    },
    [teardown],
  );

  // Cambia la paleta activa en caliente cuando el usuario elige otro skin —
  // no recrea el canvas ni pierde la ronda en curso.
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
    lastTimeRef.current = null;
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
    if (rafRef.current === null && tickRef.current) {
      rafRef.current = requestAnimationFrame(tickRef.current);
    }
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
