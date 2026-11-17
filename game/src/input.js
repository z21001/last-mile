// Keyboard and mouse, read into one small state the game polls each step: where the mouse points on
// the play field, which keys and buttons are held, and the presses and clicks since the last step.
const BLOCKED = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

/** Listen on `canvas` and the window; `toField(clientX, clientY)` maps a mouse position onto the play field. */
export function createInput(canvas, toField) {
  const input = {
    mouse: { x: 0, y: 0, moved: false, left: false },
    held: new Set(),
    pressed: new Set(),
    clicks: [],
  };

  window.addEventListener('keydown', (event) => {
    if (BLOCKED.has(event.code)) event.preventDefault();
    if (!event.repeat) input.pressed.add(event.code);
    input.held.add(event.code);
  });
  window.addEventListener('keyup', (event) => input.held.delete(event.code));
  window.addEventListener('blur', () => {
    input.held.clear();
    input.mouse.left = false;
    input.pressed.add('Blur');
  });
  canvas.addEventListener('mousemove', (event) => {
    const point = toField(event.clientX, event.clientY);
    input.mouse.x = point.x;
    input.mouse.y = point.y;
    input.mouse.moved = true;
  });
  canvas.addEventListener('mousedown', (event) => {
    const point = toField(event.clientX, event.clientY);
    input.mouse.x = point.x;
    input.mouse.y = point.y;
    input.mouse.moved = true;
    if (event.button === 0) {
      input.mouse.left = true;
      input.clicks.push(point);
    }
    if (event.button === 2) input.pressed.add('MouseRight');
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.mouse.left = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  /** True while any of `codes` is held. */
  input.isHeld = (...codes) => codes.some((code) => input.held.has(code));
  /** True when any of `codes` was pressed since the last `endFrame`. */
  input.wasPressed = (...codes) => codes.some((code) => input.pressed.has(code));
  /** Forget this step's presses and clicks. */
  input.endFrame = () => {
    input.pressed.clear();
    input.clicks.length = 0;
  };
  return input;
}
