# Prado Aurora: the Meadow of lanterns. Streets of the pack's houses, white flowers, and the Savia lanterns' cold light.
# Run through tools/ninja-scenes.py, which provides Scene, cut, tile, char, mon, item, dim... (see its docstring).

def house(k): return cut("TilesetHouse", {"O": 0, "B": 64, "O2": 128, "R": 192}[k], 0, 64, 48)
def ruin(k): return {"a": cut("TilesetVillageAbandoned", 0, 0, 64, 48), "b": cut("TilesetVillageAbandoned", 176, 0, 64, 64)}[k]
def lamp(on=True): return cut("TilesetElement", 96, 48, 16, 32) if on else dim(cut("TilesetElement", 96, 48, 16, 32))
def paper(s, x, y): s.d.rectangle([x, y, x + 2, y + 3], fill=(238, 232, 214, 255)); return s


def lamps(s, spots):
    """Lanterns at (x, feet y, lit); a lit one glows cold around its head."""
    for x, y, on in spots:
        s.put(lamp(on), x, y)
        if on: s.glow(x, y - 24, 28, COLD, 1.0)
    return s


@scene("farolero")
def farolero():
    """A street of the Meadow at night; old Pabilo lights one more lantern with his pole."""
    s = Scene("grass", ["........"] * 3 + ["========"] * 2 + ["........"])
    s.at(house("R"), -20, -2).at(house("O"), 44, -2).put(tile("TilesetNature", 16, 0, 2, 2), 124, 44)
    lamps(s, [(12, 60, True), (60, 60, True), (100, 60, False)])
    s.put(char("OldMan", "down", 6), 92, 74)                     # Pabilo, arms up
    s.glow(100, 36, 18, COLD, 0.9).glow(93, 66, 12, COLD, 0.5).glow(76, 38, 10, WARM, 0.7).glow(12, 38, 10, WARM, 0.7)
    s.lit("night")
    s.d.line([(95, 62), (100, 37)], fill=(150, 104, 66, 255))   # the pole and its little flame, over the night
    s.d.point((100, 36), fill=(240, 248, 255, 255)); s.d.point((101, 35), fill=(190, 220, 255, 255))
    return s


@scene("alvar")
def alvar():
    """A square of the Meadow at dusk: a boy in a patched coat stands in your way with his arms open."""
    s = Scene("grass", ["........", "........", ".======.", ".======.", ".======.", "..*..*.."])
    s.at(house("B"), -24, -6).at(house("O2"), 60, -6)
    lamps(s, [(10, 52, True), (118, 52, True)])
    s.put(char("KnightGold", "left"), 104, 60)                   # a guard of the Lantern watching
    s.put(char("Child", "right"), 26, 62)                        # the boy from the doorway
    s.put(char("Boy", "down", 6), 64, 76)                        # Alvar, arms wide
    return s.lit("dusk")


@scene("verja")
def verja():
    """The outskirts where the white flowers turn grey; someone has dug a hole under Albor's iron fence."""
    s = Scene("grass", ["*.*.x.x.", ".*.x.xx.", "........", "*.,..x.x", ".*..x.,.", "*..,.x.."])
    fence = cut("TilesetHouse", 144, 160, 80, 48)
    top = fence.crop((0, 0, fence.width, 14))                     # the top bars of the pack's iron fence
    s.row(top, 46, -10, top.width - 2)
    s.d.ellipse([56, 44, 70, 50], fill=(46, 32, 24, 255))         # the hole under the bars and its dirt
    s.d.ellipse([70, 46, 78, 51], fill=(122, 86, 56, 255))
    s.put(mon("nim", "left"), 58, 64)
    s.put(dim(char("KnightGold", "left"), 0.8), 116, 30).glow(116, 22, 10, COLD, 0.8)
    return s.lit("dusk")


