/* lesson.js — teaching blocks for the problem-by-problem pages (rebuilt from chapter 1, Oct 2026).
   1) LS.stepper(el, o): the instructor's reveal. Each press of "Next step" uncovers one more step of the worked solution;
      "Back" covers it again, "Show all" uncovers the rest, "Restart" covers everything. The button bar sits under the last
      open step and sticks to the bottom of the screen while the solution is long, so the button is always at hand.
   2) Slide pictures: <figure class="slide"><img …></figure> opens full size in a lightbox when clicked or tapped.
   3) LS.anim(canvas, fn): one shared animation loop for many canvases; a canvas that is off screen is not redrawn.
   4) LS.ask(el, o): a "try it yourself first" answer box (inputs + Check) placed above a stepper.
   5) LS.fit / LS.fitIn / LS.step: display formulas laid out for the width of their column (chapters 5 and 6). */
(function (global) {
'use strict';
const LS = {};
const t = (th, en) => MC.t(th, en);

/* ---------------- 1) stepper ----------------
   o: { steps: [ {why: html, tex: TeX shown as display math, body: html | () => html, onShow(li, animate)} ] or a function returning that list,
        answer: html | () => html  (boxed under the last step once every step is open),
        onStep(k, n): called after every change (k = number of open steps),
        hint: html shown while no step is open, scroll: false to stop the page following the new step } */
LS.stepper = (el, o = {}) => {
  el.classList.add('stepper');
  el.innerHTML = `<ol class="steps"></ol><div class="final"></div><div class="shint"></div>
    <div class="stepbar"><button type="button" class="btn on" data-a="next"></button><button type="button" class="btn" data-a="prev">${t('◀ ย้อนกลับ', '◀ Back')}</button>` +
    `<button type="button" class="btn" data-a="all">${t('แสดงทุกขั้น', 'Show all')}</button><button type="button" class="btn" data-a="reset">${t('↺ เริ่มใหม่', '↺ Restart')}</button>` +
    `<span class="count"><span class="pdots"></span><span class="ctext"></span></span></div>`;
  const ol = el.querySelector('.steps'), fin = el.querySelector('.final'), hint = el.querySelector('.shint'), bar = el.querySelector('.stepbar');
  const B = a => bar.querySelector(`[data-a="${a}"]`);
  let steps = [], k = 0;
  const build = () => { steps = (typeof o.steps === 'function' ? o.steps() : o.steps) || []; };
  const body = s => (s.tex ? MC.tex(s.tex, true) : '') + (typeof s.body === 'function' ? s.body() : (s.body || ''));
  const make = (s, anim) => { const li = document.createElement('li'); if (!anim) li.classList.add('noanim');
    li.innerHTML = `<div class="sb">${s.why ? `<div class="why">${s.why}</div>` : ''}${body(s)}</div>`; MC.renderMath(li); return li; };
  const add = anim => { const s = steps[k], li = make(s, anim); ol.appendChild(li); k++; if (s.onShow) s.onShow(li, anim); return li; };
  function sync() {
    const n = steps.length; [...ol.children].forEach((li, i) => { li.classList.toggle('cur', i === k - 1 && k < n); li.classList.toggle('done', i < k - 1 || k === n); });
    const ans = k === n && n > 0 && o.answer ? (typeof o.answer === 'function' ? o.answer() : o.answer) : '';
    fin.innerHTML = ans ? `<div class="answer">${ans}</div>` : ''; if (ans) MC.renderMath(fin);
    hint.innerHTML = k === 0 ? (o.hint || t('<b>ลองคิดเองก่อน</b> แล้วกด <b>▶ ขั้นถัดไป</b> เพื่อเปิดเฉลยทีละขั้น', '<b>Try it yourself first</b>, then press <b>▶ Next step</b> to open the solution one step at a time')) : '';
    if (k === 0 && o.hint) MC.renderMath(hint);   // a page's own hint may hold math
    const nx = B('next'); nx.disabled = k >= n; nx.textContent = k >= n ? t('✓ ครบทุกขั้นแล้ว', '✓ All steps shown') : (k === 0 ? t('▶ เริ่มเฉลย', '▶ Start') : t('▶ ขั้นถัดไป', '▶ Next step'));
    B('prev').disabled = k === 0; B('all').disabled = k >= n; B('reset').disabled = k === 0;
    bar.querySelector('.pdots').innerHTML = n <= 16 ? steps.map((_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('') : '';
    bar.querySelector('.ctext').textContent = `${t('ขั้นที่', 'step')} ${k} / ${n}`;
    if (o.onStep) o.onStep(k, n);
    el.dataset.k = k; const sec = el.closest('section'); if (sec) sec.dataset.sol = [...sec.querySelectorAll('.stepper')].some(s => +(s.dataset.k || 0) > 0) ? '1' : '0';   // circuit.js shows the meter once a solution is opened
  }
  /* keep the button bar where it was on screen (so repeated presses land on it) and make sure the new step shows above it */
  const keep = (fn, li) => { if (o.scroll === false) { fn(); return; } const y0 = bar.getBoundingClientRect().top; const out = fn();
    let dy = bar.getBoundingClientRect().top - y0; const L = li || out;
    if (L && L.getBoundingClientRect) { const lb = L.getBoundingClientRect().bottom, bt = bar.getBoundingClientRect().top - dy; if (lb - dy > bt - 6) dy += lb - dy - bt + 10; }
    if (Math.abs(dy) > 1) window.scrollBy({ top: dy, behavior: 'instant' }); };
  const api = {
    get k() { return k; }, get n() { return steps.length; }, get steps() { return steps; }, el,
    next() { if (k >= steps.length) return; keep(() => { const li = add(true); sync(); return fin.innerHTML ? fin : li; }); },
    prev() { if (k <= 0) return; keep(() => { ol.lastElementChild.remove(); k--; sync(); }); },
    all() { while (k < steps.length) add(false); sync(); },
    reset() { keep(() => { ol.innerHTML = ''; k = 0; sync(); }); },
    go(n) { n = Math.max(0, Math.min(steps.length, n)); ol.innerHTML = ''; k = 0; while (k < n) add(false); sync(); },
    /* rebuild the steps (values changed); keep: keep the same number of open steps (default) */
    refresh(keep = true) { const kk = keep ? k : 0; build(); api.go(Math.min(kk, steps.length)); }
  };
  bar.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; api[b.dataset.a](); });
  build(); if (o.start) api.go(o.start); else sync();
  return api;
};

/* ---------------- 2) slide pictures: click to enlarge ---------------- */
let box = null;
LS.zoom = img => {
  if (!box) { box = document.createElement('div'); box.className = 'lightbox'; box.setAttribute('role', 'dialog');
    box.innerHTML = `<img alt=""><button type="button" class="lbx" aria-label="close">✕</button><div class="lbcap"></div>`; document.body.appendChild(box);
    box.addEventListener('click', () => { box.classList.remove('on'); }); document.addEventListener('keydown', e => { if (e.key === 'Escape') box.classList.remove('on'); }); }
  box.querySelector('img').src = img.currentSrc || img.src; box.querySelector('img').alt = img.alt || '';
  const cap = img.closest('figure') && img.closest('figure').querySelector('figcaption'); box.querySelector('.lbcap').textContent = cap ? cap.textContent.replace(/·[^·]*$/, '').trim() : '';
  box.classList.add('on');
};
document.addEventListener('click', e => { const img = e.target.closest && e.target.closest('figure.slide img'); if (img) LS.zoom(img); });

/* ---------------- 3) one animation loop for every canvas on the page ---------------- */
const A = []; let io = null;
LS.anim = (el, fn) => {
  const a = { el, fn, vis: true }; A.push(a);
  if ('IntersectionObserver' in window) { if (!io) io = new IntersectionObserver(es => es.forEach(en => { A.forEach(x => { if (x.el === en.target) x.vis = en.isIntersecting; }); }), { rootMargin: '160px 0px' }); io.observe(el); }
  try { fn(0); } catch (e) { console.error(e); }
  return a;
};
let last = null;
const step = ts => { if (last === null) last = ts; const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts; A.forEach(a => { if (a.vis) a.fn(dt); }); };
const raf = ts => { requestAnimationFrame(raf); step(ts); }; requestAnimationFrame(raf);
const tick = () => { if (document.hidden) step(performance.now()); setTimeout(tick, 250); }; setTimeout(tick, 0); // a hidden page gets no frames

/* ---------------- 4) "try it first" answer box ----------------
   o: { fields: [{label, ok: (x, vals) => bool, w (em)}], check: vals => '' | message for a known mistake, onOk() }
   (ok also gets every value, so two boxes can be checked as one answer, e.g. a phasor's size and angle) */
LS.ask = (el, o) => {
  el.classList.add('ask');
  el.innerHTML = `<span class="asklab">${t('ลองตอบก่อน:', 'Try first:')}</span> ` + o.fields.map((f, i) => `<label>${f.label} <input class="mi" data-i="${i}" inputmode="decimal" autocomplete="off" style="width:${f.w || 6}em" aria-label="${f.aria || ''}"></label>`).join(' ') +
    ` <button type="button" class="btn on">${t('ตรวจ', 'Check')}</button> <span class="askres"></span>`;
  const ins = [...el.querySelectorAll('input')], res = el.querySelector('.askres');
  const run = () => { const v = ins.map(x => parseFloat(x.value.replace(/−/g, '-').replace(',', '.')));
    if (v.some(x => !isFinite(x))) { res.innerHTML = t('ใส่ตัวเลขให้ครบทุกช่อง', 'Fill in every box'); return; }
    const ok = o.fields.map((f, i) => f.ok(v[i], v)); ins.forEach((x, i) => { x.classList.toggle('ok', ok[i]); x.classList.toggle('no', !ok[i]); });
    if (ok.every(Boolean)) { res.innerHTML = `<span class="pill good">✓</span> ${t('ถูกต้อง!', 'Correct!')}`; if (o.onOk) o.onOk(); return; }
    const why = o.check ? o.check(v) : ''; res.innerHTML = `<span class="pill bad">✗</span> ${why || t('ยังไม่ใช่ ลองอีกครั้ง หรือเปิดเฉลยทีละขั้น', 'Not yet: try again, or open the solution step by step')}`; MC.renderMath(res); };
  el.querySelector('button').addEventListener('click', run); ins.forEach(x => x.addEventListener('keydown', e => { if (e.key === 'Enter') run(); }));
  return { reset() { ins.forEach(x => { x.value = ''; x.classList.remove('ok', 'no'); }); res.innerHTML = ''; } };
};

/* multiple-choice "try it first": o = { options: [html], answer: index, labels: ['(a)', …], onPick(i, ok) } */
LS.choose = (el, o) => {
  el.classList.add('ask');
  const labs = o.labels || o.options.map((_, i) => `(${'abcdefgh'[i]})`);
  el.innerHTML = `<span class="asklab">${t('ลองตอบก่อน:', 'Try first:')}</span> ` + o.options.map((x, i) => `<button type="button" class="btn" data-i="${i}">${labs[i]} ${x}</button>`).join(' ') + ' <span class="askres"></span>';
  const res = el.querySelector('.askres');
  el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.i, ok = i === o.answer;
    el.querySelectorAll('button').forEach(x => x.classList.remove('on', 'danger')); b.classList.add('on'); if (!ok) b.classList.add('danger');
    res.innerHTML = ok ? `<span class="pill good">✓</span> ${t('ถูกต้อง!', 'Correct!')}` : `<span class="pill bad">✗</span> ${t('ยังไม่ใช่ ลองอีกครั้ง หรือเปิดเฉลยทีละขั้น', 'Not yet: try again, or open the solution step by step')}`;
    if (o.onPick) o.onPick(i, ok); }));
  return { reset() { el.querySelectorAll('button').forEach(x => x.classList.remove('on', 'danger')); res.innerHTML = ''; } };
};

