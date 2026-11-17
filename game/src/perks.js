// Safe-house perks: every kilometre the survivor ducks into a safe house and takes one of three
// perks. Each changes the stats the rules read; some can be taken more than once.
import { GUN, HORDE, RUNNER } from './config.js';

/** The survivor's stats before any perk. */
export function baseStats() {
  return {
    hordeRegen: HORDE.regen,
    hitCost: HORDE.hitCost,
    maxAmmo: GUN.maxAmmo,
    pellets: 1,
    pierce: false,
    cooldown: GUN.cooldown,
    airJumps: RUNNER.airJumps,
    maxMolotovs: GUN.maxMolotovs,
    fireTime: GUN.fireTime,
    fireWidth: GUN.fireWidth,
    scavenge: 1,
    steelBoots: false,
    hound: 0,
  };
}

/** Every perk: its name, what the card says, how many times it may be taken, and what it does. */
export const PERKS = [
  { id: 'shoes', name: 'Running Shoes', text: 'Pull away from the horde 60% faster.', icon: 'shoe', limit: 2, apply: (s) => { s.stats.hordeRegen *= 1.6; } },
  { id: 'mag', name: 'Extended Mag', text: '+10 ammo you can carry, and a full reload.', icon: 'mag', limit: 3, apply: (s) => { s.stats.maxAmmo += 10; s.ammo = s.stats.maxAmmo; } },
  { id: 'shotgun', name: 'Sawn-off Shotgun', text: 'Every shot fires three pellets.', icon: 'shotgun', limit: 1, apply: (s) => { s.stats.pellets = 3; } },
  { id: 'boots', name: 'Steel-toe Boots', text: 'Stomps crush anything, even Brutes.', icon: 'boot', limit: 1, apply: (s) => { s.stats.steelBoots = true; } },
  { id: 'jacket', name: 'Riot Jacket', text: 'Hits let the horde close 35% less.', icon: 'jacket', limit: 2, apply: (s) => { s.stats.hitCost *= 0.65; } },
  { id: 'scavenger', name: 'Scavenger', text: 'Every pickup is worth 50% more.', icon: 'bag', limit: 2, apply: (s) => { s.stats.scavenge += 0.5; } },
  { id: 'parkour', name: 'Parkour', text: 'One more jump in mid-air.', icon: 'jump', limit: 2, apply: (s) => { s.stats.airJumps += 1; } },
  { id: 'fire', name: 'Fire Starter', text: '+2 molotov slots, refilled; flames burn longer.', icon: 'fire', limit: 2, apply: (s) => { s.stats.maxMolotovs += 2; s.molotovs = s.stats.maxMolotovs; s.stats.fireTime += 1.2; s.stats.fireWidth += 60; } },
  { id: 'dog', name: 'Stray Dog', text: 'A loyal dog runs with you and bites the dead.', icon: 'dog', limit: 2, apply: (s) => { s.stats.hound += 1; } },
  { id: 'aim', name: 'Steady Hands', text: 'Shoot 40% faster; bullets pierce.', icon: 'aim', limit: 2, apply: (s) => { s.stats.cooldown *= 0.6; s.stats.pierce = true; } },
  { id: 'rations', name: 'Ration Pack', text: 'Eat now: the horde falls far behind.', icon: 'food', limit: 9, apply: (s) => { s.horde = Math.min(HORDE.max, s.horde + 35); } },
];

const BY_ID = new Map(PERKS.map((perk) => [perk.id, perk]));

/** The perk with this id. */
export function perkById(id) {
  return BY_ID.get(id);
}

/** Offer three different perks not yet taken to their limit; Ration Pack is likelier when the horde is close. */
export function drawPerkOffer(rng, state) {
  const pool = PERKS.filter((perk) => (state.perks[perk.id] ?? 0) < perk.limit);
  const weights = pool.map((perk) => (perk.id === 'rations' ? (state.horde < 40 ? 4 : 0.6) : 1));
  const offer = [];
  while (offer.length < 3 && pool.length > 0) {
    let total = 0;
    for (const weight of weights) total += weight;
    let roll = rng.next() * total;
    let index = 0;
    while (index < pool.length - 1 && roll >= weights[index]) {
      roll -= weights[index];
      index += 1;
    }
    offer.push(pool[index].id);
    pool.splice(index, 1);
    weights.splice(index, 1);
  }
  return offer;
}

/** Take perk `id`: apply it and count it. */
export function takePerk(state, id) {
  const perk = perkById(id);
  if (!perk) return;
  perk.apply(state);
  state.perks[id] = (state.perks[id] ?? 0) + 1;
}
