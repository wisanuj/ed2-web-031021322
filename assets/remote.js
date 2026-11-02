/* remote.js — page 1.0 "Introduction to motor control" (the story of Lecture 1 by Satit Owatchaiphong, redrawn in our own style):
   1) RC.power(o): the story drawings on one canvas (640 × 440): the supply L1 L2 L3 N PE across the top and motor M1 at the bottom.
      o.mode 'direct' (motor tied to the lines) | 'near' (3-pole switch S1 beside the motor) | 'room' (S1 in a control room 25 m away:
      the motor wires run there and back) | 'idea' (a 3-pole contact beside the motor, closed from far away?) | 'relay' (fixed core,
      moving core, contact bridges; o.coil, o.spring, o.ctrl = control room switch S1 feeding the coil from L1 and N).
      o.on = switch closed / coil energised (the magnet is closed when o.on && o.coil; without a spring it also stays closed when
      o.stuck); o.box = false drops the control room box (a push button beside the machine); o.amps, o.wire, o.dist, o.coilA, o.ctlWire = labels; o.anim = false draws the current solid (slides, print).
   2) RC.rail(o): the railroad switch: o.pos 'main' | 'side', o.remote (lever in a signal box with a wire over pulleys), o.train
      (0–1 along the set route, null = no train), o.anim.
   3) RC.cost(d, p) → { sw, km, parts }: the two ways to switch the motor from a room d metres away (prices of the slides, example);
      RC.BREAK(p) = the distance where both cost the same; RC.costChart(o) → SVG of both costs against distance.
   4) RC.Magnet(el, o): the coil, core and spring by themselves (press and hold S1).
   Used by ch1_0_motor_control.html and rendered for the revised Lecture 1 slides (Slides_69_2/_build). */
