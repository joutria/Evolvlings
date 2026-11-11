/* Evolvlings: the Caretaker's Guide (design rule 6).
   The first time you open each system, a small note explains it in two lines; "Got it" closes it for good.
   The Guide panel (menu → Guide) keeps every note to read again, plus a glossary of every currency.
   Seen notes live in the profile (P.guide.seen). Loaded after the other modules. */
(function (root) {
"use strict";
const EV = root.EV;
if (!EV) return;
const $ = EV.$, esc = EV.escapeHtml, L = () => EV.LANG;

/* ---------- Text ---------- */
// one entry per system: [title, text]; the key is the panel name (or "exp" for the expedition screen)
const TIPS = {
  es: {
    map: ["El Claro", "Toca un sitio para que tu criatura vaya andando: comedero, cama, charca, tablón... Cuidarla, ir a otro mapa y salir de expedición no cuestan nada; los 👣 Pasos solo se gastan en el Rincón de búsqueda."],
    cards: ["Cartas", "Cada carta tiene tres efectos y solo funciona el del hueco donde la pongas (Activa, Pasiva o Soporte). Cinco copias iguales se mejoran a la rareza siguiente; las repetidas que sobren dan ∴ Polvo de Estrella. Usa el buscador y los Filtros para encontrarlas."],
    teams: ["Equipos", "Elige dos compañeros del Refugio para ir contigo y qué cartas lleva cada uno. Puedes guardar hasta 5 equipos y cargarlos con un toque antes de salir."],
    daily: ["Tareas y premios", "Cuatro tareas al día y seis a la semana dan ♪ Notas del Canto. Lo que no hagas hoy se guarda hasta 2 días más, y el calendario nunca se pierde si faltas."],
    refuge: ["Refugio", "Aquí viven las criaturas de tus huevos. Cada una sube de nivel y de ♥ Vínculo viajando contigo o con trabajos, y nunca se va. Cada una nace con un rasgo propio (🥚). Los huevos se compran con ♪ Notas."],
    book: ["Libro del Cuidador", "Aquí se apunta todo lo que vives, y solo eso. El Diario copia cada encuentro con lo que preguntaste y el camino que tomaste; lo que no preguntaste sale en gris, y si el encuentro vuelve puedes probar otro camino. A la gente se la llama por su oficio hasta que oyes su nombre. Las Cartas (el Grimorio) y los Escritos también están aquí."],
    savia: ["La Savia de cada zona", "Junto a cada zona ves cuánta Savia Negra le queda: goteo (●●), venas (●) o limpia. Al calmar a su guardián se retira hasta las venas, y con 3 estrellas la zona queda limpia y se ve así en cada visita. Solo cambia cómo se ve el lugar, nunca lo hace más difícil."],
    weather: ["El tiempo", "En el Claro llueve, hay niebla o nieva según la época del año, y cambia cada 6 horas. Nunca perjudica: la lluvia riega el huerto, la niebla deja descansar a tu criatura y la nieve la divierte."],
    season: ["Temporada", "Un pase gratis de 40 niveles que sube con tus tareas, y un evento con 🕯 Cera para ayudar a Tila. No hay versión de pago."],
    build: ["Obras del Claro", "Mejora tus lugares con ✦ Chispas y 🪵 Madera. Solo hay una obra a la vez; cada expedición terminada la adelanta 2 horas, y también adelanta 1 hora los trabajos del Refugio, 3 horas el huerto y 3 horas los huevos. También puedes mandar a tus compañeros a trabajar."],
    shop: ["Tienda", "Comida, medicinas y juguetes por ✦ Chispas. Lo que compras va a la mochila y no caduca."],
    ach: ["Logros", "Cada logro da Chispas una sola vez. No hace falta perseguirlos: la mayoría llegan solos jugando."],
    journal: ["Recuerdos", "Aquí quedan las criaturas que criaste y lo que les pasó. Es solo para recordar."],
    talents: ["Talentos", "Cada 3 niveles tu criatura y cada compañero eligen un talento entre dos: uno ofensivo y otro defensivo, del tipo de la criatura. Nada es definitivo: puedes cambiarlos cuando quieras con ∴ Polvo de Estrella."],
    battle: ["Combate táctico", "Actúa una criatura a la vez, en el orden de su velocidad: la barra de arriba muestra los próximos turnos y lo que hará cada enemigo. En Manual, en el turno de tu criatura eliges ataque básico, su carta (y a quién apuntar), moverse (medio turno), defender (−40 % de daño hasta su siguiente turno) o esperar (actúa justo después del siguiente). En Semi el básico sale solo y solo te pregunta por la carta. Las casillas rojas marcan el golpe fuerte de un enemigo, y la barra dice en qué turno cae. Las cartas gastan Ímpetu, una barra compartida por el equipo que sube en cada turno tuyo y con cada ataque básico; el coste es el número ✶ de la carta. Puedes arrastrar a tu criatura a una casilla vecina. Los círculos verdes son mejoras y los rojos, males: el número de arriba dice cuántas veces se acumula y el de abajo, los turnos que le quedan; los opuestos se anulan. Toca a una criatura para ver todos sus estados. Auto lo hace todo por ti y da lo mismo."],
    exp: ["Expediciones", "Elige una zona, dos compañeros y tus cartas. Si superas el nivel de una zona, sus enemigos suben poco, así que puedes volver más fuerte a por las 3 ★. Perder solo acorta el viaje: no pierdes cartas ni niveles. En la pestaña Duelos puedes retar gratis a los vecinos del Vado o al equipo de un amigo."],
  },
  en: {
    map: ["The Glade", "Tap a spot and your creature walks there: bowl, bed, pond, notice board... Caring for it, going to another map and setting out are all free; 👣 Steps are only spent at the foraging nook."],
    cards: ["Cards", "Each card has three effects and only the one for its slot works (Active, Passive or Support). Five identical copies upgrade to the next rarity; spare duplicates give ∴ Stardust. Use search and Filters to find them."],
    teams: ["Teams", "Pick two Refuge companions to come with you and the cards each one carries. Save up to 5 teams and load one with a tap before you leave."],
    daily: ["Tasks and rewards", "Four daily and six weekly tasks give ♪ Song Notes. What you don't do today keeps for 2 more days, and the calendar never resets if you miss a day."],
    refuge: ["Refuge", "The creatures from your eggs live here. Each grows in level and ♥ Bond by travelling with you or doing jobs, and none ever leaves. Each is born with a trait of its own (🥚). Eggs cost ♪ Notes."],
    book: ["Caretaker's Book", "Everything you live is written here, and only that. The Diary copies each encounter with what you asked and the way you took; what you didn't ask stays grey, and if the encounter comes back you can try another way. People go by their trade until you hear their name. Cards (the Grimoire) and Writings are here too."],
    savia: ["Each zone's Sap", "Next to each zone you see how much Black Sap is left: dripping (●●), veins (●) or clean. Calming its guardian pulls it back to veins, and with 3 stars the zone is clean and looks it on every visit. It only changes how the place looks, never how hard it is."],
    weather: ["Weather", "In the Glade it rains, gets foggy or snows depending on the time of year, and it changes every 6 hours. It never hurts: rain waters the garden, fog lets your creature rest and snow keeps it amused."],
    season: ["Season", "A free 40-level pass that grows with your tasks, and an event where 🕯 Wax helps Tila. There is no paid version."],
    build: ["Glade builds", "Upgrade your places with ✦ Chispas and 🪵 Wood. One build runs at a time; every finished expedition brings it 2 hours closer, Refuge jobs 1 hour, the garden 3 hours and the eggs 3 hours. Companions can also be sent to work."],
    shop: ["Shop", "Food, medicine and toys for ✦ Chispas. What you buy goes to your bag and never expires."],
    ach: ["Achievements", "Each achievement gives Chispas once. No need to chase them: most come on their own as you play."],
    journal: ["Memories", "The creatures you raised and what became of them. It's only for remembering."],
    talents: ["Talents", "Every 3 levels your creature and each companion choose one of two talents: one offensive, one defensive, from the creature's type. Nothing is final: change them any time with ∴ Stardust."],
    battle: ["Tactical battles", "One creature acts at a time, in speed order: the strip at the top shows the next turns and what each foe will do. In Manual, on your creature's turn you choose a basic attack, its card (and where to aim), a move (half a turn), defend (−40 % damage until its next turn) or wait (it acts right after the next one). In Semi basic attacks go by themselves and it only asks about the card. Red cells mark a foe's strong blow, and the strip shows the turn it lands. Cards spend Ímpetu, a bar the whole team shares that grows on each of your turns and with each basic attack; the cost is the card's ✶ number. You can drag your creature onto a cell next to it. Green circles are buffs and red ones are debuffs: the number on top says how many times it stacked, the one below the turns left; opposites cancel. Tap a creature to see all its states. Auto does it all for you and gives the same rewards."],
    exp: ["Expeditions", "Pick a zone, two companions and your cards. Above a zone's level its foes grow only a little, so you can come back stronger for 3 ★. Losing only cuts the trip short: you keep your cards and levels. The Duels tab lets you challenge El Vado's neighbours or a friend's team for free."],
  },
};
// every currency in the game: [icon, name, how you get it, what it's for]
const GLOSS = {
  es: [
    ["✦", "Chispas", "Cuidando, con tareas, expediciones, logros y el Huerto.", "Tienda, obras, sobres del Taller y la Despensa."],
    ["♪", "Notas del Canto", "Tareas diarias y semanales, 3 ★ en una zona, la temporada y el Refugio. También se cambian Chispas por Notas (con límite semanal).", "Huevos del Refugio y el Pozo de los Ecos. Nunca caducan."],
    ["∴", "Polvo de Estrella", "Deshaciendo cartas repetidas, huevos repetidos y el Rincón de búsqueda.", "Crear cartas en el Grimorio (Libro → Cartas) y cambiar talentos."],
    ["🪵", "Madera", "Al terminar expediciones y con trabajos de tus compañeros.", "Obras del Claro."],
    ["👣", "Pasos", "10 cada día; se guardan hasta 30 y se pueden comprar unos pocos.", "Buscar en el Rincón de búsqueda. Pasear y salir de expedición son gratis."],
    ["🕯", "Cera", "Solo durante el evento: tareas, expediciones y ayudar a Tila.", "Encender los faroles del evento."],
  ],
  en: [
    ["✦", "Chispas", "Care, tasks, expeditions, achievements and the Garden.", "Shop, builds, Workshop packs and the Pantry."],
    ["♪", "Song Notes", "Daily and weekly tasks, 3 ★ in a zone, the season and the Refuge. Chispas can also be traded for Notes (weekly limit).", "Refuge eggs and the Well of Echoes. They never expire."],
    ["∴", "Stardust", "Breaking down duplicate cards, duplicate eggs and the foraging nook.", "Crafting cards in the Grimoire (Book → Cards) and changing talents."],
    ["🪵", "Wood", "Finishing expeditions and your companions' jobs.", "Glade builds."],
    ["👣", "Steps", "10 a day; up to 30 keep and a few can be bought.", "Searching the foraging nook. Walking around and setting out are free."],
    ["🕯", "Wax", "Only during the event: tasks, expeditions and helping Tila.", "Lighting the event's lanterns."],
  ],
};
const TX = {
  es: { nav: "Guía", title: "Guía del Cuidador", sub: "Todo lo que te contamos la primera vez, para volver a leerlo cuando quieras.", ok: "Entendido", open: "Abrir la guía", gloss: "Monedas del Claro", how: "Se gana", use: "Sirve para", tips: "Sistemas", reset: "Volver a mostrar las notas", resetDone: "Las notas volverán a salir la próxima vez." },
  en: { nav: "Guide", title: "Caretaker's Guide", sub: "Everything we told you the first time, to read again whenever you like.", ok: "Got it", open: "Open the guide", gloss: "Glade currencies", how: "Earned", use: "Used for", tips: "Systems", reset: "Show the notes again", resetDone: "The notes will show again next time." },
};
const tx = (k) => (TX[L()] || TX.en)[k] || TX.en[k] || k;
const tip = (k) => (TIPS[L()] || TIPS.en)[k] || TIPS.en[k];

/* ---------- State ---------- */
const G = EV.slice("guide", () => ({ seen: {} }));

/* ---------- The first-time note ---------- */
let shown = null;
function showTip(key) {
  if (!tip(key) || G().seen[key]) return;
  G().seen[key] = 1; EV.saveProfile();
  let el = $("guideTip");
  if (!el) {
    el = document.createElement("div"); el.id = "guideTip"; el.setAttribute("role", "status"); document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      EV.sfx("tap"); hideTip();
      if (b.dataset.g === "open") EV.togglePanel("guide", true);
    });
  }
  const [t, body] = tip(key);
  el.innerHTML = `<div class="gt-head"><span aria-hidden="true">📖</span> <b>${esc(tx("title"))}</b> · ${esc(t)}</div><p>${esc(body)}</p><div class="gt-btns"><button type="button" class="btn" data-g="ok">${esc(tx("ok"))}</button><button type="button" class="btn ghost" data-g="open">${esc(tx("open"))}</button></div>`;
  el.hidden = false; shown = key;
}
function hideTip() { const el = $("guideTip"); if (el) el.hidden = true; shown = null; }