@scene("multa")
def multa():
    """A street of the Dark Quarter: a Lantern guard nails a paper on a door while his Mecha lights the hammer."""
    s = Scene("grass", ["........"] * 3 + ["========"] * 2 + ["..,....."], var=1)
    s.at(ruin("a"), -16, -4).at(ruin("b"), 52, -18)
    paper(s, 84, 34)
    s.put(char("Knight", "up"), 86, 56).put(mon("mecha", "left", 1), 100, 52).glow(98, 44, 22, COLD, 1.0)
    s.put(char("Villager2", "right"), 30, 60)                   # the neighbour
    s.put(char("Woman", "up"), 60, 86)                          # Tila, coming down the street
    return s.lit("night")


@scene("penumbra")
def penumbra():
    """On a step of the Quarter, a Shadow woman mends a small jacket under the only lit lantern of the street."""
    s = Scene("grass", ["........"] * 3 + ["========"] * 2 + ["........"], var=1)
    s.at(ruin("a"), 40, -4).at(ruin("b"), -30, -18)
    lamps(s, [(52, 60, True), (112, 62, False)])
    s.d.rectangle([62, 44, 82, 47], fill=(120, 110, 104, 255), outline=(60, 54, 56, 255))      # the step
    s.put(char("NinjaMageBlack", "down"), 70, 58)
    s.d.rectangle([66, 54, 70, 56], fill=(90, 130, 190, 255))                                  # the little jacket
    return s.lit("night")


@scene("enredado")
def enredado():
    """A Brotín tangled at the foot of a crooked lantern, the stems that tie it black with sap."""
    s = Scene("grass", ["........", "..*.....", "....x...", "========", "========", ".*...,.."])
    l = lamp(False).rotate(-12, resample=Image.NEAREST, expand=True)
    s.put(l, 70, 66).put(mon("brotin", "left", 1), 62, 72)
    s.stem([(52, 70), (58, 64), (66, 66), (72, 60), (78, 66)]).stem([(56, 72), (64, 74), (74, 70)]).stem([(68, 62), (66, 52)])
    s.sap(76, 72, 12, 4)
    return s.lit("dusk")


@scene("farolera")
def farolera():
    """Dawn in the old square: the statue of the First Lamplighter, lantern raised; Tila is up on the pedestal, scrubbing."""
    s = Scene("grass", ["........", "........", ".======.", ".======.", ".======.", "........"])
    s.at(house("O"), -30, -8).at(house("B"), 90, -8)
    s.d.rectangle([44, 58, 76, 70], fill=(150, 146, 150, 255), outline=(70, 66, 76, 255))       # the pedestal
    s.d.line([(45, 59), (75, 59)], fill=(196, 192, 196, 255))
    s.put(scale(char("Statue"), 2), 54, 60)
    s.put(lamp(False), 42, 48)                                                                  # her raised lantern
    s.put(char("Woman", "left", 6), 70, 60)                                                     # Tila, scrubbing
    s.glow(110, 0, 70, (255, 200, 190), 0.6)
    return s.lit("dawn")


def alley(s):
    """A narrow alley: two dark house walls close it on both sides."""
    s.at(ruin("b"), -42, -10).at(flip(ruin("b")), 106, -10)
    s.at(ruin("a"), 24, -26)
    return s


@scene("prestamo")
def prestamo():
    """An alley of the Quarter: a girl tries to read a paper in the dark, holding it to her nose."""
    s = alley(Scene("grass", ["........", "........", "..====..", "..====..", "..====..", "..====.."], var=1))
    s.put(char("EggGirl", "down"), 64, 70)
    paper(s, 62, 60)
    s.glow(64, 20, 14, WARM, 0.5).glow(64, 62, 16, MOON, 0.55)
    return s.lit("night")


