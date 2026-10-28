/* ch8.js — chapter 8: star-delta starting (ED2 week 10; Motor Control Practice week 10 wires the same circuits on the trainer).
   Course names and IEC numbers (chapter 8 design): Q1 main breaker, F1 control fuse, F2 overload relay (95–96 in the common path, 97–98
   to H3; in the WINDING branch after the split, set 0.58 × I_N; o.ol 'line' puts it ahead of the split, set 1.0 × I_N), KM1 main
   contactor (13–14 hold across S2, 83–84 = permission for KM2 so the main contactor closes first, 61–62 → H4), KM2 star contactor
   (bridges W2 U2 V2; 21–22 interlock in the KM3 path, 53–54 → H1, 13–14 = the star-first variant's contact in the KM1 path),
   KM3 delta contactor (fed from KM1's output side; order A: 2/T1 → W2, 4/T2 → U2, 6/T3 → V2; 21–22 interlock in the KM2 path,
   53–54 → H2, 13–14 hold and 61–62 timer switch-off in AUTO_OFF), KT1 on-delay multifunction timer with two changeover contacts:
   15–16 (delayed NC, c/o 1) in the KM2 path and 25–28 (delayed NO, c/o 2) in the KM3 path; S1 STOP 11–12 (black), S2 START 13–14
   (white; MANUAL: START STAR), S3 DELTA (MANUAL: white, double contact NC 21–22 + NO 13–14); lamps H1 green STAR (KM2 53–54), H2 green
   DELTA (KM3 53–54), H3 yellow OVERLOAD (F2 97–98, fed from F1 2 ahead of 95–96), H4 white STOPPED (KM1 61–62). Mechanical interlock
   KM2 ▽ KM3 (IEC 60617 S00154) on by default. Control 230 V between L1 and N after Q1; F1 → F2 95–96 → S1 11–12 (the order of ch. 5–7).
   Every push button and lamp has name [th, en]; the English part is the engraved plate on the C5.panel / PN.Door front (START, STOP,
   START STAR, DELTA, STAR, OVERLOAD, STOPPED). Every spec sets chatter: true. Power drawing = relay.js power.sd (see its header):
   sim.sd() 'star' | 'delta' | 0 | 'open' | 'short' | 'fault:none' | 'fault:single' | 'fault:unbal' | 'fault:over'.
   Common options o (every factory): lamps 'all' (default) | false | ['H1', …]; mech true (default) | false; tap 'after' | 'before';
   T (KT1 seconds, default C8.T = 3); lab true (the afternoon: 220 V line to line, 220 V Δ lab motor) or V / motorV; power-circuit
   wiring: order 'A' (default) | 'B' | 'straight' | ['W2', 'V2', 'U2'] (a transposition), ol 'winding' | 'line', set (F2 dial × I_N),
   feed 'after' | 'line', in3, open, bridge, links (see relay.js); internal fault switches start with _ (FAULTS only).
   1) circuits (fresh spec on every call)
      C8.POWER(o)        the power circuit alone: KM1 KM2 KM3 as hand-operated switches ('sel', named "… (by hand)") so a page can close
                         them one by one (KM2 + KM3 → short, Q1 trips); no control circuit (els: [])
      C8.MANUAL(o)       push-button star-delta (Book_1 Fig 7.3 idea, main first): S2 START STAR (∥ KM1 13–14) → KM1; from the hold node
                         KM1 83–84 → S3 21–22 → KM3 21–22 → KM2; (S3 13–14 ∥ KM3 13–14) → KM2 21–22 → KM3. o.starFirst: KM2 13–14 ∥
                         KM1 83–84 in the KM1 path instead (the main contactor makes the current), KM2 path without KM1 83–84
      C8.AUTO(o)         the course standard: S2 ∥ KM1 13–14 → KM1; from the hold node KT1 (A1–A2, stays energised while running),
                         KM1 83–84 → KT1 15–16 → KM3 21–22 → KM2 (main first, then star: Book_1 Fig 7.5 idea), KT1 25–28 → KM2 21–22
                         → KM3. o.km1 false: KM2 straight from the hold node (KM1 and KM2 together)
      C8.AUTO_STARFIRST(o) star first: S2 ∥ KM1 13–14 → hold node; (KM2 13–14 ∥ KM1 83–84) → KM1; KT1 15–16 → KM3 21–22 → KM2;
                         KT1 25–28 → KM2 21–22 → KM3 (Book_1 Figs 7.3 / 7.6, EMC9 Fig 29-4 idea: KM2 closes without current)
      C8.AUTO_OFF(o)     the timer switched off in delta (Book_1 Fig 7.5): KM3 61–62 → KT1; (KT1 25–28 ∥ KM3 13–14) → KM2 21–22 → KM3;
                         o.hold false = without KM3 13–14: star → delta → star pumping (sim.sdBlips counts the delta pulses)
      C8.CONTACTS        contact table [[device, contact, use [th, en]]]
   2) C8.FAULTS          eleven fault-finding cases in the format of C5/C6/C7 FAULTS { id, title, spec, good, symptom, options (answer 0),
                         answer, fix, test, seq, power (true when the power drawing shows the clue), load (sim.sdLoad for the page, or null),
                         sdx (heating speed-up a page may use, or 1) }
      C8.runSeq(sim, seq) the C7 ops plus ['sd', state] ['weld', id] (the contactor's poles weld the next time it closes) ['load', { J, TL,
                         type }] ['sdx', n] ['T', id, s] ['tripped', id, bool] ['blips', '>=' | '<=', n] ['swW', '>=' | '<', x] (speed at
                         the change to delta) ['speed', '>=' | '<', x]; 'wait' steps 0.05 s. True when every check holds
      C8.trial(spec, seq) → bool; C8.faultTrial(c) → { bad, good } (good true and bad false when the case works)
   3) C8.state(sim)      status [pill, text, kind] of a star-delta simulator (short, F2, timer countdown, blocked coil, motor state);
      C8.panel(el, sim, o) = C5.panel with that status (returns { row, door, status, refresh }; call refresh() every frame while KT1 runs)
   4) widgets: C8.Box, C8.Curves, C8.Manual, C8.Timeline (section 4 below); all with step(dt) and draw(), theme-aware, phone width */
