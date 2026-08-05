# Catálogo de juegos — Arcade Vault

Estado a **2026-08-04**. Fuentes: `lib/data.ts` (catálogo estático), `lib/games/*` (motores), `specs/` y la base de datos Supabase (tablas `games` y `scores`, proyecto `uworqrfrwyjoglantqhi`).

8 juegos en el catálogo: **5 con motor real jugable**, **3 placeholders visuales** (renderizan la animación falsa de `.game-arena`, sin motor).

---

## Resumen

| Id              | Título        | Categoría | Estado         | Motor                      | Spec                                                             | Partidas (DB) | Mejor score (DB) |
| --------------- | ------------- | --------- | -------------- | -------------------------- | ---------------------------------------------------------------- | ------------- | ---------------- |
| `rocas`         | ROCAS         | SHOOTER   | ✅ Real        | `lib/games/rocas/`         | [05](specs/05-rocas-juego-real.md)                               | 1             | 190              |
| `caida`         | CAÍDA         | PUZZLE    | ✅ Real        | `lib/games/caida/`         | [07](specs/07-caida-juego-real.md)                               | 3             | 3 175            |
| `bloque-buster` | BLOQUE BUSTER | ARCADE    | ✅ Real        | `lib/games/bloque-buster/` | [08](specs/08-bloque-buster-juego-real.md)                       | 2             | 70               |
| `serpentina`    | SERPENTINA    | ARCADE    | ✅ Real        | `lib/games/serpentina/`    | [09](specs/09-serpentina-juego-real.md)                          | 1             | 20               |
| `ranaria`       | RANARIA       | ARCADE    | ✅ Real        | `lib/games/ranaria/`       | [game-jam/frogger/01](specs/game-jam/frogger/01-frogger-core.md) | 0             | 0                |
| `gloton`        | GLOTÓN        | ARCADE    | ⬜ Placeholder | —                          | —                                                                | 0             | 0                |
| `invasores`     | INVASORES     | SHOOTER   | ⬜ Placeholder | —                          | —                                                                | 0             | 0                |
| `duelo-pixel`   | DUELO PIXEL   | VERSUS    | ⬜ Placeholder | —                          | —                                                                | 0             | 0                |

> Los campos `best` y `plays` de `lib/data.ts` son **decorativos** (valores inventados del mockup original). Los números reales salen de la tabla `scores` — son los de la tabla de arriba.

---

## Juegos con motor real

### ROCAS (`rocas`) — SHOOTER

