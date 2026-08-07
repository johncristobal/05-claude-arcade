# SPEC 14 — Autenticación real con Supabase

> **Estado:** Implemented
> **Depende de:** `06-leaderboard-real.md` (Approved) — define `saveScore`/`name` de 10 caracteres que este spec reutiliza sin modificar la firma.
> **Fecha:** 2026-08-06
> **Objetivo:** Reemplazar la autenticación falsa de `AuthProvider` (localStorage) por Supabase Auth real (email/password, Google y GitHub OAuth, y recuperación de contraseña) sobre las pantallas de registro/login ya existentes, sin volver obligatoria la cuenta para jugar.

## Scope

**In:**

- Reemplazar `components/AuthProvider.tsx`: en vez de `{name}` en `localStorage`, envuelve la sesión real de Supabase Auth (`supabase.auth.getSession()` + `onAuthStateChange`).
- `lib/types.ts`: `User` pasa a `{ id: string; email: string; name: string }`, donde `name` se deriva del prefijo del email (antes de `@`, mayúsculas, recortado a 10 caracteres) — mismo campo `name: string` que ya consumen `Nav.tsx`, `app/salon-de-fama/page.tsx` y `app/juegos/[id]/jugar/page.tsx`, así que esos tres archivos no cambian su lógica de consumo.
- `app/iniciar-sesion/page.tsx`: tab INICIAR SESIÓN usa `signInWithPassword`; tab CREAR CUENTA usa `signUp` y, tras el submit, reemplaza el formulario por un estado "Revisá tu correo para confirmar la cuenta" (mismo card, sin ruta nueva).
- Botones GOOGLE/GITHUB pasan a llamar `signInWithOAuth({ provider: "google" | "github" })`. El redirect de vuelta apunta a `/` — `AuthProvider` detecta la sesión nueva vía `onAuthStateChange` sin necesitar una ruta `/auth/callback` propia.
- Flujo "Olvidé mi contraseña": link nuevo en el tab INICIAR SESIÓN → estado inline que pide email → `resetPasswordForEmail`. El link del correo vuelve a `/iniciar-sesion`; `AuthProvider` escucha el evento `PASSWORD_RECOVERY` y la página muestra un formulario de nueva contraseña (mismo card, mismo patrón sin-ruta-nueva) → `supabase.auth.updateUser({ password })`.
- Validación de password en cliente: mínimo 6 caracteres (igual al mínimo que exige Supabase del lado servidor), feedback inmediato antes de enviar.
- Estados de error (email inválido, password corta, credenciales incorrectas, email ya registrado, etc.) reutilizando el patrón visual `.contact-error` (banner mono, borde magenta) ya usado en el formulario de contacto.
- `signOut` pasa a ser `supabase.auth.signOut()`.
- Confirmación de email activa (comportamiento default de Supabase, sin tocar configuración del dashboard salvo habilitar los providers OAuth).

**Fuera de alcance (para specs futuros):**

- Medidas de seguridad avanzadas (rate limiting, CAPTCHA, políticas de contraseña más estrictas) — ya planeadas como spec aparte en `113_auth.md`.
- Agente auditor de seguridad — spec aparte en `113_auth.md`.
- Perfiles de usuario (avatar, bio, username editable, historial de partidas) — no hay username en este spec, solo email derivado.
- Rutas protegidas / gate de sesión — toda la app sigue pública; jugar y guardar score no requiere cuenta (`JUGAR COMO INVITADO` se mantiene igual que hoy).
- Configuración de las apps OAuth de Google/GitHub en el dashboard de Supabase — es un prerequisito externo al repo que el usuario tiene que completar antes de poder probar esos dos botones; el spec asume que ya está hecho al momento de `/spec-impl`.

## Modelo de datos

Este feature no agrega tablas nuevas — reutiliza `auth.users`, manejada internamente por Supabase Auth (password hasheado, tokens de confirmación/recovery, todo fuera de nuestro schema `public`). No hace falta ninguna migración SQL.

Lo único que cambia es la forma del tipo `User` en `lib/types.ts`:

```ts
export interface User {
  id: string; // auth.users.id (uuid)
  email: string;
  name: string; // derivado de email.split("@")[0], mayúsculas, slice(0, 10)
}
```

Convenciones:

- `name` es siempre derivado, nunca se pide ni se guarda por separado — se recalcula cada vez que se lee la sesión.
- La sesión en sí (access token / refresh token) la persiste `@supabase/supabase-js` en su propio storage (localStorage, clave interna del SDK) — `AuthProvider` no vuelve a escribir manualmente en `localStorage` bajo `av_user` como hacía antes.
- `AuthContextValue` gana un estado adicional de carga inicial (`loading: boolean`) mientras `getSession()` resuelve, para que `Nav.tsx` no parpadee entre "Iniciar Sesión" y el nombre real al montar.

## Plan de implementación

