/* ed.js — shared helpers of the Electrical Drawing II site (course 031021322): numbers, canvas fitting, the dark canvas
   palette, a numeric quiz and a per-unit induction-motor model. Loaded after shell.js, lesson.js and draw.js. */
(function (global) {
'use strict';
const ED = {};

/* ---------------- numbers ---------------- */
const NUM = global.NUM || {};
NUM.fmt = (x, d = 3) => { if (x === null || x === undefined || Number.isNaN(x)) return '—'; if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
  const s = Math.abs(x) < 1e-12 ? (0).toFixed(d) : x.toFixed(d); return s.replace('-', '−'); };
NUM.clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
global.NUM = NUM;
/* fixed decimals with a real minus sign, "-0" never shown */
ED.fd = (x, d = 2) => { const v = Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x; return v.toFixed(d).replace('-', '−'); };
/* Thai/English pair helper: tt(['ไทย', 'English']) or a plain string */
ED.tt = p => (p ? (Array.isArray(p) ? MC.t(p[0], p[1]) : p) : '');

/* ---------------- canvas ---------------- */
ED.COL = { bg: '#0f1220', panel: '#161a2f', grid: '#262c4a', axis: '#6b7399', ink: '#e8ecf7', muted: '#9aa3c7',
  U: '#ff6b6b', V: '#ffd166', W: '#5ad1ff', PE: '#7ee787', N: '#9fb3c8', accent: '#5ad1ff', pink: '#ff7eb6', good: '#7ee787',
  warn: '#ffd166', bad: '#ff6b6b', purple: '#c792ea', orange: '#ffa552', copper: '#d8925a', brass: '#d8b25a', metal: '#9fb3c8', dim: '#3a4160' };
/* fit a canvas to its card: h(W) gives the height for a width W */
ED.fit = (cv, h, minW = 300) => { const W = Math.max(minW, Math.floor(cv.parentElement.clientWidth - 12)); const H = Math.round(h(W)); return { ctx: DRAW.setup(cv, W, H), W, H }; };
ED.font = (ctx, size, o = {}) => { ctx.font = `${o.weight || ''} ${size}px ${o.th ? DRAW.fontTh : DRAW.font}`.trim(); };
ED.text = (ctx, s, x, y, o = {}) => { ED.font(ctx, o.size || 12, o); ctx.fillStyle = o.color || ED.COL.ink; ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic'; ctx.fillText(s, x, y); };
/* text in the page language: Thai text uses the Thai font */
ED.ttext = (ctx, p, x, y, o = {}) => { const s = ED.tt(p); ED.text(ctx, s, x, y, { ...o, th: /[฀-๿]/.test(s) || o.th }); };
ED.arrow = (ctx, x1, y1, x2, y2, o = {}) => { const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1), h = Math.min(o.head || 9, L * 0.45);
  ctx.save(); ctx.strokeStyle = ctx.fillStyle = o.color || ED.COL.ink; ctx.lineWidth = o.width || 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - h * 0.7 * Math.cos(a), y2 - h * 0.7 * Math.sin(a)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - h * Math.cos(a - 0.42), y2 - h * Math.sin(a - 0.42)); ctx.lineTo(x2 - h * Math.cos(a + 0.42), y2 - h * Math.sin(a + 0.42)); ctx.closePath(); ctx.fill(); ctx.restore(); };
ED.rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };

/* ---------------- numeric quiz (from the IE_Web site) ----------------
   rows: [{ q: html, fields: [{key, lab, ans, unit, tol, alt}], work: html }] */
