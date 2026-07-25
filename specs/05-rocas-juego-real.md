# 05 — Rocas: juego real

## Header

- **Estado:** Approved
- **Dependencias:** `01-mvp-visual-pantallas.md` (Implementado) — reutiliza `app/juegos/[id]/jugar/page.tsx`, HUD, modal de fin, `AuthProvider`, flujo `av_scores` en `localStorage`. Sin dependencia funcional de `02`/`03`/`04`.
- **Fecha:** 2026-07-24
- **Objetivo:** Portar el motor real del juego Asteroids (`references/started-games/02-asteroids/game.js`) a TypeScript como puerto 1:1, reemplazando el reproductor simulado de `/juegos/rocas/jugar` (id `rocas`, ya existente en `lib/data.ts`) por un `<canvas>` real integrado al HUD y modal de fin de partida ya existentes.

## Scope

**Incluido:**

- Puerto 1:1 de la lógica de `game.js` a TypeScript en `lib/games/rocas/engine.ts`: clases `Ship`, `Asteroid`, `Bullet`, `Particle`, `PowerUp`, arrays `RADII`/`SPEEDS`/`POINTS`, constantes (`POWERUP_DROP_CHANCE`, `POWERUP_DURATION`, `POWERUP_TTL`, `TRIPLE_SPREAD`), funciones `wrap`/`dist`/`rand`/`randInt`, `spawnAsteroids`, `nextLevel`, `explode`, `killShip`, `update(dt)`, `draw(ctx)`. Mismo balance exacto del original (vidas, invencibilidad de reaparición, wrap toroidal, power-up disparo triple).
- `lib/games/rocas/useRocasGame.ts` — hook que encapsula el estado del motor (antes globals en `game.js`), monta el `requestAnimationFrame` loop, engancha input (`keydown`/`keyup` en `window`), expone `score`, `lives`, `level`, `state` (`'playing' | 'dead' | 'gameover'`), y métodos `pause()`, `resume()`, `dispose()` (cleanup de listeners + `cancelAnimationFrame`).
- `app/juegos/[id]/jugar/page.tsx`: cuando `id === 'rocas'`, renderiza `<canvas>` real (via el hook) en vez de los divs decorativos `.game-arena`; el resto de juegos (los otros 7 ids) sigue con la simulación fake `setInterval` tal cual está hoy, sin tocar.
- HUD existente (`hud-stat` Puntuación/Vidas/Nivel, botones PAUSA/FIN/SALIR) conectado al estado real del hook para `rocas`.
- Botón FIN fuerza game over inmediato con el score actual del hook (equivalente a "rendirse").
- Botón SALIR (o click en cualquier link de salida) con partida en curso (`playing`, no pausada, no `over`) dispara `window.confirm(...)`; si se acepta, se limpia el hook (`dispose()`) y navega.
- Al llegar `state === 'gameover'` (lives = 0) en el hook, se dispara `setOver(true)` en React y se abre el modal HTML existente ("FIN DEL JUEGO" + guardar puntuación en `av_scores`, mismo flujo de spec 01). El overlay propio de `game.js` (`drawOverlay` con texto "GAME OVER" dibujado en canvas) **no** se porta — el motor no lo dibuja, solo detiene el loop internamente y expone `state`.
- Overlay "EN PAUSA" existente (`.crt-content` semi-transparente) se reutiliza tal cual, ahora conectado a la pausa real del hook (loop detenido, sin avance de `dt`, input ignorado mientras pausado).
- Canvas con resolución interna fija 800×600 (coordenadas del motor sin cambios), escalado visualmente vía CSS (`width:100%; height:100%; display:block`) dentro del `.crt-screen` existente (`aspect-ratio: 4/3`, ya coincide con 800×600).
- Nombre a guardar en `av_scores` sigue igual que hoy: `nameOverride ?? (user ? user.name : "INVITADO")`, sin cambios a ese flujo.

