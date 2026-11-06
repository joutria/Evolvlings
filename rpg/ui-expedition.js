/* Evolvlings RPG: expedition state, zones, key items, the parchment map, views, card picker and teams.
   Part of the old rpg.js, now split. Classic scripts: top-level names are shared between the rpg/*.js files,
   which load in order (see index.html). */
"use strict";

/* ====================================================================== */
/* Expedition state (memory only: leaving the page abandons the trip)     */
/* ====================================================================== */
let X = null;           // current expedition
let view = null;        // current view name
let battle = null;      // current battle presentation state
const rnd = Math.random;
const pickN = (arr, n) => { const a = arr.slice(); const out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return out; };

function startExpedition() {
  const why = expCheck(); if (why) { EV.toast(tx("exp.need." + why)); EV.sfx("deny"); return; }
  rpgState();
  const S = EV.S;
  X = { zone: null, offer: [], chosen: [], party: [], section: 0, nodes: [], loot: { xp: 0, coins: 0, cards: [] }, nextFoeBuff: 0, wins: 0 };
  show("zones");
}
/* ---------- Key items: some zones need something you get from the story ---------- */
// the raft comes from the loggers of the wood, the rope from the miners of the caves (given on their first calm guardian)
const KEYS = { raft: { from: "forest", opens: "lake" }, rope: { from: "caves", opens: "heights" } };
const KEY_OF = { lake: "raft", heights: "rope" };
const hasKey = (k) => !!(((EV.P.keys || {})[k]) || ((EV.P.cleared || {})[KEYS[k].from] || 0) > 0);
const keyLock = (id) => { const k = KEY_OF[id]; return k && !hasKey(k) ? tx("key.need." + k, { from: zt("from", null, KEYS[k].from) }) : null; };
const zoneOpen = (id) => { if (KEY_OF[id] && !hasKey(KEY_OF[id])) return false; const u = ZONES[id].unlock; if (!u) return true; const ok = (z) => ((EV.P.cleared || {})[z] || 0) > 0; return ZONES[id].unlockAll ? u.every(ok) : [].concat(u).some(ok); };
function pickZone(id, mode) {
  mode = mode || {};
  if (!ZONES[id] || !zoneOpen(id) || (mode.savia && ((EV.P.stars || {})[id] || 0) < 3)) { EV.sfx("deny"); return; }
  const S = EV.S, z = ZONES[id];
  X.zone = id; X.savia = !!mode.savia; X.echo = mode.echo || null; X.deep = mode.deep || 0; X.duel = mode.duel || null; X.deepRule = X.deep ? deepRule() : null;
  const home = EV.EGGS ? EV.EGGS.offer(S.species) : [];
  X.offer = home.concat(pickN(z.allies.filter((k) => k !== S.species && !home.includes(k)), 3));
  // Unísona: brought by Tila and Nim to the Heart; after the Heart is calm it can join any trip
  if (id === "heart" || (EV.P.flags || {}).unisona) X.offer.unshift("unisona");
  // your saved team comes along when its companions are on offer
  X.chosen = teamState().comp.filter((k) => X.offer.includes(k)).slice(0, 2);
  show("pick");
}
/* Savia Mode (a harder version of a 3-star zone) and the weekly Guardian's Echo */
const ECHO_TRIES = 3, ECHO_LVL = 6, ECHO_RULES = ["shell", "fury", "tired", "swift"];
const weekNo = () => { const k = EV.DAILY ? EV.DAILY.weekKey() : new Date().toISOString().slice(0, 10); return Math.round(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / 6048e5); };
function echoInfo() {
  const P = EV.P, cl = Object.keys(ZONES).filter((z) => ((P.cleared || {})[z] || 0) > 0);
  if (!cl.length) return null;
  const w = weekNo();
  if (!P.echo || P.echo.week !== w) P.echo = { week: w, zone: cl[w % cl.length], rule: ECHO_RULES[w % ECHO_RULES.length], tries: 0, wins: 0 };
  return { zone: P.echo.zone, rule: P.echo.rule, left: ECHO_TRIES - P.echo.tries, lvlOk: !EV.EGGS || EV.EGGS.clLvl() >= ECHO_LVL };
}
const CIRCLE = {}; for (const t of TYPE_ORDER) if (TYPES[t].circle) CIRCLE[t] = TYPES[t].circle; // from TYPES in rpg/data-cards.js
function buffUnit(u, f) { u.base.hp *= f; u.maxHp = Math.round(u.maxHp * f); u.hp = u.maxHp; u.base.str *= f; u.base.def *= f; }
/* The Deep Root: 12 floors down the sick Root. Floors 4, 8 and 12 hold a guardian.
   Every 2 weeks the zones, the rule and the stars start over; chests pay out by total stars (10 Notes at 36). */
