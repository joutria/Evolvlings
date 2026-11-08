# Lago: the Tides' camp of boat-houses on the mud, the still Mirror Lake and its wooden sanctuary.

def boat(): return cut("TilesetWater", 400, 0, 48, 16)
def planks(w=4, h=2): return tile("TilesetWater", 0, 12, w, h)


def rope(s, pts, cols=((200, 60, 60), (60, 120, 200), (230, 190, 60))):
    for i in range(len(pts) - 1): s.d.line([pts[i], pts[i + 1]], fill=cols[i % len(cols)] + (255,))
    return s


@scene("bajada")
def bajada():
    """Night falls on the Stream camp: the Tides sit in a ring round a puddle, all that is left of the stream; an old man combs the water."""
    s = Scene("grass", ["........", "........", "...~~...", "...~~...", "........", "........"])
    s.put(char("OldMan3", "down", 6), 64, 34)
    for x, y, d in ((40, 50, "right"), (88, 50, "left"), (46, 74, "up"), (82, 74, "up"), (64, 80, "up")): s.put(char("Villager2", d), x, y)
    return s.glow(64, 40, 30, MOON, 0.5).lit("night")


@scene("barcas")
def barcas():
    """The camp's boat-houses, tied with coloured ropes, all aground in the mud; a Tides girl jumps deck to deck checking the knots."""
    s = Scene("snow", ["........"] * 6, var=1)
    for x, y in ((28, 40), (84, 36), (40, 74), (96, 72)): s.put(boat(), x, y)
    rope(s, [(40, 34), (60, 30), (78, 30)]); rope(s, [(30, 68), (60, 66), (90, 66)])
    s.put(char("Child", "right"), 84, 30)
    return s.lit("day")


@scene("espejismo")
def espejismo():
    """The Lake so still you cannot tell water from sky. In the reflection by the shore, the Vado: your house, windows dark, door open."""
    s = Scene("grass", ["........", "~~~~~~~~", "~~~~~~~~", "~~~~~~~~", "~~~~~~~~", "~~~~~~~~"])
    h = cut("TilesetHouse", 0, 0, 64, 48).transpose(Image.FLIP_TOP_BOTTOM)
    h = Image.blend(Image.new("RGBA", h.size, (0, 0, 0, 0)), h, 0.55)
    s.at(h, 32, 30)
    return s.lit("cold")


@scene("santuario")
def santuario():
    """The Mirror Sanctuary, a wooden platform in the middle of the Lake: an old woman in a blue hood sits with her back to the water."""
    s = Scene("grass", ["~~~~~~~~"] * 6)
    s.at(planks(4, 3), 32, 24)
    s.put(char("SorcererBlack", "up"), 64, 56)
    return s.lit("cold")


@scene("pez")
def pez():
    """In the shore mud gasps a huge silver fish, old as a log; two Tides children poke it; a grandmother shouts from a boat."""
    s = Scene("snow", ["........", "........", "........", "........", "~~~~~~~~", "~~~~~~~~"], var=1, water="grass")
    s.d.ellipse([44, 46, 84, 58], fill=(196, 206, 216, 255), outline=(80, 90, 104, 255))
    s.d.polygon([(84, 52), (94, 46), (94, 58)], fill=(176, 186, 196, 255), outline=(80, 90, 104, 255))
    s.d.point((50, 50), fill=(20, 20, 30, 255))
    s.put(char("Child", "right"), 32, 54).put(char("Boy", "left"), 100, 60)
    s.put(boat(), 30, 86).put(char("OldWoman", "up"), 30, 82)
    return s.lit("day")


@scene("aguador")
def aguador():
    """Up the camp road comes a Meadow man pulling a cart of barrels marked CLEAN WATER; Tides people follow with empty buckets."""
    s = Scene("snow", ["........", "========", "========", "========", "........", "........"], var=1)
    s.put(cut("TilesetElement", 32, 48, 32, 32), 46, 52).put(char("Villager", "right"), 70, 52)
    for x in (16, 28, 40) : s.put(char("Villager2", "right"), x - 10, 72)
    return s.lit("day")


