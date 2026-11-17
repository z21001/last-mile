// The rules of Last Mile: one run through the dead city. The street scrolls faster and faster;
// the survivor jumps, slides, shoots and throws molotovs; every hit lets the horde behind close in,
// and the run ends when it catches them. Every kilometre a safe house offers a perk.
import { COMBO, GUN, HORDE, PACE, RUNNER, SAFEHOUSE, SCORE, STREET, VIEW, ZONES } from './config.js';
import { centreDistance, contains, overlaps } from './collision.js';
import { WRECK_BARRIER, wreckBox } from './obstacles.js';
import { createEffects, burst, floater, updateEffects } from './particles.js';
import { PICKUP_AMMO, PICKUP_FOOD, PICKUP_MOLOTOV, PICKUP_SCRAP, pickupBox } from './pickups.js';
import { baseStats, drawPerkOffer, takePerk } from './perks.js';
import { createRandom } from './random.js';
import { createRunner, moveRunner, runnerBox, tryJump, trySlide } from './runner.js';
import { createStreet, extendStreet, quietStreet } from './street.js';
import { BLOATER_BLAST, ZOMBIE_BLOATER, ZOMBIE_BRUTE, ZOMBIE_KINDS, moveZombie, zombieBox } from './zombies.js';

export const EVENT_JUMP = 1;
export const EVENT_SLIDE = 2;
export const EVENT_SHOT = 4;
export const EVENT_KILL = 8;
export const EVENT_HIT = 16;
export const EVENT_PICKUP = 32;
export const EVENT_MOLOTOV = 64;
export const EVENT_SAFEHOUSE = 128;
export const EVENT_CAUGHT = 256;
export const EVENT_STOMP = 512;
export const EVENT_EMPTY = 1024;
export const EVENT_BLAST = 2048;
export const EVENT_LAND = 4096;
export const EVENT_BITE = 8192;
export const EVENT_ZONE = 16384;

export const PHASE_RUN = 'run';
export const PHASE_SAFEHOUSE = 'safehouse';
export const PHASE_CAUGHT = 'caught';

/** A fresh run for `seed`. */
function freshState(seed) {
  const rng = createRandom(seed);
  const stats = baseStats();
  return {
    seed,
    rng,
    fx: createEffects(createRandom(seed ^ 0x5bd1e995)),
    street: createStreet(createRandom(seed ^ 0x27d4eb2f)),
    phase: PHASE_RUN,
    time: 0,
    scrolled: 0,
    speed: PACE.start,
    runner: createRunner(),
    wrecks: [],
    zombies: [],
    pickups: [],
    bullets: [],
    molotovsInAir: [],
    fires: [],
    stats,
    perks: {},
    offer: [],
    horde: HORDE.start,
    ammo: GUN.ammo,
    molotovs: GUN.molotovs,
    gunCooldown: 0,
    houndTimer: 3,
    hound: { lunge: 0, x: 0, y: 0 },
    aim: { x: VIEW.width, y: STREET.groundY - 60 },
    muzzle: 0,
    score: 0,
    kills: 0,
    stomps: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    nextSafehouse: SAFEHOUSE.every,
    safehouses: 0,
    zone: 0,
    zoneBanner: 3,
    shake: 0,
    hurtFlash: 0,
    caughtTime: 0,
  };
}

/** Metres run so far. */
export function metresRun(state) {
  return Math.floor(state.scrolled / STREET.pixelsPerMetre);
}

/** The current combo's score multiplier. */
export function comboMultiplier(state) {
  return 1 + Math.min(state.combo, COMBO.maxSteps) * COMBO.step;
}

/** The zone the run is in now. */
export function currentZone(state) {
  return ZONES[state.zone % ZONES.length];
}

