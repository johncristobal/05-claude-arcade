# 06 — Leaderboard real

## Header

- **Estado:** Implementado
- **Dependencias:** `01-mvp-visual-pantallas.md` (Implementado) — reutiliza `AuthProvider`, flujo `av_scores`/modal de fin en `jugar/page.tsx`. `04-supabase-en-vivo.md` (Approved) — reutiliza `@supabase/supabase-js` ya instalado y `lib/supabase/client.ts` ya creado. Sin dependencia funcional de `02`/`03`.
- **Fecha:** 2026-07-25
- **Objetivo:** Reemplazar el leaderboard fake (`seededScores`) de la ficha de juego y del salón de la fama por datos reales en Supabase (tablas `games` y `scores`), guardando cada partida sin auth desde `/juegos/[id]/jugar` y leyéndolos al cargar cada página (sin tiempo real), sin tocar Home, `GameCard` ni el auth mock existente.

## Scope

**Incluido:**

- Migración Supabase: tabla `games` (`id text primary key`, `title text`) — espejo mínimo de `lib/data.ts` para dar integridad referencial, sembrada con los 8 juegos existentes.
- Migración Supabase: tabla `scores` (`id bigint generated always as identity primary key`, `game_id text references games(id)`, `name text`, `score integer`, `created_at timestamptz default now()`).
- RLS habilitado en ambas tablas: `games` con policy `select` pública (lectura libre, sin insert/update/delete desde cliente); `scores` con policies `insert` pública y `select` pública (sin auth, sin `update`/`delete` desde cliente).
- `lib/supabase/scores.ts` (nuevo): funciones `getLeaderboard(gameId, limit)`, `getGameStats(gameId)` (mejor puntuación + cantidad de partidas reales vía `MAX`/`COUNT`), `saveScore({ gameId, name, score })` con validación mínima (score entero ≥ 0, nombre trim no vacío, máx. 10 chars — mismo tope que ya aplica el input del modal).
- `app/juegos/[id]/jugar/page.tsx`: `saveScore()` pasa de escribir en `localStorage["av_scores"]` a insertar en `scores` vía Supabase; aplica a los 8 juegos (real para ROCAS, fake-sim para los otros 7, mismo criterio que hoy).
- `app/juegos/[id]/page.tsx`: leaderboard lateral y "Mejor global"/"Partidas" pasan de `seededScores`/`game.best`/`game.plays` estáticos a datos reales de `scores` (top 10, `MAX`, `COUNT`).
- `app/salon-de-fama/page.tsx`: tabla + podio por juego pasan de `seededScores` a `getLeaderboard(gameId)` real; podio muestra placeholder ("— SIN REGISTRO —") en slots sin dato si hay menos de 3 scores; fila "TU MEJOR MARCA" busca en `scores` la mejor fila con `name = user.name` (mock-user), se oculta si no hay coincidencia.
- `lib/data.ts`: se elimina `seededScores()` (código muerto tras el reemplazo).
- `lib/types.ts`: nuevos tipos para fila de leaderboard y stats de juego (reemplazan el uso de `ScoreRow` fake donde aplica).

**Explícitamente fuera de alcance:**

- Home (`app/page.tsx`) y `GameCard.tsx` — "MEJOR PUNTUACIÓN" del grid principal sigue estática desde `lib/data.ts`, sin consultar Supabase. Mismo precedente que el ticker de Home en spec 04.
- Auth real (login/signup/OAuth) — guardar score sigue sin auth; `AuthProvider.tsx` mock intacto.
- Migración de datos viejos de `localStorage["av_scores"]` a Supabase — quedan huérfanos en el navegador, sin script de migración.
- Tiempo real (Realtime subscription) en los leaderboards — se leen solo al cargar/recargar la página, no se actualizan en vivo si otro jugador guarda mientras estás mirando.
- Tocar `/en-vivo` (presence, spec 04) — sin relación con este spec.
- Portar más juegos fake a motor real, o cambiar el gameplay de ROCAS (spec 05) — sin relación con este spec.
- Tests automatizados (sigue sin test runner).
- Borrado/edición de scores desde el cliente (moderación, admin) — sin policies de `update`/`delete`, ninguna UI para eso.

## Modelo de datos

**Postgres (Supabase), migración nueva:**

```sql
create table games (
  id text primary key,
  title text not null
);

create table scores (
  id bigint generated always as identity primary key,
  game_id text not null references games(id),
  name text not null,
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index scores_game_id_score_idx on scores (game_id, score desc);

alter table games enable row level security;
alter table scores enable row level security;

create policy "games are publicly readable"
  on games for select
  using (true);

create policy "scores are publicly readable"
  on scores for select
  using (true);

create policy "anyone can insert a score"
  on scores for insert
  with check (true);
```

Seed de `games` (misma migración, un insert por cada `id`/`title` de `GAMES` en `lib/data.ts`): `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`.

**`lib/types.ts` (nuevo, agrega — no reemplaza `ScoreRow` que puede seguir usándose en otro lado si aplica):**

