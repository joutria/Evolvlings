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
    "p.pantry": "Despensa", "p.pantry.d": "La tirada gratis del día tiene más probabilidad de premio especial.",
    "p.well": "Pozo de los Ecos", "p.well.d": "Todas las tiradas del Pozo sacan algo mejores cartas. Además, una tirada gratis cada semana.",
    "p.path": "Camino al Vado", "p.path.d": "Tu criatura recupera más pasos cada día.",
    "p.nook": "Rincón de búsqueda", "p.nook.d": "Más búsquedas al día en el rincón del Claro.",
    "p.nest": "Nidos del Refugio", "p.nest.d": "Los compañeros que se quedan en casa también aprenden de tus viajes.",
    "p.craft": "Taller del Gremio", "p.craft.d": "Fabricar cartas en el Grimorio cuesta menos Polvo.",
    "e.pantry": "+{n} puntos de premio especial en la tirada gratis", "e.well": "+{n} puntos de Rara o mejor en cada tirada",
    "e.path": "+{n} pasos al día", "e.nook": "{n} búsquedas al día", "e.nest": "Los que se quedan ganan el {n} % de la experiencia del viaje{pet}", "e.nest.pet": " · acariciar da +2 de Vínculo",
    "e.craft": "Fabricar cuesta {n} ∴", "e.none": "Sin mejora todavía",
    "store": "En el huerto: {f} comidas · 🪵 {w}", "harvest": "Cosechar", "harvestNone": "Todavía no hay nada que cosechar.",
    "harvested": "Cosechas: {what}.", "full": "El huerto está lleno: cosecha para que siga creciendo.",
    "tripWood": "🪵 +{n} Madera del viaje", "tripCut": "La obra avanza 1 h.",
    "welcome": "La comida gratis ahora crece en el Huerto, junto al comedero. Te dejo {n} bayas para empezar.",
    "jobs": "Trabajos del Refugio", "jobs.sub": "Manda a un compañero a trabajar en un lugar. Rinde más si su tipo encaja y si el lugar está mejorado. Mientras trabaja no puede ir de expedición. Hasta {n} a la vez.",
    "jobs.none": "Todavía no hay nadie en el Refugio.", "job.idle": "Descansando en el Refugio", "job.send": "Mandar a trabajar", "job.cancel": "Cancelar",
    "job.full": "Ya hay {n} compañeros trabajando.", "job.sent": "{n} se va a trabajar a: {p}", "job.at": "Trabajando en: {p}", "job.will": "Traerá: {what}",
    "job.done": "Terminó en: {p}", "job.collect": "Recoger", "job.got": "{n} vuelve del trabajo con: {what}. +1 Vínculo", "job.fit": "Su tipo encaja: rinde más",
    "r.food": "🍓 ×{n}", "r.items": "🎒 ×{n}", "r.wood": "{n} de Madera",
    "ord": "Encargos del Vado", "ord.sub": "Cada día dos vecinos piden algo. Pagan en Chispas y Madera, y a veces dejan una Nota.",
    "ord.need": "Piden {what} (tienes {have})", "ord.pay": "Pagan ✦ {c} y 🪵 {w}", "ord.give": "Entregar", "ord.giveTo": "Entregar a {n}", "ord.done": "Entregado. Vuelve mañana.",
    "ord.miss": "Te falta: {what}.", "ord.got": "(+{c} ✦, +{w} 🪵)", "ord.note": "Te deja también ♪ 1 Nota.", "ord.rumour": "Y añade: «{r}»",
    "ord.allDone": "Hoy ya no queda ningún encargo en el tablón. Mañana habrá más.", "p.orders": "Tablón de encargos", "p.orders.d": "Lo que piden los vecinos",
    "n.ruda": "Ruda", "n.ruda.role": "panadera", "n.ruda.ask": "«Me faltan {what} para el pan de los críos del muelle. No pienso pagarte de más, que conste.»", "n.ruda.thanks": "«Toma. Y no se lo cuentes a nadie, que luego todos quieren pan gratis.»",
    "n.bruno": "Bruno", "n.bruno.role": "barquero", "n.bruno.ask": "«La barca hace agua otra vez. Antes la arreglaba con cosas que no preguntaba de dónde salían. Ahora prefiero pagar: {what}.»", "n.bruno.thanks": "«Lo honrado sale más caro, pero se duerme mejor.»",
    "n.esporina": "Esporina", "n.esporina.role": "recolectora de setas", "n.esporina.ask": "«¿Tienes {what}? Las setas crecen mejor donde la Savia es oscura, digan lo que digan. Necesito esto para demostrarlo.»", "n.esporina.thanks": "«Ya verás. Algún día me darán la razón.»",
    "n.mirlo": "Mirlo", "n.mirlo.role": "cartero", "n.mirlo.ask": "«Relampín se queda con los recados rápidos. Si me traes {what}, te cuento lo que dice el correo de esta semana.»", "n.mirlo.thanks": "«Yo leo las cartas enteras. Por eso llego tarde.»",
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
    "p.pantry": "Pantry", "p.pantry.d": "The day's free pull is more likely to give a special prize.",
    "p.well": "Well of Echoes", "p.well.d": "Every Well pull gives slightly better cards. Plus one free pull every week.",
    "p.path": "Path to El Vado", "p.path.d": "Your creature gets more steps back each day.",
    "p.nook": "Foraging nook", "p.nook.d": "More searches a day at the Glade's nook.",
    "p.nest": "Refuge nests", "p.nest.d": "Companions who stay home also learn from your trips.",
    "p.craft": "Guild workshop", "p.craft.d": "Crafting cards in the Grimoire costs less Stardust.",
    "e.pantry": "+{n} points of special prize on the free pull", "e.well": "+{n} points of Rare or better on every pull",
    "e.path": "+{n} steps a day", "e.nook": "{n} searches a day", "e.nest": "Those who stay get {n}% of the trip's experience{pet}", "e.nest.pet": " · petting gives +2 Bond",
    "e.craft": "Crafting costs {n} ∴", "e.none": "No bonus yet",
    "store": "In the garden: {f} meals · 🪵 {w}", "harvest": "Harvest", "harvestNone": "Nothing to harvest yet.",
    "harvested": "You harvest: {what}.", "full": "The garden is full: harvest so it keeps growing.",
    "tripWood": "🪵 +{n} Wood from the trip", "tripCut": "The build moves 1 h closer.",
    "welcome": "Free food now grows in the Garden, next to the bowl. Here are {n} berries to start.",
    "jobs": "Refuge jobs", "jobs.sub": "Send a companion to work at a place. It earns more when its type fits and when the place is upgraded. While it works it can't go on expeditions. Up to {n} at a time.",
    "jobs.none": "Nobody lives in the Refuge yet.", "job.idle": "Resting in the Refuge", "job.send": "Send to work", "job.cancel": "Cancel",
    "job.full": "{n} companions are already working.", "job.sent": "{n} goes off to work at: {p}", "job.at": "Working at: {p}", "job.will": "Will bring: {what}",
    "job.done": "Finished at: {p}", "job.collect": "Collect", "job.got": "{n} comes back from work with: {what}. +1 Bond", "job.fit": "Its type fits: earns more",
    "r.food": "🍓 ×{n}", "r.items": "🎒 ×{n}", "r.wood": "{n} Wood",
    "ord": "El Vado requests", "ord.sub": "Every day two neighbours ask for something. They pay in Chispas and Wood, and sometimes leave a Note.",
    "ord.need": "They ask for {what} (you have {have})", "ord.pay": "They pay ✦ {c} and 🪵 {w}", "ord.give": "Hand over", "ord.giveTo": "Give to {n}", "ord.done": "Delivered. Come back tomorrow.",
    "ord.miss": "You're missing: {what}.", "ord.got": "(+{c} ✦, +{w} 🪵)", "ord.note": "They also leave you ♪ 1 Note.", "ord.rumour": "And adds: “{r}”",
    "ord.allDone": "No requests left on the board today. There'll be more tomorrow.", "p.orders": "Request board", "p.orders.d": "What the neighbours need",
    "n.ruda": "Ruda", "n.ruda.role": "baker", "n.ruda.ask": "“I'm short {what} for the dock kids' bread. And I'm not paying you extra, mind.”", "n.ruda.thanks": "“Here. And don't tell anyone, or they'll all want free bread.”",
    "n.bruno": "Bruno", "n.bruno.role": "boatman", "n.bruno.ask": "“The boat's leaking again. I used to fix it with things I didn't ask where they came from. Now I'd rather pay: {what}.”", "n.bruno.thanks": "“Honest costs more, but you sleep better.”",
    "n.esporina": "Esporina", "n.esporina.role": "mushroom forager", "n.esporina.ask": "“Got {what}? Mushrooms grow best where the Sap is dark, whatever they say. I need this to prove it.”", "n.esporina.thanks": "“You'll see. One day they'll admit I was right.”",
    "n.mirlo": "Mirlo", "n.mirlo.role": "postman", "n.mirlo.ask": "“Relampín takes all the quick errands. Bring me {what} and I'll tell you what the post says this week.”", "n.mirlo.thanks": "“I read the letters all the way through. That's why I'm late.”",
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
const PLACES = ["garden", "inc", "pantry", "well", "path", "nook", "nest", "craft"];
// what each level gives (index = level); the odds never go up more than 10 points (Jose's cap)
const EFF = {
  pantry: [0, 0, 2, 4, 6, 10], well: [0, 0, 2, 4, 6, 10], path: [0, 0, 1, 2, 3, 5],
  nook: [0, 1, 1, 2, 2, 3], nest: [0, 0, 10, 20, 35, 50], craft: [0, 10, 9, 9, 8, 7],
};
const eff = (id) => EFF[id][lvl(id)];
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
  if (id === "inc") return tx("e.inc", { p: Math.round(INC_CUT[n] * 100), slot: n >= MAX ? tx("e.inc.slot") : "" });
  const v = EFF[id][n];
  if (id === "nest") return v ? tx("e.nest", { n: v, pet: n >= MAX ? tx("e.nest.pet") : "" }) : tx("e.none");
  if (!v && id !== "craft") return tx("e.none");
  return tx("e." + id, { n: v });
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
  h += jobsHtml() + ordersHtml();
  el.innerHTML = h;
  el.querySelectorAll("canvas[data-mon]").forEach((cv) => { try { EV.RPG.paintMon(cv); } catch (e) { /* art is decoration */ } });
}
function onClick(e) {
  const t = e.target.closest("button"); if (!t || t.disabled) return;
  if (t.dataset.bup) { start(t.dataset.bup); return; }
  if (t.dataset.bharv) { const r = harvest(); EV.toast(r.text, "🌱"); render(); return; }
  if (t.dataset.jpick) { pickJob = { k: t.dataset.jpick, place: null }; EV.sfx("tap"); render(); return; }
  if (t.dataset.jplace) { const [k, p] = t.dataset.jplace.split(":"); pickJob = { k, place: p }; EV.sfx("tap"); render(); return; }
  if (t.dataset.jgo) { const [k, p, hh] = t.dataset.jgo.split(":"); sendJob(k, p, +hh); return; }
  if (t.dataset.jcancel) { pickJob = null; render(); return; }
  if (t.dataset.jget) { collect(t.dataset.jget); return; }
  if (t.dataset.ord) { const r = deliver(+t.dataset.ord); if (r) EV.toast(r.text, r.ok ? "✉" : "✕"); render(); }
}
function refreshBtn() {
  const btn = $("btnBuild"); if (!btn) return;
  const S = EV.S; btn.hidden = !(S && S.phase === "alive" && S.stage >= 1);
  $("buildLbl").textContent = tx("nav");
  const s = btn.hidden ? null : gardenStock();
  const dot = $("buildDot"); if (dot) dot.hidden = !(s && (s.full || s.f >= 2 || jobsReady() > 0));
}

