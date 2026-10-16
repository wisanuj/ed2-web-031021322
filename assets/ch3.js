/* ch3.js — chapter 3: switches and push buttons.
   1) C3.PB      a push button cut open: cap, plunger, NC and NO contact bridges, return spring; press it (slow motion possible) and see
                 the normally closed contact open before the normally open one closes (break before make), with a travel diagram and two
                 lamps; variant 'estop' = red mushroom head that latches and is released by turning
   2) C3.Knob    a rotary selector knob (maintained or spring return)
   3) C3.chart   a contact (target) table with the present position highlighted
   4) C3.Drum    the drum-switch reversing table of EMC9 Fig. 5-8: knob, table, terminal bridges, motor direction
   5) circuits for the relay simulator: selector and lamps, two-station start/stop (right and wrong wiring), hand-off-auto */
(function (global) {
'use strict';
const C3 = {}, IE = global.IEC, T = (th, en) => MC.t(th, en), tt = p => ED.tt(p);
const GOOD = '#1d8a4a', OFF = '#9aa3b5';

/* ---------------- 1) push button ---------------- */
C3.CAPS = { white: ['#f4f6f8', ['ขาว: เริ่ม/เปิด (มาตรฐานแนะนำมากที่สุด)', 'white: start/on (the standard\'s first choice)']], green: ['#2fa84f', ['เขียว: เริ่ม/เปิด (ใช้ได้ พบมากในไทย) ห้ามใช้กับปุ่มหยุด', 'green: start/on (allowed, common in Thailand); never for stop']],
  black: ['#2a2f36', ['ดำ: หยุด/ปิด (มาตรฐานแนะนำมากที่สุด)', 'black: stop/off (the standard\'s first choice)']], red: ['#d83a34', ['แดง: หยุด/ปิด (ใช้ได้ แต่ไม่ควรอยู่ใกล้ปุ่มฉุกเฉิน) ห้ามใช้กับปุ่มเริ่ม', 'red: stop/off (allowed, but not near an emergency stop); never for start']],
  yellow: ['#f2c230', ['เหลือง: แก้ไขสภาวะผิดปกติ', 'yellow: intervention in an abnormal condition']], blue: ['#2f6fd6', ['น้ำเงิน: ต้องทำ เช่น รีเซ็ต', 'blue: mandatory action, e.g. reset']] };
C3.PB = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.t = 0; this.down = false; this.latched = false; this.slow = false; this.variant = 'std'; this.cap = 'green';
    el.innerHTML = '<div class="pbgrid"><div class="pbsec"></div><div class="pbckt"></div><div class="pbtl"></div></div>'; this.secEl = el.querySelector('.pbsec'); this.cktEl = el.querySelector('.pbckt'); this.tlEl = el.querySelector('.pbtl');
    const press = e => { e.preventDefault(); this.down = true; if (this.variant === 'estop') this.latched = true; }, rel = () => { this.down = false; };
    this.secEl.addEventListener('pointerdown', press); window.addEventListener('pointerup', rel); this.secEl.style.cursor = 'pointer'; this.secEl.style.touchAction = 'none'; this.draw(); }
  get held() { return this.down || (this.variant === 'estop' && this.latched); }
  release() { this.latched = false; }
  /* contact states from the travel: element 1 (11–12) breaks at 30 %, element 2 makes (23–24) or breaks (21–22, emergency stop) at 30 % / 70 % */
  states(t = this.t) { const nc1 = t < 0.3; return this.variant === 'estop' ? { c1: nc1, c2: t < 0.3, k2: 'NC', t2: ['21', '22'] } : { c1: nc1, c2: t > 0.7, k2: 'NO', t2: ['23', '24'] }; }
  step(dt) { const rate = this.slow ? 0.45 : 6, goal = this.held ? 1 : 0, before = JSON.stringify(this.states());
    if (this.t !== goal) { this.t = goal > this.t ? Math.min(1, this.t + rate * dt) : Math.max(0, this.t - rate * dt); this.draw(); }
    if (JSON.stringify(this.states()) !== before && this.o.onChange) this.o.onChange(this.states()); }
  draw() { const t = this.t, st = this.states(), es = this.variant === 'estop', dy = 22 * t;
    const c1 = st.c1 ? GOOD : OFF, c2 = st.c2 ? GOOD : OFF;
    let s = `<rect x="44" y="72" width="152" height="200" rx="6" fill="var(--panel2)" stroke="var(--line)"/>` + `<rect x="24" y="62" width="192" height="12" rx="3" fill="#59607e" stroke="none"/>`;
    if (es) s += `<rect x="18" y="52" width="204" height="10" rx="3" fill="#f2c230" stroke="none"/>` + `<path d="M 50 ${54 + dy} Q 120 ${-6 + dy} 190 ${54 + dy} Z" fill="#d83a34" stroke="#8a1f1b"/>`;
    else s += `<rect x="76" y="${26 + dy}" width="88" height="36" rx="9" fill="${C3.CAPS[this.cap][0]}" stroke="#59607e"/>`;
    s += `<rect x="110" y="${es ? 54 + dy : 62 + dy}" width="20" height="${180 - (es ? 0 : 8)}" fill="#c9ced8" stroke="#8a93a6"/>`;
    // element 1: normally closed bridge under its fixed contacts
    s += `<rect x="58" y="112" width="34" height="8" fill="#b9762b" stroke="none"/><rect x="148" y="112" width="34" height="8" fill="#b9762b" stroke="none"/>` +
      `<rect x="56" y="${120 + dy}" width="128" height="7" rx="2" fill="${c1}" stroke="none"/>`;
    // element 2: NO bridge above its fixed contacts (emergency stop: a second NC bridge)
    if (st.k2 === 'NO') { const bb = Math.min(196, 180 + dy); s += `<rect x="58" y="196" width="34" height="8" fill="#b9762b" stroke="none"/><rect x="148" y="196" width="34" height="8" fill="#b9762b" stroke="none"/>` + `<rect x="56" y="${bb - 7}" width="128" height="7" rx="2" fill="${c2}" stroke="none"/>`; }
    else s += `<rect x="58" y="188" width="34" height="8" fill="#b9762b" stroke="none"/><rect x="148" y="188" width="34" height="8" fill="#b9762b" stroke="none"/>` + `<rect x="56" y="${196 + dy}" width="128" height="7" rx="2" fill="${c2}" stroke="none"/>`;
    // return spring under the plunger
    const y0 = 234 + dy, y1 = 268, n = 7; let sp = `M 120 ${y0}`; for (let i = 1; i <= n; i++) sp += ` L ${i % 2 ? 108 : 132} ${y0 + (y1 - y0) * (i - 0.5) / n}`; sp += ` L 120 ${y1}`;
    s += `<path d="${sp}" fill="none" stroke="#6b7399" stroke-width="2"/>`;
    // terminals and labels
    const term = (x, y, lab, col) => `<line x1="${x < 120 ? 58 : 182}" y1="${y}" x2="${x}" y2="${y}" stroke="${col}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="5" fill="#cfd6df" stroke="#6b7399"/>` + IE.T(lab, x + (x < 120 ? -8 : 8), y + 4, { size: 12, weight: 700, anchor: x < 120 ? 'end' : 'start' });
    s += term(30, 116, '11', c1) + term(210, 116, '12', c1) + term(30, st.k2 === 'NO' ? 200 : 192, st.t2[0], c2) + term(210, st.k2 === 'NO' ? 200 : 192, st.t2[1], c2);
    s += IE.T(T('NC', 'NC'), 120, 106, { size: 11, anchor: 'middle', col: 'var(--muted)' }) + IE.T(st.k2, 120, st.k2 === 'NO' ? 222 : 184, { size: 11, anchor: 'middle', col: 'var(--muted)' });
    s += IE.T(T(`ระยะกด ${Math.round(t * 100)} %`, `travel ${Math.round(t * 100)} %`), 120, 292, { size: 12, anchor: 'middle', weight: 700, col: 'var(--accent)' });
    this.secEl.innerHTML = IE.svg(240, 300, s, { max: 260, label: 'push button cut open' });
    // the same button in an IEC drawing with two lamps
    let k = IE.L(20, 16, 220, 16, { w: 2 }) + IE.T('L1', 14, 20, { anchor: 'end', size: 11, weight: 700 }) + IE.L(20, 214, 220, 214, { w: 2 }) + IE.T('N', 14, 218, { anchor: 'end', size: 11, weight: 700 });
    const x1 = 80, x2 = 180, o1 = st.c1 ? '#ff4d4d' : null, o2 = st.c2 ? '#ff4d4d' : null;
    k += `<g${o1 ? ` stroke="${o1}"` : ''}>${IE.contact(true, x1, 16, 100, { act: !st.c1, op: es ? 'mush' : 'pb' })}</g>` + IE.T('S1', x1 - 40, 62, { anchor: 'end', size: 11, weight: 700 }) + IE.T('11', x1 + 5, 30, { size: 9 }) + IE.T('12', x1 + 5, 96, { size: 9 });
    k += `<g${o2 ? ` stroke="${o2}"` : ''}>${IE.contact(st.k2 === 'NC', x2, 16, 100, { act: st.k2 === 'NC' ? !st.c2 : st.c2, op: es ? 'mush' : 'pb' })}</g>` + IE.T('S1', x2 - 40, 62, { anchor: 'end', size: 11, weight: 700 }) + IE.T(st.t2[0], x2 + 5, 30, { size: 9 }) + IE.T(st.t2[1], x2 + 5, 96, { size: 9 });
    k += IE.L(x1 - 26, 58, x2 - 26, 58, { dash: '3 2' });
    k += `<g${o1 ? ` stroke="${o1}"` : ''}>${IE.lamp(x1, 100, 214, { live: st.c1, lamp: '#ff6b6b' })}</g>` + IE.T('H1', x1 - 16, 161, { anchor: 'end', size: 11, weight: 700 });
    k += `<g${o2 ? ` stroke="${o2}"` : ''}>${IE.lamp(x2, 100, 214, { live: st.c2, lamp: es ? '#ff6b6b' : '#7ee787' })}</g>` + IE.T('H2', x2 - 16, 161, { anchor: 'end', size: 11, weight: 700 });
    this.cktEl.innerHTML = IE.svg(240, 230, k, { max: 260, label: 'button and lamps' });
    // travel diagram
    const X = v => 70 + 190 * v, rows = [['11–12', 'NC', 0, 0.3], [`${st.t2[0]}–${st.t2[1]}`, st.k2, st.k2 === 'NO' ? 0.7 : 0, st.k2 === 'NO' ? 1 : 0.3]];
    let g = IE.T(T('ระยะกด', 'travel'), 165, 20, { size: 11, anchor: 'middle', col: 'var(--muted)' });
    [0, 0.3, 0.7, 1].forEach(v => { g += IE.L(X(v), 28, X(v), 150, { dash: '2 3', col: 'var(--line)' }) + IE.T(`${Math.round(v * 100)}%`, X(v), 166, { size: 10, anchor: 'middle', col: 'var(--muted)' }); });
    rows.forEach(([lab, kind, a, b], i) => { const y = 56 + i * 56; g += IE.T(lab, 62, y + 4, { size: 11, anchor: 'end', weight: 700 }) + IE.T(kind, 62, y + 18, { size: 9, anchor: 'end', col: 'var(--muted)' }) + IE.L(X(0), y, X(1), y, { col: 'var(--line)', w: 1 }) +
      `<rect x="${X(a)}" y="${y - 7}" width="${X(b) - X(a)}" height="14" rx="3" fill="${GOOD}" opacity=".85" stroke="none"/>`; });
    if (!es) g += `<rect x="${X(0.3)}" y="34" width="${X(0.7) - X(0.3)}" height="110" fill="#ffd166" opacity=".18" stroke="none"/>` + IE.T(T('ทั้งสองเปิด', 'both open'), X(0.5), 142, { size: 10, anchor: 'middle', col: 'var(--muted)' });
    g += IE.L(X(t), 30, X(t), 150, { col: 'var(--accent)', w: 2 }) + IE.T(T('แถบเขียว = ต่อ', 'green bar = closed'), 165, 186, { size: 10, anchor: 'middle', col: 'var(--muted)' });
    this.tlEl.innerHTML = IE.svg(280, 196, g, { max: 300, label: 'travel diagram' });
  }
};

