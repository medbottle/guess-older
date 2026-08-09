export type PublicGame = {
  id: number;
  name: string;
  background_image: string;
  developers: string;
};

export type Game = PublicGame & {
  released: string;
};

export type Side = 'left' | 'right';

export type Round = {
  left: Game;
  right: PublicGame | Game;
  revealedSide: Side;
};

export type Feedback = {
  correct: boolean;
  olderSide: Side;
};

export type PickResult = {
  correct: boolean;
  olderSide: Side;
  rightReleased: string;
};

export type GameStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'revealing'
  | 'gameover';
