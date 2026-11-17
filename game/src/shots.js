// The screenshot scenes behind ?shot=boss|title|safehouse|evac|caught. Each plays the real rules
// forward from a fresh run for a fixed seed, steered by the autopilot, so the frame is what a run
// really looks like and the same seed always gives the same picture.
import { STEP } from './config.js';
import { autopilot } from './autopilot.js';
import { SCREEN_CAUGHT, SCREEN_EVACUATED, SCREEN_RUN, SCREEN_SAFEHOUSE, SCREEN_TITLE } from './render/renderer.js';
import { EVENT_CAUGHT, EVENT_EVAC, EVENT_SAFEHOUSE, PHASE_SAFEHOUSE } from './world.js';

const LIMIT_SECONDS = 900;
/** The perks the scenes' runner prefers, so the frames show the convoy, the dog and the shotgun at work. */
const FAVOURITES = ['dog', 'shotgun', 'fire', 'aim', 'mag', 'parkour'];

/** Take the favourite perk on offer. */
function pickPerk(world) {
  world.choosePerk(FAVOURITES.find((id) => world.state.offer.includes(id)) ?? world.state.offer[0]);
}

/** Run the world under the autopilot until `stop(events, state)` says so or the time limit passes. */
function playUntil(world, skill, stop, seconds = LIMIT_SECONDS) {
  for (let index = 0; index < seconds / STEP; index += 1) {
    const events = world.step(STEP, autopilot(world.state, skill));
    if (stop(events, world.state)) return true;
    if (world.state.phase === PHASE_SAFEHOUSE) pickPerk(world);
  }
  return false;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * - boss: a boss fight in the third zone, convoy firing, wreckage in the air;
 * - title: the run idling behind the menu;
 * - safehouse: the perk choice at the second safe house;
 * - evac: the win, the convoy reaching the chopper;
 * - caught: a run whose runner tires and is caught.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'safehouse') {
    let houses = 0;
    playUntil(world, 1, (events) => {
      if (events & EVENT_SAFEHOUSE) houses += 1;
      return houses >= 2;
    });
    return SCREEN_SAFEHOUSE;
  }
  if (name === 'boss') {
    // Best: the boss fight with fire on the road; failing that, any busy moment of it.
    const moment = (needFire) => (events, state) => {
      const boss = state.boss;
      if (!boss || boss.zone < 2 || boss.dying > 0) return false;
      const calm = state.hurtFlash === 0 && state.shake < 0.5 && state.runner.invulnerable === 0;
      const busy = state.thrown.some((piece) => piece.x > 420 && piece.x < 820) && state.bullets.length >= 2;
      const fire = !needFire || state.fires.some((strip) => strip.life > 0.8);
      return calm && busy && fire && state.ammo >= 4 && boss.hurt === 0 && boss.hp < boss.maxHp * 0.85 && state.convoy.length >= 1;
    };
    if (!playUntil(world, 1, moment(true))) {
      world.reset();
      playUntil(world, 1, moment(false));
    }
    return SCREEN_RUN;
  }
  if (name === 'evac') {
    playUntil(world, 1, (events) => Boolean(events & (EVENT_EVAC | EVENT_CAUGHT)));
    for (let index = 0; index < 90; index += 1) world.step(STEP, autopilot(world.state, 1));
    return world.state.phase === 'evacuated' ? SCREEN_EVACUATED : SCREEN_CAUGHT;
  }
  if (name === 'caught') {
    playUntil(world, 1, (events, state) => state.scrolled > 1500 * 40 || Boolean(events & EVENT_CAUGHT));
    if (world.state.phase !== 'caught') playUntil(world, 0.15, (events) => Boolean(events & EVENT_CAUGHT));
    for (let index = 0; index < 90; index += 1) world.step(STEP, autopilot(world.state, 0));
    return SCREEN_CAUGHT;
  }
  for (let index = 0; index < 4 / STEP; index += 1) world.step(STEP, autopilot(world.state, 1));
  return SCREEN_TITLE;
}
