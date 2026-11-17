// Cosmetic effects: blood and gore bursts, sparks off wrecks, dust from landings, muzzle smoke,
// flames and the floating score numbers. They draw from their own random stream, so they never
// change how the run plays out.

/** Colours of fire, sparks and gunfire: particles in these glow in the lighting pass. */
const HOT = new Set(['#ff8a2a', '#ffd27a', '#fff1b0', '#ffcf5a', '#ffe9a0']);

/** A pool of particles, floating texts and flashes. */
export function createEffects(rng) {
  return { rng, particles: [], floaters: [] };
}

/** Throw `count` particles from (x, y) in `color` at up to `speed` px/s; `gravity` pulls them down. */
export function burst(fx, x, y, color, count, speed, options = {}) {
  const life = options.life ?? 0.7;
  const size = options.size ?? 3;
  const gravity = options.gravity ?? 900;
  const spread = options.spread ?? Math.PI * 2;
  const direction = options.direction ?? -Math.PI / 2;
  for (let index = 0; index < count; index += 1) {
    const angle = direction + (fx.rng.next() - 0.5) * spread;
    const velocity = speed * (0.3 + fx.rng.next() * 0.7);
    fx.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: life * (0.6 + fx.rng.next() * 0.4),
      maxLife: life,
      size: size * (0.6 + fx.rng.next() * 0.8),
      color,
      gravity,
      hot: HOT.has(color),
    });
  }
}

/** A number or word that rises from (x, y) and fades. */
export function floater(fx, x, y, text, color, size = 20) {
  fx.floaters.push({ x, y, text, color, size, life: 1.0, maxLife: 1.0 });
}

/** Advance every effect by `dt`; the street's `scroll` carries them left with the world. */
export function updateEffects(fx, dt, scroll) {
  for (const particle of fx.particles) {
    particle.vy += particle.gravity * dt;
    particle.x += (particle.vx - scroll) * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  for (const text of fx.floaters) {
    text.y -= 40 * dt;
    text.x -= scroll * 0.3 * dt;
    text.life -= dt;
  }
  fx.particles = fx.particles.filter((particle) => particle.life > 0);
  fx.floaters = fx.floaters.filter((text) => text.life > 0);
  if (fx.particles.length > 700) fx.particles.splice(0, fx.particles.length - 700);
}
