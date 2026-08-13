"use strict";

// === ENTITY CONSTANTS ===
const INTERACT_OK = ['itemDrop', 'grass', 'sapling', 'berry', 'carrot', 'flint', 'stoneItem', 'campfire', 'trap', 'rabbitHole', 'science', 'drier', 'pig', 'pigking', 'pighouse', 'pinecone', 'wildhive', 'beehive', 'pond', 'chest', 'icebox', 'marble_tree', 'chess_horse'];

const TARGET_TYPES = ['itemDrop', 'grass', 'sapling', 'berry', 'carrot', 'flint', 'stoneItem', 'tree', 'rock', 'goldrock', 'rabbitHole', 'rabbit', 'spider', 'giant', 'campfire', 'trap', 'science', 'drier', 'nest', 'pig', 'pigking', 'pighouse', 'pinecone', 'wildhive', 'beehive', 'bee', 'pond', 'chest', 'icebox', 'marble_tree', 'chess_horse'];

const HITR = { tree: 38, rock: 32, goldrock: 32, grass: 24, sapling: 24, berry: 28, flint: 22, stoneItem: 20, carrot: 20, itemDrop: 26, rabbit: 24, spider: 28, giant: 100, campfire: 36, rabbitHole: 26, trap: 22, science: 40, drier: 30, nest: 30, pig: 26, pigking: 60, pighouse: 34, pinecone: 18, wildhive: 30, beehive: 30, bee: 20, pond: 60, fish: 22, chest: 30, icebox: 30, marble_tree: 38, chess_horse: 34 };

const LABELS = { tree: 'Дерево', rock: 'Валун', goldrock: 'Золотая жила', grass: 'Трава', sapling: 'Хворост', berry: 'Ягодный куст', carrot: 'Морковь', flint: 'Кремень', stoneItem: 'Камень', itemDrop: '', rabbit: 'Длиннух', spider: 'Мрак', giant: 'ЛОСЬ-ГИГАНТ', campfire: 'Костёр', rabbitHole: 'Нора', trap: 'Силок', science: 'Научная машина', drier: 'Сушилка', nest: 'Кокон пауков', pig: 'Свин', pigking: 'СВИН-КОРОЛЬ', pighouse: 'Дом свина', pinecone: 'Сосновая шишка', wildhive: 'Дикий улей', beehive: 'Улей', bee: 'Пчела', pond: 'Пруд', fish: 'Рыба', chest: 'Сундук', icebox: 'Холодильник', marble_tree: 'Мраморное дерево', chess_horse: 'Шахматный конь' };

// === FIND FUNCTIONS ===
function findNearestInteract() {
const p = G.player;
return findNearestInRadius(p.x, p.y, REACH + 50, e => {
if (e.dead) return false;
const ty = e.type;
if (INTERACT_OK.indexOf(ty) < 0) return false;
if ((ty === 'grass' || ty === 'sapling' || ty === 'berry') && !e.ready) return false;
return true;
});
}

function findNearestEnemy() {
const p = G.player;
return findNearestInRadius(p.x, p.y, REACH + 100, e => {
if (e.dead) return false;
return e.type === 'rabbit' || e.type === 'spider' || e.type === 'giant' || e.type === 'pig' || e.type === 'nest' || e.type === 'bee' || e.type === 'chess_horse';
});
}

function findNearestWork() {
const tool = getEffectiveTool();
let wants = null;
if (tool && tool.kind === 'axe') wants = ['tree'];
else if (tool && tool.kind === 'pick') wants = ['rock', 'goldrock', 'marble_tree'];
else if (tool && tool.kind === 'fishing') {
const p = G.player;
const nearPond = findNearestInRadius(p.x, p.y, REACH + 60, e => e.type === 'pond' && !e.dead);
if (nearPond) return { type: 'pond', x: nearPond.x, y: nearPond.y, dead: false };
} else if (tool && tool.kind === 'pitchfork') {
const p = G.player;
const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
const cx = tx + dx, cy = ty + dy;
const wx = cx * TILE + TILE / 2, wy = cy * TILE + TILE / 2;
const ddx = wx - p.x, ddy = wy - p.y;
if (ddx * ddx + ddy * ddy < REACH * REACH) {
const hasTurf = getTurfId(cx, cy) !== null;
const hasTurfItem = countTurfInInventory() > 0;
if (hasTurf) return { type: 'turf_gather', x: wx, y: wy, tx: cx, ty: cy };
else if (hasTurfItem) return { type: 'turf_place', x: wx, y: wy, tx: cx, ty: cy };
}
}
return null;
}
if (!wants) return null;
return findNearestInRadius(G.player.x, G.player.y, REACH + 50, e => {
if (e.dead) return false;
if (e.type === 'tree' && e.growing) return false;
return wants.indexOf(e.type) >= 0;
});
}

