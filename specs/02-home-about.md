# 02 — Home y Acerca de

## Header

- **Estado:** approved
- **Dependencias:** `01-mvp-visual-pantallas.md` (Implementado) — reutiliza `Nav`, `GameCard`, `lib/data.ts`, `globals.css`
- **Fecha:** 2026-07-20
- **Objetivo:** Portar las pantallas Home (landing) y Acerca de (about + contacto) desde `references/templates/home-about/` a Next.js App Router, mover la biblioteca actual de `/` a `/biblioteca`, y actualizar el `Nav` global a 4 rutas (Inicio, Biblioteca, Salón de la Fama, Acerca de).

## Scope

**Incluido:**

- `/` — nueva Home (landing), portada 1:1 desde `home.jsx`: hero con silhouettes flotantes, sección "por qué Arcade Vault" (4 feature cards), preview de juegos (6 `GameCardMini`, datos de `GAMES`), stats block (estático), actividad en vivo (ticker de puntuaciones + top jugadores, datos literales estáticos como en el template), pricing/plan único, CTA final.
- `/biblioteca` — contenido actual de `/` (hero simple, buscador, chips de categoría, grid de `GameCard`) movido tal cual, sin cambios de lógica.
- `/acerca-de` — nueva página, portada 1:1 desde `about.jsx`: hero de misión, highlight row (3 items), formulario de contacto (nombre/email/mensaje) con validación simple y estado de éxito tipo terminal — **puramente UI, sin persistencia** (ni `localStorage` ni red).
- `components/Nav.tsx` actualizado: 4 links en orden Inicio → Biblioteca → Salón de la Fama → Acerca de, tanto en desktop como panel móvil. Lógica de estado activo: Inicio solo en `/` exacto; Biblioteca en `/biblioteca` y `/juegos/*`; Salón y Acerca de por pathname exacto (sin cambios de patrón).
- `components/GameCardMini.tsx` nuevo — versión simple (sin tilt-hover) de card para el rail de preview de Home, porta `MiniCard` del template.
- Iconos SVG (`FeatureIcon`: GAMEPAD/FREE/TROPHY/ROCKET; `HighlightIcon`: HEART/BROWSER/PLANT) portados inline, colocados en sus respectivos componentes de página (mismo patrón que el template).
- Estilos: portar a `app/globals.css` las clases faltantes de `references/templates/home-about/styles.css` (`home-hero`, `home-silos`, `home-section`, `feature-grid`, `mini-rail`, `home-stats`, `activity-grid`, `pricing-grid`, `home-final`, `about-hero`, `highlight-row`, `about-divider`, `about-contact`, `contact-grid`, `contact-form`, `terminal-success`, y las que falten de esa familia) — el resto de `globals.css` no se toca.
- CTAs de Home: "EXPLORAR JUEGOS" y "VER TODOS LOS JUEGOS" y CTA final → `/biblioteca`; "CREAR CUENTA" y "EMPEZAR GRATIS" (pricing) → `/iniciar-sesion`; cards del rail de preview → `/juegos/[id]`.

**Explícitamente fuera de alcance:**

