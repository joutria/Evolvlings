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
  const d = g.getImageData(0, 0, n, n).data; let any = false; for (let i = 3; i < d.length; i += 4) if (d[i]) { any = true; break; }
  if (!any && col > 1) return cell(folder, kind, st, col % 2);
  return (cells[key] = cv);
}
A.ready = (path) => !!img[path];
A.image = (path) => img[path] || null;
A.creature = (kind, st, sq, emo, dir) => cell("creatures", kind, st, column(sq, emo, dir));
A.guardian = (kind, sq, emo, dir) => cell("guardians", kind, 0, column(sq, emo, dir));
A.has = (kind) => !!(img["creatures/" + kind + ".png"] || img["guardians/" + kind + ".png"]);
A.scene = (path) => {
  const im = img[path]; if (!im) return null;
  if (scenes[path]) return scenes[path];
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 384;
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, 512, 384);
  return (scenes[path] = cv);
};
root.EVART = A;
load();

/* ---------- Scenes: events, endings, pauses and card art take the PNG when there is one ---------- */
const S = root.EVSCENE;
if (S) {
  const ev = S.event, end = S.end, pause = S.pause, art = S.art;
  if (ev) S.event = function (id) { return A.scene("events/" + id + ".png") || ev.apply(this, arguments); };
  if (end) S.end = function (id, key) { return A.scene("events/" + id + "--" + key + ".png") || end.apply(this, arguments); };
  if (pause) S.pause = function (zone, kind) { return A.scene("pause/" + zone + "-" + kind + ".png") || pause.apply(this, arguments); };
  if (art) S.art = function (id) { return A.scene("cards/" + id + ".png") || art.apply(this, arguments); };
}
})(typeof window !== "undefined" ? window : globalThis);
