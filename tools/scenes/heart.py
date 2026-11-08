# Corazón: the great Stump at the centre of the valley, its ring of statues, and the Black Sap rising.

def stump(s, x=64, y=56, k=2):
    st = scale(cut("TilesetNature", 0, 128, 32, 32), k)
    s.put(st, x, y)
    return s


def statue(s, x, y, back=True):
    s.d.rectangle([x - 6, y - 3, x + 6, y + 1], fill=(130, 126, 134, 255), outline=(60, 56, 66, 255))
    s.put(char("Statue", "up" if back else "down"), x, y - 2)
    return s


@scene("ofrendas")
def ofrendas():
    """At the valley's centre rises the Stump, so wide twenty people could not hug it; offerings all round it, and a guard."""
    s = stump(Scene("grass", ["........"] * 6, var=1), 64, 60)
    for x, y in ((30, 74), (40, 82), (88, 80), (100, 72), (64, 86)):
        s.put(tile("TilesetFloorDetail", 5, 2, trim=True), x, y)
    s.put(char("Greenman", "down"), 108, 88)
    return s.lit("gloom")


@scene("estatuas")
def estatuas():
    """A ring of ancient statues round the Stump, one per people, all facing outward; a dusty old sculptor works at one."""
    s = stump(Scene("grass", ["........"] * 6, var=1), 64, 50, 2)
    for x, y in ((20, 40), (108, 40), (16, 76), (112, 76), (64, 92)): statue(s, x, y, back=False)
    s.put(char("OldMan3", "left"), 30, 80)
    return s.lit("gloom")


