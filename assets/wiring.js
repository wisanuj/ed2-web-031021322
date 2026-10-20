/* wiring.js — wiring (connection) diagrams and terminal tables built from any relay-simulator circuit (chapter 5 on).
   The schematic (an RL.Sim spec) says which device terminals share a node: one wire (potential) number per node, as
   RL.Sim.wireNumbers() numbers them. A layout object says where each device sits (panel, panel door, remote station, machine).
   From the two the tool works out what the electrician needs to wire the panel:
   1) WD.Wiring  model    locations; control terminals -X2: one per node per outside location, made only when the node joins the
                          panel to that location or two locations to each other (devices of one location on one node are linked there);
                          terminals of one node bridged in the strip; power terminals -X1 (supply in, motor out, own N and PE);
                          every conductor as a pair of terminal points, chained so that a terminal point takes at most two conductors;
                          cables and cores per outside location; the mirror check of the destination addresses
   2) drawing             (a) 'address' mode: every device a box with its terminals, every wire end with its wire-number sleeve and the
                          address of the remote end (IEC 62491 remote-end labelling, e.g. -X2:4 at -KM1:13); (b) 'lines' mode: point-to-
                          point lines routed in channels between the rows and lanes beside the columns; panel, door, remote-station and
                          supply boxes, the motor; tap a wire to highlight its number everywhere (diagram, tables, schematic via sim.o.hiWire)
   3) WD.terminalTable    IEC 61082-1 terminal-oriented connection table (terminal | wire no. | inside | outside | cable/core), optional
                          blank cells to fill in, a check button with a score and a show-answers button
   layout = { locs: { S1: 'door', … }, places: { door: [th, en], … }, strips: { power: 'X1', control: 'X2' },
              power: { in: [...], motor: [...] } | false, feed: { top: 'Q1:2', bot: 'X1:N' }, pe: ['remote'], cables: { door: 'W2' },
              mode: 'address' | 'lines', controls: true, linkSim: true, max: px, blankAddr, blankWires (outlines for paper), onPick: key => {} } */
