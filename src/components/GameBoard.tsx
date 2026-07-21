import type { Feedback, Round, Side } from '../types';
import { GameCard } from './GameCard';

type GameBoardProps = {
  round: Round;
  revealAll: boolean;
  feedback: Feedback | null;
  showFlash: boolean;
  disabled: boolean;
  onPick: (side: Side) => void;
};

function getFlash(side: Side, feedback: Feedback | null, showFlash: boolean): 'correct' | 'wrong' | undefined {
  if (!feedback || !showFlash || side !== feedback.olderSide) {
    return undefined;
  }

  return feedback.correct ? 'correct' : 'wrong';
}

export function GameBoard({ round, revealAll, feedback, showFlash, disabled, onPick }: GameBoardProps) {
  const leftRevealed = revealAll || round.revealedSide === 'left';
  const rightRevealed = revealAll || round.revealedSide === 'right';

  return (
    <section className="game-board">
      <p className="game-board__prompt">Which game is older?</p>
      <div className="game-board__cards">
        <GameCard
          game={round.left}
          side="left"
          revealed={leftRevealed}
          disabled={disabled}
          flash={getFlash('left', feedback, showFlash)}
          onPick={onPick}
        />
        <div className="game-board__divider" aria-hidden="true">
          vs
        </div>
        <GameCard
          game={round.right}
          side="right"
          revealed={rightRevealed}
          disabled={disabled}
          flash={getFlash('right', feedback, showFlash)}
          onPick={onPick}
        />
      </div>
    </section>
  );
}
