/* mcp.js — tools of the Motor Control Practice course 031021223 (ปฏิบัติงานควบคุมมอเตอร์) on the ED2 site: the student traces,
   measures, wires and troubleshoots the circuits that Electrical Drawing II draws and simulates. Needs shell.js (MC), iec.js (IEC),
   relay.js (RL.Sim with its mcp.js hooks: sim.fx, sim.afterRender, sim.pT), and for the trainer wiring.js (WD.Wiring); the symbol drill
   needs devdata.js + dev.js (DEVDATA, DEV.credit) and ch2.js (C2.SYMS). Every text is [th, en] / MC.t. Load after them (head snippet
   _head_mcp.txt) with assets/mcp.css.
   0) helpers     MCP.reset(sim) (devices back to the spec), MCP.run(sim, ops) (task / card setups: ['hold', id] ['release', id]
                  ['tap', id] ['toggle', id] ['set', id, v] ['pos', id, at] ['mains', bool] ['wait', s], else C7/C5.runSeq ops),
                  MCP.overlay(sim, key, fn) (svg drawn into the drawing after every render), MCP.targets(sim, 'probe'|'trace'|'answer')
   1) model       MCP.model(sim) the circuit as a network of terminals: control drawing nodes, device terminals, the power circuit
                  (single motor, feeders, three-phase reversing, single-phase DOL); MCP.voltages(sim) node phasors; MCP.resistance(sim,
                  a, b); MCP.measure(sim, a, b, 'V'|'R') one meter reading; MCP.fmtV / fmtR
                  faults: MCP.setFaults(sim, [{ k: 'wire'|'loose'|'open'|'closed'|'fuse'|'swap', … }]) (hidden in the drawing,
                  real in the behaviour and in the meter), MCP.isFaultAt(f, hit), MCP.faultText(sim, f)
   2) MCP.Trace(el, sim, tasks, o)        tap a current path from L1 to N through the load asked for; per-tap feedback; "show me"
   3) MCP.Meter(el, sim, o)               virtual multimeter (V~ and Ω) with two probes on the drawing; MCP.FaultCards(el, meter,
                                          cards, o) "find the fault with at most N measurements", scored
   4) MCP.TRAINER                         the department trainer as data (zones, rails, device kinds and positions, models, -X1 use,
                                          lead colours, example meter values): replace it from photos of the real trainer
      MCP.trAssign / trRef / trCompare / trChecklist   circuit devices → trainer slots, the reference wiring (WD.Wiring for the control
                                          circuit through -X2, the power circuit and motor box built here), leads against it
      MCP.Trainer(el, sim, o)             the trainer view: tap two sockets = one lead; checklist; check; power on only when correct
   5) MCP.SymbolDrill(el, ids, o)         symbol ↔ photo ↔ name ↔ terminal numbers, scored
   Example values (coil 560 Ω, lamp 1.5 kΩ …) are labelled as such wherever they are shown. Test page (private):
   scratchpad/mcp/engine_test.html.
   chapter 8 additions (22 Oct 2026, MCP week 10; circuits without power.sd behave and measure exactly as before):
                  star-delta power circuits (relay.js power.sd, ch8.js): MCP.powerNet takes the edges of sim.sdNet() (wires, poles,
                  windings R.winding, terminal-box links), so the ohmmeter reads 2R per line pair through KM1 + KM2 (star), 2R/3 through
                  KM1 + KM3 (delta), open for a straight-through delta, R/2 + open for a transposition; the supply is power.sd.V
                  (lab: 220 V line to line, 127 V to N). With V below 300 V (the trainer's low-voltage supply) the control circuit keeps
                  its own 230 V L–N source, switched like the drawing's control supply (sim.supplyOn()), with N common.
                  MCP.reset clears the star-delta state (speed, F2 heat, changeover); MCP.run hands the ch8.js ops ('weld', 'sd', 'T',
                  'load', 'sdx' …) of a star-delta simulator to C8.runSeq. Faults: { k: 'sd', set: { order, in3, open, bridge, links,
                  set, motorV }, at: ['KM3:2', …], text: [th, en] } = power-circuit wiring hidden in the drawing (the simulator and
                  the meter follow it); { k: 'sub', t: 'KM1:13', d: 'KM2' } = the leads of that contact sit on another device's
                  contact of the same numbers. Fault cards may be answered on power terminals ('answer' targets of an sd drawing).
                  Trainer: six-lead motor without terminal-box links (the box option is ignored), -X1 6–8 U1 V1 W1, 9 PE, 10–12
                  W2 U2 V2 (MCP.TRAINER.x1sd), power wiring from sim.sdWires() of the designed circuit, checklist keys L1–L3,
                  U1 V1 W1, W2 U2 V2, 'Y' (the star bridge on KM2 2–4–6); KT1 = the multifunction timer with changeover contacts
                  15–16/18 and 25–26/28. */
(function (global) {
'use strict';
const MCP = {}, IE = global.IEC, T = (th, en) => MC.t(th, en), tt = p => (Array.isArray(p) ? MC.t(p[0], p[1]) : p === undefined || p === null ? '' : String(p));
const NS = 'http://www.w3.org/2000/svg', SQ3 = Math.sqrt(3), UVW = ['U1', 'V1', 'W1'];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f1 = v => +(+v).toFixed(1);
let UID = 0;
MCP.tt = tt; MCP.esc = esc;

/* ---------------- 0) helpers ---------------- */
/* name of a device as drawn (label or id) */
MCP.name = (sim, id) => (sim.dev[id] && sim.dev[id].label) || id;
/* every device back to the state the RL.Sim constructor gives it (the fault hook sim.fx stays), supply on, then one update */
MCP.reset = sim => {
  Object.entries(sim.spec.devices).forEach(([id, d]) => { const o = sim.dev[id] || (sim.dev[id] = {}); Object.keys(o).forEach(k => { delete o[k]; });
    Object.assign(o, { id, ...d, on: d.on ?? (d.type === 'cb'), pressed: false, energized: false, tripped: false, blown: false, tOn: 0, hold: 0, mid: false, midLeft: 0,
      at: d.at ?? (d.positions ? d.positions[Math.floor(d.positions.length / 2)] : undefined) }); });
  sim.mains = true; sim.msg = ''; sim.spd = 0; sim.cs = true; sim.held = null; sim._cut = false; if (sim.w !== undefined) sim.w = 0; sim.pshort = null;
  if (MCP.isSD(sim)) { sim.sdw = 0; sim.sdTh = 0; sim.sdF2 = 0; sim.sdIL = 0; sim.sdSw = null; sim.sdBlips = 0; sim.sdR = null; sim.sdCause = null; }   // chapter 8: motor at rest, F2 cold
  sim.update(); return sim; };
/* a star-delta simulator (relay.js power.sd) */
MCP.isSD = sim => !!(sim && sim.spec && sim.spec.power && sim.spec.power.sd && sim.sdNet);
/* run a list of operations on a simulator (task setup, fault-card setup). ops: ['hold', id…] ['release', id…] ['tap', id…] (press and
   release) ['toggle', id…] ['set', id, v] (cb on/off, ol tripped, sel/sen/fault on, msel position) ['pos', id, at] ['mains', bool]
   ['wait', s] (step the timers in 0.02 s steps); any other op goes to C7.runSeq / C5.runSeq when loaded ('start', 'cut', 'fault' …) */
MCP.run = (sim, ops) => { (ops || []).forEach(([op, ...a]) => {
  if (op === 'hold') a.forEach(id => sim.press(id, true));
  else if (op === 'release') a.forEach(id => sim.press(id, false));
  else if (op === 'tap') { a.forEach(id => sim.press(id, true)); a.forEach(id => sim.press(id, false)); }
  else if (op === 'toggle') a.forEach(id => sim.toggle(id));
  else if (op === 'set') { const d = sim.dev[a[0]]; if (!d) return;
    if (d.type === 'cb') { if (!!d.on !== !!a[1]) sim.toggle(a[0]); } else if (d.type === 'ol') { if (!!d.tripped !== !!a[1]) sim.toggle(a[0]); }
    else if (d.type === 'msel') sim.setPos(a[0], a[1]); else if (d.type === 'pb') sim.press(a[0], !!a[1]); else sim.setOn(a[0], a[1]); }
  else if (op === 'pos') sim.setPos(a[0], a[1]);
  else if (op === 'mains') sim.setMains(a[0] !== false);
  else if (op === 'wait') { let left = +a[0] || 0; while (left > 1e-9) { const d = Math.min(0.02, left); sim.step(d); left -= d; } }
  else if (global.C8 && C8.runSeq && MCP.isSD(sim)) C8.runSeq(sim, [[op, ...a]]);   // chapter 8 ops (weld, T, load, sdx …), the rest through C7
  else if (global.C7 && C7.runSeq) C7.runSeq(sim, [[op, ...a]]); else if (global.C5 && C5.runSeq) C5.runSeq(sim, [[op, ...a]]); });
  return sim; };
/* the drawing's own svg (inner svg.rl-in of a framed drawing, or the drawing itself) */
MCP.inner = sim => (sim.el && sim.el.querySelector ? sim.el.querySelector('svg.rl-in') || sim.el.querySelector('svg.rl') : null);
/* an overlay group drawn into the drawing after every render (relay.js hook sim.afterRender); fn(sim) → svg markup; key names it */
MCP.overlay = (sim, key, fn) => { if (!sim.afterRender) sim.afterRender = [];
  let h = sim.afterRender.find(x => x.mcpKey === key);
  if (!h) { h = s => MCP.paint(s, key, h.fn); h.mcpKey = key; sim.afterRender.push(h); }
  h.fn = fn; MCP.paint(sim, key, fn); return h; };
MCP.paint = (sim, key, fn) => { const svg = MCP.inner(sim); if (!svg) return null; let g = svg.querySelector(`g.mcp-ov[data-k="${key}"]`);
  if (!g) { g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'mcp-ov'); g.setAttribute('data-k', key); svg.appendChild(g); }
  g.innerHTML = fn ? fn(sim) : ''; return g; };
/* pointer event → inner drawing coordinates [x, y] (through an overlay group, which lives in those coordinates) */
MCP.local = (sim, ev) => { const svg = MCP.inner(sim); if (!svg) return null; const g = svg.querySelector('g.mcp-ov') || svg, m = g.getScreenCTM && g.getScreenCTM(); if (!m) return null;
  const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse()); return [p.x, p.y]; };
const dSeg = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L)) : 0;
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy); };
MCP.dSeg = dSeg;

/* ---------------- 1) the circuit as a network of terminals (control + power), solved for voltage or resistance ----------------
   Vertices: 'c:<node>' a point of the control drawing ('c:L' top rail, 'c:N' N rail, 'c:x,y', 'c:~…' a private node of a fault),
   't:<i>:<j>' terminal j (0 top, 1 bottom) of element i of spec.els (the screw of the device), 'p:<dev>:<terminal>' a power terminal
   ('p:Q1:2', 'p:KM2:5', 'p:M1:U1', 'p:SUP:L1' supply, 'p:M1:*' the motor's star point). Edges: k 'c' conductor (wire, closed contact,
   fuse, closed pole, heater), 'r' resistance r (coil, lamp, winding: example values MCP.TRAINER.R), 'x' capacitor (conducts AC, open
   for an ohmmeter), 'o' open. The control rails join the power circuit where relay.js draws the tap (after Q1, or ahead of it). */
MCP.model = (sim, o = {}) => {
  const S = sim.spec, R = { ...MCP.TRAINER.R, ...(o.R || {}) }, edges = [], add = (a, b, k, r, src) => { edges.push({ a, b, k, r: r || 0, src: src || {} }); };
  const Rof = e => { const d = sim.dev[e.d] || {}; return e.k === 'lamp' ? R.lamp : d.type === 'timer' ? R.timer : /^KA/.test(e.d) ? R.relay : R.coil; };
  (sim.r ? sim.r.E : []).forEach(x => {
    if (x.e.k === 'w') { add('c:' + x.a, 'c:' + x.b, x.cond ? 'c' : 'o', 0, { w: x.i, pa: x.pa, pb: x.pb }); return; }
    const ta = `t:${x.i}:0`, tb = `t:${x.i}:1`; add(ta, 'c:' + x.a, 'c', 0, { link: x.i, j: 0 }); add(tb, 'c:' + x.b, 'c', 0, { link: x.i, j: 1 });
    if (x.load) add(ta, tb, 'r', Rof(x.e), { el: x.i }); else add(ta, tb, x.cond ? 'c' : 'o', 0, { el: x.i }); });
  const pw = MCP.powerNet(sim, add, R), src = {}, on = sim.mains !== false;
  if (pw && pw.sep) {   // chapter 8 lab: the power circuit on the trainer's low-voltage supply, the control circuit on its own 230 V (N common)
    const A = pw.V / SQ3; if (S.els.length) { add('c:N', pw.N, 'c', 0, { tap: 1 }); if (sim.supplyOn()) src['c:L'] = [230, 0]; }
    if (on) pw.sup.forEach(k => { const ph = k.slice(6); src[k] = ph === 'L1' ? [A, 0] : ph === 'L2' ? [-A / 2, -A / 2 * SQ3] : ph === 'L3' ? [-A / 2, A / 2 * SQ3] : [0, 0]; }); }
  else if (pw) { if (S.els.length) { add('c:L', pw.L, 'c', 0, { tap: 1 }); add('c:N', pw.N, 'c', 0, { tap: 1 }); }
    if (on) pw.sup.forEach(k => { const ph = k.slice(6); src[k] = ph === 'L1' ? [230, 0] : ph === 'L2' ? [-115, -115 * SQ3] : ph === 'L3' ? [-115, 115 * SQ3] : [0, 0]; }); }
  else { if (sim.supplyOn()) src['c:L'] = [230, 0]; if (on) src['c:N'] = [0, 0]; }
  return { edges, src, power: !!pw, R, sep: !!(pw && pw.sep), V: pw && pw.V ? pw.V : 400 };
};
/* power-circuit edges from spec.power (single motor, feeders, three-phase reversing, single-phase DOL; single-phase reversing: none) */
MCP.powerNet = (sim, add, R) => {
  const P = sim.spec.power; if (!P || (P.phases === 1 && P.rev)) return null;
  const closed = st => (st.k === 'cb' ? !!(sim.dev[st.d] || {}).on : st.k === 'mainNO' ? !!sim.act(st.d) : true);
  const chain = (stages, ins) => ins.map((v, p) => { let prev = v; (stages || []).forEach(st => { if (st.k === 'rev') return; const a = `p:${st.d}:${2 * p + 1}`, b = `p:${st.d}:${2 * p + 2}`;
    add(prev, a, 'c', 0, { pw: 1 }); add(a, b, closed(st) ? 'c' : 'o', 0, { pole: st.d }); prev = b; }); return prev; });
  const motor3 = (m, outs) => { outs.forEach((v, k) => { const t = `p:${m}:${UVW[k]}`; add(v, t, 'c', 0, { pw: 1 }); add(t, `p:${m}:*`, 'r', R.winding, { wind: m }); }); add('p:SUP:PE', `p:${m}:PE`, 'c', 0, { pe: 1 }); };
  const S3 = ['p:SUP:L1', 'p:SUP:L2', 'p:SUP:L3'], sup = [...S3, 'p:SUP:N', 'p:SUP:PE'], cb = st => (st || []).find(t => t.k === 'cb');
  const tapL = q => (P.tap === 'before' || !q ? 'p:SUP:L1' : `p:${q.d}:2`);
  if (P.sd && sim.sdNet) {   // chapter 8: the netlist of relay.js (keys without 'p:'; junctions J:… are plain conductor points)
    const N = sim.sdNet(), m = N.cfg.motor, V = +N.cfg.V || 400;
    N.edges.forEach(e => { const a = 'p:' + e.a, b = 'p:' + e.b;
      if (e.k === 'wind') add(a, b, 'r', R.winding, { wind: m, w: e.w });
      else if (e.k === 'link') add(a, b, 'c', 0, { link: m });
      else if (e.k === 'pole') add(a, b, e.cond ? 'c' : 'o', 0, { pole: e.d });
      else add(a, b, e.cond ? 'c' : 'o', 0, { pw: 1, seg: e.seg }); });
    return { L: 'p:' + N.tap.L, N: 'p:' + N.tap.N, sup, V, sep: V < 300 }; }
  if (P.phases === 1) { let L = 'p:SUP:L1', N = 'p:SUP:N'; const st = P.stages || [], m = P.motor || 'M1', q = cb(st);
    st.forEach(t => { if (t.k === 'therm') { [[1, 2], [3, 4], [5, 6]].forEach(([u, v]) => { const a = `p:${t.d}:${u}`, b = `p:${t.d}:${v}`; add(L, a, 'c', 0, { pw: 1 }); add(a, b, 'c', 0, { pole: t.d }); L = b; }); return; }
      const c = closed(t) ? 'c' : 'o'; add(L, `p:${t.d}:1`, 'c'); add(`p:${t.d}:1`, `p:${t.d}:2`, c, 0, { pole: t.d }); add(N, `p:${t.d}:3`, 'c'); add(`p:${t.d}:3`, `p:${t.d}:4`, c, 0, { pole: t.d }); L = `p:${t.d}:2`; N = `p:${t.d}:4`; });
    add(L, `p:${m}:U1`, 'c'); add(N, `p:${m}:U2`, 'c'); add(`p:${m}:U1`, `p:${m}:U2`, 'r', R.run, { wind: m });
    if (P.start) { add(N, `p:${m}:Z2`, 'c'); add(`p:${m}:Z1`, `p:${m}:Z2`, 'r', R.start, { wind: m }); add(`p:${m}:U1`, `p:${m}:C`, 'x', R.capV, { cap: m }); add(`p:${m}:C`, `p:${m}:Z1`, sim.cs !== false ? 'c' : 'o', 0, { cs: m }); }
    add('p:SUP:PE', `p:${m}:PE`, 'c', 0, { pe: 1 });
    return { L: tapL(q), N: P.tap === 'before' || !q ? 'p:SUP:N' : `p:${q.d}:4`, sup: ['p:SUP:L1', 'p:SUP:N', 'p:SUP:PE'] }; }
  if (P.feeders) { const main = [].concat(P.main || []), bus = chain(main, S3); P.feeders.forEach(f => motor3(f.motor, chain(f.stages, bus))); return { L: tapL(cb(main)), N: 'p:SUP:N', sup }; }
  if (P.rev) { const V = sim.revInfo(), bus = chain(V.pre, S3);
    [[V.fwd, V.fmap], [V.rev, V.map]].forEach(([id, mp]) => mp.forEach((ph, k) => { const a = `p:${id}:${2 * k + 1}`, b = `p:${id}:${2 * k + 2}`; add(bus[ph - 1], a, 'c', 0, { pw: 1 }); add(a, b, sim.act(id) ? 'c' : 'o', 0, { pole: id }); }));
    const outs = [0, 1, 2].map(k => { add(`p:${V.fwd}:${2 * k + 2}`, `p:${V.rev}:${2 * k + 2}`, 'c', 0, { pw: 1 }); return `p:${V.fwd}:${2 * k + 2}`; });
    motor3(P.motor || 'M1', chain(V.post, outs)); return { L: tapL(cb(V.pre)), N: 'p:SUP:N', sup }; }
  motor3(P.motor || 'M1', chain(P.stages, S3)); return { L: tapL(cb(P.stages)), N: 'p:SUP:N', sup };
};
/* union-find over the conductor edges (k 'c'); rOpen: capacitors count as open (ohmmeter) */
const groups = edges => { const par = new Map(), f = k => { if (!par.has(k)) par.set(k, k); let r = k; while (par.get(r) !== r) r = par.get(r); par.set(k, r); return r; };
  edges.forEach(e => { f(e.a); f(e.b); if (e.k === 'c') { const a = f(e.a), b = f(e.b); if (a !== b) par.set(a, b); } }); return f; };
/* Gaussian elimination with partial pivoting: A (n × n) x = B (n × m columns); A and B are changed */
const gauss = (A, B) => { const n = A.length, m = n ? B[0].length : 0;
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-15) continue; [A[c], A[p]] = [A[p], A[c]]; [B[c], B[p]] = [B[p], B[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const k = A[r][c] / A[c][c]; if (!k) continue; for (let j = c; j < n; j++) A[r][j] -= k * A[c][j]; for (let j = 0; j < m; j++) B[r][j] -= k * B[c][j]; } }
  return B.map((row, i) => row.map(v => (Math.abs(A[i][i]) < 1e-15 ? 0 : v / A[i][i]))); };
/* node voltages (phasors [re, im] in volts) of the whole network in its present state; V(vertex) → [re, im] or null (not connected
   to the supply at all: a meter reads 0 V there); .short = two sources in one conductor group */
MCP.voltages = (sim, o = {}) => {
  const M = MCP.model(sim, o), f = groups(M.edges), fix = new Map(); let short = false;
  Object.entries(M.src).forEach(([k, v]) => { const g = f(k); if (fix.has(g)) { const w = fix.get(g); if (Math.abs(w[0] - v[0]) + Math.abs(w[1] - v[1]) > 1) short = true; } else fix.set(g, v); });
  const adj = new Map(), link = (a, b, g) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push([b, g]); };
  M.edges.forEach(e => { if (e.k !== 'r' && e.k !== 'x') return; const a = f(e.a), b = f(e.b), g = 1 / Math.max(e.r, 1e-6); if (a !== b) { link(a, b, g); link(b, a, g); } });
  const seen = new Set([...fix.keys()]), q = [...fix.keys()]; while (q.length) { const u = q.shift(); (adj.get(u) || []).forEach(([v]) => { if (!seen.has(v)) { seen.add(v); q.push(v); } }); }
  const unk = [...seen].filter(g => !fix.has(g)), idx = new Map(unk.map((g, i) => [g, i])), n = unk.length;
  const A = Array.from({ length: n }, () => new Array(n).fill(0)), B = Array.from({ length: n }, () => [0, 0]);
  unk.forEach((g, i) => (adj.get(g) || []).forEach(([h, c]) => { A[i][i] += c; if (idx.has(h)) A[i][idx.get(h)] -= c; else if (fix.has(h)) { const v = fix.get(h); B[i][0] += c * v[0]; B[i][1] += c * v[1]; } }));
  const X = n ? gauss(A, B) : [], val = new Map(); fix.forEach((v, g) => val.set(g, v)); unk.forEach((g, i) => val.set(g, X[i]));
  const V = k => { const g = f(k); return val.has(g) ? val.get(g) : null; };
  return { V, group: f, short, model: M };
};
/* resistance between two vertices with every source removed: 0 (same conductor group), a finite value, or Infinity (OL);
   loads: the resistances found directly between the two groups (to name "coil KM1") */
