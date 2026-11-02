/* jog.js — page 2.0 "Jogging circuit" (the new Lecture 2 slides), namespace JG:
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
