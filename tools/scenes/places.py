# The zones as places: a backdrop per zone at any size, used for the battle backgrounds (art/battle/<zone>-day|night.png,
# 360 x 240) and the expedition pauses (art/pause/<zone>-<kind>.png, 256 x 192). Not events: no @scene here.

GUARD = {"aurora": "farol", "crater": "forja", "forest": "seto", "hollow": "trono", "lake": "mira", "caves": "grava",
         "heights": "veleta", "deep": "micelio", "heart": "raiz"}
FOES = {"aurora": ["fulgor", "brotin"], "crater": ["chisporro", "yunqueron"], "forest": ["canin", "espinardo"], "hollow": ["ojuelo", "centinela"],
        "lake": ["ajolin", "vidriela"], "caves": ["topacio", "ecolito"], "heights": ["ululu", "trinilla"], "deep": ["sombrerin", "capuchon"],
        "heart": ["vidriela", "relampin"]}
NIGHT = {"aurora": "night", "crater": "night", "forest": "night", "hollow": "deep", "lake": "night", "caves": "cave", "heights": "night", "deep": "deep", "heart": "deep"}
DAY = {"aurora": "day", "crater": "day", "forest": "day", "hollow": "gloom", "lake": "day", "caves": "cave", "heights": "cold", "deep": "cold", "heart": "gloom"}