**Explícitamente fuera de alcance:**

- Controles táctiles / mobile (solo teclado, flechas + espacio, igual al original standalone).
- Canvas responsive real (reflow de proporciones) — solo escala dentro del marco CRT ya fijo en 4:3.
- Confirmación de salida al cerrar pestaña o navegar con el botón "atrás" del navegador (`beforeunload`) — solo cubre el botón SALIR del HUD.
- Convertir algún otro de los 7 juegos fake (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) a lógica real — queda para specs futuros.
- Leaderboard real vía Supabase/DB — `av_scores` sigue en `localStorage` (mismo alcance que spec 01/04).
- Sonido/audio (el original no tiene, no se agrega).
- Cambios a `/juegos/rocas` (ficha de detalle) — sigue con `seededScores` mock y textos actuales, sin tocar.
- Tests automatizados (sigue sin test runner).
- Rebalanceo de dificultad, nuevos power-ups, o cualquier feature no presente en `game.js` original.

## Modelo de datos

Sin tablas ni tipos persistidos nuevos — reutiliza `SavedScore` de `lib/types.ts` (spec 01) tal cual. Lo nuevo es interno al motor/hook, en memoria:

**`lib/games/rocas/engine.ts`**

```ts
export type EngineState = "playing" | "dead" | "gameover";

export interface EngineSnapshot {
  score: number;
  lives: number;
  level: number;
  state: EngineState;
}

export class RocasEngine {
  constructor(canvas: HTMLCanvasElement);
  update(dt: number): void;
  draw(): void;
  getSnapshot(): EngineSnapshot;
  destroy(): void; // limpia listeners propios si el motor los registra
}

// Clases internas, no exportadas fuera del módulo salvo lo que el motor necesite:
// Bullet, Asteroid, Ship, Particle, PowerUp
// RADII, SPEEDS, POINTS, POWERUP_DROP_CHANCE, POWERUP_DURATION, POWERUP_TTL, TRIPLE_SPREAD
// wrap, dist, rand, randInt, spawnAsteroids, nextLevel, explode, killShip
```

**`lib/games/rocas/useRocasGame.ts`**

```ts
export interface UseRocasGameResult {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  score: number;
  lives: number;
  level: number;
  state: EngineState; // 'playing' | 'dead' | 'gameover'
  paused: boolean;
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void; // botón FIN
  dispose: () => void; // limpieza al desmontar / SALIR confirmado
}

export function useRocasGame(): UseRocasGameResult;
```

El hook posee el `RocasEngine`, corre el `requestAnimationFrame` loop internamente (`dt` capado a 50ms, igual original), sincroniza `score`/`lives`/`level`/`state` a React state en cada frame (o solo cuando cambian, para evitar renders innecesarios), y engancha/desengancha `keydown`/`keyup` en `window` durante su ciclo de vida.

`page.tsx` no importa clases del motor directamente — solo usa `useRocasGame()` cuando `id === 'rocas'`.

## Plan de implementación

