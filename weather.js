/* Evolvlings: gentle weather in the Glade and El Vado (3/4 home plan, idea 7).
   The weather changes every 6 hours, chosen the same way on every device from the date (no randomness to save).
   It follows the time of year: snow only in winter, more rain in spring and autumn, mostly clear in summer.
   It only ever helps (design rule 2): rain makes the garden grow faster, fog makes your creature tire more slowly,
   snow makes it get bored more slowly. Clear days change nothing. Loaded before world.js, which draws it. */
(function (root) {
"use strict";
const EV = root.EV;
if (!EV) return;

const TX = {
  es: { clear: "Despejado", rain: "Lluvia", fog: "Niebla", snow: "Nieve",
    "fx.rain": "el huerto crece un 25 % más rápido", "fx.fog": "tu criatura se cansa un 15 % más despacio", "fx.snow": "tu criatura se aburre un 20 % más despacio"  },
  en: { clear: "Clear", rain: "Rain", fog: "Fog", snow: "Snow",
    "fx.rain": "the garden grows 25% faster", "fx.fog": "your creature tires 15% more slowly", "fx.snow": "your creature gets bored 20% more slowly"  },
};
const tx = (k) => (TX[EV.LANG] || TX.en)[k] || TX.en[k] || k;
const ICON = { clear: "☀️", rain: "🌧️", fog: "🌫️", snow: "❄️" };
// what each weather multiplies (only ever in the player's favour)
const MUL = { rain: { garden: 1.25 }, fog: { energy: 0.85 }, snow: { fun: 0.8 } };
// chances by season (months 0-11, northern calendar): [clear, rain, fog, snow]
const ODDS = (m) => (m === 11 || m <= 1 ? [40, 15, 15, 30] : m <= 4 ? [55, 30, 15, 0] : m <= 7 ? [80, 15, 5, 0] : [45, 30, 25, 0]);
const KINDS = ["clear", "rain", "fog", "snow"];
const SLOT_H = 6;
function hash(n) { let h = 2166136261 ^ n; h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function at(d) {
  d = d || new Date();
  const slot = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5) * 4 + Math.floor(d.getHours() / SLOT_H);
  const odds = ODDS(d.getMonth()), r = hash(slot) * 100;
  let acc = 0;
  for (let i = 0; i < KINDS.length; i++) { acc += odds[i]; if (r < acc) return KINDS[i]; }
  return "clear";
}
let forced = null; // for tests: EV.WEATHER.force("rain")
const now = () => forced || at();
const mul = (k) => ((MUL[now()] || {})[k] || 1);
const label = (w) => { w = w || now(); return `${ICON[w]} ${tx(w)}${MUL[w] ? " · " + tx("fx." + w) : ""}`; };

/* ---------- Drawing over the low-res map (W×H pixels), stateless: positions come from the clock ---------- */
function draw(g, t, W, H) {
  const w = now();
  if (w === "clear") return;
  g.save();
  if (w === "rain") {
    g.fillStyle = "rgba(40,60,110,.16)"; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(190,215,255,.75)";
    for (let i = 0; i < 46; i++) {
      const sp = 0.09 + (i % 5) * 0.012, x = (i * 53.7 + t * sp * 0.35) % (W + 20) - 10, y = (i * 31.3 + t * sp) % (H + 10) - 5;
      g.fillRect(Math.round(W - x), Math.round(y), 1, 3);
    }
  } else if (w === "snow") {
    g.fillStyle = "rgba(230,240,255,.10)"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 38; i++) {
      const sp = 0.010 + (i % 4) * 0.004, y = (i * 29.1 + t * sp) % (H + 6) - 3, x = (i * 47.9 + Math.sin(t / 900 + i) * 4 + W) % W;
      g.fillStyle = i % 3 ? "#ffffff" : "#dfe8ff"; g.fillRect(Math.round(x), Math.round(y), i % 5 ? 1 : 2, i % 5 ? 1 : 2);
    }
  } else if (w === "fog") {
    g.fillStyle = "rgba(235,235,245,.20)"; g.fillRect(0, 0, W, H);
    for (let b = 0; b < 3; b++) {
      const y = 18 + b * 42, x = ((t * (0.004 + b * 0.002)) % (W * 2)) - W;
      g.fillStyle = "rgba(245,245,252,.22)";
      for (let k = 0; k < 3; k++) g.fillRect(Math.round(x + k * W * 0.7), y + (k % 2) * 6, Math.round(W * 0.55), 14);
    }
  }
  g.restore();
}

// the first time the Glade is not clear, the Guide explains the weather (design rule 6)
function maybeTip() { if (now() !== "clear" && EV.GUIDE && EV.GUIDE.showTip) EV.GUIDE.showTip("weather"); }
EV.WEATHER = { at, now, mul, label, draw, icon: (w) => ICON[w || now()], name: (w) => tx(w || now()), TX, ODDS, MUL, maybeTip, force: (w) => { forced = w || null; if (EV.WORLD && EV.WORLD.stageBits) EV.WORLD.stageBits(); } };
})(window);
