import Link from "next/link";
import type { Game } from "@/lib/types";
import { CoverBg } from "@/components/game/CoverBg";

export function GameCardMini({ game }: { game: Game }) {
  return (
    <Link href={`/juegos/${game.id}`} className="mini-card">
      <div className="mini-cover">
        <CoverBg game={game} />
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.cat}</div>
      </div>
    </Link>
  );
}
