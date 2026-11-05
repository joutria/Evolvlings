/* Evolvlings RPG: the expedition zones and the list of path events.
   Part of the old rpg.js, now split. Classic scripts: top-level names are shared between the rpg/*.js files,
   which load in order (see index.html). */
"use strict";

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