- **Origen:** port 1:1 de `references/started-games/02-asteroids/game.js` (Asteroids).
- **Archivos:** `lib/games/rocas/engine.ts` (544 líneas), `useRocasGame.ts`.
- **Mecánica:** nave triangular en vacío toroidal (wrap en los 4 bordes), disparo, asteroides que se parten en fragmentos menores, partículas de explosión, power-up de disparo triple.
- **Controles:** `←` `→` rotar, `↑` propulsar, `Espacio` disparar. **Táctil:** D-pad ←→↑ + botón DISPARAR (ver [Controles táctiles](#controles-táctiles)).
- **Vidas:** 3. **Nivel:** oleada, sube al limpiar la pantalla.
- **Puntos:** 100 / 50 / 20 según tamaño del asteroide (chico vale más).
- **Fuera de alcance:** audio, overlay "GAME OVER" propio del canvas (lo reemplaza el modal del sitio).

### CAÍDA (`caida`) — PUZZLE

- **Origen:** port 1:1 de `references/started-games/03-tetris` (Tetris).
- **Archivos:** `lib/games/caida/engine.ts` (420 líneas), `useCaidaGame.ts`.
- **Mecánica:** grilla 10×20, 8 piezas (I/O/T/S/Z/J/L + "N" tuerca), rotación con wall kicks `[0,-1,1,-2,2]`, pieza fantasma, hard drop. Preview de la siguiente pieza **plegado al mismo canvas** (franja lateral), no hay segundo `<canvas>`.
- **Controles:** `←` `→` mover, `↑` / `X` rotar, `↓` soft drop, `Espacio` hard drop. **Táctil:** D-pad ←→↓↑ (con auto-repeat en ←→↓) + botón CAER (ver [Controles táctiles](#controles-táctiles)).
- **Vidas:** fijas en 1 (concepto ajeno al juego). **Nivel:** `floor(líneas/10)+1`; velocidad `max(100, 1000-(nivel-1)×90)` ms.
- **Puntos:** `LINE_SCORES × nivel`, +2 por celda de hard drop, +1 por fila de soft drop.
- **Nota:** la tecla `P` del original no se portó — la pausa es solo por el botón del HUD.

### BLOQUE BUSTER (`bloque-buster`) — ARCADE

- **Origen:** port 1:1 de `references/started-games/04-arkanoid` (`game.js` + `levels.js`).
- **Archivos:** `lib/games/bloque-buster/engine.ts` (304 líneas), `useBloqueBusterGame.ts`.
- **Mecánica:** paleta + pelota, grid de bloques 10×6, 5 niveles con layouts fijos y multiplicador de velocidad por nivel, colisiones AABB. Render vectorial (rectángulos de color), sin spritesheet.
- **Controles:** `←` `→` mover la paleta, **y mouse** (`mousemove` sobre el canvas, con el mismo escalado del original). **Táctil:** `touchstart`/`touchmove` directo sobre el canvas, mismo escalado que el mouse — sin D-pad (ver [Controles táctiles](#controles-táctiles)).
- **Vidas:** 3, reales. **Nivel:** 1–5; completar el nivel 5 termina la partida (`win` → `gameover`).
- **Puntos:** +10 por bloque.
- **Fuera de alcance:** audio, animación de explosión de bloques, overlay de "saltar a nivel N".

### SERPENTINA (`serpentina`) — ARCADE

- **Origen:** diseñado **desde cero** (no hay código fuente de referencia); solo se reusaron los assets de `references/source-assets/snake-assets/`.
- **Archivos:** `lib/games/serpentina/engine.ts` (258 líneas), `spriteAtlas.ts`, `useSerpentinaGame.ts`.
- **Mecánica:** grilla 40×30 de celdas de 20 px (800×600), la serpiente crece al comer, muere contra la pared o su propia cola. Cada fruta se dibuja con un sprite aleatorio de los 22 de `fruits.png`.
- **Controles:** flechas `↑` `↓` `←` `→`. **Táctil:** D-pad de 4 direcciones, sin botón de acción (ver [Controles táctiles](#controles-táctiles)).
- **Vidas:** fijas en 1. **Nivel:** `floor(frutas/5)+1`; el tick baja de 140 ms a un mínimo de 60 ms, 8 ms por nivel.
- **Puntos:** +10 por fruta.

### RANARIA (`ranaria`) — ARCADE

- **Origen:** diseñado **desde cero** (spec [game-jam/frogger/01-frogger-core](specs/game-jam/frogger/01-frogger-core.md) generado por el subagente `game-jam`, adaptado en implementación a las convenciones del repo — canvas 800×600 en vez de 640×560, `lib/games/ranaria/` en vez de un componente/ruta propios, id `ranaria` reutilizando el placeholder existente en vez del `frogger` nuevo que pedía el spec original).
- **Archivos:** `lib/games/ranaria/engine.ts`, `useRanariaGame.ts`.
- **Mecánica:** grilla 20×15 de celdas de 40 px; rana salta 1 celda (120 ms de animación) entre zona segura, carretera (6 carriles de coches/camiones) y río (6 carriles de troncos/tortugas, estas últimas con ciclo de inmersión); 5 bocas destino arriba, hay que llenarlas todas para completar la ronda; contrarreloj por ronda.
- **Controles:** flechas `↑` `↓` `←` `→`. **Táctil:** D-pad de 4 direcciones, sin botón de acción — igual patrón que `serpentina` (agregado en corrida posterior de `mobile-porter`, ver [Controles táctiles](#controles-táctiles)).
- **Vidas:** 3, reales. **Nivel:** sube al completar una ronda (5 bocas llenas); velocidad de carriles y tiempo de ronda escalan con el nivel.
- **Puntos:** +10 por celda de avance nueva en la ronda, +50 y bonus de tiempo por boca ocupada, +200 por ronda completa.
- **Fuera de alcance:** sprites bitmap, animaciones de muerte, power-ups.

---

## Placeholders (sin motor)

Estos 3 ids existen en `lib/data.ts` y en la tabla `games`, tienen ficha, cover CSS y leaderboard funcional, pero `/juegos/<id>/jugar` cae en `NULL_ENGINE` y muestra la animación decorativa en vez de un `<canvas>`.

| Id            | Título      | Categoría | Concepto                                                                  | Candidato a portar desde |
| ------------- | ----------- | --------- | ------------------------------------------------------------------------- | ------------------------ |
| `gloton`      | GLOTÓN      | ARCADE    | Pac-Man: laberinto, puntos, 4 fantasmas, píldora que invierte los papeles | desde cero               |
| `invasores`   | INVASORES   | SHOOTER   | Space Invaders: oleadas en formación, cañón horizontal                    | desde cero               |
| `duelo-pixel` | DUELO PIXEL | VERSUS    | Pong: 1 vs CPU o local a dos jugadores                                    | desde cero               |

Para portar cualquiera: `/add-game <juego>` genera el spec, después `/spec-impl NN-<slug>`.

---

## Pipeline de candidatos (game-planner)

Tanda de 20 propuestas del subagente `game-planner`, generadas 2026-07-31 en rondas secuenciales. **Ninguna aceptada, descartada ni implementada** — están en estado `propuesto` en `.claude/agents/game-planner/memoria.md` (fuente completa, con el razonamiento de cada ronda). 4 reutilizan un placeholder existente (sin migración); 16 son id nuevo (requieren fila en `games` + entrada en `GAMES` + clase `cover-*`).

| #   | Juego                        | Id propuesto  | Categoría | Tipo        | Controles                              |
| --- | ---------------------------- | ------------- | --------- | ----------- | -------------------------------------- |
| 1   | Pong                         | `duelo-pixel` | VERSUS    | placeholder | `↑` `↓` paleta                         |
| 2   | Space Invaders               | `invasores`   | SHOOTER   | placeholder | `←` `→` mover, `Espacio` disparar      |
| 3   | Frogger                      | `ranaria`     | ARCADE    | placeholder | flechas                                |
| 4   | Pac-Man                      | `gloton`      | ARCADE    | placeholder | flechas                                |
| 5   | 2048                         | `fusion`      | PUZZLE    | id nuevo    | flechas                                |
| 6   | Tron (motos de luz)          | `estela`      | VERSUS    | id nuevo    | flechas (+ WASD si 2P local)           |
| 7   | Missile Command              | `impacto`     | SHOOTER   | id nuevo    | mouse                                  |
| 8   | Simón (secuencia)            | `secuencia`   | PUZZLE    | id nuevo    | mouse + fallback flechas               |
| 9   | Boxeo                        | `nocaut`      | VERSUS    | id nuevo    | teclado (golpe alto/bajo, bloqueo)     |
| 10  | Memorice (parejas)           | `parejas`     | PUZZLE    | id nuevo    | mouse                                  |
| 11  | Galería (caza de patos)      | `galeria`     | SHOOTER   | id nuevo    | mouse                                  |
| 12  | Conecta 4                    | `conecta4`    | VERSUS    | id nuevo    | mouse + fallback flechas               |
| 13  | Whack-a-mole (Topos)         | `topos`       | ARCADE    | id nuevo    | mouse                                  |
| 14  | Buscaminas                   | `minas`       | PUZZLE    | id nuevo    | mouse (clic izq. revela, der. bandera) |
| 15  | Flappy Bird (estilo)         | `vuelo`       | ARCADE    | id nuevo    | `Espacio` o clic                       |
| 16  | Tres en raya (Gato)          | `gato`        | VERSUS    | id nuevo    | mouse + fallback flechas               |
| 17  | Ahorcado                     | `verdugo`     | PUZZLE    | id nuevo    | teclado A-Z                            |
| 18  | Mastermind (código secreto)  | `codigo`      | PUZZLE    | id nuevo    | mouse + fallback teclado 1–6           |
| 19  | Nim (juego de fichas)        | `montones`    | VERSUS    | id nuevo    | mouse + fallback flechas               |
| 20  | Lights Out (Apaga las luces) | `apagon`      | PUZZLE    | id nuevo    | mouse                                  |

Catálogo proyectado si se implementaran las 20: ARCADE 6, PUZZLE 8, SHOOTER 4, VERSUS 6 (24 juegos totales).

Cola de respaldo en `considerado` (no elegidos, por si se necesita reemplazar alguno de los 20): Solitario (Klondike), Reversi, Buscapalabras, Match-3, Combate de tanques, Q\*bert, Centipede, Damas.

Antes de pedir una ronda 21, el propio agente recomienda revisar/aceptar/implementar algunos de estos 20 — empezando por los de menor esfuerzo (`verdugo`, `codigo`, `montones`, `apagon`, `vuelo`) y por los cuatro placeholders sin migración.

---

## Contrato compartido

Todo juego real expone el mismo hook (`UseGameEngineResult`) y se registra en `REAL_GAME_ENGINES` dentro de `app/juegos/[id]/jugar/page.tsx`:

```ts
export interface UseGameEngineResult {
  canvasRef: (node: HTMLCanvasElement | null) => void;
  score: number;
  lives: number;
  level: number;
  state: "playing" | "dead" | "gameover";
  paused: boolean;
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
  dispose: () => void;
}
```

Comunes a los cinco: canvas único a resolución nativa escalado por CSS dentro de `.crt-screen`; HUD (Puntuación / Vidas / Nivel) y botones PAUSA / FIN / SALIR compartidos; input ignorado mientras está pausado o con el modal de fin abierto; sin audio; **controles táctiles** en dispositivos `pointer: coarse` (ver abajo); el score se guarda con `saveScore()` en la tabla `scores` de Supabase.

---

## Controles táctiles

Spec [11](specs/11-controles-tactiles.md) — soporte táctil en los 5 motores reales, visible solo en dispositivos `pointer: coarse` (media query), sin cambios de gameplay ni layout más allá de CSS mínimo. `ranaria` quedó fuera del spec original de Frogger ([game-jam/frogger/01](specs/game-jam/frogger/01-frogger-core.md)) y se cerró en una corrida posterior de `mobile-porter` que detectó el juego era layout-responsive pero inoperable en teléfono real sin teclado.

- `lib/games/touchInput.ts` — `useIsTouchDevice()` (SSR-safe), `dispatchKey(code, type)` (despacha `KeyboardEvent` sintético en `window`, reusa los listeners de teclado ya existentes en cada hook) y las configs `ROCAS_TOUCH_CONFIG` / `CAIDA_TOUCH_CONFIG` / `SERPENTINA_TOUCH_CONFIG` / `RANARIA_TOUCH_CONFIG`.
- `components/game/TouchControls.tsx` — D-pad + botones de acción, renderizado debajo del `.crt` (bezel completo) en `app/juegos/[id]/jugar/page.tsx`, condicionado a `useIsTouchDevice() && id ∈ {rocas, caida, serpentina, ranaria}`.
- `bloque-buster` no usa D-pad: `useBloqueBusterGame.ts` agrega `touchstart`/`touchmove` directo sobre el canvas, reusando `engine.handleMouseMove` con el `clientX` del touch (mismo escalado que el mouse).
- Auto-repeat (interval ~120 ms) solo en `caida` (`repeat: true`), y solo en los botones del D-pad — los botones de acción (`DISPARAR`, `CAER`) nunca auto-repiten aunque el config lo tenga activo, para evitar un hard-drop repetido mientras se mantiene presionado.
- CSS: `touch-action: none` en el canvas y en los controles, todo bajo `@media (pointer: coarse)` en `app/globals.css`.

---

## Estado de la base de datos

`games` — 8 filas (`id`, `title`), una por juego del catálogo, incluidos los placeholders.

`scores` — 7 filas al 2026-07-29:

| Juego           | Jugador | Score | Fecha      |
| --------------- | ------- | ----- | ---------- |
| `caida`         | SOS     | 3 175 | 27/07/2026 |
| `caida`         | ALEX    | 211   | 27/07/2026 |
| `caida`         | JOHN    | 22    | 27/07/2026 |
| `rocas`         | JO      | 190   | 26/07/2026 |
| `bloque-buster` | JOHN    | 70    | 28/07/2026 |
| `bloque-buster` | FOD     | 60    | 28/07/2026 |
| `serpentina`    | JOHN    | 20    | 28/07/2026 |

Todos los scores son de playtests de desarrollo. RLS activo en las dos tablas, con políticas de lectura pública.
