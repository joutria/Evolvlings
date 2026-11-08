# Events of every zone's bag: roadside things, on plain grass with the pack's rocks, trees and props.

def rock(k="big"):
    return {"big": cut("TilesetNature", 272, 160, 64, 48), "left": cut("TilesetNature", 240, 160, 32, 48),
            "grey": cut("TilesetNature", 272, 224, 64, 48), "small": cut("TilesetNature", 240, 208, 32, 16)}[k]
def tree(): return tile("TilesetNature", 16, 0, 2, 2)
def fire(i=0): return frame(img("FX", "Particle", "Fire.png"), 12, i)


def campfire(s, x, y, lit=True, embers=False):
    """A ring of stones; a small fire, or only embers."""
    for dx, dy in ((-6, 0), (6, 0), (-4, 3), (4, 3), (0, 4), (-4, -3), (4, -3)):
        s.d.rectangle([x + dx - 1, y + dy - 1, x + dx, y + dy], fill=(138, 132, 128, 255), outline=(62, 58, 62, 255))
    if lit: s.put(fire(1), x, y + 2).glow(x, y - 2, 30, FIRE, 1.0)
    if embers:
        for dx, dy in ((-1, 0), (1, 1), (0, -1)): s.d.point((x + dx, y + dy), fill=(255, 120, 40, 255))
        s.glow(x, y, 14, FIRE, 0.7)
    return s


def log(s, x, y, w=18):
    s.d.rectangle([x, y, x + w, y + 4], fill=(126, 82, 48, 255), outline=(62, 38, 24, 255))
    s.d.ellipse([x + w - 3, y, x + w + 1, y + 4], fill=(196, 150, 96, 255), outline=(62, 38, 24, 255))
    return s


@scene("fogata")
def fogata():
    """By the road, among stones, the embers of a fire someone left a little while ago; a log to sit on."""
    s = Scene("grass", ["..,.....", "........", "========", "========", "........", ".,....,."])
    s.put(rock("left"), 16, 92).put(tree(), 112, 40)
    campfire(s, 64, 72, lit=False, embers=True)
    log(s, 74, 76)
    return s.lit("dusk")


@scene("viajero")
def viajero():
    """By a small fire, a traveller in a coat of patches of every colour roasts chestnuts."""
    s = Scene("grass", ["........", "..,.....", "........", "....,...", "........", "..,....."])
    s.put(tree(), 18, 40).put(tree(), 112, 34)
    campfire(s, 60, 64)
    s.put(char("Hunter", "left"), 76, 66)
    s.d.line([(70, 60), (63, 58)], fill=(110, 74, 44, 255))                                     # his stick of chestnuts
    s.d.point((62, 58), fill=(120, 70, 40, 255))
    return s.lit("night")


@scene("cofre")
def cofre():
    """Half buried by a rock, a wooden chest bound with iron, with a rusty lock and a mark nobody knows."""
    s = Scene("grass", ["........", ".,......", "......,.", "........", "...,....", "........"])
    s.put(rock("big"), 80, 64)
    s.put(frame(item("Treasure", "BigTreasureChest.png"), 16, 0), 50, 70)
    s.d.rectangle([40, 68, 60, 72], fill=(106, 78, 50, 255))                                   # the earth over it
    s.put(tree(), 14, 30)
    return s.lit("day")


@scene("manantial")
def manantial():
    """Between mossy rocks a little spring wells up, so clear you only see it by the trembling of its surface."""
    s = Scene("grass", ["........", "..,.....", "..~~~...", "..~~~,..", "........", ".,......"])
    s.put(rock("left"), 36, 60).put(flip(rock("left")), 96, 62).put(rock("small"), 64, 34)
    for x, y in ((30, 72), (100, 74), (60, 82)): s.put(tile("TilesetFloorDetail", 7, 2, trim=True), x, y)
    return s.lit("day")


