// The street generator: as the run scrolls, it lays down the next stretch of the city, a pattern
// of wrecks, zombies and supplies chosen for how far the survivor has come. Patterns grow denser
// and nastier with distance, and each is spaced so that a quick player can always read it in time.
import { STREET, SURVIVOR, VIEW } from './config.js';
import { spawnSurvivor } from './survivors.js';
import { WRECK_BARRIER, WRECK_BUS, WRECK_CAR, WRECK_DEBRIS, spawnWreck } from './obstacles.js';
import { PICKUP_AMMO, PICKUP_FOOD, PICKUP_MOLOTOV, PICKUP_SCRAP, spawnPickup } from './pickups.js';
import { ZOMBIE_BLOATER, ZOMBIE_BRUTE, ZOMBIE_CRAWLER, ZOMBIE_SPRINTER, ZOMBIE_WALKER, spawnZombie } from './zombies.js';

const EDGE = VIEW.width + 80;
const GROUND = STREET.groundY;

/** A row of scrap along an arc, the line a jump should follow. */
function scrapArc(out, x, count, height) {
  for (let index = 0; index < count; index += 1) {
    const t = count === 1 ? 0.5 : index / (count - 1);
    out.pickups.push(spawnPickup(PICKUP_SCRAP, x + index * 42, GROUND - 60 - Math.sin(t * Math.PI) * height));
  }
}

/** Each pattern: the first metre it may appear, its weight, and the builder that lays it at `x`, returning its length. */
const PATTERNS = [
  { name: 'lone car', from: 0, weight: 3, build: (out, x, rng) => { out.wrecks.push(spawnWreck(WRECK_CAR, x, rng.int(0, 3))); scrapArc(out, x - 20, 5, 150); return 170; } },
  { name: 'debris', from: 0, weight: 2, build: (out, x, rng) => { out.wrecks.push(spawnWreck(WRECK_DEBRIS, x, rng.int(0, 2))); scrapArc(out, x - 30, 4, 110); return 90; } },
  { name: 'walkers', from: 0, weight: 3, build: (out, x, rng) => { const n = rng.int(1, 3); for (let i = 0; i < n; i += 1) out.zombies.push(spawnZombie(ZOMBIE_WALKER, x + i * rng.range(60, 110))); return n * 100; } },
  { name: 'barrier', from: 80, weight: 2, build: (out, x) => { out.wrecks.push(spawnWreck(WRECK_BARRIER, x)); for (let i = 0; i < 4; i += 1) out.pickups.push(spawnPickup(PICKUP_SCRAP, x - 40 + i * 50, GROUND - 22)); return 110; } },
  { name: 'crawlers', from: 150, weight: 2, build: (out, x, rng) => { const n = rng.int(1, 2); for (let i = 0; i < n; i += 1) out.zombies.push(spawnZombie(ZOMBIE_CRAWLER, x + i * 160)); return n * 170; } },
  { name: 'car with a walker on top', from: 300, weight: 2, build: (out, x, rng) => { out.wrecks.push(spawnWreck(WRECK_CAR, x, rng.int(0, 3))); out.zombies.push(spawnZombie(ZOMBIE_WALKER, x + 160)); return 280; } },
  { name: 'bus', from: 400, weight: 1.5, build: (out, x, rng) => { out.wrecks.push(spawnWreck(WRECK_BUS, x, rng.int(0, 1))); scrapArc(out, x + 40, 6, 40); out.pickups.push(spawnPickup(PICKUP_AMMO, x + 150, GROUND - 175)); return 320; } },
  { name: 'sprinter', from: 500, weight: 2, build: (out, x, rng) => { const n = rng.int(1, 2); for (let i = 0; i < n; i += 1) out.zombies.push(spawnZombie(ZOMBIE_SPRINTER, x + 200 + i * 140)); return 160 * n; } },
  { name: 'car then barrier', from: 700, weight: 1.5, build: (out, x, rng) => { out.wrecks.push(spawnWreck(WRECK_CAR, x, rng.int(0, 3))); out.wrecks.push(spawnWreck(WRECK_BARRIER, x + 420)); return 520; } },
  { name: 'bloater', from: 1100, weight: 1.5, build: (out, x, rng) => { out.zombies.push(spawnZombie(ZOMBIE_BLOATER, x)); for (let i = 0; i < rng.int(1, 3); i += 1) out.zombies.push(spawnZombie(ZOMBIE_WALKER, x + 70 + i * 50)); return 260; } },
  { name: 'brute', from: 1700, weight: 1.2, build: (out, x) => { out.zombies.push(spawnZombie(ZOMBIE_BRUTE, x)); out.pickups.push(spawnPickup(PICKUP_AMMO, x - 160, GROUND - 40)); return 140; } },
  { name: 'survivor waving', from: SURVIVOR.from, weight: 1.1, build: (out, x, rng) => { out.survivors.push(spawnSurvivor(x, GROUND, rng.int(0, 3))); scrapArc(out, x - 160, 3, 60); return 80; } },
  { name: 'survivor on a roof', from: 350, weight: 0.9, build: (out, x, rng) => { out.wrecks.push(spawnWreck(WRECK_CAR, x, rng.int(0, 3))); out.survivors.push(spawnSurvivor(x + 58, GROUND - 66, rng.int(0, 3))); out.zombies.push(spawnZombie(ZOMBIE_WALKER, x + 260)); return 300; } },
  { name: 'horde wall', from: 2200, weight: 1, build: (out, x, rng) => { const kinds = [ZOMBIE_WALKER, ZOMBIE_CRAWLER, ZOMBIE_WALKER, ZOMBIE_SPRINTER]; for (let i = 0; i < 5; i += 1) out.zombies.push(spawnZombie(rng.pick(kinds), x + i * 70)); out.pickups.push(spawnPickup(PICKUP_MOLOTOV, x - 220, GROUND - 120)); return 400; } },
];

