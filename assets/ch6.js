/* ch6.js — chapter 8: sequence starting of several motors (conveyor lines).
   Conveyors: M1 = the most downstream belt (discharge end), M3 = the feed end; material flows M3 → M2 → M1. Start downstream first,
   stop upstream first, a belt that stops takes every belt upstream of it with it, the emergency stop S0 stops everything.
   Course names (the Lecture 8 slides, 14 Nov 2026), given per circuit of n motors (C6.names(n)): power fuses F1…Fn (three fuses per
   motor, each set fed straight from L1 L2 L3: there is no main breaker), overload relays F(n+1)…F(2n) of M1…Mn (95–96 / 97–98),
   control fuse F(2n+1), contactors K1…Kn; an auxiliary relay and the timers continue the K numbers (relay first, then the timers in
   order). Two motors = Lecture 8: F1 F2 power fuses, F3 F4 overloads, F5 control fuse, K1 K2. Three motors: F1–F3, F4–F6, F7, K1–K3;
   AUTO3 on-delay timers K4 K5; AUTO_STOP relay K4, on-delay timers K5 K6, off-delay timers K7 K8. S0 emergency stop (latching
   mushroom, 11–12), manual circuits S1 stop M1 · S2 start M1 · S3 stop M2 · S4 start M2 · S5 stop M3 · S6 start M3, automatic
   circuits S1 line stop · S2 line start, lamps H1…Hn green "Mn RUN" via Kn 53–54 and H(n+1)…H(2n) yellow "Mn OVERLOAD" via the
   overload's 97–98 (two motors H3 H4, three motors H4–H6), every lamp fed from terminal 2 of the control fuse (ahead of all the
   95–96 contacts). Control 230 V between L1 and N, tapped from the busbar (o.tap 'before': drawn from the supply terminals; with no
   main switch both are the same point). The power fuses blow only on a short circuit; a click on a blown set replaces it.
   Contact numbers (no number is used twice on one device; C6.CONTACTS holds this table for the pages):
     Kn   13–14 holding contact (built in; in AUTO_STOP K1 13–14 / K2 13–14 are the seal contacts in series with K8 / K7 67–68),
          21–22 NC built in (spare), front block 53–54 NO run lamp Hn, 61–62 NC and 71–72 NC spare,
          83–84 NO = permissive for the next motor (K1 → K2 path, K2 → K3 path) or the drive of the timers K4 / K5 (AUTO3);
          REV_STOP 2 motors: K2 83–84 across S1; REV_STOP 3 motors: K2 needs four NO, so it carries a front block with four NO
          (53–54, 63–64, 73–74, 83–84): 63–64 across S1, 83–84 permissive for K3; K3 83–84 across S3. Fault 1 uses K1 61–62 (NC).
     K4 (AUTO_STOP relay)  13–14 hold, 23–24 K1 path, 33–34 K2 path, 43–44 K3 path (contactor relay with four NO)
     timers  on-delay (AUTO3 K4 K5, AUTO_STOP K5 K6), 67–68 timed NO; off-delay (AUTO_STOP K7 K8), 67–68 timed NO (slow-release
          coils, as RL.Sim models them), each in series with the seal contact of the contactor it holds (K7 + K2 13–14, K8 + K1 13–14)
   Every factory takes o: { lamps: 'all' (default) | 'run' | 'ol' | false, tap: 'after' (default) | 'before' } and returns a fresh
   spec whose power drawing has one branch per motor (relay.js power.feeders, no main stage); sim.runningM('M2') tells one motor,
   sim.running() any; C6.motorOf(sim, id) = the motor whose branch holds a power fuse or an overload relay.
   1) circuits
      C6.SEQ_A(o)        two motors, manual, conveyor-correct: K2 path from the point after F3 95–96 through the permissive K1
                         83–84 (outside the K2 hold), own stop and overload per motor (rows 7; paths 1 K1, 2 hold, 3 K2, 4 hold, 5… lamps)
      C6.SEQ_NODE(o)     variant: K2 path from the holding node of K1 (after S2 ∥ K1 13–14), no permissive contact (rows 8)
      C6.SEQ_BRIDGE(o)   "what goes wrong": K2 path fed from F5 2 and K2 13–14 bridging S4 and the permissive K1 83–84 (start-only
                         check): S1 or an F3 trip stops M1 but M2 runs on (pile-up)
      C6.SEQ_NOOL(o)     SEQ_A with F4 only in the power circuit (no F4 95–96, no H4): an F4 trip leaves M2 running
      C6.REV_STOP(o)     SEQ_A + K2 83–84 across S1 only: S1 does nothing while M2 runs (stop M2 with S3 first); o.n 3: three
                         motors (S5/S6, K2 63–64 across S1, K3 83–84 across S3; overloads F4 F5 F6, control fuse F7)
      C6.OL_ARR(mode, o) three conveyors, line stop S1, starts S2 (M1) S3 (M2) S4 (M3), the start order checked by K1 83–84 / K2 83–84 in
                         series with the start button only (the hold bridges both), so the overload wiring alone decides who stops:
                         'series' F4 F5 F6 at the top (any overload stops all), 'own' (alias 'indep'; EMC9 "COMMON") each overload in
                         its own path (stops only its motor), 'cascade' a tree: path 2 fed after F4, path 3 after F5 (the overload of Mn
                         stops Mn and every belt upstream). C6.OL_STOPS(mode) = which belts stop on each overload, from the model
      C6.AUTO3(o)        three conveyors, automatic start: S0 → S1 → (S2 ∥ K1 13–14) → F4 → K1; from the point after S1: K1 83–84 →
                         K4; K4 67–68 → F5 → K2; K2 83–84 → K5; K5 67–68 → F6 → K3 (cascade on overload for free);
                         o.olAll: F4 F5 F6 in series under S0 instead; o.T (both timers, default 3 s), o.T1 (K4), o.T2 (K5)
      C6.AUTO_STOP(o)    start M1 → M2 → M3 and stop M3 → M2 → M1 (UMC5 Fig 12.13 / Ex10 Exp 10.5 redrawn to the L side, plus seal
                         contacts): point A = F7 → S0 → F4 → F5 → F6; A → S1 → (S2 ∥ K4 13–14) → K4; A → (K4 23–24 ∥ K8 67–68 +
                         K1 13–14) → K1 ∥ K5; A → ((K4 33–34 + K5 67–68) ∥ K7 67–68 + K2 13–14) → K2 ∥ K6 ∥ K8;
                         A → K4 43–44 + K6 67–68 → K3 ∥ K7 (rows 8; paths 1 K4, 2 hold, 3 K1, 4 K8 hold + K5 coil, 5 K2, 6 K7
                         hold + K6 coil, 7 K8 coil, 8 K3, 9 K7 coil). The seal contacts let an off-delay contact keep in only a contactor
                         that is still in: during a normal stop K1 / K2 are energised when their off-delay hold takes over, but once a coil
                         has dropped out (S0, a power cut, an overload trip) its own 13–14 is open and the still-closed off-delay contact cannot
                         re-energise it, so nothing restarts (IEC 60204-1 7.5 and 10.7). o.seal false: the holds without them (K8 67–68 and
                         K7 67–68 straight from A to the coils, as Exp 10.5): an interruption shorter than the delay restarts K1 and K2.
                         Delays: o.T (all four, default 3 s), o.T1 o.T2 (on-delay K5 K6), o.T3 o.T4 (off-delay K7 K8)
      C6.BELTS(n)        ['M3', 'M2', 'M1'] (feed end first) · C6.motors(sim) motor ids of a simulator · C6.CONTACTS contact table
   2) C6.FAULTS          nine fault-finding cases in the format of C5.FAULTS { id, title, spec, good, symptom, options (answer = 0),
                         answer, fix, test, seq } plus belts (for C6.Conveyor) and power (true when the power drawing shows the clue);
      C6.runSeq(sim, seq) runs a test sequence (C5 ops + ['wait', s], ['runM', 'M2', bool], ['on', id, bool]);
      C6.faultTrial(c) → { bad, good } (good true and bad false when the case works); C6.trial(spec, seq) → bool;
      C6.events(spec, acts, o) runs a hidden simulator through timed actions [[t, op, …args]] and returns { list: [{ t, id, v }],
                         at(id, v = true, after = 0) } (motors, coils, timers and timed contacts 'K5:c')
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
/* course names of an n-motor circuit (Lecture 8 rule): fu(i) power fuses of Mi, ol(i) overload relay of Mi, cf control fuse,
   k(i) contactor of Mi, h(i) run lamp of Mi, ho(i) overload lamp of Mi */