@scene("diario")
def diario():
    """Under the Sanctuary platform, knee-deep in water, Orilla reads a notebook wrapped in oilcloth, its covers muddy."""
    s = Scene("grass", ["~~~~~~~~"] * 6)
    s.at(planks(8, 2), 0, 0)
    for x in (16, 48, 80, 112): s.d.rectangle([x, 32, x + 3, 60], fill=(110, 76, 46, 255))
    s.put(char("Princess", "down"), 64, 70)
    s.d.rectangle([62, 64, 66, 67], fill=(120, 100, 70, 255))
    return s.lit("gloom")


@scene("cara")
def cara():
    """In a still arm of the Lake, a Tides girl calls you from the water. Only from the water: there is no one on the shore."""
    s = Scene("grass", ["........", "........", "........", "~~~~~~~~", "~~~~~~~~", "~~~~~~~~"])
    girl = char("Princess", "down").transpose(Image.FLIP_TOP_BOTTOM)
    s.d.rectangle([60, 50, 68, 52], fill=(200, 40, 40, 255))
    s.at(Image.blend(Image.new("RGBA", girl.size, (0, 0, 0, 0)), girl, 0.7), 56, 52)
    return s.lit("cold")


@scene("flotan")
def flotan():
    """Water is back at the Stream camp: the boat-houses float, crooked, still tied with their coloured ropes; people sing and hug."""
    s = Scene("grass", ["~~~~~~~~"] * 4 + ["........"] * 2)
    for x, y in ((28, 30), (84, 26), (52, 56)): s.put(boat(), x, y)
    rope(s, [(40, 24), (60, 22), (78, 20)])
    for x, d in ((40, "right"), (56, "down"), (72, "left"), (90, "down")): s.put(char("Villager2", d), x, 88)
    return s.lit("day")


# ---------------- Cards (art/cards/<id>.png): the card box shows y 10..86 ----------------