function getTargetAt(wx, wy) {
const p = G.player;
let best = null, bd = 1e9;
forEachInRadius(wx, wy, 100, e => {
if (e.dead || TARGET_TYPES.indexOf(e.type) < 0) return false;
const hr = (HITR[e.type] || 26) + (isTouch ? 10 : 0);
const dx = wx - e.x, dy = wy - e.y;
if (dx * dx + dy * dy > hr * hr) return false;
const reach = REACH + (e.type === 'giant' || e.type === 'pigking' ? 70 : 0);
const dpx = p.x - e.x, dpy = p.y - e.y;
if (dpx * dpx + dpy * dpy > (reach + hr) * (reach + hr)) return false;
const d = dx * dx + dy * dy;
if (d < bd) { bd = d; best = e; }
return false;
});
return best;
}

// === CLICK ENTITY (interactions) ===
function onClickEntity(t) {
let held;
if (t.type === 'turf_gather') { startTurfGather(t.tx, t.ty); return; }
if (t.type === 'turf_place') {
const turfId = getFirstTurfInInventory();
if (turfId) placeTurf(t.tx, t.ty, turfId);
else msg('Нет дёрна в инвентаре');
return;
}
switch (t.type) {
case 'grass': if (t.ready) startJob(t); break;
case 'sapling': if (t.ready) startJob(t); break;
case 'berry': if (t.ready) startJob(t); break;
case 'carrot': startJob(t); break;
case 'flint': startJob(t); break;
case 'stoneItem': startJob(t); break;
case 'pinecone': startJob(t); break;
case 'tree': {
if (t.growing) { msg('Дерево ещё растёт! Подожди.'); return; }
held = getActiveItem();
if (held && ITEMS[held.id] && ITEMS[held.id].tool && ITEMS[held.id].tool.kind === 'torch' && !t.ignited) {
t.ignited = true; t.burnT = 0; t.spreadT = 0;
sfx.ignite(); burst(t.x, t.y - 30, 10, '#ff9a3c', 90, .7);
msg('Дерево вспыхнуло! Огонь может перекинуться', 'danger');
} else startJob(t);
} break;
case 'rock': case 'goldrock': startJob(t); break;
case 'marble_tree': startJob(t); break;
case 'nest': cancelJob(); doSwing(t); break;
case 'wildhive': {
held = getActiveItem();
if (held && held.id === 'honey') { msg('Ты уже собрал мёд? Подожди, пока пчёлы сделают новый.'); return; }
if (t.honey > 0 && !t.angry) {
const hasHat = G.equip.head && ITEMS[G.equip.head.id] && ITEMS[G.equip.head.id].beeProtect;
if (hasHat) {
const honeyAmt = Math.min(t.honey, 1 + Math.floor(Math.random() * 2));
t.honey -= honeyAmt;
if (!canAdd('honey', honeyAmt)) { msgFull(); return; }
addInv('honey', honeyAmt);
addText(t.x, t.y - 34, '🍯 +' + honeyAmt + ' мёд', '#e8b83a');
sfx.pick();
msg('Собрано ' + honeyAmt + ' мёда (маска защитила от пчёл)', 'hint');
} else {
t.angry = true; t.angerT = 8;
msg('🐝 Пчёлы рассержены! Беги!', 'danger');
let bees = 0;
forEachInRadius(t.x, t.y, 300, e => { if (e.type === 'bee' && !e.dead) { bees++; return false; } });
if (bees < 6) {
for (let bi = 0; bi < 4; bi++) {
const ba = rand(TAU), br = rand(20, 80);
ent({ type: 'bee', x: t.x + Math.cos(ba) * br, y: t.y + Math.sin(ba) * br, hp: 10, hive: t, aggro: true, vx: 0, vy: 0, s: rand(100), stingT: 0 });
}
}
}
} else if (t.angry) { msg('Пчёлы злы! Подожди, пока они успокоятся.'); }
else msg('В улье нет мёда. Подожди.');
} break;
case 'beehive': {
if (!G.equip.head || !ITEMS[G.equip.head.id] || !ITEMS[G.equip.head.id].beeProtect) { msg('🐝 Надень маску пчеловода, чтобы собирать мёд!'); return; }
if (t.honey > 0) {
const ha2 = Math.min(t.honey, 1 + Math.floor(Math.random() * 2));
t.honey -= ha2;
if (!canAdd('honey', ha2)) { msgFull(); return; }
addInv('honey', ha2);
addText(t.x, t.y - 34, '🍯 +' + ha2 + ' мёд', '#e8b83a');
sfx.pick();
} else msg('Улей пуст. Пчёлы ещё не принесли мёд.');
} break;
case 'pig': {
held = getActiveItem();
const food = held && ITEMS[held.id] && ITEMS[held.id].food;
if (food) {
held.n--;
if (held.n <= 0) {
if (G.equip.hands && G.equip.hands.id === held.id) G.equip.hands = null;
else G.inv[G.sel] = null;
}
dirtyInv(); equipDirty = true;
t.followT = Math.min(180, t.followT + 40);
t.aggroT = 0;
addText(t.x, t.y - 40, 'Свин теперь за тобой!', '#ffd9a0');
sfx.oink();
if (!G.flags.pigFeed) { G.flags.pigFeed = 1; msg('Накормленный свин будет следовать за тобой и защищать тебя', 'hint'); }
} else { cancelJob(); doSwing(t); }
} break;
case 'pigking': {
held = getActiveItem();
if (held && (held.id === 'meat' || held.id === 'cookedmeat' || held.id === 'jerky')) {
const gn = held.id === 'jerky' ? 2 : 1;
held.n--;
if (held.n <= 0) {
if (G.equip.hands && G.equip.hands.id === held.id) G.equip.hands = null;
else G.inv[G.sel] = null;
}
dirtyInv(); equipDirty = true;
dropItem(t.x + rand(-20, 20), t.y + 50, 'gold', gn);
addText(t.x, t.y - 90, 'ХРЮ! +' + gn + ' золото', '#e8c23c');
sfx.oink();
if (!G.flags.kingTrade) { G.flags.kingTrade = 1; msg('Свин-король обменивает мясо на золото. Вяленое мясо даёт вдвое больше', 'hint'); }
} else msg('Свин-король принимает мясо в обмен на золото');
} break;
case 'pighouse': msg(pick(['Дом свина. Пахнет желудями.', 'Изнутри слышно хрюканье.'])); break;
case 'itemDrop':
if (!ITEMS[t.item]) { t.dead = true; G.chunkDirty = true; break; }
if (!canAdd(t.item, t.n)) { msgFull(); break; }
addInv(t.item, t.n, t.spoil);
addText(t.x, t.y - 18, '+ ' + itemName(t.item).toLowerCase());
t.dead = true; G.chunkDirty = true; G.stats.gather++; sfx.pick();
if (t.item === 'gold' && !G.flags.goldHint) { G.flags.goldHint = 1; msg('Золото! Из него строится научная машина — она откроет новые рецепты', 'hint'); }
if (t.item === 'silk' && !G.flags.silkHint) { G.flags.silkHint = 1; msg('Паутина нужна для паучьего шлема (крафт у научной машины)', 'hint'); }
if (t.item === 'pighide' && !G.flags.pigHideHint) { G.flags.pigHideHint = 1; msg('🐗 Свиная шкура — материал для рюкзака и брони', 'hint'); }
if (t.item === 'pinecone' && !G.flags.pineconeHint) { G.flags.pineconeHint = 1; msg('🌱 Шишка: топливо для костра или посади её в землю (кнопка 🌱)', 'hint'); }
if (t.item === 'honey' && !G.flags.honeyHint) { G.flags.honeyHint = 1; msg('🍯 Мёд — вкусное лакомство, восстанавливает силы!', 'hint'); }
if (t.item === 'stinger' && !G.flags.stingerHint) { G.flags.stingerHint = 1; msg('🐝 Жало — пригодится для крафта.', 'hint'); }
if (t.item.startsWith('turf_') && !G.flags.turfHint) { G.flags.turfHint = 1; msg('🌿 Это дёрн! Используй вилы, чтобы положить его на голую землю.', 'hint'); }
if (t.item === 'gear' && !G.flags.gearHint) { G.flags.gearHint = 1; msg('⚙️ Шестерня! Пригодится для холодильника.', 'hint'); }
if (t.item === 'boards' && !G.flags.boardsHint) { G.flags.boardsHint = 1; msg('🪵 Доски — материал для сундука и холодильника.', 'hint'); }
if (t.item === 'marble' && !G.flags.marbleHint) { G.flags.marbleHint = 1; msg('🪨 Мрамор! Можно скрафтить мраморную броню (научная машина).', 'hint'); }
if (t.item === 'rot' && !G.flags.rotHint) { G.flags.rotHint = 1; msg('🤢 Гниль — это бывшая еда. Ей можно топить костёр', 'hint'); }
break;
case 'campfire': {
held = getActiveItem();
const fuelVal = FUEL[held ? held.id : ''];
if (held && fuelVal) {
t.fuel = Math.min(140, t.fuel + fuelVal);
if (!t.lit && t.fuel > 0) { t.lit = true; sfx.place(); msg('Огонь разгорается'); }
held.n--;
if (held.n <= 0) {
if (G.equip.hands && G.equip.hands.id === held.id) G.equip.hands = null;
else G.inv[G.sel] = null;
}
dirtyInv(); equipDirty = true;
cancelJob();
addText(t.x, t.y - 30, '+ топливо', '#ffb75e');
burst(t.x, t.y - 16, 6, '#ff9a3c', 50);
} else msg('Костру нужно топливо: брёвна, хворост, трава, шишки, дёрн или гниль');
} break;
case 'rabbitHole': msg(pick(['Из норы пахнет длиннухом.', 'Нора пуста. Пока.', 'Кто-то шевелится внутри...'])); break;
case 'trap': msg(t.armed ? 'Силок взведён — жди добычу.' : 'Пустой силок.'); break;
case 'science': msg('Научная машина гудит. Пока ты рядом — открыты сложные рецепты.'); if (!G.flags.sciUsed) { G.flags.sciUsed = 1; msg('Загляни в крафт: появились броня, сушилка и рюкзак', 'hint'); } break;
case 'drier': {
held = getActiveItem();
if (t.meat) {
if (t.t >= DRY_T) {
if (!canAdd('jerky', 1)) { msgFull(); break; }
addInv('jerky', 1);
t.meat = false; t.t = 0;
addText(t.x, t.y - 44, '+ вяленое мясо');
sfx.pick();
} else msg('Мясо ещё сушится... (' + Math.ceil(DRY_T - t.t) + 'с)');
} else if (held && held.id === 'meat') {
t.meat = true; t.t = 0;
held.n--;
if (held.n <= 0) {
if (G.equip.hands && G.equip.hands.id === held.id) G.equip.hands = null;
else G.inv[G.sel] = null;
}
dirtyInv(); equipDirty = true;
addText(t.x, t.y - 44, 'Мясо повешено сушиться');
sfx.place();
} else msg('Выбери сырое мясо и повесь его сюда');
} break;
case 'rabbit': case 'spider': case 'giant': case 'bee': case 'chess_horse': cancelJob(); doSwing(t); break;
case 'pond':
if (getActiveItem() && getActiveItem().id === 'fishingrod') startFishing();
else msg('Пруд. Нужна удочка, чтобы ловить рыбу.');
break;
case 'fish':
if (!canAdd('fish', 1)) { msgFull(); break; }
addInv('fish', 1);
t.dead = true; G.chunkDirty = true;
addText(t.x, t.y - 20, '🐟 + рыба');
sfx.fish(); burst(t.x, t.y - 8, 8, '#3a8ab5', 70);
break;
case 'chest': if (!t.inventory) t.inventory = new Array(8).fill(null); openChest(t, '📦 СУНДУК'); break;
case 'icebox': if (!t.inventory) t.inventory = new Array(8).fill(null); openChest(t, '❄️ ХОЛОДИЛЬНИК'); break;
}
}

