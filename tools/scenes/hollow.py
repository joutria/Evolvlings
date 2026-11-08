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


# ---------------- Cards (art/cards/<id>.png): the card box shows y 10..86 ----------------

@card("night")
def c_night():
    """Night Shift: Nim waits on the doorstep; far up the hills, the lamps of the dig."""
    s = Scene("grass", ["........"] * 3 + ["========"] * 2 + ["........"], var=1)
    s.at(ruin("a"), 30, -4)
    s.d.rectangle([52, 42, 76, 46], fill=(120, 110, 104, 255), outline=(60, 54, 56, 255))
    s.put(mon("nim", "down"), 64, 56)
    for x, y in ((8, 8), (16, 12), (106, 6), (118, 10)): s.d.point((x, y), fill=(255, 210, 130, 255)); s.glow(x, y, 6, FIRE, 0.6)
    s.d.ellipse([60, 64, 66, 67], fill=(150, 150, 150, 255))
    return s.lit("night")


@card("nohide")
def c_nohide():
    """In the Hollow an Albor spy hides behind some barrels; Nim, who hides from everything, hangs upside down right above him and stares."""
    s = Scene("grass", ["........"] * 6, var=1)
    s.at(ruin("b"), 40, -26)
    for x in (54, 66): s.d.rectangle([x, 50, x + 10, 62], fill=(140, 96, 56, 255), outline=(60, 40, 24, 255)); s.d.line([(x, 56), (x + 10, 56)], fill=(60, 40, 24, 255))
    s.put(char("KnightGold", "up"), 64, 76)
    s.d.line([(64, 24), (64, 36)], fill=(40, 34, 44, 255))
    s.put(mon("nim", "down").transpose(Image.FLIP_TOP_BOTTOM), 64, 50)
    return mist(s, 0.3, (64, 50, 26)).lit("gloom")


@card("truename")
def c_truename():
    """Against a wall of the Hollow there is a shadow that is only a gap; Nim says a name aloud and the shadow begins to fill with colour."""
    s = Scene("grass", ["........"] * 6, var=1)
    s.d.rectangle([0, 0, 128, 44], fill=(120, 116, 124, 255)); s.d.line([(0, 44), (128, 44)], fill=(60, 56, 66, 255), width=2)
    for y in range(8, 44, 9):
        for x in range((y // 9 % 2) * 8, 128, 16): s.d.rectangle([x, y - 8, x + 15, y], outline=(96, 92, 102, 255))
    sh = char("Villager2", "down"); col = sh.copy(); bl = Image.new("RGBA", sh.size, (16, 12, 22, 255)); bl.putalpha(sh.getchannel("A"))
    half = bl.copy(); half.paste(col.crop((0, 8, 16, 16)), (0, 8), col.crop((0, 8, 16, 16)))
    s.put(scale(half, 2), 76, 48)
    s.put(mon("nim", "right"), 44, 66)
    for x, y in ((52, 56), (58, 52), (64, 50)): s.d.point((x, y), fill=(230, 220, 250, 255))
    return s.lit("gloom")


@card("lance")
def c_lance():
    """At the gates of King Lóbrego's court, in the fog, Centinela crosses its lance before an Albor envoy bringing a scroll."""
    s = Scene("grass", ["........", "........", "...==...", "...==...", "...==...", "...==..."], var=1)
    s.at(ruin("big"), 24, -54)
    s.put(mon("centinela", "down", 1), 64, 54)
    s.d.line([(50, 40), (78, 56)], fill=(170, 170, 180, 255), width=2)
    s.put(char("Knight", "up"), 64, 80)
    s.d.rectangle([70, 68, 74, 71], fill=(236, 226, 200, 255))
    return mist(s, 0.38, (64, 60, 34)).lit("gloom")


@card("oath")
def c_oath():
    """In the fog waits a long line of Underside folk; Centinela kneels before the first, a girl, and whispers that it will protect her."""
    s = Scene("grass", ["........"] * 6, var=1)
    s.put(mon("centinela", "left", 1), 80, 56)
    s.put(char("Child", "right"), 58, 58)
    for i, (n, x) in enumerate((("Villager", 40), ("OldWoman", 26), ("Villager2", 12))): s.put(char(n, "right"), x, 60 + i % 2 * 2)
    for i, (n, x) in enumerate((("Villager3", 30), ("Villager4", 16))): s.put(dim(char(n, "right"), 0.7), x, 76)
    return mist(s, 0.42, (70, 54, 30)).lit("gloom")


@card("veil")
def c_veil():
    """An Albor patrol sweeps the street with lantern light; Centinela throws a veil of fog over a girl pressed against the wall and the light passes by."""
    s = Scene("grass", ["........"] * 3 + ["========"] * 2 + ["........"], var=1)
    s.at(ruin("a"), -10, -4).at(ruin("b"), 70, -18)
    s.put(char("Child", "down"), 40, 50).put(mon("centinela", "down"), 56, 52)
    s.put(char("KnightGold", "left"), 112, 74).glow(104, 66, 26, COLD, 1.1)
    s.lit("night")
    return s.fog(0.35, (170, 176, 200), (110, 70, 24))


@card("court")
def c_court():
    """King Lóbrego's court in the fog: empty chairs round an empty throne. No one sits. Centinela stands guard all the same."""
    s = Scene("grass", ["........", "........", "...==...", "...==...", "...==...", "...==..."], var=1)
    throne(s, 64, 34)
    for x, y in ((30, 46), (98, 46), (24, 66), (104, 66), (36, 84), (92, 84)):
        s.d.rectangle([x - 5, y - 10, x + 5, y - 4], fill=(110, 80, 60, 255), outline=(50, 36, 28, 255)); s.d.rectangle([x - 6, y - 4, x + 6, y], fill=(130, 96, 70, 255), outline=(50, 36, 28, 255))
    s.put(mon("centinela", "down"), 84, 40)
    return mist(s, 0.35, (64, 40, 30)).lit("gloom")


@card("crown")
def c_crown():
    """The crown rests on the empty throne's cushion; an Underside hand reaches out to take it and stops halfway."""
    s = Scene("grass", ["........"] * 6, var=1)
    s.d.rectangle([20, 10, 108, 70], fill=(120, 118, 128, 255), outline=(50, 48, 58, 255))
    s.d.rectangle([36, 44, 92, 66], fill=(120, 40, 60, 255), outline=(60, 20, 30, 255))
    s.d.polygon([(48, 46), (52, 32), (58, 42), (64, 28), (70, 42), (76, 32), (80, 46)], fill=(220, 190, 80, 255), outline=(110, 80, 30, 255))
    s.d.rectangle([96, 50, 128, 60], fill=(40, 34, 44, 255)); s.d.ellipse([88, 48, 100, 62], fill=(52, 44, 56, 255), outline=(20, 16, 24, 255))
    for i in range(4): s.d.line([(90, 50 + i * 3), (84, 49 + i * 3)], fill=(52, 44, 56, 255), width=2)
    return s.glow(64, 40, 30, WARM, 0.6).lit("gloom")
