// The survivor's body: running, jumping (with air jumps), sliding, landing on wreck roofs and
// stumbling when something hits them.
import { RUNNER, STREET } from './config.js';
import { overlapsX } from './collision.js';

/** A survivor standing on the street. */
export function createRunner() {
  return {
    x: RUNNER.x,
    y: STREET.groundY,
    vy: 0,
    grounded: true,
    airJumpsLeft: RUNNER.airJumps,
    slide: 0,
    stumble: 0,
    invulnerable: 0,
    stride: 0,
    landed: 0,
  };
}

/** How tall the survivor stands right now. */
export function runnerHeight(runner) {
  return runner.slide > 0 ? RUNNER.slideHeight : RUNNER.height;
}

/** The survivor's box: left, top, right and bottom. */
export function runnerBox(runner) {
  return { left: runner.x, top: runner.y - runnerHeight(runner), right: runner.x + RUNNER.width, bottom: runner.y };
}

/** Jump from the ground, or spend an air jump. Returns true if a jump happened. */
export function tryJump(runner, airJumps) {
  if (runner.grounded) {
    runner.vy = -RUNNER.jumpSpeed;
    runner.grounded = false;
    runner.airJumpsLeft = airJumps;
    runner.slide = 0;
    return true;
  }
  if (runner.airJumpsLeft > 0) {
    runner.airJumpsLeft -= 1;
    runner.vy = -RUNNER.airJumpSpeed;
    return true;
  }
  return false;
}

/** Drop into a slide on the ground, or dive back down fast in the air. */
export function trySlide(runner) {
  if (runner.grounded) {
    const started = runner.slide <= 0;
    runner.slide = RUNNER.slideTime;
    return started;
  }
  runner.vy = Math.max(runner.vy, 1300);
  return false;
}

/**
 * Advance the body by `dt`: gravity, then landing on the street or on the roof of any platform
 * wreck under the survivor. Returns true on the step it lands.
 */
export function moveRunner(runner, dt, wrecks, speed) {
  runner.slide = Math.max(0, runner.slide - dt);
  runner.stumble = Math.max(0, runner.stumble - dt);
  runner.invulnerable = Math.max(0, runner.invulnerable - dt);
  runner.landed = Math.max(0, runner.landed - dt);
  runner.stride += dt * speed * 0.03;
  const previous = runner.y;
  runner.vy += RUNNER.gravity * dt;
  let next = runner.y + runner.vy * dt;

  // The highest surface under the survivor that their feet pass through this step.
  const box = { left: runner.x + 4, right: runner.x + RUNNER.width - 4 };
  let floor = STREET.groundY;
  for (const wreck of wrecks) {
    if (!wreck.platform) continue;
    const top = wreck.y - wreck.h;
    if (overlapsX(box, { left: wreck.x, right: wreck.x + wreck.w }) && previous <= top + 1 && top < floor) floor = top;
  }
  const wasGrounded = runner.grounded;
  if (next >= floor && runner.vy >= 0) {
    next = floor;
    runner.vy = 0;
    runner.grounded = true;
  } else {
    runner.grounded = false;
  }
  runner.y = next;
  const landed = runner.grounded && !wasGrounded;
  if (landed) runner.landed = 0.15;
  return landed;
}
