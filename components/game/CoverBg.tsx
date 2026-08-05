"use client";

// Cover art de un juego (thumbnail decorativo, no el canvas de juego) con
// soporte de skin para los placeholders (`gloton`, `invasores`,
// `duelo-pixel`). Componente cliente compartido por GameCard, GameCardMini
// y la página de detalle (esta última es server component y no puede leer
// `localStorage` directamente).
import { coverClassFor, useSkinPreference } from "@/lib/games/skins";
import type { Game } from "@/lib/types";

export function CoverBg({ game }: { game: Game }) {
  const [skin] = useSkinPreference();
  return (
    <div
      className={"cover-bg " + coverClassFor(game.id, game.cover, skin)}
    ></div>
  );
}