const NM = n => ({ n, fu: i => `F${i}`, ol: i => `F${n + i}`, cf: `F${2 * n + 1}`, k: i => `K${i}`, h: i => `H${i}`, ho: i => `H${n + i}` });
C6.names = NM;
const DV = {
  fu: i => ({ type: 'fuse', name: [`F${i} ฟิวส์วงจรกำลังของ M${i}`, `F${i} M${i} power fuses`] }),
  cf: id => ({ type: 'fuse', name: [`${id} ฟิวส์วงจรควบคุม`, `${id} control fuse`] }),
  ol: (id, i) => ({ type: 'ol', name: [`${id} โอเวอร์โหลด M${i} ตัด / รีเซ็ต`, `${id} M${i} overload trip / reset`] }),
  S0: () => ({ type: 'pb', cap: 'red', latch: true, name: ['S0 หยุดฉุกเฉิน', 'S0 emergency stop'] }),
  stop: (id, i) => ({ type: 'pb', cap: 'black', name: [`${id} หยุด M${i}`, `${id} M${i} stop`] }),
  start: (id, i) => ({ type: 'pb', cap: 'white', name: [`${id} เริ่ม M${i}`, `${id} M${i} start`] }),
  lineStop: () => ({ type: 'pb', cap: 'black', name: ['S1 หยุดทั้งสาย', 'S1 line stop'] }),
  lineStart: () => ({ type: 'pb', cap: 'white', name: ['S2 เริ่มทั้งสาย', 'S2 line start'] }),
  K: () => ({ type: 'coil' }), KT: (mode, T0) => ({ type: 'timer', mode, T: T0 }),
  run: i => ({ type: 'lamp', color: C6.COL.run, code: 'GN', name: [`H${i} M${i} เดิน`, `H${i} M${i} run`] }),
  olH: (id, i) => ({ type: 'lamp', color: C6.COL.ol, code: 'YE', name: [`${id} M${i} โอเวอร์โหลด`, `${id} M${i} overload`] }) };
const lampSel = o => { const v = o.lamps === undefined ? 'all' : o.lamps; return { run: v === 'all' || v === 'run', ol: v === 'all' || v === 'ol' }; };
/* devices of an n-motor circuit in the order the panel shows them: power fuses, overloads, control fuse, buttons, coils, relay and
   timers (extra), lamps */
const devs = (n, btn, o, extra = {}) => { const N = NM(n), D = {}, L = lampSel(o);
  for (let i = 1; i <= n; i++) D[N.fu(i)] = DV.fu(i);
  for (let i = 1; i <= n; i++) D[N.ol(i)] = DV.ol(N.ol(i), i);
  D[N.cf] = DV.cf(N.cf);
  Object.assign(D, btn); for (let i = 1; i <= n; i++) D[N.k(i)] = DV.K(); Object.assign(D, extra);
  if (L.run) for (let i = 1; i <= n; i++) D[N.h(i)] = DV.run(i);
  if (L.ol) for (let i = 1; i <= n; i++) D[N.ho(i)] = DV.olH(N.ho(i), i);
  return D; };
const w = (pts, dots) => (dots && dots.length ? { k: 'w', pts, dots } : { k: 'w', pts }), vw = (x, y, h = 1) => ({ k: 'w', x, y, h });
const fuse = n => ({ k: 'fuse', d: NM(n).cf, x: 0, y: 0, t: ['1', '2'] }), olc = (d, x, y) => ({ k: 'NC', d, x, y, t: ['95', '96'], op: 'thr' });
const est = (x, y) => ({ k: 'NC', d: 'S0', x, y, t: ['11', '12'], op: 'mush' }), stp = (d, x, y) => ({ k: 'NC', d, x, y, t: ['11', '12'], op: 'pb' });
const sta = (d, x, y, h = 1) => ({ k: 'NO', d, x, y, h, t: ['13', '14'], op: 'pb' }), coil = (d, x, y) => ({ k: 'coil', d, x, y, t: ['A1', 'A2'] });
const no = (d, a, b, x, y, h = 1) => ({ k: 'NO', d, x, y, h, t: [a, b] }), nc = (d, a, b, x, y, h = 1) => ({ k: 'NC', d, x, y, h, t: [a, b] });
const tno = (d, x, y, td, h = 1) => ({ k: 'NO', d, x, y, h, t: ['67', '68'], td });
/* lamp columns from x0, each fed from terminal 2 of the control fuse (node (0, 1)) along row 1: contact in row rows − 2, lamp to N.
   via = other columns whose top sits on row 1 (they get junction dots); skipOl = motors without an overload lamp */
const lampEls = (n, o, x0, rows, via = [], skipOl = []) => { const L = lampSel(o), N = NM(n), list = [];
  if (L.run) for (let i = 1; i <= n; i++) list.push([N.h(i), { k: 'NO', d: N.k(i), t: ['53', '54'] }]);
  if (L.ol) for (let i = 1; i <= n; i++) if (!skipOl.includes(i)) list.push([N.ho(i), { k: 'NO', d: N.ol(i), t: ['97', '98'], op: 'thr' }]);
  const yc = rows - 2, els = [], xs = list.map((l, i) => x0 + i);
  list.forEach(([h, c], i) => { const x = xs[i]; els.push(vw(x, 1, yc - 1), { ...c, x, y: yc }, { k: 'lamp', d: h, x, y: yc + 1, t: ['X1', 'X2'] }); });
  const pts = [...new Set([0, ...via, ...xs])].sort((a, b) => a - b).map(x => [x, 1]);
  if (pts.length > 1) els.push(w(pts, pts.map((p, i) => i).slice(0, -1)));
  return els; };
/* power circuit as the Lecture 8 slide: one branch per motor straight from L1 L2 L3 (no main stage): power fuses Fi → Ki → overload */
const PW = (n, o = {}) => { const N = NM(n); return { full: true, tap: o.tap === 'before' ? 'before' : 'after',
  feeders: Array.from({ length: n }, (_, j) => ({ stages: [{ k: 'fuse', d: N.fu(j + 1) }, { k: 'mainNO', d: N.k(j + 1) }, { k: 'therm', d: N.ol(j + 1) }], motor: `M${j + 1}` })) }; };
