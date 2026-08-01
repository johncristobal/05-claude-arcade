# Game Jam "Frogger" — Variante A: RANARIA (cruce clásico)

## Header

- **Estado:** Draft
- **Dependencias:** `05-rocas-juego-real.md` (Implementado) y `06-leaderboard-real.md` (Implementado) — precedente de patrón (motor + hook + HUD/modal reusado + `REAL_GAME_ENGINES`, leaderboard real). Sin dependencia funcional de otros specs.
- **Fecha:** 2026-07-31
- **Objetivo:** Diseñar el motor real de un cruce de carriles estilo Frogger (desde cero, sin código de referencia) en TypeScript, integrarlo al HUD/modal existentes en `/juegos/ranaria/jugar`, reemplazando el placeholder simulado del id `ranaria` ya existente en `lib/data.ts`.

## Scope

**Incluido:**

- Motor real en `lib/games/ranaria/engine.ts`: grilla fija de 20 columnas × 15 filas (celdas de 40 px, 800×600), banda de río (5 carriles con troncos que se desplazan horizontalmente a distinta velocidad/dirección), banda de carretera (5 carriles con vehículos que se desplazan horizontalmente a distinta velocidad/dirección), fila de meta con 5 huecos de nenúfar, fila de salida segura, dos franjas de césped medianero como zonas seguras.
- Movimiento discreto por celda (hop): cada pulsación de flecha mueve la rana exactamente una celda en esa dirección, sin desplazamiento continuo — fiel al Frogger original.
- Colisión letal contra vehículo en carril de carretera; colisión letal al caer en agua de río sin estar sobre un tronco (incluye ser arrastrada fuera del tablero por un tronco); movimiento bloqueado (no letal) al intentar ocupar un hueco de nenúfar ya lleno.
- Temporizador por vida: cuenta regresiva visible en el HUD (vía `score`/estado interno, no un campo nuevo del contrato) que resta una vida si llega a cero antes de alcanzar una meta.
- Progresión de "tablero": al llenar los 5 huecos de nenúfar, el tablero se reinicia (huecos vacíos), sube el nivel, aumenta la velocidad de carriles y baja levemente el tiempo del temporizador (con piso mínimo).
- `lib/games/ranaria/useRanariaGame.ts` — hook con la forma estándar `UseGameEngineResult` (`canvasRef` callback, `score`, `lives`, `level`, `state`, `paused`, `pause()`, `resume()`, `forceGameOver()`, `restart()`, `dispose()`).
- `app/juegos/[id]/jugar/page.tsx`: agregar `const ranaria = useRanariaGame();` y su entrada en `REAL_GAME_ENGINES` (registro genérico ya existe — no hace falta refactor, solo la entrada nueva).
- HUD existente (Puntuación/Vidas/Nivel, botones PAUSA/FIN/SALIR) conectado al hook para `ranaria`, mismo patrón que ROCAS/CAÍDA/SERPENTINA.
- Guardado de score real vía `saveScore` (leaderboard real, spec 06) — ya funciona para cualquier id real, sin cambios adicionales.

**Explícitamente fuera de alcance:**

- Audio.
- Controles táctiles/mobile.
- Canvas responsive real (reflow de proporciones) — solo escala dentro del marco `.crt-screen` ya fijo.
- Confirmación `beforeunload` al cerrar pestaña o navegar con "atrás" del navegador.
- Convertir otros placeholders (`gloton`, `invasores`, `duelo-pixel`) a motor real.
- Tests automatizados.
- Rebalanceo fuera de lo definido en este spec (número de carriles, valores de temporizador, velocidades).
- Tortugas que se sumergen periódicamente (variante clásica del río) — solo troncos, para acotar el motor.
- Migración/insert en tabla `games` — Caso A confirmado, `ranaria` ya sembrado (spec 06).

## Modelo de datos

Sin tablas ni tipos persistidos nuevos — reutiliza `LeaderboardRow`/`saveScore` de spec 06 tal cual. Caso A: `ranaria` ya existe en `GAMES` (`lib/data.ts`) y en la tabla `games` (spec 06) — sin migración.

**`lib/games/ranaria/engine.ts`**

```ts
export type EngineState = "playing" | "dead" | "gameover";

export interface EngineSnapshot {
  score: number;
  lives: number; // 3 al iniciar, baja con cada muerte/timeout, 0 en gameover
  level: number; // número de tablero (sube al llenar los 5 huecos de meta)
  state: EngineState;
}

export type LaneKind = "goal" | "river" | "median" | "road" | "safe";

export interface Lane {
  row: number;
  kind: LaneKind;
  direction: 1 | -1; // solo aplica a river/road
  speed: number; // celdas/seg, sube con el nivel
}

export class RanariaEngine {
  constructor(canvas: HTMLCanvasElement);
  update(dt: number): void; // avanza vehículos/troncos, descuenta temporizador
  draw(): void; // grilla, carriles, rana, HUD interno de temporizador
  move(dir: "up" | "down" | "left" | "right"): void; // hop discreto de una celda
  getSnapshot(): EngineSnapshot;
  destroy(): void;
}

// Internos, no exportados fuera del módulo:
// COLS (20), ROWS (15), CELL (40), GOAL_SLOTS (5), LIFE_TIME_MS_BASE, LIFE_TIME_MS_MIN
// buildLanes(level), spawnObstacles, isOnLog, isGoalSlotFree, resetFrogPosition
```

