/* Evolvlings: wide-screen layout (PC, laptop, tablet in landscape).
   Phones keep the one-column layout untouched: every rule here sits inside one media query.
   Idea: nothing important should need scrolling on a PC.
   - the top buttons become a menu rail on the left, so the page loses its tall header;
   - the home window is sized from the screen height, so the window, the care row and the
     Expedition button all fit, and the side panels scroll on their own;
   - menus open as a wide window and lay their sections side by side;
   - expedition screens put the picture on one side and the choices on the other.
   Loaded last, so these rules win over the ones in index.html and rpg/ui-style.js. */
(function () {
  "use strict";
  const MQ = "(min-width: 1000px) and (min-height: 560px)";
  const css = `
@media ${MQ} {
  /* ---------- page: menu rail on the left ---------- */
  body { padding-block: 14px 14px; }
  .wrap { max-width: 1560px; display: grid; grid-template-columns: 188px minmax(0, 1fr); column-gap: 18px; row-gap: 0; align-items: start; }
  .wrap > * { grid-column: 2; min-width: 0; }
  .wrap > header.top { grid-column: 1; grid-row: 1 / span 2; position: sticky; top: 14px; flex-direction: column; align-items: stretch; flex-wrap: nowrap; gap: 14px; max-height: calc(100dvh - 28px); overflow-y: auto; scrollbar-width: thin; padding: 0 6px 6px 0; }
  .wrap > footer { margin-top: 10px; font-size: 12px; }
  .brand { font-size: 26px; }
  .brand small { font-size: 12px; line-height: 1.35; }
  .top-tools { flex-direction: column; align-items: stretch; flex-wrap: nowrap; gap: 6px; overflow: visible; margin: 0; padding: 0; -webkit-mask: none; mask: none; }
  .top-tools .chip-btn { width: 100%; display: flex; align-items: center; gap: 6px; text-align: left; padding: 7px 12px; position: relative; }
  .top-tools .chip-btn .notes { margin-left: auto; }
  .top-tools .chip-btn.icon { width: auto; align-self: flex-start; }

  /* ---------- home: window sized from the screen height ---------- */
  .game { grid-template-columns: max-content minmax(280px, 1fr); gap: 16px; }
  .habitat { width: clamp(480px, calc((100dvh - 372px) * 360 / 280 + 28px), 980px); gap: 8px; padding: 10px 12px; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-content: start; }
  .habitat > * { grid-column: 1 / -1; min-width: 0; }
  .habitat > #aExp:has(~ #aRecharge:not([hidden])) { grid-column: 1; }
  .habitat > #aRecharge { grid-column: 2; margin: 0; }
  .habitat > #aExpWhy { order: 1; }
  .habitat .idline { padding: 0 4px; }
  .habitat .hint { min-height: 1.3em; }
  .care-row .act { min-height: 56px; }
  .game > .side { position: sticky; top: 14px; max-height: calc(100dvh - 28px); overflow-y: auto; scrollbar-width: thin; padding-right: 4px; }
  .game > .side .log { max-height: none; }

  /* ---------- menus: one wide window, sections side by side ---------- */
  .msheet { top: 3vh; width: min(1180px, 94vw); max-height: 94vh; max-height: 94dvh; }
  .msheet .panel > .panel-head, .msheet .panel > p.muted:first-of-type { grid-column: 1 / -1; }
  #dailyPanel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 24px; align-items: start; }
  #dailyPanel > * { grid-column: 1 / -1; }
  #dailyPanel > .dsec { grid-column: auto; }
  #cardsPanel:has(> .slotbox) { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); column-gap: 20px; align-items: start; }
  #cardsPanel:has(> .slotbox) > * { grid-column: 1 / -1; }
  #cardsPanel:has(> .slotbox) > .slotbox { grid-column: 1; }
  #cardsPanel:has(> .slotbox) > .lrows { grid-column: 2; grid-row: span 2; }
  #teamsPanel, #settingsPanel .settings { display: block; columns: 2; column-gap: 28px; }
  #teamsPanel > *, #settingsPanel .settings > * { break-inside: avoid; margin-top: 0; margin-bottom: 10px; }
  #teamsPanel > .panel-head, #teamsPanel > p.muted:first-of-type { column-span: all; }
  .bd-list { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
  .ss-track { grid-template-columns: repeat(10, minmax(0, 1fr)); }
  .gd-gloss { grid-template-columns: repeat(2, minmax(0, 1fr)); }

  /* ---------- expedition: picture on one side, choices on the other ---------- */
  .exp { gap: 10px; }
  .exp .panel { padding: 12px 16px; }
  /* the parchment map with the zone list beside it */
  .exp > .panel:has(> .pmap-wrap) { display: grid; grid-template-columns: minmax(0, clamp(420px, calc((100dvh - 250px) * 1.578), 820px)) minmax(330px, 1fr); grid-template-areas: "rumor tabs" "map body" "note ctl"; column-gap: 18px; row-gap: 8px; align-items: start; }
  .exp > .panel:has(> .pmap-wrap) > .rumor { grid-area: rumor; }
  .exp > .panel:has(> .pmap-wrap) > .pmap-wrap { grid-area: map; margin: 0; }
  .exp > .panel:has(> .pmap-wrap) > .pmap-note { grid-area: note; max-width: 60ch; }
  .exp > .panel:has(> .pmap-wrap) > .xtabs { grid-area: tabs; align-self: end; }
  .exp > .panel:has(> .pmap-wrap) > .xtab-body { grid-area: body; align-self: stretch; height: 0; min-height: 100%; overflow-y: auto; scrollbar-width: thin; padding: 2px 6px 6px 2px; }
  .exp > .panel:has(> .pmap-wrap) > .bctl { grid-area: ctl; }
  .exp > .panel:has(> .pmap-wrap) .nodes.zones { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .exp > .panel:has(> .pmap-wrap) > .xtabs { display: flex; }
  .exp > .panel:has(> .pmap-wrap) > .xtabs > button { flex: 1 1 auto; min-width: 0; padding-inline: 6px; }
  /* getting ready: companions and deck on the left, formation on the right, buttons always visible */
  .exp:has(.mons) { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr); align-items: start; }
  .exp:has(.mons) > * { grid-column: 1 / -1; }
  .exp:has(.mons) > .panel:has(> .mons), .exp:has(.mons) > .panel:has(> .lrows), .exp:has(.mons) > .cload-wild { grid-column: 1; }
  .exp:has(.mons) > .panel:has(> .fgrid) { grid-column: 2; grid-row: 2 / span 3; }
  .exp:has(.mons) > .panel:has(> .fgrid) .fgrid { grid-template-columns: repeat(2, minmax(0, 140px)); }
  .exp:has(.mons) > .panel:last-child { position: sticky; bottom: 0; z-index: 5; }
  .mons { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  /* path, encounters, pauses: the picture keeps to the screen height and the text sits beside it */
  .exp > .panel:has(> .talk-scene) { display: grid; grid-template-columns: minmax(0, clamp(360px, calc((100dvh - 392px) * 4 / 3), 860px)) minmax(280px, 1fr); column-gap: 18px; row-gap: 8px; align-content: start; align-items: start; }
  .exp > .panel:has(> .talk-scene) > * { grid-column: 2; }
  .exp > .panel:has(> .talk-scene) > .talk-scene { grid-column: 1; grid-row: 1 / span 12; margin: 0; }
  .exp > .panel:has(> .talk-scene) .nodes { grid-template-columns: minmax(0, 1fr); }
}
`;
  const st = document.createElement("style");
  st.id = "desktopStyle";
  st.textContent = css;
  // after every other style block, also the ones the rpg scripts add while loading. It goes at the end of <body>, not
  // in <head>: the artifact viewer wraps the whole page inside its own <body>, so the game's own <style> blocks end up
  // there and anything put in <head> would lose to them (the PC layout came out half applied, Jose 2026-11-11)
  const add = () => (document.body || document.head).appendChild(st);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
  // the side column has room on a PC: show the battle stats unfolded the first time
  window.addEventListener("load", () => {
    if (!matchMedia(MQ).matches) return;
    const pn = document.getElementById("sheetPanel");
    if (pn && !pn.hidden) pn.open = true;
  });
})();
