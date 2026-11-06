/* Evolvlings RPG: the battle engine (units and Battle). No DOM, so tools/check.js runs it in Node.
   Part of the old rpg.js, now split. Classic scripts: top-level names are shared between the rpg/*.js files,
   which load in order (see index.html). */
"use strict";

/* Build a battle unit.
   o: { kind, lvl, side, name, own, wild, hollow, care: {full,fun,energy,clean,health}, stage, form, cards: {a,p,s} (scaled), hpPct, boss } */
function makeUnit(o) {
  const m = MONS[o.kind];
  const sc = lvlScale(o.lvl);
  // care only adds: 0 to +25 % (Jose's design rule: looking after your creature is a bonus, never a penalty)
  const careF = (k) => (o.care ? 1 + 0.25 * (o.care[k] || 0) / 100 : 1);
  const stageF = o.stage === 2 ? (o.form === "bright" ? 1.15 : 1.1) : 1;
  const hollowF = o.hollow ? 0.8 : 1;
  const bondF = (1 + 0.015 * (o.bond || 0)) * (1 + 0.04 * (o.star || 0)); // Refuge companions: +1.5 % per Bond level, +4 % per star
  // the Song's Fork talents (data-talents.js): each adds a few % to a stat, or points of crit / dodge
  const tal = { hp: 0, str: 0, def: 0, spd: 0, crit: 0, dodge: 0 };
  for (const t of o.tal || []) for (const k in tal) tal[k] += t[k] || 0;
  const talF = (k) => 1 + tal[k] / 100;
  const base = {
    hp: m.st.hp * 3 * sc * careF("health") * stageF * hollowF * bondF * talF("hp"),
    str: m.st.str * sc * careF("full") * stageF * hollowF * bondF * talF("str"),
    def: m.st.def * sc * careF("clean") * stageF * hollowF * bondF * talF("def"),
    spd: m.st.spd * sc * careF("energy") * stageF * bondF * talF("spd"),
    cr: m.st.cr * careF("fun"),
  };
  const types = m.types.slice();
  if (o.stage === 2 && m.adult && o.form && m.adult[o.form]) types.push(m.adult[o.form]);
  const pm = (o.cards && o.cards.p && o.cards.p.p) || {};
  const maxHp = Math.round(base.hp * (1 + (pm.hp || 0) / 100));
  const u = {
    uid: Math.random().toString(36).slice(2, 9), kind: o.kind, name: o.name, side: o.side, own: !!o.own, wild: !!o.wild, hollow: !!o.hollow, boss: !!o.boss,
    lvl: o.lvl, types, stage: o.stage == null ? 1 : o.stage, form: o.form || "bright",
    base, maxHp, hp: Math.max(1, Math.round(maxHp * (o.hpPct == null ? 1 : o.hpPct))),
    crit: Math.min(40, base.cr / 4) + (o.bond || 0) + ((o.star || 0) >= 2 ? 5 : 0) + (pm.crit || 0) + (o.lowFun && pm.lowFun ? pm.lowFun : 0) + tal.crit,
    dodge: Math.max(0, base.spd / 20 + (pm.dodge || 0) + ((o.star || 0) >= 4 ? 6 : 0) + tal.dodge),
    mods: pm, cards: o.cards || {}, cd: 0, st: {}, shield: 0, shieldT: 0, hitOnce: false, skip: 0, sUsed: false, sCount: 0, hitsTaken: 0,
  };
  if (u.cards.a) u.cd = Math.ceil(u.cards.a.a.cd / 2);
  if (Number.isInteger(o.pos) && o.pos >= 0 && o.pos < CELLS) u.pos = o.pos;
  if (o.hpPct === 0) { u.hp = 0; }
  return u;
}

/* ---------- Formation ----------
   Each side has 6 cells: 3 lanes (0 top, 1 middle, 2 bottom) by 2 rows (front, back). cell = row * 3 + lane.
   - The front row takes the basic attacks first, and its basic attacks hit +10 %.
   - A back-row unit can't be reached by basic attacks while an ally stands in front of it in its lane;
     its heals and shields give +10 %. Cards reach any cell. */
const CELLS = 6;
const cellRow = (c) => (c >= 3 ? 1 : 0), cellLane = (c) => c % 3;
const FRONT_PREF = [1, 0, 2], BACK_PREF = [4, 3, 5];
// a creature whose active card only heals or shields would rather stand at the back
const isSupportUnit = (u) => { const a = u.cards && u.cards.a && u.cards.a.a; return !!(a && !a.pow && (a.heal || a.shield || a.cleanse)); };
// gives a cell to every unit of the list without one: the sturdiest in front, the carers and the frailest behind it
function autoForm(units) {
  const used = new Set(units.filter((u) => u.pos != null).map((u) => u.pos));
  const free = units.filter((u) => u.pos == null);
  if (!free.length) return units;
  const tank = (u) => u.maxHp * u.base.def;
  const order = free.slice().sort((a, b) => tank(b) - tank(a));
  const take = (pref) => { const c = pref.concat(FRONT_PREF, BACK_PREF).find((x) => !used.has(x)); used.add(c); return c; };
  const n = units.length;
  order.forEach((u, i) => {
    const back = n > 1 && (isSupportUnit(u) || (i === order.length - 1 && i > 0 && used.has(1)));
    u.pos = take(back ? BACK_PREF : FRONT_PREF);
  });
  return units;
}

