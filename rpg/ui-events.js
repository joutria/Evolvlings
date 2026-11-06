/* Evolvlings RPG: events on the path, ending the trip and click wiring.
   Part of the old rpg.js, now split. Classic scripts: top-level names are shared between the rpg/*.js files,
   which load in order (see index.html). */
"use strict";

/* ---------- Events on the path ---------- */
/* Lore events (lore.js): told once each, gated by how far the story has gone; Writings are collectable texts */
const LORE = window.EvoLore || null;
const loreEv = (k) => (LORE && LORE.LORE_EVENTS[k]) || null;
function rollEvent() {
  const P = EV.P, seen = P.loreSeen || {};
  const lore = LORE ? Object.keys(LORE.LORE_EVENTS).filter((k) => { const e = LORE.LORE_EVENTS[k]; return e.zone === X.zone && !seen[k] && LORE.needOk(e.need, P); }) : [];
  if (lore.length && rnd() < 0.45) return lore[Math.floor(rnd() * lore.length)];
  return drawDeck(X.zone);
}
function giveEscrito(id) {
  const P = EV.P; P.escritos = P.escritos || {};
  if (!LORE || P.escritos[id] || !LORE.LORE_ESCRITOS.some((w) => w.id === id)) return false;
  P.escritos[id] = Date.now(); P.c.escritos = (P.c.escritos || 0) + 1;
  const w = LORE.LORE_ESCRITOS.find((x) => x.id === id);
  EV.toast(tx("esc.got", { t: w[L()].title }), "📜");
  return true;
}
// a Writing that can turn up in this zone from a chest or a guardian
function escritoFor(from, zone) {
  if (!LORE) return null;
  const P = EV.P, have = P.escritos || {}, lay = LORE.loreLayer(P.cleared);
  const ok = LORE.LORE_ESCRITOS.filter((w) => w.from === from && w.zone === zone && !have[w.id] && w.layer <= lay && (!w.unlock || (P.flags || {})[w.unlock.flag]));
  return ok.length ? ok[0].id : null;
}
// Writings that come from a story flag alone (for example, the two lullabies once Unísona joins)
function escritosByFlag() {
  if (!LORE) return;
  const F = EV.P.flags || {};
  for (const w of LORE.LORE_ESCRITOS) if (w.from === "event" && w.unlock && F[w.unlock.flag]) {
    const fromFx = Object.values(LORE.LORE_EVENTS).some((e) => e.fx.some((f) => f.escrito === w.id));
    if (!fromFx) giveEscrito(w.id);
  }
}
// Writings with no other way into the game (no encounter, flag or shop sells them): the Deep Root chests hand them out
const SHOP_ESC = () => (EV.SEASON ? EV.SEASON.SHOP.filter((x) => x.id.startsWith("esc:")).map((x) => x.id.slice(4)) : []);
function isOrphan(w) {
  if (w.from === "shop") return !SHOP_ESC().includes(w.id);
  if (w.from !== "event" || w.unlock) return false;
  return !Object.values(LORE.LORE_EVENTS).some((e) => e.fx.some((f) => f.escrito === w.id));
}
// one writing for a Deep Root chest: an orphan first, then any chest writing you could already have found
function deepEscrito() {
  if (!LORE) return null;
  const P = EV.P, have = P.escritos || {}, lay = LORE.loreLayer(P.cleared);
  const fit = (w) => !have[w.id] && w.layer <= lay && (!w.unlock || (P.flags || {})[w.unlock.flag]);
  const o = LORE.LORE_ESCRITOS.filter((w) => fit(w) && isOrphan(w));
  const c = o.length ? o : LORE.LORE_ESCRITOS.filter((w) => fit(w) && w.from === "chest");
  return c.length ? c[0].id : null;
}
// threads: two writings that, read together, add a line to the Grimoire
function hilosHtml(have) {
  const H = (LORE.LORE_HILOS || []).filter((h) => have[h.a] && have[h.b]);
  if (!H.length) return "";
  return `<h3 class="cat-title">${esc(tx("esc.hilos"))}</h3><ul class="hilos">${H.map((h) => `<li>${esc(h[L()] || h.es)}</li>`).join("")}</ul>`;
}
function escritosHtml() {
  if (!LORE) return "";
  const have = EV.P.escritos || {}, all = LORE.LORE_ESCRITOS, n = all.filter((w) => have[w.id]).length;
  return `<h3 class="cat-title">${esc(tx("esc.title"))}</h3><p class="muted" style="margin:0">${esc(tx("esc.desc"))} ${esc(tx("grim.count", { n, m: all.length }))}</p><div class="escritos">${all.map((w) => {
    if (!have[w.id]) return `<div class="esc locked"><b>???</b><small class="muted">${esc(isOrphan(w) ? tx("esc.from.deep") : tx("esc.from." + w.from, { z: w.zone ? zt("name", null, w.zone) : "" }))}</small></div>`;
    const t = w[L()] || w.es;
    return `<details class="esc"><summary><b>${esc(t.title)}</b></summary><p>${esc(t.text)}</p></details>`;
  }).join("")}</div>${hilosHtml(have)}`;
}
const EVT = { es: RPG_ES.EVT, en: RPG_EN.EVT };
const EVT_ALT = { es: RPG_ES.EVT_ALT, en: RPG_EN.EVT_ALT };
// lore events share the encounter view
if (LORE) for (const lg of ["es", "en"]) Object.assign(EVT[lg], LORE.LORE_EVT[lg]);
function eventHtml() {
  if (X.talk && X.talk.id === X.event) return talkHtml();
  const E = EVT[L()][X.event];
  if (X.eventOut == null) {
    const ch = X.event === "orilla" && hasLetter() ? E.cL : E.c, fx = fxOf(X.event);
    const le = loreEv(X.event);
    return `<div class="panel"><div class="sub">${esc(tx("node.event"))}</div><p class="evt-text">${esc(E.t)}</p><div class="choices">${ch.map((c, i) => {
      if (le && le.cNeed && le.cNeed[i] && !(EV.P.flags || {})[le.cNeed[i]]) return "";
      const poor = ((fx[i] || {}).cost || 0) > EV.P.coins;
      return `<button class="btn ghost" type="button" data-ev="${i}" ${poor ? "disabled" : ""}>${esc(c)}</button>`;
    }).join("")}</div></div><div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}</div>`;
  }
  return `<div class="panel"><div class="sub">${esc(tx("node.event"))}</div><p class="evt-text">${esc(X.eventOut)}</p><div class="bctl"><button class="btn" type="button" data-x="${X.eventFight ? "evfight" : "evnext"}">${esc(tx("r.continue"))}</button></div></div><div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}${lootHtml()}</div>`;
}
const hasLetter = () => !!(EV.P.flags && EV.P.flags.olaLetter && !EV.P.flags.olaDelivered);
const hurtParty = (f) => { for (const m of X.party) if (m.hp > 0) m.hp = Math.max(0.05, m.hp - f); };
const healParty = (f) => { for (const m of X.party) if (m.hp > 0) m.hp = Math.min(1, m.hp + f); };
// the effects of each choice are data: rpg/data-events.js for path events, lore.js for lore events
const fxOf = (ev) => { const le = loreEv(ev); return le ? le.fx : EVENT_FX[ev] || []; };
const flagsOk = (c) => { const F = EV.P.flags || {}; return (!c.flag || !!F[c.flag]) && (!c.not || !F[c.not]); };
// applies one choice's effects; returns the outcome text, or null when it can't be paid
function runFx(f, E, out) {
  if (f.if) return runFx(flagsOk(f.if) ? f.then || {} : f.else || {}, E, out);
  if (f.roll) return runFx(rnd() < 0.5 ? f.roll[0] : f.roll[1], E, out);
  const P = EV.P;
  if (f.cost && !EV.spendCoins(f.cost)) return null;
  if (f.xp) X.loot.xp += f.xp;
  if (f.xpPerZone) X.loot.xp += f.xpPerZone * Object.keys(P.cleared || {}).filter((z) => P.cleared[z] > 0).length;
  if (f.coins) X.loot.coins += f.coins;
  if (f.heal) healParty(f.heal);
  if (f.hurt) hurtParty(f.hurt);
  if (f.foeBuff) X.nextFoeBuff = f.foeBuff;
  if (f.card) X.eventCard = true;
  if (f.fight) X.eventFight = true;
  if (f.flag) { P.flags = P.flags || {}; for (const k of [].concat(f.flag)) P.flags[k] = 1; }
  if (f.escrito) giveEscrito(f.escrito);
  if (f.say) out = EVT_ALT[L()][f.say[0]][f.say[1]];
  if (f.sayE) out = Array.isArray(f.sayE) ? E[f.sayE[0]][f.sayE[1]] : E[f.sayE];
  return out;
}
function chooseEvent(i) {
  const E = EVT[L()][X.event], le = loreEv(X.event);
  X.eventFight = false; X.eventCard = null;
  const out = runFx(fxOf(X.event)[i] || {}, E, E.o[i]);
  if (out == null) return;
  if (le) { (EV.P.loreSeen = EV.P.loreSeen || {})[X.event] = 1; EV.save(); }
  X.eventOut = out;
  EV.sfx("tap");
  render();
}

