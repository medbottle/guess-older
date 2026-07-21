type ScoreBarProps = {
  streak: number;
  highStreak: number;
  onQuit: () => void;
  showQuit: boolean;
};

export function ScoreBar({ streak, highStreak, onQuit, showQuit }: ScoreBarProps) {
  return (
    <header className="score-bar">
      <div className="score-bar__brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a
            href="/"
            className="score-bar__home-icon"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            <img
              src="/icon.png"
              alt="Home"
              width="48"
              height="48"
              style={{ display: 'block' }}
              aria-hidden="true"
            />
          </a>
          <h1 className="score-bar__title" style={{ margin: 0 }}>Guess Older</h1>
        </div>
  
      </div>
      <div className="score-bar__actions">
        <div className="score-bar__streak">
          <span className="score-bar__streak-label">Streak</span>
          <span className="score-bar__streak-value">{streak}</span>
        </div>
        <div className="score-bar__streak score-bar__streak--best">
          <span className="score-bar__streak-label">Best</span>
          <span className="score-bar__streak-value">{highStreak}</span>
        </div>
      </div>
    </header>
  );
}
