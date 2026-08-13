"use strict";

// === JOBS (gathering, chopping, mining) ===
function startJob(t) {
const p = G.player, ty = t.type;
p.swing = null;
if (ty === 'tree') {
if (t.growing) { msg('Дерево ещё растёт! Подожди.'); return; }
const tool = getEffectiveTool();
if (!tool || tool.kind !== 'axe') { msg('Нужен топор в руках'); return; }
p.job = { kind: 'chop', target: t, t: 0, sw: .32, maxhp: t.hp, lastTick: 0 };
} else if (ty === 'rock' || ty === 'goldrock' || ty === 'marble_tree') {
const tool2 = getEffectiveTool();
if (!tool2 || tool2.kind !== 'pick') { msg('Нужна кирка в руках'); return; }
p.job = { kind: 'mine', target: t, t: 0, sw: .32, maxhp: t.hp, lastTick: 0 };
} else if (GATHER_T[ty]) {
p.job = { kind: 'gather', target: t, t: 0, need: GATHER_T[ty], lastTick: 0 };
} else return;
p.face = Math.atan2(t.y - p.y, t.x - p.x);
}

function getEffectiveTool() {
const hands = G.equip.hands;
if (hands && ITEMS[hands.id] && ITEMS[hands.id].tool) return ITEMS[hands.id].tool;
const held = getHeld();
if (held && ITEMS[held.id] && ITEMS[held.id].tool) return ITEMS[held.id].tool;
return null;
}

function cancelJob() { if (G && G.player) G.player.job = null; }

function completeGather(t) {
const map = { grass: 'grass', sapling: 'twig', berry: 'berry', carrot: 'carrot', flint: 'flint', stoneItem: 'stone', pinecone: 'pinecone' };
const item = map[t.type];
if (!item || t.dead || !ITEMS[item]) return;
if (!canAdd(item, 1)) { msgFull(); return; }
addInv(item, 1);
addText(t.x, t.y - 20, '+ ' + itemName(item).toLowerCase());
if (t.type === 'grass' || t.type === 'sapling' || t.type === 'berry' || (t.type === 'carrot' && t.regrowable)) { t.ready = false; t.regrow = rand(60, 105); }
else t.dead = true;
G.stats.gather++;
G.chunkDirty = true;
sfx.pick();
burst(t.x, t.y - 10, 6, t.type === 'berry' ? '#c23b32' : '#8fbf54', 45);
if (t.type === 'flint' && !G.flags.flintHint) { G.flags.flintHint = 1; msg('Кремень найден! Собери ещё и хворост — крафт в меню ⚒', 'hint'); }
}

// === COMBAT ===
function doSwing(target) {
const p = G.player;
if (p.cd > 0) return;
p.cd = .42;
p.swing = { t: 0, target: target, applied: false };
sfx.swing();
}

