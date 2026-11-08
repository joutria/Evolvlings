/* Evolvlings: the walkable map (first delivery).
   A small tile engine seen from 3/4 above: the ground is drawn from the top and anything with height from the front.
   You never steer by tapping the ground. You pick a place, from the list or by tapping it on the map, and the creature
   walks there on its own along the shortest path (A*), then the place's action runs.
   Two maps for now: the Keeper's corner of the Glade (home) and El Vado (the plaza). Moving between them and setting out
   on an expedition costs daily steps ("pasos"); talking, looking, shops and care at home are free.
   Steps belong to each creature: 10 a day, up to 30 saved, plus 1 for every 10 energy that food or a recharge gives
   (at most 12 bought a day). Sleeping gives none. */
(function () {
"use strict";
const EV = window.EV;
if (!EV) return;
const $ = EV.$, esc = EV.escapeHtml;
const L = () => EV.LANG;

const TX = {
  es: {
    nav: "Mapa", title: "El Claro y el Vado", steps: "{n} pasos", stepsT: "Pasos de hoy: {n}. Pasear es gratis; los pasos solo se gastan en el Rincón de búsqueda. Se recargan 10 a medianoche (máximo 30 guardados), y el té, el guiso y la recarga de energía dan más, hasta 12 al día.",
    where: "¿Adónde vas?", walking: "{name} va de camino…", free: "gratis", cost1: "1 paso", costN: "{n} pasos", noSteps: "A {name} no le quedan pasos hoy. Un té o una recarga de energía dan más.", noStepsShort: "Sin pasos",
    needAlive: "Primero necesitas una criatura que pueda caminar.", asleep: "{name} está dormida. Despiértala para salir.",
    gotSteps: "+{n} pasos para {name}", stepsCap: "Hoy ya no se pueden comprar más pasos.",
    "map.home": "Tu rincón del Claro", "map.vado": "El Vado",
    "home.sub": "Un claro pequeño junto al bosque. Aquí cuidar es gratis.", "vado.sub": "La plaza al otro lado del arroyo: pozo, puestos y gente de paso.",
    "p.bowl": "Comedero", "p.bowl.d": "Darle de comer", "p.bed": "Cama de musgo", "p.bed.d": "Dormir o despertar", "p.pond": "Charca", "p.pond.d": "Bañarse",
    "p.lawn": "Claro abierto", "p.lawn.d": "Jugar a cazar estrellas", "p.root": "Raíz del Claro", "p.root.d": "Escuchar la Raíz", "p.board": "Tablón", "p.board.d": "Ver las tareas",
    "p.toVado": "Camino al Vado", "p.toVado.d": "Cruzar el arroyo", "p.toHome": "Camino a casa", "p.toHome.d": "Volver a tu rincón",
    "p.well": "Pozo de los Ecos", "p.well.d": "Tirar cartas", "p.pantry": "Despensa", "p.pantry.d": "Tirada del día", "p.shop": "Tienda", "p.shop.d": "Comprar comida y cosas",
    "p.garden": "Huerto", "p.garden.d": "Cosechar comida y Madera", "garden.hi": "{name} husmea entre las matas del Huerto.", "build.open": "Ver obras", "p.orders": "Tablón de encargos", "p.orders.d": "Lo que piden los vecinos", "ordersName": "Tablón del Vado",
    "p.nest": "Incubadora", "p.nest.d": "Ver el Refugio y los huevos", "p.tila": "Tila", "p.tila.d": "Hablar", "p.trail": "Sendero de las expediciones", "p.trail.d": "Salir de expedición",
    "food.pick": "¿Qué le pones en el comedero?", "food.none": "Cerrar",
    "d.close": "Adiós", "d.more": "Seguir escuchando",
    "root.name": "La Raíz", "root.0": "La Raíz cruje bajo el musgo. Si pegas la oreja, se oye algo parecido a una voz:", "root.calm": "Hoy la Raíz está tranquila. Solo se oye el agua de la charca.",
    "tila.hi": "¡Hola, {name}! ¿Vienes del Claro? Yo voy de farol en farol, como siempre.", "tila.q1": "¿Qué se cuenta por el Vado?", "tila.q2": "¿Cómo va tu calle?", "tila.q3": "¿Y esas manchas de aceite?",
    "tila.a1": "Pues mira, lo último que he oído:", "tila.a1none": "Nada nuevo. El Vado está tan quieto que hasta el arroyo bosteza.",
    "tila.a2lit": "¡Encendida entera! Desde la Noche de Faroles los vecinos se paran a mirarla. Gracias por ayudarme.", "tila.a2dark": "Media calle a oscuras todavía. Cuando llegue la Noche de Faroles, ¿me echas una mano?",
    "tila.a3": "¿Esto? El aceite de Albor mancha que da gusto. En mi barrio decimos que si no te manchas, no has encendido nada.",
    trailName: "Sendero", trailAsk: "El sendero sale del Vado hacia las zonas del valle. Salir no cuesta pasos, solo la energía de siempre.", go: "Salir", stay: "Ahora no",
    bedName: "Antes de dormir", "bed.sum": "Así ha ido el día de {name}:", "bed.none": "Ha sido un día tranquilo, sin mucho que contar.", "bed.board": "En el tablón hay algo nuevo esperando.",
    "bed.steps": "Le quedan {n} pasos y mañana se recargan {d}.", "bed.sleep": "Dormir", "bed.later": "Todavía no",
    "p.bottle": "Botella", "p.bottle.d": "Algo flota en la charca", "p.patch": "Rincón de búsqueda", "p.patch.d": "Buscar a su manera",
    "pd.sol": "Cosechar", "pd.sky": "Atrapar brisas", "pd.lake": "Excavar", "pd.frost": "Recoger hojas de escarcha", "pd.star": "Cantar al Claro",
    bottleName: "Mensaje en una botella", "bottle.0": "Dentro hay un papel enrollado:", "bottle.wet": "El papel está tan mojado que no se lee nada.", "bottle.gift": "Atado al cuello de la botella había un regalo: {g}.",
    "g.coins": "{n} Chispas", "g.dust": "∴ {n} de Polvo", "g.item": "1 × {item}",
    "f.sol": "{name} rebusca entre las matas y vuelve con {g}.", "f.sky": "{name} salta tras las brisas hasta atrapar una y se ríe un buen rato. +{n} Chispas y más diversión.",
    "f.lake": "{name} escarba junto a la piedra y encuentra ∴ {n} de Polvo entre la tierra.", "f.frost": "{name} recoge hojas escarchadas a la sombra. Sirven para un té: +1 Té.",
    "f.star": "{name} canta bajito y el Claro le contesta. +{n} Chispas y ∴ {d} de Polvo.", "f.done": "{name} ya buscó en este rincón. Mañana habrá más, y si no vienes se guardan hasta 3 días.",
    "s.fed": "Comidas", "s.cuddles": "Mimos", "s.plays": "Partidas", "s.messes": "Manchas limpias", "s.expDone": "Expediciones", "s.dailyDone": "Tareas",
  },
  en: {
    nav: "Map", title: "The Glade and El Vado", steps: "{n} steps", stepsT: "Steps today: {n}. Walking around is free; steps are only spent at the foraging nook. 10 come back at midnight (up to 30 saved), and tea, stew and the energy recharge give more, up to 12 a day.",
    where: "Where to?", walking: "{name} is on the way…", free: "free", cost1: "1 step", costN: "{n} steps", noSteps: "{name} has no steps left today. A tea or an energy recharge gives more.", noStepsShort: "No steps",
    needAlive: "First you need a creature that can walk.", asleep: "{name} is asleep. Wake it up to go out.",
    gotSteps: "+{n} steps for {name}", stepsCap: "No more steps can be bought today.",
    "map.home": "Your corner of the Glade", "map.vado": "El Vado",
    "home.sub": "A small clearing by the wood. Care is free here.", "vado.sub": "The plaza across the stream: a well, stalls and people passing through.",
    "p.bowl": "Bowl", "p.bowl.d": "Feed", "p.bed": "Moss bed", "p.bed.d": "Sleep or wake", "p.pond": "Pond", "p.pond.d": "Have a bath",
    "p.lawn": "Open lawn", "p.lawn.d": "Play star catch", "p.root": "Glade Root", "p.root.d": "Listen to the Root", "p.board": "Notice board", "p.board.d": "See the tasks",
    "p.toVado": "Path to El Vado", "p.toVado.d": "Cross the stream", "p.toHome": "Path home", "p.toHome.d": "Back to your corner",
    "p.well": "Well of Echoes", "p.well.d": "Pull cards", "p.pantry": "Pantry", "p.pantry.d": "Pull of the day", "p.shop": "Shop", "p.shop.d": "Buy food and things",
    "p.garden": "Garden", "p.garden.d": "Harvest food and Wood", "garden.hi": "{name} sniffs around the Garden beds.", "build.open": "See builds", "p.orders": "Request board", "p.orders.d": "What the neighbours need", "ordersName": "Vado board",
    "p.nest": "Incubator", "p.nest.d": "See the Refuge and eggs", "p.tila": "Tila", "p.tila.d": "Talk", "p.trail": "Expedition trail", "p.trail.d": "Set out on an expedition",
    "food.pick": "What goes in the bowl?", "food.none": "Close",
    "d.close": "Goodbye", "d.more": "Keep listening",
    "root.name": "The Root", "root.0": "The Root creaks under the moss. If you put your ear to it, you hear something like a voice:", "root.calm": "The Root is quiet today. Only the pond water can be heard.",
    "tila.hi": "Hi, {name}! Coming from the Glade? I'm going lantern to lantern, as always.", "tila.q1": "What's the news in El Vado?", "tila.q2": "How's your street?", "tila.q3": "What are those oil stains?",
    "tila.a1": "Well, the latest I've heard:", "tila.a1none": "Nothing new. El Vado is so still even the stream is yawning.",
    "tila.a2lit": "Fully lit! Since the Night of Lanterns the neighbours stop to look at it. Thanks for helping me.", "tila.a2dark": "Half the street is still dark. When the Night of Lanterns comes, will you give me a hand?",
    "tila.a3": "These? Albor oil stains like nothing else. In my quarter we say if you don't get stained, you haven't lit anything.",
    trailName: "Trail", trailAsk: "The trail leaves El Vado for the valley's zones. Setting out costs no steps, only the usual energy.", go: "Set out", stay: "Not now",
    bedName: "Before bed", "bed.sum": "Here's how {name}'s day went:", "bed.none": "It was a quiet day, not much to tell.", "bed.board": "Something new is waiting on the notice board.",
    "bed.steps": "It has {n} steps left, and {d} come back tomorrow.", "bed.sleep": "Sleep", "bed.later": "Not yet",
    "p.bottle": "Bottle", "p.bottle.d": "Something is floating in the pond", "p.patch": "Foraging nook", "p.patch.d": "Search in its own way",
    "pd.sol": "Harvest", "pd.sky": "Catch breezes", "pd.lake": "Dig", "pd.frost": "Gather frost leaves", "pd.star": "Sing to the Glade",
    bottleName: "Message in a bottle", "bottle.0": "Inside there's a rolled-up note:", "bottle.wet": "The note is so wet that nothing can be read.", "bottle.gift": "Tied to the bottle's neck was a gift: {g}.",
    "g.coins": "{n} Chispas", "g.dust": "∴ {n} Stardust", "g.item": "1 × {item}",
    "f.sol": "{name} rummages through the bushes and comes back with {g}.", "f.sky": "{name} leaps after the breezes until it catches one, and laughs for a long while. +{n} Chispas and more fun.",
    "f.lake": "{name} digs by the stone and finds ∴ {n} Stardust in the soil.", "f.frost": "{name} gathers frosted leaves in the shade. They make a good tea: +1 Tea.",
    "f.star": "{name} sings softly and the Glade sings back. +{n} Chispas and ∴ {d} Stardust.", "f.done": "{name} already searched this nook. There'll be more tomorrow, and they wait up to 3 days if you're away.",
    "s.fed": "Meals", "s.cuddles": "Cuddles", "s.plays": "Games", "s.messes": "Messes cleaned", "s.expDone": "Expeditions", "s.dailyDone": "Tasks",
  },
};
const tx = (k, v) => { let s = (TX[L()] || TX.en)[k]; if (s == null) s = TX.en[k]; if (s == null) return k; if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => (v[n] != null ? v[n] : m)); return s; };

/* ---------- Steps ("pasos"), per creature ---------- */
// walking between maps and setting out are free (design rule 5: no steps gate on just playing or moving);
// steps only pay for rewarded actions, like the foraging nook
const STEPS = { daily: 10, keep: 30, buyMax: 12, move: 0, trail: 0 };
const today = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
const creatureKey = () => { const S = EV.S; return S ? S.species + ":" + (S.born || 0) : null; };
function steps() {
  const P = EV.P, k = creatureKey(); if (!k) return null;
  P.steps = P.steps || {};
  let s = P.steps[k];
  if (!s) s = P.steps[k] = { day: today(), n: STEPS.daily, bought: 0 };
  // the Path build (build.js) adds steps to the daily recharge
  if (s.day !== today()) { const extra = EV.BUILD ? EV.BUILD.pathBonus() : 0; s.n = Math.min(STEPS.keep + extra, s.n + STEPS.daily + extra); s.bought = 0; s.day = today(); }
  return s;
}
function spendSteps(n) { const s = steps(); if (!s || s.n < n) return false; s.n -= n; EV.saveProfile(); refreshChip(); return true; }
// 1 step for every 10 energy an item or recharge gives; sleeping gives none
function gainFromEnergy(energy) {
  const s = steps(); if (!s || !(energy > 0)) return 0;
  const n = Math.min(Math.floor(energy / 10), STEPS.buyMax - s.bought);
  if (n <= 0) { if (Math.floor(energy / 10) > 0) EV.toast(tx("stepsCap")); return 0; }
  s.n += n; s.bought += n; EV.saveProfile(); refreshChip();
  EV.toast(tx("gotSteps", { n, name: EV.S.name }), "👣");
  return n;
}

/* ---------- Maps: 15 x 11 tiles of 16 px ---------- */
const TW = 16;
// . grass   , flowers   = path   ~ water   # trees (solid)   r rock (solid)   _ bridge
const MAPS = {
  home: {
    rows: [
      "###############",
      "#,...#~~~#...,#",
      "#.....~~~.....#",
      "#.............#",
      "#.............#",
      "#.....r.......#",
      "#.............#",
      "#.............#",
      "#.............#",
      "#,.....=.....,#",
      "#######=#######",
    ],
    places: [
      { id: "root", x: 7, y: 4, w: 3, solid: [[6, 4], [7, 4], [8, 4]], stand: [7, 5], obj: "root" },
      { id: "bed", x: 2, y: 3, solid: [[2, 3]], stand: [3, 3], obj: "bed" },
      { id: "pond", x: 7, y: 2, stand: [7, 3], obj: null },
      { id: "bowl", x: 3, y: 7, solid: [[3, 7]], stand: [4, 7], obj: "bowl" },
      { id: "lawn", x: 8, y: 7, stand: [8, 7], obj: null },
      { id: "board", x: 11, y: 5, solid: [[11, 5]], stand: [11, 6], obj: "board" },
      { id: "toVado", x: 7, y: 10, stand: [7, 10], obj: "sign", go: "vado" },
      { id: "patch", x: 10, y: 3, solid: [[10, 3]], stand: [10, 4], obj: "patch", cost: 2 },
      { id: "bottle", x: 8, y: 2, stand: [8, 3], obj: "bottle", when: () => bottleHere() },
      { id: "garden", x: 4, y: 9, w: 2, solid: [[4, 9], [5, 9]], stand: [4, 8], obj: "garden", when: () => !!EV.BUILD },
    ],
    start: [7, 8], deco: [["tree", 1, 1], ["tree", 13, 1], ["tree", 1, 8], ["tree", 13, 8], ["flower", 12, 3], ["flower", 2, 5], ["flower", 10, 9]],
  },
  vado: {
    rows: [
      "#######=#######",
      "#.....===.....#",
      "#.....===.....#",
      "#.....===.....#",
      "===============",
      "#.....===.....#",
      "#.....===.....#",
      "#.....===.....#",
      "#.....===.....#",
      "#,....===....,#",
      "###############",
    ],
    places: [
      { id: "toHome", x: 7, y: 0, stand: [7, 0], obj: "sign", go: "home" },
      { id: "well", x: 3, y: 2, solid: [[3, 2]], stand: [4, 2], obj: "well", hideQuiet: true },
      { id: "shop", x: 11, y: 2, w: 2, solid: [[10, 2], [11, 2], [12, 2]], stand: [11, 3], obj: "shop" },
      { id: "pantry", x: 3, y: 7, w: 2, solid: [[2, 7], [3, 7], [4, 7]], stand: [3, 8], obj: "stall" },
      { id: "nest", x: 11, y: 7, solid: [[11, 7]], stand: [10, 7], obj: "nest" },
      { id: "tila", x: 10, y: 9, solid: [[10, 9]], stand: [9, 9], obj: "tila" },
      { id: "trail", x: 14, y: 4, stand: [14, 4], obj: "sign" },
      { id: "orders", x: 9, y: 1, solid: [[9, 1]], stand: [9, 2], obj: "board", when: () => !!EV.BUILD },
    ],
    start: [7, 1], deco: [["tree", 1, 1], ["tree", 13, 5], ["tree", 1, 9], ["lamp", 6, 6], ["lamp", 8, 3], ["flower", 13, 9]],
  },
};
// the map size comes from the rows (every map has the same size; tools/check.js checks it)
const MW = MAPS.home.rows[0].length, MH = MAPS.home.rows.length, W = TW * MW, H = TW * MH;
const SOLID = new Set(["#", "~", "r"]);
function blocked(m, x, y) {
  if (x < 0 || y < 0 || x >= MW || y >= MH) return true;
  if (SOLID.has(m.rows[y][x])) return true;
  for (const p of m.places) if (p.solid && p.solid.some(([a, b]) => a === x && b === y)) return true;
  return false;
}
// A* on the 165 tiles, 4 directions
function path(m, from, to) {
  const key = (x, y) => y * MW + x, open = [[from[0], from[1]]], came = new Map(), g = new Map([[key(...from), 0]]);
  const hfn = (x, y) => Math.abs(x - to[0]) + Math.abs(y - to[1]);
  const f = new Map([[key(...from), hfn(...from)]]);
  while (open.length) {
    open.sort((a, b) => f.get(key(...a)) - f.get(key(...b)));
    const cur = open.shift();
    if (cur[0] === to[0] && cur[1] === to[1]) {
      const out = [cur]; let k = key(...cur);
      while (came.has(k)) { const p = came.get(k); out.unshift(p); k = key(...p); }
      return out.slice(1);
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur[0] + dx, ny = cur[1] + dy;
      if (blocked(m, nx, ny) && !(nx === to[0] && ny === to[1])) continue;
      const nk = key(nx, ny), ng = g.get(key(...cur)) + 1;
      if (ng < (g.has(nk) ? g.get(nk) : 1e9)) { came.set(nk, cur); g.set(nk, ng); f.set(nk, ng + hfn(nx, ny)); if (!open.some((o) => o[0] === nx && o[1] === ny)) open.push([nx, ny]); }
    }
  }
  return null;
}

/* ---------- Drawing ---------- */
const C = { ink: "#241030", grass: "#86b85a", grass2: "#6fa24c", grassN: "#4f8a46", path: "#c9a46a", path2: "#a8834e", water: "#3f93c4", water2: "#7cc8e3",
  trunk: "#6b4a3a", leaf: "#3c7a2c", leaf2: "#4f9a3c", stone: "#9d93ad", stone2: "#6e6283", wood: "#7a5236", wood2: "#a07a55", cream: "#fbf6ef", red: "#d9542c", gold: "#e2ae2e", plum: "#3b1d4a", shadow: "rgba(36,16,48,.28)" };
const groundCache = {};
function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
function drawGround(id) {
  if (groundCache[id]) return groundCache[id];
  const m = MAPS[id], cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const ch = m.rows[y][x], px = x * TW, py = y * TW;
    rect(c, px, py, TW, TW, C.grass);
    for (let i = 0; i < 3; i++) rect(c, px + Math.floor(rnd() * 15), py + Math.floor(rnd() * 15), 1, 2, C.grass2);
    if (ch === "," ) for (let i = 0; i < 3; i++) { const fx = px + 2 + Math.floor(rnd() * 11), fy = py + 2 + Math.floor(rnd() * 11); rect(c, fx, fy, 2, 2, [C.cream, C.gold, "#cf5f9f"][i]); }
    if (ch === "=" || ch === "_") { rect(c, px, py, TW, TW, C.path); for (let i = 0; i < 4; i++) rect(c, px + Math.floor(rnd() * 14), py + Math.floor(rnd() * 14), 2, 1, C.path2); }
    if (ch === "_") { rect(c, px, py + 2, TW, 12, C.wood2); for (let i = 0; i < 4; i++) rect(c, px + i * 4, py + 2, 1, 12, C.wood); rect(c, px, py + 2, TW, 1, C.wood); rect(c, px, py + 13, TW, 1, C.wood); }
    if (ch === "~") { rect(c, px, py, TW, TW, C.water); rect(c, px + 2 + (x % 3) * 3, py + 4 + (y % 2) * 5, 5, 1, C.water2); }
    if (ch === "#") rect(c, px, py, TW, TW, C.grassN);
  }
  // water edges: a darker lip where water meets grass, seen from above
  for (let y = 1; y < MH; y++) for (let x = 0; x < MW; x++) if (m.rows[y][x] === "~" && m.rows[y - 1][x] !== "~") rect(c, x * TW, y * TW, TW, 2, "#2f5d96");
  groundCache[id] = cv; return cv;
}
// things with height, drawn from the front; (bx, by) is the bottom-centre of their base tile
function drawObj(c, kind, bx, by, t) {
  // PNG art (art.js): art/objects/<kind>.png at map scale (16 px a tile), standing on the base tile
  // some places have one picture per state: the garden per level, the foraging nook per circle
  const lvl = kind === "garden" ? (EV.BUILD ? EV.BUILD.lvl("garden") : 1) : 0;
  const pic = kind === "garden" ? "garden-" + Math.max(1, Math.min(5, lvl)) : kind === "patch" ? "patch-" + circle() : kind;
  const oim = typeof EVART !== "undefined" && EVART.image("objects/" + pic + ".png");
  if (oim) {
    const bob = kind === "bottle" ? Math.round(Math.sin(t / 500) * 1.5) : 0;
    const ox = kind === "garden" ? bx - 10 : Math.round(bx - oim.width / 2);
    c.drawImage(oim, ox, by + 1 - oim.height + bob);
    // what the pictures can't show on their own: the board's news, the Root's breath, ripe produce
    if (kind === "board" && boardNew()) { rect(c, bx - 1, by - oim.height - 5, 2, 4, C.gold); rect(c, bx - 1, by - oim.height, 2, 1, C.gold); }
    if (kind === "root") { const a = 0.4 + 0.3 * Math.sin(t / 700); rect(c, bx - 1, by - Math.round(oim.height * 0.6), 2, 2, `rgba(125,255,176,${a.toFixed(2)})`); }
    if (kind === "garden") { const st = EV.BUILD ? EV.BUILD.gardenStock() : { f: 0 };
      for (let i = 0; i < Math.min(st.f, 2 + lvl * 2, 10); i++) rect(c, ox + 5 + (i % 5) * 6, by - 13 + Math.floor(i / 5) * 4, 2, 2, i % 3 === 2 ? "#e2ae2e" : C.red); }
    return;
  }
  const sh = (w) => { c.fillStyle = C.shadow; c.beginPath(); c.ellipse(bx + 1, by - 1, w, 2.5, 0, 0, Math.PI * 2); c.fill(); };
  if (kind === "board" && boardNew()) {
    // something new on the board: a soft gold glow and a pin
    const a = 0.25 + 0.2 * Math.sin(t / 300); c.fillStyle = `rgba(226,174,46,${a.toFixed(2)})`; c.fillRect(bx - 9, by - 20, 18, 15);
    rect(c, bx - 1, by - 26, 2, 4, C.gold); rect(c, bx - 1, by - 21, 2, 1, C.gold);
  }
  if (kind === "tree") {
    sh(8); rect(c, bx - 2, by - 10, 4, 10, C.trunk);
    c.fillStyle = C.leaf; c.beginPath(); c.arc(bx, by - 18, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = C.leaf2; c.beginPath(); c.arc(bx - 3, by - 21, 5, 0, Math.PI * 2); c.fill();
  } else if (kind === "bed") {
    sh(9); rect(c, bx - 8, by - 4, 16, 4, "#4f9a3c"); rect(c, bx - 2, by - 14, 4, 10, C.cream);
    c.fillStyle = C.red; c.beginPath(); c.ellipse(bx, by - 15, 9, 5, 0, Math.PI, 0); c.fill();
    rect(c, bx - 4, by - 18, 2, 2, C.cream); rect(c, bx + 3, by - 17, 2, 2, C.cream);
  } else if (kind === "bowl") {
    sh(6); rect(c, bx - 6, by - 6, 12, 5, C.stone); rect(c, bx - 5, by - 7, 10, 2, C.stone2); rect(c, bx - 3, by - 7, 6, 1, C.red);
  } else if (kind === "root") {
    sh(18);
    c.strokeStyle = C.trunk; c.lineWidth = 4; c.beginPath(); c.moveTo(bx - 18, by - 1); c.quadraticCurveTo(bx - 6, by - 26, bx, by - 14); c.quadraticCurveTo(bx + 8, by - 26, bx + 18, by - 1); c.stroke();
    c.strokeStyle = "#8a6a50"; c.lineWidth = 1; c.beginPath(); c.moveTo(bx - 14, by - 4); c.quadraticCurveTo(bx - 6, by - 20, bx, by - 13); c.stroke();
    const glow = 0.4 + 0.3 * Math.sin(t / 700); c.fillStyle = `rgba(125,255,176,${glow.toFixed(2)})`; rect(c, bx - 1, by - 17, 2, 2, c.fillStyle);
  } else if (kind === "board") {
    sh(7); rect(c, bx - 1, by - 8, 2, 8, C.wood); rect(c, bx - 7, by - 18, 14, 11, C.wood2); rect(c, bx - 7, by - 18, 14, 1, C.wood);
    rect(c, bx - 5, by - 16, 4, 5, C.cream); rect(c, bx + 1, by - 15, 4, 4, C.cream);
  } else if (kind === "sign") {
    rect(c, bx - 1, by - 9, 2, 9, C.wood); rect(c, bx - 5, by - 13, 10, 5, C.wood2);
  } else if (kind === "well") {
    sh(8); rect(c, bx - 7, by - 8, 14, 8, C.stone); rect(c, bx - 7, by - 8, 14, 2, C.stone2); rect(c, bx - 5, by - 6, 10, 2, C.plum);
    rect(c, bx - 7, by - 20, 2, 12, C.wood); rect(c, bx + 5, by - 20, 2, 12, C.wood); rect(c, bx - 9, by - 22, 18, 3, C.red);
    const glow = 0.4 + 0.3 * Math.sin(t / 500); c.fillStyle = `rgba(160,143,212,${glow.toFixed(2)})`; c.fillRect(bx - 3, by - 7, 6, 1);
  } else if (kind === "shop") {
    sh(20); rect(c, bx - 20, by - 22, 40, 22, C.wood2); rect(c, bx - 22, by - 30, 44, 9, C.red); for (let i = 0; i < 5; i++) rect(c, bx - 22 + i * 9, by - 22, 5, 3, C.cream);
    rect(c, bx - 4, by - 12, 8, 12, C.wood); rect(c, bx - 16, by - 16, 7, 6, C.water2); rect(c, bx + 9, by - 16, 7, 6, C.water2);
  } else if (kind === "stall") {
    sh(20); rect(c, bx - 20, by - 10, 40, 10, C.wood); rect(c, bx - 20, by - 26, 2, 16, C.wood); rect(c, bx + 18, by - 26, 2, 16, C.wood);
    for (let i = 0; i < 6; i++) rect(c, bx - 22 + i * 7.5, by - 28, 7, 5, i % 2 ? C.cream : "#4f9a3c");
    rect(c, bx - 15, by - 13, 5, 4, C.red); rect(c, bx - 6, by - 13, 5, 4, C.gold); rect(c, bx + 4, by - 13, 6, 4, C.leaf2);
  } else if (kind === "nest") {
    sh(8); rect(c, bx - 8, by - 6, 16, 6, C.wood2); for (let i = 0; i < 4; i++) rect(c, bx - 8 + i * 4, by - 6, 2, 6, C.wood);
    c.fillStyle = "#a08fd4"; c.beginPath(); c.ellipse(bx - 3, by - 8, 3, 4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = C.gold; c.beginPath(); c.ellipse(bx + 3, by - 8, 3, 4, 0, 0, Math.PI * 2); c.fill();
  } else if (kind === "lamp") {
    sh(4); rect(c, bx - 1, by - 20, 2, 20, C.ink); rect(c, bx - 3, by - 24, 6, 5, C.ink);
    const on = !isDay(); rect(c, bx - 2, by - 23, 4, 3, on ? C.gold : C.cream);
  } else if (kind === "flower") {
    rect(c, bx - 1, by - 5, 1, 5, C.leaf); rect(c, bx - 2, by - 7, 3, 3, "#cf5f9f"); rect(c, bx + 2, by - 4, 1, 4, C.leaf); rect(c, bx + 1, by - 6, 3, 3, C.gold);
  } else if (kind === "nestOld") {
    // an empty nest with a cracked shell: one for every companion hatched in the Refuge
    sh(6); rect(c, bx - 6, by - 4, 12, 4, C.wood2); rect(c, bx - 6, by - 4, 12, 1, C.wood); rect(c, bx - 4, by - 2, 2, 1, C.wood);
    c.fillStyle = C.cream; c.beginPath(); c.ellipse(bx - 1, by - 5, 3, 2.5, 0, Math.PI, 0); c.fill(); rect(c, bx + 2, by - 6, 2, 2, C.cream);
  } else if (kind === "scrolls" || kind === "scrolls2" || kind === "lectern") {
    // the writings you've found pile up by the board: a roll, then a stack, then a reading stand
    if (kind === "lectern") { sh(6); rect(c, bx - 1, by - 9, 2, 9, C.wood); rect(c, bx - 6, by - 14, 12, 5, C.wood2); rect(c, bx - 5, by - 14, 10, 3, C.cream); rect(c, bx, by - 14, 1, 3, C.wood); }
    else { sh(5); rect(c, bx - 5, by - 3, 10, 3, C.cream); rect(c, bx - 5, by - 3, 1, 3, "#c9b48a"); rect(c, bx + 4, by - 3, 1, 3, "#c9b48a"); rect(c, bx - 1, by - 3, 2, 3, C.red);
      if (kind === "scrolls2") { rect(c, bx - 3, by - 6, 8, 3, "#efe3c6"); rect(c, bx - 3, by - 6, 1, 3, "#c9b48a"); rect(c, bx + 4, by - 6, 1, 3, "#c9b48a"); } }
  } else if (kind === "patch") {
    // the foraging nook looks like what your creature's circle does there
    const k = circle();
    if (k === "sol") { sh(7); c.fillStyle = C.leaf; c.beginPath(); c.arc(bx, by - 6, 7, 0, Math.PI * 2); c.fill(); for (const [x, y] of [[-3, -8], [2, -5], [3, -10], [-2, -3]]) rect(c, bx + x, by + y, 2, 2, C.red); }
    else if (k === "sky") { const o = Math.round(Math.sin(t / 300) * 2); c.strokeStyle = C.cream; c.lineWidth = 1; c.beginPath(); c.arc(bx + o, by - 8, 5, 0.3, 5.2); c.stroke(); c.beginPath(); c.arc(bx + o, by - 8, 2, 0.3, 5.2); c.stroke(); rect(c, bx - 6, by - 2, 12, 1, C.grass2); }
    else if (k === "lake") { sh(7); c.fillStyle = C.path2; c.beginPath(); c.ellipse(bx, by - 2, 7, 3, 0, Math.PI, 0); c.fill(); rect(c, bx + 2, by - 7, 5, 4, C.stone); rect(c, bx + 2, by - 7, 5, 1, C.stone2); }
    else if (k === "frost") { sh(6); for (const [x, h] of [[-4, 6], [0, 9], [4, 7]]) { rect(c, bx + x, by - h, 1, h, "#5f8fb0"); rect(c, bx + x - 1, by - h - 2, 3, 3, "#bfe3f2"); } }
    else { sh(6); const a = 0.5 + 0.4 * Math.sin(t / 400); c.fillStyle = `rgba(226,174,46,${a.toFixed(2)})`; rect(c, bx - 1, by - 10, 2, 6, c.fillStyle); rect(c, bx - 3, by - 8, 6, 2, c.fillStyle); rect(c, bx - 6, by - 2, 12, 1, C.grass2); }
  } else if (kind === "garden") {
    // tilled rows that fill up with each level; a fence from level 3, a little shed at level 5
    const n = EV.BUILD ? EV.BUILD.lvl("garden") : 1, st = EV.BUILD ? EV.BUILD.gardenStock() : { f: 0 };
    rect(c, bx - 8, by - 9, 32, 9, C.path2);
    for (let r = 0; r < 2; r++) rect(c, bx - 7, by - 8 + r * 4, 30, 2, "#8a6a3e");
    const plants = Math.min(10, 2 + n * 2);
    for (let i = 0; i < plants; i++) { const px = bx - 6 + (i % 5) * 6, py = by - 9 + Math.floor(i / 5) * 4; rect(c, px, py - 2, 2, 3, C.leaf); rect(c, px + 1, py - 3, 2, 2, C.grass2); if (i < st.f) rect(c, px + 2, py - 1, 2, 2, i % 3 === 2 ? "#e2ae2e" : C.red); }
    if (n >= 3) { for (let x = -9; x <= 24; x += 4) rect(c, bx + x, by - 11, 1, 4, C.wood); rect(c, bx - 9, by - 10, 34, 1, C.wood2); }
    if (n >= 5) { rect(c, bx + 18, by - 16, 7, 7, C.wood2); rect(c, bx + 17, by - 18, 9, 2, C.red); rect(c, bx + 20, by - 13, 2, 4, C.ink); }
  } else if (kind === "bottle") {
    const o = Math.round(Math.sin(t / 500) * 1.5);
    rect(c, bx - 4, by - 7 + o, 8, 4, "#8fc9a8"); rect(c, bx + 4, by - 6 + o, 3, 2, "#8fc9a8"); rect(c, bx + 7, by - 6 + o, 1, 2, C.wood);
    rect(c, bx - 3, by - 6 + o, 3, 1, C.cream); rect(c, bx - 4, by - 3 + o, 8, 1, C.water2);
  } else if (kind === "tila") {
    sh(5); rect(c, bx - 4, by - 10, 8, 10, "#5b4b8e"); rect(c, bx - 3, by - 16, 6, 6, "#f0c8a0"); rect(c, bx - 4, by - 17, 8, 3, "#3b2a4a");
    rect(c, bx + 4, by - 12, 1, 6, C.ink); rect(c, bx + 3, by - 7, 4, 4, C.gold); rect(c, bx - 2, by - 14, 1, 1, C.ink); rect(c, bx + 1, by - 14, 1, 1, C.ink);
  }
}
const boardNew = () => { const d = $("dailyDot"); return !!(d && !d.hidden); };
const isDay = () => { const h = new Date().getHours(); return h >= 7 && h < 19; };

/* ---------- State ---------- */
let W0 = null; // { map, x, y, px, py, path, face, dir, then, cb }
let cv = null, ctx = null, raf = 0, dialog = null, foodPick = false, menuOn = false;
function ws() {
  const P = EV.P;
  if (!P.world || !MAPS[P.world.map]) P.world = { map: "home", x: MAPS.home.start[0], y: MAPS.home.start[1] };
  if (!W0) W0 = { map: P.world.map, x: P.world.x, y: P.world.y, px: P.world.x * TW, py: P.world.y * TW, path: [], face: 1, dir: "front", then: null, cb: null };
  return W0;
}
const curMap = () => MAPS[ws().map];
const quiet = () => (EV.quietOn ? EV.quietOn() : false);
const placesNow = () => curMap().places.filter((p) => !(p.hideQuiet && quiet()) && (!p.when || p.when()));
const panelOpen = () => { const el = $("mapPanel"); return !!(el && !el.hidden); };
// the home is drawn from above unless the player picked the side view; the star catch game always uses the side view
function topOn() {
  const S = EV.S, g = $("scrGame");
  return !!(S && S.phase === "alive" && EV.P.view !== "side" && !(EV.miniOn && EV.miniOn()) && g && !g.hidden);
}

// things that show up at home as the story moves on: a nest for each hatched companion, the writings you've found, Tila's lantern
function homeExtras() {
  const P = EV.P, out = [];
  const roster = Object.keys((P.eg && P.eg.roster) || {});
  [[11, 9], [12, 9], [9, 9], [12, 8]].slice(0, roster.length).forEach(([x, y]) => out.push(["nestOld", x, y]));
  const n = Object.keys(P.escritos || {}).length;
  if (n) out.push([n >= 15 ? "lectern" : n >= 5 ? "scrolls2" : "scrolls", 12, 5]);
  if (P.cosm && P.cosm.mem && P.cosm.mem.tila) out.push(["lamp", 6, 9]);
  return out;
}

function mood() { const s = EV.S.stats; return (s.full + s.fun + s.energy + s.clean) / 4; }
function petSprite(dir, sq) {
  const S = EV.S; if (!S) return null;
  // PNG art (art.js) wins over the drawn placeholder; it is drawn at a third of its size on the 3x home
  if (typeof EVART !== "undefined") {
    const m = mood(), fx = EV.FX || {};
    const emo = S.sleeping ? "sleep" : fx.foodAnim ? "surprised" : S.sick || m < 35 ? "sad" : m > 70 ? "happy" : "normal";
    const cv = EVART.creature(S.species, Math.max(0, Math.min(2, S.stage || 0)), sq || 0, (dir || "front") === "front" ? emo : "normal", dir || "front");
    if (cv) return cv;
  }
  if (typeof EVS !== "undefined" && EVS.KINDS && EVS.KINDS.includes(S.species)) {
    const st = Math.max(0, Math.min(2, S.stage || 0)), n = [14, 18, 24][st];
    const fx = EV.FX || {}, m = mood();
    const emo = S.sleeping ? "sleep" : fx.foodAnim ? "surprised" : S.sick || m < 35 ? "sad" : m > 70 ? "happy" : "normal";
    try { return EVS.sprite(S.species, n, st, sq || 0, emo, S.form === "scruffy", dir || "front"); } catch (e) { return null; }
  }
  return null;
}

/* ---------- Walking: one update a frame, shared by the map panel and the home ---------- */
let lastT = 0;
function stepWalk(now) {
  if (now === lastT) return;
  const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0; lastT = now;
  const w = ws();
  if (w.path.length) {
    // 5 tiles a second, one tile at a time
    const [tx2, ty2] = w.path[0], gx = tx2 * TW, gy = ty2 * TW, sp = 80 * dt;
    const dx = gx - w.px, dy = gy - w.py, d = Math.hypot(dx, dy);
    // 4 directions: side when moving across (mirrored for left), back when walking up, front when walking down
    if (dx) { w.face = Math.sign(dx); w.dir = "side"; } else if (dy) w.dir = dy < 0 ? "back" : "front";
    if (d <= sp) { w.px = gx; w.py = gy; w.x = tx2; w.y = ty2; w.path.shift(); if (!w.path.length) { w.dir = "front"; arrived(); } }
    else { w.px += (dx / d) * sp; w.py += (dy / d) * sp; }
  } else wander(dt);
}
// at home and with nothing to do, the creature potters about on its own
function wander(dt) {
  const S = EV.S, w = ws();
  if (!topOn() || panelOpen() || w.map !== "home" || S.sleeping || dialog || EV.FX.foodAnim || Math.random() > dt * 0.22) return;
  const m = curMap(), opts = [];
  for (let y = w.y - 3; y <= w.y + 3; y++) for (let x = w.x - 3; x <= w.x + 3; x++) if (!blocked(m, x, y) && (x !== w.x || y !== w.y) && m.rows[y][x] !== "=") opts.push([x, y]);
  if (!opts.length) return;
  const r = path(m, [w.x, w.y], opts[Math.floor(Math.random() * opts.length)]);
  if (r && r.length && r.length <= 5) { w.path = r; w.then = null; w.cb = null; }
}
// route from where the creature is now; if it is mid-step, finish that tile first
function routeTo(stand) {
  const w = ws(), m = curMap();
  if (!w.path.length) return w.x === stand[0] && w.y === stand[1] ? [] : path(m, [w.x, w.y], stand);
  const nxt = w.path[0];
  if (nxt[0] === stand[0] && nxt[1] === stand[1]) return [nxt];
  const r = path(m, nxt, stand); return r ? [nxt].concat(r) : null;
}

/* ---------- Drawing one frame of the map onto a 240 x 176 context ---------- */
function messTile(m) { const k = Math.round(m.x); return [2 + Math.round(((k - 30) / 300) * 10), 6 + (k % 3)]; }
// upgraded places (build.js) wear a little row of gold marks, one per level above 1
const BUILD_OF = { well: "well", pantry: "pantry", nest: "inc", patch: "nook", toVado: "path" };
function buildMarks(g, p) {
  const id = BUILD_OF[p.id]; if (!id || !EV.BUILD) return;
  const n = EV.BUILD.lvl(id) - 1; if (n <= 0) return;
  const x0 = p.x * TW + 8 - (n * 3 - 1) / 2, y = p.y * TW - 3;
  for (let i = 0; i < n; i++) { rect(g, x0 + i * 3 - 0.5, y - 0.5, 3, 3, C.ink); rect(g, x0 + i * 3, y, 2, 2, n >= 4 ? C.gold : "#f2d27a"); }
}
function drawWorld(g, now) {
  const w = ws(), m = curMap(), S = EV.S;
  g.imageSmoothingEnabled = false;
  const art = typeof EVART !== "undefined" ? EVART : null, bg = art && art.image("maps/" + w.map + ".png");
  g.drawImage(bg || drawGround(w.map), 0, 0, W, H);
  if (w.map === "home" && S && S.messes) for (const ms of S.messes) {
    const [mx, my] = messTile(ms), x = mx * TW + 8, y = my * TW + 10;
    rect(g, x - 4, y - 2, 8, 4, "#7a5a3a"); rect(g, x - 2, y - 4, 4, 2, "#8f6c46"); rect(g, x + 3, y - 3, 2, 2, "#7a5a3a");
  }
  // sorted by base Y so the creature walks in front of or behind things
  const items = [];
  const deco = w.map === "home" ? m.deco.concat(homeExtras()) : m.deco;
  for (const [k, x, y] of deco) items.push({ y: y * TW + TW, draw: () => drawObj(g, k, x * TW + 8, y * TW + TW - 1, now) });
  for (const p of placesNow()) if (p.obj) items.push({ y: p.y * TW + TW, draw: () => { if (typeof p.obj === "function") p.obj(g, p.x * TW + 8, p.y * TW + TW - 1, now); else drawObj(g, p.obj, p.x * TW + 8, p.y * TW + TW - 1, now); buildMarks(g, p); } });
  const walking = w.path.length > 0;
  // asleep at home: curled up on the moss bed
  const bed = MAPS.home.places.find((p) => p.id === "bed");
  const inBed = S && S.sleeping && w.map === "home" && !walking;
  const img = petSprite(inBed ? "front" : w.dir, walking ? Math.floor(now / 160) % 2 : 0);
  const fx = EV.FX || {};
  const hd = img && img.width >= 64 ? 3 : 1; // a PNG cell is drawn at a third of its pixels (1:1 on the 3x home)
  const pos = { x: 0, y: 0, h: img ? img.height / hd : 14 };
  items.push({ y: (inBed ? bed.y * TW + 1 : w.py) + TW + 0.5, draw: () => {
    const hop = fx.foodAnim ? Math.abs(Math.sin(now / 120)) * 2 : 0;
    const bob = walking ? Math.abs(Math.sin(now / 90)) * 2 : S && S.sleeping ? 0 : Math.sin(now / 400) * 0.6 + hop;
    const bx = inBed ? bed.x * TW + 8 : Math.round(w.px + 8), by = inBed ? bed.y * TW + TW - 5 : Math.round(w.py + TW - 1);
    pos.x = bx; pos.y = by - Math.round(bob);
    if (!inBed) { g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by - 1, 6, 2.5, 0, 0, Math.PI * 2); g.fill(); }
    if (img) {
      g.save(); g.translate(bx, by - Math.round(bob)); if (!inBed && w.dir === "side" && w.face < 0) g.scale(-1, 1);
      g.drawImage(img, -img.width / hd / 2, -img.height / hd + (hd > 1 ? 4 / hd : 0), img.width / hd, img.height / hd); g.restore();
    } else { g.fillStyle = C.gold; g.beginPath(); g.arc(bx, by - 7 - bob, 6, 0, Math.PI * 2); g.fill(); }
  } });
  items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
  const front = art && art.image("maps/" + w.map + "-front.png"); if (front) g.drawImage(front, 0, 0, W, H);
  if (EV.WEATHER) EV.WEATHER.draw(g, now, W, H);
  if (!isDay()) { g.fillStyle = "rgba(31,47,92,.32)"; g.fillRect(0, 0, W, H); }
  if (S && S.sleeping) { g.fillStyle = "rgba(14,8,20,.35)"; g.fillRect(0, 0, W, H); }
  return pos;
}

/* ---------- The map panel ---------- */
function frame(now) {
  raf = 0;
  if (!panelOpen() || !ctx) return;
  stepWalk(now);
  drawWorld(ctx, now);
  raf = requestAnimationFrame(frame);
}
function kick() { if (!raf) raf = requestAnimationFrame(frame); }

/* ---------- The home, drawn from above at 3x into the habitat box ---------- */
const HS = 3, HOY = 16; // scale, and the top margin that fills the 360:280 box
let off = null, offG = null, topG = null;
function bubbleHi(c, x, y, text) {
  c.font = '600 26px "EvNum", "Pixelify Sans", monospace';
  const w = Math.round(Math.max(70, c.measureText(text).width + 34)), h = 46;
  const bx = Math.max(10, Math.min(720 - w - 10, Math.round(x - w / 2))), by = Math.max(6, Math.round(y - h - 14));
  c.fillStyle = "#fbf6ef"; c.strokeStyle = "#1d1626"; c.lineWidth = 3;
  c.fillRect(bx, by, w, h); c.strokeRect(bx + 1.5, by + 1.5, w - 3, h - 3);
  const tx2 = Math.max(bx + 14, Math.min(bx + w - 14, x));
  c.fillStyle = "#1d1626"; c.fillRect(tx2 - 6, by + h - 2, 12, 6); c.fillStyle = "#fbf6ef"; c.fillRect(tx2 - 3, by + h - 3, 6, 4);
  c.fillStyle = "#1d1626"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, bx + w / 2, by + h / 2 + 1);
}
function homeFrame(now) {
  requestAnimationFrame(homeFrame);
  const tc = $("topScene"); if (!tc) return;
  const on = topOn();
  if (tc.hidden === on) { tc.hidden = !on; renderHomeDlg(); }
  if (!on) return;
  // with PNG art (art.js) the home is drawn at 3x so every pixel of the art shows; otherwise at 1x and scaled up as before
  const A = typeof EVART !== "undefined" ? EVART : null, hi = !!(A && EV.S && (A.image("maps/" + ws().map + ".png") || A.has(EV.S.species)));
  const k = hi ? HS : 1;
  if (!off || off.width !== W * k) { off = document.createElement("canvas"); off.width = W * k; off.height = H * k; offG = off.getContext("2d"); topG = tc.getContext("2d"); }
  stepWalk(now);
  offG.setTransform(k, 0, 0, k, 0, 0); offG.imageSmoothingEnabled = false;
  const pos = drawWorld(offG, now), S = EV.S, fx = EV.FX || {}, c = topG;
  c.imageSmoothingEnabled = false;
  c.fillStyle = C.grassN; c.fillRect(0, 0, 720, 560);
  c.drawImage(off, 0, HOY, W * HS, H * HS);
  // the strips above and below the map get the same night and sleep tint
  for (const [on2, col] of [[!isDay(), "rgba(31,47,92,.32)"], [S.sleeping, "rgba(14,8,20,.35)"]]) if (on2) { c.fillStyle = col; c.fillRect(0, 0, 720, HOY); c.fillRect(0, HOY + H * HS, 720, 560 - HOY - H * HS); }
  // the side scene's hearts, sparkles and bubbles, drawn around the creature
  const hx = pos.x * HS, hy = HOY + (pos.y - pos.h / 2) * HS, top = HOY + (pos.y - pos.h) * HS;
  for (const e of fx.effects || []) {
    const x = hx + (e.x - fx.petX) * 0.9, y = hy + (e.y - 190) * 0.9;
    c.save(); c.globalAlpha = Math.max(0, Math.min(1, e.life));
    if (e.type === "heart") { c.fillStyle = "#ef6f9a"; c.translate(x, y); c.scale(e.r / 6, e.r / 6); c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-10, -2, -6, -10, 0, -5); c.bezierCurveTo(6, -10, 10, -2, 0, 6); c.fill(); }
    else if (e.type === "bubble") { c.strokeStyle = "#ffffff"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, e.r * 1.4, 0, Math.PI * 2); c.stroke(); c.fillStyle = "rgba(255,255,255,.25)"; c.fill(); }
    else if (e.type === "petal" || e.type === "spark") { c.fillStyle = e.hue || "#ffe27a"; c.fillRect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, 6, 6); }
    else if (e.type === "txt" && EV.pixelText) EV.pixelText(c, e.text + " ✦", Math.round(hx + (e.x - fx.petX) * 0.6), Math.round(top - 10 - (220 - e.y) * 0.2), 24, "#ffd57a");
    c.restore();
  }
  if (S.sick && !S.sleeping) { const x = hx + 30, y = top - 8; c.fillStyle = "#241030"; c.fillRect(x, y, 22, 22); c.fillStyle = "#fbf6ef"; c.fillRect(x + 2, y + 2, 18, 18); c.fillStyle = "#d9542c"; c.fillRect(x + 8, y + 4, 6, 14); c.fillRect(x + 4, y + 8, 14, 6); }
  if (S.sleeping && EV.pixelText) {
    const t = now / 1000;
    for (let i = 0; i < 3; i++) { const p = (t * 0.5 + i / 3) % 1; c.globalAlpha = 1 - p; EV.pixelText(c, "z", Math.round(hx + 24 + p * 30), Math.round(top - p * 50 - i * 2), 22 + i * 3, "#c8eef5"); }
    c.globalAlpha = 1;
  }
  if (fx.bubble && now < fx.bubble.until) bubbleHi(c, hx, top, fx.bubble.text);
}
function topPoint(ev) {
  const r = $("topScene").getBoundingClientRect();
  const x = ((ev.clientX - r.left) / r.width) * 720 / HS, y = (((ev.clientY - r.top) / r.height) * 560 - HOY) / HS;
  return { x, y, tx: Math.floor(x / TW), ty: Math.floor(y / TW) };
}
// tapping at home: the creature gets a pat; a place does what its care button does
function onTopTap(ev) {
  const S = EV.S; if (!S || S.phase !== "alive") return;
  const p = topPoint(ev), w = ws();
  const bed = MAPS.home.places.find((q) => q.id === "bed");
  const cx = S.sleeping && w.map === "home" && !w.path.length ? bed.x * TW + 8 : w.px + 8, cy = S.sleeping && w.map === "home" && !w.path.length ? bed.y * TW + 6 : w.py + 6;
  if (Math.abs(p.x - cx) < 13 && Math.abs(p.y - cy) < 14) { if (!S.sleeping && EV.cuddle) EV.cuddle(); return; }
  const q = placesNow().find((o) => (o.x === p.tx && o.y === p.ty) || (o.solid && o.solid.some(([a, b]) => a === p.tx && b === p.ty)) || (o.stand[0] === p.tx && o.stand[1] === p.ty));
  if (!q) return;
  const btn = { bowl: "aFeed", bed: "aSleep", pond: "aClean", lawn: "aPlay" }[q.id];
  if (btn && w.map === "home") { const b = $(btn); if (b && !b.disabled) b.click(); return; }
  choose(q.id);
}

