"use strict";

function buildCraft() {
const list = $('craftList');
list.innerHTML = '';
RECIPES.forEach(r => {
const meta = ITEMS[r.out];
const nm = meta ? meta.name : r.out;
const d = document.createElement('div');
d.className = 'crow';
d.innerHTML = '<canvas width="38" height="38"></canvas><div><div class="cname">' + nm + '</div><div class="ccost"></div><div class="cdesc">' + (r.desc || '') + '</div></div>';
if (meta) {
const ic = d.querySelector('canvas').getContext('2d');
drawIcon(ic, r.out, 19, 19, 30);
}
d.addEventListener('click', function(e) { e.stopPropagation(); craft(r); });
list.appendChild(d);
});
}

function updateCraftUI() {
try {
const rows = $('craftList').children;
const sci = (state === 'play' && G) ? nearScience() : false;
RECIPES.forEach((r, idx) => {
const row = rows[idx];
if (!row) return;
const ok = hasRes(r.cost);
const locked = r.tier > 0 && !sci;
row.classList.toggle('no', !ok || locked);
row.classList.toggle('locked', locked);
const cc = row.querySelector('.ccost');
if (!cc) return;
cc.innerHTML = '';
if (locked) {
cc.innerHTML = '<span class="chipC miss">🔒 нужна научная машина рядом</span>';
} else {
Object.keys(r.cost).forEach(k => {
const v = r.cost[k];
const sp = document.createElement('span');
sp.className = 'chipC' + (countInv(k) >= v ? '' : ' miss');
const c = document.createElement('canvas');
c.width = 18; c.height = 18;
if (ITEMS[k]) drawIcon(c.getContext('2d'), k, 9, 9, 15);
sp.appendChild(c);
sp.appendChild(document.createTextNode('×' + v));
cc.appendChild(sp);
});
}
});
} catch (err) {}
craftDirty = false;
}

function craft(r) {
try {
if (!ITEMS[r.out]) { msg('Неизвестный рецепт'); return; }
if (r.tier > 0 && !nearScience()) { msg('Нужна научная машина поблизости'); return; }
if (!hasRes(r.cost)) { msg('Не хватает ресурсов'); return; }
if (!canAdd(r.out, 1)) {
const outMeta = ITEMS[r.out];
if (outMeta && outMeta.eqSlot) {
const slotName = outMeta.eqSlot;
if (!G.equip[slotName]) {
Object.keys(r.cost).forEach(k => { removeInv(k, r.cost[k]); });
G.equip[slotName] = { id: r.out, n: 1, dur: outMeta.tool ? outMeta.tool.dur : (outMeta.armor ? outMeta.armor.dur : undefined) };
G.stats.crafts++;
sfx.craft();
cancelJob();
dirtyInv();
equipDirty = true;
msg('Создано и надето: ' + itemName(r.out), 'hint');
updateEquipUI();
return;
}
}
msgFull();
return;
}
Object.keys(r.cost).forEach(k => { removeInv(k, r.cost[k]); });
G.stats.crafts++;
sfx.craft();
cancelJob();
const added = addInv(r.out, 1);
if (!added) {
dropItemNearPlayer(r.out, 1);
msg('Рюкзак/инвентарь полны — предмет упал на землю', 'warning');
} else {
msg('Создано: ' + itemName(r.out), 'hint');
}
if (!G.flags['p_' + r.out]) {
G.flags['p_' + r.out] = 1;
G.player.san = clamp(G.player.san + 10, 0, 100);
addText(G.player.x, G.player.y - 52, 'Новый рецепт освоен!', '#cfe4e8');
sfx.proto();
}
if (r.out === 'axe' && !G.flags.axeHint) {
G.flags.axeHint = 1;
msg('Топор в руках: кнопка справа — «рубить», «атака» бьёт врагов топором', 'hint');
}
if (r.out === 'backpack' && !G.flags.bpHint) {
G.flags.bpHint = 1;
msg('🎒 Рюкзак создан! Надень его в слот 🎒 (кнопка над горячей панелью)', 'hint');
}
if (r.out === 'fishingrod' && !G.flags.fishHint) {
G.flags.fishHint = 1;
msg('🎣 Удочка готова! Найди пруд и рыбачь.', 'hint');
}
if (r.out === 'beekeeperhat' && !G.flags.beeHint) {
G.flags.beeHint = 1;
msg('🐝 Маска пчеловода защитит от укусов пчёл.', 'hint');
}
if (r.out === 'beehive' && !G.flags.hiveHint) {
G.flags.hiveHint = 1;
msg('🍯 Улей построен! Пчёлы будут давать мёд.', 'hint');
}
if (r.out === 'pitchfork' && !G.flags.pitchforkHint) {
G.flags.pitchforkHint = 1;
msg('🔱 Вилы: кликни по земле, чтобы собрать дёрн, и ещё раз, чтобы положить (если есть дёрн в инвентаре)', 'hint');
}
} catch (err) {
msg('Ошибка крафта: ' + err.message, 'danger');
}
}