function applyHit(t) {
const p = G.player;
if (!t || t.dead) return;
const dpx = p.x - t.x, dpy = p.y - t.y;
const reach = REACH + (t.type === 'giant' ? 80 : 16);
if (dpx * dpx + dpy * dpy > reach * reach) return;
if (t.type === 'tree' && t.growing) { msg('Дерево ещё растёт!'); return; }
let held = getActiveItem(), tool = (held && ITEMS[held.id] && ITEMS[held.id].tool) ? ITEMS[held.id].tool : null;
let dmg = tool ? tool.dmg : 8;
if (t.type === 'tree') {
if (tool && tool.kind === 'axe') { t.hp -= dmg; sfx.chop(); burst(t.x, t.y - 40, 7, '#4c6a3c', 80); useDur(); }
else { t.hp -= 2; sfx.hit(); }
if (t.hp <= 0) fellTree(t);
} else if (t.type === 'rock' || t.type === 'goldrock' || t.type === 'marble_tree') {
if (tool && tool.kind === 'pick') { t.hp -= dmg; if (t.type === 'marble_tree') sfx.marble_break(); else sfx.stone(); burst(t.x, t.y - 8, 6, t.type === 'marble_tree' ? '#b0a8a0' : '#9a9d9b', 80); useDur(); }
else { t.hp -= 2; sfx.hit(); }
if (t.hp <= 0) {
t.dead = true; G.chunkDirty = true;
if (t.type === 'goldrock') { dropItem(t.x, t.y, 'stone', 2); dropItem(t.x, t.y, 'gold', 1); if (Math.random() < .45) dropItem(t.x, t.y, 'gold', 1); }
else if (t.type === 'marble_tree') { dropItem(t.x, t.y, 'marble', 2 + irand(0, 1)); if (Math.random() < .4) dropItem(t.x, t.y, 'marble', 1); G.stats.gather += 2; sfx.fall(); addText(t.x, t.y - 30, '🪨 +мрамор', '#b0a8a0'); burst(t.x, t.y, 12, '#b0a8a0', 100); }
else { dropItem(t.x, t.y, 'stone', 3); if (Math.random() < .5) dropItem(t.x, t.y, 'flint', 1); G.stats.gather += 3; sfx.fall(); burst(t.x, t.y, 12, '#8a8d8b', 100); }
}
} else if (t.type === 'nest') {
t.hp -= dmg; sfx.hit(); burst(t.x, t.y - 8, 8, '#d8d8d8', 80); useDur();
forEachInRadius(t.x, t.y, 200, e => { if (e.type === 'spider' && !e.dead && e.nest === t) e.aggro = true; return false; });
if (t.hp <= 0) killEnt(t);
} else if (t.type === 'pig') {
t.hp -= dmg; sfx.hit(); burst(t.x, t.y - 10, 7, '#c0392b', 90); addText(t.x, t.y - 30, '-' + dmg, '#ff8a76'); useDur();
t.aggroT = 20;
forEachInRadius(t.x, t.y, 120, e => { if (e.type === 'pig' && !e.dead) e.aggroT = 20; return false; });
if (t.hp <= 0) killEnt(t);
} else if (t.type === 'wildhive' || t.type === 'beehive') {
t.hp -= dmg; sfx.hit(); burst(t.x, t.y - 8, 6, '#e8b83a', 70); useDur();
} else if (t.type === 'wildhive' || t.type === 'beehive') {
t.hp -= dmg; sfx.hit(); burst(t.x, t.y - 8, 6, '#e8b83a', 70); useDur();
if (t.hp <= 0) {
t.dead = true; G.chunkDirty = true;
dropItem(t.x, t.y, 'comb', 1); // соты выпадают с любого улья
if (t.type === 'wildhive') {
dropItem(t.x, t.y, 'honey', 1 + irand(0, 2));
dropItem(t.x, t.y, 'stinger', 1 + irand(0, 2));
// выпустить диких пчёл из улья
for (let bi = 0; bi < 4; bi++) {
ent({ type: 'bee', x: t.x + rand(-30, 30), y: t.y + rand(-30, 30), hp: 10, hive: null, aggro: true, vx: 0, vy: 0, s: rand(100), stingT: 0 });
}
} else {
dropItem(t.x, t.y, 'honey', 1);
dropItem(t.x, t.y, 'stinger', 1);
// выпустить агрессивных пчёл из домашнего улья
const bc = t.beeCount || 0;
for (let bi = 0; bi < bc; bi++) {
ent({ type: 'bee', x: t.x + rand(-30, 30), y: t.y + rand(-30, 30), hp: 10, hive: null, aggro: true, vx: 0, vy: 0, s: rand(100), stingT: 0 });
}
}
addText(t.x, t.y - 30, '🪹 Улей разрушен', '#ff8a76');
sfx.fall();
}
} else if (t.type === 'bee') {
t.hp -= dmg; sfx.hit(); burst(t.x, t.y - 6, 5, '#e8b83a', 60); useDur();
if (t.hp <= 0) { t.dead = true; G.chunkDirty = true; if (Math.random() < 0.6) dropItem(t.x, t.y, 'stinger', 1); addText(t.x, t.y - 18, 'Пчела убита', '#ff8a76'); }
} else if (t.type === 'pigking') { msg('Король неприкосновенен! Он принимает только мясо.'); }
else if (t.type === 'chess_horse') {
t.hp -= dmg; sfx.hit(); sfx.chess(); burst(t.x, t.y - 10, 8, '#a0a0b0', 80); addText(t.x, t.y - 30, '-' + dmg, '#ff8a76'); useDur();
if (t.hp > 0 && !t.dead) {
t.aggro = true;
const dx = p.x - t.x, dy = p.y - t.y, dist = Math.sqrt(dx * dx + dy * dy);
if (dist < 40 && t.dmgCooldown <= 0) { t.dmgCooldown = 0.8; hurtPlayer(t.dmg, 'шахматный конь'); sfx.hit(); }
}
if (t.hp <= 0) {
t.dead = true; G.chunkDirty = true; G.stats.kills++;
const gearCount = 1 + irand(0, 1);
for (let gi = 0; gi < gearCount; gi++) dropItem(t.x + rand(-20, 20), t.y + rand(-15, 15), 'gear', 1);
if (Math.random() < 0.4) dropItem(t.x, t.y, 'gear', 1);
addText(t.x, t.y - 24, '⚙️ +' + gearCount + ' шестерни!');
sfx.gear(); sfx.fall(); G.shake = Math.max(G.shake, 4);
msg('Шахматный конь повержен! +' + gearCount + ' шестерен', 'hint');
} else { t.aggro = true; }
} else {
t.hp -= dmg; sfx.hit(); burst(t.x, t.y - 10, 7, '#c0392b', 90); addText(t.x, t.y - 30, '-' + dmg, '#ff8a76'); useDur();
if (t.type === 'rabbit') { t.vx += Math.cos(p.face) * 120; t.vy += Math.sin(p.face) * 120; }
if (t.type === 'spider') { t.aggro = true; t.vx += Math.cos(p.face) * 80; t.vy += Math.sin(p.face) * 80; }
if (t.hp <= 0) killEnt(t);
}
}