// === MOB UPDATE LOOPS (called from update()) ===
function updateCampfire(e, localDt) {
if (e.lit) {
e.fuel -= localDt;
if (e.fuel <= 0) {
e.fuel = 0; e.lit = false;
if (e.cooking) { msg('Костёр погас! Еда испорчена!', 'danger'); e.cooking = null; }
msg('Костёр догорел — подбрось топлива');
} else if (Math.random() < localDt * 7 && G.parts.length < MAX_PARTS) {
G.parts.push({ x: e.x + rand(-6, 6), y: e.y - 16, vx: rand(-12, 12), vy: rand(-70, -40), t: 0, max: rand(.4, .9), color: pick(['#ffb75e', '#ff8a3c', '#ffe08a']), size: rand(1.5, 3), grav: -30 });
}
}
}

function updateDrier(e, localDt) {
if (e.meat && e.t < DRY_T) {
e.t += localDt;
if (e.t >= DRY_T) { addText(e.x, e.y - 48, 'Вяленое мясо готово!', '#ffd75e'); sfx.pick(); }
}
}

function updateNest(e, localDt, d2) {
e.spT += localDt;
if (e.spT > 20) {
e.spT = 0;
let cn = 0;
forEachInRadius(e.x, e.y, 200, o => { if (o.type === 'spider' && !o.dead && o.nest === e) cn++; return false; });
if (cn < 3 && d2 > 500 * 500) ent({ type: 'spider', x: e.x + rand(-40, 40), y: e.y + rand(-40, 40), hp: 60, hx: e.x, hy: e.y, nest: e, vx: 0, vy: 0, cd: 0, wt: rand(3), tx: 0, ty: 0, aggro: false, s: rand(100) });
}
}

