# Game Jam "Frogger" — Variante B: SEMÁFORO (cruce por patrones, puzzle por turnos)

## Header

- **Estado:** Draft
- **Dependencias:** `05-rocas-juego-real.md` (Implementado) y `06-leaderboard-real.md` (Implementado) — precedente de patrón (motor + hook + HUD/modal reusado + `REAL_GAME_ENGINES`, leaderboard real). Sin dependencia funcional de otros specs.
- **Fecha:** 2026-07-31
- **Objetivo:** Diseñar el motor real de SEMÁFORO (desde cero, sin código de referencia) en TypeScript — un puzzle de lectura de patrones que reinterpreta el cruce de carriles de Frogger como un reto por turnos, no de reflejos — e integrarlo al HUD/modal existentes en `/juegos/semaforo/jugar`, sembrando su fila en `games`.

## Scope

**Incluido:**

- Motor real en `lib/games/semaforo/engine.ts`: tablero vertical de carriles apilados (5 columnas de ancho, N carriles de altura según nivel), donde cada carril tiene un patrón de ocupación **determinista y cíclico** — una función pura del contador global de "beats" (`occupied(lane, col, beat)`), no aleatoria frame a frame. El juego avanza por **turnos**: cada pulsación de tecla consume exactamente un beat.
- Acciones por turno: mover a la columna izquierda/derecha dentro del carril actual, avanzar al carril de arriba, o esperar (mantener columna) — las cuatro consumen un beat cada una.
- Panel de pronóstico ("semáforo"): franja visual sobre el carril actual/objetivo que muestra qué columnas estarán ocupadas en el beat siguiente (y, en los primeros niveles, en el beat subsiguiente también) — el jugador debe leer el patrón antes de decidir, no reaccionar en tiempo real.
- Regla de fallo: si tras resolver la acción del jugador la celda resultante queda ocupada en el nuevo beat, es un "fallo" — resta una vida y reinicia al jugador en el carril de salida (el contador de beats **no** se reinicia; los patrones siguen su ciclo).
- Progresión de nivel: alcanzar el carril de meta completa el nivel; sube el número de carriles, reduce el período de algunos patrones (ciclos más cortos/entrelazados) y reduce la ventana de pronóstico (de 2 beats a 1 beat en niveles avanzados).
- `lib/games/semaforo/useSemaforoGame.ts` — hook con la forma estándar `UseGameEngineResult`.
- `app/juegos/[id]/jugar/page.tsx`: agregar `const semaforo = useSemaforoGame();` y su entrada en `REAL_GAME_ENGINES`.
- Entrada nueva en `GAMES` (`lib/data.ts`) e insert en la tabla `games` — ver Modelo de datos.
- HUD existente (Puntuación/Vidas/Nivel, botones PAUSA/FIN/SALIR) conectado al hook, mismo patrón que el resto del catálogo real.

**Explícitamente fuera de alcance:**

- Audio.
- Controles táctiles/mobile.
- Canvas responsive real.
- Confirmación `beforeunload`.
- Convertir otros placeholders a motor real.
- Tests automatizados.
- Rebalanceo fuera de lo definido en este spec (número de carriles/columnas, períodos de patrón, ventana de pronóstico).
- Cualquier elemento de reflejos/tiempo real (velocidad de vehículo animada frame a frame) — el motor solo anima visualmente el movimiento entre beats a modo cosmético, la lógica de colisión es 100% discreta por beat.

## Modelo de datos

Caso B — id nuevo, requiere migración y entrada en `GAMES`.

**Insert de referencia (texto, no ejecutar desde este spec — corre en `/spec-impl` vía `mcp__supabase__apply_migration`):**

```sql
insert into games (id, title) values ('semaforo', 'SEMÁFORO');
```

**Entrada nueva en `lib/data.ts` (`GAMES`):**

```ts
{
  id: "semaforo",
  title: "SEMÁFORO",
  short: "Lee el patrón antes de cruzar.",
  long: "Cada carril repite su propio ciclo de peligro. Observa el pronóstico, cuenta los beats y cruza en el instante exacto. Aquí no ganan los reflejos: gana quien lee el patrón.",
  cat: "PUZZLE",
  cover: "cover-semaforo",
  color: "yellow",
  best: 4200,
  plays: "0",
},
```

Requiere además una clase CSS `.cover-semaforo` nueva en `app/globals.css`, siguiendo la misma convención de las `cover-*` existentes (gradiente + patrón decorativo `::after`/`::before`) — se agrega como paso del plan de implementación, no se describe el CSS exacto aquí.

**`lib/games/semaforo/engine.ts`**

