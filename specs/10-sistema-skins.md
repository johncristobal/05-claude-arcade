# 10 — Sistema de skins

## Header

- **Estado:** Approved (implementado incrementalmente por el subagente `skin-designer` a lo largo de varias corridas — este documento es un registro de arquitectura, no un plan pendiente).
- **Dependencias:** `05-rocas-juego-real.md`, `07-caida-juego-real.md`, `08-bloque-buster-juego-real.md`, `09-serpentina-juego-real.md` (todos Implementado), `specs/game-jam/frogger/01-frogger-core.md` (RANARIA, Implementado) — motores reales que ya recibieron skins. Sin dependencia funcional de otros specs.
- **Fecha:** 2026-08-01 (primera corrida: arquitectura compartida + ROCAS). Actualizado 2026-08-01 (SERPENTINA y BLOQUE BUSTER, cada una en su propia sesión de agente). Actualizado 2026-08-04 (CAÍDA, RANARIA y los 3 placeholders restantes — catálogo completo).
- **Objetivo:** Dar a cada juego del catálogo ≥3 skins seleccionables (`neon`, `retro`, `clasico`) que lean bien contra el fondo permanentemente oscuro del sitio. `clasico` reproduce el look actual — es el default, nadie que no elija otra cosa nota un cambio visual. La arquitectura compartida se definió en la primera corrida junto con su primer consumidor real, **ROCAS** (`rocas`); corridas siguientes sumaron **SERPENTINA** (`serpentina`) y **BLOQUE BUSTER** (`bloque-buster`, arkanoid); la corrida de 2026-08-04 cierra el catálogo con **CAÍDA** (`caida`), **RANARIA** (`ranaria`, motor real agregado por `game-jam`/implementación manual entre corridas anteriores) y variantes CSS de cover para los 3 placeholders restantes (`gloton`, `invasores`, `duelo-pixel`) — los 8 juegos del catálogo cumplen el mínimo de 3 skins.

## Scope

**Incluido a lo largo de las corridas cubiertas por este documento:**