function updatePighouse(e, localDt) {
let alive = false;
forEachInRadius(e.x, e.y, 100, o => { if (o.type === 'pig' && !o.dead && o.house === e) { alive = true; return true; } return false; });
if (!alive) {
e.pigT += localDt;
if (e.pigT > 90) {
e.pigT = 0;
ent({ type: 'pig', x: e.x + rand(-30, 30), y: e.y + rand(-30, 30), hp: 100, hx: e.x, hy: e.y, house: e, followT: 0, aggroT: 0, cd: 0, wt: 0, tx: 0, ty: 0, vx: 0, vy: 0, s: rand(100) });
}
}
}

function updateHive(e, localDt) {
e.spawnT -= localDt;
if (e.spawnT <= 0) {
e.spawnT = rand(8, 18);
let beeCount = 0;
forEachInRadius(e.x, e.y, 200, o => { if (o.type === 'bee' && !o.dead && o.hive === e) beeCount++; return false; });
if (beeCount < 4 && !e.dead && !e.angry) {
ent({ type: 'bee', x: e.x + rand(-30, 30), y: e.y + rand(-30, 30), hp: 10, hive: e, aggro: false, vx: 0, vy: 0, s: rand(100), stingT: 0 });
}
if (!e.dead && !e.angry) {
let bees2 = 0;
forEachInRadius(e.x, e.y, 150, o => { if (o.type === 'bee' && !o.dead && o.hive === e) bees2++; return false; });
if (bees2 >= 2) e.honey = Math.min(3, e.honey + 0.5);
}
}
if (e.angry) { e.angerT -= localDt; if (e.angerT <= 0) { e.angry = false; e.angerT = 0; } }
}

