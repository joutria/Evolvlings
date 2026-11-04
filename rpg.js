/* Evolvlings: expeditions and skill cards (RPG mode, part A).
   Loaded after the main game script, which exposes window.EV.
   The battle engine at the top has no DOM dependencies so it can be tested in Node. */
(function (root) {
"use strict";

/* ====================================================================== */
/* Types of the Glade: 12 in 4 circles of 3, plus Star (cards only)       */
/* ====================================================================== */
const TYPES = {
  fire:   { icon: "🔥", circle: "sol",  day: true,  es: "Fuego",  en: "Fire" },
  plant:  { icon: "🌿", circle: "sol",  day: true,  es: "Planta", en: "Plant" },
  light:  { icon: "☀️", circle: "sol",  day: true,  es: "Luz",    en: "Light" },
  bolt:   { icon: "⚡", circle: "sky",  day: true,  es: "Rayo",   en: "Bolt" },
  air:    { icon: "🌬️", circle: "sky",  day: true,  es: "Aire",   en: "Air" },
  music:  { icon: "🎵", circle: "sky",  day: true,  es: "Música", en: "Music" },
  water:  { icon: "💧", circle: "lake", day: false, es: "Agua",   en: "Water" },
  stone:  { icon: "🪨", circle: "lake", day: false, es: "Piedra", en: "Stone" },
  shadow: { icon: "🌙", circle: "lake", day: false, es: "Sombra", en: "Shadow" },
  ice:    { icon: "❄️", circle: "frost", day: false, es: "Hielo", en: "Ice" },
  mush:   { icon: "🍄", circle: "frost", day: false, es: "Seta",  en: "Mushroom" },
  dream:  { icon: "💤", circle: "frost", day: false, es: "Sueño", en: "Dream" },
  star:   { icon: "✦",  circle: null,   day: null,  es: "Estrella", en: "Star" },
};
// each type beats the next one in its circle
const BEATS = { fire: "plant", plant: "light", light: "fire", bolt: "air", air: "music", music: "bolt",
  water: "stone", stone: "shadow", shadow: "water", ice: "mush", mush: "dream", dream: "ice" };
const OPPOSITE = { light: "shadow", shadow: "light", fire: "water", water: "fire", plant: "mush", mush: "plant",
  air: "stone", stone: "air", bolt: "ice", ice: "bolt", music: "dream", dream: "music" };

function typeMult(atk, def) {
  if (!TYPES[atk] || atk === "star" || def === "star") return 1;
  if (BEATS[atk] === def) return 1.5;
  if (BEATS[def] === atk) return 0.75;
  if (OPPOSITE[atk] === def) return 1.25;
  if (atk === def) return 0.75;
  return 1;
}
function isDayNow(d) { const h = (d || new Date()).getHours(); return h >= 7 && h < 19; }

/* ====================================================================== */
/* Grades                                                                 */
/* ====================================================================== */
const GRADES = [
  { id: "c",  mult: 1.00, dur: 0, cd: 0, trade: 1.0,  w: 80,  es: "Común",      en: "Common",     col: "#6b4a3a" },
  { id: "r",  mult: 1.20, dur: 0, cd: 0, trade: 0.9,  w: 15,  es: "Rara",       en: "Rare",       col: "#a3343b" },
  { id: "vr", mult: 1.40, dur: 1, cd: 1, trade: 0.8,  w: 4,   es: "Súper rara", en: "Super rare", col: "#6e6283" },
  { id: "sr", mult: 1.65, dur: 1, cd: 1, trade: 0.65, w: 0.8, es: "Épica",      en: "Epic",       col: "#2f5d96" },
  { id: "ep", mult: 1.95, dur: 2, cd: 2, trade: 0.5,  w: 0.18,es: "Mítica",     en: "Mythic",     col: "#c25e9a" },
  { id: "lg", mult: 2.30, dur: 2, cd: 2, trade: 0.4,  w: 0.02,es: "Legendaria", en: "Legendary",  col: "#e0603f" },
];
/* Rarity is read from the frame's material (Visual language of the Glade, section 7):
   wood, copper, silver, lake glass, nacre, root-light. Colours are Glimmer-32. */
const GRADE_VIS = [
  { mat: ["#6b4a3a", "#a07a55"], anim: null },    // Común: madera del Bosque Hondo
  { mat: ["#a3343b", "#f39a52"], anim: null },    // Rara: cobre del Gremio
  { mat: ["#9d93ad", "#fbf6ef"], anim: null },    // Súper rara: plata de Los Altos
  { mat: ["#3f93c4", "#c8eef5"], anim: "shine" }, // Épica: cristal del Lago Espejo
  { mat: ["#f4a6c4", "#c7a6ff"], anim: "irid" },  // Mítica: nácar del Fondo Blanco
  { mat: ["#ffd57a", "#fff0b8"], anim: "pulse" }, // Legendaria: luz de raíz
];
// The Black Sap keeps its own colours, outside Glimmer-32 on purpose; nothing else uses them
const SAP = { c0: "#0e0814", c1: "#241030", c2: "#3b1d4a", sheen: "#7dffb0" };
function rollGrade(minIdx, rnd) {
  rnd = rnd || Math.random;
  const pool = GRADES.slice(minIdx || 0);
  const tot = pool.reduce((a, g) => a + g.w, 0);
  let r = rnd() * tot;
  for (const g of pool) { r -= g.w; if (r <= 0) return GRADES.indexOf(g); }
  return GRADES.indexOf(pool[pool.length - 1]);
}

/* ====================================================================== */
/* Statuses                                                               */
/* ====================================================================== */
// neg: negative statuses (cleansable). v: default value.
const STATUS = {
  burn:    { neg: true,  icon: "🔥", v: 6,  es: "Quemado",   en: "Burned" },
  soak:    { neg: true,  icon: "💧", v: 30, es: "Empapado",  en: "Soaked" },
  trap:    { neg: true,  icon: "🌿", v: 0,  es: "Atrapado",  en: "Trapped" },
  stun:    { neg: true,  icon: "💫", v: 0,  es: "Aturdido",  en: "Stunned" },
  blind:   { neg: true,  icon: "✴️", v: 50, es: "Cegado",    en: "Blinded" },
  slow:    { neg: true,  icon: "🐌", v: 30, es: "Lento",     en: "Slowed" },
  dull:    { neg: true,  icon: "☁️", v: 10, es: "Adormilado", en: "Drowsy" },
  cheer:   { neg: false, icon: "✨", v: 20, es: "Ánimo",     en: "Cheer" },
  guard:   { neg: false, icon: "🛡️", v: 20, es: "Guardia",   en: "Guard" },
  fury:    { neg: false, icon: "💢", v: 10, es: "Brío",      en: "Vigor" },
  might:   { neg: false, icon: "💪", v: 10, es: "Empuje",    en: "Boost" },
  regen:   { neg: false, icon: "🌱", v: 8,  es: "Siembra",   en: "Sprout" },
  haste:   { neg: false, icon: "💨", v: 20, es: "Prisa",     en: "Haste" },
  cushion: { neg: false, icon: "☁️", v: 50, es: "Mullido",   en: "Cushioned" },
  hidden:  { neg: false, icon: "🌫️", v: 0,  es: "Escondido", en: "Hidden" },
  charge:  { neg: false, icon: "⚡", v: 80, es: "Carga",     en: "Charged" },
  taunt:   { neg: false, icon: "🛡️", v: 0,  es: "Desafío",   en: "Taunting" },
  evade:   { neg: false, icon: "💨", v: 10, es: "Esquivo",   en: "Evasive" },
  exposed: { neg: true,  icon: "🎯", v: 0,  es: "Expuesto",  en: "Exposed" },
  marked:  { neg: true,  icon: "📣", v: 20, es: "Señalado",  en: "Marked" },
};

/* ====================================================================== */
/* Cards. Values are for grade Común; the grade scales them.              */
/*  p: passive mods  a: active  s: support trigger                         */
/*  Positive numbers scale with value mult, negative ones with tradeoff.   */
/* ====================================================================== */
const CARDS = {
  // Lumo
  flash:    { type: "light", by: "lumo", p: { spd: 10 }, a: { cd: 3, tgt: "foe", pow: 110, st: ["blind", 1, 1] }, s: { on: "start", fx: { tgt: "fastestFoe", st: ["blind", 1, 1] } } },
  lantern:  { type: "light", by: "lumo", p: { crit: 12, lowFun: -12 }, a: { cd: 3, tgt: "ally", heal: 15, cleanse: "blind" }, s: { on: "allyStatus", status: "blind", fx: { tgt: "theAlly", cleanse: "blind" } } },
  spark:    { type: "light", by: "lumo", p: { critSpark: 5 }, a: { cd: 3, tgt: "allyOther", st: ["cheer", 2, 1] }, s: { on: "allyLow", pct: 50, fx: { tgt: "theAlly", st: ["cheer", 2, 1] } } },
  // Fizz
  gust:     { type: "air", by: "fizz", p: { spd: 10, str: -5 }, a: { cd: 3, tgt: "rand", hits: 3, pow: 40, st: ["slow", 1, 0.2] }, s: { on: "start", fx: { tgt: "slowAlly", st: ["haste", 1, 1] } } },
  cloud:    { type: "air", by: "fizz", p: { dodge: 12 }, a: { cd: 3, tgt: "ally", st: ["cushion", 2, 1] }, s: { on: "allyLethal" } },
  rain:     { type: "air", by: "fizz", p: { stShort: 1 }, a: { cd: 5, tgt: "allies", cleanse: "one" }, s: { on: "every", n: 4, fx: { tgt: "debuffedAlly", cleanse: "longest" } } },
  // Pebb
  throw:    { type: "stone", by: "pebb", p: { vsShield: 10 }, a: { cd: 3, tgt: "foe", pow: 120, breakShield: 1 }, s: { on: "foeShield" } },
  stubborn: { type: "stone", by: "pebb", p: { hp: 12, spd: -8 }, a: { cd: 3, tgt: "foe", pow: 100, selfSt: ["guard", 2, 1, 10] }, s: { on: "allyLow", pct: 40, fx: { tgt: "theAlly", st: ["guard", 2, 1, 20] } } },
  promise:  { type: "stone", by: "pebb", p: { shieldLong: 1 }, a: { cd: 4, tgt: "selfAlly", shield: [20, 2] }, s: { on: "start", fx: { tgt: "lowAlly", shield: [15, 2] } } },
  // Fuellito
  bellows:  { type: "fire", by: "fuellito", p: { onHit: ["burn", 2, 0.1] }, a: { cd: 3, tgt: "foe", pow: 80, st: ["burn", 3, 1] }, s: { on: "start", fx: { tgt: "fireAlly", st: ["fury", 3, 1, 10] } } },
  bread:    { type: "fire", by: "fuellito", p: { hp: 10 }, a: { cd: 4, tgt: "allies", heal: 12, cleanse: "soak" }, s: { on: "win", heal: 5 } },
  piece:    { type: "fire", by: "fuellito", p: { firstHit: 30 }, a: { cd: 4, tgt: "foe", pow: 140 }, s: { on: "start", fx: { tgt: "wildAllies", st: ["might", 99, 1, 10] } } },
  // Brotín
  acorn:    { type: "plant", by: "brotin", p: { vsHigher: 10 }, a: { cd: 3, tgt: "foe", pow: 120, drain: 20 }, s: { on: "allyStatus", status: "trap", fx: { tgt: "theAlly", cleanse: "trap" } } },
  rings:    { type: "plant", by: "brotin", p: { defRound: 3 }, a: { cd: 3, tgt: "foe", pow: 70, st: ["slow", 2, 1] }, s: { on: "round", n: 6, fx: { tgt: "allies", st: ["fury", 99, 1, 10] } } },
  seedling: { type: "plant", by: "brotin", p: { def: 5, healRecv: 5 }, a: { cd: 3, tgt: "ally", st: ["regen", 3, 1, 8] }, s: { on: "start", fx: { tgt: "allies", shield: [5, 3] } } },
  // Remolín
  whirl:    { type: "water", by: "remolin", p: { spd: 8 }, a: { cd: 3, tgt: "foe", pow: 90, st: ["soak", 2, 1] }, s: { on: "start", fx: { tgt: "fireFoe", st: ["soak", 2, 1] } } },
  vessel:   { type: "water", by: "remolin", p: { resistAdv: 15 }, a: { cd: 4, tgt: "foes", pow: 60 }, s: { on: "allyHitAdv", n: 2, v: 15 } },
  guest:    { type: "water", by: "remolin", p: { healRecv: 10 }, a: { cd: 3, tgt: "ally", heal: 18 }, s: { on: "allyStatus", status: "burn", fx: { tgt: "theAlly", cleanse: "burn" } } },
  // Bostezo
  yawn:     { type: "dream", by: "bostezo", p: { onHitBy: ["slow", 1, 0.1] }, a: { cd: 4, tgt: "foe", st: ["stun", 1, 1], skipNext: 1 }, s: { on: "start", fx: { tgt: "randFoe", st: ["slow", 2, 1] } } },
  pillow:   { type: "dream", by: "bostezo", p: { critImmune: 1 }, a: { cd: 3, tgt: "foe", pow: 100, st: ["dull", 2, 1, 10] }, s: { on: "allyCrit", fx: { tgt: "theAlly", st: ["cushion", 2, 1, 30] } } },
  tale:     { type: "dream", by: "bostezo", p: { hp: 15, spd: -10 }, a: { cd: 4, tgt: "allies", heal: 10 }, s: { on: "start", fx: { tgt: "lowAlly", heal: 15 } } },
  // Mecha
  street:   { type: "light", by: "mecha", p: { teamBlindShort: 1 }, a: { cd: 4, tgt: "foe", pow: 130, trueHit: 1 }, s: { on: "start", fx: { tgt: "self", noClockFoes: 1 } } },
  oil:      { type: "light", by: "mecha", pact: true, p: { dmg: 15, bleed: -2 }, a: { cd: 4, tgt: "lowOther", selfCost: -20, heal: 30 }, s: { on: "allyLow", pct: 20, fx: { tgt: "theAlly", give: 20 } } },
  ration:   { type: "light", by: "mecha", p: { healGive: 20, healRecv: -20 }, a: { cd: 4, tgt: "allies", heal: 10 }, s: { on: "every", n: 3, fx: { tgt: "lowAlly", heal: 8 } } },
  // Yunquerón
  temper:   { type: "fire", by: "yunqueron", p: { rage: 4 }, a: { cd: 5, tgt: "foe", pow: 170, st: ["slow", 1, 1] }, s: { on: "allyCrit", fx: { tgt: "theAlly", shield: [20, 2] } } },
  anvil:    { type: "fire", by: "yunqueron", p: { def: 15, spd: -10, onHitBy: ["burn", 2, 0.15] }, a: { cd: 4, tgt: "self", shield: [25, 2] }, s: { on: "start", fx: { tgt: "lowDefAlly", shield: [15, 2] } } },
  furnace:  { type: "fire", by: "yunqueron", p: { immune: "soak", weakWater: -10 }, a: { cd: 5, tgt: "foes", st: ["burn", 2, 1] }, s: { on: "allyKO", type: "fire", fx: { tgt: "allies", st: ["fury", 2, 1, 15] } } },
  // Espinardo
  inward:   { type: "plant", by: "espinardo", pact: true, p: { lifesteal: 10, healRecv: -30 }, a: { cd: 5, tgt: "foe", pow: 200, drain: 50, selfMaxDown: -10 }, s: { on: "foeKO", fx: { tgt: "lowAlly", heal: 10 } } },
  outward:  { type: "plant", by: "espinardo", p: { thorns: 15 }, a: { cd: 5, tgt: "allies", shield: [20, 2] }, s: { on: "allyBigHit", fx: { tgt: "attacker", st: ["trap", 1, 1] } } },
  hedge:    { type: "plant", by: "espinardo", p: { defNight: 20, defDay: -10 }, a: { cd: 5, tgt: "fastestFoe", st: ["trap", 1, 1] }, s: { on: "start", fx: { tgt: "foes", st: ["slow", 2, 1, 15] } } },
  // La Forja Despierta (guardian only)
  breath:   { type: "fire", by: "forja", boss: true, p: { immune: "soak" }, a: { cd: 4, tgt: "foes", pow: 90, st: ["burn", 2, 0.5] }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", st: ["fury", 99, 1, 20] } } },
  blow:     { type: "fire", by: "forja", boss: true, p: { dmg: 10, def: 10 }, a: { cd: 3, tgt: "foe", pow: 130, st: ["burn", 2, 1] }, s: { on: "start", fx: { tgt: "foes", st: ["burn", 1, 1] } } },
  core:     { type: "fire", by: "forja", boss: true, p: { def: 15 }, a: { cd: 4, tgt: "self", shield: [15, 2] }, s: { on: "every", n: 3, fx: { tgt: "self", shield: [12, 2] } } },
  // El Seto Hambriento (guardian only)
  vine:     { type: "plant", by: "seto", boss: true, p: { thorns: 10 }, a: { cd: 4, tgt: "fastestFoe", pow: 80, st: ["trap", 1, 1] }, s: { on: "allyBigHit", fx: { tgt: "attacker", st: ["trap", 1, 1] } } },
  thorn:    { type: "plant", by: "seto", boss: true, p: { thorns: 15 }, a: { cd: 3, tgt: "foes", pow: 60, st: ["slow", 1, 1] }, s: { on: "start", fx: { tgt: "foes", st: ["slow", 2, 1, 15] } } },
  root:     { type: "plant", by: "seto", boss: true, p: { lifesteal: 10 }, a: { cd: 4, tgt: "self", heal: 15 }, s: { on: "start", fx: { tgt: "self", st: ["regen", 99, 1, 3] } } },
  // Nim
  night:    { type: "shadow", by: "nim", p: { nightAll: 10 }, a: { cd: 4, tgt: "self", st: ["hidden", 1, 1], selfSt: ["charge", 3, 1, 80] }, s: { on: "start", fx: { tgt: "allies", nightOnly: 1, st: ["evade", 2, 1, 10] } } },
  nohide:   { type: "shadow", by: "nim", p: { shade: 15 }, a: { cd: 3, tgt: "foe", pow: 140, selfSt: ["exposed", 1, 1] }, s: { on: "allyLow", pct: 30, fx: { tgt: "self", st: ["taunt", 1, 1] } } },
  truename: { type: "shadow", by: "nim", p: { immune: "blind" }, a: { cd: 4, tgt: "foe", st: ["blind", 2, 1], st2: ["slow", 1, 1] }, s: { on: "allyStatus", status: "blind", fx: { tgt: "theAlly", cleanse: "blind" } } },
  // Centinela de Bruma
  lance:    { type: "shadow", by: "centinela", p: { vsBlind: 10 }, a: { cd: 4, tgt: "foe", pow: 160, pierce: 1 }, s: { on: "foeShield" } },
  oath:     { type: "shadow", by: "centinela", pact: true, p: { oath: 25 }, a: { cd: 5, tgt: "self", st: ["taunt", 2, 1], selfSt: ["guard", 2, 1, 30] }, s: { on: "allyKO", fx: { tgt: "self", st: ["fury", 99, 1, 30] } } },
  veil:     { type: "shadow", by: "centinela", p: { def: 15 }, a: { cd: 4, tgt: "lowOther", st: ["hidden", 1, 1] }, s: { on: "allyBigHit", fx: { tgt: "self", st: ["taunt", 2, 1] } } },
  // Vidriela
  lostwave: { type: "water", by: "vidriela", p: { perFallen: 10 }, a: { cd: 4, tgt: "foe", pow: 120, splash: 40 }, s: { on: "allyKO", fx: { tgt: "allies", heal: 20 } } },
  truewater:{ type: "water", by: "vidriela", p: { immune: "blind", sight: 10 }, a: { cd: 4, tgt: "strongFoe", copyBuff: 1 }, s: { on: "allyStatus", status: "blind", fx: { tgt: "theAlly", cleanse: "blind" } } },
  reading:  { type: "water", by: "vidriela", p: { dodge: 8 }, a: { cd: 4, tgt: "self", foresight: 1 }, s: { on: "start", fx: { tgt: "allies", st: ["guard", 1, 1, 15] } } },
  // Ecolito
  echo:     { type: "stone", by: "ecolito", p: { echo: 15 }, a: { cd: 4, tgt: "self", echoLast: 60 }, s: { on: "start", fx: { tgt: "self", cdDown: 1 } } },
  miner:    { type: "stone", by: "ecolito", p: { desperate: 20 }, a: { cd: 5, tgt: "foes", pow: 90, st: ["slow", 1, 1] }, s: { on: "win", revive: 10 } },
  rockname: { type: "stone", by: "ecolito", p: { stoneDef: 10 }, a: { cd: 5, tgt: "foe", st: ["stun", 1, 1], selfSt: ["slow", 2, 1] }, s: { on: "allyKO", fx: { tgt: "fallenAlly", ifAbove: 50, revive: 15 } } },
  // El Trono Vacío (guardian only)
  court:    { type: "shadow", by: "trono", boss: true, p: { dodge: 12 }, a: { cd: 4, tgt: "foes", pow: 85, st: ["blind", 1, 0.6] }, s: { on: "every", n: 3, fx: { tgt: "self", st: ["hidden", 1, 1] } } },
  crown:    { type: "shadow", by: "trono", boss: true, p: { nightAll: 15 }, a: { cd: 3, tgt: "foe", pow: 130, pierce: 1 }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", st: ["charge", 3, 1, 60] } } },
  // La Que Mira desde Abajo (guardian only)
  mirror:   { type: "water", by: "mira", boss: true, p: { resistAdv: 20 }, a: { cd: 4, tgt: "foes", pow: 90, st: ["soak", 2, 1] }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", heal: 20 } } },
  gaze:     { type: "water", by: "mira", boss: true, p: { sight: 15 }, a: { cd: 3, tgt: "strongFoe", pow: 110, st: ["dull", 2, 1, 10] }, s: { on: "start", fx: { tgt: "foes", st: ["dull", 2, 1, 10] } } },
  // Grava (guardian only)
  cavein:   { type: "stone", by: "grava", boss: true, p: { def: 15, thorns: 5 }, a: { cd: 4, tgt: "foes", pow: 90, st: ["slow", 1, 1] }, s: { on: "every", n: 3, fx: { tgt: "self", shield: [15, 2] } } },
  song:     { type: "stone", by: "grava", boss: true, p: { echo: 20 }, a: { cd: 3, tgt: "foe", pow: 120, st: ["stun", 1, 0.3] }, s: { on: "allyLow", pct: 40, fx: { tgt: "self", heal: 15 } } },
  // El Gran Farol (guardian only, never drops)
  // Relampín (Los Altos)
  errand:   { type: "bolt", by: "relampin", p: { spd: 12 }, a: { cd: 3, tgt: "foe", pow: 130, selfSt: ["haste", 1, 1, 30] }, s: { on: "start", fx: { tgt: "slowAlly", st: ["haste", 1, 1, 40] } } },
  static:   { type: "bolt", by: "relampin", p: { onHit: ["stun", 1, 0.1], def: -10 }, a: { cd: 5, tgt: "allyOther", st: ["charge", 2, 1, 30] }, s: { on: "allyStatus", status: "stun", fx: { tgt: "randFoe", pow: 60 } } },
  news:     { type: "bolt", by: "relampin", p: { dodge: 10 }, a: { cd: 4, tgt: "foe", st: ["marked", 2, 1, 20] }, s: { on: "start", fx: { tgt: "allies", st: ["evade", 1, 1, 10] } } },
  // Trinilla (Los Altos)
  highnote: { type: "music", by: "trinilla", p: { vsHeld: 20 }, a: { cd: 4, tgt: "foe", pow: 110, st: ["stun", 1, 1] }, s: { on: "every", n: 4, fx: { tgt: "self", cdDown: 1 } } },
  deal:     { type: "music", by: "trinilla", p: { teamCrit: 8, frail: -10 }, a: { cd: 3, tgt: "foe", pow: 60, strip: 1 }, s: { on: "every", n: 3, fx: { tgt: "allies", heal: 5 } } },
  chorus:   { type: "music", by: "trinilla", p: { buffLong: 1 }, a: { cd: 4, tgt: "allies", st: ["fury", 3, 1, 10] }, s: { on: "every", n: 3, fx: { tgt: "allies", st: ["fury", 1, 1, 10] } } },
  // Carámbano (Fondo Blanco)
  frostslow:{ type: "ice", by: "carambano", p: { onHit: ["slow", 2, 0.15] }, a: { cd: 3, tgt: "foe", pow: 110, st: ["slow", 2, 1] }, s: { on: "start", fx: { tgt: "fastestFoe", st: ["slow", 1, 1] } } },
  tombquiet:{ type: "ice", by: "carambano", p: { def: 12, spd: -30 }, a: { cd: 4, tgt: "self", shield: [25, 2] }, s: { on: "allyStatus", status: "stun", fx: { tgt: "theAlly", cleanse: "stun" } } },
  vigil:    { type: "ice", by: "carambano", p: { immune: "stun" }, a: { cd: 4, tgt: "ally", st: ["regen", 3, 1, 6] }, s: { on: "every", n: 3, fx: { tgt: "lowAlly", shield: [10, 2] } } },
  // Capuchón (Fondo Blanco)
  harvest:  { type: "mush", by: "capuchon", pact: true, p: { hp: -15, perFoeFallen: 8 }, a: { cd: 5, tgt: "foe", pow: 180, teamDrain: 50, selfCost: -10 }, s: { on: "allyKO", fx: { tgt: "lowAlly", heal: 20 } } },
  stillgrow:{ type: "mush", by: "capuchon", p: { vsHeld: 20 }, a: { cd: 4, tgt: "foes", st: ["slow", 2, 1] }, s: { on: "every", n: 3, fx: { tgt: "foes", st: ["slow", 1, 1] } } },
  saprem:   { type: "mush", by: "capuchon", p: { healGive: 15, healRecv: -10 }, a: { cd: 5, tgt: "ally", heal: 25, cleanse: "all" }, s: { on: "allyStatus", status: "burn", fx: { tgt: "theAlly", cleanse: "longest" } } },
  // Guardatumba (Fondo Blanco)
  regent:   { type: "ice", by: "guardatumba", p: { perDebuff: 10 }, a: { cd: 5, tgt: "foe", pow: 180, st: ["slow", 2, 1] }, s: { on: "foeKO", fx: { tgt: "allies", st: ["fury", 2, 1, 20] } } },
  thousand: { type: "ice", by: "guardatumba", p: { def: 20, immune: "slow", spd: -15 }, a: { cd: 6, tgt: "allies", shield: [30, 2] }, s: { on: "allyLow", pct: 25, fx: { tgt: "theAlly", shield: [30, 2] } } },
  sealed:   { type: "ice", by: "guardatumba", p: { onHitBy: ["slow", 1, 0.2] }, a: { cd: 5, tgt: "foe", pow: 70, cdUp: 2 }, s: { on: "start", fx: { tgt: "foes", cdUp: 1 } } },
  // guardians of Los Altos and the Fondo Blanco
  gale:     { type: "air", by: "veleta", boss: true, p: { spd: 10 }, a: { cd: 4, tgt: "foes", pow: 85, st: ["slow", 1, 0.5] }, s: { on: "start", fx: { tgt: "foes", st: ["dull", 2, 1, 10] } } },
  voices:   { type: "air", by: "veleta", boss: true, p: { teamCrit: 6, dmg: 10 }, a: { cd: 3, tgt: "strongFoe", pow: 110, strip: 1 }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", st: ["fury", 99, 1, 20] } } },
  spin:     { type: "air", by: "veleta", boss: true, p: { dodge: 12 }, a: { cd: 4, tgt: "self", st: ["evade", 2, 1, 20] }, s: { on: "every", n: 3, fx: { tgt: "self", st: ["evade", 1, 1, 15] } } },
  spores:   { type: "mush", by: "micelio", boss: true, p: { vsHeld: 15 }, a: { cd: 4, tgt: "foes", pow: 70, st: ["dull", 2, 1, 10] }, s: { on: "every", n: 3, fx: { tgt: "foes", st: ["slow", 1, 1] } } },
  threads:  { type: "mush", by: "micelio", boss: true, p: { lifesteal: 10 }, a: { cd: 3, tgt: "fastestFoe", pow: 90, st: ["trap", 1, 0.6] }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", heal: 15 } } },
  sapbed:   { type: "mush", by: "micelio", boss: true, p: { def: 10 }, a: { cd: 4, tgt: "self", heal: 15 }, s: { on: "start", fx: { tgt: "self", st: ["regen", 99, 1, 3] } } },
  beam:     { type: "light", by: "farol", boss: true, p: { dmg: 10 }, a: { cd: 4, tgt: "foes", pow: 100, st: ["blind", 1, 1] }, s: { on: "start", fx: { tgt: "foes", st: ["slow", 2, 1, 10] } } },
  pride:    { type: "light", by: "farol", boss: true, p: { dmg: 15 }, a: { cd: 3, tgt: "foe", pow: 130 }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", shield: [20, 2] } } },
  law:      { type: "light", by: "farol", boss: true, p: { spd: 10 }, a: { cd: 4, tgt: "foes", st: ["slow", 2, 1, 10] }, s: { on: "start", fx: { tgt: "foes", st: ["slow", 2, 1, 10] } } },
  // the Aching Root (final guardian, Star) and Unísona (story creature, Star: never from pulls)
  ache:     { type: "star", by: "raiz", boss: true, p: { dmg: 10 }, a: { cd: 4, tgt: "foes", pow: 90, st: ["dull", 2, 1, 10] }, s: { on: "start", fx: { tgt: "foes", st: ["slow", 1, 1, 10] } } },
  eight:    { type: "star", by: "raiz", boss: true, p: { teamCrit: 6, dmg: 10 }, a: { cd: 3, tgt: "strongFoe", pow: 120, strip: 1 }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", st: ["fury", 99, 1, 20] } } },
  rootheart:{ type: "star", by: "raiz", boss: true, p: { def: 15 }, a: { cd: 5, tgt: "self", shield: [30, 2] }, s: { on: "allyLow", pct: 25, fx: { tgt: "theAlly", shield: [30, 2] } } },
  duet:     { type: "star", by: "unisona", story: true, p: { spd: 10 }, a: { cd: 3, tgt: "foe", pow: 120, st: ["blind", 1, 1] }, s: { on: "start", fx: { tgt: "fastestFoe", st: ["blind", 1, 1] } } },
  unison:   { type: "star", by: "unisona", story: true, p: { healGive: 15 }, a: { cd: 4, tgt: "allies", heal: 12 }, s: { on: "allyStatus", status: "blind", fx: { tgt: "theAlly", cleanse: "blind" } } },
  firstnote:{ type: "star", by: "unisona", story: true, p: { teamCrit: 6 }, a: { cd: 4, tgt: "allies", shield: [20, 2] }, s: { on: "allyLow", pct: 40, fx: { tgt: "theAlly", st: ["guard", 2, 1, 20] } } },
};
const DROP_POOL = Object.keys(CARDS).filter((k) => !CARDS[k].boss && !CARDS[k].story);
// Which card types each home creature can use: its own type, two from its circle or close to it,
// and one for coverage. Adults also learn their evolution's type, and a creature can always use its own signature cards.
const COMPAT = {
  lumo: ["light", "fire", "plant", "bolt"],
  fizz: ["air", "bolt", "music", "dream"],
  pebb: ["stone", "water", "shadow", "ice"],
};
function canUse(species, form, id) {
  const c = CARDS[id], list = COMPAT[species];
  if (!c || !list) return true;
  if (c.type === "star") return true; // Star cards fit every creature
  if (c.by === species || list.includes(c.type)) return true;
  const adult = MONS[species] && MONS[species].adult && form && MONS[species].adult[form];
  return adult === c.type;
}
const UPGRADE_N = 5; // 5 cards of one grade make 1 of the next

// scale a numeric spec value by grade (positive → value mult, negative → tradeoff)
function sv(v, g) { return v >= 0 ? Math.round(v * g.mult) : Math.round(v * g.trade); }
function scaleStatus(st, g) {
  if (!st) return null;
  const [name, turns, chance, val] = st;
  return [name, turns >= 99 ? 99 : turns + g.dur, Math.min(1, chance * (chance < 1 ? g.mult : 1)), val != null ? sv(val, g) : STATUS[name].v];
}
function scaled(id, gi) {
  const c = CARDS[id], g = GRADES[gi || 0];
  const p = {};
  for (const k in c.p) {
    const v = c.p[k];
    if (Array.isArray(v)) p[k] = scaleStatus(v, g);
    else if (typeof v === "string") p[k] = v;
    else if (k === "teamBlindShort") p[k] = v + (g.dur > 0 ? 1 : 0);
    else if (k === "stShort" || k === "shieldLong" || k === "buffLong" || k === "critImmune") p[k] = v + (g.dur > 0 && k !== "critImmune" ? g.dur : 0);
    else p[k] = sv(v, g);
  }
  const a = Object.assign({}, c.a);
  a.cd = Math.max(1, c.a.cd - g.cd);
  if (a.pow) a.pow = sv(a.pow, g);
  if (a.heal) a.heal = sv(a.heal, g);
  if (a.drain) a.drain = sv(a.drain, g);
  if (a.shield) a.shield = [sv(a.shield[0], g), a.shield[1] + g.dur];
  if (a.st) a.st = scaleStatus(a.st, g);
  if (a.selfSt) a.selfSt = scaleStatus(a.selfSt, g);
  if (a.selfCost) a.selfCost = sv(a.selfCost, g);
  if (a.st2) a.st2 = scaleStatus(a.st2, g);
  if (a.splash) a.splash = sv(a.splash, g);
  if (a.teamDrain) a.teamDrain = sv(a.teamDrain, g);
  if (a.echoLast) a.echoLast = sv(a.echoLast, g);
  if (a.selfMaxDown) a.selfMaxDown = sv(a.selfMaxDown, g);
  const s = Object.assign({}, c.s);
  if (s.heal) s.heal = sv(s.heal, g);
  if (s.revive) s.revive = sv(s.revive, g);
  if (s.v) s.v = sv(s.v, g);
  if (s.n && s.on === "allyHitAdv") s.n = s.n + g.dur;
  if (s.n && s.on === "every") s.n = Math.max(2, s.n - g.cd);
  if (s.fx) {
    s.fx = Object.assign({}, s.fx);
    if (s.fx.st) s.fx.st = scaleStatus(s.fx.st, g);
    if (s.fx.shield) s.fx.shield = [sv(s.fx.shield[0], g), s.fx.shield[1] + g.dur];
    if (s.fx.heal) s.fx.heal = sv(s.fx.heal, g);
    if (s.fx.give) s.fx.give = sv(s.fx.give, g);
    if (s.fx.revive) s.fx.revive = sv(s.fx.revive, g);
  }
  return { id, type: c.type, grade: gi || 0, p, a, s };
}

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

/* Build a battle unit.
   o: { kind, lvl, side, name, own, wild, hollow, care: {full,fun,energy,clean,health}, stage, form, cards: {a,p,s} (scaled), hpPct, boss } */
function makeUnit(o) {
  const m = MONS[o.kind];
  const sc = lvlScale(o.lvl);
  const careF = (k) => (o.care ? 0.75 + 0.5 * (o.care[k] || 0) / 100 : 1);
  const stageF = o.stage === 2 ? (o.form === "bright" ? 1.15 : 1.1) : 1;
  const hollowF = o.hollow ? 0.8 : 1;
  const base = {
    hp: m.st.hp * 3 * sc * careF("health") * stageF * hollowF,
    str: m.st.str * sc * careF("full") * stageF * hollowF,
    def: m.st.def * sc * careF("clean") * stageF * hollowF,
    spd: m.st.spd * sc * careF("energy") * stageF,
    cr: m.st.cr * careF("fun"),
  };
  const types = m.types.slice();
  if (o.stage === 2 && m.adult && o.form && m.adult[o.form]) types.push(m.adult[o.form]);
  const pm = (o.cards && o.cards.p && o.cards.p.p) || {};
  const maxHp = Math.round(base.hp * (1 + (pm.hp || 0) / 100));
  const u = {
    uid: Math.random().toString(36).slice(2, 9), kind: o.kind, name: o.name, side: o.side, own: !!o.own, wild: !!o.wild, hollow: !!o.hollow, boss: !!o.boss,
    lvl: o.lvl, types, stage: o.stage == null ? 1 : o.stage, form: o.form || "bright",
    base, maxHp, hp: Math.max(1, Math.round(maxHp * (o.hpPct == null ? 1 : o.hpPct))),
    crit: Math.min(40, base.cr / 4) + (pm.crit || 0) + (o.lowFun && pm.lowFun ? pm.lowFun : 0),
    dodge: Math.max(0, base.spd / 20 + (pm.dodge || 0)),
    mods: pm, cards: o.cards || {}, cd: 0, st: {}, shield: 0, shieldT: 0, hitOnce: false, skip: 0, sUsed: false, sCount: 0, hitsTaken: 0,
  };
  if (u.cards.a) u.cd = Math.ceil(u.cards.a.a.cd / 2);
  if (o.hpPct === 0) { u.hp = 0; }
  return u;
}

/* ====================================================================== */
/* Battle engine                                                          */
/* ====================================================================== */
function Battle(allies, foes, opt) {
  opt = opt || {};
  this.units = allies.concat(foes);
  this.round = 0;
  this.rnd = opt.rnd || Math.random;
  this.day = opt.day != null ? opt.day : isDayNow();
  this.zone = opt.zone || null;
  this.events = [];          // presentation queue: {k:'act'|'dmg'|'heal'|'miss'|'st'|'log'|'ko'|'shield'|'cleanse', ...}
  this.side = { ally: { lastType: null, spark: 0, breakNext: false, cloud: 0, vessel: 0, vesselV: 0 }, foe: { lastType: null, spark: 0, breakNext: false, cloud: 0, vessel: 0, vesselV: 0 } };
  for (const u of this.units) if (u.mods.sight) this.side[u.side].sight = Math.max(this.side[u.side].sight || 0, u.mods.sight);
  for (const u of this.units) {
    const s = u.cards.s;
    if (!s) continue;
    if (s.s.on === "allyLethal") this.side[u.side].cloud += 1;
    if (s.s.on === "allyHitAdv") { this.side[u.side].vessel += s.s.n; this.side[u.side].vesselV = Math.max(this.side[u.side].vesselV, s.s.v); }
  }
  this.over = null;
}
const B = Battle.prototype;
B.alive = function (side) { return this.units.filter((u) => u.side === side && u.hp > 0); };
B.other = (side) => (side === "ally" ? "foe" : "ally");
B.emit = function (e) { this.events.push(e); };
B.stVal = function (u, name) { const s = u.st[name]; return s ? s.v : 0; };
B.eff = function (u, k) {
  let pct = (u.mods[k] || 0);
  if (k === "spd") pct += this.stVal(u, "haste") - this.stVal(u, "slow") + this.stVal(u, "might");
  if (k === "def") {
    pct += this.stVal(u, "guard") + this.stVal(u, "might");
    if (u.mods.defRound) pct += Math.min(15 * (u.mods.defRound / 3), u.mods.defRound * this.round);
    if (u.mods.oath && this.oathOn(u)) pct += u.mods.oath;
    if (u.mods.nightAll) pct += this.day ? -Math.round(u.mods.nightAll / 2) : u.mods.nightAll;
    if (u.mods.stoneDef) pct += u.mods.stoneDef * this.alive(u.side).filter((x) => x.types.includes("stone")).length;
  }
  if (k === "str") pct += this.stVal(u, "might");
  return Math.max(1, u.base[k] * (1 + pct / 100));
};
// Juramento Susurrado: active while the first ally of the list is standing
B.oathOn = function (u) { const first = this.units.find((x) => x.side === u.side); return !!(first && first.hp > 0); };
B.dodgeOf = function (u, attacker) {
  if (u.st.exposed) return 0;
  let d = u.dodge + this.stVal(u, "evade");
  if (u.mods.shade && u.hp / u.maxHp > 0.5) d += u.mods.shade;
  if (attacker) d -= this.side[attacker.side].sight || 0;
  return Math.max(0, Math.min(40, d));
};
B.typeOf = function (u, card) {
  let ty = card ? card.type : u.types[0];
  if (ty === "star") ty = this.side[u.side].lastType || u.types[0];
  return ty;
};
B.addStatus = function (src, tgt, st, cardType) {
  if (!st || tgt.hp <= 0) return false;
  let [name, turns, chance, val] = st;
  if (this.rnd() > chance) return false;
  if (tgt.mods.immune === name) { this.emit({ k: "resist", u: tgt.uid }); return false; }
  if (name === "blind") for (const w of this.alive(tgt.side)) if (w.mods.teamBlindShort) { turns -= w.mods.teamBlindShort; break; }
  if (STATUS[name].neg) {
    // winning type: statuses last +1 turn
    if (cardType && tgt.types.some((d) => BEATS[cardType] === d)) turns += 1;
    // card vs card: if the target's passive card type beats the incoming type, the effect is halved
    const pc = tgt.cards.p;
    if (cardType && pc && BEATS[pc.type] === cardType) turns = Math.floor(turns / 2);
    if (tgt.mods.stShort) turns -= tgt.mods.stShort;
    if (turns <= 0) { this.emit({ k: "resist", u: tgt.uid }); return false; }
  }
  if (!STATUS[name].neg && src && src.mods.buffLong && turns < 99) turns += src.mods.buffLong;
  const cur = tgt.st[name];
  tgt.st[name] = { t: Math.max(cur ? cur.t : 0, turns), v: Math.max(cur ? cur.v : 0, val != null ? val : STATUS[name].v) };
  this.emit({ k: "st", u: tgt.uid, st: name });
  if (STATUS[name].neg) this.trigger("allyStatus", tgt, { status: name });
  return true;
};
B.cleanse = function (u, what) {
  const negs = Object.keys(u.st).filter((k) => STATUS[k].neg);
  let rm = [];
  if (what === "one" || what === "longest") { negs.sort((a, b) => u.st[b].t - u.st[a].t); rm = negs.slice(0, 1); }
  else if (what === "all") rm = negs;
  else if (u.st[what]) rm = [what];
  for (const k of rm) delete u.st[k];
  if (rm.length) this.emit({ k: "cleanse", u: u.uid, st: rm });
  return rm.length;
};
B.addShield = function (src, tgt, pct, turns) {
  const amt = Math.round(tgt.maxHp * pct / 100);
  tgt.shield = Math.max(tgt.shield, amt);
  tgt.shieldT = Math.max(tgt.shieldT, turns + (src.mods.shieldLong || 0));
  this.emit({ k: "shield", u: tgt.uid, n: amt });
  const foeSide = this.side[this.other(tgt.side)];
  for (const w of this.alive(this.other(tgt.side))) if (w.cards.s && w.cards.s.s.on === "foeShield" && !w.sUsed) { w.sUsed = true; foeSide.breakNext = true; this.emit({ k: "support", u: w.uid, card: w.cards.s.id }); }
};
B.heal = function (src, tgt, pct) {
  if (tgt.hp <= 0) return 0;
  let amt = tgt.maxHp * pct / 100;
  amt *= 1 + ((src && src.mods.healGive) || 0) / 100 + (tgt.mods.healRecv || 0) / 100;
  amt = Math.round(amt);
  const before = tgt.hp; tgt.hp = Math.min(tgt.maxHp, tgt.hp + amt);
  const got = tgt.hp - before;
  if (got > 0) this.emit({ k: "heal", u: tgt.uid, n: got });
  return got;
};

// one hit of damage. Returns damage dealt (0 = miss).
B.hit = function (src, tgt, pow, card, extra) {
  extra = extra || {};
  if (tgt.hp <= 0) return 0;
  const ty = this.typeOf(src, card);
  // blinded: 50% to miss; dodge
  if (src.st.blind && this.rnd() < src.st.blind.v / 100) { this.emit({ k: "miss", u: tgt.uid, by: src.uid, blind: true }); return 0; }
  const tsd = this.side[tgt.side];
  if (tsd.foresight > 0) { tsd.foresight--; this.emit({ k: "miss", u: tgt.uid, by: src.uid }); return 0; }
  if (!extra.trueHit && this.rnd() * 100 < this.dodgeOf(tgt, src)) { this.emit({ k: "miss", u: tgt.uid, by: src.uid }); return 0; }
  let d = this.eff(src, "str") * pow / 100;
  let tm = 1; for (const dt of tgt.types) tm *= typeMult(ty, dt);
  d *= tm;
  if (card && src.types.includes(card.type)) d *= 1.15;               // resonance
  if (TYPES[ty] && TYPES[ty].day != null && TYPES[ty].day === this.day && !this.side[src.side].noClock) d *= 1.1; // clock of the glade
  if (this.zone && this.zone.bonus && this.zone.bonus[ty]) d *= 1 + this.zone.bonus[ty] / 100;
  let pct = (src.mods.dmg || 0) + this.stVal(src, "fury") + this.stVal(src, "cheer");
  if (!src.hitOnce && src.mods.firstHit) pct += src.mods.firstHit;
  if (tgt.shield > 0 && src.mods.vsShield) pct += src.mods.vsShield;
  if (src.mods.vsHigher && tgt.hp > src.hp) pct += src.mods.vsHigher;
  if (src.mods.rage && src.rage) pct += src.mods.rage * src.rage;
  if (src.st.charge) { pct += src.st.charge.v; delete src.st.charge; }
  if (src.mods.vsBlind && tgt.st.blind) pct += src.mods.vsBlind;
  if (src.mods.oath && this.oathOn(src)) pct += src.mods.oath;
  if (src.mods.nightAll) pct += this.day ? -Math.round(src.mods.nightAll / 2) : src.mods.nightAll;
  if (src.mods.shade && src.hp / src.maxHp <= 0.5) pct += src.mods.shade;
  if (src.mods.desperate && this.alive(src.side).some((x) => x.hp / x.maxHp < 0.3)) pct += src.mods.desperate;
  if (src.mods.perFallen) pct += src.mods.perFallen * this.units.filter((x) => x.side === src.side && x.hp <= 0).length;
  if (src.mods.perFoeFallen) pct += src.mods.perFoeFallen * this.units.filter((x) => x.side !== src.side && x.hp <= 0).length;
  if (src.mods.vsHeld && (tgt.st.stun || tgt.st.slow || tgt.st.trap)) pct += src.mods.vsHeld;
  if (src.mods.perDebuff) pct += src.mods.perDebuff * Object.keys(tgt.st).filter((k) => STATUS[k].neg).length;
  if (tgt.st.marked) pct += tgt.st.marked.v;
  if (tgt.mods.frail) pct += Math.abs(tgt.mods.frail);
  const side = this.side[src.side];
  if (side.spark) { pct += side.spark; side.spark = 0; }
  d *= 1 + pct / 100;
  if (src.st.soak && ty === "fire") d *= 1 - src.st.soak.v / 100;
  let crit = false;
  const cc = src.crit + (src.st.cheer ? 10 : 0) - this.stVal(src, "dull") + this.alive(src.side).reduce((a, x) => a + (x.mods.teamCrit || 0), 0);
  if (this.rnd() * 100 < cc) { crit = true; if (!tgt.mods.critImmune) d *= 1.5; }
  let dv = this.eff(tgt, "def");
  if (TYPES[ty] && TYPES[ty].day === false && tgt.mods.defNight) dv *= 1 + tgt.mods.defNight / 100;
  if (TYPES[ty] && TYPES[ty].day === true && tgt.mods.defDay) dv *= 1 + tgt.mods.defDay / 100;
  d *= 60 / (60 + dv);
  if (ty === "water" && tgt.mods.weakWater) d *= 1 - tgt.mods.weakWater / 100;
  d *= 0.92 + this.rnd() * 0.16;
  if (tm > 1) {
    if (tgt.mods.resistAdv) d *= 1 - tgt.mods.resistAdv / 100;
    const ts = this.side[tgt.side];
    if (ts.vessel > 0) { ts.vessel--; d *= 1 - ts.vesselV / 100; }
  }
  if (tgt.st.cushion) { d *= 1 - tgt.st.cushion.v / 100; delete tgt.st.cushion; }
  d = Math.max(1, Math.round(d));
  // break shield
  if ((extra.breakShield || side.breakNext) && tgt.shield > 0) { tgt.shield = 0; tgt.shieldT = 0; side.breakNext = false; this.emit({ k: "break", u: tgt.uid }); }
  // shield absorbs
  let absorbed = 0;
  if (tgt.shield > 0 && !extra.pierce) { absorbed = Math.min(tgt.shield, d); tgt.shield -= absorbed; if (tgt.shield <= 0) tgt.shieldT = 0; }
  let left = d - absorbed;
  const ts = this.side[tgt.side];
  if (left >= tgt.hp && ts.cloud > 0) { ts.cloud--; left = Math.round(left / 2); this.emit({ k: "save", u: tgt.uid }); }
  tgt.hp = Math.max(0, tgt.hp - left);
  src.hitOnce = true; tgt.hitsTaken++;
  this.emit({ k: "dmg", u: tgt.uid, by: src.uid, n: d, crit, eff: tm >= 1.5 ? "up" : tm > 1 ? "opp" : tm < 1 ? "down" : "", ty });
  if (crit && src.mods.critSpark) side.spark = src.mods.critSpark;
  if (crit) this.trigger("allyCrit", tgt, {});
  if (src.mods.onHit) this.addStatus(src, tgt, src.mods.onHit, card ? card.type : null);
  if (tgt.mods.onHitBy && tgt.hp > 0) this.addStatus(tgt, src, tgt.mods.onHitBy, null);
  if (tgt.mods.rage) tgt.rage = Math.min(5, (tgt.rage || 0) + 1);
  if (src.mods.echo && !extra.echoed && tgt.hp > 0 && this.rnd() * 100 < src.mods.echo) { this.emit({ k: "echo", u: src.uid }); this.hit(src, tgt, pow * 0.5, card, { echoed: true }); }
  if (src.mods.lifesteal && src.hp > 0 && left > 0) { const g = Math.round(left * src.mods.lifesteal / 100); const bf = src.hp; src.hp = Math.min(src.maxHp, src.hp + g); if (src.hp > bf) this.emit({ k: "heal", u: src.uid, n: src.hp - bf }); }
  if (tgt.mods.thorns && src.hp > 0 && left > 0 && !extra.thorns) {
    const r = Math.max(1, Math.round(left * tgt.mods.thorns / 100));
    src.hp = Math.max(0, src.hp - r); this.emit({ k: "dmg", u: src.uid, n: r, dot: "thorns" });
    if (src.hp <= 0) { src.st = {}; src.shield = 0; this.emit({ k: "ko", u: src.uid }); this.trigger("allyKO", src, { ko: src }); }
  }
  if (tgt.hp > 0 && left > tgt.maxHp * 0.25) this.trigger("allyBigHit", tgt, { attacker: src });
  if (extra.drain && src.hp > 0) { const g = Math.round(left * extra.drain / 100); const bf = src.hp; src.hp = Math.min(src.maxHp, src.hp + g); if (src.hp > bf) this.emit({ k: "heal", u: src.uid, n: src.hp - bf }); }
  if (tgt.hp <= 0) { tgt.st = {}; tgt.shield = 0; this.emit({ k: "ko", u: tgt.uid }); this.trigger("allyKO", tgt, { ko: tgt }); if (src.hp > 0) this.trigger("foeKO", src, {}); }
  else this.trigger("allyLow", tgt, {});
  return d;
};

// choose targets
B.targets = function (spec, src, ctx) {
  let foes = this.alive(this.other(src.side)).filter((u) => !u.st.hidden);
  const allies = this.alive(src.side);
  const taunt = foes.filter((u) => u.st.taunt);
  if (taunt.length && ["foe", "rand", "randFoe", "fastestFoe", "fireFoe"].includes(spec)) foes = taunt;
  const byHpPct = (a, b) => a.hp / a.maxHp - b.hp / b.maxHp;
  switch (spec) {
    case "foe": {
      if (!foes.length) return [];
      const ty = ctx && ctx.card ? this.typeOf(src, ctx.card) : this.typeOf(src, null);
      const score = (u) => u.types.reduce((m, d) => m * typeMult(ty, d), 1) * 10 - u.hp / u.maxHp;
      return [foes.slice().sort((a, b) => score(b) - score(a))[0]];
    }
    case "foes": return foes;
    case "rand": case "randFoe": return foes.length ? [foes[Math.floor(this.rnd() * foes.length)]] : [];
    case "fastestFoe": return foes.length ? [foes.slice().sort((a, b) => this.eff(b, "spd") - this.eff(a, "spd"))[0]] : [];
    case "fireFoe": { const f = foes.filter((u) => u.types.includes("fire")); const l = f.length ? f : foes; return l.length ? [l.slice().sort((a, b) => this.eff(b, "str") - this.eff(a, "str"))[0]] : []; }
    case "self": return [src];
    case "ally": return allies.length ? [allies.slice().sort(byHpPct)[0]] : [];
    case "allyOther": { const o = allies.filter((u) => u !== src); const l = o.length ? o : allies; return [l.slice().sort((a, b) => this.eff(b, "str") - this.eff(a, "str"))[0]]; }
    case "lowAlly": return allies.length ? [allies.slice().sort(byHpPct)[0]] : [];
    case "allies": return allies;
    case "selfAlly": { const o = allies.filter((u) => u !== src).sort(byHpPct); return o.length ? [src, o[0]] : [src]; }
    case "slowAlly": return allies.length ? [allies.slice().sort((a, b) => this.eff(a, "spd") - this.eff(b, "spd"))[0]] : [];
    case "fireAlly": { const f = allies.filter((u) => u.types.includes("fire")); const l = f.length ? f : allies; return [l.slice().sort((a, b) => this.eff(b, "str") - this.eff(a, "str"))[0]]; }
    case "wildAllies": return allies.filter((u) => u.wild);
    case "debuffedAlly": { const d = allies.filter((u) => Object.keys(u.st).some((k) => STATUS[k].neg)); return d.length ? [d[0]] : []; }
    case "theAlly": return ctx && ctx.ally && ctx.ally.hp > 0 ? [ctx.ally] : [];
    case "fallenAlly": return ctx && ctx.ally && ctx.ally.hp <= 0 ? [ctx.ally] : [];
    case "strongFoe": return foes.length ? [foes.slice().sort((a, b) => this.eff(b, "str") - this.eff(a, "str"))[0]] : [];
    case "attacker": return ctx && ctx.attacker && ctx.attacker.hp > 0 ? [ctx.attacker] : [];
    case "lowOther": { const o = allies.filter((u) => u !== src).sort(byHpPct); return o.length ? [o[0]] : []; }
    case "lowDefAlly": return allies.length ? [allies.slice().sort((a, b) => this.eff(a, "def") - this.eff(b, "def"))[0]] : [];
  }
  return [];
};

// apply an effect spec (from an active or a support)
B.apply = function (src, fx, card, ctx) {
  if (fx.nightOnly && this.day) return false;
  if (fx.ifAbove && src.hp / src.maxHp * 100 <= fx.ifAbove) return false;
  if (fx.echoLast) {
    const last = this.side[src.side].lastActive;
    if (!last) return false;
    const copy = Object.assign({}, last.a, { cd: 0 });
    for (const k of ["pow", "heal"]) if (copy[k]) copy[k] = Math.round(copy[k] * fx.echoLast / 100);
    if (copy.shield) copy.shield = [Math.round(copy.shield[0] * fx.echoLast / 100), copy.shield[1]];
    this.emit({ k: "echo", u: src.uid, card: last.id });
    return this.apply(src, copy, last, ctx);
  }
  const list = this.targets(fx.tgt, src, Object.assign({ card }, ctx));
  if (fx.foresight) { this.side[src.side].foresight = (this.side[src.side].foresight || 0) + fx.foresight; this.emit({ k: "st", u: src.uid, st: "evade" }); }
  if (fx.cdDown) for (const u of this.alive(src.side)) u.cd = Math.max(0, u.cd - fx.cdDown);
  if (!list.length) return !!(fx.foresight || fx.cdDown);
  const ty = card ? card.type : null;
  if (fx.pow) {
    const hits = fx.hits || 1;
    for (let i = 0; i < hits; i++) {
      const tg = fx.tgt === "rand" ? this.targets("rand", src)[0] : null;
      const tl = tg ? [tg] : list;
      for (const t of tl) {
        if (!t || t.hp <= 0) continue;
        const d = this.hit(src, t, fx.pow, card, { breakShield: fx.breakShield, drain: fx.drain, trueHit: fx.trueHit, pierce: fx.pierce });
        if (d > 0 && fx.st) this.addStatus(src, t, fx.st, ty);
        if (d > 0 && fx.st2) this.addStatus(src, t, fx.st2, ty);
        if (fx.splash) for (const o of this.alive(this.other(src.side))) if (o !== t && !o.st.hidden) this.hit(src, o, fx.splash, card, {});
        if (d > 0 && fx.teamDrain) { const al = this.alive(src.side), each = Math.round(d * fx.teamDrain / 100 / al.length); for (const a of al) if (each > 0 && a.hp < a.maxHp) { const bf = a.hp; a.hp = Math.min(a.maxHp, a.hp + each); this.emit({ k: "heal", u: a.uid, n: a.hp - bf }); } }
      }
      if (!tg) break;
      if (!this.alive(this.other(src.side)).length) break;
    }
  } else if (fx.st) for (const t of list) { this.addStatus(src, t, fx.st, ty); if (fx.st2) this.addStatus(src, t, fx.st2, ty); }
  if (fx.strip) for (const t of list) { const pos = Object.keys(t.st).filter((k) => !STATUS[k].neg).sort((a, b) => t.st[b].t - t.st[a].t); if (pos.length) { delete t.st[pos[0]]; this.emit({ k: "strip", u: t.uid, st: pos[0] }); } }
  if (fx.cdUp) for (const t of list) if (t.cards.a && t.hp > 0) { t.cd = (t.cd || 0) + fx.cdUp; this.emit({ k: "cdup", u: t.uid, n: fx.cdUp }); }
  if (fx.copyBuff) for (const t of list) for (const k of Object.keys(t.st)) if (!STATUS[k].neg && k !== "hidden" && k !== "taunt") { src.st[k] = Object.assign({}, t.st[k]); this.emit({ k: "st", u: src.uid, st: k }); }
  if (fx.revive) for (const t of list) if (t.hp <= 0) { t.hp = Math.max(1, Math.round(t.maxHp * fx.revive / 100)); this.emit({ k: "revive", u: t.uid, n: t.hp }); }
  if (fx.selfCost) { const c = Math.round(src.maxHp * Math.abs(fx.selfCost) / 100); if (src.hp > c) { src.hp -= c; this.emit({ k: "dmg", u: src.uid, n: c, dot: "cost" }); } }
  if (fx.give) for (const t of list) { const g = Math.min(src.hp - 1, Math.round(src.hp * fx.give / 100)); if (g > 0 && t !== src) { src.hp -= g; const bf = t.hp; t.hp = Math.min(t.maxHp, t.hp + g); this.emit({ k: "heal", u: t.uid, n: t.hp - bf }); } }
  if (fx.heal) for (const t of list) this.heal(src, t, fx.heal);
  if (fx.shield) for (const t of list) this.addShield(src, t, fx.shield[0], fx.shield[1]);
  if (fx.cleanse) for (const t of list) this.cleanse(t, fx.cleanse);
  if (fx.selfSt) this.addStatus(src, src, fx.selfSt, null);
  if (fx.skipNext) src.skip = 1;
  if (fx.selfMaxDown) { src.maxHp = Math.max(1, Math.round(src.maxHp * (1 - Math.abs(fx.selfMaxDown) / 100))); src.hp = Math.min(src.hp, src.maxHp); }
  if (fx.noClockFoes && !this.day) this.side[this.other(src.side)].noClock = true;
  if (card) this.side[src.side].lastType = card.type;
  return true;
};

// fire support cards for an event that happened to `who` (an ally of the support holder)
B.trigger = function (on, who, info) {
  if (this.inTrigger) return; this.inTrigger = true;
  try {
    for (const u of this.alive(who.side)) {
      const c = u.cards.s; if (!c || u.sUsed || c.s.on !== on) continue;
      if (on === "allyStatus" && c.s.status !== info.status) continue;
      if (on === "allyLow" && !(who.hp > 0 && who.hp / who.maxHp < c.s.pct / 100)) continue;
      if (on === "allyKO" && c.s.type && !(info.ko && info.ko.types.includes(c.s.type))) continue;
      u.sUsed = true;
      this.emit({ k: "support", u: u.uid, card: c.id });
      if (c.s.fx) this.apply(u, c.s.fx, c, Object.assign({ ally: who }, info));
    }
  } finally { this.inTrigger = false; }
};
B.start = function () {
  for (const u of this.units) {
    const c = u.cards.s; if (!c || u.hp <= 0 || c.s.on !== "start") continue;
    u.sUsed = true; this.emit({ k: "support", u: u.uid, card: c.id }); this.apply(u, c.s.fx, c, {});
  }
};
B.roundStart = function () {
  this.round++;
  this.emit({ k: "round", n: this.round });
  for (const u of this.units) {
    const c = u.cards.s; if (!c || u.hp <= 0) continue;
    if (c.s.on === "every" && this.round > 1 && (this.round - 1) % c.s.n === 0) { this.emit({ k: "support", u: u.uid, card: c.id }); this.apply(u, c.s.fx, c, {}); }
    if (c.s.on === "round" && this.round === c.s.n && !u.sUsed) { u.sUsed = true; this.emit({ k: "support", u: u.uid, card: c.id }); this.apply(u, c.s.fx, c, {}); }
  }
  const order = this.units.filter((u) => u.hp > 0).map((u) => ({ u, s: this.eff(u, "spd") * (0.95 + this.rnd() * 0.1) }));
  order.sort((a, b) => b.s - a.s);
  return order.map((o) => o.u);
};
// returns false if the unit can't act this turn
B.turnStart = function (u) {
  if (u.hp <= 0) return false;
  if (u.st.burn) { const d = Math.max(1, Math.round(u.maxHp * u.st.burn.v / 100)); u.hp = Math.max(0, u.hp - d); this.emit({ k: "dmg", u: u.uid, n: d, dot: "burn" }); if (u.hp <= 0) { u.st = {}; this.emit({ k: "ko", u: u.uid }); return false; } }
  if (u.st.regen) this.heal(u, u, u.st.regen.v);
  if (u.mods.bleed) { const d = Math.max(1, Math.round(u.maxHp * Math.abs(u.mods.bleed) / 100)); if (u.hp > d) { u.hp -= d; this.emit({ k: "dmg", u: u.uid, n: d, dot: "bleed" }); } }
  if (u.cd > 0) u.cd--;
  if (u.st.stun || u.st.trap) { this.emit({ k: "skip", u: u.uid, why: u.st.stun ? "stun" : "trap" }); this.turnEnd(u); return false; }
  if (u.skip) { u.skip = 0; this.emit({ k: "skip", u: u.uid, why: "tired" }); this.turnEnd(u); return false; }
  return true;
};
B.turnEnd = function (u) {
  for (const k of Object.keys(u.st)) { if (u.st[k].t >= 99) continue; u.st[k].t--; if (u.st[k].t <= 0) delete u.st[k]; }
  if (u.shieldT > 0) { u.shieldT--; if (u.shieldT <= 0) u.shield = 0; }
  this.checkOver();
};
B.canPlay = function (u) { return !!(u.cards.a && u.cd <= 0); };
// would the auto mode use the active card now?
B.wantPlay = function (u) {
  if (!this.canPlay(u)) return false;
  const a = u.cards.a.a;
  if (!a.pow && a.heal && !a.st) {
    const allies = this.alive(u.side);
    const hurt = allies.some((x) => x.hp / x.maxHp < 0.7) || (a.cleanse && allies.some((x) => Object.keys(x.st).some((k) => STATUS[k].neg)));
    return hurt;
  }
  if (!a.pow && a.cleanse && !a.heal) return this.alive(u.side).some((x) => Object.keys(x.st).some((k) => STATUS[k].neg));
  return true;
};
B.act = function (u, useCard) {
  if (this.over || u.hp <= 0) return;
  if (useCard && this.canPlay(u)) {
    const c = u.cards.a;
    this.emit({ k: "act", u: u.uid, card: c.id });
    this.apply(u, c.a, c, {});
    u.cd = c.a.cd;
    if (!c.a.echoLast) this.side[u.side].lastActive = c;
  } else {
    const t = this.targets("foe", u)[0];
    this.emit({ k: "act", u: u.uid, card: null });
    if (t) this.hit(u, t, 80, null, {});
    else this.emit({ k: "lost", u: u.uid });
  }
  this.turnEnd(u);
};
B.checkOver = function () {
  if (this.over) return this.over;
  if (!this.alive("foe").length) this.over = "win";
  else if (!this.alive("ally").length) this.over = "lose";
  return this.over;
};
// synchronous full simulation (used by tests and auto-resolve)
B.runAll = function (maxRounds) {
  this.start();
  while (!this.checkOver() && this.round < (maxRounds || 40)) {
    for (const u of this.roundStart()) {
      if (this.over) break;
      if (!this.turnStart(u)) { this.checkOver(); continue; }
      this.act(u, this.wantPlay(u));
    }
  }
  return this.over || "lose";
};

/* ====================================================================== */
/* Zone: Prado Aurora                                                     */
/* ====================================================================== */
const ZONES = {
  aurora: {
    type: "light", bonus: { light: 10, shadow: -10 }, sections: 4, min: 1, unlock: null, decor: "lanterns",
    foes: ["lumo", "fuellito", "brotin", "lumo"], allies: ["brotin", "remolin", "fuellito", "bostezo", "lumo", "fizz", "pebb", "mecha"],
    boss: "farol", sky: ["#fff0b8", "#ffd57a"], skyN: ["#1f2f5c", "#2f5d96"], ground: "#86b85a", groundN: "#4f8a46",
    events: ["farol", "patrol", "tila", "well"],
  },
  crater: {
    type: "fire", bonus: { fire: 10, water: -10 }, sections: 4, min: 2, unlock: "aurora", decor: "forge",
    foes: ["fuellito", "fuellito", "yunqueron", "mecha"], allies: ["remolin", "brotin", "bostezo", "pebb", "fizz", "lumo", "mecha", "yunqueron"],
    boss: "forja", sky: ["#fff0b8", "#f39a52"], skyN: ["#1d1626", "#5c1f2e"], ground: "#a07a55", groundN: "#3d2a2a",
    events: ["dam", "apprentice", "ola", "well"],
  },
  forest: {
    type: "plant", bonus: { plant: 10, light: -10 }, sections: 4, min: 3, unlock: "aurora", decor: "forest",
    foes: ["brotin", "brotin", "espinardo", "fuellito"], allies: ["fuellito", "remolin", "bostezo", "pebb", "fizz", "lumo", "yunqueron", "espinardo"],
    boss: "seto", sky: ["#c4df7f", "#86b85a"], skyN: ["#1d1626", "#1f3b35"], ground: "#4f8a46", groundN: "#1f3b35",
    events: ["liquen", "vines", "loggers", "well"],
  },
  // the Underside (Envés): the night half of the valley, past the Ford
  hollow: {
    type: "shadow", bonus: { shadow: 10, light: -10 }, sections: 4, min: 4, unlock: ["crater", "forest"], decor: "mist",
    foes: ["nim", "nim", "centinela", "ecolito"], allies: ["lumo", "fuellito", "remolin", "pebb", "bostezo", "mecha", "nim", "ecolito"],
    boss: "trono", sky: ["#d2cbd9", "#6e6283"], skyN: ["#1d1626", "#2e2440"], ground: "#6e6283", groundN: "#2e2440",
    events: ["court", "dig", "whisper"],
  },
  lake: {
    type: "water", bonus: { water: 10, fire: -10 }, sections: 4, min: 5, unlock: ["crater", "forest"], decor: "lake",
    foes: ["remolin", "vidriela", "remolin", "nim"], allies: ["brotin", "fizz", "pebb", "bostezo", "remolin", "vidriela", "nim", "espinardo"],
    boss: "mira", sky: ["#c8eef5", "#7cc8e3"], skyN: ["#1d1626", "#1f2f5c"], ground: "#3f93c4", groundN: "#1f2f5c",
    events: ["orilla", "reflection", "boats"],
  },
  caves: {
    type: "stone", bonus: { stone: 10, air: -10 }, sections: 4, min: 5, unlock: ["crater", "forest"], decor: "caves",
    foes: ["pebb", "ecolito", "pebb", "remolin"], allies: ["remolin", "brotin", "fizz", "bostezo", "yunqueron", "ecolito", "vidriela", "espinardo"],
    boss: "grava", sky: ["#a07a55", "#6b4a3a"], skyN: ["#1d1626", "#3d2a2a"], ground: "#6b4a3a", groundN: "#3d2a2a",
    events: ["gravasong", "tunnels", "miners"],
  },
  // Los Altos (above the Dayside) and the White Deep (under the Underside)
  heights: {
    type: "air", bonus: { air: 10, stone: -10 }, sections: 4, min: 6, unlock: ["hollow", "lake", "caves"], decor: "peaks",
    foes: ["relampin", "trinilla", "fizz", "relampin"], allies: ["lumo", "fizz", "pebb", "fuellito", "remolin", "relampin", "trinilla", "ecolito"],
    boss: "veleta", sky: ["#c8eef5", "#7cc8e3"], skyN: ["#1d1626", "#1f2f5c"], ground: "#9d93ad", groundN: "#4a3d5e",
    events: ["coplo", "news", "pass"],
  },
  deep: {
    type: "mush", bonus: { mush: 10, plant: -10 }, sections: 4, min: 7, unlock: ["hollow", "lake", "caves"], decor: "ice",
    foes: ["carambano", "capuchon", "bostezo", "carambano"], allies: ["fuellito", "brotin", "bostezo", "pebb", "carambano", "capuchon", "guardatumba", "vidriela"],
    boss: "micelio", sky: ["#fbf6ef", "#c8eef5"], skyN: ["#1d1626", "#1f3b35"], ground: "#c8eef5", groundN: "#4a3d5e",
    events: ["esporina", "tomb", "dreams"],
  },
  // the Heart of the Glade: the stump above the single Root, opens once all eight guardians are calm
  heart: {
    type: "star", bonus: {}, sections: 4, min: 8, unlock: ["aurora", "crater", "forest", "hollow", "lake", "caves", "heights", "deep"], unlockAll: true, decor: "heart",
    foes: ["lumo", "fizz", "pebb", "nim", "vidriela", "relampin", "capuchon", "yunqueron", "trinilla", "carambano"], allies: ["lumo", "fizz", "pebb", "fuellito", "remolin", "nim", "trinilla", "vidriela", "capuchon", "relampin"],
    boss: "raiz", sky: ["#fbf6ef", "#d2cbd9"], skyN: ["#1d1626", "#2e2440"], ground: "#a07a55", groundN: "#2e2440",
    events: ["duo", "albor", "cantora"],
  },
};
const EVENTS = ["farol", "patrol", "tila", "well", "dam", "apprentice", "ola", "liquen", "vines", "loggers", "court", "dig", "whisper", "orilla", "reflection", "boats", "gravasong", "tunnels", "miners", "coplo", "news", "pass", "esporina", "tomb", "dreams", "duo", "albor", "cantora"];

const api = { COMPAT, canUse, UPGRADE_N, TYPES, BEATS, OPPOSITE, typeMult, GRADES, rollGrade, STATUS, CARDS, DROP_POOL, scaled, MONS, makeUnit, Battle, lvlScale, xpNeed, SLOT_LVL, ZONES, EVENTS, isDayNow };
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (!root || !root.EV) return;

/* ====================================================================== */
/* ====================  Browser part: UI and text  ===================== */
/* ====================================================================== */
const EV = root.EV;
const $ = EV.$;
const L = () => EV.LANG;
const esc = EV.escapeHtml;

/* ---------- Text ---------- */
const TX = {
  es: {
    "nav.cards": "Cartas", "act.exp": "🗺️ Expedición",
    "exp.need.stage": "Tu criatura podrá salir de expedición cuando sea joven.",
    "exp.need.sleep": "Está dormida. Despiértala para salir.", "exp.need.sick": "Está pachucha. Cúrala antes de salir.",
    "exp.need.energy": "Le falta energía (necesita 30).", "exp.cost": "Cuesta 25 de energía",
    "exp.title": "Prado Aurora", "exp.zoneSub": "Ladera del Día · zona de Luz",
    "exp.zoneDesc": "Hierba dorada y faroles que no se apagan nunca. Últimamente algunos parpadean, y por las raíces sube una savia oscura. Aquí la Luz pega un 10 % más fuerte y la Sombra un 10 % menos.",
    "exp.pick": "Elige dos compañeros salvajes para el viaje", "exp.pickSub": "Te acompañan solo en esta expedición. Mira sus tipos: la Luz pierde contra el Fuego, y el Fuego contra el Agua.",
    "load.title": "Tu mazo para el viaje", "load.sub": "Llevas como máximo 3 cartas, una por hueco. Elige cuál va en cada uno: el mismo efecto cambia según el hueco. Durante la expedición no se puede cambiar.", "load.lock": "Se desbloquea en el nivel {n}",
    "exp.go": "Partir", "exp.cancel": "Volver a casa", "exp.party": "Tu equipo",
    "exp.section": "Tramo {n} de {m}", "exp.choose": "¿Por dónde sigues?", "exp.bossNext": "Al final del camino te espera el guardián. El equipo toma aire antes de acercarse (+30 % de vida).",
    "node.fight": "Combate", "node.event": "Encuentro", "node.chest": "Cofre", "node.rest": "Descanso", "node.boss": "Guardián",
    "node.fight.d": "Criaturas apagadas por la Savia Negra. XP y Chispas.", "node.event.d": "Algo pasa en el camino. Tú decides.",
    "node.chest.d": "Elige una carta de tres.", "node.rest.d": "El equipo recupera un 35 % de vida.", "node.boss.d": "El Gran Farol guarda el prado.",
    "b.round": "Ronda {n}", "b.auto": "Auto", "b.manual": "Manual", "b.speed": "Velocidad",
    "b.yourTurn": "Turno de {name}. ¿Qué hace?", "b.play": "Jugar {card}", "b.basic": "Ataque básico", "b.cd": "lista en {n}",
    "b.noCard": "Sin carta activa",
    "b.win": "¡Victoria!", "b.lose": "El equipo se retira…",
    "log.act": "{name} juega {card}.", "log.basic": "{name} ataca.", "log.dmg": "{name} recibe {n}{crit}{eff}.", "log.crit": " (¡crítico!)",
    "log.up": " · es muy eficaz", "log.opp": " · tipo opuesto", "log.down": " · no es muy eficaz", "b.opp": "Opuesto", "log.miss": "{name} esquiva.", "log.blindMiss": "{name} falla: no ve nada.",
    "log.heal": "{name} recupera {n}.", "log.st": "{name}: {st}.", "log.ko": "{name} cae.", "log.skip.stun": "{name} está aturdido.",
    "log.skip.trap": "{name} está atrapado.", "log.skip.tired": "{name} se toma un respiro.", "log.support": "Soporte de {name}: {card}.",
    "log.shield": "{name} gana un escudo de {n}.", "log.break": "¡Escudo roto!", "log.cleanse": "{name} se libra de {st}.",
    "log.resist": "{name} resiste el estado.", "log.save": "¡Una nube amortigua el golpe!", "log.burn": "{name} se quema: {n}.", "log.thorns": "{name} se pincha con las espinas: {n}.", "log.bleed": "{name} paga su Pacto: {n}.", "log.cost": "{name} gasta {n} de vida.",
    "r.title": "Botín", "r.xp": "+{n} XP", "r.coins": "+{n} Chispas", "r.pick": "Elige una carta", "r.skip": "No quiero ninguna",
    "r.card": "Carta nueva: {card}", "r.continue": "Seguir",
    "end.win": "¡El Gran Farol vuelve a brillar limpio!", "end.winText": "La savia oscura se escurre de su cristal y el prado se ilumina. {name} vuelve a casa orgullosa.",
    "end.lose": "Vuelta a casa", "end.loseText": "El equipo no pudo seguir. {name} se trae la mitad de lo ganado y todas las cartas.",
    "end.hurt": "{name} vuelve con heridas: −{e} de energía y −{h} de salud.", "end.unhurt": "{name} vuelve sin un rasguño.",
    "recharge": "⚡ Recargar energía (+{n}) · {c} Chispas", "recharge.done": "¡Energía recargada!", "recharge.full": "Ya tiene la energía casi llena.",
    "end.quit": "Te retiras", "end.home": "Volver a casa", "end.lvl": "¡{name} sube a nivel {n}!", "end.slot": "Hueco desbloqueado: {slot}",
    "end.lvlPick": "Por subir de nivel, elige una carta", "quit": "Retirarse",
    "slot.a": "Activa", "slot.p": "Pasiva", "slot.s": "Soporte", "slot.lock": "Nivel {n}",
    "cards.title": "Cartas", "cards.lvl": "Nivel {n}", "cards.xp": "{x} / {y} XP", "cards.equip": "Equipar en", "cards.empty": "Hueco vacío",
    "cards.owned": "Tu colección ({n})", "cards.fuse": "Mejorar {n} {a} → 1 {g}", "cards.fused": "¡Mejora! Ahora tienes {card} {g}.",
    "cards.cant": "{name} no puede usar cartas de {type}", "cards.canTypes": "{name} puede usar cartas de: {types}, y las suyas propias.", "cards.copies": "Copias",
    "cards.desc": "Cada carta trae tres efectos; solo funciona el del hueco donde la pongas. Si el tipo de la carta coincide con el de tu criatura, resuena (+15 %).",
    "cards.noCreature": "Ten una criatura joven para usar cartas.", "cards.stats": "Vida {hp} · Fuerza {str} · Defensa {def} · Velocidad {spd} · Crítico {cr} %",
    "sh.title": "Ficha de combate", "sh.sub": "Nivel {n}. Los cuidados de hoy suben o bajan cada valor.", "sh.hp": "Vida", "sh.str": "Fuerza", "sh.def": "Defensa", "sh.spd": "Velocidad", "sh.cr": "Crítico", "sh.dodge": "Esquiva", "sh.by": "por {c}", "sh.need": "Aparece cuando tu criatura sea joven.",
    "cards.unequip": "Quitar", "cards.inUse": "En uso", "cards.mode": "Modo de combate",
    "log.expGo": "{name} sale de expedición {to}.", "log.expWin": "{name} volvió {from} con el guardián en paz.",
    "log.expLose": "{name} volvió {from} un poco magullada.",
    "zones.title": "¿Adónde vas?", "zones.sub": "Expedición", "zones.lock": "Calma al Gran Farol del Prado Aurora para abrir este camino.",
    "zones.lvl": "Nivel recomendado {n}", "zones.done": "Guardián calmado ×{n}", "zones.verse": "Fragmento: «{v}»",
    "end.verse": "Recibes un fragmento del Canto del Claro: «{v}».",
    "end.stars": "Estrellas: {s}", "end.starsWhy": "2 estrellas si el equipo termina con la mitad de la vida o más; 3 si termina con el 75 % y sin nadie derrotado en el combate final.",
    "end.starsNew": "¡Nueva mejor marca en esta zona!", "end.star3": "¡Zona con 3 estrellas! +3 Notas del Canto.", "zones.stars": "Mejor marca: {s}",
    "ach.guard3": ["Ladera en paz", "Calma a los tres guardianes de la Ladera del Día."],
    "ach.exp1": ["Primer paso", "Gana tu primer combate de expedición."], "ach.guard1": ["Luz limpia", "Calma al Gran Farol del Prado Aurora."],
    "ach.cards10": ["Coleccionista", "Reúne 10 cartas."], "ach.fuse1": ["Cinco en una", "Mejora una carta juntando cinco iguales."],
    "ach.grimSol": ["Círculo del Sol", "Descubre en el Grimorio todas las cartas de Fuego, Planta y Luz."], "ach.grimSky": ["Círculo del Cielo", "Descubre todas las cartas de Rayo, Aire y Música."],
    "ach.grimLake": ["Círculo del Lago", "Descubre todas las cartas de Agua, Piedra y Sombra."], "ach.grimFrost": ["Círculo de la Escarcha", "Descubre todas las cartas de Hielo, Seta y Sueño."],
    "ach.grimAll": ["El Grimorio completo", "Descubre todas las cartas del Claro."], "ach.heart1": ["El Canto entero", "Calma a la Raíz Doliente en el Corazón del Claro."], "ach.dust1": ["Polvo de estrella", "Deshaz una copia sobrante en Polvo de estrella."],
    "ctab.col": "Colección", "ctab.grim": "Grimorio", "ctab.shop": "Taller",
    "grim.desc": "Todas las cartas del Claro. Las que aún no has visto aparecen en silueta. Completa un círculo entero para ganar un logro.",
    "grim.count": "{n} de {m} descubiertas", "grim.unknown": "Carta sin descubrir", "grim.boss": "Solo la entrega un guardián.", "grim.by": "La lleva {mon}.",
    "grim.craft": "Crear Común · {c} ∴", "grim.crafted": "¡Has creado {card}!", "grim.circle.sol": "Círculo del Sol", "grim.circle.sky": "Círculo del Cielo", "grim.circle.lake": "Círculo del Lago", "grim.circle.frost": "Círculo de la Escarcha", "grim.circle.star": "Estrella",
    "dust.have": "Polvo de estrella: {n} ∴", "dust.btn": "Deshacer 1 → +{n} ∴", "dust.got": "+{n} Polvo de estrella", "dust.poor": "Te falta Polvo de estrella.",
    "dust.desc": "Deshaz las copias que te sobran (nunca la última ni la que llevas puesta). Cada grado vale 5 veces más: Común 1 ∴, Rara 5 ∴, Súper rara 25 ∴… Con {c} ∴ creas en el Grimorio una carta Común que te falte.",
    "pack.title": "Sobre de cartas", "pack.desc": "Tres cartas al azar, la mitad pensadas para tu criatura. Puedes abrir {m} al día; te quedan {n}.",
    "pack.btn": "Abrir sobre · {c} ✦", "pack.none": "Ya abriste todos los sobres de hoy. Vuelve mañana.", "pack.got": "Del sobre:",
    "foe.hollow": "{name} apagado", "boss.farol": "El Gran Farol", "boss.forja": "La Forja Despierta", "boss.seto": "El Seto Hambriento", "boss.trono": "El Trono Vacío", "boss.mira": "La Que Mira desde Abajo", "boss.grava": "Grava", "boss.veleta": "La Veleta Mayor", "boss.micelio": "La Madre Micelio", "boss.raiz": "La Raíz Doliente",
    "zones.lockEnv": "Calma a un guardián del Cráter o del Bosque para cruzar el Vado hacia el Envés.",
    "zones.lockHigh": "Calma a un guardián del Envés para abrir este camino.", "zones.lockHeart": "Calma a los ocho guardianes para llegar al Corazón.",
    "r.guard": "El guardián te deja una de sus cartas", "grim.story": "Solo la da Unísona.", "end.unisona": "Unísona se queda contigo. Desde ahora puede acompañarte en cualquier expedición, y sus cartas Estrella valen para todas las criaturas.", "end.unisonaUp": "Unísona canta contigo otra vez y te da otra copia de una de sus cartas. Fusiónalas para que suba de rareza.",
    "log.strip": "{name} pierde {st}.", "log.cdup": "La carta de {name} tardará {n} más en estar lista.",
    "ach.guard8": ["El Canto casi entero", "Calma a los ocho guardianes del valle."],
    "log.lost": "{name} no encuentra a nadie en la niebla.", "log.echo": "¡El golpe de {name} resuena otra vez!", "log.revive": "¡{name} se levanta con {n} de vida!",
    "ach.guard6": ["El Envés en calma", "Calma a los tres guardianes del Envés."],
  },
  en: {
    "nav.cards": "Cards", "act.exp": "🗺️ Expedition",
    "exp.need.stage": "Your creature can go on expeditions once it's a kid.",
    "exp.need.sleep": "It's asleep. Wake it up to set out.", "exp.need.sick": "It's unwell. Heal it before setting out.",
    "exp.need.energy": "Not enough energy (needs 30).", "exp.cost": "Costs 25 energy",
    "exp.title": "Aurora Meadow", "exp.zoneSub": "Dayside slope · Light zone",
    "exp.zoneDesc": "Golden grass and lanterns that never go out. Lately a few of them flicker, and a dark sap is creeping up through the roots. Here Light hits 10% harder and Shadow 10% softer.",
    "exp.pick": "Pick two wild companions for the trip", "exp.pickSub": "They only travel with you on this expedition. Check their types: Light loses to Fire, and Fire loses to Water.",
    "load.title": "Your deck for the trip", "load.sub": "You carry up to 3 cards, one per slot. Choose which goes where: the same card does something different in each slot. It can't be changed during the expedition.", "load.lock": "Unlocks at level {n}",
    "exp.go": "Set out", "exp.cancel": "Back home", "exp.party": "Your team",
    "exp.section": "Leg {n} of {m}", "exp.choose": "Which way now?", "exp.bossNext": "The guardian waits at the end of the path. The team catches its breath before going closer (+30% health).",
    "node.fight": "Battle", "node.event": "Encounter", "node.chest": "Chest", "node.rest": "Rest", "node.boss": "Guardian",
    "node.fight.d": "Creatures dimmed by the Black Sap. XP and Chispas.", "node.event.d": "Something happens on the path. You decide.",
    "node.chest.d": "Pick one card out of three.", "node.rest.d": "The team recovers 35% health.", "node.boss.d": "The Great Lantern guards the meadow.",
    "b.round": "Round {n}", "b.auto": "Auto", "b.manual": "Manual", "b.speed": "Speed",
    "b.yourTurn": "{name}'s turn. What does it do?", "b.play": "Play {card}", "b.basic": "Basic attack", "b.cd": "ready in {n}",
    "b.noCard": "No active card",
    "b.win": "Victory!", "b.lose": "The team pulls back…",
    "log.act": "{name} plays {card}.", "log.basic": "{name} attacks.", "log.dmg": "{name} takes {n}{crit}{eff}.", "log.crit": " (critical!)",
    "log.up": " · super effective", "log.opp": " · opposite type", "log.down": " · not very effective", "b.opp": "Opposite", "log.miss": "{name} dodges.", "log.blindMiss": "{name} misses: it can't see.",
    "log.heal": "{name} recovers {n}.", "log.st": "{name}: {st}.", "log.ko": "{name} is down.", "log.skip.stun": "{name} is stunned.",
    "log.skip.trap": "{name} is trapped.", "log.skip.tired": "{name} takes a breather.", "log.support": "{name}'s support: {card}.",
    "log.shield": "{name} gains a {n} shield.", "log.break": "Shield broken!", "log.cleanse": "{name} shakes off {st}.",
    "log.resist": "{name} resists the status.", "log.save": "A cloud cushions the blow!", "log.burn": "{name} burns: {n}.", "log.thorns": "{name} is pricked by thorns: {n}.", "log.bleed": "{name} pays its Pact: {n}.", "log.cost": "{name} spends {n} health.",
    "r.title": "Loot", "r.xp": "+{n} XP", "r.coins": "+{n} Chispas", "r.pick": "Pick a card", "r.skip": "None for me",
    "r.card": "New card: {card}", "r.continue": "Continue",
    "end.win": "The Great Lantern shines clean again!", "end.winText": "The dark sap drains from its glass and the meadow lights up. {name} heads home proud.",
    "end.lose": "Back home", "end.loseText": "The team couldn't go on. {name} brings back half the loot and every card.",
    "end.hurt": "{name} comes back hurt: −{e} energy and −{h} health.", "end.unhurt": "{name} comes back without a scratch.",
    "recharge": "⚡ Recharge energy (+{n}) · {c} Chispas", "recharge.done": "Energy recharged!", "recharge.full": "Its energy is already almost full.",
    "end.quit": "You turn back", "end.home": "Back home", "end.lvl": "{name} reached level {n}!", "end.slot": "Slot unlocked: {slot}",
    "end.lvlPick": "For levelling up, pick a card", "quit": "Turn back",
    "slot.a": "Active", "slot.p": "Passive", "slot.s": "Support", "slot.lock": "Level {n}",
    "cards.title": "Cards", "cards.lvl": "Level {n}", "cards.xp": "{x} / {y} XP", "cards.equip": "Equip as", "cards.empty": "Empty slot",
    "cards.owned": "Your collection ({n})", "cards.fuse": "Upgrade {n} {a} → 1 {g}", "cards.fused": "Upgraded! You now have {card} {g}.",
    "cards.cant": "{name} can't use {type} cards", "cards.canTypes": "{name} can use cards of: {types}, plus its own.", "cards.copies": "Copies",
    "cards.desc": "Each card carries three effects; only the one for the slot you put it in works. If the card's type matches your creature's, it resonates (+15%).",
    "cards.noCreature": "Raise a creature to kid stage to use cards.", "cards.stats": "Health {hp} · Strength {str} · Defence {def} · Speed {spd} · Crit {cr}%",
    "sh.title": "Battle stats", "sh.sub": "Level {n}. Today's care raises or lowers each value.", "sh.hp": "Health", "sh.str": "Strength", "sh.def": "Defence", "sh.spd": "Speed", "sh.cr": "Crit", "sh.dodge": "Dodge", "sh.by": "from {c}", "sh.need": "Shows up once your creature is a kid.",
    "cards.unequip": "Remove", "cards.inUse": "In use", "cards.mode": "Battle mode",
    "log.expGo": "{name} set out {to}.", "log.expWin": "{name} came back {from} with the guardian at peace.",
    "log.expLose": "{name} came back {from} a bit bruised.",
    "zones.title": "Where to?", "zones.sub": "Expedition", "zones.lock": "Calm the Great Lantern of the Aurora Meadow to open this path.",
    "zones.lvl": "Recommended level {n}", "zones.done": "Guardian calmed ×{n}", "zones.verse": "Fragment: “{v}”",
    "end.verse": "You receive a fragment of the Song of the Glade: “{v}”.",
    "end.stars": "Stars: {s}", "end.starsWhy": "2 stars if the team ends with half its health or more; 3 if it ends with 75% and nobody defeated in the final battle.",
    "end.starsNew": "New best in this zone!", "end.star3": "Zone at 3 stars! +3 Song Notes.", "zones.stars": "Best: {s}",
    "ach.guard3": ["Slope at peace", "Calm all three guardians of the Dayside slope."],
    "ach.exp1": ["First step", "Win your first expedition battle."], "ach.guard1": ["Clean light", "Calm the Great Lantern of the Aurora Meadow."],
    "ach.cards10": ["Collector", "Gather 10 cards."], "ach.fuse1": ["Five in one", "Upgrade a card by combining five of the same."],
    "ach.grimSol": ["Circle of the Sun", "Discover every Fire, Plant and Light card in the Grimoire."], "ach.grimSky": ["Circle of the Sky", "Discover every Bolt, Air and Music card."],
    "ach.grimLake": ["Circle of the Lake", "Discover every Water, Stone and Shadow card."], "ach.grimFrost": ["Circle of the Frost", "Discover every Ice, Mushroom and Dream card."],
    "ach.grimAll": ["The full Grimoire", "Discover every card of the Glade."], "ach.heart1": ["The whole Song", "Calm the Aching Root in the Heart of the Glade."], "ach.dust1": ["Stardust", "Break a spare copy into Stardust."],
    "ctab.col": "Collection", "ctab.grim": "Grimoire", "ctab.shop": "Workshop",
    "grim.desc": "Every card of the Glade. The ones you haven't seen yet show as silhouettes. Complete a whole circle to earn an achievement.",
    "grim.count": "{n} of {m} discovered", "grim.unknown": "Undiscovered card", "grim.boss": "Only a guardian gives it.", "grim.by": "Carried by {mon}.",
    "grim.craft": "Make Common · {c} ∴", "grim.crafted": "You made {card}!", "grim.circle.sol": "Circle of the Sun", "grim.circle.sky": "Circle of the Sky", "grim.circle.lake": "Circle of the Lake", "grim.circle.frost": "Circle of the Frost", "grim.circle.star": "Star",
    "dust.have": "Stardust: {n} ∴", "dust.btn": "Break 1 → +{n} ∴", "dust.got": "+{n} Stardust", "dust.poor": "Not enough Stardust.",
    "dust.desc": "Break the copies you don't need (never the last one or the one in use). Each grade is worth 5 times more: Common 1 ∴, Rare 5 ∴, Super rare 25 ∴… With {c} ∴ you can make a Common card you're missing in the Grimoire.",
    "pack.title": "Card pack", "pack.desc": "Three random cards, half of them suited to your creature. You can open {m} a day; {n} left.",
    "pack.btn": "Open pack · {c} ✦", "pack.none": "You've opened all of today's packs. Come back tomorrow.", "pack.got": "From the pack:",
    "foe.hollow": "Dimmed {name}", "boss.farol": "The Great Lantern", "boss.forja": "The Wakeful Forge", "boss.seto": "The Hungry Hedge", "boss.trono": "The Empty Throne", "boss.mira": "She Who Watches from Below", "boss.grava": "Grava", "boss.veleta": "The Great Weathervane", "boss.micelio": "Mother Mycelium", "boss.raiz": "The Aching Root",
    "zones.lockEnv": "Calm a guardian of the Crater or the Wood to cross the Ford to the Underside.",
    "zones.lockHigh": "Calm a guardian of the Underside to open this path.", "zones.lockHeart": "Calm all eight guardians to reach the Heart.",
    "r.guard": "The guardian leaves you one of its cards", "grim.story": "Only Unísona gives it.", "end.unisona": "Unísona stays with you. From now on it can join you on any expedition, and its Star cards work for every creature.", "end.unisonaUp": "Unísona sings with you again and gives you another copy of one of its cards. Fuse them to raise its grade.",
    "log.strip": "{name} loses {st}.", "log.cdup": "{name}'s card will take {n} longer to be ready.",
    "ach.guard8": ["The Song almost whole", "Calm all eight guardians of the valley."],
    "log.lost": "{name} can't find anyone in the fog.", "log.echo": "{name}'s blow rings out again!", "log.revive": "{name} gets back up with {n} health!",
    "ach.guard6": ["Underside at peace", "Calm all three guardians of the Underside."],
  },
};
const ZT = {
  es: {
    aurora: { name: "Prado Aurora", sub: "Ladera del Día · zona de Luz", to: "al Prado Aurora", from: "del Prado Aurora",
      desc: "Hierba dorada y faroles que no se apagan nunca. Últimamente algunos parpadean, y por las raíces sube una savia oscura. Aquí la Luz pega un 10 % más fuerte y la Sombra un 10 % menos.",
      bossD: "El Gran Farol guarda el prado.", win: "¡El Gran Farol vuelve a brillar limpio!",
      winText: "La savia oscura se escurre de su cristal y el prado se ilumina. {name} vuelve a casa orgullosa.", verse: "El verso de la luz que se presta" },
    crater: { name: "Cráter Tibio", sub: "Ladera del Día · zona de Fuego", to: "al Cráter Tibio", from: "del Cráter Tibio",
      desc: "Forjas que trabajan día y noche y aguas termales que ya casi no corren: alguien ha represado el arroyo. Aquí el Fuego pega un 10 % más fuerte y el Agua un 10 % menos.",
      bossD: "La Forja Despierta, el horno que nunca se apaga.", win: "¡La Forja Despierta por fin descansa!",
      winText: "Sus brasas bajan hasta un rojo tranquilo y el cráter respira. {name} vuelve a casa oliendo a carbón.", verse: "El verso del calor que no quema" },
    forest: { name: "Bosque Hondo", sub: "Ladera del Día · zona de Planta", to: "al Bosque Hondo", from: "del Bosque Hondo",
      desc: "Un bosque antiguo rodeado por el Seto, un muro vivo que lo protege. Por dentro, algo empieza a pudrirse. Aquí la Planta pega un 10 % más fuerte y la Luz un 10 % menos.",
      bossD: "El Seto Hambriento cierra el corazón del bosque.", win: "¡El Seto Hambriento afloja sus raíces!",
      winText: "Las espinas se abren y entra luz entre los troncos. {name} vuelve a casa con hojas por todas partes.", verse: "El verso de la raíz que comparte" },
    hollow: { name: "Hondonada Umbría", sub: "El Envés · zona de Sombra", to: "a la Hondonada Umbría", from: "de la Hondonada Umbría",
      desc: "Una hondonada siempre en niebla, donde solo se ve el paso siguiente. Aquí vive el pueblo de la Sombra, que tuvo que dejar sus casas. Aquí la Sombra pega un 10 % más fuerte y la Luz un 10 % menos.",
      bossD: "El Trono Vacío preside una corte sin rey.", win: "¡El Trono Vacío se queda en silencio!",
      winText: "La niebla se abre un poco y, por primera vez, se ve el camino entero. {name} vuelve a casa con niebla en las orejas.", verse: "El verso de la sombra que acompaña" },
    lake: { name: "Lago Espejo", sub: "El Envés · zona de Agua", to: "al Lago Espejo", from: "del Lago Espejo",
      desc: "Un lago tan quieto que refleja cosas que no están. Desde que represaron el arroyo, el agua baja y las barcas se quedan en el barro. Aquí el Agua pega un 10 % más fuerte y el Fuego un 10 % menos.",
      bossD: "La Que Mira desde Abajo vigila desde el fondo.", win: "¡La Que Mira desde Abajo cierra los ojos!",
      winText: "El lago vuelve a reflejar solo lo que hay. {name} vuelve a casa oliendo a lago.", verse: "El verso del agua que recuerda" },
    caves: { name: "Cuevas del Eco", sub: "El Envés · zona de Piedra", to: "a las Cuevas del Eco", from: "de las Cuevas del Eco",
      desc: "Cuevas donde cada palabra vuelve. Los túneles nuevos las están rompiendo, y el eco llega cada vez más débil. Aquí la Piedra pega un 10 % más fuerte y el Aire un 10 % menos.",
      bossD: "Grava, la guardiana de las cuevas, canta con voz de derrumbe.", win: "¡Grava se sienta a descansar!",
      winText: "Grava se derrumba despacio, como una montaña que se sienta. Entre sus piedras hay semillas guardadas con mucho cuidado: guardaba la cura, y tú acabas de vencerla. {name} vuelve a casa en silencio.", verse: "El verso del que repite a todos los demás" },
    heights: { name: "Los Altos", sub: "Las cumbres · zona de Aire", to: "a Los Altos", from: "de Los Altos",
      desc: "Picos y nubes donde viven mensajeros, juglares y meteorólogos. Venden noticias al mejor postor y cierran los pasos cuando les conviene. Aquí el Aire pega un 10 % más fuerte y la Piedra un 10 % menos.",
      bossD: "La Veleta Mayor, un remolino de voces robadas.", win: "¡La Veleta Mayor deja de girar!",
      winText: "Las voces robadas se escapan del remolino y vuelven a sus dueños, cada una por su valle. {name} vuelve a casa con el pelo revuelto por el viento.", verse: "El verso de la voz que no se vende" },
    heart: { name: "Corazón del Claro", sub: "El centro del valle · zona de Estrella", to: "al Corazón del Claro", from: "del Corazón del Claro",
      desc: "El tocón enorme del centro del valle, justo encima de la Raíz. Es lugar de peregrinos y nadie entra. De aquí sube la savia negra. Aquí no hay ventajas de tipo: la Estrella no gana ni pierde contra nadie.",
      bossD: "La Raíz Doliente, de todos los tipos y de ninguno.", win: "¡La Raíz Doliente deja de doler!",
      winText: "Cantas los ocho versos y la Raíz responde con el noveno. La savia negra se aclara y baja despacio hacia todos los valles a la vez. {name} vuelve a casa con Unísona al lado, y el Claro entero suena distinto.", verse: "El verso que solo se canta con los otros ocho" },
    deep: { name: "El Fondo Blanco", sub: "Bajo el Envés · zona de Seta", to: "al Fondo Blanco", from: "del Fondo Blanco",
      desc: "Cavernas heladas bajo el Envés, casi aisladas del resto. La savia derritió el hielo y sus pueblos tuvieron que salir. Aquí la Seta pega un 10 % más fuerte y la Planta un 10 % menos.",
      bossD: "La Madre Micelio duerme sobre la savia.", win: "¡La Madre Micelio despierta tranquila!",
      winText: "Sus hilos blancos sueltan la savia negra poco a poco, y donde caen brotan setas pequeñas. Lo podrido también puede hacer crecer algo. {name} vuelve a casa con esporas en la nariz.", verse: "El verso de lo que crece de lo podrido" },
  },
  en: {
    aurora: { name: "Aurora Meadow", sub: "Dayside slope · Light zone", to: "to the Aurora Meadow", from: "from the Aurora Meadow",
      desc: "Golden grass and lanterns that never go out. Lately a few of them flicker, and a dark sap is creeping up through the roots. Here Light hits 10% harder and Shadow 10% softer.",
      bossD: "The Great Lantern guards the meadow.", win: "The Great Lantern shines clean again!",
      winText: "The dark sap drains from its glass and the meadow lights up. {name} heads home proud.", verse: "The verse of the light that is lent" },
    crater: { name: "Warm Crater", sub: "Dayside slope · Fire zone", to: "to the Warm Crater", from: "from the Warm Crater",
      desc: "Forges that work day and night, and hot springs that barely flow any more: someone has dammed the stream. Here Fire hits 10% harder and Water 10% softer.",
      bossD: "The Wakeful Forge, the furnace that never goes out.", win: "The Wakeful Forge finally rests!",
      winText: "Its embers settle to a calm red and the crater breathes. {name} heads home smelling of coal.", verse: "The verse of the heat that doesn't burn" },
    forest: { name: "Deep Wood", sub: "Dayside slope · Plant zone", to: "to the Deep Wood", from: "from the Deep Wood",
      desc: "An ancient wood ringed by the Hedge, a living wall that protects it. Inside, something is starting to rot. Here Plant hits 10% harder and Light 10% softer.",
      bossD: "The Hungry Hedge closes off the heart of the wood.", win: "The Hungry Hedge loosens its roots!",
      winText: "The thorns part and light falls between the trunks. {name} heads home covered in leaves.", verse: "The verse of the root that shares" },
    hollow: { name: "Gloom Hollow", sub: "The Underside · Shadow zone", to: "to the Gloom Hollow", from: "from the Gloom Hollow",
      desc: "A hollow always in fog, where you can only see the next step. The Shadow folk live here, after they had to leave their homes. Here Shadow hits 10% harder and Light 10% softer.",
      bossD: "The Empty Throne presides over a court with no king.", win: "The Empty Throne falls silent!",
      winText: "The fog parts a little and, for the first time, the whole path can be seen. {name} heads home with fog in its ears.", verse: "The verse of the shadow that keeps you company" },
    lake: { name: "Mirror Lake", sub: "The Underside · Water zone", to: "to Mirror Lake", from: "from Mirror Lake",
      desc: "A lake so still it reflects things that aren't there. Since the stream was dammed the water keeps dropping and boats are left in the mud. Here Water hits 10% harder and Fire 10% softer.",
      bossD: "She Who Watches from Below keeps watch from the bottom.", win: "She Who Watches from Below closes her eyes!",
      winText: "The lake reflects only what's really there again. {name} heads home smelling of lake.", verse: "The verse of the water that remembers" },
    caves: { name: "Echo Caves", sub: "The Underside · Stone zone", to: "to the Echo Caves", from: "from the Echo Caves",
      desc: "Caves where every word comes back. The new tunnels are breaking them, and the echo grows weaker every day. Here Stone hits 10% harder and Air 10% softer.",
      bossD: "Grava, guardian of the caves, sings with a rockfall voice.", win: "Grava sits down to rest!",
      winText: "Grava slowly crumbles, like a mountain sitting down. Among her stones there are seeds, kept with great care: she was keeping the cure, and you just beat her. {name} heads home in silence.", verse: "The verse of the one who repeats all the others" },
    heights: { name: "The Heights", sub: "The peaks · Air zone", to: "to the Heights", from: "from the Heights",
      desc: "Peaks and clouds where messengers, minstrels and weather-watchers live. They sell news to the highest bidder and close the passes when it suits them. Here Air hits 10% harder and Stone 10% softer.",
      bossD: "The Great Weathervane, a whirlwind of stolen voices.", win: "The Great Weathervane stops spinning!",
      winText: "The stolen voices slip out of the whirlwind and go back to their owners, each down its own valley. {name} heads home with wind-tousled fur.", verse: "The verse of the voice that isn't for sale" },
    heart: { name: "Heart of the Glade", sub: "The centre of the valley · Star zone", to: "to the Heart of the Glade", from: "from the Heart of the Glade",
      desc: "The huge stump at the centre of the valley, right above the Root. Pilgrims come here and nobody goes in. The black sap rises from here. There are no type advantages here: Star neither wins nor loses against anyone.",
      bossD: "The Aching Root, of every type and of none.", win: "The Aching Root stops aching!",
      winText: "You sing the eight verses and the Root answers with the ninth. The black sap clears and flows slowly down into every valley at once. {name} heads home with Unísona alongside, and the whole Glade sounds different.", verse: "The verse that is only sung with the other eight" },
    deep: { name: "The White Deep", sub: "Beneath the Underside · Mushroom zone", to: "to the White Deep", from: "from the White Deep",
      desc: "Frozen caverns beneath the Underside, almost cut off from everything. The sap melted the ice and its peoples had to leave. Here Mushroom hits 10% harder and Plant 10% softer.",
      bossD: "Mother Mycelium sleeps on the sap.", win: "Mother Mycelium wakes up calm!",
      winText: "Her white threads let go of the black sap bit by bit, and where it falls, little mushrooms sprout. Rot can make things grow too. {name} heads home with spores up its nose.", verse: "The verse of what grows from rot" },
  },
};
const zt = (k, v, zone) => { let s = ZT[L()][zone || (X && X.zone) || "aurora"][k]; if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => (v[n] != null ? v[n] : m)); return s; };
const tx = (k, v) => { let s = TX[L()][k]; if (s == null) s = TX.en[k]; if (s == null) return k; if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => (v[n] != null ? v[n] : m)); return s; };

const MON_NAMES = {
  unisona: "Unísona", lumo: "Lumo", fizz: "Fizz", pebb: "Pebb", fuellito: "Fuellito", brotin: "Brotín", remolin: "Remolín", bostezo: "Bostezo",
  mecha: "Mecha", yunqueron: "Yunquerón", espinardo: "Espinardo", nim: "Nim", centinela: "Centinela", vidriela: "Vidriela", ecolito: "Ecolito", relampin: "Relampín", trinilla: "Trinilla", carambano: "Carámbano", capuchon: "Capuchón", guardatumba: "Guardatumba",
};
const MON_DESC = {
  es: { unisona: "Criatura Estrella nacida de dos nanas a la vez", raiz: "La Raíz que hay bajo el Claro", lumo: "Chispa juguetona de las Casas del Farol", fizz: "Nube dormilona de los Altos", pebb: "Comilón tozudo de la Hondura", fuellito: "Aprendiz del Gremio de la Brasa", brotin: "Bellota paciente del Bosque Hondo", remolin: "Nutria viajera de las Mareas", bostezo: "Ovejita-polilla del Fondo Blanco", mecha: "Vela con patas del Barrio Apagado", yunqueron: "Tortuga-yunque de la Forja Madre", espinardo: "Erizo de zarza nacido en el Seto", nim: "Murcielaguito del pueblo de la Sombra", centinela: "Guardia del Rey Lóbrego", vidriela: "Pez de cristal del Lago Espejo", ecolito: "Piedra que canta, de las Cuevas del Eco", relampin: "Hurón mensajero de la Aguja del Trueno", trinilla: "Pájaro juglar de la casa del Verso", carambano: "Topo de hielo de la Tumba Helada", capuchon: "Cangrejo ermitaño con una seta por concha", guardatumba: "Gigante de hielo que guarda la Tumba" },
  en: { unisona: "Star creature born of two lullabies at once", raiz: "The Root beneath the Glade", lumo: "Playful spark from the Lantern Houses", fizz: "Sleepy cloud from the Heights", pebb: "Stubborn glutton from the Deep", fuellito: "Apprentice of the Ember Guild", brotin: "Patient acorn from the Deep Wood", remolin: "Wandering otter of the Tides", bostezo: "Woolly moth-lamb from the White Hollow", mecha: "Candle on legs from the Dim Quarter", yunqueron: "Anvil turtle of the Mother Forge", espinardo: "Bramble hedgehog born in the Hedge", nim: "Little bat of the Shadow folk", centinela: "Guard of King Lóbrego", vidriela: "Glass fish of Mirror Lake", ecolito: "Singing stone of the Echo Caves", relampin: "Messenger ferret of the Thunder Spire", trinilla: "Minstrel bird of the House of Verse", carambano: "Ice mole of the Frozen Tomb", capuchon: "Hermit crab with a mushroom for a shell", guardatumba: "Ice giant who guards the Tomb" },
};

/* ---------- Card names, lore and effect text ---------- */
const pc = (n) => n + " %";
const pcE = (n) => n + "%";
const turnsEs = (n) => (n >= 99 ? "todo el combate" : n === 1 ? "1 turno" : n + " turnos");
const turnsEn = (n) => (n >= 99 ? "the whole battle" : n === 1 ? "1 turn" : n + " turns");
const stN = (st) => STATUS[st][L()];
const CT = {
  flash:    { es: ["Destello Travieso", "Una chispa que se escapó del farol y nunca quiso volver."], en: ["Mischief Flash", "A spark that slipped out of its lantern and never wanted to go back."] },
  lantern:  { es: ["Farolillo de Bolsillo", "Cabe en la mano. Alumbra justo lo que necesitas ver."], en: ["Pocket Lantern", "Fits in a hand. Lights exactly what you need to see."] },
  spark:    { es: ["Chispa Prestada", "En las Casas, cada niño recibe una chispa. Algunas se prestan."], en: ["Borrowed Spark", "In the Lantern Houses every child gets a spark. Some get lent."] },
  gust:     { es: ["Ráfaga Dormilona", "Tres soplos medio dormidos. Ninguno sabe adónde va."], en: ["Drowsy Gust", "Three half-asleep puffs. None knows where it's going."] },
  cloud:    { es: ["Nube Mullida", "Las nubes no tienen dueño, pero esta tiene almohada."], en: ["Fluffy Cloud", "Clouds have no owner, but this one has a pillow."] },
  rain:     { es: ["Lluvia Limpia", "Cae despacio y se lleva lo que sobra."], en: ["Clean Rain", "It falls slowly and washes away what doesn't belong."] },
  throw:    { es: ["Pedrada", "En la Hondura una piedra bien lanzada vale por un discurso."], en: ["Stone Toss", "In the Deep, a well-thrown stone is worth a speech."] },
  stubborn: { es: ["Guijarro Terco", "No se mueve. No es que no pueda: es que no quiere."], en: ["Stubborn Pebble", "It won't move. Not that it can't: it just won't."] },
  promise:  { es: ["Promesa de Dos Piedras", "Dos piedras juntas, dos que se cuidan."], en: ["Two-Stone Promise", "Two stones together, two that look after each other."] },
  bellows:  { es: ["Soplo de Fuelle", "Todos empiezan avivando fuelles en el Gremio."], en: ["Bellows Puff", "Everyone in the Guild starts out working the bellows."] },
  bread:    { es: ["Pan de Forja", "Cocido sobre el yunque, todavía caliente."], en: ["Forge Bread", "Baked on the anvil, still warm."] },
  piece:    { es: ["Primera Pieza", "Lo primero que forja un aprendiz nunca sale recto. Se guarda igual."], en: ["First Piece", "An apprentice's first piece is never straight. It's kept anyway."] },
  acorn:    { es: ["Bellotazo", "Pequeña, dura y con mucha paciencia acumulada."], en: ["Acorn Smack", "Small, hard and full of stored-up patience."] },
  rings:    { es: ["Anillo de Paciencia", "En el Bosque Hondo la edad se cuenta por anillos."], en: ["Patience Ring", "In the Deep Wood, age is counted in rings."] },
  seedling: { es: ["Semilla de Saludo", "Se planta al conocer a alguien. Si brota, es amistad."], en: ["Greeting Seed", "Planted when you meet someone. If it sprouts, it's friendship."] },
  whirl:    { es: ["Remolino", "El agua que gira siempre vuelve al mismo sitio."], en: ["Whirlpool", "Water that spins always comes back to the same place."] },
  vessel:   { es: ["La Forma del Vaso", "El agua no pelea con el vaso: toma su forma."], en: ["Shape of the Cup", "Water doesn't fight the cup: it takes its shape."] },
  guest:    { es: ["Agua al Invitado", "En las Mareas, al que llega se le ofrece agua antes que preguntas."], en: ["Water for the Guest", "On the Tides, newcomers get water before questions."] },
  yawn:     { es: ["Bostezo Contagioso", "Nadie ha resistido nunca un bostezo de oveja-polilla."], en: ["Catching Yawn", "Nobody has ever resisted a moth-lamb yawn."] },
  pillow:   { es: ["Almohada", "Lana tibia del Fondo Blanco. Amortigua casi todo."], en: ["Pillow", "Warm wool from the White Hollow. It softens almost anything."] },
  tale:     { es: ["Sueño Contado", "Cada familia cuenta sus sueños al despertar."], en: ["Told Dream", "Every family tells its dreams on waking."] },
  beam:     { es: ["Haz del Umbral", "La luz que marca hasta dónde se puede ir de noche."], en: ["Threshold Beam", "The light that marks how far you may go at night."] },
  pride:    { es: ["Cristal Altivo", "Nunca se ha apagado. Eso pesa."], en: ["Proud Glass", "It has never gone out. That weighs on it."] },
  street:   { es: ["Calle Encendida", "La única calle con luz del Barrio Apagado. Alguien paga el aceite."], en: ["Lit Street", "The only lit street in the Dim Quarter. Someone pays for the oil."] },
  oil:      { es: ["Aceite Robado", "Arde por las dos puntas: una para alumbrar y otra para que nadie pregunte."], en: ["Stolen Oil", "It burns at both ends: one to give light, one so nobody asks."] },
  ration:   { es: ["Ración Mínima", "En el Barrio se reparte poco, pero se reparte."], en: ["Bare Ration", "In the Quarter there's little to share, but it gets shared."] },
  temper:   { es: ["Temple al Rojo", "Cuanto más lo golpean, más duro se vuelve."], en: ["Red-Hot Temper", "The more it's struck, the harder it gets."] },
  anvil:    { es: ["Caparazón de Yunque", "Duerme junto a la Forja Madre desde que era un huevo."], en: ["Anvil Shell", "It has slept beside the Mother Forge since it was an egg."] },
  furnace:  { es: ["Horno que No se Apaga", "Si un día se aleja, la forja se enfriará. Por si acaso, no se aleja."], en: ["Undying Furnace", "If it ever wanders off, the forge will go cold. Just in case, it never does."] },
  inward:   { es: ["Crecer hacia Dentro", "Las púas de dentro nadie las ha visto."], en: ["Growing Inward", "Nobody has ever seen the inner spines."] },
  outward:  { es: ["Crecer hacia Fuera", "Las púas de fuera son verdes. Avisan."], en: ["Growing Outward", "The outer spines are green. They're a warning."] },
  hedge:    { es: ["Ley del Seto", "Lo que está dentro, dentro. Lo que está fuera, fuera."], en: ["Hedge Law", "What's inside stays inside. What's outside stays out."] },
  breath:   { es: ["Aliento de Horno", "El Cráter respira fuego desde que represaron el arroyo."], en: ["Furnace Breath", "The Crater has breathed fire since the stream was dammed."] },
  blow:     { es: ["Golpe de Forja", "Mil faroles. Cada uno, un martillazo."], en: ["Forge Blow", "A thousand lanterns. Each one, a hammer blow."] },
  core:     { es: ["Brasa Madre", "Nunca se ha enfriado. Nadie recuerda por qué."], en: ["Mother Ember", "It has never cooled. Nobody remembers why."] },
  vine:     { es: ["Enredadera Negra", "Sus raíces bajaron tanto que tocaron algo."], en: ["Black Vine", "Its roots went down so far they touched something."] },
  thorn:    { es: ["Muro de Espinos", "Protege el bosque. También lo encierra."], en: ["Thorn Wall", "It protects the wood. It also locks it in."] },
  root:     { es: ["Raíz que Bebe", "Bebe de abajo. Lo que sube no es agua."], en: ["Drinking Root", "It drinks from below. What rises isn't water."] },
  night:    { es: ["Turno de Noche", "«Mamá dijo que volvería cuando dejara de oler a tierra.»"], en: ["Night Shift", "\"Mum said she'd come back when she stopped smelling of earth.\""] },
  nohide:   { es: ["No Esconderse", "Nim se esconde de todo, menos de los que se esconden."], en: ["No Hiding", "Nim hides from everything except those who hide."] },
  truename: { es: ["Nombre Verdadero", "Si dices su nombre verdadero, una sombra deja de ser un hueco."], en: ["True Name", "Say its true name and a shadow stops being a hole."] },
  lance:    { es: ["Lanza de Niebla", "No atraviesa armaduras. Atraviesa excusas."], en: ["Fog Lance", "It doesn't pierce armour. It pierces excuses."] },
  oath:     { es: ["Juramento Susurrado", "Juró proteger al primero de la fila. Nunca dijo qué pasaría después."], en: ["Whispered Oath", "It swore to protect the first in line. It never said what would happen after."] },
  veil:     { es: ["Velo del Rey", "El Rey lo prestaba a quien quería salvar. Ahora lo presta su guardia."], en: ["King's Veil", "The King lent it to those he wanted to save. Now his guard lends it."] },
  lostwave: { es: ["Ola Perdida", "«Mi hermana dijo que escribiría cuando bajara el calor.»"], en: ["Lost Wave", "\"My sister said she'd write when the heat went down.\""] },
  truewater:{ es: ["Agua que No Miente", "En el Lago todo se refleja al revés. Esta agua no."], en: ["Water That Doesn't Lie", "In the Lake everything is reflected backwards. Not this water."] },
  reading:  { es: ["Lectura del Lago", "Vidriela mira el agua y sabe dónde caerá el golpe."], en: ["Lake Reading", "Vidriela looks into the water and knows where the blow will land."] },
  echo:     { es: ["Eco Repetido", "Lo que dices en la cueva vuelve. A veces, más fuerte."], en: ["Repeated Echo", "What you say in the cave comes back. Sometimes louder."] },
  miner:    { es: ["Ningún Minero Atrás", "En la Hondura se sale de dos en dos, o no se sale."], en: ["No Miner Left Behind", "In the Deep you come out in pairs, or not at all."] },
  rockname: { es: ["Nombre en la Roca", "Cada minero graba su nombre. Mientras se lea, nadie lo da por perdido."], en: ["Name in the Rock", "Every miner carves their name. While it can be read, nobody gives them up for lost."] },
  court:    { es: ["Corte de Niebla", "Sillas vacías alrededor de un trono vacío. Aun así, nadie se sienta."], en: ["Fog Court", "Empty chairs around an empty throne. Even so, nobody sits."] },
  crown:    { es: ["Corona sin Rey", "Pesa lo mismo sin una cabeza debajo."], en: ["Kingless Crown", "It weighs the same with no head beneath it."] },
  mirror:   { es: ["Espejo Hondo", "Te enseña lo que fuiste. No lo que eres."], en: ["Deep Mirror", "It shows you what you were. Not what you are."] },
  gaze:     { es: ["Mirada desde Abajo", "Desde el fondo, todo parece pequeño."], en: ["Gaze from Below", "From the bottom, everything looks small."] },
  cavein:   { es: ["Derrumbe", "Grava no empuja las rocas. Las deja caer."], en: ["Cave-in", "Grava doesn't push the rocks. She lets them fall."] },
  song:     { es: ["Canción de Piedra", "La canta a trozos, para que nadie la aprenda entera."], en: ["Stone Song", "She sings it in pieces, so nobody learns it whole."] },
  errand:   { es: ["Recado Urgente", "«Lleva tres noticias a la vez y cobra por las tres. Si una es mentira, no es asunto suyo: él solo corre.»"], en: ["Urgent Errand", "\"He carries three pieces of news at once and charges for all three. If one's a lie, that's not his business: he just runs.\""] },
  static:   { es: ["Electricidad Estática", "Si le tocas el lomo, te enteras de la última noticia. Y te quedas tieso."], en: ["Static Charge", "Touch his back and you'll hear the latest news. And go stiff."] },
  news:     { es: ["Noticia Vendida", "En Los Altos, saber algo antes que nadie vale más que el oro."], en: ["Sold News", "In the Heights, knowing something first is worth more than gold."] },
  highnote: { es: ["Nota Aguda", "«Aprendió a silbar el apellido de cada familia de los Altos. Ahora se los vende al que paga mejor.»"], en: ["High Note", "\"She learned to whistle the surname of every family in the Heights. Now she sells them to whoever pays best.\""] },
  deal:     { es: ["Trato Cantado", "Un trato cantado no se puede romper. Solo desafinar."], en: ["Sung Deal", "A sung deal can't be broken. Only sung out of tune."] },
  chorus:   { es: ["Estribillo", "«La gente no paga por la verdad. Paga por el estribillo.» (Coplo)"], en: ["Refrain", "\"People don't pay for the truth. They pay for the refrain.\" (Coplo)"] },
  frostslow:{ es: ["Escarcha Lenta", "El hielo no tiene prisa. Llega igual."], en: ["Slow Frost", "Ice is in no hurry. It gets there anyway."] },
  tombquiet:{ es: ["Silencio junto a la Tumba", "«Cava túneles alrededor de la Tumba Helada sin hacer ruido, para no despertar a nadie. Este invierno los túneles gotean.»"], en: ["Silence by the Tomb", "\"He digs tunnels around the Frozen Tomb without a sound, so as not to wake anyone. This winter the tunnels drip.\""] },
  vigil:    { es: ["Turno de Vela", "En el Fondo Blanco siempre hay alguien despierto. Por si acaso."], en: ["Night Watch", "In the White Deep there's always someone awake. Just in case."] },
  harvest:  { es: ["Cosecha Negra", "«Su sombrero crece mejor donde la savia es más negra. Esporina dice que es buena señal. Nadie la escucha.»"], en: ["Black Harvest", "\"Its cap grows best where the sap is blackest. Esporina says that's a good sign. Nobody listens to her.\""] },
  stillgrow:{ es: ["Crece sobre lo Quieto", "Las setas no persiguen a nadie. Esperan."], en: ["Grows on the Still", "Mushrooms don't chase anyone. They wait."] },
  saprem:   { es: ["Remedio de Savia", "«Crece sobre lo que te mata. Por eso funciona.» (Esporina)"], en: ["Sap Remedy", "\"It grows on what's killing you. That's why it works.\" (Esporina)"] },
  regent:   { es: ["Golpe del Regente", "Golpea en nombre de alguien a quien nunca ha visto."], en: ["Regent's Blow", "It strikes in the name of someone it has never seen."] },
  thousand: { es: ["Mil Años de Hielo", "«Nadie ha cruzado la puerta de la Tumba. Él tampoco. Nunca se le ocurrió mirar dentro.»"], en: ["A Thousand Years of Ice", "\"Nobody has crossed the Tomb's door. Neither has he. It never occurred to him to look inside.\""] },
  sealed:   { es: ["Puerta Sellada", "Lo que está sellado no se abre. Ni siquiera desde dentro."], en: ["Sealed Door", "What is sealed doesn't open. Not even from inside."] },
  ache:     { es: ["Dolor Antiguo", "Lleva siglos doliendo en silencio. Hoy por fin lo dice."], en: ["Old Ache", "It has ached in silence for centuries. Today it finally says so."] },
  eight:    { es: ["Ocho Voces", "Cada pueblo le cantó algo distinto. Se acuerda de todo."], en: ["Eight Voices", "Every people sang it something different. It remembers all of it."] },
  rootheart:{ es: ["Corazón de Raíz", "Late una vez cada cien años. Hoy ha latido tres."], en: ["Root Heart", "It beats once every hundred years. Today it has beaten three times."] },
  duet:     { es: ["Dueto", "Una nota de luz y otra de sombra. Juntas no se tapan."], en: ["Duet", "One note of light and one of shadow. Together they don't drown each other out."] },
  unison:   { es: ["Al Unísono", "Cuando todos cantan lo mismo, nadie canta solo."], en: ["In Unison", "When everyone sings the same thing, nobody sings alone."] },
  firstnote:{ es: ["La Primera Nota", "La que dio la Primera Cantora antes de partir el Canto."], en: ["The First Note", "The one the First Singer sang before she split the Song."] },
  gale:     { es: ["Vendaval", "Sopla todas las noticias a la vez. Nadie entiende ninguna."], en: ["Gale", "It blows every piece of news at once. Nobody understands any of them."] },
  voices:   { es: ["Voces Robadas", "Cada voz que gira en la Veleta era de alguien que la vendió barata."], en: ["Stolen Voices", "Every voice spinning in the Weathervane belonged to someone who sold it cheap."] },
  spin:     { es: ["Giro sin Fin", "Apunta a donde sopla el viento. Siempre."], en: ["Endless Spin", "It points wherever the wind blows. Always."] },
  spores:   { es: ["Nube de Esporas", "Huele a pan, a tierra y a algo que no debería oler a nada."], en: ["Spore Cloud", "It smells of bread, of earth, and of something that shouldn't smell at all."] },
  threads:  { es: ["Hilos Blancos", "Bajo el hielo, sus hilos llegan más lejos que cualquier túnel."], en: ["White Threads", "Under the ice, her threads reach further than any tunnel."] },
  sapbed:   { es: ["Lecho de Savia", "Duerme sobre la savia, y la savia, por una vez, no hace daño."], en: ["Sap Bed", "She sleeps on the sap, and the sap, for once, does no harm."] },
  law:      { es: ["Ley del Umbral", "Después del ocaso, nadie cruza. Ni siquiera la luz."], en: ["Threshold Law", "After dusk, nobody crosses. Not even light."] },
};
const cardName = (id) => CT[id][L()][0];
const cardLore = (id) => CT[id][L()][1];

function stTextEs(st, who) {
  const [n, tt, ch, v] = st;
  const chance = ch < 1 ? Math.round(ch * 100) + " % de " : "";
  const base = { burn: "Quemar", soak: "Empapar", trap: "Atrapar", stun: "Aturdir", blind: "Cegar", slow: "dejar Lento", dull: "Adormilar", exposed: "quedar Expuesto (no esquiva)", marked: `Señalar (recibe +${v || 20} % de daño)` }[n];
  if (STATUS[n].neg) return `${chance}${base}${who ? " " + who : ""} ${turnsEs(tt)}`;
  const pos = { cheer: "Ánimo", guard: `+${v} % de defensa`, fury: `+${v} % de daño`, might: `+${v} % a sus estadísticas`, regen: `recupera ${v} % por turno`, haste: `+${v} % de velocidad`, cushion: `el próximo golpe le hace ${v} % menos`, hidden: "Escondido (no se le puede apuntar)", charge: `Carga (+${v} % al próximo golpe)`, taunt: "Desafío (atrae los golpes)", evade: `+${v} % de esquiva` }[n];
  return `${pos} ${turnsEs(tt)}`;
}
function stTextEn(st, who) {
  const [n, tt, ch, v] = st;
  const chance = ch < 1 ? Math.round(ch * 100) + "% chance to " : "";
  const base = { burn: "Burn", soak: "Soak", trap: "Trap", stun: "Stun", blind: "Blind", slow: "Slow", dull: "make Drowsy", exposed: "become Exposed (no dodging)", marked: `Mark (takes +${v || 20}% damage)` }[n];
  if (STATUS[n].neg) return `${chance}${ch < 1 ? base.toLowerCase() : base}${who ? " " + who : ""} for ${turnsEn(tt)}`;
  const pos = { cheer: "Cheer", guard: `+${v}% defence`, fury: `+${v}% damage`, might: `+${v}% to all stats`, regen: `recovers ${v}% per turn`, haste: `+${v}% speed`, cushion: `the next hit deals ${v}% less`, hidden: "Hidden (can't be targeted)", charge: `Charged (+${v}% on the next hit)`, taunt: "Taunting (draws hits)", evade: `+${v}% dodge` }[n];
  return `${pos} for ${turnsEn(tt)}`;
}
const TGT = {
  es: { foe: "al enemigo", foes: "a todos los enemigos", rand: "a enemigos al azar", randFoe: "a un enemigo al azar", fastestFoe: "al enemigo más rápido", fireFoe: "al enemigo de Fuego más fuerte", self: "a sí mismo", ally: "al aliado más herido", allyOther: "a un aliado", lowAlly: "al aliado más herido", allies: "a todo el equipo", selfAlly: "a sí mismo y a un aliado", slowAlly: "al aliado más lento", fireAlly: "al aliado de Fuego más fuerte", wildAllies: "a los aliados salvajes", debuffedAlly: "a un aliado", theAlly: "a ese aliado", lowOther: "a otro aliado herido", lowDefAlly: "al aliado con menos defensa", attacker: "al atacante", fallenAlly: "al aliado caído", strongFoe: "del enemigo más fuerte" },
  en: { foe: "the enemy", foes: "all enemies", rand: "random enemies", randFoe: "a random enemy", fastestFoe: "the fastest enemy", fireFoe: "the strongest Fire enemy", self: "itself", ally: "the most hurt ally", allyOther: "an ally", lowAlly: "the most hurt ally", allies: "the whole team", selfAlly: "itself and an ally", slowAlly: "the slowest ally", fireAlly: "the strongest Fire ally", wildAllies: "wild allies", debuffedAlly: "an ally", theAlly: "that ally", lowOther: "another hurt ally", lowDefAlly: "the ally with the least defence", attacker: "the attacker", fallenAlly: "the fallen ally", strongFoe: "the strongest enemy" },
};
function fxText(fx) {
  const es = L() === "es", T = TGT[L()], out = [];
  const tg = T[fx.tgt] || "";
  if (fx.nightOnly) { const r = fxText(Object.assign({}, fx, { nightOnly: 0 })); return (es ? "De noche: " : "At night: ") + r.charAt(0).toLowerCase() + r.slice(1); }
  if (fx.ifAbove) { const r = fxText(Object.assign({}, fx, { ifAbove: 0 })); return (es ? `Si tiene más del ${pc(fx.ifAbove)} de vida: ` : `If above ${pcE(fx.ifAbove)} health: `) + r.charAt(0).toLowerCase() + r.slice(1); }
  if (fx.echoLast) out.push(es ? `repite la última carta Activa del equipo al ${pc(fx.echoLast)}` : `replays the team's last Active card at ${pcE(fx.echoLast)}`);
  if (fx.foresight) out.push(es ? "el próximo golpe contra el equipo falla" : "the next hit against the team misses");
  if (fx.cdUp && !fx.pow) out.push(es ? `las cartas Activas ${tg.replace(/^a /, "de ")} tardan ${fx.cdUp} turno más` : `the Active cards of ${tg} take ${fx.cdUp} more turn`);
  if (fx.cdDown) out.push(es ? `las cartas del equipo se recargan ${fx.cdDown} turno antes` : `the team's cards recharge ${fx.cdDown} turn sooner`);
  if (fx.copyBuff) out.push(es ? `copia en sí misma los estados buenos ${tg}` : `copies the good statuses of ${tg} onto itself`);
  if (fx.revive) out.push(es ? `levanta ${tg} con ${pc(fx.revive)} de vida` : `revives ${tg} with ${pcE(fx.revive)} health`);
  if (fx.noClockFoes) return es ? "Si es de noche, anula el +10 % del Reloj del claro a los enemigos" : "At night, cancels the enemies' +10% Glade Clock bonus";
  if (fx.selfCost) out.push(es ? `gasta ${pc(Math.abs(fx.selfCost))} de su vida` : `spends ${pcE(Math.abs(fx.selfCost))} of its health`);
  if (fx.give) out.push(es ? `le da el ${pc(fx.give)} de su propia vida ${tg}` : `gives ${pcE(fx.give)} of its own health to ${tg}`);
  if (fx.pow) {
    if (fx.hits > 1) out.push(es ? `${fx.hits} golpes de ${pc(fx.pow)} ${tg}` : `${fx.hits} hits of ${pcE(fx.pow)} to ${tg}`);
    else out.push(es ? `${pc(fx.pow)} de daño ${tg}` : `${pcE(fx.pow)} damage to ${tg}`);
    if (fx.st) out.push(es ? stTextEs(fx.st) : stTextEn(fx.st).replace(/^./, (m) => m.toLowerCase()));
    if (fx.breakShield) out.push(es ? "rompe su Escudo" : "breaks its Shield");
    if (fx.trueHit) out.push(es ? "no se puede esquivar" : "can't be dodged");
    if (fx.pierce) out.push(es ? "atraviesa el Escudo" : "goes through Shields");
    if (fx.teamDrain) out.push(es ? `el equipo se cura el ${pc(fx.teamDrain)} del daño, repartido` : `the team heals ${pcE(fx.teamDrain)} of the damage, shared out`);
    if (fx.strip) out.push(es ? "le quita su mejora más larga" : "removes its longest buff");
    if (fx.cdUp) out.push(es ? `su carta Activa tarda ${fx.cdUp} turno${fx.cdUp > 1 ? "s" : ""} más` : `its Active card takes ${fx.cdUp} more turn${fx.cdUp > 1 ? "s" : ""}`);
    if (fx.splash) out.push(es ? `salpica ${pc(fx.splash)} al resto de enemigos` : `splashes ${pcE(fx.splash)} onto the other enemies`);
    if (fx.drain) out.push(es ? `se cura el ${pc(fx.drain)} del daño` : `heals ${pcE(fx.drain)} of the damage`);
  } else if (fx.st) out.push(es ? `${stTextEs(fx.st)} ${STATUS[fx.st[0]].neg ? tg : tg}` : `${stTextEn(fx.st)} (${tg})`);
  if (fx.st2) out.push(es ? `y ${stTextEs(fx.st2).replace(/^./, (m) => m.toLowerCase())}` : `and ${stTextEn(fx.st2).replace(/^./, (m) => m.toLowerCase())}`);
  if (fx.heal) out.push(es ? `cura ${pc(fx.heal)} ${tg}` : `heals ${pcE(fx.heal)} to ${tg}`);
  if (fx.shield) out.push(es ? `Escudo del ${pc(fx.shield[0])} ${tg} ${turnsEs(fx.shield[1])}` : `${pcE(fx.shield[0])} Shield to ${tg} for ${turnsEn(fx.shield[1])}`);
  if (fx.cleanse) {
    const what = fx.cleanse === "all" ? (es ? "todos sus estados negativos" : "all its negative statuses") : fx.cleanse === "one" ? (es ? "un estado negativo" : "one negative status") : fx.cleanse === "longest" ? (es ? "el estado negativo más largo" : "the longest negative status") : stN(fx.cleanse);
    out.push(es ? `quita ${what} ${fx.tgt === "allies" ? "de cada aliado" : ""}`.trim() : `removes ${what}${fx.tgt === "allies" ? " from each ally" : ""}`);
  }
  if (fx.selfSt) out.push(es ? `y gana ${stTextEs(fx.selfSt)}` : `and gains ${stTextEn(fx.selfSt)}`);
  if (fx.skipNext) out.push(es ? "pero pierde su siguiente turno" : "but loses its next turn");
  if (fx.selfMaxDown) out.push(es ? `pero pierde ${pc(Math.abs(fx.selfMaxDown))} de vida máxima este combate` : `but loses ${pcE(Math.abs(fx.selfMaxDown))} max health this battle`);
  let s = out.join(es ? "; " : "; ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function passiveText(p) {
  const es = L() === "es", out = [];
  const sign = (v) => (v > 0 ? "+" : "−") + Math.abs(v);
  const lab = es ? { spd: "velocidad", str: "fuerza", def: "defensa", hp: "vida máxima", crit: "crítico", dodge: "esquiva", dmg: "daño", healRecv: "curación recibida", healGive: "curación que da" }
    : { spd: "speed", str: "strength", def: "defence", hp: "max health", crit: "crit", dodge: "dodge", dmg: "damage", healRecv: "healing received", healGive: "healing given" };
  for (const k of ["hp", "str", "def", "spd", "crit", "dodge", "dmg", "healGive", "healRecv"]) if (p[k]) out.push(es ? `${sign(p[k])} % de ${lab[k]}` : `${sign(p[k])}% ${lab[k]}`);
  if (p.lowFun) out.push(es ? `pero ${p.lowFun} % de crítico si su Diversión baja de 30` : `but ${p.lowFun}% crit if its Fun is under 30`);
  if (p.critSpark) out.push(es ? `cada crítico da +${p.critSpark} % de daño al siguiente aliado que golpee` : `each crit gives +${p.critSpark}% damage to the next ally hit`);
  if (p.stShort) out.push(es ? `sus estados negativos duran ${p.stShort} turno${p.stShort > 1 ? "s" : ""} menos` : `its negative statuses last ${p.stShort} turn${p.stShort > 1 ? "s" : ""} less`);
  if (p.vsShield) out.push(es ? `+${p.vsShield} % de daño contra enemigos con Escudo` : `+${p.vsShield}% damage against shielded enemies`);
  if (p.shieldLong) out.push(es ? `sus Escudos duran ${p.shieldLong} turno${p.shieldLong > 1 ? "s" : ""} más` : `its Shields last ${p.shieldLong} more turn${p.shieldLong > 1 ? "s" : ""}`);
  if (p.onHit) out.push(es ? `sus golpes tienen ${stTextEs(p.onHit)}` : `its hits have a ${stTextEn(p.onHit)}`);
  if (p.firstHit) out.push(es ? `su primer golpe del combate hace +${p.firstHit} %` : `its first hit of the battle deals +${p.firstHit}%`);
  if (p.vsHigher) out.push(es ? `+${p.vsHigher} % de daño contra enemigos con más vida` : `+${p.vsHigher}% damage against enemies with more health`);
  if (p.defRound) out.push(es ? `+${p.defRound} % de defensa por ronda (hasta +${Math.round(15 * p.defRound / 3)} %)` : `+${p.defRound}% defence per round (up to +${Math.round(15 * p.defRound / 3)}%)`);
  if (p.resistAdv) out.push(es ? `recibe ${p.resistAdv} % menos de los tipos con ventaja sobre él` : `takes ${p.resistAdv}% less from types with an edge on it`);
  if (p.onHitBy) out.push(es ? `quien lo golpea tiene ${stTextEs(p.onHitBy)}` : `attackers have a ${stTextEn(p.onHitBy)}`);
  if (p.teamBlindShort) out.push(es ? `en los aliados, Cegado dura ${p.teamBlindShort} turno${p.teamBlindShort > 1 ? "s" : ""} menos` : `on allies, Blind lasts ${p.teamBlindShort} turn${p.teamBlindShort > 1 ? "s" : ""} less`);
  if (p.rage) out.push(es ? `cada golpe que recibe le da +${p.rage} % de daño (hasta 5 veces)` : `each hit it takes gives +${p.rage}% damage (up to 5 times)`);
  if (p.lifesteal) out.push(es ? `roba como vida el ${p.lifesteal} % del daño que hace` : `steals ${p.lifesteal}% of the damage it deals as health`);
  if (p.thorns) out.push(es ? `devuelve el ${p.thorns} % del daño recibido como espinas` : `returns ${p.thorns}% of damage taken as thorns`);
  if (p.defNight) out.push(es ? `${sign(p.defNight)} % de defensa contra tipos de Noche` : `${sign(p.defNight)}% defence against Night types`);
  if (p.defDay) out.push(es ? `${sign(p.defDay)} % contra tipos de Día` : `${sign(p.defDay)}% against Day types`);
  if (p.immune) out.push(es ? `inmune a ${stN(p.immune)}` : `immune to ${stN(p.immune)}`);
  if (p.weakWater) out.push(es ? `pero recibe ${Math.abs(p.weakWater)} % más de daño de Agua` : `but takes ${Math.abs(p.weakWater)}% more damage from Water`);
  if (p.bleed) out.push(es ? `pero pierde ${Math.abs(p.bleed)} % de vida por turno` : `but loses ${Math.abs(p.bleed)}% health per turn`);
  if (p.nightAll) out.push(es ? `+${p.nightAll} % de daño y defensa de noche (de día, la mitad en contra)` : `+${p.nightAll}% damage and defence at night (by day, half of it against)`);
  if (p.shade) out.push(es ? `con más de la mitad de vida, +${p.shade} % de esquiva; con menos, +${p.shade} % de daño` : `above half health, +${p.shade}% dodge; below, +${p.shade}% damage`);
  if (p.vsBlind) out.push(es ? `+${p.vsBlind} % de daño contra enemigos Cegados` : `+${p.vsBlind}% damage against Blinded enemies`);
  if (p.oath) out.push(es ? `+${p.oath} % de daño y defensa mientras el primer aliado siga en pie` : `+${p.oath}% damage and defence while the first ally is standing`);
  if (p.perFallen) out.push(es ? `+${p.perFallen} % de daño por cada aliado caído` : `+${p.perFallen}% damage for each fallen ally`);
  if (p.sight) out.push(es ? `los enemigos esquivan ${p.sight} % menos al equipo` : `enemies dodge the team ${p.sight}% less`);
  if (p.echo) out.push(es ? `${p.echo} % de que su golpe resuene otra vez a la mitad` : `${p.echo}% chance for its hit to ring out again at half power`);
  if (p.desperate) out.push(es ? `+${p.desperate} % de daño si un aliado baja del 30 % de vida` : `+${p.desperate}% damage if an ally drops below 30% health`);
  if (p.stoneDef) out.push(es ? `+${p.stoneDef} % de defensa por cada aliado de Piedra en pie` : `+${p.stoneDef}% defence for each Stone ally standing`);
  if (p.perFoeFallen) out.push(es ? `+${p.perFoeFallen} % de daño por cada enemigo caído` : `+${p.perFoeFallen}% damage for each fallen enemy`);
  if (p.vsHeld) out.push(es ? `+${p.vsHeld} % de daño contra enemigos Aturdidos, Lentos o Atrapados` : `+${p.vsHeld}% damage against Stunned, Slowed or Trapped enemies`);
  if (p.perDebuff) out.push(es ? `+${p.perDebuff} % de daño por cada estado negativo del objetivo` : `+${p.perDebuff}% damage for each negative status on the target`);
  if (p.teamCrit) out.push(es ? `+${p.teamCrit} % de crítico a todo el equipo mientras siga en pie` : `+${p.teamCrit}% crit for the whole team while it's standing`);
  if (p.buffLong) out.push(es ? `las mejoras que pone duran ${p.buffLong} turno${p.buffLong > 1 ? "s" : ""} más` : `the buffs it gives last ${p.buffLong} more turn${p.buffLong > 1 ? "s" : ""}`);
  if (p.frail) out.push(es ? `pero recibe ${Math.abs(p.frail)} % más de daño` : `but takes ${Math.abs(p.frail)}% more damage`);
  if (p.critImmune) out.push(es ? "los críticos contra él hacen daño normal" : "critical hits against it deal normal damage");
  const s = out.join(es ? ", " : ", ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function supportText(s) {
  const es = L() === "es";
  const when = {
    start: es ? "Al empezar" : "At the start",
    every: es ? `Cada ${s.n} rondas` : `Every ${s.n} rounds`,
    round: es ? `Si el combate llega a la ronda ${s.n}` : `If the battle reaches round ${s.n}`,
    allyStatus: es ? `La primera vez que un aliado queda ${s.status ? stN(s.status) : ""}` : `The first time an ally is ${s.status ? stN(s.status) : ""}`,
    allyLow: es ? `Cuando un aliado baja del ${s.pct} % de vida (1 vez)` : `When an ally drops below ${s.pct}% health (once)`,
    allyCrit: es ? "Si un aliado recibe un crítico (1 vez)" : "If an ally takes a crit (once)",
    allyKO: es ? `Si cae un aliado${s.type ? " de " + TYPES[s.type].es : ""} (1 vez)` : `If ${s.type ? "a " + TYPES[s.type].en : "an"} ally falls (once)`,
    foeKO: es ? "Cuando cae un enemigo (1 vez)" : "When an enemy falls (once)",
    allyBigHit: es ? "Cuando un aliado recibe un golpe de más del 25 % de su vida (1 vez)" : "When an ally takes a hit over 25% of its health (once)",
  }[s.on];
  if (s.on === "allyLethal") return es ? "Si un aliado va a caer de un golpe, ese golpe hace la mitad (1 vez)" : "If an ally would fall from one hit, that hit deals half (once)";
  if (s.on === "foeShield") return es ? "Cuando un enemigo se pone Escudo, el siguiente golpe del equipo lo rompe (1 vez)" : "When an enemy gains a Shield, the team's next hit breaks it (once)";
  if (s.on === "allyHitAdv") return es ? `Cuando un aliado recibe un golpe con ventaja de tipo, hace ${s.v} % menos (${s.n} veces)` : `When an ally takes a hit with type advantage, it deals ${s.v}% less (${s.n} times)`;
  if (s.on === "win" && s.revive) return es ? `Tras cada combate ganado en expedición, los aliados caídos se levantan con ${s.revive} % más de vida` : `After each expedition battle won, fallen allies get back up with ${s.revive}% more health`;
  if (s.on === "win") return es ? `Tras cada combate ganado en expedición, el equipo recupera ${s.heal} % de vida` : `After each expedition battle won, the team recovers ${s.heal}% health`;
  return `${when}: ${fxText(s.fx).replace(/^./, (m) => m.toLowerCase())}`;
}
function slotText(sc, slot) {
  if (slot === "p") return passiveText(sc.p);
  if (slot === "a") return fxText(sc.a) + (L() === "es" ? ` (enfr. ${sc.a.cd})` : ` (cd ${sc.a.cd})`);
  return supportText(sc.s);
}
const typeChip = (ty) => `<span class="ty ty-${ty}" title="${esc(TYPES[ty][L()])}">${TYPES[ty].icon} ${esc(TYPES[ty][L()])}</span>`;
const gradeChip = (gi) => `<span class="gr" style="--g:${GRADES[gi].col}">${esc(GRADES[gi][L()])}</span>`;
/* TCG-style card: frame in the type colour, name bar with type gem and cooldown orb,
   pixel-art box, type line with grade pips, effect box, lore, and a set number. */
const TCOL = { fire: "#d9542c", plant: "#4f9a3c", light: "#e2ae2e", bolt: "#d8b81c", air: "#6fb8d0", music: "#cf5f9f", water: "#3f7fc9", stone: "#8a7a64", shadow: "#5b4b8e", ice: "#8fcbe0", mush: "#b0603c", dream: "#8a78d4", star: "#e0b84a" };
const CARD_NO = Object.keys(CARDS);
function tcgArt(by, ty, sil) {
  return `<div class="tcg-art"><canvas class="rc-art" width="120" height="72" data-by="${by || ""}" data-ty="${ty}"${sil ? " data-sil=\"1\"" : ""}></canvas></div>`;
}
function tcgFrame(ty, gi, inner, ghost) {
  const v = gi == null ? { mat: ["#9d93ad", "#d2cbd9"], anim: null } : GRADE_VIS[gi];
  return `<div class="tcg${ghost ? " ghost" : ""}${v.anim ? " m-" + v.anim : ""}" style="--tc:${TCOL[ty]};--m0:${v.mat[0]};--m1:${v.mat[1]};--g:${gi == null ? "#9d93ad" : GRADES[gi].col}">${inner}</div>`;
}
function cardHtml(id, gi, opts) {
  opts = opts || {};
  const sc = scaled(id, gi), C = CARDS[id], ty = C.type;
  const rows = ["a", "p", "s"].map((sl) => `<li class="${opts.slot === sl ? "on" : ""}"><b>${esc(tx("slot." + sl))}</b> ${esc(slotText(sc, sl))}</li>`).join("");
  const by = C.by && MONS[C.by] ? monName(C.by) : "";
  const no = String(CARD_NO.indexOf(id) + 1).padStart(3, "0") + "/" + CARD_NO.length;
  const inner = `<div class="tcg-name"><span class="tcg-gem" title="${esc(TYPES[ty][L()])}">${TYPES[ty].icon}</span><strong>${esc(cardName(id))}</strong>${opts.count > 1 ? `<span class="cnt">×${opts.count}</span>` : ""}<span class="tcg-cd" title="${esc(tx("slot.a"))}">⟳${sc.a.cd}</span></div>
  ${tcgArt(C.by, ty)}
  <div class="tcg-line"><span>${esc(TYPES[ty][L()])}${by ? " · " + esc(by) : ""}${C.boss ? " · 👑" : ""}</span><span class="tcg-pips" title="${esc(GRADES[gi][L()])}">${"◆".repeat(gi + 1)}<i>${"◇".repeat(5 - gi)}</i></span></div>
  <div class="tcg-box"><ul class="rc-fx">${rows}</ul><p class="rc-lore">${esc(cardLore(id))}</p></div>
  <div class="tcg-foot"><span>${esc(GRADES[gi][L()])}</span><span>EV · ${no}</span></div>`;
  return `<div class="rcard">${tcgFrame(ty, gi, inner)}${opts.foot || ""}</div>`;
}
function ghostCardHtml(id, note, foot) {
  const C = CARDS[id], ty = C.type;
  const inner = `<div class="tcg-name"><span class="tcg-gem">${TYPES[ty].icon}</span><strong>???</strong></div>${tcgArt(C.by, ty, true)}<div class="tcg-line"><span>${esc(TYPES[ty][L()])}</span></div><div class="tcg-box"><p class="rc-lore">${esc(note)}</p></div><div class="tcg-foot"><span></span><span>EV · ${String(CARD_NO.indexOf(id) + 1).padStart(3, "0")}/${CARD_NO.length}</span></div>`;
  return `<div class="rcard ghost">${tcgFrame(ty, null, inner, true)}${foot}</div>`;
}
// paint card art boxes whenever cards appear in the page
function paintCardArt(root) {
  (root || document).querySelectorAll("canvas.rc-art:not([data-done])").forEach((cv) => {
    cv.dataset.done = "1";
    const out = EV.setupCanvas(cv, 120, 72), ty = cv.dataset.ty, by = cv.dataset.by, col = TCOL[ty] || "#888";
    const hasPX = typeof PX !== "undefined";
    const Lr = hasPX ? PX.layer(40, 24) : null, c = hasPX ? Lr.g : out;
    if (hasPX) c.scale(1 / 3, 1 / 3);
    // backdrop: pale sky, tinted hills and ground, a few sparkles
    c.fillStyle = "#fbf3e4"; c.fillRect(0, 0, 120, 72);
    c.fillStyle = col; c.globalAlpha = 0.28; c.fillRect(0, 0, 120, 72);
    c.globalAlpha = 0.45; c.beginPath(); c.ellipse(30, 66, 50, 22, 0, 0, Math.PI * 2); c.ellipse(96, 70, 44, 26, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.8; c.fillRect(0, 60, 120, 12); c.globalAlpha = 1;
    c.fillStyle = "#ffffff"; for (const [x, y] of [[12, 9], [104, 15], [84, 6], [26, 27]]) c.fillRect(x, y, 3, 3);
    if (by && (MONS[by] || ["lumo", "fizz", "pebb"].includes(by))) {
      const story = ["lumo", "fizz", "pebb"].includes(by), boss = MONS[by] && MONS[by].boss, k = story ? 0.42 : boss ? 0.46 : 0.66;
      c.save(); c.translate(60, story ? 42 : boss ? 38 : 30); c.scale(k, k);
      if (cv.dataset.sil) { c.globalAlpha = 1; c.filter = "brightness(0)"; }
      try { drawMon(c, by, { t: 0.5, stage: 1, form: "bright", hp: 1 }); } catch (e) { /* art is decoration */ }
      c.restore();
    } else {
      c.font = "28px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(TYPES[ty] ? TYPES[ty].icon : "?", 60, 38);
    }
    if (hasPX) { c.setTransform(1, 0, 0, 1, 0, 0); PX.quantize(c, 40, 24, false); PX.blit(out, Lr, 120, 72); }
  });
}
new MutationObserver(() => paintCardArt()).observe(document.body, { childList: true, subtree: true });

/* ---------- Saved data ---------- */
function rpgState() {
  const S = EV.S, P = EV.P;
  if (!P.cards) P.cards = [];
  if (!P.cardSeq) P.cardSeq = 1;
  if (!P.rpgMode) P.rpgMode = "auto";
  if (!P.c.expWins) P.c.expWins = 0;
  if (!P.c.guard) P.c.guard = 0;
  if (!P.c.fused) P.c.fused = 0;
  if (!P.cleared) P.cleared = P.c.guard ? { aurora: P.c.guard } : {};
  if (!P.grim) { P.grim = {}; for (const c of P.cards) P.grim[c.id] = 1; }
  if (P.dust == null) P.dust = 0;
  if (!S || S.phase !== "alive") return null;
  if (!S.rpg) S.rpg = { lvl: 1, xp: 0, eq: { a: null, p: null, s: null } };
  if (!P.sigGiven) P.sigGiven = {};
  if (!P.sigGiven[S.species] && MONS[S.species]) {
    P.sigGiven[S.species] = 1;
    const sig = MONS[S.species].cards.map((id) => giveCard(id, 0));
    if (!S.rpg.eq.a) S.rpg.eq.a = sig[0].uid;
  }
  // drop equipped uids that no longer exist
  for (const k of ["a", "p", "s"]) if (S.rpg.eq[k] && !P.cards.some((c) => c.uid === S.rpg.eq[k])) S.rpg.eq[k] = null;
  for (const k of ["a", "p", "s"]) { const c = S.rpg.eq[k] && cardByUid(S.rpg.eq[k]); if (c && !canUse(S.species, S.form, c.id)) S.rpg.eq[k] = null; }
  return S.rpg;
}
const usable = (id) => { const S = EV.S; return !S || canUse(S.species, S.form, id); };
function giveCard(id, gi) { const P = EV.P; const c = { uid: "c" + P.cardSeq++, id, g: gi }; P.cards.push(c); (P.grim = P.grim || {})[id] = 1; return c; }
// Stardust: each grade is worth 5 times the one below, like upgrades
const DUST_OF = (gi) => Math.pow(UPGRADE_N, gi), CRAFT_COST = 10, PACK = { price: 60, perDay: 3 };
const GRIM_ORDER = ["fire", "plant", "light", "bolt", "air", "music", "water", "stone", "shadow", "ice", "mush", "dream", "star"];
const grimIds = (types) => Object.keys(CARDS).filter((id) => types.includes(CARDS[id].type));
const grimDone = (p, types) => grimIds(types).every((id) => (p.grim || {})[id]);
const dayKeyNow = () => (EV.DAILY && EV.DAILY.dayKey ? EV.DAILY.dayKey() : new Date().toDateString());
function canTypesText() {
  const S = EV.S; if (!S || !COMPAT[S.species]) return "";
  const ts = COMPAT[S.species].slice();
  const ad = MONS[S.species].adult && S.form && MONS[S.species].adult[S.form];
  if (ad && !ts.includes(ad)) ts.push(ad);
  return tx("cards.canTypes", { name: S.name, types: ts.map((t) => TYPES[t].icon + " " + TYPES[t][L()]).join(", ") });
}
function cantNote(id) {
  const S = EV.S; if (!S || usable(id)) return "";
  return `<p class="rc-cant">🚫 ${esc(tx("cards.cant", { name: S.name, type: TYPES[CARDS[id].type][L()] }))}</p>`;
}
function cardByUid(uid) { return EV.P.cards.find((c) => c.uid === uid); }
function ownUnitOpts(hpPct) {
  const S = EV.S, R = rpgState();
  const cards = {};
  for (const k of ["a", "p", "s"]) { const c = R.eq[k] && cardByUid(R.eq[k]); if (c && R.lvl >= SLOT_LVL[k]) cards[k] = scaled(c.id, c.g); }
  return { kind: S.species, lvl: R.lvl, side: "ally", name: S.name, own: true, care: S.stats, stage: S.stage, form: S.form, cards, hpPct, lowFun: S.stats.fun < 30 };
}
/* Stat sheet: bars are relative to a strong creature of the same level, so they stay readable as levels go up.
   care: own creature only, shows how today's care shifts each stat. */
const SHEET = [["hp", "health", 70], ["str", "full", 70], ["def", "clean", 70], ["spd", "energy", 70]];
function sheetHtml(u, care) {
  const sc = lvlScale(u.lvl);
  const row = (key, val, pct, mod, unit) => `<div class="fstat"><label>${esc(tx("sh." + key))}</label><div class="bar"><i style="width:${Math.max(3, Math.min(100, Math.round(pct)))}%"></i></div><output>${val}${unit || ""}</output><small>${mod}</small></div>`;
  const modTxt = (ck) => {
    if (!care) return "";
    const d = Math.round(50 * (care[ck] || 0) / 100 - 25);
    return `<span class="${d > 0 ? "up" : d < 0 ? "down" : ""}">${d > 0 ? "+" : ""}${d} %</span> ${esc(tx("sh.by", { c: EV.t("stat." + ck).toLowerCase() }))}`;
  };
  let h = SHEET.map(([k, ck, ref]) => {
    const v = k === "hp" ? u.maxHp : Math.round(u.base[k]);
    const raw = k === "hp" ? u.maxHp / 3 : u.base[k];
    return row(k, v, 100 * raw / (ref * sc), modTxt(ck));
  }).join("");
  h += row("cr", Math.round(u.crit), 100 * u.crit / 25, modTxt("fun"), " %");
  h += row("dodge", Math.round(u.dodge), 100 * u.dodge / 4, "", " %");
  return `<div class="sheet">${h}</div>`;
}
function ownSheetHtml() {
  const S = EV.S, R = rpgState();
  if (!S || !R || S.stage < 1) return "";
  return sheetHtml(makeUnit(ownUnitOpts(1)), S.stats);
}
function expCheck() {
  const S = EV.S;
  if (!S || S.phase !== "alive") return "stage";
  if (S.stage < 1) return "stage";
  if (S.sleeping) return "sleep";
  if (S.sick) return "sick";
  if (S.stats.energy < 30) return "energy";
  return null;
}

/* ---------- Styles ---------- */
const css = `
.exp-go { width: 100%; margin-top: 10px; }
.exp-why { font-size: 12px; color: var(--muted); margin: 6px 2px 0; text-align: center; }
.exp { display: flex; flex-direction: column; gap: 12px; }
.exp .panel { gap: 10px; }
.exp h2 { font-family: var(--font-display); font-size: 22px; margin: 0; }
.exp .sub { font: 700 12px var(--font-mono); text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
.exp .lead { margin: 0; color: var(--muted); }
.ty { display: inline-flex; align-items: center; gap: 3px; font: 600 12px var(--font-body); padding: 2px 8px; border-radius: 999px; background: var(--surface-2, var(--bg)); border: 1px solid var(--line); white-space: nowrap; }
.gr { font: 600 11px var(--font-mono); text-transform: uppercase; letter-spacing: .06em; color: var(--g); border: 1px solid var(--g); border-radius: 999px; padding: 1px 7px; white-space: nowrap; }
.mons { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.mon { border: 2px solid var(--line); border-radius: 16px; background: var(--bg); padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; cursor: pointer; font: inherit; color: inherit; }
.mon[aria-pressed="true"] { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
.mon canvas { width: 96px; height: 80px; }
.mon strong { font-family: var(--font-display); font-size: 16px; }
.mon small { color: var(--muted); font-size: 12px; line-height: 1.3; }
.party { display: flex; gap: 8px; flex-wrap: wrap; }
.pm { flex: 1 1 140px; border: 1px solid var(--line); border-radius: 12px; padding: 6px 10px; background: var(--bg); font-size: 13px; }
.pm strong { font-family: var(--font-display); font-size: 15px; display: block; }
.pm .bar { height: 8px; margin-top: 4px; }
.pm.down { opacity: .5; }
.nodes { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.node { border: 2px solid var(--line); border-radius: 16px; background: var(--bg); padding: 12px; text-align: left; cursor: pointer; font: inherit; color: inherit; display: flex; flex-direction: column; gap: 4px; min-height: 96px; }
.node:hover { border-color: var(--accent); }
.node .ic { font-size: 26px; line-height: 1; }
.evd { display: block; width: 16px; height: 16px; margin: 5px; background: #fbf6ef; border: 2px solid #1d1626; transform: rotate(45deg); animation: evd 1.6s steps(2) infinite; }
@keyframes evd { 50% { background: #fff0b8; } }
@media (prefers-reduced-motion: reduce) { .evd { animation: none; } }
.node strong { font-family: var(--font-display); font-size: 17px; }
.node small { color: var(--muted); font-size: 13px; line-height: 1.35; }
.node:disabled { opacity: .55; cursor: not-allowed; }
.node .ok { color: var(--moss); font-weight: 600; }
.node.boss { border-color: color-mix(in srgb, var(--warn) 60%, var(--line)); }
.trail { display: flex; gap: 6px; align-items: center; }
.trail i { flex: 1; height: 6px; border-radius: 3px; background: var(--line); }
.trail i.done { background: var(--moss); }
.trail i.now { background: var(--accent); }
.rc-copies { margin: 6px 0 0; font-size: 12px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.rc-cant { margin: 6px 0 0; font-size: 12px; font-weight: 700; color: var(--bad, #c0392b); }
.bstage { width: 100%; max-width: 620px; margin: 0 auto; position: relative; border-radius: 16px; overflow: hidden; border: 1px solid var(--line); background: #000; }
.bstage canvas { display: block; width: 100%; height: auto; }
.bbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.bbar .grow { flex: 1; }
.blog { list-style: none; margin: 0; padding: 0; font-size: 13px; color: var(--muted); min-height: 5.6em; display: flex; flex-direction: column; gap: 2px; }
.blog li:first-child { color: var(--ink); font-weight: 600; }
.bctl { display: flex; gap: 8px; flex-wrap: wrap; }
.bctl .btn { flex: 1 1 160px; }
.bturn { font-weight: 700; margin: 0; }
.rcards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.rcard { display: flex; flex-direction: column; gap: 6px; }
.tcg { position: relative; background: var(--tc); border: 3px solid #1d1626; padding: 9px; display: flex; flex-direction: column; gap: 5px; box-shadow: 4px 4px 0 #1d1626; color: #1d1626; }
.tcg::before { content: ""; position: absolute; inset: 0; border: 4px solid var(--m0); box-shadow: inset 0 0 0 2px var(--m1), inset 0 0 0 3px #1d1626; pointer-events: none; }
.tcg.m-irid::before { animation: irid 6s ease-in-out infinite; }
@keyframes irid { 0%, 100% { border-color: #f4a6c4; } 33% { border-color: #c7a6ff; } 66% { border-color: #c8eef5; } }
.tcg.m-pulse::before { animation: pulse 2.4s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { box-shadow: inset 0 0 0 2px var(--m1), inset 0 0 0 3px #1d1626; } 50% { box-shadow: inset 0 0 0 2px var(--m1), inset 0 0 0 3px #1d1626, 0 0 10px 2px #ffd57a; } }
@media (prefers-reduced-motion: reduce) { .tcg.m-irid::before, .tcg.m-pulse::before { animation: none; } }
.tcg-name { position: relative; display: flex; align-items: center; gap: 6px; background: #fbf6ef; border: 2px solid #1d1626; padding: 3px 6px; min-height: 32px; }
.tcg-name strong { font-family: var(--font-display); font-size: 15px; line-height: 1.1; flex: 1; min-width: 0; }
.tcg-name .cnt { font: 700 12px var(--font-mono); color: #5b5266; }
.tcg-gem { width: 22px; height: 22px; display: grid; place-items: center; background: var(--tc); border: 2px solid #1d1626; font: 13px/1 system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif; flex: none; }
.tcg-cd { font: 700 12px var(--font-mono); background: #1d1626; color: #fbf6ef; padding: 2px 6px; flex: none; }
.tcg-art { position: relative; border: 2px solid #1d1626; background: #fbf3e4; overflow: hidden; line-height: 0; }
.tcg-art canvas { width: 100%; height: auto; aspect-ratio: 120 / 72; image-rendering: pixelated; display: block; }
.tcg.m-shine .tcg-art::after, .tcg.m-pulse .tcg-art::after { content: ""; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.55) 45%, rgba(255,240,180,.35) 52%, transparent 66%); background-size: 250% 100%; animation: foil 4s linear infinite; mix-blend-mode: screen; pointer-events: none; }
@keyframes foil { from { background-position: 120% 0; } to { background-position: -120% 0; } }
@media (prefers-reduced-motion: reduce) { .tcg.m-shine .tcg-art::after, .tcg.m-pulse .tcg-art::after { animation: none; background-position: 50% 0; } }
.tcg-line { position: relative; display: flex; justify-content: space-between; align-items: center; gap: 6px; background: #1d1626; color: #fbf6ef; padding: 2px 6px; font-size: 12px; font-weight: 700; }
.tcg-pips { color: var(--m1); letter-spacing: 1px; font-size: 11px; } .tcg-pips i { font-style: normal; color: #6e6283; }
.tcg-box { position: relative; background: #fbf6ef; border: 2px solid #1d1626; padding: 6px 7px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
.tcg-box .rc-fx li { color: #4a4255; } .tcg-box .rc-fx li b { color: #1d1626; } .tcg-box .rc-fx li.on { color: #1d1626; background: color-mix(in srgb, var(--tc) 22%, transparent); }
.tcg-box .rc-lore { color: #5b5266; border-top: 1px dashed #b9ad9c; padding-top: 5px; }
.tcg-foot { position: relative; display: flex; justify-content: space-between; font: 700 10px var(--font-mono); color: #1d1626; padding: 0 2px; text-transform: uppercase; letter-spacing: .04em; }
.tcg-foot span:first-child { color: #1d1626; background: var(--m1); border: 1px solid var(--m0); padding: 0 4px; }
.rc-fx { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; font-size: 13px; line-height: 1.35; }
.rc-fx li b { font: 700 11px var(--font-mono); text-transform: uppercase; letter-spacing: .06em; margin-right: 4px; }
.rc-fx li.on { border-radius: 0; padding: 2px 4px; margin: 0 -4px; }
.rc-lore { margin: 0; font-size: 12px; font-style: italic; color: var(--muted); }
.rcard.ghost .tcg { --tc: #b9b1a6 !important; opacity: .8; }
.rcard.ghost .tcg-art { filter: grayscale(1); }
.rc-btns { display: flex; gap: 6px; flex-wrap: wrap; margin-top: auto; }
.ctabs { margin-left: auto; }
.rc-btns .btn { padding: 6px 10px; font-size: 12px; min-height: 34px; }
.slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
.slotbox { border: 1px dashed var(--line); border-radius: 14px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.slotbox > .sub { margin: 0; }
.slotbox .muted { font-size: 13px; margin: 0; }
.slotbox select { font: 600 14px var(--font-body); padding: 8px 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); min-height: 40px; width: 100%; }
.rstats { font: 500 12px var(--font-mono); color: var(--muted); margin: 0; }
.mstats { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 10px; margin-top: 6px; width: 100%; font-size: 12px; text-align: left; }
@media (max-width: 520px) { .mstats { grid-template-columns: 1fr; } }
.mstats span { display: flex; justify-content: space-between; gap: 4px; } .mstats i { font-style: normal; color: var(--muted); } .mstats b { font-variant-numeric: tabular-nums; white-space: nowrap; }
.sheet { display: flex; flex-direction: column; gap: 6px; }
.fstat { display: grid; grid-template-columns: 76px minmax(0, 1fr) 44px 112px; gap: 8px; align-items: center; font-size: 14px; }
.fstat label { font-weight: 700; }
.fstat output { font-family: var(--font-mono); font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; }
.fstat small { font-size: 12px; color: var(--muted); white-space: nowrap; }
.fstat .up { color: #3c8a3a; font-weight: 700; } .fstat .down { color: #c0453a; font-weight: 700; }
@media (max-width: 420px) { .fstat { grid-template-columns: 70px minmax(0, 1fr) 40px; } .fstat small { grid-column: 2 / -1; margin-top: -4px; } }
.xpbar { height: 8px; }
.evt-text { margin: 0; font-size: 15px; line-height: 1.55; }
.evt-out { margin: 0; font-weight: 600; }
.choices { display: flex; flex-direction: column; gap: 8px; }
.choices .btn { text-align: left; justify-content: flex-start; }
.loot { display: flex; gap: 10px; flex-wrap: wrap; font: 600 14px var(--font-mono); }
.loot span { background: var(--bg); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; }
@media (max-width: 520px) { .mons { grid-template-columns: repeat(2, minmax(0, 1fr)); } .rcards { grid-template-columns: minmax(0, 340px); justify-content: center; } }
`;
const styleEl = document.createElement("style"); styleEl.textContent = css; document.head.appendChild(styleEl);

/* ---------- Extra sounds ---------- */
const tone = EV.tone;
Object.assign(EV.SFX, {
  hit: () => tone(180, 0.08, { type: "square", vol: 0.05, slide: -60 }),
  crit: () => { tone(260, 0.06, { type: "square", vol: 0.06 }); tone(520, 0.12, { type: "square", vol: 0.05, delay: 0.05, slide: -200 }); },
  card: () => { tone(660, 0.07, { type: "triangle", vol: 0.06 }); tone(990, 0.12, { type: "triangle", vol: 0.05, delay: 0.06 }); },
  miss: () => tone(900, 0.08, { vol: 0.03, slide: 400 }),
  ko: () => tone(300, 0.35, { type: "sawtooth", vol: 0.035, slide: -220 }),
  win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, { type: "triangle", vol: 0.06, delay: i * 0.09 })); },
});

/* ---------- Achievements ---------- */
EV.ACH.push(["exp1", 15, (p) => (p.c.expWins || 0) >= 1], ["guard1", 40, (p) => ((p.cleared || {}).aurora || 0) >= 1], ["guard3", 60, (p) => ["aurora", "crater", "forest"].every((z) => ((p.cleared || {})[z] || 0) >= 1)], ["guard6", 80, (p) => ["hollow", "lake", "caves"].every((z) => ((p.cleared || {})[z] || 0) >= 1)], ["guard8", 120, (p) => ZONES.heart.unlock.every((z) => ((p.cleared || {})[z] || 0) >= 1)], ["heart1", 200, (p) => ((p.cleared || {}).heart || 0) >= 1], ["cards10", 20, (p) => (p.cards || []).length >= 10], ["fuse1", 15, (p) => (p.c.fused || 0) >= 1],
  ["grimSol", 40, (p) => grimDone(p, ["fire", "plant", "light"])], ["grimSky", 40, (p) => grimDone(p, ["bolt", "air", "music"])],
  ["grimLake", 40, (p) => grimDone(p, ["water", "stone", "shadow"])], ["grimFrost", 40, (p) => grimDone(p, ["ice", "mush", "dream"])],
  ["grimAll", 150, (p) => grimDone(p, GRIM_ORDER)], ["dust1", 10, (p) => (p.c.dusted || 0) >= 1]);
for (const lg of ["es", "en"]) {
  for (const id of ["exp1", "guard1", "guard3", "guard6", "guard8", "cards10", "fuse1", "grimSol", "grimSky", "grimLake", "grimFrost", "grimAll", "dust1", "heart1"]) EV.STR[lg].ach[id] = TX[lg]["ach." + id];
  EV.STR[lg]["nav.cards"] = TX[lg]["nav.cards"];
}
EV.applyStatic();

/* ---------- Drawing other creatures (simple originals) ---------- */
const MONCOL = {
  fuellito: { body: "#e8743b", belly: "#ffd29a", line: "#8a3a17", cheek: "#ffb3a0" },
  brotin:   { body: "#b5814a", belly: "#e8cfa2", line: "#5e3d1c", cheek: "#f0a58a" },
  remolin:  { body: "#5aa6c9", belly: "#d4eef7", line: "#2c5f78", cheek: "#f4a6c4" },
  bostezo:  { body: "#efe7f7", belly: "#ffffff", line: "#7d6c98", cheek: "#f6b5cf" },
  farol:    { body: "#3c3a4a", belly: "#ffe9a6", line: "#1d1b26", cheek: "#f4a6a0" },
  mecha:    { body: "#f3e6c8", belly: "#fff8e6", line: "#8a6e3a", cheek: "#f4a6a0" },
  yunqueron:{ body: "#7c8a6a", belly: "#c9cfa6", line: "#3a4030", cheek: "#e89a7a" },
  espinardo:{ body: "#8a6a4a", belly: "#e0c9a0", line: "#3d2a18", cheek: "#f0a58a" },
  forja:    { body: "#4a3a36", belly: "#ff9a3a", line: "#1e1614", cheek: "#ff7a5a" },
  seto:     { body: "#3f6e36", belly: "#8fbf6a", line: "#1e3a1a", cheek: "#d4a0c0" },
  nim:      { body: "#5b5175", belly: "#a89cc8", line: "#251f33", cheek: "#e0a0c8" },
  centinela:{ body: "#4a4e60", belly: "#9aa0b8", line: "#1e2030", cheek: "#c8a0c0" },
  vidriela: { body: "#8fd0e8", belly: "#e6f8ff", line: "#3a7896", cheek: "#f4b0c8" },
  ecolito:  { body: "#9a8a76", belly: "#d8ccb8", line: "#4a4034", cheek: "#e8a88a" },
  relampin: { body: "#f0c040", belly: "#fff2b8", line: "#7a5a10", cheek: "#ff9a80" },
  trinilla: { body: "#e88aa8", belly: "#ffe0ea", line: "#7a3050", cheek: "#ffb0c8" },
  carambano:{ body: "#7a8aa8", belly: "#d8e8f4", line: "#2e3a50", cheek: "#f0a8c0" },
  capuchon: { body: "#e8a070", belly: "#ffe0c8", line: "#7a3a20", cheek: "#ff9a90" },
  guardatumba:{ body: "#a8d4ec", belly: "#eaf8ff", line: "#3a6a8a", cheek: "#c8b0e0" },
  veleta:   { body: "#8a8090", belly: "#e8e4f0", line: "#3a3440", cheek: "#c0a0c8" },
  micelio:  { body: "#efe6da", belly: "#ffffff", line: "#7a6a5a", cheek: "#e8b0c0" },
  trono:    { body: "#2e2a3a", belly: "#6a6090", line: "#110f18", cheek: "#a080c0" },
  mira:     { body: "#2f5f80", belly: "#a8e0f0", line: "#142c3e", cheek: "#f0a0b8" },
  grava:    { body: "#7a6c5c", belly: "#c8b89a", line: "#352c22", cheek: "#e0a080" },
  raiz:     { body: "#6a4a3a", belly: "#c8a070", line: "#2a1a18", cheek: "#e0a080" },
  unisona:  { body: "#f2c94c", belly: "#4a3f8a", line: "#2a2140", cheek: "#f0a0b8" },
};
function drawMon(c, kind, o) {
  const ell = EV.ell;
  if ((kind === "lumo" || kind === "fizz" || kind === "pebb") && typeof PX !== "undefined") {
    const st = o.stage == null ? 1 : o.stage, n = [12, 16, 20][st];
    const sp = PX.sprite(kind, n, st, Math.floor(o.t * 2) % 2, o.ko ? "sleep" : o.hp < 0.35 ? "sad" : "normal", o.hollow || o.form === "scruffy");
    const w = sp.width * 5, h = sp.height * 5, hover = kind === "fizz" ? 30 : 0;
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= 0.25; c.fillStyle = "#1d1626"; c.fillRect(-w / 2 + 15, 40, w - 30, 5); c.restore();
    c.save(); c.imageSmoothingEnabled = false; c.drawImage(sp, -w / 2, 46 - h - hover, w, h); c.restore();
  } else if (kind === "lumo" || kind === "fizz" || kind === "pebb") {
    EV.drawCreature(c, 0, 0, { kind, stage: o.stage, form: o.hollow ? "scruffy" : o.form, t: o.t, mood: o.hp < 0.35 ? 20 : 60, sleeping: o.ko, sick: false, blink: o.ko, eat: false, jump: 0 });
  } else if (MONCOL[kind]) {
    const col = MONCOL[kind];
    const br = Math.sin(o.t * 3) * 0.03;
    c.save(); c.scale(1 + br, 1 - br);
    c.save(); c.globalAlpha = 0.18; c.fillStyle = "#000"; ell(c, 0, 40, 40, 7); c.fill(); c.restore();
    c.lineWidth = 3; c.strokeStyle = col.line;
    if (kind === "forja") {
      // a squat furnace with a glowing mouth and two little chimneys
      c.fillStyle = col.body; c.beginPath(); c.moveTo(-40, 36); c.lineTo(-34, -40); c.lineTo(34, -40); c.lineTo(40, 36); c.closePath(); c.fill(); c.stroke();
      for (const x of [-20, 18]) { c.fillRect(x - 6, -62, 12, 22); c.strokeRect(x - 6, -62, 12, 22); }
      for (let k = 0; k < 3; k++) { const ph = (o.t * 0.8 + k / 3) % 1; c.globalAlpha = 1 - ph; c.fillStyle = "#ffb347"; c.fillRect(-20 + Math.sin(o.t * 4 + k) * 4, -66 - ph * 26, 3, 3); } c.globalAlpha = 1;
      const glow = 0.7 + Math.sin(o.t * 5) * 0.2;
      c.save(); c.shadowColor = "#ff8a3a"; c.shadowBlur = 24 * glow; c.fillStyle = `rgba(255, 140, 58, ${0.8 + glow * 0.2})`;
      c.beginPath(); c.moveTo(-22, 30); c.lineTo(-22, 6); c.quadraticCurveTo(0, -12, 22, 6); c.lineTo(22, 30); c.closePath(); c.fill(); c.restore();
      c.fillStyle = "#fff1a8"; for (const x of [-12, 12]) { EV.ell(c, x, -18, 5, o.ko ? 1 : 5); c.fill(); }
      c.fillStyle = col.line; for (const x of [-28, 28]) { c.fillRect(x - 5, 36, 10, 8); }
    } else if (kind === "seto") {
      // a wall of hedge with thorns, eyes in the leaves
      c.fillStyle = col.body;
      c.beginPath(); for (const [px, py, r] of [[-34, 10, 22], [-18, -22, 24], [8, -30, 26], [32, -8, 22], [30, 22, 18], [0, 18, 26], [-28, 30, 16]]) { c.moveTo(px + r, py); c.arc(px, py, r, 0, 7); } c.fill(); c.stroke();
      c.fillStyle = col.belly; for (const [px, py] of [[-20, -26], [14, -36], [30, -4], [-34, 8], [6, 22]]) { EV.ell(c, px, py, 6, 4); c.fill(); }
      c.strokeStyle = "#24122e"; c.lineWidth = 2; for (let k = 0; k < 9; k++) { const a = k * 0.7, r = 44; c.beginPath(); c.moveTo(Math.cos(a) * (r - 8), Math.sin(a) * (r - 8) - 4); c.lineTo(Math.cos(a) * r, Math.sin(a) * r - 4); c.stroke(); }
      c.fillStyle = "#ffe27a"; for (const x of [-12, 12]) { EV.ell(c, x, -6, 5, o.ko ? 1 : 6); c.fill(); } c.fillStyle = "#24122e"; for (const x of [-12, 12]) { EV.ell(c, x, -5, 2, o.ko ? 0.5 : 3); c.fill(); }
    } else if (kind === "veleta") {
      // a weathervane on a pole inside a whirlwind of voices
      c.save(); c.strokeStyle = "#c8d0e8"; c.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const r = 26 + k * 9, a0 = o.t * (2 - k * 0.3) + k; c.globalAlpha = 0.55 - k * 0.1; c.beginPath(); c.ellipse(0, 4 - k * 8, r, r * 0.35, 0, a0, a0 + 4.2); c.stroke(); }
      c.restore();
      c.strokeStyle = col.line; c.lineWidth = 3; c.fillStyle = col.body; c.fillRect(-3, -60, 6, 100); c.strokeRect(-3, -60, 6, 100);
      c.save(); c.translate(0, -62); c.rotate(o.ko ? 0.6 : Math.sin(o.t * 1.4) * 0.6);
      c.beginPath(); c.moveTo(-36, 0); c.lineTo(26, 0); c.lineTo(26, -6); c.lineTo(40, 0); c.lineTo(26, 6); c.lineTo(26, 0); c.stroke();
      c.fillStyle = "#c0a040"; c.beginPath(); c.moveTo(-36, 0); c.lineTo(-22, -12); c.lineTo(-22, 12); c.closePath(); c.fill(); c.stroke(); c.restore();
      c.fillStyle = "#c0a040"; EV.ell(c, 0, -62, 6, 6); c.fill();
      c.fillStyle = col.belly; for (const x of [-10, 10]) { EV.ell(c, x, -20, 5, o.ko ? 1 : 6); c.fill(); }
      c.fillStyle = "#3a3440"; c.font = "700 14px system-ui"; c.textAlign = "center"; c.globalAlpha = 0.6; for (let k = 0; k < 3; k++) c.fillText("♪", Math.cos(o.t * 2 + k * 2.1) * 34, -10 + Math.sin(o.t * 2 + k * 2.1) * 10); c.globalAlpha = 1;
    } else if (kind === "raiz") {
      // the Root under the Glade: a stump of rings, eight eyes in the eight colours, dripping sap
      const ec = ["#d9542c", "#4f9a3c", "#e2ae2e", "#6fb8d0", "#3f7fc9", "#a08a6a", "#8a78d4", "#b0603c"];
      c.fillStyle = SAP.c1; EV.ell(c, 0, 36, 62, 10); c.fill();
      c.fillStyle = col.body;
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 22, 28); c.quadraticCurveTo(sx * 52, 28, sx * 64, 40); c.lineTo(sx * 46, 40); c.quadraticCurveTo(sx * 34, 36, sx * 18, 36); c.closePath(); c.fill(); c.stroke(); }
      c.beginPath(); c.moveTo(-38, 36); c.lineTo(-44, -40); c.quadraticCurveTo(0, -54, 44, -40); c.lineTo(38, 36); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = col.belly; EV.ell(c, 0, -42, 42, 10); c.fill(); c.stroke();
      c.lineWidth = 1.5; for (const r of [30, 19, 8]) { EV.ell(c, 0, -42, r, r * 0.24); c.stroke(); }
      for (let k = 0; k < 8; k++) { const x = -27 + (k % 4) * 18, y = -18 + Math.floor(k / 4) * 22; c.save(); c.globalAlpha = o.ko ? 0.3 : 0.65 + 0.35 * Math.sin(o.t * 2 + k); c.fillStyle = ec[k]; EV.ell(c, x, y, 5, o.ko ? 1 : 4); c.fill(); c.restore(); }
      for (let k = 0; k < 4; k++) { const ph = (Math.floor(o.t * 6) / 12 + k / 4) % 1; c.fillStyle = SAP.c0; c.fillRect(-31 + k * 20, 30 - ph * 60, 3, 6); c.fillStyle = SAP.sheen; c.fillRect(-31 + k * 20, 30 - ph * 60, 1, 1); }
    } else if (kind === "unisona") {
      // half dawn, half night: a round body split down the middle, a star crest and small wings
      const fl = Math.sin(o.t * 5) * 5;
      c.fillStyle = "#f6e6a8"; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 24, -4); c.quadraticCurveTo(sx * 52, -26 + fl, sx * 46, 8); c.closePath(); c.fill(); c.stroke(); }
      c.save(); ell(c, 0, 6, 32, 32); c.clip(); c.fillStyle = col.body; c.fillRect(-40, -30, 40, 80); c.fillStyle = col.belly; c.fillRect(0, -30, 40, 80); c.restore();
      ell(c, 0, 6, 32, 32); c.stroke();
      c.fillStyle = "#fff4c0"; c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 6 : 14, a = -Math.PI / 2 + k * Math.PI / 5; c.lineTo(Math.cos(a) * r, -30 + Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
      c.fillStyle = "#1d1626"; ell(c, -11, 2, 4, o.ko ? 1 : 5); c.fill(); c.fillStyle = "#fff4c0"; ell(c, 11, 2, 4, o.ko ? 1 : 5); c.fill();
      c.fillStyle = col.cheek; ell(c, -19, 13, 4, 3); c.fill(); ell(c, 19, 13, 4, 3); c.fill();
      c.save(); c.globalAlpha = 0.6; c.fillStyle = "#fff4c0"; c.font = "700 12px system-ui"; c.textAlign = "center"; c.fillText("♪", Math.cos(o.t * 2) * 42, -20 + Math.sin(o.t * 2) * 8); c.restore();
    } else if (kind === "micelio") {
      // a great pale mushroom mother sleeping on dark sap
      c.fillStyle = SAP.c1; EV.ell(c, 0, 34, 54, 10); c.fill();
      c.strokeStyle = "#f4efe6"; c.lineWidth = 2; for (let k = 0; k < 7; k++) { const a = Math.PI * (0.1 + k * 0.13); c.beginPath(); c.moveTo(0, 30); c.quadraticCurveTo(Math.cos(a) * 30, 40, Math.cos(a) * 56, 36 + Math.sin(o.t + k) * 2); c.stroke(); }
      c.strokeStyle = col.line; c.lineWidth = 3; c.fillStyle = col.belly; c.fillRect(-14, -14, 28, 46); c.strokeRect(-14, -14, 28, 46);
      c.fillStyle = col.body; c.beginPath(); c.moveTo(-56, -10); c.quadraticCurveTo(-50, -70, 0, -72); c.quadraticCurveTo(50, -70, 56, -10); c.quadraticCurveTo(0, -24, -56, -10); c.fill(); c.stroke();
      c.fillStyle = "#c8a0d8"; for (const [px, py, r] of [[-30, -40, 7], [4, -58, 8], [30, -36, 6], [-8, -34, 5]]) { EV.ell(c, px, py, r, r * 0.8); c.fill(); }
      c.strokeStyle = "#2a2230"; c.lineWidth = 2.4; for (const x of [-7, 7]) { c.beginPath(); c.arc(x, 4, 4, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
      c.save(); c.globalAlpha = 0.5; c.fillStyle = "#ffffff"; for (let k = 0; k < 5; k++) { const ph = (o.t * 0.3 + k / 5) % 1; EV.ell(c, -40 + k * 20, -60 - ph * 30, 2, 2); c.fill(); } c.restore();
    } else if (kind === "guardatumba") {
      // an ice giant: blocky shoulders, a crown of icicles, a frozen club
      c.save(); c.globalAlpha = 0.9;
      c.fillStyle = col.body; c.beginPath(); c.moveTo(-34, 36); c.lineTo(-44, -20); c.lineTo(-24, -40); c.lineTo(24, -40); c.lineTo(44, -20); c.lineTo(34, 36); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = col.belly; c.beginPath(); c.moveTo(-18, 30); c.lineTo(-24, -10); c.lineTo(24, -10); c.lineTo(18, 30); c.closePath(); c.fill();
      c.fillStyle = "#e8f8ff"; for (const x of [-18, -6, 6, 18]) { c.beginPath(); c.moveTo(x - 5, -40); c.lineTo(x, -54 - (x === -6 || x === 6 ? 6 : 0)); c.lineTo(x + 5, -40); c.closePath(); c.fill(); c.stroke(); }
      c.fillStyle = "#7ab4d4"; c.fillRect(42, -30, 10, 56); c.strokeRect(42, -30, 10, 56);
      c.restore();
      c.fillStyle = "#1e3a50"; for (const x of [-10, 10]) { EV.ell(c, x, -24, 4, o.ko ? 1 : 4); c.fill(); }
      c.fillStyle = col.body; for (const x of [-20, 20]) { c.fillRect(x - 8, 34, 16, 8); }
    } else if (kind === "trono") {
      // an empty throne in the fog, with two eyes where the king should sit
      c.fillStyle = col.body; c.fillRect(-30, -74, 60, 84); c.strokeRect(-30, -74, 60, 84);
      for (const x of [-30, 22]) { c.fillRect(x, -88, 8, 16); }
      c.fillRect(-42, 0, 84, 16); c.strokeRect(-42, 0, 84, 16);
      for (const x of [-38, 30]) { c.fillRect(x, 16, 8, 22); }
      c.fillStyle = col.belly; c.fillRect(-20, -62, 40, 58);
      c.save(); c.globalAlpha = 0.35 + Math.sin(o.t * 2) * 0.1; c.fillStyle = "#d8d4e8"; for (let k = 0; k < 3; k++) { EV.ell(c, Math.sin(o.t + k * 2) * 20, -30 + k * 20, 34, 6); c.fill(); } c.restore();
      c.fillStyle = "#e8e0ff"; for (const x of [-9, 9]) { EV.ell(c, x, -38, 4, o.ko ? 1 : 5); c.fill(); }
      c.fillStyle = "#c0a040"; c.beginPath(); c.moveTo(-14, -74); c.lineTo(-8, -84); c.lineTo(0, -76); c.lineTo(8, -84); c.lineTo(14, -74); c.closePath(); c.fill();
    } else if (kind === "mira") {
      // a huge eye under a water surface
      c.fillStyle = col.body; c.beginPath(); c.moveTo(-50, 36); c.quadraticCurveTo(-56, -20, 0, -40); c.quadraticCurveTo(56, -20, 50, 36); c.closePath(); c.fill(); c.stroke();
      c.save(); c.globalAlpha = 0.5; c.strokeStyle = "#e0f6ff"; c.lineWidth = 2; for (let k = 0; k < 3; k++) { const y = -30 + k * 6 + Math.sin(o.t * 2 + k) * 2; c.beginPath(); c.moveTo(-40 + k * 6, y); c.quadraticCurveTo(0, y - 6, 40 - k * 6, y); c.stroke(); } c.restore();
      c.fillStyle = "#f4fbff"; EV.ell(c, 0, 2, 26, o.ko ? 2 : 17); c.fill(); c.stroke();
      if (!o.ko) { const lx = Math.sin(o.t * 0.9) * 8; c.fillStyle = "#3a8ab0"; EV.ell(c, lx, 2, 11, 11); c.fill(); c.fillStyle = "#0e1a24"; EV.ell(c, lx, 2, 5, 7); c.fill(); c.fillStyle = "#fff"; EV.ell(c, lx - 3, -2, 2, 2); c.fill(); }
      c.fillStyle = col.belly; for (const [px, py] of [[-36, 24], [34, 20], [-20, 30], [22, 32]]) { EV.ell(c, px, py, 4, 3); c.fill(); }
    } else if (kind === "grava") {
      // a mountain of stones that sings; a crack glows where her mouth is
      c.fillStyle = col.body; c.beginPath(); c.moveTo(-50, 38); c.lineTo(-38, -10); c.lineTo(-18, -44); c.lineTo(6, -52); c.lineTo(30, -30); c.lineTo(48, 4); c.lineTo(52, 38); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = col.belly; for (const [px, py, r] of [[-26, 10, 10], [18, -14, 9], [30, 20, 8], [-8, -30, 7]]) { EV.ell(c, px, py, r, r * 0.7); c.fill(); }
      c.fillStyle = "#7ad0c8"; c.beginPath(); c.moveTo(-4, -52); c.lineTo(4, -70); c.lineTo(12, -50); c.closePath(); c.fill();
      c.fillStyle = "#2a2018"; for (const x of [-12, 10]) { EV.ell(c, x, -14, 4, o.ko ? 1 : 5); c.fill(); }
      const op = 0.5 + Math.sin(o.t * 3) * 0.3; c.save(); c.globalAlpha = o.ko ? 0.1 : op; c.fillStyle = "#ffe0a0"; c.fillRect(-12, 4, 24, 4); c.restore();
    } else if (kind === "farol") {
      // a great lantern on legs
      c.fillStyle = col.body; c.fillRect(-6, -78, 12, 14);
      c.beginPath(); c.moveTo(-34, -64); c.lineTo(34, -64); c.lineTo(26, -54); c.lineTo(-26, -54); c.closePath(); c.fill(); c.stroke();
      const glow = 0.6 + Math.sin(o.t * 4) * 0.2;
      c.save(); c.shadowColor = "#ffd35a"; c.shadowBlur = 30 * glow;
      c.fillStyle = `rgba(255, 226, 122, ${0.75 + glow * 0.25})`; c.beginPath(); c.moveTo(-26, -54); c.lineTo(26, -54); c.lineTo(32, 20); c.lineTo(-32, 20); c.closePath(); c.fill(); c.restore();
      c.stroke();
      c.fillStyle = col.body; for (const x of [-12, 12]) c.fillRect(x - 2, -54, 4, 74);
      c.beginPath(); c.moveTo(-36, 20); c.lineTo(36, 20); c.lineTo(30, 30); c.lineTo(-30, 30); c.closePath(); c.fill(); c.stroke();
      for (const x of [-20, 20]) { c.fillRect(x - 4, 30, 8, 12); }
      // eyes inside the glass
      c.fillStyle = "#3a2a10"; for (const x of [-10, 10]) { ell(c, x, -18, 5, o.ko ? 1 : 6); c.fill(); }
    } else {
      // round body
      const g = c.createRadialGradient(-14, -18, 6, 0, 0, 60); g.addColorStop(0, col.belly); g.addColorStop(0.45, col.body); g.addColorStop(1, col.body);
      c.fillStyle = g;
      if (kind === "mecha") {
        // a candle body with a flame on top
        c.beginPath(); c.moveTo(-26, 36); c.lineTo(-26, -24); c.quadraticCurveTo(0, -34, 26, -24); c.lineTo(26, 36); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = col.belly; for (const [px, py] of [[-18, -18], [14, -20]]) { EV.ell(c, px, py + 6, 4, 9); c.fill(); }
        c.strokeStyle = col.line; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, -40); c.stroke();
        const fl = Math.sin(o.t * 10) * 2;
        c.save(); c.shadowColor = "#ffd35a"; c.shadowBlur = 16; c.fillStyle = o.hollow ? "#8a7ab0" : "#ffcf4a"; c.beginPath(); c.moveTo(0, -60 + fl); c.quadraticCurveTo(10, -46, 0, -40); c.quadraticCurveTo(-10, -46, 0, -60 + fl); c.fill(); c.restore();
      } else if (kind === "yunqueron") {
        // turtle with an anvil shell
        ell(c, 0, 8, 40, 28); c.fill(); c.stroke();
        c.fillStyle = "#5a5f66"; c.strokeStyle = "#2a2d32"; c.beginPath(); c.moveTo(-34, -6); c.lineTo(34, -6); c.lineTo(40, -22); c.lineTo(-40, -22); c.closePath(); c.fill(); c.stroke();
        c.fillRect(-12, -34, 24, 12); c.strokeRect(-12, -34, 24, 12);
        c.save(); c.globalAlpha = 0.5 + Math.sin(o.t * 3) * 0.2; c.fillStyle = "#ff8a3a"; c.fillRect(-30, -20, 60, 3); c.restore();
        c.fillStyle = col.body; c.strokeStyle = col.line; ell(c, 40, 4, 12, 10); c.fill(); c.stroke();
      } else if (kind === "espinardo") {
        // hedgehog with bramble spines
        c.strokeStyle = "#3e6e2c"; c.lineWidth = 3; for (let k = 0; k < 11; k++) { const a = Math.PI * (1.05 + k * 0.09); c.beginPath(); c.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); c.lineTo(Math.cos(a) * 50, Math.sin(a) * 50); c.stroke(); }
        c.fillStyle = "#c0392b"; for (const k of [2, 6, 9]) { const a = Math.PI * (1.05 + k * 0.09); EV.ell(c, Math.cos(a) * 50, Math.sin(a) * 50, 3, 3); c.fill(); }
        c.strokeStyle = col.line; c.lineWidth = 3; c.fillStyle = g; ell(c, 0, 4, 38, 34); c.fill(); c.stroke(); c.fillStyle = col.belly; ell(c, 0, 16, 22, 16); c.fill();
      } else if (kind === "nim") {
        // a little bat: pointed ears and folded wings
        c.fillStyle = col.body; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 10, -24); c.lineTo(sx * 22, -50); c.lineTo(sx * 28, -20); c.closePath(); c.fill(); c.stroke(); }
        const fl = Math.sin(o.t * 6) * 6;
        for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 26, -6); c.quadraticCurveTo(sx * 56, -22 + fl, sx * 58, 10); c.quadraticCurveTo(sx * 46, 2, sx * 40, 14); c.quadraticCurveTo(sx * 34, 4, sx * 26, 12); c.closePath(); c.fill(); c.stroke(); }
        c.fillStyle = g; ell(c, 0, 4, 32, 32); c.fill(); c.stroke(); c.fillStyle = col.belly; ell(c, 0, 16, 18, 14); c.fill();
      } else if (kind === "centinela") {
        // an armoured guard with a fog lance and a crested helmet
        c.strokeStyle = "#6a6478"; c.lineWidth = 3; c.beginPath(); c.moveTo(44, 38); c.lineTo(44, -60); c.stroke();
        c.fillStyle = "#cfd4e8"; c.beginPath(); c.moveTo(38, -58); c.lineTo(44, -76); c.lineTo(50, -58); c.closePath(); c.fill();
        c.save(); c.globalAlpha = 0.4; c.fillStyle = "#e8e4f0"; EV.ell(c, 44 + Math.sin(o.t * 2) * 3, -66, 10, 4); c.fill(); c.restore();
        c.strokeStyle = col.line; c.fillStyle = g; ell(c, 0, 4, 36, 40); c.fill(); c.stroke();
        c.fillStyle = "#6a6e86"; c.beginPath(); c.moveTo(-34, -12); c.quadraticCurveTo(0, -60, 34, -12); c.lineTo(28, -16); c.quadraticCurveTo(0, -40, -28, -16); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = "#4a3a6a"; c.beginPath(); c.moveTo(-4, -46); c.quadraticCurveTo(10, -66, 26, -60); c.quadraticCurveTo(12, -54, 4, -40); c.closePath(); c.fill();
        c.fillStyle = col.belly; ell(c, 0, 18, 20, 16); c.fill();
      } else if (kind === "vidriela") {
        // a glass fish: see-through body, wavy fins and a tail
        c.save(); c.globalAlpha = 0.85;
        const w = Math.sin(o.t * 4) * 5;
        c.fillStyle = "#bfe8f6"; c.beginPath(); c.moveTo(-30, 0); c.lineTo(-56, -18 + w); c.lineTo(-52, 0); c.lineTo(-56, 18 - w); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(-6, -30); c.quadraticCurveTo(10, -52 + w, 22, -28); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = g; ell(c, 0, 0, 38, 30); c.fill(); c.stroke(); c.restore();
        c.save(); c.globalAlpha = 0.6; c.fillStyle = "#ffffff"; ell(c, -12, -14, 10, 4); c.fill(); c.restore();
      } else if (kind === "ecolito") {
        // a singing pebble with sound rings
        c.fillStyle = g; c.beginPath(); c.moveTo(-36, 30); c.lineTo(-40, -4); c.lineTo(-22, -32); c.lineTo(12, -38); c.lineTo(36, -14); c.lineTo(38, 30); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = col.belly; ell(c, 0, 16, 20, 12); c.fill();
        c.strokeStyle = "#d8c8a8"; c.lineWidth = 2; for (let k = 0; k < 2; k++) { const ph = (o.t * 0.8 + k / 2) % 1; c.globalAlpha = 1 - ph; c.beginPath(); c.arc(0, 0, 44 + ph * 18, -0.5, 0.5); c.stroke(); c.beginPath(); c.arc(0, 0, 44 + ph * 18, Math.PI - 0.5, Math.PI + 0.5); c.stroke(); } c.globalAlpha = 1;
        c.strokeStyle = col.line; c.lineWidth = 3;
      } else if (kind === "relampin") {
        // a ferret with a zig-zag lightning tail
        c.fillStyle = "#ffe27a"; c.strokeStyle = col.line; c.lineWidth = 2.5; c.beginPath(); c.moveTo(28, 10); c.lineTo(48, -4); c.lineTo(42, -10); c.lineTo(58, -26); c.lineTo(50, -6); c.lineTo(56, -2); c.lineTo(34, 18); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = g; ell(c, 0, 4, 34, 30); c.fill(); c.stroke(); c.fillStyle = col.belly; ell(c, 0, 14, 18, 14); c.fill();
        c.fillStyle = col.body; for (const sx of [-1, 1]) { ell(c, sx * 20, -24, 8, 9); c.fill(); c.stroke(); }
        c.fillStyle = "#7a5a10"; c.fillRect(-14, -14, 28, 6);
      } else if (kind === "trinilla") {
        // a bird with a harp-shaped tail
        c.strokeStyle = "#c08a30"; c.lineWidth = 3; c.beginPath(); c.moveTo(24, 16); c.quadraticCurveTo(58, 10, 50, -30); c.quadraticCurveTo(40, -10, 26, -4); c.stroke();
        c.lineWidth = 1; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(30 + k * 5, 12 - k); c.lineTo(32 + k * 5, -6 - k * 5); c.stroke(); }
        c.strokeStyle = col.line; c.lineWidth = 3; c.fillStyle = g; ell(c, 0, 4, 32, 32); c.fill(); c.stroke(); c.fillStyle = col.belly; ell(c, 0, 16, 18, 14); c.fill();
        c.fillStyle = "#f2b632"; c.beginPath(); c.moveTo(-6, 2); c.lineTo(6, 2); c.lineTo(0, 10); c.closePath(); c.fill();
        c.fillStyle = col.body; c.beginPath(); c.moveTo(-4, -28); c.quadraticCurveTo(0, -46, 10, -40); c.quadraticCurveTo(6, -32, 4, -28); c.fill();
      } else if (kind === "carambano") {
        // a mole with an icicle snout and big digging paws
        c.fillStyle = g; ell(c, 0, 4, 38, 32); c.fill(); c.stroke(); c.fillStyle = col.belly; ell(c, 0, 16, 20, 14); c.fill();
        c.fillStyle = "#e8f8ff"; c.beginPath(); c.moveTo(-8, 4); c.lineTo(8, 4); c.lineTo(0, 22); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = "#d8c0b0"; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 36, 14, 10, 7, sx * 0.4, 0, 7); c.fill(); c.stroke(); }
      } else if (kind === "capuchon") {
        // a hermit crab wearing a mushroom
        c.fillStyle = "#e8dcc8"; c.fillRect(-14, -30, 28, 20); c.strokeRect(-14, -30, 28, 20);
        c.fillStyle = "#b04a4a"; c.beginPath(); c.moveTo(-40, -26); c.quadraticCurveTo(0, -78, 40, -26); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = "#fff4e8"; for (const [px, py] of [[-20, -36], [6, -50], [24, -34]]) { ell(c, px, py, 5, 4); c.fill(); }
        c.fillStyle = g; ell(c, 0, 8, 32, 26); c.fill(); c.stroke();
        c.fillStyle = col.body; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 38, 4, 10, 8, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(sx * 44, -2); c.lineTo(sx * 50, -8); c.stroke(); }
      } else if (kind === "bostezo") { c.beginPath(); for (const [px, py, r] of [[-26, 8, 18], [-14, -18, 20], [10, -22, 20], [28, -2, 18], [24, 22, 16], [0, 24, 22], [-24, 26, 14]]) { c.moveTo(px + r, py); c.arc(px, py, r, 0, 7); } c.stroke(); c.fill(); }
      else if (kind === "brotin" || kind === "fuellito" || kind === "remolin") { ell(c, 0, 0, 38, kind === "brotin" ? 40 : 36); c.fill(); c.stroke(); c.fillStyle = col.belly; ell(c, 0, 14, 22, 18); c.fill(); }
      if (kind !== "bostezo" && kind !== "yunqueron" && kind !== "trinilla") { c.fillStyle = col.body; c.lineWidth = 2.5; for (const fx of [-16, 16]) { ell(c, fx, 36, 10, 6); c.fill(); c.stroke(); } }
      // features
      if (kind === "brotin") {
        c.fillStyle = "#7a5228"; c.beginPath(); c.moveTo(-36, -14); c.quadraticCurveTo(0, -52, 36, -14); c.quadraticCurveTo(0, -30, -36, -14); c.fill();
        c.fillStyle = "#6aa84f"; c.strokeStyle = "#3e6e2c"; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -38); c.quadraticCurveTo(-6, -58, -18, -60); c.quadraticCurveTo(-6, -46, 0, -38); c.fill(); c.stroke();
      } else if (kind === "fuellito") {
        const fl = Math.sin(o.t * 9) * 3;
        c.save(); c.shadowColor = "#ffb347"; c.shadowBlur = 12; c.fillStyle = "#ffb347"; c.beginPath(); c.moveTo(30, 10); c.quadraticCurveTo(60, 0 + fl, 52, -26 + fl); c.quadraticCurveTo(48, -6, 34, -2); c.fill(); c.fillStyle = "#ffe27a"; c.beginPath(); c.moveTo(34, 6); c.quadraticCurveTo(50, 0, 48, -14 + fl); c.quadraticCurveTo(42, -2, 34, 0); c.fill(); c.restore();
        c.strokeStyle = col.line; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-14, 6 + i * 7); c.lineTo(14, 6 + i * 7); c.stroke(); }
      } else if (kind === "remolin") {
        c.fillStyle = col.body; c.strokeStyle = col.line; c.lineWidth = 2.5; for (const s of [-1, 1]) { ell(c, s * 26, -30, 8, 8); c.fill(); c.stroke(); }
        c.strokeStyle = col.line; c.lineWidth = 3; c.beginPath(); c.arc(42, 18, 10, Math.PI * 0.6, Math.PI * 2.1); c.stroke();
      } else if (kind === "bostezo") {
        c.fillStyle = "#cbbbe0"; c.strokeStyle = col.line; c.lineWidth = 2; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 40, -10, 16, 9, s * 0.5, 0, 7); c.fill(); c.stroke(); }
        c.strokeStyle = col.line; c.lineWidth = 2; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 8, -38); c.quadraticCurveTo(s * 14, -54, s * 22, -54); c.stroke(); }
      }
      // face
      const ey = -6;
      c.fillStyle = "#2a2230"; c.strokeStyle = "#2a2230"; c.lineWidth = 2.6; c.lineCap = "round";
      for (const s of [-1, 1]) {
        const ex = s * 13;
        if (o.ko || (kind === "bostezo" && Math.sin(o.t * 0.7) > 0.6)) { c.beginPath(); c.arc(ex, ey, 5, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
        else { ell(c, ex, ey, 5, 6); c.fill(); c.fillStyle = "#fff"; ell(c, ex - 1.6, ey - 2.2, 1.8, 1.8); c.fill(); c.fillStyle = "#2a2230"; }
      }
      c.fillStyle = col.cheek; c.globalAlpha = 0.7; for (const s of [-1, 1]) { ell(c, s * 23, ey + 8, 5.5, 3.2); c.fill(); } c.globalAlpha = 1;
      c.beginPath(); if (o.hp < 0.35) c.arc(0, ey + 18, 5, 1.15 * Math.PI, 1.85 * Math.PI); else c.arc(0, ey + 9, 6, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    }
    c.restore();
  }
  if (o.hollow) {
    // the Black Sap: dark drips and a dim violet haze
    // drops fall upward, in steps (choppy on purpose), with one oily glint each
    c.save(); c.globalAlpha = 0.28; c.fillStyle = SAP.c2; ell(c, 0, 0, 42, 42); c.fill(); c.restore();
    const tq = Math.floor(o.t * 6) / 6;
    for (let i = 0; i < 3; i++) { const dy = (tq * 18 + i * 17) % 30; c.globalAlpha = 1 - dy / 30; c.fillStyle = SAP.c1; EV.ell(c, -18 + i * 18, 30 - dy, 3, 5); c.fill(); c.fillStyle = SAP.sheen; c.fillRect(-19 + i * 18, 27 - dy, 2, 2); }
    c.globalAlpha = 1;
  }
}
function monName(kind, hollow) {
  if (MONS[kind] && MONS[kind].boss) return tx("boss." + kind);
  const n = MON_NAMES[kind];
  return hollow ? tx("foe.hollow", { name: n }) : n;
}