- Módulo compartido `lib/games/skins.ts`: tipo `SkinId`, catálogo `SKIN_IDS`/`SKIN_LABELS`, `DEFAULT_SKIN = "clasico"`, hook `useSkinPreference()` que persiste en `localStorage` bajo `av_skin` (mismo patrón SSR-safe que `av_user` en `components/AuthProvider.tsx`: `useSyncExternalStore` + override local para reactividad en la misma pestaña). Definido en la primera corrida (ROCAS), reutilizado tal cual por los motores siguientes.
- Tabla de paleta por skin dentro de `lib/games/rocas/engine.ts` (`ROCAS_PALETTES`), reemplazando los literales de color hardcodeados (`"#fff"`, `"#0ff"`, `"rgba(255,130,0,0.85)"`, etc.) en `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` y el fondo del `draw()` principal.
- Método `RocasEngine.setSkin(skin: SkinId)` — cambia la paleta activa en caliente, sin recrear el canvas ni la partida en curso.
- `useRocasGame(skin: SkinId = DEFAULT_SKIN)` — el hook acepta el skin activo como parámetro reactivo y lo empuja al motor vía `setSkin()` en un `useEffect` cuando cambia. La forma de `UseRocasGameResult` (idéntica a `UseGameEngineResult`, contrato canónico de `useCaidaGame.ts`) no cambió — solo se agregó el parámetro de entrada de la función, no un campo nuevo al objeto devuelto.
- Tabla de paleta por skin dentro de `lib/games/serpentina/engine.ts` (`SERPENTINA_PALETTES`), reemplazando los literales de color hardcodeados del fondo, la grilla, la cabeza/cuerpo de la serpiente y la fruta de respaldo (el sprite de `fruits.png` en sí no cambia por skin). Método `SerpentinaEngine.setSkin(skin: SkinId)` con el mismo contrato: solo reasigna la paleta activa, sin tocar el estado de la partida.
- `useSerpentinaGame(skin: SkinId = DEFAULT_SKIN)` — mismo patrón que `useRocasGame`: parámetro reactivo, `useEffect([skin])` que llama `engine.setSkin()`, sin remount del canvas. La forma de `UseGameEngineResult` no cambió.
- Tabla de paleta por skin dentro de `lib/games/bloque-buster/engine.ts` (`BLOQUE_BUSTER_PALETTES`). A diferencia de `rocas`/`serpentina`, el port original (`levels.js`) ya etiquetaba cada bloque de los 5 layouts fijos (`l1..l5`) con una de 7 claves de color "lógicas" (`red`/`yellow`/`cyan`/`magenta`/`hotpink`/`green`/`gray`, tipo `BlockColorKey`) en vez de un color final — la paleta remapea esas claves a un color CSS concreto por skin, sin tocar los layouts. También cubre `background`, `paddle` y `ball`. Método `BloqueBusterEngine.setSkin(skin: SkinId)` con el mismo contrato: solo reasigna la paleta activa.
- `useBloqueBusterGame(skin: SkinId = DEFAULT_SKIN)` — mismo patrón que `useRocasGame`/`useSerpentinaGame`: parámetro reactivo, `useEffect([skin])` que llama `engine.setSkin()`, sin remount del canvas ni pérdida del control por mouse (`handleMouseMove` no se ve afectado). La forma de `UseGameEngineResult` no cambió.
- Tabla de paleta por skin dentro de `lib/games/caida/engine.ts` (`CAIDA_PALETTES`), reemplazando la tabla `COLORS` fija (índice de tipo de pieza → color) y el `GRID_LINE`/fondo hardcodeados. Método `CaidaEngine.setSkin(skin: SkinId)` con el mismo contrato: solo reasigna la paleta activa, sin tocar el tablero ni la pieza en curso.
- `useCaidaGame(skin: SkinId = DEFAULT_SKIN)` — mismo patrón que los motores anteriores: parámetro reactivo, `useEffect([skin])` que llama `engine.setSkin()`, sin remount del canvas. La forma de `UseGameEngineResult` (contrato canónico) no cambió.
- Tabla de paleta por skin dentro de `lib/games/ranaria/engine.ts` (`RANARIA_PALETTES`), reemplazando los literales de color de las 6 zonas de fondo (meta/río/segura/calle/salida), la caja de meta, vehículos (auto/camión), flotadores de río (tronco/tortuga), la rana y el HUD (incluida la barra de tiempo con 3 umbrales). Método `RanariaEngine.setSkin(skin: SkinId)` con el mismo contrato.
- `useRanariaGame(skin: SkinId = DEFAULT_SKIN)` — mismo patrón reactivo, sin remount del canvas ni pérdida de la ronda en curso.
- Selector de skin (3 botones `CLÁSICO`/`NEÓN`/`RETRO`) en `app/juegos/[id]/jugar/page.tsx`, dentro de `.player-hud`. Desde la corrida de 2026-08-04 la condición de visibilidad se simplificó de una lista de ids (`game.id === "rocas" || ...`) a `isReal` (ya calculado en el componente como `!!engine`) — con los 5 motores reales soportando `setSkin`, listar cada id a mano ya no aportaba nada y quedaba desactualizado cada vez que un motor nuevo sumaba soporte. Usa `useSkinPreference()` para leer/escribir la preferencia compartida.
- Clases CSS `.skin-selector` / `.skin-btn` (+ `.skin-btn.active`) en `app/globals.css`, junto a `.hud-actions`. Genéricas, sin variantes por juego — no se tocaron en esta corrida.
- Placeholders (`gloton`, `invasores`, `duelo-pixel`): clases `.cover-<id>--neon` / `.cover-<id>--retro` en `app/globals.css`, agregadas junto a la clase base `.cover-<id>` existente (que sigue representando `clasico`, sin modificador). `coverClassFor(gameId, baseCover, skin)` en `lib/games/skins.ts` decide si agrega el sufijo (solo para ids en `PLACEHOLDER_GAME_IDS` y solo si `skin !== "clasico"`). Nuevo componente cliente compartido `components/game/CoverBg.tsx` (lee `useSkinPreference()` y aplica `coverClassFor()`) reemplaza el `<div className={"cover-bg " + game.cover}>` inline que había en `components/GameCard.tsx`, `components/GameCardMini.tsx` y `app/juegos/[id]/page.tsx` — este último es server component (detalle del juego, awaits Supabase) y no puede leer `localStorage` directamente, de ahí la necesidad de extraer un componente cliente en vez de inline el hook ahí.

**Fuera de alcance de esta corrida (2026-08-04):**

- Cualquier cambio a `lib/supabase/**` o `components/AuthProvider.tsx` (fuera de reglas del agente, todas las corridas).
- `ranaria` no es placeholder desde que recibió motor real (ver `JUEGOS.md`) — no tiene ni necesita `.cover-rana--<skin>`; su skin vive enteramente en `lib/games/ranaria/engine.ts` como los otros 4 motores reales. `PLACEHOLDER_GAME_IDS` en `lib/games/skins.ts` ya no lo incluye.

## Arquitectura compartida

### `SkinId` y storage

```ts
// lib/games/skins.ts
export type SkinId = "clasico" | "neon" | "retro";
export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];
export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};
export const DEFAULT_SKIN: SkinId = "clasico";

export function useSkinPreference(): [SkinId, (skin: SkinId) => void];
```

`useSkinPreference` persiste en `localStorage["av_skin"]`. Snapshot de servidor devuelve siempre `DEFAULT_SKIN` (sin tocar `localStorage` durante SSR) para evitar mismatches de hidratación — mismo patrón que `useAuth()`/`av_user`. Un `override` de estado local hace que el cambio de skin sea instantáneo en la misma pestaña (el evento nativo `"storage"` no dispara en el documento que hizo el `setItem`).

### Contrato por motor