const DEEP_EPOCH = Date.UTC(2026, 10, 2), DEEP_DAYS = 14, DEEP_FLOORS = 12, DEEP_LVL = 8, DEEP_COST = 15;
const DEEP_CHESTS = [[6, { notes: 1 }], [12, { notes: 1, dust: 20 }], [18, { notes: 2 }], [24, { notes: 1, dust: 40 }], [30, { notes: 2 }], [36, { notes: 3, dust: 60 }]];
const DEEP_RULES = ["fury", "shell", "swift", "tired"];
const dayUTC = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
const deepNo = () => Math.max(0, Math.floor((dayUTC(new Date()) - DEEP_EPOCH) / 864e5 / DEEP_DAYS));
const deepDaysLeft = () => DEEP_DAYS - (Math.floor((dayUTC(new Date()) - DEEP_EPOCH) / 864e5) - deepNo() * DEEP_DAYS);
function deepState() {
  const P = EV.P, n = deepNo();
  if (!P.deep || P.deep.p !== n) P.deep = { p: n, st: {}, chest: {} };
  return P.deep;
}
const deepZones = () => Object.keys(ZONES).filter((z) => z !== "heart" && ((EV.P.cleared || {})[z] || 0) > 0);
const deepOpen = () => deepZones().length > 0 && (!EV.EGGS || EV.EGGS.clLvl() >= DEEP_LVL);
const deepBoss = (f) => f % 4 === 0;
const deepRule = () => DEEP_RULES[deepNo() % DEEP_RULES.length];
// each stretch of 4 floors runs through one of the zones you have calmed
function deepZone(f) { const zs = deepZones(), p = deepNo(); return zs[(p * 3 + Math.floor((f - 1) / 4)) % zs.length]; }
const deepTotal = () => Object.values(deepState().st).reduce((a, n) => a + n, 0);
const deepFloorOpen = (f) => f === 1 || (deepState().st[f - 1] || 0) > 0;
function deepWhat(r) { const o = []; if (r.notes) o.push(r.notes === 1 ? tx("deep.note1") : tx("deep.notes", { n: r.notes })); if (r.dust) o.push(tx("deep.dust", { n: r.dust })); return o.join(" · "); }
function deepFoes(boss) {
  const f = X.deep, z = ZONES[X.zone], rule = X.deepRule;
  // floor 1 is level 2, floor 12 is level 10; the guardians grow a little stronger each stretch
  const lvl = 1 + Math.round(f * 0.75);
  const tune = (u) => {
    if (rule === "shell") { u.shield = Math.round(u.maxHp * (boss ? 0.2 : 0.12)); u.shieldT = 99; }
    if (rule === "fury") { u.base.str *= 1.2; u.base.def *= 0.85; }
    if (rule === "swift") u.base.spd *= 1.25;
    return u;
  };
  if (boss) {
    const m = MONS[z.boss];
    const u = makeUnit({ kind: z.boss, lvl, side: "foe", name: monName(z.boss), boss: true, cards: { a: scaled(m.cards[0], 0), p: scaled(m.cards[1], 0), s: scaled(m.cards[2], 0) }, stage: 1 });
    buffUnit(u, 1 + 0.05 * (f / 4));
    return [tune(u)];
  }
  return pickN(z.foes.concat(z.foes), f <= 2 ? 2 : 3).map((k) => {
    const cs = MONS[k].cards;
    const cards = { a: scaled(cs[Math.floor(rnd() * 2)], 0) };
    if (f >= 5) cards.p = scaled(cs[1], 0);
    return tune(makeUnit({ kind: k, lvl, side: "foe", name: monName(k, true), hollow: true, cards, stage: 1 }));
  });
}
// a floor won: keep its best stars, pay first clears and any chest the new total reaches
function deepWin(f, stars) {
  const P = EV.P, d = deepState(), before = d.st[f] || 0;
  const out = { f, stars, first: null, chests: [] };
  if (!before) { const c = 10 + 3 * f, du = 4 + f; EV.addCoins(c, true); P.dust = (P.dust || 0) + du; P.c.deepFloors = (P.c.deepFloors || 0) + 1; out.first = { c, d: du }; }
  if (stars > before) { d.st[f] = stars; P.c.deepStars = (P.c.deepStars || 0) + stars - before; }
  if (f === DEEP_FLOORS && stars === 3) P.c.deep12 = (P.c.deep12 || 0) + 1;
  const tot = deepTotal();
  DEEP_CHESTS.forEach(([need, r], i) => {
    if (tot < need || d.chest[i]) return;
    d.chest[i] = 1;
    if (r.notes) P.notes = (P.notes || 0) + r.notes;
    if (r.dust) P.dust = (P.dust || 0) + r.dust;
    let esct = null;
    if (need % 12 === 0) { const w = deepEscrito(); if (w) { giveEscrito(w); const lw = LORE.LORE_ESCRITOS.find((x) => x.id === w); esct = (lw[L()] || lw.es).title; } }
    out.chests.push({ need, what: deepWhat(r), esct });
  });
  return out;
}
function deepHtml() {
  let h = `<h3 class="cat-title">${esc(tx("deep.title"))}</h3><p class="muted" style="margin:0">${esc(tx("deep.sub"))}</p>`;
  if (!deepOpen()) return h + `<p class="muted">🔒 ${esc(tx("deep.lock", { n: DEEP_LVL }))}</p>`;
  const d = deepState(), tot = deepTotal(), left = deepDaysLeft();
  const next = DEEP_CHESTS.find(([need], i) => !d.chest[i]);
  h += `<p class="deep-info"><b>${esc(tx("deep.stars", { n: tot }))}</b> · ${esc(left <= 1 ? tx("deep.left1") : tx("deep.left", { n: left }))}<br>${esc(tx("deep.rule", { rule: tx("deep.r." + deepRule()) }))}<br>${esc(next ? tx("deep.next", { n: next[0], what: deepWhat(next[1]) }) : tx("deep.allChests"))}</p>`;
  h += `<div class="deep-floors">`;
  for (let f = 1; f <= DEEP_FLOORS; f++) {
    const z = deepZone(f), open = deepFloorOpen(f), st = d.st[f] || 0, boss = deepBoss(f);
    h += `<button type="button" class="node deep${boss ? " boss" : ""}${st ? " done" : ""}" data-deep="${f}" ${open ? "" : "disabled"}><span class="ic" aria-hidden="true">${tyIcon(ZONES[z].type)}</span><strong>${esc(tx("deep.floor", { n: f }))}</strong><small>${esc(boss ? monName(ZONES[z].boss) : zt("name", null, z))}</small><small class="ok">${open ? starStr(st) : "🔒"}</small></button>`;
  }
  return h + `</div><p class="muted" style="margin:0">${esc(tx("deep.cost"))}</p>`;
}
// the expedition screen: the parchment map on top, then tabs for the zones, the Deep Root and the Guardian's Echo
let ztab = "zones";
function zoneTabsHtml() {
  const tabs = [["zones", tx("ztab.zones")], ["deep", tx("ztab.deep")], ["duel", tx("ztab.duel")]];
  if (echoInfo()) tabs.push(["echo", tx("ztab.echo")]);
  if (!tabs.some((t) => t[0] === ztab)) ztab = "zones";
  const body = ztab === "deep" ? deepHtml() : ztab === "duel" ? duelHtml() : ztab === "echo" ? echoHtml() : zonesHtml() + saviaHtml();
  return `<div class="xtabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-ztab="${k}" aria-selected="${k === ztab}">${esc(l)}</button>`).join("")}</div><div class="xtab-body">${body}</div>`;
}
function echoHtml() {
  const e = echoInfo(); let h = "";
  if (e) {
    const can = e.lvlOk && e.left > 0, boss = monName(ZONES[e.zone].boss);
    h += `<h3 class="cat-title">${esc(tx("echo.title"))}</h3><div class="nodes zones"><button type="button" class="node zone echo" data-echo="1" ${can ? "" : "disabled"}><span class="ic" aria-hidden="true">${tyIcon(ZONES[e.zone].type)}</span><strong>${esc(boss)}</strong>
      <small>${esc(tx("echo.sub", { boss, rule: tx("echo.r." + e.rule) }))}</small><small>${esc(!e.lvlOk ? tx("echo.lock", { n: ECHO_LVL }) : e.left > 0 ? tx("echo.left", { n: e.left }) : tx("echo.none"))}</small></button></div>`;
  }
  return h;
}
function saviaHtml() {
  const st = EV.P.stars || {}, sS = EV.P.starsS || {};
  let h = "";
  const sav = Object.keys(ZONES).filter((id) => (st[id] || 0) >= 3);
  h += `<h3 class="cat-title">${esc(tx("sav.title"))}</h3><p class="muted" style="margin:0">${esc(tx(sav.length ? "sav.sub" : "sav.hint"))}</p>`;
  if (sav.length) h += `<div class="nodes zones">${sav.map((id) => `<button type="button" class="node zone savia" data-zone="${id}" data-savia="1"><span class="ic" aria-hidden="true">${tyIcon(ZONES[id].type)}</span><strong>${esc(zt("name", null, id))}</strong><small>${esc(tx("zones.lvlS", { n: ZONES[id].min + 2 }))}</small><small class="ok">${starStr(sS[id] || 0)}</small></button>`).join("")}</div>`;
  return h;
}
/* ---------- The parchment map of the valley ---------- */
// Dayside above the stream, the Underside below it; the Ford (home) sits on the stream. Coordinates in a 240 x 152 sheet.
const PMAP = { heights: [120, 17], crater: [50, 44], aurora: [120, 42], forest: [190, 44], heart: [120, 68], vado: [120, 88], hollow: [52, 108], lake: [120, 114], caves: [188, 108], deep: [120, 138] };
const PEDGES = [["vado", "aurora"], ["aurora", "crater"], ["aurora", "forest"], ["vado", "heart"], ["crater", "heights", "rope"], ["forest", "heights", "rope"], ["vado", "hollow"], ["vado", "lake", "raft"], ["vado", "caves"], ["lake", "deep"]];
let pm = null; // { from, to, t0 } while the token walks
function pmapHtml() {
  const have = Object.keys(KEYS).filter(hasKey).map((k) => tx("key." + k));
  return `<div class="pmap-wrap"><canvas id="pmap" width="480" height="304" role="img" aria-label="${esc(tx("pmap.aria"))}"></canvas></div><p class="muted pmap-note">${esc(tx("pmap.hint"))} ${esc(have.length ? tx("pmap.keys", { list: have.join(", ") }) : tx("pmap.nokeys"))}</p>`;
}
// the raft and the rope, drawn small (8x8 at scale s)
function drawKeyIcon(g, k, cx, cy, have) {
  const ink = "#241030", col = (a) => (have ? a : "#a8977a");
  g.save(); g.imageSmoothingEnabled = false;
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(cx + x), Math.round(cy + y), w, h); };
  if (k === "raft") { r(-6, -2, 12, 5, ink); for (let i = 0; i < 4; i++) r(-5 + i * 3, -1, 2, 3, col("#a07a55")); r(-1, -7, 1, 5, ink); r(0, -7, 4, 3, col("#fbf6ef")); }
  else { g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 4.5, 0, Math.PI * 2); g.stroke(); g.strokeStyle = col("#d9b26a"); g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, 4.5, 0, Math.PI * 2); g.stroke(); r(3, 3, 2, 4, ink); }
  g.restore();
}
function pmapDraw(now) {
  const cv = $("pmap"); if (!cv) return false;
  const g = cv.getContext("2d"), P = EV.P;
  g.setTransform(2, 0, 0, 2, 0, 0); g.imageSmoothingEnabled = false;
  // parchment with darker, uneven edges
  g.fillStyle = "#e9d8b4"; g.fillRect(0, 0, 240, 152);
  g.fillStyle = "#d8c193"; for (let i = 0; i < 240; i += 2) { const a = 2 + ((i * 7) % 5), b = 2 + ((i * 11) % 4); g.fillRect(i, 0, 2, a); g.fillRect(i, 152 - b, 2, b); }
  for (let j = 0; j < 152; j += 2) { const a = 2 + ((j * 5) % 4), b = 2 + ((j * 13) % 5); g.fillRect(0, j, a, 2); g.fillRect(240 - b, j, b, 2); }
  g.fillStyle = "#c9b07e"; for (let i = 0; i < 70; i++) g.fillRect((i * 97) % 236 + 2, (i * 53) % 148 + 2, 1, 1);
  // the stream between the two halves of the valley
  g.strokeStyle = "#7cc8e3"; g.lineWidth = 3; g.beginPath(); g.moveTo(4, 92);
  for (let x = 4; x <= 236; x += 4) g.lineTo(x, 89 + Math.sin(x / 14) * 3);
  g.stroke(); g.fillStyle = "#a8834e"; g.fillRect(114, 84, 12, 9); // the ford's stepping stones
  g.fillStyle = "#3b1d4a"; g.font = '600 6px "EvNum", "Pixelify Sans", monospace'; g.textAlign = "left"; g.textBaseline = "alphabetic";
  // paths
  const open = (id) => id === "vado" || zoneOpen(id);
  for (const [a, b, key] of PEDGES) {
    const [x1, y1] = PMAP[a], [x2, y2] = PMAP[b], on = open(a) && open(b);
    g.strokeStyle = on ? "#6b4a3a" : "#bba57a"; g.lineWidth = 1; g.setLineDash([3, 2]);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]);
    // the raft waits on the stream by the ford; the rope hangs on the mountain paths
    if (key === "raft") drawKeyIcon(g, key, 100, 98, hasKey(key));
    else if (key) drawKeyIcon(g, key, (x1 + x2) / 2, (y1 + y2) / 2, hasKey(key));
  }
  // places
  const cl = P.cleared || {}, st = P.stars || {};
  g.textAlign = "center";
  for (const id in PMAP) {
    const [x, y] = PMAP[id];
    if (id === "vado") { g.fillStyle = "#6b4a3a"; g.fillRect(x - 4, y - 9, 8, 5); g.fillStyle = "#d9542c"; g.fillRect(x - 5, y - 11, 10, 2); g.fillStyle = "#3b1d4a"; g.textAlign = "right"; g.fillText(tx("pmap.vado"), x - 8, y - 4); g.textAlign = "center"; continue; }
    const z = ZONES[id], o = zoneOpen(id);
    g.fillStyle = "#241030"; g.beginPath(); g.arc(x, y, 7.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = o ? z.sky[1] : "#cdb98c"; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
    if (!o) { g.fillStyle = "#6b4a3a"; g.fillText("?", x, y + 2.5); }
    else if (cl[id]) { // a gold stamp per star
      const n = st[id] || 0; g.fillStyle = "#e2ae2e"; for (let i = 0; i < n; i++) g.fillRect(x - 5 + i * 4, y + 9, 3, 3);
    }
    g.fillStyle = o ? "#241030" : "#a8977a"; g.fillText(zt("name", null, id), x, y - 10);
  }
  // your creature as a little token, walking along the path you picked
  const S = EV.S, at = P.mapAt && PMAP[P.mapAt] ? P.mapAt : "vado";
  let [tx2, ty2] = PMAP[at], walking = false;
  if (pm) { const k = Math.min(1, (now - pm.t0) / 700), [ax, ay] = PMAP[pm.from], [bx, by] = PMAP[pm.to]; tx2 = ax + (bx - ax) * k; ty2 = ay + (by - ay) * k - Math.abs(Math.sin(k * Math.PI * 4)) * 2; walking = k < 1; if (!walking) { const id = pm.to; pm = null; P.mapAt = id; EV.saveProfile(); pickZone(id); return false; } }
  if (S && typeof EVS !== "undefined" && EVS.KINDS.includes(S.species)) {
    try { const sp = EVS.sprite(S.species, 12, Math.max(0, Math.min(2, S.stage || 0)), walking ? Math.floor(now / 140) % 2 : 0, "happy"); g.drawImage(sp, Math.round(tx2 - sp.width / 2 + 9), Math.round(ty2 - sp.height + 4)); } catch (e) {}
  }
  return walking;
}
function pmapMount() { const loop = (now) => { if (pmapDraw(now)) requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
function pmapTap(e) {
  if (pm) return;
  const cv = e.target, r = cv.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * 240, y = ((e.clientY - r.top) / r.height) * 152;
  let best = null, bd = 14;
  for (const id in PMAP) { if (id === "vado") continue; const d = Math.hypot(PMAP[id][0] - x, PMAP[id][1] - y); if (d < bd) { bd = d; best = id; } }
  if (!best) return;
  if (!zoneOpen(best)) { EV.sfx("deny"); EV.toast(keyLock(best) || tx("pmap.locked")); return; }
  EV.sfx("tap");
  const at = EV.P.mapAt && PMAP[EV.P.mapAt] ? EV.P.mapAt : "vado";
  if (at === best) { pickZone(best); return; }
  pm = { from: at, to: best, t0: performance.now() }; pmapMount();
}
function zonesHtml() {
  const cl = EV.P.cleared || {};
  return `<div class="nodes zones">${Object.keys(ZONES).map((id) => {
    const z = ZONES[id], open = zoneOpen(id);
    const done = cl[id] || 0;
    return `<button type="button" class="node zone" data-zone="${id}" ${open ? "" : "disabled"}><span class="ic" aria-hidden="true">${tyIcon(z.type)}</span>
      <strong>${esc(zt("name", null, id))}</strong><small>${esc(zt("sub", null, id))}</small>
      <small>${open ? esc(tx("zones.lvl", { n: z.min, m: zoneLvl(z, (rpgState() || { lvl: 1 }).lvl) })) : "🔒 " + esc(keyLock(id) || tx(z.unlockAll ? "zones.lockHeart" : Array.isArray(z.unlock) ? (z.unlock.includes("hollow") ? "zones.lockHigh" : "zones.lockEnv") : "zones.lock"))}</small>
      ${done ? `<small class="ok">✓ ${esc(tx("zones.done", { n: done }))} · ${starStr((EV.P.stars || {})[id] || 0)}<br>${esc(tx("zones.verse", { v: zt("verse", null, id) }))}</small>` : ""}</button>`;
  }).join("")}</div>`;
}
function setOut() {
  const S = EV.S;
  if (!X.duel) S.stats.energy = Math.max(0, S.stats.energy - (X.deep ? DEEP_COST : 25));
  const R = rpgState();
  const fm = formOf(formKeys());
  X.party = [{ own: true, kind: S.species, hp: 1, pos: fm.own }].concat(X.chosen.map((k) => { const r = refOf(k); return { own: false, kind: k, hp: 1, lvl: r ? r.lvl : R.lvl, bond: r ? r.bond : 0, star: r ? r.star : 0, roster: !!r, pos: fm[k] }; }));
  if (X.echo) { echoInfo(); EV.P.echo.tries++; if (X.echo === "tired") for (const m of X.party) m.hp = 0.8; }
  if (X.deep && X.deepRule === "tired") for (const m of X.party) m.hp = 0.8;
  // a team from three different type circles (for the Types achievements)
  const circ = new Set(X.party.map((m) => CIRCLE[MONS[m.kind].types[0]]).filter(Boolean));
  if (circ.size >= 3) EV.P.c.trio = (EV.P.c.trio || 0) + 1;
  EV.addLog(tx("log.expGo", { name: S.name, to: zt("to") }));
  EV.save();
  nextSection();
}
function nextSection() {
  const z = ZONES[X.zone];
  X.section++;
  if (X.duel) { X.section = z.sections + 1; startBattle(true); return; }
  if (X.echo) { X.section = z.sections + 1; X.nodes = ["boss"]; show("map"); return; }
  if (X.deep) { X.section = z.sections + 1; X.nodes = [deepBoss(X.deep) ? "boss" : "fight"]; show("map"); return; }
  if (X.section > z.sections) { X.nodes = ["boss"]; healParty(0.3); show("map"); return; }
  const types = ["fight", "fight", "event", "chest", "rest", "event", "fight"];
  let n = X.section === 1 ? ["fight", "event"] : pickN(types, 3);
  n = Array.from(new Set(n));
  if (n.length < 2) n.push(n[0] === "fight" ? "event" : "fight");
  if (X.section === 1 && rnd() < 0.5) n.push("chest");
  X.nodes = n.slice(0, 3);
  show("map");
}
// a creature from your Refuge: { lvl, bond, grade } or null
const refOf = (k) => (EV.EGGS ? EV.EGGS.unitOf(k) : null);
function partyUnits() { return X.party.map(memberUnit); }
// one party member as a battle unit (also used to suggest a formation before the trip)
function memberUnit(m) {
  if (m.own) return makeUnit(Object.assign(ownUnitOpts(m.hp), { pos: m.pos }));
  // Unísona uses your best copy of each of its cards, so it grows as you fuse them
  // Refuge companions' cards grow with Bond
  const rg = m.roster && refOf(m.kind) ? refOf(m.kind).grade : 0;
  const gr = (id) => (m.kind === "unisona" ? Math.max(0, ...EV.P.cards.filter((c) => c.id === id).map((c) => c.g)) : rg);
  const mc = MONS[m.kind].cards;
  const cards = { a: scaled(mc[0], gr(mc[0])), p: scaled(mc[1], gr(mc[1])) };
  if (m.lvl >= SLOT_LVL.s || m.kind === "unisona") cards.s = scaled(mc[2], gr(mc[2]));
  // a Refuge companion carries the cards you gave it; empty slots keep its usual ones
  if (m.roster) for (const k of ["a", "p", "s"]) { const c = compCard(m.kind, k); if (c) cards[k] = scaled(c.id, c.g); }
  const ro = m.roster && EV.P.eg && EV.P.eg.roster[m.kind];
  return makeUnit({ kind: m.kind, lvl: m.lvl, side: "ally", name: monName(m.kind), wild: true, cards, hpPct: m.hp, stage: 1, form: "bright", bond: m.bond || 0, star: m.star || 0, tal: ro ? companionTal(m.kind, m.lvl, ro) : [], pos: m.pos });
}
// Above a zone's level its foes only grow by a share of your extra levels (Jose's rule): in the first zone 50 % for one
// level more, 33 % for two, 25 % for three... never below 10 %; later zones keep a bigger share (rank = the zone's level).
// So an early zone can be replayed with a stronger team for 3 stars. Savia Mode and the Guardian's Echo still grow
// with you in full, since they are the hard versions.
function zoneShare(z, extra) { const r = z.min - 1; return Math.min(1, Math.max(0.1 + 0.05 * r, (1 + 0.25 * r) / (extra + 1))); }
function zoneLvl(z, lvl) { const extra = Math.max(0, lvl - z.min); return z.min + Math.round(extra * zoneShare(z, extra)); }
function foeUnits(boss) {
  const z = ZONES[X.zone], R = rpgState();
  if (X.deep) return deepFoes(boss);
  if (X.duel) return duelFoes();
  if (boss) {
    const lvl = X.savia || X.echo ? Math.max(z.min, R.lvl) : zoneLvl(z, R.lvl);
    const m = MONS[z.boss];
    const cards = { a: scaled(m.cards[0], 0), p: scaled(m.cards[1], 0), s: scaled(m.cards[2], 0) };
    const u = makeUnit({ kind: z.boss, lvl: lvl + (X.savia ? 2 : X.echo ? 1 : 0), side: "foe", name: monName(z.boss), boss: true, cards, stage: 1 });
    if (X.savia) buffUnit(u, 1.15);
    if (X.echo) {
      buffUnit(u, 1.15);
      if (X.echo === "shell") { u.shield = Math.round(u.maxHp * 0.25); u.shieldT = 99; }
      if (X.echo === "fury") { u.base.str *= 1.25; u.base.def *= 0.85; }
      if (X.echo === "swift") u.base.spd *= 1.4;
    }
    return [u];
  }
  const count = X.section <= 1 ? 2 : rnd() < 0.5 ? 3 : 2;
  const lvl = Math.max(z.min, Math.round((X.savia ? R.lvl : zoneLvl(z, R.lvl)) * 0.8 + (X.section - 1) * 0.25));
  const kinds = X.eventFoes && X.eventFoes.length ? X.eventFoes.filter((k) => MONS[k]) : pickN(z.foes.concat(z.foes), count);
  X.eventFoes = null;
  return kinds.map((k) => {
    const cs = MONS[k].cards;
    const cards = { a: scaled(cs[Math.floor(rnd() * 2)], 0) };
    if (X.section >= 4) cards.p = scaled(cs[1], 0);
    const u = makeUnit({ kind: k, lvl: lvl + (X.savia ? 2 : 0), side: "foe", name: monName(k, true), hollow: true, cards, stage: 1 });
    if (X.savia) buffUnit(u, 1.15);
    if (X.nextFoeBuff) { u.base.str *= 1 + X.nextFoeBuff / 100; }
    return u;
  });
}

/* ---------- Views ---------- */
function show(v) { view = v; render(); const el = $("scrExp"); if (el && !el.hidden) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
function pickStats(k) {
  const r = refOf(k);
  const ro = EV.P.eg && EV.P.eg.roster[k];
  const u = makeUnit({ kind: k, lvl: r ? r.lvl : rpgState().lvl, side: "ally", wild: true, stage: 1, bond: r ? r.bond : 0, star: r ? r.star : 0, tal: ro ? companionTal(k, ro.lvl, ro) : [] });
  const v = { hp: u.maxHp, str: Math.round(u.base.str), def: Math.round(u.base.def), spd: Math.round(u.base.spd), cr: Math.round(u.crit) + " %" };
  return `<span class="mstats">${Object.keys(v).map((k) => `<span><i>${esc(tx("sh." + k))}</i><b>${v[k]}</b></span>`).join("")}</span>`;
}
function partyHtml() {
  return `<div class="party">${X.party.map((m) => {
    const nm = m.own ? EV.S.name : monName(m.kind);
    const ty = MONS[m.kind].types[0];
    return `<div class="pm${m.hp <= 0 ? " down" : ""}"><strong>${esc(nm)}</strong>${typeChip(ty)} <span class="progress">${Math.round(m.hp * 100)} %</span><div class="bar"><i style="width:${Math.round(m.hp * 100)}%"></i></div></div>`;
  }).join("")}</div>`;
}
function trailHtml() {
  const z = ZONES[X.zone], out = [];
  for (let i = 1; i <= z.sections + 1; i++) out.push(`<i class="${i < X.section ? "done" : i === X.section ? "now" : ""}"></i>`);
  return `<div class="trail" aria-hidden="true">${out.join("")}</div>`;
}
/* ---------- a picture for every pause (EVSCENE.pause, drawn by zone, kind and Savia/Echo mode) ---------- */
const pauseMode = () => (X.savia ? "savia" : X.echo ? "echo" : undefined);
const pauseBox = (kind) => (window.EVSCENE && EVSCENE.pause && X && !X.duel ? `<div class="talk-scene pause-scene" data-pause="${kind}"></div>` : "");
function pauseMount(root) {
  root.querySelectorAll("[data-pause]").forEach((box) => {
    let cv = null; try { cv = EVSCENE.pause(X.zone, box.dataset.pause, pauseMode()); } catch (e) { /* art is decoration */ }
    if (!cv) { box.remove(); return; }
    cv.setAttribute("role", "img"); cv.setAttribute("aria-label", zt("name")); box.appendChild(cv);
  });
}
// a short look at the zone before each fight; it moves on by itself, or with a tap
let preTimer = 0;
function preFight(boss) {
  if (!pauseBox("pelea")) { startBattle(boss); return; }
  X.pre = { boss }; show("prefight");
  clearTimeout(preTimer); preTimer = setTimeout(() => { if (X && view === "prefight") goFight(); }, 1600);
}
function goFight() { clearTimeout(preTimer); if (!X || !X.pre) return; const b = X.pre.boss; X.pre = null; startBattle(b); }
function render() {
  const el = $("scrExp"); if (!el) return;
  if (!X) { el.innerHTML = ""; return; }
  const z = ZONES[X.zone];
  const head = `<div class="panel"><div class="panel-head"><div><div class="sub">${esc(view === "zones" ? tx("zones.sub") : X.duel ? tx("duel.title") : zt("sub"))}</div><h2>${esc(view === "zones" ? tx("zones.title") : (X.duel ? tx("duel.vs", { n: duelFoe(X.duel) ? duelFoe(X.duel).n : "" }) : zt("name")) + (X.savia ? " · " + tx("sav.tag") : X.echo ? " · " + tx("echo.tag") : X.deep ? " · " + tx("deep.tag", { n: X.deep }) : ""))}</h2></div>${view !== "pick" && view !== "zones" && view !== "end" && view !== "battle" && !(view === "reward" && X.shot) ? `<button class="btn ghost" type="button" data-x="quit">${esc(tx("quit"))}</button>` : ""}</div>${view !== "pick" && view !== "zones" && !X.duel ? trailHtml() : ""}</div>`;
  let body = "";
  if (view === "zones") {
    const rumor = LORE ? LORE.loadingLine(EV.P, L()) : "";
    body = `<div class="panel">${rumor ? `<p class="rumor">${esc(tx("rumor"))} ${esc(rumor)}</p>` : ""}${pmapHtml()}${zoneTabsHtml()}<div class="bctl"><button class="btn ghost" type="button" data-x="cancel">${esc(tx("exp.cancel"))}</button></div></div>`;
  } else if (view === "pick") {
    body = `<div class="panel"><p class="lead">${esc(X.duel ? tx("duel.desc") : zt("desc"))}</p>
      ${setBarHtml()}<h3>${esc(tx("exp.pick"))}</h3><p class="muted" style="margin:0">${esc(tx("exp.pickSub"))}</p>
      <div class="mons">${X.offer.map((k) => `<button type="button" class="mon" data-pick="${k}" aria-pressed="${X.chosen.includes(k)}"><canvas width="96" height="80" data-mon="${k}"></canvas><strong>${esc(monName(k))}</strong>${typeChip(MONS[k].types[0])}<small>${esc(MON_DESC[L()][k])}</small>${refOf(k) ? `<span class="mref">${esc(EV.EGGS.badge(k))}</span>` : ""}${pickStats(k)}</button>`).join("")}</div>
      </div>${loadoutHtml()}${X.chosen.filter((k) => refOf(k)).map(compLoadHtml).join("")}${X.chosen.some((k) => !refOf(k) && k !== "unisona") ? `<p class="muted cload-wild">${esc(tx("cload.wild"))}</p>` : ""}${formHtml()}<div class="panel">
      <div class="bctl"><button class="btn" type="button" data-x="go" ${X.chosen.length === 2 ? "" : "disabled"}>${esc(X.duel ? tx("duel.go") : tx("exp.go") + " · " + tx("exp.cost"))}</button><button class="btn ghost" type="button" data-x="cancel">${esc(tx("exp.cancel"))}</button></div></div>`;
  } else if (view === "map") {
    const icons = { fight: "⚔️", event: "❓", chest: "🎁", rest: "🔥", boss: "🏮" };
    body = `<div class="panel">${pauseBox(X.nodes[0] === "boss" ? "jefe" : "camino")}<div class="sub">${esc(X.nodes[0] === "boss" ? tx("node.boss") : tx("exp.section", { n: X.section, m: z.sections }))}</div>
      <h3>${esc(X.nodes[0] === "boss" ? tx("exp.bossNext") : tx("exp.choose"))}</h3>
      <div class="nodes">${X.nodes.map((n) => `<button type="button" class="node${n === "boss" ? " boss" : ""}" data-node="${n}"><span class="ic" aria-hidden="true">${n === "event" ? '<i class="evd"></i>' : icons[n]}</span><strong>${esc(tx("node." + n))}</strong><small>${esc((n === "boss" ? zt("bossD") : tx("node." + n + ".d")))}</small></button>`).join("")}</div></div>
      <div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}${lootHtml()}</div>`;
  } else if (view === "battle") {
    body = `<div class="panel"><div class="bbar"><span class="sub grow" id="bRound"></span>
        <div class="seg" id="bMode">${["auto", "semi", "manual"].map((m) => `<button type="button" data-m="${m}" aria-pressed="${EV.P.rpgMode === m}" title="${esc(tx("b.modeT." + m))}">${esc(tx("b." + m))}</button>`).join("")}</div>
        <div class="seg" id="bSpeed">${[1, 2, 4].map((s) => `<button type="button" data-s="${s}" aria-pressed="${(EV.P.rpgSpeed || 1) === s}">×${s}</button>`).join("")}</div></div>
      <div class="bstage"><canvas id="bCanvas" role="img" aria-label="${esc(view === "zones" ? tx("zones.title") : zt("name"))}"></canvas></div>
      <div id="bTurn"></div>
      <ul class="blog" id="bLog" aria-live="polite"></ul></div>`;
  } else if (view === "prefight") {
    const bo = X.pre && X.pre.boss;
    body = `<div class="panel">${pauseBox(bo ? "jefe" : "pelea")}<div class="sub">${esc(tx(bo ? "node.boss" : "node.fight"))}</div><h3>${esc(bo ? zt("bossD") : tx("pre.fight"))}</h3><div class="bctl"><button class="btn" type="button" data-x="prego">${esc(tx("pre.go"))}</button></div></div>`;
  } else if (view === "event") {
    body = eventHtml();
  } else if (view === "reward") {
    body = rewardHtml();
  } else if (view === "end") {
    body = endHtml();
  }
  el.innerHTML = head + body;
  if (view === "pick") el.querySelectorAll("canvas[data-mon]").forEach(paintMon);
  if (view === "battle") battleMount();
  if (view === "event" && X.talk) talkMount(el);
  pauseMount(el);
  if (view === "zones") pmapMount();
  el.querySelectorAll("canvas[data-key]").forEach((c) => drawKeyIcon(c.getContext("2d"), c.dataset.key, 8, 8, true));
}
// small pixel portrait of a creature on a 96x80 canvas with data-mon
function paintMon(cv) {
  const out = EV.setupCanvas(cv, 96, 80);
  if (evsKind(cv.dataset.mon)) { const spr = EVS.sprite(cv.dataset.mon, 24, 1, 0, "happy"); out.imageSmoothingEnabled = false; out.drawImage(spr, (96 - spr.width * 3) / 2, 80 - spr.height * 3, spr.width * 3, spr.height * 3); return; }
  if (typeof PX === "undefined") { out.translate(48, 44); out.scale(0.62, 0.62); drawMon(out, cv.dataset.mon, { t: 0.5, stage: 1, form: "bright", hp: 1 }); return; }
  const L = PX.layer(32, 27), c = L.g; c.scale(1 / 3, 1 / 3); c.translate(48, 44); c.scale(0.62, 0.62);
  drawMon(c, cv.dataset.mon, { t: 0.5, stage: 1, form: "bright", hp: 1 });
  c.setTransform(1, 0, 0, 1, 0, 0); PX.quantize(c, 32, 27, false); PX.blit(out, L, 96, 81);
}
// pre-trip loadout: up to 3 cards, one per slot. Each slot is a row: thumbnail, name and effect, and a Change button
const thumbHtml = (id, g, sil) => `<canvas class="rc-thumb" width="64" height="48" data-thumb="${id}"${sil ? ' data-sil="1"' : ""} style="--g:${g == null ? "#9d93ad" : GRADES[g].col}"></canvas>`;
function cardRowInner(id, g, slot, tag) {
  const C = CARDS[id];
  return `${thumbHtml(id, g)}<div class="lr-txt"><span class="lr-top"><span class="lr-slot">${esc(tx("slot." + slot))}</span>${tag ? `<span class="lr-tag">${esc(tag)}</span>` : ""}</span><strong>${esc(cardName(id))}</strong><span class="lr-meta">${typeChip(C.type)} ${gradeChip(g)}</span><span class="lr-fx">${esc(slotText(scaled(id, g), slot))}</span></div>`;
}
// who: "own" or a Refuge creature kind
function slotRowsHtml(who) {
  const own = who === "own", R = rpgState(), r = own ? null : rosterOf(who); if (own ? !R : !r) return "";
  const lvl = own ? R.lvl : r.lvl;
  return `<div class="lrows">${["a", "p", "s"].map((k) => {
    if (lvl < SLOT_LVL[k]) return `<div class="lrow locked"><div class="lr-empty">🔒</div><div class="lr-txt"><span class="lr-slot">${esc(tx("slot." + k))}</span><span class="lr-fx">${esc(tx("load.lock", { n: SLOT_LVL[k] }))}</span></div></div>`;
    let inner;
    if (own) { const c = R.eq[k] && cardByUid(R.eq[k]); inner = c ? cardRowInner(c.id, c.g, k) : `<div class="lr-empty">＋</div><div class="lr-txt"><span class="lr-slot">${esc(tx("slot." + k))}</span><strong>${esc(tx("cards.empty"))}</strong><span class="lr-fx">${esc(tx("load.emptyFx"))}</span></div>`; }
    else { const c = compCard(who, k), def = MONS[who].cards[{ a: 0, p: 1, s: 2 }[k]], ref = refOf(who); inner = c ? cardRowInner(c.id, c.g, k) : cardRowInner(def, ref ? ref.grade : 0, k, tx("cload.def")); }
    return `<div class="lrow">${inner}<button class="btn ghost lr-chg" type="button" data-chg="${who}:${k}">${esc(tx("load.change"))}</button></div>`;
  }).join("")}</div>`;
}
function setBarHtml() {
  const sets = teamState().sets.map((st, i) => (st ? `<button class="chip-btn" type="button" data-xset="${i}">${esc(st.n)}</button>` : "")).filter(Boolean);
  return sets.length ? `<div class="setbar"><span class="sub">${esc(tx("team.sets"))}</span>${sets.join("")}</div>` : "";
}
function loadoutHtml() {
  const R = rpgState(); if (!R) return "";
  return `<div class="panel"><h3>${esc(tx("load.title"))}</h3><p class="muted" style="margin:0">${esc(tx("load.sub"))} ${esc(canTypesText())}</p>${slotRowsHtml("own")}</div>`;
}
function setLoad(slot, uid) {
  const R = rpgState(); if (!R) return;
  const c = uid && cardByUid(uid);
  if (c && (!usable(c.id) || compUids().has(c.uid))) { EV.sfx("deny"); return; }
  if (c) for (const k of ["a", "p", "s"]) { const o = R.eq[k] && cardByUid(R.eq[k]); if (k !== slot && o && o.id === c.id) R.eq[k] = null; }
  R.eq[slot] = c ? c.uid : null;
  if (c) EV.P.c.equips = (EV.P.c.equips || 0) + 1;
  EV.sfx("card"); EV.save(); render();
}
/* Refuge companions can carry your cards: their circle's types, Star cards and their own.
   Each copy of a card goes to one creature at a time. Companions you don't own keep their usual cards. */