1. **`lib/types.ts`** — actualizar `User` a `{ id, email, name }` como se definió en el modelo de datos. Sistema sigue compilando (los 3 consumidores solo leen `.name`, que se mantiene).
2. **`components/AuthProvider.tsx`** — reescribir para envolver Supabase Auth: `getSession()` inicial + `onAuthStateChange` (maneja `SIGNED_IN`, `SIGNED_OUT`, `PASSWORD_RECOVERY`), estado `loading`, y helper interno que deriva `User` desde la `Session` de Supabase (`email.split("@")[0]`). Expone `{ user, loading, isRecovery, login, signUp, signInWithOAuth, signOut, resetPasswordForEmail, updatePassword }`, todas async salvo `signOut`/lectura de `user`. Test manual: la app sigue montando, `Nav` muestra "Iniciar Sesión" (sin sesión) sin errores en consola.
3. **`components/Nav.tsx`** — ajuste mínimo: usar `loading` para no mostrar el botón de auth hasta que la sesión inicial resuelva (evita parpadeo). Resto de la lógica (`user.name`, `signOut`) no cambia.
4. **`app/iniciar-sesion/page.tsx` — login real** — tab INICIAR SESIÓN llama `login(email, password)` (Supabase `signInWithPassword`); en error muestra `.contact-error` con el mensaje de Supabase; en éxito redirige a `/` igual que hoy. Test manual: login con credencial inválida muestra el banner de error sin romper el formulario.
5. **`app/iniciar-sesion/page.tsx` — registro real** — tab CREAR CUENTA llama `signUp(email, password)`; en éxito reemplaza el card por el estado "Revisá tu correo para confirmar la cuenta" (sin redirigir); en error (email ya registrado, password < 6) muestra `.contact-error`. Test manual: registrar un email nuevo muestra el estado de confirmación; registrar uno existente muestra error.
6. **`app/iniciar-sesion/page.tsx` — OAuth** — botones GOOGLE/GITHUB llaman `signInWithOAuth({ provider, redirectTo: origin + "/" })`. Test manual (requiere que los providers ya estén configurados en el dashboard de Supabase): click en GOOGLE redirige al consent screen y vuelve a `/` autenticado.
7. **`app/iniciar-sesion/page.tsx` — recuperar contraseña** — link "¿Olvidaste tu contraseña?" en el tab INICIAR SESIÓN abre un estado inline (pide email) → `resetPasswordForEmail(email, { redirectTo: origin + "/iniciar-sesion" })`, muestra "Revisá tu correo". Al volver del link, `AuthProvider` detecta `PASSWORD_RECOVERY` (`isRecovery`) y la página muestra un formulario de nueva contraseña → `updatePassword(newPassword)` → redirige a `/`. Test manual: flujo completo de principio a fin con un usuario real de prueba.
8. **Guardar score / salón de fama** — sin cambios de código: `app/juegos/[id]/jugar/page.tsx` y `app/salon-de-fama/page.tsx` ya leen `user.name`, que sigue siendo `string`. Test manual: jugar autenticado guarda el score con el nombre derivado del email; jugar como invitado sigue funcionando igual que hoy.

## Criterios de aceptación

- [ ] Registrar una cuenta nueva con email+password muestra el estado "Revisá tu correo para confirmar la cuenta" en vez de loguear directo.
- [ ] Intentar registrar un email ya existente muestra un error visible (`.contact-error`), sin romper el formulario.
- [ ] Intentar registrar con password de menos de 6 caracteres muestra error antes de llamar a Supabase.
- [ ] Confirmar el email desde el link del correo y luego iniciar sesión con esas credenciales entra correctamente y `Nav` muestra el nombre derivado del email (prefijo antes de `@`, mayúsculas, máx. 10 caracteres).
- [ ] Iniciar sesión con credenciales incorrectas muestra error visible sin loguear.
- [ ] Click en GOOGLE u GITHUB redirige al consent screen del provider y, al volver, la sesión queda iniciada sin pasar por `/iniciar-sesion` de nuevo.
- [ ] "¿Olvidaste tu contraseña?" con un email válido dispara el correo de recuperación y muestra "Revisá tu correo".
- [ ] Abrir el link de recuperación muestra el formulario de nueva contraseña; al enviarlo, la sesión queda iniciada con la password nueva (verificable cerrando sesión y volviendo a entrar con ella).
- [ ] Cerrar sesión (`signOut`) vuelve `Nav` al estado "Iniciar Sesión" y limpia la sesión de Supabase (recargar la página no revive el usuario).
- [ ] Recargar la app con una sesión activa mantiene al usuario logueado (persistencia real, no solo en memoria).
- [ ] "JUGAR COMO INVITADO" sigue funcionando exactamente igual que hoy: sin sesión, puede jugar y guardar score.
- [ ] Un usuario autenticado que juega y guarda score ve su nombre derivado (no un campo libre) reflejado en el leaderboard de `salón-de-fama`.
- [ ] `npm run lint` pasa sin errores nuevos.

