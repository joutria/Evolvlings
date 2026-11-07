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
