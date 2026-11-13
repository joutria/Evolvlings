#!/usr/bin/env python3
"""Build the home and El Vado map PNGs from the Ninja Adventure tiles (CC0, https://pixel-boy.itch.io/ninja-adventure-asset-pack).
Needs Pillow. Run from the repo root with the pack's folder (the one holding Backgrounds/ and Actor/), then `node tools/art.js`:

  python3 tools/ninja-maps.py ~/Downloads/NinjaAdventure

It reads the 15 x 11 rows of every map in world.js and paints them tile by tile at 16 px: grass, dirt paths and ponds
with autotiled edges, trees on the border (#), rocks (r). Ponds and paths pick each 8 px quarter from the pack's
autotile block by looking at the neighbours. Out come art/maps/<map>.png (720 x 528, the 16 px tiles at 3x) and
art/objects/tree.png, flower.png, well.png and tila.png, which replace the drawn ones, and art/faces/tila.png, Tila's
face in conversations (the pack's Woman), and art/creatures/<id>.png for every creature (story, common and the wild foes in rpg/data-wild.js)."""
import sys, os, re, colorsys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..")
T = 16

# creatures: every creature in the game is a monster of the pack (Jose, 2026-11-07). The first monster draws the baby and
# young stages, the last one the adult. Picked so the colour reads as the creature's type (2026-11-12 art review:
# Fizz airy blue, Mecha all lantern and Yunquerón all fire red (2026-11-13), Bostezo a night owl, ice in ice blues, Capuchón a real mushroom, fire adults in reds).
SHEETS = {
    "lumo": ("Spirit", "Spirit2"), "fizz": ("Octopus2", "ButterflyBlue"), "pebb": ("Mole2", "Mole"), "unisona": ("GoldRacoon",),
    "fuellito": ("DragonYellow",), "brotin": ("KappaGreen", "KappaRed"), "remolin": ("Reptile",),
    "bostezo": ("Slime", "Owl2"), "mecha": ("LanternRed",), "yunqueron": ("Beast",),
    "espinardo": ("Larva",), "nim": ("SpiderRed", "SpiderYellow"), "centinela": ("Skull",),
    "vidriela": ("Fish", "FishRed"), "ecolito": ("Mollusc2", "Mollusc"), "relampin": ("Mouse", "MouseBlack"),
    "trinilla": ("HeartRed", "HeartGreen"), "carambano": ("AxolotBlue",), "capuchon": ("Mushroom2",),
    "guardatumba": ("SkullBlue", "Grey Trex"),
}
WILD = {"fulgor": "Flam2", "chisporro": "Flam", "canin": "Bamboo", "ojuelo": "Eye", "ajolin": "Axolot", "topacio": "Racoon", "ululu": "Owl", "sombrerin": "Mushroom"}
# guardians: the pack's bosses, each its own figure (Mira was Raíz's cyclops and Seto was Micelio's frog until 2026-11-12)
BOSSES = {"farol": "GiantSpirit", "forja": "GiantFlam", "seto": "GiantBamboo", "mira": "GiantSlime", "grava": "GiantRacoon",
          "trono": "TenguRed", "veleta": "TenguBlue", "micelio": "GiantFrog2", "raiz": "DemonCyclop"}

# One colour per creature (2026-11-13 consistency pass): the pack often draws a creature's adult in another colour than its
# young (Brotín green then red, Trinilla a red heart then a green one), so the stages did not read as the same creature and
# the colour did not say the type. The stages listed here (0 baby, 1 young, 2 adult) move their main colour to the type's
# colour of rpg/data-cards.js TYPES; eyes, outline and highlights stay. CC0 allows the change. Guardians the same way.
TYPE_COL = {"fire": "#d9542c", "plant": "#4f9a3c", "light": "#e2ae2e", "bolt": "#d8b81c", "water": "#3f7fc9", "stone": "#8a7a64",
            "shadow": "#5b4b8e", "ice": "#8fcbe0", "mush": "#b0603c", "dream": "#8a78d4", "music": "#cf5f9f"}
