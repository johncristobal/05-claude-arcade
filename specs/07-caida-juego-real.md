# 07 — Caída: juego real

## Header

- **Estado:** Approved
- **Dependencias:** `05-rocas-juego-real.md` (Implementado) y `06-leaderboard-real.md` (Implementado) — precedente de patrón (motor + hook + HUD/modal reutilizado, leaderboard real). Sin dependencia funcional de `01`/`02`/`03`/`04`.
- **Fecha:** 2026-07-27
- **Objetivo:** Portar el motor real de Tetris (`references/started-games/03-tetris`) a TypeScript, integrarlo al HUD/modal existentes en `/juegos/caida/jugar` (reemplazando el placeholder simulado del id `caida`, ya existente en `lib/data.ts`), y refactorizar el wiring de `page.tsx` de `isRocas` hardcodeado a un registro genérico `REAL_GAME_ENGINES` que incluya `rocas` y `caida`.

## Scope

**Incluido:**

- Puerto 1:1 de `game.js` a TypeScript en `lib/games/caida/engine.ts`: grid 10×20, 8 tipos de pieza (I/O/T/S/Z/J/L + "N" tuerca), `COLORS`, `LINE_SCORES`, `randomPiece`, `collide`, `rotateCW`/`tryRotate` (wall kicks `[0,-1,1,-2,2]`), `merge`, `clearLines`, `ghostY`, `hardDrop`/`softDrop`/`lockPiece`, `spawn`, scoring (`LINE_SCORES × level`, hard drop +2/celda, soft drop +1/fila), nivel (`floor(lines/10)+1`) y velocidad (`dropInterval = max(100, 1000-(level-1)×90)`). Mismo balance exacto del original.
- Preview de "siguiente pieza" plegado al mismo `<canvas>` único (franja lateral dibujada por el propio motor), sin segundo elemento `<canvas>` — decisión confirmada en Bloque B.
- `lib/games/caida/useCaidaGame.ts` — hook que expone `UseGameEngineResult` (contrato compartido de `game-spec-checklist.md`): `score`, `lives` (fijo en 1 mientras `playing`, 0 en `gameover`), `level` (real del motor), `state`, `paused`, `pause()`/`resume()`, `forceGameOver()`, `restart()`, `dispose()`, `canvasRef` (callback ref).
- Input: flechas ←→ mover, ↑/`X` rotar, ↓ soft drop, Espacio hard drop — capturado vía `keydown`/`keyup` en `window`, ignorado mientras `paused` o modal de fin abierto. Tecla `P` del original **no se porta** — pausa solo vía botón HUD (decisión Bloque C).
- **Refactor de registro genérico en `app/juegos/[id]/jugar/page.tsx`**: reemplaza `isRocas` hardcodeado por `REAL_GAME_ENGINES: Record<string, UseGameEngineResult>` con entradas `rocas` y `caida` (forma exacta de `game-spec-checklist.md`); un solo branch de render `isReal ? <canvas ref={engine!.canvasRef} .../> : <div className="game-arena">...</div>`.
- HUD existente (Puntuación/Vidas/Nivel, botones PAUSA/FIN/SALIR) conectado al estado real del hook para `caida`, mismo patrón que `rocas`.

**Explícitamente fuera de alcance:**

- Audio (el original no tiene).
- Toggle de tema light/dark propio del original standalone (`theme-toggle`, `localStorage["tetris-theme"]`) — el sitio ya tiene su propio tema, no se porta.
- Controles táctiles/mobile.
- Canvas responsive real (reflow de proporciones) — solo escala dentro del marco CRT ya fijo.
- Confirmación de salida al cerrar pestaña o navegar con "atrás" del navegador (`beforeunload`).
- Migración/insert en tabla `games` — Caso A confirmado, `caida` ya sembrado (spec 06).
- Cambios a `/juegos/caida` (ficha de detalle) más allá de lo ya cubierto por spec 06 (leaderboard real genérico).
- Convertir otro placeholder fake (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) a motor real.
- Tests automatizados.
- Rebalanceo de dificultad o features no presentes en `game.js` original.

## Modelo de datos

Sin tablas ni tipos persistidos nuevos — reutiliza `SavedScore`/leaderboard real de spec 06 tal cual. Caso A: `caida` ya existe en `GAMES` (`lib/data.ts`) y en tabla `games` (spec 06) — sin migración.

**`lib/games/caida/engine.ts`**

```ts
export type EngineState = "playing" | "dead" | "gameover";

export interface EngineSnapshot {
  score: number;
  lives: number; // 1 mientras playing, 0 en gameover
  level: number; // floor(lines/10) + 1
  state: EngineState;
}

export class CaidaEngine {
  constructor(canvas: HTMLCanvasElement);
  update(dt: number): void;
  draw(): void; // dibuja tablero + preview de "next" en franja lateral del mismo canvas
  handleKeyDown(code: string): void; // ArrowLeft/Right/Up, KeyX, Space, ArrowDown
  getSnapshot(): EngineSnapshot;
  destroy(): void;
}

// Internos, no exportados fuera del módulo:
// COLS (10), ROWS (20), BLOCK (30), COLORS, PIECES (8, incl. "N"/tuerca), LINE_SCORES
// randomPiece, collide, rotateCW, tryRotate, merge, clearLines, ghostY,
// hardDrop, softDrop, lockPiece, spawn
```