/* ---------- Care from the home buttons (called from index.html) ---------- */
function careWalk(id, fn) {
  if (!topOn()) return false;
  const w = ws(); if (w.map !== "home") return false;
  const p = MAPS.home.places.find((q) => q.id === id); if (!p) return false;
  const r = routeTo(p.stand); if (!r || !r.length) return false;
  dialog = null; foodPick = false;
  w.path = r; w.then = null; w.cb = fn;
  renderHomeDlg();
  return true;
}
// the day's summary, shown at the moss bed before going to sleep
const SNAP = ["fed", "cuddles", "plays", "messes", "expDone", "dailyDone"];
function dayBase() {
  const P = EV.P, d = today();
  if (!P.dayLog || P.dayLog.day !== d) { P.dayLog = { day: d, c: {} }; for (const k of SNAP) P.dayLog.c[k] = P.c[k] || 0; EV.saveProfile(); }
  return P.dayLog;
}
function summary() {
  const S = EV.S, P = EV.P, b = dayBase().c, s = steps();
  const parts = SNAP.map((k) => [k, (P.c[k] || 0) - (b[k] || 0)]).filter(([, n]) => n > 0).map(([k, n]) => tx("s." + k) + ": " + n);
  let text = parts.length ? tx("bed.sum", { name: S.name }) + " " + parts.join(" · ") + "." : tx("bed.none");
  if (boardNew()) text += " " + tx("bed.board");
  if (s) text += " " + tx("bed.steps", { n: s.n, d: STEPS.daily + (EV.BUILD ? EV.BUILD.pathBonus() : 0) });
  dialog = { who: "bed", pet: "sleep", text, opts: ["bed.sleep"], close: "bed.later" };
}
function bedtime() {
  if (!topOn()) return false;
  const w = ws();
  const go = () => { summary(); render(); };
  if (w.map === "home") { const bed = MAPS.home.places.find((q) => q.id === "bed"); if (careWalk("bed", go)) return true; if (w.x !== bed.stand[0] || w.y !== bed.stand[1]) return false; }
  go(); return true;
}

