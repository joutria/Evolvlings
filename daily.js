/* Evolvlings: daily habits (Song Notes, daily and weekly tasks, visit calendar, Pantry, Constellation chests).
   Loaded after the rpg/ scripts. Everything lives in the profile (EV.P) and works off counters the game already keeps
   in P.c: a task stores the counter value when it starts and is done when the counter has grown enough. */
(function (root) {
"use strict";
const EV = root.EV;
if (!EV) return;
const $ = EV.$, esc = EV.escapeHtml, L = () => EV.LANG;

/* ---------- Text ---------- */
const TX = {
  es: {
    "nav": "Tareas", "title": "Tareas y premios", "notes": "♪ {n} Notas del Canto",
    "notes.what": "Las Notas del Canto se gastan en el Pozo de los Ecos (Cartas → Pozo). Nunca caducan.",
    "day.title": "Tareas de hoy", "day.reset": "Se renuevan a las 05:00.", "day.claim": "Cobrar", "day.done": "Cobrada",
    "day.reroll": "Cambiar", "day.rerollUsed": "Ya cambiaste una tarea hoy.", "day.pending": "Pendiente de {d}",
    "lamp": "Farolillo del día", "lamp.sub": "Cobra las 4 tareas para encenderlo: 1 Nota y 1 tirada gratis más en la Despensa.",
    "lamp.claim": "Encender (+{n} ♪)", "lamp.lit": "Farolillo encendido", "back": "Bienvenida de vuelta: premios dobles en las tareas diarias {n} días más.",
    "week.title": "Tareas de la semana", "week.reset": "Se renuevan el lunes.", "week.bonus": "Completa 4 de 6 para ganar 5 Notas.",
    "week.claimBonus": "Cobrar 5 ♪", "week.bonusDone": "5 Notas cobradas esta semana",
    "cal.title": "Calendario de visitas", "cal.sub": "Avanza una casilla por cada día que entras. Si faltas, no se pierde nada.", "cal.claim": "Recoger el día {n}", "cal.claimed": "Hoy ya recogiste tu casilla.",
    "pantry.title": "Despensa", "pantry.sub": "Una tirada gratis al día, y se guardan hasta 3 si no vienes. Las demás cuestan {c} Chispas.", "pantry.free": "Tirada gratis ({n})", "pantry.pay": "Tirar · {c} ✦",
    "pantry.odds": "Probabilidades: comida 50 %, medicinas 20 %, Chispas 20 %, juguete 6 %, 1 Nota 4 %. Premio especial seguro cada {p} tiradas (faltan {n}).",
    "pantry.bonus": "Obras de la Despensa: la tirada gratis tiene +{n} puntos de premio especial.", "pantry.got": "La Despensa te da: {what}", "pantry.special": "¡Premio especial!",
    "ex.title": "Cambiar Chispas por Notas", "ex.sub": "{c} Chispas = 1 Nota. Máximo {m} a la semana (te quedan {n}).", "ex.btn": "Cambiar {c} ✦ → 1 ♪",
    "stars.title": "Estrellas y Cofres de Constelación", "stars.sub": "Cada guardián da hasta 3 estrellas según la vida con la que termine el equipo, y otras 3 en Modo Savia. Tienes {n} de {m}.",
    "chest.open": "Abrir", "chest.opened": "Abierto", "chest.soon": "Llegará con los huevos",
    "chest.pick": "Elige una carta", "chest.picked": "¡{card} es tuya!",
    "r.coins": "{n} Chispas", "r.notes": "{n} Notas", "r.food": "{item}", "r.cardPick": "Carta {g} a elegir", "r.cosm": "Cosmético (próximamente)",
    "toast.notes": "+{n} Notas del Canto", "toast.poor": "No tienes Chispas suficientes.",
    "t.feed3": "Dar de comer 3 veces", "t.bath": "Bañar a tu criatura", "t.pet5": "Mimarla 5 veces", "t.play1": "Jugar a cazar estrellas",
    "t.win3": "Ganar 3 combates", "t.trip1": "Terminar una expedición", "t.support1": "Que salte una carta de Soporte del equipo", "t.adv3": "Golpear 3 veces con ventaja de tipo",
    "t.pantry1": "Tirar en la Despensa", "t.equip1": "Equipar o cambiar una carta", "t.event1": "Elegir una opción en un encuentro",
    "w.daily15": "Completar 15 tareas diarias", "w.win15": "Ganar 15 combates", "w.trip3": "Terminar 3 expediciones", "w.guard2": "Calmar a 2 guardianes",
    "w.stars3": "Conseguir 3 estrellas nuevas", "w.fuse3": "Mejorar 3 cartas", "w.pantry7": "Tirar 7 veces en la Despensa", "w.feed15": "Dar de comer 15 veces", "w.echo1": "Calmar al Eco del Guardián", "w.hatch1": "Abrir un huevo del Refugio",
  },
  en: {
    "nav": "Tasks", "title": "Tasks and rewards", "notes": "♪ {n} Song Notes",
    "notes.what": "Song Notes are spent at the Well of Echoes (Cards → Well). They never expire.",
    "day.title": "Today's tasks", "day.reset": "They refresh at 05:00.", "day.claim": "Claim", "day.done": "Claimed",
    "day.reroll": "Swap", "day.rerollUsed": "You already swapped a task today.", "day.pending": "Left over from {d}",
    "lamp": "Lantern of the day", "lamp.sub": "Claim all 4 tasks to light it: 1 Note and 1 extra free Pantry pull.",
    "lamp.claim": "Light it (+{n} ♪)", "lamp.lit": "Lantern lit", "back": "Welcome back: double daily task rewards for {n} more days.",
    "week.title": "This week's tasks", "week.reset": "They refresh on Monday.", "week.bonus": "Complete 4 of 6 to earn 5 Notes.",
    "week.claimBonus": "Claim 5 ♪", "week.bonusDone": "5 Notes claimed this week",
    "cal.title": "Visit calendar", "cal.sub": "Moves one square for every day you come in. Missing a day costs nothing.", "cal.claim": "Collect day {n}", "cal.claimed": "You already collected today's square.",
    "pantry.title": "Pantry", "pantry.sub": "One free pull a day, and up to 3 wait for you if you're away. The rest cost {c} Chispas.", "pantry.free": "Free pull ({n})", "pantry.pay": "Pull · {c} ✦",
    "pantry.odds": "Odds: food 50%, medicine 20%, Chispas 20%, toy 6%, 1 Note 4%. A special prize is guaranteed every {p} pulls ({n} to go).",
    "pantry.bonus": "Pantry builds: the free pull has +{n} points of special prize.", "pantry.got": "The Pantry gives you: {what}", "pantry.special": "Special prize!",
    "ex.title": "Trade Chispas for Notes", "ex.sub": "{c} Chispas = 1 Note. Up to {m} a week ({n} left).", "ex.btn": "Trade {c} ✦ → 1 ♪",
    "stars.title": "Stars and Constellation chests", "stars.sub": "Each guardian gives up to 3 stars depending on the health the team ends with, and 3 more in Savia Mode. You have {n} of {m}.",
    "chest.open": "Open", "chest.opened": "Opened", "chest.soon": "Arrives with eggs",
    "chest.pick": "Pick a card", "chest.picked": "{card} is yours!",
    "r.coins": "{n} Chispas", "r.notes": "{n} Notes", "r.food": "{item}", "r.cardPick": "{g} card of your choice", "r.cosm": "Cosmetic (coming soon)",
    "toast.notes": "+{n} Song Notes", "toast.poor": "You don't have enough Chispas.",
    "t.feed3": "Feed 3 times", "t.bath": "Give your creature a bath", "t.pet5": "Cuddle it 5 times", "t.play1": "Play star catch",
    "t.win3": "Win 3 battles", "t.trip1": "Finish an expedition", "t.support1": "Have a team Support card trigger", "t.adv3": "Land 3 hits with type advantage",
    "t.pantry1": "Pull at the Pantry", "t.equip1": "Equip or swap a card", "t.event1": "Choose an option in an encounter",
    "w.daily15": "Complete 15 daily tasks", "w.win15": "Win 15 battles", "w.trip3": "Finish 3 expeditions", "w.guard2": "Calm 2 guardians",
    "w.stars3": "Earn 3 new stars", "w.fuse3": "Upgrade 3 cards", "w.pantry7": "Pull 7 times at the Pantry", "w.feed15": "Feed 15 times", "w.echo1": "Calm the Guardian's Echo", "w.hatch1": "Hatch a Refuge egg",
  },
};
const tx = (k, v) => { let s = TX[L()][k]; if (s == null) s = TX.en[k]; if (s == null) return k; if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => (v[n] != null ? v[n] : m)); return s; };

/* ---------- Time: days start at 05:00 local, weeks on Monday ---------- */
const pad = (n) => String(n).padStart(2, "0");
const keyOf = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const shifted = () => new Date(Date.now() - 5 * 3600e3);
const dayKey = () => keyOf(shifted());
const weekKey = () => { const d = shifted(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return keyOf(d); };
const dayNum = (k) => Math.round(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / 864e5);
// Design rule 4: daily things pile up for a few days instead of expiring. A charge { day, left } gains `per` for each
// day that passed since it was last topped up, up to `cap` (it never takes away what is already there).
const KEEP_DAYS = 3;
function charge(o, per, cap) {
  const t = dayKey();
  if (o.day !== t) {
    const gap = o.day ? Math.max(1, dayNum(t) - dayNum(o.day)) : 1;
    o.left = Math.max(o.left || 0, Math.min(cap, (o.left || 0) + per * gap));
    o.day = t;
  }
  return o;
}
const shortDate = (k) => { const d = new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)); return d.toLocaleDateString(L() === "es" ? "es-ES" : "en-GB", { weekday: "short", day: "numeric" }); };