/* ---------------- 2) rotary knob ---------------- */
C3.Knob = class {
  constructor(el, o) { this.el = el; this.o = o; this.at = o.at ?? o.positions[Math.floor(o.positions.length / 2)]; this.home = this.at; this.draw();
    el.addEventListener('pointerdown', e => { const g = e.target.closest('[data-pos]'); if (!g) return; e.preventDefault(); this.set(g.dataset.pos); this.holding = true; });
    window.addEventListener('pointerup', () => { if (this.holding && this.o.spring && this.at !== this.home) this.set(this.home); this.holding = false; }); }
  angle(i) { const n = this.o.positions.length, span = n === 2 ? 90 : 90; return -span / 2 + span * i / (n - 1); }
  set(p) { if (p === this.at) return; this.at = p; this.draw(); if (this.o.onChange) this.o.onChange(p); }
  draw() { const P = this.o.positions, cx = 110, cy = 100, i = P.indexOf(this.at), a = this.angle(i) * Math.PI / 180;
    let s = `<circle cx="${cx}" cy="${cy}" r="58" fill="var(--panel2)" stroke="var(--line)"/><circle cx="${cx}" cy="${cy}" r="40" fill="#2a2f36" stroke="#59607e"/>`;
    s += `<rect x="${cx - 9}" y="${cy - 46}" width="18" height="70" rx="8" fill="#3b424d" stroke="#59607e" transform="rotate(${this.angle(i)} ${cx} ${cy})"/>`;
    s += `<line x1="${cx}" y1="${cy}" x2="${cx + 38 * Math.sin(a)}" y2="${cy - 38 * Math.cos(a)}" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>`;
    P.forEach((p, k) => { const b = this.angle(k) * Math.PI / 180, x = cx + 76 * Math.sin(b), y = cy - 76 * Math.cos(b), on = p === this.at;
      s += `<g data-pos="${p}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="16" fill="${on ? 'var(--accent)' : 'var(--panel)'}" stroke="var(--accent)"/>` +
        IE.T(p, x, y + 4, { size: 12, anchor: 'middle', weight: 700, col: on ? '#fff' : 'var(--accent)' }) + '</g>'; });
    if (this.o.spring) s += IE.T(T('สปริงคืนกลาง', 'spring return to centre'), cx, 196, { size: 11, anchor: 'middle', col: 'var(--muted)' });
    else s += IE.T(T('ค้างตำแหน่ง', 'maintained'), cx, 196, { size: 11, anchor: 'middle', col: 'var(--muted)' });
    this.el.innerHTML = IE.svg(220, 204, s, { max: 230, label: 'selector knob' }); }
};

