/* Evolvlings RPG: the Caretaker's Book (plan https://claude.ai/artifact/ShBFpCPxKnsPHppSMNS9NK, delivery 1).
   An open book over the game: ribbon tabs with icons on the side, the list on the left page and the detail of the
   picked entry on the right one (tabs on top and pages stacked on a phone). It only shows what the Caretaker has seen
   or heard: the rest stays grey or "???", and people go by their trade until their name is heard (rpg/ui-talk.js).
   Sections so far:
     diario    every conversation you lived, copied line by line: the questions you asked and the way you took; the
               ones you skipped are grey lines, the endings you did not choose are grey boxes (EV.P.diary)
     cartas    the Grimoire (it moved here from the Cards panel): every card by circle and type, and crafting; its story
               opens with the best grade you own (Rare scene, Super rare what nobody sees, Epic the thread,
               rpg/data-lore-cards.js)
     zonas     every zone: the foes you can meet there and how often, its guardian, verse, encounters lived and Sap
     bestiario the foes you fought: an entry after 3 wins (guardians after 1), with stats at the levels you beat them,
               their cards, where they live and what is said of them (EV.P.bst[kind] = { w wins, lv highest level, l {lvl:1} })
     criaturas your creature and your Refuge companions: stages, stats, talents, and their story, opened by level
               (habits at 5, what their people say at 15, what the Sap does at 30, rpg/data-lore-mons.js) and stars
               (the two FRAG pieces of eggs.js at ★2 and ★4)
     gente     the people of the Glade you met or heard named: by their trade until you know their name, the
               conversations they spoke in (a tap opens that Diary page), the lines you heard from them and about them
     escritos  the Writings you found, and the Threads two of them make together
   EV.P.bookNew holds the sections with something new (a dot on the ribbon and on the button). Classic script: it uses
   the shared rpg/*.js names (TALK, CARDS, cardHtml...). */
