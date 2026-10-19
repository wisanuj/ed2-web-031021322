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
                 open winding or filament: it carries no current and never energises) */
(function (global) {
'use strict';
const RL = {}, IE = global.IEC;
const COL = { live: '#ff6b6b', cur: '#ff4d4d', ncur: '#3fa9f5', nlive: '#3fa9f5', dead: 'currentColor' };
const CLICK = ['pb', 'sel', 'sen', 'ol', 'cb', 'fuse', 'msel', 'fault'];

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
    switch (d.type) { case 'pb': return d.pressed; case 'sel': case 'sen': case 'cb': case 'fault': return d.on; case 'ol': return d.tripped; case 'coil': return d.welded ? true : d.energized;
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
    let r; for (let it = 0; it < 30; it++) { r = this.solveOnce();
      if (r.short) { const fu = Object.values(this.dev).find(d => d.type === 'fuse' && !d.blown); if (fu) fu.blown = true; else if (this.spec.supply) this.dev[this.spec.supply].on = false;
        this.msg = 'short'; continue; }
      let changed = false; const en = {};
      r.loads.forEach(({ ed, live }) => { const d = this.dev[ed.e.d]; if (d) en[d.id] = (en[d.id] || false) || live; });
      r.E.forEach(ed => { if (ed.e.open && this.isLoad(ed.e)) { const d = this.dev[ed.e.d]; if (d && !(d.id in en)) en[d.id] = false; } });   // an open coil never energises
      Object.entries(en).forEach(([id, v]) => { const d = this.dev[id]; if (d.type === 'timer' && v) d.hold = d.T;   // an off-delay holds even if no step() ran while energised
        if (v && d.weldOnClose && !d.welded) { d.welded = true; changed = true; }
        if (d.energized !== v) { d.energized = v; changed = true; if (!v && d.type === 'timer') d.tOn = 0; } });
      if (!changed) break; }
    this.r = r; this.current(); }
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
    if (P && P.phases === 1 && P.start && dt > 0) { const run = this.running(), cs = this.cs;   // speed in per unit: about 1 s to 75 %, coasting 2.5 s
      this.spd = run ? this.spd + (1 - this.spd) * Math.min(1, dt / 0.75) : Math.max(0, this.spd - dt / 2.5);
      if (cs && this.spd >= 0.75) this.cs = false; else if (!cs && this.spd < 0.6) this.cs = true;   // opens at 75 % speed, re-closes when it runs down
      if (this.cs !== cs && !ch) { this.render(); this.emit(); } }
    if (ch) { this.solve(); this.render(); this.emit(); } }
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
    if (d.type === 'cb' && d.on) this.msg = ''; if (d.type === 'fuse') this.msg = ''; this.update(); }
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
    const pw = S.power && !this.o.noPower ? (full ? (S.power.feeders ? this.feedW() : 172) : 170) : 0; this.ox = pw + 70 - x0 * this.DX; this.oy = 34;
    const rx = this.X(x0) - (full ? 70 : 30); this.railX0 = rx;   // full power drawing: the rails start further left, where the control supply comes in
    const W = ctl ? this.X(x1) + 90 : S.power && S.power.feeders && !this.o.noPower ? this.feedW() - 20 : (S.power && S.power.phases === 1 ? 144 : 140) + 34, xrefH = 16 + 12 * Math.max(2, ...Object.values(this.dev).filter(d => d.type === 'coil' || d.type === 'timer').map(d => this.xref(d.id).length + 1));
    let H = ctl ? this.Y(S.rows) + 22 + xrefH : 0; let s = '';
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
      const body = IE.draw(e.k, x, y0, y1, { act, op: e.op, td: e.td || (d.type === 'timer' && e.k === 'coil' ? d.mode : undefined), live, lamp: d.color, blown: d.blown });
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
    // current-path numbers and the cross-reference under each coil
    const cols = [...new Set(S.els.filter(e => e.k !== 'w').map(e => e.x))].sort((a, b) => a - b), yN = this.Y(S.rows);
    if (ctl && !this.o.noPaths) cols.forEach(x => { s += IE.T(String(this.pathNo(x)), this.X(x), yN + 16, { size: 11, anchor: 'middle', weight: 700, col: 'var(--muted)' }); });
    if (ctl && !this.o.noXref) S.els.filter(e => e.k === 'coil').forEach(e => { const list = this.xref(e.d); let yy = yN + 32;
      list.forEach(l => { s += IE.T(l, this.X(e.x), yy, { size: 9, anchor: 'middle', col: 'var(--muted)' }); yy += 12; }); });
    if (S.power && !this.o.noPower) { if (full) { const pf = this.renderPowerFull(hiL, hiN); s += pf.s; H = Math.max(H, pf.bottom + 18); } else s += this.renderPower(); }
    const sv = IE.svg(W, H, s, { cls: 'rl', label: this.o.label || 'control circuit', max: ctl ? this.o.max : Math.min(this.o.max || 1e9, Math.round(W * 1.5)) });   // a power-only drawing is not blown up
    this.el.innerHTML = sv + (this.msg === 'short' ? `<div class="badbox rl-msg">${MC.t('ลัดวงจร! ฟิวส์วงจรควบคุมขาด (หรือเบรกเกอร์ตัด) คลิกที่ฟิวส์เพื่อเปลี่ยนฟิวส์', 'Short circuit! The control fuse has blown (or the breaker tripped). Click the fuse to replace it.')}</div>` : '');
  }
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
};
global.RL = RL;
})(window);
