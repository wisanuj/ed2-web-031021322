/* iec.js — IEC 60617-style symbols for control and power circuits, drawn as SVG strings in a VERTICAL current path (IEC layout:
   supply at the top, neutral at the bottom). Every element sits between (x, y0) and (x, y1); the symbol is centred on ym.
   Contacts can be drawn in their real state (o.act = actuated) so that the relay simulator animates them; drawings for print use the
   unactuated state, as the standard requires. Strokes use currentColor unless o.col is given.
   Kinds: NO, NC (contacts), op = 'pb' push button, 'mush' emergency stop, 'sel' selector (maintained), 'lim' position switch,
   'flt' float, 'prs' pressure, 'tmp' temperature, 'thr' thermal (overload contact), 'td' timed contact (o.td = 'on' | 'off');
   coil (o.td on/off for timers), lamp, fuse, mainNO (contactor main contact), cb (circuit breaker), therm (thermal element), motor.
   Chapter 5 (17 Oct 2026): op 'spd' (speed-operated, the centrifugal switch of a single-phase motor), wind (winding), cap (capacitor),
   efault (an earth fault from a node: off = dashed "possible fault", on = flash to earth), earth (earth symbol), meter (V or A in a
   circle), ct (current transformer ring on a vertical conductor); therm o.trip marks a tripped element; a near-white lamp gets an
   outlined halo so that it shows on a white page.
   Lecture 1 symbols (2 Nov 2026): op 'man' (general manual operator, a toggle switch) and o.detent (the detent mark on the link: the switch stays
   where it is put); neither changes any existing drawing.
   Slide style (14 Nov 2026, the instructor's choice: the symbols of the lecture slides, drawn in CADe SIMU): a terminal circle at both ends
   of every contact; the drawn shape follows the state (closed = the blade across a seat, open = leaning left with no seat), so an
   operated NO looks like an NC at rest and an operated NC like an NO; push button = the operator ⊢ with a dashed link reaching the blade
   (2 mm nearer when pressed), toggle switch = ⊢, a stem, the detent v and a line to the blade, emergency stop = the same with the
   mushroom head, overload contact = a line with a 3 mm step, timed contact = a stub, an arc "(" (on-delay) or ")" (off-delay) and the
   link; main contacts drop the contactor arc; the overload heater is a 12 px box with the stepped line. Geometry is in mm of the slides
   (K px per mm: the contact circles are 10 mm = 2G apart). Device names are italic (IE.T o.it). */