function useDur() {
const item = getActiveItem();
if (!item) return;
const it = ITEMS[item.id];
if (!it || !it.tool || item.id === 'torch') return;
item.dur--;
if (item.dur <= 0) {
if (G.equip.hands && G.equip.hands.id === item.id) { G.equip.hands = null; equipDirty = true; }
else { for (let i = 0; i < 10; i++) { if (G.inv[i] && G.inv[i].id === item.id && G.inv[i].dur === item.dur) { G.inv[i] = null; break; } } }
msg(itemName(item.id) + ' — сломался!'); sfx.breakIt(); dirtyInv(); equipDirty = true;
let found = false;
for (let i = 0; i < 10; i++) { if (G.inv[i]) { G.sel = i; found = true; break; } }
if (!found) G.sel = -1;
hotbarDirty = true;
} else {
if (G.equip.hands && G.equip.hands.id === item.id) { G.equip.hands.dur = item.dur; equipDirty = true; }
else { for (let i = 0; i < 10; i++) { if (G.inv[i] && G.inv[i].id === item.id && G.inv[i].dur === item.dur + 1) { G.inv[i].dur = item.dur; break; } } }
hotbarDirty = true; equipDirty = true;
}
}

function fellTree(t) {
t.dead = true; G.chunkDirty = true;
dropItem(t.x, t.y, 'wood', 3);
if (Math.random() < .3) dropItem(t.x, t.y, 'wood', 1);
if (Math.random() < .45) { const coneCount = 1 + (Math.random() < .4 ? 1 : 0); dropItem(t.x + rand(-20, 20), t.y + rand(-10, 10), 'pinecone', coneCount); addText(t.x, t.y - 50, '🌲 шишки выпали', '#d9b87a'); }
G.stats.gather += 3; sfx.fall(); burst(t.x, t.y - 40, 16, '#3f5a32', 110, .9); G.shake = Math.max(G.shake, 4);
}

