/* ch4.js — chapter 4: contactors, auxiliary relays, timers and overload relays.
   1) C4.Contactor  a contactor cut open: coil on the fixed core, armature on the contact carrier, return spring, three main poles and an
                    auxiliary NO 13–14 and NC 21–22; energise the coil (adjustable coil voltage, slow motion) and watch the carrier travel,
                    the NC open before the NOs close, the coil current fall from inrush to holding, pick-up and drop-out levels
   2) C4.Timing     a live timing diagram for an on-delay or off-delay timer (hold the control input, see the timed contacts follow)
      C4.timingSVG  the same diagram drawn statically from a list of input pulses (for the documents; blank = answer rows left empty)
   3) C4.Overload   a thermal overload relay as a first-order heat model with trip classes 10A/10/20/30, current setting, motor load
                    scenarios, TEST and RESET (manual/automatic), contacts 95–96 / 97–98 and two lamps; C4.tripCurve draws time vs multiple
   4) circuits for the relay simulator: coil test with auxiliary contacts, auxiliary relay latch driving two contactors and a lamp,
      on-delay and off-delay timers with lamps */
(function (global) {
'use strict';
const C4 = {}, IE = global.IEC, T = (th, en) => MC.t(th, en), tt = p => ED.tt(p);
const GOOD = '#1d8a4a', OFF = '#9aa3b5', HOT = '#ff4d4d', f1 = v => +(+v).toFixed(1);

/* ---------------- 1) contactor cut open ---------------- */
/* typical values (adjusted after the standard): the contactor must close between 85 % and 110 % of the rated coil voltage and drop out
   between 75 % and 20 % (AC); this "device" picks up at PICK and drops out at DROP. Inrush ≈ RATIO × holding current for an AC coil. */
C4.PICK = 0.8; C4.DROP = 0.55; C4.RATIO = 8;
C4.Contactor = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.t = 0; this.on = false; this.u = 1; this.slow = false; this.hist = []; this.clock = 0;
    el.innerHTML = '<div class="kmgrid"><div class="kmsec"></div><div class="kmsym"></div><div class="kmtl"></div></div>';
    this.secEl = el.querySelector('.kmsec'); this.symEl = el.querySelector('.kmsym'); this.tlEl = el.querySelector('.kmtl'); this.draw(); }
  /* the magnet holds the armature closed when (closed and u ≥ DROP) or pulls it in when (open and u ≥ PICK) */
  get pulled() { const u = this.on ? this.u : 0; return this.t > 0.95 ? u >= C4.DROP : u >= C4.PICK; }
  states(t = this.t) { return { main: t > 0.8, no: t > 0.8, nc: t < 0.25 }; }
  current() { const u = this.on ? this.u : 0; if (!u) return 0; return u * (1 + (C4.RATIO - 1) * (1 - Math.min(1, this.t / 0.97)) ** 1.5); }
  step(dt) { const goal = this.pulled ? 1 : 0, rate = this.slow ? (goal ? 1.3 : 1.6) : 14, before = JSON.stringify(this.states());
    if (this.t !== goal) this.t = goal > this.t ? Math.min(1, this.t + rate * dt) : Math.max(0, this.t - rate * dt);
    this.clock += dt; this.hist.push([this.clock, this.current()]); while (this.hist.length && this.hist[0][0] < this.clock - 4) this.hist.shift();
    this.draw(); if (JSON.stringify(this.states()) !== before && this.o.onChange) this.o.onChange(this.states()); }
  draw() {
    const t = this.t, st = this.states(), live = this.on && this.u > 0, gap = 26 * (1 - t), cx = 160;
    const cMain = st.main ? GOOD : OFF, cNO = st.no ? GOOD : OFF, cNC = st.nc ? GOOD : OFF;
    let s = `<rect x="14" y="40" width="292" height="300" rx="8" fill="var(--panel2)" stroke="var(--line)"/>`;
    const tag = (txt, y, yTo, xTo) => IE.L(xTo, yTo, 312, y, { col: 'var(--muted)', dash: '2 2' }) + IE.T(txt, 316, y + 3, { size: 10, col: 'var(--muted)' });
    /* three main poles + auxiliary NO + auxiliary NC: fixed contacts on the housing, moving bridges on the carrier */
    const poles = [[46, 'NO', '1–2'], [92, 'NO', '3–4'], [138, 'NO', '5–6'], [204, 'NO', '13–14'], [256, 'NC', '21–22']];
    const dy = 30 * t;   // carrier travel
    s += `<rect x="30" y="${108 + dy}" width="262" height="12" rx="3" fill="#8f97b4" stroke="#59607e"/>`;
    poles.forEach(([x, k, lab], i) => {
      const col = i < 3 ? cMain : k === 'NO' ? cNO : cNC, w = 36, yF = k === 'NO' ? 100 : 76;   // NO: fixed contacts below the bridge; NC: above it
      s += `<rect x="${x - w / 2 - 4}" y="${yF}" width="12" height="7" fill="#b9762b" stroke="none"/><rect x="${x + w / 2 - 8}" y="${yF}" width="12" height="7" fill="#b9762b" stroke="none"/>`;
      const yB = (k === 'NO' ? 82 : 84) + dy;
      s += `<line x1="${x}" y1="${yB + 6}" x2="${x}" y2="${108 + dy}" stroke="#59607e" stroke-width="3"/><rect x="${x - w / 2 - 4}" y="${yB}" width="${w + 8}" height="6" rx="2" fill="${col}" stroke="none"/>`;
      s += IE.T(lab, x, 56, { size: 10, anchor: 'middle', weight: 700 }) + IE.T(i < 3 ? T('หลัก', 'main') : k === 'NO' ? T('ปกติเปิด', 'NO') : T('ปกติปิด', 'NC'), x, 68, { size: 9, anchor: 'middle', col: 'var(--muted)' });
    });
    s += tag(T('หน้าสัมผัสอยู่กับที่', 'fixed contacts'), 92, 103, 274) + tag(T('ชุดหน้าสัมผัสเคลื่อนที่', 'contact carrier'), 122, 114 + dy, 292);
    /* armature (moving E-core) on the carrier, return springs, fixed E-core with the coil and shading rings */
    const ya = 150 + dy, ycc = Math.max(ya + 26 + gap, 210);
    s += `<line x1="${cx}" y1="${120 + dy}" x2="${cx}" y2="${ya}" stroke="#59607e" stroke-width="4"/>`;
    s += `<path d="M ${cx - 70} ${ya} h 140 v 26 h -16 v -12 h -38 v 12 h -32 v -12 h -38 v 12 h -16 Z" fill="#7c8496" stroke="#4b5266"/>`;
    s += `<path d="M ${cx - 70} ${ycc + 60} h 140 v -60 h -16 v 12 h -38 v -12 h -32 v 12 h -38 v -12 h -16 Z" fill="#7c8496" stroke="#4b5266"/>`;
    s += `<rect x="${cx - 52}" y="${ycc + 14}" width="104" height="34" rx="4" fill="${live ? '#e08a2e' : '#b9762b'}" stroke="#7a4a14"/>` + IE.T(T('คอยล์', 'coil'), cx, ycc + 35, { size: 10, anchor: 'middle', weight: 700, col: '#fff' });
    [cx - 62, cx + 54].forEach(x => { s += `<rect x="${x}" y="${ycc - 2}" width="8" height="5" fill="#d9a441" stroke="none"/>`; });
    [cx - 92, cx + 92].forEach(x => { const y0 = ya + 4, y1 = ycc + 30, n = 7; let p = `M ${x} ${y0}`; for (let i = 1; i <= n; i++) p += ` L ${x + (i % 2 ? -6 : 6)} ${y0 + (y1 - y0) * (i - 0.5) / n}`; p += ` L ${x} ${y1}`;
      s += `<path d="${p}" fill="none" stroke="#6b7399" stroke-width="2"/>`; });
    s += `<rect x="${cx - 44}" y="${f1(ya + 26 + gap / 2 - 5)}" width="88" height="12" rx="3" fill="var(--panel2)" opacity=".92" stroke="none"/>` +   // a backing tag, so the label stays legible on the core when the gap closes
      IE.T(T(`ช่องอากาศ ${f1(gap * 0.2)} mm`, `air gap ${f1(gap * 0.2)} mm`), cx, ya + 26 + gap / 2 + 4, { size: 9, anchor: 'middle', weight: 700, col: gap > 1 ? 'var(--accent)' : 'var(--muted)' });
    s += tag(T('แกนเหล็กเคลื่อนที่', 'armature'), 158, ya + 13, cx + 70) + tag(T('สปริงดันกลับ', 'return spring'), 196, (ya + ycc + 30) / 2, cx + 98) +
      tag(T('ห่วงบังแม่เหล็ก', 'shading ring'), 226, ycc, cx + 62) + tag(T('คอยล์', 'coil'), 256, ycc + 31, cx + 52) + tag(T('แกนเหล็กอยู่กับที่', 'fixed core'), 290, ycc + 54, cx + 70);
    /* coil terminals */
    s += `<circle cx="34" cy="${ycc + 31}" r="5" fill="#cfd6df" stroke="#6b7399"/>` + IE.T('A1', 34, ycc + 50, { size: 10, anchor: 'middle', weight: 700 }) +
      `<line x1="39" y1="${ycc + 31}" x2="${cx - 52}" y2="${ycc + 31}" stroke="${live ? HOT : '#9aa3b5'}" stroke-width="2"/>` +
      `<circle cx="34" cy="${ycc + 62}" r="5" fill="#cfd6df" stroke="#6b7399"/>` + IE.T('A2', 34, ycc + 80, { size: 10, anchor: 'middle', weight: 700 }) +
      `<path d="M 39 ${ycc + 62} H ${cx - 76} V ${ycc + 40} H ${cx - 52}" fill="none" stroke="${live ? '#4da3ff' : '#9aa3b5'}" stroke-width="2"/>`;
    this.secEl.innerHTML = IE.svg(420, 350, s, { max: 440, label: 'contactor cut open' });
    /* IEC symbols, live */
    const red = c => (c ? ' stroke="#ff4d4d"' : '');
    let k = IE.T('KM1', 40, 24, { anchor: 'middle', size: 12, weight: 700 });
    k += `<g${red(live)}>${IE.coil(40, 40, 110, { live: this.t > 0.95 && live })}</g>` + IE.T('A1', 46, 52, { size: 9 }) + IE.T('A2', 46, 104, { size: 9 });
    [[96, '1', '2'], [130, '3', '4'], [164, '5', '6']].forEach(([x, a, b]) => { k += `<g${red(st.main)}>${IE.mainNO(x, 40, 110, { act: st.main })}</g>` + IE.T(a, x + 5, 52, { size: 9 }) + IE.T(b, x + 5, 104, { size: 9 }); });
    k += IE.L(86, 75, 160, 75, { dash: '3 2' });
    k += `<g${red(st.no)}>${IE.contact(false, 206, 40, 110, { act: st.no })}</g>` + IE.T('13', 211, 52, { size: 9 }) + IE.T('14', 211, 104, { size: 9 });
    k += `<g${red(st.nc)}>${IE.contact(true, 250, 40, 110, { act: !st.nc })}</g>` + IE.T('21', 255, 52, { size: 9 }) + IE.T('22', 255, 104, { size: 9 });
    k += IE.T(T('คอยล์', 'coil'), 40, 128, { size: 10, anchor: 'middle', col: 'var(--muted)' }) + IE.T(T('หน้าสัมผัสหลัก', 'main contacts'), 130, 128, { size: 10, anchor: 'middle', col: 'var(--muted)' }) +
      IE.T(T('หน้าสัมผัสช่วย', 'auxiliary'), 228, 128, { size: 10, anchor: 'middle', col: 'var(--muted)' });
    this.symEl.innerHTML = IE.svg(290, 140, k, { max: 330, label: 'contactor symbols' });
    /* coil current (relative to the holding current) over the last 4 s, and the contact timing against travel */
    const X = v => 40 + 230 * v, Y = v => 112 - 84 * Math.min(1, v / (C4.RATIO * 1.1));
    let g = IE.T(T('กระแสคอยล์ (เท่าของกระแสขณะดูดค้าง)', 'coil current (× holding current)'), 155, 14, { size: 10, anchor: 'middle', weight: 700 });
    g += IE.L(40, 112, 270, 112, { col: 'var(--line)' }) + IE.L(40, 24, 40, 112, { col: 'var(--line)' });
    [1, C4.RATIO].forEach(v => { g += IE.L(40, Y(v), 270, Y(v), { dash: '2 3', col: 'var(--line)' }) + IE.T(`${v}×`, 36, Y(v) + 3, { size: 9, anchor: 'end', col: 'var(--muted)' }); });
    if (this.hist.length > 1) { const t0 = this.clock - 4; g += `<polyline points="${this.hist.map(([tt2, i]) => `${f1(X((tt2 - t0) / 4))},${f1(Y(i))}`).join(' ')}" fill="none" stroke="#e08a2e" stroke-width="2"/>`; }
    g += IE.T(T('4 วินาทีล่าสุด', 'last 4 s'), 155, 126, { size: 9, anchor: 'middle', col: 'var(--muted)' });
    const R = [['13–14', T('ปกติเปิด', 'NO'), 0.8, 1], ['21–22', T('ปกติปิด', 'NC'), 0, 0.25], ['1–2 …', T('หลัก', 'main'), 0.8, 1]], Xt = v => 70 + 200 * v;
    g += IE.T(T('ระยะเคลื่อนของชุดหน้าสัมผัส', 'carrier travel'), 170, 146, { size: 10, anchor: 'middle', weight: 700 });
    [0, 0.25, 0.8, 1].forEach(v => { g += IE.L(Xt(v), 152, Xt(v), 230, { dash: '2 3', col: 'var(--line)' }) + IE.T(`${Math.round(v * 100)}%`, Xt(v), 242, { size: 9, anchor: 'middle', col: 'var(--muted)' }); });
    R.forEach(([lab, kind, a, b], i) => { const y = 166 + i * 24; g += IE.T(lab, 62, y + 4, { size: 10, anchor: 'end', weight: 700 }) + IE.T(kind, 62, y + 14, { size: 8, anchor: 'end', col: 'var(--muted)' }) +
      `<rect x="${Xt(a)}" y="${y - 6}" width="${Xt(b) - Xt(a)}" height="12" rx="3" fill="${GOOD}" opacity=".85" stroke="none"/>`; });
    g += IE.L(Xt(t), 150, Xt(t), 232, { col: 'var(--accent)', w: 2 });
    this.tlEl.innerHTML = IE.svg(300, 250, g, { max: 330, label: 'coil current and contact timing' });
  }
};

