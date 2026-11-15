/* Evolvlings: the Elder stage, the Hall of Fame and the heir egg (feature plan idea 11, as Jose chose on 2026-11-15).
   An adult that has lived 7 game days and reached level 15 becomes an Elder (S.elder, an honour on its name line).
   It never leaves on its own (design rule 1). You always decide when (Jose): any adult can retire from the Journal
   ("Retire to the Hall of Fame"). Retiring:
     - shows a summary of how its decisions changed the Glade: the echoes (rpg/data-echoes.js) whose flags were set
       and the stories (epilogues) that closed during its life, plus its trips and guardians. A creature hatched
       after this file existed keeps a snapshot from its birth (S.snap); an older one is credited with everything;
     - writes it into the Hall of Fame (P.hof, kept for ever): name, kind, form, level, rare colours, what it wore,
       discipline, the card it left and the dates;
     - gives you a LEGENDARY copy of one of its equipped cards (you pick which);
     - leaves an heir egg of the same kind. The heir keeps your collection and loadout, starts at a third of its
       parent's level (up to 10) and is born with a special trait, "Legacy of <name>" (+5 % life, strength and
       defence, +3 % speed in battle; one more generation adds +1 % to each, up to +10 %).
   Cards, Chispas, the Refuge and everything else in the profile stay as they are. Loaded after accessories.js. */
