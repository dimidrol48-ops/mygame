"use strict";

function update(dt) {
if (!G) return;
G.t += dt;
const p = G.player;
const playing = state === 'play' && !paused && !mapVisible;

if (G.chunkDirty || G.chunkTimer > 0.25) { rebuildChunks(); G.chunkDirty = false; G.chunkTimer = 0; }
G.chunkTimer += dt;

if (playing) {
G.tod += dt;
if (G.tod >= DAY_LEN) newDay();
const ph = phaseOf(G.tod);
if (ph !== G.phase) { G.phase = ph; if (ph === 'dusk') msg('Солнце садится. Готовь огонь!', 'hint'); if (ph === 'night') msg('Ночь. Тьма голодна.', 'danger'); }
if (G.pendingGiant > 0) { G.pendingGiant -= dt; if (G.pendingGiant <= 0) spawnGiant(); }
G.uiT += dt;
if (G.uiT > 0.6) { G.uiT = 0; craftDirty = true; }
const sci = nearScience();
if (sci && !G._sciNear) { G._sciNear = true; msg('Ты рядом с научной машиной: сложные рецепты открыты', 'hint'); }
if (!sci) G._sciNear = false;
if (p.moving) { const craftEl = $('craft'); if (!craftEl.classList.contains('closed')) { craftEl.classList.add('closed'); if (isTouch) $('touchBtns').style.visibility = 'visible'; G.craftWasOpen = false; } }
markExplored(p.x, p.y, 280);
}

if (playing) {
let dx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
let dy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
if (joy.active) { dx += joy.dx; dy += joy.dy; }
const joyMag = joy.active ? Math.hypot(joy.dx, joy.dy) : 0;
const m = Math.hypot(dx, dy);
p.sprint = (!!keys.ShiftLeft || joyMag > 0.93) && m > 0 && p.hunger > 5;
let spd = 175 * (p.sprint ? 1.45 : 1);
if (onRoad(p.x, p.y)) spd *= 1.3;
if (m > 0) {
const nx = dx / Math.max(1, m), ny = dy / Math.max(1, m);
const force = Math.min(1, m) * (isTouch && joy.active ? joyMag : 1);
p.vx += (nx * spd * force - p.vx) * Math.min(1, dt * 10);
p.vy += (ny * spd * force - p.vy) * Math.min(1, dt * 10);
p.moving = true;
p.walkT += dt * (p.sprint ? 13 : 9);
if (isTouch && m > 0.2) p.face = Math.atan2(ny, nx);
} else { p.moving = false; p.vx *= Math.max(0, 1 - dt * 10); p.vy *= Math.max(0, 1 - dt * 10); }
const pushed = pushOutOfPond(p.x + p.vx * dt, p.y + p.vy * dt);
p.x = pushed.x; p.y = pushed.y;
if (!isTouch) p.face = Math.atan2(mouse.wy - p.y, mouse.wx - p.x);
p.cd = Math.max(0, p.cd - dt);
p.inv = Math.max(0, p.inv - dt);
if (p.swing) { p.swing.t += dt; if (!p.swing.applied && p.swing.t >= .13) { p.swing.applied = true; applyHit(p.swing.target); } if (p.swing.t >= .3) p.swing = null; }
if (p.job) {
const j = p.job, tg = j.target;
const tool = getEffectiveTool();
const validTool = j.kind === 'gather' || (j.kind === 'chop' && tool && tool.kind === 'axe') || (j.kind === 'mine' && tool && tool.kind === 'pick') || (j.kind === 'turfGather' && tool && tool.kind === 'pitchfork');
const ddx = p.x - tg.x, ddy = p.y - tg.y;
const reachLim = REACH + 40;
if (tg.dead || !validTool || ddx * ddx + ddy * ddy > reachLim * reachLim || m > 0.15) cancelJob();
else {
p.face = Math.atan2(tg.y - p.y, tg.x - p.x);
j.t += dt;
if (j.kind === 'gather') { const tick = Math.floor(j.t / .33); if (tick !== j.lastTick) { j.lastTick = tick; sfx.rustle(); } if (j.t >= j.need) { cancelJob(); completeGather(tg); } }
else if (j.kind === 'turfGather') { if (j.t >= j.need) { cancelJob(); const turfType = getTurfId(tg.tx, tg.ty); if (turfType) { if (canAdd(turfType, 1)) { addInv(turfType, 1); setTurf(tg.tx, tg.ty, null); addText(tg.x, tg.y - 20, '+ ' + itemName(turfType), '#8fbf54'); sfx.turf(); burst(tg.x, tg.y, 8, '#8a7a5a', 50); G.stats.gather++; } else msgFull(); } else msg('Здесь нет дёрна'); } }
else { j.sw += dt; if (j.sw >= .45) { j.sw -= .45; doSwing(tg); } }
}
}
if (p.sprint && Math.random() < dt * 14 && G.parts.length < MAX_PARTS) G.parts.push({ x: p.x - p.vx * .05, y: p.y + 2, vx: rand(-15, 15), vy: rand(-25, -8), t: 0, max: .4, color: '#8a7f63', size: rand(2, 3.5), grav: 0 });
let held = getActiveItem();
let weapon = G.equip.hands;
const hasTorch = (held && held.id === 'torch') || (weapon && weapon.id === 'torch');
if (weapon && weapon.id === 'torch') { weapon.dur -= dt; if (weapon.dur <= 0) { G.equip.hands = null; dirtyInv(); equipDirty = true; msg('Факел догорел'); } else equipDirty = true; }
p.hunger = clamp(p.hunger - dt * .2 * (p.sprint ? 1.7 : 1), 0, 100);
if (p.hunger <= 0) { p.hp -= 2.2 * dt; if (p.hp <= 0) { die('голод'); return; } }
else if (p.hunger > 80 && p.hp < 100) p.hp += .6 * dt;
const lit = nearFire(p.x, p.y) || hasTorch;
const da = darkAlpha();
if (G.phase === 'night') p.san += lit ? dt * .8 : -dt * 1.1; else p.san += dt * .18;
p.san = clamp(p.san, 0, 100);
if (p.san <= 0) { p.hp -= 1.2 * dt; if (p.hp <= 0) { die('безумие'); return; } }
if (G.season === 'winter' && !lit) { p.cold = clamp(p.cold + dt / 50, 0, 1); if (p.cold >= 1) { p.hp -= 3 * dt; if (p.hp <= 0) { die('холод'); return; } } } else p.cold = clamp(p.cold - dt / 8, 0, 1);
if (da > .7 && !lit) { p.darkT += dt; if (p.darkT > 2.5) { p.hp -= 7 * dt; G.shake = Math.max(G.shake, 2.5); if (Math.random() < dt * .7) { msg('ТЬМА КУСАЕТ! Беги к свету!', 'danger'); sfx.hit(); } if (p.hp <= 0) { die('тьма'); return; } } } else p.darkT = Math.max(0, p.darkT - dt * 2);
if (!G.flags.dusk1 && G.phase === 'dusk') { G.flags.dusk1 = 1; msg('Первый закат: скрафти факел или костёр', 'hint'); }
if (p.hp < 30) { G.lowHpWarn += dt; if (G.lowHpWarn > 1.2) { G.lowHpWarn = 0; sfx.lowHp(); msg('⚠️ Здоровье на исходе!', 'warning'); } } else G.lowHpWarn = 0;
if (p.hunger < 30) { G.lowHungerWarn += dt; if (G.lowHungerWarn > 1.8) { G.lowHungerWarn = 0; sfx.lowHunger(); msg('⚠️ Голод! Срочно поешь!', 'warning'); } } else G.lowHungerWarn = 0;
}

if (playing) tickFoodSpoilage(dt);

if (fishingActive && playing) {
fishingProgress += dt;
$('fishFill').style.width = Math.min(100, fishingProgress / FISH_TIME * 100) + '%';
if (fishingProgress >= FISH_TIME) completeFishing(fishingTarget);
else if (fishingProgress > FISH_TIME * 0.3 && Math.random() < dt * 0.6) sfx.fish();
if (!fishingTarget || fishingTarget.dead) { cancelFishing(); msg('Пруд исчез!', 'warning'); }
}

for (let ei = 0; ei < G.ents.length; ei++) {
const e = G.ents[ei];
if (e.dead || e.type !== 'campfire') continue;
if (e.cooking) { e.cooking.timer += dt; if (e.cooking.timer / e.cooking.maxTime >= 1) completeCooking(e); }
}

const px = p.x, py = p.y;
for (let ei = 0; ei < G.ents.length; ei++) {
const e = G.ents[ei];
if (e.dead) continue;
const ddx = e.x - px, ddy = e.y - py;
const d2 = ddx * ddx + ddy * ddy;
const isGlobal = e.type === 'giant' || (e.type === 'pig' && (e.followT > 0 || e.aggroT > 0)) || e.type === 'chess_horse' || (e.type === 'tree' && e.growing);
if (d2 > ACTIVE2 && !isGlobal) continue;
let localDt = dt;
if (d2 > 600 * 600 && ['spider','rabbit','pig','bee','chess_horse'].indexOf(e.type) >= 0) { if (!e.lodSkip) e.lodSkip = 0; e.lodSkip++; if (e.lodSkip < 4) continue; e.lodSkip = 0; localDt = dt * 4; }

if (e.type === 'tree') { if (e.growing) { e.growTimer += localDt; if (e.growTimer >= e.growTime) { e.growing = false; e.growTimer = 0; e.hp = 66; addText(e.x, e.y - 30, '🌳 Дерево выросло!', '#8fbf54'); sfx.plant(); } } if (e.ignited) { if (updateBurningTree(e, localDt, d2, playing)) return; } }
else if (e.type === 'grass' || e.type === 'sapling' || e.type === 'berry') { if (!e.ready && G.season !== 'winter') { e.regrow -= localDt; if (e.regrow <= 0) e.ready = true; } }
else if (e.type === 'campfire') updateCampfire(e, localDt);
else if (e.type === 'drier') updateDrier(e, localDt);
else if (e.type === 'nest') updateNest(e, localDt, d2);
else if (e.type === 'pighouse') updatePighouse(e, localDt);
else if (e.type === 'wildhive' || e.type === 'beehive') updateHive(e, localDt);
else if (e.type === 'itemDrop') { if (d2 < 34 * 34 && playing && ITEMS[e.item] && canAdd(e.item, e.n)) { addInv(e.item, e.n, e.spoil); addText(e.x, e.y - 18, '+ ' + itemName(e.item).toLowerCase()); e.dead = true; G.chunkDirty = true; sfx.pick(); G.stats.gather++; } }
else if (e.type === 'rabbit') updateRabbit(e, localDt, d2, playing, px, py);
else if (e.type === 'spider') updateSpider(e, localDt, d2, playing, px, py);
else if (e.type === 'bee') updateBee(e, localDt, d2, playing, px, py);
else if (e.type === 'pig') updatePig(e, localDt, d2, playing, px, py);
else if (e.type === 'giant') updateGiant(e, localDt, d2, playing, px, py);
else if (e.type === 'chess_horse') updateChessHorse(e, localDt, d2, playing, px, py);
}

let wI = 0;
for (let ci2 = 0; ci2 < G.ents.length; ci2++) { if (!G.ents[ci2].dead) G.ents[wI++] = G.ents[ci2]; }
G.ents.length = wI;

if (playing) {
if (!G.rt) G.rt = 0;
G.rt += dt;
if (G.rt > 25) {
G.rt = 0;
let rabbits = 0, holesArr = [];
for (let j = 0; j < G.ents.length; j++) { if (G.ents[j].type === 'rabbit') rabbits++; if (G.ents[j].type === 'hole') holesArr.push(G.ents[j]); }
if (rabbits < holesArr.length && holesArr.length) { const hh = pick(holesArr); ent({ type: 'rabbit', x: hh.x, y: hh.y, hp: 10, hx: hh.x, hy: hh.y, vx: 0, vy: 0, hopT: 0, wt: 0, tx: hh.x, ty: hh.y }); }
}
}

if (G.phase === 'day') { let bf = 0; for (let bi = 0; bi < G.amb.length; bi++) if (G.amb[bi].k === 'bfly') bf++; if (bf < 8 && Math.random() < dt * .5) { const p2 = placePos(200); G.amb.push({ k: 'bfly', x: p2.x, y: p2.y, vx: 0, vy: 0, t: rand(10), col: pick(['#e8d37a', '#d8b3d8', '#cfe4e8', '#e09a6a']) }); } }
if (G.phase === 'night') { let fl = 0; for (let bi = 0; bi < G.amb.length; bi++) if (G.amb[bi].k === 'fly') fl++; if (fl < 14 && Math.random() < dt * 2) { const trees = []; forEachInRect(px - 800, py - 800, px + 800, py + 800, e => { if (e.type === 'tree') trees.push(e); }); if (trees.length) { const trr = pick(trees); G.amb.push({ k: 'fly', x: trr.x + rand(-80, 80), y: trr.y + rand(-60, 20), t: rand(10) }); } } }
for (let bi = 0; bi < G.amb.length; bi++) { const am = G.amb[bi]; am.t += dt; if (am.k === 'bfly') { am.vx += rand(-140, 140) * dt; am.vy += rand(-140, 140) * dt; am.vx = clamp(am.vx, -40, 40); am.vy = clamp(am.vy, -30, 30); am.x += am.vx * dt; am.y += am.vy * dt; if (am.t > 20) am.dead = true; } else { am.x += Math.sin(am.t * 1.3) * 12 * dt; am.y += Math.cos(am.t * .9) * 10 * dt; if (G.phase === 'day') am.dead = true; } }
let wA = 0; for (let bi = 0; bi < G.amb.length; bi++) { if (!G.amb[bi].dead) G.amb[wA++] = G.amb[bi]; } G.amb.length = wA;

for (let bi = 0; bi < G.parts.length; bi++) { const q = G.parts[bi]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.grav * dt; }
let wP = 0; for (let bi = 0; bi < G.parts.length; bi++) { if (G.parts[bi].t < G.parts[bi].max) G.parts[wP++] = G.parts[bi]; } G.parts.length = wP;

for (let bi = 0; bi < G.texts.length; bi++) G.texts[bi].t += dt;
let wT = 0; for (let bi = 0; bi < G.texts.length; bi++) { if (G.texts[bi].t < 1.4) G.texts[wT++] = G.texts[bi]; } G.texts.length = wT;

if (playing) {
G.chirpT -= dt;
if (G.chirpT <= 0) { G.chirpT = rand(5, 13); if (G.phase === 'day') sfx.chirp(); }
if (G.phase === 'night' && Math.random() < dt * .1) sfx.whisper();
if (p.hp < 25) { G.hbT -= dt; if (G.hbT <= 0) { G.hbT = .9; sfx.heart(); } }
if (p.san < 30) { G.whispT -= dt; if (G.whispT <= 0) { G.whispT = rand(4, 9); sfx.whisper(); } }
}

if (state === 'menu') { G.cam.x = clamp(W / 2 - vw / 2 + Math.cos(G.t * .08) * 260, Math.min(0, (W - vw) / 2), Math.max(0, W - vw)); G.cam.y = clamp(H / 2 - vh / 2 + Math.sin(G.t * .06) * 200, Math.min(0, (H - vh) / 2), Math.max(0, H - vh)); }
else { G.cam.x = clamp(p.x - vw / 2, 0, Math.max(0, W - vw)); G.cam.y = clamp(p.y - vh / 2, 0, Math.max(0, H - vh)); }
G.shake = Math.max(0, G.shake - dt * 22);
G.hurtFlash = Math.max(0, G.hurtFlash - dt * 2.2);
mouse.wx = mouse.x + G.cam.x; mouse.wy = mouse.y + G.cam.y;
hoverT = (state === 'play' && !paused && !mapVisible) ? getTargetAt(mouse.wx, mouse.wy) : null;

if (isTouch && state === 'play' && !mapVisible) {
G.nearWork = findNearestWork();
G.nearEnemy = findNearestEnemy();
G.nearInteract = findNearestInteract();
const hasPine = getActiveItem() && getActiveItem().id === 'pinecone';
$('tPlant').style.display = hasPine ? 'flex' : 'none';
const hasRod = getActiveItem() && getActiveItem().id === 'fishingrod';
const nearPond = findNearestInRadius(p.x, p.y, REACH + 60, e => e.type === 'pond' && !e.dead);
$('tFish').style.display = (hasRod && nearPond && !fishingActive) ? 'flex' : 'none';
}

if (hotbarDirty) updateHotbar();
if (craftDirty) updateCraftUI();
if (equipDirty) updateEquipUI();
if (chestOpen) updateChestUI(chestOpen);
}

// === MAIN LOOP & INIT ===
resize();
buildHotbar();
buildCraft();
newGame();
fitHotbar();

let last = performance.now();
function loop(now) {
const dt = Math.min(.05, (now - last) / 1000);
last = now;
try {
if (state === 'play' && !paused && !mapVisible) update(dt);
else if (state === 'play' && mapVisible) { markExplored(G.player.x, G.player.y, 280); if (mapDirty) { drawMap(); mapDirty = false; } G.t += dt; G.tod += dt; if (G.tod >= DAY_LEN) newDay(); }
else if (state === 'menu') update(dt);
draw();
if (state !== 'menu') updateHUD();
} catch (err) {
let d = document.getElementById('errBox');
if (!d) { d = document.createElement('div'); d.id = 'errBox'; d.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;max-width:92vw;background:rgba(60,10,10,.92);color:#ffd9a0;font:12px monospace;padding:8px 10px;border-radius:8px;pointer-events:none;white-space:pre-wrap;'; document.body.appendChild(d); }
d.textContent = 'Ошибка: ' + err.message;
}
requestAnimationFrame(loop);
}
requestAnimationFrame(loop);