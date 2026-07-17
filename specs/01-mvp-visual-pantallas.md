# 01 — MVP visual: pantallas de Arcade Vault

## Header

- **Estado:** Implementado
- **Dependencias:** Ninguna (primer spec del proyecto)
- **Fecha:** 2026-07-17
- **Objetivo:** Implementar la interfaz visual completa de Arcade Vault (biblioteca, detalle de juego, reproductor placeholder, autenticación mock y salón de la fama) en Next.js App Router, portando el prototipo estático de `references/templates/`, sin implementar lógica real de ningún juego.

## Scope

**Incluido:**

- 5 pantallas visuales, portadas 1:1 desde `references/templates/` a Next.js App Router + TypeScript:
  - `/` — Biblioteca (hero, buscador, filtro por categoría, grid de `GameCard`)
  - `/juegos/[id]` — Detalle de juego (info, tags, leaderboard mock, botón jugar)
  - `/juegos/[id]/jugar` — Reproductor (HUD, CRT frame, demo de score con `setInterval`, pausa, fin de juego, guardar puntuación)
  - `/iniciar-sesion` — Auth (tabs iniciar/crear cuenta, invitado, botones sociales decorativos)
  - `/salon-de-fama` — Hall of Fame (tabs por juego, podio top 3, tabla de puntuaciones)
- `Nav` global (desktop + panel móvil) en `app/layout.tsx`, con estado de sesión reactivo entre rutas.
- Sesión de usuario mock vía `localStorage` (`av_user`), compartida entre rutas con un `AuthProvider` (context, client component).
- Guardado de puntuaciones mock vía `localStorage` (`av_scores`) al terminar una partida.
- Datos hardcodeados: `GAMES`, `CATS`, `PLAYERS`, `seededScores` portados a `lib/data.ts` con tipos en `lib/types.ts`.
- Estilos: `globals.css` (ya portado desde `styles.css`) y fuentes `next/font/google` (ya configuradas en `layout.tsx`) — reutilizar, no reescribir.
- Textos/elementos decorativos sin lógica real (créditos fijos, botones GOOGLE/GITHUB, versión en footer) tal cual el template.

**Explícitamente fuera de alcance:**

- Cualquier juego jugable real (canvas, lógica de colisiones, input de teclado/táctil real). El "reproductor" es una simulación visual de puntuación, no un juego.
- Backend / API real, base de datos, autenticación real (OAuth, contraseñas verificadas, sesiones server-side).
- Persistencia más allá de `localStorage` del navegador.
- Registro/gestión real de usuarios (edición de perfil, recuperación de contraseña, etc.).
- Tests automatizados (no hay test runner configurado en el proyecto).
- Optimización de imágenes/assets reales — el "cover art" sigue siendo CSS generativo (gradientes/clases), no imágenes.
- Cualquier pantalla o flujo no presente en `references/templates/`.

## Modelo de datos

Sin base de datos ni API — solo tipos TypeScript y datos mock en memoria/`localStorage`.

**`lib/types.ts`**

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;   // clase CSS, ej. "cover-bricks"
  color: GameColor;
  best: number;
  plays: string;   // ej. "12.4K"
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;    // "DD/MM/AAAA"
}

export interface User {
  name: string;
}

