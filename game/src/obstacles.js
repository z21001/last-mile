// The wreckage of the city in the survivor's way: cars to vault or run across, low debris to hop,
// and hanging wreckage (a fallen billboard, a bent traffic gantry) to slide beneath.
import { STREET } from './config.js';

export const WRECK_CAR = 'car';
export const WRECK_BUS = 'bus';
export const WRECK_DEBRIS = 'debris';
export const WRECK_BARRIER = 'barrier';

/** Each kind: its box, whether its roof can be stood on, and whether it hangs overhead. */
export const WRECK_KINDS = {
  [WRECK_CAR]: { w: 150, h: 66, platform: true, overhead: false },
  [WRECK_BUS]: { w: 300, h: 118, platform: true, overhead: false },
  [WRECK_DEBRIS]: { w: 70, h: 40, platform: false, overhead: false },
  [WRECK_BARRIER]: { w: 90, h: 420, platform: false, overhead: true, clearance: 60 },
};

let nextId = 1;

/** A wreck of `kind` with its left edge at screen x `x`; `variant` picks its paint. */
export function spawnWreck(kind, x, variant = 0) {
  const spec = WRECK_KINDS[kind];
  const bottom = spec.overhead ? STREET.groundY - spec.clearance : STREET.groundY;
  return { id: nextId++, kind, x, y: bottom, w: spec.w, h: spec.h, platform: spec.platform, overhead: spec.overhead, variant, hit: false };
}

/** The wreck's box: left, top, right and bottom. */
export function wreckBox(wreck) {
  return { left: wreck.x, top: wreck.y - wreck.h, right: wreck.x + wreck.w, bottom: wreck.y };
}