/** Make the street generator for one run. */
export function createStreet(rng) {
  return { rng, untilNext: 500 };
}

/** Pick a pattern that fits `metres`. */
function choosePattern(rng, metres) {
  const open = PATTERNS.filter((pattern) => pattern.from <= metres);
  let total = 0;
  for (const pattern of open) total += pattern.weight;
  let roll = rng.next() * total;
  for (const pattern of open) {
    roll -= pattern.weight;
    if (roll <= 0) return pattern;
  }
  return open[open.length - 1];
}

/**
 * Advance the generator by the `scrolled` pixels the street moved this step; when the next stretch
 * is due, lay it just off the right edge into `out` ({ wrecks, zombies, pickups, survivors }).
 */
export function extendStreet(street, out, scrolled, metres, speed) {
  street.untilNext -= scrolled;
  if (street.untilNext > 0) return;
  const rng = street.rng;
  const pattern = choosePattern(rng, metres);
  const length = pattern.build(out, EDGE, rng);
  // Now and then a supply drop: food, ammo or a bottle, floating where a jump will reach it.
  if (rng.chance(0.22)) {
    const kind = rng.pick([PICKUP_AMMO, PICKUP_AMMO, PICKUP_FOOD, PICKUP_MOLOTOV, PICKUP_FOOD]);
    out.pickups.push(spawnPickup(kind, EDGE + length + 120, GROUND - rng.range(40, 170)));
  }
  // Gaps shrink as the dead grow thicker, but never below what the current speed lets a player read.
  const density = Math.min(1, metres / 3000);
  const reaction = speed * 0.55;
  street.untilNext = length + Math.max(reaction, rng.range(420, 760) * (1 - density * 0.45));
}

/** Hold the generator back for `pixels` (after a safe house, so the run restarts on a clear street). */
export function quietStreet(street, pixels) {
  street.untilNext = Math.max(street.untilNext, pixels);
}
