/* ch5.js — chapter 5: direct-on-line (DOL) starting, protection and pilot lamps, jogging, single-phase DOL, fault finding, two stations.
   Course names and IEC terminal numbers throughout (Q1 main breaker, F1 control fuse, F2 overload relay 95–96 / 97–98, F3 phase-failure
   relay 11–14, KM1 contactor with 13–14 NO and 21–22 NC built in and a front block 53–54 …, KA1 auxiliary relay 13–14 / 23–24,
   S1 stop 11–12, S2 start 13–14, S3 jog, S3/S4 the second station, H1 run GN, H2 overload YE, H3 stopped WH, M1 motor).
   The control circuit is fed between L1 and N after Q1, so a power cut or Q1 off is a power failure for it too. Devices carry
   name: [th, en] (button labels for C5.panel) and push buttons cap: 'white'|'black'|'grey' (IEC 60204-1 10.2.1: start white, stop black,
   jog grey; drawn as a dot on the C5.panel button).
   1) circuits for the relay simulator (factories: a fresh spec each call; every spec draws the full power circuit, see relay.js)
      C5.SHEET(n, o)  the instructor's lab sheets 1–9 in course names: 1 motor on the rails (power only), 2 + Q1 (power only),
                      3 KM1 switched by a maintained switch S2 (two-wire), 4 push button S2 only (runs while held), 5 S1 + S2 + holding
                      contact KM1 13–14 (three-wire), 6 + F2 in the power circuit only, 7 + F2 95–96 in the coil path, 8 + run lamp H1,
                      9 + overload lamp H2 via 97–98 fed from F1 2; o.run 'coil' (H1 across the coil, as the sheets) | 'aux' (H1 via
                      KM1 53–54); o.tap 'before' feeds the control circuit ahead of Q1 (the power-failure test then fails); n ≥ 10 = PHASE
      C5.DOL5(o)      the full DOL: H1 via 53–54, H2 via 97–98 from F1 2, H3 via KM1 21–22 (paths 1 coil, 2 holding, 3 H1, 4 H2, 5 H3)
      C5.PHASE(o)     DOL5 with the phase-failure relay contact F3 11–14 after F1 (F3 a sensor device, on = phases healthy)
      C5.J1() C5.J2() C5.J3()  jogging: selector RUN/JOG in the holding path; relay KA1 (recommended); double-contact jog button (race)
      C5.ONEPH(o)     single-phase DOL: Q1 and KM1 two-pole in L and N, F2 with the current through its three poles, motor 1~ with
                      start winding, centrifugal switch and start capacitor (o.start false: no start winding drawn)
      C5.STATIONS()   two stations (door S1 + S2, remote S3 + S4), H1 and H2
      C5.SHEETINFO    [th, en] title and "what is new" of every sheet; C5.NAMEMAP the names in the lab files and in the course
   2) C5.FAULTS       ten fault-finding cases { id, title, spec, good, symptom, options, answer, fix, test, seq } (all text [th, en]);
      C5.runSeq(sim, seq) runs a test sequence and checks it; C5.faultTrial(c) runs it on both circuits ({ bad, good }: good true and
      bad false when the case works)
   3) C5.panel(el, sim, o) the usual buttons for any of these simulators (hold-to-press, toggles, power cut, status);
      C5.powerCut(sim, o) power fails and returns after o.ms
   4) C5.Start        DOL start-up: current, torque and speed against time from the ED.motor model for a chosen load inertia and load
                      torque, with the overload relay's heat during the start (class 10 / 20, C4 model); C5.startRun(p), C5.startSVG(r, o)
   5) C5.JogRace      release of a double-contact jog button: S3 13–14, S3 21–22, KM1 coil, KM1 13–14 on a millisecond time axis;
                      release time against the contactor's drop-out time decides latch or not; C5.raceSVG(tRel, tDrop, o)
   6) C5.Phase        three-phase supply after Q1 with lost phases and a swapped sequence, phase lamps H4–H6, voltmeter P1, ammeter P2
                      on current transformer T1, phase-failure relay F3 (delay, automatic reset) driving the DOL control circuit */
