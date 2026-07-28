# 08 — Bloque Buster: juego real

## Header

- **Estado:** Approved
- **Dependencias:** `05-rocas-juego-real.md` (Implementado) y `06-leaderboard-real.md` (Implementado) — precedente de patrón (motor + hook + HUD/modal reutilizado, leaderboard real). `07-caida-juego-real.md` (Done) — introdujo el registro genérico `REAL_GAME_ENGINES` que este spec extiende. Sin dependencia funcional de `01`/`02`/`03`/`04`.
- **Fecha:** 2026-07-28
- **Objetivo:** Portar el motor real de Arkanoid (`references/started-games/04-arkanoid`) a TypeScript, integrarlo al HUD/modal existentes en `/juegos/bloque-buster/jugar` (reemplazando el placeholder simulado del id `bloque-buster`, ya existente en `lib/data.ts`), y agregar su entrada al registro genérico `REAL_GAME_ENGINES` (ya existente desde spec 07, sin refactor adicional).

## Scope

**Incluido:**

- Puerto 1:1 de `game.js`/`levels.js` a TypeScript en `lib/games/bloque-buster/engine.ts`: paleta (`paddle`), pelota (`ball`), grid de bloques 10×6, 5 niveles (`LEVELS`, layouts fijos `l1..l5` + multiplicador de velocidad por nivel), colisiones AABB paleta/pelota/bloques/paredes, física (`update(dt)`), scoring (+10 por bloque), vidas (3, decrece al perder la pelota por el borde inferior), progresión de nivel (siguiente nivel al vaciar bloques, o `'gameover'` al completar nivel 5 — mapeo de `'win'` confirmado en Bloque B). Mismo balance exacto del original (velocidades base, multiplicador por nivel, rebotes).
- Render vectorial simple (rectángulos de color por bloque/paleta/pelota, mismo array `BLOCK_COLORS`) — sin spritesheet, sin animación de explosión, sin audio (confirmado Bloque A).
- Control de paleta con **teclado** (←→, velocidad fija `PADDLE_SPEED`) **y mouse** (`mousemove` sobre el canvas, con el mismo escalado `scaleX` del original) — confirmado Bloque B.
- `lib/games/bloque-buster/useBloqueBusterGame.ts` — hook que expone `UseGameEngineResult` (contrato compartido de `game-spec-checklist.md`): `score`, `lives` (real, 3→0), `level` (real, 1-5), `state` (`'playing'|'dead'|'gameover'`, con `'win'` del original mapeado a `'gameover'`), `paused`, `pause()`/`resume()`, `forceGameOver()`, `restart()`, `dispose()`, `canvasRef` (callback ref).
- Input capturado vía `keydown`/`keyup`/`mousemove` en el propio `<canvas>` (o `window` para teclado, igual patrón que rocas/caida), ignorado mientras `paused` o modal de fin abierto.
- Pausa **solo vía botón HUD** del sitio — tecla `P`/`Escape` del original y el overlay propio con botones "saltar a nivel N" **no se portan** (confirmado Bloque B).
- `app/juegos/[id]/jugar/page.tsx`: agrega `const bloqueBuster = useBloqueBusterGame();` y la entrada `bloqueBuster` a `REAL_GAME_ENGINES` (registro genérico ya existente desde spec 07) — sin refactor adicional, sin tocar `rocas`/`caida`.
- HUD existente (Puntuación/Vidas/Nivel, botones PAUSA/FIN/SALIR) conectado al estado real del hook para `bloque-buster`, mismo patrón que rocas/caida.

**Explícitamente fuera de alcance:**

