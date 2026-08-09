import type { Game, PickResult, PublicGame, Side } from '../types';

async function parseError(response: Response): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return data.error ?? 'Request failed';
}

function buildExcludeParams(excludeIds: number[]): string {
  const params = new URLSearchParams();
  if (excludeIds.length > 0) {
    params.set('exclude', excludeIds.join(','));
  }
  return params.toString();
}

export async function fetchPair(
  excludeIds: number[] = [],
): Promise<{ left: Game; right: PublicGame }> {
  const query = buildExcludeParams(excludeIds);
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
): Promise<PublicGame> {
  const params = new URLSearchParams({ anchorId: String(anchorId) });
  const exclude = buildExcludeParams(excludeIds);
  if (exclude) {
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