/* ---------- Catalogue ---------- */
// c: counter in P.c that the task watches; n: how much it has to grow; r: Chispas; need: when it can be offered
const expOK = () => EV.S && EV.S.phase === "alive" && EV.S.stage >= 1;
const lvlOK = (n) => () => expOK() && EV.S.rpg && EV.S.rpg.lvl >= n;
const DAILY = {
  feed3:    { cat: "care",  c: "fed",        n: 3, r: 15 },
  bath:     { cat: "care",  c: "baths",      n: 1, r: 15 },
  pet5:     { cat: "care",  c: "cuddles",    n: 5, r: 15 },
  win3:     { cat: "exp",   c: "expWins",    n: 3, r: 20, need: expOK },
  trip1:    { cat: "exp",   c: "expDone",    n: 1, r: 20, need: expOK },
  support1: { cat: "exp",   c: "supportUsed", n: 1, r: 20, need: lvlOK(8) },
  adv3:     { cat: "exp",   c: "advHits",    n: 3, r: 20, need: expOK },
  pantry1:  { cat: "coll",  c: "pantry",     n: 1, r: 15 },
  equip1:   { cat: "coll",  c: "equips",     n: 1, r: 15, need: expOK },
  play1:    { cat: "world", c: "plays",      n: 1, r: 15 },
  event1:   { cat: "world", c: "evChoices",  n: 1, r: 15, need: expOK },
};
const WEEKLY = {
  daily15: { c: "dailyDone", n: 15, r: 40 },
  win15:   { c: "expWins",   n: 15, r: 40 },
  trip3:   { c: "expDone",   n: 3,  r: 40 },
  guard2:  { c: "guard",     n: 2,  r: 40 },
  stars3:  { c: "starsGot",  n: 3,  r: 40 },
  fuse3:   { c: "fused",     n: 3,  r: 40 },
  pantry7: { c: "pantry",    n: 7,  r: 40 },
  feed15:  { c: "fed",       n: 15, r: 40 },
  echo1:   { c: "echoWins",  n: 1,  r: 40 },
  hatch1:  { c: "eggHatched", n: 1, r: 40 },
};
const CHESTS = [
  { at: 6, notes: 3 }, { at: 12, card: 3 }, { at: 18, notes: 5 }, { at: 27, card: 4 },
  { at: 36, notes: 5 }, { at: 45, notes: 5 }, { at: 54, cosm: true },
];
const PANTRY_COST = 20, PANTRY_PITY = 30, EX_COST = 160, EX_MAX = 5;
const CAL_FOOD = ["stew", "melon", "cookie", "tea"];

