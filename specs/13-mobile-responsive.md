# 13 — Mobile / responsive (seguimiento: verificación de jugabilidad táctil de RANARIA)

## Header

- **Estado:** Approved (auditoría cerrada en esta misma corrida — no hay código nuevo que implementar por parte de este agente; ver "Fuera de alcance" abajo para por qué)
- **Dependencias:**
  - `12-mobile-responsive.md` (Approved) — corrida anterior de este mismo agente. Resolvió el layout del shell del jugador (`.crt`/`.crt-screen`/`.crt-bottom` bajo 480px, `.hud-actions` con `flex-wrap`) y `export const viewport`. Esta corrida **no reabre ni repite** esa auditoría de layout — se confirma que sigue intacta (mismo CSS, sin cambios en `app/globals.css` líneas 718-740 desde 2026-08-04) y se documenta un eje distinto: input, no layout.
  - `11-controles-tactiles.md` (Implementado) — precedente de arquitectura de input táctil (`lib/games/touchInput.ts`, `components/game/TouchControls.tsx`, configs `*_TOUCH_CONFIG`). En su fecha (2026-08-03) excluyó explícitamente a `ranaria` del alcance porque **no tenía motor real todavía** ("Los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) — sin motor real, nada que portar"). Esa premisa cambió: `ranaria` ahora tiene un motor real (`lib/games/ranaria/engine.ts` + `useRanariaGame.ts`, spec `specs/game-jam/frogger/01-frogger-core.md`), pero spec 11 no se modifica — es un spec cerrado (01–11 son inmutables para este agente).
- **Fecha:** 2026-08-04
- **Objetivo:** Verificar si RANARIA (Frogger, motor real nuevo) es jugable en un dispositivo móvil real de punta a punta — no solo si el layout cabe en pantalla chica, sino si el juego responde a input táctil.

## Hallazgo 1 — Layout: sigue cumpliendo, sin cambios

Sin evidencia de regresión desde la corrida de `12-mobile-responsive.md`:

- `app/globals.css` líneas 718-740 (`@media (max-width: 480px)` de `.crt`/`.crt-screen`/`.crt-bottom`) — idéntico al estado documentado en spec 12.
- `app/juegos/[id]/jugar/page.tsx` — `ranaria` sigue sin marcado propio en el shell; usa el mismo contrato `UseGameEngineResult` y canvas 800×600 que `rocas`/`caida`/`bloque-buster`/`serpentina`, hereda las correcciones de `.crt`/`.player-hud`/`.hud-actions` igual que los otros motores reales.
- No se reauditó por lectura visual (sin Playwright disponible en este entorno de ejecución — `npx playwright` pidió instalar el paquete, y este agente tiene prohibido `npm install`). La verificación es por lectura de código: el CSS que gobierna el reflow en 360-430px no cambió una sola línea desde que se verificó visualmente en la corrida anterior (spec 12, Playwright a 375px).

**Conclusión: el layout de RANARIA en el shell del jugador sigue cumpliendo a 360-430px. No se tocó CSS en esta corrida.**

## Hallazgo 2 — Input táctil: confirmado ausente, RANARIA no es jugable en un teléfono real

Se rastreó la cadena completa de input de `ranaria` y se confirma que **no existe ningún camino de touch**:

1. **`lib/games/ranaria/useRanariaGame.ts`** (líneas 70-78): el único listener de input que registra es `window.addEventListener("keydown", handleKeyDown)`. No hay `touchstart`/`touchmove`/`touchend`/`pointerdown` en ningún lado del hook ni del engine (`lib/games/ranaria/engine.ts` solo expone `handleKeyDown(code)`, sin equivalente táctil).
2. **`lib/games/touchInput.ts`**: define `ROCAS_TOUCH_CONFIG`, `CAIDA_TOUCH_CONFIG`, `SERPENTINA_TOUCH_CONFIG` — no existe `RANARIA_TOUCH_CONFIG`.
3. **`app/juegos/[id]/jugar/page.tsx`** (líneas 69-74): el mapa `TOUCH_CONFIGS` solo tiene entradas `rocas`, `caida`, `serpentina`. Para `id === "ranaria"`, `touchConfig` resuelve a `undefined`.
4. Línea 259: `{isTouch && touchConfig && <TouchControls config={touchConfig} />}` — con `touchConfig` undefined para `ranaria`, `<TouchControls>` **nunca se renderiza**, sin importar el valor de `isTouch` (es decir, sin importar si el dispositivo es táctil o no).
5. A diferencia de `bloque-buster` (que tampoco usa D-pad pero sí tiene input táctil propio vía `touchstart`/`touchmove` en `useBloqueBusterGame.ts`, líneas 105-106, reusando la lógica de `handleMouseMove`), `ranaria` no tiene ningún mecanismo alternativo de touch.

