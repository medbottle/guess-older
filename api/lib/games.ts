import { getSupabase, type DbGame } from "./supabase.js";

export type PublicGame = Omit<DbGame, "released" | "added">;

export type Difficulty = "easy" | "normal" | "hard";

/** Minimum IGDB `total_rating_count` (stored as `added`) for the difficulty pool. */
const DIFFICULTY_MIN_ADDED: Record<Difficulty, number> = {
  easy: 500,
  normal: 100,
  hard: 10,
};

const PAIR_ANCHOR_RETRIES = 8;

export function parseExcludeIds(value: unknown): number[] {
  if (typeof value !== "string" || !value) {
    return [];
  }

  return value
    .split(",")
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}

export function parseDifficulty(value: unknown): Difficulty {
  if (value === "easy" || value === "normal" || value === "hard") {
    return value;
  }

  return "normal";
}

export function toPublicGame(game: DbGame): PublicGame {
  return {
    id: game.id,
    name: game.name,
    background_image: game.background_image,
    developers: game.developers,
  };
}

export async function getRandomGame(
  excludeIds: number[],
  difficulty?: Difficulty,
): Promise<DbGame> {
  const minAdded = difficulty ? DIFFICULTY_MIN_ADDED[difficulty] : 0;
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_random_game", {
    exclude_ids: excludeIds,
    min_added: minAdded,
  });

  if (error) {
    throw new Error(error.message);
  }

  const game = Array.isArray(data) ? data[0] : data;

  if (!game) {
    throw new Error(
      difficulty
        ? `No games found in database for difficulty "${difficulty}".`
        : "No games found in database.",
    );
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
  difficulty: Difficulty = "normal",
): Promise<DbGame> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_random_challenger", {
    anchor_id: anchorId,
    exclude_ids: excludeIds,
    min_added: DIFFICULTY_MIN_ADDED[difficulty],
  });

  if (error) {
    throw new Error(error.message);
  }

  const game = Array.isArray(data) ? data[0] : data;

  if (!game) {
    throw new Error(
      `Could not find a challenger for difficulty "${difficulty}"`,
    );
  }

  return game as DbGame;
}

export async function findPair(
  excludeIds: number[],
  difficulty: Difficulty = "normal",
): Promise<{ left: DbGame; right: DbGame }> {
  let exclude = [...excludeIds];

  for (let attempt = 0; attempt < PAIR_ANCHOR_RETRIES; attempt++) {
    const left = await getRandomGame(exclude, difficulty);

    try {
      const right = await findChallenger(left.id, exclude, difficulty);
      return { left, right };
    } catch {
      exclude = [...exclude, left.id];
    }
  }

  throw new Error(
    `Could not find a game pair for difficulty "${difficulty}"`,
  );
}
