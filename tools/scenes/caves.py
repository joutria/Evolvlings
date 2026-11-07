# Cuevas del Eco: grey rock walls (the pack's cliffs), stone floors, lamps and the Hondura miners.

def walls(s, kind=0):
    w = tile("TilesetRelief", 8, 0 if kind == 0 else 5, 4, 2)
    s.at(w, 0, 0).at(w, 64, 0)
    return s


def cave(rows=None): return walls(Scene("snow", rows or ["........"] * 6, var=1))


def verses(s, y0=4, y1=28, col=(200, 196, 210, 255)):
    for y in range(y0, y1, 4):
        for x in range(4, 124, 10): s.d.line([(x, y), (x + 6, y)], fill=col)
    return s


def oil_lamp(s, x, y, on=True):
    s.d.rectangle([x - 2, y - 4, x + 2, y], fill=(150, 110, 60, 255), outline=(70, 50, 30, 255))
    if on: s.d.point((x, y - 5), fill=(255, 220, 140, 255)); s.glow(x, y - 4, 22, FIRE, 0.9)
    return s


@scene("sala")
def sala():
    """The Hall of Echoes: walls covered in verses in every script of the valley, a new crack top to bottom; a Sky pilgrim copies fast."""
    s = verses(cave())
    s.d.line([(64, 0), (62, 10), (66, 20), (63, 32)], fill=(20, 16, 24, 255), width=2)
    s.put(char("Monk", "up"), 50, 60)
    s.d.rectangle([54, 52, 60, 56], fill=(236, 230, 210, 255))
    oil_lamp(s, 90, 60)
    return s.lit("cave")


@scene("tercero")
def tercero():
    """An old tunnel, wide and smooth, in a perfect curve. The Caves repeat everything three times; the third is not always the same."""
    s = cave(["........", "..====..", ".======.", ".======.", "..====..", "........"])
    for r in (40, 30, 20): s.d.arc([64 - r, 50 - r // 2, 64 + r, 50 + r // 2], 180, 360, fill=(180, 176, 196, 255))
    return s.glow(64, 50, 30, (200, 200, 230), 0.4).lit("cave")


@scene("ramo")
def ramo():
    """Before a door carved in the rock, a huge Hondura miner lays a bunch of dry flowers; other bunches from other weeks lie in a row."""
    s = cave()
    s.d.rectangle([52, 14, 76, 32], fill=(40, 34, 40, 255), outline=(90, 86, 96, 255))
    for x in range(30, 100, 8): s.put(dim(tile("TilesetFloorDetail", 5, 2, trim=True), 0.6, grey=True), x, 40)
    s.put(scale(char("Caveman2", "up"), 2), 64, 74)
    oil_lamp(s, 40, 34).glow(64, 30, 30, FIRE, 0.4)
    return s.lit("cave")


@scene("tunel")
def tunel():
    """A new tunnel, narrow and badly propped, cuts an old cave; a Hondura girl picks the rock by an Albor lantern; sand falls each blow."""
    s = cave()
    for x in (30, 96): s.d.rectangle([x, 20, x + 3, 70], fill=(120, 84, 50, 255))
    s.d.rectangle([28, 18, 100, 21], fill=(120, 84, 50, 255))
    s.put(char("Cavegirl", "up"), 64, 50)
    s.put(cut("TilesetElement", 96, 48, 16, 32), 84, 56).glow(84, 32, 26, COLD, 0.9)
    for x, y in ((60, 26), (66, 30), (62, 36)): s.d.point((x, y), fill=(210, 190, 150, 255))
    return s.lit("cave")


@scene("lamparas")
def lamparas():
    """Through the old tunnels goes an old man with an oil can, refilling lamps nobody uses; after each, he stops to listen."""
    s = cave(["........", "........", "========", "========", "........", "........"])
    for x, on in ((20, True), (52, True), (84, False), (112, False)): oil_lamp(s, x, 34, on)
    s.put(char("OldMan", "right"), 64, 62)
    s.d.rectangle([70, 56, 73, 60], fill=(160, 160, 170, 255))
    return s.lit("cave")


@scene("grieta")
def grieta():
    """The east crack is so narrow you pass sideways. Warm air runs through, smelling of lantern oil; it comes from under the Meadow."""
    s = Scene("snow", var=1)
    w = tile("TilesetRelief", 8, 0, 4, 2)
    for y in (0, 32, 64): s.at(w, -10, y).at(w, 74, y)
    s.d.rectangle([54, 0, 74, 96], fill=(30, 26, 34, 255))
    return s.glow(64, 10, 30, SAP, 0.6).glow(64, 90, 20, WARM, 0.4).lit("cave")


@scene("nombres")
def nombres():
    """In a corner of the Hall, a list of names written slowly on the wall: «Voices put out». The last ones bigger, and more crooked."""
    s = cave()
    for i, y in enumerate(range(6, 30, 4)): s.d.line([(40, y), (60 + i * 4, y + i // 3)], fill=(220, 214, 226, 255), width=1 + i // 4)
    oil_lamp(s, 30, 44)
    return s.lit("cave")


@scene("mapas")
def mapas():
    """In the Hall of Echoes, a Meadow man in a yellow uniform measures the walls with a knotted cord; Albor maps lie at his feet."""
    s = verses(cave())
    s.put(char("Inspector", "up"), 70, 56)
    s.d.line([(30, 30), (70, 40)], fill=(220, 200, 150, 255))
    s.d.rectangle([80, 58, 92, 62], fill=(236, 224, 190, 255), outline=(120, 100, 70, 255)); s.d.point((86, 60), fill=(220, 180, 40, 255))
    oil_lamp(s, 104, 50)
    return s.lit("cave")


@scene("semillas")
def semillas():
    """In the Guardian's house, among big still stones that were Grava, Basalto sorts seeds into little piles with enormous careful hands."""
    s = cave()
    for x, y in ((24, 60), (104, 58), (40, 84)): s.put(cut("TilesetNature", 272, 224, 64, 48).resize((32, 24), Image.NEAREST), x, y)
    s.put(scale(char("Caveman2", "down"), 2), 64, 68)
    for x in (54, 64, 74): s.d.rectangle([x - 2, 72, x + 1, 74], fill=(170, 130, 70, 255))
    oil_lamp(s, 90, 44)
    return s.lit("cave")
