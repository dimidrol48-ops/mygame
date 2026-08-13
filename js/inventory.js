"use strict";

/* =====================================================
   INVENTORY.JS — инвентарь, экипировка, хотбар, рюкзак, сундуки
   Исправленная версия:
   • FIX: взятие из рюкзака при полном инвентаре больше не удаляет предмет
   • FIX: класть в рюкзак — переносится весь стак, стаки сливаются
   • FIX: свиной мешок использует этот же код — исправлен автоматически
   • FIX: кнопка «положить» в сундук — мердж в стак, даже если нет пустых слотов
   ===================================================== */

function dirtyInv() { hotbarDirty = true; craftDirty = true; equipDirty = true; }
function getHeld() { return G.inv[G.sel]; }
function getEquip(slot) { return G.equip[slot] || null; }
function getActiveItem() { const hands = G.equip.hands; if (hands) return hands; return getHeld(); }

function canAdd(id, n) {
n = n || 1;
let left = n, sm = stackMax(id);
for (let i = 0; i < 10; i++) {
const s = G.inv[i];
if (s && s.id === id && s.n < sm) {
left -= Math.min(sm - s.n, left);
if (left <= 0) return true;
}
}
for (let i = 0; i < 10; i++) {
if (!G.inv[i]) { left -= sm; if (left <= 0) return true; }
}
if (G.equip.backpack) {
const bpSlots = ITEMS[G.equip.backpack.id] && ITEMS[G.equip.backpack.id].backpackSlots || 6;
for (let i = 0; i < bpSlots; i++) {
const s2 = G.backpackInv[i];
if (s2 && s2.id === id && s2.n < sm) {
left -= Math.min(sm - s2.n, left);
if (left <= 0) return true;
}
}
for (let i = 0; i < bpSlots; i++) {
if (!G.backpackInv[i]) { left -= sm; if (left <= 0) return true; }
}
}
return left <= 0;
}

// FIX: проверка места ТОЛЬКО в основном инвентаре (10 слотов).
// Нужна для взятия из рюкзака: обычный canAdd считал бы свободным
// тот же слот рюкзака, из которого берём предмет, — из-за этого предмет исчезал.
function canAddMain(id, n) {
n = n || 1;
let left = n, sm = stackMax(id);
for (let i = 0; i < 10; i++) {
const s = G.inv[i];
if (s && s.id === id && s.n < sm) {
left -= Math.min(sm - s.n, left);
if (left <= 0) return true;
}
}
for (let i = 0; i < 10; i++) {
if (!G.inv[i]) { left -= sm; if (left <= 0) return true; }
}
return left <= 0;
}

function msgFull() {
const now = performance.now();
if (now - fullMsgT > 1600) {
fullMsgT = now;
msg('Инвентарь переполнен! Съешь что-нибудь или освободи место', 'danger');
}
}

