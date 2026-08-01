# Game Jam "Frogger" — Variante C: DUELO DE CARRILES (carrera versus en tiempo real)

## Header

- **Estado:** Draft
- **Dependencias:** `05-rocas-juego-real.md` (Implementado) y `06-leaderboard-real.md` (Implementado) — precedente de patrón (motor + hook + HUD/modal reusado + `REAL_GAME_ENGINES`, leaderboard real). Sin dependencia funcional de otros specs.
- **Fecha:** 2026-07-31
- **Objetivo:** Diseñar el motor real de DUELO DE CARRILES (desde cero, sin código de referencia) en TypeScript — una carrera 1 vs CPU que reinterpreta el cruce de carriles de Frogger como competencia en tiempo real con movimiento libre — e integrarlo al HUD/modal existentes en `/juegos/cruce/jugar`, sembrando su fila en `games`.

## Scope

**Incluido:**

- Motor real en `lib/games/cruce/engine.ts`: un único canvas de 800×600 dividido visualmente en dos pistas verticales espejadas (mitad izquierda: jugador; mitad derecha: CPU), cada una con el mismo conjunto de carriles de peligro (vehículos horizontales) sincronizados en espejo, corriendo de la fila de salida (abajo) a la fila de meta (arriba).
- Movimiento **continuo** (no discreto por celda): el jugador se desplaza libremente en X/Y dentro de su pista con las 4 flechas, a velocidad constante; colisión AABB simple contra los vehículos.
- CPU con IA reactiva simple: avance constante hacia la meta con desvío lateral cuando detecta un vehículo dentro de una ventana de anticipación fija en su carril actual (sin pathfinding, sin planificación multi-carril).
- Condición de ronda: gana la ronda quien alcanza primero la fila de meta de su propia pista. Choque contra un vehículo no mata — retrocede al racer una distancia fija (setback) dentro de su pista, manteniendo la tensión sin cortar la partida.
- Partida = mejor de 5 rondas. Ganar una ronda suma puntos; perder una ronda (la CPU llega primero) resta una vida. 3 vidas (rondas perdidas) terminan la partida antes de completar las 5.
- Progresión de nivel: cada ronda jugada sube el nivel, aumenta la velocidad/densidad de vehículos y la agresividad de la IA de la CPU (ventana de anticipación menor, reacciona más tarde a partir de cierto nivel para mantenerlo jugable).
- `lib/games/cruce/useCruceGame.ts` — hook con la forma estándar `UseGameEngineResult`.
- `app/juegos/[id]/jugar/page.tsx`: agregar `const cruce = useCruceGame();` y su entrada en `REAL_GAME_ENGINES`.
- Entrada nueva en `GAMES` (`lib/data.ts`) e insert en la tabla `games` — ver Modelo de datos.
- HUD existente (Puntuación/Vidas/Nivel, botones PAUSA/FIN/SALIR) conectado al hook, mismo patrón que el resto del catálogo real.

**Explícitamente fuera de alcance:**

- Modo local a 2 jugadores humanos (solo 1 vs CPU) — el contrato `UseGameEngineResult` expone un único `score`/`lives`, no hay forma natural de representar dos jugadores humanos sin inventar un segundo canal fuera de contrato.
- Audio.
- Controles táctiles/mobile.
- Canvas responsive real.
- Confirmación `beforeunload`.
- Convertir otros placeholders a motor real.
- Tests automatizados.
- Rebalanceo fuera de lo definido en este spec (velocidad de vehículos, agresividad de IA, distancia de setback).

## Modelo de datos

Caso B — id nuevo, requiere migración y entrada en `GAMES`.

**Insert de referencia (texto, no ejecutar desde este spec — corre en `/spec-impl` vía `mcp__supabase__apply_migration`):**

```sql
insert into games (id, title) values ('cruce', 'DUELO DE CARRILES');
```

**Entrada nueva en `lib/data.ts` (`GAMES`):**

