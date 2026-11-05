/* Evolvlings RPG: browser part: text helpers, card text and card HTML, saved data.
   Part of the old rpg.js, now split. Classic scripts: top-level names are shared between the rpg/*.js files,
   which load in order (see index.html). */
"use strict";

// window.EV comes from the main game script in index.html

/* ====================================================================== */
/* ====================  Browser part: UI and text  ===================== */
/* ====================================================================== */
const EV = window.EV;
const $ = EV.$;
const L = () => EV.LANG;
const esc = EV.escapeHtml;

/* ---------- Text ---------- */
const TX = { es: RPG_ES.TX, en: RPG_EN.TX }; // texts live in rpg/text-es.js and rpg/text-en.js
const ZT = { es: RPG_ES.ZT, en: RPG_EN.ZT };
const zt = (k, v, zone) => { let s = ZT[L()][zone || (X && X.zone) || "aurora"][k]; if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => (v[n] != null ? v[n] : m)); return s; };
const tx = (k, v) => { let s = TX[L()][k]; if (s == null) s = TX.en[k]; if (s == null) return k; if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => (v[n] != null ? v[n] : m)); return s; };

const MON_NAMES = {
  unisona: "Unísona", lumo: "Lumo", fizz: "Fizz", pebb: "Pebb", fuellito: "Fuellito", brotin: "Brotín", remolin: "Remolín", bostezo: "Bostezo",
  mecha: "Mecha", yunqueron: "Yunquerón", espinardo: "Espinardo", nim: "Nim", centinela: "Centinela", vidriela: "Vidriela", ecolito: "Ecolito", relampin: "Relampín", trinilla: "Trinilla", carambano: "Carámbano", capuchon: "Capuchón", guardatumba: "Guardatumba",
};
const MON_DESC = { es: RPG_ES.MON_DESC, en: RPG_EN.MON_DESC };

/* ---------- Card names, lore and effect text ---------- */
const pc = (n) => n + " %";
const pcE = (n) => n + "%";
const turnsEs = (n) => (n >= 99 ? "todo el combate" : n === 1 ? "1 turno" : n + " turnos");
const turnsEn = (n) => (n >= 99 ? "the whole battle" : n === 1 ? "1 turn" : n + " turns");
const stN = (st) => STATUS[st][L()];
const CT = {};
for (const id of Object.keys(RPG_ES.CT)) CT[id] = { es: RPG_ES.CT[id], en: RPG_EN.CT[id] };
const cardName = (id) => CT[id][L()][0];
const cardLore = (id) => CT[id][L()][1];

