/* draw.js — canvas helpers: text, arrows, nice ticks and the Plot data panel (from the Modern Control site).
   The canvas keeps its own dark palette regardless of the reading theme (as in the reference site). */
(function (global) {
'use strict';
const DRAW = {};
DRAW.pal = { bg: '#0f1220', panel: '#161a2f', grid: '#262c4a', axis: '#6b7399', ink: '#e8ecf7', muted: '#9aa3c7',
  accent: '#5ad1ff', accent2: '#ff7eb6', good: '#7ee787', warn: '#ffd166', bad: '#ff6b6b', purple: '#c792ea', orange: '#ffa552',
  white: '#ffffff', dim: '#3a4160', metal: '#9fb3c8', brass: '#d8b25a' };
DRAW.font = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
DRAW.fontTh = '"IBM Plex Sans Thai", system-ui, sans-serif';

/* crisp canvas at CSS size w×h; returns 2-D context working in CSS pixels */
DRAW.setup = (canvas, w, h) => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return ctx;
};
/* size to the parent card width with a given aspect (h/w) */
DRAW.fit = (canvas, aspect = 0.75, minW = 300) => {
  const w = Math.max(minW, Math.floor(canvas.parentElement.clientWidth - 12)); const h = Math.round(w * aspect);
  return { ctx: DRAW.setup(canvas, w, h), w, h };
};
DRAW.clear = (ctx, w, h, color) => { ctx.fillStyle = color || DRAW.pal.bg; ctx.fillRect(0, 0, w, h); };
DRAW.text = (ctx, s, x, y, o = {}) => {
  ctx.font = `${o.weight || ''} ${o.size || 11}px ${o.th ? DRAW.fontTh : DRAW.font}`.trim();
  ctx.fillStyle = o.color || DRAW.pal.muted; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
  if (o.alpha !== undefined) { ctx.save(); ctx.globalAlpha = o.alpha; ctx.fillText(s, x, y); ctx.restore(); } else ctx.fillText(s, x, y);
};
DRAW.line = (ctx, x1, y1, x2, y2, o = {}) => { ctx.save(); ctx.strokeStyle = o.color || DRAW.pal.ink; ctx.lineWidth = o.width || 1;
  if (o.dash) ctx.setLineDash(o.dash); if (o.alpha !== undefined) ctx.globalAlpha = o.alpha; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); };
DRAW.arrow = (ctx, x1, y1, x2, y2, o = {}) => {
  const col = o.color || DRAW.pal.warn, lw = o.width || 2, hl = o.head || 7; const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - hl * Math.cos(ang - 0.45), y2 - hl * Math.sin(ang - 0.45)); ctx.lineTo(x2 - hl * Math.cos(ang + 0.45), y2 - hl * Math.sin(ang + 0.45)); ctx.closePath(); ctx.fill(); ctx.restore();
};
DRAW.circle = (ctx, x, y, r, o = {}) => { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.width || 1.5; ctx.stroke(); } ctx.restore(); };
DRAW.cross = (ctx, x, y, r, o = {}) => { ctx.save(); ctx.strokeStyle = o.color || DRAW.pal.accent; ctx.lineWidth = o.width || 2; ctx.beginPath();
  ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x - r, y + r); ctx.lineTo(x + r, y - r); ctx.stroke(); ctx.restore(); };
DRAW.roundRect = (ctx, x, y, w, h, r, o = {}) => { ctx.save(); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.width || 1; ctx.stroke(); } ctx.restore(); };

/* nice tick values */
DRAW.ticks = (lo, hi, n = 5) => {
  const raw = (hi - lo) / Math.max(1, n); if (!(raw > 0)) return { step: 1, values: [lo] };
  const mag = Math.pow(10, Math.floor(Math.log10(raw))); const norm = raw / mag; const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const values = []; for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) values.push(Math.abs(v) < 1e-12 ? 0 : v); return { step, values };
};
DRAW.fmtTick = (v, step) => { const d = Math.max(0, -Math.floor(Math.log10(step) + 1e-9)); return v.toFixed(d).replace('-', '−'); };

