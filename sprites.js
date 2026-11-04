/* Evolvlings sprites: the 20 launch creatures, skill-card art and card-use animations.
   Glimmer-32 palette only (plus the Savia colours, which nothing here uses).
   Same technique as pixel.js: shaded ellipses rasterised on a small grid, 1 px ink outline,
   light from the top left, face drawn last. No image files.

   API (window.EVS):
     EVS.sprite(kind, n, st, sq, emo, dull) -> canvas (n+2)x(n+2). n = 16 | 24 | 32, st = 0..2, sq = frame A/B
     EVS.KINDS                                -> list of creature ids (same ids as MONS in rpg/data-mons.js)
     EVS.typeIcon(type)                       -> 9x9 canvas
     EVS.cardArt(cardId)                      -> 16x16 canvas (the art in the card window)
     EVS.card(cardId, gradeIdx, opts)         -> 56x84 canvas, full pixel card (frame by grade, art, type, pips)
     EVS.ANIM[cardId]                         -> { style, ... } how the card is used in combat
     EVS.fx(g, cardId, t, from, to, targets)  -> draws the effect layer of a card use at time t (0..1)
     EVS.pose(cardId, t)                      -> { dx, dy, sq, flash } attacker offset for that card use
*/
(function (root) {
"use strict";

/* ================= Palette ================= */
const P = {
  ink:"#1d1626", plum1:"#2e2440", plum2:"#4a3d5e", plum3:"#6e6283", mist:"#9d93ad", fog:"#d2cbd9", cream:"#fbf6ef",
  moss0:"#1f3b35", moss1:"#2f5e3f", moss2:"#4f8a46", moss3:"#86b85a", moss4:"#c4df7f",
  sea0:"#1f2f5c", sea1:"#2f5d96", sea2:"#3f93c4", sea3:"#7cc8e3", sea4:"#c8eef5",
  ember0:"#5c1f2e", ember1:"#a3343b", ember2:"#e0603f", ember3:"#f39a52", ember4:"#ffd57a",
  soil0:"#3d2a2a", soil1:"#6b4a3a", soil2:"#a07a55", soil3:"#d0ad7a", butter:"#fff0b8",
  rose0:"#7a3a6e", rose1:"#c25e9a", rose2:"#f4a6c4", glim0:"#8a5fc4", glim1:"#c7a6ff"
};
// 4-tone ramps: shadow, base, light, highlight
const R = {
  gold:[P.ember3,P.ember4,P.butter,P.cream], lilac:[P.glim0,P.glim1,P.fog,P.cream],
  stone:[P.plum3,P.mist,P.fog,P.cream], moss:[P.moss1,P.moss2,P.moss3,P.moss4],
  sky:[P.sea2,P.sea3,P.sea4,P.cream], sun:[P.ember3,P.ember4,P.butter,P.cream],
  ember:[P.ember1,P.ember2,P.ember3,P.ember4], bark:[P.soil0,P.soil1,P.soil2,P.soil3],
  wood:[P.soil1,P.soil2,P.soil3,P.butter], leaf:[P.moss0,P.moss1,P.moss2,P.moss3],
  sea:[P.sea0,P.sea1,P.sea2,P.sea3], glass:[P.sea2,P.sea3,P.sea4,P.cream],
  iron:[P.plum2,P.plum3,P.mist,P.fog], shade:[P.plum1,P.plum2,P.plum3,P.mist],
  dusk:[P.ink,P.plum1,P.plum2,P.plum3], rose:[P.rose0,P.rose1,P.rose2,P.cream],
  wax:[P.soil3,P.butter,P.cream,P.cream], wool:[P.mist,P.fog,P.cream,P.cream],
  dream:[P.glim0,P.glim1,P.fog,P.cream], ice:[P.sea2,P.sea4,P.fog,P.cream],
  frost:[P.sea1,P.sea2,P.sea3,P.sea4], cream:[P.soil3,P.butter,P.cream,P.cream],
  hot:[P.ember2,P.ember3,P.ember4,P.butter], coral:[P.ember1,P.ember2,P.rose2,P.cream]
};
// faded look (poorly cared for, or hollowed by the sap): every colour drops to its grey/brown twin
const DULL_MAP = {};
[[P.ember1,P.soil1],[P.ember2,P.soil2],[P.ember3,P.soil2],[P.ember4,P.soil3],[P.butter,P.fog],
 [P.moss1,P.soil1],[P.moss2,P.plum3],[P.moss3,P.mist],[P.moss4,P.fog],[P.moss0,P.plum1],
 [P.sea0,P.plum1],[P.sea1,P.plum2],[P.sea2,P.plum3],[P.sea3,P.mist],[P.sea4,P.fog],
 [P.rose0,P.plum2],[P.rose1,P.plum3],[P.rose2,P.mist],[P.glim0,P.plum3],[P.glim1,P.mist],
 [P.soil3,P.mist],[P.soil2,P.plum3],[P.cream,P.fog]].forEach(([a, b]) => DULL_MAP[a] = b);

/* ================= Type visuals (from "Lenguaje visual del Claro") ================= */
const TYPE = {
  fire:  { ramp:[P.ember0,P.ember1,P.ember2,P.ember3], sig:P.ember2, fx:"rise-zig",  day:true,  icon: R.ember },
  plant: { ramp:[P.moss1,P.moss2,P.moss3,P.moss4],     sig:P.moss3,  fx:"fall-sway", day:true,  icon: R.moss },
  light: { ramp:[P.ember3,P.ember4,P.butter,P.cream],  sig:P.ember4, fx:"rise-twinkle", day:true, icon: R.gold },
  bolt:  { ramp:[P.sea1,P.sea3,P.butter,P.cream],      sig:P.butter, fx:"zigzag",    day:true,  icon: [P.sea1,P.ember4,P.butter,P.cream] },
  air:   { ramp:[P.mist,P.sea3,P.sea4,P.cream],        sig:P.sea3,   fx:"streak",    day:true,  icon: R.sky },
  music: { ramp:[P.rose0,P.rose1,P.rose2,P.cream],     sig:P.rose1,  fx:"ring",      day:true,  icon: R.rose },
  water: { ramp:[P.sea0,P.sea1,P.sea2,P.sea3],         sig:P.sea2,   fx:"drip",      day:false, icon: [P.sea1,P.sea2,P.sea3,P.sea4] },
  stone: { ramp:[P.soil0,P.soil1,P.soil2,P.soil3],     sig:P.soil2,  fx:"dust",      day:false, icon: R.wood },
  shadow:{ ramp:[P.ink,P.plum1,P.plum2,P.plum3],       sig:P.plum3,  fx:"mist",      day:false, icon: R.shade },
  ice:   { ramp:[P.sea2,P.sea4,P.fog,P.cream],         sig:P.sea4,   fx:"flake",     day:false, icon: R.ice },
  mush:  { ramp:[P.soil1,P.rose0,P.rose2,P.cream],     sig:P.rose0,  fx:"spore",     day:false, icon: R.rose },
  dream: { ramp:[P.sea0,P.glim0,P.glim1,P.fog],        sig:P.glim1,  fx:"bubble",    day:false, icon: R.dream },
  star:  { ramp:[P.ember4,P.sea3,P.rose2,P.glim1],     sig:P.cream,  fx:"converge",  day:null,  icon: R.gold },
};
// rarity = frame material + pips (Común, Rara, Súper rara, Épica, Mítica, Legendaria in rpg/data-cards.js order)
const GRADE = [
  { mat:[P.soil1,P.soil2], pips:1, anim:null },
  { mat:[P.ember1,P.ember3], pips:2, anim:null },
  { mat:[P.mist,P.cream], pips:3, anim:null },
  { mat:[P.sea2,P.sea4], pips:4, anim:"shine" },
  { mat:[P.rose2,P.glim1], pips:5, anim:"irid" },
  { mat:[P.ember4,P.butter], pips:6, anim:"pulse" },
];

/* ================= Rasteriser (same rules as pixel.js) ================= */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

// part: {cx,cy,rx,ry,ramp,group,z,spec,flat,rot}
function rasterOut(W, H, parts) {
  const id = new Int16Array(W * H).fill(-1), col = new Array(W * H).fill(null);
  // parts keep their index (extras look them up by it); "ord" changes only the drawing order, "hide" skips one
  const order = parts.map((p, i) => i).sort((a, b) => (parts[a].ord != null ? parts[a].ord : a) - (parts[b].ord != null ? parts[b].ord : b));
  order.forEach((i) => { const p = parts[i]; if (p.hide) return;
    const cs = Math.cos(p.rot || 0), sn = Math.sin(p.rot || 0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let dx = x + .5 - p.cx, dy = y + .5 - p.cy;
      if (p.rot) { const ax = dx * cs + dy * sn, ay = -dx * sn + dy * cs; dx = ax; dy = ay; }
      const nx = dx / p.rx, ny = dy / p.ry;
      let d2 = nx * nx + ny * ny;
      if (p.box) d2 = Math.max(Math.abs(nx), Math.abs(ny)) ** 2;
      if (p.tri) { if (ny < -1 || ny > 1 || Math.abs(nx) > (ny + 1) / 2) continue; d2 = 0.5; }
      if (d2 > 1) continue;
      let band;
      if (p.flat != null) band = p.flat;
      else {
        const nz = Math.sqrt(Math.max(0, 1 - d2)), lit = nx * -.45 + ny * -.75;
        const lum = nz * .35 + lit * .7;
        band = lum > .42 ? 2 : lum > -.2 ? 1 : 0;
        if (p.spec !== false && Math.hypot(nx + .42, ny + .5) < (p.rx > 5 ? .2 : .26)) band = 3;
      }
      id[y * W + x] = i; col[y * W + x] = p.ramp[band];
    }
  });
  const out = col.slice();
  const g = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? -1 : id[y * W + x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const me = id[y * W + x], n = [g(x + 1, y), g(x - 1, y), g(x, y + 1), g(x, y - 1)];
    if (me < 0) { if (n.some(v => v >= 0)) out[y * W + x] = P.ink; continue; }
    const mp = parts[me];
    if (mp.noline) continue;
    if (n.some(v => v >= 0 && parts[v].group !== mp.group && (parts[v].z || 0) > (mp.z || 0) && !parts[v].noline)) out[y * W + x] = P.ink;
  }
  return { out, id };
}
function toCanvas(out, W, H, dull) {
  const c = canvas(W, H), g = c.getContext("2d");
  for (let i = 0; i < W * H; i++) if (out[i]) { g.fillStyle = dull ? (DULL_MAP[out[i]] || out[i]) : out[i]; g.fillRect(i % W, (i / W) | 0, 1, 1); }
  return c;
}
const put = (out, W, x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < out.length / W) out[y * W + x] = c; };
function line(out, W, x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (let k = 0; k < 200; k++) { put(out, W, x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
const inside = (out, id, W, x, y) => { x = Math.round(x); y = Math.round(y); const i = y * W + x; return id[i] >= 0 && out[i] !== P.ink; };

/* ================= Faces ================= */
// f: { ey, dx (shift), eye (colour), mouth: "beak"|"o"|false, cheek, small }
function face(out, W, f, n, emo) {
  const ew = f.small ? 1 : n >= 32 ? 3 : 2, eh = f.small ? (n >= 24 ? 2 : 1) : n >= 32 ? 4 : n >= 24 ? 3 : 2;
  const c = W / 2 + (f.dx || 0), gap = Math.max(f.small ? 1 : 2, Math.round(n * (f.gap || .13)));
  const ey = Math.round(f.ey), ink = f.eye || P.ink;
  const eyesL = Math.round(c - gap - ew), eyesR = Math.round(c + gap);
  const drawEye = (x0, flip) => {
    if (emo === "happy") { for (let i = 0; i <= ew; i++) put(out, W, x0 + i, ey + (i === 0 || i === ew ? 1 : 0), ink); return; }
    if (emo === "sleep") { for (let i = 0; i < ew + 1; i++) put(out, W, x0 + i - (flip ? 1 : 0), ey + eh - 1, ink); return; }
    const top = emo === "sad" ? 1 : 0, h = emo === "surprised" ? eh + 1 : eh, y0 = emo === "surprised" ? ey - 1 : ey;
    for (let y = top; y < h; y++) for (let x = 0; x < ew; x++) put(out, W, x0 + x, y0 + y, ink);
    if (!f.eye && ew > 1) put(out, W, x0 + (flip ? ew - 1 : 0), y0 + top, P.cream);
    if (emo === "sad") put(out, W, x0 + (flip ? ew : -1), y0 + h, P.sea3);
  };
  drawEye(eyesL, false); drawEye(eyesR, true);
  if (f.cheek !== false && emo !== "sad") {
    put(out, W, eyesL - 1, ey + eh, P.rose2); put(out, W, eyesR + ew, ey + eh, P.rose2);
    if (n >= 24) { put(out, W, eyesL - 2, ey + eh, P.rose2); put(out, W, eyesR + ew + 1, ey + eh, P.rose2); }
  }
  const my = ey + eh + (n >= 32 ? 2 : 1), m0 = Math.floor(c) - 1;
  if (f.mouth === false) return;
  if (f.mouth === "beak") { put(out, W, m0, my - 1, P.ember3); put(out, W, m0 + 1, my - 1, P.ember3); put(out, W, m0, my, P.ember2); put(out, W, m0 + 1, my, P.ember2); if (n >= 24) { put(out, W, m0 - 1, my - 1, P.ink); put(out, W, m0 + 2, my - 1, P.ink); put(out, W, m0, my + 1, P.ink); put(out, W, m0 + 1, my + 1, P.ink); } return; }
  if (f.mouth === "o" || emo === "surprised") { put(out, W, m0, my, P.ink); put(out, W, m0 + 1, my, P.ink); put(out, W, m0, my + 1, P.rose1); put(out, W, m0 + 1, my + 1, P.ink); return; }
  if (emo === "normal") { put(out, W, m0 - 1, my, P.ink); put(out, W, m0 + 2, my, P.ink); put(out, W, m0, my + 1, P.ink); put(out, W, m0 + 1, my + 1, P.ink); }
  else if (emo === "happy") { for (let x = 0; x < 2; x++) { put(out, W, m0 + x, my, P.ink); put(out, W, m0 + x, my + 1, P.rose1); } put(out, W, m0 - 1, my, P.ink); put(out, W, m0 + 2, my, P.ink); }
  else if (emo === "sad") { put(out, W, m0, my, P.ink); put(out, W, m0 + 1, my, P.ink); put(out, W, m0 - 1, my + 1, P.ink); put(out, W, m0 + 2, my + 1, P.ink); }
  else { put(out, W, m0, my, P.ink); put(out, W, m0 + 1, my, P.ink); }
}

/* ================= Creatures =================
   Each spec gets n (grid), st (stage 0 baby, 1 young, 2 adult), sq (0 frame A, 1 frame B squashed)
   and returns { parts, face, extra(out, W, H, id) }. Coordinates are in grid pixels; the grid is (n+2)^2. */
const SPEC = {
  /* --- the three original species, as in pixel.js --- */
  lumo(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .07, cy = n * (.62 + sq * .03) + 1, rx = n * .3 * s, ry = n * .3 / s;
    const wr = [.16, .19, .23][st], wh = [.2, .24, .3][st];
    const br = Math.max(1.3, n * (st === 2 ? .09 : .06)), by = n * .14 + 1 + sq;
    return { parts: [
      { cx: c - n * .33, cy: n * .5 + 1 + sq, rx: n * wr, ry: n * wh, ramp: R.lilac, group: "w", z: 0, spec: false },
      { cx: c + n * .33, cy: n * .5 + 1 + sq, rx: n * wr, ry: n * wh, ramp: R.lilac, group: "w", z: 0, spec: false },
      { cx: c, cy, rx, ry, ramp: R.gold, group: "b", z: 1 },
      { cx: c - n * .2, cy: by, rx: br, ry: br, ramp: st === 2 ? R.sun : R.gold, group: "a", z: 2, spec: false, flat: st === 2 ? 2 : 1 },
      { cx: c + n * .2, cy: by, rx: br, ry: br, ramp: st === 2 ? R.sun : R.gold, group: "a", z: 2, spec: false, flat: st === 2 ? 2 : 1 },
    ], face: { ey: cy - ry * .2 }, extra(out, W) {
      line(out, W, c - n * .2 + .5, by + br - .2, c - n * .1, cy - ry + .5, P.ink);
      line(out, W, c + n * .2 - 1.5, by + br - .2, c + n * .1 - 1, cy - ry + .5, P.ink);
    } };
  },
  pebb(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, cy = n * (.64 + sq * .03) + 1, rx = n * .41 * s, ry = n * .3 / s;
    const parts = [
      { cx: c - n * .22, cy: n * .9 + 1, rx: n * .1, ry: n * .07, ramp: R.stone, group: "f", z: 0, flat: 0 },
      { cx: c + n * .22, cy: n * .9 + 1, rx: n * .1, ry: n * .07, ramp: R.stone, group: "f", z: 0, flat: 0 },
      { cx: c, cy, rx, ry, ramp: R.stone, group: "b", z: 1 },
    ];
    if (st >= 1) parts.push({ cx: c, cy: cy - ry * .85, rx: n * (st === 2 ? .3 : .22), ry: n * (st === 2 ? .12 : .09), ramp: R.moss, group: "m", z: 2, spec: false });
    return { parts, face: { ey: cy - ry * .15 }, extra(out, W, H, id) {
      [[.28, .8], [.72, .72], [.6, .86], [.2, .66]].forEach(([fx, fy]) => { const x = Math.round(fx * n + 1), y = Math.round(fy * n * (1 - sq * .02) + 1); if (id[y * W + x] === 2) put(out, W, x, y, P.plum3); });
      if (st === 2) { const y = cy - ry * .85 - n * .12; put(out, W, c - .5, y - 1, P.moss3); put(out, W, c - .5, y, P.moss1); put(out, W, c + .5, y - 2, P.moss4); put(out, W, c - .5, y - 2, P.ink); put(out, W, c + 1.5, y - 2, P.ink); put(out, W, c + .5, y - 3, P.ink); }
    } };
  },
  fizz(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, cy = n * (.62 + sq * .03) + 1, parts = [];
    if (st === 2) parts.push({ cx: c + n * .3, cy: n * .24 + 1, rx: n * .14, ry: n * .14, ramp: R.sun, group: "s", z: 0 });
    const bumps = [[-.22, .45, .17], [.13, .39, .2], [-.33, .66, .12], [.33, .64, .13]];
    if (st >= 1) bumps.push([-.02, .33, .14]);
    bumps.forEach(([dx, y, r]) => parts.push({ cx: c + dx * n * s, cy: y * n + 1 + sq * n * .03, rx: r * n, ry: r * n / s, ramp: R.sky, group: "b", z: 1, spec: false }));
    parts.push({ cx: c, cy, rx: n * .38 * s, ry: n * .27 / s, ramp: R.sky, group: "b", z: 1 });
    return { parts, hover: true, face: { ey: cy - n * .08 }, extra(out, W) {
      if (st === 2) { const sx = c + n * .3, sy = n * .24 + 1, r = n * .14 + 2; [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([a, b]) => put(out, W, sx + a * r - .5, sy + b * r - .5, P.ember4)); }
    } };
  },

  /* --- Sol --- */
  // Fuellito: salamander apprentice with a bellows belly and a flame tail
  fuellito(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .07, cy = n * (.64 + sq * .03) + 1, rx = n * .3 * s, ry = n * .27 / s;
    const parts = [
      { cx: c + n * .3, cy: n * .7 + 1, rx: n * .16, ry: n * .08, ramp: R.ember, group: "t", z: 0, rot: -.5 },
      { cx: c + n * .42, cy: n * (.52 - st * .04) + 1 + sq, rx: n * (.07 + st * .02), ry: n * (.11 + st * .03), ramp: R.hot, group: "fl", z: 0, spec: false },
      { cx: c, cy, rx, ry, ramp: R.ember, group: "b", z: 1 },
      { cx: c, cy: cy + ry * .38, rx: rx * .62, ry: ry * .5, ramp: R.wood, group: "bl", z: 2, spec: false },
      { cx: c - n * .2, cy: n * .91 + 1, rx: n * .09, ry: n * .06, ramp: R.ember, group: "l", z: 0, flat: 0 },
      { cx: c + n * .2, cy: n * .91 + 1, rx: n * .09, ry: n * .06, ramp: R.ember, group: "l", z: 0, flat: 0 },
    ];
    if (st >= 1) parts.push({ cx: c, cy: cy - ry - n * .03, rx: n * .05 + st, ry: n * (.06 + st * .03), ramp: R.hot, group: "cr", z: 0, spec: false, flat: 2 });
    return { parts, face: { ey: cy - ry * .45 }, extra(out, W, H, id) {
      const y0 = Math.round(cy + ry * .2), y1 = Math.round(cy + ry * .75);
      for (let y = y0 + 1; y < y1; y += 2) for (let x = Math.round(c - rx * .5); x <= Math.round(c + rx * .5); x++) if (inside(out, id, W, x, y) && id[y * W + x] === 3) put(out, W, x, y, P.soil1);
    } };
  },
  // Brotín: acorn with a sprout
  brotin(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, cy = n * (.66 + sq * .03) + 1, rx = n * .3 * s, ry = n * .28 / s;
    const capY = cy - ry * .55, leaf = n * (.08 + st * .03);
    const parts = [
      { cx: c - n * .15, cy: n * .92 + 1, rx: n * .08, ry: n * .05, ramp: R.bark, group: "f", z: 0, flat: 1 },
      { cx: c + n * .15, cy: n * .92 + 1, rx: n * .08, ry: n * .05, ramp: R.bark, group: "f", z: 0, flat: 1 },
      { cx: c, cy, rx, ry, ramp: R.wood, group: "b", z: 1 },
      { cx: c, cy: capY, rx: rx * 1.1, ry: ry * .55, ramp: R.bark, group: "cap", z: 2, spec: false },
      { cx: c - leaf * .9, cy: capY - ry * .5 - leaf * .7, rx: leaf, ry: leaf * .55, ramp: R.moss, group: "lf", z: 3, rot: .5, spec: false },
      { cx: c + leaf * .9 + 1, cy: capY - ry * .5 - leaf * .9, rx: leaf, ry: leaf * .55, ramp: R.moss, group: "lf2", z: 3, rot: -.5, spec: false },
    ];
    return { parts, face: { ey: cy - ry * .05 }, extra(out, W, H, id) {
      for (let y = Math.round(capY - ry * .5); y < capY + ry * .5; y++) for (let x = 0; x < W; x++) if (id[y * W + x] === 3 && out[y * W + x] !== P.ink && (x + y) % 3 === 0) put(out, W, x, y, P.soil0);
      line(out, W, c, capY - ry * .55, c, capY - ry * .55 - leaf * .6, P.moss1);
    } };
  },
  // Mecha: a candle on little legs, with a drip and a wick flame
  mecha(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, cy = n * (.64 + sq * .03) + 1, rx = n * .25 * s, ry = n * .3 / s;
    const fl = n * (.07 + st * .02);
    const parts = [
      { cx: c - n * .12, cy: n * .92 + 1, rx: n * .06, ry: n * .05, ramp: R.wax, group: "f", z: 0, flat: 1 },
      { cx: c + n * .12, cy: n * .92 + 1, rx: n * .06, ry: n * .05, ramp: R.wax, group: "f", z: 0, flat: 1 },
      { cx: c, cy, rx, ry, ramp: R.wax, group: "b", z: 1, box: false },
      { cx: c - rx * .65, cy: cy - ry * .2, rx: n * .05, ry: n * .12, ramp: R.wax, group: "d", z: 2, spec: false, flat: 2 },
      { cx: c + .5, cy: cy - ry - fl * 1.6 + sq, rx: fl, ry: fl * 1.5, ramp: R.hot, group: "fl", z: 2, spec: false },
      { cx: c + .5, cy: cy - ry - fl * 1.2 + sq, rx: fl * .45, ry: fl * .7, ramp: [P.cream, P.cream, P.cream, P.cream], group: "fc", z: 3, noline: true, flat: 0 },
    ];
    return { parts, face: { ey: cy - ry * .1 }, extra(out, W) {
      line(out, W, c, cy - ry, c, cy - ry - 1, P.ink);
      if (st === 2) { put(out, W, c - fl * 2.2, cy - ry - fl * 2, P.ember4); put(out, W, c + fl * 2.6, cy - ry - fl * 1.5, P.ember4); }
    } };
  },
  // Yunquerón: tortoise whose shell is an anvil, rim glowing hot
  yunqueron(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .05, sy = n * (.48 + sq * .03) + 1, hy = n * (.7 + sq * .02) + 1;
    const parts = [
      { cx: c - n * .3, cy: n * .9 + 1, rx: n * .1, ry: n * .07, ramp: R.moss, group: "l", z: 0, flat: 1 },
      { cx: c + n * .3, cy: n * .9 + 1, rx: n * .1, ry: n * .07, ramp: R.moss, group: "l", z: 0, flat: 1 },
      { cx: c, cy: sy, rx: n * .44 * s, ry: n * .24 / s, ramp: R.iron, group: "sh", z: 1 },
      { cx: c - n * .44, cy: sy - n * .08, rx: n * .1, ry: n * .05, ramp: R.iron, group: "horn", z: 2, spec: false },
      { cx: c, cy: sy - n * .16, rx: n * .3, ry: n * .06, ramp: R.iron, group: "top", z: 2, flat: 2 },
      { cx: c, cy: hy, rx: n * .2, ry: n * .17, ramp: R.moss, group: "h", z: 3 },
    ];
    return { parts, face: { ey: hy - n * .06, small: n < 24 }, extra(out, W, H, id) {
      const y = Math.round(sy + n * .16);
      for (let x = 0; x < W; x++) if (id[y * W + x] === 2 && out[y * W + x] !== P.ink) put(out, W, x, y, st === 2 ? P.ember4 : P.ember2);
      if (st >= 1) for (let x = 0; x < W; x++) if (id[(y - 1) * W + x] === 2 && out[(y - 1) * W + x] !== P.ink && x % 2) put(out, W, x, y - 1, P.ember3);
    } };
  },
  // Espinardo: bramble hedgehog
  espinardo(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, cy = n * (.64 + sq * .03) + 1, rx = n * .38 * s, ry = n * .3 / s;
    const parts = [
      { cx: c - n * .2, cy: n * .92 + 1, rx: n * .08, ry: n * .05, ramp: R.bark, group: "f", z: 0, flat: 1 },
      { cx: c + n * .2, cy: n * .92 + 1, rx: n * .08, ry: n * .05, ramp: R.bark, group: "f", z: 0, flat: 1 },
      { cx: c, cy: cy - n * .03, rx, ry, ramp: R.leaf, group: "b", z: 1 },
      { cx: c, cy: cy + ry * .3, rx: rx * .58, ry: ry * .55, ramp: R.wood, group: "fc", z: 2, spec: false },
    ];
    return { parts, face: { ey: cy + ry * .1, small: n < 24 }, extra(out, W) {
      const k = 7 + st * 2;
      for (let i = 0; i < k; i++) {
        const a = Math.PI * (1.05 + i * .9 / (k - 1));
        const x0 = c + Math.cos(a) * rx * .9, y0 = cy - n * .03 + Math.sin(a) * ry * .9;
        const x1 = c + Math.cos(a) * (rx + n * .12), y1 = cy - n * .03 + Math.sin(a) * (ry + n * .12);
        line(out, W, x0, y0, x1, y1, P.ink);
        put(out, W, (x0 + x1) / 2, (y0 + y1) / 2, i % 3 ? P.moss3 : P.moss4);
      }
      if (st === 2) { put(out, W, c - rx * .6, cy - ry * .4, P.rose1); put(out, W, c + rx * .5, cy - ry * .6, P.rose1); }
    } };
  },

  /* --- Cielo --- */
  // Relampín: messenger ferret, bolt tail
  relampin(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, hy = n * (.42 + sq * .03) + 1;
    const parts = [
      { cx: c, cy: n * .76 + 1, rx: n * .2 * s, ry: n * .16 / s, ramp: R.wood, group: "body", z: 0 },
      { cx: c - n * .2, cy: n * .2 + 1 + sq, rx: n * .07, ry: n * .08, ramp: R.wood, group: "e", z: 0, spec: false },
      { cx: c + n * .2, cy: n * .2 + 1 + sq, rx: n * .07, ry: n * .08, ramp: R.wood, group: "e", z: 0, spec: false },
      { cx: c, cy: hy, rx: n * .28 * s, ry: n * .22 / s, ramp: R.wood, group: "h", z: 1 },
      { cx: c, cy: hy + n * .09, rx: n * .14, ry: n * .08, ramp: R.cream, group: "m", z: 2, spec: false, flat: 2 },
      { cx: c - n * .12, cy: n * .93 + 1, rx: n * .06, ry: n * .04, ramp: R.wood, group: "f", z: 1, flat: 0 },
      { cx: c + n * .12, cy: n * .93 + 1, rx: n * .06, ry: n * .04, ramp: R.wood, group: "f", z: 1, flat: 0 },
    ];
    return { parts, face: { ey: hy - n * .07, mouth: n >= 24 ? undefined : false }, extra(out, W) {
      // zigzag tail rising on the right
      const pts = [[c + n * .18, n * .82], [c + n * .36, n * .7], [c + n * .28, n * .58], [c + n * .44, n * (.42 - st * .06)]];
      for (let i = 0; i < pts.length - 1; i++) { line(out, W, pts[i][0], pts[i][1] + 1, pts[i + 1][0], pts[i + 1][1] + 1, P.ink); line(out, W, pts[i][0] - 1, pts[i][1] + 1, pts[i + 1][0] - 1, pts[i + 1][1] + 1, i % 2 ? P.butter : P.ember4); }
      put(out, W, pts[3][0] - 1, pts[3][1], P.cream);
      // mask stripe
      put(out, W, c - n * .22, hy - n * .02, P.soil1); put(out, W, c + n * .22, hy - n * .02, P.soil1);
      if (st === 2) { put(out, W, c - n * .32, n * .3, P.sea3); put(out, W, c + n * .34, n * .26, P.butter); }
    } };
  },
  // Trinilla: round minstrel bird with a lyre tail
  trinilla(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, cy = n * (.6 + sq * .03) + 1, rx = n * .3 * s, ry = n * .3 / s;
    const parts = [
      { cx: c + n * .34, cy: cy - n * .02, rx: n * .1, ry: n * .16, ramp: R.rose, group: "w", z: 0, spec: false, rot: .4 },
      { cx: c, cy, rx, ry, ramp: R.rose, group: "b", z: 1 },
      { cx: c, cy: cy + ry * .42, rx: rx * .62, ry: ry * .45, ramp: R.cream, group: "bl", z: 2, spec: false },
      { cx: c - n * .12, cy: n * .93 + 1, rx: n * .05, ry: n * .04, ramp: R.ember, group: "f", z: 0, flat: 2 },
      { cx: c + n * .12, cy: n * .93 + 1, rx: n * .05, ry: n * .04, ramp: R.ember, group: "f", z: 0, flat: 2 },
    ];
    if (st >= 1) parts.push({ cx: c - n * .06, cy: cy - ry - n * .04, rx: n * .04, ry: n * .08, ramp: R.rose, group: "cr", z: 0, spec: false, rot: -.4, flat: 1 });
    return { parts, face: { ey: cy - ry * .3, mouth: "beak" }, extra(out, W) {
      // lyre tail: two curved arms with strings, behind on the left
      const bx = c - rx - 1, top = cy - ry * (1.1 + st * .15), bot = cy + ry * .2;
      line(out, W, bx, bot, bx - n * .1, top, P.ink); line(out, W, bx - n * .12, bot - n * .04, bx - n * .2, top + 1, P.ink);
      line(out, W, bx - n * .1, top, bx - n * .2, top + 1, P.ember4);
      for (let k = 1; k <= 1 + st; k++) line(out, W, bx - k * n * .05, bot - n * .02, bx - n * .1 - k * n * .03, top + 2, P.butter);
    } };
  },

  /* --- Lago --- */
  // Remolín: little river otter
  remolin(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, cy = n * (.64 + sq * .03) + 1, rx = n * .3 * s, ry = n * .29 / s;
    const parts = [
      { cx: c + n * .34, cy: n * .84 + 1, rx: n * .16, ry: n * .06, ramp: R.sea, group: "t", z: 0, rot: -.3, spec: false },
      { cx: c - n * .22, cy: cy - ry * .9, rx: n * .07, ry: n * .06, ramp: R.sea, group: "e", z: 0, spec: false },
      { cx: c + n * .22, cy: cy - ry * .9, rx: n * .07, ry: n * .06, ramp: R.sea, group: "e", z: 0, spec: false },
      { cx: c, cy, rx, ry, ramp: R.sea, group: "b", z: 1 },
      { cx: c, cy: cy + ry * .3, rx: rx * .6, ry: ry * .58, ramp: R.glass, group: "bl", z: 2, spec: false },
      { cx: c - n * .18, cy: n * .92 + 1, rx: n * .07, ry: n * .05, ramp: R.sea, group: "f", z: 1, flat: 0 },
      { cx: c + n * .18, cy: n * .92 + 1, rx: n * .07, ry: n * .05, ramp: R.sea, group: "f", z: 1, flat: 0 },
    ];
    return { parts, face: { ey: cy - ry * .35 }, extra(out, W) {
      const wy = cy - ry * .35 + (n >= 32 ? 6 : 4);
      if (n >= 24) { line(out, W, c - rx * .9, wy, c - rx * .45, wy - 1, P.sea4); line(out, W, c + rx * .45, wy - 1, c + rx * .9, wy, P.sea4); }
      if (st === 2) { put(out, W, c - 1, cy - ry - 2, P.sea4); put(out, W, c, cy - ry - 3, P.sea3); put(out, W, c + 1, cy - ry - 2, P.sea4); }
    } };
  },
  // Vidriela: glass fish from the Mirror Lake, floats
  vidriela(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .05, cy = n * (.52 + sq * .03) + 1, rx = n * .32 * s, ry = n * .28 / s;
    const parts = [
      { cx: c + rx + n * .06, cy: cy - n * .08, rx: n * .08, ry: n * .14, ramp: R.glass, group: "t", z: 0, rot: -.6, spec: false },
      { cx: c + rx + n * .06, cy: cy + n * .08, rx: n * .08, ry: n * .14, ramp: R.glass, group: "t", z: 0, rot: .6, spec: false },
      { cx: c, cy: cy - ry, rx: n * .1, ry: n * (.07 + st * .02), ramp: R.glass, group: "fin", z: 0, spec: false },
      { cx: c, cy, rx, ry, ramp: R.glass, group: "b", z: 1 },
    ];
    return { parts, hover: true, face: { ey: cy - ry * .25, cheek: false }, extra(out, W, H, id) {
      // the lake inside: a dark line and a reflection mote
      const y = Math.round(cy + ry * .45);
      for (let x = 0; x < W; x++) if (id[y * W + x] === 3 && out[y * W + x] !== P.ink) put(out, W, x, y, P.sea1);
      if (st >= 1) put(out, W, c + rx * .3, cy + ry * .2, P.glim1);
      if (st === 2) { put(out, W, c - rx * .4, cy + ry * .25, P.sea1); put(out, W, c - rx * .4 + 1, cy + ry * .25, P.sea1); }
    } };
  },
  // Pebb is above. Ecolito: a singing geode stone with crystals on top
  ecolito(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, cy = n * (.64 + sq * .03) + 1, rx = n * .36 * s, ry = n * .3 / s;
    const k = 2 + st;
    const parts = [
      { cx: c, cy, rx, ry, ramp: TYPE.stone.ramp, group: "b", z: 1 },
    ];
    for (let i = 0; i < k; i++) {
      const fx = (i - (k - 1) / 2) * n * .13;
      parts.push({ cx: c + fx, cy: cy - ry * .85 - (i % 2 ? 0 : n * .04), rx: n * .05, ry: n * (.09 + (i % 2 ? 0 : .03)), ramp: R.dream, group: "cr" + i, z: 2, spec: false, flat: i % 2 ? 1 : 2 });
    }
    return { parts, face: { ey: cy - ry * .05, mouth: "o" }, extra(out, W, H, id) {
      // echo arcs on the left
      if (n >= 24) { const ax = c - rx - 2; line(out, W, ax, cy - 2, ax - 1, cy, P.glim1); line(out, W, ax - 1, cy + 1, ax, cy + 3, P.glim1); }
      [[.25, .8], [.75, .76]].forEach(([fx, fy]) => { const x = Math.round(fx * n + 1), y = Math.round(fy * n + 1); if (id[y * W + x] === 0 && out[y * W + x] !== P.ink) put(out, W, x, y, P.soil0); });
    } };
  },
  // Nim: shy little bat of the Shadow folk
  nim(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, cy = n * (.6 + sq * .03) + 1, rx = n * .26 * s, ry = n * .27 / s;
    const ww = n * (.18 + st * .03);
    const parts = [
      { cx: c - rx - ww * .55, cy: cy, rx: ww, ry: n * .16, ramp: R.shade, group: "w", z: 0, spec: false, rot: -.35 },
      { cx: c + rx + ww * .55, cy: cy, rx: ww, ry: n * .16, ramp: R.shade, group: "w", z: 0, spec: false, rot: .35 },
      { cx: c - n * .14, cy: cy - ry - n * .06, rx: n * .07, ry: n * .14, ramp: R.shade, group: "e", z: 0, tri: true, flat: 1 },
      { cx: c + n * .14, cy: cy - ry - n * .06, rx: n * .07, ry: n * .14, ramp: R.shade, group: "e", z: 0, tri: true, flat: 1 },
      { cx: c, cy, rx, ry, ramp: R.shade, group: "b", z: 1 },
    ];
    return { parts, hover: true, face: { ey: cy - ry * .25 }, extra(out, W) {
      // wing fingers
      [[-1, -.35], [1, .35]].forEach(([d]) => { const x0 = c + d * (rx + 1), x1 = c + d * (rx + ww * 1.4); line(out, W, x0, cy, x1, cy - n * .1, P.plum1); line(out, W, x0, cy + 1, x1 - d, cy + n * .08, P.plum1); });
      if (n >= 24) { put(out, W, c - 1, cy + ry * .6, P.cream); put(out, W, c + 1, cy + ry * .6, P.cream); }
    } };
  },
  // Centinela de Bruma: hooded shadow guard with a mist lance
  centinela(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .05, cy = n * (.66 + sq * .02) + 1;
    const parts = [
      { cx: c, cy, rx: n * .3 * s, ry: n * .28 / s, ramp: R.shade, group: "cloak", z: 0 },
      { cx: c, cy: n * .36 + 1 + sq, rx: n * .22, ry: n * .2, ramp: R.dusk, group: "hood", z: 1 },
      { cx: c, cy: n * .4 + 1 + sq, rx: n * .14, ry: n * .1, ramp: [P.ink, P.ink, P.ink, P.ink], group: "void", z: 2, flat: 0, noline: true },
      { cx: c - n * .2, cy: cy + n * .02, rx: n * .07, ry: n * .06, ramp: R.iron, group: "hand", z: 2, spec: false, flat: 1 },
    ];
    return { parts, face: { ey: n * .37 + 1 + sq, eye: st === 2 ? P.butter : P.ember4, mouth: false, cheek: false, small: true, gap: .08 }, extra(out, W) {
      // lance on the left side
      const lx = c - n * .34;
      line(out, W, lx, n * .98, lx, n * .1, P.ink); line(out, W, lx + 1, n * .96, lx + 1, n * .12, P.soil2);
      line(out, W, lx, n * .1, lx + 1, n * .02, P.ink); put(out, W, lx + 1, n * .06, P.fog); put(out, W, lx + 2, n * .1, P.ink);
      if (st >= 1) { put(out, W, c + n * .2, cy - n * .06, P.mist); put(out, W, c + n * .24, cy - n * .1, P.mist); }
      // veil clasp
      put(out, W, c, cy - n * .14, P.glim1);
    } };
  },

  /* --- Escarcha --- */
  // Carámbano: ice mole with an icy snout and spikes on its back
  carambano(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, cy = n * (.64 + sq * .03) + 1, rx = n * .36 * s, ry = n * .28 / s;
    const parts = [
      { cx: c, cy, rx, ry, ramp: R.frost, group: "b", z: 1 },
      { cx: c, cy: cy + ry * .25, rx: n * .07, ry: n * .07, ramp: R.ice, group: "sn", z: 2, spec: false, flat: 3 },
      { cx: c - rx * .75, cy: n * .9 + 1, rx: n * .1, ry: n * .06, ramp: R.ice, group: "cl", z: 2, flat: 2 },
      { cx: c + rx * .75, cy: n * .9 + 1, rx: n * .1, ry: n * .06, ramp: R.ice, group: "cl2", z: 2, flat: 2 },
    ];
    const k = 2 + st;
    for (let i = 0; i < k; i++) parts.splice(0, 0, { cx: c + (i - (k - 1) / 2) * n * .16, cy: cy - ry - n * .02, rx: n * .05, ry: n * .1, ramp: R.ice, group: "sp" + i, z: 0, tri: true, flat: 2 });
    return { parts, face: { ey: cy - ry * .3, small: true, gap: .12, mouth: false }, extra(out, W) {
      const x = c - rx * .75, y = n * .9 + 1;
      put(out, W, x - 1, y + 1, P.ink); put(out, W, x + 1, y + 1, P.ink); put(out, W, c + rx * .75 - 1, y + 1, P.ink); put(out, W, c + rx * .75 + 1, y + 1, P.ink);
    } };
  },
  // Capuchón: hermit crab wearing a mushroom
  capuchon(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, cy = n * (.74 + sq * .02) + 1;
    const capY = n * (.4 + sq * .03) + 1, crx = n * (.4 + st * .03) * s, cry = n * .22 / s;
    const parts = [
      { cx: c - n * .34, cy: cy + n * .02, rx: n * .1, ry: n * .08, ramp: R.coral, group: "cl", z: 2 },
      { cx: c + n * .34, cy: cy + n * .02, rx: n * .1, ry: n * .08, ramp: R.coral, group: "cl2", z: 2 },
      { cx: c, cy, rx: n * .24, ry: n * .16, ramp: R.coral, group: "b", z: 1 },
      { cx: c, cy: capY + cry * .6, rx: n * .16, ry: n * .12, ramp: R.cream, group: "stem", z: 0, spec: false },
      { cx: c, cy: capY, rx: crx, ry: cry, ramp: R.rose, group: "cap", z: 1 },
    ];
    return { parts, face: { ey: cy - n * .06, small: n < 32 }, extra(out, W, H, id) {
      [[-.5, -.2], [.1, -.55], [.5, -.05], [-.15, .2]].slice(0, 2 + st).forEach(([fx, fy]) => { const x = c + fx * crx, y = capY + fy * cry; if (inside(out, id, W, x, y)) { put(out, W, x, y, P.cream); if (n >= 24) put(out, W, x + 1, y, P.cream); } });
      // claw notches
      put(out, W, c - n * .34, cy - n * .04, P.ink); put(out, W, c + n * .34, cy - n * .04, P.ink);
    } };
  },
  // Bostezo: woolly moth-lamb, always half asleep
  bostezo(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, cy = n * (.64 + sq * .03) + 1;
    const parts = [
      { cx: c - n * .38, cy: cy - n * .08, rx: n * .13, ry: n * .17, ramp: R.dream, group: "w", z: 0, spec: false, rot: -.4 },
      { cx: c + n * .38, cy: cy - n * .08, rx: n * .13, ry: n * .17, ramp: R.dream, group: "w", z: 0, spec: false, rot: .4 },
    ];
    [[-.2, -.12, .17], [.18, -.14, .18], [-.28, .1, .15], [.28, .1, .15], [0, .14, .2], [0, -.2, .15]].forEach(([dx, dy, r]) => parts.push({ cx: c + dx * n * s, cy: cy + dy * n, rx: r * n, ry: r * n / s, ramp: R.wool, group: "b", z: 1, spec: false }));
    parts.push({ cx: c, cy: cy - n * .02, rx: n * .19, ry: n * .15, ramp: R.dream, group: "face", z: 2 });
    return { parts, face: { ey: cy - n * .06, cheek: true }, sleepy: true, extra(out, W) {
      // feathery antennae
      const ty = cy - n * .3;
      line(out, W, c - n * .06, ty, c - n * .16, ty - n * .12 - st, P.ink); line(out, W, c + n * .06, ty, c + n * .16, ty - n * .12 - st, P.ink);
      put(out, W, c - n * .17, ty - n * .12 - st, P.glim1); put(out, W, c + n * .17, ty - n * .12 - st, P.glim1);
    } };
  },
  // Guardatumba: ice giant, broad shoulders and a crystal crown
  guardatumba(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .04, cy = n * (.66 + sq * .02) + 1;
    const parts = [
      { cx: c - n * .36, cy: cy - n * .08, rx: n * .13, ry: n * .14, ramp: R.ice, group: "ar", z: 2 },
      { cx: c + n * .36, cy: cy - n * .08, rx: n * .13, ry: n * .14, ramp: R.ice, group: "ar2", z: 2 },
      { cx: c - n * .38, cy: cy + n * .16, rx: n * .1, ry: n * .1, ramp: R.ice, group: "fi", z: 3 },
      { cx: c + n * .38, cy: cy + n * .16, rx: n * .1, ry: n * .1, ramp: R.ice, group: "fi2", z: 3 },
      { cx: c, cy, rx: n * .3 * s, ry: n * .3 / s, ramp: R.ice, group: "b", z: 1, box: true },
      { cx: c, cy: n * .3 + 1 + sq, rx: n * .16, ry: n * .13, ramp: R.ice, group: "h", z: 2 },
      { cx: c - n * .09, cy: n * .16 + 1 + sq, rx: n * .04, ry: n * .07, ramp: R.frost, group: "cr", z: 1, tri: true, flat: 2 },
      { cx: c, cy: n * .13 + 1 + sq, rx: n * .04, ry: n * .09, ramp: R.frost, group: "cr2", z: 1, tri: true, flat: 3 },
      { cx: c + n * .09, cy: n * .16 + 1 + sq, rx: n * .04, ry: n * .07, ramp: R.frost, group: "cr3", z: 1, tri: true, flat: 2 },
    ];
    return { parts, face: { ey: n * .27 + 1 + sq, eye: P.sea1, small: true, gap: .06, mouth: false, cheek: false }, extra(out, W, H, id) {
      // cracks and the tomb seal on the chest
      line(out, W, c - n * .1, cy - n * .12, c - n * .04, cy, P.sea2); line(out, W, c - n * .04, cy, c - n * .1, cy + n * .1, P.sea2);
      put(out, W, c + n * .1, cy + n * .02, P.sea1); put(out, W, c + n * .11, cy + n * .02, P.sea1);
      if (st === 2) put(out, W, c + n * .1, cy - n * .02, P.glim1);
    } };
  },

  /* --- Estrella --- */
  // Unísona: a four-pointed star with a tip in each circle's colour
  unisona(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, cy = n * (.55 + sq * .02) + 1, r = n * .26;
    const tip = (dx, dy, ramp, rot) => ({ cx: c + dx * r * 1.15, cy: cy + dy * r * 1.15, rx: n * .07, ry: n * .14, ramp, group: "t" + dx + dy, z: 0, rot, spec: false });
    const parts = [
      tip(0, -1, R.sun, 0), tip(1, 0, R.sky, Math.PI / 2), tip(0, 1, R.rose, 0), tip(-1, 0, R.dream, Math.PI / 2),
      { cx: c, cy, rx: r * s, ry: r / s, ramp: R.gold, group: "b", z: 1 },
    ];
    return { parts, hover: true, face: { ey: cy - r * .2 }, extra(out, W) {
      const o = r + n * .3;
      [[-.7, -.7, P.ember4], [.7, -.7, P.sea3], [.7, .7, P.rose2], [-.7, .7, P.glim1]].forEach(([a, b, col]) => put(out, W, c + a * o * (1 - sq * .1), cy + b * o * (1 - sq * .1), col));
    } };
  },
};
const KINDS = ["lumo", "fizz", "pebb", "fuellito", "brotin", "remolin", "bostezo", "mecha", "yunqueron", "espinardo",
  "nim", "centinela", "vidriela", "ecolito", "relampin", "trinilla", "carambano", "capuchon", "guardatumba", "unisona"];
const KIND_TYPE = { lumo:"light", fizz:"air", pebb:"stone", fuellito:"fire", brotin:"plant", remolin:"water", bostezo:"dream", mecha:"light",
  yunqueron:"fire", espinardo:"plant", nim:"shadow", centinela:"shadow", vidriela:"water", ecolito:"stone", relampin:"bolt", trinilla:"music",
  carambano:"ice", capuchon:"mush", guardatumba:"ice", unisona:"star" };

/* ---------- Back and side views ----------
   The SPEC parts are posed from the front. For the other views we move them:
   - pairs (wings, legs, ears, claws: same height, mirrored left/right) fold together in profile, the far one behind and darker;
   - "front" parts (bellies, snouts, face patches) disappear from behind and slide forward in profile;
   - "back" parts (tails, tail flames, fins, a single wing) come over the body from behind and trail behind in profile;
   - wings sit over the body from behind, so you see them spread on the creature's back.
   Profiles face right; world.js mirrors them for left. */
const VIEW = {
  lumo: { wings: ["w"], noSideExtra: true }, nim: { wings: ["w"], noSideExtra: true }, bostezo: { wings: ["w"], front: ["face"] },
  fuellito: { front: ["bl"], back: ["t", "fl"] }, trinilla: { front: ["bl"], back: ["w"] }, remolin: { front: ["bl"], back: ["t"] },
  vidriela: { back: ["t"] }, mecha: { front: ["d"] }, espinardo: { front: ["fc"] }, centinela: { front: ["void", "hand"] },
  carambano: { front: ["sn"], noSideExtra: true }, relampin: { front: ["m"] }, yunqueron: { front: ["h"], back: ["horn"] }, fizz: { back: ["s"] },
};
function viewParts(kind, sp, n, dir) {
  const v = VIEW[kind] || {}, c = n / 2 + 1, parts = sp.parts.map((p) => Object.assign({}, p));
  const has = (list, p) => (list || []).includes(p.group);
  // find mirrored pairs by shape, whatever their group names are
  const pairOf = new Map();
  parts.forEach((a, i) => parts.forEach((b, j) => {
    if (j <= i || pairOf.has(i) || pairOf.has(j)) return;
    const da = a.cx - c, db = b.cx - c;
    if (Math.abs(da) > 1 && Math.abs(da + db) < .8 && Math.abs(a.cy - b.cy) < .8 && Math.abs(a.rx - b.rx) < .5) { pairOf.set(i, j); pairOf.set(j, i); }
  }));
  const body = parts.reduce((m, p) => (Math.abs(p.cx - c) < 1 && p.rx * p.ry > m.rx * m.ry ? p : m), parts[0]);
  const bodyRx = body.rx;
  parts.forEach((p, i) => {
    const dx = p.cx - c;
    if (dir === "back") {
      if (has(v.front, p)) p.hide = true;
      else if (has(v.back, p)) { p.cx = c + dx * .35; p.z = 6; p.group += "_bk"; }
      else if (has(v.wings, p)) { p.z = 6; p.cx = c + dx * .85; }
      // seen from behind, light comes over the shoulder: no shine spot
      p.spec = false;
    } else if (dir === "side") {
      if (has(v.front, p)) { p.cx = c + Math.max(dx, 0) + bodyRx * .45; p.rx *= .6; p.rot = 0; }
      else if (has(v.back, p)) { p.cx = c - Math.abs(dx) * .9; if (p.rot) p.rot = -p.rot; }
      else if (pairOf.has(i)) {
        const near = dx > 0;
        // wings fold onto the back: the near one over the shoulder, the far one peeking out behind it
        if (has(v.wings, p)) { p.cx = c - bodyRx * (near ? .55 : .8); p.cy -= n * (near ? .04 : .1); p.rx *= near ? .62 : .5; p.ry *= near ? .9 : .8; p.z = near ? 6 : -1; if (!near) { p.flat = 0; p.group += "_far"; } }
        else { p.cx = c + (near ? .3 : -.05) * Math.abs(dx); if (!near) { p.z = (p.z || 0) - 1; p.flat = 0; p.group += "_far"; } }
      } else if (Math.abs(dx) < 1) p.rx *= .82;
      else p.cx = c + dx * .55;
    }
  });
  // from behind and in profile, whatever is nearer to us is drawn last
  parts.forEach((p, i) => { p.ord = (p.z || 0) * 100 + i; });
  return parts;
}

const CACHE = new Map();
// dir: "front" (default), "back" (no face) or "side" (facing right: face turned to the side, body a little narrower;
// mirror it for left). Used by the walkable map in world.js.
function sprite(kind, n = 24, st = 1, sq = 0, emo = "normal", dull = false, dir = "front") {
  const key = [kind, n, st, sq, emo, dull ? 1 : 0, dir].join(":");
  if (CACHE.has(key)) return CACHE.get(key);
  const sp = SPEC[kind](n, st, sq), W = n + 2, H = n + 2;
  const parts = dir === "front" ? sp.parts : viewParts(kind, sp, n, dir);
  const { out, id } = rasterOut(W, H, parts);
  // the hand-placed details (stripes, antenna stalks, spikes, sparkles) are posed for the front; skip them where they no longer fit
  const vw = VIEW[kind] || {};
  if (sp.extra && !(dir === "side" && vw.noSideExtra) && !(dir === "back" && vw.noBackExtra)) sp.extra(out, W, H, id);
  if (sp.face !== false && dir !== "back") {
    const f = Object.assign({}, sp.face, dull ? { cheek: false } : {});
    if (dir === "side") { f.dx = (f.dx || 0) + Math.round(n * .14); f.gap = (f.gap || .13) * .6; f.cheek = false; }
    face(out, W, f, n, emo === "normal" && sp.sleepy && sq ? "sleep" : emo);
  }
  let c = toCanvas(out, W, H, dull);
  CACHE.set(key, c); return c;
}
// silhouette in one colour (hit flash, evolution)
function silhouette(src, col = P.cream) { const c = canvas(src.width, src.height), g = c.getContext("2d"); g.drawImage(src, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return c; }
const hovers = (kind) => !!SPEC[kind](16, 0, 0).hover;

/* ================= Type icons 9x9 (hand drawn: o ink, d dark, a base, l light) ================= */
const TYPE_ICON = {
  fire:  ["...o.....","...oo....","..oao.o..","..oaaoao.",".oaalaao.",".oallaao.","oaalllao.",".oallao..","..oooo..."],
  plant: ["......oo.",".....olo.","...ooaao.","..oaaldo.",".oaaldao.",".oaldaao.","oldaaoo..","odoo.....","o........"],
  light: [".........","....o....","...olo...",".ooalaoo.","oaalllaao",".ooalaoo.","...olo...","....o....","........."],
  bolt:  ["....ooo..","...olao..","..olao...",".oaaaoo..","oooaaao..","..oaao...",".oao.....",".oo......","o........"],
  air:   [".........",".ooooo...","olllllo..",".ooooolo.","..oooo.o.",".olllo.o.","o.ooo.o..","o....o...",".oooo...."],
  music: [".....ooo.",".....olo.",".....oo..",".....o...",".....o...","..oooo...",".oallo...",".oaao....","..oo....."],
  water: ["....o....","...olo...","...olo...","..ollao..",".ollaaao.",".olaaaao.",".oaaaado.","..oaddo..","...ooo..."],
  stone: [".........","...ooo...","..ollao..",".ollaaao.","ollaaaado","olaaaaddo","oaaaadddo",".ooooooo.","........."],
  shadow:["...ooo...","..olaao..",".ola.oo..",".ola.....",".ola.....",".olaa..o.","..olaaao.","...oooo..","........."],
  ice:   ["....o....",".o.olo.o.","..oalao..","oooalaooo","olllllllo","oooalaooo","..oalao..",".o.olo.o.","....o...."],
  mush:  ["...ooo...",".oollloo.","oalaaaao.","oaalaalao","ooooooooo","...olo...","...olo...","...olo...","...ooo..."],
  dream: [".........",".........","o.......o",".ooooooo.","oaaaaaaao","oaoaoaoao",".o.o.o.o.",".........","........."],
  star:  ["....o....","...olo...","...olo...",".oolaloo.","olllllllo",".oolaloo.","...olo...","...olo...","....o...."],
};
const ICON_CACHE = {};
function typeIcon(type) {
  if (ICON_CACHE[type]) return ICON_CACHE[type];
  const rows = TYPE_ICON[type] || TYPE_ICON.star, rp = TYPE[type] ? TYPE[type].icon : R.gold;
  const k = { o: P.ink, d: rp[0], a: rp[1], l: rp[3] };
  const c = canvas(9, 9), g = c.getContext("2d");
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (k[ch]) { g.fillStyle = k[ch]; g.fillRect(x, y, 1, 1); } }));
  if (type === "star") { g.fillStyle = P.sea3; g.fillRect(7, 4, 1, 1); g.fillStyle = P.rose2; g.fillRect(4, 7, 1, 1); g.fillStyle = P.glim1; g.fillRect(1, 4, 1, 1); }
  return (ICON_CACHE[type] = c);
}

/* ================= Card art: 16x16 glyphs =================
   Every glyph is a few shaded shapes in the card's type ramp (or a fixed material ramp),
   outlined with the same rasteriser as the creatures. */
const G16 = 16;
// helpers produce parts on a 16x16 grid; the first arg "m" is the main ramp (the card's type)
const e = (cx, cy, rx, ry, ramp, z = 1, o = {}) => Object.assign({ cx, cy, rx, ry, ramp, group: "g" + z + "_" + cx + "_" + cy, z }, o);
const GLYPH = {
  flash: (m) => ({ parts: [e(8, 8, 3, 3, m, 2)], extra(o, W) { [[8, 1, 8, 15], [1, 8, 15, 8]].forEach(([a, b, c2, d]) => { line(o, W, a, b, c2, d, P.ink); }); line(o, W, 8, 3, 8, 13, m[3]); line(o, W, 3, 8, 13, 8, m[3]); put(o, W, 4, 4, m[2]); put(o, W, 12, 12, m[2]); put(o, W, 12, 4, m[2]); put(o, W, 4, 12, m[2]); } }),
  lantern: (m) => ({ parts: [e(8, 9, 4, 5, m, 1, { box: true }), e(8, 3, 3, 1.4, R.iron, 2, { flat: 1 }), e(8, 14.5, 3.5, 1, R.iron, 2, { flat: 1 }), e(8, 9, 1.6, 2.4, R.hot, 3, { spec: false, noline: true })], extra(o, W) { put(o, W, 8, 1, P.ink); line(o, W, 5, 6, 5, 12, P.soil1); line(o, W, 10, 6, 10, 12, P.soil1); } }),
  sparkle: (m) => ({ parts: [e(6, 9, 3.5, 3.5, m, 1), e(11.5, 4.5, 2, 2, m, 2)], extra(o, W) { line(o, W, 6, 3, 6, 15, P.ink); line(o, W, 0, 9, 12, 9, P.ink); line(o, W, 6, 5, 6, 13, m[3]); line(o, W, 2, 9, 10, 9, m[3]); put(o, W, 11, 4, P.cream); } }),
  spiral: (m) => ({ parts: [], extra(o, W) { let a = 0, r = .6; let px = 8, py = 8; for (let i = 0; i < 70; i++) { a += .24; r += .085; const x = 8 + Math.cos(a) * r, y = 8 + Math.sin(a) * r * .8; line(o, W, px, py, x, y, i % 9 < 2 ? m[3] : m[1]); px = x; py = y; } outline(o, W); } }),
  cloud: (m) => ({ parts: [e(5, 9, 3.5, 3, m, 1, { spec: false }), e(9, 7, 4, 3.6, m, 1, { spec: false }), e(12, 10, 3, 2.6, m, 1, { spec: false }), e(8, 11, 6, 2.5, m, 1)] }),
  drops: (m) => ({ parts: [e(4, 6, 2, 2.6, R.sea, 1), e(10, 4, 2, 2.6, R.sea, 2), e(8, 11, 2.2, 2.8, R.sea, 3), e(13, 11, 1.6, 2.2, R.sea, 4)], extra(o, W) { [[4, 3], [10, 1], [8, 8], [13, 8]].forEach(([x, y]) => put(o, W, x, y, P.ink)); } }),
  rock: (m) => ({ parts: [e(8, 9, 6, 4.6, m, 1)], extra(o, W, H, id) { line(o, W, 6, 7, 9, 10, m[0]); put(o, W, 11, 8, m[0]); } }),
  boulder: (m) => ({ parts: [e(8, 9, 6.5, 5, m, 1)], extra(o, W) { line(o, W, 5, 7, 7, 8, P.ink); line(o, W, 11, 7, 9, 8, P.ink); put(o, W, 6, 9, P.ink); put(o, W, 10, 9, P.ink); line(o, W, 7, 12, 9, 12, P.ink); } }),
  twostones: (m) => ({ parts: [e(5, 10, 4, 3.4, m, 1), e(11, 8, 4, 3.4, m, 2)], extra(o, W) { put(o, W, 8, 3, m[3]); put(o, W, 7, 2, m[3]); put(o, W, 9, 2, m[3]); } }),
  flame: (m) => ({ parts: [e(8, 10, 4.5, 4.8, R.ember, 1), e(9, 5, 2.2, 3.4, R.ember, 1, { rot: .3 }), e(8, 11, 2.4, 2.6, R.hot, 2, { spec: false, noline: true, flat: 2 })] }),
  bread: (m) => ({ parts: [e(8, 10, 7, 4, R.wood, 1)], extra(o, W) { [5, 8, 11].forEach((x) => { line(o, W, x, 8, x + 1, 10, P.soil1); }); put(o, W, 4, 13, P.soil1); } }),
  hammer: (m) => ({ parts: [e(9, 5, 5, 2.4, R.iron, 2, { box: true })], extra(o, W) { line(o, W, 9, 7, 5, 15, P.ink); line(o, W, 10, 8, 6, 15, P.soil2); put(o, W, 13, 3, P.ember3); put(o, W, 14, 4, P.ember4); } }),
  horseshoe: (m) => ({ parts: [], extra(o, W) { for (let a = 0; a <= Math.PI; a += .05) { const x = 8 + Math.cos(a) * 5, y = 7 - Math.sin(a) * 5 + 5; put(o, W, x, y, P.mist); put(o, W, 8 + Math.cos(a) * 4, 12 - Math.sin(a) * 4, P.fog); } line(o, W, 3, 12, 3, 14, P.mist); line(o, W, 13, 12, 13, 14, P.mist); line(o, W, 4, 12, 4, 14, P.fog); line(o, W, 12, 12, 12, 14, P.fog); put(o, W, 8, 2, P.ember4); outline(o, W); } }),
  anvil: (m) => ({ parts: [e(8, 7, 6.5, 2, R.iron, 1, { box: true }), e(8, 11, 2.5, 2.5, R.iron, 2, { box: true }), e(8, 14, 5, 1.2, R.iron, 3, { box: true, flat: 0 }), e(2, 7, 2.5, 1.4, R.iron, 0, { flat: 1 })], extra(o, W) { line(o, W, 3, 8, 13, 8, P.ember2); } }),
  furnace: (m) => ({ parts: [e(8, 9, 6.5, 6, R.iron, 1, { box: true }), e(8, 11, 3, 3, R.hot, 2, { spec: false })], extra(o, W) { line(o, W, 5, 8, 11, 8, P.ink); put(o, W, 8, 9, P.cream); } }),
  acorn: (m) => ({ parts: [e(8, 10, 4.2, 4.5, R.wood, 1), e(8, 6, 5, 2.6, R.bark, 2, { spec: false })], extra(o, W) { line(o, W, 8, 3, 9, 1, P.ink); put(o, W, 6, 6, P.soil0); put(o, W, 9, 5, P.soil0); put(o, W, 11, 6, P.soil0); } }),
  rings: (m) => ({ parts: [e(8, 8, 7, 7, R.wood, 1, { flat: 2 })], extra(o, W) { for (const r of [5, 3, 1.4]) for (let a = 0; a < 6.3; a += .1) put(o, W, 8 + Math.cos(a) * r, 8 + Math.sin(a) * r, P.soil1); put(o, W, 8, 8, P.soil0); } }),
  sprout: (m) => ({ parts: [e(8, 14, 5, 2, R.bark, 1, { flat: 1 }), e(5, 6, 3.6, 2, R.moss, 2, { rot: .5 }), e(11, 5, 3.6, 2, R.moss, 3, { rot: -.5 })], extra(o, W) { line(o, W, 8, 12, 8, 7, P.moss1); } }),
  roots: (m) => ({ parts: [e(8, 4, 5, 3, R.leaf, 2)], extra(o, W) { [[4, 4], [8, 3], [12, 4]].forEach(([x], i) => { let y = 6; let xx = x; while (y < 15) { put(o, W, xx, y, i === 1 ? P.ember1 : P.soil1); put(o, W, xx + 1, y, P.ink); y++; xx += (y % 3 === 0) ? (i - 1) : 0; } }); } }),
  thorns: (m) => ({ parts: [e(8, 9, 5, 5, R.leaf, 1)], extra(o, W) { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(o, W, 8 + Math.cos(a) * 4, 9 + Math.sin(a) * 4, 8 + Math.cos(a) * 7.5, 9 + Math.sin(a) * 7, P.ink); put(o, W, 8 + Math.cos(a) * 6, 9 + Math.sin(a) * 5.6, P.moss4); } } }),
  hedge: (m) => ({ parts: [e(4, 9, 3.5, 5, R.leaf, 1), e(8, 8, 3.5, 6, R.leaf, 2), e(12, 9, 3.5, 5, R.leaf, 3)], extra(o, W) { [[4, 6], [8, 4], [12, 7], [6, 11], [10, 12]].forEach(([x, y]) => put(o, W, x, y, P.ember1)); } }),
  bolt: (m) => ({ parts: [], extra(o, W) { const pts = [[11, 1], [5, 8], [9, 8], [4, 15]]; for (let i = 0; i < 3; i++) { line(o, W, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], P.butter); line(o, W, pts[i][0] + 1, pts[i][1], pts[i + 1][0] + 1, pts[i + 1][1], P.ember4); } outline(o, W); } }),
  crackle: (m) => ({ parts: [e(8, 8, 3, 3, [P.sea1, P.sea3, P.butter, P.cream], 1)], extra(o, W) { [[2, 2, 5, 5], [14, 2, 11, 5], [2, 14, 5, 11], [14, 14, 11, 11]].forEach(([a, b, c2, d]) => line(o, W, a, b, c2, d, P.butter)); outline(o, W); } }),
  scroll: (m) => ({ parts: [e(8, 8, 5, 5.5, R.cream, 1, { box: true, flat: 2 }), e(8, 2.6, 6, 1.4, R.wood, 2, { flat: 1 }), e(8, 13.6, 6, 1.4, R.wood, 2, { flat: 1 })], extra(o, W) { [5, 7, 9, 11].forEach((y) => line(o, W, 5, y, y === 11 ? 8 : 11, y, P.mist)); put(o, W, 12, 10, P.ember1); } }),
  note: (m) => ({ parts: [e(6, 12, 3, 2.3, m, 1, { rot: -.3 })], extra(o, W) { line(o, W, 9, 12, 9, 2, P.ink); line(o, W, 10, 2, 13, 5, P.ink); line(o, W, 10, 3, 12, 5, m[2]); } }),
  notes2: (m) => ({ parts: [e(4, 12, 2.4, 1.8, m, 1), e(11, 10, 2.4, 1.8, m, 2)], extra(o, W) { line(o, W, 6, 12, 6, 4, P.ink); line(o, W, 13, 10, 13, 2, P.ink); line(o, W, 6, 4, 13, 2, P.ink); line(o, W, 6, 5, 13, 3, P.ink); } }),
  notes3: (m) => ({ parts: [e(3, 13, 2, 1.6, m, 1), e(8, 11, 2, 1.6, m, 2), e(13, 13, 2, 1.6, m, 3)], extra(o, W) { line(o, W, 4, 13, 4, 5, P.ink); line(o, W, 9, 11, 9, 3, P.ink); line(o, W, 14, 13, 14, 5, P.ink); line(o, W, 4, 5, 14, 3, P.ink); } }),
  moon: (m) => ({ parts: [e(8, 8, 6, 6, R.shade, 1)], extra(o, W, H, id) { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 11, y - 6) < 5.2) o[y * 16 + x] = Math.hypot(x - 11, y - 6) > 4.4 && id[y * 16 + x] >= 0 ? P.ink : null; put(o, W, 4, 6, P.fog); } }),
  eye: (m) => ({ parts: [e(8, 8, 7, 4, R.cream, 1, { flat: 2 }), e(8, 8, 3, 3, m, 2)], extra(o, W) { put(o, W, 8, 8, P.ink); put(o, W, 7, 7, P.cream); } }),
  mask: (m) => ({ parts: [e(8, 8, 6.5, 5, R.shade, 1)], extra(o, W) { line(o, W, 4, 7, 6, 7, P.butter); line(o, W, 10, 7, 12, 7, P.butter); line(o, W, 6, 11, 10, 11, P.ink); put(o, W, 8, 2, P.glim1); } }),
  lance: (m) => ({ parts: [e(12.5, 3.5, 1.8, 3, R.iron, 2, { rot: .785 })], extra(o, W) { line(o, W, 2, 14, 11, 5, P.ink); line(o, W, 3, 14, 11, 6, P.soil2); [[4, 10], [6, 8]].forEach(([x, y]) => put(o, W, x, y, P.plum3)); } }),
  crown: (m) => ({ parts: [e(8, 11, 6, 3, m, 1, { box: true, flat: 1 })], extra(o, W) { [[2, 8, 3, 3], [8, 8, 8, 2], [14, 8, 13, 3]].forEach(([a, b, c2, d]) => { line(o, W, a, b, c2, d, P.ink); }); line(o, W, 3, 4, 3, 8, m[2]); line(o, W, 8, 3, 8, 8, m[2]); line(o, W, 13, 4, 13, 8, m[2]); put(o, W, 8, 11, P.glim1); } }),
  veil: (m) => ({ parts: [e(8, 7, 5.5, 5, R.dusk, 1), e(8, 12, 6.5, 3.5, R.shade, 0, { flat: 1 })], extra(o, W) { put(o, W, 6, 7, P.ember4); put(o, W, 10, 7, P.ember4); } }),
  wave: (m) => ({ parts: [e(8, 12, 7.5, 3.5, R.sea, 1, { box: true })], extra(o, W) { for (let x = 1; x < 15; x++) { const y = 8 - Math.round(Math.sin(x * .7) * 2); put(o, W, x, y, P.sea3); put(o, W, x, y - 1, P.ink); put(o, W, x, y + 1, P.sea2); } [[3, 5], [12, 4]].forEach(([x, y]) => put(o, W, x, y, P.sea4)); } }),
  cup: (m) => ({ parts: [e(8, 9, 5, 5, R.glass, 1)], extra(o, W) { for (let x = 0; x < 16; x++) for (let y = 0; y < 7; y++) o[y * 16 + x] = null; line(o, W, 3, 7, 13, 7, P.ink); line(o, W, 4, 8, 12, 8, P.sea2); } }),
  drop: (m) => ({ parts: [e(8, 10, 4.5, 4.5, m, 1), e(8, 6, 2.4, 4, m, 1, { tri: true, flat: 1 })], extra(o, W) { put(o, W, 6, 9, P.cream); } }),
  mirror: (m) => ({ parts: [e(8, 7, 4.5, 5.5, R.wood, 1, { flat: 1 }), e(8, 7, 3.2, 4.2, R.glass, 2)], extra(o, W) { line(o, W, 8, 13, 8, 15, P.soil1); put(o, W, 7, 15, P.ink); put(o, W, 9, 15, P.ink); } }),
  arcs: (m) => ({ parts: [e(4, 9, 3, 3, m, 1)], extra(o, W) { for (const r of [5.5, 8.5]) for (let a = -.9; a <= .9; a += .08) put(o, W, 4 + Math.cos(a) * r, 9 + Math.sin(a) * r, r < 7 ? P.glim1 : P.glim0); } }),
  pick: (m) => ({ parts: [], extra(o, W) { for (let a = .3; a < 2.8; a += .05) { put(o, W, 8 + Math.cos(a) * 6.5, 9 - Math.sin(a) * 5.5, P.mist); put(o, W, 8 + Math.cos(a) * 6.5, 10 - Math.sin(a) * 5.5, P.fog); } line(o, W, 8, 4, 8, 15, P.soil2); line(o, W, 9, 4, 9, 15, P.soil1); outline(o, W); } }),
  tablet: (m) => ({ parts: [e(8, 8.5, 5, 6.5, m, 1, { box: true })], extra(o, W) { line(o, W, 6, 5, 10, 5, P.glim1); line(o, W, 8, 5, 8, 11, P.glim1); line(o, W, 6, 9, 10, 12, P.glim1); } }),
  flake: (m) => ({ parts: [], extra(o, W) { for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; line(o, W, 8 - Math.cos(a) * 6.5, 8 - Math.sin(a) * 6.5, 8 + Math.cos(a) * 6.5, 8 + Math.sin(a) * 6.5, P.sea4); } put(o, W, 8, 8, P.cream); [[3, 5], [13, 11], [13, 5], [3, 11]].forEach(([x, y]) => put(o, W, x, y, P.cream)); outline(o, W); } }),
  icicle: (m) => ({ parts: [e(8, 3, 7, 1.6, R.ice, 2, { box: true, flat: 2 }), e(4, 7, 1.8, 4, R.ice, 1, { tri: true, rot: Math.PI, flat: 1 }), e(8, 9, 2, 6, R.ice, 1, { tri: true, rot: Math.PI, flat: 2 }), e(12, 7, 1.8, 4, R.ice, 1, { tri: true, rot: Math.PI, flat: 1 })] }),
  candle: (m) => ({ parts: [e(8, 11, 3, 4.5, R.wax, 1, { box: true }), e(8, 4, 1.6, 2.6, R.hot, 2, { spec: false })], extra(o, W) { put(o, W, 8, 6, P.ink); put(o, W, 6, 9, P.cream); } }),
  mushroom: (m) => ({ parts: [e(8, 12, 2.4, 3.4, R.cream, 1, { flat: 2 }), e(8, 7, 7, 4.4, R.rose, 2)], extra(o, W) { for (let x = 0; x < 16; x++) for (let y = 9; y < 12; y++) if (o[y * 16 + x] && o[y * 16 + x] !== P.ink && (x < 5 || x > 11)) o[y * 16 + x] = null; put(o, W, 5, 6, P.cream); put(o, W, 10, 5, P.cream); put(o, W, 8, 8, P.cream); } }),
  spores: (m) => ({ parts: [e(8, 12, 4, 2.6, R.rose, 1)], extra(o, W) { [[4, 7], [7, 4], [11, 6], [13, 3], [3, 3], [9, 8]].forEach(([x, y], i) => { put(o, W, x, y, i % 2 ? P.rose2 : P.cream); }); } }),
  vial: (m) => ({ parts: [e(8, 10.5, 4.5, 4.5, R.glass, 1), e(8, 4, 1.6, 2.6, R.glass, 1, { box: true, flat: 2 }), e(8, 12, 3.2, 2.4, R.rose, 2, { noline: true, flat: 1 })], extra(o, W) { line(o, W, 6, 1, 10, 1, P.soil2); put(o, W, 6, 9, P.cream); put(o, W, 9, 12, P.moss3); } }),
  zzz: (m) => ({ parts: [], extra(o, W) { const Z = (x, y, s, c) => { line(o, W, x, y, x + s, y, c); line(o, W, x + s, y, x, y + s, c); line(o, W, x, y + s, x + s, y + s, c); }; Z(2, 9, 5, m[2]); Z(9, 4, 4, m[3]); Z(12, 0, 2, m[2]); outline(o, W); } }),
  pillow: (m) => ({ parts: [e(8, 9, 7, 4.5, R.wool, 1)], extra(o, W) { [[1, 5], [15, 5], [1, 13], [15, 13]].forEach(([x, y]) => put(o, W, x, y, P.ink)); line(o, W, 5, 9, 11, 9, P.mist); } }),
  book: (m) => ({ parts: [e(4.5, 9, 3.5, 5, R.cream, 1, { box: true, flat: 2 }), e(11.5, 9, 3.5, 5, R.cream, 2, { box: true, flat: 2 })], extra(o, W) { line(o, W, 8, 4, 8, 14, P.glim0); [6, 8, 10].forEach((y) => { line(o, W, 3, y, 6, y, P.mist); line(o, W, 10, y, 13, y, P.mist); }); put(o, W, 8, 2, P.glim1); } }),
  door: (m) => ({ parts: [e(8, 9, 5.5, 6.5, R.ice, 1, { box: true })], extra(o, W) { for (let y = 3; y < 16; y++) put(o, W, 8, y, P.sea2); put(o, W, 7, 9, P.ink); put(o, W, 9, 9, P.ink); line(o, W, 4, 7, 12, 7, P.sea1); } }),
  wall: (m) => ({ parts: [e(4, 9, 3, 6, R.ice, 1, { tri: true, flat: 2 }), e(9, 8, 3.4, 7, R.ice, 2, { tri: true, flat: 3 }), e(13, 10, 2.5, 5, R.ice, 3, { tri: true, flat: 1 })] }),
  mace: (m) => ({ parts: [e(10, 6, 4, 4, R.ice, 2)], extra(o, W) { line(o, W, 2, 15, 8, 9, P.ink); line(o, W, 3, 15, 8, 10, P.soil2); [[10, 1], [15, 6], [10, 11], [5, 6]].forEach(([x, y]) => put(o, W, x, y, P.cream)); } }),
  sickle: (m) => ({ parts: [e(8, 12, 5, 2.4, R.rose, 1)], extra(o, W) { for (let a = .2; a < 2.6; a += .06) put(o, W, 7 + Math.cos(a) * 6, 8 - Math.sin(a) * 6, P.mist); line(o, W, 13, 8, 13, 13, P.soil1); put(o, W, 3, 3, P.moss3); outline(o, W); } }),
  bowl: (m) => ({ parts: [e(8, 10, 6.5, 4.5, R.wood, 1)], extra(o, W) { for (let x = 0; x < 16; x++) for (let y = 0; y < 9; y++) o[y * 16 + x] = null; line(o, W, 2, 9, 14, 9, P.ink); line(o, W, 3, 10, 13, 10, m[2]); [[6, 6], [9, 5], [8, 7]].forEach(([x, y]) => put(o, W, x, y, P.mist)); } }),
  lamppost: (m) => ({ parts: [e(8, 4, 3, 3, m, 2, { box: true })], extra(o, W) { line(o, W, 8, 7, 8, 15, P.ink); line(o, W, 6, 15, 10, 15, P.ink); put(o, W, 8, 4, P.cream); [[3, 3], [13, 3], [2, 6], [14, 6]].forEach(([x, y]) => put(o, W, x, y, m[2])); } }),
  oil: (m) => ({ parts: [e(8, 10, 4.5, 4.5, R.wood, 1), e(8, 6, 2.4, 4, R.wood, 1, { tri: true, flat: 1 })], extra(o, W) { put(o, W, 6, 9, P.butter); put(o, W, 13, 3, P.ember4); put(o, W, 12, 2, P.ember3); } }),
  heart: (m) => ({ parts: [e(5.5, 6.5, 3.5, 3.2, m, 1), e(10.5, 6.5, 3.5, 3.2, m, 1), e(8, 10, 4.2, 4.5, m, 1, { tri: true, rot: Math.PI })] }),
  star4: (m) => ({ parts: [e(8, 8, 2.6, 2.6, R.gold, 2), e(8, 4, 1.6, 4, R.sun, 1, { tri: true, flat: 2 }), e(8, 12, 1.6, 4, R.rose, 1, { tri: true, rot: Math.PI, flat: 2 }), e(4, 8, 1.6, 4, R.dream, 1, { tri: true, rot: -Math.PI / 2, flat: 2 }), e(12, 8, 1.6, 4, R.sky, 1, { tri: true, rot: Math.PI / 2, flat: 2 })] }),
  starnote: (m) => ({ parts: [e(6, 12, 3, 2.3, R.gold, 1, { rot: -.3 })], extra(o, W) { line(o, W, 9, 12, 9, 3, P.ink); [[12, 2, P.sea3], [14, 4, P.rose2], [12, 6, P.glim1], [10, 4, P.ember4]].forEach(([x, y, c2]) => put(o, W, x, y, c2)); put(o, W, 12, 4, P.cream); } }),
  shield: (m) => ({ parts: [e(8, 7, 5.5, 4.5, m, 1), e(8, 11, 5.5, 4, m, 1, { tri: true, rot: Math.PI })] }),
};
// line-only glyphs: add the 1 px ink outline around drawn pixels
function outline(o, W) {
  const H = o.length / W, src = o.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (src[y * W + x]) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const xx = x + a, yy = y + b; return xx >= 0 && yy >= 0 && xx < W && yy < H && src[yy * W + xx] && src[yy * W + xx] !== P.ink; });
    if (n) o[y * W + x] = P.ink;
  }
}
// card id -> [glyph, type] (types follow rpg/data-cards.js; glyph chosen from the card's name)
const CARD = {
  flash:["flash","light"], lantern:["lantern","light"], spark:["sparkle","light"],
  gust:["spiral","air"], cloud:["cloud","air"], rain:["drops","air"],
  throw:["rock","stone"], stubborn:["boulder","stone"], promise:["twostones","stone"],
  bellows:["flame","fire"], bread:["bread","fire"], piece:["horseshoe","fire"],
  acorn:["acorn","plant"], rings:["rings","plant"], seedling:["sprout","plant"],
  whirl:["spiral","water"], vessel:["cup","water"], guest:["drop","water"],
  yawn:["zzz","dream"], pillow:["pillow","dream"], tale:["book","dream"],
  street:["lamppost","light"], oil:["oil","light"], ration:["bowl","light"],
  temper:["hammer","fire"], anvil:["anvil","fire"], furnace:["furnace","fire"],
  inward:["roots","plant"], outward:["thorns","plant"], hedge:["hedge","plant"],
  night:["moon","shadow"], nohide:["eye","shadow"], truename:["mask","shadow"],
  lance:["lance","shadow"], oath:["crown","shadow"], veil:["veil","shadow"],
  lostwave:["wave","water"], truewater:["mirror","water"], reading:["eye","water"],
  echo:["arcs","stone"], miner:["pick","stone"], rockname:["tablet","stone"],
  errand:["bolt","bolt"], static:["crackle","bolt"], news:["scroll","bolt"],
  highnote:["note","music"], deal:["notes2","music"], chorus:["notes3","music"],
  frostslow:["flake","ice"], tombquiet:["icicle","ice"], vigil:["candle","ice"],
  harvest:["sickle","mush"], stillgrow:["spores","mush"], saprem:["vial","mush"],
  regent:["mace","ice"], thousand:["wall","ice"], sealed:["door","ice"],
  duet:["star4","star"], unison:["heart","star"], firstnote:["starnote","star"],
};
const PACT = { oil: 1, inward: 1, oath: 1, harvest: 1 };
const ART_CACHE = {};
function cardArt(id) {
  if (ART_CACHE[id]) return ART_CACHE[id];
  const [gk, type] = CARD[id] || ["shield", "star"];
  const m = TYPE[type] ? (type === "shadow" ? R.shade : type === "stone" ? R.wood : TYPE[type].icon) : R.gold;
  const gl = GLYPH[gk](m);
  const { out, id: ids } = rasterOut(G16, G16, gl.parts || []);
  if (gl.extra) gl.extra(out, G16, G16, ids);
  return (ART_CACHE[id] = toCanvas(out, G16, G16));
}