function killEnt(t) {
t.dead = true; G.chunkDirty = true; G.stats.kills++;
burst(t.x, t.y - 8, 14, '#7a2c22', 110, .8); sfx.fall();
if (t.type === 'rabbit') { dropItem(t.x, t.y, 'meat', 1); addText(t.x, t.y - 24, 'Длиннух пойман!'); }
if (t.type === 'spider') { dropItem(t.x, t.y, Math.random() < .5 ? 'meat' : 'mmeat', 1); if (Math.random() < .45) dropItem(t.x, t.y, 'silk', 1); addText(t.x, t.y - 24, 'Мрак развеян'); }
if (t.type === 'pig') { dropItem(t.x, t.y, 'meat', 1); if (Math.random() < .35) dropItem(t.x, t.y, 'meat', 1); if (Math.random() < .6) dropItem(t.x + rand(-16, 16), t.y + rand(-10, 10), 'pighide', 1 + (Math.random() < .4 ? 1 : 0)); addText(t.x, t.y - 24, 'Свин пал'); }
if (t.type === 'nest') { dropItem(t.x, t.y, 'silk', 2); G.stats.gather += 2; addText(t.x, t.y - 24, 'Кокон разорён'); }
if (t.type === 'giant') { G.giantAlive = false; for (let i = 0; i < 6; i++) dropItem(t.x + rand(-40, 40), t.y + rand(-30, 30), 'meat', 1); msg('ГИГАНТ ПОВЕРЖЕН! Мясо ×6 — трофей охотника', 'day'); const p = G.player; p.san = clamp(p.san + 40, 0, 100); p.hp = clamp(p.hp + 20, 0, 100); sfx.boom(); G.shake = 18; }
if (t.type === 'pighouse') { let skinCount = 2 + irand(0, 2); for (let i = 0; i < skinCount; i++) dropItem(t.x + rand(-30, 30), t.y + rand(-20, 20), 'pighide', 1); addText(t.x, t.y - 30, '🐗 +' + skinCount + ' шкур', '#d9a87a'); sfx.fall(); if (Math.random() < .3) { ent({ type: 'pig', x: t.x + rand(-40, 40), y: t.y + rand(-30, 30), hp: 100, hx: t.x, hy: t.y, house: null, followT: 0, aggroT: 10, cd: 0, wt: 0, tx: 0, ty: 0, vx: 0, vy: 0, s: rand(100) }); msg('Разъярённый свин выскочил из руин!', 'danger'); } }
}

function hurtPlayer(dmg, cause) {
const p = G.player;
if (p.inv > 0 || state !== 'play') return;
let d = dmg;
const armor = getEquip('chest');
const ar = (armor && ITEMS[armor.id]) ? ITEMS[armor.id].armor : null;
if (ar) {
d *= (1 - ar.abs);
armor.dur -= Math.max(1, dmg * .4);
if (armor.dur <= 0) { G.equip.chest = null; msg(itemName(armor.id) + ' — рассыпалась!'); sfx.breakIt(); dirtyInv(); equipDirty = true; }
else { hotbarDirty = true; equipDirty = true; }
addText(p.x, p.y - 54, 'броня поглотила удар', '#cfe4e8');
}
const helm = getEquip('head');
const ar2 = (helm && ITEMS[helm.id]) ? ITEMS[helm.id].armor : null;
if (ar2) {
let d2 = d * ar2.abs * .3; d -= d2;
helm.dur -= Math.max(1, dmg * .2);
if (helm.dur <= 0) { G.equip.head = null; msg(itemName(helm.id) + ' — разбит!'); sfx.breakIt(); dirtyInv(); equipDirty = true; }
else { hotbarDirty = true; equipDirty = true; }
addText(p.x, p.y - 44, 'шлем смягчил удар', '#cfe4e8');
}
p.hp -= d; p.inv = .6; G.hurtFlash = 1; G.shake = Math.max(G.shake, 7); sfx.hurt(); cancelJob();
if (p.hp <= 0) die(cause);
}

// === ACTIONS ===
function eatSelected() {
if (state !== 'play' || paused || mapVisible) return;
let idx = -1, h = getActiveItem();
if (h && ITEMS[h.id] && ITEMS[h.id].food) { idx = G.sel; }
else { for (let i = 0; i < 10; i++) { const s = G.inv[i]; if (s && ITEMS[s.id] && ITEMS[s.id].food) { idx = i; break; } } }
if (idx < 0) {
if (G.equip.backpack) { for (let i = 0; i < G.backpackInv.length; i++) { const s2 = G.backpackInv[i]; if (s2 && ITEMS[s2.id] && ITEMS[s2.id].food) { idx = -2; break; } } }
if (idx < 0) { msg('Есть нечего...'); return; }
}
cancelJob();
let st, isBP = false;
if (idx === -2) { for (let i = 0; i < G.backpackInv.length; i++) { const s3 = G.backpackInv[i]; if (s3 && ITEMS[s3.id] && ITEMS[s3.id].food) { st = s3; isBP = true; idx = i; break; } } if (!st) { msg('Есть нечего...'); return; } }
else st = G.inv[idx];
const f = ITEMS[st.id].food, p2 = G.player;
p2.hunger = clamp(p2.hunger + f.h, 0, 100);
p2.hp = clamp(p2.hp + f.hp, 0, 100);
p2.san = clamp(p2.san + f.s, 0, 100);
addText(p2.x, p2.y - 46, '+' + f.h + ' сытости', '#ffd75e');
msg('Съедено: ' + itemName(st.id).toLowerCase());
sfx.eat();
st.n--;
if (st.n <= 0) { if (isBP) G.backpackInv[idx] = null; else if (G.equip.hands && G.equip.hands.id === st.id) G.equip.hands = null; else G.inv[idx] = null; }
dirtyInv(); equipDirty = true;
}