/* ---------------- 2) timer timing diagrams ---------------- */
/* timer model: on-delay: output = input held for T; off-delay: output = input, or less than T since the input dropped */
C4.timerOut = (fn, T0, pulses, t) => { // pulses: [[t_on, t_off], ...] sorted; t_off may be Infinity
  if (fn === 'on') return pulses.some(([a, b]) => t >= a + T0 && t < b);
  return pulses.some(([a, b]) => t >= a && t < b + T0);
};
C4.FN = { on: { name: ['หน่วงเวลาเมื่อป้อนไฟ (on-delay)', 'on-delay'], coil: ['คอยล์ (A1–A2)', 'coil (A1–A2)'] },
  off: { name: ['หน่วงเวลาเมื่อตัดไฟ (off-delay)', 'off-delay'], coil: ['สัญญาณควบคุม (B1)', 'control input (B1)'] } };
/* static diagram: rows input, NO timed 15–18, NC timed 15–16; o.blank leaves the contact rows empty for students; o.W window seconds;
   o.until draws the traces only up to that time (the live diagram: nothing is drawn right of 'now') */
C4.timingSVG = (fn, T0, pulses, o = {}) => {
  const W = o.W || 12, tEnd = Math.min(W, o.until ?? W), x0 = 118, x1 = 540, X = t => x0 + (x1 - x0) * t / W, rowH = 46,
    rows = [[tt(C4.FN[fn].coil), 'in'], [T('15–18 (ปกติเปิด)', '15–18 (NO)'), 'no'], [T('15–16 (ปกติปิด)', '15–16 (NC)'), 'nc']];
  let s = '';
  for (let k = 0; k <= W; k++) s += IE.L(X(k), 18, X(k), 18 + rowH * rows.length, { col: 'var(--line)', dash: '1 3' }) + (k % 2 === 0 ? IE.T(`${k}`, X(k), 30 + rowH * rows.length, { size: 9, anchor: 'middle', col: 'var(--muted)' }) : '');
  s += IE.T(T('เวลา (วินาที)', 'time (s)'), x1, 44 + rowH * rows.length, { size: 9, anchor: 'end', col: 'var(--muted)' });
  rows.forEach(([lab, key], i) => { const yb = 18 + rowH * (i + 1) - 8, yt = yb - 24;
    s += IE.T(lab, x0 - 8, yb - 8, { size: 10, anchor: 'end', weight: 700 }) + IE.L(x0, yb, x1, yb, { col: 'var(--line)' });
    if (o.blank && key !== 'in') return;
    const val = t => key === 'in' ? pulses.some(([a, b]) => t >= a && t < b) : key === 'no' ? C4.timerOut(fn, T0, pulses, t) : !C4.timerOut(fn, T0, pulses, t);
    const edges = new Set([0, tEnd]); pulses.forEach(([a, b]) => [a, b, a + T0, b + T0].forEach(v => { if (v > 0 && v < tEnd) edges.add(v); }));
    const pts = [...edges].sort((p, q) => p - q); let d = '';
    pts.forEach((p, j) => { if (j === pts.length - 1) return; const v = val((p + pts[j + 1]) / 2), y = v ? yt : yb; d += `${j ? 'L' : 'M'} ${f1(X(p))} ${y} L ${f1(X(pts[j + 1]))} ${y} `; });
    if (d) s += `<path d="${d}" fill="none" stroke="${key === 'in' ? 'var(--ink)' : key === 'no' ? GOOD : '#c0392b'}" stroke-width="2.2"/>`;
    if (key === 'no') pulses.forEach(([a, b]) => { const s0 = fn === 'on' ? a : b, retrig = fn === 'off' && pulses.some(([a2]) => a2 > b && a2 < b + T0);   // no 't = T' bar for a release cut short by a new command
      if (s0 >= 0 && s0 + T0 <= tEnd && !retrig && (fn === 'off' || b - a > T0)) {
      s += IE.L(X(s0), yt - 6, X(s0 + T0), yt - 6, { col: 'var(--accent)' }) + IE.L(X(s0), yt - 10, X(s0), yt - 2, { col: 'var(--accent)' }) + IE.L(X(s0 + T0), yt - 10, X(s0 + T0), yt - 2, { col: 'var(--accent)' }) +
        IE.T(`t = ${T0} s`, X(s0 + T0 / 2), yt - 10, { size: 9, anchor: 'middle', col: 'var(--accent)', weight: 700 }); } });
  });
  return IE.svg(560, 60 + rowH * rows.length, s, { max: o.max || 640, label: 'timing diagram' });
};
/* live diagram driven by a held input */
C4.Timing = class {
  constructor(el, o = {}) { this.el = el; this.fn = o.fn || 'on'; this.T = o.T || 3; this.W = 12; this.clock = 0; this.pulses = []; this.input = false; this.o = o; this.draw(); }
  set(v) { if (v === this.input) return; this.input = v; if (v) this.pulses.push([this.clock, Infinity]); else if (this.pulses.length) this.pulses[this.pulses.length - 1][1] = this.clock; }
  reset() { this.clock = 0; this.pulses = []; if (this.input) this.pulses.push([0, Infinity]); }
  out(t = this.clock) { return C4.timerOut(this.fn, this.T, this.pulses, t); }
  /* time left to the next change of the timed contact (null when nothing is counting) */
  remaining() { const p = this.pulses[this.pulses.length - 1]; if (!p) return null;
    if (this.fn === 'on' && this.input) { const r = p[0] + this.T - this.clock; return r > 0 ? r : null; }
    if (this.fn === 'off' && !this.input) { const r = p[1] + this.T - this.clock; return r > 0 ? r : null; } return null; }
  step(dt) { const before = this.out(); this.clock += dt; this.draw(); if (this.out() !== before && this.o.onChange) this.o.onChange(this.out()); }
  draw() { const t0 = Math.max(0, this.clock - this.W + 1), now = this.clock - t0, shift = this.pulses.map(([a, b]) => [a - t0, b - t0]).filter(([, b]) => b > -this.T - 1);   // a held pulse keeps b = Infinity
    let svg = C4.timingSVG(this.fn, this.T, shift, { W: this.W, until: now, max: 680 });
    const xNow = 118 + (540 - 118) * now / this.W;
    svg = svg.replace('</svg>', `<line x1="${f1(xNow)}" y1="14" x2="${f1(xNow)}" y2="160" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3"/></svg>`);
    this.el.innerHTML = svg; }
};

