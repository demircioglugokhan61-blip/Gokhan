// THE SONG: every sound comes from an event in score.js.   node song.js   (STEMS=1 writes stems, LUFS=-14 sets loudness)
// A warm, soft comedy score: lo-fi drums, plucked guitar, electric piano, marimba and a music-box hook.
// No harsh square waves: the error "beeps" are a music box, the alarm is a soft two-note bell.
const path = require('path');
const { SR, Bus, reverb } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Genre = require('./engine/audio/genres');
const Voice = require('./engine/audio/voice');
const U = require('./engine/util');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock, chordAt } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), lead = bus(), gtr = bus(), talk = bus(), fx = bus(), typing = bus(), verb = bus();
const buses = { drums, bass, pad, keys };

// a gentle guitar: chord tones picked on 8ths
function guitarBars(from, to, gain = 0.16) {
  clock.eachStep(from, to, 8, (t, bar, step) => {
    const c = chordAt(t + 0.01); if (!c) return;
    const n = [c.notes[0], c.notes[2], c.notes[1], c.notes[2] + 12][step % 4];
    gtr.addMono(I.guitar(n, BEAT * 0.9, { bright: 0.45, sustain: 0.5, seed: Math.round(t * 50) }), t, gain, step % 2 ? 0.2 : -0.2);
  });
}
// soft e-piano chords on each chord change
function epChords(from, to, gain = 0.07) {
  for (const c of sc.chords) if (c.t0 >= T(from) && c.t0 < T(to)) for (const n of c.notes) keys.addMono(I.epiano(n, c.t1 - c.t0, { index: 0.6, decay: 1.4 }), c.t0, gain);
}

// ---------- intro: the error. E-piano + soft bass, a music-box "uh-oh" on the beeps ----------
Genre.play('lofi', { clock, from: 0, to: 2, chordAt, buses, gain: 0.5, drums: false, chords: false });
epChords(0, 2, 0.09);
for (const t of sc.beeps) { fx.addMono(I.musicBox(m('E6'), { decay: 0.5 }), t, 0.16); fx.addMono(I.musicBox(m('C6'), { decay: 0.6 }), t + BEAT / 2, 0.16); }
// ---------- fixing: drums come in, the marimba climbs ----------
Genre.play('lofi', { clock, from: 2, to: 4, chordAt, buses, gain: 0.75, chords: false });
guitarBars(2, 4, 0.12);
for (const p of sc.prog1) keys.addMono(I.marimba(p.midi, { decay: 0.35, thock: 0.3 }), p.t, 0.26);
fx.addMono(I.noiseSweep(T(4) - T(3), 300, 3500, { q: 0.8, pink: true, shape: (x) => x * x }), T(3), 0.05);
// ---------- the fix: a warm music-box arpeggio, a soft cymbal ----------
const tick = (t, g = 1) => {
  drums.addMono(I.crash(2), t, 0.22 * g);
  fx.addMono(I.subBoom(0.6, 80, 45), t, 0.25 * g);
  fx.addMono(I.marimba(m('C4'), { decay: 0.6, thock: 1 }), t, 0.4 * g);
  [['C6', 0], ['E6', 0.07], ['G6', 0.14], ['C7', 0.21]].forEach(([n, d]) => fx.addMono(I.musicBox(m(n), { decay: 1.4 }), t + d, 0.2 * g));
};
tick(ev.fix1);
Genre.play('lofi', { clock, from: 4, to: 7, chordAt, buses, gain: 0.95, chords: false });
guitarBars(4, 8.5, 0.15);
epChords(4, 9);
Genre.play('lofi', { clock, from: 7, to: 8.5, chordAt, buses, gain: 0.6, drums: false, chords: false });
// the hook on the music box, doubled softly by marimba an octave down
const hookLine = (list) => { for (const n of list) { lead.addMono(I.musicBox(n.midi, { decay: 0.8 }), n.t, 0.2); lead.addMono(I.marimba(n.midi - 12, { decay: 0.4 }), n.t, 0.1); } };
hookLine(sc.hook.filter((q) => q.t < T(7)));
// Claude's backward hops: a little marimba step each
sc.hops.forEach((t, i) => fx.addMono(I.marimba(m('C5') + [0, 2, 4, 7][i], { decay: 0.3, thock: 0.6 }), t, 0.3));
// the insert: a heartbeat, then an 8th of held breath before the press
for (const b of [0, 1]) fx.addMono(I.heartbeat(), T(8, 2 + b), 0.45);
// ---------- THE PRESS: a click, a thump, a cartoon "bwomp" down ----------
fx.addMono(I.tvClick(), ev.press, 0.7);
fx.addMono(I.thud(80, 0.35), ev.press, 0.6);
fx.addMono(I.subBoom(1.0, 70, 35), ev.press, 0.4);
fx.addMono(I.bwomp(), ev.press + 0.12, 0.3);
// the "alarm": a soft two-note bell, a beat each, with a low pad underneath
for (const s of sc.siren) fx.addMono(I.bell(440 * Math.pow(2, (s.midi - 12 - 69) / 12), 0.7, 1.2, 2), s.t, 0.07);
{ const { L, R } = I.padNote(m('A2'), T(11) - ev.press, { cutoff: 900, attack: 0.3, release: 0.4 }); pad.addStereo(L, R, ev.press + 0.1, 0.12); }
// ---------- the re-fix ----------
Genre.play('lofi', { clock, from: 11, to: 12, chordAt, buses, gain: 0.85, chords: false, fill: [11] });
guitarBars(11, 12, 0.13);
for (const p of sc.prog2) keys.addMono(I.marimba(p.midi, { decay: 0.3, thock: 0.3 }), p.t, 0.26);
tick(ev.fix2);
Genre.play('lofi', { clock, from: 12, to: 14, chordAt, buses, gain: 0.95, chords: false });
guitarBars(12, 14, 0.15);
epChords(12, 14);
hookLine(sc.hook.filter((q) => q.t >= T(12)));
// the final chord: guitar strum + music box
[m('C4'), m('E4'), m('G4'), m('C5'), m('E5')].forEach((n, i) => gtr.addMono(I.guitar(n, 1.6, { bright: 0.5, sustain: 0.8, seed: n }), T(14) + i * 0.025, 0.14));
fx.addMono(I.musicBox(m('C6'), { decay: 1.6 }), T(14), 0.18);