(function (global) {
'use strict';
const IE = {};
const f = v => +(+v).toFixed(1);
const L = (x1, y1, x2, y2, o = {}) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"${o.col ? ` stroke="${o.col}"` : ''}${o.w ? ` stroke-width="${o.w}"` : ''}${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.cls ? ` class="${o.cls}"` : ''}/>`;
const T = (s, x, y, o = {}) => `<text x="${f(x)}" y="${f(y)}" font-size="${o.size || 10}" text-anchor="${o.anchor || 'start'}" fill="${o.col || 'currentColor'}"${o.weight ? ` font-weight="${o.weight}"` : ''}${o.it ? ' class="nm" font-style="italic"' : ''} stroke="none">${s}</text>`;
IE.L = L; IE.T = T;
const G = 12;   // half-gap of the contact zone

const K = 2.4, RC = 2.1, ST = 2.9 * K;   // px per mm of the slides; terminal-circle radius; the stub (and seat) ends ST above the centre
const PA = (d, col) => `<path d="${d}" fill="none"${col ? ` stroke="${col}"` : ''}/>`;
const DASH = '6.5 3';   // the slides' mechanical link: 2.8 mm dashes, 1.2 mm gaps
/* the operator, left of the blade, joined to it at (xm, ym). The slide shapes (pb, man, mush, detent, thr) sit 13 mm left of the contact;
   the other shapes keep their places (xl) and get a dashed link that reaches the blade. nc: the contact is a break contact (thr) */
function operator(op, x, xm, ym, o, nc) {
  const col = o.col, dash = (a, b) => L(a, ym, b, ym, { dash: DASH, col }), xl = x - 30, c = col ? ` stroke="${col}"` : '';
  if (op === 'thr') { const d = (nc ? (o.act ? 2 : 0) : 3) * K, a = x - 8 * K - d, b = x - 5 * K - d, e = x - 2 * K - d;   // a line with a 3 mm step (thermal)
    return PA(`M ${f(a)} ${f(ym)} L ${f(b)} ${f(ym)} L ${f(b)} ${f(ym - 3 * K)} L ${f(e)} ${f(ym - 3 * K)} L ${f(e)} ${f(ym)} L ${f(xm)} ${f(ym)}`, col); }
  if (op === 'pb' || op === 'man' || op === 'mush') {
    const xo = x - 13 * K + ((op === 'pb' || op === 'mush') && o.act ? 2 * K : 0), bar = L(xo, ym - 2 * K, xo, ym + 2 * K, { col });   // a pressed button sits 2 mm nearer
    let s = bar + (op === 'mush' ? PA(`M ${f(xo)} ${f(ym - 2 * K)} A ${f(2 * K)} ${f(2 * K)} 0 0 0 ${f(xo)} ${f(ym + 2 * K)}`, col) : '');
    if (op === 'pb' || (op === 'man' && !o.detent && !o.latch)) return s + dash(xo, xm);
    const v0 = xo + 3.9 * K, vw = 2.4 * K, t = 0.6 * K;   // stem 2.6, gap 1.3, the v (latch or detent), gap 1.3, a line to the blade
    return s + L(xo, ym, xo + 2.6 * K, ym, { col }) + PA(`M ${f(v0)} ${f(ym)} L ${f(v0 + t)} ${f(ym)} L ${f(v0 + t + vw / 2)} ${f(ym + 1.9 * K)} L ${f(v0 + t + vw)} ${f(ym)} L ${f(v0 + 2 * t + vw)} ${f(ym)}`, col) +
      L(v0 + 2 * t + vw + 1.3 * K, ym, xm, ym, { col }); }
  let s = dash(xl + 5, xm);
  if (op === 'sel') s += `<path d="M ${xl} ${ym + 6} L ${xl + 3} ${ym + 6} L ${xl + 3} ${ym - 6} L ${xl + 6} ${ym - 6}" fill="none"${c}/>`;
  else if (op === 'lim') s += `<path d="M ${xl + 5} ${ym - 6} L ${xl - 2} ${ym} L ${xl + 5} ${ym + 6} Z" fill="none"${c}/>`;
  else if (op === 'flt') s += `<circle cx="${xl}" cy="${ym}" r="5" fill="none"${c}/>` + L(xl - 7, ym + 7, xl + 7, ym + 7, { col });
  else if (op === 'prs') s += `<path d="M ${xl - 5} ${ym - 5} L ${xl + 5} ${ym - 5} L ${xl + 5} ${ym + 5} L ${xl - 5} ${ym + 5} Z" fill="none"${c}/>` + T('p', xl, ym + 4, { size: 10, anchor: 'middle', col });
  else if (op === 'tmp') s += `<path d="M ${xl - 5} ${ym - 5} L ${xl + 5} ${ym - 5} L ${xl + 5} ${ym + 5} L ${xl - 5} ${ym + 5} Z" fill="none"${c}/>` + T('θ', xl, ym + 4, { size: 10, anchor: 'middle', col });
  else if (op === 'spd') s += `<circle cx="${xl}" cy="${ym}" r="6" fill="none"${c}/>` + T('n', xl, ym + 3.5, { size: 9, anchor: 'middle', col });   // speed (centrifugal) operator
  if (o.detent && op !== 'man') { const xv = (xl + 5 + xm) / 2; s += `<path d="M ${f(xv - 3.5)} ${f(ym)} L ${f(xv)} ${f(ym + 4.5)} L ${f(xv + 3.5)} ${f(ym)}" fill="none"${c}/>`; }
  return s;
}
/* contact: NO (make) or NC (break) between y0 and y1, terminal circles 2G apart; o.act = actuated. The shape follows the state, as on the
   slides: closed = the seat on the right and the blade across it, open = the blade leaning left and no seat */
IE.contact = (nc, x, y0, y1, o = {}) => {
  const ym = (y0 + y1) / 2, yt = ym - G, yb = ym + G, col = o.col, closed = nc ? !o.act : !!o.act;
  const tx = closed ? x + 2.1 * K : x - 2 * K, ty = closed ? ym - 3.75 * K : ym - ST, xm = x + (tx - x) * (yb - RC - ym) / (yb - RC - ty);
  let s = L(x, y0, x, yt - RC, { col, cls: o.clsT }) + L(x, yt + RC, x, ym - ST, { col, cls: o.clsT }) + L(x, yb + RC, x, y1, { col, cls: o.clsB });
  if (closed) s += L(x, ym - ST, x + 2.9 * K, ym - ST, { col });   // the seat
  if (o.td) {   // timed contact (Lecture 7 slide): a stub, the arc ( on-delay or ) off-delay, and the dashed link from inside the arc to the blade
    const r = 2.6 * K, xc = o.td === 'on' ? x - 5 * K : x - 7.7 * K;   // the arc's open ends sit at xc
    s += L(x - 9.9 * K, ym, x - 8.1 * K, ym, { col }) + PA(`M ${f(xc)} ${f(ym - r)} A ${f(r)} ${f(r)} 0 0 ${o.td === 'on' ? 0 : 1} ${f(xc)} ${f(ym + r)}`, col) +
      L(x - 5.7 * K, ym, xm, ym, { col, dash: DASH }); }
  s += L(x, yb - RC, tx, ty, { col, w: 1.6 });
  if (o.op) s += operator(o.op, x, xm, ym, o, nc);
  const ring = y => `<circle cx="${f(x)}" cy="${f(y)}" r="${RC}" fill="var(--panel, #fff)"${col ? ` stroke="${col}"` : ''}/>`;
  return s + ring(yt) + ring(yb);
};
/* where the blade of a contact crosses its centre line, and the dashed mechanical link of a multi-pole device (poles xa..xb) */
IE.bladeX = (closed) => (closed ? 2.1 * K : -2 * K) * (G - RC) / (G - RC + (closed ? 3.75 * K : ST));
IE.opX = (act) => -13 * K + (act ? 2 * K : 0);   // where a push-button operator stands (a pressed one 2 mm nearer)
IE.link = (xa, xb, ym, closed, o = {}) => L(xa + IE.bladeX(closed), ym, xb + IE.bladeX(closed), ym, { dash: DASH, col: o.col });
/* the slides' blue ⇑ (a double shaft and a head, 10 px tall, tip at y): drawn above the name of a device that is working (operated, energised, lit, tripped) */
IE.up = (x, y) => `<path class="up" d="M ${f(x - 1.4)} ${f(y + 10)} L ${f(x - 1.4)} ${f(y + 2.6)} M ${f(x + 1.4)} ${f(y + 10)} L ${f(x + 1.4)} ${f(y + 2.6)} M ${f(x - 4.1)} ${f(y + 4.3)} L ${f(x)} ${f(y)} L ${f(x + 4.1)} ${f(y + 4.3)}" fill="none" stroke="var(--up, #1f3fe0)" stroke-width="1.4"/>`;
/* power-circuit contacts: contactor main contact (a plain contact, as on the slides) and circuit breaker (cross) */
IE.mainNO = (x, y0, y1, o = {}) => IE.contact(false, x, y0, y1, o);
IE.cb = (x, y0, y1, o = {}) => { const ym = (y0 + y1) / 2, yc = ym - ST, col = o.col; let s = IE.contact(false, x, y0, y1, o);   // the cross on the fixed end
  s += L(x - 3, yc - 3, x + 3, yc + 3, { col }) + L(x + 3, yc - 3, x - 3, yc + 3, { col }); return s; };
/* operating coil; o.td 'on' (slow operating: box with a cross) or 'off' (slow release: filled box); o.live fills it */
IE.coil = (x, y0, y1, o = {}) => { const ym = (y0 + y1) / 2, w = 24, h = 14, col = o.col;
  let s = L(x, y0, x, ym - h / 2, { col }) + L(x, ym + h / 2, x, y1, { col }) +
    `<rect x="${f(x - w / 2)}" y="${f(ym - h / 2)}" width="${w}" height="${h}" fill="${o.live ? (o.fill || '#ffd166') : 'none'}"${col ? ` stroke="${col}"` : ''}/>`;
  if (o.td) { const bx = x - w / 2 - 12; s += `<rect x="${f(bx)}" y="${f(ym - h / 2)}" width="12" height="${h}" fill="${o.td === 'off' ? (col || 'currentColor') : 'none'}"${col ? ` stroke="${col}"` : ''}/>`;
    if (o.td === 'on') s += L(bx, ym - h / 2, bx + 12, ym + h / 2, { col }) + L(bx + 12, ym - h / 2, bx, ym + h / 2, { col }); }
  return s; };
/* signal lamp: circle with a cross; o.live lights it in o.lamp colour */
const pale = c => { const m = /^#([0-9a-f]{6})$/i.exec(c || ''); if (!m) return false; const v = parseInt(m[1], 16); return Math.min(v >> 16, (v >> 8) & 255, v & 255) > 0xd8; };
IE.lamp = (x, y0, y1, o = {}) => { const ym = (y0 + y1) / 2, r = 9, col = o.col, d = r * 0.7;
  return L(x, y0, x, ym - r, { col }) + L(x, ym + r, x, y1, { col }) + (o.live ? `<circle cx="${x}" cy="${ym}" r="${r + 5}" fill="${o.lamp || '#7ee787'}" opacity="${pale(o.lamp) ? '.9' : '.35'}" stroke="${pale(o.lamp) ? '#8a93a6' : 'none'}"${pale(o.lamp) ? ' stroke-width="1" stroke-dasharray="2 2"' : ''}/>` : '') +
    `<circle cx="${x}" cy="${ym}" r="${r}" fill="${o.live ? (o.lamp || '#7ee787') : 'none'}"${col ? ` stroke="${col}"` : ''}/>` + L(x - d, ym - d, x + d, ym + d, { col }) + L(x + d, ym - d, x - d, ym + d, { col }); };
IE.fuse = (x, y0, y1, o = {}) => { const ym = (y0 + y1) / 2, col = o.col;
  return L(x, y0, x, ym - 11, { col }) + L(x, ym + 11, x, y1, { col }) + `<rect x="${x - 4}" y="${ym - 11}" width="8" height="22" fill="${o.blown ? '#ff6b6b' : 'none'}"${col ? ` stroke="${col}"` : ''}/>` + (o.blown ? '' : L(x, ym - 11, x, ym + 11, { col })); };
/* thermal overload element in a power line */
IE.therm = (x, y0, y1, o = {}) => { const ym = (y0 + y1) / 2, col = o.col, h = 2.5 * K, w = o.w || 16, j = 1.5 * K;   // a box 5 mm tall (narrower than the slides' 10 mm: the poles here are 20 px apart), the line stepping 3 mm left inside it
  return L(x, y0, x, ym - j, { col }) + L(x, ym + j, x, y1, { col }) + `<rect x="${f(x - w / 2)}" y="${f(ym - h)}" width="${w}" height="${f(2 * h)}" fill="${o.trip ? 'rgba(255,107,107,.35)' : 'none'}"${col ? ` stroke="${col}"` : ''}/>` +
    PA(`M ${x} ${f(ym - j)} L ${f(x - 3 * K)} ${f(ym - j)} L ${f(x - 3 * K)} ${f(ym + j)} L ${x} ${f(ym + j)}`, col); };
IE.motor = (x, cy, r, o = {}) => `<circle cx="${x}" cy="${cy}" r="${r}" fill="none"${o.col ? ` stroke="${o.col}"` : ''}/>` + T('M', x, cy - 1, { size: 13, anchor: 'middle', weight: 700, col: o.col }) + T(o.one ? '1~' : '3~', x, cy + 13, { size: 10, anchor: 'middle', col: o.col });

/* winding (a row of half loops on a vertical conductor), e.g. the run winding U1–U2 or the start winding Z1–Z2 */
IE.wind = (x, y0, y1, o = {}) => { const n = 4, h = Math.min(9, (y1 - y0 - 8) / n), ya = (y0 + y1) / 2 - n * h / 2, col = o.col; let d = `M ${f(x)} ${f(ya)}`;
  for (let i = 0; i < n; i++) d += ` A ${f(h / 2)} ${f(h / 2)} 0 0 1 ${f(x)} ${f(ya + (i + 1) * h)}`;
  return L(x, y0, x, ya, { col }) + `<path d="${d}" fill="none"${col ? ` stroke="${col}"` : ''}/>` + L(x, ya + n * h, x, y1, { col }); };
/* capacitor: two plates across the conductor */
IE.cap = (x, y0, y1, o = {}) => { const ym = (y0 + y1) / 2, col = o.col;
  return L(x, y0, x, ym - 3, { col }) + L(x - 8, ym - 3, x + 8, ym - 3, { col, w: 2 }) + L(x - 8, ym + 3, x + 8, ym + 3, { col, w: 2 }) + L(x, ym + 3, x, y1, { col }); };
/* earth symbol hanging below (x, y) */
IE.earth = (x, y, o = {}) => { const col = o.col; return L(x, y, x, y + 5, { col }) + L(x - 7, y + 5, x + 7, y + 5, { col }) + L(x - 4.5, y + 8, x + 4.5, y + 8, { col }) + L(x - 2, y + 11, x + 2, y + 11, { col }); };
/* earth fault from a node: o.act = the fault exists (a flash to earth, then the protective conductor back to the earthed neutral, dashed) */
IE.efault = (x, y0, y1, o = {}) => { const ym = (y0 + y1) / 2, col = o.col;
  if (!o.act) return L(x, y0, x, y1, { col: 'var(--muted)', dash: '2 4' }) + `<path d="M ${x + 5} ${ym - 9} L ${x - 3} ${ym} L ${x + 3} ${ym} L ${x - 5} ${ym + 9}" fill="none" stroke="var(--muted)"/>`;
  return L(x, y0, x, ym - 12, { col }) + `<path d="M ${x} ${ym - 12} L ${x + 6} ${ym - 3} L ${x - 6} ${ym + 1} L ${x} ${ym + 8}" fill="none"${col ? ` stroke="${col}"` : ''} stroke-width="2"/>` +
    IE.earth(x, ym + 8, { col }) + L(x, ym + 20, x, y1, { col, dash: '4 3' }); };
/* measuring instrument: a circle with its letter (V voltmeter, A ammeter) */
IE.meter = (x, cy, r, letter, o = {}) => `<circle cx="${x}" cy="${cy}" r="${r}" fill="${o.fill || 'none'}"${o.col ? ` stroke="${o.col}"` : ''}/>` + T(letter, x, cy + 4.5, { size: 13, anchor: 'middle', weight: 700, col: o.col });
/* current transformer on a vertical conductor at (x, y): a ring around it with its secondary lead to the right */
IE.ct = (x, y, o = {}) => { const col = o.col; return `<circle cx="${x}" cy="${y}" r="6" fill="none"${col ? ` stroke="${col}"` : ''}/>` + L(x + 6, y, x + 16, y, { col }); };

/* one element by kind (used by the simulator and by the symbol gallery) */
IE.draw = (k, x, y0, y1, o = {}) => {
  if (k === 'NO' || k === 'NC') return IE.contact(k === 'NC', x, y0, y1, o);
  if (k === 'coil') return IE.coil(x, y0, y1, o);
  if (k === 'lamp') return IE.lamp(x, y0, y1, o);
  if (k === 'fuse') return IE.fuse(x, y0, y1, o);
  if (k === 'mainNO') return IE.mainNO(x, y0, y1, o);
  if (k === 'cb') return IE.cb(x, y0, y1, o);
  if (k === 'therm') return IE.therm(x, y0, y1, o);
  if (k === 'earth') return IE.efault(x, y0, y1, o);
  if (k === 'cap') return IE.cap(x, y0, y1, o);
  if (k === 'wind') return IE.wind(x, y0, y1, o);
  if (k === 'w') return L(x, y0, x, y1, { col: o.col });
  return '';
};
IE.svg = (w, h, body, o = {}) => `<svg class="dwg${o.cls ? ' ' + o.cls : ''}" viewBox="0 0 ${f(w)} ${f(h)}"${o.max ? ` style="max-width:${o.max}px"` : ''} role="img" aria-label="${o.label || 'circuit'}" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
global.IEC = IE;
})(window);
