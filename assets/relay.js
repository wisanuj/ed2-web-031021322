/* relay.js — relay-logic simulator for IEC control circuits (chapter 2 on).
   A circuit is drawn on a grid between a top rail (L) and a bottom rail (N). Elements are vertical (contacts, coils, lamps, fuses)
   or wires; each sits in a column x (current path) from row y to y + h. The simulator finds which loads are energised, lets coils
   actuate their contacts, runs timers, detects short circuits (the control fuse blows), colours the live wires, animates the current,
   numbers the current paths and writes the contact cross-reference under every coil, as IEC drawings do.
   spec = { devices: { id: {type, ...} }, supply: 'Q1', cols, rows, els: [...], power: {...}, pathNo: x => number }
   device types: cb (breaker, on), fuse (blown), pb (push button, momentary), sel (maintained switch), sen (sensor: lim/flt/prs/tmp, on),
                 msel (multi-position selector: positions, at; its contacts carry e.pos = positions where they are closed),
                 ol (overload relay, tripped), coil (contactor or relay KM/KA), timer (mode 'on'|'off', T seconds), lamp (color),
                 fault (an earth fault that the page or a click switches on; element k 'earth' from a node to N)
   device options: label (name drawn instead of the id), noClick (not clickable in the drawing), code (lamp colour code GN/YE/WH/RD
                 drawn beside the lamp), midT (push button: seconds spent between positions on release, NO and NC both open; needs step)
   element: { k: 'NO'|'NC'|'coil'|'lamp'|'fuse'|'earth'|'w', d: device, x, y, h, t: [top, bottom terminal], op, td, pts: [[x,y],...] for wires }
   options (o): max, dx, dy, label, print, noNames, noTerms, noPaths, noXref, wireNos (potential numbers), railNos (with wireNos: the
                 numbers of the two rails too, top rail 1 and N, at the right ends of the rails), hiWire (one wire number drawn highlighted: filled box, thick accent
                 wires, a dot on each of its points; 0 or 'N' = the N rail), noPower (keep spec.power for running() but do not draw it)
   chapter 5 additions (17 Oct 2026): sim.mains / setMains(v) (supply ahead of everything, a power cut), setMid(id, v), nodesOf(n),
                 wireLabel(n), termsOf(n), earth faults, a power-only spec (els: []), and the full power drawing
                 power: { full: true, stages, motor, tap: 'after'|'before' } (L1 L2 L3 N PE, terminal numbers, the control supply drawn
                 as a tap from L1 and N after (or before) Q1, motor U1 V1 W1 + PE, clickable Q1/F2 poles) and
                 power: { phases: 1, stages, motor, start: true } (L1 N PE, two-pole Q1/KM1 in L and N, F2 with the motor current looped
                 through its three poles, motor 1~ with run winding U1–U2 and, when start, the start winding Z1–Z2 through the start
                 capacitor C and the centrifugal switch, which opens at 75 % speed while step() is called). Old specs draw as before.
   chapter 6 additions (18 Oct 2026; old specs draw and behave exactly as before):
                 power: { full: true, tap: 'after'|'before', main: { k: 'cb', d: 'Q1' } (or an array of stages), feeders: [{ stages: [{ k: 'cb',
                 d: 'Q11' }, { k: 'mainNO', d: 'KM1' }, { k: 'therm', d: 'F21' }], motor: 'M1' }, …], fw (feeder pitch, default 136 px) } draws
                 L1 L2 L3 N PE, the main stages, a busbar, one vertical branch per motor with terminal numbers, each motor with U1 V1 W1 and
                 a PE bus under the motors; the control supply is tapped from the L1 busbar (after Q1) or ahead of Q1; Q1, Q1n and F2n are
                 clickable. sim.runningM(id) = that motor runs (main stages and its own branch closed; a 'therm' stage never opens a branch:
                 only its 95–96 in the control circuit stops the motor); sim.running() = ANY motor runs (sim.running(id) = runningM(id)).
                 The cross-reference lists a feeder contactor's main contacts as "1–2, 3–4, 5–6 ▸ M2" (the motor branch they switch).
                 device options: welded (coil: all its contacts stay actuated whatever the coil does: a contactor stuck closed),
                 weldOnClose (coil: becomes welded the first time it is energised), latch (push button: a click in the drawing latches it
                 and the next click releases it; automatic for a button whose contact has op 'mush', the emergency stop)
                 element options: welded (an NO or NC contact that stays closed: a welded auxiliary contact), open (a coil or lamp with an
                 open winding or filament: it carries no current and never energises)
   chapter 7 additions (19 Oct 2026; old specs draw and behave exactly as before):
                 power: { full: true, tap, rev: { fwd: 'KM1', rev: 'KM2', swap: ['L1', 'L3'] }, stages: [{ k: 'cb', d: 'Q1' }, { k: 'rev' },
                 { k: 'therm', d: 'F2' }], motor: 'M1' } = reversing power circuit: busbar to the second contactor, KM1 straight, KM2 with
                 two phases crossed (rev.map [3, 2, 1] = the supply phase on KM2 poles 1, 2, 3, default from swap; rev.fmap for KM1, default
                 [1, 2, 3]), the outputs joined ahead of the stages after { k: 'rev' } (default position: after the leading cb stages), motor
                 arrow clockwise / counter-clockwise. Both contactors closed together join two phases: the first cb stage ahead of the pair
                 trips (dev.shortTrip, sim.msg 'pshort', sim.pshort = [['L1', 'L3']]; a click on Q1 switches it on again).
                 power: { phases: 1, rev: { fwd, rev, poles: { KM1: [['L', 'U1'], ['L', 'Z1'], ['N', 'Z2']], KM2: [['L', 'U1'], ['L', 'Z2'],
                 ['N', 'Z1']] }, fixed: [['N', 'U2']] }, stages: [Q1, F2], start: true } = single-phase reversing (defaults shown): Q1 and F2
                 ahead of the pair, 3-pole contactors switching the run winding (pole 1) and the start winding Z1–Z2 (poles 2, 3), U2 to N;
                 step() runs a signed speed model: the start winding (centrifugal switch closed below 60 % speed, open from 75 %) drives
                 towards its direction, the run winding alone keeps the motor turning the way it turns, so swapping Z1–Z2 at speed does
                 not reverse it (sim.w signed speed, sim.speed()).
                 sim.dir(m) 'cw' | 'ccw' | 0 (three-phase: from the phase order of the closed contactor, even permutation = clockwise;
                 single-phase reversing: sign of the speed, or the start-winding direction at standstill; other motors 'cw' while running)
                 spec.mech: [['KM1', 'KM2']] mechanical interlock (IEC 60617 S00154, a triangle on a dashed link under the two coils): the
                 contactor that closed first blocks the other; a blocked coil stays energised (dev.blocked, dev.blockT seconds) while its
                 contacts stay put, drawn orange with "blocked"; it closes as soon as the other one opens; together in one step the first
                 listed wins. spec.chatter: true = a coil that keeps switching itself off and on (e.g. its own NC in its own path) is
                 reported as chattering (dev.chatter, contacts at rest) instead of ending in an arbitrary state.
                 element option dop (NC/NO with op 'lim': the direct-opening mark of IEC 60947-5-1 Annex K on the link);
                 sim.setOn(id, v) sets a sel/sen/fault device (no event when nothing changes)
   drawing sheet (20 Oct 2026): option sheet (true, false or { title, no, part, of, rows, student }; default RL.SHEET_DEFAULT = true) draws
                 the drawing as a document: a sheet frame with a reference band (ISO 5457 look, like the course's A4 sheet), column zones
                 at the top and bottom, row zones A, B, C … at the left and right, and a compact title block at the bottom right
                 (ISO 7200 look). The column zones of the control circuit ARE the current-path numbers (IEC 61082-1 grid used as path
                 numbers): each numbered path gets its own zone, its number moves from under the N rail into the band, and the
                 cross-reference under a coil ("13–14 ▸ 2") now points at zone 2. The power circuit at the left is one zone labelled
                 with the word of its cross-reference ("กำลัง" / "power"); a multi-motor power circuit gets one zone per motor branch
                 labelled M1, M2 … (its feeder contactors' cross-reference reads "1–2, 3–4, 5–6 ▸ M2"). With noPaths the control zones
                 stay empty (students write the numbers). Title block: course 031021322, drawing title (sheet.title [th, en] or text;
                 default the page title from stops.js), drawing no. (sheet.no; default ED2-<step>-<section badge><part>; part = sheet.part,
                 else B1, B2 … in document order when one section holds several framed drawings), sheet (sheet.of '2/3' or [2, 3]; default 1/1); student: true adds an empty
                 "drawn by / student ID" row for handwriting. rows = number of row zones (default 3). Print mode draws everything in
                 the text colour (black on paper). The drawing itself is unchanged inside a nested <svg class="rl-in"> (same
                 coordinates as without the sheet: sim.X()/Y() still apply there); the outer svg's viewBox is the whole sheet.
                 sheet: false gives exactly the drawing of before (byte for byte). */
