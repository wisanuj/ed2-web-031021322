/* sym.js — IEC 60617-style symbols drawn as SVG for the drawings on the pages (strokes in currentColor, so they follow the reading
   theme). Coordinates in grid units u (default 10 px). Every builder returns an SVG fragment string; SY.svg wraps them.
   Terminal numbers follow IEC 60947: main contacts 1-2 / 3-4 / 5-6; motor terminals IEC 60034-8: U1 V1 W1 (W2 U2 V2), PE. */
(function (global) {
'use strict';
const SY = { u: 10 };
const n = v => +(+v).toFixed(2);
SY.line = (x1, y1, x2, y2, o = {}) => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.color ? ` stroke="${o.color}"` : ''}${o.w ? ` stroke-width="${o.w}"` : ''}/>`;
SY.text = (s, x, y, o = {}) => `<text x="${n(x)}" y="${n(y)}" font-size="${o.size || 11}" text-anchor="${o.anchor || 'start'}"${o.color ? ` fill="${o.color}"` : ' fill="currentColor"'}${o.weight ? ` font-weight="${o.weight}"` : ''} stroke="none">${s}</text>`;
SY.dot = (x, y, r = 2.4) => `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="currentColor" stroke="none"/>`;
SY.term = (x, y, r = 2.6) => `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="none"/>`;
/* supply bus: horizontal rails from x1 to x2 starting at y, spacing dy; names e.g. ['L1','L2','L3','N','PE'] */
SY.bus = (x1, x2, y, names, dy = 12) => names.map((nm, i) => { const yy = y + i * dy, pe = nm === 'PE';
  return SY.term(x1, yy) + SY.line(x1 + 2.6, yy, x2, yy, pe ? { dash: '6 4', color: 'var(--good)' } : {}) + SY.text(nm, x1 - 6, yy + 4, { anchor: 'end', size: 11, weight: 600 }); }).join('');
/* three-pole fuse at x (first pole), from y1 to y2, pole spacing p */
SY.fuse3 = (x, y1, y2, p, name = 'F1') => { let s = ''; const ym = (y1 + y2) / 2, h = Math.min(26, (y2 - y1) * 0.5), w = 8;
  [0, 1, 2].forEach(k => { const xx = x + k * p; s += SY.line(xx, y1, xx, ym - h / 2) + `<rect x="${n(xx - w / 2)}" y="${n(ym - h / 2)}" width="${w}" height="${n(h)}" fill="none"/>` + SY.line(xx, ym - h / 2, xx, ym + h / 2) + SY.line(xx, ym + h / 2, xx, y2) +
    SY.text(String(2 * k + 1), xx + 4, y1 + 10, { size: 9 }) + SY.text(String(2 * k + 2), xx + 4, y2 - 3, { size: 9 }); });
  return s + SY.text(name, x - 10, ym + 4, { anchor: 'end', size: 12, weight: 700 }); };
/* three-pole circuit breaker (contact with the breaker cross) and the dashed mechanical link */
SY.cb3 = (x, y1, y2, p, name = 'Q1', o = {}) => { let s = ''; const ym = (y1 + y2) / 2, g = Math.min(22, (y2 - y1) * 0.45), yt = ym - g / 2, yb = ym + g / 2;
  [0, 1, 2].forEach(k => { const xx = x + k * p; s += SY.line(xx, y1, xx, yt) + SY.line(xx - 3.5, yt - 3.5, xx + 3.5, yt + 3.5) + SY.line(xx + 3.5, yt - 3.5, xx - 3.5, yt + 3.5) +
    SY.line(xx, yb, xx - g * 0.55, yt + 2) + SY.line(xx, yb, xx, y2) + SY.text(String(2 * k + 1), xx + 5, y1 + 10, { size: 9 }) + SY.text(String(2 * k + 2), xx + 5, y2 - 3, { size: 9 }); });
  s += SY.line(x - g * 0.3, ym, x + 2 * p - g * 0.3, ym, { dash: '4 3' });
  if (o.mpcb) s += `<rect x="${n(x + 2 * p + 8)}" y="${n(ym - 7)}" width="14" height="14" fill="none"/>` + SY.text('I&gt;', x + 2 * p + 15, ym + 4, { size: 8, anchor: 'middle' });
  return s + SY.text(name, x - 14, ym + 4, { anchor: 'end', size: 12, weight: 700 }); };
/* two-pole breaker (single-phase L, N) */
SY.cb2 = (x, y1, y2, p, name = 'Q1') => { let s = ''; const ym = (y1 + y2) / 2, g = Math.min(22, (y2 - y1) * 0.45), yt = ym - g / 2, yb = ym + g / 2;
  [0, 1].forEach(k => { const xx = x + k * p; s += SY.line(xx, y1, xx, yt) + SY.line(xx - 3.5, yt - 3.5, xx + 3.5, yt + 3.5) + SY.line(xx + 3.5, yt - 3.5, xx - 3.5, yt + 3.5) +
    SY.line(xx, yb, xx - g * 0.55, yt + 2) + SY.line(xx, yb, xx, y2) + SY.text(String(2 * k + 1), xx + 5, y1 + 10, { size: 9 }) + SY.text(String(2 * k + 2), xx + 5, y2 - 3, { size: 9 }); });
  return s + SY.line(x - g * 0.3, ym, x + p - g * 0.3, ym, { dash: '4 3' }) + SY.text(name, x - 14, ym + 4, { anchor: 'end', size: 12, weight: 700 }); };
/* motor: circle at (cx, cy) radius r; leads up to y0 at the given x positions; three-phase 'M 3~' or single-phase 'M 1~' */
SY.motor = (cx, cy, r, leads, o = {}) => { let s = `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none"/>` + SY.text('M', cx, cy - 1, { size: 15, anchor: 'middle', weight: 700 }) + SY.text(o.one ? '1~' : '3~', cx, cy + 15, { size: 12, anchor: 'middle' });
  leads.forEach(([x, lab]) => { const dx = x - cx, yy = cy - Math.sqrt(Math.max(0, r * r - dx * dx)); s += SY.line(x, o.y0, x, yy) + SY.text(lab, x + 4, Math.min(yy, cy - r * 0.55) - 6, { size: 9 }); });
  if (o.pe !== undefined) { const ang = -35 * Math.PI / 180, px = cx + r * Math.cos(ang), py = cy + r * Math.sin(ang); s += SY.line(px, py, o.pe, py, { color: 'var(--good)' }) + SY.line(o.pe, py, o.pe, o.y0, { color: 'var(--good)', dash: '6 4' }) + SY.text('PE', o.pe + 3, py - 4, { size: 10, color: 'var(--good)' }); }
  return s + (o.name ? SY.text(o.name, cx - r - 8, cy + 4, { anchor: 'end', size: 12, weight: 700 }) : ''); };