MCP.resistance = (sim, a, b, o = {}) => {
  const M = o.model || MCP.model(sim, o), f = groups(M.edges), A = f(a), Bg = f(b); if (A === Bg) return { r: 0, loads: [] };
  const adj = new Map(), link = (u, v, g) => { if (!adj.has(u)) adj.set(u, []); adj.get(u).push([v, g]); }, loads = [];
  M.edges.forEach(e => { if (e.k !== 'r') return; const u = f(e.a), v = f(e.b), g = 1 / Math.max(e.r, 1e-6); if (u === v) return; link(u, v, g); link(v, u, g);
    if ((u === A && v === Bg) || (u === Bg && v === A)) loads.push(e); });
  const seen = new Set([A]), q = [A]; while (q.length) { const u = q.shift(); (adj.get(u) || []).forEach(([v]) => { if (!seen.has(v)) { seen.add(v); q.push(v); } }); }
  if (!seen.has(Bg)) return { r: Infinity, loads: [] };
  const unk = [...seen].filter(g => g !== Bg), idx = new Map(unk.map((g, i) => [g, i])), n = unk.length;
  const Mx = Array.from({ length: n }, () => new Array(n).fill(0)), RHS = Array.from({ length: n }, (_, i) => [unk[i] === A ? 1 : 0]);
  unk.forEach((g, i) => (adj.get(g) || []).forEach(([h, c]) => { Mx[i][i] += c; if (idx.has(h)) Mx[i][idx.get(h)] -= c; }));
  const X = gauss(Mx, RHS); return { r: X[idx.get(A)][0], loads };
};
/* one measurement between vertices a (red probe) and b (black probe). mode 'V' (AC volts) or 'R' (ohms, supply must be off).
   Returns { mode, v | r, live, float, text, note, loads } */
MCP.measure = (sim, a, b, mode = 'V', o = {}) => {
  const sol = MCP.voltages(sim, o), Va = sol.V(a), Vb = sol.V(b), mag = (p, q) => Math.hypot((p ? p[0] : 0) - (q ? q[0] : 0), (p ? p[1] : 0) - (q ? q[1] : 0));
  if (mode === 'V') { const fl = !Va || !Vb, v = fl ? 0 : mag(Va, Vb), r = { mode, v, float: fl, text: MCP.fmtV(v), note: fl ? 'float' : '' };   // a point with no connection at all: the meter reads 0 V
    if (sol.model.sep) { const side = k => (/^p:/.test(k) ? (/^p:(SUP:N|SUP:PE|M1:PE)$/.test(k) ? 0 : 1) : k === 'c:N' ? 0 : 2), A = side(a), B = side(b); r.lv = sol.model.V;   // chapter 8 lab: two supplies
      if (A && B && A !== B && !fl && Math.hypot(Va[0], Va[1]) > 1 && Math.hypot(Vb[0], Vb[1]) > 1) r.two = true; }
    return r; }
  // ohmmeter: refuse on a live circuit (any vertex joined to a probe through conductors or loads has voltage)
  const M = sol.model, all = M.edges.filter(e => e.k !== 'o'), g = groups(all.map(e => ({ ...e, k: 'c' }))), ga = g(a), gb = g(b);
  const live = M.edges.some(e => [e.a, e.b].some(k => { const p = sol.V(k); return p && Math.hypot(p[0], p[1]) > 1 && (g(k) === ga || g(k) === gb); }));
  if (live) return { mode, live: true, r: NaN, text: '- - -', note: 'live' };
  const res = MCP.resistance(sim, a, b, { model: M }); return { mode, r: res.r, live: false, loads: res.loads, text: MCP.fmtR(res.r), note: res.r === 0 ? 'beep' : res.r === Infinity ? 'OL' : 'example' };
};
/* readings as a meter shows them: 0 V, 230 V, 400 V (phase to phase), …; 0.0 Ω, 560 Ω, 1.50 kΩ, OL */
MCP.fmtV = v => (v < 0.5 ? '0 V' : Math.abs(v - 230 * SQ3) < 3 ? '400 V' : `${Math.round(v)} V`);
MCP.fmtR = r => (r === Infinity || r > 4e7 ? 'OL' : r < 0.05 ? '0.0 Ω' : r < 1000 ? `${r < 100 ? r.toFixed(1) : Math.round(r)} Ω` : r < 1e6 ? `${(r / 1000).toFixed(r < 1e4 ? 2 : 1)} kΩ` : `${(r / 1e6).toFixed(2)} MΩ`);

/* ---------------- faults (relay.js hook sim.fx): the drawing stays as designed, the circuit behaves and measures as the fault makes it ----
   fault = { k: 'wire', a: [x, y], b: [x, y] }   open wire: the segment of a wire between grid points a and b is broken (next to a)
           { k: 'loose', t: 'S2:13' }             loose terminal: the wire is not clamped, the device is cut off at that terminal
           { k: 'open', t: 'KM1:13' }             a contact that does not close (stuck open); on a coil or lamp: open winding / filament
           { k: 'closed', t: 'KM1:21' }           a contact that does not open (stuck closed, welded)
           { k: 'fuse', d: 'F1' }                 a blown fuse that looks intact
           { k: 'swap', t: ['S1:12', 'S2:14'] }   the wires on two terminals swapped
   'DEV:T' names a terminal of an element (device id or label, terminal number); any terminal of the element names the element. */
MCP.findEl = (sim, term) => { const [d, t] = String(term).split(':'), els = sim.spec.els;
  for (let i = 0; i < els.length; i++) { const e = els[i]; if (e.k === 'w' || e.d === undefined) continue; const dv = sim.dev[e.d] || {};
    if ((e.d === d || dv.label === d) && (t === undefined || (e.t && e.t.includes(t)))) return { i, j: t === undefined || !e.t ? 0 : e.t.indexOf(t), e }; }
  return null; };
MCP.resolve = (sim, f) => { if (!f) return null; const r = { ...f };
  if (f.k === 'sd') return MCP.isSD(sim) ? { ...r, at: (f.at || []).slice(), set: { ...(f.set || {}) } } : null;   // chapter 8: power-circuit wiring
  if (f.k === 'wire') { r.ok = !!sim.spec.els.find(e => e.k === 'w'); return r; }
  if (f.k === 'fuse') { const x = MCP.findEl(sim, f.d || f.t); if (!x) return null; r.i = x.i; return r; }
  if (f.k === 'swap') { const A = MCP.findEl(sim, f.t[0]), B = MCP.findEl(sim, f.t[1]); if (!A || !B) return null; r.A = A; r.B = B; return r; }
  const x = MCP.findEl(sim, f.t); if (!x) return null; r.i = x.i; r.j = x.j; return r; };
const onSeg = (p, a, b) => (a[0] === b[0] ? p[0] === a[0] && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]) : a[1] === b[1] && p[1] === a[1] && p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]));
/* chapter 8: power-circuit wiring faults of a star-delta simulator. The simulator's own sdCfg() returns the faulty set-up (so the motor
   model, the short-circuit trip, the netlist and the meter follow it) except while the drawing is rendered (renderSD sees the design) */
const SDO = { A: ['W2', 'U2', 'V2'], B: ['V2', 'W2', 'U2'], straight: ['U2', 'V2', 'W2'] };
const sdApply = (c, x) => { const o = { ...c };
  if (x.order !== undefined) { o.map = Array.isArray(x.order) ? x.order.slice() : (SDO[x.order] || SDO.A).slice(); o.order = Array.isArray(x.order) ? 'custom' : x.order; }
  ['in3', 'open', 'bridge'].forEach(k => { if (x[k]) o[k] = x[k].slice(); }); ['links', 'set', 'motorV'].forEach(k => { if (x[k] !== undefined) o[k] = x[k]; }); return o; };
MCP.sdHook = sim => { if (sim.mcpSdHook || !MCP.isSD(sim)) return; const P = Object.getPrototypeOf(sim); sim.mcpSdHook = true;
  sim.sdCfg = function () { const c = P.sdCfg.call(this), F = !this.mcpSdOff && c ? (this.mcpFaults || []).filter(f => f.k === 'sd') : []; return F.length ? F.reduce((o, f) => sdApply(o, f.set || {}), c) : c; };
  sim.renderSD = function (...a) { this.mcpSdOff = true; try { return P.renderSD.apply(this, a); } finally { this.mcpSdOff = false; } };
  sim.sdShortMsg = function () { if (!(this.mcpFaults || []).some(f => f.k === 'sd')) return P.sdShortMsg.call(this); const q = this.sdCfg().pre.find(t => t.k === 'cb');   // a hidden fault: the message must not name the cause
    return `<div class="badbox rl-msg">${MC.t(`ลัดวงจรในวงจรกำลัง! ${q ? `${q.d} ตัดแล้ว ` : ''}หาสาเหตุก่อนสับกลับ`, `Short circuit in the power circuit! ${q ? `${q.d} has tripped. ` : ''}Find the cause before switching it on again.`)}</div>`; }; };
MCP.setFaults = (sim, list) => {
  const L = [].concat(list || []).filter(Boolean).map(f => MCP.resolve(sim, f)).filter(Boolean); sim.mcpFaults = L;
  if (L.some(f => f.k === 'sd')) MCP.sdHook(sim);
  if (!L.length) { delete sim.fx; sim.update(); return L; }
  sim.fx = E => { let out = E.slice();
    L.filter(f => f.k === 'swap').forEach(f => { const ka = (x => { const ed = out.find(q => q.i === x.i && q.e.k !== 'w'); return ed ? (x.j ? ed.b : ed.a) : null; }), a = ka(f.A), b = ka(f.B); if (a === null || b === null) return;
      out = out.map(ed => { if (ed.e.k === 'w') return ed; let q = ed; [[f.A, b], [f.B, a]].forEach(([x, k]) => { if (q.i === x.i) q = { ...q, [x.j ? 'b' : 'a']: k }; }); return q; }); });
    L.forEach(f => {
      if (f.k === 'wire') { let best = -1, bd = 1e9; out.forEach((ed, n) => { if (ed.e.k !== 'w' || !ed.pa || !onSeg(ed.pa, f.a, f.b) || !onSeg(ed.pb, f.a, f.b)) return;
          const d = Math.min(Math.hypot(ed.pa[0] - f.a[0], ed.pa[1] - f.a[1]), Math.hypot(ed.pb[0] - f.a[0], ed.pb[1] - f.a[1])); if (d < bd) { bd = d; best = n; } });
        if (best >= 0) out[best] = { ...out[best], e: { ...out[best].e, open: true } }; }
      else if (f.k === 'loose') out = out.map(ed => (ed.i === f.i && ed.e.k !== 'w' ? { ...ed, [f.j ? 'b' : 'a']: `~loose:${f.i}:${f.j}` } : ed));
      else if (f.k === 'open' || f.k === 'fuse') out = out.map(ed => (ed.i === f.i && ed.e.k !== 'w' ? { ...ed, e: { ...ed.e, open: true } } : ed));
      else if (f.k === 'closed') out = out.map(ed => (ed.i === f.i && ed.e.k !== 'w' ? { ...ed, e: { ...ed.e, welded: true } } : ed));
      else if (f.k === 'sub') out = out.map(ed => (ed.i === f.i && ed.e.k !== 'w' ? { ...ed, e: { ...ed.e, d: f.d } } : ed)); });   // the contact follows another device
    return out; };
  sim.update(); return L; };
/* does a tap (hit = { kind: 'term', i, j } | { kind: 'el', i } | { kind: 'seg', i, pa, pb }) point at the fault f? */
MCP.isFaultAt = (f, hit) => { if (!f || !hit) return false;
  if (f.k === 'sd') return hit.kind === 'pterm' && (hit.keys || []).some(k => (f.at || []).includes(k));
  if (hit.kind === 'pterm') return false;
  if (f.k === 'wire') return hit.kind === 'seg' && !!hit.pa && onSeg(hit.pa, f.a, f.b) && onSeg(hit.pb, f.a, f.b);
  if (f.k === 'swap') return hit.kind === 'term' && [f.A, f.B].some(x => x.i === hit.i && x.j === hit.j);
  if (f.k === 'loose') return (hit.kind === 'term' && hit.i === f.i && hit.j === f.j) || (hit.kind === 'el' && hit.i === f.i);
  return (hit.kind === 'el' || hit.kind === 'term') && hit.i === f.i; };
/* plain-words description of a fault [th, en] (for the answer of a fault card) */
MCP.faultText = (sim, f) => { const e = f.i !== undefined ? sim.spec.els[f.i] : null, nm = e ? MCP.name(sim, e.d) : '', tm = e && e.t ? `${e.t[0]}–${e.t[1]}` : '';
  switch (f.k) {
    case 'wire': { const no = sim.wireNumbers(), k = sim.nodeKey(f.a[0], f.a[1]), n = no.get(k); return [`สายเส้นที่ ${sim.wireLabel(n)} ขาด (ช่วงระหว่างจุด (${f.a}) ถึง (${f.b}) ในแบบ)`, `wire ${sim.wireLabel(n)} is broken (between points (${f.a}) and (${f.b}) of the drawing)`]; }
    case 'loose': return [`ขั้ว ${nm}:${e.t[f.j]} หลวม สายไม่ได้ขันยึด`, `terminal ${nm}:${e.t[f.j]} is loose: the wire is not clamped`];
    case 'open': return e.k === 'coil' || e.k === 'lamp' ? [`${nm} ${tm} ขาดใน (ขดลวดหรือไส้หลอดขาด)`, `${nm} ${tm} is open inside (broken winding or filament)`] : [`หน้าสัมผัส ${nm} ${tm} ไม่ต่อ (ค้างเปิด)`, `contact ${nm} ${tm} does not close (stuck open)`];
    case 'closed': return [`หน้าสัมผัส ${nm} ${tm} ไม่เปิด (ค้างต่อ หน้าสัมผัสติด)`, `contact ${nm} ${tm} does not open (stuck closed, welded)`];
    case 'fuse': return [`ฟิวส์ ${nm} ขาด (ดูจากภายนอกไม่ออก)`, `fuse ${nm} has blown (you cannot see it from outside)`];
    case 'sd': return f.text || ['วงจรกำลังต่อไม่ตรงตามแบบ', 'the power circuit is not wired as drawn'];
    case 'sub': return [`สายที่ควรอยู่ที่ ${nm} ${tm} ไปต่ออยู่ที่ ${f.d} ${tm} แทน`, `the leads meant for ${nm} ${tm} sit on ${f.d} ${tm} instead`];
    case 'swap': { const a = sim.spec.els[f.A.i], b = sim.spec.els[f.B.i]; const A = `${MCP.name(sim, a.d)}:${a.t[f.A.j]}`, B = `${MCP.name(sim, b.d)}:${b.t[f.B.j]}`; return [`สายที่ขั้ว ${A} กับ ${B} สลับกัน`, `the wires on ${A} and ${B} are swapped`]; }
    default: return ['', '']; } };

/* ---------------- targets in the drawing (inner coordinates) ----------------
   MCP.targets(sim, what) → [{ kind, v (vertex), x, y | x1 y1 x2 y2, lab, i, j }]; what: 'probe' (device terminals, rails, power
   terminals) or 'trace' (element bodies, wire segments, rails) or 'answer' (terminals, element bodies, wire segments). */
MCP.targets = (sim, what = 'probe') => {
  const S = sim.spec, out = [], X = v => sim.X(v), Y = v => sim.Y(v), ctl = S.els.length > 0, nos = sim.wireNumbers();
  const wl = k => { const n = nos.get(k); return n === undefined ? '' : T(`สาย ${sim.wireLabel(n)}`, `wire ${sim.wireLabel(n)}`); };
  if (what !== 'trace') S.els.forEach((e, i) => { if (e.k === 'w' || !e.t || e.k === 'earth') return; const x = X(e.x), y0 = Y(e.y), y1 = Y(e.y + (e.h || 1)), nm = MCP.name(sim, e.d);
    out.push({ kind: 'term', v: `t:${i}:0`, x, y: y0 + 8, i, j: 0, lab: `${nm}:${e.t[0]}`, wire: wl(sim.nodeKey(e.x, e.y)) },
      { kind: 'term', v: `t:${i}:1`, x, y: y1 - 8, i, j: 1, lab: `${nm}:${e.t[1]}`, wire: wl(sim.nodeKey(e.x, e.y + (e.h || 1))) }); });
  if (what !== 'probe') {
    S.els.forEach((e, i) => { if (e.k === 'w') return; const x = X(e.x), y0 = Y(e.y), y1 = Y(e.y + (e.h || 1)), nm = MCP.name(sim, e.d);
      out.push({ kind: 'el', i, x, y: (y0 + y1) / 2, box: [x - 22, y0 + 12, 44, Math.max(12, y1 - y0 - 24)], lab: `${nm}${e.t ? ' ' + e.t.join('–') : ''}` }); });
    (sim.r ? sim.r.E : []).forEach(ed => { if (ed.e.k !== 'w' || !ed.pa) return; out.push({ kind: 'seg', i: ed.i, pa: ed.pa, pb: ed.pb, a: ed.a, b: ed.b, x1: X(ed.pa[0]), y1: Y(ed.pa[1]), x2: X(ed.pb[0]), y2: Y(ed.pb[1]), lab: wl(ed.a) }); }); }
  if (ctl) { const xs = S.els.flatMap(e => (e.pts ? e.pts.map(p => p[0]) : [e.x])), xa = sim.railX0 !== undefined ? sim.railX0 : X(Math.min(...xs)) - 30, xb = X(Math.max(...xs)) + 30;
    out.push({ kind: 'rail', v: 'c:L', node: 'L', x1: xa, y1: Y(0), x2: xb, y2: Y(0), lab: T(`ราว ${S.railTop || 'L1'}`, `${S.railTop || 'L1'} rail`) },
      { kind: 'rail', v: 'c:N', node: 'N', x1: xa, y1: Y(S.rows), x2: xb, y2: Y(S.rows), lab: T(`ราว ${S.railBot || 'N'}`, `${S.railBot || 'N'} rail`) }); }
  if ((what === 'probe' || (what === 'answer' && MCP.isSD(sim))) && sim.pT && S.power && !(S.power.phases === 1 && S.power.rev)) {   /* chapter 8: an sd fault card is answered on the power terminals too */ /* only power terminals the model knows (single-phase reversing: control circuit only) */ const at = new Map(); Object.entries(sim.pT).forEach(([k, p]) => { const id = `${p[0]},${p[1]}`; if (!at.has(id)) at.set(id, { x: p[0], y: p[1], keys: [] }); at.get(id).keys.push(k); });
    at.forEach(q => out.push({ kind: 'pterm', v: 'p:' + q.keys[0], keys: q.keys, x: q.x, y: q.y, lab: q.keys.map(k => k.replace(/^SUP:/, '')).join(' / ') })); }
  return out; };
/* nearest target to point p: points within r (default 15), then segments, boxes and rails within 9 */
MCP.hit = (tg, p, r = 15) => { if (!p) return null; let best = null, bd = r;
  tg.forEach(t => { if (t.kind === 'term' || t.kind === 'pterm') { const d = Math.hypot(p[0] - t.x, p[1] - t.y); if (d < bd) { bd = d; best = t; } } });
  if (best) return best; bd = 9;
  tg.forEach(t => { let d = 1e9; if (t.kind === 'el') { const [x, y, w, h] = t.box; d = p[0] >= x && p[0] <= x + w && p[1] >= y && p[1] <= y + h ? 0 : 1e9; }
    else if (t.kind === 'seg' || t.kind === 'rail') d = dSeg(p[0], p[1], t.x1, t.y1, t.x2, t.y2); if (d < bd) { bd = d; best = t; } });
  return best; };
/* the transparent hit layer of a tool (data-mt = tool key, data-n = index into its targets) */
const hitLayer = (key, tg) => tg.map((t, n) => (t.kind === 'el' ? `<rect data-mt="${key}" data-n="${n}" x="${f1(t.box[0])}" y="${f1(t.box[1])}" width="${t.box[2]}" height="${f1(t.box[3])}" fill="rgba(0,0,0,0)" stroke="none" pointer-events="all" style="cursor:pointer"/>`
  : t.kind === 'seg' || t.kind === 'rail' ? `<line data-mt="${key}" data-n="${n}" x1="${f1(t.x1)}" y1="${f1(t.y1)}" x2="${f1(t.x2)}" y2="${f1(t.y2)}" stroke="rgba(0,0,0,0)" stroke-width="14" pointer-events="stroke" style="cursor:pointer"/>`
  : `<circle data-mt="${key}" data-n="${n}" cx="${f1(t.x)}" cy="${f1(t.y)}" r="11" fill="rgba(0,0,0,0)" stroke="none" pointer-events="all" style="cursor:crosshair"/>`)).join('');
