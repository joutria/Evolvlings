#!/usr/bin/env python3
"""Build the home and El Vado map PNGs from the Ninja Adventure tiles (CC0, https://pixel-boy.itch.io/ninja-adventure-asset-pack).
Needs Pillow. Run from the repo root with the pack's folder (the one holding Backgrounds/ and Actor/), then `node tools/art.js`:

  python3 tools/ninja-maps.py ~/Downloads/NinjaAdventure

It reads the 15 x 11 rows of every map in world.js and paints them tile by tile at 16 px: grass, dirt paths and ponds
with autotiled edges, trees on the border (#), rocks (r). Ponds and paths pick each 8 px quarter from the pack's
autotile block by looking at the neighbours. Out come art/maps/<map>.png (720 x 528, the 16 px tiles at 3x) and
art/objects/tree.png, flower.png, well.png and tila.png, which replace the drawn ones, and art/faces/tila.png, Tila's
face in conversations (the pack's Woman), and art/creatures/<id>.png for every creature (story, common and the wild foes in rpg/data-wild.js)."""
import sys, os, re
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
T = 16

def main(pack):
    ts = lambda n: Image.open(os.path.join(pack, "Backgrounds", "Tilesets", n + ".png")).convert("RGBA")
    floor, water, nature = ts("TilesetFloor"), ts("TilesetWater"), ts("TilesetNature")
    tile = lambda im, c, r, w=1, h=1: im.crop((c * T, r * T, (c + w) * T, (r + h) * T))
    grass = [tile(floor, 0, 12)] * 5 + [tile(floor, c, 12) for c in (1, 2, 3, 4)] + [tile(floor, 2, 11), tile(floor, 3, 11)]
    # autotile blocks (4 x 4: corners, edges, and a 2 x 2 island in the middle): dirt on grass, water on grass
    blocks = {"=": (floor, 4, 7), "~": (water, 4, 6)}
    trees = [tile(nature, 0, 0, 2, 2), tile(nature, 16, 0, 2, 2), tile(nature, 18, 0, 2, 2)]
    rock = tile(nature, 18, 9)

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
        # border trees, back to front
        for y in range(H):
            for x in range(W):
                if rows[y][x] != "#": continue
                tr = trees[(x * 7 + y * 3) % len(trees)]
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
    print("ok objects tree, flower, well, tila,", ", ".join(cuts), "; face tila")
    # creatures: every creature in the game is a monster of the pack (Jose, 2026-11-07). One row per stage: baby at 2x,
    # young at 3x, adult at 4x (3x if it would not fit) in the pack's second colour when it has one. Wild foes have one row.
    # The pack sheet is 4 columns (front, back, left, right) by 4 walking frames; we keep two frames of front, back and right
    # in 64 px cells with the feet on y = 60. The emotion cells stay empty, so the game falls back to the front frames.
    sheets = {
        "lumo": ("Spirit", "Spirit2"), "fizz": ("Slime", "Slime2"), "pebb": ("Mole2", "Mole"), "unisona": ("GoldRacoon",),
        "fuellito": ("DragonYellow", "Dragon"), "brotin": ("KappaGreen", "KappaRed"), "remolin": ("Reptile", "Reptile2"),
        "bostezo": ("ButterflyBlue", "Butterfly"), "mecha": ("LanternRed", "LanternGreen"), "yunqueron": ("Beast", "Beast2"),
        "espinardo": ("Larva", "Larva2"), "nim": ("SpiderRed", "SpiderYellow"), "centinela": ("SkullBlue", "Skull"),
        "vidriela": ("Fish", "FishRed"), "ecolito": ("Mollusc2", "Mollusc"), "relampin": ("Mouse", "MouseBlack"),
        "trinilla": ("HeartRed", "HeartGreen"), "carambano": ("Slime3", "Slime4"), "capuchon": ("Octopus2", "Octopus"),
        "guardatumba": ("Cyclope", "Cyclope2"),
    }
    wild = {"fulgor": "Flam2", "chisporro": "Flam", "canin": "Bamboo", "ojuelo": "Eye", "ajolin": "Axolot", "topacio": "Racoon", "ululu": "Owl", "sombrerin": "Mushroom"}
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
    for id_, mons in sheets.items():
        out = Image.new("RGBA", (640, 192))
        for st, (mon, k) in enumerate([(mons[0], 2), (mons[0], 3), (mons[-1], 4)]): row(out, st * 64, mon, k)
        out.save(os.path.join(cr, id_ + ".png"))
    for id_, mon in wild.items():
        out = Image.new("RGBA", (640, 64)); row(out, 0, mon, 3); out.save(os.path.join(cr, id_ + ".png"))
    print("ok creatures", len(sheets), "+ wild", len(wild))

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
    else: main(sys.argv[1])
