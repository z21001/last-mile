// The heads-up display. It tells the player everything at a glance: the goal and how to lose, the
// zone and the road to the evac chopper, distance, score and combo, the horde meter, the boss's
// health, ammo and molotovs, the zombies on the street with how to beat each, the perks taken, the
// convoy of rescued survivors, and the controls.
import { CAMPAIGN, COLORS, HORDE, SURVIVOR, VIEW, ZONES } from '../config.js';
import { perkById } from '../perks.js';
import { ZOMBIE_KINDS, zombieKindsAt } from '../zombies.js';
import { comboMultiplier, currentZone, evacProgress, metresRun } from '../world.js';

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

/** A small rounded tag: a coloured word on a dark chip. */
function chip(ctx, text, x, y, color, size = 13) {
  ctx.font = `bold ${size}px "Trebuchet MS", sans-serif`;
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y - size / 2 - 4, w, size + 8, 5);
  ctx.fill();
  ctx.fillStyle = '#120a0a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 7, y + 1);
  return w;
}

/** Zone, distance, score, best and the combo, top left. */
function drawRunStats(ctx, state, best) {
  panel(ctx, 16, 12, 300, 112);
  const zoneNumber = Math.min(state.zone, ZONES.length - 1) + 1;
  label(ctx, state.endless ? `ENDLESS  ·  ${currentZone(state).name.toUpperCase()}` : `ZONE ${zoneNumber}/${ZONES.length}  ·  ${currentZone(state).name.toUpperCase()}`, 30, 32, 14, COLORS.uiDim);
  label(ctx, `${metresRun(state)} m`, 30, 64, 32, COLORS.uiText);
  label(ctx, `SCORE ${Math.floor(state.score)}`, 30, 100, 20, COLORS.ui);
  label(ctx, `BEST ${best}`, 300, 100, 14, COLORS.uiDim, 'right');
  if (state.combo >= 2) {
    label(ctx, `COMBO x${comboMultiplier(state).toFixed(2).replace(/\.?0+$/, '')}`, 300, 64, 18 + Math.min(state.combo, 10), state.combo >= 6 ? COLORS.fire : COLORS.ui, 'right');
  }
}

/** The horde meter with the goal beneath it, top centre. */
function drawHordeMeter(ctx, state, time) {
  const x = VIEW.width / 2 - 230;
  const y = 22;
  const w = 460;
  panel(ctx, x - 16, y - 10, w + 32, 92);
  label(ctx, 'HORDE DISTANCE', x + w / 2, y + 2, 13, COLORS.uiDim, 'center');
  const fill = state.horde / HORDE.max;
  const danger = fill < 0.3;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, y + 14, w, 16);
  const gradient = ctx.createLinearGradient(x, 0, x + w, 0);
  gradient.addColorStop(0, '#ff3b2a');
  gradient.addColorStop(0.5, '#ffb347');
  gradient.addColorStop(1, '#8be07f');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y + 14, w * fill, 16);
  const pulse = danger ? 1 + Math.sin(time * 14) * 0.15 : 1;
  ctx.save();
  ctx.translate(x - 2, y + 22);
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
  ctx.fillStyle = COLORS.jacket;
  ctx.beginPath();
  ctx.arc(x + w * fill, y + 22, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  const winW = chip(ctx, 'WIN', x, y + 48, COLORS.good);
  label(ctx, state.endless ? 'endless: run as far as you can' : `reach the evac chopper at ${CAMPAIGN.evacMetres} m`, x + winW + 8, y + 48, 14, COLORS.uiText, 'left', 'normal');
  const loseW = chip(ctx, 'LOSE', x + 300, y + 48, COLORS.danger);
  label(ctx, 'the horde catches you', x + 300 + loseW + 8, y + 48, 14, COLORS.uiText, 'left', 'normal');
  if (danger) label(ctx, 'THEY ARE RIGHT BEHIND YOU', x + w / 2, y + 100, 18, COLORS.danger, 'center');
}