(function (global) {
'use strict';
const C8 = {}, IE = global.IEC, T = (th, en) => MC.t(th, en), tt = p => ED.tt(p);
const GOOD = '#1d8a4a', f1 = v => +(+v).toFixed(1), SQ3 = Math.sqrt(3);
const halo = svg => svg.replace('stroke="none">', 'stroke="var(--panel)" stroke-width="3" stroke-linejoin="round" paint-order="stroke">');   // an IE.T label with a background-coloured outline, readable over lines
const pkLab = (x, y, x1) => { const right = x + 200 <= x1 + 4;   // the changeover-peak label of C8.Curves: right of the arrow if it fits, otherwise left of it
  return halo(IE.T(T('+ ยอดกระแสชั่วขณะ (ขึ้นกับมุมเฟส)', '+ short extra peak (phase position)'), right ? x + 6 : x - 6, y, { size: 9, col: 'var(--bad)', anchor: right ? 'start' : 'end' })); };
C8.COL = { run: '#7ee787', ol: '#ffd166', stop: '#f2f2f2' };
C8.T = 3;   // default KT1 setting (s): the unloaded lab motor runs up in well under a second; 2–3 s lets students see each stage

/* ---------------- 1) circuits ---------------- */
const DV = {
  Q1: () => ({ type: 'cb', on: true, name: ['Q1 เบรกเกอร์หลัก', 'Q1 main breaker'] }),
  F1: () => ({ type: 'fuse', name: ['F1 ฟิวส์วงจรควบคุม', 'F1 control fuse'] }),
  F2: () => ({ type: 'ol', name: ['F2 โอเวอร์โหลด ตัด / รีเซ็ต', 'F2 overload trip / reset'] }),
  S1: () => ({ type: 'pb', cap: 'black', legend: 'O', name: ['S1 หยุด', 'S1 stop'] }),
  S2: () => ({ type: 'pb', cap: 'white', legend: 'I', name: ['S2 เริ่มเดิน', 'S2 start'] }),
  S2m: () => ({ type: 'pb', cap: 'white', legend: 'I', name: ['S2 เริ่มเดินแบบสตาร์', 'S2 start star'] }),
  S3: () => ({ type: 'pb', cap: 'white', legend: 'Δ', name: ['S3 เปลี่ยนเป็นเดลตา', 'S3 delta'] }),
  KM1: () => ({ type: 'coil', name: ['KM1 คอนแทกเตอร์หลัก', 'KM1 main contactor'] }),
  KM2: () => ({ type: 'coil', name: ['KM2 คอนแทกเตอร์สตาร์', 'KM2 star contactor'] }),
  KM3: () => ({ type: 'coil', name: ['KM3 คอนแทกเตอร์เดลตา', 'KM3 delta contactor'] }),
  KT1: T0 => ({ type: 'timer', mode: 'on', T: T0, name: ['KT1 ตัวตั้งเวลาสตาร์–เดลตา', 'KT1 star-delta timer'] }),
  H1: () => ({ type: 'lamp', color: C8.COL.run, code: 'GN', name: ['H1 สตาร์', 'H1 star'] }),
  H2: () => ({ type: 'lamp', color: C8.COL.run, code: 'GN', name: ['H2 เดลตา', 'H2 delta'] }),
  H3: () => ({ type: 'lamp', color: C8.COL.ol, code: 'YE', name: ['H3 โอเวอร์โหลด', 'H3 overload'] }),
  H4: () => ({ type: 'lamp', color: C8.COL.stop, code: 'WH', name: ['H4 หยุดอยู่', 'H4 stopped'] }),
  hand: (id, th, en) => ({ type: 'sel', on: false, name: [`${id} ${th} (กดด้วยมือ)`, `${id} ${en} (by hand)`] }) };
C8.DEV = DV;
const w = (pts, dots) => (dots && dots.length ? { k: 'w', pts, dots } : { k: 'w', pts }), vw = (x, y, h = 1) => ({ k: 'w', x, y, h });
const fuse = () => ({ k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }), olNC = () => ({ k: 'NC', d: 'F2', x: 0, y: 1, t: ['95', '96'], op: 'thr' });
const stop = () => ({ k: 'NC', d: 'S1', x: 0, y: 2, t: ['11', '12'], op: 'pb' });
const pbNO = (d, x, y) => ({ k: 'NO', d, x, y, t: ['13', '14'], op: 'pb' }), pbNC = (d, x, y) => ({ k: 'NC', d, x, y, t: ['21', '22'], op: 'pb' });
const no = (d, a, b, x, y) => ({ k: 'NO', d, x, y, t: [a, b] }), nc = (d, a, b, x, y) => ({ k: 'NC', d, x, y, t: [a, b] });
const coil = (d, x, y) => ({ k: 'coil', d, x, y, t: ['A1', 'A2'] });
const tNC = (x, y) => ({ k: 'NC', d: 'KT1', x, y, t: ['15', '16'], td: 'on' }), tNO = (x, y) => ({ k: 'NO', d: 'KT1', x, y, t: ['25', '28'], td: 'on' });
/* power circuit (relay.js power.sd) from the common options */
const PW = (o = {}) => { const sd = { main: 'KM1', star: 'KM2', delta: 'KM3', order: Array.isArray(o.order) ? o.order.slice() : o.order || 'A', ol: o.ol === 'line' ? 'line' : 'winding' };
  ['feed', 'links', 'set', 'cls'].forEach(k => { if (o[k] !== undefined) sd[k] = o[k]; }); ['in3', 'open', 'bridge'].forEach(k => { if (o[k]) sd[k] = o[k].slice(); });
  if (o.lab) { sd.V = 220; sd.motorV = 220; } if (o.V) sd.V = o.V; if (o.motorV) sd.motorV = o.motorV;
  return { full: true, tap: o.tap === 'before' ? 'before' : 'after', sd, stages: [{ k: 'cb', d: 'Q1' }, { k: 'therm', d: 'F2' }], motor: 'M1' }; };
/* lamps: each in its own column from x0, fed from F1 2 along row 1, its contact just above the lamp */
const LAMP = { H1: { k: 'NO', d: 'KM2', t: ['53', '54'] }, H2: { k: 'NO', d: 'KM3', t: ['53', '54'] }, H3: { k: 'NO', d: 'F2', t: ['97', '98'], op: 'thr' }, H4: { k: 'NC', d: 'KM1', t: ['61', '62'] } };
const lampSel = o => { const v = o.lamps === undefined ? 'all' : o.lamps; return v === 'all' || v === true ? ['H1', 'H2', 'H3', 'H4'] : Array.isArray(v) ? v.filter(h => LAMP[h]) : []; };
const lamps = (ids, x0, rows, D) => { const els = []; if (!ids.length) return els;
  ids.forEach((h, i) => { const x = x0 + i; D[h] = DV[h](); els.push(vw(x, 1, rows - 3), { ...LAMP[h], x, y: rows - 2 }, { k: 'lamp', d: h, x, y: rows - 1, t: ['X1', 'X2'] }); });
  const pts = [[0, 1], ...ids.map((h, i) => [x0 + i, 1])]; els.push(w(pts, pts.map((p, i) => i).slice(0, -1))); return els; };
/* the hold node B = (0, 4) after S2 13–14 ∥ hold (column 1); the row of B to column x1 with dots */
const head = (els, hold = 'KM1') => { els.push(fuse(), olNC(), stop(), pbNO('S2', 0, 3), no(hold, '13', '14', 1, 3), w([[0, 3], [1, 3]], [0])); };
const rowB = (els, x1) => { const pts = []; for (let x = 0; x <= x1; x++) pts.push([x, 4]); els.push(w(pts, pts.map((p, i) => i).slice(0, -1))); };
const spec = (D, els, rows, o) => ({ supply: o.tap === 'before' ? undefined : 'Q1', rows, chatter: true, devices: D, power: PW(o), els, ...(o.mech !== false ? { mech: [['KM2', 'KM3']] } : {}) });
const base = o => ({ Q1: DV.Q1(), F1: DV.F1(), F2: DV.F2(), S1: DV.S1(), S2: DV.S2(), KM1: DV.KM1(), KM2: DV.KM2(), KM3: DV.KM3(), KT1: DV.KT1(o.T ?? C8.T) });

C8.POWER = (o = {}) => ({ rows: 4, devices: { Q1: DV.Q1(), F2: DV.F2(), KM1: DV.hand('KM1', 'คอนแทกเตอร์หลัก', 'main contactor'), KM2: DV.hand('KM2', 'คอนแทกเตอร์สตาร์', 'star contactor'),
  KM3: DV.hand('KM3', 'คอนแทกเตอร์เดลตา', 'delta contactor') }, els: [], power: PW(o) });

/* course standard (rows 8): paths 1 KM1, 2 hold, 3 KT1, 4 KM2, 5 KM3, 6–9 lamps. Fault switches: _tswap (KT1 25–28 in the KM2 path and
   15–16 in the KM3 path), _holdKM2 (the hold across S2 is KM2 13–14), _noInt (no KM3 21–22 / KM2 21–22) */
C8.AUTO = (o = {}) => { const D = base(o), els = [], rows = 8;
  head(els, o._holdKM2 ? 'KM2' : 'KM1'); rowB(els, 4);
  els.push(vw(0, 4, 3), coil('KM1', 0, 7), vw(2, 4, 3), coil('KT1', 2, 7));
  els.push(o.km1 === false ? vw(3, 4) : no('KM1', '83', '84', 3, 4), o._tswap ? tNO(3, 5) : tNC(3, 5), o._noInt ? vw(3, 6) : nc('KM3', '21', '22', 3, 6), coil('KM2', 3, 7));
  els.push(o._tswap ? tNC(4, 4) : tNO(4, 4), vw(4, 5), o._noInt ? vw(4, 6) : nc('KM2', '21', '22', 4, 6), coil('KM3', 4, 7));
  els.push(...lamps(lampSel(o), 5, rows, D));
  return spec(D, els, rows, o); };

/* star first (rows 8): paths 1 KM1 (KM2 13–14), 2 KM1 hold, 3 KT1, 4 KM2, 5 KM3, lamps */
C8.AUTO_STARFIRST = (o = {}) => { const D = base(o), els = [], rows = 8;
  head(els); rowB(els, 4);
  els.push(no('KM2', '13', '14', 0, 4), vw(0, 5, 2), coil('KM1', 0, 7), no('KM1', '83', '84', 1, 4), w([[0, 5], [1, 5]], [0]));
  els.push(vw(2, 4, 3), coil('KT1', 2, 7), tNC(3, 4), vw(3, 5), nc('KM3', '21', '22', 3, 6), coil('KM2', 3, 7), tNO(4, 4), vw(4, 5), nc('KM2', '21', '22', 4, 6), coil('KM3', 4, 7));
  els.push(...lamps(lampSel(o), 5, rows, D));
  return spec(D, els, rows, o); };

/* the timer switched off by KM3 61–62 (rows 8): paths 1 KM1, 2 hold, 3 KT1, 4 KM2, 5 KM3, 6 KM3 hold (o.hold !== false), lamps */
C8.AUTO_OFF = (o = {}) => { const D = base(o), els = [], rows = 8, hold = o.hold !== false;
  head(els); rowB(els, hold ? 5 : 4);
  els.push(vw(0, 4, 3), coil('KM1', 0, 7), nc('KM3', '61', '62', 2, 4), vw(2, 5, 2), coil('KT1', 2, 7));
  els.push(no('KM1', '83', '84', 3, 4), tNC(3, 5), nc('KM3', '21', '22', 3, 6), coil('KM2', 3, 7));
  els.push(tNO(4, 4), vw(4, 5), nc('KM2', '21', '22', 4, 6), coil('KM3', 4, 7));
  if (hold) els.push(no('KM3', '13', '14', 5, 4), w([[4, 5], [5, 5]], [0]));
  els.push(...lamps(lampSel(o), hold ? 6 : 5, rows, D));
  return spec(D, els, rows, o); };

/* manual push buttons (rows 8): paths 1 KM1, 2 hold, 3 KM2, 4 KM3, 5 KM3 hold, lamps; o.starFirst: KM2 13–14 ∥ KM1 83–84 in the KM1 path */
C8.MANUAL = (o = {}) => { const D = { Q1: DV.Q1(), F1: DV.F1(), F2: DV.F2(), S1: DV.S1(), S2: DV.S2m(), S3: DV.S3(), KM1: DV.KM1(), KM2: DV.KM2(), KM3: DV.KM3() }, els = [], rows = 8, sf = !!o.starFirst;
  els.push(fuse(), olNC(), stop(), pbNO('S2', 0, 3), no('KM1', '13', '14', 1, 3), w([[0, 3], [1, 3]], [0]));
  const xs = 2;   // first column of the KM2 path
  rowB(els, xs + 2);
  if (sf) els.push(no('KM2', '13', '14', 0, 4), vw(0, 5, 2), coil('KM1', 0, 7), no('KM1', '83', '84', 1, 4), w([[0, 5], [1, 5]], [0]));
  else els.push(vw(0, 4, 3), coil('KM1', 0, 7));
  els.push(sf ? vw(xs, 4) : no('KM1', '83', '84', xs, 4), pbNC('S3', xs, 5), nc('KM3', '21', '22', xs, 6), coil('KM2', xs, 7));
  els.push(pbNO('S3', xs + 1, 4), no('KM3', '13', '14', xs + 2, 4), w([[xs + 1, 5], [xs + 2, 5]], [0]), vw(xs + 1, 5), nc('KM2', '21', '22', xs + 1, 6), coil('KM3', xs + 1, 7));
  els.push(...lamps(lampSel(o), xs + 3, rows, D));
  return spec(D, els, rows, o); };

C8.CONTACTS = [
  ['KM1', '13–14', ['ค้างตัวเอง (คร่อม S2)', 'hold (across S2)']], ['KM1', '83–84', ['ให้ KM2 ต่อหลัง KM1 (หลักก่อน แล้วสตาร์)', 'lets KM2 in after KM1 (main first, then star)']],
  ['KM1', '61–62', ['หลอด H4 หยุดอยู่', 'lamp H4 stopped']],
  ['KM2', '21–22', ['อินเตอร์ล็อกในทางเดินกระแสของ KM3 (หน้าสัมผัสมิเรอร์)', 'interlock in the KM3 path (mirror contact)']], ['KM2', '53–54', ['หลอด H1 สตาร์', 'lamp H1 star']],
  ['KM2', '13–14', ['แบบสตาร์ก่อน: ในทางเดินกระแสของ KM1', 'star-first variant: in the KM1 path']],
  ['KM3', '21–22', ['อินเตอร์ล็อกในทางเดินกระแสของ KM2', 'interlock in the KM2 path']], ['KM3', '53–54', ['หลอด H2 เดลตา', 'lamp H2 delta']],
  ['KM3', '13–14 / 61–62', ['ค้างตัวเอง / ตัดตัวตั้งเวลาเมื่อเป็นเดลตา (AUTO_OFF, แบบควบคุมด้วยมือใช้ 13–14)', 'hold / switches the timer off in delta (AUTO_OFF; the manual circuit uses 13–14)']],
  ['KT1', '15–16', ['หน้าสัมผัสหน่วงเวลาปกติปิด (ชุดเปลี่ยน 1) ในทางเดินกระแสของ KM2', 'delayed NC (changeover 1) in the KM2 path']],
  ['KT1', '25–28', ['หน้าสัมผัสหน่วงเวลาปกติเปิด (ชุดเปลี่ยน 2) ในทางเดินกระแสของ KM3', 'delayed NO (changeover 2) in the KM3 path']],
  ['F2', '95–96 / 97–98', ['ตัดวงจรควบคุม / หลอด H3 โอเวอร์โหลด', 'opens the control circuit / lamp H3 overload']],
  ['S3', '21–22 / 13–14', ['ปลด KM2 / เริ่ม KM3 (แบบควบคุมด้วยมือ)', 'drops KM2 / starts KM3 (manual circuit)']]];

/* ---------------- 2) fault-finding cases and test sequences ---------------- */
const hid = s => new RL.Sim(document.createElement('div'), s);
const cmp = (op, a, b) => (op === '>=' ? a >= b : op === '<=' ? a <= b : op === '<' ? a < b : a > b);
C8.runSeq = (sim, seq) => { let ok = true;
  const adv = t => { let left = t; while (left > 1e-9) { const d = Math.min(0.05, left); sim.step(d); left -= d; } };
  seq.forEach(([op, ...a]) => {
    if (op === 'wait') adv(a[0]);
    else if (op === 'sd') { if (sim.sd() !== a[0]) ok = false; }
    else if (op === 'weld') { const d = sim.dev[a[0]]; if (d) { if (d.energized) d.welded = true; else d.weldOnClose = true; } }
    else if (op === 'load') sim.sdLoad = { ...a[0] };
    else if (op === 'sdx') sim.sdx = a[0];
    else if (op === 'T') { if (sim.dev[a[0]]) sim.dev[a[0]].T = a[1]; }
    else if (op === 'tripped') { if (!!sim.dev[a[0]].tripped !== a[1]) ok = false; }
    else if (op === 'blips') { if (!cmp(a[0], sim.sdBlips || 0, a[1])) ok = false; }
    else if (op === 'swW') { if (!sim.sdSw || !cmp(a[0], sim.sdSw.w, a[1])) ok = false; }
    else if (op === 'speed') { if (!cmp(a[0], sim.sdw || 0, a[1])) ok = false; }
    else if (!C7.runSeq(sim, [[op, ...a]])) ok = false; });
  return ok; };
C8.trial = (s, seq) => C8.runSeq(hid(s), seq);
C8.faultTrial = c => ({ bad: C8.trial(c.spec(), c.seq), good: C8.trial(c.good(), c.seq) });
const TT = C8.T, LOADED = { J: 10, TL: 0.3, type: 'fan' }, HEAVY = { J: 2, TL: 1.5, type: 'fan' };
C8.FAULTS = [
  { id: 'straight', power: true, load: null, sdx: 1, title: ['เดลตาต่อตรง ไม่ไขว้', 'Delta wired straight through'],
    spec: () => C8.AUTO({ order: 'straight' }), good: () => C8.AUTO(),
    symptom: ['สตาร์ทแบบสตาร์ได้ปกติ แต่พอเปลี่ยนเป็นเดลตา มอเตอร์เงียบ ไม่มีแรงบิด และค่อย ๆ หมุนฟรีจนหยุด ทั้งที่ KM1 และ KM3 ดูดอยู่', 'The star start is normal, but at the changeover the motor goes quiet, loses all torque and coasts to a stop although KM1 and KM3 are in'],
    options: [['ด้านออกของ KM3 ต่อตรงไป U2 V2 W2 (L1→U2, L2→V2, L3→W2) ปลายทั้งสองของทุกขดลวดจึงอยู่บนสายเส้นเดียวกัน ไม่มีขดลวดใดได้แรงดัน', "KM3's outputs go straight to U2 V2 W2 (L1→U2, L2→V2, L3→W2), so both ends of every winding sit on the same line and no winding gets any voltage"],
      ['KM2 ไม่ยอมหลุด', 'KM2 does not drop out'], ['ตั้งเวลา KT1 นานเกินไป', 'KT1 is set too long'], ['F2 ตัดค้างอยู่', 'F2 has tripped']], answer: 0,
    fix: ['ย้ายสายด้านออกของ KM3 ไปลงที่ W2 U2 V2 ตามลำดับ (2/T1 → W2, 4/T2 → U2, 6/T3 → V2 คือ U1–W2, V1–U2, W1–V2)', "Land KM3's outputs on W2 U2 V2 in that order (2/T1 → W2, 4/T2 → U2, 6/T3 → V2, i.e. U1–W2, V1–U2, W1–V2)"],
    test: ['ตัดไฟ กด KM1 กับ KM3 ด้วยมือ วัดความต้านทานที่ด้านเข้า KM1 ทุกคู่สายต้องได้ 2R/3 แล้วลองเดิน มอเตอร์ต้องรักษาความเร็วไว้หลังเปลี่ยนเป็นเดลตา', 'Power off, press KM1 and KM3 by hand: the ohmmeter at the KM1 input must read 2R/3 between every pair of lines; then run it: the motor must keep its speed after the change to delta'],
    seq: [['tap', 'S2'], ['wait', 0.6], ['sd', 'star'], ['wait', TT], ['sd', 'delta']] },
  { id: 'swap', power: true, load: null, sdx: 1, title: ['สายเดลตาสลับกันหนึ่งคู่', 'Two delta leads swapped'],
    spec: () => C8.AUTO({ order: ['W2', 'V2', 'U2'] }), good: () => C8.AUTO(),
    symptom: ['พอเปลี่ยนเป็นเดลตา มอเตอร์ครางเสียงดัง ความเร็วตก กระแสสูงและไม่เท่ากันทั้งสามสาย (สายหนึ่งแทบไม่มีกระแส) สักพัก F2 ตัด', 'At the changeover the motor hums loudly and slows down; the current is heavy and unequal in the three lines (one line carries almost nothing); after a while F2 trips'],
    options: [['สายจาก KM3 ไป U2 กับ V2 สลับกัน ขดลวด V มีปลายทั้งสองอยู่บน L2 จึงไม่มีแรงดัน อีกสองขดลวดได้แรงดันจากคู่สายเดียวกัน สนามแม่เหล็กจึงไม่หมุน', 'the leads from KM3 to U2 and V2 are swapped: winding V has both ends on L2 and gets no voltage, the other two windings sit on the same pair of lines, so the field does not rotate'],
      ['มอเตอร์กลับทางหมุน', 'the motor reverses'], ['KT1 ตั้งเวลาสั้นเกินไป', 'KT1 is set too short'], ['KM2 กับ KM3 ต่อพร้อมกัน', 'KM2 and KM3 close together']], answer: 0,
    fix: ['ต่อด้านออกของ KM3 ใหม่ตามลำดับ A: 2/T1 → W2, 4/T2 → U2, 6/T3 → V2 (ลำดับ B: V2 W2 U2 ก็ถูก หมุนทางเดิม)', "Rewire KM3's outputs in order A: 2/T1 → W2, 4/T2 → U2, 6/T3 → V2 (order B, V2 W2 U2, is also correct and keeps the direction)"],
    test: ['ตัดไฟ กด KM1 กับ KM3 ด้วยมือ: ทุกคู่สายต้องได้ 2R/3 (ถ้าได้ R/2 หนึ่งคู่และขาดสองคู่ แปลว่าสลับ)', 'Power off, press KM1 and KM3 by hand: every pair of lines must read 2R/3 (R/2 on one pair and open on two means a swap)'],
    seq: [['tap', 'S2'], ['wait', 0.6], ['sd', 'star'], ['wait', TT], ['sd', 'delta']] },
  { id: 'bridge', power: true, load: null, sdx: 1, title: ['สะพานสตาร์ขาดไปหนึ่งเส้น', 'One star-bridge link missing'],
    spec: () => C8.AUTO({ bridge: [1, 2] }), good: () => C8.AUTO(),
    symptom: ['กด S2: KM1 กับ KM2 ดูด หลอด H1 ติด แต่มอเตอร์ครางไม่ออกตัว พอครบเวลากลับออกตัวแรงในเดลตา', 'Press S2: KM1 and KM2 pull in and H1 lights, but the motor hums without turning; when the time is up it starts hard in delta'],
    options: [['สะพานที่ด้านออกของ KM2 ไม่ได้ต่อถึงขั้ว 6 ขดลวด V จึงไม่ครบวงจร อีกสองขดลวดต่ออนุกรมกันบนคู่สายเดียว ไม่มีแรงบิดตอนเริ่ม', "the bridge on KM2's output side does not reach terminal 6: winding V is not in circuit and the other two windings sit in series on one pair of lines, so there is no starting torque"],
      ['KM3 ดูดพร้อม KM2', 'KM3 pulls in with KM2'], ['ไม่มีหน้าสัมผัสค้าง', 'there is no holding contact'], ['F2 ตั้งไว้ต่ำ', 'F2 is set too low']], answer: 0,
    fix: ['ต่อสะพานที่ด้านออกของ KM2 ให้ครบ 2–4–6 (จุดสตาร์)', "Complete the bridge on KM2's output side: 2–4–6 (the star point)"],
    test: ['ตัดไฟ กด KM1 กับ KM2 ด้วยมือ: ทุกคู่สายต้องได้ 2R', 'Power off, press KM1 and KM2 by hand: every pair of lines must read 2R'],
    seq: [['tap', 'S2'], ['wait', 0.6], ['sd', 'star']] },
  { id: 'tswap', power: false, load: null, sdx: 1, title: ['หน้าสัมผัสตัวตั้งเวลาสลับกัน', 'Timer contacts swapped'],
    spec: () => C8.AUTO({ _tswap: true }), good: () => C8.AUTO(),
    symptom: ['กด S2: มอเตอร์ออกตัวเป็นเดลตาทันที (H2 ติด กระแสตอนเริ่มสูงเท่าสตาร์ทตรง) พอครบเวลากลับเปลี่ยนเป็นสตาร์และเดินแบบไม่มีแรง', 'Press S2: the motor starts in delta at once (H2 lights, the starting current is as high as a direct start); when the time is up it changes to star and runs on weakly'],
    options: [['KT1 25–28 (ปกติเปิด) อยู่ในทางเดินกระแสของ KM2 และ 15–16 (ปกติปิด) อยู่ในทางเดินกระแสของ KM3', 'KT1 25–28 (NO) is in the KM2 path and 15–16 (NC) in the KM3 path'],
      ['KM3 21–22 อยู่ในทางเดินกระแสของ KM3 เอง', "KM3 21–22 is in KM3's own path"], ['สะพานสตาร์ขาด', 'the star bridge is missing'], ['ตั้งเวลาสั้นเกินไป', 'the timer is set too short']], answer: 0,
    fix: ['สลับกลับ: 15–16 (หน่วงเวลาปกติปิด) ในทางเดินกระแสของ KM2 และ 25–28 (หน่วงเวลาปกติเปิด) ในทางเดินกระแสของ KM3', 'Swap them back: 15–16 (delayed NC) in the KM2 path and 25–28 (delayed NO) in the KM3 path'],
    test: ['กด S2: H1 (สตาร์) ต้องติดก่อน และ H2 (เดลตา) ติดหลังเวลาที่ตั้ง', 'Press S2: H1 (star) must light first and H2 (delta) after the set time'],
    seq: [['tap', 'S2'], ['wait', 0.3], ['on', 'KM2', true], ['on', 'KM3', false]] },
  { id: 'holdKM2', power: false, load: null, sdx: 1, title: ['หน้าสัมผัสค้างมาจาก KM2', 'Hold taken from KM2'],
    spec: () => C8.AUTO({ _holdKM2: true }), good: () => C8.AUTO(),
    symptom: ['สตาร์ทแบบสตาร์ได้ แต่พอครบเวลา ทุกตัวหลุดหมด มอเตอร์หยุด H4 ติด', 'The star start works, but when the time is up everything drops out, the motor stops and H4 lights'],
    options: [['หน้าสัมผัสค้างคร่อม S2 เป็น KM2 13–14 แทน KM1 13–14 พอ KM2 หลุดตอนเปลี่ยนเป็นเดลตา ทั้งวงจรก็หลุดตาม', 'the hold across S2 is KM2 13–14 instead of KM1 13–14, so when KM2 drops out for delta the whole circuit drops out with it'],
      ['KT1 15–16 เสีย', 'KT1 15–16 is faulty'], ['คอยล์ KM3 ขาด', 'coil KM3 is open'], ['F2 ตัดตอนเปลี่ยน', 'F2 trips at the changeover']], answer: 0,
    fix: ['ใช้ KM1 13–14 คร่อม S2 (KM1 ดูดตลอดทั้งช่วงสตาร์และเดลตา)', 'Use KM1 13–14 across S2 (KM1 stays in through star and delta)'],
    test: ['กด S2 แล้วรอให้เปลี่ยน: KM1 ต้องยังดูดอยู่ และ H2 ติด', 'Press S2 and wait for the changeover: KM1 must stay in and H2 must light'],
    seq: [['tap', 'S2'], ['wait', TT + 0.6], ['sd', 'delta'], ['on', 'KM1', true]] },
  { id: 'offNoHold', power: false, load: null, sdx: 1, title: ['ตัดตัวตั้งเวลาด้วย KM3 แต่ไม่มีหน้าสัมผัสค้างของ KM3', 'Timer switched off by KM3 without the KM3 hold'],
    spec: () => C8.AUTO_OFF({ hold: false }), good: () => C8.AUTO_OFF(),
    symptom: ['มอเตอร์ไม่ยอมอยู่ในเดลตา ทุกครั้งที่ครบเวลา คอนแทกเตอร์ดังแกรก KM3 ดูดแล้วหลุดทันที KM2 กลับมาดูด และตัวตั้งเวลาเริ่มนับใหม่', 'The motor never stays in delta: every time the timer runs out the contactors clack, KM3 pulls in and drops out at once, KM2 comes back and the timer starts again'],
    options: [['KM3 61–62 ตัดคอยล์ KT1 เมื่อ KM3 ดูด แต่ไม่มี KM3 13–14 ค้าง KT1 25–28 จึงเปิดกลับทันทีและปลด KM3', 'KM3 61–62 switches KT1 off when KM3 pulls in, but there is no KM3 13–14 hold, so KT1 25–28 opens again at once and drops KM3'],
      ['ตั้งเวลา KT1 สั้นเกินไป', 'KT1 is set too short'], ['KM2 21–22 อยู่ผิดที่', 'KM2 21–22 is in the wrong place'], ['F2 ตั้งไว้ต่ำ', 'F2 is set too low']], answer: 0,
    fix: ['ต่อ KM3 13–14 ขนานกับ KT1 25–28 ให้ KM3 ค้างตัวเองได้', 'Wire KM3 13–14 in parallel with KT1 25–28 so that KM3 holds itself'],
    test: ['กด S2 แล้วรอ: H2 ต้องติดค้าง ตัวตั้งเวลาหยุดนับ และ KM2 ไม่กลับมาดูด', 'Press S2 and wait: H2 must stay lit, the timer stops and KM2 does not come back'],
    seq: [['tap', 'S2'], ['wait', TT + 0.6], ['on', 'KM3', true], ['sd', 'delta']] },
  { id: 'noInterlock', power: true, load: null, sdx: 1, title: ['ไม่มีอินเตอร์ล็อก KM2 กับ KM3', 'No KM2 / KM3 interlock'],
    spec: () => C8.AUTO({ _noInt: true, mech: false }), good: () => C8.AUTO(),
    symptom: ['ใช้งานปกติเปลี่ยนสตาร์เป็นเดลตาได้ แต่ครูทดสอบโดยให้หน้าสัมผัสหลักของ KM2 ติดค้าง (เชื่อมติด) ตอนเปลี่ยน Q1 ตัดพร้อมข้อความลัดวงจร', 'In normal use star → delta works, but in the teacher\'s test with KM2\'s main contacts stuck closed (welded) Q1 trips at the changeover with a short-circuit message'],
    options: [['ไม่มี KM2 21–22 ในทางเดินกระแสของ KM3 (และไม่มีอินเตอร์ล็อกทางกล) KM3 จึงต่อได้ทั้งที่หน้าสัมผัสของ KM2 ยังปิดอยู่ สะพานสตาร์ลัด L1–L2–L3', "there is no KM2 21–22 in the KM3 path (and no mechanical interlock), so KM3 can close while KM2's contacts are still closed and the star bridge shorts L1–L2–L3"],
      ['ตั้งเวลา KT1 นานเกินไป', 'KT1 is set too long'], ['KM1 ไม่มีหน้าสัมผัสค้าง', 'KM1 has no holding contact'], ['Q1 พิกัดต่ำเกินไป', 'Q1 is rated too low']], answer: 0,
    fix: ['ใส่ KM2 21–22 เหนือคอยล์ KM3 และ KM3 21–22 เหนือคอยล์ KM2 (หน้าสัมผัสมิเรอร์) พร้อมอินเตอร์ล็อกทางกลระหว่าง KM2 กับ KM3', 'Put KM2 21–22 just above coil KM3 and KM3 21–22 just above coil KM2 (mirror contacts), plus the mechanical interlock between KM2 and KM3'],
    test: ['ให้ KM2 ค้างไว้ (ดันด้วยมือขณะตัดไฟวงจรกำลัง): KM3 ต้องไม่ดูดแม้ KT1 จะครบเวลาแล้ว', 'Hold KM2 in (by hand with the power section isolated): KM3 must not pull in even after KT1 has timed out'],
    seq: [['weld', 'KM2'], ['tap', 'S2'], ['wait', TT + 0.6], ['short', false]] },
  { id: 'tooShort', power: false, load: LOADED, sdx: 1, title: ['ตั้งเวลาสั้นเกินไปมาก', 'Timer set far too short'],
    spec: () => C8.AUTO({ T: 0.3 }), good: () => C8.AUTO({ T: 4 }),
    symptom: ['มอเตอร์ที่มีโหลดเปลี่ยนเป็นเดลตาแทบทันทีขณะยังหมุนช้า กระตุกแรงและกระแสพุ่งเกือบเท่าสตาร์ทตรง บางครั้ง Q1 ตัด', 'The loaded motor changes to delta almost at once while it is still slow: a hard jerk and a current peak almost like a direct start; sometimes Q1 trips'],
    options: [['ตั้ง KT1 สั้นกว่าเวลาที่มอเตอร์เร่งจนใกล้ความเร็วพิกัด', 'KT1 is set shorter than the time the motor needs to come near rated speed'],
      ['ต่อเดลตาผิดลำดับ', 'the delta order is wrong'], ['ไม่มีอินเตอร์ล็อก', 'there is no interlock'], ['F2 อยู่ในสายเมน', 'F2 is in the supply line']], answer: 0,
    fix: ['วัดเวลาที่มอเตอร์เร่งจนใกล้ความเร็วพิกัด (กระแสลดลงแล้ว) แล้วตั้ง KT1 ตามนั้น มอเตอร์ในห้องปฏิบัติการตัวเปล่าตั้ง 2–3 s เพื่อให้เห็นแต่ละช่วง', 'Measure the time the motor needs to come near rated speed (the current has fallen) and set KT1 to that; for the unloaded lab motor set 2–3 s so that each stage can be seen'],
    test: ['คล้องแคลมป์มิเตอร์ที่สายเส้นหนึ่ง: ตอนเปลี่ยนเป็นเดลตากระแสต้องลดลงมาแล้วและกระโดดขึ้นเพียงเล็กน้อย', 'Clamp one line: at the changeover the current must already have fallen and jump only a little'],
    seq: [['load', LOADED], ['tap', 'S2'], ['wait', 5], ['sd', 'delta'], ['swW', '>=', 0.85]] },
  { id: 'olSetting', power: true, load: HEAVY, sdx: 20, title: ['ตั้งโอเวอร์โหลดในกิ่งขดลวดไว้เท่ากระแสพิกัด', 'Overload in the winding branch set to I<sub>N</sub>'],
    spec: () => C8.AUTO({ set: 1 }), good: () => C8.AUTO(),
    symptom: ['มอเตอร์รับโหลดหนักเกินนาน ร้อนจัด แต่ F2 ไม่ตัดเลย', 'The motor ran overloaded for a long time and got very hot, but F2 never tripped'],
    options: [['F2 อยู่ในกิ่งขดลวด (ในเดลตาผ่านกระแสเพียง 1/√3 ≈ 58 % ของกระแสสาย) แต่ตั้งไว้เท่ากระแสพิกัด I<sub>N</sub> จึงตัดเมื่อขดลวดรับกระแสเกิน 1.73 เท่าแล้ว', 'F2 sits in the winding branch (in delta it carries only 1/√3 ≈ 58 % of the line current) but is set to the rated current I<sub>N</sub>, so it trips only when the windings carry 1.73 × their rated current'],
      ['F2 อยู่ในสายเมนก่อนจุดแยก', 'F2 sits in the supply line ahead of the split'], ['ตั้งเวลา KT1 สั้นไป', 'KT1 is set too short'], ['Q1 พิกัดสูงไป', 'Q1 is rated too high']], answer: 0,
    fix: ['ตั้ง F2 ที่ 0.58 × I<sub>N</sub> (I<sub>N</sub>/√3) เมื่ออยู่ในกิ่งขดลวด หรือย้าย F2 ไปไว้ในสายเมนก่อนจุดแยกแล้วตั้ง 1.0 × I<sub>N</sub>', 'Set F2 to 0.58 × I<sub>N</sub> (I<sub>N</sub>/√3) in the winding branch, or move it into the supply line ahead of the split and set it to 1.0 × I<sub>N</sub>'],
    test: ['เทียบหน้าปัด F2 กับป้ายมอเตอร์: กิ่งขดลวด = 0.58 × I<sub>N</sub>', 'Compare the F2 dial with the nameplate: winding branch = 0.58 × I<sub>N</sub>'],
    seq: [['load', HEAVY], ['sdx', 20], ['tap', 'S2'], ['wait', TT + 1], ['sd', 'delta'], ['wait', 40], ['tripped', 'F2', true]] },
  { id: 'motor230', power: true, load: null, sdx: 1, title: ['มอเตอร์ 230 V Δ / 400 V Y บนระบบ 400 V', 'A 230 V Δ / 400 V Y motor on 400 V'],
    spec: () => C8.AUTO({ motorV: 230 }), good: () => C8.AUTO(),
    symptom: ['ช่วงสตาร์ปกติ แต่พอเป็นเดลตา มอเตอร์ครางดังกว่าปกติและร้อนเร็วมาก', 'The star stage is normal, but in delta the motor hums louder than usual and heats up very fast'],
    options: [['ป้ายมอเตอร์เป็น 230 V Δ / 400 V Y ในเดลตาบน 400 V ขดลวดได้ 400 V = 1.73 เท่าของพิกัด ระบบ 400 V ต้องใช้มอเตอร์ 400 V Δ (690 V Y)', 'the nameplate says 230 V Δ / 400 V Y: in delta on 400 V each winding gets 400 V = 1.73 × its rating; a 400 V supply needs a 400 V Δ (690 V Y) motor'],
      ['ต่อเดลตาผิดลำดับ', 'the delta order is wrong'], ['ตั้งเวลาสั้นไป', 'the timer is too short'], ['ไม่มีสะพานสตาร์', 'the star bridge is missing']], answer: 0,
    fix: ['ใช้มอเตอร์ 400 V Δ / 690 V Y (ป้ายเก่า 380/660 V) สำหรับสตาร์–เดลตาบนระบบ 400 V ส่วนมอเตอร์ 230 V Δ / 400 V Y ให้ต่อสตาร์ถาวรแล้วสตาร์ทตรงหรือใช้วิธีลดแรงดันแบบอื่น', 'Use a 400 V Δ / 690 V Y motor (old plates 380/660 V) for star-delta on 400 V; run a 230 V Δ / 400 V Y motor permanently in star and start it direct or with another reduced-voltage method'],
    test: ['อ่านป้ายมอเตอร์ก่อนต่อ: แรงดันของเดลตาต้องเท่าแรงดันระหว่างสายของระบบ', 'Read the nameplate before wiring: the delta voltage must equal the supply line-to-line voltage'],
    seq: [['tap', 'S2'], ['wait', TT + 0.6], ['sd', 'delta']] },
  { id: 'links', power: true, load: null, sdx: 1, title: ['ไม่ได้ถอดสะพานในกล่องขั้วมอเตอร์', 'Terminal-box links left in'],
    spec: () => C8.AUTO({ links: 'delta' }), good: () => C8.AUTO(),
    symptom: ['กด S2: Q1 ตัดทันทีพร้อมข้อความลัดวงจร (ถ้าสะพานค้างเป็นแบบสตาร์ จะตัดตอนเปลี่ยนเป็นเดลตา)', 'Press S2: Q1 trips at once with a short-circuit message (with star links left in it trips at the changeover instead)'],
    options: [['สะพานเดลตาในกล่องขั้วยังต่ออยู่ เมื่อ KM2 ต่อสะพานสตาร์ สาย L1–L2–L3 จึงลัดถึงกัน', 'the delta links in the terminal box are still fitted, so when KM2 makes the star bridge L1–L2–L3 are shorted'],
      ['KM3 ต่อพร้อม KM2', 'KM3 closes with KM2'], ['ไม่มีอินเตอร์ล็อกทางกล', 'there is no mechanical interlock'], ['Q1 พิกัดต่ำไป', 'Q1 is rated too low']], answer: 0,
    fix: ['ถอดสะพานทั้งหมดออกจากกล่องขั้ว ต่อสาย 6 เส้น U1 V1 W1 W2 U2 V2 ไปยังตู้ควบคุม', 'Remove every link from the terminal box and run all six leads U1 V1 W1 W2 U2 V2 to the panel'],
    test: ['ตัดไฟ วัดที่กล่องขั้ว: U1–V1, V1–W1, W1–U1 ต้องขาด (ไม่มีสะพานเหลือ)', 'Power off, measure at the terminal box: U1–V1, V1–W1 and W1–U1 must be open (no link left)'],
    seq: [['tap', 'S2'], ['wait', 0.3], ['short', false], ['sd', 'star']] }];

/* ---------------- 3) status and the panel ---------------- */
C8.state = sim => { const d = sim.dev, s = sim.sd(), kt = d.KT1, txt = sim.sdText ? sim.sdText() : null;
  if (sim.mains === false) return [T('ไฟดับ', 'power off'), T('รอไฟกลับมา… เมื่อไฟกลับมา มอเตอร์ต้องไม่เดินเอง', 'waiting for the power… when it returns the motor must not start by itself'), 'bad'];
  if (s === 'short') return [T('ลัดวงจร', 'short circuit'), T('Q1 ตัดแล้ว คลิกที่ Q1 เพื่อสับกลับ', 'Q1 has tripped: click Q1 to switch it on again'), 'bad'];
  if (d.Q1 && !d.Q1.on) return [T('Q1 ปลด', 'Q1 off'), T('ทั้งวงจรกำลังและวงจรควบคุมไม่มีไฟ', 'no supply to the power or the control circuit'), 'warn'];
  if (d.F1 && d.F1.blown) return [T('F1 ขาด', 'F1 blown'), T('คลิกที่ F1 เพื่อเปลี่ยนฟิวส์', 'click F1 to replace it'), 'bad'];
  if (d.F2 && d.F2.tripped && !d.F1) return [T('F2 ตัด', 'F2 tripped'), T('ภาพจำลองนี้มีเฉพาะวงจรกำลัง ในวงจรจริง F2 95–96 ในวงจรควบคุมจะตัด KM1 และหยุดมอเตอร์ คลิก F2 เพื่อรีเซ็ต', 'this simulator has the power circuit only; in a real circuit F2 95–96 in the control circuit would drop KM1 and stop the motor. Click F2 to reset'), 'bad'];   // C8.POWER: no control circuit
  if (d.F2 && d.F2.tripped) return [T('F2 ตัด', 'F2 tripped'), sim.running() ? T('มอเตอร์ยังหมุน: ไม่มี 95–96 ในวงจรควบคุม', 'the motor still runs: no 95–96 in the control circuit') : T('ทุกตัวหลุด H3 ติด คลิก F2 เพื่อรีเซ็ต (มอเตอร์ต้องไม่เดินเองหลังรีเซ็ต)', 'everything has dropped out and H3 is lit; click F2 to reset (the motor must not start by itself)'), 'bad'];
  const blk = ['KM2', 'KM3'].find(id => d[id] && d[id].blocked);
  if (blk) return [T(`${blk} ถูกล็อก`, `${blk} blocked`), T('อินเตอร์ล็อกทางกลกันไว้ คอยล์มีไฟแต่หน้าสัมผัสไม่ปิด (คอยล์ร้อน)', 'the mechanical interlock holds it: the coil is energised but its contacts stay open (the coil overheats)'), 'warn'];
  const cht = Object.keys(d).filter(id => d[id].chatter);   // a coil that switches itself off and on (relay.js spec.chatter)
  if (cht.length) return [T(`${cht.join(', ')} สั่นรัว`, `${cht.join(', ')} chatters`), T('คอยล์ตัดตัวเองแล้วต่อใหม่ซ้ำ ๆ ไม่ค้างตัว (หน้าสัมผัสสึก) ตรวจหน้าสัมผัสที่อยู่ในสายของคอยล์นั้น', 'the coil keeps switching itself off and on and never holds (the contacts wear); check the contacts in that coil\'s own path'), 'bad'];
  const timing = kt && kt.energized && kt.tOn < kt.T, base = txt ? [tt(txt[0]), txt[1] ? tt(txt[1]) : ''] : ['', ''];
  if (timing && s === 'star') return [T('สตาร์', 'star'), T(`KT1 นับ ${ED.fd(Math.min(kt.tOn, kt.T), 1)} / ${kt.T} s · ${base[1]}`, `KT1 ${ED.fd(Math.min(kt.tOn, kt.T), 1)} / ${kt.T} s · ${base[1]}`), 'good'];
  if (!txt) return sim.running() ? [T('มอเตอร์หมุน', 'motor running'), '', 'good'] : [T('มอเตอร์หยุด', 'motor stopped'), '', 'wait'];
  const mid = Object.values(d).some(x => x.type === 'pb' && x.mid);   // a double button half-way: the real gap of a manual change
  const pill = { star: T('สตาร์', 'star'), delta: T('เดลตา', 'delta'), open: !d.F1 || mid ? T('ช่วงเปลี่ยน', 'changeover') : T('ไม่มีแรงบิด', 'no torque'), 'fault:none': T('ไม่มีแรงบิด', 'no torque'), 'fault:single': T('คราง', 'hum'),
    'fault:unbal': T('ไม่สมดุล', 'unbalanced'), 'fault:over': T('แรงดันเกิน', 'overvoltage'), 'fault:rev': T('หมุนกลับ', 'reversed') }[s] || (sim.running() ? T('มอเตอร์หมุน', 'motor running') : (sim.sdw || 0) > 0.02 ? T('หมุนฟรี', 'coasting') : T('มอเตอร์หยุด', 'motor stopped'));
  return [pill, base[0] === pill ? base[1] : base[0] + (base[1] ? ` · ${base[1]}` : ''), txt[2]]; };   // no 'motor stopped · motor stopped'
C8.panel = (el, sim, o = {}) => C5.panel(el, sim, { status: C8.state, ...o });

/* ---------------- 4) widgets ---------------- */
/* delta wirings offered by the widgets (KM3 poles 1–3 → bottom terminal): A, B, straight through, two leads swapped (V2 ↔ U2) */
C8.ORDERS = { A: 'A', B: 'B', straight: 'straight', swap: ['W2', 'V2', 'U2'] };
C8.ORDER_NAME = { A: ['ลำดับ A: U1–W2, V1–U2, W1–V2', 'order A: U1–W2, V1–U2, W1–V2'], B: ['ลำดับ B: U1–V2, V1–W2, W1–U2', 'order B: U1–V2, V1–W2, W1–U2'],
  straight: ['ต่อตรง (ผิด): L1→U2, L2→V2, L3→W2', 'straight through (wrong): L1→U2, L2→V2, L3→W2'], swap: ['สลับหนึ่งคู่ (ผิด): L2→V2, L3→U2', 'two leads swapped (wrong): L2→V2, L3→U2'] };
/* a resistance in multiples of one winding's R as text */
C8.fracR = x => (x === Infinity || !isFinite(x) ? T('ขาด (OL)', 'open (OL)') : Math.abs(x) < 1e-6 ? '0' : Math.abs(x - 2) < 1e-3 ? '2R' : Math.abs(x - 2 / 3) < 1e-3 ? '2R/3' : Math.abs(x - 0.5) < 1e-3 ? 'R/2' : Math.abs(x - 1) < 1e-3 ? 'R' : `${ED.fd(x, 2)}R`);
/* the motor connection of a power simulator: mode 'off' | 'star' | 'delta' with a delta order key → { sd, info, lines: { U: [la, lb] … } (supply
   line on each end of each winding, 0 = none), ohm: { star: [L1–L2, L2–L3, L3–L1], delta: […] } (KM1 input, Q1 off, contactors pressed by hand) } */
C8.connect = (mode = 'star', order = 'A', o = {}) => { const s = new RL.Sim(document.createElement('div'), C8.POWER({ order: C8.ORDERS[order] || order, V: o.V || 400, motorV: o.motorV || o.V || 400 }));
  const on = { KM1: mode !== 'off', KM2: mode === 'star', KM3: mode === 'delta' }; ['KM1', 'KM2', 'KM3'].forEach(id => { if (on[id]) s.toggle(id); });
  const info = s.sdInfo(), V = info.V, near = v => { if (!v) return 0; let b = 0, d = 1e9; [[1, 0], [-0.5, -SQ3 / 2], [-0.5, SQ3 / 2]].forEach((p, k) => { const e = Math.hypot(v[0] - p[0], v[1] - p[1]); if (e < d) { d = e; b = k + 1; } }); return d < 1e-6 ? b : 0; };
  const lines = {}; [['U', 'U1', 'U2'], ['V', 'V1', 'V2'], ['W', 'W1', 'W2']].forEach(([w, a, b]) => { lines[w] = [near(V.get(`M1:${a}`)), near(V.get(`M1:${b}`))]; });
  const pr = [['KM1:1', 'KM1:3'], ['KM1:3', 'KM1:5'], ['KM1:5', 'KM1:1']];
  const ohm = { star: pr.map(([a, b]) => s.sdOhm(a, b, { Q1: false, KM1: true, KM2: true, KM3: false })), delta: pr.map(([a, b]) => s.sdOhm(a, b, { Q1: false, KM1: true, KM2: false, KM3: true })) };
  return { sd: s.sd(), info, lines, ohm, sim: s }; };
/* the winding picture (x0 … x0 + 300): star = three windings from the line corners to the star point; otherwise every winding drawn
   between the corners of the lines on its two ends (a triangle for a correct delta; a loop marked 0 V where both ends sit on one line) */
const PH = ['', 'L1', 'L2', 'L3'];
C8.windSVG = (cn, mode, x0 = 0, o = {}) => { const C = { 1: [x0 + 48, 54], 2: [x0 + 252, 54], 3: [x0 + 150, 232] }, ctr = [x0 + 150, 128], V = o.V || 400, Vl = o.lab || 220, R = cn.info;
  let s = ''; const pc = k => C7.COL['L' + k] || 'currentColor';
  [1, 2, 3].forEach(k => { const [x, y] = C[k], live = mode !== 'off'; s += `<circle cx="${x}" cy="${y}" r="5" fill="${live ? pc(k) : 'var(--panel)'}" stroke="${pc(k)}" stroke-width="1.6"/>` + IE.T(PH[k], x + (k === 2 ? 10 : k === 1 ? -10 : 0), y + (k === 3 ? 20 : -9), { size: 12, weight: 700, anchor: k === 1 ? 'end' : k === 2 ? 'start' : 'middle', col: pc(k) }); });
  const coilPath = (a, b, bow) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, cx = mx + nx * bow, cy = my + ny * bow;
    return { d: `M ${f1(a[0])} ${f1(a[1])} Q ${f1(cx)} ${f1(cy)} ${f1(b[0])} ${f1(b[1])}`, m: [mx + nx * bow * 0.5, my + ny * bow * 0.5], nx, ny }; };
  const used = {}, lab = n => (mode === 'off' ? '' : `${Math.round(R.wv[n] * V)} V · ${Math.round(R.wv[n] * Vl)} V`);
  ['U', 'V', 'W'].forEach(n => { const cur = mode !== 'off' && R.iw[n] > 1e-6, col = cur ? COLW : 'currentColor', cls = cur ? ' class="rl-cur"' : '';
    let a, b, bow = 0, ends;
    if (mode === 'star') { const k = { U: 1, V: 2, W: 3 }[n]; a = C[k]; b = ctr; ends = [`${n}1`, `${n}2`]; }
    else if (mode === 'off') { const k = { U: [1, 2], V: [2, 3], W: [3, 1] }[n]; a = C[k[0]]; b = C[k[1]]; ends = [`${n}1`, `${n}2`]; bow = 0; }
    else { const [la, lb] = cn.lines[n]; ends = [`${n}1`, `${n}2`];
      if (!la || !lb || la === lb) { const c = C[la || lb || 1], dir = c[1] > 150 ? 1 : -1; s += `<g stroke="${mode === 'off' ? 'var(--muted)' : 'var(--bad)'}" fill="none"><path d="M ${c[0]} ${c[1]} c -26 ${dir * 30} 26 ${dir * 30} 0 0"/></g>` +
          IE.T(`${n}: 0 V`, c[0], c[1] + dir * 44 + (dir > 0 ? 8 : 0), { size: 10, anchor: 'middle', weight: 700, col: 'var(--bad)' }); return; }
      a = C[la]; b = C[lb]; const key = [la, lb].sort().join(), two = ['U', 'V', 'W'].filter(x => cn.lines[x][0] && cn.lines[x][1] && [...cn.lines[x]].sort().join() === key).length > 1;
      bow = two ? (used[key] ? -24 : 24) * (la < lb ? 1 : -1) : 0; used[key] = (used[key] || 0) + 1; }   // two windings on one pair of lines: bowed apart
    const p = coilPath(a, b, bow);
    s += `<g stroke="${col}"${cls} fill="none" stroke-width="${cur ? 2.4 : 1.5}"><path d="${p.d}"/></g>`;
    let nx = p.nx, ny = p.ny; const G = [x0 + 150, 113], out = nx * (p.m[0] - G[0]) + ny * (p.m[1] - G[1]);
    if (bow ? bow < 0 : mode === 'star' ? nx < 0 : out < 0) { nx = -nx; ny = -ny; }   // the voltage outside the figure (star: right of the winding; bowed: on the bow's side), the letter inside
    const anc = nx > 0.35 ? 'start' : nx < -0.35 ? 'end' : 'middle', tx = p.m[0] + nx * 9, ty = p.m[1] + ny * (anc === 'middle' ? 13 : 9) + 3;
    if (bow) { s += IE.T(`${n}: ${lab(n)}`, tx + nx * 4, ty + ny * 4, { size: 9.5, weight: 700, anchor: anc, col: cur ? COLW : 'var(--muted)' }); }
    else s += IE.T(n, p.m[0] - nx * 13, p.m[1] - ny * 13 + 4, { size: 13, weight: 700, anchor: 'middle', col: cur ? COLW : 'var(--muted)' }) + IE.T(lab(n), tx, ty, { size: 9.5, anchor: anc, col: 'var(--muted)' });
    const ox = bow ? Math.sign(bow) * p.nx * 9 : 0, oy = bow ? Math.sign(bow) * p.ny * 9 : 0;   // end labels of a bowed winding move to its own side
    const tE = (pt, txt, toward) => { const dx = toward[0] - pt[0], dy = toward[1] - pt[1], L = Math.hypot(dx, dy) || 1; return IE.T(txt, pt[0] + dx / L * 22 + ox, pt[1] + dy / L * 22 + 3 + oy, { size: 8.5, anchor: 'middle', col: 'var(--muted)' }); };
    s += tE(a, ends[0], b) + tE(b, ends[1], a); });
  if (mode === 'star') s += `<circle cx="${ctr[0]}" cy="${ctr[1]}" r="3.4" fill="currentColor" stroke="none"/>` + IE.T(T('จุดสตาร์ (KM2)', 'star point (KM2)'), ctr[0] + 8, ctr[1] + 16, { size: 9, col: 'var(--muted)' });
  return s; };
const COLW = '#ff4d4d';
/* C8.Box(el, o): terminal board (U1 V1 W1 over W2 U2 V2, windings behind it), the supply through KM1, the star bridge of KM2 or the three
   delta conductors of KM3 (by o.order), the star / triangle picture beside it with the winding voltages for o.V (400 V) and o.lab (220 V),
   and a table with winding voltage, line current and torque (direct start = 1) and the ohmmeter readings at the KM1 input (Q1 off,
   contactors pressed by hand). o: { mode 'off' | 'star' (default) | 'delta', order 'A' | 'B' | 'straight' | 'swap', controls true, orders
   false (show the delta-wiring buttons), V 400, lab 220, max 680, onChange(state) }. set(mode), setOrder(order), state, step(dt), draw(). */
C8.Box = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.mode = o.mode || 'star'; this.order = o.order || 'A';
    this.root = document.createElement('div'); this.root.className = 'c8box'; el.appendChild(this.root);
    if (o.controls !== false) { const c = document.createElement('div'); this.root.appendChild(c);
      this.rm = MC.ui.radio(c, [{ id: 'off', label: T('ปลดทั้งหมด', 'all open') }, { id: 'star', label: T('สตาร์: KM1 + KM2', 'star: KM1 + KM2'), on: this.mode === 'star' }, { id: 'delta', label: T('เดลตา: KM1 + KM3', 'delta: KM1 + KM3'), on: this.mode === 'delta' }], id => this.set(id));
      if (this.mode === 'off') this.rm.set('off');
      if (o.orders) { const d = document.createElement('div'); c.appendChild(d); this.ro = MC.ui.radio(d, Object.keys(C8.ORDERS).map(k => ({ id: k, label: tt(C8.ORDER_NAME[k]), on: k === this.order })), id => this.setOrder(id)); } }
    this.fig = document.createElement('div'); this.fig.className = 'c8b-fig'; this.root.appendChild(this.fig);
    this.tab = document.createElement('div'); this.tab.className = 'c8b-tab'; this.root.appendChild(this.tab); this.draw(); }
  set(m) { this.mode = m; if (this.rm) this.rm.set(m); this.draw(); if (this.o.onChange) this.o.onChange(this.state); }
  setOrder(k) { this.order = k; if (this.ro) this.ro.set(k); this.draw(); if (this.o.onChange) this.o.onChange(this.state); }
  step() {}
  draw() { const V = this.o.V || 400, Vl = this.o.lab || 220, cn = C8.connect(this.mode, this.order, { V }), R = cn.info, m = this.mode; this.cn = cn;
    const S = [[96, 92], [170, 92], [244, 92]], B = [[96, 172], [170, 172], [244, 172]], TOP = ['U1', 'V1', 'W1'], BOT = ['W2', 'U2', 'V2'], pc = k => C7.COL['L' + k];
    let s = `<rect x="58" y="62" width="224" height="138" rx="10" fill="var(--panel2)" stroke="var(--line)" stroke-width="1.5"/>`;
    // windings behind the board
    [['U', 0, 1], ['V', 1, 2], ['W', 2, 0]].forEach(([n, a, b]) => { const cur = m !== 'off' && R.iw[n] > 1e-6, p = S[a], q = B[b];
      s += `<g stroke="${cur ? COLW : 'var(--muted)'}"${cur ? ' class="rl-cur"' : ''} stroke-width="${cur ? 2 : 1.1}" stroke-dasharray="${cur ? '' : '3 3'}" fill="none"><line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}"/></g>` +
        IE.T(n, (p[0] + q[0]) / 2 + (n === 'W' ? 0 : 8), (p[1] + q[1]) / 2 + (n === 'W' ? -6 : 4), { size: 11, weight: 700, col: cur ? COLW : 'var(--muted)', anchor: 'middle' }); });
    // the supply through KM1 on U1 V1 W1
    S.forEach(([x, y], k) => { const live = m !== 'off'; s += IE.L(x, 22, x, y - 9, { col: live ? pc(k + 1) : 'var(--muted)', w: live ? 2.2 : 1.2, dash: live ? '' : '4 3' }) + IE.T(PH[k + 1], x, 16, { size: 11, weight: 700, anchor: 'middle', col: pc(k + 1) }); });
    s += IE.T('KM1', 46, 44, { size: 10, weight: 700, anchor: 'end' });
    // the bottom: KM2 star bridge or KM3 delta conductors
    if (m === 'star') { s += `<g stroke="var(--c8-star, #2f6fd6)" stroke-width="2.4" fill="none">${B.map(([x, y]) => IE.L(x, y + 9, x, 238)).join('')}${IE.L(B[0][0], 238, B[2][0], 238)}</g><circle cx="${B[1][0]}" cy="238" r="3" fill="var(--c8-star, #2f6fd6)" stroke="none"/>` +
        IE.T(T('KM2 ต่อ W2–U2–V2 เข้าด้วยกัน = จุดสตาร์', 'KM2 joins W2–U2–V2 = the star point'), 170, 256, { size: 10, anchor: 'middle', weight: 700, col: 'var(--c8-star, #2f6fd6)' }); }
    if (m === 'delta') { const C = cn.info, cfg = C8.ORDERS[this.order], map = Array.isArray(cfg) ? cfg : { A: ['W2', 'U2', 'V2'], B: ['V2', 'W2', 'U2'], straight: ['U2', 'V2', 'W2'] }[cfg];
      [0, 1, 2].forEach(q => { const j = BOT.indexOf(map[q]), xs = B[q][0], xe = B[j][0];
        s += `<g stroke="${pc(q + 1)}" stroke-width="2.2" fill="none"><path d="M ${xs} 262 L ${xs} 246 L ${xe} 224 L ${xe} ${B[j][1] + 9}"/></g>` + IE.T(PH[q + 1], xs, 276, { size: 11, weight: 700, anchor: 'middle', col: pc(q + 1) }); });
      s += IE.T('KM3', 46, 252, { size: 10, weight: 700, anchor: 'end' }); }
    S.concat(B).forEach(([x, y], i) => { const k = i < 3 ? TOP[i] : BOT[i - 3]; s += `<circle cx="${x}" cy="${y}" r="9" fill="var(--panel)" stroke="currentColor" stroke-width="1.6"/><circle cx="${x}" cy="${y}" r="2.6" fill="currentColor" stroke="none"/>` +
      IE.T(k, x + 13, y + (i < 3 ? -8 : 16), { size: 10.5, weight: 700 }); });
    s += `<rect x="60" y="208.5" width="220" height="13" fill="var(--panel)" stroke="none"/>` + IE.T(T('แผงขั้วต่อในกล่องขั้วมอเตอร์ (ถอดสะพานออกหมดแล้ว)', 'motor terminal board (all links removed)'), 170, 218, { size: 9.5, anchor: 'middle', col: 'var(--muted)' });   // last, on a background band, so that the conductors below the board pass behind it
    const s2 = C8.windSVG(cn, m, 4, { V, lab: Vl }) + IE.T(T(`แรงดันขดลวด ตัวเลขแรก: ระบบ ${V} V`, `winding voltage, first value: ${V} V supply`), 154, 274, { size: 9.5, anchor: 'middle', col: 'var(--muted)' }) +
      IE.T(T(`ตัวเลขหลัง: แหล่งจ่ายของชุดฝึก ${Vl} V`, `second value: the trainer's ${Vl} V supply`), 154, 287, { size: 9.5, anchor: 'middle', col: 'var(--muted)' });
    this.fig.innerHTML = IE.svg(320, 292, s, { cls: 'rl c8b-svg', label: 'motor terminal board with star or delta connection' }) + IE.svg(310, 292, s2, { cls: 'rl c8b-svg', label: 'windings in star or delta' });
    // the table
    const one = (n, d = 0) => { const vs = ['U', 'V', 'W'].map(w => n(w)); return vs.every(v => Math.abs(v - vs[0]) < 0.5) ? `${ED.fd(vs[0], d)}` : ['U', 'V', 'W'].map((w, i) => `${w} ${ED.fd(vs[i], d)}`).join(' · '); };
    const st = C8.connect('star', this.order, { V }), de = C8.connect('delta', this.order, { V }), col = c => (c === m ? ' class="on"' : '');
    const nf = x => (x < 0.005 ? '0' : Math.abs(x - 1) < 1e-3 ? '1' : Math.abs(x - 1 / 3) < 1e-3 ? '1/3' : ED.fd(x, 2)), iRel = c => { const a = c.info.iLine.map(x => x / 3); return a.every(x => Math.abs(x - a[0]) < 1e-3) ? nf(a[0]) : a.map((x, i) => `L${i + 1} ${nf(x)}`).join(' · '); };
    const tq = c => nf(Math.max(0, (c.info.fp * c.info.fp - c.info.fn * c.info.fn) / 3));
    const rows = [[T(`แรงดันขดลวด ที่ ${V} V`, `winding voltage on ${V} V`), one(w => st.info.wv[w] * V) + ' V', one(w => de.info.wv[w] * V) + ' V'],
      [T(`แรงดันขดลวด ที่ ${Vl} V (ชุดฝึก)`, `winding voltage on ${Vl} V (trainer)`), one(w => st.info.wv[w] * Vl) + ' V', one(w => de.info.wv[w] * Vl) + ' V'],
      [T('กระแสสายตอนเริ่ม (สตาร์ทตรง = 1)', 'starting line current (direct start = 1)'), iRel(st), iRel(de)],
      [T('แรงบิดตอนเริ่ม (สตาร์ทตรง = 1)', 'starting torque (direct start = 1)'), tq(st), tq(de)],
      [T('โอห์มมิเตอร์ที่ด้านเข้า KM1: L1–L2 / L2–L3 / L3–L1', 'ohmmeter at the KM1 input: L1–L2 / L2–L3 / L3–L1'), st.ohm.star.map(C8.fracR).join(' / '), de.ohm.delta.map(C8.fracR).join(' / ')]];
    this.tab.innerHTML = `<table class="tbl c8b-t"><tr><th></th><th${col('star')}>${T('สตาร์ (KM1 + KM2)', 'star (KM1 + KM2)')}</th><th${col('delta')}>${T('เดลตา (KM1 + KM3)', 'delta (KM1 + KM3)')}</th></tr>` +
      rows.map(r => `<tr><td>${r[0]}</td><td${col('star')}>${r[1]}</td><td${col('delta')}>${r[2]}</td></tr>`).join('') + '</table>' +
      `<div class="hint">${T('R = ความต้านทานของขดลวดหนึ่งเส้น (วัด U1–U2) · ค่ากระแสและแรงบิดคิดจากแบบจำลองขณะมอเตอร์หยุดนิ่ง (ตัวอย่าง)', 'R = the resistance of one winding (measure U1–U2) · current and torque from the model at standstill (example values)')}</div>`; }
  get state() { const c = this.cn || C8.connect(this.mode, this.order); return { mode: this.mode, order: this.order, sd: c.sd, wv: { ...c.info.wv }, ohm: c.ohm }; }
};

