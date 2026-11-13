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


# Battle grounds (2026-11-13): the flat floor of the first version looked empty next to the event scenes, so the ground
# gets small details of the zone between the fighters' tiles, the sides get the zone's trees, rocks or walls (cut off by
# the edge, like a clearing seen up close) and the corners darken a little. The fighters stand on 3 lanes (feet at y 49,
# 76, 103 at this 180 x 120 size) at x 24 and 63 (yours) and 117 and 156 (theirs): no detail goes on those tiles.
FEET = [(x, y) for x in (24, 63, 117, 156) for y in (49, 76, 103)]
GROUND = {  # zone: (details from TilesetFloorDetail (col, row) or "peb" pebbles from TilesetNature, how many, a stone colour)
    "aurora": ([(0, 2), (1, 2), (2, 2), (5, 3), (5, 2), "peb"], 26, False), "crater": (["peb", "peb", (1, 2)], 16, False),
    "forest": ([(0, 2), (1, 2), (3, 2), (6, 2), (5, 3), "peb"], 30, False), "hollow": ([(0, 2), (1, 2), "x", "x", "peb"], 22, False),
    "lake": ([(0, 2), (2, 2), "peb", "peb", (5, 2)], 22, False), "caves": (["peb"], 16, (120, 112, 104)),
    "heights": (["peb"], 12, (176, 184, 200)), "deep": (["peb"], 10, (170, 196, 222)), "heart": ([(0, 2), (1, 2), "x", "peb"], 22, False)}
SIDES = {  # zone: props for the left and right edges, from the bottom up: (sheet, x, y, w, h)
    "aurora": [("TilesetNature", 256, 0, 32, 32), ("TilesetNature", 48, 288, 48, 48)],
    "crater": [], "forest": [("TilesetNature", 256, 0, 32, 32), ("TilesetNature", 32, 0, 32, 32)],
    "hollow": [("TilesetNature", 32, 0, 32, 32)], "lake": [("TilesetNature", 256, 0, 32, 32)], "caves": [("TilesetNature", 288, 144, 16, 16)],
    "heights": [("TilesetNature", 288, 144, 16, 16)], "deep": [("TilesetNature", 288, 144, 16, 16)], "heart": [("TilesetNature", 256, 0, 32, 32)]}


def dress(s, zone):
    w, h = s.w, s.h
    fd, nat = ts("TilesetFloorDetail"), ts("TilesetNature")
    kinds, n, grey = GROUND[zone]
    seed = sum(map(ord, zone)) * 37
    def rnd(m):
        nonlocal seed; seed = (seed * 9301 + 49297) % 233280; return seed % m
    placed = 0
    for _ in range(n * 6):
        if placed >= n: break
        x, y = 4 + rnd(w - 8), 34 + rnd(h - 38)
        if any(abs(x - fx) < 20 and -6 < y - fy < 16 for fx, fy in FEET): continue
        k = kinds[rnd(len(kinds))]
        if k == "peb": im = cut("TilesetNature", 240 + rnd(4) * 16, 288, 16, 16)
        elif k == "x": im = dim(tile(fd, 5, 3, trim=True), 0.75, grey=True)
        else: im = tile(fd, k[0], k[1], trim=True)
        if grey: im = tint(im, grey, 0.65)
        s.put(im, x, y); placed += 1
    props = SIDES[zone]
    small = props and props[0][3] <= 16      # rocks: closer together, two abreast
    for side in (0, 1) if props else ():
        for i, y in enumerate(range(h + 6, 30, -12 if small else -26)):
            sh, px, py, pw, ph = props[(i + side) % len(props)]
            im = cut(sh, px, py, pw, ph)
            if grey: im = tint(im, grey, 0.55)
            x = (-4 + (i % 2) * 6) if side == 0 else (w + 4 - (i % 2) * 6)
            if small: x = (4 + (i % 3) * 4) if side == 0 else (w - 4 - (i % 3) * 4)
            s.put(im, x, y)
            if small and i % 2: s.put(im, x + (-8 if side else 8), y - 4)
    return s


def vignette(g, a=0.3):
    """Darkens the corners a little (more at the bottom), so the eye stays on the fighters."""
    w, h = g.size
    m = Image.new("L", (w, h)); px = m.load()
    for y in range(h):
        for x in range(w):
            d = ((x - w / 2) / (w * 0.62)) ** 2 + ((y - h * 0.42) / (h * 0.7)) ** 2
            px[x, y] = int(255 * a * min(1, max(0, (d - 0.45) / 0.55)))
    return Image.composite(Image.new("RGBA", (w, h), (16, 12, 28, 255)), g, m)


def battle(zone, night):
    s = dress(backdrop(zone, (180, 120)), zone)
    s.lit(NIGHT[zone] if night else DAY[zone])
    s.g = vignette(s.g); s.d = ImageDraw.Draw(s.g)
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
