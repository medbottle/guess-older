import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchChallenger, fetchPair, submitPick } from '../api/games';
import type { Feedback, Game, GameStatus, PublicGame, Round, Side } from '../types';
import { getHighStreak, saveHighStreak } from '../utils/highScore';

const REVEAL_BEFORE_FLASH_MS = 500;
const FLASH_BEFORE_CONTINUE_MS = 1200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
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
  const prefetchedGame = useRef<PublicGame | null>(null);
  const prefetchPromise = useRef<Promise<PublicGame> | null>(null);
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

  const prefetchNext = useCallback((anchorId: number, excludeIds: number[]) => {
    prefetchPromise.current = fetchChallenger(anchorId, excludeIds)
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

  const getNextChallenger = useCallback(
    async (anchorId: number, excludeIds: number[]): Promise<PublicGame> => {
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

      return fetchChallenger(anchorId, excludeIds);
    },
    [],
  );

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
      const { left, right } = await fetchPair([]);
      const initialPlayedIds = [left.id, right.id];

      setRound({ left, right, revealedSide: 'left' });
      setPlayedIds(initialPlayedIds);
      setStreak(0);
      setStatus('playing');
      prefetchNext(left.id, initialPlayedIds);
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
      const generation = pickGeneration.current + 1;
      pickGeneration.current = generation;

      setStatus('revealing');

      let pickResult;
      try {
        pickResult = await submitPick(
          currentRound.left.id,
          currentRound.right.id,
          side,
        );
      } catch (err) {
        if (pickGeneration.current !== generation) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to submit pick');
        setStatus('gameover');
        return;
      }

      if (pickGeneration.current !== generation) {
        return;
      }

      const nextLeft: Game = {
        ...currentRound.right,
        released: pickResult.rightReleased,
      };
      const nextGamePromise = getNextChallenger(nextLeft.id, currentPlayedIds);

      setRound({
        left: currentRound.left,
        right: nextLeft,
        revealedSide: currentRound.revealedSide,
      });
      setRevealAll(true);
      setFeedback({
        correct: pickResult.correct,
        olderSide: pickResult.olderSide,
      });
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

      if (!pickResult.correct) {
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

        prefetchNext(nextLeft.id, updatedPlayedIds);
      } catch (err) {
        if (pickGeneration.current !== generation) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to load next game');
        setStatus('gameover');
      }
    },
    [round, status, playedIds, streak, getNextChallenger, prefetchNext, recordStreak],
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
