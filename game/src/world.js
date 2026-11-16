// The game's rules and state, with no drawing and no browser in it: the paddle, the balls,
// the brick wall, falling power-ups and particles, levels, score, lives and the win/lose
// conditions. step() advances one fixed step and returns what happened as bit flags, so the
// caller can react (sounds, screens) without the world knowing about screens or sound.
// Nothing here allocates after createWorld returns.

import {
  BALL,
  BALL_POOL,
  BRICK,
  COMBO,
  FIELD,
  LEVELS,
  LIVES,
  MAX_LIVES,
  PADDLE,
  PALETTE,
  PARTICLES,
  POWERUP,
  POWERUP_POOL,
} from './config.js';

export const EVENT_BRICK = 1;
export const EVENT_TOUGH = 2;
export const EVENT_POWERUP = 4;
export const EVENT_PADDLE = 8;
export const EVENT_LOST = 16;
export const EVENT_LEVEL = 32;
export const EVENT_OVER = 64;
export const EVENT_WIN = 128;

export const POWER_WIDE = 'wide';
export const POWER_MULTI = 'multi';
export const POWER_SLOW = 'slow';
export const POWER_LIFE = 'life';

/** The bonus for clearing a level: a hundred points per life still held. */
export function levelBonus(state) {
  return state.lives * 100;
}

