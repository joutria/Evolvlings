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
    if (inUse) btns.push(`<span class="progress">${esc(tx("cards.inUse"))}</span>`);
    const counts = {};
    for (const c of list) counts[c.g] = (counts[c.g] || 0) + 1;
    const gs = Object.keys(counts).map(Number).sort((a, b) => b - a);
    const copies = `<p class="rc-copies">${esc(tx("cards.copies"))}: ${gs.map((gi) => `<span class="gr" style="--g:${GRADES[gi].col}">${esc(GRADES[gi][L()])} ×${counts[gi]}</span>`).join(" ")}</p>`;
    const spare = list.filter((c) => !eqSet.has(c.uid)).sort((a, b) => a.g - b.g);
    if (list.length > 1 && spare.length) btns.push(`<button class="btn ghost" type="button" data-dust="${spare[0].uid}">${esc(tx("dust.btn", { n: DUST_OF(spare[0].g) }))}</button>`);
    for (const gi of gs.slice().reverse()) if (counts[gi] >= UPGRADE_N && gi < GRADES.length - 1) btns.push(`<button class="btn" type="button" data-fuse="${id}:${gi}">${esc(tx("cards.fuse", { n: UPGRADE_N, a: GRADES[gi][L()], g: GRADES[gi + 1][L()] }))}</button>`);
    return cardHtml(id, g, { count: list.length, foot: `${copies}${cantNote(id)}${btns.length ? `<div class="rc-btns">${btns.join("")}</div>` : ""}` });
  };
  // the collection is a grid of thumbnails; tapping one opens the whole card with its buttons
  html += `<div class="ctiles">${ids.map((id) => {
    const g = bestG(id), n = groups[id].length, inUse = groups[id].some((c) => eqSet.has(c.uid));
    return `<button type="button" class="ctile${usable(id) ? "" : " cant"}" data-cview="${id}" aria-label="${esc(cardName(id))}">${thumbHtml(id, g)}<span class="ct-name">${esc(cardName(id))}</span><span class="ct-meta">${gradeChip(g)}${n > 1 ? ` <b>×${n}</b>` : ""}${inUse ? ` <i>${esc(tx("cards.inUse"))}</i>` : ""}</span></button>`;
  }).join("")}</div>`;
  el.innerHTML = html;
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
