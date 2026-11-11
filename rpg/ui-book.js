/* Evolvlings RPG: the Caretaker's Book (plan https://claude.ai/artifact/ShBFpCPxKnsPHppSMNS9NK, delivery 1).
   An open book over the game: ribbon tabs with icons on the side, the list on the left page and the detail of the
   picked entry on the right one (tabs on top and pages stacked on a phone). It only shows what the Caretaker has seen
   or heard: the rest stays grey or "???", and people go by their trade until their name is heard (rpg/ui-talk.js).
   Sections so far:
     diario    every conversation you lived, copied line by line: the questions you asked and the way you took; the
               ones you skipped are grey lines, the endings you did not choose are grey boxes (EV.P.diary)
     cartas    the Grimoire (it moved here from the Cards panel): every card by circle and type, and crafting
     escritos  the Writings you found, and the Threads two of them make together
   EV.P.bookNew holds the sections with something new (a dot on the ribbon and on the button). Classic script: it uses
   the shared rpg/*.js names (TALK, CARDS, cardHtml...). */
"use strict";
const BOOK_ICON = {
  diario: '<path d="M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 8h7M9 12h7M9 16h4" stroke="currentColor" stroke-width="2"/>',
  cartas: '<rect x="4" y="5" width="11" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 4.5l9 2.5-3 13" fill="none" stroke="currentColor" stroke-width="2"/>',
  escritos: '<path d="M6 4h10l3 3v13H6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 10h7M9 14h7" stroke="currentColor" stroke-width="2"/>',
};
const BOOK_TABS = [["diario", "#a3343b"], ["cartas", "#2f5d96"], ["escritos", "#8a7a64"]];
const BK = { open: false, tab: "diario", sel: {} };
const bookNew = () => EV.P.bookNew || (EV.P.bookNew = {});
const bt = (k, v) => tx("book." + k, v);

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
function diaryCounts(z) {
  const D = diarySlice(); let lived = 0, ends = 0, seen = 0, all = 0;
  for (const id in TALK[z]) {
    const ev = TALK[z][id], R = D[z + "/" + id], E = evEnds(ev);
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
      if (!R) { h += `<li><button type="button" class="bk-it locked" data-bksel="${k}"${BK.sel.diario === k ? ' aria-current="true"' : ""}><span class="bk-nm">???<small>${esc(bt("notLived"))}</small></span><span class="bk-ct">0 / ${E.length}</span></button></li>`; continue; }
      h += `<li><button type="button" class="bk-it" data-bksel="${k}"${BK.sel.diario === k ? ' aria-current="true"' : ""}><span class="bk-nm">${esc(evTitle(id))}<small>${esc(tx("talk.k." + ev.kind))}</small></span><span class="bk-ct">${E.filter((n) => R.v[n]).length} / ${E.length}</span></button></li>`;
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
  if (!R) return `<h3>???</h3><p class="bk-sub">${esc(bt("notLivedLong", { z: zoneLabel(z) }))}</p>`;
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
  const scene = window.EVSCENE && EVSCENE.EVNOTE && EVSCENE.EVNOTE[id];
  return `<h3>${esc(evTitle(id))}</h3><p class="bk-sub">${esc(zoneLabel(z))} · ${esc(tx("talk.k." + ev.kind))} · ${esc((R.n || 1) > 1 ? bt("times", { n: R.n }) : bt("once"))}</p>${scene ? `<div class="bk-pic" data-bkscene="${id}"></div>` : ""}${body}`;
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
      h += g[id] ? `<li><button type="button" class="bk-it" data-bksel="${id}"${on}><span class="bk-ic">${tyIcon(CARDS[id].type)}</span><span class="bk-nm">${esc(cardName(id))}<small>${esc(TYPES[CARDS[id].type][L()])}</small></span></button></li>`
        : `<li><button type="button" class="bk-it locked" data-bksel="${id}"${on}><span class="bk-ic">${tyIcon(CARDS[id].type)}</span><span class="bk-nm">???<small>${esc(TYPES[CARDS[id].type][L()])}</small></span></button></li>`;
    }
    h += `</ul>`;
  }
  return h;
}
function cardsPage(id) {
  const P = EV.P, C = CARDS[id]; if (!C) return `<p class="bk-sub">${esc(bt("pickCard"))}</p>`;
  const boss = !!C.boss || !!C.story, owner = C.by && MONS[C.by] ? monName(C.by) : "";
  const craft = boss ? `<p class="rc-cant">${esc(tx(C.story ? "grim.story" : "grim.boss"))}</p>` : `<div class="rc-btns"><button class="btn ghost" type="button" data-craft="${id}" ${(P.dust || 0) < craftCost() ? "disabled" : ""}>${esc(tx("grim.craft", { c: craftCost() }))}</button></div>`;
  return `<div class="bk-card">${(P.grim || {})[id] ? cardHtml(id, 0, { foot: craft }) : ghostCardHtml(id, tx("grim.unknown") + (owner && !boss ? " · " + tx("grim.by", { mon: owner }) : ""), craft)}</div>`;
}

