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
- **Expeditions (RPG mode, `rpg/`)**: once your creature is a Kid, take it with two wild companions to one of nine zones. The Dayside: Aurora Meadow (Light), Warm Crater (Fire) and Deep Wood (Plant). The Underside, opened by calming the Crater or Wood guardian: Gloom Hollow (Shadow), Mirror Lake (Water) and Echo Caves (Stone). Beyond them, opened by calming an Underside guardian: the Heights (Air) and the White Deep (Mushroom). Once all eight guardians are calm, the Heart of the Glade (Star) opens: the stump above the Root, with the final guardian, the Aching Root. Each guardian gives a verse of the Song of the Glade, and some encounters remember choices made in other zones. Pick your path leg by leg (battles, encounters, chests, rests) and face the zone's guardian (Great Lantern, Wakeful Forge, Hungry Hedge, Empty Throne, She Who Watches from Below, Grava, Great Weathervane, Mother Mycelium, the Aching Root). Every guardian also leaves one of its own cards.
- **Unísona**: the Star story creature. Tila and Nim bring it to the Heart of the Glade, where it is always offered as a companion; after the Aching Root is calm it can join any expedition. It never comes from packs or drops: each Heart win gives another copy of one of its cards, and it fights with your best copy of each, so fusing them makes it stronger. Star cards work for every creature. Battles run in flowing time (below) in Auto or Manual mode at ×1/×2/×4 speed.
- **Formation**: each side of a battle has 6 cells, 3 lanes by Front and Back. Before a trip, tap a creature and then a cell to place it (or use Auto formation: sturdiest in front, carers behind). The Front takes basic attacks first and its basic attacks hit +10 %; a Back creature can't be reached by basic attacks while an ally stands in front of it in its lane, and its heals and shields give +10 %. Cards reach any cell. The formation is kept with each saved set, and duel team codes (now `EVO2-`, old `EVO1-` codes still load) carry it.
- **Turns by speed** (`rpg/engine.js` turn bars jumped straight to the next one, `rpg/ui-battle.js`): one creature acts at a time, in the order its speed sets (pace = square root of speed against the battle's average, so a creature twice as fast acts a bit less than twice as often). A strip at the top shows the next 8 turns with each creature's face, the foes' intents (⚔ basic, ★ card, ◎ will mark a threat, ! a marked threat lands on that turn) and the one acting now in gold. On your creature's turn the game waits. Manual: basic attack, its card (aimed: one foe, one ally, a cross, a lane or a row; tap the cell, then again or Play), Move (a free cell next to it, or swapping with a teammate next to it, costs half a turn, so it acts again sooner), Defend (−40 % damage until its next turn) or Wait (it gives way to the next creature in the order and acts right after it; its turn isn't spent, so states don't tick and it gains no extra Ímpetu). Semi: basic attacks go by themselves and it only asks when the card can be played; your creatures still dodge marked cells on their own. Auto plays everything. Speed as tactics: an active Bolt card moves the allies it reaches 30 % up the turn order, Ice and Dream cards push the foes they reach 25 % back. Cards that used to hit every foe hit a lane (damage) or a row (statuses only) with +15 % power, and the AI aims them at the best cell. Round-based cards still count rounds of battle time.
- **Battle feel** (`rpg/ui-battle.js`): numbers, the hit flash and the health bar dropping wait for the moment an attack lands (the card animation's hit window from `EVS.hitWindow`, or the basic attack's contact), with a 2-frame white silhouette, a 4 px knockback, a 60 ms hit-stop and a small screen shake on crits and area cards. The caster crouches and glows in its card's type colour before letting go; card effects have arcing shots with trails, wobbling beams, type particles in every impact burst and an additive glow on top (`EVS.fxGlow`). Basic attacks: the front row runs half way, hits and comes back; the back row throws a small shot of its type. A defeated creature drops, blinks and goes up in a puff of dust. When you let go of a card a short band shows the creature and the card's name (Settings > Card intro in battle; never in Auto).
- **Battle field** (`rpg/ui-battle.js`): each side's 6 cells are drawn as tiles (bluish yours, reddish theirs, back row dashed; stronger in Manual), with a small shield between a front creature and the one it covers behind it. Sprites are about 1.5 times the sheet cell, scaled by a whole number per art pixel (`EVART.big`); the scale is measured once on each creature's standing frame, so no frame (walking, casting, hurt) grows or shrinks. The lanes stand a little further apart. Tile marks (red marked cells with their "!" badge, your creature's tile, move targets, safe cells, aim zones) are drawn on the ground under the creatures, so the field keeps its depth. Over each creature only its health bar and its states; names, levels and health numbers are in a list under the field. A creature that changes cell hops there in 300 ms with walking frames, facing where it goes; two swapping creatures pass side by side. Marked cells fill red as the marking foe's turn comes near, with a red "!" badge in the tile's corner; in Manual, when your creature stands on one, the safe cells next to it glow green. Manual moves: drag your creature onto a cell next to it (a see-through copy follows your finger), or tap it and then the cell. The formation screen takes drags too.
- **Shared Ímpetu** (`rpg/engine.js` `IMP`, `impCost`, `gainImp`, `payImp`): each side shares one bar of Ímpetu (0 to 10) to play its active cards, instead of a cooldown per card. It starts at 3 and grows +1 on each of the side's turns, +1 more with each basic attack and +2 for each foe that falls. A card costs what its cooldown used to be (3 to 6, less at higher grades, shown as ✶N on the card) and then rests for 2 of its creature's turns. Start-of-battle cards and supports are free; "cooldowns down" effects now give Ímpetu and "cooldowns up" take it from the other side. The AI saves up when a teammate's dearer card is 2 or less away, unless a heal or cleanse is needed. The bars show under the field (yours gold, theirs red). In 1000 simulated battles: wins 90.6 % (91.5 % before), bosses 207/250 (205), cards 36 % of actions (34 %).
- **States that stack and cancel** (`rpg/engine.js` `addStatus`, `ST_OPP` and `ST_SOLO` in `rpg/data-cards.js`): the same state again adds a stack up to ×3 and refreshes its turns; its strength grows ×1, ×1.5, ×2 (`B.stVal`). Stun, trap, hidden, taunt, charge and cushion only refresh. Opposites cancel stack for stack instead of landing: haste/slow, guard/marked, cheer/drowsy, sprout/burn, hidden/exposed, evasive/blinded. On the field each state is a small circle (green buffs over the head, red debuffs at the feet) with its icon, ×N top right from 2 stacks and the turns left at the bottom (none for whole-battle states); past 4 it shows 3 and "+N". Tap a creature or its name under the field for the full list. In 1000 simulated battles wins went from 91.9 % to 91.5 %.
- **Marked threats and moving**: guardians and foes with a card of power 100 or more mark the cells it will hit in red (with a ! over them), do a basic attack, and land it next turn charged +20 %; only one threat is marked at a time. Modes: Auto (the game does everything), Semi (you play the cards, your creatures dodge marked cells on their own most of the time) and Manual (you also move them: tap one of yours, then a free cell next to it, for 30 % of its turn bar). Expedition foes hit +15 % and guardians +55 % harder to make up for formation, zones and dodging, so Auto wins about as often as before. A Caretaker's Guide note explains it the first time, and two achievement families count aimed cards (Good aim) and emptied threat cells (Light feet).
- **Skill cards**: 57 cards from 19 creatures, plus guardian cards. Each card prints three effects (Active, Passive, Support) and only the one for its slot works. Slots unlock at levels 1, 4 and 8. Each creature can only use some card types (its own, a few related ones and its signature cards). Six grades (Common, Rare, Super rare, Epic, Mythic, Legendary) scale values, durations and cooldowns; 5 identical cards upgrade into 1 of the next grade, so each grade is worth 5 of the one below. Duplicates are grouped in the collection.
- **Pixel art (`pixel.js`)**: everything is drawn with the original Glimmer-32 palette. Lumo, Fizz and Pebb are procedural pixel sprites (3 stages, faces for happy, sad, surprised and sleepy, a 2-frame idle and a faded look when poorly cared for), the home scene and eggs are drawn at 180 × 140 and scaled up sharply, and expedition battles are drawn at half resolution and snapped to the palette. The interface uses Pixelify Sans, square frames and segmented bars.
- **Daily habits (`daily.js`, the *Tasks* chip)**: Song Notes (♪), a rare currency that never expires and will be spent in the Echo Well. Four daily tasks (care, expeditions, collection, world; one free reroll a day; reset at 05:00) light the Little Lantern for 1 Note and an extra free pull; unfinished days stay open for 2 more days. Six weekly tasks (finish 4 for 5 Notes), a 28-day login calendar that never resets if you miss a day, the Pantry (one free pull a day, 20 Chispas after, a guaranteed special prize every 30 pulls), and a Chispas→Notes exchange (160 each, 5 a week). Coming back after 14 days doubles daily rewards for a week.
- **Zone stars**: each guardian win gives 1–3 stars (2 if the team ends with half its health, 3 with 75% and nobody down). The first 3-star clear of a zone gives 3 Notes; total stars open Constellation chests (Notes and card picks). Story creatures (Lumo, Fizz, Pebb) are never in pulls.
- **Battle stats**: a "Battle stats" panel on the home screen (and in the Cards panel) shows Health, Strength, Defence, Speed, Crit and Dodge at the current level, with how today's care shifts each one (Health from health, Strength from belly, Defence from tidiness, Speed from energy, Crit from fun, up to ±25 %). Wild companions show their stats on the pick screen.
- **Card look**: cards are drawn like trading cards: a frame in the type's colour, a name bar with the type gem and the Active cooldown, a pixel-art box with the creature the card comes from, a type line with grade diamonds, an effects box, lore and a set number (EV · 001/84). Rarity is read from the frame's material and 1–6 diamonds (wood, copper, silver, lake glass, nacre, root-light): Epic shines, Mythic shifts colour, Legendary pulses.
- **Visual language**: colours follow the approved "Lenguaje visual del Claro" guide: zone skies and grounds use Glimmer-32 tones, the Black Sap has its own reserved colours with drops that rise in steps, map encounters are a pulsing cream diamond, and hit numbers show effectiveness (×1.5 gold and bigger, ×1.25 pink with an "Opposite" tag, ×0.75 grey and smaller). Bad statuses sit at the feet and fall; good ones float over the head. Stardust uses its own three-mote icon (∴).
- **Well of Echoes** (`well.js`, Cards panel → Well): the card pool, paid only with Song Notes (1 Note per pull, 10 for 10; never real money). Base odds by grade: Common 38.2 %, Rare 28 %, Super rare 18 %, Epic 10 %, Mythic 5 %, Legendary 0.8 %. At least one Epic every 10 pulls, Legendary odds +6 points per pull from pull 50, a sure Legendary at 70, and the Well's Promise (50/50 for the featured card; if it misses, the next Legendary is featured). Counters carry across banners. Season 1 banner "The Missing Light" features Lit Street (Light) with three boosted Epics; the standing banner has every card. Rings reveal the real grade before the cards appear. Rules and odds, a 200-pull history and the Stardust Shop (1 Note for 25 ∴, up to 5 a month) are on the same tab. Story creatures and their cards are never in the Well.
- **Grimoire, Stardust and packs** (Cards panel tabs): the Grimoire lists all 84 cards by circle and type, with silhouettes for the undiscovered ones and an achievement for each completed circle (plus one for all). Spare copies (never the last one or one in use) break into Stardust worth 5× per grade (Common 1 ✧, Rare 5 ✧…); 10 ✧ makes a Common card in the Grimoire (guardian cards excepted). The Workshop sells 3-card packs for 60 Chispas, 3 a day, mostly cards your creature can use.
- **12 types in 4 circles** (Sun, Sky, Lake, Frost) plus Star: winner +50%, loser −25%, opposites +25%, same type −25%, Day/Night clock +10%, card resonance +15%.
- **Refuge of el Vado** (`eggs.js`, Refuge chip): eggs, companions and Bond.
  - **Egg Well** (opens at Keeper Level 3): 1 Song Note per egg. Odds by egg: bark 50 %, moss 30 %, sky 14.3 %, lilac 5.1 %, golden 0.6 %. A lilac egg or better every 10 pulls, golden odds +6 points per pull from pull 70, a sure golden egg at 90. Season 1 banner "Walking Light": half of all moss eggs are Mecha. Welcome banner: 20 eggs at most, 10 for 8 Notes, the first 10 always include a lilac or golden egg. Story creatures never hatch from eggs.
  - **Incubator**: 1 to 3 slots (Keeper Levels 1, 5, 8). Eggs take 12 + 8 × tier hours (12 h for bark, 44 h for golden); "Warm it" takes off 2 h (once an hour), "Talk to it" 4 h (once a day), and every finished expedition 3 h from each egg in the incubator.
  - **Companions** live in the Refuge with their own level and Bond, and are offered first on the expedition pick screen. They gain trip XP (double while below your creature's level, never above it). Bond (1 to 10) grows by travelling together (+1), winning (+1) and a daily pet (+1); each level gives +1.5 % stats and +1 % crit, and at Bond 5 and 10 their cards go up a grade. A duplicate gives Stardust (5/10/25/60/150 ∴) and +1 Bond.
  - **Keeper Level** grows from counters the game already keeps (care, trips, guardians, tasks, pulls, hatches, achievements). Each level gives 10 × level Chispas, and every 5 levels 2 Notes. Eight one-time welcome tasks give 60 Notes in total.
- **Seasons** (`seasons.js`, Season chip): 6-week seasons on a fixed calendar from 2 November 2026 (they repeat after the last written one).
  - **Keeper's Journal**: a free 40-level pass, 450 XP a level, from daily tasks (100), weekly tasks (300) and the event. 20 Notes a season, a sky egg or better at level 10, an Epic-or-better card at 20, the "Lanterns" frame at 30, and a golden frame and the verse title at 40.
  - **Night of Lanterns** (first 3 weeks of Season 1): earn Wax from daily tasks (3), expeditions (4), battle wins (1) and a daily visit to Tila (5); light her 12 lanterns (story beats at 3, 6, 9 and 12, keepsake + 3 Notes at the end); Tila's stall sells Notes, food, a Super rare Lantern card and two Writings.
  - **Keepsakes**: frames for the home scene and titles under your creature's name.
- **Savia Mode**: once a zone has 3 stars it can be played again with thicker Sap (+2 levels, +15 % stats) for 3 more stars, up to 54 in total with the normal ones.
- **Guardian's Echo** (Keeper Level 6): each week a calmed guardian returns stronger with one rule (Sap shield, fury, tired team or extra speed). 3 tries a week; a win gives Stardust and Chispas and counts for a new weekly task.
- **Lore** (`lore.js`, written in the lore thread): six one-time encounters with dialogue that unlock as you calm guardians, 15 Writings to collect and read in the Grimoire (from encounters, chests, guardians and the event stall), and rumours of the world on the zone screen.
- **Pixel sprites** (`sprites.js`, made in the creature-cards thread, `window.EVS`): the 20 launch creatures as Glimmer-32 sprites in battle, on the pick screen and in the Refuge (hollowed foes use the faded palette), each card's own 16×16 art next to the creature that carries it, 9×9 pixel type icons instead of emoji, and a short animation for every card used in battle (13 styles, type particles, hits). Guardians still use the vector drawings.
- **The Deep Root** (Keeper Level 8): twelve floors down the sick Root, one battle each, with a guardian on floors 4, 8 and 12. Each stretch of four floors runs through a zone you have calmed. Every 2 weeks the zones, the rule (fury, Sap shield, speed or a tired team) and the stars start over. Each floor keeps its best stars by health left; first clears give Chispas and Stardust, and chests at 6, 12, 18, 24, 30 and 36 stars give 10 Notes in total plus Stardust. The 12, 24 and 36 chests also hold a writing you could already have found in a zone chest (any writing no other part of the game hands out comes first). A floor costs 15 energy.
- **112 achievements** (`ach.js`) in 7 categories (Care, Expedition, Stars, Cards, Types, World, Secrets), each marked bronze, silver or gold. The original 44 keep their Chispas rewards. 21 new families have three steps each: bronze gives 20 Chispas, silver 1 Song Note, gold 3 Song Notes. 5 secret achievements stay hidden behind a hint until you earn them (1 Note each). The panel filters by all, to do and unlocked.
- **Quiet mode** (Settings): hides the Card Well and the Egg Well for anyone who only wants to look after their creature. Song Notes earned while it is on turn into Stardust by themselves (1 Note = 25 ∴); Notes you already had are kept. The welcome tasks that need a pull count as done.
- **Companion cards**: on the pick screen, each Refuge companion you've chosen gets its own three slots. It can carry your cards of its circle (for example Fire, Plant and Light for Fuellito), Star cards and its own; an empty slot keeps its usual card, and slots open at the same levels as yours. Each copy of a card goes to one creature at a time, and upgrading a lent copy hands the companion the new card. Companions you haven't hatched yet keep their usual cards.
- **Map** (`world.js`, the *Map* chip, first delivery): a small 3/4 top-down tile engine (15 × 11 tiles of 16 px). Two places for now: your corner of the Glade (bowl, moss bed, pond, open lawn, the Glade Root, notice board) and El Vado (Well of Echoes, Pantry, Shop, Incubator, Tila, the expedition trail). You pick a place from the list or by tapping it on the map and the creature walks there by itself (A* path), then the place's action runs. The creature turns as it walks: front, back and side views (the side one mirrored for left), with a two-frame step; `EVS.sprite` takes a direction for this. The back and side views move the front pose's parts instead of just hiding the face: from behind, bellies, snouts and masks disappear and wings, tails and fins come over the body; in profile, paired legs, ears and wings fold to one side (the far one darker), tails trail behind and snouts point forward. The Root and Tila talk in dialogue boxes with portraits and choices and pass on rumours from the lore. Moving between the two maps costs 1 step and setting out on the trail 3; talking, shops and care at home are free. Steps belong to each creature: 10 a day (up to 20 saved), plus 1 per 10 energy from tea, stew or the energy recharge (up to 12 bought a day); sleeping gives none. Expeditions from the home button don't cost steps yet.
- **Home from above** (`world.js`, phase 4 of the top-down plan): the habitat box now shows your corner of the Glade from above instead of the side scene (Settings → Home view switches back to the side view). The care buttons walk the creature to its place first: Feed to the bowl, Clean to the pond, Play to the lawn, Sleep to the moss bed; refusals ("too full", "too tired") still happen on the spot. Tapping the creature gives it a pat, and tapping a place does what its button does. With nothing to do it potters about. Hearts, bubbles, speech, sleep and sickness signs from the side scene are drawn around it. The star catch game still plays in the side view. Going to bed first shows a summary of the day (meals, cuddles, games, messes, expeditions, tasks, steps left). The notice board glows when the Tasks chip has something new. The home changes with the story: an empty nest for each companion hatched in the Refuge (up to 4), the writings you've found piling up by the board (a roll, a stack from 5, a reading stand from 15), and Tila's lantern once her street is lit.
- **Life in the Glade** (`world.js`, first part of phase 5):
  - *Message in a bottle*: on about two days in three a bottle floats in the pond. Opening it gives a rumour from the lore and a small gift (10 Chispas, 12 Stardust, a cookie or a fizzpop).
  - *Foraging nook*: once a day per creature, for 2 steps, each circle searches its own way. Sol harvests a melon, Sky catches breezes (+12 Chispas and fun), Lake digs up 8 to 14 Stardust, Frost gathers leaves for a tea, and Star (Unísona) sings for Chispas and Stardust. The nook looks different for each circle.
  - *Portraits with feelings*: Tila's portrait smiles or worries with the conversation, and your creature's face shows its reaction next to every dialogue.
- **Parchment map and key items** (`rpg/ui-expedition.js`, second part of phase 5): the expedition screen opens on a parchment map of the valley. The Dayside is above the stream, the Underside below it, and El Vado sits on the ford. Locked places show "?", and gold stamps show your stars. Tapping a place walks your creature's token there along the path and opens it; the list of zones stays below. Two zones now need a key item from the story. Mirror Lake needs a raft, which the loggers give you the first time you calm the Deep Wood's guardian. The Heights need a rope, which the miners give you for the Echo Caves' guardian. Saves that already cleared those zones count as having them. The lock text says what's missing and where to get it.
- **Lore threads**: when you own both writings of a pair, the Grimoire adds a line that ties them together.
- **Spanish and English**: picked from the browser language, switchable in Settings.
- **Sound effects** generated with Web Audio (no audio files), plus optional vibration on phones. Mute from the header.
- **Installable app (PWA)**: works offline once loaded; on Android use *Install app* in Settings, on iPhone use *Share → Add to Home Screen*.

Progress is saved in your browser's `localStorage`: the creature in `glimmerglade.save.v1`, and wallet, bag, achievements and settings in `glimmerglade.profile.v1`.

## Ideas for later

An RPG expedition mode, a creature encyclopedia, more evolution branches and creature lines, more mini-games, and idle progression. See the project plan.

## Compact home

The home fits on one phone screen. Five status icons sit above the window (tap them to see names and numbers), the eight care buttons are one row under it, and the battle stats start folded. Every menu (shop, tasks, season, refuge, cards, map, achievements, settings, food and bag) opens as a sheet over the game instead of at the end of the page. The shop, the food menu and the bag are grids of pixel icons; tapping one opens a small card with the picture, price or amount, description, effects and one confirm button.

## Cards and teams

Card art is now a lore scene for every card (`scenes.js`, built from the card-scenes sources in the project files). Each loadout slot is a row with the card's thumbnail, name, type, grade and its effect in that slot, plus a Change button that lists every card that fits with its effect for that slot. The new Teams menu shows your creature and two Refuge companions with their cards, and keeps up to 5 named sets; sets load from the menu or with one tap before an expedition (missing creatures or copies are skipped and reported). The card collection and the achievements are grids; tapping one opens the whole card or the medal.

## Scenes in the window

- The Map button no longer opens a separate panel: the places of the current map (home or El Vado) appear as a menu laid over the game window, and the window itself shows where your creature is walking. In the side view it still opens the old map panel.
- Conversations (Tila, the Root, the bottle, the trail) show at the bottom of the game window, with portraits and answers inside it.
- After a fight, the summary is a card over the last frame of the battle, with the card choice inside (each found card can be opened whole with "See card"), plus Continue and Go home.
- The expedition screen keeps the parchment map on top; zones, the Deep Root and the Guardian's Echo are tabs below it.

## Repeat hatches: stars

- A creature you already have that hatches again gains a star (up to 5): +4% to its stats per star, a trait at ★2 (+5% crit) and ★4 (+6% dodge), a piece of its story at ★2 and ★4, and a golden border at ★5. Past 5 stars, a repeat gives Stardust as before.
- While a rarity still has creatures you don't own, a repeat roll has a 50% chance to become one of them.

## Builds (upgradable places, delivery 1)

- New **Builds** menu. Each place goes from level 1 to 5 for Chispas plus **Wood** (a new resource from the Garden and from expeditions: 3–4 per win, 1 per loss). Only one build runs at a time, and each finished expedition brings it 2 h closer. Every finished expedition also moves Refuge jobs 1 h, the garden 3 h and incubating eggs 3 h forward: anything that takes time can be sped up by playing. There's no real money and no paid speed-up.
- Builds take their final times (2 h to 24 h). For testing, set `FAST = true` in `build.js` to make them short (15 min to 4 h) and Refuge jobs six times faster.
- **Garden** (home, next to the bowl): basic food (berries, honey buns) is no longer unlimited. It grows in the Garden while you're away: 3 meals a day at level 1, up to 8 at level 5. It holds up to 12 meals, and later levels also grow melon and stew, plus a little Wood. Harvest it by walking there or from the Builds menu. The Garden drawing grows with its level.
- **Incubator**: eggs hatch 6% to 25% faster, and level 5 adds a 4th slot on top of the Keeper Level slots.

## Builds, delivery 2: luck and paths

Six more places in the Builds menu, each improved on its own:

- **Pantry**: the free daily pull gets +2 points of special-prize chance per level, up to +10.
- **Well of Echoes**: one free pull every week for everyone. Each level adds +2 points of Rare or better to every Well pull, up to +10, taken from Common and Uncommon. Pity, floor and the Promise don't change.
- **Path to El Vado**: +1, +2, +3, then +5 steps in the daily recharge.
- **Foraging nook**: up to 3 searches a day.
- **Refuge nests**: companions who stay home get 10% to 50% of the trip's experience. At level 5, petting gives +2 Bond.
- **Guild workshop**: crafting a card in the Grimoire costs 9, then 8, then 7 Stardust instead of 10.
- Upgraded places on the map show a small row of gold marks, one per level above 1.

## Builds, delivery 3: jobs and requests

- **Refuge jobs**: in the Builds menu, send a hatched companion to work at the Garden (food, Wood), the Guild workshop (Stardust), the Pantry (Chispas) or the Foraging nook (items) for 2, 4 or 8 hours (a sixth of that while builds are in fast mode). A companion whose type fits the place earns 1.5×, and each level of the place adds 10%. Up to 2 jobs at once, 3 with Refuge nests at level 3. Working companions can't go on expeditions. Collecting gives +1 Bond.
- **El Vado requests**: a new board on the El Vado map (also listed in the Builds menu). Every day two neighbours (Ruda the baker, Bruno the boatman, Esporina the mushroom forager, Mirlo the postman) ask for food, Wood or Stardust and pay in Chispas and Wood, with a 15% chance of a Note. Mirlo also passes on a rumour.
- **Storage**: the Garden only holds so much food (4 to 12 by level) and 6 Wood, and finished jobs wait until you collect them. The Builds button shows a dot when something is ready.

## Checking the game data

`node tools/check.js` checks that the game's data fits together, and the **Check game data** GitHub Action runs it on every pull request:

- every zone's foes, allies and boss exist, and every zone has texts in both languages, a place on the map and a background that is drawn;
- every event a zone can roll has its text and choices in both languages;
- every card has a name and flavour line in both languages and a lore scene, and every card a player can own has its small art and an animation;
- the text tables have the same keys in Spanish and English;
- every zone, creature (bosses aside) and card reads back as a whole entry from the registry;
- the home maps all have the same size, and every place stands on a free tile and does something when tapped;
- 200 battles with fixed random seeds all end cleanly.

It needs the `playwright` package (`npm i --no-save playwright`), because the second half runs in a headless browser.

`node tools/economy.js` estimates the Chispas a new, a mid and an advanced player earn and spend on a typical day, and how many days of Chispas and of wood all the builds take (design rule 8). It reads prices and rewards from the game files, so it follows every change; `--release` assumes `FAST` is off in `build.js`, `--json` prints the raw numbers. It only warns, never fails.

All modules share one clock, `EV.every(ms, fn)`, which stops while the tab is hidden and catches up when it comes back.

## Where the RPG code lives

The old `rpg.js` is now split into `rpg/`. They are still plain scripts, loaded in this order by `index.html`, and they share their top-level names:

| File | What it holds |
|---|---|
| `data-cards.js` | the type table (the only place for a type's circle, colour, opposite and names; beats, opposites, circles and the Grimoire order are derived from it), grades, statuses, skill cards and card scaling |
| `data-mons.js` | creatures and level curves |
| `data-zones.js` | expedition zones and the list of path events |
| `data-events.js` | what each choice of a path event does (xp, coins, cost, heal, hurt, fights, chests, flags, 50 % rolls, flag conditions) |
| `engine.js` | battle units and the `Battle` engine (no DOM; `tools/check.js` runs it in Node) |
| `text-es.js`, `text-en.js` | all RPG texts, one file per language (interface, zones, events, creature blurbs, card names) |
| `ui-core.js` | text helpers, card text and card HTML, saved data |
| `ui-style.js` | CSS for expeditions, battles and cards |
| `ui-art.js` | extra sounds, achievements, drawing of the other creatures |
| `ui-expedition.js` | expedition state, zones, key items, parchment map, views, card picker, teams |
| `ui-battle.js` | battle presentation and drawing |
| `ui-events.js` | path events, ending the trip, click wiring |
| `ui-cards.js` | cards panel (collection, Grimoire, shop) |
| `ui-hooks.js` | hooks into the main game and the `EV.RPG` export |
| `registry.js` | one entry per zone, creature and card, and the way to add new ones |

To add a script, add its `<script src>` tag to `index.html` and its path to `CORE` in `sw.js`. `python3 tools/build-single.py out.html` inlines every script into one file.

## Player-first rules (from the player-review study)

Jose approved eight rules to keep in every feature. These are the first three:

- **Nobody leaves because you were away.** While the game is closed or hidden for more than two minutes, food, fun, energy and cleanliness never drop below 25 and health never drops below 30 (unless they were already lower). If health still reaches zero, the creature rests at the Refuge: it comes back with 60 health, cured and clean, keeping its level, cards and companions. **Hard mode** in Settings brings back the old rule where it leaves for good.
- **Care only adds.** In battle each care value now gives 0 % to +25 % to its stat (it used to be −25 % to +25 %).
- **Backups.** Settings → Backup saves the whole game (creature, profile and journal) as a `.json` file and loads it back. A gentle reminder appears once a week for games with some progress.

- **Walking and setting out are free** (rule 5). Going between the Glade and El Vado and leaving on an expedition no longer cost 👣 Steps; steps are only spent on rewarded actions (the foraging nook). Expeditions still use the usual energy.

To add a path event: write its texts in `EVT` in both `rpg/text-*.js` files, its effects in `rpg/data-events.js` (one object per choice) and its id in a zone's `events`. `node tools/check.js` fails if any of the three is missing, if the choice counts differ, or if an effect has an unknown key.

## Adding content

A zone, creature or card still lives in a few tables (rules, texts in both languages, art), so `rpg/registry.js` gathers each one in a single place:

- `EV.RPG.zone("aurora")`, `EV.RPG.creature("brotin")`, `EV.RPG.card("acorn")` return everything the game knows about it: rules, texts, map position and paths, key items, background, events with their effects, which zones a creature lives in, which creatures own a card, whether it has art.
- `EV.RPG.addZone(id, def)`, `addCreature(id, def)` and `addCard(id, def)` add a new one in one call and refuse it with a clear message if a piece is missing (a text in one language, an unknown creature or card, an event whose choices and effects differ, an incomplete colour set). `def.decor` can bring the zone's own background as a drawing function, and `def.events` its own path events.
- `EV.WORLD.addPlace("home", place)` adds a spot to a home map with its name in both languages, its drawing (`obj` can be a function) and what tapping it does (`act`). Tap actions for the built-in places live in the `ACT` table in `world.js`.

The launch content stays in the data files; these calls are for new content and tests. A new creature without a sprite in `sprites.js` is drawn with the plain fallback shape.

## Saving

The game keeps three things in the browser: the creature, the profile (everything that outlives a creature) and the journal.

- **When it saves.** `save()` and `saveProfile()` only mark the game as changed. It is written at most every 5 seconds, and straight away when the tab is hidden or closed, instead of every second as before.
- **Other tabs.** If another tab (or a loaded backup) writes the game in the meantime, this tab stops saving and asks you to reload it, so two open tabs can't overwrite each other.
- **Versions.** The creature and the profile each carry a version (`SAVE_V`, `PROFILE_V` in `index.html`). To change their shape, raise the version and add `MIGRATE.save[old]` or `MIGRATE.profile[old]`, a function that updates an old save; saves and backups from any older version are brought up to date when they load. A save from a newer version of the game is played but never written over, so an old cached copy of the game can't damage it.
- **Module parts.** Each module keeps its part of the profile (`P.d`, `P.eg`, `P.bd`, `P.well`, `P.cosm`, `P.team`) through `EV.slice(key, fresh)`. The first time, the part is made from `fresh()`; later, any field that a newer version added to `fresh()` is filled in for older saves.

## Card filters

The collection has a search box (name, type, owner, effects and lore, ignoring accents) and a sort menu (usable first, newest, rarity, type, name, copies) with a button to reverse it. **Filters** opens chips for type, rarity, effect (damage, several targets, healing, shield and defence, foe statuses, boosts, cleanse) and quick toggles (favourites, usable, in use, ready to upgrade). Chips of different groups combine. Open a card to mark it as a favourite: favourites show a star and always come first. Favourites and the sort order are saved; the filters reset on reload. The same search, sort and filters appear in the card picker used everywhere cards are chosen (your creature's slots, Teams, the companions' cards and the screen before an expedition), with their own filter state and only the types that picker offers.

## Zone levels when you come back stronger

Above a zone's level, its foes only grow by a share of your extra levels: in the first zone 50 % for one extra level, 33 % for two, 25 % for three, and so on, never below 10 %. Later zones keep a bigger share (`zoneShare` in `rpg/ui-expedition.js`). The zone list shows the guardian's current level. Savia Mode and the Guardian's Echo still grow with you in full.

## Caretaker's Guide and progress bars

`guide.js` adds the Caretaker's Guide (design rule 6). The first time you open each system (the Glade, cards, teams, tasks, Refuge, season, builds, shop, achievements, memories, expeditions) a short note explains it, with **Got it** and **Open the guide**. The **Guide** button in the menu keeps every note and a glossary of all six currencies (✦ Chispas, ♪ Song Notes, ∴ Stardust, 🪵 Wood, 👣 Steps, 🕯 Wax): how you earn each one and what it is for. "Show the notes again" resets them. Seen notes live in `P.guide`. To add a note for a new system, add `TIPS[lang][panelName]`.

`desktop.js` is the wide-screen layout (1000 px wide and up, so PC, laptop and tablet in landscape; phones keep the one-column layout). The top buttons become a menu rail on the left; the home window is sized from the screen height so the window, the care row and the Expedition button fit without scrolling, and the side panels scroll on their own; menus open as a wide window with their sections side by side (tasks, cards, teams, builds, season, settings, guide); the expedition map sits beside the zone list, getting ready puts the formation beside the companions and deck with Set out always visible, and path and encounter pictures keep to the screen height with the choices beside them. All rules live inside one media query, so a new screen only needs a desktop rule there if it scrolls too much on a PC.

Progress toward upgrades (design rule 7) is shown as bars: a build's next level shows how much of its Chispas and Wood you have, a card shows its copies toward the next rarity (for example 3 / 5), and the creature's age shows how close it is to growing up. These join the bars that were already there (creature and companion levels, Bond, eggs, tasks, season pass).


## Song's Fork: talents every 3 levels

`rpg/data-talents.js` and `rpg/ui-talents.js` add the Song's Fork (the first MiniTroopers idea Jose approved). At levels 3, 6, 9, 12… a creature offers two talents from its own types, always one offensive and one defensive (tier k uses `types[(k - 1) % types.length]`). Each talent adds a few % to strength, life, defence or speed, or points of crit or dodge; `makeUnit` adds them up. Your creature's talents show on its sheet in the Cards panel and each companion's on its Refuge card, with a bar toward the next one. No choice is final: changing a creature's talents costs 10 ∴ Stardust per pick and opens the choice again. Picks are stored as a string of `o`/`d` letters, in `S.rpg.tal` for your creature and `roster[kind].tal` for companions. To add a type's talents, add `TALENTS[type] = { o: {...}, d: {...} }`.

## Birth traits

Every Refuge companion is born with one small trait of its own (the second MiniTroopers idea), so two creatures of the same kind feel like different individuals. The ten traits live in `BIRTH` in `rpg/data-talents.js`: most add a little to one stat (Brave +4 % strength, Shy +3 dodge, Early riser +5 % speed by day, Night owl +5 % at night, Sleepyhead +9 % life but −3 % speed); Cuddly gives +1 extra Bond when petted and Curious +20 % trip experience. A new hatch rolls one (`roster[kind].bt`); companions hatched before this get a fixed one from their kind and birth time. When a repeat hatch gives a star, the sibling has its own trait and you choose which one your companion keeps, so a bad roll is never final. The trait shows on each Refuge card (🥚) and `companionTal` adds it to the companion's talents in battle.

## Duels: ghost teams

`rpg/ui-duels.js` adds the third MiniTroopers idea, a **Duels** tab on the expedition screen (once a guardian is calm). Duels are free: no energy, no wounds, no experience, and losing costs nothing. Only the first win against each team gives a reward.

- **El Vado's ladder**: every week four neighbours bring a team built around one type circle: Ruda (Sun), Bruno (Lake), Esporina (Frost) and Mirlo (Sky). Their teams are seeded by the week, so they stay the same until Monday, and they are your level −1, +0, +1 and +2. Beat one to unlock the next. First wins pay ✦ 15 / 20 / 25 / 30, a little Stardust, and Mirlo also gives a Song Note.
- **Friends' codes**: "Your team code" turns your creature and your saved team's companions (cards, talents, birth traits, stars, Bond) into a `EVO1-…` text code. Pasting a friend's code saves their team (up to 6) to fight against, played by the AI. The first win against each code gives ✦ 20 and ∴ 5, at most 3 times a week, so made-up codes can't be farmed. Pasted codes are fully validated (known creatures and cards, level and grade ranges, a short plain-text name).
- Saved in `P.duel` (`EV.slice("duel")`). The duel reuses the expedition pick screen and battle (`X.duel`), with no zone bonus.

## PNG art

The drawn creatures and scenes are placeholders. Final art comes as PNG files in `art/` (format and list of images: https://claude.ai/artifact/9UqayD6TF3MiAmNBX3XTCh). `art.js` loads every file listed in `art/manifest.json` and each one replaces the placeholder it names; anything missing keeps the placeholder, so art can arrive a few files at a time.

- `art/creatures/<kind>.png`: 64 px cells, 10 columns (front A/B, back A/B, side facing right A/B, happy, sad, surprised, asleep) and one row per stage. `art/guardians/<kind>.png`: the same in 96 px cells.
- `art/maps/home.png` and `home-front.png` (720 × 528, the 15 × 11 grid at 48 px; front holds what covers the creature). The home is drawn at 3x when there is PNG art for it, so every pixel shows.
- `art/events/<id>.png`, `art/events/<id>--<ending>.png`, `art/pause/<zone>-<kind>.png`, `art/cards/<card>.png`: 256 × 192, shown at 2x.
- `art/battle/<zone>-day.png` and `-night.png` (360 × 240) replace the drawn battle sky and ground (if only one exists it is used for both). In battle, creature and guardian sheets are drawn 1:1 on the full-size canvas, facing sideways when calm and using the emotion frames when hit, casting or weak; hollowed foes are dimmed towards plum. Savia, formation patches, bars and card effects keep drawing on top.

Images generated elsewhere (Gemini prompts: one image per stage with the 10 poses in a 5 × 2 grid on flat #00FF00 green) go through `python3 tools/art-import.py` first (needs Pillow): it keys out the green, finds each pose, scales every pose of a sheet by the same factor, stands them on the cell floor, and reduces the colours to one shared palette with hard edges. Run it with no arguments for the modes (creature, guardian, scene, map, battle).

`art/objects/<kind>.png` replaces a thing drawn on the maps (tree, flower, lamp, bed…), at map scale: 16 px a tile, standing on its base tile. `art/faces/tila.png` (up to 40 × 40) is Tila's face in conversations. The current home and El Vado ground, the trees, flowers and well, and Tila (the pack's Woman) come from the CC0 Ninja Adventure pack: `python3 tools/ninja-maps.py <pack folder>` paints every map's rows from its tiles (autotiled paths and ponds, trees on the border). Credits for outside art live in `CREDITS.md`.

After adding files run `node tools/art.js`: it writes the manifest and warns about wrong sizes, unknown names and semi-transparent creature edges. `tools/build-single.py` inlines the art into the one-file build.

## Creatures from the pack

Since 2026-11-07 every creature, story ones included, is a monster of the CC0 Ninja Adventure pack (Jose's call, for one consistent look). `tools/ninja-maps.py` lists which monster each creature is; its stages are the monster at 2x and 3x, and the adult at 4x in the pack's second colour when it has one. `art.js` also answers `EVS.sprite` and `PX.sprite` with the sheet (read back at its own pixel size and scaled by a whole number), so cards, the Refuge, eggs and portraits show the same pictures as battles and the home. The nine guardians are the pack's bosses (two idle frames in 96 px cells, at 2x when that fits; mapping in the same tool). The places on the maps (bed, bowl, boards, signs, lamps, stall, nests, shop, lectern) come from the same pack; the Root (the pack's old gnarled trunk, with its green breath drawn on top), the bottle (the pack's water flask, bobbing), the foraging nook (`patch-<circle>.png`: berry bush, white flowers, a stone, a frosted sprig; the Star circle keeps its drawn sparkle) and the garden (`garden-1..5.png`, tilled rows filling up, a fence from level 3, a barrel at 5; ripe produce is drawn on top) come from it too.

## Wild creatures

`rpg/data-wild.js` adds eight filler foes, one per zone: Fulgor (Aurora), Chisporro (Crater), Cañín (Forest), Ojuelo (Hollow), Ajolín (Lake), Topacio (Caves), Ululú (Heights) and Sombrerín (Deep). Their pictures are monsters from the CC0 Ninja Adventure pack (`tools/ninja-maps.py` builds `art/creatures/<id>.png`), their names and lines are ours, and they borrow the cards of a creature of their type. `wild: true` keeps them out of eggs, duels and the card owner lists, so they only show up as foes; each joins its zone's foe list once, so about one fight in five meets one. The story creatures stay original art.

Every path conversation (all 93) starts on a picture composed from the same pack: `python3 tools/ninja-scenes.py <pack folder> [zone or event ...]` paints a small 8 × 6 tile scene for each one (tiles, houses, props, the pack's people standing in for ours, our creatures read back from `art/creatures/`), lights it (day, dusk, dawn, night with lantern and fire glows, caves, fog with a clear patch round what matters, rain, snow) and writes `art/events/<id>.png` at 2x. The scenes live in `tools/scenes/<zone>.py`, one small function per event registered with `@scene("id")`. The Meadow lanterns burn Savia, so their light is cold. Every ending of those conversations (198) gets its picture too, `art/events/<id>--<key>.png`: the same scene re-lit by the ending's mood, with your team (Lumo, Pebb, Fizz), the foes and the props of the outcome (card, coins, notes, fire...). The specs come from the drawn endings: `tools/scenes/endings.json` is `EVSCENE.endSpec(id, key)` for every ending, dumped from the game (mood m, team pose, props p, z = a second look with the scene mirrored, npc false = the people have gone). The same kit builds the zones as places (`tools/scenes/places.py`): the battle backgrounds `art/battle/<zone>-day|night.png` (360 × 240) and the 63 expedition pauses `art/pause/<zone>-<kind>.png` (camino, pelea, cofre, descanso, jefe with the zone's guardian, victoria, regreso). Run `python3 tools/ninja-scenes.py <pack> battle pause` for only those. The 84 cards' lore scenes come from the same kit too: each zone file ends with its cards, registered with `@card("id")`, written to `art/cards/<id>.png` (256 × 192; `cards` or a card id builds only those). The card box shows the middle 5:3 of the picture, so each scene keeps its subject between rows 10 and 86; thumbnails show all of it. Settings > Pictures switches back to the drawn start, ending and pause pictures, card scenes and battle backgrounds ("Classic"), which stay in `scenes.js` and `rpg/ui-battle.js`.

## Savia levels per zone

Every zone shows how much Black Sap is left in it (visual language guide, section 8): a zone you have never calmed is dripping (2), calming its guardian leaves veins (1), and three stars clean it (0). The guardian's fight, the Guardian's Echo and Savia Mode always show the Root (3). The level appears as dark drops on the parchment map and a line in the zone list, and battles paint it over the zone background: veins in the ground, puddles dripping upward with less colour, and a vignette of veins for the Root. The end-of-trip card says when the Sap pulls back. It only changes how things look (`saviaLvl(id)` and `drawSap` in `rpg/ui-expedition.js`).

## Gentle weather

`weather.js` gives the Glade and El Vado rain, fog or snow. The weather changes every 6 hours and is picked from the date, so every device shows the same sky and nothing is saved. It follows the season (northern calendar): snow only in winter, more rain in spring and autumn, mostly clear in summer. It only ever helps (design rule 2): rain makes the garden grow 25% faster, fog makes your creature tire 15% more slowly, snow makes it get bored 20% more slowly; effects apply only while the game is open. The window shows the weather and its effect, the map draws the drops, flakes or fog banks, and the Guide explains it the first time. For tests: `EV.WEATHER.force("rain")`.

## Expeditions left halfway are kept

Closing the game in the middle of an expedition loses nothing (design rule 3). The trip is saved at every stop: the path choice, an event, a reward and the look before a fight. The home button then reads "Resume the expedition" and takes you back to that stop, without spending energy again. A fight in progress starts again from its beginning, with the health the party had before it. Duels are not kept. The saved trip lives in `P.run`, and it is forgotten when the trip ends or when you raise a different creature.

## A picture for every pause

Every stop on an expedition shows a picture of its zone, drawn by `EVSCENE.pause(zone, kind, mode)` in `scenes.js`: the path choice (`camino`, or `jefe` before the guardian), a short look before each fight (`pelea` / `jefe`, which moves on by itself after 1.6 s or with a tap), the rest (`descanso`), the chest (`cofre`), the reward after a win (`victoria`) and the way home (`regreso`). Savia and Echo runs get their own tint. Old short events show the path picture; conversations keep their own scene. Duels keep the battle snapshot.

## Illustrated path conversations

The path events now include illustrated conversations, in the style of Life in Adventure. They were written in the thread "Crear eventos ilustrados por etapa", and Jose approved them. There are 12 in the Prado Aurora and 9 in each of the Cráter, Bosque, Hondonada, Lago and Cuevas, plus 10 common ones (campfires, springs, chests...) that can come up anywhere.

- **Data:** `rpg/events-<zone>.js` holds `window.EVEVENTS[zone][id]` with the Spanish text and effects. `rpg/events-<zone>.en.js` holds the English text in the same order.
- **Shape:** each event is a small conversation:
  - nodes say lines;
  - options lead to other nodes or back to a hub, and "once" options disappear after use;
  - `cNeed` options only show once another event has set their flag;
  - a node with `end` closes the event with the usual `EVENT_FX` effects, plus `foes` for a fight against named creatures.
  - `need` gates when an event can appear, by lore layer and flags.
- **Scenes:** each event has a 128 × 96 pixel-art scene, `EVSCENE.event(id)` in `scenes.js`, drawn above the conversation.
- **The deck:** `rpg/ui-talk.js` keeps a shuffled bag for each zone (`P.evDeck`). It holds the zone's old short events plus the conversations that are open now. Draws never repeat until the bag is empty, and the same event never comes twice in a row. Lore events from `lore.js` keep their 45 % chance first.
- **Common events:** events under the zone key `common` (campfires, treasures...) can come up anywhere. Each time a zone reshuffles its bag, up to 3 of them join it (`COMMON_SHARE`); an optional `zones: [...]` limits one to some zones.
- **Checks:** `node tools/check.js` validates every conversation file. That covers where options lead, speakers, matching English line and option counts, effect keys, known foes, and ids that clash with short events.

## Nothing daily expires (design rule 4)

Daily things now pile up for up to 3 days instead of being lost when you skip a day. `EV.DAILY.charge(o, per, cap)` in `daily.js` tops up a `{ day, left }` counter by `per` for each day that passed, up to `cap`. It never takes away what is already there.

| What | Before | Now |
| --- | --- | --- |
| Pantry free pull | 1 a day, lost if unused | up to 3 saved |
| Petting each Refuge companion | once a day | up to 3 pats saved (`roster[k].pc`) |
| Foraging nook | once a day (more with the Nook build) | up to 3 days of searches saved |
| El Vado requests | replaced every day | unfinished ones stay up to 3 days (6 at most on the board) |
| Season event help | once a day | up to 3 helps saved |
| Steps | up to 20 saved | up to 30 saved |

Daily and weekly tasks already kept 2 unfinished days, and the 28-day calendar only moves when you claim it, so neither of them changed.
