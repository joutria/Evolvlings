/* Evolvlings RPG: battle presentation and drawing.
   Part of the old rpg.js, now split. Classic scripts: top-level names are shared between the rpg/*.js files,
   which load in order (see index.html). */
"use strict";

/* ---------- Battle presentation ---------- */
const BW = 360, BH = 240;
const POS = { ally: [[96, 92], [56, 148], [116, 196]], foe: [[264, 92], [304, 148], [244, 196]] };
function startBattle(boss) {
  const allies = partyUnits().filter((u) => u.hp > 0);
  const foes = foeUnits(boss);
  X.nextFoeBuff = 0;
  const b = new Battle(allies, foes, { zone: ZONES[X.zone], day: isDayNow() });
  const all = b.units;
  const anim = {};
  ["ally", "foe"].forEach((side) => all.filter((u) => u.side === side).forEach((u, i) => { anim[u.uid] = { x: POS[side][i][0], y: POS[side][i][1], lunge: 0, flash: 0, shownHp: u.hp }; }));
  battle = { b, boss, anim, floats: [], log: [], waiting: null, done: false, cv: null, c: null, raf: 0 };
  show("battle");
  runBattle();
}
function battleMount() {
  const cv = $("bCanvas"); if (!cv || !battle) return;
  battle.cv = cv; battle.c = EV.setupCanvas(cv, BW, BH);
  cv.style.aspectRatio = BW + " / " + BH;
  if (!battle.raf) battle.raf = requestAnimationFrame(drawBattle);
  renderBLog(); renderTurn();
}
const speed = () => EV.P.rpgSpeed || 1;
const wait = (ms) => new Promise((r) => setTimeout(r, ms / speed()));
function uName(uid) { const u = battle.b.units.find((x) => x.uid === uid); return u ? u.name : ""; }
function blog(s) { battle.log.unshift(s); battle.log = battle.log.slice(0, 5); renderBLog(); }
function renderBLog() { const el = $("bLog"); if (el && battle) el.innerHTML = battle.log.map((s) => `<li>${esc(s)}</li>`).join(""); const r = $("bRound"); if (r && battle) r.textContent = tx("b.round", { n: Math.max(1, battle.b.round) }); }
function flushEvents() {
  const b = battle.b, ev = b.events.splice(0);
  let hitSfx = null;
  for (const e of ev) {
    const a = e.u && battle.anim[e.u];
    // who the card being cast lands on
    if (battle.cast && e.k !== "act" && e.u && ["dmg", "heal", "st", "shield", "miss", "cleanse"].includes(e.k) && !battle.cast.tg.includes(e.u)) battle.cast.tg.push(e.u);
    switch (e.k) {
      case "act": { const u = b.units.find((x) => x.uid === e.u); if (a) a.lunge = 1;
        battle.cast = e.card && HAS_EVS && EVS.CARD[e.card] && !REDUCE ? { id: e.card, uid: e.u, t0: performance.now(), dur: (EVS.DUR[EVS.anim(e.card).style] || 1) * 1000, tg: [] } : null; if (e.card) { blog(tx("log.act", { name: u.name, card: cardName(e.card) })); EV.sfx("card"); } else blog(tx("log.basic", { name: u.name })); break; }
      case "support": if (b.units.some((x) => x.uid === e.u && x.side === "ally")) EV.P.c.supportUsed = (EV.P.c.supportUsed || 0) + 1; blog(tx("log.support", { name: uName(e.u), card: cardName(e.card) })); if (a) battle.floats.push({ x: a.x, y: a.y - 44, text: "★ " + cardName(e.card), col: "#ffe27a", life: 1.4, small: true }); break;
      case "dmg":
        if ((e.eff === "up" || e.eff === "opp") && e.by && b.units.some((x) => x.uid === e.by && x.side === "ally")) EV.P.c.advHits = (EV.P.c.advHits || 0) + 1;
        if (a) {
          a.flash = 1;
          // normal cream; ×1.5 gold and bigger; ×1.25 pink with an "Opposite" tag; ×0.75 grey and smaller; damage over time falls in its cause's colour
          const col = e.dot ? (e.dot === "burn" ? TCOL.fire : "#d2cbd9") : e.eff === "up" ? "#ffd57a" : e.eff === "opp" ? "#f4a6c4" : e.eff === "down" ? "#9d93ad" : "#fbf6ef";
          battle.floats.push({ x: a.x + (Math.random() * 16 - 8), y: a.y - (e.dot ? 20 : 34), vy: e.dot ? -0.3 : 0.45, text: (e.crit ? "¡" : "") + e.n + (e.crit ? "!" : ""), col, life: 1.1, big: e.crit || e.eff === "up", small: e.eff === "down" });
          if (e.eff === "opp") battle.floats.push({ x: a.x, y: a.y - 20, text: tx("b.opp"), col: "#fbf6ef", stroke: "#4a3d5e", life: 1.1, small: true });
        }
        if (e.dot) blog(tx("log." + e.dot, { name: uName(e.u), n: e.n }));
        else blog(tx("log.dmg", { name: uName(e.u), n: e.n, crit: e.crit ? tx("log.crit") : "", eff: e.eff ? tx("log." + e.eff) : "" }));
        hitSfx = e.crit ? "crit" : hitSfx || "hit"; break;
      case "miss": if (a) battle.floats.push({ x: a.x, y: a.y - 34, text: e.blind ? "✴" : "~", col: "#cfe8ff", life: 1 }); blog(e.blind ? tx("log.blindMiss", { name: uName(e.by) }) : tx("log.miss", { name: uName(e.u) })); hitSfx = hitSfx || "miss"; break;
      case "heal": if (a) battle.floats.push({ x: a.x, y: a.y - 34, vy: 0.3, text: "+" + e.n, col: "#86b85a", life: 1.1 }); blog(tx("log.heal", { name: uName(e.u), n: e.n })); break;
      case "st": if (a) battle.floats.push(STATUS[e.st].neg ? { x: a.x, y: a.y + (a.boss ? 66 : 58), vy: -0.25, text: STATUS[e.st].icon + " " + STATUS[e.st][L()], col: "#9d93ad", life: 1.3, small: true } : { x: a.x, y: a.y - 48, text: STATUS[e.st].icon + " " + STATUS[e.st][L()], col: "#1d1626", stroke: "#fbf6ef", life: 1.3, small: true }); blog(tx("log.st", { name: uName(e.u), st: STATUS[e.st][L()] })); break;
      case "shield": blog(tx("log.shield", { name: uName(e.u), n: e.n })); break;
      case "break": blog(tx("log.break")); break;
      case "cleanse": blog(tx("log.cleanse", { name: uName(e.u), st: e.st.map((s) => STATUS[s][L()]).join(", ") })); break;
      case "resist": blog(tx("log.resist", { name: uName(e.u) })); break;
      case "save": blog(tx("log.save")); break;
      case "ko": blog(tx("log.ko", { name: uName(e.u) })); EV.sfx("ko"); EV.buzz(40); break;
      case "skip": blog(tx("log.skip." + e.why, { name: uName(e.u) })); break;
      case "round": renderBLog(); break;
      case "strip": blog(tx("log.strip", { name: uName(e.u), st: STATUS[e.st][L()] })); break;
      case "cdup": blog(tx("log.cdup", { name: uName(e.u), n: e.n })); break;
      case "lost": blog(tx("log.lost", { name: uName(e.u) })); break;
      case "echo": blog(tx("log.echo", { name: uName(e.u) })); if (a) battle.floats.push({ x: a.x, y: a.y - 50, text: "≋", col: "#d8c8a8", life: 1 }); break;
      case "revive": blog(tx("log.revive", { name: uName(e.u), n: e.n })); if (a) battle.floats.push({ x: a.x, y: a.y - 40, text: "↑ " + e.n, col: "#8fe08a", life: 1.3 }); EV.sfx("heal"); break;
    }
  }
  if (hitSfx) { EV.sfx(hitSfx); if (hitSfx === "crit") EV.buzz(25); }
}
function askPlayer(u) {
  return new Promise((resolve) => { battle.waiting = { u, resolve }; renderTurn(); });
}
function renderTurn() {
  const el = $("bTurn"); if (!el || !battle) return;
  const w = battle.waiting;
  if (!w) { el.innerHTML = ""; return; }
  const u = w.u, a = u.cards.a;
  const can = battle.b.canPlay(u);
  el.innerHTML = `<p class="bturn">${esc(tx("b.yourTurn", { name: u.name }))}</p><div class="bctl">
    <button class="btn" type="button" data-b="card" ${can ? "" : "disabled"}>${a ? esc(tx("b.play", { card: cardName(a.id) })) + (can ? "" : " · " + esc(tx("b.cd", { n: u.cd }))) : esc(tx("b.noCard"))}</button>
    <button class="btn ghost" type="button" data-b="basic">${esc(tx("b.basic"))}</button></div>`;
}
async function runBattle() {
  const bt = battle, b = bt.b;
  await wait(400);
  b.start(); flushEvents(); await wait(500);
  while (!b.checkOver() && b.round < 40) {
    const order = b.roundStart(); flushEvents();
    for (const u of order) {
      if (bt !== battle) return;
      if (b.over) break;
      if (!b.turnStart(u)) { flushEvents(); b.checkOver(); await wait(450); continue; }
      flushEvents();
      let use;
      if (u.side === "ally" && EV.P.rpgMode === "manual") use = await askPlayer(u);
      else use = b.wantPlay(u);
      if (bt !== battle) return;
      b.act(u, use); flushEvents();
      await wait(use ? 900 : 700);
    }
  }
  const res = b.over || "lose";
  bt.done = true;
  blog(res === "win" ? tx("b.win") : tx("b.lose"));
  if (res === "win") EV.sfx("win");
  await wait(1100);
  if (bt !== battle) return;
  cancelAnimationFrame(bt.raf); bt.raf = 0;
  endBattle(res);
}
function endBattle(res) {
  const b = battle.b, boss = battle.boss;
  // carry health back to the party
  const allies = b.units.filter((u) => u.side === "ally");
  let i = 0;
  for (const m of X.party) {
    if (m.hp <= 0) continue;
    const u = allies[i++]; if (!u) continue;
    m.hp = u.hp / u.maxHp;
  }
  // the last frame of the fight stays behind the summary card
  try { X.shot = battle.cv ? battle.cv.toDataURL() : null; } catch (e) { X.shot = null; }
  if (battle.raf) cancelAnimationFrame(battle.raf);
  battle = null;
  for (const m of X.party) if (m.own && m.hp <= 0) X.ownFalls = (X.ownFalls || 0) + 1;
  if (res !== "win") { finish("lose"); return; }
  if (allies.length >= 2 && allies.filter((u) => u.hp > 0).length === 1) EV.P.c.lastOne = (EV.P.c.lastOne || 0) + 1;
  if (boss || X.deep) {
    const avg = X.party.reduce((a, m) => a + Math.max(0, m.hp), 0) / X.party.length;
    const noKO = X.party.every((m) => m.hp > 0);
    X.stars = avg >= 0.75 && noKO ? 3 : avg >= 0.5 ? 2 : 1;
  }
  // revive the fallen with a little health, apply after-battle supports
  const winSup = allies.filter((u) => u.hp > 0 && u.cards.s && u.cards.s.s.on === "win").map((u) => u.cards.s.s);
  const winHeal = winSup.reduce((a, s) => a + (s.heal || 0), 0) / 100, winRevive = winSup.reduce((a, s) => a + (s.revive || 0), 0) / 100;
  for (const m of X.party) m.hp = m.hp <= 0 ? Math.min(1, 0.3 + winRevive) : Math.min(1, m.hp + 0.25 + winHeal);
  X.wins++; EV.P.c.expWins = (EV.P.c.expWins || 0) + 1;
  const foes = b.units.filter((u) => u.side === "foe");
  const xp = foes.reduce((a, u) => a + 8 + 4 * u.lvl, 0) * (boss ? 2 : 1);
  const coins = boss ? 30 : 3 + Math.floor(rnd() * 4) + foes.length;
  X.loot.xp += xp; X.loot.coins += coins;
  // on the Deep Root a guardian only pays out the first time you pass its floor in a descent
  const fresh = !X.deep || !deepState().st[X.deep];
  const offer = boss && fresh ? offerCards(3, 1) : rnd() < 0.12 ? offerCards(3, 0) : null;
  // the guardian leaves one of its own cards (one you haven't found yet, if any)
  let guard = null;
  if (boss && fresh) {
    const gc = MONS[ZONES[X.zone].boss].cards, fresh = gc.filter((id) => !(EV.P.grim || {})[id]), pool = fresh.length ? fresh : gc;
    const id = pool[Math.floor(rnd() * pool.length)];
    giveCard(id, 0); guard = { id, g: 0 }; X.loot.cards.push(guard);
    const w = escritoFor("guardian", X.zone); if (w) giveEscrito(w);
    EV.save();
  }
  X.reward = { xp, coins, offer, guard, after: boss || X.deep ? "win" : "next" };
  EV.checkAch();
  show("reward");
}
function offerCards(n, minGrade) {
  const z = ZONES[X.zone];
  const weighted = [];
  for (const id of DROP_POOL) { const w = (CARDS[id].type === z.type ? 3 : 1) * (usable(id) ? 2 : 1); for (let i = 0; i < w; i++) weighted.push(id); }
  const ids = [];
  while (ids.length < n) { const id = weighted[Math.floor(rnd() * weighted.length)]; if (!ids.includes(id)) ids.push(id); }
  return ids.map((id) => ({ id, g: rollGrade(minGrade) }));
}
// a found card, small: thumbnail, name, type and grade, its active effect; a button to see the whole card
function miniCardHtml(o, btn) {
  const C = CARDS[o.id], sc = scaled(o.id, o.g);
  return `<div class="bmini">${thumbHtml(o.id, o.g)}<div class="bm-txt"><strong>${esc(cardName(o.id))}</strong><span class="lr-meta">${typeChip(C.type)} ${gradeChip(o.g)}</span><span class="lr-fx">${esc(slotText(sc, "a"))}</span>${btn ? cantNote(o.id) : ""}<span class="bm-btns"><button class="btn ghost" type="button" data-bview="${o.id}:${o.g}">${esc(tx("r.view"))}</button>${btn || ""}</span></div></div>`;
}
// after a fight the summary is a card laid over the last frame of the battle
const sceneCard = (inner) => X.shot ? `<div class="panel bend-pan"><div class="bend"><img class="bshot" alt="" src="${X.shot}"><div class="bcard">${inner}</div></div></div>` : `<div class="panel">${inner}</div>`;
function rewardHtml() {
  const r = X.reward;
  const parts = [];
  if (r.xp) parts.push(`<span>${esc(tx("r.xp", { n: r.xp }))}</span>`);
  if (r.coins) parts.push(`<span>✦ ${esc(tx("r.coins", { n: r.coins }))}</span>`);
  const fromFight = r.xp != null && X.shot;
  let html = `<h3>${esc(r.title || tx("r.title"))}</h3>${r.text ? `<p class="evt-out">${esc(r.text)}</p>` : ""}${parts.length ? `<div class="loot">${parts.join("")}</div>` : ""}`;
  if (r.guard) html += `<h3>${esc(tx("r.guard"))}</h3><div class="bminis">${miniCardHtml(r.guard)}</div>`;
  const home = fromFight && r.after === "next" ? `<button class="btn ghost" type="button" data-x="quit">${esc(tx("end.home"))}</button>` : "";
  if (r.offer) {
    html += `<h3>${esc(tx("r.pick"))}</h3><div class="bminis">${r.offer.map((o, i) => miniCardHtml(o, `<button class="btn" type="button" data-take="${i}">${esc(tx("r.pick"))}</button>`)).join("")}</div>
      <div class="bctl"><button class="btn ghost" type="button" data-take="-1">${esc(tx("r.skip"))}</button>${home}</div>`;
  } else html += `<div class="bctl"><button class="btn" type="button" data-x="continue">${esc(tx("r.continue"))}</button>${home}</div>`;
  return (fromFight ? sceneCard(html) : `<div class="panel">${html}</div>`) + `<div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}${lootHtml()}</div>`;
}
function afterReward() {
  const a = X.reward && X.reward.after;
  X.reward = null; if (a !== "win") X.shot = null;
  if (a === "win") finish("win"); else nextSection();
}

