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