function addInv(id, n, spoilIn) {
n = n || 1;
if (!ITEMS[id]) return false;
if (!canAdd(id, n)) { msgFull(); return false; }
let left = n, sm = stackMax(id);
const spIn = isFood(id) ? ((spoilIn !== undefined && spoilIn !== null) ? spoilIn : SPOIL_TIME[id]) : undefined;
for (let i = 0; i < 10; i++) {
const s = G.inv[i];
if (s && s.id === id && s.n < sm) {
const a = Math.min(sm - s.n, left);
if (isFood(id)) s.spoil = blendSpoil(s.n, s.spoil !== undefined ? s.spoil : SPOIL_TIME[id], a, spIn);
s.n += a; left -= a;
if (!left) break;
}
}
if (left > 0) for (let i = 0; i < 10; i++) {
if (!G.inv[i]) {
const put = Math.min(sm, left);
const meta = ITEMS[id];
const d0 = meta.tool ? meta.tool.dur : (meta.armor ? meta.armor.dur : undefined);
G.inv[i] = { id: id, n: put, dur: d0, spoil: isFood(id) ? spIn : undefined };
left -= put;
if (left <= 0) break;
}
}
if (left > 0 && G.equip.backpack) {
const bpSlots = ITEMS[G.equip.backpack.id] && ITEMS[G.equip.backpack.id].backpackSlots || 6;
for (let i = 0; i < bpSlots; i++) {
const s2 = G.backpackInv[i];
if (s2 && s2.id === id && s2.n < sm) {
const a2 = Math.min(sm - s2.n, left);
if (isFood(id)) s2.spoil = blendSpoil(s2.n, s2.spoil !== undefined ? s2.spoil : SPOIL_TIME[id], a2, spIn);
s2.n += a2; left -= a2;
if (!left) break;
}
}
if (left > 0) for (let i = 0; i < bpSlots; i++) {
if (!G.backpackInv[i]) {
const put2 = Math.min(sm, left);
const meta2 = ITEMS[id];
const d02 = meta2.tool ? meta2.tool.dur : (meta2.armor ? meta2.armor.dur : undefined);
G.backpackInv[i] = { id: id, n: put2, dur: d02, spoil: isFood(id) ? spIn : undefined };
left -= put2;
if (left <= 0) break;
}
}
}
dirtyInv();
return true;
}

function countInv(id) {
let n = 0;
for (let i = 0; i < 10; i++) {
const s = G.inv[i];
if (s && s.id === id) n += s.n;
}
if (G.equip.backpack) {
const bpSlots = ITEMS[G.equip.backpack.id] && ITEMS[G.equip.backpack.id].backpackSlots || 6;
for (let i = 0; i < bpSlots; i++) {
const s2 = G.backpackInv[i];
if (s2 && s2.id === id) n += s2.n;
}
}
return n;
}

function removeInv(id, n) {
let left = n;
for (let i = 0; i < 10; i++) {
const s = G.inv[i];
if (s && s.id === id) {
const t = Math.min(s.n, left);
s.n -= t; left -= t;
if (s.n <= 0) G.inv[i] = null;
if (!left) break;
}
}
if (left > 0 && G.equip.backpack) {
const bpSlots = ITEMS[G.equip.backpack.id] && ITEMS[G.equip.backpack.id].backpackSlots || 6;
for (let i = 0; i < bpSlots; i++) {
const s2 = G.backpackInv[i];
if (s2 && s2.id === id) {
const t2 = Math.min(s2.n, left);
s2.n -= t2; left -= t2;
if (s2.n <= 0) G.backpackInv[i] = null;
if (!left) break;
}
}
}
dirtyInv();
}

function hasRes(cost) {
const ks = Object.keys(cost);
for (let i = 0; i < ks.length; i++) {
if (countInv(ks[i]) < cost[ks[i]]) return false;
}
return true;
}

function dropItem(x, y, id, n) {
ent({ type: 'itemDrop', x: x + rand(-18, 18), y: y + rand(-14, 14), item: id, n: (n || 1), s: rand(100) });
}

function dropItemNearPlayer(id, n) {
const p = G.player;
dropItem(p.x + rand(-30, 30), p.y + rand(-20, 20), id, n);
}

function equipFromSlot(idx) {
const item = G.inv[idx];
if (!item) return;
const meta = ITEMS[item.id];
if (!meta) return;
const slot = meta.eqSlot;
if (!slot) { G.sel = idx; hotbarDirty = true; return; }
const current = G.equip[slot];
if (current) {
G.inv[idx] = current;
G.equip[slot] = item;
} else {
G.inv[idx] = null;
G.equip[slot] = item;
}
dirtyInv();
equipDirty = true;
msg('Экипировано: ' + itemName(item.id), 'hint');
sfx.place();
let found = false;
for (let i = 0; i < 10; i++) {
if (G.inv[i]) { G.sel = i; found = true; break; }
}
if (!found) G.sel = -1;
hotbarDirty = true;
updateHotbar();
updateEquipUI();
}