function stTextEs(st, who) {
  const [n, tt, ch, v] = st;
  const chance = ch < 1 ? Math.round(ch * 100) + " % de " : "";
  const base = { burn: "Quemar", soak: "Empapar", trap: "Atrapar", stun: "Aturdir", blind: "Cegar", slow: "dejar Lento", dull: "Adormilar", exposed: "quedar Expuesto (no esquiva)", marked: `Señalar (recibe +${v || 20} % de daño)` }[n];
  if (STATUS[n].neg) return `${chance}${base}${who ? " " + who : ""} ${turnsEs(tt)}`;
  const pos = { cheer: "Ánimo", guard: `+${v} % de defensa`, fury: `+${v} % de daño`, might: `+${v} % a sus estadísticas`, regen: `recupera ${v} % por turno`, haste: `+${v} % de velocidad`, cushion: `el próximo golpe le hace ${v} % menos`, hidden: "Escondido (no se le puede apuntar)", charge: `Carga (+${v} % al próximo golpe)`, taunt: "Desafío (atrae los golpes)", evade: `+${v} % de esquiva` }[n];
  return `${pos} ${turnsEs(tt)}`;
}
function stTextEn(st, who) {
  const [n, tt, ch, v] = st;
  const chance = ch < 1 ? Math.round(ch * 100) + "% chance to " : "";
  const base = { burn: "Burn", soak: "Soak", trap: "Trap", stun: "Stun", blind: "Blind", slow: "Slow", dull: "make Drowsy", exposed: "become Exposed (no dodging)", marked: `Mark (takes +${v || 20}% damage)` }[n];
  if (STATUS[n].neg) return `${chance}${ch < 1 ? base.toLowerCase() : base}${who ? " " + who : ""} for ${turnsEn(tt)}`;
  const pos = { cheer: "Cheer", guard: `+${v}% defence`, fury: `+${v}% damage`, might: `+${v}% to all stats`, regen: `recovers ${v}% per turn`, haste: `+${v}% speed`, cushion: `the next hit deals ${v}% less`, hidden: "Hidden (can't be targeted)", charge: `Charged (+${v}% on the next hit)`, taunt: "Taunting (draws hits)", evade: `+${v}% dodge` }[n];
  return `${pos} for ${turnsEn(tt)}`;
}
const TGT = {
  es: { foe: "al enemigo", foes: "a todos los enemigos", rand: "a enemigos al azar", randFoe: "a un enemigo al azar", fastestFoe: "al enemigo más rápido", fireFoe: "al enemigo de Fuego más fuerte", self: "a sí mismo", ally: "al aliado más herido", allyOther: "a un aliado", lowAlly: "al aliado más herido", allies: "a todo el equipo", selfAlly: "a sí mismo y a un aliado", slowAlly: "al aliado más lento", fireAlly: "al aliado de Fuego más fuerte", wildAllies: "a los aliados salvajes", debuffedAlly: "a un aliado", theAlly: "a ese aliado", lowOther: "a otro aliado herido", lowDefAlly: "al aliado con menos defensa", attacker: "al atacante", fallenAlly: "al aliado caído", strongFoe: "del enemigo más fuerte" },
  en: { foe: "the enemy", foes: "all enemies", rand: "random enemies", randFoe: "a random enemy", fastestFoe: "the fastest enemy", fireFoe: "the strongest Fire enemy", self: "itself", ally: "the most hurt ally", allyOther: "an ally", lowAlly: "the most hurt ally", allies: "the whole team", selfAlly: "itself and an ally", slowAlly: "the slowest ally", fireAlly: "the strongest Fire ally", wildAllies: "wild allies", debuffedAlly: "an ally", theAlly: "that ally", lowOther: "another hurt ally", lowDefAlly: "the ally with the least defence", attacker: "the attacker", fallenAlly: "the fallen ally", strongFoe: "the strongest enemy" },
};
function fxText(fx) {
  const es = L() === "es", T = TGT[L()], out = [];
  const tg = T[fx.tgt] || "";
  if (fx.nightOnly) { const r = fxText(Object.assign({}, fx, { nightOnly: 0 })); return (es ? "De noche: " : "At night: ") + r.charAt(0).toLowerCase() + r.slice(1); }
  if (fx.ifAbove) { const r = fxText(Object.assign({}, fx, { ifAbove: 0 })); return (es ? `Si tiene más del ${pc(fx.ifAbove)} de vida: ` : `If above ${pcE(fx.ifAbove)} health: `) + r.charAt(0).toLowerCase() + r.slice(1); }
  if (fx.echoLast) out.push(es ? `repite la última carta Activa del equipo al ${pc(fx.echoLast)}` : `replays the team's last Active card at ${pcE(fx.echoLast)}`);
  if (fx.foresight) out.push(es ? "el próximo golpe contra el equipo falla" : "the next hit against the team misses");
  if (fx.cdUp && !fx.pow) out.push(es ? `las cartas Activas ${tg.replace(/^a /, "de ")} tardan ${fx.cdUp} turno más` : `the Active cards of ${tg} take ${fx.cdUp} more turn`);
  if (fx.cdDown) out.push(es ? `las cartas del equipo se recargan ${fx.cdDown} turno antes` : `the team's cards recharge ${fx.cdDown} turn sooner`);
  if (fx.copyBuff) out.push(es ? `copia en sí misma los estados buenos ${tg}` : `copies the good statuses of ${tg} onto itself`);
  if (fx.revive) out.push(es ? `levanta ${tg} con ${pc(fx.revive)} de vida` : `revives ${tg} with ${pcE(fx.revive)} health`);
  if (fx.noClockFoes) return es ? "Si es de noche, anula el +10 % del Reloj del claro a los enemigos" : "At night, cancels the enemies' +10% Glade Clock bonus";
  if (fx.selfCost) out.push(es ? `gasta ${pc(Math.abs(fx.selfCost))} de su vida` : `spends ${pcE(Math.abs(fx.selfCost))} of its health`);
  if (fx.give) out.push(es ? `le da el ${pc(fx.give)} de su propia vida ${tg}` : `gives ${pcE(fx.give)} of its own health to ${tg}`);
  if (fx.pow) {
    if (fx.hits > 1) out.push(es ? `${fx.hits} golpes de ${pc(fx.pow)} ${tg}` : `${fx.hits} hits of ${pcE(fx.pow)} to ${tg}`);
    else out.push(es ? `${pc(fx.pow)} de daño ${tg}` : `${pcE(fx.pow)} damage to ${tg}`);
    if (fx.st) out.push(es ? stTextEs(fx.st) : stTextEn(fx.st).replace(/^./, (m) => m.toLowerCase()));
    if (fx.breakShield) out.push(es ? "rompe su Escudo" : "breaks its Shield");
    if (fx.trueHit) out.push(es ? "no se puede esquivar" : "can't be dodged");
    if (fx.pierce) out.push(es ? "atraviesa el Escudo" : "goes through Shields");
    if (fx.teamDrain) out.push(es ? `el equipo se cura el ${pc(fx.teamDrain)} del daño, repartido` : `the team heals ${pcE(fx.teamDrain)} of the damage, shared out`);
    if (fx.strip) out.push(es ? "le quita su mejora más larga" : "removes its longest buff");
    if (fx.cdUp) out.push(es ? `su carta Activa tarda ${fx.cdUp} turno${fx.cdUp > 1 ? "s" : ""} más` : `its Active card takes ${fx.cdUp} more turn${fx.cdUp > 1 ? "s" : ""}`);
    if (fx.splash) out.push(es ? `salpica ${pc(fx.splash)} al resto de enemigos` : `splashes ${pcE(fx.splash)} onto the other enemies`);
    if (fx.drain) out.push(es ? `se cura el ${pc(fx.drain)} del daño` : `heals ${pcE(fx.drain)} of the damage`);
  } else if (fx.st) out.push(es ? `${stTextEs(fx.st)} ${STATUS[fx.st[0]].neg ? tg : tg}` : `${stTextEn(fx.st)} (${tg})`);
  if (fx.st2) out.push(es ? `y ${stTextEs(fx.st2).replace(/^./, (m) => m.toLowerCase())}` : `and ${stTextEn(fx.st2).replace(/^./, (m) => m.toLowerCase())}`);
  if (fx.heal) out.push(es ? `cura ${pc(fx.heal)} ${tg}` : `heals ${pcE(fx.heal)} to ${tg}`);
  if (fx.shield) out.push(es ? `Escudo del ${pc(fx.shield[0])} ${tg} ${turnsEs(fx.shield[1])}` : `${pcE(fx.shield[0])} Shield to ${tg} for ${turnsEn(fx.shield[1])}`);
  if (fx.cleanse) {
    const what = fx.cleanse === "all" ? (es ? "todos sus estados negativos" : "all its negative statuses") : fx.cleanse === "one" ? (es ? "un estado negativo" : "one negative status") : fx.cleanse === "longest" ? (es ? "el estado negativo más largo" : "the longest negative status") : stN(fx.cleanse);
    out.push(es ? `quita ${what} ${fx.tgt === "allies" ? "de cada aliado" : ""}`.trim() : `removes ${what}${fx.tgt === "allies" ? " from each ally" : ""}`);
  }
  if (fx.selfSt) out.push(es ? `y gana ${stTextEs(fx.selfSt)}` : `and gains ${stTextEn(fx.selfSt)}`);
  if (fx.skipNext) out.push(es ? "pero pierde su siguiente turno" : "but loses its next turn");
  if (fx.selfMaxDown) out.push(es ? `pero pierde ${pc(Math.abs(fx.selfMaxDown))} de vida máxima este combate` : `but loses ${pcE(Math.abs(fx.selfMaxDown))} max health this battle`);
  let s = out.join(es ? "; " : "; ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function passiveText(p) {
  const es = L() === "es", out = [];
  const sign = (v) => (v > 0 ? "+" : "−") + Math.abs(v);
  const lab = es ? { spd: "velocidad", str: "fuerza", def: "defensa", hp: "vida máxima", crit: "crítico", dodge: "esquiva", dmg: "daño", healRecv: "curación recibida", healGive: "curación que da" }
    : { spd: "speed", str: "strength", def: "defence", hp: "max health", crit: "crit", dodge: "dodge", dmg: "damage", healRecv: "healing received", healGive: "healing given" };
  for (const k of ["hp", "str", "def", "spd", "crit", "dodge", "dmg", "healGive", "healRecv"]) if (p[k]) out.push(es ? `${sign(p[k])} % de ${lab[k]}` : `${sign(p[k])}% ${lab[k]}`);
  if (p.lowFun) out.push(es ? `pero ${p.lowFun} % de crítico si su Diversión baja de 30` : `but ${p.lowFun}% crit if its Fun is under 30`);
  if (p.critSpark) out.push(es ? `cada crítico da +${p.critSpark} % de daño al siguiente aliado que golpee` : `each crit gives +${p.critSpark}% damage to the next ally hit`);
  if (p.stShort) out.push(es ? `sus estados negativos duran ${p.stShort} turno${p.stShort > 1 ? "s" : ""} menos` : `its negative statuses last ${p.stShort} turn${p.stShort > 1 ? "s" : ""} less`);
  if (p.vsShield) out.push(es ? `+${p.vsShield} % de daño contra enemigos con Escudo` : `+${p.vsShield}% damage against shielded enemies`);
  if (p.shieldLong) out.push(es ? `sus Escudos duran ${p.shieldLong} turno${p.shieldLong > 1 ? "s" : ""} más` : `its Shields last ${p.shieldLong} more turn${p.shieldLong > 1 ? "s" : ""}`);
  if (p.onHit) out.push(es ? `sus golpes tienen ${stTextEs(p.onHit)}` : `its hits have a ${stTextEn(p.onHit)}`);
  if (p.firstHit) out.push(es ? `su primer golpe del combate hace +${p.firstHit} %` : `its first hit of the battle deals +${p.firstHit}%`);
  if (p.vsHigher) out.push(es ? `+${p.vsHigher} % de daño contra enemigos con más vida` : `+${p.vsHigher}% damage against enemies with more health`);
  if (p.defRound) out.push(es ? `+${p.defRound} % de defensa por ronda (hasta +${Math.round(15 * p.defRound / 3)} %)` : `+${p.defRound}% defence per round (up to +${Math.round(15 * p.defRound / 3)}%)`);
  if (p.resistAdv) out.push(es ? `recibe ${p.resistAdv} % menos de los tipos con ventaja sobre él` : `takes ${p.resistAdv}% less from types with an edge on it`);
  if (p.onHitBy) out.push(es ? `quien lo golpea tiene ${stTextEs(p.onHitBy)}` : `attackers have a ${stTextEn(p.onHitBy)}`);
  if (p.teamBlindShort) out.push(es ? `en los aliados, Cegado dura ${p.teamBlindShort} turno${p.teamBlindShort > 1 ? "s" : ""} menos` : `on allies, Blind lasts ${p.teamBlindShort} turn${p.teamBlindShort > 1 ? "s" : ""} less`);
  if (p.rage) out.push(es ? `cada golpe que recibe le da +${p.rage} % de daño (hasta 5 veces)` : `each hit it takes gives +${p.rage}% damage (up to 5 times)`);
  if (p.lifesteal) out.push(es ? `roba como vida el ${p.lifesteal} % del daño que hace` : `steals ${p.lifesteal}% of the damage it deals as health`);
  if (p.thorns) out.push(es ? `devuelve el ${p.thorns} % del daño recibido como espinas` : `returns ${p.thorns}% of damage taken as thorns`);
  if (p.defNight) out.push(es ? `${sign(p.defNight)} % de defensa contra tipos de Noche` : `${sign(p.defNight)}% defence against Night types`);
  if (p.defDay) out.push(es ? `${sign(p.defDay)} % contra tipos de Día` : `${sign(p.defDay)}% against Day types`);
  if (p.immune) out.push(es ? `inmune a ${stN(p.immune)}` : `immune to ${stN(p.immune)}`);
  if (p.weakWater) out.push(es ? `pero recibe ${Math.abs(p.weakWater)} % más de daño de Agua` : `but takes ${Math.abs(p.weakWater)}% more damage from Water`);
  if (p.bleed) out.push(es ? `pero pierde ${Math.abs(p.bleed)} % de vida por turno` : `but loses ${Math.abs(p.bleed)}% health per turn`);
  if (p.nightAll) out.push(es ? `+${p.nightAll} % de daño y defensa de noche (de día, la mitad en contra)` : `+${p.nightAll}% damage and defence at night (by day, half of it against)`);
  if (p.shade) out.push(es ? `con más de la mitad de vida, +${p.shade} % de esquiva; con menos, +${p.shade} % de daño` : `above half health, +${p.shade}% dodge; below, +${p.shade}% damage`);
  if (p.vsBlind) out.push(es ? `+${p.vsBlind} % de daño contra enemigos Cegados` : `+${p.vsBlind}% damage against Blinded enemies`);
  if (p.oath) out.push(es ? `+${p.oath} % de daño y defensa mientras el primer aliado siga en pie` : `+${p.oath}% damage and defence while the first ally is standing`);
  if (p.perFallen) out.push(es ? `+${p.perFallen} % de daño por cada aliado caído` : `+${p.perFallen}% damage for each fallen ally`);
  if (p.sight) out.push(es ? `los enemigos esquivan ${p.sight} % menos al equipo` : `enemies dodge the team ${p.sight}% less`);
  if (p.echo) out.push(es ? `${p.echo} % de que su golpe resuene otra vez a la mitad` : `${p.echo}% chance for its hit to ring out again at half power`);
  if (p.desperate) out.push(es ? `+${p.desperate} % de daño si un aliado baja del 30 % de vida` : `+${p.desperate}% damage if an ally drops below 30% health`);
  if (p.stoneDef) out.push(es ? `+${p.stoneDef} % de defensa por cada aliado de Piedra en pie` : `+${p.stoneDef}% defence for each Stone ally standing`);
  if (p.perFoeFallen) out.push(es ? `+${p.perFoeFallen} % de daño por cada enemigo caído` : `+${p.perFoeFallen}% damage for each fallen enemy`);
  if (p.vsHeld) out.push(es ? `+${p.vsHeld} % de daño contra enemigos Aturdidos, Lentos o Atrapados` : `+${p.vsHeld}% damage against Stunned, Slowed or Trapped enemies`);
  if (p.perDebuff) out.push(es ? `+${p.perDebuff} % de daño por cada estado negativo del objetivo` : `+${p.perDebuff}% damage for each negative status on the target`);
  if (p.teamCrit) out.push(es ? `+${p.teamCrit} % de crítico a todo el equipo mientras siga en pie` : `+${p.teamCrit}% crit for the whole team while it's standing`);
  if (p.buffLong) out.push(es ? `las mejoras que pone duran ${p.buffLong} turno${p.buffLong > 1 ? "s" : ""} más` : `the buffs it gives last ${p.buffLong} more turn${p.buffLong > 1 ? "s" : ""}`);
  if (p.frail) out.push(es ? `pero recibe ${Math.abs(p.frail)} % más de daño` : `but takes ${Math.abs(p.frail)}% more damage`);
  if (p.critImmune) out.push(es ? "los críticos contra él hacen daño normal" : "critical hits against it deal normal damage");
  const s = out.join(es ? ", " : ", ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function supportText(s) {
  const es = L() === "es";
  const when = {
    start: es ? "Al empezar" : "At the start",
    every: es ? `Cada ${s.n} rondas` : `Every ${s.n} rounds`,
    round: es ? `Si el combate llega a la ronda ${s.n}` : `If the battle reaches round ${s.n}`,
    allyStatus: es ? `La primera vez que un aliado queda ${s.status ? stN(s.status) : ""}` : `The first time an ally is ${s.status ? stN(s.status) : ""}`,
    allyLow: es ? `Cuando un aliado baja del ${s.pct} % de vida (1 vez)` : `When an ally drops below ${s.pct}% health (once)`,
    allyCrit: es ? "Si un aliado recibe un crítico (1 vez)" : "If an ally takes a crit (once)",
    allyKO: es ? `Si cae un aliado${s.type ? " de " + TYPES[s.type].es : ""} (1 vez)` : `If ${s.type ? "a " + TYPES[s.type].en : "an"} ally falls (once)`,
    foeKO: es ? "Cuando cae un enemigo (1 vez)" : "When an enemy falls (once)",
    allyBigHit: es ? "Cuando un aliado recibe un golpe de más del 25 % de su vida (1 vez)" : "When an ally takes a hit over 25% of its health (once)",
  }[s.on];
  if (s.on === "allyLethal") return es ? "Si un aliado va a caer de un golpe, ese golpe hace la mitad (1 vez)" : "If an ally would fall from one hit, that hit deals half (once)";
  if (s.on === "foeShield") return es ? "Cuando un enemigo se pone Escudo, el siguiente golpe del equipo lo rompe (1 vez)" : "When an enemy gains a Shield, the team's next hit breaks it (once)";
  if (s.on === "allyHitAdv") return es ? `Cuando un aliado recibe un golpe con ventaja de tipo, hace ${s.v} % menos (${s.n} veces)` : `When an ally takes a hit with type advantage, it deals ${s.v}% less (${s.n} times)`;
  if (s.on === "win" && s.revive) return es ? `Tras cada combate ganado en expedición, los aliados caídos se levantan con ${s.revive} % más de vida` : `After each expedition battle won, fallen allies get back up with ${s.revive}% more health`;
  if (s.on === "win") return es ? `Tras cada combate ganado en expedición, el equipo recupera ${s.heal} % de vida` : `After each expedition battle won, the team recovers ${s.heal}% health`;
  return `${when}: ${fxText(s.fx).replace(/^./, (m) => m.toLowerCase())}`;
}
function slotText(sc, slot) {
  if (slot === "p") return passiveText(sc.p);
  if (slot === "a") return fxText(sc.a) + (L() === "es" ? ` (enfr. ${sc.a.cd})` : ` (cd ${sc.a.cd})`);
  return supportText(sc.s);
}
/* Pixel sprites from sprites.js (window.EVS): creatures, card art, 9x9 type icons and card-use animations.
   Everything falls back to the vector drawings when sprites.js isn't loaded or doesn't know a creature (guardians). */
const HAS_EVS = typeof EVS !== "undefined";
const evsKind = (k) => HAS_EVS && EVS.KINDS.includes(k);
const TYI = {};
function tyIcon(ty) {
  if (!HAS_EVS || typeof document === "undefined") return TYPES[ty].icon;
  if (!TYI[ty]) { const src = EVS.typeIcon(ty), c = document.createElement("canvas"); c.width = 27; c.height = 27; const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, 27, 27); TYI[ty] = c.toDataURL(); }
  return `<img class="tyi" src="${TYI[ty]}" alt="">`;
}
const typeChip = (ty) => `<span class="ty ty-${ty}" title="${esc(TYPES[ty][L()])}">${tyIcon(ty)} ${esc(TYPES[ty][L()])}</span>`;
const gradeChip = (gi) => `<span class="gr" style="--g:${GRADES[gi].col}">${esc(GRADES[gi][L()])}</span>`;
/* TCG-style card: frame in the type colour, name bar with type gem and cooldown orb,
   pixel-art box, type line with grade pips, effect box, lore, and a set number. */
const TCOL = { fire: "#d9542c", plant: "#4f9a3c", light: "#e2ae2e", bolt: "#d8b81c", air: "#6fb8d0", music: "#cf5f9f", water: "#3f7fc9", stone: "#8a7a64", shadow: "#5b4b8e", ice: "#8fcbe0", mush: "#b0603c", dream: "#8a78d4", star: "#e0b84a" };
const CARD_NO = Object.keys(CARDS);
function tcgArt(by, ty, sil, id) {
  return `<div class="tcg-art"><canvas class="rc-art" width="120" height="72" data-by="${by || ""}" data-ty="${ty}" data-card="${id || ""}"${sil ? " data-sil=\"1\"" : ""}></canvas></div>`;
}
function tcgFrame(ty, gi, inner, ghost) {
  const v = gi == null ? { mat: ["#9d93ad", "#d2cbd9"], anim: null } : GRADE_VIS[gi];
  return `<div class="tcg${ghost ? " ghost" : ""}${v.anim ? " m-" + v.anim : ""}" style="--tc:${TCOL[ty]};--m0:${v.mat[0]};--m1:${v.mat[1]};--g:${gi == null ? "#9d93ad" : GRADES[gi].col}">${inner}</div>`;
}
function cardHtml(id, gi, opts) {
  opts = opts || {};
  const sc = scaled(id, gi), C = CARDS[id], ty = C.type;
  const rows = ["a", "p", "s"].map((sl) => `<li class="${opts.slot === sl ? "on" : ""}"><b>${esc(tx("slot." + sl))}</b> ${esc(slotText(sc, sl))}</li>`).join("");
  const by = C.by && MONS[C.by] ? monName(C.by) : "";
  const no = String(CARD_NO.indexOf(id) + 1).padStart(3, "0") + "/" + CARD_NO.length;
  const inner = `<div class="tcg-name"><span class="tcg-gem" title="${esc(TYPES[ty][L()])}">${tyIcon(ty)}</span><strong>${esc(cardName(id))}</strong>${opts.count > 1 ? `<span class="cnt">×${opts.count}</span>` : ""}<span class="tcg-cd" title="${esc(tx("slot.a"))}">⟳${sc.a.cd}</span></div>
  ${tcgArt(C.by, ty, false, id)}
  <div class="tcg-line"><span>${esc(TYPES[ty][L()])}${by ? " · " + esc(by) : ""}${C.boss ? " · 👑" : ""}</span><span class="tcg-pips" title="${esc(GRADES[gi][L()])}">${"◆".repeat(gi + 1)}<i>${"◇".repeat(5 - gi)}</i></span></div>
  <div class="tcg-box"><ul class="rc-fx">${rows}</ul><p class="rc-lore">${esc(cardLore(id))}</p></div>
  <div class="tcg-foot"><span>${esc(GRADES[gi][L()])}</span><span>EV · ${no}</span></div>`;
  return `<div class="rcard">${tcgFrame(ty, gi, inner)}${opts.foot || ""}</div>`;
}
function ghostCardHtml(id, note, foot) {
  const C = CARDS[id], ty = C.type;
  const inner = `<div class="tcg-name"><span class="tcg-gem">${tyIcon(ty)}</span><strong>???</strong></div>${tcgArt(C.by, ty, true, id)}<div class="tcg-line"><span>${esc(TYPES[ty][L()])}</span></div><div class="tcg-box"><p class="rc-lore">${esc(note)}</p></div><div class="tcg-foot"><span></span><span>EV · ${String(CARD_NO.indexOf(id) + 1).padStart(3, "0")}/${CARD_NO.length}</span></div>`;
  return `<div class="rcard ghost">${tcgFrame(ty, null, inner, true)}${foot}</div>`;
}
// paint card art boxes whenever cards appear in the page
function paintCardArt(root) {
  (root || document).querySelectorAll("canvas.rc-art:not([data-done])").forEach((cv) => {
    cv.dataset.done = "1";
    const out = EV.setupCanvas(cv, 120, 72), ty = cv.dataset.ty, by = cv.dataset.by, col = TCOL[ty] || "#888";
    const hasPX = typeof PX !== "undefined";
    const Lr = hasPX ? PX.layer(40, 24) : null, c = hasPX ? Lr.g : out;
    if (hasPX) c.scale(1 / 3, 1 / 3);
    // backdrop: pale sky, tinted hills and ground, a few sparkles
    c.fillStyle = "#fbf3e4"; c.fillRect(0, 0, 120, 72);
    c.fillStyle = col; c.globalAlpha = 0.28; c.fillRect(0, 0, 120, 72);
    c.globalAlpha = 0.45; c.beginPath(); c.ellipse(30, 66, 50, 22, 0, 0, Math.PI * 2); c.ellipse(96, 70, 44, 26, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.8; c.fillRect(0, 60, 120, 12); c.globalAlpha = 1;
    c.fillStyle = "#ffffff"; for (const [x, y] of [[12, 9], [104, 15], [84, 6], [26, 27]]) c.fillRect(x, y, 3, 3);
    const cid = cv.dataset.card;
    // lore-scene art (scenes.js): the 4:3 scene cropped to the 5:3 box; unknown cards show it darkened
    const scn = cid && typeof EVSCENE !== "undefined" ? EVSCENE.art(cid) : null;
    if (scn) {
      out.setTransform(out.getTransform().a, 0, 0, out.getTransform().d, 0, 0);
      out.imageSmoothingEnabled = false;
      const sh = Math.round(scn.width * 72 / 120); out.drawImage(scn, 0, Math.round((scn.height - sh) / 2), scn.width, sh, 0, 0, 120, 72);
      if (cv.dataset.sil) { out.fillStyle = "rgba(29,22,38,.84)"; out.fillRect(0, 0, 120, 72); }
      return;
    }
    if (hasPX && HAS_EVS && cid && EVS.CARD[cid]) {
      // pixel art: the creature that carries the card on the left, the skill's own art on the right
      c.setTransform(1, 0, 0, 1, 0, 0); PX.quantize(c, 40, 24, false);
      const sil = (im) => (cv.dataset.sil ? EVS.silhouette(im, "#1d1626") : im);
      const art = sil(EVS.cardArt(cid));
      if (evsKind(by)) { const m = sil(EVS.sprite(by, 16, 1, 0, "happy")); c.drawImage(m, 2, 24 - m.height - 1); c.drawImage(art, 22, 4); }
      else c.drawImage(art, 12, 4);
      PX.blit(out, Lr, 120, 72);
      return;
    }
    if (by && (MONS[by] || ["lumo", "fizz", "pebb"].includes(by))) {
      const story = ["lumo", "fizz", "pebb"].includes(by), boss = MONS[by] && MONS[by].boss, k = story ? 0.42 : boss ? 0.46 : 0.66;
      c.save(); c.translate(60, story ? 42 : boss ? 38 : 30); c.scale(k, k);
      if (cv.dataset.sil) { c.globalAlpha = 1; c.filter = "brightness(0)"; }
      try { drawMon(c, by, { t: 0.5, stage: 1, form: "bright", hp: 1 }); } catch (e) { /* art is decoration */ }
      c.restore();
    } else {
      c.font = "28px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(TYPES[ty] ? TYPES[ty].icon : "?", 60, 38);
    }
    if (hasPX) { c.setTransform(1, 0, 0, 1, 0, 0); PX.quantize(c, 40, 24, false); PX.blit(out, Lr, 120, 72); }
  });
}
// small 64x48 thumbnails of a card's scene (loadout rows, pickers, collection grid)
function paintThumbs(root) {
  (root || document).querySelectorAll("canvas.rc-thumb:not([data-done])").forEach((cv) => {
    cv.dataset.done = "1";
    const g = cv.getContext("2d"), id = cv.dataset.thumb; g.imageSmoothingEnabled = false;
    const scn = typeof EVSCENE !== "undefined" ? EVSCENE.art(id) : null;
    if (scn) g.drawImage(scn, 0, 0, 64, 48);
    else if (HAS_EVS && EVS.CARD[id]) { g.fillStyle = TCOL[CARDS[id].type] || "#888"; g.fillRect(0, 0, 64, 48); g.drawImage(EVS.cardArt(id), 16, 8, 32, 32); }
    if (cv.dataset.sil) { g.fillStyle = "rgba(29,22,38,.84)"; g.fillRect(0, 0, 64, 48); }
  });
}
// paint new card canvases once per frame, and only when a change actually added a canvas
let paintQ = false;
new MutationObserver((ms) => {
  if (paintQ) return;
  for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.tagName === "CANVAS" || n.querySelector("canvas"))) {
    paintQ = true; requestAnimationFrame(() => { paintQ = false; paintCardArt(); paintThumbs(); }); return;
  }
}).observe(document.body, { childList: true, subtree: true });

