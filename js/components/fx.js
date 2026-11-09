// Weather effects on a canvas: rain, snow, storm, fog, clouds, sun, stars.
import { store } from '../core/store.js';
import { $ } from '../core/dom.js';
import { QS } from '../core/config.js';
import { on } from '../core/bus.js';
import { wx, wxInfo } from './weather.js';

const FX = { mode: QS.get('fx') || store.get('vie26-fx', 'auto'), kind: null, level: 1, parts: [], raf: 0, last: 0, flash: 0, c: null, ctx: null, w: 0, h: 0, dpr: 1, col: null };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const LABELS = { rain: 'Pioggia', snow: 'Neve', storm: 'Temporale', fog: 'Nebbia', clouds: 'Nuvole', sun: 'Sole', stars: 'Cielo stellato' };
const rnd = (a, b) => a + Math.random() * (b - a);

function kindFromWeather() {
  if (!wx || !wx.cur) return [null, 1];
  const c = wx.cur.code, k = wxInfo(c)[0], night = wx.cur.day === 0;
  if (k === 'rain') return ['rain', (c >= 51 && c <= 55) ? .45 : (c === 61 || c === 80) ? .75 : (c === 65 || c === 82 || c === 67) ? 1.6 : 1.1];
  if (k === 'snow') return ['snow', (c === 71 || c === 85 || c === 77) ? .6 : (c === 75 || c === 86) ? 1.6 : 1];
  if (k === 'storm') return ['storm', 1.5];
  if (k === 'fog') return ['fog', 1];
  if (k === 'cloud') return ['clouds', 1.2];
  if (k === 'partly') return [night ? 'stars' : 'clouds', .6];
  return [night ? 'stars' : 'sun', 1];
}
function resolve() {
  if (FX.mode === 'off') return [null, 1];
  if (FX.mode !== 'auto') return [FX.mode, 1];
  return kindFromWeather();
}
const label = () => { const [k] = resolve(); return k ? LABELS[k] : 'Nessun effetto'; };

function colors() {
  const s = getComputedStyle(document.documentElement), v = n => s.getPropertyValue(n).trim();
  return { rain: v('--fx-rain'), snow: v('--fx-snow'), mist: v('--fx-mist'), sun: v('--fx-sun'), star: v('--fx-star') };
}
function resize() {
  const c = FX.c; FX.dpr = Math.min(2, devicePixelRatio || 1); FX.w = innerWidth; FX.h = innerHeight;
  c.width = FX.w * FX.dpr; c.height = FX.h * FX.dpr; c.style.width = FX.w + 'px'; c.style.height = FX.h + 'px';
  FX.ctx.setTransform(FX.dpr, 0, 0, FX.dpr, 0, 0);
}
function seed() {
  const k = FX.kind, W = FX.w, H = FX.h, L = FX.level, area = W * H / (390 * 844);
  FX.parts = [];
  if (k === 'rain' || k === 'storm') { const n = Math.round(110 * L * area); for (let i = 0; i < n; i++) FX.parts.push({ x: rnd(0, W), y: rnd(-H, H), l: rnd(10, 22), v: rnd(11, 18) * (k === 'storm' ? 1.25 : 1), o: rnd(.35, 1) }); }
  if (k === 'snow') { const n = Math.round(90 * L * area); for (let i = 0; i < n; i++) FX.parts.push({ x: rnd(0, W), y: rnd(-H, H), r: rnd(1.2, 3.4), v: rnd(.5, 1.4), ph: rnd(0, 6.28), sw: rnd(.3, 1.2) }); }
  if (k === 'fog') { for (let i = 0; i < 6; i++) FX.parts.push({ y: rnd(.1, .95) * H, h: rnd(70, 160), x: rnd(-W, 0), v: rnd(.08, .25), a: rnd(.35, .7) }); }
  if (k === 'clouds') { const n = Math.round(5 * L) + 2; for (let i = 0; i < n; i++) FX.parts.push({ x: rnd(-.3, 1) * W, y: rnd(0, .55) * H, r: rnd(90, 190), v: rnd(.06, .18), a: rnd(.6, .95) }); }
  if (k === 'stars') { for (let i = 0; i < 70; i++) FX.parts.push({ x: rnd(0, W), y: rnd(0, H * .6), r: rnd(.5, 1.6), ph: rnd(0, 6.28), sp: rnd(.6, 2) }); }
}