const rosterOf = (k) => (EV.P.eg && EV.P.eg.roster && EV.P.eg.roster[k]) || null;
function compFits(kind, id) {
  const c = CARDS[id], m = MONS[kind]; if (!c || !m) return false;
  return c.by === kind || c.type === "star" || CIRCLE[c.type] === CIRCLE[m.types[0]];
}
// copies currently lent to Refuge companions
function compUids() { const u = new Set(), ro = (EV.P.eg && EV.P.eg.roster) || {}; for (const k in ro) for (const s of ["a", "p", "s"]) if (ro[k].eq && ro[k].eq[s]) u.add(ro[k].eq[s]); return u; }
function usedUids(skipKind, skipSlot) {
  const used = new Set(), R = rpgState();
  for (const k of ["a", "p", "s"]) if (R && R.eq[k]) used.add(R.eq[k]);
  const ro = (EV.P.eg && EV.P.eg.roster) || {};
  for (const kind in ro) for (const k of ["a", "p", "s"]) { const u = ro[kind].eq && ro[kind].eq[k]; if (u && !(kind === skipKind && k === skipSlot)) used.add(u); }
  return used;
}
// the card a companion carries in a slot, or null for its usual one
function compCard(kind, slot) {
  const r = rosterOf(kind), u = r && r.eq && r.eq[slot]; if (!u) return null;
  const c = cardByUid(u);
  if (!c || !compFits(kind, c.id) || r.lvl < SLOT_LVL[slot]) return null;
  return c;
}
function compLoadHtml(kind) {
  const r = rosterOf(kind); if (!r) return "";
  r.eq = r.eq || {};
  const nm = monName(kind), circleTypes = Object.keys(CIRCLE).filter((t) => CIRCLE[t] === CIRCLE[MONS[kind].types[0]]).map((t) => TYPES[t][L()]).join(", ");
  return `<div class="panel"><h3>${esc(tx("cload.title", { name: nm }))}</h3><p class="muted" style="margin:0">${esc(tx("cload.sub", { name: nm, types: circleTypes }))}</p>${slotRowsHtml(kind)}</div>`;
}
function setCompLoad(kind, slot, uid) {
  const r = rosterOf(kind); if (!r) return;
  r.eq = r.eq || {};
  const c = uid && cardByUid(uid);
  if (c && (!compFits(kind, c.id) || usedUids(kind, slot).has(c.uid))) { EV.sfx("deny"); return; }
  // one card id per creature: the same card can't sit in two of its slots
  if (c) for (const k of ["a", "p", "s"]) { const o = compCard(kind, k); if (k !== slot && o && o.id === c.id) r.eq[k] = null; }
  r.eq[slot] = c ? c.uid : null;
  if (c) EV.P.c.equips = (EV.P.c.equips || 0) + 1;
  EV.sfx("card"); EV.save(); render();
}
/* ---------- Card picker: every card that fits the slot, each with its effect in that slot ---------- */
let CPICK = null; // { who, slot }
function pickRows(who, slot) {
  const P = EV.P, R = rpgState(), rows = [];
  if (who === "own") {
    const lent = compUids(), best = {};
    for (const c of P.cards) if (usable(c.id) && !lent.has(c.uid) && (!best[c.id] || c.g > best[c.id].g)) best[c.id] = c;
    const cur = R.eq[slot] && cardByUid(R.eq[slot]);
    if (cur) best[cur.id] = cur;
    rows.push({ uid: "", empty: true, on: !cur });
    for (const c of Object.values(best).sort((a, b) => b.g - a.g || cardName(a.id).localeCompare(cardName(b.id)))) {
      const other = ["a", "p", "s"].find((k) => k !== slot && R.eq[k] && (cardByUid(R.eq[k]) || {}).id === c.id);
      rows.push({ uid: c.uid, id: c.id, g: c.g, on: !!(cur && cur.uid === c.uid), tag: other ? tx("load.inSlot", { s: tx("slot." + other) }) : "" });
    }
  } else {
    const cur = compCard(who, slot), used = usedUids(who, slot), best = {}, ref = refOf(who);
    for (const c of P.cards) if (compFits(who, c.id) && (!used.has(c.uid) || (cur && cur.uid === c.uid)) && (!best[c.id] || c.g > best[c.id].g)) best[c.id] = c;
    if (cur) best[cur.id] = cur;
    rows.push({ uid: "", id: MONS[who].cards[{ a: 0, p: 1, s: 2 }[slot]], g: ref ? ref.grade : 0, on: !cur, tag: tx("cload.def") });
    for (const c of Object.values(best).sort((a, b) => b.g - a.g || cardName(a.id).localeCompare(cardName(b.id)))) {
      const other = ["a", "p", "s"].find((k) => k !== slot && (compCard(who, k) || {}).id === c.id);
      rows.push({ uid: c.uid, id: c.id, g: c.g, on: !!(cur && cur.uid === c.uid), tag: other ? tx("load.inSlot", { s: tx("slot." + other) }) : "" });
    }
  }
  return rows;
}
function openPick(who, slot) {
  CPICK = { who, slot };
  let el = $("cpick");
  if (!el) {
    el = document.createElement("div"); el.id = "cpick"; el.className = "cpick-wrap"; document.body.appendChild(el);
    el.addEventListener("click", onPickClick);
  }
  const nm = who === "own" ? EV.S.name : monName(who), rows = pickRows(who, slot);
  el.innerHTML = `<div class="cpick-back" data-cp="close"></div><div class="cpick" role="dialog" aria-modal="true"><div class="cp-head"><div><span class="sub">${esc(nm)}</span><h3>${esc(tx("load.pickTitle", { s: tx("slot." + slot) }))}</h3></div><button class="sheet-x" type="button" data-cp="close" aria-label="${esc(tx("load.close"))}">✕</button></div>` +
    `${rows.length > 4 ? cfFilterHtml("pick", TYPE_ORDER.filter((t) => rows.some((r) => r.uid && CARDS[r.id].type === t))) : ""}<div class="cp-list">${rows.map((r) => `<button type="button" class="lrow pickrow${r.on ? " on" : ""}" data-cpu="${r.uid}"${r.uid ? ` data-cpk="${r.uid}"` : ""}>${r.empty ? `<div class="lr-empty">∅</div><div class="lr-txt"><span class="lr-slot">${esc(tx("slot." + slot))}</span><strong>${esc(tx("cards.empty"))}</strong><span class="lr-fx">${esc(tx("load.emptyFx"))}</span></div>` : cardRowInner(r.id, r.g, slot, r.on ? tx("load.equipped") : r.tag)}</button>`).join("")}</div></div>`;
  el.hidden = false;
  const cards = rows.filter((r) => r.uid), eqSet = new Set(["a", "p", "s"].map((k) => (who === "own" ? (rpgState() || { eq: {} }).eq[k] : (compCard(who, k) || {}).uid)).filter(Boolean));
  for (const u of compUids()) eqSet.add(u);
  CFX.pick = { keys: cards.map((r) => r.uid), id: (k) => (cardByUid(k) || {}).id, cards: (k) => [cardByUid(k)], copies: (k) => EV.P.cards.filter((c) => c.id === (cardByUid(k) || {}).id), eqSet, box: el.querySelector(".cp-list"), attr: "data-cpk" };
  applyCF("pick");
}
function closePick() { CPICK = null; const el = $("cpick"); if (el) el.hidden = true; }
function onPickClick(e) {
  const f = e.target.closest("button"); if (f && CPICK && cfClick(f, () => openPick(CPICK.who, CPICK.slot))) return;
  const t = e.target.closest("[data-cp],[data-cpu]"); if (!t || !CPICK) return;
  if (t.dataset.cp === "close") { EV.sfx("tap"); closePick(); return; }
  const { who, slot } = CPICK; closePick();
  if (who === "own") setLoad(slot, t.dataset.cpu); else setCompLoad(who, slot, t.dataset.cpu);
  refreshLoadViews();
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && CPICK) { e.stopImmediatePropagation(); closePick(); } }, true);
function refreshLoadViews() {
  if ($("cardsPanel") && !$("cardsPanel").hidden) renderCards();
  if ($("teamsPanel") && !$("teamsPanel").hidden) renderTeams();
}
/* ---------- Teams: your creature and two Refuge companions, with up to 5 saved sets ---------- */
const SETS_N = 5;
const teamSlice = EV.slice("team", () => ({ comp: [], sets: [] }));
function teamState() {
  const P = EV.P;
  teamSlice();
  const ro = (P.eg && P.eg.roster) || {};
  P.team.comp = (P.team.comp || []).filter((k) => ro[k]).slice(0, 2);
  while (P.team.sets.length < SETS_N) P.team.sets.push(null);
  return P.team;
}
let teamEdit = -1;
function setSummary(st) {
  const names = st.comp.map(monName).join(", ");
  const nC = ["a", "p", "s"].filter((k) => st.own[k]).length + st.comp.reduce((n, k) => n + ["a", "p", "s"].filter((s) => (st.ce[k] || {})[s]).length, 0);
  return tx("team.setSum", { comp: names || tx("team.alone"), n: nC });
}
function renderTeams() {
  const el = $("teamsPanel"); if (!el) return;
  const R = rpgState(), T = teamState(), S = EV.S, ro = (EV.P.eg && EV.P.eg.roster) || {};
  let html = `<div class="panel-head"><h2>${esc(tx("team.title"))}</h2></div><p class="muted" style="margin:0">${esc(tx("team.sub"))}</p>`;
  if (!R) { el.innerHTML = html + `<p class="muted">${esc(tx("cards.noCreature"))}</p>`; return; }
  html += `<h3 class="cat-title">${esc(tx("team.now"))}</h3>`;
  html += `<div class="tm-block"><div class="tm-head"><strong>${esc(S.name)}</strong><span class="progress">${esc(tx("cards.lvl", { n: R.lvl }))}</span></div>${slotRowsHtml("own")}</div>`;
  const kinds = Object.keys(ro);
  html += `<div class="tm-block"><div class="tm-head"><strong>${esc(tx("team.comps"))}</strong><span class="progress">${T.comp.length}/2</span></div>` +
    (kinds.length ? `<div class="tm-comps">${kinds.map((k) => `<button type="button" class="tm-comp" data-tcomp="${k}" aria-pressed="${T.comp.includes(k)}"><canvas width="96" height="80" data-mon="${k}"></canvas><span>${esc(monName(k))}</span><small>${esc(tx("cards.lvl", { n: ro[k].lvl }))}</small></button>`).join("")}</div>` : `<p class="muted">${esc(tx("team.noRefuge"))}</p>`) + `</div>`;
  for (const k of T.comp) html += `<div class="tm-block"><div class="tm-head"><strong>${esc(monName(k))}</strong><span class="progress">${esc(tx("cards.lvl", { n: ro[k].lvl }))}</span></div>${slotRowsHtml(k)}</div>`;
  html += `<h3 class="cat-title">${esc(tx("team.sets"))}</h3><div class="tm-sets">${T.sets.map((st, i) => {
    const name = st ? st.n : tx("team.setN", { n: i + 1 });
    const title = teamEdit === i ? `<input class="textin tm-name" maxlength="18" value="${esc(name)}" data-tname="${i}" aria-label="${esc(tx("team.rename"))}">` : `<strong>${esc(name)}</strong>`;
    const btns = teamEdit === i ? `<button class="btn" type="button" data-tset="ok:${i}">${esc(tx("team.ok"))}</button>` :
      (st ? `<button class="btn" type="button" data-tset="load:${i}">${esc(tx("team.load"))}</button>` : "") + `<button class="btn ghost" type="button" data-tset="save:${i}">${esc(tx(st ? "team.overwrite" : "team.save"))}</button>` +
      (st ? `<button class="btn ghost" type="button" data-tset="ren:${i}">${esc(tx("team.rename"))}</button><button class="btn ghost" type="button" data-tset="del:${i}">${esc(tx("team.del"))}</button>` : "");
    return `<div class="tm-set${st ? "" : " empty"}"><div class="tm-set-t">${title}<span class="muted">${esc(st ? setSummary(st) : tx("team.emptySet"))}</span></div><div class="rc-btns">${btns}</div></div>`;
  }).join("")}</div>`;
  el.innerHTML = html;
  el.querySelectorAll("canvas[data-mon]").forEach(paintMon);
  const inp = el.querySelector("input[data-tname]"); if (inp) { inp.focus(); inp.select(); }
}
function saveSet(i) {
  const R = rpgState(), T = teamState(); if (!R) return;
  const ids = (eq) => { const o = {}; for (const k of ["a", "p", "s"]) { const c = eq[k] && cardByUid(eq[k]); if (c) o[k] = c.id; } return o; };
  const ce = {}; for (const k of T.comp) ce[k] = ids((rosterOf(k) || {}).eq || {});
  const old = T.sets[i];
  T.sets[i] = { n: old ? old.n : tx("team.setN", { n: i + 1 }), comp: T.comp.slice(), own: ids(R.eq), ce, fm: Object.assign({}, T.form || {}) };
  EV.toast(tx("team.saved", { n: T.sets[i].n })); EV.sfx("card"); EV.save();
}
// load a set: move the cards where the set says; missing copies fall back to the empty slot or the usual card
function loadSet(i, offer) {
  const R = rpgState(), T = teamState(), st = T.sets[i]; if (!R || !st) return;
  const ro = (EV.P.eg && EV.P.eg.roster) || {}, miss = [];
  let comp = st.comp.filter((k) => ro[k]);
  st.comp.filter((k) => !ro[k]).forEach((k) => miss.push(monName(k)));
  if (offer) { comp.filter((k) => !offer.includes(k)).forEach((k) => miss.push(monName(k))); comp = comp.filter((k) => offer.includes(k)); }
  const who = ["own"].concat(comp);
  // free the cards of everyone in the set first, then hand out copies, best grade first
  R.eq = { a: null, p: null, s: null };
  for (const k of comp) ro[k].eq = {};
  const used = usedUids();
  let lost = 0;
  for (const w of who) {
    const want = w === "own" ? st.own : (st.ce[w] || {}), lvl = w === "own" ? R.lvl : ro[w].lvl;
    for (const sl of ["a", "p", "s"]) {
      const id = want[sl]; if (!id) continue;
      const fits = w === "own" ? usable(id) : compFits(w, id);
      const c = fits && lvl >= SLOT_LVL[sl] ? EV.P.cards.filter((x) => x.id === id && !used.has(x.uid)).sort((a, b) => b.g - a.g)[0] : null;
      if (!c) { lost++; continue; }
      used.add(c.uid);
      if (w === "own") R.eq[sl] = c.uid; else ro[w].eq[sl] = c.uid;
    }
  }
  T.comp = comp.slice(0, 2);
  if (st.fm) T.form = Object.assign({}, T.form || {}, st.fm);
  if (X && view === "pick") X.chosen = T.comp.filter((k) => X.offer.includes(k));
  EV.save(); EV.sfx("card");
  const parts = []; if (miss.length) parts.push(tx("team.missMon", { list: miss.join(", ") })); if (lost) parts.push(tx("team.missCards", { n: lost }));
  EV.toast(tx("team.loaded", { n: st.n }) + (parts.length ? " " + parts.join(" ") : ""));
}
function onTeamsClick(e) {
  const t = e.target.closest("button"); if (!t || t.disabled) return;
  const T = teamState();
  if (t.dataset.chg) { EV.sfx("tap"); const [w, sl] = t.dataset.chg.split(":"); openPick(w, sl); return; }
  if (t.dataset.tcomp) {
    const k = t.dataset.tcomp, i = T.comp.indexOf(k);
    if (i >= 0) T.comp.splice(i, 1); else { if (T.comp.length >= 2) T.comp.shift(); T.comp.push(k); }
    EV.sfx("tap"); EV.save(); renderTeams(); return;
  }
  if (t.dataset.tset) {
    const [a, n] = t.dataset.tset.split(":"), i = +n;
    if (a === "save") saveSet(i);
    else if (a === "load") loadSet(i);
    else if (a === "del") { T.sets[i] = null; EV.sfx("tap"); EV.save(); }
    else if (a === "ren") teamEdit = i;
    else if (a === "ok") { const inp = $("teamsPanel").querySelector("input[data-tname]"), v = inp && inp.value.trim(); if (v && T.sets[i]) T.sets[i].n = v.slice(0, 18); teamEdit = -1; EV.save(); }
    renderTeams();
  }
}
/* ---------- Formation: where each member stands, 3 lanes by front/back (rules in rpg/engine.js) ----------
   Keys: "own" for your creature, the kind for a companion. P.team.form keeps the last place of each one. */