/* ---------- Writings ---------- */
function escList() {
  if (!LORE) return "";
  const have = EV.P.escritos || {}, all = LORE.LORE_ESCRITOS;
  let h = `<p class="bk-sub">${esc(tx("esc.desc"))} ${esc(tx("grim.count", { n: all.filter((w) => have[w.id]).length, m: all.length }))}</p><ul class="bk-list">`;
  for (const w of all) {
    const on = BK.sel.escritos === w.id ? ' aria-current="true"' : "";
    h += have[w.id] ? `<li><button type="button" class="bk-it" data-bksel="${w.id}"${on}><span class="bk-nm">${esc(maskNames((w[L()] || w.es).title))}</span></button></li>`
      : `<li><button type="button" class="bk-it locked" data-bksel="${w.id}"${on}><span class="bk-nm">???</span></button></li>`;
  }
  const H = (LORE.LORE_HILOS || []).filter((x) => have[x.a] && have[x.b]);
  if (H.length) h += `<li><button type="button" class="bk-it" data-bksel="@hilos"${BK.sel.escritos === "@hilos" ? ' aria-current="true"' : ""}><span class="bk-nm">${esc(tx("esc.hilos"))}<small>${H.length}</small></span></button></li>`;
  return h + `</ul>`;
}
function escPage(id) {
  if (!LORE) return "";
  const have = EV.P.escritos || {};
  if (id === "@hilos") { const H = (LORE.LORE_HILOS || []).filter((x) => have[x.a] && have[x.b]); return `<h3>${esc(tx("esc.hilos"))}</h3><ul class="hilos">${H.map((x) => `<li>${esc(maskNames(x[L()] || x.es))}</li>`).join("")}</ul>`; }
  const w = LORE.LORE_ESCRITOS.find((x) => x.id === id); if (!w) return `<p class="bk-sub">${esc(bt("pickEsc"))}</p>`;
  if (!have[w.id]) return `<h3>???</h3><p class="bk-sub">${esc(isOrphan(w) ? tx("esc.from.deep") : tx("esc.from." + w.from, { z: w.zone ? zt("name", null, w.zone) : "" }))}</p>`;
  const t = w[L()] || w.es;
  return `<h3>${esc(maskNames(t.title))}</h3>${t.text.split(/\n+/).map((p) => `<p class="bk-say">${esc(maskNames(p))}</p>`).join("")}`;
}

