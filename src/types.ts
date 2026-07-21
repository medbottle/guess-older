export type Game = {
  id: number;
  name: string;
  released: string;
  background_image: string;
};

export type Side = 'left' | 'right';

export type Round = {
  left: Game;
  right: Game;
  revealedSide: Side;
};

export type Feedback = {
  correct: boolean;
  olderSide: Side;
};

export type GameStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'revealing'
  | 'gameover';