/* ================= Full card: 56 x 84 ================= */
// layout: 3 px material frame, type band on top with icon, art window 34x34 (art x2), pips at the bottom
const CW = 56, CH = 84;
function card(id, gi = 0, o = {}) {
  const [, type] = CARD[id] || ["", "star"];
  const t = TYPE[type] || TYPE.star, gv = GRADE[gi] || GRADE[0];
  const c = canvas(CW, CH), g = c.getContext("2d");
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const night = t.day === false, star = t.day === null;
  // body
  px(1, 0, CW - 2, CH, P.ink); px(0, 1, CW, CH - 2, P.ink);
  px(1, 1, CW - 2, CH - 2, gv.mat[0]); px(2, 2, CW - 4, CH - 4, gv.mat[1]); px(3, 3, CW - 6, CH - 6, gv.mat[0]);
  const bg = night ? P.plum1 : star ? P.ink : P.cream;
  px(4, 4, CW - 8, CH - 8, bg);
  if (star) { // Estrella border: the four circle colours
    const cols = [P.ember4, P.sea3, P.sea2, P.glim1];
    for (let i = 0; i < CW - 8; i++) { px(4 + i, 4, 1, 1, cols[(i >> 3) % 4]); px(4 + i, CH - 5, 1, 1, cols[((i >> 3) + 2) % 4]); }
    for (let i = 0; i < CH - 8; i++) { px(4, 4 + i, 1, 1, cols[((i >> 3) + 1) % 4]); px(CW - 5, 4 + i, 1, 1, cols[((i >> 3) + 3) % 4]); }
  }
  // type band
  px(5, 5, CW - 10, 11, t.ramp[1]); px(5, 15, CW - 10, 1, P.ink);
  g.drawImage(typeIcon(type), 6, 6);
  // grade pips on the band (diamonds)
  for (let i = 0; i < gv.pips; i++) { const x = CW - 9 - i * 5, y = 8; px(x + 1, y, 1, 1, gv.mat[1]); px(x, y + 1, 3, 1, gv.mat[1]); px(x + 1, y + 2, 1, 1, gv.mat[1]); px(x + 1, y + 1, 1, 1, P.cream); }
  // art window
  const ax = (CW - 36) / 2, ay = 19;
  px(ax, ay, 36, 36, P.ink);
  const win = night ? t.ramp[0] === P.ink ? P.plum2 : t.ramp[0] : t.ramp[3] === P.cream ? t.ramp[2] : t.ramp[3];
  px(ax + 1, ay + 1, 34, 34, star ? P.plum1 : win);
  // soft floor in the window
  px(ax + 1, ay + 26, 34, 9, star ? P.plum2 : t.ramp[night ? 1 : 2]);
  g.imageSmoothingEnabled = false; g.drawImage(cardArt(id), ax + 2, ay + 2, 32, 32);
  // text slot (the HTML puts the name over it) and slot dots for A / P / S
  px(6, 58, CW - 12, 1, night || star ? P.plum3 : P.fog);
  const slots = o.slot ? ["a", "p", "s"] : [];
  slots.forEach((s, i) => { const x = 20 + i * 6, on = s === o.slot; px(x, 75, 4, 4, P.ink); px(x + 1, 76, 2, 2, on ? t.sig : night || star ? P.plum2 : P.fog); });
  // Pacto: a split seam down the art window (more power, a price)
  if (PACT[id]) { for (let y = ay + 1; y < ay + 35; y += 2) px(ax + 34, y, 1, 1, P.ember1); px(ax + 30, ay + 2, 4, 4, P.ember1); px(ax + 31, ay + 3, 2, 2, P.ember4); }
  return c;
}