/* ---------- the book ---------- */
const BOOK_SEC = {
  diario: { list: diaryList, page: diaryPage, first: () => { const D = diarySlice(); return Object.keys(D).sort((a, b) => D[b].t - D[a].t)[0]; }, sub: () => { const z = DZONES().map(diaryCounts).reduce((a, c) => ({ lived: a.lived + c.lived, all: a.all + c.all, seen: a.seen + c.seen, ends: a.ends + c.ends }), { lived: 0, all: 0, seen: 0, ends: 0 }); return bt("diarioSub", { n: z.lived, m: z.all, a: z.seen, b: z.ends }); } },
  cartas: { list: cardsList, page: cardsPage, first: () => Object.keys(CARDS).find((id) => (EV.P.grim || {})[id]), sub: () => tx("grim.desc") },
  escritos: { list: escList, page: escPage, first: () => LORE && (LORE.LORE_ESCRITOS.find((w) => (EV.P.escritos || {})[w.id]) || {}).id, sub: () => "" },
};
function bookHtml() {
  const S = BOOK_SEC[BK.tab], N = bookNew();
  if (BK.sel[BK.tab] == null) BK.sel[BK.tab] = S.first() || null;
  const tabs = BOOK_TABS.map(([k, col]) => `<button type="button" class="bk-tab" role="tab" data-bktab="${k}" aria-selected="${BK.tab === k}" style="background:${col}" aria-label="${esc(bt("tab." + k))}"><svg viewBox="0 0 24 24" aria-hidden="true">${BOOK_ICON[k]}</svg><span class="bk-tt">${esc(bt("tab." + k))}</span>${N[k] ? '<i class="dot"></i>' : ""}</button>`).join("");
  const sub = S.sub();
  return `<div class="bk-back" data-bkclose="1"></div><div class="bk-book" role="dialog" aria-modal="true" aria-label="${esc(bt("title"))}">
    <section class="bk-page l"><div class="bk-head"><h2>${esc(bt("tab." + BK.tab))}</h2><button type="button" class="sheet-x" data-bkclose="1" aria-label="${esc(tx("load.close"))}">✕</button></div>${sub ? `<p class="bk-sub">${esc(sub)}</p>` : ""}${S.list()}</section>
    <section class="bk-page r" aria-live="polite">${BK.sel[BK.tab] != null ? S.page(BK.sel[BK.tab]) : `<p class="bk-sub">${esc(bt("empty"))}</p>`}</section>
    <div class="bk-tabs" role="tablist" aria-label="${esc(bt("title"))}">${tabs}</div></div>`;
}
function bookMount(el) {
  el.querySelectorAll("[data-bkscene]").forEach((box) => { try { const cv = EVSCENE.event(box.dataset.bkscene); if (cv) { const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height; c.getContext("2d").drawImage(cv, 0, 0); c.setAttribute("role", "img"); const n = EVSCENE.EVNOTE[box.dataset.bkscene]; if (n && n.scene) c.setAttribute("aria-label", maskNames(n.scene)); box.appendChild(c); } } catch (e) { /* art is decoration */ } });
}
function renderBook() {
  const el = $("bookView"); if (!el || !BK.open) return;
  const sc = el.querySelector(".bk-page.l"), st = sc ? sc.scrollTop : 0;
  el.innerHTML = bookHtml(); bookMount(el);
  const l2 = el.querySelector(".bk-page.l"); if (l2) l2.scrollTop = st;
}
function openBook(tab) {
  bookSeed();
  let el = $("bookView");
  if (!el) {
    el = document.createElement("div"); el.id = "bookView"; el.className = "bk-wrap"; document.body.appendChild(el);
    el.addEventListener("click", onBookClick);
  }
  if (tab) BK.tab = tab;
  BK.open = true; el.hidden = false;
  delete bookNew()[BK.tab];
  renderBook(); refreshBookBtn();
  if (EV.GUIDE) setTimeout(() => EV.GUIDE.showTip("book"), 0);
  const f = el.querySelector(".bk-tab[aria-selected=true]"); if (f) f.focus({ preventScroll: true });
}
function closeBook() { BK.open = false; const el = $("bookView"); if (el) el.hidden = true; EV.save(); refreshBookBtn(); const b = $("btnBook"); if (b) b.focus({ preventScroll: true }); }
function onBookClick(e) {
  const t = e.target.closest("[data-bkclose],[data-bktab],[data-bksel],button"); if (!t) return;
  if (t.dataset.bkclose) { closeBook(); return; }
  if (t.dataset.bktab) { EV.sfx("tap"); BK.tab = t.dataset.bktab; delete bookNew()[BK.tab]; renderBook(); refreshBookBtn(); return; }
  if (t.dataset.bksel != null) {
    EV.sfx("tap"); BK.sel[BK.tab] = t.dataset.bksel; renderBook();
    const r = $("bookView").querySelector(".bk-page.r"); if (r) { r.scrollTop = 0; if (matchMedia("(max-width: 760px)").matches) r.scrollIntoView({ block: "start", behavior: "smooth" }); }
    return;
  }
  if (t.dataset.craft) { onCardsClick(e); renderBook(); }
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && BK.open && !($("cview") && !$("cview").hidden)) { e.stopImmediatePropagation(); closeBook(); } }, true);
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
.bk-wrap{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:16px}
.bk-wrap[hidden]{display:none}
.bk-back{position:absolute;inset:0;background:rgba(20,14,26,.62)}
.bk-book{--bp:#f2e6cc;--bp2:#e8d8b6;--bi:#3a2a22;--bi2:#6e5848;--bf:#a8957a;--bg2:#b0782a;--bs:#4b3a6e;--bh:#e9cf8f;position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr) auto;width:min(1040px,100%);height:min(720px,calc(100dvh - 32px));color:var(--bi)}
.bk-page{background:var(--bp);padding:18px 20px 22px;min-width:0;overflow:auto;overscroll-behavior:contain;box-shadow:inset 0 0 40px rgba(120,80,30,.12)}
.bk-page.l{border-radius:10px 0 0 10px;background:linear-gradient(90deg,var(--bp) 88%,var(--bp2))}
.bk-page.r{border-radius:0 6px 6px 0;background:linear-gradient(270deg,var(--bp) 90%,var(--bp2))}
.bk-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.bk-book h2{font-family:var(--font-display);font-size:22px;margin:0;color:var(--bi)}
.bk-book h3{font-family:var(--font-display);font-size:18px;margin:0 0 4px;color:var(--bi)}
.bk-book .sheet-x{position:static;color:var(--bi);flex:0 0 auto}
.bk-sub{color:var(--bi2);font-size:14px;margin:2px 0 10px}
.bk-grp{font:700 13px var(--font-display);letter-spacing:.06em;color:var(--bg2);margin:12px 0 2px;display:flex;justify-content:space-between}
.bk-grp small{color:var(--bi2);font-weight:400}
.bk-list{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.bk-it{appearance:none;width:100%;text-align:left;border:0;background:transparent;color:var(--bi);font:inherit;cursor:pointer;display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:5px 8px;border-radius:6px;min-height:40px}
.bk-it:hover{background:rgba(176,120,42,.12)}
.bk-it[aria-current=true]{background:var(--bh)}
.bk-it:focus-visible{outline:2px solid var(--bg2)}
.bk-it .bk-nm{grid-column:2;min-width:0;font-weight:600}
.bk-it .bk-nm small{display:block;color:var(--bi2);font-size:12px;font-weight:400}
.bk-it .bk-ct{grid-column:3;font-size:13px;color:var(--bi2);font-variant-numeric:tabular-nums}
.bk-it .bk-ic{grid-column:1;width:22px;display:grid;place-items:center}
.bk-it.locked .bk-nm{color:var(--bf)}
.bk-pic canvas{width:100%;max-width:420px;image-rendering:pixelated;border:2px solid var(--bi);border-radius:4px;display:block;margin:6px 0 12px}
.bk-say{margin:0 0 6px;font-size:15px}
.bk-say.n{font-style:italic;color:var(--bi2)}
.bk-q{margin:10px 0 4px;font-weight:700;color:var(--bg2)}
.bk-grey{color:var(--bf);border-bottom:1px dashed var(--bf);display:inline-block;margin:4px 0;padding-bottom:1px}
.bk-branch{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:8px 0}
.bk-br{border:2px solid var(--bi);border-radius:6px;padding:6px 8px;font-size:14px;display:grid;gap:4px}
.bk-br.off{border-style:dashed;border-color:var(--bf);color:var(--bf)}
.bk-br b{font-family:var(--font-display);font-size:14px}
.bk-margin{border-left:3px solid var(--bs);padding:4px 10px;margin:12px 0;color:var(--bs);font-size:14px}
.bk-ex{font-size:12px;color:var(--bi2);font-style:italic}
.bk-card .rcard{margin:0 auto}
.bk-tabs{display:flex;flex-direction:column;gap:6px;padding-top:22px;margin-left:-2px}
.bk-tab{appearance:none;border:0;cursor:pointer;width:50px;height:46px;border-radius:0 10px 10px 0;display:grid;place-items:center;color:#fff;opacity:.75;transform:translateX(-6px);transition:transform .15s,opacity .15s;position:relative}
.bk-tab svg{width:22px;height:22px}
.bk-tab[aria-selected=true]{opacity:1;transform:none;box-shadow:2px 2px 0 rgba(0,0,0,.25)}
.bk-tab:focus-visible{outline:3px solid var(--bh);outline-offset:2px}
.bk-tab .dot{position:absolute;top:5px;right:6px;width:8px;height:8px;border-radius:50%;background:#ffd25e;box-shadow:0 0 0 2px rgba(0,0,0,.25)}
.bk-tt{position:absolute;left:56px;white-space:nowrap;background:var(--bp);color:var(--bi);font:600 13px var(--font-body);padding:2px 8px;border-radius:4px;opacity:0;pointer-events:none}
.bk-tab:hover .bk-tt,.bk-tab:focus-visible .bk-tt{opacity:1}
@media (prefers-color-scheme:dark){.bk-book{--bp:#2c2620;--bp2:#241f1a;--bi:#ecdcbc;--bi2:#bba68a;--bf:#7d6f5c;--bg2:#e0b060;--bs:#a08ce0;--bh:#4a3d24}}
@media (max-width:760px){
  .bk-wrap{padding:0;place-items:stretch}
  .bk-book{display:flex;flex-direction:column;height:100dvh;width:100%;overflow:auto}
  .bk-tabs{order:-1;flex-direction:row;padding:8px 8px 0;margin:0;position:sticky;top:0;z-index:1;background:#1d1626}
  .bk-tab{border-radius:10px 10px 0 0;transform:translateY(4px);width:48px;height:42px}
  .bk-tab[aria-selected=true]{transform:none}
  .bk-tt{display:none}
  .bk-page{overflow:visible;flex:0 0 auto}
  .bk-tabs{flex:0 0 auto}
  .bk-page.l{border-radius:0}
  .bk-page.r{border-radius:0;border-top:2px dashed var(--bf);min-height:50dvh}
}
@media (prefers-reduced-motion:reduce){.bk-tab{transition:none}}`;
  document.head.appendChild(s);
})();
(function bookHook() {
  const b = $("btnBook"); if (!b) return;
  b.addEventListener("click", () => { EV.sfx("tap"); openBook(); });
  refreshBookBtn();
})();
