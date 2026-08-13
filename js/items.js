"use strict";
const ITEMS = {
wood: { name: 'Бревно', stack: 20 },
stone: { name: 'Камень', stack: 20 },
flint: { name: 'Кремень', stack: 20 },
gold: { name: 'Золото', stack: 20 },
charcoal: { name: 'Уголь', stack: 20 },
rope: { name: 'Верёвка', stack: 20 },
silk: { name: 'Паутина', stack: 20 },
grass: { name: 'Трава', stack: 20 },
twig: { name: 'Хворост', stack: 20 },
berry: { name: 'Ягоды', stack: 20, food: { h: 9, hp: 2, s: 2 } },
carrot: { name: 'Морковь', stack: 20, food: { h: 12, hp: 1, s: 1 } },
meat: { name: 'Сырое мясо', stack: 20, food: { h: 10, hp: 0, s: -8 } },
cookedmeat: { name: 'Жареное мясо', stack: 20, food: { h: 25, hp: 8, s: 5 } },
jerky: { name: 'Вяленое мясо', stack: 20, food: { h: 25, hp: 20, s: 15 } },
mmeat: { name: 'Мясо мрака', stack: 20, food: { h: 8, hp: -5, s: -10 } },
roastedberry: { name: 'Жареные ягоды', stack: 20, food: { h: 12, hp: 5, s: 2 } },
roastedcarrot: { name: 'Жареная морковь', stack: 20, food: { h: 16, hp: 6, s: 1 } },
axe: { name: 'Топор', stack: 1, tool: { dmg: 22, kind: 'axe', dur: 30 }, eqSlot: 'hands' },
pick: { name: 'Кирка', stack: 1, tool: { dmg: 22, kind: 'pick', dur: 35 }, eqSlot: 'hands' },
spear: { name: 'Копьё', stack: 1, tool: { dmg: 34, kind: 'weapon', dur: 40 }, eqSlot: 'hands' },
torch: { name: 'Факел', stack: 1, tool: { dmg: 14, kind: 'torch', dur: 80 }, eqSlot: 'hands' },
pitchfork: { name: 'Вилы', stack: 1, tool: { dmg: 15, kind: 'pitchfork', dur: 60 }, eqSlot: 'hands' },
ash: { name: 'Кучка пепла', stack: 20, draw: (c, x, y, s) => {
      // Тень для объема
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.beginPath();
      c.ellipse(x + s*0.15, y + s*0.35, s*0.35, s*0.12, 0, 0, Math.PI * 2);
      c.fill();
      
      // Основная масса пепла с градиентом
      const grad = c.createRadialGradient(x - s*0.15, y - s*0.15, s*0.08, x, y, s*0.55);
      grad.addColorStop(0, '#e8e8e8');
      grad.addColorStop(0.25, '#c0c0c0');
      grad.addColorStop(0.5, '#9a9a9a');
      grad.addColorStop(0.75, '#757575');
      grad.addColorStop(1, '#505050');
      
      c.fillStyle = grad;
      c.beginPath();
      // Неровная органическая форма кучки
      c.moveTo(x, y - s*0.45);
      c.bezierCurveTo(x + s*0.25, y - s*0.55, x + s*0.48, y - s*0.35, x + s*0.52, y - s*0.1);
      c.bezierCurveTo(x + s*0.58, y + s*0.15, x + s*0.45, y + s*0.38, x + s*0.25, y + s*0.48);
      c.bezierCurveTo(x + s*0.05, y + s*0.55, x - s*0.15, y + s*0.52, x - s*0.35, y + s*0.45);
      c.bezierCurveTo(x - s*0.55, y + s*0.35, x - s*0.62, y + s*0.1, x - s*0.55, y - s*0.15);
      c.bezierCurveTo(x - s*0.48, y - s*0.38, x - s*0.25, y - s*0.55, x, y - s*0.45);
      c.fill();
      
      // Детали - рассыпанные частички пепла разного размера
      const particles = [
        {x: x - s*0.35, y: y - s*0.2, r: s*0.08},
        {x: x + s*0.4, y: y - s*0.25, r: s*0.07},
        {x: x - s*0.25, y: y + s*0.35, r: s*0.09},
        {x: x + s*0.3, y: y + s*0.3, r: s*0.06},
        {x: x - s*0.45, y: y + s*0.1, r: s*0.07},
        {x: x + s*0.5, y: y + s*0.05, r: s*0.08},
        {x: x - s*0.1, y: y - s*0.4, r: s*0.06}
      ];
      
      for(let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pGrad = c.createRadialGradient(p.x - p.r*0.3, p.y - p.r*0.3, p.r*0.2, p.x, p.y, p.r);
        pGrad.addColorStop(0, '#d0d0d0');
        pGrad.addColorStop(1, '#808080');
        c.fillStyle = pGrad;
        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c.fill();
      }
      
      // Блики на поверхности для текстуры
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.beginPath();
      c.arc(x - s*0.2, y - s*0.15, s*0.08, 0, Math.PI * 2);
      c.arc(x + s*0.15, y - s*0.25, s*0.06, 0, Math.PI * 2);
      c.arc(x + s*0.25, y + s*0.1, s*0.07, 0, Math.PI * 2);
      c.fill();
      
      // Мелкие точки-искры
      c.fillStyle = 'rgba(200,200,200,0.6)';
      for(let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
        const dist = s * (0.45 + Math.random() * 0.2);
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist * 0.8;
        c.beginPath();
        c.arc(px, py, s * 0.04, 0, Math.PI * 2);
        c.fill();
      }
    } },
grasssuit: { name: 'Травяная броня', stack: 1, armor: { abs: .6, dur: 60 }, eqSlot: 'chest' },
logsuit: { name: 'Броня из брёвен', stack: 1, armor: { abs: .8, dur: 120 }, eqSlot: 'chest' },
spiderhat: { name: 'Паучий шлем', stack: 1, armor: { abs: .7, dur: 150 }, eqSlot: 'head' },
trap: { name: 'Силок', stack: 5, place: 'trap' },
campfire: { name: 'Костёр', stack: 5, place: 'campfire' },
science: { name: 'Научная машина', stack: 1, place: 'science' },
drier: { name: 'Сушилка', stack: 3, place: 'drier' },
pinecone: { name: 'Сосновая шишка', stack: 20, fuel: 12, place: 'pinecone' },
pighide: { name: 'Свиная шкура', stack: 20 },
backpack: { name: 'Рюкзак', stack: 1, eqSlot: 'backpack', backpackSlots: 6 },
leatherhat: { name: 'Кожаный шлем', stack: 1, armor: { abs: .65, dur: 100 }, eqSlot: 'head' },
pigpack: { name: 'Свиной мешок', stack: 1, eqSlot: 'backpack', backpackSlots: 8 },
fishingrod: { name: 'Удочка', stack: 1, tool: { dmg: 12, kind: 'fishing', dur: 60 }, eqSlot: 'hands' },
fish: { name: 'Сырая рыба', stack: 20, food: { h: 12, hp: 0, s: -4 } },
cookedfish: { name: 'Жареная рыба', stack: 20, food: { h: 22, hp: 6, s: 4 } },
honey: { name: 'Мёд', stack: 20, food: { h: 18, hp: 4, s: 6 } },
stinger: { name: 'Жало', stack: 20 },
beehive: { name: 'Улей', stack: 1, place: 'beehive' },
beekeeperhat: { name: 'Маска пчеловода', stack: 1, armor: { abs: .5, dur: 120 }, eqSlot: 'head', beeProtect: true },
turf_forest: { name: 'Лесной дёрн', stack: 20, fuel: 10 },
turf_grass: { name: 'Травяной дёрн', stack: 20, fuel: 10 },
turf_rocky: { name: 'Каменистый дёрн', stack: 20, fuel: 10 },
turf_marsh: { name: 'Болотный дёрн', stack: 20, fuel: 10 },
turf_savanna: { name: 'Саванный дёрн', stack: 20, fuel: 10 },
turf_village: { name: 'Деревенский дёрн', stack: 20, fuel: 10 },
turf_chess: { name: 'Шахматный дёрн', stack: 20, fuel: 10 },
boards: { name: 'Доски', stack: 20 },
gear: { name: 'Шестерня', stack: 20 },
chest: { name: 'Сундук', stack: 1, place: 'chest' },
icebox: { name: 'Холодильник', stack: 1, place: 'icebox' },
marble: { name: 'Мрамор', stack: 20 },
marble_suit: { name: 'Мраморная броня', stack: 1, armor: { abs: .85, dur: 180 }, eqSlot: 'chest' },
rot: { name: 'Гниль', stack: 20 },
comb: { name: 'Соты', stack: 20, fuel: 15 },
bugnet: { name: 'Сачок', stack: 1, tool: { dmg: 2, kind: 'net', dur: 50 }, eqSlot: 'hands' },
captured_bee: { name: 'Пчела', stack: 10 },
};