function cookAtFire() {
if (state !== 'play' || paused || mapVisible) return;
const p = G.player;
let fire = null;
forEachInRadius(p.x, p.y, 160, e => { if (e.type === 'campfire' && !e.dead && e.lit && e.fuel > 0) { fire = e; return true; } return false; });
if (!fire) { msg('Рядом нет горящего костра с топливом'); return; }
if (fire.cooking) { msg('На костре уже что-то готовится. Подожди.'); return; }
let mi = -1;
let item = getActiveItem();
if (item && COOK_MAP[item.id]) { mi = G.sel; }
else { for (let i = 0; i < 10; i++) { if (G.inv[i] && COOK_MAP[G.inv[i].id]) { mi = i; break; } } }
if (mi < 0) {
if (G.equip.backpack) { for (let i = 0; i < G.backpackInv.length; i++) { if (G.backpackInv[i] && COOK_MAP[G.backpackInv[i].id]) { mi = -2; break; } } }
if (mi < 0) { msg('Нечего жарить: нужно мясо, ягоды, морковь или рыба'); return; }
}
cancelJob();
let old, isBP2 = false, idx2;
if (mi === -2) { for (let i = 0; i < G.backpackInv.length; i++) { if (G.backpackInv[i] && COOK_MAP[G.backpackInv[i].id]) { old = G.backpackInv[i].id; isBP2 = true; idx2 = i; break; } } }
else { old = G.inv[mi].id; idx2 = mi; }
const out = COOK_MAP[old];
if (!canAdd(out, 1)) { msgFull(); return; }
const cookTime = COOK_TIME_MAP[old] || COOK_TIME;
fire.cooking = { itemId: old, outId: out, timer: 0, maxTime: cookTime, bp: isBP2, idx: idx2 };
if (isBP2) { G.backpackInv[idx2].n--; if (G.backpackInv[idx2].n <= 0) G.backpackInv[idx2] = null; }
else { if (G.equip.hands && G.equip.hands.id === old) { G.equip.hands.n--; if (G.equip.hands.n <= 0) G.equip.hands = null; equipDirty = true; } else { G.inv[idx2].n--; if (G.inv[idx2].n <= 0) G.inv[idx2] = null; } }
dirtyInv(); equipDirty = true;
addText(fire.x, fire.y - 50, '🔥 Готовится: ' + itemName(old).toLowerCase() + ' (' + Math.ceil(cookTime) + 'с)', '#ffb75e');
msg('Начата жарка ' + itemName(old).toLowerCase() + '. Подожди ' + Math.ceil(cookTime) + ' секунд.', 'hint');
sfx.ignite();
}

function completeCooking(fire) {
if (!fire || !fire.cooking) return;
const c = fire.cooking;
if (!canAdd(c.outId, 1)) { msgFull(); fire.cooking = null; msg('Нет места для готовой еды!', 'danger'); return; }
addInv(c.outId, 1);
addText(fire.x, fire.y - 40, '✅ Готово: ' + itemName(c.outId).toLowerCase(), '#ffd75e');
sfx.sizzle(); burst(fire.x, fire.y - 14, 8, '#ffcf7a', 60);
msg('🔥 ' + itemName(c.outId).toLowerCase() + ' готово!', 'hint');
fire.cooking = null; dirtyInv();
}

// === PLACEMENT ===
function canPlace(wx, wy) {
const p = G.player;
if (wx < 120 || wy < 120 || wx > W - 120 || wy > H - 120) return false;
const dpx = p.x - wx, dpy = p.y - wy;
if (dpx * dpx + dpy * dpy > 280 * 280) return false;
let blocked = false;
forEachInRadius(wx, wy, 80, e => {
if (e.dead) return false;
const r = (e.type === 'campfire') ? 70 : (e.type === 'science' ? 64 : 38);
const dx = e.x - wx, dy = e.y - wy;
if (dx * dx + dy * dy < r * r) { blocked = true; return true; }
return false;
});
return !blocked;
}