@card("whirl")
def c_whirl():
    """In an eddy of the stream Remolín floats belly up, spinning, happy; beside it a bottle spins that cannot get out."""
    s = Scene("grass", ["........", "~~~~~~~~", "~~~~~~~~", "~~~~~~~~", "~~~~~~~~", "........"], water="grass")
    for r in (10, 18, 26): s.d.arc([60 - r, 50 - r // 2, 60 + r, 50 + r // 2], 20, 320, fill=(200, 230, 250, 255))
    s.put(mon("remolin", "up"), 56, 56)
    s.put(item("Potion", "WaterPot.png"), 76, 50)
    return s.lit("day")


@card("vessel")
def c_vessel():
    """In the Tides' temple Mother Marejada pours water into vessels of many shapes; Remolín has climbed into a bowl and taken its round shape."""
    s = Scene("sand", ["........"] * 6, var=1)
    s.d.rectangle([0, 0, 128, 24], fill=(90, 120, 140, 255)); s.d.line([(0, 24), (128, 24)], fill=(40, 60, 70, 255), width=2)
    for x, (w, h) in zip(range(20, 120, 20), ((8, 14), (12, 8), (6, 18), (10, 10), (14, 6))):
        s.d.rectangle([x - w // 2, 60 - h, x + w // 2, 60], fill=(190, 120, 80, 255), outline=(90, 54, 34, 255))
    s.put(char("OldWoman", "down"), 46, 46)
    s.d.ellipse([56, 70, 76, 80], fill=(190, 120, 80, 255), outline=(90, 54, 34, 255))
    s.put(mon("remolin", "down"), 66, 76)
    return s.lit("day")


@card("guest")
def c_guest():
    """On the Tides' pier an Underside family arrives with their bundles; before asking anything, a village girl offers them a glass of water. Remolín peeks from the water."""
    s = Scene("sand", ["~~~~~~~~", "~~~~~~~~", "~~~~~~~~", "........", "........", "........"], water="sand")
    s.put(boat(), 30, 32)
    for n, x in (("Villager2", 48), ("Child", 60), ("Villager", 72)): s.put(char(n, "down"), x, 60)
    s.put(char("EggGirl", "up"), 62, 82); s.d.rectangle([68, 72, 70, 75], fill=(170, 210, 240, 255))
    s.put(mon("remolin", "down"), 100, 30)
    return s.lit("dusk")


@card("truewater")
def c_truewater():
    """At night on the Mirror Lake, Mother Marejada draws water in a bowl; in the lake the shore lantern is reflected clean and pretty, in the bowl it is not."""
    s = Scene("grass", ["~~~~~~~~"] * 4 + ["........"] * 2, water="grass")
    s.put(cut("TilesetElement", 96, 48, 16, 32), 26, 72).glow(26, 48, 26, COLD, 1.0)
    s.put(flip(cut("TilesetElement", 96, 48, 16, 32)).transpose(Image.FLIP_TOP_BOTTOM), 26, 96 - 24)
    s.put(char("OldWoman", "up"), 70, 80)
    s.d.ellipse([78, 76, 90, 82], fill=(150, 104, 62, 255), outline=(70, 46, 28, 255)); s.d.ellipse([80, 77, 88, 80], fill=(40, 20, 50, 255))
    s.sap(84, 79, 3, 1)
    return s.lit("night")


@card("lostwave")
def c_lostwave():
    """Orilla kneels at the Mirror Lake and sets a folded letter afloat towards the red glow of the Crater, where her sister Ola works."""
    s = Scene("grass", ["~~~~~~~~"] * 4 + ["........"] * 2, water="grass")
    s.glow(110, 0, 50, FIRE, 1.1)
    s.d.polygon([(54, 56), (62, 52), (66, 56), (58, 60)], fill=(240, 236, 220, 255), outline=(140, 130, 110, 255))
    s.put(char("EggGirl", "up"), 60, 80).put(mon("vidriela", "up"), 82, 78)
    return s.lit("dusk")


@card("reading")
def c_reading():
    """At dawn Vidriela floats over the still lake and looks at the reflection; there is no one on the shore, but in the water a blow that has not yet happened."""
    s = Scene("grass", ["~~~~~~~~"] * 5 + ["........"], water="grass")
    s.put(mon("vidriela", "down", 1), 64, 36).glow(64, 30, 24, (200, 230, 255), 0.8)
    s.put(dim(char("Knight", "right").transpose(Image.FLIP_TOP_BOTTOM), 0.6), 54, 70).put(dim(char("Villager2", "left").transpose(Image.FLIP_TOP_BOTTOM), 0.6), 72, 70)
    s.d.line([(60, 62), (66, 60)], fill=(220, 220, 255, 255))
    return s.lit("dawn")


@card("mirror")
def c_mirror():
    """Orilla leans over the Deep Mirror; in the water it is not her grown-up self but two little girls hand in hand, she and her sister Ola."""
    s = Scene("grass", ["~~~~~~~~"] * 4 + ["........"] * 2, water="grass")
    s.put(guardian("mira"), 100, 44)
    for x in (54, 66): s.put(dim(char("Child", "down").transpose(Image.FLIP_TOP_BOTTOM), 0.75), x, 56)
    s.put(char("EggGirl", "up"), 60, 82)
    return s.lit("dusk")


@card("gaze")
def c_gaze():
    """From the bottom of the Mirror Lake everything looks small: the boats and people above are tiny silhouettes. A huge eye watches them from below."""
    s = Scene("grass", ["~~~~~~~~"] * 6, water="grass")
    for x, y in ((30, 22), (90, 28)): s.put(dim(boat(), 0.25), x, y)
    for x in (50, 60, 74): s.put(dim(char("Villager", "down"), 0.2), x, 18)
    s.d.ellipse([34, 50, 94, 84], fill=(230, 236, 220, 255), outline=(30, 40, 50, 255), width=2)
    s.d.ellipse([54, 54, 74, 80], fill=(60, 140, 160, 255)); s.d.ellipse([60, 60, 68, 74], fill=(10, 14, 20, 255)); s.d.point((62, 61), fill=(255, 255, 255, 255))
    return s.lit("deep")