/* ---------- State ---------- */
const cnt = (k) => (EV.P.c[k] || 0);
const addNotes = (n) => { const P = EV.P; P.notes = (P.notes || 0) + n; EV.toast(tx("toast.notes", { n }), "♪"); EV.sfx("coin"); };
function newTask(id) { return { id, base: cnt((DAILY[id] || WEEKLY[id]).c), got: false }; }
function rollDaily() {
  const cats = { care: [], exp: [], coll: [], world: [] };
  for (const id in DAILY) { const t = DAILY[id]; if (!t.need || t.need()) cats[t.cat].push(id); }
  const pick = (a) => a.splice(Math.floor(Math.random() * a.length), 1)[0];
  const out = [];
  for (const c of ["care", "exp", "coll", "world"]) if (cats[c].length) out.push(pick(cats[c]));
  while (out.length < 4 && cats.care.length) out.push(pick(cats.care));
  return out.map(newTask);
}
function rollWeekly() {
  const ids = Object.keys(WEEKLY).filter((id) => expOK() || !["win15", "trip3", "guard2", "stars3", "fuse3", "echo1"].includes(id));
  const out = [];
  while (out.length < 6 && ids.length) out.push(ids.splice(Math.floor(Math.random() * ids.length), 1)[0]);
  return out.map(newTask);
}
const dSlice = EV.slice("d", () => ({ sets: [], cal: { n: 0, last: null }, pantry: { day: null, free: 0, pity: 0 }, ex: { week: null, n: 0 }, chests: {}, week: null, reroll: null, back: 0, lastDay: null, pick: null }));
function D() {
  const P = EV.P, d = dSlice();
  if (P.notes == null) P.notes = 0;
  return d;
}
// move to the current day/week: keep up to 2 unfinished days, renew the free pull, welcome back after 14 days away
function tick() {
  const d = D(), today = dayKey(), wk = weekKey();
  if (d.lastDay !== today) {
    if (d.lastDay && dayNum(today) - dayNum(d.lastDay) >= 14) d.back = 7;
    else if (d.lastDay && d.back > 0) d.back--;
    d.lastDay = today;
  }
  if (!d.sets.length || d.sets[0].day !== today) {
    d.sets = d.sets.filter((s) => !s.lit && dayNum(today) - dayNum(s.day) <= 2);
    d.sets.unshift({ day: today, tasks: rollDaily(), lit: false });
    d.sets = d.sets.slice(0, 3);
  }
  // the free pull waits for you: one a day, up to 3 saved
  if (d.pantry.day !== today) { const c = charge({ day: d.pantry.day, left: d.pantry.free }, 1, KEEP_DAYS); d.pantry.day = c.day; d.pantry.free = c.left; }
  if (!d.week || d.week.key !== wk) d.week = { key: wk, tasks: rollWeekly(), bonus: false };
  if (d.ex.week !== wk) { d.ex.week = wk; d.ex.n = 0; }
}
const prog = (task) => { const def = DAILY[task.id] || WEEKLY[task.id]; return Math.min(def.n, cnt(def.c) - task.base); };
const isDone = (task) => prog(task) >= (DAILY[task.id] || WEEKLY[task.id]).n;
function hasNews() {
  const d = D();
  if (d.cal.last !== dayKey()) return true;
  if (d.pantry.free > 0) return true;
  for (const s of d.sets) { if (s.tasks.some((t) => !t.got && isDone(t))) return true; if (!s.lit && s.tasks.every((t) => t.got)) return true; }
  if (d.week.tasks.some((t) => !t.got && isDone(t))) return true;
  if (!d.week.bonus && d.week.tasks.filter((t) => t.got).length >= 4) return true;
  if (CHESTS.some((c) => !c.cosm && !d.chests[c.at] && totalStars() >= c.at)) return true;
  return false;
}
const totalStars = () => [EV.P.stars, EV.P.starsS].reduce((t, o) => t + Object.values(o || {}).reduce((a, n) => a + n, 0), 0); // normal + Savia Mode