/** The boss's name and health under the horde meter. */
function drawBossBar(ctx, state) {
  const boss = state.boss;
  if (!boss) return;
  const x = VIEW.width / 2 - 260;
  const y = 128;
  const w = 520;
  label(ctx, `BOSS  ${boss.name.toUpperCase()}`, x + w / 2, y, 22, '#ff6a4f', 'center');
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x - 3, y + 15, w + 6, 18);
  ctx.fillStyle = '#c0281c';
  ctx.fillRect(x, y + 18, w * Math.max(0, boss.hp) / boss.maxHp, 12);
  label(ctx, 'jump barrels  ·  slide under doors  ·  shoot its glowing heart', x + w / 2, y + 48, 14, COLORS.uiText, 'center', 'normal');
}

/** Ammo, molotovs and the convoy, top right. */
function drawLoadout(ctx, state) {
  const x = VIEW.width - 296;
  panel(ctx, x, 12, 280, 112);
  label(ctx, 'AMMO', x + 16, 32, 14, COLORS.uiDim);
  label(ctx, `${state.ammo}/${state.stats.maxAmmo}`, x + 264, 32, 18, state.ammo === 0 ? COLORS.danger : COLORS.uiText, 'right');
  const shown = Math.min(state.stats.maxAmmo, 28);
  for (let index = 0; index < shown; index += 1) {
    ctx.fillStyle = index < state.ammo ? '#e0c060' : 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 16 + index * 8.9, 44, 5, 13);
  }
  label(ctx, 'MOLOTOV', x + 16, 76, 14, COLORS.uiDim);
  for (let index = 0; index < state.stats.maxMolotovs; index += 1) {
    ctx.fillStyle = index < state.molotovs ? COLORS.fire : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(x + 100 + index * 22, 67, 13, 18, 3);
    ctx.fill();
  }
  label(ctx, 'CONVOY', x + 16, 104, 14, COLORS.uiDim);
  for (let index = 0; index < SURVIVOR.maxConvoy; index += 1) {
    const member = state.convoy[index];
    ctx.fillStyle = member ? SURVIVOR.colors[member.look] : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(x + 108 + index * 24, 100, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 102 + index * 24, 106, 12, 9);
  }
  label(ctx, `${state.rescued} saved`, x + 264, 104, 14, COLORS.good, 'right');
}

/** The zombies loose on this stretch of the city, with how many are down and how to beat each. */
function drawRoster(ctx, state) {
  const tips = { walker: 'shoot or stomp', crawler: 'jump it', sprinter: 'shoot it early', bloater: 'pop it from afar', brute: 'stomp needs boots' };
  const kinds = zombieKindsAt(metresRun(state));
  const x = 16;
  const y = 136;
  panel(ctx, x, y, 270, 30 + kinds.length * 24);
  label(ctx, 'ON THE STREET', x + 14, y + 16, 14, COLORS.ui);
  label(ctx, 'DOWN', x + 256, y + 16, 12, COLORS.uiDim, 'right');
  kinds.forEach((kind, index) => {
    const spec = ZOMBIE_KINDS[kind];
    const rowY = y + 40 + index * 24;
    ctx.fillStyle = spec.skin;
    ctx.beginPath();
    ctx.arc(x + 20, rowY, 6, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, spec.name, x + 34, rowY, 14, COLORS.uiText);
    label(ctx, tips[kind], x + 116, rowY, 12, COLORS.uiDim, 'left', 'normal');
    label(ctx, `${state.killsByKind[kind] ?? 0}`, x + 256, rowY, 14, COLORS.ui, 'right');
  });
}

/** The perks taken at safe houses, right side. */
function drawPerks(ctx, state) {
  const owned = Object.keys(state.perks);
  const x = VIEW.width - 236;
  const y = 136;
  panel(ctx, x, y, 220, 30 + Math.max(1, owned.length) * 22);
  label(ctx, 'PERKS', x + 14, y + 16, 14, COLORS.ui);
  if (owned.length === 0) label(ctx, 'first safe house at 1000 m', x + 14, y + 40, 12, COLORS.uiDim, 'left', 'normal');
  owned.forEach((id, index) => {
    const rowY = y + 40 + index * 22;
    label(ctx, perkById(id).name, x + 14, rowY, 14, COLORS.uiText);
    for (let pip = 0; pip < state.perks[id]; pip += 1) {
      ctx.fillStyle = COLORS.good;
      ctx.fillRect(x + 186 + pip * 9, rowY - 4, 6, 8);
    }
  });
}

