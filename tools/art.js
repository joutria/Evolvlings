#!/usr/bin/env node
/* Evolvlings PNG art: checks every file under art/ and writes art/manifest.json (the list art.js loads).
   Run after adding or replacing art:  node tools/art.js
   It warns about wrong sizes, unknown names and semi-transparent creature edges, and lists what each batch still lacks.
   Sizes and names follow the art guide: https://claude.ai/artifact/9UqayD6TF3MiAmNBX3XTCh  (never fails; exit 0) */
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const root = path.join(__dirname, ".."), dir = path.join(root, "art");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const warns = [];

// the ids the game knows
const wild = [...read("rpg/data-wild.js").matchAll(/^    \["(\w+)", "/gm)].map((m) => m[1]);
const kinds0 = ((read("sprites.js").match(/const KINDS = \[([^\]]*)\]/) || ["", ""])[1].match(/"(\w+)"/g) || []).map((s) => s.slice(1, -1));
const kinds = kinds0.concat(wild);
const zonesSrc = read("rpg/data-zones.js");
const zones = [...zonesSrc.matchAll(/^  (\w+): \{/gm)].map((m) => m[1]);
const bosses = [...zonesSrc.matchAll(/boss: "(\w+)"/g)].map((m) => m[1]);
const pauseKinds = ["camino", "pelea", "cofre", "descanso", "jefe", "victoria", "regreso"];
const maps = ["home", "vado"];
// the things world.js draws on the maps (drawObj kinds named in MAPS deco and places)
const objKinds = [...new Set([...read("world.js").matchAll(/(?:obj: |\[)"(\w+)"/g)].map((m) => m[1]).concat(["lectern", "scrolls", "scrolls2"]))];

// PNG header: width, height, colour type; alpha check for creature sheets (decodes 8-bit RGBA, non-interlaced)
function png(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20), depth = b[24], type = b[25], inter = b[28];
  return { w, h, depth, type, inter, buf: b };
}
function halfAlpha(p) {
  if (p.type !== 6 || p.depth !== 8 || p.inter) return 0;
  const idat = []; let o = 8;
  while (o < p.buf.length) { const len = p.buf.readUInt32BE(o), t = p.buf.toString("ascii", o + 4, o + 8); if (t === "IDAT") idat.push(p.buf.subarray(o + 8, o + 8 + len)); o += 12 + len; }
  let raw; try { raw = zlib.inflateSync(Buffer.concat(idat)); } catch (e) { return 0; }
  const bpp = 4, stride = p.w * bpp, out = Buffer.alloc(p.h * stride); let n = 0;
  for (let y = 0; y < p.h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0, up = y ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      out[y * stride + x] = v & 255;
    }
  }
  for (let i = 3; i < out.length; i += 4) if (out[i] > 0 && out[i] < 255) n++;
  return n;
}
const RULES = {
  creatures: { ids: kinds, check: (p) => p.w % 64 === 0 && p.h % 64 === 0 && p.w <= 640 && p.h <= 192, size: "celdas de 64 px, hasta 640 × 192" },
  guardians: { ids: bosses, check: (p) => p.w % 96 === 0 && p.h === 96 && p.w <= 960, size: "celdas de 96 px, una fila, hasta 960 × 96" },
  maps: { ids: maps.flatMap((m) => [m, m + "-front"]), check: (p) => p.w === 720 && p.h === 528, size: "720 × 528" },
  battle: { ids: zones.flatMap((z) => [z + "-day", z + "-night"]), check: (p) => p.w === 360 && p.h === 240, size: "360 × 240" },
  pause: { ids: zones.flatMap((z) => pauseKinds.map((k) => z + "-" + k)), check: (p) => p.w === 256 && p.h === 192, size: "256 × 192" },
  objects: { ids: objKinds, check: (p) => p.w <= 64 && p.h <= 64, size: "hasta 64 × 64 (16 px por casilla)" },
  faces: { ids: ["tila"], check: (p) => p.w <= 40 && p.h <= 40, size: "hasta 40 × 40" },
  events: { ids: null, check: (p) => p.w === 256 && p.h === 192, size: "256 × 192" },
  cards: { ids: null, check: (p) => p.w === 256 && p.h === 192, size: "256 × 192" },
};
const files = [];
if (fs.existsSync(dir)) for (const folder of fs.readdirSync(dir)) {
  const fd = path.join(dir, folder); if (!fs.statSync(fd).isDirectory()) continue;
  const rule = RULES[folder]; if (!rule) { warns.push(`art/${folder}/: carpeta desconocida (usa ${Object.keys(RULES).join(", ")})`); continue; }
  for (const f of fs.readdirSync(fd).sort()) {
    if (!f.toLowerCase().endsWith(".png")) { if (!f.startsWith(".")) warns.push(`art/${folder}/${f}: no es PNG`); continue; }
    const id = f.slice(0, -4), p = png(path.join(fd, f));
    if (!p) { warns.push(`art/${folder}/${f}: el archivo no es un PNG válido`); continue; }
    if (rule.ids && !rule.ids.includes(id)) warns.push(`art/${folder}/${f}: el juego no conoce «${id}»`);
    if (!rule.check(p)) warns.push(`art/${folder}/${f}: mide ${p.w} × ${p.h}, debería ser ${rule.size}`);
    if (folder === "creatures" || folder === "guardians") { const n = halfAlpha(p); if (n) warns.push(`art/${folder}/${f}: ${n} píxeles semitransparentes (deben ser opacos o vacíos)`); }
    files.push({ path: folder + "/" + f, w: p.w, h: p.h });
  }
}
fs.mkdirSync(dir, { recursive: true });
const v = files.reduce((h, f) => (h * 31 + [...(f.path + f.w + f.h + fs.statSync(path.join(dir, f.path)).size)].reduce((a, c) => a + c.charCodeAt(0), 0)) >>> 0, 7);
fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ v, files }, null, 1) + "\n");
const have = (folder, id) => files.some((f) => f.path === `${folder}/${id}.png`);
const batch1 = ["lumo", "fizz", "pebb"].filter((k) => !have("creatures", k)).map((k) => "creatures/" + k).concat(["home", "vado"].filter((m) => !have("maps", m)).map((m) => "maps/" + m));
console.log(`Arte PNG: ${files.length} archivos en art/ (manifest escrito).`);
console.log(`Lote 1 pendiente: ${batch1.length ? batch1.join(", ") : "completo"}`);
console.log(`Criaturas ${kinds0.filter((k) => have("creatures", k)).length}/${kinds0.length} · guardianes ${bosses.filter((k) => have("guardians", k)).length}/${bosses.length} · combate ${zones.filter((z) => have("battle", z + "-day")).length}/${zones.length}`);
for (const w of warns) console.log("! " + w);