/* ================= Card-use animations =================
   style: what the attacker does and what the effect layer draws.
   melee  lunge to the target, impact burst          shot   projectile from attacker to target
   multi  3 small shots at random foes               beam   straight beam that holds 2 frames
   wave   sweep across all foes                      quake  ground shake under all foes
   vines  something grows from the ground at target  heal   motes rise over target(s)
   shield bubble/plate on target(s)                  buff   arrows and type motes rise
   debuff dark motes fall at the target's feet       hide   attacker fades and slides
   cleanse rain falls and washes statuses off
   to: "foe" | "foes" | "ally" | "allies" | "self" */
const ANIM = {
  flash:{style:"beam",to:"foe",st:"blind"}, lantern:{style:"heal",to:"ally"}, spark:{style:"buff",to:"ally"},
  gust:{style:"multi",to:"foes",st:"slow"}, cloud:{style:"shield",to:"ally"}, rain:{style:"cleanse",to:"allies"},
  throw:{style:"shot",to:"foe",arc:1}, stubborn:{style:"melee",to:"foe"}, promise:{style:"shield",to:"allies"},
  bellows:{style:"shot",to:"foe",st:"burn"}, bread:{style:"heal",to:"allies"}, piece:{style:"melee",to:"foe",heavy:1},
  acorn:{style:"shot",to:"foe",arc:1,drain:1}, rings:{style:"vines",to:"foe",st:"slow"}, seedling:{style:"buff",to:"ally"},
  whirl:{style:"shot",to:"foe",st:"soak"}, vessel:{style:"wave",to:"foes"}, guest:{style:"heal",to:"ally"},
  yawn:{style:"debuff",to:"foe",st:"stun"}, pillow:{style:"melee",to:"foe"}, tale:{style:"heal",to:"allies"},
  street:{style:"beam",to:"foe"}, oil:{style:"heal",to:"ally",cost:1}, ration:{style:"heal",to:"allies"},
  temper:{style:"melee",to:"foe",heavy:1,st:"slow"}, anvil:{style:"shield",to:"self"}, furnace:{style:"wave",to:"foes",st:"burn"},
  inward:{style:"vines",to:"foe",drain:1}, outward:{style:"shield",to:"allies"}, hedge:{style:"vines",to:"foe",st:"trap"},
  night:{style:"hide",to:"self"}, nohide:{style:"melee",to:"foe",dash:1}, truename:{style:"debuff",to:"foe",st:"blind"},
  lance:{style:"melee",to:"foe",dash:1,heavy:1}, oath:{style:"buff",to:"self"}, veil:{style:"hide",to:"ally"},
  lostwave:{style:"wave",to:"foes"}, truewater:{style:"buff",to:"ally"}, reading:{style:"buff",to:"self"},
  echo:{style:"buff",to:"self",echo:1}, miner:{style:"quake",to:"foes",st:"slow"}, rockname:{style:"debuff",to:"foe",st:"stun",ring:1},
  errand:{style:"melee",to:"foe",dash:1}, static:{style:"buff",to:"ally"}, news:{style:"debuff",to:"foe",st:"marked"},
  highnote:{style:"shot",to:"foe",ring:1,st:"stun"}, deal:{style:"debuff",to:"foe"}, chorus:{style:"buff",to:"allies"},
  frostslow:{style:"shot",to:"foe",st:"slow"}, tombquiet:{style:"shield",to:"self"}, vigil:{style:"heal",to:"ally"},
  harvest:{style:"melee",to:"foe",heavy:1,drain:1}, stillgrow:{style:"debuff",to:"foes",st:"slow"}, saprem:{style:"cleanse",to:"ally"},
  regent:{style:"melee",to:"foe",heavy:1,st:"slow"}, thousand:{style:"shield",to:"allies"}, sealed:{style:"debuff",to:"foe",st:"seal"},
  duet:{style:"beam",to:"foe",st:"blind"}, unison:{style:"heal",to:"allies"}, firstnote:{style:"shield",to:"allies"},
};
const DUR = { melee: 0.9, shot: 1.0, multi: 1.1, beam: 1.0, wave: 1.2, quake: 1.1, vines: 1.1, heal: 1.1, shield: 1.0, buff: 1.0, debuff: 1.1, hide: 1.2, cleanse: 1.2 };
function anim(id) { return ANIM[id] || { style: "melee", to: "foe" }; }
const stepT = (t, fps, dur) => Math.floor(t * dur * fps) / (dur * fps); // pixel art moves in steps

