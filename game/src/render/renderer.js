// Draws one frame: the city backdrop, the street and everything on it, effects, the HUD, and the
// screen the game is on. Screen shake and the red hurt flash are applied here.
import { VIEW } from '../config.js';
import { currentZone } from '../world.js';
import { drawAsh, drawBackground } from './background.js';
import { drawHud, label } from './hud.js';
import { drawCaught, drawPause, drawSafehouse, drawTitle } from './screens.js';
import { drawBullets, drawFires, drawHorde, drawHound, drawMolotovs, drawPickup, drawRunner, drawWreck, drawZombie } from './sprites.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_RUN = 'run';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_SAFEHOUSE = 'safehouse';
export const SCREEN_CAUGHT = 'caught';

/** Particles and floating numbers. */
function drawEffects(ctx, fx) {
  for (const particle of fx.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
  }
  for (const text of fx.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, text.life * 2));
    label(ctx, text.text, text.x, text.y, text.size, text.color, 'center');
  }
  ctx.globalAlpha = 1;
}

/** The street and everything on it. */
function drawStreet(ctx, state, time) {
  drawBackground(ctx, state.scrolled, currentZone(state), time);
  drawFires(ctx, state.fires, time);
  for (const wreck of state.wrecks) drawWreck(ctx, wreck);
  for (const pickup of state.pickups) drawPickup(ctx, pickup, time);
  for (const zombie of state.zombies) if (zombie.alive) drawZombie(ctx, zombie, time);
  if (state.stats.hound > 0) drawHound(ctx, state.runner, state.hound, time);
  drawRunner(ctx, state.runner, state.aim, state.muzzle, time);
  drawHorde(ctx, state.horde, time);
  drawBullets(ctx, state.bullets);
  drawMolotovs(ctx, state.molotovsInAir, time);
  drawEffects(ctx, state.fx);
  drawAsh(ctx, time);
  // A vignette that darkens the edges, deeper as the horde closes.
  const vignette = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, 260, VIEW.width / 2, VIEW.height / 2, 820);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, `rgba(0,0,0,${0.45 + (1 - state.horde / 100) * 0.35})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  if (state.hurtFlash > 0) {
    ctx.fillStyle = `rgba(200, 20, 20, ${0.3 * state.hurtFlash})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
}

/** Draw the frame for `screen`; `view` carries the best score, a new-best flag and the hovered card. */
export function drawFrame(ctx, state, screen, view) {
  const time = state.time;
  ctx.save();
  if (state.shake > 0) ctx.translate((Math.sin(time * 90) * state.shake) / 2, (Math.cos(time * 77) * state.shake) / 2);
  drawStreet(ctx, state, time);
  ctx.restore();
  if (screen === SCREEN_TITLE) {
    drawTitle(ctx, view.clock, view.best);
    return;
  }
  if (screen === SCREEN_RUN || screen === SCREEN_PAUSE) drawHud(ctx, state, time, view.best);
  if (screen === SCREEN_PAUSE) drawPause(ctx);
  if (screen === SCREEN_SAFEHOUSE) drawSafehouse(ctx, state, view.clock, view.hovered);
  if (screen === SCREEN_CAUGHT) drawCaught(ctx, state, view.clock, view.best, view.newBest);
}
