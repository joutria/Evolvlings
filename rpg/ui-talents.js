/* Evolvlings RPG: choosing and changing Song's Fork talents (data in rpg/data-talents.js).
   Your creature's talents show in the Cards panel, each companion's in the Refuge. Every 3 levels there is a new
   pick between an offensive and a defensive talent; all picks can be changed later for Stardust (no choice is final).
   who = "own" for your creature, or a Refuge companion's kind. */
"use strict";
const TAL_RESET = 10; // Stardust per pick when changing talents
function talentRec(who) {
  if (who === "own") { const S = EV.S, R = rpgState(); return R ? { kind: S.species, name: S.name, lvl: R.lvl, xp: R.xp, rec: R } : null; }
  const r = EV.P.eg && EV.P.eg.roster[who]; return r && MONS[who] ? { kind: who, name: monName(who), lvl: r.lvl, xp: r.xp, rec: r } : null;
}
function talentFx(T) {
  const pct = ["str", "hp", "def", "spd"].filter((k) => T[k]).map((k) => `+${T[k]} % ${tx("sh." + k).toLowerCase()}`);
  const pts = ["crit", "dodge"].filter((k) => T[k]).map((k) => `+${T[k]} ${tx(k === "crit" ? "sh.cr" : "sh.dodge").toLowerCase()}`);
  return pct.concat(pts).join(", ");
}
const talentPending = (who) => { const t = talentRec(who); return t ? Math.max(0, talentTiers(t.lvl) - (t.rec.tal || "").length) : 0; };
// the block shown on your creature's sheet and on each Refuge companion
function talentsHtml(who, compact) {
  const t = talentRec(who); if (!t) return "";
  const picks = t.rec.tal || "", have = talentsOf(t.kind, t.lvl, picks), pend = talentPending(who);
  const tiers = talentTiers(t.lvl), next = (tiers + 1) * TALENT_EVERY;
  const prog = Math.min(1, (t.lvl - tiers * TALENT_EVERY + (t.xp || 0) / xpNeed(t.lvl)) / TALENT_EVERY);
  let h = `<div class="tal${compact ? " compact" : ""}"><b class="tal-h">${esc(tx("tal.title"))}</b>`;
  if (have.length) h += `<p class="tal-list">${have.map((T) => `<span class="tal-chip ${T.side}" title="${esc(talentFx(T))}">${tyIcon(T.type)} ${esc(T[L()])}<small>${esc(talentFx(T))}</small></span>`).join("")}</p>`;
  else if (!pend) h += `<p class="muted tal-none">${esc(tx("tal.none", { n: TALENT_EVERY }))}</p>`;
  if (pend) h += `<button class="btn tal-pick" type="button" data-talpick="${who}">${esc(tx("tal.pick", { n: pend }))}</button>`;
  h += `<small class="progress">${esc(tx("tal.next", { n: next }))}</small><div class="bar"><i style="width:${Math.round(100 * prog)}%"></i></div>`;
  if (picks.length) h += `<button class="btn ghost tal-reset" type="button" data-talreset="${who}" ${(EV.P.dust || 0) < TAL_RESET * picks.length ? "disabled" : ""}>${esc(tx("tal.reset", { c: TAL_RESET * picks.length }))}</button>`;
  return h + `</div>`;
}
let TPICK = null;
function openTalentPick(who) {
  const t = talentRec(who); if (!t || !talentPending(who)) return;
  const k = (t.rec.tal || "").length + 1, ty = talentType(t.kind, k), T = TALENTS[ty];
  TPICK = who;
  let el = $("tpick");
  if (!el) {
    el = document.createElement("div"); el.id = "tpick"; el.className = "cpick-wrap"; document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tp]"); if (!b || !TPICK) return;
      if (b.dataset.tp === "close") { closeTalentPick(); EV.sfx("tap"); return; }
      const w = TPICK, r = talentRec(w); if (!r || !talentPending(w)) return closeTalentPick();
      r.rec.tal = (r.rec.tal || "") + b.dataset.tp;
      EV.sfx("grow"); EV.save(); EV.saveProfile();
      EV.toast(tx("tal.got", { name: r.name, t: TALENTS[talentType(r.kind, r.rec.tal.length)][b.dataset.tp][L()] }), "✦");
      closeTalentPick(); talentsRefresh();
      if (talentPending(w)) openTalentPick(w);
    });
  }
  const opt = (side) => `<button type="button" class="lrow tal-opt ${side}" data-tp="${side}"><div class="tal-ic">${tyIcon(ty)}</div><div class="lr-txt"><span class="lr-slot">${esc(tx("tal." + side))}</span><strong>${esc(T[side][L()])}</strong><span class="lr-fx">${esc(talentFx(T[side]))}</span></div></button>`;
  el.innerHTML = `<div class="cpick-back" data-tp="close"></div><div class="cpick" role="dialog" aria-modal="true"><div class="cp-head"><div><span class="sub">${esc(t.name)} · ${esc(tx("sh.lvl", { n: k * TALENT_EVERY }))}</span><h3>${esc(tx("tal.choose"))}</h3></div><button class="sheet-x" type="button" data-tp="close" aria-label="${esc(tx("load.close"))}">✕</button></div>
    <div class="cp-list"><p class="muted" style="margin:0 0 6px">${esc(tx("tal.why", { type: TYPES[ty][L()] }))}</p>${opt("o")}${opt("d")}</div></div>`;
  el.hidden = false;
  if (EV.GUIDE) EV.GUIDE.showTip("talents");
}
function closeTalentPick() { TPICK = null; const el = $("tpick"); if (el) el.hidden = true; }
function talentsRefresh() {
  if ($("cardsPanel") && !$("cardsPanel").hidden) renderCards();
  if ($("refugePanel") && !$("refugePanel").hidden && EV.HOOKS.renderRefuge) EV.HOOKS.renderRefuge();
}
function resetTalents(who) {
  const t = talentRec(who); if (!t || !(t.rec.tal || "").length) return;
  const c = TAL_RESET * t.rec.tal.length;
  if ((EV.P.dust || 0) < c) { EV.toast(tx("dust.poor")); EV.sfx("deny"); return; }
  if (!confirm(tx("tal.resetAsk", { name: t.name, c }))) return;
  EV.P.dust -= c; t.rec.tal = "";
  EV.sfx("tap"); EV.save(); EV.saveProfile(); talentsRefresh();
  openTalentPick(who);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-talpick],[data-talreset]"); if (!b || b.disabled) return;
  if (b.dataset.talpick) { EV.sfx("tap"); openTalentPick(b.dataset.talpick); }
  else resetTalents(b.dataset.talreset);
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && TPICK) { e.stopImmediatePropagation(); closeTalentPick(); } }, true);
