import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchInitialPair, fetchRandomGame } from '../api/games';
import type { Feedback, Game, GameStatus, Round, Side } from '../types';
import { getHighStreak, saveHighStreak } from '../utils/highScore';

const REVEAL_BEFORE_FLASH_MS = 500;
const FLASH_BEFORE_CONTINUE_MS = 1200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function releaseTimestamp(date: string): number {
  return new Date(`${date}T00:00:00`).getTime();
}

function isOlder(game: Game, other: Game): boolean {
  return releaseTimestamp(game.released) < releaseTimestamp(other.released);
}

function getOlderSide(round: Round): Side {
  return isOlder(round.left, round.right) ? 'left' : 'right';
}

async function ensureDistinctDates(
  anchor: Game,
  challenger: Game,
  excludeIds: number[],
): Promise<Game> {
  if (challenger.released !== anchor.released) {
    return challenger;
  }

  let exclude = [...excludeIds, anchor.id, challenger.id];

  for (let attempt = 0; attempt < 5; attempt++) {
    const replacement = await fetchRandomGame(exclude);
    if (replacement.released !== anchor.released) {
      return replacement;
    }
    exclude = [...exclude, replacement.id];
  }

  throw new Error('Could not find games with different release dates');
}

export function useGameSession() {
  const [round, setRound] = useState<Round | null>(null);
  const [streak, setStreak] = useState(0);
  const [highStreak, setHighStreak] = useState(getHighStreak);
  const [status, setStatus] = useState<GameStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [revealAll, setRevealAll] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [playedIds, setPlayedIds] = useState<number[]>([]);
  const prefetchedGame = useRef<Game | null>(null);
  const prefetchPromise = useRef<Promise<Game> | null>(null);
  const pickGeneration = useRef(0);

  useEffect(() => {
    return () => {
      pickGeneration.current += 1;
    };
  }, []);

  const recordStreak = useCallback((value: number) => {
    setHighStreak((current) => {
      const next = saveHighStreak(value);
      return next > current ? next : current;
    });
  }, []);

  const prefetchNext = useCallback((excludeIds: number[]) => {
    prefetchPromise.current = fetchRandomGame(excludeIds)
      .then((game) => {
        prefetchedGame.current = game;
        return game;
      })
      .catch(() => {
        prefetchedGame.current = null;
        prefetchPromise.current = null;
        throw new Error('Failed to prefetch next game');
      });
  }, []);

  const getNextGame = useCallback(async (excludeIds: number[]): Promise<Game> => {
    if (prefetchedGame.current && !excludeIds.includes(prefetchedGame.current.id)) {
      const game = prefetchedGame.current;
      prefetchedGame.current = null;
      prefetchPromise.current = null;
      return game;
    }

    if (prefetchPromise.current) {
      try {
        const game = await prefetchPromise.current;
        if (!excludeIds.includes(game.id)) {
          prefetchedGame.current = null;
          prefetchPromise.current = null;
          return game;
        }
      } catch {
        prefetchedGame.current = null;
        prefetchPromise.current = null;
      }
    }

    return fetchRandomGame(excludeIds);
  }, []);

  const startGame = useCallback(async () => {
    setStatus('loading');
    setStreak(0);
    setRevealAll(false);
    setFeedback(null);
    setShowFlash(false);
    setError(null);
    prefetchedGame.current = null;
    prefetchPromise.current = null;
    pickGeneration.current += 1;

    try {
      const [initialLeft, initialRight] = await fetchInitialPair([]);
      const left = initialLeft;
      const right = await ensureDistinctDates(left, initialRight, []);
      const initialPlayedIds = [left.id, right.id];

      setRound({ left, right, revealedSide: 'left' });
      setPlayedIds(initialPlayedIds);
      setStreak(0);
      setStatus('playing');
      prefetchNext(initialPlayedIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
      setStatus('idle');
    }
  }, [prefetchNext]);

  const handlePick = useCallback(
    async (side: Side) => {
      if (!round || status !== 'playing') {
        return;
      }

      const currentRound = round;
      const currentPlayedIds = playedIds;
      const olderSide = getOlderSide(currentRound);
      const correct = side === olderSide;
      const nextLeft = currentRound.right;
      const generation = pickGeneration.current + 1;
      pickGeneration.current = generation;
      const nextGamePromise = getNextGame(currentPlayedIds).then((game) =>
        ensureDistinctDates(nextLeft, game, currentPlayedIds),
      );

      setStatus('revealing');
      setRevealAll(true);
      setFeedback({ correct, olderSide });
      setShowFlash(false);

      await delay(REVEAL_BEFORE_FLASH_MS);
      if (pickGeneration.current !== generation) {
        return;
      }

      setShowFlash(true);
      await delay(FLASH_BEFORE_CONTINUE_MS);
      if (pickGeneration.current !== generation) {
        return;
      }

      if (!correct) {
        recordStreak(streak);
        setStatus('gameover');
        return;
      }

      const nextStreak = streak + 1;
      setStreak(nextStreak);
      recordStreak(nextStreak);

      try {
        const newGame = await nextGamePromise;
        const updatedPlayedIds = [...currentPlayedIds, newGame.id];

        if (pickGeneration.current !== generation) {
          return;
        }

        setPlayedIds(updatedPlayedIds);
        setRound({
          left: nextLeft,
          right: newGame,
          revealedSide: 'left',
        });
        setRevealAll(false);
        setFeedback(null);
        setShowFlash(false);
        setStatus('playing');

        prefetchNext(updatedPlayedIds);
      } catch (err) {
        if (pickGeneration.current !== generation) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to load next game');
        setStatus('gameover');
      }
    },
    [round, status, playedIds, streak, getNextGame, prefetchNext, recordStreak],
  );

  const playAgain = useCallback(() => {
    pickGeneration.current += 1;
    setRound(null);
    setStreak(0);
    setPlayedIds([]);
    setRevealAll(false);
    setFeedback(null);
    setShowFlash(false);
    setError(null);
    prefetchedGame.current = null;
    prefetchPromise.current = null;
    setStatus('idle');
  }, []);

  return {
    round,
    streak,
    highStreak,
    status,
    error,
    revealAll,
    feedback,
    showFlash,
    startGame,
    handlePick,
    playAgain,
  };
}
