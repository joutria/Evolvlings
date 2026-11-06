/* Evolvlings: achievements in 7 categories with bronze, silver and gold tiers.
   Loads last. It sorts the achievements other files already added and adds the tiered families and the secret ones.
   Rewards for the new ones follow the engagement design: bronze 20 Chispas, silver 1 Song Note, gold 3 Song Notes. */
(function () {
"use strict";
const EV = window.EV;
if (!EV || !EV.ACH) return;
const META = EV.ACH_META;

const UI = {
  es: { "ach.tier.b": "Bronce", "ach.tier.s": "Plata", "ach.tier.g": "Oro", "ach.secret": "Logro secreto",
    "ach.f.all": "Todos", "ach.f.todo": "Pendientes", "ach.f.got": "Conseguidos",
    "ach.c.care": "Cuidado", "ach.c.exp": "Expedición", "ach.c.stars": "Estrellas", "ach.c.cards": "Cartas", "ach.c.types": "Tipos", "ach.c.world": "Mundo", "ach.c.secret": "Secretos", "ach.c.other": "Otros" },
  en: { "ach.tier.b": "Bronze", "ach.tier.s": "Silver", "ach.tier.g": "Gold", "ach.secret": "Secret achievement",
    "ach.f.all": "All", "ach.f.todo": "To do", "ach.f.got": "Unlocked",
    "ach.c.care": "Care", "ach.c.exp": "Expedition", "ach.c.stars": "Stars", "ach.c.cards": "Cards", "ach.c.types": "Types", "ach.c.world": "World", "ach.c.secret": "Secrets", "ach.c.other": "Other" },
};
for (const lg of ["es", "en"]) Object.assign(EV.STR[lg], UI[lg]);

/* The achievements that already exist: category and tier only (their rewards stay as they were) */
const OLD = {
  care: { b: "hatch1 feed1 clean1 play1 kid scruffy healer tidy25 cuddle50 shop1 spend200 stars10 night", s: "adult allEggs day1 perfect gourmet rich300 stars100", g: "bright allForms" },
  exp: { b: "exp1 guard1", s: "guard3 guard6", g: "guard8 heart1" },
  cards: { b: "cards10 fuse1 dust1 well1", s: "grimSol grimSky grimLake grimFrost", g: "grimAll legend1" },
  world: { b: "egg1", s: "cl10 pass20 lamps12", g: "bond10 pass40" },
};
for (const cat in OLD) for (const tier in OLD[cat]) for (const id of OLD[cat][tier].split(" ")) META[id] = { cat, tier };

/* Tiered families: [counter or function, category, [bronze, silver, gold]] */
const c = (k) => (p) => p.c[k] || 0;
const FAM = {
  fed: [c("fed"), "care", [25, 150, 600]],
  cuddles: [c("cuddles"), "care", [100, 400, 1500]],
  plays: [c("plays"), "care", [10, 60, 250]],
  messes: [c("messes"), "care", [50, 200, 600]],
  wins: [c("expWins"), "exp", [25, 150, 600]],
  trips: [c("expDone"), "exp", [10, 50, 200]],
  guard: [c("guard"), "exp", [5, 25, 80]],
  echo: [c("echoWins"), "exp", [1, 5, 15]],
  deep: [c("deepFloors"), "exp", [4, 12, 36]],
  stars: [c("starsGot"), "stars", [9, 27, 54]],
  star3: [(p) => Object.keys(p.star3 || {}).length + Object.keys(p.star3S || {}).length, "stars", [1, 5, 12]],
  root: [c("deepStars"), "stars", [12, 36, 108]],
  fuse: [c("fused"), "cards", [5, 30, 120]],
  grim: [(p) => Object.keys(p.grim || {}).length, "cards", [20, 45, 70]],
  adv: [c("advHits"), "types", [20, 100, 400]],
  trio: [c("trio"), "types", [1, 10, 40]],
  aimed: [c("aimed"), "exp", [10, 60, 250]],
  dodged: [c("dodged"), "exp", [5, 30, 100]],
  events: [c("evChoices"), "world", [10, 50, 150]],
  escritos: [(p) => Object.keys(p.escritos || {}).length, "world", [5, 15, 30]],
  daily: [c("dailyDone"), "world", [20, 100, 400]],
  weekly: [c("weeklyDone"), "world", [5, 20, 60]],
  hatch: [c("eggHatched"), "world", [3, 10, 30]],
};
const FAM_TX = {
  es: {
    fed: ["Buen diente", "Da de comer {n} veces."], cuddles: ["Mimos", "Mima a tu criatura {n} veces."], plays: ["Ronda de juegos", "Juega {n} partidas al minijuego."], messes: ["Escoba del Claro", "Limpia {n} manchas."],
    wins: ["Combatiente", "Gana {n} combates."], trips: ["Caminante", "Termina {n} expediciones."], guard: ["Calma de guardianes", "Calma a un guardián {n} veces."], echo: ["Silencio del Eco", "Calma al Eco del Guardián {n} veces."], deep: ["Bajada a la Raíz", "Supera {n} pisos de la Raíz Profunda por primera vez en sus bajadas."],
    stars: ["Constelación", "Consigue {n} estrellas de zona."], star3: ["Tres de tres", "Consigue 3 estrellas en {n} zonas (el Modo Savia cuenta aparte)."], root: ["Estrellas de la Raíz", "Consigue {n} estrellas en la Raíz Profunda."],
    fuse: ["Cinco en una", "Mejora {n} cartas."], grim: ["Grimorio", "Descubre {n} cartas distintas."],
    aimed: ["Buena puntería", "Apunta y lanza {n} cartas a mano."], dodged: ["Pies ligeros", "Deja vacías las casillas marcadas de un golpe fuerte {n} veces."],
    adv: ["Ventaja de tipo", "Golpea {n} veces con ventaja de tipo."], trio: ["Tres círculos", "Sal de expedición {n} veces con un equipo de tres círculos distintos."],
    events: ["Encrucijadas", "Elige {n} opciones en los encuentros."], escritos: ["Lector de escritos", "Encuentra {n} escritos."], daily: ["Farolillos", "Completa {n} tareas diarias."], weekly: ["Semana a semana", "Completa {n} tareas semanales."], hatch: ["Nidada", "Abre {n} huevos del Refugio."],
  },
  en: {
    fed: ["Good appetite", "Feed {n} times."], cuddles: ["Cuddles", "Cuddle your creature {n} times."], plays: ["Game time", "Play {n} rounds of the minigame."], messes: ["Glade broom", "Clean up {n} messes."],
    wins: ["Fighter", "Win {n} battles."], trips: ["Wanderer", "Finish {n} expeditions."], guard: ["Guardian calm", "Calm a guardian {n} times."], echo: ["Echo's silence", "Calm the Guardian's Echo {n} times."], deep: ["Down the Root", "Clear {n} Deep Root floors for the first time on their descents."],
    stars: ["Constellation", "Earn {n} zone stars."], star3: ["Three of three", "Earn 3 stars in {n} zones (Savia Mode counts separately)."], root: ["Root stars", "Earn {n} stars on the Deep Root."],
    fuse: ["Five into one", "Upgrade {n} cards."], grim: ["Grimoire", "Discover {n} different cards."],
    aimed: ["Good aim", "Aim and play {n} cards by hand."], dodged: ["Light feet", "Leave a strong blow's marked cells empty {n} times."],
    adv: ["Type advantage", "Land {n} hits with type advantage."], trio: ["Three circles", "Set out {n} times with a team from three different circles."],
    events: ["Crossroads", "Choose {n} options in encounters."], escritos: ["Reader", "Find {n} writings."], daily: ["Little lanterns", "Complete {n} daily tasks."], weekly: ["Week by week", "Complete {n} weekly tasks."], hatch: ["Clutch", "Hatch {n} Refuge eggs."],
  },
};
const TIERS = ["b", "s", "g"], NUM = ["I", "II", "III"];
const PRIZE = { b: [20, 0], s: [0, 1], g: [0, 3] };
for (const k in FAM) {
  const [get, cat, steps] = FAM[k];
  steps.forEach((n, i) => {
    const id = "t_" + k + "_" + (i + 1), tier = TIERS[i];
    EV.ACH.push([id, PRIZE[tier][0], (p) => get(p) >= n]);
    META[id] = { cat, tier, notes: PRIZE[tier][1] };
    for (const lg of ["es", "en"]) { const [nm, d] = FAM_TX[lg][k]; EV.STR[lg].ach[id] = [nm + " " + NUM[i], d.replace("{n}", n.toLocaleString(lg))]; }
  });
}

/* Secrets: hidden until unlocked; the hint shows instead of the description */
const SECRET = [
  ["s_last", (p) => (p.c.lastOne || 0) >= 1],
  ["s_root12", (p) => (p.c.deep12 || 0) >= 1],
  ["s_full", (p, s) => !!s && s.phase === "alive" && s.stats.full >= 99.5 && s.stats.fun >= 99.5],
  ["s_broke", (p) => p.coins === 0 && (p.c.spent || 0) >= 300],
  ["s_night", (p) => (p.c.nightPlay || 0) >= 10],
];
const SECRET_TX = {
  es: {
    s_last: ["Por los pelos", "Gana un combate con una sola criatura en pie.", "Hay victorias que se ganan con uno solo."],
    s_root12: ["El fondo de la Raíz", "Consigue 3 estrellas en el piso 12 de la Raíz Profunda.", "Algo espera al final de la bajada."],
    s_full: ["Barriga y risa", "Ten la barriga y la diversión al máximo a la vez.", "Llena por dentro y por fuera."],
    s_broke: ["Bolsillos vacíos", "Quédate con 0 Chispas después de gastar al menos 300.", "A veces hay que gastarlo todo."],
    s_night: ["Desvelados", "Juega 10 veces de noche.", "La noche también tiene juegos."],
  },
  en: {
    s_last: ["By a whisker", "Win a battle with only one creature standing.", "Some wins come down to just one."],
    s_root12: ["The bottom of the Root", "Earn 3 stars on floor 12 of the Deep Root.", "Something waits at the end of the descent."],
    s_full: ["Belly and laughter", "Have fullness and fun maxed out at the same time.", "Full inside and out."],
    s_broke: ["Empty pockets", "End up with 0 Chispas after spending at least 300.", "Sometimes you have to spend it all."],
    s_night: ["Night owls", "Play 10 times at night.", "The night has games too."],
  },
};
for (const [id, test] of SECRET) {
  EV.ACH.push([id, 0, test]);
  META[id] = { cat: "secret", tier: "s", notes: 1, secret: true };
  for (const lg of ["es", "en"]) EV.STR[lg].ach[id] = SECRET_TX[lg][id].slice(0, 2);
}
// hints follow the language
Object.defineProperty(EV, "achHint", { value: (id) => (SECRET_TX[EV.LANG] || SECRET_TX.en)[id][2] });
for (const [id] of SECRET) Object.defineProperty(META[id], "hint", { get: () => EV.achHint(id), enumerable: true });
})();
