import { createClient } from "./client";
import type { GameStats, LeaderboardRow } from "../types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${mon}/${d.getFullYear()}`;
}

export async function getLeaderboard(
  gameId: string,
  limit: number
): Promise<LeaderboardRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

export async function getGameStats(gameId: string): Promise<GameStats> {
  const supabase = createClient();

  const [bestResult, countResult] = await Promise.all([
    supabase
      .from("scores")
      .select("score")
      .eq("game_id", gameId)
      .order("score", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("scores")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId),
  ]);

  if (bestResult.error) throw bestResult.error;
  if (countResult.error) throw countResult.error;

  return {
    best: bestResult.data?.score ?? 0,
    plays: countResult.count ?? 0,
  };
}

export async function getBestByName(
  gameId: string,
  name: string
): Promise<LeaderboardRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .eq("name", name)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    rank: 0,
    name: data.name,
    score: data.score,
    date: formatDate(data.created_at),
  };
}

export async function saveScore(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<void> {
  const score = Math.max(0, Math.floor(input.score));
  const name = (input.name.trim() || "INVITADO").slice(0, 10);

  const supabase = createClient();
  const { error } = await supabase
    .from("scores")
    .insert({ game_id: input.gameId, name, score });

  if (error) throw error;
}