/* ---------------- 3) contact (target) table ---------------- */
C3.chart = (el, o) => { const P = o.positions, at = o.at;
  el.innerHTML = `<table class="tbl tchart"><tr><th>${T('หน้าสัมผัส', 'contact')}</th>${P.map(p => `<th class="${p === at ? 'now' : ''}">${p}</th>`).join('')}</tr>` +
    o.contacts.map(c => `<tr class="${c.closed.includes(at) ? 'live' : ''}"><td><b>${c.name}</b>${c.note ? ` <span class="simnote">${tt(c.note)}</span>` : ''}</td>${P.map(p => `<td class="${p === at ? 'now' : ''}">${c.closed.includes(p) ? 'X' : ''}</td>`).join('')}</tr>`).join('') +
    `</table><p class="simnote">${T('X = หน้าสัมผัสต่อในตำแหน่งนั้น', 'X = contact closed in that position')}</p>`; };

/* ---------------- 4) drum switch (EMC9 Fig. 5-8) ---------------- */
C3.DRUM = { positions: ['F', '0', 'R'], names: { F: ['เดินหน้า (Forward)', 'forward'], 0: ['หยุด (Off)', 'off'], R: ['ถอยหลัง (Reverse)', 'reverse'] },
  contacts: [{ name: '1–2', closed: ['F'] }, { name: '3–4', closed: ['F'] }, { name: '5–6', closed: ['F', 'R'] }, { name: '1–3', closed: ['R'] }, { name: '2–4', closed: ['R'] }],
  line: { 2: 'L1', 3: 'L2', 6: 'L3' }, motor: { 4: 'T1', 1: 'T2', 5: 'T3' } };
