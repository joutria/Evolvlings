/* Evolvlings: tantrums and discipline (feature plan, idea 32).
   Now and then, while the game is open, your creature throws a tantrum (at most 4 a day). Look at its needs:
     - a REAL tantrum: something is low (a need under 35, a mess, sickness): comfort it (Cuddle) and see to it;
     - a FAKE tantrum: everything is fine and it only wants attention: Ignore it, kindly but firmly.
   Getting it right raises Discipline (S.disc, 0-100), getting it wrong lowers it a little. A fake tantrum left alone
   for 5 minutes counts as ignored. Nothing is ever lost (design rule 2): Discipline only helps.
     - growing up: every 10 points add 1 to the care average that picks the adult form (index.html grow);
     - every day: a disciplined creature gets bored up to 10 % more slowly (index.html step).
   Tantrums live only in this tab's memory plus S.tant { day, n, next } for the daily count. Loaded after minigames.js. */
(function (root) {
"use strict";
const EV = root.EV;
if (!EV) return;

const TX = {
  es: {
    real: "¡{name} tiene un berrinche! Algo le falta.", fake: "¡{name} tiene un berrinche! ¿De verdad le pasa algo?",
    help: "Mira sus barras: si algo está bajo, mímalo y atiéndelo. Si todo está bien, es teatro: ignóralo.",
    calm: "Mimar", ignore: "Ignorar",
    goodCalm: "Hiciste bien: de verdad le faltaba algo. Disciplina +{n}", goodIgnore: "Bien: era teatro y se calmó solo. Disciplina +{n}",
    badCalm: "Era teatro y se salió con la suya. Disciplina −{n}", badIgnore: "Le faltaba algo de verdad y se sintió solo. Disciplina −{n}",
    expire: "{name} se cansó de hacer teatro. Disciplina +{n}",
    disc: "Disciplina {n}", discTip: "Sube atendiendo bien los berrinches. Ayuda a crecer con buena forma y hace que se aburra más despacio.",
    log: "{name} tuvo un berrinche.", badge: "Berrinche",
  },
  en: {
    real: "{name} is throwing a tantrum! Something is missing.", fake: "{name} is throwing a tantrum! Is anything really wrong?",
    help: "Check its bars: if something is low, cuddle it and see to it. If all is fine, it's an act: ignore it.",
    calm: "Cuddle", ignore: "Ignore",
    goodCalm: "Well done: it really needed something. Discipline +{n}", goodIgnore: "Good: it was an act and it calmed down. Discipline +{n}",
    badCalm: "It was an act and it got its way. Discipline −{n}", badIgnore: "It really needed something and felt alone. Discipline −{n}",
    expire: "{name} got tired of its act. Discipline +{n}",
    disc: "Discipline {n}", discTip: "Rises when you handle tantrums well. Helps it grow into its good form and makes it get bored more slowly.",
    log: "{name} threw a tantrum.", badge: "Tantrum",
  },
};
const tx = EV.text("discipline", TX);
const PER_DAY = 4, LAST = 5 * 60000, GOOD = 10, BAD = 5;
let cur = null; // { real, until }

// a real tantrum has a reason you can see on the screen
function needy() {
  const S = EV.S, s = S.stats;
  return S.sick || S.messes.length > 0 || ["full", "fun", "energy", "clean"].some((k) => s[k] < 35);
}
function tState() {
  const S = EV.S, day = EV.dayKey();
  if (!S.tant || S.tant.day !== day) S.tant = { day, n: 0, next: (S.tant && S.tant.next) || Date.now() + gap() };
  return S.tant;
}
// the next tantrum in 20-50 real minutes (sooner with the faster time speeds)
const gap = () => ((20 + Math.random() * 30) * 60000) / Math.max(1, (EV.S && EV.S.speed) || 1);
function ok() { const S = EV.S; return S && S.phase === "alive" && !S.sleeping && !(EV.miniOn && EV.miniOn()) && !document.hidden; }

function start() {
  const S = EV.S, st = tState();
  cur = { real: needy(), until: Date.now() + LAST };
  st.n++; st.next = Date.now() + gap();
  EV.addLog(tx("log", { name: S.name }));
  EV.sfx("deny"); EV.buzz([30, 40, 30]);
  draw(); EV.save();
}
function answer(kind) {
  if (!cur) return;
  const S = EV.S, right = (kind === "calm") === cur.real;
  const n = right ? GOOD : BAD;
  S.disc = Math.max(0, Math.min(100, (S.disc || 0) + (right ? n : -n)));
  EV.toast(tx(right ? (kind === "calm" ? "goodCalm" : "goodIgnore") : (kind === "calm" ? "badCalm" : "badIgnore"), { n }), right ? "🙂" : "😤");
  if (right) EV.sfx("chirp");
  cur = null; draw(); EV.save(); EV.renderStats();
}
function tick() {
  if (!EV.S || EV.S.phase !== "alive") { if (cur) { cur = null; draw(); } return; }
  if (cur) {
    if (EV.S.sleeping) { cur = null; draw(); return; }
    if (Date.now() > cur.until) {
      // left alone: a fake tantrum fizzles out (that was the right call); a real one just passes
      if (!cur.real) { const S = EV.S; S.disc = Math.min(100, (S.disc || 0) + 5); EV.toast(tx("expire", { name: S.name, n: 5 }), "🙂"); }
      cur = null; draw(); EV.save(); EV.renderStats();
    }
    return;
  }
  const st = tState();
  if (ok() && st.n < PER_DAY && Date.now() >= st.next) start();
}

/* ---------- the strip under the status badges ---------- */
let el = null;
function mount() {
  if (el) return el;
  const b = document.getElementById("badges"); if (!b) return null;
  el = document.createElement("div"); el.id = "tantrum"; el.className = "tant"; el.hidden = true; el.setAttribute("role", "status");
  b.insertAdjacentElement("afterend", el);
  el.addEventListener("click", (e) => { const t = e.target.closest("[data-tant]"); if (!t) return; if (t.dataset.tant === "calm") EV.cuddle(); else answer("ignore"); });
  return el;
}
function draw() {
  const e = mount(); if (!e) return;
  if (!cur) { e.hidden = true; e.innerHTML = ""; return; }
  const S = EV.S;
  e.innerHTML = `<p class="tant-t"><b>😤 ${EV.escapeHtml(tx(cur.real ? "real" : "fake", { name: S.name }))}</b><small>${EV.escapeHtml(tx("help"))}</small></p><div class="tant-b"><button class="btn" type="button" data-tant="calm">${EV.escapeHtml(tx("calm"))}</button><button class="btn ghost" type="button" data-tant="ignore">${EV.escapeHtml(tx("ignore"))}</button></div>`;
  e.hidden = false;
}

// cuddling (the care button, tapping the creature or the strip's button) answers a tantrum with comfort
const prevCuddled = EV.HOOKS.cuddled;
EV.HOOKS.cuddled = () => { if (prevCuddled) prevCuddled(); if (cur) answer("calm"); };
// the discipline line beside the age
const prevStats = EV.HOOKS.statsDrawn;
EV.HOOKS.statsDrawn = () => {
  if (prevStats) prevStats();
  const a = document.getElementById("petAge"), S = EV.S; if (!a || !S) return;
  let d = document.getElementById("petDisc");
  if (!d) { d = document.createElement("div"); d.id = "petDisc"; d.className = "disc"; a.appendChild(d); }
  else if (d.parentNode !== a) a.appendChild(d);
  d.textContent = tx("disc", { n: Math.round(S.disc || 0) }); d.title = tx("discTip");
};

const css = `
.tant{border:2px solid var(--line);background:color-mix(in srgb,var(--warn) 14%,var(--surface));box-shadow:2px 2px 0 var(--shade);padding:8px 10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.tant[hidden]{display:none}
.tant-t{margin:0;flex:1 1 220px;display:grid;gap:2px}.tant-t b{font:600 14px var(--font-display)}.tant-t small{font-size:12.5px;color:var(--muted)}
.tant-b{display:flex;gap:6px}.tant-b .btn{padding:7px 12px;min-height:36px;font-size:13px}
.disc{font:500 11px var(--font-mono);color:var(--muted)}
`;
const st = document.createElement("style"); st.textContent = css; (document.body || document.head).appendChild(st);

EV.every(15000, tick);
EV.DISC = { start, answer, get now() { return cur; } };
})(window);