1. **Motor portado**: crear `lib/games/rocas/engine.ts` con las clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp` y la clase `RocasEngine` (constructor recibe `canvas`, expone `update(dt)`, `draw()`, `getSnapshot()`, `destroy()`), portando 1:1 la lógica de `game.js` (input vía `keys`/`justPressed` propios del motor, no globales del `window` todavía). Nada lo importa aún — proyecto sigue compilando igual.

2. **Hook de integración**: crear `lib/games/rocas/useRocasGame.ts` — instancia `RocasEngine` sobre un canvas via `canvasRef`, corre el loop `requestAnimationFrame` (dt capado a 50ms), engancha `keydown`/`keyup` en `window` mientras está montado, sincroniza `score`/`lives`/`level`/`state`/`paused` a React state, implementa `pause()`/`resume()` (detiene avance de `dt` sin desmontar canvas), `forceGameOver()` (fuerza `state = 'gameover'` con score actual), `dispose()` (cancela RAF + remueve listeners). Nada lo usa aún — sigue sin cambio visible.

3. **Integración en `jugar/page.tsx`**: cuando `id === 'rocas'`, usar `useRocasGame()` en vez del `setInterval` fake; renderizar `<canvas ref={canvasRef} width={800} height={600} />` dentro de `.crt-screen` en lugar de `.game-arena` decorativo; mapear HUD (`Puntuación`/`Vidas`/`Nivel`) a los valores reales; botón PAUSA llama `pause()/resume()`; botón FIN llama `forceGameOver()`; botón SALIR (y cualquier navegación de salida) pide `window.confirm(...)` si `state === 'playing' && !paused`, y si se acepta llama `dispose()` antes de navegar; al detectar `state === 'gameover'` dispara `setOver(true)` con el score real para abrir el modal existente (mismo flujo `av_scores`). Los otros 7 juegos (ids ≠ `rocas`) siguen exactamente igual que hoy. `useEffect` de limpieza llama `dispose()` al desmontar.

4. **Cierre**: jugar una partida completa de ROCAS en el navegador — mover nave, disparar, romper asteroides grandes→medianos→pequeños, recoger power-up 3x, perder las 3 vidas, confirmar que se abre el modal de fin con el score correcto y que "GUARDAR PUNTUACIÓN" escribe en `av_scores`; probar PAUSA/REANUDAR (el juego no avanza mientras pausado); probar FIN (rendirse) con partida en curso; probar SALIR con partida en curso (aparece confirm) y sin partida en curso / ya en gameover (navega directo sin confirm); repasar visualmente los otros 7 juegos en `/juegos/[id]/jugar` para confirmar que siguen con la simulación fake intacta; correr `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores de tipos ni de lint.
- [ ] `/juegos/rocas/jugar` renderiza un `<canvas>` real de 800×600 (escalado dentro del marco CRT existente) en vez de los divs decorativos `.game-arena`.
- [ ] Nave se controla con flechas (rotar) y ↑ (propulsar), dispara con espacio, con el mismo feel del original (drag, inercia, wrap toroidal en los 4 bordes).
- [ ] Asteroides grandes se parten en medianos y estos en pequeños al ser destruidos; puntos otorgados coinciden con `POINTS` original (100/50/20 según tamaño).
- [ ] Power-up de disparo triple aparece según la lógica original (garantizado a los 5 kills sin drop previo, o `POWERUP_DROP_CHANCE` antes) y al recogerlo activa disparo triple por `POWERUP_DURATION` segundos.
- [ ] HUD muestra Puntuación/Vidas/Nivel reales sincronizados con el motor, no la fórmula fake anterior.
- [ ] Al perder la 3ª vida (`lives = 0`), el loop se detiene y se abre automáticamente el modal "FIN DEL JUEGO" existente con el score real.
- [ ] Botón "GUARDAR PUNTUACIÓN" en el modal escribe una entrada correcta en `localStorage["av_scores"]` (mismo formato que spec 01).
- [ ] Botón PAUSA detiene el avance del juego (nave/asteroides/balas quedan congelados) y muestra el overlay "EN PAUSA" existente; REANUDAR continúa exactamente donde quedó.
- [ ] Botón FIN, con partida en curso, termina la partida de inmediato y abre el modal de fin con el score acumulado hasta ese momento.
- [ ] Botón SALIR con partida en curso (`playing`, no pausada, no terminada) muestra `confirm()` antes de navegar; cancelar el confirm mantiene la partida corriendo sin perder estado.
- [ ] Botón SALIR sin partida en curso (pausado, o ya en gameover) navega directo sin mostrar confirm.
- [ ] Desmontar la página (SALIR confirmado, o navegación fuera) detiene el `requestAnimationFrame` y remueve los listeners de teclado — no quedan loops corriendo en background (verificable: sin errores/warnings en consola tras salir y volver a entrar varias veces).
- [ ] Los otros 7 juegos (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) en `/juegos/[id]/jugar` siguen funcionando exactamente igual que antes (simulación fake `setInterval`, HUD, modal de fin), sin regresión visual ni funcional.