function updateBurningTree(e, localDt, d2, playing) {
const p = G.player;
e.burnT += localDt;
if (Math.random() < localDt * 22 && G.parts.length < MAX_PARTS) G.parts.push({ x: e.x + rand(-10, 10), y: e.y - rand(10, 60), vx: rand(-14, 14), vy: rand(-90, -50), t: 0, max: rand(.4, .8), color: pick(['#ff6a1e', '#ffa832', '#ffe08a']), size: rand(2, 4), grav: -40 });
if (playing && d2 < 85 * 85) {
p.hp -= 9 * localDt;
G.shake = Math.max(G.shake, 1.5);
e.scT = (e.scT || 0) + localDt;
if (e.scT > 1.2) { e.scT = 0; addText(p.x, p.y - 50, 'ГОРЯЧО!', '#ff8a76'); sfx.hit(); }
if (p.hp <= 0) { die('огонь'); return true; }
}
forEachInRadius(e.x, e.y, 80, o => {
if (o.dead || (o.type !== 'rabbit' && o.type !== 'spider' && o.type !== 'pig' && o.type !== 'bee')) return false;
const dx2 = o.x - e.x, dy2 = o.y - e.y;
if (dx2 * dx2 + dy2 * dy2 < 80 * 80) {
o.hp -= 22 * localDt;
if (o.hp <= 0) {
o.dead = true; G.chunkDirty = true; G.stats.kills++;
const dropId = o.type === 'bee' ? 'stinger' : 'cookedmeat';
dropItem(o.x, o.y, dropId, 1);
addText(o.x, o.y - 20, 'Поджарился!', '#ffb75e');
burst(o.x, o.y - 6, 10, '#ff9a3c', 90, .6);
}
}
return false;
});
e.spreadT += localDt;
if (e.spreadT > 1) {
e.spreadT = 0;
let spreadOne = false;
forEachInRadius(e.x, e.y, 118, o => {
if (spreadOne) return true;
if (o.type === 'tree' && !o.dead && !o.ignited) {
const dx2 = o.x - e.x, dy2 = o.y - e.y;
if (dx2 * dx2 + dy2 * dy2 < 118 * 118 && Math.random() < .2) { igniteTree(o); spreadOne = true; return true; }
}
return false;
});
}
if (e.burnT > 7) {
e.dead = true; G.chunkDirty = true;
dropItem(e.x, e.y, 'charcoal', 1 + (Math.random() < .45 ? 1 : 0));
sfx.fall(); burst(e.x, e.y - 10, 14, '#4a4642', 90, .8);
}
return false;
}

function updateRabbit(e, localDt, d2, playing, px, py) {
e.hopT += localDt * 10;
if (playing && d2 < 150 * 150) {
const ra = Math.atan2(e.y - py, e.x - px);
e.vx += (Math.cos(ra) * 260 - e.vx) * localDt * 6;
e.vy += (Math.sin(ra) * 260 - e.vy) * localDt * 6;
} else {
e.wt -= localDt;
if (e.wt <= 0) { e.wt = rand(1.5, 4); const ra = rand(TAU), rr2 = rand(0, 90); e.tx = e.hx + Math.cos(ra) * rr2; e.ty = e.hy + Math.sin(ra) * rr2; }
const ra = Math.atan2(e.ty - e.y, e.tx - e.x);
e.vx += (Math.cos(ra) * 60 - e.vx) * localDt * 3;
e.vy += (Math.sin(ra) * 60 - e.vy) * localDt * 3;
}
e.x = clamp(e.x + e.vx * localDt, 40, W - 40);
e.y = clamp(e.y + e.vy * localDt, 40, H - 40);
forEachInRadius(e.x, e.y, 20, tr => {
if (tr.type === 'trap' && !tr.dead && tr.armed) {
const dx2 = e.x - tr.x, dy2 = e.y - tr.y;
if (dx2 * dx2 + dy2 * dy2 < 20 * 20) {
tr.dead = true; e.dead = true; G.chunkDirty = true;
dropItem(tr.x, tr.y, 'meat', 1);
msg('В силок попался длиннух!'); sfx.pick();
burst(tr.x, tr.y, 8, '#c3ad7f', 70);
return true;
}
}
return false;
});
}

