/* shell.js — page chrome shared by every stop: language (TH/EN), reading theme, top bar, prev/next links,
   visited-marking for the roadmap, KaTeX auto-render, the anonymous feedback box, small UI builders and an animation loop.
   Load in <head> (not deferred) so the theme and language apply before first paint.
   Bilingual convention: static HTML uses data-l="th" / data-l="en" blocks (CSS hides the other);
   script strings use t('ไทย', 'English'). Switching the language reloads the page. */
(function () {
'use strict';
const THEMES = { paper: ['กระดาษ', 'Paper'], warm: ['ครีม', 'Warm'], blue: ['ฟ้าอ่อน', 'Soft blue'], dark: ['มืด', 'Dark'] };
const KEY = 'ee-theme', VKEY = 'ed2-visited', LKEY = 'ee-lang';   // theme and language shared with the EE_Web site (same origin on GitHub Pages); visited pages kept apart
let lang = 'th'; try { const s = localStorage.getItem(LKEY); if (s === 'en' || s === 'th') lang = s; } catch (e) {}
document.documentElement.dataset.lang = lang; document.documentElement.lang = lang;
function initialTheme() { try { const s = localStorage.getItem(KEY); if (s && THEMES[s]) return s; } catch (e) {}
  return (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'paper'; }
let theme = initialTheme(); document.documentElement.dataset.theme = theme;

const MC = { THEMES, get theme() { return theme; }, get lang() { return lang; } };
MC.t = (th, en) => (lang === 'en' && en !== undefined && en !== null) ? en : th;
window.t = MC.t;
MC.setLang = l => { if (l !== 'th' && l !== 'en') return; try { localStorage.setItem(LKEY, l); } catch (e) {} location.reload(); };
MC.setTheme = t => { if (!THEMES[t]) return; theme = t; document.documentElement.dataset.theme = t; try { localStorage.setItem(KEY, t); } catch (e) {}
  const sel = document.getElementById('mc-theme-select'); if (sel) sel.value = t; };
MC.file = () => { const p = decodeURIComponent(location.pathname.split('/').pop() || ''); return p || 'index.html'; };
MC.live = () => (window.STOPS || []).filter(s => !s.soon);
MC.here = () => MC.live().find(s => s.file === MC.file());
MC.visited = () => { try { return JSON.parse(localStorage.getItem(VKEY) || '{}'); } catch (e) { return {}; } };
MC.markVisited = file => { const v = MC.visited(); v[file] = Date.now(); try { localStorage.setItem(VKEY, JSON.stringify(v)); } catch (e) {} };
MC.resetVisited = () => { try { localStorage.removeItem(VKEY); } catch (e) {} };
MC.stopTitle = s => MC.t(s.title, s.en);
MC.stageName = st => (window.STAGES && window.STAGES[st]) ? MC.t(window.STAGES[st].short, window.STAGES[st].short_en) : '';

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function topbar() {
  const el = document.getElementById('mc-top'); if (!el) return; const here = MC.here();
  el.innerHTML = `<a class="hub" href="index.html">← ${MC.t('แผนที่การเรียน', 'Roadmap')}</a>` +
    (here ? `<span class="crumb">· ${here.crumb ? MC.t(here.crumb, here.crumb_en) : `${MC.t('บทที่', 'Chapter')} ${here.ch} · ${MC.t('หน้า', 'page')} ${here.step}`}</span>` : '') +
    `<span class="spacer"></span>` +
    `<span class="langsw" role="group" aria-label="language"><button type="button" class="${lang === 'th' ? 'on' : ''}" data-lang="th">ไทย</button><button type="button" class="${lang === 'en' ? 'on' : ''}" data-lang="en">EN</button></span>` +
    `<label class="theme">${MC.t('ธีมการอ่าน', 'Theme')} <select id="mc-theme-select" aria-label="theme">${Object.entries(THEMES).map(([k, v]) => `<option value="${k}"${k === theme ? ' selected' : ''}>${MC.t(v[0], v[1])}</option>`).join('')}</select></label>`;
  el.querySelector('#mc-theme-select').addEventListener('change', e => MC.setTheme(e.target.value));
  el.querySelectorAll('.langsw button').forEach(b => b.addEventListener('click', () => { if (b.dataset.lang !== lang) MC.setLang(b.dataset.lang); }));
}
function navbar() {
  const el = document.getElementById('mc-nav'); if (!el) return; const stops = MC.live(); const here = MC.here(); if (!here) return;
  const i = stops.indexOf(here); const prev = stops[i - 1], next = stops[i + 1]; const S = MC.t('หน้า', 'Page');
  el.innerHTML = (prev ? `<a class="navlink prev" href="${prev.file}">← ${S} ${prev.step}: ${esc(MC.stopTitle(prev))}</a>` : '<span></span>') +
    (next ? `<a class="navlink next" href="${next.file}">${S} ${next.step}: ${esc(MC.stopTitle(next))} →</a>` : `<a class="navlink next" href="index.html">${MC.t('กลับไปแผนที่การเรียน', 'Back to the roadmap')} →</a>`);
}
function pageTitle() { const t = document.querySelector('title'); if (t && lang === 'en' && t.dataset.en) document.title = t.dataset.en; }
const MATH_OPTS = { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false };
MC.renderMath = el => { if (typeof renderMathInElement === 'function') renderMathInElement(el || document.body, MATH_OPTS); };
MC.tex = (s, display) => { if (typeof katex !== 'undefined') { try { return katex.renderToString(s, { displayMode: !!display, throwOnError: false }); } catch (e) {} } return esc(s); };
/* convention strip of the AC pages, <div class="conv" data-mag="peak|rms"></div>: the course writes every sinusoid with sin
   (Vm sin(ωt + θ) ⇄ Vm∠θ, also for textbook problems given with cos); data-mag says whether phasor sizes are peak or rms values */
function convBox() { document.querySelectorAll('.conv[data-mag]').forEach(el => { const rms = el.dataset.mag === 'rms';
  el.innerHTML = `<span class="ct">${MC.t('แบบแผนของหน้านี้', 'Convention on this page')}</span>` +
    `<span class="cf">${MC.t('อ้างอิง sin', 'Sine reference')}: \\(v(t) = V_m\\sin(\\omega t + \\theta) \\;\\Longleftrightarrow\\; \\mathbf{V} = ${rms ? '\\tfrac{V_m}{\\sqrt2}' : 'V_m'}\\angle\\theta\\)</span>` +
    `<span class="cm">${rms ? MC.t('ขนาดของเฟเซอร์ = ค่ายังผล (root mean square, rms)', 'phasor size = rms (effective) value') : MC.t('ขนาดของเฟเซอร์ = ค่ายอด', 'phasor size = peak value')}</span>` +
    `<span class="cx">${MC.t('โจทย์ที่ให้มาเป็น cos (เช่นจากตำรา Hayt) <b>ต้องแปลงเป็น sin ก่อน</b>เขียนเฟเซอร์: \\(\\cos x = \\sin(x + 90^\\circ)\\) · ถ้าโจทย์ให้เฟเซอร์มาเลย ให้อ่านกลับเป็นฟังก์ชัน sin และเขียนคำตอบในโดเมนเวลาด้วย sin', 'A problem given with cos (e.g. from the Hayt textbook) <b>must be turned into sin first</b>, before writing the phasor: \\(\\cos x = \\sin(x + 90^\\circ)\\). A phasor given directly is read back as a sine, and time-domain answers are written with sin.')}</span>`; }); }
/* feedback box at the end of every stop page and of the roadmap: anonymous (no name, e-mail or student id), sent straight to the
   instructor's Google Form (fetch no-cors to formResponse). Set it up with feedback/create_form.gs, which creates the form and logs a
   pre-filled link: FEEDBACK.form = the id in docs.google.com/forms/d/e/<id>/viewform, entries = the entry.<number> of each question.
   Until form is set the box shows only on localhost, as a preview that sends nothing. FB_KINDS must match the form's choices exactly
   (th + ' / ' + en, no commas: the response sheet joins several choices with ', '). */
const FEEDBACK = { form: '', entries: { page: '', rate: '', kind: '', text: '', device: '' } };   // this course has no form yet (the box shows only on localhost)
const FB_KINDS = [['เนื้อหาหรือคำอธิบายไม่ชัด', 'unclear explanation'], ['ตัวเลขหรือเฉลยผิด', 'wrong number or answer'], ['ภาพจำลองมีปัญหาหรือเข้าใจยาก', 'simulation problem'],
  ['ใช้บนมือถือลำบาก', 'hard to use on a phone'], ['อยากให้เพิ่มโจทย์หรือเนื้อหา', 'more problems or topics'], ['ชอบส่วนนี้', 'I liked this']];
MC.FEEDBACK = FEEDBACK; MC.FB_KINDS = FB_KINDS;
function feedbackBox() {
  const live = !!FEEDBACK.form, local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); if (!live && !local) return;
  const here = MC.here(), home = MC.file() === 'index.html', nav = document.getElementById('mc-nav');
  const host = here ? nav : home ? document.querySelector('.wrap > footer') : null; if (!host) return;
  const T = MC.t, page = here ? `${here.step} ${here.file}` : 'index.html';
  const box = document.createElement('section'); box.className = 'fb'; box.id = 'mc-fb';
  box.innerHTML = `<h2>${home ? T('ความเห็นต่อสื่อการสอนนี้', 'Feedback on this website') : T('ความเห็นต่อหน้านี้', 'Feedback on this page')} <span class="fb-anon">${T('ไม่ระบุตัวตน', 'anonymous')}</span></h2>` +
    `<p class="fb-q">${home ? T('เว็บนี้ช่วยให้เข้าใจเนื้อหาแค่ไหน', 'How much does this website help you understand the course?') : T('หน้านี้ช่วยให้เข้าใจเนื้อหาแค่ไหน', 'How much did this page help you understand?')}</p>` +
    `<div class="fb-rate" role="radiogroup" aria-label="${T('คะแนน 1 ถึง 5', 'score 1 to 5')}">${[1, 2, 3, 4, 5].map(v => `<button type="button" role="radio" aria-checked="false" data-v="${v}">${v}</button>`).join('')}` +
    `<span class="fb-ends">${T('1 = ไม่ช่วยเลย · 5 = ช่วยมาก', '1 = not at all · 5 = a lot')}</span></div>` +
    `<div class="fb-kind">${FB_KINDS.map((k, i) => `<label><input type="checkbox" value="${i}"> ${T(k[0], k[1])}</label>`).join('')}</div>` +
    `<textarea rows="3" maxlength="2000" aria-label="${T('ความเห็น', 'comment')}" placeholder="${T('ส่วนไหนยังงง หรืออยากให้ปรับอะไร (ไม่บังคับ)', 'What was confusing, or what should change? (optional)')}"></textarea>` +
    `<div class="fb-row"><button type="button" class="fb-send">${T('ส่งความเห็น', 'Send')}</button><span class="fb-msg" role="status"></span></div>` +
    `<p class="fb-note">${T('ไม่เก็บชื่อ อีเมล หรือรหัสนักศึกษา ความเห็นใช้ปรับปรุงสื่อการสอนนี้เท่านั้น', 'No name, e-mail or student ID is collected; the feedback is used only to improve this material.')}` +
    `${live ? '' : ' · ' + T('ตัวอย่างบนเครื่อง: ยังไม่ได้ตั้งค่าแบบฟอร์ม จึงไม่ส่งจริง', 'local preview: the form is not set up yet, so nothing is sent')}</p>`;
  host.parentNode.insertBefore(box, host);
  let rate = 0; const msg = box.querySelector('.fb-msg'), send = box.querySelector('.fb-send'), ta = box.querySelector('textarea'), rb = [...box.querySelectorAll('.fb-rate button')];
  rb.forEach(b => b.addEventListener('click', () => { rate = +b.dataset.v; rb.forEach(x => { const on = +x.dataset.v === rate; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); }); }));
  send.addEventListener('click', async () => {
    const kinds = [...box.querySelectorAll('.fb-kind input:checked')].map(c => FB_KINDS[+c.value].join(' / ')), text = ta.value.trim();
    if (!rate && !kinds.length && !text) { msg.textContent = T('เลือกคะแนนหรือเขียนความเห็นก่อนส่ง', 'Pick a score or write a comment first.'); return; }
    const E = FEEDBACK.entries, body = new URLSearchParams();
    body.append('entry.' + E.page, page); if (rate) body.append('entry.' + E.rate, String(rate)); kinds.forEach(k => body.append('entry.' + E.kind, k));
    if (text) body.append('entry.' + E.text, text); body.append('entry.' + E.device, `${lang} · ${innerWidth}×${innerHeight} · ${theme}`);
    send.disabled = true; msg.textContent = T('กำลังส่ง…', 'Sending…');
    if (!live) { console.log('[feedback preview]', [...body.entries()]); msg.textContent = T('ตัวอย่าง: ไม่ได้ส่งจริง', 'Preview: nothing was sent.'); send.disabled = false; return; }
    try { await fetch(`https://docs.google.com/forms/d/e/${FEEDBACK.form}/formResponse`, { method: 'POST', mode: 'no-cors', body });
      msg.textContent = T('ส่งแล้ว ขอบคุณครับ', 'Sent. Thank you!'); ta.value = ''; box.querySelectorAll('.fb-kind input').forEach(c => { c.checked = false; }); setTimeout(() => { send.disabled = false; }, 4000); }
    catch (e) { msg.innerHTML = T('ส่งไม่สำเร็จ ลองอีกครั้ง หรือ', 'Could not send. Try again, or ') + `<a href="https://docs.google.com/forms/d/e/${FEEDBACK.form}/viewform?usp=pp_url&entry.${E.page}=${encodeURIComponent(page)}" target="_blank" rel="noopener">${T('เปิดแบบฟอร์ม', 'open the form')}</a>`; send.disabled = false; } });
}
/* visitor counter (counter/visit_counter.gs, a web app on the instructor's Google account): every page shows its own count and the whole
   site's in the top bar. A device is counted once a day per page, and once a day for the site; the day is remembered in localStorage
   (ed2-count), and nothing about the visitor is sent. COUNTER.url = the web app URL ending in /exec; empty: no counter (localhost shows a
   placeholder). On localhost the counter only reads, so testing never adds to the numbers */
const COUNTER = { url: '' };
MC.COUNTER = COUNTER;
function visitCounter() {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname), here = MC.here(), home = MC.file() === 'index.html';
  const bar = document.getElementById('mc-top'); if ((!COUNTER.url && !local) || (!here && !home) || !bar) return;
  const old = bar.querySelector('.visits'); if (old) old.remove();
  const el = document.createElement('span'); el.className = 'visits'; el.title = MC.t('นับเครื่องละครั้งต่อวัน', 'counted once a day per device');
  const spacer = bar.querySelector('.spacer'); bar.insertBefore(el, spacer);
  const fmt = n => Number(n).toLocaleString('en-US'), show = r => { el.textContent = home ? `${MC.t('ผู้เข้าชมทั้งเว็บ', 'Site visitors')} ${fmt(r.site)}`
    : `${MC.t('ผู้เข้าชม: หน้านี้', 'Visitors: this page')} ${fmt(r.page)} · ${MC.t('ทั้งเว็บ', 'site')} ${fmt(r.site)}`; };
  if (!COUNTER.url) { el.textContent = MC.t('ผู้เข้าชม: (ยังไม่ได้ตั้งค่าตัวนับ)', 'Visitors: (counter not set up)'); return; }
  const file = home ? 'index.html' : here.file, d = new Date(), day = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  let st = {}; try { st = JSON.parse(localStorage.getItem('ed2-count') || '{}'); } catch (e) {}
  if (st.day !== day) st = { day, site: false, pages: [] };
  const addS = !local && !st.site, addP = !local && !st.pages.includes(file), cb = '__ed2Visits';
  window[cb] = r => { if (!r || r.page === null || r.page === undefined) { el.remove(); return; } show(r);
    if (addS) st.site = true; if (addP) st.pages.push(file); try { localStorage.setItem('ed2-count', JSON.stringify(st)); } catch (e) {} };
  const sc = document.createElement('script'); sc.async = true; sc.onerror = () => el.remove();
  sc.src = `${COUNTER.url}?page=${encodeURIComponent(file)}&p=${addP ? 1 : 0}&s=${addS ? 1 : 0}&callback=${cb}`; document.head.appendChild(sc);
}
MC.visitCounter = visitCounter;
document.addEventListener('DOMContentLoaded', () => { pageTitle(); topbar(); navbar(); const here = MC.here(); if (here) MC.markVisited(here.file); convBox(); feedbackBox(); visitCounter(); MC.renderMath(); document.dispatchEvent(new Event('mc:ready')); });

