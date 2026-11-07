# Hondonada: the empty court of the Shadow, the pack's abandoned village under a breathing fog.

def ruin(k):
    return {"a": cut("TilesetVillageAbandoned", 0, 0, 64, 48), "b": cut("TilesetVillageAbandoned", 176, 0, 64, 64),
            "big": cut("TilesetVillageAbandoned", 192, 96, 80, 96)}[k]
def black_lamp(broken=False):
    l = dim(cut("TilesetElement", 96, 48, 16, 32), 0.28)
    return l.rotate(-20, resample=Image.NEAREST, expand=True) if broken else l


def throne(s, x, y):
    """The empty stone seat of the Shadow."""
    s.d.rectangle([x - 9, y - 22, x + 9, y - 8], fill=(120, 118, 128, 255), outline=(50, 48, 58, 255))
    s.d.rectangle([x - 11, y - 9, x + 11, y], fill=(136, 134, 144, 255), outline=(50, 48, 58, 255))
    s.d.line([(x - 8, y - 20), (x + 8, y - 20)], fill=(170, 168, 178, 255))
    return s


def mist(s, a=0.42, hole=None): return s.fog(a, (196, 200, 214), hole)


@scene("guarda")
def guarda():
    """At the valley's centre the fog opens round an empty stone seat; beside it a guard with his spear up has not moved in ages."""
    s = Scene("grass", ["........", "........", "..====..", "..====..", "..====..", "........"], var=1)
    throne(s, 60, 54)
    s.put(char("NinjaGray", "down"), 84, 56)
    s.d.line([(90, 36), (90, 56)], fill=(130, 110, 90, 255)); s.d.point((90, 35), fill=(220, 220, 230, 255))
    s.lit("gloom"); mist(s, 0.4, (72, 48, 30))
    return s


@scene("faroles")
def faroles():
    """A walk of black lanterns: instead of light, each casts a pool of cool shade. Half are broken."""
    s = Scene("grass", ["........", "........", "========", "========", "........", "........"], var=1)
    for i, x in enumerate((14, 42, 70, 98, 124)):
        s.d.ellipse([x - 12, 58, x + 12, 66], fill=(30, 28, 44, 255))
        s.put(black_lamp(i % 2 == 1), x, 62)
    s.lit("gloom"); mist(s, 0.32, (64, 56, 40))
    return s


@scene("velo")
def velo():
    """At the Hollow's edge, a young Shadow woman pulls a thread of fog like unravelling a jumper; it slips back by itself."""
    s = Scene("grass", ["........"] * 6, var=1)
    s.put(ruin("a"), 100, 44)
    s.put(char("NinjaMageBlack", "right"), 44, 70)
    s.d.line([(50, 62), (64, 58), (78, 62), (92, 56), (110, 60)], fill=(236, 238, 246, 255))
    s.lit("gloom"); mist(s, 0.5, (60, 64, 26))
    return s


@scene("cartas")
def cartas():
    """In an empty house, an old Shadow man sorts letters into wooden pigeonholes. Hundreds. None has a stamp."""
    s = Scene("snow", var=1)
    s.d.rectangle([0, 0, 128, 44], fill=(84, 66, 56, 255))
    s.d.rectangle([20, 6, 108, 40], fill=(120, 86, 56, 255), outline=(56, 36, 24, 255))
    for x in range(22, 108, 8):
        for y in range(8, 40, 8):
            s.d.rectangle([x, y, x + 6, y + 6], fill=(60, 40, 28, 255))
            if (x + y) % 3: s.d.rectangle([x + 1, y + 3, x + 5, y + 6], fill=(230, 224, 206, 255))
    s.put(char("OldMan2", "up"), 64, 66)
    return s.glow(64, 30, 30, WARM, 0.6).lit("cave")


@scene("cuna")
def cuna():
    """A Shadow man comes out of an abandoned house with a huge wooden cradle on his back; he stops every few steps for breath."""
    s = Scene("grass", ["........", "........", "........", "========", "========", "........"], var=1)
    s.put(ruin("b"), 40, 52)
    s.put(char("Villager3", "right"), 78, 70)
    s.d.rectangle([66, 50, 86, 62], fill=(150, 104, 62, 255), outline=(70, 46, 28, 255))
    s.d.line([(68, 50), (68, 46)], fill=(70, 46, 28, 255)); s.d.line([(84, 50), (84, 46)], fill=(70, 46, 28, 255))
    s.lit("gloom"); mist(s, 0.34, (76, 60, 22))
    return s


@scene("juego")
def juego():
    """In an empty square, Ecolitos hop on the painted squares of a children's game, chanting with little voices not theirs."""
    s = Scene("grass", ["........", "..====..", "..====..", "..====..", "..====..", "........"], var=1)
    for i, (x, y) in enumerate(((48, 30), (64, 30), (56, 44), (48, 58), (64, 58), (56, 72))):
        s.d.rectangle([x - 6, y - 6, x + 6, y + 6], outline=(220, 214, 196, 255))
    s.put(mon("ecolito", "down"), 56, 50).put(mon("ecolito", "left"), 70, 66)
    s.lit("gloom"); mist(s, 0.32, (60, 54, 30))
    return s


@scene("noctua")
def noctua():
    """The house of Noctua, the healer who died in the first outbreak; dry flowers on the door, and one fresh bunch on top."""
    s = Scene("grass", ["........", "........", "........", "...==...", "...==...", "...==..."], var=1)
    s.put(ruin("big"), 64, 60)
    for x in range(52, 78, 4): s.put(dim(tile("TilesetFloorDetail", 5, 2, trim=True), 0.6, grey=True), x, 64)
    s.put(tile("TilesetFloorDetail", 5, 2, trim=True), 64, 62)
    s.lit("gloom"); mist(s, 0.3, (64, 50, 34))
    return s


@scene("acta")
def acta():
    """At the foot of the empty throne, a scribe's box peeks between two slabs; the guard has his back turned, parting the fog."""
    s = Scene("grass", ["........", "........", "..====..", "..====..", "..====..", "........"], var=1)
    throne(s, 56, 52)
    s.d.rectangle([48, 58, 56, 62], fill=(130, 90, 56, 255), outline=(60, 40, 26, 255))
    s.put(char("NinjaGray", "up"), 96, 60)
    s.d.line([(102, 40), (102, 60)], fill=(130, 110, 90, 255))
    s.lit("gloom"); mist(s, 0.4, (70, 54, 34))
    return s


@scene("regreso")
def regreso():
    """The Hollow's fog no longer breathes. A Shadow woman with rag-wrapped hands walks down, looking at every house."""
    s = Scene("grass", ["...==...", "...==...", "...==...", "...==...", "...==...", "...==..."], var=1)
    s.put(ruin("a"), 18, 48).put(flip(ruin("b")), 112, 60)
    s.put(char("NinjaMageBlack", "left"), 64, 58)
    s.lit("dawn"); mist(s, 0.15)
    return s
