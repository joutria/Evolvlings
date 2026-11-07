/* Evolvlings RPG: extra sounds, achievements and drawing of the other creatures.
   Part of the old rpg.js, now split. Classic scripts: top-level names are shared between the rpg/*.js files,
   which load in order (see index.html). */
"use strict";

/* ---------- Extra sounds ---------- */
const tone = EV.tone;
Object.assign(EV.SFX, {
  hit: () => tone(180, 0.08, { type: "square", vol: 0.05, slide: -60 }),
  crit: () => { tone(260, 0.06, { type: "square", vol: 0.06 }); tone(520, 0.12, { type: "square", vol: 0.05, delay: 0.05, slide: -200 }); },
  card: () => { tone(660, 0.07, { type: "triangle", vol: 0.06 }); tone(990, 0.12, { type: "triangle", vol: 0.05, delay: 0.06 }); },
  miss: () => tone(900, 0.08, { vol: 0.03, slide: 400 }),
  ko: () => tone(300, 0.35, { type: "sawtooth", vol: 0.035, slide: -220 }),
  win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, { type: "triangle", vol: 0.06, delay: i * 0.09 })); },
});

/* ---------- Achievements ---------- */
EV.ACH.push(["exp1", 15, (p) => (p.c.expWins || 0) >= 1], ["guard1", 40, (p) => ((p.cleared || {}).aurora || 0) >= 1], ["guard3", 60, (p) => ["aurora", "crater", "forest"].every((z) => ((p.cleared || {})[z] || 0) >= 1)], ["guard6", 80, (p) => ["hollow", "lake", "caves"].every((z) => ((p.cleared || {})[z] || 0) >= 1)], ["guard8", 120, (p) => ZONES.heart.unlock.every((z) => ((p.cleared || {})[z] || 0) >= 1)], ["heart1", 200, (p) => ((p.cleared || {}).heart || 0) >= 1], ["cards10", 20, (p) => (p.cards || []).length >= 10], ["fuse1", 15, (p) => (p.c.fused || 0) >= 1],
  ["grimSol", 40, (p) => grimDone(p, circleTypes("sol"))], ["grimSky", 40, (p) => grimDone(p, circleTypes("sky"))],
  ["grimLake", 40, (p) => grimDone(p, circleTypes("lake"))], ["grimFrost", 40, (p) => grimDone(p, circleTypes("frost"))],
  ["grimAll", 150, (p) => grimDone(p, GRIM_ORDER)], ["dust1", 10, (p) => (p.c.dusted || 0) >= 1]);
for (const lg of ["es", "en"]) {
  for (const id of ["exp1", "guard1", "guard3", "guard6", "guard8", "cards10", "fuse1", "grimSol", "grimSky", "grimLake", "grimFrost", "grimAll", "dust1", "heart1"]) EV.STR[lg].ach[id] = TX[lg]["ach." + id];
  EV.STR[lg]["nav.cards"] = TX[lg]["nav.cards"];
  EV.STR[lg]["nav.teams"] = TX[lg]["nav.teams"];
}
EV.applyStatic();