function updateSpider(e, localDt, d2, playing, px, py) {
const pd = playing ? Math.sqrt(d2) : 1e9;
e.cd = Math.max(0, e.cd - localDt);
const nightish = G.phase !== 'day';
if (pd < (nightish ? 260 : 170)) e.aggro = true;
const hdx = e.x - e.hx, hdy = e.y - e.hy;
if (!e.aggro && hdx * hdx + hdy * hdy < 200 * 200 && playing) {
const pdx = px - e.hx, pdy = py - e.hy;
if (pdx * pdx + pdy * pdy < 100 * 100) e.aggro = true;
}
if (e.aggro && pd > 480) e.aggro = false;
if (e.aggro && playing) {
const ra = Math.atan2(py - e.y, px - e.x);
e.vx += (Math.cos(ra) * 135 - e.vx) * localDt * 5;
e.vy += (Math.sin(ra) * 135 - e.vy) * localDt * 5;
if (pd < 38 && e.cd <= 0) { e.cd = 1.3; hurtPlayer(12, 'мрак'); }
} else {
e.wt -= localDt;
if (e.wt <= 0) { e.wt = rand(2, 5); const ra = rand(TAU), rr2 = rand(0, 110); e.tx = e.hx + Math.cos(ra) * rr2; e.ty = e.hy + Math.sin(ra) * rr2; }
const ra = Math.atan2(e.ty - e.y, e.tx - e.x);
e.vx += (Math.cos(ra) * 45 - e.vx) * localDt * 3;
e.vy += (Math.sin(ra) * 45 - e.vy) * localDt * 3;
if (hdx * hdx + hdy * hdy > 380 * 380) { e.tx = e.hx; e.ty = e.hy; }
}
e.x = clamp(e.x + e.vx * localDt, 40, W - 40);
e.y = clamp(e.y + e.vy * localDt, 40, H - 40);
}

function updateBee(e, localDt, d2, playing, px, py) {
const pd2 = playing ? Math.sqrt(d2) : 1e9;
e.stingT = Math.max(0, e.stingT - localDt);
const angry = e.aggro || (e.hive && e.hive.angry);
let target = null;
if (angry && playing) target = { x: px, y: py };
else if (e.hive && !e.hive.dead) target = { x: e.hive.x, y: e.hive.y };
else target = { x: e.x + Math.sin(e.s + G.t * 0.3) * 40, y: e.y + Math.cos(e.s + G.t * 0.4) * 40 };
const tx = target.x, ty = target.y;
const dxB = tx - e.x, dyB = ty - e.y, distB = Math.hypot(dxB, dyB);
const speed = angry ? 160 : 80;
if (distB > 5) {
e.vx += (dxB / distB * speed - e.vx) * localDt * 4;
e.vy += (dyB / distB * speed - e.vy) * localDt * 4;
} else {
e.vx *= Math.max(0, 1 - localDt * 3);
e.vy *= Math.max(0, 1 - localDt * 3);
}
e.x = clamp(e.x + e.vx * localDt, 40, W - 40);
e.y = clamp(e.y + e.vy * localDt, 40, H - 40);
if (angry && pd2 < 28 && e.stingT <= 0 && playing) {
e.stingT = 3;
const hasHat = G.equip.head && ITEMS[G.equip.head.id] && ITEMS[G.equip.head.id].beeProtect;
if (!hasHat) { hurtPlayer(8, 'пчела'); msg('🐝 Пчела ужалила!', 'danger'); sfx.sting(); }
else msg('🐝 Маска защитила от укуса!', 'hint');
}
if (e.hive && !e.hive.angry && distB > 300) e.aggro = false;
if (e.hive && e.hive.dead) {
if (Math.random() < localDt * 0.3) {
e.hp -= 5 * localDt;
if (e.hp <= 0) { e.dead = true; G.chunkDirty = true; dropItem(e.x, e.y, 'stinger', 1); }
}
}
}