/* ---------- The foraging nook and the bottle in the pond ---------- */
function circle() { const S = EV.S, t = S && typeof EVS !== "undefined" && EVS.KIND_TYPE ? EVS.KIND_TYPE[S.species] : null; if (t === "star") return "star"; const T = EV.RPG && EV.RPG.TYPES[t]; return (T && T.circle) || "sol"; } // circles come from TYPES in rpg/data-cards.js
// the same answer all day, different each day
function dayRnd(salt) { let h = 2166136261; for (const ch of today() + salt) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; }
// a bottle drifts into the pond on about two days in three; it stays until opened
function bottleHere() { const b = EV.P.bottle; return dayRnd("bottle") >= 0.34 && !(b && b.day === today()); }
function openBottle() {
  const P = EV.P; P.bottle = { day: today() };
  const r = rumour(), k = Math.floor(dayRnd("gift") * 4);
  let g;
  if (k === 0) { EV.addCoins(10); g = tx("g.coins", { n: 10 }); }
  else if (k === 1) { P.dust = (P.dust || 0) + 12; g = tx("g.dust", { n: 12 }); }
  else { const it = k === 2 ? "cookie" : "fizzpop"; P.inv[it] = (P.inv[it] || 0) + 1; g = tx("g.item", { item: EV.itemName(it) }); }
  P.c.bottles = (P.c.bottles || 0) + 1;
  dialog = { who: "bottle", pet: "surprised", text: (r ? tx("bottle.0") + " " + quote(r) : tx("bottle.wet")) + " " + tx("bottle.gift", { g }), opts: [] };
  EV.sfx("chirp"); EV.saveProfile();
}
// once a day per creature, for 2 steps: each circle searches its own way
function forage() {
  const S = EV.S, P = EV.P, key = creatureKey();
  P.forage = P.forage || {};
  // the Nook build (build.js) allows more searches a day; old saves kept just the day
  // searches pile up for up to 3 days (design rule 4); old saves kept the day, or { day, n } used today
  const per = EV.BUILD ? EV.BUILD.nookN() : 1;
  let fg = P.forage[key]; if (typeof fg === "string") fg = { day: fg, n: 1 };
  if (fg && fg.left == null) fg = { day: fg.day, left: fg.day === today() ? Math.max(0, per - (fg.n || 0)) : 0 };
  fg = EV.DAILY ? EV.DAILY.charge(fg || { day: null, left: 0 }, per, per * 3) : fg || { day: today(), left: per };
  P.forage[key] = fg;
  if (fg.left <= 0) { dialog = { who: "pet", emo: "normal", text: tx("f.done", { name: S.name }), opts: [] }; return; }
  if (!spendSteps(2)) { EV.toast(tx("noSteps", { name: S.name })); EV.sfx("deny"); return; }
  fg.left--; P.forage[key] = fg; P.c.forage = (P.c.forage || 0) + 1;
  const k = circle(); let text;
  if (k === "sol") { P.inv.melon = (P.inv.melon || 0) + 1; text = tx("f.sol", { name: S.name, g: tx("g.item", { item: EV.itemName("melon") }) }); }
  else if (k === "sky") { EV.addCoins(12); S.stats.fun = EV.clamp(S.stats.fun + 10); text = tx("f.sky", { name: S.name, n: 12 }); }
  else if (k === "lake") { const n = 8 + Math.floor(Math.random() * 7); P.dust = (P.dust || 0) + n; text = tx("f.lake", { name: S.name, n }); }
  else if (k === "frost") { P.inv.tea = (P.inv.tea || 0) + 1; text = tx("f.frost", { name: S.name }); }
  else { EV.addCoins(8); P.dust = (P.dust || 0) + 5; text = tx("f.star", { name: S.name, n: 8, d: 5 }); }
  dialog = { who: "pet", emo: "happy", text, opts: [] };
  EV.sfx("chirp"); EV.save(); EV.saveProfile(); EV.renderStats();
}