function tryPlaceAt(wx, wy, held) {
if (!canPlace(wx, wy)) { msg('Здесь ставить нельзя'); return false; }
cancelJob();
if (held.id === 'campfire') ent({ type: 'campfire', x: wx, y: wy, fuel: 30, lit: true, s: rand(100) });
else if (held.id === 'trap') ent({ type: 'trap', x: wx, y: wy, armed: true, s: rand(100) });
else if (held.id === 'science') { ent({ type: 'science', x: wx, y: wy, s: rand(100) }); msg('Научная машина построена! Рядом с ней открылись новые рецепты', 'hint'); }
else if (held.id === 'drier') ent({ type: 'drier', x: wx, y: wy, meat: false, t: 0, s: rand(100) });
else if (held.id === 'pinecone') { ent({ type: 'tree', x: wx, y: wy, hp: 66, s: rand(100), growing: true, growTimer: 0, growTime: 2 * DAY_LEN }); msg('🌱 Посажена шишка — дерево вырастет через 2 дня', 'hint'); sfx.plant(); burst(wx, wy - 10, 12, '#5d8a35', 70, .7); }
else if (held.id === 'beehive') { ent({ type: 'beehive', x: wx, y: wy, hp: 80, honey: 0, spawnT: rand(5), s: rand(100) }); msg('🍯 Улей построен! Подожди, пчёлы принесут мёд.', 'hint'); sfx.place(); burst(wx, wy, 10, '#e8b83a', 60); }
else if (held.id === 'chest') { ent({ type: 'chest', x: wx, y: wy, s: rand(100), inventory: new Array(8).fill(null) }); msg('📦 Сундук построен!'); sfx.place(); }
else if (held.id === 'icebox') { ent({ type: 'icebox', x: wx, y: wy, s: rand(100), inventory: new Array(8).fill(null) }); msg('❄️ Холодильник построен! Еда в нём портится в 4 раза медленнее', 'hint'); sfx.place(); }
else return false;
held.n--;
if (held.n <= 0) {
if (G.equip.hands && G.equip.hands.id === held.id) G.equip.hands = null;
else { for (let i = 0; i < 10; i++) { if (G.inv[i] && G.inv[i].id === held.id && G.inv[i].dur === held.dur) { G.inv[i] = null; break; } } }
dirtyInv(); equipDirty = true;
} else {
if (G.equip.hands && G.equip.hands.id === held.id) { G.equip.hands.n = held.n; equipDirty = true; }
else { for (let i = 0; i < 10; i++) { if (G.inv[i] && G.inv[i].id === held.id && G.inv[i].dur === held.dur) { G.inv[i].n = held.n; break; } } }
hotbarDirty = true;
}
sfx.place(); burst(wx, wy, 8, '#c3ad7f', 50);
if (held.id === 'campfire' && !G.flags.fireHint) { G.flags.fireHint = 1; msg(isTouch ? 'У костра можно жарить мясо — кнопка 🔥 рядом с огнём' : 'У костра можно жарить мясо [E] и греться ночью', 'hint'); }
if (held.id === 'pinecone' && !G.flags.plantHint) { G.flags.plantHint = 1; msg('🌱 Шишка посажена! Дерево вырастет через 2 игровых дня.', 'hint'); }
if (held.id === 'beehive' && !G.flags.hiveBuilt) { G.flags.hiveBuilt = 1; msg('🐝 Улей готов! Надень маску пчеловода, чтобы собирать мёд без риска.', 'hint'); }
return true;
}
function catchBee() {
if (state !== 'play' || paused || mapVisible) return;
const held = getActiveItem();
if (!held || held.id !== 'bugnet') { msg('Нужен сачок в руках'); return; }
const p = G.player;
const bee = findNearestInRadius(p.x, p.y, REACH + 40, e => e.type === 'bee' && !e.dead && !e.aggro);
if (!bee) { msg('Рядом нет спокойной пчелы'); return; }
// имитируем клик по пчеле — используем существующую логику ловли
onClickEntity(bee);
}
function plantPinecone() {
if (state !== 'play' || paused || mapVisible) return;
const held = getActiveItem();
if (!held || held.id !== 'pinecone') { msg('Выбери шишку в инвентаре или возьми в руки'); return; }
const p = G.player;
const wx = p.x + Math.cos(p.face) * 50, wy = p.y + Math.sin(p.face) * 50;
if (!canPlace(wx, wy)) { msg('Здесь нельзя посадить'); return; }
tryPlaceAt(wx, wy, held);
}

