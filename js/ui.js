"use strict";

function msg(text, cls) {
const log = $('msglog');
if (log.children.length > 6) log.firstChild.remove();
const d = document.createElement('div');
d.className = 'msg ' + (cls || '');
d.textContent = text;
log.appendChild(d);
setTimeout(() => { d.remove(); }, 4800);
}

function addText(x, y, str, color) { G.texts.push({ x: x, y: y, str: str, color: color || '#f5e9c8', t: 0 }); }

function burst(x, y, n, color, spd, life, grav) {
spd = spd || 60; life = life || .6; grav = (grav === undefined) ? 120 : grav;
for (let i = 0; i < n; i++) {
if (G.parts.length >= MAX_PARTS) G.parts.shift();
const a = rand(TAU), v = rand(.3, 1) * spd;
G.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * .4, t: 0, max: rand(life * .6, life), color: color, size: rand(2, 4.5), grav: grav });
}
}

function flashBtn(id) { const b = $(id); b.classList.remove('deny'); void b.offsetWidth; b.classList.add('deny'); }
function aimAt(t) { mouse.x = t.x - G.cam.x; mouse.y = t.y - G.cam.y; if (isTouch) G.player.face = Math.atan2(t.y - G.player.y, t.x - G.player.x); }

function touchAttack() {
if (state !== 'play' || paused || mapVisible) return;
const t = findNearestEnemy();
if (!t) { flashBtn('tAttack'); return; }
cancelJob(); aimAt(t); doSwing(t);
}

function touchTake() {
if (state !== 'play' || paused || mapVisible) return;
const w = findNearestWork();
if (w) { aimAt(w); onClickEntity(w); return; }
const t = findNearestInteract();
if (t) { aimAt(t); onClickEntity(t); return; }
flashBtn('tTake');
}

function setTakeBtn(icon, label) {
if (G._takeIco === icon && G._takeLab === label) return;
G._takeIco = icon; G._takeLab = label;
const b = $('tTake');
b.querySelector('.tico').textContent = icon;
b.querySelector('.tlab').textContent = label;
}

function toggleCraft() {
if (mapVisible) return;
const craftEl = $('craft');
craftEl.classList.toggle('closed');
const open = !craftEl.classList.contains('closed');
G.craftWasOpen = open;
if (isTouch) $('touchBtns').style.visibility = open ? 'hidden' : 'visible';
}

function togglePause() {
if (state !== 'play' || mapVisible) return;
paused = !paused;
$('pauseScreen').classList.toggle('hidden', !paused);
}

// === MAP ===
function markExplored(x, y, radius) {
if (!G || !G.explored) return;
radius = radius || 300;
const cx0 = Math.floor((x - radius) / MAP_CHUNK_SIZE), cx1 = Math.floor((x + radius) / MAP_CHUNK_SIZE);
const cy0 = Math.floor((y - radius) / MAP_CHUNK_SIZE), cy1 = Math.floor((y + radius) / MAP_CHUNK_SIZE);
let changed = false;
for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
const k = cx + ',' + cy;
if (!G.explored[k]) { G.explored[k] = true; changed = true; }
}
if (changed) { mapDirty = true; updateMapPct(); }
}

function updateMapPct() {
if (!G || !G.explored) return;
const step = 5;
let total = 0, explored = 0;
for (let cx = 0; cx <= Math.floor(W / MAP_CHUNK_SIZE); cx += step) for (let cy = 0; cy <= Math.floor(H / MAP_CHUNK_SIZE); cy += step) {
total++;
if (G.explored[cx + ',' + cy]) explored++;
}
mapPct = total > 0 ? Math.round(explored / total * 100) : 0;
document.getElementById('mapPct').textContent = mapPct + '%';
}

function isExplored(x, y) {
if (!G || !G.explored) return false;
const cx = Math.floor(x / MAP_CHUNK_SIZE), cy = Math.floor(y / MAP_CHUNK_SIZE);
return !!G.explored[cx + ',' + cy];
}

