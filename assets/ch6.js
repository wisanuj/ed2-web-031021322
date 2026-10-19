/* ch6.js — chapter 6: sequence starting of several motors (conveyor lines).
   Conveyors: M1 = the most downstream belt (discharge end), M3 = the feed end; material flows M3 → M2 → M1. Start downstream first,
   stop upstream first, a belt that stops takes every belt upstream of it with it, the emergency stop S0 stops everything.
   Course names and IEC numbers: Q1 main breaker, Q11–Q13 branch breakers, F1 control fuse, F21–F23 overload relays of M1–M3
   (95–96 / 97–98), KM1–KM3 contactors, KA1 auxiliary relay, KT1–KT4 timers (timed NO 67–68), S0 emergency stop (latching mushroom,
   11–12), manual circuits S1 stop M1 · S2 start M1 · S3 stop M2 · S4 start M2 · S5 stop M3 · S6 start M3, automatic circuits S1 line stop ·
   S2 line start, lamps H1–H3 green "Mn RUN" via KMn 53–54 and H4–H6 yellow "Mn OVERLOAD" via F2n 97–98, every lamp fed from F1 2 (ahead
   of all the 95–96 contacts). Control 230 V between L1 and N tapped from the busbar after Q1 (o.tap 'before': ahead of Q1).
   Contact numbers (no number is used twice on one device; C6.CONTACTS holds this table for the pages):
     KMn  13–14 holding contact (built in; in AUTO_STOP KM1 13–14 / KM2 13–14 are the seal contacts in series with KT4 / KT3 67–68),
          21–22 NC built in (spare), front block 53–54 NO run lamp Hn, 61–62 NC and 71–72 NC spare,
          83–84 NO = permissive for the next motor (KM1 → KM2 path, KM2 → KM3 path) or the drive of KT1 / KT2 (AUTO3);
          REV_STOP 2 motors: KM2 83–84 across S1; REV_STOP 3 motors: KM2 needs four NO, so it carries a front block with four NO
          (53–54, 63–64, 73–74, 83–84): 63–64 across S1, 83–84 permissive for KM3; KM3 83–84 across S3. Fault 1 uses KM1 61–62 (NC).
     KA1  13–14 hold, 23–24 KM1 path, 33–34 KM2 path, 43–44 KM3 path (contactor relay with four NO)
     KT1, KT2 on-delay, 67–68 timed NO; KT3, KT4 off-delay, 67–68 timed NO (slow-release coils, as RL.Sim models them), each in series
          with the seal contact of the contactor it holds (KT3 + KM2 13–14, KT4 + KM1 13–14)
   Every factory takes o: { lamps: 'all' (default) | 'run' | 'ol' | false, tap: 'after' (default) | 'before' } and returns a fresh
   spec whose power drawing has one branch per motor (relay.js power.feeders); sim.runningM('M2') tells one motor, sim.running() any.
   1) circuits
      C6.SEQ_A(o)        two motors, manual, conveyor-correct: KM2 path from the point after F21 95–96 through the permissive KM1
                         83–84 (outside the KM2 hold), own stop and overload per motor (rows 7; paths 1 KM1, 2 hold, 3 KM2, 4 hold, 5… lamps)
      C6.SEQ_NODE(o)     variant: KM2 path from the holding node of KM1 (after S2 ∥ KM1 13–14), no permissive contact (rows 8)
      C6.SEQ_BRIDGE(o)   "what goes wrong": KM2 path fed from F1 2 and KM2 13–14 bridging S4 and the permissive KM1 83–84 (start-only
                         check): S1 or an F21 trip stops M1 but M2 runs on (pile-up)
      C6.SEQ_NOOL(o)     SEQ_A with F22 only in the power circuit (no F22 95–96, no H5): an F22 trip leaves M2 running
      C6.REV_STOP(o)     SEQ_A + KM2 83–84 across S1 only: S1 does nothing while M2 runs (stop M2 with S3 first); o.n 3: three
                         motors (S5/S6, KM2 63–64 across S1, KM3 83–84 across S3)
      C6.OL_ARR(mode, o) three conveyors, line stop S1, starts S2 (M1) S3 (M2) S4 (M3), the start order checked by KM1 83–84 / KM2 83–84 in
                         series with the start button only (the hold bridges both), so the overload wiring alone decides who stops:
                         'series' F21 F22 F23 at the top (any overload stops all), 'own' (alias 'indep'; EMC9 "COMMON") each F2n in
                         its own path (stops only its motor), 'cascade' a tree: path 2 fed after F21, path 3 after F22 (F2n stops Mn and
                         every belt upstream). C6.OL_STOPS(mode) = which belts stop on each overload, from the model
      C6.AUTO3(o)        three conveyors, automatic start: S0 → S1 → (S2 ∥ KM1 13–14) → F21 → KM1; from the point after S1: KM1 83–84 →
                         KT1; KT1 67–68 → F22 → KM2; KM2 83–84 → KT2; KT2 67–68 → F23 → KM3 (cascade on overload for free);
                         o.olAll: F21 F22 F23 in series under S0 instead; o.T (both timers, default 3 s), o.T1, o.T2
      C6.AUTO_STOP(o)    start M1 → M2 → M3 and stop M3 → M2 → M1 (UMC5 Fig 12.13 / Ex10 Exp 10.5 redrawn to the L side, plus seal
                         contacts): point A = F1 → S0 → F21 → F22 → F23; A → S1 → (S2 ∥ KA1 13–14) → KA1; A → (KA1 23–24 ∥ KT4 67–68 +
                         KM1 13–14) → KM1 ∥ KT1; A → ((KA1 33–34 + KT1 67–68) ∥ KT3 67–68 + KM2 13–14) → KM2 ∥ KT2 ∥ KT4;
                         A → KA1 43–44 + KT2 67–68 → KM3 ∥ KT3 (rows 8; paths 1 KA1, 2 hold, 3 KM1, 4 KT4 hold + KT1 coil, 5 KM2, 6 KT3
                         hold + KT2 coil, 7 KT4 coil, 8 KM3, 9 KT3 coil). The seal contacts let an off-delay contact keep in only a contactor
                         that is still in: during a normal stop KM1 / KM2 are energised when their off-delay hold takes over, but once a coil
                         has dropped out (S0, a power cut, an overload trip) its own 13–14 is open and the still-closed off-delay contact cannot
                         re-energise it, so nothing restarts (IEC 60204-1 7.5 and 10.7). o.seal false: the holds without them (KT4 67–68 and
                         KT3 67–68 straight from A to the coils, as Exp 10.5): an interruption shorter than the delay restarts KM1 and KM2
      C6.BELTS(n)        ['M3', 'M2', 'M1'] (feed end first) · C6.motors(sim) motor ids of a simulator · C6.CONTACTS contact table
   2) C6.FAULTS          nine fault-finding cases in the format of C5.FAULTS { id, title, spec, good, symptom, options (answer = 0),
                         answer, fix, test, seq } plus belts (for C6.Conveyor) and power (true when the power drawing shows the clue);
      C6.runSeq(sim, seq) runs a test sequence (C5 ops + ['wait', s], ['runM', 'M2', bool], ['on', id, bool]);
      C6.faultTrial(c) → { bad, good } (good true and bad false when the case works); C6.trial(spec, seq) → bool;
      C6.events(spec, acts, o) runs a hidden simulator through timed actions [[t, op, …args]] and returns { list: [{ t, id, v }],
                         at(id, v = true, after = 0) } (motors, coils, timers and 'KTn:c' timed contacts)
   3) C6.state(sim) default status [pill, text, kind] of a multi-motor simulator; C6.panel(el, sim, o) = C5.panel with that status
   4) C6.Conveyor        animated side view: hopper → M3 → M2 → M1 → bin; belts and rollers move while their motor runs (sim.runningM),
                         parcels flow from the feed end, pile up where a running belt feeds a stopped one, spill past o.cap; counters
   5) C6.Timeline        live timing chart of push buttons, coils, timers (coil and timed contact), motors, lamps, overloads
   6) C6.startSum(o)     summed line current of n motors started together and staggered by T s (C5.startRun model): { svg, peak, … };
      C6.StartSum        the same with its own slider and result line */
