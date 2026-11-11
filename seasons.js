/* Evolvlings: seasons (engagement delivery 4).
   Loaded after eggs.js. A season lasts 6 weeks and is tied to a verse of the Song of the Glade. Each one has:
   - the Keeper's Journal, a free 40-level pass (no paid version) that fills with daily and weekly tasks and the event;
   - an event for its first 3 weeks, with its own token, shop and story ending (Season 1: Night of Lanterns).
   Seasons follow a fixed calendar from 2 November 2026. When the last written season ends, they repeat. */
(function (root) {
"use strict";
const EV = root.EV;
if (!EV || !EV.RPG || !EV.DAILY) return;
const RPG = EV.RPG, $ = EV.$, esc = EV.escapeHtml, L = () => EV.LANG;

/* ---------- Text ---------- */
const TX = {
  es: {
    "nav": "Temporada", "tab.pass": "Diario del Cuidador", "tab.event": "Noche de Faroles", "tab.cosm": "Recuerdos",
    "s1": "Temporada 1 · La luz que falta", "s1.d": "Casa Albor y los faroles del Barrio Apagado.",
    "left": "Quedan {d} días de temporada.", "repeat": "Repetición",
    "pass.sub": "Un pase gratis de 40 niveles. Sube con las tareas diarias (100), las semanales (300) y el evento. No existe versión de pago.",
    "pass.lvl": "Nivel {n} de 40", "pass.xp": "{a} / {b} para el siguiente nivel", "pass.max": "¡Diario completo!",
    "pass.claim": "Recoger", "pass.got": "Recogido", "pass.claimAll": "Recoger todo lo disponible",
    "r.coins": "{n} Chispas", "r.notes": "{n} Notas", "r.food": "{f}", "r.egg": "Huevo celeste o mejor", "r.card": "Carta Épica o mejor, elige 1 de 3", "r.frame": "Marco «{f}»", "r.title": "Título «{t}»",
    "pick": "Elige tu carta Épica", "picked": "¡{card} es tuya!", "eggGot": "Un {e} va a la Incubadora del Refugio.",
    "ev.sub": "Tila quiere volver a encender su calle del Barrio Apagado. Consigue Cera haciendo tareas, viajando y ayudándola cada día, y enciende sus 12 faroles.",
    "ev.left": "El evento dura {d} días más.", "ev.over": "La Noche de Faroles terminó en esta temporada. Volverá más adelante.", "ev.soon": "El evento llega con la próxima temporada.",
    "ev.wax": "🕯 {n} de Cera", "ev.how": "Cera: 3 por cada tarea diaria cobrada, 4 por expedición terminada, 1 por combate ganado y 5 por ayudar a Tila una vez al día.",
    "ev.help": "Ayudar a Tila (+5 Cera)", "ev.helped": "Hoy ya ayudaste a Tila", "ev.light": "Encender el farol {n} · 🕯{c}", "ev.lit": "Calle encendida",
    "ev.shop": "Puesto de Tila", "ev.buy": "🕯{c}", "ev.soldout": "Agotado", "ev.locked": "Aún no",
    "sh.note": "1 Nota del Canto", "sh.stew": "Guiso", "sh.lantern": "Carta Farolillo · Súper rara", "sh.esc": "Escrito: {t}",
    "beat.0": "Tila te espera con la aceitera llena de cera. «Si encendemos los doce, mi calle vuelve a existir.»",
    "beat.3": "Con tres faroles encendidos, los niños salen a la calle por primera vez en semanas. Alguien canta bajito.",
    "beat.6": "Un guarda del Farol se acerca a mirar. No dice nada, pero tampoco apaga nada. Tila respira.",
    "beat.9": "Nim aparece en un tejado y se queda mirando la luz. Tila le deja una taza de infusión en el alféizar.",
    "beat.12": "La calle entera brilla. Tila te da su farol más viejo: «Para tu casa del Vado. Para que te acuerdes de que esta luz no la regaló nadie.»",
    "end": "Recuerdo conseguido: el Farol de Tila. +3 Notas del Canto.",
    "cosm.sub": "Marcos para la escena de tu criatura y títulos para su nombre. Se consiguen en el Diario y en los eventos.",
    "cosm.frames": "Marcos", "cosm.titles": "Títulos", "cosm.mem": "Recuerdos de eventos", "cosm.none": "Todavía no tienes ninguno.", "cosm.use": "Usar", "cosm.off": "Quitar", "cosm.on": "En uso",
    "f.faroles": "Faroles", "f.dorada": "Luz dorada", "t.verso1": "Quien encendió la calle", "m.tila": "El Farol de Tila",
    "m.tila.d": "El farol más viejo de Tila, de la Noche de Faroles.",
    "toast.wax": "+{n} Cera", "toast.lvl": "Diario del Cuidador: nivel {n}", "poor": "Te falta Cera.",
  },
  en: {
    "nav": "Season", "tab.pass": "Keeper's Journal", "tab.event": "Night of Lanterns", "tab.cosm": "Keepsakes",
    "s1": "Season 1 · The Missing Light", "s1.d": "House Albor and the lanterns of the Dim Quarter.",
    "left": "{d} days left in the season.", "repeat": "Rerun",
    "pass.sub": "A free 40-level pass. It grows with daily tasks (100), weekly tasks (300) and the event. There is no paid version.",
    "pass.lvl": "Level {n} of 40", "pass.xp": "{a} / {b} to the next level", "pass.max": "Journal complete!",
    "pass.claim": "Claim", "pass.got": "Claimed", "pass.claimAll": "Claim everything available",
    "r.coins": "{n} Chispas", "r.notes": "{n} Notes", "r.food": "{f}", "r.egg": "Sky egg or better", "r.card": "Epic card or better, pick 1 of 3", "r.frame": "“{f}” frame", "r.title": "“{t}” title",
    "pick": "Pick your Epic card", "picked": "{card} is yours!", "eggGot": "A {e} goes to the Refuge Incubator.",
    "ev.sub": "Tila wants to relight her street in the Dim Quarter. Earn Wax by doing tasks, travelling and helping her every day, and light her 12 lanterns.",
    "ev.left": "The event lasts {d} more days.", "ev.over": "The Night of Lanterns is over for this season. It will come back later.", "ev.soon": "The event arrives with the next season.",
    "ev.wax": "🕯 {n} Wax", "ev.how": "Wax: 3 per daily task claimed, 4 per expedition finished, 1 per battle won and 5 for helping Tila once a day.",
    "ev.help": "Help Tila (+5 Wax)", "ev.helped": "You already helped Tila today", "ev.light": "Light lantern {n} · 🕯{c}", "ev.lit": "Street lit",
    "ev.shop": "Tila's stall", "ev.buy": "🕯{c}", "ev.soldout": "Sold out", "ev.locked": "Not yet",
    "sh.note": "1 Song Note", "sh.stew": "Stew", "sh.lantern": "Lantern card · Super rare", "sh.esc": "Writing: {t}",
    "beat.0": "Tila is waiting with her oil can full of wax. \"If we light all twelve, my street exists again.\"",
    "beat.3": "With three lanterns lit, the children come out to the street for the first time in weeks. Someone sings softly.",
    "beat.6": "A Lantern warden comes over to look. He says nothing, but he doesn't put anything out either. Tila breathes.",
    "beat.9": "Nim shows up on a rooftop and stares at the light. Tila leaves a cup of tea on the windowsill for it.",
    "beat.12": "The whole street glows. Tila gives you her oldest lantern: \"For your house in el Vado. So you remember nobody gave this light away.\"",
    "end": "Keepsake earned: Tila's Lantern. +3 Song Notes.",
    "cosm.sub": "Frames for your creature's scene and titles for its name. You get them from the Journal and events.",
    "cosm.frames": "Frames", "cosm.titles": "Titles", "cosm.mem": "Event keepsakes", "cosm.none": "You don't have any yet.", "cosm.use": "Use", "cosm.off": "Remove", "cosm.on": "In use",
    "f.faroles": "Lanterns", "f.dorada": "Golden light", "t.verso1": "Who lit the street", "m.tila": "Tila's Lantern",
    "m.tila.d": "Tila's oldest lantern, from the Night of Lanterns.",
    "toast.wax": "+{n} Wax", "toast.lvl": "Keeper's Journal: level {n}", "poor": "Not enough Wax.",
  },
};
const tx = (k, v) => { let s = TX[L()][k]; if (s == null) s = TX.en[k]; if (s == null) return k; if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => (v[n] != null ? v[n] : m)); return s; };

/* ---------- Calendar ---------- */
const EPOCH = "2026-11-02", SEASON_DAYS = 42, EVENT_DAYS = 21;
const SEASONS = [{ key: "s1", event: "faroles", frame: "faroles", gold: "dorada", title: "verso1" }];
const dayNum = (k) => Math.round(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / 864e5);
function now() {
  const d = Math.max(0, dayNum(EV.DAILY.dayKey()) - dayNum(EPOCH));
  const idx = Math.floor(d / SEASON_DAYS), day = d % SEASON_DAYS;
  return { idx, day, def: SEASONS[idx % SEASONS.length], repeat: idx >= SEASONS.length, left: SEASON_DAYS - day, evLeft: EVENT_DAYS - day, evOn: day < EVENT_DAYS };
}

/* ---------- Journal (pass) ---------- */
const LVLS = 40, PER = 450;
const FOOD = ["stew", "melon", "cookie", "tea"];
const NOTES = { 5: 2, 10: 2, 15: 2, 20: 3, 25: 2, 30: 3, 35: 3, 40: 3 }; // 20 a season
function reward(l, def) {
  const out = [];
  if (NOTES[l]) out.push({ notes: NOTES[l] });
  if (l === 10) out.push({ egg: 2 });
  if (l === 20) out.push({ card: 3 });
  if (l === 30) out.push({ frame: def.frame });
  if (l === 40) out.push({ frame: def.gold }, { title: def.title });
  if (!out.length) out.push(l % 2 ? { coins: 20 + 2 * l } : { food: FOOD[(l / 2) % FOOD.length] });
  return out;
}
const cnt = (k) => EV.P.c[k] || 0;
const cosmSlice = EV.slice("cosm", () => ({ frames: {}, titles: {}, mem: {}, frame: null, title: null }));
function SS() {
  const P = EV.P, n = now();
  if (!P.ss || P.ss.idx !== n.idx) {
    // a new season: start counting from here, and make sure the event state is fresh
    P.ss = { idx: n.idx, base: { dailyDone: cnt("dailyDone"), weeklyDone: cnt("weeklyDone"), expDone: cnt("expDone"), expWins: cnt("expWins") }, xp: 0, got: {}, wax: 0, spent: 0, lit: 0, help: null, bought: {}, pick: null, ended: false };
  }
  cosmSlice();
  return P.ss;
}
const delta = (k) => cnt(k) - (SS().base[k] || 0);
const passXP = () => { const s = SS(); return delta("dailyDone") * 100 + delta("weeklyDone") * 300 + s.xp; };
const passLvl = () => Math.min(LVLS, Math.floor(passXP() / PER) + 1);
const rewLabel = (r) => r.notes ? tx("r.notes", { n: r.notes }) : r.coins ? tx("r.coins", { n: r.coins }) : r.food ? tx("r.food", { f: itemName(r.food) }) : r.egg ? tx("r.egg") : r.card ? tx("r.card") : r.frame ? tx("r.frame", { f: tx("f." + r.frame) }) : tx("r.title", { t: tx("t." + r.title) });
const rewIcon = (r) => r.notes ? "♪" : r.coins ? "✦" : r.food ? "🍲" : r.egg ? "🥚" : r.card ? "🃏" : r.frame ? "▣" : "✎";
function itemName(id) { const it = EV.STR[L()].item && EV.STR[L()].item[id]; return it ? it[0] : id; }
function give(r) {
  const P = EV.P;
  if (r.notes) P.notes = (P.notes || 0) + r.notes;
  if (r.coins) EV.addCoins(r.coins, true);
  if (r.food) P.inv[r.food] = (P.inv[r.food] || 0) + 1;
  if (r.egg && EV.EGGS) { const e = EV.EGGS.giveEgg(r.egg); EV.toast(tx("eggGot", { e: EV.EGGS.eggName(e.tier).toLowerCase() }), "🥚"); }
  if (r.card) SS().pick = RPG.pickUsable(3, r.card);
  if (r.frame) P.cosm.frames[r.frame] = 1;
  if (r.title) P.cosm.titles[r.title] = 1;
}
function claim(l) {
  const s = SS();
  if (s.got[l] || l > passLvl()) return;
  s.got[l] = 1;
  for (const r of reward(l, now().def)) give(r);
  EV.sfx("coin");
}
function claimAll() { for (let l = 1; l <= passLvl(); l++) claim(l); save(); }

/* ---------- Event: Night of Lanterns ---------- */
const LAMPS = 12, lampCost = (i) => 10 + 2 * i;
const SHOP = [
  { id: "note", cost: 15, max: 5 },
  { id: "stew", cost: 5, max: 10 },
  { id: "lantern", cost: 40, max: 1 },
  { id: "esc:balada", cost: 20, max: 1 },
  { id: "esc:esporina", cost: 20, max: 1 },
];
const waxEarned = () => { const s = SS(); return delta("dailyDone") * 3 + delta("expDone") * 4 + delta("expWins") + s.wax; };
const wax = () => waxEarned() - SS().spent;
function spend(c) { if (wax() < c) { EV.toast(tx("poor")); EV.sfx("deny"); return false; } SS().spent += c; return true; }
// helping during an event: once a day, and up to 3 helps wait if you miss days (design rule 4)
function helps(s) { if (!s.hc) s.hc = { day: s.help || null, left: 0 }; return EV.DAILY.charge(s.hc, 1, 3).left; }
function help() {
  const s = SS(), t = EV.DAILY.dayKey(); if (!now().evOn || helps(s) <= 0) return;
  s.help = t; s.hc.left--; s.wax += 5; s.xp += 50; EV.toast(tx("toast.wax", { n: 5 }), "🕯"); EV.sfx("coin"); save();
}
function light() {
  const s = SS(); if (!now().evOn || s.lit >= LAMPS || !spend(lampCost(s.lit))) return;
  s.lit++; s.xp += 150; EV.P.c.lampsLit = (EV.P.c.lampsLit || 0) + 1; EV.sfx("grow");
  if (s.lit === LAMPS && !s.ended) { s.ended = true; EV.P.cosm.mem.tila = 1; EV.P.notes = (EV.P.notes || 0) + 3; EV.toast(tx("end"), "🏮"); }
  save();
}
const LORE = root.EvoLore || null;
function escOk(id) { if (!LORE) return false; const w = LORE.LORE_ESCRITOS.find((x) => x.id === id); return !!w && w.layer <= LORE.loreLayer(EV.P.cleared); }
function buy(id) {
  const s = SS(), it = SHOP.find((x) => x.id === id); if (!it || !now().evOn) return;
  if ((s.bought[id] || 0) >= it.max) return;
  if (id.startsWith("esc:") && (!escOk(id.slice(4)) || (EV.P.escritos || {})[id.slice(4)])) return;
  if (!spend(it.cost)) return;
  s.bought[id] = (s.bought[id] || 0) + 1;
  const P = EV.P;
  if (id === "note") P.notes = (P.notes || 0) + 1;
  else if (id === "stew") P.inv.stew = (P.inv.stew || 0) + 1;
  else if (id === "lantern") RPG.takeCard("lantern", 2);
  else if (id.startsWith("esc:")) { const w = id.slice(4); P.escritos = P.escritos || {}; P.escritos[w] = Date.now(); P.c.escritos = (P.c.escritos || 0) + 1; }
  EV.sfx("coin"); save();
}
function shopLabel(id) {
  if (id.startsWith("esc:")) { const w = LORE && LORE.LORE_ESCRITOS.find((x) => x.id === id.slice(4)); return tx("sh.esc", { t: w ? (escOk(w.id) ? w[L()].title : "???") : "?" }); }
  return tx("sh." + id);
}

/* ---------- Cosmetics on the home screen ---------- */
function applyCosm() {
  const P = EV.P; if (!P.cosm) return;
  const st = document.querySelector("#scene") && document.querySelector("#scene").parentElement;
  if (st) { st.classList.remove("fr-faroles", "fr-dorada"); if (P.cosm.frame) st.classList.add("fr-" + P.cosm.frame); }
  let t = $("petTitle");
  const nm = $("petName");
  if (!t && nm) { t = document.createElement("div"); t.id = "petTitle"; t.className = "pet-title"; nm.after(t); }
  if (t) { t.textContent = P.cosm.title ? tx("t." + P.cosm.title) : ""; t.hidden = !P.cosm.title; }
}

/* ---------- View ---------- */
let tab = "pass";
function passHtml() {
  const s = SS(), n = now(), xp = passXP(), lv = passLvl();
  const a = xp - (lv - 1) * PER;
  const avail = Array.from({ length: lv }, (_, i) => i + 1).some((l) => !s.got[l]);
  let h = `<p class="muted" style="margin:0">${esc(tx("pass.sub"))}</p><div class="ss-lvl"><b>${esc(tx("pass.lvl", { n: lv }))}</b><div class="bar"><i style="width:${lv >= LVLS ? 100 : Math.round(100 * a / PER)}%"></i></div><small class="progress">${esc(lv >= LVLS ? tx("pass.max") : tx("pass.xp", { a, b: PER }))}</small></div>`;
  if (avail) h += `<div class="rc-btns"><button class="btn" type="button" data-sall="1">${esc(tx("pass.claimAll"))}</button></div>`;
  if (s.pick) h += `<h3>${esc(tx("pick"))}</h3><div class="rcards">${s.pick.map((o, i) => RPG.cardHtml(o.id, o.g, { foot: `<div class="rc-btns"><button class="btn" type="button" data-spick="${i}">${esc(tx("pass.claim"))}</button></div>` })).join("")}</div>`;
  h += `<div class="ss-track">${Array.from({ length: LVLS }, (_, i) => {
    const l = i + 1, rs = reward(l, n.def), got = s.got[l], can = !got && l <= lv, big = l % 5 === 0;
    return `<div class="ss-step${got ? " got" : ""}${can ? " can" : ""}${big ? " big" : ""}"><small class="progress">${l}</small><span class="ic">${rs.map(rewIcon).join("")}</span><small>${esc(rs.map(rewLabel).join(" + "))}</small>${got ? `<small class="progress">✓</small>` : can ? `<button class="btn" type="button" data-sclaim="${l}">${esc(tx("pass.claim"))}</button>` : ""}</div>`;
  }).join("")}</div>`;
  return h;
}
function lampsHtml(lit) {
  return `<div class="ss-street" aria-label="${lit} / ${LAMPS}">${Array.from({ length: LAMPS }, (_, i) => `<i class="${i < lit ? "on" : ""}" style="--i:${i}"><b></b></i>`).join("")}</div>`;
}
function eventHtml() {
  const s = SS(), n = now();
  if (!n.evOn && !s.lit) return `<p class="muted">${esc(tx("ev.over"))}</p>`;
  const beat = [12, 9, 6, 3, 0].find((b) => s.lit >= b);
  let h = `<p class="muted" style="margin:0">${esc(tx("ev.sub"))}</p><p class="progress">${esc(n.evOn ? tx("ev.left", { d: n.evLeft }) : tx("ev.over"))}</p>`;
  h += lampsHtml(s.lit) + `<p class="evt-text ss-beat">${esc(tx("beat." + beat))}</p>`;
  if (s.ended) h += `<p class="evt-out">🏮 ${esc(tx("end"))}</p>`;
  if (n.evOn) {
    h += `<div class="ss-wax"><b>${esc(tx("ev.wax", { n: wax() }))}</b><small class="muted">${esc(tx("ev.how"))}</small></div><div class="rc-btns">`;
    h += `<button class="btn${helps(s) > 0 ? "" : " ghost"}" type="button" data-shelp="1" ${helps(s) > 0 ? "" : "disabled"}>${esc(helps(s) <= 0 ? tx("ev.helped") : tx("ev.help"))}</button>`;
    h += s.lit < LAMPS ? `<button class="btn" type="button" data-slight="1" ${wax() < lampCost(s.lit) ? "disabled" : ""}>${esc(tx("ev.light", { n: s.lit + 1, c: lampCost(s.lit) }))}</button>` : `<span class="progress">✓ ${esc(tx("ev.lit"))}</span>`;
    h += `</div><h3 class="cat-title">${esc(tx("ev.shop"))}</h3><div class="ss-shop">${SHOP.map((it) => {
      const b = s.bought[it.id] || 0, out = b >= it.max || (it.id.startsWith("esc:") && (EV.P.escritos || {})[it.id.slice(4)]), lock = it.id.startsWith("esc:") && !escOk(it.id.slice(4));
      return `<div class="dch${out ? " got" : ""}"><b>${esc(shopLabel(it.id))}</b><small>${it.max > 1 ? `${b} / ${it.max}` : ""}</small>${out ? `<span class="progress">${esc(tx("ev.soldout"))}</span>` : lock ? `<span class="muted">🔒 ${esc(tx("ev.locked"))}</span>` : `<button class="btn${wax() >= it.cost ? "" : " ghost"}" type="button" data-sbuy="${it.id}" ${wax() >= it.cost ? "" : "disabled"}>${esc(tx("ev.buy", { c: it.cost }))}</button>`}</div>`;
    }).join("")}</div>`;
  }
  return h;
}
function cosmHtml() {
  const C = EV.P.cosm;
  const row = (kind, ids, cur, label) => ids.length ? `<div class="ss-cosm">${ids.map((id) => `<div class="dch${cur === id ? " got" : ""}"><b>${esc(tx(label + id))}</b>${cur === id ? `<button class="btn ghost" type="button" data-scosm="${kind}:">${esc(tx("cosm.off"))}</button>` : `<button class="btn" type="button" data-scosm="${kind}:${id}">${esc(tx("cosm.use"))}</button>`}</div>`).join("")}</div>` : `<p class="muted">${esc(tx("cosm.none"))}</p>`;
  let h = `<p class="muted" style="margin:0">${esc(tx("cosm.sub"))}</p>`;
  h += `<h3 class="cat-title">${esc(tx("cosm.frames"))}</h3>` + row("frame", Object.keys(C.frames), C.frame, "f.");
  h += `<h3 class="cat-title">${esc(tx("cosm.titles"))}</h3>` + row("title", Object.keys(C.titles), C.title, "t.");
  const mem = Object.keys(C.mem);
  h += `<h3 class="cat-title">${esc(tx("cosm.mem"))}</h3>` + (mem.length ? `<ul>${mem.map((m) => `<li>🏮 <b>${esc(tx("m." + m))}</b> · <span class="muted">${esc(tx("m." + m + ".d"))}</span></li>`).join("")}</ul>` : `<p class="muted">${esc(tx("cosm.none"))}</p>`);
  return h;
}
function render() {
  const el = $("seasonPanel"); if (!el || el.hidden) return;
  const n = now(); SS();
  let h = `<div class="panel-head"><div><div class="sub">${esc(n.repeat ? tx("repeat") : "")}</div><h2>${esc(tx(n.def.key))}</h2></div><span class="progress">${esc(tx("left", { d: n.left }))}</span></div><p class="muted" style="margin:0">${esc(tx(n.def.key + ".d"))}</p>`;
  h += `<div class="seg rf-tabs" role="tablist">${["pass", "event", "cosm"].map((t) => `<button type="button" role="tab" data-stab="${t}" aria-pressed="${tab === t}" aria-selected="${tab === t}">${esc(tx("tab." + t))}</button>`).join("")}</div>`;
  h += `<div class="rf-body">${tab === "event" ? eventHtml() : tab === "cosm" ? cosmHtml() : passHtml()}</div>`;
  el.innerHTML = h;
}
function hasNews() {
  const s = SS(), lv = passLvl(), n = now();
  for (let l = 1; l <= lv; l++) if (!s.got[l]) return true;
  if (s.pick) return true;
  if (n.evOn && (helps(s) > 0 || (s.lit < LAMPS && wax() >= lampCost(s.lit)))) return true;
  return false;
}
let lastLvl = null;
function refreshChip() {
  const btn = $("btnSeason"); if (!btn) return;
  const S = EV.S;
  btn.hidden = !(S && S.phase === "alive");
  $("seasonLbl").textContent = tx("nav");
  $("seasonDot").hidden = !hasNews();
  const lv = passLvl();
  if (lastLvl != null && lv > lastLvl) EV.toast(tx("toast.lvl", { n: lv }), "📔");
  lastLvl = lv;
  applyCosm();
}
function save() { EV.save(); EV.checkAch(); render(); refreshChip(); }
function onClick(e) {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.stab) { tab = d.stab; EV.sfx("tap"); render(); }
  else if (d.sclaim) { claim(+d.sclaim); save(); }
  else if (d.sall) claimAll();
  else if (d.spick != null) { const s = SS(), o = s.pick && s.pick[+d.spick]; if (!o) return; s.pick = null; RPG.takeCard(o.id, o.g); EV.toast(tx("picked", { card: RPG.cardName(o.id) })); EV.sfx("grow"); save(); }
  else if (d.shelp) help();
  else if (d.slight) light();
  else if (d.sbuy) buy(d.sbuy);
  else if (d.scosm != null) { const [k, id] = d.scosm.split(":"); EV.P.cosm[k] = id || null; EV.sfx("tap"); save(); }
}

