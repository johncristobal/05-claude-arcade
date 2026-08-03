"use client";

import { useSyncExternalStore } from "react";

const TOUCH_QUERY = "(pointer: coarse)";

function subscribeTouch(callback: () => void) {
  const mql = window.matchMedia(TOUCH_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getTouchSnapshot() {
  return window.matchMedia(TOUCH_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsTouchDevice(): boolean {
  return useSyncExternalStore(subscribeTouch, getTouchSnapshot, getServerSnapshot);
}

export type DpadDirection = "up" | "down" | "left" | "right";

export interface TouchControlsConfig {
  dpad: DpadDirection[];
  actions: { label: string; code: string }[];
  repeat?: boolean;
}

const DIRECTION_TO_CODE: Record<DpadDirection, string> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
};

export function dispatchKey(code: string, type: "keydown" | "keyup"): void {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
}

export function dpadDirectionToCode(direction: DpadDirection): string {
  return DIRECTION_TO_CODE[direction];
}

export const ROCAS_TOUCH_CONFIG: TouchControlsConfig = {
  dpad: ["left", "right", "up"],
  actions: [{ label: "DISPARAR", code: "Space" }],
};

export const CAIDA_TOUCH_CONFIG: TouchControlsConfig = {
  dpad: ["left", "right", "down", "up"],
  actions: [{ label: "CAER", code: "Space" }],
  repeat: true,
};

export const SERPENTINA_TOUCH_CONFIG: TouchControlsConfig = {
  dpad: ["up", "down", "left", "right"],
  actions: [],
};
