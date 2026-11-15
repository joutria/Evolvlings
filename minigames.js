/* Evolvlings: more mini-games for "Play" (feature plan, phase 3: ideas 14-17).
   Play now opens a small chooser with four games:
     catch   - the old star catch in the side view (index.html startCatch)
     memory  - "Parejas del Claro": find the 6 pairs of Glade types before the time runs out
     rhythm  - "Ensayo del Canto": tap when each note reaches the ring and your creature dances
     dodge   - "Granizo de guijarros": move left and right, dodge falling pebbles, catch the odd starseed
   Every game pays like the catch game (fun, a few Chispas, the burr ball's bonus) and keeps a record per game.
   Beating a record you already had gives +5 Chispas (idea 17). Records live in EV.P.mg { best: { id: n } }.
   The games draw in their own window over the page, so they work in both home views. Loaded after ach.js. */
(function (root) {
"use strict";
const EV = root.EV;
if (!EV) return;

const TX = {
  es: {
    title: "¿A qué jugamos?", close: "Cerrar", record: "Récord: {n}", noRecord: "Sin récord todavía", tired: "Cada partida cansa un poco.",
    "g.catch": "Atrapar semillas", "d.catch": "Toca las semillas estelares antes de que caigan al suelo.",
    "g.memory": "Parejas del Claro", "d.memory": "Da la vuelta a dos fichas y encuentra los 6 pares de tipos.",
    "g.rhythm": "Ensayo del Canto", "d.rhythm": "Toca cuando cada nota llegue al aro y {name} baila.",
    "g.dodge": "Granizo de guijarros", "d.dodge": "Muévete para esquivar los guijarros. Las semillas doradas suman.",
    "h.memory": "Toca dos fichas. Si son del mismo tipo, se quedan boca arriba.",
    "h.rhythm": "Toca la pantalla (o pulsa espacio) cuando la nota esté dentro del aro.",
    "h.dodge": "Arrastra el dedo o usa las flechas para moverte.",
    pairs: "Pares {n}/6", time: "{n} s", combo: "Racha {n}", perfect: "¡Justo!", good: "Bien", miss: "Fallo",
    endTitle: "¡Fin de la partida!", score: "Puntos: {n}", newRecord: "¡Nuevo récord! +5 ✦", again: "Otra vez", back: "Volver",
    gain: "Diversión +{f} · ✦ +{c}", tooTired: "A {name} no le queda energía para otra partida.",
    log: "Jugó a {game} con {name}: {n} puntos.", start: "Empezar",
  },
  en: {
    title: "What shall we play?", close: "Close", record: "Record: {n}", noRecord: "No record yet", tired: "Every round is a little tiring.",
    "g.catch": "Catch the starseeds", "d.catch": "Tap the falling starseeds before they hit the ground.",
    "g.memory": "Glade pairs", "d.memory": "Turn two tiles over and find the 6 pairs of types.",
    "g.rhythm": "Song rehearsal", "d.rhythm": "Tap as each note reaches the ring and {name} dances.",
    "g.dodge": "Pebble hail", "d.dodge": "Move to dodge the falling pebbles. Golden starseeds add up.",
    "h.memory": "Tap two tiles. If they share a type, they stay face up.",
    "h.rhythm": "Tap the screen (or press space) while the note is inside the ring.",
    "h.dodge": "Drag your finger or use the arrow keys to move.",
    pairs: "Pairs {n}/6", time: "{n} s", combo: "Streak {n}", perfect: "Spot on!", good: "Good", miss: "Miss",
    endTitle: "Round over!", score: "Points: {n}", newRecord: "New record! +5 ✦", again: "Again", back: "Back",
    gain: "Fun +{f} · ✦ +{c}", tooTired: "{name} is too tired for another round.",
    log: "Played {game} with {name}: {n} points.", start: "Start",
  },
};
const tx = EV.text("minigames", TX);
const GAMES = ["catch", "memory", "rhythm", "dodge"];
const ICON = { catch: "⭐", memory: "🃏", rhythm: "🎵", dodge: "🪨" };
const COST = { memory: 10, rhythm: 10, dodge: 14 }; // energy: dodging is the tiring one (plan: Energy−, Fun+)
const mg = EV.slice("mg", () => ({ best: {} }));
const esc = (s) => EV.escapeHtml(String(s));
const $ = (id) => document.getElementById(id);

/* ---------- records ---------- */
function best(id) { return id === "catch" ? (EV.P.c.bestRound || 0) : (mg().best[id] || 0); }
// the catch game keeps its record in P.c.bestRound; index.html asks here when a round ends
function record(id, n) {
  const prev = best(id);
  if (id !== "catch") mg().best[id] = Math.max(prev, n);
  return prev > 0 && n > prev;
}

/* ---------- the window ---------- */
let el = null, run = null;
function view() {
  if (el) return el;
  el = document.createElement("div"); el.id = "mgView"; el.className = "mg-wrap"; el.hidden = true;
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  el.innerHTML = `<div class="mg-back" data-mgx="1"></div><div class="mg-box"><button class="mg-x" type="button" data-mgx="1" aria-label="${esc(tx("close"))}">✕</button><div class="mg-body"></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click", onClick);
  return el;
}
const body = () => view().querySelector(".mg-body");
function close() { stop(); if (el) el.hidden = true; EV.renderAll(); }
function stop() { if (run) { run.dead = true; if (run.off) run.off(); } run = null; }
function onClick(e) {
  const b = e.target.closest("[data-mgx],[data-mg],[data-mgcard],[data-mgend]"); if (!b) return;
  if (b.dataset.mgx) { EV.sfx("tap"); close(); return; }
  if (b.dataset.mg) { EV.sfx("tap"); start(b.dataset.mg); return; }
  if (b.dataset.mgcard != null) { flip(+b.dataset.mgcard); return; }
  if (b.dataset.mgend === "again") { EV.sfx("tap"); start(run && run.id || b.dataset.id); return; }
  if (b.dataset.mgend === "back") { EV.sfx("tap"); choose(); }
}
document.addEventListener("keydown", (e) => { if (el && !el.hidden && e.key === "Escape") { e.stopPropagation(); close(); } }, true);

function choose() {
  stop();
  const S = EV.S, v = view();
  let h = `<h3 class="mg-h">${esc(tx("title"))}</h3><p class="mg-note">${esc(tx("tired"))}</p><div class="mg-list">`;
  for (const id of GAMES) {
    const b = best(id);
    h += `<button class="mg-pick" type="button" data-mg="${id}"><span class="mg-ico" aria-hidden="true">${ICON[id]}</span><span class="mg-txt"><b>${esc(tx("g." + id))}</b><small>${esc(tx("d." + id, { name: S.name }))}</small><em>${esc(b ? tx("record", { n: b }) : tx("noRecord"))}</em></span></button>`;
  }
  body().innerHTML = h + "</div>";
  v.hidden = false;
  const f = v.querySelector(".mg-pick"); if (f) f.focus({ preventScroll: true });
}

function canPlay() { const S = EV.S; return S && S.phase === "alive" && !S.sleeping && S.stats.energy >= 15; }
function start(id) {
  stop();
  if (!canPlay()) { EV.toast(tx("tooTired", { name: EV.S.name })); EV.sfx("deny"); choose(); return; }
  if (id === "catch") { close(); EV.HOOKS.startCatch(); return; }
  run = { id, dead: false, score: 0 };
  if (id === "memory") startMemory(); else startCanvas(id);
}

/* ---------- end of a round: the same rewards as the catch game ---------- */
function finish(q) {
  if (!run || run.done) return;
  run.done = true;
  const id = run.id, n = Math.max(0, Math.round(run.score)), S = EV.S, P = EV.P, s = S.stats, ball = !!P.owned.ball;
  if (run.off) run.off();
  q = Math.max(0, Math.min(10, Math.round(q)));
  const f = Math.round((10 + q * 4) * (ball ? 1.5 : 1));
  s.fun = EV.clamp(s.fun + f); s.energy = EV.clamp(s.energy - COST[id]); s.full = EV.clamp(s.full - 4);
  P.c.plays++;
  const beat = record(id, n);
  const coins = q + (ball ? 2 : 0) + (beat ? 5 : 0);
  EV.addCoins(coins);
  EV.addLog(tx("log", { game: tx("g." + id), name: S.name, n }));
  EV.sfx(beat ? "ach" : "coin");
  EV.save(); EV.renderStats(); EV.checkAch();
  const more = canPlay();
  body().innerHTML = `<h3 class="mg-h">${esc(tx("endTitle"))}</h3><p class="mg-big">${esc(tx("score", { n }))}</p>${beat ? `<p class="mg-rec">${esc(tx("newRecord"))}</p>` : `<p class="mg-note">${esc(tx("record", { n: best(id) }))}</p>`}<p class="mg-note">${esc(tx("gain", { f, c: coins }))}</p>${more ? "" : `<p class="mg-note">${esc(tx("tooTired", { name: S.name }))}</p>`}<div class="mg-row"><button class="btn" type="button" data-mgend="again" data-id="${id}"${more ? "" : " disabled"}>${esc(tx("again"))}</button><button class="btn ghost" type="button" data-mgend="back">${esc(tx("back"))}</button></div>`;
  const b = body().querySelector(".btn"); if (b) b.focus({ preventScroll: true });
}

/* ---------- Glade pairs (memory) ---------- */
const MEM_TIME = 45;
const types = () => (typeof TYPES !== "undefined" ? TYPES : null);
function typeList() { const T = types(); return T ? Object.keys(T).filter((k) => T[k].circle) : []; }
function startMemory() {
  const T = types(), all = typeList().sort(() => Math.random() - 0.5).slice(0, 6);
  const deck = all.concat(all).sort(() => Math.random() - 0.5);
  Object.assign(run, { deck, up: [], got: {}, pairs: 0, misses: 0, lock: false, end: performance.now() + MEM_TIME * 1000 });
  let h = `<div class="mg-top"><b>${esc(tx("g.memory"))}</b><span class="mg-hud" id="mgHud"></span></div><p class="mg-note">${esc(tx("h.memory"))}</p><div class="mg-grid">`;
  deck.forEach((k, i) => { h += `<button class="mg-card" type="button" data-mgcard="${i}" aria-label="?"><span class="mg-face" style="--tc:${T[k].col}">${T[k].icon}<small>${esc(T[k][EV.LANG] || T[k].en)}</small></span></button>`; });
  body().innerHTML = h + "</div>";
  const tick = () => {
    if (!run || run.dead || run.done || run.id !== "memory") return;
    const left = Math.max(0, Math.ceil((run.end - performance.now()) / 1000));
    const hud = $("mgHud"); if (hud) hud.textContent = `${tx("pairs", { n: run.pairs })} · ${tx("time", { n: left })}`;
    if (left <= 0) return endMemory(0);
    run.timer = setTimeout(tick, 250);
  };
  run.off = () => clearTimeout(run.timer);
  tick();
}
function flip(i) {
  if (!run || run.id !== "memory" || run.done || run.lock || run.got[i] || run.up.includes(i)) return;
  const cards = body().querySelectorAll(".mg-card"), c = cards[i], T = types();
  c.classList.add("up"); c.setAttribute("aria-label", T[run.deck[i]][EV.LANG] || T[run.deck[i]].en);
  EV.sfx("tap"); run.up.push(i);
  if (run.up.length < 2) return;
  const [a, b] = run.up;
  if (run.deck[a] === run.deck[b]) {
    run.got[a] = run.got[b] = 1; run.pairs++; run.up = [];
    cards[a].classList.add("got"); cards[b].classList.add("got");
    EV.tone(660 + run.pairs * 90, 0.14, { type: "triangle", vol: 0.07 }); EV.buzz(12);
    if (run.pairs === 6) endMemory(Math.max(0, (run.end - performance.now()) / 1000));
    return;
  }
  run.misses++; run.lock = true;
  setTimeout(() => { if (!run || run.id !== "memory") return; for (const k of [a, b]) { cards[k].classList.remove("up"); cards[k].setAttribute("aria-label", "?"); } run.up = []; run.lock = false; }, 750);
}
function endMemory(left) {
  run.score = run.pairs * 10 + Math.round(left) - run.misses;
  finish(run.pairs + (run.pairs === 6 ? Math.min(4, Math.ceil(left / 8)) : 0));
}

/* ---------- canvas games: rhythm and dodge ---------- */
const CW = 320, CH = 200, GROUND = 178;
const hourDay = () => { const h = new Date().getHours(); return h >= 7 && h < 19; };
function backdrop(zone) {
  const A = root.EVART, im = A && A.image("battle/" + zone + (hourDay() ? "-day" : "-night") + ".png");
  return im || null;
}
// your creature as a small sprite: the pack art cell when there is one, the drawn sprite otherwise
function pet(sq, emo) {
  const S = EV.S, A = root.EVART, st = Math.max(0, Math.min(2, S.stage || 0));
  const art = A && !(A.classic && A.classic()) && A.creature(S.species, st, sq, emo, "front");
  if (art) return art;
  return root.PX ? root.PX.sprite(S.species, [20, 28, 36][st], st, sq, emo, S.form === "scruffy") : null;
}
function drawPet(g, x, y, sq, emo, k) {
  const sp = pet(sq, emo); if (!sp) return;
  const w = sp.width * k, h = sp.height * k;
  g.fillStyle = "rgba(20,14,26,.35)"; g.beginPath(); g.ellipse(x, GROUND + 2, w * 0.3, 4, 0, 0, 6.3); g.fill();
  g.drawImage(sp, Math.round(x - w / 2), Math.round(y - h), w, h);
}
function hud(g, text, x, align) {
  g.font = '600 13px "EvNum", "Pixelify Sans", monospace'; g.textAlign = align || "left"; g.textBaseline = "middle";
  g.lineWidth = 4; g.strokeStyle = "#1d1626"; g.lineJoin = "round"; g.strokeText(text, x, 16); g.fillStyle = "#fbf6ef"; g.fillText(text, x, 16);
}
function startCanvas(id) {
  const zone = id === "rhythm" ? "heights" : "caves";
  body().innerHTML = `<div class="mg-top"><b>${esc(tx("g." + id))}</b></div><p class="mg-note">${esc(tx("h." + id))}</p><canvas class="mg-cv" width="${CW}" height="${CH}" tabindex="0" aria-label="${esc(tx("g." + id))}"></canvas>`;
  const cv = body().querySelector(".mg-cv"), g = cv.getContext("2d");
  g.imageSmoothingEnabled = false;
  run.cv = cv; run.g = g; run.bg = backdrop(zone); run.t0 = performance.now(); run.last = run.t0;
  if (id === "rhythm") setupRhythm(); else setupDodge();
  const point = (ev) => { const r = cv.getBoundingClientRect(); return { x: ((ev.clientX - r.left) / r.width) * CW, y: ((ev.clientY - r.top) / r.height) * CH }; };
  const down = (ev) => { ev.preventDefault(); if (run && run.input) run.input("down", point(ev)); };
  const move = (ev) => { if (run && run.input && (ev.buttons || ev.pointerType === "touch")) run.input("move", point(ev)); };
  const key = (ev) => { if (!run || !run.input || run.done) return; if (run.input("key", ev.key, ev.type)) ev.preventDefault(); };
  cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move);
  document.addEventListener("keydown", key); document.addEventListener("keyup", key);
  run.off = () => { document.removeEventListener("keydown", key); document.removeEventListener("keyup", key); };
  cv.focus({ preventScroll: true });
  const me = run;
  const frame = (now) => {
    if (me.dead || me.done) return;
    const dt = Math.min(0.05, (now - me.last) / 1000); me.last = now;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (me.bg) g.drawImage(me.bg, 0, 0, CW, CH); else { g.fillStyle = "#2e2440"; g.fillRect(0, 0, CW, CH); }
    g.fillStyle = "rgba(20,14,26,.18)"; g.fillRect(0, 0, CW, CH);
    me.step(dt, now);
    if (!me.done) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* Song rehearsal: notes slide from the right to the ring by your creature. 100 beats a minute, about 20 s. */
const BEAT = 600, TRAVEL = 1700, PERFECT = 85, GOOD = 170;
const SCALE = [523, 587, 659, 784, 880, 1047]; // a pentatonic scale: any order sounds like a little song
function setupRhythm() {
  // a fixed little score: 1 = a note on that half-beat, 0 = a rest
  const bars = ["10101010", "10101011", "10111010", "10101110", "11101010", "10101011", "10110110", "10101010"];
  const notes = []; let i = 0;
  for (const bar of bars) for (const ch of bar) { if (ch === "1") notes.push({ at: 1200 + i * (BEAT / 2), hit: null, p: SCALE[(notes.length * 3 + (i % 5)) % SCALE.length] }); i++; }
  const TX0 = 74, RING = 16, end = notes[notes.length - 1].at + 900;
  Object.assign(run, { notes, combo: 0, bestCombo: 0, perfect: 0, good: 0, flash: null, dance: 0 });
  run.input = (kind, p, type) => {
    if (kind === "move" || run.done) return false;
    if (kind === "key" && (type !== "keydown" || (p !== " " && p !== "Enter" && p !== "ArrowUp"))) return false;
    const now = performance.now() - run.t0;
    let near = null, d = 1e9;
    for (const n of run.notes) if (!n.hit) { const dd = Math.abs(n.at - now); if (dd < d) { d = dd; near = n; } }
    if (near && d <= GOOD) {
      const pf = d <= PERFECT; near.hit = pf ? "p" : "g"; run[pf ? "perfect" : "good"]++; run.combo++; run.bestCombo = Math.max(run.bestCombo, run.combo);
      run.score += (pf ? 3 : 1) + Math.min(3, Math.floor(run.combo / 8));
      run.flash = { text: tx(pf ? "perfect" : "good"), until: now + 420, col: pf ? "#ffd76a" : "#bfe6a0" }; run.dance = 1;
      EV.tone(near.p, 0.16, { type: "triangle", vol: 0.08 }); EV.buzz(8);
    } else if (!near || d > 260) { run.combo = 0; } // a tap far from any note breaks the streak (no points lost)
    return true;
  };
  run.step = (dt, abs) => {
    const g = run.g, now = abs - run.t0;
    // the lane and the ring
    g.fillStyle = "rgba(20,14,26,.45)"; g.fillRect(0, 56, CW, 36);
    g.strokeStyle = "#fbf6ef"; g.lineWidth = 2; g.beginPath(); g.arc(TX0, 74, RING, 0, 6.3); g.stroke();
    g.strokeStyle = "rgba(251,246,239,.35)"; g.beginPath(); g.arc(TX0, 74, RING + 6, 0, 6.3); g.stroke();
    for (const n of run.notes) {
      if (!n.hit && now - n.at > GOOD) { n.hit = "m"; run.combo = 0; run.flash = { text: tx("miss"), until: now + 380, col: "#f29a9a" }; }
      if (n.hit) continue;
      const x = TX0 + ((n.at - now) / TRAVEL) * (CW - TX0 + 20);
      if (x > CW + 20) continue;
      g.fillStyle = "#1d1626"; g.beginPath(); g.arc(x, 74, 9, 0, 6.3); g.fill();
      g.fillStyle = "#ffd76a"; g.beginPath(); g.arc(x, 74, 7, 0, 6.3); g.fill();
      g.fillStyle = "#1d1626"; g.fillRect(x + 3, 62, 2, 12); g.fillRect(x + 3, 62, 6, 2);
    }
    run.dance = Math.max(0, run.dance - dt * 4);
    const hop = Math.sin(run.dance * Math.PI) * 14, sq = Math.floor(now / BEAT) % 2;
    drawPet(g, TX0, GROUND - hop, sq, run.combo >= 4 ? "happy" : "normal", 1);
    if (run.flash && now < run.flash.until) { g.font = '700 15px "Pixelify Sans", monospace'; g.textAlign = "center"; g.lineWidth = 4; g.strokeStyle = "#1d1626"; g.strokeText(run.flash.text, TX0, 108); g.fillStyle = run.flash.col; g.fillText(run.flash.text, TX0, 108); }
    hud(g, `♪ ${run.score}`, 10); if (run.combo > 1) hud(g, tx("combo", { n: run.combo }), CW - 10, "right");
    if (now > end) finish(run.score / 16);
  };
}

/* Pebble hail: pebbles fall faster and faster for 25 s; three hits and the round ends early. */
const DODGE_TIME = 25;
function setupDodge() {
  Object.assign(run, { x: CW / 2, tx: CW / 2, keys: {}, rocks: [], next: 600, hearts: 3, safe: 0, dodged: 0, seeds: 0, face: 1 });
  run.input = (kind, p, type) => {
    if (kind === "down" || kind === "move") { run.tx = Math.max(16, Math.min(CW - 16, p.x)); run.keys = {}; return true; }
    if (p !== "ArrowLeft" && p !== "ArrowRight" && p !== "a" && p !== "d") return false;
    run.keys[p === "a" ? "ArrowLeft" : p === "d" ? "ArrowRight" : p] = type === "keydown";
    return true;
  };
  run.step = (dt, abs) => {
    const g = run.g, now = abs - run.t0, el = now / 1000, left = Math.max(0, DODGE_TIME - el);
    const kx = (run.keys.ArrowRight ? 1 : 0) - (run.keys.ArrowLeft ? 1 : 0);
    if (kx) run.tx = Math.max(16, Math.min(CW - 16, run.x + kx * 40));
    const dx = run.tx - run.x; if (Math.abs(dx) > 1) run.face = Math.sign(dx);
    run.x += Math.sign(dx) * Math.min(Math.abs(dx), 230 * dt);
    if (now > run.next && left > 0.6) {
      const gold = Math.random() < 0.12;
      run.rocks.push({ x: 12 + Math.random() * (CW - 24), y: -10, vy: 90 + el * 5 + Math.random() * 40, r: gold ? 6 : 5 + Math.random() * 4, gold, rot: Math.random() * 6 });
      run.next = now + Math.max(230, 700 - el * 22) * (0.6 + Math.random() * 0.6);
    }
    const sp = pet(0, "normal"), pw = sp ? Math.min(40, sp.width) : 30, ph = sp ? Math.min(44, sp.height) : 30;
    for (const r of run.rocks) {
      r.y += r.vy * dt; r.rot += dt * 4;
      if (!r.gone && r.y + r.r > GROUND - ph * 0.8 && r.y - r.r < GROUND && Math.abs(r.x - run.x) < pw * 0.38 + r.r) {
        r.gone = true;
        if (r.gold) { run.seeds++; run.score += 3; EV.sfx("catch"); }
        else if (now > run.safe) { run.hearts--; run.safe = now + 1000; EV.sfx("deny"); EV.buzz(40); }
      }
      if (!r.gone && r.y > GROUND + 4) { r.gone = true; if (!r.gold) { run.dodged++; run.score++; } }
    }
    run.rocks = run.rocks.filter((r) => !r.gone);
    for (const r of run.rocks) {
      g.save(); g.translate(Math.round(r.x), Math.round(r.y)); g.rotate(r.gold ? r.rot : 0);
      if (r.gold) { g.fillStyle = "#1d1626"; g.fillRect(-r.r - 1, -2, r.r * 2 + 2, 4); g.fillRect(-2, -r.r - 1, 4, r.r * 2 + 2); g.fillStyle = "#ffd76a"; g.fillRect(-r.r, -1, r.r * 2, 2); g.fillRect(-1, -r.r, 2, r.r * 2); }
      else { g.fillStyle = "#1d1626"; g.beginPath(); g.arc(0, 0, r.r + 1, 0, 6.3); g.fill(); g.fillStyle = "#8d8296"; g.beginPath(); g.arc(0, 0, r.r, 0, 6.3); g.fill(); g.fillStyle = "#b7adbf"; g.fillRect(-r.r / 2, -r.r / 2, 2, 2); }
      g.restore();
    }
    const blink = now < run.safe && Math.floor(now / 90) % 2;
    if (!blink) drawPet(g, run.x, GROUND, Math.floor(now / 300) % 2, now < run.safe ? "sad" : "normal", 1);
    hud(g, "♥".repeat(run.hearts) + "♡".repeat(3 - run.hearts), 10); hud(g, `${run.score} · ${Math.ceil(left)} s`, CW - 10, "right");
    if (run.hearts <= 0 || left <= 0) finish(run.score / 4);
  };
}

/* ---------- styles: appended to the body, where the artifact viewer keeps the game's own styles ---------- */
const css = `
.mg-wrap{position:fixed;inset:0;z-index:58;display:grid;place-items:center;padding:12px}
.mg-wrap[hidden]{display:none}
.mg-back{position:absolute;inset:0;background:rgba(20,14,26,.62)}
.mg-box{position:relative;width:min(440px,100%);max-height:calc(100dvh - 24px);overflow:auto;background:var(--surface);color:var(--ink);border:2px solid var(--line);border-radius:14px;box-shadow:4px 4px 0 var(--line);padding:14px 14px 16px}
.mg-x{position:absolute;top:8px;right:8px;width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);font-size:16px;cursor:pointer}
.mg-h{font:700 19px var(--font-display);margin:2px 40px 4px 2px}
.mg-note{margin:4px 2px;color:var(--muted);font-size:13px}
.mg-list{display:grid;gap:8px;margin-top:10px}
.mg-pick{display:flex;gap:10px;align-items:center;text-align:left;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);color:var(--ink);cursor:pointer;font:inherit}
.mg-pick:hover,.mg-pick:focus-visible{background:var(--soft)}
.mg-ico{font-size:28px;width:40px;text-align:center;flex:0 0 auto}
.mg-txt{display:grid;gap:2px}.mg-txt b{font:700 15px var(--font-display)}.mg-txt small{font-size:12.5px;color:var(--muted)}.mg-txt em{font-style:normal;font-size:12px;color:var(--accent)}
.mg-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:2px 40px 2px 2px;font:700 16px var(--font-display)}
.mg-hud{font:600 14px var(--font-display)}
.mg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
.mg-card{aspect-ratio:3/4;border:2px solid var(--line);border-radius:10px;cursor:pointer;padding:0;position:relative;background:repeating-linear-gradient(45deg,#6a46b8 0 6px,#5a3aa0 6px 12px);box-shadow:2px 2px 0 var(--line)}
.mg-face{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:30px;border-radius:8px;background:var(--surface);box-shadow:inset 0 0 0 4px var(--tc)}
.mg-face small{font:600 11px var(--font-body);color:var(--ink)}
.mg-card.up .mg-face{display:flex}
.mg-card.got{opacity:.8;box-shadow:none}
.mg-cv{display:block;width:100%;height:auto;margin-top:8px;border:2px solid var(--line);border-radius:10px;image-rendering:pixelated;touch-action:none;background:#2e2440}
.mg-big{font:700 24px var(--font-display);margin:10px 2px 4px}
.mg-rec{font:700 15px var(--font-display);color:var(--accent);margin:4px 2px}
.mg-row{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
`;
const st = document.createElement("style"); st.textContent = css; (document.body || document.head).appendChild(st);

EV.MINI = { choose, start, close, record, best, get run() { return run; } };
})(window);