"use strict";
const BOOK_ICON = {
  diario: '<path d="M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 8h7M9 12h7M9 16h4" stroke="currentColor" stroke-width="2"/>',
  cartas: '<rect x="4" y="5" width="11" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 4.5l9 2.5-3 13" fill="none" stroke="currentColor" stroke-width="2"/>',
  zonas: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 3v15M15 6v15" stroke="currentColor" stroke-width="2"/>',
  bestiario: '<circle cx="7" cy="8" r="2.2" fill="currentColor"/><circle cx="12" cy="6" r="2.2" fill="currentColor"/><circle cx="17" cy="8" r="2.2" fill="currentColor"/><path d="M6 17c0-4 3-6 6-6s6 2 6 6c0 2-2 3-6 3s-6-1-6-3z" fill="currentColor"/>',
  criaturas: '<ellipse cx="12" cy="13" rx="6.5" ry="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 13l2.5-2 2 2.5 2-2.5 1.5 1.5" fill="none" stroke="currentColor" stroke-width="2"/>',
  gente: '<circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16.5" cy="9" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 19c0-3.5 2.5-5.5 5.5-5.5s5.5 2 5.5 5.5M14 14c3.5-.8 6.5 1 6.5 4.5" fill="none" stroke="currentColor" stroke-width="2"/>',
  escritos: '<path d="M6 4h10l3 3v13H6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 10h7M9 14h7" stroke="currentColor" stroke-width="2"/>',
};
const BOOK_SVG = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${BOOK_ICON[k]}</svg>`;
const BOOK_TABS = [["diario", "#a3343b"], ["criaturas", "#b0782a"], ["gente", "#3f7f86"], ["zonas", "#8a6a3a"], ["bestiario", "#4f9a3c"], ["cartas", "#2f5d96"], ["escritos", "#6e6283"]];
// view: on a narrow screen the book shows one page at a time, "list" or "page" (wider screens always show both)
const BK = { open: false, tab: "diario", sel: {}, view: "list", paintRun: 0 };
const bookNarrow = () => matchMedia("(max-width: 599px)").matches;
const bookNew = () => EV.P.bookNew || (EV.P.bookNew = {});
const bt = (k, v) => tx("book." + k, v);
// every page opens with a picture (a "plate") and every list line has a small one. PNG art goes in by its path, which
// works before the file has finished loading (the one-file build has it inline); drawn scenes are painted in bookMount.
const artSrc = (p) => { const A = window.EVART; if (!A) return null; const im = A.image(p); if (im) return im.src; const I = window.EVART_INLINE; return I && I[p] ? I[p] : A.files.includes(p) ? "art/" + p : null; };
const artImg = (p, cls, alt) => { const s = artSrc(p); return s ? `<img class="${cls}" src="${s}" alt="${esc(alt || "")}" loading="lazy" decoding="async">` : ""; };
const zoneBg = (z) => artSrc("battle/" + (ZONES[z] ? z : "aurora") + "-day.png");
// a person's face (rpg/data-faces.js): the first trade label that has one
const personFace = (p) => { const F = window.EVFACES; if (!F || !PPL[p]) return null; for (const w of PPL[p].who) { const f = F.of(w); if (f) return f; } return null; };
const plate = (inner, cls, bg) => `<figure class="bk-plate${cls ? " " + cls : ""}"${bg ? ` style="background-image:url('${bg}')"` : ""}>${inner}</figure>`;
// a drawn scene: "ev:<event id>[:zone]" (falls back to the zone's road) or "pz:<zone>:<pause kind>"
const sceneBox = (key, cls) => `<canvas class="${cls || "bk-scn"}" width="256" height="192" data-bkpic="${key}" role="img" aria-hidden="true"></canvas>`;
const thumbBox = (key, dark) => `<canvas class="bk-th${dark ? " dark" : ""}" width="64" height="48" data-bkpic="${key}" aria-hidden="true"></canvas>`;
const monThumb = (k, sil) => `<canvas class="bk-th mon${sil ? " sil" : ""}" width="96" height="80" data-mon="${k}" aria-hidden="true"></canvas>`;

/* ---------- old saves: conversations lived before the book keep their opening lines ---------- */
function bookSeed() {
  const P = EV.P; if (P.diarySeeded) return;
  P.diarySeeded = 1;
  for (const id in P.talkSeen || {}) {
    const ev = talkEv(id); if (!ev) continue;
    const R = diaryRec(id); if (!R) continue;
    R.v[ev.start] = 1; R.n = Math.max(R.n, 1); R.old = 1;
    for (const s of ev.nodes[ev.start].say) if (s[0]) hearNames(s[1]);
  }
  P.bookNew = {};
}

/* ---------- Diary ---------- */
const DZONES = () => Object.keys(ZONES).filter((z) => TALK[z]).concat(TALK.common ? ["common"] : []);
const evTitle = (id) => { const t = window.EVPEOPLE && EVPEOPLE.TITLES[id]; return t ? t[L() === "en" ? 1 : 0] : id; };
const zoneLabel = (z) => (z === "common" ? bt("common") : zt("name", null, z));
// the endings of a conversation: nodes with "end"
const evEnds = (ev) => Object.keys(ev.nodes).filter((n) => ev.nodes[n].end);
// conversations of an era the Glade has not reached yet stay out of the Diary (rpg/ui-eras.js)
const evLater = (ev) => ((ev.need && ev.need.era) || 1) > (window.EVERA ? EVERA.now() : 1);
function diaryCounts(z) {
  const D = diarySlice(); let lived = 0, ends = 0, seen = 0, all = 0;
  for (const id in TALK[z]) {
    const ev = TALK[z][id], R = D[z + "/" + id], E = evEnds(ev);
    if (!R && evLater(ev)) continue;
    all++; ends += E.length;
    if (R) { lived++; seen += E.filter((n) => R.v[n]).length; }
  }
  return { lived, all, seen, ends };
}
function diaryList() {
  const D = diarySlice();
  let h = "";
  for (const z of DZONES()) {
    const c = diaryCounts(z);
    if (!c.lived && z !== "aurora") continue; // zones you never walked stay out of the book
    h += `<p class="bk-grp">${esc(zoneLabel(z))} <small>${c.lived} / ${c.all}</small></p><ul class="bk-list">`;
    const ids = Object.keys(TALK[z]).sort((a, b) => ((D[z + "/" + a] || {}).t || 1e9) - ((D[z + "/" + b] || {}).t || 1e9));
    for (const id of ids) {
      const k = z + "/" + id, R = D[k], ev = TALK[z][id], E = evEnds(ev);
      if (!R && evLater(ev)) continue;
      if (!R) { h += `<li><button type="button" class="bk-it locked" data-bksel="${k}"${BK.sel.diario === k ? ' aria-current="true"' : ""}><span class="bk-th q">?</span><span class="bk-nm">???<small>${esc(bt("notLived"))}</small></span><span class="bk-ct">0 / ${E.length}</span></button></li>`; continue; }
      h += `<li><button type="button" class="bk-it" data-bksel="${k}"${BK.sel.diario === k ? ' aria-current="true"' : ""}>${thumbBox("ev:" + id + ":" + z)}<span class="bk-nm">${esc(evTitle(id))}<small>${esc(tx("talk.k." + ev.kind))}</small></span><span class="bk-ct">${E.filter((n) => R.v[n]).length} / ${E.length}</span></button></li>`;
    }
    h += `</ul>`;
  }
  return h;
}
// the flags a node or an option sets
const fxFlags = (fx) => (fx && fx.flag ? [].concat(fx.flag) : []);
// where a flag comes back: the conversations with an option that needs it
function flagReturns(flag, selfKey) {
  const out = [];
  for (const z in TALK) for (const id in TALK[z]) {
    const k = z + "/" + id; if (k === selfKey) continue;
    const ev = TALK[z][id];
    if (Object.values(ev.nodes).some((n) => (n.opts || []).some((o) => o.cNeed === flag))) out.push(k);
  }
  return out;
}
function diaryPage(k) {
  const [z, id] = k.split("/"), ev = TALK[z] && TALK[z][id]; if (!ev) return "";
  const R = diarySlice()[k];
  if (!R) return `<h3>???</h3><p class="bk-sub">${esc(bt("notLivedLong", { z: zoneLabel(z) }))}</p>${plate(sceneBox("pz:" + z + ":camino"), "dark")}`;
  const W = talkText(id), q = L() === "en" ? ["“", "”"] : ["«", "»"], shown = new Set(), flags = [];
  const lines = (nid) => ev.nodes[nid].say.map((s, i) => {
    const t = W.say(nid, i);
    return s[0] ? `<p class="bk-say"><b>${esc(W.who(s[0]))}:</b> ${esc(q[0] + t + q[1])}</p>` : `<p class="bk-say n">${esc(t)}</p>`;
  }).join("");
  // a node and what you did there; ends go to boxes side by side at the bottom of the hub that offers them
  const node = (nid) => {
    if (shown.has(nid) || !ev.nodes[nid]) return ""; shown.add(nid);
    const n = ev.nodes[nid]; if (!R.v[nid]) return "";
    flags.push(...fxFlags(n.fx));
    let h = lines(nid);
    if (n.end || !n.opts) return h;
    const boxes = [];
    n.opts.forEach((o, i) => {
      const took = R.o[nid + ":" + i], dest = o.go && ev.nodes[o.go];
      if (took) flags.push(...fxFlags(o.fx));
      if (dest && dest.end) {
        boxes.push(took && R.v[o.go] ? `<div class="bk-br"><b>${esc(W.opt(nid, i))}</b>${dest.say.map((s, j) => { const t = W.say(o.go, j); return s[0] ? `<span><i>${esc(W.who(s[0]))}:</i> ${esc(q[0] + t + q[1])}</span>` : `<span>${esc(t)}</span>`; }).join(" ")}</div>` : `<div class="bk-br off"><b>${esc(bt("otherWay"))}</b>${esc(bt("notLived"))}</div>`);
        if (took) shown.add(o.go);
        return;
      }
      if (took) h += `<p class="bk-q">${esc(W.opt(nid, i))}</p>` + (o.go ? node(o.go) : "");
      else if (!(o.go && shown.has(o.go) && R.v[o.go])) h += `<span class="bk-grey">${esc(bt("unasked"))}</span><br>`;
    });
    if (boxes.length) h += `<p class="bk-sub" style="margin:12px 0 0">${esc(boxes.length > 1 ? bt("fork") : bt("end"))}</p><div class="bk-branch">${boxes.join("")}</div>`;
    return h;
  };
  let body = node(ev.start);
  // what comes back later: "This comes back in: ..."
  const D = diarySlice(), back = [];
  for (const f of new Set(flags)) for (const k2 of flagReturns(f, k)) if (!back.includes(k2)) back.push(k2);
  if (back.length) body += back.map((k2) => `<div class="bk-margin">${esc(bt("comesBack"))} <b>${esc(D[k2] ? evTitle(k2.split("/")[1]) : bt("anotherTalk"))}</b></div>`).join("");
  if (R.old) body += `<p class="bk-ex">${esc(bt("old"))}</p>`;
  return `<h3>${esc(evTitle(id))}</h3><p class="bk-sub">${esc(zoneLabel(z))} · ${esc(tx("talk.k." + ev.kind))} · ${esc((R.n || 1) > 1 ? bt("times", { n: R.n }) : bt("once"))}</p>${plate(sceneBox("ev:" + id + ":" + z))}${body}`;
}

/* ---------- Cards (the Grimoire) ---------- */
function cardsList() {
  const P = EV.P, g = P.grim || {}, all = Object.keys(CARDS);
  let h = `<p class="bk-sub">${esc(tx("grim.count", { n: all.filter((id) => g[id]).length, m: all.length }))} · ${esc(tx("dust.have", { n: P.dust || 0 }))}</p>`;
  const circles = CIRCLES.map((c) => [c, circleTypes(c)]).concat([["star", ["star"]]]);
  for (const [ck, types] of circles) {
    const ids = grimIds(types); if (!ids.length) continue;
    h += `<p class="bk-grp">${esc(tx("grim.circle." + ck))} <small>${ids.filter((id) => g[id]).length} / ${ids.length}</small></p><ul class="bk-list">`;
    for (const ty of types) for (const id of grimIds([ty])) {
      const on = BK.sel.cartas === id ? ' aria-current="true"' : "";
      h += g[id] ? `<li><button type="button" class="bk-it" data-bksel="${id}"${on}><canvas class="rc-thumb bk-th" width="64" height="48" data-thumb="${id}" aria-hidden="true"></canvas><span class="bk-nm">${esc(cardName(id))}<small>${tyIcon(CARDS[id].type)} ${esc(TYPES[CARDS[id].type][L()])}</small></span></button></li>`
        : `<li><button type="button" class="bk-it locked" data-bksel="${id}"${on}><canvas class="rc-thumb bk-th" width="64" height="48" data-thumb="${id}" data-sil="1" aria-hidden="true"></canvas><span class="bk-nm">???<small>${tyIcon(CARDS[id].type)} ${esc(TYPES[CARDS[id].type][L()])}</small></span></button></li>`;
    }
    h += `</ul>`;
  }
  return h;
}
function cardsPage(id) {
  const P = EV.P, C = CARDS[id]; if (!C) return `<p class="bk-sub">${esc(bt("pickCard"))}</p>`;
  const boss = !!C.boss || !!C.story, owner = C.by && MONS[C.by] ? monName(C.by) : "";
  const craft = boss ? `<p class="rc-cant">${esc(tx(C.story ? "grim.story" : "grim.boss"))}</p>` : `<div class="rc-btns"><button class="btn ghost" type="button" data-craft="${id}" ${(P.dust || 0) < craftCost() ? "disabled" : ""}>${esc(tx("grim.craft", { c: craftCost() }))}</button></div>`;
  if (!(P.grim || {})[id]) return `<div class="bk-card">${ghostCardHtml(id, tx("grim.unknown") + (owner && !boss ? " · " + tx("grim.by", { mon: owner }) : ""), craft)}</div>`;
  const g = cardBest(id);
  return `<div class="bk-card">${cardHtml(id, Math.max(0, g), { foot: craft })}</div>${cardLoreHtml(id, g)}`;
}
// the best grade you own of a card (-1: none left, it is only in the Grimoire)
const cardBest = (id) => EV.P.cards.reduce((m, c) => (c.id === id ? Math.max(m, c.g) : m), -1);
// its story opens as you upgrade it: Rare shows the scene, Super rare what nobody sees, Epic the thread
function cardLoreHtml(id, g) {
  const T = window.EVCARDLORE && EVCARDLORE[id]; if (!T) return "";
  const t = T[L()] || T.es;
  return `<p class="bk-q">${esc(bt("cardStory"))}</p>` + ["scene", "hidden", "thread"].map((k, i) => loreRow(bt("cl." + k), t[i], g >= i + 1, bt("opensGrade", { g: GRADES[i + 1][L()] }))).join("");
}
// one line of lore: open, or grey with the way to open it
const loreRow = (label, text, open, how) => open
  ? `<div class="bk-lore"><b>${esc(label)}</b><p class="bk-say">${esc(maskNames(text))}</p></div>`
  : `<div class="bk-lore off"><b>${esc(label)}</b><p class="bk-say">🔒 ${esc(how)}</p></div>`;

/* ---------- My creatures: their story opens with level and stars (rpg/data-lore-mons.js, FRAG in eggs.js) ---------- */
const monLore = () => window.EVMONLORE || {};
// your creature or a Refuge companion of that kind: level, stars, stage reached
function myMon(k) {
  const S = EV.S, own = !!(S && S.phase === "alive" && S.species === k), R = own ? rpgState() : null;
  const r = EV.P.eg && EV.P.eg.roster && EV.P.eg.roster[k];
  if (!R && !r) return null;
  return { lvl: Math.max(R ? R.lvl : 0, r ? r.lvl : 0), st: r ? r.st || 0 : 0, r, own, stage: own ? S.stage : 1 };
}
const monKinds = () => Object.keys(monLore()).filter((k) => MONS[k]);
function monsList() {
  const all = monKinds(), have = all.filter((k) => myMon(k)).sort((a, b) => myMon(b).own - myMon(a).own || myMon(b).lvl - myMon(a).lvl);
  let h = `<ul class="bk-list">`;
  for (const k of have) {
    const m = myMon(k), on = BK.sel.criaturas === k ? ' aria-current="true"' : "";
    h += `<li><button type="button" class="bk-it" data-bksel="${k}"${on}>${monThumb(k)}<span class="bk-nm">${esc(monName(k))}<small>${esc(m.own ? EV.S.name : bt("companion"))}</small></span><span class="bk-ct">${esc(bt("lvl", { n: m.lvl }))}${m.st ? " " + "★".repeat(m.st) : ""}</span></button></li>`;
  }
  // the ones you have not met stay one grey line: their names would give them away
  const left = all.length - have.length;
  if (left) h += `<li><button type="button" class="bk-it locked" data-bksel="@none"${BK.sel.criaturas === "@none" ? ' aria-current="true"' : ""}><span class="bk-th q">?</span><span class="bk-nm">${esc(bt("monsLeft", { n: left }))}<small>${esc(bt("notYet"))}</small></span></button></li>`;
  return h + `</ul>`;
}
function monsPage(k) {
  const M = MONS[k], m = M && myMon(k);
  if (!m) return `<h3>???</h3><p class="bk-sub">${esc(bt("monHow"))}</p>${plate('<span class="bk-q-big">?</span>', "dark", artSrc("maps/home.png"))}`;
  const S = EV.S;
  const pics = [0, 1, 2].map((st) => `<canvas class="bk-mon${st > m.stage ? " sil" : ""}" width="96" height="80" data-mstage="${k}:${st}" role="img" aria-label="${esc(bt("stage." + st))}"></canvas>`).join("");
  let h = `<h3>${esc(monName(k))}${m.own ? ` · ${esc(S.name)}` : ""}</h3><p class="bk-sub">${M.types.map(typeChip).join(" ")} · ${esc(bt("lvl", { n: m.lvl }))}${m.st ? " · " + "★".repeat(m.st) : ""}</p>${plate(`<div class="bk-stages">${pics}</div>`, "mons", artSrc("maps/home.png"))}`;
  const u = makeUnit(m.own ? ownUnitOpts(1) : { kind: k, lvl: m.lvl, side: "ally", name: monName(k), stage: 1, cards: {} });
  h += `<div class="bk-stats">${[["hp", u.maxHp], ["str", u.base.str], ["def", u.base.def], ["spd", u.base.spd], ["crit", Math.round(u.crit) + "%"]].map(([s, v]) => `<div><b>${typeof v === "number" ? Math.round(v) : v}</b><small>${esc(bt("st." + s))}</small></div>`).join("")}</div>`;
  const rec = m.own ? rpgState() : m.r, tal = talentsOf(k, m.lvl, rec && rec.tal);
  if (tal.length) h += `<p class="bk-say"><b>${esc(tx("tal.title"))}:</b> ${tal.map((T) => `${tyIcon(T.type)} ${esc(T[L()])}`).join(" · ")}</p>`;
  if (m.r) {
    const B = BIRTH[birthKey(k, m.r)], U = EV.EGGS && EV.EGGS.unitOf(k);
    if (B) h += `<p class="bk-say"><b>${esc(bt("birth"))}</b> ${esc(B[L()])} (${esc(B.fx[L()])})</p>`;
    if (U) h += `<p class="bk-say"><b>${esc(bt("bond"))}</b> ${U.bond}</p>`;
  }
  const lore = (monLore()[k] || {})[L()] || (monLore()[k] || {}).es || [], fr = (EV.EGGS && EV.EGGS.fragsOf(k)) || null;
  const rows = [[bt("ml.born"), (MON_DESC[L()] || {})[k], true, ""],
    [bt("ml.habits"), lore[0], m.lvl >= 5, bt("opensLvl", { n: 5 })]];
  if (fr) rows.push([bt("ml.star", { n: 2 }), fr[0], m.st >= 2, bt("opensStar", { n: 2 })]);
  rows.push([bt("ml.village"), lore[1], m.lvl >= 15, bt("opensLvl", { n: 15 })]);
  if (fr) rows.push([bt("ml.star", { n: 4 }), fr[1], m.st >= 4, bt("opensStar", { n: 4 })]);
  rows.push([bt("ml.sap"), lore[2], m.lvl >= 30, bt("opensLvl", { n: 30 })]);
  h += `<p class="bk-q">${esc(bt("monStory"))}</p>` + rows.filter((r) => r[1]).map((r) => loreRow(r[0], r[1], r[2], r[3])).join("");
  return h;
}
function paintStage(cv) {
  const [k, st] = cv.dataset.mstage.split(":"), out = EV.setupCanvas(cv, 96, 80);
  if (!evsKind(k)) { cv.dataset.mon = k; paintMon(cv); return; }
  const spr = EVS.sprite(k, 24, +st, 0, "happy"), z = +st === 0 ? 2 : 3;
  out.imageSmoothingEnabled = false; out.drawImage(spr, (96 - spr.width * z) / 2, 80 - spr.height * z, spr.width * z, spr.height * z);
}

/* ---------- Writings ---------- */
function escList() {
  if (!LORE) return "";
  const have = EV.P.escritos || {}, all = LORE.LORE_ESCRITOS.filter((w) => (w.era || 1) <= (EV.P.era || 1) || have[w.id]);
  let h = `<p class="bk-sub">${esc(tx("esc.desc"))} ${esc(tx("grim.count", { n: all.filter((w) => have[w.id]).length, m: all.length }))}</p><ul class="bk-list">`;
  for (const w of all) {
    const on = BK.sel.escritos === w.id ? ' aria-current="true"' : "";
    h += have[w.id] ? `<li><button type="button" class="bk-it" data-bksel="${w.id}"${on}><span class="bk-th q doc">${BOOK_SVG("escritos")}</span><span class="bk-nm">${esc(maskNames((w[L()] || w.es).title))}</span></button></li>`
      : `<li><button type="button" class="bk-it locked" data-bksel="${w.id}"${on}><span class="bk-th q">?</span><span class="bk-nm">???</span></button></li>`;
  }
  const H = (LORE.LORE_HILOS || []).filter((x) => have[x.a] && have[x.b]);
  if (H.length) h += `<li><button type="button" class="bk-it" data-bksel="@hilos"${BK.sel.escritos === "@hilos" ? ' aria-current="true"' : ""}><span class="bk-th q doc">${BOOK_SVG("diario")}</span><span class="bk-nm">${esc(tx("esc.hilos"))}<small>${H.length}</small></span></button></li>`;
  return h + `</ul>`;
}
function escPage(id) {
  if (!LORE) return "";
  const have = EV.P.escritos || {};
  if (id === "@hilos") { const H = (LORE.LORE_HILOS || []).filter((x) => have[x.a] && have[x.b]); return `<h3>${esc(tx("esc.hilos"))}</h3>${plate(sceneBox("pz:heart:descanso"))}<ul class="hilos">${H.map((x) => `<li>${esc(maskNames(x[L()] || x.es))}</li>`).join("")}</ul>`; }
  const w = LORE.LORE_ESCRITOS.find((x) => x.id === id); if (!w) return `<p class="bk-sub">${esc(bt("pickEsc"))}</p>`;
  // the place a Writing turns up: a chest, a stall, a guardian or the road, in its zone
  const pic = (dark) => plate(sceneBox("pz:" + (w.zone && ZONES[w.zone] ? w.zone : isOrphan(w) ? "deep" : "aurora") + ":" + ({ chest: "cofre", shop: "descanso", guardian: "jefe" }[w.from] || "camino")), dark ? "dark" : "");
  if (!have[w.id]) return `<h3>???</h3><p class="bk-sub">${esc(isOrphan(w) ? tx("esc.from.deep") : tx("esc.from." + w.from, { z: w.zone ? zt("name", null, w.zone) : "" }))}</p>${pic(true)}`;
  const t = w[L()] || w.es;
  return `<h3>${esc(maskNames(t.title))}</h3>${pic(false)}${t.text.split(/\n+/).map((p) => `<p class="bk-say">${esc(maskNames(p))}</p>`).join("")}`;
}

/* ---------- Bestiary: wins per foe (EV.P.bst) ---------- */
const beastSlice = EV.slice("bst", () => ({}));
const isGuardian = (k) => Object.values(ZONES).some((z) => z.boss === k);
const beastNeed = (k) => (isGuardian(k) ? 1 : 3);
const beastKnown = (k) => ((beastSlice()[k] || {}).w || 0) >= beastNeed(k);
// called by endBattle for every foe of a won fight
function beastWin(u) {
  if (!u || !MONS[u.kind]) return;
  const B = beastSlice(), r = B[u.kind] || (B[u.kind] = { w: 0, lv: 0, l: {} }), was = r.w >= beastNeed(u.kind);
  r.w++; r.lv = Math.max(r.lv, u.lvl); r.l[u.lvl] = 1;
  const lv = Object.keys(r.l).map(Number).sort((a, b) => a - b); if (lv.length > 12) delete r.l[lv[0]];
  if (!was && r.w >= beastNeed(u.kind)) { bookNew().bestiario = 1; EV.toast(bt("newBeast", { n: monName(u.kind, !u.boss) })); }
}
// how often each foe comes up in a zone: its share of the zone's list (the game draws from that list)
function zoneOdds(z) {
  const f = (ZONES[z] && ZONES[z].foes) || [], c = {};
  for (const k of f) c[k] = (c[k] || 0) + 1;
  return Object.keys(c).map((k) => [k, Math.round(100 * c[k] / f.length)]).sort((a, b) => b[1] - a[1]);
}
const foeName = (k) => (beastKnown(k) ? monName(k, !isGuardian(k)) : "???");
// the small line on the expedition screen: "You may meet: Dim Lumo 40 % · ??? 20 %"
function zoneOddsLine(z) {
  if (!ZONES[z]) return "";
  return `<p class="muted zone-odds">${esc(bt("canMeet"))} ${zoneOdds(z).map(([k, p]) => `<span class="${beastKnown(k) ? "" : "unk"}">${esc(foeName(k))} ${p} %</span>`).join(" · ")}</p>`;
}
const zoneSeen = (z) => zoneOpen(z) || ((EV.P.cleared || {})[z] || 0) > 0;
function zonesList() {
  let h = "", grp = null;
  for (const id of Object.keys(ZONES)) {
    const g = (zt("sub", null, id) || "").split(" · ")[0];
    if (g !== grp) { if (grp !== null) h += `</ul>`; h += `<p class="bk-grp">${esc(g)}</p><ul class="bk-list">`; grp = g; }
    const on = BK.sel.zonas === id ? ' aria-current="true"' : "", st = (EV.P.stars || {})[id] || 0;
    h += zoneSeen(id) ? `<li><button type="button" class="bk-it" data-bksel="${id}"${on}>${artImg("battle/" + id + "-day.png", "bk-th")}<span class="bk-nm">${esc(zt("name", null, id))}<small>${tyIcon(ZONES[id].type)} ${esc(TYPES[ZONES[id].type][L()])}</small></span><span class="bk-ct">${starStr(st)}</span></button></li>`
      : `<li><button type="button" class="bk-it locked" data-bksel="${id}"${on}>${artImg("battle/" + id + "-day.png", "bk-th dark")}<span class="bk-nm">${esc(zt("name", null, id))}<small>${esc(bt("notYet"))}</small></span></button></li>`;
  }
  return h + `</ul>`;
}
function zonePage(id) {
  const z = ZONES[id]; if (!z) return "";
  const pic = plate(artImg("battle/" + id + "-day.png", "bk-scn", zt("name", null, id)) + (zoneSeen(id) ? "" : '<span class="bk-lock">🔒</span>'), zoneSeen(id) ? "" : "dark");
  if (!zoneSeen(id)) return `<h3>${esc(zt("name", null, id))}</h3><p class="bk-sub">${esc(bt("notYetLong"))}</p>${pic}<p class="bk-say n">${esc(keyLock(id) || tx(z.unlockAll ? "zones.lockHeart" : Array.isArray(z.unlock) ? (z.unlock.includes("hollow") ? "zones.lockHigh" : "zones.lockEnv") : "zones.lock"))}</p>`;
  const cl = (EV.P.cleared || {})[id] || 0, sap = saviaLvl(id), c = TALK[id] ? diaryCounts(id) : null;
  let h = `<h3>${esc(zt("name", null, id))}</h3><p class="bk-sub">${esc(zt("sub", null, id))}</p>${pic}<p class="bk-say">${esc(zt("desc", null, id))}</p>`;
  h += `<p class="bk-q">${esc(bt("canMeet"))}</p>` + zoneOdds(id).map(([k, p]) => `<div class="bk-bar"><span class="${beastKnown(k) ? "" : "unk"}">${esc(foeName(k))}</span><span class="tr"><i style="width:${p}%"></i></span><span>${p} %</span></div>`).join("");
  h += `<p class="bk-q">${esc(bt("guardian"))}</p><p class="bk-say">${esc(zt("bossD", null, id))}${cl ? " " + esc(tx("zones.done", { n: cl })) : ""}</p>`;
  if (cl) h += `<p class="bk-say n">${esc(tx("zones.verse", { v: zt("verse", null, id) }))}</p>`;
  if (c) h += `<p class="bk-q">${esc(bt("lived", { n: c.lived, m: c.all }))}</p><div class="bk-prog"><i style="width:${Math.round(100 * c.lived / Math.max(1, c.all))}%"></i></div>`;
  h += `<p class="bk-say"><b>${esc(bt("sap"))}</b> ${esc(tx("sap." + sap))} ${sapDrops(sap, 2)}</p>`;
  return h;
}
// the foes of the zones you have opened, grouped by the first zone they live in; guardians last
function beastKinds() {
  const out = [], seen = new Set();
  for (const id of Object.keys(ZONES)) {
    if (!zoneSeen(id)) continue;
    for (const k of ZONES[id].foes) if (!seen.has(k)) { seen.add(k); out.push([id, k]); }
  }
  for (const id of Object.keys(ZONES)) if (zoneSeen(id) && ZONES[id].boss && !seen.has(ZONES[id].boss)) { seen.add(ZONES[id].boss); out.push(["@g", ZONES[id].boss]); }
  for (const k in beastSlice()) if (!seen.has(k) && MONS[k]) { seen.add(k); out.push([isGuardian(k) ? "@g" : "@x", k]); }
  return out;
}
function beastList() {
  const B = beastSlice(), all = beastKinds();
  let h = `<p class="bk-sub">${esc(bt("beastSub", { n: all.filter(([, k]) => beastKnown(k)).length, m: all.length }))}</p>`, grp = null;
  for (const [g, k] of all) {
    if (g !== grp) { if (grp !== null) h += `</ul>`; h += `<p class="bk-grp">${esc(g === "@g" ? bt("guardians") : g === "@x" ? bt("elsewhere") : zt("name", null, g))}</p><ul class="bk-list">`; grp = g; }
    const r = B[k] || { w: 0 }, on = BK.sel.bestiario === k ? ' aria-current="true"' : "", need = beastNeed(k);
    h += beastKnown(k) ? `<li><button type="button" class="bk-it" data-bksel="${k}"${on}>${monThumb(k)}<span class="bk-nm">${esc(foeName(k))}<small>${MONS[k].types.map((t) => esc(TYPES[t][L()])).join(" · ")}</small></span><span class="bk-ct">${r.w} ✓</span></button></li>`
      : `<li><button type="button" class="bk-it locked" data-bksel="${k}"${on}>${r.w ? monThumb(k, true) : '<span class="bk-th q">?</span>'}<span class="bk-nm">???<small>${esc(r.w ? bt("beaten", { n: r.w, m: need }) : bt("unseen"))}</small></span><span class="bk-ct">${r.w} / ${need}</span></button></li>`;
  }
  return h + `</ul>`;
}
function beastPage(k) {
  const m = MONS[k]; if (!m) return "";
  const r = beastSlice()[k] || { w: 0, lv: 0, l: {} }, need = beastNeed(k), boss = isGuardian(k);
  const where = Object.keys(ZONES).filter((id) => zoneSeen(id) && (ZONES[id].foes.includes(k) || ZONES[id].boss === k));
  const pic = plate(`<canvas class="bk-mon${beastKnown(k) ? "" : " sil"}" width="96" height="80" data-mon="${k}"></canvas>`, "mon", zoneBg(where[0]));
  if (!beastKnown(k)) return `<h3>???</h3>${pic}<p class="bk-sub">${esc(r.w ? bt("beaten", { n: r.w, m: need }) : bt("unseen"))}</p><p class="bk-say n">${esc(bt("beastHow", { n: need }))}</p>${where.length ? `<p class="bk-say"><b>${esc(bt("livesIn"))}</b> ${where.map((id) => esc(zt("name", null, id))).join(", ")}</p>` : ""}`;
  const lvls = Object.keys(r.l).map(Number).sort((a, b) => a - b), lv = lvls.includes(BK.lvl && BK.lvl[k]) ? BK.lvl[k] : lvls[lvls.length - 1] || 1;
  const u = makeUnit({ kind: k, lvl: lv, side: "foe", name: monName(k, !boss), hollow: !boss, boss, stage: 1, cards: {} });
  u.base.str *= boss ? TUNE.boss : TUNE.foe; // as the zones tune it in battle
  const weak = TYPE_ORDER.filter((t) => m.types.some((d) => BEATS[t] === d)), strong = m.types.map((t) => BEATS[t]).filter(Boolean);
  let h = `<h3>${esc(foeName(k))}</h3>${pic}<p class="bk-sub">${m.types.map(typeChip).join(" ")}</p>`;
  const desc = (MON_DESC[L()] || {})[k]; if (desc) h += `<p class="bk-say n">${esc(desc)}</p>`;
  h += `<p class="bk-say">${weak.length ? `<b>${esc(bt("weak"))}</b> ${weak.map(typeChip).join(" ")} ` : ""}${strong.length ? `<b>${esc(bt("strong"))}</b> ${strong.map(typeChip).join(" ")}` : ""}</p>`;
  h += `<p class="bk-q">${esc(bt("statsAt"))}</p><div class="bk-seg" role="group">${lvls.map((l) => `<button type="button" data-bklvl="${l}" aria-pressed="${l === lv}">${esc(bt("lvl", { n: l }))}</button>`).join("")}</div>`;
  h += `<div class="bk-stats">${[["hp", u.maxHp], ["str", u.base.str], ["def", u.base.def], ["spd", u.base.spd], ["crit", Math.round(u.crit) + "%"]].map(([s, v]) => `<div><b>${typeof v === "number" ? Math.round(v) : v}</b><small>${esc(bt("st." + s))}</small></div>`).join("")}</div>`;
  const cs = boss ? m.cards : m.cards.slice(0, 2);
  h += `<p class="bk-q">${esc(bt("skills"))}</p>` + cs.map((id) => CARDS[id] ? `<p class="bk-say">${tyIcon(CARDS[id].type)} <b>${esc(cardName(id))}</b>: ${esc(slotText(scaled(id, 0), "a"))}</p>` : "").join("");
  if (where.length) h += `<p class="bk-q">${esc(bt("livesIn"))}</p>` + where.map((id) => { const o = zoneOdds(id).find(([x]) => x === k); return `<p class="bk-say">${esc(zt("name", null, id))}${o ? " · " + o[1] + " %" : " · " + esc(bt("guardian"))}</p>`; }).join("");
  h += `<p class="bk-margin">${esc(bt("yourMark", { w: r.w, l: r.lv }))}</p>`;
  return h;
}

/* ---------- People of the Glade: everyone you met or heard named, from the conversations you lived ---------- */
// where each person lives: the zone of the first conversation they speak in
let PZONE = null;
function personZones() {
  if (PZONE) return PZONE;
  PZONE = {};
  for (const z of DZONES()) for (const id in TALK[z]) for (const k in (TALK[z][id].who || {})) { const p = PPL_WHO[TALK[z][id].who[k]]; if (p && (!PZONE[p] || PZONE[p] === "common")) PZONE[p] = z; }
  return PZONE;
}
// what the Diary holds about each person: conversations they spoke in, their lines you heard, lines that name them
function peopleIndex() {
  const D = diarySlice(), I = {}, rec = (p) => I[p] || (I[p] = { ev: [], said: [], about: [] });
  for (const key in D) {
    const [z, id] = key.split("/"), ev = TALK[z] && TALK[z][id]; if (!ev) continue;
    const R = D[key], met = new Set();
    for (const n of Object.keys(ev.nodes)) {
      if (!R.v[n]) continue;
      (ev.nodes[n].say || []).forEach(([k, t], i) => {
        const sp = k && PPL_WHO[(ev.who || {})[k]];
        if (sp) { met.add(sp); rec(sp).said.push([key, n, i]); }
        for (const p in PPL) if (p !== sp && PPL[p].n.some((nm) => { const r = nameFind(nm); r.lastIndex = 0; return r.test(t); })) rec(p).about.push([key, n, i]);
      });
    }
    met.forEach((p) => rec(p).ev.push(key));
  }
  return I;
}
const personName = (p) => (isKnown(p) ? (L() === "en" ? PPL[p].nEn : PPL[p].n)[0] : PPL[p].a[L()] || PPL[p].a.es);
const sayLine = (key, n, i) => { const [z, id] = key.split("/"); try { return talkText(id).say(n, i); } catch (e) { return ""; } };
function peopleList() {
  const I = peopleIndex(), Z = personZones(), all = Object.keys(PPL), seen = all.filter((p) => I[p] && I[p].ev.length || isKnown(p));
  const groups = {};
  for (const p of seen) { const g = I[p] && I[p].ev.length ? Z[p] || "common" : "@heard"; (groups[g] = groups[g] || []).push(p); }
  let h = "";
  for (const g of DZONES().concat(["@heard"])) {
    if (!groups[g]) continue;
    h += `<p class="bk-grp">${esc(g === "@heard" ? bt("heardOf") : zoneLabel(g))}</p><ul class="bk-list">`;
    for (const p of groups[g]) {
      const on = BK.sel.gente === p ? ' aria-current="true"' : "", n = I[p] ? I[p].ev.length : 0;
      h += `<li><button type="button" class="bk-it" data-bksel="${p}"${on}>${artImg(personFace(p) || "", "bk-th face") || '<span class="bk-th q">?</span>'}<span class="bk-nm">${esc(personName(p))}<small>${esc(isKnown(p) ? PPL[p].a[L()] || PPL[p].a.es : bt("noName"))}</small></span><span class="bk-ct">${n ? `💬 ${n}` : ""}</span></button></li>`;
    }
    h += `</ul>`;
  }
  const left = all.length - seen.length;
  if (left) h += `<ul class="bk-list"><li><button type="button" class="bk-it locked" data-bksel="@none"${BK.sel.gente === "@none" ? ' aria-current="true"' : ""}><span class="bk-th q">?</span><span class="bk-nm">${esc(bt("peopleLeft", { n: left }))}<small>${esc(bt("notYet"))}</small></span></button></li></ul>`;
  return h;
}
function peoplePage(p) {
  if (!PPL[p]) return `<h3>???</h3><p class="bk-sub">${esc(bt("peopleHow"))}</p>${plate('<span class="bk-q-big">?</span>', "dark", zoneBg("aurora"))}`;
  const I = peopleIndex()[p] || { ev: [], said: [], about: [] }, Z = personZones()[p];
  let h = `<h3>${esc(personName(p))}</h3><p class="bk-sub">${esc(isKnown(p) ? PPL[p].a[L()] || PPL[p].a.es : bt("noNameLong"))}${Z && I.ev.length ? " · " + esc(zoneLabel(Z)) : ""}</p>`;
  // the place you met them, with their face over it
  const first = I.ev[0], face = artImg(personFace(p) || "", "bk-face", personName(p));
  h += plate((first ? sceneBox("ev:" + first.split("/")[1] + ":" + first.split("/")[0]) : sceneBox("pz:" + (Z && Z !== "common" ? Z : "aurora") + ":camino")) + face, "person");
  if (I.ev.length) h += `<p class="bk-q">${esc(bt("metIn"))}</p><ul class="bk-list">` + I.ev.map((k) => `<li><button type="button" class="bk-it" data-bkgo="${k}">${thumbBox("ev:" + k.split("/")[1] + ":" + k.split("/")[0])}<span class="bk-nm">${esc(evTitle(k.split("/")[1]))}<small>${esc(zoneLabel(k.split("/")[0]))}</small></span><span class="bk-ct">→</span></button></li>`).join("") + `</ul>`;
  const quotes = (list, max) => list.slice(-max).map(([k, n, i]) => sayLine(k, n, i)).filter(Boolean).map((t) => `<p class="bk-say">«${esc(t)}»</p>`).join("");
  if (I.said.length) h += `<p class="bk-q">${esc(bt("heardFrom"))}</p>` + quotes(I.said, 4);
  if (I.about.length) h += `<p class="bk-q">${esc(bt("saidAbout"))}</p>` + quotes(I.about, 4);
  if (!I.ev.length && !I.about.length) h += `<p class="bk-say n">${esc(bt("onlyName"))}</p>`;
  const after = epiFor(p).map(epiText).filter(Boolean);
  if (after.length) h += `<p class="bk-q">${esc(bt("after"))}</p>` + after.map((t) => `<p class="bk-say epi">${esc(t)}</p>`).join("");
  return h;
}

/* ---------- the book ---------- */
const BOOK_SEC = {
  diario: { list: diaryList, page: diaryPage, first: () => { const D = diarySlice(); return Object.keys(D).sort((a, b) => D[b].t - D[a].t)[0]; }, sub: () => { const z = DZONES().map(diaryCounts).reduce((a, c) => ({ lived: a.lived + c.lived, all: a.all + c.all, seen: a.seen + c.seen, ends: a.ends + c.ends }), { lived: 0, all: 0, seen: 0, ends: 0 }); return bt("diarioSub", { n: z.lived, m: z.all, a: z.seen, b: z.ends }); } },
  criaturas: { list: monsList, page: monsPage, first: () => monKinds().find((k) => myMon(k) && myMon(k).own) || monKinds().find((k) => myMon(k)), sub: () => bt("monsSub", { n: monKinds().filter((k) => myMon(k)).length, m: monKinds().length }) },
  gente: { list: peopleList, page: peoplePage, first: () => { const I = peopleIndex(); return Object.keys(PPL).find((p) => I[p] && I[p].ev.length); }, sub: () => { const I = peopleIndex(); return bt("genteSub", { n: Object.keys(PPL).filter((p) => isKnown(p)).length, m: Object.keys(PPL).filter((p) => I[p] && I[p].ev.length).length }); } },
  zonas: { list: zonesList, page: zonePage, first: () => X && X.zone && ZONES[X.zone] ? X.zone : "aurora", sub: () => bt("zonasSub", { n: Object.keys(ZONES).filter((z) => (EV.P.cleared || {})[z]).length, m: Object.keys(ZONES).length }) },
  bestiario: { list: beastList, page: beastPage, first: () => (beastKinds().find(([, k]) => beastKnown(k)) || beastKinds()[0] || [])[1], sub: () => bt("beastRule") },
  cartas: { list: cardsList, page: cardsPage, first: () => Object.keys(CARDS).find((id) => (EV.P.grim || {})[id]), sub: () => tx("grim.desc") },
  escritos: { list: escList, page: escPage, first: () => LORE && (LORE.LORE_ESCRITOS.find((w) => (EV.P.escritos || {})[w.id]) || {}).id, sub: () => "" },
};
function bookHtml() {
  const S = BOOK_SEC[BK.tab], N = bookNew();
  if (BK.sel[BK.tab] == null) BK.sel[BK.tab] = S.first() || null;
  const tabs = BOOK_TABS.map(([k, col]) => `<button type="button" class="bk-tab" role="tab" data-bktab="${k}" aria-selected="${BK.tab === k}" style="background:${col}" aria-label="${esc(bt("tab." + k))}"><svg viewBox="0 0 24 24" aria-hidden="true">${BOOK_ICON[k]}</svg><span class="bk-tt">${esc(bt("tab." + k))}</span>${N[k] ? '<i class="dot"></i>' : ""}</button>`).join("");
  const sub = S.sub();
  const close = `<button type="button" class="sheet-x" data-bkclose="1" aria-label="${esc(tx("load.close"))}">✕</button>`;
  return `<div class="bk-back" data-bkclose="1"></div><div class="bk-book${BK.view === "page" ? " show-page" : ""}" role="dialog" aria-modal="true" aria-label="${esc(bt("title"))}">
    <div class="bk-cover"><section class="bk-page l"><div class="bk-head"><h2>${esc(bt("tab." + BK.tab))}</h2>${close}</div>${sub ? `<p class="bk-sub">${esc(sub)}</p>` : ""}${S.list()}</section>
    <section class="bk-page r" aria-live="polite"><div class="bk-head bk-nav"><button type="button" class="bk-backbtn" data-bkview="list">← ${esc(bt("back"))}</button>${close}</div><div class="bk-leaf">${BK.sel[BK.tab] != null ? S.page(BK.sel[BK.tab]) : `<p class="bk-sub">${esc(bt("empty"))}</p>`}</div></section></div>
    <div class="bk-tabs" role="tablist" aria-label="${esc(bt("title"))}">${tabs}</div></div>`;
}
function bookMount(el) {
  el.querySelectorAll("canvas[data-mon]").forEach((cv) => { try { paintMon(cv); } catch (e) { /* art is decoration */ } });
  el.querySelectorAll("canvas[data-mstage]").forEach((cv) => { try { paintStage(cv); } catch (e) { /* art is decoration */ } });
  // drawn scenes: the big plate now, the list thumbnails a few per frame so a long Diary opens at once
  const pics = [...el.querySelectorAll("canvas[data-bkpic]")], big = pics.filter((c) => !c.classList.contains("bk-th")), small = pics.filter((c) => c.classList.contains("bk-th"));
  big.forEach(paintPic);
  const run = ++BK.paintRun, step = () => { if (run !== BK.paintRun) return; small.splice(0, 6).forEach(paintPic); if (small.length) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
// one drawn picture: "ev:<id>:<zone>" an event's scene (or its zone's road when it has none), "pz:<zone>:<kind>" a pause
function paintPic(cv) {
  try {
    const [kind, a, b] = cv.dataset.bkpic.split(":"), Z = (z) => (ZONES[z] ? z : "aurora");
    let src = null;
    if (kind === "ev") src = EVSCENE.event(a) || EVSCENE.pause(Z(b), "camino");
    else src = EVSCENE.pause(Z(a), b || "camino");
    if (!src) return;
    const g = cv.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, cv.width, cv.height);
    if (kind === "ev" && cv.classList.contains("bk-scn")) { const n = EVSCENE.EVNOTE && EVSCENE.EVNOTE[a]; if (n && n.scene) { cv.setAttribute("aria-label", maskNames(n.scene)); cv.removeAttribute("aria-hidden"); } }
  } catch (e) { /* art is decoration */ }
}
// top: a new section starts the list from its top; otherwise the list keeps where you were
function renderBook(top) {
  const el = $("bookView"); if (!el || !BK.open) return;
  const sc = el.querySelector(".bk-page.l"), st = sc && !top ? sc.scrollTop : 0, rc = el.querySelector(".bk-page.r"), rt = rc ? rc.scrollTop : 0;
  el.innerHTML = bookHtml(); bookMount(el);
  const l2 = el.querySelector(".bk-page.l"); if (l2) l2.scrollTop = st;
  const r2 = el.querySelector(".bk-page.r"); if (r2) r2.scrollTop = rt;
}
// show the picked entry on the right page (on a phone: turn to that page, with a way back to the list)
function turnTo(newList) {
  BK.view = "page"; renderBook(newList);
  const el = $("bookView"), r = el.querySelector(".bk-page.r"); if (!r) return;
  r.scrollTop = 0; const lf = r.querySelector(".bk-leaf"); if (lf) lf.classList.add("turn");
  if (newList) { const s = el.querySelector(`[data-bksel="${CSS.escape(String(BK.sel[BK.tab]))}"]`); if (s) s.scrollIntoView({ block: "center" }); }
  if (bookNarrow()) { const b = r.querySelector(".bk-backbtn"); if (b) b.focus({ preventScroll: true }); }
}
function openBook(tab) {
  bookSeed();
  let el = $("bookView");
  if (!el) {
    el = document.createElement("div"); el.id = "bookView"; el.className = "bk-wrap"; document.body.appendChild(el);
    el.addEventListener("click", onBookClick);
  }
  if (tab) BK.tab = tab;
  BK.open = true; el.hidden = false; BK.view = "list";
  delete bookNew()[BK.tab];
  renderBook(true); refreshBookBtn();
  if (EV.GUIDE) setTimeout(() => EV.GUIDE.showTip("book"), 0);
  const f = el.querySelector(".bk-tab[aria-selected=true]"); if (f) f.focus({ preventScroll: true });
}
function closeBook() { BK.open = false; const el = $("bookView"); if (el) el.hidden = true; EV.save(); refreshBookBtn(); const b = $("btnBook"); if (b) b.focus({ preventScroll: true }); }
function onBookClick(e) {
  const t = e.target.closest("[data-bkclose],[data-bktab],[data-bksel],button"); if (!t) return;
  if (t.dataset.bkclose) { closeBook(); return; }
  if (t.dataset.bktab) { EV.sfx("tap"); BK.tab = t.dataset.bktab; BK.view = "list"; delete bookNew()[BK.tab]; renderBook(true); refreshBookBtn(); return; }
  if (t.dataset.bkview) { EV.sfx("tap"); BK.view = "list"; renderBook(); const s = $("bookView").querySelector(`[data-bksel="${CSS.escape(String(BK.sel[BK.tab]))}"]`); if (s) s.focus({ preventScroll: false }); return; }
  if (t.dataset.bksel != null) { EV.sfx("tap"); BK.sel[BK.tab] = t.dataset.bksel; turnTo(); return; }
  if (t.dataset.bkgo) { EV.sfx("tap"); BK.tab = "diario"; BK.sel.diario = t.dataset.bkgo; turnTo(true); return; }
  if (t.dataset.bklvl) { EV.sfx("tap"); (BK.lvl = BK.lvl || {})[BK.sel.bestiario] = +t.dataset.bklvl; renderBook(); return; }
  if (t.dataset.craft) { onCardsClick(e); renderBook(); }
}
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || !BK.open || ($("cview") && !$("cview").hidden)) return;
  e.stopImmediatePropagation();
  if (bookNarrow() && BK.view === "page") { BK.view = "list"; renderBook(); } else closeBook();
}, true);
function refreshBookBtn() {
  const b = $("btnBook"); if (!b) return;
  const S = EV.S, alive = S && S.phase === "alive";
  b.hidden = !((alive && S.stage >= 1) || Object.keys(EV.P.diary || {}).length || Object.keys(EV.P.grim || {}).length);
  const lb = $("bookLbl"); if (lb) lb.textContent = bt("btn");
  const d = $("bookDot"); if (d) d.hidden = !Object.keys(EV.P.bookNew || {}).length;
}
(function bookStyle() {
  const s = document.createElement("style");
  s.textContent = `