const TWO_PI = Math.PI * 2;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function createWorld(random) {
  const paddle = { x: 0, y: PADDLE.y, width: PADDLE.width, height: PADDLE.height, wideTimer: 0 };
  const balls = [];
  for (let index = 0; index < BALL_POOL; index += 1) {
    balls.push({ active: false, resting: false, x: 0, y: 0, vx: 0, vy: 0, trail: [] });
  }
  const bricks = [];
  for (let index = 0; index < BRICK.cols * LEVELS[LEVELS.length - 1].length; index += 1) {
    bricks.push({ active: false, kind: 1, hits: 1, x: 0, y: 0, width: 0, height: 0, color: '', row: 0 });
  }
  const powerups = [];
  for (let index = 0; index < POWERUP_POOL; index += 1) {
    powerups.push({ active: false, kind: POWER_WIDE, x: 0, y: 0 });
  }
  const particles = [];
  for (let index = 0; index < PARTICLES; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '', size: 4 });
  }
  const state = {
    paddle,
    balls,
    bricks,
    powerups,
    particles,
    score: 0,
    lives: LIVES,
    level: 1,
    chain: 0,
    slowTimer: 0,
    breakableLeft: 0,
    breakableTotal: 0,
    elapsed: 0,
  };

  function ballSpeed() {
    const base = BALL.baseSpeed + BALL.speedPerLevel * (state.level - 1);
    // The ball quickens as the wall thins: up to 40% faster by the last brick.
    const progress = state.breakableTotal > 0 ? 1 - state.breakableLeft / state.breakableTotal : 0;
    const quickened = base * (1 + 0.4 * progress);
    const slowed = state.slowTimer > 0 ? quickened * BALL.slowScale : quickened;
    return Math.min(slowed, BALL.maxSpeed);
  }

  function buildLevel(level) {
    const rows = LEVELS[level - 1];
    const gridWidth = BRICK.cols * BRICK.width + (BRICK.cols - 1) * BRICK.gap;
    const offsetX = (FIELD.width - gridWidth) / 2;
    let index = 0;
    let left = 0;
    for (const brick of bricks) brick.active = false;
    for (let row = 0; row < rows.length; row += 1) {
      for (let col = 0; col < BRICK.cols; col += 1) {
        const cell = rows[row][col];
        if (cell === '.' || cell === undefined) continue;
        const brick = bricks[index];
        index += 1;
        brick.active = true;
        brick.kind = cell === '2' ? 2 : 1;
        brick.hits = brick.kind;
        brick.x = offsetX + col * (BRICK.width + BRICK.gap);
        brick.y = BRICK.top + row * (BRICK.height + BRICK.gap);
        brick.width = BRICK.width;
        brick.height = BRICK.height;
        brick.row = row;
        brick.color = PALETTE.brickRows[row % PALETTE.brickRows.length];
        left += 1;
      }
    }
    state.breakableLeft = left;
    state.breakableTotal = left;
  }

  function placeBallOnPaddle(ball) {
    ball.active = true;
    ball.resting = true;
    ball.vx = 0;
    ball.vy = 0;
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - BALL.radius - 1;
    ball.trail.length = 0;
  }

  function resetServe() {
    for (const ball of balls) ball.active = false;
    paddle.width = PADDLE.width;
    paddle.wideTimer = 0;
    state.slowTimer = 0;
    state.chain = 0;
    for (const item of powerups) item.active = false;
    placeBallOnPaddle(balls[0]);
  }

  function reset() {
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.chain = 0;
    paddle.x = (FIELD.width - PADDLE.width) / 2;
    paddle.width = PADDLE.width;
    paddle.wideTimer = 0;
    for (const item of particles) item.active = false;
    buildLevel(1);
    resetServe();
  }

  function nextLevel() {
    state.level += 1;
    state.elapsed = 0;
    paddle.x = (FIELD.width - paddle.width) / 2;
    buildLevel(state.level);
    resetServe();
  }

  function launch() {
    let launched = false;
    for (const ball of balls) {
      if (!ball.active || !ball.resting) continue;
      const angle = (random() * 1.2 - 0.6) * (Math.PI / 3);
      const speed = ballSpeed();
      ball.vx = speed * Math.sin(angle);
      ball.vy = -speed * Math.cos(angle);
      ball.resting = false;
      launched = true;
    }
    return launched;
  }

  function burst(x, y, color, count) {
    let made = 0;
    for (const particle of particles) {
      if (made >= count) break;
      if (particle.active) continue;
      particle.active = true;
      particle.x = x;
      particle.y = y;
      const angle = random() * TWO_PI;
      const speed = 120 + random() * 260;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 60;
      particle.maxLife = 0.4 + random() * 0.3;
      particle.life = particle.maxLife;
      particle.color = color;
      particle.size = 3 + random() * 4;
      made += 1;
    }
  }

  function dropPowerup(x, y) {
    if (random() > POWERUP.dropChance) return;
    for (const item of powerups) {
      if (item.active) continue;
      item.active = true;
      const roll = random();
      item.kind = roll < POWERUP.lifeShare ? POWER_LIFE : roll < 0.42 ? POWER_WIDE : roll < 0.71 ? POWER_MULTI : POWER_SLOW;
      item.x = x;
      item.y = y;
      return;
    }
  }

  function applyPowerup(kind) {
    if (kind === POWER_WIDE) {
      paddle.width = PADDLE.width * PADDLE.wideScale;
      paddle.wideTimer = PADDLE.wideSeconds;
    } else if (kind === POWER_MULTI) {
      const flying = balls.filter((ball) => ball.active && !ball.resting);
      let clones = 0;
      for (const ball of flying) {
        if (clones >= 2) break;
        for (const free of balls) {
          if (free.active) continue;
          free.active = true;
          free.resting = false;
          free.x = ball.x;
          free.y = ball.y;
          const speed = Math.hypot(ball.vx, ball.vy) || ballSpeed();
          const baseAngle = Math.atan2(ball.vy, ball.vx);
          const angle = baseAngle + (clones === 0 ? 0.55 : -0.55);
          free.vx = Math.cos(angle) * speed;
          free.vy = Math.sin(angle) * speed;
          free.trail.length = 0;
          clones += 1;
          break;
        }
      }
    } else if (kind === POWER_SLOW) {
      state.slowTimer = BALL.slowSeconds;
    } else if (kind === POWER_LIFE) {
      state.lives = Math.min(MAX_LIVES, state.lives + 1);
    }
  }

  function damageBrick(brick) {
    brick.hits -= 1;
    if (brick.hits > 0) {
      state.score += BRICK.toughFirstHitPoints;
      return EVENT_TOUGH;
    }
    brick.active = false;
    state.breakableLeft -= 1;
    const comboBonus = Math.min(state.chain * COMBO.perChain, COMBO.cap);
    state.score += (brick.kind === 2 ? BRICK.toughPoints : BRICK.normalPoints) + comboBonus;
    state.chain += 1;
    burst(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 12);
    dropPowerup(brick.x + brick.width / 2, brick.y + brick.height / 2);
    return EVENT_BRICK;
  }

  function stepBall(ball, dt) {
    let events = 0;
    if (!ball.active) return 0;
    if (ball.resting) {
      ball.x = paddle.x + paddle.width / 2;
      ball.y = paddle.y - BALL.radius - 1;
      return 0;
    }
    const prevX = ball.x;
    const prevY = ball.y;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Walls: left, right, top. The bottom is a lost ball, handled below.
    if (ball.x - BALL.radius < 0) {
      ball.x = BALL.radius;
      ball.vx = Math.abs(ball.vx);
    } else if (ball.x + BALL.radius > FIELD.width) {
      ball.x = FIELD.width - BALL.radius;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - BALL.radius < 0) {
      ball.y = BALL.radius;
      ball.vy = Math.abs(ball.vy);
    }

    // Paddle: bounce off its top, angled by where the ball lands on it.
    if (ball.vy > 0 && ball.y + BALL.radius >= paddle.y && ball.y - BALL.radius <= paddle.y + paddle.height
      && ball.x >= paddle.x - BALL.radius && ball.x <= paddle.x + paddle.width + BALL.radius) {
      const offset = clamp((ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2), -1, 1);
      let angle = offset * ((BALL.maxBounceDegrees * Math.PI) / 180);
      if (Math.abs(angle) < (BALL.minBounceDegrees * Math.PI) / 180) {
        angle = (random() < 0.5 ? -1 : 1) * ((BALL.minBounceDegrees * Math.PI) / 180);
      }
      const speed = ballSpeed();
      ball.vx = speed * Math.sin(angle);
      ball.vy = -speed * Math.cos(angle);
      ball.y = paddle.y - BALL.radius - 0.5;
      state.chain = 0;
      events |= EVENT_PADDLE;
    }

    // Bricks: one hit per ball per step, resolved by where the ball came from.
    for (const brick of bricks) {
      if (!brick.active) continue;
      const closestX = clamp(ball.x, brick.x, brick.x + brick.width);
      const closestY = clamp(ball.y, brick.y, brick.y + brick.height);
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;
      if (dx * dx + dy * dy > BALL.radius * BALL.radius) continue;
      if (prevY + BALL.radius <= brick.y) {
        ball.vy = -Math.abs(ball.vy);
        ball.y = brick.y - BALL.radius - 0.5;
      } else if (prevY - BALL.radius >= brick.y + brick.height) {
        ball.vy = Math.abs(ball.vy);
        ball.y = brick.y + brick.height + BALL.radius + 0.5;
      } else if (prevX + BALL.radius <= brick.x) {
        ball.vx = -Math.abs(ball.vx);
        ball.x = brick.x - BALL.radius - 0.5;
      } else if (prevX - BALL.radius >= brick.x + brick.width) {
        ball.vx = Math.abs(ball.vx);
        ball.x = brick.x + brick.width + BALL.radius + 0.5;
      } else {
        ball.vy = -ball.vy;
      }
      events |= damageBrick(brick);
      break;
    }

    // Keep the ball at the level's speed (slow power-up wears off and on cleanly).
    if (!ball.resting) {
      const speed = Math.hypot(ball.vx, ball.vy);
      const target = ballSpeed();
      if (speed > 0.01 && Math.abs(speed - target) > 0.5) {
        ball.vx = (ball.vx / speed) * target;
        ball.vy = (ball.vy / speed) * target;
      }
    }

    // Trail for the renderer: the last few positions, newest first.
    ball.trail.unshift(ball.x, ball.y);
    if (ball.trail.length > 14) ball.trail.length = 14;

    // Lost below the field.
    if (ball.y - BALL.radius > FIELD.height) {
      ball.active = false;
      ball.trail.length = 0;
      events |= EVENT_LOST;
    }
    return events;
  }

  /**
   * One fixed step. `direction` is -1, 0 or 1 (keyboard); `mouseX` is the paddle's target
   * centre in field coordinates, or null when the mouse is not steering.
   */
  function step(dt, direction, mouseX) {
    let events = 0;
    state.elapsed += dt;
    if (paddle.wideTimer > 0) {
      paddle.wideTimer = Math.max(0, paddle.wideTimer - dt);
      if (paddle.wideTimer === 0) paddle.width = PADDLE.width;
    }
    if (state.slowTimer > 0) state.slowTimer = Math.max(0, state.slowTimer - dt);

    // Paddle: the mouse steers fast, the keys steer at paddle speed.
    if (mouseX !== null && mouseX !== undefined) {
      const centre = paddle.x + paddle.width / 2;
      const move = clamp(mouseX - centre, -PADDLE.speed * 2.4 * dt, PADDLE.speed * 2.4 * dt);
      paddle.x += move;
    } else if (direction !== 0) {
      paddle.x += direction * PADDLE.speed * dt;
    }
    paddle.x = clamp(paddle.x, 0, FIELD.width - paddle.width);

    let anyBall = false;
    for (const ball of balls) {
      events |= stepBall(ball, dt);
      if (ball.active) anyBall = true;
    }

    // All balls lost: a life goes, or the game is over.
    if (!anyBall) {
      state.lives -= 1;
      state.chain = 0;
      if (state.lives <= 0) {
        events |= EVENT_OVER;
      } else {
        resetServe();
      }
    }

    // Power-ups fall and are caught by the paddle.
    for (const item of powerups) {
      if (!item.active) continue;
      item.y += POWERUP.fallSpeed * dt;
      if (item.y > FIELD.height + POWERUP.size) {
        item.active = false;
        continue;
      }
      if (item.y + POWERUP.size / 2 >= paddle.y && item.y - POWERUP.size / 2 <= paddle.y + paddle.height
        && item.x >= paddle.x - POWERUP.size / 2 && item.x <= paddle.x + paddle.width + POWERUP.size / 2) {
        item.active = false;
        applyPowerup(item.kind);
        events |= EVENT_POWERUP;
      }
    }

    // Particles drift down and fade.
    for (const particle of particles) {
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 520 * dt;
    }

    // Level cleared: every breakable brick is gone.
    if (state.breakableLeft === 0 && state.lives > 0) {
      if (state.level >= LEVELS.length) events |= EVENT_WIN;
      else events |= EVENT_LEVEL;
    }
    return events;
  }

  reset();
  return { state, reset, nextLevel, launch, step };
}
