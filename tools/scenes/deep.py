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


# ---------------- Cards (art/cards/<id>.png): the card box shows y 10..86 ----------------

@card("frostslow")
def c_frostslow():
    """Behind a window of the White Deep, frost creeps very slowly towards a flower in a pot; Carámbano watches it come, in no hurry."""
    s = Scene("snow", ["........"] * 6, var=1)
    s.d.rectangle([24, 10, 104, 70], fill=(110, 80, 56, 255)); s.d.rectangle([30, 16, 98, 64], fill=(170, 200, 230, 255))
    s.d.line([(64, 16), (64, 64)], fill=(110, 80, 56, 255), width=2); s.d.line([(30, 40), (98, 40)], fill=(110, 80, 56, 255), width=2)
    for i in range(10): x = 30 + i * 3; s.d.line([(30, 16 + i * 4), (x + 6, 16 + i * 2)], fill=(240, 248, 255, 255))
    s.d.rectangle([76, 56, 84, 64], fill=(180, 100, 60, 255)); s.d.line([(80, 56), (80, 48)], fill=(60, 140, 60, 255)); s.d.ellipse([77, 44, 83, 50], fill=(230, 90, 120, 255))
    s.put(mon("carambano", "up"), 64, 82)
    return s.lit("cold")


@card("tombquiet")
def c_tombquiet():
    """Under the snow, round the Frozen Tomb, Carámbano digs tunnels on tiptoe so as to wake no one. This winter the roof drips."""
    s = Scene("snow", ["........"] * 6)
    s.d.rectangle([0, 0, 128, 30], fill=(190, 220, 240, 255), outline=(100, 140, 180, 255))
    s.d.ellipse([20, 50, 108, 80], fill=(120, 140, 170, 255)); s.d.ellipse([28, 54, 100, 76], fill=(70, 80, 110, 255))
    s.put(mon("carambano", "right"), 60, 72)
    for x in range(30, 104, 11): s.d.point((x, 34 + x % 5), fill=(140, 190, 240, 255))
    return s.lit("cold")


@card("vigil")
def c_vigil():
    """Night in the White Deep: every house sleeps but one, with a candle in the window; Carámbano keeps watch at the door, wrapped in snow."""
    s = Scene("snow", ["........", "........", "........", "...==...", "...==...", "...==..."])
    for x, lit in ((-6, False), (40, True), (88, False)):
        s.at(tint(cut("TilesetHouse", 0, 0, 64, 48), (220, 230, 250), 0.35), x, -4)
        if lit: s.glow(64, 26, 16, WARM, 1.1)
    s.put(mon("carambano", "down"), 72, 58)
    return s.snow(40).lit("night")


@card("regent")
def c_regent():
    """Before the Frozen Tomb, Regent Albina speaks for the Sleeping King; Guardatumba kneels and hears the order."""
    s = Scene("snow", ["........"] * 6)
    s.d.rectangle([24, 0, 104, 40], fill=(190, 220, 240, 255), outline=(100, 140, 180, 255)); s.d.rectangle([54, 14, 74, 40], fill=(140, 180, 210, 255), outline=(90, 130, 170, 255))
    s.put(char("Princess", "down"), 64, 60)
    s.d.polygon([(60, 46), (62, 43), (64, 46), (66, 43), (68, 46)], fill=(220, 240, 255, 255))
    s.put(mon("guardatumba", "up", 1), 64, 82)
    return s.lit("cold")