@scene("latido")
def latido():
    """At the foot of the Stump the earth is warm and soft like the skin of something asleep; now and then the ground thumps."""
    s = stump(Scene("grass", ["........"] * 6, var=1), 64, 50)
    for r in (16, 26, 36): s.d.arc([64 - r, 70 - r // 2, 64 + r, 70 + r // 2], 0, 360, fill=(80, 60, 50, 255))
    return s.glow(64, 70, 30, (255, 150, 120), 0.4).lit("gloom")


@scene("peregrina")
def peregrina():
    """On a root sits a woman with a cloak half white, half black, sewing a boot; one eye light and one dark. She sings low."""
    s = stump(Scene("grass", ["........"] * 6, var=1), 64, 40, 2)
    s.d.line([(30, 64), (98, 64)], fill=(110, 70, 40, 255), width=3)
    s.put(char("Monk", "down"), 64, 64)
    s.d.rectangle([58, 58, 63, 64], fill=(240, 240, 240, 255)); s.d.rectangle([64, 58, 70, 64], fill=(30, 26, 34, 255))
    return s.lit("dusk")


@scene("negra")
def negra():
    """The earth has split in a long hot crack; Black Sap rises through it, slow and shining, like oil that breathes."""
    s = Scene("grass", ["........"] * 6, var=1)
    s.d.line([(10, 40), (40, 50), (64, 46), (90, 58), (120, 54)], fill=(16, 10, 22, 255), width=5)
    for x, y in ((30, 48), (64, 47), (96, 58)): s.sap(x, y, 14, 5)
    s.glow(64, 50, 40, SAP, 0.5)
    s.put(mon("brotin", "down"), 40, 76)
    return s.lit("gloom")


@scene("bomba")
def bomba():
    """Next to a statue, a new well covered with planks and an iron hand pump; a Shadow man black to the elbows works it."""
    s = Scene("grass", ["........"] * 6, var=1)
    statue(s, 30, 50, back=False)
    s.d.rectangle([56, 52, 84, 62], fill=(150, 104, 62, 255), outline=(70, 46, 28, 255))
    s.d.rectangle([72, 36, 76, 54], fill=(80, 80, 90, 255)); s.d.line([(74, 38), (90, 32)], fill=(80, 80, 90, 255), width=2)
    s.sap(70, 66, 10, 3)
    s.put(char("NinjaDark", "left"), 94, 58)
    return s.lit("gloom")


@scene("hollin")
def hollin():
    """A man in the Lantern uniform, sooty head to toe, sits by a huge dead lantern; a cloud of grey moths flutters round his head."""
    s = Scene("grass", ["........"] * 6, var=1)
    s.put(scale(dim(cut("TilesetElement", 96, 48, 16, 32), 0.4), 2), 74, 70)
    s.put(dim(char("Knight", "down"), 0.55), 52, 72)
    for x, y in ((46, 52), (52, 48), (58, 54), (50, 56), (56, 46)): s.d.point((x, y), fill=(180, 176, 170, 255))
    return s.lit("gloom")


@scene("juramento")
def juramento():
    """In the Stump's bark, two hand prints side by side: one with gold dust in its grooves, the other with ash."""
    s = Scene("grass", ["........"] * 6, var=1)
    s.d.rectangle([0, 0, 128, 96], fill=(120, 80, 50, 255))
    for x in range(0, 128, 8): s.d.line([(x, 0), (x + 2, 96)], fill=(90, 58, 34, 255))
    for x, c in ((48, (230, 200, 90)), (80, (70, 66, 70))):
        s.d.ellipse([x - 7, 44, x + 7, 60], outline=c + (255,), width=2)
        for i in range(5): s.d.line([(x - 6 + i * 3, 44), (x - 7 + i * 3, 34 + (i % 2) * 2)], fill=c + (255,), width=2)
    return s.glow(48, 50, 16, WARM, 0.6).lit("gloom")


# ---------------- Cards (art/cards/<id>.png): the card box shows y 10..86 ----------------

@card("ache")
def c_ache():
    """Deep in the Clearing the Aching Root is cracked and sweats black sap; the Caretaker with his lantern is a tiny figure beside it."""
    s = Scene("grass", ["........"] * 6, var=1)
    s.put(guardian("raiz", 2), 64, 80)
    for x, y in ((44, 70), (84, 74), (60, 84)): s.sap(x, y, 10, 3)
    s.put(char("OldMan", "down"), 104, 84).glow(110, 76, 14, WARM, 1.0)
    return s.lit("gloom")


@card("eight")
def c_eight():
    """Round the Root rise, like ghosts, eight singers, one per people; each sings it something different, and the Root remembers them all."""
    s = stump(Scene("grass", ["........"] * 6, var=1), 64, 58)
    import math as _m
    for i, n in enumerate(("Woman", "Master", "Greenman", "NinjaMageBlack", "OldWoman", "Caveman", "NinjaBlue", "Eskimo")):
        a = i / 8 * 2 * _m.pi; x, y = 64 + int(46 * _m.cos(a)), 54 + int(26 * _m.sin(a))
        g = Image.blend(char(n, "down"), Image.new("RGBA", (16, 16), (220, 230, 255, 255)), 0.5); g.putalpha(char(n, "down").getchannel("A").point(lambda v: v * 3 // 4))
        s.put(g, x, y + 8); s.glow(x, y, 12, (220, 230, 255), 0.6)
    return s.lit("night")


@card("rootheart")
def c_rootheart():
    """Inside the Root there is a heart of wood that beats once every hundred years; today it beat three times, and the rings of light are still opening."""
    s = Scene("grass", ["........"] * 6, var=1)
    s.d.rectangle([0, 0, 128, 96], fill=(80, 54, 34, 255))
    for x in range(0, 128, 8): s.d.line([(x, 0), (x + 3, 96)], fill=(64, 42, 26, 255))
    for r in (20, 32, 44): s.d.ellipse([64 - r, 48 - r * 2 // 3, 64 + r, 48 + r * 2 // 3], outline=(255, 220, 150, 255))
    s.d.polygon([(64, 62), (50, 46), (52, 38), (58, 36), (64, 42), (70, 36), (76, 38), (78, 46)], fill=(150, 90, 50, 255), outline=(60, 34, 20, 255))
    return s.glow(64, 48, 50, WARM, 1.2).lit("gloom")


@card("firstnote")
def c_firstnote():
    """Long, long ago, on the Clearing's root, the First Singer gives a single note; round her already float the nine lights the Song will split into."""
    s = Scene("grass", ["........"] * 6, var=1)
    s.d.rectangle([0, 0, 128, 40], fill=(30, 30, 60, 255))
    for x, y in ((10, 6), (30, 14), (50, 4), (80, 10), (100, 18), (120, 6)): s.d.point((x, y), fill=(255, 255, 240, 255))
    s.put(scale(cut("TilesetNature", 0, 128, 32, 32), 2), 64, 74)
    s.put(char("Monk2", "down", 6), 64, 50)
    import math as _m
    cols = ((255, 120, 80), (110, 200, 90), (255, 230, 140), (250, 240, 120), (200, 230, 250), (240, 160, 200), (90, 150, 220), (150, 140, 120), (130, 100, 180))
    for i, c in enumerate(cols):
        a = i / 9 * 2 * _m.pi; x, y = 64 + int(34 * _m.cos(a)), 40 + int(20 * _m.sin(a))
        s.d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=c + (255,)); s.glow(x, y, 10, c, 0.8)
    return s.lit("night")