/* ---------- Battle drawing ---------- */
function drawDecor(c, decor, t, day) {
  if (decor === "heart") {
    // the great stump at the centre of the valley, root veins with black sap, floating star motes
    const m = BW / 2;
    c.fillStyle = day ? "#7a5a48" : "#3a2a30";
    c.beginPath(); c.moveTo(m - 70, 70); c.lineTo(m - 56, 16); c.quadraticCurveTo(m, 6, m + 56, 16); c.lineTo(m + 70, 70); c.closePath(); c.fill();
    c.fillStyle = day ? "#c8a070" : "#6a5040"; EV.ell(c, m, 16, 56, 9); c.fill();
    c.strokeStyle = day ? "#8a6a50" : "#4a3838"; c.lineWidth = 1; for (const r of [40, 26, 12]) { EV.ell(c, m, 16, r, r * 0.16); c.stroke(); }
    c.strokeStyle = SAP.c0; c.lineWidth = 3; for (const [x1, x2] of [[m - 60, 0], [m + 60, BW], [m - 30, 60], [m + 30, BW - 60]]) { c.beginPath(); c.moveTo(x1, 66); c.quadraticCurveTo((x1 + x2) / 2, 58, x2, 70); c.stroke(); }
    c.save(); for (let i = 0; i < 14; i++) { const x = (i * 53 + t * 8) % BW, y = 60 - ((i * 17 + t * 10) % 60); c.globalAlpha = (0.5 + 0.5 * Math.sin(t * 3 + i)) * (day ? 0.7 : 1); c.fillStyle = i % 2 ? "#ffe9a0" : "#c8b8ff"; c.fillRect(x, y, 2, 2); } c.restore();
    return;
  }
  if (decor === "peaks") {
    // snowy peaks, drifting clouds and a spinning vane far away
    c.fillStyle = day ? "#8ea6c0" : "#26304a";
    c.beginPath(); c.moveTo(0, 70); for (const [x, y] of [[40, 22], [90, 52], [150, 14], [210, 48], [270, 24], [330, 50], [360, 34]]) c.lineTo(x, y); c.lineTo(BW, 70); c.closePath(); c.fill();
    c.fillStyle = day ? "#ffffff" : "#c8d4e8"; for (const [x, y] of [[40, 22], [150, 14], [270, 24]]) { c.beginPath(); c.moveTo(x - 10, y + 12); c.lineTo(x, y); c.lineTo(x + 10, y + 12); c.closePath(); c.fill(); }
    c.save(); c.globalAlpha = day ? 0.8 : 0.35; c.fillStyle = "#ffffff"; for (let i = 0; i < 4; i++) { const x = ((i * 110 + t * 10) % (BW + 80)) - 40; EV.ell(c, x, 30 + (i % 2) * 14, 26, 7); c.fill(); EV.ell(c, x + 14, 26 + (i % 2) * 14, 16, 6); c.fill(); } c.restore();
    c.save(); c.translate(150, 10); c.strokeStyle = day ? "#5a5060" : "#8a90b0"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -6); c.stroke(); c.rotate(Math.sin(t * 0.8) * 0.8); c.beginPath(); c.moveTo(-7, -6); c.lineTo(7, -6); c.stroke(); c.restore();
    return;
  }
  if (decor === "ice") {
    // icicles, a frozen wall and glowing mushrooms
    c.fillStyle = day ? "#c8e4f0" : "#2c4250"; c.fillRect(0, 0, BW, 10);
    for (let i = 0; i < 16; i++) { const x = 6 + i * 24, h = 10 + ((i * 29) % 22); c.beginPath(); c.moveTo(x - 5, 9); c.lineTo(x + 5, 9); c.lineTo(x, 9 + h); c.closePath(); c.fill(); }
    for (let i = 0; i < 6; i++) { const x = 30 + i * 62, y = 64 + (i % 2) * 4, g = 0.6 + 0.4 * Math.sin(t * 2 + i); c.fillStyle = "#e8e0d0"; c.fillRect(x - 1, y - 6, 3, 8); c.save(); c.shadowColor = "#a8f0e0"; c.shadowBlur = 8 * g; c.fillStyle = i % 2 ? "#9ae8d8" : "#c8b8f0"; EV.ell(c, x + 0.5, y - 7, 7, 4); c.fill(); c.restore(); }
    c.save(); c.globalAlpha = 0.5; c.fillStyle = "#ffffff"; for (let i = 0; i < 18; i++) { const x = (i * 41 + t * 6) % BW, y = (i * 23 + t * 14) % 70; c.fillRect(x, y, 2, 2); } c.restore();
    return;
  }
  if (decor === "mist") {
    // crooked posts and drifting fog banks
    for (let i = 0; i < 5; i++) { const x = 24 + i * 82; c.fillStyle = day ? "#5c5868" : "#1d1b25"; c.fillRect(x - 3, 30 + (i % 2) * 8, 6, 44); c.fillRect(x - 10, 34 + (i % 2) * 8, 20, 4); }
    for (let k = 0; k < 4; k++) { c.save(); c.globalAlpha = day ? 0.28 : 0.2; c.fillStyle = "#e8e4f0"; const y = 40 + k * 12, off = ((t * (8 + k * 3)) % 120); for (let i = -1; i < 5; i++) { EV.ell(c, i * 120 + off, y, 70, 9); c.fill(); } c.restore(); }
    return;
  }
  if (decor === "lake") {
    // still water on the horizon with a reflection that doesn't match
    c.fillStyle = day ? "#7fb0cc" : "#1b3350"; c.fillRect(0, 46, BW, 26);
    c.save(); c.globalAlpha = 0.45; c.strokeStyle = "#ffffff"; c.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) { const x = (i * 53 + t * 6) % BW, y = 52 + (i % 3) * 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18, y); c.stroke(); }
    c.restore();
    for (let i = 0; i < 3; i++) { const x = 60 + i * 140; c.fillStyle = day ? "#5a4a3a" : "#20180f"; c.beginPath(); c.moveTo(x - 18, 44); c.lineTo(x + 18, 44); c.lineTo(x + 12, 50); c.lineTo(x - 12, 50); c.closePath(); c.fill(); }
    c.save(); c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 1.3); c.fillStyle = "#e8f6ff"; EV.ell(c, BW * 0.72, 60, 10, 4); c.fill(); c.restore();
    return;
  }
  if (decor === "caves") {
    // a cave ceiling with stalactites and faint echo rings
    c.fillStyle = day ? "#4a3e34" : "#15110e"; c.fillRect(0, 0, BW, 14);
    for (let i = 0; i < 14; i++) { const x = 8 + i * 30, h = 14 + ((i * 37) % 26); c.beginPath(); c.moveTo(x - 9, 12); c.lineTo(x + 9, 12); c.lineTo(x, 12 + h); c.closePath(); c.fill(); }
    c.save(); c.strokeStyle = "#e8d8b8"; c.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) { const ph = (t * 0.4 + k / 3) % 1; c.globalAlpha = (1 - ph) * 0.4; c.beginPath(); c.arc(BW / 2, 58, 10 + ph * 90, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    c.restore();
    return;
  }
  if (decor === "forge") {
    // chimneys with rising embers
    for (let i = 0; i < 4; i++) {
      const x = 30 + i * 96, h = 34 + (i % 2) * 12;
      c.fillStyle = day ? "#6b4a3a" : "#2e2226"; c.fillRect(x - 7, 70 - h, 14, h);
      c.save(); c.shadowColor = "#ff8a3a"; c.shadowBlur = 8;
      for (let k = 0; k < 4; k++) { const ph = (t * 0.6 + k * 0.25 + i * 0.13) % 1; c.globalAlpha = 1 - ph; c.fillStyle = k % 2 ? "#ffb347" : "#ff7a3a"; c.fillRect(x - 2 + Math.sin(t * 3 + k) * 4, 70 - h - ph * 40, 3, 3); }
      c.restore();
    }
  } else if (decor === "forest") {
    // tree trunks and canopy
    for (let i = 0; i < 7; i++) {
      const x = 10 + i * 56, w = 10 + (i % 3) * 3;
      c.fillStyle = day ? "#5a4030" : "#1f1a18"; c.fillRect(x - w / 2, 20, w, 54);
      c.fillStyle = day ? "#3f7a3c" : "#183022"; EV.ell(c, x, 22, 30, 20); c.fill();
    }
    c.save(); c.globalAlpha = 0.35; c.fillStyle = "#1d1426";
    for (let i = 0; i < 5; i++) { const x = 40 + i * 70; c.beginPath(); c.moveTo(x, 74); c.quadraticCurveTo(x + 8, 60 + Math.sin(t + i) * 3, x + 2, 50); c.lineWidth = 3; c.strokeStyle = "#1d1426"; c.stroke(); }
    c.restore();
  } else {
    // distant lanterns
    for (let i = 0; i < 6; i++) { const x = 20 + i * 64, y = 44 + (i % 2) * 8; c.save(); c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2 + i); c.shadowColor = "#ffd35a"; c.shadowBlur = 10; c.fillStyle = "#ffe27a"; c.fillRect(x - 3, y - 6, 6, 9); c.restore(); c.fillStyle = "#00000033"; c.fillRect(x - 1, y + 3, 2, 26); }
  }
}
// Battles are drawn at half resolution, snapped to the Glimmer-32 palette and blown up x2; names and numbers stay sharp on top.
const BLOW = typeof PX !== "undefined" ? PX.layer(BW / 2, BH / 2) : null;
const REDUCE = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
// how the caster moves while its card plays (low-res pixels), or null
function castPose(u, now) {
  const cs = battle.cast; if (!cs || cs.uid !== u.uid) return null;
  const k = (now - cs.t0) / cs.dur; if (k >= 1) return null;
  const dir = u.side === "ally" ? 1 : -1, p = EVS.pose(cs.id, k, dir);
  if (p.rel) {
    const a = battle.anim[u.uid], q = battle.anim[cs.tg[0]];
    const dist = q ? Math.max(0, Math.abs(q.x - a.x) / 2 - 16) : 20;
    return Object.assign({}, p, { dx: Math.round(p.dx * dist) });
  }
  return p;
}
function drawBattle(now) {
  if (!battle || !battle.c) return;
  const out = battle.c, b = battle.b, t = now / 1000, z = ZONES[X.zone];
  const c = BLOW ? BLOW.g : out;
  if (BLOW) { c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.scale(0.5, 0.5); }
  const day = b.day;
  const sky = c.createLinearGradient(0, 0, 0, BH);
  const sk = day ? z.sky : z.skyN;
  sky.addColorStop(0, sk[1]); sky.addColorStop(0.6, sk[0]); sky.addColorStop(1, sk[0]);
  c.fillStyle = sky; c.fillRect(0, 0, BW, BH);
  drawDecor(c, z.decor, t, day);
  c.fillStyle = day ? z.ground : z.groundN; c.beginPath(); c.moveTo(0, 70); c.quadraticCurveTo(BW / 2, 52, BW, 70); c.lineTo(BW, BH); c.lineTo(0, BH); c.fill();
  c.fillStyle = "#00000014"; for (let i = 0; i < 40; i++) { const x = (i * 97) % BW, y = 80 + ((i * 53) % 140); c.fillRect(x, y, 2, 5); }
  if (BLOW) { c.setTransform(1, 0, 0, 1, 0, 0); PX.quantize(c, BW / 2, BH / 2, true); c.scale(0.5, 0.5); }
  // units
  const order = b.units.slice().sort((p, q) => battle.anim[p.uid].y - battle.anim[q.uid].y);
  const place = [];
  for (const u of order) {
    const a = battle.anim[u.uid];
    a.lunge = Math.max(0, a.lunge - 0.06); a.flash = Math.max(0, a.flash - 0.07);
    a.shownHp += (u.hp - a.shownHp) * 0.15;
    const dir = u.side === "ally" ? 1 : -1;
    const spr = BLOW && evsKind(u.kind), cp = spr ? castPose(u, now) : null;
    if (cp) a.lunge = 0;
    const lx = Math.round(Math.sin(a.lunge * Math.PI) * 9 * dir) * 2;
    const ko = u.hp <= 0;
    const x = Math.round((a.x + lx) / 2) * 2, y = a.y + (ko ? 8 : 0);
    place.push({ u, a, x, y, ko });
    c.save(); c.translate(x, y);
    if (spr) {
      // pixel sprite: 1 sprite pixel = 2 battle units (the layer is drawn at half size)
      const n = u.boss ? 32 : 24, emo = ko ? "sad" : a.flash > 0.5 ? "surprised" : cp ? "happy" : u.hp / u.maxHp < 0.3 ? "sad" : "normal";
      const frame = cp && cp.sq != null ? cp.sq : REDUCE ? 0 : Math.floor(t * 2 + a.x / 50) % 2;
      let im = EVS.sprite(u.kind, n, u.own ? Math.max(0, Math.min(2, u.stage)) : 1, frame, emo, !!u.hollow);
      if (cp && cp.flash) im = EVS.silhouette(im);
      const w = im.width * 2, h = im.height * 2, feet = u.boss ? 24 : 16;
      const hov = !REDUCE && EVS.hovers(u.kind) ? Math.round(Math.sin(t * 2 + a.x)) * 2 - 4 : 0;
      c.save();
      c.fillStyle = "rgba(29,22,38,.35)"; c.fillRect(Math.round(-w * 0.3 / 2) * 2, feet - 2, Math.round(w * 0.6 / 2) * 2, 4);
      if (ko) c.globalAlpha = 0.35; else if (cp && cp.alpha != null) c.globalAlpha = cp.alpha;
      c.translate(cp ? cp.dx * 2 : 0, (cp ? cp.dy * 2 : 0) + hov);
      if (u.side === "foe") c.scale(-1, 1);
      c.drawImage(im, -Math.round(w / 4) * 2, feet - h, w, h);
      c.restore();
    } else {
    const sc = u.boss ? 0.62 : 0.4;
    c.save(); if (u.side === "foe" && !u.boss) c.scale(-1, 1); c.scale(sc, sc);
    if (ko) c.globalAlpha = 0.35;
    drawMon(c, u.kind, { t: t + a.x, stage: u.own ? u.stage : 1, form: u.form, hollow: u.hollow, hp: u.hp / u.maxHp, ko });
    c.restore();
    }
    if (a.flash > 0) { c.save(); c.globalAlpha = a.flash * 0.6; c.fillStyle = "#ffffff"; EV.ell(c, 0, -4, 22 * (u.boss ? 1.5 : 1), 22 * (u.boss ? 1.8 : 1)); c.fill(); c.restore(); }
    // shield ring
    if (u.shield > 0) { c.save(); c.strokeStyle = "#7cc8e3"; c.lineWidth = 2; c.beginPath(); c.arc(0, -4, u.boss ? 40 : 24, 0, Math.PI * 2); c.stroke(); c.restore(); }
    // segmented hp bar
    const bw = u.boss ? 80 : 56, by = u.boss ? 30 : 22;
    c.fillStyle = "#1d1626"; c.fillRect(-bw / 2 - 2, by - 2, bw + 4, 8);
    const pct = Math.max(0, a.shownHp / u.maxHp), col = pct > 0.5 ? "#86b85a" : pct > 0.25 ? "#ffd57a" : "#e0603f";
    c.fillStyle = col; const segs = Math.ceil((bw / 4) * pct); for (let k = 0; k < segs; k++) c.fillRect(-bw / 2 + k * 4, by, 2, 4);
    if (u.shield > 0) { c.fillStyle = "#c8eef5"; c.fillRect(-bw / 2, by, Math.min(bw, bw * u.shield / u.maxHp), 2); }
    if (u.cards.a && u.cd <= 0 && !ko) { c.fillStyle = "#ffd57a"; c.fillRect(bw / 2 + 4, by - 2, 4, 4); c.fillStyle = "#1d1626"; c.fillRect(bw / 2 + 4, by + 2, 4, 2); }
    c.restore();
  }
  // card-use effect on top of the units, in low-res pixels
  const cs = battle.cast;
  if (BLOW && cs) {
    const k = (now - cs.t0) / cs.dur, from = battle.anim[cs.uid];
    if (k >= 1 || !from) battle.cast = null;
    else {
      const pos = (uid) => { const q = battle.anim[uid]; return q ? { x: Math.round(q.x / 2), y: Math.round(q.y / 2) - 4 } : null; };
      const tg = cs.tg.map(pos).filter(Boolean), f = pos(cs.uid), dir = b.units.find((x) => x.uid === cs.uid).side === "ally" ? 1 : -1;
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      try { EVS.fx(c, cs.id, k, { x: f.x + 6 * dir, y: f.y }, tg[0] || f, tg.length ? tg : [f]); } catch (e) { battle.cast = null; }
      c.restore();
    }
  }
  if (BLOW) { c.setTransform(1, 0, 0, 1, 0, 0); PX.quantize(c, BW / 2, BH / 2, false); out.clearRect(0, 0, BW, BH); PX.blit(out, BLOW, BW, BH); }
  // names, status icons and floating numbers stay sharp
  const font = (w, px) => `${w} ${px}px "EvNum", "Pixelify Sans", system-ui, sans-serif`;
  for (const { u, x, y } of place) {
    const bw = u.boss ? 80 : 56, by = u.boss ? 30 : 22;
    out.save(); out.translate(x, y);
    out.font = font(600, 10); out.textAlign = "center"; out.textBaseline = "alphabetic"; out.fillStyle = "#fbf6ef"; out.strokeStyle = "#1d1626"; out.lineWidth = 3; out.lineJoin = "round";
    const label = u.name.length > 14 ? u.name.slice(0, 13) + "…" : u.name;
    out.strokeText(label + " · " + u.lvl, 0, by + 16); out.fillText(label + " · " + u.lvl, 0, by + 16);
    const ks = Object.keys(u.st), good = ks.filter((k) => !STATUS[k].neg).map((k) => STATUS[k].icon).join(""), bad = ks.filter((k) => STATUS[k].neg).map((k) => STATUS[k].icon).join("");
    out.font = "10px system-ui"; out.fillText(good + TYPES[u.types[0]].icon, 0, -(u.boss ? 56 : 30));
    if (bad) out.fillText(bad, 0, by + 28);
    out.restore();
  }
  for (const f of battle.floats) {
    f.life -= 0.016; f.y -= f.vy == null ? 0.45 : f.vy;
    out.save(); out.globalAlpha = Math.max(0, Math.min(1, f.life)); out.textAlign = "center";
    out.font = f.big ? font(700, 17) : f.small ? font(600, 10) : font(700, 14);
    out.lineWidth = 3; out.lineJoin = "round"; out.strokeStyle = f.stroke || "#1d1626"; out.strokeText(f.text, f.x, Math.round(f.y)); out.fillStyle = f.col; out.fillText(f.text, f.x, Math.round(f.y)); out.restore();
  }
  battle.floats = battle.floats.filter((f) => f.life > 0);
  battle.raf = requestAnimationFrame(drawBattle);
}
