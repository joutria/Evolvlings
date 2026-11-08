# Cráter: forges on warm sand and stone, the pack's desert houses, glowing doors.

def forge(): return cut("TilesetHouse", 464, 0, 64, 64)
def dhouse(k="a"): return {"a": cut("TilesetDesert", 96, 0, 64, 64), "b": cut("TilesetDesert", 0, 0, 32, 48)}[k]
def cliff(): return tile("TilesetRelief", 8, 5, 4, 2)


def forge_glow(s, x, y, r=26): return s.glow(x, y, r, FIRE, 1.0)


@scene("fogarin")
def fogarin():
    """In a forge on the Crater's rim, an apprentice pulls the ropes of a huge bellows alone. What it coughs out is grey."""
    s = Scene("sand", ["........", "........", "........", "...==...", "........", "........"])
    s.at(forge(), 32, -10)
    s.d.polygon([(80, 60), (100, 56), (100, 70), (80, 66)], fill=(120, 80, 50, 255), outline=(60, 36, 22, 255))   # the bellows
    s.d.line([(100, 58), (106, 44)], fill=(200, 180, 140, 255))
    s.put(char("FighterRed", "left"), 110, 70)
    for i, (x, y) in enumerate(((76, 56), (72, 50), (66, 44))): s.d.ellipse([x - 3 - i, y - 2 - i, x + 3 + i, y + 2 + i], fill=(128, 124, 124, 255))
    return forge_glow(s, 64, 46).lit("dusk")


@scene("termas")
def termas():
    """Where the Crater's baths were, only dry stone basins and a few warm puddles remain. An old woman soaks her feet in one."""
    s = Scene("sand", var=1)
    pool = cut("TilesetDesert", 128, 112, 32, 32)
    s.put(dim(pool, 0.75), 30, 50).put(pool, 70, 70).put(dim(pool, 0.75), 108, 46)
    s.put(char("OldWoman", "down"), 70, 64)
    return s.lit("dusk")


@scene("compuerta")
def compuerta():
    """On top of the dam, a Water woman turns an iron wheel to cool the water running down to the forges."""
    s = Scene("sand", ["~~~~~~~~", "~~~~~~~~", "........", "........", "........", "........"], water="sand")
    s.d.rectangle([0, 32, 128, 44], fill=(140, 120, 104, 255), outline=(70, 56, 50, 255))      # the dam's top
    s.d.ellipse([56, 40, 70, 54], outline=(70, 70, 80, 255), width=2); s.d.line([(63, 40), (63, 54)], fill=(70, 70, 80, 255)); s.d.line([(56, 47), (70, 47)], fill=(70, 70, 80, 255))
    s.put(char("NinjaBlue", "left"), 80, 56)
    return s.lit("day")


@scene("carbon")
def carbon():
    """At a forge door, a Cave miner carries a sack of coal; the forge master blocks his way, arms crossed."""
    s = Scene("sand", ["........", "........", "........", "========", "========", "........"])
    s.at(forge(), 40, -14)
    s.put(char("Caveman", "right"), 52, 64)
    s.d.ellipse([42, 50, 52, 60], fill=(50, 46, 46, 255), outline=(24, 22, 24, 255))
    s.put(char("Samurai", "left"), 76, 64)
    return forge_glow(s, 72, 40, 22).lit("dusk")


@scene("pan")
def pan():
    """In a Crater street the ground is so warm a girl bakes bread right on the flagstones, under clay bells."""
    s = Scene("sand", ["........", "........", "========", "========", "========", "........"])
    s.at(dhouse("a"), -10, -20).at(dhouse("b"), 90, -12)
    for x in (44, 58, 72):
        s.d.pieslice([x - 5, 50, x + 5, 60], 180, 360, fill=(170, 100, 60, 255), outline=(80, 44, 26, 255))
    s.put(char("Cavegirl", "left"), 88, 64)
    return s.glow(58, 56, 18, FIRE, 0.5).lit("day")


@scene("almacen")
def almacen():
    """A huge storehouse by the Mother Forge: shelves up to the roof hold hundreds of new lanterns, all alike, all unlit."""
    s = Scene("sand", var=1)
    s.d.rectangle([0, 0, 128, 40], fill=(110, 76, 50, 255))
    for y in (8, 20, 32):
        s.d.line([(0, y + 7), (128, y + 7)], fill=(70, 44, 28, 255))
        for x in range(4, 128, 9): s.put(dim(cut("TilesetElement", 96, 48, 16, 32).crop((3, 0, 13, 9)), 0.8), x, y + 7)
    s.put(char("Inspector", "down"), 64, 70)
    return s.lit("gloom")


