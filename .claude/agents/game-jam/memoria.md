# Memoria — game-jam

Historial de corridas del agente `game-jam` (specs de variantes por tema, siempre en `Estado: Draft`). No editar a mano salvo para actualizar el estado de una variante ya aceptada/implementada/descartada por el usuario.

Estados válidos: `implementado` · `propuesto` · `descartado`.

| Fecha      | Tema    | Carpeta                   | Variantes (id destino c/u)                                                                                                                           | Estado    |
| ---------- | ------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 2026-07-31 | Frogger | `specs/game-jam/frogger/` | variante-a: RANARIA (`ranaria`, reuso placeholder) · variante-b: SEMÁFORO (`semaforo`, id nuevo) · variante-c: DUELO DE CARRILES (`cruce`, id nuevo) | propuesto |

## Notas

### Corrida 2026-07-31 — tema "Frogger"

Motivada explícitamente por la fila `Frogger` de `JUEGOS.md` (línea 92, dentro del pipeline de 20 propuestas de `game-planner`) y por la fila `Frogger`/`ranaria` ya existente en `.claude/agents/game-planner/memoria.md` (2026-07-31, tercera ronda, estado `propuesto`). Se revisó esa memoria antes de generar nada: `game-planner` nunca escribe specs, solo recomienda qué id construir — su propuesta para `ranaria` es una sola línea de justificación ("vidas y multi-carril sin IA de persecución, frente al pathfinding de 4 fantasmas de Pac-Man"), sin diseño mecánico detallado.

Se generaron 3 variantes con mecánicas deliberadamente distintas entre sí, todas interpretando "cruzar esquivando obstáculos en carriles":

- **variante-a (RANARIA, id `ranaria`, ARCADE, Caso A — reuso de placeholder):** la interpretación más fiel al Frogger clásico — grilla 20×15, movimiento discreto por celda (hop), banda de río con troncos, banda de carretera con vehículos, contrarreloj por vida, 5 huecos de meta. Retoma explícitamente el mismo id/concepto que la fila `propuesto` de `game-planner`, documentado en el spec como "materialización completa de una recomendación que nunca tuvo spec propio", no como duplicación silenciosa.
- **variante-b (SEMÁFORO, id `semaforo`, PUZZLE, Caso B — id nuevo):** reinterpreta el tema como puzzle de lectura de patrones por turnos — sin reloj, sin reflejos; el mundo solo avanza cuando el jugador actúa, y cada carril sigue un ciclo 100% determinista que hay que anticipar leyendo un panel de pronóstico. Misma familia de diseño que `secuencia` (Simón) en el pipeline de `game-planner`, aplicada a movimiento espacial.
- **variante-c (DUELO DE CARRILES, id `cruce`, VERSUS, Caso B — id nuevo):** reinterpreta el tema como carrera 1 vs CPU en tiempo real, movimiento continuo (no grillado), colisión = setback (no letal), gana quien llega primero a la meta en su propia pista, mejor de 5 rondas. Refuerza VERSUS, la categoría con menos motores reales del catálogo hoy (0/8).

Ninguna variante repite un concepto que `game-planner` marque `implementado`. `semaforo` y `cruce` son ids genuinamente nuevos, sin colisión con ninguno de los 8 ids actuales de `lib/data.ts` ni con los 20 ids ya propuestos por `game-planner` (`duelo-pixel`, `invasores`, `ranaria`, `gloton`, `fusion`, `estela`, `impacto`, `secuencia`, `nocaut`, `parejas`, `galeria`, `conecta4`, `topos`, `minas`, `vuelo`, `gato`, `verdugo`, `codigo`, `montones`, `apagon`).

Fuentes verificadas antes de diseñar: `references/started-games/` (solo `02-asteroids`, `03-tetris`, `04-arkanoid`, las tres ya portadas) y `references/source-assets/` (solo `snake-assets`, ya consumido) — sin material nuevo, las tres variantes son diseño desde cero.
