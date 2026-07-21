import { useEffect, useState } from 'react';
import type { Game, Side } from '../types';

type GameCardProps = {
  game: Game;
  side: Side;
  revealed: boolean;
  disabled: boolean;
  flash?: 'correct' | 'wrong';
  onPick: (side: Side) => void;
};

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function GameCard({ game, side, revealed, disabled, flash, onPick }: GameCardProps) {
  const [imageError, setImageError] = useState(false);
  const flashClass = flash ? ` game-card--flash-${flash}` : '';

  useEffect(() => {
    setImageError(false);
  }, [game.id]);

  return (
    <button
      type="button"
      className={`game-card game-card--${side}${revealed ? ' game-card--revealed' : ''}${flashClass}`}
      disabled={disabled}
      onClick={() => onPick(side)}
    >
      <div key={game.id} className="game-card__content">
        <div className="game-card__image-wrap">
          {imageError ? (
            <div className="game-card__placeholder">No cover</div>
          ) : (
            <img
              src={game.background_image}
              alt={`${game.name} cover`}
              className="game-card__image"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          )}
        </div>
        <div className="game-card__body">
          <h2 className="game-card__title">{game.name}</h2>
          <p className={`game-card__date${revealed ? '' : ' game-card__date--hidden'}`}>
            {revealed ? formatDate(game.released) : 'XXX X, XXXX'}
          </p>
        </div>
      </div>
    </button>
  );
}
