# Altos: windy ledges and passes, the pack's grey cliffs and snowy floor, kites and bells.

def cliffs(s, y=0):
    w = tile("TilesetRelief", 8, 0, 4, 2)
    s.at(w, 0, y).at(w, 64, y)
    return s


def kite(s, x, y, col=(220, 70, 60)):
    s.d.polygon([(x, y - 5), (x + 4, y), (x, y + 5), (x - 4, y)], fill=col + (255,), outline=(70, 30, 30, 255))
    return s


def clouds(s, y0=60):
    for x, y in ((10, y0), (40, y0 + 8), (80, y0 + 2), (110, y0 + 10)):
        s.d.ellipse([x - 14, y - 5, x + 14, y + 5], fill=(240, 242, 250, 255))
    return s


@scene("mensajero")
def mensajero():
    """On a windswept ledge, a Heights girl holds a cloth kite with messages tied to its tail."""
    s = cliffs(Scene("snow", ["........"] * 6))
    s.put(char("NinjaBlue", "up"), 64, 72)
    s.d.line([(66, 64), (92, 30)], fill=(230, 230, 230, 255)); kite(s, 94, 26)
    for i in range(4): s.d.rectangle([94 - i * 4, 32 + i * 3, 96 - i * 4, 34 + i * 3], fill=(236, 226, 200, 255))
    return s.lit("cold")


@scene("cadenas")
def cadenas():
    """One of the three passes is shut with heavy frosted chains; far below, tents. A pass guard stands by."""
    s = cliffs(Scene("snow", ["........", "........", "...==...", "...==...", "...==...", "...==..."]))
    for y in (40, 46): s.d.line([(30, y), (98, y + 2)], fill=(150, 160, 176, 255), width=2)
    s.put(char("SamuraiBlue", "down"), 104, 62)
    for x in (40, 60, 80): s.d.polygon([(x, 88), (x + 6, 80), (x + 12, 88)], fill=(170, 130, 90, 255))
    return s.lit("cold")


@scene("puente")
def puente():
    """A rope bridge joins two peaks over an abyss full of clouds; halfway across, some creatures."""
    s = Scene("snow", ["........"] * 6)
    s.d.rectangle([0, 20, 128, 96], fill=(176, 196, 220, 255)); clouds(s, 40); clouds(s, 78)
    s.d.rectangle([0, 50, 128, 58], fill=(150, 104, 62, 255))
    for x in range(0, 128, 6): s.d.line([(x, 50), (x, 58)], fill=(90, 60, 34, 255))
    s.d.line([(0, 46), (128, 46)], fill=(200, 180, 140, 255))
    s.put(mon("ululu", "left"), 64, 54)
    return s.lit("day")


@scene("campanas")
def campanas():
    """In a bell tower with no walls, an old man pulls seven ropes at once; the bells ring without rhythm or song."""
    s = Scene("snow", var=1)
    s.d.rectangle([10, 0, 118, 10], fill=(110, 76, 46, 255))
    for i, x in enumerate(range(20, 112, 14)):
        s.d.pieslice([x - 5, 6, x + 5, 20], 180, 360, fill=(200, 160, 60, 255), outline=(90, 70, 30, 255))
        s.d.line([(x, 14), (64, 60)], fill=(220, 210, 180, 255))
    s.put(char("OldMan2", "down", 6), 64, 70)
    return s.lit("cold")


@scene("trinillas")
def trinillas():
    """A flock of Trinillas has landed on the rocks of the path, singing a song that stops halfway and starts again."""
    s = cliffs(Scene("snow", ["........", "........", "...==...", "...==...", "...==...", "...==..."]))
    rock = cut("TilesetNature", 272, 224, 64, 48)
    s.put(rock, 26, 74).put(flip(rock), 104, 76)
    for x, y in ((20, 48), (32, 46), (96, 50), (110, 48), (104, 42)): s.put(mon("trinilla", "down"), x, y)
    return s.lit("cold")


@scene("archivo")
def archivo():
    """The Thunder House archive: a cave full of shelves of scrolls tied with coloured ribbons; an archivist in thick glasses labels them."""
    s = Scene("snow", var=1)
    s.d.rectangle([0, 0, 128, 40], fill=(90, 70, 56, 255))
    for y in (10, 22, 34):
        s.d.line([(0, y), (128, y)], fill=(60, 40, 28, 255))
        for x in range(4, 128, 6): s.d.rectangle([x, y - 6, x + 3, y - 1], fill=(236, 226, 200, 255)); s.d.point((x + 1, y - 3), fill=((x * 37) % 255, 90, 160, 255))
    s.put(char("Inspector", "up"), 64, 64)
    return s.glow(64, 40, 30, WARM, 0.6).lit("cave")


@scene("aguja")
def aguja():
    """At the top of the Thunder Needle, a woman with frizzy hair watches the sky through a copper spyglass; the lightning rod hums."""
    s = Scene("snow", var=1)
    s.d.rectangle([0, 0, 128, 96], fill=(70, 80, 110, 255))
    s.d.rectangle([40, 50, 88, 96], fill=(130, 126, 140, 255), outline=(60, 56, 70, 255))
    s.d.line([(64, 10), (64, 50)], fill=(180, 120, 60, 255), width=2)
    s.d.line([(70, 6), (66, 14), (72, 18), (68, 26)], fill=(250, 250, 180, 255))
    s.put(char("SorcererOrange", "right"), 54, 66)
    s.d.line([(60, 58), (68, 54)], fill=(200, 130, 60, 255), width=2)
    return s.glow(68, 16, 20, (240, 240, 200), 0.8).lit("storm")


@scene("arpegio")
def arpegio():
    """At the Choir lookout, an old man sits barefoot on the floor, palms on the stone, smiling with his eyes closed."""
    s = Scene("snow", ["........"] * 6)
    s.d.rectangle([0, 60, 128, 96], fill=(176, 196, 220, 255)); clouds(s, 76)
    s.d.rectangle([0, 56, 128, 60], fill=(140, 136, 150, 255))
    s.put(char("Master", "down"), 64, 50)
    return s.glow(110, 0, 70, (255, 230, 200), 0.5).lit("dawn")


@scene("muda")
def muda():
    """The wind has stopped. For the first time in generations kites hang still and bells are silent; the messengers look at the sky."""
    s = cliffs(Scene("snow", ["........"] * 6))
    for x in (30, 64, 98):
        s.d.line([(x, 66), (x + 2, 46)], fill=(220, 220, 220, 255)); kite(s, x + 2, 50, ((x * 7) % 200 + 50, 100, 160))
        s.put(char("NinjaBlue", "up"), x, 74)
    return s.lit("gloom")
