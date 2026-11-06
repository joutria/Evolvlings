#!/usr/bin/env node
/* Evolvlings economy estimate (design rule 8: watch content pacing and Chispas inflation).
   Reads the real numbers from the game files, so the estimate follows every change to prices and rewards,
   and prints how many Chispas a typical day brings in and takes out for a new, a mid and an advanced player,
   plus how long the big sinks (builds) take. The play habits per profile are assumptions, listed in PROFILES.
   Run: node tools/economy.js   (--release: as if FAST were off; --json for machine output). It warns but never fails. */
"use strict";
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const num = (src, re, def) => { const m = src.match(re); return m ? +m[1] : def; };
const warns = [];

/* ---------- numbers taken from the game ---------- */
const idx = read("index.html"), daily = read("daily.js"), build = read("build.js");
const core = read("rpg/ui-core.js"), battle = read("rpg/ui-battle.js"), hooks = read("rpg/ui-hooks.js");
// --release estimates the game with FAST off (the real build and job times)
const FAST = /const FAST = true/.test(build) && !process.argv.includes("--release");
if (FAST) warns.push("build.js has FAST = true: builds take 15 min to 4 h and Refuge jobs run 6× faster. Turn it off before release.");
// passive: 1 Chispa per 10 game minutes while care > 60 (index.html); measured cap per absence ≈ 120 (stats decay below 60)
const PASSIVE_PER_MIN = /coinAcc \+= dt \/ (\d+)/.test(idx) ? 1 / num(idx, /coinAcc \+= dt \/ (\d+)/) : 0.1;
const PASSIVE_ABSENCE_CAP = 120;
// daily tasks: 4 a day, average reward of the ones open to each profile
const dailyR = [...daily.matchAll(/^\s+(\w+):\s+\{ cat: "(\w+)",.*?r: (\d+)(, need: (\w+))?/gm)].map((m) => ({ id: m[1], cat: m[2], r: +m[3], exp: !!m[5] }));
const avgR = (list) => list.reduce((a, t) => a + t.r, 0) / Math.max(1, list.length);
const weekR = [...daily.matchAll(/^\s+\w+:\s+\{ c: "\w+",\s+n: \d+,\s+r: (\d+) \}/gm)].map((m) => +m[1]);
// calendar: coins on the days that are not food or Notes days
let calCoins = 0; for (let n = 1; n <= 28; n++) if (n % 28 && n % 7 && n % 3) calCoins += 30 + 10 * (n % 4);
const PANTRY_COST = num(daily, /PANTRY_COST = (\d+)/, 20), EX_COST = num(daily, /EX_COST = (\d+)/, 160);
const ORDER_C = [...build.matchAll(/^\s+\w+: \{ asks: .*?c: (\d+)/gm)].map((m) => +m[1]);
const COST = [...build.matchAll(/(\d): \{ c: (\d+), w: \d+, h: (\d+), fh: ([\d.]+) \}/g)].map((m) => ({ lv: +m[1], c: +m[2], h: +m[3], fh: +m[4] }));
const N_PLACES = ((build.match(/const PLACES = \[(.*?)\]/) || ["", ""])[1].match(/"\w+"/g) || []).length || 8;
const JOB_COINS = num(build, /pantry: \{ fit: \[.*?\], per: \{ coins: (\d+) \}/, 6);
const PACK = { price: num(core, /PACK = \{ price: (\d+)/, 60), perDay: num(core, /perDay: (\d+) \}/, 3) };
const RECHARGE = num(hooks, /RECHARGE = \{ amount: \d+, price: (\d+)/, 12);
const TRADE_C = num(build, /TRADE = \{ c: (\d+)/, 0);
const BOSS = num(battle, /boss \? (\d+) : 3/, 30);
const SECTIONS = 4;
const FOOD = Object.fromEntries([...idx.matchAll(/^\s+(\w+): \{ cat: "(food|med)", price: (\d+)/gm)].map((m) => [m[1], +m[3]]));
const shopAvg = (() => { const v = Object.values(FOOD).filter((p) => p > 0); return v.reduce((a, b) => a + b, 0) / Math.max(1, v.length); })();

/* ---------- what each profile does on a typical day (assumptions) ---------- */
const PROFILES = {
  new: { label: "nuevo (día 1-7)", absences: 2, care: 0.7, tasksExp: false, tasks: 3, week: 2, orders: 1, trips: 2, fights: 3, events: 1, jobs: 0, jobH: 0, buys: 3, pulls: 0, packs: 0, recharges: 0, trades: 0 },
  mid: { label: "medio (semana 2-4)", absences: 2, care: 1, tasksExp: true, tasks: 4, week: 4, orders: 2, trips: 3, fights: 3, events: 1, jobs: 2, jobH: 8, buys: 3, pulls: 1, packs: 1, recharges: 1, trades: 1 },
  adv: { label: "avanzado (mes 2+)", absences: 2, care: 1, tasksExp: true, tasks: 4, week: 6, orders: 2, trips: 4, fights: 3, events: 1, jobs: 3, jobH: 8, buys: 2, pulls: 2, packs: 3, recharges: 1, trades: 3 },
};
function day(p) {
  const fightC = 3 + 1.5 + 2; // 3 + random 0..3 + about 2 foes
  const eventC = 6; // conversations and short events average a few Chispas, some cost some
  const jobsPerDay = FAST ? Math.min(6, Math.floor(16 / (p.jobH / 6 || 1))) : 1; // jobs a player can restart while awake
  const jobC = jobsPerDay * Math.round(JOB_COINS * p.jobH * 1.2); // one companion on the pantry job, fit + level bonus ≈ ×1.2
  const inc = {
    pasivo: Math.round(p.absences * PASSIVE_ABSENCE_CAP * p.care),
    tareas: Math.round(p.tasks * avgR(dailyR.filter((t) => p.tasksExp || !t.exp))),
    semana: Math.round((p.week * (weekR[0] || 40)) / 7),
    calendario: Math.round(calCoins / 28),
    encargos: Math.round(p.orders * avgR(ORDER_C.map((r) => ({ r })))),
    expediciones: Math.round(p.trips * ((SECTIONS - 1) * fightC * (p.fights / 3) + BOSS + p.events * eventC)),
    trabajos: p.jobs ? Math.round(jobC) : 0,
  };
  const out = {
    tienda: Math.round(p.buys * shopAvg),
    despensa: p.pulls * PANTRY_COST,
    sobres: p.packs * PACK.price,
    recargas: p.recharges * RECHARGE,
    taller: p.trades * TRADE_C,
  };
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  return { inc, out, in: sum(inc), spend: sum(out), net: sum(inc) - sum(out) };
}
const totalBuild = N_PLACES * COST.reduce((a, c) => a + c.c, 0);
const totalWood = N_PLACES * COST.reduce((a, c) => a + num(build, new RegExp(c.lv + ": \\{ c: " + c.c + ", w: (\\d+)"), 0), 0);
const buildHours = N_PLACES * COST.reduce((a, c) => a + (FAST ? c.fh : c.h), 0);
// wood: the garden (middle level), a won trip (base + a coin flip), neighbour pay 1-3, the garden job 0.4 an hour
const GARDEN_W = [...build.matchAll(/\{ f: \d+, cap: \d+, w: ([\d.]+),/g)].map((m) => +m[1]);
const TRIP_W = num(build, /res === "win" \? (\d+) \+/, 2) + 0.5;
const woodDay = (p) => (GARDEN_W[2] || 1.5) + p.trips * TRIP_W + p.orders * 2 + (p.jobs ? (FAST ? Math.min(6, Math.floor(16 / (p.jobH / 6))) : 1) * Math.round(0.4 * p.jobH * 1.2) : 0);
const result = { FAST, places: N_PLACES, totalBuild, totalWood, buildHours, exchange: EX_COST, profiles: {} };
for (const [k, p] of Object.entries(PROFILES)) {
  const d = day(p);
  const w = woodDay(p);
  result.profiles[k] = Object.assign({ label: p.label, daysToBuildAll: d.net > 0 ? Math.round(totalBuild / d.net) : null, woodDay: Math.round(w), daysForWood: Math.round(totalWood / w) }, d);
}
// pacing checks
const mid = result.profiles.mid, adv = result.profiles.adv;
if (mid.daysToBuildAll !== null && mid.daysToBuildAll < 14) warns.push(`A mid player could afford every build in ${mid.daysToBuildAll} days: the builds may run out before the content does.`);
if (adv.net > 3 * PACK.price * PACK.perDay) warns.push(`An advanced player keeps ${adv.net} Chispas a day after buying every pack: Chispas pile up with nothing to spend them on.`);
if (mid.inc.pasivo > 0.45 * mid.in) warns.push(`Passive income is ${Math.round((100 * mid.inc.pasivo) / mid.in)} % of a mid player's day: opening the game matters more than playing it.`);
const gate = Math.max(mid.daysForWood, Math.ceil(buildHours / 16));
if (mid.daysForWood > 2 * mid.daysToBuildAll) warns.push(`Wood, not Chispas, sets the build pace: a mid player needs ${mid.daysForWood} days of wood (${gate} with the build times) but only ${mid.daysToBuildAll} days of Chispas, so Chispas pile up meanwhile.`);
result.warnings = warns;

if (process.argv.includes("--json")) { console.log(JSON.stringify(result, null, 2)); process.exit(0); }
const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
console.log(`Evolvlings: Chispas por día (estimación)  FAST=${FAST}  lugares=${N_PLACES}  obras: ✦ ${totalBuild}, 🪵 ${totalWood}, ${buildHours} h de obra`);
const keys = Object.keys(PROFILES), rows = [...Object.keys(mid.inc).map((k) => ["+ " + k, "inc", k]), ...Object.keys(mid.out).map((k) => ["- " + k, "out", k])];
console.log(pad("", 16) + keys.map((k) => lpad(k, 9)).join(""));
for (const [label, side, k] of rows) console.log(pad(label, 16) + keys.map((p) => lpad(result.profiles[p][side][k], 9)).join(""));
for (const [label, k] of [["= entra", "in"], ["= sale", "spend"], ["= neto", "net"], ["días ✦ obras", "daysToBuildAll"], ["🪵 por día", "woodDay"], ["días 🪵 obras", "daysForWood"]]) console.log(pad(label, 16) + keys.map((p) => lpad(result.profiles[p][k] == null ? "-" : result.profiles[p][k], 9)).join(""));
for (const w of warns) console.log("! " + w);