function frame(ts) {
  if (!FX.kind) { FX.ctx.clearRect(0, 0, FX.w, FX.h); return; }
  const dt = Math.min(3, (ts - (FX.last || ts)) / 16.7); FX.last = ts;
  const g = FX.ctx, W = FX.w, H = FX.h, k = FX.kind, col = FX.col; g.clearRect(0, 0, W, H);
  if (k === 'rain' || k === 'storm') {
    g.strokeStyle = col.rain; g.lineWidth = 1.2; g.lineCap = 'round';
    for (const p of FX.parts) {
      p.y += p.v * dt; p.x -= p.v * .18 * dt; if (p.y > H + 20) { p.y = rnd(-40, -10); p.x = rnd(0, W + 60); }
      g.globalAlpha = p.o; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + p.l * .18, p.y - p.l); g.stroke();
    }
    g.globalAlpha = 1;
    if (k === 'storm') {
      if (FX.flash <= 0 && Math.random() < .0025 * dt) FX.flash = 1;
      if (FX.flash > 0) { g.fillStyle = `rgba(255,255,255,${(FX.flash * .55).toFixed(3)})`; g.fillRect(0, 0, W, H); FX.flash -= .06 * dt; }
    }
  }
  if (k === 'snow') {
    g.fillStyle = col.snow;
    for (const p of FX.parts) {
      p.y += p.v * dt; p.ph += .02 * dt; p.x += Math.sin(p.ph) * p.sw * .6 * dt;
      if (p.y > H + 6) { p.y = -6; p.x = rnd(0, W); } if (p.x < -6) p.x = W + 6; if (p.x > W + 6) p.x = -6;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
    }
  }
  if (k === 'fog') {
    for (const p of FX.parts) {
      p.x += p.v * dt; if (p.x > W) p.x = -W * 1.2;
      const gr = g.createLinearGradient(0, p.y - p.h / 2, 0, p.y + p.h / 2); gr.addColorStop(0, 'transparent'); gr.addColorStop(.5, col.mist); gr.addColorStop(1, 'transparent');
      g.globalAlpha = p.a; g.fillStyle = gr; g.fillRect(p.x, p.y - p.h / 2, W * 2.2, p.h);
    }
    g.globalAlpha = 1;
  }
  if (k === 'clouds') {
    for (const p of FX.parts) {
      p.x += p.v * dt; if (p.x - p.r * 2 > W) p.x = -p.r * 2;
      for (const [dx, dy, s] of [[0, 0, 1], [p.r * .8, p.r * .15, .75], [-p.r * .75, p.r * .2, .7]]) {
        const gr = g.createRadialGradient(p.x + dx, p.y + dy, 0, p.x + dx, p.y + dy, p.r * s); gr.addColorStop(0, col.mist); gr.addColorStop(1, 'transparent');
        g.globalAlpha = p.a; g.fillStyle = gr; g.beginPath(); g.arc(p.x + dx, p.y + dy, p.r * s, 0, 6.283); g.fill();
      }
    }
    g.globalAlpha = 1;
  }
  if (k === 'sun') {
    const t = ts / 1000, R = Math.max(W, H) * .55, cx = W * .92, cy = H * .04;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R * (1 + .04 * Math.sin(t * .8))); gr.addColorStop(0, col.sun); gr.addColorStop(1, 'transparent');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save(); g.translate(cx, cy); g.rotate(t * .03); g.strokeStyle = col.sun; g.lineWidth = 18; g.globalAlpha = .35;
    for (let i = 0; i < 10; i++) { g.rotate(Math.PI / 5); g.beginPath(); g.moveTo(40, 0); g.lineTo(R * .8, 0); g.stroke(); }
    g.restore(); g.globalAlpha = 1;
  }
  if (k === 'stars') {
    g.fillStyle = col.star; const t = ts / 1000;
    for (const p of FX.parts) { g.globalAlpha = .35 + .65 * Math.abs(Math.sin(t * p.sp + p.ph)); g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); }
    g.globalAlpha = 1;
  }
  // With "reduce motion" on, keep a still frame instead of animating
  FX.raf = reduceMotion.matches ? -1 : requestAnimationFrame(frame);
}

function stop() { cancelAnimationFrame(FX.raf); FX.raf = 0; if (FX.ctx) FX.ctx.clearRect(0, 0, FX.w, FX.h); }

export function update() {
  const [k, l] = resolve();
  if (!FX.c) { FX.c = $('fx'); FX.ctx = FX.c.getContext('2d'); resize(); }
  document.documentElement.dataset.wx = k || 'none';
  const lab = $('fx-state'); if (lab) lab.textContent = label();
  if (k === FX.kind && l === FX.level && FX.raf) return;
  stop(); FX.kind = k; FX.level = l;
  // Haze-type effects sit behind the cards so text stays readable; falling ones go on top
  FX.c.style.zIndex = (k === 'rain' || k === 'snow' || k === 'storm') ? '9' : '0';
  if (!k || document.hidden) return;
  FX.col = colors(); seed(); FX.last = 0; FX.raf = requestAnimationFrame(frame);
}
const restart = () => { FX.kind = null; update(); };

export function init() {
  const sel = $('fx-mode');
  if (sel) {
    sel.value = FX.mode;
    sel.addEventListener('change', () => { FX.mode = sel.value; store.set('vie26-fx', FX.mode); restart(); });
  }
  addEventListener('resize', () => { if (!FX.c) return; resize(); if (FX.kind) seed(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else restart(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { FX.col = colors(); });
  reduceMotion.addEventListener('change', restart);
  on('wx', update);
  on('skin', () => { if (FX.kind) FX.col = colors(); });
  update();
}
