// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 664 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PADDLE = {
  width: 120,
  height: 18,
  y: 664,
  speed: 680,
  /** Wide power-up: paddle this many times its base width, for this many seconds. */
  wideScale: 1.5,
  wideSeconds: 12,
};

export const BALL = {
  radius: 9,
  baseSpeed: 560,
  speedPerLevel: 40,
  maxSpeed: 780,
  /** Slow power-up: balls move this fraction of their speed, for this many seconds. */
  slowScale: 0.7,
  slowSeconds: 8,
  /** The steepest bounce off the paddle, in degrees from straight up. */
  maxBounceDegrees: 60,
  /** The shallowest bounce: a centred hit still leaves at this angle, so the ball never
   * falls into a straight up-and-down loop through one gap in the wall. */
  minBounceDegrees: 12,
};

export const LIVES = 3;
export const MAX_LIVES = 5;

export const BRICK = {
  cols: 10,
  width: 104,
  height: 26,
  gap: 8,
  top: 96,
  normalPoints: 10,
  toughPoints: 25,
  toughFirstHitPoints: 5,
};

/** Brick rows per level, top to bottom. '.' is empty, '1' a normal brick, '2' a tough brick (2 hits). */
export const LEVELS = [
  [
    '1111111111',
    '1111111111',
    '1111111111',
  ],
  [
    '1111111111',
    '1.111111.1',
    '1121111211',
    '1111111111',
  ],
  [
    '2221111222',
    '2111111112',
    '1.22111221',
    '1111111111',
    '.21111112.',
  ],
];

export const POWERUP = {
  fallSpeed: 210,
  /** Chance a broken brick drops a capsule. */
  dropChance: 0.2,
  /** Of the drops, this share is an extra life (the rest split evenly over wide/multi/slow). */
  lifeShare: 0.08,
  size: 34,
};

export const COMBO = {
  /** Points added per brick in the current chain, capped here. */
  perChain: 2,
  cap: 20,
  /** The HUD shows the chain once it reaches this many bricks. */
  showAt: 3,
};

export const PARTICLES = 128;

/** How many balls can exist at once; the pool is allocated once, at boot. */
export const BALL_POOL = 4;
export const POWERUP_POOL = 8;

export const PALETTE = {
  backdrop: '#0b0e1a',
  field: '#12172b',
  panel: '#1c2440',
  panelEdge: '#33406e',
  text: '#f2f5ff',
  muted: '#8f9bb8',
  accent: '#4fc3f7',
  paddle: '#4fc3f7',
  paddleCore: '#e8fbff',
  ball: '#ffffff',
  ballTrail: '#9be7ff',
  brickRows: ['#ff5d73', '#ff9f43', '#ffd32a', '#2ed573', '#1e90ff', '#a55eea'],
  tough: '#c0c8dc',
  toughCrack: '#5a6378',
  powerWide: '#4fc3f7',
  powerMulti: '#ff6b9d',
  powerSlow: '#2ed573',
  powerLife: '#ffd32a',
  powerText: '#0b0e1a',
  dim: 'rgba(11, 14, 26, 0.72)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'prism-breaker.best';
