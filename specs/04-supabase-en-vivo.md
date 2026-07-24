# 04 — Supabase: presencia en vivo

## Header

- **Estado:** Approved
- **Dependencias:** `01-mvp-visual-pantallas.md` (Implementado) — reutiliza `Nav`, patrón de páginas App Router. Sin dependencia funcional de `02`/`03`.
- **Fecha:** 2026-07-24
- **Objetivo:** Instalar Supabase en el proyecto e implementar página nueva `/en-vivo` con presencia en tiempo real (Supabase Realtime Presence) que muestra qué visitantes están conectados ahora mismo, usando sesión anónima de Supabase Auth por visitante con nombre de invitado autogenerado, sin crear tablas nuevas ni tocar login/signup real (queda para spec futuro).

## Scope

**Incluido:**

- Instalar paquete `@supabase/supabase-js` (npm).
- `lib/supabase/client.ts` — factory de cliente browser (`createClient(url, anonKey)`), usa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `.env.local` (no versionado) con las dos vars de arriba, valores reales del proyecto ya linkeado (`uworqrfrwyjoglantqhi.supabase.co`).
- `.env.example` (versionado) — documenta las dos vars con placeholder, mismo patrón que spec 03.
- `app/en-vivo/page.tsx` — página nueva `"use client"`. Al montar: `supabase.auth.signInAnonymously()` (reusa sesión si ya existe una anónima activa en el browser), genera nombre invitado tipo `INVITADO_XXXX` (4 dígitos random, client-side, no persistido), se une a un canal Realtime Presence (`en-vivo`), hace `channel.track({ name, online_at })`. Escucha eventos `sync`/`join`/`leave` para render en vivo. Al desmontar: `channel.untrack()` + `removeChannel()`.
- UI de la página: lista de nombres conectados ahora mismo + contador total, estilo consistente con el resto del sitio (mono/pixel, ver `globals.css`).
- `components/Nav.tsx` — agregar link "EN VIVO" → `/en-vivo` (5º link, desktop + panel móvil), con su lógica de estado activo (`pathname === "/en-vivo"`).

**Explícitamente fuera de alcance:**

- Login/signup real con email+password, confirmación de email, OAuth Google/GitHub — todo el flujo de Auth "de verdad" queda para spec futuro.
- Tabla `profiles` / username persistente — no se crea ninguna tabla.
- Persistencia de scores/leaderboard real vía DB — no confundir con este spec; Salón de la Fama sigue con `seededScores` fake.
- Reemplazar el bloque "actividad en vivo" (ticker + top jugadores) de Home (spec 02) — sigue con sus datos literales estáticos, sin tocar. `/en-vivo` es página nueva independiente.
- Rastrear qué juego está jugando cada invitado — solo lista de nombres conectados, sin detalle de actividad.
- RLS/políticas — no aplica, cero tablas nuevas.
- Tests automatizados (sigue sin haber test runner).

## Modelo de datos

No se agregan tablas ni tipos persistentes en Postgres (sin DB involucrada). Solo una estructura en memoria para el payload de presence:

```ts
// lib/types.ts (nuevo tipo)
export interface PresenceGuest {
  name: string; // "INVITADO_4821"
  online_at: string; // ISO timestamp, new Date().toISOString()
}
```

Cada cliente hace `channel.track(guest: PresenceGuest)` al entrar a `/en-vivo`. El estado de la sala (`channel.presenceState()`) es un `Record<string, PresenceGuest[]>` keyeado por `presence_ref` de Supabase — no se define tipo custom para eso, se usa el que expone `@supabase/supabase-js`.

**Variables de entorno** (`.env.local`, no versionado):

| Variable                        | Valor                                      | Uso                                                                 |
| ------------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://uworqrfrwyjoglantqhi.supabase.co` | URL del proyecto, cliente browser                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable key del proyecto          | Auth del cliente `supabase-js` (público, seguro exponer en browser) |

`.env.example` documenta ambas con placeholder (`NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx`), sin valores reales.

## Plan de implementación

1. **Instalar dependencia**: `npm install @supabase/supabase-js`. Proyecto sigue compilando igual, sin cambios funcionales todavía.