/* ---------- Saved data ---------- */
function rpgState() {
  const S = EV.S, P = EV.P;
  if (!P.cards) P.cards = [];
  if (!P.cardSeq) P.cardSeq = 1;
  if (!P.rpgMode) P.rpgMode = "auto";
  if (!P.c.expWins) P.c.expWins = 0;
  if (!P.c.guard) P.c.guard = 0;
  if (!P.c.fused) P.c.fused = 0;
  if (!P.cleared) P.cleared = P.c.guard ? { aurora: P.c.guard } : {};
  if (!P.grim) { P.grim = {}; for (const c of P.cards) P.grim[c.id] = 1; }
  if (P.dust == null) P.dust = 0;
  if (!S || S.phase !== "alive") return null;
  if (!S.rpg) S.rpg = { lvl: 1, xp: 0, eq: { a: null, p: null, s: null } };
  if (!P.sigGiven) P.sigGiven = {};
  if (!P.sigGiven[S.species] && MONS[S.species]) {
    P.sigGiven[S.species] = 1;
    const sig = MONS[S.species].cards.map((id) => giveCard(id, 0));
    if (!S.rpg.eq.a) S.rpg.eq.a = sig[0].uid;
  }
  // drop equipped uids that no longer exist
  for (const k of ["a", "p", "s"]) if (S.rpg.eq[k] && !P.cards.some((c) => c.uid === S.rpg.eq[k])) S.rpg.eq[k] = null;
  for (const k of ["a", "p", "s"]) { const c = S.rpg.eq[k] && cardByUid(S.rpg.eq[k]); if (c && !canUse(S.species, S.form, c.id)) S.rpg.eq[k] = null; }
  return S.rpg;
}
const usable = (id) => { const S = EV.S; return !S || canUse(S.species, S.form, id); };
function giveCard(id, gi) { const P = EV.P; const c = { uid: "c" + P.cardSeq++, id, g: gi }; P.cards.push(c); (P.grim = P.grim || {})[id] = 1; return c; }
// Stardust: each grade is worth 5 times the one below, like upgrades
// the Workshop build (build.js) lowers the crafting cost
const craftCost = () => (EV.BUILD ? EV.BUILD.craftCost() : CRAFT_BASE);
const DUST_OF = (gi) => Math.pow(UPGRADE_N, gi), CRAFT_BASE = 10, PACK = { price: 60, perDay: 3 };
const GRIM_ORDER = ["fire", "plant", "light", "bolt", "air", "music", "water", "stone", "shadow", "ice", "mush", "dream", "star"];
const grimIds = (types) => Object.keys(CARDS).filter((id) => types.includes(CARDS[id].type));
const grimDone = (p, types) => grimIds(types).every((id) => (p.grim || {})[id]);
const dayKeyNow = () => (EV.DAILY && EV.DAILY.dayKey ? EV.DAILY.dayKey() : new Date().toDateString());
function canTypesText() {
  const S = EV.S; if (!S || !COMPAT[S.species]) return "";
  const ts = COMPAT[S.species].slice();
  const ad = MONS[S.species].adult && S.form && MONS[S.species].adult[S.form];
  if (ad && !ts.includes(ad)) ts.push(ad);
  return tx("cards.canTypes", { name: S.name, types: ts.map((t) => TYPES[t].icon + " " + TYPES[t][L()]).join(", ") });
}
function cantNote(id) {
  const S = EV.S; if (!S || usable(id)) return "";
  return `<p class="rc-cant">🚫 ${esc(tx("cards.cant", { name: S.name, type: TYPES[CARDS[id].type][L()] }))}</p>`;
}
function cardByUid(uid) { return EV.P.cards.find((c) => c.uid === uid); }
function ownUnitOpts(hpPct) {
  const S = EV.S, R = rpgState();
  const cards = {};
  for (const k of ["a", "p", "s"]) { const c = R.eq[k] && cardByUid(R.eq[k]); if (c && R.lvl >= SLOT_LVL[k]) cards[k] = scaled(c.id, c.g); }
  return { kind: S.species, lvl: R.lvl, side: "ally", name: S.name, own: true, care: S.stats, stage: S.stage, form: S.form, cards, hpPct, lowFun: S.stats.fun < 30 };
}
/* Stat sheet: bars are relative to a strong creature of the same level, so they stay readable as levels go up.
   care: own creature only, shows how today's care shifts each stat. */
