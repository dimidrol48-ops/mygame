"use strict";
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a === undefined ? Math.random() : b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const smooth = t => t * t * (3 - 2 * t);
const $ = id => document.getElementById(id);
const hexToRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return 'rgb(' + Math.round(lerp(A[0], B[0], t)) + ',' + Math.round(lerp(A[1], B[1], t)) + ',' + Math.round(lerp(A[2], B[2], t)) + ')'; };
const mulberry = seed => { return function() { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

const W = 10000, H = 10000;
const TILE = 128;
const DAY_LEN = 200, T_DAY = 110, T_DUSK = 35;
const REACH = 100;
const GATHER_T = { grass: .9, sapling: 1.1, berry: 1.35, carrot: 1.0, flint: 1.3, stoneItem: 1.2, pinecone: .6 };
const DRY_T = 40;
const CHUNK = 200;
const MAX_PARTS = 60;
const ACTIVE_R = 1100, ACTIVE2 = ACTIVE_R * ACTIVE_R;
const MAP_CHUNK_SIZE = 16;
const COOK_TIME = 10;
const FISH_TIME = 6;
const POND_MARGIN = 0.02;

function seasonOf(d) { return (((d - 1) % 16) < 8) ? 'autumn' : 'winter'; }
function phaseOf(tod) { return tod < T_DAY ? 'day' : tod < T_DAY + T_DUSK ? 'dusk' : 'night'; }
function darkAlpha() { if (!G) return 0; const t = G.tod; if (t < T_DAY) return t < 8 ? .32 * (1 - t / 8) : 0; if (t < T_DAY + T_DUSK) return .62 * smooth((t - T_DAY) / T_DUSK); const n = (t - T_DAY - T_DUSK); return n < 6 ? .62 + (0.92 - .62) * (n / 6) : .92; }

function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

function distSeg(px, py, x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy; const t = L2 ? clamp(((px - x1) * dx + (py - y1) * dy) / L2, 0, 1) : 0; const qx = px - (x1 + dx * t), qy = py - (y1 + dy * t); return Math.sqrt(qx * qx + qy * qy); }

// Global state
let state = 'menu', paused = false, G = null;
let vw = 0, vh = 0, dpr = 1, gres = 0.5;
const cv = $('game'), ctx = cv.getContext('2d');
const lightCv = document.createElement('canvas'), lctx = lightCv.getContext('2d');
const keys = {}, mouse = { x: innerWidth / 2, y: innerHeight / 2, wx: 0, wy: 0 };
let hotbarDirty = true, craftDirty = true, equipDirty = true, hoverT = null;
let fullMsgT = 0, warnHpActive = false, warnHungerActive = false;
let mapVisible = false, mapDirty = true, mapPct = 0;
let fishingActive = false, fishingProgress = 0, fishingTarget = null;
let chestOpen = null;