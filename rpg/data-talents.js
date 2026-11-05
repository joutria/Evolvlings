/* Evolvlings RPG: the Song's Fork (Bifurcación del Canto), from the MiniTroopers ideas Jose approved.
   At levels 3, 6, 9, 12... a creature offers two talents drawn from its types, always one offensive (o) and one
   defensive (d). Tier k uses the creature's types in turn (types[(k - 1) % types.length]).
   A creature's picks are a string of "o"/"d" letters, one per tier (S.rpg.tal for yours, roster[kind].tal for
   companions); they can be changed at any time for Stardust, so no choice is permanent.
   Bonuses: str, hp, def, spd in %, crit and dodge in points. makeUnit (engine.js) adds them up. */
"use strict";
const TALENT_EVERY = 3;
const TALENTS = {
  fire:   { o: { str: 6, es: "Brasa viva", en: "Living ember" },         d: { hp: 6, es: "Calor de hogar", en: "Hearth warmth" } },
  plant:  { o: { str: 4, crit: 2, es: "Espina", en: "Thorn" },          d: { hp: 8, es: "Savia gruesa", en: "Thick sap" } },
  light:  { o: { crit: 4, es: "Destello", en: "Flash" },                 d: { def: 6, es: "Halo", en: "Halo" } },
  bolt:   { o: { spd: 6, es: "Chispazo", en: "Jolt" },                   d: { def: 4, hp: 3, es: "Pararrayos", en: "Lightning rod" } },
  air:    { o: { spd: 4, dodge: 2, es: "Racha", en: "Gust" },            d: { dodge: 4, es: "Pluma", en: "Feather" } },
  music:  { o: { str: 3, spd: 3, es: "Estribillo", en: "Chorus" },       d: { hp: 6, es: "Nana", en: "Lullaby" } },
  water:  { o: { str: 5, es: "Marea", en: "Tide" },                      d: { hp: 5, def: 3, es: "Remanso", en: "Still pool" } },
  stone:  { o: { str: 4, def: 2, es: "Canto rodado", en: "Boulder" },    d: { def: 8, es: "Muralla", en: "Rampart" } },
  shadow: { o: { crit: 4, es: "Sombra afilada", en: "Sharp shade" },     d: { dodge: 4, es: "Penumbra", en: "Half-light" } },
  ice:    { o: { str: 5, es: "Escarcha", en: "Frost bite" },             d: { def: 6, es: "Coraza helada", en: "Ice shell" } },
  mush:   { o: { str: 3, crit: 2, es: "Esporas", en: "Spores" },         d: { hp: 7, es: "Micelio", en: "Mycelium" } },
  dream:  { o: { crit: 3, spd: 2, es: "Pesadilla", en: "Nightmare" },    d: { dodge: 3, hp: 3, es: "Duermevela", en: "Half-sleep" } },
  star:   { o: { str: 4, crit: 2, es: "Fulgor", en: "Radiance" },        d: { hp: 4, def: 4, es: "Constelación", en: "Constellation" } },
};
const talentTiers = (lvl) => Math.floor((lvl || 0) / TALENT_EVERY);
const talentType = (kind, k) => { const t = MONS[kind].types; return t[(k - 1) % t.length]; };
// the talents a creature has chosen, as [{ type, side, ...bonus }], ignoring picks beyond its level
function talentsOf(kind, lvl, picks) {
  const out = [], n = Math.min(talentTiers(lvl), (picks || "").length);
  for (let k = 1; k <= n; k++) { const side = picks[k - 1], ty = talentType(kind, k), T = TALENTS[ty] && TALENTS[ty][side]; if (T) out.push(Object.assign({ type: ty, side, tier: k }, T)); }
  return out;
}

/* Birth traits (MiniTroopers idea 2): every Refuge companion is born with one small quirk, so two of the same kind
   are different individuals. roster[kind].bt holds its key; a repeat hatch offers the sibling's trait instead.
   Stat keys work like talents. day / night: only then. pet: extra Bond when petted. xp: % more trip experience. */
const BIRTH = {
  early:   { spd: 5, day: 1, es: "Madrugador", en: "Early riser", fx: { es: "+5 % velocidad de día", en: "+5% speed by day" } },
  owl:     { spd: 5, night: 1, es: "Trasnochador", en: "Night owl", fx: { es: "+5 % velocidad de noche", en: "+5% speed at night" } },
  glutton: { hp: 6, es: "Glotón", en: "Glutton", fx: { es: "+6 % vida", en: "+6% life" } },
  brave:   { str: 4, es: "Valiente", en: "Brave", fx: { es: "+4 % fuerza", en: "+4% strength" } },
  stubborn:{ def: 5, es: "Testarudo", en: "Stubborn", fx: { es: "+5 % defensa", en: "+5% defence" } },
  shy:     { dodge: 3, es: "Tímido", en: "Shy", fx: { es: "+3 de esquiva", en: "+3 dodge" } },
  lucky:   { crit: 3, es: "Afortunado", en: "Lucky", fx: { es: "+3 de crítico", en: "+3 crit" } },
  sleepy:  { hp: 9, spd: -3, es: "Dormilón", en: "Sleepyhead", fx: { es: "+9 % vida, −3 % velocidad", en: "+9% life, −3% speed" } },
  cuddly:  { pet: 1, es: "Mimoso", en: "Cuddly", fx: { es: "+1 de Vínculo extra al acariciarlo", en: "+1 extra Bond when petted" } },
  curious: { xp: 20, es: "Curioso", en: "Curious", fx: { es: "+20 % de experiencia en los viajes", en: "+20% experience from trips" } },
};
const BIRTH_KEYS = Object.keys(BIRTH);
const rollBirth = (not) => { const ks = BIRTH_KEYS.filter((k) => k !== not); return ks[Math.floor(Math.random() * ks.length)]; };
// a companion hatched before traits existed gets a fixed one from its kind and birth time, until a sibling replaces it
function birthKey(kind, r) {
  if (r && BIRTH[r.bt]) return r.bt;
  let h = 7; for (const ch of kind + ":" + ((r && r.at) || 0)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BIRTH_KEYS[h % BIRTH_KEYS.length];
}
// the bonuses a companion takes into battle: its talents plus its birth trait when it applies now
function companionTal(kind, lvl, r) {
  const out = talentsOf(kind, lvl, r && r.tal), B = BIRTH[birthKey(kind, r)];
  const day = typeof isDayNow === "function" ? isDayNow() : true;
  if (B && !(B.day && !day) && !(B.night && day)) out.push(Object.assign({ birth: true }, B));
  return out;
}
