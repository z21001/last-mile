// The dead city behind the run, drawn in parallax layers: a burning sky with its low sun and smoke,
// a far skyline, near ruins with a few windows still lit by fire, street lamps, and the road itself.
// Buildings come from a hash of their slot, so the endless city is the same every time it scrolls past.
import { STREET, VIEW } from '../config.js';

/** A stable pseudo-random number in [0, 1) for an integer slot and a salt. */
function hash(slot, salt) {
  let h = Math.imul(slot ^ 0x45d9f3b, 0x27d4eb2d) ^ salt;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  return ((h >>> 0) % 10000) / 10000;
}

/** The sky: a gradient, a swollen sun low on the horizon, and smoke columns drifting up. */
function drawSky(ctx, zone, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, STREET.groundY);
  sky.addColorStop(0, zone.skyTop);
  sky.addColorStop(1, zone.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, STREET.groundY);
  const sun = ctx.createRadialGradient(930, 430, 10, 930, 430, 260);
  sun.addColorStop(0, zone.sun);
  sun.addColorStop(0.25, zone.sun + 'aa');
  sun.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(600, 150, 660, 450);
  ctx.fillStyle = zone.sun;
  ctx.beginPath();
  ctx.arc(930, 430, 62, 0, Math.PI * 2);
  ctx.fill();
  // Smoke columns from fires on the skyline.
  for (let column = 0; column < 3; column += 1) {
    const baseX = 180 + column * 420;
    for (let puff = 0; puff < 9; puff += 1) {
      const rise = (time * 18 + puff * 50) % 450;
      const x = baseX + Math.sin(puff * 1.7 + time * 0.3) * 30 + rise * 0.35;
      const y = 420 - rise;
      ctx.fillStyle = `rgba(20, 10, 14, ${0.32 * (1 - rise / 450)})`;
      ctx.beginPath();
      ctx.arc(x, y, 26 + rise * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** One parallax layer of building silhouettes; `factor` sets how fast it scrolls. */
function drawSkyline(ctx, scrolled, factor, slotWidth, minHeight, maxHeight, color, salt, windows, time) {
  const offset = scrolled * factor;
  const first = Math.floor(offset / slotWidth) - 1;
  const count = Math.ceil(VIEW.width / slotWidth) + 3;
  for (let index = 0; index < count; index += 1) {
    const slot = first + index;
    const x = slot * slotWidth - offset;
    const height = minHeight + hash(slot, salt) * (maxHeight - minHeight);
    const width = slotWidth * (0.7 + hash(slot, salt + 1) * 0.3);
    const top = STREET.groundY - height;
    ctx.fillStyle = color;
    // A broken roofline: a collapsed corner, or an antenna on an intact roof.
    const ruin = hash(slot, salt + 2);
    ctx.beginPath();
    ctx.moveTo(x, STREET.groundY);
    ctx.lineTo(x, top);
    if (ruin < 0.35) {
      ctx.lineTo(x + width * 0.5, top);
      ctx.lineTo(x + width * 0.62, top + height * 0.08);
      ctx.lineTo(x + width * 0.74, top + height * 0.05);
      ctx.lineTo(x + width, top + height * 0.22);
    } else {
      ctx.lineTo(x + width, top);
    }
    ctx.lineTo(x + width, STREET.groundY);
    ctx.closePath();
    ctx.fill();
    if (ruin > 0.8) ctx.fillRect(x + width * 0.4, top - 30, 3, 30);
    if (!windows) continue;
    for (let row = 0; row < Math.floor(height / 34) - 1; row += 1) {
      for (let col = 0; col < Math.floor(width / 26); col += 1) {
        const lit = hash(slot * 97 + row * 13 + col, salt + 3);
        if (lit > 0.86) {
          const flicker = 0.6 + 0.4 * Math.sin(time * 6 + slot + row * 2 + col);
          ctx.fillStyle = `rgba(255, ${140 + Math.floor(lit * 80)}, 60, ${0.55 * flicker})`;
          ctx.fillRect(x + 8 + col * 26, top + 16 + row * 34, 12, 16);
        } else if (lit < 0.3) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fillRect(x + 8 + col * 26, top + 16 + row * 34, 12, 16);
        }
      }
    }
  }
}

/** Bent street lamps and dead traffic lights along the kerb. */
function drawStreetFurniture(ctx, scrolled, zone) {
  const spacing = 360;
  const offset = scrolled * 0.8;
  const first = Math.floor(offset / spacing) - 1;
  for (let index = 0; index < 6; index += 1) {
    const slot = first + index;
    const x = slot * spacing - offset;
    const bent = (hash(slot, 77) - 0.5) * 0.5;
    ctx.save();
    ctx.translate(x, STREET.groundY - 14);
    ctx.rotate(bent);
    ctx.fillStyle = zone.near;
    ctx.fillRect(-3, -190, 6, 190);
    ctx.fillRect(-3, -190, 46, 6);
    ctx.restore();
  }
}

/** The road: kerb, asphalt, cracked lane markings scrolling at full speed. */
function drawRoad(ctx, scrolled, zone) {
  const top = STREET.groundY;
  ctx.fillStyle = '#1a1214';
  ctx.fillRect(0, top - 14, VIEW.width, 14);
  const road = ctx.createLinearGradient(0, top, 0, VIEW.height);
  road.addColorStop(0, zone.ground);
  road.addColorStop(1, '#0a0607');
  ctx.fillStyle = road;
  ctx.fillRect(0, top, VIEW.width, VIEW.height - top);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, top, VIEW.width, 4);
  const dash = 120;
  const offset = scrolled % (dash * 2);
  ctx.fillStyle = zone.line;
  for (let x = -offset; x < VIEW.width; x += dash * 2) {
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x, top + 62, dash * 0.7, 6);
  }
  ctx.globalAlpha = 1;
  // Cracks and stains.
  const crackOffset = scrolled % 500;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  for (let x = -crackOffset; x < VIEW.width + 500; x += 500) {
    ctx.beginPath();
    ctx.moveTo(x + 60, top + 20);
    ctx.lineTo(x + 90, top + 40);
    ctx.lineTo(x + 80, top + 70);
    ctx.lineTo(x + 120, top + 100);
    ctx.stroke();
    ctx.fillStyle = 'rgba(90, 10, 10, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 300, top + 90, 50, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Ash falling across the whole scene. */
export function drawAsh(ctx, time) {
  ctx.fillStyle = 'rgba(230, 210, 190, 0.5)';
  for (let index = 0; index < 50; index += 1) {
    const x = (hash(index, 5) * VIEW.width - time * (30 + hash(index, 6) * 40)) % VIEW.width;
    const y = (hash(index, 7) * VIEW.height + time * (20 + hash(index, 8) * 30)) % VIEW.height;
    ctx.fillRect(x < 0 ? x + VIEW.width : x, y, 2, 2);
  }
}

/** Draw the whole backdrop for a run `scrolled` pixels along, in `zone`'s colours. */
export function drawBackground(ctx, scrolled, zone, time) {
  drawSky(ctx, zone, time);
  drawSkyline(ctx, scrolled, 0.08, 120, 120, 300, zone.far, 11, false, time);
  ctx.fillStyle = zone.haze;
  ctx.fillRect(0, 0, VIEW.width, STREET.groundY);
  drawSkyline(ctx, scrolled, 0.25, 170, 160, 380, zone.near, 23, true, time);
  drawStreetFurniture(ctx, scrolled, zone);
  drawRoad(ctx, scrolled, zone);
}
