// The screenshot scenes behind ?shot=start|play|clear|end. Each one plays the real rules
// forward from a fresh world for a fixed time, steered by an autopilot that predicts where the
// ball will land at the paddle line (wall bounces included) and moves the paddle there, so the
// frame is what a short game really looks like and the same seed always gives the same frame.

import { BALL, FIELD, PADDLE, STEP } from './config.js';
import { EVENT_LEVEL, EVENT_OVER, EVENT_WIN, levelBonus } from './world.js';
import { SCREEN_CLEAR, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const PLAY_SECONDS = 16;
const CLEAR_LIMIT_SECONDS = 300;
const END_LIMIT_SECONDS = 120;

/** Where the ball will cross the paddle line, wall bounces included; null when it never does. */
function predictLandingX(ball) {
  let x = ball.x;
  let y = ball.y;
  let vx = ball.vx;
  let vy = ball.vy;
  const dt = 1 / 120;
  for (let t = 0; t < 4; t += dt) {
    x += vx * dt;
    y += vy * dt;
    if (x - BALL.radius < 0) {
      x = BALL.radius;
      vx = Math.abs(vx);
    } else if (x + BALL.radius > FIELD.width) {
      x = FIELD.width - BALL.radius;
      vx = -Math.abs(vx);
    }
    if (y - BALL.radius < 0) {
      y = BALL.radius;
      vy = Math.abs(vy);
    }
    if (vy > 0 && y >= PADDLE.y) return x;
  }
  return null;
}

/** Steer toward the landing spot of the ball nearest the paddle; 0 when no ball is flying. */
function autopilot(state) {
  let target = null;
  for (const ball of state.balls) {
    if (!ball.active || ball.resting) continue;
    if (target === null || ball.y > target.y) target = ball;
  }
  if (target === null) return 0;
  const landing = predictLandingX(target);
  if (landing === null) return 0;
  const centre = state.paddle.x + state.paddle.width / 2;
  if (landing > centre + 6) return 1;
  if (landing < centre - 6) return -1;
  return 0;
}

/** The opposite: steer away from the landing spot, so the ball is lost for sure. */
function antiAutopilot(state) {
  return -autopilot(state);
}

/** Keep only a few bricks (the middle of the lowest row) so the level clears quickly. */
function stageNearClear(world) {
  const state = world.state;
  let kept = 0;
  let lowestRow = -1;
  for (const brick of state.bricks) {
    if (brick.active && brick.row > lowestRow) lowestRow = brick.row;
  }
  for (const brick of state.bricks) {
    if (!brick.active) continue;
    const middle = Math.abs(brick.x + brick.width / 2 - FIELD.width / 2) < brick.width * 1.6;
    if (brick.row === lowestRow && middle && kept < 3) {
      kept += 1;
      continue;
    }
    brick.active = false;
  }
  state.breakableLeft = kept;
}

/**
 * Set `world` to the named scene (start, play, clear or end; any other name is start) and
 * return the screen to draw over it, the best score to show and the level bonus, if any.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'clear' && name !== 'end') {
    return { screen: SCREEN_TITLE, best: 0, bonus: 0 };
  }
  world.launch();
  if (name === 'play') {
    for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, autopilot(world.state), null);
      if (events & (EVENT_OVER | EVENT_WIN | EVENT_LEVEL)) break;
      if (world.state.balls.some((ball) => ball.active && ball.resting)) world.launch();
    }
    const over = world.state.lives === 0;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score, bonus: 0 };
  }
  if (name === 'clear') {
    stageNearClear(world);
    for (let index = 0; index < CLEAR_LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, autopilot(world.state), null);
      if (events & EVENT_WIN) {
        const bonus = levelBonus(world.state);
        world.state.score += bonus;
        return { screen: SCREEN_WIN, best: world.state.score, bonus };
      }
      if (events & EVENT_LEVEL) {
        const bonus = levelBonus(world.state);
        world.state.score += bonus;
        return { screen: SCREEN_CLEAR, best: world.state.score, bonus };
      }
      if (events & EVENT_OVER) break;
      if (world.state.balls.some((ball) => ball.active && ball.resting)) world.launch();
    }
    return { screen: SCREEN_PLAY, best: world.state.score, bonus: 0 };
  }
  // end: the paddle steers away from the ball, so it is lost and the game ends on one life.
  world.state.lives = 1;
  for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
    const events = world.step(STEP, antiAutopilot(world.state), null);
    if (events & EVENT_OVER) break;
    if (world.state.balls.some((ball) => ball.active && ball.resting)) world.launch();
  }
  return { screen: SCREEN_OVER, best: world.state.score, bonus: 0 };
}