@scene("devuelta")
def devuelta():
    """The same alley: the girl waits on an upturned bucket; your creature jumps from her lap back to you."""
    s = alley(Scene("grass", ["........", "........", "..====..", "..====..", "..====..", "..====.."], var=1))
    s.put(flip(tile("TilesetElement", 1, 0, trim=True)).rotate(180), 60, 72)
    s.put(char("EggGirl", "down"), 60, 64)
    s.put(mon("lumo", "down"), 72, 84).glow(72, 78, 16, WARM, 0.6)
    return s.lit("dusk")


@scene("jardinero")
def jardinero():
    """Midnight in the gardens of the Tower of Dawn: a gardener pulls up grey flowers and plants white ones."""
    s = Scene("grass", ["........", ".xxx.**.", ".xx..**.", ".x.=.**.", "...=....", "...=...."])
    s.at(house("R"), 32, -30)                                                                   # the Tower's foot
    s.put(char("Villager4", "left"), 44, 52)
    s.put(cut("TilesetElement", 32, 48, 32, 32), 22, 78)                                        # his cart of white flowers
    for x, y in ((14, 62), (20, 60), (26, 63)): s.put(tile("TilesetNature", 6, 11, trim=True), x, y)
    s.glow(64, 6, 18, COLD, 0.9).glow(100, 0, 60, MOON, 0.35)
    return s.lit("night")


@scene("carro")
def carro():
    """On the Meadow road, a cart of House Albor is stuck in the mud; the carter pushes the wheel alone, his Lumo lighting his feet."""
    s = Scene("grass", ["..*.....", "........", "========", "========", "========", "...*..,."])
    s.d.ellipse([46, 50, 90, 66], fill=(84, 58, 40, 255))                                       # the mud
    cart = cut("TilesetElement", 32, 48, 32, 32).rotate(8, resample=Image.NEAREST, expand=True)
    s.put(cart, 68, 66).put(char("Villager", "right"), 48, 68)
    s.put(mon("lumo", "left"), 40, 82).glow(40, 76, 18, COLD, 0.7)
    return s.lit("dusk")


@scene("nana")
def nana():
    """Under a lantern of the square, three Meadow children sing in a ring while an old woman knits on a bench."""
    s = Scene("grass", ["........", "........", "..====..", ".======.", ".======.", "..====.."])
    s.at(house("O2"), 10, -10)
    lamps(s, [(64, 50, True)])
    s.put(char("Child", "right"), 52, 68).put(char("EggGirl", "left"), 76, 68).put(char("Boy", "up"), 64, 80)
    s.d.rectangle([92, 70, 116, 73], fill=(140, 92, 54, 255), outline=(70, 44, 26, 255))        # the bench
    s.put(char("OldWoman", "left"), 106, 72)
    return s.lit("dusk")


# ---------------- Cards (art/cards/<id>.png): the card box shows y 10..86 ----------------

@card("flash")
def c_flash():
    """A lamplighter of Albor climbs his ladder and finds the lantern empty; the spark runs off down the street as Lumo."""
    s = Scene("grass", ["........"] * 2 + ["========"] * 2 + ["..*.....", "........"])
    s.at(house("O"), -14, -10).at(house("O2"), 70, -10)
    lamps(s, [(30, 58, False), (108, 58, True)])
    s.d.line([(24, 60), (28, 36)], fill=(150, 104, 66, 255), width=2); s.d.line([(34, 60), (32, 36)], fill=(150, 104, 66, 255), width=2)
    for y in range(40, 60, 5): s.d.line([(26, y), (33, y)], fill=(150, 104, 66, 255))
    s.put(char("OldMan", "up"), 30, 50)
    for i, (x, y) in enumerate(((44, 52), (54, 56), (62, 58), (70, 60))): s.d.point((x, y), fill=(255, 250, 200, 255)); s.glow(x, y, 6, WARM, 0.5)
    s.put(mon("lumo", "right"), 80, 66).glow(80, 58, 22, WARM, 1.0)
    return s.lit("night")