**`lib/games/caida/useCaidaGame.ts`**

```ts
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

export function useCaidaGame(): UseGameEngineResult;
```

Hook posee el `CaidaEngine`, corre el loop `requestAnimationFrame` (dt capado a 50ms, mismo criterio que ROCAS), engancha `keydown` en `window` (delegando a `engine.handleKeyDown`), sincroniza `score`/`level`/`state` a React state solo cuando cambian, deriva `lives` (`1` si `state !== 'gameover'`, `0` si `'gameover'`).

`useRocasGame` ya expone exactamente `UseGameEngineResult` (incluye `restart()`) — no requiere cambios para calzar en el registro genérico.

**Refactor en `page.tsx`** (forma exacta de `game-spec-checklist.md`):

```ts
const rocas = useRocasGame();
const caida = useCaidaGame();

const REAL_GAME_ENGINES: Record<string, UseGameEngineResult> = { rocas, caida };
const engine = game ? REAL_GAME_ENGINES[game.id] : undefined;
const isReal = !!engine;
```

## Plan de implementación

1. **Motor portado**: crear `lib/games/caida/engine.ts` con `CaidaEngine` (constructor recibe `canvas`, expone `update(dt)`, `draw()`, `handleKeyDown(code)`, `getSnapshot()`, `destroy()`), portando 1:1 la lógica de `game.js`: grid 10×20, 8 piezas (incl. "N"/tuerca), `collide`/`rotateCW`/`tryRotate` con wall kicks, `merge`/`clearLines`, `ghostY`, `hardDrop`/`softDrop`/`lockPiece`, `spawn`, scoring y nivel/velocidad. `draw()` pinta tablero + preview de "next" en franja lateral del mismo canvas. Nada lo importa aún — proyecto sigue compilando igual.

2. **Hook de integración**: crear `lib/games/caida/useCaidaGame.ts` (mismo patrón que `useRocasGame.ts`: `canvasRef` callback ref, RAF loop con dt capado a 50ms, `keydown` en `window` delegando a `engine.handleKeyDown`, ignorado si `state === 'gameover'`, `pause()/resume()` sin destruir canvas, `forceGameOver()`, `restart()`, `dispose()`). `lives` derivado (`1` si `state !== 'gameover'`, si no `0`) — no viene del motor. Nada lo usa aún.