(function (global) {
'use strict';
const C5 = {}, IE = global.IEC, T = (th, en) => MC.t(th, en), tt = p => ED.tt(p);
const GOOD = '#1d8a4a', OFF = '#9aa3b5', HOT = '#ff4d4d', f1 = v => +(+v).toFixed(1);
C5.COL = { run: '#7ee787', ol: '#ffd166', stop: '#f2f2f2', red: '#ff6b6b' };

/* ---------------- 1) circuits ---------------- */
const DEV = {
  Q1: () => ({ type: 'cb', on: true, name: ['Q1 เบรกเกอร์หลัก', 'Q1 main breaker'] }), Q2: () => ({ type: 'cb', on: true, name: ['Q2 เบรกเกอร์หลอดเฟส', 'Q2 phase-lamp breaker'] }),
  F1: () => ({ type: 'fuse', name: ['F1 ฟิวส์วงจรควบคุม', 'F1 control fuse'] }), F2: () => ({ type: 'ol', name: ['F2 โอเวอร์โหลด ตัด / รีเซ็ต', 'F2 overload trip / reset'] }),
  F3: () => ({ type: 'sen', on: true, name: ['F3 เฟสปกติ / เฟสผิดปกติ', 'F3 phases healthy / failed'] }),
  S1: () => ({ type: 'pb', cap: 'black', name: ['S1 หยุด', 'S1 stop'] }), S2: () => ({ type: 'pb', cap: 'white', name: ['S2 เริ่ม', 'S2 start'] }), KM1: () => ({ type: 'coil' }), KA1: () => ({ type: 'coil' }),
  H1: () => ({ type: 'lamp', color: C5.COL.run, code: 'GN' }), H2: () => ({ type: 'lamp', color: C5.COL.ol, code: 'YE' }), H3: () => ({ type: 'lamp', color: C5.COL.stop, code: 'WH' }) };
const STG = { Q1: { k: 'cb', d: 'Q1' }, KM1: { k: 'mainNO', d: 'KM1' }, F2: { k: 'therm', d: 'F2' } };
const PW = (o, ...ks) => ({ full: true, stages: ks.map(k => ({ ...STG[k] })), motor: 'M1', tap: o.tap === 'before' ? 'before' : 'after' });
const fuse = () => ({ k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }), olNC = y => ({ k: 'NC', d: 'F2', x: 0, y, t: ['95', '96'], op: 'thr' });
const stop = (y, d = 'S1', x = 0) => ({ k: 'NC', d, x, y, t: ['11', '12'], op: 'pb' }), start = (y, d = 'S2', x = 0, h = 1) => ({ k: 'NO', d, x, y, h, t: ['13', '14'], op: 'pb' });
const coil = (y, d = 'KM1', x = 0) => ({ k: 'coil', d, x, y, t: ['A1', 'A2'] }), hold = (y, x = 1, d = 'KM1', h = 1) => ({ k: 'NO', d, x, y, h, t: ['13', '14'] });
const w = (pts, dots) => (dots ? { k: 'w', pts, dots } : { k: 'w', pts });
/* lamps fed from F1 2 (node (0, 1)): one feed wire along row 1, each lamp column with its contact in row yc and the lamp below it */
const feed = xs => w([[0, 1], ...xs.map(x => [x, 1])], xs.map((x, i) => i));
const lampCol = (x, c, lamp, yc) => [{ k: 'w', x, y: 1, h: yc - 1 }, { ...c, x, y: yc }, { k: 'lamp', d: lamp, x, y: yc + 1, t: ['X1', 'X2'] }];
const C53 = { k: 'NO', d: 'KM1', t: ['53', '54'] }, C9798 = { k: 'NO', d: 'F2', t: ['97', '98'], op: 'thr' }, C2122 = { k: 'NC', d: 'KM1', t: ['21', '22'] };

C5.SHEET = (n, o = {}) => {
  n = Math.max(1, Math.round(n)); if (n >= 10) return C5.PHASE(o);
  if (n === 1) return { rows: 4, devices: {}, els: [], power: { full: true, stages: [], motor: 'M1' } };
  if (n === 2) return { rows: 4, devices: { Q1: DEV.Q1() }, els: [], power: { full: true, stages: [{ ...STG.Q1 }], motor: 'M1' } };
  const sup = o.tap === 'before' ? undefined : 'Q1', D = { Q1: DEV.Q1(), F1: DEV.F1(), KM1: DEV.KM1() };
  if (n === 3) { D.S2 = { type: 'sel', name: ['S2 สวิตช์ค้างตำแหน่ง เปิด / ปิด', 'S2 maintained switch on / off'] };
    return { supply: sup, rows: 3, devices: D, power: PW(o, 'Q1', 'KM1'), els: [fuse(), { k: 'NO', d: 'S2', x: 0, y: 1, t: ['13', '14'], op: 'sel' }, coil(2)] }; }
  if (n === 4) { D.S2 = DEV.S2(); return { supply: sup, rows: 3, devices: D, power: PW(o, 'Q1', 'KM1'), els: [fuse(), start(1), coil(2)] }; }
  D.S1 = DEV.S1(); D.S2 = DEV.S2();
  if (n <= 6) { if (n === 6) D.F2 = DEV.F2();
    return { supply: sup, rows: 4, devices: D, power: n === 6 ? PW(o, 'Q1', 'KM1', 'F2') : PW(o, 'Q1', 'KM1'),
      els: [fuse(), stop(1), start(2), coil(3), hold(2), w([[0, 2], [1, 2]], [0]), w([[0, 3], [1, 3]], [0])] }; }
  D.F2 = DEV.F2(); const els = [fuse(), olNC(1), stop(2), start(3), coil(4), hold(3), w([[0, 3], [1, 3]], [0])], run = o.run === 'aux' ? 'aux' : 'coil';
  if (n === 7) { els.push(w([[0, 4], [1, 4]], [0])); return { supply: sup, rows: 5, devices: D, power: PW(o, 'Q1', 'KM1', 'F2'), els }; }
  D.H1 = DEV.H1(); const top = [];
  if (run === 'coil') els.push(w([[0, 4], [1, 4], [2, 4]], [0, 1]), { k: 'lamp', d: 'H1', x: 2, y: 4, t: ['X1', 'X2'] });   // H1 across the coil (sheet 8)
  else { els.push(w([[0, 4], [1, 4]], [0]), ...lampCol(2, C53, 'H1', 3)); top.push(2); }                                // H1 via KM1 53–54
  if (n >= 9) { D.H2 = DEV.H2(); els.push(...lampCol(3, C9798, 'H2', 3)); top.push(3); }
  if (top.length) els.push(feed(top));
  return { supply: sup, rows: 5, devices: D, power: PW(o, 'Q1', 'KM1', 'F2'), els };
};
C5.DOL5 = (o = {}) => { const s = C5.SHEET(9, { ...o, run: 'aux' }); s.devices.H3 = DEV.H3(); s.els = s.els.filter(e => !(e.k === 'w' && e.pts && e.pts[0][1] === 1 && e.pts[0][0] === 0));
  s.els.push(...lampCol(4, C2122, 'H3', 3), feed([2, 3, 4])); return s; };
C5.PHASE = (o = {}) => ({ supply: o.tap === 'before' ? undefined : 'Q1', rows: 6, power: PW(o, 'Q1', 'KM1', 'F2'),
  devices: { Q1: DEV.Q1(), F1: DEV.F1(), F3: DEV.F3(), F2: DEV.F2(), S1: DEV.S1(), S2: DEV.S2(), KM1: DEV.KM1(), H1: DEV.H1(), H2: DEV.H2(), H3: DEV.H3() },
  els: [fuse(), { k: 'NO', d: 'F3', x: 0, y: 1, t: ['11', '14'] }, olNC(2), stop(3), start(4), coil(5), hold(4), w([[0, 4], [1, 4]], [0]), w([[0, 5], [1, 5]], [0]),
    ...lampCol(2, C53, 'H1', 4), ...lampCol(3, C9798, 'H2', 4), ...lampCol(4, C2122, 'H3', 4), feed([2, 3, 4])] });
/* jogging. J1: selector S3 RUN/JOG in series with the holding contact (in JOG, S2 only inches) */
C5.J1 = () => ({ supply: 'Q1', rows: 6, power: PW({}, 'Q1', 'KM1', 'F2'),
  devices: { Q1: DEV.Q1(), F1: DEV.F1(), F2: DEV.F2(), S1: DEV.S1(), S2: { type: 'pb', cap: 'white', name: ['S2 เริ่ม / เดินกระตุก', 'S2 start / inch'] }, S3: { type: 'msel', positions: ['JOG', 'RUN'], at: 'RUN', name: ['S3 RUN / JOG', 'S3 RUN / JOG'] }, KM1: DEV.KM1() },
  els: [fuse(), olNC(1), stop(2), start(3, 'S2', 0, 2), coil(5), hold(3), { k: 'NO', d: 'S3', x: 1, y: 4, t: ['13', '14'], op: 'sel', pos: ['RUN'] }, w([[0, 3], [1, 3]], [0]), w([[0, 5], [1, 5]], [0])] });
/* J2: relay jog (recommended). S2 starts KA1, which holds itself (13–14) and runs KM1 through 23–24; the jog button S3 feeds KM1 directly
   and never reaches a holding path */
C5.J2 = () => ({ supply: 'Q1', rows: 5, power: PW({}, 'Q1', 'KM1', 'F2'),
  devices: { Q1: DEV.Q1(), F1: DEV.F1(), F2: DEV.F2(), S1: DEV.S1(), S2: DEV.S2(), S3: { type: 'pb', cap: 'grey', name: ['S3 เดินกระตุก', 'S3 jog'] }, KA1: DEV.KA1(), KM1: DEV.KM1() },
  els: [fuse(), olNC(1), stop(2), start(3), coil(4, 'KA1'), hold(3, 1, 'KA1'), { k: 'NO', d: 'KA1', x: 2, y: 3, t: ['23', '24'] }, coil(4, 'KM1', 2), start(3, 'S3', 3),
    w([[0, 3], [1, 3], [2, 3], [3, 3]], [0, 1, 2]), w([[0, 4], [1, 4]], [0]), w([[2, 4], [3, 4]], [0])] });
/* J3: double-contact jog button (the hazard). S3 13–14 across S2, S3 21–22 in series with the holding contact: on a fast release 21–22
   re-closes before KM1 has dropped out and the motor keeps running. In the simulator a direct release latches; sim.setMid('S3', true)
   (or sim.dev.S3.midT = 0.3 with step()) passes through the middle position, both contacts open, and KM1 drops out first */
C5.J3 = () => ({ supply: 'Q1', rows: 6, power: PW({}, 'Q1', 'KM1', 'F2'),
  devices: { Q1: DEV.Q1(), F1: DEV.F1(), F2: DEV.F2(), S1: DEV.S1(), S2: DEV.S2(), S3: { type: 'pb', cap: 'grey', name: ['S3 เดินกระตุก', 'S3 jog'] }, KM1: DEV.KM1() },
  els: [fuse(), olNC(1), stop(2), start(3, 'S2', 0, 2), coil(5), start(3, 'S3', 1, 2), hold(3, 2), { k: 'NC', d: 'S3', x: 2, y: 4, t: ['21', '22'], op: 'pb' },
    w([[0, 3], [1, 3], [2, 3]], [0, 1]), w([[0, 5], [1, 5], [2, 5]], [0, 1])] });
/* single-phase DOL: control from L1 after Q1; Q1 opens L and N together */
C5.ONEPH = (o = {}) => ({ supply: 'Q1', rows: 5, power: { phases: 1, stages: [{ ...STG.Q1 }, { ...STG.KM1 }, { ...STG.F2 }], motor: 'M1', start: o.start !== false },
  devices: { Q1: DEV.Q1(), F1: DEV.F1(), F2: DEV.F2(), S1: DEV.S1(), S2: DEV.S2(), KM1: DEV.KM1() },
  els: [fuse(), olNC(1), stop(2), start(3), coil(4), hold(3), w([[0, 3], [1, 3]], [0]), w([[0, 4], [1, 4]], [0])] });
/* two stations: door S1 stop + S2 start, remote S3 stop + S4 start; stops in series, starts in parallel with KM1 13–14; H1 run, H2 overload */
C5.STATIONS = () => ({ supply: 'Q1', rows: 6, power: PW({}, 'Q1', 'KM1', 'F2'),
  devices: { Q1: DEV.Q1(), F1: DEV.F1(), F2: DEV.F2(), S1: { type: 'pb', cap: 'black', name: ['S1 หยุด (ประตูตู้)', 'S1 stop (door)'] }, S2: { type: 'pb', cap: 'white', name: ['S2 เริ่ม (ประตูตู้)', 'S2 start (door)'] },
    S3: { type: 'pb', cap: 'black', name: ['S3 หยุด (สถานีที่ 2)', 'S3 stop (remote)'] }, S4: { type: 'pb', cap: 'white', name: ['S4 เริ่ม (สถานีที่ 2)', 'S4 start (remote)'] }, KM1: DEV.KM1(), H1: DEV.H1(), H2: DEV.H2() },
  els: [fuse(), olNC(1), stop(2), stop(3, 'S3'), start(4), coil(5), start(4, 'S4', 1), hold(4, 2), w([[0, 4], [1, 4], [2, 4]], [0, 1]), w([[0, 5], [1, 5], [2, 5]], [0, 1]),
    ...lampCol(3, C53, 'H1', 4), ...lampCol(4, C9798, 'H2', 4), feed([3, 4])] });
C5.SHEETINFO = { 1: { title: ['มอเตอร์ต่อตรงกับสายเมน', 'Motor straight on the supply'], adds: ['ไม่มีอุปกรณ์ตัดต่อหรือป้องกันเลย มอเตอร์หมุนทุกครั้งที่มีไฟ', 'no switching or protective device at all: the motor runs whenever there is supply'] },
  2: { title: ['เพิ่มเบรกเกอร์ Q1', 'Add breaker Q1'], adds: ['Q1 ป้องกันการลัดวงจรและตัดต่อมอเตอร์ด้วยมือ', 'Q1 protects against short circuits and switches the motor by hand'] },
  3: { title: ['คอนแทกเตอร์ KM1 สั่งด้วยสวิตช์ค้างตำแหน่ง', 'Contactor KM1 switched by a maintained switch'], adds: ['วงจรควบคุม 2 สาย: สวิตช์ S2 ค้างตำแหน่งสั่งคอยล์ KM1', 'two-wire control: maintained switch S2 commands coil KM1'] },
  4: { title: ['ปุ่มกด S2 อย่างเดียว', 'Push button S2 only'], adds: ['มอเตอร์หมุนเฉพาะขณะกด S2 ค้างไว้ (เดินกระตุก)', 'the motor runs only while S2 is held (inching)'] },
  5: { title: ['ปุ่มหยุด S1 ปุ่มเริ่ม S2 และหน้าสัมผัสค้างตัวเอง', 'Stop S1, start S2 and the holding contact'], adds: ['วงจรควบคุม 3 สาย: KM1 13–14 ต่อคร่อม S2', 'three-wire control: KM1 13–14 across S2'] },
  6: { title: ['โอเวอร์โหลด F2 ในวงจรกำลัง', 'Overload relay F2 in the power circuit'], adds: ['ส่วนให้ความร้อนของ F2 อยู่ในสายมอเตอร์ แต่ยังไม่มีหน้าสัมผัสในวงจรควบคุม', 'the heaters of F2 carry the motor current, but no F2 contact is in the control circuit yet'] },
  7: { title: ['F2 95–96 ในทางเดินกระแสของคอยล์', 'F2 95–96 in the coil path'], adds: ['เมื่อ F2 ตัด 95–96 เปิด คอยล์ KM1 หลุด มอเตอร์หยุด', 'when F2 trips, 95–96 opens, coil KM1 drops out and the motor stops'] },
  8: { title: ['หลอดเดิน H1', 'Run lamp H1'], adds: ['H1 (เขียว) ติดเมื่อมอเตอร์หมุน', 'H1 (green) lights while the motor runs'] },
  9: { title: ['หลอดโอเวอร์โหลด H2', 'Overload lamp H2'], adds: ['H2 (เหลือง) ผ่าน F2 97–98 ป้อนจาก F1 ขั้ว 2 ก่อนถึง 95–96', 'H2 (yellow) through F2 97–98, fed from F1 terminal 2 ahead of 95–96'] },
  10: { title: ['รีเลย์ป้องกันเฟส F3', 'Phase-failure relay F3'], adds: ['F3 11–14 ต่อเมื่อไฟครบเฟสและลำดับเฟสถูก', 'F3 11–14 is closed while all phases are present in the right sequence'] },
  11: { title: ['หลอดแสดงเฟสและมิเตอร์', 'Phase lamps and meters'], adds: ['H4–H6 แสดงไฟแต่ละเฟสเทียบ N ผ่าน Q2', 'H4–H6 show each phase to N, through Q2'] } };
/* names in the lab files (CADe SIMU sheets) and in the course drawings: [lab-file name, course name, [th, en] device] */
C5.NAMEMAP = [['CB', 'Q1', ['เบรกเกอร์หลัก', 'main breaker']], ['F1 + CB1', 'F1', ['ฟิวส์หรือเบรกเกอร์ 1 ขั้วของวงจรควบคุม', 'control fuse or one-pole breaker']], ['-F / OVER', 'F2', ['โอเวอร์โหลดรีเลย์', 'overload relay']],
  ['-S / STOP', 'S1', ['ปุ่มหยุด 11–12', 'stop button 11–12']], ['START', 'S2', ['ปุ่มเริ่ม 13–14', 'start button 13–14']], ['RUN', 'H1', ['หลอดเดิน สีเขียว', 'run lamp, green']], ['OVER', 'H2', ['หลอดโอเวอร์โหลด สีเหลือง', 'overload lamp, yellow']],
  ['P', 'F3', ['รีเลย์ป้องกันเฟส', 'phase-failure relay']], ['L1, L2, L3', 'H4, H5, H6', ['หลอดแสดงเฟส', 'phase lamps']], ['CB', 'Q2', ['เบรกเกอร์ของหลอดแสดงเฟส', 'breaker of the phase lamps']], ['-M', 'M1', ['มอเตอร์', 'motor']],
  ['-X', 'X1', ['สัญลักษณ์แหล่งจ่าย L1 L2 L3 N และสายดินป้องกัน PE ซึ่งในแบบของวิชาลงขั้วของแผงขั้วต่อกำลัง -X1 (หน้า 5.6)', 'supply symbols L1 L2 L3 N and protective earth PE, which in the course drawing land on the power terminal strip -X1 (page 5.6)']]];

/* ---------------- 2) fault-finding cases ---------------- */
/* test sequences: ['tap', ids…] press and release together; ['hold', id] / ['release', id]; ['toggle', id]; ['start', id] (a push
   button is tapped, a maintained switch turned on); ['cut'] power fails and returns; ['fault', id] makes an earth fault; checks
   ['run', bool] (motor running) and ['lit', id, bool] (lamp lit). runSeq returns true when every check holds. */
C5.runSeq = (sim, seq) => { let ok = true;
  seq.forEach(([op, ...a]) => {
    if (op === 'tap') { a.forEach(id => sim.press(id, true)); a.forEach(id => sim.press(id, false)); }
    else if (op === 'hold') a.forEach(id => sim.press(id, true)); else if (op === 'release') a.forEach(id => sim.press(id, false));
    else if (op === 'toggle') a.forEach(id => sim.toggle(id));
    else if (op === 'start') a.forEach(id => { const d = sim.dev[id]; if (d.type === 'sel') { if (!d.on) sim.toggle(id); } else { sim.press(id, true); sim.press(id, false); } });
    else if (op === 'cut') { sim.setMains(false); sim.setMains(true); }
    else if (op === 'fault') a.forEach(id => { if (!sim.dev[id].on) sim.toggle(id); });
    else if (op === 'run') { if (sim.running() !== a[0]) ok = false; }
    else if (op === 'lit') { if (!!sim.dev[a[0]].energized !== a[1]) ok = false; } });
  return ok; };
C5.faultTrial = c => ({ bad: C5.runSeq(new RL.Sim(document.createElement('div'), c.spec()), c.seq), good: C5.runSeq(new RL.Sim(document.createElement('div'), c.good()), c.seq) });
const FD = (...ids) => { const D = { Q1: DEV.Q1(), F1: DEV.F1(), F2: DEV.F2(), S1: DEV.S1(), S2: DEV.S2(), KM1: DEV.KM1() }; ids.forEach(i => { D[i] = typeof i === 'string' && DEV[i] ? DEV[i]() : D[i]; }); return D; };
const P3 = () => PW({}, 'Q1', 'KM1', 'F2');
const TWO = (bad) => { const D = FD(); D.S3 = { type: 'pb', cap: 'black', name: ['S3 หยุด (สถานีที่ 2)', 'S3 stop (remote)'] }; D.S4 = { type: 'pb', cap: 'white', name: ['S4 เริ่ม (สถานีที่ 2)', 'S4 start (remote)'] };
  if (bad === 'stops') return { supply: 'Q1', rows: 5, devices: D, power: P3(), els: [fuse(), olNC(1), stop(2), stop(2, 'S3', 1), start(3), start(3, 'S4', 1), hold(3, 2), coil(4),
    w([[0, 2], [1, 2]], [0]), w([[0, 3], [1, 3], [2, 3]], [0, 1]), w([[0, 4], [1, 4], [2, 4]], [0, 1])] };
  if (bad === 'starts') return { supply: 'Q1', rows: 7, devices: D, power: P3(), els: [fuse(), olNC(1), stop(2), stop(3, 'S3'), start(4), start(5, 'S4'), coil(6), hold(4, 1, 'KM1', 2), w([[0, 4], [1, 4]], [0]), w([[0, 6], [1, 6]], [0])] };
  return { supply: 'Q1', rows: 6, devices: D, power: P3(), els: [fuse(), olNC(1), stop(2), stop(3, 'S3'), start(4), start(4, 'S4', 1), hold(4, 2), coil(5), w([[0, 4], [1, 4], [2, 4]], [0, 1]), w([[0, 5], [1, 5], [2, 5]], [0, 1])] }; };
const H2C = from => { const D = FD('H2'); return { supply: 'Q1', rows: 5, devices: D, power: P3(), els: [fuse(), olNC(1), stop(2), start(3), coil(4), hold(3), w([[0, 3], [1, 3]], [0]), w([[0, 4], [1, 4]], [0]),
  w([[0, from], [2, from]], [0]), { k: 'w', x: 2, y: from, h: 3 - from }, { ...C9798, x: 2, y: 3 }, { k: 'lamp', d: 'H2', x: 2, y: 4, t: ['X1', 'X2'] }] }; };
const EF = bad => { const D = FD(); D.E = { type: 'fault', on: false };
  if (bad) return { supply: 'Q1', rows: 5, devices: D, power: P3(), els: [fuse(), olNC(1), start(2), coil(3), stop(4), hold(2), w([[0, 2], [1, 2]], [0]), w([[0, 3], [1, 3]], [0]), w([[0, 4], [2, 4]], [0]), { k: 'earth', d: 'E', x: 2, y: 4 }] };
  return { supply: 'Q1', rows: 5, devices: D, power: P3(), els: [fuse(), olNC(1), stop(2), start(3), coil(4), hold(3), w([[0, 3], [1, 3]], [0]), w([[0, 4], [1, 4], [2, 4]], [0, 1]), { k: 'earth', d: 'E', x: 2, y: 4 }] }; };
C5.FAULTS = [
  { id: 'holdAcross', title: ['หน้าสัมผัสค้างตัวเองคร่อมทั้ง S1 และ S2', 'Holding contact across both S1 and S2'],
    spec: () => ({ supply: 'Q1', rows: 5, devices: FD(), power: P3(), els: [fuse(), olNC(1), stop(2), start(3), coil(4), hold(2, 1, 'KM1', 2), w([[0, 2], [1, 2]], [0]), w([[0, 4], [1, 4]], [0])] }),
    good: () => C5.SHEET(7),
    symptom: ['กด S2 มอเตอร์หมุนและค้างอยู่ได้ แต่กด S1 แล้วมอเตอร์ไม่หยุด หยุดได้เฉพาะเมื่อปลด Q1 หรือเมื่อ F2 ตัด', 'S2 starts the motor and it keeps running, but S1 does not stop it; only switching Q1 off or an F2 trip stops it'],
    options: [['หน้าสัมผัสค้าง KM1 13–14 ต่อคร่อมทั้ง S1 และ S2 จึงข้าม S1 ไปด้วย', 'holding contact KM1 13–14 bridges both S1 and S2, so it bypasses S1 too'], ['S1 ใช้หน้าสัมผัส 13–14 แทน 11–12', 'S1 is wired on 13–14 instead of 11–12'],
      ['ไม่มีหน้าสัมผัสค้างตัวเอง', 'there is no holding contact'], ['S2 เป็นสวิตช์ค้างตำแหน่ง ไม่ใช่ปุ่มกด', 'S2 is a maintained switch, not a push button']], answer: 0,
    fix: ['ย้ายปลายบนของ KM1 13–14 ลงมาต่อที่จุดระหว่าง S1 กับ S2 ให้คร่อมเฉพาะ S2 แล้ว S1 จะตัดทางเดินกระแสค้างได้', 'Move the top end of KM1 13–14 down to the point between S1 and S2, across S2 only; then S1 breaks the holding path as well'],
    test: ['กด S2 แล้วปล่อย (มอเตอร์หมุนค้าง) แล้วกด S1: มอเตอร์ต้องหยุด', 'Press and release S2 (the motor keeps running), then press S1: the motor must stop'],
    seq: [['tap', 'S2'], ['run', true], ['tap', 'S1'], ['run', false]] },
  { id: 'noHold', title: ['ไม่มีหน้าสัมผัสค้างตัวเอง', 'No holding contact'],
    spec: () => ({ supply: 'Q1', rows: 5, devices: FD(), power: P3(), els: [fuse(), olNC(1), stop(2), start(3), coil(4)] }), good: () => C5.SHEET(7),
    symptom: ['มอเตอร์หมุนเฉพาะตอนกด S2 ค้างไว้ ปล่อยปุ่มแล้วหยุดทันที', 'The motor runs only while S2 is held and stops as soon as the button is released'],
    options: [['ไม่มีหน้าสัมผัส KM1 13–14 ต่อคร่อม S2', 'there is no KM1 13–14 across S2'], ['F2 ตัดค้างอยู่', 'F2 is tripped'], ['S1 ต่อขนานกับ S2', 'S1 is in parallel with S2'], ['ฟิวส์ F1 ขาด', 'fuse F1 has blown']], answer: 0,
    fix: ['ต่อหน้าสัมผัสปกติเปิด KM1 13–14 คร่อม S2 (จากจุดระหว่าง S1 กับ S2 ไปที่ A1)', 'Connect the normally open KM1 13–14 across S2 (from the point between S1 and S2 to A1)'],
    test: ['กด S2 แล้วปล่อย: มอเตอร์ต้องหมุนต่อ', 'Press and release S2: the motor must keep running'], seq: [['tap', 'S2'], ['run', true]] },
  { id: 'stopsParallel', title: ['ปุ่มหยุดของสองสถานีต่อขนานกัน', 'The two stop buttons in parallel'],
    spec: () => TWO('stops'), good: () => TWO(),
    symptom: ['สองสถานีควบคุม: เริ่มได้จากทั้ง S2 และ S4 แต่กด S1 อย่างเดียวหรือ S3 อย่างเดียวแล้วมอเตอร์ไม่หยุด ต้องกดพร้อมกันทั้งสองปุ่ม', 'Two control stations: S2 and S4 both start the motor, but S1 alone or S3 alone does not stop it; both must be pressed together'],
    options: [['S1 กับ S3 ต่อขนานกัน ปุ่มหยุดต้องต่ออนุกรมกัน', 'S1 and S3 are in parallel; stop buttons must be in series'], ['S2 กับ S4 ต่ออนุกรมกัน', 'S2 and S4 are in series'],
      ['ไม่มีหน้าสัมผัสค้างตัวเอง', 'there is no holding contact'], ['S3 เป็นปุ่มปกติเปิด', 'S3 is a normally open button']], answer: 0,
    fix: ['ต่อ S1 11–12 กับ S3 11–12 อนุกรมกัน ปุ่มหยุดตัวไหนก็ตัดทางเดินกระแสได้', 'Put S1 11–12 and S3 11–12 in series, so that either stop button breaks the path'],
    test: ['เริ่มด้วย S2 แล้วกด S1: หยุด; เริ่มด้วย S4 แล้วกด S3: หยุด', 'Start with S2 and press S1: it stops; start with S4 and press S3: it stops'],
    seq: [['tap', 'S2'], ['run', true], ['tap', 'S1'], ['run', false], ['tap', 'S4'], ['run', true], ['tap', 'S3'], ['run', false]] },
  { id: 'startsSeries', title: ['ปุ่มเริ่มของสองสถานีต่ออนุกรมกัน', 'The two start buttons in series'],
    spec: () => TWO('starts'), good: () => TWO(),
    symptom: ['กด S2 อย่างเดียวหรือ S4 อย่างเดียว มอเตอร์ไม่หมุน ต้องกดพร้อมกันทั้งสองปุ่มจึงเริ่มได้', 'S2 alone or S4 alone does not start the motor; only both pressed together start it'],
    options: [['S2 กับ S4 ต่ออนุกรมกัน ปุ่มเริ่มต้องต่อขนานกับ KM1 13–14', 'S2 and S4 are in series; start buttons must be in parallel with KM1 13–14'], ['S1 กับ S3 ต่อขนานกัน', 'S1 and S3 are in parallel'],
      ['F2 ตัดค้างอยู่', 'F2 is tripped'], ['หน้าสัมผัสค้างต่อคร่อม S1', 'the holding contact bridges S1']], answer: 0,
    fix: ['ต่อ S2 13–14 และ S4 13–14 ขนานกับ KM1 13–14 ระหว่างจุดหลังปุ่มหยุดกับ A1', 'Wire S2 13–14 and S4 13–14 in parallel with KM1 13–14, between the point after the stops and A1'],
    test: ['กด S2 อย่างเดียว: หมุน; หยุดแล้วกด S4 อย่างเดียว: หมุน', 'Press S2 alone: it runs; stop it, then press S4 alone: it runs'],
    seq: [['tap', 'S2'], ['run', true], ['tap', 'S1'], ['run', false], ['tap', 'S4'], ['run', true]] },
  { id: 'ol9798', title: ['ใช้ F2 97–98 แทน 95–96', 'F2 97–98 used instead of 95–96'],
    spec: () => ({ supply: 'Q1', rows: 5, devices: FD(), power: P3(), els: [fuse(), { ...C9798, x: 0, y: 1 }, stop(2), start(3), coil(4), hold(3), w([[0, 3], [1, 3]], [0]), w([[0, 4], [1, 4]], [0])] }), good: () => C5.SHEET(7),
    symptom: ['กด S2 แล้วมอเตอร์ไม่หมุนเลย แต่ถ้า F2 ตัด (คลิก F2) กด S2 แล้วกลับหมุนได้ และ F2 หยุดมอเตอร์ไม่ได้', 'S2 does nothing; but after F2 trips (click F2) S2 starts the motor, and F2 can no longer stop it'],
    options: [['ต่อหน้าสัมผัส 97–98 (ต่อเมื่อตัด) แทน 95–96 (เปิดเมื่อตัด)', '97–98 (closes on a trip) is wired in place of 95–96 (opens on a trip)'], ['ฟิวส์ F1 ขาด', 'fuse F1 has blown'],
      ['S1 ใช้หน้าสัมผัส 13–14', 'S1 is wired on 13–14'], ['ไม่มีหน้าสัมผัสค้างตัวเอง', 'there is no holding contact']], answer: 0,
    fix: ['ย้ายสายไปที่ F2 95–96 (ปกติปิด) ส่วน 97–98 ใช้กับหลอดโอเวอร์โหลด H2 เท่านั้น', 'Move the wires to F2 95–96 (normally closed); 97–98 serves only the overload lamp H2'],
    test: ['F2 ปกติ: กด S2 แล้วหมุน; คลิก F2 ให้ตัด: มอเตอร์ต้องหยุด', 'F2 reset: S2 starts the motor; click F2 to trip it: the motor must stop'], seq: [['tap', 'S2'], ['run', true], ['toggle', 'F2'], ['run', false]] },
  { id: 'lampSeries', title: ['หลอดเดินต่ออนุกรมกับคอยล์', 'Run lamp in series with the coil'],
    spec: () => { const D = FD('H1'); return { supply: 'Q1', rows: 6, devices: D, power: P3(), els: [fuse(), olNC(1), stop(2), start(3), { k: 'lamp', d: 'H1', x: 0, y: 4, t: ['X1', 'X2'] }, coil(5), hold(3), w([[0, 3], [1, 3]], [0]), w([[0, 4], [1, 4]], [0])] }; },
    good: () => C5.SHEET(8),
    symptom: ['กด S2 แล้วไม่มีอะไรทำงาน: KM1 ไม่ดูด มอเตอร์ไม่หมุน และ H1 ไม่ติด (หรือติดหรี่ ๆ)', 'Pressing S2 does nothing: KM1 does not pull in, the motor does not run and H1 stays dark (or glows faintly)'],
    options: [['H1 ต่ออนุกรมกับคอยล์ แรงดัน 230 V แบ่งกันจนไม่พอทั้งคู่', 'H1 is in series with the coil; the two share the 230 V and neither gets enough'], ['หลอด H1 ขาด', 'lamp H1 has burnt out'],
      ['S1 ใช้หน้าสัมผัส 13–14', 'S1 is wired on 13–14'], ['ไม่มีหน้าสัมผัสค้างตัวเอง', 'there is no holding contact']], answer: 0,
    fix: ['ต่อ H1 ขนานกับคอยล์ (X1 ที่ A1, X2 ที่ N) หรือผ่าน KM1 53–54 อุปกรณ์ทุกตัวต้องได้แรงดันเต็ม 230 V', 'Connect H1 in parallel with the coil (X1 at A1, X2 at N) or through KM1 53–54; every load must get the full 230 V'],
    test: ['กด S2: KM1 ดูด มอเตอร์หมุน H1 ติด', 'Press S2: KM1 pulls in, the motor runs and H1 lights'], seq: [['tap', 'S2'], ['run', true], ['lit', 'H1', true]] },
  { id: 'h2After', title: ['หลอดโอเวอร์โหลดป้อนไฟหลัง 95–96', 'Overload lamp fed after 95–96'],
    spec: () => H2C(2), good: () => H2C(1),
    symptom: ['เมื่อ F2 ตัด มอเตอร์หยุดถูกต้อง แต่หลอดโอเวอร์โหลด H2 ไม่ติด', 'When F2 trips, the motor stops as it should, but overload lamp H2 stays dark'],
    options: [['H2 รับไฟจากจุดหลัง 95–96 ซึ่งไม่มีไฟเมื่อ F2 ตัด', 'H2 takes its supply after 95–96, which is dead once F2 has tripped'], ['หลอด H2 ขาด', 'lamp H2 has burnt out'],
      ['ต่อ 95–96 แทน 97–98', '95–96 is used instead of 97–98'], ['F1 ขาด', 'F1 has blown']], answer: 0,
    fix: ['ป้อนไฟ F2 97–98 จาก F1 ขั้ว 2 ก่อนถึง 95–96', 'Feed F2 97–98 from F1 terminal 2, ahead of 95–96'],
    test: ['คลิก F2 ให้ตัด: มอเตอร์หยุดและ H2 ติด', 'Click F2 to trip it: the motor stops and H2 lights'], seq: [['tap', 'S2'], ['run', true], ['toggle', 'F2'], ['run', false], ['lit', 'H2', true]] },
  { id: 'maintained', title: ['ใช้สวิตช์ค้างตำแหน่งแทนปุ่มเริ่มและหน้าสัมผัสค้าง', 'Maintained switch instead of a start button and holding contact'],
    spec: () => { const D = FD(); D.S2 = { type: 'sel', name: ['S2 สวิตช์ค้างตำแหน่ง เปิด / ปิด', 'S2 maintained switch on / off'] };
      return { supply: 'Q1', rows: 5, devices: D, power: P3(), els: [fuse(), olNC(1), stop(2), { k: 'NO', d: 'S2', x: 0, y: 3, t: ['13', '14'], op: 'sel' }, coil(4)] }; },
    good: () => C5.SHEET(7),
    symptom: ['ไฟดับขณะมอเตอร์หมุน เมื่อไฟกลับมา มอเตอร์หมุนเองทันทีโดยไม่มีใครกดเริ่ม', 'The power fails while the motor runs; when it returns, the motor starts by itself with nobody pressing start'],
    options: [['S2 เป็นสวิตช์ค้างตำแหน่ง (วงจร 2 สาย) ยังค้างอยู่ตำแหน่งเปิดเมื่อไฟกลับ', 'S2 is a maintained switch (two-wire control) that is still on when the power returns'], ['F2 รีเซ็ตเองอัตโนมัติ', 'F2 resets automatically'],
      ['หน้าสัมผัสค้างต่อคร่อมทั้ง S1 และ S2', 'the holding contact bridges both S1 and S2'], ['Q1 ไม่ได้ตัด', 'Q1 did not trip']], answer: 0,
    fix: ['ใช้ปุ่มกด S2 13–14 กับหน้าสัมผัสค้าง KM1 13–14 (วงจร 3 สาย) เมื่อไฟดับ KM1 หลุดและไม่เริ่มเองเมื่อไฟกลับ (IEC 60204-1 ข้อ 7.5)', 'Use push button S2 13–14 with holding contact KM1 13–14 (three-wire); after a power failure KM1 stays off until start is pressed (IEC 60204-1, 7.5)'],
    test: ['ให้มอเตอร์หมุน แล้วกด "ไฟดับแล้วกลับมา": มอเตอร์ต้องหยุดรอคนกดเริ่ม', 'Run the motor, then press "power fails and returns": the motor must stay off until start is pressed'],
    seq: [['start', 'S2'], ['run', true], ['cut'], ['run', false]] },
  { id: 'km2', title: ['หน้าสัมผัสค้างตั้งชื่อเป็น KM2', 'Holding contact named KM2'],
    spec: () => { const D = FD(); D.KM2 = { type: 'coil' }; return { supply: 'Q1', rows: 5, devices: D, power: P3(), els: [fuse(), olNC(1), stop(2), start(3), coil(4), hold(3, 1, 'KM2'), w([[0, 3], [1, 3]], [0]), w([[0, 4], [1, 4]], [0])] }; },
    good: () => C5.SHEET(7),
    symptom: ['มีหน้าสัมผัสคร่อม S2 อยู่ในแบบ แต่มอเตอร์หมุนเฉพาะตอนกด S2 ค้าง และใต้คอยล์ KM1 ไม่มี 13–14 ในตารางอ้างอิง', 'A contact is drawn across S2, yet the motor runs only while S2 is held, and the cross-reference under coil KM1 lists no 13–14'],
    options: [['หน้าสัมผัสชื่อ KM2 จึงเป็นของอุปกรณ์อื่นและไม่ต่อเมื่อ KM1 ดูด (ใน CADe SIMU สัญลักษณ์ของอุปกรณ์เดียวกันต้องชื่อเดียวกัน)', 'the contact is named KM2, so it belongs to another device and does not close when KM1 pulls in (in CADe SIMU every symbol of one device has the same name)'],
      ['หน้าสัมผัสคร่อม S2 เป็นแบบปกติปิด 21–22', 'the contact across S2 is a normally closed 21–22'], ['S1 ใช้หน้าสัมผัส 13–14', 'S1 is wired on 13–14'], ['F2 95–96 เปิดค้าง', 'F2 95–96 is stuck open']], answer: 0,
    fix: ['เปลี่ยนชื่อหน้าสัมผัสเป็น KM1 ให้ตรงกับคอยล์ ตารางอ้างอิงใต้คอยล์จะแสดง 13–14 ▸ 2', 'Rename the contact KM1 to match the coil; the cross-reference under the coil then shows 13–14 ▸ 2'],
    test: ['กด S2 แล้วปล่อย: มอเตอร์หมุนต่อ', 'Press and release S2: the motor keeps running'], seq: [['tap', 'S2'], ['run', true]] },
  { id: 'stopN', title: ['ปุ่มหยุดอยู่ฝั่ง N ของคอยล์', 'Stop button on the N side of the coil'],
    spec: () => EF(true), good: () => EF(false),
    symptom: ['วงจรเริ่มและหยุดได้ปกติ จนเกิดลัดลงดินที่สายระหว่างคอยล์ KM1 กับ S1 (แตะจุดลัดลงดิน) แล้วกด S1 มอเตอร์ไม่หยุด', 'The circuit starts and stops normally until an earth fault appears on the wire between coil KM1 and S1 (tap the earth fault); then S1 no longer stops the motor'],
    options: [['S1 อยู่ฝั่ง N ของคอยล์ ลัดลงดินตรงนั้นต่อคร่อม S1 ไปยังนิวทรัลที่ต่อลงดิน', 'S1 sits on the N side of the coil; an earth fault there bridges S1 to the earthed neutral'], ['S1 ใช้หน้าสัมผัส 13–14', 'S1 is wired on 13–14'],
      ['ฟิวส์ F1 ใหญ่เกินไป', 'fuse F1 is too large'], ['คอยล์ KM1 ผิดแรงดัน', 'coil KM1 has the wrong voltage']], answer: 0,
    fix: ['ย้าย S1 ไปฝั่ง L ก่อน S2 และต่อ A2 ของคอยล์ตรงไป N; ลัดลงดินฝั่ง L ทำให้ F1 ขาด มอเตอร์หยุด (หลักของ IEC 60204-1 ข้อ 9.4.3.1)', 'Move S1 to the L side ahead of S2 and take A2 of the coil straight to N; an earth fault on the L side then blows F1 and the motor stops (the principle of IEC 60204-1, 9.4.3.1)'],
    test: ['ขณะมอเตอร์หมุน แตะจุดลัดลงดินที่สาย A1: F1 ขาด KM1 หลุด มอเตอร์หยุด', 'With the motor running, tap the earth fault on the A1 wire: F1 blows, KM1 drops out and the motor stops'],
    seq: [['tap', 'S2'], ['run', true], ['fault', 'E'], ['tap', 'S1'], ['run', false]] }];

/* ---------------- 3) control buttons for a simulator ---------------- */
/* C5.powerCut(sim, { ms, via, done }): the supply fails (Q1 stays closed) and returns after ms; via 'Q1' switches Q1 off and on instead
   (as in CADe SIMU; needed to show a control circuit fed ahead of Q1, which a real power cut would also switch off) */
C5.powerCut = (sim, o = {}) => { if (sim._cut) return false; sim._cut = true; const before = sim.running(), q = o.via === 'Q1' && sim.dev.Q1;
  if (q) { if (sim.dev.Q1.on) sim.toggle('Q1'); } else sim.setMains(false);
  setTimeout(() => { if (q) { if (!sim.dev.Q1.on) sim.toggle('Q1'); } else sim.setMains(true); sim._cut = false; if (o.done) o.done({ before, after: sim.running() }); }, o.ms ?? 1500); return true; };
/* C5.panel(el, sim, o): a row of hold-to-press buttons (push buttons) and toggles (switches, breaker, overload, sensors, earth faults) in
   the order of spec.devices, a power-cut button and a status line. o: { skip: [ids], only: [ids], names: { id: [th, en] }, cut (default
   true), cutVia: 'Q1' (the power-cut button switches Q1 off and on), status: sim => [pill, text, kind] (replaces the default),
   onAct({ id, act, before, after }) after every action } */
C5.panel = (el, sim, o = {}) => {
  const row = document.createElement('div'); row.className = 'toggles c5row'; el.appendChild(row);
  const name = id => tt((o.names && o.names[id]) || sim.dev[id].name || [id, id]), act = (id, a, before) => { if (o.onAct) o.onAct({ id, act: a, before, after: sim.running() }); show(); };
  const ids = Object.keys(sim.dev).filter(id => (!o.only || o.only.includes(id)) && !(o.skip || []).includes(id) && !sim.dev[id].noClick);
  ids.forEach(id => { const d = sim.dev[id], b = document.createElement('button'); b.type = 'button';
    if (d.type === 'pb') { b.className = 'btn hold'; b.innerHTML = `${d.cap ? `<i class="capdot cap-${d.cap}"></i>` : ''}${name(id)} ${T('(กดค้าง)', '(hold)')}`; let before = false;
      b.addEventListener('pointerdown', e => { e.preventDefault(); before = sim.running(); sim.press(id, true); act(id, 'press', before); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { if (!sim.dev[id].pressed) return; const bf = sim.running(); sim.press(id, false); act(id, 'release', bf); })); }
    else if (['sel', 'sen', 'cb', 'ol', 'fault', 'msel'].includes(d.type)) { b.className = 'btn'; b.textContent = d.type === 'fault' ? T('⏚ ลัดลงดิน มี / ไม่มี', '⏚ earth fault on / off') : name(id);
      b.addEventListener('click', () => { const bf = sim.running(); sim.toggle(id); act(id, 'toggle', bf); }); }
    else return; row.appendChild(b); });
  if (o.cut !== false) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn on'; b.textContent = T('⚡ ไฟดับแล้วกลับมา', '⚡ Power fails and returns');
    b.addEventListener('click', () => { C5.powerCut(sim, { via: o.cutVia, done: r => { if (o.onAct) o.onAct({ id: 'mains', act: 'cut', before: r.before, after: r.after }); show(); } }); show(); }); row.appendChild(b); }
  const st = MC.ui.status(el);
  const show = () => { const s = o.status ? o.status(sim) : C5.state(sim); MC.ui.setStatus(st, s[0], s[1], s[2]); };
  sim.on(show); show(); return { row, status: st, refresh: show }; };
/* default status of a DOL simulator: [pill, text, kind] */
C5.state = sim => { const run = sim.running(), d = sim.dev;
  if (sim.mains === false) return [T('ไฟดับ', 'power off'), T('รอไฟกลับมา…', 'waiting for the power…'), 'bad'];
  if (d.Q1 && !d.Q1.on) return sim.spec.supply ? [T('Q1 ปลด', 'Q1 off'), T('ทั้งวงจรกำลังและวงจรควบคุมไม่มีไฟ', 'no supply to the power or the control circuit'), 'warn'] :
    [T('Q1 ปลด', 'Q1 off'), d.KM1 && d.KM1.energized ? T('มอเตอร์ไม่มีไฟ แต่วงจรควบคุมป้อนก่อน Q1 จึงยังมีไฟ และ KM1 ยังดูดอยู่', 'the motor has no supply, but the control circuit is fed ahead of Q1, so it is still live and KM1 is still in') : T('มอเตอร์ไม่มีไฟ แต่วงจรควบคุมป้อนก่อน Q1 จึงยังมีไฟ', 'the motor has no supply, but the control circuit is fed ahead of Q1 and is still live'), 'warn'];
  if (d.F1 && d.F1.blown) return [T('F1 ขาด', 'F1 blown'), T('วงจรควบคุมไม่มีไฟ คลิกที่ F1 เพื่อเปลี่ยนฟิวส์', 'the control circuit is dead; click F1 to replace it'), 'bad'];
  if (d.F2 && d.F2.tripped) return [T('F2 ตัด', 'F2 tripped'), run ? T('มอเตอร์ยังหมุน: ไม่มี 95–96 ในวงจรควบคุม', 'the motor still runs: no 95–96 in the control circuit') : T('มอเตอร์หยุด คลิก F2 เพื่อรีเซ็ต', 'the motor has stopped; click F2 to reset'), run ? 'warn' : 'bad'];
  if (d.F3 && !d.F3.on) return [T('F3 เปิด', 'F3 open'), T('เฟสผิดปกติ: 11–14 เปิด', 'phase failure: 11–14 open'), 'bad'];
  return run ? [T('มอเตอร์หมุน', 'motor running'), d.KM1 && d.KM1.energized ? T('KM1 ดูด', 'KM1 energised') : '', 'good'] : [T('มอเตอร์หยุด', 'motor stopped'), '', 'wait']; };

/* ---------------- 4) DOL start-up ---------------- */
/* per-unit model: dω/dt = (T_motor(s) − T_load(ω)) / τ with τ = τ_motor (1 + J), J = load inertia as a multiple of the rotor's;
   τ_motor = J_rotor·ω_s / T_N ≈ 0.12 s for a 7.5 kW four-pole motor (example value). The overload relay heats with dθ/dt = (k² − θ)/τ_class,
   k = I / I_N (dial set to I_N), and trips at θ = K_T² (the C4 model). After a trip KM1 drops out and the motor coasts. */
C5.START = { tauM: 0.12 };
C5.startRun = (p = {}) => {
  const J = p.J ?? 10, TL = p.TL ?? 0.6, fan = p.type === 'fan', cls = p.cls || '10', tau = C5.START.tauM * (1 + J), tauC = C4.tau(cls), KT2 = C4.KT ** 2, tl = v => (fan ? TL * v * v : TL);
  let lo = 1e-6, hi = ED.motor.breakdown().s; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (ED.motor(m).T < tl(1 - m)) lo = m; else hi = m; }
  const wSS = 1 - lo, m0 = ED.motor(1), dt = 0.0005, pts = [];
  let v = 0, t = 0, th = 0, tStart = null, tTrip = null, thEnd = null, tEnd = 60;
  while (t < tEnd) { const s = 1 - v, m = tTrip === null ? ED.motor(s) : { i: 0, T: 0 }, k2 = m.i * m.i;
    th = k2 + (th - k2) * Math.exp(-dt / tauC);
    if (tTrip === null && th >= KT2) { tTrip = t; tEnd = Math.min(tEnd, t + Math.max(0.4, 0.3 * t)); }
    if (tStart === null && tTrip === null && v >= wSS - 0.015) { tStart = t; thEnd = th / KT2; tEnd = Math.min(tEnd, t + Math.max(0.25, 0.3 * t)); }
    if (pts.length === 0 || t - pts[pts.length - 1][0] >= 0.002) pts.push([t, m.i, m.T, tl(v), v, th / KT2]);
    v = Math.min(1, Math.max(0, v + (m.T - (v > 0 || m.T > tl(0) ? tl(v) : m.T)) / tau * dt)); t += dt; }
  const step = Math.max(1, Math.floor(pts.length / 500)), cur = pts.filter((q, i) => i % step === 0 || i === pts.length - 1);
  return { p: { J, TL, type: fan ? 'fan' : 'const', cls }, tau, i0: m0.i, T0: m0.T, wSS, iEnd: ED.motor(1 - wSS).i, tStart, tTrip, tripped: tTrip !== null, thEnd: thEnd ?? 1, tTrip0: C4.tripTime(cls, m0.i), span: t, pts: cur }; };