/* ====================================================================== */
/* Expedition state (memory only: leaving the page abandons the trip)     */
/* ====================================================================== */
let X = null;           // current expedition
let view = null;        // current view name
let battle = null;      // current battle presentation state
const rnd = Math.random;
const pickN = (arr, n) => { const a = arr.slice(); const out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return out; };

function startExpedition() {
  const why = expCheck(); if (why) { EV.toast(tx("exp.need." + why)); EV.sfx("deny"); return; }
  rpgState();
  const S = EV.S;
  X = { zone: null, offer: [], chosen: [], party: [], section: 0, nodes: [], loot: { xp: 0, coins: 0, cards: [] }, nextFoeBuff: 0, wins: 0 };
  show("zones");
}
const zoneOpen = (id) => { const u = ZONES[id].unlock; if (!u) return true; const ok = (z) => ((EV.P.cleared || {})[z] || 0) > 0; return ZONES[id].unlockAll ? u.every(ok) : [].concat(u).some(ok); };
function pickZone(id) {
  if (!ZONES[id] || !zoneOpen(id)) { EV.sfx("deny"); return; }
  const S = EV.S, z = ZONES[id];
  X.zone = id;
  X.offer = pickN(z.allies.filter((k) => k !== S.species), 3);
  // Unísona: brought by Tila and Nim to the Heart; after the Heart is calm it can join any trip
  if (id === "heart" || (EV.P.flags || {}).unisona) X.offer.unshift("unisona");
  X.chosen = [];
  show("pick");
}
function zonesHtml() {
  const cl = EV.P.cleared || {};
  return `<div class="nodes zones">${Object.keys(ZONES).map((id) => {
    const z = ZONES[id], open = zoneOpen(id);
    const done = cl[id] || 0;
    return `<button type="button" class="node zone" data-zone="${id}" ${open ? "" : "disabled"}><span class="ic" aria-hidden="true">${TYPES[z.type].icon}</span>
      <strong>${esc(zt("name", null, id))}</strong><small>${esc(zt("sub", null, id))}</small>
      <small>${open ? esc(tx("zones.lvl", { n: z.min })) : "🔒 " + esc(tx(z.unlockAll ? "zones.lockHeart" : Array.isArray(z.unlock) ? (z.unlock.includes("hollow") ? "zones.lockHigh" : "zones.lockEnv") : "zones.lock"))}</small>
      ${done ? `<small class="ok">✓ ${esc(tx("zones.done", { n: done }))} · ${starStr((EV.P.stars || {})[id] || 0)}<br>${esc(tx("zones.verse", { v: zt("verse", null, id) }))}</small>` : ""}</button>`;
  }).join("")}</div>`;
}
function setOut() {
  const S = EV.S;
  S.stats.energy = Math.max(0, S.stats.energy - 25);
  const R = rpgState();
  X.party = [{ own: true, kind: S.species, hp: 1 }].concat(X.chosen.map((k) => ({ own: false, kind: k, hp: 1, lvl: R.lvl })));
  EV.addLog(tx("log.expGo", { name: S.name, to: zt("to") }));
  EV.save();
  nextSection();
}
function nextSection() {
  const z = ZONES[X.zone];
  X.section++;
  if (X.section > z.sections) { X.nodes = ["boss"]; healParty(0.3); show("map"); return; }
  const types = ["fight", "fight", "event", "chest", "rest", "event", "fight"];
  let n = X.section === 1 ? ["fight", "event"] : pickN(types, 3);
  n = Array.from(new Set(n));
  if (n.length < 2) n.push(n[0] === "fight" ? "event" : "fight");
  if (X.section === 1 && rnd() < 0.5) n.push("chest");
  X.nodes = n.slice(0, 3);
  show("map");
}
function partyUnits() {
  return X.party.map((m) => {
    if (m.own) return makeUnit(ownUnitOpts(m.hp));
    // Unísona uses your best copy of each of its cards, so it grows as you fuse them
    const gr = (id) => (m.kind === "unisona" ? Math.max(0, ...EV.P.cards.filter((c) => c.id === id).map((c) => c.g)) : 0);
    const mc = MONS[m.kind].cards;
    const cards = { a: scaled(mc[0], gr(mc[0])), p: scaled(mc[1], gr(mc[1])) };
    if (m.lvl >= SLOT_LVL.s || m.kind === "unisona") cards.s = scaled(mc[2], gr(mc[2]));
    return makeUnit({ kind: m.kind, lvl: m.lvl, side: "ally", name: monName(m.kind), wild: true, cards, hpPct: m.hp, stage: 1, form: "bright" });
  });
}
function foeUnits(boss) {
  const z = ZONES[X.zone], R = rpgState();
  if (boss) {
    const lvl = Math.max(z.min, R.lvl);
    const m = MONS[z.boss];
    const cards = { a: scaled(m.cards[0], 0), p: scaled(m.cards[1], 0), s: scaled(m.cards[2], 0) };
    return [makeUnit({ kind: z.boss, lvl, side: "foe", name: monName(z.boss), boss: true, cards, stage: 1 })];
  }
  const count = X.section <= 1 ? 2 : rnd() < 0.5 ? 3 : 2;
  const lvl = Math.max(z.min, Math.round(R.lvl * 0.8 + (X.section - 1) * 0.25));
  return pickN(z.foes.concat(z.foes), count).map((k) => {
    const cs = MONS[k].cards;
    const cards = { a: scaled(cs[Math.floor(rnd() * 2)], 0) };
    if (X.section >= 4) cards.p = scaled(cs[1], 0);
    const u = makeUnit({ kind: k, lvl, side: "foe", name: monName(k, true), hollow: true, cards, stage: 1 });
    if (X.nextFoeBuff) { u.base.str *= 1 + X.nextFoeBuff / 100; }
    return u;
  });
}