/* ---------- Choosing a place ---------- */
function costOf(p) { return p.go ? STEPS.move : p.id === "trail" ? STEPS.trail : p.cost || 0; }
function choose(id) {
  const S = EV.S;
  if (!S || S.phase !== "alive") { EV.toast(tx("needAlive")); return; }
  const w = ws(), p = placesNow().find((x) => x.id === id); if (!p) return;
  dialog = null; foodPick = false;
  if (S.sleeping && id !== "bed") { EV.toast(tx("asleep", { name: S.name })); EV.sfx("deny"); render(); return; }
  const cost = costOf(p);
  if (cost && p.go && (steps() || {}).n < cost) { EV.toast(tx("noSteps", { name: S.name })); EV.sfx("deny"); return; }
  const route = routeTo(p.stand);
  if (!route) return;
  EV.sfx("tap");
  menuOn = false;
  w.path = route; w.then = p.id; w.cb = null;
  if (!route.length) arrived();
  render(); kick();
}
function arrived() {
  const w = ws(), id = w.then, cb = w.cb; w.then = null; w.cb = null;
  const P = EV.P; P.world = { map: w.map, x: w.x, y: w.y };
  if (cb) cb();
  else { const p = id && curMap().places.find((x) => x.id === id); if (p) act(p); }
  EV.saveProfile(); if (id || cb) render();
}
function goMap(to) {
  if (!spendSteps(STEPS.move)) { EV.toast(tx("noSteps", { name: EV.S.name })); return; }
  const w = ws(), back = MAPS[to].places.find((p) => p.go === w.map);
  w.map = to; w.x = back.stand[0]; w.y = back.stand[1]; w.px = w.x * TW; w.py = w.y * TW;
  // step inside the map so you aren't standing on the way back
  const inside = MAPS[to].start; const r = path(MAPS[to], [w.x, w.y], inside); w.path = r || []; w.then = null; w.cb = null;
  EV.P.world = { map: w.map, x: inside[0], y: inside[1] };
  EV.sfx("chirp");
}
// what tapping each place does; a place added with EV.WORLD.addPlace can bring its own act(p)
const ACT = {
  bowl: () => { foodPick = true; },
  bed: () => { if (!EV.S.sleeping && EV.S.stats.energy <= 85) summary(); else EV.toggleSleep(); },
  pond: () => { EV.cleanUp(); },
  lawn: () => { if (panelOpen()) EV.togglePanel("map"); menuOn = false; EV.startPlay(); },
  board: () => { EV.togglePanel("daily", true); },
  root: () => { rootTalk(); },
  well: () => { if (EV.HOOKS.openWell) EV.HOOKS.openWell(); else EV.togglePanel("cards", true); },
  pantry: () => { EV.togglePanel("daily", true); },
  shop: () => { EV.togglePanel("shop", true); },
  nest: () => { EV.togglePanel("refuge", true); },
  tila: () => { dialog = { who: "tila", emo: "happy", pet: "happy", text: tx("tila.hi", { name: EV.S.name }), opts: ["tila.q1", "tila.q2", "tila.q3"] }; },
  patch: () => { forage(); },
  garden: () => { const r = EV.BUILD.harvest(); dialog = { who: "pet", emo: r.n ? "happy" : "normal", text: tx("garden.hi", { name: EV.S.name }) + " " + r.text, opts: ["build.open"] }; },
  orders: () => { const r = EV.BUILD.ordersDialog(); dialog = { who: "orders", text: r.text, opts: r.opts.concat(["build.open"]) }; },
  bottle: () => { openBottle(); },
  trail: () => { dialog = { who: "trail", text: tx("trailAsk"), opts: ["trail.go", "trail.stay"] }; },
};
function act(p) {
  if (p.go) { goMap(p.go); return; }
  const f = p.act || ACT[p.id];
  if (f) f(p);
}