```ts
export type EngineState = "playing" | "dead" | "gameover";

export interface EngineSnapshot {
  score: number;
  lives: number; // 3 al iniciar, baja con cada fallo, 0 en gameover
  level: number; // tablero superado (sube carriles, baja período/ventana de pronóstico)
  state: EngineState;
}

export type Action = "left" | "right" | "advance" | "wait";

export class SemaforoEngine {
  constructor(canvas: HTMLCanvasElement);
  step(action: Action): void; // única forma de avanzar el juego: consume un beat
  draw(): void; // carriles, jugador, franja de pronóstico
  getSnapshot(): EngineSnapshot;
  destroy(): void;
}

// Internos, no exportados fuera del módulo:
// COLS (5), LANES_PER_LEVEL(level), CELL, FORECAST_BEATS(level)
// occupied(lane, col, beat) — función pura determinista del patrón
// buildLevel(level), resolveAction(action), isCellSafeAtBeat
```

**`lib/games/semaforo/useSemaforoGame.ts`**

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

export function useSemaforoGame(): UseGameEngineResult;
```

El hook posee el `SemaforoEngine`, corre un loop `requestAnimationFrame` solo para las transiciones visuales cosméticas entre beats (interpolación de posición dibujada), engancha `keydown` en `window` (`←`/`→` → `left`/`right`, `↑` → `advance`, `↓` → `wait`, cada uno llama `engine.step(action)` una sola vez por pulsación — sin repetición por tecla mantenida), ignorado si `state === 'gameover'` o `paused === true`, sincroniza `score`/`lives`/`level`/`state` a React state solo cuando cambian.

## Plan de implementación

1. **Motor**: crear `lib/games/semaforo/engine.ts` con `SemaforoEngine` (constructor recibe `canvas`, expone `step(action)`, `draw()`, `getSnapshot()`, `destroy()`): función determinista `occupied(lane, col, beat)` por carril (período y offset configurables por nivel), construcción de niveles (`buildLevel`), resolución de acción por turno (mover columna / avanzar carril / esperar), detección de fallo (celda resultante ocupada en el nuevo beat), reinicio al carril de salida sin resetear el contador de beats, transición de nivel al alcanzar el carril de meta, scoring (+100 por carril cruzado la primera vez en el intento de nivel actual, +500 al completar el nivel). Nada lo usa aún — proyecto sigue compilando igual.

2. **Hook de integración**: crear `lib/games/semaforo/useSemaforoGame.ts` (mismo patrón de `canvasRef` callback + RAF cosmético + `keydown` en `window` delegando a `engine.step`, sincroniza estado a React solo en cambio, implementa `pause()/resume()/forceGameOver()/restart()/dispose()`). Nada lo usa aún.

3. **Wiring en `page.tsx`**: agregar `const semaforo = useSemaforoGame();` y la entrada `semaforo` en `REAL_GAME_ENGINES` (registro genérico ya existe desde spec 07 — solo entrada nueva).

4. **Migración**: insertar la fila `('semaforo', 'SEMÁFORO')` en la tabla `games` (vía `mcp__supabase__apply_migration`, solo en `/spec-impl`) y agregar el objeto `Game` completo a `GAMES` en `lib/data.ts`; agregar la clase `.cover-semaforo` a `app/globals.css` siguiendo la convención visual existente.

5. **Cierre**: jugar una partida completa de SEMÁFORO en el navegador — leer el pronóstico y cruzar varios carriles sin fallo, provocar un fallo deliberado (ignorar el pronóstico) y confirmar pérdida de vida + reinicio de posición sin reinicio del contador de beats, completar un nivel y confirmar que sube la dificultad (más carriles, ventana de pronóstico más corta), perder las 3 vidas y confirmar el modal "FIN DEL JUEGO" con el score real y que "GUARDAR PUNTUACIÓN" persiste vía leaderboard real (spec 06); probar PAUSA/REANUDAR, FIN, SALIR (con y sin confirm); repasar visualmente el resto del catálogo para confirmar cero regresión; `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores de tipos ni de lint.
- [ ] `/juegos/semaforo/jugar` renderiza un `<canvas>` real a resolución nativa (escalado dentro del marco `.crt-screen` existente) en vez de los divs decorativos `.game-arena`.
- [ ] El juego solo avanza por acción del jugador (una tecla = un beat) — no hay movimiento de obstáculos en tiempo real fuera de esos turnos.
- [ ] La franja de pronóstico muestra correctamente las columnas ocupadas en el/los próximo(s) beat(s), coherente con la función determinista del patrón.
- [ ] Moverse a una celda que resulta ocupada en el nuevo beat cuenta como fallo: resta una vida y reinicia al jugador en el carril de salida sin reiniciar el contador global de beats.
- [ ] Alcanzar el carril de meta sube de nivel, aumenta el número de carriles y reduce la ventana de pronóstico según lo definido.
- [ ] HUD (Puntuación/Vidas/Nivel) sincronizado con el estado real del motor.
- [ ] Al perder la tercera vida se abre el modal "FIN DEL JUEGO" existente con el score real.
- [ ] Botón "GUARDAR PUNTUACIÓN" persiste vía `saveScore` (leaderboard real, spec 06) con `game_id: 'semaforo'`.
- [ ] Botón PAUSA congela el estado del tablero y muestra el overlay "EN PAUSA"; REANUDAR continúa donde quedó.
- [ ] Botón FIN termina de inmediato con el score acumulado.
- [ ] Botón SALIR con partida en curso muestra `confirm()`; sin partida en curso navega directo.
- [ ] Desmontar la página detiene el `requestAnimationFrame` y remueve los listeners de teclado.
- [ ] `semaforo` aparece en `/biblioteca` con su ficha, cover y color propios; su leaderboard en `/juegos/semaforo` funciona igual que el resto (spec 06).
- [ ] El resto del catálogo sigue funcionando igual, sin regresión.

