/* Evolvlings RPG: battle presentation and drawing.
   Part of the old rpg.js, now split. Classic scripts: top-level names are shared between the rpg/*.js files,
   which load in order (see index.html). */
"use strict";

/* ---------- Battle presentation ---------- */
const BW = 360, BH = 240;
// where a formation cell stands on the battle canvas: 3 lanes top to bottom, front row towards the middle
const LANE_Y = [98, 152, 206], ROW_X = { ally: [126, 48], foe: [234, 312] };
const cellXY = (side, c) => [ROW_X[side][cellRow(c)], LANE_Y[cellLane(c)]];
function startBattle(boss) {
  const allies = partyUnits().filter((u) => u.hp > 0);
  const foes = foeUnits(boss);
  X.nextFoeBuff = 0;
  const b = new Battle(allies, foes, { zone: X.duel ? null : ZONES[X.zone], day: isDayNow() });
  const all = b.units;
  const anim = {};
  ["ally", "foe"].forEach((side) => all.filter((u) => u.side === side).forEach((u) => { const [x, y] = cellXY(side, u.pos); anim[u.uid] = { x, y, mv: null, lunge: 0, flash: 0, sil: 0, kb: 0, shownHp: u.hp, hpT: u.hp, koT: null }; }));
  battle = { b, boss, anim, floats: [], log: [], aim: null, choice: null, turnU: null, done: false, cv: null, c: null, raf: 0, pend: [], basic: null, shake: null, stopUntil: 0, banner: null, last: 0, drag: null, info: null, teamT: 0, teamH: "" };
  show("battle");
  runBattle();
}
function battleMount() {
  const cv = $("bCanvas"); if (!cv || !battle) return;
  battle.cv = cv; battle.c = EV.setupCanvas(cv, BW, BH);
  cv.style.aspectRatio = BW + " / " + BH;
  if (!battle.raf) battle.raf = requestAnimationFrame(drawBattle);
  cv.addEventListener("pointerdown", aimTap);
  cv.addEventListener("pointermove", aimHover);
  cv.addEventListener("pointerup", dragEnd);
  cv.addEventListener("pointercancel", () => { if (battle) battle.drag = null; });
  renderBLog(); renderTurn();
  if (EV.GUIDE) EV.GUIDE.showTip("battle");
}
const speed = () => EV.P.rpgSpeed || 1;
const wait = (ms) => new Promise((r) => setTimeout(r, ms / speed()));
function uName(uid) { const u = battle.b.units.find((x) => x.uid === uid); return u ? u.name : ""; }
function blog(s) { battle.log.unshift(s); battle.log = battle.log.slice(0, 5); renderBLog(); }
function renderBLog() { const el = $("bLog"); if (el && battle) el.innerHTML = battle.log.map((s) => `<li>${esc(s)}</li>`).join(""); const r = $("bRound"); if (r && battle) r.textContent = tx("b.round", { n: Math.max(1, battle.b.round) }); }
/* Events come out of the engine already resolved; what they show (numbers, flash, the health bar dropping, sounds) waits
   for the moment the attack lands: the card animation's hit window, or the basic attack's contact. */