**Conclusión: en un teléfono/tablet real sin teclado físico conectado, RANARIA renderiza correctamente (el canvas y el HUD caben en pantalla, ver Hallazgo 1) pero es completamente no-jugable — no existe ninguna forma de mover la rana. El evento `keydown` nunca se dispara desde una pantalla táctil.**

## Veredicto

| Eje                                                     | Estado                                           | Detalle                                                                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Layout (`.crt`/`.crt-screen`/`.player-hud` a 360-430px) | **Cumple**                                       | Confirmado sin regresión desde `12-mobile-responsive.md`, sin cambios de código en esta corrida.                                                             |
| Input táctil                                            | **Pendiente — fuera del alcance de este agente** | RANARIA no tiene D-pad, config `*_TOUCH_CONFIG`, ni ningún listener táctil propio. `TOUCH_CONFIGS` en `app/juegos/[id]/jugar/page.tsx` no incluye `ranaria`. |
| **Jugable en móvil de punta a punta**                   | **No**                                           | El layout cabe, pero sin input táctil el juego es inoperable en un dispositivo sin teclado físico (la gran mayoría de teléfonos/tablets reales).             |

## Fuera de alcance de esta corrida (y por qué)

Por regla dura de este agente, **no se implementa ningún control táctil aquí** — eso es territorio ya cerrado por `specs/11-controles-tactiles.md` (`lib/games/touchInput.ts`, `components/game/TouchControls.tsx`, configs `*_TOUCH_CONFIG`, y el bloque `useIsTouchDevice()`/`TOUCH_CONFIGS` de `app/juegos/[id]/jugar/page.tsx`), aunque la causa raíz de que RANARIA no sea jugable en móvil sea precisamente la ausencia de ese input. Cerrar este gap requiere un spec nuevo que **extienda** spec 11 (algo del estilo "controles táctiles para RANARIA"): un D-pad de 4 direcciones sin botón de acción (mismo patrón que `SERPENTINA_TOUCH_CONFIG`, dado que Frogger también es movimiento discreto en 4 direcciones sin acción secundaria) más registrar `ranaria` en el mapa `TOUCH_CONFIGS` de `app/juegos/[id]/jugar/page.tsx`. Ese spec no se escribe ni se implementa aquí — queda documentado como el siguiente paso necesario, a cargo de quien retome el territorio de spec 11 (no de `mobile-porter`).

## Verificación

- Lectura de código completa de la cadena de input: `lib/games/ranaria/useRanariaGame.ts`, `lib/games/ranaria/engine.ts` (grep sin coincidencias de `touch`), `lib/games/touchInput.ts`, `app/juegos/[id]/jugar/page.tsx`.
- `git log --oneline -5 -- app/globals.css app/layout.tsx "app/juegos/[id]/jugar/page.tsx"` — confirma que no hubo cambios en esos archivos relevantes al layout desde la corrida de spec 12 que invaliden esa auditoría.
- Sin Playwright disponible en este entorno (`npx playwright` requiere instalar el paquete, prohibido por regla dura de no `npm install`) — no hubo verificación visual nueva; el hallazgo de input es de código (existencia/ausencia de listeners), no de renderizado, por lo que la lectura de código es suficiente y definitiva.
- `npm run lint` — sin cambios de código en esta corrida (ni en `app/globals.css` ni en `app/layout.tsx` ni en `app/juegos/[id]/jugar/page.tsx`), se corre igual para confirmar que el árbol de trabajo sigue limpio de errores.

## Decisiones tomadas y descartadas

- No se agregó `RANARIA_TOUCH_CONFIG` ni se registró `ranaria` en `TOUCH_CONFIGS` — territorio de spec 11, explícitamente fuera del alcance de este agente aunque sea la causa raíz del problema (regla dura).
- No se editó `specs/11-controles-tactiles.md` para actualizar su nota "sin motor real, nada que portar" sobre `ranaria` (ya desactualizada, el motor real existe desde el spec de game-jam de frogger) — specs 01–11 son inmutables para este agente. Se deja esa desactualización documentada aquí en vez de tocar el spec original.
- No se reescribió ni tocó `specs/12-mobile-responsive.md` — sigue siendo el registro válido de la corrida de layout; este spec 13 es un seguimiento independiente sobre un eje distinto (input, no layout).
- No se ejecutó `npx playwright install`/`npm install playwright` para forzar una verificación visual — regla dura de no `npm install`.

## Riesgos identificados

| Riesgo                                                                                                                                             | Mitigación                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin verificación visual con Playwright de que `isTouch && touchConfig` efectivamente no renderiza `<TouchControls>` en un dispositivo táctil real. | El análisis es de código estático (ausencia de la clave `ranaria` en el objeto `TOUCH_CONFIGS`, JS de corto-circuito determinista `&&`), no depende de renderizado — no requiere confirmación visual para ser concluyente. |
| Quien lea este spec podría asumir que el layout también quedó pendiente.                                                                           | Tabla de veredicto separa explícitamente los dos ejes (layout: cumple: input: pendiente) para evitar esa confusión.                                                                                                        |
