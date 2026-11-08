// THE FILM: Claude ve Gökhan. A list of shots (Shots.film); every frame is a pure function of t.
// Mouths open on the blip-talk syllables in score.js; the bubbles carry the words.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, Shots = globalThis.Shots, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const { T, ev, BEAT } = S;
  const W = G.W, H = G.H;
  const FONT = 'Bungee';

  // ---------- the cast ----------
  const CAST = {
    gokhan: { outfit: 'hoodie', shirt: '#3A6EA5', bottoms: 'pants', shorts: '#2B2B36', skin: '#D9A47E', hair: '#2A1E18', hairStyle: 'short', facialHair: 'stubble', shoes: '#F4F1EA' },
  };
  globalThis.CAST = CAST;

  // ---------- helpers ----------
  // is someone mid-syllable? -> mouth open
  const talking = (who, t) => S.blips.some((b) => b.who === who && t >= b.t - 0.02 && t < b.t + BEAT * 0.22);
  const holdEnd = (s) => { const nx = S.say.find((q) => q.at > s.at); return Math.min(s.end + 1, nx ? nx.at - 0.15 : 1e9); };
  const lineOf = (who, t) => S.say.find((s) => s.who === who && t >= s.at && t < holdEnd(s) + 0.2);
  const state = (t) => (t < T(2) ? 'error' : t < ev.fix1 ? 'fix' : t < ev.press ? 'ok' : t < ev.retype ? 'crash' : t < ev.fix2 ? 'fix2' : 'ok2');
  const lastBefore = (list, t) => { let k = -1; for (let i = 0; i < list.length; i++) if ((list[i].t ?? list[i]) <= t) k = i; return k; };

  // a multi-line speech bubble, popping in at t0
  function bubble(ctx, lines, x, y, tx, ty, t, t0, t1, { size = 64, color = '#2A2320', fill = '#FFFFFF' } = {}) {
    if (t < t0 || t > t1 + 0.2) return;
    const u = clamp((t - t0) / 0.3), out = clamp((t - t1) / 0.2);
    const sc = (0.3 + 0.7 * ease.outBack(u, 2.5)) * (1 - out * 0.4);
    const tw = Math.max(...lines.map((l) => G.measure(ctx, l, size, FONT, 400)));
    const w = tw + 90, lh = size * 1.25, h = lines.length * lh + size * 0.8;
    ctx.save(); ctx.globalAlpha *= clamp(u * 4) * (1 - out);
    ctx.translate(x, y); ctx.scale(sc, sc);
    const seed = Math.round(t0 * 10);
    const ax = (tx - x) / sc, ay = (ty - y) / sc;
    G.poly(ctx, [[-30, h / 2 - 6], [ax * 0.6, ay * 0.6], [26, h / 2 - 6]], { fill, lw: 5, seed: seed + 1 });
    G.rrect(ctx, -w / 2, -h / 2, w, h, 40, { fill, lw: 5.5, seed });
    ctx.fillStyle = fill; ctx.fillRect(-34, h / 2 - 16, 64, 16);
    lines.forEach((l, i) => G.text(ctx, l, 0, -h / 2 + size * 0.4 + lh * i + size * 0.85, { size, align: 'center', fam: FONT, weight: 400, color }));
    ctx.restore();
  }

  // ---------- the monitor's screen, in 800×520 local units ----------
  function screen(ctx, x, y, w, h, t) {
    const st = state(t);
    ctx.save(); ctx.translate(x, y); ctx.scale(w / 800, h / 520);
    ctx.beginPath(); ctx.rect(0, 0, 800, 520); ctx.clip();
    if (st === 'error') {
      const k = lastBefore(S.beeps, t), blink = k >= 0 && (t - S.beeps[k]) < BEAT * 0.6;
      ctx.fillStyle = blink ? '#D7332B' : '#8E1F1A'; ctx.fillRect(0, 0, 800, 520);
      G.text(ctx, '⚠', 400, 210, { size: 150, align: 'center', color: '#FFE45C', boil: false });
      G.text(ctx, 'HATA!', 400, 360, { size: 120, align: 'center', fam: FONT, weight: 400, color: '#FFFFFF', boil: false });
      G.text(ctx, 'SİSTEM ÇALIŞMIYOR', 400, 450, { size: 46, align: 'center', fam: FONT, weight: 400, color: '#FFD2CC', boil: false });
    } else if (st === 'fix' || st === 'fix2') {
      ctx.fillStyle = '#151A26'; ctx.fillRect(0, 0, 800, 520);
      const t0 = st === 'fix' ? T(0, 0.5) : ev.retype;
      const nk = S.keys.filter((k) => k >= t0 && k <= t).length;
      const CODE = ['$ claude fix --sistem', '> hata bulundu: satır 42', '> modül yeniden yükleniyor', '> bağlantılar onarılıyor', '> testler: ✓ ✓ ✓ ✓', '> önbellek temizlendi', '> neredeyse bitti...'];
      const shown = st === 'fix' ? Math.min(CODE.length, 1 + Math.floor(nk / 6)) : Math.min(CODE.length, 1 + Math.floor(nk / 2.5));
      for (let i = 0; i < shown; i++) {
        const s = CODE[i], cut = i === shown - 1 ? Math.min(s.length, 4 + (nk % 6) * 5) : s.length;
        G.text(ctx, s.slice(0, cut), 40, 70 + i * 46, { size: 32, color: i === 0 ? '#9BE58C' : '#C9D3E8', fam: 'monospace', boil: false });
      }
      // the progress bar: one block per 8th
      const prog = st === 'fix' ? S.prog1 : S.prog2, n = prog.filter((p) => p.t <= t).length;
      G.rrect(ctx, 40, 410, 720, 70, 10, { fill: '#232A3C', lw: 4, stroke: '#C9D3E8', seed: 40 });
      for (let i = 0; i < n; i++) {
        const bw = 700 / prog.length, pop = clamp((t - prog[i].t) / 0.08);
        ctx.fillStyle = st === 'fix' ? '#F2B84B' : '#E8743B'; ctx.globalAlpha = 0.5 + 0.5 * pop;
        ctx.fillRect(50 + i * bw + 3, 420, bw - 6, 50); ctx.globalAlpha = 1;
      }
      G.text(ctx, `%${Math.round((100 * n) / prog.length)}`, 760, 395, { size: 34, align: 'right', color: '#F2B84B', fam: FONT, weight: 400, boil: false });
    } else if (st === 'ok' || st === 'ok2') {
      const t0 = st === 'ok' ? ev.fix1 : ev.fix2, a = t - t0;
      ctx.fillStyle = '#2E9E5B'; ctx.fillRect(0, 0, 800, 520);
      G.rays(ctx, 400, 200, { n: 20, r0: 90, r1: 700, color: 'rgba(255,255,255,0.18)', lw: 18, seed: 9, spin: a * 0.3 });
      const pop = ease.outBack(clamp(a / 0.25), 3);
      ctx.save(); ctx.translate(400, 200); ctx.scale(pop, pop);
      G.ellipse(ctx, 0, 0, 110, 110, { fill: '#FFFFFF', lw: 6, seed: 50 });
      G.line(ctx, [[-50, 0], [-12, 42], [56, -44]], { color: '#2E9E5B', lw: 26, seed: 51 });
      ctx.restore();
      G.text(ctx, 'SİSTEM DÜZELDİ!', 400, 430, { size: 64, align: 'center', fam: FONT, weight: 400, color: '#FFFFFF', alpha: clamp(a / 0.2), boil: false });
    } else { // crash
      const a = t - ev.press;
      ctx.fillStyle = '#0B0B10'; ctx.fillRect(0, 0, 800, 520);
      for (let i = 0; i < 14; i++) { // glitch bars
        const gy = (G.rnd(i, Math.floor(t * 15)) * 520) | 0;
        ctx.fillStyle = i % 3 ? 'rgba(215,51,43,0.6)' : 'rgba(80,200,255,0.4)';
        ctx.fillRect((G.rnd(i, 7, Math.floor(t * 15)) - 0.5) * 200, gy, 800, 6 + G.rnd(i, 3) * 20);
      }
      const jx = (G.rnd(Math.floor(t * 20), 1) - 0.5) * 18;
      G.text(ctx, 'SİSTEM', 400 + jx, 230, { size: 96, align: 'center', fam: FONT, weight: 400, color: '#FF3B30', alpha: clamp(a / 0.1), boil: false });
      G.text(ctx, 'ÇÖKTÜ!', 400 - jx, 350, { size: 110, align: 'center', fam: FONT, weight: 400, color: '#FFFFFF', alpha: clamp(a / 0.1), boil: false });
    }
    ctx.restore();
  }

  // ---------- the red button ----------
  function redButton(ctx, x, y, s, t, { pressed = 0, note = true, cup = 0 } = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    G.rrect(ctx, -60, -26, 120, 30, 8, { fill: '#5B5F6B', lw: 4, seed: 60 });
    const dome = 34 * (1 - 0.6 * pressed);
    G.shape(ctx, G.ellPts(0, -26, 44, dome).filter((p) => p[1] <= -26 + 1), { fill: '#E0322B', lw: 4.5, seed: 61, closed: true });
    ctx.save(); ctx.globalAlpha = 0.5; G.ellipse(ctx, -16, -26 - dome * 0.6, 10, 6, { fill: '#FFFFFF', lw: 0, seed: 62 }); ctx.restore();
    if (note) { // the sticky note
      ctx.save(); ctx.translate(0, 30); ctx.rotate(-0.06);
      G.rrect(ctx, -78, 0, 156, 52, 4, { fill: '#FFE45C', lw: 3, seed: 63 });
      G.text(ctx, 'DOKUNMA!', 0, 36, { size: 26, align: 'center', fam: FONT, weight: 400, color: '#C2261F', boil: false });
      ctx.restore();
    }
    if (cup > 0) { // the mug, upside down, coming down over it
      const cy = lerp(-260, -10, ease.outBounce(cup));
      G.poly(ctx, [[-66, cy], [66, cy], [56, cy - 110], [-56, cy - 110]], { fill: '#F4F1EA', lw: 5, seed: 64, step: 20 });
      G.text(ctx, 'NO', 0, cy - 40, { size: 34, align: 'center', fam: FONT, weight: 400, color: '#C2261F', boil: false });
    }
    ctx.restore();
  }

  // Claude's arms: typing alternates on the keystrokes
  function typingArms(t) {
    const k = lastBefore(S.keys, t);
    if (k < 0 || t - S.keys[k] > BEAT * 0.5) return [0.2, 0.2];
    const a = clamp((t - S.keys[k]) / 0.07);
    return k % 2 ? [-0.5 + a * 0.6, 0.3] : [0.3, -0.5 + a * 0.6];
  }
  const inTyping = (t) => S.typing.some(([a, b]) => t >= a && t < b);

  // ---------- the room (wide) ----------
  const DESK_Y = 1030; // desk top, where Claude and the button stand
  const BTN = [400, DESK_Y + 6];
  function claudeX(t) {
    if (t < ev.backup) return 600;
    const i = lastBefore(S.hops, t), x0 = 600, step = (x0 - BTN[0]) / S.hops.length;
    if (i < 0) return x0;
    const u = ease.outQuad(clamp((t - S.hops[i]) / (BEAT * 0.8)));
    return x0 - step * (i + u);
  }
  function room(ctx, t) {
    const st = state(t);
    // the wall at night, a window with the city, a lamp
    ctx.fillStyle = '#39406A'; ctx.fillRect(-300, -300, W + 600, H + 600);
    G.hatch(ctx, [-100, -100, W + 100, DESK_Y], { color: 'rgba(255,255,255,0.04)', gap: 16 });
    G.rrect(ctx, 60, 300, 300, 380, 8, { fill: '#1C2140', lw: 6, seed: 300 });
    for (let i = 0; i < 9; i++) G.rrect(ctx, 80 + i * 30, 560 - G.rnd(i, 1) * 180, 26, 200, 2, { fill: '#2A3058', lw: 0, seed: 310 + i });
    for (let i = 0; i < 14; i++) { ctx.fillStyle = G.rnd(i, 5) < 0.5 ? '#F2D08A' : '#5A6290'; ctx.fillRect(88 + G.rnd(i, 2) * 250, 420 + G.rnd(i, 3) * 230, 8, 10); }
    ctx.fillStyle = '#F6F0E2'; ctx.beginPath(); ctx.arc(300, 360, 26, 0, Math.PI * 2); ctx.fill();
    G.line(ctx, [[210, 300], [210, 680]], { color: '#2A2320', lw: 6, seed: 320 });
    G.line(ctx, [[60, 490], [360, 490]], { color: '#2A2320', lw: 6, seed: 321 });
    // the screen's glow on the wall
    const glow = st === 'error' ? 'rgba(230,60,50,0.25)' : st === 'crash' ? 'rgba(230,40,40,0.35)' : st.startsWith('ok') ? 'rgba(80,220,130,0.25)' : 'rgba(120,160,255,0.18)';
    const gr = ctx.createRadialGradient(720, 720, 50, 720, 720, 600); gr.addColorStop(0, glow); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // the desk
    G.rrect(ctx, -40, DESK_Y - 30, W + 80, 60, 6, { fill: '#B9875A', lw: 5, seed: 330, hatch: { color: 'rgba(90,50,20,0.18)', gap: 12 } });
    G.rrect(ctx, -40, DESK_Y + 30, W + 80, 900, 0, { fill: '#8E6444', lw: 5, seed: 331, hatch: { color: 'rgba(60,30,10,0.18)', gap: 14 } });
    // the monitor
    G.rrect(ctx, 690, DESK_Y - 110, 60, 90, 6, { fill: '#2A2A38', lw: 4, seed: 340 });
    G.rrect(ctx, 610, DESK_Y - 34, 220, 22, 6, { fill: '#2A2A38', lw: 4, seed: 341 });
    G.rrect(ctx, 460, 560, 520, 360, 18, { fill: '#2A2A38', lw: 6, seed: 342 });
    screen(ctx, 480, 580, 480, 312, t);
    // a mug and a plant
    G.rrect(ctx, 880, DESK_Y - 90, 70, 80, 10, { fill: '#E07A5F', lw: 4, seed: 350 });
    // the keyboard
    G.poly(ctx, [[600, DESK_Y - 4], [860, DESK_Y - 4], [880, DESK_Y + 24], [580, DESK_Y + 24]], { fill: '#DADAD6', lw: 4, seed: 360, step: 30 });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 9; c++) {
      const k = lastBefore(S.keys, t), hot = k >= 0 && t - S.keys[k] < 0.08 && (k * 7) % 18 === r * 9 + c;
      ctx.fillStyle = hot ? '#F2B84B' : '#B8B8B2'; ctx.fillRect(608 + c * 29 + r * 8, DESK_Y + 2 + r * 11, 22, 8);
    }
    // the red button
    const pressed = t >= ev.press ? 1 : 0;
    redButton(ctx, BTN[0], BTN[1], 0.85, t, { pressed, cup: clamp((t - ev.cup) / 0.6) });
    // Claude
    const st2 = st;
    let armL = 0, armR = 0, eyes = 'normal', mouth = 'smile', blush = 0, sy = 1, y = DESK_Y, rot = 0, look = 0.4;
    if (inTyping(t) && t < ev.fix1 || (t >= ev.retype && t < ev.fix2)) { [armL, armR] = typingArms(t); eyes = 'focus'; mouth = 'none'; look = 0.5; }
    if (st2 === 'ok' && t < ev.reply) { armL = armR = 2.2; eyes = 'happy'; mouth = 'open'; y -= Math.abs(Math.sin((t - ev.fix1) * Math.PI / BEAT)) * 20; }
    if (t >= ev.reply && t < ev.backup) { eyes = 'happy'; blush = 1; armL = armR = 0.6; rot = -0.1 * Math.sin(clamp((t - ev.reply) / BEAT) * Math.PI); }
    if (t >= ev.backup && t < ev.press) { // happy backward hops
      const i = lastBefore(S.hops, t); eyes = 'happy'; blush = 0.6; armL = armR = 1.6; mouth = 'open';
      if (i >= 0) y -= Math.sin(Math.PI * clamp((t - S.hops[i]) / (BEAT * 0.8))) * 50;
    }
    if (st2 === 'crash') { eyes = 'wide'; mouth = 'o'; armL = armR = 2.6; sy = 1 - 0.25 * U.pulse(t, ev.press, 6); if (t >= ev.oops) { eyes = 'worried'; armL = armR = 0.3; } }
    if (st2 === 'ok2') { eyes = t >= ev.cup + 0.6 ? 'happy' : 'normal'; blush = 0.8; armL = armR = 1.2; mouth = 'smile'; }
    if (talking('claude', t)) mouth = 'open';
    const cx = claudeX(t), cy = st2 === 'crash' || (t >= ev.press) ? y - 26 : y;
    const onBtn = t >= ev.press;
    Ch.claude(ctx, { x: onBtn && t < ev.cup ? BTN[0] : cx, y: onBtn && t < ev.cup ? cy : y, s: 0.72, sy, rot, eyes, mouth, blush, armL, armR, look, seed: 400 });
    if (st2 === 'crash' && t >= ev.oops) { // a drop of sweat
      ctx.save(); ctx.globalAlpha = 0.9; G.ellipse(ctx, BTN[0] + 70, cy - 120 + ((t - ev.oops) * 60) % 30, 9, 14, { fill: '#9FD3F0', lw: 3, seed: 401 }); ctx.restore();
    }
    // Gökhan in his chair
    G.rrect(ctx, 30, 1180, 300, 50, 10, { fill: '#2A2A38', lw: 4, seed: 500 });
    G.rrect(ctx, 20, 900, 60, 300, 12, { fill: '#2A2A38', lw: 4, seed: 501 });
    let gesture = null, gEyes = 'normal', gMouth = 'flat', brows = 'neutral', sweat = 0, handR, handL, gLook = 0.6;
    if (st === 'error') { gesture = 'facepalm'; brows = 'worried'; sweat = 0.6; gMouth = 'wavy'; }
    else if (st === 'fix') { gesture = 'think'; brows = 'up'; gMouth = 'flat'; }
    else if (st === 'ok') { gesture = t < ev.thanks + 0.1 ? 'cheer' : 'thumbsUp'; gEyes = 'happy'; gMouth = 'grin'; }
    else if (st === 'crash') { gEyes = 'wide'; gMouth = 'o'; brows = 'up'; gesture = t < ev.oops ? 'shrug' : 'facepalm'; sweat = 0.9; }
    else if (st === 'fix2') { gEyes = 'wide'; brows = 'worried'; gMouth = 'wavy'; gesture = 'think'; }
    else { // ok2: he puts the mug over the button, then laughs
      const u = clamp((t - ev.cup + 0.4) / 0.4); gEyes = t > ev.cup + 0.7 ? 'happy' : 'normal'; gMouth = t > ev.cup + 0.7 ? 'grin' : 'smirk';
      if (t < ev.cup + 0.8) handR = [lerp(80, 190, u), lerp(-260, -200, u)];
      else gesture = 'thumbsUp';
    }
    if (talking('gokhan', t)) gMouth = 'open';
    Ch.person(ctx, { x: 180, y: 1180, s: 1.05, pose: 'sit', style: CAST.gokhan, gesture, eyes: gEyes, mouth: gMouth, brows, sweat, handR, handL, look: gLook, seed: 600, shadow: false });
    // the alarm light: the whole room pulses red
    if (st === 'crash') {
      const k = lastBefore(S.siren, t), p = k >= 0 ? Math.max(0, 1 - (t - S.siren[k].t) / BEAT) : 0;
      ctx.fillStyle = `rgba(220,30,30,${0.12 + 0.22 * p})`; ctx.fillRect(-300, -300, W + 600, H + 600);
    }
  }

  // ---------- the shots ----------
  const Z = 1.2, mp = (x, y) => [500 + (x - 500) * Z, 1000 + (y - 1000) * Z];
  function wide(ctx, t) {
    ctx.save(); ctx.translate(500, 1000); ctx.scale(Z, Z); ctx.translate(-500, -1000);
    room(ctx, t);
    ctx.restore();
    // the words
    const g = lineOf('gokhan', t), c = lineOf('claude', t);
    if (g) bubble(ctx, g.lines, 380, 360, ...mp(230, 820), t, g.at, holdEnd(g), { size: g.lines[0].length > 10 ? 54 : 84, color: g.at === ev.claudeQ ? '#C2261F' : '#2A2320' });
    if (c) bubble(ctx, c.lines, 620, c.at === ev.oops ? 440 : 380, ...mp(t >= ev.press ? BTN[0] : claudeX(t), DESK_Y - 140), t, c.at, holdEnd(c), { size: 64 });
  }
  // the screen close-up
  function closeup(ctx, t) {
    ctx.fillStyle = '#20243C'; ctx.fillRect(0, 0, W, H);
    G.rrect(ctx, 20, 420, 1040, 720, 30, { fill: '#2A2A38', lw: 8, seed: 700 });
    screen(ctx, 50, 450, 980, 640, t);
    // Claude's little head bobbing below the screen, typing
    const [aL, aR] = typingArms(t);
    Ch.claude(ctx, { x: 540, y: 1520 + Math.abs(Math.sin(t * 9)) * 6, s: 1.4, eyes: state(t).startsWith('ok') ? 'happy' : 'focus', mouth: state(t).startsWith('ok') ? 'open' : 'none', armL: state(t).startsWith('ok') ? 2.4 : aL, armR: state(t).startsWith('ok') ? 2.4 : aR, lookY: -1, seed: 400, shadow: false });
    const label = state(t) === 'fix2' ? 'HEMEN DÜZELTİYORUM!' : state(t) === 'fix' ? 'CLAUDE ÇALIŞIYOR...' : '';
    if (label) G.text(ctx, label, 540, 340, { size: 58, align: 'center', fam: FONT, weight: 400, color: '#F6F0E2', stroke: '#2A2320', strokeW: 8 });
  }
  // the insert: the button, Claude's feet coming down
  function insert(ctx, t) {
    const u = clamp((t - ev.insert) / (ev.press - ev.insert));
    ctx.fillStyle = '#B9875A'; ctx.fillRect(0, 0, W, H);
    G.hatch(ctx, [0, 0, W, H], { color: 'rgba(90,50,20,0.15)', gap: 18 });
    redButton(ctx, 540, 1180, 4.2, t, { note: true });
    // Claude, huge, backing down onto it: only the legs and the bottom of the body show
    const fy = lerp(560, 1060, ease.inCubic(u));
    Ch.claude(ctx, { x: 560, y: fy, s: 4.2, eyes: 'happy', armL: 1.6, armR: 1.6, seed: 400, shadow: false });
    // speed lines + a "!" as the foot gets close
    if (u > 0.6) G.text(ctx, '!', 890, 1120, { size: 220, align: 'center', fam: FONT, weight: 400, color: '#E0322B', stroke: '#2A2320', strokeW: 12, alpha: clamp((u - 0.6) * 5) });
  }
  // the end card
  function endCard(ctx, t) {
    const e = clamp((t - ev.end) / 0.5);
    if (e <= 0) return;
    ctx.save(); ctx.globalAlpha = e;
    { const eg = ctx.createLinearGradient(0, 0, 0, 900); eg.addColorStop(0, 'rgba(20,16,30,0.75)'); eg.addColorStop(0.7, 'rgba(20,16,30,0.55)'); eg.addColorStop(1, 'rgba(20,16,30,0)'); ctx.fillStyle = eg; ctx.fillRect(0, 0, W, 900); }
    const pop = ease.outBack(e, 2);
    ctx.translate(500, 400); ctx.scale(pop, pop);
    G.text(ctx, 'CLAUDE', 0, -60, { size: 120, align: 'center', fam: FONT, weight: 400, color: '#E8916A', stroke: '#2A2320', strokeW: 12 });
    G.text(ctx, '& GÖKHAN', 0, 80, { size: 120, align: 'center', fam: FONT, weight: 400, color: '#F2B84B', stroke: '#2A2320', strokeW: 12 });
    G.text(ctx, 'Kırmızı düğmeye dokunma!', 0, 190, { size: 50, align: 'center', color: '#F6F0E2' });
    ctx.restore();
  }

  const film = Shots.film([
    { at: 0, draw: wide, cam: Shots.push(1.08, 1.0) },
    { at: T(2), draw: closeup, in: 'whip', cam: Shots.push(1, 1.06) },
    { at: ev.fix1, draw: closeup, in: 'flash', cam: Shots.shake(18, ev.fix1, 6) },
    { at: ev.thanks, draw: wide, in: 'cut' },
    { at: ev.insert, draw: insert, in: 'cut', cam: Shots.push(1, 1.1) },
    { at: ev.press, draw: wide, in: { type: 'flash', color: '#FF3B30' }, cam: Shots.shake(34, ev.press, 5) },
    { at: ev.retype, draw: closeup, in: 'whip', cam: Shots.handheld(6) },
    { at: ev.fix2, draw: closeup, in: 'flash', cam: Shots.shake(18, ev.fix2, 6) },
    { at: ev.cup - 0.5, draw: wide, in: 'cut' },
  ]);

  Studio.film({
    post: { vignette: 0.25, grain: 0.04, paper: 0.35 },
    fadeOut: 0.8,
    draw(ctx, t) { film(ctx, t); endCard(ctx, t); },
  });
})();