/* C8.Curves(el, o): line current and torque against speed (o.x 'speed', default) or time (o.x 'time') for a direct start and for star-delta
   from the ED.motor model (direct start 6.5 × I_N and 2.2 × T_N: example values), the load torque (o.load 'fan' T ∝ n², or 'const') and a
   movable changeover point (o.at: speed in per unit, or seconds for 'time'). In star the motor can only reach the speed where its torque
   meets the load (it then waits there for the timer); the jump to the delta current is drawn at the changeover, the short extra peak of
   the phase position only as a marked arrow without a number. o: { x, at 0.85, load 'fan', TL 0.6, J 5, controls true, max }.
   res = { nStar (highest star speed), nSw (changeover speed), stall, iStart: { dol, star }, tStart: { dol, star }, iJump, iDelta0 };
   set(p), step(dt) (no-op), draw(). */
C8.Curves = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.p = { x: o.x || 'speed', at: o.at ?? (o.x === 'time' ? 2 : 0.85), load: o.load || 'fan', TL: o.TL ?? 0.6, J: o.J ?? 5 };
    this.root = document.createElement('div'); this.root.className = 'c8curves'; el.appendChild(this.root);
    if (o.controls !== false) { const c = document.createElement('div'); this.root.appendChild(c); const ui = MC.ui;
      ui.radio(c, [{ id: 'speed', label: T('เทียบกับความเร็ว', 'against speed'), on: this.p.x === 'speed' }, { id: 'time', label: T('เทียบกับเวลา', 'against time'), on: this.p.x === 'time' }], id => { this.p.x = id; this.p.at = id === 'time' ? 2 : 0.85; this.sl.set(id === 'time' ? 2 : 85); this.draw(); });
      ui.radio(c, [{ id: 'fan', label: T('โหลดพัดลม (T ∝ n²)', 'fan load (T ∝ n²)'), on: this.p.load === 'fan' }, { id: 'const', label: T('โหลดแรงบิดคงที่', 'constant-torque load'), on: this.p.load === 'const' }], id => { this.p.load = id; this.draw(); });
      this.sl = ui.slider(c, { id: 'c8at', label: T('จุดเปลี่ยนเป็นเดลตา', 'change to delta at'), min: this.p.x === 'time' ? 0.2 : 50, max: this.p.x === 'time' ? 8 : 99, step: this.p.x === 'time' ? 0.1 : 1, value: this.p.x === 'time' ? this.p.at : Math.round(this.p.at * 100),
        unit: '', dec: 1, fmt: v => (this.p.x === 'time' ? `${ED.fd(v, 1)} s` : `${Math.round(v)} %`), oninput: v => { this.p.at = this.p.x === 'time' ? v : v / 100; this.draw(); } });
      ui.slider(c, { id: 'c8tl', label: T('แรงบิดโหลดที่ความเร็วพิกัด', 'load torque at rated speed'), min: 0, max: 1.2, step: 0.05, value: this.p.TL, fmt: v => `${ED.fd(v, 2)} × ${T('แรงบิดพิกัด', 'rated torque')}`, oninput: v => { this.p.TL = v; this.draw(); } }); }
    this.fig = document.createElement('div'); this.fig.className = 'c8c-fig'; this.root.appendChild(this.fig);
    this.note = document.createElement('div'); this.note.className = 'c8c-note'; this.root.appendChild(this.note); this.draw(); }
  set(p) { Object.assign(this.p, p); this.draw(); }
  step() {}
  tl(n) { return this.p.load === 'fan' ? this.p.TL * n * n : (n > 0 ? this.p.TL : this.p.TL); }
  calc() { const M = ED.motor, N = 240, sp = [], tl = n => this.tl(n);
    for (let k = 0; k <= N; k++) { const n = Math.min(0.998, k / N), m = M(1 - n); sp.push({ n, i: m.i, T: m.T }); }
    let nStar = 0; for (const q of sp) { if (q.T / 3 <= tl(q.n) + 1e-9 && q.n > 0) break; nStar = q.n; } if (sp[0].T / 3 <= tl(0)) nStar = 0;
    const stall = nStar === 0, sl = M.slipFor(this.tl(1)), nOp = sl === null ? 0 : 1 - sl;
    return { sp, nStar, stall, nOp }; }
  run(sw) { const M = ED.motor, tau = 0.12 * (1 + this.p.J), dt = 0.002, pts = [], dol = sw === null; let w = 0, t = 0, mode = dol ? 'D' : 'Y', tEnd = 20, tSw = null, nSw = null;
    while (t < tEnd) { const s = Math.max(1e-4, 1 - w), m = M(s), Tm = mode === 'D' ? m.T : m.T / 3, i = mode === 'D' ? m.i : m.i / 3;
      if (!pts.length || t - pts[pts.length - 1][0] >= 0.01) pts.push([t, i, w]);
      if (!dol && mode === 'Y' && t >= sw) { mode = 'D'; tSw = t; nSw = w; pts.push([t, i, w]); pts.push([t, m.i, w]); }
      const L = this.tl(w), acc = (Tm - (w > 0 || Tm > L ? L : Tm)) / tau; w = Math.min(0.999, Math.max(0, w + acc * dt)); t += dt;
      if (mode === 'D' && w > 0.97 * (1 - (M.slipFor(this.tl(1)) || 0.03)) && tEnd === 20) tEnd = t + Math.max(0.4, 0.25 * t); }
    return { pts, tSw, nSw, span: t }; }
  draw() { const c = this.calc(), x0 = 58, x1 = 610, yT = 26, yB = 300, W = 640, H = 350, top = 7, Y = v => yB - (yB - yT) * Math.min(v, top) / top, p = this.p;
    let s = '', res;
    for (let v = 0; v <= top; v++) s += IE.L(x0, Y(v), x1, Y(v), { col: 'var(--line)', dash: v ? '1 3' : '' }) + IE.T(`${v}×`, x0 - 5, Y(v) + 3, { size: 9, anchor: 'end', col: 'var(--muted)' });
    const poly = (pts, col, w, dash) => `<polyline points="${pts.map(q => `${f1(q[0])},${f1(q[1])}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
    const CI = 'var(--accent)', CT = 'var(--c8-torque, #1d8a4a)', CL = 'var(--muted)';
    if (p.x === 'speed') { const X = n => x0 + (x1 - x0) * n;
      [0, 0.25, 0.5, 0.75, 1].forEach(n => { s += IE.L(X(n), yT, X(n), yB, { col: 'var(--line)', dash: '1 3' }) + IE.T(`${Math.round(n * 100)} %`, X(n), yB + 14, { size: 9, anchor: 'middle', col: 'var(--muted)' }); });
      s += IE.T(T('ความเร็ว (% ของความเร็วซิงโครนัส)', 'speed (% of synchronous speed)'), x1, yB + 30, { size: 9.5, anchor: 'end', col: 'var(--muted)' });
      const nSw = Math.min(p.at, c.nStar), sw = c.sp.filter(q => q.n <= nSw), after = c.sp.filter(q => q.n >= nSw && q.n <= Math.max(nSw, c.nOp));
      s += poly(c.sp.map(q => [X(q.n), Y(q.i)]), CI, 1.2, '5 4') + poly(c.sp.map(q => [X(q.n), Y(q.T)]), CT, 1.2, '5 4');
      s += poly(c.sp.map(q => [X(q.n), Y(q.i / 3)]), CI, 1, '2 3') + poly(c.sp.map(q => [X(q.n), Y(q.T / 3)]), CT, 1, '2 3');
      s += poly(c.sp.map(q => [X(q.n), Y(this.tl(q.n))]), CL, 1.6);
      if (!c.stall) { const mI = ED.motor(1 - nSw);
        s += poly(sw.map(q => [X(q.n), Y(q.i / 3)]).concat([[X(nSw), Y(mI.i / 3)], [X(nSw), Y(mI.i)]]).concat(after.map(q => [X(q.n), Y(q.i)])), CI, 3);
        s += poly(sw.map(q => [X(q.n), Y(q.T / 3)]).concat([[X(nSw), Y(mI.T / 3)], [X(nSw), Y(mI.T)]]).concat(after.map(q => [X(q.n), Y(q.T)])), CT, 3);
        const ya = Y(mI.i) - 6; s += `<path d="M ${f1(X(nSw))} ${f1(ya)} L ${f1(X(nSw))} ${f1(ya - 26)} M ${f1(X(nSw) - 4)} ${f1(ya - 20)} L ${f1(X(nSw))} ${f1(ya - 27)} L ${f1(X(nSw) + 4)} ${f1(ya - 20)}" stroke="var(--bad)" stroke-width="1.6" fill="none" stroke-dasharray="3 2"/>` +
          pkLab(X(nSw), ya - 22, x1);
        res = { nStar: c.nStar, nSw, stall: false, iJump: mI.i, iDelta0: ED.motor(1).i }; }
      else res = { nStar: 0, nSw: 0, stall: true, iJump: ED.motor(1).i, iDelta0: ED.motor(1).i };
      if (c.nStar < 0.999 && !c.stall) s += `<circle cx="${f1(X(c.nStar))}" cy="${f1(Y(this.tl(c.nStar)))}" r="4" fill="var(--panel)" stroke="${CL}" stroke-width="1.6"/>`; }
    else { const dol = this.run(null), sd = this.run(p.at), span = Math.max(dol.span, sd.span), X = t => x0 + (x1 - x0) * t / span, Ys = v => yB - (yB - yT) * v;
      const nt = span > 12 ? 2 : span > 5 ? 1 : 0.5; for (let t = 0; t <= span + 1e-9; t += nt) s += IE.L(X(t), yT, X(t), yB, { col: 'var(--line)', dash: '1 3' }) + IE.T(ED.fd(t, nt < 1 ? 1 : 0), X(t), yB + 14, { size: 9, anchor: 'middle', col: 'var(--muted)' });
      s += IE.T(T('เวลา (s)', 'time (s)'), x1, yB + 30, { size: 9.5, anchor: 'end', col: 'var(--muted)' });
      s += poly(dol.pts.map(q => [X(q[0]), Y(q[1])]), CI, 1.2, '5 4') + poly(sd.pts.map(q => [X(q[0]), Y(q[1])]), CI, 3) + poly(sd.pts.map(q => [X(q[0]), Ys(q[2])]), 'var(--muted)', 1.2, '2 3');
      if (sd.tSw !== null) { const q = sd.pts.find(r => r[0] >= sd.tSw && r[1] > 0 && r !== sd.pts[0]), ya = Y(Math.max(...sd.pts.filter(r => Math.abs(r[0] - sd.tSw) < 1e-9).map(r => r[1]))) - 6;
        s += `<path d="M ${f1(X(sd.tSw))} ${f1(ya)} L ${f1(X(sd.tSw))} ${f1(ya - 26)}" stroke="var(--bad)" stroke-width="1.6" fill="none" stroke-dasharray="3 2"/>` + pkLab(X(sd.tSw), ya - 22, x1); }
      s += IE.T(T('เส้นประเทา = ความเร็ว (0–100 %)', 'grey dotted = speed (0–100 %)'), x1, yT - 8, { size: 9, anchor: 'end', col: 'var(--muted)' });
      res = { nStar: c.nStar, nSw: sd.nSw ?? 0, stall: c.stall, tSw: sd.tSw, iJump: sd.nSw !== null ? ED.motor(1 - sd.nSw).i : 0, iDelta0: ED.motor(1).i, tStart: { dol: dol.span, sd: sd.span } }; }
    const lg = [[CI, 3, '', T('สตาร์–เดลตา: กระแสสาย', 'star-delta: line current')], [CT, 3, '', T('สตาร์–เดลตา: แรงบิด', 'star-delta: torque')], [CI, 1.2, '5 4', T('สตาร์ทตรง: กระแส', 'direct start: current')],
      [CT, 1.2, '5 4', T('สตาร์ทตรง: แรงบิด', 'direct start: torque')], [CL, 1.6, '', T('แรงบิดของโหลด', 'load torque')]].filter((r, i) => p.x === 'speed' || i === 0 || i === 2);
    lg.forEach((r, i) => { const lx = x0 + 8 + (i % 3) * 182, ly = yB + 46 + Math.floor(i / 3) * 14; s += IE.L(lx, ly - 4, lx + 22, ly - 4, { col: r[0], w: r[1], dash: r[2] }) + IE.T(r[3], lx + 27, ly, { size: 9, col: 'var(--muted)' }); });
    s += IE.T(T('เท่าของค่าพิกัด (ค่าตัวอย่างจากแบบจำลอง)', '× rated (example values from the model)'), x0, yT - 8, { size: 9.5, weight: 700 });
    res.iStart = { dol: ED.motor(1).i, star: ED.motor(1).i / 3 }; res.tStart = { ...(res.tStart || {}), dolT: ED.motor(1).T, starT: ED.motor(1).T / 3 }; this.res = res;
    this.fig.innerHTML = IE.svg(W, H + (p.x === 'speed' ? 14 : 0), s, { max: this.o.max || 720, label: 'current and torque of direct and star-delta starting' });
    this.note.innerHTML = res.stall ? `<span class="pill bad">${T('ไม่ออกตัว', 'stalls')}</span> ${T('แรงบิดในสตาร์ (1/3) น้อยกว่าแรงบิดของโหลดตั้งแต่เริ่ม มอเตอร์ไม่หมุนจนกว่าจะเป็นเดลตา (กระแสเท่าสตาร์ทตรง)', 'the star torque (1/3) is below the load torque from the start: the motor does not turn until delta (direct-start current)')}`
      : `<span class="pill good">${T('สตาร์', 'star')}</span> ${T(`ในสตาร์เร่งได้ถึง ${Math.round(res.nStar * 100)} % · เปลี่ยนที่ ${Math.round(res.nSw * 100)} % · กระแสกระโดดไป ${ED.fd(res.iJump, 1)} × I<sub>N</sub> (สตาร์ทตรงเริ่มที่ ${ED.fd(res.iStart.dol, 1)} × I<sub>N</sub>)`,
        `in star it reaches ${Math.round(res.nStar * 100)} % · changes at ${Math.round(res.nSw * 100)} % · the current jumps to ${ED.fd(res.iJump, 1)} × I<sub>N</sub> (a direct start begins at ${ED.fd(res.iStart.dol, 1)} × I<sub>N</sub>)`)}`; }
};

