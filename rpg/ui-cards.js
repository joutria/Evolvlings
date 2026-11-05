/* Evolvlings RPG: the cards panel (collection, Grimoire, shop).
   Part of the old rpg.js, now split. Classic scripts: top-level names are shared between the rpg/*.js files,
   which load in order (see index.html). */
"use strict";

/* ====================================================================== */
/* Cards panel                                                            */
/* ====================================================================== */
let cTab = "col", lastPack = null;
function cardTabs() {
  return `<div class="seg ctabs" role="group">${["col", "grim", "shop"].concat(EV.WELL && !EV.quietOn() ? ["well"] : []).map((k) => `<button type="button" data-ctab="${k}" aria-pressed="${cTab === k}">${esc(k === "well" ? EV.WELL.tab() : tx("ctab." + k))}</button>`).join("")}</div>`;
}
function grimHtml() {
  const P = EV.P, all = Object.keys(CARDS), seen = all.filter((id) => (P.grim || {})[id]).length;
  let h = `<p class="muted" style="margin:0">${esc(tx("grim.desc"))}</p><p class="progress">${esc(tx("grim.count", { n: seen, m: all.length }))} · ${esc(tx("dust.have", { n: P.dust || 0 }))}</p>`;
  const circles = CIRCLES.map((c) => [c, circleTypes(c)]).concat([["star", ["star"]]]);
  for (const [ck, types] of circles) {
    const ids = grimIds(types); if (!ids.length) continue;
    const got = ids.filter((id) => P.grim[id]).length;
    h += `<h3 class="cat-title">${esc(tx("grim.circle." + ck))} · ${got} / ${ids.length}${got === ids.length ? " ✓" : ""}</h3>`;
    for (const ty of types) {
      const tids = grimIds([ty]); if (!tids.length) continue;
      h += `<p class="rc-copies">${typeChip(ty)} <span class="progress">${tids.filter((id) => P.grim[id]).length} / ${tids.length}</span></p><div class="rcards">`;
      for (const id of tids) {
        const C = CARDS[id], boss = !!C.boss || !!C.story, owner = C.by && MONS[C.by] ? monName(C.by) : "";
        const craft = boss ? `<p class="rc-cant">${esc(tx(C.story ? "grim.story" : "grim.boss"))}</p>` : `<div class="rc-btns"><button class="btn ghost" type="button" data-craft="${id}" ${(P.dust || 0) < craftCost() ? "disabled" : ""}>${esc(tx("grim.craft", { c: craftCost() }))}</button></div>`;
        if (P.grim[id]) h += cardHtml(id, 0, { foot: craft });
        else h += ghostCardHtml(id, tx("grim.unknown") + (owner && !boss ? " · " + tx("grim.by", { mon: owner }) : ""), craft);
      }
      h += `</div>`;
    }
  }
  return h;
}
function workshopHtml() {
  const P = EV.P, d = P.packDay === dayKeyNow() ? P.packN || 0 : 0, left = PACK.perDay - d;
  let h = `<div class="slotbox" style="border-style:solid"><strong style="font-family:var(--font-display);font-size:18px">${esc(tx("dust.have", { n: P.dust || 0 }))}</strong><p class="muted">${esc(tx("dust.desc", { c: craftCost() }))}</p></div>`;
  h += `<div class="slotbox" style="border-style:solid"><strong style="font-family:var(--font-display);font-size:18px">${esc(tx("pack.title"))}</strong><p class="muted">${esc(left > 0 ? tx("pack.desc", { m: PACK.perDay, n: left }) : tx("pack.none"))}</p>
    <div class="rc-btns"><button class="btn" type="button" data-pack="1" ${left <= 0 || P.coins < PACK.price ? "disabled" : ""}>${esc(tx("pack.btn", { c: PACK.price }))}</button></div></div>`;
  if (lastPack) h += `<h3 class="cat-title">${esc(tx("pack.got"))}</h3><div class="rcards">${lastPack.map((c) => cardHtml(c.id, c.g, { foot: cantNote(c.id) })).join("")}</div>`;
  return h;
}
/* ---------- Card filters (collection and every card picker) ----------
   Search by words (name, type, owner, effects, lore), filter by type, rarity, effect and a few quick toggles, and sort.
   Each place has its own filters ("col" = collection, "pick" = the card picker used by loadouts, teams and the
   pre-expedition screen); favourites and the sort order are shared and saved with the profile (P.cf). */
