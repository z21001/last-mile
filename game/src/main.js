// Boots Last Mile: sizes the canvas to the window around the 1280 x 720 play field, wires input and
// sound, and runs the fixed-step loop. With ?shot=title|run|safehouse|caught&seed=N in the address
// it instead stages that screenshot scene and draws a single frame.
import { STEP, VIEW } from './config.js';
import { createAudio } from './audio.js';
import { createGame } from './game.js';
import { createInput } from './input.js';
import { drawFrame } from './render/renderer.js';
import { stageShot } from './shots.js';
import { loadBest } from './storage.js';
import { createWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const layout = { scale: 1, offsetX: 0, offsetY: 0 };

/** Fit the play field into the window, letterboxed, at the screen's pixel density. */
function resize() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  layout.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
  layout.offsetX = (canvas.width - VIEW.width * layout.scale) / 2;
  layout.offsetY = (canvas.height - VIEW.height * layout.scale) / 2;
}

/** Map a mouse position in the window onto the play field. */
function toField(clientX, clientY) {
  const ratio = window.devicePixelRatio || 1;
  return { x: (clientX * ratio - layout.offsetX) / layout.scale, y: (clientY * ratio - layout.offsetY) / layout.scale };
}

/** Clear the canvas and set the transform onto the play field, clipped to it. */
function beginFrame() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#050304';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(layout.scale, 0, 0, layout.scale, layout.offsetX, layout.offsetY);
  ctx.beginPath();
  ctx.rect(0, 0, VIEW.width, VIEW.height);
  ctx.clip();
}

resize();
window.addEventListener('resize', resize);
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

if (shot) {
  // A screenshot scene: one deterministic frame.
  const world = createWorld(Number(params.get('seed') ?? 1) >>> 0);
  const screen = stageShot(shot, world);
  const render = () => {
    resize();
    ctx.save();
    beginFrame();
    const score = Math.floor(world.state.score);
    const best = Math.max(loadBest(), screen === 'caught' ? score : 0);
    drawFrame(ctx, world.state, screen, { best, newBest: screen === 'caught' && score >= best, clock: 0.25, hovered: 1 });
    ctx.restore();
  };
  render();
  window.addEventListener('resize', render);
  document.body.dataset.ready = 'true';
} else {
  const audio = createAudio();
  const input = createInput(canvas, toField);
  window.addEventListener('keydown', audio.unlock);
  window.addEventListener('mousedown', audio.unlock);
  const game = createGame(ctx, input, audio, status);
  let last = performance.now();
  let pending = 0;
  const frame = (now) => {
    pending = Math.min(pending + (now - last) / 1000, 0.25);
    last = now;
    while (pending >= STEP) {
      game.step();
      pending -= STEP;
    }
    ctx.save();
    beginFrame();
    game.draw();
    ctx.restore();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
