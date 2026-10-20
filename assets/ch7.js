/* ch7.js — chapter 7: reversing a motor (forward and reverse, interlocks, plugging, limit switches, single-phase reversing).
   Course names and IEC numbers (chapter 7 design): Q1 main breaker, F1 control fuse, F2 overload relay (95–96 in the common path,
   97–98 to H3), KM1 forward contactor (L1 → U1 straight), KM2 reverse contactor (L1 ↔ L3 swapped on its supply side: KM2 1/L1 from L3,
   3/L2 from L2, 5/L3 from L1), S1 STOP 11–12 (black), S2 FORWARD and S3 REVERSE (white, double contact NO 13–14 + NC 21–22), H1 green
   FORWARD (KM1 53–54), H2 green REVERSE (KM2 53–54), H3 yellow OVERLOAD (F2 97–98 fed from F1 2, ahead of 95–96), H4 white STOPPED
   (KM1 61–62 + KM2 61–62 in series), S5 forward-end and S6 reverse-end limit switches (one device each: NC 21–22 with the direct-
   opening mark + NO 13–14), S7 / S8 over-travel switches (NC, direct opening) beyond S5 / S6, S4 AUTO START (white), KA1 auto-cycle
   relay (13–14 hold, 23–24 KM1 auto branch, 33–34 KM2 auto branch), KA2 stop-lock relay (13–14 hold, 21–22 in the common path),
   KT1 / KT2 on-delay timers (55–56 timed NC, 67–68 timed NO). KM1 / KM2: 13–14 hold, 21–22 electrical interlock in the OTHER coil's
   path just above that coil (a mirror contact), 53–54 run lamp, 61–62 stopped lamp, 71–72 spare NC (AUTO_T: 61–62 drive the timers).
   Control 230 V between L1 and N after Q1. Every push button and lamp has name [th, en] (the English part makes the engraved plate on
   the C5.panel / PN.Door front: FORWARD, REVERSE, STOP, AUTO START, OVERLOAD, STOPPED). Every spec sets chatter: true (relay.js).
   Every factory takes o: { lamps: false (default; TRIPLE 'all') | 'all' | ['H1', …], mech: bool (mechanical interlock KM1 ▽ KM2 under
   the coils), tap: 'after' | 'before', map: [3, 2, 1] (supply phase on KM2 poles 1–3; a cyclic [2, 3, 1] does not reverse) } and
   returns a fresh spec with the reversing power drawing (relay.js power.rev); sim.dir() 'cw' (forward) | 'ccw' (reverse) | 0.
   1) circuits
      C7.NONE(o)      no interlock: (S2 ∥ KM1 13–14) → KM1, (S3 ∥ KM2 13–14) → KM2; S2 then S3 → both close → L1–L3 short → Q1 trips
      C7.ELEC(o)      + KM2 21–22 in the KM1 path, KM1 21–22 in the KM2 path (forward – stop – reverse: S3 while forward does nothing)
      C7.PB(o)        ELEC + push-button interlock: S3 21–22 in the KM1 path, S2 21–22 in the KM2 path, between the hold node and the
                      coil, so the hold spans only the start NO and S3 drops KM1 at once (direct reversing); o.holdAbove: the hold
                      bridges the other button's NC as well (direct reversing lost); o.elec false: push-button interlock only
      C7.TRIPLE(o)    PB + mechanical interlock + lamps H1–H4 (rows 7; paths 1 KM1, 2 hold, 3 KM2, 4 hold, 5–8 H1 H2 H3 H4)
      C7.MECH(o)      NONE + mechanical interlock only (S3 while forward: KM2's coil is energised but blocked; it overheats)
      C7.STOPLOCK(o)  ELEC + anti-plugging lock: S1 23–24 (the stop button's second element, NO) latches KA2 (13–14), KT1 on-delay (o.T, default 5 s) in parallel; KT1 55–56
                      releases KA2; KA2 21–22 in the common path blocks both starts until KT1 has timed out (a teaching device: real
                      plug braking needs a zero-speed switch, IEC 60204-1 9.3.5). Rows 7; paths 1 KM1, 2 hold, 3 KM2, 4 hold, 5 KA2,
                      6 KA2 hold / KT1 coil
      C7.LIMITS(o)    ELEC + travel limits: S5 21–22 in the KM1 path, S6 21–22 in the KM2 path, inside the held branch
      C7.AUTO(o)      automatic back-and-forth (our own design): KM1 path (S2 ∥ KM1 13–14 ∥ (KA1 23–24 + S6 13–14)) → S5 21–22 → S7
                      21–22 → KM2 21–22 → KM1; KM2 path (S3 ∥ KM2 13–14 ∥ (KA1 33–34 + S5 13–14)) → S6 21–22 → S8 21–22 → KM1
                      21–22 → KM2; KA1 by S4 (∥ KA1 13–14), dropped by S1, F2 or a power cut. o.over false: no S7 / S8; o.dwell T:
                      a dwell at each end (S5 13–14 starts KT1, KT1 67–68 starts the return; S6 13–14 / KT2 the other way)
      C7.AUTO_T(o)    time-controlled back-and-forth after Book_1 Fig 6.21, redrawn: S4 (∥ KA1 13–14) → KA1; from there KM2 61–62 →
                      KT1 and KM1 61–62 → KT2; KA1 23–24 → KT1 55–56 → KM2 21–22 → KM1 and → (KT1 67–68 ∥ KM2 13–14) → KT2 55–56 →
                      KM1 21–22 → KM2: forward o.T1 (4 s), instant reversal, reverse o.T2 (4 s), … until S1, F2 or a power cut
                      (KM1 in column 5, KM2 in column 7, lamps from column 9; spec.pathNo numbers the used columns 1 … n)
      C7.ONEPH(o)     single-phase reversing, forward – stop – reverse (ELEC control) on the power drawing of relay.js (phases 1 + rev):
                      Q1 two-pole, F2 ahead of the split, KM1 L → U1, L → Z1, N → Z2; KM2 L → U1, L → Z2, N → Z1; U2 to N.
                      step() must run: at speed the centrifugal switch is open and swapping Z1–Z2 does nothing until the motor slows
                      below 60 %. o.poles / o.fixed override the pole lists (fault 9)
      C7.CONTACTS     the contact-number table [[device, contact, use [th, en]]]
   2) C7.FAULTS       nine fault-finding cases in the format of C5/C6 FAULTS { id, title, spec, good, symptom, options (answer = 0),
                      answer, fix, test, seq } plus power (true when the power drawing shows the clue), carriage (C7.Carriage options
                      when the case needs the carriage, else null), oneph (single-phase: the page must call step());
      C7.runSeq(sim, seq) runs a test sequence: the C6 ops ['tap', ids…] ['hold', id] ['release', id] ['toggle', id] ['start', id]
                      ['cut'] ['fault', id] ['wait', s] plus ['carriage', pos, o] (a hidden carriage from here on; 'wait' moves it),
                      ['travel', s] (= wait), ['set', id, bool] (limit switch by hand); checks ['run', bool] ['on', id, bool]
                      ['lit', id, bool] ['dir', 'cw'|'ccw'|0] ['q1', bool] ['short', bool] ['blocked', id, bool] ['chatter', id, bool]
                      ['crash', bool] ['at', id, bool] (switch actuated) ['pos', '<'|'>', x] ['revs', '>='|'<=', n]; true when all hold
      C7.faultTrial(c) → { bad, good } (good true and bad false when the case works); C7.trial(spec, seq) → bool
   3) C7.state(sim)   status [pill, text, kind] of a reversing simulator (short circuit, blocked or chattering coil, stop lock, direction,
                      auto cycle, coasting, over-travel S7 / S8, carriage resting on S5 / S6); C7.panel(el, sim, o) = C5.panel with that
                      status (returns { row, door, status, refresh }: call refresh() every frame for the stop-lock countdown and the
                      blocked-coil time)
   colours: C7.COL (lamps; phases L1 / L2 / L3 as var(--c7-l1) / var(--ink) / var(--c7-l3), defined per theme in ed2.css)
   4) C7.Field        rotating field of three windings for any L1/L2/L3 → U1/V1/W1 permutation, with the 6-row permutation table
                      (3 cyclic shifts keep the direction, 3 swaps reverse it); C7.PERMS, C7.permDir(perm), C7.permKind(perm)
   5) C7.Plug         coast-down and reversal from the ED.motor model: speed and current against time for "stop, wait, reverse" and
                      "reverse at speed" (plugging: slip about 2, current above the starting current, about 4 × the kinetic energy as
                      rotor heat); C7.plugRun(p), C7.plugSVG(runs, o)
   6) C7.Carriage     a table on a track between S6 (left, reverse end) and S5 (right, forward end), driven by sim.dir(); it presses the
                      limit switches by itself (sim.setOn), over-travel switches S8 / S7 beyond them, end stops; crash warning */