/* C8.Manual(el, o): the manual cam switch 0–Y–Δ on the six leads (Book_1 Fig 7.1 idea): a rotary handle with the positions 0, Y, Δ, the
   contact chart (which leads each position joins), the winding picture and a status line from a hidden power simulator (C8.POWER: Y =
   KM1 + KM2, Δ = KM1 + KM3, so the motor model is the same as in the drawings). Its weak points are shown on purpose: turning straight to
   Δ (or too early) is almost a direct start, and after a power cut the motor starts again by itself when the supply returns — a hazard
   (no undervoltage release, IEC 60204-1 7.5). o: { at '0', cut true, V 400, lab 220, max, onChange(pos, sim) }. set(pos), cut(), step(dt),
   draw(); sim (the hidden simulator), warn ('' | 'early' | 'restart'). */
C8.Manual = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.at = o.at || '0'; this.warn = ''; this.tY = 0; this.cutLeft = 0;
    this.sim = new RL.Sim(document.createElement('div'), C8.POWER({ V: o.V || 400 }));
    this.root = document.createElement('div'); this.root.className = 'c8manual'; el.appendChild(this.root);
    this.knob = document.createElement('div'); this.knob.className = 'c8m-knob'; this.root.appendChild(this.knob);
    this.pic = document.createElement('div'); this.pic.className = 'c8m-pic'; this.root.appendChild(this.pic);
    this.chart = document.createElement('div'); this.chart.className = 'c8m-chart'; this.root.appendChild(this.chart);
    const row = document.createElement('div'); row.className = 'toggles c8m-row'; this.root.appendChild(row);
    ['0', 'Y', 'Δ'].forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.dataset.p = p; b.textContent = p === '0' ? T('0 ปิด', '0 off') : p === 'Y' ? T('Y สตาร์', 'Y star') : T('Δ เดลตา', 'Δ delta'); b.addEventListener('click', () => this.set(p)); row.appendChild(b); });
    if (o.cut !== false) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn on'; b.textContent = T('⚡ ไฟดับแล้วกลับมา', '⚡ Power fails and returns'); b.addEventListener('click', () => this.cut()); row.appendChild(b); }
    this.row = row; this.st = MC.ui.status(this.root);
    this.knob.addEventListener('click', e => { const g = e.target.closest('[data-p]'); if (g) this.set(g.dataset.p); }); this.draw(); }
  set(p) { if (!['0', 'Y', 'Δ'].includes(p) || p === this.at) return; const was = this.at; this.at = p; const s = this.sim, want = { KM1: p !== '0', KM2: p === 'Y', KM3: p === 'Δ' };
    if (s.dev.KM2.on && !want.KM2) s.toggle('KM2'); if (s.dev.KM3.on && !want.KM3) s.toggle('KM3');   // break before make
    ['KM1', 'KM2', 'KM3'].forEach(id => { if (!!s.dev[id].on !== want[id]) s.toggle(id); });
    if (p === 'Y') { this.tY = 0; if (this.warn === 'early') this.warn = ''; }
    if (p === 'Δ' && (s.sdw || 0) < 0.8 && s.mains !== false) this.warn = 'early'; if (p === '0') this.warn = '';
    this.draw(); if (this.o.onChange) this.o.onChange(p, s); }
  cut() { if (this.cutLeft > 0) return; this.cutLeft = 1.5; this.sim.setMains(false); this.draw(); }
  step(dt) { const s = this.sim, w0 = Math.round((s.sdw || 0) * 20); if (this.cutLeft > 0) { this.cutLeft -= dt; if (this.cutLeft <= 0) { this.cutLeft = 0; s.setMains(true); if (this.at !== '0') this.warn = 'restart'; this.draw(); } }
    s.step(dt); if (this.at === 'Y') this.tY += dt; if (Math.round((s.sdw || 0) * 20) !== w0) this.draw(); }
  draw() { const P = ['0', 'Y', 'Δ'], W = 200, cx = 100, cy = 82, ang = j => (-60 + 60 * j) * Math.PI / 180, i = P.indexOf(this.at), s = this.sim;
    let k = `<rect x="34" y="16" width="132" height="132" rx="6" fill="#f2c230" stroke="#b8901c"/>`;
    P.forEach((p, j) => { const a = ang(j), x = cx + 46 * Math.sin(a), y = cy - 46 * Math.cos(a) + 4, on = p === this.at;
      k += `<g data-p="${p}" style="cursor:pointer"><rect x="${f1(x - 13)}" y="${f1(y - 11)}" width="26" height="16" rx="3" fill="${on ? '#16181b' : 'transparent'}" stroke="none"/>` + IE.T(p, x, y + 1, { size: 12, anchor: 'middle', weight: 700, col: on ? '#f2c230' : '#16181b' }) + '</g>'; });
    k += `<circle cx="${cx}" cy="${cy}" r="15" fill="#b82a24" stroke="#7a1d19"/><rect x="${cx - 6}" y="${cy - 33}" width="12" height="46" rx="5" fill="#d83a34" stroke="#7a1d19" transform="rotate(${-60 + 60 * i} ${cx} ${cy})"/><circle cx="${cx}" cy="${cy}" r="3.4" fill="#ffd0cc"/>`;
    k += IE.T(T('สวิตช์ลูกเบี้ยว 0–Y–Δ', 'cam switch 0–Y–Δ'), cx, 166, { size: 10, anchor: 'middle', weight: 700 });
    this.knob.innerHTML = IE.svg(W, 176, k, { max: 220, label: 'star-delta cam switch' });
    const cn = { info: s.sdInfo(), lines: {} }, V = cn.info.V, near = v => { if (!v) return 0; let b = 0, d = 1e9; [[1, 0], [-0.5, -SQ3 / 2], [-0.5, SQ3 / 2]].forEach((q, kk) => { const e = Math.hypot(v[0] - q[0], v[1] - q[1]); if (e < d) { d = e; b = kk + 1; } }); return d < 1e-6 ? b : 0; };
    [['U', 'U1', 'U2'], ['V', 'V1', 'V2'], ['W', 'W1', 'W2']].forEach(([w, a, b]) => { cn.lines[w] = [near(V.get(`M1:${a}`)), near(V.get(`M1:${b}`))]; });
    const mode = s.mains === false || this.at === '0' ? 'off' : this.at === 'Y' ? 'star' : 'delta';
    this.pic.innerHTML = IE.svg(300, 262, C8.windSVG(cn, mode, 0, { V: this.o.V || 400, lab: this.o.lab || 220 }), { cls: 'rl', max: 320, label: 'windings in star or delta' });
    const C = [[T('L1 → U1, L2 → V1, L3 → W1', 'L1 → U1, L2 → V1, L3 → W1'), ['Y', 'Δ']], [T('W2–U2–V2 ต่อเข้าด้วยกัน (จุดสตาร์)', 'W2–U2–V2 joined (star point)'), ['Y']], [T('L1 → W2, L2 → U2, L3 → V2', 'L1 → W2, L2 → U2, L3 → V2'), ['Δ']]];
    this.chart.innerHTML = `<table class="tbl c8m-t"><tr><th>${T('หน้าสัมผัสต่อ', 'contacts join')}</th>${P.map(p => `<th${p === this.at ? ' class="on"' : ''}>${p}</th>`).join('')}</tr>` +
      C.map(r => `<tr><td>${r[0]}</td>${P.map(p => `<td${p === this.at ? ' class="on"' : ''}>${r[1].includes(p) ? '●' : ''}</td>`).join('')}</tr>`).join('') + '</table>';
    this.row.querySelectorAll('[data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === this.at));
    const n = Math.round((s.sdw || 0) * 100), tx = s.sdText();
    if (s.mains === false) MC.ui.setStatus(this.st, T('ไฟดับ', 'power off'), T(`สวิตช์ยังค้างที่ ${this.at} · มอเตอร์หมุนฟรี ${n} %`, `the switch stays at ${this.at} · the motor coasts, ${n} %`), 'bad');
    else if (this.warn === 'restart') MC.ui.setStatus(this.st, T('อันตราย', 'hazard'), T(`ไฟกลับมาแล้วมอเตอร์เดินเองทันที (สวิตช์ค้างที่ ${this.at}) สวิตช์ลูกเบี้ยวไม่มีการปลดเมื่อแรงดันตก ต่างจากวงจรคอนแทกเตอร์ที่มีหน้าสัมผัสค้าง (IEC 60204-1 ข้อ 7.5)`, `the power came back and the motor started by itself (the switch stayed at ${this.at}): a cam switch has no undervoltage release, unlike a contactor circuit with a holding contact (IEC 60204-1 7.5)`), 'bad');
    else if (this.warn === 'early') MC.ui.setStatus(this.st, T('เร็วเกินไป', 'too early'), T(`เปลี่ยนเป็น Δ ขณะมอเตอร์หมุนเพียง ${n} % กระแสกระโดดสูง เกินครึ่งหนึ่งของสตาร์ทตรง ไม่มีอะไรกันผู้ใช้หมุนข้าม Y`, `changed to Δ at only ${n} % speed: a high current jump, more than half of a direct start; nothing stops the user from skipping Y`), 'warn');
    else MC.ui.setStatus(this.st, this.at, `${tt(tx[0])}${tx[1] ? ' · ' + tt(tx[1]) : ''} · n ${n} %`, this.at === '0' ? 'wait' : 'good'); }
};