**`lib/games/ranaria/useRanariaGame.ts`**

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

export function useRanariaGame(): UseGameEngineResult;
```

El hook posee el `RanariaEngine`, corre el loop `requestAnimationFrame` (dt capado a 50ms, mismo criterio que ROCAS), engancha `keydown` en `window` (flechas → `move(dir)`, ignorado si `state === 'gameover'` o `paused === true`), sincroniza `score`/`lives`/`level`/`state` a React state solo cuando cambian.

## Plan de implementación

1. **Motor**: crear `lib/games/ranaria/engine.ts` con `RanariaEngine` (constructor recibe `canvas`, expone `update(dt)`, `draw()`, `move(dir)`, `getSnapshot()`, `destroy()`): construcción de carriles por nivel (`buildLanes`), spawn/scroll de vehículos y troncos, detección de colisión letal (vehículo, agua sin tronco, salida del tablero arrastrada por tronco), bloqueo de meta ocupada, temporizador por vida, avance de puntaje (+10 por fila nueva avanzada, +200 por meta alcanzada, +1000 al completar las 5 metas de un tablero), transición de nivel al llenar las 5 metas. Nada lo usa aún — proyecto sigue compilando igual.

2. **Hook de integración**: crear `lib/games/ranaria/useRanariaGame.ts` (mismo patrón que `useSerpentinaGame.ts`: `canvasRef` callback ref, RAF loop con dt capado a 50ms, `keydown` en `window` delegando a `engine.move`, ignorado si `over`/`paused`, sincroniza `score`/`lives`/`level`/`state`/`paused` a React state solo en cambio, implementa `pause()/resume()/forceGameOver()/restart()/dispose()`). Nada lo usa aún.

3. **Wiring en `page.tsx`**: agregar `const ranaria = useRanariaGame();` y la entrada `ranaria` en el objeto `REAL_GAME_ENGINES` ya existente (sin refactor — registro genérico ya está armado desde spec 07). El branch único de render ya cubre el canvas, sin cambios ahí.

4. **Cierre**: jugar una partida completa de RANARIA en el navegador — cruzar carretera y río sin morir, subirse/bajarse de troncos, alcanzar los 5 huecos de meta y confirmar transición de nivel (velocidad sube), morir por vehículo, morir por caída al agua, morir por timeout del temporizador, confirmar modal "FIN DEL JUEGO" con score real y "GUARDAR PUNTUACIÓN" vía leaderboard real (spec 06); probar PAUSA/REANUDAR, FIN, SALIR (con y sin confirm); repasar visualmente el resto del catálogo para confirmar cero regresión; `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores de tipos ni de lint.
- [ ] `/juegos/ranaria/jugar` renderiza un `<canvas>` real a resolución nativa (escalado dentro del marco `.crt-screen` existente) en vez de los divs decorativos `.game-arena`.
- [ ] La rana se mueve con las 4 flechas en saltos discretos de una celda, sin deslizamiento continuo.
- [ ] Los carriles de carretera desplazan vehículos a velocidad/dirección propias por carril; tocar uno mata a la rana de inmediato.
- [ ] Los carriles de río desplazan troncos; pisar agua sin estar sobre un tronco mata a la rana; ser arrastrada fuera del tablero por un tronco también mata.
- [ ] Llegar a un hueco de nenúfar libre lo marca como ocupado y suma puntos; intentar ocupar uno ya lleno bloquea el movimiento sin matar.
- [ ] El temporizador visible baja durante la partida; llegar a cero cuesta una vida y reinicia la posición de la rana.
- [ ] Llenar los 5 huecos de meta sube de nivel, reinicia los huecos y aumenta visiblemente la velocidad de los carriles.
- [ ] HUD (Puntuación/Vidas/Nivel) sincronizado con el estado real del motor.
- [ ] Al perder la tercera vida se abre el modal "FIN DEL JUEGO" existente con el score real.
- [ ] Botón "GUARDAR PUNTUACIÓN" persiste vía `saveScore` (leaderboard real, spec 06) con `game_id: 'ranaria'`.
- [ ] Botón PAUSA congela vehículos/troncos/temporizador y muestra el overlay "EN PAUSA"; REANUDAR continúa donde quedó.
- [ ] Botón FIN termina de inmediato con el score acumulado.
- [ ] Botón SALIR con partida en curso muestra `confirm()`; sin partida en curso navega directo.
- [ ] Desmontar la página detiene el `requestAnimationFrame` y remueve los listeners de teclado.
- [ ] El resto del catálogo (`rocas`, `caida`, `bloque-buster`, `serpentina`, `gloton`, `invasores`, `duelo-pixel`) sigue funcionando igual, sin regresión.

