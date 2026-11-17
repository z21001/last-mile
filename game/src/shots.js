// The screenshot scenes behind ?shot=title|run|safehouse|caught. Each plays the real rules forward
// from a fresh run for a fixed seed, steered by the autopilot, so the frame is what a run really
// looks like and the same seed always gives the same picture.
import { STEP } from './config.js';
import { autopilot } from './autopilot.js';
import { SCREEN_CAUGHT, SCREEN_RUN, SCREEN_SAFEHOUSE, SCREEN_TITLE } from './render/renderer.js';
import { EVENT_CAUGHT, EVENT_SAFEHOUSE, PHASE_SAFEHOUSE } from './world.js';

const LIMIT_SECONDS = 400;

/** Run the world under the autopilot until `stop(events)` says so or the time limit passes. */
function playUntil(world, skill, stop, seconds = LIMIT_SECONDS, onSafehouse = null) {
  for (let index = 0; index < seconds / STEP; index += 1) {
    const events = world.step(STEP, autopilot(world.state, skill));
    if (stop(events, world.state)) return true;
    if (world.state.phase === PHASE_SAFEHOUSE) {
      if (onSafehouse) onSafehouse(world);
      else world.choosePerk(world.state.offer[0]);
    }
  }
  return false;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * - title: the run idling behind the menu;
 * - run: deep into the second zone with a perk or two, the HUD busy;
 * - safehouse: the perk choice at the first safe house;
 * - caught: a late run whose runner tires and is caught.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'safehouse') {
    playUntil(world, 1, (events) => Boolean(events & EVENT_SAFEHOUSE));
    return SCREEN_SAFEHOUSE;
  }
  if (name === 'run') {
    // Through the first safe house (taking the dog if offered), then a busy moment in the Downtown
    // Ruins: the dead on screen, a wreck ahead, the gun firing and the horde gaining.
    const favourite = ['dog', 'shotgun', 'fire'];
    playUntil(world, 1, (events, state) => {
      if (state.phase === PHASE_SAFEHOUSE || state.scrolled < 1150 * 40) return false;
      const dead = state.zombies.filter((zombie) => zombie.alive && zombie.x < 1150).length;
      const wreck = state.wrecks.some((item) => item.x > 380 && item.x < 1100);
      const relaxed = state.scrolled > 1700 * 40;
      const calm = state.hurtFlash === 0 && state.shake < 0.5 && state.runner.invulnerable === 0;
      return calm && dead >= (relaxed ? 2 : 3) && (wreck || relaxed) && state.bullets.length > 0 && state.horde < 92;
    }, LIMIT_SECONDS, (w) => w.choosePerk(favourite.find((id) => w.state.offer.includes(id)) ?? w.state.offer[0]));
    return SCREEN_RUN;
  }
  if (name === 'caught') {
    playUntil(world, 1, (events, state) => state.scrolled > 1500 * 40 || Boolean(events & EVENT_CAUGHT));
    playUntil(world, 0.15, (events) => Boolean(events & EVENT_CAUGHT));
    for (let index = 0; index < 90; index += 1) world.step(STEP, autopilot(world.state, 0));
    return SCREEN_CAUGHT;
  }
  for (let index = 0; index < 4 / STEP; index += 1) world.step(STEP, autopilot(world.state, 1));
  return SCREEN_TITLE;
}
