# The valley map of the expedition screen (art/maps/valley.png, 480 x 304: 30 x 19 tiles of 16 px), painted with the
# pack's tiles like the home and El Vado maps. The places and the paths come from PMAP and PEDGES in rpg/ui-expedition.js
# (240 x 152 units, every point the centre of a tile), so the game's labels, stars and walking token land on the picture.
# The Dayside is above the stream in daylight, the Underside below it in the dusk of the Envés; the Heights stand on a
# snowy cliff at the top (the rope climbs it) and the White Deep is snow at the bottom. Locked places are hidden by the
# game under clouds, so everything is painted here.
import re as _re


def _valley_data():
    src = open(os.path.join(ROOT, "rpg", "ui-expedition.js"), encoding="utf8").read()
    pm = _re.search(r"const PMAP = \{(.*?)\};", src).group(1)
    places = {k: (int(x), int(y)) for k, x, y in _re.findall(r"(\w+): \[(\d+), (\d+)\]", pm)}
    eb = _re.search(r"const PEDGES = (\[.*?\n\]);", src, _re.S).group(1)
    edges = []
    for e in json.loads(_re.sub(r",(\s*\])", r"\1", eb)):
        edges.append((e[0], e[1], e[2] if len(e) > 2 else None, [tuple(p) for p in (e[3] if len(e) > 3 else [])]))
    return places, edges


def _tile(p): return (p[0] - 4) // 8, (p[1] - 4) // 8


