"use client";

import { useEffect, useRef } from "react";
import {
  dispatchKey,
  dpadDirectionToCode,
  type TouchControlsConfig,
} from "@/lib/games/touchInput";

const REPEAT_INTERVAL_MS = 120;

const DPAD_LABELS: Record<string, string> = {
  up: "▲",
  down: "▼",
  left: "◀",
  right: "▶",
};

export function TouchControls({ config }: { config: TouchControlsConfig }) {
  const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  );

  useEffect(() => {
    const intervals = intervalsRef.current;
    return () => {
      intervals.forEach((id) => clearInterval(id));
      intervals.clear();
    };
  }, []);

  const handlePress = (code: string, repeatable: boolean) => {
    dispatchKey(code, "keydown");
    if (repeatable) {
      const id = setInterval(
        () => dispatchKey(code, "keydown"),
        REPEAT_INTERVAL_MS,
      );
      intervalsRef.current.set(code, id);
    }
  };

  const handleRelease = (code: string) => {
    const id = intervalsRef.current.get(code);
    if (id !== undefined) {
      clearInterval(id);
      intervalsRef.current.delete(code);
    }
    dispatchKey(code, "keyup");
  };

  return (
    <div className="touch-controls">
      <div className="dpad">
        {config.dpad.map((dir) => {
          const code = dpadDirectionToCode(dir);
          return (
            <button
              key={dir}
              type="button"
              className={`dpad-btn dpad-btn--${dir}`}
              onTouchStart={() => handlePress(code, !!config.repeat)}
              onTouchEnd={() => handleRelease(code)}
              onTouchCancel={() => handleRelease(code)}
              aria-label={dir}
            >
              {DPAD_LABELS[dir]}
            </button>
          );
        })}
      </div>
      {config.actions.length > 0 && (
        <div className="touch-actions">
          {config.actions.map((action) => (
            <button
              key={action.code}
              type="button"
              className="action-btn"
              onTouchStart={() => handlePress(action.code, false)}
              onTouchEnd={() => handleRelease(action.code)}
              onTouchCancel={() => handleRelease(action.code)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
