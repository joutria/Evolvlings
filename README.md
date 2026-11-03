# Evolvlings

A small browser virtual-pet game. Pick an egg, hatch a creature of the Glimmerglade, and keep it fed, entertained, rested and tidy while it grows from **Baby** to **Kid** to **Grown-up**. How well you care for it decides which adult form it evolves into.

Everything in this game (name, creatures, art, and text) is original. The creatures are drawn in code on an HTML canvas, so there are no image assets.

## Play

Open `index.html` in any modern browser. No build step or server is needed.

To host it on **GitHub Pages**: open the repo's *Settings → Pages*, choose *Deploy from a branch*, pick `master` and `/ (root)`, and save. The game will be live at `https://<your-username>.github.io/<repo-name>/` after a minute or so.

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
- **Chispas** (✦) are the coin. You earn them by feeding a hungry creature, cleaning messes, curing sniffles, catching starseeds, growing up, and slowly over time while care stays above 60% (also while the page is closed).
- **Shop and bag**: five extra foods, two medicines, foam soap, and two permanent toys (the Burr ball boosts play rounds, the Leaf kite makes them last 15 s). Dewberry and Honey bun stay free.
- **Expeditions (RPG mode, `rpg.js`)**: once your creature is a Kid, take it with two wild companions to one of eight zones. The Dayside: Aurora Meadow (Light), Warm Crater (Fire) and Deep Wood (Plant). The Underside, opened by calming the Crater or Wood guardian: Gloom Hollow (Shadow), Mirror Lake (Water) and Echo Caves (Stone). Beyond them, opened by calming an Underside guardian: the Heights (Air) and the White Deep (Mushroom). Each guardian gives a verse of the Song of the Glade, and some encounters remember choices made in other zones. Pick your path leg by leg (battles, encounters, chests, rests) and face the zone's guardian (Great Lantern, Wakeful Forge, Hungry Hedge, Empty Throne, She Who Watches from Below, Grava, Great Weathervane, Mother Mycelium). Turn-based battles run in Auto or Manual mode at ×1/×2/×4 speed.
- **Skill cards**: 57 cards from 19 creatures, plus guardian cards. Each card prints three effects (Active, Passive, Support) and only the one for its slot works. Slots unlock at levels 1, 4 and 8. Each creature can only use some card types (its own, a few related ones and its signature cards). Six grades (Common, Rare, Super rare, Epic, Mythic, Legendary) scale values, durations and cooldowns; 5 identical cards upgrade into 1 of the next grade, so each grade is worth 5 of the one below. Duplicates are grouped in the collection.
- **Daily habits (`daily.js`, the *Tasks* chip)**: Song Notes (♪), a rare currency that never expires and will be spent in the Echo Well. Four daily tasks (care, expeditions, collection, world; one free reroll a day; reset at 05:00) light the Little Lantern for 1 Note and an extra free pull; unfinished days stay open for 2 more days. Six weekly tasks (finish 4 for 5 Notes), a 28-day login calendar that never resets if you miss a day, the Pantry (one free pull a day, 20 Chispas after, a guaranteed special prize every 30 pulls), and a Chispas→Notes exchange (160 each, 5 a week). Coming back after 14 days doubles daily rewards for a week.
- **Zone stars**: each guardian win gives 1–3 stars (2 if the team ends with half its health, 3 with 75% and nobody down). The first 3-star clear of a zone gives 3 Notes; total stars open Constellation chests (Notes and card picks). Story creatures (Lumo, Fizz, Pebb) are never in pulls.
- **12 types in 4 circles** (Sun, Sky, Lake, Frost) plus Star: winner +50%, loser −25%, opposites +25%, same type −25%, Day/Night clock +10%, card resonance +15%.
- **29 achievements**, each with a Chispas reward.
- **Spanish and English**: picked from the browser language, switchable in Settings.
- **Sound effects** generated with Web Audio (no audio files), plus optional vibration on phones. Mute from the header.
- **Installable app (PWA)**: works offline once loaded; on Android use *Install app* in Settings, on iPhone use *Share → Add to Home Screen*.

Progress is saved in your browser's `localStorage`: the creature in `glimmerglade.save.v1`, and wallet, bag, achievements and settings in `glimmerglade.profile.v1`.

## Ideas for later

An RPG expedition mode, a creature encyclopedia, more evolution branches and creature lines, more mini-games, and idle progression. See the project plan.
