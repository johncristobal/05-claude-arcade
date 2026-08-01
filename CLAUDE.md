# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — online arcade platform (Spanish UI, retro CRT/neon aesthetic): browse a game library, play games in a canvas player, save scores to a real Supabase leaderboard, see who is online.

8 games in the catalog (`lib/data.ts`), 4 with a real playable engine (`rocas`, `caida`, `bloque-buster`, `serpentina`) and 4 visual placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`). `JUEGOS.md` is the up-to-date catalog: per-game mechanics, controls, scoring, origin, and DB state — read it before touching anything game-related.

This project follows Spec Driven Design via the `/spec` and `/spec-impl` skills from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (`npx skills@latest add Klerith/fernando-skills`). Every feature so far has a spec in `specs/` (01–09). Check `specs/` before implementing new features, and add a new spec rather than coding straight into `app/`.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)

No test runner is configured. Verification is manual: dev server + Playwright MCP (browser navigation/screenshots) and Supabase MCP for DB checks.

## Critical: this is not the Next.js you know

`next` is pinned to `16.2.10`, ahead of training data, with real breaking changes. **Before writing any Next.js code, read the matching guide in `node_modules/next/dist/docs/` first** (`01-app/` for App Router, `03-architecture/` for internals). Known deltas so far:

- **Middleware is renamed Proxy.** `middleware.ts` is gone — use a root `proxy.ts` exporting `proxy()` (or default export). See `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`. Don't reach for `middleware.ts` from muscle memory.
- **Typed route props are global.** Server pages type params with the global `PageProps<"/juegos/[id]">` helper (see `app/juegos/[id]/page.tsx`), not a hand-written `{ params }` interface. `params` is a Promise — `await` it.
- **React 19.2 + React Compiler lint rules are strict.** In `app/juegos/[id]/jugar/page.tsx`, the engine object is destructured once because repeatedly reading `engine.field` during render makes the compiler linter treat the whole object as ref-carrying (it holds `canvasRef`) and block the reads. Keep that pattern.

Assume other APIs/conventions may have shifted too — verify against the docs directory rather than trusting prior knowledge.

## Architecture

### Routing & rendering

App Router only. Routes: `/` (home, `app/page.tsx`), `/biblioteca`, `/juegos/[id]` (detail, **server component**, awaits Supabase), `/juegos/[id]/jugar` (player), `/salon-de-fama`, `/en-vivo`, `/acerca-de`, `/iniciar-sesion`, and `POST /api/contact`. Everything except the game-detail page and the API route is a client component.

`app/layout.tsx` is the root layout: three Google fonts (`Press_Start_2P` → `--font-pixel`, `JetBrains_Mono`, `Courier_Prime`), background/noise layers, `AuthProvider`, `Nav`, footer.

### Styling

Tailwind v4 via `@tailwindcss/postcss`, CSS-first (no `tailwind.config.js`). `app/globals.css` (~1300 lines) holds the whole design system: CSS variables (`--cyan`, `--magenta`, `--yellow`, `--green`, `--bg*`, `--ink*`) plus hand-written component classes (`.crt`, `.crt-screen`, `.player-hud`, `.hud-stat`, `.cover-*`, `.btn`, `.modal`, `.fade-in`). Tailwind utilities are used sparingly — most UI reuses these classes. `@theme inline` only bridges a few tokens into Tailwind.

### Data

- `lib/data.ts` — static catalog `GAMES`, `CATS`, `PLAYERS`. **`best` and `plays` in `GAMES` are decorative** mockup values; real numbers come from Supabase.
- `lib/types.ts` — `Game`, `ScoreRow`, `User`, `SavedScore`, `PresenceGuest`, `LeaderboardRow`, `GameStats`.
- `lib/supabase/client.ts` — thin `createClient()` over `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `lib/supabase/scores.ts` — the only DB layer: `getLeaderboard`, `getGameStats`, `getBestByName`, `saveScore` (clamps score ≥ 0, name trimmed/uppercased to 10 chars). Don't query `scores` directly from components.
- Supabase project `uworqrfrwyjoglantqhi`. Tables: `games` (8 rows, one per catalog id) and `scores` (`game_id`, `name`, `score`, `created_at`). RLS on both with public read policies.
- `/en-vivo` uses Supabase Realtime presence (channel `en-vivo`, anonymous auth, `INVITADO_NNNN` names) — no table involved.
- Auth is fake: `components/AuthProvider.tsx` stores `{ name }` in `localStorage` under `av_user`, exposed via `useAuth()`. No real accounts.

### Games

Each real game lives in `lib/games/<id>/`: a framework-free `engine.ts` (pure canvas + rAF loop) plus `use<Game>Game.ts`, a React hook that owns the canvas ref and mirrors engine state. All hooks return the same `UseGameEngineResult` contract (`canvasRef`, `score`, `lives`, `level`, `state`, `paused`, `pause`, `resume`, `forceGameOver`, `restart`, `dispose`) — canonical definition in `lib/games/caida/useCaidaGame.ts`.

To see the implemented games, you can check the next: `JUEGOS.md`

`app/juegos/[id]/jugar/page.tsx` is the single player shell: registry `REAL_GAME_ENGINES` maps id → hook result, `NULL_ENGINE` keeps placeholders on the same shape. Shared HUD (score/lives/level), PAUSA/FIN/SALIR buttons, pause overlay, game-over modal, and `saveScore()`. Canvas is always 800×600 native, CSS-scaled inside `.crt-screen`. No audio, no touch controls.

**To add a game:** run `/add-game <name>` (generates the spec), then `/spec-impl NN-<slug>`. Sources live in `references/started-games/`; assets in `references/source-assets/`. The skill refuses source paths outside `references/started-games/`.

### Misc

