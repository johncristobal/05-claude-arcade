# 09 — Serpentina: juego real

## Header

- **Estado:** Approved
- **Dependencias:** `05-rocas-juego-real.md` (Implementado) y `06-leaderboard-real.md` (Implementado) — precedente de patrón (motor + hook + HUD/modal reusado + `REAL_GAME_ENGINES`). Sin dependencia funcional de otros specs.
- **Fecha:** 2026-07-28
- **Objetivo:** Diseñar el motor real de Snake (desde cero, sin código fuente de referencia — solo assets en `references/source-assets/snake-assets/`) en TypeScript, integrarlo al HUD/modal existentes en `/juegos/serpentina/jugar` (id `serpentina`, ya existente en `lib/data.ts`).

## Scope

**Incluido:**

- Motor real de Snake en `lib/games/serpentina/engine.ts`: grilla fija (celdas), serpiente como lista de segmentos, spawn de fruta en celda libre aleatoria, crecimiento al comer, colisión con pared (letal) y con la propia cola (letal), tick de movimiento con velocidad que aumenta por nivel.
- Sprites de fruta: cargar `fruits.png` + `SPRITE_ATLAS` (`references/source-assets/snake-assets/sprites.js`, copiados a `public/` o `lib/games/serpentina/assets/`), dibujar una fruta aleatoria de las 22 en cada spawn.
- `lib/games/serpentina/useSerpentinaGame.ts` — hook con la forma estándar `UseGameEngineResult` (`canvasRef` callback, `score`, `lives` fijo en 1, `level` derivado de frutas comidas, `state`, `paused`, `pause()`, `resume()`, `forceGameOver()`, `restart()`, `dispose()`).
- `app/juegos/[id]/jugar/page.tsx`: agregar `const serpentina = useSerpentinaGame();` y su entrada en `REAL_GAME_ENGINES` (registro genérico ya existe — no hace falta refactor, solo la entrada nueva).
- HUD existente (Puntuación/Vidas/Nivel, botones PAUSA/FIN/SALIR) conectado al hook para `serpentina`, mismo patrón que ROCAS.
- Guardado de score real vía `saveScore` (leaderboard real, spec 06) — ya funciona para cualquier id real, sin cambios adicionales.

**Explícitamente fuera de alcance:**

- Migración de base de datos / entrada en `GAMES` — Caso A, `serpentina` ya existe en `lib/data.ts` y en la tabla `games` (spec 06).
- Audio (no hay assets de sonido provistos).
- Wrap-around en bordes (se descartó — pared letal confirmada).
- Controles táctiles / mobile (solo teclado, flechas).
- Convertir otros juegos fake (`bloque-buster`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) a motor real.
- Tests automatizados.

## Modelo de datos

Sin tablas ni tipos persistidos nuevos — reutiliza `LeaderboardRow`/`saveScore` de spec 06 tal cual. Lo nuevo es interno al motor/hook, en memoria:

**`lib/games/serpentina/engine.ts`**

```ts
export type EngineState = "playing" | "dead" | "gameover";

export interface EngineSnapshot {
  score: number;
  lives: number; // siempre 1
  level: number; // deriva de frutas comidas
  state: EngineState;
}

export interface Point {
  x: number;
  y: number;
}

export class SerpentinaEngine {
  constructor(canvas: HTMLCanvasElement);
  update(dt: number): void; // avanza tick de movimiento según velocidad actual
  draw(): void; // grilla, serpiente, fruta (sprite del atlas)
  setDirection(dir: "up" | "down" | "left" | "right"): void; // ignora reversa 180°
  getSnapshot(): EngineSnapshot;
  destroy(): void;
}

// Internos, no exportados fuera del módulo:
// GRID_COLS, GRID_ROWS, CELL_SIZE, TICK_MS_BASE, TICK_MS_MIN, FRUITS_PER_LEVEL
// spawnFruit, checkCollision, growSnake
// SPRITE_ATLAS (cargado desde sprites.js/fruits.png copiados al proyecto)
```

**`lib/games/serpentina/useSerpentinaGame.ts`**

```ts
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

export function useSerpentinaGame(): UseGameEngineResult;
```