C3.drumState = at => { const par = {}; [1, 2, 3, 4, 5, 6].forEach(k => { par[k] = k; }); const f = k => (par[k] === k ? k : (par[k] = f(par[k])));
  C3.DRUM.contacts.forEach(c => { if (c.closed.includes(at)) { const [a, b] = c.name.split('–').map(Number); par[f(a)] = f(b); } });
  const map = {}; Object.entries(C3.DRUM.motor).forEach(([term, lead]) => { const g = f(+term); const l = Object.entries(C3.DRUM.line).find(([lt]) => f(+lt) === g); map[lead] = l ? l[1] : null; });
  const seq = ['T1', 'T2', 'T3'].map(l => map[l]); let dir = 0;
  if (seq.every(Boolean)) { const n = seq.map(x => +x[1]); const inv = (n[0] > n[1]) + (n[0] > n[2]) + (n[1] > n[2]); dir = inv % 2 ? -1 : 1; }
  return { map, dir }; };
C3.Drum = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.at = '0'; this.spin = 0;
    el.innerHTML = '<div class="drumgrid"><div class="dk"></div><div class="dd"></div><div class="dt"></div></div>';
    this.knob = new C3.Knob(el.querySelector('.dk'), { positions: C3.DRUM.positions, at: '0', onChange: p => { this.at = p; this.draw(); if (o.onChange) o.onChange(p); } }); this.draw(); }
  step(dt) { const st = C3.drumState(this.at); if (st.dir) { this.spin += st.dir * dt * 4; this.draw(true); } }
  draw(only) { const st = C3.drumState(this.at), P = { 2: [70, 50], 3: [70, 110], 6: [70, 170], 4: [150, 50], 1: [150, 110], 5: [150, 170] }, LC = { L1: '#e8483f', L2: '#d4a010', L3: '#2f7fd6' };
    let s = `<rect x="44" y="24" width="132" height="172" rx="6" fill="none" stroke="var(--muted)" stroke-dasharray="6 4"/>` + IE.T(T('ด้านคันโยก', 'handle end'), 110, 16, { size: 11, anchor: 'middle', col: 'var(--muted)' });
    ['L1', 'L2', 'L3'].forEach((l, i) => { const y = [50, 110, 170][i]; s += IE.L(10, y, 62, y, { col: LC[l], w: 2.4 }) + IE.T(l, 8, y - 6, { size: 11, weight: 700, col: LC[l] }); });
    C3.DRUM.contacts.forEach(c => { if (!c.closed.includes(this.at)) return; const [a, b] = c.name.split('–').map(Number), pa = P[a], pb = P[b], line = C3.DRUM.line[a] || C3.DRUM.line[b];
      s += `<line x1="${pa[0]}" y1="${pa[1]}" x2="${pb[0]}" y2="${pb[1]}" stroke="${LC[line] || '#b9762b'}" stroke-width="6" stroke-linecap="round" opacity=".85"/>`; });
    Object.entries(P).forEach(([k, [x, y]]) => { s += `<circle cx="${x}" cy="${y}" r="10" fill="var(--panel)" stroke="var(--ink)"/>` + IE.T(k, x, y + 4, { size: 11, anchor: 'middle', weight: 700 }); });
    const mx = 280, my = 110; [['T1', 50], ['T2', 110], ['T3', 170]].forEach(([lead, y]) => { const term = Object.entries(C3.DRUM.motor).find(([, l]) => l === lead)[0], col = st.map[lead] ? LC[st.map[lead]] : 'var(--muted)';
      s += `<polyline points="160,${y} 200,${y} ${mx - 40},${my + (y - 110) * 0.4}" fill="none" stroke="${col}" stroke-width="2.4"/>` + IE.T(`${lead}${st.map[lead] ? ' ← ' + st.map[lead] : ''}`, 204, y - 6, { size: 11, weight: 700, col }); });
    s += `<circle cx="${mx}" cy="${my}" r="40" fill="var(--panel)" stroke="var(--ink)"/>` + IE.T('M', mx, my + 2, { size: 16, anchor: 'middle', weight: 700 }) + IE.T('3~', mx, my + 18, { size: 11, anchor: 'middle' });
    if (st.dir) { const a = this.spin; s += `<line x1="${mx}" y1="${my}" x2="${mx + 30 * Math.cos(a)}" y2="${my + 30 * Math.sin(a)}" stroke="#ff7a1a" stroke-width="4" stroke-linecap="round"/>`; }
    s += IE.T(st.dir ? (st.dir > 0 ? T('หมุนตามเข็มนาฬิกา', 'turns clockwise') : T('หมุนทวนเข็มนาฬิกา', 'turns anticlockwise')) : T('มอเตอร์หยุด', 'motor stopped'), mx, my + 62, { size: 12, anchor: 'middle', weight: 700, col: st.dir ? GOOD : 'var(--muted)' });
    this.el.querySelector('.dd').innerHTML = IE.svg(340, 200, s, { max: 420, label: 'drum switch' });
    if (!only) C3.chart(this.el.querySelector('.dt'), { positions: C3.DRUM.positions, contacts: C3.DRUM.contacts, at: this.at }); }
};