/* ---------- Actions ---------- */
function claimTask(si, ti) {
  const d = D(), s = d.sets[si], t = s && s.tasks[ti];
  if (!t || t.got || !isDone(t)) return;
  t.got = true; EV.P.c.dailyDone = (EV.P.c.dailyDone || 0) + 1;
  EV.addCoins(DAILY[t.id].r * (d.back > 0 ? 2 : 1));
  save();
}
function reroll(ti) {
  const d = D(), s = d.sets[0], t = s.tasks[ti];
  if (!t || t.got || d.reroll === s.day) return;
  const cat = DAILY[t.id].cat, have = s.tasks.map((x) => x.id);
  let opts = Object.keys(DAILY).filter((id) => DAILY[id].cat === cat && !have.includes(id) && (!DAILY[id].need || DAILY[id].need()));
  if (!opts.length) opts = Object.keys(DAILY).filter((id) => !have.includes(id) && (!DAILY[id].need || DAILY[id].need()));
  if (!opts.length) return;
  s.tasks[ti] = newTask(opts[Math.floor(Math.random() * opts.length)]);
  d.reroll = s.day; EV.sfx("tap"); save();
}
function lightLamp(si) {
  const d = D(), s = d.sets[si];
  if (!s || s.lit || !s.tasks.every((t) => t.got)) return;
  s.lit = true; addNotes(d.back > 0 ? 2 : 1);
  if (si === 0) d.pantry.free++;
  save();
}
function claimWeek(ti) {
  const d = D(), t = d.week.tasks[ti];
  if (!t || t.got || !isDone(t)) return;
  t.got = true; EV.P.c.weeklyDone = (EV.P.c.weeklyDone || 0) + 1; EV.addCoins(WEEKLY[t.id].r); save();
}
function claimWeekBonus() {
  const d = D();
  if (d.week.bonus || d.week.tasks.filter((t) => t.got).length < 4) return;
  d.week.bonus = true; addNotes(5); save();
}
const calReward = (n) => (n % 28 === 0 ? { notes: 4 } : n % 7 === 0 ? { notes: 2 } : n % 3 === 0 ? { food: CAL_FOOD[(n / 3) % CAL_FOOD.length] } : { coins: 30 + 10 * (n % 4) });
function claimCal() {
  const d = D(); if (d.cal.last === dayKey()) return;
  d.cal.n = d.cal.n % 28 + 1; d.cal.last = dayKey();
  const r = calReward(d.cal.n);
  if (r.notes) addNotes(r.notes);
  if (r.coins) EV.addCoins(r.coins);
  if (r.food) { EV.P.inv[r.food] = (EV.P.inv[r.food] || 0) + 1; EV.toast(itemName(r.food)); EV.sfx("coin"); }
  save();
}
function itemName(id) { const it = EV.STR[L()].item && EV.STR[L()].item[id]; return it ? it[0] : id; }
// Pantry: food 50, medicine 20, Chispas 20, toy 6 (Chispas if you own both), 1 Note 4; special every 30 pulls
function pantry() {
  const d = D(), P = EV.P;
  const free = d.pantry.free > 0;
  if (free) d.pantry.free--;
  else if (!EV.spendCoins(PANTRY_COST)) { EV.toast(tx("toast.poor")); EV.sfx("deny"); return; }
  P.c.pantry = (P.c.pantry || 0) + 1;
  d.pantry.pity++;
  let what;
  const toys = ["ball", "kite"].filter((k) => !P.owned[k]);
  // the Pantry build (build.js) makes the free pull more likely to give the special prize (up to +10 points)
  const lucky = free && EV.BUILD && Math.random() * 100 < EV.BUILD.pantryBonus();
  if (d.pantry.pity >= PANTRY_PITY || lucky) {
    d.pantry.pity = 0;
    if (toys.length) { P.owned[toys[0]] = 1; what = tx("pantry.special") + " " + itemName(toys[0]); }
    else { P.notes += 2; what = tx("pantry.special") + " " + tx("r.notes", { n: 2 }); }
  } else {
    const r = Math.random() * 100;
    if (r < 50) { const f = ["stew", "fizzpop", "melon", "cookie", "tea"][Math.floor(Math.random() * 5)]; P.inv[f] = (P.inv[f] || 0) + 1; what = itemName(f); }
    else if (r < 70) { const m = ["tonic", "salve", "soap"][Math.floor(Math.random() * 3)]; P.inv[m] = (P.inv[m] || 0) + 1; what = itemName(m); }
    else if (r < 90 || (r < 96 && !toys.length)) { const n = 10 + 5 * Math.floor(Math.random() * 7); EV.addCoins(n, true); what = tx("r.coins", { n }); }
    else if (r < 96) { P.owned[toys[0]] = 1; what = itemName(toys[0]); }
    else { P.notes += 1; what = tx("r.notes", { n: 1 }); }
  }
  EV.toast(tx("pantry.got", { what })); EV.sfx("coin"); EV.buzz(15);
  save();
}
function exchange() {
  const d = D();
  if (d.ex.n >= EX_MAX) return;
  if (!EV.spendCoins(EX_COST)) { EV.toast(tx("toast.poor")); EV.sfx("deny"); return; }
  d.ex.n++; addNotes(1); save();
}
function openChest(at) {
  const d = D(), c = CHESTS.find((x) => x.at === at);
  if (!c || c.cosm || d.chests[at] || totalStars() < at) return;
  d.chests[at] = 1;
  if (c.notes) addNotes(c.notes);
  if (c.card && EV.RPG) d.pick = EV.RPG.pickUsable(3, c.card);
  save();
}
function takePick(i) {
  const d = D(); if (!d.pick || !d.pick[i]) return;
  const o = d.pick[i]; d.pick = null;
  EV.RPG.takeCard(o.id, o.g);
  EV.toast(tx("chest.picked", { card: EV.RPG.cardName(o.id) })); EV.sfx("grow");
  save();
}
function save() { EV.save(); EV.checkAch(); render(); refreshChip(); }

