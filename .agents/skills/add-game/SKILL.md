---
name: add-game
description: Guía el port de un juego desde references/started-games/ (o desde cero) a un juego real jugable con leaderboard real en Supabase, generando un spec que sigue el flujo spec-driven del proyecto. Usar al agregar un juego nuevo a Arcade Vault.
disable-model-invocation: true
argument-hint: "<nombre o id del juego a portar, ej. tetris>"
---

# /add-game — Generador de spec para portar un juego real

Este skill **no escribe código**. Repite, de forma guiada y repetible, lo que las specs 05 (`rocas-juego-real`) y 06 (`leaderboard-real`) hicieron a mano para ROCAS: portar un juego de `references/started-games/` (o diseñarlo desde cero) a un motor TypeScript real con `<canvas>`, conectado al HUD/modal existentes, con leaderboard real en Supabase — todo condensado en **un spec** que después se implementa con `/spec-impl`.

## Filosofía

El port de un juego siempre repite la misma forma: motor puro en TS, hook de integración React, wiring en `app/juegos/[id]/jugar/page.tsx`, y (a veces) una fila nueva en la tabla `games`. Este skill existe para no reinventar esa forma cada vez ni perder los precedentes ya fijados en specs 05/06. Lee `game-spec-checklist.md` (en el mismo directorio que este skill) al inicio de cada corrida — ahí viven los bloques de contenido que se repiten en todo spec generado por este skill.

**Reglas duras** (igual espíritu que `/spec`):

- **Nunca escribir código.** Solo el archivo `.md` del spec al final.
- **Nunca proponer implementar después de guardar.** El siguiente paso es que el usuario corra `/spec-impl`.
- **Nunca asumir decisiones no confirmadas.** Si falta información, preguntar.
- **Nunca generar el spec completo de una — sección por sección, con confirmación.**
- **Nunca aceptar un path de origen fuera de `references/started-games/`.** Solo esa carpeta o "desde cero".
- Responder en el mismo idioma del prompt inicial.

## Fase 1 — Contexto y fuente

1. Leer el archivo de memoria del proyecto: `CLAUDE.md`, si no existe `AGENTS.md`.
2. Listar `specs/` para determinar el próximo número `NN`.
3. Leer **siempre** `specs/05-rocas-juego-real.md` y `specs/06-leaderboard-real.md` — son el precedente fijo de este skill (no "las dos últimas specs", específicamente estas dos, sin importar cuántas más existan).
4. Leer `game-spec-checklist.md` (mismo directorio que este SKILL.md).
5. Resolver `$ARGUMENTS` contra las subcarpetas de `references/started-games/` por coincidencia aproximada, ignorando el prefijo numérico (ej. `tetris` → `03-tetris`, `arkanoid`/`breakout` → `04-arkanoid`). Si no hay match y el usuario no dijo explícitamente "desde cero"/"from scratch", listar las carpetas disponibles y preguntar cuál usar. **Rechazar cualquier path fuera de `references/started-games/`** — si el usuario pide portar algo desde otro lugar, explicar que este skill solo soporta esa carpeta o un diseño desde cero.
6. Si hay match: leer **todos** los archivos de esa carpeta (`game.js`, `index.html`, `style.css`, `levels.js`/similares, `CLAUDE.md`/`README.md`; los assets binarios —imágenes, sonidos— solo listarlos, no leerlos) para catalogar: mecánica del juego, si usa más de un `<canvas>`, dependencias de assets (sprites/sonido). Estos hallazgos alimentan las preguntas de Fase 2, no se asumen resueltos.
7. Si "desde cero": saltar el paso anterior, pedir al usuario una descripción de 1-2 oraciones del juego para alimentar Fase 2.
8. Leer `lib/data.ts`. Comparar tema/título del juego a portar contra las 8 entradas existentes de `GAMES` y proponer un id destino: reemplazo de un placeholder existente (ej. Tetris ≈ `caida`, Arkanoid/Breakout ≈ `bloque-buster`, Snake ≈ `serpentina`) o, si no hay coincidencia razonable, señalar que se necesita un id nuevo. Esto se **propone y confirma con el usuario en Fase 2**, nunca se asume en silencio.
9. Buscar `isRocas` en `app/juegos/[id]/jugar/page.tsx` (grep). Si aparece, el refactor a registro genérico todavía no se hizo y el spec generado debe incluirlo como paso. Si no aparece (ya existe un mapa tipo `REAL_GAME_ENGINES`), el spec solo agrega una entrada nueva.

## Fase 2 — Aclarar mediante preguntas

Mismo ritmo que `/spec`: bloques de 3 a 5 preguntas, esperar respuesta antes de seguir. No asumir — cada pregunta debe ser concreta, con 2-4 opciones y una recomendación marcada cuando aplique.

**Bloque A — Destino y alcance**

1. Id destino: ¿confirmamos `<id-propuesto>` (reemplaza placeholder actual "`<título actual>`") o es un id nuevo?
2. ¿Port 1:1 completo de la mecánica original, o un subconjunto específico? (Recomendación: 1:1, mismo criterio que spec 05 — el juego ya está probado.)
3. Audio/sprites del original: ¿entran en este spec o quedan fuera? (Recomendación: fuera, mismo precedente que ROCAS — sin audio.)

**Bloque B — Contrato del motor**

