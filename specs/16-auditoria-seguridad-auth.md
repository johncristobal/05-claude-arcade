# SPEC 16 — Auditoría de seguridad: autenticación (plugin security-guidance)

> **Estado:** Draft
> **Depende de:** `14-auth-supabase.md` (Implemented) — Auth real auditada; `15-medidas-seguridad.md` (Implemented) — decisiones de CSP y RLS que esta auditoría confirma vigentes.
> **Fecha:** 2026-08-11
> **Objetivo:** Documentar la revisión de seguridad de autenticación hecha con el plugin `security-guidance`, confirmando que las decisiones de CSP (sin CSP) y RLS pública en `scores` (specs 14/15) siguen vigentes, y dejando registrado el único hallazgo nuevo — confirmación ausente en `guest()` antes de `signOut()` — como backlog sin implementar en este spec.

## Scope

**In:**

- Documentar en este spec los 4 hallazgos de la revisión con el plugin `security-guidance` sobre `AuthProvider.tsx`, `iniciar-sesion/page.tsx`, `lib/supabase/client.ts`, `lib/supabase/scores.ts`, `proxy.ts` y las policies RLS de `scores`/`games`.
- Confirmar explícitamente que el hallazgo CSP ya fue decidido en spec 15 (sin CSP) — sigue vigente, sin cambios.
- Confirmar explícitamente que el hallazgo RLS-sin-`user_id` en `scores` ya fue decidido en spec 15 (insert público intencional) — sigue vigente, sin cambios.
- Registrar el hallazgo nuevo — `guest()` en `app/iniciar-sesion/page.tsx:63-66` llama `signOut()` sin confirmación — como ítem de backlog, sin implementar el fix acá.
- Referencia cruzada a `113_auth.md` para el hallazgo de rate limiting/CAPTCHA — solo puntero, sin duplicar detalle.

**Fuera de alcance (para specs futuros):**

- Cualquier cambio de código (CSP, `user_id`, fix de `guest()`, rate limiting) — spec puramente documental.
- Reabrir spec 15 — si en el futuro se decide agregar CSP o `user_id`, va en spec nuevo aparte, no en este.
- Agente auditor de seguridad (`113_auth.md`) — trabajo separado.

## Metodología

Revisión hecha con el plugin `security-guidance` (marketplace `claude-plugins-official`), en dos capas:

1. **Capa de patrones regex** (Edit/Write hook, ~25 reglas: inyección eval/exec, deserialización insegura, sinks XSS, TLS/crypto mal configurado) — corrida sobre el código de autenticación. Resultado: limpio, sin hits (no hay `dangerouslySetInnerHTML`, `innerHTML=`, `eval(` en el código de auth).
2. **Revisión manual estilo capa 3 del plugin** (la capa agéntica de commit-review, que traza data flow entre archivos) — aplicada a mano trazando: `components/AuthProvider.tsx` → `app/iniciar-sesion/page.tsx` → `lib/supabase/client.ts` → `lib/supabase/scores.ts` → `proxy.ts`, más las policies RLS reales de `scores`/`games` consultadas vía Supabase MCP (`pg_policies`).

## Hallazgos

| #   | Hallazgo                                                                                                                                                                                                                                               | Severidad | Estado                                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Sin header `Content-Security-Policy` en `next.config.ts`. El cliente browser de Supabase guarda tokens en `localStorage` (no httpOnly); sin sink XSS activo hoy, pero sin CSP como defensa en profundidad si apareciera uno.                           | Medium    | **Confirmado vigente** — ya decidido explícitamente en `15-medidas-seguridad.md` ("Sí: solo los 3 headers del checklist, sin HSTS/Permissions-Policy/CSP — decisión explícita del usuario"). Sin cambios en este spec.                                                                          |
| 2   | Policy `INSERT` de `public.scores` (`"anyone can insert a score"`) no tiene binding a `auth.uid()` — cualquier cliente, autenticado o no, puede insertar con cualquier nombre de hasta 10 caracteres, suplantando a otros jugadores en el leaderboard. | Medium    | **Confirmado vigente** — ya decidido explícitamente en `15-medidas-seguridad.md` ("mismo INSERT público sin auth... no rompe JUGAR COMO INVITADO") y en `14-auth-supabase.md` ("No: gate de sesión en ninguna ruta... jugar y guardar score siguen siendo públicos"). Sin cambios en este spec. |
| 3   | Sin rate limit/CAPTCHA en login/signup; política de password solo validada client-side (mínimo 8 caracteres).                                                                                                                                          | Low       | **Referencia cruzada** — ya anotado como spec futuro en `113_auth.md` ("medidas de seguridad avanzadas"). No se implementa ni se duplica detalle acá.                                                                                                                                           |
| 4   | `guest()` en `app/iniciar-sesion/page.tsx:63-66` llama `signOut()` incondicionalmente al hacer click en "JUGAR COMO INVITADO". Si un usuario logueado clickea ese botón (misclick, back-nav), queda deslogueado sin confirmación.                      | Low       | **Nuevo — backlog**, sin fix en este spec (decisión explícita del usuario: solo documentar).                                                                                                                                                                                                    |

`proxy.ts` como no-op confirmado por diseño intencional (spec 14) — no hay gating de rutas en el server en toda la app. No es un hallazgo, solo contexto de la traza.

## Modelo de datos

No aplica — este spec no agrega ni modifica estructuras de datos ni tablas.

## Plan de implementación

1. Crear `specs/16-auditoria-seguridad-auth.md` (este archivo) con la metodología y los 4 hallazgos con severidad y estado. No hay paso de código — el archivo del spec es el artefacto final.

## Criterios de aceptación

- [ ] `specs/16-auditoria-seguridad-auth.md` existe y documenta los 4 hallazgos con severidad.
- [ ] Hallazgo CSP referencia spec 15 y su decisión "No CSP" explícitamente, sin proponer cambio.
- [ ] Hallazgo RLS-sin-`user_id` referencia spec 15 y su decisión "insert público" explícitamente, sin proponer cambio.
- [ ] Hallazgo `guest()`/`signOut()` queda anotado con `app/iniciar-sesion/page.tsx:63-66` como backlog, sin plan de implementación en este spec.
- [ ] Hallazgo rate limiting referencia `113_auth.md` sin duplicar contenido.
- [ ] Ningún archivo de código fuente del proyecto se modifica como parte de este spec.

## Decisiones tomadas y descartadas

- **Sí:** spec puramente documental, sin tocar código — evita reabrir decisiones ya cerradas en spec 15 sin pedido explícito del usuario.
- **No:** incluir el fix de `guest()`/`signOut()` en este spec — usuario decidió dejarlo como backlog documentado, no implementarlo ahora.
- **No:** reabrir CSP ni `user_id` en `scores` — ya decididos explícitamente en spec 15, no se reabren sin pedido explícito.
- **Sí:** rate limiting solo como referencia cruzada a `113_auth.md` — evita duplicar un ítem que ya tiene spec futuro dedicado.

## Lo que **no** está en este spec

- Implementación de CSP.
- Columna `user_id` / binding de identidad en `scores`.
- Fix de confirmación en `guest()` antes de `signOut()`.
- Rate limiting / CAPTCHA en login o signup.
- Agente auditor de seguridad.

Cada uno de estos, si se implementa, va en su propio spec.
