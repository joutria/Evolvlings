/* Evolvlings RPG: illustrated path conversations (Life in Adventure style) and the event deck.
   Data: rpg/events-<zone>.js (window.EVEVENTS[zone][id], Spanish text and effects) and rpg/events-<zone>.en.js
   (window.EVEVENTS_EN, English text in the same order). Scenes: EVSCENE.event(id) in scenes.js.
   An event is a small conversation: nodes say lines, options lead to other nodes or back to a hub, "once" options
   disappear after use, cNeed options need a flag from another event, and a node with "end" closes it with effects
   (the EVENT_FX keys, plus foes: [creature ids] for the fight).
   The deck: each zone keeps a shuffled bag of its events (the old short ones too), drawn without repeats and
   reshuffled when empty, never the same event twice in a row. Lore events (lore.js) keep their own chance first. */
"use strict";
const TALK = window.EVEVENTS || {}, TALK_EN = window.EVEVENTS_EN || {};
// "common" events (campfires, treasures...) can come up in any zone; a few of them join each zone's bag
const COMMON_SHARE = 3;
const talkZone = (id, zone) => { const z = zone || (X && X.zone); return TALK[z] && TALK[z][id] ? z : TALK.common && TALK.common[id] ? "common" : Object.keys(TALK).find((k) => TALK[k][id]) || null; };
const talkEv = (id, zone) => { const z = talkZone(id, zone); return z ? TALK[z][id] : null; };
const deckSlice = EV.slice("evDeck", () => ({}));
// the events a zone can draw right now
function deckPool(zone) {
  const open = (z) => Object.keys(TALK[z] || {}).filter((id) => (!LORE || LORE.needOk(TALK[z][id].need, EV.P)) && (!TALK[z][id].zones || TALK[z][id].zones.includes(zone)));
  return ZONES[zone].events.concat(open(zone), open("common"));
}
function drawDeck(zone) {
  const D = deckSlice(), d = D[zone] = D[zone] || { bag: [], last: null };
  const pool = deckPool(zone), ok = (id) => pool.includes(id);
  let pick = d.bag.find(ok);
  if (!pick) {
    // the zone's own events, plus a few common ones picked at random for this round
    const own = pool.filter((id) => talkZone(id, zone) !== "common"), com = pool.filter((id) => talkZone(id, zone) === "common");
    for (let i = com.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [com[i], com[j]] = [com[j], com[i]]; }
    const round = own.concat(com.slice(0, COMMON_SHARE));
    const all = round.filter((id) => id !== d.last), a = all.length ? all : round.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    d.bag = a; pick = d.bag[0];
  }
  d.bag.splice(d.bag.indexOf(pick), 1); d.last = pick;
  return pick;
}
/* ---------- names: nobody is named until you hear the name (rpg/data-people.js) ---------- */
const PPL = (window.EVPEOPLE && EVPEOPLE.PEOPLE) || {}, PPL_WHO = (window.EVPEOPLE && EVPEOPLE.BY_WHO) || {};
const knownSlice = EV.slice("known", () => ({}));
const isKnown = (pid) => !PPL[pid] || !!knownSlice()[pid];
const nameRx = {};
function nameFind(t) { return nameRx[t] || (nameRx[t] = new RegExp("(^|[^0-9A-Za-zÁÉÍÓÚÑÜáéíóúñü])(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?![0-9A-Za-zÁÉÍÓÚÑÜáéíóúñü])", "g")); }
// a line said out loud (or an option you pick): every name in it becomes known. Spanish text is the reference, the
// names are the same in both languages
function hearNames(text) {
  if (!text) return;
  const K = knownSlice();
  for (const pid in PPL) if (!K[pid] && PPL[pid].n.some((t) => { const r = nameFind(t); r.lastIndex = 0; return r.test(text); })) { K[pid] = 1; EV.P.bookNew = Object.assign(EV.P.bookNew || {}, { gente: 1 }); }
}
// narration (or a label) that names someone you have not heard of yet: "el farolero viejo" in their place
function maskNames(text, lang) {
  if (!text) return text;
  const lg = lang || L(), K = knownSlice();
  let out = text;
  for (const pid in PPL) {
    if (K[pid]) continue;
    const p = PPL[pid], forms = (lg === "en" ? p.nEn : p.n), alias = p.r[lg] || p.r.es;
    for (const t of forms) { const r = nameFind(t); r.lastIndex = 0; out = out.replace(r, (m, pre) => pre + "\u0001" + alias + "\u0002"); }
  }
  if (out === text) return text;
  if (lg === "es") out = out.replace(/(^|[^\wáéíóúñ])(a|de) \u0001el /gi, (m, pre, w) => pre + (w === "de" ? "del" : w === "De" ? "Del" : w === "A" ? "Al" : "al") + " \u0001");
  // capital letter at the start of a sentence
  out = out.replace(/(^|[.!?…]\s+|[«“¡¿"]\s*)\u0001(.)/g, (m, pre, c) => pre + "\u0001" + c.toUpperCase());
  return out.replace(/[\u0001\u0002]/g, "");
}
// the label over a line: "Farolero viejo" until you know them
function whoName(esLabel, label, lang) {
  const pid = PPL_WHO[esLabel];
  if (pid && !isKnown(pid)) { const a = PPL[pid].a; return a[lang || L()] || a.es; }
  return maskNames(label, lang);
}
/* ---------- the Diary: which lines of each conversation you have seen (EV.P.diary["zone/id"]) ---------- */
const diarySlice = EV.slice("diary", () => ({}));
function diaryRec(id, zone) {
  const z = talkZone(id, zone); if (!z) return null;
  const D = diarySlice(), k = z + "/" + id;
  if (!D[k]) { D[k] = { v: {}, o: {}, n: 0, t: Object.keys(D).length + 1 }; EV.P.bookNew = Object.assign(EV.P.bookNew || {}, { diario: 1 }); }
  return D[k];
}
/* ---------- the conversation ---------- */
function talkText(id) {
  const ev = talkEv(id), z = talkZone(id), en = L() === "en" && TALK_EN[z] && TALK_EN[z][id];
  return {
    who: (k) => whoName(ev.who[k] || k, (en && en.who && en.who[k]) || ev.who[k] || k),
    say: (n, i) => { const t = (en && en.nodes[n] && en.nodes[n].say[i]) || ev.nodes[n].say[i][1]; return ev.nodes[n].say[i][0] ? t : maskNames(t); },
    opt: (n, i) => (en && en.nodes[n] && en.nodes[n].opts && en.nodes[n].opts[i]) || ev.nodes[n].opts[i].t,
  };
}
// an echo line in the current language; narration hides names you have not heard yet, like any other narration
function echoText(k) {
  const e = EVECHO.ECHOES[k], t = (L() === "en" && e.en) || e.es;
  return e.who ? t : maskNames(t);
}
/* ---------- how each story ends (rpg/data-echoes.js EPI, texts in lore.js LORE_EPILOGOS): EV.P.epi[char] = end ---------- */
const epiSlice = EV.slice("epi", () => ({}));
// called after every guardian win: the stories that close now, with the end your choices gave them (fixed from then on)
function epiClose() {
  if (!window.EVECHO || !LORE) return [];
  const E = epiSlice(), P = EV.P, F = P.flags || {}, lay = LORE.loreLayer(P.cleared), out = [];
  for (const ch in EVECHO.EPI) {
    const r = EVECHO.EPI[ch], know = r.know === undefined ? ch : r.know;
    if (E[ch] || !(P.cleared || {})[r.zone] || lay < r.layer || (know && !isKnown(know))) continue;
    const end = EVECHO.epiEnd(ch, F); if (!end) continue;
    E[ch] = end; out.push(ch);
  }
  if (out.length) EV.P.bookNew = Object.assign(EV.P.bookNew || {}, { gente: 1 });
  return out;
}
function epiText(ch) {
  const end = epiSlice()[ch], ep = end && LORE && LORE.LORE_EPILOGOS.find((x) => x.char === ch && x.end === end);
  return ep ? maskNames(L() === "en" ? ep.en : ep.es) : "";
}
// the stories whose ending shows on this person's page of the Book
const epiFor = (p) => Object.keys(epiSlice()).filter((ch) => ((window.EVECHO && EVECHO.EPI[ch] && EVECHO.EPI[ch].page) || ch) === p);
function talkStart(id) {
  X.talk = { id, log: [], used: {}, hub: null, end: null, gain: {} };
  const R = diaryRec(id); if (R) R.n++;
  X.eventFight = false; X.eventCard = null; X.eventFoes = null;
  talkVisit(talkEv(id).start);
}
function talkAdd(f) { const g = X.talk.gain; for (const k of ["xp", "coins", "heal", "hurt"]) if (f[k]) g[k] = (g[k] || 0) + f[k]; if (f.card) g.card = 1; if (f.fight) g.fight = f.foes || true; if (f.cost) g.cost = (g.cost || 0) + f.cost; }
function talkVisit(nid) {
  const T = X.talk, ev = talkEv(T.id), n = ev.nodes[nid];
  n.say.forEach((s, i) => { T.log.push({ n: nid, i, who: s[0] }); if (s[0]) hearNames(s[1]); });
  // decisions that come back (rpg/data-echoes.js): a line about something you chose in an earlier conversation
  if (window.EVECHO) for (const [e, k] of EVECHO.echoesFor(talkZone(T.id) + "/" + T.id, nid, EV.P.flags || {})) { T.log.push({ echo: k, who: e.who }); if (e.who) hearNames(e.es); }
  const R = diaryRec(T.id); if (R) R.v[nid] = 1;
  if (n.fx) { runFx(n.fx, {}, ""); talkAdd(n.fx); }
  if (n.end) {
    runFx(n.end, {}, ""); talkAdd(n.end);
    if (n.end.foes) X.eventFoes = n.end.foes.slice();
    T.end = nid; T.hub = null;
    (EV.P.talkSeen = EV.P.talkSeen || {})[T.id] = 1;
    EV.save();
    return;
  }
  T.hub = n.back || nid;
}
function talkPick(i) {
  const T = X.talk; if (!T || T.end) return;
  const ev = talkEv(T.id), hub = ev.nodes[T.hub], o = hub.opts[i]; if (!o) return;
  if (o.cNeed && !(EV.P.flags || {})[o.cNeed]) return;
  if (o.fx) { if (runFx(o.fx, {}, "") == null) { EV.toast(tx("talk.poor")); EV.sfx("deny"); return; } talkAdd(o.fx); }
  T.used[T.hub + ":" + i] = 1;
  hearNames(o.t); const R = diaryRec(T.id); if (R) R.o[T.hub + ":" + i] = 1;
  T.log.push({ you: [T.hub, i] });
  EV.P.c.evChoices = (EV.P.c.evChoices || 0) + 1;
  EV.sfx("tap");
  if (o.go) talkVisit(o.go); else T.hub = o.back || T.hub;
  render();
  const lg = $("talkLog"); if (lg) lg.scrollTop = lg.scrollHeight;
}
function talkChips(g) {
  const c = [];
  if (g.cost) c.push(["bad", tx("talk.cost", { n: g.cost })]);
  if (g.xp) c.push(["", tx("talk.xp", { n: g.xp })]);
  if (g.coins) c.push(["", tx("talk.coins", { n: g.coins })]);
  if (g.heal) c.push(["", tx("talk.heal", { n: Math.round(g.heal * 100) })]);
  if (g.hurt) c.push(["bad", tx("talk.hurt", { n: Math.round(g.hurt * 100) })]);
  if (g.card) c.push(["", tx("talk.card")]);
  if (g.fight) c.push(["bad", Array.isArray(g.fight) ? tx("talk.fightVs", { n: g.fight.map((k) => monName(k)).join(", ") }) : tx("talk.fight")]);
  return c.length ? `<div class="talk-chips">${c.map(([k, t]) => `<span class="talk-chip ${k}">${esc(t)}</span>`).join("")}</div>` : "";
}
// the face beside a line (rpg/data-faces.js, art/faces/*.png): an <img> of the loaded picture, or "" while it is missing
function faceImg(path) {
  const im = path && window.EVART && EVART.image(path);
  return im ? `<img class="talk-face" src="${im.src}" alt="" width="38" height="38">` : "";
}
function talkHtml() {
  const T = X.talk, ev = talkEv(T.id), W = talkText(T.id), F = EV.P.flags || {};
  const q = L() === "en" ? ["“", "”"] : ["«", "»"];
  const lead = X.party && X.party[0], youFace = lead && faceImg("faces/mon-" + lead.kind + ".png");
  const lines = T.log.map((l) => {
    if (l.you) return `<div class="talk-line you${youFace ? " has-face" : ""}"><p>${esc(W.opt(l.you[0], l.you[1]))}</p>${youFace}</div>`;
    const t = l.echo != null ? echoText(l.echo) : W.say(l.n, l.i);
    if (!l.who) return `<p class="talk-line nar">${esc(t)}</p>`;
    const f = window.EVFACES && faceImg(EVFACES.of(ev.who[l.who] || l.who));
    return `<div class="talk-line${f ? " has-face" : ""}">${f}<p><b>${esc(W.who(l.who))}</b> ${esc(q[0] + t + q[1])}</p></div>`;
  }).join("");
  let foot;
  if (T.end) foot = `${talkChips(T.gain)}<div class="bctl"><button class="btn" type="button" data-x="${X.eventFight ? "evfight" : "evnext"}">${esc(tx(X.eventFight ? "talk.toFight" : "r.continue"))}</button></div>`;
  else foot = `<div class="choices talk-opts">${ev.nodes[T.hub].opts.map((o, i) => {
    if (o.once && T.used[T.hub + ":" + i]) return "";
    if (o.cNeed && !F[o.cNeed]) return "";
    const poor = o.fx && o.fx.cost > EV.P.coins;
    return `<button class="btn ghost${o.cNeed ? " talk-new" : ""}" type="button" data-tk="${i}" ${poor ? "disabled" : ""}>${esc(W.opt(T.hub, i))}${o.fx && o.fx.cost ? ` <small>(✦ ${o.fx.cost})</small>` : ""}${o.cNeed ? `<small class="talk-why">${esc(tx("talk.new"))}</small>` : ""}</button>`;
  }).join("")}</div>`;
  const scene = window.EVSCENE && EVSCENE.event && EVSCENE.EVNOTE && EVSCENE.EVNOTE[T.id];
  return `<div class="panel talk"><div class="sub">${esc(tx("node.event"))} · ${esc(tx("talk.k." + ev.kind))}</div>${scene ? `<div class="talk-scene" data-evscene="${T.id}"${T.end ? ` data-evend="${T.end}"` : ""}></div>` : ""}<div class="talk-log" id="talkLog" aria-live="polite">${lines}</div>${foot}</div><div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}</div>`;
}
// puts the event's picture in place after a render (the canvas is drawn once and reused). At an ending it shows that
// ending's own picture (EVSCENE.end(id, end node or choice index)) when the scenes module has one.
function talkMount(root) {
  root.querySelectorAll("[data-evscene]").forEach((box) => {
    const id = box.dataset.evscene, end = box.dataset.evend;
    let cv = null;
    if (end != null && EVSCENE.end) { try { cv = EVSCENE.end(id, /^\d+$/.test(end) ? +end : end); } catch (e) { /* art is decoration */ } }
    if (!cv) cv = EVSCENE.event(id); if (!cv) return;
    const n = EVSCENE.EVNOTE[box.dataset.evscene];
    cv.setAttribute("role", "img"); if (n && n.scene) cv.setAttribute("aria-label", n.scene);
    box.appendChild(cv);
  });
  const lg = $("talkLog"); if (lg) lg.scrollTop = lg.scrollHeight;
}