const LORE = () => window.EvoLore || null;
const quote = (r) => (L() === "es" ? "«" + r + "»" : "\u201c" + r + "\u201d");
function rumour() { const Lr = LORE(); return Lr ? Lr.loadingLine(EV.P, L()) : ""; }
function rootTalk() {
  const r = rumour();
  dialog = { who: "root", pet: r ? "surprised" : "normal", text: r ? tx("root.0") + " " + quote(r) : tx("root.calm"), opts: r ? ["root.more"] : [] };
}
function answer(k) {
  const S = EV.S;
  EV.sfx("tap");
  if (k === "close") { dialog = null; render(); return; }
  if (k === "root.more") { rootTalk(); render(); return; }
  if (k === "build.open") { dialog = null; render(); EV.togglePanel("build", true); return; }
  if (k.startsWith("ord.")) {
    const r = EV.BUILD.deliver(+k.slice(4)), nx = EV.BUILD.ordersDialog();
    dialog = { who: "orders", pet: r && r.ok ? "happy" : "normal", text: r ? r.text : nx.text, opts: nx.opts.concat(["build.open"]) };
    render(); return;
  }
  if (k === "bed.sleep") { dialog = null; if (!S.sleeping) EV.toggleSleep(); render(); return; }
  if (k === "tila.q1") { const r = rumour(); dialog = { who: "tila", emo: "normal", pet: r ? "surprised" : "normal", text: r ? tx("tila.a1") + " " + quote(r) : tx("tila.a1none"), opts: ["tila.q2", "tila.q3"] }; }
  else if (k === "tila.q2") { const lit = !!(EV.P.cosm && EV.P.cosm.mem && EV.P.cosm.mem.tila); dialog = { who: "tila", emo: lit ? "happy" : "worried", pet: lit ? "happy" : "sad", text: tx(lit ? "tila.a2lit" : "tila.a2dark"), opts: ["tila.q1", "tila.q3"] }; }
  else if (k === "tila.q3") dialog = { who: "tila", emo: "happy", pet: "normal", text: tx("tila.a3"), opts: ["tila.q1", "tila.q2"] };
  else if (k === "trail.stay") dialog = null;
  else if (k === "trail.go") {
    dialog = null;
    if ((steps() || {}).n < STEPS.trail) { EV.toast(tx("noSteps", { name: S.name })); EV.sfx("deny"); render(); return; }
    const before = EV.RPG && EV.RPG.X;
    if (!EV.RPG) return;
    if (panelOpen()) EV.togglePanel("map");
    menuOn = false;
    EV.RPG.startExpedition(); EV.showScreen();
    // only pay if the expedition really started (it can refuse: asleep, sick, tired)
    if (EV.RPG.X && EV.RPG.X !== before) spendSteps(STEPS.trail);
    return;
  }
  render();
}

