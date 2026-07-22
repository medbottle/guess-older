import type { VercelRequest, VercelResponse } from "@vercel/node";

type RawgGame = {
  id: number;
  name: string;
  released: string | null;
  tba: boolean;
  background_image: string | null;
};

type Game = {
  id: number;
  name: string;
  released: string;
  tba: boolean;
  background_image: string;
};

const RAWG_API_KEY = process.env.RAWG_API_KEY;

function isValidGame(
  game: RawgGame,
  excludeIds: Set<number>
): game is Game {
  return (
    !excludeIds.has(game.id) &&
    Boolean(game.released) &&
    !game.tba &&
    Boolean(game.background_image)
  );
}

const MIN_OBSCURE_PAGE = 15;
const MAX_OBSCURE_PAGE = 50;

async function fetchGamesPage(page: number) {
  if (!RAWG_API_KEY) {
    throw new Error("RAWG_API_KEY not configured");
  }

  const url = new URL("https://api.rawg.io/api/games");

  url.searchParams.set("key", RAWG_API_KEY);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", "40");
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

function pickObscurePage(totalPages: number) {
  if (totalPages <= MIN_OBSCURE_PAGE) {
    return Math.floor(Math.random() * totalPages) + 1;
  }

  const maxPage = Math.min(totalPages, MAX_OBSCURE_PAGE);

  return (
    MIN_OBSCURE_PAGE +
    Math.floor(Math.random() * (maxPage - MIN_OBSCURE_PAGE + 1))
  );
}

async function getRandomGame(excludeIds: number[]): Promise<Game> {
  const exclude = new Set(excludeIds);

  for (let attempt = 0; attempt < 5; attempt++) {
    const firstPage = await fetchGamesPage(1);

    const totalPages = Math.max(
      1,
      Math.ceil(firstPage.count / 40)
    );

    const randomPage = pickObscurePage(totalPages);

    const page =
      randomPage === 1
        ? firstPage
        : await fetchGamesPage(randomPage);

    const validGames = page.results.filter((g) =>
      isValidGame(g, exclude)
    );

    if (validGames.length) {
      return validGames[
        Math.floor(Math.random() * validGames.length)
      ];
    }
  }

  throw new Error("Could not find a valid game.");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const exclude =
      typeof req.query.exclude === "string"
        ? req.query.exclude
            .split(",")
            .map(Number)
            .filter((n) => !Number.isNaN(n))
        : [];

    const game = await getRandomGame(exclude);

    res.status(200).json(game);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}