```ts
{
  id: "cruce",
  title: "DUELO DE CARRILES",
  short: "Carrera de tráfico, 1 vs CPU.",
  long: "Dos pistas idénticas, un mismo tráfico. Tú y la CPU corren en paralelo hacia la meta esquivando el mismo caos vehicular. Nada de vidas al primer roce: aquí gana quien cruza primero.",
  cat: "VERSUS",
  cover: "cover-cruce",
  color: "magenta",
  best: 5,
  plays: "0",
},
```

Requiere además una clase CSS `.cover-cruce` nueva en `app/globals.css`, siguiendo la misma convención de las `cover-*` existentes — se agrega como paso del plan de implementación, no se describe el CSS exacto aquí.

**`lib/games/cruce/engine.ts`**

```ts
export type EngineState = "playing" | "dead" | "gameover";

export interface EngineSnapshot {
  score: number;
  lives: number; // 3 rondas perdidas permitidas antes de gameover
  level: number; // ronda jugada (1..5), sube velocidad/densidad y agresividad de la CPU
  state: EngineState;
}

export interface Racer {
  x: number;
  y: number;
  track: "player" | "cpu";
}

export class CruceEngine {
  constructor(canvas: HTMLCanvasElement);
  update(dt: number): void; // avanza vehículos, mueve CPU, detecta colisiones/meta
  draw(): void; // dos pistas espejadas, vehículos, ambos racers
  setInput(dir: "up" | "down" | "left" | "right", pressed: boolean): void; // movimiento continuo (mantener tecla)
  getSnapshot(): EngineSnapshot;
  destroy(): void;
}

// Internos, no exportados fuera del módulo:
// TRACK_WIDTH, TRACK_HEIGHT, LANE_COUNT, SETBACK_DISTANCE, ROUNDS_TO_WIN (5)
// spawnLaneVehicles(level), moveCpu(dt, level), checkGoal, checkCollision, resetRacers
```

**`lib/games/cruce/useCruceGame.ts`**

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