/* ---------- Styles ---------- */
const css = document.createElement("style");
css.textContent = `
.ss-lvl { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; } .ss-lvl .bar { height: 10px; }
.ss-track { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 6px; margin-top: 8px; }
.ss-step { display: flex; flex-direction: column; gap: 3px; align-items: flex-start; border: 1px solid var(--line); padding: 6px 8px; font-size: 12px; background: var(--bg); min-height: 92px; }
.ss-step .ic { font-size: 18px; }
.ss-step.big { border-width: 2px; border-color: var(--accent, #5b45c8); }
.ss-step.can { box-shadow: 3px 3px 0 var(--shade); }
.ss-step.got { opacity: .55; }
.ss-street { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; align-items: end; height: 70px; padding: 6px; margin-top: 8px; background: linear-gradient(#1c1430, #2b2040); border: 2px solid var(--line); }
.ss-street i { position: relative; height: 100%; display: flex; justify-content: center; }
.ss-street i::before { content: ""; position: absolute; bottom: 0; width: 3px; height: 70%; background: #6b5a7a; }
.ss-street i b { position: absolute; top: 8%; width: 12px; height: 14px; background: #4a3d5e; border: 2px solid #0e0814; }
.ss-street i.on b { background: #f2c94c; box-shadow: 0 0 10px 4px rgba(242, 201, 76, .55); }
@media (prefers-reduced-motion: no-preference) { .ss-street i.on b { animation: flick 1.6s steps(2) infinite; animation-delay: calc(var(--i) * .13s); } }
@keyframes flick { 50% { box-shadow: 0 0 6px 2px rgba(242, 201, 76, .4); } }
.ss-beat { margin: 8px 0; }
.ss-wax { display: flex; flex-direction: column; gap: 2px; margin: 6px 0; }
.ss-shop, .ss-cosm { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; }
.pet-title { font: 600 12px var(--font-mono); color: var(--accent, #5b45c8); }
.stage.fr-faroles { box-shadow: 0 0 0 4px #2b2040, 0 0 0 7px #f2c94c, 6px 6px 0 7px var(--shade); }
.stage.fr-dorada { box-shadow: 0 0 0 4px #e0b84a, 0 0 0 7px #fff3c4, 0 0 18px 8px rgba(224, 184, 74, .45); }
@media (max-width: 520px) { .ss-street { gap: 2px; padding: 4px; } .ss-street i b { width: 9px; height: 11px; } }
`;
(document.body || document.head).appendChild(css);