/* ---------- small UI builders for the control panel ---------- */
const ui = {};
ui.h2 = (parent, text) => { const h = document.createElement('h2'); h.textContent = text; parent.appendChild(h); return h; };
ui.slider = (parent, spec) => {
  const d = document.createElement('div'); d.className = 'slider-block';
  const lab = subs(spec.label);   // "V_i", "V_{CC}": subscripts
  d.innerHTML = `<div class="row"><label for="${spec.id}">${lab}</label><span class="val" id="${spec.id}-val"></span></div>` +
    `<input type="range" id="${spec.id}" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${spec.value}">`;
  parent.appendChild(d); const inp = d.querySelector('input'), val = d.querySelector('.val');
  const fmt = spec.fmt || (v => NUM.fmt(v, spec.dec ?? 2) + (spec.unit ? ' ' + spec.unit : ''));
  const show = () => { val.textContent = fmt(parseFloat(inp.value)); }; show();
  inp.addEventListener('input', () => { if (spec.oninput) spec.oninput(parseFloat(inp.value)); show(); });   // the page's state first, so that fmt may read it
  return { get: () => parseFloat(inp.value), set: v => { inp.value = v; show(); }, el: inp, block: d };
};
ui.buttons = (parent, list) => {
  const d = document.createElement('div'); d.className = 'toggles'; parent.appendChild(d); const out = {};
  list.forEach(b => { const el = document.createElement('button'); el.type = 'button'; el.className = 'btn' + (b.on ? ' on' : '') + (b.cls ? ' ' + b.cls : '');
    if (b.id) el.id = b.id; if (/_/.test(b.label)) el.innerHTML = subs(b.label); else el.textContent = b.label; if (b.title) el.title = b.title; el.addEventListener('click', () => b.onclick && b.onclick(el)); d.appendChild(el); if (b.id) out[b.id] = el; });
  return out;
};
ui.radio = (parent, list, onchange) => {
  const btns = ui.buttons(parent, list.map(b => ({ ...b, onclick: el => { Object.values(btns).forEach(x => x.classList.remove('on')); el.classList.add('on'); onchange(b.id); } })));
  return { set: id => { Object.values(btns).forEach(x => x.classList.toggle('on', x.id === id)); }, btns };
};
ui.status = (parent, id) => { const d = document.createElement('div'); d.className = 'status'; if (id) d.id = id; parent.appendChild(d); return d; };
ui.setStatus = (el, pill, text, kind) => { el.innerHTML = `<span class="pill ${kind || ''}">${pill}</span> ${text}`; };
ui.metrics = (parent, id) => { const d = document.createElement('div'); d.className = 'metrics'; if (id) d.id = id; parent.appendChild(d); return d; };
ui.html = (parent, html, cls) => { const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = html; parent.appendChild(d); return d; };
const subs = s => String(s).replace(/_\{([^}]*)\}|_([A-Za-zα-ω0-9]+)/g, (m, a, b) => `<sub>${a ?? b}</sub>`);   // "V_L", "β_{dc}": subscripts
ui.subs = subs;
ui.kv = rows => rows.map(([k, v]) => `<div class="kv"><span class="k">${subs(k)}</span><code>${v}</code></div>`).join('');
/* standard run/pause button label pair */
ui.runLabel = running => running ? MC.t('หยุด', 'Pause') : MC.t('เล่นต่อ', 'Resume');
MC.ui = ui;

