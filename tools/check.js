#!/usr/bin/env node
/* Evolvlings data checker. Run: node tools/check.js
   1. In Node: loads the battle data and engine (rpg/data-*.js and rpg/engine.js) and runs 200 seeded battles.
   2. In a headless browser: loads the game and checks that every zone, card, event and text exists in both languages.
   Exits with code 1 when anything is wrong, so the GitHub Action fails. Needs the "playwright" package for part 2. */
"use strict";
const fs = require("fs"), path = require("path"), http = require("http");
const ROOT = path.join(__dirname, "..");
const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);

/* ---------- 1. battle engine in Node ---------- */
const vm = require("vm");
// the rpg/ files are classic scripts that share top-level names, so run them one after another in one context
const ENGINE = ["data-cards", "data-mons", "data-zones", "engine"];
const ctx = vm.createContext({ console, Math, Date });
for (const f of ENGINE) vm.runInContext(fs.readFileSync(path.join(ROOT, "rpg", f + ".js"), "utf8"), ctx, { filename: "rpg/" + f + ".js" });
const R = vm.runInContext("api", ctx);
function mulberry(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function unit(kind, lvl, side, rnd, boss) {
  const m = R.MONS[kind], g = () => Math.floor(rnd() * 3);
  return R.makeUnit({ kind, lvl, side, boss: !!boss, wild: side === "foe", stage: 1, cards: { a: R.scaled(m.cards[0], g()), p: R.scaled(m.cards[1], g()), s: lvl >= 8 ? R.scaled(m.cards[2], g()) : undefined } });
}
function sims(n) {
  const zones = Object.keys(R.ZONES), res = { win: 0, lose: 0 };
  for (let i = 0; i < n; i++) {
    const rnd = mulberry(1000 + i), zk = zones[i % zones.length], z = R.ZONES[zk];
    const lvl = Math.max(z.min || 1, 1) + Math.floor(rnd() * 8);
    try {
      const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
      const allies = [0, 1, 2].map(() => unit(pick(z.allies), lvl, "ally", rnd));
      const foes = i % 4 === 3 && z.boss ? [unit(z.boss, lvl, "foe", rnd, true)] : [0, 1].map(() => unit(pick(z.foes), lvl, "foe", rnd));
      const B = new R.Battle(allies, foes, { zone: z, rnd, day: i % 2 === 0 });
      const out = B.runAll(60);
      if (out !== "win" && out !== "lose") err(`battle ${i} (${zk}) ended as ${out}`);
      else res[out]++;
      for (const u of B.units) if (!Number.isFinite(u.hp) || u.hp < 0 || u.hp > u.maxHp) err(`battle ${i} (${zk}): ${u.kind} has hp ${u.hp}/${u.maxHp}`);
    } catch (e) { err(`battle ${i} (${zk}) threw: ${e.stack.split("\n").slice(0, 2).join(" ")}`); }
  }
  return res;
}

/* ---------- static facts read from the source ---------- */
const rpgSrc = fs.readdirSync(path.join(ROOT, "rpg")).filter((f) => f.endsWith(".js")).map((f) => fs.readFileSync(path.join(ROOT, "rpg", f), "utf8")).join("\n");
function body(src, head) { const i = src.indexOf(head); if (i < 0) return ""; let d = 0; for (let j = src.indexOf("{", i); j < src.length; j++) { if (src[j] === "{") d++; else if (src[j] === "}" && --d === 0) return src.slice(i, j + 1); } return ""; }
const DECORS = new Set([...body(rpgSrc, "function drawDecor(").matchAll(/decor === "(\w+)"/g)].map((m) => m[1]).concat(["lanterns"])); // "lanterns" is the final else
const EVENT_CASES = new Set([...body(rpgSrc, "function chooseEvent(").matchAll(/case "(\w+)"/g)].map((m) => m[1]));

/* ---------- 2. data tables in the browser ---------- */
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml" };
function serve() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
      const f = path.join(ROOT, path.normalize(p));
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); r.end(fs.readFileSync(f));
    });
    s.listen(0, "127.0.0.1", () => ok(s));
  });
}
function inPage(facts) {
  const out = { errors: [], warns: [] }, E = (m) => out.errors.push(m), W = (m) => out.warns.push(m);
  const D = EV.RPG.DATA, { CT, EVT, ZT, PMAP, TX, ZONES, MONS, CARDS } = D;
  const decors = new Set(facts.decors), cases = new Set(facts.cases), lore = (window.EvoLore && window.EvoLore.LORE_EVENTS) || {};
  const pair = (o, what) => { for (const lg of ["es", "en"]) if (!o || !o[lg]) E(`${what}: missing ${lg}`); };
  // zones
  for (const [zk, z] of Object.entries(ZONES)) {
    for (const k of (z.foes || []).concat(z.allies || [], z.boss ? [z.boss] : [])) if (!MONS[k]) E(`zone ${zk}: creature "${k}" is not in MONS`);
    for (const lg of ["es", "en"]) { const t = ZT[lg] && ZT[lg][zk]; if (!t || !t.name || !t.desc) E(`zone ${zk}: ZT.${lg} missing name/desc`); }
    if (!PMAP[zk]) E(`zone ${zk}: no position in PMAP`);
    if (!decors.has(z.decor)) E(`zone ${zk}: decor "${z.decor}" is not drawn by drawDecor`);
    for (const ev of z.events || []) {
      for (const lg of ["es", "en"]) {
        const e = EVT[lg][ev];
        if (!e) { E(`event ${ev} (zone ${zk}): no EVT.${lg}`); continue; }
        if (!e.t || !Array.isArray(e.c) || !Array.isArray(e.o) || e.c.length !== e.o.length) E(`event ${ev}: EVT.${lg} needs t, and c/o of the same length`);
      }
      if (!cases.has(ev) && !lore[ev]) W(`event ${ev} (zone ${zk}): no effects in chooseEvent() or lore.js, choices only show text`);
    }
  }
  // lore events also need both languages
  for (const k of Object.keys(lore)) for (const lg of ["es", "en"]) if (!EVT[lg][k]) E(`lore event ${k}: no EVT.${lg}`);
  // creatures
  for (const [k, m] of Object.entries(MONS)) {
    for (const c of m.cards) if (!CARDS[c]) E(`creature ${k}: card "${c}" is not in CARDS`);
    if (EV.RPG.monName(k) === k) E(`creature ${k}: no display name`);
    const boss = Object.values(ZONES).some((z) => z.boss === k);
    if (!boss && window.EVS && EVS.KINDS && !EVS.KINDS.includes(k)) W(`creature ${k}: no sprite in sprites.js`); // bosses are drawn by rpg/ui-art.js
  }
  // cards
  for (const id of Object.keys(CARDS)) {
    const t = CT[id]; pair(t, `card ${id}: CT`);
    for (const lg of ["es", "en"]) if (t && t[lg] && !(Array.isArray(t[lg]) && t[lg][0] && t[lg][1])) E(`card ${id}: CT.${lg} needs [name, flavour]`);
    // boss-only cards have a scene but no small art, and use the default "melee" animation
    const owned = D.DROP_POOL.includes(id) || Object.entries(MONS).some(([k, m]) => m.cards.includes(id) && !Object.values(ZONES).some((z) => z.boss === k));
    if (window.EVSCENE && !EVSCENE.IDS.includes(id)) E(`card ${id}: no lore scene in scenes.js`);
    if (window.EVS && owned) { if (!EVS.CARD[id]) E(`card ${id}: no art in EVS.CARD`); if (!EVS.ANIM[id] || !EVS.ANIM[id].style) E(`card ${id}: no animation style in EVS.ANIM`); }
  }
  // texts: the same keys in both languages
  const same = (a, b, what) => { for (const k of Object.keys(a)) if (!(k in b)) E(`${what}: "${k}" is in es but not en`); for (const k of Object.keys(b)) if (!(k in a)) E(`${what}: "${k}" is in en but not es`); };
  same(TX.es, TX.en, "rpg TX");
  if (EV.STR) { same(EV.STR.es, EV.STR.en, "index.html STR"); if (EV.STR.es.ach) same(EV.STR.es.ach, EV.STR.en.ach, "achievements"); }
  same(EVT.es, EVT.en, "EVT"); same(ZT.es, ZT.en, "ZT");
  return out;
}

(async () => {
  const res = sims(200);
  console.log(`battles: 200 run, ${res.win} won, ${res.lose} lost`);
  let pw; try { pw = require("playwright"); } catch (e) { err("the playwright package is not installed (npm i --no-save playwright)"); }
  if (pw) {
    const s = await serve(), b = await pw.chromium.launch(), page = await b.newPage(), pageErrs = [];
    page.on("pageerror", (e) => pageErrs.push(e.message));
    await page.goto(`http://127.0.0.1:${s.address().port}/`);
    await page.waitForFunction(() => window.EV && EV.RPG && EV.RPG.DATA, null, { timeout: 15000 });
    const r = await page.evaluate(inPage, { decors: [...DECORS], cases: [...EVENT_CASES] });
    errors.push(...r.errors); warns.push(...r.warns);
    for (const m of pageErrs) err("page error: " + m);
    await b.close(); s.close();
  }
  for (const w of warns) console.log("warn  " + w);
  for (const e of errors) console.log("ERROR " + e);
  console.log(errors.length ? `\n${errors.length} problem(s) found.` : "\nAll checks passed.");
  process.exit(errors.length ? 1 : 0);
})();