/* C8.Timeline(el, o): contactor states and line current against time for one automatic start. Scripted (default): S2, KM1 KM2 KM3 (main
   contacts), KT1 coil and its two contacts (o.timer 'plain' = on-delay timer 15–16 / 25–28: the pause is KM2's drop-out plus the wait for
   KM2 21–22, then KM3's pick-up; 'relay' = star-delta timer relay with a built-in pause o.dwell 0.05 s between its star and delta outputs),
   main first (o.order 'main', the course standard) or star first ('star'); the line current from the ED.motor model (× I_N, example values;
   the extra changeover peak only marked) and a zoom of the changeover with the pause in ms. Contactor times o.tPick 0.03 s, o.tDrop
   0.015 s are EXAMPLES (a few tens of ms: the contactor data sheet gives them). o: { T 3, timer, dwell, order, load { J, TL, type }, span,
   controls true, max }. Live: o.sim (an AUTO simulator): records KM1 KM2 KM3, KT1 and the current sim.sdIL as the page runs it.
   play(), reset(), set(p), step(dt), draw(); res = { T, tStar, tOpen, tDelta, pause, maker } (scripted). */
C8.tlRun = (p = {}) => { const T0 = p.T ?? C8.T, relay = p.timer === 'relay', tP = p.tPick ?? 0.03, tD = p.tDrop ?? 0.015, dw = p.dwell ?? 0.05, sf = p.order === 'star', L = { J: 2, TL: 0.1, type: 'fan', ...(p.load || {}) };
  const span = p.span ?? T0 + 2.2, c1 = sf ? tP : 0, c2 = sf ? 0 : tP, k1 = c1 + tP, k2 = c2 + tP, tStar = Math.max(k1, k2), k2off = T0 + tD, c3 = Math.max(relay ? T0 + dw : T0, k2off), k3 = c3 + tP;
  const rows = [{ key: 'S2', lab: 'S2', sub: T('ปุ่มเริ่ม', 'start'), segs: [[0, 0.3]] }, { key: 'KM1', lab: 'KM1', sub: T('หน้าสัมผัสหลัก', 'main contacts'), segs: [[k1, span]] },
    { key: 'KM2', lab: 'KM2', sub: T('หน้าสัมผัสหลัก', 'main contacts'), segs: [[k2, k2off]] }, { key: 'KM3', lab: 'KM3', sub: T('หน้าสัมผัสหลัก', 'main contacts'), segs: [[k3, span]] },
    { key: 'KT1', lab: 'KT1', sub: T('คอยล์ A1–A2', 'coil A1–A2'), segs: [[0, span]] },
    relay ? { key: 'KT1:y', lab: 'KT1', sub: T('ทางออกสตาร์', 'star output'), segs: [[0, T0]] } : { key: 'KT1:y', lab: 'KT1', sub: T('15–16 (ปกติปิด)', '15–16 (NC)'), segs: [[0, T0]] },
    relay ? { key: 'KT1:d', lab: 'KT1', sub: T('ทางออกเดลตา', 'delta output'), segs: [[T0 + dw, span]] } : { key: 'KT1:d', lab: 'KT1', sub: T('25–28 (ปกติเปิด)', '25–28 (NO)'), segs: [[T0, span]] }];
  const M = ED.motor, tau = 0.12 * (1 + L.J), fan = L.type !== 'const', tl = v => (v > 0 ? (fan ? L.TL * v * v : L.TL) + 0.03 : 0), dt = 0.0005, cur = []; let w = 0, t = 0;
  while (t <= span + 1e-9) { const mode = t >= k3 ? 'D' : t >= tStar && t < k2off ? 'Y' : 'O', s = Math.max(1e-4, 1 - w), m = M(s), Tm = mode === 'D' ? m.T : mode === 'Y' ? m.T / 3 : 0, i = mode === 'D' ? m.i : mode === 'Y' ? m.i / 3 : 0;
    if (!cur.length || t - cur[cur.length - 1][0] >= 0.004 || (cur.length && (cur[cur.length - 1][1] > 0) !== (i > 0))) cur.push([t, i, w]);
    const acc = (Tm - (w > 0 || Tm > tl(1e-9) ? tl(w) : Tm)) / tau; w = Math.min(0.999, Math.max(0, w + acc * dt)); t += dt; }
  return { rows, cur, span, T: T0, tStar, tOpen: k2off, tDelta: k3, pause: k3 - k2off, maker: sf ? 'KM1' : 'KM2', relay, iPeakStar: Math.max(...cur.filter(q => q[0] < k2off).map(q => q[1])) }; };
