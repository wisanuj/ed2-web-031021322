/* ed1.js — chapter 1: AC motors.
   1) ED1.Field      page 1.1 A: three windings 120° apart, their currents, the rotating field (any number of poles), a rotor that slips
   2) ED1.TorqueSpeed page 1.1 B: torque and current against speed of a typical 4-pole cage motor (ED.motor), and a start-up run
   3) ED1.plate      page 1.2 A: two clickable nameplates
   4) ED1.TBox       page 1.2 B: terminal box with copper links placed by the student, solved for the winding voltages
   5) ED1.Field2     page 1.3 A: main and auxiliary windings 90° apart, the field they make (rotating, elliptic or pulsating)
   6) ED1.Start1     page 1.3 B: single-phase motor start-up with a centrifugal switch, faults and reversing
   Screen angles: x = cx + r cos a, y = cy + r sin a, so a positive angle turns CLOCKWISE on screen. Pictures of a motor are seen
   from the drive end (the shaft end), where IEC 60034-8 makes L1→U1, L2→V1, L3→W1 turn the shaft clockwise. */
(function (global) {
'use strict';
const ED1 = {}, C = ED.COL, tt = ED.tt, T = (th, en) => MC.t(th, en);
const TAU = Math.PI * 2, D2R = Math.PI / 180;
const PH = [{ k: 'U', c: C.U }, { k: 'V', c: C.V }, { k: 'W', c: C.W }];

/* ======================================================================================================== 1) rotating field */
ED1.Field = class {
  constructor(cv, o = {}) { this.cv = cv; this.o = o; this.st = { P: 2, f: 50, swap: false, run: true, rate: 0.25 }; this.th = 0; this.rot = 0; this.resize(); }
  resize() { const r = ED.fit(this.cv, W => (this.o.motorOnly ? Math.min(380, W * 0.8) : W < 660 ? W * 1.32 : Math.min(430, W * 0.5))); Object.assign(this, r); this.wide = r.W >= 660; }
  get dir() { return this.st.swap ? -1 : 1; }   // +1: clockwise on screen (positive sequence seen from the drive end)
  cur(k, th = this.th) { const sh = this.st.swap ? [1, 0, 2][k] : k; return Math.cos(th - sh * 120 * D2R); }   // swap = L1 and L2 exchanged at U1 and V1
  step(dt) { if (!this.st.run) return; const p = this.st.P / 2, dth = TAU * this.st.rate * dt * Math.min(1, 2 / p) * p;   // same on-screen field speed for P = 2 and 4, slower above
    this.th += dth; this.rot += this.dir * (1 - 0.06) * dth / p; }
  draw() {
    const c = this.ctx, W = this.W, H = this.H; c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    if (this.o.motorOnly) { this.drawMotor(c, { x: 0, y: 0, w: W, h: H }); return; }
    const A = this.wide ? { x: 0, y: 0, w: W * 0.5, h: H } : { x: 0, y: 0, w: W, h: H * 0.62 };
    const B = this.wide ? { x: W * 0.5, y: 0, w: W * 0.5, h: H } : { x: 0, y: H * 0.62, w: W, h: H * 0.38 };
    this.drawMotor(c, A); this.drawWaves(c, B);
  }
  drawMotor(c, b) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2 + 6, R = Math.min(b.w, b.h) * 0.4, P = this.st.P, p = P / 2, aU = -90 * D2R, dir = this.dir;
    ED.ttext(c, ['มองจากด้านปลายเพลา', 'seen from the drive end'], b.x + 10, b.y + 18, { size: 12, color: C.muted });
    // stator ring coloured by the radial flux density B(α) = cos(p(α − aU) − dir·θ), positive along the field arrow (into the stator: S pole)
    const n = 120, r1 = R * 0.78, r2 = R;
    for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, am = (a0 + a1) / 2;
      const Bv = Math.cos(p * (am - aU) - dir * this.th);
      c.fillStyle = Bv >= 0 ? `rgba(90,209,255,${0.12 + 0.75 * Bv})` : `rgba(255,107,107,${0.12 - 0.75 * Bv})`;   // the field arrow points at the stator S pole (flux enters the stator there)
      c.beginPath(); c.arc(cx, cy, r2, a0, a1 + 0.004); c.arc(cx, cy, r1, a1 + 0.004, a0, true); c.closePath(); c.fill(); }
    c.strokeStyle = C.metal; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, r2, 0, TAU); c.stroke(); c.beginPath(); c.arc(cx, cy, r1, 0, TAU); c.stroke();
    // pole labels N / S at the pole centres
    for (let m = 0; m < P; m++) { const a = aU + (dir * this.th + m * Math.PI) / p, N = m % 2 === 1;
      ED.text(c, N ? 'N' : 'S', cx + (r1 + r2) / 2 * Math.cos(a), cy + (r1 + r2) / 2 * Math.sin(a) + 5, { size: 15, weight: 700, align: 'center', color: N ? '#fff0f0' : '#eafaff' }); }
    // coil sides of the three windings (2-pole picture only): U1/U2 marks at the slots
    if (P === 2) PH.forEach((ph, k) => { const a = aU + k * 120 * D2R, i = this.cur(k);
      [[a - 90 * D2R, 1], [a + 90 * D2R, -1]].forEach(([as, sg]) => { const x = cx + (r1 - 9) * Math.cos(as), y = cy + (r1 - 9) * Math.sin(as), v = i * sg;
        c.fillStyle = C.panel; c.strokeStyle = ph.c; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, 7, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = ph.c; if (v > 0.15) { c.beginPath(); c.arc(x, y, 2.4, 0, TAU); c.fill(); }   // dot: current out of the screen
        else if (v < -0.15) { c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 3.5, y - 3.5); c.lineTo(x + 3.5, y + 3.5); c.moveTo(x + 3.5, y - 3.5); c.lineTo(x - 3.5, y + 3.5); c.stroke(); } }); });
    // rotor: cage bars and one marked bar
    const rr = R * 0.6; c.fillStyle = '#1f2540'; c.beginPath(); c.arc(cx, cy, rr, 0, TAU); c.fill(); c.strokeStyle = C.metal; c.lineWidth = 1.2; c.stroke();
    for (let i = 0; i < 18; i++) { const a = this.rot + i / 18 * TAU; c.fillStyle = i === 0 ? C.orange : C.copper;
      c.beginPath(); c.arc(cx + rr * 0.84 * Math.cos(a), cy + rr * 0.84 * Math.sin(a), i === 0 ? 4.2 : 3, 0, TAU); c.fill(); }
    c.fillStyle = C.metal; c.beginPath(); c.arc(cx, cy, rr * 0.18, 0, TAU); c.fill();
    // winding axes (2-pole picture): each winding's field along its axis, and their sum
    if (P === 2) { let sx = 0, sy = 0; const L = rr * 0.62;
      PH.forEach((ph, k) => { const a = aU + k * 120 * D2R, i = this.cur(k); sx += i * Math.cos(a); sy += i * Math.sin(a);
        if (Math.abs(i) > 0.04) ED.arrow(c, cx, cy, cx + L * i * Math.cos(a), cy + L * i * Math.sin(a), { color: ph.c, width: 2.2, head: 8 }); });
      ED.arrow(c, cx, cy, cx + L * sx / 1.5 * 1.25, cy + L * sy / 1.5 * 1.25, { color: '#ffffff', width: 3.2, head: 11 }); }
    // rotation arrow outside the ring
    const ar = R + 12, a0 = -150 * D2R, a1 = -30 * D2R; c.strokeStyle = C.good; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, ar, a0, a1); c.stroke();
    const ae = dir > 0 ? a1 : a0, tdir = dir > 0 ? ae + Math.PI / 2 : ae - Math.PI / 2, hx = cx + ar * Math.cos(ae), hy = cy + ar * Math.sin(ae);
    ED.arrow(c, hx - 6 * Math.cos(tdir), hy - 6 * Math.sin(tdir), hx + 4 * Math.cos(tdir), hy + 4 * Math.sin(tdir), { color: C.good, width: 2, head: 9 });
    ED.ttext(c, dir > 0 ? ['ตามเข็มนาฬิกา', 'clockwise'] : ['ทวนเข็มนาฬิกา', 'anticlockwise'], cx, cy - ar - 8, { size: 12, align: 'center', color: C.good });
  }
  drawWaves(c, b) {
    const m = { l: 34, r: 12, t: 26, b: 26 }, x0 = b.x + m.l, x1 = b.x + b.w - m.r, y0 = b.y + m.t, y1 = b.y + b.h - m.b, ym = (y0 + y1) / 2, A = (y1 - y0) / 2 * 0.88;
    c.strokeStyle = C.grid; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, ym); c.lineTo(x1, ym); c.moveTo(x0, y0); c.lineTo(x0, y1); c.stroke();
    [90, 180, 270, 360].forEach(d => { const x = x0 + (x1 - x0) * d / 360; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); ED.text(c, d + '°', x, y1 + 15, { size: 11, align: 'center', color: C.muted }); });
    ED.text(c, 'i', x0 - 16, y0 + 8, { size: 12, color: C.muted });
    const lab = this.st.swap ? ['L2', 'L1', 'L3'] : ['L1', 'L2', 'L3'];
    PH.forEach((ph, k) => { c.strokeStyle = ph.c; c.lineWidth = 2; c.beginPath();
      for (let j = 0; j <= 180; j++) { const d = j * 2, x = x0 + (x1 - x0) * d / 360, y = ym - A * this.cur(k, d * D2R); j ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      ED.text(c, `${lab[k]} → ${ph.k}1`, x0 + 6 + k * 74, y0 - 9, { size: 12, color: ph.c, weight: 600 }); });
    const d = ((this.th / D2R) % 360 + 360) % 360, xc = x0 + (x1 - x0) * d / 360;
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.5; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(xc, y0); c.lineTo(xc, y1); c.stroke(); c.setLineDash([]);
    PH.forEach((ph, k) => { c.fillStyle = ph.c; c.beginPath(); c.arc(xc, ym - A * this.cur(k), 4, 0, TAU); c.fill(); });
  }
};