export interface SavedScore {
  game: string;   // Game.id
  score: number;
  name: string;
  at: number;     // Date.now()
}
```

**`lib/data.ts`** — exporta `GAMES: Game[]`, `CATS: string[]`, `PLAYERS: string[]`, y la función `seededScores(seed, count): ScoreRow[]`, portados tal cual desde `data.jsx` (mismo generador pseudoaleatorio determinista, sin librerías nuevas).

**`localStorage`:**

| Key         | Tipo           | Escrito por                         | Leído por                    |
|-------------|----------------|--------------------------------------|-------------------------------|
| `av_user`   | `User \| null` | `AuthProvider` (login/signout)       | `Nav`, `/salon-de-fama`, `/juegos/[id]/jugar` |
| `av_scores` | `SavedScore[]` | `/juegos/[id]/jugar` (guardar puntuación) | — (no se lee en este MVP, solo se acumula) |

`AuthProvider` (`components/AuthProvider.tsx`, client component) envuelve `children` en `app/layout.tsx`, expone `user`, `login(user)`, `signOut()` vía context, sincronizando con `av_user`.

## Plan de implementación

1. **Fundaciones de datos**: crear `lib/types.ts` y `lib/data.ts` portando `Game`, `ScoreRow`, `User`, `SavedScore`, `GAMES`, `CATS`, `PLAYERS`, `seededScores` desde `data.jsx`. Sin UI aún — el proyecto sigue compilando igual que hoy.

2. **Sesión + navegación global**: crear `components/AuthProvider.tsx` (context client component, sincroniza `av_user` con `localStorage`) y `components/Nav.tsx` (desktop + panel móvil, porta `nav.jsx` usando `usePathname`/`Link` de Next en vez de la prop `route`/`navigate` del template). Envolver `app/layout.tsx` con `AuthProvider` y renderizar `Nav` antes de `children`. El sitio sigue funcionando (home actual) con nav real ya visible.

3. **Biblioteca (`/`)**: crear `components/GameCard.tsx` (porta el tilt-on-hover de `biblioteca.jsx`) y reescribir `app/page.tsx` con hero, buscador, chips de categoría y grid, usando `GAMES`/`CATS` de `lib/data.ts`. `GameCard` navega con `Link` a `/juegos/[id]`.

4. **Detalle de juego (`/juegos/[id]`)**: crear `app/juegos/[id]/page.tsx` portando `detalle.jsx` (cover, tags, stats, leaderboard con `seededScores`, botones "Jugar ahora" → `/juegos/[id]/jugar` y "Volver al vault" → `/`). `notFound()` si el `id` no existe en `GAMES`.

5. **Reproductor (`/juegos/[id]/jugar`)**: crear `app/juegos/[id]/jugar/page.tsx` (client component) portando `reproductor.jsx` — HUD, CRT frame, `setInterval` de score, pausa, fin de juego, modal de guardar puntuación (escribe en `av_scores` vía `localStorage`), usando `user` de `AuthProvider` para prellenar el nombre.

6. **Auth (`/iniciar-sesion`)**: crear `app/iniciar-sesion/page.tsx` portando `auth.jsx` — tabs iniciar/crear cuenta, "jugar como invitado", botones sociales decorativos. Usa `AuthProvider.login()` y redirige a `/` con `router.push`.

7. **Salón de la Fama (`/salon-de-fama`)**: crear `app/salon-de-fama/page.tsx` portando `salon.jsx` — tabs por juego, podio top 3, tabla, fila "tu mejor marca" si hay `user` en sesión.

8. **Cierre**: agregar footer estático (texto del template) en `app/layout.tsx` si no quedó de un paso anterior; recorrer las 5 rutas a mano en el navegador comparando contra `references/templates/`; correr `npm run lint` y `npm run build` y resolver cualquier error de tipos.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores de tipos ni de lint.
- [ ] `/` muestra el hero, buscador funcional (filtra por título en tiempo real) y chips de categoría (filtra por `cat`), renderizando las 8 tarjetas de `GAMES` por defecto.
- [ ] Click en una `GameCard` (o su botón "Jugar") navega a `/juegos/[id]` con el `id` correcto.
- [ ] `/juegos/[id]` muestra info del juego y un leaderboard de 10 filas generado por `seededScores`; `/juegos/id-inexistente` responde 404.
- [ ] Botón "Jugar ahora" en detalle navega a `/juegos/[id]/jugar`.
- [ ] En `/juegos/[id]/jugar`: el score sube solo cada ~220ms, "Pausa" detiene el incremento y cambia a "Reanudar", "Fin" abre el modal de fin de juego con el score final.
- [ ] Guardar puntuación en el modal escribe una entrada en `localStorage["av_scores"]` y muestra el mensaje de confirmación.
- [ ] `/iniciar-sesion`: enviar el formulario (cualquier usuario/contraseña) o pulsar "Jugar como invitado" crea/limpia `localStorage["av_user"]` y redirige a `/`.
- [ ] Tras iniciar sesión, el `Nav` en cualquier ruta muestra el nombre de usuario en vez de "Iniciar Sesión", sin recargar la página.
- [ ] `/salon-de-fama` muestra tabs por cada juego, podio top 3 y tabla de 12 filas; si hay sesión activa, muestra la fila "tu mejor marca".
- [ ] El panel de menú móvil del `Nav` abre/cierra y sus links navegan correctamente.
- [ ] Ningún archivo de `references/templates/` fue importado o servido directamente en producción — todo el código vive portado en `app/`, `components/`, `lib/`.

## Decisiones tomadas y descartadas

- **Rutas reales de App Router** en vez de hash-router single-page (como el template). Motivo: coherente con arquitectura ya establecida del proyecto (Next.js 16 App Router); URLs compartibles y SEO-friendly por defecto.
- **Reproductor mantiene la simulación de score con `setInterval`** (no un placeholder estático). Motivo: es una animación de UI, no lógica de juego real (sin colisiones, sin input, sin reglas) — mantiene fidelidad visual al template sin violar el alcance ("no implementar ningún juego").
- **`styles.css` portado casi 1:1 a `globals.css`**, en vez de reescribir con utilidades Tailwind. Motivo: ya estaba hecho en un commit previo (`66926b8`); preserva la identidad visual retro/CRT exacta del template con menor riesgo.
- **Sesión mock vía `localStorage` + React Context** (`AuthProvider`), no backend real. Motivo: MVP es solo visual; se descartó backend real y OAuth funcional por estar fuera de alcance.
- **Botones sociales (GOOGLE/GITHUB) y contador de créditos quedan decorativos**, sin handlers reales. Motivo: igual que el template — son parte del vestuario visual retro, no funcionalidad prometida.
- **Sin tests automatizados.** Motivo: no hay test runner configurado en el proyecto; verificación es manual (navegador) + `npm run lint`/`build`.
- **Se descartó registro/perfil de usuario real, recuperación de contraseña, edición de cuenta** — cualquier autenticación real queda para un spec futuro, no este MVP visual.
