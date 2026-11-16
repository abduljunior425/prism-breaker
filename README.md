[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/abduljunior425/prism-breaker/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/abduljunior425/prism-breaker/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Built for the [Make the best game bounty](https://make.fun/bounty/best-game-01) on make.fun.

# Prism Breaker

A complete arcade game for make.fun's **best-game-01** bounty: break every brick, catch the falling power-ups, and clear all three levels. It runs offline in a desktop browser from its own static files — no build step, no network request, no library.

## How to play

- **Move the paddle** with ← → or A D, or with the mouse.
- **Launch the ball** with Space or a click. The ball bounces off the paddle: where it lands on the paddle steers its angle.
- **Break bricks** for points. A chain of bricks without touching the paddle adds a combo bonus. Silver bricks take two hits.
- **Catch falling capsules**: **W** widens the paddle, **M** splits the ball in three, **S** slows the ball, **L** is an extra life.
- Lose the ball and you lose a life — three lives, then game over. Clear all three levels to win.
- **P** pauses, **M** mutes the sound, **R** restarts.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Or open `game/index.html` directly from disk.

## Layout

- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library.
- `game/index.html` — the page: one canvas and the status line screen readers announce.
- `game/src/config.js` — every tuning number and colour in one place.
- `game/src/world.js` — the rules: paddle, balls, bricks, power-ups, particles, levels, score, lives, win and lose. No drawing, no browser.
- `game/src/render.js` — drawing only: the field, the HUD and the panels.
- `game/src/input.js` — keyboard and pointer input.
- `game/src/audio.js` — synthesized sound effects (Web Audio, no files).
- `game/src/shots.js` — the screenshot scenes: an autopilot plays the real rules so each shot is a frame a real game produces (`?shot=start|play|clear|end&seed=N`).
- `game/src/main.js` — boot and the fixed-step loop, the six screens.
- `vendor/makefun-game.ts` — the kit's dossier library, copied unchanged.
- `shots.json` — the four screenshots and the scene each one shows.
