// The zone bosses: a hulking undead that rises near the end of each zone and blocks the road. It
// keeps pace ahead of the survivor and hurls wreckage: rolling barrels along the ground (jump them)
// and spinning car doors at head height (slide under them). Shoot it, burn it or stomp it down;
// the zone's safe house only opens once it falls.
import { BOSS, STREET, VIEW } from './config.js';

export const THROW_LOW = 'barrel';
export const THROW_HIGH = 'door';

/** The boss of zone `zone` (0-based), rising off the right edge. */
export function spawnBoss(zone) {
  const hp = BOSS.hp + BOSS.hpPerZone * zone;
  return {
    name: BOSS.names[zone % BOSS.names.length],
    zone,
    x: VIEW.width + 40,
    y: STREET.groundY,
    w: BOSS.w,
    h: BOSS.h,
    hp,
    maxHp: hp,
    age: 0,
    hurt: 0,
    burning: 0,
    throwTimer: 2.2,
    throws: 0,
    supplyTimer: 1.5,
    windup: 0,
    dying: 0,
  };
}

/** The boss's box: left, top, right and bottom. */
export function bossBox(boss) {
  return { left: boss.x, top: boss.y - boss.h, right: boss.x + boss.w, bottom: boss.y };
}

/** A thrown piece of wreckage: a barrel rolling along the street or a door spinning at head height. */
function hurl(boss, kind, speed) {
  const low = kind === THROW_LOW;
  return { kind, x: boss.x - 20, y: low ? STREET.groundY - 22 : STREET.groundY - 74, r: low ? 22 : 26, vx: -speed, spin: 0, hit: false };
}

/**
 * Advance the boss by `dt`: it strides in to its place, sways, winds up and throws. Returns the
 * wreckage it threw this step (zero or one piece).
 */
export function updateBoss(boss, dt, rng) {
  boss.age += dt;
  boss.hurt = Math.max(0, boss.hurt - dt);
  boss.burning = Math.max(0, boss.burning - dt);
  const home = 960 + Math.sin(boss.age * 0.8) * 60;
  boss.x += (home - boss.x) * Math.min(1, dt * 1.5);
  if (boss.dying > 0) return [];
  if (boss.windup > 0) {
    boss.windup -= dt;
    if (boss.windup <= 0) {
      boss.throws += 1;
      const kind = boss.throws % 3 === 0 || rng.chance(0.3) ? THROW_HIGH : THROW_LOW;
      return [hurl(boss, kind, BOSS.throwSpeed + boss.zone * 30)];
    }
    return [];
  }
  boss.throwTimer -= dt;
  if (boss.throwTimer <= 0) {
    boss.throwTimer = BOSS.throwEvery * (0.8 + rng.next() * 0.4) - boss.zone * 0.08;
    boss.windup = 0.45;
  }
  return [];
}

/** Move a thrown piece toward the survivor; the street's `scroll` carries it too. */
export function moveThrown(piece, dt, scroll) {
  piece.x += (piece.vx - scroll * 0.2) * dt;
  piece.spin += dt * (piece.kind === THROW_LOW ? -9 : 14);
}

/** The thrown piece's box. */
export function thrownBox(piece) {
  return { left: piece.x - piece.r, top: piece.y - piece.r, right: piece.x + piece.r, bottom: piece.y + piece.r };
}