/* ---------- Card shapes: where an active card lands when you aim it ----------
   one: the unit you pick · lane: Front and Back of a lane · row: the 3 cells of a row · cross: a cell and its neighbours
   ally: the ally you pick · null: no aiming (self, all allies, random...).
   Cards that hit every foe now hit a zone with +15 % power (ZONE_POW); a card can set its own with a.area. */
const FOE_ONE = ["foe", "fastestFoe", "strongFoe", "fireFoe", "randFoe"];
const ALLY_ONE = ["ally", "lowAlly", "lowDefAlly", "slowAlly", "allyOther", "fireAlly", "lowOther", "debuffedAlly"];
const ZONE_POW = 1.15;
function cardShape(a) {
  if (!a || a.echoLast) return null;
  if (a.area) return a.area;
  if (a.tgt === "foes") return a.pow ? "lane" : "row";
  if (FOE_ONE.includes(a.tgt)) return a.splash ? "cross" : "one";
  if (ALLY_ONE.includes(a.tgt)) return "ally";
  return null;
}
// the cells a shape covers around cell c (on the target's side)
function shapeCells(shape, c) {
  const lane = cellLane(c), row = cellRow(c);
  if (shape === "lane") return [lane, lane + 3];
  if (shape === "row") return [row * 3, row * 3 + 1, row * 3 + 2];
  if (shape === "cross") return [c, row * 3 + lane - 1, row * 3 + lane + 1, (1 - row) * 3 + lane].filter((x, i) => i === 0 || i === 3 || (x >= row * 3 && x < row * 3 + 3 && Math.abs(cellLane(x) - lane) === 1));
  return [c];
}

/* ====================================================================== */
/* Battle engine                                                          */
/* ====================================================================== */
function Battle(allies, foes, opt) {
  opt = opt || {};
  this.units = allies.concat(foes);
  autoForm(allies); autoForm(foes);
  this.round = 0;
  this.rnd = opt.rnd || Math.random;
  this.day = opt.day != null ? opt.day : isDayNow();
  this.zone = opt.zone || null;
  this.events = [];          // presentation queue: {k:'act'|'dmg'|'heal'|'miss'|'st'|'log'|'ko'|'shield'|'cleanse', ...}
  this.side = { ally: { lastType: null, spark: 0, breakNext: false, cloud: 0, vessel: 0, vesselV: 0 }, foe: { lastType: null, spark: 0, breakNext: false, cloud: 0, vessel: 0, vesselV: 0 } };
  for (const u of this.units) if (u.mods.sight) this.side[u.side].sight = Math.max(this.side[u.side].sight || 0, u.mods.sight);
  for (const u of this.units) {
    const s = u.cards.s;
    if (!s) continue;
    if (s.s.on === "allyLethal") this.side[u.side].cloud += 1;
    if (s.s.on === "allyHitAdv") { this.side[u.side].vessel += s.s.n; this.side[u.side].vesselV = Math.max(this.side[u.side].vesselV, s.s.v); }
  }
  this.over = null;
}
const B = Battle.prototype;
B.alive = function (side) { return this.units.filter((u) => u.side === side && u.hp > 0); };
// can basic attacks reach this unit? (front row, or nobody standing in front of it in its lane)
B.exposed = function (u) {
  if (u.pos == null || cellRow(u.pos) === 0) return true;
  return !this.alive(u.side).some((x) => x.pos === u.pos - 3);
};
B.other = (side) => (side === "ally" ? "foe" : "ally");
B.emit = function (e) { this.events.push(e); };
B.stVal = function (u, name) { const s = u.st[name]; return s ? s.v : 0; };
B.eff = function (u, k) {
  let pct = (u.mods[k] || 0);
  if (k === "spd") pct += this.stVal(u, "haste") - this.stVal(u, "slow") + this.stVal(u, "might");
  if (k === "def") {
    pct += this.stVal(u, "guard") + this.stVal(u, "might");
    if (u.mods.defRound) pct += Math.min(15 * (u.mods.defRound / 3), u.mods.defRound * this.round);
    if (u.mods.oath && this.oathOn(u)) pct += u.mods.oath;
    if (u.mods.nightAll) pct += this.day ? -Math.round(u.mods.nightAll / 2) : u.mods.nightAll;
    if (u.mods.stoneDef) pct += u.mods.stoneDef * this.alive(u.side).filter((x) => x.types.includes("stone")).length;
  }
  if (k === "str") pct += this.stVal(u, "might");
  return Math.max(1, u.base[k] * (1 + pct / 100));
};
// Juramento Susurrado: active while the first ally of the list is standing
B.oathOn = function (u) { const first = this.units.find((x) => x.side === u.side); return !!(first && first.hp > 0); };
B.dodgeOf = function (u, attacker) {
  if (u.st.exposed) return 0;
  let d = u.dodge + this.stVal(u, "evade");
  if (u.mods.shade && u.hp / u.maxHp > 0.5) d += u.mods.shade;
  if (attacker) d -= this.side[attacker.side].sight || 0;
  return Math.max(0, Math.min(40, d));
};
B.typeOf = function (u, card) {
  let ty = card ? card.type : u.types[0];
  if (ty === "star") ty = this.side[u.side].lastType || u.types[0];
  return ty;
};
B.addStatus = function (src, tgt, st, cardType) {
  if (!st || tgt.hp <= 0) return false;
  let [name, turns, chance, val] = st;
  if (this.rnd() > chance) return false;
  if (tgt.mods.immune === name) { this.emit({ k: "resist", u: tgt.uid }); return false; }
  if (name === "blind") for (const w of this.alive(tgt.side)) if (w.mods.teamBlindShort) { turns -= w.mods.teamBlindShort; break; }
  if (STATUS[name].neg) {
    // winning type: statuses last +1 turn
    if (cardType && tgt.types.some((d) => BEATS[cardType] === d)) turns += 1;
    // card vs card: if the target's passive card type beats the incoming type, the effect is halved
    const pc = tgt.cards.p;
    if (cardType && pc && BEATS[pc.type] === cardType) turns = Math.floor(turns / 2);
    if (tgt.mods.stShort) turns -= tgt.mods.stShort;
    if (turns <= 0) { this.emit({ k: "resist", u: tgt.uid }); return false; }
  }
  if (!STATUS[name].neg && src && src.mods.buffLong && turns < 99) turns += src.mods.buffLong;
  const cur = tgt.st[name];
  tgt.st[name] = { t: Math.max(cur ? cur.t : 0, turns), v: Math.max(cur ? cur.v : 0, val != null ? val : STATUS[name].v) };
  this.emit({ k: "st", u: tgt.uid, st: name });
  if (STATUS[name].neg) this.trigger("allyStatus", tgt, { status: name });
  return true;
};
B.cleanse = function (u, what) {
  const negs = Object.keys(u.st).filter((k) => STATUS[k].neg);
  let rm = [];
  if (what === "one" || what === "longest") { negs.sort((a, b) => u.st[b].t - u.st[a].t); rm = negs.slice(0, 1); }
  else if (what === "all") rm = negs;
  else if (u.st[what]) rm = [what];
  for (const k of rm) delete u.st[k];
  if (rm.length) this.emit({ k: "cleanse", u: u.uid, st: rm });
  return rm.length;
};
B.addShield = function (src, tgt, pct, turns) {
  const amt = Math.round(tgt.maxHp * pct / 100 * (src && src.pos != null && cellRow(src.pos) === 1 ? 1.1 : 1));
  tgt.shield = Math.max(tgt.shield, amt);
  tgt.shieldT = Math.max(tgt.shieldT, turns + (src.mods.shieldLong || 0));
  this.emit({ k: "shield", u: tgt.uid, n: amt });
  const foeSide = this.side[this.other(tgt.side)];
  for (const w of this.alive(this.other(tgt.side))) if (w.cards.s && w.cards.s.s.on === "foeShield" && !w.sUsed) { w.sUsed = true; foeSide.breakNext = true; this.emit({ k: "support", u: w.uid, card: w.cards.s.id }); }
};
B.heal = function (src, tgt, pct) {
  if (tgt.hp <= 0) return 0;
  let amt = tgt.maxHp * pct / 100;
  amt *= 1 + ((src && src.mods.healGive) || 0) / 100 + (tgt.mods.healRecv || 0) / 100 + (src && src !== tgt && src.pos != null && cellRow(src.pos) === 1 ? 0.1 : 0);
  amt = Math.round(amt);
  const before = tgt.hp; tgt.hp = Math.min(tgt.maxHp, tgt.hp + amt);
  const got = tgt.hp - before;
  if (got > 0) this.emit({ k: "heal", u: tgt.uid, n: got });
  return got;
};