const cfSlice = EV.slice("cf", () => ({ fav: {}, sort: "use", dir: 1 }));
const cfNew = () => ({ q: "", type: new Set(), grade: new Set(), fx: new Set(), only: new Set(), open: false });
const CFS = { col: cfNew(), pick: cfNew() }, CFX = {};
const CF_FX = ["dmg", "area", "heal", "shield", "foe", "buff", "cleanse"];
const CF_ONLY = { col: ["fav", "usable", "inUse", "fuse"], pick: ["fav", "inUse"] };
const CF_SORT = ["use", "new", "rar", "type", "name", "copies"];
const fxCache = {};
function fxCats(id) {
  if (fxCache[id]) return fxCache[id];
  const C = CARDS[id], out = new Set();
  const walk = (o, k) => {
    if (Array.isArray(o)) { const s = STATUS[o[0]]; if (s) out.add(s.neg ? "foe" : "buff"); else o.forEach((x) => walk(x, k)); return; }
    if (o && typeof o === "object") { for (const key in o) walk(o[key], key); return; }
    if (k === "pow" || k === "dmg" || k === "firstHit" || k === "thorns") out.add("dmg");
    if (k === "tgt" && /foes/i.test(o)) out.add("area");
    if (/^(heal|healRecv|healGive|drain|lifesteal|revive)$/.test(k)) out.add("heal");
    if (/^(shield|shieldLong|dodge|immune|critImmune|def|defRound)$/.test(k)) out.add("shield");
    if (k === "cleanse" || k === "strip") out.add("cleanse");
    if (k === "status" && STATUS[o]) out.add("cleanse");
  };
  for (const sl of ["a", "p", "s"]) walk(C[sl], sl);
  if (out.has("buff") && JSON.stringify(C).match(/"(guard|cushion|evade|hidden|taunt)"/)) out.add("shield");
  return (fxCache[id] = out);
}
const fold = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const searchCache = {};
function searchText(id) {
  const key = L() + ":" + id; if (searchCache[key]) return searchCache[key];
  const C = CARDS[id], sc = scaled(id, 0);
  const parts = [cardName(id), cardLore(id), TYPES[C.type][L()], C.by && MONS[C.by] ? monName(C.by) : "", ...["a", "p", "s"].map((sl) => slotText(sc, sl))];
  return (searchCache[key] = fold(parts.join(" ")));
}
const cfCount = (F) => F.type.size + F.grade.size + F.fx.size + F.only.size;
function cfFilterHtml(scope, types) {
  const F = CFS[scope], cf = cfSlice(), at = ` data-cfs="${scope}"`;
  const chip = (k, v, label, title) => `<button type="button" class="cf-chip"${at} data-cf="${k}:${v}" aria-pressed="${F[k].has(String(v))}"${title ? ` title="${esc(title)}"` : ""}>${label}</button>`;
  const n = cfCount(F);
  return `<div class="cf-wrap"><div class="cf-bar"><input class="cf-q"${at} type="search" placeholder="${esc(tx("cf.search"))}" aria-label="${esc(tx("cf.search"))}" value="${esc(F.q)}" autocomplete="off">
    <select class="cf-sort"${at} aria-label="${esc(tx("cf.sort"))}">${CF_SORT.map((k) => `<option value="${k}"${cf.sort === k ? " selected" : ""}>${esc(tx("cf.sort." + k))}</option>`).join("")}</select>
    <button type="button" class="cf-dir"${at} data-cfdir="1" aria-label="${esc(tx(cf.dir > 0 ? "cf.dir.down" : "cf.dir.up"))}" title="${esc(tx(cf.dir > 0 ? "cf.dir.down" : "cf.dir.up"))}">${cf.dir > 0 ? "↓" : "↑"}</button></div>
  <details class="cf-more"${at}${F.open ? " open" : ""}><summary>${esc(tx("cf.filters"))}<b class="cf-n">${n ? " · " + n : ""}</b></summary>
    <p class="cf-row"><span class="cf-lab">${esc(tx("cf.quick"))}</span>${CF_ONLY[scope].map((k) => chip("only", k, (k === "fav" ? "★ " : "") + esc(tx("cf.only." + k)))).join("")}</p>
    <p class="cf-row"><span class="cf-lab">${esc(tx("cf.type"))}</span>${(types || TYPE_ORDER).map((t) => chip("type", t, `${tyIcon(t)} ${esc(TYPES[t][L()])}`)).join("")}</p>
    <p class="cf-row"><span class="cf-lab">${esc(tx("cf.grade"))}</span>${GRADES.map((g, i) => chip("grade", i, `<span class="cf-pips" style="color:${g.col}">${"◆".repeat(i + 1)}</span> ${esc(g[L()])}`)).join("")}</p>
    <p class="cf-row"><span class="cf-lab">${esc(tx("cf.fx"))}</span>${CF_FX.map((k) => chip("fx", k, esc(tx("cf.fx." + k)), tx("cf.fxd." + k))).join("")}</p>
    <p class="cf-row"><button type="button" class="btn ghost"${at} data-cfclear="1">${esc(tx("cf.clear"))}</button></p>
  </details>
  <p class="progress cf-count"${at} aria-live="polite"></p></div>`;
}
// I = { keys: [...], id(key), cards(key) -> [{ uid, g }], eqSet, box: element holding the items, attr: data attribute naming each item }
function cfPass(scope, I, key) {
  const F = CFS[scope], id = I.id(key), list = I.cards(key);
  if (F.q) { const words = fold(F.q).split(/\s+/).filter(Boolean); const t = searchText(id); if (!words.every((w) => t.includes(w))) return false; }
  if (F.type.size && !F.type.has(CARDS[id].type)) return false;
  if (F.grade.size && !list.some((c) => F.grade.has(String(c.g)))) return false;
  if (F.fx.size) { const f = fxCats(id); for (const k of F.fx) if (!f.has(k)) return false; }
  for (const k of F.only) {
    if (k === "fav" && !cfSlice().fav[id]) return false;
    if (k === "usable" && !usable(id)) return false;
    if (k === "inUse" && !list.some((c) => I.eqSet.has(c.uid))) return false;
    if (k === "fuse") { const n = {}; for (const c of list) n[c.g] = (n[c.g] || 0) + 1; if (!Object.keys(n).some((g) => n[g] >= UPGRADE_N && +g < GRADES.length - 1)) return false; }
  }
  return true;
}
function cfSorted(I, keys) {
  const cf = cfSlice(), id = I.id, best = (k) => Math.max(...I.cards(k).map((c) => c.g));
  const seq = (k) => Math.max(...I.cards(k).map((c) => parseInt(String(c.uid).slice(1), 10) || 0));
  const byName = (a, b) => cardName(id(a)).localeCompare(cardName(id(b)));
  const cmp = {
    use: (a, b) => (usable(id(b)) - usable(id(a))) || best(b) - best(a) || byName(a, b),
    new: (a, b) => seq(b) - seq(a),
    rar: (a, b) => best(b) - best(a) || byName(a, b),
    type: (a, b) => TYPE_ORDER.indexOf(CARDS[id(a)].type) - TYPE_ORDER.indexOf(CARDS[id(b)].type) || byName(a, b),
    name: byName,
    copies: (a, b) => (I.copies || I.cards)(b).length - (I.copies || I.cards)(a).length || byName(a, b),
  }[cf.sort] || (() => 0);
  const fav = (k) => (cf.fav[id(k)] ? 1 : 0);
  return keys.slice().sort((a, b) => (fav(b) - fav(a)) || cmp(a, b) * cf.dir);
}
function applyCF(scope) {
  const I = CFX[scope]; if (!I || !I.box || !I.box.isConnected) return;
  const F = CFS[scope], shown = cfSorted(I, I.keys.filter((k) => cfPass(scope, I, k)));
  const items = {}; for (const b of I.box.querySelectorAll(`[${I.attr}]`)) items[b.getAttribute(I.attr)] = b;
  for (const k of I.keys) if (items[k]) items[k].hidden = true;
  for (const k of shown) if (items[k]) { items[k].hidden = false; I.box.appendChild(items[k]); }
  const root = I.box.parentElement, cnt = root && root.querySelector(`.cf-count[data-cfs="${scope}"]`), n = cfCount(F);
  if (cnt) cnt.innerHTML = shown.length === I.keys.length ? "" : `${esc(tx("cf.count", { n: shown.length, m: I.keys.length }))}${shown.length ? "" : ` · <button type="button" class="linkish" data-cfs="${scope}" data-cfclear="1">${esc(tx("cf.clear"))}</button>`}`;
  const nb = root && root.querySelector(`.cf-more[data-cfs="${scope}"] .cf-n`); if (nb) nb.textContent = n ? " · " + n : "";
}
document.addEventListener("input", (e) => { const s = e.target.dataset && e.target.dataset.cfs; if (s && e.target.classList.contains("cf-q")) { CFS[s].q = e.target.value; applyCF(s); } });
document.addEventListener("change", (e) => { const s = e.target.dataset && e.target.dataset.cfs; if (s && e.target.classList.contains("cf-sort")) { cfSlice().sort = e.target.value; EV.saveProfile(); applyCF(s); } });
document.addEventListener("toggle", (e) => { const s = e.target.dataset && e.target.dataset.cfs; if (s && e.target.classList.contains("cf-more")) CFS[s].open = e.target.open; }, true);
// returns true when the click was a filter control; rerender() redraws the place after "clear" or a favourite change
function cfClick(t, rerender) {
  const s = t.dataset.cfs, F = s && CFS[s];
  if (F && t.dataset.cf) { const [k, v] = t.dataset.cf.split(":"); if (F[k].has(v)) F[k].delete(v); else F[k].add(v); t.setAttribute("aria-pressed", F[k].has(v)); EV.sfx("tap"); applyCF(s); return true; }
  if (F && t.dataset.cfdir) { const cf = cfSlice(); cf.dir = -cf.dir; EV.saveProfile(); t.textContent = cf.dir > 0 ? "↓" : "↑"; t.title = t.ariaLabel = tx(cf.dir > 0 ? "cf.dir.down" : "cf.dir.up"); EV.sfx("tap"); applyCF(s); return true; }
  if (F && t.dataset.cfclear) { CFS[s] = Object.assign(cfNew(), { open: F.open }); EV.sfx("tap"); rerender(); return true; }
  if (t.dataset.fav) { const f = cfSlice().fav, id = t.dataset.fav; if (f[id]) delete f[id]; else f[id] = 1; EV.saveProfile(); EV.sfx("tap"); rerender(); return true; }
  return false;
}
let colCard = null;
function renderCards() {
  const el = $("cardsPanel"); if (!el) return;
  const R = rpgState(), P = EV.P, S = EV.S;
  if (cTab !== "col") {
    if (cTab === "well" && EV.quietOn()) cTab = "col";
    if (cTab === "well" && EV.WELL) { el.innerHTML = `<div class="panel-head"><h2>${esc(EV.WELL.title())}</h2>${cardTabs()}</div>` + EV.WELL.html(); return; }
    el.innerHTML = `<div class="panel-head"><h2>${esc(tx(cTab === "grim" ? "ctab.grim" : "ctab.shop"))}</h2>${cardTabs()}</div>` + (cTab === "grim" ? grimHtml() + escritosHtml() : workshopHtml());
    return;
  }
  let html = `<div class="panel-head"><h2>${esc(tx("cards.title"))}</h2>${cardTabs()}<span class="progress">${esc(tx("cards.owned", { n: P.cards.length }))}</span></div><p class="muted" style="margin:0">${esc(tx("cards.desc"))}</p>`;
  if (R) {
    const u = makeUnit(ownUnitOpts(1));
    const need = xpNeed(R.lvl);
    html += `<div class="slotbox" style="border-style:solid"><div class="panel-head"><strong style="font-family:var(--font-display);font-size:18px">${esc(S.name)} · ${esc(tx("cards.lvl", { n: R.lvl }))}</strong><span>${u.types.map(typeChip).join(" ")}</span></div>
      <div class="bar xpbar"><i style="width:${Math.round(100 * R.xp / need)}%"></i></div><p class="rstats">${esc(tx("cards.xp", { x: R.xp, y: need }))}</p><details class="fold"><summary><h3>${esc(tx("sh.title"))}</h3></summary>${ownSheetHtml()}</details></div>`;
    html += slotRowsHtml("own");
  } else html += `<p class="muted">${esc(tx("cards.noCreature"))}</p>`;
  if (R) html += `<p class="muted">${esc(canTypesText())}</p>`;
  // collection: one entry per card (shown at its best grade), with the copies of each grade underneath
  const groups = {};
  for (const c of P.cards) (groups[c.id] = groups[c.id] || []).push(c);
  const bestG = (id) => Math.max(...groups[id].map((c) => c.g));
  const ids = Object.keys(groups).sort((a, b) => (usable(b) - usable(a)) || bestG(b) - bestG(a) || cardName(a).localeCompare(cardName(b)));
  const eqSet = new Set([...(R ? Object.values(R.eq).filter(Boolean) : []), ...compUids()]);
  html = html.replace(esc(tx("cards.owned", { n: P.cards.length })), esc(tx("cards.owned", { n: ids.length })));
  colCard = (id) => {
    const list = groups[id], g = bestG(id);
    const best = list.filter((c) => c.g === g);
    const ok = usable(id);
    const inUse = best.find((c) => eqSet.has(c.uid));
    const btns = [];
    if (R && ok) for (const sl of ["a", "p", "s"]) btns.push(`<button class="btn ghost" type="button" data-equip="${(inUse || best[0]).uid}" data-slot="${sl}" ${R.lvl < SLOT_LVL[sl] ? "disabled" : ""}>${esc(tx("slot." + sl))}</button>`);
    const isFav = !!cfSlice().fav[id];
    btns.push(`<button class="btn ghost cf-fav" type="button" data-fav="${id}" aria-pressed="${isFav}">${isFav ? "★ " + esc(tx("cf.unfav")) : "☆ " + esc(tx("cf.fav"))}</button>`);
    if (inUse) btns.push(`<span class="progress">${esc(tx("cards.inUse"))}</span>`);
    const counts = {};
    for (const c of list) counts[c.g] = (counts[c.g] || 0) + 1;
    const gs = Object.keys(counts).map(Number).sort((a, b) => b - a);
    const copies = `<p class="rc-copies">${esc(tx("cards.copies"))}: ${gs.map((gi) => `<span class="gr" style="--g:${GRADES[gi].col}">${esc(GRADES[gi][L()])} ×${counts[gi]}</span>`).join(" ")}</p>` +
      gs.filter((gi) => gi < GRADES.length - 1 && counts[gi] < UPGRADE_N).map((gi) => `<div class="rc-up"><small>${esc(tx("cards.toNext", { a: GRADES[gi][L()], g: GRADES[gi + 1][L()], n: counts[gi], m: UPGRADE_N }))}</small><div class="bar"><i style="width:${Math.round(100 * counts[gi] / UPGRADE_N)}%"></i></div></div>`).join("");
    const spare = list.filter((c) => !eqSet.has(c.uid)).sort((a, b) => a.g - b.g);
    if (list.length > 1 && spare.length) btns.push(`<button class="btn ghost" type="button" data-dust="${spare[0].uid}">${esc(tx("dust.btn", { n: DUST_OF(spare[0].g) }))}</button>`);
    for (const gi of gs.slice().reverse()) if (counts[gi] >= UPGRADE_N && gi < GRADES.length - 1) btns.push(`<button class="btn" type="button" data-fuse="${id}:${gi}">${esc(tx("cards.fuse", { n: UPGRADE_N, a: GRADES[gi][L()], g: GRADES[gi + 1][L()] }))}</button>`);
    return cardHtml(id, g, { count: list.length, foot: `${copies}${cantNote(id)}${btns.length ? `<div class="rc-btns">${btns.join("")}</div>` : ""}` });
  };
  // the collection is a grid of thumbnails; tapping one opens the whole card with its buttons
  if (ids.length) html += cfFilterHtml("col");
  const favs = cfSlice().fav;
  html += `<div class="ctiles">${ids.map((id) => {
    const g = bestG(id), n = groups[id].length, inUse = groups[id].some((c) => eqSet.has(c.uid));
    return `<button type="button" class="ctile${usable(id) ? "" : " cant"}" data-cview="${id}" aria-label="${esc(cardName(id))}">${favs[id] ? `<span class="ct-fav" title="${esc(tx("cf.only.fav"))}">★</span>` : ""}${thumbHtml(id, g)}<span class="ct-name">${esc(cardName(id))}</span><span class="ct-meta">${gradeChip(g)}${n > 1 ? ` <b>×${n}</b>` : ""}${inUse ? ` <i>${esc(tx("cards.inUse"))}</i>` : ""}</span></button>`;
  }).join("")}</div>`;
  el.innerHTML = html;
  CFX.col = { keys: ids, id: (k) => k, cards: (k) => groups[k], eqSet, box: el.querySelector(".ctiles"), attr: "data-cview" };
  applyCF("col");
}
function openCardView(id, html) {
  let el = $("cview");
  if (!el) { el = document.createElement("div"); el.id = "cview"; el.className = "cpick-wrap"; document.body.appendChild(el); el.addEventListener("click", (e) => { if (e.target.closest("[data-cp]")) { closeCardView(); return; } const b = e.target.closest("button"); if (b && !b.disabled) { closeCardView(); onCardsClick(e); } }); }
  el.innerHTML = `<div class="cpick-back" data-cp="close"></div><div class="cpick cview" role="dialog" aria-modal="true"><div class="cp-head"><h3>${esc(cardName(id))}</h3><button class="sheet-x" type="button" data-cp="close" aria-label="${esc(tx("load.close"))}">✕</button></div><div class="cp-list">${html || colCard(id)}</div></div>`;
  el.hidden = false;
}
function closeCardView() { const el = $("cview"); if (el) el.hidden = true; }
document.addEventListener("keydown", (e) => { const el = $("cview"); if (e.key === "Escape" && el && !el.hidden) { e.stopImmediatePropagation(); closeCardView(); } }, true);
function onCardsClick(e) {
  const t = e.target.closest("button"); if (!t || t.disabled) return;
  if (t.dataset.cview) { EV.sfx("tap"); openCardView(t.dataset.cview); return; }
  if (cfClick(t, renderCards)) return;
  if (t.dataset.chg) { EV.sfx("tap"); const [w, sl] = t.dataset.chg.split(":"); openPick(w, sl); return; }
  const R = rpgState(); const P = EV.P;
  if (t.dataset.ctab) { cTab = t.dataset.ctab; EV.sfx("tap"); renderCards(); return; }
  if (EV.WELL && EV.WELL.click(t)) return;
  if (t.dataset.dust) {
    const c = cardByUid(t.dataset.dust), eqSet = new Set([...(R ? Object.values(R.eq).filter(Boolean) : []), ...compUids()]);
    if (!c || eqSet.has(c.uid) || P.cards.filter((x) => x.id === c.id).length < 2) return;
    P.cards = P.cards.filter((x) => x !== c); P.dust = (P.dust || 0) + DUST_OF(c.g); P.c.dusted = (P.c.dusted || 0) + 1;
    EV.toast(tx("dust.got", { n: DUST_OF(c.g) }), "∴"); EV.sfx("coin"); EV.save(); EV.checkAch(); renderCards(); return;
  }
  if (t.dataset.craft) {
    const id = t.dataset.craft; if (!CARDS[id] || CARDS[id].boss || CARDS[id].story) return;
    if ((P.dust || 0) < craftCost()) { EV.toast(tx("dust.poor")); EV.sfx("deny"); return; }
    P.dust -= craftCost(); giveCard(id, 0);
    EV.toast(tx("grim.crafted", { card: cardName(id) })); EV.sfx("grow"); EV.save(); EV.checkAch(); renderCards(); return;
  }
  if (t.dataset.pack) {
    const day = dayKeyNow(); if (P.packDay !== day) { P.packDay = day; P.packN = 0; }
    if (P.packN >= PACK.perDay) { EV.toast(tx("pack.none")); return; }
    if (!EV.spendCoins(PACK.price)) { EV.toast(EV.t("toast.poor")); EV.sfx("deny"); return; }
    P.packN++;
    const mine = DROP_POOL.filter((id) => usable(id));
    lastPack = [0, 1, 2].map((i) => { const pool = i < 2 && mine.length && Math.random() < 0.75 ? mine : DROP_POOL; const id = pool[Math.floor(Math.random() * pool.length)]; return giveCard(id, rollGrade(0)); });
    EV.sfx("grow"); EV.buzz(20); EV.save(); EV.checkAch(); renderCards(); return;
  }
  if (t.dataset.equip && R) {
    const uid = t.dataset.equip, slot = t.dataset.slot;
    const c = cardByUid(uid);
    if (!c || !usable(c.id) || compUids().has(uid)) { EV.sfx("deny"); return; }
    // no duplicate card on one creature: remove the same card id from other slots
    for (const k of ["a", "p", "s"]) { const o = R.eq[k] && cardByUid(R.eq[k]); if (o && (o.uid === uid || o.id === c.id)) R.eq[k] = null; }
    R.eq[slot] = uid; P.c.equips = (P.c.equips || 0) + 1; EV.sfx("card"); EV.save(); renderCards(); return;
  }
  if (t.dataset.unequip && R) { R.eq[t.dataset.unequip] = null; EV.sfx("tap"); EV.save(); renderCards(); return; }
  if (t.dataset.fuse) {
    const [id, g] = t.dataset.fuse.split(":"); const gi = +g;
    const eqSet = new Set([...(R ? Object.values(R.eq).filter(Boolean) : []), ...compUids()]);
    // use free copies first; if an equipped copy goes in, the new card takes its slot
    const same = P.cards.filter((c) => c.id === id && c.g === gi).sort((a, b) => eqSet.has(a.uid) - eqSet.has(b.uid));
    const used = same.slice(0, UPGRADE_N);
    if (used.length < UPGRADE_N || gi >= GRADES.length - 1) return;
    P.cards = P.cards.filter((c) => !used.includes(c));
    const nc = giveCard(id, gi + 1); P.c.fused = (P.c.fused || 0) + 1;
    if (R) for (const k of ["a", "p", "s"]) if (used.some((c) => c.uid === R.eq[k])) R.eq[k] = nc.uid;
    const ro = (P.eg && P.eg.roster) || {};
    for (const kind in ro) for (const k of ["a", "p", "s"]) if (ro[kind].eq && used.some((c) => c.uid === ro[kind].eq[k])) ro[kind].eq[k] = nc.uid;
    EV.toast(tx("cards.fused", { card: cardName(id), g: GRADES[gi + 1][L()] })); EV.sfx("grow"); EV.save(); EV.checkAch(); renderCards();
  }
}