export function useCruceGame(): UseGameEngineResult;
```

El hook posee el `CruceEngine`, corre el loop `requestAnimationFrame` (dt capado a 50ms), engancha `keydown`/`keyup` en `window` (flechas → `setInput(dir, pressed)`, movimiento continuo mientras se mantiene la tecla, ignorado si `state === 'gameover'` o `paused === true`), sincroniza `score`/`lives`/`level`/`state` a React state solo cuando cambian.

## Plan de implementación

1. **Motor**: crear `lib/games/cruce/engine.ts` con `CruceEngine` (constructor recibe `canvas`, expone `update(dt)`, `draw()`, `setInput(dir, pressed)`, `getSnapshot()`, `destroy()`): construcción de carriles de vehículos espejados en ambas pistas por nivel, movimiento continuo del jugador con colisión AABB, IA reactiva de la CPU (avance + desvío lateral ante vehículo próximo dentro de ventana de anticipación), detección de meta por pista, setback al colisionar (sin muerte instantánea), conteo de rondas ganadas/perdidas, transición de nivel por ronda jugada, scoring (+1000 por ronda ganada, bonus por margen de tiempo sobre la CPU). Nada lo usa aún — proyecto sigue compilando igual.

2. **Hook de integración**: crear `lib/games/cruce/useCruceGame.ts` (mismo patrón de `canvasRef` callback + RAF loop, `keydown`/`keyup` en `window` delegando a `engine.setInput`, sincroniza estado a React solo en cambio, implementa `pause()/resume()/forceGameOver()/restart()/dispose()`). Nada lo usa aún.

3. **Wiring en `page.tsx`**: agregar `const cruce = useCruceGame();` y la entrada `cruce` en `REAL_GAME_ENGINES` (registro genérico ya existe desde spec 07 — solo entrada nueva).

4. **Migración**: insertar la fila `('cruce', 'DUELO DE CARRILES')` en la tabla `games` (vía `mcp__supabase__apply_migration`, solo en `/spec-impl`) y agregar el objeto `Game` completo a `GAMES` en `lib/data.ts`; agregar la clase `.cover-cruce` a `app/globals.css` siguiendo la convención visual existente.

5. **Cierre**: jugar una partida completa de DUELO DE CARRILES en el navegador — moverse libremente con las 4 flechas dentro de la pista propia, chocar con un vehículo y confirmar el setback (sin perder vida), ganar una ronda llegando primero a la meta y confirmar suma de puntos, perder una ronda (dejar que la CPU llegue primero) y confirmar pérdida de vida, jugar las 5 rondas o perder las 3 vidas y confirmar el modal "FIN DEL JUEGO" con el score real y que "GUARDAR PUNTUACIÓN" persiste vía leaderboard real (spec 06); probar PAUSA/REANUDAR, FIN, SALIR (con y sin confirm); repasar visualmente el resto del catálogo para confirmar cero regresión; `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores de tipos ni de lint.
- [ ] `/juegos/cruce/jugar` renderiza un `<canvas>` real a resolución nativa (escalado dentro del marco `.crt-screen` existente) en vez de los divs decorativos `.game-arena`.
- [ ] El jugador se mueve de forma continua (no por celda) con las 4 flechas dentro de su mitad del canvas.
- [ ] La CPU avanza y esquiva vehículos de forma autónoma en su propia pista, sin input del jugador.
- [ ] Chocar con un vehículo aplica un retroceso (setback) sin terminar la partida ni restar vida directamente.
- [ ] Llegar primero a la fila de meta de la propia pista gana la ronda y suma puntos; si la CPU llega primero, se pierde la ronda y resta una vida.
- [ ] Cada ronda jugada sube el nivel y aumenta visiblemente la velocidad/densidad de vehículos y la agresividad de la CPU.
- [ ] HUD (Puntuación/Vidas/Nivel) sincronizado con el estado real del motor.
- [ ] Al perder la tercera vida (o al completarse las 5 rondas) se abre el modal "FIN DEL JUEGO" existente con el score real.
- [ ] Botón "GUARDAR PUNTUACIÓN" persiste vía `saveScore` (leaderboard real, spec 06) con `game_id: 'cruce'`.
- [ ] Botón PAUSA congela ambas pistas (vehículos, jugador y CPU) y muestra el overlay "EN PAUSA"; REANUDAR continúa donde quedó.
- [ ] Botón FIN termina de inmediato con el score acumulado.
- [ ] Botón SALIR con partida en curso muestra `confirm()`; sin partida en curso navega directo.
- [ ] Desmontar la página detiene el `requestAnimationFrame` y remueve los listeners de teclado.
- [ ] `cruce` aparece en `/biblioteca` bajo la categoría VERSUS con su ficha, cover y color propios; su leaderboard en `/juegos/cruce` funciona igual que el resto (spec 06).
- [ ] El resto del catálogo sigue funcionando igual, sin regresión.

## Decisiones tomadas y descartadas