Cada motor real mantiene **su propia tabla de paleta**, sin forma común forzada — las necesidades de color varían demasiado entre juegos (7 colores de pieza en `caida` vs. la paleta casi monocromática de `rocas`). El único acuerdo compartido es:

1. El motor expone `setSkin(skin: SkinId): void`, que solo reemplaza la paleta activa (un campo `private palette` recalculado desde una tabla `Record<SkinId, TPalette>`) — nunca reinicia el estado de la partida.
2. El `use<Game>Game.ts` correspondiente acepta el skin activo como parámetro de función (reactivo, no solo "valor inicial") y sincroniza el motor con un `useEffect([skin])`. Esto evita remount del `<canvas>` al cambiar de skin.
3. La forma de `UseGameEngineResult` no cambia — el skin es un parámetro de entrada del hook, no un campo nuevo del objeto que devuelve.

### Paleta de ROCAS (`lib/games/rocas/engine.ts`)

```ts
export interface RocasPalette {
  background: string;
  ship: string;
  shipThrust: string; // triplete "R, G, B" (se combina con alpha)
  asteroid: string;
  bullet: string;
  particle: string; // triplete "R, G, B"
  powerup: string;
  glow: boolean; // aplica shadowBlur/shadowColor extra en cada draw()
}
```

| Skin      | Fondo     | Nave      | Asteroides | Balas     | Power-up  | Partículas/llama | Estilo                                                             |
| --------- | --------- | --------- | ---------- | --------- | --------- | ---------------- | ------------------------------------------------------------------ |
| `clasico` | `#000`    | `#fff`    | `#fff`     | `#fff`    | `#0ff`    | blanco / naranja | Vectorial blanco sobre negro — look original del port, sin glow.   |
| `neon`    | `#050014` | `#ff2bd6` | `#00f5ff`  | `#f5ff00` | `#f5ff00` | cian             | Paleta del sitio (`--cyan`/`--magenta`/`--yellow`) + `shadowBlur`. |
| `retro`   | `#0a0600` | `#ffb000` | `#ffb000`  | `#ffb000` | `#ffb000` | ámbar            | Monocromático ámbar, fósforo de terminal CRT vieja, sin glow.      |

`setSkin()` solo reasigna `this.palette = ROCAS_PALETTES[skin]`; el `draw()` de cada entidad (`Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`) recibe la paleta activa como parámetro en vez de usar literales de color hardcodeados.

### Paleta de SERPENTINA (`lib/games/serpentina/engine.ts`)

```ts
export interface SerpentinaPalette {
  background: string;
  grid: string;
  snakeHead: string;
  snakeBody: string;
  fruitFallback: string; // solo se usa mientras fruits.png no cargó
  glow: boolean;
}
```

| Skin      | Fondo     | Grilla                   | Cabeza    | Cuerpo    | Fruta (fallback) | Estilo                                                                             |
| --------- | --------- | ------------------------ | --------- | --------- | ---------------- | ---------------------------------------------------------------------------------- |
| `clasico` | `#0a0a0a` | `rgba(255,255,255,0.05)` | `#39ff14` | `#1fa825` | `#ff2d55`        | Look original del port — verde neón sobre casi negro, sin glow.                    |
| `neon`    | `#050014` | `rgba(0,245,255,0.08)`   | `#f5ff00` | `#00f5ff` | `#ff2bd6`        | Paleta del sitio (`--cyan`/`--magenta`/`--yellow`) + `shadowBlur` en la serpiente. |
| `retro`   | `#0f1a0a` | `rgba(140,255,120,0.07)` | `#c8ffb0` | `#4a9c3a` | `#8fff6b`        | Monocromático verde fósforo, estilo pantalla LCD de Snake en Nokia, sin glow.      |

`setSkin()` solo reasigna `this.palette = SERPENTINA_PALETTES[skin]`; el sprite de fruta (`fruits.png`, vía `spriteAtlas.ts`) no cambia por skin — solo el fondo, la grilla, la serpiente y el cuadrado de respaldo que se dibuja mientras la imagen de frutas no terminó de cargar.

### Paleta de BLOQUE BUSTER (`lib/games/bloque-buster/engine.ts`)

```ts
export type BlockColorKey =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

export interface BloqueBusterPalette {
  background: string;
  paddle: string;
  ball: string;
  blockColors: Record<BlockColorKey, string>;
  glow: boolean;
}
```

Los 5 layouts fijos del port original (`levels.js` → `l1..l5`) ya venían con cada bloque etiquetado con una de estas 7 claves lógicas (p. ej. la fila 0 de `l1` es toda `"red"`, la pirámide de `l2` mezcla `"gray"`/`"cyan"`/`"hotpink"`/…). En vez de tocar esos layouts, `BLOQUE_BUSTER_PALETTES[skin].blockColors[key]` traduce cada clave al color final que se dibuja — el layout no sabe de skins, solo de claves.