const mk = (n, rows, D, els, o) => ({ rows, devices: D, power: PW(n, o), els });
C6.BELTS = n => Array.from({ length: n }, (_, i) => `M${n - i}`);
C6.motors = sim => (sim.spec.power && sim.spec.power.feeders ? sim.spec.power.feeders.map(f => f.motor) : ['M1']);
/* the motor whose branch holds device id (its power fuses or its overload relay), or null */
C6.motorOf = (sim, id) => { const P = sim.spec.power, f = P && P.feeders ? P.feeders.find(q => q.stages.some(s => s.d === id && s.k !== 'mainNO')) : null; return f ? f.motor : null; };

const man2 = o => devs(2, { S1: DV.stop('S1', 1), S2: DV.start('S2', 1), S3: DV.stop('S3', 2), S4: DV.start('S4', 2) }, o);
/* path 1 of the two-motor manual circuits (rows 7): F5, F3 95–96, S1, S2 ∥ K1 13–14 (column 1), K1 */
const path1 = () => [fuse(2), olc('F3', 0, 1), stp('S1', 0, 2), sta('S2', 0, 3), vw(0, 4, 2), coil('K1', 0, 6), no('K1', '13', '14', 1, 3), w([[0, 3], [1, 3]], [0]), w([[0, 4], [1, 4]], [0])];
/* internal options used by C6.FAULTS and page 8.5: _perm 'NC' (K1 61–62 instead of 83–84), _noOl (no F4 95–96), _weld (K2 13–14
   welded), _holdBoth (K1 83–84 moved under S4, so that K2 13–14 bridges S4 and the permissive contact: an S1 press leaves M2 running) */
C6.SEQ_A = (o = {}) => mk(2, 7, man2(o), [...path1(), w([[0, 2], [2, 2]], [0]),
  ...(o._holdBoth ? [olc('F4', 2, 2), stp('S3', 2, 3), sta('S4', 2, 4), no('K1', '83', '84', 2, 5), coil('K2', 2, 6),
    { ...no('K2', '13', '14', 3, 4, 2), ...(o._weld ? { welded: true } : {}) }, w([[2, 4], [3, 4]], [0]), w([[2, 6], [3, 6]], [0])]
    : [o._perm === 'NC' ? nc('K1', '61', '62', 2, 2) : no('K1', '83', '84', 2, 2), o._noOl ? vw(2, 3) : olc('F4', 2, 3), stp('S3', 2, 4), sta('S4', 2, 5), coil('K2', 2, 6),
      { ...no('K2', '13', '14', 3, 5), ...(o._weld ? { welded: true } : {}) }, w([[2, 5], [3, 5]], [0]), w([[2, 6], [3, 6]], [0])]),
  ...lampEls(2, o, 4, 7, [], o._noOl ? [2] : [])], o);
C6.SEQ_NODE = (o = {}) => mk(2, 8, man2(o), [fuse(2), olc('F3', 0, 1), stp('S1', 0, 2), sta('S2', 0, 3), vw(0, 4, 3), coil('K1', 0, 7),
  no('K1', '13', '14', 1, 3), w([[0, 3], [1, 3]], [0]), w([[0, 4], [1, 4], [2, 4]], [0, 1]),
  olc('F4', 2, 4), stp('S3', 2, 5), sta('S4', 2, 6), coil('K2', 2, 7), no('K2', '13', '14', 3, 6), w([[2, 6], [3, 6]], [0]), w([[2, 7], [3, 7]], [0]),
  ...lampEls(2, o, 4, 8)], o);
C6.SEQ_BRIDGE = (o = {}) => mk(2, 7, man2(o), [...path1(),
  olc('F4', 2, 1), stp('S3', 2, 2), sta('S4', 2, 3), no('K1', '83', '84', 2, 4), vw(2, 5), coil('K2', 2, 6),
  no('K2', '13', '14', 3, 3, 2), w([[2, 3], [3, 3]], [0]), w([[2, 5], [3, 5]], [0]),
  ...lampEls(2, o, 4, 7, [2])], o);
C6.SEQ_NOOL = (o = {}) => { const s = C6.SEQ_A({ ...o, _noOl: true }); delete s.devices.H4; return s; };
/* reverse-order stop; internal option _bridge 'OL' puts the K2 contact across M1's overload contact (95–96) instead of S1 (fault 6) */
C6.REV_STOP = (o = {}) => { const n = o.n === 3 ? 3 : 2, N = NM(n), br = o._bridge === 'OL', btn = { S1: DV.stop('S1', 1), S2: DV.start('S2', 1), S3: DV.stop('S3', 2), S4: DV.start('S4', 2) };
  if (n === 3) { btn.S5 = DV.stop('S5', 3); btn.S6 = DV.start('S6', 3); }
  const els = [fuse(n), olc(N.ol(1), 0, 1), stp('S1', 0, 2), sta('S2', 0, 3), vw(0, 4, 2), coil('K1', 0, 6),
    n === 3 ? no('K2', '63', '64', 1, br ? 1 : 2) : no('K2', '83', '84', 1, br ? 1 : 2),
    no('K1', '13', '14', 2, 3), br ? w([[0, 3], [2, 3]], [0]) : w([[0, 3], [1, 3], [2, 3]], [0, 1]), w([[0, 4], [2, 4]], [0]),
    no('K1', '83', '84', 3, 2), olc(N.ol(2), 3, 3), stp('S3', 3, 4), sta('S4', 3, 5), coil('K2', 3, 6)];
  if (n === 2) els.push(w([[0, 2], [1, 2], [3, 2]], [0, 1]), no('K2', '13', '14', 4, 5), w([[3, 5], [4, 5]], [0]), w([[3, 6], [4, 6]], [0]), ...lampEls(2, o, 5, 7, br ? [1] : []));
  else els.push(w([[0, 2], [1, 2], [3, 2], [6, 2]], [0, 1, 2]), no('K3', '83', '84', 4, 4), w([[3, 4], [4, 4]], [0]), no('K2', '13', '14', 5, 5), w([[3, 5], [4, 5], [5, 5]], [0, 1]), w([[3, 6], [5, 6]], [0]),
    no('K2', '83', '84', 6, 2), olc(N.ol(3), 6, 3), stp('S5', 6, 4), sta('S6', 6, 5), coil('K3', 6, 6), no('K3', '13', '14', 7, 5), w([[6, 5], [7, 5]], [0]), w([[6, 6], [7, 6]], [0]), ...lampEls(3, o, 8, 7, br ? [1] : []));
  return mk(n, 7, devs(n, btn, o), els, o); };
