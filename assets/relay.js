/* relay.js — relay-logic simulator for IEC control circuits (chapter 2 on).
   A circuit is drawn on a grid between a top rail (L) and a bottom rail (N). Elements are vertical (contacts, coils, lamps, fuses)
   or wires; each sits in a column x (current path) from row y to y + h. The simulator finds which loads are energised, lets coils
   actuate their contacts, runs timers, detects short circuits (the control fuse blows), colours the live wires, animates the current,
   numbers the current paths and writes the contact cross-reference under every coil, as IEC drawings do.
   spec = { devices: { id: {type, ...} }, supply: 'Q1', cols, rows, els: [...], power: {...}, pathNo: x => number }
   device types: cb (breaker, on), fuse (blown), pb (push button, momentary), sel (maintained switch), sen (sensor: lim/flt/prs/tmp, on),
                 msel (multi-position selector: positions, at; its contacts carry e.pos = positions where they are closed),
                 ol (overload relay, tripped), coil (contactor or relay KM/KA), timer (mode 'on'|'off', T seconds), lamp (color)
   element: { k: 'NO'|'NC'|'coil'|'lamp'|'fuse'|'w', d: device, x, y, h, t: [top, bottom terminal], op, td, pts: [[x,y],...] for wires } */
(function (global) {
'use strict';
const RL = {}, IE = global.IEC;
const COL = { live: '#ff6b6b', cur: '#ff4d4d', ncur: '#3fa9f5', nlive: '#3fa9f5', dead: 'currentColor' };

RL.Sim = class {
  constructor(el, spec, o = {}) {
    this.el = el; this.spec = spec; this.o = o; this.dev = {}; this.msg = ''; this.listeners = [];
    Object.entries(spec.devices).forEach(([id, d]) => { this.dev[id] = { id, ...d, on: d.on ?? (d.type === 'cb'), pressed: false, energized: false, tripped: false, blown: false, tOn: 0, hold: 0, at: d.at ?? (d.positions ? d.positions[Math.floor(d.positions.length / 2)] : undefined) }; });
    this.DX = o.dx || 86; this.DY = o.dy || 58; this.solve(); this.render();
    el.addEventListener('pointerdown', e => this.down(e)); window.addEventListener('pointerup', () => this.up()); el.addEventListener('pointercancel', () => this.up());
    el.addEventListener('click', e => this.click(e));
  }
  on(fn) { this.listeners.push(fn); }
  emit() { this.listeners.forEach(fn => fn(this)); }
  /* ---------------- device state */
  act(id) { const d = this.dev[id]; if (!d) return false;
    switch (d.type) { case 'pb': return d.pressed; case 'sel': case 'sen': case 'cb': return d.on; case 'ol': return d.tripped; case 'coil': return d.energized;
      case 'timer': return d.mode === 'off' ? (d.energized || d.hold > 0) : (d.energized && d.tOn >= d.T); default: return false; } }
  /* actuated state of one contact element (multi-position selectors depend on the element's own positions) */
  actE(e) { if (e.pos) return e.pos.includes(this.dev[e.d].at);
    const d = this.dev[e.d]; if (d && d.type === 'timer' && (e.k === 'NO' || e.k === 'NC') && !e.td) return d.energized;   // a plain contact of a timer is instantaneous
    return this.act(e.d); }
  conducts(e) { if (e.k === 'w') return true; if (e.k === 'fuse') return !this.dev[e.d].blown; if (e.k === 'cb') return this.dev[e.d].on;
    if (e.k === 'NO') return this.actE(e); if (e.k === 'NC') return !this.actE(e); return false; }
  isLoad(e) { return e.k === 'coil' || e.k === 'lamp'; }
  supplyOn() { const s = this.spec.supply; return !s || (this.dev[s] && this.dev[s].on && !this.dev[s].blown); }
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
    E.forEach(ed => { ed.load = this.isLoad(ed.e); ed.cond = !ed.load && this.conducts(ed.e); if (ed.cond) { add(ed.a, ed.b, ed); add(ed.b, ed.a, ed); } });
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
      Object.entries(en).forEach(([id, v]) => { const d = this.dev[id]; if (d.energized !== v) { d.energized = v; changed = true; if (!v && d.type === 'timer') d.tOn = 0; } });
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
  /* ---------------- time: timers */
  step(dt) { let ch = false; Object.values(this.dev).forEach(d => { if (d.type !== 'timer') return; const before = this.act(d.id);
      if (d.energized) { d.tOn += dt; d.hold = d.T; } else { d.tOn = 0; d.hold = Math.max(0, d.hold - dt); } if (this.act(d.id) !== before) ch = true; });
    if (ch) { this.solve(); this.render(); this.emit(); } }
  /* ---------------- interaction */
  devAt(e) { const g = e.target.closest('[data-dev]'); return g ? g.dataset.dev : null; }
  press(id, v) { const d = this.dev[id]; if (!d || d.type !== 'pb') return; d.pressed = v; this.update(); }
  toggle(id) { const d = this.dev[id]; if (!d) return;
    if (d.type === 'sel' || d.type === 'sen' || d.type === 'cb') d.on = !d.on; else if (d.type === 'ol') d.tripped = !d.tripped; else if (d.type === 'fuse') d.blown = false;
    else if (d.type === 'msel') { const k = d.positions.indexOf(d.at); d.at = d.positions[(k + 1) % d.positions.length]; } else return;
    if (d.type === 'cb' && d.on) this.msg = ''; if (d.type === 'fuse') this.msg = ''; this.update(); }
  update() { this.solve(); this.render(); this.emit(); }
  setPos(id, at) { const d = this.dev[id]; if (d && d.type === 'msel' && d.positions.includes(at)) { d.at = at; this.update(); } }
  down(e) { const id = this.devAt(e); if (id && this.dev[id].type === 'pb') { e.preventDefault(); this.press(id, true); this.held = id; } }
  up() { if (this.held) { const id = this.held; this.held = null; this.press(id, false); } }
  click(e) { const id = this.devAt(e); if (id && this.dev[id].type !== 'pb') this.toggle(id); }
  running(m) { const p = this.spec.power; if (!p) return false; return p.stages.every(s => (s.k === 'cb' ? this.dev[s.d].on : s.k === 'mainNO' ? this.act(s.d) : true)); }
  /* ---------------- drawing */
  X(x) { return this.ox + x * this.DX; }
  Y(y) { return this.oy + y * this.DY; }
  pathNo(x) { return this.spec.pathNo ? this.spec.pathNo(x) : x + 1; }
  render() {
    const S = this.spec, xs = S.els.flatMap(e => (e.pts ? e.pts.map(p => p[0]) : [e.x])), x0 = Math.min(...xs), x1 = Math.max(...xs);
    const pw = S.power ? 170 : 0; this.ox = pw + 70 - x0 * this.DX; this.oy = 34;
    const W = this.X(x1) + 90, xrefH = 16 + 12 * Math.max(2, ...Object.values(this.dev).filter(d => d.type === 'coil' || d.type === 'timer').map(d => this.xref(d.id).length + 1));
    const H = this.Y(S.rows) + 22 + xrefH; let s = '';
    const on = this.supplyOn() && !this.o.print, anyCur = this.cur.size > 0 && !this.o.print;
    // rails
    const railL = anyCur ? COL.cur : on ? COL.live : COL.dead, railN = anyCur ? COL.ncur : COL.dead;
    s += `<g stroke="${railL}"${anyCur ? ' class="rl-cur"' : ''}>${IE.L(this.X(x0) - 30, this.Y(0), this.X(x1) + 30, this.Y(0), { w: 2 })}</g>` + IE.T(S.railTop || 'L1', this.X(x0) - 36, this.Y(0) + 4, { anchor: 'end', size: 12, weight: 700 });
    s += `<g stroke="${railN}"${anyCur ? ' class="rl-cur"' : ''}>${IE.L(this.X(x0) - 30, this.Y(S.rows), this.X(x1) + 30, this.Y(S.rows), { w: 2 })}</g>` + IE.T(S.railBot || 'N', this.X(x0) - 36, this.Y(S.rows) + 4, { anchor: 'end', size: 12, weight: 700 });
    // elements
    this.edges(); const curIdx = new Set([...this.cur].map(e => e.i)), liveIdx = new Set(this.r.E.filter(e => e.cond && this.r.rL.has(e.a) && this.r.rL.has(e.b)).map(e => e.i));
    const nIdx = new Set([...this.cur].filter(e => this.r.rN.has(e.a) && this.r.rN.has(e.b)).map(e => e.i));
    S.els.forEach((e, i) => {
      const col = this.o.print ? null : curIdx.has(i) ? (nIdx.has(i) ? COL.ncur : COL.cur) : liveIdx.has(i) ? COL.live : null, cls = curIdx.has(i) && !this.o.print ? ' class="rl-cur"' : '';
      if (e.k === 'w') { const p = e.pts || [[e.x, e.y], [e.x, e.y + (e.h || 1)]];
        this.r.E.filter(ed => ed.i === i).forEach(ed => { const c = this.o.print ? null : this.cur.has(ed) ? (this.r.rN.has(ed.a) && this.r.rN.has(ed.b) ? COL.ncur : COL.cur) : ed.cond && this.r.rL.has(ed.a) && this.r.rL.has(ed.b) ? COL.live : null;
          s += `<g${c ? ` stroke="${c}"` : ''}${this.cur.has(ed) ? ' class="rl-cur"' : ''}>${IE.L(this.X(ed.pa[0]), this.Y(ed.pa[1]), this.X(ed.pb[0]), this.Y(ed.pb[1]))}</g>`; });
        p.forEach((q, j) => { if (e.dots && e.dots.includes(j)) s += `<circle cx="${this.X(q[0])}" cy="${this.Y(q[1])}" r="2.8" fill="${col || 'currentColor'}" stroke="none"/>`; }); return; }
      const x = this.X(e.x), y0 = this.Y(e.y), y1 = this.Y(e.y + (e.h || 1)), d = this.dev[e.d] || {}, live = d.energized;
      const body = IE.draw(e.k, x, y0, y1, { act: (e.k === 'NO' || e.k === 'NC') ? this.actE(e) : this.act(e.d), op: e.op, td: e.td || (d.type === 'timer' && e.k === 'coil' ? d.mode : undefined), live, lamp: d.color, blown: d.blown });
      const hit = ['pb', 'sel', 'sen', 'ol', 'cb', 'fuse', 'msel'].includes(d.type) ? ` data-dev="${e.d}" style="cursor:pointer"` : '';
      s += `<g${col ? ` stroke="${col}"` : ''}${cls}${hit}>${hit ? `<rect x="${x - 40}" y="${y0 + 6}" width="56" height="${y1 - y0 - 12}" fill="transparent" stroke="none"/>` : ''}${body}</g>`;
      const nameX = e.op ? x - 36 : e.k === 'coil' && e.td !== undefined ? x - 30 : (e.k === 'coil' && d.type === 'timer') ? x - 30 : x - 16;
      if (!this.o.noNames) s += IE.T(d.label || e.d, nameX, (y0 + y1) / 2 + 4, { anchor: 'end', size: 11, weight: 700 });
      else s += `<rect x="${nameX - 34}" y="${(y0 + y1) / 2 - 9}" width="34" height="15" fill="none" stroke="var(--muted)" stroke-dasharray="2 2"/>`;
      if (e.t && !this.o.noTerms) { s += IE.T(e.t[0], x + 5, y0 + 12, { size: 9 }) + IE.T(e.t[1], x + 5, y1 - 4, { size: 9 }); }
      if (e.pos) s += IE.T(e.pos.join(' '), x + 12, (y0 + y1) / 2 + 4, { size: 10, weight: 700, col: 'var(--accent)' }); });
    if (this.o.wireNos) s += this.renderWireNos();
    // current-path numbers and the cross-reference under each coil
    const cols = [...new Set(S.els.filter(e => e.k !== 'w').map(e => e.x))].sort((a, b) => a - b), yN = this.Y(S.rows);
    if (!this.o.noPaths) cols.forEach(x => { s += IE.T(String(this.pathNo(x)), this.X(x), yN + 16, { size: 11, anchor: 'middle', weight: 700, col: 'var(--muted)' }); });
    if (!this.o.noXref) S.els.filter(e => e.k === 'coil').forEach(e => { const list = this.xref(e.d); let yy = yN + 32;
      list.forEach(l => { s += IE.T(l, this.X(e.x), yy, { size: 9, anchor: 'middle', col: 'var(--muted)' }); yy += 12; }); });
    if (S.power) s += this.renderPower();
    const sv = IE.svg(W, H, s, { cls: 'rl', label: this.o.label || 'control circuit', max: this.o.max });
    this.el.innerHTML = sv + (this.msg === 'short' ? `<div class="badbox rl-msg">${MC.t('ลัดวงจร! ฟิวส์วงจรควบคุมขาด (หรือเบรกเกอร์ตัด) คลิกที่ฟิวส์เพื่อเปลี่ยนฟิวส์', 'Short circuit! The control fuse has blown (or the breaker tripped). Click the fuse to replace it.')}</div>` : '');
  }
  /* wire (potential) numbers: every node gets one number, read from top to bottom and left to right; L1 side = 1, N = 0 */
  wireNumbers() { const keys = new Set(); this.r.E.forEach(e => { [e.a, e.b].forEach(k => keys.add(k)); });
    // nodes joined by plain wires carry the same number
    const par = {}; keys.forEach(k => { par[k] = k; }); const f = k => (par[k] === k ? k : (par[k] = f(par[k])));
    this.r.E.filter(e => e.e.k === 'w').forEach(e => { par[f(e.a)] = f(e.b); });
    const groups = new Map(); keys.forEach(k => { const g = f(k); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(k); });
    const pos = k => (k === 'L' ? [-1, 0] : k === 'N' ? [99, 99] : k.split(',').map(Number)), out = new Map();
    const order = [...groups.values()].map(ks => ({ ks, p: ks.map(pos).sort((a, b) => a[1] - b[1] || a[0] - b[0])[0] })).sort((a, b) => a.p[1] - b.p[1] || a.p[0] - b.p[0]);
    let n = 1; order.forEach(g => { const no = g.ks.includes('N') ? 0 : n++; g.ks.forEach(k => out.set(k, no)); }); return out; }
  renderWireNos() { const nos = this.wireNumbers(); let s = ''; const done = new Set();
    this.r.E.forEach(e => { [[e.a, e.pa || null], [e.b, e.pb || null]].forEach(([k]) => { if (k === 'L' || k === 'N' || done.has(k)) return; done.add(k); const [x, y] = k.split(',').map(Number);
        s += `<g><rect x="${this.X(x) - 26}" y="${this.Y(y) - 8}" width="18" height="13" rx="3" fill="var(--panel)" stroke="var(--accent)"/>` + IE.T(String(nos.get(k)), this.X(x) - 17, this.Y(y) + 2, { size: 9, anchor: 'middle', col: 'var(--accent)', weight: 700 }) + '</g>'; }); });
    return s; }
  /* "NO 13–14 → 2" lines for the contacts of one device, from where they sit in the drawing */
  xref(id) { const S = this.spec, out = [], no = [], nc = [];
    S.els.filter(e => e.d === id && (e.k === 'NO' || e.k === 'NC')).forEach(e => (e.k === 'NO' ? no : nc).push(`${e.t ? e.t.join('–') : ''} ▸ ${this.pathNo(e.x)}`));
    if (S.power && S.power.stages.some(s => s.d === id && s.k === 'mainNO')) no.unshift(`1–2, 3–4, 5–6 ▸ ${MC.t('กำลัง', 'power')}`);
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
};
global.RL = RL;
})(window);
