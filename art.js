/* Evolvlings: PNG art loader (guide: https://claude.ai/artifact/9UqayD6TF3MiAmNBX3XTCh).
   Every PNG listed in art/manifest.json replaces the drawn placeholder it names; anything missing keeps the
   placeholder, so art can arrive a few files at a time. The manifest is written by `node tools/art.js`, which also
   checks sizes and names. The one-file build inlines the images as window.EVART_INLINE = { "path": dataURI }.
   Loaded after sprites.js and scenes.js, before world.js and the rpg scripts.

   window.EVART:
     ready(path)                      -> true when that PNG has loaded
     creature(kind, st, sq, emo, dir) -> 64x64 canvas cell from art/creatures/<kind>.png, or null
     guardian(kind, sq, emo, dir)     -> 96x96 cell from art/guardians/<kind>.png, or null
     image(path)                      -> the loaded <img> (maps, battle backgrounds), or null
     scene(path)                      -> a 512x384 canvas (the 256x192 PNG at 2x) for events, pauses and cards, or null
     ver                              -> grows by one each time a file finishes loading (to redraw cached things)
   Sheet columns: 0 front A, 1 front B, 2 back A, 3 back B, 4 side (facing right) A, 5 side B, 6 happy, 7 sad,
   8 surprised, 9 asleep. Rows: evolution stages 0..2 (a one-row sheet serves every stage). */
(function (root) {
"use strict";
const CELL = { creatures: 64, guardians: 96 };
const img = {}, cells = {}, scenes = {};
const A = { ver: 0, files: [] };
function add(path, src) {
  const im = new Image();
  im.onload = () => { img[path] = im; A.ver++; for (const k in cells) if (k.startsWith(path + "|")) delete cells[k]; delete scenes[path]; };
  im.src = src;
}
function load() {
  const inl = root.EVART_INLINE;
  if (inl) { for (const p in inl) { A.files.push(p); add(p, inl[p]); } return; }
  if (typeof fetch === "undefined" || typeof location === "undefined" || location.protocol === "file:") return;
  fetch("art/manifest.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).then((m) => {
    if (!m || !Array.isArray(m.files)) return;
    for (const f of m.files) { const p = typeof f === "string" ? f : f.path; A.files.push(p); add(p, "art/" + p + (m.v ? "?v=" + m.v : "")); }
  }).catch(() => {});
}
function column(sq, emo, dir) {
  if (dir === "back") return 2 + (sq ? 1 : 0);
  if (dir === "side") return 4 + (sq ? 1 : 0);
  if (emo === "happy") return 6;
  if (emo === "sad") return 7;
  if (emo === "surprised") return 8;
  if (emo === "sleep") return 9;
  return sq ? 1 : 0;
}
function cell(folder, kind, st, col) {
  const path = folder + "/" + kind + ".png", im = img[path]; if (!im) return null;
  const n = CELL[folder], rows = Math.max(1, Math.floor(im.height / n)), cols = Math.floor(im.width / n);
  const row = Math.max(0, Math.min(rows - 1, st || 0));
  if (col >= cols) col = col >= 6 ? 0 : col % 2; // a short sheet: fall back to the front frames
  const key = path + "|" + row + "|" + col;
  if (cells[key]) return cells[key];
  const cv = document.createElement("canvas"); cv.width = n; cv.height = n;
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(im, col * n, row * n, n, n, 0, 0, n, n);
  // an empty cell (the artist left it blank) falls back to the front frame
  let any = !readOk(); // without trustworthy pixel reads, take the cell as it is
  if (!any) { const d = g.getImageData(0, 0, n, n).data; for (let i = 3; i < d.length; i += 4) if (d[i]) { any = true; break; } }
  if (!any && col > 1) return cell(folder, kind, st, col % 2);
  return (cells[key] = cv);
}
A.ready = (path) => !!img[path];
A.image = (path) => img[path] || null;
A.creature = (kind, st, sq, emo, dir) => cell("creatures", kind, st, column(sq, emo, dir));
A.guardian = (kind, sq, emo, dir) => cell("guardians", kind, 0, column(sq, emo, dir));
A.has = (kind) => !!(img["creatures/" + kind + ".png"] || img["guardians/" + kind + ".png"]);
A.classic = () => { try { return !!(root.EV && root.EV.P && root.EV.P.evArt === "classic"); } catch (e) { return false; } };
A.scene = (path) => {
  const im = img[path]; if (!im) return null;
  if (scenes[path]) return scenes[path];
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 384;
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, 512, 384);
  return (scenes[path] = cv);
};
// A sheet cell as a small sprite about n px tall, for the places that ask the drawn sprite libraries (cards, Refuge,
// eggs, portraits...): find the cell's own pixel size (pack art is 16 px sprites at 2-4x), read it back at 1 pixel per
// pixel, then scale by a whole number so it stays crisp. The box is square, (n + 2) or bigger, feet on the bottom row.
const smalls = new WeakMap();
const readOk = () => !(root.PX && root.PX.readOk === false);
function pixelSize(d, w, x0, y0, bw, bh) {
  for (const S of [4, 3, 2]) {
    if (bw % S || bh % S) continue;
    let ok = true;
    for (let y = 0; y < bh && ok; y++) for (let x = 0; x < bw; x++) {
      const i = ((y0 + y) * w + x0 + x) * 4, j = ((y0 + y - (y % S)) * w + x0 + x - (x % S)) * 4;
      if (d[i] !== d[j] || d[i + 1] !== d[j + 1] || d[i + 2] !== d[j + 2] || d[i + 3] !== d[j + 3]) { ok = false; break; }
    }
    if (ok) return S;
  }
  return 1;
}
function small(cv, n, dull) {
  if (!readOk()) return null; // scrambled pixel reads (anti-fingerprinting): callers draw the cell as it is
  let per = smalls.get(cv); if (!per) smalls.set(cv, (per = {}));
  const key = n + (dull ? "d" : ""); if (per[key]) return per[key];
  const w = cv.width, h = cv.height, d = cv.getContext("2d").getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, S = pixelSize(d, w, x0, y0, bw, bh), sw = Math.ceil(bw / S), sh = Math.ceil(bh / S);
  const k = Math.max(1, Math.round(n / sh)), box = Math.max(n + 2, sw * k + 2, sh * k + 2);
  const out = document.createElement("canvas"); out.width = box; out.height = box;
  const g = out.getContext("2d"); g.imageSmoothingEnabled = false;
  g.drawImage(cv, x0, y0, sw * S, sh * S, Math.floor((box - sw * k) / 2), box - 1 - sh * k, sw * k, sh * k);
  if (dull) { g.globalCompositeOperation = "source-atop"; g.globalAlpha = 0.45; g.fillStyle = "#2a1c38"; g.fillRect(0, 0, box, box); }
  return (per[key] = out);
}
A.small = small;
// A whole sheet cell scaled by a whole number, with the scale and pixel grid measured once on a reference frame of the
// same creature (its standing frame), so every frame of it (walking, casting, hurt...) keeps one size and one place.
// Returns { im, k, S }: 1 art pixel (S cell pixels) becomes k pixels; the cell keeps its own layout (feet stay put).
const refs = new WeakMap(), bigs = new WeakMap();
function measure(ref, n) {
  let m = refs.get(ref); if (m && m.n === n) return m;
  const w = ref.width, h = ref.height, d = ref.getContext("2d").getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const bh = y1 - y0 + 1, S = pixelSize(d, w, x0, y0, x1 - x0 + 1, bh), k = Math.max(1, Math.round(n / Math.ceil(bh / S)));
  m = { n, S, k, ox: x0 % S, oy: y0 % S }; refs.set(ref, m); return m;
}
function big(cv, ref, n) {
  if (!readOk() || !cv || !ref) return null;
  const m = measure(ref, n); if (!m) return null;
  let per = bigs.get(cv); if (!per) bigs.set(cv, (per = {}));
  const key = n + ":" + m.S + ":" + m.k; if (per[key]) return per[key];
  const cw = Math.floor((cv.width - m.ox) / m.S), ch = Math.floor((cv.height - m.oy) / m.S);
  const out = document.createElement("canvas"); out.width = cw * m.k; out.height = ch * m.k;
  const g = out.getContext("2d"); g.imageSmoothingEnabled = false;
  g.drawImage(cv, m.ox, m.oy, cw * m.S, ch * m.S, 0, 0, cw * m.k, ch * m.k);
  return (per[key] = { im: out, k: m.k, S: m.S, oy: m.oy });
}
A.big = big;
root.EVART = A;
load();

