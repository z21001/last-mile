// The full screens over the street: the title, the pause card, the safe house where a perk is
// chosen, and the screen when the horde catches the survivor.
import { BOSS, CAMPAIGN, COLORS, VIEW, ZONES } from '../config.js';
import { drawChopper } from './sprites.js';
import { perkById } from '../perks.js';
import { metresRun } from '../world.js';
import { label, panel } from './hud.js';

/** Dim the scene behind a screen. */
function veil(ctx, alpha) {
  ctx.fillStyle = `rgba(8, 3, 5, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

/** The title: the name, a line of story, the controls, and the prompt to run. */
export function drawTitle(ctx, time, best) {
  veil(ctx, 0.45);
  const pulse = 1 + Math.sin(time * 3) * 0.02;
  ctx.save();
  ctx.translate(VIEW.width / 2, 150);
  ctx.scale(pulse, pulse);
  label(ctx, 'LAST MILE', 0, 0, 104, COLORS.ui, 'center');
  ctx.restore();
  label(ctx, 'The city fell. The last chopper leaves from the airfield, 5 km away. Run.', VIEW.width / 2, 230, 24, COLORS.uiText, 'center');
  panel(ctx, VIEW.width / 2 - 330, 272, 660, 214, 14);
  const rows = [
    ['SPACE / W', 'Jump - press again in mid-air to double jump'],
    ['S / DOWN', 'Slide under wreckage - dive when airborne'],
    ['MOUSE + CLICK', 'Aim and shoot the dead'],
    ['E / RIGHT CLICK', 'Throw a molotov'],
    ['LAND ON A HEAD', 'Stomp a zombie for bonus points'],
  ];
  rows.forEach(([key, action], index) => {
    label(ctx, key, VIEW.width / 2 - 300, 306 + index * 38, 19, COLORS.ui);
    label(ctx, action, VIEW.width / 2 - 110, 306 + index * 38, 19, COLORS.uiText, 'left', 'normal');
  });
  if (Math.floor(time * 2) % 2 === 0) label(ctx, 'CLICK OR PRESS ENTER TO RUN', VIEW.width / 2, 530, 30, COLORS.ui, 'center');
  if (best > 0) label(ctx, `Best run: ${best}`, VIEW.width / 2, 572, 20, COLORS.uiDim, 'center');
  label(ctx, '5 zones  ·  a boss at the end of each  ·  rescue survivors to fight beside you  ·  safe-house perks', VIEW.width / 2, 612, 18, COLORS.uiText, 'center', 'normal');
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
