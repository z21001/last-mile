// Draws one frame: the city backdrop, the street and everything on it, effects, the HUD, and the
// screen the game is on. Screen shake and the red hurt flash are applied here.
import { CAMPAIGN, RUNNER, STREET, VIEW } from '../config.js';
import { convoyX } from '../survivors.js';
import { currentZone, metresRun } from '../world.js';
import { drawAsh, drawBackground } from './background.js';
import { drawHud, label } from './hud.js';
import { drawLights, drawNight } from './lighting.js';
import { drawCaught, drawEvacuated, drawPause, drawSafehouse, drawTitle } from './screens.js';
import {
  drawBoss, drawBullets, drawChopper, drawFires, drawFollower, drawHorde, drawHound, drawMolotovs, drawPickup,
  drawRunner, drawSurvivor, drawThrown, drawWreck, drawZombie,
} from './sprites.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_RUN = 'run';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_SAFEHOUSE = 'safehouse';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_EVACUATED = 'evacuated';

/** How much larger than their hit boxes the people and the dead are drawn, so they read in a small screenshot. */
const SPRITE_SCALE = 1.3;

/** Draw with `draw()` scaled by `s` around the point (x, y). */
function atScale(ctx, x, y, s, draw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(-x, -y);
  draw();
  ctx.restore();
}

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
  // The evac chopper waits over the airfield once the last zone is reached.
  const metres = metresRun(state);
  if (!state.endless && metres > CAMPAIGN.evacMetres - CAMPAIGN.zoneMetres) {
    const near = (metres - (CAMPAIGN.evacMetres - CAMPAIGN.zoneMetres)) / CAMPAIGN.zoneMetres;
    drawChopper(ctx, VIEW.width + 120 - near * 420, 150 + Math.sin(time) * 8, time, 0.6 + near * 0.5);
  }
  drawFires(ctx, state.fires, time);
  for (const wreck of state.wrecks) drawWreck(ctx, wreck);
  for (const pickup of state.pickups) drawPickup(ctx, pickup, time);
  const runner = state.runner;
  for (const survivor of state.survivors) atScale(ctx, survivor.x + 17, survivor.y, SPRITE_SCALE, () => drawSurvivor(ctx, survivor, time));
  if (state.boss) atScale(ctx, state.boss.x + state.boss.w / 2, state.boss.y, 1.15, () => drawBoss(ctx, state.boss, time));
  for (const zombie of state.zombies) {
    if (zombie.alive) atScale(ctx, zombie.x + zombie.w / 2, zombie.y, SPRITE_SCALE, () => drawZombie(ctx, zombie, time));
  }
  for (const piece of state.thrown) drawThrown(ctx, piece);
  if (state.stats.hound > 0) atScale(ctx, runner.x - 46, STREET.groundY, SPRITE_SCALE, () => drawHound(ctx, runner, state.hound, time));
  for (const follower of state.convoy) {
    atScale(ctx, convoyX(runner.x, follower.slot) + 17, STREET.groundY, SPRITE_SCALE, () => drawFollower(ctx, follower, runner));
  }
  // The runner is drawn larger around their feet; their aim is mapped into that scaled frame.
  const cx = runner.x + RUNNER.width / 2;
  const aim = { x: cx + (state.aim.x - cx) / SPRITE_SCALE, y: runner.y + (state.aim.y - runner.y) / SPRITE_SCALE };
  atScale(ctx, cx, runner.y, SPRITE_SCALE, () => drawRunner(ctx, runner, aim, state.muzzle, time));
  drawHorde(ctx, state.horde, time);
  drawBullets(ctx, state.bullets);
  drawMolotovs(ctx, state.molotovsInAir, time);
  drawEffects(ctx, state.fx);
  drawNight(ctx, state.horde);
  drawLights(ctx, state, time);
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
  if (screen === SCREEN_EVACUATED) drawEvacuated(ctx, state, view.clock, view.best, view.newBest);
}