// attacker body offset for the card use (12 fps steps): anticipation squash, stretch, return
function pose(id, t, dir = 1) {
  const a = anim(id), s = a.style; t = stepT(t, 12, DUR[s] || 1);
  if (s === "melee") {
    const reach = a.dash ? 1 : .7;
    if (t < .15) return { dx: -2 * dir, dy: 0, sq: 1 };
    if (t < .45) return { dx: dir * reach * (t - .15) / .3, rel: 1, dy: -2, sq: 0 };
    if (t < .6) return { dx: dir * reach, rel: 1, dy: 0, sq: 1 };
    return { dx: dir * reach * (1 - (t - .6) / .4), rel: 1, dy: 0, sq: 0 };
  }
  if (s === "hide") return { dx: 0, dy: 0, sq: 0, alpha: t < .3 ? 1 - t / .3 : t > .75 ? (t - .75) / .25 : 0 };
  if (s === "quake") return { dx: 0, dy: t < .3 ? -Math.round(6 * t / .3) : t < .4 ? 0 : 0, sq: t >= .3 && t < .45 ? 1 : 0 };
  if (t < .2) return { dx: -dir, dy: 0, sq: 1 };
  if (t < .35) return { dx: dir * 2, dy: -1, sq: 0, flash: s === "beam" };
  return { dx: 0, dy: 0, sq: 0 };
}

