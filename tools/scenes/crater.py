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