/* ---------- UI ---------- */
const GR = () => EV.RPG && EV.RPG.GRADES;
function taskRow(def, task, label, btn) {
  const p = Math.max(0, prog(task)), pct = Math.round(100 * p / def.n);
  return `<div class="dt${task.got ? " got" : ""}"><div class="dt-main"><b>${esc(label)}</b><div class="bar"><i style="width:${pct}%"></i></div><small class="progress">${p} / ${def.n} · +${def.r} ✦</small></div>${btn}</div>`;
}
function render() {
  const el = $("dailyPanel"); if (!el || el.hidden) return;
  tick();
  const d = D(), P = EV.P;
  let h = `<div class="panel-head"><h2>${esc(tx("title"))}</h2><span class="progress">${esc(tx("notes", { n: P.notes }))}</span></div><p class="muted">${esc(tx("notes.what"))}</p>`;
  if (d.back > 0) h += `<p class="dback">🎉 ${esc(tx("back", { n: d.back }))}</p>`;
  // daily
  d.sets.forEach((s, si) => {
    const today = si === 0;
    h += `<div class="dsec"><h3>${esc(today ? tx("day.title") : tx("day.pending", { d: shortDate(s.day) }))}</h3>${today ? `<p class="muted">${esc(tx("day.reset"))}</p>` : ""}`;
    s.tasks.forEach((t, ti) => {
      const def = DAILY[t.id];
      let btn;
      if (t.got) btn = `<span class="progress">✓ ${esc(tx("day.done"))}</span>`;
      else if (isDone(t)) btn = `<button class="btn" type="button" data-dclaim="${si}:${ti}">${esc(tx("day.claim"))}</button>`;
      else btn = today ? `<button class="btn ghost" type="button" data-dreroll="${ti}" ${d.reroll === s.day ? `disabled title="${esc(tx("day.rerollUsed"))}"` : ""}>${esc(tx("day.reroll"))}</button>` : "";
      h += taskRow(def, t, tx("t." + t.id), btn);
    });
    const all = s.tasks.every((t) => t.got);
    h += `<div class="dlamp${s.lit ? " lit" : ""}"><span class="ic">🏮</span><div><b>${esc(tx("lamp"))}</b><small class="muted">${esc(tx("lamp.sub"))}</small></div>${s.lit ? `<span class="progress">✓ ${esc(tx("lamp.lit"))}</span>` : `<button class="btn" type="button" data-dlamp="${si}" ${all ? "" : "disabled"}>${esc(tx("lamp.claim", { n: d.back > 0 ? 2 : 1 }))}</button>`}</div></div>`;
  });
  // calendar
  const calDone = d.cal.last === dayKey();
  h += `<div class="dsec"><h3>${esc(tx("cal.title"))}</h3><p class="muted">${esc(tx("cal.sub"))}</p><div class="dcal">${Array.from({ length: 28 }, (_, i) => {
    const n = i + 1, r = calReward(n), got = n <= d.cal.n, next = !calDone && n === d.cal.n % 28 + 1;
    const ic = r.notes ? "♪" + r.notes : r.food ? "🍲" : "✦" + r.coins;
    return `<span class="dc${got ? " got" : ""}${next ? " next" : ""}${r.notes ? " big" : ""}" title="${esc(r.notes ? tx("r.notes", { n: r.notes }) : r.food ? itemName(r.food) : tx("r.coins", { n: r.coins }))}"><small>${n}</small>${ic}</span>`;
  }).join("")}</div>${calDone ? `<p class="muted">✓ ${esc(tx("cal.claimed"))}</p>` : `<button class="btn" type="button" data-dcal="1">${esc(tx("cal.claim", { n: d.cal.n % 28 + 1 }))}</button>`}</div>`;
  // pantry
  h += `<div class="dsec"><h3>${esc(tx("pantry.title"))}</h3><p class="muted">${esc(tx("pantry.sub", { c: PANTRY_COST }))}</p>${EV.BUILD && EV.BUILD.pantryBonus() ? `<p class="muted"><b>${esc(tx("pantry.bonus", { n: EV.BUILD.pantryBonus() }))}</b></p>` : ""}<div class="rc-btns">${d.pantry.free > 0 ? `<button class="btn" type="button" data-dpantry="1">${esc(tx("pantry.free", { n: d.pantry.free }))}</button>` : `<button class="btn ghost" type="button" data-dpantry="1" ${P.coins < PANTRY_COST ? "disabled" : ""}>${esc(tx("pantry.pay", { c: PANTRY_COST }))}</button>`}</div><p class="muted dsmall">${esc(tx("pantry.odds", { p: PANTRY_PITY, n: PANTRY_PITY - d.pantry.pity }))}</p></div>`;
  // weekly
  const gotW = d.week.tasks.filter((t) => t.got).length;
  h += `<div class="dsec"><h3>${esc(tx("week.title"))}</h3><p class="muted">${esc(tx("week.reset"))} ${esc(tx("week.bonus"))}</p>`;
  d.week.tasks.forEach((t, ti) => {
    const btn = t.got ? `<span class="progress">✓ ${esc(tx("day.done"))}</span>` : isDone(t) ? `<button class="btn" type="button" data-wclaim="${ti}">${esc(tx("day.claim"))}</button>` : "";
    h += taskRow(WEEKLY[t.id], t, tx("w." + t.id), btn);
  });
  h += `<div class="dlamp${d.week.bonus ? " lit" : ""}"><span class="ic">♪</span><div><b>${gotW} / 4</b></div>${d.week.bonus ? `<span class="progress">✓ ${esc(tx("week.bonusDone"))}</span>` : `<button class="btn" type="button" data-wbonus="1" ${gotW >= 4 ? "" : "disabled"}>${esc(tx("week.claimBonus"))}</button>`}</div></div>`;
  // stars and chests
  const ts = totalStars(), max = Object.keys((EV.RPG && EV.RPG.ZONES) || {}).length * 6;
  h += `<div class="dsec"><h3>${esc(tx("stars.title"))}</h3><p class="muted">${esc(tx("stars.sub", { n: ts, m: max }))}</p><div class="dchests">${CHESTS.map((c) => {
    const what = c.notes ? tx("r.notes", { n: c.notes }) : c.card ? tx("r.cardPick", { g: GR() ? GR()[c.card][L()] : "" }) : tx("r.cosm");
    const opened = d.chests[c.at], can = !opened && !c.cosm && ts >= c.at;
    return `<div class="dch${opened ? " got" : ""}"><b>★ ${c.at}</b><small>${esc(what)}</small>${opened ? `<span class="progress">✓ ${esc(tx("chest.opened"))}</span>` : `<button class="btn${can ? "" : " ghost"}" type="button" data-dchest="${c.at}" ${can ? "" : "disabled"}>${esc(tx("chest.open"))}</button>`}</div>`;
  }).join("")}</div>`;
  if (d.pick && EV.RPG) h += `<h3>${esc(tx("chest.pick"))}</h3><div class="rcards">${d.pick.map((o, i) => EV.RPG.cardHtml(o.id, o.g, { foot: `<div class="rc-btns"><button class="btn" type="button" data-dpick="${i}">${esc(tx("chest.pick"))}</button></div>` })).join("")}</div>`;
  h += `</div>`;
  // exchange
  h += `<div class="dsec"><h3>${esc(tx("ex.title"))}</h3><p class="muted">${esc(tx("ex.sub", { c: EX_COST, m: EX_MAX, n: EX_MAX - d.ex.n }))}</p><div class="rc-btns"><button class="btn ghost" type="button" data-dex="1" ${d.ex.n >= EX_MAX || P.coins < EX_COST ? "disabled" : ""}>${esc(tx("ex.btn", { c: EX_COST }))}</button></div></div>`;
  el.innerHTML = h;
}
function refreshChip() {
  const btn = $("btnDaily"); if (!btn) return;
  tick();
  btn.hidden = false;
  $("dailyLbl").textContent = tx("nav");
  $("noteVal").textContent = "♪ " + (EV.P.notes || 0);
  $("dailyDot").hidden = !hasNews();
}
function onClick(e) {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  const ds = b.dataset;
  if (ds.dclaim) { const [si, ti] = ds.dclaim.split(":").map(Number); claimTask(si, ti); }
  else if (ds.dreroll != null) reroll(+ds.dreroll);
  else if (ds.dlamp != null) lightLamp(+ds.dlamp);
  else if (ds.wclaim != null) claimWeek(+ds.wclaim);
  else if (ds.wbonus) claimWeekBonus();
  else if (ds.dcal) claimCal();
  else if (ds.dpantry) pantry();
  else if (ds.dex) exchange();
  else if (ds.dchest) openChest(+ds.dchest);
  else if (ds.dpick != null) takePick(+ds.dpick);
}