const RECIPES = [
{ out: 'axe', cost: { twig: 1, flint: 1 }, desc: 'Рубит деревья', tier: 0 },
{ out: 'pick', cost: { twig: 2, flint: 2 }, desc: 'Дробит камни', tier: 0 },
{ out: 'spear', cost: { twig: 2, flint: 2, rope: 1 }, desc: 'Оружие охотника (с верёвкой)', tier: 0 },
{ out: 'torch', cost: { twig: 2, grass: 2 }, desc: 'Свет в руке, поджигает деревья', tier: 0 },
{ out: 'pitchfork', cost: { twig: 2, flint: 2 }, desc: 'Собирает и укладывает дёрн', tier: 0 },
{ out: 'campfire', cost: { wood: 2, stone: 2, grass: 3 }, desc: 'Тепло, свет и жарка (готовит еду за ' + COOK_TIME + 'с)', tier: 0 },
{ out: 'trap', cost: { twig: 3, grass: 2 }, desc: 'Ловит длиннухов', tier: 0 },
{ out: 'rope', cost: { grass: 3 }, desc: 'Материал для брони и рюкзака', tier: 0 },
{ out: 'science', cost: { wood: 4, stone: 4, gold: 1 }, desc: 'Открывает новые рецепты рядом', tier: 0 },
{ out: 'grassetsuit', cost: { grass: 10, twig: 2 }, desc: 'Поглощает 60% урона', tier: 1 },
{ out: 'spiderhat', cost: { silk: 2, rope: 1 }, desc: 'Поглощает 70% урона', tier: 1 },
{ out: 'logsuit', cost: { wood: 8, rope: 2 }, desc: 'Поглощает 80% урона', tier: 1 },
{ out: 'drier', cost: { twig: 3, charcoal: 2, grass: 3 }, desc: 'Вялит мясо (нужен уголь)', tier: 1 },
{ out: 'backpack', cost: { grass: 6, twig: 4, rope: 2 }, desc: '🎒 +6 слотов инвентаря', tier: 1 },
{ out: 'leatherhat', cost: { pighide: 2, rope: 1 }, desc: '🛡️ Кожаный шлем (65% защиты)', tier: 1 },
{ out: 'pigpack', cost: { pighide: 3, rope: 2, twig: 2 }, desc: '🐗 Свиной мешок (+8 слотов)', tier: 1 },
{ out: 'fishingrod', cost: { twig: 2, rope: 1, silk: 1 }, desc: '🎣 Удочка — лови рыбу в прудах', tier: 1 },
{ out: 'beekeeperhat', cost: { pighide: 2, silk: 1, rope: 1 }, desc: '🐝 Маска пчеловода (защита от пчёл)', tier: 1 },
{ out: 'bugnet', cost: { twig: 2, silk: 2, rope: 1 }, desc: '🕸️ Ловит пчёл для заселения улья', tier: 1 },
{ out: 'beehive', cost: { boards: 3, comb: 1 }, desc: '🍯 Пустой улей — засели 4 пчёлами', tier: 1 },
{ out: 'boards', cost: { wood: 2 }, desc: 'Доски из брёвен (2 брёвна → 1 доска)', tier: 0 },
{ out: 'chest', cost: { boards: 4 }, desc: '📦 Сундук для хранения (8 слотов)', tier: 1 },
{ out: 'icebox', cost: { boards: 2, gear: 1, stone: 2 }, desc: '❄️ Еда в холодильнике портится в 4 раза медленнее', tier: 1 },
{ out: 'marble_suit', cost: { marble: 6, rope: 2 }, desc: '🪨 Мраморная броня (85% защиты)', tier: 1 },
];

