/* sym1.js — page 1.0 "Electrical symbols for motor control" (the new Lecture 1 slides of the course), drawn with iec.js (namespace SY):
   1) SY.supply(kind): the supply lines across the page: '3p5w' L1 L2 L3 N PE, '3p4w' L1 L2 L3 PE (what a three-phase motor needs),
      '3p4wN' L1 L2 L3 N (the utility's four-wire supply), '1p3w' L N PE; o.mark = wire to highlight.
   2) SY.fuse(n, o): fuse F1, one pole or three (o.blown).
   3) SY.sw(kind, o): a contact: 'no' | 'nc' (plain), 'togNO' | 'togNC' (toggle switch: manual operator with detent), 'pbNO' | 'pbNC'
      (push button: push operator, springs back); o.act = operated; o.name; o.terms = terminal numbers (NO 13–14, NC 11–12).
   4) SY.circuit(kind, o): the same contact in a small circuit L – contact – lamp H1 – N; the lamp lights when the contact is closed.
   5) SY.contactor(o): contactor K1, coil A1–A2 joined by the mechanical link to NO 13–14 and NC 21–22 (o.act = coil energised,
      o.detached = the three parts drawn apart as in a circuit diagram, held together only by the name K1).
   6) SY.motor(o), SY.lamp(o): the loads M1 (M 3~) and H1 (o.live, o.color).
   Contactor names follow the new slides: K1 (letter K). Used by ch1_0_symbols.html and rendered for the revised Lecture 1 slides. */