/* ---------------- 3) thermal overload relay ---------------- */
/* first-order heat model of the bimetals: dθ/dt = (k² − θ)/τ with k = I / I_setting; it trips at θ = KT² (KT = 1.12 lies between the
   1.05 "must not trip" and 1.2 "must trip" multiples of IEC 60947-4-1). τ is chosen per class so that the trip time from cold at
   7.2 × setting falls inside the class band (10A: 2–10 s, 10: 4–10 s, 20: 6–20 s, 30: 9–30 s). */
C4.KT = 1.12;
C4.CLASSES = { '10A': 5, '10': 7, '20': 14, '30': 22 };   // design trip time at 7.2 × from cold (s)
C4.BAND = { '10A': [2, 10], '10': [4, 10], '20': [6, 20], '30': [9, 30] };
C4.tau = cls => C4.CLASSES[cls] / Math.log(7.2 ** 2 / (7.2 ** 2 - C4.KT ** 2));
C4.tripTime = (cls, k, theta0 = 0) => { const a = k * k, b = C4.KT ** 2; if (a <= b || theta0 >= b) return theta0 >= b ? 0 : Infinity; return C4.tau(cls) * Math.log((a - theta0) / (a - b)); };
C4.Overload = class {
  constructor(o = {}) { this.cls = o.cls || '10'; this.setting = o.setting || 1; this.load = 0; this.theta = 0; this.tripped = false; this.auto = false; this.time = 0; this.trace = []; this.onTrip = o.onTrip; this.onReset = o.onReset; this.holdTrip = false; }
  get k() { return this.load / this.setting; }   // current as a multiple of the dial setting (load is a multiple of the motor's rated current)
  step(dt) { const tau = C4.tau(this.cls), I = this.tripped ? 0 : this.load, k2 = (I / this.setting) ** 2; this.theta += (k2 - this.theta) * (1 - Math.exp(-dt / tau)); this.time += dt;
    if (!this.tripped && this.theta >= C4.KT ** 2) { this.tripped = true; if (this.onTrip) this.onTrip('heat'); }
    else if (this.tripped && this.auto && !this.holdTrip && this.canReset()) { this.tripped = false; if (this.onReset) this.onReset(); }
    const last = this.trace[this.trace.length - 1];   // one point per 0.5 s of simulated time, whatever the frame rate (2000 × 0.5 s covers the 900 s window)
    if (!last || this.time - last[0] >= 0.5) { this.trace.push([this.time, this.theta / C4.KT ** 2]); if (this.trace.length > 2000) this.trace.splice(0, this.trace.length - 2000); } }
  canReset() { return this.theta < 0.7 * C4.KT ** 2; }
  reset() { if (this.tripped && this.canReset()) { this.tripped = false; return true; } return !this.tripped; }
  /* TEST trips a relay that is not tripped yet (returns false otherwise); onTrip gets the reason 'heat' or 'test' */
  test() { if (this.tripped) return false; this.tripped = true; if (this.onTrip) this.onTrip('test'); return true; }
};
/* thermal state against time: 100 % = trip */
C4.thermalSVG = (ol, o = {}) => { const W = o.W || 600, x0 = 46, x1 = 470, y0 = 20, y1 = 170, tr = ol.trace, tEnd = Math.max(o.span || 120, ol.time), tStart = Math.max(0, tEnd - (o.span || 120));
  const X = t => x0 + (x1 - x0) * (t - tStart) / (tEnd - tStart), Y = v => y1 - (y1 - y0) * Math.min(v, 1.6) / 1.6;
  let s = IE.L(x0, y1, x1, y1, { col: 'var(--line)' }) + IE.L(x0, y0, x0, y1, { col: 'var(--line)' });
  [0.5, 1, 1.5].forEach(v => { s += IE.L(x0, Y(v), x1, Y(v), { col: v === 1 ? '#c0392b' : 'var(--line)', dash: v === 1 ? '6 3' : '2 3' }) + IE.T(`${Math.round(v * 100)}%`, x0 - 4, Y(v) + 3, { size: 9, anchor: 'end', col: v === 1 ? '#c0392b' : 'var(--muted)' }); });
  s += IE.T(T('จุดตัด', 'trip level'), x1 - 2, Y(1) - 4, { size: 9, anchor: 'end', col: '#c0392b', weight: 700 });
  const pts = [...tr.filter(([t]) => t >= tStart), [ol.time, ol.theta / C4.KT ** 2]].map(([t, v]) => `${f1(X(t))},${f1(Y(v))}`); if (pts.length > 1) s += `<polyline points="${pts.join(' ')}" fill="none" stroke="#e08a2e" stroke-width="2.2"/>`;
  s += IE.T(T('ความร้อนสะสมในแผ่นโลหะคู่', 'heat stored in the bimetals'), (x0 + x1) / 2, 12, { size: 10, anchor: 'middle', weight: 700 });
  s += IE.T(T(`เวลาจำลอง ${fmtT(ol.time)}`, `simulated time ${fmtT(ol.time)}`), x1, y1 + 16, { size: 9, anchor: 'end', col: 'var(--muted)' });
  return IE.svg(480, 190, s, { max: W, label: 'overload thermal state' }); };
