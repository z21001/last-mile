// Every tuning number of Last Mile in one place: the screen, the runner's physics, the horde, guns,
// molotovs, pickups, combos and the city zones. Gameplay code reads these and hard-codes none of its own.

/** The logical play field, in pixels; the canvas is scaled to fit the window around it. */
export const VIEW = { width: 1280, height: 720 };

/** The fixed simulation step, in seconds. */
export const STEP = 1 / 60;

/** The street: where the ground is, and how many pixels make a metre of distance. */
export const STREET = { groundY: 600, pixelsPerMetre: 40 };

/** The survivor: where they run on screen, their body, jumps and slide. */
export const RUNNER = {
  x: 300,
  width: 38,
  height: 86,
  slideHeight: 42,
  gravity: 2700,
  jumpSpeed: 1000,
  airJumpSpeed: 880,
  airJumps: 1,
  slideTime: 0.62,
  stumbleTime: 0.5,
  invulnerableTime: 1.0,
  stompBounce: 720,
};

/** How fast the street scrolls: it starts at `start` px/s and gains `ramp` px/s every second up to `max`. */
export const PACE = { start: 380, ramp: 5.5, max: 920, stumbleSlow: 0.55 };

/** The horde behind the survivor: how far back it is (0 = caught, 100 = far), how it closes and recovers. */
export const HORDE = { start: 70, max: 100, regen: 1.6, hitCost: 20, bigHitCost: 30, foodGain: 16, fatigueMetres: 8000, escalationMetres: 6000 };

/** The survivor's pistol and molotovs. */
export const GUN = { ammo: 12, maxAmmo: 24, cooldown: 0.2, bulletSpeed: 1500, bulletLife: 0.7, molotovs: 1, maxMolotovs: 3, fireTime: 2.6, fireWidth: 240 };

/** Safe houses, where a perk is chosen, come every `every` metres. */
export const SAFEHOUSE = { every: 1000 };

/** Kills in quick succession build a combo that multiplies their score. */
export const COMBO = { window: 2.0, step: 0.25, maxSteps: 12 };

/** Score for each thing the run earns. */
export const SCORE = { perMetre: 1, kill: 25, stomp: 40, scrap: 15, safehouse: 250, rescue: 100, boss: 1000, evac: 5000, evacPerSurvivor: 500 };

/** The goal: the last evacuation chopper waits at `evacMetres`; each zone is `zoneMetres` long. */
export const CAMPAIGN = { evacMetres: 5000, zoneMetres: 1000 };

/**
 * The boss that blocks the road near the end of every zone: when it rises (metres into the zone),
 * its box, its hit points (base plus per zone), how often it hurls wreckage, and its names.
 */
export const BOSS = {
  at: 640,
  w: 128,
  h: 196,
  hp: 30,
  hpPerZone: 10,
  throwEvery: 1.9,
  throwSpeed: 430,
  supplyEvery: 2.6,
  pressure: 0.9,
  names: ['The Butcher', 'Big Mother', 'The Plough', 'Dockmaster Rot', 'The Last Tank'],
};

/** Survivors waiting to be rescued: how many can follow, how often each one fires, and their shirts. */
export const SURVIVOR = { maxConvoy: 3, fireEvery: 2.2, from: 150, colors: ['#d9a13a', '#3aa38f', '#b24a8c', '#7a8f3a'] };

/** The city zones the run passes through, each its own palette; they cycle after the last. */
export const ZONES = [
  { name: 'Burning Suburbs', skyTop: '#2b0f1e', skyBottom: '#d9622b', sun: '#ffcf7a', far: '#4a1d26', near: '#2a1119', ground: '#2a1d1d', line: '#c99b4a', haze: 'rgba(255, 140, 60, 0.18)' },
  { name: 'Downtown Ruins', skyTop: '#1a0b10', skyBottom: '#a4262c', sun: '#ff9b6a', far: '#3a1218', near: '#1d0a0e', ground: '#231818', line: '#d06b4a', haze: 'rgba(255, 80, 60, 0.2)' },
  { name: 'Dead Highway', skyTop: '#0b0a24', skyBottom: '#5b2a6b', sun: '#e8b4ff', far: '#25163d', near: '#140c24', ground: '#1b1824', line: '#e3c35a', haze: 'rgba(170, 110, 255, 0.16)' },
  { name: 'Toxic Docks', skyTop: '#071612', skyBottom: '#3f7a3a', sun: '#d8ff8a', far: '#15302a', near: '#0b1b17', ground: '#16201c', line: '#9fdc5a', haze: 'rgba(150, 255, 90, 0.14)' },
  { name: 'Evac Airfield', skyTop: '#0a1424', skyBottom: '#c76b3a', sun: '#ffe2a0', far: '#24263a', near: '#13141f', ground: '#1d1d24', line: '#f0f0f0', haze: 'rgba(255, 190, 120, 0.14)' },
];

/** Shared colours of the interface and the survivor. */
export const COLORS = {
  ui: '#ffcf5a',
  uiText: '#f8efe0',
  uiDim: '#bfa98a',
  panel: 'rgba(14, 8, 10, 0.84)',
  panelEdge: 'rgba(255, 207, 90, 0.6)',
  danger: '#ff4b3e',
  good: '#8be07f',
  blood: '#7d1a1a',
  zombieSkin: '#7fa36a',
  jacket: '#2f6fb3',
  muzzle: '#fff1b0',
  fire: '#ff8a2a',
};
