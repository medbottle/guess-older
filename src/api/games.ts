import type { Difficulty, Game, PickResult, PublicGame, Side } from '../types';

async function parseError(response: Response): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return data.error ?? 'Request failed';
}

function buildQueryParams(
  excludeIds: number[],
  difficulty?: Difficulty,
): string {
  const params = new URLSearchParams();
  if (excludeIds.length > 0) {
    params.set('exclude', excludeIds.join(','));
  }
  if (difficulty) {
    params.set('difficulty', difficulty);
  }
  return params.toString();
}

export async function fetchPair(
  excludeIds: number[] = [],
  difficulty: Difficulty = 'normal',
): Promise<{ left: Game; right: PublicGame }> {
  const query = buildQueryParams(excludeIds, difficulty);
  const url = `/api/games/pair${query ? `?${query}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<{ left: Game; right: PublicGame }>;
}

export async function fetchChallenger(
  anchorId: number,
  excludeIds: number[] = [],
  difficulty: Difficulty = 'normal',
): Promise<PublicGame> {
  const params = new URLSearchParams({
    anchorId: String(anchorId),
    difficulty,
  });
  if (excludeIds.length > 0) {
    params.set('exclude', excludeIds.join(','));
  }

  const response = await fetch(`/api/games/challenger?${params}`);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<PublicGame>;
}

export async function submitPick(
  leftId: number,
  rightId: number,
  pick: Side,
): Promise<PickResult> {
  const response = await fetch('/api/games/pick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leftId, rightId, pick }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<PickResult>;
}
