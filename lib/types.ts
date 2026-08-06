export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS, ej. "cover-bricks"
  color: GameColor;
  best: number;
  plays: string; // ej. "12.4K"
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/AAAA"
}

export interface User {
  id: string; // auth.users.id (uuid)
  email: string;
  name: string; // derivado de email.split("@")[0], mayúsculas, slice(0, 10)
}

export interface SavedScore {
  game: string; // Game.id
  score: number;
  name: string;
  at: number; // Date.now()
}

export interface PresenceGuest {
  name: string; // "INVITADO_4821"
  online_at: string; // ISO timestamp, new Date().toISOString()
}

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
