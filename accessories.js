/* Evolvlings: accessories your creature wears (feature plan, idea 26).
   Little pixel hats and a scarf, drawn straight onto your creature's sprite wherever it is drawn (home from above
   and from the side, the map walker, battles, mini-games, photos): index.html passes every sprite of YOUR creature
   through EV.shiny(), which ends in HOOKS.dress() here. Wild creatures never wear them.
   Two slots: head (leaf cap, wool beanie, bow, flower crown) and neck (scarf). Bought with Chispas in the Season
   panel's Keepsakes tab; the flower crown comes from the Constellation chest at 54 stars (daily.js), which used to
   say "coming soon". Saved in P.cosm: acc { id: 1 }, head, neck.
   Placement: the hat sits on the top of the sprite's visible pixels (PX.readOk), or on the top of the cell when the
   browser hides pixel reads. Loaded after discipline.js. */
(function (root) {
"use strict";
const EV = root.EV;
if (!EV) return;

const TX = {
  es: { title: "Accesorios", sub: "Gorritos y bufandas que tu criatura lleva puestos en todas partes. Uno en la cabeza y otro en el cuello.",
    leaf: "Gorro de hoja", beanie: "Gorro de lana", bow: "Lazo", crown: "Corona de flores", scarf: "Bufanda",
    buy: "Comprar · {c} ✦", use: "Ponérselo", off: "Quitárselo", chest: "Cofre de 54 ★", poor: "Todavía no tienes Chispas suficientes.", got: "¡{item} para {name}!" },
  en: { title: "Accessories", sub: "Little hats and a scarf your creature wears everywhere. One on its head and one round its neck.",
    leaf: "Leaf cap", beanie: "Wool beanie", bow: "Bow", crown: "Flower crown", scarf: "Scarf",
    buy: "Buy · {c} ✦", use: "Put on", off: "Take off", chest: "54 ★ chest", poor: "Not enough Chispas yet.", got: "{item} for {name}!" },
};
const tx = EV.text("accessories", TX);

/* Pixel patterns: k ink, g/G leaf greens, r/R reds, w wool white, p/P pinks, y yellow, b blue, o orange */
const COL = { k: "#1d1626", g: "#4f9a3c", G: "#86c35a", r: "#c2413b", R: "#8f2a2f", w: "#f4ede0", p: "#f29ab8", P: "#c75d86", y: "#f2c94c", b: "#7fb6e8", o: "#e88a3a" };
const ACC = {
  leaf:   { slot: "head", cost: 120, icon: "🍃", pat: ["....kk....", "...kGk....", "..kggGgk..", ".kgggggGk.", "kkkkkkkkkk"] },
  beanie: { slot: "head", cost: 150, icon: "🧶", pat: ["....kk....", "...kwwk...", "..kkrrkk..", ".krrRrrRk.", "krrrrrrrrk", "kwwwwwwwwk", "kkkkkkkkkk"] },
  bow:    { slot: "head", cost: 80, icon: "🎀", pat: ["kk...kk", "kpkkkpk", "kpPkPpk", "kpkkkpk", "kk...kk"] },
  crown:  { slot: "head", chest: true, icon: "🌸", pat: [".kk..kk..kk.", "kyykkppkkbbk", "kyykkppkkbbk", "kGgGgGgGgGgk", "kkkkkkkkkkkk"] },
  scarf:  { slot: "neck", cost: 100, icon: "🧣", pat: ["kkkkkkkkkkkk", "krRrRrRrRrRk", "kkkkkkkrRkkk", ".......kRk..", ".......krk..", ".......kkk.."] },
};
const C = () => { const c = EV.P.cosm || (EV.P.cosm = { frames: {}, titles: {}, mem: {} }); if (!c.acc) c.acc = {}; return c; };
const worn = () => { const c = C(); return [c.head, c.neck].filter((id) => id && c.acc[id] && ACC[id]); };

/* ---------- drawing onto a sprite ---------- */
const boxes = new WeakMap();
// the visible pixels' box, or the whole cell when pixels can't be read
function bbox(cv) {
  let b = boxes.get(cv); if (b) return b;
  b = { x: 0, y: 0, w: cv.width, h: cv.height };
  if (root.PX && root.PX.readOk) {
    try {
      const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
      let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 >= 0) b = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    } catch (e) { /* keep the whole cell */ }
  }
  boxes.set(cv, b); return b;
}
function stamp(g, pat, x, y, u) {
  for (let r = 0; r < pat.length; r++) for (let c = 0; c < pat[r].length; c++) { const k = pat[r][c]; if (COL[k]) { g.fillStyle = COL[k]; g.fillRect(x + c * u, y + r * u, u, u); } }
}
const dressed = new WeakMap();
function dress(cv) {
  if (!cv) return cv;
  const on = worn(); if (!on.length) return cv;
  const key = on.join("+");
  let m = dressed.get(cv); if (!m) dressed.set(cv, (m = new Map()));
  if (m.has(key)) return m.get(key);
  const out = document.createElement("canvas"); out.width = cv.width; out.height = cv.height;
  const g = out.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(cv, 0, 0);
  const b = bbox(cv), cx = b.x + b.w / 2;
  for (const id of on) {
    const a = ACC[id], pw = a.pat[0].length, ph = a.pat.length;
    const u = Math.max(1, Math.floor((b.w * (a.slot === "head" ? 0.72 : 0.8)) / pw));
    const x = Math.round(cx - (pw * u) / 2);
    // a hat sinks a little into the head; the scarf goes round the lower middle of the body
    let y = a.slot === "head" ? b.y + 2 * u - ph * u : Math.round(b.y + b.h * 0.58);
    y = Math.max(0, Math.min(out.height - ph * u, y));
    stamp(g, a.pat, x, y, u);
  }
  m.set(key, out); return out;
}
const prevDress = EV.HOOKS.dress;
EV.HOOKS.dress = (cv) => dress(prevDress ? prevDress(cv) : cv);

/* ---------- the Keepsakes tab (seasons.js asks for this block) ---------- */
function iconURL(id) {
  const a = ACC[id], u = 3, cv = document.createElement("canvas");
  cv.width = a.pat[0].length * u; cv.height = a.pat.length * u;
  stamp(cv.getContext("2d"), a.pat, 0, 0, u); return cv.toDataURL();
}
let icons = null;
function html() {
  const c = C(), esc = EV.escapeHtml;
  if (!icons) { icons = {}; for (const id in ACC) { try { icons[id] = root.PX && root.PX.readOk === false ? "" : iconURL(id); } catch (e) { icons[id] = ""; } } }
  let h = `<h3 class="cat-title">${esc(tx("title"))}</h3><p class="muted" style="margin:0 0 6px">${esc(tx("sub"))}</p><div class="ss-cosm">`;
  for (const id in ACC) {
    const a = ACC[id], have = !!c.acc[id], on = c[a.slot] === id;
    const pic = icons[id] ? `<img class="acc-ic" src="${icons[id]}" alt="">` : `<span aria-hidden="true">${a.icon}</span>`;
    let btn;
    if (have) btn = on ? `<button class="btn ghost" type="button" data-acc="off:${id}">${esc(tx("off"))}</button>` : `<button class="btn" type="button" data-acc="on:${id}">${esc(tx("use"))}</button>`;
    else if (a.chest) btn = `<span class="muted">🔒 ${esc(tx("chest"))}</span>`;
    else btn = `<button class="btn${EV.P.coins >= a.cost ? "" : " ghost"}" type="button" data-acc="buy:${id}" ${EV.P.coins >= a.cost ? "" : "disabled"}>${esc(tx("buy", { c: a.cost }))}</button>`;
    h += `<div class="dch${on ? " got" : ""}"><b class="acc-name">${pic}${esc(tx(id))}</b>${btn}</div>`;
  }
  return h + "</div>";
}
function click(v) {
  const [act, id] = v.split(":"), a = ACC[id], c = C(); if (!a) return;
  if (act === "buy") {
    if (c.acc[id] || a.chest) return;
    if (!EV.spendCoins(a.cost)) { EV.toast(tx("poor")); EV.sfx("deny"); return; }
    c.acc[id] = 1; c[a.slot] = id; EV.sfx("coin"); EV.toast(tx("got", { item: tx(id), name: (EV.S && EV.S.name) || "" }), a.icon);
  } else if (act === "on" && c.acc[id]) { c[a.slot] = id; EV.sfx("tap"); }
  else if (act === "off") { if (c[a.slot] === id) c[a.slot] = null; EV.sfx("tap"); }
}
function give(id) { const c = C(); if (!ACC[id]) return; c.acc[id] = 1; if (!c[ACC[id].slot]) c[ACC[id].slot] = id; EV.toast(tx("got", { item: tx(id), name: (EV.S && EV.S.name) || "" }), ACC[id].icon); EV.save(); }
EV.HOOKS.accHtml = html;
EV.HOOKS.accClick = click;

const css = `.acc-name{display:flex;align-items:center;gap:6px}.acc-ic{width:30px;height:auto;image-rendering:pixelated}`;
const st = document.createElement("style"); st.textContent = css; (document.body || document.head).appendChild(st);

EV.ACC = { ACC, give, dress, worn, label: (id) => tx(id) };
})(window);
