/* Evolvlings: browser notifications (feature plan, idea 29). Off unless you turn them on in Settings.
   While the game is open in a background tab (or installed as an app), it keeps an eye on your creature every few
   minutes and sends one quiet notice when something needs you: hungry, bored, tired, dirty, a mess, sick, or the egg
   is about to hatch. One notice per reason; it can come again only after that need was seen to. Nothing at night
   (22:00-8:00) and nothing while it sleeps (except sickness). Best effort: a closed tab can't send anything, and some
   places (the claude.ai viewer, some privacy browsers) block notifications; the setting then says so.
   Saved in P.notif (true/false) and S.ntf { reason: 1 } for the notices already sent. Loaded after elder.js. */
(function (root) {
"use strict";
const EV = root.EV;
if (!EV) return;

const TX = {
  es: { label: "Avisos", on: "Sí", off: "No", note: "Te avisa si tu criatura necesita algo mientras el juego está abierto en otra pestaña. Nunca de noche.",
    denied: "El navegador bloqueó los avisos. Puedes permitirlos en los permisos de esta página.", none: "Aquí no se pueden mostrar avisos (prueba en la web del juego o instálalo como app).",
    test: "¡Listo! Así se verán los avisos.",
    full: "{name} tiene hambre", fun: "{name} se aburre", energy: "{name} está muy cansado", clean: "{name} necesita un baño", mess: "{name} dejó un desastre", sick: "{name} se siente mal", egg: "El huevo está a punto de abrirse",
    body: "Toca para volver con {name}.", bodyEgg: "Toca para verlo nacer." },
  en: { label: "Notifications", on: "On", off: "Off", note: "Lets you know when your creature needs something while the game is open in another tab. Never at night.",
    denied: "Your browser blocked notifications. You can allow them in this page's permissions.", none: "Notifications can't be shown here (try the game's website or install it as an app).",
    test: "Done! This is how notices will look.",
    full: "{name} is hungry", fun: "{name} is bored", energy: "{name} is very tired", clean: "{name} needs a bath", mess: "{name} made a mess", sick: "{name} feels unwell", egg: "The egg is about to hatch",
    body: "Tap to go back to {name}.", bodyEgg: "Tap to watch it hatch." },
};
const tx = EV.text("notify", TX);
const LOW = 25, LOOK = 5 * 60000;
const can = () => "Notification" in root;
const night = () => { const h = new Date().getHours(); return h >= 22 || h < 8; };

// the reasons that hold right now
function reasons() {
  const S = EV.S, out = [];
  if (!S) return out;
  if (S.phase === "egg") { if (S.egg >= 90) out.push("egg"); return out; }
  if (S.phase !== "alive") return out;
  if (S.sick) out.push("sick");
  if (S.sleeping) return out;
  for (const k of ["full", "fun", "energy", "clean"]) if (S.stats && S.stats[k] < LOW) out.push(k);
  if (S.messes && S.messes.length) out.push("mess");
  return out;
}
function send(title, body, tag) {
  const opt = { body, tag: "ev-" + tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png", lang: EV.LANG };
  // installed apps on phones only show notices through the service worker
  const sw = navigator.serviceWorker;
  if (sw && sw.controller) return sw.ready.then((r) => r.showNotification(title, opt)).catch(() => plain(title, opt));
  plain(title, opt);
}
function plain(title, opt) { try { const n = new Notification(title, opt); n.onclick = () => { root.focus(); n.close(); }; } catch (e) { /* not allowed here */ } }

function look() {
  const S = EV.S, P = EV.P;
  if (!P.notif || !can() || Notification.permission !== "granted" || !S) return;
  // the game's clock sleeps while the tab is hidden, so bring the creature up to date first (the same catch-up as coming back)
  if (document.hidden && EV.catchUp) { EV.catchUp(); EV.save(); }
  const now = reasons(), sent = S.ntf || (S.ntf = {});
  for (const k of Object.keys(sent)) if (!now.includes(k)) delete sent[k]; // seen to: it may notify again later
  if (!document.hidden || night()) return;
  const k = now.find((r) => !sent[r]); if (!k) return;
  sent[k] = 1; EV.save();
  send(tx(k, { name: S.name || "" }), tx(k === "egg" ? "bodyEgg" : "body", { name: S.name || "" }), k);
}
let lookId = 0;
document.addEventListener("visibilitychange", () => {
  clearInterval(lookId); lookId = 0;
  if (document.hidden) lookId = setInterval(look, LOOK);
  else look(); // clears the reasons that were seen to
});

/* ---------- the row in Settings ---------- */
let note = null;
function draw() {
  const seg = document.getElementById("notifSeg"); if (!seg) return;
  const on = !!EV.P.notif && can() && Notification.permission === "granted";
  seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.v === "1") === on)));
}
function mount() {
  if (document.getElementById("notifSeg")) return;
  const anchor = document.getElementById("textSeg"); const row = anchor && anchor.closest(".row"); if (!row) return;
  const r = document.createElement("div"); r.className = "row";
  r.innerHTML = `<label>${EV.escapeHtml(tx("label"))}</label><div class="seg" id="notifSeg"><button type="button" data-v="1">${EV.escapeHtml(tx("on"))}</button><button type="button" data-v="0">${EV.escapeHtml(tx("off"))}</button></div>`;
  row.insertAdjacentElement("afterend", r);
  note = document.createElement("p"); note.className = "muted ntf-note"; note.textContent = tx("note");
  r.insertAdjacentElement("afterend", note);
  r.querySelector("#notifSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]"); if (!b) return; EV.sfx("tap");
    if (b.dataset.v === "0") { EV.P.notif = false; EV.saveProfile(); draw(); note.textContent = tx("note"); return; }
    if (!can()) { note.textContent = tx("none"); return; }
    let asked = false;
    const done = (p) => {
      if (asked) return; asked = true;
      if (p === "granted") { EV.P.notif = true; EV.saveProfile(); note.textContent = tx("note"); send(tx("label"), tx("test"), "test"); }
      else { EV.P.notif = false; EV.saveProfile(); note.textContent = tx(p === "denied" ? "denied" : "none"); }
      draw();
    };
    try { const q = Notification.requestPermission(done); if (q && q.then) q.then(done, () => done("none")); } catch (e) { done("none"); }
  });
  draw();
}
mount();
const prevPanel = EV.HOOKS.panelOpened;
EV.HOOKS.panelOpened = (n) => { if (prevPanel) prevPanel(n); if (n === "settings") { mount(); draw(); } };

const st = document.createElement("style"); st.textContent = `.ntf-note{margin:-4px 0 8px;font-size:12.5px}`; (document.body || document.head).appendChild(st);

EV.NOTIFY = { reasons, look, send };
})(window);