/* ---------------- 5) formulas that fit their column ----------------
   A problem's steps are built with the width of their own column (LS.withCol(w, fn) sets LS.colW while fn runs; the chapter 5
   and 6 problem helpers do this). Widths are measured by LS.texW inside a hidden copy of the stepper, so the font size and the phone rules of ee.css
   apply; the KaTeX fonts may still be loading at the first measurements, so everything laid out then is measured and built
   again once they are in (LS.onFonts).
   An aligned block is as wide as its widest left side plus its widest right side. A formula too wide for the column is
   reshaped: (1) the "&& ⇒ x = y" part of a row goes to the next line, aligned at its own "="; (2) a left side that holds an
   "=" itself (V_AB = V_th &= …) is realigned at its first "="; (3) a few budgets for the left sides are tried: left sides
   break before a top-level + or −, right sides "= a = b" before an "=", each into the fewest and most even lines, and the
   layout that fits with the fewest rows wins; (4) a right side still too wide breaks before a top-level + or −. A one-line chain
   becomes an aligned block at its first relation, and a chain of separate results ("a = 1,\ b = 2") gets one result per row
   first (splitCases for "; \quad" cases, then splitChain). */
let probe = null, waiting = false; const WC5 = new Map(), LATE = [];
LS.onFonts = fn => { LATE.push(fn); };
const fontsLate = () => { if (waiting || !document.fonts) return; waiting = true;
  document.fonts.ready.then(() => { waiting = false; WC5.clear(); LATE.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }); };