/* ---------- Views ---------- */
function show(v) { view = v; render(); const el = $("scrExp"); if (el && !el.hidden) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
function pickStats(k) {
  const u = makeUnit({ kind: k, lvl: rpgState().lvl, side: "ally", wild: true, stage: 1 });
  const v = { hp: u.maxHp, str: Math.round(u.base.str), def: Math.round(u.base.def), spd: Math.round(u.base.spd), cr: Math.round(u.crit) + " %" };
  return `<span class="mstats">${Object.keys(v).map((k) => `<span><i>${esc(tx("sh." + k))}</i><b>${v[k]}</b></span>`).join("")}</span>`;
}
function partyHtml() {
  return `<div class="party">${X.party.map((m) => {
    const nm = m.own ? EV.S.name : monName(m.kind);
    const ty = MONS[m.kind].types[0];
    return `<div class="pm${m.hp <= 0 ? " down" : ""}"><strong>${esc(nm)}</strong>${typeChip(ty)} <span class="progress">${Math.round(m.hp * 100)} %</span><div class="bar"><i style="width:${Math.round(m.hp * 100)}%"></i></div></div>`;
  }).join("")}</div>`;
}
function trailHtml() {
  const z = ZONES[X.zone], out = [];
  for (let i = 1; i <= z.sections + 1; i++) out.push(`<i class="${i < X.section ? "done" : i === X.section ? "now" : ""}"></i>`);
  return `<div class="trail" aria-hidden="true">${out.join("")}</div>`;
}
function render() {
  const el = $("scrExp"); if (!el) return;
  if (!X) { el.innerHTML = ""; return; }
  const z = ZONES[X.zone];
  const head = `<div class="panel"><div class="panel-head"><div><div class="sub">${esc(view === "zones" ? tx("zones.sub") : zt("sub"))}</div><h2>${esc(view === "zones" ? tx("zones.title") : zt("name"))}</h2></div>${view !== "pick" && view !== "zones" && view !== "end" && view !== "battle" ? `<button class="btn ghost" type="button" data-x="quit">${esc(tx("quit"))}</button>` : ""}</div>${view !== "pick" && view !== "zones" ? trailHtml() : ""}</div>`;
  let body = "";
  if (view === "zones") {
    body = `<div class="panel">${zonesHtml()}<div class="bctl"><button class="btn ghost" type="button" data-x="cancel">${esc(tx("exp.cancel"))}</button></div></div>`;
  } else if (view === "pick") {
    body = `<div class="panel"><p class="lead">${esc(zt("desc"))}</p>
      <h3>${esc(tx("exp.pick"))}</h3><p class="muted" style="margin:0">${esc(tx("exp.pickSub"))}</p>
      <div class="mons">${X.offer.map((k) => `<button type="button" class="mon" data-pick="${k}" aria-pressed="${X.chosen.includes(k)}"><canvas width="96" height="80" data-mon="${k}"></canvas><strong>${esc(monName(k))}</strong>${typeChip(MONS[k].types[0])}<small>${esc(MON_DESC[L()][k])}</small>${pickStats(k)}</button>`).join("")}</div>
      </div>${loadoutHtml()}<div class="panel">
      <div class="bctl"><button class="btn" type="button" data-x="go" ${X.chosen.length === 2 ? "" : "disabled"}>${esc(tx("exp.go"))} · ${esc(tx("exp.cost"))}</button><button class="btn ghost" type="button" data-x="cancel">${esc(tx("exp.cancel"))}</button></div></div>`;
  } else if (view === "map") {
    const icons = { fight: "⚔️", event: "❓", chest: "🎁", rest: "🔥", boss: "🏮" };
    body = `<div class="panel"><div class="sub">${esc(X.nodes[0] === "boss" ? tx("node.boss") : tx("exp.section", { n: X.section, m: z.sections }))}</div>
      <h3>${esc(X.nodes[0] === "boss" ? tx("exp.bossNext") : tx("exp.choose"))}</h3>
      <div class="nodes">${X.nodes.map((n) => `<button type="button" class="node${n === "boss" ? " boss" : ""}" data-node="${n}"><span class="ic" aria-hidden="true">${n === "event" ? '<i class="evd"></i>' : icons[n]}</span><strong>${esc(tx("node." + n))}</strong><small>${esc((n === "boss" ? zt("bossD") : tx("node." + n + ".d")))}</small></button>`).join("")}</div></div>
      <div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}${lootHtml()}</div>`;
  } else if (view === "battle") {
    body = `<div class="panel"><div class="bbar"><span class="sub grow" id="bRound"></span>
        <div class="seg" id="bMode"><button type="button" data-m="auto" aria-pressed="${EV.P.rpgMode === "auto"}">${esc(tx("b.auto"))}</button><button type="button" data-m="manual" aria-pressed="${EV.P.rpgMode === "manual"}">${esc(tx("b.manual"))}</button></div>
        <div class="seg" id="bSpeed">${[1, 2, 4].map((s) => `<button type="button" data-s="${s}" aria-pressed="${(EV.P.rpgSpeed || 1) === s}">×${s}</button>`).join("")}</div></div>
      <div class="bstage"><canvas id="bCanvas" role="img" aria-label="${esc(view === "zones" ? tx("zones.title") : zt("name"))}"></canvas></div>
      <div id="bTurn"></div>
      <ul class="blog" id="bLog" aria-live="polite"></ul></div>`;
  } else if (view === "event") {
    body = eventHtml();
  } else if (view === "reward") {
    body = rewardHtml();
  } else if (view === "end") {
    body = endHtml();
  }
  el.innerHTML = head + body;
  if (view === "pick") el.querySelectorAll("canvas[data-mon]").forEach((cv) => {
    const out = EV.setupCanvas(cv, 96, 80);
    if (typeof PX === "undefined") { out.translate(48, 44); out.scale(0.62, 0.62); drawMon(out, cv.dataset.mon, { t: 0.5, stage: 1, form: "bright", hp: 1 }); return; }
    const L = PX.layer(32, 27), c = L.g; c.scale(1 / 3, 1 / 3); c.translate(48, 44); c.scale(0.62, 0.62);
    drawMon(c, cv.dataset.mon, { t: 0.5, stage: 1, form: "bright", hp: 1 });
    c.setTransform(1, 0, 0, 1, 0, 0); PX.quantize(c, 32, 27, false); PX.blit(out, L, 96, 81);
  });
  if (view === "battle") battleMount();
}
// pre-trip loadout: up to 3 cards, one per slot, chosen before setting out
function loadoutHtml() {
  const R = rpgState(), P = EV.P; if (!R) return "";
  const eqIds = {};
  for (const k of ["a", "p", "s"]) { const c = R.eq[k] && cardByUid(R.eq[k]); if (c) eqIds[k] = c.id; }
  // one option per distinct card (best grade first)
  const best = {};
  for (const c of P.cards) if (usable(c.id) && (!best[c.id] || c.g > best[c.id].g)) best[c.id] = c;
  const opts = Object.values(best).sort((a, b) => b.g - a.g || cardName(a.id).localeCompare(cardName(b.id)));
  const slots = ["a", "p", "s"].map((k) => {
    const locked = R.lvl < SLOT_LVL[k];
    const cur = R.eq[k] && cardByUid(R.eq[k]);
    const sel = `<select data-load="${k}" ${locked ? "disabled" : ""} aria-label="${esc(tx("slot." + k))}"><option value="">${esc(tx("cards.empty"))}</option>${opts.map((c) => {
      const other = Object.keys(eqIds).find((s) => s !== k && eqIds[s] === c.id);
      const uid = cur && cur.id === c.id ? cur.uid : c.uid;
      return `<option value="${uid}" ${cur && cur.id === c.id ? "selected" : ""}>${esc(cardName(c.id))} · ${esc(GRADES[c.g][L()])} · ${TYPES[CARDS[c.id].type].icon}${other ? " (" + esc(tx("slot." + other)) + ")" : ""}</option>`;
    }).join("")}</select>`;
    const fx = cur && !locked ? `<p class="muted">${esc(slotText(scaled(cur.id, cur.g), k))}</p>` : locked ? `<p class="muted">🔒 ${esc(tx("load.lock", { n: SLOT_LVL[k] }))}</p>` : "";
    return `<div class="slotbox"><p class="sub">${esc(tx("slot." + k))}</p>${sel}${fx}</div>`;
  }).join("");
  return `<div class="panel"><h3>${esc(tx("load.title"))}</h3><p class="muted" style="margin:0">${esc(tx("load.sub"))} ${esc(canTypesText())}</p><div class="slots">${slots}</div></div>`;
}
function setLoad(slot, uid) {
  const R = rpgState(); if (!R) return;
  const c = uid && cardByUid(uid);
  if (c && !usable(c.id)) { EV.sfx("deny"); return; }
  if (c) for (const k of ["a", "p", "s"]) { const o = R.eq[k] && cardByUid(R.eq[k]); if (k !== slot && o && o.id === c.id) R.eq[k] = null; }
  R.eq[slot] = c ? c.uid : null;
  if (c) EV.P.c.equips = (EV.P.c.equips || 0) + 1;
  EV.sfx("card"); EV.save(); render();
}
function lootHtml() {
  const l = X.loot;
  return `<div class="loot"><span>${esc(tx("r.xp", { n: l.xp }))}</span><span>✦ ${l.coins}</span><span>🃏 ${l.cards.length}</span></div>`;
}

/* ---------- Battle presentation ---------- */
const BW = 360, BH = 240;
const POS = { ally: [[96, 92], [56, 148], [116, 196]], foe: [[264, 92], [304, 148], [244, 196]] };
function startBattle(boss) {
  const allies = partyUnits().filter((u) => u.hp > 0);
  const foes = foeUnits(boss);
  X.nextFoeBuff = 0;
  const b = new Battle(allies, foes, { zone: ZONES[X.zone], day: isDayNow() });
  const all = b.units;
  const anim = {};
  ["ally", "foe"].forEach((side) => all.filter((u) => u.side === side).forEach((u, i) => { anim[u.uid] = { x: POS[side][i][0], y: POS[side][i][1], lunge: 0, flash: 0, shownHp: u.hp }; }));
  battle = { b, boss, anim, floats: [], log: [], waiting: null, done: false, cv: null, c: null, raf: 0 };
  show("battle");
  runBattle();
}
function battleMount() {
  const cv = $("bCanvas"); if (!cv || !battle) return;
  battle.cv = cv; battle.c = EV.setupCanvas(cv, BW, BH);
  cv.style.aspectRatio = BW + " / " + BH;
  if (!battle.raf) battle.raf = requestAnimationFrame(drawBattle);
  renderBLog(); renderTurn();
}
const speed = () => EV.P.rpgSpeed || 1;
const wait = (ms) => new Promise((r) => setTimeout(r, ms / speed()));
function uName(uid) { const u = battle.b.units.find((x) => x.uid === uid); return u ? u.name : ""; }
function blog(s) { battle.log.unshift(s); battle.log = battle.log.slice(0, 5); renderBLog(); }
function renderBLog() { const el = $("bLog"); if (el && battle) el.innerHTML = battle.log.map((s) => `<li>${esc(s)}</li>`).join(""); const r = $("bRound"); if (r && battle) r.textContent = tx("b.round", { n: Math.max(1, battle.b.round) }); }
function flushEvents() {
  const b = battle.b, ev = b.events.splice(0);
  let hitSfx = null;
  for (const e of ev) {
    const a = e.u && battle.anim[e.u];
    switch (e.k) {
      case "act": { const u = b.units.find((x) => x.uid === e.u); if (a) a.lunge = 1; if (e.card) { blog(tx("log.act", { name: u.name, card: cardName(e.card) })); EV.sfx("card"); } else blog(tx("log.basic", { name: u.name })); break; }
      case "support": if (b.units.some((x) => x.uid === e.u && x.side === "ally")) EV.P.c.supportUsed = (EV.P.c.supportUsed || 0) + 1; blog(tx("log.support", { name: uName(e.u), card: cardName(e.card) })); if (a) battle.floats.push({ x: a.x, y: a.y - 44, text: "★ " + cardName(e.card), col: "#ffe27a", life: 1.4, small: true }); break;
      case "dmg":
        if ((e.eff === "up" || e.eff === "opp") && e.by && b.units.some((x) => x.uid === e.by && x.side === "ally")) EV.P.c.advHits = (EV.P.c.advHits || 0) + 1;
        if (a) {
          a.flash = 1;
          // normal cream; ×1.5 gold and bigger; ×1.25 pink with an "Opposite" tag; ×0.75 grey and smaller; damage over time falls in its cause's colour
          const col = e.dot ? (e.dot === "burn" ? TCOL.fire : "#d2cbd9") : e.eff === "up" ? "#ffd57a" : e.eff === "opp" ? "#f4a6c4" : e.eff === "down" ? "#9d93ad" : "#fbf6ef";
          battle.floats.push({ x: a.x + (Math.random() * 16 - 8), y: a.y - (e.dot ? 20 : 34), vy: e.dot ? -0.3 : 0.45, text: (e.crit ? "¡" : "") + e.n + (e.crit ? "!" : ""), col, life: 1.1, big: e.crit || e.eff === "up", small: e.eff === "down" });
          if (e.eff === "opp") battle.floats.push({ x: a.x, y: a.y - 20, text: tx("b.opp"), col: "#fbf6ef", stroke: "#4a3d5e", life: 1.1, small: true });
        }
        if (e.dot) blog(tx("log." + e.dot, { name: uName(e.u), n: e.n }));
        else blog(tx("log.dmg", { name: uName(e.u), n: e.n, crit: e.crit ? tx("log.crit") : "", eff: e.eff ? tx("log." + e.eff) : "" }));
        hitSfx = e.crit ? "crit" : hitSfx || "hit"; break;
      case "miss": if (a) battle.floats.push({ x: a.x, y: a.y - 34, text: e.blind ? "✴" : "~", col: "#cfe8ff", life: 1 }); blog(e.blind ? tx("log.blindMiss", { name: uName(e.by) }) : tx("log.miss", { name: uName(e.u) })); hitSfx = hitSfx || "miss"; break;
      case "heal": if (a) battle.floats.push({ x: a.x, y: a.y - 34, vy: 0.3, text: "+" + e.n, col: "#86b85a", life: 1.1 }); blog(tx("log.heal", { name: uName(e.u), n: e.n })); break;
      case "st": if (a) battle.floats.push(STATUS[e.st].neg ? { x: a.x, y: a.y + (a.boss ? 66 : 58), vy: -0.25, text: STATUS[e.st].icon + " " + STATUS[e.st][L()], col: "#9d93ad", life: 1.3, small: true } : { x: a.x, y: a.y - 48, text: STATUS[e.st].icon + " " + STATUS[e.st][L()], col: "#1d1626", stroke: "#fbf6ef", life: 1.3, small: true }); blog(tx("log.st", { name: uName(e.u), st: STATUS[e.st][L()] })); break;
      case "shield": blog(tx("log.shield", { name: uName(e.u), n: e.n })); break;
      case "break": blog(tx("log.break")); break;
      case "cleanse": blog(tx("log.cleanse", { name: uName(e.u), st: e.st.map((s) => STATUS[s][L()]).join(", ") })); break;
      case "resist": blog(tx("log.resist", { name: uName(e.u) })); break;
      case "save": blog(tx("log.save")); break;
      case "ko": blog(tx("log.ko", { name: uName(e.u) })); EV.sfx("ko"); EV.buzz(40); break;
      case "skip": blog(tx("log.skip." + e.why, { name: uName(e.u) })); break;
      case "round": renderBLog(); break;
      case "strip": blog(tx("log.strip", { name: uName(e.u), st: STATUS[e.st][L()] })); break;
      case "cdup": blog(tx("log.cdup", { name: uName(e.u), n: e.n })); break;
      case "lost": blog(tx("log.lost", { name: uName(e.u) })); break;
      case "echo": blog(tx("log.echo", { name: uName(e.u) })); if (a) battle.floats.push({ x: a.x, y: a.y - 50, text: "≋", col: "#d8c8a8", life: 1 }); break;
      case "revive": blog(tx("log.revive", { name: uName(e.u), n: e.n })); if (a) battle.floats.push({ x: a.x, y: a.y - 40, text: "↑ " + e.n, col: "#8fe08a", life: 1.3 }); EV.sfx("heal"); break;
    }
  }
  if (hitSfx) { EV.sfx(hitSfx); if (hitSfx === "crit") EV.buzz(25); }
}
function askPlayer(u) {
  return new Promise((resolve) => { battle.waiting = { u, resolve }; renderTurn(); });
}
function renderTurn() {
  const el = $("bTurn"); if (!el || !battle) return;
  const w = battle.waiting;
  if (!w) { el.innerHTML = ""; return; }
  const u = w.u, a = u.cards.a;
  const can = battle.b.canPlay(u);
  el.innerHTML = `<p class="bturn">${esc(tx("b.yourTurn", { name: u.name }))}</p><div class="bctl">
    <button class="btn" type="button" data-b="card" ${can ? "" : "disabled"}>${a ? esc(tx("b.play", { card: cardName(a.id) })) + (can ? "" : " · " + esc(tx("b.cd", { n: u.cd }))) : esc(tx("b.noCard"))}</button>
    <button class="btn ghost" type="button" data-b="basic">${esc(tx("b.basic"))}</button></div>`;
}
async function runBattle() {
  const bt = battle, b = bt.b;
  await wait(400);
  b.start(); flushEvents(); await wait(500);
  while (!b.checkOver() && b.round < 40) {
    const order = b.roundStart(); flushEvents();
    for (const u of order) {
      if (bt !== battle) return;
      if (b.over) break;
      if (!b.turnStart(u)) { flushEvents(); b.checkOver(); await wait(450); continue; }
      flushEvents();
      let use;
      if (u.side === "ally" && EV.P.rpgMode === "manual") use = await askPlayer(u);
      else use = b.wantPlay(u);
      if (bt !== battle) return;
      b.act(u, use); flushEvents();
      await wait(use ? 900 : 700);
    }
  }
  const res = b.over || "lose";
  bt.done = true;
  blog(res === "win" ? tx("b.win") : tx("b.lose"));
  if (res === "win") EV.sfx("win");
  await wait(1100);
  if (bt !== battle) return;
  cancelAnimationFrame(bt.raf); bt.raf = 0;
  endBattle(res);
}
function endBattle(res) {
  const b = battle.b, boss = battle.boss;
  // carry health back to the party
  const allies = b.units.filter((u) => u.side === "ally");
  let i = 0;
  for (const m of X.party) {
    if (m.hp <= 0) continue;
    const u = allies[i++]; if (!u) continue;
    m.hp = u.hp / u.maxHp;
  }
  battle = null;
  for (const m of X.party) if (m.own && m.hp <= 0) X.ownFalls = (X.ownFalls || 0) + 1;
  if (res !== "win") { finish("lose"); return; }
  if (boss) {
    const avg = X.party.reduce((a, m) => a + Math.max(0, m.hp), 0) / X.party.length;
    const noKO = X.party.every((m) => m.hp > 0);
    X.stars = avg >= 0.75 && noKO ? 3 : avg >= 0.5 ? 2 : 1;
  }
  // revive the fallen with a little health, apply after-battle supports
  const winSup = allies.filter((u) => u.hp > 0 && u.cards.s && u.cards.s.s.on === "win").map((u) => u.cards.s.s);
  const winHeal = winSup.reduce((a, s) => a + (s.heal || 0), 0) / 100, winRevive = winSup.reduce((a, s) => a + (s.revive || 0), 0) / 100;
  for (const m of X.party) m.hp = m.hp <= 0 ? Math.min(1, 0.3 + winRevive) : Math.min(1, m.hp + 0.25 + winHeal);
  X.wins++; EV.P.c.expWins = (EV.P.c.expWins || 0) + 1;
  const foes = b.units.filter((u) => u.side === "foe");
  const xp = foes.reduce((a, u) => a + 8 + 4 * u.lvl, 0) * (boss ? 2 : 1);
  const coins = boss ? 30 : 3 + Math.floor(rnd() * 4) + foes.length;
  X.loot.xp += xp; X.loot.coins += coins;
  const offer = boss ? offerCards(3, 1) : rnd() < 0.12 ? offerCards(3, 0) : null;
  // the guardian leaves one of its own cards (one you haven't found yet, if any)
  let guard = null;
  if (boss) {
    const gc = MONS[ZONES[X.zone].boss].cards, fresh = gc.filter((id) => !(EV.P.grim || {})[id]), pool = fresh.length ? fresh : gc;
    const id = pool[Math.floor(rnd() * pool.length)];
    giveCard(id, 0); guard = { id, g: 0 }; X.loot.cards.push(guard); EV.save();
  }
  X.reward = { xp, coins, offer, guard, after: boss ? "win" : "next" };
  EV.checkAch();
  show("reward");
}
function offerCards(n, minGrade) {
  const z = ZONES[X.zone];
  const weighted = [];
  for (const id of DROP_POOL) { const w = (CARDS[id].type === z.type ? 3 : 1) * (usable(id) ? 2 : 1); for (let i = 0; i < w; i++) weighted.push(id); }
  const ids = [];
  while (ids.length < n) { const id = weighted[Math.floor(rnd() * weighted.length)]; if (!ids.includes(id)) ids.push(id); }
  return ids.map((id) => ({ id, g: rollGrade(minGrade) }));
}
function rewardHtml() {
  const r = X.reward;
  const parts = [];
  if (r.xp) parts.push(`<span>${esc(tx("r.xp", { n: r.xp }))}</span>`);
  if (r.coins) parts.push(`<span>✦ ${esc(tx("r.coins", { n: r.coins }))}</span>`);
  let html = `<div class="panel"><h3>${esc(r.title || tx("r.title"))}</h3>${r.text ? `<p class="evt-out">${esc(r.text)}</p>` : ""}${parts.length ? `<div class="loot">${parts.join("")}</div>` : ""}`;
  if (r.guard) html += `<h3>${esc(tx("r.guard"))}</h3><div class="rcards">${cardHtml(r.guard.id, r.guard.g)}</div>`;
  if (r.offer) {
    html += `<h3>${esc(tx("r.pick"))}</h3><div class="rcards">${r.offer.map((o, i) => cardHtml(o.id, o.g, { foot: `${cantNote(o.id)}<div class="rc-btns"><button class="btn" type="button" data-take="${i}">${esc(tx("r.pick"))}</button></div>` })).join("")}</div>
      <div class="bctl"><button class="btn ghost" type="button" data-take="-1">${esc(tx("r.skip"))}</button></div>`;
  } else html += `<div class="bctl"><button class="btn" type="button" data-x="continue">${esc(tx("r.continue"))}</button></div>`;
  return html + `</div><div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}${lootHtml()}</div>`;
}
function afterReward() {
  const a = X.reward && X.reward.after;
  X.reward = null;
  if (a === "win") finish("win"); else nextSection();
}

/* ---------- Battle drawing ---------- */
function drawDecor(c, decor, t, day) {
  if (decor === "heart") {
    // the great stump at the centre of the valley, root veins with black sap, floating star motes
    const m = BW / 2;
    c.fillStyle = day ? "#7a5a48" : "#3a2a30";
    c.beginPath(); c.moveTo(m - 70, 70); c.lineTo(m - 56, 16); c.quadraticCurveTo(m, 6, m + 56, 16); c.lineTo(m + 70, 70); c.closePath(); c.fill();
    c.fillStyle = day ? "#c8a070" : "#6a5040"; EV.ell(c, m, 16, 56, 9); c.fill();
    c.strokeStyle = day ? "#8a6a50" : "#4a3838"; c.lineWidth = 1; for (const r of [40, 26, 12]) { EV.ell(c, m, 16, r, r * 0.16); c.stroke(); }
    c.strokeStyle = SAP.c0; c.lineWidth = 3; for (const [x1, x2] of [[m - 60, 0], [m + 60, BW], [m - 30, 60], [m + 30, BW - 60]]) { c.beginPath(); c.moveTo(x1, 66); c.quadraticCurveTo((x1 + x2) / 2, 58, x2, 70); c.stroke(); }
    c.save(); for (let i = 0; i < 14; i++) { const x = (i * 53 + t * 8) % BW, y = 60 - ((i * 17 + t * 10) % 60); c.globalAlpha = (0.5 + 0.5 * Math.sin(t * 3 + i)) * (day ? 0.7 : 1); c.fillStyle = i % 2 ? "#ffe9a0" : "#c8b8ff"; c.fillRect(x, y, 2, 2); } c.restore();
    return;
  }
  if (decor === "peaks") {
    // snowy peaks, drifting clouds and a spinning vane far away
    c.fillStyle = day ? "#8ea6c0" : "#26304a";
    c.beginPath(); c.moveTo(0, 70); for (const [x, y] of [[40, 22], [90, 52], [150, 14], [210, 48], [270, 24], [330, 50], [360, 34]]) c.lineTo(x, y); c.lineTo(BW, 70); c.closePath(); c.fill();
    c.fillStyle = day ? "#ffffff" : "#c8d4e8"; for (const [x, y] of [[40, 22], [150, 14], [270, 24]]) { c.beginPath(); c.moveTo(x - 10, y + 12); c.lineTo(x, y); c.lineTo(x + 10, y + 12); c.closePath(); c.fill(); }
    c.save(); c.globalAlpha = day ? 0.8 : 0.35; c.fillStyle = "#ffffff"; for (let i = 0; i < 4; i++) { const x = ((i * 110 + t * 10) % (BW + 80)) - 40; EV.ell(c, x, 30 + (i % 2) * 14, 26, 7); c.fill(); EV.ell(c, x + 14, 26 + (i % 2) * 14, 16, 6); c.fill(); } c.restore();
    c.save(); c.translate(150, 10); c.strokeStyle = day ? "#5a5060" : "#8a90b0"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -6); c.stroke(); c.rotate(Math.sin(t * 0.8) * 0.8); c.beginPath(); c.moveTo(-7, -6); c.lineTo(7, -6); c.stroke(); c.restore();
    return;
  }
  if (decor === "ice") {
    // icicles, a frozen wall and glowing mushrooms
    c.fillStyle = day ? "#c8e4f0" : "#2c4250"; c.fillRect(0, 0, BW, 10);
    for (let i = 0; i < 16; i++) { const x = 6 + i * 24, h = 10 + ((i * 29) % 22); c.beginPath(); c.moveTo(x - 5, 9); c.lineTo(x + 5, 9); c.lineTo(x, 9 + h); c.closePath(); c.fill(); }
    for (let i = 0; i < 6; i++) { const x = 30 + i * 62, y = 64 + (i % 2) * 4, g = 0.6 + 0.4 * Math.sin(t * 2 + i); c.fillStyle = "#e8e0d0"; c.fillRect(x - 1, y - 6, 3, 8); c.save(); c.shadowColor = "#a8f0e0"; c.shadowBlur = 8 * g; c.fillStyle = i % 2 ? "#9ae8d8" : "#c8b8f0"; EV.ell(c, x + 0.5, y - 7, 7, 4); c.fill(); c.restore(); }
    c.save(); c.globalAlpha = 0.5; c.fillStyle = "#ffffff"; for (let i = 0; i < 18; i++) { const x = (i * 41 + t * 6) % BW, y = (i * 23 + t * 14) % 70; c.fillRect(x, y, 2, 2); } c.restore();
    return;
  }
  if (decor === "mist") {
    // crooked posts and drifting fog banks
    for (let i = 0; i < 5; i++) { const x = 24 + i * 82; c.fillStyle = day ? "#5c5868" : "#1d1b25"; c.fillRect(x - 3, 30 + (i % 2) * 8, 6, 44); c.fillRect(x - 10, 34 + (i % 2) * 8, 20, 4); }
    for (let k = 0; k < 4; k++) { c.save(); c.globalAlpha = day ? 0.28 : 0.2; c.fillStyle = "#e8e4f0"; const y = 40 + k * 12, off = ((t * (8 + k * 3)) % 120); for (let i = -1; i < 5; i++) { EV.ell(c, i * 120 + off, y, 70, 9); c.fill(); } c.restore(); }
    return;
  }
  if (decor === "lake") {
    // still water on the horizon with a reflection that doesn't match
    c.fillStyle = day ? "#7fb0cc" : "#1b3350"; c.fillRect(0, 46, BW, 26);
    c.save(); c.globalAlpha = 0.45; c.strokeStyle = "#ffffff"; c.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) { const x = (i * 53 + t * 6) % BW, y = 52 + (i % 3) * 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18, y); c.stroke(); }
    c.restore();
    for (let i = 0; i < 3; i++) { const x = 60 + i * 140; c.fillStyle = day ? "#5a4a3a" : "#20180f"; c.beginPath(); c.moveTo(x - 18, 44); c.lineTo(x + 18, 44); c.lineTo(x + 12, 50); c.lineTo(x - 12, 50); c.closePath(); c.fill(); }
    c.save(); c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 1.3); c.fillStyle = "#e8f6ff"; EV.ell(c, BW * 0.72, 60, 10, 4); c.fill(); c.restore();
    return;
  }
  if (decor === "caves") {
    // a cave ceiling with stalactites and faint echo rings
    c.fillStyle = day ? "#4a3e34" : "#15110e"; c.fillRect(0, 0, BW, 14);
    for (let i = 0; i < 14; i++) { const x = 8 + i * 30, h = 14 + ((i * 37) % 26); c.beginPath(); c.moveTo(x - 9, 12); c.lineTo(x + 9, 12); c.lineTo(x, 12 + h); c.closePath(); c.fill(); }
    c.save(); c.strokeStyle = "#e8d8b8"; c.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) { const ph = (t * 0.4 + k / 3) % 1; c.globalAlpha = (1 - ph) * 0.4; c.beginPath(); c.arc(BW / 2, 58, 10 + ph * 90, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    c.restore();
    return;
  }
  if (decor === "forge") {
    // chimneys with rising embers
    for (let i = 0; i < 4; i++) {
      const x = 30 + i * 96, h = 34 + (i % 2) * 12;
      c.fillStyle = day ? "#6b4a3a" : "#2e2226"; c.fillRect(x - 7, 70 - h, 14, h);
      c.save(); c.shadowColor = "#ff8a3a"; c.shadowBlur = 8;
      for (let k = 0; k < 4; k++) { const ph = (t * 0.6 + k * 0.25 + i * 0.13) % 1; c.globalAlpha = 1 - ph; c.fillStyle = k % 2 ? "#ffb347" : "#ff7a3a"; c.fillRect(x - 2 + Math.sin(t * 3 + k) * 4, 70 - h - ph * 40, 3, 3); }
      c.restore();
    }
  } else if (decor === "forest") {
    // tree trunks and canopy
    for (let i = 0; i < 7; i++) {
      const x = 10 + i * 56, w = 10 + (i % 3) * 3;
      c.fillStyle = day ? "#5a4030" : "#1f1a18"; c.fillRect(x - w / 2, 20, w, 54);
      c.fillStyle = day ? "#3f7a3c" : "#183022"; EV.ell(c, x, 22, 30, 20); c.fill();
    }
    c.save(); c.globalAlpha = 0.35; c.fillStyle = "#1d1426";
    for (let i = 0; i < 5; i++) { const x = 40 + i * 70; c.beginPath(); c.moveTo(x, 74); c.quadraticCurveTo(x + 8, 60 + Math.sin(t + i) * 3, x + 2, 50); c.lineWidth = 3; c.strokeStyle = "#1d1426"; c.stroke(); }
    c.restore();
  } else {
    // distant lanterns
    for (let i = 0; i < 6; i++) { const x = 20 + i * 64, y = 44 + (i % 2) * 8; c.save(); c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2 + i); c.shadowColor = "#ffd35a"; c.shadowBlur = 10; c.fillStyle = "#ffe27a"; c.fillRect(x - 3, y - 6, 6, 9); c.restore(); c.fillStyle = "#00000033"; c.fillRect(x - 1, y + 3, 2, 26); }
  }
}
// Battles are drawn at half resolution, snapped to the Glimmer-32 palette and blown up x2; names and numbers stay sharp on top.
const BLOW = typeof PX !== "undefined" ? PX.layer(BW / 2, BH / 2) : null;
function drawBattle(now) {
  if (!battle || !battle.c) return;
  const out = battle.c, b = battle.b, t = now / 1000, z = ZONES[X.zone];
  const c = BLOW ? BLOW.g : out;
  if (BLOW) { c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.scale(0.5, 0.5); }
  const day = b.day;
  const sky = c.createLinearGradient(0, 0, 0, BH);
  const sk = day ? z.sky : z.skyN;
  sky.addColorStop(0, sk[1]); sky.addColorStop(0.6, sk[0]); sky.addColorStop(1, sk[0]);
  c.fillStyle = sky; c.fillRect(0, 0, BW, BH);
  drawDecor(c, z.decor, t, day);
  c.fillStyle = day ? z.ground : z.groundN; c.beginPath(); c.moveTo(0, 70); c.quadraticCurveTo(BW / 2, 52, BW, 70); c.lineTo(BW, BH); c.lineTo(0, BH); c.fill();
  c.fillStyle = "#00000014"; for (let i = 0; i < 40; i++) { const x = (i * 97) % BW, y = 80 + ((i * 53) % 140); c.fillRect(x, y, 2, 5); }
  if (BLOW) { c.setTransform(1, 0, 0, 1, 0, 0); PX.quantize(c, BW / 2, BH / 2, true); c.scale(0.5, 0.5); }
  // units
  const order = b.units.slice().sort((p, q) => battle.anim[p.uid].y - battle.anim[q.uid].y);
  const place = [];
  for (const u of order) {
    const a = battle.anim[u.uid];
    a.lunge = Math.max(0, a.lunge - 0.06); a.flash = Math.max(0, a.flash - 0.07);
    a.shownHp += (u.hp - a.shownHp) * 0.15;
    const dir = u.side === "ally" ? 1 : -1;
    const lx = Math.round(Math.sin(a.lunge * Math.PI) * 9 * dir) * 2;
    const ko = u.hp <= 0;
    const x = Math.round((a.x + lx) / 2) * 2, y = a.y + (ko ? 8 : 0);
    place.push({ u, a, x, y, ko });
    c.save(); c.translate(x, y);
    const sc = u.boss ? 0.62 : 0.4;
    c.save(); if (u.side === "foe" && !u.boss) c.scale(-1, 1); c.scale(sc, sc);
    if (ko) c.globalAlpha = 0.35;
    drawMon(c, u.kind, { t: t + a.x, stage: u.own ? u.stage : 1, form: u.form, hollow: u.hollow, hp: u.hp / u.maxHp, ko });
    c.restore();
    if (a.flash > 0) { c.save(); c.globalAlpha = a.flash * 0.6; c.fillStyle = "#ffffff"; EV.ell(c, 0, -4, 22 * (u.boss ? 1.5 : 1), 22 * (u.boss ? 1.8 : 1)); c.fill(); c.restore(); }
    // shield ring
    if (u.shield > 0) { c.save(); c.strokeStyle = "#7cc8e3"; c.lineWidth = 2; c.beginPath(); c.arc(0, -4, u.boss ? 40 : 24, 0, Math.PI * 2); c.stroke(); c.restore(); }
    // segmented hp bar
    const bw = u.boss ? 80 : 56, by = u.boss ? 30 : 22;
    c.fillStyle = "#1d1626"; c.fillRect(-bw / 2 - 2, by - 2, bw + 4, 8);
    const pct = Math.max(0, a.shownHp / u.maxHp), col = pct > 0.5 ? "#86b85a" : pct > 0.25 ? "#ffd57a" : "#e0603f";
    c.fillStyle = col; const segs = Math.ceil((bw / 4) * pct); for (let k = 0; k < segs; k++) c.fillRect(-bw / 2 + k * 4, by, 2, 4);
    if (u.shield > 0) { c.fillStyle = "#c8eef5"; c.fillRect(-bw / 2, by, Math.min(bw, bw * u.shield / u.maxHp), 2); }
    if (u.cards.a && u.cd <= 0 && !ko) { c.fillStyle = "#ffd57a"; c.fillRect(bw / 2 + 4, by - 2, 4, 4); c.fillStyle = "#1d1626"; c.fillRect(bw / 2 + 4, by + 2, 4, 2); }
    c.restore();
  }
  if (BLOW) { c.setTransform(1, 0, 0, 1, 0, 0); PX.quantize(c, BW / 2, BH / 2, false); out.clearRect(0, 0, BW, BH); PX.blit(out, BLOW, BW, BH); }
  // names, status icons and floating numbers stay sharp
  const font = (w, px) => `${w} ${px}px "EvNum", "Pixelify Sans", system-ui, sans-serif`;
  for (const { u, x, y } of place) {
    const bw = u.boss ? 80 : 56, by = u.boss ? 30 : 22;
    out.save(); out.translate(x, y);
    out.font = font(600, 10); out.textAlign = "center"; out.textBaseline = "alphabetic"; out.fillStyle = "#fbf6ef"; out.strokeStyle = "#1d1626"; out.lineWidth = 3; out.lineJoin = "round";
    const label = u.name.length > 14 ? u.name.slice(0, 13) + "…" : u.name;
    out.strokeText(label + " · " + u.lvl, 0, by + 16); out.fillText(label + " · " + u.lvl, 0, by + 16);
    const ks = Object.keys(u.st), good = ks.filter((k) => !STATUS[k].neg).map((k) => STATUS[k].icon).join(""), bad = ks.filter((k) => STATUS[k].neg).map((k) => STATUS[k].icon).join("");
    out.font = "10px system-ui"; out.fillText(good + TYPES[u.types[0]].icon, 0, -(u.boss ? 56 : 30));
    if (bad) out.fillText(bad, 0, by + 28);
    out.restore();
  }
  for (const f of battle.floats) {
    f.life -= 0.016; f.y -= f.vy == null ? 0.45 : f.vy;
    out.save(); out.globalAlpha = Math.max(0, Math.min(1, f.life)); out.textAlign = "center";
    out.font = f.big ? font(700, 17) : f.small ? font(600, 10) : font(700, 14);
    out.lineWidth = 3; out.lineJoin = "round"; out.strokeStyle = f.stroke || "#1d1626"; out.strokeText(f.text, f.x, Math.round(f.y)); out.fillStyle = f.col; out.fillText(f.text, f.x, Math.round(f.y)); out.restore();
  }
  battle.floats = battle.floats.filter((f) => f.life > 0);
  battle.raf = requestAnimationFrame(drawBattle);
}