## Decisiones tomadas y descartadas

- **Reemplaza `/juegos/rocas/jugar` existente**, no ruta nueva. Motivo: ficha de juego, leaderboard mock y flujo `av_scores` ya apuntan a `rocas` — menor esfuerzo, cero duplicación de UI.
- **Puerto 1:1 de `game.js`**, sin rebalancear ni recortar features (power-up, partículas, invencibilidad). Motivo: juego ya probado y jugable; simplificarlo ahora es riesgo sin beneficio.
- **Lógica separada en `lib/games/rocas/` (engine + hook)**, no inline en `page.tsx`. Motivo: aísla el motor portado de la integración React, deja terreno preparado si se porta otro juego real más adelante.
- **HUD y modal de fin reutilizados tal cual**, sin HUD propio del juego. Motivo: coherencia visual con el resto del sitio, cero UI nueva.
- **Canvas con resolución interna fija 800×600**, escalado por CSS dentro del `.crt-screen` (ya 4:3). Motivo: preserva las coordenadas y el balance exacto del motor original sin tocar matemática; el marco CRT ya encaja en esa proporción.
- **Sin overlay propio de "GAME OVER" en el canvas** (se quita `drawOverlay` de game over). Motivo: el modal HTML existente ya cubre ese caso — dibujarlo también en canvas sería redundante y confuso.
- **FIN = rendirse con score actual**, no se deshabilita. Motivo: mismo comportamiento que tenía el botón en la simulación fake, ahora con datos reales.
- **`confirm()` nativo del navegador para SALIR**, no modal propio. Motivo: menor esfuerzo, decisión explícita del usuario; evita duplicar componente modal solo para este caso.
- **Sin controles táctiles ni canvas responsive real.** Motivo: decisión explícita — alcance acotado a teclado/desktop, mismo dominio que el original standalone; táctil es candidato a spec futuro.
- **Otros 7 juegos quedan sin tocar (fake `setInterval`).** Motivo: portar cada uno es su propio spec — este cubre solo ROCAS.
- **Sin tests automatizados.** Motivo: no hay test runner configurado; verificación manual (jugar partida completa) + `npm run lint`/`build`.

## Riesgos identificados

- **Doble montaje en React StrictMode (dev)**: `useEffect` puede ejecutarse dos veces en desarrollo, duplicando listeners de teclado o instancias del motor si `dispose()`/cleanup no es exhaustivo. Mitigación: cleanup completo en el `return` del `useEffect` (cancela RAF, remueve _todos_ los listeners agregados), probar explícitamente entrando/saliendo de `/juegos/rocas/jugar` varias veces en dev.
- **Re-render excesivo por sincronizar estado cada frame**: si el hook llama `setState` en cada `requestAnimationFrame` (60/s) para score/lives/level, puede generar renders innecesarios de React. Mitigación: solo actualizar el state de React cuando el valor sincronizado cambia respecto al anterior (comparar snapshot antes de `setState`), no en cada frame ciego.
- **Tecla espacio scrollea la página**: `keydown` de `Space` en `window` puede disparar scroll del documento si el foco no está contenido. Mitigación: `preventDefault()` en el handler para las teclas usadas por el juego (`ArrowLeft/Right/Up`, `Space`) mientras la página del juego está montada.
- **Listeners globales interfieren con otros elementos de la página** (inputs del modal de fin, por ejemplo el campo de iniciales). Mitigación: desactivar/ignorar el handler de teclado del juego mientras `over === true` (modal abierto) o `paused === true` según corresponda, para no capturar teclas destinadas al input del modal.