/* ---------- Panel ---------- */
// 40 x 40 portraits; Tila and your creature change face with the conversation
function tilaBust(g, emo) {
  rect(g, 6, 31, 28, 9, "#5b4b8e"); rect(g, 16, 26, 8, 6, "#f0c8a0");
  rect(g, 11, 9, 18, 19, "#f0c8a0"); rect(g, 9, 5, 22, 7, "#3b2a4a"); rect(g, 9, 5, 3, 16, "#3b2a4a"); rect(g, 28, 5, 3, 16, "#3b2a4a");
  rect(g, 13, 21, 3, 1, "#e89a8a"); rect(g, 24, 21, 3, 1, "#e89a8a");
  const ink = C.ink;
  if (emo === "happy") { for (const x of [14, 23]) { rect(g, x, 17, 1, 1, ink); rect(g, x + 1, 16, 1, 1, ink); rect(g, x + 2, 17, 1, 1, ink); } rect(g, 17, 24, 6, 1, ink); rect(g, 16, 23, 1, 1, ink); rect(g, 23, 23, 1, 1, ink); }
  else if (emo === "worried") { rect(g, 15, 16, 2, 2, ink); rect(g, 23, 16, 2, 2, ink); rect(g, 14, 14, 3, 1, ink); rect(g, 23, 14, 3, 1, ink); rect(g, 17, 13, 1, 1, ink); rect(g, 22, 13, 1, 1, ink); rect(g, 18, 24, 4, 1, ink); rect(g, 17, 25, 1, 1, ink); rect(g, 22, 25, 1, 1, ink); }
  else { rect(g, 15, 16, 2, 2, ink); rect(g, 23, 16, 2, 2, ink); rect(g, 18, 24, 4, 1, ink); }
  rect(g, 33, 27, 1, 6, ink); rect(g, 31, 32, 5, 5, ink); rect(g, 32, 33, 3, 3, C.gold);
}
function petPortrait(g, emo) {
  const S = EV.S;
  if (S && typeof EVS !== "undefined" && EVS.KINDS && EVS.KINDS.includes(S.species)) {
    try { const sp = EVS.sprite(S.species, 30, Math.max(0, Math.min(2, S.stage || 0)), 0, emo || "normal", S.form === "scruffy"); g.drawImage(sp, Math.round(20 - sp.width / 2), 39 - sp.height); return; } catch (e) {}
  }
  g.fillStyle = C.gold; g.beginPath(); g.arc(20, 24, 10, 0, Math.PI * 2); g.fill();
}
function portrait(who, emo) {
  const c = document.createElement("canvas"); c.width = 40; c.height = 40;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  g.fillStyle = "#e9d8b4"; g.fillRect(0, 0, 40, 40);
  g.save();
  if (who === "root") drawObj(g, "root", 20, 34, performance.now());
  else if (who === "tila") { const f = typeof EVART !== "undefined" && EVART.image("faces/tila.png"); if (f) g.drawImage(f, Math.floor((40 - f.width) / 2), Math.floor((40 - f.height) / 2)); else tilaBust(g, emo); }
  else if (who === "pet") petPortrait(g, emo);
  else { g.scale(2, 2); drawObj(g, who === "bed" ? "bed" : who === "bottle" ? "bottle" : who === "orders" ? "board" : "sign", 10, who === "bed" ? 21 : 19, 0); }
  g.restore();
  return c.toDataURL();
}
function dlgHtml(alive) {
  if (dialog) {
    const nm = dialog.who === "tila" ? "Tila" : dialog.who === "root" ? tx("root.name") : dialog.who === "bed" ? tx("bedName") : dialog.who === "bottle" ? tx("bottleName") : dialog.who === "pet" ? EV.S.name : dialog.who === "orders" ? tx("ordersName") : tx("trailName");
    const lbl = (k) => (k.startsWith("ord.") ? EV.BUILD.ordLabel(+k.slice(4)) : k === "trail.go" ? tx("go", { n: STEPS.trail }) : k === "trail.stay" ? tx("stay") : k === "root.more" ? tx("d.more") : tx(k));
    const main = (k) => k === "trail.go" || k === "bed.sleep";
    const react = dialog.pet && dialog.who !== "pet" ? `<img class="wdlg-pet" alt="" src="${portrait("pet", dialog.pet)}">` : "";
    return `<div class="wdlg"><div class="wdlg-faces"><img class="wdlg-face" alt="" src="${portrait(dialog.who, dialog.emo)}">${react}</div><div class="wdlg-body"><b>${esc(nm)}</b><p>${esc(dialog.text)}</p><div class="wdlg-opts">${dialog.opts.map((k) => `<button class="btn${main(k) ? "" : " ghost"}" type="button" data-wans="${k}">${esc(lbl(k))}</button>`).join("")}<button class="btn ghost" type="button" data-wans="close">${esc(tx(dialog.close || "d.close"))}</button></div></div></div>`;
  }
  if (foodPick && alive) {
    const foods = Object.keys(EV.ITEMS).filter((k) => EV.ITEMS[k].cat === "food" && (!EV.stocked(k) || (EV.P.inv[k] || 0) > 0));
    return `<div class="wdlg"><div class="wdlg-body"><b>${esc(tx("food.pick"))}</b>${foods.length ? "" : `<p>${esc(EV.t("feed.empty"))}</p>`}<div class="wdlg-opts">${foods.map((k) => `<button class="btn ghost" type="button" data-wfood="${k}">${esc(EV.itemName(k))}${EV.stocked(k) ? " ×" + EV.P.inv[k] : ""}</button>`).join("")}<button class="btn ghost" type="button" data-wfood="">${esc(tx("food.none"))}</button></div></div></div>`;
  }
  return "";
}
// the window over the home: dialogues at the bottom, the list of places as a menu over the map, and where you are in the corner
function menuHtml() {
  const S = EV.S, w = ws(), s = steps(), alive = S && S.phase === "alive";
  return `<div class="wmenu-head"><b>${esc(tx("map." + w.map))}</b><span class="steps" title="${esc(tx("stepsT", { n: s ? s.n : 0 }))}">👣 ${esc(tx("steps", { n: s ? s.n : 0 }))}</span><button type="button" class="wmenu-x" data-wmenu="close" aria-label="${esc(tx("d.close"))}">✕</button></div><div class="wmenu-sub">${esc(tx(w.map + ".sub"))}</div><div class="wmenu-grid">${placesNow().map((p) => {
    const c = costOf(p), poor = c && s && s.n < c;
    const d = p.id === "patch" ? tx("pd." + circle()) : tx("p." + p.id + ".d");
    return `<button type="button" class="wchip${p.go ? " go" : ""}" data-wgo="${p.id}" title="${esc(d)}" ${alive ? "" : "disabled"}><strong>${esc(tx("p." + p.id))}</strong><small class="${poor ? "poor" : c ? "" : "ok"}">${esc(c ? "👣 " + c : tx("free"))}</small></button>`;
  }).join("")}</div>`;
}
function renderHomeDlg() {
  const el = $("topDlg"); if (!el) return;
  const S = EV.S, on = !panelOpen() && topOn();
  if (!on) menuOn = false;
  const h = on ? dlgHtml(S && S.phase === "alive") : "";
  stageBits(on, !!h);
  if (el.innerHTML === h) return;
  el.innerHTML = h;
  // on a phone the window can be scrolled away: bring a new dialogue into view
  if (h) { const r = el.getBoundingClientRect(); if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
}
function stageBits(on, talking) {
  if (on == null) on = !panelOpen() && topOn();
  if (talking == null) talking = !!$("topDlg") && $("topDlg").innerHTML !== "";
  const mn = $("wMenu"), tag = $("wTag"), w = ws();
  if (mn) {
    const show = on && menuOn && !talking, mh = show ? menuHtml() : "";
    if (mn.innerHTML !== mh) mn.innerHTML = mh;
    mn.hidden = !show;
  }
  if (tag) {
    const s = steps(), Wt = EV.WEATHER, wx = Wt && Wt.now() !== "clear" ? Wt.label() : "";
    const th = !on || menuOn ? "" : w.map !== "home" ? `${esc(tx("map." + w.map))} · 👣 ${s ? s.n : 0}${wx ? " · " + esc(Wt.icon()) : ""}` : wx ? esc(wx) : "";
    if (on && wx) Wt.maybeTip();
    if (tag.innerHTML !== th) tag.innerHTML = th;
    tag.hidden = !th;
  }
  const b = $("btnMap"); if (b) b.classList.toggle("on", !!(menuOn && on));
}
// the Map button opens the list of places over the window; in the side view it still opens the map panel
function toggleMenu(force) {
  if (!topOn()) { EV.togglePanel("map"); return; }
  if (EV.closeSheets) EV.closeSheets();
  menuOn = force != null ? force : !menuOn;
  if (menuOn) { dialog = null; foodPick = false; }
  renderHomeDlg();
  if (menuOn) { const st = $("topScene"); if (st) { const r = st.getBoundingClientRect(); if (r.top < 0 || r.bottom > window.innerHeight) st.scrollIntoView({ behavior: "smooth", block: "nearest" }); } }
}
function render() {
  renderHomeDlg();
  const el = $("mapPanel"); if (!el || el.hidden) return;
  const S = EV.S, w = ws(), s = steps();
  const alive = S && S.phase === "alive", going = w.path.length && (w.then || w.cb);
  let h = `<div class="panel-head"><div><div class="sub">${esc(tx(w.map + ".sub"))}</div><h2>${esc(tx("map." + w.map))}</h2></div><span class="progress steps" title="${esc(tx("stepsT", { n: s ? s.n : 0 }))}">👣 ${esc(tx("steps", { n: s ? s.n : 0 }))}</span></div>`;
  h += `<div class="wmap-wrap"><canvas id="wCanvas" width="${W}" height="${H}" role="img" aria-label="${esc(tx("map." + w.map))}"></canvas></div>`;
  if (!alive) h += `<p class="muted">${esc(tx("needAlive"))}</p>`;
  else if (going) h += `<p class="muted wmap-walk">${esc(tx("walking", { name: S.name }))}</p>`;
  h += dlgHtml(alive);
  h += `<h3 class="cat-title">${esc(tx("where"))}</h3><div class="wplaces">${placesNow().map((p) => {
    const c = costOf(p), poor = c && s && s.n < c;
    return `<button type="button" class="wplace" data-wgo="${p.id}" ${alive ? "" : "disabled"}><strong>${esc(tx("p." + p.id))}</strong><small>${esc(p.id === "patch" ? tx("pd." + circle()) : tx("p." + p.id + ".d"))}</small><small class="${poor ? "poor" : "ok"}">${esc(c ? (c === 1 ? tx("cost1") : tx("costN", { n: c })) : tx("free"))}</small></button>`;
  }).join("")}</div>`;
  el.innerHTML = h;
  cv = $("wCanvas"); ctx = cv.getContext("2d");
  kick();
}
function onClick(e) {
  const b = e.target.closest("button");
  if (b && !b.disabled) {
    const d = b.dataset;
    if (d.wmenu) { EV.sfx("tap"); toggleMenu(false); }
    else if (d.wgo) choose(d.wgo);
    else if (d.wans) answer(d.wans);
    else if (d.wfood != null) { foodPick = false; if (d.wfood) EV.feed(d.wfood); render(); }
    return;
  }
  // tapping a place on the map picks it; the ground itself does nothing
  if (e.target.id === "wCanvas") {
    const r = e.target.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * MW), y = Math.floor((e.clientY - r.top) / r.height * MH);
    const p = placesNow().find((q) => (q.x === x && q.y === y) || (q.solid && q.solid.some(([a, b2]) => a === x && b2 === y)) || (q.stand[0] === x && q.stand[1] === y));
    if (p) choose(p.id);
  }
}
function refreshChip() {
  const btn = $("btnMap"); if (!btn) return;
  const S = EV.S, alive = S && S.phase === "alive" && S.stage >= 1;
  btn.hidden = !alive;
  $("mapLbl").textContent = tx("nav");
  const s = alive ? steps() : null;
  $("stepVal").textContent = s ? "👣 " + s.n : "";
}