const fmtT = s => { const r = Math.round(s); return r < 60 ? `${r} s` : r < 3600 ? `${Math.floor(r / 60)} min ${r % 60} s` : `${(s / 3600).toFixed(1)} h`; };   // round once, then split
C4.fmtT = fmtT;
/* trip curves from cold, log-log: time against multiple of the setting, with the class bands at 7.2 × and an optional operating point */
C4.tripCurve = (o = {}) => { const x0 = 56, x1 = 500, y0 = 30, y1 = 260, lx = v => Math.log10(v), X = k => x0 + (x1 - x0) * (lx(k) - lx(1)) / (lx(10) - lx(1)), tMin = 1, tMax = 7200;
  const Y = t => y1 - (y1 - y0) * (lx(Math.min(Math.max(t, tMin), tMax)) - lx(tMin)) / (lx(tMax) - lx(tMin)), COL = { '10A': '#8e44ad', '10': '#1d6fb8', '20': '#1d8a4a', '30': '#b8860b' };
  let s = '';
  [1, 2, 3, 5, 7.2, 10].forEach(k => { s += IE.L(X(k), y0, X(k), y1, { col: 'var(--line)', dash: k === 7.2 ? '4 3' : '1 3' }) + IE.T(`${k}×`, X(k), y1 + 14, { size: 9, anchor: 'middle', col: 'var(--muted)' }); });
  [[1, '1 s'], [10, '10 s'], [60, '1 min'], [600, '10 min'], [3600, '1 h'], [7200, '2 h']].forEach(([t, l]) => { s += IE.L(x0, Y(t), x1, Y(t), { col: 'var(--line)', dash: '1 3' }) + IE.T(l, x0 - 4, Y(t) + 3, { size: 9, anchor: 'end', col: 'var(--muted)' }); });
  s += IE.L(x0, y0, x0, y1, { col: 'var(--line)' }) + IE.L(x0, y1, x1, y1, { col: 'var(--line)' });
  (o.classes || Object.keys(C4.CLASSES)).forEach(c => { const [a, b] = C4.BAND[c]; s += `<line x1="${f1(X(7.2) + 4)}" y1="${f1(Y(a))}" x2="${f1(X(7.2) + 4)}" y2="${f1(Y(b))}" stroke="${COL[c]}" stroke-width="5" opacity=".35"/>`;
    const pts = []; for (let k = 1.13; k <= 10; k *= 1.03) { const tt2 = C4.tripTime(c, k); if (tt2 < tMax * 1.5) pts.push(`${f1(X(k))},${f1(Y(tt2))}`); }
    /* label along its own curve (rotated to the local slope): 30 above its curve, 10 above its curve and 20 below its curve share the
       wide 20–10 gap at different x, 10A below the lowest curve; all clear of the usual operating points (1.2–1.9×, 7.2×) and the 7.2× bands */
    const [kl, off, anc] = { '30': [2.2, -5, 'start'], '10': [2.2, -5, 'start'], '20': [4, 12, 'start'], '10A': [4, 12, 'start'] }[c] || [4, 12, 'start'];
    const xa = X(kl), ya = Y(C4.tripTime(c, kl)), ang = Math.atan2(Y(C4.tripTime(c, kl * 1.2)) - ya, X(kl * 1.2) - xa) * 180 / Math.PI;
    s += `<polyline points="${pts.join(' ')}" fill="none" stroke="${COL[c]}" stroke-width="${o.cls === c ? 3 : 1.6}"/>` +
      `<g transform="rotate(${f1(ang)} ${f1(xa)} ${f1(ya)})">${IE.T(T(`คลาส ${c}`, `class ${c}`), xa + (anc === 'start' ? 4 : -4), ya + off, { size: 9, anchor: anc, col: COL[c], weight: 700 })}</g>`; });
  s += IE.L(X(1.05), y0, X(1.05), y1, { col: '#c0392b', dash: '3 3' }) + IE.T(T('1.05× ไม่ตัด', '1.05× no trip'), X(1.05) + 3, y0 + 10, { size: 8, col: '#c0392b' });
  if (o.k && o.k > 1) { const tk = C4.tripTime(o.cls || '10', o.k); if (isFinite(tk) && tk < tMax) s += `<circle cx="${f1(X(o.k))}" cy="${f1(Y(tk))}" r="5" fill="#ff7a00" stroke="#141414"/>`; }
  s += IE.T(T('กระแส ÷ ค่าที่ตั้ง', 'current ÷ setting'), (x0 + x1) / 2, y1 + 28, { size: 10, anchor: 'middle', weight: 700 }) + IE.T(T('เวลาตัด (เริ่มจากเย็น)', 'trip time (from cold)'), 12, 14, { size: 10, weight: 700 });
  return IE.svg(520, 300, s, { max: o.max || 620, label: 'overload trip curves' }); };

