/* Evolvlings: upgradable places (management layer, delivery 1).
   Loaded after eggs.js. Places go from level 1 to 5; each level costs Chispas and Wood and takes hours to build,
   one build at a time (every finished expedition brings it 1 h closer). No real money and no paid speed-ups.
   This delivery: the Garden (grows food while you're away, replacing the free food) and the Incubator
   (eggs hatch faster; a 4th slot at level 5). Jose's plan: https://claude.ai/artifact/F9YmqKdTRWMEa8gqAVcWN1 */
(function (root) {
"use strict";
const EV = root.EV;
if (!EV) return;
const $ = EV.$, esc = EV.escapeHtml, L = () => EV.LANG;
const HOUR = 3600e3;

/* ---------- Text ---------- */
const TX = {
  es: {
    "nav": "Obras", "title": "Obras del Claro",
    "sub": "Mejora tus lugares con Chispas y Madera. Cada obra tarda un rato y solo puede haber una a la vez; cada expedición terminada la adelanta 1 h.",
    "have": "✦ {c} · 🪵 {w} Madera",
    "lvl": "Nivel {n}", "max": "Nivel máximo", "now": "Ahora", "next": "Con el nivel {n}",
    "up": "Mejorar · ✦ {c} · 🪵 {w} · {t}", "busy": "Ya hay una obra en marcha", "poor": "Te falta: {what}",
    "job": "En obras: {p} → nivel {n}", "jobLeft": "Faltan {t}", "jobDone": "¡Obra terminada! {p} ya está en nivel {n}.",
    "started": "Empieza la obra: {p} → nivel {n}", "noJob": "No hay ninguna obra en marcha.",
    "p.garden": "Huerto", "p.garden.d": "Crece comida mientras no juegas. Ahora la comida básica sale de aquí.",
    "p.inc": "Incubadora", "p.inc.d": "Los huevos del Refugio tardan menos en abrirse.",
    "e.garden": "{f} comidas al día · guarda hasta {cap} · 🪵 {w} al día{extra}",
    "e.garden.melon": " · a veces melón", "e.garden.stew": " · a veces guiso",
    "e.inc": "Huevos un {p} % más rápidos{slot}", "e.inc.slot": " · un hueco más",
    "store": "En el huerto: {f} comidas · 🪵 {w}", "harvest": "Cosechar", "harvestNone": "Todavía no hay nada que cosechar.",
    "harvested": "Cosechas: {what}.", "full": "El huerto está lleno: cosecha para que siga creciendo.",
    "tripWood": "🪵 +{n} Madera del viaje", "tripCut": "La obra avanza 1 h.",
    "welcome": "La comida gratis ahora crece en el Huerto, junto al comedero. Te dejo {n} bayas para empezar.",
    "h": "{n} h", "m": "{n} min", "hm": "{h} h {m} min",
  },
  en: {
    "nav": "Builds", "title": "Glade builds",
    "sub": "Upgrade your places with Chispas and Wood. Each build takes a while and only one runs at a time; every finished expedition brings it 1 h closer.",
    "have": "✦ {c} · 🪵 {w} Wood",
    "lvl": "Level {n}", "max": "Max level", "now": "Now", "next": "At level {n}",
    "up": "Upgrade · ✦ {c} · 🪵 {w} · {t}", "busy": "A build is already running", "poor": "You're missing: {what}",
    "job": "Building: {p} → level {n}", "jobLeft": "{t} left", "jobDone": "Build finished! {p} is now level {n}.",
    "started": "Build started: {p} → level {n}", "noJob": "No build running.",
    "p.garden": "Garden", "p.garden.d": "Grows food while you're away. Basic food comes from here now.",
    "p.inc": "Incubator", "p.inc.d": "Refuge eggs hatch sooner.",
    "e.garden": "{f} meals a day · holds up to {cap} · 🪵 {w} a day{extra}",
    "e.garden.melon": " · sometimes melon", "e.garden.stew": " · sometimes stew",
    "e.inc": "Eggs {p}% faster{slot}", "e.inc.slot": " · one more slot",
    "store": "In the garden: {f} meals · 🪵 {w}", "harvest": "Harvest", "harvestNone": "Nothing to harvest yet.",
    "harvested": "You harvest: {what}.", "full": "The garden is full: harvest so it keeps growing.",
    "tripWood": "🪵 +{n} Wood from the trip", "tripCut": "The build moves 1 h closer.",
    "welcome": "Free food now grows in the Garden, next to the bowl. Here are {n} berries to start.",
    "h": "{n} h", "m": "{n} min", "hm": "{h} h {m} min",
  },
};
const tx = (k, v) => { let s = TX[L()][k]; if (s == null) s = TX.en[k]; if (s == null) return k; if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => (v[n] != null ? v[n] : m)); return s; };

/* ---------- Rules ---------- */
const MAX = 5;
// cost and build time to reach level 2, 3, 4, 5
// h = build hours in the final game (2 h to 24 h). While the game is in development Jose asked for faster builds:
// FAST = true uses the short times below (15 min to 4 h). Set it to false to go back to the long ones.
const FAST = true;
const COST = { 2: { c: 60, w: 5, h: 2, fh: 0.25 }, 3: { c: 150, w: 12, h: 6, fh: 0.75 }, 4: { c: 300, w: 25, h: 12, fh: 2 }, 5: { c: 600, w: 45, h: 24, fh: 4 } };
const hoursOf = (c) => (FAST ? c.fh : c.h);
const PLACES = ["garden", "inc"];
// Garden by level: meals a day, how many it holds, wood a day, what grows
const GARDEN = [null,
  { f: 3, cap: 4, w: 1, pool: ["berry", "berry", "bun"] },
  { f: 4, cap: 6, w: 1, pool: ["berry", "berry", "bun"] },
  { f: 5, cap: 8, w: 1.5, pool: ["berry", "berry", "bun", "melon"] },
  { f: 6, cap: 10, w: 1.5, pool: ["berry", "berry", "bun", "melon"] },
  { f: 8, cap: 12, w: 2, pool: ["berry", "berry", "bun", "melon", "stew"] }];
const WOOD_CAP = 6;
const INC_CUT = [0, 0, 0.06, 0.12, 0.18, 0.25]; // share of hatch time saved by level

/* ---------- State ---------- */
function B() {
  const P = EV.P;
  if (!P.bd) {
    P.bd = { lv: { garden: 1, inc: 1 }, wood: 0, job: null, gar: { t: Date.now(), f: 2, w: 0 }, hello: false };
  }
  for (const k of PLACES) if (!P.bd.lv[k]) P.bd.lv[k] = 1;
  return P.bd;
}
const lvl = (k) => B().lv[k] || 1;
const save = () => { EV.saveProfile(); };
function fmt(ms) {
  const m = Math.max(1, Math.ceil(ms / 60000));
  if (m < 60) return tx("m", { n: m });
  const h = Math.floor(m / 60), r = m % 60;
  return r ? tx("hm", { h, m: r }) : tx("h", { n: h });
}

/* ---------- Garden ---------- */
// grows by real time, up to what it can hold
function grow() {
  const b = B(), g = b.gar, G = GARDEN[lvl("garden")], now = Date.now();
  const dt = Math.max(0, now - (g.t || now)) / (24 * HOUR);
  g.f = Math.min(G.cap, (g.f || 0) + G.f * dt);
  g.w = Math.min(WOOD_CAP, (g.w || 0) + G.w * dt);
  g.t = now;
}
function harvest() {
  grow();
  const b = B(), g = b.gar, G = GARDEN[lvl("garden")], P = EV.P;
  const nf = Math.floor(g.f), nw = Math.floor(g.w);
  if (!nf && !nw) return { text: tx("harvestNone"), n: 0 };
  g.f -= nf; g.w -= nw; b.wood += nw;
  const got = {};
  for (let i = 0; i < nf; i++) { const k = G.pool[Math.floor(Math.random() * G.pool.length)]; got[k] = (got[k] || 0) + 1; P.inv[k] = (P.inv[k] || 0) + 1; }
  const parts = Object.keys(got).map((k) => got[k] + " × " + EV.itemName(k));
  if (nw) parts.push("🪵 " + nw);
  P.c.harvests = (P.c.harvests || 0) + 1;
  save(); EV.sfx("chirp");
  if (EV.HOOKS.afterHarvest) EV.HOOKS.afterHarvest();
  return { text: tx("harvested", { what: parts.join(", ") }), n: nf + nw };
}
const gardenStock = () => { grow(); const g = B().gar; return { f: Math.floor(g.f), w: Math.floor(g.w), full: g.f >= GARDEN[lvl("garden")].cap - 1e-6 }; };

/* ---------- Builds ---------- */
function jobLeft() { const j = B().job; return j ? Math.max(0, j.end - (j.cut || 0) - Date.now()) : 0; }
function tick() {
  if (!EV.P) return;
  const b = B(), j = b.job;
  if (j && jobLeft() <= 0) {
    if (j.id === "garden") grow(); // the old level grows up to now
    b.lv[j.id] = j.to; b.job = null;
    EV.P.c.builds = (EV.P.c.builds || 0) + 1;
    save();
    EV.toast(tx("jobDone", { p: tx("p." + j.id), n: j.to }), "🔨"); EV.sfx("grow");
    render();
  }
}
function missing(to) {
  const c = COST[to], P = EV.P, b = B(), out = [];
  if (P.coins < c.c) out.push("✦ " + (c.c - P.coins));
  if (b.wood < c.w) out.push("🪵 " + (c.w - b.wood));
  return out;
}
function start(id) {
  const b = B(), to = lvl(id) + 1;
  if (to > MAX) return;
  if (b.job) { EV.toast(tx("busy")); EV.sfx("deny"); return; }
  if (missing(to).length) { EV.toast(tx("poor", { what: missing(to).join(" · ") })); EV.sfx("deny"); return; }
  const c = COST[to];
  if (!EV.spendCoins(c.c)) { EV.sfx("deny"); return; }
  b.wood -= c.w;
  b.job = { id, to, start: Date.now(), end: Date.now() + hoursOf(c) * HOUR, cut: 0 };
  save(); EV.sfx("card");
  EV.toast(tx("started", { p: tx("p." + id), n: to }), "🔨");
  render();
}

/* ---------- What each level does ---------- */
function effText(id, n) {
  if (id === "garden") { const G = GARDEN[n]; return tx("e.garden", { f: G.f, cap: G.cap, w: String(G.w).replace(".", L() === "es" ? "," : "."), extra: G.pool.includes("stew") ? tx("e.garden.stew") : G.pool.includes("melon") ? tx("e.garden.melon") : "" }); }
  return tx("e.inc", { p: Math.round(INC_CUT[n] * 100), slot: n >= MAX ? tx("e.inc.slot") : "" });
}

/* ---------- Panel ---------- */
const pips = (n) => `<span class="bd-pips" aria-label="${esc(tx("lvl", { n }))}">${"■".repeat(n)}<i>${"□".repeat(MAX - n)}</i></span>`;
function render() {
  const el = $("buildPanel"); if (!el || el.hidden) return;
  const b = B(), P = EV.P;
  let h = `<div class="panel-head"><h2>${esc(tx("title"))}</h2><span class="progress">${esc(tx("have", { c: P.coins, w: b.wood }))}</span></div><p class="muted" style="margin:0">${esc(tx("sub"))}</p>`;
  if (b.job) {
    const j = b.job, left = jobLeft(), tot = j.end - j.start, pct = Math.round(100 * (1 - left / tot));
    h += `<div class="bd-job"><b>🔨 ${esc(tx("job", { p: tx("p." + j.id), n: j.to }))}</b><small class="progress">${esc(tx("jobLeft", { t: fmt(left) }))}</small><div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }
  h += `<div class="bd-list">${PLACES.map((id) => {
    const n = lvl(id), to = n + 1, c = COST[to], miss = c ? missing(to) : [], busy = !!b.job, here = busy && b.job.id === id;
    let x = `<div class="bd-card${here ? " on" : ""}"><div class="bd-top"><strong>${esc(tx("p." + id))}</strong>${pips(n)}</div><small class="muted">${esc(tx("p." + id + ".d"))}</small>`;
    x += `<p class="bd-eff"><b>${esc(tx("now"))}:</b> ${esc(effText(id, n))}</p>`;
    if (c) x += `<p class="bd-eff next"><b>${esc(tx("next", { n: to }))}:</b> ${esc(effText(id, to))}</p>`;
    if (id === "garden") { const s = gardenStock(); x += `<p class="bd-store">${esc(tx("store", { f: s.f, w: s.w }))}${s.full ? ` <span class="poor">${esc(tx("full"))}</span>` : ""}</p><button class="btn ghost" type="button" data-bharv="1" ${s.f || s.w ? "" : "disabled"}>${esc(tx("harvest"))}</button>`; }
    if (!c) x += `<p class="bd-max">${esc(tx("max"))}</p>`;
    else x += `<button class="btn" type="button" data-bup="${id}" ${busy || miss.length ? "disabled" : ""}>${esc(tx("up", { c: c.c, w: c.w, t: fmt(hoursOf(c) * HOUR) }))}</button>${busy && !here ? `<small class="muted">${esc(tx("busy"))}</small>` : miss.length ? `<small class="poor">${esc(tx("poor", { what: miss.join(" · ") }))}</small>` : ""}`;
    return x + "</div>";
  }).join("")}</div>`;
  el.innerHTML = h;
}
function onClick(e) {
  const t = e.target.closest("button"); if (!t || t.disabled) return;
  if (t.dataset.bup) { start(t.dataset.bup); return; }
  if (t.dataset.bharv) { const r = harvest(); EV.toast(r.text, "🌱"); render(); }
}
function refreshBtn() {
  const btn = $("btnBuild"); if (!btn) return;
  const S = EV.S; btn.hidden = !(S && S.phase === "alive" && S.stage >= 1);
  $("buildLbl").textContent = tx("nav");
  const s = btn.hidden ? null : gardenStock();
  const dot = $("buildDot"); if (dot) dot.hidden = !(s && (s.full || (s.f >= 2)));
}

/* ---------- Hooks into the rest of the game ---------- */
// basic food (price 0) now comes from the Garden and is counted in the bag
EV.HOOKS.gardenOn = () => true;
// expeditions bring wood and move the build forward
if (EV.EGGS && EV.EGGS.afterTrip) {
  const prev = EV.EGGS.afterTrip;
  EV.EGGS.afterTrip = function (res) {
    const out = prev.apply(this, arguments) || [];
    if (res === "win" || res === "lose") {
      const b = B(), n = res === "win" ? 2 + (Math.random() < 0.5 ? 1 : 0) : 1;
      b.wood += n; out.push(tx("tripWood", { n }));
      if (b.job) { b.job.cut = (b.job.cut || 0) + HOUR; out.push(tx("tripCut")); }
      save(); setTimeout(tick, 0);
    }
    return out;
  };
}

const css = `
.bd-job { border: 3px solid var(--line); background: color-mix(in srgb, #e0b04a 18%, var(--surface)); padding: 10px; margin: 10px 0 0; display: grid; gap: 4px; }
.bd-job .bar { height: 8px; }
.bd-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; margin-top: 10px; }
.bd-card { border: 2px solid var(--line); background: var(--bg); padding: 10px; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.bd-card.on { border-color: #d9a520; }
.bd-top { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 8px; } .bd-top strong { font-size: 16px; }
.bd-pips { color: #d9a520; letter-spacing: 1px; } .bd-pips i { color: var(--muted); font-style: normal; opacity: .6; }
.bd-eff { margin: 0; font-size: 13.5px; line-height: 1.4; } .bd-eff.next { color: var(--moss, #3c7a2c); }
.bd-store { margin: 0; font-size: 13.5px; font-weight: 600; }
.bd-max { margin: 0; font-weight: 600; color: #b8860b; }
.bd-card .poor, .bd-store .poor { color: #b8364b; font-size: 12px; }
`;
const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

EV.HOOKS.renderBuild = () => { tick(); render(); };
const prevShow = EV.HOOKS.showScreen;
EV.HOOKS.showScreen = function () { if (prevShow) prevShow.apply(this, arguments); refreshBtn(); };
$("buildPanel").addEventListener("click", onClick);
$("btnBuild").addEventListener("click", () => { EV.sfx("tap"); EV.togglePanel("build"); });
setInterval(() => { tick(); refreshBtn(); const el = $("buildPanel"); if (el && !el.hidden && B().job) render(); }, 5000);

// first time: basic food moves to the Garden; leave a few berries so nobody goes hungry
function hello() {
  const b = B(); if (b.hello) return;
  b.hello = true;
  const P = EV.P; P.inv.berry = (P.inv.berry || 0) + 3;
  save();
  if (EV.S && EV.S.phase === "alive") setTimeout(() => EV.toast(tx("welcome", { n: 3 }), "🌱"), 1200);
}
hello(); tick(); refreshBtn();

EV.BUILD = { B, lvl, harvest, gardenStock, grow, start, tick, jobLeft, render, COST, GARDEN, INC_CUT, MAX, PLACES,
  incCut: () => INC_CUT[lvl("inc")] || 0, incExtra: () => (lvl("inc") >= MAX ? 1 : 0), tx };
})(window);