/* ======================================================================================================== 2) torque and current against speed */
ED1.TorqueSpeed = class {
  constructor(cv, o = {}) { this.cv = cv; this.o = o; this.TL = 0.6; this.ns = 1500; this.sim = null; this.resize(); }
  resize() { const r = ED.fit(this.cv, W => (W < 700 ? W * 1.25 : Math.min(400, W * 0.46))); Object.assign(this, r); this.wide = r.W >= 700; }
  op() { const s = ED.motor.slipFor(this.TL); return s === null ? null : { s, ...ED.motor(s) }; }
  start() { this.sim = { t: 0, w: 0, rec: [{ t: 0, i: ED.motor(1).i, n: 0 }], done: false, TL: this.TL }; }
  /* per-unit start-up: 2H dω/dt = T(s) − TL, H = 0.6 s (shown at a quarter of real speed). The run ends at steady speed, or at once
     when the starting torque is below the load (the motor cannot start), or after 4 s */
  step(dt) { const S = this.sim; if (!S || S.done) return; ED1.TorqueSpeed.advance(S, this.TL, dt * 0.25); }
  draw() {
    const c = this.ctx, W = this.W, H = this.H; c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    const A = this.wide ? { x: 0, y: 0, w: W * 0.56, h: H } : { x: 0, y: 0, w: W, h: H * 0.56 };
    const B = this.wide ? { x: W * 0.56, y: 0, w: W * 0.44, h: H } : { x: 0, y: H * 0.56, w: W, h: H * 0.44 };
    this.curves(c, A); this.timePlot(c, B);
  }
  curves(c, b) {
    const m = { l: 40, r: 40, t: 30, b: 36 }, x0 = b.x + m.l, x1 = b.x + b.w - m.r, y0 = b.y + m.t, y1 = b.y + b.h - m.b;
    const X = n => x0 + (x1 - x0) * n / this.ns, YT = T => y1 - (y1 - y0) * T / 3.6, YI = i => y1 - (y1 - y0) * i / 7.2;
    c.strokeStyle = C.grid; c.lineWidth = 1; c.strokeRect(x0, y0, x1 - x0, y1 - y0);
    [0, 500, 1000, 1500].forEach(n => { c.beginPath(); c.moveTo(X(n), y0); c.lineTo(X(n), y1); c.stroke(); ED.text(c, String(n), X(n), y1 + 15, { size: 11, align: 'center', color: C.muted }); });
    [1, 2, 3].forEach(v => { c.beginPath(); c.moveTo(x0, YT(v)); c.lineTo(x1, YT(v)); c.stroke(); ED.text(c, v + '×', x0 - 6, YT(v) + 4, { size: 11, align: 'right', color: C.pink }); ED.text(c, 2 * v + '×', x1 + 6, YT(v) + 4, { size: 11, color: C.V }); });
    ED.ttext(c, ['ความเร็ว (รอบต่อนาที)', 'speed (rpm)'], (x0 + x1) / 2, y1 + 30, { size: 12, align: 'center', color: C.muted });
    ED.ttext(c, ['แรงบิด', 'torque'], x0, y0 - 10, { size: 12, color: C.pink }); ED.ttext(c, ['กระแส', 'current'], x1, y0 - 10, { size: 12, align: 'right', color: C.V });
    const line = (f, Y, col, w = 2.2, dash) => { c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash || []); c.beginPath();
      for (let j = 0; j <= 300; j++) { const n = this.ns * j / 300, s = Math.max(1 - n / this.ns, 1e-4), y = Y(f(s)); j ? c.lineTo(X(n), y) : c.moveTo(X(n), y); } c.stroke(); c.setLineDash([]); };
    line(s => ED.motor(s).i, YI, C.V); line(s => ED.motor(s).T, YT, C.pink); line(() => this.TL, YT, C.good, 1.6, [6, 5]);
    ED.ttext(c, ['ภาระ', 'load'], x0 + 6, YT(this.TL) - 6, { size: 11, color: C.good });
    // starting point and operating point
    const st = ED.motor(1); c.fillStyle = C.V; c.beginPath(); c.arc(X(0), YI(st.i), 4.5, 0, TAU); c.fill(); c.fillStyle = C.pink; c.beginPath(); c.arc(X(0), YT(st.T), 4.5, 0, TAU); c.fill();
    ED.text(c, `${ED.fd(st.i, 1)}×`, X(0) + 8, YI(st.i) + 4, { size: 12, color: C.V, weight: 600 });
    const o = this.op(), S = this.sim;
    if (S && S.noStart) { c.fillStyle = C.bad; [YI(st.i), YT(st.T)].forEach(y => { c.beginPath(); c.arc(X(0), y, 6, 0, TAU); c.fill(); }); }
    else if (S) { const n = S.w * this.ns, s = Math.max(1 - S.w, 1e-4), mm = ED.motor(s); c.strokeStyle = 'rgba(255,255,255,.5)'; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(X(n), y0); c.lineTo(X(n), y1); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#fff'; [YI(mm.i), YT(mm.T)].forEach(y => { c.beginPath(); c.arc(X(n), y, 5, 0, TAU); c.fill(); }); }
    else if (o) { const n = (1 - o.s) * this.ns; c.fillStyle = '#fff'; [YI(o.i), YT(o.T)].forEach(y => { c.beginPath(); c.arc(X(n), y, 5, 0, TAU); c.fill(); }); }
  }
  timePlot(c, b) {
    const m = { l: 40, r: 14, t: 30, b: 36 }, x0 = b.x + m.l, x1 = b.x + b.w - m.r, y0 = b.y + m.t, y1 = b.y + b.h - m.b, S = this.sim;
    const tEnd = S ? Math.max(1, Math.ceil(S.t * 2) / 2) : 1, X = t => x0 + (x1 - x0) * t / tEnd, YI = i => y1 - (y1 - y0) * i / 7.2, YN = n => y1 - (y1 - y0) * n / 1.2;
    c.strokeStyle = C.grid; c.lineWidth = 1; c.strokeRect(x0, y0, x1 - x0, y1 - y0);
    for (let t = 0; t <= tEnd + 1e-9; t += tEnd > 2 ? 1 : 0.5) { c.beginPath(); c.moveTo(X(t), y0); c.lineTo(X(t), y1); c.stroke(); ED.text(c, ED.fd(t, 1), X(t), y1 + 15, { size: 11, align: 'center', color: C.muted }); }
    [2, 4, 6].forEach(v => { c.beginPath(); c.moveTo(x0, YI(v)); c.lineTo(x1, YI(v)); c.stroke(); ED.text(c, v + '×', x0 - 6, YI(v) + 4, { size: 11, align: 'right', color: C.V }); });
    ED.ttext(c, ['เวลาหลังกดเริ่มเดิน (วินาที)', 'time after start (s)'], (x0 + x1) / 2, y1 + 30, { size: 12, align: 'center', color: C.muted });
    ED.ttext(c, ['กระแส', 'current'], x0, y0 - 10, { size: 12, color: C.V }); ED.ttext(c, ['ความเร็ว', 'speed'], x1, y0 - 10, { size: 12, align: 'right', color: C.good });
    if (!S) { ED.ttext(c, ['กด "เริ่มเดิน" แล้วดูกระแสระหว่างเร่งความเร็ว', 'press "Start" and watch the current while it speeds up'], (x0 + x1) / 2, (y0 + y1) / 2, { size: 12, align: 'center', color: C.muted }); return; }
    const pl = (key, Y, col) => { c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); S.rec.forEach((r, j) => { const x = X(r.t), y = Y(r[key]); j ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); };
    pl('i', YI, C.V); pl('n', YN, C.good);
    c.strokeStyle = 'rgba(126,231,135,.35)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(x0, YN(1)); c.lineTo(x1, YN(1)); c.stroke(); c.setLineDash([]);
    ED.text(c, 'nₛ', x1 - 4, YN(1) - 4, { size: 11, align: 'right', color: C.good });
  }
};