/* the target under a click: its own hit element first, else the nearest target to the pointer */
const pick = (tool, ev) => { const g = ev.target.closest && ev.target.closest(`[data-mt="${tool.key}"]`); if (!g) return null; const tg = tool.tg || [];
  const p = MCP.local(tool.sim, ev), near = p ? MCP.hit(tg, p) : null; return near || tg[+g.getAttribute('data-n')] || null; };
MCP.hitLayer = hitLayer;
/* the status line (MC.ui.setStatus when the shell is there) */
const status = (el, pill, text, kind) => { if (!el) return; if (MC.ui && MC.ui.setStatus) MC.ui.setStatus(el, pill, text, kind); else el.innerHTML = `<span class="pill ${kind || ''}">${pill}</span> ${text}`; };
const btn = (parent, label, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (cls ? ' ' + cls : ''); b.innerHTML = label; b.addEventListener('click', fn); parent.appendChild(b); return b; };
MCP.btn = btn; MCP.status = status;
/* hide the live colours and the moving current of a drawing (print look) while a tool needs the student to find the path himself;
   MCP.hideLive(sim, false) shows them again */
MCP.hideLive = (sim, on = true) => { if (!sim.afterRender) sim.afterRender = [];
  if (!sim.afterRender.some(f => f.mcpHide)) { const f = s => { if (s.mcpHide && s.el && s.el.querySelectorAll) s.el.querySelectorAll('.rl-cur').forEach(g => g.classList.remove('rl-cur')); }; f.mcpHide = true; sim.afterRender.unshift(f); }   // no moving dashes either
  if (on && !sim.mcpHide) sim.mcpPrint = !!sim.o.print; sim.mcpHide = !!on; sim.o.print = on ? true : !!sim.mcpPrint; if (sim.r) sim.render(); };

/* ---------------- 2) MCP.Trace: trace a current path from L1 to N ----------------
   new MCP.Trace(el, sim, tasks, o): el = the task panel (ask, feedback, the path so far, buttons); the student taps the devices (or
   wires) of one current path in order, starting at the L1 rail and ending at N. Wires between two tapped devices are filled in by
   themselves. Each tap is checked: it must join the end of the path so far, a contact must be closed in the present state, and the
   only load on the way must be the one asked for; the path is complete when it has passed that load and reached N.
   tasks: [{ ask: [th, en], setup: [ops of MCP.run], load: 'KM1', hint: [th, en] }]; before each task the simulator is reset and the
   setup run. o: hideLive (default true: the drawing shows no live colours while tracing), keep (no reset between tasks), onDone(k,
   mistakes, shown). Methods: go(k), restart(), show() ("show me": the path animated device by device), tapItem(target) (tests). */
