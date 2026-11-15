/* Evolvlings: photos of the game window (feature plan, idea 27).
   A small camera button in the corner of the window takes a picture of what it shows (home from above or from
   the side, El Vado, a fight...), adds a strip with your creature's name and the date, and opens a preview with
   a Save button. On phones you can also press and hold the picture to keep it.
   Some privacy browsers (LibreWolf, Firefox with resistFingerprinting) hide canvas pictures; then the preview says
   how to allow it instead of saving a blank or noisy image (the same check as PX.readOk in pixel.js). */
(function (root) {
"use strict";
const EV = root.EV;
if (!EV) return;

const TX = {
  es: { btn: "Tomar una foto", title: "Foto del Claro", save: "Guardar foto", close: "Cerrar", hold: "En el móvil también puedes mantener pulsada la foto para guardarla.",
    blocked: "Tu navegador no deja leer las imágenes del juego (protección contra rastreo), así que la foto saldría en blanco. Permite el acceso al lienzo (canvas) para esta página y vuelve a intentarlo.", saved: "Foto guardada" },
  en: { btn: "Take a photo", title: "Glade photo", save: "Save photo", close: "Close", hold: "On phones you can also press and hold the picture to keep it.",
    blocked: "Your browser won't let the game read its own pictures (anti-tracking protection), so the photo would come out blank. Allow canvas access for this page and try again.", saved: "Photo saved" },
};
const tx = EV.text("photo", TX);
const esc = (s) => EV.escapeHtml(String(s));
const OW = 720, OH = 560, STRIP = 44;

// every canvas the window shows right now, drawn in page order over one picture
function shoot() {
  const stage = document.querySelector("#scrGame .stage"); if (!stage) return null;
  const cvs = [...stage.querySelectorAll("canvas")].filter((c) => !c.hidden && c.offsetWidth > 0 && c.width > 0);
  if (!cvs.length) return null;
  const out = document.createElement("canvas"); out.width = OW; out.height = OH + STRIP;
  const g = out.getContext("2d"); g.imageSmoothingEnabled = false;
  g.fillStyle = "#1d1626"; g.fillRect(0, 0, OW, OH + STRIP);
  const box = stage.getBoundingClientRect();
  for (const c of cvs) {
    const r = c.getBoundingClientRect();
    try { g.drawImage(c, ((r.left - box.left) / box.width) * OW, ((r.top - box.top) / box.height) * OH, (r.width / box.width) * OW, (r.height / box.height) * OH); } catch (e) { /* a tainted canvas is skipped */ }
  }
  const S = EV.S, d = new Date();
  g.fillStyle = "#2e2440"; g.fillRect(0, OH, OW, STRIP);
  g.font = '600 20px "Pixelify Sans", monospace'; g.textBaseline = "middle"; g.fillStyle = "#fbf6ef";
  g.textAlign = "left"; g.fillText(S && S.name ? `${S.name} · ${EV.stageName ? EV.stageName(S.stage) : ""}`.replace(/ · $/, "") : "Evolvlings", 16, OH + STRIP / 2);
  g.textAlign = "right"; g.fillStyle = "#d6cbbb"; g.fillText(`${d.toLocaleDateString(EV.LANG === "es" ? "es" : "en")} · Evolvlings`, OW - 16, OH + STRIP / 2);
  return out;
}
const readable = () => !root.PX || root.PX.readOk !== false;

let el = null;
function view() {
  if (el) return el;
  el = document.createElement("div"); el.id = "photoView"; el.className = "ph-wrap"; el.hidden = true;
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  document.body.appendChild(el);
  el.addEventListener("click", (e) => { if (e.target.closest("[data-phx]")) { EV.sfx("tap"); el.hidden = true; } });
  return el;
}
function take() {
  EV.sfx("tap");
  const v = view(), name = `evolvlings-${(EV.S && EV.S.name) || "foto"}-${new Date().toISOString().slice(0, 10)}.png`.replace(/[^\w.-]+/g, "_");
  let h = `<div class="ph-back" data-phx="1"></div><div class="ph-box"><button class="ph-x" type="button" data-phx="1" aria-label="${esc(tx("close"))}">✕</button><h3>${esc(tx("title"))}</h3>`;
  if (!readable()) { v.innerHTML = h + `<p class="ph-note">${esc(tx("blocked"))}</p></div>`; v.hidden = false; return; }
  const cv = shoot();
  let url = null; try { url = cv && cv.toDataURL("image/png"); } catch (e) { url = null; }
  if (!url) { v.innerHTML = h + `<p class="ph-note">${esc(tx("blocked"))}</p></div>`; v.hidden = false; return; }
  h += `<img class="ph-img" src="${url}" alt="${esc(tx("title"))}"><div class="ph-row"><a class="btn" href="${url}" download="${esc(name)}" data-phsave="1">${esc(tx("save"))}</a></div><p class="ph-note">${esc(tx("hold"))}</p></div>`;
  v.innerHTML = h; v.hidden = false;
  const a = v.querySelector("[data-phsave]"); a.addEventListener("click", () => { EV.toast(tx("saved"), "📷"); EV.P.c.photos = (EV.P.c.photos || 0) + 1; EV.save(); });
  a.focus({ preventScroll: true });
}
document.addEventListener("keydown", (e) => { if (el && !el.hidden && e.key === "Escape") { e.stopPropagation(); el.hidden = true; } }, true);

// the camera button in the window's top-right corner
const stage = document.querySelector("#scrGame .stage");
if (stage) {
  const b = document.createElement("button"); b.type = "button"; b.className = "ph-cam"; b.id = "btnPhoto";
  b.setAttribute("aria-label", tx("btn")); b.title = tx("btn"); b.textContent = "📷";
  b.addEventListener("click", (e) => { e.stopPropagation(); take(); });
  b.addEventListener("pointerdown", (e) => e.stopPropagation());
  stage.appendChild(b);
}

const css = `
.ph-cam{position:absolute;right:6px;top:6px;z-index:4;width:32px;height:32px;padding:0;border-radius:8px;border:2px solid #1d1626;background:rgba(251,246,239,.86);font-size:16px;line-height:1;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.35)}
.ph-cam:hover,.ph-cam:focus-visible{background:#fbf6ef}
.ph-wrap{position:fixed;inset:0;z-index:59;display:grid;place-items:center;padding:12px}
.ph-wrap[hidden]{display:none}
.ph-back{position:absolute;inset:0;background:rgba(20,14,26,.62)}
.ph-box{position:relative;width:min(560px,100%);max-height:calc(100dvh - 24px);overflow:auto;background:var(--surface);color:var(--ink);border:2px solid var(--line);border-radius:14px;box-shadow:4px 4px 0 var(--line);padding:14px}
.ph-box h3{font:700 19px var(--font-display);margin:2px 40px 8px 2px}
.ph-x{position:absolute;top:8px;right:8px;width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);font-size:16px;cursor:pointer}
.ph-img{display:block;width:100%;height:auto;border:2px solid var(--line);border-radius:8px;image-rendering:pixelated}
.ph-row{display:flex;gap:8px;margin-top:10px}.ph-row .btn{text-decoration:none}
.ph-note{margin:8px 2px 0;color:var(--muted);font-size:13px}
`;
const st = document.createElement("style"); st.textContent = css; (document.body || document.head).appendChild(st);

EV.PHOTO = { take, shoot };
})(window);
