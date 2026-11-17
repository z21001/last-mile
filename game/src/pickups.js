// Supplies scattered along the street: scrap for score, ammo, canned food that buys distance from
// the horde, and bottles for molotovs.
export const PICKUP_SCRAP = 'scrap';
export const PICKUP_AMMO = 'ammo';
export const PICKUP_FOOD = 'food';
export const PICKUP_MOLOTOV = 'molotov';

/** Each kind's size and what the HUD calls it. */
export const PICKUP_KINDS = {
  [PICKUP_SCRAP]: { size: 22, label: 'Scrap' },
  [PICKUP_AMMO]: { size: 30, label: 'Ammo' },
  [PICKUP_FOOD]: { size: 28, label: 'Food' },
  [PICKUP_MOLOTOV]: { size: 30, label: 'Molotov' },
};

let nextId = 1;

/** A pickup of `kind` centred on (x, y). */
export function spawnPickup(kind, x, y) {
  return { id: nextId++, kind, x, y, size: PICKUP_KINDS[kind].size, bob: x * 0.01, taken: false };
}

/** The pickup's box: left, top, right and bottom. */
export function pickupBox(pickup) {
  const half = pickup.size / 2;
  return { left: pickup.x - half, top: pickup.y - half, right: pickup.x + half, bottom: pickup.y + half };
}