function updatePig(e, localDt, d2, playing, px, py) {
e.cd = Math.max(0, e.cd - localDt);
if (e.followT > 0) e.followT -= localDt;
if (e.aggroT > 0) e.aggroT -= localDt;
let foe = null, fd = 1e9;
forEachInRadius(e.x, e.y, 220, o => {
if (o.dead) return false;
if (o.type === 'spider' || o.type === 'giant' || o.type === 'bee' || o.type === 'chess_horse') {
const dx2 = o.x - e.x, dy2 = o.y - e.y, dx = dx2 * dx2 + dy2 * dy2;
const lim = e.followT > 0 ? 220 : 140;
if (dx < lim * lim && dx < fd) { fd = dx; foe = o; }
}
return false;
});
let mode = 'wander';
if (e.aggroT > 0) mode = 'chasePlayer';
else if (foe) mode = 'fight';
else if (e.followT > 0) mode = 'follow';
else if (G.phase === 'night') mode = 'home';
let a2;
if (mode === 'chasePlayer') {
a2 = Math.atan2(py - e.y, px - e.x);
e.vx += (Math.cos(a2) * 150 - e.vx) * localDt * 5;
e.vy += (Math.sin(a2) * 150 - e.vy) * localDt * 5;
if (d2 < 36 * 36 && e.cd <= 0 && playing) { e.cd = 1.2; hurtPlayer(20, 'свин'); }
} else if (mode === 'fight') {
a2 = Math.atan2(foe.y - e.y, foe.x - e.x);
e.vx += (Math.cos(a2) * 150 - e.vx) * localDt * 5;
e.vy += (Math.sin(a2) * 150 - e.vy) * localDt * 5;
const fdx = foe.x - e.x, fdy = foe.y - e.y;
if (fdx * fdx + fdy * fdy < 36 * 36 && e.cd <= 0) {
e.cd = 1.0; foe.hp -= 25;
addText(foe.x, foe.y - 26, '-25', '#ff8a76'); sfx.hit();
if (foe.type === 'spider') foe.aggro = true;
if (foe.type === 'bee') { foe.dead = true; G.chunkDirty = true; dropItem(foe.x, foe.y, 'stinger', 1); }
if (foe.hp <= 0) killEnt(foe);
}
} else if (mode === 'follow') {
if (d2 > 70 * 70) {
a2 = Math.atan2(py - e.y, px - e.x);
e.vx += (Math.cos(a2) * 160 - e.vx) * localDt * 5;
e.vy += (Math.sin(a2) * 160 - e.vy) * localDt * 5;
} else { e.vx *= Math.max(0, 1 - localDt * 4); e.vy *= Math.max(0, 1 - localDt * 4); }
} else if (mode === 'home') {
a2 = Math.atan2(e.hy - e.y, e.hx - e.x);
const hd = (e.x - e.hx) * (e.x - e.hx) + (e.y - e.hy) * (e.y - e.hy);
if (hd > 60 * 60) { e.vx += (Math.cos(a2) * 80 - e.vx) * localDt * 3; e.vy += (Math.sin(a2) * 80 - e.vy) * localDt * 3; }
else { e.vx *= Math.max(0, 1 - localDt * 4); e.vy *= Math.max(0, 1 - localDt * 4); }
} else {
e.wt -= localDt;
if (e.wt <= 0) { e.wt = rand(2, 5); a2 = rand(TAU); const rr2 = rand(0, 110); e.tx = e.hx + Math.cos(a2) * rr2; e.ty = e.hy + Math.sin(a2) * rr2; }
a2 = Math.atan2(e.ty - e.y, e.tx - e.x);
e.vx += (Math.cos(a2) * 50 - e.vx) * localDt * 3;
e.vy += (Math.sin(a2) * 50 - e.vy) * localDt * 3;
}
e.x = clamp(e.x + e.vx * localDt, 40, W - 40);
e.y = clamp(e.y + e.vy * localDt, 40, H - 40);
}

function updateGiant(e, localDt, d2, playing, px, py) {
if (!playing) return;
const p = G.player;
e.walkT += localDt * 4;
e.cd = Math.max(0, e.cd - localDt);
if (e.atk) {
e.atk += localDt;
if (e.atk > .7) {
if (d2 < 150 * 150) hurtPlayer(40, 'гигант');
sfx.boom(); G.shake = 18;
burst(e.x, e.y + 10, 20, '#6b5b41', 140, .7);
e.atk = null; e.cd = 2.4;
}
return;
}
const ra = Math.atan2(py - e.y, px - e.x);
e.vx += (Math.cos(ra) * 72 - e.vx) * localDt * 2;
e.vy += (Math.sin(ra) * 72 - e.vy) * localDt * 2;
e.x = clamp(e.x + e.vx * localDt, 60, W - 60);
e.y = clamp(e.y + e.vy * localDt, 60, H - 60);
if (d2 < 110 * 110 && e.cd <= 0) e.atk = .01;
forEachInRadius(e.x, e.y, 52, tt => {
if (tt.type === 'tree' && !tt.dead && !tt.ignited) {
const dx2 = tt.x - e.x, dy2 = tt.y - e.y;
if (dx2 * dx2 + dy2 * dy2 < 52 * 52) {
tt.dead = true; G.chunkDirty = true;
dropItem(tt.x, tt.y, 'wood', 2);
burst(tt.x, tt.y - 30, 10, '#3f5a32', 100);
sfx.fall();
return true;
}
}
return false;
});
if (Math.random() < localDt * .12) { addText(e.x, e.y - 140, pick(['ГРААХ!', 'ХРУМ!', 'РРРА!']), '#ff8a76'); sfx.roar(); }
}