/* ---------------- Plot: a rectangular data panel ---------------- */
class Plot {
  constructor(ctx, box, o = {}) {
    this.ctx = ctx; this.x = box.x; this.y = box.y; this.w = box.w; this.h = box.h; this.o = o;
    this.xlim = o.xlim || [0, 1]; this.ylim = o.ylim || [0, 1]; this.title = o.title || ''; this.xlabel = o.xlabel || ''; this.ylabel = o.ylabel || '';
    this.ml = o.ml ?? 48; this.mr = o.mr ?? 12; this.mt = o.mt ?? (this.title ? 26 : 10); this.mb = o.mb ?? (this.xlabel ? 34 : 20);
    this.px = this.x + this.ml; this.py = this.y + this.mt; this.pw = this.w - this.ml - this.mr; this.ph = this.h - this.mt - this.mb;
  }
  toX(v) { return this.px + (v - this.xlim[0]) / (this.xlim[1] - this.xlim[0]) * this.pw; }
  toY(v) { return this.py + this.ph - (v - this.ylim[0]) / (this.ylim[1] - this.ylim[0]) * this.ph; }
  fromX(p) { return this.xlim[0] + (p - this.px) / this.pw * (this.xlim[1] - this.xlim[0]); }
  fromY(p) { return this.ylim[0] + (this.py + this.ph - p) / this.ph * (this.ylim[1] - this.ylim[0]); }
  inside(px, py) { return px >= this.px && px <= this.px + this.pw && py >= this.py && py <= this.py + this.ph; }
  frame(o = {}) {
    const ctx = this.ctx, P = DRAW.pal;
    ctx.fillStyle = o.bg || P.panel; ctx.fillRect(this.x, this.y, this.w, this.h);
    const tx = DRAW.ticks(this.xlim[0], this.xlim[1], o.nx || Math.max(3, Math.round(this.pw / 70)));
    const ty = DRAW.ticks(this.ylim[0], this.ylim[1], o.ny || Math.max(3, Math.round(this.ph / 40)));
    ctx.save(); ctx.lineWidth = 1;
    for (const v of tx.values) { const X = this.toX(v); DRAW.line(ctx, X, this.py, X, this.py + this.ph, { color: Math.abs(v) < 1e-12 ? P.axis : P.grid });
      DRAW.text(ctx, (o.xfmt || this.o.xfmt) ? (o.xfmt || this.o.xfmt)(v) : DRAW.fmtTick(v, tx.step), X, this.py + this.ph + 14, { align: 'center', size: 11.5 }); }
    for (const v of ty.values) { const Y = this.toY(v); DRAW.line(ctx, this.px, Y, this.px + this.pw, Y, { color: Math.abs(v) < 1e-12 ? P.axis : P.grid });
      DRAW.text(ctx, (o.yfmt || this.o.yfmt) ? (o.yfmt || this.o.yfmt)(v) : DRAW.fmtTick(v, ty.step), this.px - 5, Y + 3.5, { align: 'right', size: 11.5 }); }
    ctx.restore();
    ctx.strokeStyle = P.dim; ctx.lineWidth = 1; ctx.strokeRect(this.px + 0.5, this.py + 0.5, this.pw - 1, this.ph - 1);
    if (this.title) DRAW.text(ctx, this.title, this.x + 8, this.y + 15, { color: P.ink, size: 13, weight: '600', th: /[ก-๙]/.test(this.title) });
    if (this.o.subtitle) DRAW.text(ctx, this.o.subtitle, this.x + 8 + ctx.measureText(this.title).width + 10, this.y + 15, { size: 12, th: true });
    if (this.xlabel) DRAW.text(ctx, this.xlabel, this.px + this.pw / 2, this.py + this.ph + 28, { align: 'center', size: 12, th: /[ก-๙]/.test(this.xlabel) });
    if (this.ylabel) { ctx.save(); ctx.translate(this.x + 11, this.py + this.ph / 2); ctx.rotate(-Math.PI / 2); DRAW.text(ctx, this.ylabel, 0, 0, { align: 'center', size: 12, th: /[ก-๙]/.test(this.ylabel) }); ctx.restore(); }
  }
  clip(fn) { const c = this.ctx; c.save(); c.beginPath(); c.rect(this.px, this.py, this.pw, this.ph); c.clip(); fn(); c.restore(); }
  line(xs, ys, o = {}) {
    const c = this.ctx; this.clip(() => { c.strokeStyle = o.color || DRAW.pal.accent; c.lineWidth = o.width || 1.6; if (o.dash) c.setLineDash(o.dash); if (o.alpha !== undefined) c.globalAlpha = o.alpha;
      c.beginPath(); let started = false; for (let i = 0; i < xs.length; i++) { const x = xs[i], y = ys[i]; if (!isFinite(x) || !isFinite(y)) { started = false; continue; }
        const X = this.toX(x), Y = this.toY(y); if (!started) { c.moveTo(X, Y); started = true; } else c.lineTo(X, Y); } c.stroke(); });
  }
  lineXY(pts, o = {}) { this.line(pts.map(p => p[0]), pts.map(p => p[1]), o); }
  marker(x, y, o = {}) { const X = this.toX(x), Y = this.toY(y); if (!this.inside(X, Y) && !o.force) return;
    const r = o.r || 5; if ((o.type || 'x') === 'x') DRAW.cross(this.ctx, X, Y, r, o); else if (o.type === 'o') DRAW.circle(this.ctx, X, Y, r, { stroke: o.color || DRAW.pal.accent2, width: o.width || 2, fill: o.fill });
    else if (o.type === 'dot') DRAW.circle(this.ctx, X, Y, r, { fill: o.color || DRAW.pal.ink, stroke: o.stroke }); }
  hline(y, o = {}) { const Y = this.toY(y); if (Y < this.py || Y > this.py + this.ph) return; DRAW.line(this.ctx, this.px, Y, this.px + this.pw, Y, { color: o.color || DRAW.pal.warn, width: o.width || 1, dash: o.dash || [4, 3], alpha: o.alpha });
    if (o.label) DRAW.text(this.ctx, o.label, o.labelLeft ? this.px + 4 : this.px + this.pw - 4, o.labelBelow ? Y + 11 : Y - 3, { align: o.labelLeft ? 'left' : 'right', size: 11.5, color: o.color || DRAW.pal.warn, th: /[ก-๙]/.test(o.label) }); }
  vline(x, o = {}) { const X = this.toX(x); if (X < this.px || X > this.px + this.pw) return; DRAW.line(this.ctx, X, this.py, X, this.py + this.ph, { color: o.color || DRAW.pal.warn, width: o.width || 1, dash: o.dash || [4, 3], alpha: o.alpha });
    if (o.label) DRAW.text(this.ctx, o.label, X + 3, this.py + 13, { size: 11.5, color: o.color || DRAW.pal.warn }); }
  band(x0, x1, o = {}) { const c = this.ctx; this.clip(() => { c.fillStyle = o.color || DRAW.pal.good; c.globalAlpha = o.alpha ?? 0.12; c.fillRect(this.toX(x0), this.py, this.toX(x1) - this.toX(x0), this.ph); }); }
  hband(y0, y1, o = {}) { const c = this.ctx; this.clip(() => { c.fillStyle = o.color || DRAW.pal.good; c.globalAlpha = o.alpha ?? 0.12; c.fillRect(this.px, this.toY(y1), this.pw, this.toY(y0) - this.toY(y1)); }); }
  polygon(pts, o = {}) { const c = this.ctx; this.clip(() => { c.beginPath(); pts.forEach((p, i) => { const X = this.toX(p[0]), Y = this.toY(p[1]); i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.closePath();
    if (o.fill) { c.fillStyle = o.fill; c.globalAlpha = o.alpha ?? 0.2; c.fill(); c.globalAlpha = 1; } if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = o.width || 1; c.stroke(); } }); }
  text(x, y, s, o = {}) { DRAW.text(this.ctx, s, this.toX(x) + (o.dx || 0), this.toY(y) + (o.dy || 0), o); }
  legend(items, o = {}) { let x = o.x ?? (this.px + this.pw - 6), y = o.y ?? (this.py + 14); const c = this.ctx; c.font = `12px ${DRAW.font}`;
    for (const it of items) { const w = c.measureText(it.label).width; if (o.align === 'left') { DRAW.line(c, x, y - 3, x + 14, y - 3, { color: it.color, width: 2.5, dash: it.dash }); DRAW.text(c, it.label, x + 18, y, { size: 12, color: it.color }); x += w + 32; }
      else { DRAW.text(c, it.label, x, y, { align: 'right', size: 12, color: it.color }); DRAW.line(c, x - w - 18, y - 3, x - w - 4, y - 3, { color: it.color, width: 2.5, dash: it.dash }); y += 16; } } }
  /* direction field for a 2-D autonomous system f([x,y]) → [dx,dy] */
  field(f, o = {}) { const nx = o.nx || 18, ny = o.ny || 14, c = this.ctx; const col = o.color || DRAW.pal.axis;
    this.clip(() => { for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const x = this.xlim[0] + (i + 0.5) / nx * (this.xlim[1] - this.xlim[0]), y = this.ylim[0] + (j + 0.5) / ny * (this.ylim[1] - this.ylim[0]);
      const d = f([x, y]); const dxp = d[0] / (this.xlim[1] - this.xlim[0]) * this.pw, dyp = -d[1] / (this.ylim[1] - this.ylim[0]) * this.ph; const n = Math.hypot(dxp, dyp) || 1; const L = o.len || 9;
      const X = this.toX(x), Y = this.toY(y); DRAW.arrow(c, X - dxp / n * L / 2, Y - dyp / n * L / 2, X + dxp / n * L / 2, Y + dyp / n * L / 2, { color: col, width: 1, head: 4 }); } }); }
}
DRAW.Plot = Plot;

/* horizontal meter with a limit (e.g. |u| / umax) */
DRAW.meter = (ctx, x, y, w, h, frac, o = {}) => { const P = DRAW.pal; ctx.save(); ctx.fillStyle = '#0b0e1c'; ctx.fillRect(x, y, w, h); const f = Math.max(-1, Math.min(1, frac));
  ctx.fillStyle = Math.abs(f) > 0.95 ? P.bad : (o.color || P.accent); if (o.signed) { ctx.fillRect(x + w / 2, y, f * w / 2, h); DRAW.line(ctx, x + w / 2, y, x + w / 2, y + h, { color: P.muted }); } else ctx.fillRect(x, y, Math.abs(f) * w, h);
  ctx.strokeStyle = P.dim; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.restore(); if (o.label) DRAW.text(ctx, o.label, x, y - 4, { size: 10 }); };

global.DRAW = DRAW;
})(window);
