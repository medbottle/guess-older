import type { Game } from '../types';

export async function fetchRandomGame(excludeIds: number[] = []): Promise<Game> {
  const params = new URLSearchParams();
  if (excludeIds.length > 0) {
    params.set('exclude', excludeIds.join(','));
  }

  const query = params.toString();
  const url = `/api/games/random${query ? `?${query}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? 'Failed to fetch game');
  }

  return response.json() as Promise<Game>;
}

export async function fetchInitialPair(excludeIds: number[] = []): Promise<[Game, Game]> {
  const left = await fetchRandomGame(excludeIds);
  const right = await fetchRandomGame([...excludeIds, left.id]);
  return [left, right];
}
