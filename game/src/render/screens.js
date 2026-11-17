// The full screens over the street: the title, the pause card, the safe house where a perk is
// chosen, and the screen when the horde catches the survivor.
import { BOSS, CAMPAIGN, COLORS, VIEW, ZONES } from '../config.js';
import { glow } from './lighting.js';
import { drawChopper, drawRunner } from './sprites.js';
import { perkById } from '../perks.js';
import { metresRun } from '../world.js';
import { label, panel } from './hud.js';

/** Dim the scene behind a screen. */
function veil(ctx, alpha) {
  ctx.fillStyle = `rgba(8, 3, 5, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

/** The title's key art: the survivor sprinting out of the dark, the horde's eyes behind, the chopper's light ahead. */
function drawKeyArt(ctx, time) {
  drawChopper(ctx, 1060, 120 + Math.sin(time * 1.5) * 6, time, 0.75);
  // The horde: towering silhouettes, eyes burning.
  for (let index = 0; index < 9; index += 1) {
    const depth = index % 3;
    const x = 40 + index * 34 + Math.sin(time * 2 + index) * 6;
    const height = 230 + ((index * 53) % 70) - depth * 30;
    const feet = 640 + depth * 10;
    ctx.fillStyle = ['#140c10', '#1c1216', '#0c0809'][depth];
    ctx.beginPath();
    ctx.roundRect(x - 26, feet - height, 52, height, 18);
    ctx.fill();
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 10, feet - height + 50);
    ctx.lineTo(x + 80 + Math.sin(time * 3 + index) * 14, feet - height + 40);
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x + 8, feet - height + 22, 26, '255, 50, 30', 0.9);
    ctx.restore();
    ctx.fillStyle = '#ff5a3a';
    ctx.fillRect(x, feet - height + 18, 6, 6);
    ctx.fillRect(x + 12, feet - height + 18, 6, 6);
  }
  // The survivor, huge in the foreground, gun back toward the dead.
  const hero = { x: 0, y: 0, vy: 0, grounded: true, slide: 0, invulnerable: 0, stride: time * 9 };
  ctx.save();
  ctx.translate(560, 640);
  ctx.scale(3, 3);
  ctx.globalCompositeOperation = 'source-over';
  drawRunner(ctx, hero, { x: 120, y: -60 }, Math.sin(time * 8) > 0.6 ? 0.05 : 0, time);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 620, 480, 260, '120, 170, 255', 0.25);
  ctx.restore();
}

/** The title: key art, the name, the hook, the controls, and the prompt to run. */
export function drawTitle(ctx, time, best) {
  veil(ctx, 0.35);
  drawKeyArt(ctx, time);
  const pulse = 1 + Math.sin(time * 3) * 0.02;
  ctx.save();
  ctx.translate(VIEW.width / 2 + 120, 110);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = 'rgba(255, 120, 40, 0.9)';
  ctx.shadowBlur = 30;
  label(ctx, 'LAST MILE', 0, 0, 112, COLORS.ui, 'center');
  ctx.restore();
  label(ctx, 'The city fell. The last chopper leaves in 5 km. The dead are right behind you.', VIEW.width / 2 + 120, 186, 22, COLORS.uiText, 'center');
  const features = ['5 ZONES', '5 BOSSES', 'RESCUE SURVIVORS', '11 PERKS', 'ENDLESS MODE'];
  let x = VIEW.width / 2 + 120 - 330;
  for (const feature of features) {
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    const w = ctx.measureText(feature).width + 20;
    panel(ctx, x, 214, w, 30, 8);
    label(ctx, feature, x + w / 2, 230, 15, COLORS.ui, 'center');
    x += w + 10;
  }
  panel(ctx, 820, 300, 430, 230, 14);
  const rows = [
    ['SPACE / W', 'jump, again to double jump'],
    ['S / DOWN', 'slide under wreckage'],
    ['MOUSE + CLICK', 'aim and shoot'],
    ['E / RIGHT CLICK', 'throw a molotov'],
    ['LAND ON A HEAD', 'stomp a zombie'],
    ['P  ·  M  ·  R', 'pause · sound · restart'],
  ];
  rows.forEach(([key, action], index) => {
    label(ctx, key, 842, 324 + index * 35, 16, COLORS.ui);
    label(ctx, action, 1000, 324 + index * 35, 16, COLORS.uiText, 'left', 'normal');
  });
  if (Math.floor(time * 2) % 2 === 0) label(ctx, 'CLICK OR PRESS ENTER TO RUN', 1035, 575, 26, COLORS.ui, 'center');
  if (best > 0) label(ctx, `Best run: ${best}`, 1035, 612, 18, COLORS.uiDim, 'center');
}

/** The pause card. */
export function drawPause(ctx) {
  veil(ctx, 0.6);
  label(ctx, 'PAUSED', VIEW.width / 2, VIEW.height / 2 - 30, 64, COLORS.ui, 'center');
  label(ctx, 'P or ESC to keep running  -  M to mute  -  R to restart', VIEW.width / 2, VIEW.height / 2 + 30, 22, COLORS.uiText, 'center');
}

/** Where the three perk cards sit on the safe-house screen. */
export function perkCardRects() {
  const w = 320;
  const h = 250;
  const gap = 40;
  const left = (VIEW.width - (w * 3 + gap * 2)) / 2;
  return [0, 1, 2].map((index) => ({ x: left + index * (w + gap), y: 270, w, h }));
}

/** A perk's emblem, drawn simply. */
function drawEmblem(ctx, icon, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = COLORS.ui;
  ctx.strokeStyle = COLORS.ui;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.globalAlpha = 0.18;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
  ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyphs = { shoe: '>>', mag: '|||', shotgun: '=<', boot: 'V', jacket: '[+]', bag: '$', jump: '^^', fire: '*', dog: 'D', aim: '+', food: 'F' };
  ctx.fillText(glyphs[icon] ?? '?', 0, 2);
  ctx.restore();
}

/** The safe house: a breather and three perk cards to choose from. */
export function drawSafehouse(ctx, state, time, hovered) {
  veil(ctx, 0.62);
  label(ctx, 'SAFE HOUSE', VIEW.width / 2, 120, 64, COLORS.good, 'center');
  label(ctx, `${metresRun(state)} m survived  -  pick one perk before the horde breaks in`, VIEW.width / 2, 180, 24, COLORS.uiText, 'center');
  label(ctx, `Safe house bonus +${250 * state.safehouses}`, VIEW.width / 2, 222, 20, COLORS.ui, 'center');
  perkCardRects().forEach((rect, index) => {
    const id = state.offer[index];
    if (!id) return;
    const perk = perkById(id);
    const lift = hovered === index ? -8 : Math.sin(time * 2 + index) * 2;
    ctx.save();
    ctx.translate(0, lift);
    panel(ctx, rect.x, rect.y, rect.w, rect.h, 16);
    if (hovered === index) {
      ctx.strokeStyle = COLORS.good;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    label(ctx, `${index + 1}`, rect.x + 26, rect.y + 28, 22, COLORS.uiDim);
    drawEmblem(ctx, perk.icon, rect.x + rect.w / 2, rect.y + 70);
    label(ctx, perk.name.toUpperCase(), rect.x + rect.w / 2, rect.y + 130, 24, COLORS.ui, 'center');
    wrap(ctx, perk.text, rect.x + rect.w / 2, rect.y + 170, rect.w - 40, 20);
    const owned = state.perks[id] ?? 0;
    if (owned > 0) label(ctx, `owned x${owned}`, rect.x + rect.w / 2, rect.y + rect.h - 22, 16, COLORS.uiDim, 'center');
    ctx.restore();
  });
  label(ctx, 'Press 1, 2 or 3 - or click a card', VIEW.width / 2, 570, 22, COLORS.uiText, 'center');
  const next = state.zone % ZONES.length;
  const bossAt = state.zone * CAMPAIGN.zoneMetres + BOSS.at;
  label(ctx, `NEXT  ·  ZONE ${next + 1}: ${ZONES[next].name.toUpperCase()}  ·  ${BOSS.names[next % BOSS.names.length].toUpperCase()} waits at ${bossAt} m`, VIEW.width / 2, 622, 20, COLORS.danger, 'center');
}

/** Centre-wrapped text inside `width`. */
function wrap(ctx, text, x, y, width, size) {
  ctx.font = `normal ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  const words = text.split(' ');
  let line = '';
  let row = 0;
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > width && line) {
      label(ctx, line, x, y + row * (size + 6), size, COLORS.uiText, 'center', 'normal');
      line = word;
      row += 1;
    } else {
      line = trial;
    }
  }
  if (line) label(ctx, line, x, y + row * (size + 6), size, COLORS.uiText, 'center', 'normal');
}

