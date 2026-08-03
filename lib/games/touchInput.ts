"use client";

import { useEffect, useState } from "react";

export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    setIsTouch(mql.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isTouch;
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