| Skin      | Fondo     | Bloques (`blockColors`, clave → color)                                                                     | Paddle    | Ball      | Estilo                                                                           |
| --------- | --------- | ---------------------------------------------------------------------------------------------------------- | --------- | --------- | -------------------------------------------------------------------------------- |
| `clasico` | `#000`    | `red→red, yellow→yellow, cyan→cyan, magenta→magenta, hotpink→hotpink, green→green, gray→gray` (identidad)  | `#fff`    | `#fff`    | Look original del port — colores CSS nombrados planos, sin glow.                 |
| `neon`    | `#050014` | `red→#ff2bd6, yellow→#f5ff00, cyan→#00f5ff, magenta→#b026ff, hotpink→#ff006e, green→#00ff88, gray→#5ce1ff` | `#f5ff00` | `#00f5ff` | Paleta del sitio + violeta/celeste eléctrico de relleno, con `shadowBlur`.       |
| `retro`   | `#0a0600` | `red→#7a4d00, yellow→#ffcf66, cyan→#b37400, magenta→#ffb000, hotpink→#fff2cc, green→#8f5c00, gray→#4d3300` | `#ffb000` | `#fff2cc` | Monocromático ámbar en distintas luminosidades — fósforo de CRT vieja, sin glow. |

`setSkin()` solo reasigna `this.palette = BLOQUE_BUSTER_PALETTES[skin]`; `draw()` aplica `ctx.shadowBlur`/`ctx.shadowColor` por bloque/paleta/paddle solo cuando `palette.glow === true` (guardado y restaurado con `ctx.save()`/`ctx.restore()` alrededor de todo el frame).

### Paleta de CAÍDA (`lib/games/caida/engine.ts`)

```ts
export interface CaidaPalette {
  background: string;
  grid: string;
  pieces: string[]; // 8 entradas, índice 0..7 = tipo de pieza 1..8 (I,O,T,S,Z,J,L,N)
  blockHighlight: string; // franja superior de cada bloque (efecto 3D)
  glow: boolean;
}
```

| Skin      | Fondo     | Grilla                   | Piezas                                                       | Estilo                                                                                                                                                          |
| --------- | --------- | ------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clasico` | `#000`    | `rgba(255,255,255,0.08)` | 8 colores pastel originales (cyan/yellow/purple/green/red/…) | Look original del port, sin glow.                                                                                                                               |
| `neon`    | `#050014` | `rgba(0,245,255,0.08)`   | paleta del sitio + violeta/naranja eléctricos                | Multicolor saturado + `shadowBlur` por bloque.                                                                                                                  |
| `retro`   | `#0f380f` | `rgba(155,188,15,0.10)`  | 3 tonos de la paleta DMG de 4 colores del Game Boy original  | Monocromático verde oliva — Tetris es indisociable de esa pantalla, distinto del ámbar VT100 de ROCAS/BLOQUE BUSTER o el fósforo verde brillante de SERPENTINA. |

`setSkin()` solo reasigna `this.palette = CAIDA_PALETTES[skin]`; `pieceColor(colorIndex)` centraliza el lookup `palette.pieces[colorIndex - 1]` usado por `drawBlock()`/`drawBlockAt()` (tablero, pieza activa, fantasma y preview "siguiente" comparten la misma paleta).

### Paleta de RANARIA (`lib/games/ranaria/engine.ts`)

```ts
export interface RanariaPalette {
  zoneDefault: string;
  zoneGoal: string;
  zoneRiver: string;
  zoneSafe: string;
  zoneRoad: string;
  zoneStart: string;
  goalBox: string;
  goalBorder: string;
  goalFilled: string;
  car: string;
  carAccent: string;
  truck: string;
  truckAccent: string;
  log: string;
  logAccent: string;
  turtle: string;
  turtleSubmerged: string;
  frog: string;
  frogAccent: string;
  hud: string;
  timerGood: string;
  timerWarn: string;
  timerBad: string;
  glow: boolean;
}
```

| Skin      | Referencia                                      | Río                                             | Fondo/calle   | Rana      | Estilo                                                                                                       |
| --------- | ----------------------------------------------- | ----------------------------------------------- | ------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `clasico` | Look original del port (sin referencia externa) | azul oscuro `#031a2e`                           | casi negro    | `#39ff14` | Zonas oscuras casi monocromáticas, vehículos/río en colores planos, sin glow.                                |
| `neon`    | Paleta del sitio                                | `#00121f` con flotadores en verde/amarillo neón | violeta/negro | `#00f5ff` | Multicolor saturado (magenta/violeta/cian) + `shadowBlur` en meta/rana/vehículos.                            |
| `retro`   | Arcade Frogger 1981                             | azul saturado `#0000aa`                         | negro puro    | `#00ff00` | Primarios planos sin glow — auto rojo, camión naranja, tronco marrón, exactamente como el gabinete original. |

`setSkin()` solo reasigna `this.palette = RANARIA_PALETTES[skin]`; cubre las 6 zonas de fondo, la caja/borde/relleno de cada boca de meta, autos/camiones, troncos/tortugas (incluida la variante sumergida), la rana y el HUD (texto, corazones de vida, barra de tiempo con umbral bueno/alerta/crítico).