def valley():
    places, edges = _valley_data()
    C, R = 30, 19
    grid = [["." for _ in range(C)] for _ in range(R)]
    put = lambda c, r, ch: (0 <= c < C and 0 <= r < R) and grid[r].__setitem__(c, ch)
    STREAM = _tile(places["vado"])[1]
    # paths: straight runs between the corners
    for a, b, key, way in edges:
        pts = [_tile(places[a])] + [_tile(p) for p in way] + [_tile(places[b])]
        for (c0, r0), (c1, r1) in zip(pts, pts[1:]):
            n = max(abs(c1 - c0), abs(r1 - r0))
            for i in range(n + 1):
                c = c0 + round((c1 - c0) * i / max(1, n)); r = r0 + round((r1 - r0) * i / max(1, n))
                if r not in (STREAM, STREAM + 1) and r > 2: put(c, r, "=")
    cr = _tile(places["crater"])
    for dc in range(-2, 3):          # the Crater's bare, burnt clearing
        for dr in range(-1, 2):
            if abs(dc) + abs(dr) < 4: put(cr[0] + dc, cr[1] + dr, "=")
    lk = _tile(places["lake"])
    for c in range(lk[0] - 2, lk[0] + 5):   # Mirror Lake, south-east of its shore
        for r in (lk[1] + 1, lk[1] + 2):
            if not (c == lk[0] + 4 and r == lk[1] + 2): put(c, r, "~")
    for c in range(C): put(c, STREAM, "~"); put(c, STREAM + 1, "~")   # the stream, two tiles wide
    # a few flowers in the Meadow and tufts everywhere else (on plain ground only)
    seed = 7
    for r in range(3, R - 2):
        for c in range(C):
            seed = (seed * 9301 + 49297) % 233280
            if grid[r][c] != ".": continue
            au = _tile(places["aurora"])
            if abs(c - au[0]) <= 4 and abs(r - au[1]) <= 1 and seed % 3 == 0: grid[r][c] = "*"
            elif seed % 11 == 0: grid[r][c] = ","
            elif seed % 23 == 0: grid[r][c] = "o"
    s = Scene("grass", ["".join(row) for row in grid], size=(C * T, R * T))
    P = {k: (x * 2, y * 2) for k, (x, y) in places.items()}     # pixels
    sy = STREAM * T
    LAMP = Image.open(os.path.join(ROOT, "art", "objects", "lamp.png")).convert("RGBA")   # the pack's lantern on a post

    # ---- the Heights: a snowy cliff along the top, the rope climbs it where the paths arrive ----
    top = ts("TilesetRelief")
    for c in range(C):
        col = 1 if c == 0 else 3 if c == C - 1 else 2
        for r in (0, 1): s.at(tile(top, col, 0 if r == 0 else 1), c * T, r * T)
        s.at(tile(top, col, 2), c * T, 2 * T)
    hx, hy = P["heights"]
    for a, b, key, way in edges:
        if key == "rope":                 # the rope hangs down the cliff where the path arrives, knotted every few pixels
            for (x, y) in [p for p in way if p[1] * 2 < 2 * T]:
                x *= 2; s.d.line([(x, 2 * T - 2), (x, 3 * T + 2)], fill=(122, 84, 46, 255)); s.d.line([(x + 1, 2 * T - 2), (x + 1, 3 * T + 2)], fill=(196, 150, 90, 255))
                for yy in range(2 * T + 2, 3 * T + 2, 5): s.d.rectangle([x - 1, yy, x + 2, yy + 1], fill=(122, 84, 46, 255))
                s.d.rectangle([x - 2, 2 * T - 4, x + 3, 2 * T - 2], fill=(90, 80, 86, 255))
    s.put(cut("TilesetNature", 160, 0, 32, 32), hx - 40, hy + 6).put(cut("TilesetNature", 128, 0, 32, 32), hx + 40, hy + 6)
    for x in (22, 70, 300, 360, 420, 466):
        s.put(cut("TilesetNature", (128, 160)[x % 2], 0, 32, 32), x, 28)
    # a windvane on top of the pass
    s.d.line([(hx + 14, hy + 4), (hx + 14, hy - 14)], fill=(70, 60, 70, 255))
    s.d.polygon([(hx + 14, hy - 18), (hx + 19, hy - 14), (hx + 14, hy - 10), (hx + 9, hy - 14)], fill=(220, 80, 60, 255), outline=(70, 30, 30, 255))

    # ---- the Crater: a forge in a burnt clearing, rocks and a glow ----
    cx, cy = P["crater"]
    s.put(cut("TilesetNature", 272, 160, 64, 48), cx - 50, cy + 34).put(cut("TilesetHouse", 464, 0, 64, 64), cx + 44, cy + 40)
    for x, y in ((cx - 4, cy + 34), (cx - 70, cy - 6)): s.put(tile("TilesetNature", 13, 9), x, y)
    for x, y in ((cx - 14, cy + 14), (cx + 12, cy + 18)):    # little pools of embers in the burnt ground
        s.d.ellipse([x - 5, y - 2, x + 5, y + 2], fill=(120, 40, 30, 255)); s.d.ellipse([x - 3, y - 1, x + 3, y + 1], fill=(240, 120, 50, 255)); s.glow(x, y, 14, FIRE, 0.8)
    s.glow(cx + 44, cy - 2, 30, FIRE, 0.9)

    # ---- the Aurora Meadow: lanterns among the flowers ----
    ax, ay = P["aurora"]
    for dx in (-70, -44, 44, 70):
        s.put(LAMP, ax + dx, ay + (14 if abs(dx) > 50 else 10)); s.glow(ax + dx, ay - 12, 20, COLD, 0.8)
    s.put(cut("TilesetNature", 0, 176, 16, 16), ax - 14, ay + 22).put(cut("TilesetNature", 16, 176, 16, 16), ax + 14, ay + 22)

    # ---- the Deep Wood: a thick wood round a small clearing ----
    fx, fy = P["forest"]
    for i, (dx, dy) in enumerate(((-62, 26), (-34, 30), (36, 30), (64, 24), (-96, -6), (98, -8), (0, 44), (-20, 56), (24, 58), (84, 50), (-80, 52))):
        big = cut("TilesetNature", 0, 32, 48, 48) if i % 3 == 0 else cut("TilesetNature", 256, 0, 32, 32) if i % 3 == 1 else cut("TilesetNature", 96, 0, 32, 32)
        s.put(big, fx + dx, fy + dy)

    # ---- the Heart of the Glade: the great stump over the single Root ----
    kx, ky = P["heart"]
    s.put(scale(cut("TilesetNature", 0, 128, 32, 32), 2), kx, ky + 12)

    # ---- El Vado: the village on the ford, stepping stones across the stream ----
    vx, vy = P["vado"]
    stone = tile("TilesetWater", 12, 0)
    s.put(stone, vx - 3, vy + 8).put(stone, vx + 4, vy + 19).put(stone, vx - 2, vy + 30)
    s.put(cut("TilesetHouse", 0, 0, 64, 48), vx - 84, vy - 2).put(cut("TilesetHouse", 128, 0, 64, 48), vx + 84, vy - 2)
    s.put(LAMP, vx - 22, vy - 2).glow(vx - 22, vy - 24, 18, WARM, 0.7)
    # the rest of the stream bank: reeds
    for x in range(10, C * T, 54):
        if abs(x - vx) > 90: s.put(tile("TilesetNature", 9, 10), x, sy - 1)

    # ---- the Underside ----
    # the Gloom Hollow: an abandoned village in the mist
    ox, oy = P["hollow"]
    s.put(cut("TilesetVillageAbandoned", 0, 0, 64, 48), ox - 42, oy + 26).put(cut("TilesetVillageAbandoned", 64, 0, 48, 48), ox + 44, oy + 44)
    for dx in (-16, 18): s.put(dim(LAMP, 0.6), ox + dx, oy + 34); s.glow(ox + dx, oy + 10, 18, SAP, 0.7)
    # Mirror Lake: a boat on the water
    lx, ly = P["lake"]
    s.put(cut("TilesetWater", 400, 0, 48, 16), lx + 50, ly + 34)
    # the Echo Caves: a cave in the rocks, torches
    qx, qy = P["caves"]
    s.put(cut("TilesetNature", 192, 80, 64, 48), qx + 40, qy + 26)
    s.put(cut("TilesetNature", 256, 80, 64, 48), qx + 52, qy + 50).put(tile("TilesetNature", 13, 9), qx - 30, qy + 20)
    for dx in (18, 62):
        s.d.rectangle([qx + dx - 1, qy + 10, qx + dx + 1, qy + 18], fill=(110, 80, 50, 255)); s.glow(qx + dx, qy + 8, 18, FIRE, 0.9)
        s.d.rectangle([qx + dx - 1, qy + 7, qx + dx + 1, qy + 9], fill=(255, 190, 90, 255))
    # the White Deep: snow at the bottom, white trees and icicles
    dx0, dy0 = P["deep"]
    snow = [tile("TilesetFloor", 0, 19)] * 4 + [tile("TilesetFloor", c, 19) for c in (1, 2, 3)]
    for r in range(R - 2, R):
        for c in range(8, 23):
            if r == R - 2 and c in (8, 22): continue
            s.at(snow[(c * 7 + r) % len(snow)], c * T, r * T)
    for x, y in ((dx0 - 70, R * T - 2), (dx0 + 70, R * T - 2), (dx0 - 40, R * T + 6), (dx0 + 44, R * T + 8)):
        s.put(cut("TilesetNature", 128, 0, 32, 32), x, y)
    for x, y in ((dx0 + 22, dy0 + 10), (dx0 - 24, dy0 + 12), (dx0 + 56, dy0 + 6), (dx0 - 58, dy0 + 4)): s.put(tile("TilesetNature", 1, 14), x, y)
    s.glow(dx0, dy0, 40, COLD, 0.5)
    # trees and rocks fill the empty corners so the valley reads as a wooded bowl
    for x, y in ((12, 112), (24, 150), (468, 112), (456, 150), (12, 300), (40, 304), (468, 300), (440, 304), (150, 262), (160, 140), (320, 140)):
        s.put(cut("TilesetNature", 256, 0, 32, 32) if y < sy else cut("TilesetVillageAbandoned", 0, 96, 48, 48) if x in (12, 468) else cut("TilesetNature", 96, 0, 32, 32), x, y)

    # ---- light: day above the stream, the Envés's dusk below it, blended across the water ----
    day = light(s.g.copy(), (1.0, 1.0, 1.0), [g for g in s.glows if g[1] < sy])
    dusk = light(s.g.copy(), (0.74, 0.68, 0.86), [g for g in s.glows if g[1] >= sy - 20])
    mask = Image.new("L", s.g.size, 0); md = ImageDraw.Draw(mask)
    for y in range(s.g.height):
        k = 0 if y < sy - 4 else 255 if y > sy + 20 else int(255 * (y - sy + 4) / 24)
        md.line([(0, y), (s.g.width, y)], fill=round(k / 64) * 64 if 0 < k < 255 else k)
    out = Image.composite(dusk, day, mask)
    # a soft dark edge, like the old map's worn border
    edge = Image.new("L", out.size, 0); ed = ImageDraw.Draw(edge)
    for i in range(6): ed.rectangle([i, i, out.width - 1 - i, out.height - 1 - i], outline=int(90 * (1 - i / 6)))
    return Image.composite(Image.new("RGBA", out.size, (36, 16, 48, 255)), out, edge)


PLACES = {"valley": valley}