@card("lantern")
def c_lantern():
    """In an alley of the Dark Quarter a girl reads a paper by a lantern small enough to fit her hand; Lumo peeks over her shoulder."""
    s = Scene("grass", ["........"] * 3 + ["========"] * 2 + ["........"], var=1)
    s.at(ruin("a"), -12, -4).at(ruin("b"), 60, -18)
    s.put(char("EggGirl", "down"), 60, 70)
    s.d.rectangle([54, 62, 58, 66], fill=(238, 232, 214, 255))
    s.d.rectangle([64, 64, 66, 67], fill=(250, 210, 120, 255)); s.glow(65, 64, 26, WARM, 1.1)
    s.put(mon("lumo", "down"), 72, 58)
    return s.lit("night")


@card("spark")
def c_spark():
    """Through the iron fence of a Lantern House, a noble boy passes his spark (a little Lumo) to a girl of the Quarter."""
    s = Scene("grass", ["*.*.*.*.", ".*...*..", "........", "..,.....", "........", "....,..."])
    s.at(house("R"), 30, -22)
    fence = cut("TilesetHouse", 144, 160, 80, 48); top = fence.crop((0, 0, fence.width, 14))
    s.row(top, 44, -10, top.width - 2)
    s.put(char("Noble", "down"), 56, 50)
    s.put(char("Child", "up"), 70, 76)
    s.put(mon("lumo", "down"), 63, 60).glow(63, 54, 20, WARM, 1.0)
    return s.lit("dusk")


@card("street")
def c_street():
    """In the Dark Quarter only one street has light: Tila climbs the ladder to light the last lantern; Mecha waits by the oil can."""
    s = Scene("grass", ["........"] * 2 + ["========"] * 2 + ["........"] * 2, var=1)
    s.at(ruin("a"), -14, -10).at(ruin("b"), 62, -24)
    lamps(s, [(14, 58, True), (46, 58, True), (96, 58, False)])
    s.d.line([(90, 62), (93, 36)], fill=(150, 104, 66, 255), width=2); s.d.line([(100, 62), (98, 36)], fill=(150, 104, 66, 255), width=2)
    for y in range(40, 62, 5): s.d.line([(91, y), (99, y)], fill=(150, 104, 66, 255))
    s.put(char("Woman", "up"), 96, 52)
    s.put(mon("mecha", "down"), 76, 76).d.rectangle([84, 70, 88, 76], fill=(120, 120, 130, 255), outline=(50, 50, 60, 255))
    s.glow(76, 70, 18, FIRE, 0.9)
    return s.lit("night")


@card("oil")
def c_oil():
    """Tila runs from the Albor stores at night with the oil can; the store's lantern burns cold."""
    s = Scene("grass", ["........"] * 3 + ["========"] * 2 + ["........"])
    s.at(house("R"), 54, -12)
    s.put(lamp(True), 112, 58).glow(112, 34, 26, COLD, 1.0)
    for x in (70, 82): s.d.rectangle([x, 50, x + 8, 60], fill=(140, 96, 56, 255), outline=(60, 40, 24, 255))
    s.put(char("Woman", "left"), 40, 70)
    s.d.rectangle([30, 64, 34, 69], fill=(120, 120, 130, 255), outline=(50, 50, 60, 255))
    s.put(mon("mecha", "left"), 22, 72).glow(22, 66, 16, FIRE, 0.8)
    return s.lit("night")


@card("ration")
def c_ration():
    """Night in the Quarter: a neighbour serves soup from a great pot and the queue reaches the corner; Mecha is the fire under the pot."""
    s = Scene("grass", ["........"] * 2 + ["========"] * 3 + ["........"], var=1)
    s.at(ruin("a"), -10, -10).at(ruin("b"), 70, -24)
    s.d.ellipse([28, 54, 48, 64], fill=(70, 66, 72, 255), outline=(30, 28, 34, 255)); s.d.ellipse([31, 55, 45, 59], fill=(200, 150, 80, 255))
    s.put(mon("mecha", "down"), 38, 72).glow(38, 64, 24, FIRE, 1.1)
    s.put(char("OldWoman", "right"), 18, 62)
    for i, (n, x) in enumerate((("Villager", 58), ("Child", 73), ("Villager2", 88), ("OldMan3", 103), ("Villager3", 118))):
        s.put(char(n, "left"), x, 64 + (i % 2) * 2)
    return s.lit("night")