// one hit of damage. Returns damage dealt (0 = miss).
B.hit = function (src, tgt, pow, card, extra) {
  extra = extra || {};
  if (tgt.hp <= 0) return 0;
  const ty = this.typeOf(src, card);
  // blinded: 50% to miss; dodge
  if (src.st.blind && this.rnd() < src.st.blind.v / 100) { this.emit({ k: "miss", u: tgt.uid, by: src.uid, blind: true }); return 0; }
  const tsd = this.side[tgt.side];
  if (tsd.foresight > 0) { tsd.foresight--; this.emit({ k: "miss", u: tgt.uid, by: src.uid }); return 0; }
  if (!extra.trueHit && this.rnd() * 100 < this.dodgeOf(tgt, src)) { this.emit({ k: "miss", u: tgt.uid, by: src.uid }); return 0; }
  let d = this.eff(src, "str") * pow / 100;
  let tm = 1; for (const dt of tgt.types) tm *= typeMult(ty, dt);
  d *= tm;
  if (card && src.types.includes(card.type)) d *= 1.15;               // resonance
  if (TYPES[ty] && TYPES[ty].day != null && TYPES[ty].day === this.day && !this.side[src.side].noClock) d *= 1.1; // clock of the glade
  if (this.zone && this.zone.bonus && this.zone.bonus[ty]) d *= 1 + this.zone.bonus[ty] / 100;
  let pct = (src.mods.dmg || 0) + this.stVal(src, "fury") + this.stVal(src, "cheer");
  if (!src.hitOnce && src.mods.firstHit) pct += src.mods.firstHit;
  if (tgt.shield > 0 && src.mods.vsShield) pct += src.mods.vsShield;
  if (src.mods.vsHigher && tgt.hp > src.hp) pct += src.mods.vsHigher;
  if (src.mods.rage && src.rage) pct += src.mods.rage * src.rage;
  if (src.st.charge) { pct += src.st.charge.v; delete src.st.charge; }
  if (src.mods.vsBlind && tgt.st.blind) pct += src.mods.vsBlind;
  if (src.mods.oath && this.oathOn(src)) pct += src.mods.oath;
  if (src.mods.nightAll) pct += this.day ? -Math.round(src.mods.nightAll / 2) : src.mods.nightAll;
  if (src.mods.shade && src.hp / src.maxHp <= 0.5) pct += src.mods.shade;
  if (src.mods.desperate && this.alive(src.side).some((x) => x.hp / x.maxHp < 0.3)) pct += src.mods.desperate;
  if (src.mods.perFallen) pct += src.mods.perFallen * this.units.filter((x) => x.side === src.side && x.hp <= 0).length;
  if (src.mods.perFoeFallen) pct += src.mods.perFoeFallen * this.units.filter((x) => x.side !== src.side && x.hp <= 0).length;
  if (src.mods.vsHeld && (tgt.st.stun || tgt.st.slow || tgt.st.trap)) pct += src.mods.vsHeld;
  if (src.mods.perDebuff) pct += src.mods.perDebuff * Object.keys(tgt.st).filter((k) => STATUS[k].neg).length;
  if (tgt.st.marked) pct += tgt.st.marked.v;
  if (tgt.mods.frail) pct += Math.abs(tgt.mods.frail);
  const side = this.side[src.side];
  if (side.spark) { pct += side.spark; side.spark = 0; }
  d *= 1 + pct / 100;
  if (src.st.soak && ty === "fire") d *= 1 - src.st.soak.v / 100;
  let crit = false;
  const cc = src.crit + (src.st.cheer ? 10 : 0) - this.stVal(src, "dull") + this.alive(src.side).reduce((a, x) => a + (x.mods.teamCrit || 0), 0);
  if (this.rnd() * 100 < cc) { crit = true; if (!tgt.mods.critImmune) d *= 1.5; }
  let dv = this.eff(tgt, "def");
  if (TYPES[ty] && TYPES[ty].day === false && tgt.mods.defNight) dv *= 1 + tgt.mods.defNight / 100;
  if (TYPES[ty] && TYPES[ty].day === true && tgt.mods.defDay) dv *= 1 + tgt.mods.defDay / 100;
  d *= 60 / (60 + dv);
  if (ty === "water" && tgt.mods.weakWater) d *= 1 - tgt.mods.weakWater / 100;
  d *= 0.92 + this.rnd() * 0.16;
  if (tm > 1) {
    if (tgt.mods.resistAdv) d *= 1 - tgt.mods.resistAdv / 100;
    const ts = this.side[tgt.side];
    if (ts.vessel > 0) { ts.vessel--; d *= 1 - ts.vesselV / 100; }
  }
  if (tgt.st.cushion) { d *= 1 - tgt.st.cushion.v / 100; delete tgt.st.cushion; }
  d = Math.max(1, Math.round(d));
  // break shield
  if ((extra.breakShield || side.breakNext) && tgt.shield > 0) { tgt.shield = 0; tgt.shieldT = 0; side.breakNext = false; this.emit({ k: "break", u: tgt.uid }); }
  // shield absorbs
  let absorbed = 0;
  if (tgt.shield > 0 && !extra.pierce) { absorbed = Math.min(tgt.shield, d); tgt.shield -= absorbed; if (tgt.shield <= 0) tgt.shieldT = 0; }
  let left = d - absorbed;
  const ts = this.side[tgt.side];
  if (left >= tgt.hp && ts.cloud > 0) { ts.cloud--; left = Math.round(left / 2); this.emit({ k: "save", u: tgt.uid }); }
  tgt.hp = Math.max(0, tgt.hp - left);
  src.hitOnce = true; tgt.hitsTaken++;
  this.emit({ k: "dmg", u: tgt.uid, by: src.uid, n: d, crit, eff: tm >= 1.5 ? "up" : tm > 1 ? "opp" : tm < 1 ? "down" : "", ty });
  if (crit && src.mods.critSpark) side.spark = src.mods.critSpark;
  if (crit) this.trigger("allyCrit", tgt, {});
  if (src.mods.onHit) this.addStatus(src, tgt, src.mods.onHit, card ? card.type : null);
  if (tgt.mods.onHitBy && tgt.hp > 0) this.addStatus(tgt, src, tgt.mods.onHitBy, null);
  if (tgt.mods.rage) tgt.rage = Math.min(5, (tgt.rage || 0) + 1);
  if (src.mods.echo && !extra.echoed && tgt.hp > 0 && this.rnd() * 100 < src.mods.echo) { this.emit({ k: "echo", u: src.uid }); this.hit(src, tgt, pow * 0.5, card, { echoed: true }); }
  if (src.mods.lifesteal && src.hp > 0 && left > 0) { const g = Math.round(left * src.mods.lifesteal / 100); const bf = src.hp; src.hp = Math.min(src.maxHp, src.hp + g); if (src.hp > bf) this.emit({ k: "heal", u: src.uid, n: src.hp - bf }); }
  if (tgt.mods.thorns && src.hp > 0 && left > 0 && !extra.thorns) {
    const r = Math.max(1, Math.round(left * tgt.mods.thorns / 100));
    src.hp = Math.max(0, src.hp - r); this.emit({ k: "dmg", u: src.uid, n: r, dot: "thorns" });
    if (src.hp <= 0) { src.st = {}; src.shield = 0; this.emit({ k: "ko", u: src.uid }); this.trigger("allyKO", src, { ko: src }); }
  }
  if (tgt.hp > 0 && left > tgt.maxHp * 0.25) this.trigger("allyBigHit", tgt, { attacker: src });
  if (extra.drain && src.hp > 0) { const g = Math.round(left * extra.drain / 100); const bf = src.hp; src.hp = Math.min(src.maxHp, src.hp + g); if (src.hp > bf) this.emit({ k: "heal", u: src.uid, n: src.hp - bf }); }
  if (tgt.hp <= 0) { tgt.st = {}; tgt.shield = 0; this.emit({ k: "ko", u: tgt.uid }); this.trigger("allyKO", tgt, { ko: tgt }); if (src.hp > 0) this.trigger("foeKO", src, {}); }
  else this.trigger("allyLow", tgt, {});
  return d;
};

