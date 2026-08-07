# SPEC 15 — Medidas de seguridad (checklist)

> **Estado:** Implemented
> **Depende de:** `06-leaderboard-real.md` (Approved) — define `saveScore()`/clamp de `name` que la nueva policy replica en SQL; `14-auth-supabase.md` (Implemented) — Auth real sobre la que aplican los 3 ajustes de dashboard.
> **Fecha:** 2026-08-07
> **Objetivo:** Implementar el checklist de seguridad de `references/security/checklist.md` — endurecer la RLS de INSERT en `scores`, agregar headers de seguridad en Next.js, y documentar como prerequisito manual los 3 ajustes de Auth de Supabase (password mínimo 8, leaked password protection, rate limit de signup por IP).

## Scope

**In:**

- Migración SQL (vía `mcp__supabase__apply_migration`, proyecto dev `uworqrfrwyjoglantqhi`): reemplaza la policy `anyone can insert a score` en `public.scores` — mismo INSERT público sin auth, pero `WITH CHECK (score >= 0 AND length(trim(name)) > 0 AND length(name) <= 10)` en vez de `true` literal.
- `next.config.ts`: agrega `headers()` asíncrono con `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` sobre `/(.*)`.
- `app/iniciar-sesion/page.tsx`: sube la validación cliente de password de mínimo 6 a mínimo 8 caracteres (tab CREAR CUENTA y el formulario de nueva password del flujo de recuperación de spec 14), para que coincida con el nuevo mínimo de servidor.
- Sección "Prerequisitos manuales" (más abajo) documentando los 3 toggles exactos a cambiar en el dashboard de Supabase Auth.
- Proteccion de rutas con proxy. mas informacion aqui: https://nextjs.org/docs/app/getting-started/proxy
Ejemplo: proxy.ts
```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}
 
// Alternatively, you can use a default export:
// export default function proxy(request: NextRequest) { ... }
 
export const config = {
  matcher: '/about/:path*',
}
```

**Fuera de alcance (para specs futuros):**

- CAPTCHA/hCaptcha/Turnstile en el registro — ya diferido explícitamente en spec 14.
- Content-Security-Policy, HSTS, Permissions-Policy u otros headers más allá de los 3 del checklist — decisión confirmada de mantener el set mínimo.
- Agente auditor de seguridad (mencionado en `113_auth.md`) — trabajo aparte, no forma parte de este checklist.
- Rate limiting a nivel de aplicación en `/api/contact` u otras rutas — el checklist solo cubre signup.
- Password policy más estricta que "8 caracteres mínimo" (mayúscula+número, etc.) — no está en el checklist.
- Cambios a RLS de `games` — ya solo tiene `SELECT` pública, sin policies de escritura que endurecer.

## Modelo de datos

No se agregan tablas. Único cambio: la policy de `scores`.

```sql
drop policy "anyone can insert a score" on public.scores;

create policy "anyone can insert a score"
on public.scores
for insert
to public
with check (
  score >= 0
  and length(trim(name)) > 0
  and length(name) <= 10
);
```

Convenciones:

- El insert sigue siendo público (sin auth) — no rompe `JUGAR COMO INVITADO`.
- Los límites replican exactamente el clamp que ya hace `saveScore()` en `lib/supabase/scores.ts` (`score = Math.max(0, ...)`, `name.trim().slice(0, 10)`), así que un cliente que respete la app no nota diferencia; solo bloquea un insert directo a la REST API que se salte esa capa.

## Plan de implementación

1. **Migración SQL** — `apply_migration` sobre el proyecto dev: drop + recreate de la policy de INSERT en `scores` como se define en el modelo de datos. Test manual: `saveScore()` desde la app sigue guardando scores válidos sin sesión; un insert directo por SQL con `score < 0` o `name` vacío es rechazado por RLS.
2. **`next.config.ts`** — agregar `securityHeaders` y `headers: async () => [...]` con los 3 headers del checklist, aplicados a `/(.*)`. Test manual: `curl -I` contra el dev server muestra los 3 headers en la respuesta.
3. **`app/iniciar-sesion/page.tsx`** — subir el mínimo de password de 6 a 8 en la validación de CREAR CUENTA y en el formulario de nueva password (recuperación). Test manual: password de 7 caracteres muestra error de validación antes de llamar a Supabase; password de 8+ sigue funcionando igual que en spec 14.
4. **(Manual, fuera de `/spec-impl`)** — Configurar en el dashboard de Supabase Auth (Authentication → Policies / Auth settings del proyecto dev): Minimum password length = 8, Leaked password protection = ON, rate limit de signup por IP (valor default recomendado de Supabase). Ver "Prerequisitos manuales" abajo.