const css = `
.wmap-wrap { border: 3px solid var(--line, #3b1d4a); background: #241030; line-height: 0; margin: 8px 0; }
#wCanvas { width: 100%; height: auto; image-rendering: pixelated; image-rendering: crisp-edges; display: block; cursor: pointer; }
.wplaces { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-top: 6px; }
.wplace { border: 2px solid var(--line); background: var(--bg); padding: 8px 10px; text-align: left; font: inherit; color: inherit; display: flex; flex-direction: column; gap: 2px; cursor: pointer; }
.wplace[disabled] { opacity: .55; cursor: default; }
.wplace small { color: var(--muted); } .wplace small.ok { color: var(--moss, #3c7a2c); } .wplace small.poor { color: #b8364b; }
.wdlg { display: flex; gap: 10px; align-items: flex-start; border: 3px solid var(--line); background: color-mix(in srgb, #e9d8b4 30%, var(--surface)); padding: 10px; margin: 8px 0; }
.wdlg-face { width: 80px; height: 80px; image-rendering: pixelated; border: 2px solid var(--line); flex: none; }
.wdlg-faces { display: flex; flex-direction: column; align-items: flex-end; flex: none; }
.wdlg-pet { width: 48px; height: 48px; margin-top: -12px; margin-right: -6px; image-rendering: pixelated; border: 2px solid var(--line); background: #e9d8b4; position: relative; }
.wdlg-body { flex: 1; min-width: 0; } .wdlg-body p { margin: 4px 0 8px; font-family: Georgia, serif; line-height: 1.5; }
.wdlg-opts { display: flex; flex-wrap: wrap; gap: 6px; }
.steps { white-space: nowrap; }
.wmap-walk { margin: 0; font-style: italic; }
#topDlg { position: absolute; left: 6px; right: 6px; bottom: 6px; z-index: 3; max-height: calc(100% - 12px); overflow: auto; }
#topDlg:empty { display: none; }
#topDlg .wdlg { margin: 0; padding: 8px; gap: 8px; background: color-mix(in srgb, #e9d8b4 55%, var(--surface)); box-shadow: 0 3px 0 rgba(0,0,0,.35); }
#topDlg .wdlg-face { width: 56px; height: 56px; } #topDlg .wdlg-pet { width: 34px; height: 34px; }
#topDlg .wdlg-body p { font-size: 14px; line-height: 1.4; margin: 2px 0 6px; }
#topDlg .wdlg-opts .btn { padding: 5px 10px; font-size: 13px; min-height: 0; }
.wmenu { position: absolute; left: 6px; right: 6px; bottom: 6px; z-index: 3; max-height: calc(100% - 12px); overflow: auto; border: 3px solid var(--line); background: color-mix(in srgb, var(--surface) 92%, transparent); padding: 6px 8px 8px; box-shadow: 0 3px 0 rgba(0,0,0,.35); }
.wmenu-head { display: flex; align-items: center; gap: 8px; } .wmenu-head b { font-size: 15px; flex: 1; }
.wmenu-head .steps { font-size: 12px; color: var(--muted); }
.wmenu-x { border: 2px solid var(--line); background: var(--bg); color: inherit; font: inherit; width: 30px; height: 30px; cursor: pointer; padding: 0; }
.wmenu-sub { font-size: 12px; color: var(--muted); margin: 0 0 6px; }
.wmenu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 5px; }
.wchip { border: 2px solid var(--line); background: var(--bg); color: inherit; font: inherit; padding: 5px 6px; text-align: left; display: flex; flex-direction: column; gap: 1px; cursor: pointer; min-width: 0; }
.wchip strong { font-size: 12.5px; line-height: 1.2; overflow-wrap: anywhere; } .wchip small { font-size: 11px; color: var(--muted); }
.wchip small.ok { color: var(--moss, #3c7a2c); } .wchip small.poor { color: #b8364b; }
.wchip.go { border-style: dashed; } .wchip[disabled] { opacity: .55; cursor: default; }
.wtag { position: absolute; left: 8px; top: 8px; z-index: 2; background: rgba(29,22,38,.78); color: #fbf6ef; font-size: 12px; padding: 3px 8px; border-radius: 3px; pointer-events: none; }
#btnMap.on { outline: 2px solid var(--gold, #e0b04a); }
@media (max-width: 480px) { .wdlg-face { width: 56px; height: 56px; } .wdlg-pet { width: 36px; height: 36px; } }
`;
const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

