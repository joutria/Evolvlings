/* Evolvlings RPG: hooks into the main game and the EV.RPG export.
   Part of the old rpg.js, now split. Classic scripts: top-level names are shared between the rpg/*.js files,
   which load in order (see index.html). */
"use strict";

/* ====================================================================== */
/* Hooks into the main game                                               */
/* ====================================================================== */
function refreshHome() {
  const S = EV.S, btn = $("aExp"), chip = $("btnCards");
  const alive = S && S.phase === "alive";
  chip.hidden = !(alive && S.stage >= 1) && !(EV.P.cards && EV.P.cards.length);
  if ($("btnTeams")) $("btnTeams").hidden = !(alive && S.stage >= 1);
  homeSheet(alive);
  if (!alive) { btn.hidden = true; return; }
  btn.hidden = false;
  const why = expCheck();
  btn.textContent = tx("act.exp") + (why ? "" : " · " + tx("exp.cost"));
  btn.disabled = !!why;
  btn.title = why ? tx("exp.need." + why) : "";
  let w = $("aExpWhy");
  if (!w) { w = document.createElement("p"); w.id = "aExpWhy"; w.className = "exp-why"; btn.after(w); }
  w.textContent = why ? tx("exp.need." + why) : "";
  let r = $("aRecharge");
  if (!r) { r = document.createElement("button"); r.id = "aRecharge"; r.type = "button"; r.className = "btn ghost exp-go"; w.after(r); r.addEventListener("click", recharge); }
  r.textContent = tx("recharge", { n: RECHARGE.amount, c: RECHARGE.price });
  r.hidden = S.stats.energy >= 70;
  r.disabled = EV.P.coins < RECHARGE.price;
}
function homeSheet(alive) {
  // folded at the top of the side column, so the home fits on one screen
  let pn = $("sheetPanel");
  if (!pn) {
    const side = document.querySelector("#scrGame .side"); if (!side) return;
    pn = document.createElement("details"); pn.id = "sheetPanel"; pn.className = "panel fold";
    pn.innerHTML = `<summary><h3></h3></summary><div class="fold-body"></div>`; side.prepend(pn);
  }
  const S = EV.S, R = rpgState();
  if (!alive || !S || S.stage < 1 || !R) { pn.hidden = true; return; }
  pn.hidden = false;
  pn.querySelector("h3").textContent = tx("sh.title") + " · " + tx("sh.lvl", { n: R.lvl });
  const html = `<p class="muted" style="margin:0 0 6px;font-size:13px">${esc(tx("sh.sub", { n: R.lvl }))}</p>${ownSheetHtml()}`;
  const body = pn.querySelector(".fold-body");
  if (body.innerHTML !== html) body.innerHTML = html;
}
// pay Chispas for an energy boost (energy otherwise only refills slowly while sleeping)
const RECHARGE = { amount: 40, price: 12 };
function recharge() {
  const S = EV.S; if (!S || S.phase !== "alive") return;
  if (S.stats.energy >= 90) { EV.toast(tx("recharge.full")); return; }
  if (!EV.spendCoins(RECHARGE.price)) { EV.toast(EV.t("toast.poor")); EV.sfx("deny"); return; }
  S.stats.energy = Math.min(100, S.stats.energy + RECHARGE.amount);
  if (EV.WORLD) EV.WORLD.gainFromEnergy(RECHARGE.amount);
  EV.sfx("heal"); EV.buzz(20); EV.toast(tx("recharge.done"), "+" + RECHARGE.amount);
  EV.save(); EV.renderStats(); refreshHome();
}
EV.HOOKS.showScreen = function () {
  const S = EV.S;
  const inExp = !!X && S && S.phase === "alive";
  if (X && (!S || S.phase !== "alive")) { if (battle) { cancelAnimationFrame(battle.raf); battle = null; } X = null; }
  $("scrExp").hidden = !inExp;
  if (inExp) { $("scrGame").hidden = true; render(); }
  refreshHome();
  if (!$("cardsPanel").hidden) renderCards();
};
EV.HOOKS.renderCards = renderCards;
$("aExp").addEventListener("click", () => { EV.sfx("tap"); startExpedition(); EV.showScreen(); });
$("btnCards").addEventListener("click", () => { EV.sfx("tap"); EV.togglePanel("cards"); });
$("scrExp").addEventListener("click", onExpClick);
$("scrExp").addEventListener("click", (e) => {
  const t = e.target.closest("button"); if (!t || !X || view !== "pick") return;
  if (t.dataset.chg) { EV.sfx("tap"); const [w, sl] = t.dataset.chg.split(":"); openPick(w, sl); }
  if (t.dataset.xset) { loadSet(+t.dataset.xset, X.offer); render(); }
});
$("teamsPanel").addEventListener("click", onTeamsClick);
$("teamsPanel").addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.dataset.tname) { const b = $("teamsPanel").querySelector('button[data-tset^="ok:"]'); if (b) b.click(); } });
$("btnTeams").addEventListener("click", () => { EV.sfx("tap"); EV.togglePanel("teams"); });
EV.HOOKS.renderTeams = renderTeams;
$("cardsPanel").addEventListener("click", onCardsClick);
EV.every(1000, refreshHome);
rpgState(); EV.showScreen();
// a random card your creature can use, at least minGrade (for chests and rewards outside expeditions)
function pickUsable(n, minGrade) {
  const pool = DROP_POOL.filter((id) => usable(id));
  const ids = [];
  while (ids.length < Math.min(n, pool.length)) { const id = pool[Math.floor(Math.random() * pool.length)]; if (!ids.includes(id)) ids.push(id); }
  return ids.map((id) => ({ id, g: Math.max(minGrade, rollGrade(minGrade)) }));
}
function takeCard(id, g) { rpgState(); const c = giveCard(id, g); EV.save(); return c; }
EV.RPG = Object.defineProperties(Object.assign(api, { renderCards, startExpedition, finish, cardHtml, cardName, pickUsable, takeCard, starStr, paintMon, monName, typeChip, rpgState, MON_DESC, deepState, deepTotal, deepZone, deepOpen, deepNo, deepRule, deepWin, DEEP_CHESTS }), { X: { get: () => X }, battle: { get: () => battle },
  // read-only view of the data tables for tools/check.js
  DATA: { get: () => ({ CT, EVT, ZT, PMAP, TX, CIRCLE, ZONES, MONS, CARDS, EVENTS, TYPES, DROP_POOL }) } });