El hook posee el `SerpentinaEngine`, corre el loop `requestAnimationFrame` internamente, sincroniza `score`/`level`/`state` a React state solo cuando cambian, engancha `keydown` en `window` (flechas → `setDirection`, ignorando reversa 180° y las teclas mientras `over === true` o `paused === true`), y expone `lives` derivado (`1` mientras `state !== 'gameover'`, `0` al llegar a `gameover`) para encajar con el HUD existente sin lógica especial.

`page.tsx` no importa clases del motor directamente — solo usa `useSerpentinaGame()`.

## Plan de implementación

1. **Assets**: copiar `references/source-assets/snake-assets/fruits.png` y `sprites.js` a `public/games/serpentina/fruits.png` y adaptar `SPRITE_ATLAS` a un módulo TS (`lib/games/serpentina/spriteAtlas.ts`, export en vez de `window.SPRITE_ATLAS`). Nada lo usa aún.

2. **Motor**: crear `lib/games/serpentina/engine.ts` con la clase `SerpentinaEngine` (grilla fija, movimiento por tick, spawn de fruta con sprite aleatorio del atlas, crecimiento, colisión pared/cola letal, velocidad que sube cada `FRUITS_PER_LEVEL` frutas), constructor recibe `canvas`, expone `update(dt)`, `draw()`, `setDirection(dir)`, `getSnapshot()`, `destroy()`. Nada lo importa aún — proyecto sigue compilando igual.

3. **Hook de integración**: crear `lib/games/serpentina/useSerpentinaGame.ts` — instancia `SerpentinaEngine` vía `canvasRef` callback, corre el loop `requestAnimationFrame`, engancha `keydown` en `window` (flechas, sin reversa 180°, ignorado si `over`/`paused`), sincroniza `score`/`level`/`state`/`paused` a React state (solo en cambio), deriva `lives` (1 o 0), implementa `pause()`/`resume()`/`forceGameOver()`/`restart()`/`dispose()`. Nada lo usa aún.

4. **Wiring en `page.tsx`**: agregar `const serpentina = useSerpentinaGame();` y la entrada `serpentina` en el objeto `REAL_GAME_ENGINES` ya existente (sin refactor — registro genérico ya está armado). El branch único `isReal ? <canvas ref={engine!.canvasRef} ...> : <div className="game-arena">` ya cubre el render, sin cambios ahí.

