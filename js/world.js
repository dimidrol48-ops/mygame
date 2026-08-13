"use strict";

const chunks = {};
function chunkKey(x, y) { return ((x / CHUNK) | 0) + ',' + ((y / CHUNK) | 0); }

function rebuildChunks() {
for (const k in chunks) delete chunks[k];
for (let i = 0; i < G.ents.length; i++) {
const e = G.ents[i];
if (e.dead) continue;
const k = chunkKey(e.x, e.y);
if (!chunks[k]) chunks[k] = [];
chunks[k].push(e);
}
}

function forEachInRadius(x, y, r, fn) {
const cx = (x / CHUNK) | 0, cy = (y / CHUNK) | 0, cr = Math.ceil(r / CHUNK);
for (let dx = -cr; dx <= cr; dx++) for (let dy = -cr; dy <= cr; dy++) {
const arr = chunks[(cx + dx) + ',' + (cy + dy)];
if (arr) for (let i = 0; i < arr.length; i++) {
const e = arr[i];
if (!e.dead && fn(e)) return;
}
}
}

function forEachInRect(x0, y0, x1, y1, fn) {
const cx0 = Math.max(0, (x0 / CHUNK) | 0), cy0 = Math.max(0, (y0 / CHUNK) | 0);
const cx1 = (x1 / CHUNK) | 0, cy1 = (y1 / CHUNK) | 0;
for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
const arr = chunks[cx + ',' + cy];
if (arr) for (let i = 0; i < arr.length; i++) {
const e = arr[i];
if (!e.dead) fn(e);
}
}
}

function findNearestInRadius(x, y, r, filter) {
let best = null, bd = r * r;
forEachInRadius(x, y, r, e => {
if (!filter(e)) return false;
const dx = e.x - x, dy = e.y - y, d2 = dx * dx + dy * dy;
if (d2 < bd) { bd = d2; best = e; }
return false;
});
return best;
}

function getTurfId(tx, ty) {
if (!G || !G.turfMap) return null;
const key = tx + ',' + ty;
return G.turfMap[key] || null;
}

function setTurf(tx, ty, type) {
if (!G || !G.turfMap) return;
const key = tx + ',' + ty;
if (type) G.turfMap[key] = type; else delete G.turfMap[key];
clearGround();
}

function getTurfTypeFromBiome(biome) {
switch (biome) {
case 'forests': return 'turf_forest';
case 'rocky': return 'turf_rocky';
case 'savanna': return 'turf_savanna';
case 'marsh': return 'turf_marsh';
case 'villages': return 'turf_village';
case 'chess': return 'turf_chess';
default: return 'turf_grass';
}
}

const groundTiles = {}, groundTileList = [];
function clearGround() { for (const k in groundTiles) delete groundTiles[k]; groundTileList.length = 0; }

const BIOME_COLORS = { forests: '#3a5a30', rocky: '#7a7a72', savanna: '#b8a86a', marsh: '#4a6a5a', villages: '#8a9a6a', ponds: '#3a7a8a', default: '#566b41', chess: '#6a6a7a' };

function getBiomeColor(x, y) {
if (!G || !G.biomes) return BIOME_COLORS.default;
let total = 0, r = 0, g = 0, b = 0;
const keys = Object.keys(G.biomes);
for (let ki = 0; ki < keys.length; ki++) {
const key = keys[ki], list = G.biomes[key];
if (!list) continue;
for (let i = 0; i < list.length; i++) {
const bm = list[i], dx = x - bm.x, dy = y - bm.y, dist = Math.sqrt(dx * dx + dy * dy);
const sigma = bm.r / 2.5, weight = Math.exp(-(dist * dist) / (2 * sigma * sigma));
if (weight < 0.001) continue;
const col = BIOME_COLORS[key] || BIOME_COLORS.default, rgb = hexToRgb(col);
r += rgb[0] * weight; g += rgb[1] * weight; b += rgb[2] * weight; total += weight;
}
}
if (total < 0.001) return BIOME_COLORS.default;
return 'rgb(' + Math.round(r / total) + ',' + Math.round(g / total) + ',' + Math.round(b / total) + ')';
}

