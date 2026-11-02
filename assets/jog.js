/* jog.js — circuits of the new lecture slides (namespace JG): page 2.0 "Jogging circuit" (Lecture 2) and page 3.0 "Direct-on-line circuit" (Lecture 3) and page 4.0 "Thermal overload relay" (Lecture 4):
   1) JG.JOG(o): the jogging circuit of the slides for RL.Sim: power L1 L2 L3 → fuses F1 → main contacts K1 → motor M1 (PE), control taken
      ahead of F1: F2 (control fuse) → S0 emergency stop (NC, mushroom, latches) → S1 jog (NO push button) → coil K1 → N, and the run lamp
      H1 through K1 13–14 from the node after S0. Names follow the slides: F1 power fuses, F2 control fuse, S0, S1, K1, H1, M1.
      o.lamp false drops H1.
   2) JG.Strip(el, sim, o): a live timing strip of S1, K1 (coil), M1 and H1 over the last o.span seconds (default 10), drawn on step(dt).
   Used by ch2_0_jogging.html and rendered for the revised Lecture 2 slides (Slides_69_2/_build). */
(function (global) {
'use strict';
const JG = {}, IE = global.IEC, T = (th, en) => (global.MC ? MC.t(th, en) : en);
JG.JOG = (o = {}) => ({ rows: 5,
  power: { full: true, stages: [{ k: 'fuse', d: 'F1' }, { k: 'mainNO', d: 'K1' }], motor: 'M1', tap: 'before' },
  devices: { F2: { type: 'fuse', name: ['F2 ฟิวส์วงจรควบคุม', 'F2 control fuse'] }, F1: { type: 'fuse', name: ['F1 ฟิวส์วงจรกำลัง', 'F1 power fuses'] },
    S0: { type: 'pb', cap: 'red', name: ['S0 หยุดฉุกเฉิน', 'S0 emergency stop'] }, S1: { type: 'pb', cap: 'black', name: ['S1 เดินกระตุก', 'S1 jog'] }, K1: { type: 'coil' },
    ...(o.lamp === false ? {} : { H1: { type: 'lamp', color: '#7ee787', code: 'GN' } }) },   // F2 first: a short in the control circuit blows F2, never F1
  els: [
    { k: 'fuse', d: 'F2', x: 0, y: 0, t: ['1', '2'] },
    { k: 'NC', d: 'S0', x: 0, y: 1, t: ['11', '12'], op: 'mush' },
    { k: 'NO', d: 'S1', x: 0, y: 2, h: 2, t: ['13', '14'], op: 'pb' },
    { k: 'coil', d: 'K1', x: 0, y: 4, t: ['A1', 'A2'] },
    ...(o.lamp === false ? [] : [{ k: 'w', pts: [[0, 2], [1, 2]], dots: [0] }, { k: 'NO', d: 'K1', x: 1, y: 2, h: 2, t: ['13', '14'] }, { k: 'lamp', d: 'H1', x: 1, y: 4, t: ['X1', 'X2'] }]) ] });

/* Lecture 3 (direct-on-line): the same power circuit and names; control circuits of the story:
   JG.TOGGLE()  toggle switch S1 (maintained, detent) feeding coil K1 directly: runs on after release, RESTARTS when the power returns
   JG.HOLD()    start S2 with the holding contact K1 13–14 across it and no stop button: runs on, cannot be stopped
   JG.DOL()     the complete starter of the slides: F2 → S0 (emergency stop) → S1 stop (NC 11–12) → S2 start (NO 13–14) ∥ K1 13–14 → coil K1,
                run lamp H1 through K1 23–24 from the node above S2. No restart after a power cut: the holding contact has opened. */
const PWR = () => ({ full: true, stages: [{ k: 'fuse', d: 'F1' }, { k: 'mainNO', d: 'K1' }], motor: 'M1', tap: 'before' });
const DV = { F2: () => ({ type: 'fuse', name: ['F2 ฟิวส์วงจรควบคุม', 'F2 control fuse'] }), F1: () => ({ type: 'fuse', name: ['F1 ฟิวส์วงจรกำลัง', 'F1 power fuses'] }),
  S0: () => ({ type: 'pb', cap: 'red', name: ['S0 หยุดฉุกเฉิน', 'S0 emergency stop'] }), S1: () => ({ type: 'pb', cap: 'black', name: ['S1 หยุด', 'S1 stop'] }),
  S2: () => ({ type: 'pb', cap: 'white', name: ['S2 เริ่ม', 'S2 start'] }), K1: () => ({ type: 'coil' }), H1: () => ({ type: 'lamp', color: '#7ee787', code: 'GN' }) };
JG.TOGGLE = () => ({ rows: 4, power: PWR(), devices: { F2: DV.F2(), F1: DV.F1(), S1: { type: 'sel', name: ['S1 สวิตช์โยก (ค้าง)', 'S1 toggle switch (stays)'] }, K1: DV.K1(), H1: DV.H1() },
  els: [{ k: 'fuse', d: 'F2', x: 0, y: 0, t: ['1', '2'] }, { k: 'NO', d: 'S1', x: 0, y: 1, h: 2, t: ['13', '14'], op: 'man', detent: true }, { k: 'coil', d: 'K1', x: 0, y: 3, t: ['A1', 'A2'] },
    { k: 'w', pts: [[0, 1], [1, 1]], dots: [0] }, { k: 'NO', d: 'K1', x: 1, y: 1, h: 2, t: ['23', '24'] }, { k: 'lamp', d: 'H1', x: 1, y: 3, t: ['X1', 'X2'] }] });
JG.HOLD = () => ({ rows: 4, power: PWR(), devices: { F2: DV.F2(), F1: DV.F1(), S2: DV.S2(), K1: DV.K1(), H1: DV.H1() },
  els: [{ k: 'fuse', d: 'F2', x: 0, y: 0, t: ['1', '2'] }, { k: 'NO', d: 'S2', x: 0, y: 1, h: 2, t: ['13', '14'], op: 'pb' }, { k: 'coil', d: 'K1', x: 0, y: 3, t: ['A1', 'A2'] },
    { k: 'w', pts: [[0, 1], [1, 1], [2, 1]], dots: [0, 1] }, { k: 'NO', d: 'K1', x: 1, y: 1, h: 2, t: ['13', '14'] }, { k: 'w', pts: [[0, 3], [1, 3]], dots: [0] },
    { k: 'NO', d: 'K1', x: 2, y: 1, h: 2, t: ['23', '24'] }, { k: 'lamp', d: 'H1', x: 2, y: 3, t: ['X1', 'X2'] }] });
JG.DOL = () => ({ rows: 6, power: PWR(), devices: { F2: DV.F2(), F1: DV.F1(), S0: DV.S0(), S1: DV.S1(), S2: DV.S2(), K1: DV.K1(), H1: DV.H1() },
  els: [{ k: 'fuse', d: 'F2', x: 0, y: 0, t: ['1', '2'] }, { k: 'NC', d: 'S0', x: 0, y: 1, t: ['11', '12'], op: 'mush' }, { k: 'NC', d: 'S1', x: 0, y: 2, t: ['11', '12'], op: 'pb' },
    { k: 'NO', d: 'S2', x: 0, y: 3, h: 2, t: ['13', '14'], op: 'pb' }, { k: 'coil', d: 'K1', x: 0, y: 5, t: ['A1', 'A2'] },
    { k: 'w', pts: [[0, 3], [1, 3], [2, 3]], dots: [0, 1] }, { k: 'NO', d: 'K1', x: 1, y: 3, h: 2, t: ['13', '14'] }, { k: 'w', pts: [[0, 5], [1, 5]], dots: [0] },
    { k: 'NO', d: 'K1', x: 2, y: 3, h: 2, t: ['23', '24'] }, { k: 'lamp', d: 'H1', x: 2, y: 5, t: ['X1', 'X2'] }] });

/* Lecture 4 (thermal overload relay): JG.DOLOL() = JG.DOL with F3 in the power circuit after the main contacts, F3 95–96 in series after S0,
   and the overload lamp H2 (yellow) through F3 97–98 from the node after S0 */
JG.DOLOL = () => ({ rows: 7, power: { full: true, stages: [{ k: 'fuse', d: 'F1' }, { k: 'mainNO', d: 'K1' }, { k: 'therm', d: 'F3' }], motor: 'M1', tap: 'before' },
  devices: { F2: DV.F2(), F1: DV.F1(), F3: { type: 'ol', name: ['F3 โอเวอร์โหลด ตัด / รีเซ็ต', 'F3 overload trip / reset'] }, S0: DV.S0(), S1: DV.S1(), S2: DV.S2(), K1: DV.K1(), H1: DV.H1(),
    H2: { type: 'lamp', color: '#ffd166', code: 'YE' } },
  els: [{ k: 'fuse', d: 'F2', x: 0, y: 0, t: ['1', '2'] }, { k: 'NC', d: 'S0', x: 0, y: 1, t: ['11', '12'], op: 'mush' }, { k: 'NC', d: 'F3', x: 0, y: 2, t: ['95', '96'], op: 'thr' },
    { k: 'NC', d: 'S1', x: 0, y: 3, t: ['11', '12'], op: 'pb' }, { k: 'NO', d: 'S2', x: 0, y: 4, h: 2, t: ['13', '14'], op: 'pb' }, { k: 'coil', d: 'K1', x: 0, y: 6, t: ['A1', 'A2'] },
    { k: 'w', pts: [[0, 4], [1, 4], [2, 4]], dots: [0, 1] }, { k: 'NO', d: 'K1', x: 1, y: 4, h: 2, t: ['13', '14'] }, { k: 'w', pts: [[0, 6], [1, 6]], dots: [0] },
    { k: 'NO', d: 'K1', x: 2, y: 4, h: 2, t: ['23', '24'] }, { k: 'lamp', d: 'H1', x: 2, y: 6, t: ['X1', 'X2'] },
    { k: 'w', pts: [[0, 2], [3, 2]], dots: [0] }, { k: 'NO', d: 'F3', x: 3, y: 2, h: 4, t: ['97', '98'], op: 'thr' }, { k: 'lamp', d: 'H2', x: 3, y: 6, t: ['X1', 'X2'] }] });
/* the motor table of the Lecture 4 slides (approximate full-load current at 380 V) and its fuse sizes (380 V, up to 7.5 kW) */
JG.FLC = [[0.1, 0.4], [0.12, 0.5], [0.18, 0.8, 4], [0.25, 0.9, 4], [0.37, 1.4, 6], [0.56, 1.8, 6], [0.75, 2, 6], [1.1, 2.8, 10], [1.5, 3.7, 10], [2.2, 5.5, 16], [3, 7, 20], [3.7, 8, 25], [4, 9, 25],
  [5.5, 12, 32], [7.5, 16, 40], [9.3, 20], [10, 22], [11, 23], [15, 31], [18, 39], [22, 43], [30, 57], [37, 75], [45, 86], [55, 105], [75, 138], [90, 170], [110, 205], [130, 245], [150, 278]];   // [kW, A, fuse A]

/* a live timing strip: one row per signal, green bar = on; time runs to the right, "now" at the right edge */
JG.Strip = class {
  constructor(el, sim, o = {}) { this.el = el; this.sim = sim; this.span = o.span || 10; this.t = 0; this.h = []; this.draw(); }
  rows() { const s = this.sim, d = s.dev; return [['S1', !!d.S1.pressed], ['K1', s.act('K1')], ['M1', s.running()], ...(d.H1 ? [['H1', !!d.H1.energized]] : [])]; }
  step(dt) { this.t += dt; this.h.push([this.t, this.rows().map(r => r[1])]); while (this.h.length > 2 && this.h[1][0] < this.t - this.span) this.h.shift(); this.draw(); }
  draw() { const R = this.rows(), W = 560, L = 44, rh = 26, H = R.length * rh + 26, X = tt => L + (W - L - 8) * (1 - (this.t - tt) / this.span); let s = '';
    for (let k = 0; k <= this.span; k += 2) { const x = X(this.t - this.span + k); s += IE.L(x, 4, x, H - 18, { col: 'var(--line)', dash: '2 3' }); }
    R.forEach(([n], i) => { const y = 8 + i * rh; s += IE.T(n, L - 8, y + 15, { size: 12, anchor: 'end', weight: 700 }) + IE.L(L, y + 20, W - 8, y + 20, { col: 'var(--line)' });
      let on = null; this.h.forEach(([tt, v], j) => { const x = Math.max(L, X(tt)); if (v[i] && on === null) on = x; if ((!v[i] || j === this.h.length - 1) && on !== null) { const x2 = v[i] ? X(this.t) : x;
        if (x2 > on) s += `<rect x="${on.toFixed(1)}" y="${y + 4}" width="${(x2 - on).toFixed(1)}" height="16" rx="2" fill="#1d8a4a" opacity=".85" stroke="none"/>`; on = null; } }); });
    s += IE.T(T(`${this.span} วินาทีล่าสุด · ขวาสุด = ตอนนี้ · แถบเขียว = ต่อ / มีไฟ`, `last ${this.span} s · right edge = now · green bar = on`), L, H - 4, { size: 10.5, col: 'var(--muted)' });
    this.el.innerHTML = IE.svg(W, H, s, { label: 'timing strip', max: 620 }); }
};
global.JG = JG;
})(window);
