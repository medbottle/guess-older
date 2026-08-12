import { useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { GameOver } from './components/GameOver';
import { ScoreBar } from './components/ScoreBar';
import { useGameSession } from './hooks/useGameSession';
import type { Difficulty } from './types';
import './App.css';

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

export default function App() {
  const {
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
  } = useGameSession();
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty>('normal');

  const showGameOver = status === 'gameover';

  return (
    <div className="app">
      <ScoreBar streak={streak} highStreak={highStreak} />

      <main className="app__main">
        {status === 'idle' ? (
          <section className="start-screen">
            <h2>Guess Older</h2>
            <p>
              Guess Older is a guessing game where you predict which game
              released earlier. Try to keep your streak going while testing your
              knowledge of game history.
            </p>
            <div
              className="difficulty-picker"
              role="group"
              aria-label="Difficulty"
            >
              {DIFFICULTIES.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`button button--ghost${
                    selectedDifficulty === level ? ' button--selected' : ''
                  }`}
                  aria-pressed={selectedDifficulty === level}
                  onClick={() => setSelectedDifficulty(level)}
                >
                  {DIFFICULTY_LABELS[level]}
                </button>
              ))}
            </div>
            {error ? <p className="error-message">{error}</p> : null}
            <button
              type="button"
              className="button button--primary"
              onClick={() => startGame(selectedDifficulty)}
            >
              Start
            </button>
          </section>
        ) : null}

        {status === 'loading' ? (
          <section className="loading-screen">
            <div className="spinner" aria-hidden="true" />
          </section>
        ) : null}

        {round && (status === 'playing' || status === 'revealing') ? (
          <GameBoard
            round={round}
            revealAll={revealAll}
            feedback={feedback}
            showFlash={showFlash}
            disabled={status !== 'playing'}
            onPick={handlePick}
          />
        ) : null}

        {showGameOver ? (
          <GameOver
            streak={streak}
            highStreak={highStreak}
            reason={'wrong'}
            onPlayAgain={playAgain}
          />
        ) : null}
      </main>
    </div>
  );
}