/** The end of the run: caught by the horde, with the run's numbers and the way back in. */
export function drawCaught(ctx, state, time, best, newBest) {
  const fade = Math.min(1, state.caughtTime * 1.5);
  ctx.fillStyle = `rgba(60, 0, 0, ${0.55 * fade})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  veil(ctx, 0.35 * fade);
  label(ctx, 'THE HORDE CAUGHT YOU', VIEW.width / 2, 140, 66, COLORS.danger, 'center');
  panel(ctx, VIEW.width / 2 - 300, 200, 600, 280, 16);
  const rows = [
    ['Distance', `${metresRun(state)} of ${CAMPAIGN.evacMetres} m`],
    ['Zombies put down', `${state.kills}`],
    ['Bosses defeated', `${state.bossesDown}`],
    ['Survivors rescued', `${state.rescued}`],
    ['Best combo', `x${state.bestCombo}`],
  ];
  rows.forEach(([name, value], index) => {
    label(ctx, name, VIEW.width / 2 - 260, 236 + index * 38, 22, COLORS.uiText, 'left', 'normal');
    label(ctx, value, VIEW.width / 2 + 260, 236 + index * 38, 22, COLORS.ui, 'right');
  });
  label(ctx, `SCORE ${Math.floor(state.score)}`, VIEW.width / 2, 444, 36, COLORS.ui, 'center');
  if (newBest) label(ctx, 'NEW BEST RUN!', VIEW.width / 2, 520, 32, COLORS.good, 'center');
  else label(ctx, `Best ${best}`, VIEW.width / 2, 520, 24, COLORS.uiDim, 'center');
  if (Math.floor(time * 2) % 2 === 0) label(ctx, 'PRESS R OR CLICK TO RUN AGAIN', VIEW.width / 2, 590, 28, COLORS.uiText, 'center');
}

/** The win: the survivor and their convoy reach the chopper. The run's numbers, then endless mode or a new run. */
export function drawEvacuated(ctx, state, time, best, newBest) {
  const fade = Math.min(1, state.evacTime * 1.5);
  veil(ctx, 0.5 * fade);
  drawChopper(ctx, VIEW.width / 2 + 330, 150 + Math.sin(time * 2) * 6, time, 0.9);
  label(ctx, 'EVACUATED!', VIEW.width / 2 - 120, 110, 76, COLORS.good, 'center');
  label(ctx, 'You made the last chopper out of the city.', VIEW.width / 2 - 120, 168, 24, COLORS.uiText, 'center');
  panel(ctx, VIEW.width / 2 - 330, 200, 600, 300, 16);
  const rows = [
    ['Distance', `${metresRun(state)} m`],
    ['Zombies put down', `${state.kills}`],
    ['Bosses defeated', `${state.bossesDown} / 5`],
    ['Survivors rescued', `${state.rescued}  (${state.convoy.length} aboard with you)`],
    ['Evacuation bonus', `+${state.evacBonus ?? 0}`],
  ];
  rows.forEach(([name, value], index) => {
    label(ctx, name, VIEW.width / 2 - 300, 236 + index * 38, 22, COLORS.uiText, 'left', 'normal');
    label(ctx, value, VIEW.width / 2 + 240, 236 + index * 38, 22, COLORS.ui, 'right');
  });
  label(ctx, `SCORE ${Math.floor(state.score)}`, VIEW.width / 2 - 30, 452, 38, COLORS.ui, 'center');
  if (newBest) label(ctx, 'NEW BEST RUN!', VIEW.width / 2 - 30, 532, 30, COLORS.good, 'center');
  else label(ctx, `Best ${best}`, VIEW.width / 2 - 30, 532, 24, COLORS.uiDim, 'center');
  label(ctx, 'ENTER  keep running in endless mode     R  start a new run', VIEW.width / 2 - 30, 594, 24, COLORS.uiText, 'center');
}
