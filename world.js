/* Evolvlings: the walkable map (first delivery).
   A small tile engine seen from 3/4 above: the ground is drawn from the top and anything with height from the front.
   You never steer by tapping the ground. You pick a place, from the list or by tapping it on the map, and the creature
   walks there on its own along the shortest path (A*), then the place's action runs.
   Two maps for now: the Keeper's corner of the Glade (home) and El Vado (the plaza). Moving between them and setting out
   on an expedition costs daily steps ("pasos"); talking, looking, shops and care at home are free.
   Steps belong to each creature: 10 a day, up to 20 saved, plus 1 for every 10 energy that food or a recharge gives
   (at most 12 bought a day). Sleeping gives none. */
(function () {
"use strict";
const EV = window.EV;
if (!EV) return;
const $ = EV.$, esc = EV.escapeHtml;
const L = () => EV.LANG;

const TX = {
  es: {
    nav: "Mapa", title: "El Claro y el Vado", steps: "{n} pasos", stepsT: "Pasos de hoy: {n}. Se recargan 10 a medianoche (máximo 20 guardados). El té, el guiso y la recarga de energía dan pasos extra, hasta 12 al día.",
    where: "¿Adónde vas?", walking: "{name} va de camino…", free: "gratis", cost1: "1 paso", costN: "{n} pasos", noSteps: "A {name} no le quedan pasos hoy. Un té o una recarga de energía dan más.", noStepsShort: "Sin pasos",
    needAlive: "Primero necesitas una criatura que pueda caminar.", asleep: "{name} está dormida. Despiértala para salir.",
    gotSteps: "+{n} pasos para {name}", stepsCap: "Hoy ya no se pueden comprar más pasos.",
    "map.home": "Tu rincón del Claro", "map.vado": "El Vado",
    "home.sub": "Un claro pequeño junto al bosque. Aquí cuidar es gratis.", "vado.sub": "La plaza al otro lado del arroyo: pozo, puestos y gente de paso.",
    "p.bowl": "Comedero", "p.bowl.d": "Darle de comer", "p.bed": "Cama de musgo", "p.bed.d": "Dormir o despertar", "p.pond": "Charca", "p.pond.d": "Bañarse",
    "p.lawn": "Claro abierto", "p.lawn.d": "Jugar a cazar estrellas", "p.root": "Raíz del Claro", "p.root.d": "Escuchar la Raíz", "p.board": "Tablón", "p.board.d": "Ver las tareas",
    "p.toVado": "Camino al Vado", "p.toVado.d": "Cruzar el arroyo", "p.toHome": "Camino a casa", "p.toHome.d": "Volver a tu rincón",
    "p.well": "Pozo de los Ecos", "p.well.d": "Tirar cartas", "p.pantry": "Despensa", "p.pantry.d": "Tirada del día", "p.shop": "Tienda", "p.shop.d": "Comprar comida y cosas",
    "p.nest": "Incubadora", "p.nest.d": "Ver el Refugio y los huevos", "p.tila": "Tila", "p.tila.d": "Hablar", "p.trail": "Sendero de las expediciones", "p.trail.d": "Salir de expedición",
    "food.pick": "¿Qué le pones en el comedero?", "food.none": "Cerrar",
    "d.close": "Adiós", "d.more": "Seguir escuchando",
    "root.name": "La Raíz", "root.0": "La Raíz cruje bajo el musgo. Si pegas la oreja, se oye algo parecido a una voz:", "root.calm": "Hoy la Raíz está tranquila. Solo se oye el agua de la charca.",
    "tila.hi": "¡Hola, {name}! ¿Vienes del Claro? Yo voy de farol en farol, como siempre.", "tila.q1": "¿Qué se cuenta por el Vado?", "tila.q2": "¿Cómo va tu calle?", "tila.q3": "¿Y esas manchas de aceite?",
    "tila.a1": "Pues mira, lo último que he oído:", "tila.a1none": "Nada nuevo. El Vado está tan quieto que hasta el arroyo bosteza.",
    "tila.a2lit": "¡Encendida entera! Desde la Noche de Faroles los vecinos se paran a mirarla. Gracias por ayudarme.", "tila.a2dark": "Media calle a oscuras todavía. Cuando llegue la Noche de Faroles, ¿me echas una mano?",
    "tila.a3": "¿Esto? El aceite de Albor mancha que da gusto. En mi barrio decimos que si no te manchas, no has encendido nada.",
    trailName: "Sendero", trailAsk: "El sendero sale del Vado hacia las zonas del valle. Cuesta 3 pasos y la energía de siempre.", go: "Salir ({n} pasos)", stay: "Ahora no",
  },
  en: {
    nav: "Map", title: "The Glade and El Vado", steps: "{n} steps", stepsT: "Steps today: {n}. 10 come back at midnight (up to 20 saved). Tea, stew and the energy recharge give extra steps, up to 12 a day.",
    where: "Where to?", walking: "{name} is on the way…", free: "free", cost1: "1 step", costN: "{n} steps", noSteps: "{name} has no steps left today. A tea or an energy recharge gives more.", noStepsShort: "No steps",
    needAlive: "First you need a creature that can walk.", asleep: "{name} is asleep. Wake it up to go out.",
    gotSteps: "+{n} steps for {name}", stepsCap: "No more steps can be bought today.",
    "map.home": "Your corner of the Glade", "map.vado": "El Vado",
    "home.sub": "A small clearing by the wood. Care is free here.", "vado.sub": "The plaza across the stream: a well, stalls and people passing through.",
    "p.bowl": "Bowl", "p.bowl.d": "Feed", "p.bed": "Moss bed", "p.bed.d": "Sleep or wake", "p.pond": "Pond", "p.pond.d": "Have a bath",
    "p.lawn": "Open lawn", "p.lawn.d": "Play star catch", "p.root": "Glade Root", "p.root.d": "Listen to the Root", "p.board": "Notice board", "p.board.d": "See the tasks",
    "p.toVado": "Path to El Vado", "p.toVado.d": "Cross the stream", "p.toHome": "Path home", "p.toHome.d": "Back to your corner",
    "p.well": "Well of Echoes", "p.well.d": "Pull cards", "p.pantry": "Pantry", "p.pantry.d": "Pull of the day", "p.shop": "Shop", "p.shop.d": "Buy food and things",
    "p.nest": "Incubator", "p.nest.d": "See the Refuge and eggs", "p.tila": "Tila", "p.tila.d": "Talk", "p.trail": "Expedition trail", "p.trail.d": "Set out on an expedition",
    "food.pick": "What goes in the bowl?", "food.none": "Close",
    "d.close": "Goodbye", "d.more": "Keep listening",
    "root.name": "The Root", "root.0": "The Root creaks under the moss. If you put your ear to it, you hear something like a voice:", "root.calm": "The Root is quiet today. Only the pond water can be heard.",
    "tila.hi": "Hi, {name}! Coming from the Glade? I'm going lantern to lantern, as always.", "tila.q1": "What's the news in El Vado?", "tila.q2": "How's your street?", "tila.q3": "What are those oil stains?",
    "tila.a1": "Well, the latest I've heard:", "tila.a1none": "Nothing new. El Vado is so still even the stream is yawning.",
    "tila.a2lit": "Fully lit! Since the Night of Lanterns the neighbours stop to look at it. Thanks for helping me.", "tila.a2dark": "Half the street is still dark. When the Night of Lanterns comes, will you give me a hand?",
    "tila.a3": "These? Albor oil stains like nothing else. In my quarter we say if you don't get stained, you haven't lit anything.",
    trailName: "Trail", trailAsk: "The trail leaves El Vado for the valley's zones. It costs 3 steps and the usual energy.", go: "Set out ({n} steps)", stay: "Not now",
  },
};
const tx = (k, v) => { let s = (TX[L()] || TX.en)[k]; if (s == null) s = TX.en[k]; if (s == null) return k; if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => (v[n] != null ? v[n] : m)); return s; };

/* ---------- Steps ("pasos"), per creature ---------- */
const STEPS = { daily: 10, keep: 20, buyMax: 12, move: 1, trail: 3 };
const today = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
const creatureKey = () => { const S = EV.S; return S ? S.species + ":" + (S.born || 0) : null; };
function steps() {
  const P = EV.P, k = creatureKey(); if (!k) return null;
  P.steps = P.steps || {};
  let s = P.steps[k];
  if (!s) s = P.steps[k] = { day: today(), n: STEPS.daily, bought: 0 };
  if (s.day !== today()) { s.n = Math.min(STEPS.keep, s.n + STEPS.daily); s.bought = 0; s.day = today(); }
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
const TW = 16, MW = 15, MH = 11, W = TW * MW, H = TW * MH;
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
    ],
    start: [7, 1], deco: [["tree", 1, 1], ["tree", 13, 5], ["tree", 1, 9], ["lamp", 6, 6], ["lamp", 8, 3], ["flower", 13, 9]],
  },
};
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
  const sh = (w) => { c.fillStyle = C.shadow; c.beginPath(); c.ellipse(bx + 1, by - 1, w, 2.5, 0, 0, Math.PI * 2); c.fill(); };
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
  } else if (kind === "tila") {
    sh(5); rect(c, bx - 4, by - 10, 8, 10, "#5b4b8e"); rect(c, bx - 3, by - 16, 6, 6, "#f0c8a0"); rect(c, bx - 4, by - 17, 8, 3, "#3b2a4a");
    rect(c, bx + 4, by - 12, 1, 6, C.ink); rect(c, bx + 3, by - 7, 4, 4, C.gold); rect(c, bx - 2, by - 14, 1, 1, C.ink); rect(c, bx + 1, by - 14, 1, 1, C.ink);
  }
}
const isDay = () => { const h = new Date().getHours(); return h >= 7 && h < 19; };