(function (global) {
'use strict';
const RC = {}, T = (th, en) => (global.MC ? MC.t(th, en) : en);
const COL = { L1: 'var(--c7-l1, #a0522d)', L2: 'var(--ink, #202b38)', L3: 'var(--c7-l3, #687083)', N: 'var(--rc-n, #2f6fd0)', PE: 'var(--rc-pe, #2e9d4a)',
  cur: 'var(--rc-cur, #e0531f)', ctl: 'var(--rc-ctl, #1f7ae0)', core: 'var(--rc-core, #9aa3b5)', coreS: 'var(--rc-coreS, #5d6577)', cu: 'var(--rc-cu, #c2562b)',
  room: 'var(--rc-room, #2f6fd0)', muted: 'var(--muted, #4a5a70)', panel: 'var(--panel, #ffffff)', ink: 'var(--ink, #202b38)' };
RC.COL = COL;
const f1 = v => +(+v).toFixed(1);
const PL = (pts, o = {}) => `<polyline points="${pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ')}" fill="none" stroke="${o.col || COL.ink}" stroke-width="${o.w || 1.7}" stroke-linejoin="round" stroke-linecap="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
const LN = (x1, y1, x2, y2, o = {}) => PL([[x1, y1], [x2, y2]], o);
const TX = (s, x, y, o = {}) => `<text x="${f1(x)}" y="${f1(y)}" font-size="${o.size || 14}" text-anchor="${o.anchor || 'start'}" fill="${o.col || COL.ink}"${o.weight ? ` font-weight="${o.weight}"` : ''}${o.italic ? ' font-style="italic"' : ''}>${s}</text>`;
const DOT = (x, y, col = COL.ink) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="3" fill="${col}"/>`;
const TERM = (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.8" fill="${COL.panel}" stroke="${COL.ink}" stroke-width="1.4"/>`;
const sub = (a, b) => `${a}<tspan baseline-shift="sub" font-size="72%">${b}</tspan>`;
/* a wire: the phase colour, or the current colour (animated on the page) while current flows */
const wire = (pts, col, on, o = {}) => on ? `<g${o.anim === false ? '' : ' class="rl-cur"'}>${PL(pts, { col: o.cc || COL.cur, w: 2.8 })}</g>` : PL(pts, { col, w: 1.7 });
const arrowDown = (x, y, col) => `<path d="M ${x} ${y - 13} L ${x} ${y}" stroke="${col}" stroke-width="1.8"/><path d="M ${x - 4} ${y - 6} L ${x} ${y} L ${x + 4} ${y - 6}" fill="none" stroke="${col}" stroke-width="1.8"/>`;
const arrowUp = (x, y, col) => `<path d="M ${x} ${y + 13} L ${x} ${y}" stroke="${col}" stroke-width="1.8"/><path d="M ${x - 4} ${y + 6} L ${x} ${y} L ${x + 4} ${y + 6}" fill="none" stroke="${col}" stroke-width="1.8"/>`;
const arrowRight = (x, y, col) => `<path d="M ${x - 16} ${y} L ${x} ${y}" stroke="${col}" stroke-width="1.8"/><path d="M ${x - 6} ${y - 4} L ${x} ${y} L ${x - 6} ${y + 4}" fill="none" stroke="${col}" stroke-width="1.8"/>`;

/* ---------------- 1) the story drawings ---------------- */
const W = 640, H = 440, RY = [34, 48, 62, 76, 90], RX0 = 70, RX1 = 620, PH = ['L1', 'L2', 'L3'], DX = [452, 472, 492], MX = 472, MY = 394, MR = 28;
const rails = (x0 = RX0) => ['L1', 'L2', 'L3', 'N', 'PE'].map((n, i) => LN(x0, RY[i], RX1, RY[i], { col: COL[n], w: n === 'PE' ? 1.6 : 1.9, dash: n === 'PE' ? '9 4 2 4' : '' }) +
  TX(n, x0 - 8, RY[i] + 4.5, { size: 13, anchor: 'end', weight: 600, col: COL[n] })).join('');
const leadTop = k => { const dx = DX[k] - MX; return MY - Math.sqrt(MR * MR - dx * dx); };
const motor = (on, o) => { let s = `<circle cx="${MX}" cy="${MY}" r="${MR}" fill="${COL.panel}" stroke="${COL.ink}" stroke-width="1.9"/>` +
    TX('M', MX, MY - 1, { size: 16, anchor: 'middle', weight: 700 }) + TX('3~', MX, MY + 16, { size: 13, anchor: 'middle' }) + TX('M1', MX - MR - 10, MY + 5, { size: 15, anchor: 'end', weight: 700 });
  if (on) { const a = `M ${MX + MR + 8} ${MY + 14} A ${MR + 9} ${MR + 9} 0 0 0 ${MX + MR + 8} ${MY - 14}`;   // rotation arrow on the right
    s += `<path d="${a}" fill="none" stroke="${COL.cur}" stroke-width="2.4"/><path d="M ${MX + MR + 2} ${MY - 19} L ${MX + MR + 8} ${MY - 14} L ${MX + MR + 14} ${MY - 20}" fill="none" stroke="${COL.cur}" stroke-width="2.4"/>`;
    if (o.anim !== false) s += `<g class="rc-spin" style="transform-origin:${MX}px ${MY}px"><line x1="${MX}" y1="${MY - MR + 5}" x2="${MX}" y2="${MY - MR + 11}" stroke="${COL.cur}" stroke-width="2.4" stroke-linecap="round"/></g>`; }
  return s; };
const drops = (y0s, y1s, on, o) => [0, 1, 2].map(k => wire([[DX[k], y0s[k]], [DX[k], y1s[k]]], COL[PH[k]], on, o)).join('');
const railDots = (xs, rows) => xs.map((x, k) => DOT(x, RY[rows ? rows[k] : k], COL[(rows ? ['L1', 'L2', 'L3', 'N', 'PE'][rows[k]] : PH[k])])).join('');
/* a manual 3-pole (or 1-pole) switch, blades pivoting at the bottom terminal; xs = pole positions, y0/y1 = top/bottom terminals */
const switchN = (xs, y0, y1, on, name, o, cc) => { let s = ''; const mids = [];
  xs.forEach(x => { const bx = on ? x : x - 13, by = on ? y0 : y0 + 4; s += (on ? `<g>${LN(x, y1, bx, by, { col: cc || COL.cur, w: 2.8 })}</g>` : LN(x, y1, bx, by, { w: 1.9 })) + TERM(x, y0) + TERM(x, y1); mids.push([(x + bx) / 2, (y1 + by) / 2]); });
  const ym = mids[0][1], xl = mids[0][0] - 26; s += LN(xl, ym, mids[mids.length - 1][0], ym, { col: COL.ink, w: 1.3, dash: '5 3' }) + LN(xl, ym - 7, xl, ym + 7, { w: 1.9 }) +
    TX(name, xl - 7, ym + 5, { size: 15, anchor: 'end', weight: 700 });
  return s; };
/* contact pads on the three motor lines and the moving copper bridges (dx = 0 closed, 14 open) on an insulating rod */
const PADY = [204, 228];
const pads = (dx, on) => { let s = ''; DX.forEach((x, k) => { s += `<rect x="${x - 7}" y="${PADY[0] - 3}" width="14" height="4" fill="${COL.cu}"/><rect x="${x - 7}" y="${PADY[1] - 1}" width="14" height="4" fill="${COL.cu}"/>`; });
  DX.forEach(x => { s += `<rect x="${x + dx - 3.5}" y="${PADY[0] - 6}" width="7" height="${PADY[1] - PADY[0] + 12}" rx="2" fill="${on && dx === 0 ? COL.cur : COL.cu}" stroke="${COL.coreS}" stroke-width="0.8"/>`; });
  return s; };
const rod = (x0, dx) => `<rect x="${f1(x0)}" y="${(PADY[0] + PADY[1]) / 2 - 3}" width="${f1(DX[2] + dx + 6 - x0)}" height="6" rx="2" fill="${COL.core}" stroke="${COL.coreS}" stroke-width="0.8" opacity="0.92"/>`;
/* the magnet: fixed E-core (opening right) with the coil on its middle leg, moving E-core (opening left), spring on two posts */
const CX0 = 322, CW = 40, CG = 16, CY0 = 186, CH = 56;
const eCore = (x, flip) => { const t = 10, sp = flip ? x + CW - t : x; return `<path d="M ${sp} ${CY0} h ${t} v ${CH} h ${-t} Z" fill="${COL.core}" stroke="${COL.coreS}"/>` +
    [CY0, CY0 + CH / 2 - t / 2, CY0 + CH - t].map(y => `<rect x="${x}" y="${y}" width="${CW}" height="${t}" fill="${COL.core}" stroke="${COL.coreS}"/>`).join(''); };
const coil = (live) => { let s = ''; const y = CY0 + CH / 2, col = live ? COL.ctl : 'var(--rc-coilOff, #7fa6d9)';
  for (let i = 0; i < 5; i++) { const x = CX0 + 14 + i * 5; s += `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="11" fill="none" stroke="${col}" stroke-width="${live ? 2.2 : 1.6}"/>`; }
  return s; };
const spring = (x0, x1, y) => { const n = 7, L = x1 - x0; let d = `M ${x0} ${y}`; for (let i = 0; i < n; i++) { const xa = x0 + L * (i + 0.25) / n, xb = x0 + L * (i + 0.75) / n; d += ` L ${f1(xa)} ${y - 7} L ${f1(xb)} ${y + 7}`; } d += ` L ${x1} ${y}`;
  return `<path d="${d}" fill="none" stroke="${COL.ink}" stroke-width="1.6" stroke-linejoin="round"/>`; };

RC.power = (o = {}) => {
  const m = o.mode || 'direct', A = { anim: o.anim }, wide = m === 'room' || m === 'idea' || (m === 'relay' && o.ctrl), x0 = wide ? RX0 : (m === 'relay' ? 290 : 380);
  let s = rails(x0), on = !!o.on;
  const amps = () => arrowDown(DX[2] + 14, 150, COL.cur) + TX('I = 21 A', DX[2] + 22, 146, { size: 14, col: COL.cur, weight: 600 });   // right of the motor lines
  if (m === 'supply') s += motor(false, A);   // the supply and a motor not yet connected
  else if (m === 'direct' || m === 'near') {
    on = m === 'direct' ? true : on;
    s += railDots(DX);
    if (m === 'direct') s += drops(RY, [0, 1, 2].map(leadTop), true, A);
    else { s += drops(RY, [208, 208, 208], on, A) + switchN(DX, 208, 240, on, 'S1', A) + drops([240, 240, 240], [0, 1, 2].map(leadTop), on, A); }
    if (o.amps && on) s += amps();
    if (o.wire) s += TX(T('สาย THW 3×4 mm²', 'THW 3×4 mm²'), DX[2] + 14, 176, { size: 13, col: COL.muted });
    s += motor(on, A);
  } else if (m === 'room') {
    const SX = [188, 208, 228], YT = [122, 136, 150], YR = [298, 284, 270], BX = [120, 286, 166, 320];
    s += `<rect x="${BX[0]}" y="${BX[2]}" width="${BX[1] - BX[0]}" height="${BX[3] - BX[2]}" rx="6" fill="none" stroke="${COL.room}" stroke-width="1.6"/>` +
      TX(T('ห้องควบคุม', 'Control room'), BX[0] + 8, BX[3] - 8, { size: 13, col: COL.room, weight: 600 });
    s += railDots(DX);
    [0, 1, 2].forEach(k => { s += wire([[DX[k], RY[k]], [DX[k], YT[k]], [SX[k], YT[k]], [SX[k], 212]], COL[PH[k]], on, A) + wire([[SX[k], 244], [SX[k], YR[k]], [DX[k], YR[k]], [DX[k], leadTop(k)]], COL[PH[k]], on, A); });
    s += switchN(SX, 212, 244, on, 'S1', A);
    if (o.amps && on) s += amps();
    if (o.wire) s += TX(T('สาย THW 3×4 mm²', 'THW 3×4 mm²'), DX[2] + 14, 176, { size: 13, col: COL.muted });
    if (o.dist) { const y = 330; s += LN(BX[1] + 4, y, DX[0] - 4, y, { col: COL.muted, w: 1.2 }) + `<path d="M ${BX[1] + 12} ${y - 4} L ${BX[1] + 4} ${y} L ${BX[1] + 12} ${y + 4} M ${DX[0] - 12} ${y - 4} L ${DX[0] - 4} ${y} L ${DX[0] - 12} ${y + 4}" fill="none" stroke="${COL.muted}" stroke-width="1.2"/>` +
      TX(T('25 m', '25 m'), (BX[1] + DX[0]) / 2, y - 6, { size: 14, anchor: 'middle', weight: 700, col: COL.muted }); }
    s += motor(on, A);
  } else {   // 'idea' and 'relay': contact bridges on the motor lines
    const relay = m === 'relay', closed = relay ? !!(o.coil && (on || o.stuck)) : on, dx = closed ? 0 : 14;
    s += railDots(DX) + drops(RY, [PADY[0] - 3, PADY[0] - 3, PADY[0] - 3], closed, A) + drops([PADY[1] + 3, PADY[1] + 3, PADY[1] + 3], [0, 1, 2].map(leadTop), closed, A);
    if (relay) {
      const ax = CX0 + CW + (closed ? 2 : CG);   // moving core position
      s += rod(ax + CW - 2, dx) + pads(dx, closed) + eCore(CX0, false) + eCore(ax, true);
      if (o.coil) { const live = on; s += coil(live);
        const t1 = CX0 + 16, t2 = CX0 + 30; s += LN(t1, CY0 + CH / 2 + 11, t1, 262, { w: 1.5, col: live ? COL.ctl : COL.ink }) + LN(t2, CY0 + CH / 2 + 11, t2, 262, { w: 1.5, col: live ? COL.ctl : COL.ink }) + TERM(t1, 262) + TERM(t2, 262) +
          TX('A2', t1 - 6, 276, { size: 12, anchor: 'end', col: COL.muted }) + TX('A1', t2 + 6, 276, { size: 12, col: COL.muted });
        if (!o.ctrl && o.coilA && live) s += arrowUp(t2, 266, COL.ctl) + TX(sub('I', T('คอยล์', 'coil')) + ' = 0.5 A', CX0 + 23, 298, { size: 13, anchor: 'middle', col: COL.ctl, weight: 600 });
        if (o.ctrl) {   // control room: L1 → S1 → A1, A2 → N
          const LXc = 242, NXc = 296, BX = [128, 282, 146, 306];
          if (o.box !== false) s += `<rect x="${BX[0]}" y="${BX[2]}" width="${BX[1] - BX[0]}" height="${BX[3] - BX[2]}" rx="6" fill="none" stroke="${COL.room}" stroke-width="1.6"/>` +
            TX(T('ห้องควบคุม', 'Control room'), BX[0] + 8, BX[2] + 18, { size: 13, col: COL.room, weight: 600 });   // o.box false: a push button beside the machine (jogging, ED2 page 2.0)
          s += DOT(LXc, RY[0], COL.L1) + DOT(NXc, RY[3], COL.N);
          const cc = { anim: o.anim, cc: COL.ctl };
          s += wire([[LXc, RY[0]], [LXc, 212]], COL.L1, live, cc) + switchN([LXc], 212, 244, on, 'S1', A, COL.ctl) + wire([[LXc, 244], [LXc, 292], [t2, 292], [t2, 265]], COL.L1, live, cc) +
            wire([[NXc, RY[3]], [NXc, 280], [t1, 280], [t1, 265]], COL.N, live, cc);
          if (o.coilA && live) s += arrowRight(LXc + 70, 292, COL.ctl) + TX(sub('I', T('คอยล์', 'coil')) + ' = 0.5 A', LXc + 6, 316, { size: 13, col: COL.ctl, weight: 600 }) ;
          if (o.ctlWire) s += TX(T('สาย VSF 2×0.75 mm² · 25 m', 'VSF 2×0.75 mm² · 25 m'), BX[0], 340, { size: 13, col: COL.muted });
        }
      }
      if (o.spring) { const y = CY0 - 16, p1 = CX0 + CW - 12, p2 = ax + 12;
        s += LN(p1, CY0, p1, y - 6, { w: 1.6 }) + LN(p2, CY0, p2, y - 6, { w: 1.6 }) + spring(p1, p2, y - 6) + TX(T('สปริง', 'spring'), (p1 + p2) / 2, y - 18, { size: 13, anchor: 'middle', col: COL.muted }); }
      if (o.labels !== false && !o.ctrl) s += TX(T('แกนเหล็กอยู่กับที่', 'fixed iron core'), CX0 + CW / 2, CY0 + CH + (o.coilA && on ? 78 : 58), { size: 12, anchor: 'middle', col: COL.muted }) +
        TX(T('แกนเหล็กเคลื่อนที่', 'moving iron core'), ax + CW / 2, CY0 - (o.spring ? 46 : 10), { size: 12, anchor: 'middle', col: COL.muted });   // with the control room the cores are already known
    } else {
      s += rod(DX[0] - 34, dx) + pads(dx, closed) + `<circle cx="${DX[0] - 52}" cy="${(PADY[0] + PADY[1]) / 2}" r="15" fill="${COL.panel}" stroke="${COL.ctl}" stroke-width="1.8"/>` + TX('?', DX[0] - 52, (PADY[0] + PADY[1]) / 2 + 7, { size: 20, anchor: 'middle', weight: 700, col: COL.ctl });
      const BX = [120, 286, 166, 300]; s += `<rect x="${BX[0]}" y="${BX[2]}" width="${BX[1] - BX[0]}" height="${BX[3] - BX[2]}" rx="6" fill="none" stroke="${COL.room}" stroke-width="1.6"/>` +
        TX(T('ห้องควบคุม', 'Control room'), BX[0] + 8, BX[2] + 18, { size: 13, col: COL.room, weight: 600 }) +
        PL([[BX[1] + 4, 233], [DX[0] - 70, (PADY[0] + PADY[1]) / 2 + 4]], { col: COL.ctl, w: 1.6, dash: '6 4' });
    }
    if (o.labels !== false) s += TX(T('หน้าสัมผัสทองแดง', 'copper contacts'), DX[2] + 22, PADY[0] + 2, { size: 12, col: COL.muted }) + TX(on || closed ? T('ต่อ', 'closed') : T('เปิด', 'open'), DX[2] + 22, PADY[0] + 18, { size: 12, col: closed ? COL.cur : COL.muted, weight: 600 });
    if (o.amps && closed) s += amps();
    s += motor(closed, A);
  }
  const vx = x0 - 44;
  return `<svg class="rl rc" viewBox="${vx} 0 ${W - vx} ${H}" width="${W - vx}" height="${H}" role="img" font-family="'IBM Plex Sans Thai','IBM Plex Mono',sans-serif">${s}</svg>`;
};

/* ---------------- 2) the railroad switch ---------------- */
const bez = (p0, p1, p2, p3, n = 40) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return out; };
const offset = (pts, d) => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [p[0] - dy / L * d, p[1] + dx / L * d]; });
const RAIL_MAIN = (() => { const out = []; for (let x = 20; x <= 620; x += 10) out.push([x, 196]); return out; })();
const TOE = 250, HEEL = 330;
const RAIL_SIDE = [[20, 196], [TOE, 196], ...bez([TOE, 196], [370, 196], [460, 150], [620, 92]).slice(1)];
const along = (pts, t) => { const seg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
  let d = t * tot; for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const r = d / seg[i], a = pts[i], b = pts[i + 1]; return { x: a[0] + (b[0] - a[0]) * r, y: a[1] + (b[1] - a[1]) * r, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) }; } d -= seg[i]; }
  const a = pts[pts.length - 2], b = pts[pts.length - 1]; return { x: b[0], y: b[1], ang: Math.atan2(b[1] - a[1], b[0] - a[0]) }; };
