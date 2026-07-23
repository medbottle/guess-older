import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  findChallenger,
  getRandomGame,
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
    const left = await getRandomGame(exclude);
    const right = await findChallenger(left.id, exclude);

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