/* ---------------- 4) circuits ---------------- */
const POWER = { stages: [{ k: 'cb', d: 'Q1' }, { k: 'mainNO', d: 'KM1' }, { k: 'therm', d: 'F2' }], motor: 'M1' };
/* coil test: switch S1 energises KM1 through overload contact F2 95–96; auxiliary NO 13–14 lights H1, auxiliary NC 21–22 lights H2 (lamps fed ahead of 95–96) */
C4.COILTEST = () => ({ supply: 'Q1', rows: 4, power: POWER,
  devices: { Q1: { type: 'cb', on: true }, F1: { type: 'fuse' }, F2: { type: 'ol' }, S1: { type: 'sel' }, KM1: { type: 'coil' }, H1: { type: 'lamp', color: '#7ee787' }, H2: { type: 'lamp', color: '#ff6b6b' } },
  els: [ { k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }, { k: 'NC', d: 'F2', x: 0, y: 1, t: ['95', '96'], op: 'thr' }, { k: 'NO', d: 'S1', x: 0, y: 2, t: ['13', '14'], op: 'sel' }, { k: 'coil', d: 'KM1', x: 0, y: 3, t: ['A1', 'A2'] },
    { k: 'w', pts: [[0, 1], [1, 1], [2, 1]], dots: [0, 1] }, { k: 'w', x: 1, y: 1 }, { k: 'NO', d: 'KM1', x: 1, y: 2, t: ['13', '14'] }, { k: 'lamp', d: 'H1', x: 1, y: 3, t: ['X1', 'X2'] },
    { k: 'w', x: 2, y: 1 }, { k: 'NC', d: 'KM1', x: 2, y: 2, t: ['21', '22'] }, { k: 'lamp', d: 'H2', x: 2, y: 3, t: ['X1', 'X2'] } ] });