// choose targets
B.targets = function (spec, src, ctx) {
  let foes = this.alive(this.other(src.side)).filter((u) => !u.st.hidden);
  const allies = this.alive(src.side);
  const taunt = foes.filter((u) => u.st.taunt);
  if (taunt.length && ["foe", "rand", "randFoe", "fastestFoe", "fireFoe"].includes(spec)) foes = taunt;
  // an aimed card (ctx.aim = a cell; ctx.shape from cardShape)
  const sh = ctx && ctx.shape;
  if (sh && ctx.aim != null) {
    if (sh === "ally") { const a = allies.find((u) => u.pos === ctx.aim); if (a) return [a]; }
    else if (sh === "one" || sh === "cross") { const f = foes.find((u) => u.pos === ctx.aim); if (f) return [f]; }
    else { const cs = shapeCells(sh, ctx.aim); return this.alive(this.other(src.side)).filter((u) => !u.st.hidden && cs.includes(u.pos)); }
  }
  const byHpPct = (a, b) => a.hp / a.maxHp - b.hp / b.maxHp;
  switch (spec) {
    case "foe": {
      if (!foes.length) return [];
      const ty = ctx && ctx.card ? this.typeOf(src, ctx.card) : this.typeOf(src, null);
      const score = (u) => u.types.reduce((m, d) => m * typeMult(ty, d), 1) * 10 - u.hp / u.maxHp;
      return [foes.slice().sort((a, b) => score(b) - score(a))[0]];
    }
    case "basic": {
      // basic attacks: only the exposed cells; the same lane first, then the best type
      const reach = foes.filter((u) => this.exposed(u)), l = reach.length ? reach : foes;
      if (!l.length) return [];
      const ty = this.typeOf(src, null), lane = src.pos == null ? -1 : cellLane(src.pos);
      const score = (u) => u.types.reduce((m, d) => m * typeMult(ty, d), 1) * 10 + (u.pos != null && cellLane(u.pos) === lane ? 3 : 0) - u.hp / u.maxHp;
      return [l.slice().sort((a, b) => score(b) - score(a))[0]];
    }
    case "foes": return foes;
    case "rand": case "randFoe": return foes.length ? [foes[Math.floor(this.rnd() * foes.length)]] : [];
    case "fastestFoe": return foes.length ? [foes.slice().sort((a, b) => this.eff(b, "spd") - this.eff(a, "spd"))[0]] : [];
    case "fireFoe": { const f = foes.filter((u) => u.types.includes("fire")); const l = f.length ? f : foes; return l.length ? [l.slice().sort((a, b) => this.eff(b, "str") - this.eff(a, "str"))[0]] : []; }
    case "self": return [src];
    case "ally": return allies.length ? [allies.slice().sort(byHpPct)[0]] : [];
    case "allyOther": { const o = allies.filter((u) => u !== src); const l = o.length ? o : allies; return [l.slice().sort((a, b) => this.eff(b, "str") - this.eff(a, "str"))[0]]; }
    case "lowAlly": return allies.length ? [allies.slice().sort(byHpPct)[0]] : [];
    case "allies": return allies;
    case "selfAlly": { const o = allies.filter((u) => u !== src).sort(byHpPct); return o.length ? [src, o[0]] : [src]; }
    case "slowAlly": return allies.length ? [allies.slice().sort((a, b) => this.eff(a, "spd") - this.eff(b, "spd"))[0]] : [];
    case "fireAlly": { const f = allies.filter((u) => u.types.includes("fire")); const l = f.length ? f : allies; return [l.slice().sort((a, b) => this.eff(b, "str") - this.eff(a, "str"))[0]]; }
    case "wildAllies": return allies.filter((u) => u.wild);
    case "debuffedAlly": { const d = allies.filter((u) => Object.keys(u.st).some((k) => STATUS[k].neg)); return d.length ? [d[0]] : []; }
    case "theAlly": return ctx && ctx.ally && ctx.ally.hp > 0 ? [ctx.ally] : [];
    case "fallenAlly": return ctx && ctx.ally && ctx.ally.hp <= 0 ? [ctx.ally] : [];
    case "strongFoe": return foes.length ? [foes.slice().sort((a, b) => this.eff(b, "str") - this.eff(a, "str"))[0]] : [];
    case "attacker": return ctx && ctx.attacker && ctx.attacker.hp > 0 ? [ctx.attacker] : [];
    case "lowOther": { const o = allies.filter((u) => u !== src).sort(byHpPct); return o.length ? [o[0]] : []; }
    case "lowDefAlly": return allies.length ? [allies.slice().sort((a, b) => this.eff(a, "def") - this.eff(b, "def"))[0]] : [];
  }
  return [];
};