/* the start-up chart: current and torque (× rated) on top, speed and overload heat (% of the trip level) below; o.until draws up to that time */
C5.startSVG = (r, o = {}) => {
  const x0 = 52, x1 = 520, span = r.span, X = t => x0 + (x1 - x0) * t / span, Ya = v => 150 - 120 * Math.min(v, 8) / 8, Yb = v => 300 - 110 * Math.min(v, 1.2) / 1.2, until = o.until ?? span;
  let s = IE.T(T('กระแสและแรงบิด (เท่าของค่าพิกัด)', 'current and torque (× rated)'), x0, 18, { size: 10, weight: 700 }) + IE.T(T('ความเร็วและความร้อนใน F2', 'speed and heat in F2'), x0, 176, { size: 10, weight: 700 });
  [0, 2, 4, 6, 8].forEach(v => { s += IE.L(x0, Ya(v), x1, Ya(v), { col: 'var(--line)', dash: v ? '1 3' : '' }) + IE.T(`${v}×`, x0 - 4, Ya(v) + 3, { size: 9, anchor: 'end', col: 'var(--muted)' }); });
  [0, 0.5, 1].forEach(v => { s += IE.L(x0, Yb(v), x1, Yb(v), { col: v === 1 ? 'var(--line)' : 'var(--line)', dash: v ? '1 3' : '' }) + IE.T(`${v * 100}%`, x0 - 4, Yb(v) + 3, { size: 9, anchor: 'end', col: 'var(--muted)' }); });
  s += IE.L(x0, Yb(1), x1, Yb(1), { col: '#c0392b', dash: '6 3' }) + IE.T(T('F2 ตัดที่ 100 %', 'F2 trips at 100 %'), x1, Yb(1) - 4, { size: 9, anchor: 'end', col: '#c0392b', weight: 700 });
  const nt = span > 20 ? 5 : span > 8 ? 2 : span > 3 ? 1 : span > 1.2 ? 0.5 : span > 0.5 ? 0.2 : 0.1;
  for (let t = 0; t <= span + 1e-9; t += nt) s += IE.L(X(t), 30, X(t), 300, { col: 'var(--line)', dash: '1 4' }) + IE.T(ED.fd(t, nt < 1 ? 1 : 0), X(t), 314, { size: 9, anchor: 'middle', col: 'var(--muted)' });
  s += IE.T(T('เวลา (วินาที)', 'time (s)'), x1, 328, { size: 9, anchor: 'end', col: 'var(--muted)' });
  const P = r.pts.filter(q => q[0] <= until), line = (k, Y, col, wd, dash) => (P.length > 1 ? `<polyline points="${P.map(q => `${f1(X(q[0]))},${f1(Y(q[k]))}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${wd}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>` : '');
  s += line(3, Ya, '#8a93a6', 1.6, '5 3') + line(2, Ya, '#8e44ad', 2) + line(1, Ya, '#e08a2e', 2.4) + line(4, Yb, GOOD, 2.4) + line(5, Yb, '#c0392b', 2.2);
  const leg = [['#e08a2e', T('กระแส I', 'current I')], ['#8e44ad', T('แรงบิดมอเตอร์', 'motor torque')], ['#8a93a6', T('แรงบิดโหลด', 'load torque')], ['#1d8a4a', T('ความเร็ว', 'speed')], ['#c0392b', T('ความร้อนใน F2', 'heat in F2')]];
  leg.forEach(([c, l], i) => { const lx = x0 + 6 + (i % 3) * 156, ly = i < 3 ? 346 : 362; s += IE.L(lx, ly - 4, lx + 18, ly - 4, { col: c, w: 2.4 }) + IE.T(l, lx + 22, ly, { size: 9.5 }); });
  if (r.tTrip !== null && until >= r.tTrip) s += IE.L(X(r.tTrip), 30, X(r.tTrip), 300, { col: '#c0392b', w: 1.6 }) + IE.T(T(`F2 ตัด ${ED.fd(r.tTrip, 1)} s`, `F2 trips ${ED.fd(r.tTrip, 1)} s`), X(r.tTrip) - 4, 44, { size: 10, anchor: 'end', weight: 700, col: '#c0392b' });
  else if (r.tStart !== null && until >= r.tStart) s += IE.L(X(r.tStart), 30, X(r.tStart), 300, { col: GOOD, w: 1.4, dash: '4 3' }) + IE.T(T(`เริ่มเดินเสร็จ ${ED.fd(r.tStart, 2)} s`, `up to speed ${ED.fd(r.tStart, 2)} s`), X(r.tStart) + 4, 44, { size: 10, weight: 700, col: GOOD });
  if (o.until !== undefined && o.until < span) s += IE.L(X(until), 26, X(until), 302, { col: 'var(--accent)', w: 2 });
  if (!P.length || o.blank) s += IE.T(T('กด "เริ่มเดิน" เพื่อดูกราฟ', 'Press "start" to draw the curves'), (x0 + x1) / 2, 100, { size: 12, anchor: 'middle', col: 'var(--muted)' });
  return IE.svg(540, 372, s, { max: o.max || 680, label: 'DOL start-up curves' }); };
/* C5.Start(el, { panel, p: { J, TL, type: 'const'|'fan', cls: '10'|'20' }, onResult(r) }); the page calls LS.anim(el, dt => w.step(dt)).
   With o.panel the widget builds its sliders, radios and the start button there; otherwise use set(p) and start(). */
C5.Start = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.p = { J: 10, TL: 0.6, type: 'const', cls: '10', ...(o.p || {}) }; this.r = C5.startRun(this.p); this.play = null; this.shown = false;
    el.innerHTML = '<div class="c5start"><div class="c5ch"></div><div class="c5res"></div></div>'; this.chEl = el.querySelector('.c5ch'); this.resEl = el.querySelector('.c5res');
    if (o.panel) this.controls(o.panel); this.draw(); }
  controls(pn) { const ui = MC.ui, id = this.o.id || 'c5s';
    ui.slider(pn, { id: id + 'J', label: T('ความเฉื่อยของโหลด (เท่าของโรเตอร์)', 'load inertia (× rotor inertia)'), min: 0, max: 200, step: 5, value: this.p.J, dec: 0, fmt: v => `${v} ×`, oninput: v => this.set({ J: v }) });
    ui.slider(pn, { id: id + 'T', label: T('แรงบิดโหลดที่ความเร็วพิกัด', 'load torque at rated speed'), min: 0, max: 100, step: 5, value: Math.round(this.p.TL * 100), dec: 0, unit: '%', oninput: v => this.set({ TL: v / 100 }) });
    ui.radio(pn, [{ id: id + 'c', label: T('แรงบิดคงที่ (สายพาน)', 'constant torque (conveyor)'), on: this.p.type !== 'fan' }, { id: id + 'f', label: T('พัดลม/ปั๊ม (ตามความเร็วยกกำลังสอง)', 'fan or pump (∝ speed²)'), on: this.p.type === 'fan' }], k => this.set({ type: k === id + 'f' ? 'fan' : 'const' }));
    ui.radio(pn, [{ id: id + '10', label: T('F2 คลาส 10', 'F2 class 10'), on: this.p.cls !== '20' }, { id: id + '20', label: T('F2 คลาส 20', 'F2 class 20'), on: this.p.cls === '20' }], k => this.set({ cls: k === id + '20' ? '20' : '10' }));
    ui.buttons(pn, [{ label: T('▶ เริ่มเดิน (KM1 ต่อ)', '▶ Start (KM1 closes)'), cls: 'on', onclick: () => this.start() }]); }
  set(p) { Object.assign(this.p, p); this.r = C5.startRun(this.p); this.play = null; this.shown = false; this.draw(); }
  start() { this.r = C5.startRun(this.p); this.play = 0; this.shown = false; this.draw(); }
  get result() { return this.r; }
  step(dt) { if (this.play === null) return; const sp = Math.max(1, this.r.span / 3); this.play += dt * sp;
    if (this.play >= this.r.span) { this.play = null; this.shown = true; this.draw(); if (this.o.onResult) this.o.onResult(this.r); } else this.draw(); }
  verdict(r = this.r) { return r.tripped ? 'bad' : r.thEnd > 0.7 ? 'warn' : 'ok'; }
  text(r = this.r) { const cls = r.p.cls, i0 = ED.fd(r.i0, 1), tr0 = ED.fd(r.tTrip0, 1);
    if (r.tripped) return T(`กระแสเริ่มเดิน ${i0} × พิกัด มอเตอร์ยังเร่งไม่เสร็จ F2 คลาส ${cls} ก็ตัดที่ ${ED.fd(r.tTrip, 1)} s: เลือกคลาส 20 หรือวิธีเริ่มเดินแบบลดกระแส`, `Starting current ${i0} × rated; the motor has not finished accelerating when F2 class ${cls} trips at ${ED.fd(r.tTrip, 1)} s: choose class 20 or a reduced-current starting method`);
    return T(`เริ่มเดินเสร็จใน ${ED.fd(r.tStart, 2)} s กระแสเริ่มเดิน ${i0} × พิกัด F2 คลาส ${cls} สะสมความร้อน ${Math.round(r.thEnd * 100)} % ของจุดตัด จึงไม่ตัด (ที่กระแส ${i0} × คงที่ คลาส ${cls} จะตัดหลัง ${tr0} s)`,
      `Up to speed in ${ED.fd(r.tStart, 2)} s; starting current ${i0} × rated; F2 class ${cls} reached ${Math.round(r.thEnd * 100)} % of its trip level, so it does not trip (at a steady ${i0} × class ${cls} would trip after ${tr0} s)`); }
  draw() { const until = this.play !== null ? this.play : this.shown ? this.r.span : 0;
    this.chEl.innerHTML = C5.startSVG(this.r, { until, blank: this.play === null && !this.shown });
    const k = this.verdict(); this.resEl.innerHTML = this.play === null && this.shown ? `<span class="pill ${k === 'ok' ? 'good' : k}">${k === 'bad' ? T('F2 ตัด', 'F2 trips') : k === 'warn' ? T('เกือบตัด', 'close to tripping') : T('ไม่ตัด', 'no trip')}</span> ${this.text()}` :
      this.play !== null ? `<span class="pill wait">${T('กำลังเริ่มเดิน…', 'starting…')}</span> ${this.r.span > 3 ? T(`เร่งภาพ ${ED.fd(this.r.span / 3, 0)} เท่า`, `shown ${ED.fd(this.r.span / 3, 0)} × faster`) : T('เวลาจริง', 'real time')}` :
      `<span class="pill wait">${T('พร้อม', 'ready')}</span> ${T('ตั้งโหลดแล้วกด "เริ่มเดิน"', 'Set the load, then press "start"')}`; }
};

/* ---------------- 5) jog-button race ---------------- */
/* the double-contact jog button S3 is released at t = 0: 13–14 opens at once, 21–22 re-closes tRel later; KM1 loses its coil supply at
   t = 0 and its 13–14 opens tDrop later (drop-out time). If 21–22 closes first (tRel < tDrop) the coil is fed again through
   KM1 13–14 + S3 21–22: the contactor latches and the motor keeps running. Example values in milliseconds. */
C5.race = (tRel, tDrop) => ({ tRel, tDrop, latch: tRel < tDrop });
C5.raceSVG = (tRel, tDrop, o = {}) => {
  const x0 = 140, x1 = 540, tA = -10, tB = 60, X = t => x0 + (x1 - x0) * (t - tA) / (tB - tA), latch = tRel < tDrop, until = o.until ?? tB, rowH = 40;
  const rows = [['S3 13–14', T('ปุ่มเดินกระตุก (ปกติเปิด)', 'jog button (NO)'), t => t < 0], ['S3 21–22', T('ปุ่มเดินกระตุก (ปกติปิด)', 'jog button (NC)'), t => t >= tRel],
    ['KM1 A1–A2', T('คอยล์', 'coil'), t => t < 0 || (latch && t >= tRel)], ['KM1 13–14', T('หน้าสัมผัสค้าง', 'holding contact'), t => t < tDrop || latch], ['M1', T('มอเตอร์', 'motor'), t => t < tDrop || latch]];
  let s = '';
  for (let t = tA; t <= tB; t += 10) s += IE.L(X(t), 14, X(t), 22 + rowH * rows.length, { col: 'var(--line)', dash: t === 0 ? '' : '1 3' }) + IE.T(`${t}`, X(t), 36 + rowH * rows.length, { size: 9, anchor: 'middle', col: 'var(--muted)' });
  s += IE.T(T('เวลาหลังเริ่มปล่อยปุ่ม (มิลลิวินาที)', 'time after the release starts (ms)'), x1, 50 + rowH * rows.length, { size: 9, anchor: 'end', col: 'var(--muted)' });
  rows.forEach(([lab, sub, fn], i) => { const yb = 22 + rowH * (i + 1) - 8, yt = yb - 20;
    s += IE.T(lab, x0 - 8, yb - 9, { size: 11, anchor: 'end', weight: 700 }) + IE.T(sub, x0 - 8, yb + 2, { size: 8.5, anchor: 'end', col: 'var(--muted)' }) + IE.L(x0, yb, x1, yb, { col: 'var(--line)' });
    const end = Math.min(until, tB), edges = [...new Set([tA, 0, tRel, tDrop, end])].filter(v => v >= tA && v <= end).sort((a, b) => a - b), runs = [];
    for (let j = 0; j < edges.length - 1; j++) { const a = edges[j], b = edges[j + 1], hot = i === 4 && latch && a >= tDrop - 1e-9; if (b <= a || !fn((a + b) / 2)) continue;   // contiguous closed spans make one bar
      const r = runs[runs.length - 1]; if (r && r.b === a && r.hot === hot) r.b = b; else runs.push({ a, b, hot }); }
    runs.forEach(r => { s += `<rect x="${f1(X(r.a))}" y="${yt}" width="${f1(X(r.b) - X(r.a))}" height="18" rx="3" fill="${r.hot ? HOT : GOOD}" opacity=".85" stroke="none"/>`; }); });
  const yNC = 22 + rowH * 2 - 8 - 26, yKM = 22 + rowH * 4 - 8 - 26;
  if (until >= tRel) s += IE.L(X(0), yNC, X(tRel), yNC, { col: 'var(--accent)' }) + IE.L(X(tRel), yNC - 4, X(tRel), yNC + 4, { col: 'var(--accent)' }) + IE.T(T(`21–22 กลับต่อ ${tRel} ms`, `21–22 recloses ${tRel} ms`), X(tRel) + 4, yNC + 3, { size: 9, weight: 700, col: 'var(--accent)' });
  if (until >= tDrop || latch) s += IE.L(X(0), yKM, X(tDrop), yKM, { col: '#8e44ad' }) + IE.L(X(tDrop), yKM - 4, X(tDrop), yKM + 4, { col: '#8e44ad' }) + IE.T(T(`KM1 ปล่อย ${tDrop} ms`, `KM1 drops out ${tDrop} ms`), X(tDrop) + 4, yKM + 3, { size: 9, weight: 700, col: '#8e44ad' });
  if (latch && until >= tRel) s += `<circle cx="${f1(X(tRel))}" cy="${22 + rowH * 3 - 19}" r="8" fill="none" stroke="${HOT}" stroke-width="2"/>` + IE.T(T('ค้างตัวเอง!', 'latched!'), X(tRel) - 10, 22 + rowH * 3 - 31, { size: 10, weight: 700, col: HOT, anchor: 'end' });
  if (o.until !== undefined && o.until < tB) s += IE.L(X(until), 12, X(until), 24 + rowH * rows.length, { col: 'var(--accent)', w: 2 });
  s += IE.T(T('แถบเขียว = ต่อ / มีไฟ', 'green bar = closed / energised'), x0, 64 + rowH * rows.length, { size: 9, col: 'var(--muted)' });
  return IE.svg(560, 72 + rowH * rows.length, s, { max: o.max || 680, label: 'jog button release timing' }); };
/* C5.JogRace(el, { panel, tRel, tDrop, onResult(r) }); LS.anim(el, dt => w.step(dt)) for the slow-motion replay of a release */
C5.JogRace = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.tRel = o.tRel ?? 5; this.tDrop = o.tDrop ?? 15; this.play = null;
    el.innerHTML = '<div class="c5race"><div class="c5ch"></div><div class="c5res"></div></div>'; this.chEl = el.querySelector('.c5ch'); this.resEl = el.querySelector('.c5res');
    if (o.panel) this.controls(o.panel); this.draw(); }
  controls(pn) { const ui = MC.ui, id = this.o.id || 'c5r';
    this.sR = ui.slider(pn, { id: id + 'r', label: T('เวลาจาก 13–14 เปิดจน 21–22 กลับต่อ (ปล่อยเร็ว = น้อย)', 'time from 13–14 opening to 21–22 re-closing (fast release = short)'), min: 1, max: 40, step: 1, value: this.tRel, unit: 'ms', dec: 0, oninput: v => this.set({ tRel: v }) });
    this.sD = ui.slider(pn, { id: id + 'd', label: T('เวลาปล่อยของคอนแทกเตอร์ (drop-out)', 'contactor drop-out time'), min: 5, max: 40, step: 1, value: this.tDrop, unit: 'ms', dec: 0, oninput: v => this.set({ tDrop: v }) });
    ui.buttons(pn, [{ label: T('▶ ปล่อยปุ่ม S3 (ภาพช้า)', '▶ Release S3 (slow motion)'), cls: 'on', onclick: () => this.release() }]);
    ui.html(pn, T('ตัวเลขเป็นค่าตัวอย่าง: ไม่กี่ถึงหลายสิบมิลลิวินาที ดูค่าจริงจากเอกสารข้อมูลของคอนแทกเตอร์', 'The numbers are example values, a few to a few tens of milliseconds; check the contactor data sheet'), 'hint'); }
  set(p) { if (p.tRel !== undefined) this.tRel = p.tRel; if (p.tDrop !== undefined) this.tDrop = p.tDrop; this.play = null; this.draw(); }
  get result() { return C5.race(this.tRel, this.tDrop); }
  release() { this.play = -10; this.draw(); }
  step(dt) { if (this.play === null) return; this.play += dt * 30;   // 30 ms of the chart per second
    if (this.play >= 60) { this.play = null; this.draw(); if (this.o.onResult) this.o.onResult(this.result); } else this.draw(); }
  draw() { const r = this.result; this.chEl.innerHTML = C5.raceSVG(this.tRel, this.tDrop, { until: this.play ?? undefined });
    this.resEl.innerHTML = r.latch ? `<span class="pill bad">${T('ค้างตัวเอง', 'latches')}</span> ${T(`21–22 กลับต่อที่ ${this.tRel} ms ขณะ KM1 13–14 ยังต่ออยู่ (ปล่อยที่ ${this.tDrop} ms) คอยล์ได้ไฟอีก มอเตอร์หมุนต่อทั้งที่ปล่อยปุ่มเดินกระตุกแล้ว`, `21–22 re-closes at ${this.tRel} ms while KM1 13–14 is still closed (it opens at ${this.tDrop} ms): the coil is fed again and the motor keeps running although the jog button was released`)}` :
      `<span class="pill good">${T('ไม่ค้าง', 'no latch')}</span> ${T(`KM1 13–14 เปิดที่ ${this.tDrop} ms ก่อน 21–22 กลับต่อที่ ${this.tRel} ms มอเตอร์หยุดตามที่ต้องการ`, `KM1 13–14 opens at ${this.tDrop} ms, before 21–22 re-closes at ${this.tRel} ms: the motor stops as intended`)}`; }
};

/* ---------------- 6) phase-failure relay ---------------- */
/* the supply after Q1 feeds: voltmeter P1 (L1–L2), the phase-failure relay F3 (L1 L2 L3 N), phase lamps H4–H6 through Q2, and the
   motor through KM1 and F2 (ammeter P2 on current transformer T1 in L3). F3 closes 11–14 while all three phases are present in the
   right sequence; it opens after its delay and resets by itself after the same delay. Losing L1 kills the 230 V control circuit anyway.
   A running motor back-feeds a lost phase (shown as about 60 %), so a lamp on that phase glows dimly. Example motor: I_N = 3.5 A. */
C5.PHASE_T = 1.0; C5.IN = 3.5;
C5.Phase = class {
  constructor(el, o = {}) { this.el = el; this.o = o; this.lost = { L1: false, L2: false, L3: false }; this.swap = false; this.bypass = false; this.out = true; this.cnt = 0; this.spd = 0; this.dir = 1; this.rot = 0;
    el.innerHTML = '<div class="c5phase"><div class="c5ps"></div><div class="c5pc rlwrap"></div></div>'; this.psEl = el.querySelector('.c5ps');
    const spec = C5.PHASE(); spec.devices.F3.noClick = true; this.sim = new RL.Sim(el.querySelector('.c5pc'), spec, { noPower: true, max: o.max || 640, label: 'control circuit with phase-failure relay' });
    this.sim.on(() => this.draw()); if (o.panel) this.controls(o.panel); this.sync(); this.draw(); }
  controls(pn) { const ui = MC.ui, id = this.o.id || 'c5p', tg = (k, lab, fn) => ({ id: id + k, label: lab, onclick: () => { fn(); this.sync(); this.draw(); this.changed(); } });
    ui.h2(pn, T('แหล่งจ่าย', 'Supply'));
    this.tb = ui.buttons(pn, [tg('L1', T('L1 ขาด', 'L1 lost'), () => (this.lost.L1 = !this.lost.L1)), tg('L2', T('L2 ขาด', 'L2 lost'), () => (this.lost.L2 = !this.lost.L2)), tg('L3', T('L3 ขาด', 'L3 lost'), () => (this.lost.L3 = !this.lost.L3)),
      tg('sw', T('สลับ L1 ↔ L3', 'L1 ↔ L3 swapped'), () => (this.swap = !this.swap)), tg('by', T('ไม่มี F3 (ต่อข้าม)', 'without F3 (bypassed)'), () => (this.bypass = !this.bypass))]);
    ui.h2(pn, T('สั่งงาน', 'Control')); this.pan = C5.panel(pn, this.sim, { only: ['Q1', 'S1', 'S2', 'F2'], cut: false, status: () => this.status(), onAct: () => this.changed() }); }
  /* set(p): { lost: { L1, L2, L3 }, swap, bypass } from the page (instead of the built-in buttons) */
  set(p = {}) { if (p.lost) Object.assign(this.lost, p.lost); if (p.swap !== undefined) this.swap = !!p.swap; if (p.bypass !== undefined) this.bypass = !!p.bypass; this.sync(); this.draw(); this.changed(); }
  ang(k) { const a = { L1: 0, L2: -120, L3: 120 }; if (this.swap) { a.L1 = 120; a.L3 = 0; } return a[k] * Math.PI / 180; }   // the swap is in the incoming cable: terminal L1 carries the third phase
  /* phase voltages at the terminals after Q1, per unit: present 1; lost but back-fed by the turning motor 0.6; lost 0 */
  volts() { const q = this.sim.dev.Q1.on, back = this.spd > 0.3 && this.kmClosed(), V = {};
    ['L1', 'L2', 'L3'].forEach(k => { V[k] = !q ? 0 : !this.lost[k] ? 1 : back ? 0.6 : 0; }); return V; }
  kmClosed() { return this.sim.running(); }
  present() { return ['L1', 'L2', 'L3'].filter(k => this.sim.dev.Q1.on && !this.lost[k]).length; }
  healthy() { const V = this.volts(); return ['L1', 'L2', 'L3'].every(k => V[k] >= 0.85) && !this.swap; }
  sync() { this.sim.setMains(!this.lost.L1); const want = this.bypass ? true : this.out; if (this.sim.dev.F3.on !== want) this.sim.toggle('F3');
    if (this.tb) { const id = this.o.id || 'c5p', on = { L1: this.lost.L1, L2: this.lost.L2, L3: this.lost.L3, sw: this.swap, by: this.bypass }; Object.entries(on).forEach(([k, v]) => { const b = this.tb[id + k]; if (b) b.classList.toggle('on', v); }); } }
  changed() { if (this.o.onChange) this.o.onChange(this.state()); }
  state() { const st = this.status(); return { lost: { ...this.lost }, swap: this.swap, bypass: this.bypass, f3: this.sim.dev.F3.on, healthy: this.healthy(), km: this.kmClosed(), turning: this.spd > 0.3, dir: this.dir, amps: this.amps(), pill: st[0], text: st[1], kind: st[2] }; }
  /* current in L3 (where T1 sits), example motor I_N = 3.5 A */
  amps() { if (!this.kmClosed() || this.lost.L3) return 0; const n = this.present(); return n === 3 ? C5.IN * (this.spd > 0.9 ? 1 : 6.5) : n === 2 ? C5.IN * (this.spd > 0.5 ? 1.73 : 5.6) : 0; }
  step(dt) { const h = this.healthy(), was = this.spd; let ch = false;
    if (h !== this.out) { this.cnt += dt; if (this.cnt >= C5.PHASE_T) { this.out = h; this.cnt = 0; ch = true; } } else this.cnt = 0;
    const km = this.kmClosed(), n = this.present();
    if (km && n === 3) { this.dir = this.swap ? -1 : 1; this.spd += (1 - this.spd) * Math.min(1, dt / 0.5); }
    else if (km && n === 2 && this.spd > 0.5) this.spd += (0.93 - this.spd) * Math.min(1, dt / 0.5);   // single-phasing: keeps turning, a little slower
    else this.spd = Math.max(0, this.spd - dt / 1.5);
    this.rot += dt * 7 * this.spd * this.dir;
    if (ch) { this.sync(); this.changed(); }
    if (ch || this.spd > 0.01 || was > 0.01 || this.cnt > 0) this.draw(); }
  status() { const km = this.kmClosed(), n = this.present(), d = this.sim.dev;
    if (this.lost.L1) return [T('L1 ขาด', 'L1 lost'), T('วงจรควบคุมรับไฟจาก L1 จึงดับทั้งวงจร KM1 หลุด', 'the control circuit is fed from L1, so all of it is dead and KM1 drops out'), 'bad'];
    if (!d.Q1.on) return [T('Q1 ปลด', 'Q1 off'), T('ไม่มีไฟหลัง Q1', 'no supply after Q1'), 'warn'];
    if (d.F2.tripped) return [T('F2 ตัด', 'F2 tripped'), T('คลิก F2 เพื่อรีเซ็ต', 'click F2 to reset'), 'bad'];
    if (km && n === 3) return this.swap ? [T('หมุนกลับทาง', 'turns backwards'), T('ลำดับเฟสสลับ: ปั๊มหรือสายพานอาจเสียหาย', 'phase sequence reversed: a pump or conveyor may be damaged'), 'bad'] : [T('มอเตอร์หมุน', 'motor running'), T('ไฟครบสามเฟส ลำดับเฟสถูก', 'all three phases, right sequence'), 'good'];
    if (km && n === 2) return this.spd > 0.5 ? [T('เดินสองเฟส', 'single-phasing'), T(`ยังหมุนต่อด้วยสองเฟส กระแสราว 1.7 เท่า F2 คลาส 10 จะตัดในราว ${C4.fmtT(C4.tripTime('10', 1.73))}`, `keeps turning on two phases at about 1.7 × the current; an F2 of class 10 trips in about ${C4.fmtT(C4.tripTime('10', 1.73))}`), 'warn'] :
      [T('ไม่ออกตัว', 'does not start'), T(`สองเฟสเริ่มเดินมอเตอร์ 3 เฟสไม่ได้ ได้แต่ครางและกินกระแสสูง F2 คลาส 10 ตัดในราว ${C4.fmtT(C4.tripTime('10', 5.6))}`, `two phases cannot start a three-phase motor: it hums and draws a high current; an F2 of class 10 trips in about ${C4.fmtT(C4.tripTime('10', 5.6))}`), 'bad'];
    if (!d.F3.on) return [T('F3 เปิด', 'F3 open'), this.swap && n === 3 ? T('ลำดับเฟสผิด F3 ไม่ยอมให้เริ่มเดิน', 'wrong phase sequence: F3 does not allow a start') : T('เฟสผิดปกติ F3 เปิด 11–14 KM1 จึงหลุดและเริ่มไม่ได้', 'phase failure: F3 opens 11–14, so KM1 drops out and cannot start'), 'bad'];
    if (this.cnt > 0 && this.healthy()) return [T('F3 รอคืนสภาพ', 'F3 resetting'), T('ไฟกลับมาครบแล้ว F3 จะต่อ 11–14 เอง แต่มอเตอร์ไม่เริ่มเองเพราะหน้าสัมผัสค้างเปิดอยู่', 'the supply is healthy again; F3 recloses 11–14 by itself, but the motor does not restart because the holding contact is open'), 'warn'];
    return [T('มอเตอร์หยุด', 'motor stopped'), this.healthy() ? T('ไฟปกติ: กด S2 เพื่อเริ่ม', 'supply healthy: press S2 to start') : '', 'wait']; }
  draw() { const V = this.volts(), q = this.sim.dev.Q1.on, km = this.kmClosed(), f2 = this.sim.dev.F2.tripped, LX = { L1: 40, L2: 70, L3: 100 }, K = ['L1', 'L2', 'L3'], NX = 130, PX = 150, pr = !!this.o.print;
    const col = k => (pr ? null : V[k] >= 0.85 ? HOT : V[k] > 0 ? '#ff9e9e' : null), up = k => (pr ? null : !this.lost[k] ? HOT : V[k] > 0 ? '#ff9e9e' : null);   // after Q1 / between the supply and Q1
    const g = (c, b, d) => `<g${c ? ` stroke="${c}"` : ''}${d ? ` stroke-dasharray="${d}"` : ''}>${b}</g>`, dot = (x, y) => `<circle cx="${x}" cy="${y}" r="2.4" fill="currentColor" stroke="none"/>`;
    let s = '';
    K.forEach(k => { s += IE.T(k, LX[k], 12, { size: 10, anchor: 'middle', weight: 700 }); }); s += IE.T('N', NX, 12, { size: 10, anchor: 'middle', weight: 700 }) + IE.T('PE', PX, 12, { size: 10, anchor: 'middle', weight: 700 });
    // incoming cable (the L1/L3 crossing of a swapped sequence), then the break of a lost phase
    const hot = pr ? null : HOT;
    if (this.swap) s += g(hot, IE.L(40, 18, 40, 22) + IE.L(100, 18, 100, 22) + IE.L(40, 22, 100, 36) + IE.L(100, 22, 40, 36) + IE.L(70, 18, 70, 36)) + IE.T('L1 ↔ L3', 108, 33, { size: 9, weight: 700, col: 'var(--bad)' });
    else s += g(hot, K.map(k => IE.L(LX[k], 18, LX[k], 36)).join(''));
    K.forEach(k => { const x = LX[k];
      if (this.lost[k]) s += g(hot, IE.L(x, 36, x, 40)) + `<path d="M ${x - 5} 41 L ${x + 5} 49 M ${x + 5} 41 L ${x - 5} 49" stroke="${HOT}" stroke-width="2" fill="none"/>` + g(up(k), IE.L(x, 50, x, 58), '3 3');
      else s += g(up(k), IE.L(x, 36, x, 58)); });
    // Q1, the conductors after it, N and PE
    K.forEach(k => { s += g(up(k), IE.cb(LX[k], 58, 104, { act: q })) + g(col(k), IE.L(LX[k], 104, LX[k], 330)); });
    s += IE.L(32, 81, 92, 81, { dash: '3 2' }) + IE.T('Q1', 28, 85, { anchor: 'end', size: 11, weight: 700 }) + IE.L(NX, 18, NX, 306) + IE.L(PX, 18, PX, 452);
    // P1 across L1–L2
    const vl = Math.round(400 / Math.sqrt(3) * Math.hypot(V.L1 * Math.cos(this.ang('L1')) - V.L2 * Math.cos(this.ang('L2')), V.L1 * Math.sin(this.ang('L1')) - V.L2 * Math.sin(this.ang('L2'))));
    s += dot(40, 118) + dot(70, 118) + IE.L(40, 118, 46, 118) + IE.L(64, 118, 70, 118) + IE.meter(55, 118, 9, 'V') + IE.T('P1', 55, 138, { size: 9, anchor: 'middle', weight: 700 }) + (this.o.readings === false ? '' : IE.T(`${vl} V`, 26, 122, { size: 9, anchor: 'end', weight: 700, col: 'var(--accent)' }));
    // F3 measuring L1 L2 L3 and N
    const fx = 190, fy = 148, ok3 = this.healthy(), out = this.sim.dev.F3.on;
    [['L1', 156], ['L2', 166], ['L3', 176]].forEach(([k, y]) => { s += g(col(k), IE.L(LX[k], y, fx, y)) + dot(LX[k], y); });
    s += IE.L(NX, 186, fx, 186) + dot(NX, 186);
    s += `<rect x="${fx}" y="${fy}" width="140" height="46" rx="5" fill="var(--panel2)" stroke="currentColor"/>` + IE.T('F3', fx, fy - 6, { size: 11, weight: 700 }) + IE.T(T('รีเลย์ป้องกันเฟส', 'phase-failure relay'), fx + 22, fy - 6, { size: 9, col: 'var(--muted)' });
    s += `<circle cx="${fx + 14}" cy="${fy + 15}" r="6" fill="${this.bypass ? OFF : ok3 && out ? '#2fbf5b' : this.cnt > 0 ? '#ffb020' : '#e5483f'}" stroke="none"/>` +
      IE.T(this.bypass ? T('ต่อข้าม F3', 'F3 bypassed') : ok3 ? (out ? T('ปกติ', 'healthy') : T('รอคืนสภาพ…', 'resetting…')) : (this.swap && this.present() === 3 ? T('ลำดับเฟสผิด', 'wrong sequence') : T('เฟสผิดปกติ', 'phase failure')), fx + 26, fy + 19, { size: 10, weight: 700 }) +
      IE.T(`11–14 ${out ? T('ต่อ', 'closed') : T('เปิด', 'open')}${this.cnt > 0 ? ` · ${ED.fd(Math.max(0, C5.PHASE_T - this.cnt), 1)} s` : ''}`, fx + 8, fy + 37, { size: 10, weight: 700, col: out ? GOOD : 'var(--bad)' });
    s += IE.T(T('→ วงจรควบคุม (L1, N หลัง Q1)', '→ control circuit (L1, N)'), 176, 126, { size: 9, col: 'var(--muted)' });
    // phase lamps H4–H6 through Q2, each phase to N
    const lx = [204, 240, 276];
    K.forEach((k, i) => { const y = 212 + 8 * i, m = V[k]; s += g(col(k), IE.L(LX[k], y, lx[i], y) + IE.L(lx[i], y, lx[i], 234) + IE.cb(lx[i], 234, 262, { act: true })) + dot(LX[k], y);
      s += `<g${col(k) ? ` stroke="${col(k)}"` : ''}>${IE.lamp(lx[i], 262, 298, { live: m > 0, lamp: m >= 0.85 ? C5.COL.run : '#cfe9d1' })}</g>` + IE.T(`H${4 + i}`, lx[i] + 12, 286, { size: 9, weight: 700 }) + (m > 0 && m < 0.85 ? IE.T(T('หรี่', 'dim'), lx[i] + 12, 276, { size: 8, col: 'var(--muted)' }) : ''); });
    s += IE.L(196, 248, 268, 248, { dash: '3 2' }) + IE.T('Q2', 194, 252, { anchor: 'end', size: 10, weight: 700 }) + IE.L(NX, 306, 276, 306) + lx.map(x => IE.L(x, 298, x, 306)).join('') + dot(204, 306) + dot(240, 306) + dot(NX, 306);
    // KM1, F2, current transformer T1 with ammeter P2, motor
    K.forEach(k => { const x = LX[k], c2 = km ? col(k) : null; s += g(col(k), IE.mainNO(x, 330, 374, { act: km })) + g(c2, IE.therm(x, 374, 414, { trip: f2 }) + IE.L(x, 414, x, 436)); });
    s += IE.L(32, 352, 92, 352, { dash: '3 2' }) + IE.T('KM1', 28, 356, { anchor: 'end', size: 11, weight: 700 }) + IE.T('F2', 28, 398, { anchor: 'end', size: 11, weight: 700 });
    const A = this.amps(); s += IE.ct(100, 424) + IE.L(116, 424, 170, 424) + IE.meter(182, 424, 11, 'A') + IE.T('T1', 108, 416, { size: 9, weight: 700 }) + IE.T('P2', 182, 448, { size: 9, anchor: 'middle', weight: 700 }) + (this.o.readings === false ? '' : IE.T(`${ED.fd(A, 1)} A`, 198, 428, { size: 9, weight: 700, col: 'var(--accent)' }));
    const cx = 70, cy = 458, cm = km ? col('L2') : null;
    s += g(km ? col('L1') : null, IE.L(40, 436, cx - 13, cy - 17.5)) + g(cm, IE.L(70, 436, 70, cy - 22)) + g(km ? col('L3') : null, IE.L(100, 436, cx + 13, cy - 17.5)) + IE.motor(cx, cy, 22) + IE.T('M1', 28, cy + 4, { anchor: 'end', size: 11, weight: 700 }) + IE.L(PX, 452, PX, cy) + IE.L(PX, cy, cx + 22, cy);
    if (this.spd > 0.02) { const a = this.rot; s += `<line x1="${cx}" y1="${cy}" x2="${f1(cx + 16 * Math.cos(a))}" y2="${f1(cy + 16 * Math.sin(a))}" stroke="#ff7a1a" stroke-width="3" stroke-linecap="round"/>` +
      IE.T(this.dir > 0 ? T('↻ ทิศถูก', '↻ right way') : T('↺ หมุนกลับทาง', '↺ backwards'), cx + 28, cy + 26, { size: 10, weight: 700, col: this.dir > 0 ? GOOD : 'var(--bad)' }); }
    this.psEl.innerHTML = IE.svg(340, 492, s, { max: 380, label: 'three-phase supply with phase-failure relay' });
    if (this.pan) this.pan.refresh(); }
};

global.C5 = C5;
})(window);
