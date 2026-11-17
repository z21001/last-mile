// A small seeded random number generator (mulberry32), so a seed always replays the same street:
// the same obstacles, the same zombies and the same perk offers.

/** Make a generator from a 32-bit seed. */
export function createRandom(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** A float in [min, max). */
    range: (min, max) => min + (max - min) * next(),
    /** An integer in [min, max]. */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    /** One element of a non-empty array. */
    pick: (list) => list[Math.floor(next() * list.length)],
    /** True with probability `p`. */
    chance: (p) => next() < p,
  };
}
