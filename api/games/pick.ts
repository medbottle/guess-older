import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getGameById, getOlderSide } from "../lib/games.js";

type PickBody = {
  leftId?: number;
  rightId?: number;
  pick?: "left" | "right";
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = (req.body ?? {}) as PickBody;
    const leftId = Number(body.leftId);
    const rightId = Number(body.rightId);
    const pick = body.pick;

    if (!leftId || Number.isNaN(leftId)) {
      res.status(400).json({ error: "leftId is required" });
      return;
    }

    if (!rightId || Number.isNaN(rightId)) {
      res.status(400).json({ error: "rightId is required" });
      return;
    }

    if (pick !== "left" && pick !== "right") {
      res.status(400).json({ error: "pick must be left or right" });
      return;
    }

    const [left, right] = await Promise.all([
      getGameById(leftId),
      getGameById(rightId),
    ]);

    if (!left || !right) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    const olderSide = getOlderSide(left, right);

    res.status(200).json({
      correct: pick === olderSide,
      olderSide,
      rightReleased: right.released,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
