/* Evolvlings RPG: the ten eras of the Glade (data: rpg/data-eras.js, events: rpg/events-era<N>.js).
   EV.P.era      the era the Glade lives in now (1 when missing)
   EV.P.eraWins  guardians beaten in each zone since this era began (lore.js counts the lore layer from it after era 1)
   EV.P.eras     { n: { end, at } } how each era closed (end = the key of one of its `ends`)
   EV.P.eraOffer the next era, once it can begin; it begins when you retire your creature to the Hall of Fame
                 (elder.js writes EV.P.hof), or with the button on its page of the Book's Chronicle. Era 2 is
                 offered as soon as the Heart is calmed in era 1, because it is that victory's bill.
   Changing era empties each zone's event bag (EV.P.evDeck) and swaps the zone texts that era rewrites (ZT).
   Classic script loaded after rpg/ui-book.js: it adds the "cronica" section to the Book. */
"use strict";
const ERA = window.EVERAS || { ERAS: [], PEOPLES: { es: {}, en: {} }, era: () => null };
const ERA_TX = {
  es: {
    begins: "Empieza una era nueva", now: "Ahora", lived: "Vivida", next: "Puede empezar", soon: "Llega en una próxima entrega", unknown: "Sin descubrir",
    start: "Empezar «{name}»", later: "Todavía no", wait: "Puedes empezarla cuando quieras desde la Crónica, en el Libro. Retirar a tu criatura al Salón de la fama también la empieza.",
    years: "Dejar pasar los años", yearsHow: "Retirar a tu criatura al Salón de la fama empieza la era siguiente: su heredero nace en ella. También puedes dejar pasar los años sin retirarla.",
    closed: "Se cierra la era: {name}", closedHow: "La era siguiente llega en una próxima entrega del juego. Lo que elegiste cambiará cómo empieza.",
    sub: "Las diez vueltas del ciclo. Cada era empieza en el mundo que dejó la anterior.", era: "Era {n}", how: "Cómo terminó", peoples: "Pueblos que están contigo",
    unite: "Si los nueve pueblos están contigo, el Corazón ofrece otra salida.", allIn: "Están los nueve.", none: "Todavía ninguno.", toast: "Empieza la era {n}: {name}", ok: "Seguir",
  },
  en: {
    begins: "A new era begins", now: "Now", lived: "Lived", next: "Can begin", soon: "Coming in a future update", unknown: "Undiscovered",
    start: "Begin “{name}”", later: "Not yet", wait: "You can begin it whenever you like from the Chronicle, in the Book. Retiring your creature to the Hall of Fame begins it too.",
    years: "Let the years pass", yearsHow: "Retiring your creature to the Hall of Fame begins the next era: its heir is born in it. You can also let the years pass without retiring it.",
    closed: "The era closes: {name}", closedHow: "The next era comes in a future update of the game. What you chose will change how it begins.",
    sub: "The ten turns of the cycle. Each era begins in the world the last one left.", era: "Era {n}", how: "How it ended", peoples: "Peoples who stand with you",
    unite: "If all nine peoples stand with you, the Heart offers another way out.", allIn: "All nine are here.", none: "None yet.", toast: "Era {n} begins: {name}", ok: "Continue",
  },
};
const etx = EV.text("eras", ERA_TX);
const eraNow = () => (EV.P && EV.P.era) || 1;
const eraTxt = (e) => (e && (e[L()] || e.es)) || {};
const erasDone = () => EV.P.eras || (EV.P.eras = {});
// the opening lines of an era: the ones for how the era before it ended (introBy), then the common ones
const eraIntro = (n) => { const t = eraTxt(ERA.era(n)), d = erasDone()[n - 1], by = (t.introBy && d && t.introBy[d.end]) || []; return by.concat(t.intro || []); };

/* ---------- zone texts: each era can rewrite a zone's description and its guardian's lines ---------- */
const ZT_BASE = { es: {}, en: {} };
for (const lg of ["es", "en"]) for (const z in ZT[lg]) ZT_BASE[lg][z] = Object.assign({}, ZT[lg][z]);
function eraZoneTexts() {
  const e = ERA.era(eraNow()), over = (e && e.zones) || {};
  for (const lg of ["es", "en"]) for (const z in ZT_BASE[lg]) ZT[lg][z] = Object.assign({}, ZT_BASE[lg][z], (over[lg] || {})[z] || {});
}