TINT = {"pebb": ("stone", (2,)), "brotin": ("plant", (2,)), "mecha": ("light", (0, 1, 2)), "nim": ("shadow", (0, 1, 2)),
        "ecolito": ("stone", (0, 1, 2)), "vidriela": ("water", (0, 1, 2)), "relampin": ("bolt", (0, 1, 2)),
        "trinilla": ("music", (0, 1, 2)), "centinela": ("shadow", (0, 1, 2)),
        "bostezo": ("dream", (0, 1, 2)), "capuchon": ("mush", (0, 1, 2))}
GTINT = {"trono": "shadow", "grava": "stone", "micelio": "mush"}

def tint(im, col):
    """Moves the main colour family of a sprite to the colour `col`: the most common saturated hue and the hues near it turn
    to the new hue (keeping their light and shade), the saturation follows the new colour. Running it twice changes nothing."""
    tr, tg, tb = (int(col[i:i + 2], 16) / 255 for i in (1, 3, 5)); th, ts, _ = colorsys.rgb_to_hsv(tr, tg, tb)
    px = im.load(); hist = [0.0] * 36; sat = []
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a < 128: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s >= 0.2 and v >= 0.18: hist[int(h * 36) % 36] += s
    if not any(hist): return im
    k = max(range(36), key=lambda i: hist[i - 1] + 2 * hist[i] + hist[(i + 1) % 36]); dom = (k + 0.5) / 36
    near = lambda h: min(abs(h - dom), 1 - abs(h - dom)) < 0.14
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s >= 0.2 and v >= 0.18 and near(h): sat.append(s)
    ms = sum(sat) / len(sat)
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s < 0.2 or v < 0.18 or not near(h): continue
            d = h - dom; d = d - 1 if d > 0.5 else d + 1 if d < -0.5 else d
            r2, g2, b2 = colorsys.hsv_to_rgb((th + d) % 1, min(1, s * ts / ms), v)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im