4. Canvas: ¿único, a resolución nativa, escalado por CSS dentro de `.crt-screen` (igual ROCAS)? Si el original usa un segundo canvas (ej. previsualización de siguiente pieza en Tetris), ¿se pliega al draw del canvas único (recomendado) o se difiere explícitamente fuera de este spec?
5. Si el juego original no tiene concepto de "vidas": ¿cómo se mapea al HUD existente (`Vidas`)? Ofrecer opciones concretas (ej. vida única, o vidas fijas en 1 sin usarse).
6. Si no tiene concepto de "nivel": ¿cómo se deriva (ej. por score, por líneas/tiempo, fijo en 1)?
7. Esquema de input (teclas) y si hay conflicto con el foco del modal de fin de partida (mismo riesgo documentado en spec 05 — capturar teclado del juego debe ignorarse mientras el modal está abierto).

**Bloque C — Registro e infraestructura**

8. Confirmar ubicación de archivos: `lib/games/<id>/engine.ts` + `lib/games/<id>/use<PascalId>Game.ts`.
9. Según lo detectado en Fase 1.9: ¿el plan de este spec incluye el paso de refactor a registro genérico en `page.tsx`, o solo agrega una entrada al mapa ya existente?

**Bloque D — Leaderboard / base de datos**

10. Según lo detectado en Fase 1.8: ¿aplica Caso A (id ya existe en `games`, no hace falta migración) o Caso B (id nuevo → confirmar `title`/`short`/`long`/`cat`/`cover`/`color` para `GAMES` y el insert vía `mcp__supabase__apply_migration`)?

Parar de preguntar solo cuando se puede responder sin asumir: qué archivos aparecen/cambian, cuál es el primer y el último paso ejecutable, cómo se verifica que el spec quedó bien implementado.

## Fase 3 — Construir el spec sección por sección

Usar el template genérico de `.agents/skills/spec/template.md` tal cual (sin fork) — mismo orden estricto que `/spec`, mostrando cada sección y esperando confirmación antes de la siguiente:

1. **Header**: objetivo en una oración, forma: "Portar el motor real de `<juego>` (`<fuente: carpeta de referencia o 'desde cero'>`) a TypeScript, integrarlo al HUD/modal existentes en `/juegos/<id>/jugar`[, y sembrar su fila en `games`]." Dependencias: siempre `05-rocas-juego-real.md` (Implementado) y `06-leaderboard-real.md` (Implementado) como precedente de patrón, más cualquier spec que haya tocado el id destino si existe.
2. **Scope**: "Incluido" siempre trae motor + hook + reuso de HUD/modal existentes; agrega refactor de registro solo si Fase 1.9 lo requiere; agrega migración/entrada `GAMES` solo si es Caso B. "Fuera de alcance" siempre trae audio/sprites (salvo confirmado in en Bloque A), controles táctiles/mobile, cambios a otros placeholders, tests automatizados.
3. **Modelo de datos**: instanciar el contrato `EngineSnapshot`/`UseGameEngineResult` (ver `game-spec-checklist.md`) para este juego concreto (tipos de `lives`/`level` según lo confirmado en Bloque B); si aplica Caso B, incluir el insert SQL y el objeto `Game` a agregar en `lib/data.ts`.
4. **Plan de implementación**: pasos numerados, calcados de la forma de spec 05 — (1) motor en `lib/games/<id>/engine.ts`, sin uso todavía; (2) hook `use<PascalId>Game.ts`, sin uso todavía; (3) wiring en `page.tsx` (refactor a registro si aplica, o solo nueva entrada al mapa) + render del canvas; (4) si Caso B: migración + entrada en `GAMES`; (5) cierre — playtest manual completo del juego portado, confirmar que los demás placeholders siguen intactos, `npm run lint` y `npm run build`.
5. **Criterios de aceptación**: checklist booleano, estilo spec 05 (build limpio, canvas real a resolución nativa, controles/mecánica igual al original, HUD sincronizado, modal de fin con score real, pausa/reanudar, salir con/sin confirm, cleanup de listeners/RAF al desmontar, otros juegos sin regresión). Si Caso B, agregar los dos ítems chicos estilo spec 06 (fila en `games` existe, entrada en `GAMES` presente) — no todo el checklist de spec 06.
6. **Decisiones tomadas y descartadas**: pre-llenar con las recurrentes (port 1:1 vs recorte, sin audio, canvas único con plegado del secundario, convención de `lives`/`level` elegida, timing del refactor de registro) más las específicas de este juego, cada una con motivo breve.
7. **Riesgos**: partir de las filas recurrentes en `game-spec-checklist.md` (doble montaje StrictMode, captura de teclado interfiere con input del modal, costo de re-render por frame) y agregar las específicas del juego (ej. plegado de canvas secundario, carga async de sprites si aplica).

Después de cada sección: mostrarla en markdown y preguntar "¿Esta sección queda así o la ajustamos?". Solo avanzar tras confirmación explícita.

## Fase 4 — Guardar

Igual que `/spec`:

1. Determinar `NN` siguiente según `specs/`.
2. Generar slug corto del objetivo.
3. Confirmar el nombre de archivo propuesto con el usuario antes de escribir.
4. Crear `specs/NN-<slug>.md` con todas las secciones aprobadas, `Estado: Draft`.
5. No tocar `specs/.spec-config.yml` si ya existe (en este repo ya existe — no crearlo de nuevo).
6. Confirmar al usuario: path del archivo creado, recordatorio de que está en `Draft` y debe pasar a `Approved` tras relectura, y que el siguiente paso es correr `/spec-impl NN-<slug>`.
7. **Detenerse ahí.** No proponer implementar, no escribir código, no tomar ninguna acción más allá de esa confirmación.

## Argumentos

Si se invoca `/add-game tetris`, usar `tetris` como pista de búsqueda en `references/started-games/` (Fase 1.5). Si se invoca `/add-game` sin argumentos, preguntar directamente qué juego portar (de `references/started-games/`) o si es un diseño desde cero.
