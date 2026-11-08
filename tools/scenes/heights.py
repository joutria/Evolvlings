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


# ---------------- Cards (art/cards/<id>.png): the card box shows y 10..86 ----------------

def lines(s, y=40):
    s.d.line([(0, y), (128, y + 4)], fill=(120, 110, 100, 255)); s.d.line([(0, y + 20), (128, y + 16)], fill=(120, 110, 100, 255))
    for x, c in ((14, (200, 80, 70)), (34, (90, 130, 200)), (58, (230, 200, 90)), (88, (240, 240, 240)), (112, (120, 180, 110))):
        s.d.rectangle([x, y + 1 + x // 32, x + 6, y + 8 + x // 32], fill=c + (255,))
    return s


@card("gust")
def c_gust():
    """Noon in the Heights: Fizz dozes on the washing lines and lets out three puffs by accident; a hat, a letter and a sock fly off, each its own way."""
    s = cliffs(Scene("snow", ["........"] * 6))
    lines(s, 40)
    s.put(mon("fizz", "down"), 64, 60)
    s.d.pieslice([16, 70, 28, 78], 180, 360, fill=(140, 90, 50, 255)); s.d.rectangle([94, 30, 100, 34], fill=(240, 236, 220, 255)); s.d.polygon([(106, 76), (110, 76), (110, 84), (114, 86), (106, 86)], fill=(200, 70, 70, 255))
    for a, b in (((56, 58), (30, 72)), ((70, 52), (92, 36)), ((70, 62), (100, 78))): s.d.line([a, b], fill=(240, 244, 255, 255))
    return s.lit("day")


@card("cloud")
def c_cloud():
    """On a Heights rooftop Fizz has fallen asleep in the shape of a cloud with a pillow under it; a boy has climbed up to nap on top."""
    s = Scene("snow", ["........"] * 6)
    s.d.rectangle([0, 14, 128, 86], fill=(96, 104, 124, 255))
    for y in range(18, 86, 6):
        for x in range((y // 6 % 2) * 6, 128, 12): s.d.rectangle([x, y, x + 11, y + 5], outline=(70, 76, 96, 255))
    s.d.rectangle([0, 10, 128, 14], fill=(130, 136, 156, 255))
    s.d.ellipse([34, 40, 94, 66], fill=(244, 246, 252, 255), outline=(170, 180, 200, 255)); s.d.ellipse([46, 32, 80, 52], fill=(244, 246, 252, 255), outline=(170, 180, 200, 255))
    s.put(mon("fizz", "down"), 50, 62)
    s.put(char("Boy", "down"), 72, 50)
    return s.lit("day")


@card("errand")
def c_errand():
    """Relampín races across the rope bridge between two needles of the Heights with three scrolls tied to its back."""
    s = Scene("snow", ["........"] * 6)
    s.d.rectangle([0, 20, 128, 96], fill=(176, 196, 220, 255)); clouds(s, 40); clouds(s, 80)
    s.d.rectangle([0, 50, 128, 58], fill=(150, 104, 62, 255))
    for x in range(0, 128, 6): s.d.line([(x, 50), (x, 58)], fill=(90, 60, 34, 255))
    s.put(mon("relampin", "right"), 66, 56)
    for i in range(3): s.d.rectangle([56 + i * 3, 42, 58 + i * 3, 47], fill=(236, 226, 200, 255))
    for x in (40, 46, 52): s.d.line([(x, 52), (x - 8, 52)], fill=(250, 250, 180, 255))
    return s.lit("day")


@card("news")
def c_news():
    """Sold News: over the clouds of the Heights a hooded buyer pays for a sealed scroll; the seal is a lantern, the news is about Albor."""
    s = cliffs(Scene("snow", ["........"] * 6))
    s.d.rectangle([0, 60, 128, 96], fill=(176, 196, 220, 255)); clouds(s, 74)
    s.put(char("NinjaMasked", "left"), 80, 58).put(mon("relampin", "right"), 48, 56)
    s.d.rectangle([60, 44, 66, 48], fill=(236, 226, 200, 255)); s.d.point((63, 46), fill=(200, 60, 60, 255))
    for x in (70, 73): s.d.ellipse([x, 48, x + 2, 50], fill=(240, 200, 80, 255))
    return s.lit("dusk")


@card("highnote")
def c_highnote():
    """At night in the Heights Trinilla perches on a window and whistles the family's surname inside; below, in the shadow, someone waits with an open bag."""
    s = Scene("snow", ["........"] * 6)
    s.at(scale(cut("TilesetHouse", 0, 0, 64, 48), 2), 0, -20)
    s.glow(64, 40, 18, WARM, 1.0)
    s.put(mon("trinilla", "left"), 64, 48)
    for x, y in ((54, 40), (50, 34), (46, 28)): s.d.point((x, y), fill=(240, 160, 200, 255)); s.d.line([(x + 1, y), (x + 1, y - 3)], fill=(240, 160, 200, 255))
    s.put(char("NinjaDark", "up"), 96, 80); s.d.ellipse([100, 76, 108, 82], fill=(120, 80, 50, 255))
    return s.lit("night")


@card("deal")
def c_deal():
    """On the Choir of Three's balcony Céfira, Centella and Arpegio sing a deal to a Guild merchant; the notes tie his wrist like a ribbon."""
    s = Scene("snow", ["........"] * 6)
    s.d.rectangle([0, 0, 128, 40], fill=(130, 126, 140, 255)); s.d.rectangle([10, 38, 118, 44], fill=(170, 166, 180, 255), outline=(80, 76, 90, 255))
    for n, x in (("SorcererOrange", 40), ("Princess", 64), ("Master", 88)): s.put(char(n, "down"), x, 36)
    s.put(char("Villager4", "up"), 64, 78)
    for i, (a, b) in enumerate((((40, 38), (56, 56)), ((64, 38), (64, 56)), ((88, 38), (72, 56)), ((56, 56), (68, 70)))): s.d.line([a, b], fill=((240, 160, 200), (240, 220, 120), (150, 200, 240), (240, 160, 200))[i] + (255,))
    return s.lit("dusk")


@card("gale")
def c_gale():
    """Storm over the Heights: the Great Vane spins out of control and the wind drags hundreds of news papers, all at once."""
    s = cliffs(Scene("snow", ["........"] * 6))
    s.put(guardian("veleta"), 64, 60)
    for i in range(40): x, y = (i * 37) % 128, 12 + (i * 23) % 76; s.d.rectangle([x, y, x + 3, y + 2], fill=(236, 230, 214, 255))
    for y in (20, 44, 70): s.d.arc([10, y - 6, 118, y + 6], 200, 340, fill=(230, 236, 250, 255))
    return s.rain(30).lit("storm")


@card("voices")
def c_voices():
    """In a Heights square people's voices slip out of their mouths like threads of smoke, and every thread ends at the Great Vane."""
    s = cliffs(Scene("snow", ["........", "........", "..====..", "..====..", "..====..", "........"]))
    s.put(guardian("veleta"), 64, 40)
    for n, x, y in (("NinjaBlue", 24, 70), ("Villager2", 44, 82), ("OldMan2", 84, 82), ("Child", 104, 70)):
        s.put(char(n, "up"), x, y); s.stem([(x, y - 14), ((x + 64) // 2, y - 30), (64, 30)], (190, 190, 200, 255))
    return s.lit("gloom")


@card("spin")
def c_spin():
    """At night the Great Vane turns where the wind blows; below, Coplo changes the words of his song so they point the same way."""
    s = cliffs(Scene("snow", ["........"] * 6))
    s.put(guardian("veleta"), 92, 50)
    s.d.rectangle([20, 66, 32, 78], fill=(140, 96, 56, 255), outline=(60, 40, 24, 255))
    s.put(char("FighterRed", "right"), 26, 66)
    for x, y in ((40, 52), (52, 46), (64, 44)): s.d.point((x, y), fill=(240, 220, 140, 255)); s.d.line([(x + 1, y), (x + 1, y - 3)], fill=(240, 220, 140, 255))
    return s.lit("night")