// === FISHING ===
function startFishing() {
if (state !== 'play' || paused || mapVisible || fishingActive) return;
const p = G.player;
const held = getActiveItem();
if (!held || held.id !== 'fishingrod') { msg('Нужна удочка в руках'); return; }
const pond = findNearestInRadius(p.x, p.y, REACH + 60, e => e.type === 'pond' && !e.dead);
if (!pond) { msg('Рядом нет пруда'); return; }
let fishCount = 0;
forEachInRadius(pond.x, pond.y, pond.r || 100, e => { if (e.type === 'fish' && !e.dead) fishCount++; return false; });
if (fishCount === 0) { msg('В этом пруду нет рыбы. Попробуй другой.'); return; }
fishingActive = true; fishingProgress = 0; fishingTarget = pond;
$('fishingBar').style.display = 'block'; $('fishFill').style.width = '0%';
msg('🎣 Ловля рыбы...', 'hint'); sfx.fish();
}

function cancelFishing() { fishingActive = false; fishingProgress = 0; fishingTarget = null; $('fishingBar').style.display = 'none'; }

function completeFishing(pond) {
if (!pond) return;
let fish = null;
forEachInRadius(pond.x, pond.y, pond.r || 100, e => { if (e.type === 'fish' && !e.dead) { fish = e; return true; } return false; });
if (!fish) { msg('Рыбы в пруду не осталось.', 'warning'); cancelFishing(); return; }
if (!canAdd('fish', 1)) { msgFull(); cancelFishing(); return; }
fish.dead = true; G.chunkDirty = true;
addInv('fish', 1); addText(fish.x, fish.y - 20, '🐟 + рыба'); sfx.fish(); burst(fish.x, fish.y - 8, 10, '#3a8ab5', 70);
msg('🎣 Поймана рыба!', 'hint');
const rod = getActiveItem();
if (rod && rod.id === 'fishingrod') { rod.dur -= 2; if (rod.dur <= 0) { if (G.equip.hands && G.equip.hands.id === rod.id) G.equip.hands = null; else { for (let i = 0; i < 10; i++) if (G.inv[i] && G.inv[i].id === 'fishingrod') G.inv[i] = null; } msg('Удочка сломалась!'); sfx.breakIt(); dirtyInv(); equipDirty = true; } else { hotbarDirty = true; equipDirty = true; } }
cancelFishing();
}

// === FOOD SPOILAGE ===
function tickFoodSpoilage(dt) {
if (!G) return;
let rotted = false;
let i, s;
for (i = 0; i < 10; i++) { s = G.inv[i]; if (s && isFood(s.id) && s.spoil !== undefined) { s.spoil -= dt; if (s.spoil <= 0) { G.inv[i] = { id: 'rot', n: s.n }; rotted = true; } } }
if (G.equip.backpack) {
const bpSlots = ITEMS[G.equip.backpack.id] && ITEMS[G.equip.backpack.id].backpackSlots || 6;
for (i = 0; i < bpSlots; i++) { s = G.backpackInv[i]; if (s && isFood(s.id) && s.spoil !== undefined) { s.spoil -= dt; if (s.spoil <= 0) { G.backpackInv[i] = { id: 'rot', n: s.n }; rotted = true; } } }
}
for (let ei = 0; ei < G.ents.length; ei++) {
const e = G.ents[ei];
if (e.dead || !e.inventory) continue;
if (e.type !== 'chest' && e.type !== 'icebox') continue;
const rate = e.type === 'icebox' ? ICEBOX_RATE : 1;
for (i = 0; i < e.inventory.length; i++) { s = e.inventory[i]; if (s && isFood(s.id) && s.spoil !== undefined) { s.spoil -= dt * rate; if (s.spoil <= 0) e.inventory[i] = { id: 'rot', n: s.n }; } }
}
if (rotted) { dirtyInv(); hotbarDirty = true; if (G.t - G.lastRotMsg > 5) { G.lastRotMsg = G.t; msg('🤢 Еда испортилась и превратилась в гниль. Гнилью можно топить костёр', 'warning'); sfx.breakIt(); } }
}

