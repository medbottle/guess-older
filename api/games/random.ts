import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRandomGame, parseExcludeIds, toPublicGame } from "../lib/games.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    const exclude = parseExcludeIds(req.query.exclude);
    const game = await getRandomGame(exclude);

    res.status(200).json(toPublicGame(game));
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