/* ---------- Style ---------- */
const css = document.createElement("style");
css.textContent = `
.dsec { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--line); padding-top: 10px; }
.dt { display: flex; align-items: center; gap: 10px; }
.dt-main { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.dt .bar { height: 7px; }
.dt.got { opacity: .6; }
.dlamp { display: flex; align-items: center; gap: 10px; border: 1px dashed var(--line); border-radius: 14px; padding: 8px 10px; }
.dlamp > div { flex: 1; display: flex; flex-direction: column; }
.dlamp .ic { font-size: 22px; }
.dlamp.lit { border-style: solid; border-color: var(--warn); background: color-mix(in srgb, var(--warn) 10%, transparent); }
.dback { margin: 0; padding: 8px 10px; border-radius: 12px; background: color-mix(in srgb, var(--accent) 12%, transparent); font-weight: 700; }
.dcal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.dc { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 40px; border: 1px solid var(--line); border-radius: 10px; font: 600 11px var(--font-mono); color: var(--muted); }
.dc small { font-size: 9px; opacity: .7; }
.dc.big { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 40%, var(--line)); }
.dc.got { background: var(--surface-2); color: var(--moss); }
.dc.next { outline: 2px solid var(--accent); }
.dsmall { font-size: 12px; }
.dchests { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 6px; }
.dch { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; border: 1px solid var(--line); border-radius: 12px; padding: 8px; }
.dch.got { opacity: .6; }
.dch small { font-size: 12px; color: var(--muted); }
`;
document.head.appendChild(css);

/* ---------- Hooks ---------- */
EV.HOOKS.renderDaily = () => { tick(); setTimeout(render, 0); };
$("dailyPanel").addEventListener("click", onClick);
$("btnDaily").addEventListener("click", () => { EV.sfx("tap"); EV.togglePanel("daily"); });
// refresh the chip now and then (tasks complete in the background as you play)
const prevShow = EV.HOOKS.showScreen;
EV.HOOKS.showScreen = function () { if (prevShow) prevShow.apply(this, arguments); refreshChip(); };
EV.every(4000, refreshChip);
tick(); EV.save(); refreshChip();
EV.DAILY = { tick, D, dayKey, dayNum, charge, KEEP_DAYS, weekKey, DAILY, WEEKLY, CHESTS, hasNews, render, calReward, totalStars };
})(typeof window !== "undefined" ? window : globalThis);