- Spritesheet (`assets/spritesheet-breakout.png`), animación de explosión al romper bloques, y sonidos (`ball-bounce.mp3`, `break-sound.mp3`) — confirmado Bloque A, reemplazado por dibujo vectorial simple.
- Overlay propio de pausa con botones "saltar a nivel N" (debug) — confirmado Bloque B.
- Controles táctiles/mobile.
- Canvas responsive real (reflow de proporciones) — solo escala dentro del marco CRT ya fijo.
- Confirmación de salida al cerrar pestaña o navegar con "atrás" del navegador (`beforeunload`).
- Migración/insert en tabla `games` — Caso A confirmado, `bloque-buster` ya sembrado (spec 06).
- Cambios a `/juegos/bloque-buster` (ficha de detalle) más allá de lo ya cubierto por spec 06 (leaderboard real genérico).
- Convertir otro placeholder fake (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) a motor real.
- Tests automatizados.
- Rebalanceo de dificultad o features no presentes en `game.js` original.

## Modelo de datos

Sin tablas ni tipos persistidos nuevos — reutiliza `SavedScore`/leaderboard real de spec 06 tal cual. Caso A: `bloque-buster` ya existe en `GAMES` (`lib/data.ts`) y en tabla `games` (spec 06) — sin migración.

**`lib/games/bloque-buster/engine.ts`**

```ts
export type EngineState = "playing" | "dead" | "gameover";

export interface EngineSnapshot {
  score: number;
  lives: number; // 3 → 0
  level: number; // 1-5, real del motor
  state: EngineState; // 'win' del original se resuelve como 'gameover'
}

export class BloqueBusterEngine {
  constructor(canvas: HTMLCanvasElement);
  update(dt: number): void;
  draw(): void; // rectángulos de color, sin sprites/explosión
  handleKeyDown(code: string): void; // ArrowLeft/ArrowRight
  handleKeyUp(code: string): void;
  handleMouseMove(clientX: number, rect: DOMRect): void; // paleta sigue al mouse, con el mismo escalado scaleX del original
  getSnapshot(): EngineSnapshot;
  destroy(): void;
}

// Internos, no exportados fuera del módulo:
// PADDLE_SPEED, BLOCK_COLS (10), BLOCK_ROWS (6), BLOCK_W (64), BLOCK_H (24), BLOCK_COLORS
// BASE_BALL_VX/VY, LEVELS (5, layouts + speed multiplier, portado de levels.js)
// collideAABB, loadLevel, initBall
```

**`lib/games/bloque-buster/useBloqueBusterGame.ts`**

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

export function useBloqueBusterGame(): UseGameEngineResult;
```

Hook posee el `BloqueBusterEngine`, corre el loop `requestAnimationFrame` (dt capado a 50ms, mismo criterio que rocas/caida), engancha `keydown`/`keyup` en `window` y `mousemove` en el propio nodo canvas (delegando a `engine.handleKeyDown`/`handleKeyUp`/`handleMouseMove`), sincroniza `score`/`lives`/`level`/`state` a React state solo cuando cambian.

`useRocasGame`/`useCaidaGame` ya exponen exactamente `UseGameEngineResult` — no requieren cambios.

**Extensión en `page.tsx`** (sin refactor, solo agregar):

```ts
const rocas = useRocasGame();
const caida = useCaidaGame();
const bloqueBuster = useBloqueBusterGame();

