# 12 — Mobile / responsive

## Header

- **Estado:** Approved (ya implementado en esta misma corrida — no es un plan pendiente)
- **Dependencias:** `11-controles-tactiles.md` (Implementado) — precedente de cómo esta plataforma ya resolvió mobile (D-pad, `pointer: coarse`). Ese spec dejó explícitamente fuera de alcance el "rediseño responsive del `.crt-screen`/HUD general"; este spec es ese punto pendiente, sin modificar `11-controles-tactiles.md` ni el territorio de input táctil que cubre (`lib/games/touchInput.ts`, `components/game/TouchControls.tsx`, configs `*_TOUCH_CONFIG`).
- **Fecha:** 2026-08-04
- **Objetivo:** Auditar el layout de las páginas de marketing y del shell del jugador (`app/juegos/[id]/jugar/page.tsx`) en viewports chicos (~360–430px), y corregir los gaps reales de reflow/proporción encontrados — prioridad más alta en el shell del jugador (`.crt`/`.crt-screen`/`.player-hud`) por ser el de mayor impacto detectado.

## Scope

**Incluido:**

- `app/globals.css`:
  - `.hud-actions`: se agrega `flex-wrap: wrap` a la regla base (sin gatear detrás de un breakpoint, mismo criterio que ya usa `.player-hud`). El selector selector de skin (`.skin-selector`, 3 botones `CLÁSICO`/`NEÓN`/`RETRO`) más `PAUSA`/`FIN`/`SALIR` no cabían en una sola fila bajo el ancho de `.av-player` en viewports de ~360–390px sin este cambio, y `.hud-actions` no tenía wrap propio (solo lo tenía el contenedor padre `.player-hud`, que solo controla el salto de línea entre sus dos hijos directos, no el desborde interno de cada uno).
  - Nuevo `@media (max-width: 480px)` agrupado junto a los selectores `.crt`/`.crt-screen`/`.crt-bottom` existentes (no al final del archivo):
    - `.crt`: padding 24px → 12px, `border-radius` 28px → 16px, `box-shadow` de doble borde reducido (4px/5px en vez de 6px/7px) — recupera ~24px de ancho útil para `.crt-screen` en viewports reales de teléfono (iPhone SE/estándar 360–390px), donde el padding fijo + doble borde comía proporción real del área jugable.
    - `.crt-screen`: `border-radius` ajustado a juego con el nuevo radio del `.crt` que lo envuelve.
    - `.crt-bottom`: `flex-wrap: wrap` + `justify-content: center` + `text-align: center` — el texto central (`{game.title} · CRT-83 · 60 HZ`, hasta ~30 caracteres para `BLOQUE BUSTER`) junto con `SEÑAL OK` y `CARGA · 1MB` no cabían en una sola fila `space-between` bajo ~300–320px de ancho de contenido sin wrap, y se recortaban sin scroll posible (`body { overflow-x: hidden }`).
- `app/layout.tsx`: se agrega `export const viewport: Viewport = { themeColor: "#0a0a0f", colorScheme: "dark" }`. Ver decisión abajo — no se agrega `width`/`initialScale`.

**Explícitamente fuera de alcance (ya cerrado por otros specs, no se re-litiga):**