### Placeholders (`gloton`, `invasores`, `duelo-pixel`)

A diferencia de los motores reales, un placeholder no tiene canvas — su "skin" es una variante CSS de la cover decorativa (`.cover-<id>`, ya usada en las cards de biblioteca/home, el mini-card de home y el hero de la página de detalle). En vez de triplicar cada gradiente/pseudo-elemento por skin, `.cover-<id>--neon` y `.cover-<id>--retro` aplican un `filter` CSS compuesto sobre el `.cover-bg` completo — el filtro se renderiza sobre el composite del elemento (incluye `::before`/`::after`), así que reskinea toda la cover sin tocar sus gradientes internos:

```css
.cover-glot--neon,
.cover-invaders--neon,
.cover-duelo--neon {
  filter: saturate(1.6) brightness(1.15)
    drop-shadow(0 0 14px rgba(0, 245, 255, 0.35));
}
.cover-glot--retro,
.cover-invaders--retro,
.cover-duelo--retro {
  filter: grayscale(0.4) sepia(0.6) saturate(2) hue-rotate(-14deg)
    brightness(0.92) contrast(1.05);
}
```

`clasico` es la clase base sin modificador (cero cambio visual, es el default). `coverClassFor(gameId, baseCover, skin)` (`lib/games/skins.ts`) decide el sufijo: solo para ids en `PLACEHOLDER_GAME_IDS` (`gloton`, `invasores`, `duelo-pixel`) y solo si `skin !== "clasico"` — para cualquier otro id (motor real) devuelve la clase base sin tocar. El nuevo componente cliente `components/game/CoverBg.tsx` centraliza `useSkinPreference()` + `coverClassFor()` y reemplaza el `<div className={"cover-bg " + game.cover}>` que estaba repetido en `GameCard.tsx`, `GameCardMini.tsx` y la página de detalle — esta última es server component, por lo que necesitaba un componente cliente separado para poder leer la preferencia de skin sin convertir toda la página en cliente.

### Selector en el shell del jugador

`app/juegos/[id]/jugar/page.tsx`:

```tsx
const [skin, setSkin] = useSkinPreference();
const rocas = useRocasGame(skin);
const caida = useCaidaGame(skin);
const bloqueBuster = useBloqueBusterGame(skin);
const serpentina = useSerpentinaGame(skin);
const ranaria = useRanariaGame(skin);
```

El selector (`.skin-selector` con 3 `.skin-btn`) vive dentro de `.player-hud`, junto a `.hud-actions`. Hasta la corrida de BLOQUE BUSTER se renderizaba con una condición explícita por id (`game.id === "rocas" || game.id === "serpentina" || game.id === "bloque-buster"`); desde la corrida de 2026-08-04 (con los 5 motores reales soportando `setSkin`) se simplificó a `isReal` — la misma bandera que el shell ya calculaba (`!!engine`, `engine` viene de `REAL_GAME_ENGINES[game.id]`) para decidir si mostrar el `<canvas>` o el `.game-arena` decorativo. Evita que la condición del selector quede desactualizada cada vez que un motor nuevo suma soporte de skins. El resto de la lectura de `engine.*` sigue el patrón de destructuring único documentado en `CLAUDE.md` — no se tocó esa parte del archivo.

## Estado final de los 8 juegos

| Juego (`id`)    | Motor       | Skins implementados                                 | Estado     |
| --------------- | ----------- | --------------------------------------------------- | ---------- |
| `rocas`         | Real        | `clasico`, `neon`, `retro`                          | **cumple** |
| `caida`         | Real        | `clasico`, `neon`, `retro`                          | **cumple** |
| `bloque-buster` | Real        | `clasico`, `neon`, `retro`                          | **cumple** |
| `serpentina`    | Real        | `clasico`, `neon`, `retro`                          | **cumple** |
| `ranaria`       | Real        | `clasico`, `neon`, `retro`                          | **cumple** |
| `gloton`        | Placeholder | `clasico`, `neon`, `retro` (variantes CSS de cover) | **cumple** |
| `invasores`     | Placeholder | `clasico`, `neon`, `retro` (variantes CSS de cover) | **cumple** |
| `duelo-pixel`   | Placeholder | `clasico`, `neon`, `retro` (variantes CSS de cover) | **cumple** |

Los 8 juegos del catálogo cumplen el mínimo de 3 skins. `ranaria` pasó de placeholder a motor real (`specs/game-jam/frogger/01-frogger-core.md`) antes de esta corrida, así que la tabla queda con 5 motores reales y 3 placeholders en vez de los 4+4 originales.

## Decisiones tomadas y descartadas