- **Interpretación del tema:** reinterpreta "cruzar esquivando obstáculos en carriles" como una carrera competitiva en tiempo real contra una CPU, con movimiento continuo (no grillado) y sin muerte instantánea (setback en vez de colisión letal). Es la variante que más se aleja mecánicamente de las otras dos: a diferencia de la A (`ranaria`, hop discreto por celda, un jugador, contrarreloj) y la B (`semaforo`, turnos deterministas sin reloj), aquí el tiempo corre siempre, el movimiento es libre en el plano y existe un oponente activo con su propia IA — el objetivo deja de ser "sobrevivir" y pasa a ser "llegar antes".
- **Id nuevo `cruce` (Caso B).** Motivo: ningún placeholder libre calza — `ranaria` se usa en la variante A con su interpretación clásica y `duelo-pixel` (VERSUS) ya está temáticamente comprometido con Pong en `lib/data.ts`/`game-planner`, no con una carrera de tráfico. Requiere insert en `games` + entrada en `GAMES` + clase `cover-cruce` nueva.
- **Categoría VERSUS, no ARCADE.** Motivo: aunque el tema visual es Frogger, la estructura de competencia (rondas ganadas/perdidas contra un oponente activo, mejor de 5) es la misma familia que `nocaut`/`conecta4`/`gato`/`montones` en el pipeline de `game-planner` — y VERSUS es hoy la categoría con menos motores reales (0/8), la de mayor variedad ganada al sumarla.
- **1 vs CPU, sin modo local a 2 jugadores humanos.** Motivo explícito: el contrato `UseGameEngineResult` solo expone un `score`/`lives`/`level` — no hay forma limpia de representar dos marcadores humanos sin romper el contrato compartido por todo el catálogo; se documenta como fuera de alcance en vez de improvisar una extensión ad-hoc del contrato.
- **Colisión con vehículo = setback, no muerte instantánea.** Motivo: en una carrera en tiempo real, la muerte instantánea contra tráfico dañaría el ritmo de "carrera reñida" que es el punto central de esta variante; el setback mantiene la tensión (perder terreno frente al rival) sin cortar la partida en cada roce, a diferencia deliberada de la letalidad de la variante A.
- **Vidas = 3 (rondas perdidas), nivel = ronda jugada.** Motivo: mismo mapeo estándar usado por los candidatos VERSUS del pipeline de `game-planner` (`nocaut`: knockdowns/round; `conecta4`/`gato`: partidas perdidas/ronda) — consistencia de patrón entre agentes sin inventar un concepto nuevo.
- **IA de la CPU reactiva simple (ventana de anticipación fija), sin pathfinding.** Motivo: mantiene el esfuerzo de implementación bajo (comparable a `serpentina`), evitando la complejidad de una IA de persecución o planificación multi-carril que game-planner ya descartó para conceptos similares (p. ej. los cuatro fantasmas de Pac-Man) por su costo.
- **Movimiento continuo, no discreto por celda.** Motivo: es lo que distingue mecánicamente a esta variante de la A; combinado con colisión AABB simple, se mantiene en la misma familia de esfuerzo que `bloque-buster` (colisión AABB) en vez de requerir física más compleja.
- **Sin audio ni controles táctiles.** Motivo: mismo alcance que el resto del catálogo real.

## Riesgos identificados

| Riesgo                                                                                                                                                                                                              | Mitigación                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doble montaje en React StrictMode (dev): `useEffect` puede correr dos veces, duplicando listeners de teclado o instancias del motor si el cleanup no es exhaustivo.                                                 | Cleanup completo en el `return` del `useEffect` (cancela RAF, remueve todos los listeners); probar entrando/saliendo de `/juegos/cruce/jugar` varias veces en dev.                                                                                                        |
| Re-render excesivo por sincronizar estado cada frame (60/s).                                                                                                                                                        | Solo llamar `setState` cuando el valor sincronizado cambia respecto al anterior, no en cada frame ciego.                                                                                                                                                                  |
| Flechas scrollean la página o interfieren con el input del modal de fin; además aquí se usan en modo "mantener presionada" (`keydown`/`keyup`), con más superficie de bugs de estado colgado que un solo `keydown`. | `preventDefault()` en ambos handlers; ignorar `setInput` mientras `state === 'gameover'` o `paused === true`; en `pause()`, limpiar explícitamente todos los flags de input activos para evitar que el jugador seguido moviéndose al reanudar.                            |
| IA de la CPU mal calibrada puede sentirse imbatible (CPU siempre gana) o trivial (CPU nunca esquiva) — riesgo de balance más alto que en las otras dos variantes por depender de un oponente activo.                | Ajustar velocidad base y ventana de anticipación de la CPU durante el playtest manual del paso de cierre hasta lograr una tasa de victoria razonable para un jugador promedio; no bloquea criterios de aceptación (piden comportamiento, no una tasa de victoria exacta). |
| Dividir un único canvas de 800×600 en dos pistas reduce el ancho útil por pista a la mitad — puede sentirse apretado para movimiento libre en X.                                                                    | Definir el ancho de pista y el tamaño de los vehículos/racer con margen explícito antes de portar `draw()`; verificar visualmente en el playtest de cierre que hay espacio suficiente para esquivar.                                                                      |