ED.quiz = (el, rows, o = {}) => {
  el = typeof el === 'string' ? document.getElementById(el) : el; const id0 = o.id || el.id || 'qz', score = {};
  el.innerHTML = `<div class="score" id="${id0}_s"></div><div class="quiz">` + rows.map((r, k) => `<div class="qrow${o.wide ? ' wide' : ''}"><div class="q">${r.q}</div><div class="ins">${r.fields.map(f =>
    `<label>${MC.ui.subs(f.lab)} <input id="${id0}_${k}_${f.key}" inputmode="decimal" autocomplete="off" aria-label="${f.aria || f.key}"></label>${f.unit ? ' ' + f.unit : ''}`).join(' ')}</div>` +
    `<div class="toggles"><button type="button" class="btn on" data-k="${k}">${MC.t('ตรวจ', 'Check')}</button><span class="res" id="${id0}_${k}_res"></span></div>` +
    (r.work ? `<details><summary>${MC.t('ดูวิธีทำ', 'Show working')}</summary>${r.work}</details>` : '') + '</div>').join('') + '</div>';
  const num = id => { const v = document.getElementById(id).value.trim().replace(/−/g, '-').replace(',', '.'); return v === '' ? NaN : Number(v); };
  const near = (x, y, tol) => Math.abs(x - y) <= (tol ?? Math.max(0.011, 0.006 * Math.abs(y)));
  const mark = (id, ok) => { const e = document.getElementById(id); e.classList.remove('ok', 'no'); e.classList.add(ok ? 'ok' : 'no'); };
  const check = k => { const r = rows[k]; let ok = true;
    r.fields.forEach(f => { const id = `${id0}_${k}_${f.key}`, x = num(id); const good = isFinite(x) && (near(x, f.ans, f.tol) || (f.alt !== undefined && near(x, f.alt, f.tol))); mark(id, good); if (!good) ok = false; });
    document.getElementById(`${id0}_${k}_res`).innerHTML = ok ? '<span class="pill good">✓</span>' : `<span class="pill bad">✗</span> ${MC.t('ลองอีกครั้ง', 'try again')}`;
    score[k] = ok; const n = Object.values(score).filter(Boolean).length;
    document.getElementById(id0 + '_s').innerHTML = MC.t(`ถูกแล้ว <b>${n}</b> จาก ${rows.length} ข้อ`, `<b>${n}</b> of ${rows.length} correct`); };
  el.querySelectorAll('button[data-k]').forEach(b => b.addEventListener('click', () => check(+b.dataset.k)));
  el.querySelectorAll('input').forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(+inp.id.slice(id0.length + 1).split('_')[0]); }));
  MC.renderMath(el);
};
/* multiple-choice rows: [{ q: html, options: [html], answer: index, why: html }] */
ED.mcq = (el, rows, o = {}) => {
  el = typeof el === 'string' ? document.getElementById(el) : el; const id0 = o.id || el.id || 'mq', score = {};
  el.innerHTML = `<div class="score" id="${id0}_s"></div><div class="quiz">` + rows.map((r, k) => `<div class="qrow wide"><div class="q">${r.q}</div>` +
    `<div class="toggles" data-k="${k}">${r.options.map((x, i) => `<button type="button" class="btn" data-i="${i}">${'กขคง'[i] && MC.lang === 'th' ? 'กขคง'[i] : 'abcd'[i]}) ${x}</button>`).join('')}</div>` +
    `<div class="res" id="${id0}_${k}_res"></div></div>`).join('') + '</div>';
  el.querySelectorAll('.toggles[data-k]').forEach(g => { const k = +g.dataset.k, r = rows[k];
    g.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.i, ok = i === r.answer;
      g.querySelectorAll('button').forEach(x => x.classList.remove('on', 'danger')); b.classList.add('on'); if (!ok) b.classList.add('danger');
      document.getElementById(`${id0}_${k}_res`).innerHTML = (ok ? '<span class="pill good">✓</span> ' : `<span class="pill bad">✗</span> ${MC.t('ยังไม่ใช่', 'not quite')} · `) + (ok && r.why ? r.why : ok ? '' : MC.t('ลองอีกครั้ง', 'try again'));
      MC.renderMath(document.getElementById(`${id0}_${k}_res`));
      score[k] = ok; const n = Object.values(score).filter(Boolean).length;
      document.getElementById(id0 + '_s').innerHTML = MC.t(`ถูกแล้ว <b>${n}</b> จาก ${rows.length} ข้อ`, `<b>${n}</b> of ${rows.length} correct`); })); });
  MC.renderMath(el);
};