(function (global) {
'use strict';
const C7 = {}, IE = global.IEC, T = (th, en) => MC.t(th, en), tt = p => ED.tt(p);
const GOOD = '#1d8a4a', f1 = v => +(+v).toFixed(1);
C7.COL = { run: '#7ee787', ol: '#ffd166', stop: '#f2f2f2', L1: 'var(--c7-l1, #a0522d)', L2: 'var(--ink)', L3: 'var(--c7-l3, #687083)' };   // phase colours: ed2.css, per theme
C7.T = 5;   // default stop-lock time (s)

/* ---------------- 1) circuits ---------------- */
const DV = {
  Q1: () => ({ type: 'cb', on: true, name: ['Q1 เบรกเกอร์หลัก', 'Q1 main breaker'] }),
  F1: () => ({ type: 'fuse', name: ['F1 ฟิวส์วงจรควบคุม', 'F1 control fuse'] }),
  F2: () => ({ type: 'ol', name: ['F2 โอเวอร์โหลด ตัด / รีเซ็ต', 'F2 overload trip / reset'] }),
  S1: () => ({ type: 'pb', cap: 'black', legend: 'O', name: ['S1 หยุด', 'S1 stop'] }),
  S2: () => ({ type: 'pb', cap: 'white', legend: 'I', name: ['S2 เดินหน้า', 'S2 forward'] }),
  S3: () => ({ type: 'pb', cap: 'white', legend: 'I', name: ['S3 ถอยหลัง', 'S3 reverse'] }),
  S4: () => ({ type: 'pb', cap: 'white', legend: 'I', name: ['S4 เริ่มเดินอัตโนมัติ', 'S4 auto start'] }),
  S5: () => ({ type: 'sen', name: ['S5 ลิมิตสวิตช์ปลายทางเดินหน้า', 'S5 forward end limit switch'] }),
  S6: () => ({ type: 'sen', name: ['S6 ลิมิตสวิตช์ปลายทางถอยหลัง', 'S6 reverse end limit switch'] }),
  S7: () => ({ type: 'sen', name: ['S7 สวิตช์กันเลยระยะด้านเดินหน้า', 'S7 forward over-travel switch'] }),
  S8: () => ({ type: 'sen', name: ['S8 สวิตช์กันเลยระยะด้านถอยหลัง', 'S8 reverse over-travel switch'] }),
  KM1: () => ({ type: 'coil', name: ['KM1 คอนแทกเตอร์เดินหน้า', 'KM1 forward contactor'] }),
  KM2: () => ({ type: 'coil', name: ['KM2 คอนแทกเตอร์ถอยหลัง', 'KM2 reverse contactor'] }),
  KA1: () => ({ type: 'coil', name: ['KA1 รีเลย์รอบอัตโนมัติ', 'KA1 auto-cycle relay'] }),
  KA2: () => ({ type: 'coil', name: ['KA2 รีเลย์ล็อกหลังกดหยุด', 'KA2 stop-lock relay'] }),
  KT: (T0, nm) => ({ type: 'timer', mode: 'on', T: T0, name: nm }),
  H1: () => ({ type: 'lamp', color: C7.COL.run, code: 'GN', name: ['H1 เดินหน้า', 'H1 forward'] }),
  H2: () => ({ type: 'lamp', color: C7.COL.run, code: 'GN', name: ['H2 ถอยหลัง', 'H2 reverse'] }),
  H3: () => ({ type: 'lamp', color: C7.COL.ol, code: 'YE', name: ['H3 โอเวอร์โหลด', 'H3 overload'] }),
  H4: () => ({ type: 'lamp', color: C7.COL.stop, code: 'WH', name: ['H4 หยุดอยู่', 'H4 stopped'] }) };
C7.DEV = DV;
const w = (pts, dots) => (dots && dots.length ? { k: 'w', pts, dots } : { k: 'w', pts }), vw = (x, y, h = 1) => ({ k: 'w', x, y, h });
const fuse = () => ({ k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }), olNC = () => ({ k: 'NC', d: 'F2', x: 0, y: 1, t: ['95', '96'], op: 'thr' });
const pbNO = (d, x, y, h = 1) => ({ k: 'NO', d, x, y, h, t: ['13', '14'], op: 'pb' }), pbNC = (d, x, y, t = ['21', '22']) => ({ k: 'NC', d, x, y, t, op: 'pb' });
const no = (d, a, b, x, y, h = 1) => ({ k: 'NO', d, x, y, h, t: [a, b] }), nc = (d, a, b, x, y) => ({ k: 'NC', d, x, y, t: [a, b] });
const coil = (d, x, y) => ({ k: 'coil', d, x, y, t: ['A1', 'A2'] });
const limNC = d => ({ k: 'NC', d, t: ['21', '22'], op: 'lim', dop: true }), limNO = d => ({ k: 'NO', d, t: ['13', '14'], op: 'lim' });
const tNC = d => ({ k: 'NC', d, t: ['55', '56'], td: 'on' }), tNO = d => ({ k: 'NO', d, t: ['67', '68'], td: 'on' });
/* power circuit: Q1 → KM1 ∥ KM2 (rev.map) → F2 → M1; single-phase: Q1 → F2 → KM1 ∥ KM2 → M1 1~ */
const PW = (o = {}) => ({ full: true, tap: o.tap === 'before' ? 'before' : 'after', rev: { fwd: 'KM1', rev: 'KM2', swap: ['L1', 'L3'], ...(o.map ? { map: o.map.slice() } : {}) },
  stages: [{ k: 'cb', d: 'Q1' }, { k: 'rev' }, { k: 'therm', d: 'F2' }], motor: 'M1' });
const PW1 = (o = {}) => ({ phases: 1, start: true, tap: o.tap === 'before' ? 'before' : 'after', rev: { fwd: 'KM1', rev: 'KM2', ...(o.poles ? { poles: o.poles } : {}), ...(o.fixed ? { fixed: o.fixed } : {}) },
  stages: [{ k: 'cb', d: 'Q1' }, { k: 'therm', d: 'F2' }, { k: 'rev' }], motor: 'M1' });
/* lamp columns from x0 (rows = N row): each fed from F1 2 along row 1, its contact(s) just above the lamp */
const LAMP = { H1: [{ k: 'NO', d: 'KM1', t: ['53', '54'] }], H2: [{ k: 'NO', d: 'KM2', t: ['53', '54'] }], H3: [{ k: 'NO', d: 'F2', t: ['97', '98'], op: 'thr' }],
  H4: [{ k: 'NC', d: 'KM1', t: ['61', '62'] }, { k: 'NC', d: 'KM2', t: ['61', '62'] }] };
const lampSel = (o, dflt) => { const v = o.lamps === undefined ? dflt : o.lamps; return v === 'all' || v === true ? ['H1', 'H2', 'H3', 'H4'] : Array.isArray(v) ? v.filter(h => LAMP[h]) : []; };
const lamps = (ids, x0, rows, D) => { const els = []; if (!ids.length) return els;
  ids.forEach((h, i) => { const x = x0 + i, cs = LAMP[h], yc = rows - 1 - cs.length; D[h] = DV[h]();
    els.push(vw(x, 1, yc - 1)); cs.forEach((c, j) => els.push({ ...c, x, y: yc + j })); els.push({ k: 'lamp', d: h, x, y: rows - 1, t: ['X1', 'X2'] }); });
  const pts = [[0, 1], ...ids.map((h, i) => [x0 + i, 1])]; els.push(w(pts, pts.map((p, i) => i).slice(0, -1))); return els; };
/* one direction path from node A (row yA) in column cx: start NO (sh rows) ∥ hold (column cx + 1, holdH rows) [∥ an auto branch of two
   contacts in column cx + 2], then the series slots (an element, or null = a plain wire), then the coil. Returns the N row. */
const dirPath = (els, cx, yA, P) => { const sh = P.sh || 1, hh = P.holdH || sh, xs = [cx, cx + 1, ...(P.auto ? [cx + 2] : [])];
  els.push(P.startEl ? { ...P.startEl, x: cx, y: yA, h: sh } : pbNO(P.start, cx, yA, sh), no(P.coil, '13', '14', cx + 1, yA, hh));
  if (P.auto) els.push({ ...P.auto[0], x: cx + 2, y: yA }, { ...P.auto[1], x: cx + 2, y: yA + 1 });
  if (hh === sh) els.push(w(xs.map(x => [x, yA + sh]), xs.length > 2 ? [0, 1] : [0]));
  else els.push(w([[cx, yA + hh], [cx + 1, yA + hh]], [0]));
  let y = yA + sh; P.slots.forEach(e => { els.push(e ? { ...e, x: cx, y } : vw(cx, y)); y++; });
  els.push(coil(P.coil, cx, y)); return y + 1; };
const top = (els, yA, x1) => { const pts = []; for (let x = 0; x <= x1; x++) pts.push([x, yA]); els.push(w(pts, pts.map((p, i) => i).slice(0, -1))); };
const spec = (D, els, rows, o, extra = {}) => ({ supply: o.tap === 'before' ? undefined : 'Q1', rows, chatter: true, devices: D, power: o._one ? PW1(o) : PW(o), els, ...(o.mech ? { mech: [['KM1', 'KM2']] } : {}), ...extra });
const base = () => ({ Q1: DV.Q1(), F1: DV.F1(), F2: DV.F2(), S1: DV.S1(), S2: DV.S2(), S3: DV.S3(), KM1: DV.KM1(), KM2: DV.KM2() });

/* the two-button circuits NONE / ELEC / PB / TRIPLE / MECH / LIMITS (rows 7, node A = (0, 3)); internal options for the faults:
   _own (KM1 71–72 in its own path instead of KM2 21–22), _swapBtn (S2 / S3 linkages swapped), _bothNC (an NC S3 11–12, as CADe SIMU numbers a new NC
   contact, where S3 13–14 should be in the KM2 path), _limWrong (S5 21–22 in the KM2 path, S6 21–22 in the KM1 path) */
const two = (o = {}) => { const D = base(), els = [fuse(), olNC(), { k: 'NC', d: 'S1', x: 0, y: 2, t: ['11', '12'], op: 'pb' }], yA = 3, pb = !!o.pb, el = o.elec !== false && (o.elec || pb), lim = !!o.limits;
  const [a, b] = o._swapBtn ? ['S3', 'S2'] : ['S2', 'S3'];   // the buttons in the KM1 path: a NO, b NC; in the KM2 path b NO, a NC
  if (lim) { D.S5 = DV.S5(); D.S6 = DV.S6(); }
  const s1 = lim ? (o._limWrong ? limNC('S6') : limNC('S5')) : pb ? pbNC(b) : null, s2 = lim ? (o._limWrong ? limNC('S5') : limNC('S6')) : pb ? pbNC(a) : null;
  const i1 = el ? (o._own ? nc('KM1', '71', '72') : nc('KM2', '21', '22')) : null, i2 = el ? nc('KM1', '21', '22') : null, hh = o.holdAbove && pb ? 2 : 1;
  dirPath(els, 0, yA, { start: a, coil: 'KM1', holdH: hh, slots: [s1, i1] });
  const rows = dirPath(els, 2, yA, { start: b, coil: 'KM2', holdH: hh, slots: [s2, i2], startEl: o._bothNC ? pbNC(b, 0, 0, ['11', '12']) : null });
  top(els, yA, 3); els.push(...lamps(lampSel(o, false), 4, rows, D));
  return spec(D, els, rows, o); };
C7.NONE = (o = {}) => two({ ...o, elec: false, pb: false });
C7.ELEC = (o = {}) => two({ ...o, elec: true, pb: false });
C7.PB = (o = {}) => two({ ...o, pb: true });
C7.TRIPLE = (o = {}) => two({ lamps: 'all', mech: true, ...o, pb: true });
C7.MECH = (o = {}) => two({ mech: true, ...o, elec: false, pb: false });
C7.LIMITS = (o = {}) => two({ ...o, elec: true, pb: false, limits: true });

/* forward – stop – reverse with a stop lock: S1 23–24 latches KA2 for KT1's time; KA2 21–22 under S1 blocks both starts */
C7.STOPLOCK = (o = {}) => { const D = base(), T0 = o.T ?? C7.T; D.KA2 = DV.KA2(); D.KT1 = DV.KT(T0, ['KT1 ตัวตั้งเวลาล็อกหลังหยุด', 'KT1 stop-lock timer']);
  const els = [fuse(), olNC(), { k: 'NC', d: 'S1', x: 0, y: 2, t: ['11', '12'], op: 'pb' }, nc('KA2', '21', '22', 0, 3)], yA = 4;
  dirPath(els, 0, yA, { start: 'S2', coil: 'KM1', slots: [nc('KM2', '21', '22')] });
  const rows = dirPath(els, 2, yA, { start: 'S3', coil: 'KM2', slots: [nc('KM1', '21', '22')] });
  top(els, yA, 3);
  // the lock: from the point after F2 95–96 (ahead of S1 11–12): S1 23–24 ∥ KA2 13–14 → KT1 55–56 → KA2 ∥ KT1
  els.push(w([[0, 2], [4, 2], [5, 2]], [0, 1]), { ...pbNO('S1', 4, 2), t: ['23', '24'] }, no('KA2', '13', '14', 5, 2), w([[4, 3], [5, 3]], [0]), { ...tNC('KT1'), x: 4, y: 3 }, vw(4, 4, rows - 5),
    coil('KA2', 4, rows - 1), w([[4, rows - 1], [5, rows - 1]], [0]), coil('KT1', 5, rows - 1));
  els.push(...lamps(lampSel(o, false), 6, rows, D));
  return spec(D, els, rows, o); };

/* automatic back-and-forth with limit switches (rows 9, node A = (0, 3)) */
C7.AUTO = (o = {}) => { const D = base(), over = o.over !== false, dw = o.dwell > 0 ? o.dwell : 0, yA = 3;
  D.S4 = DV.S4(); D.S5 = DV.S5(); D.S6 = DV.S6(); if (over) { D.S7 = DV.S7(); D.S8 = DV.S8(); } D.KA1 = DV.KA1();
  if (dw) { D.KT1 = DV.KT(dw, ['KT1 หน่วงที่ปลายทางเดินหน้า', 'KT1 dwell at the forward end']); D.KT2 = DV.KT(dw, ['KT2 หน่วงที่ปลายทางถอยหลัง', 'KT2 dwell at the reverse end']); }
  const els = [fuse(), olNC(), { k: 'NC', d: 'S1', x: 0, y: 2, t: ['11', '12'], op: 'pb' }];
  const ret1 = dw ? tNO('KT2') : limNO('S6'), ret2 = dw ? tNO('KT1') : limNO('S5');   // what starts the return at each end
  dirPath(els, 0, yA, { start: 'S2', coil: 'KM1', sh: 2, auto: [no('KA1', '23', '24'), ret1], slots: [limNC('S5'), ...(over ? [{ ...limNC('S7') }] : []), nc('KM2', '21', '22')] });
  const rows = dirPath(els, 3, yA, { start: 'S3', coil: 'KM2', sh: 2, auto: [no('KA1', '33', '34'), ret2], slots: [limNC('S6'), ...(over ? [{ ...limNC('S8') }] : []), nc('KM1', '21', '22')] });
  // KA1: S4 ∥ KA1 13–14 → KA1 (column 6, 7)
  els.push(pbNO('S4', 6, yA), no('KA1', '13', '14', 7, yA), w([[6, yA + 1], [7, yA + 1]], [0]), vw(6, yA + 1, rows - yA - 2), coil('KA1', 6, rows - 1));
  let xe = 7;
  if (dw) { els.push({ ...limNO('S5'), x: 8, y: yA }, vw(8, yA + 1, rows - yA - 2), coil('KT1', 8, rows - 1), { ...limNO('S6'), x: 9, y: yA }, vw(9, yA + 1, rows - yA - 2), coil('KT2', 9, rows - 1)); xe = 9; }
  top(els, yA, xe); els.push(...lamps(lampSel(o, false), xe + 1, rows, D));
  return spec(D, els, rows, o); };

/* time-controlled back-and-forth after Book_1 Fig 6.21, redrawn to IEC (rows 9) */
C7.AUTO_T = (o = {}) => { const D = base(), T1 = o.T1 ?? o.T ?? 4, T2 = o.T2 ?? o.T ?? 4; delete D.S2; delete D.S3;
  D.S4 = DV.S4(); D.KA1 = DV.KA1(); D.KT1 = DV.KT(T1, ['KT1 เวลาเดินหน้า', 'KT1 forward time']); D.KT2 = DV.KT(T2, ['KT2 เวลาถอยหลัง', 'KT2 reverse time']);
  const rows = 9, els = [fuse(), olNC(), { k: 'NC', d: 'S1', x: 0, y: 2, t: ['11', '12'], op: 'pb' },
    // KA1 (column 0, hold column 1); node D = (0, 4) feeds the two timers through KM2 61–62 / KM1 61–62
    pbNO('S4', 0, 3), no('KA1', '13', '14', 1, 3), w([[0, 3], [1, 3], [5, 3]], [0, 1]), w([[0, 4], [1, 4], [2, 4], [3, 4]], [0, 1, 2]), vw(0, 4, 4), coil('KA1', 0, 8),
    nc('KM2', '61', '62', 2, 4), vw(2, 5, 3), coil('KT1', 2, 8), nc('KM1', '61', '62', 3, 4), vw(3, 5, 3), coil('KT2', 3, 8),
    // node E after KA1 23–24 (column 5): KT1 55–56 → KM2 21–22 → KM1;  E → (KT1 67–68 ∥ KM2 13–14) → KT2 55–56 → KM1 21–22 → KM2 (column 7);
    // columns 4 and 6 stay empty so that the cross-references under KM1 and KM2 do not run into each other
    no('KA1', '23', '24', 5, 3, 2), w([[5, 5], [7, 5], [8, 5]], [0, 1]), { ...tNC('KT1'), x: 5, y: 5 }, nc('KM2', '21', '22', 5, 6), vw(5, 7), coil('KM1', 5, 8),
    { ...tNO('KT1'), x: 7, y: 5 }, no('KM2', '13', '14', 8, 5), w([[7, 6], [8, 6]], [0]), { ...tNC('KT2'), x: 7, y: 6 }, nc('KM1', '21', '22', 7, 7), coil('KM2', 7, 8)];
  els.push(...lamps(lampSel(o, false), 9, rows, D).map(e => (e.d && e.t && e.t[0] === '61' && e.k === 'NC' && e.x >= 9 ? { ...e, t: ['71', '72'] } : e)));   // 61–62 drive the timers here: H4 uses 71–72
  const used = [...new Set(els.filter(e => e.k !== 'w').map(e => e.x))].sort((a, b) => a - b);   // current paths numbered 1, 2, 3 … over the used columns
  return spec(D, els, rows, o, { pathNo: x => used.indexOf(x) + 1 }); };

/* single-phase reversing, forward – stop – reverse */
C7.ONEPH = (o = {}) => C7.ELEC({ ...o, _one: true });

C7.CONTACTS = [
  ['KM1', '13–14', ['ค้างตัวเอง (คร่อม S2)', 'hold (across S2)']], ['KM1', '21–22', ['อินเตอร์ล็อกในทางเดินกระแสของ KM2 (หน้าสัมผัสมิเรอร์)', 'interlock in the KM2 path (mirror contact)']],
  ['KM1', '53–54', ['หลอด H1 เดินหน้า', 'lamp H1 forward']], ['KM1', '61–62', ['หลอด H4 หยุดอยู่ (อนุกรมกับ KM2 61–62)', 'lamp H4 stopped (in series with KM2 61–62)']],
  ['KM2', '13–14', ['ค้างตัวเอง (คร่อม S3)', 'hold (across S3)']], ['KM2', '21–22', ['อินเตอร์ล็อกในทางเดินกระแสของ KM1', 'interlock in the KM1 path']],
  ['KM2', '53–54', ['หลอด H2 ถอยหลัง', 'lamp H2 reverse']], ['KM2', '61–62', ['หลอด H4 หยุดอยู่', 'lamp H4 stopped']],
  ['S2', '13–14 / 21–22', ['เริ่มเดินหน้า / อินเตอร์ล็อกปุ่มกดในทางเดินกระแสของ KM2', 'forward start / push-button interlock in the KM2 path']],
  ['S3', '13–14 / 21–22', ['เริ่มถอยหลัง / อินเตอร์ล็อกปุ่มกดในทางเดินกระแสของ KM1', 'reverse start / push-button interlock in the KM1 path']],
  ['S5', '21–22 / 13–14', ['หยุดเดินหน้าที่ปลายทาง / เริ่มถอยหลังในรอบอัตโนมัติ', 'stops forward at the end / starts reverse in the auto cycle']],
  ['S6', '21–22 / 13–14', ['หยุดถอยหลังที่ปลายทาง / เริ่มเดินหน้าในรอบอัตโนมัติ', 'stops reverse at the end / starts forward in the auto cycle']],
  ['S7, S8', '21–22', ['กันเลยระยะ (เปิดแบบบังคับ)', 'over-travel (direct opening)']],
  ['KA1', '13–14 / 23–24 / 33–34', ['ค้างตัวเอง / กิ่งอัตโนมัติของ KM1 / กิ่งอัตโนมัติของ KM2', 'hold / KM1 auto branch / KM2 auto branch']],
  ['KA2', '13–14 / 21–22', ['ค้างตัวเอง / ล็อกปุ่มเริ่มทั้งสอง', 'hold / locks both starts']],
  ['KT1, KT2', '55–56 / 67–68', ['หน้าสัมผัสหน่วงเวลาปกติปิด / ปกติเปิด', 'timed NC / timed NO']]];
/* ---------------- 2) fault-finding cases and test sequences ---------------- */
const hid = spec => new RL.Sim(document.createElement('div'), spec);
/* see the header for the ops; 'wait' / 'travel' step the simulator (and the carriage) in 0.02 s steps */
C7.runSeq = (sim, seq) => { let ok = true, car = null;
  const adv = t => { let left = t; while (left > 1e-9) { const d = Math.min(0.02, left); sim.step(d); if (car) car.step(d); left -= d; } };
  seq.forEach(([op, ...a]) => {
    if (op === 'carriage') car = new C7.Carriage(null, sim, { pos: a[0], ...(a[1] || {}) });
    else if (op === 'wait' || op === 'travel') adv(a[0]);
    else if (op === 'set') sim.setOn(a[0], a[1]);
    else if (op === 'dir') { if (sim.dir() !== a[0]) ok = false; }
    else if (op === 'q1') { if (!!sim.dev.Q1.on !== a[0]) ok = false; }
    else if (op === 'short') { if ((sim.msg === 'pshort') !== a[0]) ok = false; }
    else if (op === 'blocked') { if (!!sim.dev[a[0]].blocked !== a[1]) ok = false; }
    else if (op === 'chatter') { if (!!sim.dev[a[0]].chatter !== a[1]) ok = false; }
    else if (op === 'crash') { if (!car || !!car.crashed !== a[0]) ok = false; }
    else if (op === 'at') { if (!!sim.dev[a[0]].on !== a[1]) ok = false; }
    else if (op === 'pos') { if (!car || !(a[0] === '<' ? car.pos < a[1] : car.pos > a[1])) ok = false; }
    else if (op === 'revs') { if (!car || !(a[0] === '>=' ? car.revs >= a[1] : car.revs <= a[1])) ok = false; }
    else if (!C6.runSeq(sim, [[op, ...a]])) ok = false; });
  return ok; };
C7.trial = (spec, seq) => C7.runSeq(hid(spec), seq);
C7.faultTrial = c => ({ bad: C7.trial(c.spec(), c.seq), good: C7.trial(c.good(), c.seq) });
const q1off = s => { s.devices.Q1.on = false; return s; };
const P4 = { KM1: [['L', 'U1'], ['N', 'U2'], ['L', 'Z1'], ['N', 'Z2']], KM2: [['L', 'U1'], ['N', 'U2'], ['L', 'Z2'], ['N', 'Z1']] };
C7.FAULTS = [
  { id: 'noInterlock', power: true, carriage: null, title: ['ไม่มีอินเตอร์ล็อก', 'No interlock'],
    spec: () => C7.NONE(), good: () => C7.ELEC(),
    symptom: ['S2 สั่งเดินหน้าได้ แต่ถ้ากด S3 ขณะเดินหน้าอยู่ Q1 ตัดทันทีพร้อมข้อความลัดวงจรในวงจรกำลัง', 'S2 runs the motor forward, but pressing S3 while it runs trips Q1 at once with a short-circuit message for the power circuit'],
    options: [['ไม่มีหน้าสัมผัสปกติปิด KM2 21–22 ในทางเดินกระแสของ KM1 และ KM1 21–22 ในทางเดินกระแสของ KM2 คอนแทกเตอร์ทั้งสองจึงต่อพร้อมกันได้', 'there is no normally closed KM2 21–22 in the KM1 path and no KM1 21–22 in the KM2 path, so both contactors can close together'],
      ['Q1 มีพิกัดกระแสต่ำเกินไป', 'Q1 is rated too low'], ['S3 ต่อขนานกับ S1', 'S3 is wired in parallel with S1'], ['F2 ตั้งกระแสไว้ต่ำเกินไป', 'F2 is set too low']], answer: 0,
    fix: ['ต่อ KM2 21–22 อนุกรมเหนือคอยล์ KM1 และ KM1 21–22 อนุกรมเหนือคอยล์ KM2 (อินเตอร์ล็อกด้วยหน้าสัมผัสช่วย)', 'Put KM2 21–22 in series just above coil KM1 and KM1 21–22 just above coil KM2 (auxiliary-contact interlock)'],
    test: ['กด S2 ให้เดินหน้า แล้วกด S3: Q1 ต้องไม่ตัด และมอเตอร์ยังเดินหน้าต่อ', 'Press S2 (forward), then S3: Q1 must not trip and the motor keeps running forward'],
    seq: [['tap', 'S2'], ['dir', 'cw'], ['tap', 'S3'], ['short', false], ['dir', 'cw']] },
  { id: 'ownNC', power: false, carriage: null, title: ['หน้าสัมผัสปกติปิดของ KM1 เองอยู่ในทางเดินกระแสของ KM1', "KM1's own NC contact in the KM1 path"],
    spec: () => C7.ELEC({ _own: true }), good: () => C7.ELEC(),
    symptom: ['กด S2 ค้างไว้: KM1 สั่นรัว (ดูดแล้วหลุดเร็ว ๆ มีเสียงดัง) มอเตอร์กระตุกแต่ไม่เดิน ปล่อยปุ่มแล้วหยุดนิ่ง', 'Hold S2: KM1 chatters (pulls in and drops out rapidly, buzzing); the motor jerks but never runs, and it stops when S2 is released'],
    options: [['ทางเดินกระแสของ KM1 มีหน้าสัมผัสปกติปิดของ KM1 เอง (71–72) แทน KM2 21–22 เมื่อ KM1 ดูด หน้าสัมผัสนี้ก็เปิดตัดคอยล์ของตัวเอง', "the KM1 path has KM1's own NC (71–72) instead of KM2 21–22: as soon as KM1 pulls in, that contact opens its own coil circuit"],
      ['หน้าสัมผัสค้าง KM1 13–14 เปิดค้าง', 'holding contact KM1 13–14 is stuck open'], ['คอยล์ KM1 ใช้แรงดันผิด', 'coil KM1 has the wrong voltage'], ['F2 ตัดค้างอยู่', 'F2 is tripped']], answer: 0,
    fix: ['เปลี่ยนเป็น KM2 21–22 ซึ่งเป็นหน้าสัมผัสของคอนแทกเตอร์อีกตัว', "Replace it with KM2 21–22, the other contactor's contact"],
    test: ['กด S2 แล้วปล่อย: มอเตอร์ต้องเดินหน้าค้างอยู่', 'Press and release S2: the motor must keep running forward'],
    seq: [['hold', 'S2'], ['chatter', 'KM1', false], ['release', 'S2'], ['dir', 'cw']] },
  { id: 'holdAbove', power: false, carriage: null, title: ['หน้าสัมผัสค้างคร่อมหน้าสัมผัสปกติปิดของปุ่มอีกตัวด้วย', "Holding contact also bridges the other button's NC"],
    spec: () => C7.PB({ holdAbove: true }), good: () => C7.PB(),
    symptom: ['ใช้ปุ่มกดสองหน้าสัมผัสแล้ว แต่ขณะเดินหน้า กด S3 ไม่เกิดอะไรขึ้น ต้องกด S1 ก่อนทุกครั้ง (กลับทางทันทีไม่ได้)', 'Double-contact buttons are fitted, yet while running forward S3 does nothing; S1 must be pressed first every time (no direct reversing)'],
    options: [['KM1 13–14 คร่อมทั้ง S2 13–14 และ S3 21–22 เมื่อค้างแล้ว S3 21–22 จึงตัด KM1 ไม่ได้', 'KM1 13–14 bridges both S2 13–14 and S3 21–22, so once KM1 holds, S3 21–22 cannot drop it'],
      ['ไม่มี KM2 21–22 ในทางเดินกระแสของ KM1', 'there is no KM2 21–22 in the KM1 path'], ['S3 มีหน้าสัมผัสชุดเดียว', 'S3 has only one contact'], ['Q1 ปลดอยู่', 'Q1 is off']], answer: 0,
    fix: ['ย้ายปลายล่างของ KM1 13–14 ขึ้นมาที่จุดระหว่าง S2 13–14 กับ S3 21–22 ให้คร่อมเฉพาะ S2 แล้วทำแบบเดียวกันกับ KM2 13–14', 'Move the lower end of KM1 13–14 up to the point between S2 13–14 and S3 21–22 so that it spans S2 only, and do the same with KM2 13–14'],
    test: ['กด S2 แล้วกด S3: มอเตอร์ต้องกลับเป็นถอยหลังทันที', 'Press S2, then S3: the motor must change to reverse at once'],
    seq: [['tap', 'S2'], ['dir', 'cw'], ['tap', 'S3'], ['dir', 'ccw']] },
  { id: 'swapButtons', power: false, carriage: null, title: ['กลไกของ S2 กับ S3 สลับกัน', 'S2 and S3 linkages swapped'],
    spec: () => C7.PB({ _swapBtn: true, lamps: ['H1', 'H2'] }), good: () => C7.PB({ lamps: ['H1', 'H2'] }),
    symptom: ['กด S2 (FORWARD) แล้วมอเตอร์หมุนถอยหลัง และหลอด H2 (REVERSE) ติด ส่วน S3 กลับสั่งเดินหน้า', 'S2 (FORWARD) makes the motor run in reverse and H2 (REVERSE) lights, while S3 gives forward'],
    options: [['ทางเดินกระแสของ KM1 ใช้ S3 13–14 กับ S2 21–22 และของ KM2 ใช้ S2 13–14 กับ S3 21–22 ปุ่มที่เขียนว่า FORWARD จึงสั่ง KM2', 'the KM1 path uses S3 13–14 with S2 21–22 and the KM2 path S2 13–14 with S3 21–22, so the button marked FORWARD commands KM2'],
      ['KM2 ไม่ได้สลับเฟส', 'KM2 does not swap any phases'], ['L1 กับ L3 สลับกันที่ขั้วเข้า Q1', 'L1 and L3 are swapped at the input of Q1'], ['หลอด H1 กับ H2 สลับกัน', 'lamps H1 and H2 are swapped']], answer: 0,
    fix: ['ต่อสายใหม่ให้ S2 13–14 อยู่ในทางเดินกระแสของ KM1 และ S2 21–22 อยู่ในทางเดินกระแสของ KM2 ส่วน S3 กลับกัน', 'Rewire so that S2 13–14 is in the KM1 path and S2 21–22 in the KM2 path, and S3 the other way round'],
    test: ['กด S2: มอเตอร์ต้องเดินหน้า (ตามเข็มนาฬิกา) และ H1 ติด', 'Press S2: the motor must run forward (clockwise) and H1 must light'],
    seq: [['tap', 'S2'], ['dir', 'cw'], ['lit', 'H1', true]] },
  { id: 'bothNC', power: false, carriage: null, title: ['ในทางเดินกระแสของ KM2 ปุ่มทั้งสองเป็นหน้าสัมผัสปกติปิด', 'Both button contacts in the KM2 path are NC'],
    spec: () => q1off(C7.PB({ _bothNC: true })), good: () => q1off(C7.PB()),
    symptom: ['สับ Q1 แล้วมอเตอร์ถอยหลังทันทีทั้งที่ไม่มีใครกดปุ่ม กด S1 หยุดได้เฉพาะตอนกดค้าง ปล่อยแล้วถอยหลังต่อเอง (อันตราย: เครื่องเริ่มเดินเอง)', 'Switching Q1 on makes the motor run in reverse with nobody pressing anything; S1 stops it only while held, and on release it runs in reverse again by itself (hazard: an unexpected start)'],
    options: [['ทางเดินกระแสของ KM2 ใช้หน้าสัมผัสปกติปิดของ S3 (11–12) แทน S3 13–14 ทางเดินกระแสนี้จึงต่ออยู่ตลอดเมื่อไม่มีใครกดปุ่ม', 'the KM2 path uses an NC contact of S3 (11–12) instead of S3 13–14, so the path is closed whenever nobody presses a button'],
      ['หน้าสัมผัสค้าง KM2 13–14 เชื่อมติด', 'holding contact KM2 13–14 is welded'], ['S1 ต่อขนานกับ S3', 'S1 is in parallel with S3'], ['KM1 21–22 อยู่ในทางเดินกระแสของ KM1', 'KM1 21–22 is in the KM1 path']], answer: 0,
    fix: ['ใช้ S3 13–14 (ปกติเปิด) ในทางเดินกระแสของ KM2 คู่กับ S2 21–22 ตามแบบ', 'Use S3 13–14 (normally open) in the KM2 path together with S2 21–22, as in the correct circuit'],
    test: ['สับ Q1 และลองไฟดับแล้วกลับมา: มอเตอร์ต้องหยุดอยู่จนกว่าจะกดปุ่มเริ่ม', 'Switch Q1 on, and try a power cut: the motor must stay at rest until a start button is pressed'],
    seq: [['toggle', 'Q1'], ['run', false], ['cut'], ['run', false]] },
  { id: 'cyclic', power: true, carriage: null, title: ['ด้านเข้าของ KM2 เลื่อนวนทั้งสามเฟส', 'KM2 supply side shifted round all three phases'],
    spec: () => C7.ELEC({ map: [2, 3, 1] }), good: () => C7.ELEC(),
    symptom: ['S2 และ S3 ต่างสั่งมอเตอร์ได้ แต่หมุนทิศเดียวกัน (ตามเข็มนาฬิกา) ทั้งสองแบบ และไม่มีการลัดวงจร', 'S2 and S3 both start the motor, but it turns the same way (clockwise) for both, and nothing shorts'],
    options: [['KM2 รับ L2 L3 L1 เข้าขั้ว 1 3 5 (เลื่อนวน) ลำดับเฟสที่มอเตอร์จึงเหมือนเดิม ต้องสลับเพียงสองเฟส', 'KM2 takes L2 L3 L1 on poles 1 3 5 (a cyclic shift), so the phase sequence at the motor is unchanged; only two phases may be swapped'],
      ['S2 กับ S3 สลับกัน', 'S2 and S3 are swapped'], ['ไม่มีอินเตอร์ล็อก', 'there is no interlock'], ['F2 ต่อหลังมอเตอร์', 'F2 is connected after the motor']], answer: 0,
    fix: ['ต่อ KM2 ให้สลับเพียงสองเฟส: ขั้ว 1/L1 รับ L3, 3/L2 รับ L2, 5/L3 รับ L1', 'Wire KM2 so that only two phases are swapped: 1/L1 from L3, 3/L2 from L2, 5/L3 from L1'],
    test: ['จากหยุดนิ่ง กด S3: มอเตอร์ต้องหมุนทวนเข็มนาฬิกา', 'From rest, press S3: the motor must turn counter-clockwise'],
    seq: [['tap', 'S3'], ['dir', 'ccw']] },
  { id: 'limitWrong', power: false, carriage: { pos: 0.5 }, title: ['ลิมิตสวิตช์อยู่ผิดทางเดินกระแส', 'Limit switches in the wrong paths'],
    spec: () => C7.LIMITS({ _limWrong: true }), good: () => C7.LIMITS(),
    symptom: ['กด S2: แคร่วิ่งผ่าน S5 ไปชนตัวหยุดปลายราง (S5 ถูกกดแล้วแต่ KM1 ไม่หลุด) ถอยหลังก็ชนปลายอีกด้านเช่นกัน', 'Press S2: the carriage runs past S5 into the end stop (S5 is pressed, yet KM1 stays in); in reverse it crashes at the other end too'],
    options: [['S5 21–22 อยู่ในทางเดินกระแสของ KM2 และ S6 21–22 อยู่ในทางเดินกระแสของ KM1 ลิมิตสวิตช์แต่ละตัวจึงตัดทิศที่ไม่ได้วิ่งเข้าหามัน', 'S5 21–22 is in the KM2 path and S6 21–22 in the KM1 path, so each limit switch breaks the direction that does not run towards it'],
      ['S5 ต่อที่หน้าสัมผัสปกติเปิด', 'S5 is wired on its NO contact'], ['ไม่มีอินเตอร์ล็อก', 'there is no interlock'], ['หน้าสัมผัสค้าง KM1 13–14 คร่อม S5', 'holding contact KM1 13–14 bridges S5']], answer: 0,
    fix: ['ย้าย S5 21–22 ไปอยู่ในทางเดินกระแสของ KM1 (เดินหน้าวิ่งเข้าหา S5) และ S6 21–22 ไปอยู่ในทางเดินกระแสของ KM2', 'Move S5 21–22 into the KM1 path (forward runs towards S5) and S6 21–22 into the KM2 path'],
    test: ['แคร่อยู่กลางราง กด S2: แคร่ต้องหยุดที่ S5 โดยไม่ชนปลายราง', 'With the carriage in the middle, press S2: it must stop at S5 without hitting the end stop'],
    seq: [['carriage', 0.5], ['tap', 'S2'], ['wait', 4], ['crash', false], ['at', 'S5', true], ['dir', 0]] },
  { id: 'mechOnly', power: false, carriage: null, title: ['มีแต่อินเตอร์ล็อกทางกล', 'Mechanical interlock only'],
    spec: () => C7.MECH(), good: () => C7.ELEC({ mech: true }),
    symptom: ['ขณะเดินหน้า กด S3 ค้างไว้: มอเตอร์ยังเดินหน้าและไม่ลัดวงจร แต่คอยล์ KM2 มีไฟ ฮัมเสียงดังและร้อนขึ้นเรื่อย ๆ เพราะกลไกล็อกไว้', 'While running forward, hold S3: the motor keeps running forward and nothing shorts, but coil KM2 is energised, hums loudly and heats up because the lever holds it open'],
    options: [['ไม่มีอินเตอร์ล็อกด้วยหน้าสัมผัสช่วย (KM1 21–22 ในทางเดินกระแสของ KM2) คอยล์ KM2 จึงได้ไฟทั้งที่กลไกล็อกไว้', 'there is no auxiliary-contact interlock (KM1 21–22 in the KM2 path), so coil KM2 gets voltage although the lever holds it open'],
      ['คอยล์ KM2 ลัดวงจร', 'coil KM2 is short-circuited'], ['S3 ติดค้าง', 'S3 is stuck'], ['หน้าสัมผัสหลักของ KM2 เชื่อมติด', 'the KM2 main contacts are welded']], answer: 0,
    fix: ['เพิ่ม KM2 21–22 เหนือคอยล์ KM1 และ KM1 21–22 เหนือคอยล์ KM2 ใช้คู่กับอินเตอร์ล็อกทางกลเสมอ', 'Add KM2 21–22 above coil KM1 and KM1 21–22 above coil KM2, always together with the mechanical interlock'],
    test: ['เดินหน้าแล้วกด S3 ค้าง: คอยล์ KM2 ต้องไม่มีไฟ', 'Run forward, then hold S3: coil KM2 must stay de-energised'],
    seq: [['tap', 'S2'], ['hold', 'S3'], ['on', 'KM2', false], ['blocked', 'KM2', false], ['release', 'S3'], ['dir', 'cw']] },
  { id: 'onephBoth', power: true, carriage: null, oneph: true, title: ['มอเตอร์ 1 เฟส: KM2 สลับทั้งขดรันและขดสตาร์ต', 'Single-phase motor: KM2 swaps both the run and the start winding'],
    spec: () => C7.ONEPH({ poles: { KM1: P4.KM1, KM2: [['L', 'U2'], ['N', 'U1'], ['L', 'Z2'], ['N', 'Z1']] }, fixed: [] }), good: () => C7.ONEPH({ poles: P4, fixed: [] }),
    symptom: ['กด S2 มอเตอร์หมุนตามเข็มนาฬิกา หยุดรอจนนิ่งแล้วกด S3 มอเตอร์ก็ยังหมุนตามเข็มนาฬิกาเหมือนเดิม', 'S2 runs the motor clockwise; stop it, wait until it stands still, press S3: it again turns clockwise'],
    options: [['KM2 กลับขั้วทั้งขดรัน U1–U2 และขดสตาร์ต Z1–Z2 ทิศของสนามจึงเหมือนเดิม ต้องกลับขั้วเพียงขดเดียว', 'KM2 reverses both the run winding U1–U2 and the start winding Z1–Z2, so the field turns the same way; only one winding may be reversed'],
      ['สวิตช์แรงเหวี่ยงค้างเปิด', 'the centrifugal switch is stuck open'], ['ตัวเก็บประจุสตาร์ตขาด', 'the start capacitor is open'], ['ไม่มีอินเตอร์ล็อก', 'there is no interlock']], answer: 0,
    fix: ['ให้ KM2 กลับขั้วเฉพาะขดสตาร์ต (L → Z2, N → Z1) ส่วนขดรันต่อ L → U1, N → U2 เหมือน KM1', 'Let KM2 reverse only the start winding (L → Z2, N → Z1) and connect the run winding L → U1, N → U2 as KM1 does'],
    test: ['จากหยุดนิ่ง กด S3 แล้วรอ 3 วินาที: มอเตอร์ต้องหมุนทวนเข็มนาฬิกา', 'From rest, press S3 and wait 3 s: the motor must turn counter-clockwise'],
    seq: [['tap', 'S3'], ['wait', 3], ['dir', 'ccw']] }];

/* ---------------- 3) status and control buttons ---------------- */
C7.state = sim => { const d = sim.dev, dir = sim.dir(), ka = d.KA1 && d.KA1.energized, w = sim.w || 0, R = sim.revInfo ? sim.revInfo() : null;
  const auto = ka ? T(' · รอบอัตโนมัติทำงาน (KA1)', ' · auto cycle on (KA1)') : '';
  if (sim.mains === false) return [T('ไฟดับ', 'power off'), T('รอไฟกลับมา…', 'waiting for the power…'), 'bad'];
  if (sim.msg === 'pshort') return [T('ลัดวงจร', 'short circuit'), T(`${R.fwd} และ ${R.rev} ต่อพร้อมกัน ${(sim.pshort || []).map(p => p.join(' กับ ')).join(', ')} ลัดถึงกัน Q1 ตัด คลิกที่ Q1 เพื่อสับกลับ`, `${R.fwd} and ${R.rev} closed together and joined ${(sim.pshort || []).map(p => p.join('–')).join(', ')}; Q1 tripped: click Q1 to switch it on again`), 'bad'];
  if (d.Q1 && !d.Q1.on) return [T('Q1 ปลด', 'Q1 off'), sim.spec.supply ? T('ไม่มีไฟทั้งวงจรกำลังและวงจรควบคุม', 'no supply to the power or the control circuit') : T('มอเตอร์ไม่มีไฟ แต่วงจรควบคุมป้อนก่อน Q1 จึงยังมีไฟ', 'the motor has no supply, but the control circuit is fed ahead of Q1 and is still live'), 'warn'];
  if (d.F1 && d.F1.blown) return [T('F1 ขาด', 'F1 blown'), T('วงจรควบคุมไม่มีไฟ คลิกที่ F1 เพื่อเปลี่ยนฟิวส์', 'the control circuit is dead; click F1 to replace it'), 'bad'];
  if (d.F2 && d.F2.tripped) return [T('F2 ตัด', 'F2 tripped'), dir ? T('มอเตอร์ยังหมุน: ไม่มี 95–96 ในวงจรควบคุม', 'the motor still runs: no 95–96 in the control circuit') : T('มอเตอร์หยุด คลิก F2 เพื่อรีเซ็ต แล้วจึงสั่งเดินใหม่', 'the motor has stopped; click F2 to reset it, then start again'), dir ? 'warn' : 'bad'];
  const bl = Object.keys(d).filter(id => d[id].blocked);
  if (bl.length) return [T('คอยล์ถูกล็อก', 'coil blocked'), T(`${bl.join(', ')} มีไฟที่คอยล์แต่อินเตอร์ล็อกทางกลไม่ให้ดูด หน้าสัมผัสไม่เปลี่ยน คอยล์กินกระแสสูงและร้อนขึ้นเรื่อย ๆ (${ED.fd(d[bl[0]].blockT || 0, 1)} s)`, `${bl.join(', ')} has voltage on its coil but the mechanical interlock holds it open: its contacts stay put, the coil draws a high current and heats up (${ED.fd(d[bl[0]].blockT || 0, 1)} s)`), 'bad'];
  const ch = Object.keys(d).filter(id => d[id].chatter);
  if (ch.length > 1) return [T('แข่งกัน', 'race'), T(`${ch.join(' และ ')} ได้ไฟพร้อมกัน: หน้าสัมผัส 21–22 ของแต่ละตัวตัดทางของอีกตัว ในภาพจำลองจึงไม่มีตัวใดค้างอยู่ได้ตราบที่ยังกดปุ่มอยู่ (ในตู้จริงตัวที่ดูดเร็วกว่ามักชนะ)`, `${ch.join(' and ')} got voltage at the same instant: each one's 21–22 opens the other's path, so in the simulator neither can stay in while the buttons are held (in a real panel the faster one usually wins)`), 'warn'];   // two coils at once: the race of the electrical interlock alone
  if (ch.length) return [T('คอยล์สั่นรัว', 'coil chattering'), T(`${ch.join(', ')} ดูดแล้วตัดไฟตัวเองทันที จึงดูด-หลุดสลับกันเร็ว ๆ (ไม่มีสถานะที่นิ่ง)`, `${ch.join(', ')} switches its own supply off as soon as it pulls in, so it pulls in and drops out rapidly (no stable state)`), 'bad'];
  if (d.KA2 && d.KA2.energized) { const k = d.KT1, left = k ? Math.max(0, k.T - k.tOn) : 0;
    return [T('ล็อกหลังหยุด', 'stop lock'), T(`KA2 ล็อกปุ่มเริ่มทั้งสองไว้อีก ${ED.fd(left, 1)} s ให้มอเตอร์หมุนช้าลงก่อน`, `KA2 locks both start buttons for ${ED.fd(left, 1)} s more while the motor runs down`), 'warn']; }
  if (dir) { const cw = dir === 'cw', kin = R ? [R.fwd, R.rev].filter(id => sim.act(id)).join(' + ') : '', one = !!(R && R.one), sp = one ? ` · n ${Math.round(Math.abs(w) * 20) * 5} %` : '';
    const odd = !!(R && kin && kin !== (cw ? R.fwd : R.rev)), dv = one && sim.drive1 ? sim.drive1() : 0, slow = odd && one && dv !== 0 && (dv > 0 ? 'cw' : 'ccw') !== dir;   // KM2 in but clockwise (or KM1 in but counter-clockwise)
    const pill = cw ? T('เดินหน้า', 'forward') : T('ถอยหลัง', 'reverse'), way = cw ? T('ตามเข็มนาฬิกา', 'clockwise') : T('ทวนเข็มนาฬิกา', 'counter-clockwise');
    if (slow) return [pill, T(`${kin} ดูด แต่มอเตอร์ยังหมุน${way}: ที่ความเร็วสูงสวิตช์แรงเหวี่ยงเปิดอยู่ ขดสตาร์ตที่กลับขั้วจึงไม่มีผล`, `${kin} is in, but the motor keeps turning ${way}: at speed the centrifugal switch is open, so the reversed start winding has no effect`) + sp + auto, 'warn'];
    return [pill, T(`มอเตอร์หมุน${way}${kin ? ` (${kin} ดูด)` : ''}`, `the motor turns ${way}${kin ? ` (${kin} in)` : ''}`) + sp + auto, odd ? 'warn' : 'good']; }
  if (Math.abs(w) > 0.02) return [T('หยุดสั่ง แต่ยังหมุนค้าง', 'stopped, still coasting'), T(`ความเร็ว ${Math.round(Math.abs(w) * 20) * 5} % รอให้หยุดนิ่งก่อนกลับทาง`, `speed ${Math.round(Math.abs(w) * 20) * 5} %: wait for standstill before reversing`), 'warn'];
  const at = id => !!(d[id] && d[id].on);   // limit and over-travel switches operated (the carriage presses them)
  if (at('S7') || at('S8')) return [T('เลยระยะ', 'over-travel'), at('S7') ? T('S7 เปิดแล้ว: แคร่วิ่งเลย S5 ไป ใช้ S3 ถอยกลับ แล้วตรวจ S5', 'S7 has opened: the carriage ran past S5; drive it back with S3 and check S5') :
    T('S8 เปิดแล้ว: แคร่วิ่งเลย S6 ไป ใช้ S2 เดินหน้ากลับ แล้วตรวจ S6', 'S8 has opened: the carriage ran past S6; drive it back with S2 and check S6'), 'bad'];
  const lim = at('S5') && at('S6') ? T('S5 และ S6 ถูกกดพร้อมกัน: ทั้งสองทิศถูกตัด', 'S5 and S6 both operated: both directions are blocked') : at('S5') ? T('แคร่อยู่ที่ S5 (ปลายทางเดินหน้า): เดินหน้าต่อไม่ได้', 'carriage at S5 (forward end): forward is blocked') :
    at('S6') ? T('แคร่อยู่ที่ S6 (ปลายทางถอยหลัง): ถอยหลังต่อไม่ได้', 'carriage at S6 (reverse end): reverse is blocked') : '';
  return [T('หยุด', 'stopped'), [ka ? T('รอบอัตโนมัติทำงาน (KA1) รอคำสั่งทิศทางหรือลิมิตสวิตช์', 'auto cycle on (KA1): waiting for a direction command or a limit switch') : '', lim].filter(Boolean).join(' · '), 'wait']; };
C7.panel = (el, sim, o = {}) => C5.panel(el, sim, { status: C7.state, ...o });

/* ---------------- 4) rotating field and the permutation table ---------------- */
/* perm = the supply phase (1 = L1, 2 = L2, 3 = L3) on U1, V1, W1. Even permutations (in order, or a cyclic shift of all three) keep the
   phase sequence and the direction; odd ones (two conductors swapped) reverse it (IEC 60034-8 6.7.1: U1-V1-W1 in the supply phase order
   = clockwise seen from the drive end). */
C7.PERMS = [[1, 2, 3], [2, 3, 1], [3, 1, 2], [1, 3, 2], [3, 2, 1], [2, 1, 3]];
C7.permDir = p => { let n = 0; for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) if (p[i] > p[j]) n++; return n % 2 ? 'ccw' : 'cw'; };
C7.permKind = p => { if (p.every((v, i) => v === i + 1)) return { kind: 'start', pair: null, label: ['ตามลำดับ (เริ่มต้น)', 'in order (as supplied)'] };
  if (C7.permDir(p) === 'cw') return { kind: 'cyclic', pair: null, label: ['เลื่อนวนทั้งสามเส้น', 'all three shifted round'] };
  const k = p.findIndex((v, i) => v === i + 1), pr = [1, 2, 3].filter(v => v !== k + 1).map(v => `L${v}`);
  return { kind: 'swap', pair: pr, label: [`สลับสองเส้น (${pr[0]} ↔ ${pr[1]})`, `two swapped (${pr[0]} ↔ ${pr[1]})`] }; };
const PH = p => `<b style="color:${C7.COL['L' + p]}">L${p}</b>`;
/* new C7.Field(el, { perm [1, 2, 3], table true (the 6-row table, click a row to choose it), speed 0.35 (field turns per second as
   shown: slowed down from 50 Hz), max (px), onChange(perm, dir) }); set(perm), step(dt), dir ('cw' | 'ccw'), perm */
C7.Field = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.perm = (o.perm || [1, 2, 3]).slice(); this.th = 0; this.ra = -Math.PI / 2; this.rw = 0; this.f = o.speed ?? 0.35;
    el.innerHTML = '<div class="c7field"><div class="c7f-pic"></div><div class="c7f-tab"></div></div>'; this.pic = el.querySelector('.c7f-pic'); this.tab = el.querySelector('.c7f-tab');
    if (o.table === false) this.tab.remove(); else this.table(); this.draw(); }
  get dir() { return C7.permDir(this.perm); }
  set(perm) { this.perm = perm.slice(); if (this.o.table !== false) this.table(); this.draw(); if (this.o.onChange) this.o.onChange(this.perm, this.dir); }
  /* winding currents (per unit) and the resultant field: angle in screen radians (clockwise positive), magnitude 1.5 */
  field() { const ax = k => (-90 + 120 * k) * Math.PI / 180, ik = this.perm.map(p => Math.cos(this.th - (p - 1) * 2 * Math.PI / 3));
    let bx = 0, by = 0; ik.forEach((v, k) => { bx += v * Math.cos(ax(k)); by += v * Math.sin(ax(k)); }); return { ik, ax, bx, by, ang: Math.atan2(by, bx) }; }
  step(dt) { if (!(dt > 0)) { this.draw(); return; } this.th += 2 * Math.PI * this.f * dt;
    const wf = (this.dir === 'cw' ? 1 : -1) * 2 * Math.PI * this.f; this.rw += (0.96 * wf - this.rw) * Math.min(1, dt / 0.6); this.ra += this.rw * dt; this.draw(); }
  draw() { const cx = 180, cy = 172, F = f1, fd = this.field(), cw = this.dir === 'cw', sc = 58; let s = '';
    s += `<circle cx="${cx}" cy="${cy}" r="118" fill="var(--panel2)" stroke="var(--ink)"/><circle cx="${cx}" cy="${cy}" r="92" fill="var(--panel)" stroke="var(--ink)"/>`;
    const lab = ['U', 'V', 'W'];
    this.perm.forEach((p, k) => { const a = fd.ax(k), ca = Math.cos(a), sa = Math.sin(a), col = C7.COL['L' + p];
      // the winding on its axis (one coil side drawn in the stator ring) and its terminal label outside
      s += `<g transform="rotate(${F(a * 180 / Math.PI + 90)} ${cx} ${cy})"><rect x="${cx - 14}" y="${cy - 116}" width="28" height="20" rx="4" fill="${col}" fill-opacity=".25" stroke="${col}" stroke-width="2"/></g>`;
      s += IE.T(`${lab[k]}1 ← L${p}`, F(cx + 150 * ca), F(cy + 150 * sa + (sa < -0.5 ? -2 : 12)), { size: 11.5, anchor: 'middle', weight: 700, col });
      // the winding's own magnetomotive force along its axis (sign of its current)
      const v = fd.ik[k] * sc; if (Math.abs(v) > 3) s += `<path d="M ${cx} ${cy} L ${F(cx + v * ca)} ${F(cy + v * sa)}" stroke="${col}" stroke-width="2" fill="none" stroke-dasharray="4 3"/>`; });
    // rotor (two-pole magnet) following the field
    const rc = Math.cos(this.ra), rs = Math.sin(this.ra);
    s += `<circle cx="${cx}" cy="${cy}" r="34" fill="var(--panel2)" stroke="var(--muted)"/><path d="M ${F(cx - 30 * rc)} ${F(cy - 30 * rs)} L ${F(cx + 30 * rc)} ${F(cy + 30 * rs)}" stroke="var(--muted)" stroke-width="10" stroke-linecap="round"/>` +
      IE.T('N', F(cx + 22 * rc), F(cy + 22 * rs + 4), { size: 10, anchor: 'middle', weight: 700, col: 'var(--panel)' });
    // resultant field (thick arrow)
    const L = Math.hypot(fd.bx, fd.by) * sc, ux = Math.cos(fd.ang), uy = Math.sin(fd.ang), tx = cx + L * ux, ty = cy + L * uy;
    s += `<path d="M ${cx} ${cy} L ${F(tx)} ${F(ty)}" stroke="var(--accent)" stroke-width="4" fill="none"/><path d="M ${F(tx + 10 * ux)} ${F(ty + 10 * uy)} L ${F(tx - 4 * uy)} ${F(ty + 4 * ux)} L ${F(tx + 4 * uy)} ${F(ty - 4 * ux)} Z" fill="var(--accent)" stroke="none"/>`;
    // direction: an arc arrow outside the stator, and the word
    const R = 126, a0 = cw ? -150 : -30, a1 = cw ? -30 : -150, P = a => [cx + R * Math.cos(a * Math.PI / 180), cy + R * Math.sin(a * Math.PI / 180)], [x0, y0] = P(a0), [x1, y1] = P(a1), at = a1 * Math.PI / 180, d = cw ? 1 : -1, hx = -Math.sin(at) * d, hy = Math.cos(at) * d;
    s += `<path d="M ${F(x0)} ${F(y0)} A ${R} ${R} 0 0 ${cw ? 1 : 0} ${F(x1)} ${F(y1)}" stroke="var(--good)" stroke-width="2.6" fill="none"/><path d="M ${F(x1 - 8 * hx + 5 * hy)} ${F(y1 - 8 * hy - 5 * hx)} L ${F(x1)} ${F(y1)} L ${F(x1 - 8 * hx - 5 * hy)} ${F(y1 - 8 * hy + 5 * hx)}" stroke="var(--good)" stroke-width="2.6" fill="none"/>`;
    s += IE.T(cw ? T('ตามเข็มนาฬิกา', 'clockwise') : T('ทวนเข็มนาฬิกา', 'counter-clockwise'), cx, 344, { size: 13, anchor: 'middle', weight: 700, col: 'var(--good)' }) +
      IE.T(T('มองจากด้านปลายเพลา (ด้านขับ)', 'seen from the shaft (drive) end'), cx, 360, { size: 9.5, anchor: 'middle', col: 'var(--muted)' });
    this.pic.innerHTML = IE.svg(360, 368, s, { max: this.o.max || 380, label: 'rotating magnetic field of three windings' }); }
  table() { const h = ['', 'U1', 'V1', 'W1', T('การต่อ', 'connection'), T('ทิศหมุน', 'rotation')];
    let s = `<table class="tbl c7perm"><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr>`;
    C7.PERMS.forEach((p, i) => { const on = p.join('') === this.perm.join(''), kd = C7.permKind(p), cw = C7.permDir(p) === 'cw';
      s += `<tr class="${on ? 'on' : ''}" data-p="${p.join('')}" tabindex="0"><td data-h="#">${i + 1}</td>${p.map((v, k) => `<td data-h="${['U1', 'V1', 'W1'][k]}">${PH(v)}</td>`).join('')}<td data-h="${T('การต่อ', 'connection')}">${tt(kd.label)}</td><td data-h="${T('ทิศหมุน', 'rotation')}"><span class="pill ${cw ? 'good' : 'warn'}">${cw ? T('ตามเข็ม ↻', 'clockwise ↻') : T('ทวนเข็ม ↺', 'counter-clockwise ↺')}</span></td></tr>`; });
    this.tab.innerHTML = s + '</table>';
    this.tab.querySelectorAll('tr[data-p]').forEach(r => { const go = () => this.set(r.dataset.p.split('').map(Number)); r.addEventListener('click', go); r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); }); }
};