function getGroundTile(tx, ty) {
const k = tx + ',' + ty;
if (groundTiles[k]) return groundTiles[k];
const S = Math.max(64, Math.round(TILE * gres));
const c = document.createElement('canvas');
c.width = S; c.height = S;
const g = c.getContext('2d');
const gsc = S / TILE;
g.scale(gsc, gsc);
g.translate(-tx * TILE, -ty * TILE);
const x0 = tx * TILE, y0 = ty * TILE;
const turfType = getTurfId(tx, ty);
let baseColor;
if (turfType) {
switch (turfType) {
case 'turf_forest': baseColor = '#3a5a30'; break;
case 'turf_rocky': baseColor = '#7a7a72'; break;
case 'turf_savanna': baseColor = '#b8a86a'; break;
case 'turf_marsh': baseColor = '#4a6a5a'; break;
case 'turf_village': baseColor = '#8a9a6a'; break;
case 'turf_chess': baseColor = '#6a6a7a'; break;
default: baseColor = '#566b41'; break;
}
} else { baseColor = '#7a6a5a'; }
g.fillStyle = baseColor;
g.fillRect(x0, y0, TILE, TILE);
if (turfType === 'turf_chess') {
g.strokeStyle = 'rgba(90,80,100,0.5)'; g.lineWidth = 2;
for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
if ((i + j) % 2 === 0) {
g.fillStyle = 'rgba(50,45,60,0.3)';
g.fillRect(x0 + i * (TILE / 8), y0 + j * (TILE / 8), TILE / 8, TILE / 8);
}
}
g.strokeStyle = 'rgba(80,70,90,0.2)'; g.lineWidth = 1;
for (let i = 0; i <= 8; i++) {
g.beginPath(); g.moveTo(x0 + i * (TILE / 8), y0); g.lineTo(x0 + i * (TILE / 8), y0 + TILE); g.stroke();
g.beginPath(); g.moveTo(x0, y0 + i * (TILE / 8)); g.lineTo(x0 + TILE, y0 + i * (TILE / 8)); g.stroke();
}
const grd = g.createRadialGradient(x0 + TILE / 2, y0 + TILE / 2, 10, x0 + TILE / 2, y0 + TILE / 2, TILE / 2);
grd.addColorStop(0, 'rgba(100,90,120,0.08)'); grd.addColorStop(1, 'rgba(100,90,120,0)');
g.fillStyle = grd; g.fillRect(x0, y0, TILE, TILE);
} else {
const cols = ['#3a5a30', '#4a6a3a', '#2d4a25', '#5a7a48', '#7a7a72', '#8a8a82', '#6a6a62', '#b8a86a', '#c8b87a', '#a8985a', '#4a6a5a', '#3a5a4a', '#8a9a6a', '#9aaa7a'];
for (let nx = tx - 1; nx <= tx + 1; nx++) for (let ny = ty - 1; ny <= ty + 1; ny++) {
const rnd = mulberry((nx * 73856093) ^ (ny * 19349663) ^ 0x1234);
for (let i = 0; i < 2; i++) {
const px = nx * TILE + rnd() * TILE, py = ny * TILE + rnd() * TILE;
g.globalAlpha = .12 + rnd() * .18;
g.fillStyle = cols[(rnd() * cols.length) | 0];
g.beginPath(); g.ellipse(px, py, 20 + rnd() * 70, 14 + rnd() * 46, rnd() * TAU, 0, TAU); g.fill();
}
const rnd2 = mulberry((nx * 73856093) ^ (ny * 19349663) ^ 0x51ab);
g.lineWidth = 1.4;
for (let i = 0; i < 20; i++) {
const bx = nx * TILE + rnd2() * TILE, by = ny * TILE + rnd2() * TILE;
g.strokeStyle = rnd2() < .5 ? 'rgba(38,52,28,.5)' : 'rgba(120,150,80,.4)';
g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (rnd2() * 6 - 3), by - (4 + rnd2() * 5)); g.stroke();
}
for (let i = 0; i < 2; i++) {
g.fillStyle = 'rgba(130,132,120,.5)';
g.beginPath(); g.arc(nx * TILE + rnd2() * TILE, ny * TILE + rnd2() * TILE, 1 + rnd2() * 1.6, 0, TAU); g.fill();
}
}
g.globalAlpha = 1;
}
if (G.roads) for (let ri = 0; ri < G.roads.length; ri++) {
const rd = G.roads[ri];
const minX = Math.min(rd.x1, rd.x2) - rd.w, maxX = Math.max(rd.x1, rd.x2) + rd.w;
const minY = Math.min(rd.y1, rd.y2) - rd.w, maxY = Math.max(rd.y1, rd.y2) + rd.w;
if (maxX < x0 || minX > x0 + TILE || maxY < y0 || minY > y0 + TILE) continue;
g.strokeStyle = '#7d7460'; g.lineWidth = rd.w; g.lineCap = 'round';
g.beginPath(); g.moveTo(rd.x1, rd.y1); g.lineTo(rd.x2, rd.y2); g.stroke();
}
if (G.cobbles) for (let ci = 0; ci < G.cobbles.length; ci++) {
const cb = G.cobbles[ci];
if (cb.x < x0 - 8 || cb.x > x0 + TILE + 8 || cb.y < y0 - 8 || cb.y > y0 + TILE + 8) continue;
g.fillStyle = cb.c;
g.beginPath(); g.ellipse(cb.x, cb.y, cb.rx, cb.ry, cb.rot, 0, TAU); g.fill();
}
if (G.puddles) for (let pi = 0; pi < G.puddles.length; pi++) {
const pd = G.puddles[pi];
if (pd.x + pd.rx < x0 || pd.x - pd.rx > x0 + TILE || pd.y + pd.ry < y0 || pd.y - pd.ry > y0 + TILE) continue;
g.fillStyle = 'rgba(30,52,58,.7)';
g.beginPath(); g.ellipse(pd.x, pd.y, pd.rx, pd.ry, pd.rot, 0, TAU); g.fill();
}
if (G.ponds) for (let po = 0; po < G.ponds.length; po++) {
const pd2 = G.ponds[po];
if (pd2.x + pd2.r < x0 || pd2.x - pd2.r > x0 + TILE || pd2.y + pd2.r < y0 || pd2.y - pd2.r > y0 + TILE) continue;
const grd = g.createRadialGradient(pd2.x, pd2.y, 2, pd2.x, pd2.y, pd2.r);
grd.addColorStop(0, 'rgba(68,148,178,.85)');
grd.addColorStop(0.6, 'rgba(48,118,148,.8)');
grd.addColorStop(1, 'rgba(28,78,108,.6)');
g.fillStyle = grd;
g.beginPath(); g.ellipse(pd2.x, pd2.y, pd2.r, pd2.r * 0.65, pd2.rot || 0, 0, TAU); g.fill();
g.strokeStyle = 'rgba(120,200,220,.25)'; g.lineWidth = 2;
g.beginPath(); g.ellipse(pd2.x - 4, pd2.y - 6, pd2.r * 0.6, pd2.r * 0.3, pd2.rot || 0, 0, TAU); g.stroke();
}
groundTiles[k] = c;
groundTileList.push(k);
if (groundTileList.length > 256) { const old = groundTileList.shift(); delete groundTiles[old]; }
return c;
}