const FUEL = { wood: 20, twig: 8, grass: 6, pinecone: 12, turf_forest: 10, turf_grass: 10, turf_rocky: 10, turf_marsh: 10, turf_savanna: 10, turf_village: 10, turf_chess: 10, boards: 25, rot: 8, comb: 15 };
const COOK_MAP = { meat: 'cookedmeat', berry: 'roastedberry', carrot: 'roastedcarrot', fish: 'cookedfish' };
const COOK_TIME_MAP = { meat: COOK_TIME, berry: COOK_TIME * 0.7, carrot: COOK_TIME * 0.7, fish: COOK_TIME * 0.9 };
const SPOIL_TIME = { berry: 1200, roastedberry: 600, carrot: 1200, roastedcarrot: 1000, meat: 800, cookedmeat: 1600, jerky: 3000, mmeat: 1600, fish: 800, cookedfish: 1600, honey: 6000 };
const ICEBOX_RATE = 0.25;

function isFood(id) { return !!(ITEMS[id] && ITEMS[id].food); }
function blendSpoil(nA, spA, nB, spB) { return (nA * spA + nB * spB) / (nA + nB); }
function spoilColor(frac) { return frac > .5 ? '#7fbf4e' : (frac > .25 ? '#e8a83c' : '#d33b2a'); }
function itemName(id) { return (ITEMS[id] && ITEMS[id].name) || id; }
function stackMax(id) { return (ITEMS[id] && ITEMS[id].stack) || 20; }