EV.HOOKS.renderMap = () => { foodPick = false; setTimeout(render, 0); };
const prevShow = EV.HOOKS.showScreen;
EV.HOOKS.showScreen = function () { if (prevShow) prevShow.apply(this, arguments); refreshChip(); renderHomeDlg(); };
$("mapPanel").addEventListener("click", onClick);
if ($("topDlg")) $("topDlg").addEventListener("click", onClick);
if ($("wMenu")) $("wMenu").addEventListener("click", onClick);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOn) toggleMenu(false); });
if ($("topScene")) $("topScene").addEventListener("pointerdown", onTopTap);
requestAnimationFrame(homeFrame);
$("btnMap").addEventListener("click", () => { EV.sfx("tap"); toggleMenu(); });
EV.every(5000, () => { refreshChip(); stageBits(); if (EV.S && EV.S.phase === "alive") dayBase(); });
refreshChip(); if (EV.S && EV.S.phase === "alive") dayBase();
/* Add a place to a map from another module: { id, x, y, stand: [x, y], solid?, obj?: name or fn(g, x, y, now), cost?, when?, act?(p),
   text: { es: [name, description], en: [...] } }. The stand tile must be walkable and free. */
function addPlace(mapId, p) {
  const m = MAPS[mapId];
  if (!m) throw new Error("addPlace: no map " + mapId);
  if (m.places.some((q) => q.id === p.id)) throw new Error("addPlace: " + p.id + " is already on " + mapId);
  if (!p.text || !p.text.es || !p.text.en) throw new Error("addPlace: " + p.id + " needs es and en text");
  if (!p.stand || blocked(m, p.stand[0], p.stand[1])) throw new Error("addPlace: " + p.id + " stands on a blocked tile");
  for (const lg of ["es", "en"]) { TX[lg]["p." + p.id] = p.text[lg][0]; TX[lg]["p." + p.id + ".d"] = p.text[lg][1] || ""; }
  m.places.push(p);
  render();
  return p;
}
EV.WORLD = { MAPS, addPlace, stageBits, ACT, STEPS, steps, spendSteps, gainFromEnergy, path, choose, render, refreshChip, careWalk, bedtime, topOn, homeExtras, circle, bottleHere, get state() { return ws(); }, get dialog() { return dialog; } };
})();
