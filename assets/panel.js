/* panel.js — the panel door of a relay simulator, drawn as the real devices seen from the front (same look as C3.Knob):
   push buttons (coloured cap in a bezel; it sinks while held), the emergency stop (red mushroom on a yellow plate; latches,
   click again to turn it out), pilot lamps (lens that glows in its colour when the lamp is energised) and selector knobs.
   PN.Door(el, sim, o) reads the devices of an RL.Sim and stays in step with it (sim.on), so pressing a button in the drawing
   or on the door gives the same result.
   o: only (ids of controls to show), skip, lamps (false = no lamps, or an array of ids), names { id: [th, en] }, title [th, en],
      onAct({ id, act: 'press'|'release'|'toggle'|'set', before, after })
   device options read: cap ('white'|'black'|'grey'|'green'|'red'|'blue'|'yellow'; default from the contacts: NC only = stop black,
      NO only = start white), legend (text on the cap), color + code (lamps), name [th, en] (label under the device) */
(function (global) {
'use strict';
const PN = {}, IE = global.IEC, T = (th, en) => MC.t(th, en), tt = p => ED.tt(p);
const CAP = { white: '#f4f6f8', black: '#2a2f36', grey: '#9aa3b5', green: '#2fa84f', red: '#d83a34', blue: '#2f6fd6', yellow: '#f2c230' };
const INK = { white: '#2a2f36', grey: '#2a2f36', yellow: '#2a2f36' };
let uid = 0;

/* mix a #rrggbb colour with another (t = share of the second) */
const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), x = p(a), y = p(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
/* what a push button does, from its contacts in the drawing: 'stop' (NC only), 'start' (NO only), 'both', and whether it is a mushroom */
PN.role = (sim, id) => { const els = sim.spec.els.filter(e => e.d === id && (e.k === 'NO' || e.k === 'NC')), no = els.some(e => e.k === 'NO'), nc = els.some(e => e.k === 'NC');
  return { kind: no && nc ? 'both' : nc ? 'stop' : 'start', mush: els.some(e => e.op === 'mush') }; };
/* label under a device: the id in bold, then the function (the device name without its id) */
const label = (id, nm) => { const s = nm ? tt(nm) : id, rest = s.startsWith(id) ? s.slice(id.length).trim() : s === id ? '' : s; return [id, rest]; };

PN.Door = class {
  constructor(el, sim, o = {}) { this.el = el; this.sim = sim; this.o = o; this.k = ++uid;
    const D = sim.dev, want = id => (!o.only || o.only.includes(id)) && !(o.skip || []).includes(id) && !D[id].noClick;
    this.ctl = Object.keys(D).filter(id => ['pb', 'sel', 'msel'].includes(D[id].type) && want(id));
    this.lmp = o.lamps === false ? [] : Object.keys(D).filter(id => D[id].type === 'lamp' && (!Array.isArray(o.lamps) || o.lamps.includes(id)));
    this.box = document.createElement('div'); this.box.className = 'pn-door'; el.appendChild(this.box);
    this.onUp = () => this.up(); this.box.addEventListener('pointerdown', e => this.down(e)); window.addEventListener('pointerup', this.onUp); this.box.addEventListener('pointercancel', this.onUp);
    this.box.addEventListener('click', e => this.click(e));
    sim.on(() => this.draw()); this.draw(); }
  name(id) { return (this.o.names && this.o.names[id]) || this.sim.dev[id].name; }
  act(id, a, before) { if (this.o.onAct) this.o.onAct({ id, act: a, before, after: this.sim.running() }); }
  down(e) { if (e.button) return; const g = e.target.closest('[data-pb]'); if (!g) return; e.preventDefault(); const id = g.dataset.pb, d = this.sim.dev[id], before = this.sim.running();
    if (PN.role(this.sim, id).mush) { this.sim.press(id, !d.pressed); this.act(id, d.pressed ? 'press' : 'release', before); return; }   // latching mushroom
    this.held = id; this.sim.press(id, true); this.act(id, 'press', before); }
  up() { if (!this.box.isConnected) { window.removeEventListener('pointerup', this.onUp); return; } if (!this.held) return; const id = this.held, before = this.sim.running(); this.held = null; this.sim.press(id, false); this.act(id, 'release', before); }
  click(e) { const g = e.target.closest('[data-pos]'), k = e.target.closest('[data-knob]'); if (!g && !k) return; const id = g ? g.dataset.sel : k.dataset.knob, d = this.sim.dev[id], before = this.sim.running();
    if (!g) this.sim.toggle(id);   // a click on the knob body steps to the next position
    else if (d.type === 'msel') this.sim.setPos(id, g.dataset.pos); else if (String(d.on) !== g.dataset.pos) this.sim.toggle(id); this.act(id, d.type === 'msel' ? 'set' : 'toggle', before); }
  /* legend plate text (English, as engraved on real panels): device.plate, o.plates[id], the English device name without its id, or a default */
  plate(id, dflt) { const d = this.sim.dev[id], nm = (this.o.names && this.o.names[id]) || d.name, en = Array.isArray(nm) ? nm[1] : nm;
    const own = (this.o.plates && this.o.plates[id]) || d.plate; if (own) return own;
    const s = en ? (en.startsWith(id) ? en.slice(id.length) : en).replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim() : ''; return (s || dflt || id).toUpperCase(); }
  /* the plate above a device and the device id (and, in Thai, its function) below it */
  frame(id, w, txt) { const fs = txt.length > 14 ? 7.5 : txt.length > 10 ? 8.5 : 9.5, pw = Math.min(w - 6, Math.max(40, txt.length * fs * 0.66 + 14)), cx = w / 2, [a, b] = label(id, this.name(id));
    let s = `<rect x="${cx - pw / 2}" y="3" width="${pw}" height="19" rx="2" fill="#fbfbfa" stroke="#8f959d"/><rect x="${cx - pw / 2 + 2}" y="5" width="${pw - 4}" height="15" rx="1" fill="none" stroke="#d3d6da"/>`;
    s += IE.T(txt, cx, 16, { size: fs, anchor: 'middle', weight: 700, col: '#16181b' });
    s += IE.T(a, cx, 116, { size: 11.5, anchor: 'middle', weight: 700, col: '#2a2f36' }) + (b && MC.lang === 'th' ? IE.T(b, cx, 129, { size: 9.5, anchor: 'middle', col: '#4a515c' }) : '');
    return s; }
  /* one push button: chrome ring, dark collar, cap (smaller and darker while pressed), legend I / O */
  pb(id) { const d = this.sim.dev[id], r = PN.role(this.sim, id), on = d.pressed, k = this.k;
    const cx = 48, cy = 66; let s = '';
    if (r.mush) { const red = on ? '#a82a25' : CAP.red;
      s += `<circle cx="${cx}" cy="${cy}" r="38" fill="#f2c230" stroke="#b8901c"/><circle cx="${cx}" cy="${cy}" r="27" fill="#3b424d" stroke="#59607e"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="${on ? 22 : 25}" fill="url(#pnm${k}${id})" stroke="#7a1d19"/>`;
      s += `<defs><radialGradient id="pnm${k}${id}" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="${mix(red, '#ffffff', on ? 0.15 : 0.45)}"/><stop offset="1" stop-color="${red}"/></radialGradient></defs>`;
      if (on) s += IE.T(T('ค้าง', 'latched'), cx, cy + 4, { size: 10, anchor: 'middle', weight: 700, col: '#ffe9a8' });
      s += this.frame(id, 96, this.plate(id, 'EMERGENCY STOP')); }
    else { const c = d.cap || (r.kind === 'stop' ? 'black' : 'white'), base = CAP[c] || CAP.white, fill = on ? mix(base, '#000000', 0.28) : base;
      const legend = d.legend ?? (r.kind === 'stop' ? 'O' : r.kind === 'start' ? 'I' : ''), ink = INK[c] || '#ffffff';
      s += `<defs><radialGradient id="pnc${k}${id}" cx="38%" cy="30%" r="72%"><stop offset="0" stop-color="${mix(fill, '#ffffff', on ? 0.12 : 0.5)}"/><stop offset="1" stop-color="${fill}"/></radialGradient>` +
        `<linearGradient id="pnr${k}${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9aa0a8"/></linearGradient></defs>`;
      s += `<circle cx="${cx}" cy="${cy + 1.5}" r="33" fill="rgba(0,0,0,.18)"/><circle cx="${cx}" cy="${cy}" r="32" fill="url(#pnr${k}${id})" stroke="#80868f"/><circle cx="${cx}" cy="${cy}" r="26" fill="#3b424d" stroke="#59607e"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="${on ? 19 : 22}" fill="url(#pnc${k}${id})" stroke="${c === 'white' || c === 'grey' ? '#8a93a6' : mix(base, '#000000', 0.45)}"/>`;
      if (on) s += `<circle cx="${cx}" cy="${cy}" r="19" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="3"/>`;
      if (legend) s += IE.T(legend, cx, cy + 5, { size: legend.length > 1 ? 10 : 15, anchor: 'middle', weight: 700, col: ink });
      s += this.frame(id, 96, this.plate(id, r.kind === 'stop' ? 'STOP' : r.kind === 'start' ? 'START' : 'JOG')); }
    return `<div class="pn-item" data-pb="${id}" title="${id}">${IE.svg(96, 134, s, { max: 96, label: `push button ${id}` })}</div>`; }
  /* one pilot lamp: chrome ring, collar, domed lens (dull when off, bright with a halo when on) */
  lamp(id) { const d = this.sim.dev[id], on = d.energized, col = d.color || '#7ee787', k = this.k;
    const cx = 48, cy = 66, lens = on ? col : mix(col, '#3b424d', 0.62); let s = '';
    s += `<defs><radialGradient id="pnl${k}${id}" cx="40%" cy="34%" r="70%"><stop offset="0" stop-color="${mix(lens, '#ffffff', on ? 0.75 : 0.3)}"/><stop offset="1" stop-color="${lens}"/></radialGradient>` +
      `<linearGradient id="pnr${k}${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9aa0a8"/></linearGradient>` +
      `<filter id="pnf${k}${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter></defs>`;
    const halo = parseInt(col.slice(1, 3), 16) > 220 && parseInt(col.slice(3, 5), 16) > 220 && parseInt(col.slice(5, 7), 16) > 220 ? '#ffd76a' : col;   // a white lens glows warm, or it would vanish on the grey door
    if (on) s += `<circle cx="${cx}" cy="${cy}" r="36" fill="${halo}" opacity=".6" filter="url(#pnf${k}${id})"/>`;
    s += `<circle cx="${cx}" cy="${cy + 1.5}" r="31" fill="rgba(0,0,0,.18)"/><circle cx="${cx}" cy="${cy}" r="30" fill="url(#pnr${k}${id})" stroke="#80868f"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="24" fill="url(#pnl${k}${id})" stroke="${on ? mix(col, '#000000', 0.35) : '#59607e'}"/>`;
    s += `<path d="M ${cx - 13} ${cy - 10} A 16 16 0 0 1 ${cx + 4} ${cy - 17}" stroke="#ffffff" stroke-opacity="${on ? 0.85 : 0.4}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
    const dflt = { GN: 'RUN', YE: 'OVERLOAD', WH: 'STOPPED', RD: 'FAULT', BU: 'RESET' }[d.code] || 'LAMP';
    s += this.frame(id, 96, this.plate(id, dflt));
    return `<div class="pn-item pn-lamp${on ? ' on' : ''}">${IE.svg(96, 134, s, { max: 96, label: `pilot lamp ${id} ${on ? 'on' : 'off'}` })}</div>`; }
  /* a selector switch (two or three positions, maintained): black knob with a white bar, position marks on the door */
  knob(id) { const d = this.sim.dev[id], P = d.type === 'msel' ? d.positions : ['false', 'true'], show = d.type === 'msel' ? P : ['0', 'I'];
    const at = d.type === 'msel' ? d.at : String(d.on), i = P.indexOf(at), n = P.length, ang = j => (-45 + 90 * j / (n - 1)), cx = 60, cy = 70, k = this.k;
    let s = `<defs><linearGradient id="pnr${k}${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9aa0a8"/></linearGradient></defs>`;
    s += `<circle cx="${cx}" cy="${cy + 1.5}" r="28" fill="rgba(0,0,0,.18)"/><circle cx="${cx}" cy="${cy}" r="27" fill="url(#pnr${k}${id})" stroke="#80868f"/><circle cx="${cx}" cy="${cy}" r="20" fill="#2a2f36" stroke="#59607e"/>`;
    s += `<rect x="${cx - 6}" y="${cy - 24}" width="12" height="36" rx="5" fill="#3b424d" stroke="#59607e" transform="rotate(${ang(i)} ${cx} ${cy})"/>`;
    const r0 = ang(i) * Math.PI / 180; s += `<line x1="${cx}" y1="${cy}" x2="${cx + 19 * Math.sin(r0)}" y2="${cy - 19 * Math.cos(r0)}" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>`;
    P.forEach((p, j) => { const q = ang(j) * Math.PI / 180, x = cx + 40 * Math.sin(q), y = cy - 40 * Math.cos(q), on = p === at, t = show[j];
      s += `<g data-sel="${id}" data-pos="${p}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${t.length > 2 ? 14 : 10}" fill="${on ? '#2a2f36' : '#fbfbfa'}" stroke="#2a2f36"/>` +
        IE.T(t, x, y + 3.5, { size: t.length > 2 ? 8.5 : 10.5, anchor: 'middle', weight: 700, col: on ? '#ffffff' : '#2a2f36' }) + '</g>'; });
    s += this.frame(id, 120, this.plate(id, 'SELECTOR'));
    return `<div class="pn-item pn-knob" data-knob="${id}" title="${id}">${IE.svg(120, 134, s, { max: 120, label: `selector ${id}` })}</div>`; }
  draw() { if (this.drawn && !this.box.isConnected) return; this.drawn = true; const D = this.sim.dev;
    const lamps = this.lmp.map(id => this.lamp(id)), ctls = this.ctl.map(id => (D[id].type === 'pb' ? this.pb(id) : this.knob(id)));
    const ttl = this.o.title ? tt(this.o.title) : T('หน้าตู้ควบคุม (กดปุ่มค้างไว้ได้)', 'Control panel front (hold a button down)');
    this.box.innerHTML = `<div class="pn-ttl">${ttl}</div><div class="pn-cab"><i class="pn-hinge t"></i><i class="pn-hinge b"></i><i class="pn-lock"></i>` +
      (lamps.length ? `<div class="pn-row">${lamps.join('')}</div>` : '') + (ctls.length ? `<div class="pn-row">${ctls.join('')}</div>` : '') + '</div>'; }
};
/* ---------------- panel front with phase lamps, a voltmeter and an ammeter, each meter with its selector switch ----------------
   new PN.Meters(el, { read: () => ({ V: { L1, L2, L3 } (phase voltage, per unit of 230 V), I: { L1, L2, L3 } (amperes) }), vmax 500, imax 25,
   title [th, en] }). The needles follow read() smoothly (own animation loop). Line voltage between two phases 120° apart:
   U = 230 √(Va² + Vb² + Va·Vb), so 400 V when both are healthy. */
const VPOS = ['0', 'L1-L2', 'L2-L3', 'L3-L1', 'L1-N', 'L2-N', 'L3-N'], APOS = ['0', 'L1', 'L2', 'L3'], PHC = { L1: '#ff5a4f', L2: '#ffc233', L3: '#3ccf6a' }, PHN = { L1: 'R', L2: 'S', L3: 'T' };
PN.Meters = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.k = ++uid; this.vsel = 'L1-L2'; this.asel = 'L1'; this.v = 0; this.a = 0; this.vmax = o.vmax || 500; this.imax = o.imax || 25;
    this.box = document.createElement('div'); this.box.className = 'pn-door pn-meters'; el.appendChild(this.box);
    this.box.addEventListener('click', e => { const g = e.target.closest('[data-msel]'); if (!g) return; const w = g.dataset.msel, P = w === 'v' ? VPOS : APOS, cur = w === 'v' ? this.vsel : this.asel;
      const nx = g.dataset.pos || P[(P.indexOf(cur) + 1) % P.length]; if (w === 'v') this.vsel = nx; else this.asel = nx; this.draw(); });
    this.draw(); this.timer = setInterval(() => { if (!this.box.isConnected) { clearInterval(this.timer); return; } this.tick(0.05); }, 50); }   // a timer, not animation frames: it keeps the needles live in hidden or throttled tabs
  read() { const r = this.o.read ? this.o.read() : {}; return { V: r.V || { L1: 1, L2: 1, L3: 1 }, I: r.I || { L1: 0, L2: 0, L3: 0 } }; }
  target() { const { V, I } = this.read(); let u = 0;
    if (this.vsel.endsWith('-N')) u = 230 * V[this.vsel.slice(0, 2)]; else if (this.vsel !== '0') { const [a, b] = this.vsel.split('-'); u = 230 * Math.sqrt(V[a] ** 2 + V[b] ** 2 + V[a] * V[b]); }
    return { u, i: this.asel === '0' ? 0 : I[this.asel] || 0, V }; }
  tick(dt) { const t = this.target(), kv = Math.min(1, dt * 6), dv = t.u - this.v, da = t.i - this.a;
    const key = JSON.stringify(t.V);
    if (Math.abs(dv) > 0.5 || Math.abs(da) > 0.02 || key !== this.lastV) { this.v += dv * kv; this.a += da * kv; this.lastV = key; this.draw(); } }
  /* square panel meter: black frame, white face, 84° scale with the pivot near the bottom, red needle, reading below the frame */
  meter(val, max, unit, step) { const W = 112, cx = W / 2, cy = 122, R = 72, ang = x => (-42 + 84 * Math.min(1.04, Math.max(0, x / max))) * Math.PI / 180;
    let s = `<rect x="2" y="24" width="${W - 4}" height="${W - 4}" rx="4" fill="#1f2328" stroke="#0e1013"/><rect x="9" y="31" width="${W - 18}" height="${W - 18}" rx="2" fill="#fbfbf7"/>`;
    for (let x = 0; x <= max + 1e-9; x += step / 2) { const a = ang(x), big = Math.abs(x / step - Math.round(x / step)) < 1e-6, r1 = big ? R - 8 : R - 4;
      s += `<line x1="${cx + R * Math.sin(a)}" y1="${cy - R * Math.cos(a)}" x2="${cx + r1 * Math.sin(a)}" y2="${cy - r1 * Math.cos(a)}" stroke="#16181b" stroke-width="${big ? 1.3 : 0.7}"/>`;
      if (big) s += IE.T(String(x), cx + (R - 15) * Math.sin(a), cy - (R - 15) * Math.cos(a) + 2.5, { size: 6.8, anchor: 'middle', col: '#16181b' }); }
    s += `<path d="M ${cx + R * Math.sin(ang(0))} ${cy - R * Math.cos(ang(0))} A ${R} ${R} 0 0 1 ${cx + R * Math.sin(ang(max))} ${cy - R * Math.cos(ang(max))}" fill="none" stroke="#16181b" stroke-width="1"/>`;
    s += IE.T(unit, cx, 108, { size: 14, anchor: 'middle', weight: 700, col: '#16181b' });
    const a = ang(val); s += `<line x1="${cx}" y1="${cy}" x2="${cx + (R + 1) * Math.sin(a)}" y2="${cy - (R + 1) * Math.cos(a)}" stroke="#d83a34" stroke-width="1.8" stroke-linecap="round"/>` +
      `<rect x="9" y="${cy - 2}" width="${W - 18}" height="12" fill="#1f2328"/><circle cx="${cx}" cy="${cy - 2}" r="4.5" fill="#16181b"/>`;
    s += IE.T(`${unit === 'A' ? val.toFixed(1) : Math.round(val)} ${unit}`, cx, 146, { size: 10, anchor: 'middle', weight: 700, col: '#2a2f36' });
    return s; }
  /* cam selector switch: yellow plate, red handle, positions printed around, name under the plate */
  selector(w, P, at, label) { const W = 120, cx = W / 2, cy = 60, n = P.length, span = n > 4 ? 270 : 180, ang = j => (-span / 2 + span * j / (n - 1)) * Math.PI / 180, i = P.indexOf(at);
    let s = `<rect x="8" y="${cy - 52}" width="104" height="104" rx="5" fill="#f2c230" stroke="#b8901c"/><rect x="11" y="${cy - 49}" width="98" height="98" rx="3" fill="none" stroke="#d9a91f"/>`;
    P.forEach((p, j) => { const a = ang(j), x = cx + 39 * Math.sin(a), y = cy - 39 * Math.cos(a) + 3, sel = p === at, t = p === '0' ? 'OFF' : p;
      s += `<g data-msel="${w}" data-pos="${p}" style="cursor:pointer"><rect x="${x - 15}" y="${y - 9}" width="30" height="13" rx="3" fill="${sel ? '#16181b' : 'transparent'}" stroke="none"/>` +
        IE.T(t, x, y, { size: t.length > 3 ? 7 : 8, anchor: 'middle', weight: 700, col: sel ? '#f2c230' : '#16181b' }) + '</g>'; });
    const a = ang(i) * 180 / Math.PI;
    s += `<g data-msel="${w}" style="cursor:pointer"><circle cx="${cx}" cy="${cy}" r="13" fill="#b82a24" stroke="#7a1d19"/><rect x="${cx - 5}" y="${cy - 27}" width="10" height="38" rx="4.5" fill="#d83a34" stroke="#7a1d19" transform="rotate(${a} ${cx} ${cy})"/>` +
      `<circle cx="${cx}" cy="${cy}" r="3" fill="#ffd0cc"/></g>`;
    s += IE.T(label, cx, cy + 66, { size: 8.5, anchor: 'middle', weight: 700, col: '#2a2f36' });
    return s; }
  plateSvg(txt, w) { const pw = Math.min(w - 6, txt.length * 6.2 + 14); return `<rect x="${w / 2 - pw / 2}" y="3" width="${pw}" height="17" rx="2" fill="#fbfbfa" stroke="#8f959d"/>` + IE.T(txt, w / 2, 15, { size: 8.5, anchor: 'middle', weight: 700, col: '#16181b' }); }
  draw() { this.drawn = true; const { V } = this.target(), k = this.k;
    const lamp = ph => { const v = Math.max(0, Math.min(1, V[ph] || 0)), col = PHC[ph], on = v >= 0.85, lens = mix(mix(col, '#3b424d', 0.62), col, v);
      let s = `<defs><radialGradient id="pml${k}${ph}" cx="40%" cy="34%" r="70%"><stop offset="0" stop-color="${mix(lens, '#ffffff', 0.25 + 0.5 * v)}"/><stop offset="1" stop-color="${lens}"/></radialGradient>` +
        `<linearGradient id="pmr${k}${ph}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9aa0a8"/></linearGradient><filter id="pmf${k}${ph}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter></defs>`;
      if (v > 0) s += `<circle cx="40" cy="58" r="30" fill="${col}" opacity="${0.6 * v}" filter="url(#pmf${k}${ph})"/>`;
      s += `<circle cx="40" cy="59.5" r="25" fill="rgba(0,0,0,.18)"/><circle cx="40" cy="58" r="24" fill="url(#pmr${k}${ph})" stroke="#80868f"/><circle cx="40" cy="58" r="19" fill="url(#pml${k}${ph})" stroke="#59607e"/>`;
      s += `<path d="M 30 50 A 13 13 0 0 1 43 44" stroke="#ffffff" stroke-opacity="${0.35 + 0.5 * v}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      s += this.plateSvg(`${ph} (${PHN[ph]})`, 80) + IE.T(on ? T('มีไฟ', 'live') : v > 0 ? T('หรี่', 'dim') : T('ดับ', 'off'), 40, 98, { size: 9.5, anchor: 'middle', col: '#4a515c' });
      return `<div class="pn-item pn-ph">${IE.svg(80, 104, s, { max: 80, label: `phase lamp ${ph}` })}</div>`; };
    const vm = `<div class="pn-item pn-meter">${IE.svg(112, 152, this.plateSvg('VOLTMETER', 112) + this.meter(this.v, this.vmax, 'V', 100), { max: 112, label: 'voltmeter' })}</div>`;
    const am = `<div class="pn-item pn-meter">${IE.svg(112, 152, this.plateSvg('AMMETER', 112) + this.meter(this.a, this.imax, 'A', 5), { max: 112, label: 'ammeter' })}</div>`;
    const vs = `<div class="pn-item pn-meter">${IE.svg(120, 132, this.selector('v', VPOS, this.vsel, 'VOLTMETER SWITCH'), { max: 120, label: 'voltmeter selector switch' })}</div>`;
    const as = `<div class="pn-item pn-meter">${IE.svg(120, 132, this.selector('a', APOS, this.asel, 'AMMETER SWITCH'), { max: 120, label: 'ammeter selector switch' })}</div>`;
    const ttl = this.o.title ? tt(this.o.title) : T('หน้าตู้: หลอดแสดงเฟส โวลต์มิเตอร์ และแอมมิเตอร์ (แตะสวิตช์เลือกเพื่อหมุน)', 'Panel front: phase lamps, voltmeter and ammeter (tap a selector switch to turn it)');
    this.box.innerHTML = `<div class="pn-ttl">${ttl}</div><div class="pn-cab"><i class="pn-hinge t"></i><i class="pn-hinge b"></i><i class="pn-lock"></i>` +
      `<div class="pn-row">${['L1', 'L2', 'L3'].map(lamp).join('')}</div><div class="pn-row"><div class="pn-col">${vm}${vs}</div><div class="pn-col">${am}${as}</div></div></div>`; }
};
PN.door = (el, sim, o) => new PN.Door(el, sim, o);
global.PN = PN;
})(window);