// === DEATH ===
const DEATH_LINES = { 'тьма': 'Тьма растерзала тебя во мраке ночи.', 'голод': 'Голод оказался сильнее воли.', 'холод': 'Зима забрала твоё тепло.', 'безумие': 'Рассудок покинул тебя.', 'мрак': 'Мрак настиг тебя.', 'гигант': 'Лось-гигант растоптал тебя.', 'огонь': 'Ты сгорел заживо.', 'свин': 'Разорван разъярёнными свинами.', 'пчела': 'Яд пчелы оказался смертельным.', 'шахматный конь': 'Механический шахматный конь сокрушил тебя.' };

function die(cause) {
const p = G.player;
p.hp = 0; state = 'dead'; G.deathCause = cause;
if (mapVisible) toggleMap();
if (chestOpen) closeChest();
$('touchUI').classList.add('hidden'); $('touchBtns').classList.add('hidden');
$('deathCause').textContent = 'Причина: ' + (DEATH_LINES[cause] || '...');
$('deathStats').innerHTML = '<div class="stat chip"><b>' + G.day + '</b><span>дней прожито</span></div><div class="stat chip"><b>' + G.stats.gather + '</b><span>ресурсов добыто</span></div><div class="stat chip"><b>' + G.stats.kills + '</b><span>существ повержено</span></div><div class="stat chip"><b>' + G.stats.crafts + '</b><span>предметов создано</span></div>';
const ds = $('deathScreen');
ds.classList.remove('hidden');
requestAnimationFrame(() => { ds.classList.remove('gone'); });
sfx.boom();
}

// === TURF (VILY) ===
function startTurfGather(tx, ty) {
const p = G.player;
const wx = tx * TILE + TILE / 2, wy = ty * TILE + TILE / 2;
const tool = getEffectiveTool();
if (!tool || tool.kind !== 'pitchfork') { msg('Нужны вилы в руках'); return; }
if (p.job) cancelJob();
p.job = { kind: 'turfGather', target: { x: wx, y: wy, tx: tx, ty: ty }, t: 0, need: 0.8, lastTick: 0 };
p.face = Math.atan2(wy - p.y, wx - p.x);
}

function placeTurf(tx, ty, turfId) {
const p = G.player;
const wx = tx * TILE + TILE / 2, wy = ty * TILE + TILE / 2;
const tool = getEffectiveTool();
if (!tool || tool.kind !== 'pitchfork') { msg('Нужны вилы в руках'); return; }
if (getTurfId(tx, ty) !== null) { msg('Здесь уже есть дёрн'); return; }
if (countInv(turfId) <= 0) { msg('Нет такого дёрна в инвентаре'); return; }
removeInv(turfId, 1);
setTurf(tx, ty, turfId);
addText(wx, wy - 20, '✅ ' + itemName(turfId), '#8fbf54');
sfx.turf(); burst(wx, wy, 8, '#8a7a5a', 50);
G.stats.gather++;
}

// === HELPER: near fire ===
function nearFire(x, y, r) {
r = r || 155;
let found = false;
forEachInRadius(x, y, r, e => {
if (e.dead) return false;
const isF = (e.type === 'campfire' && e.lit && e.fuel > 0) || (e.type === 'tree' && e.ignited);
if (isF) { found = true; return true; }
return false;
});
return found;
}

function igniteTree(t) { if (t.ignited || t.dead) return; t.ignited = true; t.burnT = 0; t.spreadT = 0; }

function newDay() {
const p = G.player;
G.tod -= DAY_LEN; G.day++; G.duskWarn = false;
const ns = seasonOf(G.day);
if (ns !== G.season) { G.season = ns; if (ns === 'winter') msg('❄ Ударила зима. Держись ближе к огню — замёрзнешь!', 'danger'); else msg('Листопад. Снова тепло.'); }
msg('Рассвет. День ' + G.day, 'day');
p.san = clamp(p.san + 10, 0, 100);
if (G.day % 8 === 7 && !G.giantAlive) G.pendingGiant = 20;
}

function spawnGiant() {
const p = G.player, a = rand(TAU);
const x = clamp(p.x + Math.cos(a) * 950, 200, W - 200), y = clamp(p.y + Math.sin(a) * 950, 200, H - 200);
ent({ type: 'giant', x: x, y: y, hp: 600, vx: 0, vy: 0, cd: 0, atk: null, walkT: 0, s: rand(100) });
G.giantAlive = true; sfx.roar(); G.shake = 14;
msg('ЗЕМЛЯ ДРОЖИТ… ЛОСЬ-ГИГАНТ ИДЁТ ЗА ТОБОЙ', 'danger');
}