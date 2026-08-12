import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  findPair,
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
    const exclude = parseExcludeIds(req.query.exclude);
    const difficulty = parseDifficulty(req.query.difficulty);
    const { left, right } = await findPair(exclude, difficulty);

    res.status(200).json({
      left,
      right: toPublicGame(right),
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