/* ---------------- 5) stop – wait – reverse against reversing at speed (plugging) ---------------- */
/* per-unit model as C5.startRun: τ dω/dt = T_motor − T_load, τ = 0.12 s × (1 + J), field direction d = +1 / −1 / 0, slip s = 1 − ω/d
   (s ≈ 2 at the moment of plugging), torque d·T(s) and current I(s) from ED.motor, load torque TL as friction (always against the
   motion; at least 3 % for bearings and fan, so that a coast-down ends). Rotor heat = ∫ s·|T| dt, given as a multiple of the kinetic energy ½τ at synchronous speed (a start from rest ≈ 1×, a
   plugging reversal ≈ 4×). p: { mode 'plug'|'stop', J 5, TL 0.15, wait 0.5 (s at standstill before reverse), t0 0.4 (s of forward
   running before the command) } → { pts [[t, ω, I, T]], t0, tS (standstill, 'stop' only), tRev (command → 95 % of reverse speed), iPeak,
   sMax, heat (× kinetic energy), i0 (starting current at standstill), span, p } */
C7.plugRun = (p = {}) => { const mode = p.mode === 'stop' ? 'stop' : 'plug', J = p.J ?? 5, TL = Math.max(0.03, p.TL ?? 0.15), wt = p.wait ?? 0.5, t0 = p.t0 ?? 0.4, tau = C5.START.tauM * (1 + J);
  const w0 = 1 - (ED.motor.slipFor(TL) || 0.05), dt = 0.0005, pts = []; let w = w0, t = 0, d = 1, tS = null, tRev = null, iPeak = 0, sMax = 0, Q = 0, end = null;
  while (t < 120) {
    if (t >= t0 && d === 1) d = mode === 'plug' ? -1 : 0;
    if (mode === 'stop' && d === 0) { if (tS === null && Math.abs(w) < 1e-3) { tS = t; w = 0; } if (tS !== null && t >= tS + wt) d = -1; }
    const s = d ? 1 - w / d : 0, m = d ? ED.motor(s) : { i: 0, T: 0 }, Te = d * m.T;
    let acc; if (Math.abs(w) > 1e-4) acc = Te - TL * Math.sign(w); else acc = Math.abs(Te) > TL ? Te - TL * Math.sign(Te) : -w / dt * tau;   // at rest friction holds the shaft
    if (t >= t0) { if (m.i > iPeak) iPeak = m.i; if (d && s > sMax) sMax = s; if (d) Q += s * Math.abs(Te) * dt; }
    if (pts.length === 0 || t - pts[pts.length - 1][0] >= 0.004) pts.push([+t.toFixed(4), w, m.i, Te]);
    w += acc / tau * dt; t += dt;
    if (d === -1 && tRev === null && w <= -0.95 * w0) tRev = t - t0;
    if (tRev !== null && end === null) end = t + 0.35; if (end !== null && t >= end) break; }
  return { p: { mode, J, TL, wait: wt, t0 }, pts, t0, tS, tRev, iPeak, sMax, heat: Q / (0.5 * tau), i0: ED.motor(1).i, span: t, tau, w0 }; };