def rows_for(w, h, path=None, water_top=0, deco=""):
    """Ground rows: path 'v' (down the middle) or 'h' (across), water_top rows of water, and a few decorations."""
    cw, ch = -(-w // T), -(-h // T)
    rows = []
    for y in range(ch):
        r = ["."] * cw
        if y < water_top: r = ["~"] * cw
        elif path == "v": r[cw // 2 - 1] = r[cw // 2] = "="
        elif path == "h" and y in (ch // 2, ch // 2 + 1): r = ["="] * cw
        for i, c in enumerate(deco):
            if y >= water_top and (y * 7 + i * 5) % cw < cw and (y + i) % 3 == 0: r[(y * 7 + i * 5) % cw] = c if r[(y * 7 + i * 5) % cw] == "." else r[(y * 7 + i * 5) % cw]
        rows.append("".join(r))
    return rows


def backdrop(zone, size, path=None):
    """The zone's ground and the things along its top edge (where the far side of the picture is)."""
    w, h = size
    if zone == "aurora":
        s = Scene("grass", rows_for(w, h, path, deco="*,"), size=size)
        for i, x in enumerate(range(-20, w, 66)): s.at(cut("TilesetHouse", (0, 64, 128)[i % 3], 0, 64, 48), x, -18)
        for x in range(10, w, 44): s.put(cut("TilesetElement", 96, 48, 16, 32), x, 40); s.glow(x, 16, 24, COLD, 0.9)
    elif zone == "crater":
        s = Scene("sand", rows_for(w, h, path, deco=","), size=size)
        s.at(cut("TilesetHouse", 464, 0, 64, 64), w // 2 - 32, -26).glow(w // 2, 20, 30, FIRE, 0.9)
        s.at(cut("TilesetDesert", 96, 0, 64, 64), -30, -28).at(cut("TilesetDesert", 96, 0, 64, 64), w - 34, -28)
    elif zone == "forest":
        s = Scene("grass", rows_for(w, h, path, deco=","), var=1, size=size)
        for i, x in enumerate(range(-12, w + 12, 22)): s.put(cut("TilesetNature", 256, 0, 32, 32), x, 30 + (i % 2) * 3)
        s.put(cut("TilesetNature", 48, 288, 48, 48), 10, 34).put(cut("TilesetNature", 48, 288, 48, 48), w - 10, 34)
    elif zone == "hollow":
        s = Scene("grass", rows_for(w, h, path), var=1, size=size)
        s.at(cut("TilesetVillageAbandoned", 0, 0, 64, 48), -10, -14).at(cut("TilesetVillageAbandoned", 176, 0, 64, 64), w - 56, -30)
        for x in range(40, w - 40, 30): s.put(dim(cut("TilesetElement", 96, 48, 16, 32), 0.28), x, 38)
    elif zone == "lake":
        s = Scene("snow", rows_for(w, h, path, water_top=2), var=1, water="grass", size=size)
        for x in range(20, w, 60): s.put(cut("TilesetWater", 400, 0, 48, 16), x, 22)
    elif zone == "caves":
        s = Scene("snow", rows_for(w, h, path), var=1, size=size)
        wall = tile("TilesetRelief", 8, 0, 4, 2)
        for x in range(0, w, 64): s.at(wall, x, 0)
        for x in range(24, w, 50):
            s.d.rectangle([x - 2, 26, x + 2, 30], fill=(150, 110, 60, 255), outline=(70, 50, 30, 255)); s.glow(x, 26, 22, FIRE, 0.9)
    elif zone == "heights":
        s = Scene("snow", rows_for(w, h, path), size=size)
        wall = tile("TilesetRelief", 8, 0, 4, 2)
        for x in range(0, w, 64): s.at(wall, x, 0)
        for x in range(30, w, 70):
            s.d.line([(x, 34), (x + 6, 8)], fill=(230, 230, 230, 255))
            s.d.polygon([(x + 6, 4), (x + 10, 8), (x + 6, 12), (x + 2, 8)], fill=(220, 80, 60, 255), outline=(70, 30, 30, 255))
    elif zone == "deep":
        s = Scene("snow", rows_for(w, h, path), size=size)
        wall = tile("TilesetRelief", 8, 0, 4, 2)
        wall2 = Image.blend(wall, Image.new("RGBA", wall.size, (200, 225, 245, 255)), 0.45); wall2.putalpha(wall.getchannel("A"))
        for x in range(0, w, 64): s.at(wall2, x, 0)
        for x in range(6, w, 12):
            hh = 6 + (x * 7) % 12; s.d.polygon([(x - 3, 30), (x + 3, 30), (x, 30 + hh)], fill=(200, 230, 250, 255), outline=(110, 150, 190, 255))
    else:  # heart
        s = Scene("grass", rows_for(w, h, path), var=1, size=size)
        s.put(scale(cut("TilesetNature", 0, 128, 32, 32), 2), w // 2, 46)
        for x in (20, w - 20):
            s.d.rectangle([x - 6, 37, x + 6, 41], fill=(130, 126, 134, 255), outline=(60, 56, 66, 255)); s.put(char("Statue", "down"), x, 38)
        s.sap(w // 2 + 30, 52, 12, 4)
    return s


def battle(zone, night):
    s = backdrop(zone, (180, 120))
    s.lit(NIGHT[zone] if night else DAY[zone])
    if zone == "hollow": s.fog(0.25 if night else 0.3, (196, 200, 214) if not night else (90, 90, 120))
    if zone == "heights" and not night: s.snow(30)
    if zone == "deep": s.snow(40)
    return s.g


TEAM3 = [("lumo", 20, 84), ("pebb", 36, 90), ("fizz", 52, 82)]


def team(s, pose="o", right=False):
    for i, (c, x, y) in enumerate(TEAM3):
        if pose == "away": im = mon(c, "up"); x = s.w // 2 - 10 + i * 10; y = 70 + (i % 2) * 6
        else:
            im = mon(c, "left" if right else "right")
            if right: x = s.w - x
            if pose == "happy": y -= 3 if i % 2 == 0 else 1
            if pose == "sleep": im = dim(im, 0.75)
        s.put(im, x, y)
    return s


def pause(zone, kind):
    path = "v" if kind in ("camino", "regreso") else None
    s = backdrop(zone, (128, 96), path)
    light = DAY[zone]
    if kind == "camino": team(s, "o")
    elif kind == "pelea":
        team(s, "o")
        for i, f in enumerate(FOES[zone]): s.put(mon(f, "left", 1), 92 + i * 18, 80 + (i % 2) * 6)
    elif kind == "cofre":
        s.put(frame(item("Treasure", "BigTreasureChest.png"), 16, 0), 82, 72).glow(82, 64, 14, WARM, 0.8); team(s, "o")
    elif kind == "descanso":
        for dx, dy in ((-6, 0), (6, 0), (-4, 3), (4, 3), (0, 4), (-4, -3), (4, -3)):
            s.d.rectangle([80 + dx - 1, 72 + dy - 1, 80 + dx, 72 + dy], fill=(138, 132, 128, 255), outline=(62, 58, 62, 255))
        s.put(frame(img("FX", "Particle", "Fire.png"), 12, 1), 80, 74).glow(80, 68, 34, FIRE, 1.0)
        team(s, "sleep"); light = NIGHT[zone]
    elif kind == "jefe":
        s.put(guardian(GUARD[zone]), 92, 82); team(s, "o")
        light = light if light != "day" else "gloom"
    elif kind == "victoria":
        team(s, "happy")
        for i, (x, y) in enumerate(((52, 50), (62, 42), (74, 48), (84, 38))):
            s.d.ellipse([x - 2, y - 1, x + 1, y + 1], fill=(250, 220, 110, 255)); s.d.line([(x + 1, y), (x + 1, y - 5)], fill=(40, 30, 40, 255))
        s.glow(64, 24, 60, (255, 240, 200), 0.4)
    elif kind == "regreso": team(s, "away"); light = "dusk" if light in ("day", "cold") else light
    s.lit(light)
    if zone == "hollow": s.fog(0.25, (196, 200, 214), (40, 80, 30))
    return s.g


PLACES = {"battle": battle, "pause": pause}
