// The lighting pass: the street is drawn, a night tint darkens it, and then every light source is
// added on top with additive blending, so fire, gunfire, eyes, street lamps, neon and the boss's
// heart glow out of the dark. Light is the game's art direction: the dead city is black, and
// everything that matters burns bright.
import { STREET, VIEW } from '../config.js';
import { convoyX } from '../survivors.js';
import { ZOMBIE_KINDS, ZOMBIE_SPRINTER } from '../zombies.js';

/** Add a soft round light of `radius` at (x, y) in `color` ("r, g, b") at `alpha`. */
export function glow(ctx, x, y, radius, color, alpha) {
  const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
  light.addColorStop(0, `rgba(${color}, ${alpha})`);
  light.addColorStop(0.35, `rgba(${color}, ${alpha * 0.45})`);
  light.addColorStop(1, `rgba(${color}, 0)`);
  ctx.fillStyle = light;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/** Darken the scene toward night, deeper at the top and the edges. */
export function drawNight(ctx, horde) {
  const night = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  night.addColorStop(0, 'rgba(6, 4, 18, 0.6)');
  night.addColorStop(0.75, 'rgba(6, 4, 18, 0.32)');
  night.addColorStop(1, 'rgba(6, 4, 18, 0.55)');
  ctx.fillStyle = night;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // The horde's side of the screen is darker still, a red murk.
  const murk = ctx.createLinearGradient(0, 0, 360, 0);
  murk.addColorStop(0, `rgba(60, 0, 8, ${0.35 + (1 - horde / 100) * 0.4})`);
  murk.addColorStop(1, 'rgba(60, 0, 8, 0)');
  ctx.fillStyle = murk;
  ctx.fillRect(0, 0, 360, VIEW.height);
}

/** Every light of the frame, added over the night. */
export function drawLights(ctx, state, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const runner = state.runner;

  // Fire on the road.
  for (const fire of state.fires) {
    const strength = Math.min(1, fire.life / 0.6);
    for (let x = fire.x + 30; x < fire.x + fire.w; x += 70) {
      glow(ctx, x, STREET.groundY - 30, 150, '255, 120, 30', 0.45 * strength * (0.85 + 0.15 * Math.sin(time * 17 + x)));
    }
  }
  // Gunfire: the runner's muzzle, the convoy's, and every bullet's trail.
  if (state.muzzle > 0) glow(ctx, runner.x + 80, runner.y - 76, 100, '255, 220, 140', 0.45);
  for (const follower of state.convoy) {
    if (follower.muzzle > 0) glow(ctx, convoyX(runner.x, follower.slot) + 56, STREET.groundY - 62 - follower.lift, 110, '255, 220, 140', 0.6);
  }
  for (const bullet of state.bullets) glow(ctx, bullet.x, bullet.y, 26, '255, 230, 160', 0.55);
  // Eyes in the dark.
  for (const zombie of state.zombies) {
    if (!zombie.alive) continue;
    const eye = zombie.kind === ZOMBIE_SPRINTER ? '255, 225, 70' : '255, 60, 40';
    const size = ZOMBIE_KINDS[zombie.kind].w > 60 ? 40 : 28;
    glow(ctx, zombie.x + zombie.w * 0.35, zombie.y - zombie.h * 0.9, size, eye, 0.7);
    if (zombie.burning > 0) glow(ctx, zombie.x + zombie.w / 2, zombie.y - zombie.h / 2, 90, '255, 130, 40', 0.5);
  }
  // The boss: its burning heart and a red aura.
  if (state.boss) {
    const boss = state.boss;
    const fade = boss.dying > 0 ? boss.dying / 1.4 : 1;
    glow(ctx, boss.x + boss.w * 0.42, boss.y - boss.h * 0.7, 60 + Math.sin(time * 6) * 10, '255, 60, 30', 0.55 * fade);
    glow(ctx, boss.x + boss.w * 0.38, boss.y - boss.h * 1.02, 34, '255, 220, 60', 0.45 * fade);
  }
  // Supplies and survivors shine so they read at a glance.
  for (const pickup of state.pickups) glow(ctx, pickup.x, pickup.y, 46, '255, 220, 120', 0.4);
  for (const survivor of state.survivors) glow(ctx, survivor.x + 17, survivor.y - 50, 90, '120, 255, 140', 0.35);
  // Hot particles: sparks, embers and explosions.
  for (const particle of state.fx.particles) {
    if (particle.hot) glow(ctx, particle.x, particle.y, particle.size * 5, '255, 160, 60', 0.5 * Math.max(0, particle.life / particle.maxLife));
  }
  // Thrown wreckage trails sparks.
  for (const piece of state.thrown) glow(ctx, piece.x, piece.y, 50, '255, 200, 90', 0.35);
  // The runner is lit by a warm rim so they always stand out.
  glow(ctx, runner.x + 20, runner.y - 50, 110, '120, 170, 255', 0.25);
  ctx.restore();
}