/** The road to the evac chopper: five zones, a boss at the end of each, the chopper at the end. */
function drawEvacRoad(ctx, state) {
  const x = 330;
  const y = VIEW.height - 26;
  const w = VIEW.width - 660;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.roundRect(x - 10, y - 26, w + 60, 42, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = COLORS.good;
  ctx.fillRect(x, y, w * evacProgress(state), 8);
  for (let zone = 0; zone < ZONES.length; zone += 1) {
    const bossX = x + (w * (zone * CAMPAIGN.zoneMetres + 640)) / CAMPAIGN.evacMetres;
    ctx.fillStyle = zone < state.bossesDown ? '#5a5a5a' : '#ff4b3e';
    ctx.beginPath();
    ctx.arc(bossX, y + 4, 6, 0, Math.PI * 2);
    ctx.fill();
    if (zone > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x + (w * zone) / ZONES.length - 1, y - 4, 2, 16);
    }
  }
  label(ctx, state.endless ? 'ENDLESS MODE' : `EVAC CHOPPER in ${Math.max(0, CAMPAIGN.evacMetres - metresRun(state))} m`, x + w / 2, y - 13, 15, COLORS.uiText, 'center');
  // The chopper at the end of the road.
  ctx.fillStyle = COLORS.good;
  ctx.beginPath();
  ctx.ellipse(x + w + 24, y + 4, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + w + 8, y - 6, 32, 3);
}

/** The controls, as key chips along the bottom left and right. */
function drawControls(ctx) {
  const keys = [['SPACE', 'JUMP'], ['S', 'SLIDE'], ['CLICK', 'SHOOT']];
  const more = [['E', 'MOLOTOV'], ['P', 'PAUSE'], ['M', 'SOUND']];
  const row = (list, startX) => {
    let x = startX;
    for (const [key, action] of list) {
      const w = chip(ctx, key, x, VIEW.height - 22, '#e8dcc8', 12);
      label(ctx, action, x + w + 5, VIEW.height - 22, 12, COLORS.uiText);
      ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
      x += w + ctx.measureText(action).width + 16;
    }
  };
  row(keys, 16);
  row(more, VIEW.width - 262);
}

/** The crosshair where the mouse points. */
function drawCrosshair(ctx, aim) {
  ctx.strokeStyle = 'rgba(255, 241, 176, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(aim.x, aim.y, 12, 0, Math.PI * 2);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    ctx.moveTo(aim.x + dx * 6, aim.y + dy * 6);
    ctx.lineTo(aim.x + dx * 18, aim.y + dy * 18);
  }
  ctx.stroke();
}

/** The whole HUD over a run in progress. */
export function drawHud(ctx, state, time, best) {
  drawRunStats(ctx, state, best);
  drawLoadout(ctx, state);
  drawHordeMeter(ctx, state, time);
  drawRoster(ctx, state);
  drawPerks(ctx, state);
  drawBossBar(ctx, state);
  drawEvacRoad(ctx, state);
  drawControls(ctx);
  if (state.zoneBanner > 0 && !state.boss) {
    ctx.globalAlpha = Math.min(1, state.zoneBanner);
    label(ctx, currentZone(state).name.toUpperCase(), VIEW.width / 2, 210, 46, COLORS.ui, 'center');
    label(ctx, state.endless ? 'Endless mode' : `Zone ${Math.min(state.zone, ZONES.length - 1) + 1} of ${ZONES.length}`, VIEW.width / 2, 254, 20, COLORS.uiText, 'center');
    ctx.globalAlpha = 1;
  }
  drawCrosshair(ctx, state.aim);
}