(function (root) {
"use strict";
const EV = root.EV;
if (!EV) return;

const TX = {
  es: {
    elder: "Anciano", nowElder: "{name} ya es anciano. Cuando quieras, en el Diario puedes retirarlo al Salón de la fama.",
    hof: "Salón de la fama", hofSub: "Las criaturas que se retiraron después de una vida larga. Cada una dejó un huevo heredero y una carta legendaria.", hofEmpty: "Todavía no hay nadie. Cualquier criatura adulta puede retirarse aquí cuando tú decidas.",
    need: "{name} se volverá anciano con 7 días de vida (lleva {d}) y nivel 15 (tiene {l}). Puedes retirarlo cuando quieras.",
    sumTitle: "Lo que cambió en el Claro mientras vivió {name}", sumNone: "Vivió tranquilo: sus decisiones todavía no cambiaron nada en el Claro.", sumNums: "{d} días · {e} expediciones · {g} guardianes vencidos", sumBtn: "Ver su historia", ok: "Seguir",
    retire: "Retirar a {name} al Salón de la fama", ask: "{name} se retira a descansar al Salón de la fama. Deja un huevo heredero de su misma especie y una copia legendaria de una de sus cartas. Tus cartas, tus Chispas y el Refugio no cambian. Su heredero empieza en el nivel {l} con el rasgo «Legado de {name}». ¿Qué carta deja?",
    leave: "Dejar {card}", cancel: "Todavía no",
    entry: "{kind} · nivel {l} · {days} días", left: "Dejó: {card} (Legendaria)", gen: "Generación {n}",
    legacy: "Legado de {name}", legacyFx: "+{a} % vida, fuerza y defensa, +{b} % velocidad", heirOf: "Heredero de {name}",
    log: "{name} se retiró al Salón de la fama y dejó un huevo heredero.", toast: "{name} entra en el Salón de la fama", endRetired: "se retiró al Salón",
  },
  en: {
    elder: "Elder", nowElder: "{name} is an elder now. Whenever you like, the Journal lets you retire it to the Hall of Fame.",
    hof: "Hall of Fame", hofSub: "Creatures that retired after a long life. Each one left an heir egg and a legendary card.", hofEmpty: "Nobody yet. Any adult can retire here whenever you decide.",
    need: "{name} becomes an elder at 7 days old (it's {d}) and level 15 (it's {l}). You can retire it whenever you like.",
    sumTitle: "What changed in the Glade while {name} lived", sumNone: "It lived quietly: its choices haven't changed anything in the Glade yet.", sumNums: "{d} days · {e} expeditions · {g} guardians beaten", sumBtn: "See its story", ok: "Continue",
    retire: "Retire {name} to the Hall of Fame", ask: "{name} retires to rest in the Hall of Fame. It leaves an heir egg of its own kind and a legendary copy of one of its cards. Your cards, Chispas and Refuge stay as they are. Its heir starts at level {l} with the trait \"Legacy of {name}\". Which card does it leave?",
    leave: "Leave {card}", cancel: "Not yet",
    entry: "{kind} · level {l} · {days} days", left: "Left: {card} (Legendary)", gen: "Generation {n}",
    legacy: "Legacy of {name}", legacyFx: "+{a}% life, strength and defence, +{b}% speed", heirOf: "Heir of {name}",
    log: "{name} retired to the Hall of Fame and left an heir egg.", toast: "{name} joins the Hall of Fame", endRetired: "retired to the Hall",
  },
};
const tx = EV.text("elder", TX);
const ELDER_AGE = 7 * 24 * 60, ELDER_LVL = 15, LG = 5;
const esc = (s) => EV.escapeHtml(String(s));
const hof = () => EV.P.hof || (EV.P.hof = []);
const lvl = () => { const S = EV.S; return (S && S.rpg && S.rpg.lvl) || 1; };
const days = (min) => Math.floor(min / 1440);
const canRetire = () => { const S = EV.S; return !!(S && S.phase === "alive" && S.stage === 2); };
const isElder = () => { const S = EV.S; return !!(S && S.phase === "alive" && S.stage === 2 && S.age >= ELDER_AGE && lvl() >= ELDER_LVL); };

// the heir's battle bonus: +5 % (+1 % per older generation, up to +10 %), speed a little less
function legacyTal() {
  const S = EV.S, h = S && S.heir; if (!h) return null;
  const a = Math.min(10, 4 + (h.gen || 1)), b = Math.max(3, a - 2);
  return { legacy: true, hp: a, str: a, def: a, spd: b, es: tx("legacy", { name: h.name }), en: tx("legacy", { name: h.name }) };
}

function check() {
  const S = EV.S; if (!S || S.phase !== "alive") return;
  // a snapshot at birth, so the summary only credits this creature with what happened in its life
  if (!S.snap && (S.snapNow || S.age < 30)) { S.snap = snapNow(); delete S.snapNow; EV.save(); }
  if (isElder() && !S.elder) { S.elder = 1; EV.addLog(tx("nowElder", { name: S.name })); EV.toast(tx("nowElder", { name: S.name }), "🌙"); EV.save(); }
}

function snapNow() { const P = EV.P; return { flags: Object.assign({}, P.flags || {}), epi: Object.assign({}, P.epi || {}), exp: (P.c && P.c.expDone) || 0, guard: (P.c && P.c.guard) || 0 }; }
// how its choices changed the Glade: echo lines whose flag was set, stories that closed, and a few numbers
function summary() {
  const S = EV.S, P = EV.P, base = S.snap || { flags: {}, epi: {}, exp: 0, guard: 0 }, F = P.flags || {}, lines = [];
  const mask = (t) => (typeof maskNames === "function" ? maskNames(t) : t), en = EV.LANG === "en";
  if (root.EVECHO) for (const e of EVECHO.ECHOES) if (F[e.flag] && !base.flags[e.flag]) lines.push("«" + mask(en ? e.en : e.es) + "»");
  if (typeof LORE !== "undefined" && LORE.LORE_EPILOGOS) for (const ch in (P.epi || {})) if (!base.epi[ch]) {
    const ep = LORE.LORE_EPILOGOS.find((x) => x.char === ch && x.end === P.epi[ch]); if (ep) lines.push(mask(en ? ep.en : ep.es));
  }
  return { lines, d: days(S.age), e: Math.max(0, ((P.c && P.c.expDone) || 0) - base.exp), g: Math.max(0, ((P.c && P.c.guard) || 0) - base.guard) };
}
function sumHtml(name, sm) {
  return `<h3>${esc(tx("sumTitle", { name }))}</h3><p class="muted">${esc(tx("sumNums", sm))}</p>${sm.lines.length ? `<ul class="hof-sum">${sm.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : `<p>${esc(tx("sumNone"))}</p>`}`;
}
let dlg = null;
function showSummary(name, sm) {
  if (!dlg) {
    dlg = document.createElement("div"); dlg.className = "ph-wrap"; dlg.id = "hofDlg"; dlg.setAttribute("role", "dialog"); dlg.setAttribute("aria-modal", "true"); document.body.appendChild(dlg);
    dlg.addEventListener("click", (e) => { if (e.target.closest("[data-hofx]")) { EV.sfx("tap"); dlg.hidden = true; } });
  }
  dlg.innerHTML = `<div class="ph-back" data-hofx="1"></div><div class="ph-box">🏛 ${sumHtml(name, sm)}<div class="ph-row"><button class="btn" type="button" data-hofx="1">${esc(tx("ok"))}</button></div></div>`;
  dlg.hidden = false; const b = dlg.querySelector(".btn"); if (b) b.focus({ preventScroll: true });
}
function equipped() {
  const S = EV.S, P = EV.P, R = S.rpg || { eq: {} }, out = [];
  for (const k of ["a", "p", "s"]) { const c = R.eq && R.eq[k] && P.cards.find((x) => x.uid === R.eq[k]); if (c && !out.includes(c.id)) out.push(c.id); }
  if (!out.length && typeof MONS !== "undefined" && MONS[S.species]) out.push(MONS[S.species].cards[0]);
  return out;
}

function retire(cardId) {
  const S = EV.S, P = EV.P; if (!canRetire()) return;
  const sm = summary(), elder = !!S.elder;
  const RPG = EV.RPG, form = S.form, sp = S.species, gen = ((S.heir && S.heir.gen) || 0) + 1;
  const entry = { name: S.name, kind: sp, form, stage: S.stage, lvl: lvl(), age: Math.round(S.age), born: S.born || 0, at: Date.now(), shiny: !!S.shiny,
    head: P.cosm && P.cosm.head || null, neck: P.cosm && P.cosm.neck || null, disc: Math.round(S.disc || 0), card: cardId, gen, elder, sum: sm };
  hof().unshift(entry);
  if (RPG && RPG.takeCard) RPG.takeCard(cardId, LG);
  // the old Journal keeps one line for every creature that ever left
  try { const key = "glimmerglade.journal.v1", j = JSON.parse(localStorage.getItem(key) || "[]"); j.unshift({ name: S.name, kind: EV.stageName ? EV.stageName() : entry.kind, age: entry.age, end: "retired" }); localStorage.setItem(key, JSON.stringify(j.slice(0, 40))); } catch (e) { /* the Hall of Fame is the record that counts */ }
  EV.addLog(tx("log", { name: S.name }));
  EV.toast(tx("toast", { name: S.name }), "🏛");
  const eq = S.rpg && S.rpg.eq ? Object.assign({}, S.rpg.eq) : { a: null, p: null, s: null };
  const keep = { speed: S.speed, log: S.log || [] };
  // a fresh egg of the same kind, with the loadout and the heir's head start already in place
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, { v: 1, phase: "egg", species: sp, egg: 0, lastReal: Date.now(), speed: keep.speed, log: keep.log,
    snapNow: 1, heir: { name: entry.name, gen, card: cardId }, rpg: { lvl: Math.max(1, Math.min(10, Math.floor(entry.lvl / 3))), xp: 0, eq } });
  P.c.retired = (P.c.retired || 0) + 1;
  EV.sfx("grow"); EV.save(); EV.flush && EV.flush();
  EV.togglePanel("journal"); EV.showScreen();
  showSummary(entry.name, sm);
}

/* ---------- the Hall of Fame, at the top of the Journal ---------- */
let asking = false;
function hofHtml() {
  const S = EV.S, list = hof();
  let h = `<div class="hof"><h3 class="cat-title">🏛 ${esc(tx("hof"))}</h3><p class="muted">${esc(tx("hofSub"))}</p>`;
  if (S && S.phase === "alive" && S.stage === 2) {
    if (!isElder()) h += `<p class="muted">${esc(tx("need", { name: S.name, d: days(S.age), l: lvl() }))}</p>`;
    if (!asking) h += `<button class="btn" type="button" data-hof="ask">${esc(tx("retire", { name: S.name }))}</button>`;
    else {
      const RPG = EV.RPG;
      h += `<div class="hof-ask"><p>${esc(tx("ask", { name: S.name, l: Math.max(1, Math.min(10, Math.floor(lvl() / 3))) }))}</p><div class="hof-btns">${equipped().map((id) => `<button class="btn" type="button" data-hof="go:${esc(id)}">${esc(tx("leave", { card: RPG ? RPG.cardName(id) : id }))}</button>`).join("")}<button class="btn ghost" type="button" data-hof="no">${esc(tx("cancel"))}</button></div></div>`;
    }
  }
  if (!list.length) h += `<p class="muted">${esc(tx("hofEmpty"))}</p>`;
  else h += `<ul class="hof-list">${list.map((e) => {
    const kind = EV.SPECIES[e.kind] ? EV.SPECIES[e.kind].names[e.stage === 2 ? (e.form === "scruffy" ? 3 : 2) : e.stage || 0] : e.kind;
    const card = EV.RPG ? EV.RPG.cardName(e.card) : e.card;
    return `<li><b>${e.elder ? "🌙 " : ""}${esc(e.name)}${e.shiny ? " ✧" : ""}</b><small>${esc(tx("entry", { kind, l: e.lvl, days: days(e.age) }))}${e.gen > 1 ? " · " + esc(tx("gen", { n: e.gen })) : ""}</small><small>${esc(tx("left", { card }))}</small><small class="muted">${esc(new Date(e.at).toLocaleDateString(EV.LANG === "es" ? "es" : "en"))}</small>${e.sum ? `<details><summary>${esc(tx("sumBtn"))}</summary>${sumHtml(e.name, e.sum)}</details>` : ""}</li>`;
  }).join("")}</ul>`;
  return h + "</div>";
}
function drawHof() {
  const panel = document.getElementById("journalPanel"); if (!panel || panel.hidden) return;
  let box = document.getElementById("hofBox");
  if (!box) { box = document.createElement("div"); box.id = "hofBox"; const list = document.getElementById("journalList"); panel.insertBefore(box, list ? list.previousElementSibling || list : null); box.addEventListener("click", onClick); }
  box.innerHTML = hofHtml();
}
function onClick(e) {
  const b = e.target.closest("[data-hof]"); if (!b) return;
  const v = b.dataset.hof;
  if (v === "ask") { asking = true; EV.sfx("tap"); drawHof(); }
  else if (v === "no") { asking = false; EV.sfx("tap"); drawHof(); }
  else if (v.startsWith("go:")) { asking = false; retire(v.slice(3)); }
}
// redraw whenever the Journal opens (watching the panel: guide.js owns HOOKS.panelOpened)
const jp = document.getElementById("journalPanel");
if (jp) new MutationObserver(() => { if (!jp.hidden) { asking = false; drawHof(); } }).observe(jp, { attributes: true, attributeFilter: ["hidden"] });

// the Elder badge and the heir's trait on the name line
const prevStats = EV.HOOKS.statsDrawn;
EV.HOOKS.statsDrawn = () => {
  if (prevStats) prevStats();
  const S = EV.S, sp = document.getElementById("petSpecies"); if (!S || !sp) return;
  const bits = [];
  if (S.elder) bits.push("🌙 " + tx("elder"));
  if (S.heir) { const L = legacyTal(); bits.push(tx("heirOf", { name: S.heir.name })); sp.title = `${tx("legacy", { name: S.heir.name })}: ${tx("legacyFx", { a: L.hp, b: L.spd })}`; }
  if (bits.length) sp.textContent += " · " + bits.join(" · ");
};
EV.HOOKS.legacyTal = legacyTal;

const css = `.hof{display:grid;gap:6px;padding:8px 0 10px;border-bottom:2px dashed var(--line);margin-bottom:6px}.hof .btn{justify-self:start}
.hof-ask{border:2px solid var(--line);background:var(--surface-2);padding:8px 10px}.hof-ask p{margin:0 0 8px;font-size:14px}.hof-btns{display:flex;gap:6px;flex-wrap:wrap}
.hof-list{list-style:none;margin:0;padding:0;display:grid;gap:6px}.hof-list li{display:grid;gap:1px;padding:6px 8px;border:2px solid #e2ae2e;background:color-mix(in srgb,#e2ae2e 10%,var(--bg))}.hof-list b{font-family:var(--font-display)}.hof-list small{font-size:12.5px}.hof-list details summary{cursor:pointer;font-size:13px;color:var(--accent)}.hof-list h3{font-size:14px;margin:6px 0 2px}
.hof-sum{margin:6px 0 0;padding-left:18px;display:grid;gap:6px;font-size:14px}`;
const st = document.createElement("style"); st.textContent = css; (document.body || document.head).appendChild(st);

EV.every(30000, check); check();
EV.ELDER = { isElder, canRetire, summary, retire, hof, legacyTal, ELDER_AGE, ELDER_LVL };
})(window);