const cut = (pts, x0, x1) => pts.filter(p => p[0] >= x0 && p[0] <= x1);
RC.rail = (o = {}) => {
  const side = o.pos === 'side', route = side ? RAIL_SIDE : RAIL_MAIN, G = 9; let s = '';
  s += PL(route, { col: 'var(--rc-route, rgba(31,122,224,.16))', w: 34 });   // the route that is set
  [RAIL_MAIN, RAIL_SIDE].forEach(tr => { s += PL(tr.filter(p => p[0] >= (tr === RAIL_SIDE ? TOE : 0)), { col: 'var(--rc-tie, #c9a77a)', w: 28, dash: '6 12' }); });   // sleepers
  const railsOf = (tr, x0, x1) => [-G, G].map(d => PL(offset(cut(tr, x0, x1), d), { col: COL.ink, w: 2.4 })).join('');
  s += railsOf(RAIL_MAIN, 20, TOE) + railsOf(RAIL_MAIN, HEEL, 620) + railsOf(RAIL_SIDE, HEEL - 10, 620);
  s += `<g>${railsOf(side ? RAIL_SIDE : RAIL_MAIN, TOE, HEEL + 10).replace(/stroke="[^"]*"/g, `stroke="${COL.cur}"`)}</g>`;   // the points (blades) follow the lever
  /* throw rod and lever */
  const ang = side ? -28 : 28;
  if (!o.remote) { const px = TOE + 14, py = 268; s += LN(px, 206, px, py - 12, { col: COL.coreS, w: 3 }) + `<rect x="${px - 18}" y="${py - 8}" width="36" height="16" rx="3" fill="${COL.core}" stroke="${COL.coreS}"/>` +
      `<g transform="rotate(${ang} ${px} ${py})">${LN(px, py, px, py - 46, { col: COL.cur, w: 4 })}<circle cx="${px}" cy="${py - 46}" r="5" fill="${COL.cur}"/></g>` + TX(T('คันโยกข้างราง', 'lever beside the track'), px + 34, py + 6, { size: 13, col: COL.muted }); }
  else { const bx = 30, by = 214, px = 92, py = 284;
    s += `<rect x="${bx}" y="${by}" width="124" height="80" rx="6" fill="none" stroke="${COL.room}" stroke-width="1.6"/>` + TX(T('ห้องสัญญาณ', 'signal box'), bx + 8, by + 18, { size: 13, col: COL.room, weight: 600 }) +
      `<g transform="rotate(${ang} ${px} ${py})">${LN(px, py, px, py - 44, { col: COL.cur, w: 4 })}<circle cx="${px}" cy="${py - 44}" r="5" fill="${COL.cur}"/></g>`;
    const wy = 262, px2 = TOE + 14; s += PL([[px + (side ? -10 : 10), wy], [px2, wy], [px2, 206]], { col: COL.coreS, w: 1.6, dash: '' }) + [176, 210, px2].map(x => `<circle cx="${x}" cy="${wy}" r="5" fill="${COL.panel}" stroke="${COL.coreS}" stroke-width="1.4"/>`).join('') +
      TX(T('ลวดดึงบนรอก ยาวได้หลายร้อยเมตร', 'a wire over pulleys, hundreds of metres long'), 176, wy + 24, { size: 13, col: COL.muted }); }
  if (o.train != null) { const p = along(route, o.train), deg = p.ang * 180 / Math.PI;
    s += `<g transform="translate(${f1(p.x)} ${f1(p.y)}) rotate(${f1(deg)})"><rect x="-60" y="-11" width="40" height="22" rx="4" fill="var(--accent, #0b6fb8)"/><rect x="-16" y="-11" width="40" height="22" rx="6" fill="var(--accent, #0b6fb8)"/><rect x="18" y="-6" width="5" height="12" rx="1" fill="${COL.panel}"/></g>`; }
  s += TX(side ? T('ทางแยก', 'branch line') : T('ทางตรง', 'main line'), side ? 560 : 560, side ? 70 : 230, { size: 13, anchor: 'middle', weight: 700, col: 'var(--accent, #0b6fb8)' });
  return `<svg class="rl rc" viewBox="0 0 640 310" width="640" height="310" role="img" font-family="'IBM Plex Sans Thai','IBM Plex Mono',sans-serif">${s}</svg>`;
};