/* ---------- Achievements ---------- */
const ACH = [["pass20", 50, () => passLvl() >= 20], ["pass40", 150, () => passLvl() >= 40], ["lamps12", 80, (p) => !!(p.cosm && p.cosm.mem.tila)]];
const ACH_TX = { es: { pass20: ["Medio diario", "Llega al nivel 20 del Diario del Cuidador."], pass40: ["Diario completo", "Llega al nivel 40 del Diario del Cuidador."], lamps12: ["La calle de Tila", "Enciende los 12 faroles en la Noche de Faroles."] },
  en: { pass20: ["Halfway journal", "Reach level 20 of the Keeper's Journal."], pass40: ["Journal complete", "Reach level 40 of the Keeper's Journal."], lamps12: ["Tila's street", "Light all 12 lanterns in the Night of Lanterns."] } };
EV.ACH.push(...ACH);
for (const lg of ["es", "en"]) Object.assign(EV.STR[lg].ach, ACH_TX[lg]);

/* ---------- Hooks ---------- */
EV.HOOKS.renderSeason = () => { setTimeout(render, 0); };
$("seasonPanel").addEventListener("click", onClick);
$("btnSeason").addEventListener("click", () => { EV.sfx("tap"); EV.togglePanel("season"); });
const prevShow = EV.HOOKS.showScreen;
EV.HOOKS.showScreen = function () { if (prevShow) prevShow.apply(this, arguments); refreshChip(); };
EV.every(5000, refreshChip);
SS(); refreshChip();
EV.SEASON = { now, SS, passXP, passLvl, reward, wax, lampCost, SHOP, SEASONS, LVLS, PER, render, hasNews, applyCosm };
})(typeof window !== "undefined" ? window : globalThis);
