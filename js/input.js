"use strict";

// === JOYSTICK ===
const joy = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
const joyBase = $('joyBase'), joyKnob = $('joyKnob'), joyZone = $('joyZone');
const JOY_R = 54;

joyZone.addEventListener('touchstart', e => {
e.preventDefault(); resumeAudio();
if (state !== 'play' || paused || mapVisible) return;
const t = e.changedTouches[0];
joy.active = true; joy.id = t.identifier;
joy.ox = t.clientX; joy.oy = t.clientY; joy.dx = 0; joy.dy = 0;
joyBase.style.left = t.clientX + 'px'; joyBase.style.top = t.clientY + 'px';
joyBase.classList.add('on'); joyKnob.style.transform = 'translate(0,0)';
}, { passive: false });

window.addEventListener('touchmove', e => {
if (!joy.active) return;
for (let i = 0; i < e.changedTouches.length; i++) {
const t = e.changedTouches[i];
if (t.identifier !== joy.id) continue;
let dx = t.clientX - joy.ox, dy = t.clientY - joy.oy;
const m = Math.hypot(dx, dy);
if (m > JOY_R) { dx = dx / m * JOY_R; dy = dy / m * JOY_R; }
joy.dx = dx / JOY_R; joy.dy = dy / JOY_R;
joyKnob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
}
}, { passive: false });

function endJoy(e) {
for (let i = 0; i < e.changedTouches.length; i++) {
const t = e.changedTouches[i];
if (joy.active && t.identifier === joy.id) {
joy.active = false; joy.dx = 0; joy.dy = 0;
joyBase.classList.remove('on');
}
}
}
window.addEventListener('touchend', endJoy);
window.addEventListener('touchcancel', endJoy);

// === CANVAS TOUCH ===
let tapInfo = null;
cv.addEventListener('touchstart', e => {
e.preventDefault(); resumeAudio();
if (state !== 'play' || paused || mapVisible) return;
const t = e.changedTouches[0];
const r = cv.getBoundingClientRect();
mouse.x = t.clientX - r.left; mouse.y = t.clientY - r.top;
tapInfo = { id: t.identifier, x: t.clientX, y: t.clientY, t: performance.now() };
}, { passive: false });

cv.addEventListener('touchmove', e => {
e.preventDefault();
const t = e.changedTouches[0];
const r = cv.getBoundingClientRect();
mouse.x = t.clientX - r.left; mouse.y = t.clientY - r.top;
}, { passive: false });

cv.addEventListener('touchend', e => {
e.preventDefault();
if (!tapInfo || mapVisible) return;
for (let i = 0; i < e.changedTouches.length; i++) {
const t = e.changedTouches[i];
if (t.identifier !== tapInfo.id) continue;
const dt = performance.now() - tapInfo.t;
const mv = Math.hypot(t.clientX - tapInfo.x, t.clientY - tapInfo.y);
const r = cv.getBoundingClientRect();
if (dt < 380 && mv < 16) {
mouse.x = t.clientX - r.left; mouse.y = t.clientY - r.top;
handleActionAt(mouse.x, mouse.y);
}
tapInfo = null;
}
}, { passive: false });

document.addEventListener('touchmove', e => {
if (e.target.closest && e.target.closest('#craftList')) return;
if (e.target.closest && e.target.closest('#mapOverlay')) return;
if (e.target.closest && e.target.closest('#chestUI')) return;
e.preventDefault();
}, { passive: false });

// === BUTTON BINDINGS ===
function bindBtn(id, fn) {
const b = $(id);
b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); resumeAudio(); fn(); }, { passive: false });
b.addEventListener('mousedown', e => { e.stopPropagation(); resumeAudio(); fn(); });
}
bindBtn('tAttack', touchAttack);
bindBtn('tTake', touchTake);
bindBtn('tCook', cookAtFire);
bindBtn('tEat', eatSelected);
bindBtn('tPlant', plantPinecone);
bindBtn('tFish', startFishing);
bindBtn('tChestStore', chestStoreItem);