## Decisiones tomadas y descartadas

- **Interpretación del tema:** de las tres variantes generadas en esta corrida de `game-jam`, esta es la más fiel al Frogger clásico — movimiento discreto por celda, contrarreloj, banda de río con troncos y banda de carretera con vehículos, meta con múltiples huecos. Es intencionalmente la "versión canónica" del tema, contra la cual las variantes B (`semaforo`) y C (`cruce`) se diferencian con mecánicas de otro género (puzzle de patrones por turnos y carrera versus en tiempo real respectivamente).
- **Solapamiento con `game-planner`:** la fila `Frogger`/`ranaria` ya existe en `.claude/agents/game-planner/memoria.md` (2026-07-31, tercera ronda) en estado `propuesto`, con una justificación de una sola línea ("vidas y multi-carril sin IA de persecución"). `game-planner` nunca redacta specs — solo recomienda qué construir. Esta variante retoma el mismo id/concepto porque el tema de esta corrida de `game-jam` es literalmente "Frogger" (motivado por la fila de `JUEGOS.md` línea 92) y produce el spec completo y jugable que esa recomendación nunca detalló: grilla exacta, reglas de colisión, temporizador, curva de nivel y scoring. Se documenta explícitamente para que quede claro que no es una duplicación silenciosa, sino la materialización de una propuesta ya existente, presentada junto a dos alternativas mecánicamente distintas para que el usuario pueda comparar antes de promover ninguna.
- **Id `ranaria` (Caso A, reuso de placeholder), no id nuevo.** Motivo: el placeholder ya tiene título, cover (`cover-rana`), color (verde) y descripción ("Salta entre carriles de coches... Llega a los nenúfares antes de que se acabe el tiempo") coherentes con esta mecánica exacta — cero migración, cero entrada nueva en `GAMES`.
- **Movimiento discreto por celda, no continuo.** Motivo: es la seña de identidad mecánica del Frogger original y lo que distingue esta variante de la C (`cruce`), que sí usa movimiento continuo.
- **Vidas = 3, reales.** Motivo: mapeo directo — colisión con vehículo, caída al agua o timeout del temporizador restan una vida; mismo patrón que `rocas`/`bloque-buster`.
- **Nivel = número de tablero completado** (todas las metas llenas). Motivo: el Frogger original avanza de "pantalla" al llenar los huecos de meta; sube velocidad de carriles como único efecto de dificultad, sin agregar mecánicas nuevas no presentes en el original.
- **Sin tortugas que se sumergen.** Motivo: acota el motor a troncos únicamente — agrega variedad de river sin sumar una segunda clase de hazard temporizado; puede evaluarse en una iteración futura si se desea mayor fidelidad al arcade original.
- **Sin audio ni controles táctiles.** Motivo: mismo alcance que el resto del catálogo real (`rocas`, `caida`, `bloque-buster`, `serpentina`).

## Riesgos identificados

| Riesgo                                                                                                                                                              | Mitigación                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doble montaje en React StrictMode (dev): `useEffect` puede correr dos veces, duplicando listeners de teclado o instancias del motor si el cleanup no es exhaustivo. | Cleanup completo en el `return` del `useEffect` (cancela RAF, remueve todos los listeners); probar entrando/saliendo de `/juegos/ranaria/jugar` varias veces en dev. |
| Re-render excesivo por sincronizar estado cada frame (60/s).                                                                                                        | Solo llamar `setState` cuando el valor sincronizado cambia respecto al anterior, no en cada frame ciego.                                                             |
| Flechas (especialmente arriba/abajo) scrollean la página o interfieren con el input del modal de fin.                                                               | `preventDefault()` en el handler para las 4 flechas; ignorar el handler mientras `state === 'gameover'` (modal abierto) o `paused === true`.                         |
| Ser arrastrado por un tronco puede sacar a la rana fuera de la grilla visible si no se clampa la posición al límite del tablero antes de evaluar colisión.          | Evaluar "salida del tablero" como condición de muerte explícita en `update()`, comparando la posición X de la rana contra los bordes del canvas antes de dibujar.    |
| Balance de velocidades/temporizador es diseño nuevo sin código de referencia — puede sentirse injusto (imposible de cruzar) o trivial.                              | Ajustar valores durante el playtest manual del paso de cierre; no bloquea criterios de aceptación (piden comportamiento, no cifras exactas).                         |