/* ---------- Sprites: the drawn sprite libraries take the sheet when there is one ---------- */
// EVS.sprite(kind, n, st, sq, emo, dull, dir) and PX.sprite(kind, n, st, sq, emo, dull) answer with the PNG creature
const ES = root.EVS;
if (ES && ES.sprite) {
  const orig = ES.sprite;
  ES.sprite = function (kind, n = 24, st = 1, sq = 0, emo = "normal", dull = false, dir = "front") {
    const c = A.creature(kind, st, sq, emo, dir), s = c && small(c, n, dull);
    return s || orig.apply(this, arguments);
  };
}
const PXL = root.PX;
if (PXL && PXL.sprite) {
  const orig = PXL.sprite;
  PXL.sprite = function (kind, n, st = 0, sq = 0, emo = "normal", dull = false) {
    const c = A.creature(kind, st, sq, emo, "front"), s = c && small(c, n, dull);
    return s || orig.apply(this, arguments);
  };
}

/* ---------- Scenes: events, endings, pauses and card art take the PNG when there is one ---------- */
const S = root.EVSCENE;
if (S) {
  const ev = S.event, end = S.end, pause = S.pause, art = S.art;
  // Settings > Pictures: "classic" keeps the drawn start, ending and pause pictures, card scenes and battle backgrounds instead of the pack ones
  const classic = () => { try { return root.EV && root.EV.P && root.EV.P.evArt === "classic"; } catch (e) { return false; } };
  if (ev) S.event = function (id) { return (!classic() && A.scene("events/" + id + ".png")) || ev.apply(this, arguments); };
  if (end) S.end = function (id, key) { return (!classic() && A.scene("events/" + id + "--" + key + ".png")) || end.apply(this, arguments); };
  if (pause) S.pause = function (zone, kind) { return (!classic() && A.scene("pause/" + zone + "-" + kind + ".png")) || pause.apply(this, arguments); };
  if (art) S.art = function (id) { return (!classic() && A.scene("cards/" + id + ".png")) || art.apply(this, arguments); };
}
})(typeof window !== "undefined" ? window : globalThis);
