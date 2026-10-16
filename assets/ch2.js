/* ch2.js — chapter 2 data and widgets: symbol gallery (IEC 60617) with the letter codes of every system, device terminal labels
   (IEC 60947 numbering), the DOL circuit used across the chapter, and the two-wire / three-wire / automatic control circuits.
   Course letter codes (decided Oct 2026): Q breaker, F fuse and overload, KM contactor, KA auxiliary relay, KT timer, S switches and
   push buttons, H lamps, M motor, X terminals. */
(function (global) {
'use strict';
const C2 = {}, IE = global.IEC, T = (th, en) => MC.t(th, en), tt = p => ED.tt(p);

/* ---------------- symbol gallery ----------------
   k/op/td: how to draw it; name; course: course letter; din: Thai textbook (old DIN 40719); iec: IEC 81346-2 (2009 table); nema: US books;
   term: terminal numbers; note */
C2.SYMS = [
  { id: 'no', k: 'NO', name: ['หน้าสัมผัสปกติเปิด (NO)', 'normally open contact (NO)'], course: 'KM1, KA1', din: 'K1', iec: 'QA, KF', nema: 'M, CR', term: '13–14, 23–24 (x3–x4)',
    note: ['หน้าสัมผัสช่วยของคอนแทกเตอร์หรือรีเลย์ ต่อเมื่อคอยล์มีไฟ (วาดในสภาวะคอยล์ไม่มีไฟเสมอ)', 'an auxiliary contact of a contactor or relay; it closes when the coil is energised (always drawn with the coil de-energised)'] },
  { id: 'nc', k: 'NC', name: ['หน้าสัมผัสปกติปิด (NC)', 'normally closed contact (NC)'], course: 'KM1, KA1', din: 'K1', iec: 'QA, KF', nema: 'M, CR', term: '11–12, 21–22 (x1–x2)',
    note: ['ตัดเมื่อคอยล์มีไฟ ใช้ทำอินเตอร์ล็อก (บทที่ 7)', 'opens when the coil is energised; used for interlocks (chapter 7)'] },
  { id: 'pbno', k: 'NO', op: 'pb', name: ['ปุ่มกดปกติเปิด (ปุ่มเริ่ม)', 'push button, normally open (start)'], course: 'S2', din: 'S2', iec: 'SF', nema: 'PB (START)', term: '13–14',
    note: ['ต่อเฉพาะขณะกด ปล่อยแล้วสปริงดันกลับ', 'closed only while pressed; a spring returns it'] },
  { id: 'pbnc', k: 'NC', op: 'pb', name: ['ปุ่มกดปกติปิด (ปุ่มหยุด)', 'push button, normally closed (stop)'], course: 'S1', din: 'S1', iec: 'SF', nema: 'PB (STOP)', term: '11–12',
    note: ['ปุ่มหยุดต้องเป็นหน้าสัมผัสปกติปิดเสมอ ถ้าสายขาด วงจรจะหยุดเอง (หลักความปลอดภัย IEC 60204-1)', 'a stop button is always normally closed, so a broken wire stops the machine (IEC 60204-1 safety rule)'] },
  { id: 'estop', k: 'NC', op: 'mush', name: ['ปุ่มหยุดฉุกเฉิน (หัวเห็ด)', 'emergency stop (mushroom head)'], course: 'S0', din: 'S0', iec: 'SF', nema: 'E-STOP', term: '11–12',
    note: ['ปุ่มหัวเห็ดสีแดงบนพื้นเหลือง กดแล้วค้าง ต้องหมุนหรือดึงเพื่อปลด', 'a red mushroom head on a yellow background; it latches when pressed and is released by turning or pulling'] },
  { id: 'sel', k: 'NO', op: 'sel', name: ['สวิตช์เลือกตำแหน่ง (ค้างตำแหน่ง)', 'selector switch (maintained)'], course: 'S3', din: 'S3', iec: 'SF', nema: 'SS', term: '13–14',
    note: ['หมุนแล้วค้างอยู่ตำแหน่งนั้น ใช้ในวงจรควบคุม 2 สาย และสวิตช์มือ–อัตโนมัติ', 'stays where it is turned; used in two-wire control and hand–auto switches'] },
  { id: 'lim', k: 'NO', op: 'lim', name: ['ลิมิตสวิตช์ (สวิตช์ตำแหน่ง)', 'limit (position) switch'], course: 'S4', din: 'S4', iec: 'BG', nema: 'LS', term: '13–14 / 11–12',
    note: ['ถูกชิ้นงานหรือลูกเบี้ยวกดเมื่อเคลื่อนถึงตำแหน่ง (บทที่ 7 และ 12)', 'pressed by the machine or a cam when it reaches a position (chapters 7 and 12)'] },
  { id: 'flt', k: 'NO', op: 'flt', name: ['สวิตช์ลูกลอย (สวิตช์ระดับ)', 'float (level) switch'], course: 'S5', din: 'S5', iec: 'BL', nema: 'FS', term: '13–14',
    note: ['ทำงานตามระดับของเหลว (บทที่ 12)', 'operated by the liquid level (chapter 12)'] },
  { id: 'prs', k: 'NC', op: 'prs', name: ['สวิตช์ความดัน', 'pressure switch'], course: 'S6', din: 'S6', iec: 'BP', nema: 'PS', term: '11–12',
    note: ['ตัดเมื่อความดันถึงค่าที่ตั้ง เช่น ปั๊มลม (บทที่ 12)', 'opens at the set pressure, e.g. an air compressor (chapter 12)'] },
  { id: 'tmp', k: 'NC', op: 'tmp', name: ['สวิตช์อุณหภูมิ (เทอร์โมสตัท)', 'temperature switch (thermostat)'], course: 'S7', din: 'S7', iec: 'BT', nema: 'TS', term: '11–12',
    note: ['ทำงานตามอุณหภูมิ (บทที่ 12)', 'operated by temperature (chapter 12)'] },
  { id: 'coil', k: 'coil', name: ['คอยล์คอนแทกเตอร์หรือรีเลย์', 'contactor or relay coil'], course: 'KM1 / KA1', din: 'K1 / K1A', iec: 'QA / KF', nema: 'M / CR', term: 'A1–A2',
    note: ['รหัสเดียวกับหน้าสัมผัสทุกตัวของอุปกรณ์นั้น ใน CADe SIMU คอยล์กับหน้าสัมผัสผูกกันด้วยชื่อนี้', 'it shares its code with every contact of the device; CADe SIMU links coil and contacts by this name'] },
  { id: 'kton', k: 'coil', td: 'on', name: ['คอยล์ตัวตั้งเวลาหน่วงเมื่อป้อนไฟ', 'on-delay timer coil'], course: 'KT1', din: 'K1T', iec: 'KF', nema: 'TR (TD)', term: 'A1–A2',
    note: ['กล่องที่มีกากบาทข้างคอยล์ หมายถึงหน่วงเวลาตอนป้อนไฟ (บทที่ 4)', 'the box with a cross beside the coil means "delayed when energised" (chapter 4)'] },
  { id: 'tdno', k: 'NO', td: 'on', name: ['หน้าสัมผัสหน่วงเวลา (ปกติเปิด หน่วงตอนต่อ)', 'on-delay contact (normally open)'], course: 'KT1', din: 'K1T', iec: 'KF', nema: 'TR (NOTC)', term: '67–68 (55–56 NC)',
    note: ['รูปร่มบนใบหน้าสัมผัสบอกทิศที่ถูกหน่วง', 'the "parachute" on the blade shows which movement is delayed'] },
  { id: 'ol', k: 'NC', op: 'thr', name: ['หน้าสัมผัสโอเวอร์โหลดรีเลย์', 'overload relay contact'], course: 'F2', din: 'F3', iec: 'FC (BC)', nema: 'OL', term: '95–96 (97–98 NO)',
    note: ['เลข 9 ตัวแรกสงวนไว้ให้หน้าสัมผัสของอุปกรณ์ป้องกัน', 'a first digit 9 is reserved for the contacts of protective devices'] },
  { id: 'lamp', k: 'lamp', name: ['หลอดสัญญาณ', 'signal lamp'], course: 'H1', din: 'H1', iec: 'PF', nema: 'PL (R, G)', term: 'X1–X2',
    note: ['สีตาม IEC 60204-1: เขียว = ปกติ/เดิน, แดง = อันตราย/ฉุกเฉิน, เหลือง = ผิดปกติ (เช่น โอเวอร์โหลด)', 'colours after IEC 60204-1: green = normal/running, red = danger/emergency, yellow = abnormal (e.g. overload)'] },
  { id: 'fuse', k: 'fuse', name: ['ฟิวส์', 'fuse'], course: 'F1', din: 'F1, F2', iec: 'FC', nema: 'FU', term: '1–2',
    note: ['ป้องกันการลัดวงจร', 'protects against short circuits'] },
  { id: 'cb', k: 'cb', name: ['เบรกเกอร์ (หนึ่งขั้ว)', 'circuit breaker (one pole)'], course: 'Q1', din: 'Q1', iec: 'QA', nema: 'CB', term: '1–2, 3–4, 5–6',
    note: ['กากบาทที่หน้าสัมผัสคงที่หมายถึงตัดวงจรเองได้เมื่อกระแสเกิน', 'the cross at the fixed contact means it trips by itself on overcurrent'] },
  { id: 'main', k: 'mainNO', name: ['หน้าสัมผัสหลักของคอนแทกเตอร์', 'contactor main contact'], course: 'KM1', din: 'K1', iec: 'QA', nema: 'M', term: '1–2, 3–4, 5–6',
    note: ['ครึ่งวงกลมที่หน้าสัมผัสคงที่หมายถึงหน้าสัมผัสของคอนแทกเตอร์ ใช้ในวงจรกำลัง', 'the half-circle at the fixed contact marks a contactor contact, used in the power circuit'] },
  { id: 'therm', k: 'therm', name: ['ตัวตรวจจับความร้อนของโอเวอร์โหลด', 'thermal element of an overload relay'], course: 'F2', din: 'F3', iec: 'FC', nema: 'OL (heater)', term: '1–2, 3–4, 5–6',
    note: ['อยู่ในวงจรกำลัง ร้อนตามกระแสมอเตอร์ แล้วไปเปิดหน้าสัมผัส 95–96 ในวงจรควบคุม', 'sits in the power circuit, heats with the motor current and opens contact 95–96 in the control circuit'] },
  { id: 'motor', k: 'motor', name: ['มอเตอร์ 3 เฟส', 'three-phase motor'], course: 'M1', din: 'M1', iec: 'MA', nema: 'MTR', term: 'U1 V1 W1', note: ['หน้า 1.1', 'page 1.1'] }
];
C2.symSVG = (sy, size = 1) => { const w = 92, h = 92;
  const body = sy.k === 'motor' ? IE.motor(w / 2, h / 2, 22) : IE.draw(sy.k, w / 2 + (sy.op ? 10 : 0), 10, h - 10, { op: sy.op, td: sy.td });
  return IE.svg(w, h, body, { max: 92 * size, label: tt(sy.name) }); };
/* symbol id → real-device card id (dev.js) */
C2.DEVOF = { no: 'km', nc: 'km', coil: 'km', main: 'km', pbno: 'pb', pbnc: 'pb', estop: 'pb', sel: 'sel', kton: 'kt', tdno: 'kt', ol: 'ol', therm: 'ol', lamp: 'lamp', fuse: 'fuse', cb: 'mcb', motor: 'motor' };
/* gallery: el gets cards; help gets the details of the chosen symbol */
C2.gallery = (el, help) => {
  el.innerHTML = '<div class="symgrid">' + C2.SYMS.map(sy => `<button type="button" class="symcard" data-id="${sy.id}">${C2.symSVG(sy)}<span>${tt(sy.name)}</span></button>`).join('') + '</div>';
  const show = id => { const sy = C2.SYMS.find(x => x.id === id); el.querySelectorAll('.symcard').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    help.innerHTML = `<div class="symhelp"><div class="symbig">${C2.symSVG(sy, 1.6)}</div><h3>${tt(sy.name)}</h3>` +
      `<table class="tbl"><tr><th>${T('รหัสในวิชานี้', 'course code')}</th><td><b>${sy.course}</b></td></tr><tr><th>${T('มาตรฐานใหม่ IEC 81346-2', 'new standard IEC 81346-2')}</th><td>${sy.iec}</td></tr>` +
      `<tr><th>${T('ตำราไทย (DIN เก่า)', 'Thai textbook (old DIN)')}</th><td>${sy.din}</td></tr><tr><th>${T('ตำราอเมริกัน (NEMA)', 'US books (NEMA)')}</th><td>${sy.nema}</td></tr>` +
      `<tr><th>${T('เลขขั้ว', 'terminal numbers')}</th><td>${sy.term}</td></tr></table><p>${tt(sy.note)}</p>` +
      (C2.DEVOF[id] && document.getElementById('dev-' + C2.DEVOF[id]) ? `<p><a href="#dev-${C2.DEVOF[id]}">${T('ดูรูปอุปกรณ์จริง ↑', 'see the real device ↑')}</a></p>` : '') + '</div>'; };
  el.querySelectorAll('.symcard').forEach(b => b.addEventListener('click', () => show(b.dataset.id)));
  show('pbnc');
};

/* ---------------- device side labels (terminal numbering) ----------------
   each device: columns of [kind, top terminal, bottom terminal, caption]; drawn as on the label printed on the real device */
C2.DEVICES = {
  km: { name: ['คอนแทกเตอร์ KM1 + ชุดหน้าสัมผัสช่วยด้านหน้า', 'contactor KM1 + front auxiliary block'], cols: [['mainNO', '1/L1', '2/T1'], ['mainNO', '3/L2', '4/T2'], ['mainNO', '5/L3', '6/T3'], ['NO', '13', '14'], ['coil', 'A1', 'A2'], ['sep'], ['NO', '53', '54'], ['NC', '61', '62'], ['NC', '71', '72'], ['NO', '83', '84']] },
  ol: { name: ['โอเวอร์โหลดรีเลย์ F2', 'overload relay F2'], cols: [['therm', '1/L1', '2/T1'], ['therm', '3/L2', '4/T2'], ['therm', '5/L3', '6/T3'], ['sep'], ['NC', '95', '96', 'thr'], ['NO', '97', '98', 'thr']] },
  pb: { name: ['ปุ่มกดที่มีหน้าสัมผัส 2 ชุด S1', 'push button with two contact elements S1'], cols: [['NC', '11', '12', 'pb'], ['NO', '23', '24', 'pb']] },
  kt: { name: ['ชุดตัวตั้งเวลาหน่วงเมื่อป้อนไฟ KT1', 'on-delay timer block KT1'], cols: [['NC', '55', '56', 'td'], ['NO', '67', '68', 'td'], ['sep'], ['coil', 'A1', 'A2', 'tdc']] }
};
C2.deviceSVG = (key, pick) => { const D = C2.DEVICES[key], dx = 46; let x = 30, s = ''; const xs = [];
  D.cols.forEach((c, i) => { if (c[0] === 'sep') { x += 18; return; } xs.push([i, x]);
    const o = { op: c[3] === 'thr' || c[3] === 'pb' ? c[3] : undefined, td: c[3] === 'td' || c[3] === 'tdc' ? 'on' : undefined }, hi = pick === i;
    s += `<g data-col="${i}" style="cursor:pointer"${hi ? ' stroke="#ff7eb6"' : ''}><rect x="${x - 22}" y="6" width="44" height="118" fill="${hi ? 'rgba(255,126,182,.12)' : 'transparent'}" stroke="none"/>` +
      IE.draw(c[0], x + (o.op ? 8 : 0), 26, 104, o) + '</g>' +
      IE.T(c[1], x + (o.op ? 8 : 0), 18, { size: 11, anchor: 'middle', weight: 700, col: hi ? '#ff7eb6' : undefined }) + IE.T(c[2], x + (o.op ? 8 : 0), 120, { size: 11, anchor: 'middle', weight: 700, col: hi ? '#ff7eb6' : undefined });
    x += dx; });
  return IE.svg(x, 130, `<rect x="4" y="2" width="${x - 12}" height="126" rx="8" fill="none" stroke="var(--line)"/>` + s, { max: x * 1.5, label: tt(D.name) }); };
C2.explain = (key, i) => { const c = C2.DEVICES[key].cols[i], [k, a, b] = c;
  if (k === 'mainNO' || k === 'therm') return T(`หน้าสัมผัสหลัก (วงจรกำลัง) ใช้เลขหลักเดียว ${a} เข้า ${b} ออก: เลขคี่ด้านแหล่งจ่าย (L) เลขคู่ด้านมอเตอร์ (T) และ L1–T1, L2–T2, L3–T3 บอกเฟส`, `main (power) contact, one-digit numbers: ${a} in, ${b} out. Odd numbers on the supply side (L), even on the motor side (T); L1–T1, L2–T2, L3–T3 name the phase.`);
  if (k === 'coil') return T(`คอยล์ใช้ ${a}–${b} เสมอ (ตัวอักษร A = ขั้วของคอยล์)`, `a coil is always ${a}–${b} (A = coil terminal).`);
  const seq = a.length === 2 ? a[0] : '', fun = a.length === 2 ? `${a[1]}–${b[1]}` : '';
  const what = { '1–2': T('ปกติปิด (NC)', 'normally closed (NC)'), '3–4': T('ปกติเปิด (NO)', 'normally open (NO)'), '5–6': T('ปกติปิดแบบพิเศษ เช่น หน่วงเวลา', 'normally closed, special function such as timing'), '7–8': T('ปกติเปิดแบบพิเศษ เช่น หน่วงเวลา', 'normally open, special function such as timing') }[fun];
  if (seq === '9') return T(`${a}–${b}: เลขหลักแรก 9 สงวนไว้ให้หน้าสัมผัสของอุปกรณ์ป้องกัน (โอเวอร์โหลด) เลขหลักหลัง ${a[1]}–${b[1]} บอกว่าเป็น${a[1] === '5' ? 'ปกติปิด (ตัดเมื่อโอเวอร์โหลดทำงาน)' : 'ปกติเปิด (ต่อเมื่อโอเวอร์โหลดทำงาน ใช้ต่อหลอดเตือน)'}`,
    `${a}–${b}: a first digit 9 is reserved for protective-device contacts (overload). The second digits ${a[1]}–${b[1]} make it ${a[1] === '5' ? 'normally closed (opens when the overload trips)' : 'normally open (closes when the overload trips; used for a warning lamp)'}.`);
  return T(`${a}–${b}: เลขหลักแรก ${seq} คือลำดับของหน้าสัมผัสบนอุปกรณ์ (ชุดที่ ${seq}) เลขหลักหลัง ${fun} บอกหน้าที่: ${what}`, `${a}–${b}: the first digit ${seq} is the position of the contact on the device (element ${seq}); the second digits ${fun} give its function: ${what}.`); };
C2.deviceWidget = (el, help) => { let key = 'km', pick = null;
  const draw = () => { el.querySelector('.devsvg').innerHTML = C2.deviceSVG(key, pick); el.querySelectorAll('[data-col]').forEach(g => g.addEventListener('click', () => { pick = +g.dataset.col; draw(); help.innerHTML = `<div class="answer">${C2.explain(key, pick)}</div>`; })); };
  el.innerHTML = `<div class="toggles devsel">${Object.entries(C2.DEVICES).map(([k, d]) => `<button type="button" class="btn${k === key ? ' on' : ''}" data-k="${k}">${tt(d.name)}</button>`).join('')}</div><div class="devsvg"></div>`;
  el.querySelectorAll('.devsel button').forEach(b => b.addEventListener('click', () => { key = b.dataset.k; pick = null; el.querySelectorAll('.devsel button').forEach(x => x.classList.toggle('on', x === b)); draw();
    help.innerHTML = `<p class="simnote">${T('แตะหน้าสัมผัสหรือคอยล์เพื่ออ่านความหมายของเลขขั้ว', 'Tap a contact or coil to read what its terminal numbers mean')}</p>`; }));
  draw(); help.innerHTML = `<p class="simnote">${T('แตะหน้าสัมผัสหรือคอยล์เพื่ออ่านความหมายของเลขขั้ว', 'Tap a contact or coil to read what its terminal numbers mean')}</p>`; };

/* ---------------- circuits ---------------- */
const DOLDEV = () => ({ Q1: { type: 'cb', on: true }, F1: { type: 'fuse' }, F2: { type: 'ol' }, S1: { type: 'pb' }, S2: { type: 'pb' }, KM1: { type: 'coil' }, H1: { type: 'lamp', color: '#7ee787' }, H2: { type: 'lamp', color: '#ffb020' } });
const POWER = { stages: [{ k: 'cb', d: 'Q1' }, { k: 'mainNO', d: 'KM1' }, { k: 'therm', d: 'F2' }], motor: 'M1' };
/* direct-on-line, three-wire control with run and overload lamps (the circuit of Thai textbook Fig. 1.2, redrawn to IEC) */
C2.DOL = () => ({ supply: 'Q1', rows: 6, devices: DOLDEV(), power: POWER,
  els: [ { k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }, { k: 'NC', d: 'F2', x: 0, y: 1, t: ['95', '96'], op: 'thr' }, { k: 'NC', d: 'S1', x: 0, y: 2, t: ['11', '12'], op: 'pb' },
    { k: 'NO', d: 'S2', x: 0, y: 3, t: ['13', '14'], op: 'pb' }, { k: 'w', x: 0, y: 4 }, { k: 'coil', d: 'KM1', x: 0, y: 5, t: ['A1', 'A2'] },
    { k: 'NO', d: 'KM1', x: 1, y: 3, t: ['13', '14'] }, { k: 'w', pts: [[0, 3], [1, 3]], dots: [0] }, { k: 'w', pts: [[0, 4], [1, 4]], dots: [0] },
    { k: 'w', pts: [[0, 1], [2, 1], [3, 1]], dots: [0, 1] }, { k: 'w', pts: [[2, 1], [2, 4]] }, { k: 'NO', d: 'KM1', x: 2, y: 4, t: ['23', '24'] }, { k: 'lamp', d: 'H1', x: 2, y: 5, t: ['X1', 'X2'] },
    { k: 'w', pts: [[3, 1], [3, 4]] }, { k: 'NO', d: 'F2', x: 3, y: 4, t: ['97', '98'], op: 'thr' }, { k: 'lamp', d: 'H2', x: 3, y: 5, t: ['X1', 'X2'] } ] });
/* two-wire control: a maintained switch S1 (or a float switch S5 for automatic control) */
C2.TWO = (sensor) => ({ supply: 'Q1', rows: 5, power: POWER,
  devices: { Q1: { type: 'cb', on: true }, F1: { type: 'fuse' }, F2: { type: 'ol' }, [sensor ? 'S5' : 'S3']: sensor ? { type: 'sen' } : { type: 'sel' }, KM1: { type: 'coil' }, H1: { type: 'lamp', color: '#7ee787' } },
  els: [ { k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }, { k: 'NC', d: 'F2', x: 0, y: 1, t: ['95', '96'], op: 'thr' }, { k: 'NO', d: sensor ? 'S5' : 'S3', x: 0, y: 2, t: ['13', '14'], op: sensor ? 'flt' : 'sel' },
    { k: 'w', x: 0, y: 3 }, { k: 'coil', d: 'KM1', x: 0, y: 4, t: ['A1', 'A2'] }, { k: 'w', pts: [[0, 2], [1, 2]], dots: [0] }, { k: 'w', x: 1, y: 2 }, { k: 'NO', d: 'KM1', x: 1, y: 3, t: ['13', '14'] }, { k: 'lamp', d: 'H1', x: 1, y: 4, t: ['X1', 'X2'] } ] });
/* three-wire control: stop and start push buttons with a holding contact, run lamp */
C2.THREE = () => ({ supply: 'Q1', rows: 5, power: POWER,
  devices: { Q1: { type: 'cb', on: true }, F1: { type: 'fuse' }, F2: { type: 'ol' }, S1: { type: 'pb' }, S2: { type: 'pb' }, KM1: { type: 'coil' }, H1: { type: 'lamp', color: '#7ee787' } },
  els: [ { k: 'fuse', d: 'F1', x: 0, y: 0, t: ['1', '2'] }, { k: 'NC', d: 'F2', x: 0, y: 1, t: ['95', '96'], op: 'thr' }, { k: 'NC', d: 'S1', x: 0, y: 2, t: ['11', '12'], op: 'pb' },
    { k: 'NO', d: 'S2', x: 0, y: 3, t: ['13', '14'], op: 'pb' }, { k: 'coil', d: 'KM1', x: 0, y: 4, t: ['A1', 'A2'] }, { k: 'NO', d: 'KM1', x: 1, y: 3, t: ['13', '14'] },
    { k: 'w', pts: [[0, 3], [1, 3]], dots: [0] }, { k: 'w', pts: [[0, 4], [1, 4]], dots: [0] },
    { k: 'w', pts: [[0, 2], [2, 2]], dots: [0] }, { k: 'w', x: 2, y: 2 }, { k: 'NO', d: 'KM1', x: 2, y: 3, t: ['23', '24'] }, { k: 'lamp', d: 'H1', x: 2, y: 4, t: ['X1', 'X2'] } ] });
global.C2 = C2;
})(window);