(function (global) {
'use strict';
const RL = {}, IE = global.IEC;
const COL = { live: '#ff6b6b', cur: '#ff4d4d', ncur: '#3fa9f5', nlive: '#3fa9f5', dead: 'currentColor' };
const CLICK = ['pb', 'sel', 'sen', 'ol', 'cb', 'fuse', 'msel', 'fault'];
RL.SHEET_DEFAULT = true;   // every RL.Sim drawing is framed as a drawing sheet unless the page passes sheet: false
const SHEETS = new Map();  // section → hosts of framed drawings in it, in document order (drawing numbers B1, B2 … when there are several)
const escT = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/* width of a text in the drawing font (IBM Plex Mono 0.6 em; Thai fallback about 0.6 em per base character, combining marks take none) */
const textW = (s, size) => { let n = 0; for (const ch of String(s)) { const c = ch.codePointAt(0); if (c === 0x0E31 || (c >= 0x0E34 && c <= 0x0E3A) || (c >= 0x0E47 && c <= 0x0E4E)) continue; n += c >= 0x0E00 && c <= 0x0E7F ? 0.62 : 0.6; } return n * size; };
/* the text cut to fit a width (an ellipsis at the end when cut) */
const fitT = (s, size, w) => { s = String(s); if (textW(s, size) <= w) return s; const a = [...s]; while (a.length && textW(a.join('') + '…', size) > w) a.pop(); return a.join('').replace(/[\s·:,–-]+$/, '') + '…'; };

/* RL.sheetFrame(o) → svg string: any drawing on a drawing sheet (used by RL.Sim with the option sheet; pages and fig_render.html may frame
   other drawings with it). o: body (svg markup of the drawing, content box W × H), W, H, title, no, of ('1/1'), student (adds an empty
   "drawn by | student ID" row), rows (row zones, default 3), print (all in the text colour), label (aria), cls (extra svg classes), max
   (px; maxScale k: at most k × the sheet width), cropT / cropR (blank content margin cut off at the top / right), zones ([{ a, b, at, lab }] column zones in content x, a/b null =
   edge of the drawing area, at = label position, default the zone middle; default: o.cols evenly spaced zones numbered 1 … n, n =
   round(W / 120)), occ ((xa, xb) => lowest drawn y between xa and xb, content coordinates; default H: the title block goes below the
   drawing). The drawing keeps its own coordinates inside <svg class="rl-in" x y> (overflow visible). */
RL.sheetFrame = o => {
  const F = v => +(+v).toFixed(1), T = MC.t, W = o.W, H = o.H, pr = !!o.print, mut = pr ? undefined : 'var(--muted)';
  const P = 3, B = 14, G = 4, cT = o.cropT || 0, cR = o.cropR || 0, dx = P + B + G, dy = P + B + G - cT, ix0 = P + B, iy0 = P + B;   // content (x, y) sits at (x + dx, y + dy)
  const title = o.title === undefined || o.title === null ? '' : String(o.title), no = o.no === undefined || o.no === null ? '' : String(o.no), of = o.of === undefined || o.of === null ? '1/1' : String(o.of);
  // title block: course · title · drawing no. | sheet (+ drawn by | student ID for handwriting)
  const pad = 4, lab = [T('วิชา', 'course'), T('ชื่อแบบ', 'title'), T('เลขที่แบบ', 'drawing no.'), T('แผ่นที่', 'sheet'), T('ผู้เขียนแบบ', 'drawn by'), T('รหัสนักศึกษา', 'student ID')];
  const course = T('031021322 เขียนแบบไฟฟ้า 2', '031021322 Electrical Drawing II'), lw = i => textW(lab[i], 7) + 4;
  const wS = Math.max(pad + lw(3) + textW(of || '0/0', 9) + pad, o.student ? pad + lw(5) + 64 : 0);
  let ix1 = dx + W - cR + G; const minW = 220; if (ix1 - ix0 < minW) ix1 = ix0 + minW;
  const need = Math.max(pad + lw(0) + textW(course, 8.5) + pad, pad + lw(1) + textW(title, 9) + pad, pad + lw(2) + textW(no, 9) + pad + wS, o.student ? pad + lw(4) + 120 + wS : 0);
  const tbW = Math.min(ix1 - ix0, Math.max(minW, need)), rh = o.student ? [15, 15, 15, 24] : [15, 15, 15], tbH = rh.reduce((a, b) => a + b, 0);
  const tx0 = ix1 - tbW, low = o.occ ? o.occ(tx0 - dx - 4, ix1 - dx) : H, iy1 = Math.max(dy + H, dy + low + 6 + tbH), ty0 = iy1 - tbH, oy1 = iy1 + B, W2 = ix1 + B + P, H2 = oy1 + P;
  // column zones
  let zones = o.zones;
  if (!zones) { const n = Math.max(1, o.cols || Math.round(W / 120)), w = (ix1 - ix0) / n; zones = Array.from({ length: n }, (_, i) => ({ a: ix0 + i * w - dx, b: ix0 + (i + 1) * w - dx, lab: String(i + 1) })); }
  let f = `<rect x="${P}" y="${P}" width="${F(W2 - 2 * P)}" height="${F(H2 - 2 * P)}" stroke-width="1.6"/><rect x="${ix0}" y="${iy0}" width="${F(ix1 - ix0)}" height="${F(iy1 - iy0)}" stroke-width="0.8"/>`;
  zones.forEach(z => { const a = z.a === null || z.a === undefined ? ix0 : z.a + dx, b = z.b === null || z.b === undefined ? ix1 : z.b + dx, at = z.at === undefined ? (a + b) / 2 : z.at + dx;
    if (a > ix0 + 1 && a < ix1 - 1) f += IE.L(a, P, a, iy0, { w: 0.8 }) + IE.L(a, iy1, a, oy1, { w: 0.8 });
    if (z.lab) { const q = { size: /^[0-9A-Z]+$/.test(z.lab) ? 9.5 : 8.5, anchor: 'middle', weight: 700 }; f += IE.T(escT(z.lab), at, P + B / 2 + 3.3, q) + IE.T(escT(z.lab), at, iy1 + B / 2 + 3.3, q); } });
  // row zones A, B, C …
  const nR = Math.max(1, Math.min(8, Math.round(o.rows) || 3)), rz = (iy1 - iy0) / nR;
  for (let j = 0; j < nR; j++) { const y = iy0 + j * rz, yc = y + rz / 2 + 3.3, L = String.fromCharCode(65 + j), q = { size: 9.5, anchor: 'middle', weight: 700 };
    if (j) f += IE.L(P, y, ix0, y, { w: 0.8 }) + IE.L(ix1, y, W2 - P, y, { w: 0.8 });
    f += IE.T(L, P + B / 2, yc, q) + IE.T(L, ix1 + B / 2, yc, q); }
  // the title block
  const ys = rh.map((h, i) => ty0 + rh.slice(0, i).reduce((a, b) => a + b, 0)), xS = ix1 - wS;
  f += `<rect x="${F(tx0)}" y="${F(ty0)}" width="${F(tbW)}" height="${tbH}" stroke-width="1.1"/>` + ys.slice(1).map(y => IE.L(tx0, y, ix1, y, { w: 0.6 })).join('') + IE.L(xS, ys[2], xS, iy1, { w: 0.6 });
  const cell = (x, y, li, val, size, w) => { const yb = y + 10.8;   // label and value on one baseline (a tall row keeps its label at the top)
    return IE.T(escT(lab[li]), x + pad, yb, { size: 7, col: mut }) + (val ? IE.T(escT(fitT(val, size, w - 2 * pad - lw(li))), x + pad + lw(li), yb, { size, weight: 700 }) : ''); };
  f += cell(tx0, ys[0], 0, course, 8.5, tbW) + cell(tx0, ys[1], 1, title, 9, tbW) + cell(tx0, ys[2], 2, no, 9, tbW - wS) + cell(xS, ys[2], 3, of, 9, wS);
  if (o.student) f += cell(tx0, ys[3], 4, '', 9, tbW - wS) + cell(xS, ys[3], 5, '', 9, wS);
  const inner = `<svg class="rl-in" x="${F(dx)}" y="${F(dy)}" width="${F(W)}" height="${F(H)}" overflow="visible">${o.body}</svg>`;
  return IE.svg(W2, H2, `<g class="rl-sheet">${f}</g>${inner}`, { cls: o.cls || 'rl-framed', label: o.label || 'drawing', max: o.maxScale ? Math.min(o.max || 1e9, Math.round(W2 * o.maxScale)) : o.max }); };

RL.Sim = class {
  constructor(el, spec, o = {}) {
    this.el = el; this.spec = spec; this.o = o; this.dev = {}; this.msg = ''; this.listeners = []; this.mains = true; this.spd = 0; this.cs = true;
    Object.entries(spec.devices).forEach(([id, d]) => { this.dev[id] = { id, ...d, on: d.on ?? (d.type === 'cb'), pressed: false, energized: false, tripped: false, blown: false, tOn: 0, hold: 0, mid: false, midLeft: 0, at: d.at ?? (d.positions ? d.positions[Math.floor(d.positions.length / 2)] : undefined) }; });
    this.DX = o.dx || 86; this.DY = o.dy || 58; this.solve(); this.render();
    el.addEventListener('pointerdown', e => this.down(e)); window.addEventListener('pointerup', () => this.up()); el.addEventListener('pointercancel', () => this.up());
    el.addEventListener('click', e => this.click(e));
  }
  on(fn) { this.listeners.push(fn); }
  emit() { this.listeners.forEach(fn => fn(this)); }
  /* ---------------- device state */
  act(id) { const d = this.dev[id]; if (!d) return false;
    switch (d.type) { case 'pb': return d.pressed; case 'sel': case 'sen': case 'cb': case 'fault': return d.on; case 'ol': return d.tripped; case 'coil': return d.welded ? true : d.energized && !d.blocked;
      case 'timer': return d.mode === 'off' ? (d.energized || d.hold > 0) : (d.energized && d.tOn >= d.T); default: return false; } }
  /* actuated state of one contact element (multi-position selectors depend on the element's own positions) */
  actE(e) { if (e.pos) return e.pos.includes(this.dev[e.d].at);
    const d = this.dev[e.d]; if (d && d.type === 'timer' && (e.k === 'NO' || e.k === 'NC') && !e.td) return d.energized;   // a plain contact of a timer is instantaneous
    return this.act(e.d); }
  /* a push button caught between its positions (break before make): its NO and NC are both open */
  midE(e) { const d = this.dev[e.d]; return !!(d && d.mid && (e.k === 'NO' || e.k === 'NC')); }
  conducts(e) { if (e.k === 'w') return true; if (e.k === 'fuse') return !this.dev[e.d].blown; if (e.k === 'cb') return this.dev[e.d].on; if (e.k === 'earth') return !!this.dev[e.d].on;
    if (e.welded && (e.k === 'NO' || e.k === 'NC')) return true;   // a welded contact stays closed
    if (this.midE(e)) return false; if (e.k === 'NO') return this.actE(e); if (e.k === 'NC') return !this.actE(e); return false; }
  isLoad(e) { return e.k === 'coil' || e.k === 'lamp'; }
  supplyOn() { if (this.mains === false) return false; const s = this.spec.supply; return !s || (this.dev[s] && this.dev[s].on && !this.dev[s].blown); }
  /* ---------------- solving */
  nodeKey(x, y) { return y <= 0 ? 'L' : y >= this.spec.rows ? 'N' : `${x},${y}`; }
  /* graph edges; a wire segment is split at every grid point where another element or wire ends on it (T-junctions) */
  edges() { const S = this.spec, pts = [];
    S.els.forEach(e => { if (e.k === 'w' && e.pts) e.pts.forEach(p => pts.push(p)); else { pts.push([e.x, e.y]); pts.push([e.x, e.y + (e.h || 1)]); } });
    const out = [];
    S.els.forEach((e, i) => {
      const segs = e.k === 'w' ? (e.pts ? e.pts.slice(1).map((p, j) => [e.pts[j], p]) : [[[e.x, e.y], [e.x, e.y + (e.h || 1)]]]) : null;
      if (!segs) { out.push({ i, e, a: this.nodeKey(e.x, e.y), b: this.nodeKey(e.x, e.y + (e.h || 1)) }); return; }
      segs.forEach(([p, q]) => { const on = pts.filter(r => (r[0] !== p[0] || r[1] !== p[1]) && (r[0] !== q[0] || r[1] !== q[1]) &&
          ((p[1] === q[1] && r[1] === p[1] && r[0] > Math.min(p[0], q[0]) && r[0] < Math.max(p[0], q[0])) || (p[0] === q[0] && r[0] === p[0] && r[1] > Math.min(p[1], q[1]) && r[1] < Math.max(p[1], q[1]))));
        const chain = [p, ...on.sort((u, v) => (Math.abs(u[0] - p[0]) + Math.abs(u[1] - p[1])) - (Math.abs(v[0] - p[0]) + Math.abs(v[1] - p[1]))), q];
        for (let j = 1; j < chain.length; j++) { const a = this.nodeKey(...chain[j - 1]), b = this.nodeKey(...chain[j]); out.push({ i, e, a, b, pa: chain[j - 1], pb: chain[j] }); } }); });
    return out; }
  solveOnce() {
    const E = this.edges(), on = this.supplyOn(), adj = new Map(), add = (u, v, ed) => { if (!adj.has(u)) adj.set(u, []); adj.get(u).push([v, ed]); };
    E.forEach(ed => { ed.load = this.isLoad(ed.e) && !ed.e.open; ed.cond = !ed.load && !ed.e.open && this.conducts(ed.e); if (ed.cond) { add(ed.a, ed.b, ed); add(ed.b, ed.a, ed); } });
    const bfs = s => { const seen = new Set([s]), q = [s]; while (q.length) { const u = q.shift(); (adj.get(u) || []).forEach(([v]) => { if (!seen.has(v)) { seen.add(v); q.push(v); } }); } return seen; };
    const rL = on ? bfs('L') : new Set(), rN = bfs('N'), short = on && rL.has('N');
    const loads = E.filter(ed => ed.load).map(ed => ({ ed, live: !short && ((rL.has(ed.a) && rN.has(ed.b)) || (rL.has(ed.b) && rN.has(ed.a))) }));
    return { E, rL, rN, short, loads };
  }
  solve() {
    const osc = this.spec.chatter ? {} : null; if (osc) Object.values(this.dev).forEach(d => { if (d.chatter) d.chatter = false; });   // chapter 7: count how often each load switches
    let r; for (let it = 0; it < 30; it++) { r = this.solveOnce();
      if (r.short) { const fu = Object.values(this.dev).find(d => d.type === 'fuse' && !d.blown); if (fu) fu.blown = true; else if (this.spec.supply) this.dev[this.spec.supply].on = false;
        this.msg = 'short'; continue; }
      let changed = false; const en = {};
      r.loads.forEach(({ ed, live }) => { const d = this.dev[ed.e.d]; if (d) en[d.id] = (en[d.id] || false) || live; });
      r.E.forEach(ed => { if (ed.e.open && this.isLoad(ed.e)) { const d = this.dev[ed.e.d]; if (d && !(d.id in en)) en[d.id] = false; } });   // an open coil never energises
      Object.entries(en).forEach(([id, v]) => { const d = this.dev[id]; if (d.type === 'timer' && v) d.hold = d.T;   // an off-delay holds even if no step() ran while energised
        if (v && d.weldOnClose && !d.welded) { d.welded = true; changed = true; }
        if (d.energized !== v) { d.energized = v; changed = true; if (osc) osc[id] = (osc[id] || 0) + 1; if (!v && d.type === 'timer') d.tOn = 0; } });
      if (this.spec.mech && this.mechStep()) changed = true;
      if (osc && changed) { const ch = Object.keys(osc).filter(id => osc[id] > 6);   // no stable state: the coil chatters, its contacts are shown at rest
        if (ch.length) { ch.forEach(id => { const d = this.dev[id]; d.chatter = true; d.energized = false; d.blocked = false; }); r = this.solveOnce(); break; } }
      if (!changed) { if (this.spec.power && this.spec.power.rev && this.powerShort()) continue; break; } }
    this.r = r; this.current(); }
  /* chapter 7: mechanical interlock (spec.mech pairs). A coil that wants to close while its partner is closed is blocked (energised,
     contacts at rest); it closes as soon as the partner opens. Returns true when a blocked state changed. */
  mechStep() { let ch = false;
    this.spec.mech.forEach(([a, b]) => { const A = this.dev[a], B = this.dev[b]; if (!A || !B) return;
      [A, B].forEach(d => { if (!d.energized && d.blocked) { d.blocked = false; ch = true; } });
      const inA = !!A.welded || (A.energized && !A.blocked), inB = !!B.welded || (B.energized && !B.blocked);
      if (inA && inB) { const lose = A.welded ? B : B.welded ? A : (B.wasIn && !A.wasIn) ? A : B;   // the one already closed wins; together: the first listed
        if (!lose.welded) { lose.blocked = true; ch = true; } }
      else [[A, inB], [B, inA]].forEach(([d, other]) => { if (d.blocked && !other) { d.blocked = false; ch = true; } });
      A.wasIn = this.act(a); B.wasIn = this.act(b); });
    return ch; }
  /* chapter 7: the reversing pair of the power circuit, normalised: { one, fwd, rev, pre, post, fmap, map } (three-phase) or
     { one, fwd, rev, pre, post, poles: { KM1: [[src, terminal]…], KM2: […] }, fixed } (single-phase); null without power.rev */
  revInfo() { const P = this.spec.power, v = P && P.rev; if (!v) return null;
    const st = P.stages || [], ri = st.findIndex(t => t.k === 'rev'), one = P.phases === 1, fwd = v.fwd || 'KM1', rv = v.rev || 'KM2';
    let at = ri; if (at < 0) { at = 0; if (one) at = st.length; else while (at < st.length && st[at].k === 'cb') at++; }
    const r = { one, fwd, rev: rv, pre: st.slice(0, at), post: st.slice(ri >= 0 ? at + 1 : at) };
    if (!one) { const ph = ['L1', 'L2', 'L3'], sw = v.swap || ['L1', 'L3'];
      r.fmap = v.fmap || [1, 2, 3]; r.map = v.map || [1, 2, 3].map(p => (ph[p - 1] === sw[0] ? ph.indexOf(sw[1]) + 1 : ph[p - 1] === sw[1] ? ph.indexOf(sw[0]) + 1 : p)); }
    else { const D = { [fwd]: [['L', 'U1'], ['L', 'Z1'], ['N', 'Z2']], [rv]: [['L', 'U1'], ['L', 'Z2'], ['N', 'Z1']] };
      r.poles = { [fwd]: (v.poles && v.poles[fwd]) || D[fwd], [rv]: (v.poles && v.poles[rv]) || D[rv] }; r.fixed = v.fixed || [['N', 'U2']]; }
    return r; }
  /* the supply ahead of the reversing pair is on: mains and every cb stage ahead of it closed */
  revSupply(R = this.revInfo()) { return this.mains !== false && R.pre.every(t => t.k !== 'cb' || !!this.dev[t.d].on); }
  /* conductors joined by the closed contactors of the pair: [['L1', 'L3'], …] or [['L', 'N']] (single-phase); null when nothing is shorted */
  pShortPairs() { const R = this.revInfo(); if (!R || !this.revSupply(R)) return null; const f = this.act(R.fwd), b = this.act(R.rev); if (!f || !b) return null;
    const out = [], add = (x, y) => { const k = [x, y].sort().join('–'); if (x !== y && !out.some(p => p.join('–') === k)) out.push([x, y].sort()); };
    if (!R.one) R.map.forEach((p, k) => add(`L${R.fmap[k]}`, `L${p}`));
    else { const src = {}; [...R.poles[R.fwd], ...R.poles[R.rev], ...R.fixed].forEach(([a, t]) => { (src[t] = src[t] || new Set()).add(a); });
      Object.values(src).forEach(set => { if (set.has('L') && set.has('N')) add('L', 'N'); }); }
    return out.length ? out : null; }
  /* both contactors closed: the first cb stage ahead of the pair trips (as CADe SIMU stops with a short-circuit warning) */
  powerShort() { const pr = this.pShortPairs(); if (!pr) return false; this.msg = 'pshort'; this.pshort = pr;
    const q = this.revInfo().pre.find(t => t.k === 'cb'); if (!q) return false; const d = this.dev[q.d]; d.on = false; d.shortTrip = true; return true; }
  /* direction of rotation, see the header; m = motor id (only for multi-motor drawings) */
  dir(m) { const P = this.spec.power; if (!P || !this.running(m)) return 0; const R = this.revInfo(); if (!R) return 'cw';
    if (R.one) { const w = this.w || 0; return w > 0.02 ? 'cw' : w < -0.02 ? 'ccw' : this.drive1() < 0 ? 'ccw' : 'cw'; }
    const par = mp => { let n = 0; mp.forEach((a, i) => mp.slice(i + 1).forEach(b => { if (a > b) n++; })); return n % 2 ? 'ccw' : 'cw'; };
    return this.act(R.fwd) ? par(R.fmap) : par(R.map); }
  /* single-phase reversing: +1 / −1 = the direction the connected start winding drives (run polarity × start polarity), 0 = none */
  drive1() { const R = this.revInfo(); if (!R || !R.one) return 0; const src = {};
    [...(this.act(R.fwd) ? R.poles[R.fwd] : []), ...(this.act(R.rev) ? R.poles[R.rev] : []), ...R.fixed].forEach(([a, t]) => { src[t] = a; });
    const pol = (x, y) => (src[x] === 'L' && src[y] === 'N' ? 1 : src[x] === 'N' && src[y] === 'L' ? -1 : 0);
    return pol('U1', 'U2') * pol('Z1', 'Z2'); }
  /* signed speed in per unit: single-phase reversing from its model, otherwise ±1 / 0 from dir() */
  speed() { const R = this.revInfo(); if (R && R.one) return this.w || 0; const d = this.dir(); return d === 'cw' ? 1 : d === 'ccw' ? -1 : 0; }
  /* set a maintained switch, sensor or earth fault to v (used by C7.Carriage for the limit switches) */
  setOn(id, v) { const d = this.dev[id]; if (!d || !['sel', 'sen', 'fault'].includes(d.type) || !!d.on === !!v) return; d.on = !!v; this.update(); }
  /* edges that carry current: inside the live (or neutral) side, prune dead-end branches that lead to no energised load */
  current() { const r = this.r, cur = new Set();
    const side = (reach, root, term) => { const ed = r.E.filter(e => e.cond && reach.has(e.a) && reach.has(e.b)), sinks = new Set();
      r.loads.forEach(({ ed: l, live }) => { if (live) sinks.add(term(l)); });
      if (!sinks.size) return; let act = ed.slice(), more = true;
      while (more) { more = false; const deg = new Map(); act.forEach(e => { deg.set(e.a, (deg.get(e.a) || 0) + 1); deg.set(e.b, (deg.get(e.b) || 0) + 1); });
        const keep = act.filter(e => !([e.a, e.b].some(n => n !== root && !sinks.has(n) && deg.get(n) === 1))); if (keep.length !== act.length) { act = keep; more = true; } }
      act.forEach(e => cur.add(e)); };
    side(r.rL, 'L', l => (r.rL.has(l.a) ? l.a : l.b)); side(r.rN, 'N', l => (r.rN.has(l.a) ? l.a : l.b));
    this.cur = cur; }
  /* ---------------- time: timers, push buttons between positions, the single-phase motor's centrifugal switch */
  step(dt) { let ch = false; Object.values(this.dev).forEach(d => {
      if (d.type === 'pb' && d.mid && d.midLeft > 0) { d.midLeft -= dt; if (d.midLeft <= 0) { d.mid = false; d.midLeft = 0; ch = true; } }
      if (d.type !== 'timer') return; const before = this.act(d.id);
      if (d.energized) { d.tOn += dt; d.hold = d.T; } else { d.tOn = 0; d.hold = Math.max(0, d.hold - dt); } if (this.act(d.id) !== before) ch = true; });
    const P = this.spec.power;
    if (P && P.phases === 1 && P.start && dt > 0 && P.rev) { if (this.step1(dt) && !ch) { this.render(); this.emit(); } }
    else if (P && P.phases === 1 && P.start && dt > 0) { const run = this.running(), cs = this.cs;   // speed in per unit: about 1 s to 75 %, coasting 2.5 s
      this.spd = run ? this.spd + (1 - this.spd) * Math.min(1, dt / 0.75) : Math.max(0, this.spd - dt / 2.5);
      if (cs && this.spd >= 0.75) this.cs = false; else if (!cs && this.spd < 0.6) this.cs = true;   // opens at 75 % speed, re-closes when it runs down
      if (this.cs !== cs && !ch) { this.render(); this.emit(); } }
    if (this.spec.mech) Object.values(this.dev).forEach(d => { if (d.blocked) d.blockT = (d.blockT || 0) + dt; else if (d.blockT) d.blockT = 0; });   // how long a coil has been held open
    if (ch) { this.solve(); this.render(); this.emit(); } }
  /* chapter 7, single-phase reversing: signed speed w (per unit, + = clockwise). Powered with the centrifugal switch closed, the start
     winding drives w towards its own direction (through zero if it points the other way: about 1 s to 75 %); with the switch open the
     run winding alone keeps the motor turning the way it already turns; unpowered it coasts down in 2.5 s. Returns true when the
     switch, the sense of rotation or the speed shown (5 % steps) changed (the drawing must be redrawn). */
  step1(dt) { const on = this.running(), dv = on ? this.drive1() : 0, cs = this.cs, w0 = this.w || 0, k = Math.min(1, dt / 0.75); let w = w0;
    if (on && cs && dv) w += (dv - w) * k;
    else if (on && Math.abs(w) > 0.05) w += ((w > 0 ? 1 : -1) - w) * k;   // run winding alone: it keeps the direction it turns (at standstill it only hums)
    else if (!on) w = (w > 0 ? 1 : -1) * Math.max(0, Math.abs(w) - dt / 2.5);
    this.w = w; this.spd = Math.abs(w);
    if (cs && this.spd >= 0.75) this.cs = false; else if (!cs && this.spd < 0.6) this.cs = true;
    const sg = v => (v > 0.02 ? 1 : v < -0.02 ? -1 : 0), q = v => Math.round(Math.abs(v) * 20);   // q: the speed shown in 5 % steps
    return this.cs !== cs || sg(w) !== sg(w0) || q(w) !== q(w0); }
  /* ---------------- interaction */
  devAt(e) { const g = e.target.closest('[data-dev]'); return g ? g.dataset.dev : null; }
  press(id, v) { const d = this.dev[id]; if (!d || d.type !== 'pb') return;
    if (v) { if (d.pressed && !d.mid) return; d.pressed = true; d.mid = false; d.midLeft = 0; }
    else { if (!d.pressed) return; d.pressed = false; if (d.midT > 0) { d.mid = true; d.midLeft = d.midT; } }   // a slow release passes through the middle
    this.update(); }
  /* hold a push button between its positions (v true) or let it go to the position `pressed` says (v false) */
  setMid(id, v) { const d = this.dev[id]; if (!d || d.type !== 'pb' || !!d.mid === !!v) return; d.mid = !!v; d.midLeft = 0; this.update(); }
  /* the supply ahead of everything (a power cut leaves Q1 closed); v false = power fails, true = power back */
  setMains(v) { v = !!v; if (this.mains === v) return; this.mains = v; this.update(); }
  toggle(id) { const d = this.dev[id]; if (!d) return;
    if (d.type === 'sel' || d.type === 'sen' || d.type === 'cb' || d.type === 'fault') d.on = !d.on; else if (d.type === 'ol') d.tripped = !d.tripped; else if (d.type === 'fuse') d.blown = false;
    else if (d.type === 'msel') { const k = d.positions.indexOf(d.at); d.at = d.positions[(k + 1) % d.positions.length]; } else return;
    if (d.type === 'cb' && d.on) { this.msg = ''; if (d.shortTrip) d.shortTrip = false; } if (d.type === 'fuse') this.msg = ''; this.update(); }
  update() { this.solve(); this.render(); this.emit(); }
  setPos(id, at) { const d = this.dev[id]; if (d && d.type === 'msel' && d.positions.includes(at)) { d.at = at; this.update(); } }
  /* a latching push button (the emergency stop): a click latches it, the next click releases it */
  latching(id) { const d = this.dev[id]; return !!d && d.type === 'pb' && (d.latch !== undefined ? !!d.latch : this.spec.els.some(e => e.d === id && e.op === 'mush')); }
  down(e) { const id = this.devAt(e); if (id && this.dev[id].type === 'pb') { e.preventDefault(); if (this.latching(id)) { this.press(id, !this.dev[id].pressed); return; } this.press(id, true); this.held = id; } }
  up() { if (this.held) { const id = this.held; this.held = null; this.press(id, false); } }
  click(e) { const id = this.devAt(e); if (id && this.dev[id].type !== 'pb') this.toggle(id); }
  /* motor running: one motor (power.stages), or with power.feeders any motor (running()) or motor m (running(m) = runningM(m)) */
  running(m) { const p = this.spec.power; if (!p || this.mains === false) return false;
    if (p.feeders) return m ? this.runningM(m) : p.feeders.some(f => this.runningM(f.motor));
    if (p.rev) { const R = this.revInfo(); if (!this.act(R.fwd) && !this.act(R.rev)) return false; }   // chapter 7: one of the pair closed
    return p.stages.every(s => (s.k === 'cb' ? this.dev[s.d].on : s.k === 'mainNO' ? this.act(s.d) : true)); }
  /* one motor of a multi-motor power circuit: the main stages and the motor's own branch closed (a 'therm' stage does not open it) */
  runningM(m) { const p = this.spec.power; if (!p || this.mains === false) return false;
    if (!p.feeders) return (!m || m === (p.motor || 'M1')) && this.running();
    const f = p.feeders.find(q => q.motor === m); if (!f) return false;
    return [...this.mainSt(), ...f.stages].every(s => this.stOn(s)); }
  stOn(s) { return s.k === 'cb' ? !!this.dev[s.d].on : s.k === 'mainNO' ? this.act(s.d) : true; }
  /* stages of the power circuit: the main stages (power.main, or power.stages of a one-motor circuit) and, with feeders, every branch's */
  mainSt() { const P = this.spec.power; return !P ? [] : P.main ? [].concat(P.main) : (P.stages || []); }
  pStages() { const P = this.spec.power; return !P ? [] : P.feeders ? [...this.mainSt(), ...P.feeders.flatMap(f => f.stages)] : P.stages; }
  /* width taken by a multi-motor power drawing (the control rails start here) */
  feedW() { const P = this.spec.power; return Math.max(172, 132 + (P.feeders.length - 1) * (P.fw || 136)); }
  /* ---------------- drawing */
  X(x) { return this.ox + x * this.DX; }
  Y(y) { return this.oy + y * this.DY; }
  pathNo(x) { return this.spec.pathNo ? this.spec.pathNo(x) : x + 1; }
  full() { const P = this.spec.power; return !!P && !this.o.noPower && (P.full || P.phases === 1 || !!P.feeders); }
  hiNo() { const h = this.o.hiWire; return h === undefined || h === null || h === '' ? null : h === 'N' ? 0 : +h; }
  render() {
    const S = this.spec, ctl = S.els.length > 0, xs = ctl ? S.els.flatMap(e => (e.pts ? e.pts.map(p => p[0]) : [e.x])) : [0], x0 = Math.min(...xs), x1 = Math.max(...xs), full = this.full();
    const pw = S.power && !this.o.noPower ? (full ? (S.power.feeders ? this.feedW() : S.power.rev ? this.revW() : 172) : 170) : 0; this.ox = pw + 70 - x0 * this.DX; this.oy = 34;
    const rx = this.X(x0) - (full ? 70 : 30); this.railX0 = rx;   // full power drawing: the rails start further left, where the control supply comes in
    const W = ctl ? this.X(x1) + 90 : S.power && S.power.feeders && !this.o.noPower ? this.feedW() - 20 : S.power && S.power.rev && full ? this.revW() + 2 : (S.power && S.power.phases === 1 ? 144 : 140) + 34, xrefH = 16 + 12 * Math.max(2, ...Object.values(this.dev).filter(d => d.type === 'coil' || d.type === 'timer').map(d => this.xref(d.id).length + 1));
    const sh = this.sheetOpt();   // the drawing sheet: path numbers go into the reference band, the cross-reference moves up into their place
    let H = ctl ? this.Y(S.rows) + 22 + xrefH - (sh ? 14 : 0) : 0; let s = '';
    const on = this.supplyOn() && !this.o.print, anyCur = this.cur.size > 0 && !this.o.print, hi = this.hiNo(), nos = this.o.wireNos || hi !== null ? this.wireNumbers() : null;
    const hiL = hi !== null && nos.get('L') === hi, hiN = hi === 0;
    // rails
    const railL = anyCur ? COL.cur : on ? COL.live : COL.dead, railN = anyCur ? COL.ncur : COL.dead;
    this.railCol = [railL, railN, anyCur];
    if (ctl) { const lab = !full;
      s += `<g stroke="${hiL ? 'var(--accent)' : railL}"${anyCur ? ' class="rl-cur"' : ''}>${IE.L(rx, this.Y(0), this.X(x1) + 30, this.Y(0), { w: hiL ? 3.4 : 2 })}</g>` + (lab ? IE.T(S.railTop || 'L1', this.X(x0) - 36, this.Y(0) + 4, { anchor: 'end', size: 12, weight: 700 }) : IE.T(S.railTop || 'L1', rx + 6, this.Y(0) - 5, { size: 10, weight: 700 }));
      s += `<g stroke="${hiN ? 'var(--accent)' : railN}"${anyCur ? ' class="rl-cur"' : ''}>${IE.L(rx, this.Y(S.rows), this.X(x1) + 30, this.Y(S.rows), { w: hiN ? 3.4 : 2 })}</g>` + (lab ? IE.T(S.railBot || 'N', this.X(x0) - 36, this.Y(S.rows) + 4, { anchor: 'end', size: 12, weight: 700 }) : IE.T(S.railBot || 'N', rx + 6, this.Y(S.rows) + 14, { size: 10, weight: 700 })); }
    // elements
    this.edges(); const curIdx = new Set([...this.cur].map(e => e.i)), liveIdx = new Set(this.r.E.filter(e => e.cond && this.r.rL.has(e.a) && this.r.rL.has(e.b)).map(e => e.i));
    const nIdx = new Set([...this.cur].filter(e => this.r.rN.has(e.a) && this.r.rN.has(e.b)).map(e => e.i));
    S.els.forEach((e, i) => {
      const col = this.o.print ? null : curIdx.has(i) ? (nIdx.has(i) ? COL.ncur : COL.cur) : liveIdx.has(i) ? COL.live : null, cls = curIdx.has(i) && !this.o.print ? ' class="rl-cur"' : '';
      if (e.k === 'w') { const p = e.pts || [[e.x, e.y], [e.x, e.y + (e.h || 1)]];
        this.r.E.filter(ed => ed.i === i).forEach(ed => { const c = this.o.print ? null : this.cur.has(ed) ? (this.r.rN.has(ed.a) && this.r.rN.has(ed.b) ? COL.ncur : COL.cur) : ed.cond && this.r.rL.has(ed.a) && this.r.rL.has(ed.b) ? COL.live : null;
          const hw = hi !== null && nos.get(ed.a) === hi;   // the highlighted wire number: thick accent line
          s += `<g${hw ? ' stroke="var(--accent)"' : c ? ` stroke="${c}"` : ''}${this.cur.has(ed) ? ' class="rl-cur"' : ''}>${IE.L(this.X(ed.pa[0]), this.Y(ed.pa[1]), this.X(ed.pb[0]), this.Y(ed.pb[1]), hw ? { w: 3.4 } : {})}</g>`; });
        p.forEach((q, j) => { if (e.dots && e.dots.includes(j)) s += `<circle cx="${this.X(q[0])}" cy="${this.Y(q[1])}" r="2.8" fill="${col || 'currentColor'}" stroke="none"/>`; }); return; }
      const x = this.X(e.x), y0 = this.Y(e.y), y1 = this.Y(e.y + (e.h || 1)), d = this.dev[e.d] || {}, live = d.energized;
      const act = e.welded && (e.k === 'NO' || e.k === 'NC') ? e.k === 'NO' : this.midE(e) ? e.k === 'NC' : (e.k === 'NO' || e.k === 'NC') ? this.actE(e) : this.act(e.d);   // between positions: NO drawn open, NC drawn open; welded: drawn closed
      const warn = e.k === 'coil' && (d.blocked || d.chatter) && !this.o.print;   // chapter 7: a coil held open by the mechanical interlock, or chattering
      let body = IE.draw(e.k, x, y0, y1, warn ? { live: true, fill: '#ff8c42' } : { act, op: e.op, td: e.td || (d.type === 'timer' && e.k === 'coil' ? d.mode : undefined), live, lamp: d.color, blown: d.blown });
      if (e.dop && (e.k === 'NO' || e.k === 'NC')) { const ym = (y0 + y1) / 2, xm = x - 17.5;   // direct (positive) opening: an arrow in a circle on the link
        body += `<circle cx="${xm}" cy="${ym}" r="4.8" fill="var(--panel)"/><path d="M ${xm - 3} ${ym} L ${xm + 2.6} ${ym} M ${xm + 0.4} ${ym - 2.2} L ${xm + 2.6} ${ym} L ${xm + 0.4} ${ym + 2.2}" fill="none"/>`; }
      if (warn) body += IE.T(d.blocked ? MC.t('ถูกล็อก', 'blocked') : MC.t('สั่นรัว', 'chatters'), x + 15, (y0 + y1) / 2 + 3, { size: 8.5, weight: 700, col: 'var(--bad)' });
      const hit = CLICK.includes(d.type) && !d.noClick ? ` data-dev="${e.d}" style="cursor:pointer"` : '';
      s += `<g${col ? ` stroke="${col}"` : ''}${cls}${hit}>${hit ? `<rect x="${x - 40}" y="${y0 + 6}" width="56" height="${y1 - y0 - 12}" fill="transparent" stroke="none"/>` : ''}${body}</g>`;
      if (e.k === 'earth') { s += IE.T(d.label || MC.t('ลัดลงดิน', 'earth fault'), x + 10, (y0 + y1) / 2 - 12, { size: 9, weight: 700, col: d.on && !this.o.print ? 'var(--bad)' : 'var(--muted)' }) +
          (this.o.print ? '' : IE.T(d.on ? MC.t('(มีอยู่)', '(present)') : MC.t('(แตะเพื่อจำลอง)', '(tap to make it)'), x + 10, (y0 + y1) / 2, { size: 8, col: 'var(--muted)' })); return; }
      const nameX = e.op ? x - 36 : (e.k === 'NO' || e.k === 'NC') && e.td ? x - 34 : e.k === 'coil' && e.td !== undefined ? x - 30 : (e.k === 'coil' && d.type === 'timer') ? x - 30 : x - 16;
      if (!this.o.noNames) s += IE.T(d.label || e.d, nameX, (y0 + y1) / 2 + 4, { anchor: 'end', size: 11, weight: 700 });
      else s += `<rect x="${nameX - 34}" y="${(y0 + y1) / 2 - 9}" width="34" height="15" fill="none" stroke="var(--muted)" stroke-dasharray="2 2"/>`;
      if (e.t && !this.o.noTerms) { s += IE.T(e.t[0], x + 5, y0 + 12, { size: 9 }) + IE.T(e.t[1], x + 5, y1 - 4, { size: 9 }); }
      if (e.k === 'lamp' && d.code) s += IE.T(d.code, x + 18, (y0 + y1) / 2 + 4, { size: 9, weight: 700, col: 'var(--muted)' });
      if (e.pos) s += IE.T(e.pos.join(' '), x + 12, (y0 + y1) / 2 + 4, { size: 10, weight: 700, col: 'var(--accent)' }); });
    if (ctl && (this.o.wireNos || hi !== null)) s += this.renderWireNos(nos, hi);
    if (ctl && S.mech) s += this.renderMech();
    // current-path numbers and the cross-reference under each coil
    const cols = [...new Set(S.els.filter(e => e.k !== 'w').map(e => e.x))].sort((a, b) => a - b), yN = this.Y(S.rows);
    if (ctl && !this.o.noPaths && !sh) cols.forEach(x => { s += IE.T(String(this.pathNo(x)), this.X(x), yN + 16, { size: 11, anchor: 'middle', weight: 700, col: 'var(--muted)' }); });
    if (ctl && !this.o.noXref) S.els.filter(e => e.k === 'coil').forEach(e => { const list = this.xref(e.d); let yy = yN + (sh ? 18 : 32);
      list.forEach(l => { s += IE.T(l, this.X(e.x), yy, { size: 9, anchor: 'middle', col: 'var(--muted)' }); yy += 12; }); });
    if (S.power && !this.o.noPower) { if (full) { const pf = this.renderPowerFull(hiL, hiN); s += pf.s; H = Math.max(H, pf.bottom + 18); this.pBot = pf.bottom; } else s += this.renderPower(); }
    const sv = sh ? this.sheetSVG(s, W, H, sh, { cols, pw, full }) : IE.svg(W, H, s, { cls: 'rl', label: this.o.label || 'control circuit', max: ctl ? this.o.max : Math.min(this.o.max || 1e9, Math.round(W * 1.5)) });   // a power-only drawing is not blown up
    this.el.innerHTML = sv + (this.msg === 'short' ? `<div class="badbox rl-msg">${MC.t('ลัดวงจร! ฟิวส์วงจรควบคุมขาด (หรือเบรกเกอร์ตัด) คลิกที่ฟิวส์เพื่อเปลี่ยนฟิวส์', 'Short circuit! The control fuse has blown (or the breaker tripped). Click the fuse to replace it.')}</div>` : this.msg === 'pshort' ? this.pshortMsg() : '');
  }
  /* ---------------- drawing sheet (option sheet, 20 Oct 2026) ---------------- */
  sheetOpt() { const v = this.o.sheet === undefined ? RL.SHEET_DEFAULT : this.o.sheet; return !v ? null : v === true ? {} : v; }
  /* title, drawing number and sheet of the title block; defaults from the page (stops.js title and step, the badge of the section) */
  sheetInfo(sh) {
    const tt = p => (Array.isArray(p) ? MC.t(p[0], p[1]) : p === undefined || p === null ? '' : String(p)), el = this.el;
    const here = typeof MC.here === 'function' ? MC.here() : null, sec = el && el.isConnected && el.closest ? el.closest('section.prob') : null, badge = sec && sec.querySelector('.prob-no');
    let k = 0;
    if (sec && sh.no === undefined && sh.part === undefined) {   // several framed drawings in one section: B1, B2 … in document order (the others are redrawn once)
      const a = (SHEETS.get(sec) || []).filter(h => h.isConnected && h.closest('section.prob') === sec), fresh = !a.includes(el);
      if (fresh) { a.push(el); a.sort((p, q) => (p.compareDocumentPosition(q) & 4 ? -1 : 1)); }
      SHEETS.set(sec, a); el.rlSheetSim = this;
      if (fresh && a.length > 1) setTimeout(() => a.forEach(h => { if (h !== el && h.isConnected && h.rlSheetSim) h.rlSheetSim.render(); }), 0);
      k = a.length > 1 ? a.indexOf(el) + 1 : 0; }
    let title = sh.title !== undefined ? tt(sh.title) : here ? MC.t(here.title, here.en) : '';
    if (sh.title === undefined && !here && typeof document !== 'undefined' && document.querySelector) {
      const h = document.querySelector(`h1[data-l="${MC.lang || 'th'}"]`) || document.querySelector('h1');
      if (h) { const c = h.cloneNode(true); c.querySelectorAll('.en').forEach(x => x.remove()); title = c.textContent.replace(/\s+/g, ' ').trim(); } }
    const part = sh.part !== undefined ? String(sh.part) : k ? String(k) : '';   // part: the drawing's own index inside its section (e.g. the case number)
    const no = sh.no !== undefined ? tt(sh.no) : ['ED2', here && here.step, (badge ? badge.textContent.trim() : '') + part].filter(Boolean).join('-');
    const of = sh.of !== undefined && sh.of !== null ? (Array.isArray(sh.of) ? sh.of.join('/') : String(sh.of)) : '1/1';
    return { title, no, of }; }
  /* right end of the control circuit drawing (content x) with every text that may appear there in any state (so the sheet keeps its width) */
  rightExt() { const S = this.spec, xs = S.els.flatMap(e => (e.pts ? e.pts.map(p => p[0]) : [e.x])), xm = this.X(Math.max(...xs)), mech = new Set((S.mech || []).flat());
    let r = xm + (this.o.wireNos && this.o.railNos ? 54 : 30);
    S.els.forEach(e => { if (e.k === 'w') return; const x = this.X(e.x), d = this.dev[e.d] || {};
      if (e.t) r = Math.max(r, x + 5 + Math.max(textW(e.t[0], 9), textW(e.t[1], 9)));
      if (e.k === 'lamp' && d.code) r = Math.max(r, x + 18 + textW(d.code, 9));
      if (e.pos) r = Math.max(r, x + 12 + textW(e.pos.join(' '), 10));
      if (e.k === 'earth') r = Math.max(r, x + 10 + Math.max(textW(d.label || MC.t('ลัดลงดิน', 'earth fault'), 9), textW(MC.t('(แตะเพื่อจำลอง)', '(tap to make it)'), 8)));
      if (e.k === 'coil' && (mech.has(e.d) || S.chatter)) r = Math.max(r, x + 15 + textW(MC.t('ถูกล็อก', 'blocked'), 8.5), x + 15 + textW(MC.t('สั่นรัว', 'chatters'), 8.5));
      if (e.k === 'coil') { const l = this.xref(e.d); if (l.length) r = Math.max(r, x + Math.max(...l.map(q => textW(q, 9))) / 2); } });
    return r; }
  /* the drawing s (content box W × H) on a sheet: frame, reference band (column zones top and bottom = current paths, power zone(s),
     row zones A, B, C … left and right) and the title block at the bottom right, placed under the lowest drawing in its width */
  sheetSVG(s, W, H, sh, g) {
    const S = this.spec, ctl = S.els.length > 0, yN = this.Y(S.rows), hasP = !!S.power && !this.o.noPower, inf = this.sheetInfo(sh);
    // the lowest drawing between xa and xb (content coordinates): N rail, cross-reference lists (kept free even while hidden), power circuit
    const occ = (xa, xb) => { let ob = 0;
      if (ctl) { const xm = Math.max(...S.els.flatMap(e => (e.pts ? e.pts.map(p => p[0]) : [e.x]))), xr = this.X(xm) + (this.o.wireNos && this.o.railNos ? 54 : 30);
        if (xr >= xa && this.railX0 <= xb) ob = Math.max(ob, yN + 6);
        S.els.filter(e => e.k === 'coil').forEach(e => { const l = this.xref(e.d); if (!l.length) return; const hw = Math.max(...l.map(q => textW(q, 9))) / 2 + 2, xc = this.X(e.x);
          if (xc + hw >= xa && xc - hw <= xb) ob = Math.max(ob, yN + 18 + 12 * (l.length - 1) + 4); }); }
      if (hasP && g.pw >= xa) ob = Math.max(ob, g.full && this.pBot ? this.pBot : yN + 12);
      return ob; };
    // column zones: the power circuit (one zone, or one per motor branch), then one zone per numbered current path (null = edge of the drawing area)
    const cols = ctl ? g.cols : [], zones = [], cb0 = hasP ? (cols.length ? Math.max(g.pw + 6, this.X(cols[0]) - 60) : g.pw + 6) : null;
    if (hasP) { const pb = ctl ? cb0 : null, FD = S.power.feeders;
      if (FD) { const FW = S.power.fw || 136; FD.forEach((f, i) => { const c = 66 + i * FW; zones.push({ a: i ? c - FW / 2 : null, b: i < FD.length - 1 ? c + FW / 2 : pb, at: c, lab: f.motor }); }); }
      else zones.push({ a: null, b: pb, lab: MC.t('กำลัง', 'power') }); }
    cols.forEach((c, i) => zones.push({ a: i ? this.X((cols[i - 1] + c) / 2) : cb0, b: i < cols.length - 1 ? this.X((c + cols[i + 1]) / 2) : null, at: this.X(c), lab: this.o.noPaths ? '' : String(this.pathNo(c)) }));
    return RL.sheetFrame({ body: s, W, H, zones, occ, ...inf, student: sh.student, rows: sh.rows, print: this.o.print, cropT: 10, cropR: ctl ? Math.max(0, Math.min(20, W - this.rightExt() - 6)) : 0, cls: 'rl rl-framed',
      label: this.o.label || 'control circuit', max: this.o.max, maxScale: ctl ? 0 : 1.5 }); }   // a power-only drawing is not blown up
  /* wire (potential) numbers: every node gets one number, read from top to bottom and left to right; L1 side = 1, N = 0 (shown as N) */
  wireNumbers() { const keys = new Set(); this.r.E.forEach(e => { [e.a, e.b].forEach(k => keys.add(k)); });
    // nodes joined by plain wires carry the same number
    const par = {}; keys.forEach(k => { par[k] = k; }); const f = k => (par[k] === k ? k : (par[k] = f(par[k])));
    this.r.E.filter(e => e.e.k === 'w').forEach(e => { par[f(e.a)] = f(e.b); });
    const groups = new Map(); keys.forEach(k => { const g = f(k); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(k); });
    const pos = k => (k === 'L' ? [-1, 0] : k === 'N' ? [99, 99] : k.split(',').map(Number)), out = new Map();
    const order = [...groups.values()].map(ks => ({ ks, p: ks.map(pos).sort((a, b) => a[1] - b[1] || a[0] - b[0])[0] })).sort((a, b) => a.p[1] - b.p[1] || a.p[0] - b.p[0]);
    let n = 1; order.forEach(g => { const no = g.ks.includes('N') ? 0 : n++; g.ks.forEach(k => out.set(k, no)); }); return out; }
  /* the label of a wire number as drawn and printed: N for the neutral side (kept as 0 inside wireNumbers) */
  wireLabel(n) { return n === 0 || n === 'N' ? 'N' : String(n); }
  /* node keys ('x,y', 'L', 'N') that carry wire number n (0 or 'N' = the neutral side) */
  nodesOf(n) { const want = n === 'N' ? 0 : +n, out = []; this.wireNumbers().forEach((v, k) => { if (v === want) out.push(k); }); return out; }
  /* device terminals on wire number n, as 'KM1:13' (top and bottom terminals of every element whose end sits on one of its nodes) */
  termsOf(n) { const ks = new Set(this.nodesOf(n)), out = [];
    this.spec.els.forEach(e => { if (e.k === 'w' || !e.t) return; const a = this.nodeKey(e.x, e.y), b = this.nodeKey(e.x, e.y + (e.h || 1));
      if (ks.has(a)) out.push(`${this.dev[e.d] && this.dev[e.d].label || e.d}:${e.t[0]}`); if (ks.has(b)) out.push(`${this.dev[e.d] && this.dev[e.d].label || e.d}:${e.t[1]}`); });
    return [...new Set(out)]; }
  renderWireNos(nos = this.wireNumbers(), hi = this.hiNo()) { let s = ''; const done = new Set(), box = (x, y, no) => { const h = hi !== null && no === hi;
      return `<g><rect x="${x - 9}" y="${y - 8}" width="18" height="13" rx="3" fill="${h ? 'var(--accent)' : 'var(--panel)'}" stroke="var(--accent)"/>` + IE.T(this.wireLabel(no), x, y + 2, { size: 9, anchor: 'middle', col: h ? 'var(--panel)' : 'var(--accent)', weight: 700 }) + '</g>'; };
    if (this.o.wireNos) this.r.E.forEach(e => { [[e.a, e.pa || null], [e.b, e.pb || null]].forEach(([k]) => { if (k === 'L' || k === 'N' || done.has(k)) return; done.add(k); const [x, y] = k.split(',').map(Number);
        s += box(this.X(x) - 17, this.Y(y), nos.get(k)); }); });
    if (this.o.wireNos && this.o.railNos) { const xe = this.X(Math.max(...this.spec.els.flatMap(e => (e.pts ? e.pts.map(p => p[0]) : [e.x])))) + 44; s += box(xe, this.Y(0), nos.get('L')) + box(xe, this.Y(this.spec.rows), 0); }   // at the right ends of the rails
    if (hi !== null) this.nodesOf(hi).forEach(k => { if (k === 'L' || k === 'N') return; const [x, y] = k.split(',').map(Number); s += `<circle cx="${this.X(x)}" cy="${this.Y(y)}" r="4.2" fill="var(--accent)" stroke="none" opacity=".85"/>`; });
    return s; }
  /* "NO 13–14 → 2" lines for the contacts of one device, from where they sit in the drawing */
  xref(id) { const S = this.spec, out = [], no = [], nc = [];
    S.els.filter(e => e.d === id && (e.k === 'NO' || e.k === 'NC')).forEach(e => (e.k === 'NO' ? no : nc).push(`${e.t ? e.t.join('–') : ''} ▸ ${this.pathNo(e.x)}`));
    const fd = S.power && S.power.feeders ? S.power.feeders.find(f => f.stages.some(s => s.d === id && s.k === 'mainNO')) : null;
    if (fd) no.unshift(`1–2, 3–4, 5–6 ▸ ${fd.motor}`);   // a feeder contactor: the motor branch its main contacts switch
    else if (S.power && S.power.rev && [this.revInfo().fwd, this.revInfo().rev].includes(id)) { const R = this.revInfo(), n = R.one ? R.poles[id].length : 3;   // chapter 7: the reversing pair
      no.unshift(`${Array.from({ length: n }, (_, k) => `${2 * k + 1}–${2 * k + 2}`).join(', ')} ▸ ${MC.t('กำลัง', 'power')}`); }
    else if (S.power && this.mainSt().some(s => s.d === id && s.k === 'mainNO')) no.unshift(`${S.power.phases === 1 ? '1–2, 3–4' : '1–2, 3–4, 5–6'} ▸ ${MC.t('กำลัง', 'power')}`);
    if (no.length) { out.push('NO'); out.push(...no); } if (nc.length) { out.push('NC'); out.push(...nc); } return out; }
  /* simple three-phase power circuit to the left: rails L1 L2 L3, stages (cb / mainNO / therm), motor */
  renderPower() { const P = this.spec.power, x0 = 52, dx = 20, yT = this.Y(0), n = P.stages.length, step = (this.Y(this.spec.rows) - yT - 70) / (n + 0.6), run = this.running();
    let s = '', live = this.dev[P.stages[0].d] ? true : false; let col = COL.live;
    ['L1', 'L2', 'L3'].forEach((l, k) => { s += IE.T(l, x0 + k * dx, yT - 8, { size: 10, anchor: 'middle', weight: 700 }); });
    let y = yT, ok = true;
    P.stages.forEach((st, j) => { const y0 = y, y1 = y + step, closed = st.k === 'cb' ? this.dev[st.d].on : st.k === 'mainNO' ? this.act(st.d) : true, c = ok && !this.o.print ? (run ? COL.cur : COL.live) : null;
      for (let k = 0; k < 3; k++) { const x = x0 + k * dx; s += `<g${c ? ` stroke="${c}"` : ''}${ok && run ? ' class="rl-cur"' : ''}>${IE.draw(st.k, x, y0, y1, { act: closed })}</g>`; }
      s += IE.T(st.d, x0 - 10, (y0 + y1) / 2 + 4, { anchor: 'end', size: 11, weight: 700 });
      if (st.k !== 'therm') s += IE.L(x0 - 8, (y0 + y1) / 2, x0 + 2 * dx - 8, (y0 + y1) / 2, { dash: '3 2' });
      ok = ok && closed; y = y1; });
    const my = y + 30, mc = ok && !this.o.print ? (run ? COL.cur : COL.live) : null;
    for (let k = 0; k < 3; k++) s += `<g${mc ? ` stroke="${mc}"` : ''}>${IE.L(x0 + k * dx, y, x0 + k * dx, my - 20 + (k === 1 ? -3 : 0))}</g>`;
    s += IE.motor(x0 + dx, my, 20) + IE.T(P.motor || 'M1', x0 - 10, my + 4, { anchor: 'end', size: 11, weight: 700 });
    if (run) s += `<g class="rl-spin" style="transform-origin:${x0 + dx}px ${my}px"><path d="M ${x0 + dx + 26} ${my} A 26 26 0 0 1 ${x0 + dx} ${my + 26}" stroke="${COL.cur}" fill="none" stroke-width="2"/><path d="M ${x0 + dx - 4} ${my + 22} L ${x0 + dx} ${my + 26} L ${x0 + dx - 4} ${my + 30}" stroke="${COL.cur}" fill="none" stroke-width="2"/></g>`;
    return s; }
  /* full power circuit (power.full or power.phases 1): supply L1 L2 L3 N PE (or L1 N PE), stages with terminal numbers, the control
     supply tapped from L1 and N after Q1 (tap 'before': ahead of Q1), motor terminals and PE; Q1 and F2 can be clicked here.
     Returns { s, bottom } (the drawing may reach below the control circuit's N rail). */
  renderPowerFull(hiL, hiN) {
    if (this.spec.power.feeders) return this.renderFeeders(hiL, hiN);
    if (this.spec.power.rev) return this.renderRev(hiL, hiN);
    const P = this.spec.power, one = P.phases === 1, S = this.spec, ctl = S.els.length > 0, run = this.running(), pr = !!this.o.print, live0 = this.mains !== false && !pr;
    const LX = one ? [36] : [40, 66, 92], NX = one ? 122 : 118, PX = one ? 144 : 140, yT = this.Y(0), step = P.step || 54, st = P.stages, y0s = yT + 24;
    const [railL, railN, anyCur] = this.railCol, F = v => +(+v).toFixed(1), first = st.findIndex(t => t.k === 'cb');
    const tap = !ctl ? null : P.tap === 'before' || first < 0 ? [yT + 8, yT + 15] : [y0s + (first + 1) * step + 7, y0s + (first + 1) * step + 14];
    const g = (c, cur, body) => `<g${c ? ` stroke="${c}"` : ''}${cur ? ' class="rl-cur"' : ''}>${body}</g>`;
    const lc = okk => (pr || !okk ? null : run ? COL.cur : COL.live), nc = okk => (pr || !okk || !run ? null : COL.ncur);   // N is coloured only while motor current flows in it
    let s = '', y = y0s, ok = live0, nOk = live0, xOut = LX[0];
    [...(one ? ['L1'] : ['L1', 'L2', 'L3']).map((l, k) => [l, LX[k]]), ['N', NX], ['PE', PX]].forEach(([l, x]) => { s += IE.T(l, x, yT - 8, { size: 10, anchor: 'middle', weight: 700 }); });
    LX.forEach(x => { s += g(lc(ok), ok && run, IE.L(x, yT, x, y)); });
    if (one) s += g(nc(nOk), nOk && run, IE.L(NX, yT, NX, y));
    else if (tap) s += `<g stroke="${hiN ? 'var(--accent)' : railN}"${anyCur ? ' class="rl-cur"' : ''}>${IE.L(NX, yT, NX, tap[1], { w: hiN ? 3.4 : undefined })}</g>`;   // N of a three-phase starter serves only the control circuit
    st.forEach(t => { const y1 = y + step, dv = this.dev[t.d] || {}, closed = t.k === 'cb' ? !!dv.on : t.k === 'mainNO' ? this.act(t.d) : true, ym = (y + y1) / 2;
      const hit = !pr && (dv.type === 'cb' || dv.type === 'ol') && !dv.noClick, poles = one ? (t.k === 'therm' ? [36, 58, 80] : [36, NX]) : LX;
      let b = hit ? `<rect x="${LX[0] - 34}" y="${F(y + 4)}" width="${poles[poles.length - 1] - LX[0] + 46}" height="${step - 8}" fill="transparent" stroke="none"/>` : '';
      poles.forEach((x, k) => { const isN = one && t.k !== 'therm' && k === 1, c = isN ? nc(nOk) : lc(ok), cur = (isN ? nOk : ok) && run;
        b += g(c, cur, IE.draw(t.k, x, y, y1, { act: closed, trip: t.k === 'therm' && dv.tripped })) + IE.T(String(2 * k + 1), x + 5, y + 11, { size: 8 }) + IE.T(String(2 * k + 2), x + 5, y1 - 3, { size: 8 });
        if (one && t.k === 'therm' && k < 2) b += g(c, cur, `<path d="M ${x} ${F(y1)} L ${x} ${F(y1 + 5)} L ${x + 11} ${F(y1 + 5)} L ${x + 11} ${F(y - 5)} L ${x + 22} ${F(y - 5)} L ${x + 22} ${F(y)}" fill="none"/>`); });   // motor current looped through the three poles
      if (one && t.k === 'therm') { s += g(nc(nOk), nOk && run, IE.L(NX, y, NX, y1)); xOut = 80; }   // N passes the overload relay
      b += IE.T(t.d, LX[0] - 10, ym + 4, { anchor: 'end', size: 11, weight: 700 });
      if (t.k !== 'therm') b += IE.L(LX[0] - 8, ym, poles[poles.length - 1] - 8, ym, { dash: '3 2' });
      if (dv.tripped && t.k === 'therm') b += IE.T('!', LX[0] - 10, ym + 16, { anchor: 'end', size: 11, weight: 700, col: 'var(--bad)' });
      s += hit ? `<g data-dev="${t.d}" style="cursor:pointer">${b}</g>` : b;
      ok = ok && closed; if (one && t.k !== 'therm') nOk = nOk && closed; y = y1; });
    // the control supply: L1 and N taken after (or ahead of) Q1
    if (tap) { const xr = this.railX0, xv = xr - 8, yR = this.Y(S.rows);
      const cL = hiL ? 'var(--accent)' : railL, cN = hiN ? 'var(--accent)' : railN, wL = hiL ? 3.4 : 1.6, wN = hiN ? 3.4 : 1.6;
      s += `<g stroke="${cL}"${anyCur ? ' class="rl-cur"' : ''}>${IE.L(LX[0], tap[0], xr, tap[0], { w: wL })}${IE.L(xr, tap[0], xr, this.Y(0), { w: wL })}</g><circle cx="${LX[0]}" cy="${tap[0]}" r="2.8" fill="currentColor" stroke="none"/>`;
      s += `<g stroke="${cN}"${anyCur ? ' class="rl-cur"' : ''}>${IE.L(NX, tap[1], xv, tap[1], { w: wN })}${IE.L(xv, tap[1], xv, yR, { w: wN })}${IE.L(xv, yR, xr, yR, { w: wN })}</g>` + (one ? `<circle cx="${NX}" cy="${tap[1]}" r="2.8" fill="currentColor" stroke="none"/>` : ''); }
    // motor
    const cM = lc(ok), curM = ok && run, mName = P.motor || 'M1'; let bottom;
    if (!one) { const yt2 = y + 18, cy = y + 56, cx = 66, r = 22;
      LX.forEach((x, k) => { s += g(cM, curM, IE.L(x, y, x, yt2) + IE.L(x, yt2, cx + (k - 1) * 13, cy - (k === 1 ? r : 17.5))) + `<circle cx="${x}" cy="${yt2}" r="2.4" fill="var(--panel)" stroke="currentColor"/>` + IE.T(['U1', 'V1', 'W1'][k], x + 4, yt2 - 3, { size: 8, weight: 700 }); });
      s += IE.motor(cx, cy, r) + IE.T(mName, LX[0] - 10, cy + 4, { anchor: 'end', size: 11, weight: 700 });
      s += IE.L(PX, yT, PX, cy) + IE.L(PX, cy, cx + r, cy) + IE.T('PE', PX - 4, cy - 4, { size: 8, anchor: 'end', weight: 700 });
      if (run) s += `<g class="rl-spin" style="transform-origin:${cx}px ${cy}px"><path d="M ${cx + r + 6} ${cy + 4} A 28 28 0 0 1 ${cx + 4} ${cy + r + 6}" stroke="${COL.cur}" fill="none" stroke-width="2"/><path d="M ${cx} ${cy + r + 2} L ${cx + 4} ${cy + r + 6} L ${cx} ${cy + r + 10}" stroke="${COL.cur}" fill="none" stroke-width="2"/></g>`;
      bottom = cy + r + 12; }
    else { const xr = 44, xs = 96, start = !!P.start, yb0 = y + 18, yb1 = yb0 + (start ? 100 : 70), cs = this.cs && start, cSt = curM && cs, xe = start ? xs : xOut, bx = 66, by = start ? yb0 + 80 : (yb0 + yb1) / 2;
      const cLo = cSt ? COL.cur : null;   // below an open centrifugal switch the start winding sits at N potential
      s += g(cM, curM, IE.L(xOut, y, xOut, yb0) + IE.L(xr, yb0, xOut, yb0) + IE.L(xr, yb0, xr, yb0 + 8)) + (start ? g(cSt ? COL.cur : cM, cSt, IE.L(xOut, yb0, xe, yb0)) : '') + `<circle cx="${xOut}" cy="${yb0}" r="2.6" fill="currentColor" stroke="none"/>`;
      s += `<circle cx="${xr}" cy="${yb0 + 8}" r="2.2" fill="var(--panel)" stroke="currentColor"/>` + IE.T('U1', xr - 5, yb0 + 12, { size: 8, anchor: 'end', weight: 700 });
      s += g(cM, curM, IE.wind(xr, yb0 + 10, yb1 - 12)) + `<circle cx="${xr}" cy="${yb1 - 10}" r="2.2" fill="var(--panel)" stroke="currentColor"/>` + IE.T('U2', xr - 5, yb1 - 6, { size: 8, anchor: 'end', weight: 700 });
      s += g(nc(nOk && ok), nOk && curM, IE.L(xr, yb1 - 8, xr, yb1) + IE.L(xr, yb1, NX, yb1)) + `<circle cx="${NX}" cy="${yb1}" r="2.6" fill="currentColor" stroke="none"/>`;
      if (start) { const cc = cSt ? COL.cur : cM; s += g(cc, cSt, IE.cap(xs, yb0, yb0 + 26) + IE.contact(true, xs, yb0 + 26, yb0 + 56, { act: !cs, op: 'spd', clsB: 'rl-lo' }).replace(/<line([^>]*class="rl-lo")/, `<line stroke="${cLo || 'currentColor'}"$1`)) +
          `<circle cx="${xs}" cy="${yb0 + 58}" r="2.2" fill="var(--panel)" stroke="currentColor"/>` + g(cLo, cSt, IE.L(xs, yb0 + 56, xs, yb0 + 58) + IE.wind(xs, yb0 + 60, yb1 - 12)) +
          `<circle cx="${xs}" cy="${yb1 - 10}" r="2.2" fill="var(--panel)" stroke="currentColor"/>` + g(cSt ? COL.ncur : null, cSt, IE.L(xs, yb1 - 8, xs, yb1));
        s += IE.T('C', xs + 11, yb0 + 17, { size: 9, weight: 700 }) + IE.T('Z1', xs + 5, yb0 + 68, { size: 8, weight: 700 }) + IE.T('Z2', xs + 5, yb1 - 4, { size: 8, weight: 700 }); }
      s += `<rect x="${xr - 18}" y="${yb0 - 8}" width="${xe - xr + 34}" height="${yb1 - yb0 + 14}" rx="6" fill="none" stroke="var(--muted)" stroke-dasharray="4 3"/>` +
        IE.T('M', bx, by, { size: 12, anchor: 'middle', weight: 700 }) + IE.T('1~', bx, by + 11, { size: 9, anchor: 'middle' }) + IE.T(mName, xr - 22, yb0 + 30, { anchor: 'end', size: 11, weight: 700 });
      s += IE.L(PX, yT, PX, yb1 + 16) + IE.L(PX, yb1 + 16, bx, yb1 + 16) + IE.L(bx, yb1 + 16, bx, yb1 + 6) + IE.T('PE', PX - 4, yb1 + 13, { size: 8, anchor: 'end', weight: 700 });
      if (run) s += `<g class="rl-spin" style="transform-origin:${bx}px ${by - 4}px"><path d="M ${bx - 9} ${by - 13} A 13 13 0 0 0 ${bx - 9} ${by + 5}" stroke="${COL.cur}" fill="none" stroke-width="2"/></g>`;
      s += g(nc(nOk && ok), nOk && curM, IE.L(NX, y, NX, yb1));
      bottom = yb1 + 22; }
    return { s, bottom }; }
  /* multi-motor power circuit (power.feeders): supply L1 L2 L3 N PE, the main stages (Q1), a busbar, one branch per motor (Q1n, KMn,
     F2n with terminal numbers), the motors with U1 V1 W1 and a PE bus underneath. The control supply is the L1 busbar carried on to
     the control rail (tap 'after', i.e. after Q1) or a tap ahead of Q1 (tap 'before'); N comes from the supply terminal. Crossing
     conductors have no dot, junctions have one. Returns { s, bottom }. */
  renderFeeders(hiL, hiN) {
    const P = this.spec.power, S = this.spec, ctl = S.els.length > 0, pr = !!this.o.print, live0 = this.mains !== false && !pr, any = this.running();
    const LX = [40, 66, 92], NX = 118, PX = 140, FW = P.fw || 136, yT = this.Y(0), step = P.step || 54, y0s = yT + 24, FD = P.feeders, n = FD.length;
    const [railL, railN, anyCur] = this.railCol, F = v => +(+v).toFixed(1), xs = i => 40 + i * FW, xLast = xs(n - 1);
    const g = (c, cur, body) => `<g${c ? ` stroke="${c}"` : ''}${cur ? ' class="rl-cur"' : ''}>${body}</g>`, dot = (x, y) => `<circle cx="${F(x)}" cy="${F(y)}" r="2.8" fill="currentColor" stroke="none"/>`;
    const lc = (okk, run) => (pr || !okk ? null : run ? COL.cur : COL.live);
    // one row of stages on three poles (px); returns its drawing and whether the path is still closed below it
    const stage = (t, px, y, ok, run) => { const y1 = y + step, dv = this.dev[t.d] || {}, closed = t.k === 'cb' ? !!dv.on : t.k === 'mainNO' ? this.act(t.d) : true, ym = (y + y1) / 2;
      const hit = !pr && (dv.type === 'cb' || dv.type === 'ol') && !dv.noClick;
      let b = hit ? `<rect x="${px[0] - 34}" y="${F(y + 4)}" width="${px[2] - px[0] + 46}" height="${step - 8}" fill="transparent" stroke="none"/>` : '';
      px.forEach((x, k) => { b += g(lc(ok, run), ok && run, IE.draw(t.k, x, y, y1, { act: closed, trip: t.k === 'therm' && dv.tripped })) + IE.T(String(2 * k + 1), x + 5, y + 11, { size: 8 }) + IE.T(String(2 * k + 2), x + 5, y1 - 3, { size: 8 }); });
      b += IE.T(dv.label || t.d, px[0] - 10, ym + 4, { anchor: 'end', size: 11, weight: 700 });
      if (t.k !== 'therm') b += IE.L(px[0] - 8, ym, px[2] - 8, ym, { dash: '3 2' });
      if (dv.tripped && t.k === 'therm') b += IE.T('!', px[0] - 10, ym + 16, { anchor: 'end', size: 11, weight: 700, col: 'var(--bad)' });
      return { s: hit ? `<g data-dev="${t.d}" style="cursor:pointer">${b}</g>` : b, ok: ok && closed }; };
    let s = '', y = y0s, ok = live0;
    [['L1', LX[0]], ['L2', LX[1]], ['L3', LX[2]], ['N', NX], ['PE', PX]].forEach(([l, x]) => { s += IE.T(l, x, yT - 8, { size: 10, anchor: 'middle', weight: 700 }); });
    // geometry of the branches first, so that PE can be drawn underneath everything
    const yQ = y0s + this.mainSt().length * step, yB = [yQ + 14, yQ + 22, yQ + 30], tapA = ctl && P.tap !== 'before', yF = yB[2] + 12;
    const mot = FD.map((f, i) => { const cy = yF + f.stages.length * step + 56; return [xs(i) + 26 - 15.6, cy + 15.6, cy]; });   // PE terminal at the lower left of each motor
    const yPE = Math.max(...mot.map(m => m[2])) + 22 + 16, xa = Math.min(PX, ...mot.map(m => m[0])), xb = Math.max(PX, ...mot.map(m => m[0]));
    s += IE.L(PX, yT, PX, yPE) + IE.L(xa, yPE, xb, yPE) + mot.map(([x, yb]) => IE.L(x, yb, x, yPE) + (x !== xa && x !== xb ? dot(x, yPE) : '')).join('') +
      (PX !== xa && PX !== xb ? dot(PX, yPE) : '') + IE.T('PE', xa - 4, yPE + 4, { size: 8, anchor: 'end', weight: 700 });
    // supply conductors, main stages, drops to the busbar and the busbar
    LX.forEach(x => { s += g(lc(ok, any), ok && any, IE.L(x, yT, x, y)); });
    this.mainSt().forEach(t => { const r = stage(t, LX, y, ok, any); s += r.s; ok = r.ok; y += step; });
    LX.forEach((x, k) => { s += g(lc(ok, any), ok && any, IE.L(x, yQ, x, yB[k]) + (n > 1 ? IE.L(x, yB[k], xLast + 26 * k, yB[k]) : '')); });
    // the control supply
    if (ctl) { const xr = this.railX0, xv = xr - 8, yR = this.Y(S.rows), cL = hiL ? 'var(--accent)' : railL, cN = hiN ? 'var(--accent)' : railN, wL = hiL ? 3.4 : 1.6, wN = hiN ? 3.4 : 1.6, cu = anyCur ? ' class="rl-cur"' : '';
      if (tapA) { const yN = yQ + 6;
        s += `<g stroke="${cL}"${cu}>${IE.L(xLast, yB[0], xr, yB[0], { w: wL })}${IE.L(xr, yB[0], xr, this.Y(0), { w: wL })}</g>` + (n === 1 ? dot(xLast, yB[0]) : '');
        s += `<g stroke="${cN}"${cu}>${IE.L(NX, yT, NX, yN, { w: wN })}${IE.L(NX, yN, xv, yN, { w: wN })}${IE.L(xv, yN, xv, yR, { w: wN })}${IE.L(xv, yR, xr, yR, { w: wN })}</g>`; }
      else { const t0 = yT + 8, t1 = yT + 15;
        s += `<g stroke="${cL}"${cu}>${IE.L(LX[0], t0, xr, t0, { w: wL })}${IE.L(xr, t0, xr, this.Y(0), { w: wL })}</g>` + dot(LX[0], t0);
        s += `<g stroke="${cN}"${cu}>${IE.L(NX, yT, NX, t1, { w: wN })}${IE.L(NX, t1, xv, t1, { w: wN })}${IE.L(xv, t1, xv, yR, { w: wN })}${IE.L(xv, yR, xr, yR, { w: wN })}</g>`; } }
    // the motor branches
    FD.forEach((f, i) => { const x0 = xs(i), px = [x0, x0 + 26, x0 + 52], run = this.runningM(f.motor); let okf = ok, yy = yF;
      px.forEach((x, k) => { s += g(lc(okf, run), okf && run, IE.L(x, yB[k], x, yy)) + (n > 1 && (i < n - 1 || (k === 0 && tapA)) ? dot(x, yB[k]) : ''); });
      f.stages.forEach(t => { const r = stage(t, px, yy, okf, run); s += r.s; okf = r.ok; yy += step; });
      const yt2 = yy + 18, cy = yy + 56, cx = x0 + 26, r = 22;
      px.forEach((x, k) => { s += g(lc(okf, run), okf && run, IE.L(x, yy, x, yt2) + IE.L(x, yt2, cx + (k - 1) * 13, cy - (k === 1 ? r : 17.5))) + `<circle cx="${x}" cy="${yt2}" r="2.4" fill="var(--panel)" stroke="currentColor"/>` + IE.T(['U1', 'V1', 'W1'][k], x + 4, yt2 - 3, { size: 8, weight: 700 }); });
      s += IE.motor(cx, cy, r) + IE.T(f.motor, x0 - 10, cy + 4, { anchor: 'end', size: 11, weight: 700 });
      if (run) s += `<g class="rl-spin" style="transform-origin:${cx}px ${cy}px"><path d="M ${cx + r + 6} ${cy + 4} A 28 28 0 0 1 ${cx + 4} ${cy + r + 6}" stroke="${COL.cur}" fill="none" stroke-width="2"/><path d="M ${cx} ${cy + r + 2} L ${cx + 4} ${cy + r + 6} L ${cx} ${cy + r + 10}" stroke="${COL.cur}" fill="none" stroke-width="2"/></g>`; });
    return { s, bottom: yPE + 12 }; }
  /* ---------------- chapter 7 drawing: mechanical interlock, reversing power circuits ---------------- */
  /* IEC 60617 S00154 between the two coils of each spec.mech pair: a dashed link under the coil boxes with a triangle in the middle
     (filled orange while one of the coils is held open) */
  renderMech() { let s = ''; const pr = !!this.o.print;
    this.spec.mech.forEach(([a, b]) => { const ea = this.spec.els.find(e => e.k === 'coil' && e.d === a), eb = this.spec.els.find(e => e.k === 'coil' && e.d === b); if (!ea || !eb) return;
      const [p, q] = ea.x <= eb.x ? [ea, eb] : [eb, ea], ym = e => (this.Y(e.y) + this.Y(e.y + (e.h || 1))) / 2 + 7, xa = this.X(p.x) + 8, xb = this.X(q.x) - 8, yl = Math.max(ym(p), ym(q)) + 5, xm = (xa + xb) / 2;
      const hot = !pr && (this.dev[a].blocked || this.dev[b].blocked);
      s += `<path d="M ${xa} ${ym(p)} L ${xa} ${yl} L ${xb} ${yl} L ${xb} ${ym(q)}" fill="none" stroke-dasharray="3 2"/>` +
        `<path d="M ${xm - 6.5} ${yl - 5.5} L ${xm + 6.5} ${yl - 5.5} L ${xm} ${yl + 5.5} Z" fill="${hot ? '#ff8c42' : 'var(--panel)'}"/>`; });
    return s; }
  /* the message under a drawing whose reversing pair shorted the supply */
  pshortMsg() { const pr = (this.pshort || []).map(p => p.join(MC.t(' กับ ', '–'))).join(', '), R = this.revInfo(), q = R && R.pre.find(t => t.k === 'cb');
    return `<div class="badbox rl-msg">${MC.t(`ลัดวงจรในวงจรกำลัง! ${R.fwd} และ ${R.rev} ต่อพร้อมกัน ทำให้ ${pr} ลัดถึงกัน ${q ? `${q.d} ตัดแล้ว คลิกที่ ${q.d} เพื่อสับกลับ` : ''}`,
      `Short circuit in the power circuit! ${R.fwd} and ${R.rev} closed together and joined ${pr}. ${q ? `${q.d} has tripped: click ${q.d} to switch it on again.` : ''}`)}</div>`; }
  /* width of the reversing power drawing (the control rails start here) */
  revW() { const R = this.revInfo(); return R.one ? this.rev1Geo().PX + 32 : 262; }
  /* geometry of the single-phase reversing drawing: pole x of each contactor, PE, motor terminals */
  rev1Geo() { const R = this.revInfo(), n = Math.max(R.poles[R.fwd].length, R.poles[R.rev].length), K1 = Array.from({ length: n }, (_, i) => 172 + 26 * i), K2 = K1.map(x => x + 26 * (n - 1) + 50);
    return { K1, K2, PX: K2[n - 1] + 28, tx: { U1: 36, Z1: 80, Z2: 104, U2: 130 } }; }
  /* one row of stages on the poles px (cb / mainNO / therm, with terminal numbers; cb and ol clickable) */
  stageRow(t, px, y, ok, run, step) { const y1 = y + step, dv = this.dev[t.d] || {}, closed = t.k === 'cb' ? !!dv.on : t.k === 'mainNO' ? this.act(t.d) : true, ym = (y + y1) / 2, pr = !!this.o.print;
    const hit = !pr && (dv.type === 'cb' || dv.type === 'ol') && !dv.noClick, c = pr || !ok ? null : run ? COL.cur : COL.live, last = px[px.length - 1];
    let b = hit ? `<rect x="${px[0] - 34}" y="${+(y + 4).toFixed(1)}" width="${last - px[0] + 46}" height="${step - 8}" fill="transparent" stroke="none"/>` : '';
    px.forEach((x, k) => { b += `<g${c ? ` stroke="${c}"` : ''}${ok && run ? ' class="rl-cur"' : ''}>${IE.draw(t.k, x, y, y1, { act: closed, trip: t.k === 'therm' && dv.tripped })}</g>` + IE.T(String(2 * k + 1), x + 5, y + 11, { size: 8 }) + IE.T(String(2 * k + 2), x + 5, y1 - 3, { size: 8 }); });
    b += IE.T(dv.label || t.d, px[0] - 10, ym + 4, { anchor: 'end', size: 11, weight: 700 });
    if (t.k !== 'therm') b += IE.L(px[0] - 8, ym, last - 8, ym, { dash: '3 2' });
    if (dv.tripped && t.k === 'therm') b += IE.T('!', px[0] - 10, ym + 16, { anchor: 'end', size: 11, weight: 700, col: 'var(--bad)' });
    return { s: hit ? `<g data-dev="${t.d}" style="cursor:pointer">${b}</g>` : b, ok: ok && closed }; }
  /* rotation arrow beside a motor of radius r at (cx, cy): an arc on the right moving down (clockwise) or on the left moving down
     (counter-clockwise), arrowhead in the direction of motion; the group spins the same way (CSS rl-spin / rl-ccw) */
  spinArrow(cx, cy, r, dir) { const ccw = dir === 'ccw', R = r + 6, cc = this.o.print ? 'currentColor' : COL.cur, sg = ccw ? -1 : 1, a0 = -50 * Math.PI / 180, a1 = 50 * Math.PI / 180, F = v => +v.toFixed(1);
    const P = a => [cx + sg * R * Math.cos(a), cy + R * Math.sin(a)], [x0, y0] = P(a0), [x1, y1] = P(a1), tx = -sg * Math.sin(a1), ty = Math.cos(a1), nx = -ty, ny = tx;
    const head = `M ${F(x1 - 6 * tx + 3.5 * nx)} ${F(y1 - 6 * ty + 3.5 * ny)} L ${F(x1)} ${F(y1)} L ${F(x1 - 6 * tx - 3.5 * nx)} ${F(y1 - 6 * ty - 3.5 * ny)}`;
    return `<g class="rl-spin${ccw ? ' rl-ccw' : ''}" style="transform-origin:${cx}px ${cy}px"><path d="M ${F(x0)} ${F(y0)} A ${R} ${R} 0 0 ${ccw ? 0 : 1} ${F(x1)} ${F(y1)}" stroke="${cc}" fill="none" stroke-width="2"/><path d="${head}" stroke="${cc}" fill="none" stroke-width="2"/></g>`; }
  /* the word under a running motor */
  dirLabel(dir) { return dir === 'ccw' ? MC.t('ทวนเข็มนาฬิกา', 'counter-clockwise') : MC.t('ตามเข็มนาฬิกา', 'clockwise'); }
  /* three-phase reversing power circuit (power.rev): L1 L2 L3 N PE, the stages ahead of the pair (Q1), a busbar to the second
     contactor, a crossover zone above each contactor (KM1 straight, KM2 with the phases of rev.map: the crossed conductors are drawn as
     an X, the phase that lands on each conductor is labelled), the outputs of KM2 joined to those of KM1, the stages after the pair (F2),
     motor U1 V1 W1 + PE with its arrow and the word clockwise / counter-clockwise. Returns { s, bottom }. */
  renderRev(hiL, hiN) {
    const P = this.spec.power; if (P.phases === 1) return this.renderRev1(hiL, hiN);
    const S = this.spec, ctl = S.els.length > 0, pr = !!this.o.print, R = this.revInfo(), run = this.running(), dir = this.dir();
    const LX = [40, 66, 92], NX = 118, K2 = [150, 176, 202], PX = 230, yT = this.Y(0), step = P.step || 54, y0s = yT + 24, F = v => +(+v).toFixed(1);
    const [railL, railN, anyCur] = this.railCol, g = (c, cur, body) => `<g${c ? ` stroke="${c}"` : ''}${cur ? ' class="rl-cur"' : ''}>${body}</g>`, dot = (x, y) => `<circle cx="${F(x)}" cy="${F(y)}" r="2.8" fill="currentColor" stroke="none"/>`;
    const lc = (okk, cur) => (pr || !okk ? null : cur ? COL.cur : COL.live), fIn = this.act(R.fwd), rIn = this.act(R.rev), fC = fIn && run, rC = rIn && run;
    let s = '', y = y0s, ok = this.mains !== false && !pr;
    [['L1', LX[0]], ['L2', LX[1]], ['L3', LX[2]], ['N', NX], ['PE', PX]].forEach(([l, x]) => { s += IE.T(l, x, yT - 8, { size: 10, anchor: 'middle', weight: 700 }); });
    LX.forEach(x => { s += g(lc(ok, run), ok && run, IE.L(x, yT, x, y)); });
    let first = -1; R.pre.forEach((t, j) => { if (first < 0 && t.k === 'cb') first = j; const r = this.stageRow(t, LX, y, ok, run, step); s += r.s; ok = r.ok; y += step; });
    const yQ = y, yB = [yQ + 24, yQ + 32, yQ + 40], yX0 = yQ + 54, yK = yQ + 80, yE = yK + step, yJ = [yE + 12, yE + 20, yE + 28], yF = yE + 40;
    // busbar: each supply conductor goes on down to KM1 and along its row to the landing above KM2
    LX.forEach((x, k) => { s += g(lc(ok, run), ok && run, IE.L(x, yQ, x, yB[k])) + g(lc(ok, fC), ok && fC, IE.L(x, yB[k], x, yX0)) + dot(x, yB[k]) +
      g(lc(ok, rC), ok && rC, IE.L(x, yB[k], K2[k], yB[k]) + IE.L(K2[k], yB[k], K2[k], yX0)); });
    // crossover zones: the conductor of phase p goes to the pole that the map gives it
    const cross = (X, mp, cur) => mp.map((p, k) => g(lc(ok, cur), ok && cur, IE.L(X[p - 1], yX0, X[k], yK))).join('') +
      (mp.some((p, k) => p !== k + 1) ? X.map((x, k) => IE.T(`L${k + 1}`, x + 3, yX0 - 1, { size: 7.5, col: 'var(--muted)' })).join('') : '');
    s += cross(LX, R.fmap, fC) + cross(K2, R.map, rC);
    // the two contactors
    const kRow = (id, X, closed, cur) => { const ym = (yK + yE) / 2, dv = this.dev[id] || {}; let b = '';
      X.forEach((x, k) => { b += g(lc(ok, cur), ok && cur, IE.draw('mainNO', x, yK, yE, { act: closed })) + IE.T(String(2 * k + 1), x + 5, yK + 11, { size: 8 }) + IE.T(String(2 * k + 2), x + 5, yE - 3, { size: 8 }); });
      return b + IE.T(dv.label || id, X[0] - 10, ym + 4, { anchor: 'end', size: 11, weight: 700 }) + IE.L(X[0] - 8, ym, X[2] - 8, ym, { dash: '3 2' }); };
    s += kRow(R.fwd, LX, fIn, fC) + kRow(R.rev, K2, rIn, rC);
    // outputs: KM2 joins KM1 on each motor conductor
    const out = ok && (fIn || rIn);
    LX.forEach((x, k) => { s += g(lc(out, fC), out && fC, IE.L(x, yE, x, yJ[k])) + g(lc(out, run), out && run, IE.L(x, yJ[k], x, yF)) + dot(x, yJ[k]) +
      g(lc(out, rC), out && rC, IE.L(K2[k], yE, K2[k], yJ[k]) + IE.L(K2[k], yJ[k], x, yJ[k])); });
    if (this.msg === 'pshort' && !pr) { const k = R.map.findIndex((p, i) => p !== R.fmap[i]), xm = (LX[Math.max(0, k)] + K2[Math.max(0, k)]) / 2, ym = yJ[Math.max(0, k)];
      s += `<circle cx="${xm}" cy="${ym}" r="10" fill="#ff6b6b" opacity=".3" stroke="none"/><path d="M ${xm - 4} ${ym - 9} L ${xm + 2} ${ym - 1} L ${xm - 2} ${ym + 1} L ${xm + 4} ${ym + 9}" stroke="var(--bad)" stroke-width="2.2" fill="none"/>`; }
    // stages after the pair (overload relay)
    y = yF; ok = out; R.post.forEach(t => { const r = this.stageRow(t, LX, y, ok, run, step); s += r.s; ok = r.ok; y += step; });
    // the control supply: L1 and N taken after (or ahead of) Q1
    if (ctl) { const tap = P.tap === 'before' || first < 0 ? [yT + 8, yT + 15] : [y0s + (first + 1) * step + 7, y0s + (first + 1) * step + 14], xr = this.railX0, xv = xr - 8, yR = this.Y(S.rows);
      const cL = hiL ? 'var(--accent)' : railL, cN = hiN ? 'var(--accent)' : railN, wL = hiL ? 3.4 : 1.6, wN = hiN ? 3.4 : 1.6, cu = anyCur ? ' class="rl-cur"' : '';
      s += `<g stroke="${hiN ? 'var(--accent)' : railN}"${cu}>${IE.L(NX, yT, NX, tap[1], { w: hiN ? 3.4 : undefined })}</g>`;
      s += `<g stroke="${cL}"${cu}>${IE.L(LX[0], tap[0], xr, tap[0], { w: wL })}${IE.L(xr, tap[0], xr, this.Y(0), { w: wL })}</g>` + dot(LX[0], tap[0]);
      s += `<g stroke="${cN}"${cu}>${IE.L(NX, tap[1], xv, tap[1], { w: wN })}${IE.L(xv, tap[1], xv, yR, { w: wN })}${IE.L(xv, yR, xr, yR, { w: wN })}</g>`; }
    // motor
    const yt2 = y + 18, cy = y + 56, cx = 66, r = 22, cM = lc(ok, run);
    LX.forEach((x, k) => { s += g(cM, ok && run, IE.L(x, y, x, yt2) + IE.L(x, yt2, cx + (k - 1) * 13, cy - (k === 1 ? r : 17.5))) + `<circle cx="${x}" cy="${yt2}" r="2.4" fill="var(--panel)" stroke="currentColor"/>` + IE.T(['U1', 'V1', 'W1'][k], x + 4, yt2 - 3, { size: 8, weight: 700 }); });
    s += IE.motor(cx, cy, r) + IE.T(P.motor || 'M1', LX[0] - 10, cy + 4, { anchor: 'end', size: 11, weight: 700 });
    s += IE.L(PX, yT, PX, cy) + IE.L(PX, cy, cx + r, cy) + IE.T('PE', PX - 4, cy - 4, { size: 8, anchor: 'end', weight: 700 });
    if (run) s += this.spinArrow(cx, cy, r, dir) + IE.T(this.dirLabel(dir), cx, cy + r + 24, { size: 9, anchor: 'middle', weight: 700, col: pr ? undefined : COL.cur });
    return { s, bottom: cy + r + 30 }; }
  /* single-phase reversing power circuit (power.phases 1 + rev): L1 N PE, Q1 two-pole, F2 with the line current through its three
     poles (ahead of the split, so it carries the run and the start current), an L row and an N row to the two contactors, one row per
     motor terminal under them (U1 Z1 Z2 U2), U2 fixed to N; motor 1~ as a terminal board: run winding U1–U2, start winding Z1–Z2
     through the start capacitor C and the centrifugal switch, speed and direction of rotation. Returns { s, bottom }. */
  renderRev1(hiL, hiN) {
    const P = this.spec.power, S = this.spec, ctl = S.els.length > 0, pr = !!this.o.print, R = this.revInfo(), run = this.running(), G = this.rev1Geo();
    const LX = 36, NX = 122, yT = this.Y(0), step = P.step || 54, y0s = yT + 24, F = v => +(+v).toFixed(1);
    const [railL, railN, anyCur] = this.railCol, g = (c, cur, body) => `<g${c ? ` stroke="${c}"` : ''}${cur ? ' class="rl-cur"' : ''}>${body}</g>`, dot = (x, y) => `<circle cx="${F(x)}" cy="${F(y)}" r="2.8" fill="currentColor" stroke="none"/>`;
    const lc = (okk, cur) => (pr || !okk ? null : cur ? COL.cur : COL.live), nc = (okk, cur) => (pr || !okk || !cur ? null : COL.ncur);
    const closed = { [R.fwd]: this.act(R.fwd), [R.rev]: this.act(R.rev) };
    let s = '', y = y0s, ok = this.mains !== false && !pr, nOk = ok, xL = LX, first = -1, yTap = null;
    [['L1', LX], ['N', NX], ['PE', G.PX]].forEach(([l, x]) => { s += IE.T(l, x, yT - 8, { size: 10, anchor: 'middle', weight: 700 }); });
    s += g(lc(ok, run), ok && run, IE.L(LX, yT, LX, y)) + g(nc(nOk, run), nOk && run, IE.L(NX, yT, NX, y));
    R.pre.forEach((t, j) => { if (first < 0 && t.k === 'cb') first = j;
      const y1 = y + step, dv = this.dev[t.d] || {}, cl = t.k === 'cb' ? !!dv.on : t.k === 'mainNO' ? this.act(t.d) : true, ym = (y + y1) / 2, th = t.k === 'therm';
      const hit = !pr && (dv.type === 'cb' || dv.type === 'ol') && !dv.noClick, poles = th ? [36, 58, 80] : [36, NX];
      let b = hit ? `<rect x="${LX - 34}" y="${F(y + 4)}" width="${poles[poles.length - 1] - LX + 46}" height="${step - 8}" fill="transparent" stroke="none"/>` : '';
      poles.forEach((x, k) => { const isN = !th && k === 1, c = isN ? nc(nOk, run) : lc(ok, run), cur = (isN ? nOk : ok) && run;
        b += g(c, cur, IE.draw(t.k, x, y, y1, { act: cl, trip: th && dv.tripped })) + IE.T(String(2 * k + 1), x + 5, y + 11, { size: 8 }) + IE.T(String(2 * k + 2), x + 5, y1 - 3, { size: 8 });
        if (th && k < 2) b += g(c, cur, `<path d="M ${x} ${F(y1)} L ${x} ${F(y1 + 5)} L ${x + 11} ${F(y1 + 5)} L ${x + 11} ${F(y - 5)} L ${x + 22} ${F(y - 5)} L ${x + 22} ${F(y)}" fill="none"/>`); });   // line current through the three poles
      if (th) { s += g(nc(nOk, run), nOk && run, IE.L(NX, y, NX, y1)); xL = 80; }
      b += IE.T(dv.label || t.d, LX - 10, ym + 4, { anchor: 'end', size: 11, weight: 700 });
      if (!th) b += IE.L(LX - 8, ym, poles[poles.length - 1] - 8, ym, { dash: '3 2' });
      if (dv.tripped && th) b += IE.T('!', LX - 10, ym + 16, { anchor: 'end', size: 11, weight: 700, col: 'var(--bad)' });
      s += hit ? `<g data-dev="${t.d}" style="cursor:pointer">${b}</g>` : b; ok = ok && cl; if (!th) nOk = nOk && cl; y = y1;
      if (t.k === 'cb') { s += g(lc(ok, run), ok && run, IE.L(xL, y, xL, y + 16)) + g(nc(nOk, run), nOk && run, IE.L(NX, y, NX, y + 16)); if (yTap === null) yTap = y; y += 16; } });   // a gap under the breaker: the control supply is taken there
    // L row and N row to the poles of the two contactors
    const yA = y, yLb = yA + 14, yNb = yA + 24, yK = yA + 40, yE = yK + step, feeds = [];
    [[R.fwd, G.K1], [R.rev, G.K2]].forEach(([id, X]) => R.poles[id].forEach(([src, t], i) => feeds.push({ x: X[i], src, t, id })));
    const lx = feeds.filter(f => f.src === 'L').map(f => f.x), nx = feeds.filter(f => f.src === 'N').map(f => f.x), nDown = R.fixed.some(([a, t]) => a === 'N' && G.tx[t] === NX);
    s += g(lc(ok, run), ok && run, IE.L(xL, yA, xL, yLb) + (lx.length ? IE.L(xL, yLb, Math.max(...lx), yLb) : '')) + lx.filter(x => x < Math.max(...lx)).map(x => dot(x, yLb)).join('');
    s += g(nc(nOk, run), nOk && run, IE.L(NX, yA, NX, yNb) + (nx.length ? IE.L(NX, yNb, Math.max(...nx), yNb) : '')) + nx.filter(x => x < Math.max(...nx)).map(x => dot(x, yNb)).join('') + (nDown && nx.length ? dot(NX, yNb) : '');
    feeds.forEach(f => { const cur = closed[f.id] && run, isN = f.src === 'N'; s += g(isN ? nc(nOk, cur) : lc(ok, cur), (isN ? nOk : ok) && cur, IE.L(f.x, isN ? yNb : yLb, f.x, yK)); });
    [[R.fwd, G.K1], [R.rev, G.K2]].forEach(([id, X]) => { const cl = closed[id], ym = (yK + yE) / 2, dv = this.dev[id] || {}, n = R.poles[id].length;
      R.poles[id].forEach(([src, t], i) => { const x = X[i], isN = src === 'N', cur = cl && run;
        s += g(isN ? nc(nOk, cur) : lc(ok, cur), (isN ? nOk : ok) && cur, IE.draw('mainNO', x, yK, yE, { act: cl })) + IE.T(String(2 * i + 1), x + 5, yK + 11, { size: 8 }) + IE.T(String(2 * i + 2), x + 5, yE - 3, { size: 8 }); });
      s += IE.T(dv.label || id, X[0] - 10, ym + 4, { anchor: 'end', size: 11, weight: 700 }) + IE.L(X[0] - 8, ym, X[n - 1] - 8, ym, { dash: '3 2' }); });
    // one row per motor terminal; the source each terminal has now (L, N, X = both: a short)
    const TS = ['U1', 'Z1', 'Z2', 'U2'], rowY = {}, src = {}; let yo = yE + 12;
    TS.forEach(t => { if (feeds.some(f => f.t === t)) { rowY[t] = yo; yo += 8; } });
    const yM = yo + 14, put = (t, a) => { src[t] = src[t] && src[t] !== a ? 'X' : a; };
    feeds.forEach(f => { if (closed[f.id] && ok) put(f.t, f.src); }); R.fixed.forEach(([a, t]) => { if (ok) put(t, a); });
    const tc = t => (src[t] === 'L' || src[t] === 'X' ? lc(ok, run) : src[t] === 'N' ? nc(nOk, run) : null), tcur = t => !!src[t] && run;
    TS.forEach(t => { const fs = feeds.filter(f => f.t === t), xt = G.tx[t]; if (!fs.length) return; const yr = rowY[t], xs = [xt, ...fs.map(f => f.x)], x0 = Math.min(...xs), x1 = Math.max(...xs);
      fs.forEach(f => { s += g(tc(t), tcur(t) && closed[f.id], IE.L(f.x, yE, f.x, yr)) + (f.x !== x0 && f.x !== x1 ? dot(f.x, yr) : ''); });
      s += g(tc(t), tcur(t), IE.L(x0, yr, x1, yr) + IE.L(xt, yr, xt, yM)) + (xt !== x0 && xt !== x1 ? dot(xt, yr) : '');
      if (this.msg === 'pshort' && !pr && R.poles[R.fwd].concat(R.poles[R.rev], R.fixed).filter(([, u]) => u === t).map(([a]) => a).filter((a, i, A) => A.indexOf(a) === i).length > 1) {
        const xm = (x0 + x1) / 2; s += `<circle cx="${xm}" cy="${yr}" r="10" fill="#ff6b6b" opacity=".3" stroke="none"/><path d="M ${xm - 4} ${yr - 9} L ${xm + 2} ${yr - 1} L ${xm - 2} ${yr + 1} L ${xm + 4} ${yr + 9}" stroke="var(--bad)" stroke-width="2.2" fill="none"/>`; } });
    R.fixed.forEach(([a, t]) => { const xt = G.tx[t], isN = a === 'N', x0 = isN ? NX : xL, y0 = isN ? yNb : yLb, c = isN ? nc(nOk, run) : lc(ok, run), row = isN ? nx : lx;
      const onRow = row.length > 0 && xt > x0 && xt < Math.max(...row);   // the terminal lies under its row: a T-junction straight down
      s += g(c, run && ok, onRow || xt === x0 ? IE.L(xt, y0, xt, yM) : IE.L(x0, y0, x0, yM - 7) + IE.L(x0, yM - 7, xt, yM - 7) + IE.L(xt, yM - 7, xt, yM)) + (onRow ? dot(xt, y0) : ''); });
    // the control supply
    if (ctl) { const tap = P.tap === 'before' || yTap === null ? [yT + 8, yT + 15] : [yTap + 5, yTap + 11], xr = this.railX0, xv = xr - 8, yR = this.Y(S.rows);
      const cL = hiL ? 'var(--accent)' : railL, cN = hiN ? 'var(--accent)' : railN, wL = hiL ? 3.4 : 1.6, wN = hiN ? 3.4 : 1.6, cu = anyCur ? ' class="rl-cur"' : '';
      s += `<g stroke="${cL}"${cu}>${IE.L(LX, tap[0], xr, tap[0], { w: wL })}${IE.L(xr, tap[0], xr, this.Y(0), { w: wL })}</g>` + dot(LX, tap[0]);
      s += `<g stroke="${cN}"${cu}>${IE.L(NX, tap[1], xv, tap[1], { w: wN })}${IE.L(xv, tap[1], xv, yR, { w: wN })}${IE.L(xv, yR, xr, yR, { w: wN })}</g>` + dot(NX, tap[1]); }
    // motor 1~ drawn as its terminal board
    const cs = this.cs !== false, w = this.w || 0, pol = (a, b) => !!src[a] && !!src[b] && src[a] !== 'X' && src[b] !== 'X' && src[a] !== src[b];
    const runW = run && pol('U1', 'U2'), stW = runW && cs && pol('Z1', 'Z2'), cR = pr || !runW ? null : COL.cur, cS = pr || !stW ? null : COL.cur, bx = 156;
    TS.forEach(t => { const x = G.tx[t]; s += `<circle cx="${x}" cy="${yM}" r="2.4" fill="var(--panel)" stroke="currentColor"/>` + IE.T(t, x + 4, yM - 3, { size: 8, weight: 700 }); });
    s += g(cR, runW, IE.L(36, yM + 2, 36, yM + 6) + IE.wind(36, yM + 6, yM + 62) + IE.L(36, yM + 62, 36, yM + 76) + IE.L(36, yM + 76, 130, yM + 76) + IE.L(130, yM + 76, 130, yM + 2));
    s += g(cS, stW, IE.cap(80, yM + 2, yM + 26) + IE.contact(true, 80, yM + 26, yM + 56, { act: !cs, op: 'spd' }) + IE.L(80, yM + 56, 80, yM + 66) + IE.L(80, yM + 66, 104, yM + 66) + IE.wind(104, yM + 8, yM + 66) + IE.L(104, yM + 2, 104, yM + 8));
    s += IE.T('C', 91, yM + 18, { size: 9, weight: 700 }) + `<rect x="20" y="${yM - 9}" width="${bx + 26 - 20}" height="93" rx="6" fill="none" stroke="var(--muted)" stroke-dasharray="4 3"/>` +
      IE.T('M', bx, yM + 33, { size: 12, anchor: 'middle', weight: 700 }) + IE.T('1~', bx, yM + 44, { size: 9, anchor: 'middle' }) + IE.T(P.motor || 'M1', 16, yM + 44, { anchor: 'end', size: 11, weight: 700 });
    if (this.w !== undefined) s += IE.T(`n ${Math.round(Math.abs(w) * 20) * 5} %`, bx, yM + 70, { size: 8.5, anchor: 'middle', col: 'var(--muted)' });
    s += IE.L(G.PX, yT, G.PX, yM + 96) + IE.L(G.PX, yM + 96, 78, yM + 96) + IE.L(78, yM + 96, 78, yM + 84) + IE.T('PE', G.PX - 4, yM + 93, { size: 8, anchor: 'end', weight: 700 });
    const rot = Math.abs(w) > 0.02 ? (w > 0 ? 'cw' : 'ccw') : run ? this.dir() : 0;
    if (rot) s += this.spinArrow(bx, yM + 34, 12, rot) + IE.T(this.dirLabel(rot), 101, yM + 110, { size: 9, anchor: 'middle', weight: 700, col: pr ? undefined : COL.cur });
    return { s, bottom: yM + 118 }; }
};
global.RL = RL;
})(window);