/* the chart: speed (−100 … 100 %) on top, current (× rated) below, for one or both runs on one time axis; o: { until, show 'both'|'plug'|'stop', max } */
C7.plugSVG = (runs, o = {}) => { const show = o.show || 'both', list = ['stop', 'plug'].filter(k => runs[k] && (show === 'both' || show === k)), span = Math.max(...list.map(k => runs[k].span)), until = o.until ?? span;
  const x0 = 56, x1 = 524, X = t => x0 + (x1 - x0) * t / span, Ya = v => 104 - 76 * v, Yb = v => 340 - 110 * Math.min(v, 9) / 9, COLR = { stop: 'var(--c7-stop, #2f6fd6)', plug: 'var(--c7-plug, #c0392b)' };
  let s = IE.T(T('ความเร็ว (% ของความเร็วซิงโครนัส)', 'speed (% of synchronous speed)'), x0, 18, { size: 10, weight: 700 }) + IE.T(T('กระแส (เท่าของกระแสพิกัด)', 'current (× rated current)'), x0, 210, { size: 10, weight: 700 });
  [-1, -0.5, 0, 0.5, 1].forEach(v => { s += IE.L(x0, Ya(v), x1, Ya(v), { col: 'var(--line)', dash: v ? '1 3' : '' }) + IE.T(`${Math.round(v * 100)}`, x0 - 4, Ya(v) + 3, { size: 9, anchor: 'end', col: 'var(--muted)' }); });
  [0, 3, 6, 9].forEach(v => { s += IE.L(x0, Yb(v), x1, Yb(v), { col: 'var(--line)', dash: v ? '1 3' : '' }) + IE.T(`${v}×`, x0 - 4, Yb(v) + 3, { size: 9, anchor: 'end', col: 'var(--muted)' }); });
  const i0 = runs[list[0]] ? runs[list[0]].i0 : 6.5; s += IE.L(x0, Yb(i0), x1, Yb(i0), { col: 'var(--muted)', dash: '6 3' }) + IE.T(T(`กระแสเริ่มเดินจากหยุดนิ่ง ${ED.fd(i0, 1)}×`, `starting current from rest ${ED.fd(i0, 1)}×`), x1, Yb(i0) - 4, { size: 9, anchor: 'end', col: 'var(--muted)' });
  const nt = span > 20 ? 5 : span > 8 ? 2 : span > 3 ? 1 : 0.5; for (let t = 0; t <= span + 1e-9; t += nt) s += IE.L(X(t), 26, X(t), 340, { col: 'var(--line)', dash: '1 4' }) + IE.T(ED.fd(t, nt < 1 ? 1 : 0), X(t), 354, { size: 9, anchor: 'middle', col: 'var(--muted)' });
  s += IE.T(T('เวลา (วินาที)', 'time (s)'), x1, 368, { size: 9, anchor: 'end', col: 'var(--muted)' });
  list.forEach(k => { const r = runs[k], P = r.pts.filter(q => q[0] <= until); if (P.length < 2) return; const dash = k === 'stop' ? ' stroke-dasharray="7 4"' : '';
    s += `<polyline points="${P.map(q => `${f1(X(q[0]))},${f1(Ya(q[1]))}`).join(' ')}" fill="none" stroke="${COLR[k]}" stroke-width="2.4"${dash}/>` +
      `<polyline points="${P.map(q => `${f1(X(q[0]))},${f1(Yb(q[2]))}`).join(' ')}" fill="none" stroke="${COLR[k]}" stroke-width="2.4"${dash}/>`; });
  const t0 = runs[list[0]] ? runs[list[0]].t0 : 0.4; s += IE.L(X(t0), 26, X(t0), 186, { col: 'var(--accent)', w: 1.4, dash: '4 3' }) + IE.L(X(t0), 216, X(t0), 340, { col: 'var(--accent)', w: 1.4, dash: '4 3' }) +
    IE.T(T('▲ สั่ง', '▲ command'), X(t0) - 4, 366, { size: 9, weight: 700, col: 'var(--accent)' });
  if (o.until !== undefined && o.until < span) s += IE.L(X(until), 24, X(until), 342, { col: 'var(--accent)', w: 2 });
  const leg = [['stop', T('หยุด รอนิ่ง แล้วถอยหลัง', 'stop, wait, then reverse')], ['plug', T('กลับทางขณะหมุนอยู่ (plugging)', 'reverse at speed (plugging)')]].filter(l => list.includes(l[0]));
  leg.forEach(([k, l], i) => { const lx = x0 + 6 + i * 236; s += `<path d="M ${lx} 386 L ${lx + 22} 386" stroke="${COLR[k]}" stroke-width="2.4"${k === 'stop' ? ' stroke-dasharray="7 4"' : ''}/>` + IE.T(l, lx + 28, 390, { size: 9.5 }); });
  return IE.svg(540, 398, s, { max: o.max || 680, label: 'speed and current when reversing' }); };