/** Score a kill of `zombie` (worth `base` points before the combo) with its gore. */
function scoreKill(state, zombie, base) {
  const spec = ZOMBIE_KINDS[zombie.kind];
  zombie.alive = false;
  state.combo += 1;
  state.comboTimer = COMBO.window;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const points = Math.round(base * spec.score * comboMultiplier(state));
  state.score += points;
  state.kills += 1;
  const cx = zombie.x + zombie.w / 2;
  const cy = zombie.y - zombie.h / 2;
  burst(state.fx, cx, cy, '#7d1a1a', 18, 420, { size: 4 });
  burst(state.fx, cx, cy, spec.skin, 8, 300, { size: 5 });
  floater(state.fx, cx, zombie.y - zombie.h - 10, `+${points}`, state.combo >= 5 ? '#ffcf5a' : '#f8efe0', state.combo >= 8 ? 26 : 20);
}

/** A hit on the survivor: they stumble, slow down, and the horde closes `cost`. */
function hurtRunner(state, cost) {
  const runner = state.runner;
  if (runner.invulnerable > 0) return false;
  runner.invulnerable = RUNNER.invulnerableTime;
  runner.stumble = RUNNER.stumbleTime;
  state.horde = Math.max(0, state.horde - cost * (1 + metresRun(state) / HORDE.escalationMetres));
  state.combo = 0;
  state.shake = Math.max(state.shake, 12);
  state.hurtFlash = 1;
  burst(state.fx, runner.x + RUNNER.width / 2, runner.y - 50, '#ff4b3e', 14, 300, { size: 4 });
  floater(state.fx, runner.x + 20, runner.y - 110, 'The horde gains!', '#ff4b3e', 22);
  return true;
}