SY.svg = (w, h, body, o = {}) => `<svg class="dwg" viewBox="0 0 ${w} ${h}" ${o.max ? `style="max-width:${o.max}px"` : ''} role="img" aria-label="${o.label || 'drawing'}" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round">${body}</svg>`;

/* ready-made drawings for chapter 1 */
/* the motor alone, as it appears in a power circuit */
SY.motorAlone = () => SY.svg(200, 150, SY.motor(90, 98, 30, [[70, 'U1'], [90, 'V1'], [110, 'W1']], { y0: 20, pe: 150, name: 'M1' }) +
  SY.term(70, 18) + SY.term(90, 18) + SY.term(110, 18), { max: 240, label: 'IEC motor symbol' });
/* lab sheet 1 answer: supply, fuses, breaker, motor */
SY.lab1Power = (o = {}) => { const x = 70, p = 22, yb = 22, dy = 12; let s = SY.bus(28, 300, yb, ['L1', 'L2', 'L3', 'N', 'PE'], dy);
  const yF1 = 96, yF2 = 150, yQ1 = 166, yQ2 = 222, yM = 290;
  [0, 1, 2].forEach(k => { const xx = x + k * p, yy = yb + k * dy; s += SY.dot(xx, yy) + SY.line(xx, yy, xx, o.noFuse ? yQ1 : yF1); });
  if (!o.noFuse) { s += SY.fuse3(x, yF1, yF2, p, o.fname || 'F'); [0, 1, 2].forEach(k => { s += SY.line(x + k * p, yF2, x + k * p, yQ1); }); }
  s += SY.cb3(x, yQ1, yQ2, p, o.qname || 'CB');
  s += SY.motor(x + p, yM, 30, [[x, 'U1'], [x + p, 'V1'], [x + 2 * p, 'W1']], { y0: yQ2, name: 'M' });
  const yPE = yb + 4 * dy, xPE = x + 2 * p + 46; s += SY.dot(xPE, yPE, 2.4) + `<path d="M ${xPE} ${yPE} L ${xPE} ${yM - 18} L ${x + p + 30 * Math.cos(-0.6)} ${yM - 18}" stroke="var(--good)" stroke-dasharray="6 4"/>` + SY.text('PE', xPE + 4, yM - 22, { size: 10, color: 'var(--good)' });
  return SY.svg(320, 340, s, { max: 420, label: 'power circuit of lab sheet 1' }); };
