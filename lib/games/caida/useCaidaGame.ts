"use client";

import { useCallback, useRef, useState } from "react";
import { CaidaEngine, EngineSnapshot, EngineState } from "./engine";

export interface UseGameEngineResult {
  // Callback ref (no RefObject crudo): mismo motivo que useRocasGame —
  // evita que React Compiler marque el resto de los valores de este
  // objeto como "lectura de ref" durante el render.
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

const GAME_KEY_CODES = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "KeyX",
];

export function useCaidaGame(): UseGameEngineResult {
  const engineRef = useRef<CaidaEngine | null>(null);
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
  const tickRef = useRef<((ts: number) => void) | null>(null);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(1);
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

  // React llama esta función una vez al montar el <canvas> (node) y una
  // vez al desmontar (node === null) — misma vida útil que un useEffect
  // con cleanup, sin depender de un RefObject expuesto.
  const canvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      teardown();
      if (!node) return;

      const engine = new CaidaEngine(node);
      engineRef.current = engine;
      lastSnapshotRef.current = engine.getSnapshot();
      stateRef.current = lastSnapshotRef.current.state;
      pausedRef.current = false;

      // Ignorar teclado mientras está en pausa o con el modal de fin
      // ("gameover") abierto — evita mover piezas de fondo y capturar
      // teclas destinadas al input de iniciales del modal.
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
        if (snap.level !== prev.level) setLevel(snap.level);
        if (snap.state !== prev.state) {
          setState(snap.state);
          setLives(snap.state === "gameover" ? 0 : 1);
        }
        lastSnapshotRef.current = snap;
        stateRef.current = snap.state;

        // Gameover detiene el loop (no hay Space-to-restart dentro del
        // canvas como en ROCAS) — restart() lo vuelve a arrancar.
        rafRef.current =
          snap.state === "gameover" ? null : requestAnimationFrame(tick);
      }

      tickRef.current = tick;
      rafRef.current = requestAnimationFrame(tick);
    },
    [teardown],
  );

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
    // El loop se detuvo al llegar a "gameover" — volver a arrancarlo.
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