// === KEYBOARD ===
window.addEventListener('keydown', e => {
resumeAudio();
if (e.code === 'Tab') { e.preventDefault(); if (state === 'play' && !mapVisible) toggleCraft(); return; }
keys[e.code] = true;
if (state !== 'play') return;
if (e.code === 'Escape') {
if (mapVisible) { toggleMap(); return; }
if (chestOpen) { closeChest(); return; }
togglePause();
}
if (e.code === 'KeyF') eatSelected();
if (e.code === 'KeyE') cookAtFire();
if (e.code === 'KeyM') { if (e.ctrlKey || e.metaKey) return; toggleMap(); }
if (e.code === 'KeyQ') dropFromSlot(G.sel);
if (e.code === 'Space') { e.preventDefault(); const t = findNearestEnemy(); if (t) { cancelJob(); aimAt(t); doSwing(t); } }
if (e.code.indexOf('Digit') === 0) { const n = +e.code.slice(5); G.sel = n === 0 ? 9 : n - 1; hotbarDirty = true; }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { if (state === 'play' && !paused && !mapVisible) togglePause(); if (chestOpen) closeChest(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && !paused && !mapVisible) togglePause(); });

// === MOUSE ===
cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
cv.addEventListener('mousedown', e => {
resumeAudio();
if (state !== 'play' || paused || mapVisible) return;
if (e.button === 2) { eatSelected(); return; }
handleActionAt(mouse.x, mouse.y);
});
cv.addEventListener('contextmenu', e => { e.preventDefault(); });
cv.addEventListener('wheel', e => { if (state !== 'play' || mapVisible) return; G.sel = (G.sel + (e.deltaY > 0 ? 1 : 9)) % 10; hotbarDirty = true; });

function handleActionAt(sx, sy) {
const wx = sx + G.cam.x, wy = sy + G.cam.y;
const held = getActiveItem();
if (held && ITEMS[held.id] && ITEMS[held.id].place) { if (tryPlaceAt(wx, wy, held)) return; }
const t = getTargetAt(wx, wy);
if (t) onClickEntity(t);
else {
if (held && held.id === 'fishingrod') {
const pond = findNearestInRadius(G.player.x, G.player.y, REACH + 60, e => e.type === 'pond' && !e.dead);
if (pond) { startFishing(); return; }
}
if (held && held.id === 'pitchfork') {
const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
const hasTurf = getTurfId(tx, ty) !== null;
if (hasTurf) startTurfGather(tx, ty);
else { const turfId = getFirstTurfInInventory(); if (turfId) placeTurf(tx, ty, turfId); else msg('Нет дёрна в инвентаре'); }
}
}
}

// === MENU BUTTONS ===
$('btnStart').addEventListener('click', () => { resumeAudio(); startGame(); });
$('btnRetry').addEventListener('click', () => { resumeAudio(); $('deathScreen').classList.add('hidden'); $('deathScreen').classList.remove('gone'); startGame(); });
$('btnResume').addEventListener('click', () => { resumeAudio(); togglePause(); });
$('btnPause').addEventListener('click', () => { resumeAudio(); togglePause(); });
$('btnCraft').addEventListener('click', () => { resumeAudio(); if (mapVisible) return; if (chestOpen) closeChest(); toggleCraft(); });
$('btnMap').addEventListener('click', () => { resumeAudio(); toggleMap(); });
$('mapCloseBtn').addEventListener('click', () => { toggleMap(); });
document.getElementById('mapOverlay').addEventListener('click', e => { if (e.target === document.getElementById('mapOverlay') || e.target === document.getElementById('mapCanvasWrap')) toggleMap(); });
$('btnMute').addEventListener('click', () => { resumeAudio(); toggleMute(); });
$('chestClose').addEventListener('click', () => { closeChest(); });
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => { setTimeout(resize, 200); });