/* auxiliary relay KA1 latched by start S2 and stop S1 (holding contact 13–14); its other contacts drive KM1 (23–24), KM2 (33–34) and lamp H1 (43–44) */
C4.RELAY = () => ({ rows: 4,
  devices: { F1: { type: 'fuse' }, S1: { type: 'pb' }, S2: { type: 'pb' }, KA1: { type: 'coil' }, KM1: { type: 'coil' }, KM2: { type: 'coil' }, H1: { type: 'lamp', color: '#7ee787' } },
  els: [ { k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }, { k: 'NC', d: 'S1', x: 0, y: 1, t: ['11', '12'], op: 'pb' }, { k: 'NO', d: 'S2', x: 0, y: 2, t: ['13', '14'], op: 'pb' },
    { k: 'coil', d: 'KA1', x: 0, y: 3, t: ['A1', 'A2'] }, { k: 'NO', d: 'KA1', x: 1, y: 2, t: ['13', '14'] }, { k: 'w', pts: [[0, 2], [1, 2]], dots: [0] }, { k: 'w', pts: [[0, 3], [1, 3]], dots: [0] },
    { k: 'w', pts: [[0, 1], [2, 1], [3, 1], [4, 1]], dots: [0, 1, 2] }, { k: 'w', x: 2, y: 1 }, { k: 'w', x: 3, y: 1 }, { k: 'w', x: 4, y: 1 },
    { k: 'NO', d: 'KA1', x: 2, y: 2, t: ['23', '24'] }, { k: 'coil', d: 'KM1', x: 2, y: 3, t: ['A1', 'A2'] },
    { k: 'NO', d: 'KA1', x: 3, y: 2, t: ['33', '34'] }, { k: 'coil', d: 'KM2', x: 3, y: 3, t: ['A1', 'A2'] },
    { k: 'NO', d: 'KA1', x: 4, y: 2, t: ['43', '44'] }, { k: 'lamp', d: 'H1', x: 4, y: 3, t: ['X1', 'X2'] } ] });
