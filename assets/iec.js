/* iec.js — IEC 60617-style symbols for control and power circuits, drawn as SVG strings in a VERTICAL current path (IEC layout:
   supply at the top, neutral at the bottom). Every element sits between (x, y0) and (x, y1); the symbol is centred on ym.
   Contacts can be drawn in their real state (o.act = actuated) so that the relay simulator animates them; drawings for print use the
   unactuated state, as the standard requires. Strokes use currentColor unless o.col is given.
   Kinds: NO, NC (contacts), op = 'pb' push button, 'mush' emergency stop, 'sel' selector (maintained), 'lim' position switch,
   'flt' float, 'prs' pressure, 'tmp' temperature, 'thr' thermal (overload contact), 'td' timed contact (o.td = 'on' | 'off');
   coil (o.td on/off for timers), lamp, fuse, mainNO (contactor main contact), cb (circuit breaker), therm (thermal element), motor. */
(function (global) {
'use strict';
const IE = {};
const f = v => +(+v).toFixed(1);
const L = (x1, y1, x2, y2, o = {}) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"${o.col ? ` stroke="${o.col}"` : ''}${o.w ? ` stroke-width="${o.w}"` : ''}${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.cls ? ` class="${o.cls}"` : ''}/>`;
const T = (s, x, y, o = {}) => `<text x="${f(x)}" y="${f(y)}" font-size="${o.size || 10}" text-anchor="${o.anchor || 'start'}" fill="${o.col || 'currentColor'}"${o.weight ? ` font-weight="${o.weight}"` : ''} stroke="none">${s}</text>`;
IE.L = L; IE.T = T;
const G = 12;   // half-gap of the contact zone

/* operator drawn to the left of a contact blade, joined by a dashed line (mechanical link) */
function operator(op, x, ym, o) {
  const xl = x - 26, c = o.col ? ` stroke="${o.col}"` : '';
  let s = L(x - 6, ym, xl + 5, ym, { dash: '3 2', col: o.col });
  if (op === 'pb') s += `<path d="M ${xl + 1} ${ym - 6} L ${xl + 5} ${ym - 6} L ${xl + 5} ${ym + 6} L ${xl + 1} ${ym + 6}" fill="none"${c}/>`;
  else if (op === 'mush') s += L(xl + 5, ym - 7, xl + 5, ym + 7, { col: o.col }) + `<path d="M ${xl + 5} ${ym - 7} A 7 7 0 0 0 ${xl + 5} ${ym + 7}" fill="none"${c}/>`;
  else if (op === 'sel') s += `<path d="M ${xl} ${ym + 6} L ${xl + 3} ${ym + 6} L ${xl + 3} ${ym - 6} L ${xl + 6} ${ym - 6}" fill="none"${c}/>`;
  else if (op === 'lim') s += `<path d="M ${xl + 5} ${ym - 6} L ${xl - 2} ${ym} L ${xl + 5} ${ym + 6} Z" fill="none"${c}/>`;
  else if (op === 'flt') s += `<circle cx="${xl}" cy="${ym}" r="5" fill="none"${c}/>` + L(xl - 7, ym + 7, xl + 7, ym + 7, { col: o.col });
  else if (op === 'prs') s += `<path d="M ${xl - 5} ${ym - 5} L ${xl + 5} ${ym - 5} L ${xl + 5} ${ym + 5} L ${xl - 5} ${ym + 5} Z" fill="none"${c}/>` + T('p', xl, ym + 4, { size: 10, anchor: 'middle', col: o.col });
  else if (op === 'tmp') s += `<path d="M ${xl - 5} ${ym - 5} L ${xl + 5} ${ym - 5} L ${xl + 5} ${ym + 5} L ${xl - 5} ${ym + 5} Z" fill="none"${c}/>` + T('θ', xl, ym + 4, { size: 10, anchor: 'middle', col: o.col });
  else if (op === 'thr') s += `<path d="M ${xl - 3} ${ym + 6} L ${xl - 3} ${ym} L ${xl + 3} ${ym} L ${xl + 3} ${ym - 6}" fill="none"${c}/>`;
  return s;
}
/* contact: NO (make) or NC (break); o.act draws the actuated position */
IE.contact = (nc, x, y0, y1, o = {}) => {
  const ym = (y0 + y1) / 2, yt = ym - G, yb = ym + G, col = o.col; let s = L(x, y0, x, yt, { col, cls: o.clsT }) + L(x, yb, x, y1, { col, cls: o.clsB });
  const closed = nc ? !o.act : !!o.act;
  if (nc) s += L(x, yt, x + 9, yt, { col });   // the seat of a break contact
  if (o.td) {   // timed contact: the "parachute" arc on the blade, opening towards the delayed direction
    const up = (o.td === 'on') !== nc; s += `<path d="M ${x - 9} ${ym + (up ? 2 : -2)} A 6 6 0 0 ${up ? 1 : 0} ${x + 3} ${ym + (up ? 2 : -2)}" fill="none"${col ? ` stroke="${col}"` : ''}/>`;
    s += L(x - 3, ym + (up ? 2 : -2), x - 3, ym + (up ? 7 : -7), { col }); }
  // blade from the lower terminal
  const tx = closed ? (nc ? x + 9 : x + 1) : (nc ? x - 9 : x - 11), ty = closed ? yt - (nc ? 2 : 0) : yt + 1;
  s += L(x, yb, tx, ty, { col, w: 1.6 });
  if (o.op) s += operator(o.op, x - 4, ym, o);
  return s;
};
/* power-circuit contacts: contactor main contact (small arc at the fixed contact) and circuit breaker (cross) */
IE.mainNO = (x, y0, y1, o = {}) => { const ym = (y0 + y1) / 2, yt = ym - G, col = o.col; let s = IE.contact(false, x, y0, y1, o);
  s += `<path d="M ${x - 3.5} ${yt} A 3.5 3.5 0 0 0 ${x + 3.5} ${yt}" fill="none"${col ? ` stroke="${col}"` : ''}/>`; return s; };
IE.cb = (x, y0, y1, o = {}) => { const ym = (y0 + y1) / 2, yt = ym - G, col = o.col; let s = IE.contact(false, x, y0, y1, o);
  s += L(x - 3.5, yt - 3.5, x + 3.5, yt + 3.5, { col }) + L(x + 3.5, yt - 3.5, x - 3.5, yt + 3.5, { col }); return s; };
/* operating coil; o.td 'on' (slow operating: box with a cross) or 'off' (slow release: filled box); o.live fills it */
IE.coil = (x, y0, y1, o = {}) => { const ym = (y0 + y1) / 2, w = 24, h = 14, col = o.col;
  let s = L(x, y0, x, ym - h / 2, { col }) + L(x, ym + h / 2, x, y1, { col }) +
    `<rect x="${f(x - w / 2)}" y="${f(ym - h / 2)}" width="${w}" height="${h}" fill="${o.live ? (o.fill || '#ffd166') : 'none'}"${col ? ` stroke="${col}"` : ''}/>`;
  if (o.td) { const bx = x - w / 2 - 12; s += `<rect x="${f(bx)}" y="${f(ym - h / 2)}" width="12" height="${h}" fill="${o.td === 'off' ? (col || 'currentColor') : 'none'}"${col ? ` stroke="${col}"` : ''}/>`;
    if (o.td === 'on') s += L(bx, ym - h / 2, bx + 12, ym + h / 2, { col }) + L(bx + 12, ym - h / 2, bx, ym + h / 2, { col }); }
  return s; };
/* signal lamp: circle with a cross; o.live lights it in o.lamp colour */
IE.lamp = (x, y0, y1, o = {}) => { const ym = (y0 + y1) / 2, r = 9, col = o.col, d = r * 0.7;
  return L(x, y0, x, ym - r, { col }) + L(x, ym + r, x, y1, { col }) + (o.live ? `<circle cx="${x}" cy="${ym}" r="${r + 5}" fill="${o.lamp || '#7ee787'}" opacity=".35" stroke="none"/>` : '') +
    `<circle cx="${x}" cy="${ym}" r="${r}" fill="${o.live ? (o.lamp || '#7ee787') : 'none'}"${col ? ` stroke="${col}"` : ''}/>` + L(x - d, ym - d, x + d, ym + d, { col }) + L(x + d, ym - d, x - d, ym + d, { col }); };
IE.fuse = (x, y0, y1, o = {}) => { const ym = (y0 + y1) / 2, col = o.col;
  return L(x, y0, x, ym - 11, { col }) + L(x, ym + 11, x, y1, { col }) + `<rect x="${x - 4}" y="${ym - 11}" width="8" height="22" fill="${o.blown ? '#ff6b6b' : 'none'}"${col ? ` stroke="${col}"` : ''}/>` + (o.blown ? '' : L(x, ym - 11, x, ym + 11, { col })); };
/* thermal overload element in a power line */
IE.therm = (x, y0, y1, o = {}) => { const ym = (y0 + y1) / 2, col = o.col;
  return L(x, y0, x, ym - 9, { col }) + L(x, ym + 9, x, y1, { col }) + `<rect x="${x - 6}" y="${ym - 9}" width="12" height="18" fill="none"${col ? ` stroke="${col}"` : ''}/>` +
    `<path d="M ${x} ${ym - 9} L ${x} ${ym - 3} L ${x - 3} ${ym - 3} L ${x - 3} ${ym + 3} L ${x} ${ym + 3} L ${x} ${ym + 9}" fill="none"${col ? ` stroke="${col}"` : ''}/>`; };
IE.motor = (x, cy, r, o = {}) => `<circle cx="${x}" cy="${cy}" r="${r}" fill="none"${o.col ? ` stroke="${o.col}"` : ''}/>` + T('M', x, cy - 1, { size: 13, anchor: 'middle', weight: 700, col: o.col }) + T(o.one ? '1~' : '3~', x, cy + 13, { size: 10, anchor: 'middle', col: o.col });

/* one element by kind (used by the simulator and by the symbol gallery) */
IE.draw = (k, x, y0, y1, o = {}) => {
  if (k === 'NO' || k === 'NC') return IE.contact(k === 'NC', x, y0, y1, o);
  if (k === 'coil') return IE.coil(x, y0, y1, o);
  if (k === 'lamp') return IE.lamp(x, y0, y1, o);
  if (k === 'fuse') return IE.fuse(x, y0, y1, o);
  if (k === 'mainNO') return IE.mainNO(x, y0, y1, o);
  if (k === 'cb') return IE.cb(x, y0, y1, o);
  if (k === 'therm') return IE.therm(x, y0, y1, o);
  if (k === 'w') return L(x, y0, x, y1, { col: o.col });
  return '';
};
IE.svg = (w, h, body, o = {}) => `<svg class="dwg${o.cls ? ' ' + o.cls : ''}" viewBox="0 0 ${f(w)} ${f(h)}"${o.max ? ` style="max-width:${o.max}px"` : ''} role="img" aria-label="${o.label || 'circuit'}" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
global.IEC = IE;
})(window);