/* new C7.Plug(el, { panel (element for the controls), p: { J, TL, wait }, show 'both', onResult(runs) }); step(dt) plays both runs
   (slowed down so that the longer one takes about 4 s); results() → the rows of the table under the chart */
C7.Plug = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.p = { J: 5, TL: 0.15, wait: 0.5, ...(o.p || {}) }; this.show = o.show || 'both'; this.play = null;
    el.innerHTML = '<div class="c7plug"><div class="c7p-ch"></div><div class="c7p-res"></div></div>'; this.ch = el.querySelector('.c7p-ch'); this.res = el.querySelector('.c7p-res');
    this.run(); if (o.panel) this.controls(o.panel); this.draw(); }
  run() { this.runs = { stop: C7.plugRun({ ...this.p, mode: 'stop' }), plug: C7.plugRun({ ...this.p, mode: 'plug' }) }; if (this.o.onResult) this.o.onResult(this.runs); }
  set(p) { Object.assign(this.p, p); this.run(); this.play = null; this.draw(); }
  setShow(v) { this.show = v; this.draw(); }
  start() { this.play = 0; this.draw(); }
  controls(pn) { const ui = MC.ui, id = this.o.id || 'c7p';
    ui.radio(pn, [{ id: 'both', label: T('ทั้งสองแบบ', 'both'), on: this.show === 'both' }, { id: 'stop', label: T('หยุด รอ แล้วถอยหลัง', 'stop, wait, reverse'), on: this.show === 'stop' }, { id: 'plug', label: T('กลับทางขณะหมุน', 'reverse at speed'), on: this.show === 'plug' }], k => this.setShow(k));
    ui.slider(pn, { id: id + 'J', label: T('ความเฉื่อยของโหลด (เท่าของโรเตอร์)', 'load inertia (× rotor inertia)'), min: 0, max: 20, step: 1, value: this.p.J, dec: 0, fmt: v => `${v} ×`, oninput: v => this.set({ J: v }) });
    ui.slider(pn, { id: id + 'T', label: T('แรงเสียดทานของโหลด', 'load friction torque'), min: 5, max: 60, step: 5, value: Math.round(this.p.TL * 100), dec: 0, unit: '%', oninput: v => this.set({ TL: v / 100 }) });
    ui.buttons(pn, [{ label: T('▶ เล่นภาพ', '▶ Play'), cls: 'on', onclick: () => this.start() }]); }
  step(dt) { if (this.play === null) return; const span = Math.max(this.runs.stop.span, this.runs.plug.span); this.play += dt * span / 4; if (this.play >= span) this.play = null; this.draw(); }
  results() { return ['stop', 'plug'].map(k => { const r = this.runs[k]; return { mode: k, iPeak: r.iPeak, sMax: r.sMax, tRev: r.tRev, tS: r.tS, heat: r.heat }; }); }
  draw() { this.ch.innerHTML = C7.plugSVG(this.runs, { show: this.show, until: this.play === null ? undefined : this.play });
    const row = r => `<tr><td data-h="${T('วิธี', 'method')}">${r.mode === 'stop' ? T('หยุด รอนิ่ง แล้วถอยหลัง', 'stop, wait, reverse') : T('กลับทางขณะหมุน', 'reverse at speed')}</td><td data-h="${T('สลิปสูงสุด', 'largest slip')}">${ED.fd(r.sMax, 2)}</td>` +
      `<td data-h="${T('กระแสสูงสุด', 'peak current')}">${ED.fd(r.iPeak, 1)} ×</td><td data-h="${T('สั่งจนถึงความเร็วถอยหลัง 95 %', 'command to 95 % reverse speed')}">${r.tRev === null ? '–' : `${ED.fd(r.tRev, 2)} s`}</td><td data-h="${T('ความร้อนในโรเตอร์', 'rotor heat')}">${ED.fd(r.heat, 1)} × ${T('พลังงานจลน์', 'kinetic energy')}</td></tr>`;
    this.res.innerHTML = `<table class="tbl stack c7pt"><thead><tr><th>${T('วิธี', 'method')}</th><th>${T('สลิปสูงสุด', 'largest slip')}</th><th>${T('กระแสสูงสุด', 'peak current')}</th><th>${T('สั่งจนถึงความเร็วถอยหลัง 95 %', 'command to 95 % reverse speed')}</th><th>${T('ความร้อนในโรเตอร์', 'rotor heat')}</th></tr></thead><tbody>${this.results().map(row).join('')}</tbody></table>` +
      `<div class="hint">${T('ค่าตัวอย่างจากแบบจำลองมอเตอร์กรงกระรอก 4 ขั้ว (กระแสเริ่มเดิน 6.5 เท่า) ความเฉื่อยและแรงเสียดทานของโหลดตามที่ตั้ง', 'Example values from a four-pole cage-motor model (starting current 6.5 × rated) with the load inertia and friction set above')}</div>`; }
};