@card("beam")
def c_beam():
    """At night the Great Lantern lights the Meadow from its hill and draws on the grass the line you may not cross; a family stops at its edge."""
    s = Scene("grass", ["*.*..*.*", ".*.*..*.", "..*.*...", "........", "..,.....", "........"])
    s.put(guardian("farol"), 64, 34).glow(64, 10, 70, COLD, 1.4)
    s.d.line([(0, 62), (128, 62)], fill=(230, 240, 255, 255))
    for n, x in (("Villager2", 50), ("Child", 62), ("Villager", 74)): s.put(char(n, "up"), x, 78)
    return s.lit("night")


@card("pride")
def c_pride():
    """In the hall of House Albor the Proud Crystal glows on its pedestal, never once gone out; Aurelia Albor rests her hand on it, alone and tired."""
    s = Scene("sand", ["........", "........", "...==...", "...==...", "...==...", "...==..."], var=1)
    s.d.rectangle([0, 0, 128, 28], fill=(150, 120, 110, 255)); s.d.line([(0, 28), (128, 28)], fill=(80, 60, 60, 255), width=2)
    for x in (16, 112): s.d.rectangle([x - 4, 8, x + 4, 60], fill=(214, 206, 196, 255), outline=(110, 100, 96, 255))
    s.d.rectangle([56, 46, 72, 56], fill=(200, 196, 190, 255), outline=(100, 96, 96, 255))
    s.d.polygon([(64, 30), (70, 38), (64, 46), (58, 38)], fill=(230, 244, 255, 255), outline=(140, 170, 210, 255))
    s.glow(64, 38, 40, COLD, 1.3)
    s.put(char("Princess", "right"), 48, 60)
    return s.lit("gloom")


@card("law")
def c_law():
    """At sunset an Albor guard shuts the Meadow gate; a lamplighter of the Underside is left outside with his lantern lit."""
    s = Scene("grass", ["*.*.*.*.", ".*.*.*.*", "........", "...==...", "...==...", "...==..."])
    fence = cut("TilesetHouse", 144, 160, 80, 48); top = fence.crop((0, 0, fence.width, 14))
    s.row(top, 38, -10, top.width - 2)
    s.put(char("KnightGold", "down"), 52, 34)
    s.put(char("Villager3", "up"), 66, 70)
    s.d.rectangle([72, 60, 75, 64], fill=(250, 210, 120, 255)); s.glow(73, 60, 20, WARM, 1.0)
    return s.lit("dusk")


@card("rain")
def c_rain():
    """Fizz, grey and heavy, rains slowly on a Meadow field stained with sap; a farmer watches from under his umbrella as the stains fade."""
    s = Scene("grass", [".,..,..,", "..,.,...", ",...,..,", ".,..,.,.", "..,...,.", ",..,...,"], var=1)
    for x, y in ((24, 60), (56, 70), (92, 58)): s.sap(x, y, 12, 4)
    s.put(scale(dim(mon("fizz", "down"), 0.75, grey=True), 2), 60, 44).glow(60, 30, 26, (200, 210, 230), 0.6)
    s.put(char("Villager4", "up"), 100, 80)
    s.d.pieslice([92, 62, 108, 74], 180, 360, fill=(180, 70, 60, 255), outline=(70, 30, 30, 255)); s.d.line([(100, 68), (100, 76)], fill=(60, 40, 30, 255))
    s.rain(60)
    return s.lit("storm")