/* ---------------- 5) circuits ---------------- */
const POWER = { stages: [{ k: 'cb', d: 'Q1' }, { k: 'mainNO', d: 'KM1' }, { k: 'therm', d: 'F2' }], motor: 'M1' };
/* a three-position selector choosing lamp H1 (position I) or H2 (position II) */
C3.SELLAMPS = () => ({ rows: 3, devices: { F1: { type: 'fuse' }, S1: { type: 'msel', positions: ['I', '0', 'II'], at: '0' }, H1: { type: 'lamp', color: '#7ee787' }, H2: { type: 'lamp', color: '#ffd166' } },
  els: [ { k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }, { k: 'w', pts: [[0, 1], [1, 1]], dots: [0] }, { k: 'NO', d: 'S1', x: 0, y: 1, t: ['13', '14'], op: 'sel', pos: ['I'] }, { k: 'lamp', d: 'H1', x: 0, y: 2, t: ['X1', 'X2'] },
    { k: 'NO', d: 'S1', x: 1, y: 1, t: ['23', '24'], op: 'sel', pos: ['II'] }, { k: 'lamp', d: 'H2', x: 1, y: 2, t: ['X1', 'X2'] } ] });
/* a push button with two contacts: H1 through 11–12, H2 through 23–24 (EMC9 Fig. 6-2 in IEC form) */
C3.PBLAMPS = () => ({ rows: 3, devices: { F1: { type: 'fuse' }, S1: { type: 'pb' }, H1: { type: 'lamp', color: '#ff6b6b' }, H2: { type: 'lamp', color: '#7ee787' } },
  els: [ { k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }, { k: 'w', pts: [[0, 1], [1, 1]], dots: [0] }, { k: 'NC', d: 'S1', x: 0, y: 1, t: ['11', '12'], op: 'pb' }, { k: 'lamp', d: 'H1', x: 0, y: 2, t: ['X1', 'X2'] },
    { k: 'NO', d: 'S1', x: 1, y: 1, t: ['23', '24'], op: 'pb' }, { k: 'lamp', d: 'H2', x: 1, y: 2, t: ['X1', 'X2'] } ] });