ED1.TorqueSpeed.advance = (S, TL, span) => {
  const h = 0.0005, H = 0.6, o = ED.motor.slipFor(TL); let left = span;
  if (S.w === 0 && ED.motor(1).T <= TL) { S.done = true; S.noStart = true; S.stall = !o; return; }
  while (left > 0) { const m = ED.motor(1 - S.w); S.w += h * (m.T - TL) / (2 * H); if (S.w < 0) S.w = 0; S.t += h; left -= h;
    if (Math.round(S.t / h) % 20 === 0) S.rec.push({ t: S.t, i: ED.motor(1 - S.w).i, n: S.w });
    if (o && S.tRun === undefined && S.w >= 0.95 * (1 - o)) S.tRun = S.t;
    if ((o && Math.abs((1 - S.w) - o) < 2e-4) || S.t > 4) { S.done = true; break; } }
};
/* the whole run for one load, for the summary table: {noStart, stall, tRun, s, i} */
ED1.TorqueSpeed.simulate = TL => { const S = { t: 0, w: 0, rec: [], done: false }; while (!S.done) ED1.TorqueSpeed.advance(S, TL, 0.05);
  const o = ED.motor.slipFor(TL); return { noStart: !!S.noStart, stall: !o, tRun: S.tRun, s: o, i: o ? ED.motor(o).i : ED.motor(1).i }; };

/* ======================================================================================================== 3) nameplates */
ED1.PLATES = {
  m1: { kw: 1.5, vlo: 230, vhi: 400, ilo: 5.80, ihi: 3.35, rpm: 1430, pf: 0.79, eff: 82.5, ie: 'IE2', frame: '90L', ip: 'IP55', cls: 'F', kg: 13 },
  m2: { kw: 7.5, vlo: 400, vhi: 690, ilo: 14.7, ihi: 8.50, rpm: 1455, pf: 0.83, eff: 89.0, ie: 'IE3', frame: '132M', ip: 'IP55', cls: 'F', kg: 52 }
};
ED1.PLATE_HELP = {
  type: [['ชนิด: 3~ Mot. = มอเตอร์ไฟฟ้ากระแสสลับ 3 เฟส ผลิตตามมาตรฐาน IEC 60034', 'Type: 3~ Mot. = three-phase AC motor, built to IEC 60034'], ''],
  frame: [['ขนาดโครง (frame size) เช่น 90L: ตัวเลขคือความสูงจากฐานถึงกึ่งกลางเพลาเป็นมิลลิเมตร ตัวอักษรบอกความยาวโครง ใช้เลือกมอเตอร์ที่ใส่แทนกันได้', 'Frame size, e.g. 90L: the number is the shaft height above the feet in millimetres, the letter the frame length. Motors of the same frame are interchangeable.'], ''],
  volt: [['แรงดัน 230/400 V Δ/Y: ต่อเดลตา (Δ) กับระบบ 230 V หรือต่อสตาร์ (Y) กับระบบ 400 V ตัวเลขที่ต่ำกว่าคือแรงดันที่ขดลวดแต่ละชุดทนได้ ระบบไฟ 3 เฟสในไทยคือ 400 V จึงต้องต่อสตาร์', 'Voltage 230/400 V Δ/Y: connect it in delta (Δ) on a 230 V supply or in star (Y) on a 400 V supply. The lower number is the voltage one winding is built for. A Thai three-phase supply is 400 V, so this motor is connected in star.'],
         ['แรงดัน 400/690 V Δ/Y: ต่อเดลตากับระบบ 400 V หรือต่อสตาร์กับระบบ 690 V ขดลวดแต่ละชุดทน 400 V มอเตอร์แบบนี้จึงเริ่มเดินแบบสตาร์-เดลตาบนระบบ 400 V ได้ (บทที่ 8)', 'Voltage 400/690 V Δ/Y: delta on a 400 V supply or star on 690 V. Each winding is built for 400 V, so on a 400 V supply this motor can be started star-delta (chapter 8).']],
  amp: [['กระแสพิกัด (กระแสในสายเมื่อจ่ายกำลังเต็มพิกัด) ตัวแรกคือเมื่อต่อเดลตาที่แรงดันต่ำ ตัวหลังคือเมื่อต่อสตาร์ที่แรงดันสูง ใช้ตั้งโอเวอร์โหลดรีเลย์และเลือกขนาดสาย (บทที่ 13)', 'Rated current (line current at full rated output): the first value is for delta at the lower voltage, the second for star at the higher voltage. It is used to set the overload relay and to size the cable (chapter 13).'], ''],
  kw: [['กำลังพิกัด: กำลังกลที่เพลา ไม่ใช่กำลังไฟฟ้าที่กินจากสาย กำลังไฟฟ้าเข้า = กำลังพิกัด ÷ ประสิทธิภาพ', 'Rated power: the mechanical power at the shaft, not the electrical power taken from the supply. Electrical input = rated power ÷ efficiency.'], ''],
  pf: [['ตัวประกอบกำลัง (cos φ) ที่พิกัด', 'Power factor (cos φ) at rated load'], ''],
  rpm: [['ความเร็วพิกัด (รอบต่อนาที) ต่ำกว่าความเร็วซิงโครนัสเล็กน้อย เช่น 1430 rpm ที่ 50 Hz แปลว่าเป็นมอเตอร์ 4 ขั้ว (ซิงโครนัส 1500 rpm) สลิป 4.7 %', 'Rated speed (rpm), a little below the synchronous speed: 1430 rpm at 50 Hz means a 4-pole motor (1500 rpm synchronous) with 4.7 % slip.'],
        ['ความเร็วพิกัด 1455 rpm ที่ 50 Hz: มอเตอร์ 4 ขั้ว (ซิงโครนัส 1500 rpm) สลิป 3 %', 'Rated speed 1455 rpm at 50 Hz: a 4-pole motor (1500 rpm synchronous), 3 % slip.']],
  hz: [['ความถี่ของระบบไฟ ไทยใช้ 50 Hz', 'Supply frequency; Thailand uses 50 Hz'], ''],
  eff: [['ประสิทธิภาพที่พิกัด และชั้นประสิทธิภาพตาม IEC 60034-30-1 (IE1 ต่ำสุด IE4 สูง)', 'Efficiency at rated load and the efficiency class of IEC 60034-30-1 (IE1 lowest, IE4 high)'], ''],
  ip: [['ระดับการป้องกัน IP55: เลขตัวแรก 5 กันฝุ่น เลขตัวที่สอง 5 กันน้ำฉีด', 'Degree of protection IP55: first digit 5 = dust-protected, second digit 5 = protected against water jets'], ''],
  cls: [['คลาสฉนวน F: ขดลวดทนอุณหภูมิได้ถึง 155 °C', 'Insulation class F: the winding insulation is rated for 155 °C'], ''],
  duty: [['ลักษณะงาน S1: ทำงานต่อเนื่องที่พิกัดได้ตลอด', 'Duty S1: continuous running at rated load'], '']
};
/* el: container; key: 'm1' | 'm2'; help: element for the explanation */
ED1.plate = (el, key, help) => {
  const p = ED1.PLATES[key], f = (x, d) => ED.fd(x, d);
  const cell = (k, html, span = 1) => `<button type="button" class="pf" data-k="${k}" style="grid-column:span ${span}">${html}</button>`;
  el.innerHTML = `<div class="plate"><div class="plate-h">MOTOR 3~ <span>IEC 60034</span></div><div class="plate-g">` +
    cell('type', '<i>Type</i> 3~ Mot.', 2) + cell('frame', `<i>Frame</i> ${p.frame}`) + cell('duty', '<i>Duty</i> S1') +
    cell('volt', `<b>${p.vlo}/${p.vhi} V</b> <b>Δ/Y</b>`, 2) + cell('amp', `<b>${f(p.ilo, 2)}/${f(p.ihi, 2)} A</b>`, 2) +
    cell('kw', `<b>${f(p.kw, 1)} kW</b>`) + cell('pf', `cos φ ${f(p.pf, 2)}`) + cell('rpm', `<b>${p.rpm} min⁻¹</b>`) + cell('hz', '50 Hz') +
    cell('eff', `η ${f(p.eff, 1)} % · ${p.ie}`, 2) + cell('ip', p.ip) + cell('cls', `Th.Cl. ${p.cls}`) + '</div></div>';
  const show = k => { const h = ED1.PLATE_HELP[k], i = key === 'm2' && h[1] ? 1 : 0, s = h[i] || h[0];
    help.innerHTML = `<div class="answer">${tt(s)}</div>`; el.querySelectorAll('.pf').forEach(b => b.classList.toggle('on', b.dataset.k === k)); };
  el.querySelectorAll('.pf').forEach(b => b.addEventListener('click', () => show(b.dataset.k)));
  help.innerHTML = `<p class="simnote">${T('แตะช่องบนป้ายพิกัดเพื่ออ่านความหมาย', 'Tap a field of the nameplate to read what it means')}</p>`;
};

