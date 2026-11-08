# Bosque: the Hedge (a wall of round bushes), old oaks (the pack's trees at 2x) and mossy clearings.

def bush(): return cut("TilesetNature", 256, 0, 32, 32)
def oak(k=1):
    """The pack's big round tree (48 x 48); k=2 doubles it for the giant oaks."""
    t = cut("TilesetNature", 48, 288, 48, 48)
    return scale(t, k) if k > 1 else t
def pine(): return tile("TilesetNature", 0, 2, 4, 3)


def hedge(s, y=30, gap=None, thorny=False):
    """The Hedge across the top: round bushes side by side, with an optional gap (x0, x1)."""
    b = dim(bush(), 0.7) if thorny else bush()
    for i, x in enumerate(range(-12, 140, 22)):
        if gap and gap[0] < x < gap[1]: continue
        s.put(b, x, y + (i % 2) * 3)
    if thorny:
        for i in range(0, 128, 5):
            s.d.line([(i, y - 6 + (i % 3)), (i + 3, y - 10 + (i % 4))], fill=(40, 30, 30, 255))
    return s


@scene("abrojo")
def abrojo():
    """Through the gap in the Hedge, a wooden spear bars your way; the guard has thorns on his sleeves and has not slept."""
    s = Scene("grass", ["........", "........", "...==...", "...==...", "...==...", "...==..."])
    hedge(s, 34, gap=(44, 80))
    s.put(char("Greenman", "down"), 62, 58)
    s.d.line([(68, 40), (68, 58)], fill=(130, 90, 50, 255)); s.d.line([(56, 56), (76, 56)], fill=(130, 90, 50, 255))
    s.d.point((68, 39), fill=(200, 200, 190, 255))
    return s.lit("day")


@scene("llovizna")
def llovizna():
    """Outside the Hedge, a Water girl digs with a spoon and buries an acorn; a row of little sticks marks the others."""
    s = Scene("grass", ["........"] * 6)
    hedge(s, 30)
    for x in range(14, 110, 12): s.d.line([(x, 46), (x, 51)], fill=(120, 84, 50, 255))
    s.put(char("Princess", "left"), 84, 70)
    s.d.ellipse([72, 68, 78, 71], fill=(96, 68, 44, 255)); s.d.point((76, 66), fill=(200, 200, 210, 255))
    return s.lit("day")


@scene("agalla")
def agalla():
    """An ancient oak creaks as you pass, like a cough. Two cracks open in the bark that could be eyes."""
    s = Scene("grass", ["........", "........", "........", "========", "========", "........"], var=1)
    s.put(oak(2), 64, 92)
    for x in (54, 68):
        s.d.ellipse([x, 72, x + 6, 76], fill=(20, 12, 10, 255)); s.d.rectangle([x + 2, 73, x + 3, 74], fill=(255, 226, 120, 255))
        s.glow(x + 3, 74, 6, WARM, 0.8)
    return s.lit("gloom")


@scene("liquenes")
def liquenes():
    """Among the roots of the Sitting Oak where the council meets, an old man in a green hood peels an apple, very calmly."""
    s = Scene("grass", ["........"] * 6, var=1)
    s.put(oak(2), 64, 72)
    for pts in ([(40, 64), (30, 72), (20, 74)], [(88, 64), (98, 72), (110, 74)], [(60, 64), (56, 76)], [(70, 64), (76, 78)]):
        s.d.line(pts, fill=(110, 70, 40, 255), width=2)
    s.put(char("OldMan3", "down"), 64, 84)
    s.d.point((68, 80), fill=(200, 50, 40, 255))
    return s.lit("gloom")


@scene("cripta")
def cripta():
    """Under the roots of a huge oak, a wooden door with a moss seal: the Seed Crypt. The seal is broken; a sweet rotten smell."""
    s = Scene("grass", ["........"] * 6, var=1)
    s.put(oak(2), 64, 76)
    s.d.rectangle([56, 58, 72, 74], fill=(110, 72, 42, 255), outline=(50, 30, 20, 255))
    s.d.line([(64, 56), (64, 72)], fill=(70, 44, 26, 255))
    s.d.rectangle([60, 62, 63, 65], fill=(80, 140, 60, 255)); s.d.rectangle([65, 63, 68, 66], fill=(80, 140, 60, 255))   # the torn moss seal
    s.d.line([(64, 72), (66, 76)], fill=(24, 16, 30, 255)); s.sap(66, 78, 8, 3)
    s.put(mon("espinardo", "left", 1), 92, 80)
    return s.lit("gloom")


@scene("silencio")
def silencio():
    """In a clearing, a young woman with leaves in her hair tries to sleep in a hammock of vines. She yawns and turns."""
    s = Scene("grass", ["........", "........", "...,....", "........", "......,.", "........"])
    s.put(oak(), 18, 70).put(oak(), 110, 70)
    s.d.line([(30, 50), (64, 60), (98, 50)], fill=(80, 130, 60, 255), width=2)
    s.put(char("Cavegirl2", "down").rotate(90, expand=True), 64, 60)
    return s.lit("day")


@scene("fuera")
def fuera():
    """Outside the Hedge at dusk, a Shadow family has made a shelter; the father picks up fallen twigs."""
    s = Scene("grass")
    hedge(s, 30)
    s.put(cut("TilesetHouse", 48, 128, 48, 32), 26, 66)
    s.put(cut("TilesetNature", 32, 128, 32, 32), 110, 82)
    for dx, dy in ((-5, 0), (5, 0), (-4, 3), (4, 3), (0, 5), (-3, -3), (3, -3), (0, -4)):
        s.d.rectangle([64 + dx, 72 + dy, 65 + dx, 73 + dy], fill=(140, 136, 128, 255), outline=(60, 56, 60, 255))
    s.d.line([(62, 71), (67, 73)], fill=(110, 74, 44, 255)); s.d.line([(62, 73), (67, 70)], fill=(96, 64, 38, 255))
    s.put(char("Villager3", "left"), 86, 74)
    s.d.line([(78, 70), (81, 73)], fill=(120, 80, 48, 255)); s.d.line([(77, 72), (81, 71)], fill=(120, 80, 48, 255))
    s.put(char("Woman", "right"), 44, 70)
    s.put(char("Child", "down"), 30, 90).put(char("Child", "down", 1), 44, 92)
    return s.glow(124, 0, 70, (255, 214, 170), 0.7).lit("dusk")


@scene("musgo")
def musgo():
    """In a moss-carpeted clearing, three Forest children sit in a ring, very still, heads bent to the ground."""
    s = Scene("grass", ["........"] * 6, var=1)
    s.put(pine(), 10, 44).put(pine(), 118, 44)
    s.put(char("Greenman", "right"), 52, 66).put(char("NinjaGreen", "left"), 76, 66).put(char("Child", "up"), 64, 78)
    return s.lit("day")


@scene("espinas")
def espinas():
    """The path closes: the Hedge grew in the night and a wall of thorns cuts it. A Remolín is trapped in the branches."""
    s = Scene("grass", ["........", "........", "...==...", "...==...", "...==...", "...==..."])
    hedge(s, 44, thorny=True)
    s.put(mon("remolin", "down"), 66, 38)
    s.stem([(58, 30), (64, 34), (72, 30)], col=(40, 30, 30, 255))
    return s.lit("day")
