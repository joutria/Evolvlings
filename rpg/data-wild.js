/* Evolvlings RPG: wild creatures, filler foes of each zone.
   Their pictures come from the CC0 Ninja Adventure pack (art/creatures/<id>.png, built by tools/ninja-maps.py; see CREDITS.md).
   wild: true keeps them out of eggs, duels and card owner lists: they only show up as foes on expeditions.
   They borrow the cards of a creature of their own type. Loaded after rpg/registry.js. */
"use strict";
(function () {
  const R = EV.RPG;
  const WILD = [
    // id, zone, type, stats, borrowed cards, colours (only used if the picture is missing), es / en descriptions
    ["fulgor", "aurora", "light", { hp: 34, str: 34, def: 28, spd: 46, cr: 38 }, ["street", "oil", "flash"], ["#f4f0e0", "#ffffff", "#5a4a6a", "#f0c0c0"],
      "Llamita errante que se pierde entre los faroles del prado", "A stray little flame that gets lost among the meadow lanterns"],
    ["chisporro", "crater", "fire", { hp: 34, str: 42, def: 28, spd: 40, cr: 34 }, ["bellows", "bread", "piece"], ["#e85a2c", "#ffb347", "#5a2418", "#ffd0a0"],
      "Brasa con cara de pocos amigos que salta de las grietas", "A grumpy ember that hops out of the cracks"],
    ["canin", "forest", "plant", { hp: 42, str: 32, def: 38, spd: 30, cr: 36 }, ["acorn", "rings", "seedling"], ["#7aa83a", "#b8d070", "#2a4418", "#e0c0a0"],
      "Brote de caña que se esconde quieto entre los juncos", "A cane sprout that hides very still among the reeds"],
    ["ojuelo", "hollow", "shadow", { hp: 32, str: 38, def: 28, spd: 50, cr: 40 }, ["night", "nohide", "truename"], ["#f0f0f8", "#6fb8d0", "#2a2440", "#d0d0f0"],
      "Ojo flotante que vigila la Hondonada sin parpadear", "A floating eye that watches the Hollow without blinking"],
    ["ajolin", "lake", "water", { hp: 40, str: 36, def: 32, spd: 40, cr: 34 }, ["whirl", "vessel", "guest"], ["#f0a040", "#ffd080", "#5a3010", "#ffb0a0"],
      "Ajolote curioso que sale a mirar a quien pesca en el Lago", "A curious axolotl that comes up to look at whoever fishes in the Lake"],
    ["topacio", "caves", "stone", { hp: 42, str: 40, def: 46, spd: 22, cr: 32 }, ["echo", "miner", "rockname"], ["#9a3a2c", "#d07050", "#3a1410", "#e0a0a0"],
      "Topo minero que cava túneles detrás de los ecos", "A miner mole that digs tunnels behind the echoes"],
    ["ululu", "heights", "air", { hp: 34, str: 32, def: 28, spd: 52, cr: 40 }, ["gust", "cloud", "rain"], ["#d07040", "#f0d0a0", "#4a2410", "#ffd0a0"],
      "Búho de los Altos que contesta al viento con su ulular", "An owl of the Heights that answers the wind with its hooting"],
    ["sombrerin", "deep", "mush", { hp: 46, str: 34, def: 40, spd: 26, cr: 40 }, ["harvest", "stillgrow", "saprem"], ["#d0303c", "#f8f0e0", "#3a1418", "#ffc0c0"],
      "Seta con patas que pasea por el Fondo Blanco", "A mushroom on legs that strolls through the White Deep"],
  ];
  const NAMES = { fulgor: "Fulgor", chisporro: "Chisporro", canin: "Cañín", ojuelo: "Ojuelo", ajolin: "Ajolín", topacio: "Topacio", ululu: "Ululú", sombrerin: "Sombrerín" };
  for (const [id, zone, type, st, cards, col, es, en] of WILD) {
    R.addCreature(id, {
      mon: { types: [type], rar: 0, st, cards, wild: true },
      name: NAMES[id], desc: { es, en },
      col: { body: col[0], belly: col[1], line: col[2], cheek: col[3] },
    });
    // one copy in the zone's foe list: about one fight in five meets one
    if (ZONES[zone]) ZONES[zone].foes.push(id);
  }
})();