const SHEET = [["hp", "health", 70], ["str", "full", 70], ["def", "clean", 70], ["spd", "energy", 70]];
function sheetHtml(u, care) {
  const sc = lvlScale(u.lvl);
  const row = (key, val, pct, mod, unit) => `<div class="fstat"><label>${esc(tx("sh." + key))}</label><div class="bar"><i style="width:${Math.max(3, Math.min(100, Math.round(pct)))}%"></i></div><output>${val}${unit || ""}</output><small>${mod}</small></div>`;
  const modTxt = (ck) => {
    if (!care) return "";
    const d = Math.round(25 * (care[ck] || 0) / 100);
    return `<span class="${d > 0 ? "up" : d < 0 ? "down" : ""}">${d > 0 ? "+" : ""}${d} %</span> ${esc(tx("sh.by", { c: EV.t("stat." + ck).toLowerCase() }))}`;
  };
  let h = SHEET.map(([k, ck, ref]) => {
    const v = k === "hp" ? u.maxHp : Math.round(u.base[k]);
    const raw = k === "hp" ? u.maxHp / 3 : u.base[k];
    return row(k, v, 100 * raw / (ref * sc), modTxt(ck));
  }).join("");
  h += row("cr", Math.round(u.crit), 100 * u.crit / 25, modTxt("fun"), " %");
  h += row("dodge", Math.round(u.dodge), 100 * u.dodge / 4, "", " %");
  return `<div class="sheet">${h}</div>`;
}
function ownSheetHtml() {
  const S = EV.S, R = rpgState();
  if (!S || !R || S.stage < 1) return "";
  return sheetHtml(makeUnit(ownUnitOpts(1)), S.stats);
}
function expCheck() {
  const S = EV.S;
  if (!S || S.phase !== "alive") return "stage";
  if (S.stage < 1) return "stage";
  if (S.sleeping) return "sleep";
  if (S.sick) return "sick";
  if (S.stats.energy < 30) return "energy";
  return null;
}
