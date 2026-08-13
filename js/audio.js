"use strict";



let AC = null, master = null, muted = false, audioReady = false, lastResumeTime = 0;



function ensureAudio() {

if (AC || !audioReady) return;

try {

const Ctx = window.AudioContext || window.webkitAudioContext;

if (!Ctx) { muted = true; return; }

AC = new Ctx();

master = AC.createGain();

master.gain.value = .5;

master.connect(AC.destination);

if (AC.state === 'suspended') AC.resume().catch(() => {});

} catch (e) { muted = true; AC = null; }

}



function resumeAudio() {

if (!audioReady) audioReady = true;

try {

ensureAudio();

if (AC) {

const now = performance.now();

if (AC.state === 'suspended' && now - lastResumeTime > 500) {

lastResumeTime = now;

AC.resume().catch(() => {});

}

}

} catch (e) {}

}



function tone(f, dur, type, vol, slide, delay) {

if (!AC || muted || !audioReady) return;

try {

dur = dur || .12; type = type || 'sine'; vol = vol || .18; slide = slide || 0; delay = delay || 0;

const t0 = AC.currentTime + delay;

const o = AC.createOscillator(), g = AC.createGain();

o.type = type;

o.frequency.setValueAtTime(f, t0);

if (slide) o.frequency.linearRampToValueAtTime(f + slide, t0 + dur);

g.gain.setValueAtTime(vol, t0);

g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);

o.connect(g); g.connect(master);

o.start(t0); o.stop(t0 + dur + .02);

} catch (e) {}

}



function noiseB(dur, vol, fc, delay) {

if (!AC || muted || !audioReady) return;

try {

dur = dur || .12; vol = vol || .3; fc = fc || 1200; delay = delay || 0;

const t0 = AC.currentTime + delay;

const n = Math.floor(AC.sampleRate * dur), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);

for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);

const s = AC.createBufferSource(); s.buffer = b;

const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = fc;

const g = AC.createGain(); g.gain.value = vol;

s.connect(f); f.connect(g); g.connect(master);

s.start(t0);

} catch (e) {}

}



const sfx = {

swing: () => { noiseB(.07, .1, 900); },

chop: () => { noiseB(.08, .4, 800); tone(160, .07, 'square', .12, -60); },

stone: () => { noiseB(.05, .35, 2600); tone(520, .05, 'triangle', .1); },

pick: () => { tone(660, .09, 'triangle', .16); tone(990, .08, 'sine', .1, 0, .05); },

eat: () => { noiseB(.05, .2, 500); tone(220, .06, 'sine', .12, -40, .07); },

craft: () => { tone(520, .1, 'triangle', .16); tone(780, .14, 'triangle', .14, 0, .09); },

hit: () => { noiseB(.06, .35, 600); tone(140, .08, 'sawtooth', .14, -40); },

hurt: () => { tone(120, .2, 'sawtooth', .24, -50); noiseB(.1, .2, 400); },

fall: () => { noiseB(.35, .4, 300); tone(90, .3, 'sine', .2, -40); },

boom: () => { tone(60, .5, 'sine', .4, -30); noiseB(.3, .4, 220); },

roar: () => { tone(90, .7, 'sawtooth', .3, -45); noiseB(.5, .25, 500); },

sizzle: () => { noiseB(.4, .2, 3500); },

breakIt: () => { noiseB(.12, .3, 1500); tone(300, .1, 'square', .1, -150); },

place: () => { tone(200, .1, 'sine', .16, -60); noiseB(.08, .2, 700); },

heart: () => { tone(70, .1, 'sine', .3); tone(65, .09, 'sine', .22, 0, .16); },

chirp: () => { tone(2400 + rand(800), .06, 'sine', .05, 600); tone(2800 + rand(600), .05, 'sine', .04, 400, .09); },

whisper: () => { noiseB(.6, .05, 300); },

rustle: () => { noiseB(.07, .1, 650); },

ignite: () => { noiseB(.35, .35, 700); tone(120, .3, 'sine', .15, 60); },

proto: () => { tone(440, .12, 'triangle', .16); tone(660, .12, 'triangle', .15, 0, .1); tone(880, .2, 'triangle', .14, 0, .2); },

oink: () => { tone(300, .12, 'sawtooth', .14, -80); tone(240, .1, 'sawtooth', .12, -60, .1); },

lowHp: () => { tone(100, .08, 'sine', .25, -30); tone(80, .1, 'sawtooth', .15, -20, .1); },

lowHunger: () => { noiseB(.06, .15, 300); tone(200, .08, 'sine', .12, -60); },

plant: () => { tone(300, .1, 'sine', .18, -80); tone(450, .12, 'triangle', .12, 0, .08); },

fish: () => { tone(400, .08, 'triangle', .12, -100); tone(600, .12, 'sine', .14, 0, .06); noiseB(.06, .15, 800); },

bee: () => { tone(800, .04, 'sawtooth', .04); tone(900, .04, 'sawtooth', .035, 0, .04); },

sting: () => { tone(300, .06, 'sawtooth', .1, -200); tone(200, .08, 'sawtooth', .08, -100, .04); },

turf: () => { tone(120, .08, 'sawtooth', .08, -40); noiseB(.04, .15, 500); },

chess: () => { tone(450, .15, 'square', .08, -120); tone(600, .1, 'sawtooth', .06, -80, .1); },

gear: () => { tone(550, .1, 'square', .12, -100); tone(700, .08, 'sine', .1, 0, .06); },

marble_break: () => { tone(300, .12, 'sawtooth', .15, -100); noiseB(.08, .2, 800); },

};



function toggleMute() {

muted = !muted;

if (master) { try { master.gain.value = muted ? 0 : .5; } catch (e) {} }

$('btnMute').textContent = muted ? '✕' : '♪';

}
