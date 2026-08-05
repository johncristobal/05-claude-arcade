# 11 — Controles táctiles

## Header

- **Estado:** implemented
- **Dependencias:** `05-rocas-juego-real.md`, `07-caida-juego-real.md`, `08-bloque-buster-juego-real.md`, `09-serpentina-juego-real.md` (los 4, Implementado) — motores reales que reciben soporte táctil. Sin dependencia funcional de `10-sistema-skins.md` (coexisten, temas ortogonales).
- **Fecha:** 2026-08-03
- **Objetivo:** Agregar controles táctiles equivalentes a los de teclado/mouse a los 4 juegos reales (`rocas`, `caida`, `bloque-buster`, `serpentina`) para que sean jugables en un dispositivo con pantalla táctil, sin modificar el gameplay ni el layout existente más allá del CSS mínimo necesario (`touch-action`, viewport).

## Scope

**Incluido:**

- `lib/games/touchInput.ts`: `useIsTouchDevice()` (media query `(pointer: coarse)`, SSR-safe → `false` en servidor) y `dispatchKey(code, type)` que despacha un `KeyboardEvent` sintético en `window`.
- `components/game/TouchControls.tsx`: D-pad (hasta 4 flechas) + hasta 2 botones de acción, configurable por juego vía `TouchControlsConfig`. `onTouchStart`/`onTouchEnd` llaman `dispatchKey`. Auto-repeat opcional (interval fijo, ~120ms) mientras se mantiene presionado, para juegos de movimiento discreto sin `keyUp` (`caida`).
- Config por juego:
  - `rocas`: D-pad ← → (rotar) + ↑ (propulsar), botón DISPARAR (`Space`). Sin auto-repeat (el engine ya lee estado booleano continuo).
  - `caida`: D-pad ← → (mover) + ↓ (soft drop) + ↑ (rotar), botón CAER (hard drop, `Space`). Con auto-repeat en ← → ↓.
  - `serpentina`: D-pad ↑ ↓ ← → (4 direcciones), sin botón de acción, sin auto-repeat (`setDirection` no lo necesita).
  - `bloque-buster`: sin D-pad — `touchmove`/`touchstart` agregado directo en `useBloqueBusterGame.ts`, junto al `mousemove` existente, reusando la misma lógica de escalado (`handleMouseMove`).
- `app/juegos/[id]/jugar/page.tsx`: renderiza `<TouchControls config={...}/>` debajo del canvas, condicionado a `useIsTouchDevice() && id ∈ {rocas, caida, serpentina}`.
- CSS en `app/globals.css`: `touch-action: none` en canvas y botones del D-pad, clases nuevas `.touch-controls`/`.dpad-btn`/`.action-btn`, todo dentro de `@media (pointer: coarse)`.
- `app/layout.tsx`: `export const viewport` estándar (`width=device-width, initial-scale=1`) si el default de Next 16 no alcanza (confirmar contra `node_modules/next/dist/docs/` antes de escribir).
- Actualizar `JUEGOS.md` (contrato compartido + las 4 fichas) reflejando soporte táctil.

**Explícitamente fuera de alcance:**

- Los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) — sin motor real, nada que portar.
- Rediseño responsive del `.crt-screen`/HUD general (orientación forzada, reflow en pantallas muy chicas) — el canvas ya escala 100%/100%, eso no cambia.
- Gestos swipe — descartado a favor de D-pad de botones.
- Sonido/haptics (vibración al tocar).
- Tests automatizados (no hay test runner configurado).
- Cambios a `lib/supabase/**`, `components/AuthProvider.tsx`, o al sistema de skins (`10-sistema-skins.md`).

## Modelo de datos

Sin persistencia nueva — todo es config estática + estado de UI en memoria.

```ts
// lib/games/touchInput.ts
export function useIsTouchDevice(): boolean;

export type DpadDirection = "up" | "down" | "left" | "right";

export interface TouchControlsConfig {
  dpad: DpadDirection[];
  actions: { label: string; code: string }[];
  repeat?: boolean; // true = auto-repeat mientras se mantiene (caida)
}

export function dispatchKey(code: string, type: "keydown" | "keyup"): void;
```

```tsx
// components/game/TouchControls.tsx
export function TouchControls(props: {
  config: TouchControlsConfig;
}): JSX.Element;
```

## Plan de implementación

1. `lib/games/touchInput.ts` — `useIsTouchDevice()`, `dispatchKey()`, tipos `TouchControlsConfig`/`DpadDirection`.
2. `components/game/TouchControls.tsx` — D-pad + botones de acción, wiring táctil, auto-repeat opcional con cleanup en `onTouchEnd`/unmount.
3. Configs por juego (`ROCAS_TOUCH_CONFIG`, `CAIDA_TOUCH_CONFIG`, `SERPENTINA_TOUCH_CONFIG`).
4. `app/juegos/[id]/jugar/page.tsx` — renderizar `TouchControls` condicionado a `useIsTouchDevice()` + `game.id`.
5. `lib/games/bloque-buster/useBloqueBusterGame.ts` — sumar `touchmove`/`touchstart` en el canvas junto al `mousemove` existente.
6. CSS en `app/globals.css` — `touch-action`, `.touch-controls`/`.dpad-btn`/`.action-btn`, bajo `@media (pointer: coarse)`.
7. `app/layout.tsx` — `export const viewport` si hace falta (verificar contra docs de Next 16 primero).
8. Actualizar `JUEGOS.md`.