/* ---------------- per-unit induction motor ----------------
   Steady-state equivalent circuit (per phase, per unit on the rated voltage): R1 + jX1, magnetising jXm, rotor jX2 + R2(s)/s with
   R2(s) = R20(1 + k s) for the deep-bar effect. Tuned (Oct 2026) to a typical 4-pole cage motor: rated slip 3.3 %, starting current
   6.5 × rated, starting torque 2.2 × rated, breakdown torque 3.4 × rated. Results are scaled so that rated current and rated torque are 1.
   v: supply voltage in per unit of the winding rating (torque ∝ v², current ∝ v). */
const MP = { R1: 0.02, X1: 0.07, X2: 0.07, Xm: 3.0, R20: 0.033, k: 0.5 };
const raw = s => { const R2 = MP.R20 * (1 + MP.k * s), z2r = R2 / s, z2i = MP.X2;
  // Zp = Z2 · jXm / (Z2 + jXm)
  const nr = -z2i * MP.Xm, ni = z2r * MP.Xm, dr = z2r, di = z2i + MP.Xm, dd = dr * dr + di * di;
  const pr = (nr * dr + ni * di) / dd, pi = (ni * dr - nr * di) / dd;
  const zr = MP.R1 + pr, zi = MP.X1 + pi, zz = zr * zr + zi * zi, i1 = 1 / Math.sqrt(zz);
  const e = i1 * Math.hypot(pr, pi), i2 = e / Math.hypot(z2r, z2i);
  return { i: i1, T: i2 * i2 * R2 / s, pf: zr / Math.sqrt(zz) }; };
const RATED = (() => { let lo = 1e-4, hi = 0.5; for (let n = 0; n < 60; n++) { const m = (lo + hi) / 2; if (raw(m).i < 1) lo = m; else hi = m; } const r = raw(lo); return { s: lo, i: r.i, T: r.T }; })();
ED.motor = (s, v = 1) => { s = Math.max(1e-5, s); const r = raw(s); return { i: v * r.i / RATED.i, T: v * v * r.T / RATED.T, pf: r.pf }; };
ED.motor.sRated = RATED.s;
/* steady slip for a load torque TL (per unit) at voltage v: the stable branch (s below the breakdown slip), or null if it stalls */
ED.motor.slipFor = (TL, v = 1) => { let sk = 0.05, tk = 0; for (let s = 0.005; s < 1; s += 0.0025) { const T = ED.motor(s, v).T; if (T > tk) { tk = T; sk = s; } }
  if (TL > tk) return null; let lo = 1e-6, hi = sk; for (let n = 0; n < 60; n++) { const m = (lo + hi) / 2; if (ED.motor(m, v).T < TL) lo = m; else hi = m; } return lo; };
ED.motor.breakdown = (v = 1) => { let sk = 0.05, tk = 0; for (let s = 0.005; s < 1; s += 0.001) { const T = ED.motor(s, v).T; if (T > tk) { tk = T; sk = s; } } return { s: sk, T: tk }; };

/* ---------------- results of the student's own trials, and the summary of all cases ----------------
   new ED.Log(el, cols, {title}) : a table that grows by itself; add(key, cells, kind) adds or updates the row of one case
   (kind 'ok' | 'warn' | 'bad' colours the last cell). ED.summary(el, {title, head, rows: () => [[...]], points: [html]}) puts a
   "Show the summary" button; the rows are built when it is first opened, from the same model as the simulation. */