const formKeys = () => ["own"].concat(X.chosen);
function formOf(keys) {
  const T = teamState(), f = T.form || {}, out = {}, used = new Set();
  for (const k of keys) { const c = f[k]; if (Number.isInteger(c) && c >= 0 && c < CELLS && !used.has(c)) { out[k] = c; used.add(c); } }
  if (keys.some((k) => out[k] == null)) {
    // the rest: the engine's suggestion (sturdiest in front, carers behind)
    const R = rpgState();
    const us = keys.map((k) => { const r = refOf(k), u = memberUnit(k === "own" ? { own: true, hp: 1 } : { kind: k, hp: 1, lvl: r ? r.lvl : R.lvl, bond: r ? r.bond : 0, star: r ? r.star : 0, roster: !!r }); u.pos = out[k]; u.key = k; return u; });
    autoForm(us); for (const u of us) out[u.key] = u.pos;
  }
  return out;
}
let formSel = null;
function formHtml() {
  if (!X || X.chosen.length !== 2) return "";
  const keys = formKeys(), fm = formOf(keys), at = {};
  for (const k of keys) at[fm[k]] = k;
  const nameOf = (k) => (k === "own" ? EV.S.name : monName(k)), kindOf = (k) => (k === "own" ? EV.S.species : k);
  let cells = "";
  for (let lane = 0; lane < 3; lane++) for (const row of [1, 0]) {
    const c = row * 3 + lane, k = at[c];
    cells += `<button type="button" class="fcell${k ? " on" : ""}${row ? " back" : ""}" data-fcell="${c}" aria-pressed="${!!k && formSel === k}" aria-label="${esc(tx(row ? "form.back" : "form.front") + " " + (lane + 1) + (k ? ": " + nameOf(k) : ""))}">${k ? `<canvas width="96" height="80" data-mon="${kindOf(k)}"></canvas><small>${esc(nameOf(k))}</small>` : ""}</button>`;
  }
  return `<div class="panel"><h3>${esc(tx("form.title"))}</h3><p class="muted" style="margin:0">${esc(tx(formSel ? "form.move" : "form.sub"))}</p>
    <div class="fgrid"><span class="sub">${esc(tx("form.back"))}</span><span class="sub">${esc(tx("form.front"))}</span>${cells}</div>
    <div class="bctl"><button class="btn ghost" type="button" data-fauto="1">${esc(tx("form.auto"))}</button></div></div>`;
}
// tap a member, then a cell: it moves there (swapping with whoever stands there)
function formTap(t) {
  const T = teamState(), keys = formKeys(), fm = formOf(keys);
  if (t.dataset.fauto) { T.form = Object.assign({}, T.form); for (const k of keys) delete T.form[k]; formSel = null; EV.sfx("tap"); EV.save(); render(); return true; }
  if (t.dataset.fcell == null) return false;
  const c = +t.dataset.fcell, here = keys.find((k) => fm[k] === c);
  if (formSel && !keys.includes(formSel)) formSel = null;
  if (!formSel) { if (here) { formSel = here; EV.sfx("tap"); render(); } return true; }
  if (here && here !== formSel) fm[here] = fm[formSel];
  fm[formSel] = c; formSel = null;
  T.form = Object.assign({}, T.form, fm);
  EV.sfx("card"); EV.save(); render();
  return true;
}
function lootHtml() {
  const l = X.loot;
  return `<div class="loot"><span>${esc(tx("r.xp", { n: l.xp }))}</span><span>✦ ${l.coins}</span><span>🃏 ${l.cards.length}</span></div>`;
}