MCP.Trace = class {
  constructor(el, sim, tasks, o = {}) {
    this.el = el; this.sim = sim; this.tasks = tasks || []; this.o = o; this.key = 'tr' + (++UID); this.k = 0; this.res = this.tasks.map(() => null);
    if (o.hideLive !== false) MCP.hideLive(sim, true);
    if (el) { el.classList.add('mcp-trace');
      el.innerHTML = '<div class="mcp-tasks toggles"></div><div class="mcp-ask"></div><div class="status mcp-st"></div><div class="mcp-path"></div><div class="toggles mcp-tb"></div><div class="mcp-score"></div>';
      const q = s => el.querySelector(s); this.tEl = q('.mcp-tasks'); this.aEl = q('.mcp-ask'); this.sEl = q('.mcp-st'); this.pEl = q('.mcp-path'); this.scEl = q('.mcp-score');
      const tb = q('.mcp-tb'); btn(tb, T('เริ่มเส้นทางใหม่', 'Start the path again'), () => this.restart()); btn(tb, T('ดูเฉลย: แสดงทางเดินกระแส', 'Show me the path'), () => this.show());
      this.nextB = btn(tb, T('ข้อต่อไป ▸', 'Next task ▸'), () => this.go(Math.min(this.tasks.length - 1, this.k + 1))); }
    if (sim.el && sim.el.addEventListener) sim.el.addEventListener('click', e => { const t = pick(this, e); if (t) { e.stopPropagation(); this.tapItem(t); } });
    MCP.overlay(sim, this.key, () => this.svg());
    this.go(0);
  }
  task() { return this.tasks[this.k] || {}; }
  go(k) { this.k = k; this.stopShow(); const t = this.task(); if (!this.o.keep) MCP.reset(this.sim); MCP.run(this.sim, t.setup); this.restart(true);
    if (this.aEl) this.aEl.innerHTML = `<p class="lead"><b>${T('ข้อ', 'Task')} ${k + 1}/${this.tasks.length}</b> ${tt(t.ask)}</p>` + (t.hint ? `<p class="hint">${tt(t.hint)}</p>` : '');
    this.bar(); }
  bar() { if (!this.tEl) return; this.tEl.innerHTML = ''; this.tasks.forEach((t, i) => { const r = this.res[i], b = btn(this.tEl, `${i + 1}${r ? (r.shown ? ' ·' : ' ✓') : ''}`, () => this.go(i), i === this.k ? 'on' : ''); b.title = tt(t.ask).replace(/<[^>]+>/g, ''); });
    if (this.scEl) { const ok = this.res.filter(r => r && !r.shown).length, clean = this.res.filter(r => r && !r.shown && !r.miss).length;
      this.scEl.innerHTML = `<span class="fscore">${T(`ทำได้ ${ok}/${this.tasks.length} ข้อ (ไม่ผิดเลย ${clean} ข้อ)`, `${ok}/${this.tasks.length} traced (${clean} without a mistake)`)}</span>`; } }
  restart(fresh) { this.stopShow(); this.items = []; this.cur = 'L'; this.used = new Set(['L']); this.passed = false; this.complete = false; this.bad = null;
    if (fresh) { this.miss = 0; this.shown = false; } this.say(T('เริ่ม', 'start'), T('แตะอุปกรณ์ตัวแรกที่ต่อกับราว L1 แล้วไล่ตามทางเดินกระแสไปจนถึง N', 'Tap the first device on the L1 rail, then follow the current path down to N'), 'wait'); this.draw(); }
  say(p, s, k) { this.msg = [p, s, k]; status(this.sEl, p, s, k); }
  E() { return this.sim.r ? this.sim.r.E : []; }
  edgeOf(t) { return t.kind === 'el' ? this.E().find(ed => ed.i === t.i && ed.e.k !== 'w') : t.kind === 'seg' ? this.E().find(ed => ed.i === t.i && ed.e.k === 'w' && ed.pa && ed.pa[0] === t.pa[0] && ed.pa[1] === t.pa[1] && ed.pb[0] === t.pb[0] && ed.pb[1] === t.pb[1]) : null; }
  /* conducting wires only, from node s to any node of the set want, never through a node already used: the list of wire edges, or null */
  wires(s, want) { if (want.has(s)) return []; const prev = new Map([[s, null]]), q = [s];
    while (q.length) { const u = q.shift(); for (const ed of this.E()) { if (ed.e.k !== 'w' || !ed.cond) continue; const v = ed.a === u ? ed.b : ed.b === u ? ed.a : null; if (v === null || prev.has(v) || (this.used.has(v) && !want.has(v))) continue;
        prev.set(v, [u, ed]); if (want.has(v)) { const path = []; let x = v; while (prev.get(x)) { const [p, e] = prev.get(x); path.unshift({ ed: e, from: p, to: x }); x = p; } return path; } q.push(v); } }
    return null; }
  lab(ed) { if (ed.e.k === 'w') return ''; const nm = MCP.name(this.sim, ed.e.d); return `${nm}${ed.e.t ? ' ' + ed.e.t.join('–') : ''}`; }
  /* one tap; returns { ok, why } (why: 'done', 'again', 'far', 'open', 'load', 'start', 'N') */
  tapItem(t) {
    if (this.showing) return { ok: false, why: 'busy' }; if (this.complete) { this.say('✓', T('ทางเดินกระแสครบแล้ว กดข้อต่อไป หรือเริ่มใหม่', 'The path is complete: go on to the next task, or start again'), 'good'); return { ok: false, why: 'done' }; }
    const load = this.task().load, nm = id => MCP.name(this.sim, id);
    if (t.kind === 'rail') { if (t.node === 'L') { this.say(T('ราว L1', 'L1 rail'), T('ทางเดินกระแสเริ่มที่ราวนี้ แตะอุปกรณ์ตัวแรกที่ต่อกับมัน', 'The path starts on this rail: tap the first device on it'), 'wait'); return { ok: false, why: 'start' }; }
      const w = this.passed ? this.wires(this.cur, new Set(['N'])) : null;
      if (w) { w.forEach(s => this.push(s.ed, s.to)); this.finish(); return { ok: true, why: 'N' }; }
      return this.no(this.passed ? T('ยังไปไม่ถึง N: ยังมีอุปกรณ์อยู่ระหว่างทาง', 'Not at N yet: there is still a device on the way') : T(`กระแสต้องผ่าน ${nm(load)} ก่อนถึง N`, `The current must pass ${nm(load)} before it reaches N`), 'far'); }
    const ed = this.edgeOf(t); if (!ed) return { ok: false, why: 'none' };
    if (this.items.some(x => x.ed.i === ed.i && x.ed.a === ed.a && x.ed.b === ed.b)) return this.no(T(`${this.lab(ed) || T('สายเส้นนี้', 'This wire')} อยู่ในเส้นทางแล้ว`, `${this.lab(ed) || 'This wire'} is already in your path`), 'again');
    const ends = new Set([ed.a, ed.b]), w = this.wires(this.cur, ends);
    if (!w) return this.no(ed.e.k === 'w' ? T('สายเส้นนี้ไม่ได้ต่อกับปลายเส้นทางที่ไล่มาถึง ไล่ต่อจากจุดที่หยุดไว้', 'This wire does not join the end of your path: carry on from where you stopped')
      : T(`${this.lab(ed)} ไม่ได้ต่อกับปลายเส้นทางที่ไล่มาถึง (ต่อจาก ${this.lastLab()})`, `${this.lab(ed)} does not join the end of your path (after ${this.lastLab()})`), 'far');
    const at = w.length ? w[w.length - 1].to : this.cur, other = ed.a === at ? ed.b : ed.a;
    if (this.used.has(other) && other !== 'N') return this.no(T('ย้อนกลับไปทางเดิมไม่ได้', 'You cannot go back along the path'), 'again');
    if (other === 'N' && !ed.load && !this.passed) return this.no(T(`ทางนี้ถึง N โดยไม่ผ่าน ${nm(load)}: นั่นคือการลัดวงจร ไม่ใช่ทางเดินกระแสของโหลด`, `This reaches N without passing ${nm(load)}: that would be a short circuit, not the path of the load`), 'short');
    if (ed.load) { if (ed.e.d !== load) return this.no(T(`${this.lab(ed)} เป็นโหลดอีกตัวหนึ่ง กระแสของ ${nm(load)} ไม่ผ่านโหลดนั้น`, `${this.lab(ed)} is another load: the current of ${nm(load)} does not pass through it`), 'load'); }
    else if (ed.e.k !== 'w' && !ed.cond) return this.no(ed.e.k === 'fuse' ? T(`${this.lab(ed)} ขาด กระแสผ่านไม่ได้`, `${this.lab(ed)} has blown: no current can pass`) : T(`${this.lab(ed)} เปิดอยู่ในสภาวะนี้ กระแสผ่านไม่ได้ มีทางอื่นอ้อมไปไหม`, `${this.lab(ed)} is open in this state: no current can pass. Is there another way round it?`), 'open');
    else if (ed.e.k === 'w' && !ed.cond) return this.no(T('สายเส้นนี้ขาด', 'This wire is broken'), 'open');
    w.forEach(s => this.push(s.ed, s.to)); this.push(ed, other); if (ed.load) this.passed = true;
    if (other === 'N' || (this.passed && this.wires(this.cur, new Set(['N'])))) { (this.wires(this.cur, new Set(['N'])) || []).forEach(s => this.push(s.ed, s.to)); this.finish(); return { ok: true, why: 'N' }; }
    this.say('✓', ed.e.k === 'w' ? T('ไปตามสายต่อได้', 'Along the wire: go on') : ed.load ? T(`${this.lab(ed)}: นี่คือโหลดที่ถาม ไล่ต่อไปจนถึง N`, `${this.lab(ed)}: this is the load asked for; carry on to N`)
      : T(`${this.lab(ed)} ต่ออยู่ กระแสผ่านได้`, `${this.lab(ed)} is closed: the current passes`), 'good');
    this.draw(); return { ok: true, why: 'step' }; }
  push(ed, to) { this.items.push({ ed, to }); this.used.add(to); this.cur = to; }
  lastLab() { const x = [...this.items].reverse().find(q => q.ed.e.k !== 'w'); return x ? this.lab(x.ed) : T('ราว L1', 'the L1 rail'); }
  no(text, why) { this.miss++; this.bad = why; this.say('✗', text, 'bad'); this.draw(); return { ok: false, why }; }
  finish() { this.complete = true; const r = this.res[this.k] = { miss: this.miss, shown: this.shown };
    this.say('✓', T(`ครบ: ${this.pathText()} (ผิด ${this.miss} ครั้ง)`, `Complete: ${this.pathText()} (${this.miss} mistake${this.miss === 1 ? '' : 's'})`), 'good');
    this.draw(); this.bar(); if (this.o.onDone) this.o.onDone(this.k, r.miss, r.shown); }
  pathText() { return [this.sim.spec.railTop || 'L1', ...this.items.filter(x => x.ed.e.k !== 'w').map(x => this.lab(x.ed)), ...(this.cur === 'N' ? [this.sim.spec.railBot || 'N'] : [])].join(' → '); }
  /* one valid path for "show me": L → (conductors) → the load → (conductors) → N, shortest by number of edges */
  solution() { const E = this.E(), load = this.task().load, L = E.find(ed => ed.load && ed.e.d === load); if (!L) return null;
    const bfs = (s, want, ban) => { const prev = new Map([[s, null]]), q = [s];
      while (q.length) { const u = q.shift(); if (want.has(u)) { const p = []; let x = u; while (prev.get(x)) { const [a, e] = prev.get(x); p.unshift({ ed: e, to: x }); x = a; } return p; }
        for (const ed of E) { if (!ed.cond || ed.load) continue; const v = ed.a === u ? ed.b : ed.b === u ? ed.a : null; if (v === null || prev.has(v) || ban.has(v)) continue; prev.set(v, [u, ed]); q.push(v); } }
      return null; };
    for (const [a, b] of [[L.a, L.b], [L.b, L.a]]) { const p1 = bfs('L', new Set([a]), new Set(['N'])); if (!p1) continue; const p2 = bfs(b, new Set(['N']), new Set(['L', ...p1.map(x => x.to)])); if (!p2) continue; return [...p1, { ed: L, to: b }, ...p2]; }
    return null; }
  show() { this.restart(false); const sol = this.solution(); if (!sol) { this.say('!', T('ในสภาวะนี้ไม่มีทางเดินกระแสครบวงจรไปยังโหลดนี้', 'In this state there is no complete current path to this load'), 'warn'); return; }
    this.shown = true; this.showing = true; let n = 0; const stepT = this.o.stepMs || 380;
    const tick = () => { if (!this.showing) return; while (n < sol.length && sol[n].ed.e.k === 'w') { this.push(sol[n].ed, sol[n].to); n++; }
      if (n < sol.length) { this.push(sol[n].ed, sol[n].to); if (sol[n].ed.load) this.passed = true; n++; this.say('▶', this.pathText(), 'wait'); this.draw(); this.timer = setTimeout(tick, stepT); }
      else { this.showing = false; this.finish(); } };
    tick(); }
  stopShow() { this.showing = false; if (this.timer) clearTimeout(this.timer); this.timer = null; }
  draw() { MCP.paint(this.sim, this.key, () => this.svg()); if (this.pEl) this.pEl.innerHTML = this.items.length ? `<span class="mcp-chain">${esc(this.pathText())}</span>` : ''; }
  /* overlay: the path so far (accent), numbered devices, start and end marks, the hit layer */
  svg() { const sim = this.sim; this.tg = MCP.targets(sim, 'trace'); if (!sim.spec.els.length) return '';
    const X = v => sim.X(v), Y = v => sim.Y(v); let s = '', n = 0;
    (this.items || []).forEach(({ ed }) => { if (ed.e.k === 'w') { if (ed.pa) s += `<line x1="${X(ed.pa[0])}" y1="${Y(ed.pa[1])}" x2="${X(ed.pb[0])}" y2="${Y(ed.pb[1])}" stroke="var(--accent)" stroke-width="6" stroke-opacity=".5" stroke-linecap="round"/>`; return; }
      const e = ed.e, x = X(e.x), y0 = Y(e.y), y1 = Y(e.y + (e.h || 1)); n++;
      s += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="var(--accent)" stroke-width="6" stroke-opacity=".38" stroke-linecap="round"/><rect x="${x - 19}" y="${y0 + 9}" width="38" height="${y1 - y0 - 18}" rx="6" fill="var(--accent)" fill-opacity=".1" stroke="var(--accent)" stroke-width="1.6"/>` +
        `<circle cx="${x + 31}" cy="${(y0 + y1) / 2 - 10}" r="8" fill="var(--accent)" stroke="none"/>` + IE.T(String(n), x + 31, (y0 + y1) / 2 - 6.5, { size: 9.5, anchor: 'middle', weight: 700, col: 'var(--panel)' }); });
    const xa = this.tg.find(t => t.kind === 'rail'); if (xa) { s += IE.T(T('เริ่มที่ราวนี้', 'start on this rail'), xa.x2 - 2, Y(0) - 6, { size: 9, anchor: 'end', weight: 700, col: 'var(--accent)' }) + IE.T(T('จบที่ N', 'end at N'), xa.x2 - 2, Y(sim.spec.rows) + 14, { size: 9, anchor: 'end', weight: 700, col: 'var(--accent)' }); }
    if (this.complete) s += `<line x1="${xa ? xa.x1 : 0}" y1="${Y(sim.spec.rows)}" x2="${xa ? xa.x2 : 0}" y2="${Y(sim.spec.rows)}" stroke="var(--accent)" stroke-width="5" stroke-opacity=".35"/>`;
    return s + hitLayer(this.key, this.tg); }
};

/* ---------------- 3) MCP.Meter: a virtual multimeter on an RL.Sim drawing ----------------
   new MCP.Meter(el, sim, o): el = the meter panel (meter face, mode, probe and supply buttons, reading, explanation, log); the probes
   go on the drawing: tap a device terminal (the screw: 'S2:13'), the L1 or N rail, or a terminal of the power circuit ('Q1:2',
   'M1:U1', the supply L1 L2 L3 N PE). The red probe goes first, then the black one, then they alternate (or pick a probe first).
   Modes: 'V' AC voltage (230 V phase to N, 400 V phase to phase, 0 V across a closed contact or along one wire, 230 V across an open
   contact with the supply on one side and N through a load on the other, 0 V to a point that has no connection at all);
   'R' resistance / continuity: only with the circuit dead (supply isolator off, or Q1 off for a circuit fed after Q1), otherwise a
   warning and no reading: closed contacts and wires 0.0 Ω (beep), coils, lamps and windings with example values (MCP.TRAINER.R:
   real values come from your own trainer), open = OL; parallel paths through other loads are included, as on a real circuit.
   o: mode 'V' | 'R', log (true: a table of the measurements under the meter), power (true: the supply isolator button), onMeasure(rec),
   noFace (no meter drawing). Methods: setMode(m), place('red'|'black', target | vertex), clear(), read() → MCP.measure result,
   n (measurements so far: every new pair of points or new range counts once; reset by clear(true)). After the first pair the black probe
   stays put and every tap moves the red one (the voltage-drop method with black on N); tap the black-probe button to move black. Faults: MCP.setFaults(sim, [...]) (see above); fault cards: MCP.FaultCards. */
MCP.Meter = class {
  constructor(el, sim, o = {}) {
    this.el = el; this.sim = sim; this.o = o; this.key = 'mm' + (++UID); this.mode = o.mode === 'R' ? 'R' : 'V'; this.p = { red: null, black: null }; this.next = 'red'; this.n = 0; this.res = null;
    if (el) { el.classList.add('mcp-meter');
      el.innerHTML = '<div class="mcp-mtop"><div class="mcp-dmm"></div><div class="mcp-mside"><div class="toggles mcp-mode"></div><div class="toggles mcp-probe"></div><div class="toggles mcp-pwr"></div></div></div>' +
        '<div class="status mcp-mst"></div><div class="mcp-mnote"></div><div class="mcp-mlog"></div>';
      const q = s => el.querySelector(s); this.face = q('.mcp-dmm'); this.st = q('.mcp-mst'); this.note = q('.mcp-mnote');
      this.mb = { V: btn(q('.mcp-mode'), T('V~ แรงดันไฟสลับ', 'V~ AC voltage'), () => this.setMode('V')), R: btn(q('.mcp-mode'), T('Ω ความต้านทาน / ต่อถึงกัน', 'Ω resistance / continuity'), () => this.setMode('R')) };
      this.pb = { red: btn(q('.mcp-probe'), `<i class="mcp-dot red"></i>${T('สายวัดแดง', 'red probe')}`, () => { this.next = 'red'; this.show(); }),
        black: btn(q('.mcp-probe'), `<i class="mcp-dot black"></i>${T('สายวัดดำ (COM)', 'black probe (COM)')}`, () => { this.next = 'black'; this.show(); }) };
      btn(q('.mcp-probe'), T('ยกสายวัดออก', 'lift the probes'), () => this.clear());
      if (o.power !== false) this.pw = btn(q('.mcp-pwr'), '', () => { this.sim.setMains(this.sim.mains === false); this.show(); });
      if (o.log !== false) this.log = global.ED && ED.Log ? new ED.Log(q('.mcp-mlog'), [['ครั้งที่', 'no.'], ['ย่าน', 'mode'], ['สายแดง', 'red'], ['สายดำ', 'black'], ['ค่าที่อ่านได้', 'reading']],
        { title: ['การวัดของคุณ (บันทึกอัตโนมัติ)', 'Your measurements (recorded automatically)'], empty: ['ยังไม่ได้วัด วางสายวัดแดงและดำบนขั้วในแบบ', 'No measurements yet: put the red and the black probe on terminals in the drawing'] }) : null;
      if (this.face) this.face.addEventListener('click', e => { if (e.target.closest('[data-dial]')) this.setMode(this.mode === 'V' ? 'R' : 'V'); }); }
    if (sim.el && sim.el.addEventListener) sim.el.addEventListener('click', e => { const t = pick(this, e); if (t) { e.stopPropagation(); this.place(this.next, t); } });
    sim.on(() => { this.res = this.read(); this.show(); });
    MCP.overlay(sim, this.key, () => this.svg()); this.show();
  }
  setMode(m) { this.mode = m === 'R' ? 'R' : 'V'; this.res = this.read(); if (this.p.red && this.p.black) this.record(); this.show(); }
  /* put one probe on a target (from MCP.targets) or a vertex key ('c:N', 't:3:0', 'p:Q1:2'); both placed = one measurement */
  place(c, t) { if (typeof t === 'string') t = { v: t, lab: this.labOf(t) }; const k = c === 'black' ? 'black' : 'red'; this.p[k] = t; this.next = k === 'red' && !this.p.black ? 'black' : 'red';   // the black probe stays where it is (e.g. on N) while the red one moves
    this.res = this.read(); if (this.p.red && this.p.black) this.record(); this.show(); MCP.paint(this.sim, this.key, () => this.svg()); return this.res; }
  labOf(v) { const t = MCP.targets(this.sim, 'probe').find(x => x.v === v || (x.keys && x.keys.some(k => 'p:' + k === v))); return t ? t.lab : v.replace(/^[a-z]:/, ''); }
  clear(all) { this.p = { red: null, black: null }; this.next = 'red'; this.res = null; this.lastSig = null; if (all) { this.n = 0; if (this.log) this.log.clear(); } this.show(); MCP.paint(this.sim, this.key, () => this.svg()); }
  read() { const { red, black } = this.p; if (!red || !black) return null; return MCP.measure(this.sim, red.v, black.v, this.mode, this.o); }
  record() { const r = this.res; if (!r) return; const sig = [this.mode, ...[this.p.red.v, this.p.black.v].sort()].join('|'); if (sig === this.lastSig) return; this.lastSig = sig; this.n++; const rec = { n: this.n, mode: this.mode, red: this.p.red, black: this.p.black, res: r };
    if (this.log) this.log.add(this.n, [String(this.n), this.mode === 'V' ? 'V~' : 'Ω', esc(this.pl(this.p.red)), esc(this.pl(this.p.black)), `<b>${esc(r.text)}</b>`], r.live ? 'bad' : r.note === 'beep' || (r.mode === 'V' && r.v < 0.5) ? 'ok' : 'warn');
    if (this.o.onMeasure) this.o.onMeasure(rec); }
  pl(t) { return t ? t.lab + (t.wire ? ` (${t.wire})` : '') : '–'; }
  /* words for the reading */
  explain(r) { if (!r) return '';
    if (r.mode === 'V') { if (r.float) return T('0 V: อย่างน้อยหนึ่งจุดไม่ได้ต่อกับแหล่งจ่ายและไม่ได้ต่อกับ N เลย (วงจรขาดทั้งสองด้าน หรือไม่มีไฟ)', '0 V: at least one point has no connection to the supply nor to N (the circuit is open on both sides, or there is no supply)');
      if (r.v < 0.5) return T('0 V: สองจุดมีศักย์เท่ากัน เป็นสายเดียวกัน หรือมีหน้าสัมผัสที่ต่ออยู่คั่น', '0 V: both points are at the same potential: the same wire, or a closed contact between them');
      if (r.two) return T(`${r.text}: สองจุดนี้อยู่คนละแหล่งจ่าย (วงจรควบคุม 230 V กับแหล่งจ่ายแรงดันต่ำของวงจรกำลัง) ค่านี้ไม่มีความหมาย วัดเทียบกับจุดในวงจรเดียวกัน`, `${r.text}: these two points belong to two different supplies (the 230 V control circuit and the low-voltage power supply); the reading means nothing: measure against a point of the same circuit`);
      if (r.lv && Math.abs(r.v - r.lv) < 3) return T(`${r.text}: ระหว่างสายของแหล่งจ่าย 3 เฟสแรงดันต่ำของชุดฝึก หรือคร่อมขดลวดหนึ่งขดในเดลตา`, `${r.text}: line to line of the trainer's low-voltage three-phase supply, or across one winding in delta`);
      if (r.lv && Math.abs(r.v - r.lv / SQ3) < 3) return T(`${r.text}: ระหว่างเฟสกับ N ของแหล่งจ่ายแรงดันต่ำ หรือคร่อมขดลวดหนึ่งขดในสตาร์ (${Math.round(r.lv)}/√3)`, `${r.text}: phase to N of the low-voltage supply, or across one winding in star (${Math.round(r.lv)}/√3)`);
      if (Math.abs(r.v - 230 * SQ3) < 3) return T('400 V: ระหว่างเฟสกับเฟส (วงจรกำลัง)', '400 V: phase to phase (power circuit)');
      if (Math.abs(r.v - 230) < 3) return T('230 V: ระหว่างเฟสกับ N หรือคร่อมหน้าสัมผัสที่เปิดอยู่ ซึ่งด้านหนึ่งมีไฟ อีกด้านต่อถึง N ผ่านโหลด', '230 V: phase to N, or across an open contact that has the supply on one side and N through a load on the other');
      return T('แรงดันบางส่วน: สองจุดต่อถึงแหล่งจ่ายผ่านโหลดต่างกัน', 'part of the supply voltage: the two points reach the supply through different loads'); }
    if (r.live) return `<span class="mcp-live">${T('อันตราย: วงจรยังมีไฟ! ห้ามวัดความต้านทานขณะมีไฟ ตัดไฟ ล็อก แขวนป้าย แล้ววัดแรงดันยืนยันว่าไม่มีไฟก่อน', 'Danger: the circuit is live! Never measure resistance on a live circuit: switch off, lock out, tag, and prove it dead with the voltage range first')}</span>`;
    if (r.r === 0) return T('0.0 Ω มีเสียงบี๊บ: ต่อถึงกัน (สาย หรือหน้าสัมผัสที่ต่ออยู่)', '0.0 Ω with a beep: continuity (a wire, or a closed contact)');
    if (r.r === Infinity) return T('OL: ไม่มีทางต่อถึงกัน (หน้าสัมผัสเปิด สายขาด หรือฉนวน)', 'OL: no path at all (an open contact, a broken wire, or insulation)');
    const nm = (r.loads || []).map(e => { const s = e.src || {}; if (s.el !== undefined) { const el = this.sim.spec.els[s.el]; return `${el.k === 'lamp' ? T('หลอด', 'lamp') : T('คอยล์', 'coil')} ${MCP.name(this.sim, el.d)}`; } return s.wind ? (s.w ? T(`ขดลวด ${s.w} ของมอเตอร์ ${s.wind}`, `winding ${s.w} of ${s.wind}`) : T(`ขดลวดมอเตอร์ ${s.wind}`, `winding of ${s.wind}`)) : ''; }).filter(Boolean);
    return T(`${r.text} (ค่าตัวอย่าง): มีโหลดอยู่ในทาง${nm.length === 1 ? ` คือ${nm[0]}` : nm.length ? ` (${nm.join(', ')} และทางขนาน)` : ' หรือทางขนานผ่านโหลดอื่น'} ค่าจริงให้วัดจากชุดฝึกของคุณ`,
      `${r.text} (example value): a load is in the path${nm.length === 1 ? `: the ${nm[0]}` : nm.length ? ` (${nm.join(', ')} and parallel paths)` : ', or a parallel path through other loads'}; read the real value on your own trainer`); }
  show() { const r = this.res, P = this.p, sim = this.sim;
    if (this.mb) { this.mb.V.classList.toggle('on', this.mode === 'V'); this.mb.R.classList.toggle('on', this.mode === 'R'); this.pb.red.classList.toggle('on', this.next === 'red'); this.pb.black.classList.toggle('on', this.next === 'black'); }
    if (this.pw) { const on = sim.mains !== false; this.pw.innerHTML = on ? T('แหล่งจ่าย: มีไฟ · กดเพื่อตัดไฟ (สวิตช์แยกวงจร)', 'Supply: ON · tap to isolate') : T('แหล่งจ่าย: ตัดแล้ว · กดเพื่อจ่ายไฟ', 'Supply: OFF (isolated) · tap to switch on'); this.pw.classList.toggle('danger', on); }
    const pill = r ? r.text : this.mode === 'V' ? 'V~' : 'Ω', kind = !r ? 'wait' : r.live ? 'bad' : r.mode === 'V' ? (r.v > 0.5 ? 'warn' : 'good') : r.r === Infinity ? 'warn' : 'good';
    const where = `<span class="mcp-pp"><i class="mcp-dot red"></i>${esc(this.pl(P.red))} &nbsp; <i class="mcp-dot black"></i>${esc(this.pl(P.black))}</span>`;
    status(this.st, pill, r ? where : (P.red || P.black ? where + ' · ' : '') + T(`แตะขั้วในแบบเพื่อวางสายวัด${this.next === 'red' ? 'แดง' : 'ดำ'}`, `tap a terminal in the drawing for the ${this.next} probe`), kind);
    if (this.note) this.note.innerHTML = r ? `<p class="simnote">${this.explain(r)}</p>` : '';
    if (this.face && !this.o.noFace) this.face.innerHTML = this.faceSvg(); }
  /* the meter drawing: yellow holster, LCD with the reading, the range dial (tap it to change the mode), the two jacks */
  faceSvg() { const r = this.res, live = r && r.live, txt = r ? r.text : this.mode === 'V' ? '0 V' : 'OL', a = this.mode === 'V' ? -40 : 40;
    let s = `<rect x="4" y="4" width="152" height="212" rx="18" fill="#f2c230" stroke="#b8901c" stroke-width="2"/><rect x="16" y="14" width="128" height="192" rx="10" fill="#2f343b"/>`;
    s += `<rect x="26" y="24" width="108" height="50" rx="5" fill="${live ? '#f6c9c4' : '#c9d6b8'}" stroke="#1f2328"/>` + IE.T(esc(txt.replace(' ', ' ')), 128, 58, { size: txt.length > 7 ? 19 : 23, anchor: 'end', weight: 700, col: '#1f2328' });
    s += IE.T(this.mode === 'V' ? 'AC' : 'Ω', 32, 36, { size: 9, weight: 700, col: '#1f2328' }) + (r && r.note === 'beep' ? IE.T('♪', 34, 68, { size: 12, col: '#1f2328' }) : '') + (live ? IE.T('LIVE!', 32, 68, { size: 9, weight: 700, col: '#a31d17' }) : '');
    s += `<g data-dial="1" style="cursor:pointer"><circle cx="80" cy="128" r="34" fill="#1f2328" stroke="#59607e"/><circle cx="80" cy="128" r="22" fill="#3b424d"/><rect x="76" y="100" width="8" height="30" rx="3" fill="#e9ecef" transform="rotate(${a} 80 128)"/>` +
      IE.T('V~', 44, 96, { size: 12, anchor: 'middle', weight: 700, col: this.mode === 'V' ? '#f2c230' : '#aab2bd' }) + IE.T('Ω', 116, 96, { size: 13, anchor: 'middle', weight: 700, col: this.mode === 'R' ? '#f2c230' : '#aab2bd' }) + '</g>';
    s += `<circle cx="52" cy="186" r="9" fill="#1f2328" stroke="#aab2bd"/><circle cx="108" cy="186" r="9" fill="#a31d17" stroke="#ff9d94"/>` + IE.T('COM', 52, 204, { size: 8, anchor: 'middle', col: '#e9ecef' }) + IE.T('VΩ', 108, 204, { size: 8, anchor: 'middle', col: '#e9ecef' });
    return IE.svg(160, 220, s, { max: 150, label: `multimeter ${txt}` }); }
  /* overlay: a small ring at every terminal that can be probed, the two probes, and the hit layer */
  svg() { this.tg = MCP.targets(this.sim, 'probe'); let s = '';
    this.tg.forEach(t => { if (t.kind === 'term' || t.kind === 'pterm') s += `<circle cx="${f1(t.x)}" cy="${f1(t.y)}" r="3.3" fill="var(--panel)" stroke="var(--accent)" stroke-width="1.1" opacity=".8"/>`; });
    [['black', '#2a2f36', 'COM'], ['red', '#d83a34', '+']].forEach(([c, col, lab]) => { const t = this.p[c]; if (!t) return; let x = t.x, y = t.y;
      if (t.kind === 'rail' || x === undefined) { const q = this.tg.find(u => u.v === t.v); if (q && q.kind === 'rail') { x = q.x1 + 26 + (c === 'red' ? 0 : 22); y = q.y1; } else if (q) { x = q.x; y = q.y; } }
      if (x === undefined) return; const dy = c === 'red' ? -1 : 1;
      s += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x + 14)}" y2="${f1(y + dy * 22)}" stroke="${col}" stroke-width="3" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${f1(y)}" r="5.5" fill="${col}" stroke="#ffffff" stroke-width="1.5"/>` +
        `<rect x="${f1(x + 10)}" y="${f1(y + dy * 22 - 7)}" width="${lab.length * 6 + 8}" height="13" rx="3" fill="${col}" stroke="none"/>` + IE.T(lab, x + 14, y + dy * 22 + 3, { size: 8.5, weight: 700, col: '#ffffff' }); });
    return s + hitLayer(this.key, this.tg); }
};

/* ---------------- fault cards: "find the fault with at most N measurements" ----------------
   new MCP.FaultCards(el, meter, cards, o): one card at a time on the meter's simulator. Each card: { title: [th, en], fault: {…} | [{…}],
   symptom: [th, en] (what the student sees), setup: [ops of MCP.run] (e.g. [['tap', 'S2']]), max: 4 (measurements allowed),
   hint: [th, en], fix: [th, en] }. Before a card: reset, faults set (hidden: the drawing still looks right), setup run, probes lifted,
   counter at 0. Buttons "hold S2" … keep a push button pressed while measuring. "I found it" → tap the faulty part in the drawing
   (terminal, device or wire segment). Points: 3 = found within max measurements and no wrong guess, 2 = within max + 2 and at most
   one wrong guess, 1 = found later, 0 = answer shown; a card keeps its first score (opening it again and answering, or showing the
   answer, changes nothing; a page may still set fc.pts[k] and call fc.tabs()). o: hideLive (default true: no live colours, so the meter has to find it),
   onScore(total, max). */
MCP.FaultCards = class {
  constructor(el, meter, cards, o = {}) {
    this.el = el; this.m = meter; this.sim = meter.sim; this.cards = cards || []; this.o = o; this.k = 0; this.key = 'fc' + (++UID); this.pts = this.cards.map(() => null); this.answering = false;
    if (o.hideLive !== false) MCP.hideLive(this.sim, true);
    el.classList.add('mcp-cards'); el.innerHTML = '<div class="toggles mcp-cbar"></div><div class="fcase mcp-card"></div><div class="mcp-score"></div>';
    this.bar = el.querySelector('.mcp-cbar'); this.box = el.querySelector('.mcp-card'); this.sc = el.querySelector('.mcp-score');
    const prev = meter.o.onMeasure; meter.o.onMeasure = rec => { if (prev) prev(rec); this.count(); };
    if (this.sim.el && this.sim.el.addEventListener) this.sim.el.addEventListener('click', e => { if (!this.answering) return; const t = pick(this, e); if (t) { e.stopPropagation(); this.answer(t); } });
    this.sim.on(() => this.holds());
    MCP.overlay(this.sim, this.key, () => this.svg());
    this.go(0);
  }
  card() { return this.cards[this.k] || {}; }
  go(k) { this.k = k; const c = this.card(); this.answering = false; this.wrong = 0; this.found = false; this.revealed = false;
    MCP.reset(this.sim); this.faults = MCP.setFaults(this.sim, c.fault); MCP.run(this.sim, c.setup); this.m.clear(true);
    const max = c.max || 4;
    this.box.innerHTML = `<h3>${T('การ์ด', 'Card')} ${k + 1}/${this.cards.length}: ${tt(c.title)}</h3><div class="fsym"><b>${T('อาการ', 'Symptom')}</b> ${tt(c.symptom)}</div>` +
      `<p class="mcp-lim">${T(`หาจุดเสียโดยวัดไม่เกิน <b>${max}</b> ครั้ง`, `Find the fault with at most <b>${max}</b> measurements`)} · <span class="mcp-used"></span></p>` + (c.hint ? `<p class="hint">${tt(c.hint)}</p>` : '') +
      '<div class="toggles mcp-holds"></div><div class="toggles mcp-cbtn"></div><div class="status mcp-cst"></div><div class="mcp-ans"></div>';
    const q = s => this.box.querySelector(s), cb = q('.mcp-cbtn'); this.used = q('.mcp-used'); this.cst = q('.mcp-cst'); this.ans = q('.mcp-ans'); this.hb = q('.mcp-holds');
    this.fb = btn(cb, T('เจอแล้ว: แตะจุดเสียในแบบ', 'Found it: tap the faulty part'), () => this.ask());
    btn(cb, T('ดูเฉลย', 'Show the answer'), () => this.reveal()); btn(cb, T('การ์ดต่อไป ▸', 'Next card ▸'), () => this.go(Math.min(this.cards.length - 1, this.k + 1)));
    status(this.cst, T('วัด', 'measure'), T('ลองใช้งานวงจรดูอาการ แล้ววัดหาจุดเสีย', 'Operate the circuit to see the symptom, then measure to find the fault'), 'wait');
    this.holdBtns(); this.count(); this.tabs(); this.draw(); }
  /* buttons that keep a push button pressed (both hands are on the probes) */
  holdBtns() { this.hb.innerHTML = ''; this.hbs = {};
    Object.keys(this.sim.dev).filter(id => this.sim.dev[id].type === 'pb').forEach(id => { this.hbs[id] = btn(this.hb, '', () => { this.sim.press(id, !this.sim.dev[id].pressed); }); }); this.holds(); }
  holds() { Object.entries(this.hbs || {}).forEach(([id, b]) => { const on = !!this.sim.dev[id].pressed; b.classList.toggle('on', on); b.textContent = on ? T(`ปล่อย ${MCP.name(this.sim, id)}`, `release ${MCP.name(this.sim, id)}`) : T(`กด ${MCP.name(this.sim, id)} ค้างไว้`, `hold ${MCP.name(this.sim, id)} down`); }); }
  count() { const c = this.card(), max = c.max || 4, n = this.m.n; if (this.used) this.used.innerHTML = T(`วัดไปแล้ว ${n} ครั้ง`, `${n} measurement${n === 1 ? '' : 's'} so far`) + (n > max ? ` <b class="mcp-over">${T('เกินกำหนด', 'over the limit')}</b>` : ''); }
  ask() { if (this.found || this.revealed) return; this.answering = true; this.fb.classList.add('on'); status(this.cst, T('ตอบ', 'answer'), T('แตะขั้ว อุปกรณ์ หรือสายเส้นที่เสียในแบบ', 'Tap the faulty terminal, device or wire in the drawing'), 'warn'); this.draw(); }
  answer(t) { const hit = t.kind === 'term' ? { kind: 'term', i: t.i, j: t.j } : t.kind === 'el' ? { kind: 'el', i: t.i } : t.kind === 'seg' ? { kind: 'seg', i: t.i, pa: t.pa, pb: t.pb } : t.kind === 'pterm' ? { kind: 'pterm', keys: t.keys } : null; if (!hit) return false;
    const ok = (this.faults || []).some(f => MCP.isFaultAt(f, hit));
    if (!ok) { this.wrong++; status(this.cst, '✗', T(`${t.lab || ''}: ไม่ใช่จุดนี้ วัดเพิ่มอีกหน่อยแล้วลองใหม่`, `${t.lab || ''}: not this one. Measure a little more and try again`), 'bad'); return false; }
    const c = this.card(), max = c.max || 4, n = this.m.n, first = this.pts[this.k], again = first !== null && first !== undefined;   // a card already answered or revealed keeps its first score
    const p = again ? first : n <= max && !this.wrong ? 3 : n <= max + 2 && this.wrong <= 1 ? 2 : 1;
    this.found = true; this.answering = false; this.pts[this.k] = p; this.fb.classList.remove('on');
    status(this.cst, '✓', again ? T(`ถูกต้อง! (วัด ${n} ครั้ง ตอบผิด ${this.wrong} ครั้ง) การ์ดนี้ทำไปแล้ว คะแนนคงเดิมจากครั้งแรก: ${p}`, `Right! (${n} measurements, ${this.wrong} wrong guess${this.wrong === 1 ? '' : 'es'}) This card was done before, so it keeps its first score: ${p}`)
      : T(`ถูกต้อง! ได้ ${p} คะแนน (วัด ${n} ครั้ง ตอบผิด ${this.wrong} ครั้ง)`, `Right! ${p} point${p === 1 ? '' : 's'} (${n} measurements, ${this.wrong} wrong guess${this.wrong === 1 ? '' : 'es'})`), 'good'); this.explain(); this.tabs(); this.draw(); return true; }
  reveal() { if (this.found) return; const first = this.pts[this.k], again = first !== null && first !== undefined; this.revealed = true; this.answering = false; if (!again) this.pts[this.k] = 0; this.fb.classList.remove('on');
    status(this.cst, T('เฉลย', 'answer'), again ? T(`การ์ดนี้ทำไปแล้ว คะแนนคงเดิม: ${first}`, `This card was done before; it keeps its score: ${first}`) : T('ได้ 0 คะแนนสำหรับการ์ดนี้', '0 points for this card'), 'warn'); this.explain(); this.tabs(); this.draw(); }
  explain() { const c = this.card(); this.ans.innerHTML = `<div class="answer"><p><b>${T('จุดเสีย', 'The fault')}</b>: ${(this.faults || []).map(f => tt(MCP.faultText(this.sim, f))).join('; ')}</p>` + (c.fix ? `<p><b>${T('แก้ไข', 'Fix')}</b>: ${tt(c.fix)}</p>` : '') + (c.why ? `<p>${tt(c.why)}</p>` : '') + '</div>'; }
  tabs() { this.bar.innerHTML = ''; this.cards.forEach((c, i) => { const p = this.pts[i]; btn(this.bar, `${i + 1}${p === null ? '' : ` (${p})`}`, () => this.go(i), i === this.k ? 'on' : ''); });
    const got = this.pts.reduce((a, b) => a + (b || 0), 0), all = 3 * this.cards.length; this.sc.innerHTML = `<span class="fscore">${T(`คะแนนรวม ${got}/${all}`, `Score ${got}/${all}`)}</span>`; if (this.o.onScore) this.o.onScore(got, all); }
  draw() { MCP.paint(this.sim, this.key, () => this.svg()); }
  /* overlay: in answer mode a hit layer on every terminal, device and wire; after the answer a red ring where the fault is */
  svg() { const sim = this.sim; let s = ''; this.tg = this.answering ? MCP.targets(sim, 'answer') : [];
    if (this.found || this.revealed) (this.faults || []).forEach(f => { const X = v => sim.X(v), Y = v => sim.Y(v), ring = (x, y, r) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="none" stroke="var(--bad)" stroke-width="2.6" stroke-dasharray="4 3"/>`;
      if (f.k === 'sd') (f.at || []).forEach(k => { const p = sim.pT && sim.pT[k]; if (p) s += ring(p[0], p[1], 9); });
      else if (f.k === 'wire') s += ring((X(f.a[0]) + X(f.b[0])) / 2, (Y(f.a[1]) + Y(f.b[1])) / 2, 13);
      else if (f.k === 'swap') [f.A, f.B].forEach(x => { const e = sim.spec.els[x.i]; s += ring(X(e.x), x.j ? Y(e.y + (e.h || 1)) - 8 : Y(e.y) + 8, 10); });
      else { const e = sim.spec.els[f.i]; if (f.k === 'loose') s += ring(X(e.x), f.j ? Y(e.y + (e.h || 1)) - 8 : Y(e.y) + 8, 10); else s += ring(X(e.x), (Y(e.y) + Y(e.y + (e.h || 1))) / 2, 22); } });
    if (this.answering) s += this.tg.map(t => (t.kind === 'el' ? `<rect x="${f1(t.box[0])}" y="${f1(t.box[1])}" width="${t.box[2]}" height="${f1(t.box[3])}" rx="5" fill="var(--warn)" fill-opacity=".08" stroke="var(--warn)" stroke-opacity=".5" stroke-dasharray="3 3"/>` : t.kind === 'pterm' ? `<circle cx="${f1(t.x)}" cy="${f1(t.y)}" r="6" fill="var(--warn)" fill-opacity=".12" stroke="var(--warn)" stroke-opacity=".6" stroke-dasharray="2 2"/>` : '')).join('') + hitLayer(this.key, this.tg);
    return s; }
};

