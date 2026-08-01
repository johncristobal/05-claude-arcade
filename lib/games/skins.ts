"use client";

// Sistema de skins compartido entre motores reales (`rocas`, `caida`,
// `bloque-buster`, `serpentina`) y placeholders. Ver specs/NN-sistema-skins.md
// para la arquitectura completa.
//
// Cada motor real mantiene su propia tabla de paleta por skin (formas muy
// distintas entre juegos: 7 colores de pieza en `caida` vs. paleta casi
// monocromática en `rocas`) — este módulo solo define el id compartido, el
// storage y el hook de preferencia. No fuerza una forma de paleta única.

import { useCallback, useState, useSyncExternalStore } from "react";

export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];

export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};

// `clasico` reproduce el look actual de cada juego (default) — nadie que no
// elija otra cosa debe notar un cambio visual.
export const DEFAULT_SKIN: SkinId = "clasico";

const STORAGE_KEY = "av_skin";

function isSkinId(value: string | null): value is SkinId {
  return value === "clasico" || value === "neon" || value === "retro";
}

// Mismo patrón que `av_user` en components/AuthProvider.tsx: lectura
// SSR-safe vía useSyncExternalStore (snapshot de servidor = default, sin
// tocar localStorage) + un override local para reactividad inmediata en la
// misma pestaña (el evento "storage" nativo no dispara en el documento que
// hizo el set).
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

let cachedRaw: string | null = null;
let cachedSkin: SkinId = DEFAULT_SKIN;

function getSnapshot(): SkinId {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSkin = isSkinId(raw) ? raw : DEFAULT_SKIN;
  }
  return cachedSkin;
}

function getServerSnapshot(): SkinId {
  return DEFAULT_SKIN;
}

export function useSkinPreference(): [SkinId, (skin: SkinId) => void] {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [override, setOverride] = useState<SkinId | null>(null);
  const skin = override ?? stored;

  const setSkin = useCallback((next: SkinId) => {
    localStorage.setItem(STORAGE_KEY, next);
    setOverride(next);
  }, []);

  return [skin, setSkin];
}