```ts
export interface LeaderboardRow {
  rank: number;
  name: string;
  score: number;
  date: string; // derivado de created_at, formato "DD/MM/AAAA" igual que ScoreRow
}

export interface GameStats {
  best: number; // MAX(score) para el juego, 0 si no hay filas
  plays: number; // COUNT(*) para el juego
}
```

**`lib/supabase/scores.ts` (nuevo):**

```ts
export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<LeaderboardRow[]>;
export async function getGameStats(gameId: string): Promise<GameStats>;
export async function getBestByName(
  gameId: string,
  name: string,
): Promise<LeaderboardRow | null>; // para "TU MEJOR MARCA"
export async function saveScore(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<void>;
```

`saveScore` valida antes de insertar: `score` entero ≥ 0, `name.trim()` no vacío (si vacío, usa `"INVITADO"` como fallback), `name` truncado a 10 chars (mismo tope que ya aplica el input del modal en `jugar/page.tsx`).

## Plan de implementación

1. **Migración de tablas**: crear `games` + `scores` con RLS y policies (bloque SQL de arriba), sembrar `games` con los 8 juegos vía `mcp__supabase__apply_migration`. Proyecto sigue compilando y funcionando igual — nada lee ni escribe estas tablas todavía.

2. **Capa de datos**: crear `lib/supabase/scores.ts` con `getLeaderboard`, `getGameStats`, `getBestByName`, `saveScore` (usando `lib/supabase/client.ts` ya existente de spec 04); agregar `LeaderboardRow`/`GameStats` a `lib/types.ts`. Nada lo importa aún, cero cambio visible.

3. **Guardar score real**: en `app/juegos/[id]/jugar/page.tsx`, reemplazar el `saveScore()` que escribe `localStorage["av_scores"]` por `await saveScore({ gameId: game.id, name, score })` de la nueva capa; mantener `setSaved(true)` en el `then`. Las partidas ahora persisten en Supabase, para los 8 juegos.

4. **Ficha de juego real**: en `app/juegos/[id]/page.tsx`, reemplazar `seededScores(...)` por `await getLeaderboard(id, 10)` y `game.best`/`game.plays` estáticos por `await getGameStats(id)`; página pasa a hacer fetch real (sigue siendo Server Component `async`, solo cambia la fuente). Leaderboard lateral y "Mejor global"/"Partidas" muestran datos reales; si la tabla está vacía para ese juego, lista vacía y stats en 0 (sin placeholder especial acá, se resuelve solo con "sin filas").

5. **Salón de la fama real**: en `app/salon-de-fama/page.tsx`, reemplazar `seededScores(...)` por `getLeaderboard(tab, 12)` (fetch en `useEffect` al cambiar `tab`, ya que es Client Component); podio con placeholder `"— SIN REGISTRO —"` en slots 2/3 si `rows.length < 3`; fila "TU MEJOR MARCA" usa `getBestByName(tab, user.name)`, se oculta por completo si no hay coincidencia (`null`).

6. **Limpieza**: eliminar `seededScores()` de `lib/data.ts` (código muerto, ya sin usos).