function drawMap() {
if (!G) return;
const canvas = document.getElementById('mapCanvas');
const container = document.getElementById('mapCanvasWrap');
const rect = container.getBoundingClientRect();
const w = rect.width || container.clientWidth || 600, h = rect.height || container.clientHeight || 600;
const dprMap = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = w * dprMap; canvas.height = h * dprMap;
canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
const c = canvas.getContext('2d');
c.scale(dprMap, dprMap);
c.fillStyle = '#1a1610'; c.fillRect(0, 0, w, h);
const margin = 16, scaleX = (w - margin * 2) / W, scaleY = (h - margin * 2) / H, scale = Math.min(scaleX, scaleY);
const offsetX = (w - W * scale) / 2, offsetY = (h - H * scale) / 2;
const chunkSize = Math.max(1, MAP_CHUNK_SIZE);
for (let cx = 0; cx <= Math.floor(W / chunkSize); cx++) for (let cy = 0; cy <= Math.floor(H / chunkSize); cy++) {
const key = cx + ',' + cy;
if (!G.explored[key]) continue;
const wx = cx * chunkSize + chunkSize / 2, wy = cy * chunkSize + chunkSize / 2;
const px = offsetX + wx * scale, py = offsetY + wy * scale;
const sz = Math.max(1, chunkSize * scale);
c.fillStyle = getBiomeColor(wx, wy);
c.fillRect(px - sz / 2, py - sz / 2, sz, sz);
}
if (G.roads) for (let ri = 0; ri < G.roads.length; ri++) {
const rd = G.roads[ri];
const midX = (rd.x1 + rd.x2) / 2, midY = (rd.y1 + rd.y2) / 2;
const ck = Math.floor(midX / chunkSize) + ',' + Math.floor(midY / chunkSize);
if (!G.explored[ck]) continue;
c.strokeStyle = 'rgba(180,170,140,0.5)';
c.lineWidth = Math.max(1, rd.w * scale * 0.8);
c.lineCap = 'round';
c.beginPath();
c.moveTo(offsetX + rd.x1 * scale, offsetY + rd.y1 * scale);
c.lineTo(offsetX + rd.x2 * scale, offsetY + rd.y2 * scale);
c.stroke();
}
if (G.ponds) for (let po = 0; po < G.ponds.length; po++) {
const pd = G.ponds[po];
const ck2 = Math.floor(pd.x / chunkSize) + ',' + Math.floor(pd.y / chunkSize);
if (!G.explored[ck2]) continue;
const ppX = offsetX + pd.x * scale, ppY = offsetY + pd.y * scale;
c.fillStyle = 'rgba(58,138,181,0.5)';
c.beginPath(); c.ellipse(ppX, ppY, pd.r * scale * 0.8, pd.r * scale * 0.5, 0, 0, TAU); c.fill();
}
const landmarks = [];
if (G.king && isExplored(G.king.x, G.king.y)) landmarks.push({ x: G.king.x, y: G.king.y, label: '👑', color: '#e8c23c', size: 14 });
for (let ei = 0; ei < G.ents.length; ei++) {
const e = G.ents[ei];
if (e.dead || !isExplored(e.x, e.y)) continue;
if (e.type === 'campfire' && e.lit) landmarks.push({ x: e.x, y: e.y, label: '🔥', color: '#ff6a1e', size: 10 });
else if (e.type === 'science') landmarks.push({ x: e.x, y: e.y, label: '⚗️', color: '#7ec9a8', size: 10 });
else if (e.type === 'pighouse') landmarks.push({ x: e.x, y: e.y, label: '🏠', color: '#8a6a44', size: 9 });
else if (e.type === 'chess_horse') landmarks.push({ x: e.x, y: e.y, label: '♞', color: '#a0a0b0', size: 14 });
else if (e.type === 'chest') landmarks.push({ x: e.x, y: e.y, label: '📦', color: '#c9a86a', size: 10 });
else if (e.type === 'icebox') landmarks.push({ x: e.x, y: e.y, label: '❄️', color: '#8ab5c9', size: 10 });
}
for (let li = 0; li < landmarks.length; li++) {
const lm = landmarks[li];
const lx = offsetX + lm.x * scale, ly = offsetY + lm.y * scale;
c.font = (lm.size || 12) + 'px sans-serif';
c.textAlign = 'center'; c.textBaseline = 'middle';
c.fillStyle = lm.color || '#fff';
c.fillText(lm.label, lx, ly);
}
const p = G.player;
const ppX = offsetX + p.x * scale, ppY = offsetY + p.y * scale;
c.beginPath(); c.arc(ppX, ppY, 6, 0, TAU);
c.fillStyle = '#ff6a1e'; c.fill();
c.save();
c.translate(ppX, ppY); c.rotate(p.face);
c.fillStyle = '#ffd9a0';
c.beginPath(); c.moveTo(10, 0); c.lineTo(-4, -5); c.lineTo(-4, 5); c.closePath(); c.fill();
c.restore();
document.getElementById('mapPct').textContent = mapPct + '%';
mapDirty = false;
}