def tint_art(root=None):
    """Applies TINT and GTINT to the creature and guardian sheets already in art/ (and to the creature's face)."""
    root = root or ROOT
    for id_, (t, rows) in TINT.items():
        f = os.path.join(root, "art", "creatures", id_ + ".png"); im = Image.open(f).convert("RGBA")
        for r in rows:
            for c in range(im.width // 64):
                box = (c * 64, r * 64, c * 64 + 64, r * 64 + 64); im.paste(tint(im.crop(box), TYPE_COL[t]), box)
        im.save(f)
        ff = os.path.join(root, "art", "faces", "mon-" + id_ + ".png")
        if 2 in rows and os.path.exists(ff): tint(Image.open(ff).convert("RGBA"), TYPE_COL[t]).save(ff)
    for id_, t in GTINT.items():
        f = os.path.join(root, "art", "guardians", id_ + ".png"); im = Image.open(f).convert("RGBA")
        for c in range(im.width // 96):
            box = (c * 96, 0, c * 96 + 96, 96); im.paste(tint(im.crop(box), TYPE_COL[t]), box)
        im.save(f)
    print("ok tint", len(TINT), "creatures,", len(GTINT), "guardians")

def main(pack):
    ts = lambda n: Image.open(os.path.join(pack, "Backgrounds", "Tilesets", n + ".png")).convert("RGBA")
    floor, water, nature = ts("TilesetFloor"), ts("TilesetWater"), ts("TilesetNature")
    tile = lambda im, c, r, w=1, h=1: im.crop((c * T, r * T, (c + w) * T, (r + h) * T))
    grass = [tile(floor, 0, 12)] * 5 + [tile(floor, c, 12) for c in (1, 2, 3, 4)] + [tile(floor, 2, 11), tile(floor, 3, 11)]
    # autotile blocks (4 x 4: corners, edges, and a 2 x 2 island in the middle): dirt on grass, water on grass
    blocks = {"=": (floor, 4, 7), "~": (water, 4, 6)}
    trees = [tile(nature, 0, 0, 2, 2), tile(nature, 16, 0, 2, 2), tile(nature, 18, 0, 2, 2)]
    rock = tile(nature, 18, 9)
    pine = tile(nature, 2, 0, 2, 2)
    fdet = ts("TilesetFloorDetail")
    trim1 = lambda o: o.crop(o.getbbox())
    # flat ground details from the nature tileset: grass tufts, small flowers (shrunk to half), pebbles
    tufts = [tile(fdet, c, 2) for c in (0, 1, 2, 3, 6)]
    flowers = [trim1(tile(nature, c, 11)) for c in (0, 1, 3, 6)] + [trim1(tile(fdet, 5, 2))] * 2
    small = lambda f: f.resize((max(1, f.width // 2), max(1, f.height // 2)), Image.NEAREST)
    pebbles = [trim1(nature.crop((240 + i * 16, 288, 256 + i * 16, 304))) for i in range(4)]
    pebbles = [p.resize((max(1, p.width // 2), max(1, p.height // 2)), Image.NEAREST) if p.width > 8 else p for p in pebbles]
    lily = trim1(water.crop((176, 48, 192, 64)))

    src = open(os.path.join(ROOT, "world.js"), encoding="utf8").read()
    maps = {m.group(1): re.findall(r'"([^"]{15})"', m.group(2)) for m in re.finditer(r"\n  (\w+): \{\n    rows: \[(.*?)\]", src, re.S)}
    for name, rows in maps.items():
        H, W = len(rows), len(rows[0])
        at = lambda x, y, ch: rows[min(H - 1, max(0, y))][min(W - 1, max(0, x))] == ch or (ch == "=" and rows[min(H - 1, max(0, y))][min(W - 1, max(0, x))] == "_")
        g = Image.new("RGBA", (W * T, H * T))
        seed = 7
        for y in range(H):
            for x in range(W):
                seed = (seed * 9301 + 49297) % 233280
                g.alpha_composite(grass[seed % len(grass)], (x * T, y * T))
                ch = rows[y][x]
                if ch in blocks: g.alpha_composite(auto(blocks[ch], lambda dx, dy: at(x + dx, y + dy, ch)), (x * T, y * T))
                if ch == "r": g.alpha_composite(rock, (x * T, y * T))
        # ground details (2026-11-12, "el mapa también debe ser mejorado"): flat things only, never on a place, the
        # tile you stand on to use it, a decoration world.js draws, the path or the water, so nothing looks solid
        # where you can walk. Flowers gather on "," tiles; tufts, small flowers and pebbles dot the rest of the grass.
        busy = taken(src, name)
        for y in range(1, H - 1):
            for x in range(1, W - 1):
                seed = (seed * 9301 + 49297) % 233280
                ch = rows[y][x]
                if (x, y) in busy or ch not in ".,": continue
                if ch == ",":
                    for i, (dx, dy) in enumerate(((1, 1), (8, 3), (3, 8), (9, 9))): g.alpha_composite(small(flowers[(seed + i) % len(flowers)]), (x * T + dx, y * T + dy))
                    continue
                r = seed % 100
                near_path = any(at(x + dx, y + dy, "=") for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                if r < 18: g.alpha_composite(tufts[seed % len(tufts)], (x * T + seed % 5 - 2, y * T + seed % 3))
                elif r < 28: g.alpha_composite(small(flowers[seed % len(flowers)]) if seed % 3 else flowers[-1], (x * T + 3 + seed % 5, y * T + 3 + seed % 4))
                elif r < 33 or (near_path and r < 45): g.alpha_composite(pebbles[seed % len(pebbles)], (x * T + 3 + seed % 7, y * T + 5 + seed % 6))
        # one lily pad on the pond, on a water tile with water below it
        lilies = [(x, y) for y in range(H) for x in range(W) if rows[y][x] == "~" and at(x, y + 1, "~") and at(x + 1, y, "~") and at(x - 1, y, "~")]
        for x, y in lilies[:1]: g.alpha_composite(lily, (x * T + 4, y * T + 6))
        # a soft shadow where the wood begins, so the trees stand on the grass instead of being cut out of it
        sh = Image.new("RGBA", g.size)
        for y in range(H):
            for x in range(W):
                if rows[y][x] == "#" or (x, y) in busy: continue
                for dx, dy, side in ((0, -1, "top"), (-1, 0, "left"), (1, 0, "right")):
                    if at(x + dx, y + dy, "#"):
                        box = {"top": (x * T, y * T, x * T + T, y * T + 5), "left": (x * T, y * T, x * T + 4, y * T + T),
                               "right": (x * T + T - 4, y * T, x * T + T, y * T + T)}[side]
                        ImageDraw.Draw(sh).rectangle([box[0], box[1], box[2] - 1, box[3] - 1], fill=(20, 40, 24, 44))
        g.alpha_composite(sh)
        # border trees, back to front: round trees, pines and fruit trees mixed, a bush now and then in the gaps
        for y in range(H):
            for x in range(W):
                if rows[y][x] != "#": continue
                k = (x * 7 + y * 3 + x * y) % 11
                tr = trees[k % len(trees)] if k < 9 else pine
                # the bottom row sits low so its canopy never hides what stands on the row above
                paste_clip(g, tr, x * T - 8, y * T - (4 if y == H - 1 else 14))
        out = os.path.join(ROOT, "art", "maps"); os.makedirs(out, exist_ok=True)
        g.resize((W * T * 3, H * T * 3), Image.NEAREST).save(os.path.join(out, name + ".png"))
        print("ok", name, (W * T * 3, H * T * 3))
    ob = os.path.join(ROOT, "art", "objects"); os.makedirs(ob, exist_ok=True)
    trees[1].save(os.path.join(ob, "tree.png")); tile(nature, 6, 11).save(os.path.join(ob, "flower.png"))
    # the Vado well (roofed) and Tila: the pack's Woman, standing facing us, with her face for the conversations
    el = ts("TilesetElement"); well = el.crop((112, 16, 128, 64)); well.crop(well.getbbox()).save(os.path.join(ob, "well.png"))
    ch = lambda n, f: Image.open(os.path.join(pack, "Actor", "Characters", n, f)).convert("RGBA")
    ch("Woman", os.path.join("SeparateAnim", "Idle.png")).crop((0, 0, 16, 16)).save(os.path.join(ob, "tila.png"))
    fc = os.path.join(ROOT, "art", "faces"); os.makedirs(fc, exist_ok=True); ch("Woman", "Faceset.png").save(os.path.join(fc, "tila.png"))
    # the places drawn on the maps, cut from the pack's element and house tilesets (trimmed to what is drawn)
    house = ts("TilesetHouse")
    cuts = {"bed": (el, 160, 16, 176, 32), "bowl": (el, 32, 144, 48, 160), "board": (el, 0, 32, 16, 48), "sign": (el, 48, 32, 64, 48),
            "lamp": (el, 96, 48, 112, 80), "stall": (el, 0, 48, 32, 80), "nest": (el, 128, 48, 144, 64), "nestOld": (el, 112, 60, 128, 76),
            "lectern": (el, 0, 80, 16, 112), "shop": (house, 256, 0, 304, 48)}
    for k, (im, *b) in cuts.items():
        o = im.crop(tuple(b)); bb = o.getbbox()
        if bb: o.crop(bb).save(os.path.join(ob, k + ".png"))
    # the Glade's Root (the pack's old gnarled trunk; world.js adds its green glow), the bottle in the pond
    # (world.js makes it bob), the foraging nook as each circle searches it, and the garden at each level
    nat, fd = nature, ts("TilesetFloorDetail")
    trim = lambda o: o.crop(o.getbbox())
    trim(tile(nat, 4, 0, 2, 2)).save(os.path.join(ob, "root.png"))
    Image.open(os.path.join(pack, "Items", "Potion", "WaterPot.png")).convert("RGBA").save(os.path.join(ob, "bottle.png"))
    for k, im in {"sol": tile(nat, 4, 14), "sky": tile(fd, 5, 3), "lake": tile(nat, 18, 9), "frost": tile(fd, 2, 3)}.items():
        trim(im).save(os.path.join(ob, "patch-" + k + ".png"))
    fence = trim(house.crop((128, 64, 160, 80)))
    for n in range(1, 6):
        g = Image.new("RGBA", (36, 16))
        for r in range(2):
            for x in range(2, 34): g.putpixel((x, 7 + r * 4), (122, 86, 54, 255)); g.putpixel((x, 8 + r * 4), (98, 66, 40, 255))
        for i in range(min(10, 2 + n * 2)):
            g.alpha_composite(trim(tile(fd, 4, 2)).resize((6, 6), Image.NEAREST) if False else trim(tile(fd, 4, 2)).crop((0, 0, 6, 6)), (2 + (i % 5) * 6, 2 + (i // 5) * 4))
        if n >= 3:
            for x in range(0, 36, 4):
                for y in range(0, 4): g.putpixel((x, y), (150, 104, 62, 255))
            for x in range(0, 36): g.putpixel((x, 1), (176, 124, 78, 255))
        if n >= 5: g.alpha_composite(trim(el.crop((0, 0, 16, 16))).resize((8, 9), Image.NEAREST), (27, 5))
        g.save(os.path.join(ob, "garden-%d.png" % n))
    print("ok objects tree, flower, well, tila,", ", ".join(cuts), ", root, bottle, patch-*, garden-1..5; face tila")
    # creatures: every creature in the game is a monster of the pack (Jose, 2026-11-07). One row per stage: baby at 2x,
    # young at 3x, adult at 4x (3x if it would not fit) in the pack's second colour when it has one. Wild foes have one row.
    # The pack sheet is 4 columns (front, back, left, right) by 4 walking frames; we keep two frames of front, back and right
    # in 64 px cells with the feet on y = 60. The emotion cells stay empty, so the game falls back to the front frames.
    cr = os.path.join(ROOT, "art", "creatures"); os.makedirs(cr, exist_ok=True)
    def frames(mon):
        d = os.path.join(pack, "Actor", "Monsters", mon)
        f = next(n for n in sorted(os.listdir(d)) if n.lower().endswith(".png") and n != "Faceset.png")  # SpriteSheet.png or <Name>.png
        sh = Image.open(os.path.join(d, f)).convert("RGBA")
        return [sh.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)) for c, r in [(0, 0), (0, 1), (1, 0), (1, 1), (3, 0), (3, 1)]]
    def row(out, y, mon, k):
        for cell, fr in enumerate(frames(mon)):
            bb = fr.getbbox()
            if not bb: continue
            fr = fr.crop(bb); kk = k if fr.height * k <= 60 and fr.width * k <= 64 else 3
            fr = fr.resize((fr.width * kk, fr.height * kk), Image.NEAREST)
            out.alpha_composite(fr, (cell * 64 + (64 - fr.width) // 2, y + 60 - fr.height))
    for id_, mons in SHEETS.items():
        out = Image.new("RGBA", (640, 192))
        for st, (mon, k) in enumerate([(mons[0], 2), (mons[0], 3), (mons[-1], 4)]): row(out, st * 64, mon, k)
        out.save(os.path.join(cr, id_ + ".png"))
    for id_, mon in WILD.items():
        out = Image.new("RGBA", (640, 64)); row(out, 0, mon, 3); out.save(os.path.join(cr, id_ + ".png"))
    print("ok creatures", len(SHEETS), "+ wild", len(WILD))
    # guardians: the pack's bosses, two idle frames as front A and B in 96 px cells (2x when that still fits)
    gd = os.path.join(ROOT, "art", "guardians"); os.makedirs(gd, exist_ok=True)
    for id_, boss in BOSSES.items():
        d = os.path.join(pack, "Actor", "Boss", boss)
        idle = Image.open(os.path.join(d, next(n for n in sorted(os.listdir(d)) if n.lower().startswith("idle")))).convert("RGBA")
        fh = idle.height; out = Image.new("RGBA", (192, 96))
        for cell, i in enumerate((0, 2)):
            fr = idle.crop((i * fh, 0, i * fh + fh, fh)); bb = fr.getbbox()
            if not bb: continue
            fr = fr.crop(bb); k = 2 if fr.height * 2 <= 94 and fr.width * 2 <= 96 else 1
            fr = fr.resize((fr.width * k, fr.height * k), Image.NEAREST)
            out.alpha_composite(fr, (cell * 96 + (96 - fr.width) // 2, max(0, 92 - fr.height)))
        out.save(os.path.join(gd, id_ + ".png"))
    print("ok guardians", ", ".join(BOSSES))

def taken(src, name):
    """The tiles of a map that must stay plain grass: every place (its whole width), the tile you stand on to use it,
    the solid tiles it lists, the start tile and the decorations world.js draws itself."""
    m = re.search(r"\n  " + name + r": \{.*?\n    start: \[(\d+), (\d+)\], deco: \[(.*?)\],\n  \}", src, re.S)
    if not m: return set()
    block = m.group(0); busy = {(int(m.group(1)), int(m.group(2)))}
    for pm in re.finditer(r"\{ id: \"\w+\", x: (\d+), y: (\d+)(?:, w: (\d+))?(.*?)\}(?:,|\n)", block):
        x, y, w = int(pm.group(1)), int(pm.group(2)), int(pm.group(3) or 1)
        for i in range(-(w // 2), w - w // 2): busy.add((x + i, y))
        for a, b in re.findall(r"\[(\d+), (\d+)\]", pm.group(4)): busy.add((int(a), int(b)))
    for a, b in re.findall(r"\[\"\w+\", (\d+), (\d+)\]", m.group(3)): busy.add((int(a), int(b)))
    return busy

def paste_clip(dst, im, x, y):
    # alpha_composite refuses negative offsets: crop what falls outside first
    cx, cy = max(0, -x), max(0, -y)
    part = im.crop((cx, cy, min(im.width, dst.width - x), min(im.height, dst.height - y)))
    if part.width > 0 and part.height > 0: dst.alpha_composite(part, (x + cx, y + cy))

def auto(block, same):
    """One 16 px tile from 8 px quarters of a 4 x 4 autotile block, chosen by the 8 neighbours."""
    im, c0, r0 = block
    q = lambda c, r, qx, qy: im.crop(((c0 + c) * T + qx * 8, (r0 + r) * T + qy * 8, (c0 + c) * T + qx * 8 + 8, (r0 + r) * T + qy * 8 + 8))
    out = Image.new("RGBA", (T, T))
    for qx in (0, 1):
        for qy in (0, 1):
            sx, sy = (1 if qx else -1), (1 if qy else -1)
            h, v, d = same(sx, 0), same(0, sy), same(sx, sy)
            ex, ey = (3 if qx else 0), (3 if qy else 0)       # the block's outer column / row on this side
            ix, iy = (1 if qx else 2), (1 if qy else 2)       # the island tile whose quarter on this side is solid
            if h and v and d: piece = q(2 if qx else 1, 2 if qy else 1, qx, qy)            # solid: the island tile on the far side
            elif h and v: piece = q(ix, iy, qx, qy)                                        # inner corner
            elif h: piece = q(1 + qx, ey, qx, qy)                                          # top or bottom edge
            elif v: piece = q(ex, 1 + qy, qx, qy)                                          # left or right edge
            else: piece = q(ex, ey, qx, qy)                                                # outer corner
            out.alpha_composite(piece, (qx * 8, qy * 8))
    return out

if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__)
    elif sys.argv[1] == "--tint": tint_art()
    else: main(sys.argv[1]); tint_art()
