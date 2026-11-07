/* Evolvlings RPG: one entry per zone, creature and card.
   Each thing still lives in a few tables (rules in data-*.js, texts in text-es/en.js, art in ui-*.js), but this file is the
   single place to read a whole entry or add a new one, so nothing gets forgotten. tools/check.js reads entries the same way.

   EV.RPG.zone(id) / creature(id) / card(id)   -> everything the game knows about it, in one object
   EV.RPG.addZone(id, def)                      -> def: { zone, pos: [x, y], links: [[other, keyId?]], key: { id, from },
                                                         text: { es: {name, sub, ...}, en: {...} }, decor: fn(c, t, day),
                                                         events: { id: { fx: [...], text: { es: {t, c, o}, en: {...} } } } }
   EV.RPG.addCreature(id, def)                  -> def: { mon, name, desc: { es, en }, col: { body, belly, line, cheek }, frag: { es: [a, b], en: [a, b] } }
   EV.RPG.addCard(id, def)                      -> def: { card, text: { es: [name, lore], en: [name, lore] }, drop }
   Adding is for new content and for tests; the launch content stays in the data files. */
"use strict";
const LANGS = ["es", "en"];
function needLangs(what, o) { for (const lg of LANGS) if (!o || !o[lg]) throw new Error(what + ": missing " + lg + " text"); }

function zoneEntry(id) {
  const z = ZONES[id]; if (!z) return null;
  const key = Object.keys(KEYS).find((k) => KEYS[k].opens === id) || null;
  return {
    id, zone: z, pos: PMAP[id] || null,
    links: PEDGES.filter((e) => e[0] === id || e[1] === id).map((e) => [e[0] === id ? e[1] : e[0], e[2] || null]),
    key, keyFrom: key ? KEYS[key].from : null, gives: Object.keys(KEYS).filter((k) => KEYS[k].from === id),
    text: { es: ZT.es[id], en: ZT.en[id] }, decor: DECOR[z.decor] ? z.decor : "lanterns",
    events: z.events.map((e) => ({ id: e, fx: EVENT_FX[e] || null, text: { es: EVT.es[e], en: EVT.en[e] } })),
    lore: LORE ? Object.keys(LORE.LORE_EVENTS).filter((k) => LORE.LORE_EVENTS[k].zone === id) : [],
  };
}
function creatureEntry(id) {
  const m = MONS[id]; if (!m) return null;
  return {
    id, mon: m, name: monName(id), desc: { es: MON_DESC.es[id], en: MON_DESC.en[id] }, col: MONCOL[id] || null,
    frag: EV.EGGS && EV.EGGS.FRAG ? EV.EGGS.FRAG[id] || null : null,
    sprite: typeof EVS !== "undefined" && EVS.KINDS.includes(id),
    zones: Object.keys(ZONES).filter((z) => ZONES[z].boss === id || ZONES[z].foes.includes(id) || ZONES[z].allies.includes(id)),
  };
}
function cardEntry(id) {
  const c = CARDS[id]; if (!c) return null;
  return {
    id, card: c, text: CT[id] || null, drop: DROP_POOL.includes(id),
    owners: Object.keys(MONS).filter((k) => !MONS[k].wild && MONS[k].cards.includes(id)),
    art: !!(typeof EVS !== "undefined" && EVS.CARD[id]), scene: !!(typeof EVSCENE !== "undefined" && EVSCENE.IDS.includes(id)),
  };
}

function addZone(id, def) {
  if (ZONES[id]) throw new Error("zone " + id + " already exists");
  const z = def.zone;
  for (const k of z.foes.concat(z.allies, z.boss ? [z.boss] : [])) if (!MONS[k]) throw new Error("zone " + id + ": unknown creature " + k);
  needLangs("zone " + id, def.text);
  for (const [eid, ev] of Object.entries(def.events || {})) {
    needLangs("event " + eid, ev.text);
    if (ev.fx.length !== ev.text.es.c.length || ev.fx.length !== ev.text.en.c.length) throw new Error("event " + eid + ": choices and effects differ");
    EVENT_FX[eid] = ev.fx; EVT.es[eid] = ev.text.es; EVT.en[eid] = ev.text.en;
    if (!EVENTS.includes(eid)) EVENTS.push(eid);
  }
  for (const e of z.events) if (!EVENT_FX[e]) throw new Error("zone " + id + ": event " + e + " has no effects");
  if (def.decor) DECOR[z.decor] = def.decor;
  ZONES[id] = z; ZT.es[id] = def.text.es; ZT.en[id] = def.text.en;
  if (def.pos) PMAP[id] = def.pos;
  for (const [to, key] of def.links || []) PEDGES.push(key ? [id, to, key] : [id, to]);
  if (def.key) { KEYS[def.key.id] = { from: def.key.from, opens: id }; KEY_OF[id] = def.key.id; }
  return zoneEntry(id);
}
function addCreature(id, def) {
  if (MONS[id]) throw new Error("creature " + id + " already exists");
  for (const c of def.mon.cards) if (!CARDS[c]) throw new Error("creature " + id + ": unknown card " + c);
  needLangs("creature " + id, def.desc);
  if (def.col && ["body", "belly", "line", "cheek"].some((k) => !def.col[k])) throw new Error("creature " + id + ": col needs body, belly, line and cheek");
  MONS[id] = def.mon; MON_NAMES[id] = def.name;
  MON_DESC.es[id] = def.desc.es; MON_DESC.en[id] = def.desc.en;
  if (def.col) MONCOL[id] = def.col;
  if (def.frag && EV.EGGS && EV.EGGS.FRAG) EV.EGGS.FRAG[id] = def.frag;
  return creatureEntry(id);
}
function addCard(id, def) {
  if (CARDS[id]) throw new Error("card " + id + " already exists");
  if (!TYPES[def.card.type]) throw new Error("card " + id + ": unknown type " + def.card.type);
  needLangs("card " + id, def.text);
  CARDS[id] = def.card; CT[id] = { es: def.text.es, en: def.text.en };
  if (def.drop !== false && !def.card.boss && !def.card.story) DROP_POOL.push(id);
  return cardEntry(id);
}

Object.assign(EV.RPG, { zone: zoneEntry, creature: creatureEntry, card: cardEntry, addZone, addCreature, addCard });