/* ---------- what moves the eras along ---------- */
// a guardian beaten (rpg/ui-events.js calls it): it counts for this era's lore layer
function eraWin(zone) {
  if (eraNow() < 2) return;
  const W = EV.P.eraWins || (EV.P.eraWins = {});
  W[zone] = (W[zone] || 0) + 1;
}
// every people of this era who stands with you: then the era's unite flag opens the best ending
function eraUnite() {
  const e = ERA.era(eraNow()); if (!e || !e.peoples || !e.unite) return;
  const F = EV.P.flags || (EV.P.flags = {});
  if (!F[e.unite] && e.peoples.every(([f]) => F[f])) { F[e.unite] = 1; EV.save(); }
}
function eraBegin(n) {
  const e = ERA.era(n); if (!e || !e.ready) return;
  const P = EV.P;
  P.era = n; P.eraWins = {}; P.evDeck = {}; delete P.eraOffer;
  P.eraHof = (P.hof || []).length;
  P.bookNew = Object.assign(P.bookNew || {}, { cronica: 1 });
  eraZoneTexts();
  EV.addLog(etx("toast", { n, name: eraTxt(e).name }));
  EV.toast(etx("toast", { n, name: eraTxt(e).name }), "🌒");
  EV.save();
  eraDialog(n, "intro");
}
function eraCheck() {
  const P = EV.P; if (!P) return;
  const n = eraNow(), e = ERA.era(n), D = erasDone();
  eraUnite();
  if (!D[n] && e) {
    // era 1 closes when the Heart is calmed; the later ones when their final choice sets one of their ends' flags
    let end = null;
    if (n === 1) { if ((P.cleared || {}).heart) end = "calma"; }
    else for (const x of e.ends || []) if (x.flag && (P.flags || {})[x.flag]) { end = x.key; break; }
    if (end) {
      D[n] = { end, at: Date.now() };
      const nx = ERA.era(n + 1);
      if (nx) P.eraOffer = n + 1;
      P.bookNew = Object.assign(P.bookNew || {}, { cronica: 1 });
      P.eraHof = (P.hof || []).length;
      EV.save();
      if (n > 1) P.eraShow = "closed:" + n;
      else if (nx && nx.ready) P.eraShow = "offer:" + (n + 1);
    }
  }
  // retiring a creature to the Hall of Fame (elder.js) lets the years pass
  const hl = (P.hof || []).length;
  if (P.eraHof == null) P.eraHof = hl;
  if (hl > P.eraHof) { P.eraHof = hl; const o = ERA.era(P.eraOffer); if (o && o.ready) { eraBegin(o.n); return; } }
  // the big moments wait until you are back from the trip
  if (P.eraShow && typeof X !== "undefined" && !X) { const [k, m] = P.eraShow.split(":"); delete P.eraShow; EV.save(); eraDialog(+m, k); }
}

/* ---------- the dialog of a new era (or of one that closes) ---------- */
let eraDlg = null;
function eraDialog(n, kind) {
  const e = ERA.era(n), t = eraTxt(e); if (!e) return;
  if (!eraDlg) {
    eraDlg = document.createElement("div"); eraDlg.className = "era-wrap"; eraDlg.id = "eraDlg"; eraDlg.setAttribute("role", "dialog"); eraDlg.setAttribute("aria-modal", "true");
    document.body.appendChild(eraDlg);
    eraDlg.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-erago],[data-erax]"); if (!b) return;
      EV.sfx("tap"); eraDlg.hidden = true;
      if (b.dataset.erago) eraBegin(+b.dataset.erago);
    });
  }
  let h = `<div class="era-back" data-erax="1"></div><div class="era-box"><p class="era-k">${esc(etx(kind === "closed" ? "closed" : "begins", { name: t.name }))}</p>`;
  if (kind === "closed") {
    const d = erasDone()[n], end = (e.ends || []).find((x) => x.key === (d && d.end)), et = eraTxt(end);
    h += `<h3>${esc(et.t || t.name)}</h3><p>${esc(et.d || "")}</p>`;
    const nx = ERA.era(n + 1);
    // the next era is in the game: it begins when you retire your creature, or now if you let the years pass
    if (nx && nx.ready) h += `<p class="muted">${esc(etx("yearsHow"))}</p><div class="era-row"><button class="btn" type="button" data-erago="${n + 1}">${esc(etx("years"))}</button><button class="btn ghost" type="button" data-erax="1">${esc(etx("later"))}</button></div>`;
    else h += `<p class="muted">${esc(etx("closedHow"))}</p><div class="era-row"><button class="btn" type="button" data-erax="1">${esc(etx("ok"))}</button></div>`;
  } else {
    h += `<h3>${esc(etx("era", { n }))} · ${esc(t.name)}</h3>${eraIntro(n).map((l) => `<p>${esc(l)}</p>`).join("")}`;
    if (kind === "offer") h += `<p class="muted">${esc(etx("wait"))}</p><div class="era-row"><button class="btn" type="button" data-erago="${n}">${esc(etx("start", { name: t.name }))}</button><button class="btn ghost" type="button" data-erax="1">${esc(etx("later"))}</button></div>`;
    else h += `<div class="era-row"><button class="btn" type="button" data-erax="1">${esc(etx("ok"))}</button></div>`;
  }
  eraDlg.innerHTML = h + "</div>";
  eraDlg.hidden = false;
  const f = eraDlg.querySelector(".btn"); if (f) f.focus({ preventScroll: true });
}