// ---------- keystrokes: soft ----------
sc.keys.forEach((t, i) => typing.addMono(I.woodTick(1.3 + U.hash(i, 3) * 0.4), t, 0.04 + U.hash(i, 4) * 0.02, (U.hash(i, 5) - 0.5) * 0.5));

// ---------- the voices ----------
// With a TTS engine (e.g. piper with a Turkish model: PIPER_MODEL=tr_TR-....onnx), the lines are spoken.
// Without one, each syllable is hummed on a soft marimba + low formant voice: never silent, never shrill.
const lines = sc.say.map((s) => ({ at: s.at, text: s.lines.join(' '), who: s.who, voice: s.who === 'claude' ? process.env.CLAUDE_VOICE : process.env.GOKHAN_VOICE }));
const vo = Voice.speak(lines, { out: path.join(__dirname, 'out'), length: DURATION });
if (vo.engine === 'none') {
  for (const b of sc.blips) {
    const isC = b.who === 'claude';
    const v = I.voice(b.midi - 12, BEAT * 0.24, { syl: b.syl, type: isC ? 'alto' : 'tenor', seed: Math.round(b.t * 100), glide: 1, breath: 0.08 });
    talk.addMono(v, b.t, 0.3, isC ? 0.2 : -0.2);
    talk.addMono(I.marimba(b.midi, { decay: 0.2, thock: 0.2 }), b.t, 0.12, isC ? 0.2 : -0.2);
    verb.addMono(v, b.t, 0.08);
  }
} else vo.bus.mixInto(talk, 1);

// ---------- mix ----------
for (const b of [gtr, lead, keys, fx]) b.mixInto(verb, 0.12);
const room = reverb(verb, { room: 0.6, damp: 0.6, lp: 6000 });
const music = [drums, bass, pad, keys, lead, gtr];
for (const b of [drums, bass, keys, lead, gtr]) MIX.gate(b, T(8, 2), ev.press, 0.01); // only the heartbeat under the insert
for (const b of [drums, keys, lead, gtr]) MIX.gate(b, ev.press, ev.retype, 0.01); // the crash: just the bells and the low pad
MIX.gate(fx, T(9) - BEAT / 2, ev.press - 0.002, 0.005); // an 8th of held breath before the click
MIX.duck(music, talk, { depth: 0.55 });
MIX.duck([fx], talk, { depth: 0.5 });
const stems = { drums, bass, pad, keys, lead, gtr, talk, fx, typing, verb: room };
const GAIN = { drums: 0.9, bass: 0.8, pad: 3, keys: 1.1, lead: 1.3, gtr: 9, talk: vo.engine === 'none' ? 1.6 : 2.2, fx: 1, typing: 2.5, verb: 0.35 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
MIX.highpass(mix, 35);
MIX.lofi(mix, { wow: 0.15, flutter: 0.1, lowpass: 11000, sat: 0.15 }); // takes the edge off the top end
MIX.fadeOut(mix, DURATION - 0.8, DURATION);
const res = MIX.master(mix, 0.7, undefined, { lufs: process.env.LUFS ? +process.env.LUFS : -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine}`);