(function (global) {
'use strict';
const WD = {}, IE = global.IEC, T = (th, en) => MC.t(th, en), tt = p => (Array.isArray(p) ? T(p[0], p[1]) : String(p));
const CP = 30, PADL = 22, PADR = 8, BH = 64, SP = 24, SH = 24, STUB = 6, BG = 13, CW = 5.6, TRK = 7, LG = 16, DGAP = 18;
const PLACES = { panel: ['ตู้ควบคุม', 'control panel'], door: ['ประตูตู้', 'panel door'], remote: ['สถานีควบคุมที่ 2', 'remote station'],
  field: ['ที่เครื่องจักร', 'at the machine'], supply: ['แหล่งจ่าย', 'supply'] };
const COLOR = { L1: 'BN', L2: 'BK', L3: 'GY', U1: 'BN', V1: 'BK', W1: 'GY', N: 'BU', U2: 'BU', PE: 'GNYE' };   // power cores after TIS 11-2553 (IEC 60757 codes)
const SUP = '_SUP', PEB = '_PE';                                 // pseudo devices: the incoming supply, the PE bar of the panel (and _PE@loc)
const f = v => +(+v).toFixed(1), esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = s => { const m = /^\d+/.exec(s || ''); return m ? +m[0] : 1e6; };
/* key of a wire as the tool uses it: numbers as strings, the neutral 'N' (the engine numbers it 0 or 'N') */
const keyOf = v => (v === 0 || v === '0' || v === 'N' ? 'N' : String(v));
/* order of wire keys on a strip: numbers up, then N, then PE */
const wrank = k => (/^\d+$/.test(k) ? +k : k === 'N' ? 1e6 : k === 'PE' ? 1e6 + 2 : 1e6 + 1);
WD.keyOf = keyOf; WD.PLACES = PLACES;

WD.Wiring = class {
  constructor(el, sim, o = {}) {
    this.el = el; this.sim = sim; this.o = o; this.mode = o.mode === 'lines' ? 'lines' : 'address'; this.hi = null; this.tables = [];
    this.build();
    el.innerHTML = ''; const box = document.createElement('div'); box.className = 'wd'; el.appendChild(box);
    if (o.controls !== false) { const bar = document.createElement('div'); bar.className = 'toggles wd-bar'; box.appendChild(bar); this.btns = {};
      [['address', T('ที่อยู่ปลายสาย', 'destination addresses')], ['lines', T('เส้นต่อจุดถึงจุด', 'point-to-point lines')]].forEach(([id, lab]) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (id === this.mode ? ' on' : ''); b.textContent = lab;
        b.addEventListener('click', () => this.setMode(id)); bar.appendChild(b); this.btns[id] = b; });
      const c = document.createElement('button'); c.type = 'button'; c.className = 'btn wd-clear'; c.textContent = T('ล้างไฮไลต์', 'clear highlight');
      c.addEventListener('click', () => this.pick(null)); bar.appendChild(c); }
    this.scroll = document.createElement('div'); this.scroll.className = 'wd-scroll'; box.appendChild(this.scroll);
    this.info = document.createElement('div'); this.info.className = 'wd-info'; box.appendChild(this.info);
    this.scroll.addEventListener('click', e => { const g = e.target.closest('[data-w]'); this.pick(g && g.dataset.w !== this.hi ? g.dataset.w : null); });
    if (sim && sim.el && o.linkSim !== false) sim.el.addEventListener('click', e => this.simClick(e));
    this.render();
  }
  /* ---------------- model ---------------- */
  build() {
    const s = this.sim, S = s.spec, o = this.o, P = S.power, one = !!(P && P.phases === 1), stages = P && o.power !== false ? P.stages : [];
    const strips = { power: 'X1', control: 'X2', ...(o.strips || {}) }, X1 = strips.power, X2 = strips.control;
    // power strip contents: from spec.power, or from layout.power alone for a control-only circuit (then no motor unless named)
    const pw = o.power === false || !(P || o.power) ? null : { in: one ? ['L1', 'N', 'PE'] : ['L1', 'L2', 'L3', 'N', 'PE'], motor: !P ? [] : one ? ['U1', 'U2', 'PE'] : ['U1', 'V1', 'W1', 'PE'], ...(o.power || {}) };
    const mot = P ? P.motor || 'M1' : null, nos = s.wireNumbers(), simVal = {}; nos.forEach(v => { simVal[keyOf(v)] = v; }); this.simVal = simVal;
    const names = {}; Object.entries(S.devices).forEach(([id, d]) => { names[id] = d.label || id; }); this.names = names;
    const loc = id => (id === SUP ? 'supply' : id.startsWith(PEB + '@') ? id.slice(PEB.length + 1) : id === PEB ? 'panel' : (o.locs && o.locs[id]) || (id === mot ? 'field' : 'panel'));
    const devs = new Map(), dev = (id, ord) => { if (!devs.has(id)) devs.set(id, { id, loc: loc(id), name: id.startsWith(PEB) ? 'PE' : id === SUP ? '' : names[id] || id, cols: [], ord }); return devs.get(id); };
    const nets = new Map(), net = k => { if (!nets.has(k)) nets.set(k, { key: k, refs: [] }); return nets.get(k); }, addN = (k, r) => { const n = net(k); if (!n.refs.includes(r)) n.refs.push(r); };
    // power devices first: their poles take the first columns (1-2, 3-4, 5-6), so the poles of Q1, KM1, F2 line up
    stages.forEach((st, j) => { const d = dev(st.d, -1000 + j), n = one ? (st.k === 'therm' ? 3 : 2) : 3; if (d.power === undefined) d.power = j;
      for (let p = 0; p < n; p++) d.cols.push({ k: st.k, top: `${st.d}:${2 * p + 1}`, bot: `${st.d}:${2 * p + 2}`, pole: p }); });
    // more power devices for circuits the stage chain cannot describe (reversing, star–delta): layout.power.poles = { KM2: 'mainNO' | { k, t: [['1', '2'], …] } }
    Object.entries((pw && pw.poles) || {}).forEach(([id, v], j) => { const d = dev(id, -900 + j), k = typeof v === 'string' ? v : v.k || 'mainNO', t = (typeof v === 'object' && v.t) || [['1', '2'], ['3', '4'], ['5', '6']];
      if (d.power === undefined) d.power = stages.length + j; t.forEach(([a, b], p) => d.cols.push({ k, top: `${id}:${a}`, bot: `${id}:${b}`, pole: p })); });
    // control elements: from the solved graph (a = top node, b = bottom node of every contact, coil, lamp, fuse)
    const els = s.r.E.filter(ed => ed.e.k !== 'w' && ed.e.k !== 'earth' && !(S.devices[ed.e.d] && S.devices[ed.e.d].type === 'fault')), first = {}, ctl = new Map(), posR = {};   // an earth fault is not wired
    els.forEach(ed => { const e = ed.e, p = e.x * 100 + e.y; if (!(e.d in first) || p < first[e.d]) first[e.d] = p; if (!ctl.has(e.d)) ctl.set(e.d, []); ctl.get(e.d).push(ed); });
    const load = e => (e.k === 'coil' || e.k === 'lamp' ? 0 : 1);
    ctl.forEach((list, id) => { const d = dev(id, first[id]); list.sort((u, v) => load(u.e) - load(v.e) || num(u.e.t && u.e.t[0]) - num(v.e.t && v.e.t[0]));
      list.forEach(ed => { const t = ed.e.t || ['?', '?'], a = `${id}:${t[0]}`, b = `${id}:${t[1]}`; d.cols.push({ k: ed.e.k, top: a, bot: b, td: ed.e.td || (S.devices[id] && S.devices[id].type === 'timer' && ed.e.k === 'coil' ? S.devices[id].mode : undefined) });
        addN(keyOf(nos.get(ed.a)), a); addN(keyOf(nos.get(ed.b)), b);
        if (!(a in posR)) posR[a] = ed.e.x * 1000 + ed.e.y; if (!(b in posR)) posR[b] = ed.e.x * 1000 + ed.e.y + (ed.e.h || 1); }); });
    // power strip -X1: supply in, motor out, numbered 1, 2, 3 …; the wire column carries L1 L2 L3 N PE U1 V1 W1 PE
    const strip = { [X1]: [], [X2]: [] };
    if (pw) [...pw.in.map(n => ['in', n]), ...pw.motor.map(n => ['motor', n])].forEach(([role, n], i) => strip[X1].push({ ref: `${X1}:${i + 1}`, no: i + 1, wire: n, role, loc: role === 'in' ? 'supply' : 'field' }));
    const x1 = (role, n) => strip[X1].find(r => r.role === role && r.wire === n), cb = stages.find(st => st.k === 'cb');
    const res = r => { if (!r) return null; const [d, t] = r.split(':'); if (d === X1 && !/^\d+$/.test(t)) { const x = x1('in', t) || x1('motor', t); return x ? x.ref : null; } return r; };
    // the control supply: L from the load side of Q1 (Q1:2), or its line side with power.tap 'before'; N from the strip (Q1:4 / Q1:3 single-phase)
    const bef = P && P.tap === 'before', fd = o.feed || {};
    const feed = { top: res(fd.top !== undefined ? fd.top : cb ? `${cb.d}:${bef ? 1 : 2}` : pw ? `${X1}:L1` : null), bot: res(fd.bot !== undefined ? fd.bot : one && cb ? `${cb.d}:${bef ? 3 : 4}` : pw ? `${X1}:N` : null) };
    if (feed.top && nos.has('L')) net(keyOf(nos.get('L'))).feed = feed.top; if (feed.bot && nos.has('N')) net(keyOf(nos.get('N'))).feed = feed.bot;
    const isS = r => { const d = r.split(':')[0]; return d === X1 || d === X2; }, locR = r => (isS(r) ? 'panel' : loc(r.split(':')[0]));
    const places = Object.keys(o.places || {}); [...devs.values()].forEach(d => { if (!['panel', 'field', 'supply'].includes(d.loc) && !places.includes(d.loc)) places.push(d.loc); });
    (o.pe || []).forEach(l => { if (!places.includes(l)) places.push(l); });
    const ordR = r => (r in posR ? posR[r] : -1e9);   // terminals of one node are chained in the order of the drawing (left to right, top to bottom)
    // control strip -X2: one terminal per node per outside location, when the node joins that location to the panel or to another location
    const x2 = [];
    nets.forEach(n => { const by = {}; n.refs.forEach(r => { const l = locR(r); (by[l] = by[l] || []).push(r); }); n.by = by; n.out = Object.keys(by).filter(l => l !== 'panel');
      if (n.out.length && (by.panel || n.feed || n.out.length > 1)) n.out.forEach(l => x2.push({ wire: n.key, loc: l })); });
    (o.pe || []).forEach(l => x2.push({ wire: 'PE', loc: l, pe: true }));
    x2.sort((u, v) => wrank(u.wire) - wrank(v.wire) || places.indexOf(u.loc) - places.indexOf(v.loc));
    x2.forEach((r, i) => { r.no = i + 1; r.ref = `${X2}:${i + 1}`; r.role = 'ctl'; }); strip[X2] = x2;
    // conductors: kind 'in' (inside the panel), 'out' (strip to an outside location: a cable core), 'link' (between devices of one outside
    // location), 'pow' (power wiring inside the panel); at a strip terminal 'out' lands on the outside clamp, everything else on the inside one
    const conds = [], bridges = [], link = (a, b, key, kind) => { if (a && b && a !== b) conds.push({ a, b, key, kind }); };
    nets.forEach(n => { const st = x2.filter(r => r.wire === n.key).map(r => r.ref), pin = (n.by.panel || []).slice().sort((u, v) => ordR(u) - ordR(v));
      if (n.feed && !pin.includes(n.feed)) pin.unshift(n.feed);
      const ch = st.length ? [...pin, st[0]] : pin; for (let i = 1; i < ch.length; i++) link(ch[i - 1], ch[i], n.key, 'in');
      for (let i = 1; i < st.length; i++) bridges.push({ a: st[i - 1], b: st[i], key: n.key });
      n.out.forEach(l => { const r = x2.find(q => q.wire === n.key && q.loc === l), list = n.by[l].slice().sort((u, v) => ordR(u) - ordR(v)), c2 = r ? [r.ref, ...list] : list;
        for (let i = 1; i < c2.length; i++) link(c2[i - 1], c2[i], n.key, r && i === 1 ? 'out' : 'link'); }); });
    if (pw && pw.wires) pw.wires.forEach(([a, b, k]) => link(res(a), res(b), k || 'L', 'pow'));   // layout.power.wires = [['X1:L1', 'Q1:1', 'L1'], …] replaces the chain below
    if (pw) {
      const ph = pw.wires ? [] : one ? ['L1', 'N'] : ['L1', 'L2', 'L3'];
      ph.forEach((n, p) => { const xin = x1('in', n); let prev = xin ? xin.ref : null;
        stages.forEach(st => { if (one && st.k === 'therm') { if (p) return; link(prev, `${st.d}:1`, n, 'pow'); link(`${st.d}:2`, `${st.d}:3`, n, 'pow'); link(`${st.d}:4`, `${st.d}:5`, n, 'pow'); prev = `${st.d}:6`; return; }
          link(prev, `${st.d}:${2 * p + 1}`, n, 'pow'); prev = `${st.d}:${2 * p + 2}`; });
        const mname = pw.motor[p], xm = mname && x1('motor', mname); if (xm) link(prev, xm.ref, mname, 'pow'); });
      const sup = pw.in.length ? dev(SUP, -2000) : null, m1 = mot && pw.motor.length ? dev(mot, -1999) : null; let npe = 0;
      strip[X1].forEach(r => { if (r.role === 'in' && sup) { sup.cols.push({ k: 'w', top: `${SUP}:${r.wire}` }); link(r.ref, `${SUP}:${r.wire}`, r.wire, 'out'); }
        else if (r.role === 'motor' && m1) { m1.cols.push({ k: 'w', top: `${mot}:${r.wire}` }); link(r.ref, `${mot}:${r.wire}`, r.wire, 'out'); }
        if (r.wire === 'PE') link(r.ref, `${PEB}:${++npe}`, 'PE', 'in'); });
    }
    // PE to outside locations through -X2 (layout.pe): PE bar → strip → the PE terminal of that location
    let npe2 = conds.filter(c => c.b.startsWith(PEB + ':')).length;
    x2.filter(r => r.pe).forEach(r => { link(r.ref, `${PEB}:${++npe2}`, 'PE', 'in'); const id = `${PEB}@${r.loc}`, d = dev(id, 1e6); d.cols.push({ k: 'w', top: `${id}:PE` }); link(r.ref, `${id}:PE`, 'PE', 'out'); });
    if (npe2) { const d = dev(PEB, 1e6); for (let i = 1; i <= npe2; i++) d.cols.push({ k: 'pe', top: `${PEB}:${i}` }); }
    // cables: one per outside location (motor first, then the places in layout order, the supply last); cores numbered, power cores by colour
    const allS = [...strip[X1], ...strip[X2]], cl = ['field', ...places, 'supply'].filter(l => allS.some(r => r.loc === l));
    const cables = cl.map((l, i) => ({ id: (o.cables && o.cables[l]) || `W${i + 1}`, loc: l, rows: allS.filter(r => r.loc === l) }));
    cables.forEach(c => { let k = 0; c.rows.forEach(r => { r.cable = c.id; r.core = r.wire === 'PE' ? 'GNYE' : (c.loc === 'field' || c.loc === 'supply') && COLOR[r.wire] ? COLOR[r.wire] : String(++k); }); });
    const other = (c, r) => (c.a === r ? c.b : c.a);
    allS.forEach(r => { r.inside = conds.filter(c => c.kind !== 'out' && (c.a === r.ref || c.b === r.ref)).map(c => other(c, r.ref));
      r.outside = conds.filter(c => c.kind === 'out' && (c.a === r.ref || c.b === r.ref)).map(c => other(c, r.ref));
      r.bridge = bridges.filter(b => b.a === r.ref || b.b === r.ref).map(b => other(b, r.ref)); });
    conds.forEach(c => { const r = allS.find(q => c.kind === 'out' && (q.ref === c.a || q.ref === c.b)); if (r) { c.cable = r.cable; c.core = r.core; } });
    this.m = { devs, nets, strip, X1, X2, conds, bridges, cables, places, pw, feed, one, isS };
  }
  /* point key of one end of a conductor: a strip terminal has an inside (@i) and an outside (@o) clamp */
  pk(r, c) { return this.m.isS(r) ? `${r}@${c.kind === 'out' ? 'o' : 'i'}` : r; }
  /* address of a terminal point as written at the remote end (IEC 61666: -KM1:13); short: the drawing form */
  addr(r, short) { const [d, t] = r.split(':'); if (d === SUP) return `${T('แหล่งจ่าย', 'supply')} ${t}`;
    if (d === PEB) return short ? 'PE' : T('บาร์ PE', 'PE bar'); if (d.startsWith(PEB + '@')) return short ? 'PE' : `${T('ขั้ว PE', 'PE terminal')} (${this.place(d.slice(PEB.length + 1))})`;
    return `-${this.names[d] || d}:${t}`; }
  place(l) { const p = (this.o.places && this.o.places[l]) || PLACES[l]; return p ? tt(p) : l; }
  /* title of a location box: place and its cable with the number of cores */
  locTitle(l) { const c = this.m.cables.find(q => q.loc === l), n = c ? c.rows.length : 0; return this.place(l) + (c ? ` · ${T('สาย', 'cable')} ${c.id} (${n} ${T('แกน', n === 1 ? 'core' : 'cores')})` : ''); }
  nodesOf(k) { const v = this.simVal[String(k)]; if (v === undefined) return []; if (typeof this.sim.nodesOf === 'function') return this.sim.nodesOf(v);
    const out = []; this.sim.wireNumbers().forEach((w, n) => { if (keyOf(w) === String(k)) out.push(n); }); return out; }
  /* rows of the terminal tables (all strips, or one) */
  table(sp) { const m = this.m;
    return [m.X1, m.X2].filter(s => !sp || s === sp).flatMap(s => m.strip[s].map(r => ({ term: r.ref, strip: s, no: r.no, wire: /^\d+$/.test(r.wire) ? +r.wire : r.wire, key: r.wire,
      inside: r.inside.map(x => this.addr(x)), outside: r.outside.map(x => this.addr(x)), bridge: r.bridge.map(x => this.addr(x)), cable: r.cable ? `${r.cable}/${r.core}` : '', loc: r.loc, place: this.place(r.loc) }))); }
  conductors() { return this.m.conds.map(c => ({ a: this.addr(c.a), b: this.addr(c.b), wire: c.key, kind: c.kind, cable: c.cable || '', core: c.core || '' })); }
  cables() { return this.m.cables.map(c => ({ id: c.id, loc: c.loc, place: this.place(c.loc), cores: c.rows.length, list: c.rows.map(r => ({ core: r.core, term: r.ref, wire: r.wire, to: r.outside.map(x => this.addr(x)) })) })); }
  /* labels at every terminal point (remote ends), the mirror check and the terminal-point rules (≤ 2 conductors, one PE conductor) */
  labels() { const L = new Map(); this.m.conds.forEach(c => { [[c.a, c.b], [c.b, c.a]].forEach(([p, q]) => { const k = this.pk(p, c); if (!L.has(k)) L.set(k, []); L.get(k).push({ to: this.pk(q, c), ref: q, key: c.key, c }); }); }); return L; }
  check() { const L = this.labels(), probs = []; let mirrored = 0, n = 0;
    L.forEach((list, k) => { list.forEach(l => { n++; if ((L.get(l.to) || []).some(b => b.to === k)) mirrored++; else probs.push([`${k} → ${l.to} ไม่มีที่อยู่คู่กลับ`, `${k} → ${l.to} has no mirror`]); });
      if (list.length > 2 && !k.startsWith(PEB)) probs.push([`${k} มีสาย ${list.length} เส้น (เกิน 2)`, `${k} takes ${list.length} conductors (more than 2)`]);
      if (list.filter(l => l.key === 'PE').length > 1) probs.push([`${k} มีสาย PE มากกว่า 1 เส้น`, `${k} takes more than one PE conductor`]); });
    return { ok: !probs.length, conductors: this.m.conds.length, addresses: n, mirrored, problems: probs }; }
  /* the spec or the layout changed: work the model out again and redraw; the SVG as a string (documents) */
  refresh() { this.build(); this.render(); this.tables.forEach(fn => fn()); }
  svgString() { const v = this.scroll.querySelector('svg'); return v ? v.outerHTML : this.scroll.innerHTML; }
  /* ---------------- interaction ---------------- */
  setMode(m) { this.mode = m === 'lines' ? 'lines' : 'address'; if (this.btns) Object.entries(this.btns).forEach(([id, b]) => b.classList.toggle('on', id === this.mode)); this.render(); }
  pick(k) { k = k === null || k === undefined || k === '' ? null : String(k); this.hi = k; const s = this.sim;
    if (s && s.o) { s.o.hiWire = k !== null && k in this.simVal ? this.simVal[k] : null; if (typeof s.render === 'function') s.render(); }
    this.applyHi(); this.tables.forEach(fn => fn()); if (this.o.onPick) this.o.onPick(k); }
  /* a tap on a wire number in the schematic: the engine's data-wire if present, else the nearest number badge (drawn at X(x) − 17, Y(y)) */
  simClick(e) { const s = this.sim; if (!s.o.wireNos || e.target.closest('[data-dev]')) return; const w = e.target.closest('[data-wire]');
    if (w) { const k = keyOf(w.dataset.wire); this.pick(k === this.hi ? null : k); return; }
    const svg = s.el.querySelector('svg.rl-in') || s.el.querySelector('svg'), mx = svg && svg.getScreenCTM && svg.getScreenCTM(); if (!mx) return;   // a framed drawing (sheet): the drawing's own coordinates are those of the inner svg
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(mx.inverse()); let best = null, bd = 13;
    const at = (x, y, v) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = v; } }, nos = s.wireNumbers();
    nos.forEach((v, n) => { if (n === 'L' || n === 'N') return; const [x, y] = n.split(',').map(Number); at(s.X(x) - 17, s.Y(y) - 1.5, v); });
    if (s.o.railNos && s.spec.els.length) { const xe = s.X(Math.max(...s.spec.els.flatMap(e => (e.pts ? e.pts.map(q => q[0]) : [e.x])))) + 44; if (nos.has('L')) at(xe, s.Y(0) - 1.5, nos.get('L')); at(xe, s.Y(s.spec.rows) - 1.5, 0); }   // the rail numbers (railNos)
    if (best !== null) { const k = keyOf(best); this.pick(k === this.hi ? null : k); } }
  applyHi() { this.scroll.querySelectorAll('[data-w]').forEach(g => g.classList.toggle('wd-on', g.dataset.w === this.hi));
    const k = this.hi; if (k === null) { this.info.innerHTML = `<span class="hint">${this.mode === 'address' ? T('ปลายสายทุกเส้นมีปลอกเลขสาย และเขียนที่อยู่ของปลายอีกด้าน (เช่น -X2:4) แตะเลขสายเพื่อไฮไลต์สายนั้นทุกที่', 'Every wire end carries its wire-number sleeve and the address of its other end (e.g. -X2:4). Tap a wire number to highlight it everywhere.') : T('เส้นต่อจุดถึงจุด: ทุกเส้นวิ่งจากขั้วถึงขั้ว แตะเส้นหรือเลขสายเพื่อไฮไลต์', 'Point-to-point: every line runs from terminal to terminal. Tap a line or a wire number to highlight it.')}</span>`; return; }
    const cs = this.m.conds.filter(c => c.key === k).map(c => `${esc(this.addr(c.a))} ↔ ${esc(this.addr(c.b))}${c.cable ? ` <span class="wd-cab">(${c.cable}/${c.core})</span>` : ''}`);
    const br = this.m.bridges.filter(b => b.key === k).map(b => `${esc(this.addr(b.a))} ⌒ ${esc(this.addr(b.b))}`);
    this.info.innerHTML = `<span class="pill">${T('สาย', 'wire')} ${esc(k)}</span> ${[...cs, ...br.map(b => `${b} <span class="wd-cab">(${T('สะพาน', 'bridge')})</span>`)].join(' · ') || T('ไม่มีสายเดินในแบบนี้', 'no conductor in this diagram')}`; }
  /* ---------------- geometry: rows of boxes, channels between them (horizontal tracks), lanes beside them (vertical) ---------------- */
  geom() {
    const m = this.m, A = this.mode === 'address', all = [...m.devs.values()], bw = d => PADL + d.cols.length * CP + PADR, L = this.labels();
    const panel = all.filter(d => d.loc === 'panel' && d.id !== PEB), pc = panel.filter(d => d.power !== undefined).sort((u, v) => u.power - v.power);
    const cc = panel.filter(d => d.power === undefined).sort((u, v) => u.ord - v.ord), R = Math.max(1, pc.length || Math.ceil(cc.length / 4)), per = Math.max(1, Math.ceil(cc.length / R));
    const rows = Array.from({ length: R }, (_, r) => ({ p: pc[r] || null, c: cc.slice(r * per, (r + 1) * per) }));
    const WP = pc.length ? Math.max(...pc.map(bw)) : 0, WC = Math.max(0, ...rows.map(r => r.c.reduce((a, d) => a + bw(d), 0) + Math.max(0, r.c.length - 1) * DGAP));
    const locs = ['supply', 'field', ...m.places].filter(l => all.some(d => d.loc === l)), peb = m.devs.get(PEB), S1 = m.strip[m.X1], S2 = m.strip[m.X2];
    // x positions for given gap widths; points: key → { x, ch (channel the stub opens into), dir (−1 up, +1 down), at (where its y comes from), loc }
    const placeX = gw => {
      const P = new Map(), boxes = [], gp = {};
      const put = (d, x, row, ch, loc) => { boxes.push({ d, x, row, w: bw(d) }); d.cols.forEach((c, i) => { const cx = x + PADL + CP / 2 + i * CP;
        if (c.top && !P.has(c.top)) P.set(c.top, { x: cx, ch, dir: -1, at: [row, 0], loc }); if (c.bot && !P.has(c.bot)) P.set(c.bot, { x: cx, ch: ch + 1, dir: 1, at: [row, 1], loc }); }); return x + bw(d); };
      let x = 12; gp.L = { x0: x, w: gw.L }; x += gw.L; const xP = x; x += WP; gp.M = { x0: x, w: gw.M }; x += gw.M; const xC = x;
      rows.forEach((r, i) => { if (r.p) put(r.p, xP, i, i, 'panel'); let cx = xC + (i % 2) * 7; r.c.forEach(d => { cx = put(d, cx, i, i, 'panel') + DGAP; }); });
      x = xC + WC + 7; gp.R = { x0: x, w: gw.R }; x += gw.R;
      const sput = (list, x0) => { list.forEach((r, i) => { const tx = x0 + SP / 2 + i * SP; P.set(r.ref + '@i', { x: tx, ch: R, dir: -1, at: ['s', 0], loc: 'panel' }); P.set(r.ref + '@o', { x: tx, ch: R + 1, dir: 1, at: ['s', 1], loc: 'panel' }); }); return x0 + list.length * SP; };
      let cur = xP; const st = {};
      if (S1.length) { st.x1 = cur + 30; cur = sput(S1, st.x1) + 16; }
      if (peb) { st.pe = cur; peb.cols.forEach((c, i) => P.set(c.top, { x: cur + 10 + i * 18, ch: R, dir: -1, at: ['pe', 0], loc: 'panel' })); cur += 20 + (peb.cols.length - 1) * 18 + 14; }
      if (S2.length) { st.x2 = Math.max(cur + 30, pc.length ? xC + 30 : 0); cur = sput(S2, st.x2); }
      const panelR = Math.max(x, cur + 14); let ox = 12; const lb = [];
      locs.forEach(l => { const ds = all.filter(d => d.loc === l && d.id !== PEB).sort((u, v) => u.ord - v.ord), gs = []; if (l !== 'supply' && l !== 'field' && st.x2) ox = Math.max(ox, st.x2 - 24);
        const gwi = i => (gw.out[l] && gw.out[l][i]) || (i && i < ds.length ? DGAP : LG), need = ds.reduce((a, d, i) => a + bw(d) + gwi(i), gwi(ds.length));
        const extra = Math.max(0, this.locTitle(l).length * 6.3 + 14 - need) / 2;   // the box is at least as wide as its title; the devices stay centred
        let lx = ox; ds.forEach((d, i) => { const g = { x0: lx, w: gwi(i) + (i ? 0 : extra) }; gs.push(g); lx += g.w; lx = put(d, lx, 'o', R + 1, l); });
        const g = { x0: lx, w: gwi(ds.length) + extra }; gs.push(g); lx += g.w; lb.push({ l, x0: ox, x1: lx, ds, gaps: gs }); ox = lx + 22; });
      return { P, boxes, gp, xP, xC, st, panelR, lb, W: Math.max(panelR, ox) + 12 };
    };
    const gw = { L: pc.length ? LG : 0, M: LG, R: LG, out: {} }, G0 = placeX(gw), lane = new Map(), cnt = {};
    // conductors that change channel need a lane: in the panel left / middle / right of the columns, outside between the devices of the location
    // links between devices of one outside location run on their own tracks inside the location box (channel 'L'), not above it
    const chOf = (p, c) => (c.kind === 'link' && p.ch === R + 1 ? 'L' : p.ch);
    m.conds.forEach(c => { const p = G0.P.get(this.pk(c.a, c)), q = G0.P.get(this.pk(c.b, c)); if (!p || !q || chOf(p, c) === chOf(q, c)) return;
      const out = c.kind === 'link' || p.ch > R, ol = out ? (p.loc !== 'panel' ? p.loc : q.loc) : null, cand = out ? (G0.lb.find(b => b.l === ol) || { gaps: [] }).gaps.map((g, i) => [g, `${ol}|${i}`]) : (pc.length ? ['L', 'M', 'R'] : ['M', 'R']).map(k => [G0.gp[k], k]);
      if (!cand.length) return; let best = null, bd = 1e9; cand.forEach(([g, id]) => { const gx = g.x0 + g.w / 2, d = Math.abs(gx - p.x) + Math.abs(gx - q.x); if (d < bd) { bd = d; best = id; } });
      lane.set(c, [best, cnt[best] = (cnt[best] || 0) + 1]); });
    Object.entries(cnt).forEach(([id, n]) => { const w = LG + (n - 1) * TRK; if (!id.includes('|')) { gw[id] = w; return; }
      const [l, i] = id.split('|'), nd = G0.lb.find(b => b.l === l).ds.length; (gw.out[l] = gw.out[l] || [])[+i] = Math.max(w, +i && +i < nd ? DGAP : LG); });
    const G = placeX(gw), P = G.P, gap = id => (id.includes('|') ? G.lb.find(b => b.l === id.split('|')[0]).gaps[+id.split('|')[1]] : G.gp[id]);
    // horizontal segments → tracks per channel (greedy interval colouring)
    const segs = [], route = new Map();
    m.conds.forEach(c => { const p = P.get(this.pk(c.a, c)), q = P.get(this.pk(c.b, c)); if (!p || !q) return; const r = { c, p, q, h: [] }; route.set(c, r);
      const pc_ = chOf(p, c), qc_ = chOf(q, c);
      if (pc_ === qc_) { if (Math.abs(p.x - q.x) < 0.5 && p.dir !== q.dir) r.straight = true; else r.h.push({ ch: pc_, x0: Math.min(p.x, q.x), x1: Math.max(p.x, q.x) }); }
      else { const ln = lane.get(c); if (!ln) { r.skip = true; return; } const g = gap(ln[0]); r.lx = g.x0 + 8 + (ln[1] - 1) * TRK;
        r.h.push({ ch: pc_, x0: Math.min(p.x, r.lx), x1: Math.max(p.x, r.lx) }, { ch: qc_, x0: Math.min(q.x, r.lx), x1: Math.max(q.x, r.lx) }); }
      r.h.forEach(h => segs.push(h)); });
    const tracks = {}; segs.sort((u, v) => u.x0 - v.x0 || u.x1 - v.x1).forEach(h => { const tr = tracks[h.ch] = tracks[h.ch] || []; let i = tr.findIndex(e => e < h.x0 - 5); if (i < 0) { i = tr.length; tr.push(0); } tr[i] = h.x1; h.t = i; });
    // vertical: zones for the sleeves (and the address texts in address mode) on both sides of every channel
    const info = k => { const l = L.get(k) || [], keys = [...new Set(l.map(e => e.key))], lab = Math.max(0, ...l.map(e => this.addr(e.ref, true).length)); return { l, keys, lab }; };
    const zone = k => { const z = info(k); return z.l.length ? STUB + z.keys.length * (BG + 2) + (A ? 8 + z.lab * CW : 0) : STUB; };
    const up = [], dn = [], bz = []; P.forEach((p, k) => { const z = zone(k); if (p.dir > 0) up[p.ch] = Math.max(up[p.ch] || 0, z); else dn[p.ch] = Math.max(dn[p.ch] || 0, z);
      if (p.at[0] === 's' && p.dir > 0) bz[0] = Math.max(bz[0] || 0, STUB + Math.max(1, info(k).keys.length) * (BG + 2)); });
    const mid = c => (A ? 12 : Math.max(12, ((tracks[c] || []).length) * TRK + 10)), ty = [], rowY = [];
    let y = 8; const panelY0 = y; y += 24;
    for (let c = 0; c <= R; c++) { y += up[c] || 0; ty[c] = y + 6; y += mid(c) + (dn[c] || 0); if (c < R) { rowY[c] = y; y += BH; } }
    const stripY = y; y += SH; const panelY1 = stripY + SH + (bz[0] || STUB) + 4; y = Math.max(y + (up[R + 1] || 0), panelY1 + 4); ty[R + 1] = y + 6; y += mid(R + 1);
    const locY0 = y + 4, nL = (tracks.L || []).length; ty.L = locY0 + 26; y = locY0 + 24 + (A || !nL ? 0 : nL * TRK + 6) + (dn[R + 1] || 0); const outY = y; y += BH + (up[R + 2] || 0); ty[R + 2] = y + 6; y += mid(R + 2); const locY1 = y + 2, H = locY1 + 10;
    const yOf = p => (p.at[0] === 's' ? stripY + p.at[1] * SH : p.at[0] === 'pe' ? stripY + 3 : p.at[0] === 'o' ? outY + p.at[1] * BH : rowY[p.at[0]] + p.at[1] * BH);
    P.forEach(p => { p.y = yOf(p); });
    route.forEach(r => { if (r.skip) return; const { p, q } = r, Y = h => ty[h.ch] + h.t * TRK;
      r.pts = r.straight ? [[p.x, p.y], [q.x, q.y]] : r.lx === undefined ? [[p.x, p.y], [p.x, Y(r.h[0])], [q.x, Y(r.h[0])], [q.x, q.y]] : [[p.x, p.y], [p.x, Y(r.h[0])], [r.lx, Y(r.h[0])], [r.lx, Y(r.h[1])], [q.x, Y(r.h[1])], [q.x, q.y]]; });
    return { ...G, R, rows, route, L, info, rowY, stripY, outY, panelY0, panelY1, locY0, locY1, H };
  }
  /* ---------------- drawing ---------------- */
  render() {
    const m = this.m, g = this.geom(), A = this.mode === 'address', P = g.P, hiC = k => (k === this.hi ? ' wd-on' : '');
    const kc = k => (k === 'PE' ? ' wd-pe' : k === 'N' ? ' wd-n' : ''), T9 = (s, x, y, o = {}) => `<text x="${f(x)}" y="${f(y)}" font-size="${o.size || 9}" text-anchor="${o.anchor || 'start'}"${o.col ? ` fill="${o.col}"` : ' fill="currentColor"'}${o.weight ? ` font-weight="${o.weight}"` : ''}${o.rot ? ` transform="rotate(-90 ${f(x)} ${f(y)})"` : ''}${o.cls ? ` class="${o.cls}"` : ''}${o.w !== undefined ? ` data-w="${esc(o.w)}"` : ''} stroke="none">${esc(s)}</text>`;
    let s = '', sL = '', sB = '';
    // panel and location boxes
    const dash = 'stroke-dasharray="12 3 2 3"';
    s += `<rect x="6" y="${f(g.panelY0)}" width="${f(g.panelR - 6)}" height="${f(g.panelY1 - g.panelY0)}" rx="6" fill="none" stroke="var(--muted)" ${dash}/>`; sB += T9(this.place('panel'), 14, g.panelY0 + 15, { size: 11, weight: 700, col: 'var(--muted)', cls: 'wd-ttl' });
    g.lb.forEach(b => { s += `<rect x="${f(b.x0 - 4)}" y="${f(g.locY0)}" width="${f(b.x1 - b.x0 + 8)}" height="${f(g.locY1 - g.locY0)}" rx="6" fill="none" stroke="var(--muted)" ${dash}/>`;
      sB += T9(this.locTitle(b.l), b.x0 + 2, g.locY0 + 15, { size: 10.5, weight: 700, col: 'var(--muted)', cls: 'wd-ttl' }); });
    // device boxes: terminals on the top and bottom edges, the symbol of each contact, coil or lamp between them, the name on the left
    g.boxes.forEach(b => { const d = b.d, y0 = b.row === 'o' ? g.outY : g.rowY[b.row], y1 = y0 + BH;
      s += `<rect x="${f(b.x)}" y="${f(y0)}" width="${f(b.w)}" height="${BH}" rx="4" class="wd-box"/>`;
      if (d.name) s += T9(`-${d.name}`, b.x + 14, y0 + BH / 2, { size: 10.5, weight: 700, anchor: 'middle', rot: true });
      d.cols.forEach((c, i) => { const cx = b.x + PADL + CP / 2 + i * CP;
        if (c.k === 'w' && d.id === SUP) s += IE.L(cx, y0 + 14, cx, y1 - 18, { col: 'var(--muted)' }) + `<path d="M ${f(cx - 3)} ${f(y1 - 22)} L ${f(cx)} ${f(y1 - 16)} L ${f(cx + 3)} ${f(y1 - 22)}" fill="none" stroke="var(--muted)"/>`;
        else if (c.k !== 'w' && c.k !== 'pe') s += `<g class="wd-sym">${IE.draw(c.k, cx, y0 + 13, y1 - 13, { td: c.td })}</g>`;
        [[c.top, y0, y0 + 10], [c.bot, y1, y1 - 4]].forEach(([r, ty, ny]) => { if (!r) return; const t = r.split(':').slice(1).join(':');
          s += `<circle cx="${f(cx)}" cy="${f(ty)}" r="2.6" class="wd-tp"/>` + T9(t, cx + (c.k === 'w' ? 0 : 4), ny, { size: 8, col: 'var(--muted)', anchor: c.k === 'w' ? 'middle' : 'start' }); }); });
      if (b.row === 'o' && d.cols.length && d.cols.every(c => c.k === 'w') && d.id !== SUP && !d.id.startsWith(PEB)) {   // the motor: circle under its terminal row
        const cx = b.x + PADL + (d.cols.length * CP) / 2, cy = y0 + 40; s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="15" fill="none" stroke="currentColor"/>` + T9('M', cx, cy - 1, { size: 11, weight: 700, anchor: 'middle' }) + T9(m.one ? '1~' : '3~', cx, cy + 10, { size: 8.5, anchor: 'middle' }); }
      if (d.id === SUP) s += T9(m.one ? '1~ 230 V 50 Hz' : '3~ 400/230 V 50 Hz', b.x + b.w / 2, y1 - 5, { size: 8.5, anchor: 'middle', col: 'var(--muted)' }); });
    // terminal strips: numbered terminals, inside clamp on top, outside clamp below; bridges as plug-in jumpers; the PE bar
    const strip = (list, x0, name) => { if (!list.length) return; s += T9(`-${name}`, x0 - 5, g.stripY + SH / 2 + 4, { size: 11, weight: 700, anchor: 'end' });
      list.forEach((r, i) => { const x = x0 + i * SP; s += `<g data-w="${esc(r.wire)}" class="wd-t${kc(r.wire)}${hiC(r.wire)}"><rect x="${f(x)}" y="${f(g.stripY)}" width="${SP}" height="${SH}" class="wd-term"/>` +
        T9(String(r.no), x + SP / 2, g.stripY + SH / 2 + 3.5, { size: 9.5, weight: 700, anchor: 'middle' }) + `<circle cx="${f(x + SP / 2)}" cy="${f(g.stripY)}" r="2.4" class="wd-tp"/><circle cx="${f(x + SP / 2)}" cy="${f(g.stripY + SH)}" r="2.4" class="wd-tp"/></g>`; }); };
    strip(m.strip[m.X1], g.st.x1, m.X1); strip(m.strip[m.X2], g.st.x2, m.X2);
    m.bridges.forEach(b => { const p = P.get(b.a + '@i'), q = P.get(b.b + '@i'); if (!p || !q) return; const yb = g.stripY + 6;
      sB += `<g data-w="${esc(b.key)}" class="wd-br${hiC(b.key)}"><path d="M ${f(p.x)} ${f(yb + 3)} L ${f(p.x)} ${f(yb)} L ${f(q.x)} ${f(yb)} L ${f(q.x)} ${f(yb + 3)}" class="wd-l" fill="none"/></g>`; });
    const peb = m.devs.get(PEB); if (peb && g.st.pe !== undefined) { const w = 20 + (peb.cols.length - 1) * 18;
      s += `<g data-w="PE" class="wd-t wd-pe${hiC('PE')}"><rect x="${f(g.st.pe)}" y="${f(g.stripY + 3)}" width="${f(w)}" height="9" rx="2" class="wd-pebar"/></g>` + T9(T('บาร์ PE', 'PE bar'), g.st.pe + w / 2, g.stripY + 24, { size: 8.5, anchor: 'middle', col: 'var(--muted)' }); }
    // conductors (lines mode)
    if (!A) g.route.forEach(r => { if (!r.pts) return; const pts = r.pts.map(p => `${f(p[0])},${f(p[1])}`).join(' '), k = r.c.key;
      sL += `<g data-w="${esc(k)}" class="wd-w${kc(k)}${hiC(k)}"><polyline points="${pts}" class="wd-hit"/><polyline points="${pts}" class="wd-l"/>${k === 'PE' ? `<polyline points="${pts}" class="wd-l2"/>` : ''}</g>`; });
    // sleeves (wire numbers) and, in address mode, the remote-end addresses at every terminal point
    g.L.forEach((list, k) => { const p = P.get(k); if (!p) return; const z = g.info(k), d = p.dir;
      z.keys.forEach((key, i) => { const yc = p.y + d * (STUB + BG / 2 + i * (BG + 2)), w = Math.max(16, key.length * 5.6 + 6);
        sB += `<g data-w="${esc(key)}" class="wd-b${kc(key)}${hiC(key)}">${A ? IE.L(p.x, p.y, p.x, yc, {}) : ''}<rect x="${f(p.x - w / 2)}" y="${f(yc - BG / 2)}" width="${f(w)}" height="${BG}" rx="3"/>` + (this.o.blankWires ? '' : T9(key, p.x, yc + 3.2, { size: 8.5, weight: 700, anchor: 'middle' })) + '</g>'; });
      if (!A) return; const yl = p.y + d * (STUB + z.keys.length * (BG + 2) + 8), n = list.length;
      list.forEach((e, i) => { const bx = p.x + 3.2 + (i - (n - 1) / 2) * 10, a = this.addr(e.ref, true);
        sB += this.o.blankAddr ? IE.L(bx - 3, yl, bx - 3, yl + d * a.length * CW, { col: 'var(--muted)', dash: '1 3' })   // a dotted line to write the address on
          : T9(a, bx, yl, { size: 9, anchor: d < 0 ? 'start' : 'end', rot: true, cls: `wd-a${hiC(e.key)}`, w: e.key }); }); });
    const W = g.W, H = g.H;
    const svg = `<svg class="wd-svg" viewBox="0 0 ${f(W)} ${f(H)}" style="max-width:${f(this.o.max || W)}px;min-width:${f(Math.min(W, Math.max(560, W * 0.9)))}px" role="img" aria-label="${esc(this.mode === 'address' ? 'wiring diagram with destination addresses' : 'point-to-point wiring diagram')}" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round">${s}${sL}${sB}</svg>`;
    const sl = this.scroll.scrollLeft; this.scroll.innerHTML = svg; this.scroll.scrollLeft = sl; this.applyHi();
  }
};

/* ---------------- terminal table (IEC 61082-1 terminal-oriented connection table) ----------------
   WD.terminalTable(el, wd, { strip: 'X2', blanks: ['inside', 'outside'] | ['X2'] | ['X2:3'] | ['X2:3/wire'] | [{ term, col }], onCheck(right, total) })
   blanks: a column name (all rows), a strip name (inside + outside of its rows), a terminal (inside + outside of that row) or one cell */
const STOP = new Set(['SUPPLY', 'แหล่งจ่าย', 'BAR', 'บาร์', 'TERMINAL', 'ขั้ว', 'BRIDGE', 'สะพาน', 'TO']);
const normA = v => (Array.isArray(v) ? v.join(' ') : String(v || '')).toUpperCase().replace(/[–−]/g, '-').replace(/\s*:\s*/g, ':').replace(/\([^)]*\)/g, ' ')
  .split(/[\s,;]+/).map(x => x.replace(/^-+/, '')).filter(x => x && !STOP.has(x)).sort().join(' ');
const normC = v => String(v || '').toUpperCase().replace(/GN\W*YE/g, 'GNYE').replace(/\s+/g, '').replace(/[-.,:]/g, '/');
WD.terminalTable = (el, wd, o = {}) => {
  const rows = wd.table(o.strip), cols = ['wire', 'inside', 'outside', 'cable'], blank = new Set(), m = wd.m;
  (o.blanks || []).forEach(b => { if (b && typeof b === 'object') { blank.add(`${b.term}|${b.col}`); return; }
    if (cols.includes(b)) rows.forEach(r => blank.add(`${r.term}|${b}`)); else if (b.includes('/')) blank.add(b.replace('/', '|'));
    else if (!b.includes(':')) rows.filter(r => r.strip === b).forEach(r => { blank.add(`${r.term}|inside`); blank.add(`${r.term}|outside`); });
    else { blank.add(`${b}|inside`); blank.add(`${b}|outside`); } });
  const want = (r, c) => (c === 'wire' ? String(r.wire) : c === 'cable' ? r.cable : r[c].join(', '));
  [...blank].forEach(id => { const r = rows.find(q => q.term === id.split('|')[0]); if (!r || !cols.includes(id.split('|')[1]) || !want(r, id.split('|')[1])) blank.delete(id); });   // nothing to write (e.g. a terminal fed only by its bridge): no blank
  const head = [['ขั้วต่อ', 'terminal'], ['เลขสาย', 'wire no.'], ['ปลายทางในตู้', 'inside destination'], ['ปลายทางนอกตู้', 'outside destination'], ['สาย/แกน', 'cable/core']].map(tt);
  const grp = s => `${s === m.X1 ? T('แผงขั้วต่อกำลัง', 'power terminal strip') : T('แผงขั้วต่อควบคุม', 'control terminal strip')}`;
  let html = `<div class="wd-tt"><table class="tbl stack wd-tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`, last = null;
  rows.forEach(r => { if (r.strip !== last) { last = r.strip; html += `<tr class="wd-grp"><td colspan="5"><b>-${esc(r.strip)}</b> ${esc(grp(r.strip))}</td></tr>`; }
    const cell = (c, i) => { const id = `${r.term}|${c}`, br = c === 'inside' && r.bridge.length ? `<span class="wd-brn">⌒ ${T('สะพานไป', 'bridge to')} ${r.bridge.map(esc).join(', ')}</span>` : '';
      if (blank.has(id)) return `<td data-h="${esc(head[i])}" class="wd-cell" data-k="${esc(id)}"><input type="text" class="wd-in" autocomplete="off" spellcheck="false" aria-label="${esc(`-${r.term} ${head[i]}`)}">${br}</td>`;
      const v = c === 'wire' ? String(r.wire) : c === 'cable' ? r.cable : r[c].map(esc).join('<br>');
      return `<td data-h="${esc(head[i])}">${c === 'wire' ? `<span class="wd-wn${r.key === 'PE' ? ' wd-pe' : r.key === 'N' ? ' wd-n' : ''}">${esc(v)}</span>` : v || '—'}${br}</td>`; };
    html += `<tr data-w="${esc(r.key)}"><td data-h="${esc(head[0])}"><b>-${esc(r.term)}</b> <span class="wd-loc">${esc(r.place)}</span></td>${['wire', 'inside', 'outside', 'cable'].map((c, i) => cell(c, i + 1)).join('')}</tr>`; });
  html += `</tbody></table>`;
  if (blank.size) html += `<div class="toggles wd-tbar"><button type="button" class="btn on wd-chk">${T('ตรวจคำตอบ', 'Check')}</button><button type="button" class="btn wd-ansb">${T('ดูเฉลย', 'Show answers')}</button></div><div class="status wd-score">${T(`เติมช่องว่าง ${blank.size} ช่อง (เขียนแบบ -KM1:13 ถ้ามีหลายปลายทางคั่นด้วยจุลภาค)`, `Fill in ${blank.size} blanks (write -KM1:13; separate several destinations with commas)`)}</div>`;
  el.innerHTML = html + '</div>';
  const byId = id => rows.find(r => r.term === id.split('|')[0]);
  const check = () => { let ok = 0; el.querySelectorAll('td.wd-cell').forEach(td => { const id = td.dataset.k, c = id.split('|')[1], r = byId(id), v = td.querySelector('input').value;
      const good = c === 'cable' ? normC(v) === normC(r.cable) : c === 'wire' ? normA(v) === normA(String(r.wire)) : normA(v) === normA(r[c].map(x => x)); td.classList.toggle('wd-ok', good); td.classList.toggle('wd-bad', !good); if (good) ok++; });
    const sc = el.querySelector('.wd-score'), n = blank.size; sc.innerHTML = `<span class="pill ${ok === n ? 'good' : ok >= n / 2 ? 'warn' : 'bad'}">${ok}/${n}</span> ${ok === n ? T('ถูกทุกช่อง ที่อยู่ทุกปลายมีคู่กลับครบ', 'all correct: every address has its mirror') : T('ช่องสีแดงยังไม่ถูก ลองไล่จากเลขสายในวงจร', 'red cells are not right yet: follow the wire number in the schematic')}`;
    if (o.onCheck) o.onCheck(ok, n); return { right: ok, total: n }; };
  const show = () => el.querySelectorAll('td.wd-cell').forEach(td => { if (td.querySelector('.wd-ans')) return; const r = byId(td.dataset.k), c = td.dataset.k.split('|')[1];
    td.insertAdjacentHTML('beforeend', `<div class="wd-ans">${esc(want(r, c) || '—')}</div>`); });
  const ck = el.querySelector('.wd-chk'), an = el.querySelector('.wd-ansb'); if (ck) ck.addEventListener('click', check); if (an) an.addEventListener('click', show);
  el.querySelectorAll('tbody tr[data-w]').forEach(tr => tr.addEventListener('click', e => { if (e.target.closest('input')) return; wd.pick(tr.dataset.w === wd.hi ? null : tr.dataset.w); }));
  const refresh = () => el.querySelectorAll('tbody tr[data-w]').forEach(tr => tr.classList.toggle('wd-hirow', tr.dataset.w === wd.hi));
  wd.tables.push(refresh); refresh();
  return { check, show, rows, el, refresh };
};

global.WD = WD;
})(window);
