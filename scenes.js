/* Evolvlings: card art as lore scenes (sample, v1).
   Each card window shows a moment of the story instead of the attack: 64x48 native pixels
   (the old glyphs were 16x16, so 12x more pixels), Glimmer-32 palette, Savia colours only where
   the scene is about the Savia. Creatures are the real EVS sprites placed in the scene.

   Needs sprites.js loaded first (window.EVS).
   API (window.EVSCENE):
     EVSCENE.art(cardId)            -> 64x48 canvas, or null if the card has no scene yet
     EVSCENE.card(cardId, gradeIdx) -> 80x116 canvas, the new card (frame, band, scene window, text slots)
     EVSCENE.IDS                    -> card ids that have a scene
     EVSCENE.AW, AH, CW, CH         -> sizes
*/
(function (root) {
"use strict";
const EVS = root.EVS;
const P = EVS.P, R = EVS.R;
const SAP = { s0: "#0e0814", s1: "#241030", s2: "#3b1d4a", sheen: "#7dffb0" };
const AW = 64, AH = 48, K = 4; // scene grid 64x48; characters are drawn on top at K times the resolution

/* ---------- pixel buffer ---------- */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + .5) / 16);
const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

class Pic {
  constructor(w, h) { this.w = w; this.h = h; this.a = new Array(w * h).fill(null); }
  p(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.a[y * this.w + x] = c; }
  g(x, y) { x = Math.floor(x); y = Math.floor(y); return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.a[y * this.w + x]; }
  r(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, c); }
  e(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) { const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.p(x, y, c); } }
  // shaded ellipse, light from the top left: ramp = [shadow, base, light, highlight]
  se(cx, cy, rx, ry, ramp, spec = true) {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry, d = dx * dx + dy * dy; if (d > 1) continue;
      const v = -dx * .55 - dy * .75 - d * .35 + bay(x, y) * .3;
      let i = v > .35 ? 2 : v > -.45 ? 1 : 0;
      if (spec && dx < -.2 && dx > -.6 && dy < -.25 && dy > -.65) i = 3;
      this.p(x, y, ramp[i]);
    }
  }
  poly(pts, c) {
    const ys = pts.map((q) => q[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) { const py = y + .5; const xs = [];
      for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= py && by > py) || (by <= py && ay > py)) xs.push(ax + (py - ay) / (by - ay) * (bx - ax)); }
      xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - .5); x < xs[k + 1] - .5; x++) this.p(x, y, typeof c === "function" ? c(x, y) : c); }
  }
  l(x0, y0, x1, y1, c) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy; for (;;) { this.p(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } } }
  // vertical gradient through a list of colours, ordered dither between steps
  grad(x, y, w, h, cols) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const f = (j / Math.max(1, h - 1)) * (cols.length - 1); const k = Math.min(cols.length - 1, Math.floor(f + bay(x + i, y + j))); this.p(x + i, y + j, cols[k]); } }
  // tint already drawn pixels toward c inside a radius (light spill), dithered
  glow(cx, cy, r, c, k = 1, only = null) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x + .5 - cx, (y + .5 - cy) * 1.15) / r; if (d >= 1) continue; const cur = this.g(x, y); if (!cur || (only && !only.includes(cur))) continue; if ((1 - d) * k > bay(x, y)) this.p(x, y, c); } }
  // draw inside a fresh layer, then add a 1 px ink outline around it (like the creatures)
  layer(fn, ink = P.ink) {
    const t = new Pic(this.w, this.h); fn(t);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (t.a[y * this.w + x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const v = t.g(x + a, y + b); return v && v !== ink; })) this.p(x, y, ink);
    }
    for (let i = 0; i < t.a.length; i++) if (t.a[i]) this.a[i] = t.a[i];
  }
  stars(x, y, w, h, n, seed, cols = [P.fog, P.mist, P.cream]) { const r = rng(seed); for (let i = 0; i < n; i++) { const sx = x + Math.floor(r() * w), sy = y + Math.floor(r() * h); this.p(sx, sy, cols[Math.floor(r() * cols.length)]); if (r() < .12) { this.p(sx - 1, sy, P.plum3); this.p(sx + 1, sy, P.plum3); this.p(sx, sy - 1, P.plum3); this.p(sx, sy + 1, P.plum3); this.p(sx, sy, P.cream); } } }
  draw(g, ox = 0, oy = 0) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const c = this.a[y * this.w + x]; if (c) { g.fillStyle = c; g.fillRect(ox + x, oy + y, 1, 1); } } }
}
function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

/* ---------- small people (chibi, same proportions as the NPCs on the map) ----------
   x = centre, y = row under the feet. o.dir 1 faces right, -1 left.
   pose: stand | run | kneel | sit. cloth = [shadow, base, light]. */
function person(pic, x, y, o) {
  const d = o.dir || 1, cl = o.cloth, sk = o.skin || [P.soil2, P.soil3], hr = o.hair || P.plum1;
  const pose = o.pose || "stand";
  const drop = pose === "kneel" ? 3 : pose === "sit" ? 4 : 0;
  const hy = y - 13 + drop, by0 = y - 9 + drop, by1 = y - 3 + (pose === "kneel" ? 1 : drop > 0 ? 1 : 0);
  pic.layer((t) => {
    // legs
    if (pose === "stand") { t.r(x - 2, by1, 2, y - by1, o.leg || cl[0]); t.r(x + 1, by1, 2, y - by1, o.leg || cl[0]); t.r(x - 2, y - 1, 2, 1, P.soil0); t.r(x + 1, y - 1, 2, 1, P.soil0); }
    if (pose === "run") { t.l(x - 1, by1, x - 1 - 3 * d, y - 1, o.leg || cl[0]); t.l(x, by1, x - 3 * d, y - 1, o.leg || cl[0]); t.l(x + 1, by1, x + 3 * d, y - 2, o.leg || cl[0]); t.l(x + 2, by1, x + 4 * d, y - 2, o.leg || cl[0]); t.p(x - 3 * d - (d > 0 ? 1 : 0), y - 1, P.soil0); t.p(x + 4 * d, y - 2, P.soil0); }
    if (pose === "kneel") { t.r(x - 3 * d - (d < 0 ? 1 : 0), y - 2, 5, 2, cl[0]); t.r(x + 1 * d - (d < 0 ? 1 : 0), y - 4, 2, 4, cl[0]); t.p(x - 4 * d, y - 1, P.soil0); }
    if (pose === "sit") { t.r(Math.min(x, x + 5 * d), y - 3, 6, 2, o.leg || cl[0]); t.p(x + 6 * d, y - 3, P.soil0); t.p(x + 6 * d, y - 2, P.soil0); }
    // body: a little trapezoid
    t.poly([[x - 2.5, by0], [x + 2.5, by0], [x + 3.5, by1 + 1], [x - 3.5, by1 + 1]], (px, py) => px < x - 1 ? cl[2] : px > x + 1 ? cl[0] : cl[1]);
    if (o.belt) t.r(x - 3, by0 + 3, 7, 1, o.belt);
    // head
    t.e(x + .5, hy + .5, 3.2, 3.3, sk[1]);
    t.p(x - 2 * d + (d < 0 ? 1 : 0), hy + 2, sk[0]);
    if (o.hood) { t.poly([[x - 3.8, hy + 3], [x - 3.2, hy - 2.4], [x + .5, hy - 4], [x + 4.2, hy - 2.4], [x + 4.6, hy + 3.4]], o.hood); t.e(x + .5 + 1.4 * d, hy + 1.2, 2, 2.2, sk[1]); }
    else if (o.hat) { t.e(x + .5, hy - 2.2, 5.6, 2, o.hat[1]); t.r(x - 4, hy - 1, 9, 1, o.hat[0]); t.p(x - 2, hy - 3, o.hat[2] || P.cream); t.p(x + 2, hy - 2, o.hat[2] || P.cream); }
    else { t.e(x + .5 - .8 * d, hy - 1, 3.4, 2.3, hr); if (o.long) t.r(x - (d > 0 ? 3 : -1), hy, 3, 5, hr); else t.r(x - (d > 0 ? 3 : 0), hy, 3, 2, hr); }
  });
  // face on top of the outline pass
  const ex = x + (d > 0 ? 2 : -1);
  if (o.closed) { pic.p(ex, hy + 1, P.ink); pic.p(ex - d, hy + 1, P.ink); } else pic.p(ex, hy + 1, P.ink);
  if (o.blush !== false) pic.p(ex + (d > 0 ? 0 : 0), hy + 2, P.rose2);
  return { hand: [x + 3 * d, by0 + 3], head: [x, hy], d };
}

/* ---------- placing EVS creature sprites ---------- */
function spr(g, kind, n, x, y, o = {}) {
  const c = EVS.sprite(kind, n, o.st == null ? 1 : o.st, o.sq || 0, o.emo || "normal", !!o.dull, o.dir || "front");
  g.save(); g.imageSmoothingEnabled = false;
  if (o.rim) { const t = canvas(c.width, c.height), tg = t.getContext("2d"); tg.drawImage(c, 0, 0); tg.globalCompositeOperation = "source-in"; tg.fillStyle = o.rim; tg.fillRect(0, 0, t.width, t.height);
    (o.rimDirs || [[1, 0], [-1, 0], [0, 1], [0, -1]]).forEach(([a, b2]) => { if (o.flip) { g.save(); g.translate(x + c.width + a, y + b2); g.scale(-1, 1); g.drawImage(t, 0, 0); g.restore(); } else g.drawImage(t, x + a, y + b2); }); }
  if (o.flip) { g.translate(x + c.width, y); g.scale(-1, 1); g.drawImage(c, 0, 0); } else g.drawImage(c, x, y);
  g.restore();
}
function compose(layers) {
  const c = canvas(AW, AH), g = c.getContext("2d");
  layers.forEach((L) => (L instanceof Pic ? L.draw(g) : L(g)));
  return c;
}
// a music note (2x2 head + stem), used by the duet
function note(pic, x, y, c, flag = true) { pic.r(x, y, 2, 2, c); pic.l(x + 2, y + 1, x + 2, y - 3, c); if (flag) { pic.p(x + 3, y - 3, c); pic.p(x + 3, y - 2, c); } }
function dropUp(pic, x, y) { pic.r(x, y, 2, 2, SAP.s2); pic.p(x, y, SAP.sheen); pic.p(x, y + 2, SAP.s1); pic.p(x + 1, y + 2, SAP.s2); pic.p(x + 1, y + 3, SAP.s1); pic.p(x + 1, y + 5, SAP.s1); }

function hd(b, fn) {
  const c = canvas(AW * K, AH * K), g = c.getContext("2d");
  const small = canvas(AW, AH); b.draw(small.getContext("2d"));
  g.imageSmoothingEnabled = false; g.drawImage(small, 0, 0, AW * K, AH * K);
  g.save(); g.scale(K, K); g.lineJoin = "round"; g.lineCap = "round"; fn(g); g.restore();
  return c;
}

const SCENE = {};
/* ================= Hand-drawn characters =================
   People and creatures are drawn as smooth shapes on top of the pixel background, at K times the
   resolution: dark tapered ink line, flat fill with one hard shadow cut (light from the top left),
   pale faces, thin limbs, pointed cloth hems. A soft halo in a colour the background lacks
   (rim) keeps each figure apart from the scenery. Units are scene pixels (64x48), fractions allowed. */
const HD = (() => {
  const LW = .34; // ink line, in scene pixels (about 1.4 px on screen)
  const pth = (g, f) => { g.beginPath(); f(g); };
  const E = (g, cx, cy, rx, ry, rot = 0) => g.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
  // closed smooth curve through points
  const blob = (g, pts) => { const n = pts.length; const m = (i) => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    const s = m(n - 1); g.moveTo(s[0], s[1]); for (let i = 0; i < n; i++) { const q = m(i); g.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); } g.closePath(); };
  // polygon with sharp corners
  const poly = (g, pts) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
  // fill + hard shadow + ink, with optional halo behind
  function shape(g, f, o) {
    g.save();
    if (o.rim) { pth(g, f); g.shadowColor = o.rim; g.shadowBlur = o.rimB || 10; g.fillStyle = o.rim; g.globalAlpha = o.rimA || .55; g.fill(); g.restore(); g.save(); }
    pth(g, f); g.fillStyle = o.fill; if (o.alpha) g.globalAlpha = o.alpha; g.fill(); g.globalAlpha = 1;
    if (o.shade) { g.save(); pth(g, f); g.clip(); g.fillStyle = o.shade; g.fillRect(-500, -500, 1000, 1000); g.translate(-(o.sx == null ? .9 : o.sx), -(o.sy == null ? .7 : o.sy)); pth(g, f); g.fillStyle = o.fill; g.fill(); g.restore(); }
    if (o.light) { g.save(); pth(g, f); g.clip(); g.translate(o.lx || .7, o.ly || .7); g.beginPath(); g.rect(-500, -500, 1000, 1000); f(g); g.fillStyle = o.light; g.fill("evenodd"); g.restore(); }
    if (o.ink !== false) { pth(g, f); g.strokeStyle = o.ink || P.ink; g.lineWidth = o.lw || LW; g.stroke(); }
    g.restore();
  }
  // tapered limb: thick at a, thin at b, ink outline
  function limb(g, pts, w0, w1, col, o = {}) {
    const n = pts.length, L = [], R2 = [];
    for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; const w = (w0 + (w1 - w0) * i / (n - 1)) / 2; L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); R2.push([pts[i][0] + dy * w, pts[i][1] - dx * w]); }
    const all = L.concat(R2.reverse());
    shape(g, (gg) => poly(gg, all), { fill: col, rim: o.rim, rimB: o.rimB, lw: o.lw || LW * .85 });
  }
  const dot = (g, x, y, r, c) => { g.beginPath(); E(g, x, y, r, r); g.fillStyle = c; g.fill(); };
  const stroke = (g, f, c, w) => { g.beginPath(); f(g); g.strokeStyle = c; g.lineWidth = w; g.stroke(); };
  function eye(g, x, y, d, emo, big = .55) {
    if (emo === "closed") { stroke(g, (gg) => { gg.moveTo(x - .5, y); gg.quadraticCurveTo(x, y + .45, x + .5, y); }, P.ink, .28); return; }
    g.beginPath(); E(g, x, y, big * .62, big); g.fillStyle = P.ink; g.fill();
    dot(g, x - .15 + d * .12, y - .2, big * .22, P.cream);
  }

  // ---- Tila: purple dress, dark long hair, oil-stained hands ----
  const TILA = { dress: P.glim0, dressSh: P.plum2, hair: P.plum1, hairSh: P.ink, skin: P.cream, skinSh: P.fog, leg: P.plum1 };
  function head(g, x, y, d, hairPts, o) {
    shape(g, (gg) => blob(gg, hairPts), { fill: o.hair, shade: o.hairSh, rim: o.rim, rimB: 8 });
    shape(g, (gg) => E(gg, x + d * .35, y + .2, 2.3, 2.45), { fill: o.skin, shade: o.skinSh, sx: -d * .7, sy: .6 });
  }
  function tilaRun(g, x, y) {
    const T = TILA, rim = P.sea3;
    // back leg and arm
    limb(g, [[x - .6, y - 6.2], [x - 2.4, y - 3.4], [x - 4.6, y - 1.6]], 1.1, .7, T.leg, { rim, rimB: 6 });
    limb(g, [[x - .6, y - 10.4], [x - 2.4, y - 8.6], [x - 3.6, y - 9.6]], .9, .7, T.dressSh);
    // hair streaming back
    const hx = x + .3, hy = y - 14.6;
    shape(g, (gg) => blob(gg, [[hx - 2.4, hy - 2.2], [hx + 1.6, hy - 2.9], [hx + 2.6, hy - .6], [hx + .4, hy + .4], [hx - 1.4, hy + 3.4], [hx - 4.8, hy + 4.2], [hx - 7.2, hy + 3], [hx - 4.4, hy + 1.6], [hx - 3.2, hy - .2]]), { fill: T.hair, shade: T.hairSh, rim, rimB: 8 });
    // dress, flaring back with pointed hems
    shape(g, (gg) => poly(gg, [[x - 1.5, y - 11.4], [x + 1.6, y - 11.4], [x + 2.4, y - 8.4], [x + 3.4, y - 5.4], [x + 1.2, y - 6.1], [x - .4, y - 5], [x - 2.4, y - 5.8], [x - 5.4, y - 4.6], [x - 3.2, y - 7.6]]), { fill: T.dress, shade: T.dressSh, light: P.glim1, rim, rimB: 8 });
    stroke(g, (gg) => { gg.moveTo(x - 2.1, y - 8.7); gg.lineTo(x + 2.3, y - 8.7); }, P.ember1, .55);
    // front leg
    limb(g, [[x + .6, y - 6.2], [x + 2.6, y - 4.4], [x + 3.4, y - 2]], 1.1, .7, T.leg);
    shape(g, (gg) => E(gg, x + 3.9, y - 1.8, .9, .55, .3), { fill: P.soil0, lw: .25 });
    shape(g, (gg) => E(gg, x - 4.9, y - 1.5, .9, .55, -.3), { fill: P.soil0, lw: .25 });
    // face
    shape(g, (gg) => E(gg, hx + .5, hy + .3, 2.2, 2.35), { fill: T.skin, shade: T.skinSh, sx: -.6, sy: .7 });
    shape(g, (gg) => blob(gg, [[hx - 2, hy - .2], [hx - .6, hy - 2.3], [hx + 2.4, hy - 1.9], [hx + 1.4, hy - 1.1], [hx - .4, hy - .4]]), { fill: T.hair, lw: .25 });
    eye(g, hx + 1.4, hy + .3, 1, "open", .5);
    dot(g, hx + 1.2, hy + 1.3, .4, P.rose2);
    // front arm and the can
    limb(g, [[x + .7, y - 10.6], [x + 2.4, y - 9], [x + 4.2, y - 8.6]], .95, .75, T.dress);
    const cx = x + 4.6, cy = y - 9.4;
    shape(g, (gg) => { gg.moveTo(cx + 3.6, cy + 1.2); gg.lineTo(cx + 5.6, cy - .6); gg.lineTo(cx + 5.8, cy); gg.lineTo(cx + 3.6, cy + 2); gg.closePath(); }, { fill: P.mist, lw: .25 });
    shape(g, (gg) => { gg.roundRect(cx, cy, 4, 4.6, .8); }, { fill: P.mist, shade: P.plum3, light: P.fog, rim: P.ember3, rimB: 6, rimA: .35 });
    stroke(g, (gg) => { gg.arc(cx + 2, cy, 1.5, Math.PI, 0); }, P.ink, .35);
    dot(g, cx + 6, cy + .6, .35, P.butter); dot(g, cx + 6.1, cy + 2, .3, P.ember4);
    dot(g, x + 4.2, y - 8.6, .55, T.skin);
  }
  function tilaSit(g, x, y) {
    const T = TILA, rim = P.cream;
    // legs forward over the stone
    limb(g, [[x - .4, y - 4], [x + 3.4, y - 3.6], [x + 5.2, y - 1.4]], 1.2, .8, T.leg, { rim, rimB: 6 });
    // dress
    shape(g, (gg) => poly(gg, [[x - 1.4, y - 10.4], [x + 1.4, y - 10.4], [x + 2.4, y - 6.6], [x + 3.6, y - 3.4], [x + .6, y - 3.8], [x - 1.8, y - 3], [x - 3.6, y - 3.6], [x - 2.4, y - 6.6]]), { fill: T.dress, shade: T.dressSh, light: P.glim1, rim, rimB: 8 });
    // hair down the back
    const hx = x + .2, hy = y - 13.4;
    shape(g, (gg) => blob(gg, [[hx - 2.4, hy - 2.2], [hx + 1.6, hy - 2.9], [hx + 2.6, hy - .6], [hx + .4, hy + .6], [hx - 1.2, hy + 4.6], [hx - 2.8, hy + 6.2], [hx - 3.6, hy + 3], [hx - 3, hy - .2]]), { fill: T.hair, shade: T.hairSh, rim, rimB: 8 });
    // face turned up a little, singing
    shape(g, (gg) => E(gg, hx + .6, hy + .1, 2.2, 2.35, -.15), { fill: T.skin, shade: T.skinSh, sx: -.6, sy: .7 });
    shape(g, (gg) => blob(gg, [[hx - 2, hy - .4], [hx - .6, hy - 2.4], [hx + 2.4, hy - 2.1], [hx + 1.4, hy - 1.2], [hx - .4, hy - .6]]), { fill: T.hair, lw: .25 });
    eye(g, hx + 1.5, hy - .1, 1, "closed");
    shape(g, (gg) => E(gg, hx + 2.3, hy + 1.3, .38, .5), { fill: P.ember1, lw: .2 });
    dot(g, hx + 1.2, hy + 1, .38, P.rose2);
    // arm resting on the lantern
    limb(g, [[x - .6, y - 9.4], [x - 2.4, y - 7.4], [x - 3.6, y - 6.4]], .95, .75, T.dress);
    // the lantern beside her
    const lx = x - 6.4, ly = y - 7.6;
    shape(g, (gg) => gg.roundRect(lx, ly, 3, 4.2, .6), { fill: P.butter, light: P.cream, rim: P.ember4, rimB: 14, rimA: .9 });
    stroke(g, (gg) => { gg.moveTo(lx - .3, ly); gg.lineTo(lx + 3.3, ly); gg.moveTo(lx - .3, ly + 4.2); gg.lineTo(lx + 3.3, ly + 4.2); gg.moveTo(lx + 1.5, ly); gg.lineTo(lx + 1.5, ly - 1.2); }, P.plum2, .5);
    dot(g, lx + 1.5, ly + 2.3, .55, P.ember3);
  }

  // ---- Nim: shy bat of the Shadow folk, wings folded like a cloak ----
  function nimSit(g, x, y, o = {}) {
    const d = o.dir || 1, rim = o.rim || P.glim1, X = (v) => x + v * d;
    // ears
    [[-1.6, -.3], [1.2, .3]].forEach(([ox, r]) => shape(g, (gg) => poly(gg, [[X(ox - 1), y - 10.6], [X(ox + .2 + r), y - 15.2], [X(ox + 1.3), y - 10.2]]), { fill: P.plum2, shade: P.plum1, rim, rimB: 8 }));
    // body + folded wings with pointed tips
    shape(g, (gg) => blob(gg, [[X(-3.6), y - 7], [X(-2.6), y - 10.6], [X(2.4), y - 11], [X(3.8), y - 7.4], [X(3.4), y - 3], [X(4.6), y - .4], [X(1.6), y - 1.2], [X(0), y - .2], [X(-1.8), y - 1.2], [X(-4.8), y - .2], [X(-3.8), y - 3]]), { fill: P.plum2, shade: P.plum1, light: P.plum3, sx: .9 * d, rim, rimB: 10 });
    // wing fingers
    stroke(g, (gg) => { gg.moveTo(X(-3), y - 6.6); gg.lineTo(X(-1.6), y - 1.2); gg.moveTo(X(3.2), y - 6.8); gg.lineTo(X(1.6), y - 1.2); }, P.plum1, .35);
    // pale face mask
    shape(g, (gg) => blob(gg, [[X(-1.4), y - 9.4], [X(1.8), y - 9.6], [X(2.6), y - 7.6], [X(.8), y - 5.6], [X(-1), y - 6.4]]), { fill: P.fog, shade: P.mist, sx: -.5 * d, lw: .25 });
    if (o.emo === "sad") { eye(g, X(.2), y - 8, d, "open", .55); eye(g, X(1.9), y - 8, d, "open", .45); stroke(g, (gg) => { gg.moveTo(X(-.4), y - 9.1); gg.lineTo(X(.8), y - 8.8); }, P.ink, .2); }
    else { eye(g, X(.2), y - 8, d, "closed"); eye(g, X(1.9), y - 8, d, "closed"); shape(g, (gg) => E(gg, X(1.2), y - 6.6, .5, .55), { fill: P.ember1, lw: .2 }); }
    // little feet
    shape(g, (gg) => E(gg, X(-1), y - .2, .8, .45), { fill: P.plum1, lw: .25 }); shape(g, (gg) => E(gg, X(1.2), y - .2, .8, .45), { fill: P.plum1, lw: .25 });
  }

  // ---- Mecha: a candle creature, wax body, live flame ----
  function mecha(g, x, y, o = {}) {
    shape(g, (gg) => E(gg, x - 1.6, y - .4, 1.1, .6), { fill: P.soil3, lw: .25 }); shape(g, (gg) => E(gg, x + 1.6, y - .4, 1.1, .6), { fill: P.soil3, lw: .25 });
    shape(g, (gg) => blob(gg, [[x - 3.2, y - 2], [x - 3.4, y - 8], [x - 1.4, y - 9.6], [x + 1.6, y - 9.6], [x + 3.4, y - 8.2], [x + 3.2, y - 1.6], [x, y - .6]]), { fill: P.butter, shade: P.soil3, light: P.cream, rim: o.rim, rimB: 10 });
    // wax drip
    shape(g, (gg) => blob(gg, [[x - 2.8, y - 9], [x - 1.6, y - 9.4], [x - 1.6, y - 6.4], [x - 2.2, y - 5.2], [x - 2.8, y - 6.6]]), { fill: P.cream, lw: .2 });
    stroke(g, (gg) => { gg.moveTo(x, y - 9.6); gg.lineTo(x + .2, y - 10.8); }, P.ink, .35);
    // flame
    shape(g, (gg) => blob(gg, [[x + .2, y - 16], [x + 1.8, y - 12.4], [x + 1.2, y - 10.6], [x - .9, y - 10.6], [x - 1.4, y - 12.4]]), { fill: P.ember3, shade: P.ember2, light: P.ember4, rim: P.ember4, rimB: 16, rimA: .8, lw: .28 });
    shape(g, (gg) => blob(gg, [[x + .2, y - 13.6], [x + .8, y - 11.8], [x - .4, y - 11.2], [x - .5, y - 12.2]]), { fill: P.butter, ink: false });
    if (o.emo === "surprised") { eye(g, x - 1, y - 6.4, 1, "open", .6); eye(g, x + 1.4, y - 6.4, 1, "open", .6); shape(g, (gg) => E(gg, x + .2, y - 4.4, .45, .6), { fill: P.ember0, lw: .2 }); }
  }

  // ---- Orilla: kneeling at the shore, dark blue shawl, long black hair ----
  function orilla(g, x, y) {
    const rim = P.ember3;
    // shawl body (kneeling, seen from behind three quarters)
    shape(g, (gg) => poly(gg, [[x - 1.8, y - 9.4], [x + 1.4, y - 9.6], [x + 2.6, y - 6], [x + 3.8, y - 2.6], [x + 1, y - .2], [x - 3.4, y], [x - 5, y - 1.2], [x - 3.6, y - 4.4]]), { fill: P.sea1, shade: P.sea0, light: P.sea2, rim, rimB: 10 });
    stroke(g, (gg) => { gg.moveTo(x - 3, y - 4.6); gg.lineTo(x - 1, y - 2.2); gg.moveTo(x - .2, y - 5.6); gg.lineTo(x + 1.2, y - 2.4); }, P.sea0, .3);
    // hair: long, falling over the back
    const hx = x + .2, hy = y - 12;
    shape(g, (gg) => blob(gg, [[hx - 2.4, hy - 2.2], [hx + 1.6, hy - 2.8], [hx + 2.6, hy - .6], [hx + 1.2, hy + .6], [hx, hy + 3], [hx - 1, hy + 7.6], [hx - 2.6, hy + 7], [hx - 3.2, hy + 2]]), { fill: P.ink, shade: P.ink, light: P.plum2, rim, rimB: 8, ink: P.plum1 });
    shape(g, (gg) => blob(gg, [[hx + .6, hy - 1.6], [hx + 2.4, hy - .8], [hx + 2.6, hy + 1.2], [hx + 1.4, hy + 2.2], [hx + .4, hy + .8]]), { fill: P.cream, shade: P.fog, sx: -.4, lw: .25 });
    eye(g, hx + 2, hy + .3, 1, "closed");
    // arm out, setting the boat afloat
    limb(g, [[x + 1.2, y - 7.6], [x + 4, y - 5.4], [x + 6.6, y - 3.4]], 1, .7, P.sea1, { rim, rimB: 6 });
    dot(g, x + 6.8, y - 3.2, .55, P.cream);
  }
  // ---- Vidriela: a glass fish with the lake inside it ----
  function vidriela(g, x, y) {
    const cx = x, cy = y - 4.6;
    [[-.6, -1.4], [.6, 1.4]].forEach(([r, oy]) => shape(g, (gg) => E(gg, cx - 5.4, cy + oy, 1.2, 2.2, r), { fill: P.sea3, alpha: .85, lw: .28 }));
    shape(g, (gg) => blob(gg, [[cx - 1.2, cy - 4.4], [cx + .6, cy - 6.4], [cx + 1.6, cy - 4.2]]), { fill: P.sea4, lw: .28 });
    shape(g, (gg) => E(gg, cx, cy, 5, 4.4), { fill: P.sea3, alpha: .9, shade: P.sea2, light: P.sea4, sx: -.9, rim: P.ember3, rimB: 10, rimA: .45 });
    g.save(); g.beginPath(); E(g, cx, cy, 4.8, 4.2); g.clip(); g.fillStyle = P.sea1; g.globalAlpha = .7; g.fillRect(cx - 6, cy + 1.6, 12, 4); g.globalAlpha = 1; stroke(g, (gg) => { gg.moveTo(cx - 5, cy + 1.6); gg.lineTo(cx + 5, cy + 1.6); }, P.sea0, .3); g.restore();
    stroke(g, (gg) => gg.arc(cx - 1, cy - 1, 2.8, Math.PI * 1.1, Math.PI * 1.45), P.cream, .45);
    eye(g, cx + 2.2, cy - .8, 1, "open", .55);
    stroke(g, (gg) => { gg.moveTo(cx + 2.6, cy + .5); gg.quadraticCurveTo(cx + 3.2, cy + .2, cx + 3.6, cy + .6); }, P.ink, .25);
  }

  // ---- Relampín: messenger fox of the Heights, zigzag tail, scroll in its mouth ----
  function relampin(g, x, y) {
    const rim = P.cream;
    // tail
    shape(g, (gg) => poly(gg, [[x - 2.6, y - 3], [x - 5.4, y - 5], [x - 4, y - 6.4], [x - 7, y - 9.6], [x - 5, y - 9.6], [x - 3.2, y - 6.8], [x - 4.2, y - 5.6], [x - 1.8, y - 4.4]]), { fill: P.butter, shade: P.ember4, rim: P.ember4, rimB: 10, rimA: .7, lw: .3 });
    // legs
    [-1.4, 1.6].forEach((ox) => limb(g, [[x + ox, y - 3], [x + ox + .3, y - .4]], 1, .8, P.soil1));
    // body
    shape(g, (gg) => E(gg, x, y - 3.8, 3.6, 2.6, -.15), { fill: P.soil2, shade: P.soil1, light: P.soil3, rim, rimB: 8 });
    // ears
    [[1.2, 0], [3.8, .3]].forEach(([ox, r]) => shape(g, (gg) => poly(gg, [[x + ox - 1, y - 10.4], [x + ox + r, y - 14], [x + ox + 1.2, y - 10]]), { fill: P.soil2, shade: P.soil1, rim, rimB: 6 }));
    // head
    shape(g, (gg) => blob(gg, [[x - .4, y - 9.6], [x + 1.6, y - 11.6], [x + 4.6, y - 11], [x + 5.6, y - 8.4], [x + 7.4, y - 7.4], [x + 5, y - 6], [x + 1.6, y - 5.8], [x, y - 7.2]]), { fill: P.soil2, shade: P.soil1, light: P.soil3, rim, rimB: 8 });
    shape(g, (gg) => blob(gg, [[x + 3.4, y - 8.2], [x + 5.6, y - 8.4], [x + 7.2, y - 7.4], [x + 5, y - 6.2], [x + 3, y - 6.8]]), { fill: P.cream, lw: .2 });
    dot(g, x + 7.2, y - 7.6, .45, P.ink);
    eye(g, x + 3.8, y - 9.2, 1, "open", .55);
    // the sealed scroll, held out in its mouth
    const sx = x + 6.4, sy = y - 7.4;
    shape(g, (gg) => gg.rect(sx, sy - 1.1, 5.4, 2.2), { fill: P.cream, shade: P.fog, sy: .5, sx: 0, lw: .3 });
    [sx - .2, sx + 5.6].forEach((rx) => shape(g, (gg) => E(gg, rx, sy, .5, 1.5), { fill: P.soil3, lw: .25 }));
    shape(g, (gg) => E(gg, sx + 2.7, sy, .9, .9), { fill: P.ember1, lw: .22 });
    dot(g, sx + 2.7, sy - .1, .35, P.ember4);
  }
  // ---- the buyer: hooded cloak, no face, two lamp-coloured eyes, a thin pale hand with coins ----
  function buyer(g, x, y) {
    const rim = P.cream;
    shape(g, (gg) => poly(gg, [[x - 2.2, y - 13.6], [x + .4, y - 16.6], [x + 2.8, y - 13.4], [x + 3.4, y - 7], [x + 4.4, y], [x + 1.6, y - 1], [x - .4, y + .2], [x - 2.4, y - .8], [x - 4.8, y], [x - 3.4, y - 7]]), { fill: P.plum2, shade: P.plum1, light: P.plum3, sx: -.9, rim, rimB: 10 });
    shape(g, (gg) => blob(gg, [[x - 1.6, y - 13], [x + .4, y - 14.4], [x + 2, y - 12.8], [x + 1.2, y - 10.6], [x - 1, y - 10.8]]), { fill: P.ink, ink: false });
    dot(g, x - .6, y - 12.6, .38, P.butter); dot(g, x + .9, y - 12.6, .38, P.butter);
    // arm out to the left with the pouch
    limb(g, [[x - 2, y - 9.6], [x - 4.8, y - 9], [x - 7.4, y - 9.6]], .8, .45, P.fog);
    shape(g, (gg) => blob(gg, [[x - 9.6, y - 11.2], [x - 7.8, y - 11.6], [x - 7, y - 9.4], [x - 8.4, y - 8.2], [x - 10.2, y - 9.2]]), { fill: P.soil2, shade: P.soil1, lw: .28 });
    stroke(g, (gg) => { gg.moveTo(x - 9.2, y - 11.2); gg.lineTo(x - 8.2, y - 11.4); }, P.ember1, .35);
    [[-12.4, -10.6], [-14.6, -12], [-16.4, -11.4]].forEach(([ox, oy]) => { shape(g, (gg) => E(gg, x + ox, y + oy, .7, .7), { fill: P.ember4, shade: P.ember3, sx: -.3, sy: -.3, rim: P.butter, rimB: 6, lw: .22 }); });
  }

  // ---- Esporina: wide mushroom hat, rose shawl, sickle and basket ----
  function esporina(g, x, y) {
    const rim = P.sea2;
    // basket
    shape(g, (gg) => { gg.moveTo(x + 2, y - 5); gg.lineTo(x + 7.4, y - 5); gg.lineTo(x + 6.6, y - .4); gg.lineTo(x + 2.8, y - .4); gg.closePath(); }, { fill: P.soil2, shade: P.soil1, rim, rimB: 6 });
    stroke(g, (gg) => { gg.moveTo(x + 2.6, y - 3.4); gg.lineTo(x + 7, y - 3.4); gg.moveTo(x + 2.8, y - 2); gg.lineTo(x + 6.8, y - 2); }, P.soil1, .3);
    [[3.8, -5.6, 1.3], [5.8, -5.4, 1.1]].forEach(([ox, oy, r]) => shape(g, (gg) => E(gg, x + ox, y + oy, r, r * .6), { fill: SAP.s1, lw: .22 }));
    stroke(g, (gg) => gg.arc(x + 4.7, y - 5, 2.8, Math.PI, 0), P.soil1, .35);
    // kneeling body
    shape(g, (gg) => poly(gg, [[x - 1.6, y - 9.4], [x + 1.8, y - 9.6], [x + 2.8, y - 5], [x + 3.2, y - .2], [x - 1, y], [x - 4.8, y - .4], [x - 3.6, y - 2.6], [x - 2.6, y - 5.6]]), { fill: P.rose1, shade: P.rose0, light: P.rose2, sx: .9, rim, rimB: 10 });
    // arm forward with the sickle
    limb(g, [[x - 1, y - 8.2], [x - 3.4, y - 6.4], [x - 5.2, y - 5.2]], .95, .7, P.rose0);
    stroke(g, (gg) => { gg.moveTo(x - 5.4, y - 5.2); gg.lineTo(x - 5.6, y - 3.2); }, P.soil1, .55);
    shape(g, (gg) => { gg.arc(x - 7.8, y - 6.2, 2.8, -1.1, 1.4, false); gg.arc(x - 7.4, y - 6.4, 2.1, 1.3, -1, true); gg.closePath(); }, { fill: P.fog, light: P.cream, lw: .25 });
    // face
    const hx = x - .2, hy = y - 11.4;
    shape(g, (gg) => E(gg, hx, hy + .2, 2.1, 2.2), { fill: P.cream, shade: P.fog, sx: .6, sy: .6 });
    eye(g, hx - 1, hy + .4, -1, "open", .5);
    dot(g, hx - .8, hy + 1.4, .38, P.rose2);
    // the hat: wide cap with spots
    shape(g, (gg) => blob(gg, [[hx - 5.6, hy - .6], [hx - 3.4, hy - 3.8], [hx + .2, hy - 4.8], [hx + 3.8, hy - 3.6], [hx + 5.6, hy - .4], [hx, hy - 1.2]]), { fill: P.rose1, shade: P.rose0, light: P.rose2, rim, rimB: 10 });
    [[-2.6, -2.4, .55], [.6, -3.6, .5], [2.8, -2, .45]].forEach(([ox, oy, r]) => dot(g, hx + ox, hy + oy, r, P.cream));
  }
  // ---- Capuchón: hermit crab wearing a mushroom ----
  function capuchon(g, x, y) {
    const rim = P.sea3;
    [[-4.4, -2.2], [4.6, -2.2]].forEach(([ox, oy]) => shape(g, (gg) => blob(gg, [[x + ox - 1.4, y + oy], [x + ox, y + oy - 1.6], [x + ox + 1.4, y + oy - .4], [x + ox + .4, y + oy + .8]]), { fill: P.ember2, shade: P.ember1, rim, rimB: 6 }));
    [-2.4, -.8, .8, 2.4].forEach((ox) => stroke(g, (gg) => { gg.moveTo(x + ox, y - 2); gg.lineTo(x + ox * 1.3, y); }, P.ember1, .45));
    shape(g, (gg) => E(gg, x, y - 3, 3.6, 2.4), { fill: P.ember2, shade: P.ember1, light: P.rose2, rim, rimB: 8 });
    shape(g, (gg) => gg.rect(x - 1.8, y - 7.4, 3.6, 3.2), { fill: P.cream, shade: P.fog, lw: .28 });
    shape(g, (gg) => blob(gg, [[x - 6.4, y - 6.6], [x - 4.4, y - 10.6], [x, y - 12], [x + 4.4, y - 10.6], [x + 6.4, y - 6.6], [x, y - 7.2]]), { fill: P.rose1, shade: P.rose0, light: P.rose2, rim, rimB: 10 });
    [[-3, -9, .7], [1, -10.4, .6], [3.6, -8.4, .55], [-.8, -8.2, .45]].forEach(([ox, oy, r]) => dot(g, x + ox, y + oy, r, P.cream));
    eye(g, x - 1.1, y - 3.4, 1, "open", .5); eye(g, x + 1.3, y - 3.4, 1, "open", .5);
    stroke(g, (gg) => { gg.moveTo(x - .5, y - 2.1); gg.quadraticCurveTo(x + .2, y - 1.5, x + .8, y - 2.1); }, P.ink, .25);
  }
  return { LW, pth, shape, limb, blob, poly, E, dot, stroke, eye, tilaRun, tilaSit, nimSit, mecha, orilla, vidriela, relampin, buyer, esporina, capuchon };
})();

/* ================= Generic folk and the rest of the creatures =================
   Everything here is drawn at the origin facing right, feet on y = 0, then placed with at().
   o.dir -1 mirrors, o.s scales (1 = an adult about 16 scene px tall). */
Object.assign(HD, (() => {
  const { shape, limb, blob, poly, E, dot, stroke, eye } = HD;
  const at = (g, x, y, o, fn) => { g.save(); g.translate(x, y); g.scale((o.dir || 1) * (o.s || 1), o.s || 1); fn(g); g.restore(); };
  const SKIN = { day: [P.cream, P.fog], night: [P.fog, P.mist], frost: [P.sea4, P.fog], ember: [P.soil3, P.soil2], stone: [P.soil3, P.soil2] };

  /* folk: o = { pose: stand|walk|run|kneel|sit, cloth: [base, shade, light], robe, skin, hair, hairStyle: long|short|bun|none,
     hat: { k: hood|wide|crown|helmet|cap|scarf, c: [base, shade] }, beard, apron, belt, emo: open|closed|sad, sing,
     front: [x, y] / back: [x, y] hand targets (local), hold(g, hx, hy) item in the front hand, rim } */
  function folk(g, x, y, o) {
    at(g, x, y, o, (g) => {
      const pose = o.pose || "stand", cl = o.cloth || [P.sea1, P.sea0, P.sea2], sk = o.skin || SKIN.day, rim = o.rim, hc = o.hair || P.plum1;
      const HY = { stand: -14.4, walk: -14.4, run: -14.6, kneel: -11.4, sit: -13.4 }[pose], hx = .3, hy = HY;
      const legC = o.leg || cl[1];
      // legs
      if (!o.robe || pose === "sit") {
        if (pose === "stand") { limb(g, [[-.8, -4.6], [-.9, -.4]], 1.1, .8, legC, { rim }); limb(g, [[.9, -4.6], [1.1, -.4]], 1.1, .8, legC, { rim }); }
        if (pose === "walk") { limb(g, [[-.6, -4.6], [-2.2, -.4]], 1.1, .8, legC, { rim }); limb(g, [[.6, -4.6], [2.3, -.4]], 1.1, .8, legC, { rim }); }
        if (pose === "run") { limb(g, [[-.6, -6.2], [-2.4, -3.4], [-4.6, -1.6]], 1.1, .7, legC, { rim }); }
        if (pose === "sit") limb(g, [[-.4, -4], [3.4, -3.6], [5.2, -1.4]], 1.2, .8, legC, { rim });
        const feet = { stand: [[-1, -.3], [1.3, -.3]], walk: [[-2.4, -.3], [2.6, -.3]], run: [[-4.9, -1.5]], sit: [[5.4, -1.2]], kneel: [] }[pose];
        feet.forEach(([fx, fy]) => shape(g, (gg) => E(gg, fx + .3, fy, .9, .5), { fill: P.soil0, lw: .22 }));
      }
      // back arm
      if (o.back) limb(g, [[-.5, -10.4 + (HY + 14.4)], [o.back[0] * .5 - .6, (o.back[1] + HY + 4) * .5], o.back], .9, .7, cl[1]);
      // long hair behind
      if ((o.hairStyle || "short") === "long" && !(o.hat && o.hat.k === "hood")) shape(g, (gg) => blob(gg, [[hx - 2.4, hy - 2.2], [hx + 1.6, hy - 2.9], [hx + 2.6, hy - .6], [hx + .4, hy + .6], [hx - 1.2, hy + 4.6], [hx - 2.8, hy + 5.6], [hx - 3.6, hy + 3], [hx - 3, hy - .2]]), { fill: hc, shade: P.ink, rim, rimB: 8 });
      if (o.hat && o.hat.k === "hood") shape(g, (gg) => poly(gg, [[hx - 3.2, hy + 2.6], [hx - 3.4, hy - 1.4], [hx - 1, hy - 3.6], [hx + 2.2, hy - 3.4], [hx + 3.4, hy - .6], [hx + 2.6, hy + 2.8]]), { fill: o.hat.c[0], shade: o.hat.c[1], rim, rimB: 8 });
      // body
      const B = {
        stand: o.robe ? [[-1.5, -11.4], [1.6, -11.4], [2.6, -6], [3.4, -.3], [-3.2, -.3], [-2.6, -6]] : [[-1.5, -11.4], [1.6, -11.4], [2.4, -7.5], [3, -4], [-2.9, -4], [-2.4, -7.5]],
        walk: o.robe ? [[-1.5, -11.4], [1.6, -11.4], [2.8, -6], [3.8, -.3], [-3.4, -.3], [-2.6, -6]] : [[-1.5, -11.4], [1.6, -11.4], [2.4, -7.5], [3.2, -4], [-3, -4], [-2.4, -7.5]],
        run: [[-1.5, -11.4], [1.6, -11.4], [2.4, -8.4], [3.4, -5.4], [1.2, -6.1], [-.4, -5], [-2.4, -5.8], [-5.4, -4.6], [-3.2, -7.6]],
        kneel: [[-1.6, -9.4], [1.8, -9.6], [2.8, -5], [3.2, -.2], [-1, 0], [-4.8, -.4], [-3.6, -2.6], [-2.6, -5.6]],
        sit: [[-1.4, -10.4], [1.4, -10.4], [2.4, -6.6], [3.6, -3.4], [.6, -3.8], [-1.8, -3], [-3.6, -3.6], [-2.4, -6.6]],
      }[pose];
      shape(g, (gg) => poly(gg, B), { fill: cl[0], shade: cl[1], light: cl[2], rim, rimB: 8 });
      if (o.apron) shape(g, (gg) => poly(gg, [[-.6, -9], [1.8, -9], [2.4, -4.4], [-.2, -4.4]].map(([a, b2]) => [a, b2 + (HY + 14.4)])), { fill: o.apron, lw: .25 });
      if (o.belt) stroke(g, (gg) => { gg.moveTo(-2.1, -8.4 + (HY + 14.4)); gg.lineTo(2.2, -8.4 + (HY + 14.4)); }, o.belt, .55);
      if (pose === "run") limb(g, [[.6, -6.2], [2.6, -4.4], [3.4, -2]], 1.1, .7, legC);
      // head
      shape(g, (gg) => E(gg, hx + .35, hy + .2, 2.25, 2.4), { fill: sk[0], shade: sk[1], sx: -.6, sy: .7, rim: o.hat && o.hat.k === "hood" ? null : rim, rimB: 6 });
      if (o.beard) shape(g, (gg) => blob(gg, [[hx - .6, hy + 1], [hx + 2.4, hy + .9], [hx + 2, hy + 3.4], [hx + .8, hy + 4.6], [hx - .2, hy + 3]]), { fill: o.beard, shade: P.mist, lw: .25 });
      const hs = o.hairStyle || "short";
      if (!o.hat || o.hat.k === "crown" || o.hat.k === "scarf") {
        if (hs !== "none") shape(g, (gg) => blob(gg, [[hx - 2.2, hy + .4], [hx - 1.8, hy - 2.2], [hx + .4, hy - 2.9], [hx + 2.6, hy - 2], [hx + 1.4, hy - 1.2], [hx - .2, hy - .8], [hx - 1, hy + .8]]), { fill: hc, shade: P.ink, lw: .25 });
        if (hs === "bun") shape(g, (gg) => E(gg, hx - 2.4, hy - 1.6, 1.2, 1.2), { fill: hc, lw: .25 });
      }
      // eyes / mouth
      eye(g, hx + 1.5, hy + .2, 1, o.emo === "closed" || o.sing ? "closed" : "open", .48);
      if (o.emo === "sad") stroke(g, (gg) => { gg.moveTo(hx + .9, hy - .8); gg.lineTo(hx + 2, hy - .5); }, P.ink, .2);
      if (o.sing) shape(g, (gg) => E(gg, hx + 2.2, hy + 1.3, .36, .5), { fill: P.ember1, lw: .18 });
      else if (o.blush !== false) dot(g, hx + 1.2, hy + 1.2, .36, P.rose2);
      // hats
      const h = o.hat;
      if (h && h.k === "hood") shape(g, (gg) => { gg.moveTo(hx - 2.6, hy + 2); gg.quadraticCurveTo(hx - 2.8, hy - 3.6, hx + 1, hy - 3); gg.quadraticCurveTo(hx + 3, hy - 2.4, hx + 2.8, hy - .9); gg.quadraticCurveTo(hx + .4, hy - 1.8, hx - .8, hy + .4); gg.closePath(); }, { fill: h.c[0], shade: h.c[1], lw: .28 });
      if (h && h.k === "wide") shape(g, (gg) => blob(gg, [[hx - 5, hy - .9], [hx - 3, hy - 3.6], [hx + .4, hy - 4.4], [hx + 3.6, hy - 3.4], [hx + 5.2, hy - .7], [hx, hy - 1.4]]), { fill: h.c[0], shade: h.c[1], light: h.c[2], rim, rimB: 8 });
      if (h && h.k === "cap") shape(g, (gg) => { gg.moveTo(hx - 2.4, hy - .4); gg.quadraticCurveTo(hx - 1.8, hy - 3.4, hx + 1, hy - 3); gg.quadraticCurveTo(hx + 3, hy - 2.4, hx + 3.8, hy - .9); gg.lineTo(hx - 2.4, hy - .4); gg.closePath(); }, { fill: h.c[0], shade: h.c[1], lw: .28 });
      if (h && h.k === "helmet") { shape(g, (gg) => { gg.moveTo(hx - 2.6, hy - .2); gg.quadraticCurveTo(hx - 2.2, hy - 3.6, hx + .6, hy - 3.4); gg.quadraticCurveTo(hx + 3, hy - 3, hx + 3.2, hy - .4); gg.closePath(); }, { fill: h.c[0], shade: h.c[1], lw: .28 }); shape(g, (gg) => gg.rect(hx + 1.6, hy - 2.8, 1.4, 1.2), { fill: P.butter, rim: P.ember4, rimB: 8, rimA: .8, lw: .22 }); }
      if (h && h.k === "crown") shape(g, (gg) => poly(gg, [[hx - 1.8, hy - 2.2], [hx - 1.8, hy - 4.2], [hx - .9, hy - 3], [hx + .3, hy - 4.6], [hx + 1.4, hy - 3], [hx + 2.4, hy - 4.2], [hx + 2.4, hy - 2]]), { fill: h.c[0], shade: h.c[1], lw: .25 });
      if (h && h.k === "scarf") shape(g, (gg) => poly(gg, [[hx - 2, hy + 1.6], [hx + 2.4, hy + 1.8], [hx + 2, hy + 3], [hx - 2.4, hy + 3.2], [hx - 4.2, hy + 4.6], [hx - 3, hy + 2.6]]), { fill: h.c[0], shade: h.c[1], lw: .25 });
      // front arm and what it holds
      const sy0 = -10.6 + (HY + 14.4);
      const fr = o.front || [1.6, -6.2 + (HY + 14.4)];
      limb(g, o.front ? [[.7, sy0], [(.7 + fr[0]) / 2 + .2, (sy0 + fr[1]) / 2 + .8], fr] : [[.7, sy0], fr], .95, .72, o.arm || cl[1]);
      dot(g, fr[0], fr[1], .55, sk[0]);
      if (o.hold) o.hold(g, fr[0], fr[1]);
    });
  }

  /* ---- creatures (origin = feet, facing right) ---- */
  const C = {};
  const face = (g, x, y, emo, gap = 1.6, big = .55) => { if (emo === "sleep" || emo === "closed") { eye(g, x - gap / 2, y, 1, "closed"); eye(g, x + gap / 2, y, 1, "closed"); } else { eye(g, x - gap / 2, y, 1, "open", big); eye(g, x + gap / 2, y, 1, "open", big); } if (emo === "happy") stroke(g, (gg) => { gg.moveTo(x - .5, y + 1.1); gg.quadraticCurveTo(x, y + 1.7, x + .5, y + 1.1); }, P.ink, .22); if (emo === "sad") stroke(g, (gg) => { gg.moveTo(x - .5, y + 1.5); gg.quadraticCurveTo(x, y + 1, x + .5, y + 1.5); }, P.ink, .22); if (emo === "o" || emo === "surprised") shape(g, (gg) => E(gg, x, y + 1.4, .4, .5), { fill: P.ember0, lw: .18 }); };
  C.lumo = (g, o) => { const rim = o.rim;
    [[-4.2, -1], [4.2, 1]].forEach(([ox, r]) => shape(g, (gg) => E(gg, ox, -6.4, 2, 2.8, r * .3), { fill: P.glim1, alpha: .9, shade: P.glim0, rim, rimB: 8 }));
    [[-1.6, -11.8], [2, -11.6]].forEach(([ax, ay]) => { stroke(g, (gg) => { gg.moveTo(ax * .4, -8); gg.quadraticCurveTo(ax, -9.6, ax, ay + 1); }, P.ink, .3); shape(g, (gg) => E(gg, ax, ay, .9, .9), { fill: P.butter, rim: P.ember4, rimB: 8, lw: .22 }); });
    shape(g, (gg) => E(gg, 0, -4.2, 3.8, 3.8), { fill: P.ember4, shade: P.ember3, light: P.butter, rim: rim || P.butter, rimB: 12, rimA: .6 });
    face(g, .6, -4.6, o.emo || "happy"); dot(g, -1.4, -3.4, .4, P.rose2); dot(g, 2.6, -3.4, .4, P.rose2); };
  C.fizz = (g, o) => { const rim = o.rim;
    shape(g, (gg) => blob(gg, [[-5.4, -2], [-5.6, -5], [-3.4, -7.4], [-.6, -8.6], [2.6, -8], [4.8, -6.2], [5.8, -3], [4.4, -1], [0, -.4]]), { fill: P.sea4, shade: P.sea3, light: P.cream, rim: rim || P.sea2, rimB: 10, rimA: .5 });
    face(g, .6, -4.4, o.emo || "sleep", 2); dot(g, -1.4, -3.2, .4, P.rose2); dot(g, 2.6, -3.2, .4, P.rose2); };
  C.pebb = (g, o) => { const rim = o.rim;
    shape(g, (gg) => blob(gg, [[-4.6, -.6], [-5, -4], [-3, -7], [1, -7.6], [4.4, -5.6], [5, -1.6], [2, -.2]]), { fill: P.mist, shade: P.plum3, light: P.fog, rim, rimB: 8 });
    if (o.moss !== false) shape(g, (gg) => blob(gg, [[-2.6, -6.4], [-.4, -7.9], [2.6, -7.4], [1.4, -6.4], [-1, -6.2]]), { fill: P.moss3, shade: P.moss2, lw: .22 });
    face(g, .8, -3.8, o.emo || "normal", 2); stroke(g, (gg) => { gg.moveTo(-2.8, -2.4); gg.lineTo(-1.8, -3); }, P.plum3, .3); };
  C.fuellito = (g, o) => { const rim = o.rim;
    shape(g, (gg) => blob(gg, [[-3, -2], [-6.4, -3.6], [-7.4, -6], [-5.6, -4.2], [-2.6, -3.4]]), { fill: P.ember2, lw: .25 });
    shape(g, (gg) => blob(gg, [[-7.6, -6.2], [-6.8, -9.4], [-6.2, -6.4], [-6.8, -5.2]]), { fill: P.ember4, rim: P.ember3, rimB: 10, lw: .22 });
    [[-1.6], [1.8]].forEach(([ox]) => shape(g, (gg) => E(gg, ox, -.5, 1.2, .7), { fill: P.ember1, lw: .22 }));
    shape(g, (gg) => E(gg, 0, -4.4, 4, 3.8), { fill: P.ember2, shade: P.ember1, light: P.ember3, rim, rimB: 8 });
    shape(g, (gg) => E(gg, .4, -2.8, 2.4, 1.8), { fill: P.soil3, shade: P.soil2, lw: .22 });
    stroke(g, (gg) => { gg.moveTo(-1, -2.6); gg.lineTo(1.8, -2.6); gg.moveTo(-.8, -1.8); gg.lineTo(1.6, -1.8); }, P.soil1, .22);
    face(g, 1, -5.6, o.emo || "happy", 1.8); };
  C.brotin = (g, o) => { const rim = o.rim;
    shape(g, (gg) => blob(gg, [[-3.2, -3], [-3, -6.6], [0, -7.4], [3, -6.6], [3.2, -3], [1.6, -.4], [-1.6, -.4]]), { fill: P.soil3, shade: P.soil2, light: P.butter, rim, rimB: 8 });
    shape(g, (gg) => blob(gg, [[-4, -6.2], [-2.6, -8.8], [2.6, -8.8], [4, -6.2], [0, -5.6]]), { fill: P.soil1, shade: P.soil0, lw: .3 });
    stroke(g, (gg) => { gg.moveTo(0, -8.8); gg.lineTo(.2, -10.4); }, P.moss1, .4);
    [[-1.6, -11, .5], [1.8, -11.2, -.5]].forEach(([lx, ly, r]) => shape(g, (gg) => E(gg, lx, ly, 1.6, .8, r), { fill: P.moss3, shade: P.moss2, lw: .22 }));
    face(g, 0, -4.2, o.emo || "normal", 1.8); };
  C.remolin = (g, o) => { const rim = o.rim;
    shape(g, (gg) => blob(gg, [[3, -1.4], [7, -2.4], [7.6, -1.4], [3.4, -.2]]), { fill: P.sea1, lw: .25 });
    shape(g, (gg) => blob(gg, [[-3.6, -2], [-3.4, -6.6], [-1.4, -8.4], [2.4, -8.2], [3.8, -5.4], [3.6, -1.2], [0, -.2]]), { fill: P.sea1, shade: P.sea0, light: P.sea2, rim, rimB: 8 });
    [[-2.2, -8.2], [2.2, -8.2]].forEach(([ex, ey]) => shape(g, (gg) => E(gg, ex, ey, .8, .7), { fill: P.sea1, lw: .22 }));
    shape(g, (gg) => E(gg, .2, -3.4, 2.2, 2.4), { fill: P.sea4, lw: .22 });
    face(g, .2, -6, o.emo || "happy", 2); dot(g, .2, -4.8, .4, P.ink); };
  C.bostezo = (g, o) => { const rim = o.rim;
    [[-5, -.4], [5, .4]].forEach(([ox, r]) => shape(g, (gg) => E(gg, ox, -5.6, 2.2, 2.8, r), { fill: P.glim1, shade: P.glim0, alpha: .95, rim, rimB: 8 }));
    shape(g, (gg) => blob(gg, [[-4.4, -1], [-5, -4.6], [-3.4, -7.6], [0, -8.6], [3.4, -7.6], [5, -4.6], [4.4, -1], [0, -.2]]), { fill: P.cream, shade: P.fog, rim, rimB: 8 });
    shape(g, (gg) => E(gg, .2, -4.4, 2.4, 2.1), { fill: P.glim1, shade: P.glim0, lw: .25 });
    [[-1.4, -8.4], [1.8, -8.4]].forEach(([ax, ay]) => stroke(g, (gg) => { gg.moveTo(ax * .5, -7.6); gg.quadraticCurveTo(ax, -9.2, ax * 1.6, -9.6); }, P.ink, .3));
    face(g, .2, -4.6, o.emo || "sleep", 1.6); };
  C.yunqueron = (g, o) => { const rim = o.rim;
    [[-3.4], [3.4]].forEach(([ox]) => shape(g, (gg) => E(gg, ox, -.6, 1.4, .9), { fill: P.moss2, lw: .22 }));
    shape(g, (gg) => E(gg, 5.6, -3.6, 2.2, 2), { fill: P.moss2, shade: P.moss1, light: P.moss3, lw: .3 });
    shape(g, (gg) => poly(gg, [[-5.6, -1.4], [-5, -4.6], [-7.6, -5.6], [-4.4, -6.2], [4.2, -6.2], [4.8, -1.4]]), { fill: P.plum3, shade: P.plum2, light: P.mist, rim: rim || P.ember2, rimB: 8 });
    stroke(g, (gg) => { gg.moveTo(-4.4, -5.2); gg.lineTo(4.2, -5.2); }, o.hot ? P.ember3 : P.ember1, .4);
    eye(g, 6.4, -4, 1, o.emo === "sleep" ? "closed" : "open", .45); };
  C.espinardo = (g, o) => { const rim = o.rim;
    for (let i = 0; i < 9; i++) { const a = Math.PI * (.95 + i * .13); shape(g, (gg) => poly(gg, [[Math.cos(a) * 3.2, -4 + Math.sin(a) * 3.2], [Math.cos(a + .1) * 6, -4 + Math.sin(a + .1) * 5.6], [Math.cos(a + .2) * 3.2, -4 + Math.sin(a + .2) * 3.2]]), { fill: o.spines || P.moss2, lw: .2 }); }
    shape(g, (gg) => E(gg, 0, -3.6, 4.4, 3.4), { fill: P.moss1, shade: P.moss0, light: P.moss2, rim, rimB: 8 });
    shape(g, (gg) => E(gg, 2, -3, 2.4, 2.2), { fill: P.soil3, shade: P.soil2, lw: .22 });
    face(g, 2.4, -3.6, o.emo || "normal", 1.4, .45); dot(g, 4.2, -2.6, .4, P.ink); };
  C.centinela = (g, o) => { const rim = o.rim;
    stroke(g, (gg) => { gg.moveTo(-4, 0); gg.lineTo(-4, -17); }, P.ink, .7); stroke(g, (gg) => { gg.moveTo(-4, 0); gg.lineTo(-4, -17); }, P.soil2, .35);
    shape(g, (gg) => poly(gg, [[-4.6, -17], [-4, -19.4], [-3.4, -17]]), { fill: P.fog, rim: P.mist, rimB: 8, lw: .25 });
    shape(g, (gg) => poly(gg, [[-2.6, -11.6], [0, -15.6], [2.8, -11.8], [3.6, -5], [4.6, 0], [1.4, -.8], [0, .2], [-1.6, -.8], [-4.4, 0], [-3.4, -5]]), { fill: P.plum2, shade: P.plum1, light: P.plum3, rim, rimB: 10 });
    shape(g, (gg) => blob(gg, [[-1.6, -12.6], [.4, -14], [2, -12.4], [1.2, -10.4], [-1, -10.6]]), { fill: P.ink, ink: false });
    dot(g, -.4, -12.2, .36, P.ember4); dot(g, 1, -12.2, .36, P.ember4);
    shape(g, (gg) => E(gg, -3.2, -7, 1, .9), { fill: P.mist, lw: .22 }); dot(g, .2, -9.6, .4, P.glim1); };
  C.ecolito = (g, o) => { const rim = o.rim;
    [[-2, -8.4, 2.2], [0, -9.6, 3], [2, -8.6, 2.4]].forEach(([cx, cy, h]) => shape(g, (gg) => poly(gg, [[cx - .9, cy + 1.4], [cx, cy - h], [cx + .9, cy + 1.4]]), { fill: P.glim1, shade: P.glim0, rim: P.glim1, rimB: 8, lw: .22 }));
    shape(g, (gg) => blob(gg, [[-4.8, -.6], [-5.2, -4.4], [-3, -7.4], [1, -7.8], [4.6, -5.6], [5, -1.4], [1.6, -.2]]), { fill: P.soil2, shade: P.soil1, light: P.soil3, rim, rimB: 8 });
    face(g, .4, -4, o.emo || "o", 2); };
  C.trinilla = (g, o) => { const rim = o.rim;
    stroke(g, (gg) => { gg.moveTo(-3, -4); gg.quadraticCurveTo(-6.6, -6.4, -5.4, -10); gg.moveTo(-3, -4); gg.quadraticCurveTo(-4, -8, -2.4, -10.4); }, P.rose0, .55);
    stroke(g, (gg) => { gg.moveTo(-5, -9); gg.lineTo(-2.8, -9.6); }, P.butter, .25);
    shape(g, (gg) => E(gg, 0, -4.4, 3.8, 3.8), { fill: P.rose1, shade: P.rose0, light: P.rose2, rim, rimB: 8 });
    shape(g, (gg) => E(gg, .6, -3, 2.4, 1.9), { fill: P.cream, lw: .22 });
    shape(g, (gg) => poly(gg, [[3.4, -5.2], [5.4, -4.6], [3.4, -4]]), { fill: P.ember3, lw: .2 });
    shape(g, (gg) => E(gg, -1.2, -4, 1.6, 2.4, .5), { fill: P.rose0, lw: .22 });
    face(g, 1.6, -5.4, o.emo || "happy", 1.4, .45);
    [-1, 1].forEach((ox) => stroke(g, (gg) => { gg.moveTo(ox, -.8); gg.lineTo(ox, 0); }, P.ember2, .3)); };
  C.carambano = (g, o) => { const rim = o.rim;
    for (let i = -2; i <= 2; i++) shape(g, (gg) => poly(gg, [[i * 1.6 - .7, -6.6 + Math.abs(i) * .5], [i * 1.6, -9.6 + Math.abs(i) * .8], [i * 1.6 + .7, -6.6 + Math.abs(i) * .5]]), { fill: P.cream, shade: P.sea4, lw: .2 });
    shape(g, (gg) => blob(gg, [[-4.8, -1], [-5, -4.2], [-2.6, -7.2], [2.6, -7.2], [5, -4.2], [4.8, -1], [0, -.2]]), { fill: P.sea2, shade: P.sea1, light: P.sea3, rim, rimB: 8 });
    shape(g, (gg) => E(gg, 0, -2.6, 1.2, 1), { fill: P.cream, lw: .22 });
    [[-3.4], [3.4]].forEach(([ox]) => shape(g, (gg) => E(gg, ox, -.4, 1.5, .8), { fill: P.sea4, lw: .22 }));
    eye(g, -.9, -4.6, 1, o.emo === "sleep" ? "closed" : "open", .38); eye(g, .9, -4.6, 1, o.emo === "sleep" ? "closed" : "open", .38); };
  C.guardatumba = (g, o) => { const rim = o.rim;
    [[-1.8], [1.8]].forEach(([ox]) => limb(g, [[ox, -7], [ox * 1.1, -.4]], 2.4, 2, P.sea2));
    shape(g, (gg) => poly(gg, [[-5, -15.6], [5, -15.6], [6.4, -12], [4.4, -6], [-4.4, -6], [-6.4, -12]]), { fill: P.sea4, shade: P.sea2, light: P.cream, rim, rimB: 12 });
    [[-7.2, 1], [7.2, -1]].forEach(([ox]) => limb(g, [[ox * .85, -14.4], [ox, -10], [ox * .95, -6.4]], 2.6, 2.2, P.sea4));
    shape(g, (gg) => E(gg, 0, -17.6, 2.6, 2.4), { fill: P.sea4, shade: P.sea2, lw: .3 });
    [[-1.4, -20.4, 1.4], [0, -21.6, 2], [1.4, -20.4, 1.4]].forEach(([cx, cy, h]) => shape(g, (gg) => poly(gg, [[cx - .6, cy + 1.2], [cx, cy - h + 1], [cx + .6, cy + 1.2]]), { fill: P.sea3, lw: .2 }));
    eye(g, -.8, -17.6, 1, o.emo === "sleep" ? "closed" : "open", .42); eye(g, .8, -17.6, 1, o.emo === "sleep" ? "closed" : "open", .42); };
  C.unisona = (g, o) => {
    g.save(); g.shadowColor = P.cream; g.shadowBlur = 14; dot(g, 0, -6, 3, P.cream); g.restore();
    [[0, -1, P.ember4], [1, 0, P.sea3], [0, 1, P.rose2], [-1, 0, P.glim1]].forEach(([dx, dy, c]) => shape(g, (gg) => poly(gg, [[dx * 2 - dy * 1.4, -6 + dy * 2 + dx * 1.4], [dx * 6.2, -6 + dy * 6.2], [dx * 2 + dy * 1.4, -6 + dy * 2 - dx * 1.4]]), { fill: c, lw: .25 }));
    shape(g, (gg) => E(gg, 0, -6, 2.8, 2.8), { fill: P.butter, shade: P.ember4, light: P.cream, lw: .3 });
    g.save(); g.beginPath(); E(g, 0, -6, 2.6, 2.6); g.clip(); g.fillStyle = P.plum2; g.fillRect(0, -9, 3, 6); g.restore();
    face(g, 0, -6.2, o.emo || "happy", 1.6, .42); };
  C.mecha = (g, o) => HD.mecha(g, 0, 0, o); C.vidriela = (g, o) => HD.vidriela(g, 0, 0, o); C.relampin = (g, o) => HD.relampin(g, 0, 0, o); C.capuchon = (g, o) => HD.capuchon(g, 0, 0, o);
  C.nim = (g, o) => HD.nimSit(g, 0, 0, Object.assign({}, o, { dir: 1 }));
  function creature(g, kind, x, y, o = {}) { at(g, x, y, o, (gg) => C[kind](gg, o)); }
  return { folk, creature, at, SKIN, C, face };
})());
/* ================= Places: pixel backgrounds reused across scenes =================
   Each returns a 64x48 Pic; the scene adds its own props and the hand-drawn figures on top. */
const SKY = {
  night: [P.ink, P.sea0, P.plum1, P.plum2], dusk: [P.sea0, P.rose0, P.ember1, P.ember2, P.ember3], day: [P.sea2, P.sea3, P.sea3, P.sea4],
  dawn: [P.glim0, P.rose1, P.ember3, P.ember4, P.butter], warm: [P.ember2, P.ember3, P.ember4, P.butter], grey: [P.plum3, P.mist, P.fog, P.fog],
};
function sky(b, kind, h = 30, seed = 1) { b.grad(0, 0, AW, h, SKY[kind] || kind); if (kind === "night") b.stars(0, 0, AW, h * .55, 18, seed); if (kind === "dusk") b.stars(0, 0, AW, 5, 5, seed); }
function hills(b, y, col, amp = 3, seed = 2, step = 7) { const r = rng(seed); const pts = [[0, AH]]; for (let x = 0; x <= AW + step; x += step) pts.push([x, y - r() * amp]); pts.push([AW, AH]); b.poly(pts, col); }
function lamp(b, x, y, o = {}) { // an Albor street lantern: post + glass; o.sap adds the hidden line
  b.r(x, y, 1, o.h || 12, P.ink); b.r(x - 1, y + (o.h || 12) - 1, 3, 1, P.ink);
  b.layer((t) => { t.r(x - 1, y - 4, 3, 4, o.off ? P.plum2 : P.butter); t.r(x - 2, y - 5, 5, 1, P.mist); t.r(x - 2, y, 5, 1, P.mist); });
  if (!o.off) { b.p(x, y - 3, P.cream); b.glow(x + .5, y - 2, o.r || 7, o.gc || P.plum3, .5, o.only || [P.plum1, P.plum2, P.sea0, P.ink]); }
  if (o.sap) { b.p(x - 1, y + 1, SAP.s2); b.p(x, y + 1, SAP.s2); b.p(x + 1, y + 1, SAP.sheen); }
}
function house(b, x, y, w, h, o = {}) { // cream stone house with a tiled roof (Day) or plank shack (o.poor)
  const wall = o.poor ? P.soil1 : o.night ? P.plum2 : P.fog, roof = o.poor ? P.soil0 : o.night ? P.plum1 : P.ember1;
  b.r(x, y, w, h, wall); if (o.poor) for (let i = x + 2; i < x + w; i += 3) b.r(i, y, 1, h, P.soil0); else for (let j = y + 3; j < y + h; j += 4) b.r(x, j, w, 1, o.night ? P.plum1 : P.mist);
  b.poly([[x - 2, y + 1], [x + w / 2, y - Math.max(4, w * .35)], [x + w + 2, y + 1]], roof); b.l(x - 2, y + 1, x + w / 2, y - Math.max(4, w * .35), o.poor ? P.soil1 : o.night ? P.plum2 : P.ember2);
  (o.win || []).forEach(([wx, wy, lit]) => { b.r(x + wx - 1, y + wy - 1, 4, 4, P.ink); b.r(x + wx, y + wy, 2, 2, lit ? P.butter : o.night ? P.plum1 : P.sea1); if (lit) b.glow(x + wx + 1, y + wy + 1, 4, P.soil2, .4, [P.plum1, P.plum2, P.soil0, P.soil1]); });
  if (o.door != null) { b.r(x + o.door, y + h - 7, 4, 7, P.ink); b.r(x + o.door + 1, y + h - 6, 2, 6, o.doorLit ? P.ember3 : P.soil0); }
}
function cobbles(b, y, base = P.plum1, hi = P.plum2, hi2 = P.plum3, seed = 5) { b.r(0, y, AW, AH - y, base); const r = rng(seed); for (let j = y + 1; j < AH; j += 3) for (let x = (j % 2) * 2; x < AW; x += 5 + Math.floor(r() * 2)) { b.r(x, j, 3, 2, hi); b.p(x, j, hi2); } b.r(0, y, AW, 1, P.ink); }
function grass(b, y, cols = [P.moss1, P.moss2, P.moss3], seed = 3) { b.grad(0, y, AW, AH - y, cols); const r = rng(seed); for (let i = 0; i < 50; i++) { const x = Math.floor(r() * AW), yy = y + Math.floor(r() * (AH - y)); b.p(x, yy, cols[2]); b.p(x, yy - 1, cols[Math.min(2, 1 + (i % 2))]); } }
function water(b, y, cols = [P.sea2, P.sea1, P.sea0], shine = P.sea3, seed = 6) { b.grad(0, y, AW, AH - y, cols); for (let j = y + 1; j < AH; j += 2) for (let x = (j * 7) % 5; x < AW; x += 6 + (j % 4)) b.r(x, j, 2 + (x % 3), 1, shine); }
function snowfall(b, n, seed = 9, c = P.cream) { const r = rng(seed); for (let i = 0; i < n; i++) b.p(Math.floor(r() * AW), Math.floor(r() * AH), c); }
function bricks(b, x, y, w, h, base, line) { b.r(x, y, w, h, base); for (let j = y; j < y + h; j += 3) { b.r(x, j, w, 1, line); for (let i = x + ((j - y) / 3 % 2 ? 2 : 5); i < x + w; i += 6) b.r(i, j + 1, 1, 2, line); } }
function pine(b, x, y, h, c = P.moss0, c2 = P.moss1) { for (let i = 0; i < h; i++) { const w = Math.floor(i * .45) + 1; b.r(x - w, y + i, w * 2 + 1, 1, i % 3 === 0 ? c2 : c); } b.r(x, y + h, 1, 2, P.soil0); }
function trunk(b, x, y0, w, h, c = P.soil0, hi = P.soil1) { b.r(x, y0, w, h, c); b.r(x + 1, y0, 1, h, hi); for (let j = y0 + 3; j < y0 + h; j += 5) b.p(x + w - 2, j, P.ink); }

const PL = {
  street(o = {}) { const b = new Pic(AW, AH); sky(b, o.sky || "night", 36, o.seed || 3);
    house(b, -2, 18, 18, 18, { night: o.sky !== "day", win: [[5, 5, 1], [11, 5, !o.dim]], door: 6 }); house(b, 20, 16, 16, 20, { night: o.sky !== "day", win: [[4, 6, !o.dim], [10, 6, 1]] });
    house(b, 40, 19, 26, 17, { night: o.sky !== "day", poor: o.poor, win: [[5, 5, 0], [14, 5, !o.dim], [20, 5, 0]], door: 9 });
    cobbles(b, 36, o.sky === "day" ? P.mist : P.plum1, o.sky === "day" ? P.fog : P.plum2, o.sky === "day" ? P.cream : P.plum3, o.seed || 5); return b; },
  meadow(o = {}) { const b = new Pic(AW, AH); sky(b, o.sky || "dawn", 30, o.seed || 4); hills(b, 26, o.sky === "night" ? P.plum2 : P.moss2, 4, 7, 9); hills(b, 31, o.sky === "night" ? P.plum1 : P.moss1, 3, 8, 6);
    grass(b, 34, o.sky === "night" ? [P.plum1, P.plum1, P.plum2] : [P.moss2, P.moss1, P.moss3], o.seed || 3);
    if (o.flowers !== false) { const r = rng(12); for (let i = 0; i < 16; i++) b.p(Math.floor(r() * AW), 36 + Math.floor(r() * 11), [P.butter, P.rose2, P.cream][i % 3]); } return b; },
  forge(o = {}) { const b = new Pic(AW, AH); bricks(b, 0, 0, AW, 38, P.soil0, P.ember0);
    const fx = o.fx == null ? 44 : o.fx; b.poly([[fx - 12, 0], [fx + 12, 0], [fx + 8, 12], [fx - 8, 12]], P.plum1); b.l(fx - 8, 12, fx + 8, 12, P.plum3);
    b.r(fx - 9, 14, 18, 24, P.plum2); b.r(fx - 9, 14, 18, 1, P.mist); b.e(fx, 27, 6, 6, P.ink); b.r(fx - 6, 27, 12, 8, P.ink);
    b.e(fx, 27.5, 5, 5, P.ember2); b.r(fx - 5, 27, 10, 7, P.ember2); b.grad(fx - 4, 24, 8, 10, [P.butter, P.ember4, P.ember3, P.ember2]);
    b.glow(fx, 30, 22, P.ember1, .55, [P.soil0, P.ember0, P.plum2, P.plum1]);
    b.r(0, 38, AW, 10, P.plum1); for (let x = 0; x < AW; x += 8) b.r(x, 38, 1, 10, P.ink); b.r(0, 38, AW, 1, P.ink); b.glow(fx, 40, 16, P.soil1, .7, [P.plum1]);
    if (o.tools !== false) { [[6, 4], [10, 5], [14, 4]].forEach(([x, y]) => { b.r(x, y, 1, 10, P.ink); b.r(x - 1, y + 9, 3, 2, P.plum3); }); b.r(4, 3, 13, 1, P.soil1); } return b; },
  crater(o = {}) { const b = new Pic(AW, AH); sky(b, o.sky || "dusk", 34, 6);
    b.poly([[4, 34], [22, 12], [30, 10], [38, 12], [58, 34]], P.ember0); b.r(23, 10, 15, 2, P.ember1); b.glow(30, 10, 10, P.ember2, .7, [P.ember0, P.ember1, P.rose0, P.sea0]);
    for (let i = 0; i < 10; i++) b.e(30 + Math.sin(i * .8) * 2 + i * .5, 8 - i, 1.8 + i * .2, 1.2, i % 2 ? P.rose0 : P.plum2);
    b.poly([[0, 34], [0, 30], [10, 28], [26, 31], [40, 29], [64, 31], [64, 34]], P.soil0); b.grad(0, 34, AW, 14, [P.soil1, P.soil0, P.soil0]);
    const r = rng(14); for (let i = 0; i < 30; i++) b.p(Math.floor(r() * AW), 35 + Math.floor(r() * 12), P.soil2); return b; },
  forest(o = {}) { const b = new Pic(AW, AH); b.grad(0, 0, AW, 40, o.night ? [P.ink, P.moss0, P.moss0] : [P.moss1, P.moss2, P.moss1, P.moss0]);
    if (!o.night) for (let i = 0; i < 4; i++) { const x0 = 6 + i * 16; for (let y = 0; y < 40; y++) for (let x = x0 + y * .3; x < x0 + y * .3 + 4; x++) if (bay(Math.floor(x), y) < .3) b.p(x, y, P.moss3); }
    [[2, 7], [18, 5], [36, 8], [54, 6]].forEach(([x, w]) => trunk(b, x, 0, w, 40));
    b.r(0, 0, AW, 5, P.moss0); for (let x = 0; x < AW; x += 3) b.e(x, 5, 3, 2, x % 2 ? P.moss1 : P.moss0);
    grass(b, 38, [P.moss1, P.moss0, P.moss2], 21); for (let x = 0; x < AW; x += 6) { b.l(x + 2, 40, x, 36, P.moss2); b.l(x + 2, 40, x + 4, 36, P.moss3); } return b; },
  heights(o = {}) { const b = new Pic(AW, AH); sky(b, o.sky || "day", 34, 8);
    const cl = (x, y, rx, ry) => { b.e(x, y, rx, ry, o.sky === "night" ? P.plum2 : P.fog); b.e(x - rx * .25, y - ry * .35, rx * .7, ry * .6, o.sky === "night" ? P.plum3 : P.cream); };
    [[6, 33, 9, 4], [22, 35, 10, 4], [40, 34, 11, 5], [58, 33, 9, 4]].forEach((q) => cl(...q)); b.r(0, 36, AW, 12, o.sky === "night" ? P.plum2 : P.fog);
    if (o.spire !== false) { b.poly([[48, 36], [50, 6], [52, 2], [54, 6], [56, 36]], o.sky === "night" ? P.plum1 : P.mist); b.l(52, 2, 52, 36, o.sky === "night" ? P.plum2 : P.fog); b.r(51, 0, 2, 3, P.butter); } return b; },
  hollow(o = {}) { const b = new Pic(AW, AH); sky(b, "night", 30, o.seed || 23);
    b.poly([[0, 30], [0, 24], [10, 21], [22, 23], [34, 18], [46, 21], [56, 17], [64, 19], [64, 30]], P.plum2); b.poly([[0, 34], [0, 28], [16, 26], [28, 29], [42, 25], [54, 27], [64, 25], [64, 34]], P.plum1);
    for (let y = 28; y < 34; y++) for (let x = 0; x < AW; x++) if (bay(x, y) < .22 - Math.abs(y - 31) * .06) b.p(x, y, P.plum3);
    b.r(0, 34, AW, 14, P.plum1); const r = rng(9); for (let i = 0; i < 40; i++) b.p(Math.floor(r() * AW), 35 + Math.floor(r() * 13), r() < .5 ? P.ink : P.plum2); return b; },
  lake(o = {}) { const b = new Pic(AW, AH); const k = o.sky || "dusk"; sky(b, k, 24, 3); const hz = o.hz || 24;
    b.poly([[0, hz], [0, hz - 5], [12, hz - 6], [24, hz - 4], [36, hz], [64, hz]], k === "night" ? P.ink : P.plum1);
    water(b, hz, k === "day" ? [P.sea3, P.sea2, P.sea1] : k === "night" ? [P.plum1, P.sea0, P.ink] : [P.ember2, P.rose0, P.sea0], k === "day" ? P.sea4 : k === "night" ? P.plum2 : P.ember3);
    b.r(0, hz, AW, 1, k === "day" ? P.sea4 : k === "night" ? P.plum3 : P.ember3); return b; },
  cave(o = {}) { const b = new Pic(AW, AH); b.grad(0, 0, AW, AH, [P.ink, P.soil0, P.soil0, P.ink]);
    const r = rng(o.seed || 17); for (let i = 0; i < 26; i++) { const x = Math.floor(r() * AW), y = Math.floor(r() * 40); b.r(x, y, 3 + Math.floor(r() * 4), 1, P.soil1); }
    for (let x = 0; x < AW; x += 4 + Math.floor(r() * 3)) { const L = 2 + Math.floor(r() * 6); b.poly([[x, 0], [x + 3, 0], [x + 1.5, L]], P.soil1); }
    if (o.crystals !== false) [[8, 12], [54, 9], [30, 4]].forEach(([x, y]) => { b.layer((t) => { t.poly([[x, y + 4], [x + 1.5, y], [x + 3, y + 4]], P.glim1); t.poly([[x + 2, y + 4], [x + 3.5, y + 1], [x + 5, y + 4]], P.glim0); }); b.glow(x + 2, y + 2, 7, P.plum2, .5, [P.soil0, P.ink, P.soil1]); });
    b.grad(0, 38, AW, 10, [P.soil1, P.soil0, P.ink]); b.r(0, 38, AW, 1, P.soil2); return b; },
  snow(o = {}) { const b = new Pic(AW, AH); sky(b, o.sky || "night", 34, 31); if (o.sky !== "day") b.e(50, 8, 3, 3, P.fog);
    b.poly([[0, 34], [0, 26], [14, 22], [30, 25], [44, 21], [64, 24], [64, 34]], o.sky === "day" ? P.sea4 : P.plum2); b.grad(0, 32, AW, 16, [P.fog, P.cream, P.cream]);
    for (let x = 0; x < AW; x += 9) b.e(x + 4, 33, 5, 1.4, P.cream); b.r(0, 32, AW, 1, P.mist); snowfall(b, 14, 41); return b; },
  vado(o = {}) { const b = new Pic(AW, AH); sky(b, o.sky || "day", 30, 5);
    house(b, -2, 14, 16, 16, { night: o.sky === "night", win: [[5, 5, o.sky === "night"]], door: 9 }); house(b, 48, 13, 18, 17, { night: o.sky === "night", win: [[4, 5, 0], [11, 5, o.sky === "night"]], door: 4 });
    b.layer((t) => { t.r(16, 18, 14, 2, P.rose1); for (let x = 16; x < 30; x += 4) t.r(x, 18, 2, 2, P.cream); }); b.r(17, 20, 1, 10, P.soil1); b.r(28, 20, 1, 10, P.soil1);
    cobbles(b, 30, o.sky === "night" ? P.plum1 : P.soil2, o.sky === "night" ? P.plum2 : P.soil3, o.sky === "night" ? P.plum3 : P.butter, 15); water(b, 42, [P.sea2, P.sea1, P.sea0], P.sea3); b.r(0, 42, AW, 1, P.sea3); return b; },
  root(o = {}) { const b = new Pic(AW, AH); b.grad(0, 0, AW, AH, [P.ink, P.soil0, P.ink]);
    const r = rng(o.seed || 51); for (let i = 0; i < 7; i++) { let x = r() * AW, y = 0, w = 2 + r() * 3; while (y < AH) { b.r(x, y, w, 2, i % 2 ? P.soil1 : P.soil0); x += (r() - .5) * 3; y += 2; w = Math.max(1, w - .05); } }
    return b; },
  room(o = {}) { const b = new Pic(AW, AH); b.r(0, 0, AW, 36, o.wall || P.soil1); for (let x = 0; x < AW; x += 5) b.r(x, 0, 1, 36, o.wall2 || P.soil0);
    b.r(0, 36, AW, 12, o.floor || P.soil0); for (let j = 38; j < AH; j += 3) b.r(0, j, AW, 1, P.ink); b.r(0, 36, AW, 1, P.ink);
    if (o.win) { const [wx, wy] = o.win; b.r(wx, wy, 12, 10, P.ink); b.grad(wx + 1, wy + 1, 10, 8, SKY[o.winSky || "night"]); b.r(wx + 6, wy, 1, 10, P.ink); b.r(wx, wy + 5, 12, 1, P.ink); }
    if (o.fire) { const fx = o.fire; b.r(fx - 6, 18, 12, 18, P.plum2); b.r(fx - 4, 26, 8, 10, P.ink); b.e(fx, 33, 3, 2, P.ember2); b.e(fx, 32, 1.6, 2, P.ember4); b.glow(fx, 32, 14, P.soil2, .55, [P.soil0, P.soil1, P.plum2]); }
    return b; },
};
/* ================= Cast: recurring people, so the same person looks the same on every card ================= */
// front/back hand targets are given in scene coordinates and converted to the figure's local space
const F = (g, x, y, o, more) => { const q = Object.assign({}, o, more || {}), d = q.dir || 1, s = q.s || 1;
  ["front", "back"].forEach((k) => { if (q[k]) q[k] = [(q[k][0] - x) / (d * s), (q[k][1] - y) / s]; });
  return HD.folk(g, x, y, q); };
const Cr = (g, k, x, y, o) => HD.creature(g, k, x, y, o || {});
const SK = HD.SKIN;
const CAST = {
  tila: { hairStyle: "long", hair: P.plum1, cloth: [P.glim0, P.plum2, P.glim1] },
  orilla: { hairStyle: "long", hair: P.ink, cloth: [P.sea1, P.sea0, P.sea2] },
  ola: { hairStyle: "bun", hair: P.ink, cloth: [P.sea2, P.sea1, P.sea3], hat: { k: "scarf", c: [P.ember2, P.ember1] } },
  esporina: { hat: { k: "wide", c: [P.rose1, P.rose0, P.rose2] }, cloth: [P.rose1, P.rose0, P.rose2] },
  tizon: { s: 1.15, skin: SK.ember, hairStyle: "none", beard: P.soil0, cloth: [P.ember1, P.ember0, P.ember2], apron: P.soil1, leg: P.soil0 },
  aurelia: { s: 1.1, robe: true, hairStyle: "bun", hair: P.butter, cloth: [P.cream, P.fog, P.cream], hat: { k: "crown", c: [P.ember4, P.ember3] } },
  albor: { cloth: [P.butter, P.ember3, P.cream], hat: { k: "cap", c: [P.ember3, P.ember1] }, belt: P.ember1, leg: P.soil1 },
  liquen: { s: .95, robe: true, hairStyle: "none", beard: P.fog, cloth: [P.moss2, P.moss1, P.moss3], hat: { k: "hood", c: [P.moss1, P.moss0] } },
  forest: { cloth: [P.moss2, P.moss1, P.moss3], hair: P.soil1 },
  miner: { skin: SK.stone, cloth: [P.soil2, P.soil1, P.soil3], hat: { k: "helmet", c: [P.soil1, P.soil0] }, leg: P.soil0 },
  basalto: { s: 1.15, skin: SK.stone, hairStyle: "none", beard: P.plum2, cloth: [P.plum3, P.plum2, P.mist], hat: { k: "helmet", c: [P.plum2, P.plum1] }, leg: P.soil0 },
  grava: { s: 1.35, skin: [P.mist, P.plum3], robe: true, hairStyle: "long", hair: P.plum2, cloth: [P.soil2, P.soil1, P.soil3] },
  coplo: { cloth: [P.rose1, P.rose0, P.rose2], hat: { k: "cap", c: [P.rose0, P.ink] }, hair: P.soil1 },
  heights: { cloth: [P.sea3, P.sea2, P.sea4], hair: P.soil2, hat: { k: "scarf", c: [P.cream, P.fog] } },
  marejada: { s: 1.05, robe: true, cloth: [P.sea2, P.sea1, P.sea3], hat: { k: "hood", c: [P.sea1, P.sea0] }, skin: SK.day },
  water: { cloth: [P.sea2, P.sea1, P.sea3], hair: P.sea0 },
  albina: { s: 1.05, robe: true, skin: SK.frost, hairStyle: "long", hair: P.cream, cloth: [P.cream, P.fog, P.cream], hat: { k: "crown", c: [P.sea3, P.sea2] } },
  frost: { skin: SK.frost, cloth: [P.sea2, P.sea1, P.sea3], hair: P.fog, hat: { k: "scarf", c: [P.ember1, P.ember0] } },
  lobrego: { s: 1.12, robe: true, skin: SK.night, hairStyle: "long", hair: P.ink, cloth: [P.plum1, P.ink, P.plum2], hat: { k: "crown", c: [P.mist, P.plum3] } },
  night: { skin: SK.night, cloth: [P.plum2, P.plum1, P.plum3], hat: { k: "hood", c: [P.plum2, P.plum1] } },
  nightBare: { skin: SK.night, cloth: [P.plum2, P.plum1, P.plum3], hair: P.ink },
  poor: { cloth: [P.soil1, P.soil0, P.soil2], hair: P.soil0 },
  cantora: { s: 1.15, robe: true, hairStyle: "long", hair: P.cream, cloth: [P.butter, P.ember4, P.cream], skin: [P.cream, P.fog] },
};
const kid = (o) => Object.assign({}, o, { s: (o.s || 1) * .74 });
// small props
function glowDot(g, x, y, r, c, blur = 10) { g.save(); g.shadowColor = c; g.shadowBlur = blur; HD.dot(g, x, y, r, c); g.restore(); }
function scroll(g, x, y, w = 4, seal = P.ember1) { HD.shape(g, (gg) => gg.rect(x, y - .9, w, 1.8), { fill: P.cream, shade: P.fog, sx: 0, sy: .4, lw: .26 }); [x - .2, x + w + .2].forEach((rx) => HD.shape(g, (gg) => HD.E(gg, rx, y, .4, 1.2), { fill: P.soil3, lw: .2 })); if (seal) HD.dot(g, x + w / 2, y, .55, seal); }
function coin(g, x, y) { HD.shape(g, (gg) => HD.E(gg, x, y, .65, .65), { fill: P.ember4, shade: P.ember3, sx: -.25, sy: -.25, rim: P.butter, rimB: 6, lw: .2 }); }
function noteG(g, x, y, c) { HD.shape(g, (gg) => HD.E(gg, x, y, .8, .6, -.4), { fill: c, lw: .22 }); HD.stroke(g, (gg) => { gg.moveTo(x + .7, y - .2); gg.lineTo(x + .7, y - 3); gg.lineTo(x + 1.7, y - 2.2); }, P.ink, .3); }
/* ================= Scenes ================= */

/* Aceite Robado (Luz, pacto, Mecha): Tila runs from the Albor stores at night with the oil can.
   Lore: Tila, then of Casa Candil, stole eleven measures of oil to light a street of the Barrio Apagado.
   Hidden: the Albor lantern carries the 1 px sap line (they burn root light). */
SCENE.oil = () => {
  const b = new Pic(AW, AH);
  b.grad(0, 0, AW, 38, [P.ink, P.sea0, P.plum1, P.plum2]);
  b.stars(30, 0, 34, 16, 16, 11);
  // the dark quarter on the right: roofs with no lights
  b.poly([[30, 38], [30, 22], [36, 17], [42, 22], [42, 19], [48, 14], [55, 20], [55, 23], [60, 18], [64, 21], [64, 38]], P.plum1);
  b.poly([[38, 38], [38, 26], [44, 22], [50, 27], [50, 38]], P.ink);
  b.r(57, 24, 1, 2, P.plum2); b.r(45, 28, 2, 2, P.plum2);
  // the Albor store: cut stone, lit arch window
  b.r(0, 9, 31, 29, P.plum2);
  for (let y = 9; y < 38; y += 4) { b.r(0, y, 31, 1, P.plum1); for (let x = (y / 4) % 2 ? 2 : 6; x < 31; x += 8) b.r(x, y + 1, 1, 3, P.plum1); }
  b.r(0, 9, 31, 1, P.mist); b.r(0, 5, 33, 4, P.ink); b.r(0, 5, 33, 1, P.plum3);
  for (let x = 1; x < 33; x += 3) b.p(x, 8, P.plum1);
  b.r(30, 9, 1, 29, P.plum1);
  // arch window, glowing
  b.e(11.5, 17, 5, 5, P.ink); b.r(6, 17, 12, 12, P.ink);
  b.e(11.5, 17.3, 4, 4, P.ember4); b.r(7, 17, 10, 11, P.ember4);
  b.grad(7, 14, 10, 14, [P.butter, P.ember4, P.ember3]);
  b.r(11, 13, 1, 15, P.ink); b.r(7, 20, 10, 1, P.ink);
  b.r(5, 28, 14, 2, P.mist); b.r(5, 29, 14, 1, P.plum3);
  // the door Tila left open
  b.r(20, 22, 9, 16, P.ink); b.r(21, 23, 7, 15, P.soil0);
  b.r(21, 23, 2, 15, P.ember1); b.glow(22, 30, 5, P.ember2, .7, [P.soil0, P.ember1]);
  b.layer((t) => { t.se(24.5, 34.5, 3.2, 3.6, R.bark, false); t.r(22, 32, 6, 1, P.soil0); t.r(22, 36, 6, 1, P.soil0); });
  // Albor lantern on its bracket, with the hidden sap seam
  b.l(31, 11, 36, 11, P.ink); b.l(31, 12, 33, 14, P.ink); b.p(35, 12, P.ink); b.p(35, 13, P.ink);
  b.layer((t) => { t.r(33, 14, 5, 1, P.mist); t.r(32, 15, 7, 1, P.mist); t.r(33, 16, 5, 6, P.butter); t.r(33, 16, 1, 6, P.ember4); t.r(35, 16, 1, 6, P.cream); t.r(32, 22, 7, 1, P.mist); });
  b.p(34, 22, SAP.s2); b.p(35, 22, SAP.s2); b.p(36, 22, SAP.s2); b.p(36, 22, SAP.sheen);
  b.glow(35.5, 18.5, 11, P.plum3, .55, [P.plum1, P.plum2, P.sea0]);
  // cobbles
  b.r(0, 38, AW, 10, P.plum1);
  const rr = rng(5); for (let y = 39; y < 48; y += 3) for (let x = (y % 2) * 2; x < AW; x += 5 + Math.floor(rr() * 2)) { b.r(x, y, 3, 2, P.plum2); b.p(x, y, P.plum3); }
  b.r(0, 38, AW, 1, P.ink);
  // window and door light falling on the street
  b.glow(12, 40, 10, P.soil1, .55, [P.plum1, P.plum2, P.plum3]);
  b.glow(24, 40, 7, P.ember1, .6, [P.plum1, P.plum2, P.plum3, P.soil1]);
  // the oil trail: glowing drips from the door to Tila
  [[29, 41], [32, 43], [35, 41], [38, 44], [41, 42], [44, 44]].forEach(([x, y], i) => { b.p(x, y, i % 2 ? P.ember4 : P.butter); b.p(x + 1, y, P.ember3); b.glow(x + .5, y + .5, 2.2, P.soil1, .7, [P.plum1, P.plum2, P.plum3]); });
  return hd(b, (g) => { HD.mecha(g, 25.5, 37.5, { emo: "surprised", rim: P.ember3 }); HD.tilaRun(g, 51, 46.5); });
};

/* Turno de Noche (Sombra, Nim): Nim waits on the doorstep; far up the hills, the lamps of the dig.
   Lore: "Mum said she'd come back when she stopped smelling of earth." The pebble under the cobble is where Nim keeps things. */
SCENE.night = () => {
  const b = new Pic(AW, AH);
  b.grad(0, 0, AW, 30, [P.ink, P.ink, P.plum1, P.plum2]);
  b.stars(0, 0, AW, 14, 20, 23);
  // moon
  for (let y = 3; y < 15; y++) for (let x = 46; x < 58; x++) { const a = Math.hypot(x + .5 - 51.5, y + .5 - 8.5), c2 = Math.hypot(x + .5 - 53.8, y + .5 - 7.2); if (a < 5 && c2 > 4.3) b.p(x, y, a > 4.2 ? P.mist : P.fog); }
  // far hills with the dig lamps
  b.poly([[0, 30], [0, 24], [10, 21], [22, 23], [34, 18], [46, 21], [56, 17], [64, 19], [64, 30]], P.plum2);
  b.poly([[0, 34], [0, 28], [16, 26], [28, 29], [42, 25], [54, 27], [64, 25], [64, 34]], P.plum1);
  [[36, 19], [39, 20], [57, 18], [33, 20]].forEach(([x, y]) => { b.p(x, y, P.ember3); b.glow(x + .5, y + .5, 2.5, P.plum3, .6, [P.plum2]); });
  // the path up to them
  b.poly([[30, 48], [38, 48], [44, 36], [48, 30], [46, 29], [40, 35]], P.plum2);
  b.l(46, 29, 52, 26, P.plum3); b.l(47, 29, 53, 27, P.plum2);
  // mist band
  for (let y = 28; y < 34; y++) for (let x = 0; x < AW; x++) if (bay(x, y) < .22 - Math.abs(y - 31) * .06) b.p(x, y, P.plum3);
  // ground
  b.r(0, 34, AW, 14, P.plum1); b.poly([[30, 48], [38, 48], [44, 36], [40, 35]], P.plum2);
  for (let i = 0, r = rng(9); i < 40; i++) b.p(Math.floor(r() * AW), 35 + Math.floor(r() * 13), r() < .5 ? P.ink : P.plum2);
  // the hut: patched planks, low roof
  b.r(1, 16, 26, 22, P.soil0);
  for (let x = 2; x < 27; x += 4) b.r(x, 17, 1, 21, P.ink);
  b.r(6, 20, 3, 4, P.soil1); b.r(21, 25, 4, 3, P.plum2);
  b.poly([[-2, 18], [14, 8], [30, 18]], P.plum1); b.l(-2, 18, 14, 8, P.plum3); b.l(14, 8, 30, 18, P.ink);
  for (let x = 2; x < 28; x += 3) b.l(x, 18, x + 1, 15 + Math.abs(x - 14) * .3, P.plum2);
  // doorway with one candle inside
  b.r(10, 23, 9, 15, P.ink); b.r(11, 24, 7, 14, P.ember0);
  b.glow(14.5, 30, 7, P.ember1, 1.2, [P.ember0]); b.glow(14.5, 31, 4, P.ember2, .8, [P.ember1]);
  b.r(14, 30, 1, 3, P.butter); b.p(14, 29, P.ember4);
  b.glow(14.5, 39, 7, P.soil0, .7, [P.plum1, P.plum2]);
  b.r(9, 37, 11, 2, P.plum3); b.r(9, 37, 11, 1, P.mist);
  // the lifted cobble and the pebble
  b.layer((t) => { t.r(25, 42, 5, 2, P.plum3); t.r(25, 42, 5, 1, P.mist); });
  b.layer((t) => t.se(31.5, 44, 1.6, 1.3, R.wood, false));
  b.p(31, 43, P.cream);
  return hd(b, (g) => { HD.nimSit(g, 23, 37.5, { dir: 1, rim: P.ember2, emo: "sad" }); });
};

/* Ola Perdida (Agua, Vidriela): Orilla kneels at the Lago Espejo and sets a folded letter afloat,
   towards the red glow of the Cráter where her sister Ola works. Lore: "My sister said she'd write when the heat went down." */
SCENE.lostwave = () => {
  const b = new Pic(AW, AH);
  b.grad(0, 0, AW, 23, [P.sea0, P.rose0, P.ember1, P.ember2, P.ember3]);
  b.stars(0, 0, 40, 6, 6, 3);
  // the Cráter on the horizon, smoking
  b.poly([[36, 23], [44, 15], [48, 14], [52, 15], [62, 23]], P.ember0);
  b.r(45, 14, 6, 1, P.ember1); b.p(47, 13, P.ember2); b.p(48, 13, P.ember3);
  for (let i = 0; i < 9; i++) { const y = 12 - i, x = 48 + Math.round(Math.sin(i * .7) * 2) + i * .4; b.e(x, y, 1.6 + i * .15, 1.1, i % 2 ? P.rose0 : P.ember1); }
  b.poly([[0, 23], [0, 19], [12, 18], [24, 20], [36, 23]], P.plum1);
  // the lake, mirroring the sky
  b.grad(0, 23, AW, 25, [P.ember2, P.ember1, P.rose0, P.sea0, P.sea0]);
  b.poly([[36, 23], [62, 23], [52, 28], [44, 28]], P.ember0);
  for (let y = 24; y < 48; y += 2) for (let x = (y * 7) % 5; x < AW; x += 6 + (y % 4)) { const c = y < 30 ? P.ember3 : y < 38 ? P.rose1 : P.sea1; b.r(x, y, 2 + (x % 3), 1, c); }
  b.r(0, 23, AW, 1, P.ember3);
  // a first boat, far out already
  b.r(48, 31, 3, 1, P.fog); b.p(49, 30, P.cream);
  // shore in the foreground
  b.poly([[0, 48], [0, 33], [8, 33], [20, 37], [30, 42], [34, 48]], P.soil1);
  b.poly([[0, 48], [0, 37], [10, 37], [22, 41], [29, 48]], P.soil0);
  b.l(8, 33, 20, 37, P.soil2); b.l(20, 37, 30, 42, P.soil2);
  [[3, 33], [6, 33], [13, 35], [17, 36]].forEach(([x, y]) => { b.l(x, y, x - 1, y - 3, P.moss1); b.l(x + 1, y, x + 2, y - 2, P.moss2); });
  // the folded letter boat, ripples
  b.layer((t) => { t.poly([[31, 42], [39, 42], [37, 44], [33, 44]], P.cream); t.poly([[34, 42], [35, 37], [37, 42]], P.fog); });
  b.p(35, 39, P.mist); b.r(33, 43, 4, 1, P.fog);
  [[28, 46, 4], [40, 46, 4], [30, 45, 2], [39, 45, 2]].forEach(([x, y, w]) => b.r(x, y, w, 1, P.sea2));
  return hd(b, (g) => { HD.vidriela(g, 9, 30); HD.orilla(g, 23, 41.5); });
};

/* Noticia Vendida (Rayo, Relampín): over the clouds of Los Altos a hooded buyer pays for a sealed scroll.
   Lore: in the Heights, knowing something first is worth more than gold. The seal is a lantern: the news is about Albor. */
SCENE.news = () => {
  const b = new Pic(AW, AH);
  b.grad(0, 0, AW, 34, [P.sea2, P.sea3, P.sea3, P.sea4]);
  // sea of clouds below
  const cl = (x, y, rx, ry) => { b.e(x, y, rx, ry, P.fog); b.e(x - rx * .25, y - ry * .35, rx * .7, ry * .6, P.cream); };
  [[6, 31, 9, 4], [22, 33, 10, 4], [40, 32, 11, 5], [58, 31, 9, 4]].forEach((q) => cl(...q));
  b.r(0, 34, AW, 14, P.fog); for (let x = 0; x < AW; x += 7) b.e(x + 3, 35, 4, 1.6, P.cream);
  // wind streaks
  [[4, 8, 9], [16, 14, 6], [44, 6, 8]].forEach(([x, y, w]) => { b.r(x, y, w, 1, P.cream); b.r(x + w, y - 1, 3, 1, P.cream); });
  // the cliff ledge
  b.layer((t) => { t.poly([[-1, 48], [-1, 30], [10, 28], [26, 29], [34, 31], [36, 48]], (x, y) => y < 31 ? P.fog : x < 8 ? P.mist : P.plum3); });
  b.l(0, 30, 10, 28, P.cream); b.l(10, 28, 26, 29, P.cream);
  for (let i = 0, r = rng(4); i < 14; i++) { const x = 2 + Math.floor(r() * 30), y = 33 + Math.floor(r() * 14); b.r(x, y, 2, 1, P.plum2); }
  // the stall: posts, striped awning, a bell
  b.r(39, 13, 2, 23, P.soil1); b.r(60, 13, 2, 23, P.soil1); b.r(39, 13, 1, 23, P.soil2);
  b.layer((t) => { for (let x = 36; x < 64; x++) { const s = Math.floor((x - 36) / 4) % 2; t.r(x, 9, 1, 5, s ? P.cream : P.rose1); t.p(x, 14, (x % 4 < 2) ? (s ? P.cream : P.rose1) : null); } });
  b.r(36, 9, 28, 1, P.rose0);
  b.layer((t) => { t.r(38, 34, 25, 4, P.soil2); t.r(38, 34, 25, 1, P.soil3); });
  b.r(38, 38, 25, 10, P.soil1); for (let x = 40; x < 63; x += 4) b.r(x, 38, 1, 10, P.soil0);
  b.layer((t) => t.e(50.5, 16.5, 1.5, 1.5, P.ember4)); b.l(50, 14, 50, 15, P.ink);
  // jars of rumours on the counter
  b.layer((t) => { t.se(56.5, 32, 1.8, 2, R.glass, false); t.se(60, 32.5, 1.5, 1.5, R.glass, false); });
  b.p(56, 31, P.butter); b.p(60, 32, P.rose2);
  return hd(b, (g) => { HD.buyer(g, 47, 34.5); HD.relampin(g, 21, 28.5); });
};

/* Cosecha Negra (Seta, pacto, Capuchón): Esporina harvests black caps around a pool of Savia in the
   Fondo Blanco; the drops fall upwards. Lore: "Its cap grows best where the sap is blackest. Esporina says that's a good sign." */
SCENE.harvest = () => {
  const b = new Pic(AW, AH);
  // ice cave wall
  b.grad(0, 0, AW, 34, [P.sea0, P.sea0, P.sea1, P.sea2]);
  for (let i = 0, r = rng(31); i < 12; i++) { const x = Math.floor(r() * AW), y = 6 + Math.floor(r() * 22); b.l(x, y, x + 2 + Math.floor(r() * 3), y + 3, P.sea1); }
  // icicles
  for (let x = 1; x < AW; x += 5) { const L = 3 + ((x * 7) % 6); b.layer((t) => t.poly([[x, 0], [x + 3.5, 0], [x + 1.7, L]], (px) => px < x + 1.5 ? P.cream : P.sea4)); }
  b.r(0, 0, AW, 1, P.ink);
  // snow floor
  b.grad(0, 32, AW, 16, [P.fog, P.cream, P.cream]);
  b.r(0, 32, AW, 1, P.mist);
  for (let x = 0; x < AW; x += 9) b.e(x + 4, 33, 5, 1.4, P.cream);
  // the pool of Savia, dark and wet
  b.e(31, 40, 15, 5, SAP.s1); b.e(31, 40.5, 13, 4, SAP.s0);
  b.e(27, 39, 4, 1, SAP.s2); b.r(24, 39, 2, 1, SAP.sheen); b.p(36, 42, SAP.sheen);
  // the snow it has touched goes grey
  b.glow(31, 40, 19, P.mist, .55, [P.fog, P.cream]);
  // drops falling upwards
  [[22, 28], [30, 22], [37, 26], [33, 15], [26, 18]].forEach(([x, y]) => dropUp(b, x, y));
  // black caps around the pool (bigger where the sap is closer)
  const cap = (x, y, s) => b.layer((t) => { t.r(x - 0, y - s, 2, s + 1, P.fog); t.e(x + 1, y - s - 1, s + 1.2, s * .6 + .5, SAP.s1); t.e(x + .6, y - s - 1.4, s * .7, s * .3, SAP.s2); });
  [[10, 41, 3], [15, 46, 2], [47, 44, 3], [41, 47, 2], [18, 36, 2], [44, 36, 2], [25, 47, 1], [34, 47, 1], [22, 34, 1]].forEach(([x, y, s]) => { cap(x, y, s); b.p(x, y - s - 2, P.rose2); });
  // snowflakes
  [[6, 10], [18, 6], [44, 12], [56, 20], [10, 24], [50, 4]].forEach(([x, y]) => b.p(x, y, P.cream));
  return hd(b, (g) => { HD.capuchon(g, 8.5, 33); HD.esporina(g, 55, 46.5); });
};

/* Dueto (Estrella, Unísona): on the stepping stones of el Vado, Tila (day side) and Nim (night side)
   sing their peoples' lullabies at once; the two notes meet and a star is born. Lore: the canonical birth of Unísona. */
SCENE.duet = () => {
  const b = new Pic(AW, AH);
  // the sky splits: dusk on Tila's side, night on Nim's
  const day = new Pic(AW, AH), nig = new Pic(AW, AH);
  day.grad(0, 0, AW, 36, [P.ember2, P.ember3, P.ember4, P.butter]);
  nig.grad(0, 0, AW, 36, [P.ink, P.sea0, P.plum1, P.plum2]);
  nig.stars(32, 0, 32, 22, 16, 7);
  for (let y = 0; y < 36; y++) for (let x = 0; x < AW; x++) { const f = x - 30 - (y - 18) * .25 + (bay(x, y) - .5) * 3; b.p(x, y, f < 0 ? day.g(x, y) : nig.g(x, y)); }
  // rooftops of el Vado: warm windows on the left, dark on the right
  b.poly([[0, 36], [0, 26], [5, 22], [10, 26], [10, 24], [16, 20], [22, 25], [22, 36]], P.soil1);
  b.poly([[0, 36], [0, 26], [5, 22], [10, 26]], P.soil0);
  b.r(3, 28, 2, 2, P.butter); b.r(14, 26, 2, 2, P.butter); b.r(18, 30, 2, 2, P.ember4);
  b.poly([[42, 36], [42, 25], [48, 20], [54, 25], [54, 23], [59, 19], [64, 23], [64, 36]], P.plum1);
  b.r(46, 28, 2, 2, P.plum2); b.r(59, 27, 2, 2, P.plum3);
  // the stream and the stepping stones (the ford)
  b.grad(0, 36, AW, 12, [P.sea2, P.sea1, P.sea0]);
  b.r(0, 36, AW, 1, P.sea3);
  for (let y = 38; y < 48; y += 2) for (let x = (y * 5) % 7; x < AW; x += 7) b.r(x, y, 3, 1, y < 42 ? P.sea3 : P.sea2);
  [[6, 42, 4], [19, 41, 5], [32, 43, 4], [45, 41, 5], [58, 42, 4]].forEach(([x, y, r2]) => { b.layer((t) => t.se(x, y, r2, 2.2, R.stone, false)); b.r(x - r2 + 1, y + 2, r2 * 2 - 1, 1, P.sea3); });
  // the two notes rising and meeting in the middle
  const path = (x0, y0, side) => { for (let i = 0; i <= 4; i++) { const t2 = i / 4, x = x0 + (31 - x0) * t2, y = y0 + (12 - y0) * t2 - Math.sin(t2 * Math.PI) * 5; if (i > 0 && i < 4) b.layer((t) => note(t, Math.round(x) - 1, Math.round(y), side ? P.glim1 : P.cream, i % 2 === 0)); } };
  path(21, 26, 0); path(44, 26, 1);
  // the star being born
  b.e(32.5, 11.5, 8, 8, null); b.glow(32.5, 11.5, 6, P.cream, .5);
  const ray = (dx, dy, c, n) => { for (let i = 2; i <= n; i++) b.p(32 + dx * i, 11 + dy * i, c); };
  ray(0, -1, P.ember4, 5); ray(1, 0, P.sea3, 5); ray(0, 1, P.rose2, 5); ray(-1, 0, P.glim1, 5);
  ray(1, -1, P.cream, 2); ray(-1, -1, P.cream, 2); ray(1, 1, P.cream, 2); ray(-1, 1, P.cream, 2);
  b.r(31, 10, 3, 3, P.cream); b.p(32, 11, P.butter);
  b.p(31, 10, P.ink); b.p(33, 10, P.ink); b.p(31, 12, P.ink); b.p(33, 12, P.ink);
  return hd(b, (g) => { HD.tilaSit(g, 19, 40.5); HD.nimSit(g, 45, 39.5, { dir: -1, rim: P.glim1, emo: "happy" }); });
};

/* ================= Sol: Luz, Fuego, Planta ================= */
const NOTE = {};
const ladder = (b, x0, y0, x1, y1) => { b.l(x0, y0, x1, y1, P.soil1); b.l(x0 + 3, y0, x1 + 3, y1, P.soil1); for (let t = .08; t < 1; t += .14) { const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; b.l(x, y, x + 3, y, P.soil2); } };
const pot = (g, x, y, r = 3) => { HD.shape(g, (gg) => { gg.moveTo(x - r, y - r * 1.1); gg.lineTo(x + r, y - r * 1.1); gg.quadraticCurveTo(x + r + .6, y, x, y + .2); gg.quadraticCurveTo(x - r - .6, y, x - r, y - r * 1.1); gg.closePath(); }, { fill: P.plum2, shade: P.plum1, light: P.plum3, lw: .3 }); };
const steam = (g, x, y, n = 3) => { for (let i = 0; i < n; i++) HD.stroke(g, (gg) => { gg.moveTo(x + i * 1.4 - 1.4, y); gg.bezierCurveTo(x + i * 1.4 - 2.4, y - 2, x + i * 1.4, y - 3, x + i * 1.4 - 1, y - 5.4); }, "rgba(251,246,239,.75)", .45); };

/* --- Luz (Lumo, Mecha) --- */
NOTE.flash = { scene: "Un farolero de Albor sube la escalera y encuentra el farol vacío. La chispa se le escapa calle abajo convertida en Lumo, que se ríe y deja un rastro de luz.", hidden: "Bajo el farol vacío asoma la línea de savia de 1 píxel: hasta los faroles apagados de Albor la llevan." };
SCENE.flash = () => { const b = PL.street({ sky: "night", seed: 7 });
  lamp(b, 20, 24, { off: true, h: 21, sap: true }); ladder(b, 10, 46, 15, 22);
  [[24, 21], [29, 19], [34, 18], [39, 18]].forEach(([x, y], i) => { b.p(x, y, i % 2 ? P.ember4 : P.butter); b.glow(x + .5, y + .5, 2.5, P.plum3, .6); });
  return hd(b, (g) => { F(g, 13.4, 34, CAST.albor, { front: [18.6, 21.4], back: [11.6, 30.6], emo: "open", rim: P.sea2 }); Cr(g, "lumo", 47, 22, { emo: "happy", rim: P.butter }); }); };

NOTE.lantern = { scene: "En un callejón del Barrio Apagado, una niña lee un papel a la luz de un farolillo que le cabe en la mano. Lumo se asoma por encima de su hombro.", hidden: "El papel lleva el sello del farol de Albor: es un aviso de desalojo." };
SCENE.lantern = () => { const b = PL.street({ poor: true, dim: true, seed: 11 });
  for (let i = 0; i < b.a.length; i++) if (b.a[i] && i % AW < 64) { const c = b.a[i]; if (c === P.fog || c === P.mist) b.a[i] = P.plum2; if (c === P.butter) b.a[i] = P.plum2; }
  b.glow(30, 36, 13, P.soil1, .7, [P.plum1, P.plum2, P.plum3, P.soil0]); b.glow(30, 36, 7, P.soil2, .6, [P.soil1, P.plum2, P.plum1]);
  return hd(b, (g) => { F(g, 27, 45, kid(CAST.poor), { pose: "kneel", front: [32, 37.6], back: [29.8, 38.4], rim: P.ember3 });
    glowDot(g, 32.6, 36.4, 1.1, P.butter, 18); HD.shape(g, (gg) => gg.roundRect(31.6, 35, 2, 2.6, .4), { fill: P.butter, lw: .25 });
    HD.shape(g, (gg) => gg.rect(28.6, 36.4, 3.2, 2.6), { fill: P.cream, shade: P.fog, lw: .22 }); HD.dot(g, 30.2, 37.6, .45, P.ember3);
    Cr(g, "lumo", 23, 33, { s: .7, emo: "o", rim: P.butter }); }); };

NOTE.spark = { scene: "Por la verja de una Casa del Farol, un niño noble le pasa su chispa (Lumo, todavía pequeño) a una niña del Barrio que espera fuera.", hidden: "En la ventana de arriba, una silueta de adulto lo está viendo todo." };
SCENE.spark = () => { const b = PL.street({ sky: "dusk", seed: 2 });
  b.r(0, 0, 30, 36, P.fog); for (let j = 3; j < 36; j += 4) b.r(0, j, 30, 1, P.mist); b.r(8, 6, 8, 10, P.ink); b.grad(9, 7, 6, 8, [P.butter, P.ember4]); b.r(11, 8, 2, 6, P.plum2); b.e(12, 8, 1.4, 1.4, P.plum2);
  b.r(0, 36, 31, 12, P.moss2); for (let x = 1; x < 30; x += 3) b.p(x, 38 + (x % 4), P.moss3);
  for (let x = 30; x < 36; x += 2) { b.r(x, 18, 1, 30, P.ink); b.p(x, 17, P.mist); } b.r(29, 24, 8, 1, P.ink); b.r(29, 40, 8, 1, P.ink);
  return hd(b, (g) => { F(g, 24, 45, kid(CAST.albor), { hat: null, hair: P.butter, front: [31, 36.5], rim: P.sea3 });
    F(g, 41, 45.5, kid(CAST.poor), { dir: -1, front: [35.5, 37], emo: "open", rim: P.ember3 }); Cr(g, "lumo", 33.2, 38.4, { s: .45, emo: "happy" }); glowDot(g, 33.2, 36.4, 1.4, P.butter, 16); }); };

NOTE.street = { scene: "En el Barrio Apagado solo una calle tiene luz. Tila sube la escalera para encender el último farol y Mecha la espera abajo, junto a la aceitera.", hidden: "Son catorce faroles, los de la Calle del Pozo Viejo; el resto del barrio sigue a oscuras." };
SCENE.street = () => { const b = PL.street({ poor: true, dim: true, seed: 19 });
  for (let i = 0; i < b.a.length; i++) { const c = b.a[i]; if (c === P.butter) b.a[i] = P.plum2; }
  [[60, 37, 5], [56, 37.5, 6], [51, 38.5, 7], [45, 39.5, 9], [38, 41, 11], [30, 43, 13], [21, 46, 16]].forEach(([x, by, h], i) => lamp(b, x, Math.round(by - h), { h, r: 5 + i }));
  ladder(b, 4, 47, 8, 27); return hd(b, (g) => { F(g, 7.4, 37, CAST.tila, { front: [10.4, 29.6], rim: P.ember3 }); glowDot(g, 10.8, 29, 1.6, P.butter, 18);
    HD.shape(g, (gg) => gg.roundRect(9.6, 26.4, 2.4, 3.4, .4), { fill: P.butter, lw: .25 }); Cr(g, "mecha", 16, 46, { emo: "happy", rim: P.ember3 });
    HD.shape(g, (gg) => gg.roundRect(20, 42.6, 3, 3.4, .5), { fill: P.mist, shade: P.plum3, light: P.fog, lw: .25 }); }); };

NOTE.ration = { scene: "Noche en el Barrio. Una vecina sirve sopa de una olla grande y la fila llega hasta la esquina. Mecha hace de fuego debajo de la olla.", hidden: "En el umbral de la derecha, un guardia de Albor apunta en una libreta quién viene a comer." };
SCENE.ration = () => { const b = PL.street({ poor: true, dim: true, seed: 29 });
  b.glow(24, 38, 16, P.soil1, .7, [P.plum1, P.plum2, P.plum3]); b.layer((t) => { t.r(14, 37, 20, 2, P.soil2); t.r(15, 39, 1, 7, P.soil1); t.r(32, 39, 1, 7, P.soil1); });
  b.r(56, 28, 6, 12, P.ink);
  return hd(b, (g) => { Cr(g, "mecha", 21, 37.4, { s: .7, emo: "happy", rim: P.ember3 }); pot(g, 21, 33, 3.4); steam(g, 21, 29);
    F(g, 12, 45.4, CAST.poor, { hairStyle: "bun", hair: P.soil0, front: [18, 31.4], rim: P.ember3 }); HD.stroke(g, (gg) => { gg.moveTo(18, 31.4); gg.lineTo(20, 33); }, P.mist, .4);
    F(g, 34, 45.4, kid(CAST.poor), { dir: -1, front: [29.4, 37.6], hold: (gg, x, y) => HD.shape(gg, (q) => HD.E(q, x - .6, y - .3, 1.3, .7), { fill: P.soil3, lw: .22 }) });
    F(g, 40, 45.6, CAST.night, { dir: -1 }); F(g, 46, 45.8, kid(CAST.poor), { dir: -1, hair: P.ink });
    F(g, 59, 39.5, CAST.albor, { dir: -1, s: .8, front: [56, 33.8], rim: P.plum3, hold: (gg, x, y) => HD.shape(gg, (q) => q.rect(x - 1.6, y - 1, 1.6, 2), { fill: P.cream, lw: .2 }) }); }); };

/* --- Fuego (Fuellito, Yunquerón) --- */
const bellowsPx = (b, x, y) => b.layer((t) => { t.poly([[x, y], [x + 12, y - 3], [x + 12, y + 3]], P.soil1); t.r(x + 12, y - 4, 2, 9, P.soil2); t.p(x + 4, y - 1, P.butter); t.p(x + 5, y, P.butter); t.p(x + 6, y - 1, P.ember3); });
NOTE.bellows = { scene: "Primer día en el Gremio de la Brasa: dos aprendices tiran de las cuerdas del gran fuelle y Fuellito salta encima para ayudar. Maese Tizón mira desde un lado, de brazos cruzados.", hidden: "El fuelle está remendado con un trozo de estandarte de Albor: el Gremio trabaja para ellos." };
SCENE.bellows = () => { const b = PL.forge({ fx: 50 }); bellowsPx(b, 26, 33); b.l(36, 26, 32, 10, P.soil2); b.l(38, 26, 40, 10, P.soil2);
  return hd(b, (g) => { Cr(g, "fuellito", 33, 29.6, { emo: "happy", rim: P.ember4 });
    F(g, 22, 45, kid(CAST.tizon), { s: .78, beard: null, hairStyle: "short", hair: P.soil0, front: [31.4, 22], rim: P.ember3 }); F(g, 44, 45, kid(CAST.tizon), { s: .76, beard: null, hairStyle: "bun", hair: P.ember0, dir: -1, front: [39.4, 22], rim: P.ember3 });
    F(g, 8, 45.4, CAST.tizon, { front: [9.6, 36.6], back: [7.2, 36.6], rim: P.ember2 }); }); };

NOTE.bread = { scene: "Descanso en la forja: Maese Tizón parte el pan que se ha cocido encima del yunque y le da el primer trozo a Fuellito. Los aprendices esperan su turno.", hidden: "El saco de harina bajo el banco lleva el farol de Albor: hasta el pan del Gremio lo pagan ellos." };
SCENE.bread = () => { const b = PL.forge({ fx: 52 });
  b.layer((t) => { t.r(24, 32, 14, 3, P.plum3); t.r(22, 31, 4, 2, P.plum3); t.r(28, 35, 6, 5, P.plum2); t.r(25, 40, 12, 2, P.plum2); }); b.r(24, 32, 14, 1, P.mist);
  b.layer((t) => { t.r(4, 39, 7, 6, P.soil3); t.r(5, 38, 5, 1, P.soil3); }); b.p(7, 41, P.ember3); b.p(6, 42, P.ember3); b.p(8, 42, P.ember3);
  return hd(b, (g) => { HD.shape(g, (gg) => HD.E(gg, 31, 30.4, 3.6, 1.8), { fill: P.soil3, shade: P.soil2, light: P.butter, lw: .3 }); steam(g, 31, 28);
    F(g, 18, 45.4, CAST.tizon, { front: [27.6, 30], rim: P.ember2, hold: (gg, x, y) => HD.shape(gg, (q) => HD.E(q, x + .6, y, 1.2, .8), { fill: P.soil3, lw: .22 }) });
    Cr(g, "fuellito", 41, 37, { dir: -1, emo: "happy", rim: P.ember4 }); F(g, 46, 45.4, kid(CAST.tizon), { s: .76, beard: null, hair: P.soil0, hairStyle: "short", dir: -1, pose: "sit" }); }); };

NOTE.piece = { scene: "La pared de las primeras piezas del Gremio: herraduras torcidas, clavos doblados, cada una con su nombre. Fuellito levanta la suya, la más torcida de la fila, muy orgulloso.", hidden: "Arriba del todo hay una herradura casi en zigzag con una T: la primera pieza de Maese Tizón." };
SCENE.piece = () => { const b = new Pic(AW, AH); bricks(b, 0, 0, AW, 40, P.soil0, P.ember0); b.r(0, 40, AW, 8, P.plum1); b.r(0, 40, AW, 1, P.ink);
  const r = rng(77); for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) { const x = 6 + i * 10 + (row % 2) * 4, y = 5 + row * 10; if (row === 2 && i > 3) continue; b.p(x, y, P.ink);
    for (let a = 0; a <= Math.PI; a += .2) b.p(x + Math.cos(a) * 2.6 + (r() - .5) * 1.4, y + 2 + Math.sin(a) * 2.6 + (r() - .5), P.mist); b.r(x - 1, y + 6, 3, 2, P.cream); }
  b.r(28, 0, 6, 3, P.ink); for (let i = 0; i < 6; i++) b.p(29 + i, 1 + (i % 2), P.ember3); b.p(31, 2, P.butter);
  b.glow(52, 36, 18, P.ember1, .5, [P.soil0, P.ember0]);
  return hd(b, (g) => { Cr(g, "fuellito", 30, 45.6, { emo: "happy", s: 1.15, rim: P.ember4 });
    HD.stroke(g, (gg) => { gg.moveTo(33, 37); gg.bezierCurveTo(31.6, 32, 36, 30.4, 38.4, 33.6); gg.lineTo(37, 36.4); }, P.ink, .9); HD.stroke(g, (gg) => { gg.moveTo(33, 37); gg.bezierCurveTo(31.6, 32, 36, 30.4, 38.4, 33.6); gg.lineTo(37, 36.4); }, P.mist, .5);
    F(g, 47, 46, kid(CAST.tizon), { s: .78, beard: null, hair: P.soil0, hairStyle: "short", dir: -1, front: [43, 38.6] }); }); };

NOTE.temper = { scene: "Maese Tizón hunde una hoja al rojo en el barril de agua y el vapor llena la forja. Yunquerón hace de yunque, con el borde del caparazón todavía brillando.", hidden: "Por la ventana se ve el cauce seco: el agua del barril viene del arroyo que represaron." };
SCENE.temper = () => { const b = PL.forge({ fx: 54, tools: false }); b.r(6, 6, 12, 10, P.ink); b.grad(7, 7, 10, 8, SKY.dusk); b.r(7, 12, 10, 3, P.soil1); b.l(7, 13, 16, 13, P.soil0); b.r(12, 6, 1, 10, P.ink);
  b.layer((t) => { t.r(36, 34, 9, 10, P.soil1); t.r(36, 34, 9, 1, P.soil2); t.r(36, 38, 9, 1, P.soil0); }); b.r(37, 35, 7, 1, P.sea2);
  return hd(b, (g) => { Cr(g, "yunqueron", 18, 45.4, { hot: true, emo: "normal", rim: P.ember3 });
    F(g, 28, 45.6, CAST.tizon, { front: [35.4, 33.4], back: [26.6, 37], rim: P.ember2, hold: (gg, x, y) => { HD.stroke(gg, (q) => { q.moveTo(x, y); q.lineTo(x + 4, y + 2.4); }, P.ember2, .7); } });
    g.save(); g.globalAlpha = .85; for (let i = 0; i < 5; i++) HD.shape(g, (gg) => HD.E(gg, 38 + i * 1.6 - 2, 30 - i * 2.4, 2.4 + i * .6, 1.8 + i * .3), { fill: P.fog, ink: false }); g.restore(); }); };

NOTE.anvil = { scene: "Al pie de la Forja Madre duerme Yunquerón, pequeño todavía, junto a la cáscara del huevo del que salió. El horno es tan grande que no cabe en la carta.", hidden: "Entre los ladrillos del horno corre una grieta con un hilo de luz de raíz: la Brasa Madre está conectada con algo de abajo." };
SCENE.anvil = () => { const b = new Pic(AW, AH); bricks(b, 0, 0, AW, 40, P.soil0, P.ember0);
  b.r(18, 0, 46, 40, P.plum2); bricks(b, 20, 0, 44, 40, P.plum2, P.plum1); b.e(46, 26, 15, 13, P.ink); b.r(31, 26, 30, 14, P.ink); b.e(46, 27, 13, 11, P.ember2); b.r(33, 27, 26, 13, P.ember2); b.grad(35, 18, 22, 22, [P.butter, P.ember4, P.ember3, P.ember2]);
  b.glow(46, 30, 34, P.ember1, .6, [P.soil0, P.ember0, P.plum2, P.plum1]); for (let y = 2; y < 16; y++) b.p(24 + Math.round(Math.sin(y * .6) * 1.5), y, y % 3 ? SAP.s2 : P.ember4); b.p(25, 9, P.butter);
  b.r(0, 40, AW, 8, P.plum1); b.r(0, 40, AW, 1, P.ink); b.glow(40, 42, 22, P.soil1, .7, [P.plum1]);
  return hd(b, (g) => { Cr(g, "yunqueron", 22, 45.4, { emo: "sleep", s: .9, rim: P.ember4 });
    HD.shape(g, (gg) => { gg.moveTo(8, 45.4); gg.quadraticCurveTo(8, 40.4, 11.4, 40); gg.lineTo(12.4, 41.4); gg.lineTo(13.4, 40.4); gg.quadraticCurveTo(14.8, 41.6, 14.8, 45.4); gg.closePath(); }, { fill: P.cream, shade: P.fog, lw: .3 }); }); };

NOTE.furnace = { scene: "Noche en el Gremio. Todos duermen menos Yunquerón, sentado en la puerta de la forja para que el horno no se enfríe. Mira hacia fuera.", hidden: "Fuera, a la luz de la luna, está la presa y el cauce seco del arroyo: por eso el Cráter respira fuego." };
SCENE.furnace = () => { const b = new Pic(AW, AH); bricks(b, 0, 0, AW, 48, P.soil0, P.ember0);
  b.r(26, 6, 36, 34, P.ink); b.grad(27, 7, 34, 18, SKY.night); b.stars(27, 7, 34, 8, 10, 13); b.e(54, 11, 2.4, 2.4, P.fog);
  b.poly([[27, 26], [36, 20], [52, 22], [61, 25], [61, 40], [27, 40]], P.plum1); b.r(38, 22, 4, 10, P.mist); b.r(38, 22, 4, 1, P.fog); b.r(42, 28, 19, 2, P.soil1); b.l(27, 33, 38, 30, P.soil1); b.r(27, 32, 11, 1, P.sea1);
  b.r(0, 40, AW, 8, P.plum1); b.r(0, 40, AW, 1, P.ink); b.e(8, 30, 6, 8, P.ember1); b.glow(8, 32, 16, P.ember1, .7, [P.soil0, P.ember0, P.plum1]); b.r(2, 26, 12, 14, P.ink); b.e(8, 34, 4, 4, P.ember2); b.r(5, 34, 6, 6, P.ember3);
  b.layer((t) => { t.r(14, 37, 10, 2, P.soil1); });
  return hd(b, (g) => { F(g, 18, 37.2, kid(CAST.tizon), { s: .72, beard: null, hair: P.soil0, hairStyle: "short", pose: "sit", emo: "closed" }); Cr(g, "yunqueron", 33, 45.4, { emo: "sad", rim: P.ember3 }); }); };

/* --- Planta (Brotín, Espinardo) --- */
NOTE.acorn = { scene: "Otoño en el Bosque Hondo. Brotín lleva tanto tiempo sentado al pie del roble que le han salido raíces y un caracol le cruza el sombrero. Espera a crecer.", hidden: "Entre las bellotas del suelo hay una negra, con brillo verde: la savia ya ha llegado a las raíces del roble." };
SCENE.acorn = () => { const b = PL.forest({}); trunk(b, 22, 0, 14, 40, P.soil0, P.soil1); b.poly([[22, 40], [18, 44], [24, 41], [36, 41], [42, 44], [36, 40]], P.soil0);
  const r = rng(61); for (let i = 0; i < 22; i++) { const x = Math.floor(r() * AW), y = Math.floor(r() * 46); b.p(x, y, [P.ember3, P.ember2, P.ember4][i % 3]); }
  [[12, 44], [44, 45], [50, 43], [8, 46]].forEach(([x, y]) => { b.r(x, y, 2, 2, P.soil2); b.p(x, y - 1, P.soil0); }); b.r(55, 45, 2, 2, SAP.s1); b.p(55, 45, SAP.sheen);
  return hd(b, (g) => { [[-2.6, 0], [0, .4], [2.4, 0]].forEach(([dx]) => HD.stroke(g, (gg) => { gg.moveTo(29 + dx * .6, 44); gg.quadraticCurveTo(29 + dx * 1.4, 45.6, 29 + dx * 2, 46.6); }, P.soil1, .4));
    Cr(g, "brotin", 29, 44.4, { emo: "sleep", s: 1.15, rim: P.moss4 });
    HD.shape(g, (gg) => { gg.arc(30.6, 33.6, 1, Math.PI, 0); gg.closePath(); }, { fill: P.soil3, lw: .22 }); HD.shape(g, (gg) => HD.E(gg, 30.6, 34, 1.4, .4), { fill: P.fog, lw: .2 }); }); };

NOTE.rings = { scene: "En un claro del Bosque Hondo, el Abuelo Liquen cuenta en voz alta los anillos de un tocón enorme mientras Brotín escucha. Cada anillo es un año.", hidden: "Uno de los anillos de fuera es negro: el año en que la savia subió." };
SCENE.rings = () => { const b = PL.forest({}); b.e(32, 40, 22, 6, P.soil0); b.e(32, 39, 20, 5, P.soil2); for (let k = 1; k < 9; k++) for (let a = 0; a < 6.3; a += .03) b.p(32 + Math.cos(a) * k * 2.2, 39 + Math.sin(a) * k * .55, k === 7 ? SAP.s2 : P.soil1); b.p(46, 40, SAP.sheen);
  b.r(10, 40, 44, 1, P.soil0); b.r(10, 41, 44, 4, P.soil1); b.r(10, 41, 1, 4, P.soil0); b.r(53, 41, 1, 4, P.soil0);
  return hd(b, (g) => { F(g, 22, 39.2, CAST.liquen, { pose: "sit", front: [30, 37.6], rim: P.moss4 }); Cr(g, "brotin", 45, 38.6, { dir: -1, emo: "o", rim: P.moss4 }); }); };

NOTE.seedling = { scene: "Dos niños se conocen en el borde del bosque: una del Bosque Hondo y otro del Envés. Plantan juntos la semilla de saludo y Brotín la riega con una hoja.", hidden: "En la fila de brotes de atrás, uno está seco: una amistad que no salió." };
SCENE.seedling = () => { const b = PL.forest({}); b.grad(0, 38, AW, 10, [P.soil1, P.soil0, P.soil0]); for (let x = 4; x < 60; x += 7) { if (x === 39) { b.l(x, 38, x + 1, 34, P.soil2); b.p(x + 2, 35, P.soil3); continue; } b.l(x, 38, x, 35, P.moss2); b.p(x - 1, 34, P.moss3); b.p(x + 1, 34, P.moss3); }
  b.r(29, 44, 6, 2, P.soil0);
  return hd(b, (g) => { F(g, 24, 46.6, kid(CAST.forest), { pose: "kneel", front: [30.6, 44.6], rim: P.moss4 }); F(g, 40, 46.6, kid(CAST.nightBare), { pose: "kneel", dir: -1, front: [33.4, 44.6], rim: P.moss4 });
    Cr(g, "brotin", 32, 38, { s: .75, emo: "happy" }); HD.shape(g, (gg) => HD.E(gg, 35.6, 33.4, 2.4, 1, -.5), { fill: P.moss3, shade: P.moss2, lw: .22 }); [[34.6, 36], [34, 38.6], [33.6, 41]].forEach(([x, y]) => HD.dot(g, x, y, .35, P.sea3)); }); };

NOTE.inward = { scene: "Dentro de un tronco hueco, Espinardo abraza a Brotín para darle calor. Por fuera no pincha; las púas que le crecen hacia dentro solo le hacen daño a él.", hidden: "Es una carta de Pacto: las líneas rojas del cuerpo de Espinardo son el precio, y Brotín no las ve." };
SCENE.inward = () => { const b = new Pic(AW, AH); b.grad(0, 0, AW, AH, [P.soil0, P.ink, P.ink]); b.e(32, 26, 26, 22, P.soil0); b.e(32, 26, 23, 19, P.ink);
  for (let a = 0; a < 6.3; a += .12) b.p(32 + Math.cos(a) * 24.5, 26 + Math.sin(a) * 20.5, P.soil1); b.e(32, 46, 22, 6, P.soil1); b.glow(32, 30, 18, P.plum1, .5, [P.ink]);
  return hd(b, (g) => { Cr(g, "brotin", 36, 42, { dir: -1, emo: "sleep", rim: P.moss3 }); Cr(g, "espinardo", 29, 42.4, { s: 1.35, emo: "closed", rim: P.moss3 });
    for (let i = 0; i < 6; i++) { const a = Math.PI * (1.05 + i * .17); HD.stroke(g, (gg) => { gg.moveTo(29 + Math.cos(a) * 5.4, 37 + Math.sin(a) * 4); gg.lineTo(29 + Math.cos(a) * 2.4, 37 + Math.sin(a) * 1.8); }, P.ember1, .35); } }); };

NOTE.outward = { scene: "Al borde del bosque, Espinardo se planta con las púas verdes erizadas delante de los pequeños. Algo se acerca desde la oscuridad.", hidden: "Los ojos de la sombra son los de un niño del Envés perdido, no los de un monstruo. Las púas avisan igual." };
SCENE.outward = () => { const b = PL.forest({ night: true }); b.grad(40, 0, 24, 48, [P.ink, P.ink, P.plum1]); for (let i = 0; i < b.a.length; i++) if (i % AW > 44 && b.a[i] === P.moss0) b.a[i] = P.ink;
  b.p(55, 34, P.butter); b.p(57, 34, P.butter);
  return hd(b, (g) => { Cr(g, "brotin", 10, 45.4, { emo: "surprised", s: .8 }); F(g, 18, 46, kid(CAST.forest), { s: .6, emo: "sad" });
    Cr(g, "espinardo", 33, 45.6, { s: 1.4, spines: P.moss4, emo: "normal", rim: P.moss3 }); }); };

NOTE.hedge = { scene: "Al atardecer, una familia del Envés llega a la puerta del Seto con sus fardos. El Abuelo Liquen les cierra el paso; Espinardo vigila desde arriba.", hidden: "Dentro del Seto, en la hierba, hay un juguete de trapo del Envés: alguien ya entró antes, o tuvo que salir." };
SCENE.hedge = () => { const b = new Pic(AW, AH); sky(b, "dusk", 30, 4); b.r(0, 12, AW, 30, P.moss0); for (let x = 0; x < AW; x += 3) b.e(x, 13, 3, 2.4, x % 2 ? P.moss1 : P.moss0); const r = rng(5); for (let i = 0; i < 60; i++) b.p(Math.floor(r() * AW), 14 + Math.floor(r() * 26), [P.moss1, P.moss2, P.ink][i % 3]);
  b.r(24, 20, 14, 22, P.soil0); b.e(31, 20, 7, 5, P.soil0); b.r(26, 22, 10, 20, P.plum1); grass(b, 40, [P.moss1, P.moss0, P.moss2], 7); b.r(27, 41, 3, 2, P.plum3); b.p(28, 40, P.ember3);
  return hd(b, (g) => { F(g, 30.6, 42, CAST.liquen, { dir: 1, front: [35.6, 33.6], rim: P.ember3 });
    F(g, 44, 46.4, CAST.night, { dir: -1, front: [40.4, 38.8], rim: P.ember3, hold: (gg, x, y) => HD.shape(gg, (q) => HD.E(q, x + 1.4, y + 1.6, 2.2, 1.8), { fill: P.soil2, lw: .25 }) });
    F(g, 52, 46.6, kid(CAST.nightBare), { dir: -1, emo: "sad", rim: P.ember3 }); Cr(g, "espinardo", 46, 15, { dir: -1, s: .9, rim: P.ember3 }); }); };
/* ================= Cielo: Rayo, Aire, Música ================= */
const puff = (g, x0, y0, x1, y1) => HD.stroke(g, (gg) => { gg.moveTo(x0, y0); gg.bezierCurveTo((x0 + x1) / 2, y0 - 3, (x0 + x1) / 2, y1 + 3, x1, y1); }, "rgba(251,246,239,.9)", .6);
const rope = (b, x0, y0, x1, y1, sag = 3, c = P.soil1) => { for (let t = 0; t <= 1; t += .01) b.p(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag, c); };

/* --- Aire (Fizz) --- */
NOTE.gust = { scene: "Mediodía en Los Altos. Fizz dormita sobre los tendederos y suelta tres soplos sin querer: un sombrero, una carta y un calcetín salen volando, cada uno hacia un sitio.", hidden: "La carta vuela directa hacia la Aguja del fondo, donde gira la Veleta Mayor: allí acaban todas las palabras que el viento se lleva." };
SCENE.gust = () => { const b = PL.heights({}); b.layer((t) => { t.r(2, 18, 2, 30, P.soil1); t.r(36, 16, 2, 32, P.soil1); }); rope(b, 3, 19, 37, 17, 4, P.soil0);
  [[8, 21, P.rose1], [14, 22, P.sea2], [22, 22, P.ember4], [29, 21, P.cream]].forEach(([x, y, c]) => b.layer((t) => t.r(x, y, 4, 5, c)));
  b.layer((t) => t.poly([[0, 34], [0, 30], [20, 31], [40, 33], [40, 48], [0, 48]], P.mist)); b.l(0, 30, 20, 31, P.fog); b.l(20, 31, 40, 33, P.fog);
  return hd(b, (g) => { Cr(g, "fizz", 12, 14, { emo: "sleep", rim: P.sea2 }); puff(g, 18, 11, 30, 8); puff(g, 18, 12.5, 32, 13); puff(g, 18, 14, 30, 17);
    HD.shape(g, (gg) => HD.E(gg, 33, 7.4, 2, .7, -.2), { fill: P.ember3, lw: .25 }); HD.shape(g, (gg) => HD.E(gg, 33, 6.6, 1, .8), { fill: P.ember3, lw: .25 });
    HD.shape(g, (gg) => gg.rect(40, 11, 3, 2), { fill: P.cream, lw: .22 }); HD.dot(g, 41.5, 12, .35, P.ember1); HD.shape(g, (gg) => HD.blob(gg, [[34, 17], [36, 16.6], [36.4, 19], [35, 19.4]]), { fill: P.rose2, lw: .22 });
    F(g, 26, 44, CAST.heights, { dir: 1, front: [30, 33], emo: "open", rim: P.sea2 }); }); };

NOTE.cloud = { scene: "En un tejado de Los Altos, Fizz se ha quedado dormida con forma de nube y una almohada debajo. Un niño ha subido a echarse la siesta encima.", hidden: "La almohada es de lana del Fondo Blanco: en los Altos hasta el descanso viene de fuera." };
SCENE.cloud = () => { const b = PL.heights({ spire: true }); b.layer((t) => t.poly([[0, 48], [0, 36], [24, 28], [48, 36], [48, 48]], P.ember1)); for (let x = 0; x < 48; x += 3) b.l(x, 48, x + 12, 34 + Math.abs(24 - x) * .1, P.ember0); b.l(0, 36, 24, 28, P.ember2); b.l(24, 28, 48, 36, P.ember2);
  b.layer((t) => { t.r(40, 22, 4, 10, P.soil1); }); b.r(40, 22, 4, 1, P.soil2);
  return hd(b, (g) => { Cr(g, "fizz", 24, 31, { s: 2.1, emo: "sleep", rim: P.sea2 }); HD.shape(g, (gg) => gg.roundRect(12, 24, 6, 3, 1.2), { fill: P.cream, shade: P.fog, lw: .25 });
    F(g, 22, 23.6, kid(CAST.heights), { pose: "sit", emo: "closed", hat: null, rim: P.sea3 }); }); };

NOTE.rain = { scene: "Fizz, gris y cargada, llueve despacio sobre un campo del Prado manchado de savia. Un campesino la mira desde debajo del paraguas: las manchas se van.", hidden: "El agua que se lleva la savia no desaparece: baja en un hilo oscuro por la ladera, camino del Lago." };
SCENE.rain = () => { const b = PL.meadow({ sky: "grey", flowers: false }); const r = rng(8);
  for (let i = 0; i < 8; i++) { const x = 4 + Math.floor(r() * 56), y = 37 + Math.floor(r() * 9); b.e(x, y, 2 + r() * 2, 1, i < 4 ? SAP.s1 : P.moss1); }
  for (let x = 30; x < AW; x++) { const y = 40 + (x - 30) * .25 + Math.sin(x * .5); b.p(x, y, SAP.s2); if (x % 9 === 0) b.p(x, y, SAP.sheen); }
  for (let i = 0; i < 40; i++) { const x = 6 + Math.floor(r() * 30), y = 14 + Math.floor(r() * 30); b.p(x, y, P.sea3); b.p(x, y + 1, P.sea2); }
  return hd(b, (g) => { Cr(g, "fizz", 20, 15, { s: 1.7, emo: "closed", rim: P.plum3 }); g.save(); g.globalAlpha = .55; HD.shape(g, (gg) => HD.E(gg, 20, 9, 9, 5), { fill: P.mist, ink: false }); g.restore();
    F(g, 48, 45, CAST.forest, { dir: -1, front: [46, 35], emo: "open", rim: P.fog, hold: (gg, x, y) => { HD.stroke(gg, (q) => { q.moveTo(x, y); q.lineTo(x, y - 6); }, P.ink, .35); HD.shape(gg, (q) => { q.moveTo(x - 4.6, y - 5.4); q.quadraticCurveTo(x, y - 10, x + 4.6, y - 5.4); q.closePath(); }, { fill: P.ember1, shade: P.ember0, lw: .3 }); } }); }); };

/* --- Rayo (Relampín) --- */
NOTE.errand = { scene: "Relampín cruza a toda velocidad el puente de cuerda entre dos agujas de Los Altos, con tres pergaminos atados a la espalda.", hidden: "Uno de los tres sellos está agrietado: es la noticia falsa. Él solo corre." };
SCENE.errand = () => { const b = PL.heights({ spire: false }); b.layer((t) => { t.poly([[0, 48], [0, 20], [6, 16], [12, 20], [12, 48]], P.mist); t.poly([[52, 48], [52, 22], [58, 17], [64, 22], [64, 48]], P.mist); });
  b.r(0, 20, 12, 1, P.fog); b.r(52, 22, 12, 1, P.fog); rope(b, 12, 24, 52, 26, 5, P.soil1); rope(b, 12, 21, 52, 23, 5, P.soil2); for (let x = 14; x < 52; x += 3) { const s = Math.sin((x - 12) / 40 * Math.PI) * 5; b.l(x, 21 + (x - 12) * .05 + s, x, 24 + (x - 12) * .05 + s, P.soil2); }
  return hd(b, (g) => { HD.relampin(g, 28, 29); [[24.4, 22, P.ember1], [26.6, 21.4, P.sea2], [28.6, 22.2, SAP.s1]].forEach(([x, y, c]) => { g.save(); g.translate(x, y); g.rotate(-.3); scroll(g, -1.6, 0, 3.2, c); g.restore(); });
    HD.stroke(g, (gg) => { gg.moveTo(28.4, 21.4); gg.lineTo(29, 23); }, P.ember4, .2); [[14, 26], [10, 27], [16, 28]].forEach(([x, y]) => HD.stroke(g, (gg) => { gg.moveTo(x, y); gg.lineTo(x + 5, y); }, P.cream, .4)); }); };

NOTE.static = { scene: "En la plaza del Vado, una niña ha acariciado el lomo de Relampín: se ha enterado de la última noticia y se ha quedado tiesa, con el pelo de punta. Los vecinos se ríen.", hidden: "Las chispas del pelo dibujan la forma de un rayo, el símbolo de la Aguja del Trueno." };
SCENE.static = () => { const b = PL.vado({});
  return hd(b, (g) => { HD.relampin(g, 22, 40); F(g, 32, 40.4, kid(CAST.heights), { dir: -1, hat: null, hair: P.soil2, front: [27.6, 33.4], emo: "open", rim: P.butter });
    [[-1.6, -18], [-.4, -19], [.8, -18.6], [1.8, -17.6]].forEach(([dx, dy]) => HD.stroke(g, (gg) => { gg.moveTo(32 + dx * .7 - .2, 40.4 + dy * .62 + 2); gg.lineTo(32 + dx, 40.4 + dy * .62); }, P.soil2, .5));
    [[30, 26.4], [31.4, 25.4], [33, 26], [34.4, 27.4]].forEach(([x, y]) => glowDot(g, x, y, .35, P.butter, 6));
    HD.stroke(g, (gg) => { gg.moveTo(31, 24); gg.lineTo(32.6, 22.6); gg.lineTo(31.8, 22.6); gg.lineTo(33.4, 21); }, P.butter, .35);
    F(g, 46, 40.6, CAST.water, { dir: -1, sing: true, front: [43, 33] }); F(g, 54, 40.8, CAST.forest, { dir: -1, emo: "closed" }); }); };

/* --- Música (Trinilla) --- */
NOTE.highnote = { scene: "De noche en Los Altos, Trinilla se posa en una ventana y silba hacia dentro el apellido de la familia. Abajo, en la sombra, alguien espera con la bolsa abierta.", hidden: "Las notas que salen de la ventana tienen la misma forma que la placa con el nombre de la puerta." };
SCENE.highnote = () => { const b = PL.heights({ sky: "night", spire: true });
  b.r(0, 8, 34, 40, P.plum2); for (let j = 10; j < 48; j += 4) b.r(0, j, 34, 1, P.plum1); b.r(10, 14, 12, 10, P.ink); b.grad(11, 15, 10, 8, [P.butter, P.ember4]); b.r(16, 14, 1, 10, P.ink); b.r(9, 24, 14, 2, P.mist);
  b.glow(16, 20, 14, P.plum3, .5, [P.plum2, P.plum1]); b.r(4, 34, 8, 14, P.ink); b.r(5, 32, 6, 2, P.cream); b.r(6, 33, 4, 1, P.rose1);
  return hd(b, (g) => { Cr(g, "trinilla", 26, 24, { dir: -1, emo: "closed", rim: P.butter }); [[22, 16, P.rose2], [26, 13, P.rose1], [31, 12, P.rose2]].forEach(([x, y, c]) => noteG(g, x, y, c));
    F(g, 46, 45, CAST.night, { dir: -1, front: [40.6, 37], rim: P.plum3, hold: (gg, x, y) => coin(gg, x - .4, y - 1) }); }); };

NOTE.deal = { scene: "En el balcón del Coro de los Tres, Céfira, Centella y Arpegio cantan un trato a un mercader del Gremio. Las notas le atan la muñeca como una cinta.", hidden: "Una de las notas de la cinta tiene otro color: la nota desafinada por la que el trato se puede romper." };
SCENE.deal = () => { const b = PL.heights({ spire: false }); b.r(0, 26, 40, 22, P.fog); for (let j = 28; j < 48; j += 4) b.r(0, j, 40, 1, P.mist); b.layer((t) => { t.r(0, 25, 40, 2, P.cream); for (let x = 2; x < 40; x += 4) t.r(x, 27, 1, 5, P.cream); });
  return hd(b, (g) => { F(g, 8, 25, CAST.heights, { hat: { k: "scarf", c: [P.sea3, P.sea2] }, cloth: [P.sea3, P.sea2, P.sea4], sing: true, robe: true });
    F(g, 18, 25, CAST.heights, { hat: { k: "scarf", c: [P.butter, P.ember4] }, cloth: [P.butter, P.ember4, P.cream], sing: true, robe: true, hair: P.ember3 });
    F(g, 28, 25, CAST.coplo, { hat: { k: "scarf", c: [P.rose1, P.rose0] }, sing: true, robe: true });
    Cr(g, "trinilla", 36, 24.6, { s: .7, emo: "happy" }); F(g, 52, 45, CAST.tizon, { s: 1, dir: -1, front: [46, 36], emo: "open", rim: P.sea2 });
    HD.stroke(g, (gg) => { gg.moveTo(30, 14); gg.bezierCurveTo(38, 10, 46, 28, 46, 36); }, P.rose2, .5);
    [[33, 12.4, P.rose1], [38, 14.6, P.rose1], [42, 20, P.sea2], [44.6, 27, P.rose1]].forEach(([x, y, c]) => noteG(g, x, y, c)); }); };

NOTE.chorus = { scene: "Atardecer en la plaza del Vado. Coplo canta subido a un barril y toda la plaza le hace el estribillo. Trinilla lleva el ritmo desde su gorra.", hidden: "En el cinturón de Coplo cuelga una bolsa con el sello del farol: alguien de Albor le paga las canciones." };
SCENE.chorus = () => { const b = PL.vado({ sky: "dusk" }); b.layer((t) => { t.r(26, 32, 9, 9, P.soil1); t.r(26, 34, 9, 1, P.soil0); t.r(26, 38, 9, 1, P.soil0); });
  return hd(b, (g) => { F(g, 30.6, 32, CAST.coplo, { sing: true, front: [35, 25.4], back: [27.6, 26], rim: P.ember3, hold: (gg, x, y) => HD.shape(gg, (q) => HD.E(q, x - .4, y + 1.6, 1.6, 2.2, .4), { fill: P.soil3, shade: P.soil2, lw: .25 }) });
    HD.shape(g, (gg) => gg.rect(31.4, 26.2, 1.4, 1.6), { fill: P.ember4, lw: .2 }); HD.dot(g, 32.1, 27, .3, P.ember1);
    Cr(g, "trinilla", 31, 15.6, { s: .55, emo: "closed" });
    F(g, 14, 44, CAST.forest, { sing: true }); F(g, 20, 45, kid(CAST.poor), { sing: true }); F(g, 44, 44, CAST.water, { dir: -1, sing: true }); F(g, 50, 45, CAST.nightBare, { dir: -1, sing: true });
    [[22, 22], [40, 21], [46, 26]].forEach(([x, y]) => noteG(g, x, y, P.rose2)); }); };
/* ================= Lago: Agua, Piedra, Sombra ================= */
const jar = (g, x, y, w, h, c) => HD.shape(g, (gg) => { gg.moveTo(x - w * .3, y - h); gg.lineTo(x + w * .3, y - h); gg.quadraticCurveTo(x + w * .6, y - h * .6, x + w * .5, y - h * .2); gg.quadraticCurveTo(x + w * .4, y, x, y); gg.quadraticCurveTo(x - w * .4, y, x - w * .5, y - h * .2); gg.quadraticCurveTo(x - w * .6, y - h * .6, x - w * .3, y - h); gg.closePath(); }, { fill: c[0], shade: c[1], light: c[2], lw: .28 });
const pier = (b, x0, x1, y) => { b.r(x0, y, x1 - x0, 2, P.soil2); b.r(x0, y, x1 - x0, 1, P.soil3); for (let x = x0 + 1; x < x1; x += 5) b.r(x, y + 2, 1, 6, P.soil0); };
const tunnel = (b, x, y, w, h) => { b.e(x + w / 2, y + 2, w / 2, 4, P.ink); b.r(x, y + 2, w, h - 2, P.ink); b.r(x - 1, y, 2, h, P.soil2); b.r(x + w - 1, y, 2, h, P.soil2); b.r(x - 2, y - 1, w + 4, 2, P.soil1); };
const rails = (b, y) => { b.r(0, y, AW, 1, P.mist); b.r(0, y + 3, AW, 1, P.mist); for (let x = 1; x < AW; x += 4) b.r(x, y - 1, 2, 5, P.soil1); };

/* --- Agua (Remolín, Vidriela) --- */
NOTE.whirl = { scene: "En un remolino del arroyo, Remolín flota panza arriba dando vueltas, feliz. A su lado gira una botella que no consigue salir.", hidden: "Dentro de la botella hay un barquito de papel doblado: una de las cartas de Orilla, que nunca llegó a ningún sitio." };
SCENE.whirl = () => { const b = new Pic(AW, AH); b.grad(0, 0, AW, 14, [P.moss1, P.moss2]); b.r(0, 12, AW, 2, P.soil1); water(b, 14, [P.sea2, P.sea1, P.sea1], P.sea3);
  for (let k = 1; k < 8; k++) for (let a = 0; a < 6.3; a += .05) { const rr = k * 3; b.p(32 + Math.cos(a + k) * rr, 31 + Math.sin(a + k) * rr * .45, k % 2 ? P.sea3 : P.sea0); } b.e(32, 31, 3, 1.4, P.sea0);
  return hd(b, (g) => { Cr(g, "remolin", 30, 30, { emo: "happy", rim: P.sea4 });
    g.save(); g.translate(46, 35); g.rotate(-.5); HD.shape(g, (gg) => gg.roundRect(-3, -1.3, 6, 2.6, 1.2), { fill: P.sea4, alpha: .75, lw: .28 }); HD.shape(g, (gg) => gg.rect(3, -.6, 1.4, 1.2), { fill: P.soil2, lw: .2 }); HD.shape(g, (gg) => HD.poly(gg, [[-2, .6], [1.4, .6], [-.4, -.9]]), { fill: P.cream, lw: .18 }); g.restore(); }); };

NOTE.vessel = { scene: "En el templo de las Mareas, Madre Marejada vierte agua en vasijas de formas distintas. Remolín se ha metido en un cuenco y ha tomado su forma redonda.", hidden: "Una de las vasijas de la fila es un cristal de farol de Albor, usado como jarra." };
SCENE.vessel = () => { const b = PL.room({ wall: P.sea1, wall2: P.sea0, floor: P.plum1, win: [42, 6], winSky: "day" }); b.r(0, 30, AW, 1, P.sea2);
  b.layer((t) => { t.r(6, 30, 36, 2, P.soil2); t.r(8, 32, 1, 4, P.soil1); t.r(39, 32, 1, 4, P.soil1); });
  return hd(b, (g) => { jar(g, 12, 30, 4, 6, [P.ember2, P.ember1, P.ember3]); jar(g, 18, 30, 3, 4, [P.sea3, P.sea2, P.sea4]);
    HD.shape(g, (gg) => gg.roundRect(22, 25, 3, 5, .3), { fill: P.butter, alpha: .85, lw: .26 }); HD.stroke(g, (gg) => { gg.moveTo(21.6, 25); gg.lineTo(25.4, 25); gg.moveTo(21.6, 30); gg.lineTo(25.4, 30); }, P.mist, .45);
    HD.shape(g, (gg) => { gg.moveTo(29, 27); gg.lineTo(37, 27); gg.quadraticCurveTo(37, 30.6, 33, 30.6); gg.quadraticCurveTo(29, 30.6, 29, 27); gg.closePath(); }, { fill: P.soil3, shade: P.soil2, lw: .28 });
    Cr(g, "remolin", 33, 28.4, { s: .62, emo: "sleep" }); HD.shape(g, (gg) => { gg.moveTo(29, 27); gg.lineTo(37, 27); gg.quadraticCurveTo(37, 30.6, 33, 30.6); gg.quadraticCurveTo(29, 30.6, 29, 27); gg.closePath(); }, { fill: P.soil3, shade: P.soil2, lw: .28 });
    F(g, 46, 45.4, CAST.marejada, { dir: -1, front: [36, 21], rim: P.sea3, hold: (gg, x, y) => jar(gg, x - 1.4, y + 1.4, 3, 4, [P.sea2, P.sea1, P.sea3]) });
    HD.stroke(g, (gg) => { gg.moveTo(33.4, 22.8); gg.quadraticCurveTo(32.6, 24.6, 33, 26.6); }, P.sea3, .6); }); };

NOTE.guest = { scene: "En el muelle de las Mareas llega una familia del Envés con sus fardos. Antes de preguntarles nada, una niña del pueblo les ofrece un vaso de agua. Remolín asoma del agua.", hidden: "Del fardo del viajero cae una gota de savia: vienen de una zona donde la Savia ya ha subido." };
SCENE.guest = () => { const b = PL.lake({ sky: "day", hz: 22 }); b.layer((t) => { t.r(40, 10, 16, 12, P.soil2); t.poly([[38, 11], [48, 4], [58, 11]], P.sea1); for (let x = 42; x < 56; x += 4) t.r(x, 22, 1, 6, P.soil0); }); b.r(45, 14, 3, 3, P.ink);
  pier(b, 0, 46, 36); b.r(0, 38, 46, 10, P.sea1); for (let x = 1; x < 46; x += 5) b.r(x, 38, 1, 10, P.soil0); b.p(10, 40, SAP.s2); b.p(10, 41, SAP.s1);
  return hd(b, (g) => { F(g, 8, 36, CAST.night, { front: [12, 30], rim: P.sea4, hold: (gg, x, y) => HD.shape(gg, (q) => HD.E(q, x - 4.4, y + .6, 2.2, 2.6), { fill: P.soil2, lw: .25 }) });
    F(g, 14, 36.2, kid(CAST.nightBare), { emo: "open", rim: P.sea4 });
    F(g, 27, 36.2, kid(CAST.water), { dir: -1, front: [21.4, 30], rim: P.sea4, hold: (gg, x, y) => HD.shape(gg, (q) => q.roundRect(x - 1.2, y - 2, 1.6, 2.2, .3), { fill: P.sea3, light: P.sea4, lw: .22 }) });
    Cr(g, "remolin", 34, 42, { dir: -1, emo: "happy", rim: P.sea4 }); }); };

NOTE.truewater = { scene: "De noche, en el Lago Espejo, Madre Marejada saca agua en un cuenco. En el lago, el farol de la orilla se refleja limpio y bonito; en el cuenco no.", hidden: "En el cuenco el reflejo del farol gotea negro: el agua que no miente enseña la savia que el lago esconde." };
SCENE.truewater = () => { const b = PL.lake({ sky: "night", hz: 24 }); lamp(b, 54, 12, { h: 12, r: 8 }); for (let y = 26; y < 34; y += 2) b.r(53, y, 3, 1, P.butter);
  b.poly([[0, 48], [0, 34], [16, 34], [30, 40], [36, 48]], P.plum1); b.poly([[0, 48], [0, 38], [14, 38], [26, 44], [30, 48]], P.ink);
  return hd(b, (g) => { F(g, 20, 40, CAST.marejada, { pose: "kneel", front: [26, 34.6], rim: P.sea3 });
    HD.shape(g, (gg) => { gg.moveTo(24, 33.4); gg.lineTo(30, 33.4); gg.quadraticCurveTo(30, 36.4, 27, 36.4); gg.quadraticCurveTo(24, 36.4, 24, 33.4); gg.closePath(); }, { fill: P.soil3, lw: .28 });
    HD.shape(g, (gg) => HD.E(gg, 27, 33.6, 2.8, .7), { fill: P.sea1, lw: .2 }); HD.dot(g, 27.4, 33.6, .45, P.butter); HD.dot(g, 27.4, 34.4, .3, SAP.s2);
    Cr(g, "vidriela", 40, 22, { dir: -1 }); }); };

NOTE.reading = { scene: "Al amanecer, Vidriela flota sobre el lago quieto y mira el reflejo. En la orilla no hay nadie, pero en el agua se ve un golpe que todavía no ha pasado.", hidden: "El reflejo muestra a un guardia de Albor que en la orilla de verdad no está." };
SCENE.reading = () => { const b = PL.lake({ sky: "dawn", hz: 26 }); b.poly([[0, 26], [0, 20], [20, 19], [30, 26]], P.plum2);
  return hd(b, (g) => { Cr(g, "vidriela", 38, 14, { dir: -1 });
    g.save(); g.globalAlpha = .55; g.translate(14, 27); g.scale(1, -1); F(g, 0, 0, CAST.albor, { front: [5, -10], hold: (gg, x, y) => HD.stroke(gg, (q) => { q.moveTo(x, y); q.lineTo(x + 4, y - 4); }, P.mist, .5) }); g.restore();
    for (let i = 0; i < 4; i++) HD.stroke(g, (gg) => gg.ellipse(38, 30, 3 + i * 3, 1 + i * .6, 0, 0, Math.PI * 2), "rgba(251,246,239,.35)", .3); }); };

/* --- Piedra (Pebb, Ecolito) --- */
NOTE.throw = { scene: "Asamblea en la Hondura: un agrimensor de Albor está midiendo la entrada de la mina cuando Pebb sale rodando de entre los mineros y le tumba el trípode.", hidden: "En el mapa que se le cae al agrimensor están marcados los Pozos: quieren cavar aquí también." };
SCENE.throw = () => { const b = PL.cave({ seed: 4 }); tunnel(b, 40, 14, 14, 24);
  return hd(b, (g) => { F(g, 8, 45, CAST.miner, { front: [12, 34] }); F(g, 15, 45.4, CAST.basalto, { front: [19, 30], emo: "open" }); F(g, 22, 45.6, kid(CAST.miner), { sing: true });
    Cr(g, "pebb", 32, 40, { emo: "happy", rim: P.butter }); [[28, 42], [25, 44]].forEach(([x, y]) => HD.stroke(g, (gg) => { gg.moveTo(x, y); gg.lineTo(x - 3, y); }, P.fog, .4));
    g.save(); g.translate(41, 40); g.rotate(.5); HD.stroke(g, (gg) => { gg.moveTo(0, 0); gg.lineTo(-2, 6); gg.moveTo(0, 0); gg.lineTo(2, 6); gg.moveTo(0, 0); gg.lineTo(0, 6); }, P.soil1, .4); HD.shape(g, (gg) => gg.rect(-1.4, -2, 2.8, 2), { fill: P.ember4, lw: .25 }); g.restore();
    F(g, 52, 45.4, CAST.albor, { dir: -1, front: [47, 38], emo: "open", rim: P.butter }); HD.shape(g, (gg) => gg.rect(43, 42.4, 4, 3), { fill: P.cream, lw: .22 }); [[44, 43.4], [45.6, 44.4]].forEach(([x, y]) => HD.dot(g, x, y, .35, SAP.s2)); }); };

NOTE.stubborn = { scene: "Pebb se ha sentado en medio de los raíles y un carro de mineral se ha parado contra él. Dos mineros empujan; Pebb no se mueve.", hidden: "El carro va cargado de piedra que brilla con luz de raíz, camino de Albor. Quizá Pebb no se mueve a propósito." };
SCENE.stubborn = () => { const b = PL.cave({ seed: 9, crystals: false }); rails(b, 41);
  b.layer((t) => { t.r(30, 30, 16, 9, P.plum2); t.r(30, 30, 16, 1, P.mist); }); [[33, 28], [37, 27], [41, 28], [44, 29]].forEach(([x, y]) => { b.e(x, y, 2, 1.6, P.butter); b.p(x, y, P.cream); }); b.glow(38, 28, 9, P.soil1, .7, [P.soil0, P.ink]);
  return hd(b, (g) => { [[33, 40.4], [43, 40.4]].forEach(([x, y]) => HD.shape(g, (gg) => HD.E(gg, x, y, 1.6, 1.6), { fill: P.plum1, lw: .25 }));
    Cr(g, "pebb", 23, 43, { emo: "normal", s: 1.1, rim: P.mist }); F(g, 50, 44, CAST.miner, { dir: -1, front: [46, 34], back: [47, 36] }); F(g, 57, 44, CAST.miner, { dir: -1, hairStyle: "bun", front: [52, 35] }); }); };

NOTE.promise = { scene: "A la entrada de la mina, al amanecer, dos mineras se intercambian dos piedras iguales antes de bajar: una de la Hondura y otra del Envés. Pebb las mira entre las dos.", hidden: "La minera del Envés huele a tierra y lleva una luna en la piedra: es la madre de Nim." };
SCENE.promise = () => { const b = PL.cave({ seed: 21 }); tunnel(b, 24, 12, 16, 26); b.grad(0, 0, 18, 30, SKY.dawn); b.r(17, 0, 1, 38, P.soil2);
  return hd(b, (g) => { F(g, 22, 45, CAST.miner, { hairStyle: "bun", front: [29.6, 35], rim: P.ember3, hold: (gg, x, y) => HD.shape(gg, (q) => HD.E(q, x + .6, y - .4, .9, .7), { fill: P.mist, lw: .2 }) });
    F(g, 40, 45, CAST.miner, { dir: -1, skin: SK.night, cloth: [P.plum2, P.plum1, P.plum3], hairStyle: "long", hair: P.ink, front: [33.4, 35], hold: (gg, x, y) => { HD.shape(gg, (q) => HD.E(q, x + .6, y - .4, .9, .7), { fill: P.mist, lw: .2 }); HD.dot(gg, x + .6, y - .5, .3, P.fog); } });
    Cr(g, "pebb", 31.6, 45.4, { s: .75, emo: "happy" }); }); };

NOTE.echo = { scene: "En las Cuevas del Eco, Ecolito canta y la cueva le devuelve la voz cada vez más fuerte. Un minero se tapa los oídos.", hidden: "Desde el túnel del fondo vuelve un tercer eco que nadie ha cantado: algo de abajo contesta." };
SCENE.echo = () => { const b = PL.cave({ seed: 33 }); tunnel(b, 48, 18, 10, 20);
  return hd(b, (g) => { Cr(g, "ecolito", 20, 44, { emo: "o", s: 1.2, rim: P.glim1 });
    for (let i = 1; i < 5; i++) HD.stroke(g, (gg) => gg.arc(20, 38, 3 + i * 3, -1, .2), `rgba(199,166,255,${.9 - i * .15})`, .3 + i * .1);
    for (let i = 1; i < 4; i++) HD.stroke(g, (gg) => gg.arc(53, 28, 1 + i * 2, Math.PI * .8, Math.PI * 1.3), P.sheen ? SAP.sheen : SAP.sheen, .3);
    F(g, 40, 45, CAST.miner, { dir: -1, front: [41, 31.6], back: [38.6, 31.6], emo: "closed" }); }); };

NOTE.miner = { scene: "Por el túnel sale una minera cargando a un compañero herido a la espalda. Ecolito va delante, iluminando el camino con sus cristales.", hidden: "El minero herido lleva el casco morado del Envés: en la Hondura tampoco se deja atrás a los de fuera." };
SCENE.miner = () => { const b = PL.cave({ seed: 44, crystals: false }); tunnel(b, 4, 10, 26, 30); for (let i = 0; i < 18; i++) b.p(6 + (i * 7) % 22, 20 + (i * 5) % 16, P.soil1);
  return hd(b, (g) => { F(g, 26, 45, CAST.night, { s: .95, pose: "sit", hat: { k: "helmet", c: [P.plum2, P.plum1] }, emo: "closed" });
    F(g, 24, 45.4, CAST.miner, { hairStyle: "bun", front: [29, 37], emo: "sad", rim: P.glim1 });
    Cr(g, "ecolito", 42, 45, { dir: -1, emo: "normal", rim: P.glim1 }); glowDot(g, 42, 33, 2.4, P.glim1, 24); }); };

NOTE.rockname = { scene: "La pared de los nombres, en lo hondo de la mina: cada minero grabó el suyo. Basalto apoya la mano en uno y Ecolito canta bajito. Arden velas debajo.", hidden: "El nombre más nuevo está grabado con una luna, la marca del Envés, y su vela es la única recién encendida." };
SCENE.rockname = () => { const b = PL.cave({ seed: 55, crystals: false }); b.r(6, 8, 52, 28, P.soil1); for (let j = 10; j < 34; j += 4) for (let x = 9 + (j % 8); x < 55; x += 9) b.r(x, j, 5, 1, P.soil0);
  b.r(42, 26, 6, 1, P.soil0); b.p(41, 25, P.fog); b.p(41, 26, P.fog); [[12, 37], [24, 37], [36, 37]].forEach(([x, y]) => { b.r(x, y, 1, 2, P.cream); }); b.r(44, 36, 1, 3, P.cream); b.p(44, 35, P.ember4); b.glow(44.5, 33, 8, P.soil2, .6, [P.soil1, P.soil0]);
  return hd(b, (g) => { F(g, 30, 46, CAST.basalto, { front: [36, 27], rim: P.ember3 }); Cr(g, "ecolito", 50, 46, { dir: -1, emo: "closed", rim: P.glim1 }); glowDot(g, 44.4, 34.6, .6, P.ember4, 12); }); };

/* --- Sombra (Nim, Centinela) --- */
NOTE.nohide = { scene: "En la Hondonada, un espía de Albor se esconde detrás de unos barriles. Nim, que se esconde de todo, le cuelga cabeza abajo justo encima y lo mira fijo.", hidden: "El espía lleva el farol tapado con un trapo: hasta la luz de Albor sabe esconderse." };
SCENE.nohide = () => { const b = PL.hollow({ seed: 8 }); b.r(10, 6, 44, 2, P.soil0); b.r(14, 8, 2, 40, P.soil0); b.layer((t) => { t.e(38, 40, 4, 5, P.soil1); t.e(46, 41, 4, 5, P.soil1); }); b.r(34, 39, 16, 1, P.soil0);
  return hd(b, (g) => { F(g, 42, 46.4, CAST.albor, { pose: "kneel", dir: -1, front: [37, 41], emo: "open", rim: P.plum3, hold: (gg, x, y) => HD.shape(gg, (q) => q.roundRect(x - 1, y - 1, 2, 2.4, .4), { fill: P.soil2, lw: .22 }) });
    g.save(); g.translate(40, 8); g.scale(1, -1); Cr(g, "nim", 0, -.4, { emo: "open", rim: P.glim0 }); g.restore(); }); };

NOTE.truename = { scene: "Contra una pared de la Hondonada hay una sombra que es solo un hueco. Nim dice en voz alta un nombre y la sombra empieza a llenarse de color.", hidden: "La sombra lleva casco de minero: es uno de los que no volvieron." };
SCENE.truename = () => { const b = PL.hollow({ seed: 12 }); b.r(26, 8, 38, 40, P.plum2); for (let j = 10; j < 48; j += 4) b.r(26, j, 38, 1, P.plum1);
  return hd(b, (g) => { g.save(); g.beginPath(); g.rect(0, 0, 64, 39); g.clip(); F(g, 44, 46, CAST.miner, { cloth: [P.ink, P.ink, P.plum1], skin: [P.ink, P.ink], hat: { k: "helmet", c: [P.ink, P.ink] }, ink: P.plum1 }); g.restore();
    g.save(); g.beginPath(); g.rect(0, 39, 64, 9); g.clip(); F(g, 44, 46, CAST.miner, { rim: P.butter }); g.restore();
    Cr(g, "nim", 18, 45, { emo: "happy", rim: P.glim1 }); for (let i = 1; i < 4; i++) HD.stroke(g, (gg) => gg.arc(20, 36, 2 + i * 2.4, -.6, .6), P.glim1, .35); }); };

NOTE.lance = { scene: "A las puertas de la corte del Rey Lóbrego, entre la niebla, Centinela cruza su lanza delante de un enviado de Albor que trae un pergamino.", hidden: "El pergamino del enviado está en blanco: no traía nada que decir, solo venía a mirar." };
SCENE.lance = () => { const b = PL.hollow({ seed: 15 }); b.r(30, 6, 34, 42, P.plum1); b.e(47, 20, 9, 12, P.ink); b.r(38, 20, 18, 28, P.ink); for (let y = 14; y < 48; y += 4) { b.r(30, y, 2, 2, P.plum2); b.r(62, y, 2, 2, P.plum2); }
  for (let y = 30; y < 48; y++) for (let x = 0; x < AW; x++) if (bay(x, y) < (y - 30) / 40) b.p(x, y, P.plum3);
  return hd(b, (g) => { Cr(g, "centinela", 44, 46, { dir: -1, rim: P.glim1 }); F(g, 22, 46, CAST.albor, { front: [27, 35], rim: P.butter, hold: (gg, x, y) => { gg.save(); gg.translate(x + 1.4, y); gg.rotate(-1.3); HD.shape(gg, (q) => q.rect(-2.4, -1.6, 4.8, 3.2), { fill: P.cream, shade: P.fog, lw: .25 }); gg.restore(); } }); }); };

NOTE.oath = { scene: "En la niebla espera una fila larga de gente del Envés. Centinela se arrodilla ante la primera, una niña, y le susurra que la protegerá.", hidden: "Es una carta de Pacto: la fila de detrás se pierde en la niebla. El juramento no dice nada de ellos." };
SCENE.oath = () => { const b = PL.hollow({ seed: 18 });
  return hd(b, (g) => { [[60, 37, .55], [55, 38.4, .62], [49, 40, .72], [42, 42.2, .84]].forEach(([x, y, s], i) => { g.save(); g.globalAlpha = .35 + i * .15; F(g, x, y, i % 2 ? CAST.night : CAST.nightBare, { s, dir: -1 }); g.restore(); });
    F(g, 30, 45.6, kid(CAST.nightBare), { dir: -1, emo: "open", rim: P.glim1 }); g.save(); g.translate(18, 46); g.scale(1, .82); Cr(g, "centinela", 0, 0, { rim: P.glim1 }); g.restore(); }); };

NOTE.veil = { scene: "Una patrulla de Albor barre la calle con la luz del farol. Centinela echa un velo de niebla sobre una niña escondida contra la pared, y la luz pasa de largo.", hidden: "En el borde del velo está bordada la corona del Rey Lóbrego: el velo era suyo." };
SCENE.veil = () => { const b = PL.hollow({ seed: 24 }); b.r(0, 10, 30, 38, P.plum2); for (let j = 12; j < 48; j += 4) b.r(0, j, 30, 1, P.plum1);
  b.poly([[64, 22], [64, 30], [30, 46], [30, 36]], P.ember3); for (let y = 20; y < 48; y++) for (let x = 30; x < 64; x++) { const c = b.g(x, y); if (c === P.ember3 && bay(x, y) < .55) b.p(x, y, P.butter); }
  return hd(b, (g) => { F(g, 16, 45.4, kid(CAST.nightBare), { pose: "kneel", emo: "closed" }); g.save(); g.globalAlpha = .78; HD.shape(g, (gg) => HD.blob(gg, [[8, 46], [8, 36], [14, 32], [22, 33], [25, 40], [26, 46]]), { fill: P.mist, ink: false }); g.restore();
    HD.shape(g, (gg) => HD.poly(gg, [[21, 44.4], [21, 43], [21.8, 43.8], [22.6, 42.8], [23.4, 43.8], [24.2, 43], [24.2, 44.4]]), { fill: P.plum3, lw: .18 });
    Cr(g, "centinela", 32, 46, { dir: -1, rim: P.glim1 }); }); };
/* ================= Escarcha (Hielo, Seta, Sueño) y Estrella ================= */
const igloo = (b, x, y, w, h, lit) => { for (let j = Math.floor(y - h); j <= y; j++) for (let i = Math.floor(x - w); i <= x + w; i++) { const dx = (i + .5 - x) / w, dy = (j + .5 - y) / h; if (dx * dx + dy * dy <= 1) b.p(i, j, dx * dx + (dy + .5) * (dy + .5) < .3 && dx < .2 ? P.cream : P.fog); } for (let a = .3; a < 3; a += .5) b.l(x + Math.cos(a) * w, y - Math.sin(a) * h, x + Math.cos(a) * w * .8, y - Math.sin(a) * h * .8, P.mist); b.e(x, y - 1, 2, 3, P.ink); b.r(x - 2, y - 1, 4, 2, P.ink); if (lit) { b.e(x, y - .5, 1.4, 2.4, P.ember3); b.glow(x, y, 6, P.soil2, .4, [P.plum2, P.fog, P.mist]); } };
const tombDoor = (b, x, y, w, h) => { b.r(x - 2, y - 2, w + 4, h + 2, P.sea1); b.e(x + w / 2, y, w / 2 + 2, 5, P.sea1); b.r(x, y, w, h, P.sea0); b.e(x + w / 2, y + 1, w / 2, 4, P.sea0); b.r(x + w / 2, y - 2, 1, h + 2, P.ink); for (let j = y + 4; j < y + h; j += 6) { b.r(x + 2, j, 3, 1, P.sea2); b.r(x + w - 5, j, 3, 1, P.sea2); } b.r(x - 3, y + h, w + 6, 2, P.mist); };

/* --- Hielo (Carámbano, Guardatumba) --- */
NOTE.frostslow = { scene: "Al otro lado de una ventana del Fondo Blanco, la escarcha avanza muy despacio hacia una flor en una maceta. Carámbano la mira avanzar, sin prisa.", hidden: "Los dibujos de la escarcha en el cristal tienen forma de raíz." };
SCENE.frostslow = () => { const b = PL.room({ wall: P.sea1, wall2: P.sea0, floor: P.plum1 }); b.r(14, 6, 36, 26, P.ink); b.grad(15, 7, 34, 24, SKY.night); snowfall(b, 10, 3);
  for (let i = 0; i < 4; i++) { let x = 15 + i * 2, y = 7 + i * 6; for (let k = 0; k < 14; k++) { b.p(x, y, P.cream); x += 1; y += (k % 3) - 1; if (k % 4 === 0) b.p(x, y + 1, P.sea4); } }
  for (let x = 15; x < 49; x++) for (let y = 7; y < 31; y++) if (x < 26 && bay(x, y) < (26 - x) / 14) b.p(x, y, P.sea4); b.r(31, 6, 1, 26, P.ink); b.r(14, 18, 36, 1, P.ink); b.r(12, 32, 40, 2, P.mist);
  return hd(b, (g) => { HD.shape(g, (gg) => { gg.moveTo(38, 32); gg.lineTo(44, 32); gg.lineTo(43, 28); gg.lineTo(39, 28); gg.closePath(); }, { fill: P.ember1, shade: P.ember0, lw: .28 });
    HD.stroke(g, (gg) => { gg.moveTo(41, 28); gg.lineTo(41, 23); }, P.moss1, .45); HD.shape(g, (gg) => HD.E(gg, 41, 22, 1.6, 1.4), { fill: P.rose2, lw: .25 }); HD.dot(g, 41, 22, .5, P.butter);
    Cr(g, "carambano", 22, 45.4, { emo: "normal", s: 1.1, rim: P.sea3 }); }); };

NOTE.tombquiet = { scene: "Bajo la nieve, alrededor de la Tumba Helada, Carámbano cava túneles de puntillas para no despertar a nadie. Este invierno el techo gotea.", hidden: "Una de las gotas que caen del techo es negra." };
SCENE.tombquiet = () => { const b = new Pic(AW, AH); b.grad(0, 0, AW, 10, [P.fog, P.cream]); b.r(0, 10, AW, 38, P.sea1); for (let i = 0, r = rng(5); i < 40; i++) b.p(Math.floor(r() * AW), 12 + Math.floor(r() * 34), P.sea0);
  b.r(40, 4, 22, 30, P.sea0); b.r(40, 4, 22, 1, P.sea3); b.r(50, 4, 1, 30, P.ink); b.e(18, 36, 22, 6, P.ink); b.r(0, 32, 40, 8, P.ink); b.e(18, 36, 21, 5, P.plum1); b.r(0, 33, 40, 6, P.plum1); b.r(0, 39, 42, 1, P.sea2);
  [[8, 32], [18, 32], [28, 32]].forEach(([x, y]) => { b.p(x, y, P.sea4); b.p(x, y + 3, P.sea3); }); b.p(32, 32, SAP.s2); b.p(32, 35, SAP.s1); b.p(32, 34, SAP.sheen);
  return hd(b, (g) => { Cr(g, "carambano", 18, 39, { emo: "closed", rim: P.sea3 }); [[13, 34], [12, 36]].forEach(([x, y]) => HD.stroke(g, (gg) => { gg.moveTo(x, y); gg.lineTo(x - 2, y); }, P.sea3, .3)); }); };

NOTE.vigil = { scene: "Noche en el Fondo Blanco. Todas las casas duermen menos una, con una vela en la ventana. Carámbano hace guardia en la puerta, envuelto en nieve.", hidden: "Todas las ventanas del pueblo miran hacia el mismo sitio: la Tumba Helada, al fondo." };
SCENE.vigil = () => { const b = PL.snow({}); tombDoor(b, 52, 18, 8, 14); igloo(b, 14, 34, 10, 9, true); igloo(b, 36, 33, 7, 6, false);
  return hd(b, (g) => { Cr(g, "carambano", 26, 44, { dir: -1, emo: "normal", rim: P.ember3 }); }); };

NOTE.regent = { scene: "Ante la Tumba Helada, la Regente Albina habla en nombre del Rey Dormido. Guardatumba hinca la rodilla y escucha la orden.", hidden: "La corona de Albina le queda grande: se hizo para otra cabeza." };
SCENE.regent = () => { const b = PL.snow({ sky: "night" }); tombDoor(b, 24, 12, 16, 22);
  return hd(b, (g) => { F(g, 36, 44, CAST.albina, { dir: -1, front: [28, 30], rim: P.sea3, hat: { k: "crown", c: [P.sea3, P.sea2] } });
    g.save(); g.translate(14, 45); g.scale(.9, .8); Cr(g, "guardatumba", 0, 0, { emo: "closed", rim: P.sea3 }); g.restore(); }); };

NOTE.thousand = { scene: "Guardatumba lleva mil años de pie ante la puerta de la Tumba, con la nieve acumulada en los hombros. Carámbano, a sus pies, parece diminuto.", hidden: "Por la rendija de abajo de la puerta sale un hilo de luz de raíz: dentro hay algo vivo." };
SCENE.thousand = () => { const b = PL.snow({ sky: "night" }); tombDoor(b, 30, 4, 26, 32); for (let x = 32; x < 54; x++) if (x % 2) b.p(x, 35, P.butter); b.glow(43, 35, 8, P.sea2, .5, [P.sea0, P.mist, P.fog]);
  return hd(b, (g) => { Cr(g, "guardatumba", 18, 45, { s: 1.45, emo: "closed", rim: P.sea3 }); HD.shape(g, (gg) => HD.blob(gg, [[8.6, 22.6], [11, 20.6], [14, 21.6], [12, 23]]), { fill: P.cream, lw: .22 }); HD.shape(g, (gg) => HD.blob(gg, [[22, 21.6], [25, 20.6], [27.6, 22.6], [24, 23]]), { fill: P.cream, lw: .22 });
    Cr(g, "carambano", 32, 45.4, { s: .55, dir: -1, emo: "normal" }); }); };

NOTE.sealed = { scene: "Dentro de la Tumba Helada no hay ningún rey. Sobre la losa duerme la punta de una raíz enorme, y la puerta, por dentro, está llena de arañazos.", hidden: "Los arañazos de la puerta son de dentro hacia fuera: algo quiso salir alguna vez." };
SCENE.sealed = () => { const b = new Pic(AW, AH); b.grad(0, 0, AW, AH, [P.ink, P.sea0, P.ink]); b.r(4, 6, 14, 36, P.sea0); b.r(4, 6, 14, 1, P.sea1); for (let i = 0; i < 6; i++) b.l(6 + i * 2, 12 + i, 8 + i * 2, 22 + i, P.sea2);
  b.r(26, 34, 32, 6, P.plum2); b.r(26, 34, 32, 1, P.mist); b.r(28, 40, 28, 8, P.plum1);
  return hd(b, (g) => { HD.shape(g, (gg) => { gg.moveTo(64, 10); gg.bezierCurveTo(50, 12, 58, 26, 46, 30); gg.quadraticCurveTo(36, 34, 30, 33); gg.quadraticCurveTo(38, 30, 42, 26); gg.bezierCurveTo(50, 20, 44, 8, 64, 4); gg.closePath(); }, { fill: P.soil1, shade: P.soil0, light: P.soil2, rim: P.butter, rimB: 16, rimA: .5 });
    for (let i = 0; i < 5; i++) glowDot(g, 36 + i * 5, 30 - i * 3 + (i % 2), .4, P.butter, 8); }); };

/* --- Seta (Capuchón) --- */
NOTE.stillgrow = { scene: "En la nieve hay un trineo abandonado hace tiempo, con un farol tirado al lado. Las setas han crecido encima sin prisa. Capuchón no se mueve: espera.", hidden: "El farol medio enterrado es de Albor, con su línea de savia. Alguien de Albor llegó hasta aquí y no volvió." };
SCENE.stillgrow = () => { const b = PL.snow({ sky: "day" }); b.layer((t) => { t.r(24, 38, 20, 3, P.soil1); t.l(22, 42, 46, 42, P.soil0); t.r(26, 36, 2, 2, P.soil2); });
  b.layer((t) => { t.r(48, 39, 3, 4, P.butter); t.r(47, 38, 5, 1, P.mist); }); b.p(48, 43, SAP.s2); b.p(49, 43, SAP.sheen); b.e(49, 43, 4, 1.2, P.cream);
  return hd(b, (g) => { [[28, 38, 1.6], [32, 38, 2.2], [37, 38, 1.4], [41, 38, 1.8]].forEach(([x, y, r]) => { HD.shape(g, (gg) => gg.rect(x - .4, y - r * 1.4, .8, r * 1.4), { fill: P.cream, lw: .2 }); HD.shape(g, (gg) => { gg.ellipse(x, y - r * 1.4, r, r * .7, 0, Math.PI, 0); gg.closePath(); }, { fill: P.rose1, shade: P.rose0, lw: .24 }); HD.dot(g, x - r * .3, y - r * 1.7, .3, P.cream); });
    Cr(g, "capuchon", 14, 44, { emo: "closed", rim: P.sea3 }); }); };

NOTE.saprem = { scene: "En su cabaña, Esporina le da un cuenco de remedio a un anciano del Envés que tose. En las estanterías, frascos de capuchones negros. Capuchón mira desde el suelo.", hidden: "En la mano del anciano asoma una venita con brillo verde: el remedio funciona porque está hecho de lo mismo." };
SCENE.saprem = () => { const b = PL.room({ wall: P.soil1, wall2: P.soil0, fire: 54 }); b.r(4, 8, 22, 1, P.soil2); b.r(4, 16, 22, 1, P.soil2);
  [[6, 5], [11, 5], [16, 5], [21, 5], [7, 13], [13, 13], [19, 13]].forEach(([x, y], i) => b.layer((t) => { t.r(x, y, 3, 3, P.sea3); t.r(x, y + 1, 3, 2, i % 2 ? SAP.s1 : P.rose0); }));
  return hd(b, (g) => { F(g, 22, 44, CAST.esporina, { front: [28.6, 33.6], rim: P.ember3, hold: (gg, x, y) => HD.shape(gg, (q) => { q.moveTo(x - 1.6, y - .6); q.lineTo(x + 1.8, y - .6); q.quadraticCurveTo(x + 1.6, y + 1.4, x + .1, y + 1.4); q.quadraticCurveTo(x - 1.4, y + 1.4, x - 1.6, y - .6); q.closePath(); }, { fill: P.soil3, lw: .22 }) });
    F(g, 36, 44, CAST.night, { dir: -1, pose: "sit", hairStyle: "none", beard: P.fog, front: [31, 34.4], emo: "closed", rim: P.ember3 }); HD.stroke(g, (gg) => { gg.moveTo(31.4, 34.4); gg.lineTo(32.4, 35.2); }, SAP.sheen, .25);
    Cr(g, "capuchon", 12, 45.6, { emo: "normal" }); }); };

/* --- Sueño (Bostezo) --- */
NOTE.yawn = { scene: "Bostezo bosteza en la plaza nevada del Fondo Blanco y la fila de guardias de la Regente lo va contagiando uno detrás de otro.", hidden: "El último de la fila ya se ha dormido de pie, apoyado en su lanza." };
SCENE.yawn = () => { const b = PL.snow({ sky: "day" }); igloo(b, 54, 32, 9, 8, false);
  return hd(b, (g) => { Cr(g, "bostezo", 10, 44, { emo: "o", rim: P.glim1 }); [[22, 44], [30, 44.4], [38, 44.8], [46, 45.2]].forEach(([x, y], i) => F(g, x, y, CAST.frost, { hat: { k: "cap", c: [P.sea2, P.sea1] }, sing: i < 3, emo: i === 3 ? "closed" : "open", front: [x + 2, y - 15], hold: (gg, hx, hy) => HD.stroke(gg, (q) => { q.moveTo(hx, hy - 3); q.lineTo(hx, hy + 9); }, P.mist, .35) })); }); };

NOTE.pillow = { scene: "Junto al fuego, una abuela del Fondo Blanco hace una almohada con lana de Bostezo, que se ha dormido en su regazo mientras le esquilaban.", hidden: "El bordado de la almohada son notas: una estrofa del Canto, cosida para que no se olvide." };
SCENE.pillow = () => { const b = PL.room({ wall: P.sea0, wall2: P.ink, floor: P.soil0, fire: 50, win: [6, 8], winSky: "night" });
  return hd(b, (g) => { F(g, 24, 44, CAST.frost, { pose: "sit", hairStyle: "bun", hair: P.cream, hat: null, front: [30, 33.6], rim: P.ember3 }); Cr(g, "bostezo", 26, 36, { s: .7, emo: "sleep" });
    HD.shape(g, (gg) => gg.roundRect(31, 31, 7, 4, 1.4), { fill: P.cream, shade: P.fog, lw: .28 }); [[33, 33], [35, 32.6], [36.6, 33.4]].forEach(([x, y]) => noteG(g, x, y + .6, P.glim0)); }); };

NOTE.tale = { scene: "Desayuno en una casa del Fondo Blanco. La pequeña cuenta lo que ha soñado: una raíz enorme bajo la nieve. Bostezo sigue dormido debajo de la mesa.", hidden: "Encima de las cabezas de los padres hay dos burbujas pequeñas con la misma raíz: todos han soñado lo mismo." };
SCENE.tale = () => { const b = PL.room({ wall: P.sea1, wall2: P.sea0, floor: P.soil0, win: [44, 6], winSky: "dawn" }); b.layer((t) => { t.r(10, 34, 44, 2, P.soil2); t.r(12, 36, 2, 10, P.soil1); t.r(50, 36, 2, 10, P.soil1); });
  const bub = (x, y, r) => { b.e(x, y, r, r * .75, P.cream); for (let a = 0; a < 6.3; a += .1) b.p(x + Math.cos(a) * r, y + Math.sin(a) * r * .75, P.mist); b.l(x - r * .6, y + r * .1, x + r * .6, y - r * .1, P.soil1); b.l(x, y, x + 1, y + r * .5, P.soil1); };
  bub(32, 9, 7); bub(14, 14, 3); bub(50, 14, 3);
  return hd(b, (g) => { F(g, 14, 44, CAST.frost, { dir: 1, pose: "sit", hat: null, front: [20, 33] }); F(g, 50, 44, CAST.frost, { dir: -1, pose: "sit", hat: null, hairStyle: "bun", front: [45, 33] });
    F(g, 32, 34.6, kid(CAST.frost), { hat: null, front: [36, 22], emo: "open", rim: P.butter }); Cr(g, "bostezo", 32, 46.6, { s: .7, emo: "sleep" });
    [[26, 34], [38, 34]].forEach(([x, y]) => HD.shape(g, (gg) => HD.E(gg, x, y - .6, 1.6, .8), { fill: P.soil3, lw: .22 })); }); };

/* --- Estrella (Unísona) --- */
NOTE.unison = { scene: "Noche en el Vado. Gente de todos los pueblos canta en corro la misma canción y Unísona brilla encima de ellos.", hidden: "En un balcón, Aurelia Albor mira el corro sin cantar." };
SCENE.unison = () => { const b = PL.vado({ sky: "night" }); b.layer((t) => { t.r(50, 18, 12, 2, P.mist); for (let x = 50; x < 62; x += 3) t.r(x, 20, 1, 3, P.mist); });
  return hd(b, (g) => { glowDot(g, 32, 14, 3, P.cream, 30); Cr(g, "unisona", 32, 20, { s: 1.3, emo: "happy" });
    F(g, 56, 18.4, CAST.aurelia, { s: .7, dir: -1, rim: P.butter });
    [[12, 41, CAST.tila, 1], [20, 40, CAST.night, 1], [27, 39.5, CAST.frost, 1], [37, 39.5, CAST.miner, -1], [44, 40, CAST.water, -1], [52, 41, CAST.forest, -1]].forEach(([x, y, c, d]) => F(g, x, y, c, { dir: d, sing: true, rim: P.glim1 })); }); };

NOTE.firstnote = { scene: "Hace muchísimo tiempo, sobre la raíz del Claro, la Primera Cantora da una sola nota. A su alrededor ya flotan las nueve luces en que se va a partir el Canto.", hidden: "Las nueve luces tienen los colores de los pueblos que hoy se pelean por ellas." };
SCENE.firstnote = () => { const b = new Pic(AW, AH); b.grad(0, 0, AW, 34, [P.ink, P.sea0, P.glim0, P.rose1]); b.stars(0, 0, AW, 18, 24, 3);
  b.poly([[0, 48], [0, 36], [14, 34], [28, 32], [40, 33], [64, 36], [64, 48]], P.moss0); b.grad(0, 38, AW, 10, [P.moss0, P.ink]);
  for (let i = 0; i < 5; i++) { let x = 32 + (i - 2) * 6, y = 34; while (y < 48) { b.r(x, y, 3, 1, P.soil1); x += (i - 2) * .6; y++; } }
  return hd(b, (g) => { glowDot(g, 32, 18, 3, P.butter, 34); F(g, 32, 34, CAST.cantora, { sing: true, front: [36, 22], back: [28, 22], rim: P.butter });
    [P.ember4, P.ember2, P.moss3, P.sea3, P.butter, P.rose1, P.sea1, P.soil2, P.plum3].forEach((c, i) => { const a = Math.PI * (1.05 + i * .11); glowDot(g, 32 + Math.cos(a) * 16, 22 + Math.sin(a) * 12, .9, c, 10); }); }); };
/* ================= Guardianes: las cartas de los nueve guardianes ================= */
const BOSS = {
  farol(g, x, y, o = {}) { HD.at(g, x, y, o, (g) => {
    [[-2.4], [2.4]].forEach(([ox]) => HD.limb(g, [[ox, -5], [ox * 1.2, -.3]], 1.6, 1.2, P.plum1));
    HD.shape(g, (gg) => gg.roundRect(-5, -20, 10, 15, 2), { fill: P.plum2, shade: P.plum1, light: P.plum3, rim: P.butter, rimB: 18, rimA: .6 });
    HD.shape(g, (gg) => gg.roundRect(-3.4, -18, 6.8, 11, 1.4), { fill: P.butter, light: P.cream, lw: .3 });
    HD.shape(g, (gg) => HD.poly(gg, [[-6.4, -20], [0, -25], [6.4, -20]]), { fill: P.plum2, shade: P.plum1, lw: .3 }); HD.dot(g, 0, -25.6, .7, P.ember4);
    HD.eye(g, -1.2, -13, 1, o.emo === "closed" ? "closed" : "open", .6); HD.eye(g, 1.2, -13, 1, o.emo === "closed" ? "closed" : "open", .6);
    if (o.sap !== false) HD.stroke(g, (gg) => { gg.moveTo(-3.4, -6.6); gg.lineTo(3.4, -6.6); }, SAP.s2, .3); }); },
  forja(g, x, y, o = {}) { HD.at(g, x, y, o, (g) => {
    [[-3.4], [3.4]].forEach(([ox]) => HD.shape(g, (gg) => HD.E(gg, ox, -.8, 2, 1.2), { fill: P.plum1, lw: .28 }));
    HD.shape(g, (gg) => gg.rect(1, -24, 3, 6), { fill: P.plum2, lw: .3 });
    HD.shape(g, (gg) => gg.roundRect(-7, -19, 14, 18, 3), { fill: P.soil1, shade: P.soil0, light: P.soil2, rim: P.ember3, rimB: 16, rimA: .6 });
    HD.shape(g, (gg) => { gg.moveTo(-4, -4); gg.lineTo(-4, -8); gg.quadraticCurveTo(0, -12, 4, -8); gg.lineTo(4, -4); gg.closePath(); }, { fill: P.ember3, light: P.butter, lw: .3 });
    HD.eye(g, -2.4, -14, 1, "open", .7); HD.eye(g, 2.4, -14, 1, "open", .7); HD.stroke(g, (gg) => { gg.moveTo(-3.6, -16); gg.lineTo(-1.4, -15.2); gg.moveTo(3.6, -16); gg.lineTo(1.4, -15.2); }, P.ink, .4);
    if (o.hammer) { HD.limb(g, [[6, -12], [10, -16], [12, -20]], 1.6, 1.2, P.soil1); HD.shape(g, (gg) => gg.rect(10, -24, 5, 3), { fill: P.plum3, shade: P.plum2, lw: .3 }); } }); },
  seto(g, x, y, o = {}) { HD.at(g, x, y, o, (g) => {
    HD.shape(g, (gg) => HD.blob(gg, [[-12, 0], [-13, -7], [-9, -13], [-3, -15], [4, -14], [10, -12], [13, -6], [12, 0]]), { fill: P.moss1, shade: P.moss0, light: P.moss2, rim: o.rim, rimB: 12 });
    for (let i = 0; i < 14; i++) { const a = Math.PI * (1.05 + i * .065), r = 13; HD.shape(g, (gg) => HD.poly(gg, [[Math.cos(a) * r - .5, -1 + Math.sin(a) * r * 1.05], [Math.cos(a) * (r + 2.6), -1 + Math.sin(a) * (r + 2.4) * 1.05], [Math.cos(a) * r + .6, -1 + Math.sin(a) * r * 1.05]]), { fill: P.soil3, lw: .18 }); }
    [[-4, -8], [4, -8]].forEach(([ex, ey]) => { HD.shape(g, (gg) => HD.E(gg, ex, ey, 1.6, 1.1), { fill: P.butter, lw: .25 }); HD.dot(g, ex + .4, ey, .55, P.ink); }); }); },
  veleta(g, x, y, o = {}) { HD.at(g, x, y, o, (g) => {
    HD.shape(g, (gg) => HD.poly(gg, [[-3, 0], [-1.6, -26], [1.6, -26], [3, 0]]), { fill: P.mist, shade: P.plum3, light: P.fog, lw: .3 });
    g.save(); g.translate(0, -28); g.rotate(o.rot || 0);
    HD.shape(g, (gg) => HD.poly(gg, [[-9, -.8], [6, -.8], [6, -2.4], [10, 0], [6, 2.4], [6, .8], [-9, .8], [-11, 2.4], [-10, 0], [-11, -2.4]]), { fill: P.plum3, shade: P.plum2, lw: .3 }); g.restore();
    HD.shape(g, (gg) => HD.E(gg, 0, -28, 2.4, 2.4), { fill: P.fog, shade: P.mist, rim: o.rim, rimB: 12 }); HD.eye(g, -.8, -28.2, 1, "open", .5); HD.eye(g, .8, -28.2, 1, "open", .5); }); },
  micelio(g, x, y, o = {}) { HD.at(g, x, y, o, (g) => {
    HD.shape(g, (gg) => HD.poly(gg, [[-5, 0], [-3, -12], [3, -12], [5, 0]]), { fill: P.cream, shade: P.fog, rim: o.rim, rimB: 14 });
    HD.shape(g, (gg) => HD.blob(gg, [[-14, -10], [-9, -19], [0, -22], [9, -19], [14, -10], [0, -12.6]]), { fill: P.cream, shade: P.fog, light: P.cream, rim: o.rim || P.rose2, rimB: 14 });
    [[-6, -16, 1.2], [2, -19, 1], [8, -14.6, .9]].forEach(([dx, dy, r]) => HD.dot(g, dx, dy, r, P.rose2));
    HD.eye(g, -1.4, -8, 1, "closed"); HD.eye(g, 1.4, -8, 1, "closed"); HD.dot(g, -2.6, -6.8, .5, P.rose2); HD.dot(g, 2.6, -6.8, .5, P.rose2); }); },
  eye(g, x, y, r, o = {}) { HD.shape(g, (gg) => { gg.moveTo(x - r * 2, y); gg.quadraticCurveTo(x, y - r * 1.5, x + r * 2, y); gg.quadraticCurveTo(x, y + r * 1.5, x - r * 2, y); gg.closePath(); }, { fill: P.sea4, shade: P.sea3, rim: o.rim || P.sea3, rimB: 20, lw: .4 });
    HD.shape(g, (gg) => HD.E(gg, x, y, r * .7, r * .7), { fill: P.sea1, lw: .3 }); HD.dot(g, x, y, r * .35, P.ink); HD.dot(g, x - r * .25, y - r * .25, r * .15, P.cream);
    for (let i = -3; i <= 3; i++) HD.stroke(g, (gg) => { gg.moveTo(x + i * r * .5, y - r * .8 + Math.abs(i) * r * .1); gg.quadraticCurveTo(x + i * r * .7, y - r * 1.6, x + i * r * .9, y - r * 2.2 + Math.abs(i) * .2); }, P.moss1, .5); },
  root(g, pts, w, o = {}) { const n = pts.length, L = [], R2 = []; for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)]; let dx = c[0] - a[0], dy = c[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; const ww = w * (1 - i / n * .85) / 2; L.push([pts[i][0] - dy * ww, pts[i][1] + dx * ww]); R2.push([pts[i][0] + dy * ww, pts[i][1] - dx * ww]); }
    const all = L.concat(R2.reverse()); HD.shape(g, (gg) => HD.blob(gg, all), { fill: o.fill || P.soil1, shade: P.soil0, light: P.soil2, rim: o.rim, rimB: o.rimB || 14, rimA: o.rimA || .5 }); },
};
const cuidador = { cloth: [P.moss2, P.moss1, P.moss3], hair: P.soil1, hat: { k: "scarf", c: [P.ember1, P.ember0] } };
const lanternHold = (gg, x, y) => { glowDot(gg, x, y + 2, 1.2, P.butter, 16); HD.shape(gg, (q) => q.roundRect(x - .9, y + .8, 1.8, 2.4, .3), { fill: P.butter, lw: .22 }); HD.stroke(gg, (q) => { q.moveTo(x, y); q.lineTo(x, y + .8); }, P.ink, .25); };

/* --- El Gran Farol (Prado Aurora) --- */
NOTE.beam = { scene: "De noche, el Gran Farol ilumina el Prado desde su colina y dibuja en la hierba la raya hasta donde se puede ir. Una familia se para justo en el borde de la luz.", hidden: "Más allá de la raya la hierba está gris: lo que queda fuera de la luz se apaga." };
SCENE.beam = () => { const b = PL.meadow({ sky: "night", flowers: false }); for (let y = 30; y < 48; y++) for (let x = 0; x < AW; x++) { const inL = x < 20 + (y - 30) * 1.2; if (inL && b.g(x, y) && bay(x, y) < .45) b.p(x, y, P.moss2); if (!inL && b.g(x, y) && bay(x, y) < .3) b.p(x, y, P.plum3); }
  for (let y = 30; y < 48; y++) b.p(20 + (y - 30) * 1.2, y, P.butter);
  return hd(b, (g) => { BOSS.farol(g, 10, 32, { s: .8 }); g.save(); g.globalAlpha = .18; HD.shape(g, (gg) => HD.poly(gg, [[10, 18], [64, 30], [64, 48], [30, 48]]), { fill: P.butter, ink: false }); g.restore();
    F(g, 36, 46, CAST.poor, { dir: -1, front: [33, 37], rim: P.butter }); F(g, 41, 46.4, kid(CAST.poor), { dir: -1, emo: "sad" }); }); };

NOTE.pride = { scene: "En el salón de la Casa Albor, el Cristal Altivo brilla sobre su pedestal: nunca se ha apagado. Aurelia Albor apoya la mano en él, sola y cansada.", hidden: "Debajo del suelo, unos tubos bajan del pedestal hacia la tierra: la luz no es suya, la sacan de abajo." };
SCENE.pride = () => { const b = PL.room({ wall: P.fog, wall2: P.mist, floor: P.plum2 }); for (let x = 0; x < AW; x += 8) b.r(x, 0, 2, 36, P.cream);
  b.r(28, 26, 10, 10, P.mist); b.r(28, 26, 10, 1, P.cream); b.r(30, 36, 2, 12, P.plum1); b.r(34, 36, 2, 12, P.plum1); b.p(31, 42, P.butter); b.p(35, 45, P.butter);
  return hd(b, (g) => { glowDot(g, 33, 18, 4, P.butter, 40); HD.shape(g, (gg) => HD.poly(gg, [[33, 9], [37.6, 18], [33, 26], [28.4, 18]]), { fill: P.butter, light: P.cream, shade: P.ember4, lw: .35 });
    F(g, 46, 46, CAST.aurelia, { dir: -1, front: [38, 25], emo: "sad", rim: P.ember4 }); }); };

NOTE.law = { scene: "Al ponerse el sol, un guardia de Albor cierra la cancela del Prado. Un farolero del Envés se queda fuera, con su farol encendido en la mano.", hidden: "La sombra del guardia también se corta en el umbral: la ley no deja pasar ni a la sombra de los suyos." };
SCENE.law = () => { const b = PL.meadow({ sky: "dusk", flowers: false }); b.r(30, 18, 3, 30, P.plum1); b.r(30, 18, 3, 1, P.mist); for (let x = 33; x < 44; x += 2) b.r(x, 26, 1, 20, P.ink); b.r(33, 26, 11, 1, P.ink); b.r(33, 36, 11, 1, P.ink); b.r(22, 45, 8, 1, P.plum1);
  return hd(b, (g) => { F(g, 24, 46, CAST.albor, { front: [33, 36], rim: P.ember3 }); F(g, 52, 46, CAST.night, { dir: -1, front: [48, 36], emo: "sad", rim: P.ember3, hold: lanternHold }); }); };

/* --- La Forja Despierta (Cráter Tibio) --- */
NOTE.breath = { scene: "El Cráter Tibio exhala fuego al anochecer. Delante, la presa del Gremio retiene el arroyo y el cauce de abajo está seco y agrietado.", hidden: "En lo alto de la presa ondea la bandera del Gremio de la Brasa: la presa es suya." };
SCENE.breath = () => { const b = PL.crater({}); b.r(0, 30, 26, 12, P.plum2); b.r(0, 30, 26, 1, P.mist); for (let x = 2; x < 26; x += 5) b.r(x, 31, 1, 11, P.plum1); b.grad(0, 23, 24, 7, [P.sea2, P.sea1]); b.r(0, 23, 24, 1, P.sea3); for (let x = 3; x < 22; x += 6) b.r(x, 25, 3, 1, P.sea3); for (let x = 30; x < AW; x += 7) { b.p(x, 44, P.ink); b.p(x + 1, 45, P.ink); b.p(x + 2, 45, P.ink); } b.r(24, 22, 1, 8, P.ink);
  b.r(20, 14, 1, 16, P.ink); b.r(21, 14, 5, 3, P.ember2); b.p(23, 15, P.ember4); for (let x = 26; x < AW; x++) for (let y = 42; y < 48; y++) if ((x + y * 3) % 7 === 0) b.p(x, y, P.soil0);
  return hd(b, (g) => { g.save(); g.globalAlpha = .9; for (let i = 0; i < 6; i++) HD.shape(g, (gg) => HD.E(gg, 30 + Math.sin(i) * 2, 8 - i * 1.6, 2 + i * .7, 1.6 + i * .3), { fill: i < 2 ? P.ember4 : i < 4 ? P.ember2 : P.ember1, ink: false }); g.restore(); }); };

NOTE.blow = { scene: "La Forja Despierta martillea sin parar en la nave del Gremio. Alrededor, filas y filas de faroles idénticos esperan su turno.", hidden: "Cada farol lleva colgada una etiqueta con el sello de Albor: mil faroles, un solo cliente." };
SCENE.blow = () => { const b = PL.forge({ fx: 12, tools: false }); for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) { const x = 30 + i * 6 - row * 2, y = 10 + row * 9; b.layer((t) => { t.r(x, y, 3, 4, P.plum3); t.r(x - 1, y - 1, 5, 1, P.mist); }); b.p(x + 1, y + 1, P.butter); b.r(x + 3, y + 2, 1, 1, P.ember4); }
  return hd(b, (g) => { BOSS.forja(g, 22, 46, { hammer: true, dir: 1 }); HD.shape(g, (gg) => gg.rect(30, 40, 8, 3), { fill: P.plum3, shade: P.plum2, lw: .3 }); [[37, 33], [39, 35], [35, 32]].forEach(([x, y]) => glowDot(g, x, y, .5, P.ember4, 8)); }); };

NOTE.core = { scene: "Bajo la forja, en una cámara que nadie visita, late la Brasa Madre: una brasa enorme que nunca se ha enfriado.", hidden: "Una raíz gruesa abraza la brasa desde abajo. Nadie recuerda por qué no se enfría porque nadie ha bajado a mirar." };
SCENE.core = () => { const b = PL.root({ seed: 3 }); b.glow(32, 30, 26, P.ember0, .8, [P.ink, P.soil0, P.soil1]);
  return hd(b, (g) => { glowDot(g, 32, 28, 9, P.ember2, 50); HD.shape(g, (gg) => HD.blob(gg, [[22, 30], [24, 20], [32, 16], [41, 20], [43, 30], [36, 36], [28, 36]]), { fill: P.ember3, shade: P.ember2, light: P.ember4, lw: .4 });
    HD.shape(g, (gg) => HD.E(gg, 30, 24, 3, 2), { fill: P.butter, ink: false }); BOSS.root(g, [[0, 44], [14, 40], [24, 34], [30, 37], [40, 33], [46, 26], [48, 18]], 4, { rim: P.ember2 }); }); };

/* --- El Seto Hambriento (Bosque Hondo) --- */
NOTE.vine = { scene: "Un corte del suelo del Bosque Hondo: arriba los árboles; abajo, las raíces de una enredadera bajan y bajan hasta tocar una bolsa de savia negra.", hidden: "Justo en el punto donde la raíz toca la savia, la raíz cambia de color." };
SCENE.vine = () => { const b = new Pic(AW, AH); b.grad(0, 0, AW, 14, [P.moss1, P.moss2]); [[6, 4], [24, 5], [44, 4]].forEach(([x, w]) => trunk(b, x, 0, w, 14)); grass(b, 12, [P.moss2, P.moss1, P.moss3], 4); b.grad(0, 16, AW, 32, [P.soil1, P.soil0, P.ink]);
  b.e(40, 40, 14, 5, SAP.s1); b.e(40, 40.5, 12, 4, SAP.s0); b.p(36, 39, SAP.sheen); b.p(44, 41, SAP.sheen);
  return hd(b, (g) => { BOSS.root(g, [[20, 13], [22, 20], [28, 26], [32, 32], [36, 38]], 3, { fill: P.moss1 }); BOSS.root(g, [[30, 13], [33, 22], [38, 30], [40, 37]], 2.4, { fill: P.moss1 });
    BOSS.root(g, [[36, 36], [37, 38.6], [38, 40]], 1.4, { fill: SAP.s2, rim: SAP.sheen, rimA: .8 }); }); };

NOTE.thorn = { scene: "Dentro del Muro de Espinos, una niña del bosque intenta asomarse entre las púas. Detrás, los mayores la miran sin decir nada.", hidden: "Al otro lado del muro la espera un niño del Envés: el de la Semilla de Saludo." };
SCENE.thorn = () => { const b = PL.forest({}); b.r(30, 6, 12, 42, P.moss0); for (let y = 6; y < 48; y += 2) for (let x = 30; x < 42; x += 3) { b.p(x + (y % 4), y, P.soil3); b.p(x + 1 + (y % 4), y + 1, P.moss1); }
  return hd(b, (g) => { F(g, 26, 45, kid(CAST.forest), { front: [30.4, 34], emo: "open", rim: P.moss4 }); F(g, 12, 45, CAST.liquen, { emo: "sad" }); F(g, 18, 45.4, CAST.forest, { hairStyle: "bun", emo: "sad" });
    F(g, 52, 45, kid(CAST.nightBare), { dir: -1, emo: "open", rim: P.moss4 }); }); };

NOTE.root = { scene: "Un árbol viejo del bosque bebe de abajo con todas sus raíces. Lo que sube por el tronco no es agua y las hojas se le están poniendo negras.", hidden: "Entre los arbustos de detrás se ven dos ojos amarillos: el Seto Hambriento está mirando." };
SCENE.root = () => { const b = PL.forest({ night: false }); b.grad(0, 40, AW, 8, [P.soil0, P.ink]); b.e(30, 46, 20, 3, SAP.s1);
  for (let y = 0; y < 14; y++) for (let x = 14; x < 46; x++) if (b.g(x, y) && bay(x, y) < .4) b.p(x, y, SAP.s1);
  return hd(b, (g) => { HD.shape(g, (gg) => HD.poly(gg, [[26, 42], [27, 10], [33, 10], [34, 42]]), { fill: P.soil1, shade: P.soil0, light: P.soil2, lw: .4 });
    for (let y = 40; y > 12; y -= 4) HD.dot(g, 30 + Math.sin(y) * 1.2, y, .4, SAP.sheen);
    [[-1, 18], [1, 14], [-.6, 8]].forEach(([d, l]) => BOSS.root(g, [[30, 40], [30 + d * l * .5, 43], [30 + d * l, 46]], 2.2, { fill: P.soil1 }));
    [[52, 28], [56, 28]].forEach(([ex, ey]) => { HD.shape(g, (gg) => HD.E(gg, ex, ey, 1.2, .8), { fill: P.butter, lw: .22 }); HD.dot(g, ex, ey, .4, P.ink); }); }); };

/* --- El Trono Vacío (Hondonada Umbría) --- */
const throne = (g, x, y, s = 1) => HD.at(g, x, y, { s }, (g) => { HD.shape(g, (gg) => HD.poly(gg, [[-5, 0], [-5, -8], [-4, -20], [0, -23], [4, -20], [5, -8], [5, 0]]), { fill: P.plum2, shade: P.plum1, light: P.plum3, lw: .4 });
  HD.shape(g, (gg) => gg.rect(-5.6, -8, 11.2, 2.4), { fill: P.ember1, shade: P.ember0, lw: .3 }); HD.dot(g, 0, -19, .9, P.glim1); });
NOTE.court = { scene: "La corte del Rey Lóbrego entre la niebla: sillas vacías alrededor de un trono vacío. Nadie se sienta. Centinela monta guardia igual.", hidden: "Sobre una de las sillas cuelga una capa recién dejada: alguien estuvo sentado aquí hace muy poco." };
SCENE.court = () => { const b = PL.room({ wall: P.plum1, wall2: P.ink, floor: P.plum2 }); for (let y = 24; y < 48; y++) for (let x = 0; x < AW; x++) if (bay(x, y) < (y - 24) / 50) b.p(x, y, P.plum3);
  return hd(b, (g) => { throne(g, 32, 38, 1); [[12, 44], [20, 42], [44, 42], [52, 44]].forEach(([x, y], i) => { HD.shape(g, (gg) => HD.poly(gg, [[x - 2.4, y], [x - 2.4, y - 8], [x + 2.4, y - 8], [x + 2.4, y]]), { fill: P.plum2, shade: P.plum1, lw: .3 }); if (i === 2) HD.shape(g, (gg) => HD.poly(gg, [[x - 2.8, y - 8], [x + 2.8, y - 8], [x + 3.4, y - 3], [x - 1.4, y - 2]]), { fill: P.ember1, shade: P.ember0, lw: .25 }); });
    Cr(g, "centinela", 58, 46, { dir: -1, s: .9, rim: P.glim1 }); }); };

NOTE.crown = { scene: "La corona descansa sobre el cojín del trono vacío. Una mano del Envés se acerca a cogerla y se detiene a medio camino.", hidden: "Por dentro, la corona tiene grabados muchos nombres distintos: no es la primera vez que alguien duda." };
SCENE.crown = () => { const b = PL.room({ wall: P.plum1, wall2: P.ink, floor: P.plum2 }); b.glow(32, 24, 18, P.plum2, .6, [P.plum1, P.ink]);
  return hd(b, (g) => { throne(g, 32, 46, 1.8); HD.shape(g, (gg) => HD.E(gg, 32, 30.6, 6, 1.6), { fill: P.ember1, lw: .3 });
    HD.shape(g, (gg) => HD.poly(gg, [[28, 30], [28, 25], [30, 27.4], [32, 24], [34, 27.4], [36, 25], [36, 30]]), { fill: P.mist, shade: P.plum3, light: P.fog, rim: P.glim1, rimB: 12, lw: .3 });
    [[29, 29], [31, 29.4], [33, 29], [35, 29.4]].forEach(([x, y]) => HD.stroke(g, (gg) => { gg.moveTo(x, y); gg.lineTo(x + .8, y); }, P.plum2, .2));
    HD.limb(g, [[64, 30], [54, 28], [44, 26]], 2.4, 1.6, P.plum2); HD.dot(g, 44, 26, 1.1, P.fog); }); };

/* --- La Que Mira desde Abajo (Lago Espejo) --- */
NOTE.mirror = { scene: "Orilla se asoma al Espejo Hondo. En el agua no aparece ella de mayor: aparecen dos niñas pequeñas cogidas de la mano, ella y su hermana Ola.", hidden: "En el reflejo, Ola lleva el pañuelo rojo que todavía lleva hoy en el Cráter." };
SCENE.mirror = () => { const b = PL.lake({ sky: "night", hz: 24 }); b.poly([[0, 24], [0, 18], [26, 18], [34, 24]], P.plum1);
  return hd(b, (g) => { F(g, 20, 24, CAST.orilla, { pose: "kneel", front: [26, 22], emo: "sad", rim: P.sea3 });
    g.save(); g.globalAlpha = .7; g.translate(0, 48.4); g.scale(1, -1); F(g, 22, 24, kid(CAST.orilla), { front: [26, 15] }); F(g, 28, 24, kid(CAST.ola), { dir: -1, front: [25, 15] }); g.restore(); }); };

NOTE.gaze = { scene: "Desde el fondo del Lago Espejo todo parece pequeño: las barcas y la gente de la superficie son siluetas diminutas. Un ojo enorme las mira desde abajo.", hidden: "En el fondo, entre las algas, hay un farol de Albor hundido que todavía brilla." };
SCENE.gaze = () => { const b = new Pic(AW, AH); b.grad(0, 0, AW, AH, [P.sea3, P.sea1, P.sea0, P.ink]); for (let x = 0; x < AW; x += 3) b.p(x, 2 + (x % 2), P.sea4); b.r(16, 3, 8, 2, P.ink); b.r(40, 3, 6, 2, P.ink); b.r(42, 1, 1, 2, P.ink);
  for (let i = 0; i < 12; i++) { const x = 2 + i * 5; for (let y = 48; y > 38 + (i % 3) * 2; y--) b.p(x + Math.round(Math.sin(y * .5 + i)), y, P.moss1); } b.r(52, 42, 3, 4, P.butter); b.glow(53.5, 44, 5, P.sea1, .5, [P.sea0, P.ink]);
  return hd(b, (g) => { BOSS.eye(g, 30, 34, 6); }); };

/* --- Grava (Cuevas del Eco) --- */
NOTE.cavein = { scene: "En un túnel de las Cuevas, unos agrimensores de Albor huyen mientras el techo se viene abajo. Grava, la guardiana, no empuja nada: solo se queda quieta y deja caer las rocas.", hidden: "Las rocas caen justo encima de las marcas que los agrimensores habían pintado en la pared." };
SCENE.cavein = () => { const b = PL.cave({ seed: 61 }); [[40, 14], [44, 18], [48, 13]].forEach(([x, y]) => { b.r(x, y, 2, 2, P.ember4); b.p(x + 2, y + 1, P.ember4); });
  return hd(b, (g) => { F(g, 18, 46, CAST.grava, { emo: "closed", rim: P.glim1 }); [[38, 12, 2.6], [46, 16, 3.2], [50, 8, 2], [42, 22, 2.2], [54, 24, 2.8]].forEach(([x, y, r]) => HD.shape(g, (gg) => HD.blob(gg, [[x - r, y], [x - r * .4, y - r], [x + r, y - r * .6], [x + r * .8, y + r * .6], [x - r * .4, y + r]]), { fill: P.soil2, shade: P.soil1, light: P.soil3, lw: .3 }));
    F(g, 52, 46, CAST.albor, { dir: 1, pose: "run", emo: "open" }); F(g, 60, 46, CAST.albor, { dir: 1, pose: "run", hat: { k: "cap", c: [P.ember1, P.ember0] } }); }); };

NOTE.song = { scene: "Grava canta para los mineros, pero a trozos: a cada uno le da una tablilla con un pedazo distinto de la canción, para que nadie la aprenda entera.", hidden: "Si se juntan las tablillas de los tres mineros, las líneas forman la silueta de la raíz." };
SCENE.song = () => { const b = PL.cave({ seed: 71 });
  return hd(b, (g) => { F(g, 14, 46, CAST.grava, { sing: true, front: [22, 30], rim: P.glim1 });
    [[32, 46], [42, 46.4], [52, 46.6]].forEach(([x, y], i) => { F(g, x, y, i === 1 ? CAST.nightBare : CAST.miner, { dir: -1, front: [x - 4, y - 9], hold: (gg, hx, hy) => { HD.shape(gg, (q) => q.rect(hx - 3, hy - 3.4, 2.8, 3.6), { fill: P.soil3, shade: P.soil2, lw: .25 }); HD.stroke(gg, (q) => { q.moveTo(hx - 2.6 + i * .5, hy - 3); q.lineTo(hx - 1.4 + i * .3, hy - .4); }, P.soil0, .25); } }); });
    [[26, 26], [30, 22], [36, 25]].forEach(([x, y]) => noteG(g, x, y, P.glim1)); }); };

/* --- La Veleta Mayor (Los Altos) --- */
NOTE.gale = { scene: "Tormenta sobre Los Altos. La Veleta Mayor gira sin control y el viento arrastra cientos de papeles con noticias, todas a la vez.", hidden: "Entre los papeles vuela uno con el sello agrietado de Recado Urgente: la mentira también viaja aquí." };
SCENE.gale = () => { const b = PL.heights({ sky: "grey", spire: false }); for (let i = 0, r = rng(3); i < 30; i++) { const x = Math.floor(r() * AW), y = Math.floor(r() * 30); b.l(x, y, x + 4, y + 1, P.cream); }
  return hd(b, (g) => { BOSS.veleta(g, 32, 46, { rot: .5, rim: P.sea4 }); const r = rng(9); for (let i = 0; i < 12; i++) { g.save(); g.translate(6 + r() * 52, 4 + r() * 30); g.rotate(r() * 3); HD.shape(g, (gg) => gg.rect(-1.2, -.8, 2.4, 1.6), { fill: P.cream, lw: .2 }); g.restore(); }
    g.save(); g.translate(50, 14); g.rotate(.4); scroll(g, -1.6, 0, 3.2, SAP.s1); g.restore(); }); };

NOTE.voices = { scene: "En la plaza de Los Altos, a la gente se le escapa la voz por la boca como un hilo de humo, y todos los hilos van a parar a la Veleta Mayor.", hidden: "Uno de los hilos sale de Coplo: también él vendió la suya, y barata." };
SCENE.voices = () => { const b = PL.heights({ sky: "dusk", spire: false }); b.r(0, 38, AW, 10, P.mist); b.r(0, 38, AW, 1, P.fog);
  return hd(b, (g) => { BOSS.veleta(g, 46, 40, { rot: -.2, rim: P.rose2 });
    [[10, 44, CAST.heights], [18, 44.4, CAST.coplo], [26, 44.6, CAST.heights]].forEach(([x, y, c], i) => { F(g, x, y, c, { emo: "closed", rim: P.rose2 }); HD.stroke(g, (gg) => { gg.moveTo(x + 2, y - 13); gg.bezierCurveTo(x + 10, y - 22, 38, 6 + i * 4, 44, 12); }, "rgba(244,166,196,.8)", .5); }); }); };

NOTE.spin = { scene: "De noche, la Veleta Mayor gira hacia donde sopla el viento. Abajo, Coplo cambia la letra de su canción para que apunte al mismo sitio.", hidden: "La hoja nueva de Coplo y la flecha de la Veleta señalan hacia el Prado: esta semana el viento sopla a favor de Albor." };
SCENE.spin = () => { const b = PL.heights({ sky: "night", spire: false }); b.r(0, 38, AW, 10, P.plum2);
  return hd(b, (g) => { BOSS.veleta(g, 40, 40, { rot: Math.PI, rim: P.glim1 }); F(g, 16, 46, CAST.coplo, { front: [22, 34], rim: P.glim1, hold: (gg, x, y) => { HD.shape(gg, (q) => q.rect(x - .4, y - 3, 3, 3.6), { fill: P.cream, lw: .22 }); HD.shape(gg, (q) => HD.poly(q, [[x + .4, y - 1.6], [x + 2, y - 1.6], [x + 1.4, y - 2.2]]), { fill: P.ember3, lw: .15 }); } });
    HD.shape(g, (gg) => gg.rect(4, 42, 3, 3.6), { fill: P.fog, lw: .2 }); }); };

/* --- La Madre Micelio (El Fondo Blanco) --- */
NOTE.spores = { scene: "Una nube de esporas cae sobre el pueblo del Fondo Blanco. La gente se tapa la boca y huele a pan, a tierra y a algo que no debería oler a nada.", hidden: "La silueta de la Madre Micelio se adivina dentro de la nube, dormida." };
SCENE.spores = () => { const b = PL.snow({ sky: "grey" }); igloo(b, 50, 33, 9, 8, true); igloo(b, 30, 32, 6, 5, false);
  return hd(b, (g) => { g.save(); g.globalAlpha = .3; BOSS.micelio(g, 34, 26, { s: 1.2 }); g.restore(); const r = rng(4); for (let i = 0; i < 60; i++) HD.dot(g, r() * 64, r() * 30, .3 + r() * .4, i % 3 ? P.rose2 : P.cream);
    F(g, 14, 45, CAST.frost, { front: [16.4, 33], emo: "closed", rim: P.rose2 }); F(g, 21, 45.4, kid(CAST.frost), { front: [22.4, 37.2], emo: "closed" }); }); };

NOTE.threads = { scene: "Bajo el hielo del Fondo Blanco, los hilos blancos de la Madre Micelio corren por la tierra más lejos que cualquier túnel, y uno llega hasta la Tumba.", hidden: "El hilo más largo toca la punta de raíz que duerme bajo la Tumba." };
SCENE.threads = () => { const b = new Pic(AW, AH); b.grad(0, 0, AW, 8, [P.fog, P.cream]); b.r(0, 8, AW, 2, P.sea3); b.grad(0, 10, AW, 38, [P.soil1, P.soil0, P.ink]); b.layer((t) => { t.r(51, 1, 10, 7, P.plum3); t.r(50, 0, 12, 1, P.mist); }); b.r(54, 3, 4, 5, P.ink); for (let x = 56; x < 62; x += 2) b.p(x, 12 + (x % 3), P.cream);
  return hd(b, (g) => { BOSS.micelio(g, 10, 22, { s: .6 }); const r = rng(6); for (let i = 0; i < 9; i++) { let x = 12, y = 20; HD.stroke(g, (gg) => { gg.moveTo(x, y); for (let k = 0; k < 8; k++) { x += 3 + r() * 4; y += (r() - .4) * 6; gg.lineTo(x, Math.max(12, Math.min(46, y))); } }, P.cream, .35); }
    BOSS.root(g, [[64, 44], [58, 40], [54, 34]], 3, { rim: P.butter }); HD.stroke(g, (gg) => { gg.moveTo(12, 22); gg.bezierCurveTo(30, 30, 44, 40, 54, 35); }, P.cream, .5); }); };

NOTE.sapbed = { scene: "La Madre Micelio duerme tranquila encima de un charco de savia. Por una vez, la savia no le hace daño a nadie. Esporina la mira con esperanza.", hidden: "Alrededor del charco, la nieve no se ha puesto gris: es la única savia que no mancha." };
SCENE.sapbed = () => { const b = PL.snow({ sky: "night" }); b.e(28, 41, 18, 5, SAP.s1); b.e(28, 41.5, 16, 4, SAP.s0); b.p(20, 40, SAP.sheen); b.p(36, 42, SAP.sheen);
  return hd(b, (g) => { BOSS.micelio(g, 28, 41, { s: 1.1, rim: P.rose2 }); F(g, 54, 46, CAST.esporina, { dir: -1, front: [50, 37], emo: "open", rim: P.rose2 }); }); };

/* --- La Raíz Doliente (Corazón del Claro) --- */
NOTE.ache = { scene: "En lo más hondo del Claro, la Raíz Doliente está agrietada y suda savia negra. El Cuidador, con su farol, es una figura diminuta a su lado.", hidden: "Las grietas forman nueve líneas, una por cada verso del Canto." };
SCENE.ache = () => { const b = PL.root({ seed: 8 });
  return hd(b, (g) => { BOSS.root(g, [[64, 6], [50, 14], [40, 22], [36, 32], [38, 42], [44, 48]], 22, { rim: P.ember1 });
    for (let i = 0; i < 9; i++) HD.stroke(g, (gg) => { gg.moveTo(36 + i * 1.6, 16 + i * 2.6); gg.lineTo(40 + i * 1.6, 18 + i * 2.6); }, SAP.s0, .5); [[42, 24], [46, 34], [40, 38]].forEach(([x, y]) => HD.dot(g, x, y, .5, SAP.sheen));
    F(g, 14, 46, cuidador, { front: [18, 37], rim: P.butter, hold: lanternHold }); }); };

NOTE.eight = { scene: "Alrededor de la Raíz se alzan, como fantasmas, ocho cantores: uno por pueblo. Cada uno le canta algo distinto, y la Raíz se acuerda de todos.", hidden: "Falta el noveno: el sitio del Envés más hondo está vacío." };
SCENE.eight = () => { const b = PL.root({ seed: 12 });
  return hd(b, (g) => { BOSS.root(g, [[32, 0], [32, 12], [31, 24], [32, 36], [32, 48]], 12, { rim: P.butter });
    [[6, 46, CAST.tila], [12, 42, CAST.forest], [18, 40, CAST.tizon], [24, 38, CAST.heights], [42, 38, CAST.water], [48, 40, CAST.miner], [54, 42, CAST.nightBare], [60, 46, CAST.frost]].forEach(([x, y, c], i) => { g.save(); g.globalAlpha = .6; F(g, x, y, c, { s: .7, dir: x < 32 ? 1 : -1, sing: true, rim: P.cream }); g.restore(); }); }); };

NOTE.rootheart = { scene: "Dentro de la Raíz hay un corazón de madera que late una vez cada cien años. Hoy ha latido tres veces, y los anillos de luz todavía se están abriendo.", hidden: "Los tres anillos tienen colores distintos: el último es verde savia." };
SCENE.rootheart = () => { const b = PL.root({ seed: 21 });
  return hd(b, (g) => { [[16, P.butter], [11, P.ember3], [6, SAP.sheen]].forEach(([r, c], i) => HD.stroke(g, (gg) => gg.arc(32, 26, r + 6, 0, Math.PI * 2), c, .4 + i * .1));
    glowDot(g, 32, 26, 6, P.ember3, 40); HD.shape(g, (gg) => HD.blob(gg, [[26, 22], [29, 18], [32, 21], [35, 18], [38, 22], [32, 32]]), { fill: P.soil2, shade: P.soil1, light: P.soil3, lw: .45 }); HD.dot(g, 30, 22, .7, P.butter); }); };
/* ================= Event scenes, v2: Prado Aurora =================
   Life in Adventure-like plates: 128x96 native pixels (4x the card scenes), shown at 512x384.
   Backgrounds are built in depth layers (far = dark and flat, near = outlined and detailed) so props read
   at a glance; people and creatures are the same hand-drawn figures as the cards, on top.
   EVNOTE[id] = { scene, hidden }. */
const EVSC = {}, EVNOTE = {};
const EW = 128, EH = 96, EK = 4;
function hd2(b, fn) {
  const c = canvas(EW * EK, EH * EK), g = c.getContext("2d"), s = canvas(EW, EH); b.draw(s.getContext("2d"));
  g.imageSmoothingEnabled = false; g.drawImage(s, 0, 0, EW * EK, EH * EK);
  g.save(); g.scale(EK, EK); g.lineJoin = "round"; g.lineCap = "round"; fn(g); g.restore(); return c;
}
let OL = P.ink; // outline tone for near props, set per scene
const BGC = [P.ink, P.sea0, P.plum1, P.plum2]; // colours a light spill may tint

/* ---------- clean light: no dithering. Colours are mixed between palette tones and posterised in flat steps ---------- */
const hx = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
// vertical gradient in n flat bands
function band(b, x, y, w, h, c0, c1, n = 6, c2) { for (let j = 0; j < h; j++) { const f = Math.min(n - 1, Math.floor(j / h * n)) / (n - 1);
  const c = c2 ? (f < .5 ? mix(c0, c1, f * 2) : mix(c1, c2, (f - .5) * 2)) : mix(c0, c1, f); b.r(x, y + j, w, 1, c); } }
// soft light in flat rings: pulls the pixels already there toward col
function light(b, cx, cy, rx, ry, col, a = .6, n = 4) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
  const d = Math.hypot((x + .5 - cx) / rx, (y + .5 - cy) / ry); if (d >= 1) continue; const cur = b.g(x, y); if (!cur) continue;
  const k = Math.ceil((1 - d) * n) / n; b.p(x, y, mix(cur, col, a * k * k)); } }
// a haze band: everything between y0 and y1 drifts toward col, strongest at the middle
function haze(b, y0, y1, col, a = .5, n = 4) { for (let y = y0; y < y1; y++) { const f = 1 - Math.abs((y - y0) / (y1 - y0) * 2 - 1), k = Math.ceil(f * n) / n * a;
  for (let x = 0; x < EW; x++) { const cur = b.g(x, y); if (cur) b.p(x, y, mix(cur, col, k)); } } }
// tint a whole rectangle (to push a layer back in depth)
function tint(b, x0, y0, w, h, col, a) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const c = b.g(x, y); if (c) b.p(x, y, mix(c, col, a)); } }
// figures drawn as vector, then snapped to the same pixel grid as the scene (alpha cut, no soft edges)
function pixFig(fn, res = 2) {
  const W = EW * res, H = EH * res, c = canvas(W, H), g = c.getContext("2d");
  g.save(); g.scale(res, res); g.lineJoin = "round"; g.lineCap = "round"; fn(g); g.restore();
  const im = g.getImageData(0, 0, W, H), d = im.data;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 165) { d[i + 3] = 0; continue; } d[i + 3] = 255; }
  g.putImageData(im, 0, 0); return c;
}
function plate(b, figs, res = 2) {
  const c = canvas(EW * EK, EH * EK), g = c.getContext("2d"), s = canvas(EW, EH); b.draw(s.getContext("2d"));
  g.imageSmoothingEnabled = false; g.drawImage(s, 0, 0, EW * EK, EH * EK);
  if (figs) g.drawImage(pixFig(figs, res), 0, 0, EW * EK, EH * EK); return c;
}

/* ---------- scenery kit ---------- */
// far rooftops: flat dark silhouettes with a few warm windows
function skyline(b, y, col, seed, lit = P.ember3) {
  const r = rng(seed); let x = -2;
  while (x < EW) { const w = 8 + Math.floor(r() * 9), h = 4 + Math.floor(r() * 7), roof = 2 + Math.floor(r() * 4);
    b.r(x, y - h, w, h + 30, col); b.poly([[x - 1, y - h], [x + w / 2, y - h - roof], [x + w + 1, y - h]], col);
    if (r() < .5) b.r(x + 2, y - h - roof, 2, roof, col);
    for (let i = 0; i < 2; i++) if (r() < .45) b.p(x + 2 + Math.floor(r() * (w - 4)), y - h + 2 + Math.floor(r() * 3), lit);
    x += w + Math.floor(r() * 2); }
}
// the Torre del Alba: seven floors, the lantern that never goes out on top
function towerAlba(b, x, top, w, base, o = {}) {
  const wall = o.wall || P.plum2, dark = o.dark || P.plum1;
  b.layer((t) => {
    t.r(x, top, w, base - top, wall); t.r(x + w - 2, top, 2, base - top, dark);
    const fl = (base - top) / 7;
    for (let i = 1; i < 7; i++) { const y = Math.round(top + i * fl); t.r(x - 1, y, w + 2, 1, o.trim || P.mist); }
    for (let i = 0; i < 7; i++) { const y = Math.round(top + i * fl + fl / 2 - 1); t.r(x + Math.floor(w / 2) - 1, y, 2, 3, o.lit ? P.ember4 : dark); }
    t.poly([[x - 2, top], [x + w / 2, top - 7], [x + w + 2, top]], dark);
    t.r(x + w / 2 - 2, top - 13, 4, 6, P.butter); t.r(x + w / 2 - 3, top - 14, 6, 1, P.mist); t.r(x + w / 2 - 3, top - 7, 6, 1, P.mist); t.p(x + w / 2 - 1, top - 11, P.cream);
  }, o.ol || wall);
  light(b, x + w / 2, top - 10, 16, 14, P.ember4, .4, 5);
}
// detailed house: stone courses, timber frame, tiled roof, framed windows, planked door. o.night tints it down
function house2(b, x, y, w, h, o = {}) {
  const N = o.night;
  const wall = o.wall || (N ? P.plum2 : P.fog), course = N ? P.plum1 : P.mist, edge = N ? P.plum3 : P.cream;
  const beam = P.soil0, tile = o.tile || (N ? [P.plum1, P.ink, P.plum2] : [P.ember1, P.ember0, P.ember2]);
  const rh = o.roofH || Math.round(w * .32);
  b.layer((t) => {
    t.r(x, y, w, h, wall);
    for (let j = y + 3; j < y + h; j += 3) { t.r(x, j, w, 1, course); for (let i = x + ((j / 3) % 2 ? 2 : 5); i < x + w; i += 7) t.p(i, j + 1, course); }
    t.r(x, y, 1, h, edge);
    if (o.timber !== false) { t.r(x, y, w, 1, beam); t.r(x, y + Math.floor(h * .45), w, 1, beam); t.r(x, y, 1, h, beam); t.r(x + w - 1, y, 1, h, beam); }
    // roof
    t.poly([[x - 3, y + 1], [x + w / 2, y - rh], [x + w + 3, y + 1]], tile[0]);
    for (let j = y - rh + 3; j <= y; j += 2) { const f = (j - (y - rh)) / rh, hw = (w / 2 + 3) * f; for (let i = Math.ceil(x + w / 2 - hw) + (j % 4 ? 0 : 1); i < x + w / 2 + hw; i += 2) t.p(i, j, tile[1]); }
    t.l(x - 3, y + 1, x + w / 2, y - rh, tile[2]); t.r(x - 3, y + 1, w + 6, 1, tile[1]);
    if (o.chimney) t.r(x + Math.round(w * .7), y - rh * .7 - 3, 3, 6, course);
    // windows
    (o.win || []).forEach(([wx, wy, lit, box]) => { const X = x + wx, Y = y + wy;
      t.r(X - 1, Y - 1, 8, 9, beam); t.r(X, Y, 6, 7, lit ? P.butter : (N ? P.ink : P.sea1));
      if (lit) { t.r(X, Y + 4, 6, 3, P.ember4); t.p(X + 1, Y + 1, P.cream); } else t.p(X + 1, Y + 1, N ? P.plum2 : P.sea3);
      t.r(X + 3, Y, 1, 7, beam); t.r(X, Y + 3, 6, 1, beam); t.r(X - 2, Y + 8, 10, 1, edge);
      if (box) { t.r(X - 1, Y + 9, 8, 2, P.soil1); [0, 2, 4, 6].forEach((k) => t.p(X + k, Y + 8, k % 4 ? P.rose2 : P.cream)); } });
    // door
    if (o.door != null) { const X = x + o.door, Y = y + h - 13;
      t.r(X - 1, Y - 1, 9, 14, beam); t.r(X, Y, 7, 13, o.doorLit ? P.ember3 : P.soil1); for (let i = X + 2; i < X + 7; i += 2) t.r(i, Y + 1, 1, 12, P.soil0);
      t.p(X + 5, Y + 7, P.ember4); t.r(X - 2, Y + 13, 11, 1, edge); }
  }, OL);
  (o.win || []).forEach(([wx, wy, lit]) => { if (lit) light(b, x + wx + 3, y + wy + 3, 10, 9, P.ember4, N ? .35 : .2, 3); });
}
// an Albor street lantern on a post: base, post, crossbar, glass cage; o.sap = the hidden 1 px seam
function lamp2(b, x, gy, h, o = {}) {
  const top = gy - h, s = o.small;
  b.layer((t) => {
    t.r(x - (s ? 1 : 2), gy - 2, s ? 3 : 5, 2, P.plum2); t.r(x, top, 1, h, P.plum1); if (!s) t.r(x + 1, top, 1, h, P.plum2);
    if (!s) { t.r(x - 3, top + 2, 8, 1, P.plum1); t.p(x - 3, top + 3, P.plum1); t.p(x + 4, top + 3, P.plum1); }
    const gw = s ? 3 : 5, gh = s ? 4 : 7, gx = x + 1 - Math.ceil(gw / 2);
    t.r(gx - 1, top - gh - 1, gw + 2, 1, P.mist); t.poly([[gx - 1, top - gh - 1], [gx + gw / 2, top - gh - (s ? 3 : 4)], [gx + gw + 1, top - gh - 1]], P.plum2);
    t.r(gx, top - gh, gw, gh, o.off ? P.plum1 : P.butter); if (!o.off && !s) { t.r(gx + 1, top - gh + 1, gw - 2, gh - 3, P.cream); t.r(gx, top - 2, gw, 2, P.ember4); t.r(gx + 2, top - gh, 1, gh, P.mist); }
    t.r(gx - 1, top, gw + 2, 1, P.mist);
  }, OL);
  if (!o.off) { const gh = s ? 4 : 7; light(b, x + .5, top - gh / 2, o.r || 18, (o.r || 18) * .8, o.gc || P.ember4, o.k || .45, 5); }
  if (o.sap) { b.p(x - 1, top + 1, SAP.s2); b.p(x, top + 1, SAP.s2); b.p(x + 1, top + 1, SAP.sheen); }
}
// cobbles in perspective: rows grow toward the viewer
function cobbles2(b, y0, o = {}) {
  const base = o.base || P.plum1, st = o.stone || P.plum2, hi = o.hi || P.plum3, r = rng(o.seed || 9);
  b.r(0, y0, EW, EH - y0, base);
  let y = y0 + 1, row = 0;
  while (y < EH) { const rh = 1 + Math.floor((y - y0) / 7), sw = 3 + Math.floor((y - y0) / 4);
    for (let x = -((row * 3) % sw); x < EW; x += sw + 1) { const w = sw - Math.floor(r() * 2); b.r(x, y, w, rh, st); b.r(x, y, w, 1, hi); b.p(x, y, o.hi2 || P.mist); }
    y += rh + 1; row++; }
  b.r(0, y0, EW, 1, P.ink);
}
const latas = (b, list) => b.layer((t) => list.forEach(([x, y]) => { t.r(x, y - 7, 6, 7, P.mist); t.r(x + 4, y - 7, 2, 7, P.plum3); t.r(x + 1, y - 6, 1, 5, P.cream);
  t.r(x, y - 8, 6, 1, P.fog); t.r(x + 2, y - 9, 2, 1, P.plum3); t.r(x + 1, y - 4, 4, 2, P.ember1); t.p(x + 2, y - 4, P.ember2); }));
function whiteFlowers(b, x0, x1, y0, y1, seed, greyFn) { const r = rng(seed);
  for (let i = 0; i < (x1 - x0) * (y1 - y0) / 24; i++) { const x = x0 + Math.floor(r() * (x1 - x0)), y = y0 + Math.floor(r() * (y1 - y0)), grey = greyFn && greyFn(x, y);
    const big = y > y0 + (y1 - y0) * .5; b.p(x, y + 1, grey ? P.plum2 : P.moss1);
    if (big) { b.p(x - 1, y, grey ? P.plum3 : P.cream); b.p(x + 1, y, grey ? P.plum3 : P.cream); b.p(x, y - 1, grey ? P.plum3 : P.cream); b.p(x, y, grey ? P.mist : P.butter); }
    else b.p(x, y, grey ? P.plum3 : P.cream); } }

/* ---------- 1 · Pabilo, el farolero que cuenta ---------- */
EVNOTE.farolero = { scene: "Una calle del Prado de noche. Pabilo, farolero viejo de la Casa Albor, enciende con su pértiga el farol ciento doce. Al fondo, entre la neblina, la Torre del Alba; el cielo brilla tanto que no se ve ni una estrella.",
  hidden: "A su lado hay tres latas de aceite con el sello rojo sin romper, y en la base del farol asoma la línea de savia de un píxel." };
EVSC.farolero = () => { const b = new Pic(EW, EH); OL = mix(P.ink, P.plum1, .4);
  band(b, 0, 0, EW, 64, P.ink, P.plum1, 8, mix(P.plum2, P.rose0, .35));
  towerAlba(b, 58, 16, 11, 64, { wall: mix(P.plum2, P.plum3, .3), dark: P.plum2, trim: P.plum3, lit: true });
  skyline(b, 52, mix(P.plum1, P.plum2, .5), 4, mix(P.ember3, P.plum2, .4));
  haze(b, 40, 64, mix(P.plum2, P.rose0, .4), .45);
  house2(b, -6, 22, 46, 44, { night: true, win: [[10, 8, 1, 1], [28, 8, 0, 1], [10, 26, 1]], door: 26, chimney: true });
  house2(b, 92, 26, 42, 40, { night: true, win: [[8, 8, 1, 1], [24, 8, 1], [24, 24, 0]], door: 8 });
  b.poly([[40, 66], [56, 53], [72, 53], [92, 66]], mix(P.plum1, P.plum2, .4));
  [[53, 55, 8, true], [71, 55, 8, true], [47, 59, 13], [80, 59, 13]].forEach(([x, gy, h, sm]) => lamp2(b, x, gy, h, { small: sm, r: sm ? 7 : 11, k: .35 }));
  tint(b, 40, 30, 52, 36, mix(P.plum2, P.rose0, .4), .25);
  cobbles2(b, 66, { base: P.plum1, stone: mix(P.plum1, P.plum2, .6), hi: P.plum2, hi2: mix(P.plum2, P.plum3, .5), seed: 12 });
  latas(b, [[66, 90], [73, 91], [69, 84]]);
  lamp2(b, 96, 88, 54, { r: 30, k: .5, sap: true });
  return plate(b, (g) => {
    F(g, 84, 92, CAST.albor, { s: 1.75, beard: P.fog, hairStyle: "none", cloth: [P.butter, P.ember3, P.cream], front: [92.6, 34.4], back: [80.4, 77], emo: "closed",
      hold: (q, x, y) => { HD.stroke(q, (z) => { z.moveTo(x - 1, y + 9); z.lineTo(x + .6, y - 2.2); }, P.ink, .8); HD.stroke(q, (z) => { z.moveTo(x - 1, y + 9); z.lineTo(x + .6, y - 2.2); }, P.soil2, .4); HD.dot(q, x + .7, y - 2.6, .5, P.ember4); } });
    HD.shape(g, (q) => q.rect(77.6, 75.6, 3.6, 2.8), { fill: P.cream, shade: P.fog, sx: 0, sy: .6, lw: .3 }); }); };

/* ---------- 2 · Alvar, el chico de las botas limpias ---------- */
EVNOTE.alvar = { scene: "Atardecer en una plaza del Prado, entre un parterre de flores blancas y los primeros faroles. Un chico con un abrigo remendado te corta el paso con los brazos abiertos. Detrás, la Torre del Alba.",
  hidden: "Sus botas brillan como dos faroles, cosa que nadie del Barrio puede pagar, y en una ventana alta de la Torre hay una silueta mirando." };
EVSC.alvar = () => { const b = new Pic(EW, EH); OL = P.soil0;
  band(b, 0, 0, EW, 66, mix(P.sea0, P.rose0, .5), P.ember2, 9, P.butter);
  b.e(34, 50, 8, 8, P.cream); light(b, 34, 50, 34, 26, P.butter, .55, 5);
  skyline(b, 58, mix(P.rose0, P.ember1, .35), 21, P.ember4);
  haze(b, 46, 66, P.ember3, .35);
  towerAlba(b, 84, 20, 16, 66, { wall: mix(P.plum3, P.rose0, .3), dark: mix(P.plum2, P.rose0, .3), trim: mix(P.fog, P.ember3, .3), ol: mix(P.plum2, P.rose0, .3), lit: false });
  b.r(91, 44, 2, 3, P.ink); b.p(91, 43, P.ink);
  house2(b, -4, 28, 40, 38, { win: [[8, 8, 1, 1], [24, 8, 0, 1]], door: 14, chimney: true });
  house2(b, 104, 34, 30, 32, { win: [[6, 8, 1]], door: 16 });
  tint(b, 0, 20, EW, 46, P.ember3, .12);
  cobbles2(b, 66, { base: P.soil1, stone: mix(P.soil1, P.soil2, .6), hi: P.soil2, hi2: P.soil3, seed: 31 });
  b.layer((t) => { t.r(0, 78, 40, 18, P.moss1); t.r(0, 77, 41, 1, P.mist); t.r(40, 77, 1, 19, P.mist); }, OL);
  whiteFlowers(b, 1, 39, 80, 95, 5);
  [[48, 66, 30], [76, 66, 24]].forEach(([x, gy, h]) => lamp2(b, x, gy, h, { r: 10, k: .3 }));
  light(b, 64, 60, 60, 30, P.ember4, .18, 3);
  return plate(b, (g) => {
    F(g, 64, 90, CAST.poor, { s: 1.75, hair: P.butter, hairStyle: "short", cloth: [P.soil1, P.soil0, P.soil2], front: [76.4, 66.2], back: [51.6, 67.4], emo: "open" });
    [[62.2, 89.5], [66.3, 89.5]].forEach(([x, y]) => { HD.shape(g, (q) => HD.E(q, x, y, 1.4, .8), { fill: P.butter, lw: .35 }); HD.dot(g, x - .5, y - .3, .35, P.cream); });
    [[59.5, 72], [64.4, 75], [61.6, 79]].forEach(([x, y]) => HD.stroke(g, (q) => { q.moveTo(x, y); q.lineTo(x + 1.6, y + 1.4); }, P.soil0, .45)); }); };

/* ---------- 3 · Nim bajo la verja ---------- */
EVNOTE.verja = { scene: "Las afueras del Prado de noche. Las flores blancas se vuelven grises cerca de la verja de Albor. Nim, de rodillas junto a un hueco excavado bajo los barrotes, dibuja con carbón en una piedra. Al otro lado, de la boca de un pozo con aros de hierro sube una columna de luz fría.",
  hidden: "Dentro de la columna de luz suben gotas de savia, y a lo lejos, a la izquierda, se acerca el farolillo de un guarda." };
EVSC.verja = () => { const b = new Pic(EW, EH); OL = P.ink;
  band(b, 0, 0, EW, 60, P.ink, P.sea0, 7, mix(P.sea0, P.plum2, .5));
  const r = rng(41); for (let i = 0; i < 22; i++) { const x = 44 + Math.floor(r() * 84), y = Math.floor(r() * 34); b.p(x, y, i % 4 ? mix(P.fog, P.sea0, .4) : P.cream); }
  light(b, 0, 58, 46, 22, P.ember3, .35, 4);
  skyline(b, 60, mix(P.ink, P.plum1, .5), 9, P.ember4);
  b.poly([[0, 64], [0, 58], [30, 56], [64, 59], [100, 55], [128, 57], [128, 64]], mix(P.plum1, P.sea0, .5));
  haze(b, 50, 66, mix(P.sea0, P.plum2, .5), .4);
  band(b, 0, 62, EW, 34, mix(P.moss0, P.sea0, .4), P.moss1, 5);
  // the well and its column of cold light
  const wx = 94, wy = 64;
  for (let y = 0; y < wy; y++) { const f = y / wy, hw = 4 + f * 9; for (let x = Math.floor(wx - hw); x <= wx + hw; x++) { const d = Math.abs(x + .5 - wx) / hw; if (d < 1) { const k = Math.ceil((1 - d) * 3) / 3 * (.2 + f * .45); b.p(x, y, mix(b.g(x, y), P.sea3, k)); } } }
  light(b, wx, wy, 34, 16, P.sea2, .45, 4);
  b.layer((t) => { t.e(wx, wy + 1, 16, 5, P.plum2); t.r(wx - 16, wy + 1, 33, 4, P.plum2); t.e(wx, wy + 5, 16, 3, P.plum1); for (let i = -14; i <= 14; i += 4) t.r(wx + i, wy + 2, 1, 5, P.plum1);
    t.e(wx, wy, 13.5, 3.6, P.sea4); t.e(wx, wy + .3, 9.5, 2.2, P.cream); }, mix(P.ink, P.sea0, .5));
  b.layer((t) => { t.r(wx - 15, wy - 16, 2, 17, P.plum2); t.r(wx + 14, wy - 16, 2, 17, P.plum2); t.r(wx - 16, wy - 17, 33, 2, P.plum2); t.r(wx - 15, wy - 17, 31, 1, P.plum3); }, mix(P.ink, P.sea0, .5));
  for (let i = 0; i < 4; i++) b.l(wx - 6 + i * 4, wy - 15, wx - 7 + i * 4.4, wy - 1, mix(P.ember4, P.sea3, .3));
  [[wx - 3, wy - 22], [wx + 4, wy - 30], [wx - 5, wy - 38], [wx + 1, wy - 46]].forEach(([x, y]) => dropUp(b, x, y));
  whiteFlowers(b, 0, EW, 68, 95, 17, (x, y) => x > 44 || (x > 26 && (x + y) % 2));
  const fy = 80, iron = mix(P.ink, P.plum1, .6), iron2 = P.plum2;
  for (let x = 2; x < EW; x += 7) { b.r(x, fy - 24, 1, 25, iron); b.poly([[x - 1, fy - 24], [x + .5, fy - 28], [x + 2, fy - 24]], iron); }
  b.r(0, fy - 20, EW, 1, iron2); b.r(0, fy - 6, EW, 1, iron2);
  b.r(58, fy - 30, 5, 31, iron2); b.r(58, fy - 30, 1, 31, P.plum3); b.poly([[57, fy - 30], [60.5, fy - 35], [64, fy - 30]], iron2);
  b.e(60.5, fy - 18, 4.4, 4.4, P.ember3); b.e(60.5, fy - 18, 3, 3, P.ember4); b.r(60, fy - 21, 1, 5, P.butter); b.r(58, fy - 19, 5, 1, P.butter);
  b.e(40, fy + 1, 9, 3.6, P.ink); b.e(40, fy, 7, 2.2, P.sea0);
  b.e(28, fy + 4, 7, 2.6, P.soil0); b.e(27, fy + 3, 5, 1.6, P.soil1);
  b.e(16, 88, 7, 4.2, P.plum3); b.e(15, 87, 5, 2.6, P.mist); b.r(9, 90, 14, 1, P.plum2);
  b.l(12, 86, 15, 88, P.ink); b.l(15, 88, 18, 86, P.ink); b.p(13, 89, P.ink); b.p(19, 88, P.ink);
  light(b, 6, 60, 9, 7, P.ember4, .5, 3); b.r(6, 58, 1, 2, P.butter);
  return plate(b, (g) => {
    F(g, 26, 92, CAST.night, { s: 1.6, hat: null, hair: P.ink, hairStyle: "short", pose: "kneel", front: [16.4, 86.4], back: [23, 84], emo: "open",
      hold: (q, x, y) => HD.stroke(q, (z) => { z.moveTo(x, y); z.lineTo(x - .5, y + 1); }, P.ink, .6) }); }); };

const EVART = {};
function evArt(id) { if (!EVSC[id]) return null; return EVART[id] || (EVART[id] = EVSC[id]()); }
/* ================= Event scenes, v2: Prado Aurora (rest of the deck) ================= */
// a poor street of the Barrio Apagado at night: plank houses, one lit street far off
function barrio(b, o = {}) {
  OL = mix(P.ink, P.plum1, .4);
  band(b, 0, 0, EW, 62, P.ink, P.sea0, 7, mix(P.plum1, P.plum2, .4));
  if (o.stars !== false) { const r = rng(o.seed || 3); for (let i = 0; i < 14; i++) b.p(Math.floor(r() * EW), Math.floor(r() * 26), i % 3 ? mix(P.fog, P.sea0, .5) : P.fog); }
  skyline(b, 54, mix(P.ink, P.plum1, .5), (o.seed || 3) + 5, mix(P.ember3, P.plum1, .5));
  haze(b, 42, 62, mix(P.plum1, P.sea0, .5), .4);
}
const poorH = (b, x, y, w, h, win, door) => house2(b, x, y, w, h, { night: true, wall: mix(P.soil0, P.plum1, .35), tile: [P.plum1, P.ink, P.plum2], timber: false, win, door });
function plankWall(b, x, y, w, h, col) { b.r(x, y, w, h, col); for (let i = x + 2; i < x + w; i += 4) b.r(i, y, 1, h, mix(col, P.ink, .35)); b.r(x, y, w, 1, mix(col, P.mist, .2)); }
function dirt(b, y0, col = P.plum1) { band(b, 0, y0, EW, EH - y0, mix(col, P.soil0, .3), col, 4); const r = rng(77); for (let i = 0; i < 40; i++) b.r(Math.floor(r() * EW), y0 + 2 + Math.floor(r() * (EH - y0 - 2)), 2, 1, mix(col, P.plum3, .25)); }

/* 4 · La multa */
EVNOTE.multa = { scene: "Una calle del Barrio Apagado. Un guarda del Farol clava un aviso de multa en una puerta mientras su Mecha le alumbra el martillo. En el umbral, una vecina con su hijo.",
  hidden: "En el tejado de la izquierda, agachada junto a la chimenea, Tila lo está viendo todo con una aceitera bajo el brazo." };
EVSC.multa = () => { const b = new Pic(EW, EH); barrio(b, { seed: 11 });
  poorH(b, -4, 34, 42, 34, [[10, 8, 0], [26, 8, 0]], 16);
  b.r(28, 14, 4, 8, mix(P.plum1, P.ink, .3)); 
  poorH(b, 70, 30, 60, 38, [[8, 8, 1], [44, 8, 0]], 24);
  b.r(94, 55, 7, 13, P.ember3); b.r(95, 56, 5, 12, P.ember4); light(b, 97, 60, 18, 14, P.ember3, .35, 4);
  dirt(b, 68);
  light(b, 70, 74, 26, 14, P.ember3, .3, 4);
  return plate(b, (g) => {
    F(g, 26, 22.6, CAST.tila, { s: .9, pose: "kneel", front: [30, 16.4], emo: "open", hold: (q, x, y) => HD.shape(q, (z) => z.roundRect(x - .4, y - .2, 2.2, 2.6, .3), { fill: P.mist, lw: .3 }) });
    F(g, 100, 70, CAST.poor, { s: 1.6, dir: -1, hairStyle: "bun", hair: P.soil0, emo: "sad" }); F(g, 106, 70.5, kid(CAST.poor), { s: 1.2, dir: -1, hair: P.ink });
    F(g, 78, 91, CAST.albor, { s: 1.8, front: [93.4, 62.4], back: [91.6, 66], hold: (q, x, y) => { HD.stroke(q, (z) => { z.moveTo(x, y); z.lineTo(x + .8, y - 1.6); }, P.soil1, .6); HD.shape(q, (z) => z.rect(x + .2, y - 2.6, 1.8, 1), { fill: P.mist, lw: .3 }); } });
    HD.shape(g, (q) => q.rect(92.4, 63, 4, 5), { fill: P.cream, shade: P.fog, sx: 0, sy: .6, lw: .3 }); HD.dot(g, 94.4, 64.2, .6, P.ember1);
    HD.creature(g, "mecha", 62, 92, { s: 1.6, emo: "o" }); }); };

/* 5 · Penumbra */
EVNOTE.penumbra = { scene: "Un escalón del Barrio Apagado bajo la única calle encendida. Una mujer de la Sombra remienda una chaqueta pequeña.",
  hidden: "Tiene polvo dorado bajo las uñas, el mismo de los faroles, y en la pared de atrás hay un mapa de la verja dibujado con carbón." };
EVSC.penumbra = () => { const b = new Pic(EW, EH); barrio(b, { seed: 23 });
  plankWall(b, 0, 26, 92, 42, mix(P.soil0, P.plum1, .3));
  b.r(40, 34, 30, 18, mix(P.soil0, P.plum1, .15));
  const ch = mix(P.plum3, P.fog, .3);
  b.r(44, 40, 22, 1, ch); for (let x = 45; x < 66; x += 3) b.r(x, 38, 1, 3, ch); b.e(55, 46, 3, 1.6, ch); b.l(55, 46, 52, 43, ch); b.l(66, 41, 70, 46, ch); b.p(59, 37, P.cream);
  b.r(10, 40, 12, 22, P.ink); b.r(11, 41, 10, 21, P.soil0);
  b.r(0, 68, 92, 6, P.plum2); b.r(0, 68, 92, 1, P.plum3); b.r(0, 74, 96, 22, P.plum1);
  lamp2(b, 108, 74, 40, { r: 30, k: .5 });
  dirt(b, 76);
  light(b, 100, 60, 70, 40, P.ember3, .22, 4);
  return plate(b, (g) => {
    F(g, 40, 70, CAST.nightBare, { s: 1.7, pose: "sit", hairStyle: "bun", hair: P.ink, front: [52, 60.4], back: [49, 62], emo: "open" });
    HD.shape(g, (q) => HD.blob(q, [[48.6, 59.6], [56, 59], [57, 64], [52, 65.6], [48, 64]]), { fill: P.sea1, shade: P.sea0, lw: .35 });
    HD.stroke(g, (q) => { q.moveTo(52, 60.4); q.quadraticCurveTo(54.4, 56.6, 56.4, 60.6); }, P.cream, .3);
    [[51.4, 60], [52.6, 61], [48.6, 62.2]].forEach(([x, y]) => HD.dot(g, x, y, .35, P.butter)); }); };

/* 6 · El Brotín enredado */
EVNOTE.enredado = { scene: "Un camino del Prado al atardecer. Un Brotín está atado a la base de un farol torcido por tallos negros de savia y enseña los dientes.",
  hidden: "El farol no está clavado: está hundido en la tierra como una raíz, y de la misma grieta salen los tallos negros." };
EVSC.enredado = () => { const b = new Pic(EW, EH); OL = P.soil0;
  band(b, 0, 0, EW, 60, mix(P.sea0, P.rose0, .5), P.ember2, 8, P.butter);
  b.e(98, 54, 7, 7, P.cream); light(b, 98, 54, 30, 22, P.butter, .5, 5);
  b.poly([[0, 60], [0, 52], [22, 49], [50, 53], [80, 50], [128, 54], [128, 60]], mix(P.moss1, P.rose0, .45));
  haze(b, 44, 62, P.ember3, .35);
  band(b, 0, 58, EW, 38, mix(P.moss2, P.ember3, .25), P.moss1, 5);
  b.poly([[40, 96], [56, 58], [70, 58], [104, 96]], mix(P.soil2, P.ember3, .2)); b.poly([[46, 96], [58, 58], [68, 58], [96, 96]], mix(P.soil3, P.ember4, .25));
  whiteFlowers(b, 0, 40, 64, 95, 8); whiteFlowers(b, 100, 128, 64, 95, 9);
  // the leaning lamp sunk into a crack
  b.layer((t) => { for (let i = 0; i < 40; i++) { const x = 30 + Math.round(i * .22); t.r(x, 86 - i, 2, 1, P.plum1); }
    t.r(36, 40, 9, 1, P.mist); t.r(37, 41, 7, 8, P.butter); t.r(38, 42, 5, 4, P.cream); t.r(36, 49, 9, 1, P.mist); t.poly([[36, 40], [40.5, 36], [45, 40]], P.plum2); }, P.ink);
  light(b, 40.5, 45, 22, 18, P.ember4, .4, 4);
  b.p(39, 50, SAP.s2); b.p(40, 50, SAP.sheen);
  b.e(31, 88, 8, 2.6, P.ink); b.l(25, 89, 21, 92, P.ink); b.l(37, 89, 42, 93, P.ink);
  [[46, 66], [52, 58], [44, 52]].forEach(([x, y]) => dropUp(b, x, y));
  return plate(b, (g) => {
    HD.creature(g, "brotin", 34, 88, { s: 1.9, emo: "o" });
    for (let k = 0; k < 4; k++) HD.stroke(g, (q) => { q.moveTo(28 + k * 2, 88.4); q.bezierCurveTo(24, 80 - k, 44, 78 + k * 2, 36 + k, 66 - k * 2); }, SAP.s1, 1);
    for (let k = 0; k < 4; k++) HD.stroke(g, (q) => { q.moveTo(28 + k * 2, 88.4); q.bezierCurveTo(24, 80 - k, 44, 78 + k * 2, 36 + k, 66 - k * 2); }, SAP.s2, .45); }); };

/* 7 · La Primera Farolera */
EVNOTE.farolera = { scene: "Amanecer en la plaza vieja del Prado. Sobre su pedestal, la estatua de la Primera Farolera levanta un farol de piedra. Tila, subida en el pedestal, frota el cristal con un trapo.",
  hidden: "En el pedestal hay siete nombres de Casas grabados; el séptimo, Candil, está raspado a cincel." };
EVSC.farolera = () => { const b = new Pic(EW, EH); OL = mix(P.plum2, P.soil0, .5);
  band(b, 0, 0, EW, 62, mix(P.glim0, P.sea0, .4), P.rose1, 8, P.butter);
  light(b, 64, 64, 70, 30, P.butter, .4, 5);
  skyline(b, 58, mix(P.rose0, P.plum2, .4), 13, P.butter);
  haze(b, 44, 64, mix(P.rose2, P.butter, .4), .45);
  house2(b, -8, 30, 34, 34, { win: [[8, 8, 0, 1]], door: 18 }); house2(b, 104, 32, 32, 32, { win: [[6, 8, 0, 1]], door: 18 });
  tint(b, 0, 20, EW, 46, P.rose2, .15);
  cobbles2(b, 64, { base: mix(P.soil1, P.plum2, .4), stone: mix(P.soil2, P.plum3, .4), hi: P.soil3, hi2: P.butter, seed: 61 });
  // the pedestal, seven names
  const st = mix(P.mist, P.fog, .4), st2 = P.mist, st3 = P.plum3;
  b.layer((t) => { t.r(46, 66, 36, 6, st2); t.r(50, 44, 28, 22, st); t.r(48, 42, 32, 3, st2); t.r(50, 44, 2, 22, P.fog); t.r(76, 44, 2, 22, st3); }, OL);
  for (let i = 0; i < 7; i++) { const y = 47 + i * 2.6; b.r(55, Math.round(y), i === 6 ? 6 : 12 + (i % 3) * 2, 1, st3); }
  b.r(55, 63, 9, 1, mix(st3, P.fog, .5)); b.p(57, 62, st3); b.p(60, 64, st3);
  // bucket
  b.layer((t) => { t.r(88, 64, 7, 6, P.plum3); t.r(88, 64, 7, 1, P.fog); t.r(89, 63, 5, 1, P.sea3); }, OL);
  return plate(b, (g) => {
    const STONE = { skin: [P.fog, P.mist], cloth: [P.fog, P.mist, P.cream], robe: true, hairStyle: "bun", hair: P.mist };
    F(g, 62, 42, STONE, { s: 1.7, front: [70, 14], emo: "closed", hold: (q, x, y) => { HD.shape(q, (z) => z.rect(x - 1.2, y - 4.4, 2.6, 3.4), { fill: P.fog, shade: P.mist, lw: .35 }); HD.shape(q, (z) => HD.poly(z, [[x - 1.6, y - 4.4], [x + .1, y - 6], [x + 1.8, y - 4.4]]), { fill: P.mist, lw: .3 }); } });
    F(g, 74, 42, CAST.tila, { s: 1.45, dir: -1, front: [69.6, 10.6], back: [76, 32], emo: "open", hold: (q, x, y) => HD.shape(q, (z) => HD.E(z, x, y, 1, .7), { fill: P.cream, lw: .3 }) }); }); };

/* 8 · Luz prestada / 9 · La luz devuelta: the same alley, night and dawn */
function alley(b, dawn) {
  OL = mix(P.ink, P.plum1, .4);
  if (dawn) band(b, 0, 0, EW, 70, mix(P.sea0, P.glim0, .5), P.rose1, 7, P.ember4); else band(b, 0, 0, EW, 70, P.ink, P.sea0, 6, P.plum1);
  b.poly([[56, 70], [60, 30], [68, 30], [72, 70]], dawn ? mix(P.rose1, P.plum2, .5) : mix(P.plum1, P.sea0, .5));
  plankWall(b, 0, 0, 52, 80, mix(P.soil0, P.plum1, .4)); plankWall(b, 76, 0, 52, 80, mix(P.soil0, P.plum1, .25));
  b.poly([[52, 0], [60, 30], [60, 80], [52, 80]], mix(P.soil0, P.ink, .4)); b.poly([[76, 0], [68, 30], [68, 80], [76, 80]], mix(P.soil0, P.ink, .2));
  b.layer((t) => { t.r(12, 22, 12, 12, P.ink); t.r(13, 23, 10, 10, dawn ? mix(P.sea1, P.rose1, .4) : P.plum1); t.r(18, 23, 1, 10, P.soil0); }, OL);
  b.layer((t) => { t.r(98, 30, 14, 2, P.soil1); t.r(100, 26, 3, 4, P.moss1); t.r(106, 25, 3, 5, P.moss1); }, OL);
  b.r(96, 10, 22, 1, P.plum2); [[99, 11], [104, 11], [110, 11]].forEach(([x, y]) => b.r(x, y, 3, 4, [P.sea2, P.rose1, P.fog][(x / 5) % 3 | 0]));
  dirt(b, 80, dawn ? mix(P.plum2, P.soil1, .4) : P.plum1);
  if (dawn) { light(b, 64, 40, 40, 50, P.ember4, .25, 4); tint(b, 0, 0, EW, EH, P.rose2, .08); }
}
EVNOTE.prestamo = { scene: "Un callejón del Barrio Apagado, de noche. Una niña intenta leer un papel pegándoselo a la nariz. Lumo se le acerca, curioso, y su luz le cae sobre las manos.",
  hidden: "El papel lleva el sello de la Casa Albor: es un aviso de desalojo." };
EVSC.prestamo = () => { const b = new Pic(EW, EH); alley(b, false); light(b, 52, 74, 30, 22, P.ember4, .45, 5);
  return plate(b, (g) => {
    F(g, 46, 92, kid(CAST.poor), { s: 2, pose: "kneel", hair: P.soil0, hairStyle: "bun", front: [55, 76], back: [50, 78], emo: "open" });
    HD.shape(g, (q) => q.rect(51.6, 74, 5.4, 4.2), { fill: P.cream, shade: P.fog, sx: 0, sy: .6, lw: .35 }); HD.dot(g, 54.2, 75.4, .7, P.ember1);
    HD.creature(g, "lumo", 66, 90, { s: 1.5, emo: "happy" }); }); };
EVNOTE.devuelta = { scene: "El mismo callejón al amanecer. Brizna espera sentada en un cubo boca abajo; Lumo salta de su regazo para volver contigo.",
  hidden: "En el muro de la derecha, la ropa tendida es la de una familia entera: alguien ya está recogiendo para la mudanza de primavera." };
EVSC.devuelta = () => { const b = new Pic(EW, EH); alley(b, true);
  b.layer((t) => { t.r(40, 80, 9, 9, P.plum3); t.r(40, 80, 9, 1, P.fog); }, OL);
  return plate(b, (g) => {
    F(g, 44, 82, kid(CAST.poor), { s: 2, pose: "sit", hair: P.soil0, hairStyle: "bun", front: [56, 66], emo: "open", hold: (q, x, y) => HD.shape(q, (z) => z.rect(x - .4, y - 1.2, 3.4, 2.6), { fill: P.cream, shade: P.fog, lw: .3 }) });
    HD.creature(g, "lumo", 70, 84, { s: 1.5, emo: "happy" }); }); };

/* 10 · El jardinero de la Torre */
EVNOTE.jardinero = { scene: "Medianoche al pie de la Torre del Alba. Romero, el jardinero, arranca flores grises de un parterre y planta flores blancas que trae en una carretilla.",
  hidden: "La tierra que saca la pala es negra y está húmeda, y en lo alto de la Torre hay una ventana encendida mirando el jardín." };
EVSC.jardinero = () => { const b = new Pic(EW, EH); OL = mix(P.ink, P.plum1, .4);
  band(b, 0, 0, EW, 64, P.ink, P.plum1, 7, mix(P.plum2, P.rose0, .3));
  towerAlba(b, 88, 6, 26, 66, { wall: mix(P.plum2, P.plum3, .4), dark: P.plum2, trim: P.plum3, lit: false });
  b.r(100, 20, 3, 4, P.ember4); light(b, 101.5, 22, 10, 8, P.ember4, .4, 3);
  b.layer((t) => { for (let x = 0; x < 84; x += 6) t.r(x, 44, 5, 24, P.moss0); t.e(10, 44, 10, 6, P.moss0); t.e(36, 42, 12, 7, P.moss0); t.e(64, 44, 10, 6, P.moss0); }, mix(P.ink, P.moss0, .4));
  haze(b, 50, 68, mix(P.plum2, P.sea0, .4), .35);
  band(b, 0, 66, EW, 30, P.moss0, mix(P.moss1, P.moss0, .4), 4);
  // the bed: left half grey, right half white
  b.layer((t) => { t.r(8, 74, 80, 14, P.soil0); t.r(8, 74, 80, 1, P.soil1); t.r(6, 73, 84, 1, P.mist); t.r(6, 88, 84, 1, P.mist); }, OL);
  const r = rng(91); for (let i = 0; i < 70; i++) { const x = 10 + Math.floor(r() * 76), y = 76 + Math.floor(r() * 10), grey = x < 44;
    b.p(x, y + 1, grey ? P.plum2 : P.moss1); b.p(x, y, grey ? P.plum3 : P.cream); if (!grey && i % 3 === 0) b.p(x + 1, y, P.butter); }
  b.r(40, 76, 10, 8, P.ink); b.r(41, 77, 8, 6, mix(P.ink, SAP.s1, .5));
  // wheelbarrow with white flowers
  b.layer((t) => { t.poly([[94, 74], [118, 74], [114, 84], [98, 84]], P.soil1); t.r(94, 74, 24, 1, P.soil2); t.e(104, 88, 3.4, 3.4, P.soil0); t.r(116, 78, 8, 1, P.soil1); }, OL);
  const r2 = rng(92); for (let i = 0; i < 26; i++) b.p(96 + Math.floor(r2() * 20), 70 + Math.floor(r2() * 4), i % 4 ? P.cream : P.butter);
  lamp2(b, 4, 74, 28, { r: 20, k: .4 });
  return plate(b, (g) => {
    F(g, 54, 90, CAST.forest, { s: 1.7, pose: "kneel", hat: { k: "wide", c: [P.soil2, P.soil1] }, beard: P.mist, front: [44, 80], back: [58, 82],
      hold: (q, x, y) => { HD.stroke(q, (z) => { z.moveTo(x + 2, y - 5); z.lineTo(x, y + 1); }, P.soil1, .6); HD.shape(q, (z) => HD.E(z, x, y + 1.2, .9, .6), { fill: P.mist, lw: .3 }); } }); }); };

/* 11 · El carro de aceite */
EVNOTE.carro = { scene: "El camino del Prado al anochecer. Un carro de la Casa Albor cargado de barriles está atascado en el barro; el carretero empuja la rueda y su Lumo le alumbra los pies.",
  hidden: "Entre los arbustos de la derecha brillan dos pares de ojos, y uno de los barriles tiene la tapa suelta: dentro solo hay polvo dorado." };
EVSC.carro = () => { const b = new Pic(EW, EH); OL = P.soil0;
  band(b, 0, 0, EW, 58, mix(P.sea0, P.plum1, .4), mix(P.rose0, P.ember1, .5), 7, P.ember2);
  b.poly([[0, 58], [0, 50], [26, 48], [56, 52], [90, 47], [128, 51], [128, 58]], mix(P.plum1, P.rose0, .4));
  towerAlba(b, 16, 30, 6, 52, { wall: mix(P.plum2, P.rose0, .4), dark: mix(P.plum1, P.rose0, .3), trim: mix(P.plum2, P.rose0, .4), lit: false });
  haze(b, 40, 60, mix(P.rose0, P.ember1, .4), .4);
  band(b, 0, 56, EW, 40, mix(P.moss1, P.rose0, .3), P.moss0, 5);
  b.poly([[0, 96], [0, 80], [40, 64], [80, 62], [128, 70], [128, 96]], mix(P.soil1, P.rose0, .2)); b.e(56, 82, 22, 5, mix(P.soil0, P.plum1, .4)); b.e(56, 81, 18, 3, mix(P.soil0, P.sea0, .3));
  // bushes with eyes
  b.layer((t) => { t.e(112, 66, 14, 8, P.moss0); t.e(100, 70, 10, 6, P.moss0); }, mix(P.ink, P.moss0, .5));
  [[106, 66], [111, 67], [117, 64], [121, 65]].forEach(([x, y]) => b.p(x, y, P.ember4));
  // the cart
  b.layer((t) => { t.r(30, 58, 44, 14, P.soil1); for (let x = 32; x < 74; x += 4) t.r(x, 58, 1, 14, P.soil0); t.r(30, 58, 44, 1, P.soil2); t.r(72, 62, 14, 2, P.soil1);
    [[36, 50], [48, 49], [60, 50]].forEach(([x, y], i) => { t.r(x, y, 10, 9, P.soil2); t.r(x, y, 10, 1, P.soil3); t.r(x, y + 3, 10, 1, P.plum2); t.r(x, y + 7, 10, 1, P.plum2); t.r(x + 1, y + 1, 1, 7, P.soil3); if (i === 2) { t.r(x - 1, y - 2, 6, 2, P.soil3); t.r(x + 2, y, 6, 1, P.ember4); } });
    t.e(40, 76, 7, 7, P.soil0); t.e(40, 76, 5.4, 5.4, P.soil1); t.e(40, 76, 1.4, 1.4, P.plum2); }, OL);
  for (let a = 0; a < 6; a++) b.l(40, 76, 40 + Math.cos(a) * 5, 76 + Math.sin(a) * 5, P.soil0);
  b.r(46, 52, 4, 1, P.ember1); b.r(58, 51, 1, 1, P.ember1);
  return plate(b, (g) => {
    F(g, 30, 86, CAST.albor, { s: 1.7, pose: "walk", front: [36, 72], back: [35, 74] });
    HD.creature(g, "lumo", 18, 90, { s: 1.4, emo: "o" }); }); };

/* 12 · La nana del Prado */
EVNOTE.nana = { scene: "Noche en una plaza del Prado. Bajo un farol, tres niños cantan en corro y una anciana teje en un banco.",
  hidden: "Al fondo, en la boca de una calle oscura del Barrio, dos niños de la Sombra escuchan con la misma música en los labios." };
EVSC.nana = () => { const b = new Pic(EW, EH); OL = mix(P.ink, P.plum1, .4);
  band(b, 0, 0, EW, 62, P.ink, P.plum1, 7, mix(P.plum2, P.rose0, .3));
  skyline(b, 50, mix(P.plum1, P.plum2, .5), 33, mix(P.ember3, P.plum2, .4)); haze(b, 38, 62, mix(P.plum2, P.rose0, .3), .4);
  house2(b, -6, 26, 40, 40, { night: true, win: [[10, 8, 1, 1], [26, 8, 0, 1]], door: 18 });
  b.r(100, 30, 30, 36, mix(P.ink, P.plum1, .3)); b.r(108, 46, 10, 20, P.ink);
  cobbles2(b, 66, { base: P.plum1, stone: mix(P.plum1, P.plum2, .6), hi: P.plum2, hi2: mix(P.plum2, P.plum3, .5), seed: 71 });
  b.layer((t) => { t.r(80, 76, 22, 2, P.soil1); t.r(80, 72, 22, 1, P.soil1); t.r(82, 78, 1, 6, P.soil0); t.r(99, 78, 1, 6, P.soil0); }, OL);
  lamp2(b, 58, 84, 46, { r: 36, k: .5 });
  return plate(b, (g) => {
    F(g, 110, 66, kid(CAST.nightBare), { s: 1.1, dir: -1, emo: "open" }); F(g, 114, 66.4, kid(CAST.nightBare), { s: 1, dir: -1, hairStyle: "bun", hair: P.ink, emo: "closed" });
    F(g, 44, 92, kid(CAST.albor), { s: 1.7, hat: null, hair: P.soil1, front: [50, 76], back: [38, 78], emo: "closed" });
    F(g, 72, 92, kid(CAST.poor), { s: 1.7, dir: -1, hair: P.butter, hairStyle: "long", front: [66, 76], back: [78, 78], emo: "closed" });
    F(g, 58, 86, kid(CAST.albor), { s: 1.5, hat: null, hair: P.ink, cloth: [P.rose1, P.rose0, P.rose2], front: [52, 72], back: [64, 72], emo: "closed" });
    F(g, 90, 84, CAST.poor, { s: 1.6, pose: "sit", dir: -1, hairStyle: "bun", hair: P.fog, front: [84, 74], emo: "closed", hold: (q, x, y) => HD.shape(q, (z) => HD.E(z, x, y, 1.2, .9), { fill: P.rose1, lw: .3 }) }); }); };
/* ================= Event scenes: Cráter Tibio ================= */
// the crater rim against a warm sky, smoke from the forges
function craterBack(b, o = {}) {
  OL = P.soil0;
  if (o.night) band(b, 0, 0, EW, 60, P.ink, mix(P.ember0, P.plum1, .5), 7, P.ember1);
  else band(b, 0, 0, EW, 60, mix(P.rose0, P.sea0, .4), P.ember2, 8, P.ember4);
  b.poly([[0, 62], [0, 30], [18, 22], [44, 26], [64, 20], [90, 24], [110, 18], [128, 24], [128, 62]], o.night ? mix(P.ember0, P.ink, .4) : mix(P.ember0, P.rose0, .4));
  b.poly([[0, 62], [0, 40], [30, 36], [58, 40], [88, 34], [128, 38], [128, 62]], o.night ? P.ember0 : mix(P.ember0, P.ember1, .4));
  [[30, 22], [70, 18], [104, 16]].forEach(([x, y], i) => { for (let k = 0; k < 6; k++) b.e(x + Math.sin(k + i) * 2 + k, y - k * 3, 3 + k * .6, 1.8, mix(o.night ? P.plum1 : P.rose1, P.mist, .2 + k * .06)); });
  haze(b, 30, 60, o.night ? P.ember1 : P.ember3, .3);
}
const stoneH = (b, x, y, w, h, win, door, o = {}) => house2(b, x, y, w, h, Object.assign({ wall: mix(P.soil2, P.soil1, .3), tile: [P.ember1, P.ember0, P.ember2], timber: false, win, door, chimney: true }, o));
function warmGround(b, y0) { band(b, 0, y0, EW, EH - y0, mix(P.soil1, P.ember0, .2), P.soil0, 4); const r = rng(5); for (let i = 0; i < 30; i++) { const x = Math.floor(r() * EW), y = y0 + 2 + Math.floor(r() * (EH - y0 - 3)); b.r(x, y, 3, 1, mix(P.soil1, P.ember1, .4)); } }
function forgeIn(b, fx) { // inside a forge: brick wall, hood, the fire
  OL = P.soil0;
  b.r(0, 0, EW, 72, mix(P.soil0, P.ember0, .3));
  for (let y = 2; y < 72; y += 5) { b.r(0, y, EW, 1, mix(P.soil0, P.ink, .4)); for (let x = (y / 5) % 2 ? 0 : 5; x < EW; x += 10) b.r(x, y, 1, 5, mix(P.soil0, P.ink, .4)); }
  b.layer((t) => { t.poly([[fx - 22, 0], [fx + 22, 0], [fx + 15, 20], [fx - 15, 20]], P.plum1); t.r(fx - 16, 20, 32, 2, P.plum2);
    t.r(fx - 16, 24, 32, 30, P.plum2); t.r(fx - 16, 24, 32, 1, P.mist); t.e(fx, 40, 10, 10, P.ink); t.r(fx - 10, 40, 20, 12, P.ink);
    t.e(fx, 41, 8.4, 8.4, P.ember2); t.r(fx - 8, 41, 16, 10, P.ember2); t.e(fx, 44, 5, 5, P.ember4); t.e(fx, 46, 3, 3, P.butter); }, OL);
  b.r(0, 72, EW, 24, P.plum1); for (let x = 0; x < EW; x += 12) b.r(x, 72, 1, 24, P.ink); b.r(0, 72, EW, 1, P.ink);
  light(b, fx, 44, 60, 46, P.ember3, .5, 5);
}
function anvil(b, x, y) { b.layer((t) => { t.r(x - 8, y - 9, 16, 3, P.plum3); t.r(x - 10, y - 8, 3, 2, P.plum3); t.r(x - 4, y - 6, 8, 4, P.plum2); t.r(x - 7, y - 2, 14, 2, P.plum2); t.r(x - 8, y - 9, 16, 1, P.fog); }, P.ink); }

EVNOTE.fogarin = { scene: "Dentro de una forja del Cráter, Fogarín tira solo de las cuerdas de un fuelle enorme mientras el fuego ruge en el horno.", hidden: "Junto al yunque hay dos delantales colgados: uno grande y uno pequeño, azul, de alguien del Agua." };
EVSC.fogarin = () => { const b = new Pic(EW, EH); forgeIn(b, 82);
  b.layer((t) => { t.poly([[30, 58], [60, 52], [60, 66]], P.soil1); t.r(60, 50, 4, 18, P.soil2); t.r(30, 58, 2, 1, P.soil2); }, OL);
  b.l(44, 50, 40, 6, P.soil2); b.l(48, 52, 52, 6, P.soil2);
  anvil(b, 110, 86);
  b.layer((t) => { t.r(8, 30, 6, 14, P.soil2); t.r(16, 30, 5, 11, P.sea2); t.r(6, 29, 18, 1, P.soil1); }, OL);
  return plate(b, (g) => { F(g, 40, 94, CAST.tizon, { s: 1.9, beard: null, hairStyle: "short", hair: P.soil0, front: [44, 50], back: [48, 52], emo: "closed" });
    HD.creature(g, "fuellito", 64, 92, { s: 1.4, emo: "happy" }); }); };

EVNOTE.termas = { scene: "Las termas secas del Cráter: piletas de piedra vacías bajo un cielo de humo. Una anciana tiene los pies metidos en el único charco templado.", hidden: "Arriba del todo, en el borde del cráter, se ve el muro gris de la presa." };
EVSC.termas = () => { const b = new Pic(EW, EH); craterBack(b);
  b.layer((t) => { t.r(80, 12, 30, 10, P.plum3); t.r(80, 12, 30, 1, P.fog); for (let x = 82; x < 110; x += 6) t.r(x, 13, 1, 9, P.plum2); }, OL);
  warmGround(b, 60);
  const pool = (x, y, w, h, water) => { b.layer((t) => { t.e(x, y, w, h, P.mist); t.e(x, y + .4, w - 2, h - 1.4, water ? P.sea2 : mix(P.soil1, P.plum2, .4)); if (water) t.e(x - w * .3, y, w * .3, 1, P.sea4); }, OL); };
  pool(30, 72, 22, 6); pool(96, 70, 20, 5); pool(64, 86, 24, 7, true);
  [[56, 82], [70, 80], [64, 79]].forEach(([x, y]) => b.e(x, y, 2, 1, mix(P.fog, P.sea3, .5)));
  return plate(b, (g) => { F(g, 74, 88, CAST.poor, { s: 1.5, pose: "sit", dir: -1, hairStyle: "bun", hair: P.fog, emo: "closed", cloth: [P.ember1, P.ember0, P.ember2] });
    HD.creature(g, "fuellito", 48, 88, { s: 1.2, emo: "happy" }); }); };

EVNOTE.compuerta = { scene: "En lo alto de la presa, Junco, una enfriadora del Agua, gira la rueda de una compuerta. A un lado, el lago nuevo y gris; al otro, el cauce seco que baja hacia el Vado.", hidden: "Muy lejos, en el cauce, se ven barcas volcadas como peces muertos." };
EVSC.compuerta = () => { const b = new Pic(EW, EH); OL = P.plum1;
  band(b, 0, 0, EW, 50, mix(P.sea0, P.rose0, .3), P.ember3, 7, P.butter);
  b.poly([[0, 50], [0, 40], [40, 36], [80, 40], [128, 34], [128, 50]], mix(P.plum2, P.rose0, .4)); haze(b, 30, 52, P.ember3, .35);
  band(b, 0, 46, 64, 26, mix(P.plum3, P.soil1, .3), mix(P.plum2, P.soil0, .3), 4);
  for (let y = 48; y < 70; y += 4) b.r(4 + (y % 8), y, 18, 1, P.mist);
  band(b, 64, 46, 64, 26, mix(P.soil2, P.ember3, .2), P.soil1, 4);
  b.poly([[64, 72], [80, 50], [92, 46], [128, 44], [128, 50], [96, 52], [84, 60], [76, 72]], mix(P.soil3, P.plum3, .4));
  [[106, 47], [118, 46]].forEach(([x, y]) => b.layer((t) => { t.e(x, y, 4, 1.4, P.soil1); }, OL));
  b.layer((t) => { t.r(0, 70, EW, 26, P.plum2); for (let y = 72; y < EH; y += 5) { t.r(0, y, EW, 1, P.plum1); for (let x = (y / 5) % 2 ? 0 : 6; x < EW; x += 12) t.r(x, y, 1, 5, P.plum1); } t.r(0, 70, EW, 2, P.plum3); }, OL);
  b.layer((t) => { t.e(52, 66, 9, 9, P.plum1); t.e(52, 66, 7, 7, P.mist); t.e(52, 66, 2, 2, P.plum1); for (let a = 0; a < 6; a++) t.l(52, 66, 52 + Math.cos(a) * 7, 66 + Math.sin(a) * 7, P.plum1); t.r(51, 66, 2, 6, P.plum1); }, OL);
  return plate(b, (g) => { F(g, 40, 92, CAST.water, { s: 1.8, hairStyle: "bun", hair: P.sea0, front: [48, 60], back: [46, 64], emo: "open" }); }); };

EVNOTE.carbon = { scene: "La puerta de una forja del Cráter. Un minero de Hondura con un saco de carbón a la espalda discute con Maese Fragua, que le cierra el paso.", hidden: "Sobre el dintel está grabada la regla del Gremio: «Ningún fuego es de nadie». Alguien le ha clavado encima un cartel de Albor." };
EVSC.carbon = () => { const b = new Pic(EW, EH); craterBack(b, { night: true });
  stoneH(b, 50, 22, 80, 46, [[60, 10, 1]], null, { roofH: 16 });
  b.layer((t) => { t.r(64, 40, 26, 28, P.ink); t.r(66, 42, 22, 26, P.ember1); t.r(66, 50, 22, 18, P.ember2); }, OL); light(b, 77, 56, 34, 26, P.ember3, .45, 5);
  b.r(62, 34, 30, 3, P.soil3); for (let x = 64; x < 90; x += 3) b.p(x, 35, P.soil1);
  b.layer((t) => { t.r(70, 32, 14, 6, P.butter); t.e(77, 35, 2, 2, P.ember3); }, OL);
  warmGround(b, 68);
  return plate(b, (g) => {
    F(g, 30, 92, CAST.miner, { s: 1.75, front: [40, 74], back: [26, 68], emo: "open", hold: (q, x, y) => {} });
    HD.shape(g, (q) => HD.blob(q, [[16, 62], [24, 60], [28, 70], [22, 74], [14, 70]]), { fill: P.soil2, shade: P.soil1, lw: .35 });
    F(g, 78, 92, CAST.tizon, { s: 1.8, dir: -1, beard: P.soil1, hairStyle: "short", hair: P.ink, front: [72, 74], back: [84, 74], emo: "open" }); }); };

EVNOTE.pan = { scene: "Una calle del Cráter con el suelo tan tibio que Miga hornea pan sobre las losas, bajo campanas de barro.", hidden: "El saco de harina apoyado en la pared lleva impreso el farol de la Casa Albor." };
EVSC.pan = () => { const b = new Pic(EW, EH); craterBack(b);
  stoneH(b, -4, 26, 50, 42, [[10, 10, 1, 1], [32, 10, 0]], 22); stoneH(b, 86, 30, 46, 38, [[12, 8, 1]], 26);
  warmGround(b, 68);
  for (let x = 30; x < 110; x += 8) b.r(x, 70 + ((x / 8) % 2) * 6, 7, 1, mix(P.soil1, P.ember2, .5));
  [[48, 80], [60, 84], [72, 80], [84, 86]].forEach(([x, y]) => b.layer((t) => { t.e(x, y, 5, 4, P.soil2); t.e(x, y - 1, 4, 2.6, P.soil3); t.r(x - 1, y - 5, 2, 1, P.soil1); }, OL));
  b.layer((t) => { t.e(98, 74, 5, 6, P.cream); t.r(95, 70, 6, 2, P.fog); }, OL); b.r(96, 73, 4, 3, P.ember4); b.p(98, 74, P.ember1);
  light(b, 64, 84, 50, 14, P.ember3, .3, 4);
  return plate(b, (g) => { F(g, 30, 92, CAST.poor, { s: 1.7, pose: "kneel", hairStyle: "bun", hair: P.ember0, cloth: [P.cream, P.fog, P.cream], apron: P.soil3, front: [44, 82], emo: "open",
    hold: (q, x, y) => HD.shape(q, (z) => HD.E(z, x + .6, y, 2.2, 1.4), { fill: P.soil3, shade: P.soil2, lw: .35 }) });
    HD.creature(g, "fuellito", 112, 92, { s: 1.3, dir: -1, emo: "happy" }); }); };

EVNOTE.almacen = { scene: "El almacén de los mil faroles: estanterías hasta el techo con cientos de faroles nuevos, todos apagados. Remache, el escribano, los cuenta en su libro.", hidden: "Los faroles no tienen depósito para el aceite: su base es un tubo hueco, como si fueran a clavarse en algo." };
EVSC.almacen = () => { const b = new Pic(EW, EH); OL = P.ink;
  band(b, 0, 0, EW, 78, P.ink, mix(P.soil0, P.plum1, .5), 5);
  for (let y = 8; y < 76; y += 17) { b.r(0, y + 14, EW, 2, P.soil1); b.r(0, y + 14, EW, 1, P.soil2);
    for (let x = 3; x < EW; x += 8) b.layer((t) => { t.r(x, y + 3, 5, 9, P.plum2); t.r(x + 1, y + 4, 3, 6, mix(P.plum3, P.sea1, .3)); t.r(x - 1, y + 2, 7, 1, P.plum3); t.poly([[x - 1, y + 2], [x + 2.5, y - 1], [x + 6, y + 2]], P.plum2); t.r(x + 2, y + 12, 1, 2, P.plum1); }, P.ink); }
  b.r(0, 78, EW, 18, P.plum1); b.r(0, 78, EW, 1, P.ink);
  for (let x = 0; x < 30; x++) for (let y = 0; y < EH; y++) { const c = b.g(x, y); if (c) b.p(x, y, mix(c, P.ink, .5 - x / 60)); }
  b.layer((t) => { t.r(70, 72, 30, 3, P.soil1); t.r(72, 75, 2, 12, P.soil0); t.r(96, 75, 2, 12, P.soil0); t.r(78, 69, 14, 3, P.cream); t.r(84, 69, 1, 3, P.fog); }, OL);
  b.layer((t) => { t.r(102, 64, 3, 8, P.cream); }, OL); light(b, 103.5, 63, 24, 22, P.ember4, .5, 5); b.r(103, 62, 1, 2, P.ember4);
  return plate(b, (g) => { F(g, 90, 92, CAST.albor, { s: 1.6, hat: null, hairStyle: "none", beard: null, cloth: [P.plum3, P.plum2, P.mist], front: [86, 70], back: [94, 72], emo: "open" }); }); };

EVNOTE.ladera = { scene: "La ladera sur del Cráter, con casas de piedra recién levantadas. Guijo, un niño de las Cuevas, golpea una roca con un martillo de juguete.", hidden: "En la puerta de una casa hay un dibujo de una montaña con muchas cuevas, y debajo, en tiza, la palabra «Hondura»." };
EVSC.ladera = () => { const b = new Pic(EW, EH); craterBack(b);
  b.poly([[0, 96], [0, 54], [40, 46], [90, 52], [128, 44], [128, 96]], mix(P.soil1, P.ember0, .2));
  stoneH(b, 4, 30, 34, 26, [[6, 6, 1]], 20, { wall: mix(P.plum3, P.soil2, .5), tile: [P.plum2, P.plum1, P.plum3] });
  stoneH(b, 52, 34, 30, 22, [[6, 6, 0]], 18, { wall: mix(P.plum3, P.soil2, .5), tile: [P.plum2, P.plum1, P.plum3] });
  stoneH(b, 96, 28, 32, 26, [[8, 6, 1]], 20, { wall: mix(P.plum3, P.soil2, .5), tile: [P.plum2, P.plum1, P.plum3] });
  b.l(72, 46, 75, 42, P.cream); b.l(75, 42, 78, 46, P.cream); b.p(75, 45, P.cream);
  band(b, 0, 64, EW, 32, mix(P.soil1, P.ember0, .2), P.soil0, 4);
  b.layer((t) => { t.e(70, 82, 12, 8, P.plum3); t.e(68, 80, 9, 5, P.mist); t.l(66, 78, 70, 84, P.plum2); }, OL);
  b.p(73, 81, P.ember3); b.p(74, 82, P.ember4); light(b, 73.5, 81.5, 6, 5, P.ember4, .5, 3);
  return plate(b, (g) => { F(g, 52, 92, kid(CAST.miner), { s: 1.9, pose: "kneel", front: [62, 78], back: [48, 80], emo: "open",
    hold: (q, x, y) => { HD.stroke(q, (z) => { z.moveTo(x - 1, y + 1); z.lineTo(x + 2, y - 1.6); }, P.soil1, .5); HD.shape(q, (z) => z.rect(x + 1.2, y - 2.6, 1.4, 2), { fill: P.plum3, lw: .3 }); } }); }); };

EVNOTE.escoria = { scene: "Detrás de las forjas, una montaña de escoria todavía caliente. Un nido de Fuellitos se revuelve dentro; sus llamas son verdes y oscuras.", hidden: "Entre la escoria brilla carbón con vetas negras: está empapado de savia." };
EVSC.escoria = () => { const b = new Pic(EW, EH); craterBack(b, { night: true });
  stoneH(b, -6, 30, 50, 36, [[10, 10, 1]], null); stoneH(b, 88, 34, 44, 32, [[10, 8, 1]], null);
  warmGround(b, 66);
  b.layer((t) => { t.poly([[24, 92], [44, 62], [60, 56], [78, 60], [102, 92]], P.plum1); }, OL);
  const r = rng(7); for (let i = 0; i < 60; i++) { const x = 30 + Math.floor(r() * 66), y = 62 + Math.floor(r() * 28); if (b.g(x, y) === P.plum1) b.r(x, y, 2, 1, [P.plum2, P.soil0, SAP.s1, P.ember1][i % 4]); }
  [[52, 70], [66, 66], [74, 76]].forEach(([x, y]) => { b.p(x, y, SAP.sheen); b.p(x + 1, y, SAP.s2); });
  light(b, 62, 70, 40, 24, mix(SAP.sheen, P.moss0, .6), .3, 4);
  return plate(b, (g) => { [[46, 72, 1.3, 1], [64, 64, 1.5, -1], [80, 76, 1.3, -1]].forEach(([x, y, s, d]) => HD.creature(g, "fuellito", x, y, { s, dir: d, emo: "o" })); }); };

EVNOTE.tizon = { scene: "Atardecer en la puerta de la Forja Madre. Maese Tizón sale secándose el sudor y abre los brazos para dar un abrazo de forja.", hidden: "En la pared, junto a la puerta, hay una placa con un nombre medio tapado por el hollín: la forja que perdió su padre." };
EVSC.tizon = () => { const b = new Pic(EW, EH); craterBack(b);
  stoneH(b, 30, 14, 98, 56, [[8, 12, 1], [80, 12, 1]], null, { roofH: 20 });
  b.layer((t) => { t.e(80, 50, 16, 14, P.ink); t.r(64, 50, 32, 20, P.ink); t.e(80, 51, 14, 12, P.ember2); t.r(66, 51, 28, 19, P.ember2); t.e(80, 58, 9, 8, P.ember4); }, OL);
  light(b, 80, 58, 48, 34, P.ember3, .45, 5);
  b.layer((t) => { t.r(42, 46, 12, 6, P.soil2); t.r(43, 47, 10, 4, mix(P.soil0, P.ink, .4)); }, OL); b.r(45, 48, 5, 1, P.soil1);
  warmGround(b, 70);
  return plate(b, (g) => { F(g, 80, 92, CAST.tizon, { s: 2, front: [96, 64], back: [64, 64], emo: "open" }); }); };
/* ================= Event scenes: Bosque Hondo ================= */
// deep forest: green light from above, trunks in three depths, light shafts in flat bands
function forestBack(b, o = {}) {
  OL = P.moss0;
  band(b, 0, 0, EW, 74, o.night ? P.ink : mix(P.moss0, P.sea0, .3), o.night ? P.moss0 : P.moss1, 6, o.night ? mix(P.moss0, P.sea0, .5) : mix(P.moss2, P.moss3, .3));
  const r = rng(o.seed || 4);
  // far trunks: flat, close to the fog colour
  for (let i = 0; i < 9; i++) { const x = Math.floor(r() * EW), w = 3 + Math.floor(r() * 3); b.r(x, 0, w, 74, mix(o.night ? P.moss0 : P.moss1, P.ink, .25)); }
  haze(b, 20, 74, o.night ? mix(P.moss0, P.sea1, .4) : mix(P.moss2, P.moss4, .4), .35);
  // mid trunks with bark
  for (let i = 0; i < 4; i++) { const x = 6 + i * 34 + Math.floor(r() * 10), w = 7 + Math.floor(r() * 4);
    b.r(x, 0, w, 76, mix(P.soil0, P.moss0, .3)); b.r(x, 0, 2, 76, mix(P.soil1, P.moss1, .3)); for (let y = 4; y < 76; y += 7) b.r(x + 3, y, 2, 3, P.soil0); }
  // canopy
  for (let x = -6; x < EW + 6; x += 9) { b.e(x, 4 + (x % 4), 9, 6, P.moss0); b.e(x + 3, 2, 6, 3, mix(P.moss0, P.moss1, .5)); }
  // light shafts
  if (!o.night) (o.shafts || [[30, 18], [86, 14]]).forEach(([x, w]) => { for (let y = 8; y < 80; y++) for (let i = 0; i < w; i++) { const xx = Math.floor(x + i + y * .35); const c = b.g(xx, y); if (c) b.p(xx, y, mix(c, P.moss4, .18 + (i > w * .3 && i < w * .7 ? .08 : 0))); } });
}
function forestFloor(b, y0, o = {}) { band(b, 0, y0, EW, EH - y0, o.night ? P.moss0 : mix(P.moss2, P.moss1, .4), o.night ? mix(P.moss0, P.ink, .4) : P.moss0, 4);
  const r = rng(o.seed || 21); for (let i = 0; i < 40; i++) { const x = Math.floor(r() * EW), y = y0 + 2 + Math.floor(r() * (EH - y0 - 2)); b.r(x, y, 2, 1, i % 3 ? mix(P.moss2, P.moss3, .5) : P.soil1); if (i % 5 === 0) { b.p(x, y - 1, P.moss3); b.p(x + 2, y - 1, P.moss3); } } }
// the Hedge: a wall of dark thorny branches
function hedge(b, x0, x1, top, bottom, o = {}) {
  b.layer((t) => { t.r(x0, top, x1 - x0, bottom - top, P.moss0); for (let x = x0; x < x1; x += 4) t.e(x + 2, top, 3, 3, P.moss0); }, P.ink);
  const r = rng(o.seed || 13); for (let i = 0; i < (x1 - x0) * (bottom - top) / 10; i++) { const x = x0 + Math.floor(r() * (x1 - x0)), y = top + Math.floor(r() * (bottom - top));
    b.l(x, y, x + 2 + Math.floor(r() * 3), y - 1 - Math.floor(r() * 2), i % 4 ? mix(P.moss0, P.soil0, .5) : mix(P.moss1, P.moss0, .4)); if (i % 6 === 0) b.p(x, y, P.soil2); }
}
function bigTrunk(b, x, w, top = 0, bottom = 84, o = {}) {
  b.layer((t) => { t.r(x, top, w, bottom - top, P.soil0); t.r(x, top, 3, bottom - top, P.soil1); for (let y = top + 3; y < bottom; y += 6) { t.r(x + 5, y, 2, 4, mix(P.soil0, P.ink, .4)); t.r(x + w - 6, y + 3, 2, 3, mix(P.soil0, P.ink, .4)); }
    t.poly([[x - 8, bottom], [x, bottom - 10], [x + 4, bottom]], P.soil0); t.poly([[x + w - 4, bottom], [x + w, bottom - 10], [x + w + 8, bottom]], P.soil0); }, mix(P.ink, P.moss0, .5));
}

EVNOTE.abrojo = { scene: "El hueco del Seto, entre espinas negras. Abrojo, guarda del Bosque, cierra el paso con una lanza de madera.", hidden: "Los bordes del hueco están cortados limpios, con navaja: alguien de dentro lo abrió a propósito." };
EVSC.abrojo = () => { const b = new Pic(EW, EH); forestBack(b, { seed: 5 });
  hedge(b, 0, 46, 30, 84); hedge(b, 80, 128, 28, 84, { seed: 14 });
  b.l(46, 40, 46, 84, P.soil3); b.l(80, 38, 80, 84, P.soil3);
  forestFloor(b, 82);
  return plate(b, (g) => { F(g, 64, 94, CAST.forest, { s: 1.9, cloth: [P.moss1, P.moss0, P.moss2], hat: { k: "hood", c: [P.moss0, P.ink] }, front: [74, 60], back: [58, 74], emo: "open",
    hold: (q, x, y) => { HD.stroke(q, (z) => { z.moveTo(x - .6, y + 9); z.lineTo(x + .6, y - 8); }, P.ink, .8); HD.stroke(q, (z) => { z.moveTo(x - .6, y + 9); z.lineTo(x + .6, y - 8); }, P.soil2, .4); HD.shape(q, (z) => HD.poly(z, [[x, y - 8], [x + .9, y - 11], [x + 1.4, y - 7.6]]), { fill: P.mist, lw: .3 }); } }); }); };

EVNOTE.llovizna = { scene: "Por fuera del Seto, Llovizna, una niña del Agua, entierra bellotas con una cuchara. Una fila de palitos marca cada una.", hidden: "Por encima del Seto asoma una rama torcida del roble de la linde, la que deja caer las bellotas." };
EVSC.llovizna = () => { const b = new Pic(EW, EH); OL = P.moss0;
  band(b, 0, 0, EW, 40, mix(P.sea2, P.sea3, .4), P.sea4, 5);
  b.e(30, 6, 30, 16, mix(P.moss1, P.sea2, .3)); b.e(96, 4, 40, 18, mix(P.moss1, P.sea2, .3)); haze(b, 0, 40, P.sea4, .3);
  hedge(b, 0, EW, 26, 70, { seed: 22 });
  b.layer((t) => { t.poly([[70, 24], [86, 14], [108, 10], [110, 13], [90, 18], [74, 28]], P.soil0); t.e(98, 14, 10, 5, P.moss1); }, P.ink);
  [[92, 20], [100, 22]].forEach(([x, y]) => b.layer((t) => { t.e(x, y, 1.4, 1.8, P.soil2); t.r(x - 1, y - 2, 3, 1, P.soil1); }, P.ink));
  band(b, 0, 70, EW, 26, mix(P.moss2, P.soil1, .4), mix(P.moss1, P.soil0, .3), 4);
  for (let x = 14; x < 120; x += 9) { if (x > 56 && x < 74) continue; b.r(x, 74 + (x % 3), 1, 5, P.soil2); b.p(x, 73 + (x % 3), P.moss3); b.e(x, 80 + (x % 3), 2, .8, P.soil0); }
  return plate(b, (g) => { F(g, 62, 92, kid(CAST.water), { s: 2, pose: "kneel", hairStyle: "bun", hair: P.sea0, front: [70, 84], back: [56, 84], emo: "open",
    hold: (q, x, y) => { HD.stroke(q, (z) => { z.moveTo(x, y); z.lineTo(x + 1.6, y + 1.8); }, P.mist, .45); HD.shape(q, (z) => HD.E(z, x + 1.8, y + 2, .7, .5), { fill: P.mist, lw: .25 }); } }); }); };

EVNOTE.agalla = { scene: "Un roble viejísimo de corteza agrietada. Dos grietas parecen ojos, y en la base del tronco se abre un hueco oscuro.", hidden: "Dentro del hueco, una gota negra sube por la pared de madera." };
EVSC.agalla = () => { const b = new Pic(EW, EH); forestBack(b, { seed: 9, shafts: [[10, 16]] });
  b.layer((t) => { t.r(42, 0, 46, 86, P.soil0); t.poly([[30, 86], [42, 66], [42, 86]], P.soil0); t.poly([[88, 86], [88, 64], [104, 86]], P.soil0); t.r(42, 0, 4, 86, P.soil1); }, P.ink);
  for (let y = 4; y < 84; y += 5) { b.r(50 + (y % 10), y, 3, 3, mix(P.soil0, P.ink, .4)); b.r(74 - (y % 8), y + 2, 3, 2, mix(P.soil0, P.ink, .4)); }
  b.layer((t) => { t.e(56, 34, 4, 1.4, P.ink); t.e(74, 34, 4, 1.4, P.ink); }, P.ink); b.p(57, 34, P.moss3); b.p(75, 34, P.moss3);
  b.l(52, 30, 60, 31, P.ink); b.l(70, 31, 78, 30, P.ink);
  b.e(65, 72, 10, 13, P.ink); b.e(65, 74, 8, 10, mix(P.ink, SAP.s1, .5)); b.p(64, 66, SAP.sheen); b.p(64, 67, SAP.s2);
  b.e(65, 46, 6, 2, mix(P.soil0, P.ink, .5));
  forestFloor(b, 84, { seed: 12 });
  return plate(b, (g) => { HD.creature(g, "remolin", 104, 90, { s: 1.4, dir: -1, emo: "o" }); }); };

EVNOTE.liquenes = { scene: "Entre las raíces del Roble Sentado, donde se reúne el consejo, Abuelo Liquen pela una manzana con su capucha verde.", hidden: "En el asiento de raíz más alto, el de Liquen, hay grabada una bellota pequeñita y una fecha muy antigua." };
EVSC.liquenes = () => { const b = new Pic(EW, EH); forestBack(b, { seed: 31, shafts: [[50, 22]] });
  bigTrunk(b, 40, 48, 0, 74);
  b.layer((t) => { [[20, 78, 22, 8], [86, 76, 26, 8], [56, 82, 16, 6]].forEach(([x, y, w, h]) => { t.e(x + w / 2, y, w / 2, h / 2, P.soil1); t.e(x + w / 2, y - 1, w / 2 - 2, h / 2 - 2, P.soil2); }); }, P.ink);
  b.layer((t) => { t.r(58, 62, 12, 10, P.soil1); t.r(58, 62, 12, 1, P.soil2); }, P.ink); b.e(64, 66, 1.4, 1.6, P.soil3);
  forestFloor(b, 80, { seed: 33 });
  return plate(b, (g) => { F(g, 31, 82, CAST.liquen, { s: 1.7, pose: "sit", front: [42, 70], back: [40, 72], emo: "closed",
    hold: (q, x, y) => HD.shape(q, (z) => HD.E(z, x + .4, y - .2, 1.3, 1.2), { fill: P.ember1, light: P.rose2, lw: .3 }) }); }); };

EVNOTE.cripta = { scene: "Bajo las raíces de un roble enorme, la puerta de la Cripta de Semillas con su sello de musgo roto. Un Espinardo manchado de negro eriza las púas delante.", hidden: "De la rendija de la puerta salen hilos de savia que suben por las raíces hacia arriba." };
EVSC.cripta = () => { const b = new Pic(EW, EH); forestBack(b, { night: true, seed: 41 });
  b.layer((t) => { t.poly([[10, 84], [30, 40], [50, 20], [80, 20], [100, 40], [120, 84]], P.soil0); }, P.ink);
  for (let i = 0; i < 6; i++) b.l(24 + i * 14, 84, 40 + i * 9, 24, mix(P.soil0, P.soil1, .5));
  b.layer((t) => { t.e(65, 58, 14, 14, P.ink); t.r(51, 58, 28, 24, P.ink); t.e(65, 59, 12, 12, P.soil1); t.r(53, 59, 24, 23, P.soil1);
    for (let x = 56; x < 76; x += 4) t.r(x, 50, 1, 32, P.soil0); t.e(65, 66, 4, 4, P.moss1); t.l(63, 64, 67, 68, P.ink); }, P.ink);
  [[62, 50], [70, 44], [58, 40], [74, 32]].forEach(([x, y]) => dropUp(b, x, y));
  light(b, 65, 70, 30, 20, mix(SAP.sheen, P.moss0, .7), .2, 3);
  forestFloor(b, 84, { night: true, seed: 42 });
  return plate(b, (g) => { HD.creature(g, "espinardo", 66, 94, { s: 1.9, emo: "o" }); }); };

EVNOTE.silencio = { scene: "Un claro del Bosque. Yedra, con hojas en el pelo, intenta dormir en una hamaca de lianas entre dos troncos y no lo consigue.", hidden: "Todos los búhos del claro tienen los ojos abiertos. Nadie duerme este invierno." };
EVSC.silencio = () => { const b = new Pic(EW, EH); forestBack(b, { seed: 51, shafts: [[48, 26]] });
  bigTrunk(b, 10, 14, 0, 82); bigTrunk(b, 104, 14, 0, 82);
  b.layer((t) => { for (let i = 0; i <= 40; i++) { const x = 24 + i * 2, y = 44 + Math.sin(i / 40 * Math.PI) * 14; t.r(x, y, 2, 2, P.moss1); } t.l(24, 44, 24, 36, P.moss1); t.l(104, 44, 104, 36, P.moss1); }, P.moss0);
  [[16, 22], [110, 30], [112, 60]].forEach(([x, y]) => b.layer((t) => { t.e(x, y, 2.4, 3, P.soil2); t.p(x - 1, y - 1, P.butter); t.p(x + 1, y - 1, P.butter); }, P.ink));
  forestFloor(b, 82, { seed: 52 });
  return plate(b, (g) => { F(g, 56, 60, CAST.forest, { s: 1.6, pose: "sit", hairStyle: "long", hair: P.moss0, cloth: [P.moss2, P.moss1, P.moss3], front: [64, 50], emo: "open" }); }); };

EVNOTE.fuera = { scene: "Por fuera del Seto, una familia de la Sombra ha levantado un refugio con mantas. Bruma, el padre, recoge solo ramitas caídas.", hidden: "Una de las mantas está remendada con un trozo de tapiz con el escudo de la Corte de la Sombra." };
EVSC.fuera = () => { const b = new Pic(EW, EH); OL = mix(P.ink, P.plum1, .4);
  band(b, 0, 0, EW, 40, P.plum1, mix(P.plum2, P.sea1, .4), 5);
  hedge(b, 0, EW, 18, 66, { seed: 61 }); tint(b, 0, 14, EW, 52, P.plum1, .25);
  band(b, 0, 64, EW, 32, mix(P.moss1, P.plum1, .5), mix(P.moss0, P.plum1, .4), 4);
  b.layer((t) => { t.poly([[14, 84], [36, 54], [58, 84]], P.plum3); t.poly([[36, 54], [58, 84], [64, 84], [42, 54]], P.plum2); t.poly([[26, 84], [36, 66], [46, 84]], P.ink); }, OL);
  b.r(40, 60, 6, 5, P.rose0); b.p(42, 62, P.ember4); b.p(43, 61, P.ember4);
  b.layer((t) => { t.r(80, 82, 14, 2, P.soil1); t.l(82, 80, 92, 84, P.soil1); }, OL); light(b, 87, 80, 10, 6, P.ember3, .4, 3);
  return plate(b, (g) => { F(g, 104, 92, CAST.nightBare, { s: 1.8, pose: "kneel", dir: -1, front: [96, 84], emo: "open", hold: (q, x, y) => HD.stroke(q, (z) => { z.moveTo(x, y); z.lineTo(x - 3, y - 1); }, P.soil1, .5) });
    F(g, 34, 90, kid(CAST.nightBare), { s: 1.4, pose: "sit", emo: "open" }); }); };

EVNOTE.musgo = { scene: "Un claro alfombrado de musgo con tres niños del Bosque sentados en corro, escuchando el suelo.", hidden: "Bajo el musgo, en un corte del terreno, se ve una raíz enorme y pálida con una vena negra dentro." };
EVSC.musgo = () => { const b = new Pic(EW, EH); forestBack(b, { seed: 71, shafts: [[40, 30]] });
  band(b, 0, 70, EW, 26, mix(P.moss3, P.moss2, .4), P.moss1, 4);
  const r = rng(72); for (let i = 0; i < 40; i++) b.e(Math.floor(r() * EW), 72 + Math.floor(r() * 22), 2, 1, mix(P.moss3, P.moss4, .5));
  b.layer((t) => { t.r(100, 82, 28, 14, P.soil0); t.e(116, 90, 10, 3, mix(P.fog, P.soil3, .5)); }, P.ink); b.l(108, 90, 124, 90, SAP.s1);
  return plate(b, (g) => { [[30, 84], [54, 88], [78, 85]].forEach(([x, y], i) => F(g, x, y, kid(CAST.forest), { s: 1.4, pose: "sit", hairStyle: i === 1 ? "bun" : "short", emo: "closed" })); }); };

EVNOTE.espinas = { scene: "El sendero cortado por una pared de espinas que el Seto ha levantado de la noche a la mañana. Un Remolín está atrapado entre las ramas.", hidden: "Las raíces del Seto no buscan agua: bajan rectas, muy hondo, y algunas brillan negras." };
EVSC.espinas = () => { const b = new Pic(EW, EH); forestBack(b, { seed: 81 });
  hedge(b, 20, 110, 20, 82, { seed: 82 });
  for (let i = 0; i < 6; i++) b.l(30 + i * 14, 82, 28 + i * 14, 96, i % 2 ? SAP.s1 : P.soil0);
  forestFloor(b, 82, { seed: 83 });
  b.poly([[40, 96], [56, 82], [72, 82], [90, 96]], mix(P.soil2, P.moss2, .4));
  return plate(b, (g) => { HD.creature(g, "remolin", 66, 56, { s: 1.6, emo: "o" });
    for (let k = 0; k < 3; k++) HD.stroke(g, (q) => { q.moveTo(56, 44 + k * 6); q.bezierCurveTo(62, 48 + k * 4, 70, 46 + k * 5, 78, 50 + k * 4); }, P.moss0, .9); }); };
/* ================= Event scenes: Hondonada Umbría ================= */
// a sunken valley in violet fog: far roofs fade into flat mist bands
function hollowBack(b, o = {}) {
  OL = P.ink;
  const clear = o.clear || 0; b.r(0, 60, EW, EH - 60, mix(P.plum2, P.plum1, .4));
  band(b, 0, 0, EW, 70, mix(P.plum1, P.ink, .3), mix(P.plum2, P.mist, .25 + clear * .3), 7, mix(P.plum3, P.fog, .3 + clear * .3));
  // valley rims
  b.poly([[0, 40], [0, 16], [20, 22], [34, 30], [50, 40]], mix(P.plum1, P.plum2, .35)); b.poly([[78, 40], [96, 26], [112, 18], [128, 14], [128, 40]], mix(P.plum1, P.plum2, .35));
  haze(b, 20, 50, mix(P.plum3, P.mist, .5), .45);
  // far roofs of the Court, nearly lost in fog
  const r = rng(o.seed || 7);
  for (let i = 0; i < 9; i++) { const x = Math.floor(r() * EW), w = 8 + Math.floor(r() * 8), y = 40 + Math.floor(r() * 8);
    b.r(x, y, w, 70 - y, mix(P.plum2, P.mist, .35)); b.poly([[x - 1, y], [x + w / 2, y - 5], [x + w + 1, y]], mix(P.plum2, P.mist, .3)); }
  haze(b, 36, 66, mix(P.mist, P.fog, .3), .5 - clear * .2);
}
function hollowGround(b, y0, o = {}) { band(b, 0, y0, EW, EH - y0, mix(P.plum2, P.plum1, .4), P.plum1, 4);
  const r = rng(o.seed || 31); for (let i = 0; i < 26; i++) { const x = Math.floor(r() * EW), y = y0 + 2 + Math.floor(r() * (EH - y0 - 2)); b.r(x, y, 3, 1, mix(P.plum2, P.plum3, .5)); if (i % 4 === 0) b.p(x + 1, y - 1, mix(P.moss1, P.plum2, .5)); } }
// a stone house of the Court: flat dark walls, a round moon window
function courtH(b, x, y, w, h, o = {}) {
  b.layer((t) => { t.r(x, y, w, h, o.wall || mix(P.plum2, P.ink, .25)); t.poly([[x - 3, y], [x + w / 2, y - (o.roofH || 12)], [x + w + 3, y]], o.roof || P.plum1);
    t.r(x, y, w, 1, P.plum3);
    if (o.moon !== false) { t.e(x + w / 2, y + 7, 3, 3, P.ink); t.e(x + w / 2 + .6, y + 6.6, 2, 2, o.lit ? P.ember3 : mix(P.plum3, P.mist, .4)); }
    if (o.door) { t.r(x + o.door, y + h - 14, 8, 14, P.ink); t.r(x + o.door + 1, y + h - 13, 6, 13, o.doorC || P.soil0); } }, OL);
}
// a black lantern: an iron post whose glass holds a coiled root and casts a pool of shadow
function blackLamp(b, x, gy, h, o = {}) {
  for (let yy = gy - 3; yy < gy + 4; yy++) for (let xx = x - 14; xx < x + 15; xx++) { const d = ((xx - x) / 14) ** 2 + ((yy - gy) / 3.5) ** 2; if (d < 1) { const c = b.g(xx, yy); if (c) b.p(xx, yy, mix(c, P.ink, .45)); } }
  b.layer((t) => { t.r(x - 1, gy - h, 2, h, P.ink); t.r(x - 3, gy - 2, 6, 2, P.ink); t.r(x - 4, gy - h - 8, 8, 8, P.ink); t.r(x - 3, gy - h - 7, 6, 6, o.broken ? mix(P.plum2, P.ink, .4) : mix(P.plum1, P.ink, .3));
    t.poly([[x - 5, gy - h - 8], [x, gy - h - 12], [x + 5, gy - h - 8]], P.ink); }, OL);
  if (!o.broken) { b.l(x - 1, gy - h - 3, x + 1, gy - h - 6, SAP.sheen); b.p(x, gy - h - 2, mix(SAP.sheen, P.ember3, .5)); }
  else { b.l(x - 2, gy - h - 6, x + 1, gy - h - 3, P.mist); }
  if (o.drip) { b.p(x + 2, gy - h, SAP.sheen); b.p(x + 2, gy - h + 3, mix(SAP.sheen, P.ink, .3)); b.e(x + 3, gy, 2, .8, mix(SAP.sheen, P.plum1, .4)); }
}
// the empty Throne of Mist
function throneEv(b, x, gy) {
  b.layer((t) => { t.r(x - 18, gy - 4, 36, 4, P.plum2); t.r(x - 14, gy - 8, 28, 4, P.plum2); t.r(x - 18, gy - 4, 36, 1, P.plum3); t.r(x - 14, gy - 8, 28, 1, P.plum3);
    t.r(x - 9, gy - 40, 18, 32, mix(P.plum2, P.plum3, .3)); t.poly([[x - 11, gy - 40], [x, gy - 50], [x + 11, gy - 40]], mix(P.plum2, P.plum3, .3));
    t.r(x - 12, gy - 22, 4, 14, P.plum2); t.r(x + 8, gy - 22, 4, 14, P.plum2); t.r(x - 6, gy - 22, 12, 3, P.plum1); t.r(x - 6, gy - 36, 12, 14, mix(P.plum1, P.ink, .2));
    t.e(x, gy - 44, 3, 3, P.mist); t.e(x + 1, gy - 44.6, 2.4, 2.4, mix(P.plum2, P.plum3, .3)); }, OL);
}
const spear = (q, x, y) => { HD.stroke(q, (z) => { z.moveTo(x - .4, y + 9); z.lineTo(x + .4, y - 12); }, P.ink, .8); HD.stroke(q, (z) => { z.moveTo(x - .4, y + 9); z.lineTo(x + .4, y - 12); }, P.plum3, .4);
  HD.shape(q, (z) => HD.poly(z, [[x - .6, y - 12], [x + .4, y - 16], [x + 1.2, y - 12]]), { fill: P.mist, lw: .3 }); };

EVNOTE.guarda = { scene: "El Trono de Bruma, vacío en el centro de la Hondonada. A su lado, Cierzo sigue de pie con la lanza en alto y la capa empapada de rocío.", hidden: "Sobre el brazo del trono hay medio pan, duro como una piedra. No es el primero." };
EVSC.guarda = () => { const b = new Pic(EW, EH); hollowBack(b, { seed: 3 });
  hollowGround(b, 72); throneEv(b, 58, 80);
  b.layer((t) => { t.r(44, 57, 6, 2, P.soil2); t.r(45, 56, 4, 1, P.soil3); }, OL);
  light(b, 58, 50, 40, 30, mix(P.mist, P.fog, .5), .18, 4);
  return plate(b, (g) => { F(g, 92, 92, CAST.night, { s: 1.85, dir: -1, cloth: [P.plum1, P.ink, P.plum2], front: [86, 70], back: [98, 74], emo: "closed", hold: spear }); }); };

EVNOTE.faroles = { scene: "El paseo de los faroles negros: farolas de hierro que echan charcos de sombra en vez de luz. Uno gotea una savia que brilla por dentro.", hidden: "En el pie del farol más cercano hay una placa con el farol de la Casa Albor." };
EVSC.faroles = () => { const b = new Pic(EW, EH); hollowBack(b, { seed: 9 });
  hollowGround(b, 70, { seed: 5 });
  blackLamp(b, 22, 76, 30, { broken: true }); blackLamp(b, 56, 72, 26); blackLamp(b, 98, 84, 40, { drip: true }); blackLamp(b, 124, 74, 28, { broken: true });
  b.r(94, 80, 8, 3, P.butter); b.r(95, 81, 6, 1, P.ember2);
  return plate(b, (g) => { HD.creature(g, "lumo", 72, 90, { s: 1.6, emo: "o" }); }); };

EVNOTE.velo = { scene: "En el borde de la Hondonada, Calina tira de un hilo de niebla como quien deshace un jersey. El hilo se vuelve a enredar solo.", hidden: "Lleva cosido al pecho un trozo de tela gris: es un retal del Velo, el libro de los reyes." };
EVSC.velo = () => { const b = new Pic(EW, EH); hollowBack(b, { seed: 12 });
  // mist wall on the right, with a thread pulled out
  for (let y = 10; y < 80; y++) { const w = 46 + Math.round(Math.sin(y * .2) * 4); b.r(EW - w, y, w, 1, mix(P.mist, P.fog, .25 + ((y >> 3) % 2) * .08)); }
  for (let y = 14; y < 80; y += 9) b.r(EW - 40, y, 30, 1, mix(P.fog, P.cream, .3));
  hollowGround(b, 78, { seed: 8 });
  for (let i = 0; i <= 30; i++) { const x = 52 + i, y = 58 + Math.sin(i * .5) * 2; b.p(Math.round(x), Math.round(y), mix(P.fog, P.cream, .4)); }
  return plate(b, (g) => { F(g, 44, 94, CAST.nightBare, { s: 1.8, hairStyle: "bun", hair: P.ink, cloth: [P.plum2, P.plum1, P.plum3], front: [52, 58], back: [50, 62], emo: "open" }); }); };

EVNOTE.cartas = { scene: "Una casa vacía de la Hondonada convertida en estafeta: cientos de cartas sin sello en casilleros de madera. Tordo las clasifica sin prisa.", hidden: "El casillero de abajo, el de las cartas con el nombre verdadero, tiene la madera gastada de tanto tocarla." };
EVSC.cartas = () => { const b = new Pic(EW, EH); OL = P.ink;
  b.r(0, 0, EW, 70, mix(P.plum1, P.soil0, .3));
  b.layer((t) => { t.r(8, 8, 70, 60, P.soil1); for (let y = 10; y < 66; y += 11) for (let x = 10; x < 76; x += 11) { t.r(x, y, 9, 9, P.soil0);
    const n = (x * 7 + y * 3) % 4; for (let k = 0; k < n; k++) t.r(x + 1 + k * 2, y + 3 - (k % 2), 2, 6, k % 2 ? P.cream : P.fog); } }, OL);
  b.layer((t) => { t.r(92, 16, 22, 20, P.ink); t.e(103, 26, 6, 6, mix(P.plum3, P.mist, .4)); t.r(102, 16, 2, 20, P.ink); t.r(92, 25, 22, 2, P.ink); }, OL);
  light(b, 103, 30, 30, 30, P.mist, .2, 4);
  b.r(0, 70, EW, 26, P.soil0); for (let x = 0; x < EW; x += 10) b.r(x, 70, 1, 26, mix(P.soil0, P.ink, .4)); b.r(0, 70, EW, 1, P.ink);
  b.layer((t) => { t.r(70, 72, 40, 4, P.soil2); t.r(74, 76, 2, 14, P.soil1); t.r(104, 76, 2, 14, P.soil1); t.r(78, 70, 10, 2, P.cream); t.r(90, 69, 8, 3, P.fog); }, OL);
  return plate(b, (g) => { F(g, 56, 92, CAST.night, { s: 1.7, hat: null, hairStyle: "short", hair: P.fog, beard: P.fog, front: [62, 62], back: [48, 64], emo: "closed",
    hold: (q, x, y) => HD.shape(q, (z) => z.rect(x - .4, y - 1.4, 3, 2.2), { fill: P.cream, shade: P.fog, lw: .3 }) }); }); };

EVNOTE.cuna = { scene: "Orvallo sale de una casa abandonada de la Hondonada con una cuna de madera enorme a la espalda.", hidden: "En la madera de la cuna hay lunas talladas, una por cada hijo que ha dormido en ella." };
EVSC.cuna = () => { const b = new Pic(EW, EH); hollowBack(b, { seed: 17 });
  courtH(b, 70, 30, 46, 40, { door: 18, doorC: P.ink }); b.l(88, 56, 96, 70, mix(P.plum2, P.ink, .2));
  hollowGround(b, 70, { seed: 11 });
  return plate(b, (g) => {
    HD.shape(g, (q) => { q.rect(20, 50, 22, 12); }, { fill: P.soil2, shade: P.soil1, light: P.soil3, lw: .4 });
    [[24, 54], [31, 54], [38, 54]].forEach(([x, y]) => HD.shape(g, (q) => HD.E(q, x, y, 1.6, 1.6), { fill: P.cream, lw: .25 }));
    HD.stroke(g, (q) => { q.moveTo(20, 62); q.lineTo(18, 66); q.moveTo(42, 62); q.lineTo(44, 66); }, P.soil0, .7);
    F(g, 34, 92, CAST.nightBare, { s: 1.85, hairStyle: "short", hair: P.ink, beard: P.plum1, cloth: [P.plum2, P.plum1, P.plum3], front: [38, 64], back: [28, 64], emo: "closed" }); }); };

EVNOTE.juego = { scene: "Una plaza vacía de la Hondonada con un juego de casillas pintado en el suelo. Unos Ecolitos saltan sobre ellas cantando con voces de niño.", hidden: "Junto a la última casilla alguien dibujó con tiza una fila de muñecos. Uno está borrado." };
EVSC.juego = () => { const b = new Pic(EW, EH); hollowBack(b, { seed: 21 });
  courtH(b, -6, 34, 34, 34, { lit: true }); courtH(b, 100, 36, 34, 32, {});
  band(b, 0, 66, EW, 30, mix(P.plum2, P.mist, .2), P.plum1, 4);
  const ch = mix(P.fog, P.cream, .4);
  [[50, 88], [58, 88], [54, 82], [50, 76], [58, 76], [54, 70]].forEach(([x, y]) => { b.r(x - 4, y - 3, 8, 1, ch); b.r(x - 4, y + 2, 8, 1, ch); b.r(x - 4, y - 3, 1, 6, ch); b.r(x + 3, y - 3, 1, 6, ch); });
  for (let i = 0; i < 4; i++) { const x = 80 + i * 6; b.e(x, 70, 1.4, 1.4, ch); b.r(x, 72, 1, 3, ch); }
  b.r(98, 70, 4, 5, mix(P.plum2, P.mist, .2));
  return plate(b, (g) => { HD.creature(g, "ecolito", 40, 90, { s: 1.5, emo: "happy" }); HD.creature(g, "ecolito", 60, 80, { s: 1.2, emo: "o", dir: -1 }); HD.creature(g, "ecolito", 92, 92, { s: 1.4, emo: "happy", dir: -1 }); }); };

EVNOTE.noctua = { scene: "La casa de Noctua, la sanadora. Su puerta sigue cubierta de flores secas de sombra, con un ramo blanco y fresco del Prado encima.", hidden: "Dentro, sobre la mesa, se ven dos tazas. Una nunca se la bebió nadie." };
EVSC.noctua = () => { const b = new Pic(EW, EH); hollowBack(b, { seed: 27 });
  courtH(b, 26, 22, 76, 50, { door: 34, doorC: mix(P.soil0, P.plum1, .3), roofH: 16 });
  b.layer((t) => { t.r(36, 34, 12, 10, P.ink); t.r(37, 35, 10, 8, mix(P.plum1, P.ember0, .3)); t.r(41, 35, 1, 8, P.ink); t.r(37, 39, 10, 1, P.ink); }, OL);
  const r = rng(4); for (let i = 0; i < 40; i++) { const x = 58 + Math.floor(r() * 12), y = 54 + Math.floor(r() * 18); b.p(x, y, i % 3 ? mix(P.soil2, P.plum2, .5) : P.plum3); }
  [[61, 52], [64, 51], [67, 52], [63, 53]].forEach(([x, y]) => { b.e(x, y, 1.4, 1.4, P.cream); b.p(x, y, P.butter); });
  b.l(64, 54, 64, 58, P.moss2);
  hollowGround(b, 72, { seed: 3 });
  return plate(b, (g) => { HD.creature(g, "nim", 100, 90, { s: 1.4, emo: "sad", dir: -1 }); }); };

EVNOTE.acta = { scene: "Al pie del Trono de Bruma asoma entre dos losas la esquina de una caja de escribano. El guarda, de espaldas, aparta la niebla con la lanza.", hidden: "La caja lleva dos sellos: la luna de la Corte y el farol de Albor." };
EVSC.acta = () => { const b = new Pic(EW, EH); hollowBack(b, { seed: 3 });
  hollowGround(b, 72); throneEv(b, 46, 80);
  b.layer((t) => { t.r(58, 74, 10, 6, P.soil1); t.r(58, 74, 10, 1, P.soil3); t.e(63, 77, 1.4, 1.4, P.ember3); }, OL);
  light(b, 63, 77, 10, 6, P.ember3, .25, 3);
  return plate(b, (g) => { F(g, 100, 92, CAST.night, { s: 1.75, dir: 1, cloth: [P.plum1, P.ink, P.plum2], front: [108, 70], back: [96, 74], emo: "closed", hold: spear }); }); };

EVNOTE.regreso = { scene: "La niebla de la Hondonada se ha aclarado. Penumbra baja por el camino con las manos envueltas en trapos y mira cada casa.", hidden: "Una de las puertas, la que no tiene flores, tiene una muesca corta grabada: el signo de la Hondura para «aquí sigue alguien»." };
EVSC.regreso = () => { const b = new Pic(EW, EH); hollowBack(b, { seed: 31, clear: 1 });
  courtH(b, 6, 30, 40, 40, { door: 14 }); courtH(b, 84, 32, 44, 38, { door: 20 });
  b.r(107, 58, 1, 4, P.fog);
  band(b, 0, 70, EW, 26, mix(P.plum2, P.mist, .25), P.plum1, 4);
  b.poly([[50, 70], [78, 70], [96, 96], [32, 96]], mix(P.plum3, P.mist, .3));
  return plate(b, (g) => { F(g, 62, 92, CAST.nightBare, { s: 1.85, hairStyle: "long", hair: P.ink, cloth: [P.plum2, P.plum1, P.plum3], front: [70, 74], back: [56, 74], emo: "sad",
    hold: (q, x, y) => HD.shape(q, (z) => HD.E(z, x, y, 1.6, 1.3), { fill: P.fog, shade: P.mist, lw: .3 }) }); }); };
/* ================= Event scenes: Lago Espejo ================= */
// a pale sky, far shore hills and a lake so still it mirrors them in flat bands
function lakeBack(b, o = {}) {
  OL = P.sea0;
  const n = o.night;
  b.r(0, 0, EW, EH, n ? P.sea0 : P.sea2);
  band(b, 0, 0, EW, 44, n ? P.ink : mix(P.sea3, P.cream, .3), n ? mix(P.sea0, P.plum1, .4) : P.sea4, 7, n ? P.sea1 : mix(P.cream, P.butter, .3));
  const hill = n ? mix(P.sea0, P.plum1, .5) : mix(P.sea2, P.moss2, .35), hill2 = n ? P.sea0 : mix(P.sea1, P.moss1, .4);
  b.poly([[0, 44], [0, 34], [24, 28], [46, 34], [70, 30], [96, 36], [128, 30], [128, 44]], hill);
  b.poly([[0, 44], [0, 40], [36, 38], [80, 41], [128, 38], [128, 44]], hill2);
  if (n) b.stars(0, 0, EW, 30, 26, 8);
  const wy = o.water || 44, wb = o.waterEnd || 80;
  // mirrored sky and hills: a flipped copy, slightly darkened, cut by thin flat ripple lines
  for (let y = wy; y < wb; y++) { const sy = wy - 1 - (y - wy); for (let x = 0; x < EW; x++) { const c = sy >= 0 ? b.g(x, sy) : null; b.p(x, y, mix(c || P.sea2, n ? P.sea0 : P.sea1, .28)); } }
  for (let y = wy + 3; y < wb; y += 5) b.r(((y * 13) % 40), y, 18 + (y % 3) * 6, 1, mix(n ? P.sea1 : P.sea3, P.cream, .3));
  b.r(0, wy, EW, 1, mix(P.cream, P.sea3, .4));
}
function mudBank(b, y0, o = {}) { band(b, 0, y0, EW, EH - y0, mix(P.soil1, P.sea1, .25), P.soil0, 4);
  const r = rng(o.seed || 41); for (let i = 0; i < 30; i++) { const x = Math.floor(r() * EW), y = y0 + 2 + Math.floor(r() * (EH - y0 - 2)); b.r(x, y, 4, 1, i % 3 ? mix(P.soil1, P.soil2, .4) : mix(P.sea1, P.soil1, .5)); if (i % 6 === 0) { b.l(x, y, x - 1, y - 4, P.moss2); b.l(x + 1, y, x + 2, y - 5, P.moss1); } } }
// a houseboat: a hull, a cabin with a little roof, a rope of the family's colour
function houseBoat(b, x, y, w, o = {}) {
  b.layer((t) => { t.poly([[x, y - 6], [x + w, y - 6], [x + w - 4, y], [x + 4, y]], o.hull || P.soil1); t.r(x + 1, y - 6, w - 2, 1, P.soil3);
    t.r(x + 6, y - 16, w - 14, 10, o.cabin || mix(P.sea3, P.cream, .3)); t.poly([[x + 4, y - 16], [x + w / 2 - 1, y - 22], [x + w - 6, y - 16]], o.roof || P.sea1);
    t.r(x + 10, y - 13, 4, 4, P.sea0); if (o.door) t.r(x + w - 14, y - 14, 4, 8, P.soil0);
    if (o.hole) t.e(x + w * .6, y - 3, 2, 2, P.ink); }, OL);
  if (o.rope) b.l(x + w - 2, y - 5, x + w + (o.ropeLen || 8), y - 3, o.rope);
}
function sanctuary(b, x, y, w) { // a wooden platform on stilts with a little roof
  b.layer((t) => { for (let i = 0; i < 4; i++) t.r(x + 3 + i * (w - 8) / 3, y, 2, 14, P.soil0); t.r(x, y - 3, w, 4, P.soil2); t.r(x, y - 3, w, 1, P.soil3);
    t.r(x + 4, y - 26, 2, 23, P.soil1); t.r(x + w - 6, y - 26, 2, 23, P.soil1); t.poly([[x - 3, y - 26], [x + w / 2, y - 34], [x + w + 3, y - 26]], P.sea1);
    t.e(x + w / 2, y - 28, 2, 2, P.cream); }, OL);
}
const bucket = (q, x, y) => HD.shape(q, (z) => HD.poly(z, [[x - 1.2, y - 1], [x + 1.2, y - 1], [x + .9, y + 1.4], [x - .9, y + 1.4]]), { fill: P.soil2, shade: P.soil1, lw: .3 });

EVNOTE.bajada = { scene: "De noche, en el campamento del Arroyo, las Mareas rezan en corro alrededor de un charco, lo único que queda del arroyo. Sargazo mueve las manos sobre el agua.", hidden: "En el borde del charco hay una raya de barro seco más alta que el agua: hasta ahí llegó la noche que creció." };
EVSC.bajada = () => { const b = new Pic(EW, EH); lakeBack(b, { night: true, water: 44, waterEnd: 44 });
  houseBoat(b, -6, 60, 40, { cabin: mix(P.sea1, P.plum1, .3), roof: P.sea0 }); houseBoat(b, 96, 58, 40, { cabin: mix(P.sea1, P.plum1, .3), roof: P.sea0, rope: P.ember2, ropeLen: -10 });
  mudBank(b, 56, { seed: 3 });
  b.e(64, 80, 22, 6, mix(P.soil1, P.soil2, .3)); b.e(64, 80, 18, 4.4, P.sea1); b.e(60, 79, 8, 1.4, P.sea3); b.e(64, 80, 18, 4.4, P.sea1);
  for (let x = 47; x < 82; x++) if (b.g(x, 78)) b.p(x, 77, mix(P.soil2, P.soil3, .5));
  light(b, 64, 80, 30, 10, P.sea3, .25, 4);
  return plate(b, (g) => {
    [[34, 78, 1], [44, 76, 1], [86, 76, -1], [96, 78, -1]].forEach(([x, y, d]) => F(g, x, y, CAST.water, { s: 1.15, pose: "sit", dir: d, emo: "closed", hair: P.ink }));
    F(g, 62, 92, CAST.water, { s: 1.75, pose: "kneel", hairStyle: "none", beard: P.fog, cloth: [P.sea1, P.sea0, P.sea2], front: [70, 80], back: [56, 80], emo: "closed" }); }); };

EVNOTE.barcas = { scene: "Las barcas-casa del campamento, varadas en el barro y atadas unas a otras con cuerdas de colores. Anea salta de cubierta en cubierta revisando nudos.", hidden: "Una barca está un poco apartada y no tiene ninguna cuerda: la de la familia de Junco." };
EVSC.barcas = () => { const b = new Pic(EW, EH); lakeBack(b, { water: 44, waterEnd: 54 });
  mudBank(b, 54, { seed: 7 });
  houseBoat(b, 4, 72, 40, { rope: P.moss3, ropeLen: 10 }); houseBoat(b, 54, 74, 38, { cabin: mix(P.rose2, P.cream, .4), roof: P.rose0, rope: P.ember3, ropeLen: 10, hole: true, door: true });
  houseBoat(b, 102, 62, 32, { cabin: mix(P.fog, P.sea3, .3), roof: P.plum2 });
  b.l(44, 67, 54, 69, P.moss3); b.l(92, 69, 100, 66, P.ember3);
  return plate(b, (g) => { F(g, 70, 58, kid(CAST.water), { s: 1.55, hairStyle: "bun", hair: P.ink, cloth: [P.sea2, P.sea1, P.sea3], front: [74, 48], back: [64, 48], emo: "open" }); }); };

EVNOTE.espejismo = { scene: "La orilla del Lago Espejo. En el agua quieta se refleja una casa del Vado con la puerta abierta. En la orilla de verdad solo hay unas Vidrielas de cristal.", hidden: "En el reflejo, junto a la puerta, hay un cuenco de comida en el suelo." };
EVSC.espejismo = () => { const b = new Pic(EW, EH); lakeBack(b, { water: 42, waterEnd: 96 });
  // the false reflection: an upside-down cottage with a lit door
  b.layer((t) => { t.r(70, 50, 26, 16, mix(P.cream, P.sea3, .4)); t.poly([[66, 66], [83, 76], [100, 66]], mix(P.ember1, P.sea1, .4)); t.r(80, 50, 6, 9, mix(P.ember3, P.sea3, .3)); t.r(74, 56, 4, 4, mix(P.sea0, P.sea1, .3)); t.r(88, 56, 4, 4, mix(P.sea0, P.sea1, .3)); t.r(82, 49, 3, 1, P.cream); }, mix(P.sea0, P.sea1, .4));
  for (let y = 52; y < 76; y += 4) b.r(64, y, 40, 1, mix(P.sea3, P.cream, .25));
  band(b, 0, 80, EW, 16, mix(P.soil2, P.sea2, .3), P.soil1, 3);
  return plate(b, (g) => { HD.creature(g, "vidriela", 28, 90, { s: 1.5, emo: "o" }); HD.creature(g, "vidriela", 46, 92, { s: 1.2, emo: "o", dir: -1 }); }); };

EVNOTE.santuario = { scene: "El Santuario del Espejo, una plataforma de madera en medio del Lago. Madre Marejada está sentada de espaldas al agua, la única que no mira los reflejos.", hidden: "Bajo la plataforma, en el reflejo, se ve una capucha azul pequeña que no es de nadie." };
EVSC.santuario = () => { const b = new Pic(EW, EH); lakeBack(b, { water: 44, waterEnd: 96 });
  sanctuary(b, 34, 70, 64);
  b.layer((t) => { t.e(70, 86, 3, 3, P.sea1); t.poly([[67, 86], [70, 81], [73, 86]], P.sea1); }, mix(P.sea0, P.sea1, .4));
  return plate(b, (g) => { F(g, 56, 67, CAST.marejada, { s: 1.6, pose: "sit", dir: -1, emo: "closed" }); }); };

EVNOTE.pez = { scene: "En el barro de la orilla boquea un pez enorme y plateado. Berro le da vueltas con un palo mientras la Abuela Nasa grita desde una barca.", hidden: "En el ojo del pez, muy pequeño, se refleja un farol con raíces." };
EVSC.pez = () => { const b = new Pic(EW, EH); lakeBack(b, { water: 44, waterEnd: 62 });
  houseBoat(b, 84, 60, 44, { cabin: mix(P.fog, P.sea3, .3), roof: P.sea1 });
  mudBank(b, 62, { seed: 13 });
  b.layer((t) => { t.e(56, 82, 20, 6, P.fog); t.e(56, 81, 20, 4, P.cream); t.e(56, 84, 18, 2, P.mist); t.poly([[74, 82], [84, 76], [82, 82], [84, 88]], P.fog); t.e(41, 81, 2, 2, P.ink); t.p(40, 80, P.cream);
    for (let x = 48; x < 70; x += 4) t.l(x, 79, x + 2, 82, P.mist); t.l(38, 84, 42, 83, P.plum2); }, P.sea0);
  return plate(b, (g) => { F(g, 26, 92, kid(CAST.water), { s: 1.55, hair: P.ink, front: [36, 80], back: [22, 80], emo: "happy",
      hold: (q, x, y) => HD.stroke(q, (z) => { z.moveTo(x, y); z.lineTo(x + 6, y + 6); }, P.soil1, .5) });
    F(g, 87, 54, CAST.water, { s: 1.3, dir: -1, hairStyle: "bun", hair: P.fog, hat: { k: "scarf", c: [P.sea1, P.sea0] }, front: [81, 42], emo: "open" }); }); };

EVNOTE.aguador = { scene: "Cardo, un aguador del Prado, sube al campamento con un carro de barriles que dicen «AGUA LIMPIA». Detrás le sigue una fila de gente de las Mareas con cubos vacíos.", hidden: "Los barriles llevan marcado a fuego el sello del Gremio del Cráter." };
EVSC.aguador = () => { const b = new Pic(EW, EH); lakeBack(b, { water: 44, waterEnd: 52 });
  band(b, 0, 52, EW, 44, mix(P.soil2, P.moss2, .2), P.soil1, 4);
  b.poly([[0, 70], [128, 62], [128, 76], [0, 86]], mix(P.soil2, P.soil3, .4));
  b.layer((t) => { t.r(64, 60, 34, 14, P.soil1); t.r(64, 60, 34, 1, P.soil3); [[68, 50], [80, 50], [92, 52]].forEach(([x, y]) => { t.r(x - 4, y, 9, 10, P.soil2); t.r(x - 4, y + 2, 9, 1, P.soil0); t.r(x - 4, y + 7, 9, 1, P.soil0); });
    t.e(70, 76, 5, 5, P.soil0); t.e(70, 76, 3, 3, P.soil2); t.e(94, 74, 5, 5, P.soil0); t.e(94, 74, 3, 3, P.soil2); t.r(64, 64, -12, 1, P.soil1); }, OL);
  b.r(68, 54, 22, 2, P.cream); for (let x = 69; x < 89; x += 2) b.p(x, 54, P.ink);
  return plate(b, (g) => {
    F(g, 40, 84, CAST.poor, { s: 1.7, dir: 1, hairStyle: "short", front: [52, 66], back: [50, 68], emo: "open" });
    [[108, 84], [118, 80], [126, 78]].forEach(([x, y], i) => F(g, x, y, CAST.water, { s: 1.2 - i * .05, dir: -1, emo: "closed", hair: P.ink, front: [x - 4, y - 8], hold: bucket })); }); };

EVNOTE.diario = { scene: "Bajo la plataforma del Santuario, con el agua por las rodillas, Orilla lee un cuaderno envuelto en hule, manchado de barro.", hidden: "Junto a un pilar hay una piedra plana fuera de su sitio y un hueco en el fango." };
EVSC.diario = () => { const b = new Pic(EW, EH); lakeBack(b, { water: 60, waterEnd: 96 });
  b.layer((t) => { t.r(0, 0, EW, 14, P.soil1); t.r(0, 14, EW, 3, P.soil0); for (let x = 0; x < EW; x += 12) t.r(x, 0, 1, 14, P.soil0);
    [8, 46, 84, 118].forEach((x) => { t.r(x, 17, 5, 79, P.soil0); t.r(x, 17, 1, 79, P.soil2); }); }, OL);
  for (let y = 0; y < 60; y++) for (let x = 0; x < EW; x++) { const c = b.g(x, y); if (c) b.p(x, y, mix(c, P.sea0, .3)); }
  for (let x = 0; x < EW; x += 3) if ((x * 7) % 5 < 3) b.p(x, 16, mix(P.sea3, P.cream, .4));
  b.layer((t) => { t.e(100, 74, 6, 2, P.plum2); t.r(94, 68, 10, 3, P.plum3); }, OL);
  light(b, 60, 40, 60, 30, P.sea3, .2, 4);
  return plate(b, (g) => { F(g, 62, 82, CAST.orilla, { s: 1.8, front: [66, 66], back: [56, 66], emo: "sad",
    hold: (q, x, y) => HD.shape(q, (z) => z.rect(x - 1, y - 1.6, 3.6, 2.8), { fill: P.soil1, shade: P.soil0, lw: .3 }) });
    for (let i = 0; i < 3; i++) HD.stroke(g, (z) => { z.moveTo(52 + i * 7, 82 - i % 2); z.lineTo(56 + i * 7, 82 - i % 2); }, P.cream, .4); }); };

EVNOTE.cara = { scene: "Un brazo quieto del Lago. En el agua se refleja una muchacha con un pañuelo rojo que te llama. En la orilla no hay nadie.", hidden: "El reflejo tiene las manos rojas de calor, como las de alguien que trabaja en una forja." };
EVSC.cara = () => { const b = new Pic(EW, EH); lakeBack(b, { water: 40, waterEnd: 96 });
  b.poly([[0, 40], [0, 22], [10, 18], [22, 26], [28, 40]], mix(P.moss1, P.sea1, .4)); b.poly([[100, 40], [110, 24], [128, 20], [128, 40]], mix(P.moss1, P.sea1, .4));
  for (let y = 40; y < 62; y++) for (let x = 0; x < EW; x++) { if ((x < 28 && y < 40 + (28 - x) * .7) || (x > 100 && y < 40 + (x - 100) * .8)) b.p(x, y, mix(P.moss0, P.sea1, .5)); }
  return plate(b, (g) => {
    g.save(); g.translate(0, 2 * 42); g.scale(1, -1); F(g, 64, 42, CAST.ola, { s: 1.8, emo: "happy", front: [72, 34] }); g.restore();
    HD.creature(g, "lumo", 22, 92, { s: 1.3, emo: "o" }); }); };

EVNOTE.flotan = { scene: "El agua ha vuelto al campamento del Arroyo. Las barcas-casa flotan, torcidas, con sus cuerdas de colores, y las Mareas lo celebran en el agua. Marejada mira el Lago desde la punta de una barca.", hidden: "Muy al fondo, bajo el agua oscura, se adivina algo enorme y pálido con los ojos cerrados." };
EVSC.flotan = () => { const b = new Pic(EW, EH); lakeBack(b, { water: 46, waterEnd: 96 });
  b.e(66, 88, 26, 5, mix(P.sea0, P.fog, .18)); b.e(64, 88, 6, 1, P.sea1); b.e(72, 88, 4, 1, P.sea1);
  houseBoat(b, 4, 66, 40, { rope: P.moss3, ropeLen: 12 }); houseBoat(b, 56, 62, 36, { cabin: mix(P.rose2, P.cream, .4), roof: P.rose0, rope: P.ember3, ropeLen: 10 }); houseBoat(b, 98, 68, 30, { cabin: mix(P.fog, P.sea3, .3), roof: P.plum2 });
  [[30, 78], [48, 82], [90, 80]].forEach(([x, y]) => { b.e(x, y, 5, 1.2, P.cream); });
  return plate(b, (g) => {
    F(g, 120, 62, CAST.marejada, { s: 1.25, dir: -1, emo: "closed" });
    [[30, 78], [48, 82], [90, 80]].forEach(([x, y], i) => F(g, x, y, i === 1 ? kid(CAST.water) : CAST.water, { s: 1.1, pose: "kneel", dir: i % 2 ? -1 : 1, emo: "happy", hair: P.ink, front: [x + 4, y - 14], back: [x - 4, y - 14] })); }); };
/* ================= Event scenes: Cuevas del Eco ================= */
// a cave: flat rock bands, a far arch of lighter stone, the floor in three tones
function caveBack(b, o = {}) {
  OL = P.ink;
  b.r(0, 0, EW, EH, mix(P.soil0, P.ink, .3));
  band(b, 0, 0, EW, 74, mix(P.soil0, P.ink, .45), mix(P.soil1, P.plum1, .3), 6, mix(P.soil1, P.soil2, .3));
  // far arch
  const ax = o.arch == null ? 64 : o.arch;
  if (ax !== false) { b.e(ax, 54, 26, 30, mix(P.soil0, P.ink, .2)); b.e(ax, 54, 20, 25, mix(P.soil1, P.plum2, .35)); b.r(ax - 26, 54, 52, 22, mix(P.soil0, P.ink, .2)); b.r(ax - 20, 54, 40, 22, mix(P.soil1, P.plum2, .35)); haze(b, 38, 72, mix(P.plum2, P.soil2, .4), .35); }
  // ceiling teeth
  const r = rng(o.seed || 51); for (let x = 0; x < EW; x += 7 + Math.floor(r() * 5)) { const h = 4 + Math.floor(r() * 9); b.poly([[x, 0], [x + 5, 0], [x + 2, h]], mix(P.soil0, P.ink, .5)); }
  // side walls
  b.poly([[0, 0], [22, 0], [16, 30], [20, 60], [10, 80], [0, 80]], mix(P.soil0, P.ink, .35)); b.poly([[128, 0], [104, 0], [112, 28], [106, 58], [118, 80], [128, 80]], mix(P.soil0, P.ink, .35));
  for (let y = 8; y < 76; y += 9) { b.r(2, y, 10, 1, mix(P.soil1, P.soil0, .5)); b.r(114, y + 4, 12, 1, mix(P.soil1, P.soil0, .5)); }
}
function caveFloor(b, y0, o = {}) { band(b, 0, y0, EW, EH - y0, mix(P.soil1, P.plum2, .25), P.soil0, 4);
  const r = rng(o.seed || 61); for (let i = 0; i < 22; i++) { const x = Math.floor(r() * EW), y = y0 + 2 + Math.floor(r() * (EH - y0 - 3)); b.r(x, y, 3 + (i % 3) * 2, 1, mix(P.soil1, P.soil2, .5)); if (i % 4 === 0) b.r(x + 1, y + 1, 3, 1, mix(P.soil0, P.ink, .3)); } }
// a carved wall: rows of short verse marks, a new crack through them
function verses(b, x0, y0, x1, y1, o = {}) { const r = rng(o.seed || 3);
  for (let y = y0; y < y1; y += 4) { let x = x0 + Math.floor(r() * 4); while (x < x1 - 3) { const w = 2 + Math.floor(r() * 5); b.r(x, y, Math.min(w, x1 - x), 1, o.col || mix(P.soil2, P.fog, .3)); x += w + 2; } }
  if (o.crack) { let x = o.crack, y = y0 - 4; while (y < y1 + 6) { const nx = x + Math.floor(r() * 5) - 2; b.l(x, y, nx, y + 4, P.ink); x = nx; y += 4; } }
}
function wallLamp(b, x, y, lit = true) { b.layer((t) => { t.r(x - 1, y, 3, 2, P.soil0); t.r(x - 2, y - 4, 5, 4, P.plum2); t.r(x - 1, y - 3, 3, 2, lit ? P.ember3 : P.soil1); }, OL); if (lit) light(b, x, y - 2, 16, 14, P.ember3, .35, 4); }
const pick = (q, x, y) => { HD.stroke(q, (z) => { z.moveTo(x, y + 4); z.lineTo(x + 1, y - 6); }, P.soil1, .6); HD.stroke(q, (z) => { z.moveTo(x - 3, y - 5); z.quadraticCurveTo(x + 1, y - 8, x + 5, y - 5); }, P.mist, .7); };

EVNOTE.sala = { scene: "La Sala de los Ecos: paredes cubiertas de versos grabados en todas las letras del valle y una grieta nueva que las cruza de arriba abajo. Sordina, una peregrina del Cielo, copia versos en un rollo.", hidden: "Junto a la grieta, uno de los versos se ha desprendido entero y está roto en el suelo." };
EVSC.sala = () => { const b = new Pic(EW, EH); caveBack(b, { arch: false, seed: 4 });
  b.layer((t) => { t.e(64, 40, 56, 44, mix(P.soil1, P.plum2, .3)); }, OL);
  verses(b, 18, 10, 110, 64, { crack: 78, seed: 9 });
  light(b, 64, 30, 40, 26, mix(P.fog, P.sea3, .5), .2, 4);
  caveFloor(b, 70, { seed: 3 });
  b.layer((t) => { t.r(84, 82, 8, 3, P.soil2); t.r(93, 84, 5, 2, P.soil2); }, OL);
  return plate(b, (g) => { F(g, 46, 92, CAST.heights, { s: 1.8, pose: "kneel", front: [56, 80], back: [52, 82], emo: "open",
    hold: (q, x, y) => HD.shape(q, (z) => z.rect(x - .4, y - .6, 8, 3), { fill: P.cream, shade: P.fog, lw: .3 }) }); }); };

EVNOTE.tercero = { scene: "Un túnel viejo de las Cuevas del Eco, ancho y liso, con una curva perfecta. Un Ecolito espera en una repisa a ver qué dices.", hidden: "En la curva hay una raya corta grabada a la altura de la mano: «aquí sigue alguien»." };
EVSC.tercero = () => { const b = new Pic(EW, EH); OL = P.ink;
  b.r(0, 0, EW, EH, mix(P.soil0, P.ink, .4));
  for (let i = 0; i < 6; i++) { const k = i / 5; b.e(70 + k * 10, 50, 64 - k * 50, 50 - k * 38, mix(mix(P.soil1, P.plum2, .3), P.ink, .55 - k * .45)); }
  b.e(80, 50, 10, 10, mix(P.plum3, P.fog, .3));
  caveFloor(b, 76, { seed: 8 });
  b.layer((t) => { t.r(16, 52, 22, 3, P.soil2); t.r(16, 52, 22, 1, P.soil3); }, OL);
  b.r(100, 58, 1, 4, P.fog);
  return plate(b, (g) => { HD.creature(g, "ecolito", 27, 52, { s: 1.3, emo: "o" }); HD.creature(g, "lumo", 60, 90, { s: 1.4, emo: "happy" }); }); };

EVNOTE.ramo = { scene: "La puerta tallada de la casa de la Guardiana. Basalto deja un ramo de flores secas en el suelo, junto a los de otras semanas.", hidden: "La tarjeta del ramo dice, con letra grande y torpe: «Para Grava, que no está»." };
EVSC.ramo = () => { const b = new Pic(EW, EH); caveBack(b, { arch: false, seed: 13 });
  b.layer((t) => { t.r(46, 22, 40, 52, mix(P.soil1, P.plum2, .3)); t.e(66, 24, 20, 12, mix(P.soil1, P.plum2, .3)); t.r(54, 30, 24, 44, P.ink); t.e(66, 32, 12, 8, P.ink); t.r(56, 32, 20, 42, mix(P.plum1, P.soil0, .4));
    for (let y = 36; y < 72; y += 8) t.r(58, y, 16, 1, mix(P.plum2, P.soil1, .3)); }, OL);
  verses(b, 48, 18, 84, 24, { col: mix(P.soil2, P.cream, .3), seed: 2 });
  caveFloor(b, 74, { seed: 5 });
  [[48, 78], [56, 79], [76, 79], [84, 78], [66, 80]].forEach(([x, y], i) => { b.l(x, y, x - 2, y - 5, P.moss1); b.l(x, y, x + 2, y - 5, P.moss1); b.e(x - 2, y - 6, 1.6, 1.4, i === 4 ? P.rose2 : mix(P.rose1, P.soil2, .5)); b.e(x + 2, y - 6, 1.6, 1.4, i === 4 ? P.butter : mix(P.butter, P.soil2, .5)); });
  wallLamp(b, 36, 40); wallLamp(b, 96, 40);
  return plate(b, (g) => { F(g, 100, 92, CAST.basalto, { s: 1.9, dir: -1, pose: "kneel", front: [88, 80], back: [104, 80], emo: "sad" }); }); };

EVNOTE.tunel = { scene: "Un túnel nuevo, estrecho y mal apuntalado, corta una cueva vieja. Pirita pica la roca a la luz de un farol con el sello de Albor. Del techo cae arena.", hidden: "En la pared, detrás de la última viga, una grieta deja ver algo que se mueve." };
EVSC.tunel = () => { const b = new Pic(EW, EH); OL = P.ink;
  b.r(0, 0, EW, EH, mix(P.soil0, P.ink, .5));
  b.poly([[20, 96], [30, 20], [98, 20], [108, 96]], mix(P.soil1, P.soil0, .3)); b.poly([[40, 80], [48, 34], [80, 34], [88, 80]], mix(P.soil0, P.ink, .2));
  [[30, 22, 98], [44, 36, 84]].forEach(([y0, y, x1]) => 0);
  b.layer((t) => { [[30, 96, 22], [100, 96, 22], [46, 82, 34], [82, 82, 34]].forEach(([x, y1, y0]) => t.r(x - 2, y0, 4, y1 - y0, P.soil2)); t.r(26, 20, 78, 4, P.soil2); t.r(42, 32, 44, 3, P.soil2); }, OL);
  b.r(28, 23, 2, 2, P.soil3);
  for (let i = 0; i < 12; i++) b.p(60 + (i * 7) % 18, 26 + i * 4, mix(P.soil2, P.butter, .4));
  b.layer((t) => { t.r(70, 44, 6, 7, P.ink); t.r(71, 45, 4, 5, P.butter); t.r(70, 42, 6, 2, P.ember1); }, OL);
  light(b, 73, 48, 34, 30, P.ember3, .35, 5);
  b.l(96, 50, 99, 60, P.ink); b.l(99, 60, 97, 68, P.ink); b.p(98, 58, P.fog);
  return plate(b, (g) => { F(g, 58, 90, CAST.miner, { s: 1.8, dir: 1, hairStyle: "bun", hair: P.ink, front: [70, 62], back: [60, 64], emo: "open", hold: pick }); }); };

EVNOTE.lamparas = { scene: "Un túnel viejo con lámparas de aceite en las paredes. Sebo, el lamparero, rellena una y se para a escuchar el eco.", hidden: "Una de las lámparas apagadas tiene un nombre de mujer grabado debajo." };
EVSC.lamparas = () => { const b = new Pic(EW, EH); caveBack(b, { arch: 70, seed: 22 });
  caveFloor(b, 74, { seed: 9 });
  wallLamp(b, 24, 44); wallLamp(b, 50, 50, false); wallLamp(b, 92, 46); wallLamp(b, 112, 40, false);
  b.r(46, 52, 8, 1, mix(P.soil2, P.fog, .4));
  return plate(b, (g) => { F(g, 80, 92, CAST.poor, { s: 1.75, dir: 1, hairStyle: "none", beard: P.fog, cloth: [P.soil2, P.soil1, P.soil3], front: [88, 52], back: [76, 72], emo: "closed",
    hold: (q, x, y) => HD.shape(q, (z) => z.rect(x - 1, y - 1, 3, 3.4), { fill: P.plum3, shade: P.plum2, lw: .3 }) }); }); };

EVNOTE.grieta = { scene: "La grieta del este, tan estrecha que hay que pasar de lado. Sale aire caliente y dorado de debajo del Prado. Junto a la entrada hay algo grabado con letra grande y torpe.", hidden: "En el polvo del suelo hay huellas anchas, de piedra, que vuelven hacia dentro." };
EVSC.grieta = () => { const b = new Pic(EW, EH); caveBack(b, { arch: false, seed: 33 });
  b.poly([[58, 0], [72, 0], [70, 30], [76, 56], [70, 80], [60, 80], [64, 54], [56, 28]], P.ink);
  b.poly([[61, 4], [69, 4], [67, 30], [72, 56], [67, 78], [63, 78], [66, 54], [60, 28]], mix(P.ember2, P.butter, .4));
  light(b, 66, 44, 40, 40, P.ember3, .4, 5);
  verses(b, 26, 40, 50, 56, { col: mix(P.soil2, P.cream, .35), seed: 6 }); b.r(30, 60, 6, 1, P.cream);
  caveFloor(b, 78, { seed: 12 });
  [[70, 86], [78, 90], [66, 92]].forEach(([x, y]) => b.layer((t) => t.e(x, y, 3, 1.4, P.plum2), OL));
  return plate(b, (g) => { HD.creature(g, "pebb", 100, 92, { s: 1.4, emo: "o", dir: -1 }); }); };

EVNOTE.nombres = { scene: "Un rincón de la Sala de los Ecos con una lista de nombres escrita en la pared con letra lenta. Arriba pone «Voces apagadas». Los últimos nombres son más grandes y más torcidos.", hidden: "Al pie de la pared hay polvo de piedra fresco, como si alguien acabara de escribir." };
EVSC.nombres = () => { const b = new Pic(EW, EH); caveBack(b, { arch: false, seed: 41 });
  b.layer((t) => { t.r(28, 10, 72, 62, mix(P.soil1, P.plum2, .25)); }, OL);
  b.r(46, 14, 36, 2, mix(P.fog, P.cream, .4));
  for (let i = 0; i < 9; i++) { const y = 22 + i * 5 + Math.floor(i * i * .1), w = 18 + (i * 7) % 20; b.r(36 + (i > 6 ? 2 : 0), y, w, 1 + (i > 6 ? 1 : 0), mix(P.fog, P.soil2, i * .06)); }
  light(b, 64, 44, 34, 30, P.ember3, .15, 4);
  caveFloor(b, 72, { seed: 7 });
  b.r(60, 72, 14, 1, mix(P.fog, P.soil2, .4));
  return plate(b, (g) => { F(g, 98, 92, CAST.poor, { s: 1.8, dir: -1, hat: null, hairStyle: "short", front: [86, 62], emo: "open" }); HD.creature(g, "lumo", 112, 70, { s: 1.1, emo: "o", dir: -1 }); }); };

EVNOTE.mapas = { scene: "En la Sala de los Ecos, Lindero, agrimensor de Albor, mide las paredes con una cuerda de nudos. A sus pies hay un rollo de mapas con el sello de Albor.", hidden: "El mapa de arriba del rollo está firmado con la marca del Primer Picador." };
EVSC.mapas = () => { const b = new Pic(EW, EH); caveBack(b, { arch: false, seed: 4 });
  b.layer((t) => { t.e(64, 40, 56, 44, mix(P.soil1, P.plum2, .3)); }, OL);
  verses(b, 18, 10, 110, 64, { crack: 40, seed: 9 });
  caveFloor(b, 70, { seed: 3 });
  b.l(20, 34, 72, 58, P.cream); for (let i = 0; i < 6; i++) b.p(24 + i * 8, 36 + Math.round(i * 8 * 24 / 52), P.soil2);
  b.layer((t) => { t.r(88, 82, 18, 5, P.cream); t.e(88, 84.5, 2.5, 2.5, P.fog); t.e(97, 84, 2, 1.6, P.ember3); }, OL);
  return plate(b, (g) => { F(g, 76, 90, CAST.albor, { s: 1.85, dir: -1, front: [70, 60], back: [82, 64], emo: "happy" }); }); };

EVNOTE.semillas = { scene: "La casa de la Guardiana, llena de piedras grandes y quietas que antes eran Grava. Basalto, sentado entre ellas, separa semillas en montoncitos.", hidden: "Una de las semillas es negra y brilla un poco, apartada de las demás." };
EVSC.semillas = () => { const b = new Pic(EW, EH); caveBack(b, { arch: false, seed: 61 });
  b.layer((t) => { [[22, 62, 18, 16], [44, 52, 14, 22], [104, 60, 20, 18], [86, 50, 12, 14]].forEach(([x, y, rx, ry]) => { t.e(x, y, rx, ry, mix(P.plum2, P.soil1, .4)); t.e(x - rx * .3, y - ry * .4, rx * .4, ry * .3, mix(P.plum3, P.soil2, .4)); }); }, OL);
  caveFloor(b, 76, { seed: 4 });
  [[46, 84], [54, 86], [62, 84], [70, 86]].forEach(([x, y], i) => { for (let k = 0; k < 5; k++) b.p(x + (k % 3), y - Math.floor(k / 3), [P.butter, P.moss3, P.soil3, P.rose2][i]); });
  b.p(80, 86, SAP.sheen); b.p(81, 86, P.ink); light(b, 80, 86, 5, 3, SAP.sheen, .3, 3);
  wallLamp(b, 64, 30);
  return plate(b, (g) => { F(g, 98, 92, CAST.basalto, { s: 1.85, dir: -1, pose: "sit", front: [84, 84], emo: "closed" }); }); };
/* ================= Event scenes: common path events ================= */
// a neutral trail: soft hills, a few trees, a dirt path; works for any zone
function trailBack(b, o = {}) {
  OL = P.ink;
  const n = o.night, dusk = o.dusk;
  b.r(0, 0, EW, EH, P.moss1);
  if (n) { band(b, 0, 0, EW, 56, P.ink, mix(P.sea0, P.plum1, .5), 7, mix(P.plum1, P.sea1, .5)); b.stars(0, 0, EW, 34, 30, o.seed || 2); }
  else if (dusk) band(b, 0, 0, EW, 56, mix(P.sea1, P.plum2, .4), P.rose1, 7, P.ember3);
  else band(b, 0, 0, EW, 56, mix(P.sea3, P.cream, .2), P.sea4, 7, mix(P.cream, P.butter, .3));
  const h1 = n ? mix(P.sea0, P.moss0, .5) : dusk ? mix(P.plum2, P.moss1, .4) : mix(P.moss2, P.sea2, .45);
  const h2 = n ? P.moss0 : dusk ? mix(P.plum1, P.moss0, .5) : mix(P.moss2, P.moss1, .4);
  b.poly([[0, 56], [0, 38], [26, 30], [50, 38], [78, 28], [104, 36], [128, 30], [128, 56]], h1);
  haze(b, 34, 56, n ? mix(P.sea1, P.plum1, .4) : dusk ? P.rose2 : mix(P.cream, P.sea4, .4), .3);
  b.poly([[0, 60], [0, 46], [40, 42], [74, 48], [128, 42], [128, 60]], h2);
  band(b, 0, 58, EW, 38, n ? mix(P.moss0, P.sea0, .3) : dusk ? mix(P.moss1, P.plum2, .3) : P.moss2, n ? P.moss0 : P.moss1, 4);
  if (o.path !== false) b.poly([[54, 58], [70, 58], [96, 96], [28, 96]], n ? mix(P.soil0, P.moss0, .3) : mix(P.soil2, P.soil3, .3));
  const r = rng(o.seed || 71); for (let i = 0; i < 22; i++) { const x = Math.floor(r() * EW), y = 62 + Math.floor(r() * 32); b.r(x, y, 2, 1, n ? P.moss1 : P.moss3); }
}
function tree(b, x, gy, h, o = {}) {
  b.layer((t) => { t.r(x - 2, gy - h, 4, h, P.soil0); t.r(x - 2, gy - h, 1, h, P.soil1);
    t.e(x, gy - h - 4, 12, 9, o.leaf || P.moss1); t.e(x - 6, gy - h + 2, 8, 6, o.leaf || P.moss1); t.e(x + 6, gy - h + 1, 8, 6, o.leaf || P.moss1);
    t.e(x - 3, gy - h - 7, 6, 4, o.leaf2 || mix(P.moss2, P.moss3, .3)); }, OL);
}
function rock(b, x, y, rx, ry, c = P.plum2) { b.layer((t) => { t.e(x, y, rx, ry, c); t.r(x - rx, y, rx * 2, ry, c); t.e(x - rx * .3, y - ry * .4, rx * .45, ry * .35, mix(c, P.fog, .3)); }, OL); }
function fire(b, x, y) {
  b.layer((t) => { for (let i = 0; i < 6; i++) t.e(x - 7 + i * 2.8, y + 1, 1.8, 1.4, P.plum2); t.r(x - 6, y - 2, 12, 2, P.soil0); t.l(x - 5, y - 1, x + 5, y - 3, P.soil1); }, OL);
  b.poly([[x - 4, y - 2], [x, y - 12], [x + 4, y - 2]], P.ember2); b.poly([[x - 2, y - 2], [x, y - 8], [x + 2, y - 2]], P.ember4); b.p(x, y - 3, P.butter);
  light(b, x, y - 4, 40, 22, P.ember3, .4, 5);
}

EVNOTE.fogata = { scene: "Una fogata recién dejada al borde del camino, de noche: brasas tibias, un tronco para sentarse y un cazo abollado colgado de un palo. Tus criaturas ya se han tumbado.", hidden: "En el suelo hay una flecha dibujada: la señal de los viajeros para «agua cerca, sigue recto»." };
EVSC.fogata = () => { const b = new Pic(EW, EH); trailBack(b, { night: true, path: false, seed: 5 });
  tree(b, 16, 60, 18, { leaf: P.moss0, leaf2: mix(P.moss0, P.moss1, .5) }); tree(b, 112, 58, 22, { leaf: P.moss0, leaf2: mix(P.moss0, P.moss1, .5) });
  b.layer((t) => { t.r(28, 78, 26, 6, P.soil1); t.e(28, 81, 3, 3, P.soil2); t.e(28, 81, 1.5, 1.5, P.soil1); }, OL);
  b.l(72, 60, 72, 82, P.soil1); b.l(72, 60, 82, 66, P.soil1); b.layer((t) => { t.e(82, 70, 4, 3, P.plum2); t.r(78, 66, 8, 4, P.plum2); }, OL);
  fire(b, 66, 84);
  b.l(96, 88, 108, 88, P.soil3); b.l(108, 88, 105, 86, P.soil3); b.l(108, 88, 105, 90, P.soil3);
  return plate(b, (g) => { HD.creature(g, "lumo", 44, 92, { s: 1.3, emo: "sleep" }); HD.creature(g, "pebb", 88, 92, { s: 1.4, emo: "happy", dir: -1 }); }); };

EVNOTE.viajero = { scene: "Retal, un viajero con un abrigo de retales de todos los pueblos, asa castañas en una fogata pequeña al atardecer.", hidden: "Entre los retales del abrigo hay uno gris de la Sombra cosido justo al lado de uno amarillo de la Luz." };
EVSC.viajero = () => { const b = new Pic(EW, EH); trailBack(b, { dusk: true, seed: 9 });
  tree(b, 104, 62, 24, { leaf: mix(P.moss1, P.plum1, .3) });
  fire(b, 72, 86);
  b.layer((t) => { t.r(12, 76, 20, 8, P.soil1); t.r(14, 72, 6, 4, P.rose1); t.r(20, 70, 8, 6, P.sea2); t.r(26, 73, 5, 3, P.butter); }, OL);
  return plate(b, (g) => { F(g, 50, 90, CAST.poor, { s: 1.8, pose: "sit", hairStyle: "short", hair: P.fog, beard: P.fog, cloth: [P.plum2, P.sea2, P.ember3], hat: { k: "wide", c: [P.soil1, P.soil0] }, front: [64, 76], emo: "happy",
    hold: (q, x, y) => HD.stroke(q, (z) => { z.moveTo(x, y); z.lineTo(x + 6, y + 4); }, P.soil1, .45) }); }); };

EVNOTE.cofre = { scene: "Un cofre de madera con refuerzos de hierro, medio enterrado junto a una roca. Alrededor, la tierra está removida.", hidden: "En la tapa está grabada una marca de viajero: un círculo con una raya, «para quien lo necesite»." };
EVSC.cofre = () => { const b = new Pic(EW, EH); trailBack(b, { seed: 13 });
  tree(b, 20, 60, 20); rock(b, 82, 72, 18, 12);
  b.e(64, 82, 22, 5, mix(P.soil1, P.soil0, .3)); for (let i = 0; i < 10; i++) b.e(46 + i * 4, 80 + (i % 3), 2, 1, P.soil2);
  b.layer((t) => { t.r(52, 70, 24, 12, P.soil1); t.r(52, 70, 24, 3, P.soil2); t.r(52, 70, 2, 12, P.plum2); t.r(74, 70, 2, 12, P.plum2); t.r(52, 75, 24, 1, P.plum2); t.r(62, 74, 4, 4, P.plum3); t.p(63, 76, P.ink); }, OL);
  b.e(64, 71, 2, 1, P.fog); b.p(64, 71, P.soil1);
  return plate(b, (g) => { HD.creature(g, "fizz", 100, 92, { s: 1.4, emo: "o", dir: -1 }); }); };

EVNOTE.manantial = { scene: "Un manantial pequeño entre rocas cubiertas de musgo, tan claro que solo se ve por el temblor del agua. Alrededor crecen flores que no hay en ningún otro sitio del camino.", hidden: "En el fondo, entre los guijarros, brillan monedas antiguas de muchos pueblos." };
EVSC.manantial = () => { const b = new Pic(EW, EH); trailBack(b, { path: false, seed: 17 });
  tree(b, 106, 58, 26); rock(b, 40, 64, 16, 10, mix(P.plum2, P.moss1, .3)); rock(b, 70, 62, 12, 9, mix(P.plum2, P.moss1, .3));
  b.layer((t) => { t.e(40, 58, 12, 3, P.moss2); t.e(70, 56, 9, 2.4, P.moss2); }, OL);
  b.r(54, 60, 4, 16, mix(P.sea3, P.cream, .4)); b.r(55, 60, 1, 16, P.cream);
  b.layer((t) => { t.e(56, 84, 26, 7, P.sea2); t.e(52, 83, 10, 2, P.sea3); }, P.moss0);
  [[46, 86], [62, 85], [56, 88]].forEach(([x, y]) => b.p(x, y, P.ember3));
  [[24, 80], [30, 86], [88, 82], [94, 88], [84, 90]].forEach(([x, y]) => { b.l(x, y, x, y - 4, P.moss3); b.e(x, y - 5, 1.6, 1.4, P.cream); b.p(x, y - 5, P.sea3); });
  light(b, 56, 80, 30, 14, P.sea4, .2, 4);
  return plate(b, (g) => { HD.creature(g, "brotin", 104, 90, { s: 1.4, emo: "happy", dir: -1 }); }); };

EVNOTE.mochila = { scene: "Una mochila de viaje colgada de una rama a la altura de la mano, con un nudo cuidadoso. En el tronco hay muescas recientes.", hidden: "Asoma de la mochila la esquina de un sobre con un nombre escrito." };
EVSC.mochila = () => { const b = new Pic(EW, EH); trailBack(b, { seed: 21 });
  b.layer((t) => { t.r(80, 10, 8, 74, P.soil0); t.r(80, 10, 2, 74, P.soil1); t.l(84, 40, 64, 34, P.soil0); t.l(84, 41, 64, 35, P.soil0); t.e(84, 8, 22, 12, P.moss1); t.e(70, 16, 14, 8, P.moss1); t.e(96, 14, 12, 8, P.moss1); }, OL);
  [[86, 50], [86, 44], [86, 38]].forEach(([x, y]) => b.r(x - 2, y, 3, 1, P.soil3));
  b.l(68, 36, 68, 44, P.soil3);
  b.layer((t) => { t.r(62, 44, 12, 14, P.ember1); t.r(62, 44, 12, 4, P.ember0); t.r(64, 50, 8, 5, mix(P.ember1, P.soil1, .3)); t.r(66, 42, 4, 2, P.cream); }, OL);
  return plate(b, (g) => { HD.creature(g, "remolin", 34, 88, { s: 1.4, emo: "o" }); }); };

EVNOTE.tormenta = { scene: "Llueve a cántaros. Bajo un saliente de roca, una criatura salvaje empapada tiembla y te mira: no tiene adónde ir, y tú tampoco.", hidden: "Junto a la criatura hay un nido de hojas secas: este saliente es su casa." };
EVSC.tormenta = () => { const b = new Pic(EW, EH); trailBack(b, { path: false, seed: 25 });
  tint(b, 0, 0, EW, EH, P.sea0, .45);
  b.layer((t) => { t.poly([[0, 20], [92, 26], [104, 32], [86, 36], [0, 38]], P.plum2); t.r(0, 36, 30, 60, P.plum2); t.r(0, 36, 30, 1, P.plum1); }, OL);
  b.r(30, 38, 76, 42, mix(P.plum1, P.ink, .2)); band(b, 30, 80, 76, 16, mix(P.soil0, P.plum1, .3), P.soil0, 3);
  b.e(84, 82, 8, 2, P.soil2);
  for (let i = 0; i < 90; i++) { const x = (i * 37) % EW, y = (i * 53) % EH; if (!(x > 30 && x < 104 && y > 36)) b.l(x, y, x - 2, y + 5, mix(P.sea3, P.cream, .3)); }
  return plate(b, (g) => { HD.creature(g, "bostezo", 84, 82, { s: 1.4, emo: "sad", dir: -1 }); F(g, 46, 92, CAST.poor, { s: 1.6, pose: "sit", hat: null, hairStyle: "short", emo: "open" }); }); };

EVNOTE.altar = { scene: "Un altar pequeño de piedra al borde del camino, con la figura gastada y sin cara de una mujer cantando. Alguien le ha dejado flores, una vela y una moneda.", hidden: "En la base hay cuatro inscripciones en cuatro letras distintas. Alguien ha intentado borrar la última." };
EVSC.altar = () => { const b = new Pic(EW, EH); trailBack(b, { dusk: true, seed: 29 });
  tree(b, 18, 62, 22, { leaf: mix(P.moss1, P.plum1, .3) });
  b.layer((t) => { t.r(80, 72, 30, 10, P.plum2); t.r(80, 72, 30, 1, P.plum3); t.r(86, 46, 18, 26, P.plum2); t.poly([[84, 46], [95, 38], [106, 46]], P.plum1);
    t.e(95, 52, 4, 4, P.mist); t.poly([[90, 70], [95, 56], [100, 70]], P.mist); t.l(95, 58, 90, 54, P.mist); }, OL);
  for (let y = 74; y < 81; y += 2) b.r(84, y, 22, 1, mix(P.plum3, P.fog, .3));
  b.layer((t) => { t.r(82, 68, 2, 4, P.cream); }, OL); b.p(82, 66, P.ember4); light(b, 82, 66, 14, 10, P.ember3, .35, 4);
  [[106, 70], [109, 69]].forEach(([x, y]) => { b.e(x, y, 1.4, 1.2, P.rose2); }); b.p(100, 71, P.ember3);
  return plate(b, (g) => { F(g, 56, 92, CAST.poor, { s: 1.7, dir: 1, hat: null, hairStyle: "bun", hair: P.soil0, emo: "closed" }); HD.creature(g, "lumo", 40, 90, { s: 1.1, emo: "happy" }); }); };

EVNOTE.herido = { scene: "En la cuneta, una criatura salvaje tiene una pata atrapada en una trampa de lazo y enseña los dientes.", hidden: "La trampa lleva una chapa con un número: alguien vive de esto y volverá a mirarla." };
EVSC.herido = () => { const b = new Pic(EW, EH); trailBack(b, { seed: 33 });
  tree(b, 108, 60, 24);
  b.layer((t) => { t.e(40, 84, 30, 8, mix(P.moss1, P.soil0, .4)); }, OL);
  b.r(56, 74, 2, 10, P.soil1); b.l(57, 76, 46, 84, P.fog); b.r(57, 80, 3, 2, P.mist);
  for (let i = 0; i < 12; i++) b.l(14 + i * 5, 80, 14 + i * 5 - 1, 76, P.moss3);
  return plate(b, (g) => { HD.creature(g, "espinardo", 40, 90, { s: 2, emo: "sad" }); }); };

EVNOTE.alforja = { scene: "Doña Alforja viene por el camino tirando de un burro cargado de bolsas con carteles escritos a mano: «Remedios», «Hilo», «Cosas que no sabías que necesitabas».", hidden: "De una de las bolsas asoma un ovillo de lana roja." };
EVSC.alforja = () => { const b = new Pic(EW, EH); trailBack(b, { seed: 37 });
  tree(b, 16, 60, 22); tree(b, 118, 58, 18);
  b.layer((t) => { // the donkey
    t.e(82, 70, 16, 8, P.plum3); t.r(68, 70, 28, 6, P.plum3); [[70], [76], [88], [94]].forEach(([x]) => t.r(x, 74, 3, 14, P.plum2));
    t.poly([[96, 68], [104, 58], [110, 60], [108, 66], [100, 72]], P.plum3); t.r(104, 52, 2, 7, P.plum2); t.r(107, 53, 2, 6, P.plum2); t.p(105, 61, P.ink); t.r(66, 70, 3, 8, P.plum2);
    t.r(72, 56, 12, 12, P.soil2); t.r(84, 58, 10, 10, P.ember1); t.r(76, 50, 10, 8, P.sea2); t.r(74, 60, 8, 3, P.cream); t.r(86, 62, 6, 2, P.cream); t.r(78, 52, 6, 2, P.cream);
    t.e(94, 58, 2, 2, P.rose0); }, OL);
  return plate(b, (g) => { F(g, 44, 90, CAST.poor, { s: 1.7, dir: 1, hairStyle: "bun", hair: P.fog, hat: { k: "scarf", c: [P.rose1, P.rose0] }, cloth: [P.soil2, P.soil1, P.soil3], front: [54, 72], emo: "happy" }); }); };

EVNOTE.brillo = { scene: "Una grieta estrecha y oscura entre dos rocas. Al fondo, algo brilla con el sol.", hidden: "Dentro de la grieta se adivina un nido de ramas lleno de botones, cucharas y trozos de vidrio." };
EVSC.brillo = () => { const b = new Pic(EW, EH); trailBack(b, { path: false, seed: 41 });
  rock(b, 44, 74, 28, 20); rock(b, 86, 72, 26, 22, mix(P.plum2, P.soil1, .3));
  b.poly([[62, 92], [64, 58], [68, 58], [70, 92]], P.ink);
  b.p(66, 80, P.cream); b.p(65, 80, P.butter); b.p(67, 80, P.butter); b.p(66, 79, P.butter); b.p(66, 81, P.butter); light(b, 66, 80, 8, 6, P.butter, .4, 3);
  return plate(b, (g) => { HD.creature(g, "fizz", 24, 92, { s: 1.3, emo: "o" }); }); };
const ART = {};
function art(id) { if (!SCENE[id]) return null; return ART[id] || (ART[id] = SCENE[id]()); }

/* ================= New card: 80 x 116 =================
   3 px material frame, type band (icon + rarity pips), scene window 66x50 (art 64x48 at 1:1),
   name plate and flavour box left as slots for the HTML text, A/P/S dots at the bottom. */
const CW = 80, CH = 116;
function card(id, gi = 0, o = {}) {
  const CT = typeof CARDTEXT !== "undefined" ? CARDTEXT : root.CARDTEXT, [, type] = EVS.CARD[id] || ["", (CT && CT[id] && CT[id].type) || "star"];
  const t = EVS.TYPE[type] || EVS.TYPE.star, gv = EVS.GRADE[gi] || EVS.GRADE[0];
  const c = canvas(CW, CH), g = c.getContext("2d");
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const night = t.day === false, star = t.day === null;
  px(1, 0, CW - 2, CH, P.ink); px(0, 1, CW, CH - 2, P.ink);
  px(1, 1, CW - 2, CH - 2, gv.mat[0]); px(2, 2, CW - 4, CH - 4, gv.mat[1]); px(3, 3, CW - 6, CH - 6, gv.mat[0]);
  const bg = night ? P.plum1 : star ? P.ink : P.cream;
  px(4, 4, CW - 8, CH - 8, bg);
  if (star) { const cols = [P.ember4, P.sea3, P.sea2, P.glim1];
    for (let i = 0; i < CW - 8; i++) { px(4 + i, 4, 1, 1, cols[(i >> 3) % 4]); px(4 + i, CH - 5, 1, 1, cols[((i >> 3) + 2) % 4]); }
    for (let i = 0; i < CH - 8; i++) { px(4, 4 + i, 1, 1, cols[((i >> 3) + 1) % 4]); px(CW - 5, 4 + i, 1, 1, cols[((i >> 3) + 3) % 4]); } }
  // type band
  px(5, 5, CW - 10, 11, t.ramp[1]); px(5, 15, CW - 10, 1, P.ink);
  g.drawImage(EVS.typeIcon(type), 6, 6);
  for (let i = 0; i < gv.pips; i++) { const x = CW - 10 - i * 5, y = 8; px(x + 1, y, 1, 1, gv.mat[1]); px(x, y + 1, 3, 1, gv.mat[1]); px(x + 1, y + 2, 1, 1, gv.mat[1]); px(x + 1, y + 1, 1, 1, P.cream); }
  // scene window (the art goes in after the frame is scaled up)
  px(6, 18, 68, 52, P.ink); px(7, 19, 66, 50, gv.mat[1]);
  const a = art(id);
  if (!a) { px(8, 20, 64, 48, night ? P.plum2 : P.fog); g.imageSmoothingEnabled = false; g.drawImage(EVS.cardArt(id), 24, 20, 32, 32); }
  // corner rivets in the frame material
  [[7, 19], [72, 19], [7, 68], [72, 68]].forEach(([x, y]) => px(x, y, P.cream));
  // name plate
  px(6, 72, 68, 11, P.ink); px(7, 73, 66, 9, night || star ? P.plum2 : P.butter);
  px(7, 73, 66, 1, night || star ? P.plum3 : P.cream);
  // flavour box
  px(6, 85, 68, 22, night || star ? P.plum2 : P.fog); px(7, 86, 66, 20, bg);
  // slot dots
  const slots = o.slot ? ["a", "p", "s"] : [];
  slots.forEach((s, i) => { const x = 31 + i * 7, on = s === o.slot; px(x, 109, 4, 4, P.ink); px(x + 1, 110, 2, 2, on ? t.sig : night || star ? P.plum2 : P.fog); });
  // Pacto: the split seam down the right edge of the window
  if (EVS.PACT[id]) { for (let y = 20; y < 68; y += 2) px(72, y, 1, 1, P.ember1); }
  const big = canvas(CW * K, CH * K), bg2 = big.getContext("2d");
  bg2.imageSmoothingEnabled = false; bg2.drawImage(c, 0, 0, CW * K, CH * K);
  if (a) bg2.drawImage(a, 8 * K, 20 * K);
  if (EVS.PACT[id]) { bg2.fillStyle = P.ink; bg2.fillRect(67 * K, 20 * K, 5 * K, 5 * K); bg2.fillStyle = P.ember1; bg2.fillRect(68 * K, 21 * K, 3 * K, 3 * K); bg2.fillStyle = P.ember4; bg2.fillRect(69 * K, 22 * K, K, K); }
  return big;
}

root.EVSCENE = { event: evArt, EVIDS: Object.keys(EVSC), EVNOTE, art, card, IDS: Object.keys(SCENE), AW, AH, CW, CH, K, Pic, SAP, HD, PL, hd, NOTE };
})(typeof window !== "undefined" ? window : globalThis);