function newGame() {
G = {
t: 0, tod: 18, day: 1, season: 'autumn', phase: 'day',
player: { x: W / 2, y: H / 2, vx: 0, vy: 0, hp: 100, hunger: 100, san: 100, face: 0, walkT: 0, moving: false, swing: null, cd: 0, cold: 0, darkT: 0, inv: 0, sprint: false, job: null },
inv: new Array(10).fill(null), sel: 0,
equip: { head: null, chest: null, hands: null, backpack: null },
backpackInv: new Array(8).fill(null),
ents: [], parts: [], texts: [], amb: [],
cam: { x: 0, y: 0 }, shake: 0, hurtFlash: 0,
stats: { gather: 0, kills: 0, crafts: 0 },
pendingGiant: 0, giantAlive: false, duskWarn: false,
hbT: 0, chirpT: 6, whispT: 0, deathCause: '', flags: {},
nearEnemy: null, nearInteract: null, nearWork: null,
_takeIco: '', _takeLab: '', uiT: 0, _sciNear: false,
forests: [], roads: [], biomes: null, king: null,
cobbles: [], puddles: [], ponds: [],
chunkDirty: true, chunkTimer: 0,
lowHpWarn: 0, lowHungerWarn: 0, craftWasOpen: false,
explored: {}, mapVisible: false, cookQueues: {},
turfMap: {}, chests: {}, lastRotMsg: 0
};
genWorld();
clearGround();
rebuildChunks();
hotbarDirty = craftDirty = equipDirty = true;
mapDirty = true;
updateMapPct();
$('msglog').innerHTML = '';
updateEquipUI();
markExplored(G.player.x, G.player.y, 500);
}