- Cualquier lógica real de envío del formulario de contacto (API, email, backend). Queda como mock UI, igual que el template.
- Cambiar/ampliar `lib/data.ts` — los datos de "actividad en vivo" (ticker + top jugadores del día) en Home se quedan como literales estáticos dentro del componente, igual que en `home.jsx`, no se derivan de `GAMES`/`PLAYERS`.
- Redirects o compatibilidad con la ruta vieja `/` como biblioteca (no hay usuarios/bookmarks reales que proteger).
- Cambios a `GameCard`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/iniciar-sesion`, `/salon-de-fama` más allá de lo que el cambio de `Nav` implique automáticamente.
- Tests automatizados (sigue sin haber test runner).
- Cualquier pantalla no presente en `references/templates/home-about/`.

## Modelo de datos

Sin cambios. No se agregan tipos, estructuras ni claves de `localStorage` nuevas. Home y Acerca de reutilizan `GAMES` de `lib/data.ts` (ya existente) para el rail de preview; el resto de datos de Home (stats, ticker, top jugadores) son literales estáticos dentro del componente, no persistidos. El formulario de contacto usa solo estado local de React (`useState`), sin escritura a `localStorage`.

## Plan de implementación

1. **Estilos**: portar a `app/globals.css` las clases faltantes de `references/templates/home-about/styles.css` (familia `home-*`, `about-*`, `feature-*`, `mini-*`, `activity-*`, `pricing-*`, `contact-*`, `terminal-*`, `highlight-*`, `div-*`). El sitio sigue compilando y viéndose igual que hoy — solo se agregan reglas CSS nuevas, ninguna existente se toca.

2. **Mover biblioteca a `/biblioteca`**: crear `app/biblioteca/page.tsx` con el contenido íntegro del actual `app/page.tsx` (hero, buscador, chips, grid), sin cambios de lógica. `app/page.tsx` queda temporalmente duplicado (se sobreescribe en el paso 3). El sitio sigue funcionando, ahora con biblioteca accesible en dos rutas.

3. **Home (`/`)**: crear `components/GameCardMini.tsx` (porta `MiniCard`), reescribir `app/page.tsx` con el contenido de `home.jsx` (hero, silhouettes, features, preview rail con `GameCardMini` + `GAMES.slice(0,6)`, stats, actividad en vivo con datos literales, pricing, CTA final), con los CTAs apuntando a `/biblioteca`, `/iniciar-sesion` y `/juegos/[id]` según lo definido en Scope. `/` deja de ser la biblioteca.

4. **Acerca de (`/acerca-de`)**: crear `app/acerca-de/page.tsx` portando `about.jsx` — hero de misión, highlight row, formulario de contacto con validación (shake en campos vacíos) y estado de éxito tipo terminal, todo con `useState` local, sin persistencia.

5. **Nav**: actualizar `components/Nav.tsx` — agregar links "Inicio" (`/`) y "Acerca de" (`/acerca-de`) en desktop y panel móvil, reordenar a Inicio → Biblioteca → Salón de la Fama → Acerca de, ajustar `isBiblioteca` para chequear `/biblioteca` en vez de `/`, agregar `isHome` (`pathname === "/"`) e `isAcercaDe` (`pathname === "/acerca-de"`).

6. **Cierre**: recorrer las 3 rutas afectadas (`/`, `/biblioteca`, `/acerca-de`) y el `Nav` en todas las páginas existentes a mano en el navegador comparando contra el template; correr `npm run lint` y `npm run build` y resolver cualquier error.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores de tipos ni de lint.
- [ ] `/` muestra la landing Home (hero, features, preview de juegos, stats, actividad en vivo, pricing, CTA final) — ya no muestra el grid de biblioteca.
- [ ] `/biblioteca` muestra el hero simple, buscador funcional, chips de categoría y grid de `GameCard`, con el mismo comportamiento que tenía `/` antes de este spec.
- [ ] `/acerca-de` muestra el hero de misión, highlight row y formulario de contacto.
- [ ] En `/acerca-de`, enviar el formulario con algún campo vacío dispara el shake y no avanza; con los 3 campos completos muestra el bloque de éxito tipo terminal con el nombre ingresado; no escribe nada en `localStorage`.
- [ ] En Home: botones "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" y CTA final navegan a `/biblioteca`; "CREAR CUENTA" y "EMPEZAR GRATIS" navegan a `/iniciar-sesion`; cada card del rail de preview navega a `/juegos/[id]` correcto.
- [ ] El `Nav` (desktop y panel móvil) muestra 4 links en orden Inicio, Biblioteca, Salón de la Fama, Acerca de, en todas las rutas del sitio (incluidas `/juegos/[id]`, `/juegos/[id]/jugar`, `/iniciar-sesion`, `/salon-de-fama`).
- [ ] Estado activo del Nav: "Inicio" resaltado solo en `/`; "Biblioteca" resaltado en `/biblioteca` y en `/juegos/*`; "Acerca de" resaltado en `/acerca-de`.
- [ ] Ningún archivo de `references/templates/` fue importado o servido directamente en producción.

## Decisiones tomadas y descartadas

- **Biblioteca se mueve a `/biblioteca`** en vez de mantenerse en `/`. Motivo: el template nuevo trata Home y Biblioteca como pantallas distintas en el nav (Inicio vs Biblioteca); no se preservan redirects desde `/` porque no hay usuarios/bookmarks reales que proteger todavía.
- **Ruta `/acerca-de` en español**, no `/about`. Motivo: consistencia con el resto de rutas ya existentes (`/salon-de-fama`, `/iniciar-sesion`, `/juegos/[id]`).
- **Formulario de contacto queda como mock puramente UI**, sin escribir a `localStorage` ni backend. Motivo: no hay backend real en el proyecto (mismo criterio que spec 01); a diferencia de `av_user`/`av_scores`, no hay un flujo posterior en el MVP que necesite leer los mensajes de contacto.
- **Datos de "actividad en vivo" en Home quedan literales/estáticos**, no derivados de `GAMES`/`PLAYERS` de `lib/data.ts`. Motivo: son decorativos (ticker + top jugadores del día), igual que en el template; derivarlos introduciría lógica no pedida y no está en el alcance de este spec.
- **`GameCardMini` como componente nuevo**, no reutilización de `GameCard`. Motivo: visualmente y funcionalmente son distintos (sin tilt-hover, layout de rail horizontal vs grid) — reutilizar forzaría props condicionales innecesarias.
- **Iconos SVG colocados inline en cada página** (no extraídos a un archivo de iconos compartido). Motivo: mismo patrón que el template (`FeatureIcon`/`HighlightIcon` definidos junto al componente que los usa); no se anticipa reuso fuera de Home/Acerca de.
- **Sin tests automatizados.** Motivo: no hay test runner configurado; verificación manual + `npm run lint`/`build`, igual que spec 01.

## Riesgos identificados

- **Colisión de nombres de clases CSS** entre `globals.css` actual y las clases nuevas portadas de `styles.css` (ambos derivan del mismo prototipo, pero no idénticos). Mitigación: revisar diffs de nombres de clase antes de pegar, no sobreescribir reglas existentes sin verificar.
- **Nav es global**: un error en la lógica de estado activo o en los `href` rompe la navegación en las 5+ rutas existentes, no solo en las nuevas. Mitigación: recorrer manualmente cada ruta tras el cambio (paso 6 del plan).