## Criterios de aceptación

- [ ] En emulación táctil, `/juegos/rocas/jugar`, `/juegos/caida/jugar`, `/juegos/serpentina/jugar` muestran D-pad + botón(es) de acción debajo del canvas; en desktop con mouse/teclado no aparecen.
- [ ] Cada dirección/botón produce el mismo efecto que su tecla equivalente, sin reiniciar el motor.
- [ ] En `caida`, mantener presionado ← o → mueve la pieza repetidamente (auto-repeat), no solo un paso.
- [ ] `/juegos/bloque-buster/jugar` en emulación táctil: arrastrar el dedo mueve la paleta con el mismo escalado que el mouse.
- [ ] Ningún control táctil dispara scroll/zoom accidental de la página durante la partida.
- [ ] El teclado sigue funcionando igual en desktop en los 4 juegos (sin regresión).
- [ ] `npm run lint` pasa sin errores.
- [ ] `JUEGOS.md` actualizado.

## Decisiones tomadas y descartadas

- D-pad de botones virtuales en vez de gestos swipe — confirmado por el usuario (más discoverable, sin ambigüedad de gesto).
- D-pad debajo del canvas, no superpuesto — confirmado por el usuario (no tapa el área de juego).
- `bloque-buster` usa `touchmove` directo en vez de D-pad — confirmado por el usuario (preserva precisión análoga del arrastre, reusa lógica de mouse existente).
- Controles visibles solo en `pointer: coarse` — confirmado por el usuario (sin clutter en desktop).
- CSS limitado a lo mínimo necesario (`touch-action` + viewport), sin rediseño responsive completo — confirmado por el usuario.
- Reusar listeners `window` existentes vía `KeyboardEvent` sintéticos en vez de exponer métodos nuevos en cada engine/hook — evita romper el contrato `UseGameEngineResult` (mismo principio ya aplicado en `10-sistema-skins.md`), y no requiere tocar `rocas`/`caida`/`serpentina`.
- `bloque-buster` sí toca su hook porque nunca tuvo input de teclado global, solo `mousemove` atado al canvas — no hay evento de `window` que interceptar.

## Riesgos identificados

| Riesgo                                                                                             | Mitigación                                                                                                                                   |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `KeyboardEvent` sintéticos en `window` podrían interferir con otros listeners globales de teclado. | Los `code` usados ya son escuchados hoy solo por el hook del juego activo; no hay otros listeners globales de teclado en el resto del sitio. |
| Auto-repeat mal limpiado deja la pieza moviéndose sola tras soltar el dedo.                        | `clearInterval` en `onTouchEnd`/unmount, mismo patrón de cleanup que ya usan los hooks de juego.                                             |
| `pointer: coarse` puede fallar en híbridos (laptop táctil + mouse).                                | Aceptado tal cual — es la señal estándar de CSS Media Queries L4; sin detección adicional (fuera de alcance).                                |
| `touch-action: none` en el canvas podría bloquear gestos de accesibilidad del SO en esa zona.      | Trade-off aceptado, limitado al área de canvas/D-pad, no a la página completa.                                                               |

## Addendum — RANARIA (2026-08-04)

`ranaria` (Frogger, motor real agregado en `specs/game-jam/frogger/01-frogger-core.md`, posterior a este spec) quedó explícitamente fuera de alcance del spec de Frogger. Una corrida de `mobile-porter` (`specs/13-mobile-responsive.md`) detectó que el layout cabía en pantalla chica pero el juego era inoperable en teléfono real sin teclado físico — cero input táctil, `ranaria` ausente de `TOUCH_CONFIGS`.

Cierre, mismo patrón que el resto de este spec (no se reabrió el spec de Frogger ni se tocó `lib/games/ranaria/engine.ts`):

- `RANARIA_TOUCH_CONFIG` en `lib/games/touchInput.ts` — D-pad de 4 direcciones, sin botón de acción (idéntico a `SERPENTINA_TOUCH_CONFIG`, sin auto-repeat: el motor ya ignora `pendingDir` mientras la rana anima el salto).
- `ranaria` agregado a `TOUCH_CONFIGS` en `app/juegos/[id]/jugar/page.tsx` — el `id ∈ {rocas, caida, serpentina, ranaria}` que condiciona `<TouchControls>` queda actualizado.
- Sin cambios en `useRanariaGame.ts`: el hook ya escuchaba `keydown` en `window`, `dispatchKey()` reusa ese listener sin tocar el motor — mismo principio que el resto de este spec.
- Verificado con Playwright usando un contexto `hasTouch: true` + `isMobile: true` (390×844) y `matchMedia("(pointer: coarse)")` forzado a `true` vía init script: D-pad visible con 4 botones, un tap real (`locator.tap()`, no `dispatchEvent` sintético) en ▲ mueve la rana y suma +10 al score.