- **Alcance acotado por corrida, no a los 8 juegos de una vez.** Cada corrida atacó el motor que pidió explícitamente el usuario (asteroides → `rocas`; snake → `serpentina`; arkanoid → `bloque-buster`) y dejó el resto tal como estaba, documentado como `pendiente` en la memoria del agente para una corrida futura, sin reauditar lo ya hecho salvo evidencia de cambio.
- **BLOQUE BUSTER: la paleta remapea claves lógicas de color (`BlockColorKey`), no colores finales por bloque.** Motivo: el port original (`levels.js`) ya generaba los 5 layouts fijos asignando una de 7 etiquetas de color a cada bloque (`red`/`yellow`/`cyan`/`magenta`/`hotpink`/`green`/`gray`); en vez de reescribir esos layouts con literales de color por skin, `BLOQUE_BUSTER_PALETTES[skin].blockColors[key]` hace la traducción en el `draw()`. Evita triplicar los 5 layouts (uno por skin) y mantiene el patrón "layout describe estructura, paleta describe color" separado.
- **BLOQUE BUSTER: `clasico` usa un mapeo identidad (`red→"red"`, `yellow→"yellow"`, etc.)** — los mismos nombres de color CSS planos que usaba el port original antes de existir el sistema de skins, para que el look por defecto sea pixel-idéntico al actual sin tener que duplicar la lista de colores.
- **`setSkin()` como parámetro reactivo del hook, no un campo nuevo en el objeto devuelto.** Motivo: minimiza el riesgo de romper el contrato `UseGameEngineResult` — el shell (`page.tsx`) sigue destructurando `engine` una sola vez, sin campos condicionales por juego.
- **Selector condicionado por `game.id`, un `||` por motor que ya tiene `setSkin`.** Motivo: en la primera corrida el selector se mostraba solo para `game.id === "rocas"` (único motor con soporte); cada corrida posterior (SERPENTINA, BLOQUE BUSTER) sumó su propio `game.id` a esa condición en vez de inventar un mecanismo distinto — evita mostrar un control roto para motores sin `setSkin` todavía.
- **`retro` = monocromático ámbar (fósforo de CRT vieja)**, no una paleta con más de un color. Motivo: diferenciarlo claramente de `neon` (multicolor con glow) y de `clasico` (blanco vectorial sin color); el ámbar monocromático es un lenguaje retro reconocible (terminales VT100/Apple II) distinto de ambos.
- **SERPENTINA: `retro` = monocromático verde fósforo (LCD de Snake tipo Nokia)**, no ámbar como ROCAS. Motivo: cada motor elige su propio lenguaje "retro" coherente con su propia referencia histórica — Snake es indisociable del LCD verde de los teléfonos de los 2000, mientras que ROCAS (Asteroids) referencia terminales VT100/Apple II en ámbar. Mantiene los 3 skins de cada juego visualmente distintos entre sí sin forzar una paleta "retro" única para todo el catálogo.
- **`glow` como flag en la paleta**, no una propiedad calculada por skin id en cada `draw()`. Motivo: mantiene el `draw()` de cada entidad agnóstico del id de skin — solo lee campos de la paleta activa. En SERPENTINA se aplica en un único `ctx.save()`/`ctx.restore()` alrededor del `forEach` de segmentos (no por segmento) porque la serpiente es una lista homogénea de rectángulos, no entidades con su propio método `draw()`.
- **Sin tocar `lib/supabase/**` ni `components/AuthProvider.tsx`.** Motivo: regla dura del agente — las skins son un tema visual, no de datos ni de sesión.
- **CAÍDA: `retro` = paleta DMG de 4 tonos del Game Boy original**, no ámbar ni verde fósforo. Motivo: mismo criterio que SERPENTINA (cada motor elige su propia referencia retro coherente) — Tetris es indisociable del Game Boy original, a diferencia de Asteroids (VT100 ámbar) o Snake (LCD Nokia verde). Evita repetir la misma paleta "retro" tres veces en el catálogo.
- **RANARIA: `retro` = paleta plana del arcade Frogger de 1981** (río azul saturado, negro puro, primarios sin mezclar), sin `glow`. Motivo: mismo criterio — Frogger tiene una identidad de color de gabinete muy reconocible (el río azul sólido en particular), distinta de las otras 4 referencias retro ya usadas en el catálogo.
- **Selector simplificado de lista de ids a `isReal`.** Motivo: con los 5 motores reales soportando `setSkin`, mantener `game.id === "rocas" || game.id === "serpentina" || ...` ya no aportaba nada sobre la bandera `isReal` que el shell ya calculaba para decidir canvas-vs-placeholder — reutilizarla evita que quede desactualizada si se agrega un sexto motor real.
- **Placeholders: `filter` CSS compuesto sobre `.cover-bg`, no gradientes duplicados por skin.** Motivo: cada cover (`gloton`/`invasores`/`duelo-pixel`) tiene su propio conjunto de gradientes/pseudo-elementos con formas distintas; triplicar esas reglas por skin (9 bloques de CSS) hubiera sido mucho más código para un resultado equivalente. Un `filter` (`saturate`/`brightness`/`drop-shadow` para `neon`; `grayscale`/`sepia`/`hue-rotate` para `retro`) aplicado al contenedor afecta el composite renderizado completo, incluidos `::before`/`::after`, con 2 reglas compartidas entre los 3 placeholders en vez de 6 reglas por juego.
- **`coverClassFor()` centralizado en `lib/games/skins.ts`, no lógica repetida en cada componente.** Motivo: 3 puntos de consumo (`GameCard.tsx`, `GameCardMini.tsx`, la página de detalle) necesitaban la misma regla ("solo agregar el sufijo si es placeholder y el skin no es clasico") — centralizarla evita que diverja entre los tres.
- **`components/game/CoverBg.tsx` como componente cliente nuevo, no el hook inline en cada sitio.** Motivo: la página de detalle (`app/juegos/[id]/page.tsx`) es un server component (await a Supabase) y no puede llamar `useSkinPreference()` directamente; en vez de convertir toda la página a cliente (perdiendo el fetch en servidor) se extrajo la porción mínima que sí necesita el hook a un componente cliente compartido, reutilizado también por `GameCard`/`GameCardMini` (que ya eran cliente) para no duplicar la lógica.

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                                     | Mitigación                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cambiar de skin a mitad de partida podría interrumpir el loop de `requestAnimationFrame` o perder estado.                                                                                                                                                                  | `setSkin()` solo reasigna la paleta (un campo), nunca llama `initGame()`/`reset()` — la partida en curso sigue intacta.                                                                                                                                                         |
| El selector de skin captura clics mientras el juego está en pausa o con el modal de fin abierto, generando estados confusos.                                                                                                                                               | Los botones de skin son controles de React normales (no input de teclado del canvas) — no interfieren con `keydown`/`keyup` del motor ni con el input de iniciales del modal.                                                                                                   |
| Paleta `neon` con `shadowBlur` en cada `draw()` de partícula/bala podría impactar el rendimiento con muchos asteroides fragmentados en pantalla.                                                                                                                           | `shadowBlur` se aplica solo cuando `palette.glow === true` (skin `neon`); en `clasico`/`retro` el costo es cero. No se detectaron caídas de framerate perceptibles en la revisión manual del código (pendiente de confirmar en navegador, ver criterios de aceptación).         |
| Verificación visual real (contraste sobre fondo oscuro) no se hizo con navegador en esta corrida — la sandbox del agente no tuvo la tool de Playwright disponible.                                                                                                         | Queda como criterio de aceptación pendiente de que el usuario confirme manualmente antes de dar por bueno el cambio.                                                                                                                                                            |
| BLOQUE BUSTER: el remapeo de `BlockColorKey` a color final depende de que los 5 layouts (`l1..l5`) sigan usando únicamente las 7 claves declaradas en el tipo — una clave nueva en un layout futuro rompería el tipo en compilación, no en runtime.                        | TypeScript ya lo cubre: `LevelBlockSpec.color` y `Block.color` están tipados como `BlockColorKey`, no `string` — cualquier clave fuera de las 7 falla `tsc`/`npm run lint` antes de llegar a producción.                                                                        |
| Placeholders: el `filter` compuesto de `neon`/`retro` se aplica sobre TODO el `.cover-bg`, incluida la `.label` si estuviera dentro del mismo contenedor filtrado — un cambio futuro que mueva el badge de categoría dentro de `.cover-bg` heredaría el filtro sin querer. | La `.label` vive fuera de `.cover-bg` (hermana dentro de `.cover`/`.mini-cover`/`.detail-cover`, ver `GameCard.tsx`/`GameCardMini.tsx`/`app/juegos/[id]/page.tsx`) — no está filtrada hoy. Documentado aquí para que un cambio de markup futuro no la meta adentro sin notarlo. |
| `PLACEHOLDER_GAME_IDS` en `lib/games/skins.ts` es una lista hardcodeada, no derivada de `REAL_GAME_ENGINES` — puede desincronizarse si un placeholder se porta a motor real (como pasó con `ranaria`) y nadie actualiza la lista.                                          | Ya documentado explícitamente en el comentario del propio array; el criterio de auditoría de este agente (Fase 2 del prompt) exige re-verificar `JUEGOS.md`/`lib/data.ts` en cada corrida antes de asumir el estado de un juego, lo que detecta el desfase.                     |

