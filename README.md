# Evolvlings

A small browser virtual-pet game. Pick an egg, hatch a creature of the Glimmerglade, and keep it fed, entertained, rested and tidy while it grows from **Baby** to **Kid** to **Grown-up**. How well you care for it decides which adult form it evolves into.

Everything in this game (name, creatures, art, and text) is original. The creatures are drawn in code on an HTML canvas, so there are no image assets.

## Play

Open `index.html` in any modern browser. No build step or server is needed.

To host it on **GitHub Pages**: open the repo's *Settings → Pages*, choose *Deploy from a branch*, pick `main` and `/ (root)`, and save. The game will be live at `https://<your-username>.github.io/<repo-name>/` after a minute or so.

## How it works

| Creature line | Egg | Baby → Kid → Grown-up (good care / poor care) | Temperament |
|---|---|---|---|
| Moth-sprite | Glow egg | Lumi → Lumbit → Lanternmoth / Dimwick | Playful, gets bored fast |
| Stone critter | Pebble egg | Pebb → Cobbin → Mossmonk / Grumblestone | Hungry, very sturdy |
| Cloud puff | Cloud egg | Wisp → Driftlet → Nimbuffin / Drizzlump | Sleepy, stays tidy |

- **Stats**: Belly, Fun, Energy, Tidy and Health drop in real time, including while the page is closed (catch-up is capped at 48 hours).
- **Care**: Feed (Dewberry or Honey bun), Play (a 10-second catch-the-starseeds mini-game), Clean, Sleep/Wake, Herbs (cures sniffles) and Cuddle (or tap the creature).
- **Messes** appear some time after meals. A messy, dirty glade can make your creature sick.
- **Growing up** happens at 1 hour (Kid) and 4 hours (Grown-up) of age. Average care over its life decides the adult form.
- If Health reaches zero, the creature wanders off to find a cozier glade. Past creatures are listed in the **Journal**.
- **Settings → Time speed** offers 10× and 60× modes to see the whole life cycle quickly.

Progress is saved in your browser's `localStorage`.

## Ideas for later

Achievements, more creature lines, an inventory/coin loop for incremental progression, sound effects, and an installable (PWA) version.
