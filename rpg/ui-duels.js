/* Evolvlings RPG: ghost teams (MiniTroopers idea 3, approved by Jose).
   - Your team (your creature plus your saved companions, with cards, talents and traits) becomes a short code you can
     send to a friend. Pasting a friend's code saves their team as a rival you can fight, played by the AI.
   - Every week four neighbours of El Vado (Ruda, Bruno, Esporina, Mirlo) bring teams built around one type circle,
     a little stronger each step of the ladder.
   Duels are free: no energy, no wounds, and losing costs nothing. Only the first win against each team gives a reward
   (neighbours once a week, friends' codes once per team, up to DUEL_PAID_MAX a week). Saved in P.duel. */
"use strict";
const DUEL_PREFIX = "EVO1-", DUEL_RIVALS_MAX = 6, DUEL_PAID_MAX = 3, DUEL_FRIEND_REW = { c: 20, d: 5 };
const NEIGHBOURS = [
  { id: "ruda", circle: "sol", d: -1, g: 0, rew: { c: 15, d: 3 } },
  { id: "bruno", circle: "lake", d: 0, g: 0, rew: { c: 20, d: 4 } },
  { id: "esporina", circle: "frost", d: 1, g: 1, rew: { c: 25, d: 6 } },
  { id: "mirlo", circle: "sky", d: 2, g: 1, rew: { c: 30, d: 8, n: 1 } },
];
const duelSlice = EV.slice("duel", () => ({ wk: "", won: {}, rivals: [], paid: 0 }));
function duelState() {
  const D = duelSlice(), wk = EV.DAILY ? EV.DAILY.weekKey() : "";
  if (D.wk !== wk) { D.wk = wk; D.won = {}; D.paid = 0; }
  return D;
}
const duelOpen = () => Object.values(EV.P.cleared || {}).some((n) => n > 0);
// a small seeded random so a neighbour's team stays the same all week
function seeded(str) { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
const STORY_KINDS = ["lumo", "fizz", "pebb", "unisona"];
const duelKinds = (circle) => Object.keys(MONS).filter((k) => !MONS[k].boss && !MONS[k].story && !STORY_KINDS.includes(k) && CIRCLE[MONS[k].types[0]] === circle);
// a neighbour's team this week, as members in the same shape as a team code
function neighbourTeam(n) {
  const R = rpgState(), r = seeded(duelState().wk + ":" + n.id), pool = duelKinds(n.circle), out = [];
  const lvl = Math.max(1, (R ? R.lvl : 1) + n.d);
  const rest = Object.keys(CIRCLE).map((t) => CIRCLE[t]).filter((c, i, a) => c !== n.circle && a.indexOf(c) === i).flatMap(duelKinds);
  while (out.length < 3 && (pool.length || rest.length)) {
    if (!pool.length) pool.push(rest.splice(Math.floor(r() * rest.length), 1)[0]);
    const k = pool.splice(Math.floor(r() * pool.length), 1)[0], mc = MONS[k].cards;
    const c = { a: [mc[0], n.g], p: [mc[1], n.g] };
    if (lvl >= SLOT_LVL.s) c.s = [mc[2], n.g];
    let t = ""; for (let i = 0; i < talentTiers(lvl); i++) t += r() < 0.5 ? "o" : "d";
    out.push({ k, l: lvl, c, t, b: BIRTH_KEYS[Math.floor(r() * BIRTH_KEYS.length)] });
  }
  return out;
}
/* ---------- team codes ---------- */
// the cards a companion takes on a trip, the same way partyUnits builds them
function compCardsOf(k, lvl) {
  const ref = refOf(k), g = ref ? ref.grade : 0, mc = MONS[k].cards;
  const c = { a: [mc[0], g], p: [mc[1], g] };
  if (lvl >= SLOT_LVL.s) c.s = [mc[2], g];
  for (const s of ["a", "p", "s"]) { const cc = compCard(k, s); if (cc) c[s] = [cc.id, cc.g]; }
  return c;
}
function myTeam() {
  const S = EV.S, R = rpgState(); if (!S || !R || S.stage < 1) return null;
  const c = {};
  for (const k of ["a", "p", "s"]) { const cd = R.eq[k] && cardByUid(R.eq[k]); if (cd && R.lvl >= SLOT_LVL[k]) c[k] = [cd.id, cd.g]; }
  const t = [{ k: S.species, l: R.lvl, s: S.stage, f: S.form || "bright", c, t: R.tal || "" }];
  for (const k of teamState().comp) {
    const ro = rosterOf(k); if (!ro || !MONS[k]) continue;
    t.push({ k, l: ro.lvl, c: compCardsOf(k, ro.lvl), t: ro.tal || "", b: birthKey(k, ro), st: ro.st || 0, bo: refOf(k) ? refOf(k).bond : 0 });
  }
  return { n: S.name || monName(S.species), t };
}
const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
function teamCode() {
  const T = myTeam(); return T ? DUEL_PREFIX + b64(JSON.stringify(T)) : "";
}
// reads a pasted code; returns a clean team or null. Everything is checked, since the text comes from outside the game.
function parseCode(raw) {
  const s = String(raw || "").replace(/\s+/g, "");
  if (!s.startsWith(DUEL_PREFIX) || s.length > 4000) return null;
  let o; try { o = JSON.parse(unb64(s.slice(DUEL_PREFIX.length))); } catch (e) { return null; }
  if (!o || typeof o !== "object" || !Array.isArray(o.t) || !o.t.length || o.t.length > 3) return null;
  const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
  const t = [];
  for (const m of o.t) {
    if (!m || typeof m.k !== "string" || !MONS[m.k] || MONS[m.k].boss) return null;
    const l = int(m.l, 1, 99); if (l == null) return null;
    const c = {};
    for (const k of ["a", "p", "s"]) {
      const v = m.c && m.c[k]; if (v == null) continue;
      if (!Array.isArray(v) || !CARDS[v[0]] || int(v[1], 0, GRADES.length - 1) == null) return null;
      c[k] = [v[0], v[1]];
    }
    const mm = { k: m.k, l, c, t: typeof m.t === "string" && /^[od]{0,40}$/.test(m.t) ? m.t : "" };
    if (m.s != null) { if (int(m.s, 1, 2) == null) return null; mm.s = m.s; mm.f = m.f === "scruffy" ? "scruffy" : "bright"; }
    if (m.b != null) { if (!BIRTH[m.b]) return null; mm.b = m.b; }
    mm.st = int(m.st, 0, 5) || 0; mm.bo = int(m.bo, 0, 10) || 0;
    t.push(mm);
  }
  const n = typeof o.n === "string" ? o.n.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 20) : "";
  return { n: n || tx("duel.friend"), t };
}
const codeId = (s) => { let h = 5381; for (const ch of s.replace(/\s+/g, "")) h = (h * 33 + ch.charCodeAt(0)) >>> 0; return "f" + h.toString(36); };
function importCode(raw) {
  const T = parseCode(raw);
  if (!T) { EV.toast(tx("duel.bad")); EV.sfx("deny"); return false; }
  const D = duelState(), id = codeId(raw);
  if (D.rivals.some((r) => r.id === id)) { EV.toast(tx("duel.have", { n: T.n })); return false; }
  D.rivals.unshift({ id, n: T.n, t: T.t, won: 0 });
  D.rivals = D.rivals.slice(0, DUEL_RIVALS_MAX);
  EV.toast(tx("duel.added", { n: T.n }), "⚔️"); EV.sfx("card"); EV.saveProfile();
  return true;
}
/* ---------- fighting ---------- */
const duelFoe = (id) => { const n = NEIGHBOURS.find((x) => x.id === id); if (n) return { id, n: tx("duel.n." + id), t: neighbourTeam(n), nb: n }; const r = duelState().rivals.find((x) => x.id === id); return r ? { id, n: r.n, t: r.t, rival: r } : null; };
const ladderOpen = (i) => i === 0 || !!duelState().won[NEIGHBOURS[i - 1].id];
function startDuel(id) {
  const f = duelFoe(id), i = NEIGHBOURS.findIndex((x) => x.id === id);
  if (!f || (i >= 0 && !ladderOpen(i))) { EV.sfx("deny"); return; }
  pickZone("aurora", { duel: id });
}
function duelFoes() {
  const f = duelFoe(X.duel); if (!f) return [];
  return f.t.map((m) => {
    const cards = {}; for (const k in m.c) cards[k] = scaled(m.c[k][0], m.c[k][1]);
    return makeUnit({ kind: m.k, lvl: m.l, side: "foe", name: monName(m.k), cards, stage: m.s || 1, form: m.f || "bright", bond: m.bo || 0, star: m.st || 0, wild: !m.s, tal: companionTal(m.k, m.l, { tal: m.t, bt: m.b, at: 0 }) });
  });
}
// the end of a duel: no wounds, no experience; a reward only the first time you beat this team
function duelFinish(res) {
  const P = EV.P, D = duelState(), f = duelFoe(X.duel);
  let rew = null, capped = false;
  if (res === "win" && f) {
    P.c.duelWins = (P.c.duelWins || 0) + 1;
    if (f.nb && !D.won[f.id]) { D.won[f.id] = 1; rew = f.nb.rew; }
    else if (f.rival && !f.rival.won) { f.rival.won = 1; if (D.paid < DUEL_PAID_MAX) { D.paid++; rew = DUEL_FRIEND_REW; } else capped = true; }
    if (rew) { EV.addCoins(rew.c, true); P.dust = (P.dust || 0) + (rew.d || 0); if (rew.n) P.notes = (P.notes || 0) + rew.n; }
  }
  X.end = { res, duel: true, name: f ? f.n : "", rew, capped, xp: 0, coins: 0, before: 0, after: 0, unlocked: [], cards: [], bondNews: [] };
  EV.save(); EV.saveProfile(); EV.checkAch();
  show("end");
}
function duelEndHtml() {
  const e = X.end, nm = EV.S && EV.S.name ? EV.S.name : "";
  let h = `<h3>${esc(tx(e.res === "win" ? "duel.win" : e.res === "quit" ? "end.quit" : "duel.lose", { n: e.name }))}</h3><p class="evt-text">${esc(tx(e.res === "win" ? "duel.winText" : "duel.loseText", { n: e.name, name: nm }))}</p>`;
  if (e.rew) h += `<p class="evt-out">✦ ${esc(tx("duel.rew", { what: duelRewTxt(e.rew) }))}</p>`;
  else if (e.res === "win") h += `<p class="evt-out">${esc(tx(e.capped ? "duel.capped" : "duel.again"))}</p>`;
  h += `<p class="evt-out">${esc(tx("duel.free", { name: nm }))}</p>`;
  h += `<div class="bctl"><button class="btn" type="button" data-x="home">${esc(tx("end.home"))}</button><button class="btn ghost" type="button" data-dx="again">${esc(tx("duel.retry"))}</button></div>`;
  return sceneCard(h);
}
const duelRewTxt = (r) => [`✦ ${r.c}`, r.d ? `∴ ${r.d}` : "", r.n ? `♪ ${r.n}` : ""].filter(Boolean).join(" · ");
/* ---------- the Duels tab of the expedition screen ---------- */
function teamMini(t) { return `<span class="duel-team">${t.map((m) => `<span title="${esc(monName(m.k))} · ${esc(tx("sh.lvl", { n: m.l }))}">${tyIcon(MONS[m.k].types[0])}<small>${m.l}</small></span>`).join("")}</span>`; }
function duelHtml() {
  let h = `<h3 class="cat-title">${esc(tx("duel.title"))}</h3><p class="muted" style="margin:0">${esc(tx("duel.sub"))}</p>`;
  if (!duelOpen()) return h + `<p class="muted">🔒 ${esc(tx("duel.lock"))}</p>`;
  const D = duelState();
  h += `<h4 class="duel-h">${esc(tx("duel.ladder"))}</h4><div class="duel-list">`;
  NEIGHBOURS.forEach((n, i) => {
    const open = ladderOpen(i), won = !!D.won[n.id], t = neighbourTeam(n);
    h += `<button type="button" class="lrow duel-row${won ? " done" : ""}" data-duel="${n.id}" ${open ? "" : "disabled"}><div class="lr-txt"><span class="lr-slot">${esc(tx("duel.step", { n: i + 1 }))} · ${esc(tx("duel.c." + n.circle))}</span><strong>${esc(tx("duel.n." + n.id))}</strong><span class="lr-fx">${esc(tx("duel.q." + n.id))}</span>${teamMini(t)}</div><small class="ok">${open ? (won ? "✓ " + esc(tx("duel.beaten")) : esc(duelRewTxt(n.rew))) : "🔒"}</small></button>`;
  });
  h += `</div><p class="muted" style="margin:6px 0 0">${esc(tx("duel.week"))}</p>`;
  h += `<h4 class="duel-h">${esc(tx("duel.friends"))}</h4>`;
  if (D.rivals.length) h += `<div class="duel-list">${D.rivals.map((r) => `<div class="duel-friend"><button type="button" class="lrow duel-row${r.won ? " done" : ""}" data-duel="${r.id}"><div class="lr-txt"><strong>${esc(tx("duel.of", { n: r.n }))}</strong>${teamMini(r.t)}</div><small class="ok">${r.won ? "✓ " + esc(tx("duel.beaten")) : esc(duelRewTxt(DUEL_FRIEND_REW))}</small></button><button type="button" class="btn ghost duel-x" data-dx="del" data-id="${r.id}" aria-label="${esc(tx("duel.del", { n: r.n }))}">✕</button></div>`).join("")}</div>`;
  else h += `<p class="muted" style="margin:0">${esc(tx("duel.none"))}</p>`;
  h += `<label class="duel-lbl" for="duelIn">${esc(tx("duel.paste"))}</label><div class="duel-io"><input id="duelIn" type="text" autocomplete="off" spellcheck="false" placeholder="${DUEL_PREFIX}…"><button class="btn" type="button" data-dx="add">${esc(tx("duel.add"))}</button></div>`;
  const code = teamCode();
  if (code) h += `<label class="duel-lbl" for="duelOut">${esc(tx("duel.mine"))}</label><div class="duel-io"><input id="duelOut" type="text" readonly value="${esc(code)}"><button class="btn ghost" type="button" data-dx="copy">${esc(tx("duel.copy"))}</button></div><p class="muted" style="margin:0">${esc(tx("duel.mineSub"))}</p>`;
  return h;
}
// clicks on the Duels tab and the duel end card; returns true when handled
function duelClick(t) {
  const d = t.dataset;
  if (d.duel) { EV.sfx("tap"); startDuel(d.duel); return true; }
  if (!d.dx) return false;
  if (d.dx === "add") { const el = $("duelIn"); if (el && importCode(el.value)) render(); return true; }
  if (d.dx === "copy") {
    const el = $("duelOut"); if (!el) return true;
    el.select();
    const ok = () => { EV.toast(tx("duel.copied"), "📋"); EV.sfx("tap"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(el.value).then(ok, () => { try { document.execCommand("copy"); ok(); } catch (e) { /* the text stays selected */ } });
    else { try { document.execCommand("copy"); ok(); } catch (e) { /* the text stays selected */ } }
    return true;
  }
  if (d.dx === "del") { const D = duelState(); D.rivals = D.rivals.filter((r) => r.id !== d.id); EV.sfx("tap"); EV.saveProfile(); render(); return true; }
  if (d.dx === "again") { const id = X.duel; goHome(); startExpedition(); if (X) { ztab = "duel"; startDuel(id); } return true; }
  return false;
}