const HELD = ["dmg", "miss", "heal", "st", "cancel", "ko", "revive", "shield", "cleanse", "dodged", "hasten", "delay"];
const AREA = { multi: 1, wave: 1, quake: 1 };
function flushEvents() {
  const b = battle.b, ev = b.events.splice(0), now = performance.now(), acc = { sfx: null };
  let hold = 0;
  for (const e of ev) {
    // who the card (or basic attack) being played lands on
    const mv = battle.cast || battle.basic;
    if (mv && e.k !== "act" && e.u && ["dmg", "heal", "st", "shield", "miss", "cleanse"].includes(e.k) && !mv.tg.includes(e.u)) mv.tg.push(e.u);
    if (e.k === "act") {
      const u = b.units.find((x) => x.uid === e.u), a = battle.anim[e.u];
      battle.cast = e.card && HAS_EVS && EVS.CARD[e.card] && !REDUCE ? { id: e.card, uid: e.u, t0: now, dur: (EVS.DUR[EVS.anim(e.card).style] || 1) * 1000 / speed(), tg: [] } : null;
      battle.basic = !e.card && !REDUCE && u.pos != null ? { uid: e.u, t0: now, dur: 620 / speed(), tg: [], front: cellRow(u.pos) === 0, col: TCOL[u.types[0]] || "#fbf6ef" } : null;
      if (a && !battle.basic && !battle.cast) a.lunge = 1;
      if (battle.cast) { const hw = EVS.hitWindow(e.card); hold = now + (hw ? hw[0] : 0.35) * battle.cast.dur; battle.cast.area = !!AREA[EVS.anim(e.card).style]; }
      else if (battle.basic) hold = now + 0.45 * battle.basic.dur;
      else hold = 0;
      if (e.card) { blog(tx("log.act", { name: u.name, card: cardName(e.card) })); EV.sfx("card"); } else blog(tx("log.basic", { name: u.name }));
      continue;
    }
    if (hold > now && HELD.includes(e.k)) { const u = e.u && b.units.find((x) => x.uid === e.u); battle.pend.push({ at: hold, e, hp: u ? u.hp : 0 }); continue; }
    showEvent(e, acc);
  }
  if (acc.sfx) { EV.sfx(acc.sfx); if (acc.sfx === "crit") EV.buzz(25); }
}
const pendFor = (uid) => battle.pend.some((p) => p.e.u === uid);
// the held events whose moment has come
function landEvents(now) {
  if (!battle.pend.length) return;
  const due = battle.pend.filter((p) => p.at <= now); if (!due.length) return;
  battle.pend = battle.pend.filter((p) => p.at > now);
  const acc = { sfx: null };
  for (const p of due) {
    const a = p.e.u && battle.anim[p.e.u];
    if (a && p.e.k === "dmg") a.hpT = Math.max(p.hp, a.hpT - p.e.n);
    else if (a && (p.e.k === "heal" || p.e.k === "revive")) a.hpT = Math.min(p.hp, a.hpT + (p.e.n || 0));
    if (p.e.k === "dmg") {
      battle.stopUntil = now + 60; // a short hit-stop sells the weight
      const area = (battle.cast && battle.cast.area) || false;
      if (!REDUCE && (p.e.crit || area)) battle.shake = { t0: now, dur: 200, amp: p.e.crit ? 3 : 2 };
    }
    showEvent(p.e, acc);
  }
  if (acc.sfx) { EV.sfx(acc.sfx); if (acc.sfx === "crit") EV.buzz(25); }
}
function showEvent(e, acc) {
  const b = battle.b, a = e.u && battle.anim[e.u];
  let hitSfx = acc.sfx;
  {
    switch (e.k) {
      case "support": if (b.units.some((x) => x.uid === e.u && x.side === "ally")) EV.P.c.supportUsed = (EV.P.c.supportUsed || 0) + 1; blog(tx("log.support", { name: uName(e.u), card: cardName(e.card) })); if (a) battle.floats.push({ x: a.x, y: a.y - 44, text: "★ " + cardName(e.card), col: "#ffe27a", life: 1.4, small: true }); break;
      case "dmg":
        if ((e.eff === "up" || e.eff === "opp") && e.by && b.units.some((x) => x.uid === e.by && x.side === "ally")) EV.P.c.advHits = (EV.P.c.advHits || 0) + 1;
        if (a) {
          a.flash = 1; if (!e.dot) { a.sil = 2; a.kb = 1; }
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
      case "st": if (a) battle.floats.push(STATUS[e.st].neg ? { x: a.x, y: a.y + 34, vy: -0.25, text: STATUS[e.st].icon + " " + STATUS[e.st][L()] + (e.n > 1 ? " ×" + e.n : ""), col: "#9d93ad", life: 1.3, small: true } : { x: a.x, y: a.y - 48, text: STATUS[e.st].icon + " " + STATUS[e.st][L()] + (e.n > 1 ? " ×" + e.n : ""), col: "#1d1626", stroke: "#fbf6ef", life: 1.3, small: true }); blog(tx("log.st", { name: uName(e.u), st: STATUS[e.st][L()] })); break;
      case "cancel": blog(tx("log.cancel", { name: uName(e.u), st: STATUS[e.st][L()], op: STATUS[e.by][L()] })); if (a) battle.floats.push({ x: a.x, y: a.y - 48, text: STATUS[e.st].icon + " ⇄ " + STATUS[e.by].icon, col: "#fbf6ef", life: 1.2, small: true }); break;
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
      case "warn": { const u = b.units.find((x) => x.uid === e.u); blog(tx("log.warn", { name: u.name, card: cardName(e.card) })); if (a) battle.floats.push({ x: a.x, y: a.y - 52, text: "! " + cardName(e.card), col: "#ff8f6b", life: 1.6, small: true }); EV.sfx("deny"); EV.buzz(20); break; }
      case "move": blog(tx("log.move", { name: uName(e.u) })); break;
      case "defend": blog(tx("log.defend", { name: uName(e.u) })); if (a) battle.floats.push({ x: a.x, y: a.y - 44, text: "◈ −" + Math.round(DEFEND * 100) + " %", col: "#7cc8e3", life: 1.2, small: true }); EV.sfx("tap"); break;
      case "hasten": blog(tx("log.hasten", { name: uName(e.u) })); if (a) battle.floats.push({ x: a.x, y: a.y - 50, text: "»", col: "#ffd57a", life: 1.1 }); break;
      case "delay": blog(tx("log.delay", { name: uName(e.u) })); if (a) battle.floats.push({ x: a.x, y: a.y - 50, text: "«", col: "#9fd3ff", life: 1.1 }); break;
      case "dodged": blog(tx("log.dodged")); EV.P.c.dodged = (EV.P.c.dodged || 0) + (b.units.some((x) => x.uid === e.u && x.side === "foe") ? 1 : 0); break;
      case "revive": blog(tx("log.revive", { name: uName(e.u), n: e.n })); if (a) battle.floats.push({ x: a.x, y: a.y - 40, text: "↑ " + e.n, col: "#8fe08a", life: 1.3 }); EV.sfx("heal"); break;
    }
  }
  acc.sfx = hitSfx;
}
/* ---------- Turns: one creature at a time, in speed order ----------
   On your creature's turn the game waits. Manual: you choose a basic attack, its card (aimed), a move or defend.
   Semi: basic attacks go by themselves and the game only asks when the card can be played. Auto: the game plays it all. */
// Auto: the game does everything. Semi: you play the cards, your creatures dodge marked threats on their own.
// Manual: you also move them and choose every turn.
const manual = () => EV.P.rpgMode === "manual" || EV.P.rpgMode === "semi";
const handMove = () => EV.P.rpgMode === "manual";
function renderTurn() {
  const el = $("bTurn"); if (!el || !battle) return;
  const b = battle.b, A = battle.aim, C = battle.choice;
  if (C && !manual()) { choose(null); return; } // switched to Auto mid-turn: the game plays this one
  if (!C || battle.done) { el.innerHTML = manual() && !battle.done ? `<p class="muted bhint">${esc(tx("b.waitTurn"))}</p>` : ""; return; }
  const u = C.u;
  if (A) {
    const sh = cardShape(A.u.cards.a.a);
    el.innerHTML = `<p class="bturn">${esc(tx("b.aim." + sh, { card: cardName(A.u.cards.a.id) }))}</p>
      <div class="bctl"><button class="btn" type="button" data-b="fire" ${A.cell == null ? "disabled" : ""}>${esc(tx("b.fire", { card: cardName(A.u.cards.a.id) }))}</button><button class="btn ghost" type="button" data-b="cancel">${esc(tx("b.cancel"))}</button></div>`;
    return;
  }
  if (battle.moveSel) {
    el.innerHTML = `<p class="bturn">${esc(tx("b.moveHint"))}</p><div class="bctl"><button class="btn ghost" type="button" data-b="cancel">${esc(tx("b.cancel"))}</button></div>`;
    return;
  }
  const a = u.cards.a, can = b.canPlay(u);
  const cardBtn = a ? `<button type="button" class="bact${can ? " ready" : ""}" data-bt="card" ${can ? "" : "disabled"}><strong>${esc(cardName(a.id))}</strong><small>${esc(can ? tx("b.ready") : tx("b.cd", { n: u.cd }))}</small></button>` : "";
  const full = handMove();
  el.innerHTML = `<p class="bturn">${esc(tx("b.yourTurn", { name: u.name }))}</p><div class="bdock">${cardBtn}
    <button type="button" class="bact" data-bt="basic"><strong>${esc(tx("b.basic"))}</strong><small>${esc(tx(u.pos != null && cellRow(u.pos) === 0 ? "form.front" : "form.back"))}</small></button>
    ${full ? `<button type="button" class="bact" data-bt="move"><strong>${esc(tx("b.move"))}</strong><small>${esc(tx("b.moveCost"))}</small></button>
    <button type="button" class="bact" data-bt="defend"><strong>${esc(tx("b.defend"))}</strong><small>−${Math.round(DEFEND * 100)} %</small></button>` : ""}</div>`;
}
// your creature's turn: wait for what you choose ({k: basic|card|move|defend}), or null to let the game play it
function askTurn(u) { return new Promise((resolve) => { battle.choice = { u, resolve }; renderTurn(); }); }
function choose(ch) {
  const C = battle && battle.choice; if (!C) return;
  battle.choice = null; battle.aim = null; battle.moveSel = null; renderTurn(); C.resolve(ch);
}
function turnBtn(k) {
  const C = battle && battle.choice; if (!C) return;
  const u = C.u, b = battle.b;
  if (k === "basic" || k === "defend") { EV.sfx("tap"); choose({ k }); return; }
  if (k === "move") { battle.moveSel = u.uid; EV.sfx("tap"); renderTurn(); return; }
  if (k === "card") {
    if (!b.canPlay(u)) { EV.sfx("deny"); return; }
    const sh = cardShape(u.cards.a.a);
    if (!sh) { EV.sfx("card"); choose({ k: "card", aim: null }); return; } // nothing to aim
    battle.aim = { u, shape: sh, cell: null, hover: null }; EV.sfx("tap"); renderTurn();
  }
}
function fireAim() {
  const A = battle && battle.aim; if (!A || A.cell == null) return;
  EV.sfx("card"); choose({ k: "card", aim: A.cell });
}
function cancelAim() { if (battle && (battle.aim || battle.moveSel)) { battle.aim = null; battle.moveSel = null; EV.sfx("tap"); renderTurn(); } }
// which cell of the aimed side is under the pointer
function cellAt(e, side) {
  const A = battle.aim, cv = battle.cv, r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * BW, y = (e.clientY - r.top) / r.height * BH;
  side = side || (A.shape === "ally" ? "ally" : "foe");
  let best = null, bd = 36;
  for (let c = 0; c < CELLS; c++) { const [cx, cy] = cellXY(side, c), d = Math.hypot(cx - x, cy - 6 - y); if (d < bd) { bd = d; best = c; } }
  return best;
}
// a cell you can aim at: the zone cards take any cell, the others need someone standing there
function aimOk(c) {
  const A = battle.aim; if (c == null) return false;
  if (A.shape === "lane" || A.shape === "row") return true;
  return battle.b.aimHits(A.u, c).length > 0;
}
function aimTap(e) {
  if (!battle || battle.done) return;
  if (dragStart(e)) return;
  if (battle.moveSel && battle.choice) { moveTap(e); return; }
  if (!battle.aim) { infoTap(e); return; }
  const c = cellAt(e);
  if (!aimOk(c)) { EV.sfx("deny"); return; }
  if (battle.aim.cell === c) { fireAim(); return; } // a second tap on the same cell lets go
  battle.aim.cell = c; EV.sfx("tap"); renderTurn();
}
// Manual move: a free cell next to it (costs the turn) or an ally next to it (swap places, half a turn)
function moveTap(e) {
  const b = battle.b, u = battle.choice.u, c = cellAt(e, "ally"); if (c == null || u.pos == null) return;
  if (c === u.pos) { cancelAim(); return; }
  if (!moveOk(u, c)) { EV.sfx("deny"); return; }
  EV.sfx("tap"); choose({ k: "move", c });
}
function aimHover(e) {
  if (!battle) return;
  const D = battle.drag;
  if (D) { const r = battle.cv.getBoundingClientRect(); D.x = (e.clientX - r.left) / r.width * BW; D.y = (e.clientY - r.top) / r.height * BH; if (Math.hypot(D.x - D.x0, D.y - D.y0) > 8) D.moved = true; D.cell = cellAt(e, "ally"); return; }
  if (battle.aim) battle.aim.hover = cellAt(e);
}
// a free cell next to it, or a teammate next to it (they swap)
function moveOk(u, c) {
  const b = battle.b; if (c == null || u.pos == null || c === u.pos || !nearCells(u.pos).includes(c)) return false;
  return b.units.some((x) => x.side === "ally" && x.hp > 0 && x.pos === c) || b.cellFree("ally", c);
}
// Manual: press your creature and drag it to a cell next to it; a plain tap selects it, a second tap lets it go
function dragStart(e) {
  const C = battle.choice; if (!C || !handMove() || battle.aim || battle.done) return false;
  const u = C.u; if (u.pos == null || cellAt(e, "ally") !== u.pos) return false;
  const r = battle.cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * BW, y = (e.clientY - r.top) / r.height * BH;
  battle.drag = { x0: x, y0: y, x, y, cell: u.pos, moved: false, was: battle.moveSel === u.uid };
  battle.moveSel = u.uid; e.preventDefault(); // no text selection or native drag while you hold it
  try { battle.cv.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
  renderTurn(); return true;
}
function dragEnd() {
  const D = battle && battle.drag; if (!D) return;
  battle.drag = null;
  const C = battle.choice; if (!C) return;
  if (D.moved) { if (moveOk(C.u, D.cell)) { EV.sfx("tap"); choose({ k: "move", c: D.cell }); } else EV.sfx("deny"); return; }
  if (D.was) cancelAim(); else { EV.sfx("tap"); renderTurn(); }
}
const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
async function runBattle() {
  const bt = battle, b = bt.b;
  await wait(400);
  b.start(); flushEvents(); await wait(500);
  while (!b.checkOver() && b.round <= 40) {
    if (bt !== battle) return;
    b.dodge = { ally: handMove() ? 0 : AUTO_DODGE };
    const e = b.advance(Infinity);
    if (!e) continue;
    if (e.k === "round") { flushEvents(); continue; }
    const u = e.u;
    bt.turnU = u.uid;
    if (!b.turnStart(u)) { flushEvents(); b.checkOver(); bt.turnU = null; await wait(450); continue; }
    flushEvents();
    // your creature: Manual always asks; Semi asks only when its card can be played
    let ch = null;
    if (u.side === "ally" && !u.windup && (handMove() || (manual() && b.canPlay(u)))) { ch = await askTurn(u); if (bt !== battle) return; }
    let slow = false;
    if (!ch) { slow = b.wantPlay(u) && !(u.side === "ally" && manual()); b.act(u, slow); }
    else if (ch.k === "card") {
      if (EV.P.rpgIntro !== false && !REDUCE && u.cards.a) { bt.banner = { u, id: u.cards.a.id, t0: performance.now(), dur: 420 }; await new Promise((r) => setTimeout(r, 420)); if (bt !== battle) return; bt.banner = null; }
      b.act(u, true, ch.aim); EV.P.c.aimed = (EV.P.c.aimed || 0) + 1; slow = true;
    } else if (ch.k === "defend") b.defend(u);
    else if (ch.k === "move") { if (!b.stepTurn(u, ch.c)) b.act(u, false); }
    else b.act(u, false);
    flushEvents(); bt.turnU = null; renderTurn();
    await wait(slow ? 900 : 600);
    while (bt.pend.length && bt === battle) await nextFrame(); // the last hit lands before the next turn starts
  }
  const res = b.over || "lose";
  bt.done = true; bt.aim = null; bt.choice = null; renderTurn();
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
  if (X.duel) { duelFinish(res); return; }
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
  X.reward = { xp, coins, offer, guard, after: boss || X.deep ? "win" : "next", kind: "victoria" };
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
  if (r.kind && pauseBox(r.kind)) return `<div class="panel">${pauseBox(r.kind)}${html}</div><div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}${lootHtml()}</div>`;
  return (fromFight ? sceneCard(html) : `<div class="panel">${html}</div>`) + `<div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}${lootHtml()}</div>`;
}
function afterReward() {
  const a = X.reward && X.reward.after;
  X.reward = null; if (a !== "win") X.shot = null;
  if (a === "win") finish("win"); else nextSection();
}

/* ---------- Battle drawing ---------- */
// the background of each zone in battle, by its "decor" name (rpg/data-zones.js); EV.RPG.addZone can add new ones
const DECOR = {
  heart(c, t, day) {
    // the great stump at the centre of the valley, root veins with black sap, floating star motes
    const m = BW / 2;
    c.fillStyle = day ? "#7a5a48" : "#3a2a30";
    c.beginPath(); c.moveTo(m - 70, 70); c.lineTo(m - 56, 16); c.quadraticCurveTo(m, 6, m + 56, 16); c.lineTo(m + 70, 70); c.closePath(); c.fill();
    c.fillStyle = day ? "#c8a070" : "#6a5040"; EV.ell(c, m, 16, 56, 9); c.fill();
    c.strokeStyle = day ? "#8a6a50" : "#4a3838"; c.lineWidth = 1; for (const r of [40, 26, 12]) { EV.ell(c, m, 16, r, r * 0.16); c.stroke(); }
    c.strokeStyle = SAP.c0; c.lineWidth = 3; for (const [x1, x2] of [[m - 60, 0], [m + 60, BW], [m - 30, 60], [m + 30, BW - 60]]) { c.beginPath(); c.moveTo(x1, 66); c.quadraticCurveTo((x1 + x2) / 2, 58, x2, 70); c.stroke(); }
    c.save(); for (let i = 0; i < 14; i++) { const x = (i * 53 + t * 8) % BW, y = 60 - ((i * 17 + t * 10) % 60); c.globalAlpha = (0.5 + 0.5 * Math.sin(t * 3 + i)) * (day ? 0.7 : 1); c.fillStyle = i % 2 ? "#ffe9a0" : "#c8b8ff"; c.fillRect(x, y, 2, 2); } c.restore();
  },
  peaks(c, t, day) {
    // snowy peaks, drifting clouds and a spinning vane far away
    c.fillStyle = day ? "#8ea6c0" : "#26304a";
    c.beginPath(); c.moveTo(0, 70); for (const [x, y] of [[40, 22], [90, 52], [150, 14], [210, 48], [270, 24], [330, 50], [360, 34]]) c.lineTo(x, y); c.lineTo(BW, 70); c.closePath(); c.fill();
    c.fillStyle = day ? "#ffffff" : "#c8d4e8"; for (const [x, y] of [[40, 22], [150, 14], [270, 24]]) { c.beginPath(); c.moveTo(x - 10, y + 12); c.lineTo(x, y); c.lineTo(x + 10, y + 12); c.closePath(); c.fill(); }
    c.save(); c.globalAlpha = day ? 0.8 : 0.35; c.fillStyle = "#ffffff"; for (let i = 0; i < 4; i++) { const x = ((i * 110 + t * 10) % (BW + 80)) - 40; EV.ell(c, x, 30 + (i % 2) * 14, 26, 7); c.fill(); EV.ell(c, x + 14, 26 + (i % 2) * 14, 16, 6); c.fill(); } c.restore();
    c.save(); c.translate(150, 10); c.strokeStyle = day ? "#5a5060" : "#8a90b0"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -6); c.stroke(); c.rotate(Math.sin(t * 0.8) * 0.8); c.beginPath(); c.moveTo(-7, -6); c.lineTo(7, -6); c.stroke(); c.restore();
  },
  ice(c, t, day) {
    // icicles, a frozen wall and glowing mushrooms
    c.fillStyle = day ? "#c8e4f0" : "#2c4250"; c.fillRect(0, 0, BW, 10);
    for (let i = 0; i < 16; i++) { const x = 6 + i * 24, h = 10 + ((i * 29) % 22); c.beginPath(); c.moveTo(x - 5, 9); c.lineTo(x + 5, 9); c.lineTo(x, 9 + h); c.closePath(); c.fill(); }
    for (let i = 0; i < 6; i++) { const x = 30 + i * 62, y = 64 + (i % 2) * 4, g = 0.6 + 0.4 * Math.sin(t * 2 + i); c.fillStyle = "#e8e0d0"; c.fillRect(x - 1, y - 6, 3, 8); c.save(); c.shadowColor = "#a8f0e0"; c.shadowBlur = 8 * g; c.fillStyle = i % 2 ? "#9ae8d8" : "#c8b8f0"; EV.ell(c, x + 0.5, y - 7, 7, 4); c.fill(); c.restore(); }
    c.save(); c.globalAlpha = 0.5; c.fillStyle = "#ffffff"; for (let i = 0; i < 18; i++) { const x = (i * 41 + t * 6) % BW, y = (i * 23 + t * 14) % 70; c.fillRect(x, y, 2, 2); } c.restore();
  },
  mist(c, t, day) {
    // crooked posts and drifting fog banks
    for (let i = 0; i < 5; i++) { const x = 24 + i * 82; c.fillStyle = day ? "#5c5868" : "#1d1b25"; c.fillRect(x - 3, 30 + (i % 2) * 8, 6, 44); c.fillRect(x - 10, 34 + (i % 2) * 8, 20, 4); }
    for (let k = 0; k < 4; k++) { c.save(); c.globalAlpha = day ? 0.28 : 0.2; c.fillStyle = "#e8e4f0"; const y = 40 + k * 12, off = ((t * (8 + k * 3)) % 120); for (let i = -1; i < 5; i++) { EV.ell(c, i * 120 + off, y, 70, 9); c.fill(); } c.restore(); }
  },
  lake(c, t, day) {
    // still water on the horizon with a reflection that doesn't match
    c.fillStyle = day ? "#7fb0cc" : "#1b3350"; c.fillRect(0, 46, BW, 26);
    c.save(); c.globalAlpha = 0.45; c.strokeStyle = "#ffffff"; c.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) { const x = (i * 53 + t * 6) % BW, y = 52 + (i % 3) * 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18, y); c.stroke(); }
    c.restore();
    for (let i = 0; i < 3; i++) { const x = 60 + i * 140; c.fillStyle = day ? "#5a4a3a" : "#20180f"; c.beginPath(); c.moveTo(x - 18, 44); c.lineTo(x + 18, 44); c.lineTo(x + 12, 50); c.lineTo(x - 12, 50); c.closePath(); c.fill(); }
    c.save(); c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 1.3); c.fillStyle = "#e8f6ff"; EV.ell(c, BW * 0.72, 60, 10, 4); c.fill(); c.restore();
  },
  caves(c, t, day) {
    // a cave ceiling with stalactites and faint echo rings
    c.fillStyle = day ? "#4a3e34" : "#15110e"; c.fillRect(0, 0, BW, 14);
    for (let i = 0; i < 14; i++) { const x = 8 + i * 30, h = 14 + ((i * 37) % 26); c.beginPath(); c.moveTo(x - 9, 12); c.lineTo(x + 9, 12); c.lineTo(x, 12 + h); c.closePath(); c.fill(); }
    c.save(); c.strokeStyle = "#e8d8b8"; c.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) { const ph = (t * 0.4 + k / 3) % 1; c.globalAlpha = (1 - ph) * 0.4; c.beginPath(); c.arc(BW / 2, 58, 10 + ph * 90, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    c.restore();
  },
  forge(c, t, day) {
    // chimneys with rising embers
    for (let i = 0; i < 4; i++) {
      const x = 30 + i * 96, h = 34 + (i % 2) * 12;
      c.fillStyle = day ? "#6b4a3a" : "#2e2226"; c.fillRect(x - 7, 70 - h, 14, h);
      c.save(); c.shadowColor = "#ff8a3a"; c.shadowBlur = 8;
      for (let k = 0; k < 4; k++) { const ph = (t * 0.6 + k * 0.25 + i * 0.13) % 1; c.globalAlpha = 1 - ph; c.fillStyle = k % 2 ? "#ffb347" : "#ff7a3a"; c.fillRect(x - 2 + Math.sin(t * 3 + k) * 4, 70 - h - ph * 40, 3, 3); }
      c.restore();
    }
  },
  forest(c, t, day) {
    // tree trunks and canopy
    for (let i = 0; i < 7; i++) {
      const x = 10 + i * 56, w = 10 + (i % 3) * 3;
      c.fillStyle = day ? "#5a4030" : "#1f1a18"; c.fillRect(x - w / 2, 20, w, 54);
      c.fillStyle = day ? "#3f7a3c" : "#183022"; EV.ell(c, x, 22, 30, 20); c.fill();
    }
    c.save(); c.globalAlpha = 0.35; c.fillStyle = "#1d1426";
    for (let i = 0; i < 5; i++) { const x = 40 + i * 70; c.beginPath(); c.moveTo(x, 74); c.quadraticCurveTo(x + 8, 60 + Math.sin(t + i) * 3, x + 2, 50); c.lineWidth = 3; c.strokeStyle = "#1d1426"; c.stroke(); }
    c.restore();
  },
  lanterns(c, t, day) {
    // distant lanterns
    for (let i = 0; i < 6; i++) { const x = 20 + i * 64, y = 44 + (i % 2) * 8; c.save(); c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2 + i); c.shadowColor = "#ffd35a"; c.shadowBlur = 10; c.fillStyle = "#ffe27a"; c.fillRect(x - 3, y - 6, 6, 9); c.restore(); c.fillStyle = "#00000033"; c.fillRect(x - 1, y + 3, 2, 26); }
  },
};
function drawDecor(c, decor, t, day) { (DECOR[decor] || DECOR.lanterns)(c, t, day); }
// Battles are drawn at half resolution, snapped to the Glimmer-32 palette and blown up x2; names and numbers stay sharp on top.
const BLOW = typeof PX !== "undefined" ? PX.layer(BW / 2, BH / 2) : null;
const REDUCE = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
// PNG art (art.js): a zone background replaces the drawn sky and ground, creature and guardian sheets replace the
// procedural sprites. Both draw straight onto the full-size canvas (1 art pixel = 1 battle unit) so no detail is lost.
const HAS_ART = typeof EVART !== "undefined";
const artBg = (zone, day) => (HAS_ART && !(EVART.classic && EVART.classic()) && (EVART.image("battle/" + zone + (day ? "-day" : "-night") + ".png") || EVART.image("battle/" + zone + (day ? "-night" : "-day") + ".png"))) || null;
function artUnit(u, sq, emo) {
  if (!HAS_ART) return null;
  const dir = emo === "normal" ? "side" : null, st = u.own ? Math.max(0, Math.min(2, u.stage)) : 1;
  return (u.boss && EVART.guardian(u.kind, sq, emo, dir)) || EVART.creature(u.kind, st, sq, emo, dir);
}
// battle sprites 1.5 times bigger than the sheet cell, still crisp: the cell read back at its own pixel size and
// scaled by a whole number (art.js EVART.small), feet on the bottom row
function bigArt(im, u) { return im && HAS_ART && EVART.small ? EVART.small(im, u.boss ? 72 : 46) || im : im; }
const hollowArt = new WeakMap();
function artHollow(cv) {
  // hollowed foes: the same picture, dimmed towards plum
  let h = hollowArt.get(cv); if (h) return h;
  h = document.createElement("canvas"); h.width = cv.width; h.height = cv.height;
  const g = h.getContext("2d"); g.drawImage(cv, 0, 0); g.globalCompositeOperation = "source-atop"; g.globalAlpha = 0.45; g.fillStyle = "#2a1c38"; g.fillRect(0, 0, h.width, h.height);
  hollowArt.set(cv, h); return h;
}
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
// a formation cell as a tile on the ground (battle units): centred on the creature's feet
const TILE_W = 62, TILE_H = 20;
const tileOf = (side, c) => { const [x, y] = cellXY(side, c); return { x: x - TILE_W / 2, y: y + 6, w: TILE_W, h: TILE_H }; };
const SIDE_COL = { ally: "124,200,227", foe: "224,144,127" };
function tilePath(g, t) { g.beginPath(); if (g.roundRect) g.roundRect(t.x, t.y, t.w, t.h, 5); else g.rect(t.x, t.y, t.w, t.h); }
// the cells foes have marked on your side: cell -> the marking foe
function threatMap() {
  const m = new Map();
  for (const u of battle.b.units) if (u.windup && u.hp > 0 && u.side === "foe") for (const c of u.windup.cells) m.set(c, u);
  return m;
}
// the 6 tiles of each side (bluish yours, reddish theirs; stronger in Manual), and the cover shields:
// a front creature keeps basic attacks off the one behind it in its lane
function drawTiles(g) {
  const b = battle.b, strong = handMove() && !battle.done;
  g.save();
  for (const side of ["ally", "foe"]) {
    const col = SIDE_COL[side];
    for (let c = 0; c < CELLS; c++) {
      const t = tileOf(side, c), back = cellRow(c) === 1;
      tilePath(g, t);
      g.fillStyle = `rgba(${col},${(strong ? 0.2 : 0.11) + (back ? 0 : 0.04)})`; g.fill();
      g.lineWidth = 1.5; g.strokeStyle = `rgba(${col},${strong ? 0.75 : 0.42})`;
      if (back) g.setLineDash([4, 3]); g.stroke(); g.setLineDash([]);
    }
    for (let lane = 0; lane < 3; lane++) {
      const f = b.units.find((u) => u.side === side && u.hp > 0 && u.pos === lane), k = b.units.find((u) => u.side === side && u.hp > 0 && u.pos === lane + 3);
      if (!f || !k) continue;
      const x = Math.round((ROW_X[side][0] + ROW_X[side][1]) / 2), y = LANE_Y[lane] + 10;
      g.fillStyle = "rgba(29,22,38,.7)"; g.fillRect(x - 6, y - 1, 12, 12);
      g.fillStyle = `rgb(${col})`; g.beginPath(); g.moveTo(x - 4, y + 1); g.lineTo(x + 4, y + 1); g.lineTo(x + 4, y + 5); g.lineTo(x, y + 9); g.lineTo(x - 4, y + 5); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(x - 3, y + 2, 2, 3);
    }
  }
  g.restore();
}
// marked threats: the red cells fill up as the marking foe's turn comes near; your current creature, where it can go,
// and in Manual the safe cells next to it in green
function drawThreats(out, now) {
  const b = battle.b, pulse = 0.55 + 0.35 * Math.sin(now / 160);
  out.save();
  for (const u of b.units) {
    if (!u.windup || u.hp <= 0) continue;
    const side = b.other(u.side), fill = Math.max(0.15, Math.min(1, u.g || 0));
    for (const c of u.windup.cells) {
      const t = tileOf(side, c);
      out.save(); tilePath(out, t); out.clip();
      out.fillStyle = "rgba(224,96,63,.22)"; out.fillRect(t.x, t.y, t.w, t.h);
      out.fillStyle = `rgba(224,96,63,${0.35 + 0.25 * pulse})`; out.fillRect(t.x, t.y + t.h * (1 - fill), t.w, t.h * fill);
      out.restore();
      tilePath(out, t); out.strokeStyle = `rgba(255,143,107,${pulse})`; out.lineWidth = 2; out.stroke();
    }
    const a = battle.anim[u.uid]; if (a) { const hy = a.y - (u.boss ? 84 : 52); out.font = '700 16px "EvNum", "Pixelify Sans", system-ui, sans-serif'; out.textAlign = "center"; out.lineWidth = 3; out.strokeStyle = "#1d1626"; out.strokeText("!", a.x, hy); out.fillStyle = "#ff8f6b"; out.fillText("!", a.x, hy); }
  }
  const cur = battle.turnU && battle.anim[battle.turnU], cu = cur && b.units.find((u) => u.uid === battle.turnU);
  if (cur && cu && cu.hp > 0 && cu.pos != null) { const t = tileOf(cu.side, cu.pos); tilePath(out, t); out.strokeStyle = `rgba(255,213,122,${0.6 + 0.4 * Math.sin(now / 200)})`; out.lineWidth = 2.5; out.stroke(); }
  const C = battle.choice, threat = threatMap();
  const sel = battle.moveSel && b.units.find((u) => u.uid === battle.moveSel && u.hp > 0);
  const me = C && handMove() && !battle.aim && C.u.pos != null ? C.u : null;
  if (sel && handMove() && me) {
    for (const c of nearCells(sel.pos)) {
      if (!moveOk(sel, c)) continue;
      const t = tileOf("ally", c), bad = threat.has(c), over = battle.drag && battle.drag.cell === c;
      tilePath(out, t);
      out.fillStyle = bad ? "rgba(224,96,63,.18)" : over ? "rgba(134,184,90,.55)" : "rgba(134,184,90,.3)"; out.fill();
      out.lineWidth = over ? 3 : 2; out.strokeStyle = bad ? "#ff8f6b" : "#a8d878"; out.stroke();
    }
  } else if (battle.moveSel && !sel) battle.moveSel = null;
  else if (me && threat.has(me.pos)) {
    // you stand where the blow lands: the cells you could step to that are safe glow green
    for (const c of nearCells(me.pos)) { if (!moveOk(me, c) || threat.has(c)) continue; const t = tileOf("ally", c); tilePath(out, t); out.strokeStyle = `rgba(168,216,120,${pulse})`; out.lineWidth = 2; out.stroke(); }
  }
  // the creature you drag: a see-through copy under your finger
  const D = battle.drag;
  if (D && D.moved && sel) {
    const im = bigArt(artUnit(sel, 0, "normal"), sel);
    if (im) { out.save(); out.globalAlpha = 0.6; out.imageSmoothingEnabled = false; out.drawImage(im, Math.round(D.x - im.width / 2), Math.round(D.y - im.height + 12)); out.restore(); }
  }
  out.restore();
}
// while aiming: the cells you can pick, the zone under your finger and the type multiplier on each foe it reaches
function drawAim(out, now) {
  const A = battle.aim, b = battle.b, side = A.shape === "ally" ? "ally" : "foe", show = A.cell != null ? A.cell : A.hover;
  out.save();
  out.fillStyle = "rgba(29,22,38,.28)"; out.fillRect(0, 0, BW, BH);
  const hitCells = show != null && aimOk(show) ? (A.shape === "lane" || A.shape === "row" || A.shape === "cross" ? shapeCells(A.shape, show) : [show]) : [];
  for (let c = 0; c < CELLS; c++) {
    const [x, y] = cellXY(side, c), on = hitCells.includes(c), ok = aimOk(c);
    if (!on && !ok) continue;
    out.strokeStyle = on ? (side === "ally" ? "#86b85a" : "#ffd57a") : "rgba(251,246,239,.5)"; out.lineWidth = on ? 3 : 1.5;
    out.fillStyle = on ? (side === "ally" ? "rgba(134,184,90,.25)" : "rgba(255,213,122,.22)") : "transparent";
    out.beginPath(); out.ellipse(x, y + 4, 30, 30, 0, 0, Math.PI * 2); out.fill(); out.stroke();
  }
  if (show != null && side === "foe") {
    const card = A.u.cards.a, ty = b.typeOf(A.u, card);
    for (const t of b.aimHits(A.u, show)) {
      const m = t.types.reduce((k, d) => k * typeMult(ty, d), 1), a = battle.anim[t.uid]; if (!a || m === 1) continue;
      out.font = '700 13px "EvNum", "Pixelify Sans", system-ui, sans-serif'; out.textAlign = "center"; out.lineWidth = 3; out.strokeStyle = "#1d1626";
      const txt = "×" + (Math.round(m * 100) / 100); out.strokeText(txt, a.x, a.y - 50); out.fillStyle = m > 1 ? "#ffd57a" : "#9d93ad"; out.fillText(txt, a.x, a.y - 50);
    }
  }
  out.restore();
}
// the basic attack: the front row runs half way, hits and comes back; the back row throws a small shot (offset in battle units)
function basicPose(u, now) {
  const m = battle.basic; if (!m || m.uid !== u.uid || !m.front) return 0;
  const k = (now - m.t0) / m.dur; if (k >= 1) return 0;
  const a = battle.anim[u.uid], q = battle.anim[m.tg[0]], dir = u.side === "ally" ? 1 : -1;
  const dist = q ? Math.max(8, Math.abs(q.x - a.x) / 2 - 10) : 24;
  const f = k < 0.12 ? -0.12 * (k / 0.12) : k < 0.45 ? (k - 0.12) / 0.33 : k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
  return Math.round(f * dist * dir / 2) * 2;
}
// a soft round light, added on top (glows of the card effects, the caster's wind-up)
function glow(g, x, y, r, col, al) {
  if (al <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = Math.min(1, al); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}
// the card's name and the creature that plays it, slid across for a moment when you let go of a card
function drawBanner(out, now) {
  const bn = battle.banner; if (!bn) return;
  const k = Math.min(1, (now - bn.t0) / bn.dur), slide = k < 0.25 ? 1 - k / 0.25 : k > 0.85 ? -(k - 0.85) / 0.15 : 0;
  const ty = CARDS[bn.id] ? CARDS[bn.id].type : null, col = TCOL[ty] || "#b9a7ff", y = 92, x = Math.round(slide * BW);
  out.save(); out.translate(x, 0);
  out.fillStyle = "rgba(29,22,38,.86)"; out.fillRect(0, y, BW, 44);
  out.fillStyle = col; out.fillRect(0, y, BW, 3); out.fillRect(0, y + 41, BW, 3);
  const im = artUnit(bn.u, 0, "happy");
  if (im) { out.imageSmoothingEnabled = false; out.drawImage(im, 70 - im.width / 2, y + 44 - im.height); }
  out.font = '700 18px "EvNum", "Pixelify Sans", system-ui, sans-serif'; out.textAlign = "left"; out.textBaseline = "middle";
  out.lineWidth = 4; out.strokeStyle = "#1d1626"; out.strokeText(cardName(bn.id), 112, y + 22); out.fillStyle = "#fbf6ef"; out.fillText(cardName(bn.id), 112, y + 22);
  out.font = '600 10px "EvNum", "Pixelify Sans", system-ui, sans-serif'; out.fillStyle = col; out.fillText(bn.u.name, 112, y + 8);
  out.restore();
}
// a defeated creature: it drops and blinks, then goes up in a puff of dust (ms since it fell)
function drawPuff(out, x, y, el, boss) {
  const k = (el - 340) / 420; if (k <= 0 || k >= 1) return;
  out.save(); out.globalAlpha = 1 - k;
  for (let i = 0; i < 7; i++) { const an = i * Math.PI * 2 / 7 + 0.3, r = (boss ? 16 : 10) + k * (boss ? 22 : 14);
    out.fillStyle = i % 2 ? "#e9e3ef" : "#c9c0d4"; out.beginPath(); out.arc(Math.round(x + Math.cos(an) * r), Math.round(y - 6 + Math.sin(an) * r * 0.6 - k * 6), (boss ? 7 : 5) * (1 - k * 0.5), 0, Math.PI * 2); out.fill(); }
  out.restore();
}
// a creature's face for the order strip: the front frame of its sheet (or a coloured disc without art)
function stripFace(u) {
  if (!HAS_ART) return null;
  const st = u.own ? Math.max(0, Math.min(2, u.stage)) : 1;
  return (u.boss && EVART.guardian(u.kind, 0, "normal")) || EVART.creature(u.kind, st, 0, "normal");
}
// what a foe is about to do on its next turn: "!" the marked threat lands, "★" its card, "◎" it will mark one, else a basic
function intentOf(b, u) {
  if (u.windup) return { t: "!", col: "#ff8f6b" };
  if (b.canPlay(u) && b.wantPlay(u)) return b.wantThreat(u) ? { t: "◎", col: "#ff8f6b" } : { t: "★", col: TCOL[u.cards.a.type] || "#ffd57a" };
  return { t: "⚔", col: "#fbf6ef" };
}
function drawStrip(out, now) {
  const b = battle.b, list = b.order(8); if (!list.length) return;
  const W = 34, G = 4, x0 = Math.round((BW - list.length * (W + G) + G) / 2), y0 = 4, seen = new Set();
  out.save();
  out.fillStyle = "rgba(29,22,38,.55)"; out.fillRect(x0 - 6, y0 - 2, list.length * (W + G) - G + 12, W + 4);
  list.forEach((u, i) => {
    const x = x0 + i * (W + G), first = !seen.has(u.uid); seen.add(u.uid);
    const now0 = i === 0 && battle.turnU === u.uid;
    out.fillStyle = u.side === "ally" ? "#2c3f5e" : "#5e2c34"; out.fillRect(x, y0, W, W);
    const face = stripFace(u);
    if (face) { out.imageSmoothingEnabled = false; const k = W / face.width * 1.15; out.save(); out.beginPath(); out.rect(x, y0, W, W); out.clip(); if (u.side === "foe") { out.translate(x + W, 0); out.scale(-1, 1); out.drawImage(face, (W - face.width * k) / 2, y0 + W - face.height * k + 4, face.width * k, face.height * k); } else out.drawImage(face, x + (W - face.width * k) / 2, y0 + W - face.height * k + 4, face.width * k, face.height * k); out.restore(); }
    else { out.fillStyle = TCOL[u.types[0]] || "#b9a7ff"; out.beginPath(); out.arc(x + W / 2, y0 + W / 2, 10, 0, Math.PI * 2); out.fill(); }
    const threat = first && u.windup;
    out.lineWidth = now0 ? 3 : 2; out.strokeStyle = threat ? "#e0603f" : now0 ? "#ffd57a" : u.side === "ally" ? "#7cc8e3" : "#e0907f"; out.strokeRect(x + 0.5, y0 + 0.5, W - 1, W - 1);
    if (u.side === "foe" && first) {
      const it = intentOf(b, u); out.font = '700 11px "EvNum", "Pixelify Sans", system-ui, sans-serif'; out.textAlign = "center"; out.textBaseline = "middle";
      out.fillStyle = "#1d1626"; out.fillRect(x + W - 12, y0 + W - 12, 12, 12); out.fillStyle = it.col; out.fillText(it.t, x + W - 6, y0 + W - 5);
    }
  });
  out.restore();
}
// a row of state circles centred on x: icon inside, ×N top right from 2 stacks, turns left at the bottom (none when it
// lasts the whole battle); past 4 it shows 3 and a "+N" circle
function drawStRow(out, u, keys, x, y, good) {
  if (!keys.length) return;
  const show = keys.length > 4 ? keys.slice(0, 3) : keys, more = keys.length - show.length, n = show.length + (more ? 1 : 0), G = 15;
  const font = (w, px) => `${w} ${px}px "EvNum", "Pixelify Sans", system-ui, sans-serif`;
  out.save(); out.textAlign = "center"; out.textBaseline = "middle"; out.lineJoin = "round";
  for (let i = 0; i < n; i++) {
    const cx = Math.round(x - (n - 1) * G / 2 + i * G), k = show[i];
    out.beginPath(); out.arc(cx, y, 6.5, 0, Math.PI * 2);
    out.fillStyle = good ? "#2f7a3e" : "#a8382f"; out.fill(); out.lineWidth = 1.5; out.strokeStyle = good ? "#a8e08a" : "#ff9a86"; out.stroke();
    if (!k) { out.font = font(700, 8); out.fillStyle = "#fbf6ef"; out.fillText("+" + more, cx, y + 0.5); continue; }
    const s = u.st[k];
    out.font = "8px system-ui"; out.fillStyle = "#fff"; out.fillText(STATUS[k].icon, cx, y + 0.5);
    out.lineWidth = 2.5; out.strokeStyle = "#1d1626";
    if ((s.n || 1) > 1) { out.font = font(700, 8); out.strokeText("×" + s.n, cx + 7, y - 6); out.fillStyle = "#ffd57a"; out.fillText("×" + s.n, cx + 7, y - 6); }
    if (s.t < 99) { out.font = font(700, 7); out.strokeText(String(s.t), cx, y + 9); out.fillStyle = "#fbf6ef"; out.fillText(String(s.t), cx, y + 9); }
  }
  out.restore();
}
// tap a creature (or its name under the field) to read all its states
function stInfo(u) {
  const ks = Object.keys(u.st);
  if (!ks.length) return `<p class="muted"><b>${esc(u.name)}</b> · ${esc(tx("b.stNone"))}</p>`;
  return `<p><b>${esc(u.name)}</b></p><ul class="bstl">${ks.map((k) => { const s = u.st[k], neg = STATUS[k].neg;
    return `<li class="${neg ? "neg" : "pos"}"><span class="ic">${STATUS[k].icon}</span> ${esc(STATUS[k][L()])}${(s.n || 1) > 1 ? ` <b>×${s.n}</b>` : ""} <small>${esc(s.t >= 99 ? tx("b.stAll") : tx("b.stTurns", { n: s.t }))}</small></li>`; }).join("")}</ul>`;
}
function infoTap(e) {
  if (!battle || battle.aim || battle.moveSel || battle.drag) return false;
  const r = battle.cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * BW, y = (e.clientY - r.top) / r.height * BH;
  let best = null, bd = 30;
  for (const u of battle.b.units) { const a = battle.anim[u.uid]; if (!a || u.hp <= 0) continue; const d = Math.hypot(a.x - x, a.y - 4 - y); if (d < bd) { bd = d; best = u; } }
  battle.info = best && battle.info !== best.uid ? best.uid : null; battle.teamH = ""; renderTeam();
  return !!best;
}
// who is fighting: name, level and health of each side, under the field
function renderTeam() {
  const el = $("bTeam"); if (!el || !battle) return;
  const b = battle.b;
  const chip = (u) => { const a = battle.anim[u.uid], hp = Math.max(0, Math.round(a ? a.hpT : u.hp)), ko = hp <= 0;
    const st = Object.keys(u.st), pos = st.filter((k) => !STATUS[k].neg).length, neg = st.length - pos;
    return `<button type="button" class="bchip ${u.side}${ko ? " ko" : ""}${battle.turnU === u.uid ? " now" : ""}" data-binfo="${u.uid}" aria-pressed="${battle.info === u.uid}"><span aria-hidden="true">${TYPES[u.types[0]].icon}</span><b>${esc(u.name)}</b> <small>${u.lvl}</small> <i>${hp}/${u.maxHp}</i>${pos ? `<em class="p">${pos}</em>` : ""}${neg ? `<em class="n">${neg}</em>` : ""}</button>`; };
  const side = (sd) => b.units.filter((u) => u.side === sd).sort((p, q) => (p.pos == null ? 9 : cellLane(p.pos)) - (q.pos == null ? 9 : cellLane(q.pos)) || (p.pos || 0) - (q.pos || 0)).map(chip).join("");
  const iu = battle.info && b.units.find((u) => u.uid === battle.info);
  const h = `<div class="bteam-row"><div class="bside">${side("ally")}</div><div class="bside foe">${side("foe")}</div></div>${iu ? `<div class="binfo">${stInfo(iu)}</div>` : ""}`;
  if (h !== battle.teamH) { battle.teamH = h; el.innerHTML = h; }
}
function drawBattle(now) {
  if (!battle || !battle.c) return;
  const out = battle.c, b = battle.b, t = now / 1000, z = ZONES[X.zone];
  // hit-stop: while it lasts the card and attack animations hold still
  const fdt = battle.last ? Math.min(100, now - battle.last) : 0; battle.last = now;
  const stopped = now < battle.stopUntil;
  if (stopped) { if (battle.cast) battle.cast.t0 += fdt; if (battle.basic) battle.basic.t0 += fdt; }
  landEvents(now);
  if (battle.cv) { const sk = battle.shake; if (sk && now - sk.t0 < sk.dur) { const f = 1 - (now - sk.t0) / sk.dur, ax = Math.round((Math.random() * 2 - 1) * sk.amp * f), ay = Math.round((Math.random() * 2 - 1) * sk.amp * f); battle.cv.style.transform = `translate(${ax}px,${ay}px)`; } else if (sk) { battle.shake = null; battle.cv.style.transform = ""; } }
  const c = BLOW ? BLOW.g : out;
  if (BLOW) { c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.scale(0.5, 0.5); }
  const day = b.day, bg = BLOW && artBg(X.zone, day);
  // with any PNG art the ground layer is blitted first and the units layer is cleared, so art sprites can sit between them
  const hi = BLOW && HAS_ART && (bg || b.units.some((u) => artUnit(u, 0, "normal")));
  if (bg) { c.clearRect(0, 0, BW, BH); out.clearRect(0, 0, BW, BH); out.save(); out.imageSmoothingEnabled = false; out.drawImage(bg, 0, 0, BW, BH); out.restore(); }
  else {
  const sky = c.createLinearGradient(0, 0, 0, BH);
  const sk = day ? z.sky : z.skyN;
  sky.addColorStop(0, sk[1]); sky.addColorStop(0.6, sk[0]); sky.addColorStop(1, sk[0]);
  c.fillStyle = sky; c.fillRect(0, 0, BW, BH);
  drawDecor(c, z.decor, t, day);
  c.fillStyle = day ? z.ground : z.groundN; c.beginPath(); c.moveTo(0, 70); c.quadraticCurveTo(BW / 2, 52, BW, 70); c.lineTo(BW, BH); c.lineTo(0, BH); c.fill();
  c.fillStyle = "#00000014"; for (let i = 0; i < 40; i++) { const x = (i * 97) % BW, y = 80 + ((i * 53) % 140); c.fillRect(x, y, 2, 5); }
  }
  if (!X.duel && !X.deep) drawSap(c, battle.boss || X.savia || X.echo ? 3 : saviaLvl(X.zone), REDUCE ? 0 : t, BW, BH);
  // the 6 formation cells of each side as tiles (sharp on the full canvas when the art layer is split, see below)
  if (!(BLOW && HAS_ART && (bg || b.units.some((u) => artUnit(u, 0, "normal"))))) drawTiles(c);
  if (BLOW) { c.setTransform(1, 0, 0, 1, 0, 0); PX.quantize(c, BW / 2, BH / 2, !bg); c.scale(0.5, 0.5); }
  if (hi) {
    if (!bg) out.clearRect(0, 0, BW, BH);
    PX.blit(out, BLOW, BW, BH);
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, BW / 2, BH / 2); c.scale(0.5, 0.5);
    drawTiles(out);
  }
  // units
  const order = b.units.slice().sort((p, q) => battle.anim[p.uid].y - battle.anim[q.uid].y);
  const place = [];
  for (const u of order) {
    const a = battle.anim[u.uid];
    // moving: a quick hop of a few steps towards the new cell; two creatures swapping pass side by side
    let hopX = 0, hopY = 0, walk = -1, face = 0;
    if (u.pos != null) {
      const [tx, ty] = cellXY(u.side, u.pos);
      if ((!a.mv && (Math.abs(tx - a.x) > 1 || Math.abs(ty - a.y) > 1)) || (a.mv && (a.mv.tx !== tx || a.mv.ty !== ty))) a.mv = { fx: a.x, fy: a.y, tx, ty, t0: now, dur: REDUCE ? 1 : 300 / speed() };
      const mv = a.mv;
      if (mv) {
        const k = Math.min(1, (now - mv.t0) / mv.dur), e = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
        const dx = mv.tx - mv.fx, dy = mv.ty - mv.fy, len = Math.hypot(dx, dy) || 1, arc = Math.sin(k * Math.PI);
        a.x = mv.fx + dx * e; a.y = mv.fy + dy * e;
        hopX = Math.round(-dy / len * arc * 12); hopY = Math.round(dx / len * arc * 12) - Math.round(Math.abs(Math.sin(k * Math.PI * 2)) * 5);
        walk = Math.floor(k * 4) % 2; if (Math.abs(dx) > Math.abs(dy)) face = dx > 0 ? 1 : -1;
        if (k >= 1) { a.x = mv.tx; a.y = mv.ty; a.mv = null; }
      }
    }
    const held = pendFor(u.uid);
    if (!held) a.hpT = u.hp;
    if (!stopped) { a.lunge = Math.max(0, a.lunge - 0.06); a.flash = Math.max(0, a.flash - 0.07); a.kb = Math.max(0, a.kb - 0.14); if (a.sil > 0) a.sil--; }
    a.shownHp += (a.hpT - a.shownHp) * 0.15;
    const dir = u.side === "ally" ? 1 : -1;
    const art = hi && artUnit(u, 0, "normal"), spr = BLOW && !art && evsKind(u.kind), cp = (spr || (art && HAS_EVS)) ? castPose(u, now) : null;
    if (cp) a.lunge = 0;
    // defeat shows only once the blow that caused it has landed
    const ko = u.hp <= 0 && !held;
    if (ko && a.koT == null) a.koT = now; else if (!ko) a.koT = null;
    const koEl = ko ? now - a.koT : 0, gone = ko && (REDUCE ? koEl > 0 : koEl > 340);
    if (gone) { if (!REDUCE) drawPuff(out, Math.round(a.x / 2) * 2, a.y, koEl, u.boss); continue; }
    const lx = Math.round(Math.sin(a.lunge * Math.PI) * 9 * dir) * 2 + basicPose(u, now) - Math.round(a.kb * 4 * dir / 2) * 2;
    const x = Math.round((a.x + lx + hopX) / 2) * 2, y = Math.round(a.y) + hopY + (ko ? Math.round(koEl / 340 * 6) : 0);
    place.push({ u, a, x, y, ko });
    if (ko && Math.floor(koEl / 60) % 2) continue; // blinking as it falls
    // wind-up: a glow of the card's type grows behind the caster before it lets go
    const cs0 = battle.cast;
    if (cs0 && cs0.uid === u.uid && !REDUCE) { const kk = (now - cs0.t0) / cs0.dur; if (kk < 0.3) glow(out, x, y - 6, u.boss ? 44 : 30, TCOL[CARDS[cs0.id] && CARDS[cs0.id].type] || "#fbf6ef", 0.9 * Math.sin(kk / 0.3 * Math.PI)); }
    c.save(); c.translate(x, y);
    if (art) {
      // PNG cell straight onto the full-size canvas: feet stand on the cell's y = n - 4
      const emo = ko ? "sad" : a.flash > 0.5 ? "surprised" : cp ? "happy" : u.hp / u.maxHp < 0.3 ? "sad" : "normal";
      const sq = cp && cp.sq != null ? cp.sq : walk >= 0 ? walk : REDUCE ? 0 : Math.floor(t * 2 + a.x / 50) % 2;
      let im = bigArt(artUnit(u, sq, emo) || art, u);
      if (u.hollow) im = artHollow(im);
      if ((cp && cp.flash || a.sil > 0) && HAS_EVS) im = EVS.silhouette(im, a.sil > 0 ? "#ffffff" : undefined);
      const n = im.width, feet = u.boss ? 24 : 16;
      const hov = !REDUCE && evsKind(u.kind) && EVS.hovers(u.kind) ? Math.round(Math.sin(t * 2 + a.x)) * 2 - 4 : 0;
      out.save(); out.translate(x, y); out.imageSmoothingEnabled = false;
      out.fillStyle = "rgba(29,22,38,.35)"; out.fillRect(-Math.round(n * 0.2), feet - 2, Math.round(n * 0.4), 4);
      if (ko) out.globalAlpha = 0.35; else if (cp && cp.alpha != null) out.globalAlpha = cp.alpha;
      out.translate(cp ? cp.dx * 2 : 0, (cp ? cp.dy * 2 : 0) + hov);
      if (cp && cp.sq === 1) { out.translate(0, feet); out.scale(1.08, 0.9); out.translate(0, -feet); }
      if (u.side === "foe") out.scale(-1, 1);
      if (face && (face > 0) !== (u.side === "ally")) out.scale(-1, 1);
      out.drawImage(im, -Math.round(n / 2), feet - n + 2);
      out.restore();
    } else if (spr) {
      // pixel sprite: 1 sprite pixel = 2 battle units (the layer is drawn at half size)
      const n = u.boss ? 48 : 36, emo = ko ? "sad" : a.flash > 0.5 ? "surprised" : cp ? "happy" : u.hp / u.maxHp < 0.3 ? "sad" : "normal";
      const frame = cp && cp.sq != null ? cp.sq : walk >= 0 ? walk : REDUCE ? 0 : Math.floor(t * 2 + a.x / 50) % 2;
      let im = EVS.sprite(u.kind, n, u.own ? Math.max(0, Math.min(2, u.stage)) : 1, frame, emo, !!u.hollow);
      if (cp && cp.flash || a.sil > 0) im = EVS.silhouette(im, a.sil > 0 ? "#ffffff" : undefined);
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
    if (a.flash > 0 && !art && !spr) { c.save(); c.globalAlpha = a.flash * 0.6; c.fillStyle = "#ffffff"; EV.ell(c, 0, -4, 22 * (u.boss ? 1.5 : 1), 22 * (u.boss ? 1.8 : 1)); c.fill(); c.restore(); }
    // shield ring
    if (u.shield > 0) { c.save(); c.strokeStyle = "#7cc8e3"; c.lineWidth = 2; c.beginPath(); c.arc(0, -8, u.boss ? 44 : 28, 0, Math.PI * 2); c.stroke(); c.restore(); }
    c.restore();
  }
  // health bars after every creature, so the one standing in the lane below never covers them
  for (const { u, a, x, y, ko } of place) {
    const bw = u.boss ? 80 : 50, by = u.boss ? 30 : 18;
    c.save(); c.translate(x, y);
    c.fillStyle = "#1d1626"; c.fillRect(-bw / 2 - 2, by - 2, bw + 4, 8);
    const pct = Math.max(0, a.shownHp / u.maxHp), col = pct > 0.5 ? "#86b85a" : pct > 0.25 ? "#ffd57a" : "#e0603f";
    c.fillStyle = col; const segs = Math.ceil((bw / 4) * pct); for (let k = 0; k < segs; k++) c.fillRect(-bw / 2 + k * 4, by, 2, 4);
    if (u.shield > 0) { c.fillStyle = "#c8eef5"; c.fillRect(-bw / 2, by, Math.min(bw, bw * u.shield / u.maxHp), 2); }
    if (u.defending && !ko) { c.fillStyle = "#7cc8e3"; c.fillRect(-bw / 2 - 8, by - 2, 4, 6); c.fillStyle = "#1d1626"; c.fillRect(-bw / 2 - 8, by + 4, 4, 1); }
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
  if (BLOW) { c.setTransform(1, 0, 0, 1, 0, 0); PX.quantize(c, BW / 2, BH / 2, false); if (!hi) out.clearRect(0, 0, BW, BH); PX.blit(out, BLOW, BW, BH); }
  // the card effect's light, sharp and additive on top of the pixels
  if (cs && battle.cast && HAS_EVS && EVS.fxGlow) {
    const k = (now - cs.t0) / cs.dur, pos = (uid) => { const q = battle.anim[uid]; return q ? { x: Math.round(q.x / 2), y: Math.round(q.y / 2) - 4 } : null; };
    const f = pos(cs.uid), tg = cs.tg.map(pos).filter(Boolean), dir = (b.units.find((x) => x.uid === cs.uid) || {}).side === "ally" ? 1 : -1;
    if (f) { const G = EVS.fxGlow(cs.id, k, { x: f.x + 6 * dir, y: f.y }, tg[0] || f, tg.length ? tg : [f]); for (const sp of G.spots) glow(out, sp.x * 2, sp.y * 2, sp.r * 2, G.col, sp.a); }
  }
  // the back row's basic attack: a small shot of its type in an arc
  const bm = battle.basic;
  if (bm) {
    const k = (now - bm.t0) / bm.dur, f = battle.anim[bm.uid], q = battle.anim[bm.tg[0]];
    if (k >= 1 || !f) battle.basic = null;
    else if (!bm.front && q && k > 0.12 && k < 0.45) {
      const kk = (k - 0.12) / 0.33, px = f.x + (q.x - f.x) * kk, py = f.y - 10 + (q.y - f.y) * kk - Math.sin(kk * Math.PI) * 18;
      for (let i = 3; i >= 0; i--) { const k2 = Math.max(0, kk - i * 0.06), tx2 = f.x + (q.x - f.x) * k2, ty2 = f.y - 10 + (q.y - f.y) * k2 - Math.sin(k2 * Math.PI) * 18; out.globalAlpha = 1 - i * 0.22; out.fillStyle = i ? bm.col : "#fbf6ef"; out.fillRect(Math.round(tx2 / 2) * 2 - (i ? 2 : 3), Math.round(ty2 / 2) * 2 - (i ? 2 : 3), i ? 4 : 6, i ? 4 : 6); }
      out.globalAlpha = 1; glow(out, px, py, 16, bm.col, 0.7);
    } else if (q && k >= 0.45 && k < 0.7) glow(out, q.x, q.y - 10, 22, bm.col, 1 - (k - 0.45) / 0.25);
  }
  // names, status icons and floating numbers stay sharp
  const font = (w, px) => `${w} ${px}px "EvNum", "Pixelify Sans", system-ui, sans-serif`;
  // states as small circles: green buffs in a row over the head, red debuffs at the feet; names and levels are in the
  // list under the field
  for (const { u, x, y, ko } of place) {
    if (ko) continue;
    const ks = Object.keys(u.st);
    drawStRow(out, u, ks.filter((k) => !STATUS[k].neg), x, y - (u.boss ? 52 : 22), true);
    drawStRow(out, u, ks.filter((k) => STATUS[k].neg), x, y + (u.boss ? 14 : 6), false);
  }
  if (now - battle.teamT > 200) { battle.teamT = now; renderTeam(); }
  drawThreats(out, now);
  drawStrip(out, now);
  if (battle.aim) drawAim(out, now);
  drawBanner(out, now);
  for (const f of battle.floats) {
    f.life -= 0.016; f.y -= f.vy == null ? 0.45 : f.vy;
    out.save(); out.globalAlpha = Math.max(0, Math.min(1, f.life)); out.textAlign = "center";
    out.font = f.big ? font(700, 17) : f.small ? font(600, 10) : font(700, 14);
    out.lineWidth = 3; out.lineJoin = "round"; out.strokeStyle = f.stroke || "#1d1626"; const fy = Math.max(52, Math.round(f.y)); out.strokeText(f.text, f.x, fy); out.fillStyle = f.col; out.fillText(f.text, f.x, fy); out.restore();
  }
  battle.floats = battle.floats.filter((f) => f.life > 0);
  battle.raf = requestAnimationFrame(drawBattle);
}