ED.Log = class {
  constructor(el, cols, o = {}) { this.el = el; this.cols = cols; this.o = o; this.rows = new Map(); this.render(); }
  add(key, cells, kind) { this.rows.set(key, { cells, kind }); this.render(); }
  clear() { this.rows.clear(); this.render(); }
  render() {
    const T = MC.t, tt = ED.tt, n = this.rows.size;
    let h = `<div class="rlog-h"><b>${tt(this.o.title || ['ผลการทดลองของคุณ (บันทึกอัตโนมัติ)', 'Your results (recorded automatically)'])}</b>` +
      `<span class="rlog-n">${T(`${n} กรณี`, `${n} case${n === 1 ? '' : 's'}`)}</span>${n ? `<button type="button" class="btn rlog-clear">${T('ล้างตาราง', 'Clear')}</button>` : ''}</div>`;
    if (!n) h += `<p class="simnote">${tt(this.o.empty || ['ยังไม่มีผล ลองปรับภาพจำลองด้านบน แล้วผลแต่ละกรณีจะมาเรียงในตารางนี้', 'No results yet: change the simulation above and each case will be listed here'])}</p>`;
    else h += `<div class="rlog-wrap"><table class="tbl rlog-t"><tr>${this.cols.map(c => `<th>${tt(c)}</th>`).join('')}</tr>` +
      [...this.rows.values()].map(r => `<tr>${r.cells.map((c, i) => `<td${i === r.cells.length - 1 && r.kind ? ` class="rk-${r.kind}"` : ''}>${c}</td>`).join('')}</tr>`).join('') + '</table></div>';
    this.el.innerHTML = h; const b = this.el.querySelector('.rlog-clear'); if (b) b.addEventListener('click', () => this.clear()); MC.renderMath(this.el);
  }
};
ED.summary = (el, o) => {
  const T = MC.t, tt = ED.tt;
  el.innerHTML = `<button type="button" class="btn summ-btn">${T('▼ ดูสรุปผลการทดลอง (ลองเองก่อน)', '▼ Show the summary (try it yourself first)')}</button><div class="summ" hidden></div>`;
  const btn = el.querySelector('.summ-btn'), box = el.querySelector('.summ'); let built = false;
  btn.addEventListener('click', () => {
    if (!built) { built = true; const rows = o.rows();
      box.innerHTML = `<h3>${tt(o.title || ['สรุปผลการทดลอง', 'Summary of the trials'])}</h3>` + (o.intro ? `<p>${tt(o.intro)}</p>` : '') +
        `<div class="rlog-wrap"><table class="tbl"><tr>${o.head.map(c => `<th>${tt(c)}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></div>` +
        (o.points ? `<div class="summ-p"><b>${T('ข้อสรุป', 'What it shows')}</b><ol>${o.points.map(x => `<li>${tt(x)}</li>`).join('')}</ol></div>` : '');
      MC.renderMath(box); }
    box.hidden = !box.hidden; btn.textContent = box.hidden ? T('▼ ดูสรุปผลการทดลอง (ลองเองก่อน)', '▼ Show the summary (try it yourself first)') : T('▲ ซ่อนสรุปผล', '▲ Hide the summary'); });
};

/* YouTube facades: <div class="yt" data-id="VIDEO_ID" data-title="..."></div> shows the thumbnail and loads the player on click */
ED.ytInit = (root = document) => root.querySelectorAll('.yt[data-id]').forEach(el => { if (el.dataset.ready) return; el.dataset.ready = '1';
  const id = el.dataset.id, ttl = el.dataset.title || 'YouTube video';
  el.innerHTML = `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="${ttl.replace(/"/g, '&quot;')}" loading="lazy"><span class="yt-play" aria-hidden="true"></span>`;
  el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', MC.t('เล่นวิดีโอ: ', 'Play video: ') + ttl);
  // YouTube refuses embeds that send no referrer (error 153), so the iframe asks for the origin to be sent and names it in origin=
  const org = /^https?:/.test(location.origin) ? `&origin=${encodeURIComponent(location.origin)}` : '';
  const play = () => { el.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1${org}" title="${ttl.replace(/"/g, '&quot;')}" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`; el.style.cursor = 'default'; };
  const alt = document.createElement('a'); alt.className = 'yt-alt'; alt.href = `https://www.youtube.com/watch?v=${id}`; alt.target = '_blank'; alt.rel = 'noopener';
  alt.textContent = MC.t('เล่นในหน้านี้ไม่ได้? เปิดดูบน YouTube ↗', 'Will not play here? Watch it on YouTube ↗'); el.after(alt);
  el.addEventListener('click', play, { once: true }); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } }, { once: true }); });
document.addEventListener('mc:ready', () => ED.ytInit());

global.ED = ED;
})(window);