const texW = s => { if (WC5.has(s)) return WC5.get(s); if (typeof katex === 'undefined' || typeof document === 'undefined' || !document.body) return 0;
  if (!probe) { probe = document.createElement('div'); probe.className = 'stepper'; probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden'; probe.innerHTML = '<ol class="steps"><li><div class="sb"></div></li></ol>'; document.body.appendChild(probe); }
  const sb = probe.querySelector('.sb'); let w = 0;
  try { sb.innerHTML = katex.renderToString(s, { displayMode: true, throwOnError: false }); const k = sb.querySelector('.katex-display'); w = k ? k.getBoundingClientRect().width : 0; } catch (e) {}
  if (document.fonts && document.fonts.status !== 'loaded') fontsLate();
  WC5.set(s, w); return w; };
LS.texW = texW;
LS.colW = 0;
const avail = () => (LS.colW || global.innerWidth || 1200) - 50;   // a step's formula box is its column less the step number and padding
const withCol = (w, fn) => { const w0 = LS.colW; LS.colW = w || 0; try { return fn(); } finally { LS.colW = w0; } };
LS.withCol = withCol;
/* top-level "=", "&", "+", "−" and row breaks: outside braces, brackets, parentheses and \left … \right */
const marks = s => { const out = []; let d = 0, lr = 0, pd = 0;
  for (let i = 0; i < s.length; i++) { const c = s[i];
    if (c === '\\') { const m = /^\\([a-zA-Z]+|[^a-zA-Z])/.exec(s.slice(i)), nm = m ? m[1] : '';
      if (nm === 'left') lr++; else if (nm === 'right') lr--; else if (nm === '\\' && !d && !lr && !pd) out.push({ c: 'row', i, len: 2 });
      i += (m ? m[0].length : 1) - 1; continue; }
    if (c === '{') d++; else if (c === '}') d--; else if (c === '(' || c === '[') pd++; else if (c === ')' || c === ']') pd--;
    else if (!d && !lr && !pd && '=&+-'.includes(c)) out.push({ c, i, len: 1 }); }
  return out; };
const cut = (s, ps) => { const out = []; let last = 0; ps.forEach(p => { out.push(s.slice(last, p.i)); last = p.i + p.len; }); out.push(s.slice(last)); return out.map(x => x.trim()); };
const block = rows => `\\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned}`;
LS.block = block;   // rows → one aligned block
const sides = r => { const a = marks(r).find(p => p.c === '&'); return a ? [r.slice(0, a.i).trim(), r.slice(a.i + 1).trim()] : [r.trim(), '']; };
const LW = r => texW(sides(r)[0] || '{}');
/* parts into the fewest lines no wider than b, then the most even; when none fits, the narrowest widest line */
const best = (parts, line, b) => { const n = parts.length; let top = null;
  for (let mask = 0; mask < 1 << (n - 1); mask++) { const ls = []; let cur = [parts[0]];
    for (let i = 1; i < n; i++) { if (mask & (1 << (i - 1))) { ls.push(cur); cur = [parts[i]]; } else cur.push(parts[i]); }
    ls.push(cur); const mx = Math.max(...ls.map((L, k) => texW(line(L, k)))), c = { ls, mx, ok: mx <= b };
    if (!top || (c.ok && !top.ok) || (c.ok && top.ok && (ls.length < top.ls.length || (ls.length === top.ls.length && mx < top.mx))) || (!c.ok && !top.ok && mx < top.mx)) top = c; }
  return top.ls; };
const wrapLeft = (r, b) => { const [L, R] = sides(r); if (texW(L) <= b) return [r];
  const cs = marks(L).filter(p => (p.c === '+' || p.c === '-') && L[p.i - 1] === ' ' && L[p.i + 1] === ' '); if (!cs.length || cs.length > 8) return [r];
  const parts = []; let last = 0; cs.forEach(p => { parts.push(L.slice(last, p.i).trim()); last = p.i; }); parts.push(L.slice(last).trim());
  const line = (P, k) => (k ? '{}' : '') + P.join(' '), ls = best(parts, line, b).map(line);
  if (R) ls[ls.length - 1] += ` &${R}`; return ls; };
const wrapRight = (r, b) => { const [L, R] = sides(r); if (!R || texW(`{}${R}`) <= b) return [r];
  const eqs = marks(R).filter(p => p.c === '=' && p.i > 0); if (!eqs.length || eqs.length > 8) return [r];
  const ps = cut(R, eqs), line = (P, k) => `{}${k ? '= ' : ''}${P.join(' = ')}`;
  return best(ps, line, b).map((P, k) => `${k ? '' : L + ' '}&${k ? '= ' : ''}${P.join(' = ')}`); };
/* last resort for a right side that is still too wide after the breaks at "=": break it before a top-level + or − into
   continuation rows "&\quad + …" (e.g. "= (a + b) + j(c + d)") */
const wrapPlus = (r, b) => { const [L, R] = sides(r); if (!R || texW(`{}${R}`) <= b) return [r];
  const cs = marks(R).filter(p => (p.c === '+' || p.c === '-') && p.i > 1 && R[p.i - 1] === ' ' && R[p.i + 1] === ' '); if (!cs.length || cs.length > 8) return [r];
  const parts = []; let last = 0; cs.forEach(p => { parts.push(R.slice(last, p.i).trim()); last = p.i; }); parts.push(R.slice(last).trim());
  const line = (P, k) => `{}${k ? '\\quad ' : ''}${P.join(' ')}`;
  return best(parts, line, b).map((P, k) => k ? `&\\quad ${P.join(' ')}` : `${L} &${P.join(' ')}`); };
/* a chain of separate results "a = 1,\ b = 2,\ c = 3" (a top-level comma before a space command) reads best one result per
   row, each aligned at its own relation (=, ≅ or ≈). A part whose left side does not look like a quantity (it starts with a
   digit or holds spaces or words, as in "2\ \text{mA at}\ V_{GS} = 0") stays on the row before it, as does a part with no relation */
const SP = /^\s*\\(?:qquad|quad|;|:|\s)\s*/;
const relOf = s => { let d = 0, lr = 0, pd = 0;
  for (let i = 0; i < s.length; i++) { const c = s[i];
    if (c === '\\') { const m = /^\\([a-zA-Z]+|[^a-zA-Z])/.exec(s.slice(i)), nm = m ? m[1] : '';
      if (nm === 'left') lr++; else if (nm === 'right') lr--; else if (!d && !lr && !pd && (nm === 'cong' || nm === 'approx')) return { i, len: m[0].length };
      i += (m ? m[0].length : 1) - 1; continue; }
    if (c === '{') d++; else if (c === '}') d--; else if (c === '(' || c === '[') pd++; else if (c === ')' || c === ']') pd--;
    else if (c === '=' && !d && !lr && !pd) return { i, len: 1 }; }
  return null; };
const sepCuts = (s, ch) => { const out = []; let d = 0, lr = 0, pd = 0;
  for (let i = 0; i < s.length; i++) { const c = s[i];
    if (c === '\\') { const m = /^\\([a-zA-Z]+|[^a-zA-Z])/.exec(s.slice(i)), nm = m ? m[1] : '';
      if (nm === 'left') lr++; else if (nm === 'right') lr--;
      i += (m ? m[0].length : 1) - 1; continue; }
    if (c === '{') d++; else if (c === '}') d--; else if (c === '(' || c === '[') pd++; else if (c === ')' || c === ']') pd--;
    else if (c === ch && !d && !lr && !pd && SP.test(s.slice(i + 1))) out.push(i); }
  return out; };
const pieces = (s, cs) => { const ps = []; let last = 0; cs.forEach(i => { ps.push(s.slice(last, i)); last = i + 1; }); ps.push(s.slice(last));
  return ps.map((x, k) => (k ? x.replace(SP, '') : x).trim()); };
const nameLike = L => L.length > 0 && L.length <= 48 && !/^[\d.+\-−(]/.test(L) && !/\\ |\\quad|\\qquad|\\text\{[^}]*\s/.test(L);
const atRel = p => { const q = relOf(p), L = q ? p.slice(0, q.i).trim() : '';
  return q && nameLike(L) ? `${L} &${p.slice(q.i, q.i + q.len)} ${p.slice(q.i + q.len).trim()}` : null; };
/* cases separated by "; \quad" ("+10: v_o = 0;\quad −10: v_o = −20\ \text{V}") go first, one whole case per row aligned at its
   first relation; the commas inside a case are split only if the cases still do not fit */
const splitCases = r => { const [L, R] = sides(r), cs = R ? sepCuts(R, ';') : []; if (!cs.length) return [r];
  const ps = pieces(R, cs);
  const out = [`${L} &${ps[0]}`, ...ps.slice(1).map(x => { const q = relOf(x); return q ? `${x.slice(0, q.i).trim()} &${x.slice(q.i, q.i + q.len)} ${x.slice(q.i + q.len).trim()}` : `&${x}`; })];
  return out; };
const splitChain = r => { const [L, R] = sides(r), body = R || r, cs = sepCuts(body, ','); if (!cs.length) return [r];
  const parts = pieces(body, cs), out = [R ? `${L} &${parts[0]}` : atRel(parts[0])];
  if (!out[0]) return [r];
  parts.slice(1).forEach(x => { const a = atRel(x); if (a) out.push(a); else out[out.length - 1] += `,\\ ${x}`; });
  return out.length > 1 ? out : [r]; };
LS.splitChain = splitChain; LS.splitCases = splitCases;
const realign = r => { const [L, R] = sides(r); const eq = R && marks(L).find(p => p.c === '='); return eq ? `${L.slice(0, eq.i).trim()} &= ${L.slice(eq.i + 1).trim()} ${R}` : r; };
LS.fit = tex => {
  if (!tex || typeof katex === 'undefined') return tex; const A = avail(), W = texW;
  if (W(tex) <= A) return tex;
  const m = /^\s*\\begin\{aligned\}([\s\S]*)\\end\{aligned\}\s*$/.exec(tex); let rows;
  if (m) rows = cut(m[1], marks(m[1]).filter(p => p.c === 'row')).filter(Boolean);
  else { const eq = relOf(tex); if (!eq) return tex; rows = [`${tex.slice(0, eq.i)}&${tex.slice(eq.i, eq.i + eq.len)}${tex.slice(eq.i + eq.len)}`]; }
  rows = rows.flatMap(r => { const ps = marks(r).filter(p => p.c === '&'), j = ps.findIndex((p, k) => ps[k + 1] && ps[k + 1].i === p.i + 1); if (j < 0) return [r];
    const head = r.slice(0, ps[j].i).trim(), tail = r.slice(ps[j].i + 2).trim(), eq = marks(tail).find(p => p.c === '=');
    return [head, eq ? `${tail.slice(0, eq.i).trim()} &= ${tail.slice(eq.i + 1).trim()}` : `&\\quad ${tail}`]; });
  rows = rows.flatMap(splitCases); if (rows.length > 1 && W(block(rows)) <= A) return block(rows);
  rows = rows.flatMap(splitChain);
  if (W(block(rows)) <= A) return block(rows);
  rows = rows.map(realign); if (W(block(rows)) <= A) return block(rows);
  let pick = null;
  [Infinity, 0.75, 0.6, 0.45, 0.32].forEach(f => { let rs = f === Infinity ? rows : rows.flatMap(r => wrapLeft(r, A * f));
    const mL = Math.max(...rs.map(LW)); rs = rs.flatMap(r => wrapRight(r, A - mL - 4));
    const w = W(block(rs)), c = { rs, w, ok: w <= A };
    if (!pick || (c.ok && !pick.ok) || (c.ok && pick.ok && rs.length < pick.rs.length) || (!c.ok && !pick.ok && w < pick.w)) pick = c; });
  if (!pick.ok) { const mL = Math.max(...pick.rs.map(LW)), rs = pick.rs.flatMap(r => wrapPlus(r, A - mL - 4)), w = W(block(rs)); if (w < pick.w) pick = { rs, w, ok: w <= A }; }
  return block(pick.rs);
};
/* fitted to the width of an element. Outside a stepper KaTeX may be drawn larger than in the probe (a plain display formula is
   1.21em, a phone step only about .92em), so the width is scaled by the ratio of the two sizes; fontEl gives the size when the
   formula goes into a box that cannot be measured yet (inside a closed <details>) */
const kSize = el => { const d = document.createElement('div'); d.className = 'katex-display'; d.style.cssText = 'position:absolute;visibility:hidden;margin:0';
  d.innerHTML = '<span class="katex">x</span>'; el.appendChild(d); const f = parseFloat(getComputedStyle(d.firstChild).fontSize) || 0; d.remove(); return f; };
LS.fitIn = (el, tex, fontEl) => { if (!el) return LS.fit(tex); texW('{}');
  if (!probe || el.closest('.stepper')) return withCol(el.clientWidth, () => LS.fit(tex));   // a stepper column: its steps are laid out as by LS.step
  const r = kSize(fontEl || el) / (kSize(probe.querySelector('.sb')) || 1) || 1;
  return withCol((el.clientWidth - 8) / r + 50, () => LS.fit(tex)); };
/* one step for LS.stepper: the formula fitted to the column, or drawn a little smaller (.mstack) when it still cannot fit */
const fitStep = (why, tex, note) => { const s = { why }; let body = note ? `<div class="sub2">${note}</div>` : '';
  if (tex) { const f = LS.fit(tex); if (texW(f) > avail() + 2) body = `<div class="mstack">${MC.tex(f, true)}</div>` + body; else s.tex = f; }
  if (body) s.body = body; return s; };
LS.step = fitStep;
/* fn(width) whenever the width of el changes by more than 4 px (a column can settle wider or narrower after a problem is set up,
   e.g. when the scrollbar appears or the page reflows; steps fitted to the old width would overflow) */
LS.watchWidth = (el, fn) => { if (!el || typeof ResizeObserver === 'undefined') return; let w0 = el.clientWidth;
  new ResizeObserver(() => { const w = el.clientWidth; if (w > 0 && Math.abs(w - w0) > 4) { w0 = w; fn(w); } }).observe(el); };

/* number helpers shared by the step builders: TeX-safe decimals (ASCII minus) and display text (Unicode minus) */
LS.d = (x, n = 3) => { let s = (+x).toFixed(n); if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, ''); return s === '-0' ? '0' : s; };
LS.u = (x, n = 3) => LS.d(x, n).replace('-', '−');

global.LS = LS;
})(window);