/* two control stations (S1/S2 at station 1, S3/S4 at station 2): 'ok' stops in series and starts in parallel; 'startSeries'; 'stopParallel' */
const STDEV = () => ({ Q1: { type: 'cb', on: true }, F1: { type: 'fuse' }, F2: { type: 'ol' }, S1: { type: 'pb' }, S2: { type: 'pb' }, S3: { type: 'pb' }, S4: { type: 'pb' }, KM1: { type: 'coil' } });
const HEAD = () => [{ k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }, { k: 'NC', d: 'F2', x: 0, y: 1, t: ['95', '96'], op: 'thr' }];
C3.STATION = v => {
  if (v === 'startSeries') return { supply: 'Q1', rows: 7, devices: STDEV(), power: POWER, els: [...HEAD(), { k: 'NC', d: 'S1', x: 0, y: 2, t: ['11', '12'], op: 'pb' }, { k: 'NC', d: 'S3', x: 0, y: 3, t: ['11', '12'], op: 'pb' },
    { k: 'NO', d: 'S2', x: 0, y: 4, t: ['13', '14'], op: 'pb' }, { k: 'NO', d: 'S4', x: 0, y: 5, t: ['13', '14'], op: 'pb' }, { k: 'coil', d: 'KM1', x: 0, y: 6, t: ['A1', 'A2'] },
    { k: 'NO', d: 'KM1', x: 1, y: 4, h: 2, t: ['13', '14'] }, { k: 'w', pts: [[0, 4], [1, 4]], dots: [0] }, { k: 'w', pts: [[0, 6], [1, 6]], dots: [0] }] };
  if (v === 'stopParallel') return { supply: 'Q1', rows: 6, devices: STDEV(), power: POWER, els: [...HEAD(), { k: 'NC', d: 'S1', x: 0, y: 2, t: ['11', '12'], op: 'pb' }, { k: 'NC', d: 'S3', x: 1, y: 2, t: ['11', '12'], op: 'pb' },
    { k: 'NO', d: 'S2', x: 0, y: 3, t: ['13', '14'], op: 'pb' }, { k: 'NO', d: 'S4', x: 1, y: 3, t: ['13', '14'], op: 'pb' }, { k: 'NO', d: 'KM1', x: 2, y: 3, t: ['13', '14'] }, { k: 'w', x: 0, y: 4 }, { k: 'coil', d: 'KM1', x: 0, y: 5, t: ['A1', 'A2'] },
    { k: 'w', pts: [[0, 2], [1, 2]], dots: [0] }, { k: 'w', pts: [[0, 3], [1, 3], [2, 3]], dots: [0, 1] }, { k: 'w', pts: [[0, 4], [1, 4], [2, 4]], dots: [0, 1] }] };
  return { supply: 'Q1', rows: 6, devices: STDEV(), power: POWER, els: [...HEAD(), { k: 'NC', d: 'S1', x: 0, y: 2, t: ['11', '12'], op: 'pb' }, { k: 'NC', d: 'S3', x: 0, y: 3, t: ['11', '12'], op: 'pb' },
    { k: 'NO', d: 'S2', x: 0, y: 4, t: ['13', '14'], op: 'pb' }, { k: 'NO', d: 'S4', x: 1, y: 4, t: ['13', '14'], op: 'pb' }, { k: 'NO', d: 'KM1', x: 2, y: 4, t: ['13', '14'] }, { k: 'coil', d: 'KM1', x: 0, y: 5, t: ['A1', 'A2'] },
    { k: 'w', pts: [[0, 4], [1, 4], [2, 4]], dots: [0, 1] }, { k: 'w', pts: [[0, 5], [1, 5], [2, 5]], dots: [0, 1] }] };
};
/* the four standard trials of a two-station circuit, run on a hidden simulator: starts from S2 alone, from S4 alone, stops by S1, by S3 */
C3.stationTrials = v => { const sim = new RL.Sim(document.createElement('div'), C3.STATION(v)), tap = (...ids) => { ids.forEach(i => sim.press(i, true)); ids.forEach(i => sim.press(i, false)); };
  const start = () => { tap('S2'); if (!sim.running()) tap('S2', 'S4'); return sim.running(); }, reset = () => { sim.press('S1', true); sim.press('S3', true); sim.press('S1', false); sim.press('S3', false); };
  reset(); tap('S2'); const s2 = sim.running(); reset(); tap('S4'); const s4 = sim.running(); reset(); const both = (tap('S2', 'S4'), sim.running());
  reset(); start(); tap('S1'); const st1 = !sim.running(); reset(); start(); tap('S3'); const st3 = !sim.running(); reset(); return { s2, s4, both, st1, st3 }; };