/* ---------- Drawing other creatures (simple originals) ---------- */
const MONCOL = {
  fuellito: { body: "#e8743b", belly: "#ffd29a", line: "#8a3a17", cheek: "#ffb3a0" },
  brotin:   { body: "#b5814a", belly: "#e8cfa2", line: "#5e3d1c", cheek: "#f0a58a" },
  remolin:  { body: "#5aa6c9", belly: "#d4eef7", line: "#2c5f78", cheek: "#f4a6c4" },
  bostezo:  { body: "#efe7f7", belly: "#ffffff", line: "#7d6c98", cheek: "#f6b5cf" },
  farol:    { body: "#3c3a4a", belly: "#ffe9a6", line: "#1d1b26", cheek: "#f4a6a0" },
  mecha:    { body: "#f3e6c8", belly: "#fff8e6", line: "#8a6e3a", cheek: "#f4a6a0" },
  yunqueron:{ body: "#7c8a6a", belly: "#c9cfa6", line: "#3a4030", cheek: "#e89a7a" },
  espinardo:{ body: "#8a6a4a", belly: "#e0c9a0", line: "#3d2a18", cheek: "#f0a58a" },
  forja:    { body: "#4a3a36", belly: "#ff9a3a", line: "#1e1614", cheek: "#ff7a5a" },
  seto:     { body: "#3f6e36", belly: "#8fbf6a", line: "#1e3a1a", cheek: "#d4a0c0" },
  nim:      { body: "#5b5175", belly: "#a89cc8", line: "#251f33", cheek: "#e0a0c8" },
  centinela:{ body: "#4a4e60", belly: "#9aa0b8", line: "#1e2030", cheek: "#c8a0c0" },
  vidriela: { body: "#8fd0e8", belly: "#e6f8ff", line: "#3a7896", cheek: "#f4b0c8" },
  ecolito:  { body: "#9a8a76", belly: "#d8ccb8", line: "#4a4034", cheek: "#e8a88a" },
  relampin: { body: "#f0c040", belly: "#fff2b8", line: "#7a5a10", cheek: "#ff9a80" },
  trinilla: { body: "#e88aa8", belly: "#ffe0ea", line: "#7a3050", cheek: "#ffb0c8" },
  carambano:{ body: "#7a8aa8", belly: "#d8e8f4", line: "#2e3a50", cheek: "#f0a8c0" },
  capuchon: { body: "#e8a070", belly: "#ffe0c8", line: "#7a3a20", cheek: "#ff9a90" },
  guardatumba:{ body: "#a8d4ec", belly: "#eaf8ff", line: "#3a6a8a", cheek: "#c8b0e0" },
  veleta:   { body: "#8a8090", belly: "#e8e4f0", line: "#3a3440", cheek: "#c0a0c8" },
  micelio:  { body: "#efe6da", belly: "#ffffff", line: "#7a6a5a", cheek: "#e8b0c0" },
  trono:    { body: "#2e2a3a", belly: "#6a6090", line: "#110f18", cheek: "#a080c0" },
  mira:     { body: "#2f5f80", belly: "#a8e0f0", line: "#142c3e", cheek: "#f0a0b8" },
  grava:    { body: "#7a6c5c", belly: "#c8b89a", line: "#352c22", cheek: "#e0a080" },
  raiz:     { body: "#6a4a3a", belly: "#c8a070", line: "#2a1a18", cheek: "#e0a080" },
  unisona:  { body: "#f2c94c", belly: "#4a3f8a", line: "#2a2140", cheek: "#f0a0b8" },
};
function drawMon(c, kind, o) {
  const ell = EV.ell;
  // PNG art (art.js) wins: a 64 px cell drawn at 1.5x, feet (cell y = 60) on the line the drawn creatures stand on
  const art = typeof EVART !== "undefined" && EVART.creature(kind, o.stage == null ? 1 : o.stage, Math.floor((o.t || 0) * 2) % 2, o.ko ? "sad" : o.hp < 0.35 ? "sad" : "normal", "front");
  if (art) {
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= 0.25; c.fillStyle = "#1d1626"; c.fillRect(-30, 40, 60, 5); c.restore();
    c.save(); c.imageSmoothingEnabled = false; c.drawImage(art, -48, 44 - 90, 96, 96); c.restore();
    return;
  }
  if ((kind === "lumo" || kind === "fizz" || kind === "pebb") && typeof PX !== "undefined") {
    const st = o.stage == null ? 1 : o.stage, n = [12, 16, 20][st];
    const sp = PX.sprite(kind, n, st, Math.floor(o.t * 2) % 2, o.ko ? "sleep" : o.hp < 0.35 ? "sad" : "normal", o.hollow || o.form === "scruffy");
    const w = sp.width * 5, h = sp.height * 5, hover = kind === "fizz" ? 30 : 0;
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= 0.25; c.fillStyle = "#1d1626"; c.fillRect(-w / 2 + 15, 40, w - 30, 5); c.restore();
    c.save(); c.imageSmoothingEnabled = false; c.drawImage(sp, -w / 2, 46 - h - hover, w, h); c.restore();
  } else if (kind === "lumo" || kind === "fizz" || kind === "pebb") {
    EV.drawCreature(c, 0, 0, { kind, stage: o.stage, form: o.hollow ? "scruffy" : o.form, t: o.t, mood: o.hp < 0.35 ? 20 : 60, sleeping: o.ko, sick: false, blink: o.ko, eat: false, jump: 0 });
  } else if (MONCOL[kind]) {
    const col = MONCOL[kind];
    const br = Math.sin(o.t * 3) * 0.03;
    c.save(); c.scale(1 + br, 1 - br);
    c.save(); c.globalAlpha = 0.18; c.fillStyle = "#000"; ell(c, 0, 40, 40, 7); c.fill(); c.restore();
    c.lineWidth = 3; c.strokeStyle = col.line;
    if (kind === "forja") {
      // a squat furnace with a glowing mouth and two little chimneys
      c.fillStyle = col.body; c.beginPath(); c.moveTo(-40, 36); c.lineTo(-34, -40); c.lineTo(34, -40); c.lineTo(40, 36); c.closePath(); c.fill(); c.stroke();
      for (const x of [-20, 18]) { c.fillRect(x - 6, -62, 12, 22); c.strokeRect(x - 6, -62, 12, 22); }
      for (let k = 0; k < 3; k++) { const ph = (o.t * 0.8 + k / 3) % 1; c.globalAlpha = 1 - ph; c.fillStyle = "#ffb347"; c.fillRect(-20 + Math.sin(o.t * 4 + k) * 4, -66 - ph * 26, 3, 3); } c.globalAlpha = 1;
      const glow = 0.7 + Math.sin(o.t * 5) * 0.2;
      c.save(); c.shadowColor = "#ff8a3a"; c.shadowBlur = 24 * glow; c.fillStyle = `rgba(255, 140, 58, ${0.8 + glow * 0.2})`;
      c.beginPath(); c.moveTo(-22, 30); c.lineTo(-22, 6); c.quadraticCurveTo(0, -12, 22, 6); c.lineTo(22, 30); c.closePath(); c.fill(); c.restore();
      c.fillStyle = "#fff1a8"; for (const x of [-12, 12]) { EV.ell(c, x, -18, 5, o.ko ? 1 : 5); c.fill(); }
      c.fillStyle = col.line; for (const x of [-28, 28]) { c.fillRect(x - 5, 36, 10, 8); }
    } else if (kind === "seto") {
      // a wall of hedge with thorns, eyes in the leaves
      c.fillStyle = col.body;
      c.beginPath(); for (const [px, py, r] of [[-34, 10, 22], [-18, -22, 24], [8, -30, 26], [32, -8, 22], [30, 22, 18], [0, 18, 26], [-28, 30, 16]]) { c.moveTo(px + r, py); c.arc(px, py, r, 0, 7); } c.fill(); c.stroke();
      c.fillStyle = col.belly; for (const [px, py] of [[-20, -26], [14, -36], [30, -4], [-34, 8], [6, 22]]) { EV.ell(c, px, py, 6, 4); c.fill(); }
      c.strokeStyle = "#24122e"; c.lineWidth = 2; for (let k = 0; k < 9; k++) { const a = k * 0.7, r = 44; c.beginPath(); c.moveTo(Math.cos(a) * (r - 8), Math.sin(a) * (r - 8) - 4); c.lineTo(Math.cos(a) * r, Math.sin(a) * r - 4); c.stroke(); }
      c.fillStyle = "#ffe27a"; for (const x of [-12, 12]) { EV.ell(c, x, -6, 5, o.ko ? 1 : 6); c.fill(); } c.fillStyle = "#24122e"; for (const x of [-12, 12]) { EV.ell(c, x, -5, 2, o.ko ? 0.5 : 3); c.fill(); }
    } else if (kind === "veleta") {
      // a weathervane on a pole inside a whirlwind of voices
      c.save(); c.strokeStyle = "#c8d0e8"; c.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const r = 26 + k * 9, a0 = o.t * (2 - k * 0.3) + k; c.globalAlpha = 0.55 - k * 0.1; c.beginPath(); c.ellipse(0, 4 - k * 8, r, r * 0.35, 0, a0, a0 + 4.2); c.stroke(); }
      c.restore();
      c.strokeStyle = col.line; c.lineWidth = 3; c.fillStyle = col.body; c.fillRect(-3, -60, 6, 100); c.strokeRect(-3, -60, 6, 100);
      c.save(); c.translate(0, -62); c.rotate(o.ko ? 0.6 : Math.sin(o.t * 1.4) * 0.6);
      c.beginPath(); c.moveTo(-36, 0); c.lineTo(26, 0); c.lineTo(26, -6); c.lineTo(40, 0); c.lineTo(26, 6); c.lineTo(26, 0); c.stroke();
      c.fillStyle = "#c0a040"; c.beginPath(); c.moveTo(-36, 0); c.lineTo(-22, -12); c.lineTo(-22, 12); c.closePath(); c.fill(); c.stroke(); c.restore();
      c.fillStyle = "#c0a040"; EV.ell(c, 0, -62, 6, 6); c.fill();
      c.fillStyle = col.belly; for (const x of [-10, 10]) { EV.ell(c, x, -20, 5, o.ko ? 1 : 6); c.fill(); }
      c.fillStyle = "#3a3440"; c.font = "700 14px system-ui"; c.textAlign = "center"; c.globalAlpha = 0.6; for (let k = 0; k < 3; k++) c.fillText("♪", Math.cos(o.t * 2 + k * 2.1) * 34, -10 + Math.sin(o.t * 2 + k * 2.1) * 10); c.globalAlpha = 1;
    } else if (kind === "raiz") {
      // the Root under the Glade: a stump of rings, eight eyes in the eight colours, dripping sap
      const ec = ["#d9542c", "#4f9a3c", "#e2ae2e", "#6fb8d0", "#3f7fc9", "#a08a6a", "#8a78d4", "#b0603c"];
      c.fillStyle = SAP.c1; EV.ell(c, 0, 36, 62, 10); c.fill();
      c.fillStyle = col.body;
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 22, 28); c.quadraticCurveTo(sx * 52, 28, sx * 64, 40); c.lineTo(sx * 46, 40); c.quadraticCurveTo(sx * 34, 36, sx * 18, 36); c.closePath(); c.fill(); c.stroke(); }
      c.beginPath(); c.moveTo(-38, 36); c.lineTo(-44, -40); c.quadraticCurveTo(0, -54, 44, -40); c.lineTo(38, 36); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = col.belly; EV.ell(c, 0, -42, 42, 10); c.fill(); c.stroke();
      c.lineWidth = 1.5; for (const r of [30, 19, 8]) { EV.ell(c, 0, -42, r, r * 0.24); c.stroke(); }
      for (let k = 0; k < 8; k++) { const x = -27 + (k % 4) * 18, y = -18 + Math.floor(k / 4) * 22; c.save(); c.globalAlpha = o.ko ? 0.3 : 0.65 + 0.35 * Math.sin(o.t * 2 + k); c.fillStyle = ec[k]; EV.ell(c, x, y, 5, o.ko ? 1 : 4); c.fill(); c.restore(); }
      for (let k = 0; k < 4; k++) { const ph = (Math.floor(o.t * 6) / 12 + k / 4) % 1; c.fillStyle = SAP.c0; c.fillRect(-31 + k * 20, 30 - ph * 60, 3, 6); c.fillStyle = SAP.sheen; c.fillRect(-31 + k * 20, 30 - ph * 60, 1, 1); }
    } else if (kind === "unisona") {
      // half dawn, half night: a round body split down the middle, a star crest and small wings
      const fl = Math.sin(o.t * 5) * 5;
      c.fillStyle = "#f6e6a8"; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 24, -4); c.quadraticCurveTo(sx * 52, -26 + fl, sx * 46, 8); c.closePath(); c.fill(); c.stroke(); }
      c.save(); ell(c, 0, 6, 32, 32); c.clip(); c.fillStyle = col.body; c.fillRect(-40, -30, 40, 80); c.fillStyle = col.belly; c.fillRect(0, -30, 40, 80); c.restore();
      ell(c, 0, 6, 32, 32); c.stroke();
      c.fillStyle = "#fff4c0"; c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 6 : 14, a = -Math.PI / 2 + k * Math.PI / 5; c.lineTo(Math.cos(a) * r, -30 + Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
      c.fillStyle = "#1d1626"; ell(c, -11, 2, 4, o.ko ? 1 : 5); c.fill(); c.fillStyle = "#fff4c0"; ell(c, 11, 2, 4, o.ko ? 1 : 5); c.fill();
      c.fillStyle = col.cheek; ell(c, -19, 13, 4, 3); c.fill(); ell(c, 19, 13, 4, 3); c.fill();
      c.save(); c.globalAlpha = 0.6; c.fillStyle = "#fff4c0"; c.font = "700 12px system-ui"; c.textAlign = "center"; c.fillText("♪", Math.cos(o.t * 2) * 42, -20 + Math.sin(o.t * 2) * 8); c.restore();
    } else if (kind === "micelio") {
      // a great pale mushroom mother sleeping on dark sap
      c.fillStyle = SAP.c1; EV.ell(c, 0, 34, 54, 10); c.fill();
      c.strokeStyle = "#f4efe6"; c.lineWidth = 2; for (let k = 0; k < 7; k++) { const a = Math.PI * (0.1 + k * 0.13); c.beginPath(); c.moveTo(0, 30); c.quadraticCurveTo(Math.cos(a) * 30, 40, Math.cos(a) * 56, 36 + Math.sin(o.t + k) * 2); c.stroke(); }
      c.strokeStyle = col.line; c.lineWidth = 3; c.fillStyle = col.belly; c.fillRect(-14, -14, 28, 46); c.strokeRect(-14, -14, 28, 46);
      c.fillStyle = col.body; c.beginPath(); c.moveTo(-56, -10); c.quadraticCurveTo(-50, -70, 0, -72); c.quadraticCurveTo(50, -70, 56, -10); c.quadraticCurveTo(0, -24, -56, -10); c.fill(); c.stroke();
      c.fillStyle = "#c8a0d8"; for (const [px, py, r] of [[-30, -40, 7], [4, -58, 8], [30, -36, 6], [-8, -34, 5]]) { EV.ell(c, px, py, r, r * 0.8); c.fill(); }
      c.strokeStyle = "#2a2230"; c.lineWidth = 2.4; for (const x of [-7, 7]) { c.beginPath(); c.arc(x, 4, 4, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
      c.save(); c.globalAlpha = 0.5; c.fillStyle = "#ffffff"; for (let k = 0; k < 5; k++) { const ph = (o.t * 0.3 + k / 5) % 1; EV.ell(c, -40 + k * 20, -60 - ph * 30, 2, 2); c.fill(); } c.restore();
    } else if (kind === "guardatumba") {
      // an ice giant: blocky shoulders, a crown of icicles, a frozen club
      c.save(); c.globalAlpha = 0.9;
      c.fillStyle = col.body; c.beginPath(); c.moveTo(-34, 36); c.lineTo(-44, -20); c.lineTo(-24, -40); c.lineTo(24, -40); c.lineTo(44, -20); c.lineTo(34, 36); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = col.belly; c.beginPath(); c.moveTo(-18, 30); c.lineTo(-24, -10); c.lineTo(24, -10); c.lineTo(18, 30); c.closePath(); c.fill();
      c.fillStyle = "#e8f8ff"; for (const x of [-18, -6, 6, 18]) { c.beginPath(); c.moveTo(x - 5, -40); c.lineTo(x, -54 - (x === -6 || x === 6 ? 6 : 0)); c.lineTo(x + 5, -40); c.closePath(); c.fill(); c.stroke(); }
      c.fillStyle = "#7ab4d4"; c.fillRect(42, -30, 10, 56); c.strokeRect(42, -30, 10, 56);
      c.restore();
      c.fillStyle = "#1e3a50"; for (const x of [-10, 10]) { EV.ell(c, x, -24, 4, o.ko ? 1 : 4); c.fill(); }
      c.fillStyle = col.body; for (const x of [-20, 20]) { c.fillRect(x - 8, 34, 16, 8); }
    } else if (kind === "trono") {
      // an empty throne in the fog, with two eyes where the king should sit
      c.fillStyle = col.body; c.fillRect(-30, -74, 60, 84); c.strokeRect(-30, -74, 60, 84);
      for (const x of [-30, 22]) { c.fillRect(x, -88, 8, 16); }
      c.fillRect(-42, 0, 84, 16); c.strokeRect(-42, 0, 84, 16);
      for (const x of [-38, 30]) { c.fillRect(x, 16, 8, 22); }
      c.fillStyle = col.belly; c.fillRect(-20, -62, 40, 58);
      c.save(); c.globalAlpha = 0.35 + Math.sin(o.t * 2) * 0.1; c.fillStyle = "#d8d4e8"; for (let k = 0; k < 3; k++) { EV.ell(c, Math.sin(o.t + k * 2) * 20, -30 + k * 20, 34, 6); c.fill(); } c.restore();
      c.fillStyle = "#e8e0ff"; for (const x of [-9, 9]) { EV.ell(c, x, -38, 4, o.ko ? 1 : 5); c.fill(); }
      c.fillStyle = "#c0a040"; c.beginPath(); c.moveTo(-14, -74); c.lineTo(-8, -84); c.lineTo(0, -76); c.lineTo(8, -84); c.lineTo(14, -74); c.closePath(); c.fill();
    } else if (kind === "mira") {
      // a huge eye under a water surface
      c.fillStyle = col.body; c.beginPath(); c.moveTo(-50, 36); c.quadraticCurveTo(-56, -20, 0, -40); c.quadraticCurveTo(56, -20, 50, 36); c.closePath(); c.fill(); c.stroke();
      c.save(); c.globalAlpha = 0.5; c.strokeStyle = "#e0f6ff"; c.lineWidth = 2; for (let k = 0; k < 3; k++) { const y = -30 + k * 6 + Math.sin(o.t * 2 + k) * 2; c.beginPath(); c.moveTo(-40 + k * 6, y); c.quadraticCurveTo(0, y - 6, 40 - k * 6, y); c.stroke(); } c.restore();
      c.fillStyle = "#f4fbff"; EV.ell(c, 0, 2, 26, o.ko ? 2 : 17); c.fill(); c.stroke();
      if (!o.ko) { const lx = Math.sin(o.t * 0.9) * 8; c.fillStyle = "#3a8ab0"; EV.ell(c, lx, 2, 11, 11); c.fill(); c.fillStyle = "#0e1a24"; EV.ell(c, lx, 2, 5, 7); c.fill(); c.fillStyle = "#fff"; EV.ell(c, lx - 3, -2, 2, 2); c.fill(); }
      c.fillStyle = col.belly; for (const [px, py] of [[-36, 24], [34, 20], [-20, 30], [22, 32]]) { EV.ell(c, px, py, 4, 3); c.fill(); }
    } else if (kind === "grava") {
      // a mountain of stones that sings; a crack glows where her mouth is
      c.fillStyle = col.body; c.beginPath(); c.moveTo(-50, 38); c.lineTo(-38, -10); c.lineTo(-18, -44); c.lineTo(6, -52); c.lineTo(30, -30); c.lineTo(48, 4); c.lineTo(52, 38); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = col.belly; for (const [px, py, r] of [[-26, 10, 10], [18, -14, 9], [30, 20, 8], [-8, -30, 7]]) { EV.ell(c, px, py, r, r * 0.7); c.fill(); }
      c.fillStyle = "#7ad0c8"; c.beginPath(); c.moveTo(-4, -52); c.lineTo(4, -70); c.lineTo(12, -50); c.closePath(); c.fill();
      c.fillStyle = "#2a2018"; for (const x of [-12, 10]) { EV.ell(c, x, -14, 4, o.ko ? 1 : 5); c.fill(); }
      const op = 0.5 + Math.sin(o.t * 3) * 0.3; c.save(); c.globalAlpha = o.ko ? 0.1 : op; c.fillStyle = "#ffe0a0"; c.fillRect(-12, 4, 24, 4); c.restore();
    } else if (kind === "farol") {
      // a great lantern on legs
      c.fillStyle = col.body; c.fillRect(-6, -78, 12, 14);
      c.beginPath(); c.moveTo(-34, -64); c.lineTo(34, -64); c.lineTo(26, -54); c.lineTo(-26, -54); c.closePath(); c.fill(); c.stroke();
      const glow = 0.6 + Math.sin(o.t * 4) * 0.2;
      c.save(); c.shadowColor = "#ffd35a"; c.shadowBlur = 30 * glow;
      c.fillStyle = `rgba(255, 226, 122, ${0.75 + glow * 0.25})`; c.beginPath(); c.moveTo(-26, -54); c.lineTo(26, -54); c.lineTo(32, 20); c.lineTo(-32, 20); c.closePath(); c.fill(); c.restore();
      c.stroke();
      c.fillStyle = col.body; for (const x of [-12, 12]) c.fillRect(x - 2, -54, 4, 74);
      c.beginPath(); c.moveTo(-36, 20); c.lineTo(36, 20); c.lineTo(30, 30); c.lineTo(-30, 30); c.closePath(); c.fill(); c.stroke();
      for (const x of [-20, 20]) { c.fillRect(x - 4, 30, 8, 12); }
      // eyes inside the glass
      c.fillStyle = "#3a2a10"; for (const x of [-10, 10]) { ell(c, x, -18, 5, o.ko ? 1 : 6); c.fill(); }
    } else {
      // round body
      const g = c.createRadialGradient(-14, -18, 6, 0, 0, 60); g.addColorStop(0, col.belly); g.addColorStop(0.45, col.body); g.addColorStop(1, col.body);
      c.fillStyle = g;
      if (kind === "mecha") {
        // a candle body with a flame on top
        c.beginPath(); c.moveTo(-26, 36); c.lineTo(-26, -24); c.quadraticCurveTo(0, -34, 26, -24); c.lineTo(26, 36); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = col.belly; for (const [px, py] of [[-18, -18], [14, -20]]) { EV.ell(c, px, py + 6, 4, 9); c.fill(); }
        c.strokeStyle = col.line; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, -40); c.stroke();
        const fl = Math.sin(o.t * 10) * 2;
        c.save(); c.shadowColor = "#ffd35a"; c.shadowBlur = 16; c.fillStyle = o.hollow ? "#8a7ab0" : "#ffcf4a"; c.beginPath(); c.moveTo(0, -60 + fl); c.quadraticCurveTo(10, -46, 0, -40); c.quadraticCurveTo(-10, -46, 0, -60 + fl); c.fill(); c.restore();
      } else if (kind === "yunqueron") {
        // turtle with an anvil shell
        ell(c, 0, 8, 40, 28); c.fill(); c.stroke();
        c.fillStyle = "#5a5f66"; c.strokeStyle = "#2a2d32"; c.beginPath(); c.moveTo(-34, -6); c.lineTo(34, -6); c.lineTo(40, -22); c.lineTo(-40, -22); c.closePath(); c.fill(); c.stroke();
        c.fillRect(-12, -34, 24, 12); c.strokeRect(-12, -34, 24, 12);
        c.save(); c.globalAlpha = 0.5 + Math.sin(o.t * 3) * 0.2; c.fillStyle = "#ff8a3a"; c.fillRect(-30, -20, 60, 3); c.restore();
        c.fillStyle = col.body; c.strokeStyle = col.line; ell(c, 40, 4, 12, 10); c.fill(); c.stroke();
      } else if (kind === "espinardo") {
        // hedgehog with bramble spines
        c.strokeStyle = "#3e6e2c"; c.lineWidth = 3; for (let k = 0; k < 11; k++) { const a = Math.PI * (1.05 + k * 0.09); c.beginPath(); c.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); c.lineTo(Math.cos(a) * 50, Math.sin(a) * 50); c.stroke(); }
        c.fillStyle = "#c0392b"; for (const k of [2, 6, 9]) { const a = Math.PI * (1.05 + k * 0.09); EV.ell(c, Math.cos(a) * 50, Math.sin(a) * 50, 3, 3); c.fill(); }
        c.strokeStyle = col.line; c.lineWidth = 3; c.fillStyle = g; ell(c, 0, 4, 38, 34); c.fill(); c.stroke(); c.fillStyle = col.belly; ell(c, 0, 16, 22, 16); c.fill();
      } else if (kind === "nim") {
        // a little bat: pointed ears and folded wings
        c.fillStyle = col.body; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 10, -24); c.lineTo(sx * 22, -50); c.lineTo(sx * 28, -20); c.closePath(); c.fill(); c.stroke(); }
        const fl = Math.sin(o.t * 6) * 6;
        for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 26, -6); c.quadraticCurveTo(sx * 56, -22 + fl, sx * 58, 10); c.quadraticCurveTo(sx * 46, 2, sx * 40, 14); c.quadraticCurveTo(sx * 34, 4, sx * 26, 12); c.closePath(); c.fill(); c.stroke(); }
        c.fillStyle = g; ell(c, 0, 4, 32, 32); c.fill(); c.stroke(); c.fillStyle = col.belly; ell(c, 0, 16, 18, 14); c.fill();
      } else if (kind === "centinela") {
        // an armoured guard with a fog lance and a crested helmet
        c.strokeStyle = "#6a6478"; c.lineWidth = 3; c.beginPath(); c.moveTo(44, 38); c.lineTo(44, -60); c.stroke();
        c.fillStyle = "#cfd4e8"; c.beginPath(); c.moveTo(38, -58); c.lineTo(44, -76); c.lineTo(50, -58); c.closePath(); c.fill();
        c.save(); c.globalAlpha = 0.4; c.fillStyle = "#e8e4f0"; EV.ell(c, 44 + Math.sin(o.t * 2) * 3, -66, 10, 4); c.fill(); c.restore();
        c.strokeStyle = col.line; c.fillStyle = g; ell(c, 0, 4, 36, 40); c.fill(); c.stroke();
        c.fillStyle = "#6a6e86"; c.beginPath(); c.moveTo(-34, -12); c.quadraticCurveTo(0, -60, 34, -12); c.lineTo(28, -16); c.quadraticCurveTo(0, -40, -28, -16); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = "#4a3a6a"; c.beginPath(); c.moveTo(-4, -46); c.quadraticCurveTo(10, -66, 26, -60); c.quadraticCurveTo(12, -54, 4, -40); c.closePath(); c.fill();
        c.fillStyle = col.belly; ell(c, 0, 18, 20, 16); c.fill();
      } else if (kind === "vidriela") {
        // a glass fish: see-through body, wavy fins and a tail
        c.save(); c.globalAlpha = 0.85;
        const w = Math.sin(o.t * 4) * 5;
        c.fillStyle = "#bfe8f6"; c.beginPath(); c.moveTo(-30, 0); c.lineTo(-56, -18 + w); c.lineTo(-52, 0); c.lineTo(-56, 18 - w); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(-6, -30); c.quadraticCurveTo(10, -52 + w, 22, -28); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = g; ell(c, 0, 0, 38, 30); c.fill(); c.stroke(); c.restore();
        c.save(); c.globalAlpha = 0.6; c.fillStyle = "#ffffff"; ell(c, -12, -14, 10, 4); c.fill(); c.restore();
      } else if (kind === "ecolito") {
        // a singing pebble with sound rings
        c.fillStyle = g; c.beginPath(); c.moveTo(-36, 30); c.lineTo(-40, -4); c.lineTo(-22, -32); c.lineTo(12, -38); c.lineTo(36, -14); c.lineTo(38, 30); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = col.belly; ell(c, 0, 16, 20, 12); c.fill();
        c.strokeStyle = "#d8c8a8"; c.lineWidth = 2; for (let k = 0; k < 2; k++) { const ph = (o.t * 0.8 + k / 2) % 1; c.globalAlpha = 1 - ph; c.beginPath(); c.arc(0, 0, 44 + ph * 18, -0.5, 0.5); c.stroke(); c.beginPath(); c.arc(0, 0, 44 + ph * 18, Math.PI - 0.5, Math.PI + 0.5); c.stroke(); } c.globalAlpha = 1;
        c.strokeStyle = col.line; c.lineWidth = 3;
      } else if (kind === "relampin") {
        // a ferret with a zig-zag lightning tail
        c.fillStyle = "#ffe27a"; c.strokeStyle = col.line; c.lineWidth = 2.5; c.beginPath(); c.moveTo(28, 10); c.lineTo(48, -4); c.lineTo(42, -10); c.lineTo(58, -26); c.lineTo(50, -6); c.lineTo(56, -2); c.lineTo(34, 18); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = g; ell(c, 0, 4, 34, 30); c.fill(); c.stroke(); c.fillStyle = col.belly; ell(c, 0, 14, 18, 14); c.fill();
        c.fillStyle = col.body; for (const sx of [-1, 1]) { ell(c, sx * 20, -24, 8, 9); c.fill(); c.stroke(); }
        c.fillStyle = "#7a5a10"; c.fillRect(-14, -14, 28, 6);
      } else if (kind === "trinilla") {
        // a bird with a harp-shaped tail
        c.strokeStyle = "#c08a30"; c.lineWidth = 3; c.beginPath(); c.moveTo(24, 16); c.quadraticCurveTo(58, 10, 50, -30); c.quadraticCurveTo(40, -10, 26, -4); c.stroke();
        c.lineWidth = 1; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(30 + k * 5, 12 - k); c.lineTo(32 + k * 5, -6 - k * 5); c.stroke(); }
        c.strokeStyle = col.line; c.lineWidth = 3; c.fillStyle = g; ell(c, 0, 4, 32, 32); c.fill(); c.stroke(); c.fillStyle = col.belly; ell(c, 0, 16, 18, 14); c.fill();
        c.fillStyle = "#f2b632"; c.beginPath(); c.moveTo(-6, 2); c.lineTo(6, 2); c.lineTo(0, 10); c.closePath(); c.fill();
        c.fillStyle = col.body; c.beginPath(); c.moveTo(-4, -28); c.quadraticCurveTo(0, -46, 10, -40); c.quadraticCurveTo(6, -32, 4, -28); c.fill();
      } else if (kind === "carambano") {
        // a mole with an icicle snout and big digging paws
        c.fillStyle = g; ell(c, 0, 4, 38, 32); c.fill(); c.stroke(); c.fillStyle = col.belly; ell(c, 0, 16, 20, 14); c.fill();
        c.fillStyle = "#e8f8ff"; c.beginPath(); c.moveTo(-8, 4); c.lineTo(8, 4); c.lineTo(0, 22); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = "#d8c0b0"; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 36, 14, 10, 7, sx * 0.4, 0, 7); c.fill(); c.stroke(); }
      } else if (kind === "capuchon") {
        // a hermit crab wearing a mushroom
        c.fillStyle = "#e8dcc8"; c.fillRect(-14, -30, 28, 20); c.strokeRect(-14, -30, 28, 20);
        c.fillStyle = "#b04a4a"; c.beginPath(); c.moveTo(-40, -26); c.quadraticCurveTo(0, -78, 40, -26); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = "#fff4e8"; for (const [px, py] of [[-20, -36], [6, -50], [24, -34]]) { ell(c, px, py, 5, 4); c.fill(); }
        c.fillStyle = g; ell(c, 0, 8, 32, 26); c.fill(); c.stroke();
        c.fillStyle = col.body; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 38, 4, 10, 8, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(sx * 44, -2); c.lineTo(sx * 50, -8); c.stroke(); }
      } else if (kind === "bostezo") { c.beginPath(); for (const [px, py, r] of [[-26, 8, 18], [-14, -18, 20], [10, -22, 20], [28, -2, 18], [24, 22, 16], [0, 24, 22], [-24, 26, 14]]) { c.moveTo(px + r, py); c.arc(px, py, r, 0, 7); } c.stroke(); c.fill(); }
      else if (kind === "brotin" || kind === "fuellito" || kind === "remolin") { ell(c, 0, 0, 38, kind === "brotin" ? 40 : 36); c.fill(); c.stroke(); c.fillStyle = col.belly; ell(c, 0, 14, 22, 18); c.fill(); }
      if (kind !== "bostezo" && kind !== "yunqueron" && kind !== "trinilla") { c.fillStyle = col.body; c.lineWidth = 2.5; for (const fx of [-16, 16]) { ell(c, fx, 36, 10, 6); c.fill(); c.stroke(); } }
      // features
      if (kind === "brotin") {
        c.fillStyle = "#7a5228"; c.beginPath(); c.moveTo(-36, -14); c.quadraticCurveTo(0, -52, 36, -14); c.quadraticCurveTo(0, -30, -36, -14); c.fill();
        c.fillStyle = "#6aa84f"; c.strokeStyle = "#3e6e2c"; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -38); c.quadraticCurveTo(-6, -58, -18, -60); c.quadraticCurveTo(-6, -46, 0, -38); c.fill(); c.stroke();
      } else if (kind === "fuellito") {
        const fl = Math.sin(o.t * 9) * 3;
        c.save(); c.shadowColor = "#ffb347"; c.shadowBlur = 12; c.fillStyle = "#ffb347"; c.beginPath(); c.moveTo(30, 10); c.quadraticCurveTo(60, 0 + fl, 52, -26 + fl); c.quadraticCurveTo(48, -6, 34, -2); c.fill(); c.fillStyle = "#ffe27a"; c.beginPath(); c.moveTo(34, 6); c.quadraticCurveTo(50, 0, 48, -14 + fl); c.quadraticCurveTo(42, -2, 34, 0); c.fill(); c.restore();
        c.strokeStyle = col.line; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-14, 6 + i * 7); c.lineTo(14, 6 + i * 7); c.stroke(); }
      } else if (kind === "remolin") {
        c.fillStyle = col.body; c.strokeStyle = col.line; c.lineWidth = 2.5; for (const s of [-1, 1]) { ell(c, s * 26, -30, 8, 8); c.fill(); c.stroke(); }
        c.strokeStyle = col.line; c.lineWidth = 3; c.beginPath(); c.arc(42, 18, 10, Math.PI * 0.6, Math.PI * 2.1); c.stroke();
      } else if (kind === "bostezo") {
        c.fillStyle = "#cbbbe0"; c.strokeStyle = col.line; c.lineWidth = 2; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 40, -10, 16, 9, s * 0.5, 0, 7); c.fill(); c.stroke(); }
        c.strokeStyle = col.line; c.lineWidth = 2; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 8, -38); c.quadraticCurveTo(s * 14, -54, s * 22, -54); c.stroke(); }
      }
      // face
      const ey = -6;
      c.fillStyle = "#2a2230"; c.strokeStyle = "#2a2230"; c.lineWidth = 2.6; c.lineCap = "round";
      for (const s of [-1, 1]) {
        const ex = s * 13;
        if (o.ko || (kind === "bostezo" && Math.sin(o.t * 0.7) > 0.6)) { c.beginPath(); c.arc(ex, ey, 5, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
        else { ell(c, ex, ey, 5, 6); c.fill(); c.fillStyle = "#fff"; ell(c, ex - 1.6, ey - 2.2, 1.8, 1.8); c.fill(); c.fillStyle = "#2a2230"; }
      }
      c.fillStyle = col.cheek; c.globalAlpha = 0.7; for (const s of [-1, 1]) { ell(c, s * 23, ey + 8, 5.5, 3.2); c.fill(); } c.globalAlpha = 1;
      c.beginPath(); if (o.hp < 0.35) c.arc(0, ey + 18, 5, 1.15 * Math.PI, 1.85 * Math.PI); else c.arc(0, ey + 9, 6, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    }
    c.restore();
  }
  if (o.hollow) {
    // the Black Sap: dark drips and a dim violet haze
    // drops fall upward, in steps (choppy on purpose), with one oily glint each
    c.save(); c.globalAlpha = 0.28; c.fillStyle = SAP.c2; ell(c, 0, 0, 42, 42); c.fill(); c.restore();
    const tq = Math.floor(o.t * 6) / 6;
    for (let i = 0; i < 3; i++) { const dy = (tq * 18 + i * 17) % 30; c.globalAlpha = 1 - dy / 30; c.fillStyle = SAP.c1; EV.ell(c, -18 + i * 18, 30 - dy, 3, 5); c.fill(); c.fillStyle = SAP.sheen; c.fillRect(-19 + i * 18, 27 - dy, 2, 2); }
    c.globalAlpha = 1;
  }
}
function monName(kind, hollow) {
  if (MONS[kind] && MONS[kind].boss) return tx("boss." + kind);
  const n = MON_NAMES[kind];
  return hollow ? tx("foe.hollow", { name: n }) : n;
}