/* single-phase motor through a two-pole breaker */
SY.lab1Single = () => { const x = 70, p = 24, yb = 22, dy = 12; let s = SY.bus(28, 260, yb, ['L1', 'N', 'PE'], dy);
  s += SY.dot(x, yb) + SY.line(x, yb, x, 70) + SY.dot(x + p, yb + dy) + SY.line(x + p, yb + dy, x + p, 70) + SY.cb2(x, 70, 126, p, 'CB1');
  s += SY.motor(x + p / 2, 196, 30, [[x, 'U1'], [x + p, 'U2']], { y0: 126, one: true, name: 'M1' });
  const xPE = x + p + 54, yPE = yb + 2 * dy; s += SY.dot(xPE, yPE) + `<path d="M ${xPE} ${yPE} L ${xPE} ${196 - 18} L ${x + p / 2 + 30 * Math.cos(-0.6)} ${196 - 18}" stroke="var(--good)" stroke-dasharray="6 4"/>` + SY.text('PE', xPE + 4, 196 - 22, { size: 10, color: 'var(--good)' });
  return SY.svg(280, 245, s, { max: 360, label: 'single-phase motor circuit' }); };
/* empty terminal box for students to draw links in (lab sheet) */
SY.blankBox = (title) => { let s = `<rect x="20" y="16" width="200" height="110" rx="10" fill="none"/>`; const P = { W2: [60, 50], U2: [120, 50], V2: [180, 50], U1: [60, 96], V1: [120, 96], W1: [180, 96] };
  Object.entries(P).forEach(([k, [x, y]]) => { s += `<circle cx="${x}" cy="${y}" r="8" fill="none"/>` + (y < 70 ? SY.text(k, x, y - 13, { size: 11, anchor: 'middle', weight: 700 }) : SY.text(k, x + 10, y + 20, { size: 11, weight: 700 })); });
  ['L1', 'L2', 'L3'].forEach((l, i) => { const x = 60 + 60 * i; s += SY.line(x, 104, x, 140) + SY.text(l, x, 152, { size: 11, anchor: 'middle', weight: 700 }); });
  return SY.svg(240, 160, s, { max: 300, label: title || 'terminal box' }); };
/* terminal box with links drawn in (answer keys): conn 'star' | 'delta' | '' ; swap: L1 and L2 exchanged */
SY.tbox = (conn, swap, title) => { let s = `<rect x="20" y="16" width="200" height="110" rx="10" fill="none"/>`; const P = { W2: [60, 50], U2: [120, 50], V2: [180, 50], U1: [60, 96], V1: [120, 96], W1: [180, 96] };
  const link = (a, b) => { s += `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke="#b5651d" stroke-width="7" stroke-linecap="round"/>`; };
  if (conn === 'star') { link('W2', 'U2'); link('U2', 'V2'); } else if (conn === 'delta') { link('U1', 'W2'); link('V1', 'U2'); link('W1', 'V2'); }
  Object.entries(P).forEach(([k, [x, y]]) => { s += `<circle cx="${x}" cy="${y}" r="8" fill="#fff"/>` + (y < 70 ? SY.text(k, x, y - 13, { size: 11, anchor: 'middle', weight: 700 }) : SY.text(k, x + 10, y + 20, { size: 11, weight: 700 })); });
  (swap ? ['L2', 'L1', 'L3'] : ['L1', 'L2', 'L3']).forEach((l, i) => { const x = 60 + 60 * i; s += SY.line(x, 104, x, 140) + SY.text(l, x, 152, { size: 11, anchor: 'middle', weight: 700 }); });
  return SY.svg(240, 160, s, { max: 300, label: title || 'terminal box' }); };
/* supply rails only, with room below for a student's drawing */
SY.busOnly = (h = 300) => SY.svg(320, h, SY.bus(28, 300, 22, ['L1', 'L2', 'L3', 'N', 'PE'], 12), { max: 520, label: 'supply rails' });
global.SY = SY;
})(window);