C8.Timeline = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.p = { T: o.T ?? C8.T, timer: o.timer || 'plain', dwell: o.dwell ?? 0.05, order: o.order || 'main', load: o.load, tPick: o.tPick, tDrop: o.tDrop, span: o.span };
    this.root = document.createElement('div'); this.root.className = 'c8tl'; el.appendChild(this.root); this.t = 0; this.playing = false;
    if (o.sim) { this.live = true; this.span = o.span || 10; this.lt = 0; this.started = false; this.lsegs = {}; this.lcur = [];
      this.lrows = [['KM1', T('คอนแทกเตอร์หลัก', 'main')], ['KM2', T('สตาร์', 'star')], ['KM3', T('เดลตา', 'delta')], ['KT1', T('คอยล์ A1–A2', 'coil A1–A2')], ['KT1:c', T('หน้าสัมผัสหน่วงเวลา', 'timed contacts')]];
      o.sim.on(() => { this.sample(); this.draw(); }); }
    else if (o.controls !== false) { const c = document.createElement('div'); this.root.appendChild(c); const ui = MC.ui;
      ui.radio(c, [{ id: 'plain', label: T('ตัวตั้งเวลาหน่วงเมื่อป้อนไฟธรรมดา', 'plain on-delay timer'), on: this.p.timer === 'plain' }, { id: 'relay', label: T('รีเลย์ตั้งเวลาสตาร์–เดลตา (มีช่วงพัก)', 'star-delta timer relay (built-in pause)'), on: this.p.timer === 'relay' }], id => this.set({ timer: id }));
      ui.radio(c, [{ id: 'main', label: T('หลักก่อน แล้วสตาร์', 'main first, then star'), on: this.p.order === 'main' }, { id: 'star', label: T('สตาร์ก่อน แล้วหลัก', 'star first, then main'), on: this.p.order === 'star' }], id => this.set({ order: id }));
      ui.slider(c, { id: 'c8tlT', label: T('เวลาที่ตั้ง KT1', 'KT1 setting'), min: 0.5, max: 8, step: 0.5, value: this.p.T, unit: 's', dec: 1, oninput: v => this.set({ T: v }) });
      ui.buttons(c, [{ id: 'play', label: T('▶ เล่น', '▶ play'), onclick: () => this.play() }, { id: 'all', label: T('แสดงทั้งหมด', 'show all'), onclick: () => { this.playing = false; this.t = this.r.span; this.draw(); } }]); }
    this.fig = document.createElement('div'); this.fig.className = 'c8tl-fig'; this.root.appendChild(this.fig); if (!this.live) this.r = C8.tlRun(this.p); this.t = this.live ? 0 : this.r.span; this.draw(); }
  set(p) { Object.assign(this.p, p); this.r = C8.tlRun(this.p); this.t = this.playing ? 0 : this.r.span; this.draw(); }
  get res() { return this.r ? { T: this.r.T, tStar: this.r.tStar, tOpen: this.r.tOpen, tDelta: this.r.tDelta, pause: this.r.pause, maker: this.r.maker } : null; }
  play() { if (this.live) return; this.t = 0; this.playing = true; this.draw(); }
  reset() { if (this.live) { this.lt = 0; this.started = false; this.lsegs = {}; this.lcur = []; } else { this.t = 0; this.playing = false; } this.draw(); }
  sample() { const S = this.o.sim, vals = this.lrows.map(([k]) => (k === 'KT1:c' ? !!S.act('KT1') : k === 'KT1' ? !!(S.dev.KT1 && S.dev.KT1.energized) : !!(S.dev[k] && S.act(k))));
    if (!this.started) { if (!vals.some(Boolean)) return; this.started = true; this.lt = 0; }
    this.lrows.forEach(([k], i) => { const a = this.lsegs[k] = this.lsegs[k] || [], last = a[a.length - 1], open = last && last[1] === null; if (vals[i] && !open) a.push([this.lt, null]); else if (!vals[i] && open) last[1] = this.lt; });
    const iL = S.sdIL || 0; if (!this.lcur.length || this.lt - this.lcur[this.lcur.length - 1][0] >= 0.01) this.lcur.push([this.lt, S.running() || S.sd() === 'open' ? iL : 0]); }
  step(dt) { if (this.live) { if (this.started) this.lt += dt; this.sample(); const old = this.lt - this.span - 1; this.lcur = this.lcur.filter(q => q[0] >= old); if (this.started) this.draw(); return; }
    if (!this.playing) return; this.t = Math.min(this.r.span, this.t + dt); if (this.t >= this.r.span) this.playing = false; this.draw(); }
  draw() { const live = this.live, W = 640, x0 = 112, x1 = 620, rowH = 24, top = 22, f = v => f1(v);
    const rows = live ? this.lrows.map(([k, sub]) => ({ key: k, lab: k.split(':')[0], sub, segs: (this.lsegs[k] || []).map(s => [s[0], s[1] === null ? this.lt : s[1]]) })) : this.r.rows;
    const now = live ? this.lt : this.t, span = live ? this.span : this.r.span, t0 = live ? Math.max(0, now - span * 0.92) : 0, X = t => x0 + (x1 - x0) * (t - t0) / span;
    const yR = top + rowH * rows.length, cTop = yR + 16, cH = 92, cBot = cTop + cH, cur = (live ? this.lcur : this.r.cur).filter(q => q[0] <= now + 1e-9 && q[0] >= t0), iMax = Math.max(2, ...((live ? this.lcur : this.r.cur).map(q => q[1]))) * 1.08;
    const Yc = v => cBot - cH * Math.min(v, iMax) / iMax, zoom = !live, zTop = cBot + 52, zH = 150, H = zoom ? zTop + zH + 26 : cBot + 34; let s = '';
    const nt = span > 12 ? 2 : 1; for (let k = Math.ceil(t0); k <= t0 + span + 1e-9; k += nt) s += IE.L(X(k), top - 4, X(k), cBot, { col: 'var(--line)', dash: '1 4' }) + IE.T(`${k}`, X(k), cBot + 13, { size: 9, anchor: 'middle', col: 'var(--muted)' });
    s += IE.T(T('เวลา (s)', 'time (s)'), x1, cBot + 26, { size: 9, anchor: 'end', col: 'var(--muted)' });
    rows.forEach((r, i) => { const yb = top + rowH * (i + 1) - 5, yt = yb - 14;
      s += IE.T(r.lab, x0 - 8, yb - 6, { size: 10.5, anchor: 'end', weight: 700 }) + IE.T(r.sub, x0 - 8, yb + 3, { size: 8, anchor: 'end', col: 'var(--muted)' }) + IE.L(x0, yb, x1, yb, { col: 'var(--line)' });
      r.segs.forEach(([a, b]) => { const e = Math.min(b, now); if (e <= a || e < t0) return; const xa = Math.max(x0, X(Math.max(a, t0))), xb = Math.min(x1, X(e)); s += `<rect x="${f(xa)}" y="${yt}" width="${f(Math.max(1.5, xb - xa))}" height="13" rx="2" fill="${GOOD}" opacity=".85" stroke="none"/>`; }); });
    s += IE.L(x0, cBot, x1, cBot, { col: 'var(--line)' }) + IE.T(T('กระแสสาย', 'line current'), x0 - 14, cTop + 12, { size: 10.5, anchor: 'end', weight: 700 }) + IE.T('× I<tspan baseline-shift="sub" font-size="6.5">N</tspan>', x0 - 14, cTop + 23, { size: 8, anchor: 'end', col: 'var(--muted)' });
    [0, Math.round(iMax / 2), Math.floor(iMax)].forEach(v => { s += IE.T(`${v}`, x0 - 2, Yc(v) + 3, { size: 8, anchor: 'end', col: 'var(--muted)' }) + IE.L(x0, Yc(v), x1, Yc(v), { col: 'var(--line)', dash: '1 3' }); });
    if (cur.length > 1) s += `<polyline points="${cur.map(q => `${f(X(q[0]))},${f(Yc(q[1]))}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
    if (!live && now >= this.r.tDelta) { const xs = X(this.r.tDelta), q = this.r.cur.find(c => c[0] >= this.r.tDelta), ya = Yc(q ? q[1] : 0) - 4;
      s += `<path d="M ${f(xs)} ${f(ya)} L ${f(xs)} ${f(Math.max(cTop, ya - 22))}" stroke="var(--bad)" stroke-width="1.6" stroke-dasharray="3 2" fill="none"/>` + halo(IE.T(T('+ ยอดชั่วขณะ (ขึ้นกับมุมเฟส ไม่มีตัวเลข)', '+ short peak (phase position; no number)'), Math.min(xs + 5, x1 - 190), Math.max(cTop + 8, ya - 14), { size: 8.5, col: 'var(--bad)' })); }
    if (live || this.playing || now < span) { const xn = X(now); if (now > 0) s += IE.L(xn, top - 6, xn, cBot, { col: 'var(--accent)', w: 2 }) + IE.T(`${ED.fd(now, 1)} s`, Math.min(xn + 4, x1 - 30), top - 9, { size: 9, weight: 700, col: 'var(--accent)' }); }
    if (live && !this.started) s += IE.T(T('นาฬิกาเริ่มเมื่อกด S2', 'the clock starts when S2 is pressed'), (x0 + x1) / 2, top - 8, { size: 10, anchor: 'middle', col: 'var(--muted)' });
    if (zoom && now >= this.r.tDelta) { const R = this.r, za = R.T - 0.04, zb = R.T + Math.max(0.16, R.pause + 0.1), Z = t => x0 + (x1 - x0) * (t - za) / (zb - za), zr = [['KM2', R.rows[2]], ['KM3', R.rows[3]], [R.rows[5].sub, R.rows[5]], [R.rows[6].sub, R.rows[6]]];
      s += `<rect x="${x0 - 104}" y="${zTop - 18}" width="${x1 - x0 + 110}" height="${zH + 32}" rx="8" fill="none" stroke="var(--line)" stroke-dasharray="4 3"/>` + IE.T(T('ขยายช่วงเปลี่ยน (เวลาของคอนแทกเตอร์เป็นค่าตัวอย่าง)', 'the changeover enlarged (contactor times are example values)'), x0 - 96, zTop - 4, { size: 9.5, weight: 700 });
      for (let k = Math.ceil(za * 100) / 100; k <= zb + 1e-9; k += 0.02) { const xx = Z(k); s += IE.L(xx, zTop + 4, xx, zTop + zH - 18, { col: 'var(--line)', dash: '1 3' }); if (Math.abs((k * 100) % 10) < 1e-6 || Math.abs((k * 100) % 10 - 10) < 1e-6) s += IE.T(`${ED.fd(k, 2)}`, xx, zTop + zH - 6, { size: 8.5, anchor: 'middle', col: 'var(--muted)' }); }
      zr.forEach(([lab, r], i) => { const yb = zTop + 24 + i * 22, yt = yb - 12; s += IE.T(r.lab === 'KT1' ? `KT1 ${lab}` : lab, x0 - 8, yb - 2, { size: 9.5, anchor: 'end', weight: 700 });
        r.segs.forEach(([a, b]) => { const xa = Math.max(x0, Z(Math.max(a, za))), xb = Math.min(x1, Z(Math.min(b, zb))); if (xb > xa) s += `<rect x="${f(xa)}" y="${yt}" width="${f(xb - xa)}" height="11" rx="2" fill="${GOOD}" opacity=".85" stroke="none"/>`; }); });
      const xa = Z(R.tOpen), xb = Z(R.tDelta), yb = zTop + 24 + 4 * 22; s += `<rect x="${f(xa)}" y="${zTop + 8}" width="${f(Math.max(1, xb - xa))}" height="${yb - zTop - 14}" fill="var(--bad)" opacity=".13" stroke="none"/>` +
        IE.T(T(`มอเตอร์หลุดจากแหล่งจ่าย ${Math.round(R.pause * 1000)} ms`, `motor disconnected for ${Math.round(R.pause * 1000)} ms`), (xa + xb) / 2, yb + 4, { size: 9.5, anchor: 'middle', weight: 700, col: 'var(--bad)' }); }
    s += IE.T(T('แถบเขียว = กด / มีไฟ / ต่อ', 'green bar = pressed / energised / closed'), x0, H - 4, { size: 9, col: 'var(--muted)' });
    this.fig.innerHTML = IE.svg(W, H, s, { max: this.o.max || 700, label: 'star-delta timing chart' }); }
};

global.C8 = C8;
})(window);