/* ---------- Refuge jobs (delivery 3) ----------
   A Refuge companion works at a place for 2, 4 or 8 hours (shorter while FAST is on). It earns more when its type
   fits the place and when the place has been upgraded. While it works it can't join expeditions. What it makes waits
   at the place until you collect it, so nothing is lost if you're away. */
const JOB_H = [2, 4, 8];
const jobMs = (h) => (FAST ? h / 6 : h) * HOUR;
const JOBS = {
  garden: { fit: ["plant", "water", "mush"], per: { food: 0.6, wood: 0.4 } },
  craft: { fit: ["fire", "stone", "ice"], per: { dust: 2 } },
  pantry: { fit: ["light", "music", "bolt"], per: { coins: 6 } },
  nook: { fit: ["air", "shadow", "dream"], per: { items: 0.4 } },
};
const NOOK_ITEMS = ["tea", "soap", "melon", "tonic"];
const typeOf = (k) => { const m = EV.RPG && EV.RPG.MONS[k]; return m ? m.types[0] : null; };
const roster = () => (EV.EGGS ? EV.EGGS.G().roster : {});
const jobsMax = () => (lvl("nest") >= 3 ? 3 : 2);
function J() { const b = B(); if (!b.jobs) b.jobs = {}; return b.jobs; }
const working = (k) => !!J()[k];
function jobYield(k, place, h) {
  const fit = JOBS[place].fit.includes(typeOf(k)), mult = (fit ? 1.5 : 1) * (1 + 0.1 * (lvl(place === "craft" ? "craft" : place) - 1));
  const out = {};
  for (const [r, v] of Object.entries(JOBS[place].per)) out[r] = Math.max(1, Math.round(v * h * mult));
  return { out, fit };
}
function sendJob(k, place, h) {
  const R = roster(); if (!R[k] || working(k) || !JOBS[place]) return;
  if (Object.keys(J()).length >= jobsMax()) { EV.toast(tx("job.full", { n: jobsMax() })); EV.sfx("deny"); return; }
  const y = jobYield(k, place, h);
  J()[k] = { place, h, start: Date.now(), end: Date.now() + jobMs(h), out: y.out, fit: y.fit };
  EV.P.c.jobs = (EV.P.c.jobs || 0) + 1;
  save(); EV.sfx("tap");
  EV.toast(tx("job.sent", { n: EV.RPG.monName(k), p: tx("p." + place) }), "🧺");
  pickJob = null; render();
}
function outText(out) {
  const parts = [];
  if (out.food) parts.push(tx("r.food", { n: out.food })); if (out.wood) parts.push("🪵 " + out.wood);
  if (out.dust) parts.push("∴ " + out.dust); if (out.coins) parts.push("✦ " + out.coins); if (out.items) parts.push(tx("r.items", { n: out.items }));
  return parts.join(" · ");
}
function collect(k) {
  const j = J()[k]; if (!j || Date.now() < j.end) return;
  const P = EV.P, b = B(), o = j.out, got = [];
  if (o.food) for (let i = 0; i < o.food; i++) { const f = GARDEN[lvl("garden")].pool[Math.floor(Math.random() * GARDEN[lvl("garden")].pool.length)]; P.inv[f] = (P.inv[f] || 0) + 1; }
  if (o.wood) b.wood += o.wood;
  if (o.dust) P.dust = (P.dust || 0) + o.dust;
  if (o.coins) EV.addCoins(o.coins, true);
  if (o.items) for (let i = 0; i < o.items; i++) { const it = NOOK_ITEMS[Math.floor(Math.random() * NOOK_ITEMS.length)]; P.inv[it] = (P.inv[it] || 0) + 1; }
  const r = roster()[k]; if (r) r.bxp += 1; // working side by side builds Bond
  delete J()[k];
  save(); EV.sfx("chirp");
  EV.toast(tx("job.got", { n: EV.RPG.monName(k), what: outText(o) }), "🧺");
  render();
}
const jobsReady = () => Object.values(J()).filter((j) => Date.now() >= j.end).length;
let pickJob = null; // { k, place }
function jobsHtml() {
  const R = roster(), ks = Object.keys(R).filter((k) => !EV.RPG.MONS || EV.RPG.MONS[k]);
  let h = `<h3 class="cat-title">${esc(tx("jobs"))}</h3><p class="muted" style="margin:0">${esc(tx("jobs.sub", { n: jobsMax() }))}</p>`;
  if (!ks.length) return h + `<p class="muted">${esc(tx("jobs.none"))}</p>`;
  h += `<div class="bd-jobs">${ks.map((k) => {
    const j = J()[k], ty = typeOf(k);
    let x = `<div class="bd-jobrow"><canvas width="96" height="80" data-mon="${k}"></canvas><div class="bd-jtxt"><strong>${esc(EV.RPG.monName(k))}</strong>${ty ? EV.RPG.typeChip(ty) : ""}`;
    if (j) {
      const left = j.end - Date.now();
      if (left > 0) x += `<small>${esc(tx("job.at", { p: tx("p." + j.place) }))} · ${esc(tx("jobLeft", { t: fmt(left) }))}</small><div class="bar"><i style="width:${Math.round(100 * (1 - left / (j.end - j.start)))}%"></i></div><small class="muted">${esc(tx("job.will", { what: outText(j.out) }))}</small>`;
      else x += `<small class="ok">${esc(tx("job.done", { p: tx("p." + j.place) }))}</small><small>${esc(outText(j.out))}</small><button class="btn" type="button" data-jget="${k}">${esc(tx("job.collect"))}</button>`;
    } else if (pickJob && pickJob.k === k) {
      x += `<div class="bd-places">${Object.keys(JOBS).map((p) => `<button type="button" class="wchip${pickJob.place === p ? " on" : ""}" data-jplace="${k}:${p}"><strong>${esc(tx("p." + p))}</strong><small class="${JOBS[p].fit.includes(ty) ? "ok" : ""}">${esc(JOBS[p].fit.includes(ty) ? tx("job.fit") : outText(JOBS[p].per).replace(/ ?×?[\d.]+/g, ""))}</small></button>`).join("")}</div>`;
      if (pickJob.place) x += `<div class="rc-btns">${JOB_H.map((hh) => `<button class="btn ghost" type="button" data-jgo="${k}:${pickJob.place}:${hh}">${esc(fmt(jobMs(hh)))} · ${esc(outText(jobYield(k, pickJob.place, hh).out))}</button>`).join("")}</div>`;
      x += `<button class="btn ghost" type="button" data-jcancel="1">${esc(tx("job.cancel"))}</button>`;
    } else x += `<small class="muted">${esc(tx("job.idle"))}</small><button class="btn ghost" type="button" data-jpick="${k}" ${Object.keys(J()).length >= jobsMax() ? "disabled" : ""}>${esc(tx("job.send"))}</button>`;
    return x + "</div></div>";
  }).join("")}</div>`;
  return h;
}