/* ---------------- 6) carriage between two limit switches ---------------- */
/* new C7.Carriage(el | null, sim, o): the carriage (table) runs on a track, position pos 0 … 1 (left end stop … right end stop), forward
   (sim.dir() 'cw') to the right towards S5, reverse to the left towards S6. Its dog presses a switch while it is at or beyond it:
   S6 at 0.12 and S8 at 0.06 (pressed while pos ≤ that), S5 at 0.88 and S7 at 0.94 (pressed while pos ≥ that); only switches that exist in
   the sim are driven (sim.setOn). Velocity follows the drive with a time constant (o.tau 0.12 s), so it overruns a little and a
   reversal at an end passes through zero. Reaching an end stop while moving = crash (sticky until reset). o: { pos 0.5, speed 0.25
   (track lengths per second), tau, lims { S5: 0.88, … }, broken: ['S5'] (a switch the dog no longer operates), auto true (false: the
   page sets the switches), drive: sim => 'cw'|'ccw'|0 (default sim.dir()), drag true (move the carriage by hand while the motor is
   stopped: drag it with the mouse, or tap / click a point on the track), max (px), onEvent({ kind: 'crash'|'reverse'|'over', side, t }) }. Methods: step(dt), reset(pos), place(pos), state() →
   { pos, v, dir, crashed ('fwd'|'rev'|false), over (past an over-travel switch), revs (reversals counted), t }, draw(). */