- `@media (pointer: coarse)` y todo lo que define (`.touch-controls`/`.dpad`/`.dpad-btn*`/`.touch-actions`, `touch-action: none` en canvas) — de `11-controles-tactiles.md`, no tocado.
- `lib/games/touchInput.ts`, `components/game/TouchControls.tsx`, configs `*_TOUCH_CONFIG` — no tocados.
- `lib/supabase/**`, `components/AuthProvider.tsx` — no tocados.
- Resolución nativa del canvas (800×600 lógico) — no tocada; el canvas sigue escalando por CSS dentro de `.crt-screen`, solo se ajustó el contenedor.
- PWA/manifest/wrapper nativo — no existe en el repo, no corresponde agregarlo aquí (responsive web únicamente).
- Los 14 media queries de grilla ya existentes en `app/globals.css` (`.av-detail`/`.contact-grid`/`.activity-grid`/`.pricing-grid` en 900px; `.podium`/`.stats-inner`/`.stat-block` en 720px; `.feature-grid` en 980px/520px; `.mini-rail` en 1100px/600px; `.highlight-row` en 820px; `.tick-row` en 520px) — auditados en esta corrida, confirmados suficientes, sin cambios (ver tabla de estado).
- `.av-grid` (biblioteca) — usa `repeat(auto-fill, minmax(280px,1fr))`, confirmado inherentemente responsive (a 343px de ancho de contenido tras el breakpoint de 720px ya existente, un solo carril de 280px cabe sin overflow), sin breakpoint dedicado necesario.
- `components/Nav.tsx` y el breakpoint de 840px (hamburguesa + `.av-mobile-panel`/`.av-mobile-backdrop`) — confirmado intacto, sin evidencia de cambio desde su implementación, no reauditado en profundidad.

## Decisión sobre `export const viewport`

Antes de escribir el export se verificó `node_modules/next/dist/lib/metadata/default-metadata.js` (`createDefaultViewport()`), que confirma que Next 16 ya emite `width: "device-width"` e `initialScale: 1` por defecto **sin necesidad de export explícito**. Agregar esos campos habría sido redundante.

Lo que sí falta y es real: `themeColor` y `colorScheme` se inicializan en `null` por defecto (mismo archivo) — no se emiten salvo que se declaren. Arcade Vault es un sitio permanentemente oscuro (`--bg: #0a0a0f`, `--bg-2: #0f0f18` en `app/globals.css`, sin modo claro en ningún lado del código). Se agregó:

```ts
export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  colorScheme: "dark",
};
```

- `themeColor: "#0a0a0f"` — coincide con `--bg`, para que la barra de estado/chrome del navegador móvil (Android Chrome, principalmente) se pinte del mismo color de fondo en vez de blanco por defecto.
- `colorScheme: "dark"` — indica al navegador que use su propia UI en modo oscuro (scrollbars, controles de formulario nativos como `<input>`/date pickers) en vez de asumir claro, coherente con el resto del sitio.

## Auditoría — estado por página/sección

| Página/sección                                                          | Resultado                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell del jugador — `.crt`/`.crt-screen`                                | **Gap corregido.** Nuevo `@media (max-width: 480px)` reduce padding/radio/sombra de `.crt`, recupera ancho útil de `.crt-screen` en 360–390px reales.                                                                                                                        |
| Shell del jugador — `.crt-bottom`                                       | **Gap corregido.** `flex-wrap: wrap` + centrado bajo 480px; sin esto el texto largo (`BLOQUE BUSTER · CRT-83 · 60 HZ`) se recortaba sin scroll posible.                                                                                                                      |
| Shell del jugador — `.player-hud`/`.hud-actions`/`.skin-selector`       | **Gap corregido.** `.hud-actions` ahora tiene `flex-wrap: wrap` propio; antes solo el contenedor padre envolvía, no los botones internos (skin selector + PAUSA/FIN/SALIR desbordaban en ~360–390px).                                                                        |
| Shell del jugador — `ranaria` (motor real nuevo, spec game-jam/frogger) | **Cumple, sin cambios adicionales.** Usa el mismo contrato `UseGameEngineResult` y canvas 800×600 que los otros 4 motores reales; no introduce marcado ni CSS propio en el shell — hereda las correcciones de arriba igual que `rocas`/`caida`/`bloque-buster`/`serpentina`. |
| `.av-player` (padding en ≤720px)                                        | **Cumple, sin cambios.** El padding existente (`0 16px 32px`) es suficiente una vez corregido `.crt` por dentro.                                                                                                                                                             |
| `components/Nav.tsx` (breakpoint 840px)                                 | **Cumple, sin cambios.** Confirmado intacto, sin evidencia de modificación desde su implementación.                                                                                                                                                                          |
| `.av-grid` (biblioteca)                                                 | **Cumple, sin cambios.** `repeat(auto-fill, minmax(280px,1fr))` es inherentemente responsive.                                                                                                                                                                                |
| `.av-detail`/`.contact-grid`/`.activity-grid`/`.pricing-grid` (900px)   | **Cumple, sin cambios.** Colapsan a una columna antes de 430px, sin overflow.                                                                                                                                                                                                |
| `.podium`/`.stats-inner`/`.stat-block` (720px)                          | **Cumple, sin cambios.**                                                                                                                                                                                                                                                     |
| `.feature-grid` (980px/520px)                                           | **Cumple, sin cambios.**                                                                                                                                                                                                                                                     |
| `.mini-rail` (1100px/600px)                                             | **Cumple, sin cambios.**                                                                                                                                                                                                                                                     |
| `.highlight-row` (820px)                                                | **Cumple, sin cambios.**                                                                                                                                                                                                                                                     |
| `.tick-row` (520px)                                                     | **Cumple, sin cambios.**                                                                                                                                                                                                                                                     |
| `app/layout.tsx` / viewport meta                                        | **Gap corregido.** `export const viewport` agregado con `themeColor`/`colorScheme` (ver decisión arriba); `width`/`initialScale` no se tocan (ya cubiertos por default de Next 16).                                                                                          |