global.ED1 = ED1;
})(window);

/* ======================================================================================================== 4) terminal box */
(function () {
const ED1 = window.ED1, C = ED.COL, tt = ED.tt, T = (th, en) => MC.t(th, en), TAU = Math.PI * 2;
/* terminal positions in the IEC box: top row W2 U2 V2, bottom row U1 V1 W1 (col, row) */
const POS = { W2: [0, 0], U2: [1, 0], V2: [2, 0], U1: [0, 1], V1: [1, 1], W1: [2, 1] };
const WIND = [['U', 'U1', 'U2', C.U], ['V', 'V1', 'V2', C.V], ['W', 'W1', 'W2', C.W]];
const LINKS = { tW2U2: ['W2', 'U2'], tU2V2: ['U2', 'V2'], vU1W2: ['U1', 'W2'], vV1U2: ['V1', 'U2'], vW1V2: ['W1', 'V2'], bU1V1: ['U1', 'V1'], bV1W1: ['V1', 'W1'] };
ED1.TBOX_LINKS = LINKS;
ED1.TBOX_MOTORS = {
  m1: { vlo: 230, vhi: 400, ilo: 5.80, ihi: 3.35, name: ['มอเตอร์ 1.5 kW 230/400 V Δ/Y', '1.5 kW motor, 230/400 V Δ/Y'] },
  m2: { vlo: 400, vhi: 690, ilo: 14.7, ihi: 8.50, name: ['มอเตอร์ 7.5 kW 400/690 V Δ/Y', '7.5 kW motor, 400/690 V Δ/Y'] },
  lab: { vlo: 220, vhi: 380, ilo: 2.00, ihi: 1.14, name: ['มอเตอร์ในห้องปฏิบัติการ 0.4 kW 220/380 V Δ/Y', 'lab motor, 0.4 kW 220/380 V Δ/Y'] }
};
/* complex helpers */
const cx = (re, im = 0) => ({ re, im }), add = (a, b) => cx(a.re + b.re, a.im + b.im), sub = (a, b) => cx(a.re - b.re, a.im - b.im), sc = (a, k) => cx(a.re * k, a.im * k), mag = a => Math.hypot(a.re, a.im);
const pol = (r, deg) => cx(r * Math.cos(deg * Math.PI / 180), r * Math.sin(deg * Math.PI / 180));

ED1.TBox = class {
  constructor(cv, o = {}) { this.cv = cv; this.o = o; this.links = new Set(); this.motor = 'm1'; this.Vs = 400; this.swap = false; this.spin = 0; this.hot = null;
    this.resize(); cv.addEventListener('click', e => this.click(e)); cv.addEventListener('mousemove', e => this.hover(e)); cv.addEventListener('mouseleave', () => { this.hot = null; }); }
  resize() { const r = ED.fit(this.cv, W => (W < 560 ? W * 1.25 : Math.min(420, W * 0.6))); Object.assign(this, r); this.wide = r.W >= 560; this.layout(); }
  layout() { const W = this.W, H = this.H, A = this.wide ? { x: 0, y: 0, w: W * 0.54, h: H } : { x: 0, y: 0, w: W, h: H * 0.5 };
    this.A = A; this.B = this.wide ? { x: W * 0.54, y: 0, w: W * 0.46, h: H } : { x: 0, y: H * 0.5, w: W, h: H * 0.5 };
    const bw = Math.min(A.w * 0.8, A.h * 1.05), bh = bw * 0.62; this.box = { x: A.x + (A.w - bw) / 2, y: A.y + 34, w: bw, h: bh };
    const b = this.box; this.P = {}; Object.entries(POS).forEach(([k, [c, r]]) => { this.P[k] = { x: b.x + b.w * (0.2 + 0.3 * c), y: b.y + b.h * (r ? 0.72 : 0.3) }; });
    this.rs = Math.max(11, b.w * 0.055); }
  setPreset(p) { this.links = new Set(p === 'star' ? ['tW2U2', 'tU2V2'] : p === 'delta' ? ['vU1W2', 'vV1U2', 'vW1V2'] : []); this.changed(); }
  changed() { if (this.o.onChange) this.o.onChange(this.solve()); }
  linkAt(p) { let best = null, bd = 1e9; Object.entries(LINKS).forEach(([k, [a, b]]) => { const A = this.P[a], B = this.P[b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, d = Math.hypot(p.x - mx, p.y - my);
    if (d < bd) { bd = d; best = k; } }); return bd < this.rs * 2.2 ? best : null; }
  click(e) { const k = this.linkAt(MC.pointer(this.cv, e)); if (!k) return; this.links.has(k) ? this.links.delete(k) : this.links.add(k); this.changed(); }
  hover(e) { this.hot = this.linkAt(MC.pointer(this.cv, e)); this.cv.style.cursor = this.hot ? 'pointer' : 'default'; }
  /* nodal solution with the three windings as equal admittances; supply: star-point voltages of a balanced system */
  solve() {
    const par = {}; Object.keys(POS).forEach(k => { par[k] = k; }); const f = k => (par[k] === k ? k : (par[k] = f(par[k])));
    this.links.forEach(l => { const [a, b] = LINKS[l]; par[f(a)] = f(b); });
    const Vp = this.Vs / Math.sqrt(3), sup = this.swap ? { U1: pol(Vp, -120), V1: pol(Vp, 0), W1: pol(Vp, 120) } : { U1: pol(Vp, 0), V1: pol(Vp, -120), W1: pol(Vp, 120) };
    const lineOf = this.swap ? { U1: 'L2', V1: 'L1', W1: 'L3' } : { U1: 'L1', V1: 'L2', W1: 'L3' };
    const fixed = {}; let short = null;
    Object.entries(sup).forEach(([k, v]) => { const g = f(k); if (fixed[g] && !short) short = [fixed[g].line, lineOf[k]]; else fixed[g] = { v, line: lineOf[k] }; });
    if (short) return { short: short.sort(), wv: [0, 0, 0], kind: 'short' };
    const groups = [...new Set(Object.keys(POS).map(f))], V = {}; groups.forEach(g => { V[g] = fixed[g] ? fixed[g].v : cx(0); });
    const reach = new Set(Object.keys(fixed)); let grew = true;   // groups joined to the supply through windings
    while (grew) { grew = false; WIND.forEach(([, a, b]) => { const ga = f(a), gb = f(b); if (reach.has(ga) !== reach.has(gb)) { reach.add(ga); reach.add(gb); grew = true; } }); }
    for (let it = 0; it < 400; it++) groups.forEach(g => { if (fixed[g] || !reach.has(g)) return; let s = cx(0), n = 0;
      WIND.forEach(([, a, b]) => { const ga = f(a), gb = f(b); if (ga === g && gb !== g) { s = add(s, V[gb]); n++; } else if (gb === g && ga !== g) { s = add(s, V[ga]); n++; } }); if (n) V[g] = sc(s, 1 / n); });
    const wv = WIND.map(([, a, b]) => (reach.has(f(a)) ? mag(sub(V[f(a)], V[f(b)])) : 0));
    const m = ED1.TBOX_MOTORS[this.motor], Vr = m.vlo, on = wv.filter(v => v > 1).length, eq = Math.max(...wv) - Math.min(...wv) < 0.02 * Math.max(...wv, 1);
    const L = this.links, star = ['tW2U2', 'tU2V2'].every(k => L.has(k)) && f('W2') === f('V2'), delta = ['vU1W2', 'vV1U2', 'vW1V2'].every(k => L.has(k));
    let kind = 'none', ratio = wv[0] / Vr;
    if (on === 0) kind = 'none'; else if (on < 3 || !eq) kind = 'unbal'; else kind = ratio > 1.1 ? 'over' : ratio < 0.9 ? 'under' : 'ok';
    const conn = star ? 'star' : delta ? 'delta' : '';
    let iL = null; if (kind === 'ok') iL = conn === 'delta' ? m.ilo : m.ihi;   // rated line current from the nameplate
    return { wv, kind, ratio, conn, iL, iPh: kind === 'ok' ? m.ihi : null, Vr, m };
  }
  step(dt) { const r = this.solve(); if (r.kind === 'ok' || r.kind === 'under' || r.kind === 'over') this.spin += dt * (this.swap ? -1 : 1) * (r.kind === 'under' ? 1.2 : 3); }
  draw() {
    const c = this.ctx, W = this.W, H = this.H, b = this.box, r = this.solve(); c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    ED.ttext(c, ['กล่องขั้วมอเตอร์ (มองจากด้านบน) · แตะตำแหน่งเพื่อวาง/เอาสะพานออก', 'terminal box (top view) · tap a place to fit or remove a link'], this.A.x + 10, 18, { size: 12, color: C.muted });
    // box
    c.fillStyle = '#1b2036'; ED.rrect(c, b.x, b.y, b.w, b.h, 12); c.fill(); c.strokeStyle = C.metal; c.lineWidth = 1.6; c.stroke();
    // windings behind the board (dashed coils)
    WIND.forEach(([k, a, bb, col], i) => { const A = this.P[a], B = this.P[bb], v = r.wv[i];
      c.strokeStyle = col; c.globalAlpha = 0.55; c.lineWidth = 2; c.setLineDash([5, 4]);
      const qx = (A.x + B.x) / 2, qy = (A.y + B.y) / 2 + (k === 'W' ? b.h * 0.22 : 0);   // control point: the long W winding bows downwards
      c.beginPath(); c.moveTo(A.x, A.y); c.quadraticCurveTo(qx, qy, B.x, B.y); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
      const tq = k === 'W' ? 0.2 : 0.5, px = (1 - tq) * (1 - tq) * A.x + 2 * tq * (1 - tq) * qx + tq * tq * B.x, py = (1 - tq) * (1 - tq) * A.y + 2 * tq * (1 - tq) * qy + tq * tq * B.y;
      ED.text(c, k, px + (k === 'U' ? -8 : k === 'V' ? 8 : 0), py + (k === 'W' ? 16 : 4), { size: 12, align: k === 'U' ? 'right' : k === 'V' ? 'left' : 'center', color: col, weight: 700 }); });   // the voltages are in the bars
    // link places, links
    Object.entries(LINKS).forEach(([key, [a, bb]]) => { const A = this.P[a], B = this.P[bb], on = this.links.has(key);
      if (on) { c.strokeStyle = C.copper; c.lineWidth = this.rs * 0.75; c.lineCap = 'round'; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.lineCap = 'butt';
        c.strokeStyle = '#f0b27a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); }
      else { const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, hot = this.hot === key;
        c.strokeStyle = hot ? C.accent : 'rgba(159,179,200,.35)'; c.lineWidth = hot ? 2 : 1.2; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.setLineDash([]);
        c.fillStyle = hot ? C.accent : 'rgba(159,179,200,.5)'; c.beginPath(); c.arc(mx, my, 3.2, 0, TAU); c.fill(); } });
    // studs
    Object.entries(this.P).forEach(([k, p]) => { c.fillStyle = '#cfd6df'; c.beginPath(); c.arc(p.x, p.y, this.rs * 0.62, 0, TAU); c.fill(); c.strokeStyle = '#6b7399'; c.lineWidth = 1; c.stroke();
      c.strokeStyle = '#6b7399'; c.beginPath(); c.moveTo(p.x - this.rs * 0.35, p.y); c.lineTo(p.x + this.rs * 0.35, p.y); c.moveTo(p.x, p.y - this.rs * 0.35); c.lineTo(p.x, p.y + this.rs * 0.35); c.stroke();
      const top = POS[k][1] === 0; if (top) ED.text(c, k, p.x, p.y - this.rs - 4, { size: 13, align: 'center', weight: 700, color: C.ink }); else ED.text(c, k, p.x + this.rs * 0.7 + 3, p.y + this.rs + 8, { size: 13, weight: 700, color: C.ink }); });
    // supply cables from below
    const lab = this.swap ? ['L2', 'L1', 'L3'] : ['L1', 'L2', 'L3'];
    ['U1', 'V1', 'W1'].forEach((k, i) => { const p = this.P[k], y2 = Math.min(this.A.y + this.A.h - 18, b.y + b.h + 46); c.strokeStyle = '#8c95b8'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(p.x, p.y + this.rs * 0.6); c.lineTo(p.x, y2); c.stroke(); ED.text(c, lab[i], p.x, y2 + 14, { size: 13, align: 'center', weight: 700, color: lab[i] === 'L3' ? C.W : this.swap ? (i ? C.U : C.V) : [C.U, C.V][i] }); });
    this.drawRight(c, r);
  }
  drawRight(c, r) {
    const B = this.B, cxm = B.x + B.w / 2, top = B.y + 14;
    // schematic of the connection
    const sz = Math.min(B.w * 0.36, B.h * 0.28), cy = top + 26 + sz * 0.75;
    if (r.kind === 'short') { ED.ttext(c, [`ลัดวงจรระหว่าง ${r.short[0]} กับ ${r.short[1]}`, `short circuit between ${r.short[0]} and ${r.short[1]}`], cxm, cy, { size: 15, align: 'center', color: C.bad, weight: 700 });
      ED.ttext(c, ['สะพานแถวล่างต่อสายสองเฟสชนกันโดยตรง', 'a bottom-row link joins two lines directly'], cxm, cy + 22, { size: 12, align: 'center', color: C.muted }); }
    else if (r.conn) this.schem(c, cxm, cy, sz, r.conn, r);
    else ED.ttext(c, r.kind === 'none' ? ['ยังไม่ครบวงจร: ขดลวดไม่มีกระแส', 'not complete: no winding current'] : ['การต่อนี้ไม่ใช่สตาร์หรือเดลตา', 'this is neither star nor delta'], cxm, cy, { size: 13, align: 'center', color: r.kind === 'none' ? C.muted : C.warn });
    // bars: winding voltage against its rating
    const y0 = cy + sz * 0.85 + 26, h = Math.max(70, B.y + B.h - y0 - 30), bw = Math.min(46, B.w * 0.14), Vmax = Math.max(r.Vr * 1.9, ...r.wv) || 1;
    const Y = v => y0 + h - h * v / Vmax; ED.ttext(c, ['แรงดันที่ขดลวดแต่ละชุดได้รับ', 'voltage across each winding'], cxm, y0 - 8, { size: 12, align: 'center', color: C.muted });
    c.strokeStyle = C.good; c.setLineDash([5, 4]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(B.x + 24, Y(r.Vr)); c.lineTo(B.x + B.w - 24, Y(r.Vr)); c.stroke(); c.setLineDash([]);
    ED.ttext(c, [`พิกัดขดลวด ${r.Vr} V`, `winding rating ${r.Vr} V`], B.x + B.w - 24, Y(r.Vr) - 5, { size: 11, align: 'right', color: C.good });
    WIND.forEach(([k, , , col], i) => { const x = cxm + (i - 1) * bw * 1.7 - bw / 2, v = r.wv[i]; c.fillStyle = col; c.globalAlpha = 0.85; c.fillRect(x, Y(v), bw, y0 + h - Y(v)); c.globalAlpha = 1;
      ED.text(c, k, x + bw / 2, y0 + h + 14, { size: 12, align: 'center', color: col, weight: 700 }); ED.text(c, `${Math.round(v)}`, x + bw / 2, Y(v) - 4, { size: 11, align: 'center', color: C.ink }); });
    c.strokeStyle = C.grid; c.beginPath(); c.moveTo(B.x + 20, y0 + h); c.lineTo(B.x + B.w - 20, y0 + h); c.stroke();
  }
  schem(c, x, y, s, conn, r) {
    const coil = (x1, y1, x2, y2, col) => { const n = 4, dx = (x2 - x1), dy = (y2 - y1), L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, px = -uy, py = ux, a = L * 0.22, b = L * 0.78;
      c.strokeStyle = col; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + ux * a, y1 + uy * a);
      for (let i = 0; i < n; i++) { const t0 = a + (b - a) * i / n, t1 = a + (b - a) * (i + 1) / n, tm = (t0 + t1) / 2, h = 6; c.quadraticCurveTo(x1 + ux * tm + px * h * 1.6, y1 + uy * tm + py * h * 1.6, x1 + ux * t1, y1 + uy * t1); }
      c.lineTo(x2, y2); c.stroke(); };
    const lab = this.swap ? ['L2', 'L1', 'L3'] : ['L1', 'L2', 'L3'];
    if (conn === 'star') { const pts = [-90, 30, 150].map(a => ({ x: x + s * Math.cos(a * Math.PI / 180), y: y + s * 0.95 * Math.sin(a * Math.PI / 180) }));
      pts.forEach((p, i) => { coil(p.x, p.y, x, y, [C.U, C.V, C.W][i]); ED.text(c, ['U1', 'V1', 'W1'][i] + ` (${lab[i]})`, p.x + (i === 0 ? 0 : i === 1 ? 8 : -8), p.y + (i === 0 ? -8 : 16), { size: 11, align: i === 0 ? 'center' : i === 1 ? 'left' : 'right', color: C.ink }); });
      c.fillStyle = C.ink; c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill(); ED.text(c, 'U2 V2 W2', x + 8, y + 4, { size: 10, color: C.muted });
      ED.ttext(c, ['สตาร์ (Y)', 'star (Y)'], x, y + s + 22, { size: 13, align: 'center', weight: 700, color: C.accent }); }
    else { const pts = [-90, 30, 150].map(a => ({ x: x + s * Math.cos(a * Math.PI / 180), y: y + s * 0.95 * Math.sin(a * Math.PI / 180) }));
      coil(pts[0].x, pts[0].y, pts[1].x, pts[1].y, C.U); coil(pts[1].x, pts[1].y, pts[2].x, pts[2].y, C.V); coil(pts[2].x, pts[2].y, pts[0].x, pts[0].y, C.W);
      ['U1·W2', 'V1·U2', 'W1·V2'].forEach((k, i) => { const p = pts[i]; c.fillStyle = C.ink; c.beginPath(); c.arc(p.x, p.y, 3.2, 0, TAU); c.fill();
        ED.text(c, `${k} (${lab[i]})`, p.x + (i === 0 ? 0 : i === 1 ? 8 : -8), p.y + (i === 0 ? -8 : 16), { size: 11, align: i === 0 ? 'center' : i === 1 ? 'left' : 'right', color: C.ink }); });
      ED.ttext(c, ['เดลตา (Δ)', 'delta (Δ)'], x, y + s + 22, { size: 13, align: 'center', weight: 700, color: C.accent }); }
    // shaft rotation icon
    if (r.kind === 'ok' || r.kind === 'under' || r.kind === 'over') { const rx = this.B.x + this.B.w - 34, ry = this.B.y + 40; c.strokeStyle = C.metal; c.lineWidth = 2; c.beginPath(); c.arc(rx, ry, 16, 0, TAU); c.stroke();
      c.strokeStyle = C.orange; c.lineWidth = 3; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx + 14 * Math.cos(this.spin), ry + 14 * Math.sin(this.spin)); c.stroke();
      ED.ttext(c, this.swap ? ['ทวนเข็ม', 'anticlockwise'] : ['ตามเข็ม', 'clockwise'], rx, ry + 30, { size: 11, align: 'center', color: C.good }); }
  }
};
})();

/* ======================================================================================================== 5) single-phase field, 6) start-up */
(function () {
const ED1 = window.ED1, C = ED.COL, tt = ED.tt, T = (th, en) => MC.t(th, en), TAU = Math.PI * 2, D2R = Math.PI / 180;
/* types: the auxiliary current leads the main current by phi; k = its size relative to the main current */
ED1.AUX = { off: { phi: 0, k: 0 }, split: { phi: 30, k: 1 }, cap: { phi: 85, k: 1 } };
const aM = -90 * D2R, aA = 180 * D2R;   // main winding axis up, auxiliary axis to the left: a leading auxiliary current turns the field clockwise

ED1.Field2 = class {
  constructor(cv, o = {}) { this.cv = cv; this.o = o; this.type = 'cap'; this.swapZ = false; this.split2 = false; this.run = true; this.th = 0; this.trail = []; this.resize(); }
  resize() { const r = ED.fit(this.cv, W => (W < 660 ? W * 1.32 : Math.min(420, W * 0.5))); Object.assign(this, r); this.wide = r.W >= 660; }
  cur(th = this.th) { const a = ED1.AUX[this.type]; return { m: Math.cos(th), a: (this.swapZ ? -1 : 1) * a.k * Math.cos(th + a.phi * D2R) }; }
  vec(th) { const i = this.cur(th); return { x: i.m * Math.cos(aM) + i.a * Math.cos(aA), y: i.m * Math.sin(aM) + i.a * Math.sin(aA) }; }
  quality() { let mx = 0, mn = 1e9; for (let d = 0; d < 360; d += 2) { const v = this.vec(d * D2R), m = Math.hypot(v.x, v.y); mx = Math.max(mx, m); mn = Math.min(mn, m); } return mn / mx; }
  dirSign() { if (this.type === 'off') return 0; const v0 = this.vec(0), v1 = this.vec(0.1); const cr = v0.x * v1.y - v0.y * v1.x; return Math.sign(cr); }   // +1 clockwise on screen
  step(dt) { if (this.run) this.th += TAU * 0.3 * dt; }
  draw() {
    const c = this.ctx, W = this.W, H = this.H; c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    const A = this.wide ? { x: 0, y: 0, w: W * 0.5, h: H } : { x: 0, y: 0, w: W, h: H * 0.62 }, B = this.wide ? { x: W * 0.5, y: 0, w: W * 0.5, h: H } : { x: 0, y: H * 0.62, w: W, h: H * 0.38 };
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2 + 12, R = Math.min(A.w, A.h) * 0.33;
    c.strokeStyle = C.metal; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke(); c.beginPath(); c.arc(cx, cy, R * 0.8, 0, TAU); c.stroke();
    ED.ttext(c, ['มองจากด้านปลายเพลา', 'seen from the drive end'], A.x + 10, A.y + 18, { size: 12, color: C.muted });
    // winding axes
    const L = R * 0.72, i = this.cur();
    c.setLineDash([3, 5]); c.lineWidth = 1; [[aM, C.U, 'U1–U2'], [aA, C.W, 'Z1–Z2']].forEach(([a, col, lab]) => { c.strokeStyle = col; c.beginPath(); c.moveTo(cx - R * Math.cos(a), cy - R * Math.sin(a)); c.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a)); c.stroke();
      ED.text(c, lab, cx + (R + 8) * Math.cos(a) + (a === aA ? -2 : 0), cy + (R + 8) * Math.sin(a) + (a === aM ? -2 : 4), { size: 12, align: a === aA ? 'right' : 'center', color: col, weight: 600 }); }); c.setLineDash([]);
    // locus of the field over a cycle
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1.5; c.beginPath(); for (let d = 0; d <= 360; d += 4) { const v = this.vec(d * D2R), x = cx + L * v.x / 1.0, y = cy + L * v.y / 1.0; d ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    if (Math.abs(i.m) > 0.03) ED.arrow(c, cx, cy, cx + L * i.m * Math.cos(aM), cy + L * i.m * Math.sin(aM), { color: C.U, width: 2.2, head: 8 });
    if (Math.abs(i.a) > 0.03) ED.arrow(c, cx, cy, cx + L * i.a * Math.cos(aA), cy + L * i.a * Math.sin(aA), { color: C.W, width: 2.2, head: 8 });
    const v = this.vec(this.th); if (Math.hypot(v.x, v.y) > 0.03) ED.arrow(c, cx, cy, cx + L * v.x, cy + L * v.y, { color: '#ffffff', width: 3.2, head: 11 });
    if (this.type === 'off' && this.split2) { const h = 0.5, a1 = aM + this.th, a2 = aM - this.th;   // two half-size fields turning opposite ways
      ED.arrow(c, cx, cy, cx + L * h * Math.cos(a1), cy + L * h * Math.sin(a1), { color: C.pink, width: 2, head: 8 }); ED.arrow(c, cx, cy, cx + L * h * Math.cos(a2), cy + L * h * Math.sin(a2), { color: C.good, width: 2, head: 8 }); }
    const q = this.quality(), ds = this.dirSign();
    const msg = this.type === 'off' ? ['สนามพองยุบอยู่กับที่: ไม่มีแรงบิดเริ่มเดิน', 'a pulsating field that stays put: no starting torque'] : q > 0.85 ? ['สนามหมุนเกือบกลม: แรงบิดเริ่มเดินดี', 'an almost circular rotating field: good starting torque'] : ['สนามหมุนแบบวงรี: แรงบิดเริ่มเดินพอใช้', 'an elliptical rotating field: some starting torque'];
    ED.ttext(c, msg, cx, A.y + A.h - 14, { size: 12, align: 'center', color: this.type === 'off' ? C.warn : C.good });
    if (ds) ED.ttext(c, ds > 0 ? ['หมุนตามเข็มนาฬิกา', 'turns clockwise'] : ['หมุนทวนเข็มนาฬิกา', 'turns anticlockwise'], cx, cy - R - 22, { size: 12, align: 'center', color: C.good });
    // waveforms
    const m = { l: 34, r: 12, t: 26, b: 26 }, x0 = B.x + m.l, x1 = B.x + B.w - m.r, y0 = B.y + m.t, y1 = B.y + B.h - m.b, ym = (y0 + y1) / 2, Am = (y1 - y0) / 2 * 0.86;
    c.strokeStyle = C.grid; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, ym); c.lineTo(x1, ym); c.moveTo(x0, y0); c.lineTo(x0, y1); c.stroke();
    [90, 180, 270, 360].forEach(d => { const x = x0 + (x1 - x0) * d / 360; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); ED.text(c, d + '°', x, y1 + 15, { size: 11, align: 'center', color: C.muted }); });
    [['m', C.U, T('กระแสขดรัน', 'main current')], ['a', C.W, T('กระแสขดสตาร์ต', 'auxiliary current')]].forEach(([k, col, lab], j) => { c.strokeStyle = col; c.lineWidth = 2; c.beginPath();
      for (let s = 0; s <= 180; s++) { const d = s * 2, x = x0 + (x1 - x0) * d / 360, y = ym - Am * this.cur(d * D2R)[k]; s ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      ED.ttext(c, lab, x0 + 6 + j * (x1 - x0) * 0.45, y0 - 9, { size: 12, color: col, weight: 600 }); });
    const d = ((this.th / D2R) % 360 + 360) % 360, xc = x0 + (x1 - x0) * d / 360; c.strokeStyle = 'rgba(255,255,255,.7)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(xc, y0); c.lineTo(xc, y1); c.stroke(); c.setLineDash([]);
  }
};

/* ---------------- 6) single-phase start-up ----------------
   Per-unit model (shape only): main-winding torque = forward minus backward field torque, odd in speed (it helps whichever way the
   rotor already turns, and is zero at standstill); the auxiliary winding adds a starting torque whose sign is set by Z1/Z2.
   Fan load 0.15 + 0.6 n². Centrifugal switch opens at 75 % of synchronous speed, closes again below 60 %. H = 1 s. */
const sk = 0.15, g = s => 2 / (s / sk + sk / s), sR = 0.05, KT = 1 / (g(sR) - g(2 - sR));   // breakdown ≈ 1.9 × rated
const Tmain = n => { const a = Math.abs(n); if (a < 1e-6) return 0; const s = 1 - a; return Math.sign(n) * KT * (g(Math.max(s, 1e-4)) - g(2 - s)); };
ED1.START_TYPES = { split: { Ka: 1.6, Ia: 3.4, sw: true, cap: false }, cap: { Ka: 3.0, Ia: 2.6, sw: true, cap: true }, psc: { Ka: 0.9, Ia: 0.55, sw: false, cap: true } };
ED1.Start1 = class {
  constructor(cv, o = {}) { this.cv = cv; this.o = o; this.type = 'cap'; this.swapZ = false; this.fault = ''; this.on = false; this.n = 0; this.t = 0; this.sw = true; this.rec = []; this.tOpen = null; this.dots = 0; this.warn = ''; this.resize(); }
  resize() { const r = ED.fit(this.cv, W => (W < 700 ? W * 1.3 : Math.min(420, W * 0.46))); Object.assign(this, r); this.wide = r.W >= 700; }
  start() { this.on = true; this.t = 0; this.rec = [{ t: 0, n: Math.abs(this.n), i: 0 }]; this.tOpen = null; this.warn = ''; this.stuckT = 0; this.logged = false; this.swapAtStart = this.swapZ; }
  stop() { this.on = false; }
  auxIn() { const ty = ED1.START_TYPES[this.type]; if (!ty.sw) return true; if (this.fault === 'open') return false; if (this.fault === 'closed') return true; return this.sw; }
  currents() { const ty = ED1.START_TYPES[this.type]; if (!this.on) return { m: 0, a: 0, i: 0 }; const a = Math.abs(this.n), im = 1 + 4.2 * Math.pow(1 - a, 1.5), ia = this.auxIn() ? ty.Ia * (1 - 0.45 * a) : 0; return { m: im, a: ia, i: Math.hypot(im * 0.8, im * 0.6 + ia) / 1.0 }; }
  step(dt) {
    const ty = ED1.START_TYPES[this.type], h = 0.001, H = 1.0; let left = dt * 0.5;
    while (left > 0) { left -= h; const a = Math.abs(this.n);
      if (ty.sw) { if (a >= 0.75) this.sw = false; else if (a < 0.6) this.sw = true; }
      if (this.on && this.tOpen === null && ty.sw && !this.sw && this.fault !== 'closed') this.tOpen = this.t;
      let Te = 0; if (this.on) { Te = Tmain(this.n); if (this.auxIn()) Te += (this.swapZ ? -1 : 1) * ty.Ka * Math.max(0, 1 - 0.7 * a); }
      const TL = 0.15 + 0.6 * this.n * this.n;
      if (a < 1e-4 && Math.abs(Te) <= 0.15) this.n = 0; else this.n += h * (Te - Math.sign(this.n || Te) * TL) / (2 * H);
      if (this.on) { this.t += h; if (Math.round(this.t / h) % 15 === 0 && this.t < 6) this.rec.push({ t: this.t, n: Math.abs(this.n), i: this.currents().i });
        if (a < 0.02 && this.t > 2.5 && this.fault === 'open') this.warn = 'stall';
        if (this.fault === 'closed' && ty.sw && a > 0.75 && this.t > 3) this.warn = 'hot'; } }
    const cu = this.currents(); this.dots = (this.dots + dt * (cu.m + cu.a) * 0.6) % 1;
  }
  draw() {
    const c = this.ctx, W = this.W, H = this.H; c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    const A = this.wide ? { x: 0, y: 0, w: W * 0.5, h: H } : { x: 0, y: 0, w: W, h: H * 0.55 }, B = this.wide ? { x: W * 0.5, y: 0, w: W * 0.5, h: H } : { x: 0, y: H * 0.55, w: W, h: H * 0.45 };
    this.schem(c, A); this.plot(c, B);
  }
  schem(c, b) {
    const ty = ED1.START_TYPES[this.type], cu = this.currents(), on = this.on;
    const xL = b.x + 30, yL = b.y + 44, yN = b.y + b.h - 40, xM = b.x + b.w * 0.36, xA = b.x + b.w * 0.72, yT1 = yL + 36, yT2 = yN - 36;
    const wire = (pts, live, col = live ? C.V : '#59607e', w = 2) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); };
    ED.text(c, 'L', xL - 16, yL + 4, { size: 13, weight: 700, color: C.U }); ED.text(c, 'N', xL - 16, yN + 4, { size: 13, weight: 700, color: C.N });
    const live = on; wire([[xL, yL], [xA + 30, yL]], live, live ? C.U : '#59607e', 2.5); wire([[xL, yN], [xA + 30, yN]], live, live ? C.N : '#59607e', 2.5);
    // terminal board: U1 Z1 top, U2 Z2 bottom (forward); Z swapped crosses the auxiliary leads
    const term = (x, y, lab) => { c.fillStyle = '#cfd6df'; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); ED.text(c, lab, x + 9, y + 4, { size: 12, weight: 700, color: C.ink }); };
    wire([[xM, yL], [xM, yT1]], live); wire([[xM, yN], [xM, yT2]], live);
    const zTop = this.swapZ ? yN : yL, zBot = this.swapZ ? yL : yN;
    wire([[xA, zTop], [xA, zTop === yL ? yT1 : yT2]], live && this.auxIn()); wire([[xA, zBot], [xA, zBot === yL ? yT1 : yT2]], live && this.auxIn());
    // main winding between U1 and U2
    const coil = (x, y1, y2, col, act) => { c.strokeStyle = act ? col : '#59607e'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x, y1); const n = 4, a = y1 + (y2 - y1) * 0.2, bb = y1 + (y2 - y1) * 0.8; c.lineTo(x, a);
      for (let i = 0; i < n; i++) { const t0 = a + (bb - a) * i / n, t1 = a + (bb - a) * (i + 1) / n; c.quadraticCurveTo(x + 14, (t0 + t1) / 2, x, t1); } c.lineTo(x, y2); c.stroke(); };
    coil(xM, yT1, yT2, C.U, on); ED.ttext(c, ['ขดรัน', 'main'], xM - 12, (yT1 + yT2) / 2 + 4, { size: 12, align: 'right', color: C.U });
    // auxiliary branch: winding, capacitor, centrifugal switch
    const yz1 = yT1, yz2 = yT2, ym1 = yz1 + (yz2 - yz1) * 0.42, yc = yz1 + (yz2 - yz1) * 0.62, ys = yz1 + (yz2 - yz1) * 0.82, act = on && this.auxIn();
    coil(xA, yz1, ym1, C.W, act); ED.ttext(c, ['ขดสตาร์ต', 'auxiliary'], xA + 18, (yz1 + ym1) / 2 + 4, { size: 12, color: C.W });
    if (ty.cap) { wire([[xA, ym1], [xA, yc - 4]], act); c.strokeStyle = act ? C.purple : '#59607e'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(xA - 10, yc - 4); c.lineTo(xA + 10, yc - 4); c.moveTo(xA - 10, yc + 4); c.lineTo(xA + 10, yc + 4); c.stroke();
      ED.text(c, 'C', xA + 16, yc + 4, { size: 12, color: C.purple, weight: 700 }); wire([[xA, yc + 4], [xA, ty.sw ? ys - 8 : yz2]], act); }
    else wire([[xA, ym1], [xA, ty.sw ? ys - 8 : yz2]], act);
    if (ty.sw) { const closed = this.auxIn(); c.strokeStyle = closed ? (act ? C.orange : '#8c95b8') : C.orange; c.lineWidth = 2.4; c.beginPath(); c.moveTo(xA, ys - 8);
      closed ? c.lineTo(xA, ys + 8) : c.lineTo(xA + 11, ys + 6); c.stroke(); wire([[xA, ys + 8], [xA, yz2]], act);
      ED.ttext(c, closed ? ['สวิตช์แรงเหวี่ยง: ต่อ', 'centrifugal switch: closed'] : ['สวิตช์แรงเหวี่ยง: ตัด', 'centrifugal switch: open'], xA + 16, ys + 4, { size: 11, color: C.orange }); }
    term(xM, yT1, 'U1'); term(xM, yT2, 'U2'); term(xA, yT1, this.swapZ ? 'Z2' : 'Z1'); term(xA, yT2, this.swapZ ? 'Z1' : 'Z2');
    // current dots on the two branches
    const dot = (x, y1, y2, amt, col) => { if (amt < 0.05) return; const L = y2 - y1, k = Math.max(3, Math.round(L / 26)); c.fillStyle = col; for (let i = 0; i < k; i++) { const f = ((i / k + this.dots) % 1); c.beginPath(); c.arc(x, y1 + L * f, 2.6, 0, TAU); c.fill(); } };
    dot(xM - 0.5, yL, yN, cu.m, C.V); if (act) dot(xA - 0.5, yL, yN, cu.a, C.V);
    // shaft
    const rx = b.x + b.w - 30, ry = b.y + 24; c.strokeStyle = C.metal; c.lineWidth = 2; c.beginPath(); c.arc(rx, ry, 13, 0, TAU); c.stroke();
    const ang = (this.ang = (this.ang || 0) + this.n * 0.25); c.strokeStyle = C.orange; c.lineWidth = 3; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx + 11 * Math.cos(ang), ry + 11 * Math.sin(ang)); c.stroke();
    ED.text(c, `${Math.round(Math.abs(this.n) * 1500)} rpm`, rx - 20, ry + 4, { size: 12, align: 'right', color: C.good, weight: 600 });
    if (Math.abs(this.n) > 0.02) ED.ttext(c, this.n > 0 ? ['ตามเข็ม', 'clockwise'] : ['ทวนเข็ม', 'anticlockwise'], rx, ry + 28, { size: 11, align: 'center', color: C.good });
  }
  plot(c, b) {
    const m = { l: 40, r: 40, t: 30, b: 36 }, x0 = b.x + m.l, x1 = b.x + b.w - m.r, y0 = b.y + m.t, y1 = b.y + b.h - m.b, tE = 4;
    const X = t => x0 + (x1 - x0) * Math.min(t, tE) / tE, YN = n => y1 - (y1 - y0) * n / 1.15, YI = i => y1 - (y1 - y0) * i / 8;
    c.strokeStyle = C.grid; c.lineWidth = 1; c.strokeRect(x0, y0, x1 - x0, y1 - y0);
    for (let t = 0; t <= tE; t++) { c.beginPath(); c.moveTo(X(t), y0); c.lineTo(X(t), y1); c.stroke(); ED.text(c, String(t), X(t), y1 + 15, { size: 11, align: 'center', color: C.muted }); }
    [0.75].forEach(v => { c.strokeStyle = 'rgba(255,165,82,.5)'; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(x0, YN(v)); c.lineTo(x1, YN(v)); c.stroke(); c.setLineDash([]);
      ED.ttext(c, ['75 % (สวิตช์ตัด)', '75 % (switch opens)'], x0 + 4, YN(v) - 5, { size: 11, color: C.orange }); });
    [2, 4, 6].forEach(v => { ED.text(c, v + '×', x1 + 6, YI(v) + 4, { size: 11, color: C.V }); });
    ED.text(c, '1500', x0 - 6, YN(1) + 4, { size: 11, align: 'right', color: C.good });
    ED.ttext(c, ['เวลา (วินาที)', 'time (s)'], (x0 + x1) / 2, y1 + 30, { size: 12, align: 'center', color: C.muted });
    ED.ttext(c, ['ความเร็ว', 'speed'], x0, y0 - 10, { size: 12, color: C.good }); ED.ttext(c, ['กระแส (เท่าของพิกัด)', 'current (× rated)'], x1, y0 - 10, { size: 12, align: 'right', color: C.V });
    if (!this.rec.length) { ED.ttext(c, ['กด "จ่ายไฟ" แล้วดูความเร็วกับกระแส', 'press "Switch on" and watch speed and current'], (x0 + x1) / 2, (y0 + y1) / 2, { size: 12, align: 'center', color: C.muted }); return; }
    const pl = (k, Y, col) => { c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); this.rec.forEach((r, j) => { const x = X(r.t), y = Y(r[k]); j ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); };
    pl('n', YN, C.good); pl('i', YI, C.V);
    if (this.tOpen !== null && this.tOpen < tE) { c.strokeStyle = C.orange; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(X(this.tOpen), y0); c.lineTo(X(this.tOpen), y1); c.stroke(); c.setLineDash([]); }
  }
  /* a finished run (for the results table): true once the motor is steady, or a fault has shown itself */
  finished() { return this.on && (this.warn || this.t > 3.5); }
  result() { const cu = this.currents(); return { type: this.type, fault: this.fault, swap: this.swapAtStart, started: Math.abs(this.n) > 0.5, tOpen: this.tOpen,
    rpm: Math.round(Math.abs(this.n) * 1500), dir: Math.sign(this.n), im: cu.m, ia: cu.a, warn: this.warn }; }
  status() {
    const ty = ED1.START_TYPES[this.type], a = Math.abs(this.n);
    if (!this.on) return a > 0.02 ? [T('ตัดไฟแล้ว มอเตอร์กำลังหยุด', 'switched off; the motor is slowing down'), 'wait'] : [T('ยังไม่จ่ายไฟ', 'not switched on'), 'wait'];
    if (this.warn === 'stall') return [T('มอเตอร์ไม่หมุน มีแต่เสียงหึ่ง กระแสราว 5 เท่าค้างอยู่: โอเวอร์โหลดต้องตัด (สวิตช์แรงเหวี่ยงค้างเปิด ขดสตาร์ตไม่ได้ต่อ)', 'the motor hums but does not turn, about 5 × rated current: the overload relay must trip (the centrifugal switch is stuck open, so the start winding is out)'), 'bad'];
    if (this.warn === 'hot') return [T('มอเตอร์หมุนได้ แต่ขดสตาร์ตยังต่ออยู่ (สวิตช์ค้างปิด): ขดสตาร์ตและตัวเก็บประจุสตาร์ตออกแบบให้ใช้ไม่กี่วินาที จะร้อนจนเสียหาย', 'the motor runs, but the start winding stays in (switch stuck closed): the start winding and start capacitor are made for a few seconds only and will burn out'), 'bad'];
    if (ty.sw && !this.auxIn() && a > 0.7) return [T('ขดสตาร์ตถูกตัดออกแล้ว มอเตอร์หมุนต่อด้วยขดรันอย่างเดียว', 'the start winding is out; the motor keeps running on the main winding alone'), 'ok'];
    if (!ty.sw && a > 0.7) return [T('มอเตอร์แบบตัวเก็บประจุถาวร: ขดสตาร์ตต่ออยู่ตลอดผ่านตัวเก็บประจุรัน', 'permanent-split capacitor motor: the auxiliary winding stays in through the run capacitor'), 'ok'];
    return [T('กำลังเร่งความเร็ว', 'speeding up'), 'wait'];
  }
};
/* one whole run without a canvas, for the summary table */
ED1.Start1.simulate = (type, fault = '', swap = false) => { const m = Object.create(ED1.Start1.prototype);
  Object.assign(m, { type, fault, swapZ: swap, on: false, n: 0, t: 0, sw: true, rec: [], tOpen: null, dots: 0, warn: '' }); m.start();
  for (let k = 0; k < 400 && !m.finished(); k++) m.step(0.02); return m.result(); };

})();
