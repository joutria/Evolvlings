// Offline support: keep the game files cached, refresh them in the background.
const CACHE = "evolvlings-v107";
const CORE = ["./", "./index.html", "./pixel.js", "./sprites.js", "./scenes.js", "./art.js", "./art/manifest.json", "./lore.js", "./seasons.js", "./rpg/data-cards.js", "./rpg/data-mons.js", "./rpg/data-talents.js", "./rpg/data-zones.js", "./rpg/data-events.js", "./rpg/events-aurora.js", "./rpg/events-aurora.en.js", "./rpg/events-crater.js", "./rpg/events-crater.en.js", "./rpg/events-forest.js", "./rpg/events-forest.en.js", "./rpg/events-hollow.js", "./rpg/events-hollow.en.js", "./rpg/events-lake.js", "./rpg/events-lake.en.js", "./rpg/events-caves.js", "./rpg/events-caves.en.js", "./rpg/events-heights.js", "./rpg/events-heights.en.js", "./rpg/events-deep.js", "./rpg/events-deep.en.js", "./rpg/events-heart.js", "./rpg/events-heart.en.js", "./rpg/events-common.js", "./rpg/events-common.en.js", "./rpg/events-era2.js", "./rpg/events-era2.en.js", "./rpg/events-era3.js", "./rpg/events-era3.en.js", "./rpg/events-era4.js", "./rpg/events-era4.en.js", "./rpg/engine.js", "./rpg/text-es.js", "./rpg/text-en.js", "./rpg/ui-core.js", "./rpg/ui-style.js", "./rpg/ui-art.js", "./rpg/ui-expedition.js", "./rpg/ui-battle.js", "./rpg/ui-events.js", "./rpg/data-people.js", "./rpg/data-echoes.js", "./rpg/data-eras.js", "./rpg/data-faces.js", "./rpg/data-lore-mons.js", "./rpg/data-lore-cards.js", "./rpg/ui-talk.js", "./rpg/ui-cards.js", "./rpg/ui-book.js", "./rpg/ui-eras.js", "./rpg/ui-talents.js", "./rpg/ui-duels.js", "./rpg/ui-hooks.js", "./rpg/registry.js", "./rpg/data-wild.js", "./daily.js", "./well.js", "./eggs.js", "./build.js", "./ach.js", "./minigames.js", "./photo.js", "./discipline.js", "./accessories.js", "./elder.js", "./notify.js", "./weather.js", "./world.js", "./guide.js", "./desktop.js", "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(e.request);
      const net = fetch(e.request).then((res) => {
        if (res && (res.ok || res.type === "opaque")) cache.put(e.request, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
// a tap on a notice (notify.js) brings the game window back, or opens it
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) return c.focus();
    return self.clients.openWindow ? self.clients.openWindow("./") : null;
  }));
});