/* hand–off–auto: selector S5 (H / 0 / A); in A the float switch S6 decides */
C3.HOA = () => ({ supply: 'Q1', rows: 5, power: POWER,
  devices: { Q1: { type: 'cb', on: true }, F1: { type: 'fuse' }, F2: { type: 'ol' }, S5: { type: 'msel', positions: ['H', '0', 'A'], at: '0' }, S6: { type: 'sen' }, KM1: { type: 'coil' }, H1: { type: 'lamp', color: '#7ee787' } },
  els: [ ...HEAD(), { k: 'NO', d: 'S5', x: 0, y: 2, h: 2, t: ['13', '14'], op: 'sel', pos: ['H'] }, { k: 'NO', d: 'S5', x: 1, y: 2, t: ['23', '24'], op: 'sel', pos: ['A'] }, { k: 'NO', d: 'S6', x: 1, y: 3, t: ['13', '14'], op: 'flt' },
    { k: 'coil', d: 'KM1', x: 0, y: 4, t: ['A1', 'A2'] }, { k: 'w', pts: [[0, 2], [1, 2], [2, 2]], dots: [0, 1] }, { k: 'w', pts: [[0, 4], [1, 4]], dots: [0] },
    { k: 'w', x: 2, y: 2 }, { k: 'NO', d: 'KM1', x: 2, y: 3, t: ['23', '24'] }, { k: 'lamp', d: 'H1', x: 2, y: 4, t: ['X1', 'X2'] } ] });
global.C3 = C3;
})(window);