(function (global) {
'use strict';
const C6 = {}, IE = global.IEC, T = (th, en) => MC.t(th, en), tt = p => ED.tt(p);
const GOOD = '#1d8a4a', BAD = '#c0392b', f1 = v => +(+v).toFixed(1);
C6.COL = { run: '#7ee787', ol: '#ffd166', stop: '#f2f2f2' };
C6.T = 3;   // default timer setting (s)

/* ---------------- 1) circuits ---------------- */
const DV = {
  Q1: () => ({ type: 'cb', on: true, name: ['Q1 เบรกเกอร์หลัก', 'Q1 main breaker'] }),
  Qn: i => ({ type: 'cb', on: true, name: [`Q1${i} เบรกเกอร์ของ M${i}`, `Q1${i} M${i} breaker`] }),
  F1: () => ({ type: 'fuse', name: ['F1 ฟิวส์วงจรควบคุม', 'F1 control fuse'] }),
  Fn: i => ({ type: 'ol', name: [`F2${i} โอเวอร์โหลด M${i} ตัด / รีเซ็ต`, `F2${i} M${i} overload trip / reset`] }),
  S0: () => ({ type: 'pb', cap: 'red', latch: true, name: ['S0 หยุดฉุกเฉิน', 'S0 emergency stop'] }),
  stop: (id, i) => ({ type: 'pb', cap: 'black', name: [`${id} หยุด M${i}`, `${id} M${i} stop`] }),
  start: (id, i) => ({ type: 'pb', cap: 'white', name: [`${id} เริ่ม M${i}`, `${id} M${i} start`] }),
  lineStop: () => ({ type: 'pb', cap: 'black', name: ['S1 หยุดทั้งสาย', 'S1 line stop'] }),
  lineStart: () => ({ type: 'pb', cap: 'white', name: ['S2 เริ่มทั้งสาย', 'S2 line start'] }),
  KM: () => ({ type: 'coil' }), KA: () => ({ type: 'coil' }), KT: (mode, T0) => ({ type: 'timer', mode, T: T0 }),
  run: i => ({ type: 'lamp', color: C6.COL.run, code: 'GN', name: [`H${i} M${i} เดิน`, `H${i} M${i} run`] }),
  ol: i => ({ type: 'lamp', color: C6.COL.ol, code: 'YE', name: [`H${3 + i} M${i} โอเวอร์โหลด`, `H${3 + i} M${i} overload`] }) };
const lampSel = o => { const v = o.lamps === undefined ? 'all' : o.lamps; return { run: v === 'all' || v === 'run', ol: v === 'all' || v === 'ol' }; };
/* devices of an n-motor circuit in the order the panel shows them: breakers, fuse, overloads, buttons, coils, timers, lamps */
const devs = (n, btn, o, extra = {}) => { const D = { Q1: DV.Q1() }, L = lampSel(o);
  for (let i = 1; i <= n; i++) D[`Q1${i}`] = DV.Qn(i);
  D.F1 = DV.F1(); for (let i = 1; i <= n; i++) D[`F2${i}`] = DV.Fn(i);
  Object.assign(D, btn); for (let i = 1; i <= n; i++) D[`KM${i}`] = DV.KM(); Object.assign(D, extra);
  if (L.run) for (let i = 1; i <= n; i++) D[`H${i}`] = DV.run(i);
  if (L.ol) for (let i = 1; i <= n; i++) D[`H${3 + i}`] = DV.ol(i);
  return D; };
const w = (pts, dots) => (dots && dots.length ? { k: 'w', pts, dots } : { k: 'w', pts }), vw = (x, y, h = 1) => ({ k: 'w', x, y, h });
const fuse = () => ({ k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }), olc = (i, x, y) => ({ k: 'NC', d: `F2${i}`, x, y, t: ['95', '96'], op: 'thr' });
const est = (x, y) => ({ k: 'NC', d: 'S0', x, y, t: ['11', '12'], op: 'mush' }), stp = (d, x, y) => ({ k: 'NC', d, x, y, t: ['11', '12'], op: 'pb' });
const sta = (d, x, y, h = 1) => ({ k: 'NO', d, x, y, h, t: ['13', '14'], op: 'pb' }), coil = (d, x, y) => ({ k: 'coil', d, x, y, t: ['A1', 'A2'] });
const no = (d, a, b, x, y, h = 1) => ({ k: 'NO', d, x, y, h, t: [a, b] }), nc = (d, a, b, x, y, h = 1) => ({ k: 'NC', d, x, y, h, t: [a, b] });
const tno = (d, x, y, td, h = 1) => ({ k: 'NO', d, x, y, h, t: ['67', '68'], td });
/* lamp columns from x0, each fed from F1 2 (node (0, 1)) along row 1: contact in row rows − 2, lamp to N. via = other columns whose top
   sits on row 1 (they get junction dots); skipOl = motors without an overload lamp */
const lampEls = (n, o, x0, rows, via = [], skipOl = []) => { const L = lampSel(o), list = [];
  if (L.run) for (let i = 1; i <= n; i++) list.push([`H${i}`, { k: 'NO', d: `KM${i}`, t: ['53', '54'] }]);
  if (L.ol) for (let i = 1; i <= n; i++) if (!skipOl.includes(i)) list.push([`H${3 + i}`, { k: 'NO', d: `F2${i}`, t: ['97', '98'], op: 'thr' }]);
  const yc = rows - 2, els = [], xs = list.map((l, i) => x0 + i);
  list.forEach(([h, c], i) => { const x = xs[i]; els.push(vw(x, 1, yc - 1), { ...c, x, y: yc }, { k: 'lamp', d: h, x, y: yc + 1, t: ['X1', 'X2'] }); });
  const pts = [...new Set([0, ...via, ...xs])].sort((a, b) => a - b).map(x => [x, 1]);
  if (pts.length > 1) els.push(w(pts, pts.map((p, i) => i).slice(0, -1)));
  return els; };
const PW = (n, o = {}) => ({ full: true, tap: o.tap === 'before' ? 'before' : 'after', main: { k: 'cb', d: 'Q1' },
  feeders: Array.from({ length: n }, (_, j) => ({ stages: [{ k: 'cb', d: `Q1${j + 1}` }, { k: 'mainNO', d: `KM${j + 1}` }, { k: 'therm', d: `F2${j + 1}` }], motor: `M${j + 1}` })) });
const mk = (n, rows, D, els, o) => ({ supply: o.tap === 'before' ? undefined : 'Q1', rows, devices: D, power: PW(n, o), els });
C6.BELTS = n => Array.from({ length: n }, (_, i) => `M${n - i}`);
C6.motors = sim => (sim.spec.power && sim.spec.power.feeders ? sim.spec.power.feeders.map(f => f.motor) : ['M1']);

const man2 = o => devs(2, { S1: DV.stop('S1', 1), S2: DV.start('S2', 1), S3: DV.stop('S3', 2), S4: DV.start('S4', 2) }, o);
/* path 1 of the two-motor manual circuits (rows 7): F1, F21 95–96, S1, S2 ∥ KM1 13–14 (column 1), KM1 */
const path1 = () => [fuse(), olc(1, 0, 1), stp('S1', 0, 2), sta('S2', 0, 3), vw(0, 4, 2), coil('KM1', 0, 6), no('KM1', '13', '14', 1, 3), w([[0, 3], [1, 3]], [0]), w([[0, 4], [1, 4]], [0])];
/* internal options used by C6.FAULTS: _perm 'NC' (KM1 61–62 instead of 83–84), _noOl (no F22 95–96), _weld (KM2 13–14 welded) */
C6.SEQ_A = (o = {}) => mk(2, 7, man2(o), [...path1(),
  w([[0, 2], [2, 2]], [0]), o._perm === 'NC' ? nc('KM1', '61', '62', 2, 2) : no('KM1', '83', '84', 2, 2), o._noOl ? vw(2, 3) : olc(2, 2, 3), stp('S3', 2, 4), sta('S4', 2, 5), coil('KM2', 2, 6),
  { ...no('KM2', '13', '14', 3, 5), ...(o._weld ? { welded: true } : {}) }, w([[2, 5], [3, 5]], [0]), w([[2, 6], [3, 6]], [0]),
  ...lampEls(2, o, 4, 7, [], o._noOl ? [2] : [])], o);
C6.SEQ_NODE = (o = {}) => mk(2, 8, man2(o), [fuse(), olc(1, 0, 1), stp('S1', 0, 2), sta('S2', 0, 3), vw(0, 4, 3), coil('KM1', 0, 7),
  no('KM1', '13', '14', 1, 3), w([[0, 3], [1, 3]], [0]), w([[0, 4], [1, 4], [2, 4]], [0, 1]),
  olc(2, 2, 4), stp('S3', 2, 5), sta('S4', 2, 6), coil('KM2', 2, 7), no('KM2', '13', '14', 3, 6), w([[2, 6], [3, 6]], [0]), w([[2, 7], [3, 7]], [0]),
  ...lampEls(2, o, 4, 8)], o);
C6.SEQ_BRIDGE = (o = {}) => mk(2, 7, man2(o), [...path1(),
  olc(2, 2, 1), stp('S3', 2, 2), sta('S4', 2, 3), no('KM1', '83', '84', 2, 4), vw(2, 5), coil('KM2', 2, 6),
  no('KM2', '13', '14', 3, 3, 2), w([[2, 3], [3, 3]], [0]), w([[2, 5], [3, 5]], [0]),
  ...lampEls(2, o, 4, 7, [2])], o);
C6.SEQ_NOOL = (o = {}) => { const s = C6.SEQ_A({ ...o, _noOl: true }); delete s.devices.H5; return s; };
/* reverse-order stop; internal option _bridge 'F21' puts the KM2 contact across F21 95–96 instead of S1 (fault 6) */
C6.REV_STOP = (o = {}) => { const n = o.n === 3 ? 3 : 2, f21 = o._bridge === 'F21', btn = { S1: DV.stop('S1', 1), S2: DV.start('S2', 1), S3: DV.stop('S3', 2), S4: DV.start('S4', 2) };
  if (n === 3) { btn.S5 = DV.stop('S5', 3); btn.S6 = DV.start('S6', 3); }
  const els = [fuse(), olc(1, 0, 1), stp('S1', 0, 2), sta('S2', 0, 3), vw(0, 4, 2), coil('KM1', 0, 6),
    n === 3 ? no('KM2', '63', '64', 1, f21 ? 1 : 2) : no('KM2', '83', '84', 1, f21 ? 1 : 2),
    no('KM1', '13', '14', 2, 3), f21 ? w([[0, 3], [2, 3]], [0]) : w([[0, 3], [1, 3], [2, 3]], [0, 1]), w([[0, 4], [2, 4]], [0]),
    no('KM1', '83', '84', 3, 2), olc(2, 3, 3), stp('S3', 3, 4), sta('S4', 3, 5), coil('KM2', 3, 6)];
  if (n === 2) els.push(w([[0, 2], [1, 2], [3, 2]], [0, 1]), no('KM2', '13', '14', 4, 5), w([[3, 5], [4, 5]], [0]), w([[3, 6], [4, 6]], [0]), ...lampEls(2, o, 5, 7, f21 ? [1] : []));
  else els.push(w([[0, 2], [1, 2], [3, 2], [6, 2]], [0, 1, 2]), no('KM3', '83', '84', 4, 4), w([[3, 4], [4, 4]], [0]), no('KM2', '13', '14', 5, 5), w([[3, 5], [4, 5], [5, 5]], [0, 1]), w([[3, 6], [5, 6]], [0]),
    no('KM2', '83', '84', 6, 2), olc(3, 6, 3), stp('S5', 6, 4), sta('S6', 6, 5), coil('KM3', 6, 6), no('KM3', '13', '14', 7, 5), w([[6, 5], [7, 5]], [0]), w([[6, 6], [7, 6]], [0]), ...lampEls(3, o, 8, 7, f21 ? [1] : []));
  return mk(n, 7, devs(n, btn, o), els, o); };
/* overload arrangements on three conveyors */
C6.OL_ARR = (mode = 'cascade', o = {}) => { mode = mode === 'indep' ? 'own' : ['series', 'own', 'cascade'].includes(mode) ? mode : 'cascade';
  const D = devs(3, { S1: DV.lineStop(), S2: DV.start('S2', 1), S3: DV.start('S3', 2), S4: DV.start('S4', 3) }, o);
  if (mode === 'cascade') return mk(3, 10, D, [fuse(), vw(0, 1, 2), stp('S1', 0, 3), olc(1, 0, 4), vw(0, 5), sta('S2', 0, 6), vw(0, 7, 2), coil('KM1', 0, 9),
    no('KM1', '13', '14', 1, 6), w([[0, 6], [1, 6]], [0]), w([[0, 7], [1, 7]], [0]),
    w([[0, 5], [2, 5]], [0]), olc(2, 2, 5), sta('S3', 2, 6), no('KM1', '83', '84', 2, 7), vw(2, 8), coil('KM2', 2, 9),
    no('KM2', '13', '14', 3, 6, 2), w([[2, 6], [3, 6], [4, 6]], [0, 1]), w([[2, 8], [3, 8]], [0]),
    olc(3, 4, 6), sta('S4', 4, 7), no('KM2', '83', '84', 4, 8), coil('KM3', 4, 9), no('KM3', '13', '14', 5, 7, 2), w([[4, 7], [5, 7]], [0]), w([[4, 9], [5, 9]], [0]),
    ...lampEls(3, o, 6, 10)], o);
  const ser = mode === 'series';
  return mk(3, 9, D, [fuse(), ...(ser ? [olc(1, 0, 1), olc(2, 0, 2), olc(3, 0, 3)] : [vw(0, 1, 3)]), stp('S1', 0, 4),
    ser ? vw(0, 5) : olc(1, 0, 5), sta('S2', 0, 6), vw(0, 7), coil('KM1', 0, 8), no('KM1', '13', '14', 1, 6), w([[0, 6], [1, 6]], [0]), w([[0, 7], [1, 7]], [0]),
    w([[0, 5], [2, 5], [4, 5]], [0, 1]),
    ser ? vw(2, 5) : olc(2, 2, 5), sta('S3', 2, 6), no('KM1', '83', '84', 2, 7), coil('KM2', 2, 8), no('KM2', '13', '14', 3, 6, 2), w([[2, 6], [3, 6]], [0]), w([[2, 8], [3, 8]], [0]),
    ser ? vw(4, 5) : olc(3, 4, 5), sta('S4', 4, 6), no('KM2', '83', '84', 4, 7), coil('KM3', 4, 8), no('KM3', '13', '14', 5, 6, 2), w([[4, 6], [5, 6]], [0]), w([[4, 8], [5, 8]], [0]),
    ...lampEls(3, o, 6, 9)], o); };
/* which belts stop when each overload trips, with all three running: { F21: ['M1', 'M2', 'M3'], … } (from the model) */
C6.OL_STOPS = mode => { const out = {};
  [1, 2, 3].forEach(i => { const s = hid(C6.OL_ARR(mode, { lamps: false })); C6.runSeq(s, [['tap', 'S2'], ['tap', 'S3'], ['tap', 'S4'], ['toggle', `F2${i}`]]);
    out[`F2${i}`] = ['M1', 'M2', 'M3'].filter(m => !s.runningM(m)); });
  return out; };
/* automatic start of three conveyors with on-delay timers; internal options _weld3 (KM3 welds when it first closes), _kt1Open */
C6.AUTO3 = (o = {}) => { const all = !!o.olAll, T1 = o.T1 ?? o.T ?? C6.T, T2 = o.T2 ?? o.T ?? C6.T;
  const D = devs(3, { S0: DV.S0(), S1: DV.lineStop(), S2: DV.lineStart() }, o, { KT1: DV.KT('on', T1), KT2: DV.KT('on', T2) });
  if (o._weld3) D.KM3.weldOnClose = true;
  const kt1 = { ...coil('KT1', 2, all ? 7 : 5), ...(o._kt1Open ? { open: true } : {}) };
  if (all) return mk(3, 8, D, [fuse(), est(0, 1), olc(1, 0, 2), olc(2, 0, 3), olc(3, 0, 4), stp('S1', 0, 5), sta('S2', 0, 6), coil('KM1', 0, 7),
    no('KM1', '13', '14', 1, 6), w([[0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6]], [0, 1, 2, 3, 4]), w([[0, 7], [1, 7]], [0]),
    no('KM1', '83', '84', 2, 6), kt1, tno('KT1', 3, 6, 'on'), coil('KM2', 3, 7), no('KM2', '83', '84', 4, 6), coil('KT2', 4, 7), tno('KT2', 5, 6, 'on'), coil('KM3', 5, 7),
    ...lampEls(3, o, 6, 8)], o);
  return mk(3, 6, D, [fuse(), est(0, 1), stp('S1', 0, 2), sta('S2', 0, 3), olc(1, 0, 4), coil('KM1', 0, 5),
    no('KM1', '13', '14', 1, 3), w([[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3]], [0, 1, 2, 3, 4]), w([[0, 4], [1, 4]], [0]),
    no('KM1', '83', '84', 2, 3), vw(2, 4), kt1, tno('KT1', 3, 3, 'on'), olc(2, 3, 4), coil('KM2', 3, 5),
    no('KM2', '83', '84', 4, 3), vw(4, 4), coil('KT2', 4, 5), tno('KT2', 5, 3, 'on'), olc(3, 5, 4), coil('KM3', 5, 5),
    ...lampEls(3, o, 6, 6)], o); };
/* timed start and timed stop; o.seal false drops the seal contacts KM1 13–14 / KM2 13–14 (the off-delay holds straight from point A to
   the coils, page 6.4 step 5); internal options _from 'S1' (every branch fed after S1, fault 7), _f21 'KM1' (F21 inside the KM1 path
   under the KT4 hold, fault 9) */
C6.AUTO_STOP = (o = {}) => { const T0 = o.T ?? C6.T, s1 = o._from === 'S1', f21 = o._f21 === 'KM1', seal = o.seal !== false;
  const D = devs(3, { S0: DV.S0(), S1: DV.lineStop(), S2: DV.lineStart() }, o, { KA1: DV.KA(), KT1: DV.KT('on', o.T1 ?? T0), KT2: DV.KT('on', o.T2 ?? T0), KT3: DV.KT('off', o.T3 ?? T0), KT4: DV.KT('off', o.T4 ?? T0) });
  /* off-delay hold of KMn in column x: the timed contact from point A (row 5), then the seal contact KMn 13–14 (row 6), or one tall contact */
  const hold = (kt, km, x) => (seal ? [tno(kt, x, 5, 'off'), no(km, '13', '14', x, 6)] : [tno(kt, x, 5, 'off', 2)]);
  return mk(3, 8, D, [fuse(), est(0, 1), f21 ? vw(0, 2) : olc(1, 0, 2), olc(2, 0, 3), olc(3, 0, 4), stp('S1', 0, 5), sta('S2', 0, 6), coil('KA1', 0, 7),
    no('KA1', '13', '14', 1, 6), w([[0, 6], [1, 6]], [0]), w([[0, 7], [1, 7]], [0]),
    s1 ? w([[1, 6], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [7, 5]], [0, 2, 3, 4, 5]) : w([[0, 5], [2, 5], [3, 5], [4, 5], [5, 5], [7, 5]], [0, 1, 2, 3, 4]),
    no('KA1', '23', '24', 2, 5), f21 ? olc(1, 2, 6) : vw(2, 6), coil('KM1', 2, 7), ...hold('KT4', 'KM1', 3), w([[2, 7], [3, 7]], [0, 1]), coil('KT1', 3, 7),
    no('KA1', '33', '34', 4, 5), tno('KT1', 4, 6, 'on'), coil('KM2', 4, 7), ...hold('KT3', 'KM2', 5), w([[4, 7], [5, 7], [6, 7]], [0, 1]), coil('KT2', 5, 7), coil('KT4', 6, 7),
    no('KA1', '43', '44', 7, 5), tno('KT2', 7, 6, 'on'), coil('KM3', 7, 7), coil('KT3', 8, 7), w([[7, 7], [8, 7]], [0]),
    ...lampEls(3, o, 9, 8)], o); };
/* contact table of the chapter: [devices, terminals, [th, en] use] */
C6.CONTACTS = [
  ['KM1, KM2, KM3', '13–14', ['หน้าสัมผัสค้างตัวเอง (มีในตัวคอนแทกเตอร์)', 'holding contact (built in)']],
  ['KM1, KM2', '13–14', ['วงจรเริ่มและหยุดอัตโนมัติ: หน้าสัมผัสค้างตัวเอง (seal contact) อนุกรมกับ KT4 67–68 (KM1) และ KT3 67–68 (KM2) หน้าสัมผัสหน่วงเมื่อตัดไฟจึงค้างได้เฉพาะคอนแทกเตอร์ที่ยังดูดอยู่ ไฟดับ กด S0 หรือโอเวอร์โหลดตัดแล้ว ไม่มีอะไรเริ่มเอง', 'timed start and stop: seal contact in series with KT4 67–68 (KM1) and KT3 67–68 (KM2), so an off-delay contact can keep in only a contactor that is still in; after a power failure, S0 or an overload trip nothing restarts']],
  ['KM1, KM2, KM3', '21–22', ['หน้าสัมผัสปกติปิดในตัว: ว่าง (ใช้กับหลอดหยุดสีขาวได้)', 'normally closed, built in: spare (can drive a white "stopped" lamp)']],
  ['KM1, KM2, KM3', '53–54', ['ชุดหน้าสัมผัสเสริมด้านหน้า: หลอดเดิน H1, H2, H3', 'front block: run lamps H1, H2, H3']],
  ['KM1, KM2, KM3', '61–62, 71–72', ['ชุดหน้าสัมผัสเสริมด้านหน้า: ปกติปิด ว่าง', 'front block: normally closed, spare']],
  ['KM1, KM2', '83–84', ['หน้าสัมผัสอนุญาตของมอเตอร์ตัวถัดไป (KM1 → ทางของ KM2, KM2 → ทางของ KM3) หรือป้อนไฟตัวตั้งเวลา KT1, KT2', 'permissive for the next motor (KM1 → KM2 path, KM2 → KM3 path) or the supply of timers KT1, KT2']],
  ['KM2', '83–84', ['หยุดย้อนลำดับ 2 มอเตอร์: ต่อคร่อม S1', 'reverse-order stop, two motors: across S1']],
  ['KM2', '63–64', ['หยุดย้อนลำดับ 3 มอเตอร์: ต่อคร่อม S1 (KM2 ต้องมีหน้าสัมผัสปกติเปิด 4 ตัว จึงใช้ชุดหน้าสัมผัสเสริมแบบปกติเปิด 4 ตัว 53–54, 63–64, 73–74, 83–84)', 'reverse-order stop, three motors: across S1 (KM2 needs four NO contacts, so it carries a front block with four NO: 53–54, 63–64, 73–74, 83–84)']],
  ['KM3', '83–84', ['หยุดย้อนลำดับ 3 มอเตอร์: ต่อคร่อม S3', 'reverse-order stop, three motors: across S3']],
  ['KA1', '13–14, 23–24, 33–34, 43–44', ['ค้างตัวเอง, ทางของ KM1, ทางของ KM2, ทางของ KM3', 'hold, KM1 path, KM2 path, KM3 path']],
  ['KT1, KT2', '67–68', ['หน่วงเวลาเมื่อป้อนไฟ (on-delay) ปกติเปิด: เริ่มเดินมอเตอร์ตัวถัดไป', 'on-delay timed NO: starts the next motor']],
  ['KT3, KT4', '67–68', ['หน่วงเวลาเมื่อตัดไฟ (off-delay) ปกติเปิด: ค้าง KM2, KM1 ไว้ระหว่างหยุดตามลำดับ (อนุกรมกับ KM2 13–14, KM1 13–14)', 'off-delay timed NO: holds KM2, KM1 while the line stops in turn (in series with KM2 13–14, KM1 13–14)']],
  ['F21, F22, F23', '95–96, 97–98', ['เปิดเมื่อโอเวอร์โหลดตัด / หลอดโอเวอร์โหลด H4, H5, H6', 'opens on a trip / overload lamps H4, H5, H6']],
  ['S0', '11–12', ['ปุ่มหยุดฉุกเฉินแบบหัวเห็ด ค้างเมื่อกด', 'emergency stop, mushroom head, latches when pressed']],
  ['S1, S3, S5', '11–12', ['ปุ่มหยุด (สีดำ)', 'stop buttons (black)']], ['S2, S4, S6', '13–14', ['ปุ่มเริ่ม (สีขาว)', 'start buttons (white)']]];

/* ---------------- 2) fault-finding cases and test sequences ---------------- */
const hid = spec => new RL.Sim(document.createElement('div'), spec);
/* ops: ['tap', ids…] ['hold', id] ['release', id] ['toggle', id] ['start', id] ['cut'] ['fault', id] ['wait', seconds] and checks ['run', bool]
   (any motor), ['runM', 'M2', bool], ['lit', id, bool] / ['on', id, bool] (energised); true when every check holds */
C6.runSeq = (sim, seq) => { let ok = true;
  seq.forEach(([op, ...a]) => {
    if (op === 'tap') { a.forEach(id => sim.press(id, true)); a.forEach(id => sim.press(id, false)); }
    else if (op === 'hold') a.forEach(id => sim.press(id, true)); else if (op === 'release') a.forEach(id => sim.press(id, false));
    else if (op === 'toggle') a.forEach(id => sim.toggle(id));
    else if (op === 'start') a.forEach(id => { const d = sim.dev[id]; if (d.type === 'sel') { if (!d.on) sim.toggle(id); } else { sim.press(id, true); sim.press(id, false); } });
    else if (op === 'cut') { sim.setMains(false); sim.setMains(true); }
    else if (op === 'fault') a.forEach(id => { if (!sim.dev[id].on) sim.toggle(id); });
    else if (op === 'wait') { let left = a[0]; while (left > 1e-9) { const d = Math.min(0.05, left); sim.step(d); left -= d; } }
    else if (op === 'run') { if (sim.running() !== a[0]) ok = false; }
    else if (op === 'runM') { if (sim.runningM(a[0]) !== a[1]) ok = false; }
    else if (op === 'lit' || op === 'on') { if (!!sim.dev[a[0]].energized !== a[1]) ok = false; } });
  return ok; };
C6.trial = (spec, seq) => C6.runSeq(hid(spec), seq);
C6.faultTrial = c => ({ bad: C6.trial(c.spec(), c.seq), good: C6.trial(c.good(), c.seq) });
/* timed actions on a hidden simulator: acts [[t, op, …args]] (ops of runSeq); records every change of the motors, coils, timers and
   timed contacts ('KT1:c') as { t, id, v }; o: { dt 0.01, until 12, watch: [ids] } */
C6.events = (spec, acts = [], o = {}) => { const sim = hid(spec), dt = o.dt || 0.01, until = o.until ?? 12, list = [], st = {};
  const W = [...C6.motors(sim).map(m => [m, () => sim.runningM(m)]), ...Object.keys(sim.dev).filter(id => ['coil', 'timer', 'lamp'].includes(sim.dev[id].type)).map(id => [id, () => !!sim.dev[id].energized]),
    ...Object.keys(sim.dev).filter(id => sim.dev[id].type === 'timer').map(id => [`${id}:c`, () => sim.act(id)])].filter(([k]) => !o.watch || o.watch.includes(k.split(':')[0]));
  let now = 0, k = 0; const A = acts.slice().sort((p, q) => p[0] - q[0]);
  const snap = () => W.forEach(([key, fn]) => { const v = !!fn(); if (st[key] !== v) { if (st[key] !== undefined || v) list.push({ t: +now.toFixed(3), id: key, v }); st[key] = v; } });
  snap();
  while (now <= until + 1e-9) { while (k < A.length && A[k][0] <= now + 1e-9) { C6.runSeq(sim, [A[k].slice(1)]); k++; snap(); } sim.step(dt); now += dt; snap(); }
  return { list, at: (id, v = true, after = 0) => { const e = list.find(x => x.id === id && x.v === v && x.t >= after - 1e-9); return e ? e.t : null; } }; };
const B2 = C6.BELTS(2), B3 = C6.BELTS(3);
C6.FAULTS = [
  { id: 'permNC', belts: B2, power: false, title: ['หน้าสัมผัสอนุญาตของ KM1 เป็นแบบปกติปิด', 'KM1 permissive contact wired normally closed'],
    spec: () => C6.SEQ_A({ lamps: false, _perm: 'NC' }), good: () => C6.SEQ_A({ lamps: false }),
    symptom: ['กด S4 แล้ว M2 เดินทั้งที่ M1 ยังหยุดอยู่ และเมื่อกด S2 ให้ M1 เดิน M2 กลับหยุดเอง', 'S4 starts M2 although M1 is stopped, and when S2 starts M1, M2 stops by itself'],
    options: [['ทางเดินกระแสของ KM2 ใช้หน้าสัมผัสปกติปิด KM1 61–62 แทนหน้าสัมผัสปกติเปิด KM1 83–84', 'the KM2 path uses the normally closed KM1 61–62 instead of the normally open KM1 83–84'],
      ['ไม่มีหน้าสัมผัสค้าง KM2 13–14', 'there is no KM2 13–14 holding contact'], ['S3 ต่อที่หน้าสัมผัส 13–14 แทน 11–12', 'S3 is wired on 13–14 instead of 11–12'], ['F22 ตัดค้างอยู่', 'F22 is tripped']], answer: 0,
    fix: ['ใช้หน้าสัมผัสปกติเปิด KM1 83–84 เป็นหน้าสัมผัสอนุญาต ทางเดินกระแสของ KM2 จะต่อได้เฉพาะเมื่อ KM1 ดูดแล้ว', 'Use the normally open KM1 83–84 as the permissive contact; the KM2 path can then close only once KM1 has pulled in'],
    test: ['กด S4 ก่อน: M2 ต้องไม่เดิน · กด S2 แล้ว S4: เดินทั้งคู่', 'Press S4 first: M2 must not start · press S2, then S4: both run'],
    seq: [['tap', 'S4'], ['runM', 'M2', false], ['tap', 'S2'], ['tap', 'S4'], ['runM', 'M1', true], ['runM', 'M2', true]] },
  { id: 'km3Weld', belts: B3, power: true, title: ['หน้าสัมผัสหลักของ KM3 เชื่อมติด', 'KM3 main contacts welded'],
    spec: () => C6.AUTO3({ lamps: 'run', _weld3: true }), good: () => C6.AUTO3({ lamps: 'run' }),
    symptom: ['สายพานเริ่มเดินตามลำดับ M1 → M2 → M3 ได้ปกติ แต่เมื่อกด S1 M1 และ M2 หยุด ส่วน M3 ยังหมุนต่อและหลอด H3 ยังติด ทั้งที่คอยล์ KM3 ไม่มีไฟแล้ว', 'The belts start in order M1 → M2 → M3 as they should, but S1 stops M1 and M2 only: M3 keeps running and lamp H3 stays lit, although coil KM3 has no supply any more'],
    options: [['หน้าสัมผัสหลักของ KM3 เชื่อมติด คอนแทกเตอร์จึงค้างอยู่ในตำแหน่งต่อแม้คอยล์ไม่มีไฟ', 'the main contacts of KM3 have welded, so the contactor stays closed although its coil has no supply'],
      ['ตั้งเวลา KT2 ไว้ 0 s', 'KT2 is set to 0 s'], ['S1 ต่อที่หน้าสัมผัส 13–14', 'S1 is wired on 13–14'], ['F23 ตัดค้างอยู่', 'F23 is tripped']], answer: 0,
    fix: ['ปลด Q1 (ตัดไฟทั้งตู้) เปลี่ยนคอนแทกเตอร์ KM3 หรือชุดหน้าสัมผัสของมัน และหาสาเหตุ เช่น เริ่มเดินถี่เกินไปหรือคอนแทกเตอร์เล็กเกินไป', 'Switch Q1 off (isolate the panel), replace contactor KM3 or its contact set, and find the cause, e.g. too many starts or an undersized contactor'],
    test: ['เริ่มสายพานจนเดินครบสามตัว แล้วกด S1: ทั้งสามตัวต้องหยุด', 'Start the line until all three belts run, then press S1: all three must stop'],
    seq: [['tap', 'S2'], ['wait', 7], ['runM', 'M3', true], ['tap', 'S1'], ['runM', 'M3', false]] },
  { id: 'km2HoldWeld', belts: B2, power: false, title: ['หน้าสัมผัสค้าง KM2 13–14 เชื่อมติด', 'KM2 13–14 holding contact welded'],
    spec: () => C6.SEQ_A({ lamps: false, _weld: true }), good: () => C6.SEQ_A({ lamps: false }),
    symptom: ['กด S2 แล้ว M1 และ M2 เริ่มเดินพร้อมกันทันทีโดยไม่ได้กด S4 และกด S3 แล้ว M2 หยุดเฉพาะตอนกดค้างไว้ ปล่อยแล้วเดินเองอีก', 'S2 starts M1 and M2 together without anyone pressing S4, and S3 stops M2 only while it is held: on release M2 starts again by itself'],
    options: [['หน้าสัมผัสค้าง KM2 13–14 เชื่อมติด จึงต่อคร่อม S4 อยู่ตลอดเวลา', 'the KM2 13–14 holding contact has welded, so it bridges S4 all the time'],
      ['ไม่มีหน้าสัมผัสอนุญาต KM1 83–84', 'there is no KM1 83–84 permissive contact'], ['F22 95–96 ถูกต่อข้าม', 'F22 95–96 is bypassed'], ['หน้าสัมผัสค้าง KM2 ต่อคร่อมทั้ง S3 และ S4', 'the KM2 holding contact bridges both S3 and S4']], answer: 0,
    fix: ['ปลด Q1 แล้วเปลี่ยนชุดหน้าสัมผัสช่วยหรือคอนแทกเตอร์ KM2 หน้าสัมผัสค้างต้องเปิดเมื่อ KM2 ปล่อย', 'Switch Q1 off and replace the auxiliary contact block or contactor KM2; the holding contact must open when KM2 drops out'],
    test: ['กด S2 อย่างเดียว: M1 เดิน ส่วน M2 ต้องยังหยุด', 'Press S2 alone: M1 runs and M2 must stay stopped'],
    seq: [['tap', 'S2'], ['runM', 'M1', true], ['runM', 'M2', false]] },
  { id: 'noOL22', belts: B2, power: true, title: ['ไม่มี F22 95–96 ในวงจรควบคุม', 'No F22 95–96 in the control circuit'],
    spec: () => C6.SEQ_NOOL({ lamps: false }), good: () => C6.SEQ_A({ lamps: false }),
    symptom: ['M1 และ M2 เดินอยู่ เมื่อโอเวอร์โหลด F22 ของ M2 ตัด (คลิก F22) M2 ยังหมุนต่อ', 'M1 and M2 are running; when M2\'s overload relay F22 trips (click F22), M2 keeps running'],
    options: [['F22 อยู่ในวงจรกำลังเท่านั้น ไม่มีหน้าสัมผัส 95–96 ในทางเดินกระแสของ KM2', 'F22 is only in the power circuit: there is no 95–96 contact in the KM2 path'],
      ['F22 ตั้งกระแสไว้สูงเกินไป', 'F22 is set too high'], ['S3 ต่อขนานกับ S4', 'S3 is in parallel with S4'], ['หน้าสัมผัสอนุญาต KM1 83–84 เชื่อมติด', 'the KM1 83–84 permissive contact has welded']], answer: 0,
    fix: ['ต่อ F22 95–96 อนุกรมในทางเดินกระแสของ KM2 (และ F22 97–98 กับหลอด H5) โอเวอร์โหลดของมอเตอร์ทุกตัวต้องหยุดมอเตอร์ของตัวเองได้', 'Put F22 95–96 in series in the KM2 path (and F22 97–98 with lamp H5); every motor\'s overload relay must be able to stop its own motor'],
    test: ['เดินทั้งคู่ แล้วคลิก F22: M2 ต้องหยุด ส่วน M1 เดินต่อได้', 'Run both, then click F22: M2 must stop, M1 may run on'],
    seq: [['tap', 'S2'], ['tap', 'S4'], ['toggle', 'F22'], ['runM', 'M2', false], ['runM', 'M1', true]] },
  { id: 'holdBridge', belts: B2, power: false, title: ['หน้าสัมผัสค้าง KM2 คร่อมหน้าสัมผัสอนุญาตด้วย', 'KM2 holding contact also bridges the permissive'],
    spec: () => C6.SEQ_BRIDGE({ lamps: false }), good: () => C6.SEQ_A({ lamps: false }),
    symptom: ['เริ่มเดินได้ถูกลำดับ (กด S4 อย่างเดียวไม่เดิน) แต่เมื่อ M1 หยุดด้วย S1 หรือเพราะ F21 ตัด M2 ยังเดินต่อและส่งของลงบนสายพาน M1 ที่หยุดอยู่', 'Starting works in order (S4 alone does nothing), but when M1 stops, by S1 or by an F21 trip, M2 keeps running and feeds material onto the stopped belt M1'],
    options: [['KM2 13–14 ต่อคร่อมทั้ง S4 และ KM1 83–84 หน้าสัมผัสอนุญาตจึงถูกตรวจแค่ตอนเริ่มเดิน', 'KM2 13–14 bridges both S4 and KM1 83–84, so the permissive is checked only at the start'],
      ['ไม่มีหน้าสัมผัสอนุญาต KM1 83–84', 'there is no KM1 83–84 permissive contact'], ['F22 อยู่ในวงจรกำลังเท่านั้น', 'F22 is only in the power circuit'], ['S1 ต่อขนานกับ S3', 'S1 is in parallel with S3']], answer: 0,
    fix: ['ให้ KM2 13–14 คร่อมเฉพาะ S4 ย้าย KM1 83–84 ไปไว้นอกคู่ขนานนั้น (ก่อน F22) และป้อนไฟทางเดินกระแสของ KM2 จากจุดหลัง F21 95–96 เมื่อ KM1 หลุดด้วยเหตุใดก็ตาม KM2 ต้องหลุดตาม', 'Let KM2 13–14 bridge S4 only, move KM1 83–84 outside that parallel pair (ahead of F22) and feed the KM2 path from the point after F21 95–96; whenever KM1 drops out, for whatever reason, KM2 must drop out too'],
    test: ['เดินทั้งคู่ แล้วกด S1: ทั้ง M1 และ M2 ต้องหยุด', 'Run both, then press S1: both M1 and M2 must stop'],
    seq: [['tap', 'S2'], ['tap', 'S4'], ['tap', 'S1'], ['runM', 'M1', false], ['runM', 'M2', false]] },
  { id: 'bridgeF21', belts: B2, power: false, title: ['หน้าสัมผัสหยุดย้อนลำดับคร่อม F21 แทน S1', 'Reverse-stop contact across F21 instead of S1'],
    spec: () => C6.REV_STOP({ lamps: false, _bridge: 'F21' }), good: () => C6.REV_STOP({ lamps: false }),
    symptom: ['ขณะ M1 และ M2 เดิน กด S1 แล้วหยุดทั้งสองตัว (หยุดย้อนลำดับไม่ทำงาน) และถ้า F21 ตัดขณะ M2 เดินอยู่ ไม่มีอะไรหยุดเลย', 'With M1 and M2 running, S1 stops both (the reverse-order stop does nothing), and if F21 trips while M2 runs, nothing stops at all'],
    options: [['KM2 83–84 ต่อคร่อม F21 95–96 แทนที่จะคร่อม S1', 'KM2 83–84 is across F21 95–96 instead of across S1'],
      ['ไม่มี KM2 83–84 เลย', 'there is no KM2 83–84 at all'], ['KM2 83–84 เป็นแบบปกติปิด', 'KM2 83–84 is normally closed'], ['F21 ใช้หน้าสัมผัส 97–98', 'F21 is wired on 97–98']], answer: 0,
    fix: ['ย้าย KM2 83–84 ไปคร่อมเฉพาะ S1 (จากจุดหลัง F21 95–96 ถึงจุดหลัง S1) ห้ามคร่อม F21, F1 หรือปุ่มหยุดฉุกเฉิน', 'Move KM2 83–84 across S1 only (from the point after F21 95–96 to the point after S1); never across F21, F1 or the emergency stop'],
    test: ['เดินทั้งคู่: กด S1 แล้ว M1 ต้องเดินต่อ · คลิก F21: ทั้งคู่ต้องหยุด', 'Run both: S1 must leave M1 running · click F21: both must stop'],
    seq: [['tap', 'S2'], ['tap', 'S4'], ['tap', 'S1'], ['runM', 'M1', true], ['toggle', 'F21'], ['run', false]] },
  { id: 'offAfterS1', belts: B3, power: false, title: ['ทางเดินกระแสของหน้าสัมผัสหน่วงเมื่อตัดไฟรับไฟหลัง S1', 'Off-delay holding paths fed after S1'],
    spec: () => C6.AUTO_STOP({ lamps: false, _from: 'S1' }), good: () => C6.AUTO_STOP({ lamps: false }),
    symptom: ['เริ่มเดิน M1 → M2 → M3 ได้ปกติ แต่เมื่อกด S1 ทั้งสามตัวหยุดพร้อมกันทันที ไม่มีสายพานตัวใดเดินต่อเพื่อส่งของออกจนว่าง ของจึงค้างอยู่บน M2 และ M1', 'The start M1 → M2 → M3 works, but S1 stops all three at once: no belt runs on to carry its material away, so material is left on M2 and M1'],
    options: [['ทางเดินกระแสที่มีหน้าสัมผัสหน่วงเมื่อตัดไฟ KT3 และ KT4 รับไฟจากจุดหลัง S1 แทนจุด A ก่อน S1', 'the paths with the off-delay contacts KT3 and KT4 take their supply after S1 instead of from point A ahead of S1'],
      ['KT3 และ KT4 เป็นตัวตั้งเวลาหน่วงเมื่อป้อนไฟ', 'KT3 and KT4 are on-delay timers'], ['ไม่มีหน้าสัมผัสค้าง KA1 13–14', 'there is no KA1 13–14 holding contact'], ['ตั้งเวลา KT1 และ KT2 ไว้ 0 s', 'KT1 and KT2 are set to 0 s']], answer: 0,
    fix: ['ป้อนไฟทางเดินกระแสของ KM1, KM2 และ KM3 จากจุด A (หลังโอเวอร์โหลดทุกตัว แต่ก่อน S1) ให้ KA1 เป็นตัวเดียวที่รับไฟผ่าน S1', 'Feed the KM1, KM2 and KM3 paths from point A (after all the overload contacts but ahead of S1); only KA1 is fed through S1'],
    test: ['เดินครบสามตัว แล้วกด S1 ค้างไว้ครู่หนึ่ง: M3 หยุดทันที M1 และ M2 ยังเดิน แล้วหยุดตามลำดับ', 'Run all three, then hold S1 for a moment: M3 stops at once, M1 and M2 keep running, then stop in turn'],
    seq: [['tap', 'S2'], ['wait', 7], ['runM', 'M3', true], ['hold', 'S1'], ['wait', 0.3], ['runM', 'M3', false], ['runM', 'M1', true], ['release', 'S1'], ['wait', 7], ['run', false]] },
  { id: 'kt1Open', belts: B3, power: false, title: ['คอยล์ของ KT1 ขาด', 'Coil of KT1 open'],
    spec: () => C6.AUTO3({ lamps: false, _kt1Open: true }), good: () => C6.AUTO3({ lamps: false }),
    symptom: ['กด S2 แล้ว M1 เดิน แต่ M2 และ M3 ไม่เดินเลยไม่ว่าจะรอนานเท่าไร ขั้ว A1 ของ KT1 มีไฟ แต่ KT1 ไม่นับเวลา', 'S2 starts M1, but M2 and M3 never start however long you wait; terminal A1 of KT1 is live, but KT1 never counts'],
    options: [['คอยล์ของ KT1 ขาด (วงจรเปิด) ตัวตั้งเวลาจึงไม่ทำงาน', 'the coil of KT1 is open-circuit, so the timer never runs'],
      ['KM1 83–84 ไม่ต่อ', 'KM1 83–84 does not close'], ['F23 ตัดค้างอยู่', 'F23 is tripped'], ['ตั้งเวลา KT1 ไว้ 0 s', 'KT1 is set to 0 s']], answer: 0,
    fix: ['ปลด Q1 วัดความต้านทานของคอยล์ A1–A2 ของ KT1 ถ้าขาดให้เปลี่ยนตัวตั้งเวลา', 'Switch Q1 off, measure the resistance of KT1 A1–A2 and replace the timer if its coil is open'],
    test: ['กด S2 แล้วรอ: M2 เดินที่ 3 s และ M3 ที่ 6 s', 'Press S2 and wait: M2 starts at 3 s and M3 at 6 s'],
    seq: [['tap', 'S2'], ['wait', 7], ['runM', 'M2', true], ['runM', 'M3', true]] },
  { id: 'f21InBranch', belts: B3, power: false, title: ['F21 95–96 อยู่ในทางเดินกระแสของ KM1 ใต้หน้าสัมผัสค้างของ KT4', 'F21 95–96 inside the KM1 path, under the KT4 holding contact'],
    spec: () => C6.AUTO_STOP({ lamps: false, _f21: 'KM1' }), good: () => C6.AUTO_STOP({ lamps: false }),
    symptom: ['สายพานเดินครบสามตัว เมื่อ F21 ตัด M1 ยังหมุนต่อ (F21 หยุด M1 ได้เฉพาะช่วงที่ M2 ยังไม่เดิน)', 'All three belts run; when F21 trips, M1 keeps running (F21 stops M1 only while M2 is not running yet)'],
    options: [['F21 95–96 อยู่ในส่วนของทางเดินกระแส KM1 ที่ทางค้างของหน้าสัมผัสหน่วงเมื่อตัดไฟ KT4 67–68 กับ KM1 13–14 ต่อคร่อม จึงถูกต่อข้ามขณะ KT4 มีไฟ', 'F21 95–96 sits in the part of the KM1 path that the off-delay hold KT4 67–68 + KM1 13–14 bridges, so it is bypassed while KT4 is energised'],
      ['F21 ใช้หน้าสัมผัส 97–98', 'F21 is wired on 97–98'], ['KT4 เป็นตัวตั้งเวลาหน่วงเมื่อป้อนไฟ', 'KT4 is an on-delay timer'], ['ไม่มี F21 ในวงจรกำลัง', 'F21 is not in the power circuit']], answer: 0,
    fix: ['ย้าย F21 95–96 ขึ้นไปอนุกรมกับ F22 และ F23 เหนือจุด A โอเวอร์โหลดตัวใดก็ตัดทุกทางเดินกระแสได้ทันที และไม่มีหน้าสัมผัสค้างตัวใดต่อข้ามได้', 'Move F21 95–96 up into the series chain with F22 and F23 above point A; then any overload breaks every path at once and no holding contact can bypass it'],
    test: ['เดินครบสามตัว แล้วคลิก F21: ทุกตัวต้องหยุดทันที', 'Run all three, then click F21: everything must stop at once'],
    seq: [['tap', 'S2'], ['wait', 7], ['toggle', 'F21'], ['run', false]] }];

/* ---------------- 3) status and control buttons ---------------- */
C6.state = sim => { const d = sim.dev, ms = C6.motors(sim), on = m => sim.runningM(m), any = ms.some(on);
  const list = ms.map(m => `${m} ${on(m) ? T('หมุน', 'runs') : T('หยุด', 'stopped')}`).join(' · ');
  if (sim.mains === false) return [T('ไฟดับ', 'power off'), T('รอไฟกลับมา…', 'waiting for the power…'), 'bad'];
  if (d.Q1 && !d.Q1.on) return [T('Q1 ปลด', 'Q1 off'), sim.spec.supply ? T('ไม่มีไฟทั้งวงจรกำลังและวงจรควบคุม', 'no supply to the power or the control circuit') : T('มอเตอร์ไม่มีไฟ แต่วงจรควบคุมป้อนก่อน Q1 จึงยังมีไฟ', 'the motors have no supply, but the control circuit is fed ahead of Q1 and is still live'), 'warn'];
  if (d.F1 && d.F1.blown) return [T('F1 ขาด', 'F1 blown'), T('วงจรควบคุมไม่มีไฟ คลิกที่ F1 เพื่อเปลี่ยนฟิวส์', 'the control circuit is dead; click F1 to replace it'), 'bad'];
  if (d.S0 && d.S0.pressed) return [T('หยุดฉุกเฉิน', 'emergency stop'), T(`S0 ค้างอยู่ คลิก S0 อีกครั้งเพื่อคืนปุ่ม แล้วจึงเริ่มใหม่ · ${list}`, `S0 is latched: click S0 again to release it, then start again · ${list}`), 'bad'];
  const trip = Object.keys(d).filter(id => d[id].type === 'ol' && d[id].tripped);
  if (trip.length) { const still = trip.map(id => `M${id.slice(2)}`).filter(on);
    return [T(`${trip.join(', ')} ตัด`, `${trip.join(', ')} tripped`), (still.length ? T(`${still.join(', ')} ยังหมุนอยู่แม้โอเวอร์โหลดตัดแล้ว · `, `${still.join(', ')} still running although the overload has tripped · `) : '') + `${list} · ${T('คลิกที่โอเวอร์โหลดอีกครั้งเพื่อรีเซ็ต', 'click the overload again to reset it')}`, 'bad']; }
  const off = Object.keys(d).filter(id => /^Q1\d$/.test(id) && d[id].type === 'cb' && !d[id].on);
  if (off.length) return [T(`${off.join(', ')} ปลด`, `${off.join(', ')} off`), `${list} · ${T('มอเตอร์ของสาขานั้นไม่มีไฟ', 'the motor of that branch has no supply')}`, 'warn'];
  return any ? [T('กำลังเดิน', 'running'), list, 'good'] : [T('หยุด', 'stopped'), list, 'wait']; };
C6.panel = (el, sim, o = {}) => C5.panel(el, sim, { status: C6.state, ...o });

/* ---------------- 4) conveyor line ---------------- */
/* belts: ids of the motors from the feed end to the discharge end (default C6.BELTS(number of motors)); o: { run: id => bool (instead of
   sim.runningM), speed 0.4 (belt lengths per second), gap 0.18 (parcel spacing, belt lengths), cap 6 (parcels a transfer point holds
   before it spills), feed true, max (px), onEvent({ t, kind: 'pile'|'spill'|'clear', from, onto }) }. The page calls step(dt). */
const PCL = { fill: '#c8955a', edge: '#7a5230' };
const parcel = (x, y) => `<rect x="${f1(x - 5)}" y="${f1(y - 9)}" width="10" height="9" rx="1.5" fill="${PCL.fill}" stroke="${PCL.edge}" stroke-width=".8"/>`;
C6.Conveyor = class {
  constructor(el, sim, o = {}) { this.el = el; this.sim = sim; this.o = o; this.belts = o.belts || C6.BELTS(C6.motors(sim).length); this.n = this.belts.length;
    this.v = o.speed || 0.4; this.gap = o.gap || 0.18; this.cap = o.cap || 6; this.feed = o.feed !== false;
    const n = this.n; this.BL = n >= 3 ? 172 : 230; this.DXb = this.BL - 26; this.DYb = n >= 3 ? 50 : 62; this.W = 36 + (n - 1) * this.DXb + this.BL + 96; this.H = 252;
    this.land = (this.BL - 6 - this.DXb) / this.BL;   // where material from the belt above lands, as a fraction of the belt
    el.innerHTML = '<div class="c6conv"><div class="c6cv"></div><div class="c6cs"></div></div>'; this.cv = el.querySelector('.c6cv'); this.cs = el.querySelector('.c6cs');
    this.reset(); }
  reset() { const n = this.n; this.items = []; this.piles = new Array(n).fill(0); this.drain = new Array(n).fill(0); this.flash = new Array(n).fill(0); this.floor = new Array(n).fill(0);
    this.spd = this.belts.map(id => (this.moving(id) ? 1 : 0)); this.ph = new Array(n).fill(0); this.fed = 0; this.delivered = 0; this.spilled = 0; this.t = 0; this.events = []; this.lastS = ''; this.draw(); }
  moving(id) { if (this.o.run) return !!this.o.run(id); const s = this.sim, km = s.dev['KM' + id.slice(1)]; return s.runningM ? s.runningM(id) : !!(km && km.energized); }
  setFeed(v) { this.feed = !!v; this.draw(); }
  ev(kind, k) { const e = { t: +this.t.toFixed(2), kind, from: this.belts[k], onto: this.belts[k + 1] || null }; this.events.push(e); if (this.o.onEvent) this.o.onEvent(e); }
  step(dt) { const n = this.n; let dirty = dt === 0; this.t += dt;
    for (let k = 0; k < n; k++) { const tg = this.moving(this.belts[k]) ? 1 : 0, s0 = this.spd[k];
      this.spd[k] = tg > s0 ? Math.min(1, s0 + dt / 0.4) : Math.max(0, s0 - dt / 0.6); if (this.spd[k] > 0 || s0 > 0) dirty = true; this.ph[k] += this.spd[k] * this.v * dt; }
    if (this.feed && this.spd[0] > 0) { this.fed += this.spd[0] * this.v * dt; while (this.fed >= this.gap) { this.fed -= this.gap; this.items.push({ k: 0, x: 42 / this.BL + this.fed, f: 0 }); } }
    const keep = [];
    this.items.forEach(it => { if (it.f > 0) { it.f = Math.max(0, it.f - dt); dirty = true; keep.push(it); return; }
      it.x += this.spd[it.k] * this.v * dt; if (it.x < 1) { keep.push(it); return; }
      dirty = true; const k = it.k;
      if (k === n - 1) { this.delivered++; return; }
      if (this.spd[k + 1] > 0.2 && this.piles[k] === 0) { it.k = k + 1; it.x = this.land; it.f = 0.22; keep.push(it); return; }
      if (this.piles[k] === 0) this.ev('pile', k);
      if (this.piles[k] < this.cap) this.piles[k]++; else { this.spilled++; this.floor[k]++; this.flash[k] = 1.2; this.ev('spill', k); } });
    this.items = keep;
    for (let k = 0; k < n - 1; k++) { if (this.flash[k] > 0) { this.flash[k] = Math.max(0, this.flash[k] - dt); dirty = true; }
      if (this.piles[k] > 0 && this.spd[k + 1] > 0.2) { this.drain[k] += this.spd[k + 1] * this.v * dt;
        while (this.drain[k] >= this.gap && this.piles[k] > 0) { this.drain[k] -= this.gap; this.piles[k]--; this.items.push({ k: k + 1, x: this.land, f: 0 }); dirty = true; if (!this.piles[k]) this.ev('clear', k); } }
      else this.drain[k] = 0; }
    if (dirty) this.draw(); }
  state() { const piles = {}, moving = {}, onBelt = {};
    for (let k = 0; k < this.n - 1; k++) piles[`${this.belts[k]}>${this.belts[k + 1]}`] = this.piles[k];
    this.belts.forEach((id, k) => { moving[id] = this.spd[k] > 0.5; onBelt[id] = this.items.filter(it => it.k === k).length; });
    return { delivered: this.delivered, spilled: this.spilled, piles, moving, onBelt, piling: this.piles.some(v => v > 0), spilling: this.flash.some(v => v > 0) }; }
  message() { const k = this.piles.findIndex(v => v > 0), B = this.belts, mv = this.belts.map((id, i) => this.spd[i] > 0.5);
    if (k >= 0) { const a = B[k], b = B[k + 1];
      return mv[k] ? [T(`ของกองที่จุดส่งต่อ ${a} → ${b}: ${b} หยุดแต่ ${a} ยังส่งของมา`, `Material piles up where ${a} feeds ${b}: ${b} has stopped but ${a} still delivers`), this.flash[k] > 0 ? 'bad' : 'warn'] :
        [T(`มีของกองค้างที่จุดส่งต่อ ${a} → ${b} จะถูกพาไปเมื่อ ${b} เดิน`, `A pile is left where ${a} feeds ${b}; it is carried away when ${b} runs`), 'warn']; }
    const left = this.items.length;
    if (mv.every(Boolean)) return [T('ทุกสายพานเดิน ของไหลจากต้นทางถึงปลายทาง', 'All belts move: material flows from the feed end to the discharge end'), 'good'];
    if (!mv.some(Boolean)) return [left ? T('สายพานหยุดทั้งหมด มีของค้างอยู่บนสายพาน', 'All belts are stopped with material left on them') : T('สายพานหยุดทั้งหมดและว่าง', 'All belts are stopped and empty'), 'wait'];
    return [`${B.filter((id, i) => mv[i]).join(', ')} ${T('เดิน', 'moving')} · ${B.filter((id, i) => !mv[i]).join(', ')} ${T('หยุด', 'stopped')}`, 'wait']; }
  draw() { const n = this.n, BL = this.BL, W = this.W, H = this.H, yF = 240, X = k => 36 + k * this.DXb, Y = k => 80 + k * this.DYb; let s = '';
    s += IE.L(8, yF, W - 8, yF, { col: 'var(--line)', w: 2 });
    const hx = X(0), y0 = Y(0);
    s += `<path d="M ${hx + 8} 14 L ${hx + 80} 14 L ${hx + 56} ${y0 - 18} L ${hx + 30} ${y0 - 18} Z" fill="${PCL.fill}" fill-opacity="${this.feed ? 0.45 : 0.12}" stroke="currentColor" stroke-width="1.4"/>` +
      IE.T(T('ถังป้อนของ', 'feed hopper'), hx + 86, 28, { size: 10, col: 'var(--muted)' }) + (this.feed ? '' : IE.T(T('(ปิดอยู่)', '(closed)'), hx + 86, 41, { size: 9, col: 'var(--muted)' }));
    if (this.feed && this.spd[0] > 0.2) s += IE.L(hx + 43, y0 - 17, hx + 43, y0 - 10, { col: PCL.edge, dash: '2 2', w: 2 });
    for (let k = 0; k < n; k++) { const x = X(k), y = Y(k), run = this.spd[k] > 0.5, id = this.belts[k], off = -((this.ph[k] * BL) % 12), a = this.ph[k] * BL / 6.5;
      s += IE.L(x + 28, y + 16, x + 28, yF, { col: 'var(--line)', w: 2 }) + IE.L(x + BL - 28, y + 16, x + BL - 28, yF, { col: 'var(--line)', w: 2 });
      s += `<path d="M ${x + 8} ${y} L ${x + BL - 8} ${y} A 8 8 0 0 1 ${x + BL - 8} ${y + 16} L ${x + 8} ${y + 16} A 8 8 0 0 1 ${x + 8} ${y} Z" fill="var(--panel2)" stroke="currentColor" stroke-width="1.6"/>`;
      s += `<line x1="${x + 8}" y1="${y}" x2="${x + BL - 8}" y2="${y}" stroke="var(--muted)" stroke-width="2.4" stroke-dasharray="5 7" stroke-dashoffset="${f1(off)}"/>` +
        `<line x1="${x + 8}" y1="${y + 16}" x2="${x + BL - 8}" y2="${y + 16}" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="5 7" stroke-dashoffset="${f1(-off)}"/>`;
      [x + 8, x + BL - 8].forEach(cx => { s += `<circle cx="${cx}" cy="${y + 8}" r="6.5" fill="var(--panel)" stroke="currentColor"/>` +
        IE.L(cx - 5.5 * Math.cos(a), y + 8 - 5.5 * Math.sin(a), cx + 5.5 * Math.cos(a), y + 8 + 5.5 * Math.sin(a)) + IE.L(cx + 5.5 * Math.sin(a), y + 8 - 5.5 * Math.cos(a), cx - 5.5 * Math.sin(a), y + 8 + 5.5 * Math.cos(a)); });
      // drive motor on the head pulley shaft (right of the head end), its name and state above it
      s += `<rect x="${x + BL + 4}" y="${y + 1}" width="22" height="14" rx="3" fill="${run ? '#2fa84f' : 'var(--panel)'}" stroke="currentColor"/>` + IE.T('M', x + BL + 15, y + 11.5, { size: 9, anchor: 'middle', weight: 700, col: run ? '#ffffff' : 'currentColor' }) +
        IE.L(x + BL - 2, y + 8, x + BL + 4, y + 8, { w: 2 }) + IE.T(id, x + BL + 4, y - 18, { size: 12, weight: 700 }) +
        IE.T(run ? T('เดิน', 'moving') : T('หยุด', 'stopped'), x + BL + 4, y - 6, { size: 9.5, weight: 700, col: run ? GOOD : 'var(--muted)' });
      if (run) s += `<path d="M ${x + BL / 2 - 14} ${y - 22} L ${x + BL / 2 + 10} ${y - 22} M ${x + BL / 2 + 4} ${y - 26} L ${x + BL / 2 + 10} ${y - 22} L ${x + BL / 2 + 4} ${y - 18}" stroke="${GOOD}" stroke-width="2" fill="none"/>`;
      if (k === 0) s += IE.T(T('ต้นทาง', 'feed end'), x + 10, y + 32, { size: 9.5, col: 'var(--muted)' });
      if (k === n - 1) s += IE.T(T('ปลายทาง', 'discharge end'), x + 34, y + 32, { size: 9.5, col: 'var(--muted)' }); }
    const bx = X(n - 1) + BL - 22, by = Y(n - 1) + 34;
    s += `<path d="M ${bx} ${by} L ${bx + 6} ${yF} L ${bx + 70} ${yF} L ${bx + 76} ${by}" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
    for (let j = 0; j < Math.min(this.delivered, 10); j++) s += parcel(bx + 16 + (j % 5) * 11, yF - 1 - 9 * Math.floor(j / 5));
    s += IE.T(`${T('ส่งออก', 'delivered')} ${this.delivered}`, bx + 38, by - 6, { size: 10, anchor: 'middle', weight: 700, col: 'var(--muted)' });
    this.items.forEach(it => { s += parcel(X(it.k) + it.x * BL, Y(it.k) - (it.f > 0 ? this.DYb * it.f / 0.22 : 0)); });
    for (let k = 0; k < n - 1; k++) { const lx = X(k + 1) + this.land * BL, ly = Y(k + 1);
      if (this.piles[k] > 0) { let c = 0; for (let r = 0; r < 3; r++) for (let j = 0; j < 3 - r; j++) { if (c++ >= this.piles[k]) break; s += parcel(lx + (j - (2 - r) / 2) * 11, ly - 9 * r); }
        s += IE.T(this.flash[k] > 0 ? T('ล้นหก!', 'spilling!') : T('ของกอง!', 'piling up!'), lx - 30, ly - 20, { size: 11, weight: 700, anchor: 'end', col: this.flash[k] > 0 ? 'var(--bad)' : 'var(--warn)' }); }
      for (let j = 0; j < Math.min(this.floor[k], 6); j++) s += parcel(lx - 44 + j * 11, yF - 1); }
    s += IE.T(`${T('ส่งออก', 'delivered')} ${this.delivered} · ${T('หก', 'spilled')} ${this.spilled}`, W - 10, 18, { anchor: 'end', size: 11, weight: 700, col: this.spilled ? 'var(--bad)' : 'var(--muted)' });
    this.cv.innerHTML = IE.svg(W, H, s, { max: this.o.max || W, label: 'conveyor line', cls: 'c6c' });
    const [msg, kind] = this.message(), html = `<span class="pill good">${T('ส่งออก', 'delivered')} ${this.delivered}</span> <span class="pill ${this.spilled ? 'bad' : 'wait'}">${T('หก', 'spilled')} ${this.spilled}</span> <span${kind === 'wait' ? '' : ` class="rk-${kind === 'good' ? 'ok' : kind}"`}>${msg}</span>`;
    if (html !== this.lastS) { this.cs.innerHTML = html; this.lastS = html; } }
};

/* ---------------- 5) live timing chart ---------------- */
/* signals: [{ id, kind?: 'pb'|'coil'|'timer'|'motor'|'lamp'|'ol'|'sel', label?: [th, en], sub?: [th, en], show?: 'coil'|'contact'|'both' (timers) }]
   (kind from the device type; ids M1, M2 … are motors). o: { span 20 (s), autoStart true (the clock starts at the first activity),
   edgeLabels true (switch-on time above each bar), max }. step(dt) records from the simulator; clear() starts again; rises(key) = the
   switch-on times of a row (key = id, or 'KT1:c' for a timed contact). */
C6.Timeline = class {
  constructor(el, sim, o = {}) { this.el = el; this.sim = sim; this.o = o; this.span = o.span || 20; this.auto = o.autoStart !== false; this.rows = [];
    (o.signals || []).forEach(sg => this.addRow(sg)); this.clear(); sim.on(() => { this.sample(); this.draw(); }); }
  addRow(sg) { const id = sg.id, S = this.sim, d = S.dev[id], lab = sg.label ? tt(sg.label) : id;
    const kind = sg.kind || (d ? ({ pb: 'pb', coil: 'coil', timer: 'timer', lamp: 'lamp', ol: 'ol', sel: 'sel', sen: 'sel', cb: 'sel' })[d.type] || 'coil' : /^M\d/.test(id) ? 'motor' : 'coil');
    if (kind === 'timer') { const show = sg.show || 'both', c = S.spec.els.find(e => e.d === id && e.td), tn = c && c.t ? c.t.join('–') : '67–68';
      if (show !== 'contact') this.rows.push({ key: id, kind: 'tcoil', lab, sub: T('คอยล์ A1–A2', 'coil A1–A2'), fn: () => !!S.dev[id].energized });
      if (show !== 'coil') this.rows.push({ key: `${id}:c`, kind: 'tcon', lab, sub: T(`หน้าสัมผัส ${tn}`, `contact ${tn}`), fn: () => S.act(id) }); return; }
    const sub = sg.sub ? tt(sg.sub) : { pb: T('ปุ่มกด', 'push button'), coil: T('คอยล์', 'coil'), motor: T('มอเตอร์หมุน', 'motor running'), lamp: T('หลอดติด', 'lamp lit'), ol: T('ตัด', 'tripped'), sel: T('ต่อ', 'on') }[kind];
    const fn = kind === 'pb' ? () => !!S.dev[id].pressed : kind === 'motor' ? () => (S.runningM ? S.runningM(id) : S.running()) : kind === 'ol' ? () => !!S.dev[id].tripped : kind === 'sel' ? () => !!S.dev[id].on : () => !!S.dev[id].energized;
    this.rows.push({ key: id, kind, lab, sub, fn }); }
  clear() { this.t = 0; this.started = !this.auto; this.segs = {}; this.rows.forEach(r => { this.segs[r.key] = []; }); this.sample(); this.draw(); }
  sample() { const vals = this.rows.map(r => !!r.fn());
    if (!this.started) { if (!vals.some(Boolean)) return; this.started = true; this.t = 0; }
    this.rows.forEach((r, i) => { const S = this.segs[r.key], last = S[S.length - 1], open = last && last[1] === null;
      if (vals[i] && !open) S.push([this.t, null]); else if (!vals[i] && open) last[1] = this.t; }); }
  step(dt) { if (this.started) this.t += dt; this.sample();
    const old = this.t - this.span - 2; this.rows.forEach(r => { const S = this.segs[r.key]; while (S.length && S[0][1] !== null && S[0][1] < old) S.shift(); });
    if (this.started || dt === 0) this.draw(); }
  rises(key) { return (this.segs[key] || []).map(s => s[0]); }
  draw() { const R = this.rows, rowH = 30, x0 = 132, x1 = 588, W = 600, top = 28, span = this.span, t0 = Math.max(0, this.t - span * 0.92), X = t => x0 + (x1 - x0) * (t - t0) / span;
    const yA = top + rowH * R.length, H = yA + 46, major = span > 40 ? 10 : span > 24 ? 5 : 2; let s = '';
    for (let k = Math.ceil(t0); k <= t0 + span + 1e-9; k++) { const mj = k % major === 0; s += IE.L(X(k), top - 4, X(k), yA, { col: 'var(--line)', dash: mj ? '2 2' : '1 4' }) + (mj ? IE.T(`${k}`, X(k), yA + 13, { size: 9, anchor: 'middle', col: 'var(--muted)' }) : ''); }
    s += IE.T(T('เวลา (วินาที)', 'time (s)'), x1, yA + 27, { size: 9, anchor: 'end', col: 'var(--muted)' });
    R.forEach((r, i) => { const yb = top + rowH * (i + 1) - 6, yt = yb - 17; let lastLab = -1e9;
      s += IE.T(r.lab, x0 - 8, yb - 8, { size: 11, anchor: 'end', weight: 700 }) + IE.T(r.sub, x0 - 8, yb + 2, { size: 8.5, anchor: 'end', col: 'var(--muted)' }) + IE.L(x0, yb, x1, yb, { col: 'var(--line)' });
      this.segs[r.key].forEach(([a, b]) => { const e = b === null ? this.t : b; if (e < t0) return; const xa = Math.max(x0, X(Math.max(a, t0))), xb = Math.min(x1, X(e));
        s += `<rect x="${f1(xa)}" y="${yt}" width="${f1(Math.max(2, xb - xa))}" height="15" rx="3" fill="${r.kind === 'ol' ? BAD : GOOD}" opacity=".85" stroke="none"/>`;
        if (this.o.edgeLabels !== false && r.kind !== 'pb' && a >= t0 && a - lastLab > 1.2) { s += IE.T(ED.fd(a, 1), xa + 2, yt - 2, { size: 8, col: 'var(--muted)' }); lastLab = a; } }); });
    if (this.started) { const xn = X(this.t); s += IE.L(xn, top - 8, xn, yA + 2, { col: 'var(--accent)', w: 2 }) + IE.T(`${ED.fd(this.t, 1)} s`, Math.min(xn + 4, x1 - 34), top - 12, { size: 9, weight: 700, col: 'var(--accent)' }); }
    else s += IE.T(T('นาฬิกาเริ่มนับเมื่อมีการกดปุ่มครั้งแรก', 'The clock starts at the first press'), (x0 + x1) / 2, top - 10, { size: 10, anchor: 'middle', col: 'var(--muted)' });
    s += IE.T(T('แถบเขียว = กด / มีไฟ / ต่อ / หมุน · แถบแดง = โอเวอร์โหลดตัด', 'green bar = pressed / energised / closed / running · red bar = overload tripped'), x0, H - 6, { size: 9, col: 'var(--muted)' });
    this.el.innerHTML = `<div class="c6tl">${IE.svg(W, H, s, { max: this.o.max || 680, label: 'timing chart' })}</div>`; }
};

/* ---------------- 6) summed starting current ---------------- */
/* n identical motors (the C5.startRun per-unit model: conveyor load, J = 30 × rotor inertia (up to speed in about 1.8 s), constant load torque 60 %) started together
   and staggered by T seconds. o: { T 3, n 3, J, TL, IN (rated current in A, example: only for the text), max }. Returns { svg, peak:
   { together, stagger } (× rated current of one motor), at: { together, stagger } (s), i0, iEnd, tStart, T, n, amps (with IN) }. */
C6.startSum = (o = {}) => { const n = o.n || 3, Tg = Math.max(0, o.T ?? 3), r = C5.startRun({ J: o.J ?? 30, TL: o.TL ?? 0.6, type: 'const', cls: '20' }), P = r.pts, iEnd = r.iEnd, sp = P[P.length - 1][0];
  const cur = t => { if (t < 0) return 0; if (t >= sp) return iEnd; let lo = 0, hi = P.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m][0] <= t) lo = m; else hi = m; }
    const a = P[lo], b = P[hi]; return a[1] + (b[1] - a[1]) * (t - a[0]) / Math.max(1e-9, b[0] - a[0]); };
  const tS = r.tStart ?? sp, tEnd = Math.max(4, (n - 1) * Tg + tS + 1.5), N = 900, tog = [], stg = [];
  let pT = 0, pS = 0, aT = 0, aS = 0; const sum = t => { let b = 0; for (let k = 0; k < n; k++) b += cur(t - k * Tg); return b; };
  const ts = [...Array.from({ length: N + 1 }, (_, j) => tEnd * j / N), ...Array.from({ length: n }, (_, k) => k * Tg)].sort((p, q) => p - q);
  ts.forEach(t => { const a = n * cur(t), b = sum(t); tog.push([t, a]); stg.push([t, b]); if (a > pT + 1e-9) { pT = a; aT = t; } if (b > pS + 1e-9) { pS = b; aS = t; } });
  const x0 = 58, x1 = 540, yTop = 40, yBot = 250, ymax = Math.max(10, Math.ceil((pT + 2) / 5) * 5), X = t => x0 + (x1 - x0) * t / tEnd, Y = v => yBot - (yBot - yTop) * v / ymax;
  const line = (pts, col, wd, dash) => `<polyline points="${pts.map(([t, v]) => `${f1(X(t))},${f1(Y(v))}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${wd}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  let s = IE.T(T('กระแสในสายเมน (เท่าของกระแสพิกัดของมอเตอร์ 1 ตัว)', 'line current (× rated current of one motor)'), x0, 16, { size: 10, weight: 700 });
  for (let v = 0; v <= ymax; v += 5) s += IE.L(x0, Y(v), x1, Y(v), { col: 'var(--line)', dash: v ? '1 3' : '' }) + IE.T(`${v}×`, x0 - 4, Y(v) + 3, { size: 9, anchor: 'end', col: 'var(--muted)' });
  const nt = tEnd > 16 ? 2 : 1;
  for (let t = 0; t <= tEnd + 1e-9; t += nt) s += IE.L(X(t), yTop, X(t), yBot, { col: 'var(--line)', dash: '1 4' }) + IE.T(String(t), X(t), yBot + 13, { size: 9, anchor: 'middle', col: 'var(--muted)' });
  s += IE.T(T('เวลา (วินาที)', 'time (s)'), x1, yBot + 27, { size: 9, anchor: 'end', col: 'var(--muted)' });
  if (Tg > 0) for (let k = 0; k < n; k++) { const xk = X(k * Tg); s += line(ts.map(t => [t, cur(t - k * Tg)]), '#8a93a6', 1.2, '3 3') + IE.L(xk, yTop - 6, xk, yBot, { col: 'var(--muted)', dash: '4 3' }) + IE.T(T(`M${k + 1} เริ่ม`, `M${k + 1} starts`), xk + 3, yTop - 8, { size: 9, col: 'var(--muted)', weight: 700 }); }
  s += line(tog, BAD, 2.2, '6 3') + line(stg, GOOD, 2.6);
  s += `<circle cx="${f1(X(aT))}" cy="${f1(Y(pT))}" r="4.5" fill="${BAD}" stroke="none"/>` + IE.T(T(`พร้อมกัน ${ED.fd(pT, 1)}×`, `together ${ED.fd(pT, 1)}×`), X(aT) + 10, Y(pT) - 6, { size: 10, weight: 700, col: BAD });
  s += `<circle cx="${f1(X(aS))}" cy="${f1(Y(pS))}" r="4.5" fill="${GOOD}" stroke="none"/>` + IE.T(Tg > 0 ? T(`หน่วงทีละ ${ED.fd(Tg, 1)} s: ${ED.fd(pS, 1)}×`, `staggered ${ED.fd(Tg, 1)} s: ${ED.fd(pS, 1)}×`) : '', X(aS) + 8, Y(pS) - 6, { size: 10, weight: 700, col: GOOD });
  const leg = [[BAD, T(`เริ่มพร้อมกันทั้ง ${n} ตัว`, `all ${n} started together`), '6 3'], [GOOD, T(`เริ่มทีละตัว ห่างกัน ${ED.fd(Tg, 1)} s`, `one at a time, ${ED.fd(Tg, 1)} s apart`), ''], ['#8a93a6', T('กระแสของมอเตอร์แต่ละตัว', 'current of each motor'), '3 3']];
  leg.forEach(([c, l, d], i) => { const lx = x0 + [4, 176, 352][i], ly = yBot + 46; s += IE.L(lx, ly - 4, lx + 18, ly - 4, { col: c, w: 2.4, dash: d }) + IE.T(l, lx + 22, ly, { size: 9 }); });
  s += IE.T(T('ค่าตัวอย่าง: มอเตอร์เหนี่ยวนำเหมือนกัน กระแสเริ่มเดินราว 6.5 เท่าของพิกัด', 'Example values: identical induction motors, starting current about 6.5 × rated'), x0, yBot + 62, { size: 8.5, col: 'var(--muted)' }) +
    IE.T(T(`โหลดสายพาน (แรงบิดคงที่ 60 % ความเฉื่อย 30 เท่าของโรเตอร์) เริ่มเดินเสร็จในราว ${ED.fd(tS, 1)} s`, `conveyor load (constant torque 60 %, inertia 30 × the rotor's), up to speed in about ${ED.fd(tS, 1)} s`), x0, yBot + 74, { size: 8.5, col: 'var(--muted)' });
  const svg = IE.svg(560, yBot + 82, s, { max: o.max || 680, label: 'summed starting current of several motors' });
  return { svg, peak: { together: pT, stagger: pS }, at: { together: aT, stagger: aS }, i0: r.i0, iEnd, tStart: tS, T: Tg, n, amps: o.IN ? { together: pT * o.IN, stagger: pS * o.IN, IN: o.IN } : null }; };
/* C6.StartSum(el, { panel, T 3, n 3, IN (A, optional), onResult(r) }): the chart with a delay slider and a 2 / 3 motor choice */
C6.StartSum = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.T = o.T ?? 3; this.n = o.n || 3;
    el.innerHTML = '<div class="c6sum"><div class="c6ch"></div><div class="c5res"></div></div>'; this.ch = el.querySelector('.c6ch'); this.res = el.querySelector('.c5res');
    if (o.panel) this.controls(o.panel); this.draw(); }
  controls(pn) { const ui = MC.ui, id = this.o.id || 'c6s';
    this.sl = ui.slider(pn, { id: id + 'T', label: T('เวลาหน่วงระหว่างการเริ่มเดินแต่ละตัว (KT1 = KT2)', 'delay between the starts (KT1 = KT2)'), min: 0, max: 8, step: 0.5, value: this.T, unit: 's', dec: 1, oninput: v => this.set({ T: v }) });
    ui.radio(pn, [{ id: id + '2', label: T('มอเตอร์ 2 ตัว', 'two motors'), on: this.n === 2 }, { id: id + '3', label: T('มอเตอร์ 3 ตัว', 'three motors'), on: this.n !== 2 }], k => this.set({ n: k === id + '2' ? 2 : 3 })); }
  set(p) { if (p.T !== undefined) this.T = p.T; if (p.n !== undefined) this.n = p.n; this.draw(); }
  get result() { return this.r; }
  draw() { const r = this.r = C6.startSum({ T: this.T, n: this.n, IN: this.o.IN, max: this.o.max }), a = ED.fd(r.peak.together, 1), b = ED.fd(r.peak.stagger, 1), pc = Math.round(100 * (1 - r.peak.stagger / r.peak.together));
    this.ch.innerHTML = r.svg;
    const amp = r.amps ? T(` (มอเตอร์ตัวอย่างกระแสพิกัด ${r.amps.IN} A: ราว ${Math.round(r.amps.together)} A เทียบกับ ${Math.round(r.amps.stagger)} A)`, ` (example motor with a rated current of ${r.amps.IN} A: about ${Math.round(r.amps.together)} A against ${Math.round(r.amps.stagger)} A)`) : '';
    this.res.innerHTML = r.T > 0 ? `<span class="pill good">${T(`ลดลง ${pc} %`, `${pc} % lower`)}</span> ${T(`เริ่มพร้อมกัน ${r.n} ตัว: กระแสสูงสุดราว ${a} เท่าของกระแสพิกัด 1 ตัว · เริ่มทีละตัวห่างกัน ${ED.fd(r.T, 1)} s: ราว ${b} เท่า`, `${r.n} started together: a peak of about ${a} × one motor's rated current · one at a time, ${ED.fd(r.T, 1)} s apart: about ${b} ×`)}${amp}` :
      `<span class="pill warn">${T('ไม่หน่วง', 'no delay')}</span> ${T(`เวลาหน่วง 0 s คือเริ่มพร้อมกัน: กระแสสูงสุดราว ${a} เท่าของกระแสพิกัด 1 ตัว`, `A delay of 0 s means all start together: a peak of about ${a} × one motor's rated current`)}${amp}`;
    if (this.o.onResult) this.o.onResult(r); }
};

global.C6 = C6;
})(window);
