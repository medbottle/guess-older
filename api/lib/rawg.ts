export type RawgGame = {
  id: number;
  name: string;
  released: string | null;
  background_image: string | null;
};

export type RawgGameDetails = RawgGame & {
  developers?: { name: string }[];
};

export type GameInsert = {
  id: number;
  name: string;
  released: string;
  background_image: string;
  developers: string;
};

const PAGE_SIZE = 40;

function getRawgApiKey(): string {
  const key = process.env.RAWG_API_KEY;
  if (!key) {
    throw new Error("RAWG_API_KEY not configured");
  }
  return key;
}

export function isValidRawgGame(game: RawgGame): game is GameInsert {
  return Boolean(game.released) && Boolean(game.background_image);
}

export async function fetchGamesPage(page: number) {
  const url = new URL("https://api.rawg.io/api/games");
  url.searchParams.set("key", getRawgApiKey());
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(PAGE_SIZE));
  url.searchParams.set("ordering", "-added");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`RAWG API error: ${response.status}`);
  }

  return response.json() as Promise<{
    results: RawgGame[];
    count: number;
  }>;
}

export async function fetchGameDetails(id: number): Promise<RawgGameDetails> {
  const url = new URL(`https://api.rawg.io/api/games/${id}`);
  url.searchParams.set("key", getRawgApiKey());

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`RAWG API error: ${response.status} for game ${id}`);
  }

  return response.json() as Promise<RawgGameDetails>;
}

export function toGameInsert(
  game: RawgGame,
  developers = "Unknown",
): GameInsert | null {
  if (!isValidRawgGame(game)) {
    return null;
  }

  return {
    id: game.id,
    name: game.name,
    released: game.released,
    background_image: game.background_image,
    developers,
  };
}

export function getTotalPages(count: number): number {
  return Math.max(1, Math.ceil(count / PAGE_SIZE));
}

export { PAGE_SIZE };
