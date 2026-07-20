# 03 — Resend en formulario de contacto

## Header

- **Estado:** Implementado
- **Dependencias:** `02-home-about.md` (Implementado/Approved) — reemplaza el mock UI del formulario de contacto en `app/acerca-de/page.tsx`
- **Fecha:** 2026-07-20
- **Objetivo:** Conectar el formulario de contacto de `/acerca-de` a un envío real de correo vía Resend, a través de un Route Handler propio, manteniendo la UI de éxito existente y agregando validación server-side y un estado de error.

## Scope

**Incluido:**

- Instalar paquete `resend` (npm).
- `app/api/contact/route.ts` — nuevo Route Handler POST. Recibe `{ name, email, message }`, valida server-side (no vacíos, `email` formato válido), llama a Resend `emails.send()` con sender de prueba `onboarding@resend.dev`, destinatario fijo desde `process.env.CONTACT_EMAIL`. Devuelve JSON `{ ok: true }` o `{ ok: false, error }` con status apropiado (200/400/500).
- `.env.local` (no versionado, ya cubierto por `.env*` en `.gitignore`) con `RESEND_API_KEY` y `CONTACT_EMAIL`.
- `.env.example` nuevo — documenta las dos variables requeridas (sin valores reales) para que cualquiera que clone el repo sepa qué configurar.
- `app/acerca-de/page.tsx` — `onSubmit` pasa a ser `async`, hace `fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })`; agrega estado `sending` (deshabilita botón + texto "ENVIANDO…" mientras espera) y estado `error` (mensaje inline debajo del formulario si el fetch falla o el servidor responde `ok: false`). Si responde OK, se mantiene el flujo actual (`setSent(form.name.trim())`).
- Validación server-side básica: nombre/email/mensaje no vacíos tras `trim()`, email con regex simple. Si falla, responde 400 sin llamar a Resend.

**Explícitamente fuera de alcance:**

- Dominio verificado propio en Resend / from-address personalizado (`contact@arcadevault.gg` etc.) — queda para cuando haya dominio real verificado.
- Rate limiting / protección anti-spam (captcha, honeypot, límite de requests).
- Persistencia de mensajes de contacto (DB, `localStorage`, log a archivo). El mensaje solo se envía por correo, no se guarda.
- Reintentos automáticos si falla el envío — el usuario debe reenviar manualmente.
- Templates HTML de email con diseño — el cuerpo del correo es texto plano simple.
- Notificaciones de confirmación al remitente (solo se le avisa el equipo, no se envía copia automática al usuario que llenó el form).
- Tests automatizados (sigue sin haber test runner).

## Modelo de datos

No se agregan tipos TypeScript nuevos ni estructuras persistentes (no hay `localStorage` ni DB involucrados). Solo el contrato del Route Handler:

**Request** (`POST /api/contact`, JSON body):
```ts
{
  name: string;
  email: string;
  message: string;
}
```

**Response:**
```ts
// éxito
{ ok: true }

// error (validación 400, o fallo de Resend 500)
{ ok: false; error: string }
```

**Variables de entorno** (`.env.local`, no versionado):

| Variable | Valor | Uso |
|---|---|---|
| `RESEND_API_KEY` | API key de Resend (modo test) | Auth del SDK `resend` en el Route Handler |
| `CONTACT_EMAIL` | Email destino (tu cuenta Resend) | Destinatario fijo de `emails.send()` |

`.env.example` documenta ambas claves con placeholder (`RESEND_API_KEY=re_xxx`, `CONTACT_EMAIL=tu-email@ejemplo.com`), sin valores reales.

## Plan de implementación

1. **Instalar dependencia**: `npm install resend`. El proyecto sigue compilando igual que hoy, sin cambios funcionales todavía.

2. **Variables de entorno**: crear `.env.example` (versionado) con `RESEND_API_KEY` y `CONTACT_EMAIL` como placeholders; crear `.env.local` (no versionado) con la API key real de Resend (modo test) y el email destino. El sitio sigue funcionando igual, variables aún no usadas.

3. **Route Handler**: crear `app/api/contact/route.ts` con `export async function POST(req: Request)` — parsea JSON, valida `name`/`email`/`message` (no vacíos tras `trim()`, `email` con regex simple), si falla responde `400` con `{ ok: false, error }`; si pasa, instancia `new Resend(process.env.RESEND_API_KEY)` y llama `resend.emails.send({ from: "onboarding@resend.dev", to: process.env.CONTACT_EMAIL, subject: ..., text: ... })`; responde `200 { ok: true }` en éxito o `500 { ok: false, error }` si Resend lanza error (try/catch). Endpoint probado con `curl` antes de tocar UI.