/** Make a world: its state and the operations that change it. */
export function createWorld(seed = 1) {
  const world = { state: freshState(seed) };

  world.reset = (newSeed = world.state.seed) => {
    world.state = freshState(newSeed);
  };

  /** Take one of the offered perks and run on. */
  world.choosePerk = (id) => {
    const state = world.state;
    if (state.phase !== PHASE_SAFEHOUSE || !state.offer.includes(id)) return false;
    takePerk(state, id);
    state.offer = [];
    state.phase = PHASE_RUN;
    state.runner.invulnerable = 1.2;
    return true;
  };

  /**
   * Advance the run by `dt` under `controls`: { jump, slide, molotov (pressed this step), shoot (held),
   * aim { x, y } on the play field }. Returns the step's events as bit flags.
   */
  world.step = (dt, controls) => {
    const state = world.state;
    const fx = state.fx;
    const stats = state.stats;
    const runner = state.runner;
    let events = 0;
    state.time += dt;
    state.shake = Math.max(0, state.shake - dt * 20);
    state.hurtFlash = Math.max(0, state.hurtFlash - dt * 2.2);
    state.zoneBanner = Math.max(0, state.zoneBanner - dt);
    state.muzzle = Math.max(0, state.muzzle - dt);
    state.hound.lunge = Math.max(0, state.hound.lunge - dt);

    if (state.phase === PHASE_CAUGHT) {
      state.caughtTime += dt;
      updateEffects(fx, dt, 0);
      return events;
    }
    if (state.phase === PHASE_SAFEHOUSE) {
      updateEffects(fx, dt, 0);
      return events;
    }

    // Pace: faster every second, slowed while stumbling.
    state.speed = Math.min(PACE.max, state.speed + PACE.ramp * dt);
    const scroll = state.speed * (runner.stumble > 0 ? PACE.stumbleSlow : 1);
    state.scrolled += scroll * dt;
    if (controls.aim) state.aim = { x: controls.aim.x, y: controls.aim.y };

    // Moves.
    if (controls.jump && tryJump(runner, stats.airJumps)) {
      events |= EVENT_JUMP;
      burst(fx, runner.x + 18, runner.y, '#a08a70', 6, 160, { size: 3, direction: Math.PI, spread: 1.2 });
    }
    if (controls.slide && trySlide(runner)) events |= EVENT_SLIDE;
    const previousFeet = runner.y;
    if (moveRunner(runner, dt, state.wrecks, scroll)) {
      events |= EVENT_LAND;
      burst(fx, runner.x + 18, runner.y, '#a08a70', 8, 140, { size: 3, direction: -Math.PI / 2, spread: 2.4, gravity: 300 });
    }

    // The street scrolls; lay the next stretch.
    for (const wreck of state.wrecks) wreck.x -= scroll * dt;
    for (const pickup of state.pickups) {
      pickup.x -= scroll * dt;
      pickup.bob += dt * 4;
    }
    for (const zombie of state.zombies) moveZombie(zombie, dt, scroll);
    for (const fire of state.fires) {
      fire.x -= scroll * dt;
      fire.life -= dt;
    }
    extendStreet(state.street, state, scroll * dt, metresRun(state), state.speed);

    // The gun.
    state.gunCooldown = Math.max(0, state.gunCooldown - dt);
    if (controls.shoot && state.gunCooldown === 0) {
      state.gunCooldown = stats.cooldown;
      if (state.ammo > 0) {
        state.ammo -= 1;
        state.muzzle = 0.06;
        const gx = runner.x + 34;
        const gy = runner.y - (runner.slide > 0 ? 26 : 58);
        const base = Math.atan2(state.aim.y - gy, state.aim.x - gx);
        const angle = Math.max(-1.2, Math.min(1.2, base));
        for (let pellet = 0; pellet < stats.pellets; pellet += 1) {
          const spread = stats.pellets === 1 ? 0 : (pellet - (stats.pellets - 1) / 2) * 0.09;
          state.bullets.push({ x: gx, y: gy, vx: Math.cos(angle + spread) * GUN.bulletSpeed, vy: Math.sin(angle + spread) * GUN.bulletSpeed, life: stats.pellets === 1 ? GUN.bulletLife : GUN.bulletLife * 0.55, hits: new Set() });
        }
        burst(fx, gx + Math.cos(angle) * 14, gy + Math.sin(angle) * 14, '#fff1b0', 5, 260, { size: 2, direction: angle, spread: 0.7, gravity: 0, life: 0.15 });
        events |= EVENT_SHOT;
      } else {
        events |= EVENT_EMPTY;
      }
    }
    for (const bullet of state.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      for (const wreck of state.wrecks) {
        if (bullet.life > 0 && contains(wreckBox(wreck), bullet.x, bullet.y)) {
          bullet.life = 0;
          burst(fx, bullet.x, bullet.y, '#ffd27a', 4, 200, { size: 2, gravity: 400, life: 0.25 });
        }
      }
      for (const zombie of state.zombies) {
        if (bullet.life <= 0 || !zombie.alive || bullet.hits.has(zombie.id)) continue;
        if (!contains(zombieBox(zombie), bullet.x, bullet.y)) continue;
        bullet.hits.add(zombie.id);
        zombie.hp -= 1;
        zombie.hurt = 0.12;
        zombie.x += 6;
        burst(fx, bullet.x, bullet.y, '#7d1a1a', 6, 240, { size: 3, direction: 0, spread: 1.6 });
        if (zombie.hp <= 0) {
          scoreKill(state, zombie, SCORE.kill);
          events |= EVENT_KILL;
        }
        if (!stats.pierce) bullet.life = 0;
      }
    }
    state.bullets = state.bullets.filter((bullet) => bullet.life > 0 && bullet.x < VIEW.width + 40 && bullet.y > -40 && bullet.y < VIEW.height);

    // Molotovs: thrown on an arc toward the aim, they burst into a strip of fire on the street.
    if (controls.molotov && state.molotovs > 0) {
      state.molotovs -= 1;
      const reach = Math.max(260, Math.min(760, state.aim.x - runner.x));
      state.molotovsInAir.push({ x: runner.x + 30, y: runner.y - 70, vx: reach * 1.2, vy: -620, spin: 0 });
      events |= EVENT_MOLOTOV;
    }
    for (const bottle of state.molotovsInAir) {
      bottle.vy += 1500 * dt;
      bottle.x += (bottle.vx - scroll) * dt;
      bottle.y += bottle.vy * dt;
      bottle.spin += dt * 14;
      if (bottle.y >= STREET.groundY) {
        bottle.done = true;
        state.fires.push({ x: bottle.x - stats.fireWidth / 2, w: stats.fireWidth, life: stats.fireTime, maxLife: stats.fireTime });
        burst(fx, bottle.x, STREET.groundY - 10, '#ff8a2a', 40, 420, { size: 5, gravity: 200 });
        state.shake = Math.max(state.shake, 6);
        events |= EVENT_BLAST;
      }
    }
    state.molotovsInAir = state.molotovsInAir.filter((bottle) => !bottle.done);
    for (const fire of state.fires) {
      if (fx.rng.next() < dt * 40) burst(fx, fire.x + fx.rng.next() * fire.w, STREET.groundY - 4, fx.rng.next() < 0.5 ? '#ff8a2a' : '#ffd27a', 1, 120, { size: 5, gravity: -260, direction: -Math.PI / 2, spread: 0.6, life: 0.6 });
      for (const zombie of state.zombies) {
        if (!zombie.alive || zombie.x + zombie.w < fire.x || zombie.x > fire.x + fire.w) continue;
        zombie.hp -= 6 * dt;
        zombie.burning = 0.3;
        if (zombie.hp <= 0) {
          scoreKill(state, zombie, SCORE.kill);
          events |= EVENT_KILL;
        }
      }
    }
    state.fires = state.fires.filter((fire) => fire.life > 0 && fire.x + fire.w > -20);

    // The stray dog bites the nearest zombie ahead every few seconds.
    if (stats.hound > 0) {
      state.houndTimer -= dt;
      if (state.houndTimer <= 0) {
        const target = state.zombies.filter((zombie) => zombie.alive && zombie.x > runner.x + 40 && zombie.x < runner.x + 520).sort((a, b) => a.x - b.x)[0];
        if (target) {
          state.houndTimer = 3.6 / stats.hound;
          state.hound.lunge = 0.35;
          state.hound.x = target.x;
          state.hound.y = target.y;
          target.hp -= target.kind === ZOMBIE_BRUTE ? 4 : 99;
          target.hurt = 0.2;
          if (target.hp <= 0) scoreKill(state, target, SCORE.kill);
          events |= EVENT_BITE;
        } else {
          state.houndTimer = 0.3;
        }
      }
    }

    // Bodies against the survivor: stomps, hits, wrecks.
    const body = runnerBox(runner);
    for (const zombie of state.zombies) {
      if (!zombie.alive || zombie.touched) continue;
      const box = zombieBox(zombie);
      if (!overlaps(body, box)) continue;
      const falling = runner.vy > 0 && previousFeet <= box.top + 16;
      if (falling) {
        if (zombie.kind === ZOMBIE_BRUTE && !stats.steelBoots) {
          zombie.hp -= 3;
          zombie.hurt = 0.2;
          runner.vy = -RUNNER.stompBounce;
          runner.airJumpsLeft = stats.airJumps;
          if (zombie.hp <= 0) scoreKill(state, zombie, SCORE.stomp);
        } else {
          scoreKill(state, zombie, SCORE.stomp * (stats.steelBoots ? 2 : 1));
          runner.vy = -RUNNER.stompBounce;
          runner.airJumpsLeft = stats.airJumps;
          state.stomps += 1;
        }
        events |= EVENT_STOMP;
        continue;
      }
      zombie.touched = true;
      if (hurtRunner(state, zombie.kind === ZOMBIE_BRUTE || zombie.kind === ZOMBIE_BLOATER ? Math.max(stats.hitCost, HORDE.bigHitCost * (stats.hitCost / HORDE.hitCost)) : stats.hitCost)) events |= EVENT_HIT;
    }
    for (const wreck of state.wrecks) {
      if (wreck.hit) continue;
      const box = wreckBox(wreck);
      if (!overlaps(body, box)) continue;
      // Standing on a roof is no hit: only running into a wreck's side, or into hanging wreckage, is.
      if (wreck.platform && runner.y <= box.top + 1) continue;
      if (wreck.kind === WRECK_BARRIER && runner.slide > 0) continue;
      wreck.hit = true;
      burst(fx, box.left, Math.max(box.top, runner.y - 50), '#ffd27a', 10, 260, { size: 2, gravity: 500, life: 0.4 });
      if (hurtRunner(state, stats.hitCost)) events |= EVENT_HIT;
    }

    // Bloaters burst when they die, taking the dead around them along.
    for (const zombie of state.zombies) {
      if (zombie.alive || zombie.kind !== ZOMBIE_BLOATER || zombie.burst) continue;
      zombie.burst = true;
      const blast = zombieBox(zombie);
      burst(fx, zombie.x + zombie.w / 2, zombie.y - zombie.h / 2, '#9db35a', 40, 520, { size: 6 });
      state.shake = Math.max(state.shake, 10);
      events |= EVENT_BLAST;
      for (const other of state.zombies) {
        if (other.alive && centreDistance(blast, zombieBox(other)) < BLOATER_BLAST) {
          other.hp -= other.kind === ZOMBIE_BRUTE ? 5 : 99;
          if (other.hp <= 0) scoreKill(state, other, SCORE.kill);
        }
      }
    }

    // Supplies.
    for (const pickup of state.pickups) {
      if (pickup.taken || !overlaps(body, pickupBox(pickup))) continue;
      pickup.taken = true;
      const worth = stats.scavenge;
      if (pickup.kind === PICKUP_SCRAP) {
        state.score += Math.round(SCORE.scrap * worth);
      } else if (pickup.kind === PICKUP_AMMO) {
        const gained = Math.round(6 * worth);
        state.ammo = Math.min(stats.maxAmmo, state.ammo + gained);
        floater(fx, pickup.x, pickup.y - 20, `+${gained} ammo`, '#ffcf5a');
      } else if (pickup.kind === PICKUP_FOOD) {
        state.horde = Math.min(HORDE.max, state.horde + HORDE.foodGain * worth);
        floater(fx, pickup.x, pickup.y - 20, 'Food! Horde falls back', '#8be07f');
      } else if (pickup.kind === PICKUP_MOLOTOV) {
        state.molotovs = Math.min(stats.maxMolotovs, state.molotovs + 1);
        floater(fx, pickup.x, pickup.y - 20, '+1 molotov', '#ff8a2a');
      }
      burst(fx, pickup.x, pickup.y, '#ffe9a0', 6, 160, { size: 2, gravity: 0, life: 0.3 });
      events |= EVENT_PICKUP;
    }

    // Clear what has scrolled away; zombies that slipped past still let the horde grow.
    state.wrecks = state.wrecks.filter((wreck) => wreck.x + wreck.w > -80);
    state.pickups = state.pickups.filter((pickup) => !pickup.taken && pickup.x > -40);
    state.zombies = state.zombies.filter((zombie) => (zombie.alive || (zombie.kind === ZOMBIE_BLOATER && !zombie.burst)) && zombie.x + zombie.w > -60);

    // Combo, horde and score for distance.
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    // The deeper into the city, the harder the horde is to shake off.
    const fatigue = Math.max(0.15, 1 - metresRun(state) / HORDE.fatigueMetres);
    if (runner.stumble === 0) state.horde = Math.min(HORDE.max, state.horde + stats.hordeRegen * fatigue * dt);
    state.score += SCORE.perMetre * (scroll * dt) / STREET.pixelsPerMetre;
    updateEffects(fx, dt, scroll);

    // Caught, a safe house, or a new zone.
    if (state.horde <= 0) {
      state.phase = PHASE_CAUGHT;
      state.shake = 22;
      state.score = Math.floor(state.score);
      return events | EVENT_CAUGHT;
    }
    const metres = metresRun(state);
    if (metres >= state.nextSafehouse) {
      state.nextSafehouse += SAFEHOUSE.every;
      state.safehouses += 1;
      state.score += SCORE.safehouse * state.safehouses;
      state.phase = PHASE_SAFEHOUSE;
      state.offer = drawPerkOffer(state.rng, state);
      state.zombies = [];
      state.bullets = [];
      state.wrecks = [];
      state.fires = [];
      state.pickups = [];
      state.molotovsInAir = [];
      state.runner = { ...createRunner(), airJumpsLeft: stats.airJumps };
      quietStreet(state.street, 900);
      const zone = Math.floor(metres / SAFEHOUSE.every);
      if (zone !== state.zone) {
        state.zone = zone;
        state.zoneBanner = 3;
        events |= EVENT_ZONE;
      }
      return events | EVENT_SAFEHOUSE;
    }
    return events;
  };

  return world;
}
