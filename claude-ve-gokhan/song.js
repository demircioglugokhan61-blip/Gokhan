// THE SONG: every sound comes from an event in score.js.   node song.js   (STEMS=1 writes stems, LUFS=-14 sets loudness)
// Chiptune throughout (it is a computer story): a tense minor intro under error beeps, a building fix with
// keystrokes and a rising progress scale, a bright major drop on the green tick, blip-talk, then dead
// silence, the CLICK, an alarm, a frantic re-fix and a happy ending.
const path = require('path');
const { SR, Bus, reverb } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Genre = require('./engine/audio/genres');
const U = require('./engine/util');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock, chordAt } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), lead = bus(), talk = bus(), fx = bus(), typing = bus(), verb = bus();
const buses = { drums, bass, pad, keys };

// ---------- intro: the error. Bass and arps only, error beeps ----------
Genre.play('chiptune', { clock, from: 0, to: 2, chordAt, buses, gain: 0.85, drums: false });
for (const t of sc.beeps) for (const k of [0, 0.25]) fx.addMono(I.pulse(m('A5'), 0.11, { duty: 0.5, decay: 0.02 }), t + k * BEAT, 0.3);
// ---------- fixing: drums come in, the progress scale climbs ----------
Genre.play('chiptune', { clock, from: 2, to: 4, chordAt, buses, gain: 0.8, fill: [3] });
for (const p of sc.prog1) keys.addMono(I.marimba(p.midi, { decay: 0.3 }), p.t, 0.32);
fx.addMono(I.noiseSweep(T(4) - T(3), 400, 7000, { q: 1.1, pink: true, shape: (x) => x * x }), T(3), 0.1);
// ---------- FIX 1: the tick ----------
const tick = (t, g = 1) => {
  drums.addMono(I.crash(2), t, 0.45 * g);
  fx.addMono(I.subBoom(0.7, 90, 40), t, 0.4 * g);
  for (const [n, d] of [['C6', 0], ['E6', 0.06], ['G6', 0.12]]) fx.addMono(I.bell(MUSICf(n), 1.4, 2, 3.5), t + d, 0.2 * g);
  fx.addMono(I.chipNoise('snare'), t, 0.5 * g);
};
function MUSICf(n) { return 440 * Math.pow(2, (m(n) - 69) / 12); }
tick(ev.fix1);
Genre.play('chiptune', { clock, from: 4, to: 7, chordAt, buses, gain: 1 });
// the talk bars: lighter drums so the blips sit on top
Genre.play('chiptune', { clock, from: 7, to: 8.5, chordAt, buses, gain: 0.7, drums: false });
// the hook
const L = Genre.lead('chiptune');
for (const n of sc.hook.filter((q) => q.t < T(7))) lead.addMono(L(n.midi, n.dur * 0.92), n.t, 0.14);
// Claude's backward hops: a boing-ish pluck each
sc.hops.forEach((t, i) => fx.addMono(I.pulse(m('C5') + i * 2, 0.12, { duty: 0.25, slide: 7 }), t, 0.2));
// the insert: everything thins out, a heartbeat, then an 8th of silence before the press
for (const b of [0, 1]) fx.addMono(I.heartbeat(), T(8, 2 + b), 0.5);
// ---------- THE PRESS ----------
fx.addMono(I.tvClick(), ev.press, 0.9);
fx.addMono(I.thud(70, 0.4), ev.press, 0.7);
fx.addMono(I.subBoom(1.4, 70, 30), ev.press, 0.6);
fx.addMono(I.chipNoise('kick'), ev.press, 0.8);
// the power-down: a falling pulse
fx.addMono(I.pulse(m('A5'), 0.9, { duty: 0.5, slide: -36, decay: 0.5 }), ev.press + 0.08, 0.14);
// the alarm
for (const s of sc.siren) fx.addMono(I.pulse(s.midi, BEAT * 0.9, { duty: 0.5, vib: 0.4 }), s.t, 0.05);
// a low dissonant drone under the crash
for (const n of [m('A1'), m('Bb1')]) bass.addMono(I.triangle(n, T(11) - ev.press - 0.1), ev.press + 0.05, 0.22);
// ---------- the re-fix: full speed ----------
Genre.play('chiptune', { clock, from: 11, to: 12, chordAt, buses, gain: 0.9, fill: [11] });
for (const p of sc.prog2) keys.addMono(I.marimba(p.midi, { decay: 0.25 }), p.t, 0.32);
tick(ev.fix2);
Genre.play('chiptune', { clock, from: 12, to: 14, chordAt, buses, gain: 1 });
for (const n of sc.hook.filter((q) => q.t >= T(12))) lead.addMono(L(n.midi, n.dur * 0.92), n.t, 0.14);
// the final chord
for (const n of [m('C4'), m('E4'), m('G4'), m('C5')]) lead.addMono(I.pulse(n, 1.2, { duty: 0.25, decay: 0.6 }), T(14), 0.09);
drums.addMono(I.crash(4), T(14), 0.4);
fx.addMono(I.chipNoise('kick'), T(14), 0.7);

// ---------- keystrokes ----------
sc.keys.forEach((t, i) => typing.addMono(I.woodTick(1.6 + U.hash(i, 3) * 0.6), t, 0.07 + U.hash(i, 4) * 0.03, (U.hash(i, 5) - 0.5) * 0.6));
// ---------- blip-talk ----------
for (const b of sc.blips) {
  const isC = b.who === 'claude';
  const v = I.voice(b.midi, BEAT * 0.22, { syl: b.syl, type: isC ? 'alto' : 'tenor', seed: Math.round(b.t * 100), glide: 1.5, breath: 0.05 });
  talk.addMono(v, b.t, 0.5, isC ? 0.25 : -0.25);
  talk.addMono(I.pulse(b.midi, BEAT * 0.16, { duty: isC ? 0.25 : 0.5, decay: 0.05 }), b.t, 0.07, isC ? 0.25 : -0.25);
  verb.addMono(v, b.t, 0.1);
}

// ---------- mix ----------
const room = reverb(verb, { room: 0.5, damp: 0.5 });
const music = [drums, bass, pad, keys, lead];
for (const b of music) MIX.gate(b, T(8, 2), ev.press, 0.01); // only the heartbeat under the insert
for (const b of [drums, pad, keys, lead]) MIX.gate(b, ev.press, ev.retype, 0.01); // the crash: alarm only
MIX.gate(fx, T(9) - BEAT / 2, ev.press - 0.002, 0.005); // an 8th of held breath before the click
MIX.duck(music, talk, { depth: 0.5 });
MIX.duck([fx], talk, { depth: 0.6 });
const stems = { drums, bass, pad, keys, lead, talk, fx, typing, verb: room };
const GAIN = { drums: 1, bass: 0.8, pad: 1, keys: 1, lead: 2.6, talk: 1.6, fx: 1, typing: 3, verb: 0.4 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 0.8, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: process.env.LUFS ? +process.env.LUFS : -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS`);