/* ---------------- 4) the department trainer (our generic design) ----------------
   MCP.TRAINER holds EVERYTHING about the real trainer: drawing size and zones, DIN rails, the device kinds (terminal rows, face, name)
   and the devices (slot id, kind, position, printed tag, model, colour). When the real trainer is photographed, change this object
   only (positions, models, terminal numbers; a kind's rows are its sockets). Units = drawing units (about 1 px at zoom 1).
   R = example values for the meter (coil, relay coil, timer supply input, lamp, motor winding per phase, single-phase run / start
   winding, start capacitor at 50 Hz): replace them with values measured on the real devices. */
const KND = (w, h, rows, x) => ({ w, h, rows, ...x });
MCP.TRAINER = {
  title: ['ชุดฝึกควบคุมมอเตอร์ของแผนก (แบบทั่วไปที่เราออกแบบ)', 'Department motor-control trainer (our generic design)'],
  note: ['ตำแหน่ง รุ่น และเลขขั้วเป็นแบบที่ออกแบบไว้ก่อน จะปรับตามภาพถ่ายชุดฝึกจริง ทุกขั้วมีเต้ารับบานาน่า 4 mm', 'Positions, models and terminal numbers are our design for now and will follow photos of the real trainer; every terminal has a 4 mm banana socket'],
  R: { coil: 560, relay: 3300, timer: 220000, lamp: 1500, winding: 6.4, run: 3.6, start: 9.5, capV: 30 },
  W: 1100, H: 720, pitch: 18, socket: 6,
  zones: [{ id: 'plate', x: 10, y: 8, w: 762, h: 566, lab: ['แผ่นยึดอุปกรณ์ในตู้ (ราง DIN 35 mm)', 'mounting plate (35 mm DIN rails)'] },
    { id: 'door', x: 786, y: 8, w: 306, h: 444, lab: ['ประตูตู้ (หน้าตู้)', 'panel door (front)'] },
    { id: 'field', x: 10, y: 584, w: 1082, h: 130, lab: ['อุปกรณ์ที่เครื่องจักรและมอเตอร์', 'field devices and motors'] }],
  rails: [[18, 80, 764], [18, 262, 764], [18, 406, 764]],
  ducts: [[18, 160, 746, 14], [18, 454, 746, 12]],
  kinds: {
    mcb3: KND(64, 108, [[14, ['1', '3', '5']], [94, ['2', '4', '6']]], { face: 'mcb', name: ['เบรกเกอร์ลูกย่อย 3 ขั้ว', 'three-pole miniature circuit breaker (MCB)'] }),
    mcb1: KND(30, 108, [[14, ['1']], [94, ['2']]], { face: 'mcb', name: ['เบรกเกอร์ลูกย่อย 1 ขั้ว (ป้องกันวงจรควบคุม)', 'one-pole miniature circuit breaker (MCB), control circuit'] }),
    f3: KND(64, 108, [[14, ['L1', 'L2', 'L3']], [94, ['11', '12', '14']]], { face: 'f3', name: ['รีเลย์ป้องกันเฟส', 'phase-failure relay'] }),
    kt: KND(82, 108, [[14, ['A1', 'A2', '15', '25']], [94, ['16', '18', '26', '28']]], { face: 'kt', name: ['ตัวตั้งเวลาหลายฟังก์ชัน (2 ชุดหน้าสัมผัสสลับ)', 'multifunction timer (2 changeover)'] }),
    ka: KND(82, 132, [[14, ['14', '24', '34', '44']], [34, ['12', '22', '32', '42']], [98, ['11', '21', '31', '41']], [118, ['A1', 'A2']]],
      { face: 'ka', name: ['รีเลย์เสียบบนซ็อกเก็ต 14 ขา (4 ชุดหน้าสัมผัสสลับ)', 'plug-in relay on a 14-pin socket (4 changeover)'],
        pins: { 12: 1, 22: 2, 32: 3, 42: 4, 14: 5, 24: 6, 34: 7, 44: 8, 11: 9, 21: 10, 31: 11, 41: 12, A1: 13, A2: 14 } }),   // socket pin numbers (MY4-type socket, example)
    km: KND(130, 156, [[14, ['1', '3', '5', 'A1', '13', '21']], [54, ['53', '61', '71', '83']], [102, ['54', '62', '72', '84']], [142, ['2', '4', '6', 'A2', '14', '22']]],
      { face: 'km', name: ['คอนแทกเตอร์ 3 ขั้ว + บล็อกหน้าสัมผัสช่วยด้านหน้า', 'three-pole contactor + front auxiliary block'] }),
    ol: KND(130, 88, [[14, ['1', '3', '5', '95', '97']], [74, ['2', '4', '6', '96', '98']]], { face: 'ol', name: ['โอเวอร์โหลดรีเลย์', 'thermal overload relay'] }),
    pbs: KND(66, 116, [[86, ['13', '21']], [106, ['14', '22']]], { face: 'pb', name: ['ปุ่มกด (หน้าสัมผัสปกติเปิด 13–14 + ปกติปิด 21–22)', 'push button (normally open 13–14 + normally closed 21–22)'] }),
    pbx: KND(66, 116, [[86, ['11', '23']], [106, ['12', '24']]], { face: 'pb', name: ['ปุ่มกด (หน้าสัมผัสปกติปิด 11–12 + ปกติเปิด 23–24)', 'push button (normally closed 11–12 + normally open 23–24)'] }),
    sel2: KND(66, 116, [[86, ['13', '21']], [106, ['14', '22']]], { face: 'sel', pos: ['0', 'I'], name: ['สวิตช์เลือก 0–I ค้างตำแหน่ง', 'selector 0–I, maintained'] }),
    sel3: KND(66, 116, [[86, ['13', '23']], [106, ['14', '24']]], { face: 'sel', pos: ['I', '0', 'II'], name: ['สวิตช์เลือก I–0–II ค้างตำแหน่ง', 'selector I–0–II, maintained'] }),
    lamp: KND(46, 116, [[86, ['X1']], [106, ['X2']]], { face: 'lamp', name: ['หลอดสัญญาณ 230 V', 'pilot light 230 V'] }),
    sw: KND(76, 100, [[60, ['13', '21']], [84, ['14', '22']]], { face: 'sw', name: ['สวิตช์ (หน้าสัมผัสปกติเปิด 13–14 + ปกติปิด 21–22)', 'switch (normally open 13–14 + normally closed 21–22)'] }),
    swb: KND(76, 100, [[60, ['11', '23']], [84, ['12', '24']]], { face: 'sw', name: ['สวิตช์ (หน้าสัมผัสปกติปิด 11–12 + ปกติเปิด 23–24)', 'switch (normally closed 11–12 + normally open 23–24)'] }),
    motor: KND(120, 112, [[46, ['U1', 'V1', 'W1']], [76, ['W2', 'U2', 'V2']], [100, ['PE']]], { face: 'motor', name: ['มอเตอร์เหนี่ยวนำ 3 เฟส (กล่องขั้วต่อสาย)', 'three-phase induction motor (terminal box)'] }),
    strip: { face: 'strip', name: ['แผงขั้วต่อสาย', 'terminal strip'] }, pebar: { face: 'pebar', name: ['บาร์ต่อลงดิน PE', 'PE bar'] } },
  devices: [
    { id: 'Q1', kind: 'mcb3', x: 24, y: 26, tag: 'Q1', model: 'MCB 3-pole, curve C, 10 A (example)' },
    { id: 'F1', kind: 'mcb1', x: 96, y: 26, tag: 'F1', model: 'MCB 1-pole, curve C, 2 A (example)' },
    { id: 'F3', kind: 'f3', x: 134, y: 26, tag: 'F3', model: 'phase-failure / sequence relay 3 × 400 V (example)' },
    { id: 'KT1', kind: 'kt', x: 206, y: 26, tag: 'KT1', model: 'multifunction timer 0.1 s–10 h, 230 V (example)' },
    { id: 'KT2', kind: 'kt', x: 296, y: 26, tag: 'KT2', model: 'multifunction timer 0.1 s–10 h, 230 V (example)' },
    { id: 'KA1', kind: 'ka', x: 386, y: 20, tag: 'KA1', model: 'relay, 4 changeover contacts, coil 230 V AC, on a 14-pin socket (example)' },
    { id: 'KA2', kind: 'ka', x: 476, y: 20, tag: 'KA2', model: 'relay, 4 changeover contacts, coil 230 V AC, on a 14-pin socket (example)' },
    { id: 'Q11', kind: 'mcb3', x: 584, y: 26, tag: 'Q11', model: 'MCB 3-pole, curve C, 6 A, branch of motor M1 (example)' },
    { id: 'Q12', kind: 'mcb3', x: 664, y: 26, tag: 'Q12', model: 'MCB 3-pole, curve C, 6 A, branch of motor M2 (example)' },
    { id: 'KM1', kind: 'km', x: 24, y: 184, tag: 'KM1', model: 'contactor 9 A (AC-3), coil 230 V AC, 13–14 + 21–22, front block 53–54 61–62 71–72 83–84 (example)' },
    { id: 'KM2', kind: 'km', x: 162, y: 184, tag: 'KM2', model: 'contactor 9 A (AC-3), coil 230 V AC, 13–14 + 21–22, front block 53–54 61–62 71–72 83–84 (example)' },
    { id: 'KM3', kind: 'km', x: 300, y: 184, tag: 'KM3', model: 'contactor 9 A (AC-3), coil 230 V AC, 13–14 + 21–22, front block 53–54 61–62 71–72 83–84 (example)' },
    { id: 'OL1', kind: 'ol', x: 24, y: 362, tag: 'F21', model: 'thermal overload relay 1.0–1.6 A, class 10 (example, sized for the 0.4 kW lab motor)' },
    { id: 'OL2', kind: 'ol', x: 162, y: 362, tag: 'F22', model: 'thermal overload relay 1.0–1.6 A, class 10 (example, sized for the 0.4 kW lab motor)' },
    { id: 'OL3', kind: 'ol', x: 300, y: 362, tag: 'F23', model: 'thermal overload relay 1.0–1.6 A, class 10 (example, sized for the 0.4 kW lab motor)' },
    { id: 'X1', kind: 'strip', x: 24, y: 478, n: 13, tag: '-X1', under: ['L1', 'L2', 'L3', 'N', 'PE', 'U1', 'V1', 'W1', 'PE', 'U1', 'V1', 'W1', 'PE'], underSd: ['L1', 'L2', 'L3', 'N', 'PE', 'U1', 'V1', 'W1', 'PE', 'W2', 'U2', 'V2', 'PE'], model: 'power terminal strip: 1–5 supply in (pre-wired), 6–9 motor M1, 10–13 motor M2' },   // star-delta (chapter 8): 10–12 = W2 U2 V2 of M1 (underSd, x1sd)
    { id: 'X2', kind: 'strip', x: 292, y: 478, n: 20, tag: '-X2', model: 'control terminal strip to the door and the field devices' },
    { id: 'PE', kind: 'pebar', x: 24, y: 536, n: 8, tag: 'PE', model: 'PE bar (all sockets joined)' },
    { id: 'H1', kind: 'lamp', x: 800, y: 40, tag: 'GREEN', code: 'GN', color: '#7ee787', model: 'pilot light 22 mm, green, 230 V (example)' },
    { id: 'H2', kind: 'lamp', x: 848, y: 40, tag: 'GREEN', code: 'GN', color: '#7ee787', model: 'pilot light 22 mm, green, 230 V (example)' },
    { id: 'H3', kind: 'lamp', x: 896, y: 40, tag: 'YELLOW', code: 'YE', color: '#ffd166', model: 'pilot light 22 mm, yellow, 230 V (example)' },
    { id: 'H4', kind: 'lamp', x: 944, y: 40, tag: 'WHITE', code: 'WH', color: '#f2f2f2', model: 'pilot light 22 mm, white, 230 V (example)' },
    { id: 'H5', kind: 'lamp', x: 992, y: 40, tag: 'RED', code: 'RD', color: '#ff6b6b', model: 'pilot light 22 mm, red, 230 V (example)' },
    { id: 'H6', kind: 'lamp', x: 1040, y: 40, tag: 'BLUE', code: 'BU', color: '#6ea8ff', model: 'pilot light 22 mm, blue, 230 V (example)' },
    { id: 'SA1', kind: 'pbs', x: 800, y: 176, tag: 'START', cap: 'white', model: 'push button 22 mm, white, 13–14 + 21–22 (example)' },
    { id: 'SA2', kind: 'pbs', x: 872, y: 176, tag: 'START', cap: 'green', model: 'push button 22 mm, green, 13–14 + 21–22 (example)' },
    { id: 'SB1', kind: 'pbx', x: 944, y: 176, tag: 'STOP', cap: 'black', model: 'push button 22 mm, black, 11–12 + 23–24 (example)' },
    { id: 'SB2', kind: 'pbx', x: 1016, y: 176, tag: 'STOP', cap: 'red', model: 'push button 22 mm, red, 11–12 + 23–24 (example)' },
    { id: 'SE', kind: 'pbx', x: 800, y: 316, tag: 'E-STOP', cap: 'mush', model: 'emergency stop, red mushroom, latching, 11–12 + 23–24 (example)' },
    { id: 'SJ', kind: 'pbs', x: 872, y: 316, tag: 'JOG', cap: 'grey', model: 'push button 22 mm, grey, 13–14 + 21–22 (example)' },
    { id: 'SS1', kind: 'sel2', x: 944, y: 316, tag: '0–I', model: 'selector switch 2 positions, maintained (example)' },
    { id: 'SS2', kind: 'sel3', x: 1016, y: 316, tag: 'I–0–II', model: 'selector switch 3 positions, maintained (example)' },
    { id: 'LS1', kind: 'sw', x: 22, y: 606, tag: 'LS1', op: 'lim', model: 'limit switch, roller lever (example)' },
    { id: 'LS2', kind: 'sw', x: 104, y: 606, tag: 'LS2', op: 'lim', model: 'limit switch, roller lever (example)' },
    { id: 'FS', kind: 'sw', x: 186, y: 606, tag: 'FS', op: 'flt', model: 'float switch (example)' },
    { id: 'PS', kind: 'swb', x: 268, y: 606, tag: 'PS', op: 'prs', model: 'pressure switch (example)' },
    { id: 'TS', kind: 'swb', x: 350, y: 606, tag: 'TS', op: 'tmp', model: 'temperature switch (example)' },
    { id: 'M1', kind: 'motor', x: 452, y: 598, tag: 'M1', model: 'three-phase induction motor 0.4 kW, 220 V Δ / 380–415 V Y, about 1.2 A in Y (example, like the lab motor)' },
    { id: 'M2', kind: 'motor', x: 598, y: 598, tag: 'M2', model: 'three-phase induction motor 0.4 kW, 220 V Δ / 380–415 V Y, about 1.2 A in Y (example, like the lab motor)' }],
  /* -X1: what each terminal carries; 1–5 come pre-wired from the supply isolator */
  x1: { L1: 1, L2: 2, L3: 3, N: 4, PE: 5, M1: { U1: 6, V1: 7, W1: 8, PE: 9 }, M2: { U1: 10, V1: 11, W1: 12, PE: 13 } },
  /* chapter 8: a star-delta motor needs six leads + PE: M1 uses 6–9 and the M2 terminals 10–12 for W2 U2 V2 (M2 is not used then) */
  x1sd: { M1: { U1: 6, V1: 7, W1: 8, PE: 9, W2: 10, U2: 11, V2: 12 } },
  supplyLab: ['จากสวิตช์แยกวงจรต้นทาง 3~ 400/230 V 50 Hz (ต่อไว้แล้ว)', 'from the supply isolator 3~ 400/230 V 50 Hz (pre-wired)'],
  supplyLabLow: ['แหล่งจ่าย 3 เฟสแรงดันต่ำของชุดฝึก (ประมาณ 220 V ระหว่างสาย)|ครูเป็นผู้ต่อและตรวจ · วงจรควบคุม 230 V', "the trainer's low-voltage three-phase supply (about 220 V line to line)|connected and checked by the teacher · control 230 V"],   // chapter 8 (two lines)
  leads: { RD: ['แดง (วงจรควบคุม)', 'red (control)', '#d83a34'], BK: ['ดำ (วงจรกำลัง)', 'black (power)', '#2a2f36'], BU: ['ฟ้า (N)', 'blue (N)', '#2f6fd6'], GNYE: ['เขียว-เหลือง (PE)', 'green-yellow (PE)', '#2fa84f'] }
};
/* sockets of one trainer device: [{ id: 'KM1:A1', t: 'A1', x, y, up (label above) }] in drawing coordinates */
MCP.trSockets = (dv, L = MCP.TRAINER) => { const P = L.pitch, K = L.kinds[dv.kind] || {}, out = [];
  if (dv.kind === 'strip' || dv.kind === 'pebar') { for (let i = 0; i < dv.n; i++) out.push({ id: `${dv.id}:${i + 1}`, t: String(i + 1), x: dv.x + 15 + i * P, y: dv.y + (dv.kind === 'strip' ? 24 : 16), up: dv.kind === 'strip' }); return out; }
  (K.rows || []).forEach(([y, names], r) => { const x0 = dv.x + (K.w - (names.length - 1) * P) / 2; names.forEach((t, i) => out.push({ id: `${dv.id}:${t}`, t, x: x0 + i * P, y: dv.y + y, up: y < K.h / 2 })); });
  return out; };
MCP.trSize = (dv, L = MCP.TRAINER) => (dv.kind === 'strip' ? [dv.n * L.pitch + 12, 48] : dv.kind === 'pebar' ? [dv.n * L.pitch + 12, 30] : [L.kinds[dv.kind].w, L.kinds[dv.kind].h]);

/* which trainer device each circuit device uses, and how its terminal numbers map: { slot: { KM1: 'KM1', F2: 'OL1', S1: 'SB1', … },
   rev: { OL1: 'F2', … }, tmap: { KA1: { 13: '11', 14: '14' }, … }, miss: [[th, en] …] (things the trainer cannot do), notes }
   o.assign = { S1: 'SB2', … } forces a slot. Rules: cb → 3-pole MCB, fuse → 1-pole MCB, KM… → contactors, KA… → plug-in relays,
   timer → timers, ol → overload relays, push buttons by colour (cap) and contacts, selectors by positions, lamps by colour code,
   sensors by operator (lim, flt, prs, tmp; a sensor named F3 = the phase-failure relay), motors M1, M2. */