5. **Cierre**: jugar una partida completa de SERPENTINA en el navegador — mover en las 4 direcciones, comer varias frutas (confirmar sprite aleatorio de las 22, crecimiento), subir de nivel (aceleración de velocidad reflejada en HUD), chocar con pared, chocar con la propia cola, confirmar que se abre el modal de fin con el score real y que "GUARDAR PUNTUACIÓN" inserta en `scores` (Supabase); probar PAUSA/REANUDAR; probar FIN (rendirse); probar SALIR con/sin partida en curso (confirm nativo); repasar visualmente los otros 7 juegos para confirmar que siguen intactos; correr `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores de tipos ni de lint.
- [ ] `/juegos/serpentina/jugar` renderiza un `<canvas>` real (grilla, escalado dentro del marco `.crt-screen` existente) en vez de los divs decorativos `.game-arena`.
- [ ] Serpiente se controla con las 4 flechas, sin poder revertir 180° sobre sí misma en un solo tick.
- [ ] Comer fruta hace crecer la serpiente un segmento, suma puntos, y dibuja un sprite aleatorio de los 22 del atlas (`fruits.png`) en la celda de la fruta.
- [ ] Nivel sube cada `FRUITS_PER_LEVEL` frutas comidas, y la velocidad del tick aumenta visiblemente en consecuencia; HUD refleja el nivel real.
- [ ] Chocar con el borde del tablero o con la propia cola termina la partida de inmediato (`state === 'gameover'`, `lives` pasa a 0).
- [ ] Al llegar `gameover`, se abre automáticamente el modal "FIN DEL JUEGO" existente con el score real.
- [ ] Botón "GUARDAR PUNTUACIÓN" en el modal inserta una fila correcta en `scores` vía Supabase (mismo flujo spec 06).
- [ ] Botón PAUSA detiene el avance (serpiente/fruta congeladas) y muestra el overlay "EN PAUSA" existente; REANUDAR continúa donde quedó.
- [ ] Botón FIN, con partida en curso, termina de inmediato con el score acumulado.
- [ ] Botón SALIR con partida en curso muestra `confirm()` antes de navegar; cancelar mantiene la partida corriendo. Sin partida en curso navega directo sin confirm.
- [ ] Desmontar la página detiene el `requestAnimationFrame` y remueve los listeners de teclado — sin loops en background tras salir/reentrar varias veces.
- [ ] Los otros 7 juegos en `/juegos/[id]/jugar` siguen funcionando exactamente igual, sin regresión.

## Decisiones tomadas y descartadas

- **Diseño desde cero, sin puerto 1:1 de código.** Motivo: no existe `game.js` de referencia en `references/started-games/` para Snake — solo assets gráficos (`fruits.png`, `sprites.js`). Se sigue mecánica clásica de Snake (Nokia/Google Snake, mismo origen que el comentario en `sprites.js`) como especificación funcional.
- **Reemplaza `serpentina` existente**, no id nuevo. Motivo: ya existe en `lib/data.ts` y en la tabla `games` (spec 06) con tema/cover/color coherentes (`cover-snake`, verde) — Caso A, cero migración.
- **Pared letal, sin wrap-around.** Motivo: decisión explícita del usuario — mismo criterio que el Snake clásico del que provienen los assets.
- **Sprites de fruta sí entran, audio no.** Motivo: decisión explícita — hay 22 sprites de fruta con atlas de coordenadas ya provistos y listos para usar; no hay ningún asset de audio.
- **`lives` fijo en 1**, sin sistema de vidas múltiples. Motivo: decisión explícita — el Snake original no tiene concepto de vidas; un choque siempre termina la partida.
- **`level` derivado de frutas comidas**, no fijo en 1. Motivo: decisión explícita — permite reflejar la curva de dificultad (aceleración) en el HUD existente, mismo espíritu que `nextLevel` en ROCAS.
- **Sin refactor de registro en `page.tsx`.** Motivo: Fase 1.9 detectó que `REAL_GAME_ENGINES` ya existe (hecho en un spec de juego real previo) — este spec solo agrega la entrada `serpentina`.
- **Lógica separada en `lib/games/serpentina/` (engine + hook + spriteAtlas)**, no inline en `page.tsx`. Motivo: mismo patrón que ROCAS — aísla el motor de la integración React.
- **HUD y modal de fin reutilizados tal cual.** Motivo: coherencia visual, cero UI nueva, mismo criterio que ROCAS.
- **Sin controles táctiles ni canvas responsive real.** Motivo: alcance acotado a teclado/desktop, mismo dominio que ROCAS.
- **Sin tests automatizados.** Motivo: no hay test runner configurado; verificación manual + `npm run lint`/`build`.

## Riesgos identificados

| Riesgo                                                                                                                                                                                  | Mitigación                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doble montaje en React StrictMode (dev): `useEffect` puede correr dos veces, duplicando listeners de teclado o instancias del motor.                                                    | Cleanup completo en el `return` del `useEffect` (cancela RAF, remueve todos los listeners); probar entrando/saliendo de `/juegos/serpentina/jugar` varias veces en dev.                 |
| Re-render excesivo por sincronizar estado cada frame (60/s).                                                                                                                            | Solo llamar `setState` cuando el valor sincronizado cambia respecto al anterior, no en cada frame ciego.                                                                                |
| Flechas (especialmente arriba/abajo) scrollean la página o interfieren con el input del modal de fin.                                                                                   | `preventDefault()` en el handler para las 4 flechas; ignorar el handler mientras `over === true` (modal abierto) o `paused === true`.                                                   |
| Sin código de referencia: balance de velocidad/dificultad (tick base, incremento por nivel, `FRUITS_PER_LEVEL`) es diseño nuevo, no un valor "correcto" verificable contra un original. | Aceptado — ajustar valores durante el playtest manual del paso de cierre hasta que se sienta jugable; no bloquea criterios de aceptación (que piden comportamiento, no cifras exactas). |
| Carga async de `fruits.png`: si el motor dibuja antes de que la imagen termine de cargar, la fruta puede no renderizar en los primeros frames.                                          | Precargar la imagen en el constructor del engine (`new Image()` + `onload`) y no dibujar sprite de fruta hasta que `img.complete` sea true (fallback: rect de color mientras carga).    |