/* overload arrangements on three conveyors (overloads F4 F5 F6 of M1 M2 M3, control fuse F7) */
C6.OL_ARR = (mode = 'cascade', o = {}) => { mode = mode === 'indep' ? 'own' : ['series', 'own', 'cascade'].includes(mode) ? mode : 'cascade';
  const D = devs(3, { S1: DV.lineStop(), S2: DV.start('S2', 1), S3: DV.start('S3', 2), S4: DV.start('S4', 3) }, o);
  if (mode === 'cascade') return mk(3, 10, D, [fuse(3), vw(0, 1, 2), stp('S1', 0, 3), olc('F4', 0, 4), vw(0, 5), sta('S2', 0, 6), vw(0, 7, 2), coil('K1', 0, 9),
    no('K1', '13', '14', 1, 6), w([[0, 6], [1, 6]], [0]), w([[0, 7], [1, 7]], [0]),
    w([[0, 5], [2, 5]], [0]), olc('F5', 2, 5), sta('S3', 2, 6), no('K1', '83', '84', 2, 7), vw(2, 8), coil('K2', 2, 9),
    no('K2', '13', '14', 3, 6, 2), w([[2, 6], [3, 6], [4, 6]], [0, 1]), w([[2, 8], [3, 8]], [0]),
    olc('F6', 4, 6), sta('S4', 4, 7), no('K2', '83', '84', 4, 8), coil('K3', 4, 9), no('K3', '13', '14', 5, 7, 2), w([[4, 7], [5, 7]], [0]), w([[4, 9], [5, 9]], [0]),
    ...lampEls(3, o, 6, 10)], o);
  const ser = mode === 'series';
  return mk(3, 9, D, [fuse(3), ...(ser ? [olc('F4', 0, 1), olc('F5', 0, 2), olc('F6', 0, 3)] : [vw(0, 1, 3)]), stp('S1', 0, 4),
    ser ? vw(0, 5) : olc('F4', 0, 5), sta('S2', 0, 6), vw(0, 7), coil('K1', 0, 8), no('K1', '13', '14', 1, 6), w([[0, 6], [1, 6]], [0]), w([[0, 7], [1, 7]], [0]),
    w([[0, 5], [2, 5], [4, 5]], [0, 1]),
    ser ? vw(2, 5) : olc('F5', 2, 5), sta('S3', 2, 6), no('K1', '83', '84', 2, 7), coil('K2', 2, 8), no('K2', '13', '14', 3, 6, 2), w([[2, 6], [3, 6]], [0]), w([[2, 8], [3, 8]], [0]),
    ser ? vw(4, 5) : olc('F6', 4, 5), sta('S4', 4, 6), no('K2', '83', '84', 4, 7), coil('K3', 4, 8), no('K3', '13', '14', 5, 6, 2), w([[4, 6], [5, 6]], [0]), w([[4, 8], [5, 8]], [0]),
    ...lampEls(3, o, 6, 9)], o); };
/* which belts stop when each overload trips, with all three running: { F4: ['M1', 'M2', 'M3'], F5: […], F6: […] } (from the model) */
C6.OL_STOPS = mode => { const out = {}, N = NM(3);
  [1, 2, 3].forEach(i => { const s = hid(C6.OL_ARR(mode, { lamps: false })); C6.runSeq(s, [['tap', 'S2'], ['tap', 'S3'], ['tap', 'S4'], ['toggle', N.ol(i)]]);
    out[N.ol(i)] = ['M1', 'M2', 'M3'].filter(m => !s.runningM(m)); });
  return out; };
/* automatic start of three conveyors with the on-delay timers K4, K5; internal options _weld3 (K3 welds when it first closes),
   _t1Open (the coil of K4 is open) */
C6.AUTO3 = (o = {}) => { const all = !!o.olAll, T1 = o.T1 ?? o.T ?? C6.T, T2 = o.T2 ?? o.T ?? C6.T;
  const D = devs(3, { S0: DV.S0(), S1: DV.lineStop(), S2: DV.lineStart() }, o, { K4: DV.KT('on', T1), K5: DV.KT('on', T2) });
  if (o._weld3) D.K3.weldOnClose = true;
  const kt1 = { ...coil('K4', 2, all ? 7 : 5), ...(o._t1Open ? { open: true } : {}) };
  if (all) return mk(3, 8, D, [fuse(3), est(0, 1), olc('F4', 0, 2), olc('F5', 0, 3), olc('F6', 0, 4), stp('S1', 0, 5), sta('S2', 0, 6), coil('K1', 0, 7),
    no('K1', '13', '14', 1, 6), w([[0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6]], [0, 1, 2, 3, 4]), w([[0, 7], [1, 7]], [0]),
    no('K1', '83', '84', 2, 6), kt1, tno('K4', 3, 6, 'on'), coil('K2', 3, 7), no('K2', '83', '84', 4, 6), coil('K5', 4, 7), tno('K5', 5, 6, 'on'), coil('K3', 5, 7),
    ...lampEls(3, o, 6, 8)], o);
  return mk(3, 6, D, [fuse(3), est(0, 1), stp('S1', 0, 2), sta('S2', 0, 3), olc('F4', 0, 4), coil('K1', 0, 5),
    no('K1', '13', '14', 1, 3), w([[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3]], [0, 1, 2, 3, 4]), w([[0, 4], [1, 4]], [0]),
    no('K1', '83', '84', 2, 3), vw(2, 4), kt1, tno('K4', 3, 3, 'on'), olc('F5', 3, 4), coil('K2', 3, 5),
    no('K2', '83', '84', 4, 3), vw(4, 4), coil('K5', 4, 5), tno('K5', 5, 3, 'on'), olc('F6', 5, 4), coil('K3', 5, 5),
    ...lampEls(3, o, 6, 6)], o); };
/* timed start and timed stop (relay K4, on-delay K5 K6, off-delay K7 K8); o.seal false drops the seal contacts K1 13–14 / K2 13–14
   (the off-delay holds straight from point A to the coils, page 8.4 step 5); internal options _from 'S1' (every branch fed after S1,
   fault 7), _ol1In (F4 inside the K1 path under the K8 hold, fault 9) */
C6.AUTO_STOP = (o = {}) => { const T0 = o.T ?? C6.T, s1 = o._from === 'S1', oi = !!o._ol1In, seal = o.seal !== false;
  const D = devs(3, { S0: DV.S0(), S1: DV.lineStop(), S2: DV.lineStart() }, o, { K4: DV.K(), K5: DV.KT('on', o.T1 ?? T0), K6: DV.KT('on', o.T2 ?? T0), K7: DV.KT('off', o.T3 ?? T0), K8: DV.KT('off', o.T4 ?? T0) });
  /* off-delay hold of contactor k in column x: the timed contact from point A (row 5), then the seal contact k 13–14 (row 6), or one tall contact */
  const hold = (kt, km, x) => (seal ? [tno(kt, x, 5, 'off'), no(km, '13', '14', x, 6)] : [tno(kt, x, 5, 'off', 2)]);
  return mk(3, 8, D, [fuse(3), est(0, 1), oi ? vw(0, 2) : olc('F4', 0, 2), olc('F5', 0, 3), olc('F6', 0, 4), stp('S1', 0, 5), sta('S2', 0, 6), coil('K4', 0, 7),
    no('K4', '13', '14', 1, 6), w([[0, 6], [1, 6]], [0]), w([[0, 7], [1, 7]], [0]),
    s1 ? w([[1, 6], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [7, 5]], [0, 2, 3, 4, 5]) : w([[0, 5], [2, 5], [3, 5], [4, 5], [5, 5], [7, 5]], [0, 1, 2, 3, 4]),
    no('K4', '23', '24', 2, 5), oi ? olc('F4', 2, 6) : vw(2, 6), coil('K1', 2, 7), ...hold('K8', 'K1', 3), w([[2, 7], [3, 7]], [0, 1]), coil('K5', 3, 7),
    no('K4', '33', '34', 4, 5), tno('K5', 4, 6, 'on'), coil('K2', 4, 7), ...hold('K7', 'K2', 5), w([[4, 7], [5, 7], [6, 7]], [0, 1]), coil('K6', 5, 7), coil('K8', 6, 7),
    no('K4', '43', '44', 7, 5), tno('K6', 7, 6, 'on'), coil('K3', 7, 7), coil('K7', 8, 7), w([[7, 7], [8, 7]], [0]),
    ...lampEls(3, o, 9, 8)], o); };
