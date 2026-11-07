# Fondo Blanco: snow, ice halls and warm mushroom caverns under the ice.

def icewall(s):
    w = tile("TilesetRelief", 8, 0, 4, 2)
    w = Image.blend(w, Image.new("RGBA", w.size, (200, 225, 245, 255)), 0.45); w.putalpha(tile("TilesetRelief", 8, 0, 4, 2).getchannel("A"))
    s.at(w, 0, 0).at(w, 64, 0)
    return s


def shroom(s, x, y, col=(220, 60, 70)):
    s.d.rectangle([x - 1, y - 4, x + 1, y], fill=(236, 230, 210, 255))
    s.d.pieslice([x - 5, y - 9, x + 5, y - 1], 180, 360, fill=col + (255,), outline=(60, 30, 40, 255))
    s.glow(x, y - 5, 10, col, 0.6)
    return s


def bed(s, x, y):
    s.d.rectangle([x - 7, y - 4, x + 7, y + 4], fill=(240, 240, 246, 255), outline=(120, 120, 140, 255))
    return s


@scene("vela")
def vela():
    """In the hall of the Watch Shift, a dozen white fur beds in a circle; someone sleeps in each. A young woman wakes slowly."""
    s = icewall(Scene("snow", ["........"] * 6))
    import math as _m
    for i in range(10):
        a = i / 10 * 2 * _m.pi; bed(s, 64 + int(40 * _m.cos(a)), 58 + int(22 * _m.sin(a)))
    s.put(char("Eskimo", "down"), 64, 66)
    return s.glow(64, 58, 40, (200, 220, 255), 0.4).lit("cave")


@scene("setas")
def setas():
    """Under the ice opens a warm cavern of mushrooms glowing in every colour; a short Mushroom man waters them with a ladle."""
    s = Scene("snow", var=1)
    for x, y, c in ((20, 40, (220, 60, 70)), (40, 70, (90, 200, 120)), (96, 44, (120, 140, 240)), (110, 76, (240, 200, 70)), (70, 84, (200, 100, 220))):
        shroom(s, x, y, c)
    s.put(mon("sombrerin", "down"), 64, 60)
    return s.lit("deep")


@scene("paso")
def paso():
    """The snow pass is almost closed. An Ice woman digs alone with a wooden shovel, opening a tunnel out through the snow."""
    s = Scene("snow", ["........"] * 6)
    s.d.rectangle([0, 0, 128, 40], fill=(244, 246, 252, 255))
    s.d.ellipse([54, 22, 78, 46], fill=(40, 50, 70, 255))
    s.put(char("EskimoNinja", "up"), 66, 62)
    s.d.line([(72, 56), (80, 46)], fill=(140, 100, 60, 255), width=2)
    return s.snow(50).lit("cold")


@scene("carambanos")
def carambanos():
    """A gallery of ice with huge icicles sharp as spears. They drip; they never used to."""
    s = icewall(Scene("snow", var=1))
    for x in range(6, 128, 12):
        h = 12 + (x * 7) % 18
        s.d.polygon([(x - 4, 30), (x + 4, 30), (x, 30 + h)], fill=(200, 230, 250, 255), outline=(110, 150, 190, 255))
        s.d.point((x, 32 + h + 2), fill=(150, 200, 250, 255))
    return s.lit("cold")


@scene("hielo")
def hielo():
    """On a frozen lake, two Ice children skate on bone blades, laughing; far below the ice, a pale shadow."""
    s = Scene("snow", ["........", "~~~~~~~~", "~~~~~~~~", "~~~~~~~~", "~~~~~~~~", "........"], water="snow")
    s.d.ellipse([48, 46, 84, 58], fill=(160, 190, 210, 255))
    s.put(char("Eskimo", "right"), 40, 44).put(char("NinjaEskimo", "left"), 90, 60)
    return s.lit("cold")


@scene("sueno")
def sueno():
    """In a mushroom cave the air is so warm and still you can hardly keep your eyes open; Capuchones sway, letting out dust."""
    s = Scene("snow", var=1)
    s.put(mon("capuchon", "down"), 44, 60).put(mon("capuchon", "left"), 84, 54)
    for x, y in ((40, 40), (52, 36), (80, 34), (90, 40), (64, 30), (70, 44)): s.d.point((x, y), fill=(250, 230, 180, 255))
    shroom(s, 20, 80, (200, 120, 220)); shroom(s, 108, 82, (240, 200, 90))
    return s.fog(0.18, (230, 210, 230)).lit("deep")


@scene("tumba")
def tumba():
    """The Frozen Tomb, a block of ice the size of a house with a carved door, dripping everywhere; a guard with a crystal spear."""
    s = Scene("snow", ["........"] * 6)
    s.d.rectangle([24, 4, 104, 60], fill=(190, 220, 240, 255), outline=(100, 140, 180, 255))
    s.d.rectangle([54, 30, 74, 60], fill=(140, 180, 210, 255), outline=(90, 130, 170, 255))
    for x in range(28, 104, 9): s.d.point((x, 62 + x % 4), fill=(140, 190, 240, 255))
    s.put(char("KnightGold", "down"), 96, 80)
    s.d.line([(102, 58), (102, 80)], fill=(190, 230, 255, 255)); s.d.point((102, 57), fill=(255, 255, 255, 255))
    return s.lit("cold")


@scene("albina")
def albina():
    """In a hall of carved ice, a tall woman with a crystal crown receives her subjects one by one; on seeing you, she dismisses them all."""
    s = icewall(Scene("snow", ["........", "........", "..====..", "..====..", "..====..", "..====.."], var=1))
    s.d.rectangle([52, 24, 76, 44], fill=(200, 230, 250, 255), outline=(110, 150, 190, 255))
    s.put(char("Princess", "down"), 64, 44)
    s.d.polygon([(60, 30), (62, 27), (64, 30), (66, 27), (68, 30)], fill=(220, 240, 255, 255))
    for x in (40, 88): s.put(char("Eskimo", "down"), x, 70)
    return s.lit("cold")


@scene("despierta")
def despierta():
    """The ice has stopped dripping; the White Deep is truly silent. At the cavern mouth, a woman with mushroom spores greets you."""
    s = icewall(Scene("snow", ["........"] * 6))
    s.put(cut("TilesetReliefDetail", 0, 112, 48, 48), 64, 60)
    s.put(char("Cavegirl2", "down"), 64, 80)
    shroom(s, 40, 86, (240, 200, 90)); shroom(s, 90, 88, (200, 120, 220))
    return s.lit("dawn")
