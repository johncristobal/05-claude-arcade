# Checklist de contenido recurrente para specs de `/add-game`

Este archivo es la referencia que consulta el skill `add-game` al generar cada spec. No es una sección de spec por sí misma — son bloques de contenido que se repiten en **todo** spec de port de juego, para no reescribirlos desde cero cada vez. Se adaptan al juego concreto, no se copian literal.

---

## Contrato compartido del motor (Modelo de datos)

Todo hook `use<PascalId>Game.ts` debe exponer esta forma (generaliza `UseRocasGameResult` de `lib/games/rocas/useRocasGame.ts`):

```ts
export interface UseGameEngineResult {
  canvasRef: (node: HTMLCanvasElement | null) => void;
  score: number;
  lives: number;
  level: number;
  state: "playing" | "dead" | "gameover";
  paused: boolean;
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
  dispose: () => void;
}
```

`canvasRef` es un callback ref (no `RefObject`) — el motor solo se construye y el loop `requestAnimationFrame` solo arranca cuando el nodo `<canvas>` efectivamente monta. Esta propiedad es la que permite llamar cada `useXGame()` de forma incondicional en `page.tsx` sin costo cuando ese juego no es el activo.

---

## Forma del refactor de registro en `page.tsx`

Usar cuando Fase 1.9 detecta que `isRocas` todavía existe en `app/juegos/[id]/jugar/page.tsx` (refactor aún no hecho) — pegar como paso explícito del plan de implementación:

```tsx
// Cada hook de juego real se llama incondicionalmente en cada render — rules of hooks.
// Cada hook es un no-op internamente hasta que su propio <canvas> monta (canvasRef
// recibe un nodo no-null), así que las entradas inactivas no cuestan más que un
// puñado de useState.
const rocas = useRocasGame();
const caida = useCaidaGame(); // ejemplo: próximo juego portado

// Objeto plano armado en cada render a partir de los hooks de arriba — no es un hook.
const REAL_GAME_ENGINES: Record<string, UseGameEngineResult> = {
  rocas,
  caida,
};

const engine = game ? REAL_GAME_ENGINES[game.id] : undefined;
const isReal = !!engine;

const score = isReal ? engine!.score : fakeScore;
const lives = isReal ? engine!.lives : fakeLives;
const paused = isReal ? engine!.paused : fakePaused;
const gameOver = isReal ? engine!.state === "gameover" : over;
```

Render del canvas: un solo branch `isReal ? <canvas ref={engine!.canvasRef} .../> : <div className="game-arena">...</div>` — no un branch por juego.

Cuando el refactor **ya existe** (detectado en Fase 1.9), el plan del spec solo necesita: (1) el `const <id> = use<PascalId>Game();` nuevo, y (2) la entrada nueva en `REAL_GAME_ENGINES`.

---

## Insert condicional en `games` (solo Caso B — id nuevo)

Sin DDL — la tabla y las policies ya existen desde spec 06. Solo un insert de una fila, vía `mcp__supabase__apply_migration`:

```sql
insert into games (id, title) values ('<id>', '<title>');
```

Si el id ya existe en `GAMES`/tabla `games` (Caso A — reemplazo de placeholder), este paso **no aplica** y el spec debe decirlo explícitamente en Scope/Decisiones, no omitirlo en silencio.

---

## Filas de riesgo estándar

Copiadas de `specs/05-rocas-juego-real.md`, incluir cuando apliquen (casi siempre aplican):

| Riesgo                                                                                                                                                              | Mitigación                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doble montaje en React StrictMode (dev): `useEffect` puede correr dos veces, duplicando listeners de teclado o instancias del motor si el cleanup no es exhaustivo. | Cleanup completo en el `return` del `useEffect` (cancela RAF, remueve todos los listeners); probar entrando/saliendo de la página del juego varias veces en dev. |
| Re-render excesivo por sincronizar estado cada frame (60/s).                                                                                                        | Solo llamar `setState` cuando el valor sincronizado cambia respecto al anterior, no en cada frame ciego.                                                         |
| Tecla espacio (u otras usadas por el juego) scrollea la página o interfiere con el input del modal de fin de partida.                                               | `preventDefault()` en el handler para las teclas del juego; ignorar el handler mientras el modal está abierto (`over === true`) o el juego está pausado.         |

---

## Frases estándar de criterios de aceptación

- `npm run build` compila sin errores de tipos ni de lint.
- `/juegos/<id>/jugar` renderiza un `<canvas>` real a resolución nativa (escalado dentro del marco `.crt-screen` existente) en vez de los divs decorativos `.game-arena`.
- HUD (Puntuación/Vidas/Nivel) sincronizado con el estado real del motor, no con la simulación fake.
- Al llegar a `state === 'gameover'` se abre el modal "FIN DEL JUEGO" existente con el score real, y "GUARDAR PUNTUACIÓN" persiste vía `saveScore` (leaderboard real, spec 06).
- Botón PAUSA detiene el avance del juego y muestra el overlay "EN PAUSA" existente; REANUDAR continúa donde quedó.
- Botón FIN termina la partida de inmediato con el score acumulado.
- Botón SALIR con partida en curso muestra `confirm()` antes de navegar; sin partida en curso navega directo.
- Desmontar la página detiene el `requestAnimationFrame` y remueve los listeners de teclado — sin loops en background.
- Los demás juegos/placeholders en `/juegos/[id]/jugar` siguen funcionando exactamente igual, sin regresión.