@scene("ladera")
def ladera():
    """On the Crater's south slope, among new stone houses, a Cave boy hits a rock with a toy hammer, very focused."""
    s = Scene("sand", ["........", "........", "........", "........", "...,....", "........"])
    s.at(dhouse("a"), -20, -16).at(dhouse("a"), 76, -20)
    s.put(cut("TilesetNature", 240, 208, 32, 16), 64, 76)
    s.put(char("Child", "right"), 50, 76).put(char("Cavegirl2", "down"), 100, 60)
    return s.lit("day")


@scene("escoria")
def escoria():
    """Behind the forges, a mountain of still-hot slag; a nest of Fuellitos inside, too big, their flames a strange colour."""
    s = Scene("sand", var=1)
    s.d.polygon([(10, 80), (44, 30), (64, 22), (90, 34), (120, 80)], fill=(70, 60, 66, 255), outline=(30, 24, 30, 255))
    for x, y in ((40, 60), (70, 46), (92, 66)): s.d.point((x, y), fill=(255, 120, 50, 255))
    s.put(mon("fuellito", "down", 1), 56, 64).put(mon("fuellito", "left", 1), 80, 70)
    s.glow(56, 56, 16, SAP, 0.8).glow(80, 62, 16, SAP, 0.8)
    return s.lit("dusk")


@scene("tizon")
def tizon():
    """At dusk, Master Tizón comes out of the Mother Forge drying his sweat with a rag; he sees you and opens his arms wide."""
    s = Scene("sand", ["........", "........", "........", "========", "========", "........"])
    s.at(forge(), 32, -10)
    s.put(char("Monk2", "down", 6), 64, 66)
    return forge_glow(s, 64, 44, 30).lit("dusk")


# ---------------- Cards (art/cards/<id>.png): the card box shows y 10..86 ----------------

def anvil(s, x, y):
    s.d.polygon([(x - 9, y - 8), (x + 9, y - 8), (x + 6, y - 5), (x + 3, y - 5), (x + 4, y), (x - 4, y), (x - 3, y - 5), (x - 9, y - 6)],
                fill=(90, 90, 100, 255), outline=(30, 30, 38, 255))
    return s


def floor_forge():
    """Inside the Guild's forge: a stone floor, the hearth wall along the top."""
    s = Scene("sand", ["........"] * 6, var=1)
    s.d.rectangle([0, 0, 128, 26], fill=(110, 80, 64, 255)); s.d.line([(0, 26), (128, 26)], fill=(50, 34, 28, 255), width=2)
    for x in range(0, 128, 16): s.d.line([(x, 0), (x, 26)], fill=(86, 60, 48, 255))
    return s


@card("bellows")
def c_bellows():
    """First day at the Ember Guild: two apprentices haul the big bellows' ropes and Fuellito jumps on top; Master Tizón watches, arms crossed."""
    s = floor_forge()
    s.d.rectangle([52, 14, 76, 24], fill=(220, 110, 50, 255)); forge_glow(s, 64, 20, 30)
    s.d.polygon([(40, 44), (88, 44), (80, 60), (48, 60)], fill=(130, 84, 50, 255), outline=(60, 38, 24, 255))
    s.put(mon("fuellito", "down"), 64, 46)
    for x in (44, 84): s.d.line([(x, 46), (x + (-10 if x < 64 else 10), 64)], fill=(220, 210, 180, 255))
    s.put(char("Boy", "up", 6), 34, 74).put(char("Child", "up", 6), 94, 74)
    s.put(char("Master", "left"), 112, 56)
    return s.lit("cave")


@card("bread")
def c_bread():
    """A break at the forge: Master Tizón breaks the bread baked on the anvil and gives the first piece to Fuellito; the apprentices wait their turn."""
    s = floor_forge()
    anvil(s, 64, 56)
    s.d.ellipse([58, 42, 70, 48], fill=(214, 160, 90, 255), outline=(110, 70, 40, 255))
    s.put(char("Master", "right"), 46, 58)
    s.put(mon("fuellito", "left"), 80, 62)
    for n, x in (("Boy", 30), ("Child", 100), ("Villager2", 114)): s.put(char(n, "up"), x, 80)
    return s.glow(64, 40, 30, FIRE, 0.9).lit("cave")


@card("piece")
def c_piece():
    """The Guild's wall of first pieces: crooked horseshoes and bent nails, each with its name; Fuellito holds up his own, the most crooked of the row."""
    s = floor_forge()
    for i, x in enumerate(range(10, 124, 14)):
        if i % 2: s.d.line([(x, 8), (x + 2, 20)], fill=(150, 150, 160, 255), width=2)
        else: s.d.arc([x - 4, 8, x + 4, 20], 200, 340, fill=(150, 150, 160, 255), width=2)
        s.d.rectangle([x - 3, 22, x + 3, 24], fill=(220, 200, 160, 255))
    s.put(mon("fuellito", "down"), 64, 62)
    s.d.arc([58, 34, 72, 46], 160, 300, fill=(170, 170, 180, 255), width=2)
    return s.glow(64, 50, 30, FIRE, 0.7).lit("cave")


