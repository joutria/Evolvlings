/* Evolvlings: eggs, the Refuge and Bond (engagement delivery 3).
   Loaded after well.js. The Egg Well (paid with Song Notes, never real money) gives eggs; eggs incubate for
   12 to 44 hours (care and expeditions make it faster) and hatch into companions that live in the Refuge of el Vado. Each one
   has its own level and Bond, and can join expeditions. Your home creature stays Lumo, Fizz or Pebb, and
   story creatures (Lumo, Fizz, Pebb, Unísona) never come from eggs.
   Also here: the Keeper Level (grows with everything you do and opens features) and welcome tasks. */
(function (root) {
"use strict";
const EV = root.EV;
if (!EV || !EV.RPG) return;
const RPG = EV.RPG, $ = EV.$, esc = EV.escapeHtml, L = () => EV.LANG;

/* ---------- Text ---------- */
const TX = {
  es: {
    "nav": "Refugio", "title": "Refugio del Vado",
    "sub": "Aquí viven las criaturas que nacen de tus huevos. Cada una tiene su nivel y su Vínculo contigo, y puede acompañarte en las expediciones.",
    "have": "♪ {n} Notas · ∴ {d} Polvo",
    "tab.refuge": "Refugio", "tab.inc": "Incubadora", "tab.pool": "Pozo de Huevos", "tab.cl": "Cuidador",
    "egg.0": "Huevo de corteza", "egg.1": "Huevo de musgo", "egg.2": "Huevo celeste", "egg.3": "Huevo lila", "egg.4": "Huevo dorado",
    // refuge
    "empty": "El Refugio todavía está vacío. Tira en el Pozo de Huevos, incuba el huevo y la criatura vivirá aquí.",
    "lvl": "Nv {n}", "bond": "Vínculo {n}", "bondMax": "Vínculo máximo", "pet": "Acariciar", "petDone": "Ya la acariciaste hoy",
    "bond.0": "{n} te observa desde su rincón del Refugio.", "bond.1": "{n} viene corriendo cuando te ve llegar.",
    "bond.2": "{n} no se separa de ti en todo el día.", "bond.3": "{n} y tú os entendéis sin palabras.",
    "bondWhy": "El Vínculo sube al viajar juntos (+1), al ganar (+1 más) y al acariciarla una vez al día (+1). Cada nivel da +1,5 % a sus estadísticas y +1 % de crítico. Con Vínculo 5 y 10 sus cartas suben de rareza.",
    "badge": "Refugio · Nv {l} · ♥ {b}", "born": "¡Ha nacido {n}!", "bornSub": "Ya vive en el Refugio y puede acompañarte en tu próxima expedición.",
    "dup": "¡Otra vez {n}!", "dupSub": "{n} ya vive en el Refugio. Su hermano se queda con la familia de Tila y te deja {d} ∴ de Polvo y +1 de Vínculo.",
    "petted": "{n} se acurruca contra tu mano. +1 Vínculo",
    // incubator
    "inc.sub": "Los huevos tardan de 12 a 44 horas en abrirse. Dales calor, háblales y sal de expedición para que vayan más rápido: cada expedición terminada los adelanta 3 h.",
    "tripEggs": "El viaje calienta el Refugio: los huevos de la incubadora se adelantan {n} h.",
    "slot.lock": "Hueco libre con Nivel de Cuidador {n}", "slot.free": "Hueco libre",
    "left": "Faltan {t}", "ready": "¡Se está moviendo!", "warm": "Dar calor (−2 h)", "warmWait": "Calentito ({m} min)", "talk": "Hablarle (−4 h)", "talkDone": "Ya le hablaste hoy", "open": "Abrir",
    "bag": "Huevos en espera ({n})", "bagNone": "No tienes huevos esperando.", "incubate": "Incubar", "full": "La incubadora está llena.",
    "warmed": "El huevo se calienta. −2 h", "talked": "El huevo se mueve un poquito al oírte. −4 h", "who": "¿Quién será?",
    // pool
    "pool.sub": "Lanza una Nota del Canto y el Pozo te devuelve un huevo. Su color dice lo raro que es; quién hay dentro lo sabrás al abrirlo.",
    "pool.lock": "El Pozo de Huevos se abre con Nivel de Cuidador {n}. Cuida a tu criatura, viaja y haz tareas para subir.",
    "ban.s1": "Luz que camina", "ban.s1.d": "Temporada 1 · La mitad de los huevos de musgo traen a Mecha, la vela con patas del Barrio Apagado.",
    "ban.new": "Bienvenida al Refugio", "ban.new.d": "Solo para empezar: 20 huevos como máximo, 10 por 8 Notas, y los primeros 10 traen seguro un huevo lila o dorado.",
    "ban.newLeft": "Te quedan {n} huevos de bienvenida.",
    "pull1": "1 huevo · ♪1", "pull10": "10 huevos · ♪{c}", "poor": "Te faltan Notas del Canto.",
    "pity": "Huevo dorado seguro en {n} tiradas", "floor": "Huevo lila o mejor en {n} tiradas",
    "last": "Lo que devolvió el Pozo", "toBag": "Los huevos van a la Incubadora.",
    "rules": "Cómo funciona el Pozo de Huevos", "odds": "Probabilidad por tirada y quién puede salir",
    "r.floor": "Suelo de 10: cada 10 tiradas sale al menos un huevo lila.", "r.soft": "Pity suave: desde la tirada 70 sin huevo dorado, su probabilidad sube 6 puntos por tirada.",
    "r.hard": "Pity duro: la tirada 90 sin huevo dorado siempre lo da.", "r.dup": "Si nace una criatura que ya vive en el Refugio, te da Polvo de estrella ({list}) y +1 de Vínculo.",
    "r.story": "Lumo, Fizz, Pebb y Unísona nunca salen de huevos: se ganan jugando.", "r.money": "Nunca hay dinero real. El contador se comparte entre los dos banners.",
    "hist": "Historial ({n})", "histNone": "Todavía no has tirado.",
    // keeper level
    "cl.title": "Nivel de Cuidador {n}", "cl.sub": "Sube con todo lo que haces: dar de comer, jugar, viajar, calmar guardianes, hacer tareas, tirar en los pozos, abrir huevos y conseguir logros.",
    "cl.xp": "{a} / {b} de experiencia para el nivel {n}", "cl.claim": "Recoger premios de nivel ({c} ✦{n})", "cl.notes": " y ♪{n}", "cl.none": "No hay premios pendientes. Cada nivel da 10 Chispas por nivel, y cada 5 niveles 2 Notas.",
    "cl.unlocks": "Lo que abre el Nivel de Cuidador", "u.pool": "Pozo de Huevos", "u.slot2": "Segundo hueco de la incubadora", "u.slot3": "Tercer hueco de la incubadora", "u.at": "Nivel {n}",
    "cl.got": "Premios de Cuidador: +{c} Chispas",
    "wel.title": "Tareas de bienvenida", "wel.sub": "Una sola vez. Dan {n} Notas del Canto en total.", "wel.claim": "Cobrar ♪{n}", "wel.done": "Cobrada",
    "w.feed3": "Dar de comer 3 veces", "w.exp1": "Terminar una expedición", "w.equip": "Equipar una carta", "w.well1": "Tirar en el Pozo de los Ecos",
    "w.egg1": "Tirar en el Pozo de Huevos", "w.hatch1": "Abrir un huevo del Refugio", "w.bond2": "Llegar a Vínculo 2 con un compañero", "w.cl5": "Llegar a Nivel de Cuidador 5",
    "trip": "{n}: +{x} XP", "tripLvl": "{n} sube al nivel {l}", "tripBond": "{n} y tú llegáis a Vínculo {b}",
    "ach.egg1": ["Primer nido", "Abre un huevo del Refugio."], "ach.bond10": ["Inseparables", "Llega a Vínculo 10 con un compañero del Refugio."], "ach.cl10": ["Cuidador del Vado", "Llega a Nivel de Cuidador 10."],
  },
  en: {
    "nav": "Refuge", "title": "Refuge of el Vado",
    "sub": "The creatures that hatch from your eggs live here. Each has its own level and Bond with you, and can join you on expeditions.",
    "have": "♪ {n} Notes · ∴ {d} Stardust",
    "tab.refuge": "Refuge", "tab.inc": "Incubator", "tab.pool": "Egg Well", "tab.cl": "Keeper",
    "egg.0": "Bark egg", "egg.1": "Moss egg", "egg.2": "Sky egg", "egg.3": "Lilac egg", "egg.4": "Golden egg",
    "empty": "The Refuge is still empty. Pull at the Egg Well, incubate the egg and the creature will live here.",
    "lvl": "Lv {n}", "bond": "Bond {n}", "bondMax": "Max Bond", "pet": "Pet", "petDone": "Already petted today",
    "bond.0": "{n} watches you from its corner of the Refuge.", "bond.1": "{n} comes running when it sees you arrive.",
    "bond.2": "{n} stays by your side all day.", "bond.3": "{n} and you understand each other without words.",
    "bondWhy": "Bond grows when you travel together (+1), when you win (+1 more) and when you pet it once a day (+1). Each level gives +1.5% stats and +1% crit. At Bond 5 and 10 its cards go up a grade.",
    "badge": "Refuge · Lv {l} · ♥ {b}", "born": "{n} has hatched!", "bornSub": "It lives in the Refuge now and can join your next expedition.",
    "dup": "{n} again!", "dupSub": "{n} already lives in the Refuge. Its sibling stays with Tila's family and leaves you {d} ∴ Stardust and +1 Bond.",
    "petted": "{n} snuggles into your hand. +1 Bond",
    "inc.sub": "Eggs take 12 to 44 hours to open. Keep them warm, talk to them and go on expeditions to speed things up: each finished trip brings them 3 h closer.",
    "tripEggs": "The trip warms the Refuge: the eggs in the incubator move {n} h closer.",
    "slot.lock": "Free slot at Keeper Level {n}", "slot.free": "Free slot",
    "left": "{t} to go", "ready": "It's wiggling!", "warm": "Warm it (−2 h)", "warmWait": "Cosy ({m} min)", "talk": "Talk to it (−4 h)", "talkDone": "Talked today", "open": "Open",
    "bag": "Waiting eggs ({n})", "bagNone": "No eggs waiting.", "incubate": "Incubate", "full": "The incubator is full.",
    "warmed": "The egg warms up. −2 h", "talked": "The egg wiggles a little when it hears you. −4 h", "who": "Who will it be?",
    "pool.sub": "Drop in a Song Note and the Well sends back an egg. Its colour tells how rare it is; who's inside you'll find out when it opens.",
    "pool.lock": "The Egg Well opens at Keeper Level {n}. Care for your creature, travel and do tasks to level up.",
    "ban.s1": "Walking Light", "ban.s1.d": "Season 1 · Half of all moss eggs bring Mecha, the candle on legs from the Dim Quarter.",
    "ban.new": "Welcome to the Refuge", "ban.new.d": "Just for starting out: 20 eggs at most, 10 for 8 Notes, and the first 10 always include a lilac or golden egg.",
    "ban.newLeft": "{n} welcome eggs left.",
    "pull1": "1 egg · ♪1", "pull10": "10 eggs · ♪{c}", "poor": "You don't have enough Song Notes.",
    "pity": "Sure golden egg in {n} pulls", "floor": "Lilac egg or better in {n} pulls",
    "last": "What the Well sent back", "toBag": "The eggs go to the Incubator.",
    "rules": "How the Egg Well works", "odds": "Odds per pull and who can hatch",
    "r.floor": "Floor of 10: every 10 pulls give at least one lilac egg.", "r.soft": "Soft pity: from pull 70 without a golden egg, its chance goes up 6 points per pull.",
    "r.hard": "Hard pity: pull 90 without a golden egg always gives one.", "r.dup": "If a creature that already lives in the Refuge hatches, you get Stardust ({list}) and +1 Bond.",
    "r.story": "Lumo, Fizz, Pebb and Unísona never come from eggs: you earn them by playing.", "r.money": "Never real money. Both banners share the same counters.",
    "hist": "History ({n})", "histNone": "You haven't pulled yet.",
    "cl.title": "Keeper Level {n}", "cl.sub": "Grows with everything you do: feeding, playing, travelling, calming guardians, doing tasks, pulling at the wells, hatching eggs and earning achievements.",
    "cl.xp": "{a} / {b} experience for level {n}", "cl.claim": "Collect level rewards ({c} ✦{n})", "cl.notes": " and ♪{n}", "cl.none": "No rewards waiting. Each level gives 10 Chispas per level, and every 5 levels 2 Notes.",
    "cl.unlocks": "What Keeper Level opens", "u.pool": "Egg Well", "u.slot2": "Second incubator slot", "u.slot3": "Third incubator slot", "u.at": "Level {n}",
    "cl.got": "Keeper rewards: +{c} Chispas",
    "wel.title": "Welcome tasks", "wel.sub": "One time only. {n} Song Notes in total.", "wel.claim": "Claim ♪{n}", "wel.done": "Claimed",
    "w.feed3": "Feed 3 times", "w.exp1": "Finish an expedition", "w.equip": "Equip a card", "w.well1": "Pull at the Well of Echoes",
    "w.egg1": "Pull at the Egg Well", "w.hatch1": "Hatch a Refuge egg", "w.bond2": "Reach Bond 2 with a companion", "w.cl5": "Reach Keeper Level 5",
    "trip": "{n}: +{x} XP", "tripLvl": "{n} reaches level {l}", "tripBond": "{n} and you reach Bond {b}",
    "ach.egg1": ["First nest", "Hatch a Refuge egg."], "ach.bond10": ["Inseparable", "Reach Bond 10 with a Refuge companion."], "ach.cl10": ["Keeper of el Vado", "Reach Keeper Level 10."],
  },
};
const tx = (k, v) => { let s = TX[L()][k]; if (s == null) s = TX.en[k]; if (s == null) return k; if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => (v[n] != null ? v[n] : m)); return s; };

/* ---------- Rules ---------- */
const HOUR = 3600e3;
const STORY = ["lumo", "fizz", "pebb", "unisona"];
// creatures that can hatch, by tier (the creature's rarity)
const TIERS = [0, 1, 2, 3, 4].map((t) => Object.keys(RPG.MONS).filter((k) => { const m = RPG.MONS[k]; return !m.boss && !m.story && !STORY.includes(k) && m.rar === t; }));
const ODDS = [50, 30, 14.3, 5.1, 0.6]; // % per pull by tier: bark, moss, sky, lilac, golden
const TOP = 4, GOOD = 3, FLOOR = 10, SOFT = 70, HARD = 90, HIST = 100;
const BANNERS = { s1: { featured: "mecha", cost10: 10 }, new: { featured: null, cost10: 8, max: 20 } };
const DUP_DUST = [5, 10, 25, 60, 150];
const EGG_RAMP = ["bark", "moss", "sky", "lilac", "gold"];
// half a day for a bark egg, under two days for a golden one
const hatchMs = (tier) => (12 + 8 * tier) * HOUR;
// every finished expedition (won or lost) brings every egg in the incubator forward
const TRIP_CUT = 3 * HOUR;
const WARM_CUT = 2 * HOUR, WARM_CD = HOUR, TALK_CUT = 4 * HOUR;
const BOND_AT = [0, 2, 5, 9, 14, 20, 27, 35, 44, 54]; // Bond XP for Bond 1 … 10
const POOL_LVL = 3, SLOT_LVL = [1, 5, 8];
const WELCOME = [
  { id: "feed3", n: 5, ok: (p) => (p.c.fed || 0) >= 3 },
  { id: "exp1", n: 10, ok: (p) => (p.c.expDone || 0) >= 1 },
  { id: "equip", n: 5, ok: (p) => (p.c.equips || 0) >= 1 },
  { id: "well1", n: 5, ok: (p) => (p.c.wellPulls || 0) >= 1 || EV.quietOn() },
  { id: "egg1", n: 10, ok: (p) => (p.c.eggPulls || 0) >= 1 || EV.quietOn() },
  { id: "hatch1", n: 10, ok: (p) => (p.c.eggHatched || 0) >= 1 },
  { id: "bond2", n: 10, ok: () => Object.values(G().roster).some((r) => bondLvl(r.bxp) >= 2) },
  { id: "cl5", n: 5, ok: () => clLvl() >= 5 },
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const today = () => (EV.DAILY ? EV.DAILY.dayKey() : new Date().toISOString().slice(0, 10));
const monName = (k) => RPG.monName(k);

/* ---------- State ---------- */
function G() {
  const P = EV.P;
  if (!P.eg) P.eg = { pity: 0, floor: 0, banner: "new", nb: 0, hist: [], bag: [], inc: [], roster: {}, cl: 1, wel: {}, seq: 1 };
  if (P.notes == null) P.notes = 0;
  if (P.dust == null) P.dust = 0;
  return P.eg;
}
const bondLvl = (bxp) => BOND_AT.filter((n) => bxp >= n).length;
const gradeOf = (bond) => (bond >= 10 ? 2 : bond >= 5 ? 1 : 0);

/* Keeper Level: experience comes from counters the game already keeps */
function clXP() {
  const P = EV.P, c = P.c, n = (k) => c[k] || 0;
  return n("fed") * 2 + n("plays") * 2 + n("cuddles") + n("baths") * 2 + n("expWins") * 8 + n("expDone") * 15 + n("guard") * 40
    + n("dailyDone") * 15 + n("wellPulls") * 3 + n("eggPulls") * 3 + n("eggHatched") * 30 + Object.keys(P.ach || {}).length * 10;
}
const clNeed = (lvl) => 10 * (lvl - 1) * lvl; // total experience to reach a level
const clLvl = (xp) => { if (xp == null) xp = clXP(); return Math.max(1, Math.min(60, Math.floor((1 + Math.sqrt(1 + 0.4 * xp)) / 2))); };
const slots = () => SLOT_LVL.filter((n) => clLvl() >= n).length;
const poolOpen = () => clLvl() >= POOL_LVL;
function clPending() {
  const g = G(), lv = clLvl(); let c = 0, n = 0;
  for (let l = g.cl + 1; l <= lv; l++) { c += 10 * l; if (l % 5 === 0) n += 2; }
  return { c, n, any: lv > g.cl };
}

/* ---------- Egg Well ---------- */
const topChance = (n) => (n >= HARD ? 100 : n >= SOFT ? ODDS[TOP] + 6 * (n - SOFT + 1) : ODDS[TOP]);
function rollTier(g) {
  if (Math.random() * 100 < topChance(g.pity)) return TOP;
  if (g.floor >= FLOOR) return GOOD;
  let r = Math.random() * (100 - ODDS[TOP]);
  for (let t = GOOD; t > 0; t--) { if (r < ODDS[t]) return t; r -= ODDS[t]; }
  return 0;
}
function pullOne(banner, forceGood) {
  const g = G();
  g.pity++; g.floor++;
  let tier = rollTier(g);
  if (forceGood && tier < GOOD) tier = GOOD;
  if (tier >= GOOD) g.floor = 0;
  if (tier === TOP) g.pity = 0;
  const kind = tier === 1 && BANNERS[banner].featured && Math.random() < 0.5 ? BANNERS[banner].featured : pick(TIERS[tier]);
  const egg = { id: g.seq++, kind, tier };
  g.bag.push(egg);
  g.hist.unshift({ tier, b: banner, t: Date.now() });
  if (g.hist.length > HIST) g.hist.length = HIST;
  EV.P.c.eggPulls = (EV.P.c.eggPulls || 0) + 1;
  return egg;
}
let last = null, born = null, tab = "refuge";
function pull(n) {
  const g = G(), P = EV.P, B = BANNERS[g.banner];
  if (!poolOpen()) return;
  if (g.banner === "new" && (n !== 10 || g.nb + 10 > B.max)) return;
  const cost = n === 10 ? B.cost10 : n;
  if ((P.notes || 0) < cost) { EV.toast(tx("poor")); EV.sfx("deny"); return; }
  P.notes -= cost;
  const got = [], firstNew = g.banner === "new" && g.nb === 0;
  for (let i = 0; i < n; i++) got.push(pullOne(g.banner, firstNew && i === n - 1 && !got.some((e) => e.tier >= GOOD)));
  if (g.banner === "new") { g.nb += n; if (g.nb >= B.max) g.banner = "s1"; }
  const best = Math.max(...got.map((e) => e.tier));
  last = { got, best, key: Date.now() };
  // fill free incubator slots straight away
  autoIncubate();
  EV.sfx(best >= GOOD ? "grow" : "card"); EV.buzz && EV.buzz(best >= GOOD ? 40 : 15);
  save();
}

// an egg from elsewhere (season journal, chests): tier at least `min`
function giveEgg(min) {
  const g = G(), r = Math.random(), tier = Math.max(min, r < 0.03 ? 4 : r < 0.25 ? 3 : 2);
  const egg = { id: g.seq++, kind: pick(TIERS[tier]), tier };
  g.bag.push(egg); autoIncubate(); save();
  return egg;
}

/* ---------- Incubator ---------- */
const left = (e) => Math.max(0, hatchMs(e.tier) - (Date.now() - e.at) - (e.cut || 0));
function autoIncubate() {
  const g = G();
  while (g.inc.length < slots() && g.bag.length) { const e = g.bag.shift(); e.at = Date.now(); e.cut = 0; e.warm = 0; e.talk = null; g.inc.push(e); }
}
function incubate(id) {
  const g = G();
  if (g.inc.length >= slots()) { EV.toast(tx("full")); EV.sfx("deny"); return; }
  const i = g.bag.findIndex((e) => e.id === id); if (i < 0) return;
  const e = g.bag.splice(i, 1)[0];
  e.at = Date.now(); e.cut = 0; e.warm = 0; e.talk = null;
  g.inc.push(e); EV.sfx("tap"); save();
}
function warm(id) {
  const e = G().inc.find((x) => x.id === id); if (!e || !left(e)) return;
  if (Date.now() - (e.warm || 0) < WARM_CD) return;
  e.cut = (e.cut || 0) + WARM_CUT; e.warm = Date.now();
  EV.P.c.eggWarm = (EV.P.c.eggWarm || 0) + 1;
  EV.toast(tx("warmed"), "🔥"); EV.sfx("tap"); save();
}
function talk(id) {
  const e = G().inc.find((x) => x.id === id); if (!e || !left(e) || e.talk === today()) return;
  e.cut = (e.cut || 0) + TALK_CUT; e.talk = today();
  EV.toast(tx("talked"), "♪"); EV.sfx("tap"); save();
}
function startLvl() { const S = EV.S; return S && S.rpg ? Math.max(1, S.rpg.lvl - 2) : 1; }
function hatch(id) {
  const g = G(), i = g.inc.findIndex((x) => x.id === id);
  if (i < 0 || left(g.inc[i]) > 0) return;
  const e = g.inc.splice(i, 1)[0], r = g.roster[e.kind];
  EV.P.c.eggHatched = (EV.P.c.eggHatched || 0) + 1;
  if (r) { r.bxp++; EV.P.dust = (EV.P.dust || 0) + DUP_DUST[e.tier]; born = { kind: e.kind, dup: DUP_DUST[e.tier] }; }
  else { g.roster[e.kind] = { lvl: startLvl(), xp: 0, bxp: 0, pet: null, at: Date.now() }; born = { kind: e.kind }; }
  autoIncubate();
  tab = "refuge";
  EV.sfx("hatch"); EV.buzz && EV.buzz(40);
  save();
}

/* ---------- Refuge and Bond ---------- */
function pet(k) {
  const r = G().roster[k]; if (!r || r.pet === today()) return;
  const before = bondLvl(r.bxp);
  r.pet = today(); r.bxp++;
  EV.P.c.refugePets = (EV.P.c.refugePets || 0) + 1;
  EV.toast(tx("petted", { n: monName(k) }), "♥"); EV.sfx(bondLvl(r.bxp) > before ? "grow" : "tap");
  save();
}
// for rpg.js: what this creature brings to an expedition
function unitOf(k) {
  const r = G().roster[k]; if (!r) return null;
  const bond = bondLvl(r.bxp);
  return { lvl: r.lvl, bond, grade: gradeOf(bond) };
}
// Refuge companions offered first on the pick screen (up to 4, strongest first)
function offer(species) {
  const R = G().roster;
  return Object.keys(R).filter((k) => k !== species && RPG.MONS[k]).sort((a, b) => R[b].lvl - R[a].lvl || R[b].bxp - R[a].bxp).slice(0, 4);
}
const badge = (k) => { const u = unitOf(k); return u ? tx("badge", { l: u.lvl, b: u.bond }) : ""; };
// called by rpg.js when a trip ends; returns lines for the end screen
function afterTrip(res, xp, party, plvl) {
  const R = G().roster, out = [];
  for (const m of party || []) {
    const r = m.roster && R[m.kind]; if (!r) continue;
    const b0 = bondLvl(r.bxp), l0 = r.lvl;
    r.bxp += 1 + (res === "win" ? 1 : 0);
    // double experience while behind your creature; never past its level
    const gain = xp * (r.lvl < plvl ? 2 : 1);
    r.xp += gain;
    while (r.lvl < plvl && r.xp >= RPG.xpNeed(r.lvl)) { r.xp -= RPG.xpNeed(r.lvl); r.lvl++; }
    if (r.lvl >= plvl) r.xp = Math.min(r.xp, RPG.xpNeed(r.lvl) - 1);
    const n = monName(m.kind);
    out.push(tx("trip", { n, x: gain }));
    if (r.lvl > l0) out.push(tx("tripLvl", { n, l: r.lvl }));
    if (bondLvl(r.bxp) > b0) out.push(tx("tripBond", { n, b: bondLvl(r.bxp) }));
  }
  if (res === "win" || res === "lose") {
    const warm = G().inc.filter((e) => left(e) > 0);
    for (const e of warm) e.cut = (e.cut || 0) + TRIP_CUT;
    if (warm.length) out.push(tx("tripEggs", { n: TRIP_CUT / HOUR }));
  }
  return out;
}

/* ---------- Keeper rewards and welcome tasks ---------- */
function claimCl() {
  const g = G(), p = clPending(); if (!p.any) return;
  g.cl = clLvl();
  EV.addCoins(p.c);
  if (p.n) EV.P.notes = (EV.P.notes || 0) + p.n;
  EV.toast(tx("cl.got", { c: p.c }) + (p.n ? tx("cl.notes", { n: p.n }) : ""), "✦"); EV.sfx("coin");
  save();
}
function claimWel(id) {
  const g = G(), w = WELCOME.find((x) => x.id === id);
  if (!w || g.wel[id] || !w.ok(EV.P)) return;
  g.wel[id] = 1; EV.P.notes = (EV.P.notes || 0) + w.n;
  EV.toast("+" + w.n + " ♪", "♪"); EV.sfx("coin");
  save();
}
function hasNews() {
  const g = G();
  if (g.inc.some((e) => !left(e))) return true;
  if (g.bag.length && g.inc.length < slots()) return true;
  if (Object.values(g.roster).some((r) => r.pet !== today())) return true;
  if (clPending().any) return true;
  if (WELCOME.some((w) => !g.wel[w.id] && w.ok(EV.P))) return true;
  return false;
}
function save() { EV.save(); EV.checkAch(); render(); refreshChip(); }

/* ---------- View ---------- */
const eggName = (t) => tx("egg." + t);
function fmtLeft(ms) {
  const m = Math.ceil(ms / 60000), h = Math.floor(m / 60), mm = m % 60;
  return h ? `${h} h ${String(mm).padStart(2, "0")} min` : `${mm} min`;
}
const eggCv = (tier, crack, w) => `<canvas class="egg-px" width="${w}" height="${Math.round(w * 1.15)}" data-egg="${tier}" data-crack="${crack.toFixed(2)}"></canvas>`;
function refugeHtml() {
  const g = G(), ks = Object.keys(g.roster);
  let h = "";
  if (born) {
    const t = born.dup ? tx("dup", { n: monName(born.kind) }) : tx("born", { n: monName(born.kind) });
    const s = born.dup ? tx("dupSub", { n: monName(born.kind), d: born.dup }) : tx("bornSub");
    h += `<div class="rf-born"><canvas width="96" height="80" data-mon="${born.kind}"></canvas><div><h3>${esc(t)}</h3><p class="muted">${esc(s)}</p></div></div>`;
  }
  if (!ks.length) return h + `<p class="muted">${esc(tx("empty"))}</p>`;
  h += `<div class="rf-grid">${ks.sort((a, b) => g.roster[b].lvl - g.roster[a].lvl).map((k) => {
    const r = g.roster[k], b = bondLvl(r.bxp), nx = BOND_AT[b], pv = BOND_AT[b - 1] || 0;
    const pct = b >= 10 ? 100 : Math.round(100 * (r.bxp - pv) / (nx - pv));
    const band = b >= 10 ? 3 : b >= 7 ? 2 : b >= 4 ? 1 : 0;
    const xpPct = Math.round(100 * r.xp / RPG.xpNeed(r.lvl));
    return `<div class="rf-mon${b >= 10 ? " max" : ""}"><canvas width="96" height="80" data-mon="${k}"></canvas>
      <strong>${esc(monName(k))}</strong>${RPG.typeChip(RPG.MONS[k].types[0])}
      <small class="progress">${esc(tx("lvl", { n: r.lvl }))}</small><div class="bar"><i style="width:${xpPct}%"></i></div>
      <small class="progress rf-bond">♥ ${esc(b >= 10 ? tx("bondMax") : tx("bond", { n: b }))}</small><div class="bar bond"><i style="width:${pct}%"></i></div>
      <small class="muted">${esc(tx("bond." + band, { n: monName(k) }))}</small>
      <button class="btn${r.pet === today() ? " ghost" : ""}" type="button" data-rpet="${k}" ${r.pet === today() ? "disabled" : ""}>${esc(r.pet === today() ? tx("petDone") : tx("pet"))}</button></div>`;
  }).join("")}</div><p class="muted rf-small">${esc(tx("bondWhy"))}</p>`;
  return h;
}
function incHtml() {
  const g = G(), n = slots();
  let h = `<p class="muted" style="margin:0">${esc(tx("inc.sub"))}</p><div class="rf-slots">`;
  for (let i = 0; i < 3; i++) {
    const e = g.inc[i];
    if (i >= n) { h += `<div class="rf-slot lock"><span>🔒</span><small>${esc(tx("slot.lock", { n: SLOT_LVL[i] }))}</small></div>`; continue; }
    if (!e) { h += `<div class="rf-slot"><span class="muted">${esc(tx("slot.free"))}</span></div>`; continue; }
    const ms = left(e), total = hatchMs(e.tier), crack = 1 - ms / total;
    const warmWait = Date.now() - (e.warm || 0) < WARM_CD;
    h += `<div class="rf-slot${ms ? "" : " ready"}">${eggCv(e.tier, crack, 64)}<strong>${esc(eggName(e.tier))}</strong><small class="muted">${esc(tx("who"))}</small>
      <small class="progress">${esc(ms ? tx("left", { t: fmtLeft(ms) }) : tx("ready"))}</small><div class="bar"><i style="width:${Math.round(crack * 100)}%"></i></div>
      ${ms ? `<div class="rc-btns"><button class="btn ghost" type="button" data-rwarm="${e.id}" ${warmWait ? "disabled" : ""}>${esc(warmWait ? tx("warmWait", { m: Math.ceil((WARM_CD - (Date.now() - e.warm)) / 60000) }) : tx("warm"))}</button>
      <button class="btn ghost" type="button" data-rtalk="${e.id}" ${e.talk === today() ? "disabled" : ""}>${esc(e.talk === today() ? tx("talkDone") : tx("talk"))}</button></div>`
      : `<button class="btn" type="button" data-rhatch="${e.id}">${esc(tx("open"))}</button>`}</div>`;
  }
  h += `</div><h3 class="cat-title">${esc(tx("bag", { n: g.bag.length }))}</h3>`;
  if (!g.bag.length) h += `<p class="muted">${esc(tx("bagNone"))}</p>`;
  else h += `<div class="rf-bag">${g.bag.map((e) => `<div class="rf-bagegg">${eggCv(e.tier, 0, 40)}<small>${esc(eggName(e.tier))}</small><button class="btn ghost" type="button" data-rinc="${e.id}" ${g.inc.length >= n ? "disabled" : ""}>${esc(tx("incubate"))}</button></div>`).join("")}</div>`;
  return h;
}
function poolHtml() {
  const g = G(), P = EV.P;
  if (!poolOpen()) return `<p class="muted">${esc(tx("pool.lock", { n: POOL_LVL }))}</p>`;
  const B = BANNERS[g.banner], bans = Object.keys(BANNERS).filter((b) => b !== "new" || g.nb < BANNERS.new.max);
  let h = `<p class="muted" style="margin:0">${esc(tx("pool.sub"))}</p>`;
  h += `<div class="seg" role="group">${bans.map((b) => `<button type="button" data-rban="${b}" aria-pressed="${g.banner === b}">${esc(tx("ban." + b))}</button>`).join("")}</div>`;
  h += `<div class="rf-ban"><h3>${esc(tx("ban." + g.banner))}</h3><p class="muted">${esc(tx("ban." + g.banner + ".d"))}</p>`;
  if (g.banner === "new") h += `<p><b>${esc(tx("ban.newLeft", { n: B.max - g.nb }))}</b></p>`;
  h += `<ul class="well-count"><li>${esc(tx("pity", { n: HARD - g.pity }))}</li><li>${esc(tx("floor", { n: FLOOR - g.floor }))}</li></ul><div class="rc-btns">`;
  if (g.banner !== "new") h += `<button class="btn" type="button" data-rpull="1" ${(P.notes || 0) < 1 ? "disabled" : ""}>${esc(tx("pull1"))}</button>`;
  h += `<button class="btn" type="button" data-rpull="10" ${(P.notes || 0) < B.cost10 ? "disabled" : ""}>${esc(tx("pull10", { c: B.cost10 }))}</button></div></div>`;
  if (last) h += `<div class="rf-last"><h3 class="cat-title">${esc(tx("last"))}</h3><div class="rf-bag">${last.got.map((e, i) => `<div class="rf-bagegg pop" style="--d:${i}">${eggCv(e.tier, 0, 40)}<small>${esc(eggName(e.tier))}</small></div>`).join("")}</div><p class="muted">${esc(tx("toBag"))}</p></div>`;
  const pct = (o) => String(o).replace(".", L() === "es" ? "," : ".") + " %";
  h += `<details class="well-det"><summary>${esc(tx("rules"))}</summary><p><b>${esc(tx("odds"))}</b></p><table class="well-odds">${ODDS.map((o, t) => `<tr><td>${esc(eggName(t))}</td><td>${pct(o)}</td><td>${esc(TIERS[t].map(monName).join(", "))}</td></tr>`).reverse().join("")}</table>
    <ul>${["r.floor", "r.soft", "r.hard"].map((k) => `<li>${esc(tx(k))}</li>`).join("")}<li>${esc(tx("r.dup", { list: DUP_DUST.map((d, t) => eggName(t) + " " + d + " ∴").join(", ") }))}</li><li>${esc(tx("r.story"))}</li><li>${esc(tx("r.money"))}</li></ul></details>`;
  h += `<details class="well-det"><summary>${esc(tx("hist", { n: g.hist.length }))}</summary>${g.hist.length ? `<ol class="well-hist">${g.hist.map((x) => `<li>${esc(eggName(x.tier))} <small>${esc(tx("ban." + x.b))} · ${new Date(x.t).toLocaleDateString(L())}</small></li>`).join("")}</ol>` : `<p class="muted">${esc(tx("histNone"))}</p>`}</details>`;
  return h;
}
function clHtml() {
  const g = G(), xp = clXP(), lv = clLvl(xp), p = clPending();
  const a = xp - clNeed(lv), b = clNeed(lv + 1) - clNeed(lv);
  let h = `<h3>${esc(tx("cl.title", { n: lv }))}</h3><p class="muted" style="margin:0">${esc(tx("cl.sub"))}</p>
    <div class="bar rf-clbar"><i style="width:${Math.round(100 * a / b)}%"></i></div><small class="progress">${esc(tx("cl.xp", { a, b, n: lv + 1 }))}</small>`;
  h += p.any ? `<div class="rc-btns"><button class="btn" type="button" data-rcl="1">${esc(tx("cl.claim", { c: p.c, n: p.n ? tx("cl.notes", { n: p.n }) : "" }))}</button></div>` : `<p class="muted">${esc(tx("cl.none"))}</p>`;
  h += `<h3 class="cat-title">${esc(tx("cl.unlocks"))}</h3><ul class="rf-unl">${[[POOL_LVL, "u.pool"], [SLOT_LVL[1], "u.slot2"], [SLOT_LVL[2], "u.slot3"]].map(([n, k]) => `<li class="${lv >= n ? "ok" : ""}">${lv >= n ? "✓" : "🔒"} ${esc(tx(k))} <small>${esc(tx("u.at", { n }))}</small></li>`).join("")}</ul>`;
  const tot = WELCOME.reduce((s, w) => s + w.n, 0);
  h += `<h3 class="cat-title">${esc(tx("wel.title"))}</h3><p class="muted" style="margin:0">${esc(tx("wel.sub", { n: tot }))}</p><div class="rf-wel">${WELCOME.map((w) => {
    const got = g.wel[w.id], ok = w.ok(EV.P);
    return `<div class="dt${got ? " got" : ""}"><div class="dt-main"><b>${esc(tx("w." + w.id))}</b></div>${got ? `<span class="progress">✓ ${esc(tx("wel.done"))}</span>` : `<button class="btn${ok ? "" : " ghost"}" type="button" data-rwel="${w.id}" ${ok ? "" : "disabled"}>${esc(tx("wel.claim", { n: w.n }))}</button>`}</div>`;
  }).join("")}</div>`;
  return h;
}
function render() {
  const el = $("refugePanel"); if (!el || el.hidden) return;
  const P = EV.P, g = G();
  autoIncubate();
  const ready = g.inc.some((e) => !left(e));
  const tabs = ["refuge", "inc", "pool", "cl"].filter((t) => t !== "pool" || !EV.quietOn());
  if (tab === "pool" && EV.quietOn()) tab = "refuge";
  let h = `<div class="panel-head"><h2>${esc(tx("title"))}</h2><span class="progress">${esc(tx("have", { n: P.notes || 0, d: P.dust || 0 }))}</span></div><p class="muted" style="margin:0">${esc(tx("sub"))}</p>`;
  h += `<div class="seg rf-tabs" role="tablist">${tabs.map((t) => `<button type="button" role="tab" data-rtab="${t}" aria-pressed="${tab === t}" aria-selected="${tab === t}">${esc(tx("tab." + t))}${t === "inc" && ready ? " •" : ""}${t === "cl" && clPending().any ? " •" : ""}</button>`).join("")}</div>`;
  h += `<div class="rf-body">${tab === "inc" ? incHtml() : tab === "pool" ? poolHtml() : tab === "cl" ? clHtml() : refugeHtml()}</div>`;
  el.innerHTML = h;
  el.querySelectorAll("canvas[data-mon]").forEach((cv) => { try { RPG.paintMon(cv); } catch (e) { /* art is decoration */ } });
  el.querySelectorAll("canvas[data-egg]").forEach(paintEgg);
}
function paintEgg(cv) {
  const w = +cv.getAttribute("width"), hh = +cv.getAttribute("height");
  const c = EV.setupCanvas(cv, w, hh);
  if (typeof PX === "undefined") { c.fillStyle = ["#7a5236", "#4f9a3c", "#6fb8d0", "#a08fd4", "#e2ae2e"][+cv.dataset.egg]; c.beginPath(); c.ellipse(w / 2, hh * 0.55, w * 0.32, hh * 0.38, 0, 0, Math.PI * 2); c.fill(); return; }
  const img = PX.egg(EGG_RAMP[+cv.dataset.egg], 24, +cv.dataset.crack);
  const s = Math.max(1, Math.floor(Math.min(w / img.width, hh / img.height)));
  c.imageSmoothingEnabled = false;
  c.drawImage(img, Math.round((w - img.width * s) / 2), Math.round((hh - img.height * s) / 2), img.width * s, img.height * s);
}
function refreshChip() {
  const btn = $("btnRefuge"); if (!btn) return;
  const S = EV.S;
  btn.hidden = !((S && S.phase === "alive") || Object.keys(G().roster).length);
  $("refugeLbl").textContent = tx("nav");
  $("refugeDot").hidden = !hasNews();
}
function onClick(e) {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.rtab) { tab = d.rtab; if (tab !== "refuge") born = null; if (tab !== "pool") last = null; EV.sfx("tap"); render(); }
  else if (d.rban) { G().banner = d.rban; last = null; EV.sfx("tap"); save(); }
  else if (d.rpull) pull(+d.rpull);
  else if (d.rinc) incubate(+d.rinc);
  else if (d.rwarm) warm(+d.rwarm);
  else if (d.rtalk) talk(+d.rtalk);
  else if (d.rhatch) hatch(+d.rhatch);
  else if (d.rpet) pet(d.rpet);
  else if (d.rcl) claimCl();
  else if (d.rwel) claimWel(d.rwel);
}

/* ---------- Styles ---------- */
const css = document.createElement("style");
css.textContent = `
.rf-tabs { margin: 10px 0; flex-wrap: wrap; }
.rf-body { display: flex; flex-direction: column; gap: 8px; }
.rf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
.rf-mon { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; border: 2px solid var(--line); padding: 10px; background: var(--bg); }
.rf-mon canvas, .rf-born canvas { width: 96px; height: 80px; image-rendering: pixelated; align-self: center; }
.rf-mon .bar { width: 100%; height: 7px; }
.rf-mon .bar.bond i { background: #c25e9a; }
.rf-mon.max { border-color: #c25e9a; box-shadow: 4px 4px 0 color-mix(in srgb, #c25e9a 35%, transparent); }
.rf-mon .btn { align-self: stretch; margin-top: 4px; }
.rf-bond { color: #c25e9a; }
.rf-small { font-size: 13px; }
.rf-born { display: flex; gap: 12px; align-items: center; border: 2px solid #c25e9a; padding: 10px; background: color-mix(in srgb, #c25e9a 10%, var(--bg)); animation: wcard .4s ease-out; }
.rf-born h3 { margin: 0 0 4px; }
.rf-slots { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.rf-slot { display: flex; flex-direction: column; gap: 4px; align-items: center; text-align: center; border: 2px solid var(--line); padding: 10px; min-height: 150px; justify-content: center; background: var(--bg); }
.rf-slot.lock { border-style: dashed; opacity: .7; }
.rf-slot.ready { border-color: var(--warn, #e2ae2e); }
.rf-slot.ready .egg-px { animation: wiggle .5s steps(2) infinite; }
.rf-slot .bar { width: 100%; height: 7px; }
.rf-slot .rc-btns { flex-direction: column; width: 100%; }
.rf-slot .rc-btns .btn { width: 100%; }
.egg-px { image-rendering: pixelated; }
.rf-slot .egg-px { width: 64px; height: 74px; }
.rf-bag { display: flex; flex-wrap: wrap; gap: 8px; }
.rf-bagegg { display: flex; flex-direction: column; align-items: center; gap: 3px; border: 1px solid var(--line); padding: 6px; min-width: 84px; font-size: 12px; text-align: center; }
.rf-bagegg .egg-px { width: 40px; height: 46px; }
.rf-bagegg.pop { opacity: 0; animation: wcard .3s ease-out forwards; animation-delay: calc(var(--d) * .07s); }
.rf-ban { border: 2px solid var(--line); padding: 10px; background: var(--bg); }
.rf-ban h3 { margin: 0 0 4px; } .rf-ban p { margin: 4px 0; font-size: 14px; }
.well-odds td:nth-child(3) { font-size: 12px; color: var(--muted); padding-left: 8px; }
.rf-clbar { height: 10px; margin-top: 8px; }
.rf-unl { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.rf-unl li { opacity: .7; } .rf-unl li.ok { opacity: 1; } .rf-unl small { color: var(--muted); }
.rf-wel { display: flex; flex-direction: column; gap: 6px; }
@keyframes wiggle { 0% { transform: rotate(-4deg); } 100% { transform: rotate(4deg); } }
@media (prefers-reduced-motion: reduce) { .rf-slot.ready .egg-px, .rf-born, .rf-bagegg.pop { animation: none; opacity: 1; } }
@media (max-width: 560px) { .rf-slots { grid-template-columns: 1fr; } .rf-slot { min-height: 0; } .rf-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 380px) { .rf-grid { grid-template-columns: 1fr; } }
`;
document.head.appendChild(css);

/* ---------- Achievements ---------- */
EV.ACH.push(
  ["egg1", 20, (p) => (p.c.eggHatched || 0) >= 1],
  ["bond10", 100, (p) => !!p.eg && Object.values(p.eg.roster).some((r) => bondLvl(r.bxp) >= 10)],
  ["cl10", 50, () => clLvl() >= 10],
);
for (const lg of ["es", "en"]) for (const id of ["egg1", "bond10", "cl10"]) EV.STR[lg].ach[id] = TX[lg]["ach." + id];

/* ---------- Hooks ---------- */
EV.HOOKS.renderRefuge = () => { setTimeout(render, 0); };
$("refugePanel").addEventListener("click", onClick);
$("btnRefuge").addEventListener("click", () => { EV.sfx("tap"); EV.togglePanel("refuge"); });
const prevShow = EV.HOOKS.showScreen;
EV.HOOKS.showScreen = function () { if (prevShow) prevShow.apply(this, arguments); refreshChip(); };
// countdowns and the chip dot move on their own
setInterval(() => { refreshChip(); const el = $("refugePanel"); if (el && !el.hidden && tab === "inc") render(); }, 20000);
G(); refreshChip();
EV.EGGS = { giveEgg, eggName: (t) => tx("egg." + t), unitOf, offer, badge, afterTrip, pullOne, topChance, clXP, clLvl, clNeed, bondLvl, left, hatchMs, hasNews, render, TIERS, ODDS, BANNERS, BOND_AT, WELCOME, G };
})(typeof window !== "undefined" ? window : globalThis);