/* ---------- Ending the trip ---------- */
function finish(res) {
  const S = EV.S, P = EV.P;
  const R = rpgState();
  const l = X.loot;
  const xp = res === "win" ? l.xp : Math.floor(l.xp / 2);
  const coins = res === "win" ? l.coins : Math.floor(l.coins / 2);
  const before = R ? R.lvl : 1;
  const unlocked = [];
  if (R) {
    R.xp += xp;
    while (R.xp >= xpNeed(R.lvl)) { R.xp -= xpNeed(R.lvl); R.lvl++; for (const k of ["p", "s"]) if (SLOT_LVL[k] === R.lvl) unlocked.push(k); }
  }
  if (coins > 0) EV.addCoins(coins, true);
  X.keyGot = null;
  if (res === "win" && !X.deep && !X.echo && !((P.cleared || {})[X.zone])) for (const k in KEYS) if (KEYS[k].from === X.zone && !(P.keys || {})[k]) { P.keys = P.keys || {}; P.keys[k] = 1; X.keyGot = k; }
  if (res === "win" && !X.deep) { P.c.guard = (P.c.guard || 0) + 1; P.cleared = P.cleared || {}; if (!X.echo) P.cleared[X.zone] = (P.cleared[X.zone] || 0) + 1; }
  X.deepRew = X.deep && res === "win" ? deepWin(X.deep, X.stars || 1) : null;
  // the Guardian's Echo: Stardust and Chispas instead of zone stars
  X.echoRew = null;
  if (X.echo && res === "win") {
    const d = 20 + 10 * (X.stars || 1), c = 60;
    P.dust = (P.dust || 0) + d; EV.addCoins(c, true); P.c.echoWins = (P.c.echoWins || 0) + 1; P.echo.wins++;
    X.echoRew = { d, c };
  }
  X.unisona = null;
  if (res === "win" && X.zone === "heart" && !X.echo && !X.savia && !X.deep) {
    const F = P.flags = P.flags || {};
    if (!F.unisona) { F.unisona = 1; for (const id of MONS.unisona.cards) { giveCard(id, 0); l.cards.push({ id, g: 0 }); } X.unisona = "first"; }
    else { const id = MONS.unisona.cards[Math.floor(rnd() * 3)]; giveCard(id, 0); l.cards.push({ id, g: 0 }); X.unisona = "again"; }
  }
  if (res === "win" || res === "lose") P.c.expDone = (P.c.expDone || 0) + 1;
  // zone stars: keep the best, 3 Song Notes the first time a zone reaches 3
  X.starInfo = null;
  if (res === "win" && X.stars && !X.echo && !X.deep) {
    // Savia Mode keeps its own stars
    const SK = X.savia ? "starsS" : "stars", S3 = X.savia ? "star3S" : "star3";
    P[SK] = P[SK] || {}; P[S3] = P[S3] || {};
    const before = P[SK][X.zone] || 0;
    const gained = Math.max(0, X.stars - before);
    if (gained) { P[SK][X.zone] = X.stars; P.c.starsGot = (P.c.starsGot || 0) + gained; }
    let bonus = false;
    if (X.stars === 3 && !P[S3][X.zone]) { P[S3][X.zone] = 1; P.notes = (P.notes || 0) + 3; bonus = true; }
    X.starInfo = { n: X.stars, best: gained > 0, bonus };
  }
  if (S && S.phase === "alive") {
    S.stats.fun = Math.min(100, S.stats.fun + 10); S.stats.full = Math.max(0, S.stats.full - 15); S.stats.clean = Math.max(0, S.stats.clean - 20);
    // wounds: the more health the creature lost on the trip, the more energy and health it loses at home
    const w = woundsOf();
    const dEnergy = Math.round(30 * w), dHealth = Math.round(35 * w) + 5 * (X.ownFalls || 0);
    S.stats.energy = Math.max(0, S.stats.energy - dEnergy);
    S.stats.health = Math.max(10, S.stats.health - dHealth); // never so low that it wanders off
    X.hurt = { energy: dEnergy, health: dHealth };
    EV.addLog(tx(res === "win" ? "log.expWin" : "log.expLose", { name: S.name, from: zt("from") }));
  }
  // a card for every two levels gained
  let lvlPick = null;
  if (R) for (let lv = before + 1; lv <= R.lvl; lv++) if (lv % 2 === 0) { lvlPick = offerCards(3, 0); break; }
  const bondNews = EV.EGGS ? EV.EGGS.afterTrip(res, xp, X.party, R ? R.lvl : 1) : [];
  escritosByFlag();
  X.end = { res, xp, coins, before, after: R ? R.lvl : 1, unlocked, lvlPick, cards: l.cards.slice(), bondNews };
  EV.save(); EV.checkAch();
  show("end");
}
const starStr = (n) => "★".repeat(n) + "☆".repeat(3 - n);
function woundsOf() {
  const own = X && X.party && X.party.find((m) => m.own);
  return own ? Math.max(0, Math.min(1, 1 - own.hp)) : 0;
}
function endHtml() {
  if (X.end.duel) return duelEndHtml();
  const e = X.end, S = EV.S;
  const nm = S && S.name ? S.name : "";
  const title = e.res === "win" ? (X.deep ? tx("deep.win", { n: X.deep }) : zt("win")) : e.res === "quit" ? tx("end.quit") : tx("end.lose");
  const text = e.res === "win" ? (X.deep ? tx("deep.winText") : zt("winText", { name: nm })) : X.deep ? tx("deep.lose", { n: X.deep }) : tx("end.loseText", { name: nm });
  let html = `<h3>${esc(title)}</h3><p class="evt-text">${esc(text)}</p>
    <div class="loot"><span>${esc(tx("r.xp", { n: e.xp }))}</span><span>✦ ${esc(tx("r.coins", { n: e.coins }))}</span><span>🃏 ${e.cards.length}</span></div>`;
  if (X.hurt && (X.hurt.energy || X.hurt.health)) html += `<p class="evt-out">${esc(tx("end.hurt", { name: nm, e: X.hurt.energy, h: X.hurt.health }))}</p>`;
  else html += `<p class="evt-out">${esc(tx("end.unhurt", { name: nm }))}</p>`;
  if (e.res === "win" && !X.deep) html += `<p class="evt-out">✦ ${esc(tx("end.verse", { v: zt("verse") }))}</p>`;
  if (X.deepRew) {
    const r = X.deepRew;
    html += `<p class="evt-out end-stars"><b>${esc(tx("end.stars", { s: starStr(r.stars) }))}</b> · ${esc(tx("deep.stars", { n: deepTotal() }))}</p>`;
    if (r.first) html += `<p class="evt-out">✦ ${esc(tx("deep.first", r.first))}</p>`;
    for (const c of r.chests) html += `<p class="evt-out">🎁 ${esc(tx("deep.chest", { n: c.need, what: c.what }))}${c.esct ? "<br>📜 " + esc(tx("deep.esc", { t: c.esct })) : ""}</p>`;
  }
  if (X.unisona) html += `<p class="evt-out">✦ ${esc(tx(X.unisona === "first" ? "end.unisona" : "end.unisonaUp"))}</p>`;
  if (X.keyGot) html += `<p class="evt-out key-got"><canvas class="key-ic" width="16" height="16" data-key="${X.keyGot}" aria-hidden="true"></canvas> <b>${esc(tx("key." + X.keyGot))}</b> · ${esc(tx("key.got." + X.keyGot, { to: zt("to", null, KEYS[X.keyGot].opens) }))}</p>`;
  if (X.echoRew) html += `<p class="evt-out">∴ ${esc(tx("end.echo", X.echoRew))}</p>`;
  else if (X.echo && EV.P.echo) html += `<p class="evt-out">${esc(tx("end.echoLose", { n: Math.max(0, ECHO_TRIES - EV.P.echo.tries) }))}</p>`;
  if (X.starInfo) html += `<p class="evt-out end-stars"><b>${esc(tx("end.stars", { s: starStr(X.starInfo.n) }))}</b>${X.starInfo.best ? " · " + esc(tx("end.starsNew")) : ""}${X.starInfo.bonus ? "<br>♪ " + esc(tx("end.star3")) : ""}<br><small>${esc(tx("end.starsWhy"))}</small></p>`;
  if (e.after > e.before) html += `<p class="evt-out">${esc(tx("end.lvl", { name: nm, n: e.after }))}</p>`;
  for (const k of e.unlocked) html += `<p class="evt-out">${esc(tx("end.slot", { slot: tx("slot." + k) }))}</p>`;
  for (const line of e.bondNews || []) html += `<p class="evt-out">♥ ${esc(line)}</p>`;
  if (e.cards.length) html += `<div class="bminis">${e.cards.map((c) => miniCardHtml(c)).join("")}</div>`;
  if (e.lvlPick) {
    html += `<h3>${esc(tx("end.lvlPick"))}</h3><div class="bminis">${e.lvlPick.map((o, i) => miniCardHtml(o, `<button class="btn" type="button" data-lvlpick="${i}">${esc(tx("r.pick"))}</button>`)).join("")}</div>`;
  } else html += `<div class="bctl"><button class="btn" type="button" data-x="home">${esc(tx("end.home"))}</button></div>`;
  return sceneCard(html);
}
function goHome() {
  if (battle) { cancelAnimationFrame(battle.raf); battle = null; }
  X = null; view = null;
  EV.showScreen(); EV.renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Event wiring ---------- */
function onExpClick(e) {
  if (e.target.id === "pmap") { pmapTap(e); return; }
  const t = e.target.closest("button"); if (!t || !X) return;
  const d = t.dataset;
  if (duelClick(t)) return;
  if (d.zone) { EV.sfx("tap"); pickZone(d.zone, { savia: !!d.savia }); return; }
  if (d.deep) { const f = +d.deep; if (!deepOpen() || !deepFloorOpen(f)) { EV.sfx("deny"); return; } EV.sfx("tap"); pickZone(deepZone(f), { deep: f }); return; }
  if (d.echo) { const e = echoInfo(); if (!e || !e.lvlOk || e.left <= 0) { EV.sfx("deny"); return; } EV.sfx("tap"); pickZone(e.zone, { echo: e.rule }); return; }
  if (d.pick) {
    const k = d.pick, i = X.chosen.indexOf(k);
    if (i >= 0) X.chosen.splice(i, 1); else { if (X.chosen.length >= 2) X.chosen.shift(); X.chosen.push(k); }
    { const T = teamState(); T.comp = X.chosen.filter((c) => rosterOf(c)); }
    EV.sfx("tap"); render(); return;
  }
  if (d.node) {
    EV.sfx("tap");
    const n = d.node;
    if (n === "fight") startBattle(false);
    else if (n === "boss") startBattle(true);
    else if (n === "rest") { healParty(0.35); for (const m of X.party) if (m.hp <= 0) m.hp = 0.2; EV.sfx("heal"); X.reward = { title: tx("node.rest"), text: tx("node.rest.d"), after: "next" }; show("reward"); }
    else if (n === "chest") { const w = rnd() < 0.35 ? escritoFor("chest", X.zone) : null; if (w) giveEscrito(w); X.reward = { title: tx("node.chest"), offer: offerCards(3, 0), after: "next" }; show("reward"); }
    else if (n === "event") { X.event = rollEvent(); X.eventOut = null; X.talk = null; if (talkEv(X.event)) talkStart(X.event); show("event"); }
    return;
  }
  if (d.tk != null) { talkPick(+d.tk); return; }
  if (d.ev != null) { EV.P.c.evChoices = (EV.P.c.evChoices || 0) + 1; chooseEvent(+d.ev); return; }
  if (d.take != null) {
    const i = +d.take, r = X.reward;
    if (i >= 0 && r && r.offer) { const o = r.offer[i]; giveCard(o.id, o.g); X.loot.cards.push(o); EV.toast(tx("r.card", { card: cardName(o.id) }), GRADES[o.g][L()]); EV.sfx("card"); EV.save(); EV.checkAch(); }
    afterReward(); return;
  }
  if (d.bview) { const [id, g] = d.bview.split(":"); EV.sfx("tap"); openCardView(id, cardHtml(id, +g)); return; }
  if (d.ztab) { ztab = d.ztab; EV.sfx("tap"); render(); return; }
  if (d.lvlpick != null) { const o = X.end.lvlPick[+d.lvlpick]; giveCard(o.id, o.g); X.end.cards.push(o); X.end.lvlPick = null; EV.toast(tx("r.card", { card: cardName(o.id) }), GRADES[o.g][L()]); EV.sfx("card"); EV.save(); EV.checkAch(); render(); return; }
  if (d.b) { if (d.b === "fire") fireAim(); else if (d.b === "cancel") cancelAim(); return; }
  if (d.bc) { if (battle) pickCard(d.bc); return; }
  if (d.am) { EV.P.rpgAim = d.am; EV.saveProfile(); renderTurn(); return; }
  if (d.m) { EV.P.rpgMode = d.m; EV.saveProfile(); t.parentNode.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === t))); if (battle) { if (d.m === "auto") battle.aim = null; renderTurn(); } return; }
  if (d.s) { EV.P.rpgSpeed = +d.s; EV.saveProfile(); t.parentNode.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === t))); return; }
  switch (d.x) {
    case "go": EV.sfx("tap"); setOut(); break;
    case "cancel": X = null; goHome(); break;
    case "quit": finish("quit"); break;
    case "continue": afterReward(); break;
    case "evnext":
      X.talk = null;
      if (X.eventCard) { X.eventCard = null; X.reward = { title: tx("node.chest"), offer: offerCards(3, 0), after: "next" }; show("reward"); }
      else nextSection();
      break;
    case "evfight": X.talk = null; X.eventFight = false; startBattle(false); break;
    case "home": goHome(); break;
  }
}