(function (global) {
'use strict';
const SY = {}, IE = global.IEC, T = (th, en) => (global.MC ? MC.t(th, en) : en);
const COL = { L1: 'var(--c7-l1, #a0522d)', L: 'var(--c7-l1, #a0522d)', L2: 'var(--ink, #202b38)', L3: 'var(--c7-l3, #687083)', N: 'var(--rc-n, #2f6fd0)', PE: 'var(--rc-pe, #2e9d4a)',
  cur: 'var(--rc-cur, #e0531f)', muted: 'var(--muted, #4a5a70)', ink: 'var(--ink, #202b38)', lamp: '#7ee787' };
SY.COL = COL;
const f1 = v => +(+v).toFixed(1);
const svg = (w, h, body, label) => `<svg class="dwg rl sy" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}" role="img" aria-label="${label || 'symbol'}" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const TX = (s, x, y, o = {}) => IE.T(s, x, y, { size: o.size || 10, anchor: o.anchor, col: o.col, weight: o.weight });

/* ---------- 1) supply lines ---------- */
SY.WIRES = { '3p5w': ['L1', 'L2', 'L3', 'N', 'PE'], '3p4w': ['L1', 'L2', 'L3', 'PE'], '3p4wN': ['L1', 'L2', 'L3', 'N'], '1p3w': ['L', 'N', 'PE'] };
SY.supply = (kind, o = {}) => { const ws = SY.WIRES[kind], W = 230, H = 18 + ws.length * 15; let s = '';
  ws.forEach((n, i) => { const y = 14 + i * 15, pe = n === 'PE', hl = o.mark === n;
    s += IE.L(30, y, W - 8, y, { col: COL[n], w: hl ? 3 : pe ? 1.3 : 1.7, dash: pe ? '7 3 2 3' : '' }) + TX(n, 24, y + 3.5, { size: 11, anchor: 'end', col: COL[n], weight: 700 }); });
  return svg(W, H, s, ws.join(' ')); };

/* ---------- 2) fuse ---------- */
SY.fuse = (n = 3, o = {}) => { const xs = n === 3 ? [50, 70, 90] : [50], W = xs[xs.length - 1] + 26; let s = '';
  xs.forEach(x => { s += IE.fuse(x, 8, 72, { blown: o.blown, col: o.blown ? COL.cur : undefined }); });
  s += TX('F1', xs[0] - 12, 44, { size: 12, anchor: 'end', weight: 700 });
  return svg(W, 80, s, n === 3 ? 'three-pole fuse F1' : 'one-pole fuse F1'); };

/* ---------- 3) switches and contacts ---------- */
const SWK = { no: [false, null], nc: [true, null], togNO: [false, 'man'], togNC: [true, 'man'], pbNO: [false, 'pb'], pbNC: [true, 'pb'] };
SY.sw = (kind, o = {}) => { const [nc, op] = SWK[kind], x = op ? 70 : 40, W = x + 36; let s = IE.contact(nc, x, 8, 72, { act: o.act, op, detent: op === 'man', col: o.col });
  if (o.terms !== false) { const [a, b] = nc ? ['11', '12'] : ['13', '14']; s += TX(a, x + 6, 22, { size: 9.5, col: COL.muted }) + TX(b, x + 6, 66, { size: 9.5, col: COL.muted }); }
  if (op && o.name !== false) s += TX(o.name || 'S1', x - 34, 44, { size: 12, anchor: 'end', weight: 700 });
  return svg(W + (op ? 0 : 0), 80, s, kind); };

/* ---------- 4) a contact in a small lamp circuit ---------- */
SY.circuit = (kind, o = {}) => { const [nc, op] = SWK[kind], x = 80, closed = nc ? !o.act : !!o.act, live = closed && o.power !== false, c = live ? COL.cur : undefined;
  let s = IE.L(20, 10, 140, 10, { col: COL.L1, w: 1.8 }) + TX('L', 14, 13.5, { size: 11, anchor: 'end', col: COL.L1, weight: 700 }) +
    IE.L(20, 150, 140, 150, { col: COL.N, w: 1.8 }) + TX('N', 14, 153.5, { size: 11, anchor: 'end', col: COL.N, weight: 700 }) + `<circle cx="${x}" cy="10" r="2.4" fill="${COL.L1}" stroke="none"/><circle cx="${x}" cy="150" r="2.4" fill="${COL.N}" stroke="none"/>`;
  s += IE.L(x, 10, x, 30, { col: c, w: live ? 2.2 : undefined }) + IE.contact(nc, x, 30, 82, { act: o.act, op, detent: op === 'man', col: c }) + IE.L(x, 82, x, 104, { col: c, w: live ? 2.2 : undefined }) +
    IE.lamp(x, 104, 132, { live, lamp: o.color || COL.lamp, col: c }) + IE.L(x, 132, x, 150, { col: c, w: live ? 2.2 : undefined });
  const [a, b] = nc ? ['11', '12'] : ['13', '14']; s += TX(a, x + 6, 46, { size: 9, col: COL.muted }) + TX(b, x + 6, 78, { size: 9, col: COL.muted }) + TX('X1', x + 13, 112, { size: 9, col: COL.muted }) + TX('X2', x + 13, 130, { size: 9, col: COL.muted });
  if (op) s += TX('S1', x - 34, 60, { size: 12, anchor: 'end', weight: 700 });
  s += TX('H1', x - 14, 122, { size: 12, anchor: 'end', weight: 700 });
  return svg(160, 160, s, kind + ' in a lamp circuit'); };

/* ---------- 5) contactor K1 ---------- */
SY.contactor = (o = {}) => { const act = !!o.act, name = o.name || 'K1'; let s = '';
  if (!o.detached) { const xc = 46, xa = 104, xb = 144;
    s += IE.coil(xc, 8, 72, { live: act }) + TX('A1', xc + 6, 22, { size: 9.5, col: COL.muted }) + TX('A2', xc + 6, 66, { size: 9.5, col: COL.muted }) + TX(name, xc - 16, 44, { size: 12, anchor: 'end', weight: 700 });
    s += IE.contact(false, xa, 8, 72, { act }) + IE.contact(true, xb, 8, 72, { act });
    s += IE.L(xc + 12, 40, xb + (act ? 6 : 3), 40, { dash: '3 2' });   // the mechanical link from the coil to both contacts
    s += TX('13', xa + 6, 22, { size: 9.5, col: COL.muted }) + TX('14', xa + 6, 66, { size: 9.5, col: COL.muted }) + TX('21', xb + 12, 22, { size: 9.5, col: COL.muted }) + TX('22', xb + 12, 66, { size: 9.5, col: COL.muted });
    return svg(176, 80, s, 'contactor ' + name); }
  const X = [40, 112, 184];
  s += IE.coil(X[0], 8, 72, { live: act }) + TX('A1', X[0] + 6, 22, { size: 9.5, col: COL.muted }) + TX('A2', X[0] + 6, 66, { size: 9.5, col: COL.muted }) + TX(name, X[0] - 16, 44, { size: 12, anchor: 'end', weight: 700 });
  s += IE.contact(false, X[1], 8, 72, { act }) + TX(name, X[1] - 14, 44, { size: 12, anchor: 'end', weight: 700 }) + TX('13', X[1] + 6, 22, { size: 9.5, col: COL.muted }) + TX('14', X[1] + 6, 66, { size: 9.5, col: COL.muted });
  s += IE.contact(true, X[2], 8, 72, { act }) + TX(name, X[2] - 8, 44, { size: 12, anchor: 'end', weight: 700 }) + TX('21', X[2] + 12, 22, { size: 9.5, col: COL.muted }) + TX('22', X[2] + 12, 66, { size: 9.5, col: COL.muted });
  return svg(214, 80, s, 'contactor ' + name + ', coil and contacts drawn apart'); };

/* ---------- 6) loads ---------- */
SY.motor = (o = {}) => { const x = 60, cy = 58, r = 22; let s = '';
  [-12, 0, 12].forEach(d => { const yt = cy - Math.sqrt(r * r - d * d); s += IE.L(x + d, 6, x + d, yt); });
  s += `<circle cx="${x}" cy="${cy}" r="${r}" fill="none"/>` + TX('M', x, cy - 1, { size: 14, anchor: 'middle', weight: 700 }) + TX('3~', x, cy + 13, { size: 11, anchor: 'middle' }) + TX('M1', x - r - 8, cy + 4, { size: 12, anchor: 'end', weight: 700 });
  return svg(100, 86, s, 'three-phase motor M1'); };
SY.lamp = (o = {}) => { const x = 50; let s = IE.lamp(x, 8, 72, { live: o.live, lamp: o.color || COL.lamp }) + TX('H1', x - 16, 44, { size: 12, anchor: 'end', weight: 700 }) +
    TX('X1', x + 13, 26, { size: 9.5, col: COL.muted }) + TX('X2', x + 13, 62, { size: 9.5, col: COL.muted });
  return svg(84, 80, s, 'pilot lamp H1'); };

global.SY = SY;
})(window);