const REAL_GAME_ENGINES: Record<string, UseGameEngineResult> = {
  rocas,
  caida,
  "bloque-buster": bloqueBuster,
};
```

## Plan de implementación

1. **Motor portado**: crear `lib/games/bloque-buster/engine.ts` con `BloqueBusterEngine` (constructor recibe `canvas`, expone `update(dt)`, `draw()`, `handleKeyDown(code)`, `handleKeyUp(code)`, `handleMouseMove(clientX, rect)`, `getSnapshot()`, `destroy()`), portando 1:1 la lógica de `game.js`/`levels.js`: paleta, pelota, 5 niveles con sus layouts y multiplicador de velocidad, colisiones AABB, scoring, vidas, progresión de nivel, mapeo de `'win'` (nivel 5 completo) a `state: 'gameover'`. `draw()` pinta con rectángulos de color, sin sprites/animación de explosión. Nada lo importa aún — proyecto sigue compilando igual.

2. **Hook de integración**: crear `lib/games/bloque-buster/useBloqueBusterGame.ts` (mismo patrón que `useCaidaGame.ts`: `canvasRef` callback ref, RAF loop con dt capado a 50ms, `keydown`/`keyup` en `window` delegando a `engine.handleKeyDown`/`handleKeyUp`, `mousemove` en el nodo canvas delegando a `engine.handleMouseMove`, todo ignorado si `state === 'gameover'` o `paused`, `pause()`/`resume()` sin destruir canvas, `forceGameOver()`, `restart()`, `dispose()`). Nada lo usa aún.

3. **Extensión del registro en `jugar/page.tsx`**: agregar `const bloqueBuster = useBloqueBusterGame();` y la entrada `"bloque-buster": bloqueBuster` a `REAL_GAME_ENGINES` (sin tocar el resto del wiring genérico ya existente de spec 07). `rocas` y `caida` siguen exactamente igual.

4. **Cierre**: jugar una partida completa de BLOQUE BUSTER en el navegador — mover paleta con teclado y con mouse, rebotar pelota contra paredes/paleta/bloques, romper bloques de los 5 niveles y confirmar que sube de nivel al vaciar el grid, perder las 3 vidas y confirmar que abre el modal "FIN DEL JUEGO" con el score real, completar el nivel 5 y confirmar que también abre el mismo modal (mapeo de `'win'`); probar que "GUARDAR PUNTUACIÓN" persiste vía leaderboard real (spec 06) con `game_id: 'bloque-buster'`; probar PAUSA/REANUDAR, FIN, SALIR (con y sin confirm); repasar visualmente ROCAS y CAÍDA para confirmar cero regresión tras agregar la entrada al registro; correr `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores de tipos ni de lint.
- [ ] `/juegos/bloque-buster/jugar` renderiza un `<canvas>` real (escalado dentro del marco `.crt-screen` existente) en vez de los divs decorativos `.game-arena`.
- [ ] Paleta se mueve con ←→ (velocidad fija) y con el mouse (sigue el cursor sobre el canvas, con el mismo escalado que el original).
- [ ] Pelota rebota correctamente contra paredes (izq/der/arriba) y contra la paleta, con el mismo ángulo/velocidad del original.
- [ ] Los 5 niveles cargan con sus layouts exactos (`l1..l5` de `levels.js`) y el multiplicador de velocidad correspondiente; romper un bloque otorga +10 puntos.
- [ ] Al vaciar todos los bloques de un nivel, carga el siguiente nivel automáticamente; al vaciar el nivel 5, el juego termina (mapeo de `'win'` a `'gameover'`).
- [ ] HUD muestra Puntuación/Vidas/Nivel reales sincronizados con el motor (vidas 3→0, nivel 1-5).
- [ ] Al perder la pelota con 0 vidas restantes (`gameover`), el loop se detiene y se abre automáticamente el modal "FIN DEL JUEGO" existente con el score real.
- [ ] Botón "GUARDAR PUNTUACIÓN" en el modal inserta correctamente en `scores` (leaderboard real, spec 06) con `game_id: 'bloque-buster'`.
- [ ] Botón PAUSA detiene el avance (paleta/pelota/bloques congelados) y muestra el overlay "EN PAUSA" existente; REANUDAR continúa donde quedó. Tecla `P`/`Escape` del original no tiene efecto, ni aparece el overlay propio de "saltar a nivel".
- [ ] Botón FIN, con partida en curso, termina de inmediato con el score acumulado.
- [ ] Botón SALIR con partida en curso muestra `confirm()` antes de navegar; sin partida en curso navega directo.
- [ ] Desmontar la página detiene el `requestAnimationFrame` y remueve los listeners de teclado/mouse — sin loops en background.
- [ ] `bloque-buster` aparece en `REAL_GAME_ENGINES`; `rocas` y `caida` siguen funcionando exactamente igual que antes de este spec.
- [ ] Los otros 5 placeholders fake (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen funcionando igual, sin regresión.

## Decisiones tomadas y descartadas

- **Reemplaza `/juegos/bloque-buster/jugar` existente**, no ruta nueva. Motivo: id ya calza en título/cover/color con Arkanoid — cero duplicación de UI.
- **Puerto 1:1 de `game.js`/`levels.js`**, sin recortar mecánica (5 niveles, multiplicador de velocidad, física exacta). Motivo: juego ya probado, mismo criterio que ROCAS/CAÍDA.
- **Sin spritesheet, sin animación de explosión, sin audio** — dibujo vectorial simple con rectángulos de color. Motivo: decisión explícita, mismo precedente sin-audio de ROCAS/CAÍDA; evita carga async de imagen y assets binarios para un motor que hasta ahora es 100% vectorial.
- **Control de paleta con teclado y mouse**, ambos portados. Motivo: control nativo del juego original (no táctil), bajo esfuerzo, mejora el feel sin apartarse del patrón desktop-only ya fijado.
- **Pausa solo vía botón HUD**, tecla `P`/`Escape` y overlay propio de "saltar a nivel" descartados. Motivo: mismo patrón que CAÍDA — evita mecanismos de pausa redundantes; el salto de nivel es una herramienta de debug del original, no una feature de juego.
- **`'win'` (nivel 5 completo) mapeado a `state: 'gameover'`**, mismo modal que perder por vidas en 0. Motivo: decisión explícita — el contrato compartido del motor no distingue victoria/derrota, y el modal genérico ya cubre "fin de partida" sin necesitar un tercer estado.
- **Solo agregar entrada al registro `REAL_GAME_ENGINES`**, sin refactor adicional. Motivo: el refactor genérico ya se hizo en spec 07 — este spec es el primer caso real de "solo agregar", validando que el patrón escala sin fricción.
- **Caso A: sin migración ni insert nuevo** — `bloque-buster` ya sembrado en tabla `games` desde spec 06. Motivo: confirmado explícitamente, evita insert redundante.
- **Sin tests automatizados.** Motivo: no hay test runner configurado; verificación manual + `npm run lint`/`build`.

## Riesgos identificados

| Riesgo                                                                                                                                                                                        | Mitigación                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doble montaje en React StrictMode (dev): `useEffect`/`canvasRef` puede correr dos veces, duplicando listeners de teclado/mouse o instancias del motor si el cleanup no es exhaustivo.         | Cleanup completo (cancela RAF, remueve todos los listeners) antes de crear instancia nueva — mismo patrón ya usado en `useRocasGame.ts`/`useCaidaGame.ts`; probar entrando/saliendo de `/juegos/bloque-buster/jugar` varias veces en dev. |
| Re-render excesivo por sincronizar estado cada frame (60/s).                                                                                                                                  | Solo llamar `setState` cuando el valor sincronizado cambia respecto al anterior (comparar snapshot), no en cada frame ciego.                                                                                                              |
| Tecla espacio u otras usadas por el juego scrollean la página o interfieren con el input del modal de fin.                                                                                    | `preventDefault()` en el handler para las teclas del juego (`ArrowLeft`/`ArrowRight`); ignorar el handler mientras `state === 'gameover'` (modal abierto) o `paused === true`.                                                            |
| `mousemove` en el canvas puede disparar aunque el juego esté pausado o el modal de fin abierto, moviendo la paleta "detrás" del overlay sin que el jugador lo note.                           | Ignorar `handleMouseMove` en el motor mientras `paused === true` o `state === 'gameover'`, mismo criterio que el teclado.                                                                                                                 |
| Extender `REAL_GAME_ENGINES` toca código ya funcionando de ROCAS y CAÍDA — un error al agregar la entrada nueva podría romper el registro genérico compartido.                                | Playtest de ROCAS y CAÍDA (no solo BLOQUE BUSTER) como parte del cierre de este spec, comparando comportamiento antes/después de agregar la entrada.                                                                                      |
| Los 5 layouts de `levels.js` son arrays generados por fórmula (gaps, paridad col+row, marco+cruz) — un error de traducción a TS puede alterar sutilmente un layout sin romper la compilación. | Comparar visualmente cada uno de los 5 niveles portados contra el original (`open index.html` en `references/started-games/04-arkanoid/`) durante el playtest de cierre.                                                                  |
