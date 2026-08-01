# 10 — Sistema de skins

## Header

- **Estado:** Approved (implementado incrementalmente por el subagente `skin-designer` a lo largo de varias corridas — este documento es un registro de arquitectura, no un plan pendiente).
- **Dependencias:** `05-rocas-juego-real.md` (Implementado), `08-bloque-buster-juego-real.md` (Implementado), `09-serpentina-juego-real.md` (Implementado) — motores reales que ya recibieron skins. Sin dependencia funcional de otros specs.
- **Fecha:** 2026-08-01 (primera corrida: arquitectura compartida + ROCAS). Actualizado 2026-08-01 (corridas siguientes: SERPENTINA y BLOQUE BUSTER, cada una en su propia sesión de agente).
- **Objetivo:** Dar a cada juego del catálogo ≥3 skins seleccionables (`neon`, `retro`, `clasico`) que lean bien contra el fondo permanentemente oscuro del sitio. `clasico` reproduce el look actual — es el default, nadie que no elija otra cosa nota un cambio visual. La arquitectura compartida se definió en la primera corrida junto con su primer consumidor real, **ROCAS** (`rocas`); corridas siguientes suman **SERPENTINA** (`serpentina`) y **BLOQUE BUSTER** (`bloque-buster`, arkanoid), cada una reutilizando esa misma arquitectura sin rediseñarla.

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
- Selector de skin (3 botones `CLÁSICO`/`NEÓN`/`RETRO`) en `app/juegos/[id]/jugar/page.tsx`, dentro de `.player-hud`, visible cuando `game.id` es un motor con `setSkin` implementado (`rocas`, `serpentina`, `bloque-buster`, y cualquier otro que sume soporte en corridas posteriores). Usa `useSkinPreference()` para leer/escribir la preferencia compartida.
- Clases CSS `.skin-selector` / `.skin-btn` (+ `.skin-btn.active`) en `app/globals.css`, junto a `.hud-actions`. Genéricas, sin variantes por juego — no se volvieron a tocar en las corridas de SERPENTINA ni BLOQUE BUSTER.

**Explícitamente fuera de alcance de la corrida de BLOQUE BUSTER** (no auditado/tocado en esa corrida, ver Estado final para el estado real de cada uno):

- `caida` — sigue sin tocarse en ninguna corrida hasta la fecha.
- Los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) y sus variantes `.cover-<id>--<skin>` — no tocados en la corrida de BLOQUE BUSTER (pedido explícito del usuario: "ignora los demás juegos", incluidos los placeholders).
- Cualquier cambio a `lib/supabase/**` o `components/AuthProvider.tsx` (fuera de reglas del agente, todas las corridas).

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

### Selector en el shell del jugador

`app/juegos/[id]/jugar/page.tsx`:

```tsx
const [skin, setSkin] = useSkinPreference();
const rocas = useRocasGame(skin);
const bloqueBuster = useBloqueBusterGame(skin);
const serpentina = useSerpentinaGame(skin);
```

El selector (`.skin-selector` con 3 `.skin-btn`) vive dentro de `.player-hud`, junto a `.hud-actions`, y se renderiza cuando `game.id` corresponde a un motor con `setSkin` implementado (`rocas`, `serpentina` y `bloque-buster` a la fecha de este documento; se extiende con un simple `||` adicional en la condición cuando otro motor sume soporte). El resto de la lectura de `engine.*` sigue el patrón de destructuring único documentado en `CLAUDE.md` — no se tocó esa parte del archivo.

## Estado final de los 8 juegos

| Juego (`id`)    | Motor       | Skins implementados              | Estado     |
| --------------- | ----------- | -------------------------------- | ---------- |
| `rocas`         | Real        | `clasico`, `neon`, `retro`       | **cumple** |
| `caida`         | Real        | ninguno (solo look actual)       | pendiente  |
| `bloque-buster` | Real        | `clasico`, `neon`, `retro`       | **cumple** |
| `serpentina`    | Real        | `clasico`, `neon`, `retro`       | **cumple** |
| `gloton`        | Placeholder | ninguno (solo `.cover-glot`)     | pendiente  |
| `invasores`     | Placeholder | ninguno (solo `.cover-invaders`) | pendiente  |
| `ranaria`       | Placeholder | ninguno (solo `.cover-rana`)     | pendiente  |
| `duelo-pixel`   | Placeholder | ninguno (solo `.cover-duelo`)    | pendiente  |

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

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                              | Mitigación                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cambiar de skin a mitad de partida podría interrumpir el loop de `requestAnimationFrame` o perder estado.                                                                                                                                           | `setSkin()` solo reasigna la paleta (un campo), nunca llama `initGame()`/`reset()` — la partida en curso sigue intacta.                                                                                                                                                 |
| El selector de skin captura clics mientras el juego está en pausa o con el modal de fin abierto, generando estados confusos.                                                                                                                        | Los botones de skin son controles de React normales (no input de teclado del canvas) — no interfieren con `keydown`/`keyup` del motor ni con el input de iniciales del modal.                                                                                           |
| Paleta `neon` con `shadowBlur` en cada `draw()` de partícula/bala podría impactar el rendimiento con muchos asteroides fragmentados en pantalla.                                                                                                    | `shadowBlur` se aplica solo cuando `palette.glow === true` (skin `neon`); en `clasico`/`retro` el costo es cero. No se detectaron caídas de framerate perceptibles en la revisión manual del código (pendiente de confirmar en navegador, ver criterios de aceptación). |
| Verificación visual real (contraste sobre fondo oscuro) no se hizo con navegador en esta corrida — la sandbox del agente no tuvo la tool de Playwright disponible.                                                                                  | Queda como criterio de aceptación pendiente de que el usuario confirme manualmente antes de dar por bueno el cambio.                                                                                                                                                    |
| BLOQUE BUSTER: el remapeo de `BlockColorKey` a color final depende de que los 5 layouts (`l1..l5`) sigan usando únicamente las 7 claves declaradas en el tipo — una clave nueva en un layout futuro rompería el tipo en compilación, no en runtime. | TypeScript ya lo cubre: `LevelBlockSpec.color` y `Block.color` están tipados como `BlockColorKey`, no `string` — cualquier clave fuera de las 7 falla `tsc`/`npm run lint` antes de llegar a producción.                                                                |

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
- [x] `npm run lint` pasa sin errores (verificado tras la corrida de ROCAS, de nuevo tras SERPENTINA y de nuevo tras BLOQUE BUSTER). `npx tsc --noEmit` también se corrió sin errores en la corrida de BLOQUE BUSTER (el remapeo de `BlockColorKey` depende de tipado estricto, ver Riesgos).
- [ ] Verificación visual manual en navegador de los 3 skins de ROCAS, SERPENTINA y BLOQUE BUSTER contra el fondo oscuro del sitio (pendiente — ver Riesgos).