3. **Refactor de registro + wiring en `jugar/page.tsx`**: reemplazar `isRocas`/`rocasScore`/etc. hardcodeado por `const rocas = useRocasGame(); const caida = useCaidaGame();` y el objeto `REAL_GAME_ENGINES: Record<string, UseGameEngineResult>` (forma de `game-spec-checklist.md`); derivar `score`/`lives`/`level`/`paused`/`gameOver` desde `engine` cuando `isReal`, si no desde la simulación fake; un solo branch de render `isReal ? <canvas ref={engine!.canvasRef} .../> : <div className="game-arena">...</div>`; botones PAUSA/FIN/SALIR llaman `engine!.pause()/resume()/forceGameOver()/dispose()` igual que hoy hace para ROCAS. Los otros 6 juegos fake (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen con `setInterval` sin tocar.

4. **Cierre**: jugar una partida completa de CAÍDA en el navegador — mover/rotar/soft drop/hard drop, limpiar líneas simples y múltiples, subir de nivel cada 10 líneas y notar aumento de velocidad, provocar game over (torre hasta el tope) y confirmar que abre el modal "FIN DEL JUEGO" con el score real y que "GUARDAR PUNTUACIÓN" persiste vía leaderboard real (spec 06); probar PAUSA/REANUDAR, FIN, SALIR (con y sin confirm); repasar visualmente ROCAS y los otros 6 placeholders para confirmar cero regresión tras el refactor de registro; correr `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores de tipos ni de lint.
- [ ] `/juegos/caida/jugar` renderiza un `<canvas>` real (escalado dentro del marco `.crt-screen` existente) en vez de los divs decorativos `.game-arena`.
- [ ] Piezas se mueven con ←→, rotan con ↑/`X` (con wall kicks), bajan con ↓ (soft drop, +1 punto/fila), caen instantáneo con Espacio (hard drop, +2 puntos/celda) — mismo feel que el original.
- [ ] Las 8 piezas (I/O/T/S/Z/J/L + "N"/tuerca) aparecen con sus colores correctos; ghost piece se dibuja semitransparente en la posición de aterrizaje.
- [ ] Preview de "siguiente pieza" visible en franja lateral del mismo canvas.
- [ ] Limpiar líneas otorga puntos según `LINE_SCORES × level` (100/300/500/800 según cantidad simultánea); nivel sube cada 10 líneas (`floor(lines/10)+1`) y la velocidad de caída aumenta en consecuencia.
- [ ] HUD muestra Puntuación/Vidas/Nivel reales sincronizados con el motor — Vidas fija en 1 mientras `playing`, 0 en `gameover`.
- [ ] Al colisionar el spawn de una pieza nueva (`gameover`), el loop se detiene y se abre automáticamente el modal "FIN DEL JUEGO" existente con el score real.
- [ ] Botón "GUARDAR PUNTUACIÓN" en el modal inserta correctamente en `scores` (leaderboard real, spec 06) con `game_id: 'caida'`.
- [ ] Botón PAUSA detiene el avance (tablero congelado) y muestra el overlay "EN PAUSA" existente; REANUDAR continúa donde quedó. Tecla `P` del original no tiene efecto (pausa solo vía botón HUD).
- [ ] Botón FIN, con partida en curso, termina de inmediato con el score acumulado.
- [ ] Botón SALIR con partida en curso muestra `confirm()` antes de navegar; sin partida en curso navega directo.
- [ ] Desmontar la página detiene el `requestAnimationFrame` y remueve los listeners de teclado — sin loops en background.
- [ ] `REAL_GAME_ENGINES` reemplaza `isRocas` en `page.tsx`; `rocas` sigue funcionando exactamente igual que antes del refactor.
- [ ] Los otros 6 placeholders fake (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen funcionando igual, sin regresión.

## Decisiones tomadas y descartadas

- **Reemplaza `/juegos/caida/jugar` existente**, no ruta nueva. Motivo: id `caida` ya calza en título/cover/color con Tetris — cero duplicación de UI.
- **Puerto 1:1 de `game.js`**, sin recortar mecánica (ghost piece, wall kicks, tuerca "N"). Motivo: juego ya probado, mismo criterio que ROCAS (spec 05).
- **Sin audio ni toggle de tema propio.** Motivo: precedente ROCAS (sin audio); el sitio ya tiene su propio tema, el toggle light/dark del original queda fuera.
- **Preview de "next" plegado al canvas único**, no segundo `<canvas>`. Motivo: mantiene el patrón de un solo canvas por juego fijado en spec 05; evita introducir un segundo elemento DOM/ref por juego.
- **Vidas fija en 1 (playing) / 0 (gameover)**, no contador real. Motivo: el original no tiene vidas — game over es binario (spawn colisiona); mapeo más simple que respeta el HUD existente sin inventar mecánica nueva.
- **Nivel real del motor** (`floor(lines/10)+1`), no derivado de score. Motivo: el original ya lo calcula así y controla la velocidad — portarlo tal cual preserva el balance.
- **Pausa solo vía botón HUD**, tecla `P` del original descartada. Motivo: evita dos mecanismos de pausa redundantes/conflictivos; mismo patrón que ROCAS (pausa controlada por hook, no por el motor).
- **Refactor a `REAL_GAME_ENGINES` genérico en este spec**, no diferido. Motivo: decisión explícita del usuario — sienta el patrón antes de que un tercer juego real lo necesite, evita acumular ramas ad-hoc tipo `isRocas`/`isCaida`/....
- **Caso A: sin migración ni insert nuevo** — `caida` ya sembrado en tabla `games` desde spec 06. Motivo: confirmado explícitamente, evita insert redundante.
- **Sin tests automatizados.** Motivo: no hay test runner configurado; verificación manual + `npm run lint`/`build`.

## Riesgos identificados

| Riesgo                                                                                                                                                                          | Mitigación                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doble montaje en React StrictMode (dev): `useEffect`/`canvasRef` puede correr dos veces, duplicando listeners de teclado o instancias del motor si el cleanup no es exhaustivo. | Cleanup completo (cancela RAF, remueve todos los listeners) antes de crear instancia nueva — mismo patrón ya usado en `useRocasGame.ts`; probar entrando/saliendo de `/juegos/caida/jugar` varias veces en dev. |
| Re-render excesivo por sincronizar estado cada frame (60/s).                                                                                                                    | Solo llamar `setState` cuando el valor sincronizado cambia respecto al anterior (comparar snapshot), no en cada frame ciego.                                                                                    |
| Tecla espacio (hard drop) u otras usadas por el juego scrollean la página o interfieren con el input del modal de fin.                                                          | `preventDefault()` en el handler para las teclas del juego; ignorar el handler mientras `state === 'gameover'` (modal abierto) o `paused === true`.                                                             |
| **Refactor de registro toca código ya funcionando de ROCAS** — un error al migrar `isRocas` a `REAL_GAME_ENGINES` podría romper el juego ya implementado y probado.             | Playtest completo de ROCAS (no solo CAÍDA) como parte del cierre de este spec, comparando comportamiento antes/después del refactor.                                                                            |
| Plegar el preview de "next" al canvas único puede recortarse visualmente si el layout `.crt-screen` no deja suficiente franja lateral a la resolución interna elegida.          | Dimensionar la resolución interna del canvas (ancho) con margen explícito para la franja de preview antes de portar `draw()`, verificar visualmente en el playtest de cierre.                                   |
