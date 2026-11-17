// A simple computer runner that reads the street ahead and plays the same rules a player does:
// it jumps wrecks and crawlers, slides under hanging wreckage, shoots the dead ahead and throws a
// molotov into a crowd. The title screen runs it behind the menu and the screenshot scenes use it,
// so what they show is the real game playing out.
import { RUNNER, STREET } from './config.js';
import { WRECK_BARRIER } from './obstacles.js';
import { ZOMBIE_BRUTE, ZOMBIE_CRAWLER } from './zombies.js';

/**
 * Controls for this step. `skill` in [0, 1]: at 1 it reads far ahead and shoots everything; lower
 * reacts later and holds fire more often, as a tired player does.
 */
export function autopilot(state, skill = 1) {
  const runner = state.runner;
  const front = runner.x + RUNNER.width;
  const lookahead = state.speed * (0.18 + 0.2 * skill) + 30;
  const controls = { jump: false, slide: false, shoot: false, molotov: false, aim: null };

  for (const wreck of state.wrecks) {
    const gap = wreck.x - front;
    if (gap < -wreck.w || gap > lookahead) continue;
    if (wreck.kind === WRECK_BARRIER) {
      if (gap < lookahead * 0.7 && runner.grounded) controls.slide = true;
    } else if (runner.grounded && runner.y >= STREET.groundY - 1 && gap > 0 && gap < lookahead * (wreck.h > 100 ? 1.1 : 0.85)) {
      controls.jump = true;
    } else if (!runner.grounded && runner.vy > 0 && wreck.h > 100 && gap < 40 && runner.y > wreck.y - wreck.h) {
      controls.jump = true;
    }
  }

  const ahead = state.zombies.filter((zombie) => zombie.alive && zombie.x + zombie.w > runner.x && zombie.x < runner.x + 760).sort((a, b) => a.x - b.x);
  const target = ahead[0];
  if (target) {
    controls.aim = { x: target.x + target.w / 2, y: target.y - target.h * 0.6 };
    const trigger = skill >= 0.5 || Math.floor(state.time * 2) % 3 === 0;
    controls.shoot = trigger && state.ammo > 0;
    const gap = target.x - front;
    const mustJump = target.kind === ZOMBIE_CRAWLER || state.ammo === 0 || (target.hp > 1 && target.kind !== ZOMBIE_BRUTE);
    if (runner.grounded && mustJump && gap > 0 && gap < lookahead * 0.8) controls.jump = true;
  } else {
    controls.aim = { x: runner.x + 600, y: STREET.groundY - 80 + Math.sin(state.time) * 40 };
  }
  if (skill >= 0.5 && state.molotovs > 0 && ahead.filter((zombie) => zombie.x < runner.x + 700).length >= 3) {
    controls.molotov = true;
    const crowd = ahead[1] ?? ahead[0];
    controls.aim = { x: crowd.x, y: crowd.y - 40 };
  }
  return controls;
}