function buildHotbar() {
const hb = $('hotbar');
hb.innerHTML = '';
for (let i = 0; i < 10; i++) {
const d = document.createElement('div');
d.className = 'slot';
d.innerHTML = '<span class="key">' + ((i + 1) % 10) + '</span><canvas width="44" height="44"></canvas><span class="cnt"></span><div class="dur" style="display:none"><i></i></div>';
(function(idx, el) {
let ht = null;
function down(e) {
e.stopPropagation();
resumeAudio();
clearTimeout(ht);
ht = setTimeout(function() { dropFromSlot(idx); }, 500);
}
function up(e) {
clearTimeout(ht);
equipFromSlot(idx);
}
el.addEventListener('pointerdown', down);
el.addEventListener('pointerup', up);
el.addEventListener('pointerleave', () => { clearTimeout(ht); });
el.addEventListener('pointercancel', () => { clearTimeout(ht); });
el.addEventListener('contextmenu', e => e.preventDefault());
})(i, d);
hb.appendChild(d);
}
buildEquipBar();
buildBackpackSlots();
}

function buildEquipBar() {
const eb = $('equipBar');
eb.innerHTML = '';
const slots = ['head', 'chest', 'hands', 'backpack'];
const icons = ['🪖', '🛡️', '✋', '🎒'];
const labels = ['шлем', 'броня', 'руки', 'рюкзак'];
for (let i = 0; i < slots.length; i++) {
const d = document.createElement('div');
d.className = 'slot';
d.dataset.eqSlot = slots[i];
d.innerHTML = '<span class="key">' + icons[i] + '</span><canvas width="36" height="36"></canvas><span class="cnt"></span><div class="dur" style="display:none"><i></i></div><span class="eqTag">' + labels[i] + '</span>';
(function(idx, el, slotName) {
el.addEventListener('pointerdown', function(e) {
e.stopPropagation();
resumeAudio();
const s = G.equip[slotName];
if (s) {
if (!canAdd(s.id, s.n)) { msgFull(); return; }
addInv(s.id, s.n);
G.equip[slotName] = null;
dirtyInv();
equipDirty = true;
msg('Снято: ' + itemName(s.id));
sfx.place();
} else {
const held = getHeld();
if (held) {
const meta = ITEMS[held.id];
if (meta && meta.eqSlot === slotName) {
G.equip[slotName] = held;
G.inv[G.sel] = null;
dirtyInv();
equipDirty = true;
msg('Надето: ' + itemName(held.id));
sfx.place();
let found = false;
for (let i = 0; i < 10; i++) {
if (G.inv[i]) { G.sel = i; found = true; break; }
}
if (!found) G.sel = -1;
hotbarDirty = true;
} else {
msg('Это нельзя надеть в слот ' + labels[idx]);
}
} else {
msg('Выбери предмет в инвентаре');
}
}
updateEquipUI();
});
})(i, d, slots[i]);
eb.appendChild(d);
}
}

