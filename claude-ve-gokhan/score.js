// CLAUDE VE GÖKHAN (9:16, ~30s): a comic short.
// Gökhan's system is down. Claude fixes it. Gökhan: "Sistemi düzelttin, sağ ol Claude!"
// Claude: "Rica ederim!" ... then, beaming, steps back onto the big red button. Everything crashes.
// Claude fixes it again, and Gökhan puts a cup over the button.
// No TTS here: the characters "talk" in chiptune syllable blips, one blip per syllable, with the
// words in speech bubbles. Every keystroke, progress block, blip, the press and both fixes live here.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, makeChords, placeBar } = MU;

  const FPS = 30;
  const FORMAT = '9:16';
  const STYLE = 'paper';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const clock = makeClock({ bpm: 120, offset: 0.5 });
  const { T, BEAT } = clock;
  const DURATION = T(14) + 1.5;

  const ev = {
    fix1: T(4), // the first green tick
    thanks: T(5), // Gökhan says thanks
    reply: T(6, 2), // Claude: rica ederim
    backup: T(7, 2), // Claude steps back, happily
    insert: T(8, 2), // close-up on the red button
    press: T(9), // CLICK
    claudeQ: T(9, 2), // "CLAUDE?!"
    oops: T(10, 1), // "Ups... pardon!"
    retype: T(11), // frantic typing
    fix2: T(12), // the second green tick
    cup: T(12, 2), // Gökhan covers the button
    end: T(13), // end card
  };
  const S = {
    error: [0, T(2)], fixing: [T(2), ev.fix1], fixed: [ev.fix1, ev.thanks], talk: [ev.thanks, ev.backup],
    backup: [ev.backup, ev.insert], button: [ev.insert, ev.press], crash: [ev.press, ev.retype],
    refix: [ev.retype, ev.cup], outro: [ev.cup, DURATION],
  };

  const { chords, chordAt } = makeChords(clock, {
    Am: { notes: ['A3', 'C4', 'E4'], bass: 'A1' }, F: { notes: ['A3', 'C4', 'F4'], bass: 'F1' },
    G: { notes: ['B3', 'D4', 'G4'], bass: 'G1' }, E: { notes: ['G#3', 'B3', 'E4'], bass: 'E1' },
    C: { notes: ['C4', 'E4', 'G4'], bass: 'C2' }, Dm: { notes: ['A3', 'D4', 'F4'], bass: 'D2' },
  }, [
    [0, 0, 4, 'Am'], [1, 0, 4, 'E'], [2, 0, 4, 'Am'], [3, 0, 2, 'F'], [3, 2, 2, 'E'],
    [4, 0, 4, 'C'], [5, 0, 4, 'G'], [6, 0, 4, 'Am'], [7, 0, 4, 'F'], [8, 0, 4, 'G'],
    [11, 0, 2, 'Am'], [11, 2, 2, 'E'], [12, 0, 4, 'C'], [13, 0, 2, 'F'], [13, 2, 2, 'G'],
  ]);

  // Claude's keystrokes: 8ths while the error blinks, 16ths while fixing, 16ths again (frantic) on the re-fix
  const keys = [];
  clock.eachStep(0, 2, 8, (t) => keys.push(t));
  clock.eachStep(2, 4, 16, (t) => keys.push(t));
  clock.eachStep(11, 12, 16, (t) => keys.push(t));
  const typing = [[T(0, 0.5), T(4)], [ev.retype, ev.fix2]];

  // progress blocks: one per 8th, each a rising marimba note
  const scale = ['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'];
  const prog1 = []; for (let i = 0; i < 16; i++) prog1.push({ t: T(2, i / 2), midi: m(scale[i % 8]) + (i >= 8 ? 12 : 0) });
  const prog2 = []; for (let i = 0; i < 8; i++) prog2.push({ t: T(11, i / 2), midi: m(scale[i]) + 12 });

  // the alarm while the system is down: two tones, a beat each
  const siren = []; for (let b = 0; b < 8; b++) siren.push({ t: T(9, b), midi: b % 2 ? m('E5') : m('A5') });
  // the error beeps in the intro: on beats 1 and 3
  const beeps = []; for (let b = 0; b < 8; b += 2) beeps.push(T(0, b));

  // speech: one blip per syllable (Turkish vowels), 16ths, a little melody per speaker
  const VOW = /[aeıioöuüAEIİOÖUÜ]/g;
  function syllables(text) { return (text.match(VOW) || []).map((v) => v.toLowerCase()); }
  const SYL = { a: 'a', e: 'e', ı: 'e', i: 'e', o: 'o', ö: 'o', u: 'u', ü: 'u' };
  function speech(who, at, lines, { base, step = 0.5, tune }) {
    const blips = []; let k = 0;
    lines.forEach((ln, li) => {
      const syl = syllables(ln);
      syl.forEach((v, i) => {
        blips.push({ t: at + k * step * BEAT / 2 * 1, who, midi: base + tune[(k) % tune.length], syl: SYL[v] || 'a' });
        k++;
      });
      k += 1; // a breath between lines
    });
    const end = at + k * step * BEAT / 2;
    return { who, at, end, lines, blips };
  }
  const say = [
    speech('gokhan', ev.thanks, ['Sistemi düzelttin!', 'Sağ ol Claude!'], { base: m('D4'), tune: [0, 2, 4, 2, 5, 4, 0, 7, 5, 4, 2, 0] }),
    speech('claude', ev.reply, ['Rica ederim!'], { base: m('A4'), tune: [0, 4, 7, 12, 7] }),
    speech('gokhan', ev.claudeQ, ['CLAUDE?!'], { base: m('G4'), step: 1, tune: [0, 6] }),
    speech('claude', ev.oops, ['Ups...', 'Pardon!'], { base: m('E5'), step: 1, tune: [0, -3, -5] }),
  ];
  const blips = say.flatMap((s) => s.blips);

  // Claude's happy little backward hops before the press (one per beat, a pluck each)
  const hops = [T(7, 2), T(7, 3), T(8, 0), T(8, 1)];

  // the cheerful hook over the thanks (pulse lead), 8ths: [note, start8th, len8ths]
  const hook = [
    ...placeBar(clock, [['E5', 0, 1], ['G5', 1, 1], ['C6', 2, 2], ['B5', 4, 1], ['G5', 5, 1], ['E5', 6, 2]], 4),
    ...placeBar(clock, [['D5', 0, 1], ['G5', 1, 1], ['B5', 2, 2], ['A5', 4, 1], ['G5', 5, 1], ['D5', 6, 2]], 5),
    ...placeBar(clock, [['E5', 0, 1], ['G5', 1, 1], ['C6', 2, 2], ['B5', 4, 1], ['G5', 5, 1], ['E5', 6, 2]], 12),
    ...placeBar(clock, [['F5', 0, 2], ['A5', 2, 2], ['G5', 4, 1], ['B5', 5, 1], ['C6', 6, 2]], 13),
  ];

  const markers = {
    fix1: { t: ev.fix1, sync: 'av' }, // green tick + chime
    press: { t: ev.press, sync: 'av' }, // CLICK, red flash
    fix2: { t: ev.fix2, sync: 'av' }, // green tick again
    thanks: ev.thanks, reply: ev.reply, insert: ev.insert, oops: ev.oops, cup: ev.cup, end: ev.end,
  };

  const SCORE = { FPS, FORMAT, STYLE, W, H, SAFE, DURATION, clock, T, BEAT, S, m, chords, chordAt, ev, keys, typing, prog1, prog2, siren, beeps, say, blips, hops, hook, markers };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
