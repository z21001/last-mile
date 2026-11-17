// The heads-up display: distance and score, the horde meter (how close the dead are), ammo and
// molotovs, the combo, the road to the next safe house, the zone banner and the crosshair.
import { COLORS, HORDE, SAFEHOUSE, VIEW } from '../config.js';
import { comboMultiplier, currentZone, metresRun } from '../world.js';

/** A rounded panel behind HUD text. */
export function panel(ctx, x, y, w, h, radius = 10) {
  ctx.fillStyle = COLORS.panel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Text with a dark outline, readable over any background. */
export function label(ctx, text, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.font = `${weight} ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 6);
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** The horde meter: a skull at one end, the survivor at the other, and the gap between them. */
function drawHordeMeter(ctx, state, time) {
  const x = VIEW.width / 2 - 220;
  const y = 22;
  const w = 440;
  panel(ctx, x - 14, y - 10, w + 28, 58);
  label(ctx, 'HORDE', x + w / 2, y + 2, 14, COLORS.uiDim, 'center');
  const fill = state.horde / HORDE.max;
  const danger = fill < 0.3;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, y + 14, w, 18);
  const gradient = ctx.createLinearGradient(x, 0, x + w, 0);
  gradient.addColorStop(0, '#ff3b2a');
  gradient.addColorStop(0.5, '#ffb347');
  gradient.addColorStop(1, '#8be07f');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y + 14, w * fill, 18);
  // Skull of the horde, chasing.
  const pulse = danger ? 1 + Math.sin(time * 14) * 0.15 : 1;
  ctx.save();
  ctx.translate(x - 2, y + 23);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = danger ? '#ff3b2a' : '#e8dcc8';
  ctx.beginPath();
  ctx.arc(0, -2, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-6, 5, 12, 6);
  ctx.fillStyle = '#111';
  ctx.fillRect(-6, -5, 4, 4);
  ctx.fillRect(2, -5, 4, 4);
  ctx.restore();
  // The survivor marker at the end of the gap.
  ctx.fillStyle = COLORS.jacket;
  ctx.beginPath();
  ctx.arc(x + w * fill, y + 23, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (danger) label(ctx, 'THEY ARE RIGHT BEHIND YOU', x + w / 2, y + 66, 18, COLORS.danger, 'center');
}

/** Distance, score and the combo, top left. */
function drawRunStats(ctx, state) {
  panel(ctx, 16, 12, 236, 92);
  label(ctx, `${metresRun(state)} m`, 32, 40, 30, COLORS.uiText);
  label(ctx, `SCORE ${Math.floor(state.score)}`, 32, 78, 20, COLORS.ui);
  if (state.combo >= 2) {
    const multiplier = comboMultiplier(state).toFixed(2).replace(/\.?0+$/, '');
    label(ctx, `COMBO x${multiplier}`, 32, 122, 22 + Math.min(state.combo, 12), state.combo >= 6 ? COLORS.fire : COLORS.ui);
    ctx.fillStyle = COLORS.ui;
    ctx.fillRect(32, 140, 120 * (state.comboTimer / 2), 4);
  }
}

/** Ammo and molotovs, top right. */
function drawLoadout(ctx, state) {
  const x = VIEW.width - 252;
  panel(ctx, x, 12, 236, 92);
  label(ctx, 'AMMO', x + 16, 34, 14, COLORS.uiDim);
  label(ctx, `${state.ammo}/${state.stats.maxAmmo}`, x + 220, 34, 20, state.ammo === 0 ? COLORS.danger : COLORS.uiText, 'right');
  const shown = Math.min(state.stats.maxAmmo, 24);
  for (let index = 0; index < shown; index += 1) {
    ctx.fillStyle = index < state.ammo ? '#e0c060' : 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 16 + index * 8.4, 48, 5, 14);
  }
  label(ctx, 'MOLOTOV', x + 16, 82, 14, COLORS.uiDim);
  for (let index = 0; index < state.stats.maxMolotovs; index += 1) {
    ctx.fillStyle = index < state.molotovs ? COLORS.fire : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(x + 110 + index * 24, 72, 14, 20, 3);
    ctx.fill();
  }
  if (state.ammo === 0) label(ctx, 'OUT OF AMMO - FIND A CRATE', x + 118, 122, 16, COLORS.danger, 'center');
}

/** The road to the next safe house, along the bottom. */
function drawSafehouseRoad(ctx, state) {
  const metres = metresRun(state);
  const from = state.nextSafehouse - SAFEHOUSE.every;
  const progress = Math.max(0, Math.min(1, (metres - from) / SAFEHOUSE.every));
  const x = 340;
  const y = VIEW.height - 34;
  const w = VIEW.width - 680;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = COLORS.good;
  ctx.fillRect(x, y, w * progress, 8);
  label(ctx, `SAFE HOUSE in ${Math.max(0, state.nextSafehouse - metres)} m`, x + w / 2, y - 14, 16, COLORS.uiText, 'center');
  ctx.fillStyle = COLORS.good;
  ctx.beginPath();
  ctx.moveTo(x + w + 6, y + 10);
  ctx.lineTo(x + w + 6, y - 6);
  ctx.lineTo(x + w + 16, y - 14);
  ctx.lineTo(x + w + 26, y - 6);
  ctx.lineTo(x + w + 26, y + 10);
  ctx.fill();
}

/** The crosshair where the mouse points. */
function drawCrosshair(ctx, aim) {
  ctx.strokeStyle = 'rgba(255, 241, 176, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(aim.x, aim.y, 12, 0, Math.PI * 2);
  ctx.moveTo(aim.x - 18, aim.y);
  ctx.lineTo(aim.x - 6, aim.y);
  ctx.moveTo(aim.x + 6, aim.y);
  ctx.lineTo(aim.x + 18, aim.y);
  ctx.moveTo(aim.x, aim.y - 18);
  ctx.lineTo(aim.x, aim.y - 6);
  ctx.moveTo(aim.x, aim.y + 6);
  ctx.lineTo(aim.x, aim.y + 18);
  ctx.stroke();
}

/** The whole HUD over a run in progress. */
export function drawHud(ctx, state, time, best) {
  drawRunStats(ctx, state);
  drawLoadout(ctx, state);
  drawHordeMeter(ctx, state, time);
  drawSafehouseRoad(ctx, state);
  label(ctx, `BEST ${best}`, 32, VIEW.height - 30, 16, COLORS.uiDim);
  if (state.zoneBanner > 0) {
    const alpha = Math.min(1, state.zoneBanner);
    ctx.globalAlpha = alpha;
    label(ctx, currentZone(state).name.toUpperCase(), VIEW.width / 2, 200, 46, COLORS.ui, 'center');
    label(ctx, `Zone ${state.zone + 1}`, VIEW.width / 2, 244, 20, COLORS.uiText, 'center');
    ctx.globalAlpha = 1;
  }
  drawCrosshair(ctx, state.aim);
}