@scene("mochila")
def mochila():
    """Hanging from a branch, at hand height, a travel pack tied with a careful knot. Someone left it on purpose."""
    s = Scene("grass", ["........", "........", "========", "========", "..,.....", "........"])
    s.put(scale(tree(), 2), 72, 70)
    s.d.line([(84, 40), (84, 48)], fill=(140, 110, 70, 255))                                   # the strap
    s.d.rectangle([80, 48, 88, 58], fill=(150, 96, 56, 255), outline=(66, 40, 24, 255))         # the pack
    s.d.rectangle([81, 49, 87, 51], fill=(176, 120, 70, 255))
    return s.lit("day")


@scene("tormenta")
def tormenta():
    """The sky goes black and it pours. Under a rock ledge where you run for cover, a wild creature is already there."""
    s = Scene("grass", ["........"] * 6, var=1)
    wall = tile("TilesetRelief", 8, 0, 4, 2)
    s.at(wall, 0, 0).at(wall, 64, 0)
    s.d.rectangle([0, 30, 128, 36], fill=(56, 52, 60, 255))                                    # the dry shade under the ledge
    s.put(mon("ajolin", "down"), 92, 44)
    s.lit("storm").rain(110)
    return s


@scene("altar")
def altar():
    """A little stone altar by the road, with a worn figure of a woman singing; someone has left flowers."""
    s = Scene("grass", ["........", "........", "========", "========", "..,..,..", "........"])
    s.d.rectangle([52, 54, 76, 64], fill=(150, 146, 150, 255), outline=(70, 66, 76, 255))
    s.put(char("Statue"), 64, 56)
    for x in (54, 72): s.put(tile("TilesetFloorDetail", 5, 2, trim=True), x, 66)
    s.put(tree(), 18, 46).put(tree(), 112, 46)
    return s.lit("day")


@scene("herido")
def herido():
    """In the ditch, a wild creature has a leg caught in a snare; it has pulled so hard the loop has cut in."""
    s = Scene("grass", ["........", "========", "========", "........", "..,.....", "......,."])
    s.put(mon("topacio", "left"), 64, 70)
    s.stem([(70, 68), (80, 64), (88, 60)], col=(196, 170, 120, 255))                           # the snare's rope to its peg
    s.d.rectangle([88, 56, 89, 61], fill=(110, 74, 44, 255))
    s.d.point((66, 69), fill=(190, 40, 40, 255))
    return s.lit("day")


@scene("alforja")
def alforja():
    """Down the road comes an old woman pulling a donkey laden with bags, each with a handwritten label."""
    s = Scene("grass", ["........", "........", "========", "========", "........", "..,....."])
    horse = frame(img("Actor", "Animals", "Horse", "SpriteSheetBrownSide.png"), 23, 0)
    s.put(flip(horse), 74, 62)
    for x, c in ((70, (170, 120, 80)), (76, (120, 140, 90)), (82, (160, 100, 120))):
        s.d.rectangle([x - 2, 48, x + 2, 54], fill=c + (255,), outline=(60, 40, 30, 255))      # the bags
    s.put(char("OldWoman", "left"), 54, 62)
    s.d.line([(58, 56), (66, 54)], fill=(160, 130, 90, 255))                                   # the rope
    return s.lit("day")


@scene("brillo")
def brillo():
    """In a crack between two rocks, something shines in the sun. The crack is narrow and dark, and smells of animal."""
    s = Scene("grass", ["........", "........", "........", "..,.....", "........", ".....,.."])
    s.d.rectangle([62, 40, 69, 64], fill=(36, 28, 32, 255))
    s.put(rock("big"), 36, 70).put(flip(rock("big")), 95, 72)
    s.d.point((66, 52), fill=(255, 255, 220, 255)); s.d.point((65, 52), fill=(255, 230, 140, 255))
    s.d.point((66, 51), fill=(255, 230, 140, 255)); s.d.point((67, 52), fill=(255, 230, 140, 255))
    return s.glow(66, 52, 8, WARM, 0.9).lit("day")


# ---------------- Cards (art/cards/<id>.png): the card box shows y 10..86 ----------------