// the units an aimed card would reach from cell c (for the preview while aiming)
B.aimHits = function (u, c) {
  const a = u.cards.a && u.cards.a.a, sh = cardShape(a); if (!sh) return [];
  const side = sh === "ally" ? u.side : this.other(u.side);
  const cs = sh === "one" || sh === "ally" ? [c] : shapeCells(sh, c);
  return this.alive(side).filter((x) => cs.includes(x.pos) && (sh === "ally" || !x.st.hidden));
};
// the cell the AI aims a zone card at: most foes hit, weighted by type
B.bestAim = function (u, shape, card) {
  const ty = this.typeOf(u, card), foes = this.alive(this.other(u.side)).filter((x) => !x.st.hidden);
  let best = null, bs = -1;
  for (let c = 0; c < CELLS; c++) {
    const cs = shapeCells(shape, c), hit = foes.filter((x) => cs.includes(x.pos));
    const sc = hit.reduce((m, x) => m + x.types.reduce((k, d) => k * typeMult(ty, d), 1) * 10 - x.hp / x.maxHp, 0);
    if (sc > bs) { bs = sc; best = c; }
  }
  return best;
};
// apply an effect spec (from an active or a support)
B.apply = function (src, fx, card, ctx) {
  if (fx.nightOnly && this.day) return false;
  if (fx.ifAbove && src.hp / src.maxHp * 100 <= fx.ifAbove) return false;
  if (fx.echoLast) {
    const last = this.side[src.side].lastActive;
    if (!last) return false;
    const copy = Object.assign({}, last.a, { cd: 0 });
    for (const k of ["pow", "heal"]) if (copy[k]) copy[k] = Math.round(copy[k] * fx.echoLast / 100);
    if (copy.shield) copy.shield = [Math.round(copy.shield[0] * fx.echoLast / 100), copy.shield[1]];
    this.emit({ k: "echo", u: src.uid, card: last.id });
    return this.apply(src, copy, last, ctx);
  }
  // an active card with a zone shape: aimed by the player, or by the AI here; zone cards hit +15 %
  const isActive = card && card.a === fx, shape = isActive ? cardShape(fx) : null;
  if (shape && shape !== "one" && shape !== "ally" && shape !== "cross" && (!ctx || ctx.aim == null)) ctx = Object.assign({}, ctx, { aim: this.bestAim(src, shape, card) });
  if (shape) ctx = Object.assign({}, ctx, { shape });
  const zoneF = shape === "lane" || shape === "row" ? ZONE_POW : 1;
  const list = this.targets(fx.tgt, src, Object.assign({ card }, ctx));
  if (fx.foresight) { this.side[src.side].foresight = (this.side[src.side].foresight || 0) + fx.foresight; this.emit({ k: "st", u: src.uid, st: "evade" }); }
  if (fx.cdDown) for (const u of this.alive(src.side)) u.cd = Math.max(0, u.cd - fx.cdDown);
  if (!list.length) return !!(fx.foresight || fx.cdDown);
  const ty = card ? card.type : null;
  if (fx.pow) {
    const hits = fx.hits || 1;
    for (let i = 0; i < hits; i++) {
      const tg = fx.tgt === "rand" ? this.targets("rand", src)[0] : null;
      const tl = tg ? [tg] : list;
      for (const t of tl) {
        if (!t || t.hp <= 0) continue;
        const d = this.hit(src, t, fx.pow * zoneF, card, { breakShield: fx.breakShield, drain: fx.drain, trueHit: fx.trueHit, pierce: fx.pierce });
        if (d > 0 && fx.st) this.addStatus(src, t, fx.st, ty);
        if (d > 0 && fx.st2) this.addStatus(src, t, fx.st2, ty);
        // splash reaches the cells next to the target (a cross), or everyone if there's no formation
        if (fx.splash) { const near = t.pos == null ? null : shapeCells("cross", t.pos); for (const o of this.alive(this.other(src.side))) if (o !== t && !o.st.hidden && (!near || near.includes(o.pos))) this.hit(src, o, fx.splash, card, {}); }
        if (d > 0 && fx.teamDrain) { const al = this.alive(src.side), each = Math.round(d * fx.teamDrain / 100 / al.length); for (const a of al) if (each > 0 && a.hp < a.maxHp) { const bf = a.hp; a.hp = Math.min(a.maxHp, a.hp + each); this.emit({ k: "heal", u: a.uid, n: a.hp - bf }); } }
      }
      if (!tg) break;
      if (!this.alive(this.other(src.side)).length) break;
    }
  } else if (fx.st) for (const t of list) { this.addStatus(src, t, fx.st, ty); if (fx.st2) this.addStatus(src, t, fx.st2, ty); }
  if (fx.strip) for (const t of list) { const pos = Object.keys(t.st).filter((k) => !STATUS[k].neg).sort((a, b) => t.st[b].t - t.st[a].t); if (pos.length) { delete t.st[pos[0]]; this.emit({ k: "strip", u: t.uid, st: pos[0] }); } }
  if (fx.cdUp) for (const t of list) if (t.cards.a && t.hp > 0) { t.cd = (t.cd || 0) + fx.cdUp; this.emit({ k: "cdup", u: t.uid, n: fx.cdUp }); }
  if (fx.copyBuff) for (const t of list) for (const k of Object.keys(t.st)) if (!STATUS[k].neg && k !== "hidden" && k !== "taunt") { src.st[k] = Object.assign({}, t.st[k]); this.emit({ k: "st", u: src.uid, st: k }); }
  if (fx.revive) for (const t of list) if (t.hp <= 0) { t.hp = Math.max(1, Math.round(t.maxHp * fx.revive / 100)); this.emit({ k: "revive", u: t.uid, n: t.hp }); }
  if (fx.selfCost) { const c = Math.round(src.maxHp * Math.abs(fx.selfCost) / 100); if (src.hp > c) { src.hp -= c; this.emit({ k: "dmg", u: src.uid, n: c, dot: "cost" }); } }
  if (fx.give) for (const t of list) { const g = Math.min(src.hp - 1, Math.round(src.hp * fx.give / 100)); if (g > 0 && t !== src) { src.hp -= g; const bf = t.hp; t.hp = Math.min(t.maxHp, t.hp + g); this.emit({ k: "heal", u: t.uid, n: t.hp - bf }); } }
  if (fx.heal) for (const t of list) this.heal(src, t, fx.heal);
  if (fx.shield) for (const t of list) this.addShield(src, t, fx.shield[0], fx.shield[1]);
  if (fx.cleanse) for (const t of list) this.cleanse(t, fx.cleanse);
  if (fx.selfSt) this.addStatus(src, src, fx.selfSt, null);
  if (fx.skipNext) src.skip = 1;
  if (fx.selfMaxDown) { src.maxHp = Math.max(1, Math.round(src.maxHp * (1 - Math.abs(fx.selfMaxDown) / 100))); src.hp = Math.min(src.hp, src.maxHp); }
  if (fx.noClockFoes && !this.day) this.side[this.other(src.side)].noClock = true;
  if (card) this.side[src.side].lastType = card.type;
  return true;
};

