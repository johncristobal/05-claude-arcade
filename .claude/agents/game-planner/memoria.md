# Memoria — game-planner

Historial de juegos propuestos, considerados y descartados para Arcade Vault. Lo mantiene el agente `game-planner`; no editar a mano salvo para corregir un estado.

Estados: `implementado` · `propuesto` · `considerado` · `descartado`.

| Fecha      | Juego     | Id destino      | Estado       | Veredicto                                                     |
| ---------- | --------- | --------------- | ------------ | ------------------------------------------------------------- |
| 2026-07-26 | Asteroids | `rocas`         | implementado | Port 1:1 de `references/started-games/02-asteroids` — spec 05. |
| 2026-07-27 | Tetris    | `caida`         | implementado | Port 1:1 de `references/started-games/03-tetris` — spec 07.    |
| 2026-07-28 | Arkanoid  | `bloque-buster` | implementado | Port 1:1 de `references/started-games/04-arkanoid` — spec 08.  |
| 2026-07-29 | Snake     | `serpentina`    | implementado | Diseño desde cero con `source-assets/snake-assets` — spec 09.  |

## Notas

### Estado de las fuentes (2026-07-30)

- `references/started-games/` — las tres carpetas (`02-asteroids`, `03-tetris`, `04-arkanoid`) ya están portadas. No queda código de referencia sin usar.
- `references/source-assets/` — solo `snake-assets`, ya consumido por `serpentina`.
- Consecuencia: todo candidato nuevo es **diseño desde cero**, salvo que se agreguen fuentes nuevas a `references/`.

### Placeholders libres

`gloton` (Pac-Man), `invasores` (Space Invaders), `ranaria` (Frogger), `duelo-pixel` (Pong). Ninguno tiene motor; usarlos evita migración de Supabase.
