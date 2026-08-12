import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  findChallenger,
  parseDifficulty,
  parseExcludeIds,
  toPublicGame,
} from "../lib/games.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const anchorId = Number(req.query.anchorId);

    if (!anchorId || Number.isNaN(anchorId)) {
      res.status(400).json({ error: "anchorId is required" });
      return;
    }

    const exclude = parseExcludeIds(req.query.exclude);
    const difficulty = parseDifficulty(req.query.difficulty);
    const challenger = await findChallenger(anchorId, exclude, difficulty);

    res.status(200).json(toPublicGame(challenger));
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
