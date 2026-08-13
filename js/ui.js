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
function touchIgnite() {
if (state !== 'play' || paused || mapVisible) return;
const held = getActiveItem();
if (!held || held.id !== 'torch') { flashBtn('tIgnite'); msg('Нужен факел в руках', 'hint'); return; }
const tree = findNearestInRadius(G.player.x, G.player.y, REACH + 50, e => e.type === 'tree' && !e.dead && !e.ignited);
if (tree) { aimAt(tree); onClickEntity(tree); return; }
flashBtn('tIgnite'); msg('Нет цели для поджога рядом', 'hint');
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
c.strokeStyle = (rd.kind === 'dirt') ? 'rgba(150,112,72,0.55)' : 'rgba(180,170,140,0.5)';
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
function updateHUD() {
if (!G || !G.player) return;
const p = G.player;
drawMeter($('mHp'), p.hp / 100, p.hp < 30 ? '#d33b2a' : '#c0392b', 'hp');
drawMeter($('mHun'), p.hunger / 100, '#d99a2e', 'hun');
drawMeter($('mSan'), p.san / 100, '#7a8ec0', 'san');
drawClock();
$('dayLabel').textContent = 'День ' + G.day;
const sl = $('seasonLabel');
sl.textContent = G.season === 'winter' ? '❄ Зима' : '🍂 Осень';
sl.style.color = G.season === 'winter' ? '#3c648c' : '#7a3416';
$('phaseLabel').textContent = G.phase === 'day' ? 'День' : G.phase === 'dusk' ? 'Закат' : 'Ночь';
if (onRoad(p.x, p.y)) $('phaseLabel').textContent += ' · дорога +30%';
$('frost').style.opacity = G.season === 'winter' ? String(clamp((p.cold - .25) / .75, 0, 1) * .95) : 0;
$('hurt').style.opacity = String(G.hurtFlash * .9);
$('madness').style.opacity = p.san < 30 ? String((30 - p.san) / 30 * .65 * (.7 + .3 * Math.sin(G.t * 2))) : 0;
const lw = $('lowWarning');
const hw = $('hungerWarning');
if (p.hp < 30) { lw.style.opacity = String(0.3 + 0.3 * Math.sin(G.t * 3)); lw.classList.add('active'); }
else { lw.style.opacity = '0'; lw.classList.remove('active'); }
if (p.hunger < 30) { hw.style.opacity = String(0.25 + 0.25 * Math.sin(G.t * 2.5)); hw.classList.add('active'); }
else { hw.style.opacity = '0'; hw.classList.remove('active'); }
if (isTouch && state === 'play' && !mapVisible) {
const nearFire2 = nearFire(p.x, p.y, 160);
$('tCook').style.display = (nearFire2 && !fishingActive) ? 'flex' : 'none';
// кнопка поджога дерева факелом
const heldTorch = getActiveItem();
const hasTorch = heldTorch && heldTorch.id === 'torch';
const nearTree = hasTorch ? findNearestInRadius(p.x, p.y, REACH + 50, e => e.type === 'tree' && !e.dead && !e.ignited) : null;
$('tIgnite').style.display = (hasTorch && nearTree) ? 'flex' : 'none';
$('tIgnite').classList.toggle('off', !(hasTorch && nearTree));
$('tAttack').classList.toggle('off', !G.nearEnemy);
const nearChest = findNearestInRadius(p.x, p.y, REACH + 50, e => (e.type === 'chest' || e.type === 'icebox') && !e.dead);
const hasItem = getHeld() !== null;
$('tChestStore').style.display = (nearChest && hasItem && !chestOpen) ? 'flex' : 'none';
$('tChestStore').classList.toggle('off', !(nearChest && hasItem));
// кнопка ловли пчелы сачком
const held2 = getActiveItem();
const hasNet = held2 && held2.id === 'bugnet';
const nearBee = hasNet ? findNearestInRadius(p.x, p.y, REACH + 40, e => e.type === 'bee' && !e.dead && !e.aggro) : null;
if ($('tCatch')) {
$('tCatch').style.display = (hasNet && nearBee) ? 'flex' : 'none';
$('tCatch').classList.toggle('off', !(hasNet && nearBee));
}
// кнопка лечения — показываем если есть лечебные предметы
const heldHeal = held2 && ITEMS[held2.id] && (ITEMS[held2.id].heal || ITEMS[held2.id].healItem);
let hasHealItem = heldHeal;
if (!hasHealItem) {
for (let i = 0; i < 10; i++) {
const s = G.inv[i];
if (s && ITEMS[s.id] && (ITEMS[s.id].heal || ITEMS[s.id].healItem)) {
hasHealItem = true; break;
}
}
}
$('tHeal').style.display = hasHealItem ? 'flex' : 'none';
$('tHeal').classList.toggle('off', !hasHealItem);

const takeB = $('tTake');
const wpn = G.equip.hands;
const tool = wpn && ITEMS[wpn.id] && ITEMS[wpn.id].tool ? ITEMS[wpn.id].tool : null;
const heldTool = held2 && ITEMS[held2.id] && ITEMS[held2.id].tool ? ITEMS[held2.id].tool : null;
const activeTool = tool || heldTool;
const work = findNearestWork();
const interact = findNearestInteract();
if (activeTool && (activeTool.kind === 'axe' || activeTool.kind === 'pick' || activeTool.kind === 'pitchfork') && work) {
let icon = '🤲'; let label = 'взять';
if (activeTool.kind === 'axe') { icon = '🪓'; label = 'рубить'; }
else if (activeTool.kind === 'pick') { icon = '⛏️'; label = 'добывать'; }
else if (activeTool.kind === 'pitchfork') {
const hasTurf = getTurfId(Math.floor(p.x / TILE), Math.floor(p.y / TILE)) !== null;
icon = '🔱'; label = hasTurf ? 'собрать дёрн' : 'положить дёрн';
}
setTakeBtn(icon, label);
takeB.classList.remove('off');
} else if (interact) { setTakeBtn('🤲', 'взять'); takeB.classList.remove('off'); }
else { setTakeBtn('🤲', 'взять'); takeB.classList.add('off'); }
}
if (hotbarDirty) updateHotbar();
if (craftDirty) updateCraftUI();
if (equipDirty) updateEquipUI();
if (chestOpen) { updateChestUI(chestOpen); }
}
(function makeGrain() {
const c = document.createElement('canvas');
c.width = 140; c.height = 140;
const g = c.getContext('2d'), im = g.createImageData(140, 140);
for (let i = 0; i < im.data.length; i += 4) {
const v = Math.random() * 255;
im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
im.data[i + 3] = 255;
}
g.putImageData(im, 0, 0);
$('grain').style.backgroundImage = 'url(' + c.toDataURL() + ')';
})();

// === ПОЛНОЭКРАННЫЙ РЕЖИМ ===
function fsActive() {
return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
}
function toggleFullscreen() {
const el = document.documentElement, d = document;
if (!fsActive()) {
let pr = null;
if (el.requestFullscreen) pr = el.requestFullscreen();
else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
else if (el.msRequestFullscreen) el.msRequestFullscreen();
else { msg('Полноэкранный режим не поддерживается на этом устройстве', 'warning'); return; }
if (pr && pr.catch) pr.catch(function () { msg('Браузер заблокировал полноэкранный режим', 'warning'); });
} else {
if (d.exitFullscreen) d.exitFullscreen();
else if (d.webkitExitFullscreen) d.webkitExitFullscreen();
else if (d.mozCancelFullScreen) d.mozCancelFullScreen();
else if (d.msExitFullscreen) d.msExitFullscreen();
}
}
(function initFullBtn() {
const anchor = $('btnMute');
if (!anchor || !anchor.parentElement) return;
const b = document.createElement('button');
b.id = 'btnFull';
b.className = anchor.className;
b.textContent = '⛶';
b.title = 'Полноэкранный режим';
b.addEventListener('click', function (e) { e.stopPropagation(); resumeAudio(); toggleFullscreen(); });
anchor.parentElement.insertBefore(b, anchor.nextSibling);
const sync = function () { b.textContent = fsActive() ? '❐' : '⛶'; };
['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(function (ev) { document.addEventListener(ev, sync); });
})();

// === СИСТЕМНЫЕ КНОПКИ ПОД ШКАЛАМИ (звук · весь экран · пауза) ===
(function moveSysButtons() {
// Дублируем стили #topbtns button для нового контейнера, иначе кнопки
// теряют оформление (они были привязаны к родителю #topbtns).
if (!document.getElementById('sysBtnsStyle')) {
const sty = document.createElement('style');
sty.id = 'sysBtnsStyle';
sty.textContent =
'#sysBtnsBar button{' +
'width:44px;height:44px;' +
'font-family:Neucha;font-size:19px;' +
'cursor:pointer;color:#241b10;' +
'background:linear-gradient(160deg,#ddd0a4,#c3ad7f);' +
'border:2px solid #5c4a2e;' +
'border-radius:10px 14px 10px 16px;' +
'box-shadow:0 4px 0 #3c2f1c,0 6px 12px rgba(0,0,0,.5);' +
'transition:transform .12s;' +
'touch-action:manipulation;' +
'margin:0;padding:0;' +
'display:flex;align-items:center;justify-content:center;' +
'}' +
'#sysBtnsBar button:hover{transform:translateY(-3px) rotate(-3deg);}' +
'#sysBtnsBar button:active{transform:translateY(1px);}' +
'@media (pointer:coarse){#sysBtnsBar button{width:50px;height:50px;font-size:21px;}}';
document.head.appendChild(sty);
}

const meterEls = [$('mHp'), $('mHun'), $('mSan')].filter(Boolean);
if (!meterEls.length) return;

const bar = document.createElement('div');
bar.id = 'sysBtnsBar';
bar.style.cssText = 'position:fixed;display:flex;gap:8px;z-index:70;align-items:center;';
document.body.appendChild(bar);

// переносим кнопки (перенос DOM-узла сохраняет все их обработчики)
const ids = ['btnMute', 'btnFull', 'btnPause'];
for (let i = 0; i < ids.length; i++) {
const b = $(ids[i]);
if (!b) continue;
b.style.position = 'static';
b.style.left = 'auto'; b.style.right = 'auto';
b.style.top = 'auto'; b.style.bottom = 'auto';
bar.appendChild(b);
}

function metersRect() {
let top = Infinity, bottom = -Infinity, right = -Infinity, visible = false;
for (let i = 0; i < meterEls.length; i++) {
const r = meterEls[i].getBoundingClientRect();
if (r.width === 0 && r.height === 0) continue;
visible = true;
top = Math.min(top, r.top);
bottom = Math.max(bottom, r.bottom);
right = Math.max(right, r.right);
}
return visible ? { top: top, bottom: bottom, right: right } : null;
}

function place() {
const r = metersRect();
if (!r) {
// HUD скрыт (стартовое меню) — прижимаем к правому верхнему углу
bar.style.top = '8px';
bar.style.right = '8px';
} else {
// +28px — зазор под шкалами рассудка (чтобы не наезжали)
bar.style.top = (r.bottom + 28) + 'px';
bar.style.right = Math.max(6, Math.round(window.innerWidth - r.right)) + 'px';
}
}
place();
setTimeout(place, 100);
window.addEventListener('resize', place);
window.addEventListener('orientationchange', function() { setTimeout(place, 250); });
const hud = $('hud');
if (hud && window.MutationObserver) {
new MutationObserver(place).observe(hud, { attributes: true, attributeFilter: ['class'] });
}
})();