function buildBackpackSlots() {
const bs = $('backpackSlots');
bs.innerHTML = '';
for (let i = 0; i < 8; i++) {
const d = document.createElement('div');
d.className = 'slot';
d.dataset.bpIdx = i;
d.innerHTML = '<canvas width="30" height="30"></canvas><span class="cnt"></span><div class="dur" style="display:none"><i></i></div>';
(function(idx, el) {
el.addEventListener('pointerdown', function(e) {
e.stopPropagation();
resumeAudio();
const s = G.backpackInv[idx];
if (s) {
// === FIX: ВЗЯТЬ ИЗ РЮКЗАКА ===
// Проверяем место ТОЛЬКО в основном инвентаре (canAddMain).
// Старый canAdd считал свободным сам слот-источник в рюкзаке,
// addInv доливал стак в него же, а затем слот обнулялся — предмет исчезал.
if (!canAddMain(s.id, s.n)) { msgFull(); return; }
G.backpackInv[idx] = null;
addInv(s.id, s.n, s.spoil);
dirtyInv();
msg('Взято из рюкзака: ' + itemName(s.id));
sfx.pick();
} else {
// === FIX: ПОЛОЖИТЬ В РЮКЗАК ===
// Старый код клал только 1 штуку (n: 1), а весь стак удалял из инвентаря,
// и не сливал одинаковые предметы в один стак.
const held = getHeld();
if (held) {
if (!G.equip.backpack) { msg('Нет рюкзака!'); return; }
const bpSize = (ITEMS[G.equip.backpack.id] && ITEMS[G.equip.backpack.id].backpackSlots) || 6;
if (idx >= bpSize) { msg('Слот недоступен'); return; }
const sm = stackMax(held.id);
// 1) доливаем в существующие стаки рюкзака
for (let i = 0; i < bpSize && held.n > 0; i++) {
const rs = G.backpackInv[i];
if (rs && rs.id === held.id && rs.n < sm) {
const add = Math.min(sm - rs.n, held.n);
if (isFood(rs.id)) rs.spoil = blendSpoil(rs.n, rs.spoil !== undefined ? rs.spoil : SPOIL_TIME[rs.id], add, held.spoil !== undefined ? held.spoil : SPOIL_TIME[rs.id]);
rs.n += add;
held.n -= add;
}
}
// 2) остаток кладём в кликнутый пустой слот
if (held.n > 0) {
G.backpackInv[idx] = { id: held.id, n: held.n, dur: held.dur, spoil: held.spoil };
held.n = 0;
}
G.inv[G.sel] = null;
let found = false;
for (let i = 0; i < 10; i++) {
if (G.inv[i]) { G.sel = i; found = true; break; }
}
if (!found) G.sel = -1;
dirtyInv();
hotbarDirty = true;
msg('В рюкзак: ' + itemName(held.id));
sfx.place();
} else {
msg('Выбери предмет в инвентаре');
}
}
updateEquipUI();
});
})(i, d);
bs.appendChild(d);
}
}

function updateEquipUI() {
if (!G) return;
const slots = ['head', 'chest', 'hands', 'backpack'];
const eb = $('equipBar');
for (let i = 0; i < slots.length; i++) {
const d = eb.children[i];
if (!d) continue;
const s = G.equip[slots[i]];
const c = d.querySelector('canvas').getContext('2d');
c.clearRect(0, 0, 36, 36);
const cnt = d.querySelector('.cnt'), dur = d.querySelector('.dur');
if (s) {
drawIcon(c, s.id, 18, 18, 28);
cnt.textContent = '';
const it = ITEMS[s.id] || {};
const maxd = it.tool ? it.tool.dur : (it.armor ? it.armor.dur : 0);
if (maxd && s.id !== 'torch') {
dur.style.display = 'block';
dur.firstElementChild.style.width = clamp(s.dur / maxd * 100, 0, 100) + '%';
dur.firstElementChild.style.background = '#e08a2e';
} else if (it.food && s.spoil !== undefined) {
const fr = clamp(s.spoil / SPOIL_TIME[s.id], 0, 1);
dur.style.display = 'block';
dur.firstElementChild.style.width = (fr * 100) + '%';
dur.firstElementChild.style.background = spoilColor(fr);
} else dur.style.display = 'none';
} else {
cnt.textContent = '';
dur.style.display = 'none';
}
}
const bpSlots = $('backpackSlots');
const hasBP = !!(G.equip.backpack);
bpSlots.classList.toggle('open', hasBP);
const bpLabel = document.getElementById('bpLabel');
if (bpLabel) bpLabel.style.display = hasBP ? 'block' : 'none';
const bpSize = hasBP ? (ITEMS[G.equip.backpack.id] && ITEMS[G.equip.backpack.id].backpackSlots || 6) : 0;
const children = bpSlots.children;
for (let i = 0; i < 8; i++) {
const d2 = children[i];
if (!d2) continue;
d2.style.display = (i < bpSize) ? 'block' : 'none';
if (i < bpSize) {
const s2 = G.backpackInv[i];
const c2 = d2.querySelector('canvas').getContext('2d');
c2.clearRect(0, 0, 30, 30);
const cnt2 = d2.querySelector('.cnt'), dur2 = d2.querySelector('.dur');
if (s2) {
drawIcon(c2, s2.id, 15, 15, 24);
cnt2.textContent = s2.n > 1 ? s2.n : '';
const it2 = ITEMS[s2.id] || {};
const maxd2 = it2.tool ? it2.tool.dur : (it2.armor ? it2.armor.dur : 0);
if (maxd2 && s2.id !== 'torch') {
dur2.style.display = 'block';
dur2.firstElementChild.style.width = clamp(s2.dur / maxd2 * 100, 0, 100) + '%';
dur2.firstElementChild.style.background = '#e08a2e';
} else if (it2.food && s2.spoil !== undefined) {
const fr2 = clamp(s2.spoil / SPOIL_TIME[s2.id], 0, 1);
dur2.style.display = 'block';
dur2.firstElementChild.style.width = (fr2 * 100) + '%';
dur2.firstElementChild.style.background = spoilColor(fr2);
} else dur2.style.display = 'none';
} else {
cnt2.textContent = '';
dur2.style.display = 'none';
}
}
}
equipDirty = false;
}