// fire support cards for an event that happened to `who` (an ally of the support holder)
B.trigger = function (on, who, info) {
  if (this.inTrigger) return; this.inTrigger = true;
  try {
    for (const u of this.alive(who.side)) {
      const c = u.cards.s; if (!c || u.sUsed || c.s.on !== on) continue;
      if (on === "allyStatus" && c.s.status !== info.status) continue;
      if (on === "allyLow" && !(who.hp > 0 && who.hp / who.maxHp < c.s.pct / 100)) continue;
      if (on === "allyKO" && c.s.type && !(info.ko && info.ko.types.includes(c.s.type))) continue;
      u.sUsed = true;
      this.emit({ k: "support", u: u.uid, card: c.id });
      if (c.s.fx) this.apply(u, c.s.fx, c, Object.assign({ ally: who }, info));
    }
  } finally { this.inTrigger = false; }
};
B.start = function () {
  for (const u of this.units) {
    const c = u.cards.s; if (!c || u.hp <= 0 || c.s.on !== "start") continue;
    u.sUsed = true; this.emit({ k: "support", u: u.uid, card: c.id }); this.apply(u, c.s.fx, c, {});
  }
};
B.roundStart = function () {
  this.round++;
  this.emit({ k: "round", n: this.round });
  for (const u of this.units) {
    const c = u.cards.s; if (!c || u.hp <= 0) continue;
    if (c.s.on === "every" && this.round > 1 && (this.round - 1) % c.s.n === 0) { this.emit({ k: "support", u: u.uid, card: c.id }); this.apply(u, c.s.fx, c, {}); }
    if (c.s.on === "round" && this.round === c.s.n && !u.sUsed) { u.sUsed = true; this.emit({ k: "support", u: u.uid, card: c.id }); this.apply(u, c.s.fx, c, {}); }
  }
  const order = this.units.filter((u) => u.hp > 0).map((u) => ({ u, s: this.eff(u, "spd") * (0.95 + this.rnd() * 0.1) }));
  order.sort((a, b) => b.s - a.s);
  return order.map((o) => o.u);
};
// returns false if the unit can't act this turn
B.turnStart = function (u) {
  if (u.hp <= 0) return false;
  if (u.st.burn) { const d = Math.max(1, Math.round(u.maxHp * u.st.burn.v / 100)); u.hp = Math.max(0, u.hp - d); this.emit({ k: "dmg", u: u.uid, n: d, dot: "burn" }); if (u.hp <= 0) { u.st = {}; this.emit({ k: "ko", u: u.uid }); return false; } }
  if (u.st.regen) this.heal(u, u, u.st.regen.v);
  if (u.mods.bleed) { const d = Math.max(1, Math.round(u.maxHp * Math.abs(u.mods.bleed) / 100)); if (u.hp > d) { u.hp -= d; this.emit({ k: "dmg", u: u.uid, n: d, dot: "bleed" }); } }
  if (u.cd > 0) u.cd--;
  if (u.st.stun || u.st.trap) { this.emit({ k: "skip", u: u.uid, why: u.st.stun ? "stun" : "trap" }); this.turnEnd(u); return false; }
  if (u.skip) { u.skip = 0; this.emit({ k: "skip", u: u.uid, why: "tired" }); this.turnEnd(u); return false; }
  return true;
};
B.turnEnd = function (u) {
  u.g = -this.rnd() * 0.1; // a new turn bar, with a little random start
  for (const k of Object.keys(u.st)) { if (u.st[k].t >= 99) continue; u.st[k].t--; if (u.st[k].t <= 0) delete u.st[k]; }
  if (u.shieldT > 0) { u.shieldT--; if (u.shieldT <= 0) u.shield = 0; }
  this.checkOver();
};
B.canPlay = function (u) { return !!(u.cards.a && u.cd <= 0); };
// would the auto mode use the active card now?
B.wantPlay = function (u) {
  if (!this.canPlay(u)) return false;
  const a = u.cards.a.a;
  if (!a.pow && a.heal && !a.st) {
    const allies = this.alive(u.side);
    const hurt = allies.some((x) => x.hp / x.maxHp < 0.7) || (a.cleanse && allies.some((x) => Object.keys(x.st).some((k) => STATUS[k].neg)));
    return hurt;
  }
  if (!a.pow && a.cleanse && !a.heal) return this.alive(u.side).some((x) => Object.keys(x.st).some((k) => STATUS[k].neg));
  return true;
};
B.act = function (u, useCard, aim) {
  if (this.over || u.hp <= 0) return;
  if (useCard && this.canPlay(u)) {
    const c = u.cards.a;
    this.emit({ k: "act", u: u.uid, card: c.id });
    this.apply(u, c.a, c, aim != null ? { aim } : {});
    u.cd = c.a.cd;
    if (!c.a.echoLast) this.side[u.side].lastActive = c;
  } else {
    const t = this.targets("basic", u)[0];
    this.emit({ k: "act", u: u.uid, card: null });
    if (t) this.hit(u, t, u.pos != null && cellRow(u.pos) === 0 ? 88 : 80, null, {});
    else this.emit({ k: "lost", u: u.uid });
  }
  this.turnEnd(u);
};
B.checkOver = function () {
  if (this.over) return this.over;
  if (!this.alive("foe").length) this.over = "win";
  else if (!this.alive("ally").length) this.over = "lose";
  return this.over;
};
/* ---------- Flowing time ----------
   Every unit fills a turn bar (u.g from 0 to 1) at its own pace; when full it takes its turn. One "round" is one unit of
   battle time (round-based cards and passives still count in these). Pace = sqrt(speed / average speed), so the fast act
   more often without running away with the battle. Cards are still on cooldowns counted in the unit's own turns. */