## Criterios de aceptación

- [x] `lib/games/skins.ts` existe con `SkinId`, `SKIN_IDS`, `SKIN_LABELS`, `DEFAULT_SKIN`, `useSkinPreference()`.
- [x] `lib/games/rocas/engine.ts` reemplaza todos los literales de color hardcodeados por lookups a `ROCAS_PALETTES[this.skin]`, con `setSkin()` público.
- [x] `lib/games/rocas/useRocasGame.ts` acepta `skin: SkinId` como parámetro y sincroniza el motor sin remontar el canvas.
- [x] `/juegos/rocas/jugar` muestra un selector de 3 skins en el HUD; cambiar de skin no reinicia la partida ni pierde el score/nivel/vidas en curso.
- [x] El skin `clasico` es visualmente idéntico al look pre-existente de ROCAS (blanco vectorial sobre negro, power-up cian, llama naranja).
- [x] `lib/games/serpentina/engine.ts` reemplaza todos los literales de color hardcodeados (fondo, grilla, cabeza/cuerpo de la serpiente, fruta de respaldo) por lookups a `SERPENTINA_PALETTES[this.skin]`, con `setSkin()` público. El sprite `fruits.png` no cambia por skin.
- [x] `lib/games/serpentina/useSerpentinaGame.ts` acepta `skin: SkinId` como parámetro y sincroniza el motor sin remontar el canvas (mismo patrón que `useRocasGame.ts`).
- [x] `/juegos/serpentina/jugar` muestra un selector de 3 skins en el HUD; cambiar de skin no reinicia la partida ni pierde el score/nivel en curso.
- [x] El skin `clasico` de SERPENTINA es visualmente idéntico al look pre-existente (fondo `#0a0a0a`, cabeza `#39ff14`, cuerpo `#1fa825`, fruta de respaldo `#ff2d55`).
- [x] `lib/games/bloque-buster/engine.ts` reemplaza todos los literales de color hardcodeados (fondo, bloques, paddle, ball) por lookups a `BLOQUE_BUSTER_PALETTES[this.skin]`, con `setSkin()` público. Los 5 layouts fijos (`l1..l5`) siguen intactos — solo cambiaron de `color: string` a `color: BlockColorKey`.
- [x] `lib/games/bloque-buster/useBloqueBusterGame.ts` acepta `skin: SkinId` como parámetro y sincroniza el motor sin remontar el canvas (mismo patrón que `useRocasGame.ts`/`useSerpentinaGame.ts`); el control por mouse (`handleMouseMove`) sigue funcionando igual.
- [x] `/juegos/bloque-buster/jugar` muestra un selector de 3 skins en el HUD; cambiar de skin no reinicia la partida ni pierde el score/nivel/vidas en curso.
- [x] El skin `clasico` de BLOQUE BUSTER es visualmente idéntico al look pre-existente (fondo `#000`, bloques con los colores CSS nombrados originales, paddle/ball blancos).
- [x] `lib/games/caida/engine.ts` reemplaza la tabla `COLORS` fija y el `GRID_LINE`/fondo hardcodeados por lookups a `CAIDA_PALETTES[this.skin]`, con `setSkin()` público. Tablero, pieza activa, fantasma y preview "siguiente" comparten la misma paleta vía `pieceColor()`.
- [x] `lib/games/caida/useCaidaGame.ts` acepta `skin: SkinId` como parámetro y sincroniza el motor sin remontar el canvas (mismo patrón que los motores anteriores).
- [x] `/juegos/caida/jugar` muestra un selector de 3 skins en el HUD; cambiar de skin no reinicia el tablero ni pierde el score/nivel en curso.
- [x] El skin `clasico` de CAÍDA es visualmente idéntico al look pre-existente (fondo `#000`, grilla `rgba(255,255,255,0.08)`, los 8 colores pastel originales por tipo de pieza).
- [x] `lib/games/ranaria/engine.ts` reemplaza los literales de color de zonas de fondo, meta, vehículos, río, rana y HUD por lookups a `RANARIA_PALETTES[this.skin]`, con `setSkin()` público.
- [x] `lib/games/ranaria/useRanariaGame.ts` acepta `skin: SkinId` como parámetro y sincroniza el motor sin remontar el canvas (mismo patrón que los motores anteriores).
- [x] `/juegos/ranaria/jugar` muestra un selector de 3 skins en el HUD; cambiar de skin no reinicia la ronda ni pierde el score/nivel/vidas en curso.
- [x] El skin `clasico` de RANARIA es visualmente idéntico al look pre-existente (zonas oscuras casi monocromáticas, río `#031a2e`, rana `#39ff14`).
- [x] `gloton`/`invasores`/`duelo-pixel` tienen clases `.cover-<id>--neon` y `.cover-<id>--retro` en `app/globals.css`, aplicadas vía `coverClassFor()`/`CoverBg.tsx` en las 3 vistas donde se muestra la cover (card de biblioteca, mini-card de home, hero de detalle). El skin `clasico` es pixel-idéntico (clase base sin modificador).
- [x] El selector de skin en `/juegos/<id>/jugar` se muestra para los 5 motores reales (condición `isReal`, ya no una lista de ids a mano).
- [x] `npm run lint` pasa sin errores (verificado tras ROCAS, SERPENTINA, BLOQUE BUSTER y de nuevo tras esta corrida de CAÍDA/RANARIA/placeholders). `npx tsc --noEmit` también pasa sin errores en esta corrida.
- [ ] Verificación visual manual en navegador de los 3 skins de los 5 motores reales y los 3 placeholders contra el fondo oscuro del sitio (pendiente — ver Riesgos; ninguna corrida hasta la fecha tuvo Playwright disponible).