/* ---------- State and loop ---------- */
let W0 = null; // { map, x, y, px, py, path, face, then, walking }
let cv = null, ctx = null, raf = 0, dialog = null, foodPick = false;
function ws() {
  const P = EV.P;
  if (!P.world || !MAPS[P.world.map]) P.world = { map: "home", x: MAPS.home.start[0], y: MAPS.home.start[1] };
  if (!W0) W0 = { map: P.world.map, x: P.world.x, y: P.world.y, px: P.world.x * TW, py: P.world.y * TW, path: [], face: 1, dir: "front", then: null };
  return W0;
}
const curMap = () => MAPS[ws().map];
const quiet = () => (EV.quietOn ? EV.quietOn() : false);
const placesNow = () => curMap().places.filter((p) => !(p.hideQuiet && quiet()));

function petSprite(dir, sq) {
  const S = EV.S; if (!S) return null;
  if (typeof EVS !== "undefined" && EVS.KINDS && EVS.KINDS.includes(S.species)) {
    const n = S.stage >= 2 ? 24 : 16;
    try { return EVS.sprite(S.species, n, Math.min(2, S.stage || 1), sq || 0, S.sleeping ? "sleep" : "normal", false, dir || "front"); } catch (e) { return null; }
  }
  return null;
}
function frame(now) {
  raf = 0;
  const el = $("mapPanel"); if (!el || el.hidden || !ctx) return;
  const w = ws(), m = curMap();
  // walking: 5 tiles a second, one tile at a time
  if (w.path.length) {
    const [tx2, ty2] = w.path[0], gx = tx2 * TW, gy = ty2 * TW, sp = 80 / 60;
    const dx = gx - w.px, dy = gy - w.py, d = Math.hypot(dx, dy);
    // 4 directions: side when moving across (mirrored for left), back when walking up, front when walking down
    if (dx) { w.face = Math.sign(dx); w.dir = "side"; } else if (dy) w.dir = dy < 0 ? "back" : "front";
    if (d <= sp) { w.px = gx; w.py = gy; w.x = tx2; w.y = ty2; w.path.shift(); if (!w.path.length) { w.dir = "front"; arrived(); } }
    else { w.px += (dx / d) * sp; w.py += (dy / d) * sp; }
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(drawGround(w.map), 0, 0);
  // sorted by base Y so the creature walks in front of or behind things
  const items = [];
  for (const [k, x, y] of m.deco) items.push({ y: y * TW + TW, draw: () => drawObj(ctx, k, x * TW + 8, y * TW + TW - 1, now) });
  for (const p of placesNow()) if (p.obj) items.push({ y: p.y * TW + TW, draw: () => drawObj(ctx, p.obj, p.x * TW + 8, p.y * TW + TW - 1, now) });
  // two-frame step while walking
  const img = petSprite(w.dir, w.path.length ? Math.floor(now / 160) % 2 : 0);
  items.push({ y: w.py + TW + 0.5, draw: () => {
    const bob = w.path.length ? Math.abs(Math.sin(now / 90)) * 2 : Math.sin(now / 400) * 0.6;
    const bx = Math.round(w.px + 8), by = Math.round(w.py + TW - 1);
    ctx.fillStyle = C.shadow; ctx.beginPath(); ctx.ellipse(bx, by - 1, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    if (img) {
      ctx.save(); ctx.translate(bx, by - Math.round(bob)); if (w.dir === "side" && w.face < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -Math.round(img.width / 2), -img.height); ctx.restore();
    } else { ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(bx, by - 7 - bob, 6, 0, Math.PI * 2); ctx.fill(); }
  } });
  items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
  // canopies over the top row of trees
  if (!isDay()) { ctx.fillStyle = "rgba(31,47,92,.32)"; ctx.fillRect(0, 0, W, H); }
  if (EV.S && EV.S.sleeping) { ctx.fillStyle = "rgba(14,8,20,.35)"; ctx.fillRect(0, 0, W, H); }
  raf = requestAnimationFrame(frame);
}
function kick() { if (!raf) raf = requestAnimationFrame(frame); }

/* ---------- Choosing a place ---------- */
function costOf(p) { return p.go ? STEPS.move : p.id === "trail" ? STEPS.trail : 0; }
function choose(id) {
  const S = EV.S;
  if (!S || S.phase !== "alive") { EV.toast(tx("needAlive")); return; }
  const w = ws(), p = placesNow().find((x) => x.id === id); if (!p) return;
  if (w.path.length) return;
  dialog = null; foodPick = false;
  if (S.sleeping && id !== "bed") { EV.toast(tx("asleep", { name: S.name })); EV.sfx("deny"); render(); return; }
  const cost = costOf(p);
  if (cost && p.go && (steps() || {}).n < cost) { EV.toast(tx("noSteps", { name: S.name })); EV.sfx("deny"); return; }
  const route = w.x === p.stand[0] && w.y === p.stand[1] ? [] : path(curMap(), [w.x, w.y], p.stand);
  if (!route) return;
  EV.sfx("tap");
  w.path = route; w.then = p.id;
  if (!route.length) arrived();
  render(); kick();
}
function arrived() {
  const w = ws(), id = w.then; w.then = null;
  const P = EV.P; P.world = { map: w.map, x: w.x, y: w.y };
  const p = curMap().places.find((x) => x.id === id);
  if (p) act(p);
  EV.saveProfile(); render();
}
function goMap(to) {
  if (!spendSteps(STEPS.move)) { EV.toast(tx("noSteps", { name: EV.S.name })); return; }
  const w = ws(), back = MAPS[to].places.find((p) => p.go === w.map);
  w.map = to; w.x = back.stand[0]; w.y = back.stand[1]; w.px = w.x * TW; w.py = w.y * TW;
  // step inside the map so you aren't standing on the way back
  const inside = MAPS[to].start; const r = path(MAPS[to], [w.x, w.y], inside); w.path = r || []; w.then = null;
  EV.P.world = { map: w.map, x: inside[0], y: inside[1] };
  EV.sfx("chirp");
}
function act(p) {
  const S = EV.S;
  if (p.go) { goMap(p.go); return; }
  switch (p.id) {
    case "bowl": foodPick = true; break;
    case "bed": EV.toggleSleep(); break;
    case "pond": EV.cleanUp(); break;
    case "lawn": EV.togglePanel("map"); EV.startPlay(); break;
    case "board": EV.togglePanel("daily", true); break;
    case "root": rootTalk(); break;
    case "well": if (EV.HOOKS.openWell) EV.HOOKS.openWell(); else EV.togglePanel("cards", true); break;
    case "pantry": EV.togglePanel("daily", true); break;
    case "shop": EV.togglePanel("shop", true); break;
    case "nest": EV.togglePanel("refuge", true); break;
    case "tila": dialog = { who: "tila", text: tx("tila.hi", { name: S.name }), opts: ["tila.q1", "tila.q2", "tila.q3"] }; break;
    case "trail": dialog = { who: "trail", text: tx("trailAsk"), opts: ["trail.go", "trail.stay"] }; break;
  }
}
const LORE = () => window.EvoLore || null;
const quote = (r) => (L() === "es" ? "«" + r + "»" : "\u201c" + r + "\u201d");
function rumour() { const Lr = LORE(); return Lr ? Lr.loadingLine(EV.P, L()) : ""; }
function rootTalk() {
  const r = rumour();
  dialog = { who: "root", text: r ? tx("root.0") + " " + quote(r) : tx("root.calm"), opts: r ? ["root.more"] : [] };
}
function answer(k) {
  const S = EV.S;
  EV.sfx("tap");
  if (k === "close") { dialog = null; render(); return; }
  if (k === "root.more") { rootTalk(); render(); return; }
  if (k === "tila.q1") { const r = rumour(); dialog = { who: "tila", text: r ? tx("tila.a1") + " " + quote(r) : tx("tila.a1none"), opts: ["tila.q2", "tila.q3"] }; }
  else if (k === "tila.q2") { const lit = !!(EV.P.cosm && EV.P.cosm.mem && EV.P.cosm.mem.tila); dialog = { who: "tila", text: tx(lit ? "tila.a2lit" : "tila.a2dark"), opts: ["tila.q1", "tila.q3"] }; }
  else if (k === "tila.q3") dialog = { who: "tila", text: tx("tila.a3"), opts: ["tila.q1", "tila.q2"] };
  else if (k === "trail.stay") dialog = null;
  else if (k === "trail.go") {
    dialog = null;
    if ((steps() || {}).n < STEPS.trail) { EV.toast(tx("noSteps", { name: S.name })); EV.sfx("deny"); render(); return; }
    const before = EV.RPG && EV.RPG.X;
    if (!EV.RPG) return;
    EV.togglePanel("map");
    EV.RPG.startExpedition(); EV.showScreen();
    // only pay if the expedition really started (it can refuse: asleep, sick, tired)
    if (EV.RPG.X && EV.RPG.X !== before) spendSteps(STEPS.trail);
    return;
  }
  render();
}

/* ---------- Panel ---------- */
function portrait(who) {
  const c = document.createElement("canvas"); c.width = 40; c.height = 40;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  g.fillStyle = "#e9d8b4"; g.fillRect(0, 0, 40, 40);
  g.save();
  if (who === "root") drawObj(g, "root", 20, 34, performance.now());
  else { g.scale(2, 2); drawObj(g, who === "tila" ? "tila" : "sign", 10, 19, 0); }
  g.restore();
  return c.toDataURL();
}
function render() {
  const el = $("mapPanel"); if (!el || el.hidden) return;
  const S = EV.S, w = ws(), s = steps();
  const alive = S && S.phase === "alive";
  let h = `<div class="panel-head"><div><div class="sub">${esc(tx(w.map + ".sub"))}</div><h2>${esc(tx("map." + w.map))}</h2></div><span class="progress steps" title="${esc(tx("stepsT", { n: s ? s.n : 0 }))}">👣 ${esc(tx("steps", { n: s ? s.n : 0 }))}</span></div>`;
  h += `<div class="wmap-wrap"><canvas id="wCanvas" width="${W}" height="${H}" role="img" aria-label="${esc(tx("map." + w.map))}"></canvas></div>`;
  if (!alive) h += `<p class="muted">${esc(tx("needAlive"))}</p>`;
  else if (w.path.length) h += `<p class="muted wmap-walk">${esc(tx("walking", { name: S.name }))}</p>`;
  if (dialog) {
    const nm = dialog.who === "tila" ? "Tila" : dialog.who === "root" ? tx("root.name") : tx("trailName");
    h += `<div class="wdlg"><img class="wdlg-face" alt="" src="${portrait(dialog.who)}"><div class="wdlg-body"><b>${esc(nm)}</b><p>${esc(dialog.text)}</p><div class="wdlg-opts">${dialog.opts.map((k) => `<button class="btn${k === "trail.go" ? "" : " ghost"}" type="button" data-wans="${k}">${esc(k === "trail.go" ? tx("go", { n: STEPS.trail }) : k === "trail.stay" ? tx("stay") : k === "root.more" ? tx("d.more") : tx(k))}</button>`).join("")}<button class="btn ghost" type="button" data-wans="close">${esc(tx("d.close"))}</button></div></div></div>`;
  } else if (foodPick && alive) {
    const foods = Object.keys(EV.ITEMS).filter((k) => EV.ITEMS[k].cat === "food" && (EV.ITEMS[k].price === 0 || (EV.P.inv[k] || 0) > 0));
    h += `<div class="wdlg"><div class="wdlg-body"><b>${esc(tx("food.pick"))}</b><div class="wdlg-opts">${foods.map((k) => `<button class="btn ghost" type="button" data-wfood="${k}">${esc(EV.itemName(k))}${EV.ITEMS[k].price ? " ×" + EV.P.inv[k] : ""}</button>`).join("")}<button class="btn ghost" type="button" data-wfood="">${esc(tx("food.none"))}</button></div></div></div>`;
  }
  h += `<h3 class="cat-title">${esc(tx("where"))}</h3><div class="wplaces">${placesNow().map((p) => {
    const c = costOf(p), poor = c && s && s.n < c;
    return `<button type="button" class="wplace" data-wgo="${p.id}" ${alive && !w.path.length ? "" : "disabled"}><strong>${esc(tx("p." + p.id))}</strong><small>${esc(tx("p." + p.id + ".d"))}</small><small class="${poor ? "poor" : "ok"}">${esc(c ? (c === 1 ? tx("cost1") : tx("costN", { n: c })) : tx("free"))}</small></button>`;
  }).join("")}</div>`;
  el.innerHTML = h;
  cv = $("wCanvas"); ctx = cv.getContext("2d");
  kick();
}
function onClick(e) {
  const b = e.target.closest("button");
  if (b && !b.disabled) {
    const d = b.dataset;
    if (d.wgo) choose(d.wgo);
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
.wdlg-body { flex: 1; min-width: 0; } .wdlg-body p { margin: 4px 0 8px; font-family: Georgia, serif; line-height: 1.5; }
.wdlg-opts { display: flex; flex-wrap: wrap; gap: 6px; }
.steps { white-space: nowrap; }
.wmap-walk { margin: 0; font-style: italic; }
@media (max-width: 480px) { .wdlg-face { width: 56px; height: 56px; } }
`;
const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

EV.HOOKS.renderMap = () => { foodPick = false; setTimeout(render, 0); };
const prevShow = EV.HOOKS.showScreen;
EV.HOOKS.showScreen = function () { if (prevShow) prevShow.apply(this, arguments); refreshChip(); };
$("mapPanel").addEventListener("click", onClick);
$("btnMap").addEventListener("click", () => { EV.sfx("tap"); EV.togglePanel("map"); });
setInterval(refreshChip, 5000);
refreshChip();
EV.WORLD = { MAPS, STEPS, steps, spendSteps, gainFromEnergy, path, choose, render, refreshChip, get state() { return ws(); } };
})();