/* ---------- The Guide panel ---------- */
function render() {
  const el = $("guidePanel"); if (!el) return;
  const T = TIPS[L()] || TIPS.en;
  let h = `<div class="panel-head"><h2>${esc(tx("title"))}</h2></div><p class="muted" style="margin:0">${esc(tx("sub"))}</p>`;
  h += `<h3 class="cat-title">${esc(tx("gloss"))}</h3><div class="gd-gloss">${(GLOSS[L()] || GLOSS.en).map(([ic, n, how, use]) => `<div class="gd-cur"><span class="gd-ic" aria-hidden="true">${ic}</span><div><b>${esc(n)}</b><p><span>${esc(tx("how"))}:</span> ${esc(how)}</p><p><span>${esc(tx("use"))}:</span> ${esc(use)}</p></div></div>`).join("")}</div>`;
  h += `<h3 class="cat-title">${esc(tx("tips"))}</h3>${Object.keys(T).map((k) => `<details class="fold gd-tip"><summary><h3>${esc(T[k][0])}</h3></summary><p>${esc(T[k][1])}</p></details>`).join("")}`;
  h += `<div class="rc-btns"><button type="button" class="btn ghost" data-greset="1">${esc(tx("reset"))}</button></div>`;
  el.innerHTML = h;
}

