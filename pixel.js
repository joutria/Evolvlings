/* Evolvlings pixel engine: Glimmer-32 palette, procedural sprites, eggs, palette snapping and pixel frames. */
(function (root) {
"use strict";
/* ================= Palette: Glimmer-32 ================= */
const P = {
  ink:"#1d1626", plum1:"#2e2440", plum2:"#4a3d5e", plum3:"#6e6283", mist:"#9d93ad", fog:"#d2cbd9", cream:"#fbf6ef",
  moss0:"#1f3b35", moss1:"#2f5e3f", moss2:"#4f8a46", moss3:"#86b85a", moss4:"#c4df7f",
  sea0:"#1f2f5c", sea1:"#2f5d96", sea2:"#3f93c4", sea3:"#7cc8e3", sea4:"#c8eef5",
  ember0:"#5c1f2e", ember1:"#a3343b", ember2:"#e0603f", ember3:"#f39a52", ember4:"#ffd57a",
  soil0:"#3d2a2a", soil1:"#6b4a3a", soil2:"#a07a55", soil3:"#d0ad7a", butter:"#fff0b8",
  rose0:"#7a3a6e", rose1:"#c25e9a", rose2:"#f4a6c4", glim0:"#8a5fc4", glim1:"#c7a6ff"
};
const RAMP = {
  gold:[P.ember3,P.ember4,P.butter,P.cream], lilac:[P.glim0,P.glim1,P.fog,P.cream],
  stone:[P.plum3,P.mist,P.fog,P.cream], moss:[P.moss1,P.moss2,P.moss3,P.moss4],
  sky:[P.sea2,P.sea3,P.sea4,P.cream], sun:[P.ember3,P.ember4,P.butter,P.cream],
  ember:[P.ember1,P.ember2,P.ember3,P.ember4], bark:[P.soil0,P.soil1,P.soil2,P.soil3],
  leaf:[P.moss0,P.moss1,P.moss2,P.moss3], rock:[P.plum2,P.plum3,P.mist,P.fog]
};

/* ================= Hand-drawn grids ================= */
const ICONS = {
  chispa:{ rows:["...o...","..oao..",".oalao.","oalllao",".oalao.","..oao..","...o..."], k:{o:P.ink,a:P.ember4,l:P.cream} },
  cursor:{ rows:["oo.....","oaoo...","oaaaoo.","oaaaaao","oaaaoo.","oaoo...","oo....."], k:{o:P.ink,a:P.ember2} },
  heart:{ rows:[".oo.oo.","oaloaao","oaaaaao","oaaaaao",".oaaao.","..oao..","...o..."], k:{o:P.ink,a:P.rose1,l:P.cream} },
  luz:{ rows:[".........","....o....","...oao...",".ooalaoo.","oaalllaao",".ooalaoo.","...oao...","....o....","........."], k:{o:P.ink,a:P.ember4,l:P.cream} },
  nube:{ rows:[".........",".........","...ooo...","..olllo..",".oollllo.","olllllllo","oaaaaaaao",".ooooooo.","........."], k:{o:P.ink,a:P.sea3,l:P.cream} },
  piedra:{ rows:[".........","...ooo...","..ollao..",".ollaaao.","ollaaaado","olaaaaddo","oaaaadddo",".ooooooo.","........."], k:{o:P.ink,l:P.fog,a:P.mist,d:P.plum3} },
  musgo:{ rows:["....o....","...olo...","..ollao..",".olldaao.",".oladdao.",".oaadaao.","..oadao..","...odo...","....o...."], k:{o:P.ink,l:P.moss4,a:P.moss3,d:P.moss1} },
  agua:{ rows:["....o....","...olo...","...olo...","..ollao..",".ollaaao.",".olaaaao.",".oaaaado.","..oaddo..","...ooo..."], k:{o:P.ink,l:P.sea4,a:P.sea2,d:P.sea1} },
  brasa:{ rows:["...o.....","...oo....","..oao.o..","..oaaoao.",".oaalaao.",".oallaao.","oaalllao.",".oallao..","..oooo..."], k:{o:P.ink,l:P.ember4,a:P.ember2,d:P.ember1} },
  sign:{ rows:["..........","..........",".oooooooo.","ollllllldo","olaaaaaado","oddddddddo",".oooaaooo.","....oao...","....oao...","....oao...","....odo...","...oooooo.","..........","..........","..........",".........."], k:{o:P.ink,l:P.soil3,a:P.soil2,d:P.soil1} }
};
function bake(rows, keys) {
  const c = document.createElement("canvas");
  c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext("2d");
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (keys[ch]) { g.fillStyle = keys[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
}
const ICON = {};
for (const k in ICONS) ICON[k] = bake(ICONS[k].rows, ICONS[k].k);

/* ================= Procedural sprite engine ================= */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// parts: {cx,cy,rx,ry,ramp,group,z,spec}
function raster(W, H, parts, extra) {
  const id = new Int16Array(W * H).fill(-1), col = new Array(W * H).fill(null);
  parts.forEach((p, i) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const nx = (x + .5 - p.cx) / p.rx, ny = (y + .5 - p.cy) / p.ry, d2 = nx * nx + ny * ny;
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
    const me = id[y * W + x], n = [g(x+1,y), g(x-1,y), g(x,y+1), g(x,y-1)];
    if (me < 0) { if (n.some(v => v >= 0)) out[y * W + x] = P.ink; continue; }
    const mp = parts[me];
    if (n.some(v => v >= 0 && parts[v].group !== mp.group && (parts[v].z || 0) > (mp.z || 0))) out[y * W + x] = P.ink;
  }
  if (extra) extra(out, W, H, id, parts);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const cx = c.getContext("2d");
  for (let i = 0; i < W * H; i++) if (out[i]) { cx.fillStyle = out[i]; cx.fillRect(i % W, (i / W) | 0, 1, 1); }
  return c;
}
function line(out, W, x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (;;) { out[y0 * W + x0] = c; if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
const put = (out, W, x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W) out[y * W + x] = c; };

// face drawing, symmetric around center column cx (between pixels when even)
function face(out, W, f, n, emo, body) {
  const ew = n >= 32 ? 3 : 2, eh = n >= 32 ? 4 : n >= 24 ? 3 : 2;
  const c = W / 2, gap = Math.max(2, Math.round(n * .13));
  const ey = Math.round(f.ey);
  const eyesL = Math.round(c - gap - ew), eyesR = Math.round(c + gap);
  const drawEye = (x0, flip) => {
    if (emo === "happy") {
      for (let i = 0; i <= ew; i++) put(out, W, x0 + i - (flip ? 1 : 0) + (flip ? 1 : 0), ey + (i === 0 || i === ew ? 1 : 0), P.ink);
      return;
    }
    if (emo === "sleep") { for (let i = 0; i < ew + 1; i++) put(out, W, x0 + i - (flip ? 1 : 0), ey + eh - 1, P.ink); return; }
    const top = emo === "sad" ? 1 : 0, h = emo === "surprised" ? eh + 1 : eh, y0 = emo === "surprised" ? ey - 1 : ey;
    for (let y = top; y < h; y++) for (let x = 0; x < ew; x++) put(out, W, x0 + x, y0 + y, P.ink);
    put(out, W, x0 + (flip ? ew - 1 : 0), y0 + top, P.cream);
    if (emo === "sad") put(out, W, x0 + (flip ? ew : -1), y0 + h, P.sea3);
  };
  drawEye(eyesL, false); drawEye(eyesR, true);
  // cheeks
  if (f.cheek !== false && emo !== "sad") { put(out, W, eyesL - 1, ey + eh, P.rose2); put(out, W, eyesL - 2 + (n < 24 ? 1 : 0), ey + eh, P.rose2); put(out, W, eyesR + ew, ey + eh, P.rose2); put(out, W, eyesR + ew + 1 - (n < 24 ? 1 : 0), ey + eh, P.rose2); }
  // mouth
  const my = ey + eh + (n >= 32 ? 2 : 1), m0 = Math.floor(c) - 1;
  if (emo === "normal") { put(out, W, m0 - 1, my, P.ink); put(out, W, m0 + 2, my, P.ink); put(out, W, m0, my + 1, P.ink); put(out, W, m0 + 1, my + 1, P.ink); }
  else if (emo === "happy" || emo === "surprised") { for (let x = 0; x < 2; x++) { put(out, W, m0 + x, my, P.ink); put(out, W, m0 + x, my + 1, emo === "happy" ? P.rose1 : P.ink); } if (emo === "happy") { put(out, W, m0 - 1, my, P.ink); put(out, W, m0 + 2, my, P.ink); } }
  else if (emo === "sad") { put(out, W, m0, my, P.ink); put(out, W, m0 + 1, my, P.ink); put(out, W, m0 - 1, my + 1, P.ink); put(out, W, m0 + 2, my + 1, P.ink); }
  else { put(out, W, m0, my, P.ink); put(out, W, m0 + 1, my, P.ink); }
}

// species specs: n = grid size, st = stage 0..2, sq = squash 0/1
const SPEC = {
  lumo(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .07, cy = n * (.62 + sq * .03) + 1, rx = n * .3 * s, ry = n * .3 / s;
    const wr = [.16, .19, .23][st], wh = [.2, .24, .3][st];
    const parts = [
      { cx: c - n * .33, cy: n * .5 + 1 + sq, rx: n * wr, ry: n * wh, ramp: R.lilac, group: "w", z: 0, spec: false },
      { cx: c + n * .33, cy: n * .5 + 1 + sq, rx: n * wr, ry: n * wh, ramp: R.lilac, group: "w", z: 0, spec: false },
      { cx: c, cy, rx, ry, ramp: R.gold, group: "b", z: 1 },
    ];
    const br = Math.max(1.3, n * (st === 2 ? .09 : .06)), by = n * .14 + 1 + sq;
    parts.push({ cx: c - n * .2, cy: by, rx: br, ry: br, ramp: st === 2 ? R.sun : R.gold, group: "a", z: 2, spec: false, flat: st === 2 ? 2 : 1 });
    parts.push({ cx: c + n * .2, cy: by, rx: br, ry: br, ramp: st === 2 ? R.sun : R.gold, group: "a", z: 2, spec: false, flat: st === 2 ? 2 : 1 });
    return { parts, ey: cy - ry * .2, extra(out, W) {
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
    return { parts, ey: cy - ry * .15, extra(out, W, H, id) {
      const r = rng(n * 7 + st);
      [[.28, .8], [.72, .72], [.6, .86], [.2, .66]].forEach(([fx, fy]) => { const x = Math.round(fx * n + 1), y = Math.round(fy * n * (1 - sq * .02) + 1); if (id[y * W + x] === 2) put(out, W, x, y, P.plum3); });
      if (st === 2) { put(out, W, c - .5, cy - ry * .85 - n * .12 - 1, P.moss3); put(out, W, c - .5, cy - ry * .85 - n * .12, P.moss1); put(out, W, c + .5, cy - ry * .85 - n * .12 - 2, P.moss4); put(out, W, c - .5, cy - ry * .85 - n * .12 - 2, P.ink); put(out, W, c + 1.5, cy - ry * .85 - n * .12 - 2, P.ink); put(out, W, c + .5, cy - ry * .85 - n * .12 - 3, P.ink); }
    } };
  },
  fizz(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .06, cy = n * (.62 + sq * .03) + 1;
    const parts = [];
    if (st === 2) parts.push({ cx: c + n * .3, cy: n * .24 + 1, rx: n * .14, ry: n * .14, ramp: R.sun, group: "s", z: 0 });
    const bumps = [[-.22, .45, .17], [.13, .39, .2], [-.33, .66, .12], [.33, .64, .13]];
    if (st >= 1) bumps.push([-.02, .33, .14]);
    bumps.forEach(([dx, y, r]) => parts.push({ cx: c + dx * n * s, cy: y * n + 1 + sq * n * .03, rx: r * n, ry: r * n / s, ramp: R.sky, group: "b", z: 1, spec: false }));
    parts.push({ cx: c, cy, rx: n * .38 * s, ry: n * .27 / s, ramp: R.sky, group: "b", z: 1 });
    return { parts, ey: cy - n * .08, extra(out, W) {
      if (st === 2) { const sx = c + n * .3, sy = n * .24 + 1, r = n * .14 + 2; [[0,-1],[1,0],[0,1],[-1,0]].forEach(([a,b]) => put(out, W, sx + a * r - .5, sy + b * r - .5, P.ember4)); }
    } };
  },
  chispon(n, st, sq) {
    const c = n / 2 + 1, s = 1 + sq * .07, cy = n * (.64 + sq * .03) + 1, rx = n * .33 * s, ry = n * .28 / s;
    const parts = [
      { cx: c + n * .34, cy: n * .78 + 1, rx: n * .14, ry: n * .08, ramp: R.ember, group: "t", z: 0 },
      { cx: c - n * .1, cy: n * .3 + 1 + sq, rx: n * .12, ry: n * .16, ramp: R.sun, group: "f", z: 0, spec: false },
      { cx: c + n * .08, cy: n * .24 + 1 + sq, rx: n * .1, ry: n * .18, ramp: R.sun, group: "f", z: 0, spec: false },
      { cx: c, cy, rx, ry, ramp: R.ember, group: "b", z: 1 },
      { cx: c - n * .2, cy: n * .9 + 1, rx: n * .09, ry: n * .06, ramp: R.ember, group: "l", z: 0, flat: 0 },
      { cx: c + n * .2, cy: n * .9 + 1, rx: n * .09, ry: n * .06, ramp: R.ember, group: "l", z: 0, flat: 0 },
    ];
    return { parts, ey: cy - ry * .2, cheek: false };
  },
  tree(n) {
    const c = n / 2 + 1;
    return { parts: [
      { cx: c, cy: n * .9 + 1, rx: n * .14, ry: n * .16, ramp: R.bark, group: "t", z: 0, flat: 1 },
      { cx: c, cy: n * .42 + 1, rx: n * .47, ry: n * .42, ramp: R.leaf, group: "c", z: 1 },
    ], face: false };
  },
  rock(n) { const c = n / 2 + 1; return { parts: [{ cx: c, cy: n * .66 + 1, rx: n * .36, ry: n * .27, ramp: R.rock, group: "r", z: 0 }], face: false }; }
};
/* ================= Faded ramps (poorly cared-for adults) ================= */
let R = RAMP;
const DULL = Object.assign({}, RAMP, {
  gold: [P.soil1, P.soil2, P.soil3, P.fog], lilac: [P.plum3, P.mist, P.fog, P.fog],
  stone: [P.plum2, P.plum3, P.mist, P.fog], moss: [P.soil1, P.soil2, P.soil3, P.fog],
  sky: [P.plum3, P.mist, P.fog, P.fog], sun: [P.soil2, P.soil3, P.fog, P.fog],
});
const CACHE = new Map();
// kind: lumo | pebb | fizz | tree | rock · n: grid size · st: stage 0..2 · sq: squash frame 0/1
// emo: normal | happy | sad | surprised | sleep
function sprite(kind, n, st = 0, sq = 0, emo = "normal", dull = false) {
  const key = [kind, n, st, sq, emo, dull ? 1 : 0].join(":");
  if (CACHE.has(key)) return CACHE.get(key);
  R = dull ? DULL : RAMP;
  const sp = SPEC[kind](n, st, sq);
  R = RAMP;
  const W = n + 2, H = n + 2;
  const c = raster(W, H, sp.parts, (out, W, H, id, parts) => {
    if (sp.extra) sp.extra(out, W, H, id, parts);
    if (sp.face !== false) face(out, W, { ey: sp.ey, cheek: dull ? false : sp.cheek }, n, emo);
  });
  CACHE.set(key, c); return c;
}

/* ================= Eggs ================= */
const EGG = { lumo: "gold", pebb: "stone", fizz: "sky" };
function egg(kind, n, crack = 0) {
  const lvl = crack > 0.65 ? 2 : crack > 0.3 ? 1 : 0;
  const key = ["egg", kind, n, lvl].join(":");
  if (CACHE.has(key)) return CACHE.get(key);
  const W = Math.round(n * 0.8) + 2, H = n + 2, cx = W / 2;
  const parts = [
    { cx, cy: H * 0.56, rx: n * 0.38, ry: n * 0.42, ramp: RAMP[EGG[kind]], group: "e", z: 0 },
    { cx, cy: H * 0.38, rx: n * 0.3, ry: n * 0.32, ramp: RAMP[EGG[kind]], group: "e", z: 0 },
  ];
  const c = raster(W, H, parts, (out, W, H, id) => {
    const inside = (x, y) => { x = Math.round(x); y = Math.round(y); return id[y * W + x] >= 0 && out[y * W + x] !== P.ink; };
    const dot = (x, y, col) => { if (inside(x, y)) put(out, W, x, y, col); };
    const r = rng(n * 13 + kind.length);
    if (kind === "lumo") for (const [fx, fy, s] of [[.34, .3, 1], [.62, .44, 2], [.42, .66, 1], [.7, .74, 1], [.26, .78, 1]]) {
      const x = fx * W, y = fy * H; for (let dy = -s + 1; dy < s; dy++) for (let dx = -s + 1; dx < s; dx++) dot(x + dx, y + dy, P.ember3); dot(x - s + 1, y - s + 1, P.butter);
    }
    else if (kind === "pebb") { const y = Math.round(H * 0.58); for (let x = 0; x < W; x++) { dot(x, y, P.plum3); dot(x, y + 1, P.plum3); } for (let i = 0; i < n; i++) dot(r() * W, r() * H, P.plum3); }
    else for (const [fx, fy] of [[.38, .32], [.62, .54], [.4, .76]]) { const x = fx * W, y = fy * H; for (let a = 0; a < 5; a++) dot(x + Math.cos(a * 1.1) * 2.5, y + Math.sin(a * 1.1) * 2.5, P.cream); }
    if (lvl) {
      const y0 = Math.round(H * 0.47); let y = y0;
      const x1 = lvl === 2 ? W * 0.86 : W * 0.6;
      for (let x = Math.round(W * 0.18); x < x1; x++) { if (inside(x, y)) put(out, W, x, y, P.ink); y = y0 + ((Math.floor(x / 2) % 2) ? -1 : 1); }
    }
  });
  CACHE.set(key, c); return c;
}

/* ================= Palette snapping for vector drawings ================= */
const PL = Object.values(P).map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const LUT = new Uint8Array(1 << 18);
function nearest(r, g, b) {
  const k = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
  const v = LUT[k]; if (v) return v - 1;
  let bi = 0, bd = Infinity;
  for (let i = 0; i < PL.length; i++) { const p = PL[i], dr = r - p[0], dg = g - p[1], db = b - p[2], d = 2 * dr * dr + 4 * dg * dg + 3 * db * db; if (d < bd) { bd = d; bi = i; } }
  LUT[k] = bi + 1; return bi;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// snap every pixel of a small canvas to Glimmer-32 (with a light ordered dither for gradients)
function quantize(g, w, h, dither = true) {
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
    let r = d[i], gg = d[i + 1], b = d[i + 2];
    if (dither) { const o = (BAYER[((y & 3) << 2) | (x & 3)] - 7.5) * 1.3; r = Math.max(0, Math.min(255, r + o)); gg = Math.max(0, Math.min(255, gg + o)); b = Math.max(0, Math.min(255, b + o)); }
    const p = PL[nearest(r | 0, gg | 0, b | 0)];
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
}
// a small offscreen canvas drawn at low resolution and blown up without smoothing
function layer(w, h) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true }); g.imageSmoothingEnabled = false;
  return { c, g, w, h };
}
function blit(dst, L, dw, dh) { dst.save(); dst.imageSmoothingEnabled = false; dst.drawImage(L.c, 0, 0, dw, dh); dst.restore(); }
const rect = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
function disc(g, cx, cy, r, col) { g.fillStyle = col; for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y + r * 0.6)); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } }
function white(src) { const c = document.createElement("canvas"); c.width = src.width; c.height = src.height; const g = c.getContext("2d"); g.drawImage(src, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = P.cream; g.fillRect(0, 0, c.width, c.height); return c; }

/* ================= Frames for CSS border-image ================= */
function frameURL(fill, edge, inner, notch, size = 12, b = 4) {
  const c = document.createElement("canvas"); c.width = size; c.height = size; const g = c.getContext("2d");
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = Math.min(x, size - 1 - x), dy = Math.min(y, size - 1 - y), d = Math.min(dx, dy);
    if (notch && dx + dy < notch) continue;
    if (notch && dx + dy === notch) { px(x, y, P.ink); continue; }
    if (d === 0) px(x, y, P.ink); else if (d === 1) px(x, y, edge); else if (d === 2 && b > 3) px(x, y, inner); else px(x, y, fill);
  }
  return `url(${c.toDataURL()})`;
}
function iconURL(key, z = 1) { const ic = ICON[key]; if (z === 1) return ic.toDataURL(); const c = document.createElement("canvas"); c.width = ic.width * z; c.height = ic.height * z; const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(ic, 0, 0, c.width, c.height); return c.toDataURL(); }
root.PX = { P, RAMP, ICON, bake, rng, sprite, egg, quantize, layer, blit, rect, disc, white, frameURL, iconURL };
})(typeof window !== "undefined" ? window : globalThis);