/* ---------------- 3) cost of the two ways (prices of the Lecture 1 slides; examples, not a price list) ---------------- */
RC.PRICE = { thw: 12, vsf: 2.5, sw: 900, km: 2000 };   // baht per metre of one THW 4 mm² wire / one VSF 0.75 mm² wire, 3-pole switch 32 A, contactor 32 A
RC.cost = (d, p = RC.PRICE) => { const thw = 3 * 2 * d * p.thw, vsf = 2 * d * p.vsf;   // switch: 3 wires there and back; contactor: one control wire there, one back
  return { sw: thw + p.sw, km: vsf + p.km, parts: { thw, vsf, swp: p.sw, kmp: p.km } }; };
RC.BREAK = (p = RC.PRICE) => (p.km - p.sw) / (6 * p.thw - 2 * p.vsf);
RC.costChart = (o = {}) => {
  const p = o.p || RC.PRICE, D = o.dmax || 100, w = 620, h = 300, L = 70, R = 20, Tp = 22, B = 46, pw = w - L - R, ph = h - Tp - B;
  const ymax = Math.ceil(RC.cost(D, p).sw / 1000) * 1000, X = d => L + d / D * pw, Y = c => Tp + ph - c / ymax * ph; let s = '';
  for (let c = 0; c <= ymax; c += ymax > 8000 ? 2000 : 1000) s += LN(L, Y(c), L + pw, Y(c), { col: 'var(--line, #cfd8e3)', w: 1 }) + TX(c.toLocaleString('en-US'), L - 8, Y(c) + 4, { size: 12, anchor: 'end', col: COL.muted });
  for (let d = 0; d <= D; d += 20) s += TX(String(d), X(d), Tp + ph + 18, { size: 12, anchor: 'middle', col: COL.muted });
  s += TX(T('ระยะจากห้องควบคุมถึงมอเตอร์ (m)', 'distance from the control room to the motor (m)'), L + pw / 2, h - 6, { size: 12.5, anchor: 'middle', col: COL.muted }) +
    `<text x="14" y="${Tp + ph / 2}" font-size="12.5" fill="${COL.muted}" text-anchor="middle" transform="rotate(-90 14 ${Tp + ph / 2})">${T('บาท', 'baht')}</text>`;
  const line = (fn, col) => PL([0, D].map(d => [X(d), Y(fn(d))]), { col, w: 2.2 });
  s += line(d => RC.cost(d, p).sw, COL.cur) + line(d => RC.cost(d, p).km, COL.ctl);
  const b = RC.BREAK(p); if (b > 0 && b < D) { const cb = RC.cost(b, p).sw; s += LN(X(b), Y(cb), X(b), Tp + ph, { col: COL.muted, w: 1, dash: '3 3' }) + `<circle cx="${f1(X(b))}" cy="${f1(Y(cb))}" r="5" fill="${COL.panel}" stroke="${COL.ink}" stroke-width="2"/>` +
    TX(T(`เท่ากันที่ ${b.toFixed(0)} m`, `equal at ${b.toFixed(0)} m`), X(b) + 9, Y(cb) + 18, { size: 12.5, col: COL.ink, weight: 600 }); }
  const lab = (fn, txt, dy) => TX(txt, X(D) - 4, Y(fn(D)) + dy, { size: 12.5, anchor: 'end', col: COL.ink, weight: 600 });
  s += lab(d => RC.cost(d, p).sw, T('สวิตช์ในห้องควบคุม', 'switch in the control room'), -10) + lab(d => RC.cost(d, p).km, T('คอนแทกเตอร์', 'contactor'), -10);
  if (o.d != null) { const c = RC.cost(o.d, p); s += LN(X(o.d), Tp, X(o.d), Tp + ph, { col: COL.ink, w: 1.2 }) +
    `<circle cx="${f1(X(o.d))}" cy="${f1(Y(c.sw))}" r="5" fill="${COL.cur}" stroke="${COL.panel}" stroke-width="2"/><circle cx="${f1(X(o.d))}" cy="${f1(Y(c.km))}" r="5" fill="${COL.ctl}" stroke="${COL.panel}" stroke-width="2"/>`; }
  return `<svg class="rc rc-chart" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" font-family="'IBM Plex Sans Thai','IBM Plex Mono',sans-serif" data-l="${L}" data-pw="${pw}" data-d="${D}">${s}</svg>`;
};

/* ---------------- 4) the magnet by itself: press and hold S1 ---------------- */
RC.Magnet = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.on = false; this.spring = o.spring !== false; this.stuck = false; this.draw(); }
  set(on) { this.on = on; if (on) this.stuck = true; else if (this.spring) this.stuck = false; this.draw(); }
  setSpring(v) { this.spring = v; if (v && !this.on) this.stuck = false; this.draw(); }
  closed() { return this.on || (!this.spring && this.stuck); }
  draw() { this.el.innerHTML = RC.power({ mode: 'relay', coil: true, ctrl: true, spring: this.spring, on: this.on, stuck: !this.spring && this.stuck, amps: true, coilA: true, ctlWire: false, anim: this.o.anim }); if (this.o.onDraw) this.o.onDraw(this); }
};

global.RC = RC;
})(window);