.bk-wrap{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:12px}
.bk-wrap[hidden]{display:none}
.bk-back{position:absolute;inset:0;background:rgba(20,14,26,.66)}
.bk-book{--bp:#f2e6cc;--bp2:#e3d0aa;--bi:#3a2a22;--bi2:#6e5848;--bf:#a8957a;--bg2:#9a6420;--bs:#4b3a6e;--bh:#e9cf8f;--lea:#6b4228;--lea2:#4a2c1a;position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;width:min(1100px,100%);height:min(760px,calc(100dvh - 24px));color:var(--bi)}
/* the cover: leather around two facing pages, a fold in the middle and the edges of the other pages underneath */
.bk-cover{position:relative;display:grid;grid-template-columns:minmax(210px,.8fr) minmax(0,1.3fr);min-height:0;padding:10px 10px 14px;background:linear-gradient(160deg,var(--lea),var(--lea2));border-radius:14px;box-shadow:0 14px 34px rgba(0,0,0,.45),inset 0 0 0 2px rgba(255,220,160,.12)}
.bk-page{position:relative;background:var(--bp);padding:16px 18px 22px;min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--bf) transparent}
.bk-page.l{border-radius:8px 2px 2px 8px;background:linear-gradient(90deg,var(--bp) 0,var(--bp) 86%,var(--bp2) 100%);box-shadow:-3px 3px 0 -1px #e6d5b3,-6px 6px 0 -2px #cdb68c}
.bk-page.r{border-radius:2px 8px 8px 2px;background:linear-gradient(270deg,var(--bp) 0,var(--bp) 88%,var(--bp2) 100%);box-shadow:3px 3px 0 -1px #e6d5b3,6px 6px 0 -2px #cdb68c;perspective:900px}
.bk-cover::after{content:"";position:absolute;top:10px;bottom:14px;left:calc(10px + (100% - 20px) * .8 / 2.1);width:2px;background:rgba(80,50,20,.35);pointer-events:none}
.bk-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.bk-nav{display:none}
.bk-backbtn{appearance:none;border:2px solid var(--bi);background:var(--bp);color:var(--bi);font:600 14px var(--font-body);border-radius:8px;padding:6px 12px;min-height:40px;cursor:pointer}
.bk-backbtn:focus-visible{outline:2px solid var(--bg2);outline-offset:2px}
.bk-book h2{font-family:var(--font-display);font-size:22px;margin:0;color:var(--bi)}
.bk-book h3{font-family:var(--font-display);font-size:19px;margin:0 0 4px;color:var(--bi)}
.bk-book .sheet-x{position:static;color:var(--bi);flex:0 0 auto}
.bk-sub{color:var(--bi2);font-size:14px;margin:2px 0 10px}
.bk-grp{font:700 13px var(--font-display);letter-spacing:.06em;color:var(--bg2);margin:14px 0 4px;display:flex;justify-content:space-between;border-bottom:1px solid rgba(154,100,32,.3);padding-bottom:2px}
.bk-grp small{color:var(--bi2);font-weight:400}
.bk-list{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.bk-it{appearance:none;width:100%;text-align:left;border:0;background:transparent;color:var(--bi);font:inherit;cursor:pointer;display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:10px;align-items:center;padding:4px 8px 4px 4px;border-radius:6px;min-height:46px}
.bk-it:hover{background:rgba(176,120,42,.12)}
.bk-it[aria-current=true]{background:var(--bh)}
.bk-it:focus-visible{outline:2px solid var(--bg2)}
.bk-it .bk-nm{grid-column:2;min-width:0;font-weight:600;overflow-wrap:anywhere}
.bk-it .bk-nm small{display:block;color:var(--bi2);font-size:12px;font-weight:400}
.bk-it .bk-nm small svg,.bk-it .bk-nm small img{vertical-align:-2px}
.bk-it .bk-ct{grid-column:3;font-size:13px;color:var(--bi2);font-variant-numeric:tabular-nums;white-space:nowrap}
.bk-it .bk-ic{grid-column:1;width:22px;display:grid;place-items:center}
.bk-it.locked .bk-nm{color:var(--bf)}
/* the small picture at the start of each line */
.bk-th{grid-column:1;width:48px;height:36px;display:block;object-fit:cover;image-rendering:pixelated;border:1.5px solid var(--bi);border-radius:3px;background:var(--bp2)}
.bk-th.mon{border:0;background:none;width:48px;height:40px;object-fit:contain}
.bk-th.face{width:38px;height:38px;justify-self:center;background:#e9dcc0}
.bk-th.q{display:grid;place-items:center;border-style:dashed;border-color:var(--bf);color:var(--bf);font:700 18px var(--font-display);background:transparent}
.bk-th.q.doc{border-style:solid;border-color:var(--bg2);color:var(--bg2)}
.bk-th.q svg{width:22px;height:22px}
.bk-th.dark{filter:brightness(.4) grayscale(.6)}
.bk-th.sil,.bk-mon.sil{filter:brightness(0) opacity(.45)}
/* the plate: the big picture at the top of the right page */
.bk-plate{position:relative;margin:8px 0 14px;max-width:460px;aspect-ratio:4/3;border:2px solid var(--bi);border-radius:4px;overflow:hidden;background:var(--bp2) center/cover no-repeat;image-rendering:pixelated;box-shadow:3px 3px 0 rgba(58,42,34,.18);display:grid;place-items:center}
.bk-plate > .bk-scn{width:100%;height:100%;display:block;object-fit:cover;image-rendering:pixelated}
.bk-plate.dark > .bk-scn,.bk-plate.dark{filter:none}
.bk-plate.dark > .bk-scn{filter:brightness(.38) grayscale(.6)}
.bk-plate.dark::before{content:"";position:absolute;inset:0;background:rgba(29,22,38,.55)}
.bk-plate.mons{aspect-ratio:16/8;place-items:end center;background-size:150%;background-position:center 70%}
.bk-plate.mons::before,.bk-plate.mon::before{content:"";position:absolute;inset:0;background:linear-gradient(transparent 40%,rgba(242,230,204,.35))}
.bk-plate.mon{aspect-ratio:3/2;place-items:end center}
.bk-plate.mon .bk-mon{position:relative;width:50%;height:auto;aspect-ratio:6/5;margin-bottom:4%}
.bk-plate .bk-face{position:absolute;left:10px;bottom:10px;width:26%;max-width:110px;aspect-ratio:1;image-rendering:pixelated;border:2px solid var(--bi);border-radius:4px;background:#e9dcc0;box-shadow:2px 2px 0 rgba(0,0,0,.3)}
.bk-lock,.bk-q-big{position:absolute;inset:0;display:grid;place-items:center;font:700 56px var(--font-display);color:#f2e6cc;text-shadow:0 2px 0 rgba(0,0,0,.4)}
.bk-leaf.turn{animation:bkturn .3s ease-out;transform-origin:left center}
@keyframes bkturn{from{opacity:0;transform:rotateY(-14deg) translateX(10px)}to{opacity:1;transform:none}}
.bk-say{margin:0 0 6px;font-size:15px}
.bk-say.n{font-style:italic;color:var(--bi2)}
.bk-say.epi{font-style:italic;border-left:3px solid var(--bi2);padding-left:8px}
.bk-q{margin:10px 0 4px;font-weight:700;color:var(--bg2)}
.bk-grey{color:var(--bf);border-bottom:1px dashed var(--bf);display:inline-block;margin:4px 0;padding-bottom:1px}
.bk-branch{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:8px 0}
.bk-br{border:2px solid var(--bi);border-radius:6px;padding:6px 8px;font-size:14px;display:grid;gap:4px}
.bk-br.off{border-style:dashed;border-color:var(--bf);color:var(--bf)}
.bk-br b{font-family:var(--font-display);font-size:14px}
.bk-margin{border-left:3px solid var(--bs);padding:4px 10px;margin:12px 0;color:var(--bs);font-size:14px}
.bk-ex{font-size:12px;color:var(--bi2);font-style:italic}
.bk-card .rcard{margin:0 auto}
.bk-mon{width:192px;height:160px;image-rendering:pixelated;display:block}
.bk-mon.sil{filter:brightness(0) opacity(.45)}
.bk-stages{position:relative;display:flex;gap:2%;align-items:flex-end;justify-content:center;width:100%;height:100%;padding:0 4% 4%}
.bk-stages .bk-mon{width:30%;height:auto;aspect-ratio:6/5;margin:0}
.bk-lore{border-left:3px solid var(--bg2);padding:2px 10px;margin:8px 0}
.bk-lore b{font:700 13px var(--font-display);color:var(--bg2);letter-spacing:.03em}
.bk-lore.off{border-left-style:dashed;border-color:var(--bf)}
.bk-lore.off b,.bk-lore.off .bk-say{color:var(--bf)}
.bk-bar{display:grid;grid-template-columns:minmax(90px,150px) 1fr 44px;gap:8px;align-items:center;font-size:14px;margin:4px 0}
.bk-bar .tr{background:var(--bp2);border-radius:5px;height:10px}
.bk-bar i{display:block;height:10px;border-radius:5px;background:var(--bg2)}
.bk-bar span:last-child{text-align:right;font-variant-numeric:tabular-nums}
.bk-book .unk{color:var(--bf)}
.bk-prog{height:6px;background:var(--bp2);border-radius:3px;margin:4px 0 12px}
.bk-prog i{display:block;height:100%;background:var(--bg2);border-radius:3px}
.bk-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:8px 0;text-align:center}
.bk-stats div{background:var(--bp2);border-radius:6px;padding:6px 2px}
.bk-stats b{display:block;font-size:19px;font-variant-numeric:tabular-nums}
.bk-stats small{font-size:12px;color:var(--bi2)}
.bk-seg{display:flex;gap:4px;flex-wrap:wrap;margin:6px 0}
.bk-seg button{appearance:none;border:2px solid var(--bi);background:transparent;color:var(--bi);font:600 13px var(--font-body);border-radius:14px;padding:2px 10px;cursor:pointer;min-height:32px}
.bk-seg button[aria-pressed=true]{background:var(--bi);color:var(--bp)}
.zone-odds .unk{opacity:.7}
.bk-tabs{display:flex;flex-direction:column;gap:6px;padding-top:26px;margin-left:-4px}
.bk-tab{appearance:none;border:0;cursor:pointer;width:50px;height:46px;border-radius:0 10px 10px 0;display:grid;place-items:center;color:#fff;opacity:.8;transform:translateX(-6px);transition:transform .15s,opacity .15s;position:relative}
.bk-tab svg{width:22px;height:22px}
.bk-tab[aria-selected=true]{opacity:1;transform:none;box-shadow:2px 2px 0 rgba(0,0,0,.25)}
.bk-tab:focus-visible{outline:3px solid var(--bh);outline-offset:2px}
.bk-tab .dot{position:absolute;top:5px;right:6px;width:8px;height:8px;border-radius:50%;background:#ffd25e;box-shadow:0 0 0 2px rgba(0,0,0,.25)}
.bk-tt{position:absolute;left:56px;white-space:nowrap;background:var(--bp);color:var(--bi);font:600 13px var(--font-body);padding:2px 8px;border-radius:4px;opacity:0;pointer-events:none}
.bk-tab:hover .bk-tt,.bk-tab:focus-visible .bk-tt{opacity:1}
@media (prefers-color-scheme:dark){.bk-book{--bp:#2c2620;--bp2:#221d18;--bi:#ecdcbc;--bi2:#bba68a;--bf:#7d6f5c;--bg2:#e0b060;--bs:#a08ce0;--bh:#4a3d24;--lea:#3a2416;--lea2:#24160c}
  .bk-page.l{box-shadow:-3px 3px 0 -1px #3a332b,-6px 6px 0 -2px #4a4036}.bk-page.r{box-shadow:3px 3px 0 -1px #3a332b,6px 6px 0 -2px #4a4036}}
/* medium screens (the game window beside a chat, a tablet): ribbons on top, still two facing pages */
@media (max-width:899px){
  .bk-wrap{padding:6px}
  .bk-book{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);height:calc(100dvh - 12px)}
  .bk-tabs{order:-1;flex-direction:row;padding:0 14px;margin:0 0 -2px;gap:4px;overflow-x:auto;scrollbar-width:none}
  .bk-tab{border-radius:10px 10px 0 0;transform:translateY(5px);width:46px;height:40px;flex:0 0 auto}
  .bk-tab[aria-selected=true]{transform:none}
  .bk-tt{display:none}
  .bk-cover{grid-template-columns:minmax(190px,.85fr) minmax(0,1.25fr);padding:8px 8px 12px}
  .bk-cover::after{left:calc(8px + (100% - 16px) * .85 / 2.1)}
  .bk-page{padding:14px 14px 20px}
  .bk-book h2{font-size:18px}
  .bk-stats{grid-template-columns:repeat(3,1fr)}
}
/* phones: one page at a time; picking an entry turns to its page, with a button back to the list */
@media (max-width:599px){
  .bk-wrap{padding:0}
  .bk-book{height:100dvh;width:100%}
  .bk-tabs{padding:6px 8px 0;background:#1d1626;margin:0}
  .bk-cover{grid-template-columns:minmax(0,1fr);padding:0;border-radius:0}
  .bk-cover::after{display:none}
  .bk-page.l,.bk-page.r{border-radius:0;box-shadow:none}
  .bk-book.show-page .bk-page.l,.bk-book:not(.show-page) .bk-page.r{display:none}
  .bk-nav{display:flex;margin:-4px 0 6px}
  .bk-plate{max-width:none}
}
@media (prefers-reduced-motion:reduce){.bk-tab{transition:none}}`;
  (document.body || document.head).appendChild(s);
})();
(function bookHook() {
  const b = $("btnBook"); if (!b) return;
  b.addEventListener("click", () => { EV.sfx("tap"); openBook(); });
  refreshBookBtn();
})();
