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
const ENGINE = ["data-cards", "data-mons", "data-talents", "data-zones", "engine"];
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

/* ---------- 1b. path conversations (rpg/events-*.js) ---------- */
// every option leads somewhere, every line has a speaker, the English text matches, effects and foes are known
{
  const FX = new Set(["xp", "coins", "heal", "hurt", "cost", "card", "fight", "foes", "foeBuff", "flag", "escrito", "xpPerZone"]);
  const files = fs.readdirSync(path.join(ROOT, "rpg")).filter((f) => /^events-[a-z]+\.js$/.test(f));
  const w = { EVEVENTS: {}, EVEVENTS_EN: {} }; const ectx = vm.createContext({ window: w });
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, "rpg", f), "utf8"), ectx, { filename: "rpg/" + f });
    const en = f.replace(".js", ".en.js");
    if (fs.existsSync(path.join(ROOT, "rpg", en))) vm.runInContext(fs.readFileSync(path.join(ROOT, "rpg", en), "utf8"), ectx, { filename: "rpg/" + en });
  }
  let n = 0;
  const fxOk = (where, f) => { for (const k in f || {}) if (!FX.has(k)) err(`${where}: unknown effect "${k}"`); for (const k of (f && f.foes) || []) if (!R.MONS[k]) err(`${where}: unknown foe "${k}"`); };
  for (const zone in w.EVEVENTS) {
    if (!R.ZONES[zone] && zone !== "common") err(`events: unknown zone "${zone}"`);
    for (const id in w.EVEVENTS[zone]) {
      n++;
      const ev = w.EVEVENTS[zone][id], en = (w.EVEVENTS_EN[zone] || {})[id], at = `event ${zone}/${id}`;
      if (Object.values(R.ZONES).some((z) => z.events.includes(id))) err(`${at}: id also used by a short event`);
      for (const z2 in w.EVEVENTS) if (z2 !== zone && w.EVEVENTS[z2][id]) err(`${at}: id also used in ${z2}`);
      if (!ev.nodes[ev.start]) err(`${at}: start node "${ev.start}" missing`);
      if (!en) err(`${at}: no English text`);
      let ends = 0;
      for (const nid in ev.nodes) {
        const N = ev.nodes[nid], M = en && en.nodes[nid], wh = `${at} node ${nid}`;
        if (!Array.isArray(N.say)) err(`${wh}: no say`);
        for (const s of N.say || []) if (s[0] && !ev.who[s[0]]) err(`${wh}: unknown speaker "${s[0]}"`);
        if (N.end) ends++;
        if (!N.opts && !N.back && !N.end) err(`${wh}: dead end (no opts, back or end)`);
        if (N.back && !ev.nodes[N.back]) err(`${wh}: back to missing "${N.back}"`);
        fxOk(wh, N.fx); fxOk(wh, N.end);
        (N.opts || []).forEach((o, i) => {
          if (o.go && !ev.nodes[o.go]) err(`${wh} option ${i}: goes to missing "${o.go}"`);
          if (o.back && !ev.nodes[o.back]) err(`${wh} option ${i}: back to missing "${o.back}"`);
          if (!o.go && !o.back) err(`${wh} option ${i}: leads nowhere`);
          fxOk(`${wh} option ${i}`, o.fx);
        });
        if (en) {
          if (!M) err(`${wh}: no English text`);
          else {
            if ((M.say || []).length !== (N.say || []).length) err(`${wh}: ${(N.say || []).length} lines but ${(M.say || []).length} in English`);
            if ((M.opts || []).length !== (N.opts || []).length) err(`${wh}: ${(N.opts || []).length} options but ${(M.opts || []).length} in English`);
          }
        }
      }
      if (!ends) err(`${at}: no ending`);
    }
  }
  console.log(`path conversations: ${n} checked`);
}

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
  const out = { errors: [], warns: [] }, E = (m) => out.errors.push(m), W = (m) => out.warns.push(m), E_ = E;
  const D = EV.RPG.DATA, { CT, EVT, ZT, PMAP, TX, ZONES, MONS, CARDS } = D;
  const decors = new Set(Object.keys(D.DECOR)), FX = D.EVENT_FX, lore = (window.EvoLore && window.EvoLore.LORE_EVENTS) || {};
  // every key an effect may use (see the top of rpg/data-events.js); a typo would silently do nothing
  const FX_KEYS = new Set(["xp", "coins", "cost", "heal", "hurt", "foeBuff", "card", "fight", "flag", "escrito", "xpPerZone", "say", "sayE", "roll", "if", "then", "else"]);
  const checkFx = (f, where, E, lg) => {
    for (const k of Object.keys(f)) if (!FX_KEYS.has(k)) E_(`${where}: unknown effect "${k}"`);
    if (f.say && !(D.EVT_ALT[lg][f.say[0]] || [])[f.say[1]]) E_(`${where}: EVT_ALT.${lg}.${f.say.join(".")} is missing`);
    if (f.sayE && !(Array.isArray(f.sayE) ? (E[f.sayE[0]] || [])[f.sayE[1]] : E[f.sayE])) E_(`${where}: EVT.${lg} has no "${[].concat(f.sayE).join(".")}"`);
    for (const sub of [].concat(f.roll || [], f.then || [], f.else || [])) checkFx(sub, where, E, lg);
  };
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
        const fx = lore[ev] ? lore[ev].fx : FX[ev];
        if (!fx) { E(`event ${ev} (zone ${zk}): no effects in rpg/data-events.js or lore.js`); continue; }
        if (fx.length !== e.c.length) E(`event ${ev}: ${e.c.length} choices in EVT.${lg} but ${fx.length} in its effects`);
        fx.forEach((f, i) => checkFx(f, `event ${ev} choice ${i}`, e, lg));
      }
    }
  }
  // lore events also need both languages
  for (const k of Object.keys(lore)) for (const lg of ["es", "en"]) { if (!EVT[lg][k]) { E(`lore event ${k}: no EVT.${lg}`); continue; } lore[k].fx.forEach((f, i) => checkFx(f, `lore event ${k} choice ${i}`, EVT[lg][k], lg)); }
  // types: every type has a colour, and opposites go both ways
  for (const [t, T] of Object.entries(D.TYPES)) {
    if (!T.col || !T.es || !T.en) E(`type ${t}: needs col, es and en`);
    if (T.opp && (!D.TYPES[T.opp] || D.TYPES[T.opp].opp !== t)) E(`type ${t}: opposite ${T.opp} does not point back`);
  }
  // creatures
  for (const [k, m] of Object.entries(MONS)) {
    for (const c of m.cards) if (!CARDS[c]) E(`creature ${k}: card "${c}" is not in CARDS`);
    if (EV.RPG.monName(k) === k) E(`creature ${k}: no display name`);
    const boss = Object.values(ZONES).some((z) => z.boss === k);
    if (!boss && !m.wild && window.EVS && EVS.KINDS && !EVS.KINDS.includes(k)) W(`creature ${k}: no sprite in sprites.js`); // bosses are drawn by rpg/ui-art.js
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
  // registry: every zone, creature and card reads back as one entry
  for (const id of Object.keys(ZONES)) { const z = EV.RPG.zone(id); if (!z.pos || !z.text.es || !z.text.en) E(`zone ${id}: incomplete registry entry`); }
  for (const id of Object.keys(MONS)) if (!MONS[id].boss && !EV.RPG.creature(id).desc.en) E(`creature ${id}: no description`);
  for (const id of Object.keys(CARDS)) if (!EV.RPG.card(id).text) E(`card ${id}: no text`);
  // home maps: same size, every place stands on a free tile and has a name
  if (EV.WORLD) {
    const maps = Object.entries(EV.WORLD.MAPS), [w0, h0] = [maps[0][1].rows[0].length, maps[0][1].rows.length];
    for (const [mid, m] of maps) {
      if (m.rows.length !== h0 || m.rows.some((r) => r.length !== w0)) E(`map ${mid}: rows must all be ${w0} wide and ${h0} tall`);
      for (const p of m.places) {
        const [x, y] = p.stand || [], row = m.rows[y] || "";
        if (!p.stand || "#~r".includes(row[x] || "#")) E(`map ${mid}: place ${p.id} stands on a wall or water`);
        if (!p.go && !p.act && !EV.WORLD.ACT[p.id]) E(`map ${mid}: place ${p.id} does nothing when tapped`);
      }
    }
  }
  // texts: the same keys in both languages
  const same = (a, b, what) => { for (const k of Object.keys(a)) if (!(k in b)) E(`${what}: "${k}" is in es but not en`); for (const k of Object.keys(b)) if (!(k in a)) E(`${what}: "${k}" is in en but not es`); };
  same(TX.es, TX.en, "rpg TX");
  if (EV.STR) { same(EV.STR.es, EV.STR.en, "index.html STR"); if (EV.STR.es.ach) same(EV.STR.es.ach, EV.STR.en.ach, "achievements"); }
  same(EVT.es, EVT.en, "EVT"); same(ZT.es, ZT.en, "ZT"); same(D.EVT_ALT.es, D.EVT_ALT.en, "EVT_ALT");
  for (const k of Object.keys(FX)) if (!D.EVENTS.includes(k)) W(`event ${k} has effects but is not in EVENTS`);
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
    const r = await page.evaluate(inPage, {});
    errors.push(...r.errors); warns.push(...r.warns);
    for (const m of pageErrs) err("page error: " + m);
    await b.close(); s.close();
  }
  for (const w of warns) console.log("warn  " + w);
  for (const e of errors) console.log("ERROR " + e);
  console.log(errors.length ? `\n${errors.length} problem(s) found.` : "\nAll checks passed.");
  process.exit(errors.length ? 1 : 0);
})();