4. **Conectar formulario**: en `app/acerca-de/page.tsx`, convertir `onSubmit` a `async`, agregar estados `sending` (boolean) y `error` (string | null). Al enviar: validar campos vacíos (shake, igual que hoy) → si pasa, `setSending(true)`, `fetch("/api/contact", ...)`, en éxito `setSent(...)` (flujo actual sin cambios), en fallo `setError(...)` y no avanzar a `sent`; siempre `setSending(false)` al final. Botón muestra "ENVIANDO…" y `disabled` mientras `sending`. Mensaje de error se renderiza debajo del botón si `error` no es `null`, se limpia al reintentar envío.

5. **Cierre**: enviar formulario real desde el navegador, confirmar que el correo llega a la cuenta Resend (dashboard o inbox real si `CONTACT_EMAIL` es email real); probar caso de error simulando `RESEND_API_KEY` inválida o `CONTACT_EMAIL` vacío para ver el estado de error en UI; correr `npm run lint` y `npm run build`.

## Criterios de aceptación

- [x] `npm run build` compila sin errores de tipos ni de lint.
- [x] `.env.example` existe versionado con `RESEND_API_KEY` y `CONTACT_EMAIL` como placeholders (sin valores reales).
- [x] `.env.local` (no versionado) contiene los valores reales y no aparece en `git status`.
- [x] `POST /api/contact` con body válido (`name`, `email`, `message` no vacíos) envía un correo real vía Resend y responde `200 { ok: true }`.
- [x] `POST /api/contact` con algún campo vacío o `email` con formato inválido responde `400 { ok: false, error }` sin llamar a Resend.
- [x] `POST /api/contact` con `RESEND_API_KEY` inválida o error de Resend responde `500 { ok: false, error }`.
- [x] En `/acerca-de`, enviar el formulario con campos vacíos dispara el shake (comportamiento actual, sin cambios).
- [x] En `/acerca-de`, enviar el formulario completo muestra "ENVIANDO…" (botón deshabilitado) mientras espera, y al confirmarse el envío muestra el bloque de éxito terminal existente con el nombre ingresado.
- [x] En `/acerca-de`, si el envío falla (simulando error de servidor), se muestra un mensaje de error inline debajo del botón, el formulario permanece visible con los datos ingresados, y el usuario puede reintentar manualmente.
- [x] El correo recibido en `CONTACT_EMAIL` contiene nombre, email y mensaje del formulario.

## Decisiones tomadas y descartadas

- **Route Handler propio (`app/api/contact/route.ts`)**, no Server Action. Motivo: endpoint explícito, testeable con `curl` independiente de la UI, patrón estándar en ejemplos de Resend.
- **Sender de prueba `onboarding@resend.dev`**, no dominio propio verificado. Motivo: no hay dominio verificado en Resend todavía; se pospone a spec futuro cuando exista.
- **Destinatario fijo vía `CONTACT_EMAIL`** (env var), no configurable ni múltiple. Motivo: un solo equipo/persona recibe los mensajes; coherente con el patrón minimalista sin backend/DB del proyecto.
- **Validación server-side agregada** (no solo confiar en el cliente). Motivo: defensa en profundidad — JS del cliente puede saltarse; endpoint queda expuesto a cualquier `POST` directo.
- **Sin persistencia del mensaje** (ni DB ni `localStorage`). Motivo: el correo es la única "base de datos" — mismo criterio minimalista que specs 01/02; no hay flujo posterior que necesite leer mensajes históricos.
- **Sin reintentos automáticos ni rate limiting/anti-spam.** Motivo: fuera de alcance para este spec — proyecto en modo test, tráfico bajo, se revisita si se vuelve problema real.
- **`.env.example` versionado, `.env.local` no.** Motivo: documenta qué configurar sin exponer secretos reales en el repo.
- **Sin tests automatizados.** Motivo: no hay test runner configurado; verificación manual (formulario real + `curl` al endpoint) + `npm run lint`/`build`.

## Riesgos identificados

- **API key expuesta accidentalmente.** Si `RESEND_API_KEY` se usa mal (ej. en un componente cliente en vez de solo el Route Handler), se filtra al bundle público. Mitigación: SDK `resend` solo se instancia dentro de `route.ts` (server-only), nunca importado en `"use client"` files.
- **Modo test de Resend limita destinatarios.** Con `onboarding@resend.dev`, Resend puede restringir el envío solo a la cuenta verificada del dueño de la API key — si `CONTACT_EMAIL` es otro correo, el envío podría fallar silenciosamente o rebotar. Mitigación: verificar en el dashboard de Resend qué restricciones aplica el modo test antes de dar el spec por cerrado; usar el email de la propia cuenta Resend como `CONTACT_EMAIL` si aplica.
- **`.env.local` con secretos reales no se commitee por error.** Ya cubierto por `.env*` en `.gitignore`, pero riesgo si alguien fuerza `git add -f`. Mitigación: ninguna acción extra, solo atención al hacer commits futuros.