/* on-delay timer KT1 switched by S1: timed changeover 15–18 (NO) lights H1, 15–16 (NC) lights H2 */
C4.ONDELAY = (T0 = 3) => ({ rows: 3,
  devices: { F1: { type: 'fuse' }, S1: { type: 'sel' }, KT1: { type: 'timer', mode: 'on', T: T0 }, H1: { type: 'lamp', color: '#7ee787' }, H2: { type: 'lamp', color: '#ff6b6b' } },
  els: [ { k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }, { k: 'w', pts: [[0, 1], [1, 1], [2, 1]], dots: [0, 1] }, { k: 'NO', d: 'S1', x: 0, y: 1, t: ['13', '14'], op: 'sel' }, { k: 'coil', d: 'KT1', x: 0, y: 2, t: ['A1', 'A2'] },
    { k: 'NO', d: 'KT1', x: 1, y: 1, t: ['15', '18'], td: 'on' }, { k: 'lamp', d: 'H1', x: 1, y: 2, t: ['X1', 'X2'] },
    { k: 'NC', d: 'KT1', x: 2, y: 1, t: ['15', '16'], td: 'on' }, { k: 'lamp', d: 'H2', x: 2, y: 2, t: ['X1', 'X2'] } ] });
/* off-delay timer KT2 started by push button S1 (e.g. a stairway light or a fan running on): 15–18 stays closed T s after S1 is released */
C4.OFFDELAY = (T0 = 5) => ({ rows: 3,
  devices: { F1: { type: 'fuse' }, S1: { type: 'pb' }, KT2: { type: 'timer', mode: 'off', T: T0 }, H1: { type: 'lamp', color: '#ffd166' }, H2: { type: 'lamp', color: '#7ee787' } },
  els: [ { k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }, { k: 'w', pts: [[0, 1], [1, 1], [2, 1]], dots: [0, 1] }, { k: 'NO', d: 'S1', x: 0, y: 1, t: ['13', '14'], op: 'pb' }, { k: 'coil', d: 'KT2', x: 0, y: 2, t: ['A1', 'A2'] },
    { k: 'NO', d: 'KT2', x: 1, y: 1, t: ['15', '18'], td: 'off' }, { k: 'lamp', d: 'H1', x: 1, y: 2, t: ['X1', 'X2'] },
    { k: 'NC', d: 'KT2', x: 2, y: 1, t: ['15', '16'], td: 'off' }, { k: 'lamp', d: 'H2', x: 2, y: 2, t: ['X1', 'X2'] } ] });
/* on-delay timer with a timed contact (15–18 → H1) and an instantaneous contact (13–14 → H2): only the parachute contact waits */
C4.INSTANT = (T0 = 3) => ({ rows: 3,
  devices: { F1: { type: 'fuse' }, S1: { type: 'sel' }, KT1: { type: 'timer', mode: 'on', T: T0 }, H1: { type: 'lamp', color: '#7ee787' }, H2: { type: 'lamp', color: '#ffd166' } },
  els: [ { k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }, { k: 'w', pts: [[0, 1], [1, 1], [2, 1]], dots: [0, 1] }, { k: 'NO', d: 'S1', x: 0, y: 1, t: ['13', '14'], op: 'sel' }, { k: 'coil', d: 'KT1', x: 0, y: 2, t: ['A1', 'A2'] },
    { k: 'NO', d: 'KT1', x: 1, y: 1, t: ['15', '18'], td: 'on' }, { k: 'lamp', d: 'H1', x: 1, y: 2, t: ['X1', 'X2'] },
    { k: 'NO', d: 'KT1', x: 2, y: 1, t: ['13', '14'] }, { k: 'lamp', d: 'H2', x: 2, y: 2, t: ['X1', 'X2'] } ] });
global.C4 = C4;
})(window);