const natural = (a, b) => a.localeCompare(b, 'en', { numeric: true });
MCP.trAssign = (sim, o = {}) => {
  const L = o.layout || MCP.TRAINER, S = sim.spec, D = S.devices, slots = L.devices, used = new Set(), slot = {}, miss = [], tmap = {}, notes = [];
  const kind = id => (slots.find(s => s.id === id) || {}).kind, terms = id => { const s = slots.find(q => q.id === id); return s ? MCP.trSockets(s, L).map(x => x.t) : []; };
  const elsOf = id => S.els.filter(e => e.d === id && e.t && e.k !== 'w'), need = id => [...new Set(elsOf(id).flatMap(e => e.t))];
  Object.entries(o.assign || {}).forEach(([id, sid]) => { slot[id] = sid; used.add(sid); });
  const take = (id, pred, pref) => { if (slot[id]) return true; const c = slots.filter(s => !used.has(s.id) && pred(s)); const s = (pref && c.find(pref)) || c[0]; if (!s) return false; used.add(s.id); slot[id] = s.id; return true; };
  const fits = id => s => need(id).every(t => terms(s.id).includes(t));
  const P = S.power, motors = !P ? [] : P.feeders ? P.feeders.map(f => f.motor) : [P.motor || 'M1'];
  Object.keys(D).sort(natural).forEach(id => { const d = D[id], els = elsOf(id), op = (els.find(e => e.op) || {}).op; let ok = true;
    switch (d.type) {
      case 'cb': ok = take(id, s => s.kind === 'mcb3', s => s.id === id); break;
      case 'fuse': ok = take(id, s => s.kind === 'mcb1'); break;
      case 'coil': ok = take(id, s => s.kind === (/^KA/.test(id) ? 'ka' : 'km'), s => s.id === id); break;
      case 'timer': ok = take(id, s => s.kind === 'kt', s => s.id === id); break;
      case 'ol': ok = take(id, s => s.kind === 'ol'); break;
      case 'pb': { const mush = op === 'mush' || d.cap === 'mush'; ok = take(id, s => (s.kind === 'pbs' || s.kind === 'pbx') && (mush ? s.cap === 'mush' : s.cap !== 'mush') && fits(id)(s), s => s.cap === d.cap); break; }
      case 'sel': ok = take(id, s => s.kind === 'sel2' && fits(id)(s)) || take(id, s => s.kind === 'sel3' && fits(id)(s)); break;
      case 'msel': ok = take(id, s => s.kind === ((d.positions || []).length > 2 ? 'sel3' : 'sel2') && fits(id)(s)) || take(id, s => /^sel/.test(s.kind) && fits(id)(s)); break;
      case 'lamp': ok = take(id, s => s.kind === 'lamp', s => s.code === d.code); break;
      case 'sen': ok = id === 'F3' || !op ? take(id, s => s.kind === 'f3') : take(id, s => (s.kind === 'sw' || s.kind === 'swb') && s.op === op && fits(id)(s), null) || take(id, s => (s.kind === 'sw' || s.kind === 'swb') && fits(id)(s)); break;
      case 'fault': return;
      default: ok = false; }
    if (!ok) miss.push([`${id}: ชุดฝึกไม่มีอุปกรณ์ตัวนี้ให้ใช้ (หรือใช้ครบแล้ว)`, `${id}: the trainer has no free device for it`]); });
  motors.forEach(m => { if (!take(m, s => s.kind === 'motor', s => s.id === m)) miss.push([`${m}: ชุดฝึกมีมอเตอร์ 3 เฟสเพียง 2 ตัว`, `${m}: the trainer has only two three-phase motors`]); });
  if (P && P.phases === 1) miss.push(['วงจรนี้ใช้มอเตอร์ 1 เฟส ชุดฝึกนี้ยังไม่มี', 'this circuit needs a single-phase motor, which this trainer does not have yet']);
  // terminal numbers: the same where the trainer device has them; plug-in relays and timers get their changeover numbers
  Object.entries(slot).forEach(([id, sid]) => { const k = kind(sid), have = terms(sid), m = {}; tmap[id] = m;
    if (k === 'motor') return; const els = elsOf(id);
    if (k === 'ka' || k === 'kt') { const co = k === 'ka' ? [1, 2, 3, 4] : [1, 2], busy = new Set();
      els.forEach(e => { if (e.t.every(t => have.includes(t))) { e.t.forEach(t => { m[t] = t; }); if (e.k === 'NO' || e.k === 'NC') busy.add(+String(e.t[0])[0] - (k === 'kt' ? 0 : 0)); } });
      els.filter(e => !e.t.every(t => have.includes(t))).forEach(e => { if (e.k === 'coil') { miss.push([`${id}: ขั้วคอยล์ ${e.t.join('–')}`, `${id}: coil terminals ${e.t.join('–')}`]); return; }
        const s = +String(e.t[0])[0], c = [s, ...co].find(x => co.includes(x) && !busy.has(x)); if (!c) { miss.push([`${id} ${e.t.join('–')}: ไม่มีชุดหน้าสัมผัสว่าง`, `${id} ${e.t.join('–')}: no free changeover left`]); return; } busy.add(c);
        const C = k === 'ka' ? `${c}1` : `${c}5`, NO = k === 'ka' ? `${c}4` : `${c}8`, NC = k === 'ka' ? `${c}2` : `${c}6`;
        m[e.t[0]] = C; m[e.t[1]] = e.k === 'NO' ? NO : NC; notes.push([`${id}: ในแบบ ${e.t.join('–')} → ขั้วบนอุปกรณ์ ${C}–${m[e.t[1]]}`, `${id}: ${e.t.join('–')} in the drawing → ${C}–${m[e.t[1]]} on the device`]); }); }
    else need(id).forEach(t => { if (have.includes(t)) m[t] = t; else miss.push([`${id}:${t} ไม่มีบนอุปกรณ์ ${sid} ของชุดฝึก`, `${id}:${t} does not exist on the trainer's ${sid}`]); }); });
  const rev = {}; Object.entries(slot).forEach(([id, s]) => { rev[s] = id; });
  return { slot, rev, tmap, miss, notes };
};
/* the reference wiring of a circuit on the trainer: { pairs: [{ a, b, key, kind }] (trainer sockets, e.g. 'KM1:13' → 'X2:4'),
   fixed: [[socket, …], …] (joined inside the trainer: the PE bar), asg, label(socket) → '-S1:11' (circuit names), keyLab(key) }.
   Control wiring from WD.Wiring (door devices and field switches through -X2 unless o.door === false), power wiring built here
   (one motor, two motors with branch breakers (power.feeders), or reversing; -X1 as MCP.TRAINER.x1), the motor terminal box (o.box 'star' default | 'delta' | { M1: 'delta' }),
   the measuring inputs of F3 from the load side of Q1. */
MCP.trRef = (sim, o = {}) => {
  const L = o.layout || MCP.TRAINER, S = sim.spec, asg = o.asg || MCP.trAssign(sim, o), pairs = [], miss = asg.miss.slice(), D = S.devices;
  const map = ref => { const [d, t] = ref.split(':'); if (d === 'X1' || d === 'X2') { const n = +t, st = L.devices.find(x => x.id === d); if (st && n > st.n) { miss.push([`-${d} ของชุดฝึกมี ${st.n} ขั้ว แต่วงจรนี้ต้องใช้ขั้วที่ ${n}`, `the trainer's -${d} has ${st.n} terminals; this circuit needs terminal ${n}`]); return null; } return ref; }
    if (d === '_PE') return `PE:${Math.min(+t || 1, (L.devices.find(x => x.id === 'PE') || { n: 8 }).n)}`; if (d.startsWith('_')) return null;
    const s = asg.slot[d]; if (!s) return null; const m = asg.tmap[d] || {}, tt2 = m[t] !== undefined ? m[t] : t; return `${s}:${tt2}`; };
  const add = (a, b, key, kind) => { const A = map(a), B = map(b); if (A && B && A !== B) pairs.push({ a: A, b: B, key: String(key), kind }); };
  // control wiring
  const P = S.power, loc = {}; Object.entries(D).forEach(([id, d]) => { if (o.door === false) return; if (['pb', 'sel', 'msel', 'lamp'].includes(d.type)) loc[id] = 'door';
    if (d.type === 'sen' && id !== 'F3' && S.els.some(e => e.d === id && e.op)) loc[id] = 'field'; });
  const q = P ? [].concat(P.main || [], P.stages || []).find(t => t.k === 'cb') : null, top = q && P.tap !== 'before' ? `${q.d}:2` : `X1:${L.x1.L1}`;
  if (S.els.length && global.WD && WD.Wiring) { const hs = new RL.Sim(document.createElement('div'), S, { sheet: false }), wd = new WD.Wiring(document.createElement('div'), hs, { locs: loc, power: false, controls: false, linkSim: false, feed: { top, bot: `X1:${L.x1.N}` } });
    wd.m.conds.forEach(c => add(c.a, c.b, c.key, c.kind)); wd.m.bridges.forEach(b => add(b.a, b.b, b.key, 'bridge')); }
  // power wiring
  if (P && P.phases !== 1) { const ph = [L.x1.L1, L.x1.L2, L.x1.L3].map(n => `X1:${n}`), PH = ['L1', 'L2', 'L3']; let peN = 2;
    const chain = (stages, ins, keys) => ins.map((v, p) => { let prev = v; (stages || []).forEach(st => { if (st.k === 'rev') return; add(prev, `${st.d}:${2 * p + 1}`, keys[p], 'pow'); prev = `${st.d}:${2 * p + 2}`; }); return prev; });
    const motorOut = (m, outs) => { const mx = L.x1[m], ms = asg.slot[m]; if (!mx || !ms) return;
      outs.forEach((v, k) => { add(v, `X1:${mx[UVW[k]]}`, UVW[k], 'pow'); add(`X1:${mx[UVW[k]]}`, `${m}:${UVW[k]}`, UVW[k], 'pow'); });
      add(`_PE:${peN++}`, `X1:${mx.PE}`, 'PE', 'pe'); add(`X1:${mx.PE}`, `${m}:PE`, 'PE', 'pe');
      const box = typeof o.box === 'object' ? o.box[m] || 'star' : o.box || 'star';
      (box === 'delta' ? [['U1', 'W2'], ['V1', 'U2'], ['W1', 'V2']] : [['W2', 'U2'], ['U2', 'V2']]).forEach(([a, b]) => pairs.push({ a: `${ms}:${a}`, b: `${ms}:${b}`, key: 'box', kind: 'box', box, m })); };
    add(`X1:${L.x1.PE}`, '_PE:1', 'PE', 'pe');
    if (P.sd && sim.sdNet) {   // chapter 8: the designed star-delta wiring (sdWires of a fresh simulator), six motor leads + PE through -X1, no terminal-box links
      const ps = new RL.Sim(document.createElement('div'), S, { sheet: false }), Nt = ps.sdNet(), C = Nt.cfg, m = C.motor, mx = (L.x1sd || {})[m] || null, ms = asg.slot[m];
      const par = new Map(), f = k => { if (!par.has(k)) par.set(k, k); let r = k; while (par.get(r) !== r) r = par.get(r); par.set(k, r); return r; }, W = ps.sdWires(), nets = new Map();
      W.forEach(([a, b]) => { const x = f(a), y = f(b); if (x !== y) par.set(x, y); });
      W.forEach(pr => pr.forEach(k => { const r = f(k); if (!nets.has(r)) nets.set(r, []); if (!nets.get(r).includes(k)) nets.get(r).push(k); }));
      const phOf = ks => { const e = Nt.edges.find(x => x.k === 'w' && x.ph !== undefined && (ks.includes(x.a) || ks.includes(x.b))); return e ? PH[e.ph] : 'L'; };
      nets.forEach(ks => { const mt = ks.find(k => k.startsWith(m + ':')), t = mt ? mt.split(':')[1] : null;
        if (t === 'PE') { if (mx) { add(`_PE:${peN++}`, `X1:${mx.PE}`, 'PE', 'pe'); add(`X1:${mx.PE}`, `${m}:PE`, 'PE', 'pe'); } return; }
        const key = t || (ks.every(k => k.split(':')[0] === C.star) ? 'Y' : phOf(ks)), panel = ks.filter(k => k !== mt).map(k => (/^SUP:L[123]$/.test(k) ? `X1:${L.x1[k.slice(4)]}` : k));
        for (let i = 1; i < panel.length; i++) add(panel[i - 1], panel[i], key, 'pow');
        if (mt && mx && mx[t] && ms && panel.length) { add(panel[panel.length - 1], `X1:${mx[t]}`, key, 'pow'); add(`X1:${mx[t]}`, `${m}:${t}`, key, 'pow'); }
        else if (mt) miss.push([`${m}:${t}: ไม่มีขั้วบน -X1 สำหรับมอเตอร์ 6 สาย`, `${m}:${t}: no -X1 terminal for a six-lead motor`]); }); }
    else if (P.feeders) { let ins = chain([].concat(P.main || []), ph, PH);   // the busbar: the second branch is fed from the line terminals of the first (two leads per socket at most)
      P.feeders.forEach(f => { const st = (f.stages || []).filter(t => t.k !== 'rev'), outs = chain(st, ins, PH); if (st[0]) ins = [0, 1, 2].map(p => `${st[0].d}:${2 * p + 1}`); motorOut(f.motor, outs); }); }
    else if (P.rev) { const V = sim.revInfo(), bus = chain(V.pre, ph, PH);
      V.fmap.forEach((pp, k) => add(bus[pp - 1], `${V.fwd}:${2 * k + 1}`, PH[pp - 1], 'pow'));
      V.map.forEach((pp, k) => { const j = V.fmap.indexOf(pp); add(j >= 0 ? `${V.fwd}:${2 * j + 1}` : bus[pp - 1], `${V.rev}:${2 * k + 1}`, PH[pp - 1], 'pow'); });
      [0, 1, 2].forEach(k => add(`${V.rev}:${2 * k + 2}`, `${V.fwd}:${2 * k + 2}`, UVW[k], 'pow'));
      motorOut(P.motor || 'M1', chain(V.post, [0, 1, 2].map(k => `${V.fwd}:${2 * k + 2}`), UVW)); }
    else motorOut(P.motor || 'M1', chain(P.stages, ph, PH));
    if (asg.slot.F3 && D.F3 && q) {   // F3 measures after Q1; taken from the line terminals of the next power stage so that Q1:2 keeps two leads at most (it already feeds the next stage and control wire 1)
      const st = [].concat(P.main || [], P.stages || []), nx = st[st.indexOf(q) + 1];
      ['L1', 'L2', 'L3'].forEach((l, k) => add(nx && nx.d && nx.k !== 'rev' ? `${nx.d}:${2 * k + 1}` : `${q.d}:${2 * k + 2}`, `F3:${l}`, 'F3', 'pow')); } }
  const fixed = [L.devices.filter(d => d.kind === 'pebar').flatMap(d => MCP.trSockets(d, L).map(s => s.id))];
  const label = sk => { const [s, t] = sk.split(':'), dv = L.devices.find(x => x.id === s) || {}; if (dv.kind === 'pebar') return T(`บาร์ PE (${t})`, `PE bar (${t})`); if (dv.kind === 'strip') return `${dv.tag || '-' + s}:${t}`;
    const id = asg.rev[s]; return `-${id ? MCP.name(sim, id) : dv.tag || s}:${t}`; };
  const keyLab = k => (/^\d+$/.test(k) ? T(`สาย ${k}`, `wire ${k}`) : k === 'box' ? T('กล่องขั้วมอเตอร์', 'motor terminal box') : k === 'F3' ? T('อินพุตวัดของ F3', 'F3 measuring inputs') : k === 'Y' ? T('สะพานสตาร์ (KM2 2–4–6)', 'star bridge (KM2 2–4–6)') : k);
  return { pairs, fixed, asg, miss, label, keyLab, terms: new Set(pairs.flatMap(p => [p.a, p.b])) };
};
/* the student's leads against the reference: { ok, missing: [pair], wrong: [{ w, keys }], extra: [{ w, t }], dup: [w], done: Set of
   pair indexes already joined }. Equivalent chains are accepted (only the nets count: a lead may join any two sockets of one wire). */
MCP.trCompare = (ref, wires) => {
  const uf = () => { const p = new Map(), f = k => { if (!p.has(k)) p.set(k, k); let r = k; while (p.get(r) !== r) r = p.get(r); p.set(k, r); return r; }; return { f, u: (a, b) => { const x = f(a), y = f(b); if (x !== y) p.set(x, y); } }; };
  const R = uf(), Sd = uf(); ref.fixed.forEach(g => g.forEach(s => { R.u(g[0], s); Sd.u(g[0], s); })); ref.pairs.forEach(p => R.u(p.a, p.b));
  const inRef = s => ref.terms.has(s) || ref.fixed.some(g => g.includes(s) && g.some(x => ref.terms.has(x)));
  const keyOfNet = new Map(); ref.pairs.forEach(p => { const r = R.f(p.a); if (!keyOfNet.has(r)) keyOfNet.set(r, p.key); });
  const wrong = [], extra = [], dup = [], seen = new Set();
  wires.forEach(w => { Sd.u(w.a, w.b); const k = [w.a, w.b].sort().join('|'); if (seen.has(k)) dup.push(w); seen.add(k);
    const ia = inRef(w.a), ib = inRef(w.b); if (!ia || !ib) { extra.push({ w, t: !ia ? w.a : w.b }); return; }
    if (R.f(w.a) !== R.f(w.b)) wrong.push({ w, keys: [keyOfNet.get(R.f(w.a)), keyOfNet.get(R.f(w.b))] }); });
  const done = new Set(), missing = []; ref.pairs.forEach((p, i) => { if (Sd.f(p.a) === Sd.f(p.b)) done.add(i); else missing.push(p); });
  return { ok: !missing.length && !wrong.length && !extra.length && !ref.miss.length, missing, wrong, extra, dup, done };
};
/* the reference leads in wiring order (power first, then the control wires by number, N, PE, the motor box), split into chains:
   [{ key, chain: [socket, …], idx: [pair indexes] }] */
MCP.trChecklist = ref => {
  const rank = k => (['L1', 'L2', 'L3'].includes(k) ? 0 : UVW.includes(k) ? 1 : ['W2', 'U2', 'V2'].includes(k) ? 1.5 : k === 'Y' ? 1.7 : k === 'F3' ? 2 : k === 'PE' ? 3 : k === 'box' ? 4 : /^\d+$/.test(k) ? 10 + +k : k === 'N' ? 9000 : 9999);   // W2 U2 V2 and Y: star-delta (chapter 8)
  const keys = [...new Set(ref.pairs.map(p => p.key))].sort((a, b) => rank(a) - rank(b) || natural(a, b)), out = [];
  keys.forEach(k => { const idx = ref.pairs.map((p, i) => (p.key === k ? i : -1)).filter(i => i >= 0), left = new Set(idx);
    while (left.size) { const first = [...left][0], comp = new Set([first]), q = [first];
      while (q.length) { const i = q.shift(); left.delete(i); [...left].forEach(j => { const a = ref.pairs[i], b = ref.pairs[j]; if ([a.a, a.b].some(s => s === b.a || s === b.b)) { comp.add(j); left.delete(j); q.push(j); } }); }
      const ps = [...comp].map(i => ref.pairs[i]), deg = new Map(); ps.forEach(p => [p.a, p.b].forEach(s => deg.set(s, (deg.get(s) || 0) + 1)));
      let chain = null; if ([...deg.values()].every(d => d <= 2)) { const start = [...deg.keys()].find(s => deg.get(s) === 1) || ps[0].a; chain = [start]; const used = new Set();
        while (used.size < ps.length) { const cur = chain[chain.length - 1], n = ps.findIndex((p, j) => !used.has(j) && (p.a === cur || p.b === cur)); if (n < 0) break; used.add(n); chain.push(ps[n].a === cur ? ps[n].b : ps[n].a); }
        if (used.size < ps.length) chain = null; }
      out.push({ key: k, chain, pairs: ps, idx: [...comp] }); } });
  return out; };

/* new MCP.Trainer(el, sim, o): the virtual trainer for one circuit (an RL.Sim, which may be drawn elsewhere on the page). The student
   taps two sockets to place a lead (point-to-point wiring); taps a lead to select it and taps it again to remove it. The wiring checklist
   ("wire 3: -F2:96 → -X2:3 → -S1:11") comes from the circuit (WD.Wiring + the power circuit) and ticks itself as leads join each wire;
   "Check" compares the leads with the reference (missing / wrong / extra); "Power on" works only when the wiring is correct (the
   teacher's check), then the simulator runs: the door buttons, selectors, Q1, the overload reset and the field switches operate it,
   lamps light, contactors pull in, the motor turns. While live, the trainer refuses lead changes (tap a socket or a lead: "switch the
   supply off first"); a programmatic change (addWire, autoWire, o.wires through changed()) switches the supply off before it applies.
   o: box ('star' | 'delta' motor connection), door (false: door devices wired directly, without -X2), assign ({ S1: 'SB2', … }),
   wires ([{ a, b, col }] start with these leads), ticks (default true: tick the checklist as you wire), zoom (number; default: fit on
   wide screens, 1 on phones), layout (another trainer object instead of MCP.TRAINER), onChange(trainer), demo (true: a "wire it for
   me" button for the teacher). Methods: addWire(a, b, col), removeWire(i), autoWire(), check() → MCP.trCompare result, power(on). */
