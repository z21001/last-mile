// Survivors: people still alive in the ruins, waving from the street or the roof of a wreck. Run
// into one to rescue them and they join your convoy, running behind you and firing at the dead
// ahead. When something hits you, the last one in the convoy shields you: you lose them instead
// of most of your lead on the horde.
import { STREET, SURVIVOR } from './config.js';

let nextId = 1;

/** A survivor waiting at screen x `x`, feet on `feetY`, in shirt colour `look`. */
export function spawnSurvivor(x, feetY = STREET.groundY, look = 0) {
  return { id: nextId++, x, y: feetY, w: 34, h: 80, look: look % SURVIVOR.colors.length, wave: x * 0.01, taken: false };
}

/** The waiting survivor's box. */
export function survivorBox(survivor) {
  return { left: survivor.x, top: survivor.y - survivor.h, right: survivor.x + survivor.w, bottom: survivor.y };
}

/** A rescued survivor joining the convoy behind the runner. */
export function joinConvoy(survivor, index) {
  return { id: survivor.id, look: survivor.look, slot: index, cooldown: SURVIVOR.fireEvery * (0.5 + index * 0.3), lift: 0, vy: 0, muzzle: 0 };
}

/** Where convoy member `slot` runs, relative to the runner at x `runnerX`. */
export function convoyX(runnerX, slot) {
  return runnerX - 64 - slot * 52;
}

/**
 * Advance the convoy: each follower hops when the runner leaves the ground, and fires at the
 * nearest zombie ahead when ready. Returns the shots fired: { x, y, angle } each.
 */
export function updateConvoy(convoy, dt, runner, targets) {
  const shots = [];
  for (const follower of convoy) {
    follower.muzzle = Math.max(0, follower.muzzle - dt);
    // Followers copy the runner's jumps a beat late.
    if (follower.lift === 0 && runner.y < STREET.groundY - 40 && follower.vy === 0) follower.vy = -700;
    if (follower.vy !== 0 || follower.lift > 0) {
      follower.vy += 2400 * dt;
      follower.lift = Math.max(0, follower.lift - follower.vy * dt);
      if (follower.lift === 0) follower.vy = 0;
    }
    follower.cooldown -= dt;
    if (follower.cooldown > 0) continue;
    const x = convoyX(runner.x, follower.slot) + 30;
    const y = STREET.groundY - 52 - follower.lift;
    const target = targets.find((zombie) => zombie.x > x + 60 && zombie.x < x + 760);
    if (!target) {
      follower.cooldown = 0.25;
      continue;
    }
    follower.cooldown = SURVIVOR.fireEvery;
    follower.muzzle = 0.06;
    shots.push({ x, y, angle: Math.atan2(target.y - target.h * 0.55 - y, target.x + target.w / 2 - x) });
  }
  return shots;
}
