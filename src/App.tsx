import { GameBoard } from './components/GameBoard';
import { GameOver } from './components/GameOver';
import { ScoreBar } from './components/ScoreBar';
import { useGameSession } from './hooks/useGameSession';
import './App.css';

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

  const showGameOver = status === 'gameover';

  return (
    <div className="app">
      <ScoreBar streak={streak} highStreak={highStreak} />

      <main className="app__main">
        {status === 'idle' ? (
          <section className="start-screen">
            <h2>Guess Older</h2>
            <p>
            Guess Older is a guessing game where you predict which game released earlier. Try to keep your streak going while testing your knowledge of game history.
            </p>
            {error ? <p className="error-message">{error}</p> : null}
            <button type="button" className="button button--primary" onClick={startGame}>
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
