import { getSupabase, type DbGame } from "./supabase.js";

export type PublicGame = Omit<DbGame, "released">;

export function parseExcludeIds(value: unknown): number[] {
  if (typeof value !== "string" || !value) {
    return [];
  }

  return value
    .split(",")
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}

export function toPublicGame(game: DbGame): PublicGame {
  return {
    id: game.id,
    name: game.name,
    background_image: game.background_image,
    developers: game.developers,
  };
}

export async function getRandomGame(excludeIds: number[]): Promise<DbGame> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_random_game", {
    exclude_ids: excludeIds,
  });

  if (error) {
    throw new Error(error.message);
  }

  const game = Array.isArray(data) ? data[0] : data;

  if (!game) {
    throw new Error("No games found in database.");
  }

  return game as DbGame;
}

export async function getGameById(id: number): Promise<DbGame | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as DbGame | null;
}

export function getOlderSide(left: DbGame, right: DbGame): "left" | "right" {
  return left.released < right.released ? "left" : "right";
}

export async function findChallenger(
  anchorId: number,
  excludeIds: number[],
): Promise<DbGame> {
  const anchor = await getGameById(anchorId);

  if (!anchor) {
    throw new Error(`Anchor game ${anchorId} not found`);
  }

  let exclude = [...excludeIds, anchorId];

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = await getRandomGame(exclude);

    if (candidate.released !== anchor.released) {
      return candidate;
    }

    exclude = [...exclude, candidate.id];
  }

  throw new Error("Could not find games with different release dates");
}