2. **Variables de entorno**: crear `.env.example` (versionado) con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` como placeholders; crear `.env.local` (no versionado) con los valores reales del proyecto ya linkeado (URL confirmada, anon key vía dashboard/MCP). Sitio sigue funcionando igual, variables aún no usadas.

3. **Cliente Supabase + tipo**: crear `lib/supabase/client.ts` exportando `createClient()` (browser, `createBrowserClient` o `createClient` de `@supabase/supabase-js` con las env vars); agregar `PresenceGuest` a `lib/types.ts`. Nada los importa todavía, cero cambio visible.

4. **Página `/en-vivo`**: crear `app/en-vivo/page.tsx` (`"use client"`). Al montar: `supabase.auth.signInAnonymously()`, generar `INVITADO_XXXX` (random 4 dígitos), unirse a canal `en-vivo`, `channel.track({ name, online_at })`, suscribirse a `sync`/`join`/`leave` para actualizar lista en estado local; render lista de nombres + contador; al desmontar `channel.untrack()` + `supabase.removeChannel()`. Ruta nueva accesible y funcional, resto del sitio intacto.

5. **Nav**: actualizar `components/Nav.tsx` — agregar link "EN VIVO" → `/en-vivo` (desktop + panel móvil), estado activo `pathname === "/en-vivo"`.

6. **Cierre**: abrir `/en-vivo` en dos pestañas/navegadores distintos, confirmar que cada uno ve aparecer al otro en tiempo real (join) y desaparecer al cerrar/salir (leave), contador correcto; revisar Nav (5 links, orden y estado activo) en todas las rutas existentes; correr `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores de tipos ni de lint.
- [ ] `.env.example` existe versionado con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` como placeholders (sin valores reales).
- [ ] `.env.local` (no versionado) contiene los valores reales y no aparece en `git status`.
- [ ] `/en-vivo` carga y muestra la lista de invitados conectados (vacía si solo hay una sesión, con nombres si hay más).
- [ ] Abrir `/en-vivo` en dos pestañas/navegadores distintos: cada una ve aparecer al otro en la lista en tiempo real, sin refrescar.
- [ ] Cerrar una pestaña o navegar fuera de `/en-vivo`: la otra pestaña ve desaparecer ese nombre en tiempo real.
- [ ] Cada visitante recibe nombre `INVITADO_XXXX` autogenerado, distinto por sesión.
- [ ] El contador total coincide con el número de sesiones activas en la página.
- [ ] `Nav` (desktop y panel móvil) muestra "EN VIVO" como 5º link en todas las rutas, con estado activo correcto en `/en-vivo`.
- [ ] No se crea ninguna tabla nueva en la base de datos (`list_tables` sin tablas relacionadas a este spec).
- [ ] `AuthProvider.tsx` y el flujo mock de `/iniciar-sesion` permanecen sin cambios funcionales.

## Decisiones tomadas y descartadas

- **Solo Realtime Presence, sin Auth real (login/signup/OAuth).** Motivo: acotar el spec a una pieza ejecutable de punta a punta; auth completo abre demasiados dominios (confirmación email, profiles, OAuth) — spec futuro.
- **Sesión anónima de Supabase (`signInAnonymously`)**, no tracking sin auth. Motivo: decisión ya confirmada por el usuario; da identidad real por visitante sin pedir registro, compatible con Realtime Authorization de canales privados.
- **Nombre `INVITADO_XXXX` autogenerado**, no pedido al usuario. Motivo: cero fricción para ver la feature funcionando, sin formularios nuevos.
- **Cero tablas nuevas / RLS.** Motivo: decisión explícita del usuario — presence vive solo en el canal Realtime (`track`/`presenceState`), no en Postgres.
- **Página nueva `/en-vivo`, no reemplaza el ticker de Home.** Motivo: el ticker de Home (spec 02) usa datos literales estáticos por diseño; mezclar ahí presence real es otro spec si se quiere.
- **`AuthProvider.tsx` intacto.** Motivo: decisión explícita — evitar tocar el mock de auth actual hasta que exista spec real de Auth, minimiza riesgo de romper `/iniciar-sesion`/`/salon-de-fama`.
- **`@supabase/supabase-js` directo (cliente browser), no `@supabase/ssr`.** Motivo: sin sesión server-side/cookies necesaria en este scope (no hay rutas protegidas ni Server Components leyendo usuario); se evalúa `@supabase/ssr` cuando exista spec de Auth real con sesión persistente.
- **Sin tests automatizados.** Motivo: no hay test runner configurado; verificación manual (dos pestañas/navegadores) + `npm run lint`/`build`.

## Riesgos identificados

- **Acumulación de usuarios anónimos.** Cada visita a `/en-vivo` crea un registro en `auth.users` (sesión anónima), sin expiración automática visible. Con tráfico sostenido, la tabla de auth crece indefinidamente. Mitigación: aceptable para este scope (proyecto en desarrollo, tráfico bajo); revisar limpieza periódica o TTL si se vuelve real problema.
- **Presence no se limpia si el cierre es abrupto** (crash de pestaña, pérdida de red sin `beforeunload`). Supabase Realtime maneja esto vía heartbeat/timeout interno y remueve al usuario tras el timeout, pero puede haber unos segundos de nombre "fantasma" en la lista. Mitigación: ninguna acción extra — comportamiento esperado de Presence, se documenta como limitación conocida.
- **Límites del free tier de Supabase Realtime** (conexiones concurrentes). Con pocos usuarios de prueba no aplica, pero si `/en-vivo` se comparte públicamente podría alcanzar el límite. Mitigación: ninguna acción ahora, revisar dashboard de Supabase si se reporta degradación.
