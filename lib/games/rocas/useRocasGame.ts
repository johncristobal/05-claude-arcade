"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EngineSnapshot, EngineState, RocasEngine } from "./engine";
import { DEFAULT_SKIN, SkinId } from "../skins";

export interface UseRocasGameResult {
  // Callback ref (no RefObject crudo): evita que React Compiler marque
  // el resto de los valores de este objeto como "lectura de ref" durante
  // el render (ver nota en el hook). Se usa igual: ref={rocas.canvasRef}.
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

const GAME_KEY_CODES = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"];

// `skin` es reactivo (no solo "valor inicial"): el motor expone setSkin() y
// este hook lo llama en un efecto cuando cambia, sin forzar un remount del
// <canvas> (la creación del RocasEngine solo pasa por canvasRef).
export function useRocasGame(skin: SkinId = DEFAULT_SKIN): UseRocasGameResult {
  const engineRef = useRef<RocasEngine | null>(null);
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
  // vez al desmontar (node === null) — misma vida útil que tenía el
  // useEffect original, sin depender de un RefObject expuesto.
  const canvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      teardown();
      if (!node) return;

      const engine = new RocasEngine(node, skinRef.current);
      engineRef.current = engine;
      lastSnapshotRef.current = engine.getSnapshot();
      stateRef.current = lastSnapshotRef.current.state;
      pausedRef.current = false;

      // Mientras el modal de fin ("gameover") está abierto, ignorar el
      // teclado del juego para no capturar las teclas destinadas al
      // input de iniciales del modal (ver Riesgos del spec).
      const handleKeyDown = (e: KeyboardEvent) => {
        if (stateRef.current === "gameover") return;
        if (GAME_KEY_CODES.includes(e.code)) e.preventDefault();
        engine.keyDown(e.code);
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        if (stateRef.current === "gameover") return;
        engine.keyUp(e.code);
      };
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      teardownInputRef.current = () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
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
