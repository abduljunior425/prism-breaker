// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. Flat
// shapes with a bright neon palette, canvas text for the HUD and the panels. Text that holds a
// number is rebuilt only when the number changes, so a frame allocates nothing.

import { BALL, BRICK, FIELD, FONT, LIVES, MAX_LIVES, PALETTE, POWERUP } from './config.js';
import { POWER_LIFE, POWER_MULTI, POWER_SLOW, POWER_WIDE } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 150, line: 34, bottom: 76 };
const LIFE_W = 34;
const LIFE_H = 12;
const LIFE_GAP = 8;
const POWER_LETTER = { wide: 'W', multi: 'M', slow: 'S', life: 'L' };
const POWER_COLOR = { wide: PALETTE.powerWide, multi: PALETTE.powerMulti, slow: PALETTE.powerSlow, life: PALETTE.powerLife };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const levelLabel = cachedLabel('Level ');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  const comboLabel = cachedLabel('Combo x');

  // A fixed starfield for the field's backdrop: seeded once, the same every frame.
  const stars = [];
  {
    let a = 123456789;
    const next = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let index = 0; index < 90; index += 1) {
      stars.push({ x: next() * FIELD.width, y: next() * FIELD.height, r: 0.8 + next() * 1.6, a: 0.12 + next() * 0.25 });
    }
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + w, y, x + w, y + h, radius);
    context.arcTo(x + w, y + h, x, y + h, radius);
    context.arcTo(x, y + h, x, y, radius);
    context.arcTo(x, y, x + w, y, radius);
    context.closePath();
  }

  function drawField(state) {
    context.fillStyle = PALETTE.field;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of stars) {
      context.globalAlpha = star.a;
      context.fillStyle = '#ffffff';
      context.fillRect(star.x, star.y, star.r, star.r);
    }
    context.globalAlpha = 1;

    // The brick wall: a coloured block with a lighter top edge; a tough brick shows a crack
    // once it has taken its first hit.
    for (const brick of state.bricks) {
      if (!brick.active) continue;
      const color = brick.kind === 2 ? PALETTE.tough : brick.color;
      roundRect(brick.x, brick.y, brick.width, brick.height, 6);
      context.fillStyle = color;
      context.fill();
      context.fillStyle = 'rgba(255, 255, 255, 0.28)';
      context.fillRect(brick.x + 4, brick.y + 3, brick.width - 8, 5);
      if (brick.kind === 2) {
        context.strokeStyle = PALETTE.toughCrack;
        context.lineWidth = 2;
        context.beginPath();
        if (brick.hits === 1) {
          context.moveTo(brick.x + 14, brick.y + 4);
          context.lineTo(brick.x + brick.width / 2, brick.y + brick.height / 2);
          context.lineTo(brick.x + brick.width - 18, brick.y + brick.height - 5);
        } else {
          context.moveTo(brick.x + 10, brick.y + 6);
          context.lineTo(brick.x + brick.width - 12, brick.y + brick.height - 6);
        }
        context.stroke();
      }
    }

    // Falling power-up capsules: a coloured chip with its letter.
    for (const item of state.powerups) {
      if (!item.active) continue;
      const color = POWER_COLOR[item.kind];
      roundRect(item.x - POWERUP.size / 2, item.y - POWERUP.size / 2, POWERUP.size, POWERUP.size, 8);
      context.fillStyle = color;
      context.fill();
      context.fillStyle = PALETTE.powerText;
      context.font = `bold 20px ${FONT}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(POWER_LETTER[item.kind], item.x, item.y + 1);
    }

    // Particles: fading squares from broken bricks.
    for (const particle of state.particles) {
      if (!particle.active) continue;
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    }
    context.globalAlpha = 1;

    // The paddle: a bright bar with a white core.
    const paddle = state.paddle;
    roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 9);
    context.fillStyle = PALETTE.paddle;
    context.fill();
    context.fillStyle = PALETTE.paddleCore;
    context.fillRect(paddle.x + 8, paddle.y + 5, paddle.width - 16, 4);

    // The balls: a glowing white disc over a short fading trail.
    for (const ball of state.balls) {
      if (!ball.active) continue;
      for (let index = ball.trail.length - 2; index >= 0; index -= 2) {
        const age = index / ball.trail.length;
        context.globalAlpha = 0.28 * (1 - age);
        context.fillStyle = PALETTE.ballTrail;
        context.beginPath();
        context.arc(ball.trail[index], ball.trail[index + 1], BALL.radius * (1 - age * 0.5), 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      context.shadowColor = '#9be7ff';
      context.shadowBlur = 14;
      context.fillStyle = PALETTE.ball;
      context.beginPath();
      context.arc(ball.x, ball.y, BALL.radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    }
  }

  function drawHud(state, muted) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 28, PALETTE.text, 'left');
    text(levelLabel(state.level), FIELD.width / 2, 18, 28, PALETTE.text, 'center');
    const slots = Math.max(LIVES, Math.min(state.lives, MAX_LIVES));
    const firstLife = FIELD.width - 24 - slots * (LIFE_W + LIFE_GAP) + LIFE_GAP;
    text('Lives', firstLife - 12, 18, 28, PALETTE.text, 'right');
    for (let life = 0; life < slots; life += 1) {
      roundRect(firstLife + life * (LIFE_W + LIFE_GAP), 24, LIFE_W, LIFE_H, 6);
      context.fillStyle = life < state.lives ? PALETTE.paddle : '#2a3040';
      context.fill();
    }
    // The chain bonus, once it is worth showing, and the active power-ups with their timers.
    let chipY = 56;
    if (state.chain >= 3) {
      text(comboLabel(state.chain), 24, chipY, 22, PALETTE.powerLife, 'left');
      chipY += 30;
    }
    if (state.paddle.wideTimer > 0) {
      text(`WIDE ${Math.ceil(state.paddle.wideTimer)}s`, 24, chipY, 22, PALETTE.powerWide, 'left');
      chipY += 30;
    }
    if (state.slowTimer > 0) {
      text(`SLOW ${Math.ceil(state.slowTimer)}s`, 24, chipY, 22, PALETTE.powerSlow, 'left');
      chipY += 30;
    }
    if (muted) text('Muted (M)', FIELD.width - 24, 56, 20, PALETTE.muted, 'right');
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.dim;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    roundRect(x, y, PANEL.width, height, 16);
    context.fillStyle = PALETTE.panel;
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 52, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 24, PALETTE.accent, 'center');
  }

  const TITLE_LINES = [
    'Break every brick. Catch the falling power-ups.',
    'Move with ← → or A D, or with the mouse.',
    'Launch with Space.',
    'W widens the paddle · M splits the ball · S slows it · L is a life.',
    '',
  ];
  const PAUSED_LINES = ['The bricks will wait for you.', 'M toggles sound · R restarts the level.'];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, info) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('PRISM BREAKER', TITLE_LINES, 'Press Space or click to start');
      return;
    }
    drawHud(state, info && info.muted);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    } else if (screen === SCREEN_CLEAR) {
      const lines = [`Level ${state.level} cleared!`, `Bonus +${info ? info.bonus : 0}`, finalLabel(state.score), bestLabel(best)];
      drawPanel('Level Clear!', lines, 'Press Space for the next level');
    } else if (screen === SCREEN_OVER) {
      const lines = [finalLabel(state.score), bestLabel(best), ''];
      drawPanel('Game Over', lines, 'Press Space or click to play again');
    } else if (screen === SCREEN_WIN) {
      const lines = [`You broke every prism!`, finalLabel(state.score), bestLabel(best)];
      drawPanel('You Win!', lines, 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    /** The field x for a client (window) x: the input needs it to steer by mouse. */
    fieldX(clientX) {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      return ((clientX - rect.left) * ratio - view.x) / view.scale;
    },
  };
}