function toggleMap() {
if (state !== 'play') return;
mapVisible = !mapVisible;
const overlay = document.getElementById('mapOverlay');
if (mapVisible) {
overlay.classList.add('open');
mapDirty = true; drawMap();
msg('🗺️ Карта открыта.', 'hint');
paused = true;
$('pauseScreen').classList.add('hidden');
} else {
overlay.classList.remove('open');
paused = false;
}
}

function startGame() {
resumeAudio();
newGame();
state = 'play'; paused = false; mapVisible = false;
document.getElementById('mapOverlay').classList.remove('open');
$('startScreen').classList.add('gone');
setTimeout(() => { $('startScreen').classList.add('hidden'); }, 750);
$('hud').classList.remove('hidden');
$('deathScreen').classList.add('hidden');
if (isTouch) {
$('touchUI').classList.remove('hidden');
$('touchBtns').classList.remove('hidden');
$('touchBtns').style.visibility = 'visible';
msg('Джойстик слева — движение. Тап или кнопки справа — действие', 'hint');
} else {
msg('Собирай траву и хворост — без них не скрафтить и топор', 'hint');
}
msg('🗺️ Нажми M или кнопку карты — откроется карта', 'hint');
msg('♞ В шахматных биомах — механические кони. Они дропают шестерни.', 'hint');
msg('🍖 Еда портится. В холодильнике (❄️) хранится в 4 раза дольше.', 'hint');
sfx.craft();
fitHotbar();
updateEquipUI();
updateMapPct();
}

function fitHotbar() {
if (!G) return;
const hb = $('hotbar'), wrap = $('hotbarWrap');
if (!hb || !hb.children.length) return;
const need = hb.scrollWidth + 20;
const avail = vw - (isTouch ? 210 : 60);
const sc = Math.min(1, avail / need);
wrap.style.transform = 'translateX(-50%) scale(' + sc + ')';
}

function resize() {
const newDpr = Math.max(1, Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));
const newGres = 0.5 * Math.min(newDpr, 1.5);
if (newGres !== gres) { gres = newGres; clearGround(); }
dpr = newDpr;
vw = window.innerWidth; vh = window.innerHeight;
cv.width = vw * dpr; cv.height = vh * dpr;
cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
lightCv.width = vw; lightCv.height = vh;
fitHotbar();
if (mapVisible) setTimeout(drawMap, 50);
}

// Touch UI setup
if (isTouch) {
$('controls').innerHTML = '<div class="crow2"><kbd>Джойстик</kbd>движение (слева)</div><div class="crow2"><kbd>Тап</kbd>действие</div><div class="crow2"><kbd>⚔</kbd>атаковать · <kbd>🤲</kbd>взять/рубить</div><div class="crow2"><kbd>🍖/🔥</kbd>есть и жарить</div><div class="crow2"><kbd>🎣</kbd>рыбачить · <kbd>🔱</kbd>дёрн</div><div class="crow2"><kbd>⚒</kbd>крафт · <kbd>Ⅱ</kbd>пауза · <kbd>🗺️</kbd>карта</div>';
$('craftHint').textContent = '— кнопка ⚒';
}