/* ---------- Requests from El Vado (delivery 3) ----------
   Every day two neighbours ask for something. Each has their own reasons; nobody is a saint (Jose's character rule). */
const NEIGH = {
  ruda: { asks: [["berry", 3], ["bun", 2], ["wood", 4]], c: 30, w: 2 },
  bruno: { asks: [["wood", 5], ["soap", 1], ["tea", 1]], c: 35, w: 1 },
  esporina: { asks: [["melon", 1], ["dust", 10], ["tea", 1]], c: 25, w: 3 },
  mirlo: { asks: [["cookie", 1], ["stew", 1], ["wood", 3]], c: 30, w: 2, rumour: true },
};
const dayKey = () => (EV.DAILY ? EV.DAILY.dayKey() : new Date().toISOString().slice(0, 10));
function hashStr(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function orders() {
  const b = B(), d = dayKey();
  if (!b.ord || b.ord.day !== d) {
    const names = Object.keys(NEIGH), h = hashStr(d), a = h % names.length, c = (a + 1 + ((h >> 4) % (names.length - 1))) % names.length;
    b.ord = { day: d, list: [a, c].map((i, n) => { const who = names[i], N = NEIGH[who], ask = N.asks[(h >> (8 + n * 3)) % N.asks.length]; return { who, need: ask[0], n: ask[1], done: false }; }) };
    save();
  }
  return b.ord.list;
}
const haveOf = (need) => (need === "wood" ? B().wood : need === "dust" ? EV.P.dust || 0 : EV.P.inv[need] || 0);
const needName = (o) => (o.need === "wood" ? tx("r.wood", { n: o.n }) : o.need === "dust" ? "∴ " + o.n : o.n + " × " + EV.itemName(o.need));
function deliver(i) {
  const o = orders()[i]; if (!o || o.done) return null;
  if (haveOf(o.need) < o.n) { EV.sfx("deny"); return { ok: false, text: tx("ord.miss", { what: needName(o) }) }; }
  const P = EV.P, b = B(), N = NEIGH[o.who];
  if (o.need === "wood") b.wood -= o.n; else if (o.need === "dust") P.dust -= o.n; else P.inv[o.need] -= o.n;
  o.done = true;
  EV.addCoins(N.c, true); b.wood += N.w;
  let extra = "";
  if (Math.random() < 0.15) { P.notes = (P.notes || 0) + 1; extra = " " + tx("ord.note"); }
  if (N.rumour && window.EvoLore) { const r = window.EvoLore.loadingLine(P, L()); if (r) extra += " " + tx("ord.rumour", { r }); }
  P.c.orders = (P.c.orders || 0) + 1;
  save(); EV.sfx("coin");
  return { ok: true, who: o.who, text: tx("n." + o.who + ".thanks") + " " + tx("ord.got", { c: N.c, w: N.w }) + extra };
}
function ordersHtml() {
  const list = orders();
  return `<h3 class="cat-title">${esc(tx("ord"))}</h3><p class="muted" style="margin:0">${esc(tx("ord.sub"))}</p><div class="bd-list">${list.map((o, i) => `<div class="bd-card${o.done ? " done" : ""}"><div class="bd-top"><strong>${esc(tx("n." + o.who))}</strong><small class="muted">${esc(tx("n." + o.who + ".role"))}</small></div><p class="bd-quote">${esc(tx("n." + o.who + ".ask", { what: needName(o) }))}</p>${o.done ? `<p class="bd-eff next">✓ ${esc(tx("ord.done"))}</p>` : `<p class="bd-eff">${esc(tx("ord.need", { what: needName(o), have: haveOf(o.need) }))} · ${esc(tx("ord.pay", { c: NEIGH[o.who].c, w: NEIGH[o.who].w }))}</p><button class="btn" type="button" data-ord="${i}" ${haveOf(o.need) < o.n ? "disabled" : ""}>${esc(tx("ord.give"))}</button>`}</div>`).join("")}</div>`;
}
// for the dialogue at the board in El Vado (world.js)
function ordersDialog() {
  const list = orders(), open = list.map((o, i) => [o, i]).filter(([o]) => !o.done);
  const text = open.length ? open.map(([o]) => tx("n." + o.who) + ": " + tx("n." + o.who + ".ask", { what: needName(o) })).join(" ") : tx("ord.allDone");
  return { text, opts: open.map(([, i]) => "ord." + i) };
}
const ordLabel = (i) => { const o = orders()[i]; return tx("ord.giveTo", { n: tx("n." + o.who) }); };

/* ---------- Hooks into the rest of the game ---------- */
// companions at work can't go on expeditions
if (EV.EGGS && EV.EGGS.offer) { const prevOffer = EV.EGGS.offer; EV.EGGS.offer = function () { return prevOffer.apply(this, arguments).filter((k) => !working(k)); }; }
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
.bd-jobs { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; margin-top: 8px; }
.bd-jobrow { display: flex; gap: 8px; border: 2px solid var(--line); background: var(--bg); padding: 8px; align-items: flex-start; }
.bd-jobrow canvas { width: 72px; height: 60px; image-rendering: pixelated; flex: none; }
.bd-jtxt { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; min-width: 0; flex: 1; } .bd-jtxt .bar { width: 100%; height: 7px; }
.bd-jtxt small.ok { color: var(--moss, #3c7a2c); font-weight: 600; }
.bd-places { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; width: 100%; } .bd-places .wchip.on { outline: 2px solid #d9a520; }
.bd-quote { margin: 0; font-family: Georgia, serif; font-size: 14px; line-height: 1.45; }
.bd-card.done { opacity: .7; }
.bd-max { margin: 0; font-weight: 600; color: #b8860b; }
.bd-card .poor, .bd-store .poor { color: #b8364b; font-size: 12px; }
`;
const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

EV.HOOKS.renderBuild = () => { tick(); render(); };
const prevShow = EV.HOOKS.showScreen;
EV.HOOKS.showScreen = function () { if (prevShow) prevShow.apply(this, arguments); refreshBtn(); };
$("buildPanel").addEventListener("click", onClick);
$("btnBuild").addEventListener("click", () => { EV.sfx("tap"); EV.togglePanel("build"); });
setInterval(() => { tick(); refreshBtn(); const el = $("buildPanel"); if (el && !el.hidden && (B().job || Object.keys(J()).length) && !pickJob) render(); }, 5000);

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
  incCut: () => INC_CUT[lvl("inc")] || 0, incExtra: () => (lvl("inc") >= MAX ? 1 : 0), tx, EFF, eff,
  pantryBonus: () => eff("pantry"), wellBonus: () => eff("well"), pathBonus: () => eff("path"), nookN: () => eff("nook"),
  sendJob, collect, jobsReady, working, J, JOBS, orders, deliver, ordersDialog, ordLabel, NEIGH,
  nestShare: () => eff("nest") / 100, nestPet: () => (lvl("nest") >= MAX ? 2 : 1), craftCost: () => eff("craft") };
})(window);