def ford(rows=None):
    """El Vado: grass on both banks of a stream crossed by stepping stones."""
    s = Scene("grass", rows or ["........", "........", "~~~~~~~~", "~~~~~~~~", "........", "........"], water="grass")
    for x in range(8, 128, 16): s.d.ellipse([x - 5, 38, x + 5, 44], fill=(150, 146, 140, 255), outline=(70, 66, 64, 255))
    return s


@card("static")
def c_static():
    """In the Ford's square a girl has stroked Relampín's back: she has heard the latest news and gone stiff, hair on end. The neighbours laugh."""
    s = Scene("grass", ["........", "..====..", "..====..", "..====..", "..====..", "........"])
    s.put(tree(), 10, 30).put(tree(), 118, 30)
    s.put(char("EggGirl", "down"), 60, 56).put(mon("relampin", "left"), 76, 58)
    for dx in (-4, -1, 2, 5): s.d.line([(60 + dx, 42), (60 + dx * 2, 36)], fill=(250, 240, 150, 255))
    for n, x, d in (("Villager", 24, "right"), ("OldWoman", 38, "right"), ("Villager2", 96, "left"), ("Child", 108, "left")): s.put(char(n, d), x, 74)
    return s.lit("day")


@card("chorus")
def c_chorus():
    """Sunset in the Ford's square: Coplo sings standing on a barrel and the whole square takes up the refrain; Trinilla keeps the beat from his cap."""
    s = Scene("grass", ["........", "..====..", "..====..", "..====..", "..====..", "........"])
    s.d.rectangle([58, 40, 70, 52], fill=(140, 96, 56, 255), outline=(60, 40, 24, 255))
    s.put(char("FighterRed", "down", 6), 64, 42).put(mon("trinilla", "down"), 64, 28)
    import math as _m
    for i, n in enumerate(("Villager", "OldWoman", "Child", "Villager2", "Greenman", "Villager3", "NinjaBlue", "Villager4")):
        a = _m.pi * (0.1 + i / 7 * 0.8); s.put(char(n, "up"), 64 + int(52 * _m.cos(a)), 50 + int(30 * _m.sin(a)))
    return s.lit("dusk")


@card("duet")
def c_duet():
    """Duet: on the Ford's stepping stones Tila (day side) and Nim (night side) sing their peoples' lullabies at once; the two notes meet and a star is born."""
    s = ford()
    s.put(char("Woman", "right"), 40, 42).put(mon("nim", "left"), 88, 42)
    for x, y, c in ((50, 30, (255, 240, 200)), (56, 24, (255, 240, 200)), (78, 30, (190, 180, 240)), (72, 24, (190, 180, 240))): s.d.point((x, y), fill=c + (255,)); s.d.line([(x + 1, y), (x + 1, y - 3)], fill=c + (255,))
    s.put(mon("unisona", "down"), 64, 22).glow(64, 14, 26, (255, 250, 220), 1.2)
    s.lit("dusk")
    night = s.g.crop((64, 0, 128, 96)); from PIL import ImageEnhance as _E
    night = _E.Brightness(night).enhance(0.55); s.g.paste(night, (64, 0)); s.d = ImageDraw.Draw(s.g)
    return s


@card("unison")
def c_unison():
    """Night at the Ford: people of every people sing the same song in a ring, and Unísona shines above them."""
    s = ford(["........", "........", "........", "........", "~~~~~~~~", "~~~~~~~~"])
    import math as _m
    for i, n in enumerate(("Woman", "Master", "Greenman", "NinjaMageBlack", "OldWoman", "Caveman", "NinjaBlue", "Eskimo", "Child")):
        a = i / 9 * 2 * _m.pi; s.put(char(n, "down"), 64 + int(40 * _m.cos(a)), 48 + int(18 * _m.sin(a)))
    s.put(mon("unisona", "down", 1), 64, 46).glow(64, 34, 50, (255, 250, 220), 1.4)
    return s.lit("night")