@card("thousand")
def c_thousand():
    """Guardatumba has stood a thousand years at the Tomb's door, snow piled on its shoulders; Carámbano, at its feet, looks tiny."""
    s = Scene("snow", ["........"] * 6)
    s.d.rectangle([24, 0, 104, 34], fill=(190, 220, 240, 255), outline=(100, 140, 180, 255)); s.d.rectangle([54, 8, 74, 34], fill=(140, 180, 210, 255), outline=(90, 130, 170, 255))
    g = scale(mon("guardatumba", "down"), 2); s.put(g, 64, 78)
    s.d.ellipse([64 - g.width // 2, 78 - g.height - 2, 64 + g.width // 2, 78 - g.height + 6], fill=(246, 248, 252, 255))
    s.put(mon("carambano", "down"), 92, 84)
    return s.snow(30).lit("cold")


@card("sealed")
def c_sealed():
    """Inside the Frozen Tomb there is no king: on the slab sleeps the tip of a huge root, and the door, on the inside, is full of scratches."""
    s = Scene("snow", ["........"] * 6, var=1)
    s.d.rectangle([0, 0, 128, 96], fill=(140, 170, 200, 255))
    s.d.rectangle([30, 44, 98, 66], fill=(190, 210, 230, 255), outline=(90, 120, 150, 255))
    s.stem([(0, 30), (30, 40), (50, 50), (70, 52), (88, 50)], (90, 60, 40, 255)); s.stem([(0, 34), (28, 44), (48, 54), (80, 54)], (70, 46, 30, 255))
    for x in range(10, 30, 4): s.d.line([(x, 70), (x + 3, 86)], fill=(80, 100, 130, 255))
    return s.glow(70, 52, 30, SAP, 0.6).lit("deep")


@card("stillgrow")
def c_stillgrow():
    """In the snow lies a sledge abandoned long ago, a lantern fallen beside it; mushrooms have grown on it unhurried. Capuchón does not move: it waits."""
    s = Scene("snow", ["........"] * 6)
    s.d.rectangle([34, 46, 86, 56], fill=(130, 90, 56, 255), outline=(60, 40, 26, 255)); s.d.line([(30, 60), (90, 60)], fill=(90, 70, 50, 255), width=2)
    for x, c in ((42, (220, 60, 70)), (58, (240, 200, 90)), (76, (200, 120, 220))): shroom(s, x, 48, c)
    s.d.rectangle([96, 66, 104, 72], fill=(70, 66, 74, 255), outline=(30, 28, 34, 255)); s.d.line([(104, 69), (110, 69)], fill=(70, 66, 74, 255))
    s.put(mon("capuchon", "down"), 30, 80)
    return s.lit("cold")


@card("harvest")
def c_harvest():
    """Black Harvest: Esporina gathers black caps round a pool of Savia in the White Deep; the drops fall upwards."""
    s = Scene("snow", ["........"] * 6, var=1)
    s.sap(64, 56, 30, 8)
    for x, y in ((40, 52), (88, 50), (52, 66), (80, 66)): shroom(s, x, y, (40, 30, 50))
    for x, y in ((56, 40), (70, 34), (62, 26)): s.d.ellipse([x, y, x + 2, y + 3], fill=(30, 20, 40, 255))
    s.put(char("Cavegirl2", "left"), 104, 70).put(mon("capuchon", "right"), 22, 74)
    return s.lit("deep")


@card("saprem")
def c_saprem():
    """In her hut Esporina gives a bowl of remedy to a coughing old man of the Underside; on the shelves, jars of black caps. Capuchón watches from the floor."""
    s = Scene("sand", ["........"] * 6, var=1)
    s.d.rectangle([0, 0, 128, 30], fill=(110, 80, 56, 255))
    for y in (12, 26):
        s.d.line([(0, y), (128, y)], fill=(70, 50, 34, 255), width=2)
        for x in range(8, 124, 12): s.d.rectangle([x, y - 8, x + 6, y - 1], fill=(180, 200, 210, 255), outline=(80, 90, 100, 255)); s.d.ellipse([x + 1, y - 6, x + 5, y - 3], fill=(30, 20, 40, 255))
    s.put(char("Cavegirl2", "right"), 50, 62).put(char("OldMan", "left"), 78, 62)
    s.d.ellipse([60, 52, 68, 56], fill=(150, 104, 62, 255))
    s.put(mon("capuchon", "up"), 64, 84)
    return s.glow(64, 46, 34, WARM, 0.9).lit("cave")


@card("yawn")
def c_yawn():
    """Bostezo yawns in the snowy square of the White Deep and the Regent's line of guards catches it one after another."""
    s = Scene("snow", ["........", "........", "..====..", "..====..", "..====..", "........"])
    s.put(mon("bostezo", "down", 1), 26, 66)
    for i, x in enumerate(range(48, 128, 14)): s.put(char("Eskimo" if i % 2 else "EskimoNinja", "down" if i < 3 else "left"), x, 56 + (i % 2))
    for x in (34, 40): s.d.point((x, 50), fill=(250, 240, 200, 255))
    return s.snow(20).lit("cold")


@card("pillow")
def c_pillow():
    """By the fire a grandmother of the White Deep makes a pillow of Bostezo's wool; Bostezo fell asleep in her lap while being shorn."""
    s = Scene("sand", ["........"] * 6, var=1)
    s.d.rectangle([0, 0, 128, 30], fill=(110, 80, 56, 255)); s.d.rectangle([90, 6, 122, 30], fill=(60, 50, 50, 255)); s.put(frame(img("FX", "Particle", "Fire.png"), 12, 1), 106, 30)
    s.glow(106, 24, 50, FIRE, 1.2)
    s.put(char("OldWoman", "down"), 56, 60).put(mon("bostezo", "down"), 58, 76)
    s.d.rectangle([70, 66, 84, 72], fill=(244, 240, 230, 255), outline=(150, 140, 130, 255))
    return s.lit("cave")


@card("tale")
def c_tale():
    """Breakfast in a White Deep house: the little one tells what she dreamt, a huge root under the snow. Bostezo still sleeps under the table."""
    s = Scene("sand", ["........"] * 6, var=1)
    s.d.rectangle([0, 0, 128, 24], fill=(110, 80, 56, 255))
    s.d.rectangle([30, 44, 98, 64], fill=(150, 104, 62, 255), outline=(70, 46, 28, 255))
    for x in (42, 64, 86): s.d.ellipse([x - 4, 50, x + 4, 56], fill=(236, 230, 210, 255))
    s.put(char("Eskimo", "down"), 42, 44).put(char("Child", "down"), 64, 44).put(char("OldWoman", "down"), 86, 44)
    s.put(mon("bostezo", "down"), 64, 84)
    s.stem([(54, 24), (60, 16), (70, 18), (76, 10)], (110, 76, 50, 255))
    return s.glow(64, 40, 40, WARM, 0.8).lit("dawn")


@card("spores")
def c_spores():
    """A cloud of spores falls on the White Deep village; people cover their mouths, and it smells of bread, earth and something that should smell of nothing."""
    s = Scene("snow", ["........", "........", "...==...", "...==...", "...==...", "...==..."])
    s.at(tint(cut("TilesetHouse", 0, 0, 64, 48), (220, 230, 250), 0.35), -10, -6).at(tint(cut("TilesetHouse", 64, 0, 64, 48), (220, 230, 250), 0.35), 74, -6)
    for n, x in (("Eskimo", 44), ("EskimoNinja", 84)): s.put(char(n, "down", 6), x, 70)
    s.put(guardian("micelio"), 64, 90)
    s.fog(0.25, (230, 210, 180))
    for i in range(60): s.d.point(((i * 41) % 128, (i * 29) % 96), fill=(250, 230, 190, 255))
    return s.lit("gloom")


@card("threads")
def c_threads():
    """Under the ice of the White Deep, Mother Mycelium's white threads run through the earth farther than any tunnel, and one reaches the Tomb."""
    s = Scene("snow", ["........"] * 6)
    s.d.rectangle([0, 24, 128, 96], fill=(90, 70, 60, 255))
    for pts in (((0, 50), (30, 46), (60, 56), (90, 50), (128, 58)), ((10, 80), (40, 70), (64, 76), (100, 66)), ((30, 46), (40, 30)), ((90, 50), (100, 36))): s.stem(list(pts), (240, 236, 226, 255))
    s.d.rectangle([96, 4, 124, 26], fill=(190, 220, 240, 255), outline=(100, 140, 180, 255))
    s.put(guardian("micelio"), 30, 92)
    return s.lit("deep")


@card("sapbed")
def c_sapbed():
    """Mother Mycelium sleeps peacefully on a pool of sap; for once the sap harms no one. Esporina watches with hope."""
    s = Scene("snow", ["........"] * 6, var=1)
    s.sap(64, 66, 40, 10)
    s.put(guardian("micelio"), 64, 66)
    s.put(char("Cavegirl2", "left"), 106, 70)
    for x, c in ((20, (90, 200, 120)), (32, (120, 140, 240))): shroom(s, x, 80, c)
    return s.lit("deep")