@card("temper")
def c_temper():
    """Master Tizón plunges a red-hot blade into the water barrel and steam fills the forge; Yunquerón serves as the anvil, his shell still glowing."""
    s = floor_forge()
    s.d.ellipse([70, 52, 92, 62], fill=(110, 76, 48, 255), outline=(50, 34, 22, 255)); s.d.ellipse([73, 53, 89, 58], fill=(80, 120, 160, 255))
    s.put(char("Master", "right"), 60, 62)
    s.d.line([(66, 54), (78, 50)], fill=(255, 120, 60, 255), width=2)
    s.put(mon("yunqueron", "right", 1), 34, 74).glow(34, 64, 20, FIRE, 0.9)
    for x, y, r in ((80, 40, 10), (88, 30, 12), (74, 26, 9)): s.d.ellipse([x - r, y - r // 2, x + r, y + r // 2], fill=(230, 230, 236, 200))
    return s.lit("cave")


@card("anvil")
def c_anvil():
    """At the foot of the Mother Forge sleeps a still-small Yunquerón, beside the shell of the egg it came from; the furnace is too big for the card."""
    s = Scene("sand", ["........"] * 6, var=1)
    s.at(scale(forge(), 2), -0, -60); forge_glow(s, 64, 10, 50)
    s.put(dim(mon("yunqueron", "down"), 0.9), 56, 70)
    s.d.pieslice([70, 60, 84, 72], 0, 180, fill=(236, 226, 200, 255), outline=(120, 100, 80, 255))
    return s.lit("dusk")


@card("furnace")
def c_furnace():
    """Night at the Guild: everyone sleeps but Yunquerón, sitting in the forge door so the furnace won't cool; it looks outward."""
    s = Scene("sand", ["........", "........", "........", "...==...", "...==...", "...==..."])
    s.at(forge(), 32, -10).at(dhouse("b"), 100, 0).at(dhouse("b"), -8, 4)
    s.put(mon("yunqueron", "down", 1), 64, 60).glow(64, 44, 34, FIRE, 1.2)
    return s.lit("night")


@card("breath")
def c_breath():
    """The Warm Crater breathes fire at nightfall; in front, the Guild's dam holds the stream and the bed below is dry and cracked."""
    s = Scene("sand", ["~~~~~~~~", "~~~~~~~~", "........", "........", "........", "........"], water="sand")
    s.d.rectangle([0, 30, 128, 38], fill=(130, 120, 116, 255), outline=(60, 54, 54, 255))
    for x in range(4, 128, 12): s.d.line([(x, 30), (x, 38)], fill=(80, 74, 72, 255))
    for x, y in ((20, 54), (44, 62), (70, 52), (96, 66), (110, 50)): s.d.line([(x, y), (x + 8, y + 4), (x + 4, y + 10)], fill=(90, 60, 40, 255))
    s.put(guardian("forja"), 64, 84).glow(64, 64, 40, FIRE, 1.2)
    return s.lit("dusk")


@card("blow")
def c_blow():
    """The Awakened Forge hammers without rest in the Guild hall; around it, rows and rows of identical lanterns wait their turn."""
    s = floor_forge()
    s.put(guardian("forja"), 64, 64).glow(64, 44, 34, FIRE, 1.1)
    l = cut("TilesetElement", 96, 48, 16, 32)
    for y in (64, 86):
        for x in range(8, 128, 14):
            if 40 < x < 88 and y == 64: continue
            s.put(l, x, y)
    return s.lit("cave")


@card("core")
def c_core():
    """Under the forge, in a chamber no one visits, beats the Mother Ember: a huge ember that has never cooled."""
    s = Scene("snow", ["........"] * 6, var=1)
    s.at(tile("TilesetRelief", 8, 5, 4, 2), 0, 0).at(tile("TilesetRelief", 8, 5, 4, 2), 64, 0)
    s.d.ellipse([40, 38, 88, 70], fill=(200, 70, 30, 255), outline=(90, 30, 20, 255)); s.d.ellipse([50, 44, 78, 62], fill=(255, 170, 70, 255)); s.d.ellipse([58, 48, 70, 56], fill=(255, 236, 170, 255))
    for r in (34, 42): s.d.arc([64 - r, 54 - r // 2, 64 + r, 54 + r // 2], 0, 360, fill=(140, 50, 30, 255))
    return s.glow(64, 54, 60, FIRE, 1.4).lit("deep")