/* ---------- Events on the path ---------- */
function rollEvent() { const ev = ZONES[X.zone].events; return ev[Math.floor(rnd() * ev.length)]; }
const EVT = {
  es: {
    farol: { t: "Un farol del camino está tirado en la hierba. De su base gotea una savia negra y espesa, y la llama tiembla como si tuviera frío.", c: ["Levantarlo y limpiarle la savia", "Quitarle el aceite que le queda", "Dejarlo y seguir"],
      o: ["Os manchas las patas, pero la llama vuelve a crecer. El equipo pierde un poco de vida y gana experiencia.", "Te llevas un frasquito de aceite que vale unas Chispas. Las criaturas apagadas de delante parecen más enfadadas.", "Sigues adelante. El farol se queda parpadeando a tu espalda."] },
    patrol: { t: "Dos guardas del Farol cortan el paso. «Ley del Umbral: después del ocaso nadie cruza hacia el Envés. ¿Adónde vais?»", c: ["Explicarles que vas al Gran Farol", "Escabullirse entre la hierba", "Ofrecerles 8 Chispas por el paso"],
      o: ["Te miran de arriba abajo y te dejan pasar. Uno susurra: «Si llegas, dile que no todos le tenemos miedo».", "", "Se guardan las Chispas sin mirarte y se apartan."] },
    tila: { t: "En una esquina del camino, Tila, del Barrio Apagado, rellena faroles con una aceitera casi vacía. «¿Te sobra algo? En mi calle hoy no habrá luz.»", c: ["Darle 10 Chispas", "Preguntarle por qué su barrio está apagado", "Seguir tu camino"],
      o: ["Tila sonríe y comparte contigo una infusión tibia. El equipo recupera vida.", "«Porque la luz cuesta, y no a todos nos la regalan.» Te quedas pensando. Ganas experiencia.", "Tila no dice nada. Sigue rellenando faroles."] },
    well: { t: "Entre las raíces de un roble hay un pozo pequeño que brilla desde dentro, como si alguien hubiera dejado caer un trozo de amanecer.", c: ["Beber un sorbo", "Asomarse al fondo", "Llenar un frasco"],
      o: ["El agua sabe a mañana de verano. El equipo recupera mucha vida.", "Abajo, muy abajo, la luz se vuelve negra y se mueve sola. Mejor no mirar más. Ganas experiencia.", "El frasco brilla en tu mochila. Dentro hay algo con forma de carta."] },
    dam: { t: "Una presa de piedra y hierro corta el arroyo. Del otro lado la tierra está seca, y en el barro hay huellas de barcas.", c: ["Abrir una compuerta", "Seguir el cauce seco", "Dejarla como está"],
      o: ["El agua vuelve a correr hacia el Envés. Alguien de las Mareas lo notará. Ganas experiencia, pero el vapor os escalda un poco.", "Junto a una barca abandonada encuentras algo que brilla.", "Sigues adelante. El arroyo sigue sin agua."] },
    apprentice: { t: "Un aprendiz del Gremio de la Brasa se ha quemado las manos avivando un fuelle que no para nunca.", c: ["Ayudarle con el fuelle", "Preguntarle por qué no paran", "Seguir tu camino"],
      o: ["Os turnáis un rato. El equipo acaba cansado, pero el aprendiz te da unas Chispas.", "«Mil faroles nuevos para las Casas de Luz. Maese Tizón dice que nos harán respetables.» Ganas experiencia.", "El fuelle sigue sonando a tu espalda."] },
    ola: { t: "Una joven de las Mareas carga carbón junto a las forjas. Lleva en el bolsillo una carta arrugada que nunca envió.", c: ["Ofrecerte a llevar su carta", "Compartir tu comida", "Dejarla trabajar"],
      o: ["«Para mi hermana Orilla, en el campamento del Arroyo. No le digas dónde trabajo.» Se llama Ola. Guardas la carta.", "Ola sonríe por primera vez en mucho tiempo y os cuenta historias del Lago. El equipo recupera vida.", "Ola no levanta la vista del carbón."] },
    liquen: { t: "El Abuelo Liquen, del Concejo del Musgo, vigila un cofre de semillas antiguas. «Nadie entra en el bosque sin dejar algo.»", c: ["Dejar 10 Chispas", "Preguntarle por el Seto", "Rodearlo en silencio"],
      o: ["El abuelo asiente y abre el cofre. Entre las semillas hay algo con forma de carta.", "«El Seto nos protege. Lo que haya debajo no es asunto vuestro.» Al decirlo, sus raíces tiemblan. Ganas experiencia.", "Pasas de largo. El abuelo te sigue con la mirada."] },
    vines: { t: "Las enredaderas del camino se mueven solas. Por dentro son negras, como si bebieran savia.", c: ["Cortarlas", "Pasar muy despacio", "Buscar otro camino"],
      o: ["", "", "Das un rodeo largo, pero tranquilo."] },
    loggers: { t: "Unos leñadores cargan troncos hacia el Cráter. Uno se ha torcido el tobillo.", c: ["Ayudarle a cargar", "Preguntar para qué tanta leña", "Seguir"],
      o: ["Le ayudáis hasta el claro. Os da unas Chispas y un trozo de pan.", "«Para las forjas. Mil faroles, dicen. Y el bosque, cada año más callado.» Ganas experiencia.", "Los leñadores siguen su camino."] },
    court: { t: "En la niebla aparece una corte vacía: sillas de piedra en círculo alrededor de un trono sin nadie. Junto a cada silla hay una copa de agua fresca.", c: ["Sentarte en una silla", "Beber de una copa", "Pasar sin tocar nada"],
      o: ["Al sentarte, las sombras de las sillas se levantan. «Nadie se sienta en la corte sin ser invitado.»", "El agua sabe a cueva y a lluvia vieja. El equipo recupera vida.", "Al salir del círculo oyes un susurro: «El Rey no está. Pero sigue mandando.» Ganas experiencia."] },
    dig: { t: "En la niebla suenan palas. Una familia del pueblo de la Sombra cava un pozo hondo, a escondidas. Sobre la boca del pozo hay una marca con forma de farol.", c: ["Preguntarles para quién cavan", "Ayudarles un rato", "Seguir sin que te vean"],
      o: ["«Para la Luz de Arriba. Nos pagan con permiso para quedarnos. El Rey lo firmó.» Lo dicen sin mirarte. Ganas experiencia.", "Cavas con ellos hasta que te duelen las patas. Te dan unas Chispas manchadas de tierra negra.", "Te alejas en silencio. Junto al sendero alguien olvidó algo."] },
    whisper: { t: "Dos Susurradores del Rey Lóbrego te cierran el paso. Llevan velos de niebla y no se les ven los ojos. «¿Traes recado de la Luz?»", c: ["Decir la verdad: vas al Trono", "Darles 10 Chispas por su silencio", "Cruzar la niebla corriendo"],
      o: ["«Entonces verás que está vacío. Siempre lo estuvo.» Se apartan sin hacer ruido. Ganas experiencia.", "Se guardan las Chispas. Uno te da un consejo: «Los de delante no ven bien en la niebla.» Las próximas criaturas apagadas pegarán más flojo.", ""] },
    orilla: { t: "Junto al agua, una mujer de las Mareas remienda redes. Se llama Orilla y lleva mucho tiempo buscando a su hermana.", c: ["Ayudarle con las redes", "Preguntarle por el Lago", "Seguir tu camino"],
      o: ["Remendáis redes hasta que cae la luz. «Mi hermana Ola se fue a buscar trabajo al Cráter. Si la ves…» El equipo descansa y te da unas Chispas.", "«El Lago recuerda todo lo que se le cae. Desde que bajó el agua, recuerda cosas que no han pasado.» Baja la voz: «Lo vi en el fondo: la luz bebe de la raíz.» Ganas experiencia.", "Orilla sigue con sus redes, mirando el agua."],
      cL: ["Darle la carta de Ola", "Preguntarle por el Lago", "Seguir tu camino"],
      oL: ["Orilla lee la carta tres veces. «Está viva. Trabaja en las forjas, ¿verdad? Lo sé por el carbón en el papel.» Llora y ríe a la vez, y te da lo mejor que tiene: Chispas, comida para el equipo y algo con forma de carta."] },
    reflection: { t: "En el agua quieta ves a tu equipo reflejado. Pero en el reflejo sois cuatro.", c: ["Tocar el reflejo", "Saludar al cuarto", "Apartar la vista"],
      o: ["El reflejo se rompe en mil gotas, y de ellas salen criaturas apagadas…", "El cuarto te devuelve el saludo un instante tarde. Luego ya no está. Ganas experiencia.", "Respiras hondo y sigues. El equipo descansa un poco."] },
    boats: { t: "Barcas varadas en el barro. El agua del Lago ha bajado desde que represaron el arroyo.", c: ["Empujar una barca al agua", "Registrar las barcas", "Dejarlas"],
      o: ["Empujáis hasta que la barca flota. Cuesta, pero ganas experiencia.", "Entre las redes viejas encuentras algo que brilla.", "Las barcas se quedan en el barro."],
      dam: "Gracias a la compuerta que abriste en el Cráter, aquí llega un poco más de agua. La barca flota sola y os lleva un trecho: el equipo descansa y ganas experiencia." },
    gravasong: { t: "Por las cuevas llega una canción a trozos, como si alguien la cantara muy lejos y la roca solo dejara pasar algunas palabras.", c: ["Cantar con ella", "Seguir el sonido", "Taparte los oídos"],
      o: ["Tu voz vuelve multiplicada y, durante un momento, la canción suena entera. Ganas experiencia.", "El sonido te lleva hasta una grieta. Dentro, algo brilla.", "El silencio también descansa. El equipo recupera algo de vida."] },
    tunnels: { t: "Un túnel nuevo, recto y liso, corta las cuevas viejas. En las paredes hay marcas con forma de farol, y aquí el eco ya no vuelve.", c: ["Seguir el túnel nuevo", "Taparlo con piedras", "Volver al camino viejo"],
      o: ["Al fondo hay herramientas de las Casas de Luz y un saco de Chispas. Algo en la oscuridad se enfada.", "Cuesta, pero el eco vuelve un poco. Ganas experiencia.", "Vuelves al camino viejo. El eco te acompaña."] },
    miners: { t: "Un grupo de mineros de la Hondura ha quedado atrapado detrás de un derrumbe. Se les oye golpear la roca.", c: ["Apartar las rocas", "Pasarles agua por una grieta", "Seguir"],
      o: ["Tardáis, pero salen todos. «Ningún minero atrás», dicen, y te dan lo que llevan encima.", "Te dan las gracias por la grieta. «Grava ya no deja entrar a nadie», cuentan. Ganas experiencia.", "Los golpes se quedan sonando a tu espalda."] },
    coplo: { t: "Un juglar del Cielo canta en un mirador, con un sombrero lleno de monedas a los pies. Se llama Coplo y busca versos perdidos del Canto. Ahora mismo canta «El Agua Podrida», la balada que más le pagan.", c: ["Pagarle 8 Chispas por una copla", "Preguntarle quién le encargó esa balada", "Cantarle un verso del Canto que ya tienes"],
      o: ["Te canta una copla vieja sobre una raíz que lo une todo. El equipo se anima y recupera vida.", "«Unos señores con velo de niebla. Pagaron bien.» Se encoge de hombros. No sabe que eran Susurradores del Rey. Ganas experiencia.", "Coplo apunta tu verso en un cuaderno lleno de tachones. A cambio te da algo con forma de carta."] },
    news: { t: "Un mensajero de la Aguja del Trueno vende noticias frescas en un cruce de caminos. «¡Todo lo que pasa en el valle, por muy poco!»", c: ["Comprar una noticia (6 Chispas)", "Venderle tú una noticia", "Seguir sin escucharle"],
      o: ["«Las criaturas de más arriba están cansadas: llevan días sin dormir.» Las próximas criaturas apagadas pegarán más flojo.", "Le cuentas lo que viste en el Envés. Te paga unas Chispas y sale corriendo a venderlo.", "El mensajero ya grita la noticia a otro viajero."] },
    pass: { t: "Los guardias de la regidora Céfira han cerrado el paso de montaña. «Por orden de la regidora. El invierno pasado ya los cerramos, y nadie se quejó.» Abajo, dicen, el hielo de una tumba empezó a gotear ese mismo invierno.", c: ["Pagar el peaje (10 Chispas)", "Subir por la ladera helada", "Esperar a que abran"],
      o: ["Se guardan las Chispas y levantan la barrera. Al pasar oyes: «Si preguntan, nunca estuvo cerrado.»", "La ladera resbala y el viento corta, pero llegas arriba. El equipo pierde vida y gana experiencia.", "Esperáis junto a una hoguera. El equipo descansa, pero las criaturas de arriba han tenido tiempo de prepararse."] },
    esporina: { t: "Una curandera de la casa de la Seta cultiva setas pálidas sobre un charco de savia negra. Se llama Esporina. «Mis remedios frenan la savia. Aquí abajo nadie quiere admitirlo, y arriba los han prohibido.»", c: ["Aceptar su remedio", "Preguntarle quién los prohibió", "Rechazarlo con educación"],
      o: ["Sabe a tierra mojada y a algo dulce. El equipo recupera mucha vida. Esporina sonríe: «¿Ves? Nadie se muere por probarlo.»", "«La Casa Albor. Dicen que es para protegernos.» Baja la voz: «Si la savia se puede curar, alguien preguntará de dónde sale.» Ganas experiencia.", "Esporina asiente. Está acostumbrada."] },
    tomb: { t: "La puerta de la Tumba Helada gotea. Junto a ella, un gigante de hielo duerme de pie, con la maza apoyada en el suelo.", c: ["Asomarte por una grieta", "Tapar la gotera con nieve", "Pasar de puntillas"],
      o: ["Dentro solo ves oscuridad y un brillo pequeño, al alcance de la mano. Lo coges sin hacer ruido.", "Cuesta, pero la gotera para. El gigante suspira en sueños. Ganas experiencia.", "Pasáis de puntillas. El gigante no se mueve."] },
    duo: { t: "Tila y Nim te esperan en la entrada del tocón. Unísona dormita entre los dos. «Las nanas de nuestros pueblos son el mismo verso», dice Tila. Nim asiente sin mirarla.", c: ["Pedirles que canten juntos", "Preguntar quién reclama a Unísona", "Dejar que Unísona elija el camino"],
      o: ["Las dos nanas se trenzan y la savia negra retrocede un palmo. El equipo recupera mucha vida.", "«Albor dice que es suya porque nació de la luz. Lóbrego, que de la sombra. Albina, que la soñó primero.» Nim escupe al suelo. «Es de quien la cuide.» Ganas experiencia.", "Unísona revolotea hacia un brillo entre las raíces y vuelve con algo con forma de carta."] },
    albor: { t: "Bajo el tocón hay tubos de cristal clavados en la Raíz, con el sello de la Casa Albor. Por ellos sube luz de raíz hacia los Pozos de Albor, y por las grietas rezuma savia negra.", c: ["Arrancar un tubo", "Seguir los tubos hasta su origen", "Guardar un tubo como prueba"],
      o: ["La Raíz suspira y la savia se calma un poco, pero el cristal os corta. El equipo pierde vida y gana mucha experiencia.", "Los tubos llegan a las Casas del Farol: cada farol del prado bebe de aquí. Ahora sabes de dónde viene la savia negra. Ganas Chispas.", "Te guardas el tubo. Alguien en la Casa Albor tendrá que dar explicaciones. Las próximas criaturas apagadas pegarán más flojo."] },
    cantora: { t: "En medio del Claro hay una estatua cubierta de musgo: la Primera Cantora, la que partió el Canto en nueve. Todos los pueblos le rezan, cada uno con otra cara. Esta tiene la boca abierta, como a mitad de una nota.", c: ["Cantar los versos que llevas", "Quitarle el musgo", "Descansar a su sombra"],
      o: ["Tus versos resuenan en la piedra y, muy lejos, se oyen los otros. Ganas experiencia por cada verso que llevas.", "Bajo el musgo la estatua no tiene una cara: tiene nueve, una por pueblo, mirando hacia fuera. Entre ellas encuentras algo con forma de carta.", "El equipo duerme un rato sin pesadillas y recupera vida."] },
    dreams: { t: "Una familia de la casa del Sueño se acaba de despertar y, como cada mañana, se cuenta lo que ha soñado antes de que se le olvide.", c: ["Contar tu sueño", "Escuchar los suyos", "Seguir tu camino"],
      o: ["Cuentas un sueño sobre un farol y una sombra que cantaban juntos. La abuela se queda muy callada. Ganas experiencia.", "Sueñan con agua que sube, con hielo que llora y con una raíz que tiene sed. El equipo descansa escuchando.", "La familia sigue contando sueños a tu espalda."] },
  },
  en: {
    farol: { t: "A wayside lantern lies in the grass. A thick black sap drips from its base, and the flame shivers as if it were cold.", c: ["Stand it up and wipe off the sap", "Take the oil it has left", "Leave it and move on"],
      o: ["Your paws get sticky, but the flame grows again. The team loses a little health and gains experience.", "You pocket a little flask of oil worth some Chispas. The dimmed creatures ahead seem angrier.", "You move on. The lantern keeps flickering behind you."] },
    patrol: { t: "Two Lantern wardens block the path. \"Threshold Law: after dusk nobody crosses to the Underside. Where are you going?\"", c: ["Tell them you're going to the Great Lantern", "Sneak through the grass", "Offer them 8 Chispas to pass"],
      o: ["They look you up and down and let you through. One whispers: \"If you get there, tell it not all of us are afraid of it.\"", "", "They pocket the Chispas without looking at you and step aside."] },
    tila: { t: "At a bend in the path, Tila from the Dim Quarter is refilling lanterns from an almost empty oil can. \"Got anything to spare? My street won't have light tonight.\"", c: ["Give her 10 Chispas", "Ask her why her quarter is dark", "Keep walking"],
      o: ["Tila smiles and shares a warm herbal drink with you. The team recovers health.", "\"Because light costs, and not everyone gets it for free.\" It stays with you. You gain experience.", "Tila says nothing. She keeps refilling lanterns."] },
    well: { t: "Among the roots of an oak there's a small well glowing from inside, as if someone had dropped a piece of sunrise.", c: ["Drink a sip", "Peer down to the bottom", "Fill a flask"],
      o: ["The water tastes like a summer morning. The team recovers a lot of health.", "Down, far down, the light turns black and moves on its own. Better not to look any longer. You gain experience.", "The flask glows in your bag. There's something card-shaped inside."] },
    dam: { t: "A dam of stone and iron cuts off the stream. On the other side the ground is dry, and there are boat tracks in the mud.", c: ["Open a sluice gate", "Follow the dry bed", "Leave it as it is"],
      o: ["Water runs toward the Underside again. Someone from the Tides will notice. You gain experience, but the steam scalds you a little.", "Next to an abandoned boat you find something shiny.", "You move on. The stream stays dry."] },
    apprentice: { t: "An Ember Guild apprentice has burned their hands working a bellows that never stops.", c: ["Help with the bellows", "Ask why they never stop", "Keep walking"],
      o: ["You take turns for a while. The team ends up tired, but the apprentice gives you some Chispas.", "\"A thousand new lanterns for the Light Houses. Master Tizón says they'll make us respectable.\" You gain experience.", "The bellows keeps wheezing behind you."] },
    ola: { t: "A young woman from the Tides is hauling coal by the forges. In her pocket there's a crumpled letter she never sent.", c: ["Offer to carry her letter", "Share your food", "Let her work"],
      o: ["\"For my sister Orilla, at the Stream camp. Don't tell her where I work.\" Her name is Ola. You keep the letter.", "Ola smiles for the first time in a long while and tells you stories of the Lake. The team recovers health.", "Ola doesn't look up from the coal."] },
    liquen: { t: "Grandpa Liquen of the Moss Council watches over a chest of ancient seeds. \"Nobody enters the wood without leaving something.\"", c: ["Leave 10 Chispas", "Ask him about the Hedge", "Slip past quietly"],
      o: ["The old man nods and opens the chest. Among the seeds there's something card-shaped.", "\"The Hedge protects us. Whatever is under it is none of your business.\" As he says it, his roots tremble. You gain experience.", "You walk past. The old man follows you with his eyes."] },
    vines: { t: "The vines on the path move by themselves. They're black inside, as if they were drinking sap.", c: ["Cut them", "Go through very slowly", "Find another way"],
      o: ["", "", "You take a long but quiet detour."] },
    loggers: { t: "Some loggers are hauling trunks toward the Crater. One of them has twisted an ankle.", c: ["Help carry", "Ask what all the wood is for", "Move on"],
      o: ["You help them to the clearing. They give you some Chispas and a piece of bread.", "\"For the forges. A thousand lanterns, they say. And the wood gets quieter every year.\" You gain experience.", "The loggers go on their way."] },
    court: { t: "A court appears in the fog: stone chairs in a circle around a throne with nobody on it. Beside each chair there's a cup of fresh water.", c: ["Sit on a chair", "Drink from a cup", "Pass without touching anything"],
      o: ["As you sit, the chairs' shadows stand up. \"Nobody sits at court uninvited.\"", "The water tastes of caves and old rain. The team recovers health.", "As you leave the circle you hear a whisper: \"The King is gone. But he still rules.\" You gain experience."] },
    dig: { t: "Shovels sound in the fog. A family of the Shadow folk is digging a deep well in secret. Above its mouth there's a lantern-shaped mark.", c: ["Ask who they're digging for", "Help them for a while", "Slip past unseen"],
      o: ["\"For the Light Above. They pay us with permission to stay. The King signed it.\" They say it without looking at you. You gain experience.", "You dig with them until your paws ache. They give you a few Chispas stained with black earth.", "You walk away quietly. By the path, someone left something behind."] },
    whisper: { t: "Two of King Lóbrego's Whisperers block the path. They wear veils of fog and you can't see their eyes. \"Do you bring word from the Light?\"", c: ["Tell the truth: you're going to the Throne", "Give them 10 Chispas for their silence", "Run through the fog"],
      o: ["\"Then you'll see it's empty. It always was.\" They step aside without a sound. You gain experience.", "They pocket the Chispas. One gives you a tip: \"The ones ahead can't see well in the fog.\" The next dimmed creatures will hit softer.", ""] },
    orilla: { t: "By the water, a woman of the Tides is mending nets. Her name is Orilla, and she has been looking for her sister for a long time.", c: ["Help with the nets", "Ask her about the Lake", "Keep walking"],
      o: ["You mend nets until the light fades. \"My sister Ola went to find work at the Crater. If you see her…\" The team rests and she gives you a few Chispas.", "\"The Lake remembers everything dropped into it. Since the water went down, it remembers things that never happened.\" She lowers her voice: \"I saw it at the bottom: the light drinks from the root.\" You gain experience.", "Orilla keeps mending, watching the water."],
      cL: ["Give her Ola's letter", "Ask her about the Lake", "Keep walking"],
      oL: ["Orilla reads the letter three times. \"She's alive. She works at the forges, doesn't she? I can tell from the coal on the paper.\" She laughs and cries at once, and gives you the best she has: Chispas, food for the team and something card-shaped."] },
    reflection: { t: "In the still water you see your team reflected. But in the reflection there are four of you.", c: ["Touch the reflection", "Wave at the fourth one", "Look away"],
      o: ["The reflection shatters into a thousand drops, and dimmed creatures climb out of them…", "The fourth one waves back a moment too late. Then it's gone. You gain experience.", "You take a deep breath and move on. The team rests a little."] },
    boats: { t: "Boats stranded in the mud. The Lake's water has dropped since the stream was dammed.", c: ["Push a boat into the water", "Search the boats", "Leave them"],
      o: ["You push until the boat floats. It's hard work, but you gain experience.", "Among the old nets you find something shiny.", "The boats stay in the mud."],
      dam: "Thanks to the sluice gate you opened at the Crater, a little more water reaches here. The boat floats by itself and carries you a stretch: the team rests and you gain experience." },
    gravasong: { t: "A song drifts through the caves in pieces, as if someone far away were singing it and the rock only let a few words through.", c: ["Sing along", "Follow the sound", "Cover your ears"],
      o: ["Your voice comes back many times over and, for a moment, the song sounds whole. You gain experience.", "The sound leads you to a crack. Inside, something glitters.", "Silence is restful too. The team recovers some health."] },
    tunnels: { t: "A new tunnel, straight and smooth, cuts through the old caves. There are lantern-shaped marks on the walls, and here the echo doesn't come back.", c: ["Follow the new tunnel", "Block it with stones", "Go back to the old path"],
      o: ["At the end there are Light House tools and a bag of Chispas. Something in the dark gets angry.", "It's hard work, but the echo comes back a little. You gain experience.", "You go back to the old path. The echo keeps you company."] },
    miners: { t: "A group of miners from the Deep is trapped behind a rockfall. You can hear them knocking on the rock.", c: ["Clear the rocks", "Pass them water through a crack", "Move on"],
      o: ["It takes a while, but they all get out. \"No miner left behind,\" they say, and give you what they have on them.", "They thank you for the crack. \"Grava won't let anyone in any more,\" they tell you. You gain experience.", "The knocking keeps sounding behind you."] },
    coplo: { t: "A Sky minstrel sings at a lookout, with a hat full of coins at his feet. His name is Coplo and he looks for lost verses of the Song. Right now he's singing \"The Rotten Water\", the ballad he gets paid most for.", c: ["Pay him 8 Chispas for a song", "Ask who commissioned that ballad", "Sing him a verse of the Song you already have"],
      o: ["He sings you an old song about a root that joins everything. The team cheers up and recovers health.", "\"Some gentlemen with fog veils. They paid well.\" He shrugs. He doesn't know they were the King's Whisperers. You gain experience.", "Coplo writes your verse down in a notebook full of crossings-out. In return he gives you something card-shaped."] },
    news: { t: "A messenger from the Thunder Spire sells fresh news at a crossroads. \"Everything happening in the valley, for next to nothing!\"", c: ["Buy a piece of news (6 Chispas)", "Sell him a piece of news", "Walk on without listening"],
      o: ["\"The creatures further up are tired: they haven't slept in days.\" The next dimmed creatures will hit softer.", "You tell him what you saw in the Underside. He pays you a few Chispas and runs off to sell it.", "The messenger is already shouting the news at another traveller."] },
    pass: { t: "Warden Céfira's guards have closed the mountain pass. \"By order of the warden. We closed it last winter too, and nobody complained.\" Down below, they say, the ice of a tomb started dripping that same winter.", c: ["Pay the toll (10 Chispas)", "Climb the icy slope", "Wait for them to open it"],
      o: ["They pocket the Chispas and lift the barrier. As you pass you hear: \"If anyone asks, it was never closed.\"", "The slope is slippery and the wind cuts, but you make it up. The team loses health and gains experience.", "You wait by a bonfire. The team rests, but the creatures up ahead have had time to get ready."] },
    esporina: { t: "A healer of the House of Mushrooms grows pale mushrooms on a puddle of black sap. Her name is Esporina. \"My remedies slow the sap. Down here nobody wants to admit it, and up there they've banned them.\"", c: ["Accept her remedy", "Ask who banned them", "Politely refuse"],
      o: ["It tastes of wet earth and something sweet. The team recovers a lot of health. Esporina smiles: \"See? Nobody dies from trying it.\"", "\"House Albor. They say it's to protect us.\" She lowers her voice: \"If the sap can be cured, someone will ask where it comes from.\" You gain experience.", "Esporina nods. She's used to it."] },
    tomb: { t: "The door of the Frozen Tomb is dripping. Beside it an ice giant sleeps standing up, its club resting on the ground.", c: ["Peek through a crack", "Plug the leak with snow", "Tiptoe past"],
      o: ["Inside you see only darkness and a small glint, within arm's reach. You take it without a sound.", "It's hard work, but the leak stops. The giant sighs in its sleep. You gain experience.", "You tiptoe past. The giant doesn't move."] },
    duo: { t: "Tila and Nim wait for you at the mouth of the stump. Unísona dozes between them. \"Our peoples' lullabies are the same verse,\" says Tila. Nim nods without looking at her.", c: ["Ask them to sing together", "Ask who claims Unísona", "Let Unísona pick the path"],
      o: ["The two lullabies braid together and the black sap pulls back a hand's width. The team recovers a lot of health.", "\"Albor says it's theirs because it was born of light. Lóbrego says of shadow. Albina says she dreamed it first.\" Nim spits on the ground. \"It belongs to whoever looks after it.\" You gain experience.", "Unísona flutters toward a glint among the roots and comes back with something card-shaped."] },
    albor: { t: "Under the stump, glass tubes are driven into the Root, stamped with the seal of House Albor. Root-light rises through them toward the Wells of Albor, and black sap seeps from the cracks they leave.", c: ["Pull out a tube", "Follow the tubes to their source", "Keep a tube as proof"],
      o: ["The Root sighs and the sap calms a little, but the glass cuts you. The team loses health and gains a lot of experience.", "The tubes run to the Lantern Houses: every lantern in the meadow drinks from here. Now you know where the black sap comes from. You gain Chispas.", "You keep the tube. Someone in House Albor will have to explain. The next dimmed creatures will hit softer."] },
    cantora: { t: "In the middle of the Glade stands a moss-covered statue: the First Singer, who split the Song into nine. Every people prays to her, each with a different face. This one has its mouth open, as if halfway through a note.", c: ["Sing the verses you carry", "Clear away the moss", "Rest in her shade"],
      o: ["Your verses ring in the stone and, far away, the others can be heard. You gain experience for every verse you carry.", "Under the moss the statue doesn't have one face: it has nine, one per people, looking outward. Among them you find something card-shaped.", "The team sleeps a while without nightmares and recovers health."] },
    dreams: { t: "A family of the House of Dreams has just woken up and, like every morning, they tell each other what they dreamed before they forget.", c: ["Tell your dream", "Listen to theirs", "Keep walking"],
      o: ["You tell a dream about a lantern and a shadow singing together. The grandmother goes very quiet. You gain experience.", "They dream of rising water, of ice that weeps and of a thirsty root. The team rests while listening.", "The family keeps telling dreams behind you."] },
  },
};
const vineTx = { es: ["Las enredaderas se revuelven y despiertan a las criaturas del bosque…", "Pasáis sin que os toquen. Ganas experiencia.", "Las enredaderas os arañan al pasar. El equipo pierde algo de vida."], en: ["The vines thrash and wake the wood's creatures…", "You get through untouched. You gain experience.", "The vines scratch you as you pass. The team loses some health."] };
const fogTx = { es: ["Corres a ciegas y sales al otro lado. En el suelo hay algo que se les cayó.", "La niebla se cierra a tu alrededor y salen criaturas apagadas…"], en: ["You run blind and come out the other side. On the ground there's something they dropped.", "The fog closes in around you and dimmed creatures appear…"] };
const sneakTx = { es: ["Te cuelas sin que te vean. Al otro lado encuentras algo que se les cayó.", "Te pillan. «¡Alto ahí!» Los guardas llaman a unas criaturas apagadas…"], en: ["You slip past unseen. On the other side you find something they dropped.", "They spot you. \"Halt!\" The wardens call in some dimmed creatures…"] };
function eventHtml() {
  const E = EVT[L()][X.event];
  if (X.eventOut == null) {
    const ch = X.event === "orilla" && hasLetter() ? E.cL : E.c;
    return `<div class="panel"><div class="sub">${esc(tx("node.event"))}</div><p class="evt-text">${esc(E.t)}</p><div class="choices">${ch.map((c, i) => {
      const poor = (X.event === "patrol" && i === 2 && EV.P.coins < 8) || ((X.event === "tila" || X.event === "liquen") && i === 0 && EV.P.coins < 10) || (X.event === "whisper" && i === 1 && EV.P.coins < 10) || (X.event === "coplo" && i === 0 && EV.P.coins < 8) || (X.event === "news" && i === 0 && EV.P.coins < 6) || (X.event === "pass" && i === 0 && EV.P.coins < 10);
      return `<button class="btn ghost" type="button" data-ev="${i}" ${poor ? "disabled" : ""}>${esc(c)}</button>`;
    }).join("")}</div></div><div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}</div>`;
  }
  return `<div class="panel"><div class="sub">${esc(tx("node.event"))}</div><p class="evt-text">${esc(X.eventOut)}</p><div class="bctl"><button class="btn" type="button" data-x="${X.eventFight ? "evfight" : "evnext"}">${esc(tx("r.continue"))}</button></div></div><div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}${lootHtml()}</div>`;
}
const hasLetter = () => !!(EV.P.flags && EV.P.flags.olaLetter && !EV.P.flags.olaDelivered);
const hurtParty = (f) => { for (const m of X.party) if (m.hp > 0) m.hp = Math.max(0.05, m.hp - f); };
const healParty = (f) => { for (const m of X.party) if (m.hp > 0) m.hp = Math.min(1, m.hp + f); };
function chooseEvent(i) {
  const E = EVT[L()][X.event];
  X.eventFight = false; X.eventCard = null;
  let out = E.o[i];
  switch (X.event) {
    case "farol":
      if (i === 0) { for (const m of X.party) if (m.hp > 0) m.hp = Math.max(0.05, m.hp - 0.1); X.loot.xp += 15; }
      if (i === 1) { X.loot.coins += 12; X.nextFoeBuff = 15; }
      break;
    case "patrol":
      if (i === 0) X.loot.xp += 8;
      if (i === 1) { if (rnd() < 0.5) { out = sneakTx[L()][0]; X.eventCard = true; } else { out = sneakTx[L()][1]; X.eventFight = true; } }
      if (i === 2) { EV.spendCoins(8); X.loot.xp += 4; }
      break;
    case "tila":
      if (i === 0) { EV.spendCoins(10); healParty(0.4); X.loot.xp += 10; }
      if (i === 1) X.loot.xp += 12;
      break;
    case "dam":
      if (i === 0) { hurtParty(0.08); X.loot.xp += 16; EV.P.flags = Object.assign(EV.P.flags || {}, { damOpen: 1 }); }
      if (i === 1) X.eventCard = true;
      break;
    case "apprentice":
      if (i === 0) { hurtParty(0.1); X.loot.coins += 10; X.loot.xp += 6; }
      if (i === 1) X.loot.xp += 12;
      break;
    case "ola":
      if (i === 0) { X.loot.xp += 15; EV.P.flags = Object.assign(EV.P.flags || {}, { olaLetter: 1 }); }
      if (i === 1) healParty(0.3);
      break;
    case "liquen":
      if (i === 0) { EV.spendCoins(10); X.eventCard = true; }
      if (i === 1) X.loot.xp += 12;
      break;
    case "vines":
      if (i === 0) { out = vineTx[L()][0]; X.eventFight = true; X.loot.xp += 6; }
      if (i === 1) { if (rnd() < 0.5) { out = vineTx[L()][1]; X.loot.xp += 10; } else { out = vineTx[L()][2]; hurtParty(0.15); } }
      break;
    case "loggers":
      if (i === 0) { X.loot.coins += 8; healParty(0.1); }
      if (i === 1) X.loot.xp += 12;
      break;
    case "court":
      if (i === 0) { X.eventFight = true; X.loot.xp += 8; }
      if (i === 1) healParty(0.3);
      if (i === 2) X.loot.xp += 12;
      break;
    case "dig":
      if (i === 0) X.loot.xp += 14;
      if (i === 1) { hurtParty(0.1); X.loot.coins += 10; }
      if (i === 2) X.eventCard = true;
      break;
    case "whisper":
      if (i === 0) X.loot.xp += 12;
      if (i === 1) { EV.spendCoins(10); X.nextFoeBuff = -15; }
      if (i === 2) { if (rnd() < 0.5) { out = fogTx[L()][0]; X.eventCard = true; } else { out = fogTx[L()][1]; X.eventFight = true; } }
      break;
    case "orilla":
      if (i === 0 && hasLetter()) { out = E.oL[0]; EV.P.flags.olaDelivered = 1; X.loot.coins += 25; X.loot.xp += 20; healParty(0.4); X.eventCard = true; }
      else if (i === 0) { healParty(0.15); X.loot.coins += 6; }
      if (i === 1) X.loot.xp += 14;
      break;
    case "reflection":
      if (i === 0) { X.eventFight = true; X.loot.xp += 6; }
      if (i === 1) X.loot.xp += 14;
      if (i === 2) healParty(0.2);
      break;
    case "boats":
      if (i === 0) { if (EV.P.flags && EV.P.flags.damOpen) { out = E.dam; healParty(0.3); } else hurtParty(0.1); X.loot.xp += 14; }
      if (i === 1) X.eventCard = true;
      break;
    case "gravasong":
      if (i === 0) X.loot.xp += 16;
      if (i === 1) X.eventCard = true;
      if (i === 2) healParty(0.15);
      break;
    case "tunnels":
      if (i === 0) { X.loot.coins += 12; X.nextFoeBuff = 15; }
      if (i === 1) { hurtParty(0.1); X.loot.xp += 16; }
      break;
    case "miners":
      if (i === 0) { hurtParty(0.15); X.loot.coins += 10; X.loot.xp += 10; }
      if (i === 1) X.loot.xp += 8;
      break;
    case "coplo":
      if (i === 0) { EV.spendCoins(8); healParty(0.3); }
      if (i === 1) X.loot.xp += 14;
      if (i === 2) X.eventCard = true;
      break;
    case "news":
      if (i === 0) { EV.spendCoins(6); X.nextFoeBuff = -15; }
      if (i === 1) X.loot.coins += 10;
      break;
    case "pass":
      if (i === 0) { EV.spendCoins(10); X.loot.xp += 6; }
      if (i === 1) { hurtParty(0.15); X.loot.xp += 18; }
      if (i === 2) { healParty(0.3); X.nextFoeBuff = 15; }
      break;
    case "duo":
      if (i === 0) healParty(0.45);
      if (i === 1) X.loot.xp += 20;
      if (i === 2) X.eventCard = true;
      break;
    case "albor":
      if (i === 0) { hurtParty(0.15); X.loot.xp += 28; }
      if (i === 1) { X.loot.coins += 18; EV.P.flags = Object.assign(EV.P.flags || {}, { alborTruth: 1 }); }
      if (i === 2) { X.nextFoeBuff = -15; EV.P.flags = Object.assign(EV.P.flags || {}, { alborProof: 1 }); }
      break;
    case "cantora":
      if (i === 0) X.loot.xp += 4 * Object.keys(EV.P.cleared || {}).filter((z) => EV.P.cleared[z] > 0).length;
      if (i === 1) X.eventCard = true;
      if (i === 2) healParty(0.35);
      break;
    case "esporina":
      if (i === 0) { healParty(0.5); EV.P.flags = Object.assign(EV.P.flags || {}, { sporeRemedy: 1 }); }
      if (i === 1) X.loot.xp += 16;
      break;
    case "tomb":
      if (i === 0) X.eventCard = true;
      if (i === 1) { hurtParty(0.1); X.loot.xp += 16; }
      break;
    case "dreams":
      if (i === 0) X.loot.xp += 14;
      if (i === 1) healParty(0.25);
      break;
    case "well":
      if (i === 0) healParty(0.5);
      if (i === 1) X.loot.xp += 14;
      if (i === 2) X.eventCard = true;
      break;
  }
  X.eventOut = out;
  EV.sfx("tap");
  render();
}