function updateChessHorse(e, localDt, d2, playing, px, py) {
if (!playing) return;
const p = G.player;
const spd = e.spd || 120;
const aggroRange = 350 + (G.phase === 'night' ? 100 : 0);
const dmg = e.dmg || 25;
const dx = px - e.x, dy = py - e.y;
const dist = Math.sqrt(dx * dx + dy * dy);
e.cd = Math.max(0, e.cd - localDt);
e.dmgCooldown = Math.max(0, (e.dmgCooldown || 0) - localDt);
if (dist < aggroRange) e.aggro = true;
if (e.aggro) {
const angle = Math.atan2(dy, dx);
const speedMul = dist < 100 ? 1.5 : 1;
e.vx += (Math.cos(angle) * spd * speedMul - e.vx) * localDt * 4.5;
e.vy += (Math.sin(angle) * spd * speedMul - e.vy) * localDt * 4.5;
if (dist < 34 && e.cd <= 0) {
e.cd = 1.2;
hurtPlayer(dmg, 'шахматный конь');
sfx.hit(); sfx.chess();
const knockDir = Math.atan2(e.y - py, e.x - px);
p.vx += Math.cos(knockDir) * 50;
p.vy += Math.sin(knockDir) * 50;
G.shake = Math.max(G.shake, 5);
tone(450, .1, 'square', .08, -120);
}
if (dist > 700) e.aggro = false;
} else {
e.walkT = (e.walkT || 0) + localDt;
const wanderRadius = 80 + e.s * 0.3;
const tx = (e.homeX || e.x) + Math.cos(e.walkT * 0.7 + e.s) * wanderRadius;
const ty = (e.homeY || e.y) + Math.sin(e.walkT * 0.9 + e.s * 1.3) * wanderRadius * 0.6;
const da2 = Math.atan2(ty - e.y, tx - e.x);
e.vx += (Math.cos(da2) * 35 - e.vx) * localDt * 2.5;
e.vy += (Math.sin(da2) * 35 - e.vy) * localDt * 2.5;
if (!e.homeX) { e.homeX = e.x; e.homeY = e.y; }
}
e.x = clamp(e.x + e.vx * localDt, 40, W - 40);
e.y = clamp(e.y + e.vy * localDt, 40, H - 40);
if (e.aggro && Math.sin(G.t * 4) > 0.5) burst(e.x, e.y + 4, 1, 'rgba(200,200,220,0.5)', 20, 0.3);
}

// === CHEST UI ===
function openChest(chestEnt, title) {
if (chestOpen) closeChest();
chestOpen = chestEnt;
const ui = $('chestUI');
ui.classList.add('open');
const hdr = document.querySelector('#chestUI .chestHeader');
if (hdr) hdr.textContent = title || '📦 СУНДУК';
const slots = $('chestSlots');
slots.innerHTML = '';
if (!chestEnt.inventory) chestEnt.inventory = new Array(8).fill(null);
if (chestEnt.type === 'icebox' && !G.flags.iceboxHint) {
G.flags.iceboxHint = 1;
msg('❄️ В холодильнике еда портится в ' + Math.round(1 / ICEBOX_RATE) + ' раза медленнее', 'hint');
}
for (let i = 0; i < 8; i++) {
const d = document.createElement('div');
d.className = 'slot';
d.innerHTML = '<canvas width="36" height="36"></canvas><span class="cnt"></span><div class="dur" style="display:none"><i></i></div>';
(function(idx, el) {
el.addEventListener('pointerdown', function(e) {
e.stopPropagation();
resumeAudio();
const s = chestEnt.inventory[idx];
if (s) {
if (!canAdd(s.id, s.n)) { msgFull(); return; }
addInv(s.id, s.n, s.spoil);
chestEnt.inventory[idx] = null;
openChest(chestEnt, title);
} else {
const held = getHeld();
if (held) {
const sm = stackMax(held.id);
let merged = false;
for (let si = 0; si < 8; si++) {
const cs = chestEnt.inventory[si];
if (cs && cs.id === held.id && cs.n < sm) {
const add = Math.min(sm - cs.n, held.n);
if (isFood(cs.id)) cs.spoil = blendSpoil(cs.n, cs.spoil !== undefined ? cs.spoil : SPOIL_TIME[cs.id], add, held.spoil !== undefined ? held.spoil : SPOIL_TIME[cs.id]);
cs.n += add; held.n -= add;
if (held.n <= 0) break;
}
}
if (held.n > 0) chestEnt.inventory[idx] = { id: held.id, n: held.n, dur: held.dur, spoil: held.spoil };
G.inv[G.sel] = null;
let found = false;
for (let i = 0; i < 10; i++) { if (G.inv[i]) { G.sel = i; found = true; break; } }
if (!found) G.sel = -1;
hotbarDirty = true; dirtyInv();
openChest(chestEnt, title);
} else msg('Выбери предмет в инвентаре');
}
updateEquipUI(); updateHotbar();
});
})(i, d);
slots.appendChild(d);
}
updateChestUI(chestEnt);
}

function updateChestUI(chestEnt) {
const slots = $('chestSlots').children;
for (let i = 0; i < 8; i++) {
const d = slots[i];
if (!d) continue;
const s = chestEnt.inventory[i];
const c = d.querySelector('canvas').getContext('2d');
c.clearRect(0, 0, 36, 36);
const cnt = d.querySelector('.cnt');
const dur = d.querySelector('.dur');
if (s) {
drawIcon(c, s.id, 18, 18, 28);
cnt.textContent = s.n > 1 ? s.n : '';
if (dur) {
if (isFood(s.id) && s.spoil !== undefined) {
const fr = clamp(s.spoil / SPOIL_TIME[s.id], 0, 1);
dur.style.display = 'block';
dur.firstElementChild.style.width = (fr * 100) + '%';
dur.firstElementChild.style.background = spoilColor(fr);
} else dur.style.display = 'none';
}
} else { cnt.textContent = ''; if (dur) dur.style.display = 'none'; }
}
}

function closeChest() { chestOpen = null; $('chestUI').classList.remove('open'); }