function placePos(m) { m = m || 150; return { x: rand(m, W - m), y: rand(m, H - m) }; }
function ent(o) { G.ents.push(o); G.chunkDirty = true; return o; }
function nearCenter(x, y, r) { const dx = x - W / 2, dy = y - H / 2; return dx * dx + dy * dy < r * r; }
function rockPts() { const p = []; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; p.push([Math.cos(a) * rand(13, 21), Math.sin(a) * rand(10, 16)]); } return p; }
function onRoad(x, y) { if (!G.roads) return false; for (let i = 0; i < G.roads.length; i++) { const r = G.roads[i]; if (distSeg(x, y, r.x1, r.y1, r.x2, r.y2) < r.w) return true; } return false; }

function getBiomeAt(x, y) {
if (!G || !G.biomes) return null;
const order = ['villages', 'forests', 'rocky', 'savanna', 'marsh', 'ponds', 'chess'];
for (let oi = 0; oi < order.length; oi++) {
const key = order[oi];
const list = G.biomes[key];
if (!list) continue;
for (let i = 0; i < list.length; i++) {
const b = list[i];
const dx = x - b.x, dy = y - b.y;
if (dx * dx + dy * dy < b.r * b.r) return key;
}
}
return null;
}

function genWorld() {
let i, a, r, x, y, p, n, f;
function rndPos(minC) {
for (let t2 = 0; t2 < 40; t2++) {
const xx = rand(500, W - 500), yy = rand(500, H - 500), dx = xx - W / 2, dy = yy - H / 2;
if (dx * dx + dy * dy > minC * minC) return { x: xx, y: yy };
}
return { x: rand(500, W - 500), y: rand(500, H - 500) };
}
const B = { forests: [], rocky: [], savanna: [], marsh: [], villages: [], ponds: [], chess: [] };
for (i = 0; i < 10; i++) { p = rndPos(700); B.forests.push({ x: p.x, y: p.y, r: rand(350, 550) }); }
for (i = 0; i < 5; i++) { p = rndPos(700); B.rocky.push({ x: p.x, y: p.y, r: rand(280, 400) }); }
for (i = 0; i < 5; i++) { p = rndPos(600); B.savanna.push({ x: p.x, y: p.y, r: rand(320, 460) }); }
for (i = 0; i < 5; i++) { p = rndPos(800); B.marsh.push({ x: p.x, y: p.y, r: rand(280, 400) }); }
for (i = 0; i < 5; i++) { p = rndPos(900); B.villages.push({ x: p.x, y: p.y, r: rand(160, 240) }); }
for (i = 0; i < 8; i++) { p = rndPos(500); B.ponds.push({ x: p.x, y: p.y, r: rand(80, 160) }); }
for (i = 0; i < 10; i++) {
const angle = rand(TAU); const dist = rand(1500, 3000);
const xPos = W / 2 + Math.cos(angle) * dist;
const yPos = H / 2 + Math.sin(angle) * dist;
B.chess.push({ x: xPos, y: yPos, r: rand(280, 400) });
}
const v0 = B.villages[0];
const king = { x: clamp(v0.x + rand(-1, 1) * 420, 300, W - 300), y: clamp(v0.y + rand(-1, 1) * 420, 300, H - 300) };
G.biomes = B;
G.king = king;
G.forests = B.forests;
G.roads = [{ x1: v0.x, y1: v0.y, x2: king.x, y2: king.y, w: 46 }];
for (i = 1; i < B.villages.length; i++) G.roads.push({ x1: B.villages[i].x, y1: B.villages[i].y, x2: king.x, y2: king.y, w: 46 });
G.roads.push({ x1: W / 2, y1: H / 2, x2: v0.x, y2: v0.y, w: 40 });
G.cobbles = [];
for (i = 0; i < G.roads.length; i++) {
const rd = G.roads[i];
const len = Math.sqrt((rd.x2 - rd.x1) * (rd.x2 - rd.x1) + (rd.y2 - rd.y1) * (rd.y2 - rd.y1));
const steps = Math.floor(len / 14);
const rndc = mulberry(i * 99991 + 7);
for (let s = 0; s < steps; s++) {
const tt = s / steps;
G.cobbles.push({ x: lerp(rd.x1, rd.x2, tt) + (rndc() * 2 - 1) * rd.w * .35, y: lerp(rd.y1, rd.y2, tt) + (rndc() * 2 - 1) * rd.w * .35, rx: 3 + rndc() * 3, ry: 2 + rndc() * 2, rot: rndc() * TAU, c: rndc() < .5 ? 'rgba(122,114,96,.8)' : 'rgba(96,90,76,.8)' });
}
}
G.puddles = [];
for (i = 0; i < B.marsh.length; i++) {
const mb = B.marsh[i];
for (let q = 0; q < 12; q++) {
const ma = rand(TAU), mr = rand(0, mb.r);
G.puddles.push({ x: mb.x + Math.cos(ma) * mr, y: mb.y + Math.sin(ma) * mr, rx: rand(18, 44), ry: rand(10, 24), rot: rand(TAU) });
}
}
G.ponds = [];
for (i = 0; i < B.ponds.length; i++) {
const pb = B.ponds[i];
G.ponds.push({ x: pb.x, y: pb.y, r: pb.r, rot: rand(TAU) });
for (let fi = 0; fi < 3; fi++) {
const fa = rand(TAU), fr = rand(0, pb.r * 0.7);
ent({ type: 'fish', x: pb.x + Math.cos(fa) * fr, y: pb.y + Math.sin(fa) * fr * 0.6, s: rand(100), swimT: rand(10) });
}
}
for (i = 0; i < B.ponds.length; i++) {
const pb = B.ponds[i];
ent({ type: 'pond', x: pb.x, y: pb.y, r: pb.r, rot: rand(TAU), dead: false });
}
for (let fi2 = 0; fi2 < B.forests.length; fi2++) {
f = B.forests[fi2];
n = irand(20, 28);
for (i = 0; i < n; i++) { a = rand(TAU); r = rand(0, f.r); x = f.x + Math.cos(a) * r; y = f.y + Math.sin(a) * r; if (nearCenter(x, y, 240)) continue; ent({ type: 'tree', x: x, y: y, hp: 66, s: rand(100), growing: false }); }
n = irand(5, 7);
for (i = 0; i < n; i++) { a = rand(TAU); r = rand(0, f.r * .8); x = f.x + Math.cos(a) * r; y = f.y + Math.sin(a) * r; if (nearCenter(x, y, 300)) continue; const ne = ent({ type: 'nest', x: x, y: y, hp: 150, s: rand(100), spT: rand(10) }); for (let s0 = 0; s0 < 3; s0++) ent({ type: 'spider', x: x + rand(-50, 50), y: y + rand(-50, 50), hp: 60, hx: x, hy: y, nest: ne, vx: 0, vy: 0, cd: 0, wt: rand(3), tx: 0, ty: 0, aggro: false, s: rand(100) }); }
}
for (let ri = 0; ri < B.rocky.length; ri++) {
f = B.rocky[ri];
n = irand(12, 16);
for (i = 0; i < n; i++) { a = rand(TAU); r = rand(0, f.r); x = f.x + Math.cos(a) * r; y = f.y + Math.sin(a) * r; if (nearCenter(x, y, 240)) continue; ent({ type: (Math.random() < .3 ? 'goldrock' : 'rock'), x: x, y: y, hp: 88, s: rand(100), pts: rockPts() }); }
for (i = 0; i < 18; i++) { a = rand(TAU); r = rand(0, f.r); ent({ type: Math.random() < .5 ? 'flint' : 'stoneItem', x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r, s: rand(100) }); }
}
for (let si = 0; si < B.savanna.length; si++) {
f = B.savanna[si];
for (i = 0; i < 60; i++) { a = rand(TAU); r = rand(0, f.r); ent({ type: 'grass', x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r, ready: Math.random() < .85, regrow: 0, s: rand(100) }); }
for (i = 0; i < 25; i++) { a = rand(TAU); r = rand(0, f.r); ent({ type: 'sapling', x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r, ready: Math.random() < .8, regrow: 0, s: rand(100) }); }
for (i = 0; i < 8; i++) { a = rand(TAU); r = rand(0, f.r); const ho = ent({ type: 'hole', x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r, s: rand(100) }); ent({ type: 'rabbit', x: ho.x + rand(-40, 40), y: ho.y + rand(-40, 40), hp: 10, hx: ho.x, hy: ho.y, vx: 0, vy: 0, hopT: rand(10), wt: rand(3), tx: 0, ty: 0 }); }
for (i = 0; i < 10; i++) { a = rand(TAU); r = rand(0, f.r); ent({ type: 'carrot', x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r, s: rand(100) }); }
}
for (let mi = 0; mi < B.marsh.length; mi++) {
f = B.marsh[mi];
n = irand(6, 8);
for (i = 0; i < n; i++) { a = rand(TAU); r = rand(0, f.r); x = f.x + Math.cos(a) * r; y = f.y + Math.sin(a) * r; const ne2 = ent({ type: 'nest', x: x, y: y, hp: 150, s: rand(100), spT: rand(10) }); for (let s0 = 0; s0 < 3; s0++) ent({ type: 'spider', x: x + rand(-50, 50), y: y + rand(-50, 50), hp: 60, hx: x, hy: y, nest: ne2, vx: 0, vy: 0, cd: 0, wt: rand(3), tx: 0, ty: 0, aggro: false, s: rand(100) }); }
for (i = 0; i < 12; i++) { a = rand(TAU); r = rand(0, f.r); ent({ type: 'berry', x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r, ready: true, regrow: 0, s: rand(100) }); }
for (i = 0; i < 14; i++) { a = rand(TAU); r = rand(0, f.r); ent({ type: 'sapling', x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r, ready: true, regrow: 0, s: rand(100) }); }
}
for (let vi = 0; vi < B.villages.length; vi++) {
f = B.villages[vi];
for (i = 0; i < 7; i++) { a = i / 7 * TAU + rand(-.4, .4); r = rand(70, f.r); x = f.x + Math.cos(a) * r; y = f.y + Math.sin(a) * r; const hs = ent({ type: 'pighouse', x: x, y: y, pigT: 0, s: rand(100) }); ent({ type: 'pig', x: x + rand(-30, 30), y: y + rand(-30, 30), hp: 100, hx: x, hy: y, house: hs, followT: 0, aggroT: 0, cd: 0, wt: 0, tx: 0, ty: 0, vx: 0, vy: 0, s: rand(100) }); }
for (i = 0; i < 10; i++) { a = rand(TAU); r = rand(0, f.r); ent({ type: 'flower', x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r, s: rand(100), col: pick(['#d8b3d8', '#e8d37a', '#e09a6a', '#cfd8e8']) }); }
}
ent({ type: 'pigking', x: king.x, y: king.y, s: rand(100) });
for (i = 0; i < B.forests.length; i++) {
f = B.forests[i];
for (let hi = 0; hi < 2; hi++) {
const ha = rand(TAU), hr = rand(40, f.r * 0.6);
const hx = f.x + Math.cos(ha) * hr, hy = f.y + Math.sin(ha) * hr;
if (!nearCenter(hx, hy, 300)) ent({ type: 'wildhive', x: hx, y: hy, hp: 80, honey: rand(1, 3), spawnT: rand(5), s: rand(100) });
}
}
for (let ci = 0; ci < B.chess.length; ci++) {
const biom = B.chess[ci];
for (let k = 0; k < 4; k++) {
const angle = rand(TAU); const radius = rand(0, biom.r * 0.8);
const posX = biom.x + Math.cos(angle) * radius;
const posY = biom.y + Math.sin(angle) * radius;
if (nearCenter(posX, posY, 300)) continue;
ent({ type: 'chess_horse', x: posX, y: posY, vx: 0, vy: 0, hp: 100, maxhp: 100, dmg: 25, spd: 120, cd: 0, walkT: rand(10), s: rand(100), aggro: true, dmgCooldown: 0, homeX: posX, homeY: posY });
}
}
for (let ci = 0; ci < B.chess.length; ci++) {
const biom = B.chess[ci];
const count = irand(10, 16);
for (let k = 0; k < count; k++) {
const angle = rand(TAU); const radius = rand(0, biom.r * 0.7);
const posX = biom.x + Math.cos(angle) * radius;
const posY = biom.y + Math.sin(angle) * radius;
if (nearCenter(posX, posY, 300)) continue;
ent({ type: 'marble_tree', x: posX, y: posY, hp: 88, s: rand(100), growing: false });
}
}
for (i = 0; i < 80; i++) { p = placePos(); if (!nearCenter(p.x, p.y, 240)) ent({ type: 'tree', x: p.x, y: p.y, hp: 66, s: rand(100), growing: false }); }
for (i = 0; i < 100; i++) { p = placePos(); if (!nearCenter(p.x, p.y, 200)) ent({ type: 'grass', x: p.x, y: p.y, ready: Math.random() < .85, regrow: 0, s: rand(100) }); }
for (i = 0; i < 60; i++) { p = placePos(); if (!nearCenter(p.x, p.y, 200)) ent({ type: 'sapling', x: p.x, y: p.y, ready: Math.random() < .8, regrow: 0, s: rand(100) }); }
for (i = 0; i < 60; i++) { p = placePos(); if (!nearCenter(p.x, p.y, 200)) ent({ type: 'flint', x: p.x, y: p.y, s: rand(100) }); }
for (i = 0; i < 50; i++) { p = placePos(); if (!nearCenter(p.x, p.y, 200)) ent({ type: 'stoneItem', x: p.x, y: p.y, s: rand(100) }); }
for (i = 0; i < 30; i++) { p = placePos(); if (!nearCenter(p.x, p.y, 220)) ent({ type: 'rock', x: p.x, y: p.y, hp: 88, s: rand(100), pts: rockPts() }); }
for (i = 0; i < 20; i++) { p = placePos(); if (!nearCenter(p.x, p.y, 220)) ent({ type: 'carrot', x: p.x, y: p.y, s: rand(100) }); }
for (i = 0; i < 50; i++) { p = placePos(); ent({ type: 'flower', x: p.x, y: p.y, s: rand(100), col: pick(['#d8b3d8', '#e8d37a', '#e09a6a', '#cfd8e8']) }); }
for (i = 0; i < 18; i++) { p = placePos(300); if (!nearCenter(p.x, p.y, 260)) { const ho2 = ent({ type: 'hole', x: p.x, y: p.y, s: rand(100) }); ent({ type: 'rabbit', x: ho2.x + rand(-40, 40), y: ho2.y + rand(-40, 40), hp: 10, hx: ho2.x, hy: ho2.y, vx: 0, vy: 0, hopT: rand(10), wt: rand(3), tx: 0, ty: 0 }); } }
for (i = 0; i < 8; i++) { a = rand(TAU); r = rand(280, 460); ent({ type: 'tree', x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r, hp: 66, s: rand(100), growing: false }); }
for (i = 0; i < 12; i++) { a = rand(TAU); r = rand(90, 300); ent({ type: 'flint', x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r, s: rand(100) }); }
for (i = 0; i < 10; i++) { a = rand(TAU); r = rand(90, 280); ent({ type: 'grass', x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r, ready: true, regrow: 0, s: rand(100) }); }
for (i = 0; i < 6; i++) { a = rand(TAU); r = rand(100, 260); ent({ type: 'sapling', x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r, ready: true, regrow: 0, s: rand(100) }); }
for (i = 0; i < 8; i++) { a = rand(TAU); r = rand(120, 340); ent({ type: 'stoneItem', x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r, s: rand(100) }); }
for (i = 0; i < 4; i++) { a = rand(TAU); r = rand(420, 660); ent({ type: 'goldrock', x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r, hp: 88, s: rand(100), pts: rockPts() }); }
for (let tx = 0; tx <= Math.floor(W / TILE); tx++) {
for (let ty = 0; ty <= Math.floor(H / TILE); ty++) {
const wx = tx * TILE + TILE / 2, wy = ty * TILE + TILE / 2;
const biome = getBiomeAt(wx, wy);
const turfType = getTurfTypeFromBiome(biome);
setTurf(tx, ty, turfType);
}
}
}

function isInsidePond(x, y) {
if (!G || !G.ponds) return null;
for (let i = 0; i < G.ponds.length; i++) {
const p = G.ponds[i];
const dx = x - p.x, dy = y - p.y;
const rx = p.r, ry = p.r * 0.65;
const val = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
if (val < 1) return p;
}
return null;
}

function pushOutOfPond(x, y) {
const pond = isInsidePond(x, y);
if (!pond) return { x, y };
const dx = x - pond.x, dy = y - pond.y;
const rx = pond.r, ry = pond.r * 0.65;
const angle = Math.atan2(dy, dx);
const cosA = Math.cos(angle), sinA = Math.sin(angle);
const rEllipse = 1 / Math.sqrt((cosA * cosA) / (rx * rx) + (sinA * sinA) / (ry * ry));
const outX = pond.x + cosA * rEllipse * (1 + POND_MARGIN);
const outY = pond.y + sinA * rEllipse * (1 + POND_MARGIN);
return { x: clamp(outX, 40, W - 40), y: clamp(outY, 40, H - 40) };
}