/* ---------- Ending the trip ---------- */
function finish(res) {
  const S = EV.S, P = EV.P;
  const R = rpgState();
  const l = X.loot;
  const xp = res === "win" ? l.xp : Math.floor(l.xp / 2);
  const coins = res === "win" ? l.coins : Math.floor(l.coins / 2);
  const before = R ? R.lvl : 1;
  const unlocked = [];
  if (R) {
    R.xp += xp;
    while (R.xp >= xpNeed(R.lvl)) { R.xp -= xpNeed(R.lvl); R.lvl++; for (const k of ["p", "s"]) if (SLOT_LVL[k] === R.lvl) unlocked.push(k); }
  }
  if (coins > 0) EV.addCoins(coins, true);
  if (res === "win") { P.c.guard = (P.c.guard || 0) + 1; P.cleared = P.cleared || {}; P.cleared[X.zone] = (P.cleared[X.zone] || 0) + 1; }
  X.unisona = null;
  if (res === "win" && X.zone === "heart") {
    const F = P.flags = P.flags || {};
    if (!F.unisona) { F.unisona = 1; for (const id of MONS.unisona.cards) { giveCard(id, 0); l.cards.push({ id, g: 0 }); } X.unisona = "first"; }
    else { const id = MONS.unisona.cards[Math.floor(rnd() * 3)]; giveCard(id, 0); l.cards.push({ id, g: 0 }); X.unisona = "again"; }
  }
  if (res === "win" || res === "lose") P.c.expDone = (P.c.expDone || 0) + 1;
  // zone stars: keep the best, 3 Song Notes the first time a zone reaches 3
  X.starInfo = null;
  if (res === "win" && X.stars) {
    P.stars = P.stars || {}; P.star3 = P.star3 || {};
    const before = P.stars[X.zone] || 0;
    const gained = Math.max(0, X.stars - before);
    if (gained) { P.stars[X.zone] = X.stars; P.c.starsGot = (P.c.starsGot || 0) + gained; }
    let bonus = false;
    if (X.stars === 3 && !P.star3[X.zone]) { P.star3[X.zone] = 1; P.notes = (P.notes || 0) + 3; bonus = true; }
    X.starInfo = { n: X.stars, best: gained > 0, bonus };
  }
  if (S && S.phase === "alive") {
    S.stats.fun = Math.min(100, S.stats.fun + 10); S.stats.full = Math.max(0, S.stats.full - 15); S.stats.clean = Math.max(0, S.stats.clean - 20);
    // wounds: the more health the creature lost on the trip, the more energy and health it loses at home
    const w = woundsOf();
    const dEnergy = Math.round(30 * w), dHealth = Math.round(35 * w) + 5 * (X.ownFalls || 0);
    S.stats.energy = Math.max(0, S.stats.energy - dEnergy);
    S.stats.health = Math.max(10, S.stats.health - dHealth); // never so low that it wanders off
    X.hurt = { energy: dEnergy, health: dHealth };
    EV.addLog(tx(res === "win" ? "log.expWin" : "log.expLose", { name: S.name, from: zt("from") }));
  }
  // a card for every two levels gained
  let lvlPick = null;
  if (R) for (let lv = before + 1; lv <= R.lvl; lv++) if (lv % 2 === 0) { lvlPick = offerCards(3, 0); break; }
  X.end = { res, xp, coins, before, after: R ? R.lvl : 1, unlocked, lvlPick, cards: l.cards.slice() };
  EV.save(); EV.checkAch();
  show("end");
}
const starStr = (n) => "★".repeat(n) + "☆".repeat(3 - n);
function woundsOf() {
  const own = X && X.party && X.party.find((m) => m.own);
  return own ? Math.max(0, Math.min(1, 1 - own.hp)) : 0;
}
function endHtml() {
  const e = X.end, S = EV.S;
  const nm = S && S.name ? S.name : "";
  const title = e.res === "win" ? zt("win") : e.res === "quit" ? tx("end.quit") : tx("end.lose");
  const text = e.res === "win" ? zt("winText", { name: nm }) : tx("end.loseText", { name: nm });
  let html = `<div class="panel"><h3>${esc(title)}</h3><p class="evt-text">${esc(text)}</p>
    <div class="loot"><span>${esc(tx("r.xp", { n: e.xp }))}</span><span>✦ ${esc(tx("r.coins", { n: e.coins }))}</span><span>🃏 ${e.cards.length}</span></div>`;
  if (X.hurt && (X.hurt.energy || X.hurt.health)) html += `<p class="evt-out">${esc(tx("end.hurt", { name: nm, e: X.hurt.energy, h: X.hurt.health }))}</p>`;
  else html += `<p class="evt-out">${esc(tx("end.unhurt", { name: nm }))}</p>`;
  if (e.res === "win") html += `<p class="evt-out">✦ ${esc(tx("end.verse", { v: zt("verse") }))}</p>`;
  if (X.unisona) html += `<p class="evt-out">✦ ${esc(tx(X.unisona === "first" ? "end.unisona" : "end.unisonaUp"))}</p>`;
  if (X.starInfo) html += `<p class="evt-out end-stars"><b>${esc(tx("end.stars", { s: starStr(X.starInfo.n) }))}</b>${X.starInfo.best ? " · " + esc(tx("end.starsNew")) : ""}${X.starInfo.bonus ? "<br>♪ " + esc(tx("end.star3")) : ""}<br><small>${esc(tx("end.starsWhy"))}</small></p>`;
  if (e.after > e.before) html += `<p class="evt-out">${esc(tx("end.lvl", { name: nm, n: e.after }))}</p>`;
  for (const k of e.unlocked) html += `<p class="evt-out">${esc(tx("end.slot", { slot: tx("slot." + k) }))}</p>`;
  if (e.cards.length) html += `<div class="rcards">${e.cards.map((c) => cardHtml(c.id, c.g)).join("")}</div>`;
  if (e.lvlPick) {
    html += `<h3>${esc(tx("end.lvlPick"))}</h3><div class="rcards">${e.lvlPick.map((o, i) => cardHtml(o.id, o.g, { foot: `<div class="rc-btns"><button class="btn" type="button" data-lvlpick="${i}">${esc(tx("r.pick"))}</button></div>` })).join("")}</div>`;
  } else html += `<div class="bctl"><button class="btn" type="button" data-x="home">${esc(tx("end.home"))}</button></div>`;
  return html + "</div>";
}
function goHome() {
  if (battle) { cancelAnimationFrame(battle.raf); battle = null; }
  X = null; view = null;
  EV.showScreen(); EV.renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Event wiring ---------- */
function onExpClick(e) {
  const t = e.target.closest("button"); if (!t || !X) return;
  const d = t.dataset;
  if (d.zone) { EV.sfx("tap"); pickZone(d.zone); return; }
  if (d.pick) {
    const k = d.pick, i = X.chosen.indexOf(k);
    if (i >= 0) X.chosen.splice(i, 1); else { if (X.chosen.length >= 2) X.chosen.shift(); X.chosen.push(k); }
    EV.sfx("tap"); render(); return;
  }
  if (d.node) {
    EV.sfx("tap");
    const n = d.node;
    if (n === "fight") startBattle(false);
    else if (n === "boss") startBattle(true);
    else if (n === "rest") { healParty(0.35); for (const m of X.party) if (m.hp <= 0) m.hp = 0.2; EV.sfx("heal"); X.reward = { title: tx("node.rest"), text: tx("node.rest.d"), after: "next" }; show("reward"); }
    else if (n === "chest") { X.reward = { title: tx("node.chest"), offer: offerCards(3, 0), after: "next" }; show("reward"); }
    else if (n === "event") { X.event = rollEvent(); X.eventOut = null; show("event"); }
    return;
  }
  if (d.ev != null) { EV.P.c.evChoices = (EV.P.c.evChoices || 0) + 1; chooseEvent(+d.ev); return; }
  if (d.take != null) {
    const i = +d.take, r = X.reward;
    if (i >= 0 && r && r.offer) { const o = r.offer[i]; giveCard(o.id, o.g); X.loot.cards.push(o); EV.toast(tx("r.card", { card: cardName(o.id) }), GRADES[o.g][L()]); EV.sfx("card"); EV.save(); EV.checkAch(); }
    afterReward(); return;
  }
  if (d.lvlpick != null) { const o = X.end.lvlPick[+d.lvlpick]; giveCard(o.id, o.g); X.end.cards.push(o); X.end.lvlPick = null; EV.toast(tx("r.card", { card: cardName(o.id) }), GRADES[o.g][L()]); EV.sfx("card"); EV.save(); EV.checkAch(); render(); return; }
  if (d.b) { if (battle && battle.waiting) { const w = battle.waiting; battle.waiting = null; renderTurn(); EV.sfx("tap"); w.resolve(d.b === "card"); } return; }
  if (d.m) { EV.P.rpgMode = d.m; EV.saveProfile(); t.parentNode.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === t))); if (d.m === "auto" && battle && battle.waiting) { const w = battle.waiting; battle.waiting = null; renderTurn(); w.resolve(battle.b.wantPlay(w.u)); } return; }
  if (d.s) { EV.P.rpgSpeed = +d.s; EV.saveProfile(); t.parentNode.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === t))); return; }
  switch (d.x) {
    case "go": EV.sfx("tap"); setOut(); break;
    case "cancel": X = null; goHome(); break;
    case "quit": finish("quit"); break;
    case "continue": afterReward(); break;
    case "evnext":
      if (X.eventCard) { X.eventCard = null; X.reward = { title: tx("node.chest"), offer: offerCards(3, 0), after: "next" }; show("reward"); }
      else nextSection();
      break;
    case "evfight": X.eventFight = false; startBattle(false); break;
    case "home": goHome(); break;
  }
}