function updateHotbar() {
const hb = $('hotbar');
for (let i = 0; i < 10; i++) {
const d = hb.children[i];
if (!d) continue;
const s = G.inv[i];
d.classList.toggle('sel', G.sel === i);
const c = d.querySelector('canvas').getContext('2d');
c.clearRect(0, 0, 44, 44);
const cnt = d.querySelector('.cnt'), dur = d.querySelector('.dur');
if (s) {
drawIcon(c, s.id, 22, 22, 34);
cnt.textContent = s.n > 1 ? s.n : '';
const it = ITEMS[s.id] || {};
const maxd = it.tool ? it.tool.dur : (it.armor ? it.armor.dur : 0);
if (maxd && s.id !== 'torch') {
dur.style.display = 'block';
dur.firstElementChild.style.width = clamp(s.dur / maxd * 100, 0, 100) + '%';
dur.firstElementChild.style.background = '#e08a2e';
} else if (it.food && s.spoil !== undefined) {
const fr = clamp(s.spoil / SPOIL_TIME[s.id], 0, 1);
dur.style.display = 'block';
dur.firstElementChild.style.width = (fr * 100) + '%';
dur.firstElementChild.style.background = spoilColor(fr);
} else dur.style.display = 'none';
} else {
cnt.textContent = '';
dur.style.display = 'none';
}
}
const active = getActiveItem();
let txt = '';
if (active) {
const hm = ITEMS[active.id];
txt = itemName(active.id);
if (hm && hm.food) {
txt += isTouch ? ' — 🍖 съесть' : ' — [F] съесть';
if (active.spoil !== undefined && SPOIL_TIME[active.id])
txt += ' · свежесть ' + Math.round(clamp(active.spoil / SPOIL_TIME[active.id], 0, 1) * 100) + '%';
}
if (hm && hm.place) txt += isTouch ? ' — тап по земле' : ' — ЛКМ по земле';
if (hm && hm.eqSlot) txt += ' — надето';
if (active.id === 'fishingrod') txt += isTouch ? ' — 🎣 у пруда' : ' — удочка у пруда';
if (active.id === 'pitchfork') txt += ' — 🟩 собирать/класть дёрн';
}
$('heldName').textContent = txt;
hotbarDirty = false;
updateEquipUI();
}

function nearScience() {
if (!G) return false;
const p = G.player;
let found = false;
forEachInRadius(p.x, p.y, 160, e => {
if (e.type === 'science' && !e.dead) { found = true; return true; }
return false;
});
return found;
}