- Path alias `@/*` maps to project root (`tsconfig.json`).
- `/api/contact` sends mail through Resend (`RESEND_API_KEY`, `CONTACT_EMAIL`), validates name/email/message, returns `{ ok }` with 400/500 on failure.
- Env vars: see `.env.example`. `.env*` is gitignored except the example.
- `references/templates/` holds the original static HTML/JSX mockup the UI was ported from — the visual source of truth for spec 01.
- Notes/docs at repo root are personal course notes, not specs: `801_arcadenotes.md`, `101_skills.md`, `901_hooks_mcp.md`, `111_agentes.md`. `JUEGOS.md` is the real game catalog.

## Tooling

### Skills

- `/frontend-design` — use to design user interface.
- `/spec`, `/spec-impl` — spec-driven flow (`specs/.spec-config.yml`: `AutoCreateBranch: true`, so `/spec-impl` creates `spec-NN-slug` itself).
- `/add-game` — generates a game-port spec (never writes code).

### Agents

Project subagents live in `.claude/agents/`.

- `game-planner` (`.claude/agents/game-planner.md`) — decides **which game to add next**. Invoke explicitly ("usa game-planner"); it is not auto-triggered. Tools limited to `Read, Grep, Glob, Write, Edit`. It never writes code and never writes specs — its only writable file is `.claude/agents/game-planner/memoria.md`, a running table (`Fecha | Juego | Id destino | Estado | Veredicto`, states `implementado` · `propuesto` · `considerado` · `descartado`) so it doesn't repropose burned candidates. It reads `memoria.md` → `JUEGOS.md` → `lib/data.ts` → `specs/` → `references/` → `CLAUDE.md`, scores candidates on technical fit against `UseGameEngineResult` + the 800×600 canvas, source availability, catalog variety, effort, and whether the target id reuses a placeholder (no Supabase migration) or is new (needs a `games` row + `GAMES` entry). Output is a fixed-format recommendation ending in a `/add-game <juego>` handoff.
- `game-jam` (`.claude/agents/game-jam.md`) — given a free-form **theme** ("usa game-jam con el tema X"), autonomously generates ≥2 complete, ready-to-review specs interpreting that theme with distinct mechanics (not variations of the same game). Same tool set as `game-planner` (`Read, Grep, Glob, Write, Edit`), never writes code and never runs migrations — SQL for a new id is described inside the spec, not executed. Its only writable paths are `specs/game-jam/<tema-slug>/variante-*.md` (always `Estado: Draft`) and its own memory `.claude/agents/game-jam/memoria.md` (`Fecha | Tema | Carpeta | Variantes (id destino c/u) | Estado`). Reads its own memory → `game-planner`'s memory (cross-agent dedupe, skips anything already `implementado`) → `JUEGOS.md` → `lib/data.ts` → `specs/`/`specs/game-jam/` → `references/` → `game-spec-checklist.md` → specs 07 (ported) and 09 (from-scratch) as spec-shape precedent. Unlike `/add-game`, it never asks clarifying questions mid-run — it decides and documents the reasoning in each spec's "Decisiones tomadas y descartadas". Output specs are drafts: the user reviews, picks one, and manually promotes it to `specs/NN-<slug>.md` (`Estado: Approved`) before `/spec-impl`.
- `skin-designer` (`.claude/agents/skin-designer.md`) — audits the catalog for **skin coverage**: every game needs ≥3 skins (`neon`, `retro`, `clasico`, the last reproducing today's default look) that read well against the site's permanently-dark background. Invoke explicitly ("usa skin-designer"). Unlike its siblings, it **does write code**: `Read, Grep, Glob, Write, Edit, Bash` (the last only for `npm run lint`). It never touches `lib/supabase/**`, `components/AuthProvider.tsx`, or existing specs, and never runs `git commit`/`push`. It reads its own memory → `JUEGOS.md` → `lib/data.ts` → `lib/types.ts` → each real engine + hook → `app/globals.css` → `app/juegos/[id]/jugar/page.tsx` → `CLAUDE.md`/`AGENTS.md`, then implements a shared `SkinId` module + per-engine palette tables + a skin selector in the player shell for the 4 real games (`rocas`, `caida`, `bloque-buster`, `serpentina`), and `.cover-<id>--<skin>` CSS variants for the 4 placeholders. It closes each run by writing a `specs/NN-sistema-skins.md` (`Estado: Approved` — already implemented, not a pending plan) and updating its own memory `.claude/agents/skin-designer/memoria.md` (`Fecha | Juego | Skins implementados | Estado | Notas`, states `cumple` · `parcial` · `pendiente`).

Chain: **game-planner decides** (catalog-gap-driven) or **game-jam generates** (theme-driven) → for game-jam, the user promotes a chosen Draft variant to a numbered spec → `/add-game` writes the spec (game-planner path) or the promoted draft is used as-is (game-jam path) → `/spec-impl` implements it. `skin-designer` runs orthogonally to this chain — it doesn't add games, it retrofits skins onto whatever is already in the catalog.

### MCP

- `supabase` (project-scoped, `.mcp.json`) — schema, SQL, logs, advisors, migrations. **Dev project only, never prod.**
- `playwright` — browser automation for visual verification.

### Hooks

- PostToolUse on `Write|Edit` → `.claude/hooks/format-on-save.sh`: Prettier on `.md`, Prettier + `eslint --fix` on `.tsx`/`.jsx`.
- Stop / Notification (local settings) → play a sound.

Prettier config: `semi: true`, `singleQuote: false`, `trailingComma: "all"`; ignores `.next/`, `out/`, `build/`, `next-env.d.ts`, `references/`.

## Git workflow

`main` is protected — no direct pushes. Work on a branch (`spec-NN-slug` for spec work), then open a PR and merge. Recent history follows one branch per spec.