## Verificación

- `npm run lint` — sin errores.
- Sin acceso a Playwright ni servidor de desarrollo verificable en este entorno de ejecución; la verificación de los cambios se hizo por lectura de CSS + cálculo de anchos reales de contenido en los breakpoints existentes (720px → 480px → viewport de 360–390px), no por captura visual en navegador. **Pendiente para quien revise:** levantar `npm run dev` y confirmar en 375px/430px de ancho, foco en `.crt`/`.crt-screen`/`.player-hud` de `/juegos/ranaria/jugar` (motor nuevo) y de al menos un juego más.

## Decisiones tomadas y descartadas

- `.hud-actions` recibe `flex-wrap: wrap` en la regla base, no dentro de un media query — mismo criterio que ya usa `.player-hud` en el código existente (flex-wrap no tiene efecto visual mientras el contenido cabe, así que no hay riesgo de regresión en desktop).
- Breakpoint de 480px para `.crt`/`.crt-bottom` en vez de reusar 720px (ya usado por `.av-player`) — a 720px el `.crt` con padding completo (24px) todavía deja espacio razonable; el gap real aparece recién en anchos de teléfono real (360–430px), de ahí el breakpoint más angosto y dedicado.
- No se tocó `.crt-content` (overlay de pausa) — el texto ya es corto (dos líneas) y cabe sin cambios incluso con el `.crt-screen` reducido.
- No se agregó `width`/`initialScale` al `export const viewport` — confirmado redundante contra `node_modules/next/dist/lib/metadata/default-metadata.js` antes de escribir, por regla dura del agente.
- No se reauditó `Nav.tsx` en profundidad — sin evidencia de que su CSS/marcado haya cambiado desde su implementación (breakpoint 840px, `.av-mobile-panel`/`.av-mobile-backdrop` intactos).
- No se tocó `ranaria` más allá de heredar las correcciones del shell — su hook/engine sigue el mismo contrato `UseGameEngineResult` que los otros 4 motores reales, sin marcado ni CSS propio en `app/juegos/[id]/jugar/page.tsx` que requiera un fix dedicado.

## Riesgos identificados

| Riesgo                                                                                                              | Mitigación                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Sin verificación visual real (Playwright no disponible en este entorno de ejecución).                               | Cálculo de anchos reales por breakpoint documentado en este spec; se deja explícito como pendiente de revisión manual. |
| Reducir el doble borde/padding de `.crt` en 480px podría verse menos "premium" en tablets pequeñas entre 480–720px. | El breakpoint es 480px, no 720px — tablets/phablets en modo retrato quedan con el `.crt` completo.                     |