MCP.Trainer = class {
  constructor(el, sim, o = {}) {
    this.el = el; this.sim = sim; this.o = o; this.L = o.layout || MCP.TRAINER; this.key = 'tn' + (++UID);
    this.asg = MCP.trAssign(sim, o); this.ref = MCP.trRef(sim, { ...o, asg: this.asg }); this.cl = MCP.trChecklist(this.ref);
    this.sd = MCP.isSD(sim); this.lowV = this.sd && +(sim.sdCfg().V || 400) < 300;   // chapter 8: six-lead motor; the lab's low-voltage supply
    this.wires = (o.wires || []).map(w => ({ ...w })); this.sel = null; this.selW = -1; this.col = 'RD'; this.live = false; this.shown = false;
    this.zoom = o.zoom || (typeof window !== 'undefined' && window.innerWidth < 760 ? 1 : null); this.cmp = MCP.trCompare(this.ref, this.wires);
    sim.setMains(false);
    el.classList.add('mcp-trainer');
    el.innerHTML = '<div class="toggles mcp-trbar"></div><div class="toggles mcp-trlead"></div><div class="mcp-trscroll"><div class="mcp-trsvg"></div></div><div class="status mcp-trst"></div><div class="mcp-trres"></div>' +
      `<details class="mcp-trcl" open><summary>${T('รายการเดินสาย (เรียงตามลำดับที่ควรต่อ)', 'Wiring checklist (in a good wiring order)')}</summary><div class="mcp-trnotes"></div><ol class="mcp-trlist"></ol></details>` +
      `<details class="mcp-trdev"><summary>${T('อุปกรณ์บนชุดฝึก (ตำแหน่ง รุ่น เลขขั้ว)', 'Devices on the trainer (position, model, terminals)')}</summary><div class="mcp-trtab"></div></details>`;
    const q = s => el.querySelector(s); this.box = q('.mcp-trsvg'); this.sc = q('.mcp-trscroll'); this.st = q('.mcp-trst'); this.res = q('.mcp-trres'); this.ol = q('.mcp-trlist');
    const bar = q('.mcp-trbar');
    btn(bar, '−', () => this.setZoom(-1)).title = T('ย่อ', 'zoom out'); btn(bar, '+', () => this.setZoom(1)).title = T('ขยาย', 'zoom in'); btn(bar, T('พอดีจอ', 'fit'), () => this.setZoom(0));
    btn(bar, T('ย้อนสายล่าสุด', 'undo the last lead'), () => { if (this.wires.length) this.removeWire(this.wires.length - 1); });
    btn(bar, T('ถอดสายทั้งหมด', 'remove all leads'), () => { if (this.live) return this.say('!', T('ตัดไฟก่อนแก้สาย', 'switch the supply off before changing the wiring'), 'warn'); this.wires = []; this.changed(); });
    btn(bar, T('ตรวจการเดินสาย', 'check the wiring'), () => { this.check(); this.showRes(); });
    this.pB = btn(bar, '', () => this.power(!this.live));
    if (o.demo) btn(bar, T('ต่อให้ดู (ครู)', 'wire it for me (teacher)'), () => this.autoWire());
    const lead = q('.mcp-trlead'); lead.insertAdjacentHTML('beforeend', `<span class="mcp-tl">${T('สีสาย:', 'lead colour:')}</span>`); this.lb = {};
    Object.entries(this.L.leads).forEach(([k, v]) => { this.lb[k] = btn(lead, `<i class="mcp-dot" style="background:${v[2]}${k === 'GNYE' ? ';background-image:repeating-linear-gradient(90deg,#2fa84f 0 4px,#f2c230 4px 8px)' : ''}"></i>${T(v[0], v[1])}`, () => { this.col = k; this.leadBar(); }); });
    this.leadBar();
    this.box.addEventListener('pointerdown', e => this.down(e)); this.onUp = e => this.up(e); window.addEventListener('pointerup', this.onUp); window.addEventListener('pointercancel', this.onUp);
    this.box.addEventListener('click', e => this.click(e));
    sim.on(() => this.draw());
    this.draw(); this.list(); this.devTable(); this.status();
  }
  leadBar() { Object.entries(this.lb).forEach(([k, b]) => b.classList.toggle('on', k === this.col)); }
  setZoom(d) { const z = this.zoom || (this.sc.clientWidth ? this.sc.clientWidth / this.L.W : 0.8); this.zoom = d === 0 ? null : Math.max(0.5, Math.min(3, +(z * (d > 0 ? 1.25 : 0.8)).toFixed(2))); this.draw(); }
  say(p, s, k) { status(this.st, p, s, k); }
  status() { const n = this.wires.length, d = this.cmp.done.size, all = this.ref.pairs.length, P = this.pB;
    if (P) { P.textContent = this.live ? T('ตัดไฟ', 'switch the supply off') : T('จ่ายไฟ (หลังครูตรวจ)', 'power on (after the teacher\'s check)'); P.classList.toggle('danger', !this.live); P.classList.toggle('on', this.live); }
    if (this.live) return this.say(T('มีไฟ', 'LIVE'), T('ชุดฝึกมีไฟ: ใช้ปุ่มหน้าตู้ Q1 และสวิตช์ทดสอบวงจร ห้ามแตะหรือถอดสาย', 'The trainer is live: operate it with the door buttons, Q1 and the switches. Do not touch or move leads'), 'bad');
    this.say(`${n} ${T('เส้น', n === 1 ? 'lead' : 'leads')}`, (this.sel ? T(`เลือก ${this.ref.label(this.sel)} แล้ว แตะขั้วปลายอีกด้าน`, `${this.ref.label(this.sel)} picked: tap the socket at the other end`) : T('แตะเต้ารับสองจุดเพื่อต่อสายหนึ่งเส้น', 'tap two sockets to place a lead')) +
      ` · ${T(`ต่อครบ ${d}/${all} ช่วงในรายการ`, `${d}/${all} checklist links joined`)}`, this.sel ? 'warn' : 'wait'); }
  /* ---------------- leads ---------------- */
  addWire(a, b, col) { if (a === b) return false; this.wires.push({ a, b, col: col || this.col }); this.changed(); return true; }
  removeWire(i) { if (this.live) { this.say('!', T('ตัดไฟก่อนแก้สาย', 'switch the supply off before changing the wiring'), 'warn'); return; } this.wires.splice(i, 1); this.selW = -1; this.changed(); }
  colourFor(p) { return p.key === 'PE' ? 'GNYE' : p.key === 'N' ? 'BU' : p.kind === 'pow' || p.kind === 'box' || p.kind === 'pe' ? 'BK' : 'RD'; }
  autoWire() { if (this.live) this.power(false); this.wires = this.ref.pairs.map(p => ({ a: p.a, b: p.b, col: this.colourFor(p) })); this.changed(); }
  changed() { if (this.live) this.power(false); this.cmp = MCP.trCompare(this.ref, this.wires); this.list(); this.draw(); this.status(); if (this.shown) this.showRes(); if (this.o.onChange) this.o.onChange(this); }
  check() { this.cmp = MCP.trCompare(this.ref, this.wires); this.shown = true; return this.cmp; }
  /* the teacher's check, then the supply: only a correct wiring may be energised */
  power(on) { if (!on) { this.live = false; this.sim.setMains(false); this.status(); this.draw(); return true; }
    const c = this.check(); this.showRes();
    if (!c.ok) { this.say('✗', T('ยังจ่ายไฟไม่ได้: การเดินสายยังไม่ถูกต้อง (ดูรายการข้างล่าง)', 'Not yet: the wiring is not correct (see the list below)'), 'bad'); return false; }
    this.live = true; this.sim.setMains(true); this.status(); this.draw(); return true; }
  showRes() { const c = this.cmp, R = this.ref, lab = s => esc(R.label(s)), kl = k => esc(R.keyLab(k)), li = a => a.map(x => `<li>${x}</li>`).join('');
    let h = '';
    if (R.miss.length) h += `<div class="badbox"><b>${T('ชุดฝึกนี้ทำวงจรนี้ไม่ได้', 'This trainer cannot build this circuit')}</b><ul>${li(R.miss.map(m => esc(tt(m))))}</ul></div>`;
    if (c.ok) h += `<div class="callout mcp-ok">${T(`การเดินสายถูกต้อง (${this.wires.length} เส้น) ให้ครูตรวจ แล้วจึงจ่ายไฟ`, `The wiring is correct (${this.wires.length} leads). Let the teacher check it, then power on`)}</div>`;
    else if (!R.miss.length) { const parts = [];
      if (c.missing.length) parts.push(`<b>${T(`ยังขาด ${c.missing.length} ช่วง`, `${c.missing.length} link${c.missing.length === 1 ? '' : 's'} missing`)}</b><ul>${li(c.missing.slice(0, 12).map(p => `${kl(p.key)}: ${lab(p.a)} → ${lab(p.b)}`))}${c.missing.length > 12 ? '<li>…</li>' : ''}</ul>`);
      if (c.wrong.length) parts.push(`<b>${T('ต่อผิด (สายนี้ไปรวมสายต่างเส้นกัน)', 'Wrong leads (they join two different wires)')}</b><ul>${li(c.wrong.map(x => `${lab(x.w.a)} — ${lab(x.w.b)}: ${kl(x.keys[0])} ${T('กับ', 'with')} ${kl(x.keys[1])}`))}</ul>`);
      if (c.extra.length) parts.push(`<b>${T('สายเกิน (ขั้วที่วงจรนี้ไม่ใช้)', 'Extra leads (a socket this circuit does not use)')}</b><ul>${li(c.extra.map(x => `${lab(x.w.a)} — ${lab(x.w.b)} (${lab(x.t)})`))}</ul>`);
      h += `<div class="warnbox">${parts.join('')}</div>`; }
    if (this.sd) { const ms = this.asg.slot[this.sim.spec.power.motor || 'M1'], box = c.wrong.filter(x => [x.w.a, x.w.b].every(k => ms && k.split(':')[0] === ms));   // chapter 8: a link left in the terminal box
      if (box.length) h += `<div class="badbox"><b>${T('ห้ามมีสะพานในกล่องขั้วมอเตอร์', 'No links in the motor terminal box')}</b>: ${box.map(x => `${lab(x.w.a)} — ${lab(x.w.b)}`).join(', ')}. ${T('สตาร์–เดลตาใช้คอนแทกเตอร์ต่อปลายขดลวด ถ้ามีสะพานค้าง KM2 หรือ KM3 จะลัดวงจร L1–L2–L3 ตอนเริ่มหรือตอนเปลี่ยนเป็นเดลตา', 'In star-delta the contactors join the winding ends: with a link left in, KM2 or KM3 shorts L1–L2–L3 at the start or at the change to delta')}</div>`; }
    const warn = [];
    if (c.dup.length) warn.push(T(`มีสายซ้ำ ${c.dup.length} เส้น (ต่อสองจุดเดิมซ้ำ)`, `${c.dup.length} duplicate lead${c.dup.length === 1 ? '' : 's'} (the same two sockets twice)`));
    const kOf = w => { const p = R.pairs.find(q => [q.a, q.b].includes(w.a) || [q.a, q.b].includes(w.b)); return p ? p.key : null; };
    const pe = this.wires.filter(w => kOf(w) === 'PE' && w.col !== 'GNYE').length, nn = this.wires.filter(w => kOf(w) === 'N' && w.col !== 'BU').length;
    if (pe) warn.push(T('สาย PE ควรใช้สีเขียว-เหลืองเท่านั้น', 'PE leads should be green-yellow only')); if (nn) warn.push(T('สาย N ควรใช้สีฟ้า', 'N leads should be blue'));
    if (warn.length) h += `<p class="hint">${warn.join(' · ')}</p>`;
    this.res.innerHTML = h; }
  /* ---------------- checklist and device table ---------------- */
  list() { const R = this.ref, c = this.cmp, tick = this.o.ticks !== false;
    const notes = [...this.asg.notes.map(n => esc(tt(n)))]; const box = R.pairs.find(p => p.kind === 'box'); if (box) notes.push(box.box === 'delta' ? T('มอเตอร์ต่อเดลตา (230 V ต่อขด)', 'motor in delta') : T('มอเตอร์ต่อสตาร์ ใส่สะพาน W2–U2–V2 ในกล่องขั้ว', 'motor in star: bridge W2–U2–V2 in the terminal box'));
    if (this.sd) notes.push(T('สตาร์–เดลตา: ถอดสะพานในกล่องขั้วมอเตอร์ออกทั้งหมด ต่อสาย 6 เส้น U1 V1 W1 W2 U2 V2 ผ่าน -X1:6–8 และ 10–12 กับ PE ที่ -X1:9', 'star-delta: remove every link from the motor terminal box; six leads U1 V1 W1 W2 U2 V2 through -X1:6–8 and 10–12, PE on -X1:9'));
    this.el.querySelector('.mcp-trnotes').innerHTML = notes.length ? `<p class="hint">${notes.join(' · ')}</p>` : '';
    this.ol.innerHTML = this.cl.map(g => { const ok = tick && g.idx.every(i => c.done.has(i)), s = g.chain ? g.chain.map(x => esc(R.label(x))).join(' → ') : g.pairs.map(p => `${esc(R.label(p.a))} → ${esc(R.label(p.b))}`).join('; ');
      return `<li class="${ok ? 'done' : ''}"><b>${esc(R.keyLab(g.key))}</b>: ${s}${ok ? ' ✓' : ''}</li>`; }).join(''); }
  devTable() { const L = this.L, rows = L.devices.map(dv => { const K = L.kinds[dv.kind] || {}, id = this.asg.rev[dv.id];
      return `<tr><td data-h="${T('ตำแหน่ง', 'slot')}"><b>${esc(dv.tag || dv.id)}</b></td><td data-h="${T('ในวงจรนี้', 'in this circuit')}">${id ? `<b>${esc(MCP.name(this.sim, id))}</b>` : '–'}</td><td data-h="${T('อุปกรณ์', 'device')}">${esc(tt(K.name))}<br><span class="hint">${esc(dv.model || '')}</span></td>` +
        `<td data-h="${T('ขั้ว', 'terminals')}">${esc(MCP.trSockets(dv, L).map(s => s.t).join(' '))}</td></tr>`; }).join('');
    this.el.querySelector('.mcp-trtab').innerHTML = `<p class="hint">${esc(tt(L.note))}</p><div style="overflow-x:auto"><table class="tbl stack"><tr><th>${T('ตำแหน่ง', 'slot')}</th><th>${T('ในวงจรนี้', 'in this circuit')}</th><th>${T('อุปกรณ์ / รุ่น', 'device / model')}</th><th>${T('ขั้ว (เต้ารับ)', 'terminals (sockets)')}</th></tr>${rows}</table></div>`; }
  /* ---------------- interaction ---------------- */
  cid(slot) { return this.asg.rev[slot]; }
  down(e) { const g = e.target.closest('[data-press]'); if (!g) return; e.preventDefault(); const id = this.cid(g.getAttribute('data-press')), d = id && this.sim.dev[id]; if (!d || d.type !== 'pb') return;
    const latch = this.sim.latching ? this.sim.latching(id) : false; if (latch) { this.sim.press(id, !d.pressed); return; } this.held = id; this.sim.press(id, true); }
  up() { if (!this.box.isConnected) { window.removeEventListener('pointerup', this.onUp); return; } if (this.held) { const id = this.held; this.held = null; this.sim.press(id, false); } }
  click(e) { const s = e.target.closest('[data-s]'), w = e.target.closest('[data-w]'), tg = e.target.closest('[data-tog]');
    if (s) { this.tapSocket(s.getAttribute('data-s')); return; }
    if (tg) { const id = this.cid(tg.getAttribute('data-tog')), d = id && this.sim.dev[id]; if (!d) return;
      if (d.type === 'fuse') { if (d.blown) this.sim.toggle(id); } else if (d.type === 'msel') this.sim.toggle(id); else this.sim.toggle(id); return; }
    if (w) { const i = +w.getAttribute('data-w'); if (this.selW === i) this.removeWire(i); else { this.selW = i; const x = this.wires[i]; this.say(T('เลือกสาย', 'lead'), T(`${this.ref.label(x.a)} — ${this.ref.label(x.b)} · แตะอีกครั้งเพื่อถอดออก`, `${this.ref.label(x.a)} — ${this.ref.label(x.b)} · tap it again to remove it`), 'warn'); this.draw(); } } }
  tapSocket(id) { if (this.live) { this.say('!', T('ห้ามต่อหรือถอดสายขณะมีไฟ ตัดไฟก่อน', 'Never wire a live trainer: switch the supply off first'), 'bad'); return; }
    this.selW = -1; if (!this.sel) this.sel = id; else if (this.sel === id) this.sel = null; else { const a = this.sel; this.sel = null; this.addWire(a, id); return; } this.draw(); this.status(); }
  /* ---------------- drawing ---------------- */
  draw() { if (!this.box) return; const L = this.L, z = this.zoom; this.box.innerHTML = this.svg(); const v = this.box.querySelector('svg');
    if (v) { v.style.width = z ? `${Math.round(L.W * z)}px` : '100%'; v.style.maxWidth = z ? 'none' : '100%'; } }
  svg() { const L = this.L, sim = this.sim, live = this.live, sock = [], P = L.pitch, R = L.socket;
    let s = `<defs><pattern id="${this.key}g" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#c3c9cf"/><circle cx="2" cy="2" r=".7" fill="#b3b9c0"/></pattern></defs>`;
    L.zones.forEach(zn => { const bg = zn.id === 'plate' ? `url(#${this.key}g)` : zn.id === 'door' ? '#d5d9de' : '#e6e1d3';
      s += `<rect x="${zn.x}" y="${zn.y}" width="${zn.w}" height="${zn.h}" rx="8" fill="${bg}" stroke="#8f959d" stroke-width="1.4"/>` + IE.T(esc(tt(zn.lab)), zn.x + zn.w - 8, zn.y + zn.h - 6, { size: 9, anchor: 'end', col: '#4a515c', weight: 700 }); });
    L.ducts.forEach(([x, y, w, h]) => { s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#9aa3ad" opacity=".55" stroke="#7d858f"/>`; });
    L.rails.forEach(([x1, y, x2]) => { s += `<rect x="${x1}" y="${y - 6}" width="${x2 - x1}" height="12" fill="#e2e5e8" stroke="#9aa0a8"/><line x1="${x1}" y1="${y - 2}" x2="${x2}" y2="${y - 2}" stroke="#b9bec4"/><line x1="${x1}" y1="${y + 2}" x2="${x2}" y2="${y + 2}" stroke="#b9bec4"/>`; });
    L.devices.forEach(dv => { const [w, h] = MCP.trSize(dv, L), K = L.kinds[dv.kind] || {}, id = this.cid(dv.id), used = !!id || dv.kind === 'strip' || dv.kind === 'pebar', d = id ? sim.dev[id] : null;
      const tag = id ? MCP.name(sim, id) : dv.tag || dv.id, body = dv.kind === 'strip' ? '#e8e3c9' : dv.kind === 'pebar' ? '#d8c66a' : K.face === 'pb' || K.face === 'sel' || K.face === 'lamp' ? '#eef0f2' : '#eceef0';
      s += `<g class="mcp-trd${used ? '' : ' unused'}"><title>${esc(`${dv.tag || dv.id}${id ? ` = ${tag}` : ''} · ${tt(K.name)} · ${dv.model || ''}`)}</title><rect x="${dv.x}" y="${dv.y}" width="${w}" height="${h}" rx="5" fill="${body}" stroke="#6f767f" stroke-width="1.2"/>`;
      s += this.face(dv, w, h, d, id) + IE.T(esc(tag), dv.x + w / 2, dv.y - 4, { size: dv.kind === 'strip' || dv.kind === 'pebar' ? 10 : 11, anchor: 'middle', weight: 700, col: id || dv.kind === 'strip' || dv.kind === 'pebar' ? '#16181b' : '#7d858f' }) + '</g>';
      MCP.trSockets(dv, L).forEach(k => { sock.push(k); const pe = (dv.kind === 'strip' && dv.under && dv.under[+k.t - 1] === 'PE') || dv.kind === 'pebar' || k.t === 'PE', n = dv.kind === 'strip' && dv.under && dv.under[+k.t - 1] === 'N';
        s += `<circle cx="${k.x}" cy="${k.y}" r="${R}" fill="${pe ? '#2fa84f' : n ? '#2f6fd6' : '#3b424d'}" stroke="${pe ? '#f2c230' : '#1f2328'}" stroke-width="${pe ? 2 : 1}"/><circle cx="${k.x}" cy="${k.y}" r="2.5" fill="#d9dde2"/>`;
        if (dv.kind === 'strip') { const und = (this.sd && dv.underSd) || dv.under; s += IE.T(k.t, k.x, k.y - 10, { size: 7.5, anchor: 'middle', col: '#2a2f36' }); if (und) s += IE.T(und[+k.t - 1] || '', k.x, k.y + 16, { size: 7, anchor: 'middle', weight: 700, col: '#4a515c' }); }
        else if (dv.kind !== 'pebar') { s += IE.T(k.t, k.x, k.up ? k.y - 8.5 : k.y + 14.5, { size: 7.5, anchor: 'middle', weight: 700, col: '#2a2f36' });
          if (K.pins && K.pins[k.t]) s += IE.T(`(${K.pins[k.t]})`, k.x + 9, k.up ? k.y - 8.5 : k.y + 14.5, { size: 5.5, col: '#6f767f' }); } }); });
    // the supply comes in pre-wired on -X1:1–5
    const x1 = L.devices.find(d => d.id === 'X1'); if (x1) { const ss = MCP.trSockets(x1, L).slice(0, 5); ss.forEach(k => { s += `<path d="M ${k.x} ${k.y + 6} L ${k.x} ${x1.y + 50} L ${k.x - 8} 574" fill="none" stroke="${k.t === '5' ? '#2fa84f' : k.t === '4' ? '#2f6fd6' : '#5a4636'}" stroke-width="2.4" opacity=".75"/>`; });
      if (this.lowV && L.supplyLabLow) { const q2 = tt(L.supplyLabLow).split('|'), wq = Math.min(L.zones[0].x + L.zones[0].w - x1.x - 176, Math.max(...q2.map(q => q.length)) * 4.3 + 10);   // chapter 8: the lab's low-voltage supply, on a light card so it reads over the plate
        s += `<rect x="${x1.x + 167}" y="542" width="${f1(wq)}" height="${11 * q2.length + 4}" rx="3" fill="#fffaf0" fill-opacity=".94" stroke="#a31d17" stroke-width=".7"/>`;
        q2.forEach((q, i) => { s += IE.T(esc(q), x1.x + 172, 551 + 11 * i, { size: 7.5, col: '#a31d17', weight: 700 }); }); }
      else s += IE.T(esc(tt(L.supplyLab)), x1.x + 104, 568, { size: 7.5, col: '#4a515c' }); }
    // leads
    const pos = new Map(sock.map(k => [k.id, k])), nPer = new Map(); this.wires.forEach(w => [w.a, w.b].forEach(t => nPer.set(t, (nPer.get(t) || 0) + 1)));
    this.wires.forEach((w, i) => { const A = pos.get(w.a), B = pos.get(w.b); if (!A || !B) return; const d = Math.hypot(B.x - A.x, B.y - A.y), sg = Math.min(70, 14 + d * 0.2), c = (L.leads[w.col] || L.leads.RD)[2];
      const path = `M ${A.x} ${A.y} C ${A.x} ${f1(A.y + sg)} ${B.x} ${f1(B.y + sg)} ${B.x} ${B.y}`, on = i === this.selW;
      s += (on ? `<path d="${path}" fill="none" stroke="var(--accent)" stroke-width="7" stroke-opacity=".55"/>` : '') + `<path d="${path}" fill="none" stroke="${c}" stroke-width="2.8" stroke-linecap="round" opacity=".92"/>` +
        (w.col === 'GNYE' ? `<path d="${path}" fill="none" stroke="#f2c230" stroke-width="2.8" stroke-dasharray="6 6" opacity=".95"/>` : '') +
        `<path data-w="${i}" d="${path}" fill="none" stroke="rgba(0,0,0,0)" stroke-width="12" pointer-events="stroke" style="cursor:pointer"/>`; });
    this.wires.forEach(w => [w.a, w.b].forEach(t => { const k = pos.get(t); if (k) s += `<circle cx="${k.x}" cy="${k.y}" r="4.3" fill="${(L.leads[w.col] || L.leads.RD)[2]}" stroke="#16181b" stroke-width=".8"/>`; }));
    if (this.sel && pos.get(this.sel)) { const k = pos.get(this.sel); s += `<circle cx="${k.x}" cy="${k.y}" r="${R + 4}" fill="none" stroke="var(--accent)" stroke-width="3"/>`; }
    // socket hit layer on top of the leads
    s += sock.map(k => `<circle data-s="${k.id}" cx="${k.x}" cy="${k.y}" r="${R + 2.5}" fill="rgba(0,0,0,0)" pointer-events="all" style="cursor:pointer"><title>${esc(this.ref.label(k.id))}${nPer.get(k.id) ? ` (${nPer.get(k.id)})` : ''}</title></circle>`).join('');
    const bx = L.W - 190, by = 604;   // supply state, in the free corner of the field zone
    s += live ? `<rect x="${bx}" y="${by}" width="170" height="28" rx="5" fill="#d83a34"/>` + IE.T(T('มีไฟ! ห้ามแตะสาย', 'LIVE! hands off the leads'), bx + 85, by + 18.5, { size: 11, anchor: 'middle', weight: 700, col: '#ffffff' })
      : `<rect x="${bx}" y="${by}" width="170" height="28" rx="5" fill="#e9ecef" stroke="#8f959d"/>` + IE.T(T('ไม่มีไฟ (ตัดไฟอยู่)', 'no supply (isolated)'), bx + 85, by + 18.5, { size: 11, anchor: 'middle', weight: 700, col: '#4a515c' });
    return IE.svg(L.W, L.H, s, { cls: 'mcp-trv', label: 'motor-control trainer' }); }
  /* the front of one device, drawn from its state in the simulator */
  face(dv, w, h, d, id) { const K = this.L.kinds[dv.kind] || {}, x = dv.x, y = dv.y, sim = this.sim, act = id ? !!sim.act(id) : false, cx = x + w / 2; let s = '';
    const lamp = (px, py, on, col, r = 4) => `<circle cx="${px}" cy="${py}" r="${r}" fill="${on ? col : '#59607e'}" stroke="#1f2328"/>`;
    switch (K.face) {
      case 'mcb': { const on = d ? (d.type === 'fuse' ? !d.blown : !!d.on) : true, ym = y + h / 2;
        s += `<g${id ? ` data-tog="${dv.id}" style="cursor:pointer"` : ''}><rect x="${cx - 8}" y="${ym - 18}" width="16" height="36" rx="3" fill="#3b424d"/><rect x="${cx - 6}" y="${on ? ym - 16 : ym}" width="12" height="16" rx="2" fill="${on ? '#d83a34' : '#9aa3b5'}"/></g>` +
          IE.T(on ? 'I' : 'O', cx + (w > 40 ? 18 : 0), ym + (w > 40 ? 4 : 30), { size: 9, anchor: 'middle', weight: 700, col: '#2a2f36' }); break; }
      case 'f3': { const ok = d ? !!d.on : false; s += `<g${id ? ` data-tog="${dv.id}" style="cursor:pointer"` : ''}>${lamp(cx - 12, y + 52, ok && this.live, '#3ccf6a')}${lamp(cx + 12, y + 52, d && !d.on, '#ff4d4d')}</g>` + IE.T('ON  FAULT', cx, y + 66, { size: 6, anchor: 'middle', col: '#4a515c' }); break; }
      case 'kt': { const en = d && d.energized; s += `<circle cx="${cx}" cy="${y + 52}" r="12" fill="#3b424d"/><line x1="${cx}" y1="${y + 52}" x2="${cx + 8}" y2="${y + 44}" stroke="#e9ecef" stroke-width="2"/>` + lamp(x + 12, y + 40, en, '#3ccf6a', 3.5) + lamp(x + w - 12, y + 40, act, '#ffc233', 3.5) +
          (d ? IE.T(`${d.T} s`, cx, y + 76, { size: 7.5, anchor: 'middle', weight: 700, col: '#2a2f36' }) : ''); break; }
      case 'ka': s += `<rect x="${x + 12}" y="${y + 46}" width="${w - 24}" height="36" rx="4" fill="#bcd4f0" fill-opacity=".85" stroke="#4d6f99"/>` + lamp(cx, y + 64, act, '#ff4d4d', 3.5) + IE.T(act ? 'ON' : '', cx + 10, y + 67, { size: 7, weight: 700, col: '#16181b' }); break;
      case 'km': s += `<rect x="${x + 12}" y="${y + 38}" width="${w - 24}" height="80" rx="4" fill="#dfe2e6" stroke="#8f959d"/>` + `<rect x="${cx - 12}" y="${y + 70}" width="24" height="14" rx="2" fill="${act ? '#2fa84f' : '#3b424d'}"/>` + IE.T(act ? 'I' : 'O', cx, y + 81, { size: 9, anchor: 'middle', weight: 700, col: '#ffffff' }); break;
      case 'ol': { const tr = d && d.tripped; s += `<g${id ? ` data-tog="${dv.id}" style="cursor:pointer"` : ''}><circle cx="${x + w - 22}" cy="${y + 44}" r="9" fill="#2f6fd6" stroke="#1f3f7a"/>${IE.T('R', x + w - 22, y + 47.5, { size: 9, anchor: 'middle', weight: 700, col: '#ffffff' })}</g>` +
          `<rect x="${x + 16}" y="${y + 36}" width="40" height="14" rx="2" fill="${tr ? '#d83a34' : '#3b424d'}"/>` + IE.T(tr ? 'TRIP' : 'OK', x + 36, y + 46.5, { size: 8, anchor: 'middle', weight: 700, col: '#ffffff' }); break; }
      case 'pb': { const mush = dv.cap === 'mush', on = d && d.pressed, CAP = { white: '#f4f6f8', black: '#2a2f36', grey: '#9aa3b5', green: '#2fa84f', red: '#d83a34' }, c = CAP[dv.cap] || '#f4f6f8', cy = y + 36;
        s += `<g data-press="${dv.id}" style="cursor:pointer;touch-action:none">` + (mush ? `<rect x="${cx - 26}" y="${cy - 26}" width="52" height="52" rx="6" fill="#f2c230" stroke="#b8901c"/><circle cx="${cx}" cy="${cy}" r="${on ? 17 : 20}" fill="${on ? '#a82a25' : '#d83a34'}" stroke="#7a1d19"/>`
          : `<circle cx="${cx}" cy="${cy}" r="22" fill="#b9bec4" stroke="#80868f"/><circle cx="${cx}" cy="${cy}" r="${on ? 14 : 17}" fill="${c}" stroke="#59607e"/>`) + '</g>' +
          IE.T(dv.tag || '', cx, y + 66, { size: 6.5, anchor: 'middle', weight: 700, col: '#4a515c' }); break; }
      case 'sel': { const P = K.pos, at = !d ? P[0] : d.type === 'msel' ? d.at : d.on ? 'I' : '0', i = Math.max(0, d && d.type === 'msel' ? d.positions.indexOf(d.at) : P.indexOf(at)), n = (d && d.type === 'msel' ? d.positions.length : P.length), a = -45 + 90 * i / Math.max(1, n - 1), cy = y + 36;
        s += `<g${id ? ` data-tog="${dv.id}"` : ''} style="cursor:pointer"><circle cx="${cx}" cy="${cy}" r="18" fill="#2a2f36" stroke="#59607e"/><rect x="${cx - 4}" y="${cy - 17}" width="8" height="26" rx="3" fill="#e9ecef" transform="rotate(${a} ${cx} ${cy})"/></g>` +
          IE.T(d && d.type === 'msel' ? String(d.at) : at, cx, y + 66, { size: 7, anchor: 'middle', weight: 700, col: '#2a2f36' }); break; }
      case 'lamp': { const on = d && d.energized, col = dv.color; s += (on ? `<circle cx="${cx}" cy="${y + 36}" r="22" fill="${col}" opacity=".45"/>` : '') + `<circle cx="${cx}" cy="${y + 36}" r="17" fill="#b9bec4" stroke="#80868f"/><circle cx="${cx}" cy="${y + 36}" r="13" fill="${on ? col : '#59607e'}" stroke="#3b424d"/>` +
          IE.T(dv.code || '', cx, y + 66, { size: 6.5, anchor: 'middle', weight: 700, col: '#4a515c' }); break; }
      case 'sw': { const on = d && d.on; s += `<g${id ? ` data-tog="${dv.id}" style="cursor:pointer"` : ''}><rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="26" rx="3" fill="#3b424d"/><line x1="${cx}" y1="${y + 14}" x2="${cx + (on ? 4 : 14)}" y2="${y + (on ? 4 : 6)}" stroke="#2a2f36" stroke-width="3"/><circle cx="${cx + (on ? 4 : 14)}" cy="${y + (on ? 4 : 6)}" r="4" fill="#9aa3b5"/></g>` +
          IE.T({ lim: 'LIMIT', flt: 'FLOAT', prs: 'PRESS.', tmp: 'TEMP.' }[dv.op] || '', cx, y + 31, { size: 7, anchor: 'middle', weight: 700, col: '#e9ecef' }) + (on ? IE.T(T('ทำงาน', 'operated'), cx, y + 50, { size: 6.5, anchor: 'middle', col: '#a31d17', weight: 700 }) : ''); break; }
      case 'motor': { const run = id && (sim.runningM ? sim.runningM(id) : sim.running()), dir = run && sim.dir ? sim.dir(id) : 0;
        s += `<rect x="${x + 6}" y="${y + 28}" width="${w - 12}" height="62" rx="4" fill="#dfe2e6" stroke="#8f959d"/><circle cx="${x + w - 16}" cy="${y + 14}" r="10" fill="#7d858f" stroke="#3b424d"/>` + IE.T('M 3~', x + 10, y + 18, { size: 8, weight: 700, col: '#2a2f36' });
        if (run) s += IE.T(dir === 'ccw' ? '↺' : '↻', x + w - 16, y + 18, { size: 13, anchor: 'middle', weight: 700, col: '#d83a34' }) + IE.T(dir === 'ccw' ? T('ทวนเข็ม', 'anticlockwise') : T('ตามเข็ม', 'clockwise'), x + w - 30, y + 18, { size: 7, anchor: 'end', weight: 700, col: '#d83a34' });
        if (id && this.sd && this.live) { const q = sim.sd(), lab = q === 'star' ? T('สตาร์ (Y)', 'star (Y)') : q === 'delta' ? T('เดลตา (Δ)', 'delta (Δ)') : q === 'fault:single' ? T('คราง!', 'hums!') : q === 'short' ? T('ลัดวงจร!', 'short!') : q && q !== 'open' ? T('ผิดปกติ', 'abnormal') : '';   // chapter 8
          if (lab) s += IE.T(lab, x + w - 8, y + 40, { size: 8, anchor: 'end', weight: 700, col: q === 'star' || q === 'delta' ? '#1d8a4a' : '#a31d17' }); }
        break; }
      default: break; }
    return s; }
};

/* ---------------- 5) MCP.SymbolDrill: symbol ↔ device photo ↔ name ↔ terminal numbers ----------------
   new MCP.SymbolDrill(el, ids, o): one device at a time (ids = devdata.js card ids: mcb mpcb fuse ol km ka kt pb sel lamp motor term).
   The IEC symbol(s) of the device are shown; the student picks (1) the photo of the device, (2) its name, (3) its terminal numbers,
   each from o.n (default 4) choices. A right first pick = 1 point; a wrong pick turns red and the student tries again (no point).
   Photos only from devdata.js (Wikimedia Commons cards, credits listed under the drill). o: ask (default ['photo', 'name', 'terms']),
   n, seed (shuffle; default 1), from ('symbol' default | 'photo': start from the photo and ask for the symbol, name, terminals),
   onScore(got, all). Methods: go(k), pick(q, i) (tests), score() → [got, all]. */
const rnd = seed => { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
MCP.symOf = d => { const S = global.C2 && C2.SYMS ? C2.SYMS : [], list = (d.syms || []).map(id => S.find(s => s.id === id)).filter(Boolean);
  if (list.length) return list.map(s => C2.symSVG(s, 0.95)).join('');
  if (d.id === 'term') return IE.svg(92, 92, IE.L(46, 8, 46, 38) + '<circle cx="46" cy="46" r="8"/>' + IE.L(46, 54, 46, 84) + IE.T('-X1:3', 58, 50, { size: 11, weight: 700 }), { max: 87, label: 'terminal' });
  return ''; };
MCP.SymbolDrill = class {
  constructor(el, ids, o = {}) {
    this.el = el; this.o = o; const all = global.DEVDATA || []; this.devs = (ids || all.map(d => d.id)).map(id => all.find(d => d.id === id)).filter(Boolean); this.pool = all;
    this.ask = o.ask || ['photo', 'name', 'terms']; if (o.from === 'photo') this.ask = this.ask.map(a => (a === 'photo' ? 'symbol' : a)); this.n = Math.max(2, Math.min(6, o.n || 4)); this.r = rnd(o.seed || 1);
    this.pts = this.devs.map(() => this.ask.map(() => null)); this.k = 0; this.q = 0; this.used = new Set();
    el.classList.add('mcp-drill'); el.innerHTML = '<div class="mcp-dhead"></div><div class="mcp-dbody"><div class="mcp-dsym"></div><div class="mcp-dq"></div></div><div class="toggles mcp-dnav"></div><details class="mcp-dcred"><summary></summary><ul></ul></details>';
    const q = s => el.querySelector(s); this.hd = q('.mcp-dhead'); this.sy = q('.mcp-dsym'); this.qe = q('.mcp-dq'); this.nav = q('.mcp-dnav'); this.cr = q('.mcp-dcred');
    this.cr.querySelector('summary').textContent = T('ที่มาของภาพ', 'Photo credits');
    this.qe.addEventListener('click', e => { const b = e.target.closest('[data-o]'); if (b) this.pick(this.q, +b.getAttribute('data-o')); });
    this.opts = this.devs.map(d => this.ask.map(a => this.options(d, a)));
    this.go(0);
  }
  shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(this.r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  val(d, a) { return a === 'photo' ? d.imgs[0] : a === 'name' ? tt(d.name) : a === 'terms' ? tt(d.terms).split(' · ').filter(x => x.length <= 80).slice(0, 3).join(' · ') : a === 'symbol' ? MCP.symOf(d) : ''; }   // terminal numbers: the first short parts of the card text
  /* the right device and n − 1 others that differ in what is asked */
  options(d, a) { const others = this.shuffle(this.pool.filter(x => x.id !== d.id && (a !== 'symbol' || MCP.symOf(x)) && this.val(x, a) && String(this.val(x, a).src || this.val(x, a)) !== String(this.val(d, a).src || this.val(d, a))));
    const pickd = [], seen = new Set([String(this.val(d, a).src || this.val(d, a))]); others.forEach(x => { const v = String(this.val(x, a).src || this.val(x, a)); if (pickd.length < this.n - 1 && !seen.has(v)) { seen.add(v); pickd.push(x); } });
    return this.shuffle([d, ...pickd]).map(x => ({ id: x.id, ok: x.id === d.id, wrong: false })); }
  go(k) { this.k = Math.max(0, Math.min(this.devs.length - 1, k)); this.q = this.pts[this.k].findIndex(p => p === null); if (this.q < 0) this.q = this.ask.length; this.draw(); }
  score() { const flat = this.pts.flat(); return [flat.filter(p => p === 1).length, flat.length]; }
  pick(q, i) { if (q !== this.q || q >= this.ask.length) return null; const o = this.opts[this.k][q][i]; if (!o) return null;
    if (!o.ok) { o.wrong = true; this.draw(); return false; }
    this.pts[this.k][q] = this.opts[this.k][q].some(x => x.wrong) ? 0 : 1; this.q++; this.draw(); if (this.o.onScore) this.o.onScore(...this.score()); return true; }
  qText(a) { return { photo: T('อุปกรณ์จริงตัวไหนมีสัญลักษณ์นี้', 'Which real device has this symbol?'), symbol: T('สัญลักษณ์ใดเป็นของอุปกรณ์นี้', 'Which symbol belongs to this device?'),
    name: T('อุปกรณ์นี้ชื่ออะไร', 'What is this device called?'), terms: T('เลขขั้วของอุปกรณ์นี้คือข้อใด', 'Which terminal numbers does it have?') }[a]; }
  optHtml(a, x) { const d = this.pool.find(z => z.id === x.id), v = this.val(d, a);
    if (a === 'photo') { this.used.add(d.id); return `<img src="${esc(v.src)}?v=15" width="${v.w}" height="${v.h}" loading="lazy" decoding="async" alt="${esc(tt(d.name))}">`; }
    if (a === 'symbol') return `<span class="mcp-dsy">${v}</span>`; return `<span>${esc(v)}</span>`; }
  draw() { const d = this.devs[this.k], [got, all] = this.score(), done = this.q >= this.ask.length;
    this.hd.innerHTML = `<b>${T('อุปกรณ์', 'Device')} ${this.k + 1}/${this.devs.length}</b> · <span class="fscore">${T(`คะแนน ${got}/${all}`, `score ${got}/${all}`)}</span>`;
    const first = this.o.from === 'photo' ? `<figure class="mcp-dpic"><img src="${esc(d.imgs[0].src)}?v=15" width="${d.imgs[0].w}" height="${d.imgs[0].h}" alt="${esc(tt(d.name))}"></figure>` : `<div class="mcp-dsyms">${MCP.symOf(d)}</div>`;
    if (this.o.from === 'photo') this.used.add(d.id);
    this.sy.innerHTML = first + this.ask.map((a, i) => (i < this.q ? `<p class="mcp-dgot">✓ ${a === 'photo' ? `<img class="mcp-dmini" src="${esc(d.imgs[0].src)}?v=15" width="${d.imgs[0].w}" height="${d.imgs[0].h}" alt="${esc(tt(d.name))}">` : a === 'symbol' ? `<span class="mcp-dsy">${MCP.symOf(d)}</span>` : esc(this.val(d, a))}</p>` : '')).join('');
    if (done) { this.qe.innerHTML = `<div class="callout mcp-ok"><b>${esc(tt(d.name))}</b> · ${T('รหัสในวิชา', 'course code')} ${esc(d.code)} · IEC 81346-2 ${esc(d.iec)}<br>${esc(tt(d.what))}</div>`; }
    else { const a = this.ask[this.q], O = this.opts[this.k][this.q];
      this.qe.innerHTML = `<p class="lead"><b>${this.q + 1}/${this.ask.length}</b> ${this.qText(a)}</p><div class="mcp-dopts ${a}">${O.map((x, i) => `<button type="button" class="mcp-dopt${x.wrong ? ' bad' : ''}" data-o="${i}"${x.wrong ? ' disabled' : ''}>${this.optHtml(a, x)}</button>`).join('')}</div>`; }
    this.nav.innerHTML = ''; btn(this.nav, T('◂ ตัวก่อน', '◂ previous'), () => this.go(this.k - 1)); const nb = btn(this.nav, T('ตัวต่อไป ▸', 'next ▸'), () => this.go(this.k + 1)); if (done) nb.classList.add('on');
    this.cr.querySelector('ul').innerHTML = [...this.used].map(id => this.pool.find(z => z.id === id)).filter(Boolean).map(x => `<li><b>${esc(tt(x.name))}</b>: ${global.DEV && DEV.credit ? DEV.credit(x.imgs[0]) : ''}</li>`).join(''); }
};
global.MCP = MCP;
})(window);