// type particle at x,y (low res), phase k 0..1
function mote(g, type, x, y, k, big) {
  const t = TYPE[type] || TYPE.star, c = t.ramp, px = (a, b, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(Math.round(a), Math.round(b), w, h); };
  switch (t.fx) {
    case "rise-zig": px(x, y, c[3 - Math.min(3, (k * 4) | 0)], big ? 2 : 1, big ? 2 : 1); break;
    case "fall-sway": px(x, y, c[2], 2, 1); px(x + 1, y + 1, c[0]); break;
    case "rise-twinkle": if (((k * 8) | 0) % 2) px(x, y, c[3]); else { px(x - 1, y, c[1]); px(x + 1, y, c[1]); px(x, y - 1, c[1]); px(x, y + 1, c[1]); px(x, y, c[3]); } break;
    case "zigzag": px(x, y, P.butter); px(x + 1, y + 1, P.sea3); px(x + 2, y, P.butter); break;
    case "streak": for (let s = 0; s < 5; s++) px(x - s, y, s < 2 ? c[3] : c[1]); break;
    case "ring": px(x, y, c[2], 2, 2); px(x + 1, y - 3, c[2], 1, 3); break;
    case "drip": px(x, y, c[2]); px(x, y - 1, c[3]); break;
    case "dust": px(x, y, c[(k * 3) | 0 % 4] || c[1], 2, 2); break;
    case "mist": for (let s = 0; s < 6; s++) if ((s + ((k * 10) | 0)) % 3) px(x + s, y, c[3]); break;
    case "flake": px(x, y, c[3]); px(x - 1, y, c[1]); px(x + 1, y, c[1]); px(x, y - 1, c[1]); px(x, y + 1, c[1]); break;
    case "spore": px(x, y, ((k * 6) | 0) % 2 ? c[3] : c[2]); break;
    case "bubble": px(x - 1, y, c[2]); px(x + 1, y, c[2]); px(x, y - 1, c[2]); px(x, y + 1, c[2]); break;
    default: { const cols = [P.ember4, P.sea3, P.rose2, P.glim1]; px(x, y, cols[((x + y) | 0) & 3]); px(x + 1, y, P.cream); }
  }
}
// impact burst: radial pixels, 3 steps
function burst(g, type, x, y, k) {
  const t = TYPE[type] || TYPE.star, r = 3 + k * 10, n = 10;
  for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; g.fillStyle = i % 2 ? t.ramp[3] : t.sig; g.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * .8), k < .6 ? 3 : 2, k < .6 ? 3 : 2); }
  if (k < .4) { g.fillStyle = P.ink; g.fillRect(Math.round(x) - 4, Math.round(y) - 4, 9, 9); g.fillStyle = P.cream; g.fillRect(Math.round(x) - 3, Math.round(y) - 3, 7, 7); }
}
function statusMark(g, st, x, y, k) {
  const px = (a, b, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(Math.round(a), Math.round(b), w, h); };
  const yy = y - k * 4, ink = (a, b, w, h) => px(a - 1, b - 1, P.ink, w + 2, h + 2);
  switch (st) {
    case "blind": ink(x - 4, yy, 9, 1); ink(x, yy - 4, 1, 9); px(x - 4, yy, P.cream, 9, 1); px(x, yy - 4, P.cream, 1, 9); px(x, yy, P.ember4); break;
    case "burn": for (let i = 0; i < 3; i++) { const b = yy - ((i + (k * 6 | 0)) % 2); ink(x - 4 + i * 4, b, 2, 3); px(x - 4 + i * 4, b, P.ember2, 2, 3); px(x - 4 + i * 4, b, P.ember4); } break;
    case "soak": [[-3, 0], [3, 1], [0, -3]].forEach(([a, b]) => { ink(x + a, yy + b, 2, 2); px(x + a, yy + b, P.sea2, 2, 2); px(x + a, yy + b, P.sea4); }); break;
    case "slow": ink(x - 4, yy, 8, 1); ink(x - 4, yy + 3, 5, 1); px(x - 4, yy, P.mist, 8, 1); px(x - 4, yy + 3, P.mist, 5, 1); break;
    case "stun": for (let i = 0; i < 3; i++) { const a = k * 8 + i * 2.1, sx = x + Math.cos(a) * 7, sy = yy + Math.sin(a) * 3; ink(sx, sy, 2, 2); px(sx, sy, P.ember4, 2, 2); } break;
    case "trap": ink(x - 6, y + 4, 13, 1); px(x - 6, y + 4, P.moss2, 13, 1); [-5, 0, 5].forEach((a) => { ink(x + a, y, 1, 4); px(x + a, y, P.moss3, 1, 4); }); break;
    case "marked": ink(x - 3, yy - 3, 7, 7); px(x - 3, yy - 3, P.ember2, 7, 7); px(x - 2, yy - 2, P.cream, 5, 5); px(x - 1, yy - 1, P.ember2, 3, 3); px(x, yy, P.cream); break;
    case "seal": ink(x - 3, yy, 7, 5); px(x - 3, yy, P.sea4, 7, 5); px(x - 2, yy - 3, P.sea4, 1, 3); px(x + 2, yy - 3, P.sea4, 1, 3); px(x - 1, yy - 4, P.sea4, 3, 1); px(x, yy + 2, P.ink); break;
  }
}
// Draw the effect layer. from: {x,y} attacker centre, to: {x,y} main target centre, targets: [{x,y}] all targets.
// type: the card's type. t: 0..1 over DUR[style] seconds.
function fx(g, id, t, from, to, targets) {
  const a = anim(id), type = (CARD[id] || [, "star"])[1], ty = TYPE[type] || TYPE.star, d = DUR[a.style] || 1;
  t = stepT(t, 12, d); targets = targets && targets.length ? targets : [to];
  const px = (x, y, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const hitAt = { melee: .45, shot: .55, multi: .6, beam: .35, wave: .55, quake: .4, vines: .5, debuff: .5 }[a.style];
  switch (a.style) {
    case "melee": if (t >= .45 && t < .75) burst(g, type, to.x, to.y, (t - .45) / .3); if (a.heavy && t >= .45 && t < .6) px(to.x - 10, to.y + 10, ty.sig, 20, 1); break;
    case "shot": case "multi": {
      const list = a.style === "multi" ? targets.concat(targets).slice(0, 3) : [to];
      list.forEach((tg, i) => {
        const t0 = .2 + i * .1, k = (t - t0) / .35;
        if (k > 0 && k < 1) { const x = from.x + (tg.x - from.x) * k, y = from.y + (tg.y - from.y) * k - (a.arc ? Math.sin(k * Math.PI) * 14 : 0);
          if (a.ring) { for (let j = 0; j < 8; j++) { const an = j * Math.PI / 4; px(x + Math.cos(an) * 3, y + Math.sin(an) * 3, ty.ramp[2]); } }
          else { const dir = Math.sign(tg.x - from.x) || 1, sz = a.style === "multi" ? 3 : 5;
            for (let j = 1; j <= 3; j++) mote(g, type, x - dir * (sz + j * 4), y + (j % 2 ? -1 : 1), (k + j * .2) % 1);
            px(x - sz / 2 - 1, y - sz / 2 - 1, P.ink, sz + 2, sz + 2); px(x - sz / 2, y - sz / 2, ty.sig, sz, sz); px(x - sz / 2, y - sz / 2, ty.ramp[3], 2, 1); } }
        if (k >= 1 && k < 1.6) burst(g, type, tg.x, tg.y, (k - 1) / .6);
      });
      break; }
    case "beam": if (t >= .3 && t < .6) { const y = from.y; const x0 = Math.min(from.x, to.x), x1 = Math.max(from.x, to.x);
        px(x0, y - 2, ty.ramp[2], x1 - x0, 5); px(x0, y - 1, P.cream, x1 - x0, 3); if (type === "star") [P.ember4, P.sea3, P.rose2, P.glim1].forEach((c2, i) => px(x0, y - 3 + i * 2 + (i > 1 ? 1 : 0), c2, x1 - x0, 1)); }
      if (t >= .35 && t < .75) { const k = (t - .35) / .4; px(to.x - 1, to.y - 8 - k * 4, P.cream, 3, 17 + k * 8); px(to.x - 8 - k * 4, to.y - 1, P.cream, 17 + k * 8, 3); } break;
    case "wave": { const k = (t - .2) / .6; if (k > 0 && k < 1) { const minX = Math.min(...targets.map((p) => p.x)) - 20, maxX = Math.max(...targets.map((p) => p.x)) + 20; const x = minX + (maxX - minX) * k, base = Math.max(...targets.map((p) => p.y)) + 13;
        for (let i = 0; x - i > minX - 6 && i < 60; i++) { const crest = i < 10 ? Math.sin((i / 10) * Math.PI / 2) : 1, h = Math.round((14 - (i > 10 ? (i - 10) * .12 : 0)) * crest + Math.sin((x - i) * .5) * 2); if (h <= 0) continue;
          px(x - i, base - h, P.ink); px(x - i, base - h + 1, i < 3 ? ty.ramp[3] : ty.ramp[2], 1, h - 1); if ((x - i) % 3 === 0) px(x - i, base - h + 1, ty.ramp[3]); }
        for (let i = 0; i < 5; i++) mote(g, type, x - 2 - i * 5, base - 18 - (i % 2) * 4, k); } break; }
    case "quake": if (t >= .38 && t < .9) targets.forEach((tg) => { const k = (t - .38) / .52; px(tg.x - 14, tg.y + 13, P.ink, 28, 1);
        for (let j = 0; j < 7; j++) { const x = tg.x - 13 + j * 4, up = Math.sin(k * Math.PI + j * .9) * (8 + (j % 3) * 3); if (up > 0) px(x, tg.y + 12 - up, ty.ramp[1 + (j % 3)], 3, 3); }
        if (k < .5) for (let j = -1; j <= 1; j += 2) { px(tg.x + j * (6 + k * 20), tg.y + 12, ty.ramp[3], 3, 1); } }); break;
    case "vines": if (t >= .25) { const k = Math.min(1, (t - .25) / .3), fade = t > .8; if (!fade) for (const dx of [-7, 0, 6]) { const h = Math.round(18 * k * (dx === 0 ? 1 : .7)); px(to.x + dx, to.y + 12 - h, P.ink, 3, h); px(to.x + dx + 1, to.y + 12 - h + 1, a.drain ? P.ember1 : ty.ramp[2], 1, h - 1); px(to.x + dx, to.y + 12 - h, ty.ramp[3], 2, 1); }
      if (a.drain && t > .6) { const k2 = (t - .6) / .4; for (let i = 0; i < 3; i++) px(to.x + (from.x - to.x) * k2 + i * 3, to.y + (from.y - to.y) * k2 - i * 2, P.ember2, 2, 2); } } break;
    case "heal": case "buff": targets.forEach((tg, j) => { for (let i = 0; i < 6; i++) { const ph = ((t * 1.4 + i / 6 + j * .13) % 1); const x = tg.x - 9 + ((i * 7 + j * 3) % 18), y = tg.y + 10 - ph * 26;
        if (a.style === "heal") { px(x - 2, y, P.ink, 5, 1); px(x, y - 2, P.ink, 1, 5); px(x - 1, y, P.moss3, 3, 1); px(x, y - 1, P.moss3, 1, 3); px(x, y, P.cream); } else mote(g, type, x, y, ph); }
      if (a.style === "buff" && t > .3 && t < .9) { const y = tg.y - 16 - (t - .3) * 6; px(tg.x, y, ty.sig); px(tg.x - 1, y + 1, ty.sig, 3, 1); px(tg.x - 2, y + 2, ty.sig, 5, 1); px(tg.x, y + 3, ty.sig, 1, 3); }
      if (a.echo && t > .5) for (let i = 0; i < 6; i++) { const an = -1 + i * .4; px(tg.x + Math.cos(an) * (14 + (t - .5) * 20), tg.y + Math.sin(an) * 10, P.glim1); } });
      if (a.cost && t < .4) for (let i = 0; i < 3; i++) px(from.x - 4 + i * 4, from.y + t * 20, P.ember1, 2, 2); break;
    case "shield": targets.forEach((tg) => { const k = Math.min(1, t / .35), r = 14 * k; for (let i = 0; i < 24; i++) { const an = i * Math.PI / 12; px(tg.x + Math.cos(an) * r, tg.y + Math.sin(an) * r * .9, (i + (t * 12 | 0)) % 6 ? ty.ramp[2] : P.cream); }
        if (t > .35 && t < .6) for (let i = -1; i <= 1; i++) px(tg.x - 8 + (t - .35) * 64 + i, tg.y - 10 + i * 6, P.cream, 2, 2); }); break;
    case "debuff": targets.forEach((tg) => { for (let i = 0; i < 6; i++) { const ph = ((t * 1.3 + i / 6) % 1), x = tg.x - 8 + (i * 5) % 16, y = tg.y - 14 + ph * 26; px(x, y, i % 2 ? P.plum2 : P.plum3, 2, 1); }
        if (a.ring && t < .5) { const r = 4 + t * 40; for (let i = 0; i < 16; i++) { const an = i * Math.PI / 8; px(from.x + Math.cos(an) * r, from.y + Math.sin(an) * r * .7, P.glim1); } }
        if (t > .45) statusMark(g, a.st, tg.x, tg.y - 16, (t - .45) / .55);
        px(tg.x - 9, tg.y + 12, P.plum1, 18, 2); }); break;
    case "hide": targets.forEach((tg) => { for (let i = 0; i < 4; i++) mote(g, "shadow", tg.x - 12 + i * 5 + t * 10, tg.y + 4 - i * 4, t); }); break;
    case "cleanse": targets.forEach((tg, j) => { for (let i = 0; i < 7; i++) { const ph = ((t * 1.6 + i / 7 + j * .2) % 1), x = tg.x - 9 + (i * 5) % 18, y = tg.y - 24 + ph * 30; px(x, y, P.sea3); px(x, y - 1, P.sea4); }
        if (t > .55) { const k = (t - .55) / .45; px(tg.x - 6, tg.y - 16 - k * 6, P.cream, 2, 2); px(tg.x + 5, tg.y - 14 - k * 8, P.cream, 2, 2); } }); break;
  }
  // status mark after the hit for damage cards
  if (hitAt != null && a.st && a.style !== "debuff" && t > hitAt + .15) targets.slice(0, a.style === "shot" || a.style === "melee" || a.style === "beam" || a.style === "vines" ? 1 : 3).forEach((tg) => statusMark(g, a.st, tg.x, tg.y - 16, (t - hitAt - .15) / (1 - hitAt)));
}
// when does the target flash (cream silhouette + 2 px knockback)? null = it doesn't get hit
function hitWindow(id) { const s = anim(id).style; return { melee: [.45, .62], shot: [.55, .72], multi: [.55, .85], beam: [.35, .6], wave: [.45, .75], quake: [.4, .7], vines: [.45, .65], debuff: [.5, .62] }[s] || null; }

root.EVS = { P, R, TYPE, GRADE, KINDS, KIND_TYPE, SPEC, sprite, silhouette, hovers, typeIcon, cardArt, card, CARD, PACT, ANIM, DUR, anim, pose, fx, hitWindow, mote, CW, CH };
})(typeof window !== "undefined" ? window : globalThis);
