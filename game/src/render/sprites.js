// Everything that moves on the street, drawn from shapes: the survivor and their dog, each kind of
// zombie, the wrecks, the supplies, bullets, molotovs and fire. No image files: every sprite is code.
import { COLORS, RUNNER, STREET } from '../config.js';
import { runnerHeight } from '../runner.js';
import { WRECK_BARRIER, WRECK_BUS, WRECK_CAR } from '../obstacles.js';
import { PICKUP_AMMO, PICKUP_FOOD, PICKUP_MOLOTOV } from '../pickups.js';
import { ZOMBIE_BLOATER, ZOMBIE_BRUTE, ZOMBIE_CRAWLER, ZOMBIE_KINDS, ZOMBIE_SPRINTER } from '../zombies.js';

const CAR_PAINT = ['#6b2a26', '#2c4a6b', '#4f5a3a', '#7a6a4a'];

/** A limb from (x1, y1) to (x2, y2). */
function limb(ctx, x1, y1, x2, y2, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** The survivor: hoodie, backpack, cap and pistol, legs pumping, arm aimed at the crosshair. */
export function drawRunner(ctx, runner, aim, muzzle, time) {
  const height = runnerHeight(runner);
  const x = runner.x;
  const feet = runner.y;
  const blink = runner.invulnerable > 0 && Math.floor(time * 18) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + RUNNER.width / 2, STREET.groundY + 4, 26, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  if (runner.slide > 0) {
    // Sliding: low, legs out front, one hand on the road.
    limb(ctx, x + 6, feet - 10, x + 50, feet - 4, 9, '#2a2a33');
    ctx.fillStyle = COLORS.jacket;
    ctx.fillRect(x - 8, feet - 34, 44, 22);
    ctx.fillStyle = '#5a3a24';
    ctx.fillRect(x - 18, feet - 36, 14, 20);
    ctx.fillStyle = '#e0b48a';
    ctx.beginPath();
    ctx.arc(x + 36, feet - 36, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c23b2a';
    ctx.fillRect(x + 28, feet - 48, 20, 6);
    ctx.restore();
    return;
  }

  const swing = runner.grounded ? Math.sin(runner.stride) : 0.6;
  const hip = feet - height * 0.48;
  // Legs.
  limb(ctx, x + 18, hip, x + 18 + swing * 16, feet - 2, 9, '#2a2a33');
  limb(ctx, x + 20, hip, x + 20 - swing * 16, feet - (runner.grounded ? 2 : 14), 9, '#23232b');
  // Backpack, torso and head.
  ctx.fillStyle = '#5a3a24';
  ctx.fillRect(x - 6, feet - height * 0.86, 14, 30);
  ctx.fillStyle = COLORS.jacket;
  ctx.beginPath();
  ctx.roundRect(x + 4, feet - height * 0.88, 30, height * 0.44, 6);
  ctx.fill();
  ctx.fillStyle = '#e0b48a';
  ctx.beginPath();
  ctx.arc(x + 22, feet - height + 10, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c23b2a';
  ctx.fillRect(x + 10, feet - height - 2, 24, 7);
  ctx.fillRect(x + 28, feet - height + 2, 12, 4);
  // The gun arm, aimed.
  const sx = x + 24;
  const sy = feet - height * 0.76;
  const angle = Math.max(-1.2, Math.min(1.2, Math.atan2(aim.y - sy, aim.x - sx)));
  const hx = sx + Math.cos(angle) * 26;
  const hy = sy + Math.sin(angle) * 26;
  limb(ctx, sx, sy, hx, hy, 7, '#245a94');
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  ctx.fillStyle = '#1b1b1f';
  ctx.fillRect(-2, -4, 18, 7);
  if (muzzle > 0) {
    ctx.fillStyle = COLORS.muzzle;
    ctx.beginPath();
    ctx.moveTo(16, -8);
    ctx.lineTo(34, 0);
    ctx.lineTo(16, 8);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

/** The stray dog, running at the survivor's heels or lunging at a zombie. */
export function drawHound(ctx, runner, hound, time) {
  const lunging = hound.lunge > 0;
  const x = lunging ? hound.x - 30 : runner.x - 70;
  const y = lunging ? hound.y : STREET.groundY;
  const bob = Math.sin(time * 18) * 3;
  ctx.fillStyle = '#8a5a2a';
  ctx.beginPath();
  ctx.ellipse(x + 24, y - 24 + bob, 24, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 48, y - 32 + bob, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(x + 44, y - 46 + bob, 5, 9);
  limb(ctx, x + 10, y - 18, x + 4 + Math.sin(time * 18) * 6, y - 2, 5, '#6a4520');
  limb(ctx, x + 38, y - 18, x + 42 - Math.sin(time * 18) * 6, y - 2, 5, '#6a4520');
  limb(ctx, x, y - 28 + bob, x - 12, y - 38 + bob, 4, '#8a5a2a');
}

/** One zombie, drawn for its kind: shambling arms out, glowing eyes, flashing white when shot. */
export function drawZombie(ctx, zombie, time) {
  const spec = ZOMBIE_KINDS[zombie.kind];
  const x = zombie.x;
  const feet = zombie.y;
  const w = zombie.w;
  const h = zombie.h;
  const skin = zombie.hurt > 0 ? '#ffffff' : spec.skin;
  const sway = Math.sin(zombie.age * (zombie.kind === ZOMBIE_SPRINTER ? 14 : 5) + zombie.id);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, STREET.groundY + 4, w * 0.6, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  if (zombie.kind === ZOMBIE_CRAWLER) {
    ctx.fillStyle = spec.cloth;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.55, feet - 14, w * 0.45, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(x + 10, feet - 18, 12, 0, Math.PI * 2);
    ctx.fill();
    limb(ctx, x + 8, feet - 10, x - 12 + sway * 8, feet - 2, 6, skin);
    limb(ctx, x + 22, feet - 10, x + 2 - sway * 8, feet - 1, 6, skin);
    ctx.fillStyle = '#ff3b2a';
    ctx.fillRect(x + 2, feet - 22, 4, 4);
    ctx.fillRect(x + 10, feet - 22, 4, 4);
  } else {
    const legSwing = sway * (zombie.kind === ZOMBIE_SPRINTER ? 18 : 8);
    const hip = feet - h * 0.45;
    limb(ctx, x + w * 0.45, hip, x + w * 0.45 + legSwing, feet - 2, w * 0.2, '#2a2620');
    limb(ctx, x + w * 0.55, hip, x + w * 0.55 - legSwing, feet - 2, w * 0.2, '#211e19');
    ctx.fillStyle = spec.cloth;
    if (zombie.kind === ZOMBIE_BLOATER) {
      ctx.fillStyle = zombie.hurt > 0 ? '#ffffff' : '#7f9a3a';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, feet - h * 0.55, w * 0.55, h * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(200, 255, 120, 0.35)';
      for (let boil = 0; boil < 4; boil += 1) {
        ctx.beginPath();
        ctx.arc(x + w * (0.25 + boil * 0.17), feet - h * (0.45 + (boil % 2) * 0.2), 5 + Math.sin(time * 4 + boil) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.roundRect(x + w * 0.15, feet - h * 0.88, w * 0.7, h * 0.46, 5);
      ctx.fill();
      // Torn shirt.
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + w * 0.3, feet - h * 0.62, w * 0.2, h * 0.08);
    }
    // Head, lolling.
    const headX = x + w * 0.38 + sway * 2;
    const headY = feet - h * 0.9;
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(headX, headY, w * (zombie.kind === ZOMBIE_BRUTE ? 0.22 : 0.3), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = zombie.kind === ZOMBIE_SPRINTER ? '#ffe14a' : '#ff3b2a';
    ctx.fillRect(headX - 8, headY - 3, 4, 4);
    ctx.fillRect(headX - 1, headY - 3, 4, 4);
    ctx.fillStyle = '#3a0a0a';
    ctx.fillRect(headX - 7, headY + 5, 9, 3);
    // Arms reaching for the survivor.
    const shoulder = feet - h * 0.8;
    const reach = zombie.kind === ZOMBIE_BRUTE ? 46 : 30;
    limb(ctx, x + w * 0.3, shoulder, x + w * 0.3 - reach, shoulder + 6 + sway * 6, w * (zombie.kind === ZOMBIE_BRUTE ? 0.2 : 0.16), skin);
    limb(ctx, x + w * 0.5, shoulder + 4, x + w * 0.5 - reach, shoulder + 12 - sway * 6, w * (zombie.kind === ZOMBIE_BRUTE ? 0.2 : 0.16), skin);
    if (zombie.kind === ZOMBIE_BRUTE) {
      // Spiked shoulder plates from some ruined riot gear.
      ctx.fillStyle = '#3a3a48';
      ctx.fillRect(x + w * 0.1, feet - h * 0.9, w * 0.8, 12);
    }
  }
  if (zombie.burning > 0) {
    ctx.fillStyle = 'rgba(255, 140, 40, 0.45)';
    ctx.fillRect(x, feet - h, w, h);
  }
  if (zombie.maxHp > 2 && zombie.hp < zombie.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, feet - h - 16, w, 6);
    ctx.fillStyle = '#ff4b3e';
    ctx.fillRect(x, feet - h - 16, (w * Math.max(0, zombie.hp)) / zombie.maxHp, 6);
  }
}

/** A wreck: an abandoned car, a burnt-out bus, a rubble pile, or a fallen billboard to slide under. */
export function drawWreck(ctx, wreck) {
  const { x, y, w, h } = wreck;
  const top = y - h;
  if (wreck.kind === WRECK_BARRIER) {
    limb(ctx, x + 12, 0, x + 12, top + 10, 3, '#2a2a2a');
    limb(ctx, x + w - 12, 0, x + w - 12, top + 10, 3, '#2a2a2a');
    ctx.fillStyle = '#3a3036';
    ctx.fillRect(x - 30, y - 120, w + 60, 120);
    for (let stripe = 0; stripe < 6; stripe += 1) {
      ctx.fillStyle = stripe % 2 === 0 ? '#e0b030' : '#1a1a1a';
      ctx.beginPath();
      ctx.moveTo(x - 30 + stripe * 25, y);
      ctx.lineTo(x - 5 + stripe * 25, y);
      ctx.lineTo(x + 20 + stripe * 25, y - 24);
      ctx.lineTo(x - 5 + stripe * 25, y - 24);
      ctx.fill();
    }
    ctx.fillStyle = '#d8cbb0';
    ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EVACUATE', x + w / 2, y - 60);
    ctx.textAlign = 'left';
    return;
  }
  if (wreck.kind === WRECK_CAR || wreck.kind === WRECK_BUS) {
    const paint = wreck.kind === WRECK_BUS ? (wreck.variant ? '#8a6a1a' : '#5a5f66') : CAR_PAINT[wreck.variant % CAR_PAINT.length];
    ctx.fillStyle = '#111';
    for (const wheel of wreck.kind === WRECK_BUS ? [0.15, 0.85] : [0.2, 0.8]) {
      ctx.beginPath();
      ctx.arc(x + w * wheel, y - 12, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = paint;
    ctx.beginPath();
    if (wreck.kind === WRECK_CAR) {
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x + 6, top + 26);
      ctx.lineTo(x + w * 0.25, top + 22);
      ctx.lineTo(x + w * 0.38, top);
      ctx.lineTo(x + w * 0.74, top);
      ctx.lineTo(x + w * 0.86, top + 22);
      ctx.lineTo(x + w, top + 28);
      ctx.lineTo(x + w, y - 14);
    } else {
      ctx.roundRect(x, top, w, h - 14, 8);
    }
    ctx.fill();
    // Smashed windows and rust.
    ctx.fillStyle = 'rgba(10, 14, 20, 0.85)';
    if (wreck.kind === WRECK_CAR) {
      ctx.fillRect(x + w * 0.41, top + 5, w * 0.14, 17);
      ctx.fillRect(x + w * 0.58, top + 5, w * 0.14, 17);
    } else {
      for (let pane = 0; pane < 6; pane += 1) ctx.fillRect(x + 16 + pane * 46, top + 14, 34, 32);
    }
    ctx.fillStyle = 'rgba(60, 30, 10, 0.5)';
    ctx.fillRect(x + w * 0.1, y - 30, w * 0.3, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, top + (wreck.kind === WRECK_CAR ? 24 : 0), w, 4);
    return;
  }
  // Debris: broken concrete, a tyre and rebar.
  ctx.fillStyle = '#4a4440';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 10, top + 12);
  ctx.lineTo(x + 30, top);
  ctx.lineTo(x + 52, top + 10);
  ctx.lineTo(x + w, y);
  ctx.fill();
  ctx.fillStyle = '#151515';
  ctx.beginPath();
  ctx.arc(x + 46, y - 12, 12, 0, Math.PI * 2);
  ctx.fill();
  limb(ctx, x + 20, top + 6, x + 12, top - 12, 3, '#7a5a3a');
}

/** A supply on the street, bobbing gently. */
export function drawPickup(ctx, pickup, time) {
  const x = pickup.x;
  const y = pickup.y + Math.sin(pickup.bob + time * 2) * 4;
  const s = pickup.size;
  ctx.save();
  ctx.translate(x, y);
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, s);
  glow.addColorStop(0, 'rgba(255, 230, 150, 0.45)');
  glow.addColorStop(1, 'rgba(255, 230, 150, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-s, -s, s * 2, s * 2);
  if (pickup.kind === PICKUP_AMMO) {
    ctx.fillStyle = '#3d5a2a';
    ctx.fillRect(-15, -11, 30, 22);
    ctx.fillStyle = '#e0c060';
    for (let shell = 0; shell < 3; shell += 1) ctx.fillRect(-10 + shell * 8, -7, 4, 12);
  } else if (pickup.kind === PICKUP_FOOD) {
    ctx.fillStyle = '#b0b4b8';
    ctx.fillRect(-11, -13, 22, 26);
    ctx.fillStyle = '#c23b2a';
    ctx.fillRect(-11, -6, 22, 12);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-4, -2, 8, 4);
  } else if (pickup.kind === PICKUP_MOLOTOV) {
    ctx.fillStyle = '#4a7a3a';
    ctx.fillRect(-7, -6, 14, 20);
    ctx.fillRect(-3, -14, 6, 9);
    ctx.fillStyle = '#e0d0b0';
    ctx.fillRect(-4, -20, 8, 7);
    ctx.fillStyle = COLORS.fire;
    ctx.beginPath();
    ctx.arc(0, -22, 4 + Math.sin(time * 20) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Scrap: a hex bolt.
    ctx.rotate(time * 3 + pickup.bob);
    ctx.fillStyle = '#d8b04a';
    ctx.beginPath();
    for (let corner = 0; corner < 6; corner += 1) {
      const a = (corner / 6) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
    }
    ctx.fill();
    ctx.fillStyle = '#6a4a1a';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Bullets as short tracers. */
export function drawBullets(ctx, bullets) {
  ctx.strokeStyle = '#fff1b0';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const bullet of bullets) {
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - bullet.vx * 0.02, bullet.y - bullet.vy * 0.02);
    ctx.stroke();
  }
}

/** Molotovs tumbling through the air. */
export function drawMolotovs(ctx, bottles, time) {
  for (const bottle of bottles) {
    ctx.save();
    ctx.translate(bottle.x, bottle.y);
    ctx.rotate(bottle.spin);
    ctx.fillStyle = '#4a7a3a';
    ctx.fillRect(-5, -10, 10, 20);
    ctx.fillStyle = COLORS.fire;
    ctx.beginPath();
    ctx.arc(0, -14, 5 + Math.sin(time * 30), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Strips of burning fuel on the road. */
export function drawFires(ctx, fires, time) {
  for (const fire of fires) {
    const strength = Math.min(1, fire.life / 0.6);
    for (let tongue = 0; tongue < fire.w / 18; tongue += 1) {
      const fx = fire.x + tongue * 18 + 9;
      const height = (30 + Math.sin(time * 14 + tongue * 1.3) * 14 + (tongue % 3) * 8) * strength;
      const flame = ctx.createLinearGradient(fx, STREET.groundY, fx, STREET.groundY - height);
      flame.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
      flame.addColorStop(0.5, 'rgba(255, 120, 30, 0.8)');
      flame.addColorStop(1, 'rgba(180, 30, 10, 0)');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(fx - 12, STREET.groundY + 2);
      ctx.quadraticCurveTo(fx - 6, STREET.groundY - height * 0.6, fx, STREET.groundY - height);
      ctx.quadraticCurveTo(fx + 6, STREET.groundY - height * 0.6, fx + 12, STREET.groundY + 2);
      ctx.fill();
    }
  }
}

/** The horde itself, a churning mass of the dead at the left edge that creeps on screen as it closes. */
export function drawHorde(ctx, horde, time) {
  const closeness = 1 - horde / 100;
  const front = -160 + closeness * 300;
  if (front < -150) return;
  for (let index = 0; index < 14; index += 1) {
    const depth = index % 3;
    const x = front - index * 22 - depth * 10 + Math.sin(time * 3 + index) * 8;
    const y = STREET.groundY + 4 + depth * 6;
    const height = 80 + ((index * 37) % 30);
    ctx.fillStyle = depth === 0 ? '#1c2418' : depth === 1 ? '#161c13' : '#10140e';
    ctx.beginPath();
    ctx.roundRect(x - 16, y - height, 32, height, 10);
    ctx.fill();
    limb(ctx, x + 6, y - height + 20, x + 40 + Math.sin(time * 4 + index) * 10, y - height + 14, 7, ctx.fillStyle);
    ctx.fillStyle = '#ff3b2a';
    ctx.fillRect(x + 2, y - height + 8, 4, 4);
    ctx.fillRect(x + 9, y - height + 8, 4, 4);
  }
}