C7.Carriage = class {
  constructor(el, sim, o = {}) { this.el = el; this.sim = sim; this.o = o; this.speed = o.speed ?? 0.25; this.tau = o.tau ?? 0.12;
    this.lim = Object.assign({ S6: 0.12, S8: 0.06, S5: 0.88, S7: 0.94 }, o.lims || {}); this.side = { S6: -1, S8: -1, S5: 1, S7: 1, ...(o.sides || {}) };
    this.broken = new Set(o.broken || []); this.auto = o.auto !== false; this.last = '';
    if (el) { el.innerHTML = '<div class="c7car"><div class="c7car-sv"></div><div class="c7car-note"></div></div>'; this.box = el.querySelector('.c7car-sv'); this.note = el.querySelector('.c7car-note'); if (o.drag !== false) this.dragInit(); }
    this.reset(o.pos ?? 0.5); }
  reset(pos = this.o.pos ?? 0.5) { this.pos = Math.max(0, Math.min(1, pos)); this.v = 0; this.crashed = false; this.over = false; this.revs = 0; this.lastSg = 0; this.t = 0; this.press(); this.draw(); }
  /* put the carriage somewhere by hand (the motor should be stopped) */
  place(pos) { this.pos = Math.max(0, Math.min(1, pos)); this.v = 0; this.press(); this.draw(); }
  ids() { return Object.keys(this.lim).filter(id => this.sim.dev[id]); }
  pressed(id) { return !this.broken.has(id) && (this.side[id] > 0 ? this.pos >= this.lim[id] - 1e-9 : this.pos <= this.lim[id] + 1e-9); }
  press() { if (!this.auto) return; this.ids().forEach(id => { const v = this.pressed(id); if (!!this.sim.dev[id].on !== v) this.sim.setOn(id, v); }); }
  drive() { return this.o.drive ? this.o.drive(this.sim) : this.sim.dir(); }
  ev(kind, side) { if (this.o.onEvent) this.o.onEvent({ kind, side, t: this.t }); }
  step(dt) { if (!(dt > 0)) { this.draw(); return; } const d = this.drive(), vt = d === 'cw' ? this.speed : d === 'ccw' ? -this.speed : 0;
    this.v += (vt - this.v) * Math.min(1, dt / this.tau); let p = this.pos + this.v * dt;
    if (p >= 1) { p = 1; if (this.v > 1e-3 && this.crashed !== 'fwd') { this.crashed = 'fwd'; this.ev('crash', 'fwd'); } this.v = Math.min(0, this.v); }
    if (p <= 0) { p = 0; if (this.v < -1e-3 && this.crashed !== 'rev') { this.crashed = 'rev'; this.ev('crash', 'rev'); } this.v = Math.max(0, this.v); }
    this.pos = p; const sg = this.v > 0.02 ? 1 : this.v < -0.02 ? -1 : 0; if (sg && this.lastSg && sg !== this.lastSg) { this.revs++; this.ev('reverse', sg > 0 ? 'fwd' : 'rev'); } if (sg) this.lastSg = sg;
    const ov = ('S7' in this.lim && this.sim.dev.S7 ? p > this.lim.S7 + 0.004 : p > 0.97) || ('S8' in this.lim && this.sim.dev.S8 ? p < this.lim.S8 - 0.004 : p < 0.03);
    if (ov && !this.over) this.ev('over', p > 0.5 ? 'fwd' : 'rev'); this.over = ov; this.t += dt; this.press(); this.draw(); }
  state() { return { pos: this.pos, v: this.v, dir: this.drive(), crashed: this.crashed, over: this.over, revs: this.revs, t: this.t }; }
  dragInit() { let on = false; const at = e => { const sv = this.box.querySelector('svg'); if (!sv) return null; const r = sv.getBoundingClientRect(), x = (e.clientX - r.left) * 600 / r.width; return (x - 70) / 460; };
    this.box.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || !e.target.closest('[data-car]') || this.drive()) return; on = true; e.preventDefault(); try { this.box.setPointerCapture(e.pointerId); } catch (er) {} });
    this.box.addEventListener('pointermove', e => { if (!on) return; const p = at(e); if (p !== null && !this.drive()) this.place(p); });
    ['pointerup', 'pointercancel'].forEach(k => this.box.addEventListener(k, () => { on = false; }));
    this.box.addEventListener('click', e => { if (this.drive()) return; const p = at(e); if (p !== null && p > -0.08 && p < 1.08) this.place(p); }); }   // a tap on the track works on phones too
  draw() { if (!this.el) return; const X = p => 70 + 460 * p, x = X(this.pos), F = f1, yR = 100, mv = this.v > 0.02 ? 1 : this.v < -0.02 ? -1 : 0;
    const key = [F(this.pos * 1000), mv, this.crashed, this.over, this.ids().map(id => +!!this.sim.dev[id].on).join('')].join('|'); if (key === this.last) return; this.last = key;
    const E0 = X(0) - 40, E1 = X(1) + 40;   // the end stops: the carriage body (half width 40) touches them at pos 0 / 1
    let s = `<rect x="${E0 - 12}" y="${yR - 34}" width="12" height="40" fill="var(--panel2)" stroke="var(--ink)"/><rect x="${E1}" y="${yR - 34}" width="12" height="40" fill="var(--panel2)" stroke="var(--ink)"/>` +
      [E0 - 12, E1].map(e => [0, 1, 2, 3].map(k => IE.L(e, yR - 30 + 10 * k, e + 12, yR - 22 + 10 * k, { col: 'var(--muted)' })).join('')).join('') +
      IE.L(E0, yR, E1, yR, { w: 2.2 }) + IE.L(E0, yR + 5, E1, yR + 5, { col: 'var(--muted)' });
    s += IE.T(T('← ถอยหลัง (KM2)', '← reverse (KM2)'), E0, 18, { size: 10, weight: 700, col: 'var(--muted)' }) + IE.T(T('เดินหน้า (KM1) →', 'forward (KM1) →'), E1, 18, { size: 10, anchor: 'end', weight: 700, col: 'var(--muted)' });
    // the switches under the track: body, lever with roller (tilted while pressed); over-travel switches drawn with the direct-opening mark
    this.ids().forEach(id => { const xs = X(this.lim[id]), on = !!this.sim.dev[id].on, ot = id === 'S7' || id === 'S8', sd = this.side[id], tilt = on ? -sd * 9 : 0, br = this.broken.has(id);
      s += `<g><rect x="${xs - 10}" y="${yR + 16}" width="20" height="24" rx="3" fill="${on ? (ot ? 'rgba(255,107,107,.35)' : 'var(--accent)') : 'var(--panel)'}" stroke="${ot ? 'var(--bad)' : 'var(--ink)'}"/>` +
        IE.L(xs, yR + 16, xs + tilt, yR + 6, { w: 1.6 }) + `<circle cx="${xs + tilt}" cy="${yR + 6}" r="3.6" fill="var(--panel)" stroke="var(--ink)"/>` +
        IE.T(id, xs, yR + 54, { size: 10, anchor: 'middle', weight: 700, col: ot ? 'var(--bad)' : undefined }) + (br ? IE.T(T('เสีย', 'broken'), xs, yR + 66, { size: 8.5, anchor: 'middle', col: 'var(--bad)' }) : '') + '</g>'; });
    // the carriage: table, wheels, the dog that rides over the rollers, direction arrow
    const bad = this.crashed || this.over;
    s += `<g data-car="1" style="cursor:${this.drive() ? 'default' : 'grab'}"><rect x="${F(x - 34)}" y="${yR - 40}" width="68" height="28" rx="4" fill="var(--panel2)" stroke="${bad ? 'var(--bad)' : 'var(--ink)'}" stroke-width="${bad ? 2.2 : 1.4}"/>` +
      `<rect x="${F(x - 40)}" y="${yR - 46}" width="80" height="7" rx="2" fill="var(--chip)" stroke="var(--ink)"/>` +
      `<circle cx="${F(x - 22)}" cy="${yR - 6}" r="6" fill="var(--panel)" stroke="var(--ink)"/><circle cx="${F(x + 22)}" cy="${yR - 6}" r="6" fill="var(--panel)" stroke="var(--ink)"/>` +
      `<path d="M ${F(x - 4)} ${yR - 12} L ${F(x + 4)} ${yR - 12} L ${F(x + 2)} ${yR + 12} L ${F(x - 2)} ${yR + 12} Z" fill="var(--accent)" stroke="none"/></g>`;
    if (mv) s += `<path d="M ${F(x - 18 * mv)} ${yR - 56} L ${F(x + 18 * mv)} ${yR - 56} M ${F(x + 11 * mv)} ${yR - 61} L ${F(x + 18 * mv)} ${yR - 56} L ${F(x + 11 * mv)} ${yR - 51}" stroke="var(--good)" stroke-width="2.4" fill="none"/>`;
    if (this.crashed) { const xc = this.crashed === 'fwd' ? E1 : E0; s += `<circle cx="${xc}" cy="${yR - 20}" r="16" fill="#ff6b6b" opacity=".35" stroke="none"/>` + IE.T(T('ชนปลายราง!', 'crash into the end stop!'), 300, 36, { size: 12, anchor: 'middle', weight: 700, col: 'var(--bad)' }); }
    else if (this.over) s += IE.T(T('เลยระยะ: แคร่วิ่งผ่านลิมิตสวิตช์ปลายทางไปแล้ว', 'over-travel: the carriage has run past the end limit switch'), 300, 36, { size: 11, anchor: 'middle', weight: 700, col: 'var(--bad)' });
    this.box.innerHTML = IE.svg(600, 172, s, { max: this.o.max || 640, label: 'carriage between two limit switches' });
    const ot = this.sim.dev.S7 || this.sim.dev.S8, warn = this.crashed ? T('ชนปลายราง!', 'Crash into the end stop!') : this.over ? T('เลยระยะ!', 'Over-travel!') : '';
    this.note.innerHTML = (warn ? `<b class="c7bad">${warn}</b> ` : '') + (ot ? T('S5 / S6 ลิมิตสวิตช์ปลายทาง · S7 / S8 สวิตช์กันเลยระยะ · ปลายรางมีตัวหยุด', 'S5 / S6 end limit switches · S7 / S8 over-travel switches · end stops at both ends') : T('S5 / S6 ลิมิตสวิตช์ปลายทาง · ปลายรางมีตัวหยุด', 'S5 / S6 end limit switches · end stops at both ends')) +
      (this.o.drag !== false && !this.drive() ? `<br>${T('มอเตอร์หยุดอยู่: แตะที่รางหรือลากแคร่เพื่อย้ายแคร่', 'Motor stopped: tap the track or drag the carriage to move it.')}` : '');
    const bx = this.box, sv = bx.querySelector('svg');   // on a phone the drawing scrolls sideways: keep the carriage in view
    if (sv && bx.scrollWidth > bx.clientWidth + 2) { const px = x / 600 * sv.getBoundingClientRect().width; if (px < bx.scrollLeft + 50 || px > bx.scrollLeft + bx.clientWidth - 50) bx.scrollLeft = Math.max(0, px - bx.clientWidth / 2); } }
};

global.C7 = C7;
})(window);