B.rate = function (u) { return Math.max(0.3, Math.sqrt(this.eff(u, "spd") / (this.spdRef || 1))); };
// moves time forward by up to dt; returns { k: "round" } or { k: "turn", u } when something happens, else null
B.advance = function (dt) {
  if (this.time == null) {
    this.time = 0;
    const al = this.units.filter((u) => u.hp > 0);
    this.spdRef = al.reduce((s, u) => s + this.eff(u, "spd"), 0) / Math.max(1, al.length);
    for (const u of this.units) u.g = this.rnd() * 0.3;
  }
  const al = this.units.filter((u) => u.hp > 0);
  let best = null, bt = Infinity;
  for (const u of al) { const t = Math.max(0, (1 - u.g) / this.rate(u)); if (t < bt) { bt = t; best = u; } }
  const tr = Math.max(0, this.round - this.time);
  const step = Math.min(dt, bt, tr);
  for (const u of al) u.g = Math.min(1, u.g + this.rate(u) * step);
  this.time += step;
  if (tr <= step) { this.time = this.round; this.roundStart(); return { k: "round" }; }
  if (best && bt <= step) { best.g = 1; return { k: "turn", u: best }; }
  return null;
};
// can this unit play its card right now, out of its turn? (the player taps it)
B.canCast = function (u) { return u.hp > 0 && !this.over && this.canPlay(u) && !u.st.stun && !u.st.trap && !u.skip; };
// plays the card now: it takes the unit's turn (statuses tick, the turn bar starts over)
B.castNow = function (u, aim) {
  if (!this.canCast(u)) return false;
  if (this.turnStart(u)) this.act(u, true, aim);
  return true;
};
// synchronous full simulation (used by tests and auto-resolve)
B.runAll = function (maxRounds) {
  this.start();
  while (!this.checkOver() && this.round <= (maxRounds || 40)) {
    const e = this.advance(Infinity);
    if (!e || e.k !== "turn") continue;
    const u = e.u;
    if (!this.turnStart(u)) { this.checkOver(); continue; }
    this.act(u, this.wantPlay(u));
  }
  return this.over || "lose";
};


const api = { CELLS, cellRow, cellLane, autoForm, cardShape, shapeCells, GRADE_VIS, COMPAT, canUse, UPGRADE_N, TYPES, BEATS, OPPOSITE, typeMult, GRADES, rollGrade, STATUS, CARDS, DROP_POOL, scaled, MONS, makeUnit, Battle, lvlScale, xpNeed, SLOT_LVL, ZONES, EVENTS, isDayNow };
if (typeof window !== "undefined") window.EvoEngine = api;