/* contact table of the chapter: [devices, terminals, [th, en] use]; K4 and up mean different devices in the circuits of pages 8.3 and 8.4 */
C6.CONTACTS = [
  ['K1, K2, K3', '13–14', ['หน้าสัมผัสค้างตัวเอง (มีในตัวคอนแทกเตอร์)', 'holding contact (built in)']],
  ['K1, K2', '13–14', ['วงจรเริ่มและหยุดอัตโนมัติ (หน้า 8.4): หน้าสัมผัสค้างตัวเอง (seal contact) อนุกรมกับ K8 67–68 (K1) และ K7 67–68 (K2) หน้าสัมผัสหน่วงเมื่อตัดไฟจึงค้างได้เฉพาะคอนแทกเตอร์ที่ยังดูดอยู่ ไฟดับ กด S0 หรือโอเวอร์โหลดตัดแล้ว ไม่มีอะไรเริ่มเอง', 'timed start and stop (page 8.4): seal contact in series with K8 67–68 (K1) and K7 67–68 (K2), so an off-delay contact can keep in only a contactor that is still in; after a power failure, S0 or an overload trip nothing restarts']],
  ['K1, K2, K3', '21–22', ['หน้าสัมผัสปกติปิดในตัว: ว่าง (ใช้กับหลอดหยุดสีขาวได้)', 'normally closed, built in: spare (can drive a white "stopped" lamp)']],
  ['K1, K2, K3', '53–54', ['ชุดหน้าสัมผัสเสริมด้านหน้า: หลอดเดิน H1, H2, H3', 'front block: run lamps H1, H2, H3']],
  ['K1, K2, K3', '61–62, 71–72', ['ชุดหน้าสัมผัสเสริมด้านหน้า: ปกติปิด ว่าง', 'front block: normally closed, spare']],
  ['K1, K2', '83–84', ['หน้าสัมผัสอนุญาตของมอเตอร์ตัวถัดไป (K1 → ทางของ K2, K2 → ทางของ K3) หรือป้อนไฟตัวตั้งเวลา K4, K5 ของวงจรเริ่มอัตโนมัติ (หน้า 8.3)', 'permissive for the next motor (K1 → K2 path, K2 → K3 path) or the supply of timers K4, K5 of the automatic start (page 8.3)']],
  ['K2', '83–84', ['หยุดย้อนลำดับ 2 มอเตอร์: ต่อคร่อม S1', 'reverse-order stop, two motors: across S1']],
  ['K2', '63–64', ['หยุดย้อนลำดับ 3 มอเตอร์: ต่อคร่อม S1 (K2 ต้องมีหน้าสัมผัสปกติเปิด 4 ตัว จึงใช้ชุดหน้าสัมผัสเสริมแบบปกติเปิด 4 ตัว 53–54, 63–64, 73–74, 83–84)', 'reverse-order stop, three motors: across S1 (K2 needs four NO contacts, so it carries a front block with four NO: 53–54, 63–64, 73–74, 83–84)']],
  ['K3', '83–84', ['หยุดย้อนลำดับ 3 มอเตอร์: ต่อคร่อม S3', 'reverse-order stop, three motors: across S3']],
  ['K4, K5', '67–68', ['เริ่มอัตโนมัติ (หน้า 8.3): ตัวตั้งเวลาหน่วงเมื่อป้อนไฟ (on-delay) หน้าสัมผัสปกติเปิด เริ่มเดินมอเตอร์ตัวถัดไป', 'automatic start (page 8.3): on-delay timed NO, starts the next motor']],
  ['K4', '13–14, 23–24, 33–34, 43–44', ['เริ่มและหยุดอัตโนมัติ (หน้า 8.4) รีเลย์ช่วย: ค้างตัวเอง, ทางของ K1, ทางของ K2, ทางของ K3', 'timed start and stop (page 8.4), auxiliary relay: hold, K1 path, K2 path, K3 path']],
  ['K5, K6', '67–68', ['เริ่มและหยุดอัตโนมัติ (หน้า 8.4): ตัวตั้งเวลาหน่วงเมื่อป้อนไฟ (on-delay) หน้าสัมผัสปกติเปิด เริ่มเดินมอเตอร์ตัวถัดไป', 'timed start and stop (page 8.4): on-delay timed NO, starts the next motor']],
  ['K7, K8', '67–68', ['เริ่มและหยุดอัตโนมัติ (หน้า 8.4): ตัวตั้งเวลาหน่วงเมื่อตัดไฟ (off-delay) หน้าสัมผัสปกติเปิด ค้าง K2, K1 ไว้ระหว่างหยุดตามลำดับ (อนุกรมกับ K2 13–14, K1 13–14)', 'timed start and stop (page 8.4): off-delay timed NO, holds K2, K1 while the line stops in turn (in series with K2 13–14, K1 13–14)']],
  ['F3, F4 · F4, F5, F6', '95–96, 97–98', ['โอเวอร์โหลดของ M1, M2 (สองมอเตอร์) หรือ M1, M2, M3 (สามมอเตอร์): เปิดเมื่อตัด / หลอดโอเวอร์โหลด H3, H4 หรือ H4, H5, H6', 'overload relays of M1, M2 (two motors) or M1, M2, M3 (three motors): opens on a trip / overload lamps H3, H4 or H4, H5, H6']],
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
   timed contacts ('K5:c') as { t, id, v }; o: { dt 0.01, until 12, watch: [ids] } */
C6.events = (spec, acts = [], o = {}) => { const sim = hid(spec), dt = o.dt || 0.01, until = o.until ?? 12, list = [], st = {};
  const W = [...C6.motors(sim).map(m => [m, () => sim.runningM(m)]), ...Object.keys(sim.dev).filter(id => ['coil', 'timer', 'lamp'].includes(sim.dev[id].type)).map(id => [id, () => !!sim.dev[id].energized]),
    ...Object.keys(sim.dev).filter(id => sim.dev[id].type === 'timer').map(id => [`${id}:c`, () => sim.act(id)])].filter(([k]) => !o.watch || o.watch.includes(k.split(':')[0]));
  let now = 0, k = 0; const A = acts.slice().sort((p, q) => p[0] - q[0]);
  const snap = () => W.forEach(([key, fn]) => { const v = !!fn(); if (st[key] !== v) { if (st[key] !== undefined || v) list.push({ t: +now.toFixed(3), id: key, v }); st[key] = v; } });
  snap();
  while (now <= until + 1e-9) { while (k < A.length && A[k][0] <= now + 1e-9) { C6.runSeq(sim, [A[k].slice(1)]); k++; snap(); } sim.step(dt); now += dt; snap(); }
  return { list, at: (id, v = true, after = 0) => { const e = list.find(x => x.id === id && x.v === v && x.t >= after - 1e-9); return e ? e.t : null; } }; };
const B2 = C6.BELTS(2), B3 = C6.BELTS(3);
/* names per circuit: two-motor cases F3 F4 overloads, F5 control fuse; three-motor cases F4 F5 F6 overloads, F7 control fuse,
   AUTO3 timers K4 K5, AUTO_STOP relay K4 and timers K5–K8 */
C6.FAULTS = [
  { id: 'permNC', belts: B2, power: false, title: ['หน้าสัมผัสอนุญาตของ K1 เป็นแบบปกติปิด', 'K1 permissive contact wired normally closed'],
    spec: () => C6.SEQ_A({ lamps: false, _perm: 'NC' }), good: () => C6.SEQ_A({ lamps: false }),
    symptom: ['กด S4 แล้ว M2 เดินทั้งที่ M1 ยังหยุดอยู่ และเมื่อกด S2 ให้ M1 เดิน M2 กลับหยุดเอง', 'S4 starts M2 although M1 is stopped, and when S2 starts M1, M2 stops by itself'],
    options: [['ทางเดินกระแสของ K2 ใช้หน้าสัมผัสปกติปิด K1 61–62 แทนหน้าสัมผัสปกติเปิด K1 83–84', 'the K2 path uses the normally closed K1 61–62 instead of the normally open K1 83–84'],
      ['ไม่มีหน้าสัมผัสค้าง K2 13–14', 'there is no K2 13–14 holding contact'], ['S3 ต่อที่หน้าสัมผัส 13–14 แทน 11–12', 'S3 is wired on 13–14 instead of 11–12'], ['F4 ตัดค้างอยู่', 'F4 is tripped']], answer: 0,
    fix: ['ใช้หน้าสัมผัสปกติเปิด K1 83–84 เป็นหน้าสัมผัสอนุญาต ทางเดินกระแสของ K2 จะต่อได้เฉพาะเมื่อ K1 ดูดแล้ว', 'Use the normally open K1 83–84 as the permissive contact; the K2 path can then close only once K1 has pulled in'],
    test: ['กด S4 ก่อน: M2 ต้องไม่เดิน · กด S2 แล้ว S4: เดินทั้งคู่', 'Press S4 first: M2 must not start · press S2, then S4: both run'],
    seq: [['tap', 'S4'], ['runM', 'M2', false], ['tap', 'S2'], ['tap', 'S4'], ['runM', 'M1', true], ['runM', 'M2', true]] },
  { id: 'km3Weld', belts: B3, power: true, title: ['หน้าสัมผัสหลักของ K3 เชื่อมติด', 'K3 main contacts welded'],
    spec: () => C6.AUTO3({ lamps: 'run', _weld3: true }), good: () => C6.AUTO3({ lamps: 'run' }),
    symptom: ['สายพานเริ่มเดินตามลำดับ M1 → M2 → M3 ได้ปกติ แต่เมื่อกด S1 M1 และ M2 หยุด ส่วน M3 ยังหมุนต่อและหลอด H3 ยังติด ทั้งที่คอยล์ K3 ไม่มีไฟแล้ว', 'The belts start in order M1 → M2 → M3 as they should, but S1 stops M1 and M2 only: M3 keeps running and lamp H3 stays lit, although coil K3 has no supply any more'],
    options: [['หน้าสัมผัสหลักของ K3 เชื่อมติด คอนแทกเตอร์จึงค้างอยู่ในตำแหน่งต่อแม้คอยล์ไม่มีไฟ', 'the main contacts of K3 have welded, so the contactor stays closed although its coil has no supply'],
      ['ตั้งเวลา K5 ไว้ 0 s', 'K5 is set to 0 s'], ['S1 ต่อที่หน้าสัมผัส 13–14', 'S1 is wired on 13–14'], ['F6 ตัดค้างอยู่', 'F6 is tripped']], answer: 0,
    fix: ['ตัดไฟเข้าตู้ทั้งตู้ก่อน เปลี่ยนคอนแทกเตอร์ K3 หรือชุดหน้าสัมผัสของมัน และหาสาเหตุ เช่น เริ่มเดินถี่เกินไปหรือคอนแทกเตอร์เล็กเกินไป', 'Isolate the whole panel from the supply first, replace contactor K3 or its contact set, and find the cause, e.g. too many starts or an undersized contactor'],
    test: ['เริ่มสายพานจนเดินครบสามตัว แล้วกด S1: ทั้งสามตัวต้องหยุด', 'Start the line until all three belts run, then press S1: all three must stop'],
    seq: [['tap', 'S2'], ['wait', 7], ['runM', 'M3', true], ['tap', 'S1'], ['runM', 'M3', false]] },
  { id: 'km2HoldWeld', belts: B2, power: false, title: ['หน้าสัมผัสค้าง K2 13–14 เชื่อมติด', 'K2 13–14 holding contact welded'],
    spec: () => C6.SEQ_A({ lamps: false, _weld: true }), good: () => C6.SEQ_A({ lamps: false }),
    symptom: ['กด S2 แล้ว M1 และ M2 เริ่มเดินพร้อมกันทันทีโดยไม่ได้กด S4 และกด S3 แล้ว M2 หยุดเฉพาะตอนกดค้าง ปล่อยแล้วเดินเองอีก', 'S2 starts M1 and M2 together without anyone pressing S4, and S3 stops M2 only while it is held: on release M2 starts again by itself'],
    options: [['หน้าสัมผัสค้าง K2 13–14 เชื่อมติด จึงต่อคร่อม S4 อยู่ตลอดเวลา', 'the K2 13–14 holding contact has welded, so it bridges S4 all the time'],
      ['ไม่มีหน้าสัมผัสอนุญาต K1 83–84', 'there is no K1 83–84 permissive contact'], ['F4 95–96 ถูกต่อข้าม', 'F4 95–96 is bypassed'], ['หน้าสัมผัสค้าง K2 ต่อคร่อมทั้ง S3 และ S4', 'the K2 holding contact bridges both S3 and S4']], answer: 0,
    fix: ['ตัดไฟเข้าตู้ก่อน แล้วเปลี่ยนชุดหน้าสัมผัสช่วยหรือคอนแทกเตอร์ K2 หน้าสัมผัสค้างต้องเปิดเมื่อ K2 ปล่อย', 'Isolate the panel from the supply and replace the auxiliary contact block or contactor K2; the holding contact must open when K2 drops out'],
    test: ['กด S2 อย่างเดียว: M1 เดิน ส่วน M2 ต้องยังหยุด', 'Press S2 alone: M1 runs and M2 must stay stopped'],
    seq: [['tap', 'S2'], ['runM', 'M1', true], ['runM', 'M2', false]] },
  { id: 'noOL22', belts: B2, power: true, title: ['ไม่มี F4 95–96 ในวงจรควบคุม', 'No F4 95–96 in the control circuit'],
    spec: () => C6.SEQ_NOOL({ lamps: false }), good: () => C6.SEQ_A({ lamps: false }),
    symptom: ['M1 และ M2 เดินอยู่ เมื่อโอเวอร์โหลด F4 ของ M2 ตัด (คลิก F4) M2 ยังหมุนต่อ', 'M1 and M2 are running; when M2\'s overload relay F4 trips (click F4), M2 keeps running'],
    options: [['F4 อยู่ในวงจรกำลังเท่านั้น ไม่มีหน้าสัมผัส 95–96 ในทางเดินกระแสของ K2', 'F4 is only in the power circuit: there is no 95–96 contact in the K2 path'],
      ['F4 ตั้งกระแสไว้สูงเกินไป', 'F4 is set too high'], ['S3 ต่อขนานกับ S4', 'S3 is in parallel with S4'], ['หน้าสัมผัสอนุญาต K1 83–84 เชื่อมติด', 'the K1 83–84 permissive contact has welded']], answer: 0,
    fix: ['ต่อ F4 95–96 อนุกรมในทางเดินกระแสของ K2 (และ F4 97–98 กับหลอด H4) โอเวอร์โหลดของมอเตอร์ทุกตัวต้องหยุดมอเตอร์ของตัวเองได้', 'Put F4 95–96 in series in the K2 path (and F4 97–98 with lamp H4); every motor\'s overload relay must be able to stop its own motor'],
    test: ['เดินทั้งคู่ แล้วคลิก F4: M2 ต้องหยุด ส่วน M1 เดินต่อได้', 'Run both, then click F4: M2 must stop, M1 may run on'],
    seq: [['tap', 'S2'], ['tap', 'S4'], ['toggle', 'F4'], ['runM', 'M2', false], ['runM', 'M1', true]] },
  { id: 'holdBridge', belts: B2, power: false, title: ['หน้าสัมผัสค้าง K2 คร่อมหน้าสัมผัสอนุญาตด้วย', 'K2 holding contact also bridges the permissive'],
    spec: () => C6.SEQ_BRIDGE({ lamps: false }), good: () => C6.SEQ_A({ lamps: false }),
    symptom: ['เริ่มเดินได้ถูกลำดับ (กด S4 อย่างเดียวไม่เดิน) แต่เมื่อ M1 หยุดด้วย S1 หรือเพราะ F3 ตัด M2 ยังเดินต่อและส่งของลงบนสายพาน M1 ที่หยุดอยู่', 'Starting works in order (S4 alone does nothing), but when M1 stops, by S1 or by an F3 trip, M2 keeps running and feeds material onto the stopped belt M1'],
    options: [['K2 13–14 ต่อคร่อมทั้ง S4 และ K1 83–84 หน้าสัมผัสอนุญาตจึงถูกตรวจแค่ตอนเริ่มเดิน', 'K2 13–14 bridges both S4 and K1 83–84, so the permissive is checked only at the start'],
      ['ไม่มีหน้าสัมผัสอนุญาต K1 83–84', 'there is no K1 83–84 permissive contact'], ['F4 อยู่ในวงจรกำลังเท่านั้น', 'F4 is only in the power circuit'], ['S1 ต่อขนานกับ S3', 'S1 is in parallel with S3']], answer: 0,
    fix: ['ให้ K2 13–14 คร่อมเฉพาะ S4 ย้าย K1 83–84 ไปไว้นอกคู่ขนานนั้น (ก่อน F4) และป้อนไฟทางเดินกระแสของ K2 จากจุดหลัง F3 95–96 เมื่อ K1 หลุดด้วยเหตุใดก็ตาม K2 ต้องหลุดตาม', 'Let K2 13–14 bridge S4 only, move K1 83–84 outside that parallel pair (ahead of F4) and feed the K2 path from the point after F3 95–96; whenever K1 drops out, for whatever reason, K2 must drop out too'],
    test: ['เดินทั้งคู่ แล้วกด S1: ทั้ง M1 และ M2 ต้องหยุด', 'Run both, then press S1: both M1 and M2 must stop'],
    seq: [['tap', 'S2'], ['tap', 'S4'], ['tap', 'S1'], ['runM', 'M1', false], ['runM', 'M2', false]] },
  { id: 'bridgeF21', belts: B2, power: false, title: ['หน้าสัมผัสหยุดย้อนลำดับคร่อม F3 แทน S1', 'Reverse-stop contact across F3 instead of S1'],
    spec: () => C6.REV_STOP({ lamps: false, _bridge: 'OL' }), good: () => C6.REV_STOP({ lamps: false }),
    symptom: ['ขณะ M1 และ M2 เดิน กด S1 แล้วหยุดทั้งสองตัว (หยุดย้อนลำดับไม่ทำงาน) และถ้า F3 ตัดขณะ M2 เดินอยู่ ไม่มีอะไรหยุดเลย', 'With M1 and M2 running, S1 stops both (the reverse-order stop does nothing), and if F3 trips while M2 runs, nothing stops at all'],
    options: [['K2 83–84 ต่อคร่อม F3 95–96 แทนที่จะคร่อม S1', 'K2 83–84 is across F3 95–96 instead of across S1'],
      ['ไม่มี K2 83–84 เลย', 'there is no K2 83–84 at all'], ['K2 83–84 เป็นแบบปกติปิด', 'K2 83–84 is normally closed'], ['F3 ใช้หน้าสัมผัส 97–98', 'F3 is wired on 97–98']], answer: 0,
    fix: ['ย้าย K2 83–84 ไปคร่อมเฉพาะ S1 (จากจุดหลัง F3 95–96 ถึงจุดหลัง S1) ห้ามคร่อม F3, F5 หรือปุ่มหยุดฉุกเฉิน', 'Move K2 83–84 across S1 only (from the point after F3 95–96 to the point after S1); never across F3, F5 or the emergency stop'],
    test: ['เดินทั้งคู่: กด S1 แล้ว M1 ต้องเดินต่อ · คลิก F3: ทั้งคู่ต้องหยุด', 'Run both: S1 must leave M1 running · click F3: both must stop'],
    seq: [['tap', 'S2'], ['tap', 'S4'], ['tap', 'S1'], ['runM', 'M1', true], ['toggle', 'F3'], ['run', false]] },
  { id: 'offAfterS1', belts: B3, power: false, title: ['ทางเดินกระแสของหน้าสัมผัสหน่วงเมื่อตัดไฟรับไฟหลัง S1', 'Off-delay holding paths fed after S1'],
    spec: () => C6.AUTO_STOP({ lamps: false, _from: 'S1' }), good: () => C6.AUTO_STOP({ lamps: false }),
    symptom: ['เริ่มเดิน M1 → M2 → M3 ได้ปกติ แต่เมื่อกด S1 ทั้งสามตัวหยุดพร้อมกันทันที ไม่มีสายพานตัวใดเดินต่อเพื่อส่งของออกจนว่าง ของจึงค้างอยู่บน M2 และ M1', 'The start M1 → M2 → M3 works, but S1 stops all three at once: no belt runs on to carry its material away, so material is left on M2 and M1'],
    options: [['ทางเดินกระแสที่มีหน้าสัมผัสหน่วงเมื่อตัดไฟ K7 และ K8 รับไฟจากจุดหลัง S1 แทนจุด A ก่อน S1', 'the paths with the off-delay contacts K7 and K8 take their supply after S1 instead of from point A ahead of S1'],
      ['K7 และ K8 เป็นตัวตั้งเวลาหน่วงเมื่อป้อนไฟ', 'K7 and K8 are on-delay timers'], ['ไม่มีหน้าสัมผัสค้าง K4 13–14', 'there is no K4 13–14 holding contact'], ['ตั้งเวลา K5 และ K6 ไว้ 0 s', 'K5 and K6 are set to 0 s']], answer: 0,
    fix: ['ป้อนไฟทางเดินกระแสของ K1, K2 และ K3 จากจุด A (หลังโอเวอร์โหลดทุกตัว แต่ก่อน S1) ให้ K4 เป็นตัวเดียวที่รับไฟผ่าน S1', 'Feed the K1, K2 and K3 paths from point A (after all the overload contacts but ahead of S1); only K4 is fed through S1'],
    test: ['เดินครบสามตัว แล้วกด S1 ค้างไว้ครู่หนึ่ง: M3 หยุดทันที M1 และ M2 ยังเดิน แล้วหยุดตามลำดับ', 'Run all three, then hold S1 for a moment: M3 stops at once, M1 and M2 keep running, then stop in turn'],
    seq: [['tap', 'S2'], ['wait', 7], ['runM', 'M3', true], ['hold', 'S1'], ['wait', 0.3], ['runM', 'M3', false], ['runM', 'M1', true], ['release', 'S1'], ['wait', 7], ['run', false]] },
  { id: 'kt1Open', belts: B3, power: false, title: ['คอยล์ของตัวตั้งเวลา K4 ขาด', 'Coil of timer K4 open'],
    spec: () => C6.AUTO3({ lamps: false, _t1Open: true }), good: () => C6.AUTO3({ lamps: false }),
    symptom: ['กด S2 แล้ว M1 เดิน แต่ M2 และ M3 ไม่เดินเลยไม่ว่าจะรอนานเท่าไร ขั้ว A1 ของ K4 มีไฟ แต่ K4 ไม่นับเวลา', 'S2 starts M1, but M2 and M3 never start however long you wait; terminal A1 of K4 is live, but K4 never counts'],
    options: [['คอยล์ของ K4 ขาด (วงจรเปิด) ตัวตั้งเวลาจึงไม่ทำงาน', 'the coil of K4 is open-circuit, so the timer never runs'],
      ['K1 83–84 ไม่ต่อ', 'K1 83–84 does not close'], ['F6 ตัดค้างอยู่', 'F6 is tripped'], ['ตั้งเวลา K4 ไว้ 0 s', 'K4 is set to 0 s']], answer: 0,
    fix: ['ตัดไฟเข้าตู้ก่อน วัดความต้านทานของคอยล์ A1–A2 ของ K4 ถ้าขาดให้เปลี่ยนตัวตั้งเวลา', 'Isolate the panel from the supply, measure the resistance of K4 A1–A2 and replace the timer if its coil is open'],
    test: ['กด S2 แล้วรอ: M2 เดินที่ 3 s และ M3 ที่ 6 s', 'Press S2 and wait: M2 starts at 3 s and M3 at 6 s'],
    seq: [['tap', 'S2'], ['wait', 7], ['runM', 'M2', true], ['runM', 'M3', true]] },
  { id: 'f21InBranch', belts: B3, power: false, title: ['F4 95–96 อยู่ในทางเดินกระแสของ K1 ใต้หน้าสัมผัสค้างของ K8', 'F4 95–96 inside the K1 path, under the K8 holding contact'],
    spec: () => C6.AUTO_STOP({ lamps: false, _ol1In: true }), good: () => C6.AUTO_STOP({ lamps: false }),
    symptom: ['สายพานเดินครบสามตัว เมื่อ F4 ตัด M1 ยังหมุนต่อ (F4 หยุด M1 ได้เฉพาะช่วงที่ M2 ยังไม่เดิน)', 'All three belts run; when F4 trips, M1 keeps running (F4 stops M1 only while M2 is not running yet)'],
    options: [['F4 95–96 อยู่ในส่วนของทางเดินกระแส K1 ที่ทางค้างของหน้าสัมผัสหน่วงเมื่อตัดไฟ K8 67–68 กับ K1 13–14 ต่อคร่อม จึงถูกต่อข้ามขณะ K8 มีไฟ', 'F4 95–96 sits in the part of the K1 path that the off-delay hold K8 67–68 + K1 13–14 bridges, so it is bypassed while K8 is energised'],
      ['F4 ใช้หน้าสัมผัส 97–98', 'F4 is wired on 97–98'], ['K8 เป็นตัวตั้งเวลาหน่วงเมื่อป้อนไฟ', 'K8 is an on-delay timer'], ['ไม่มี F4 ในวงจรกำลัง', 'F4 is not in the power circuit']], answer: 0,
    fix: ['ย้าย F4 95–96 ขึ้นไปอนุกรมกับ F5 และ F6 เหนือจุด A โอเวอร์โหลดตัวใดก็ตัดทุกทางเดินกระแสได้ทันที และไม่มีหน้าสัมผัสค้างตัวใดต่อข้ามได้', 'Move F4 95–96 up into the series chain with F5 and F6 above point A; then any overload breaks every path at once and no holding contact can bypass it'],
    test: ['เดินครบสามตัว แล้วคลิก F4: ทุกตัวต้องหยุดทันที', 'Run all three, then click F4: everything must stop at once'],
    seq: [['tap', 'S2'], ['wait', 7], ['toggle', 'F4'], ['run', false]] }];

/* ---------------- 3) status and control buttons ---------------- */
C6.state = sim => { const d = sim.dev, ms = C6.motors(sim), on = m => sim.runningM(m), any = ms.some(on);
  const list = ms.map(m => `${m} ${on(m) ? T('หมุน', 'runs') : T('หยุด', 'stopped')}`).join(' · ');
  if (sim.mains === false) return [T('ไฟดับ', 'power off'), T('รอไฟกลับมา…', 'waiting for the power…'), 'bad'];
  const cf = (sim.spec.els.find(e => e.k === 'fuse') || {}).d;   // the control fuse (F5 with two motors, F7 with three)
  if (cf && d[cf] && d[cf].blown) return [T(`${cf} ขาด`, `${cf} blown`), T(`วงจรควบคุมไม่มีไฟ คลิกที่ ${cf} เพื่อเปลี่ยนฟิวส์`, `the control circuit is dead; click ${cf} to replace it`), 'bad'];
  if (d.S0 && d.S0.pressed) return [T('หยุดฉุกเฉิน', 'emergency stop'), T(`S0 ค้างอยู่ คลิก S0 อีกครั้งเพื่อคืนปุ่ม แล้วจึงเริ่มใหม่ · ${list}`, `S0 is latched: click S0 again to release it, then start again · ${list}`), 'bad'];
  const trip = Object.keys(d).filter(id => d[id].type === 'ol' && d[id].tripped);
  if (trip.length) { const still = trip.map(id => C6.motorOf(sim, id)).filter(m => m && on(m));
    return [T(`${trip.join(', ')} ตัด`, `${trip.join(', ')} tripped`), (still.length ? T(`${still.join(', ')} ยังหมุนอยู่แม้โอเวอร์โหลดตัดแล้ว · `, `${still.join(', ')} still running although the overload has tripped · `) : '') + `${list} · ${T('คลิกที่โอเวอร์โหลดอีกครั้งเพื่อรีเซ็ต', 'click the overload again to reset it')}`, 'bad']; }
  const blown = Object.keys(d).filter(id => d[id].type === 'fuse' && d[id].blown && C6.motorOf(sim, id));   // power fuses of a motor branch
  if (blown.length) return [T(`${blown.join(', ')} ขาด`, `${blown.join(', ')} blown`), `${list} · ${T(`มอเตอร์ของสาขานั้นไม่มีไฟ คลิกที่ ${blown[0]} เพื่อเปลี่ยนฟิวส์`, `the motor of that branch has no supply; click ${blown[0]} to replace the fuses`)}`, 'warn'];
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
  moving(id) { if (this.o.run) return !!this.o.run(id); const s = this.sim, km = s.dev['K' + id.slice(1)]; return s.runningM ? s.runningM(id) : !!(km && km.energized); }
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
   switch-on times of a row (key = id, or 'K5:c' for a timed contact). */
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
    this.sl = ui.slider(pn, { id: id + 'T', label: T('เวลาหน่วงระหว่างการเริ่มเดินแต่ละตัว (ตั้งตัวตั้งเวลาทุกตัวเท่ากัน)', 'delay between the starts (every timer set the same)'), min: 0, max: 8, step: 0.5, value: this.T, unit: 's', dec: 1, oninput: v => this.set({ T: v }) });
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