## Prerequisitos manuales

Estos 3 ajustes no son ejecutables por `/spec-impl` — ninguna tool del MCP de Supabase disponible (`apply_migration`, `execute_sql`, `get_advisors`, etc.) expone la configuración de Auth. Se configuran a mano en el dashboard de Supabase (proyecto `uworqrfrwyjoglantqhi`), mismo patrón que la configuración de las apps OAuth en spec 14:

1. **Authentication → Policies (Password)**: subir "Minimum password length" a `8`.
2. **Authentication → Policies (Leaked password protection)**: activar el toggle (usa HaveIBeenPwned.org).
3. **Authentication → Rate Limits**: configurar el límite de sign ups por IP (valor default recomendado de Supabase, salvo que el usuario prefiera uno específico).

Hasta que estos 3 pasos se completen manualmente, el criterio de aceptación correspondiente queda pendiente aunque el resto del spec esté implementado.

## Criterios de aceptación

- [ ] `get_advisors(type: security)` ya no reporta `rls_policy_always_true` para `scores`.
- [ ] Un insert de score válido (score ≥0, name 1–10 chars) desde la app sigue funcionando sin sesión (invitado).
- [ ] Un insert directo con score negativo o name vacío es rechazado por RLS.
- [ ] `curl -I` en dev incluye `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] Crear cuenta con password de menos de 8 caracteres muestra error de validación en cliente antes de llamar a Supabase.
- [ ] Crear cuenta con password de 8+ caracteres sigue funcionando igual que en spec 14.
- [ ] `npm run lint` pasa sin errores nuevos.
- [ ] (Manual, verificado por el usuario) Los 3 toggles de Auth en el dashboard quedan configurados según "Prerequisitos manuales".

## Decisiones tomadas y descartadas

- **Sí:** endurecer el `WITH CHECK` en vez de dejar el warning aceptado o requerir auth para insertar — mantiene el invitado funcionando, resuelve el linter, agrega defensa real contra un cliente que le pegue directo a la REST API.
- **No:** CAPTCHA en signup — ya diferido en spec 14, no se adelanta acá.
- **Sí:** solo los 3 headers del checklist, sin HSTS/Permissions-Policy/CSP — decisión explícita del usuario.
- **Sí:** los 3 ajustes de Auth dashboard quedan como prerequisito manual documentado, mismo patrón que OAuth en spec 14 — ningún tool del MCP de Supabase expone esa config.
- **No:** agente auditor de seguridad — trabajo separado anotado en `113_auth.md`, no es parte de este checklist.

## Riesgos identificados

| Riesgo                                                                                                                                                | Mitigación                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Los 3 toggles de dashboard no se configuran nunca (dependen del usuario, no del código).                                                              | El spec documenta los pasos exactos y un criterio de aceptación manual explícito para forzar la verificación.                                  |
| Subir el mínimo de password a 8 en cliente sin subirlo también en el dashboard deja una inconsistencia (cliente exige 8, servidor sigue aceptando 6). | Los pasos 3 (cliente) y 4 (dashboard) quedan listados juntos en el plan para hacerse en la misma pasada.                                       |
| La migración SQL se aplica sobre el proyecto de Supabase — hay que confirmar que `uworqrfrwyjoglantqhi` es el proyecto de dev, no prod.               | `CLAUDE.md` ya documenta ese proyecto como el único configurado en `.mcp.json` ("Dev project only, never prod"); se confirma antes de aplicar. |

## Lo que **no** está en este spec

- CAPTCHA/anti-bot avanzado en el registro.
- CSP/HSTS/Permissions-Policy.
- Agente auditor de seguridad.
- Rate limiting de `/api/contact`.
- Password policy más allá de longitud mínima.

Cada uno de estos, si se implementa, va en su propio spec.
