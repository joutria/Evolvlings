/* Evolvlings RPG: what each choice of a path event does.
   Texts live in rpg/text-es.js and rpg/text-en.js (EVT); lore events keep their own fx in lore.js, in the same shape.
   One entry per event, one object per choice (same order as EVT[lang][event].c). Keys:
     xp, coins          added to the trip's loot
     cost               Chispas paid when choosing it (the button is disabled if you can't pay)
     heal, hurt         share of max health given or taken from every standing member
     foeBuff            +/- % to the next fight's foes
     card               a chest with 3 cards follows
     fight              a fight follows
     flag               profile flag(s) set
     escrito            a Writing found (lore.js)
     xpPerZone          xp for each zone you've ever cleared
     say                [table, i]: replace the outcome text with EVT_ALT[table][i]
     sayE               key of EVT[lang][event] to use as the outcome text (string, or [key, i])
     roll               [a, b]: 50 % chance of each
     if                 { flag, not }: then / else, depending on profile flags */
"use strict";
const EVENT_FX = {
  farol: [{ hurt: 0.1, xp: 15 }, { coins: 12, foeBuff: 15 }, {}],
  patrol: [{ xp: 8 }, { roll: [{ say: ["sneak", 0], card: true }, { say: ["sneak", 1], fight: true }] }, { cost: 8, xp: 4 }],
  tila: [{ cost: 10, heal: 0.4, xp: 10 }, { xp: 12 }, {}],
  well: [{ heal: 0.5 }, { xp: 14 }, { card: true }],
  dam: [{ hurt: 0.08, xp: 16, flag: "damOpen" }, { card: true }, {}],
  apprentice: [{ hurt: 0.1, coins: 10, xp: 6 }, { xp: 12 }, {}],
  ola: [{ xp: 15, flag: "olaLetter" }, { heal: 0.3 }, {}],
  liquen: [{ cost: 10, card: true }, { xp: 12 }, {}],
  vines: [{ say: ["vine", 0], fight: true, xp: 6 }, { roll: [{ say: ["vine", 1], xp: 10 }, { say: ["vine", 2], hurt: 0.15 }] }, {}],
  loggers: [{ coins: 8, heal: 0.1 }, { xp: 12 }, {}],
  court: [{ fight: true, xp: 8 }, { heal: 0.3 }, { xp: 12 }],
  dig: [{ xp: 14 }, { hurt: 0.1, coins: 10 }, { card: true }],
  whisper: [{ xp: 12 }, { cost: 10, foeBuff: -15 }, { roll: [{ say: ["fog", 0], card: true }, { say: ["fog", 1], fight: true }] }],
  orilla: [{ if: { flag: "olaLetter", not: "olaDelivered" }, then: { sayE: ["oL", 0], flag: "olaDelivered", coins: 25, xp: 20, heal: 0.4, card: true }, else: { heal: 0.15, coins: 6 } }, { xp: 14 }, {}],
  reflection: [{ fight: true, xp: 6 }, { xp: 14 }, { heal: 0.2 }],
  boats: [{ if: { flag: "damOpen" }, then: { sayE: "dam", heal: 0.3, xp: 14 }, else: { hurt: 0.1, xp: 14 } }, { card: true }, {}],
  gravasong: [{ xp: 16 }, { card: true }, { heal: 0.15 }],
  tunnels: [{ coins: 12, foeBuff: 15 }, { hurt: 0.1, xp: 16 }, {}],
  miners: [{ hurt: 0.15, coins: 10, xp: 10 }, { xp: 8 }, {}],
  coplo: [{ cost: 8, heal: 0.3 }, { xp: 14 }, { card: true }],
  news: [{ cost: 6, foeBuff: -15 }, { coins: 10 }, {}],
  pass: [{ cost: 10, xp: 6 }, { hurt: 0.15, xp: 18 }, { heal: 0.3, foeBuff: 15 }],
  esporina: [{ heal: 0.5, flag: "sporeRemedy" }, { xp: 16 }, {}],
  tomb: [{ card: true }, { hurt: 0.1, xp: 16 }, {}],
  dreams: [{ xp: 14 }, { heal: 0.25 }, {}],
  duo: [{ heal: 0.45 }, { xp: 20 }, { card: true }],
  albor: [{ hurt: 0.15, xp: 28 }, { coins: 18, flag: "alborTruth" }, { foeBuff: -15, flag: "alborProof" }],
  cantora: [{ xpPerZone: 4 }, { card: true }, { heal: 0.35 }],
};