/* ---------- animation loop with fixed physics step ---------- */
MC.loop = (step, draw, opts = {}) => {
  let last = null, acc = 0, running = opts.running ?? true, raf = 0, speed = opts.speed || 1; const dt = opts.dt || 0.001, maxFrame = 0.05;
  function frame(ts) { raf = requestAnimationFrame(frame); if (last === null) last = ts; let el = (ts - last) / 1000; last = ts; if (el > maxFrame) el = maxFrame;
    if (running) { acc += el * speed; let n = 0; while (acc >= dt && n < 4000) { step(dt); acc -= dt; n++; } } draw(); }
  raf = requestAnimationFrame(frame);
  return { pause: () => { running = false; }, resume: () => { running = true; last = null; acc = 0; }, toggle: () => { running = !running; last = null; acc = 0; return running; },
    get running() { return running; }, setSpeed: s => { speed = s; }, get speed() { return speed; }, stop: () => cancelAnimationFrame(raf) };
};
MC.pointer = (canvas, ev) => { const r = canvas.getBoundingClientRect(); const t = ev.touches ? ev.touches[0] : ev; return { x: t.clientX - r.left, y: t.clientY - r.top }; };
MC.drag = (canvas, handlers) => {
  let active = null; const down = ev => { const p = MC.pointer(canvas, ev); const id = handlers.hit(p); if (id !== null && id !== undefined) { active = id; ev.preventDefault(); handlers.move(active, p); } };
  const move = ev => { if (active === null) return; ev.preventDefault(); handlers.move(active, MC.pointer(canvas, ev)); };
  const up = () => { if (active !== null && handlers.up) handlers.up(active); active = null; };
  canvas.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  canvas.addEventListener('touchstart', down, { passive: false }); window.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);
};
window.MC = MC;
})();