## Decisiones tomadas y descartadas

- **Interpretación del tema:** reinterpreta "cruzar esquivando obstáculos en carriles" como un puzzle de lectura de patrones por turnos, no como un juego de reflejos. Es la variante más distinta de las tres generadas en esta corrida: a diferencia de la A (`ranaria`, hop discreto en tiempo real con temporizador) y la C (`cruce`, carrera continua en tiempo real contra la CPU), aquí no existe reloj ni animación de obstáculos entre turnos — el mundo solo cambia cuando el jugador actúa, y el desafío es memorizar/anticipar un ciclo determinista, mismo espíritu de diseño que `secuencia` (Simón) dentro del pipeline de `game-planner`, pero aplicado a movimiento espacial en vez de repetición de secuencia.
- **Id nuevo `semaforo` (Caso B).** Motivo: ningún placeholder libre calza con esta mecánica — `ranaria` ya se usa en la variante A con su interpretación clásica; forzar dos conceptos distintos bajo el mismo id/ficha confundiría el catálogo. Requiere insert en `games` + entrada en `GAMES` + clase `cover-semaforo` nueva.
- **Categoría PUZZLE, no ARCADE.** Motivo: pese a heredar el tema visual de Frogger, la mecánica central (leer un patrón determinista y planificar antes de actuar, sin reflejos) es de la misma familia que `caida`/`secuencia`, no de reflejos en tiempo real como `serpentina`/`bloque-buster`. Además refuerza PUZZLE (hoy 1/8 juegos reales, empatado con SHOOTER como categorías más chicas junto a VERSUS en 0), en vez de profundizar ARCADE (ya la categoría con más motores reales).
- **Turnos consumidos por tecla, sin repetición al mantener presionada.** Motivo: es la mecánica que distingue a este juego de un dodge en tiempo real — si la tecla mantenida repitiera automáticamente, el juego colapsaría a una versión con reflejos disfrazados.
- **Vidas = 3, nivel = tablero superado.** Motivo: mismo mapeo estándar del catálogo (`bloque-buster`/`rocas`/`nocaut` en el pipeline de `game-planner`), sin inventar un concepto de vida/nivel ajeno al resto del sitio.
- **Patrón 100% determinista (no aleatorio por frame).** Motivo: es el requisito de diseño que convierte esto en un puzzle resoluble por lógica en vez de un juego de azar/reflejos — debe poder memorizarse y predecirse, no solo reaccionarse.
- **Sin audio ni controles táctiles.** Motivo: mismo alcance que el resto del catálogo real.

## Riesgos identificados

| Riesgo                                                                                                                                                              | Mitigación                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doble montaje en React StrictMode (dev): `useEffect` puede correr dos veces, duplicando listeners de teclado o instancias del motor si el cleanup no es exhaustivo. | Cleanup completo en el `return` del `useEffect` (cancela RAF, remueve todos los listeners); probar entrando/saliendo de `/juegos/semaforo/jugar` varias veces en dev.                                      |
| Re-render excesivo por sincronizar estado en cada frame cosmético (60/s) pese a que la lógica solo cambia por turno.                                                | Solo llamar `setState` cuando el valor sincronizado cambia respecto al anterior (comparar snapshot tras cada `step`), no en cada frame de la interpolación visual.                                         |
| Tecla mantenida presionada puede disparar múltiples `keydown` nativos y ejecutar varios turnos de golpe, rompiendo la premisa de "un turno por decisión".           | Debounce explícito por `event.repeat === true` (ignorar repeticiones nativas) o bloquear nuevas acciones hasta que termine la animación cosmética del turno anterior.                                      |
| Función determinista de patrón mal calibrada puede generar carriles imposibles de cruzar sin fallo, o triviales (patrón siempre abierto).                           | Ajustar período/offset por carril durante el playtest manual del paso de cierre hasta que cada nivel tenga al menos una secuencia de acciones demostrablemente segura; no bloquea criterios de aceptación. |
| Flechas scrollean la página o interfieren con el input del modal de fin.                                                                                            | `preventDefault()` en el handler para las 4 flechas; ignorar el handler mientras `state === 'gameover'` (modal abierto) o `paused === true`.                                                               |