7. **Cierre**: jugar una partida (ROCAS y algún juego fake), guardar puntuación, confirmar que aparece en `/juegos/[id]` (ficha) y en `/salon-de-fama` (tabla + podio) al recargar; probar caso de juego sin scores todavía (podio con placeholders, stats en 0); probar "TU MEJOR MARCA" logueado con mock-user con y sin coincidencia de nombre; confirmar `list_tables`/`get_advisors` sin warnings de RLS; correr `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores de tipos ni de lint.
- [ ] Tablas `games` y `scores` existen en Supabase (`list_tables`), con RLS habilitado y sin warnings en `get_advisors`.
- [ ] `games` tiene exactamente 8 filas sembradas, una por cada `id` de `GAMES` en `lib/data.ts`.
- [ ] Guardar puntuación en `/juegos/[id]/jugar` (cualquiera de los 8 juegos) inserta una fila nueva en `scores` con `game_id`, `name`, `score` correctos.
- [ ] Ya no se escribe nada en `localStorage["av_scores"]` al guardar puntuación.
- [ ] `/juegos/[id]` muestra el leaderboard lateral con datos reales de `scores` (top 10, orden descendente por puntuación).
- [ ] "Mejor global" y "Partidas" en `/juegos/[id]` reflejan `MAX(score)` y `COUNT(*)` reales de `scores` para ese juego.
- [ ] `/salon-de-fama` muestra la tabla y el podio con datos reales de `scores` al cambiar de pestaña de juego.
- [ ] Si un juego tiene menos de 3 scores guardados, el podio muestra `"— SIN REGISTRO —"` en los slots faltantes en vez de romperse.
- [ ] Fila "TU MEJOR MARCA" en `/salon-de-fama` muestra la mejor puntuación real del mock-user logueado cuando existe coincidencia por nombre, y no aparece si no hay ninguna.
- [ ] Home (`/`) y `GameCard` siguen mostrando "MEJOR PUNTUACIÓN" estático de `lib/data.ts`, sin consultar Supabase.
- [ ] `seededScores()` ya no existe en `lib/data.ts` ni tiene referencias en el código.
- [ ] Insertar un score con `name` vacío guarda `"INVITADO"` en su lugar (fallback aplicado antes del insert).
- [ ] Un intento de `insert`/`update`/`delete` directo sobre `games` desde el cliente anon falla (RLS solo permite `select`).

## Decisiones tomadas y descartadas

- **Sí:** tabla `games` real en Postgres, espejo mínimo (`id`, `title`). Motivo: decisión explícita del usuario — necesita integridad referencial con `scores`, no solo texto suelto.
- **No:** espejar todo el catálogo (`cat`, `cover`, `color`, textos) a la tabla. Motivo: `lib/data.ts` sigue siendo la fuente de verdad de UI, evita duplicar contenido que cambia junto al diseño, no la data.
- **Sí:** leaderboard real para los 8 juegos, no solo ROCAS. Motivo: mismo criterio que ya tenía `av_scores` — el gameplay fake también genera un score jugable, no hay razón para discriminar.
- **Sí:** guardar score sin auth (nombre libre, sin `user_id`). Motivo: decisión explícita — evita mezclar este spec con el flujo de auth real (pendiente, futuro spec); mismo nivel de confianza que tenía `av_scores` en localStorage.
- **Sí:** RLS habilitado con policies explícitas `select`/`insert` públicas, sin `update`/`delete` desde cliente. Motivo: patrón estándar de Supabase para tabla pública sin auth — deja rastro auditable, evita que cualquiera borre o edite scores ajenos.
- **No:** Realtime subscription en los leaderboards. Motivo: decisión explícita — complejidad extra sin beneficio claro, a diferencia de `/en-vivo` (spec 04) que es presence en vivo por diseño; acá alcanza con recargar.
- **Sí:** `best`/`plays` calculados real en la ficha de juego (`/juegos/[id]`). Motivo: es justo lo que "leaderboard real" debe reflejar ahí, donde el jugador entra a ver el detalle.
- **No:** el mismo cálculo real en Home/`GameCard`. Motivo: decisión explícita — Home tiene precedente de "datos literales, sin tocar" (spec 02/04); volverlo dinámico es alcance nuevo no pedido.
- **No:** migrar los datos viejos de `localStorage["av_scores"]` a Supabase. Motivo: decisión explícita — es mayormente data fake (7 de 8 juegos simulados), no vale el esfuerzo de un script de migración de un solo uso.
- **Sí:** placeholder `"— SIN REGISTRO —"` en slots vacíos del podio. Motivo: decisión explícita — mantiene el layout visual consistente sin layout shift, en vez de ocultar el podio completo con pocos datos.
- **Sí:** validación mínima client-side en `saveScore` (score ≥ 0, nombre trim con fallback `"INVITADO"`, tope 10 chars). Motivo: decisión explícita — sin auth, un leaderboard público sin ningún filtro se ensucia rápido.
- **Sin tests automatizados.** Motivo: no hay test runner configurado; verificación manual (jugar partida, revisar ambas pantallas) + `npm run lint`/`build`.

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                                                 | Mitigación                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spam de scores falsos**: sin auth, cualquiera con la anon key puede insertar puntuaciones absurdas (ej. `score: 999999999`) directo contra la API de Supabase, sin pasar por la UI.                                                                                                  | Aceptado para este scope — mismo nivel de confianza que `av_scores` en localStorage tenía hoy (0 validación real posible sin auth). Si se vuelve problema real, mitigar en spec futuro con rate limiting o auth real. |
| **`getBestByName` frágil**: la búsqueda de "TU MEJOR MARCA" compara por `name` exacto (texto libre, no hay vínculo a un usuario real). Dos personas distintas con el mismo nombre comparten fila; el mock-user puede no coincidir con ningún score si cambió de nombre entre partidas. | Aceptado — mismo comportamiento que la versión fake anterior (ya usaba coincidencia aproximada), documentado como limitación conocida hasta que exista auth real.                                                     |
| **`salon-de-fama` sigue siendo Client Component**: el fetch a Supabase ahora ocurre en el browser con la anon key al cambiar de pestaña, en vez de en build/request server-side como la ficha de juego.                                                                                | Aceptado — la anon key ya es pública por diseño (spec 04), y la tabla `scores` es de lectura pública vía RLS; no hay dato sensible expuesto.                                                                          |
| **Migración con seed de 8 filas fija**: si en el futuro se agrega/quita un juego a `GAMES` en `lib/data.ts` sin actualizar la tabla `games`, el insert de score para un juego nuevo falla por la FK (`game_id references games(id)`).                                                  | Documentado como limitación conocida: cualquier spec futuro que agregue un juego nuevo debe incluir su propia migración con el insert correspondiente a `games`.                                                      |
