// The dead: every kind of zombie on the street, as data (size, toughness, how fast it shambles at
// the survivor, what it is worth) plus the rules for spawning, moving and bursting them.
import { STREET } from './config.js';

export const ZOMBIE_WALKER = 'walker';
export const ZOMBIE_CRAWLER = 'crawler';
export const ZOMBIE_SPRINTER = 'sprinter';
export const ZOMBIE_BLOATER = 'bloater';
export const ZOMBIE_BRUTE = 'brute';

/**
 * Each kind: its box (w, h), hit points, its own speed toward the survivor in px/s, the score it is
 * worth, the first metre it appears at, and its colours.
 */
export const ZOMBIE_KINDS = {
  [ZOMBIE_WALKER]: { name: 'Walker', w: 40, h: 88, hp: 2, speed: 40, score: 1, from: 0, skin: '#7fa36a', cloth: '#5a4a3a' },
  [ZOMBIE_CRAWLER]: { name: 'Crawler', w: 64, h: 30, hp: 1, speed: 24, score: 1, from: 150, skin: '#8a9f6a', cloth: '#3e3a44' },
  [ZOMBIE_SPRINTER]: { name: 'Sprinter', w: 36, h: 84, hp: 1, speed: 240, score: 1.5, from: 500, skin: '#a8b27a', cloth: '#7a2a2a' },
  [ZOMBIE_BLOATER]: { name: 'Bloater', w: 62, h: 94, hp: 3, speed: 28, score: 2, from: 1100, skin: '#9db35a', cloth: '#5b6a2a' },
  [ZOMBIE_BRUTE]: { name: 'Brute', w: 74, h: 140, hp: 9, speed: 18, score: 4, from: 1700, skin: '#6d8a5e', cloth: '#2a2a3a' },
};

/** The radius a bloater's burst splashes, killing other zombies in it. */
export const BLOATER_BLAST = 170;

let nextId = 1;

/** A new zombie of `kind` standing at screen x `x`, its feet on `feetY` (the street by default). */
export function spawnZombie(kind, x, feetY = STREET.groundY) {
  const spec = ZOMBIE_KINDS[kind];
  return {
    id: nextId++,
    kind,
    x,
    y: feetY,
    w: spec.w,
    h: spec.h,
    hp: spec.hp,
    maxHp: spec.hp,
    speed: spec.speed,
    age: 0,
    hurt: 0,
    burning: 0,
    alive: true,
    touched: false,
  };
}

/** The kinds that may appear at `metres` into the run. */
export function zombieKindsAt(metres) {
  return Object.keys(ZOMBIE_KINDS).filter((kind) => ZOMBIE_KINDS[kind].from <= metres);
}

/** Move a zombie one step: the street scrolls it left at `scroll` px/s and it lurches at the survivor too. */
export function moveZombie(zombie, dt, scroll) {
  zombie.age += dt;
  zombie.hurt = Math.max(0, zombie.hurt - dt);
  // Sprinters only break into a run once they are close enough to see the survivor.
  const lunge = zombie.kind === ZOMBIE_SPRINTER && zombie.x > 1000 ? 0.25 : 1;
  zombie.x -= (scroll + zombie.speed * lunge) * dt;
}

/** The zombie's box: left, top, right and bottom. */
export function zombieBox(zombie) {
  return { left: zombie.x, top: zombie.y - zombie.h, right: zombie.x + zombie.w, bottom: zombie.y };
}
