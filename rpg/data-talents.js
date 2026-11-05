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
