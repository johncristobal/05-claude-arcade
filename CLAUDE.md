# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — online arcade platform, play games and compete for high scores. Currently a fresh `create-next-app` scaffold (App Router, TypeScript, Tailwind v4); no game/arcade features implemented yet.

This project follows Spec Driven Design via the `/spec` and `/spec-impl` skills from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (`npx skills@latest add Klerith/fernando-skills`). Check for `/spec` docs before implementing new features.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)

No test runner is configured yet.

## Critical: this is not the Next.js you know

`next` is pinned to `16.2.10`, ahead of training data, with real breaking changes. **Before writing any Next.js code, read the matching guide in `node_modules/next/dist/docs/` first** (`01-app/` for App Router, `03-architecture/` for internals). Known deprecations so far:

- **Middleware is renamed Proxy.** `middleware.ts` is gone — use a root `proxy.ts` exporting `proxy()` (or default export). See `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`. Don't reach for `middleware.ts` from muscle memory.

Assume other APIs/conventions may have shifted too — verify against the docs directory rather than trusting prior knowledge.

## Architecture

- App Router only (`app/` directory) — `app/layout.tsx` is the root layout (Geist Sans/Mono fonts via `next/font/google`, wired into Tailwind via CSS variables in `app/globals.css`); `app/page.tsx` is the default CNA landing page, not yet replaced.
- Tailwind v4 via `@tailwindcss/postcss`, configured in `app/globals.css` using `@theme inline` (no `tailwind.config.js` — v4 is CSS-first).
- Path alias `@/*` maps to project root (`tsconfig.json`).

## Skills

Use /frontend-design to design user interface