/* ---------- Wiring ---------- */
const css = `
#guideTip { position: fixed; z-index: 70; left: 50%; bottom: 14px; transform: translateX(-50%); width: min(520px, calc(100% - 24px)); background: var(--surface); color: var(--ink); border: 2px solid var(--line); box-shadow: 4px 4px 0 var(--shade); padding: 10px 12px; }
#guideTip[hidden] { display: none; }
#guideTip .gt-head { font: 600 13px var(--font-body); color: var(--muted); }
#guideTip .gt-head b { color: var(--ink); }
#guideTip p { margin: 6px 0 8px; font-size: 14px; line-height: 1.4; }
#guideTip .gt-btns { display: flex; gap: 8px; flex-wrap: wrap; }
.gd-gloss { display: grid; gap: 8px; }
.gd-cur { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; background: var(--bg); border: 2px solid var(--line); }
.gd-ic { flex: none; font-size: 22px; width: 30px; text-align: center; line-height: 1.2; }
.gd-cur p { margin: 2px 0 0; font-size: 13px; }
.gd-cur p span { color: var(--muted); font-weight: 600; }
.gd-tip p { margin: 4px 0 8px; font-size: 14px; }
`;
const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

// the panel and its menu button
const header = $("btnJournal");
if (header && !$("btnGuide")) {
  const b = document.createElement("button"); b.className = "chip-btn"; b.id = "btnGuide"; b.type = "button"; b.textContent = tx("nav");
  header.after(b);
  b.addEventListener("click", () => { EV.sfx("tap"); EV.togglePanel("guide"); });
}
EV.HOOKS.renderGuide = render;
$("guidePanel").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.greset) { G().seen = {}; EV.saveProfile(); EV.sfx("tap"); EV.toast(tx("resetDone"), "📖"); }
});
// first time each panel opens; closing the panel also closes its note
EV.HOOKS.panelOpened = (name) => { if (shown && shown !== name) hideTip(); if (name !== "guide") showTip(name); };
EV.HOOKS.panelsClosed = () => { if (shown && shown !== "exp") hideTip(); };
// the expedition screen: the first time you pick a zone
const prevShow = EV.HOOKS.showScreen;
EV.HOOKS.showScreen = function () {
  if (prevShow) prevShow.apply(this, arguments);
  const X = EV.RPG && EV.RPG.X;
  if (X && !X.zone && $("scrExp") && !$("scrExp").hidden) showTip("exp");
  else if (shown === "exp" && !X) hideTip();
  const b = $("btnGuide"); if (b) b.textContent = tx("nav");
};

EV.GUIDE = { TIPS, GLOSS, showTip, hideTip, render, state: G };
})(typeof window !== "undefined" ? window : globalThis);