/* ====================================================================== */
/* Cards panel                                                            */
/* ====================================================================== */
let cTab = "col", lastPack = null;
function cardTabs() {
  return `<div class="seg ctabs" role="group">${["col", "grim", "shop"].map((k) => `<button type="button" data-ctab="${k}" aria-pressed="${cTab === k}">${esc(tx("ctab." + k))}</button>`).join("")}</div>`;
}
function grimHtml() {
  const P = EV.P, all = Object.keys(CARDS), seen = all.filter((id) => (P.grim || {})[id]).length;
  let h = `<p class="muted" style="margin:0">${esc(tx("grim.desc"))}</p><p class="progress">${esc(tx("grim.count", { n: seen, m: all.length }))} · ${esc(tx("dust.have", { n: P.dust || 0 }))}</p>`;
  const circles = [["sol", ["fire", "plant", "light"]], ["sky", ["bolt", "air", "music"]], ["lake", ["water", "stone", "shadow"]], ["frost", ["ice", "mush", "dream"]], ["star", ["star"]]];
  for (const [ck, types] of circles) {
    const ids = grimIds(types); if (!ids.length) continue;
    const got = ids.filter((id) => P.grim[id]).length;
    h += `<h3 class="cat-title">${esc(tx("grim.circle." + ck))} · ${got} / ${ids.length}${got === ids.length ? " ✓" : ""}</h3>`;
    for (const ty of types) {
      const tids = grimIds([ty]); if (!tids.length) continue;
      h += `<p class="rc-copies">${typeChip(ty)} <span class="progress">${tids.filter((id) => P.grim[id]).length} / ${tids.length}</span></p><div class="rcards">`;
      for (const id of tids) {
        const C = CARDS[id], boss = !!C.boss || !!C.story, owner = C.by && MONS[C.by] ? monName(C.by) : "";
        const craft = boss ? `<p class="rc-cant">${esc(tx(C.story ? "grim.story" : "grim.boss"))}</p>` : `<div class="rc-btns"><button class="btn ghost" type="button" data-craft="${id}" ${(P.dust || 0) < CRAFT_COST ? "disabled" : ""}>${esc(tx("grim.craft", { c: CRAFT_COST }))}</button></div>`;
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
  let h = `<div class="slotbox" style="border-style:solid"><strong style="font-family:var(--font-display);font-size:18px">${esc(tx("dust.have", { n: P.dust || 0 }))}</strong><p class="muted">${esc(tx("dust.desc", { c: CRAFT_COST }))}</p></div>`;
  h += `<div class="slotbox" style="border-style:solid"><strong style="font-family:var(--font-display);font-size:18px">${esc(tx("pack.title"))}</strong><p class="muted">${esc(left > 0 ? tx("pack.desc", { m: PACK.perDay, n: left }) : tx("pack.none"))}</p>
    <div class="rc-btns"><button class="btn" type="button" data-pack="1" ${left <= 0 || P.coins < PACK.price ? "disabled" : ""}>${esc(tx("pack.btn", { c: PACK.price }))}</button></div></div>`;
  if (lastPack) h += `<h3 class="cat-title">${esc(tx("pack.got"))}</h3><div class="rcards">${lastPack.map((c) => cardHtml(c.id, c.g, { foot: cantNote(c.id) })).join("")}</div>`;
  return h;
}
function renderCards() {
  const el = $("cardsPanel"); if (!el) return;
  const R = rpgState(), P = EV.P, S = EV.S;
  if (cTab !== "col") {
    el.innerHTML = `<div class="panel-head"><h2>${esc(tx(cTab === "grim" ? "ctab.grim" : "ctab.shop"))}</h2>${cardTabs()}</div>` + (cTab === "grim" ? grimHtml() : workshopHtml());
    return;
  }
  let html = `<div class="panel-head"><h2>${esc(tx("cards.title"))}</h2>${cardTabs()}<span class="progress">${esc(tx("cards.owned", { n: P.cards.length }))}</span></div><p class="muted" style="margin:0">${esc(tx("cards.desc"))}</p>`;
  if (R) {
    const u = makeUnit(ownUnitOpts(1));
    const need = xpNeed(R.lvl);
    html += `<div class="slotbox" style="border-style:solid"><div class="panel-head"><strong style="font-family:var(--font-display);font-size:18px">${esc(S.name)} · ${esc(tx("cards.lvl", { n: R.lvl }))}</strong><span>${u.types.map(typeChip).join(" ")}</span></div>
      <div class="bar xpbar"><i style="width:${Math.round(100 * R.xp / need)}%"></i></div><p class="rstats">${esc(tx("cards.xp", { x: R.xp, y: need }))}</p>${ownSheetHtml()}</div>`;
    html += `<div class="slots">${["a", "p", "s"].map((k) => {
      const locked = R.lvl < SLOT_LVL[k];
      const c = R.eq[k] && cardByUid(R.eq[k]);
      return `<div class="slotbox"><p class="sub">${esc(tx("slot." + k))}${locked ? " · 🔒 " + esc(tx("slot.lock", { n: SLOT_LVL[k] })) : ""}</p>${c ? cardHtml(c.id, c.g, { slot: k, foot: `<div class="rc-btns"><button class="btn ghost" type="button" data-unequip="${k}">${esc(tx("cards.unequip"))}</button></div>` }) : `<p class="muted">${esc(tx("cards.empty"))}</p>`}</div>`;
    }).join("")}</div>`;
  } else html += `<p class="muted">${esc(tx("cards.noCreature"))}</p>`;
  if (R) html += `<p class="muted">${esc(canTypesText())}</p>`;
  // collection: one entry per card (shown at its best grade), with the copies of each grade underneath
  const groups = {};
  for (const c of P.cards) (groups[c.id] = groups[c.id] || []).push(c);
  const bestG = (id) => Math.max(...groups[id].map((c) => c.g));
  const ids = Object.keys(groups).sort((a, b) => (usable(b) - usable(a)) || bestG(b) - bestG(a) || cardName(a).localeCompare(cardName(b)));
  const eqSet = R ? new Set(Object.values(R.eq).filter(Boolean)) : new Set();
  html = html.replace(esc(tx("cards.owned", { n: P.cards.length })), esc(tx("cards.owned", { n: ids.length })));
  html += `<div class="rcards">${ids.map((id) => {
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
  }).join("")}</div>`;
  el.innerHTML = html;
}
function onCardsClick(e) {
  const t = e.target.closest("button"); if (!t || t.disabled) return;
  const R = rpgState(); const P = EV.P;
  if (t.dataset.ctab) { cTab = t.dataset.ctab; EV.sfx("tap"); renderCards(); return; }
  if (t.dataset.dust) {
    const c = cardByUid(t.dataset.dust), eqSet = R ? new Set(Object.values(R.eq).filter(Boolean)) : new Set();
    if (!c || eqSet.has(c.uid) || P.cards.filter((x) => x.id === c.id).length < 2) return;
    P.cards = P.cards.filter((x) => x !== c); P.dust = (P.dust || 0) + DUST_OF(c.g); P.c.dusted = (P.c.dusted || 0) + 1;
    EV.toast(tx("dust.got", { n: DUST_OF(c.g) }), "∴"); EV.sfx("coin"); EV.save(); EV.checkAch(); renderCards(); return;
  }
  if (t.dataset.craft) {
    const id = t.dataset.craft; if (!CARDS[id] || CARDS[id].boss || CARDS[id].story) return;
    if ((P.dust || 0) < CRAFT_COST) { EV.toast(tx("dust.poor")); EV.sfx("deny"); return; }
    P.dust -= CRAFT_COST; giveCard(id, 0);
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
    if (!c || !usable(c.id)) { EV.sfx("deny"); return; }
    // no duplicate card on one creature: remove the same card id from other slots
    for (const k of ["a", "p", "s"]) { const o = R.eq[k] && cardByUid(R.eq[k]); if (o && (o.uid === uid || o.id === c.id)) R.eq[k] = null; }
    R.eq[slot] = uid; P.c.equips = (P.c.equips || 0) + 1; EV.sfx("card"); EV.save(); renderCards(); return;
  }
  if (t.dataset.unequip && R) { R.eq[t.dataset.unequip] = null; EV.sfx("tap"); EV.save(); renderCards(); return; }
  if (t.dataset.fuse) {
    const [id, g] = t.dataset.fuse.split(":"); const gi = +g;
    const eqSet = R ? new Set(Object.values(R.eq).filter(Boolean)) : new Set();
    // use free copies first; if an equipped copy goes in, the new card takes its slot
    const same = P.cards.filter((c) => c.id === id && c.g === gi).sort((a, b) => eqSet.has(a.uid) - eqSet.has(b.uid));
    const used = same.slice(0, UPGRADE_N);
    if (used.length < UPGRADE_N || gi >= GRADES.length - 1) return;
    P.cards = P.cards.filter((c) => !used.includes(c));
    const nc = giveCard(id, gi + 1); P.c.fused = (P.c.fused || 0) + 1;
    if (R) for (const k of ["a", "p", "s"]) if (used.some((c) => c.uid === R.eq[k])) R.eq[k] = nc.uid;
    EV.toast(tx("cards.fused", { card: cardName(id), g: GRADES[gi + 1][L()] })); EV.sfx("grow"); EV.save(); EV.checkAch(); renderCards();
  }
}

/* ====================================================================== */
/* Hooks into the main game                                               */
/* ====================================================================== */
function refreshHome() {
  const S = EV.S, btn = $("aExp"), chip = $("btnCards");
  const alive = S && S.phase === "alive";
  chip.hidden = !(alive && S.stage >= 1) && !(EV.P.cards && EV.P.cards.length);
  homeSheet(alive);
  if (!alive) { btn.hidden = true; return; }
  btn.hidden = false;
  const why = expCheck();
  btn.textContent = tx("act.exp") + (why ? "" : " · " + tx("exp.cost"));
  btn.disabled = !!why;
  btn.title = why ? tx("exp.need." + why) : "";
  let w = $("aExpWhy");
  if (!w) { w = document.createElement("p"); w.id = "aExpWhy"; w.className = "exp-why"; btn.after(w); }
  w.textContent = why ? tx("exp.need." + why) : "";
  let r = $("aRecharge");
  if (!r) { r = document.createElement("button"); r.id = "aRecharge"; r.type = "button"; r.className = "btn ghost exp-go"; w.after(r); r.addEventListener("click", recharge); }
  r.textContent = tx("recharge", { n: RECHARGE.amount, c: RECHARGE.price });
  r.hidden = S.stats.energy >= 70;
  r.disabled = EV.P.coins < RECHARGE.price;
}
function homeSheet(alive) {
  let pn = $("sheetPanel");
  if (!pn) {
    const status = $("b_full") && $("b_full").closest(".panel"); if (!status) return;
    pn = document.createElement("div"); pn.id = "sheetPanel"; pn.className = "panel"; status.after(pn);
  }
  const S = EV.S, R = rpgState();
  if (!alive || !S || S.stage < 1 || !R) { pn.hidden = true; return; }
  pn.hidden = false;
  const html = `<h3>${esc(tx("sh.title"))}</h3><p class="muted" style="margin:0 0 6px;font-size:13px">${esc(tx("sh.sub", { n: R.lvl }))}</p>${ownSheetHtml()}`;
  if (pn.innerHTML !== html) pn.innerHTML = html;
}
// pay Chispas for an energy boost (energy otherwise only refills slowly while sleeping)
const RECHARGE = { amount: 40, price: 12 };
function recharge() {
  const S = EV.S; if (!S || S.phase !== "alive") return;
  if (S.stats.energy >= 90) { EV.toast(tx("recharge.full")); return; }
  if (!EV.spendCoins(RECHARGE.price)) { EV.toast(EV.t("toast.poor")); EV.sfx("deny"); return; }
  S.stats.energy = Math.min(100, S.stats.energy + RECHARGE.amount);
  EV.sfx("heal"); EV.buzz(20); EV.toast(tx("recharge.done"), "+" + RECHARGE.amount);
  EV.save(); EV.renderStats(); refreshHome();
}
EV.HOOKS.showScreen = function () {
  const S = EV.S;
  const inExp = !!X && S && S.phase === "alive";
  if (X && (!S || S.phase !== "alive")) { if (battle) { cancelAnimationFrame(battle.raf); battle = null; } X = null; }
  $("scrExp").hidden = !inExp;
  if (inExp) { $("scrGame").hidden = true; render(); }
  refreshHome();
  if (!$("cardsPanel").hidden) renderCards();
};
EV.HOOKS.renderCards = renderCards;
$("aExp").addEventListener("click", () => { EV.sfx("tap"); startExpedition(); EV.showScreen(); });
$("btnCards").addEventListener("click", () => { EV.sfx("tap"); EV.togglePanel("cards"); });
$("scrExp").addEventListener("click", onExpClick);
$("scrExp").addEventListener("change", (e) => { const s = e.target.closest("select[data-load]"); if (s && X && view === "pick") setLoad(s.dataset.load, s.value); });
$("cardsPanel").addEventListener("click", onCardsClick);
setInterval(refreshHome, 1000);
rpgState(); EV.showScreen();
// a random card your creature can use, at least minGrade (for chests and rewards outside expeditions)
function pickUsable(n, minGrade) {
  const pool = DROP_POOL.filter((id) => usable(id));
  const ids = [];
  while (ids.length < Math.min(n, pool.length)) { const id = pool[Math.floor(Math.random() * pool.length)]; if (!ids.includes(id)) ids.push(id); }
  return ids.map((id) => ({ id, g: Math.max(minGrade, rollGrade(minGrade)) }));
}
function takeCard(id, g) { rpgState(); const c = giveCard(id, g); EV.save(); return c; }
EV.RPG = Object.defineProperties(Object.assign(api, { renderCards, startExpedition, cardHtml, cardName, pickUsable, takeCard, starStr }), { X: { get: () => X }, battle: { get: () => battle } });
})(typeof window !== "undefined" ? window : null);
