/* Evolvlings RPG: the creatures and their level curves.
   Part of the old rpg.js, now split. Classic scripts: top-level names are shared between the rpg/*.js files,
   which load in order (see index.html). */
"use strict";

/* ====================================================================== */
/* Creatures for battle (stats at level 1 before care; from the cards doc) */
/* hp = Vida, str = Fuerza, def = Defensa, spd = Velocidad, cr = Ánimo     */
/* ====================================================================== */
const MONS = {
  lumo:     { types: ["light"], rar: 0, st: { hp: 38, str: 40, def: 32, spd: 50, cr: 40 }, cards: ["flash", "lantern", "spark"], adult: { bright: "air", scruffy: "shadow" } },
  fizz:     { types: ["air"],   rar: 0, st: { hp: 36, str: 34, def: 30, spd: 56, cr: 44 }, cards: ["gust", "cloud", "rain"],      adult: { bright: "light", scruffy: "water" } },
  pebb:     { types: ["stone"], rar: 0, st: { hp: 50, str: 40, def: 52, spd: 24, cr: 34 }, cards: ["throw", "stubborn", "promise"], adult: { bright: "plant", scruffy: "shadow" } },
  fuellito: { types: ["fire"],  rar: 0, st: { hp: 38, str: 48, def: 30, spd: 46, cr: 38 }, cards: ["bellows", "bread", "piece"] },
  brotin:   { types: ["plant"], rar: 0, st: { hp: 46, str: 36, def: 42, spd: 34, cr: 42 }, cards: ["acorn", "rings", "seedling"] },
  remolin:  { types: ["water"], rar: 0, st: { hp: 44, str: 40, def: 36, spd: 44, cr: 36 }, cards: ["whirl", "vessel", "guest"] },
  bostezo:  { types: ["dream"], rar: 0, st: { hp: 52, str: 34, def: 40, spd: 30, cr: 44 }, cards: ["yawn", "pillow", "tale"] },
  mecha:    { types: ["light"], rar: 1, st: { hp: 40, str: 38, def: 35, spd: 52, cr: 50 }, cards: ["street", "oil", "ration"] },
  yunqueron:{ types: ["fire"],  rar: 2, st: { hp: 58, str: 52, def: 62, spd: 22, cr: 36 }, cards: ["temper", "anvil", "furnace"] },
  espinardo:{ types: ["plant"], rar: 3, st: { hp: 52, str: 56, def: 62, spd: 35, cr: 40 }, cards: ["inward", "outward", "hedge"] },
  nim:      { types: ["shadow"], rar: 1, st: { hp: 36, str: 42, def: 32, spd: 58, cr: 47 }, cards: ["night", "nohide", "truename"] },
  centinela:{ types: ["shadow"], rar: 4, st: { hp: 60, str: 62, def: 58, spd: 40, cr: 40 }, cards: ["lance", "oath", "veil"] },
  vidriela: { types: ["water"],  rar: 2, st: { hp: 48, str: 40, def: 40, spd: 48, cr: 54 }, cards: ["lostwave", "truewater", "reading"] },
  ecolito:  { types: ["stone"],  rar: 2, st: { hp: 46, str: 44, def: 56, spd: 38, cr: 46 }, cards: ["echo", "miner", "rockname"] },
  relampin: { types: ["bolt"],  rar: 1, st: { hp: 34, str: 52, def: 28, spd: 66, cr: 35 }, cards: ["errand", "static", "news"] },
  trinilla: { types: ["music"], rar: 1, st: { hp: 40, str: 34, def: 36, spd: 50, cr: 55 }, cards: ["highnote", "deal", "chorus"] },
  carambano:{ types: ["ice"],   rar: 1, st: { hp: 42, str: 46, def: 48, spd: 40, cr: 39 }, cards: ["frostslow", "tombquiet", "vigil"] },
  capuchon: { types: ["mush"],  rar: 3, st: { hp: 62, str: 44, def: 52, spd: 36, cr: 51 }, cards: ["harvest", "stillgrow", "saprem"] },
  guardatumba:{ types: ["ice"], rar: 4, st: { hp: 66, str: 50, def: 66, spd: 30, cr: 48 }, cards: ["regent", "thousand", "sealed"] },
  veleta:   { types: ["air"],   rar: 3, st: { hp: 160, str: 42, def: 38, spd: 48, cr: 34 }, cards: ["gale", "voices", "spin"], boss: true },
  micelio:  { types: ["mush"],  rar: 3, st: { hp: 175, str: 38, def: 44, spd: 22, cr: 28 }, cards: ["spores", "threads", "sapbed"], boss: true },
  raiz:     { types: ["star"],  rar: 4, st: { hp: 230, str: 48, def: 50, spd: 38, cr: 36 }, cards: ["ache", "eight", "rootheart"], boss: true },
  unisona:  { types: ["star"],  rar: 4, st: { hp: 48, str: 48, def: 44, spd: 54, cr: 52 }, cards: ["duet", "unison", "firstnote"], story: true },
  trono:    { types: ["shadow"], rar: 3, st: { hp: 150, str: 46, def: 40, spd: 42, cr: 32 }, cards: ["court", "crown", "law"], boss: true },
  mira:     { types: ["water"],  rar: 3, st: { hp: 130, str: 38, def: 36, spd: 36, cr: 30 }, cards: ["mirror", "gaze", "core"], boss: true },
  grava:    { types: ["stone"],  rar: 3, st: { hp: 155, str: 38, def: 50, spd: 20, cr: 28 }, cards: ["cavein", "song", "core"], boss: true },
  farol:    { types: ["light"], rar: 3, st: { hp: 150, str: 42, def: 40, spd: 34, cr: 30 }, cards: ["beam", "pride", "law"], boss: true },
  forja:    { types: ["fire"],  rar: 3, st: { hp: 155, str: 44, def: 48, spd: 26, cr: 30 }, cards: ["breath", "blow", "core"], boss: true },
  seto:     { types: ["plant"], rar: 3, st: { hp: 170, str: 40, def: 44, spd: 30, cr: 30 }, cards: ["vine", "thorn", "root"], boss: true },
};
const lvlScale = (lvl) => 1 + 0.1 * (lvl - 1);
const xpNeed = (lvl) => 20 + 15 * lvl;
const SLOT_LVL = { a: 1, p: 4, s: 8 };
