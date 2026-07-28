"use client";

import { useCallback, useRef, useState } from "react";
import { BloqueBusterEngine, EngineSnapshot, EngineState } from "./engine";

export interface UseGameEngineResult {
  // Callback ref (no RefObject crudo): mismo motivo que useRocasGame/
  // useCaidaGame — evita que React Compiler marque el resto de los
  // valores de este objeto como "lectura de ref" durante el render.
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

const GAME_KEY_CODES = ["ArrowLeft", "ArrowRight"];

export function useBloqueBusterGame(): UseGameEngineResult {
  const engineRef = useRef<BloqueBusterEngine | null>(null);
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

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
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
  // vez al desmontar (node === null) — misma vida útil que un useEffect
  // con cleanup, sin depender de un RefObject expuesto.
  const canvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      teardown();
      if (!node) return;

      const engine = new BloqueBusterEngine(node);
      engineRef.current = engine;
      lastSnapshotRef.current = engine.getSnapshot();
      stateRef.current = lastSnapshotRef.current.state;
      pausedRef.current = false;

      // Ignorar input mientras está en pausa o con el modal de fin
      // ("gameover") abierto — evita mover la paleta de fondo y
      // capturar teclas destinadas al input de iniciales del modal.
      const handleKeyDown = (e: KeyboardEvent) => {
        if (pausedRef.current || stateRef.current === "gameover") return;
        if (GAME_KEY_CODES.includes(e.code)) e.preventDefault();
        engine.handleKeyDown(e.code);
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        if (pausedRef.current || stateRef.current === "gameover") return;
        engine.handleKeyUp(e.code);
      };
      const handleMouseMove = (e: MouseEvent) => {
        if (pausedRef.current || stateRef.current === "gameover") return;
        engine.handleMouseMove(e.clientX, node.getBoundingClientRect());
      };
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      node.addEventListener("mousemove", handleMouseMove);
      teardownInputRef.current = () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        node.removeEventListener("mousemove", handleMouseMove);
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
