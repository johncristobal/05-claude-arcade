# SPEC 17 — Interstitial de ads (mecanismo, sin red real)

> **Estado:** Approved
> **Depende de:** ninguno funcionalmente, pero se integra en `app/juegos/[id]/jugar/page.tsx` (shell del jugador, spec 06 `leaderboard-real` y las specs de los 4 motores reales — 05/07/08/09).
> **Fecha:** 2026-08-11
> **Objetivo:** Primer paso de monetización de Arcade Vault. Construir el mecanismo de un ad interstitial entre partidas (disparo, frecuencia, UI) usando un placeholder visual — sin integrar todavía ninguna red de ads real (AdSense u otra). La red real se conecta después reemplazando solo el contenido interno del componente, sin tocar la lógica de negocio (contador, disparo, countdown).

## Contexto y alcance de la decisión

Brainstorming (`superpowers:brainstorming`) sobre monetización cubrió 3 direcciones: cosméticos/vanidad, ads, suscripción. Se eligió **ads** como primera vía porque no requiere auth real (hoy `components/AuthProvider.tsx` es fake, solo `localStorage`) ni billing — ambos bloqueantes para suscripción. Cosméticos queda como vía natural futura (ya existe sistema de skins, spec 10) pero no es el foco de este spec.

Dentro de ads, se descartaron banner estático (CPM bajo, choca con estética CRT/neon) y rewarded video (requiere lógica de "revivir" nueva en los 4 engines, mayor esfuerzo) a favor de **interstitial entre partidas**, que encaja con el flujo ya existente del modal de game-over sin tocar ningún `engine.ts`.

## Scope

**Incluido:**

- `lib/ads/useAdGate.ts` — hook nuevo:
  - `shouldShowAd(gameId: string): boolean` — lee el contador de `localStorage` bajo la key `av_ad_count_<gameId>`. Devuelve `true` cuando el contador (antes de incrementar) está en 2 (es decir, dispara en la 3ª partida cerrada, no en la 1ª).
  - `recordPlay(gameId: string): void` — incrementa el contador; si llega a 3, lo resetea a 0.
  - Si `localStorage` no está disponible (SSR, modo privado que lo bloquea, cuota excedida) ambas funciones fallan en silencio y `shouldShowAd` devuelve `false` — el ad nunca bloquea el acceso al juego.
  - Contador **por juego** (`gameId` en la key), no global — jugar `rocas` 3 veces no afecta el contador de `caida`.
- `components/game/AdInterstitial.tsx` — modal nuevo:
  - Reutiliza la clase `.modal` existente (mismo tratamiento visual CRT/neon que el modal de game-over), contenido: placeholder fijo "ESPACIO PUBLICITARIO" centrado.
  - Countdown de 5s visible (`5… 4… 3… 2… 1…`); el botón de cerrar existe desde el render inicial pero queda `disabled` hasta que el countdown llega a 0.
  - Prop `onClose: () => void` — se llama al click del botón una vez habilitado. El componente no sabe qué acción se ejecuta después (restart o salir); eso lo decide quien lo monta.
- `app/juegos/[id]/jugar/page.tsx`:
  - Los handlers de los botones **REINICIAR** y **SALIR** del modal de game-over pasan primero por `recordPlay(gameId)` y `shouldShowAd(gameId)`.
  - Si `shouldShowAd` es `true`: la acción real (`restart()` o navegación de salida) se guarda en estado como acción pendiente, se monta `<AdInterstitial>`, y solo se ejecuta al `onClose`.
  - Si es `false`: la acción corre directo, sin cambios respecto al comportamiento actual.

**Explícitamente fuera de alcance (para specs futuros):**

- Integración de red real de ads (Google AdSense u otra) — este spec deja el punto de reemplazo listo (el contenido interno de `AdInterstitial`) pero no crea cuenta de anunciante ni agrega ningún script de terceros.
- Rewarded video / continuar partida con ad — descartado en el brainstorming, no se revisita aquí.
- Cosméticos/skins premium, suscripción — otras vías de monetización evaluadas y descartadas para esta primera iteración; no se tocan `lib/games/*/engine.ts` de skins (spec 10) ni `components/AuthProvider.tsx`.
- Frecuencia/target configurable desde un panel admin — el "cada 3 partidas" y "countdown 5s" quedan hardcodeados; no hay superficie de configuración.
- Cualquier tracking de impresiones/analytics de ads — no forma parte de este spec (no hay red real conectada todavía, nada que trackear).
- `lib/supabase/**` — no tocado; el contador de ads vive enteramente en `localStorage`, no en la base de datos.

## Comportamiento esperado (para el plan de implementación)

1. Jugador entra a `/juegos/rocas/jugar`, juega y pierde → modal de game-over con REINICIAR/SALIR.
2. 1ª y 2ª vez que cierra el modal (cualquiera de los dos botones): acción normal, sin ad.
3. 3ª vez: antes de ejecutar la acción, aparece `AdInterstitial` con countdown. Al cerrarlo, se ejecuta la acción que el jugador había pedido (reinicia el juego o sale).
4. Contador de `rocas` vuelve a 0 tras la 3ª. El contador de `caida`, jugado en paralelo en otra pestaña o después, es independiente.

## Testing

Manual, sin test runner configurado en el proyecto (ver `CLAUDE.md`). Con `npm run dev`:

- Jugar `rocas` hasta game-over 3 veces seguidas, alternando REINICIAR y SALIR — confirmar que el ad aparece exactamente en el 3er cierre, no antes.
- Confirmar que el botón de cerrar del interstitial está deshabilitado hasta que el countdown llega a 0, y que al cerrarlo se ejecuta la acción correcta (si se disparó desde REINICIAR, el juego reinicia; si fue desde SALIR, navega afuera).
- Jugar `rocas` 2 veces y `caida` 1 vez — confirmar que `caida` no dispara el ad (contador independiente) y que el contador de `rocas` sigue en 2, no se resetea por jugar otro juego.
- Confirmar en DevTools que las keys `av_ad_count_rocas` / `av_ad_count_caida` en `localStorage` reflejan el conteo esperado y se resetean a 0 tras la 3ª partida de cada una.
- Simular `localStorage` no disponible (modo privado estricto o bloqueo manual vía DevTools) — confirmar que el juego sigue siendo jugable y REINICIAR/SALIR nunca quedan bloqueados por un error del hook.