/* ---------- the Chronicle: a page of the Book with the ten eras ---------- */
function eraState(n) {
  const D = erasDone(), e = ERA.era(n);
  if (n === eraNow()) return "now";
  if (D[n]) return "lived";
  if (EV.P.eraOffer === n) return e && e.ready ? "next" : "soon";
  return "unknown";
}
const eraKnown = (n) => eraState(n) !== "unknown";
function cronicaList() {
  let h = `<ul class="bk-list">`;
  for (const e of ERA.ERAS) {
    const st = eraState(e.n), on = String(BK.sel.cronica) === String(e.n) ? ' aria-current="true"' : "";
    const nm = eraTxt(e).name;
    h += `<li><button type="button" class="bk-it${eraKnown(e.n) ? "" : " locked"}" data-bksel="${e.n}"${on}>${eraKnown(e.n) ? thumbBox("pz:heart:camino") : '<span class="bk-th q">?</span>'}<span class="bk-nm">${esc(etx("era", { n: e.n }))}${eraKnown(e.n) ? " · " + esc(nm) : ""}<small>${esc(etx(st))}</small></span></button></li>`;
  }
  return h + `</ul>`;
}
function cronicaPage(sel) {
  const n = +sel, e = ERA.era(n); if (!e) return "";
  const st = eraState(n), t = eraTxt(e);
  if (!eraKnown(n)) return `<h3>${esc(etx("era", { n }))}</h3><p class="bk-sub">${esc(etx("unknown"))}</p>${plate('<span class="bk-q-big">?</span>', "dark", zoneBg("heart"))}`;
  let h = `<h3>${esc(etx("era", { n }))} · ${esc(t.name)}</h3><p class="bk-sub">${esc(t.sub || "")} · ${esc(etx(st))}</p>${plate(sceneBox("pz:heart:camino"))}`;
  const d = erasDone()[n], end = d && (e.ends || []).find((x) => x.key === d.end);
  if (end) h += `<p class="bk-q">${esc(etx("how"))}</p><p class="bk-say">${esc(eraTxt(end).t)}</p><p class="bk-say n">${esc(eraTxt(end).d)}</p>`;
  if (st === "now" && e.peoples) {
    const F = EV.P.flags || {}, P = ERA.PEOPLES[L()] || ERA.PEOPLES.es, with_ = e.peoples.filter(([f]) => F[f]).map(([, k]) => P[k]);
    h += `<p class="bk-q">${esc(etx("peoples"))}</p><p class="bk-say">${esc(with_.length ? with_.join(" · ") : etx("none"))}</p><p class="bk-say n">${esc(with_.length === e.peoples.length ? etx("allIn") : etx("unite"))}</p>`;
  }
  if (st === "now") h += eraIntro(n).map((l) => `<p class="bk-say n">${esc(l)}</p>`).join("");
  if (st === "next") h += `<p class="bk-say n">${esc(etx("yearsHow"))}</p><div class="bctl"><button class="btn" type="button" data-erago="${n}">${esc(n === 2 ? etx("start", { name: t.name }) : etx("years"))}</button></div>`;
  if (st === "soon") h += `<p class="bk-say n">${esc(etx("soon"))}</p>`;
  return h;
}
if (typeof BOOK_TABS !== "undefined") {
  BOOK_TABS.push(["cronica", "#4b5d7a"]);
  BOOK_ICON.cronica = '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 5l3 1M20 5l-3 1" stroke="currentColor" stroke-width="2"/>';
  BOOK_SEC.cronica = { list: cronicaList, page: cronicaPage, first: () => eraNow(), sub: () => etx("sub") };
}
document.addEventListener("click", (ev) => {
  const b = ev.target.closest && ev.target.closest("#bookView [data-erago]"); if (!b) return;
  EV.sfx("tap"); closeBook(); eraBegin(+b.dataset.erago);
});

(function eraStyle() {
  const css = `.era-wrap{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:12px}.era-wrap[hidden]{display:none}
.era-back{position:absolute;inset:0;background:rgba(10,8,20,.72)}
.era-box{position:relative;max-width:520px;width:100%;max-height:88vh;overflow:auto;background:var(--surface,#fff);color:var(--ink,#222);border:3px solid #4b5d7a;box-shadow:0 0 0 3px #1d1626;padding:16px 18px;display:grid;gap:8px}
.era-box h3{margin:0;font-family:var(--font-display,inherit);font-size:18px}.era-box p{margin:0;font-size:15px;line-height:1.45}.era-k{font-size:12.5px!important;letter-spacing:.06em;text-transform:uppercase;color:#4b5d7a}
.era-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}`;
  const st = document.createElement("style"); st.textContent = css; (document.body || document.head).appendChild(st);
})();

eraZoneTexts();
window.EVERA = { now: eraNow, win: eraWin, begin: eraBegin, check: eraCheck, state: eraState };
EV.every(3000, eraCheck);
setTimeout(eraCheck, 1500);
