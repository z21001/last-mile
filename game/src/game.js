// The game around the rules: which screen is up (title, run, pause, safe house, caught), how the
// player's keys and mouse become controls for the world, the best score, and sound.
import { PACE, STEP } from './config.js';
import { autopilot } from './autopilot.js';
import { SCREEN_CAUGHT, SCREEN_EVACUATED, SCREEN_PAUSE, SCREEN_RUN, SCREEN_SAFEHOUSE, SCREEN_TITLE, drawFrame } from './render/renderer.js';
import { perkCardRects } from './render/screens.js';
import { loadBest, saveBest } from './storage.js';
import { EVENT_CAUGHT, EVENT_EVAC, EVENT_SAFEHOUSE, createWorld } from './world.js';

const JUMP_KEYS = ['Space', 'KeyW', 'ArrowUp'];
const SLIDE_KEYS = ['KeyS', 'ArrowDown'];
const MOLOTOV_KEYS = ['KeyE', 'ShiftLeft', 'ShiftRight', 'MouseRight'];
const START_KEYS = ['Enter', 'Space'];

/** Which perk card, if any, is under (x, y). */
function cardAt(x, y) {
  return perkCardRects().findIndex((rect) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h);
}

/** Make the game: `ctx` to draw on, `input` to read, `audio` to play, `status` to announce screen changes. */
export function createGame(ctx, input, audio, status) {
  const game = {
    world: createWorld(Date.now() >>> 0),
    screen: SCREEN_TITLE,
    best: loadBest(),
    newBest: false,
    clock: 0,
    hovered: -1,
  };

  const announce = (text) => {
    if (status) status.textContent = text;
  };

  const startRun = () => {
    game.world.reset((Date.now() ^ Math.floor(game.clock * 1000)) >>> 0);
    game.screen = SCREEN_RUN;
    game.newBest = false;
    announce('Run! The horde is behind you.');
  };

  /** The player's controls for this step. */
  const playerControls = () => ({
    jump: input.wasPressed(...JUMP_KEYS),
    slide: input.wasPressed(...SLIDE_KEYS) || input.isHeld(...SLIDE_KEYS),
    shoot: input.mouse.left,
    molotov: input.wasPressed(...MOLOTOV_KEYS),
    aim: input.mouse.moved ? { x: input.mouse.x, y: input.mouse.y } : null,
  });

  /** Handle the keys and clicks that move between screens. */
  const handleScreens = () => {
    if (input.wasPressed('KeyM')) audio.toggleMute();
    const clicked = input.clicks.length > 0 ? input.clicks[input.clicks.length - 1] : null;
    if (game.screen === SCREEN_TITLE) {
      if (input.wasPressed(...START_KEYS) || clicked) startRun();
      return;
    }
    if (game.screen === SCREEN_RUN) {
      if (input.wasPressed('KeyP', 'Escape', 'Blur')) {
        game.screen = SCREEN_PAUSE;
        announce('Paused.');
      } else if (input.wasPressed('KeyR')) startRun();
      return;
    }
    if (game.screen === SCREEN_PAUSE) {
      if (input.wasPressed('KeyP', 'Escape') || clicked) game.screen = SCREEN_RUN;
      else if (input.wasPressed('KeyR')) startRun();
      return;
    }
    if (game.screen === SCREEN_SAFEHOUSE) {
      game.hovered = cardAt(input.mouse.x, input.mouse.y);
      let choice = ['Digit1', 'Digit2', 'Digit3'].findIndex((code) => input.wasPressed(code, code.replace('Digit', 'Numpad')));
      if (choice < 0 && clicked) choice = cardAt(clicked.x, clicked.y);
      const id = game.world.state.offer[choice];
      if (id && game.world.choosePerk(id)) {
        game.screen = SCREEN_RUN;
        announce('Perk taken. Keep running.');
      }
      return;
    }
    if (game.screen === SCREEN_CAUGHT && game.world.state.caughtTime > 0.8) {
      if (input.wasPressed('KeyR', 'Enter') || clicked) startRun();
    }
    if (game.screen === SCREEN_EVACUATED && game.world.state.evacTime > 0.8) {
      if (input.wasPressed('KeyR')) startRun();
      else if ((input.wasPressed('Enter') || clicked) && game.world.continueEndless()) {
        game.screen = SCREEN_RUN;
        announce('Endless mode: run as far as you can.');
      }
    }
  };

  /** Keep the best score when a run ends, by capture or by evacuation. */
  const recordScore = () => {
    const score = Math.floor(game.world.state.score);
    if (score > game.best) {
      game.best = score;
      game.newBest = true;
      saveBest(score);
    }
    return score;
  };

  /** One fixed step of the simulation for the current screen. */
  game.step = () => {
    game.clock += STEP;
    handleScreens();
    const state = game.world.state;
    if (game.screen === SCREEN_TITLE) {
      game.world.step(STEP, autopilot(state, 1));
      if (state.phase !== 'run') game.world.reset((state.seed + 1) >>> 0);
    } else if (game.screen !== SCREEN_PAUSE) {
      const events = game.world.step(STEP, game.screen === SCREEN_RUN ? playerControls() : {});
      audio.play(events);
      if (events & EVENT_SAFEHOUSE) {
        game.screen = SCREEN_SAFEHOUSE;
        announce('Safe house reached. Choose a perk: 1, 2 or 3.');
      }
      if (events & EVENT_CAUGHT) {
        game.screen = SCREEN_CAUGHT;
        announce(`The horde caught you. Score ${recordScore()}. Press R to run again.`);
      }
      if (events & EVENT_EVAC) {
        game.screen = SCREEN_EVACUATED;
        announce(`Evacuated! Score ${recordScore()}. Enter for endless mode, R for a new run.`);
      }
    }
    audio.music(game.screen === SCREEN_RUN, (game.world.state.speed - PACE.start) / (PACE.max - PACE.start));
    input.endFrame();
  };

  /** Draw the current frame. */
  game.draw = () => {
    drawFrame(ctx, game.world.state, game.screen, { best: game.best, newBest: game.newBest, clock: game.clock, hovered: game.hovered });
  };

  return game;
}
