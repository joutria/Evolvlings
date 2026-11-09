/* Evolvlings RPG: styles for expeditions, battles and cards.
   Part of the old rpg.js, now split. Classic scripts: top-level names are shared between the rpg/*.js files,
   which load in order (see index.html). */
"use strict";

/* ---------- Styles ---------- */
const css = `
.exp-go { width: 100%; margin-top: 10px; }
.exp-why { font-size: 12px; color: var(--muted); margin: 6px 2px 0; text-align: center; }
.exp { display: flex; flex-direction: column; gap: 12px; }
.exp .panel { gap: 10px; }
.exp h2 { font-family: var(--font-display); font-size: 22px; margin: 0; }
.exp .sub { font: 700 12px var(--font-mono); text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
.exp .lead { margin: 0; color: var(--muted); }
.ty { display: inline-flex; align-items: center; gap: 3px; font: 600 12px var(--font-body); padding: 2px 8px; border-radius: 999px; background: var(--surface-2, var(--bg)); border: 1px solid var(--line); white-space: nowrap; }
.gr { font: 600 11px var(--font-mono); text-transform: uppercase; letter-spacing: .06em; color: var(--g); border: 1px solid var(--g); border-radius: 999px; padding: 1px 7px; white-space: nowrap; }
.mons { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.mon { border: 2px solid var(--line); border-radius: 16px; background: var(--bg); padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; cursor: pointer; font: inherit; color: inherit; }
.fgrid { display: grid; grid-template-columns: repeat(2, minmax(0, 120px)); gap: 6px; margin: 8px 0; text-align: center; }
.fcell { min-height: 78px; border: 2px dashed var(--line); border-radius: 12px; background: var(--bg); padding: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font: inherit; color: inherit; cursor: pointer; }
.fcell.back { background: color-mix(in srgb, var(--line) 18%, var(--bg)); }
.fcell.on { border-style: solid; }
.fcell canvas { width: 54px; height: 45px; image-rendering: pixelated; }
.fcell small { font-size: 11px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fcell[aria-pressed="true"] { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
.mon[aria-pressed="true"] { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
.mon canvas { width: 96px; height: 80px; }
.mon strong { font-family: var(--font-display); font-size: 16px; }
.mon small { color: var(--muted); font-size: 12px; line-height: 1.3; }
.party { display: flex; gap: 8px; flex-wrap: wrap; }
.pm { flex: 1 1 140px; border: 1px solid var(--line); border-radius: 12px; padding: 6px 10px; background: var(--bg); font-size: 13px; }
.pm strong { font-family: var(--font-display); font-size: 15px; display: block; }
.pm .bar { height: 8px; margin-top: 4px; }
.pm.down { opacity: .5; }
.nodes { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.node { border: 2px solid var(--line); border-radius: 16px; background: var(--bg); padding: 12px; text-align: left; cursor: pointer; font: inherit; color: inherit; display: flex; flex-direction: column; gap: 4px; min-height: 96px; }
.node:hover { border-color: var(--accent); }
.node .ic { font-size: 26px; line-height: 1; }
.evd { display: block; width: 16px; height: 16px; margin: 5px; background: #fbf6ef; border: 2px solid #1d1626; transform: rotate(45deg); animation: evd 1.6s steps(2) infinite; }
@keyframes evd { 50% { background: #fff0b8; } }
@media (prefers-reduced-motion: reduce) { .evd { animation: none; } }
.node strong { font-family: var(--font-display); font-size: 17px; }
.node small { color: var(--muted); font-size: 13px; line-height: 1.35; }
.node:disabled { opacity: .55; cursor: not-allowed; }
.node .ok { color: var(--moss); font-weight: 600; }
.node.boss { border-color: color-mix(in srgb, var(--warn) 60%, var(--line)); }
.trail { display: flex; gap: 6px; align-items: center; }
.trail i { flex: 1; height: 6px; border-radius: 3px; background: var(--line); }
.trail i.done { background: var(--moss); }
.trail i.now { background: var(--accent); }
.rc-copies { margin: 6px 0 0; font-size: 12px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.rc-cant { margin: 6px 0 0; font-size: 12px; font-weight: 700; color: var(--bad, #c0392b); }
.bstage { width: 100%; max-width: 620px; margin: 0 auto; position: relative; border-radius: 16px; overflow: hidden; border: 1px solid var(--line); background: #000; }
.bstage canvas { display: block; width: 100%; height: auto; }
.bbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.bbar .grow { flex: 1; }
.blog { list-style: none; margin: 0; padding: 0; font-size: 13px; color: var(--muted); min-height: 5.6em; display: flex; flex-direction: column; gap: 2px; }
.blog li:first-child { color: var(--ink); font-weight: 600; }
.bctl { display: flex; gap: 8px; flex-wrap: wrap; }
.bctl .btn { flex: 1 1 160px; }
.bturn { font-weight: 700; margin: 0; }
.bhint { margin: 6px 0 4px; font-size: 13px; }
.bdock { display: grid; grid-template-columns: repeat(auto-fit, minmax(70px, 1fr)); gap: 6px; }
.bact { border: 2px solid var(--line); border-radius: 12px; background: var(--bg); color: inherit; font: inherit; padding: 6px 4px; display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; cursor: pointer; min-height: 64px; }
.bact strong, .bact span { font-size: 12px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bact small { font-size: 11px; color: var(--muted, inherit); }
.bact.ready { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent); }
.bact:disabled { opacity: .55; cursor: default; }
.baim { margin-top: 6px; }
.rcards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.rcard { display: flex; flex-direction: column; gap: 6px; }
.tcg { position: relative; background: var(--tc); border: 3px solid #1d1626; padding: 9px; display: flex; flex-direction: column; gap: 5px; box-shadow: 4px 4px 0 #1d1626; color: #1d1626; }
.tcg::before { content: ""; position: absolute; inset: 0; border: 4px solid var(--m0); box-shadow: inset 0 0 0 2px var(--m1), inset 0 0 0 3px #1d1626; pointer-events: none; }
.tcg.m-irid::before { animation: irid 6s ease-in-out infinite; }
@keyframes irid { 0%, 100% { border-color: #f4a6c4; } 33% { border-color: #c7a6ff; } 66% { border-color: #c8eef5; } }
.tcg.m-pulse::before { animation: pulse 2.4s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { box-shadow: inset 0 0 0 2px var(--m1), inset 0 0 0 3px #1d1626; } 50% { box-shadow: inset 0 0 0 2px var(--m1), inset 0 0 0 3px #1d1626, 0 0 10px 2px #ffd57a; } }
@media (prefers-reduced-motion: reduce) { .tcg.m-irid::before, .tcg.m-pulse::before { animation: none; } }
.tcg-name { position: relative; display: flex; align-items: center; gap: 6px; background: #fbf6ef; border: 2px solid #1d1626; padding: 3px 6px; min-height: 32px; }
.tcg-name strong { font-family: var(--font-display); font-size: 15px; line-height: 1.1; flex: 1; min-width: 0; }
.tcg-name .cnt { font: 700 12px var(--font-mono); color: #5b5266; }
.tcg-gem { width: 22px; height: 22px; display: grid; place-items: center; background: var(--tc); border: 2px solid #1d1626; font: 13px/1 system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif; flex: none; }
.tcg-cd { font: 700 12px var(--font-mono); background: #1d1626; color: #fbf6ef; padding: 2px 6px; flex: none; }
.tcg-art { position: relative; border: 2px solid #1d1626; background: #fbf3e4; overflow: hidden; line-height: 0; }
.tcg-art canvas { width: 100%; height: auto; aspect-ratio: 120 / 72; image-rendering: pixelated; display: block; }
.tcg.m-shine .tcg-art::after, .tcg.m-pulse .tcg-art::after { content: ""; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.55) 45%, rgba(255,240,180,.35) 52%, transparent 66%); background-size: 250% 100%; animation: foil 4s linear infinite; mix-blend-mode: screen; pointer-events: none; }
@keyframes foil { from { background-position: 120% 0; } to { background-position: -120% 0; } }
@media (prefers-reduced-motion: reduce) { .tcg.m-shine .tcg-art::after, .tcg.m-pulse .tcg-art::after { animation: none; background-position: 50% 0; } }
.tcg-line { position: relative; display: flex; justify-content: space-between; align-items: center; gap: 6px; background: #1d1626; color: #fbf6ef; padding: 2px 6px; font-size: 12px; font-weight: 700; }
.tcg-pips { color: var(--m1); letter-spacing: 1px; font-size: 11px; } .tcg-pips i { font-style: normal; color: #6e6283; }
.tcg-box { position: relative; background: #fbf6ef; border: 2px solid #1d1626; padding: 6px 7px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
.tcg-box .rc-fx li { color: #4a4255; } .tcg-box .rc-fx li b { color: #1d1626; } .tcg-box .rc-fx li.on { color: #1d1626; background: color-mix(in srgb, var(--tc) 22%, transparent); }
.tcg-box .rc-lore { color: #5b5266; border-top: 1px dashed #b9ad9c; padding-top: 5px; }
.tcg-foot { position: relative; display: flex; justify-content: space-between; font: 700 10px var(--font-mono); color: #1d1626; padding: 0 2px; text-transform: uppercase; letter-spacing: .04em; }
.tcg-foot span:first-child { color: #1d1626; background: var(--m1); border: 1px solid var(--m0); padding: 0 4px; }
.rc-fx { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; font-size: 13px; line-height: 1.35; }
.rc-fx li b { font: 700 11px var(--font-mono); text-transform: uppercase; letter-spacing: .06em; margin-right: 4px; }
.rc-fx li.on { border-radius: 0; padding: 2px 4px; margin: 0 -4px; }
.rc-lore { margin: 0; font-size: 12px; font-style: italic; color: var(--muted); }
.rcard.ghost .tcg { --tc: #b9b1a6 !important; opacity: .8; }
.rcard.ghost .tcg-art { filter: grayscale(1); }
.rc-btns { display: flex; gap: 6px; flex-wrap: wrap; margin-top: auto; }
.ctabs { margin-left: auto; }
.rc-btns .btn { padding: 6px 10px; font-size: 12px; min-height: 34px; }
.slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
.slotbox { border: 1px dashed var(--line); border-radius: 14px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.slotbox > .sub { margin: 0; }
.slotbox .muted { font-size: 13px; margin: 0; }
.slotbox select { font: 600 14px var(--font-body); padding: 8px 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); min-height: 40px; width: 100%; }
.rstats { font: 500 12px var(--font-mono); color: var(--muted); margin: 0; }
.mstats { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 10px; margin-top: 6px; width: 100%; font-size: 12px; text-align: left; }
@media (max-width: 520px) { .mstats { grid-template-columns: 1fr; } }
.tyi { width: 1.15em; height: 1.15em; image-rendering: pixelated; vertical-align: -0.2em; }
.node .ic .tyi { width: 27px; height: 27px; vertical-align: middle; }
.tcg-gem .tyi { width: 18px; height: 18px; vertical-align: middle; }
.rumor { margin: 0 0 10px; font-style: italic; color: var(--muted); border-left: 3px solid var(--line); padding-left: 10px; }
.hilos { margin: 6px 0 0; padding-left: 18px; font-family: Georgia, serif; font-size: 14px; line-height: 1.5; } .hilos li { margin: 4px 0; }
.pmap-wrap { border: 3px solid var(--line, #3b1d4a); line-height: 0; margin: 4px 0 2px; background: #e9d8b4; }
#pmap { width: 100%; height: auto; image-rendering: pixelated; display: block; cursor: pointer; }
.pmap-note { margin: 2px 0 8px; }
.key-ic { width: 32px; height: 32px; image-rendering: pixelated; vertical-align: middle; }
.escritos { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; margin-top: 8px; }
.esc { border: 2px solid var(--line); padding: 8px 10px; background: color-mix(in srgb, #e9d8b4 35%, var(--surface)); display: flex; flex-direction: column; gap: 4px; }
.esc summary { cursor: pointer; } .esc p { margin: 6px 0 0; font-size: 14px; line-height: 1.5; font-family: Georgia, serif; }
.esc.locked { opacity: .6; background: var(--bg); padding: 4px 8px; font-size: 13px; }
.node.zone.savia { border-color: #3b2a4a; background: linear-gradient(180deg, color-mix(in srgb, #3b2a4a 14%, var(--surface)), var(--surface)); }
.node.zone.echo { border-color: #c25e9a; border-style: double; border-width: 4px; }
.deep-info { margin: 8px 0; line-height: 1.5; }
.deep-floors { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; margin: 8px 0; }
.node.deep { min-height: 0; padding: 8px 10px; background: linear-gradient(180deg, color-mix(in srgb, #241030 10%, var(--surface)), var(--bg)); }
.node.deep strong { font-size: 14px; } .node.deep small { font-size: 12px; }
.node.deep.boss { border-color: #3b1d4a; border-width: 3px; }
.node.deep.done { border-color: color-mix(in srgb, #7dffb0 55%, var(--line)); }
.mref { display: block; margin-top: 4px; font: 700 11px var(--font-mono); color: var(--rose, #c25e9a); }
.mstats span { display: flex; justify-content: space-between; gap: 4px; } .mstats i { font-style: normal; color: var(--muted); } .mstats b { font-variant-numeric: tabular-nums; white-space: nowrap; }
.sheet { display: flex; flex-direction: column; gap: 6px; }
.fstat { display: grid; grid-template-columns: 76px minmax(0, 1fr) 44px 112px; gap: 8px; align-items: center; font-size: 14px; }
.fstat label { font-weight: 700; }
.fstat output { font-family: var(--font-mono); font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; }
.fstat small { font-size: 12px; color: var(--muted); white-space: nowrap; }
.fstat .up { color: #3c8a3a; font-weight: 700; } .fstat .down { color: #c0453a; font-weight: 700; }
@media (max-width: 420px) { .fstat { grid-template-columns: 70px minmax(0, 1fr) 40px; } .fstat small { grid-column: 2 / -1; margin-top: -4px; } }
.xpbar { height: 8px; }
.evt-text { margin: 0; font-size: 15px; line-height: 1.55; }
.evt-out { margin: 0; font-weight: 600; }
.bend-pan { padding: 0; overflow: hidden; }
.xtabs { display: flex; gap: 4px; margin: 10px 0 0; border-bottom: 3px solid var(--line); overflow-x: auto; scrollbar-width: none; }
.xtabs button { flex: 1 1 auto; border: 2px solid var(--line); border-bottom: 0; background: var(--bg); color: var(--muted); font: inherit; font-weight: 600; padding: 7px 12px; cursor: pointer; white-space: nowrap; }
.xtabs button[aria-selected="true"] { background: var(--line); color: var(--surface); }
.xtab-body { padding-top: 8px; }
.xtab-body > .cat-title:first-child { display: none; }
.bend { position: relative; background: #1d1626; }
.bshot { display: block; width: 100%; height: auto; image-rendering: pixelated; filter: brightness(.72) saturate(.85); }
.bcard { position: relative; margin: -30% 10px 10px; background: var(--surface); border: 3px solid var(--line); box-shadow: 0 4px 0 rgba(0,0,0,.4); padding: 12px; display: grid; gap: 8px; }
.bcard h3 { margin: 0; }
.bminis { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px; }
.bmini { display: flex; gap: 8px; align-items: flex-start; border: 2px solid var(--line); background: var(--bg); padding: 6px; min-width: 0; }
.bmini .rc-thumb { flex: none; width: 64px; height: 48px; }
.bm-txt { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; } .bm-txt strong { line-height: 1.2; }
.bm-txt .rc-cant { margin: 0; font-size: 12px; }
.bm-btns { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 2px; } .bm-btns .btn { padding: 4px 10px; font-size: 13px; min-height: 0; }
@media (max-width: 520px) { .bcard { margin: -22% 6px 6px; padding: 10px; } }
.choices { display: flex; flex-direction: column; gap: 8px; }
.choices .btn { text-align: left; justify-content: flex-start; }
.loot { display: flex; gap: 10px; flex-wrap: wrap; font: 600 14px var(--font-mono); }
.loot span { background: var(--bg); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; }
@media (max-width: 520px) { .mons { grid-template-columns: repeat(2, minmax(0, 1fr)); } .rcards { grid-template-columns: minmax(0, 340px); justify-content: center; } }
`;
const styleEl = document.createElement("style"); styleEl.textContent = css; document.head.appendChild(styleEl);
