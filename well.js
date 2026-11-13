/* Evolvlings: the Well of Echoes, card pool (engagement delivery 2).
   Loaded after the rpg/ scripts. Pulls cost Song Notes (never real money). Visible odds, a floor of one Epic or
   better every 10 pulls, soft pity from pull 50, a sure Legendary at 70, and the Well's Promise (50/50:
   if a Legendary isn't the featured card, the next one is). Counters and the Promise carry across banners.
   Story creatures and their cards are never in the Well. */
(function (root) {
"use strict";
const EV = root.EV;
if (!EV || !EV.RPG) return;
const RPG = EV.RPG, esc = EV.escapeHtml, L = () => EV.LANG;

/* ---------- Text ---------- */
const TX = {
  es: {
    "tab": "Pozo", "title": "Pozo de los Ecos",
    "sub": "Lanza una Nota del Canto y el Pozo devuelve un eco: una carta. Las criaturas de la historia nunca salen aquí; se ganan jugando.",
    "notes": "♪ {n} Notas del Canto", "pull1": "Tirar 1 · ♪1", "pull10": "Tirar 10 · ♪10", "poor": "Te faltan Notas del Canto.",
    "ban.s1": "La luz que falta", "ban.s1.d": "Temporada 1 · Casa Albor y los faroles del Barrio Apagado. Carta destacada de Luz y tres Épicas con más probabilidad.",
    "ban.perm": "Eco permanente", "ban.perm.d": "Todas las cartas del Claro, sin destacada. Comparte contador con el banner de temporada.",
    "feat": "Carta destacada", "users": "La usan: {who}.", "usersNone": "Solo la puede llevar una criatura de su tipo.", "boost": "Épicas con más probabilidad: {list}.",
    "pity": "Legendaria segura en {n} tiradas", "floor": "Épica o mejor en {n} tiradas", "promiseOn": "Promesa activa: la próxima Legendaria es la destacada.", "promiseOff": "Promesa: 50 % de que la próxima Legendaria sea la destacada.",
    "last": "Lo que devolvió el Pozo", "rules": "Cómo funciona el Pozo", "hist": "Historial ({n})", "histNone": "Todavía no has tirado.",
    "odds": "Probabilidad base por tirada", "r.floor": "Suelo de 10: cada 10 tiradas sale al menos una Épica.",
    "r.soft": "Pity suave: desde la tirada 50 sin Legendaria, su probabilidad sube 6 puntos por tirada.", "r.hard": "Pity duro: la tirada 70 sin Legendaria siempre da Legendaria.",
    "r.promise": "Promesa del Pozo: la mitad de las Legendarias son la destacada. Si sale otra, la siguiente es la destacada seguro.",
    "r.keep": "El contador y la Promesa se conservan al cambiar de banner.",
    "f.money": "Nunca hay dinero real: no existe tienda de pago ni forma de comprar Notas.", "f.visible": "Todo es visible: probabilidades, contadores, Promesa e historial de las últimas 200 tiradas.",
    "f.honest": "La animación no miente: los anillos muestran el grado real desde el principio.", "f.keep": "Nada caduca: Notas, Polvo y contadores se guardan aunque no juegues.",
    "f.back": "Todo lo limitado vuelve: cada destacada vuelve más adelante y se puede conseguir en la Tienda del Polvo.", "f.story": "Las 3 estrellas de cada zona se consiguen con las cartas que da el propio juego.",
    "shop": "Tienda del Polvo", "shop.have": "Tienes {n} ∴ de Polvo de estrella.", "shop.note": "1 Nota · {c} ∴", "shop.noteLeft": "Te quedan {n} este mes.",
    "shop.past": "Las destacadas de temporadas pasadas aparecerán aquí dos temporadas después.", "shop.got": "+1 Nota del Canto", "shop.poor": "Te falta Polvo de estrella.", "shop.max": "Ya cambiaste 5 Notas este mes.",
    "free": "Tirada gratis de la semana", "bonus": "Obras del Pozo: +{n} puntos de Rara o mejor en cada tirada.",
    "got": "Del Pozo: {card}", "ach.well1": ["Primer eco", "Tira por primera vez en el Pozo de los Ecos."], "ach.legend1": ["Luz de raíz", "Consigue una carta Legendaria."],
  },
  en: {
    "tab": "Well", "title": "Well of Echoes",
    "sub": "Drop in a Song Note and the Well sends back an echo: a card. Story creatures never come from here; you earn them by playing.",
    "notes": "♪ {n} Song Notes", "pull1": "Pull 1 · ♪1", "pull10": "Pull 10 · ♪10", "poor": "You don't have enough Song Notes.",
    "ban.s1": "The Missing Light", "ban.s1.d": "Season 1 · House Albor and the lanterns of the Dim Quarter. A featured Light card and three Epics with better odds.",
    "ban.perm": "Standing echo", "ban.perm.d": "Every card of the Glade, nothing featured. Shares its counters with the season banner.",
    "feat": "Featured card", "users": "Used by: {who}.", "usersNone": "Only a creature of its type can carry it.", "boost": "Epics with better odds: {list}.",
    "pity": "Sure Legendary in {n} pulls", "floor": "Epic or better in {n} pulls", "promiseOn": "Promise active: the next Legendary is the featured card.", "promiseOff": "Promise: 50% chance the next Legendary is the featured card.",
    "last": "What the Well sent back", "rules": "How the Well works", "hist": "History ({n})", "histNone": "You haven't pulled yet.",
    "odds": "Base odds per pull", "r.floor": "Floor of 10: every 10 pulls give at least one Epic.",
    "r.soft": "Soft pity: from pull 50 without a Legendary, its chance goes up 6 points per pull.", "r.hard": "Hard pity: pull 70 without a Legendary always gives one.",
    "r.promise": "The Well's Promise: half of all Legendaries are the featured card. If you get another, the next one is the featured card for sure.",
    "r.keep": "Counters and the Promise carry over when you switch banners.",
    "f.money": "Never real money: there is no paid shop and no way to buy Notes.", "f.visible": "Everything is visible: odds, counters, the Promise and a history of the last 200 pulls.",
    "f.honest": "The animation doesn't lie: the rings show the real grade from the start.", "f.keep": "Nothing expires: Notes, Stardust and counters stay even if you don't play.",
    "f.back": "Everything limited comes back: each featured card returns later and can be had at the Stardust Shop.", "f.story": "Every zone's 3 stars can be earned with the cards the game itself gives you.",
    "shop": "Stardust Shop", "shop.have": "You have {n} ∴ Stardust.", "shop.note": "1 Note · {c} ∴", "shop.noteLeft": "{n} left this month.",
    "shop.past": "Featured cards from past seasons will show up here two seasons later.", "shop.got": "+1 Song Note", "shop.poor": "Not enough Stardust.", "shop.max": "You've already traded 5 Notes this month.",
    "free": "This week's free pull", "bonus": "Well builds: +{n} points of Rare or better on every pull.",
    "got": "From the Well: {card}", "ach.well1": ["First echo", "Pull at the Well of Echoes for the first time."], "ach.legend1": ["Root-light", "Get a Legendary card."],
  },
};
const tx = EV.text("well", TX);

/* ---------- Rules ---------- */
const ODDS = [38.2, 28, 18, 10, 5, 0.8]; // % by grade index: Común … Legendaria
const EPIC = 3, LEG = 5, FLOOR = 10, SOFT = 50, HARD = 70, HIST = 200;
const DUST_NOTE = 25, DUST_NOTE_MAX = 5;
const BANNERS = {
  s1: { featured: "street", boost: ["lantern", "spark", "ration"] },
  perm: { featured: null, boost: [] },
};
const POOL = () => RPG.DROP_POOL;
const pick = EV.pick;
const SPECIES = { lumo: "Lumo", fizz: "Fizz", pebb: "Pebb" };

const wellSlice = EV.slice("well", () => ({ pity: 0, floor: 0, promise: false, banner: "s1", hist: [], dn: { month: null, n: 0 } }));
function W() {
  const P = EV.P, w = wellSlice();
  if (P.notes == null) P.notes = 0;
  return w;
}
// chance of a Legendary on the n-th pull since the last one
const legChance = (n) => (n >= HARD ? 100 : n >= SOFT ? ODDS[LEG] + 6 * (n - SOFT + 1) : ODDS[LEG]);
function rollGrade(w) {
  if (Math.random() * 100 < legChance(w.pity)) return LEG;
  if (w.floor >= FLOOR) return Math.random() * (ODDS[4] + ODDS[3]) < ODDS[4] ? 4 : 3;
  let r = Math.random() * (100 - ODDS[LEG]), out = 0;
  for (let g = 4; g > 0; g--) { if (r < ODDS[g]) { out = g; break; } r -= ODDS[g]; }
  // the Well build (build.js): +2 points of Rare or better per level, at most +10, taken from Common and Uncommon
  const bonus = EV.BUILD ? EV.BUILD.wellBonus() : 0;
  if (out < 2 && bonus && Math.random() * (ODDS[0] + ODDS[1]) < bonus) out = 2;
  return out;
}
// one free pull every week (Monday to Sunday)
const weekNow = () => (EV.DAILY ? EV.DAILY.weekKey() : String(Math.floor((Date.now() / 864e5 + 3) / 7)));
const freeLeft = () => W().freeWk !== weekNow();
function pullFree() {
  if (!freeLeft()) return;
  const w = W(); w.freeWk = weekNow();
  const got = [pullOne(w.banner)];
  last = { got, best: got[0].g, key: Date.now() };
  EV.sfx(got[0].g >= EPIC ? "grow" : "card");
  EV.toast(tx("got", { card: RPG.cardName(got[0].id) }), RPG.GRADES[got[0].g][L()]);
  EV.save(); EV.checkAch();
}
function pullOne(banner) {
  const w = W(), B = BANNERS[banner];
  w.pity++; w.floor++;
  const g = rollGrade(w);
  if (g >= EPIC) w.floor = 0;
  let id, feat = false;
  if (g === LEG) {
    w.pity = 0;
    if (B.featured) {
      if (w.promise || Math.random() < 0.5) { id = B.featured; feat = true; w.promise = false; }
      else { id = pick(POOL().filter((x) => x !== B.featured)); w.promise = true; }
    } else id = pick(POOL());
  } else if (g === EPIC && B.boost.length && Math.random() < 0.5) id = pick(B.boost);
  else id = pick(POOL());
  RPG.takeCard(id, g);
  w.hist.unshift({ id, g, b: banner, t: Date.now() });
  if (w.hist.length > HIST) w.hist.length = HIST;
  EV.P.c.wellPulls = (EV.P.c.wellPulls || 0) + 1;
  return { id, g, feat };
}
let last = null;
function pull(n) {
  const w = W(), P = EV.P;
  if ((P.notes || 0) < n) { EV.toast(tx("poor")); EV.sfx("deny"); return; }
  P.notes -= n;
  const got = [];
  for (let i = 0; i < n; i++) got.push(pullOne(w.banner));
  const best = Math.max(...got.map((x) => x.g));
  last = { got, best, key: Date.now() };
  EV.sfx(best >= EPIC ? "grow" : "card"); EV.buzz && EV.buzz(best >= EPIC ? 40 : 15);
  if (n === 1) EV.toast(tx("got", { card: RPG.cardName(got[0].id) }), RPG.GRADES[got[0].g][L()]);
  EV.save(); EV.checkAch();
}
function tradeNote() {
  const w = W(), P = EV.P, m = new Date().toISOString().slice(0, 7);
  if (w.dn.month !== m) { w.dn.month = m; w.dn.n = 0; }
  if (w.dn.n >= DUST_NOTE_MAX) { EV.toast(tx("shop.max")); EV.sfx("deny"); return; }
  if ((P.dust || 0) < DUST_NOTE) { EV.toast(tx("shop.poor")); EV.sfx("deny"); return; }
  P.dust -= DUST_NOTE; P.notes = (P.notes || 0) + 1; w.dn.n++;
  EV.toast(tx("shop.got"), "♪"); EV.sfx("coin"); EV.save();
}

/* ---------- View ---------- */
const gName = (g) => RPG.GRADES[g][L()];
function ringsHtml(best) {
  const v = RPG.GRADE_VIS[best], n = best + 1;
  return `<div class="well-rings" style="--m0:${v.mat[0]};--m1:${v.mat[1]}" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i style="--i:${i};--n:${n}"${i === n - 1 && best >= EPIC ? ' class="mat"' : ""}></i>`).join("")}</div>`;
}
function html() {
  const w = W(), P = EV.P, B = BANNERS[w.banner];
  let h = `<p class="muted" style="margin:0">${esc(tx("sub"))}</p><p class="progress">${esc(tx("notes", { n: P.notes || 0 }))}</p>`;
  h += `<div class="seg" role="group">${Object.keys(BANNERS).map((b) => `<button type="button" data-wban="${b}" aria-pressed="${w.banner === b}">${esc(tx("ban." + b))}</button>`).join("")}</div>`;
  h += `<div class="well-ban"><div><h3>${esc(tx("ban." + w.banner))}</h3><p class="muted">${esc(tx("ban." + w.banner + ".d"))}</p>`;
  if (B.featured) {
    const who = Object.keys(SPECIES).filter((sp) => RPG.canUse(sp, null, B.featured)).map((sp) => SPECIES[sp]);
    h += `<p><b>${esc(tx("feat"))}:</b> ${esc(RPG.cardName(B.featured))} · ${esc(gName(LEG))}. ${esc(who.length ? tx("users", { who: who.join(", ") }) : tx("usersNone"))}</p>`;
    h += `<p class="muted">${esc(tx("boost", { list: B.boost.map(RPG.cardName).join(", ") }))}</p>`;
  }
  h += `<ul class="well-count"><li>${esc(tx("pity", { n: HARD - w.pity }))}</li><li>${esc(tx("floor", { n: FLOOR - w.floor }))}</li>${B.featured ? `<li>${esc(tx(w.promise ? "promiseOn" : "promiseOff"))}</li>` : ""}</ul>`;
  const wb = EV.BUILD ? EV.BUILD.wellBonus() : 0;
  if (wb) h += `<p class="well-bonus">${esc(tx("bonus", { n: wb }))}</p>`;
  h += `<div class="rc-btns">${freeLeft() ? `<button class="btn" type="button" data-wfree="1">${esc(tx("free"))}</button>` : ""}<button class="btn" type="button" data-wpull="1" ${(P.notes || 0) < 1 ? "disabled" : ""}>${esc(tx("pull1"))}</button><button class="btn" type="button" data-wpull="10" ${(P.notes || 0) < 10 ? "disabled" : ""}>${esc(tx("pull10"))}</button></div></div>`;
  if (B.featured) h += `<div class="rcards well-feat">${RPG.cardHtml(B.featured, LEG)}</div>`;
  h += `</div>`;
  if (last) {
    h += `<div class="well-last" data-key="${last.key}"><h3 class="cat-title">${esc(tx("last"))}</h3>${ringsHtml(last.best)}<div class="rcards well-cards">${last.got.map((x, i) => `<div class="well-card" style="--d:${i}">${RPG.cardHtml(x.id, x.g)}</div>`).join("")}</div></div>`;
  }
  // rules
  h += `<details class="well-det"><summary>${esc(tx("rules"))}</summary><p><b>${esc(tx("odds"))}</b></p><table class="well-odds">${ODDS.map((o, g) => `<tr><td>${esc(gName(g))}</td><td>${String(o).replace(".", L() === "es" ? "," : ".")} %</td></tr>`).reverse().join("")}</table>
    <ul>${["r.floor", "r.soft", "r.hard", "r.promise", "r.keep"].map((k) => `<li>${esc(tx(k))}</li>`).join("")}</ul>
    <ol>${["f.money", "f.visible", "f.honest", "f.keep", "f.back", "f.story"].map((k) => `<li>${esc(tx(k))}</li>`).join("")}</ol></details>`;
  // history
  h += `<details class="well-det"><summary>${esc(tx("hist", { n: w.hist.length }))}</summary>${w.hist.length ? `<ol class="well-hist">${w.hist.map((x) => `<li><span class="gr" style="--g:${RPG.GRADES[x.g].col}">${esc(gName(x.g))}</span> ${esc(RPG.cardName(x.id))} <small>${new Date(x.t).toLocaleDateString(L())}</small></li>`).join("")}</ol>` : `<p class="muted">${esc(tx("histNone"))}</p>`}</details>`;
  // Stardust shop
  const m = new Date().toISOString().slice(0, 7), left = w.dn.month === m ? DUST_NOTE_MAX - w.dn.n : DUST_NOTE_MAX;
  h += `<h3 class="cat-title">${esc(tx("shop"))}</h3><p class="muted" style="margin:0">${esc(tx("shop.have", { n: P.dust || 0 }))} ${esc(tx("shop.noteLeft", { n: left }))}</p>
    <div class="rc-btns"><button class="btn ghost" type="button" data-wnote="1" ${(P.dust || 0) < DUST_NOTE || left <= 0 ? "disabled" : ""}>${esc(tx("shop.note", { c: DUST_NOTE }))}</button></div><p class="muted">${esc(tx("shop.past"))}</p>`;
  return h;
}
// returns true when it handled the click
function click(t) {
  const w = W();
  if (t.dataset.wban) { w.banner = t.dataset.wban; last = null; EV.sfx("tap"); EV.save(); RPG.renderCards(); return true; }
  if (t.dataset.wfree) { pullFree(); RPG.renderCards(); const el = document.querySelector(".well-last"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return true; }
  if (t.dataset.wpull) { pull(+t.dataset.wpull); RPG.renderCards(); const el = document.querySelector(".well-last"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return true; }
  if (t.dataset.wnote) { tradeNote(); RPG.renderCards(); return true; }
  return false;
}

/* ---------- Styles ---------- */
const css = `
.well-ban { display: grid; grid-template-columns: minmax(0, 1fr) 240px; gap: 14px; align-items: start; margin: 10px 0; }
.well-ban h3 { margin: 0 0 4px; } .well-ban p { margin: 4px 0; font-size: 14px; }
.well-count { list-style: none; padding: 0; margin: 8px 0; display: flex; flex-direction: column; gap: 3px; font: 600 13px var(--font-mono); }
.well-feat { grid-template-columns: 1fr !important; }
.well-bonus { font: 600 13px var(--font-mono); color: var(--moss, #3c7a2c); }
.well-last { position: relative; margin-top: 12px; }
.well-rings { position: relative; height: 90px; display: grid; place-items: center; overflow: hidden; }
.well-rings i { position: absolute; width: 20px; height: 20px; border: 3px solid var(--m0); border-radius: 50% !important; opacity: 0; animation: ring .9s steps(6) forwards; animation-delay: calc(var(--i) * .12s); }
.well-rings i.mat { border-color: var(--m1); box-shadow: 0 0 0 2px var(--m0); }
@keyframes ring { 0% { transform: scale(.2); opacity: 1; } 100% { transform: scale(calc(2 + var(--i) * 0.7)); opacity: .9; } }
.well-card { opacity: 0; animation: wcard .3s ease-out forwards; animation-delay: calc(.9s + var(--d) * .06s); }
@keyframes wcard { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .well-rings i, .well-card { animation: none; opacity: 1; } .well-rings i { transform: scale(calc(2 + var(--i) * 0.7)); } }
.well-det { margin-top: 12px; border: 2px solid var(--line); padding: 8px 10px; background: var(--bg); }
.well-det summary { cursor: pointer; font-family: var(--font-display); }
.well-det li { font-size: 14px; margin: 3px 0; }
.well-odds { border-collapse: collapse; font-size: 14px; } .well-odds td { padding: 2px 12px 2px 0; } .well-odds td:last-child { font-variant-numeric: tabular-nums; text-align: right; }
.well-hist { max-height: 260px; overflow: auto; padding-left: 22px; } .well-hist small { color: var(--muted); }
@media (max-width: 620px) { .well-ban { grid-template-columns: 1fr; } }
`;
const st = document.createElement("style"); st.textContent = css; (document.body || document.head).appendChild(st);

/* ---------- Achievements ---------- */
EV.ACH.push(["well1", 15, (p) => (p.c.wellPulls || 0) >= 1], ["legend1", 100, (p) => (p.cards || []).some((c) => c.g >= LEG)]);
for (const lg of ["es", "en"]) for (const id of ["well1", "legend1"]) EV.STR[lg].ach[id] = TX[lg]["ach." + id];

EV.WELL = { html, click, pullOne, pullFree, freeLeft, rollGrade, legChance, tab: () => tx("tab"), title: () => tx("title"), ODDS, BANNERS };
})(typeof window !== "undefined" ? window : globalThis);
