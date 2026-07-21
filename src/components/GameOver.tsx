type GameOverProps = {
  streak: number;
  highStreak: number;
  reason: 'wrong' | 'quit';
  onPlayAgain: () => void;
};

export function GameOver({ streak, highStreak, reason, onPlayAgain }: GameOverProps) {
  const title = reason === 'wrong' ? 'Wrong guess!' : 'Session ended';

  return (
    <div className="game-over">
      <div className="game-over__panel">
        <h2 className="game-over__title">{title}</h2>
        <p className="game-over__score">
          Final streak: <strong>{streak}</strong><br></br>
          Best streak: <strong>{highStreak}</strong>
        </p>
        <button type="button" className="button button--primary" onClick={onPlayAgain}>
          Play again
        </button>
      </div>
    </div>
  );
}