## Decisiones tomadas y descartadas

- **Sí:** Supabase Auth (email/password + OAuth) en vez de backend propio. Ya es el mismo proyecto Supabase que usa `scores`/`games`/presencia en `/en-vivo` — cero infraestructura nueva, password hashing y tokens los maneja Supabase.
- **No:** tabla `profiles` con username editable. El usuario decidió "solo email, sin username" — `name` se deriva del email en cada lectura de sesión, sin campo ni tabla extra que mantener sincronizada.
- **Sí:** `User.name` se sigue exponiendo como `string` derivado. Evita tocar `Nav.tsx`, `app/salon-de-fama/page.tsx` y `app/juegos/[id]/jugar/page.tsx`, que ya consumen `user.name` como string plano.
- **Sí:** confirmación de email activa (default de Supabase). Es "auth real", no un atajo de demo, y no requiere tocar configuración del dashboard.
- **Sí:** validación de password mínima (6 caracteres, el mínimo que Supabase exige igual del lado servidor). Reglas más estrictas (mayúscula+número, 8+) quedan para el spec de medidas de seguridad ya anotado en `113_auth.md` — hacerlo acá sería adelantarse a un spec que ya está planeado por separado.
- **No:** ruta `/auth/callback` dedicada para OAuth/PKCE. Al no haber SSR de sesión en ningún componente (todo el auth vive en `AuthProvider`, `"use client"`), alcanza con `detectSessionInUrl` (default del SDK) + `onAuthStateChange` escuchando en cualquier página tras el redirect a `/`. Simplifica el flujo sin sacrificar funcionalidad.
- **No:** página separada para "revisá tu correo" ni para "nueva contraseña". Mismo card de `/iniciar-sesion` cambia de estado interno, igual que ya hace hoy con los tabs INICIAR SESIÓN / CREAR CUENTA — consistente con el patrón existente, sin rutas nuevas.
- **No:** gate de sesión en ninguna ruta (`proxy.ts` sin cambios). Jugar y guardar score siguen siendo públicos; cuentas reales son identidad persistente, no un requisito de acceso.
- **Sí:** reset de password incluido en este spec (pedido explícito del usuario), aunque no estaba en el pedido original de una sola línea — se resolvió en la fase de preguntas, no amplía el alcance de forma no confirmada.
- **No:** implementar automáticamente los providers OAuth de Google/GitHub en el dashboard de Supabase — es configuración externa al repo, queda como prerequisito manual documentado en el Scope, no como parte del plan de implementación.

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                      | Mitigación                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los botones GOOGLE/GITHUB no funcionan hasta que se configuren esas apps OAuth en el dashboard de Supabase (fuera del repo, no lo puede hacer `/spec-impl`).                                                                                                | Documentado como prerequisito explícito en el Scope. Si al implementar los providers no están configurados, esos dos botones quedan como error esperado hasta que se complete la configuración manual — no bloquea el resto del spec (email/password sí funciona sin esa dependencia). |
| Emails de confirmación/recovery los envía el servicio de test de Supabase (rate-limited, ~pocos correos por hora) — no pasa por Resend como `/api/contact`.                                                                                                 | Suficiente para verificación manual de este spec. Si el rate limit se vuelve un problema real (ej. QA repetido), configurar SMTP propio en el dashboard queda fuera de este spec.                                                                                                      |
| Dos usuarios distintos con emails que comparten el mismo prefijo (`px_kai@gmail.com` y `px_kai@vault.gg`) muestran el mismo `name` derivado en el leaderboard, sin desambiguación.                                                                          | Aceptado conscientemente: es la misma ambigüedad que ya existe hoy con nombres libres de hasta 10 caracteres en `scores.name` (spec 06), no es una regresión. Si se vuelve un problema, un username único es un spec futuro.                                                           |
| El evento `PASSWORD_RECOVERY` de Supabase se dispara solo si el listener de `onAuthStateChange` está montado cuando se abre el link del correo — si `AuthProvider` no envuelve el layout raíz para ese momento, el estado de "nueva contraseña" no aparece. | `AuthProvider` ya está en `app/layout.tsx` envolviendo toda la app (confirmado en el código actual), así que el listener está activo en cualquier ruta donde caiga el redirect.                                                                                                        |

## Lo que **no** está en este spec

- Medidas de seguridad avanzadas (rate limiting, CAPTCHA, políticas de contraseña estrictas) y el agente auditor de seguridad — ambos ya anotados como specs futuros en `113_auth.md`.
- Perfiles de usuario editables (username, avatar, bio, historial de partidas).
- Rutas protegidas por sesión — toda la app sigue siendo pública.
- Configuración de las apps OAuth de Google/GitHub en el dashboard de Supabase — prerequisito manual externo al repo.

Cada uno de estos, si se implementa, va en su propio spec.