function countTurfInInventory() {
const turfIds = ['turf_forest', 'turf_grass', 'turf_rocky', 'turf_marsh', 'turf_savanna', 'turf_village', 'turf_chess'];
let total = 0;
for (let i = 0; i < turfIds.length; i++) {
total += countInv(turfIds[i]);
}
return total;
}

function getFirstTurfInInventory() {
const turfIds = ['turf_forest', 'turf_grass', 'turf_rocky', 'turf_marsh', 'turf_savanna', 'turf_village', 'turf_chess'];
for (let i = 0; i < turfIds.length; i++) {
if (countInv(turfIds[i]) > 0) return turfIds[i];
}
return null;
}

function dropFromSlot(idx) {
if (state !== 'play' || paused) return;
const s = G.inv[idx];
if (!s) return;
const p = G.player, a = rand(TAU), d = rand(40, 70);
ent({ type: 'itemDrop', x: clamp(p.x + Math.cos(a) * d, 40, W - 40), y: clamp(p.y + Math.sin(a) * d, 40, H - 40), item: s.id, n: 1, s: rand(100), spoil: s.spoil });
s.n--;
if (s.n <= 0) G.inv[idx] = null;
dirtyInv();
sfx.place();
addText(p.x, p.y - 44, 'выброшено: ' + itemName(s.id).toLowerCase(), '#cfc3a2');
}

function chestStoreItem() {
if (state !== 'play' || paused || mapVisible) return;
const p = G.player;
const chest = findNearestInRadius(p.x, p.y, REACH + 50, e => (e.type === 'chest' || e.type === 'icebox') && !e.dead);
if (!chest) { msg('Рядом нет сундука или холодильника'); return; }
const held = getHeld();
if (!held) { msg('Нет предмета в руках'); return; }
if (!chest.inventory) chest.inventory = new Array(8).fill(null);
const sm2 = stackMax(held.id);
// FIX: ищем пустой слот И слот для слияния — раньше при отсутствии пустого
// слота выдавалось «полон», даже если можно было долить в существующий стак.
let freeSlot = -1, mergeSlot = -1;
for (let i = 0; i < chest.inventory.length; i++) {
const cs = chest.inventory[i];
if (!cs && freeSlot === -1) freeSlot = i;
if (cs && cs.id === held.id && cs.n < sm2 && mergeSlot === -1) mergeSlot = i;
}
if (freeSlot === -1 && mergeSlot === -1) {
msg(chest.type === 'icebox' ? 'Холодильник полон' : 'Сундук полон');
return;
}
let merged2 = false;
for (let si2 = 0; si2 < chest.inventory.length; si2++) {
const cs2 = chest.inventory[si2];
if (cs2 && cs2.id === held.id && cs2.n < sm2) {
const add2 = Math.min(sm2 - cs2.n, held.n);
if (isFood(cs2.id)) cs2.spoil = blendSpoil(cs2.n, cs2.spoil !== undefined ? cs2.spoil : SPOIL_TIME[cs2.id], add2, held.spoil !== undefined ? held.spoil : SPOIL_TIME[cs2.id]);
cs2.n += add2;
held.n -= add2;
if (held.n <= 0) { merged2 = true; break; }
}
}
if (!merged2 && held.n > 0) {
chest.inventory[freeSlot] = { id: held.id, n: held.n, dur: held.dur, spoil: held.spoil };
}
if (G.equip.hands && G.equip.hands.id === held.id) {
G.equip.hands = null;
equipDirty = true;
} else {
G.inv[G.sel] = null;
}
let found = false;
for (let i = 0; i < 10; i++) {
if (G.inv[i]) { G.sel = i; found = true; break; }
}
if (!found) G.sel = -1;
hotbarDirty = true;
dirtyInv();
msg(chest.type === 'icebox' ? 'Предмет положен в холодильник' : 'Предмет положен в сундук');
sfx.place();
if (chestOpen === chest) {
openChest(chest, chest.type === 'icebox' ? '❄️ ХОЛОДИЛЬНИК' : '📦 СУНДУК');
}
}