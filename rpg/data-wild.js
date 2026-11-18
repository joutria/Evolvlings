/* Evolvlings RPG: wild creatures, filler foes of each zone.
   Their pictures come from the CC0 Ninja Adventure pack (art/creatures/<id>.png, built by tools/ninja-maps.py) and, for the
   MiniWorld beasts and monsters (two to four per zone), from the CC0 MiniWorld Sprites pack (tools/miniworld-wild.py); the third, a common beast
   of the zone that the Savia Negra has reached, from the CC0 0x72 Dungeon Tileset II, Pixel_Poem's dungeon packs or a Savia
   repaint (tools/sap-wild.py);
   see CREDITS.md.
   wild: true keeps them out of eggs, duels and card owner lists: they only show up as foes on expeditions.
   They borrow the cards of a creature of their own type. Loaded after rpg/registry.js. */
"use strict";
(function () {
  const R = EV.RPG;
  const WILD = [
    // id, zone, type, stats, borrowed cards, colours (only used if the picture is missing), es / en descriptions
    ["fulgor", "aurora", "light", { hp: 34, str: 34, def: 28, spd: 46, cr: 38 }, ["street", "oil", "flash"], ["#f4f0e0", "#ffffff", "#5a4a6a", "#f0c0c0"],
      "Llamita pálida que se pierde entre los faroles del prado", "A stray little flame that gets lost among the meadow lanterns"],
    ["chisporro", "crater", "fire", { hp: 34, str: 42, def: 28, spd: 40, cr: 34 }, ["bellows", "bread", "piece"], ["#e85a2c", "#ffb347", "#5a2418", "#ffd0a0"],
      "Brasa con cara de pocos amigos que salta de las grietas", "A grumpy ember that hops out of the cracks"],
    ["canin", "forest", "plant", { hp: 42, str: 32, def: 38, spd: 30, cr: 36 }, ["acorn", "rings", "seedling"], ["#7aa83a", "#b8d070", "#2a4418", "#e0c0a0"],
      "Brote de caña que se esconde quieto entre los juncos", "A cane sprout that hides very still among the reeds"],
    ["ojuelo", "hollow", "shadow", { hp: 32, str: 38, def: 28, spd: 50, cr: 40 }, ["night", "nohide", "truename"], ["#f0f0f8", "#6fb8d0", "#2a2440", "#d0d0f0"],
      "Ojo flotante que vigila la Hondonada sin parpadear", "A floating eye that watches the Hollow without blinking"],
    ["ajolin", "lake", "water", { hp: 40, str: 36, def: 32, spd: 40, cr: 34 }, ["whirl", "vessel", "guest"], ["#f0a040", "#ffd080", "#5a3010", "#ffb0a0"],
      "Ajolote curioso que sale a mirar a quien pesca en el Lago", "A curious axolotl that comes up to look at whoever fishes in the Lake"],
    ["topacio", "caves", "stone", { hp: 42, str: 40, def: 46, spd: 22, cr: 32 }, ["echo", "miner", "rockname"], ["#9a3a2c", "#d07050", "#3a1410", "#e0a0a0"],
      "Mapache minero que cava túneles detrás de los ecos", "A miner raccoon that digs tunnels behind the echoes"],
    ["ululu", "heights", "air", { hp: 34, str: 32, def: 28, spd: 52, cr: 40 }, ["gust", "cloud", "rain"], ["#d07040", "#f0d0a0", "#4a2410", "#ffd0a0"],
      "Búho de los Altos que contesta al viento con su ulular", "An owl of the Heights that answers the wind with its hooting"],
    ["sombrerin", "deep", "mush", { hp: 46, str: 34, def: 40, spd: 26, cr: 40 }, ["harvest", "stillgrow", "saprem"], ["#d0303c", "#f8f0e0", "#3a1418", "#ffc0c0"],
      "Seta con patas que pasea por el Fondo Blanco", "A mushroom on legs that strolls through the White Deep"],
    // the second wild creature of each zone (MiniWorld Sprites, 2026-11-18)
    ["albadrago", "aurora", "light", { hp: 38, str: 38, def: 30, spd: 40, cr: 38 }, ["lantern", "spark", "oil"], ["#f0c050", "#ffe8a0", "#5a3a10", "#ffb0a0"],
      "Dragoncito dorado que duerme enrollado en los faroles tibios", "A little golden dragon that sleeps curled around warm lanterns"],
    ["brasadrago", "crater", "fire", { hp: 38, str: 44, def: 30, spd: 36, cr: 34 }, ["temper", "anvil", "bellows"], ["#e8806a", "#ffc0a0", "#5a2418", "#ff9080"],
      "Dragoncito rojo que se calienta la panza sobre las grietas del Cráter", "A little red dragon that warms its belly over the Crater's cracks"],
    ["ramacuerno", "forest", "plant", { hp: 44, str: 36, def: 40, spd: 26, cr: 34 }, ["seedling", "rings", "acorn"], ["#6a5a48", "#4ab0b8", "#2a2018", "#c0a080"],
      "Bicho de cuernos de rama que se queda quieto hasta parecer un arbusto", "A creature with branch antlers that stands still until it looks like a bush"],
    ["mohin", "hollow", "shadow", { hp: 32, str: 40, def: 26, spd: 50, cr: 40 }, ["night", "truename", "nohide"], ["#b060d0", "#e0a0f0", "#3a1448", "#f0c0f0"],
      "Diablillo morado con manchas de Savia que imita las caras de quien lo mira", "A purple imp with Sap stains that mimics the faces of whoever watches it"],
    ["pinzote", "lake", "water", { hp: 40, str: 38, def: 44, spd: 28, cr: 32 }, ["lostwave", "vessel", "whirl"], ["#e8884a", "#ffc090", "#5a2a10", "#ffb0a0"],
      "Cangrejo gruñón que defiende su piedra de la orilla", "A grumpy crab that defends its stone on the shore"],
    ["colmillon", "caves", "stone", { hp: 50, str: 42, def: 44, spd: 18, cr: 30 }, ["throw", "stubborn", "miner"], ["#7a6450", "#c0a888", "#2a2018", "#f0f0e8"],
      "Mamut lanudo que abre pasadizos a cabezazos", "A woolly mammoth that opens passages by headbutting"],
    ["nubedrago", "heights", "air", { hp: 36, str: 34, def: 28, spd: 52, cr: 40 }, ["gust", "rain", "cloud"], ["#e8e0d0", "#ffffff", "#4a4038", "#f0d0c0"],
      "Dragoncito blanco que planea entre las nubes del paso", "A little white dragon that glides among the clouds of the pass"],
    ["ventisco", "deep", "ice", { hp: 48, str: 40, def: 38, spd: 26, cr: 36 }, ["frostslow", "tombquiet", "vigil"], ["#f0f8f8", "#a0e0e0", "#3a4848", "#e0c0a0"],
      "Yeti pequeño que se cubre de nieve para asustar a los viajeros", "A small yeti that covers itself in snow to scare travellers"],
    // the Sap-touched beast of each zone (0x72 Dungeon Tileset II and Savia repaints, 2026-11-18): no story of their own,
    // just ordinary dwellers of the zone that the Savia Negra reached (Jose)
    ["mustio", "aurora", "light", { hp: 34, str: 40, def: 26, spd: 44, cr: 40 }, ["flash", "street", "oil"], ["#3b1d4a", "#5c3468", "#0e0814", "#7dffb0"],
      "Llamita del prado que bebió Savia y ahora alumbra sin calentar", "A meadow flamelet that drank Sap and now gives light without warmth"],
    ["tiznajo", "crater", "fire", { hp: 32, str: 46, def: 26, spd: 44, cr: 36 }, ["piece", "bellows", "temper"], ["#d0402c", "#f08060", "#3a1010", "#7dffb0"],
      "Diablillo de hollín que roba brasas de las forjas desde que la Savia le ennegreció las uñas", "A soot imp that steals embers from the forges since the Sap blackened its claws"],
    ["lodoverde", "forest", "plant", { hp: 48, str: 34, def: 40, spd: 22, cr: 34 }, ["rings", "seedling", "acorn"], ["#7ac83a", "#b8e070", "#1a3a18", "#7dffb0"],
      "Charco del bosque que se levantó a caminar cuando la Savia llegó a las raíces", "A forest puddle that got up and walked when the Sap reached the roots"],
    ["embozado", "hollow", "shadow", { hp: 34, str: 44, def: 26, spd: 46, cr: 42 }, ["truename", "night", "nohide"], ["#6a2a5a", "#9a4a8a", "#1a0814", "#7dffb0"],
      "Capa vacía de algún vecino de la Hondonada; la Savia la sigue moviendo", "The empty cloak of some Hollow dweller; the Sap keeps it moving"],
    ["legamo", "lake", "water", { hp: 46, str: 36, def: 42, spd: 24, cr: 32 }, ["vessel", "whirl", "lostwave"], ["#6a4a3a", "#9a7a5a", "#2a1810", "#7dffb0"],
      "Barro del fondo del Lago que sube a la orilla con la Savia por dentro", "Mud from the Lake bed that crawls up the shore with Sap inside"],
    ["huesillo", "caves", "stone", { hp: 40, str: 42, def: 40, spd: 30, cr: 34 }, ["miner", "rockname", "echo"], ["#e8e0d0", "#ffffff", "#3a3430", "#7dffb0"],
      "Huesos de un minero perdido que la Savia volvió a poner de pie", "The bones of a lost miner that the Sap set back on its feet"],
    ["buhueco", "heights", "air", { hp: 34, str: 38, def: 26, spd: 52, cr: 42 }, ["cloud", "gust", "rain"], ["#3b1d4a", "#5c3468", "#0e0814", "#7dffb0"],
      "Búho de los Altos que dejó de ulular; ahora solo mira con ojos verdes", "An owl of the Heights that stopped hooting; now it only stares with green eyes"],
    ["escarcho", "deep", "ice", { hp: 48, str: 40, def: 38, spd: 24, cr: 36 }, ["tombquiet", "frostslow", "vigil"], ["#7ad0d8", "#c0f0f0", "#1a3a48", "#7dffb0"],
      "Viajero congelado en el Fondo Blanco al que la Savia hizo caminar otra vez", "A traveller frozen in the White Deep whom the Sap made walk again"],
    ["cuernillo", "heart", "shadow", { hp: 40, str: 48, def: 30, spd: 44, cr: 42 }, ["night", "truename", "nohide"], ["#c03040", "#f07080", "#2a0810", "#7dffb0"],
      "Cosa con cuernos nacida donde la Savia brota más espesa, cerca de la Raíz", "A horned thing born where the Sap wells thickest, near the Root"],
    // more Sap-touched dwellers in Pixel_Poem's darker style (Jose liked it best, 2026-11-18)
    ["fatuo", "lake", "water", { hp: 32, str: 40, def: 24, spd: 52, cr: 42 }, ["lostwave", "whirl", "guest"], ["#5aa0e0", "#c0e8ff", "#1a2a48", "#7dffb0"],
      "Fuego frío que flota sobre el Lago de noche y lleva a los pescadores mar adentro", "A cold fire that floats over the Lake at night and leads fishers out into deep water"],
    ["yelmo", "heights", "air", { hp: 38, str: 38, def: 34, spd: 44, cr: 38 }, ["gust", "rain", "cloud"], ["#7ab0e0", "#d0e8ff", "#1a2a48", "#7dffb0"],
      "Casco de un viejo vigía de los Altos; el viento y la Savia lo siguen haciendo guardia", "The helmet of an old Heights lookout; the wind and the Sap keep it on watch"],
    ["noctambulo", "hollow", "shadow", { hp: 36, str: 44, def: 28, spd: 46, cr: 40 }, ["night", "nohide", "truename"], ["#3a4a3a", "#6a7a5a", "#101810", "#7dffb0"],
      "Vecino de la Hondonada que dejó de dormir cuando la Savia le subió a la boca", "A Hollow dweller who stopped sleeping when the Sap rose to its mouth"],
    ["musgoso", "forest", "plant", { hp: 46, str: 38, def: 38, spd: 24, cr: 34 }, ["seedling", "acorn", "rings"], ["#5a6a4a", "#8a9a6a", "#1a2018", "#7dffb0"],
      "Leñador que se quedó dormido en el Bosque Hondo; el musgo y la Savia lo despertaron", "A woodcutter who fell asleep in the Deep Forest; the moss and the Sap woke it"],
    ["calavero", "caves", "stone", { hp: 40, str: 46, def: 36, spd: 32, cr: 36 }, ["rockname", "echo", "throw"], ["#e0d8c0", "#ffffff", "#3a2a20", "#7dffb0"],
      "Esqueleto con espada que sigue cuidando una veta que ya nadie recuerda", "A skeleton with a sword that still guards a vein no one remembers"],
    ["segador", "heart", "shadow", { hp: 42, str: 50, def: 30, spd: 40, cr: 44 }, ["truename", "night", "nohide"], ["#d0c8b0", "#f0e8d0", "#2a2018", "#7dffb0"],
      "Huesos con guadaña que cosechan lo que la Savia hace brotar cerca de la Raíz", "Bones with a scythe that reap whatever the Sap makes sprout near the Root"],
    ["velador", "deep", "dream", { hp: 44, str: 40, def: 34, spd: 30, cr: 40 }, ["pillow", "yawn", "tale"], ["#7a8090", "#a0a8b8", "#2a2018", "#7dffb0"],
      "Encapuchado que vela las tumbas heladas del Fondo Blanco; la Savia le enrojeció los ojos", "A hooded figure that watches over the frozen tombs of the White Deep; the Sap reddened its eyes"],
    // the rest of MiniWorld's beasts and monsters (Jose: "usa todos", 2026-11-18)
    ["ombradrago", "hollow", "shadow", { hp: 40, str: 40, def: 32, spd: 38, cr: 36 }, ["night", "nohide", "truename"], ["#4a3a5a", "#7a6a8a", "#140e1a", "#d0c0e0"],
      "Dragoncito negro que se esconde en la sombra de los tronos rotos", "A little black dragon that hides in the shadow of the broken thrones"],
    ["marejadrago", "lake", "water", { hp: 40, str: 40, def: 32, spd: 38, cr: 36 }, ["whirl", "vessel", "lostwave"], ["#4a90d0", "#a0d0f0", "#102a48", "#ffc0c0"],
      "Dragoncito azul que nada bajo el hielo fino de las orillas", "A little blue dragon that swims under the thin ice of the shores"],
    ["fogonero", "crater", "fire", { hp: 34, str: 40, def: 26, spd: 50, cr: 40 }, ["bellows", "piece", "temper"], ["#d0503a", "#f0a080", "#3a1010", "#ffc0a0"],
      "Diablillo rojo que aviva las forjas soplando cuando nadie mira", "A red imp that fans the forges with its breath when no one is looking"],
    ["acorazado", "heart", "shadow", { hp: 44, str: 48, def: 34, spd: 26, cr: 34 }, ["night", "nohide", "truename"], ["#4a3a5a", "#7a6a8a", "#140e1a", "#d0c0e0"],
      "Diablo con casco de hierro negro que monta guardia cerca de la Raíz", "A devil in a black iron helmet that stands guard near the Root"],
    ["tortuguin", "lake", "water", { hp: 48, str: 40, def: 44, spd: 20, cr: 32 }, ["whirl", "vessel", "lostwave"], ["#4a90d0", "#a0d0f0", "#102a48", "#ffc0c0"],
      "Tortuga verde que duerme en las piedras tibias del Lago", "A green turtle that naps on the Lake's warm stones"],
    ["escamin", "lake", "water", { hp: 30, str: 34, def: 28, spd: 48, cr: 42 }, ["whirl", "vessel", "lostwave"], ["#4a90d0", "#a0d0f0", "#102a48", "#ffc0c0"],
      "Pececillo que salta fuera del agua para morder tobillos", "A little fish that jumps out of the water to nip ankles"],
    ["potrillo", "aurora", "light", { hp: 34, str: 40, def: 26, spd: 50, cr: 40 }, ["street", "oil", "flash"], ["#f0d070", "#fff0b0", "#4a3a10", "#ffc0a0"],
      "Potro salvaje que galopa entre los faroles del prado al amanecer", "A wild colt that gallops among the meadow lanterns at dawn"],
    ["gotin", "forest", "plant", { hp: 30, str: 34, def: 28, spd: 48, cr: 42 }, ["acorn", "rings", "seedling"], ["#6ab040", "#b0e080", "#1a3a10", "#e0c0a0"],
      "Gota de rocío verde que rebota entre las hojas", "A drop of green dew that bounces among the leaves"],
    ["gelin", "deep", "ice", { hp: 30, str: 34, def: 28, spd: 48, cr: 42 }, ["frostslow", "tombquiet", "vigil"], ["#7ad0e0", "#d0f4f8", "#1a3a48", "#e0f0f0"],
      "Gota helada que se pega a las botas de los viajeros", "A frozen drop that sticks to travellers' boots"],
    ["flechin", "forest", "plant", { hp: 34, str: 40, def: 26, spd: 50, cr: 40 }, ["acorn", "rings", "seedling"], ["#6ab040", "#b0e080", "#1a3a10", "#e0c0a0"],
      "Duende arquero que caza con flechas de caña en el Bosque", "An archer goblin that hunts with cane arrows in the Forest"],
    ["porrin", "caves", "stone", { hp: 44, str: 48, def: 34, spd: 26, cr: 34 }, ["throw", "miner", "echo"], ["#9a7a5a", "#c8b090", "#2a2018", "#f0e0d0"],
      "Duende con garrote que golpea las paredes buscando huecos", "A club goblin that knocks on the walls looking for hollows"],
    ["hortelin", "aurora", "plant", { hp: 40, str: 40, def: 32, spd: 38, cr: 36 }, ["acorn", "rings", "seedling"], ["#6ab040", "#b0e080", "#1a3a10", "#e0c0a0"],
      "Duende con rastrillo que se roba los nabos de las huertas", "A goblin with a rake that steals turnips from the gardens"],
    ["petardin", "crater", "fire", { hp: 34, str: 40, def: 26, spd: 50, cr: 40 }, ["bellows", "piece", "temper"], ["#d0503a", "#f0a080", "#3a1010", "#ffc0a0"],
      "Duende que corre con una mecha encendida y no sabe frenar", "A goblin that runs with a lit fuse and doesn't know how to stop"],
    ["lancin", "heights", "air", { hp: 34, str: 40, def: 26, spd: 50, cr: 40 }, ["gust", "cloud", "rain"], ["#d0e0f0", "#ffffff", "#3a4858", "#f0d0c0"],
      "Duende con lanza que vigila el paso desde las rocas altas", "A spear goblin that watches the pass from the high rocks"],
    ["torote", "caves", "stone", { hp: 44, str: 48, def: 34, spd: 26, cr: 34 }, ["throw", "miner", "echo"], ["#9a7a5a", "#c8b090", "#2a2018", "#f0e0d0"],
      "Hombre toro que se perdió en los túneles y ya no quiere salir", "A bull-man who got lost in the tunnels and no longer wants to leave"],
    ["ogron", "heart", "shadow", { hp: 48, str: 40, def: 44, spd: 20, cr: 32 }, ["night", "nohide", "truename"], ["#4a3a5a", "#7a6a8a", "#140e1a", "#d0c0e0"],
      "Ogro verde que cree que el Corazón del Claro es suyo", "A green ogre who thinks the Heart of the Glade belongs to him"],
    ["brujon", "deep", "dream", { hp: 40, str: 40, def: 32, spd: 38, cr: 36 }, ["yawn", "pillow", "tale"], ["#8a80b0", "#c0b8e0", "#2a2440", "#f0d0f0"],
      "Ogro brujo que adormece la nieve con canciones roncas", "An ogre sorcerer who lulls the snow with hoarse songs"],
    ["chaman", "deep", "mush", { hp: 40, str: 40, def: 32, spd: 38, cr: 36 }, ["harvest", "stillgrow", "saprem"], ["#c04050", "#f0e0d0", "#3a1418", "#ffc0c0"],
      "Ogro que cultiva setas bajo la nieve y las vende muy caras", "An ogre who grows mushrooms under the snow and sells them very dear"],
    ["salobre", "lake", "water", { hp: 44, str: 48, def: 34, spd: 26, cr: 34 }, ["whirl", "vessel", "lostwave"], ["#4a90d0", "#a0d0f0", "#102a48", "#ffc0c0"],
      "Viejo pirata del Lago que todavía busca un tesoro que nunca hubo", "An old Lake pirate still looking for a treasure that never was"],
    ["polvorin", "caves", "stone", { hp: 40, str: 40, def: 32, spd: 38, cr: 36 }, ["throw", "miner", "echo"], ["#9a7a5a", "#c8b090", "#2a2018", "#f0e0d0"],
      "Artillero sin barco que vuela rocas en las Cuevas por diversión", "A gunner without a ship who blasts rocks in the Caves for fun"],
    ["grumete", "heights", "air", { hp: 34, str: 40, def: 26, spd: 50, cr: 40 }, ["gust", "cloud", "rain"], ["#d0e0f0", "#ffffff", "#3a4858", "#f0d0c0"],
      "Pirata joven que asalta a quien sube al paso con viento a favor", "A young pirate who robs anyone climbing the pass with the wind at their back"],
    ["susurro", "hollow", "shadow", { hp: 40, str: 40, def: 32, spd: 38, cr: 36 }, ["night", "nohide", "truename"], ["#4a3a5a", "#7a6a8a", "#140e1a", "#d0c0e0"],
      "Brujo con calavera de toro que llama a los muertos por su nombre", "A sorcerer with a bull skull who calls the dead by their names"],
    ["huesudo", "heart", "shadow", { hp: 40, str: 40, def: 32, spd: 38, cr: 36 }, ["night", "nohide", "truename"], ["#4a3a5a", "#7a6a8a", "#140e1a", "#d0c0e0"],
      "Soldado de huesos que sigue una orden que nadie recuerda", "A soldier of bones that still follows an order no one remembers"],
  ];
  const NAMES = { fulgor: "Fulgor", chisporro: "Chisporro", canin: "Cañín", ojuelo: "Ojuelo", ajolin: "Ajolín", topacio: "Topacio", ululu: "Ululú", sombrerin: "Sombrerín",
    albadrago: "Albadrago", brasadrago: "Brasadrago", ramacuerno: "Ramacuerno", mohin: "Mohín", pinzote: "Pinzote", colmillon: "Colmillón",
    nubedrago: "Nubedrago", ventisco: "Ventisco",
    mustio: "Mustio", tiznajo: "Tiznajo", lodoverde: "Lodoverde", embozado: "Embozado", legamo: "Légamo", huesillo: "Huesillo",
    buhueco: "Búho hueco", escarcho: "Escarcho", cuernillo: "Cuernillo",
    fatuo: "Fatuo", yelmo: "Yelmo", noctambulo: "Noctámbulo", musgoso: "Musgoso", calavero: "Calavero", segador: "Segador", velador: "Velador",
    ombradrago: "Ombradrago", marejadrago: "Marejadrago", fogonero: "Fogonero", acorazado: "Acorazado", tortuguin: "Tortuguín", escamin: "Escamín", potrillo: "Potrillo", gotin: "Gotín", gelin: "Gelín", flechin: "Flechín", porrin: "Porrín", hortelin: "Hortelín", petardin: "Petardín", lancin: "Lancín", torote: "Torote", ogron: "Ogrón", brujon: "Brujón", chaman: "Chamán", salobre: "Capitán Salobre", polvorin: "Polvorín", grumete: "Grumete", susurro: "Susurro", huesudo: "Huesudo" };
  for (const [id, zone, type, st, cards, col, es, en] of WILD) {
    R.addCreature(id, {
      mon: { types: [type], rar: 0, st, cards, wild: true },
      name: NAMES[id], desc: { es, en },
      col: { body: col[0], belly: col[1], line: col[2], cheek: col[3] },
    });
    if (ZONES[zone]) ZONES[zone].foes.push(id);
  }
  // one copy of each wild creature in its zone's foe list, and the zone's own creatures repeated until they are at least as
  // many as the wild ones: about half the fights still meet a wild creature, however many a zone has
  const wild = new Set(WILD.map((w) => w[0]));
  for (const z of Object.values(ZONES)) {
    const own = z.foes.filter((k) => !wild.has(k)), nWild = z.foes.length - own.length;
    if (!own.length) continue;
    for (let i = 0; own.length * (1 + i) < nWild; i++) z.foes.push(...own);
  }
})();
