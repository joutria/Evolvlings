"""Evolvlings: the Sap-touched wild creature of each zone, ordinary beasts of the zone that the Savia Negra has reached
(Jose, 2026-11-18: foes need no story of their own, they can be generic inhabitants that got corrupted).

  python3 tools/sap-wild.py ~/Downloads/0x72_DungeonTilesetII_v1.7 "~/Downloads/2D Pixel Dungeon Asset Pack" ~/Downloads/Enemy_Animations_Set

Most come from the CC0 0x72 Dungeon Tileset II (its frames/ folder) and from Pixel_Poem's 2D Pixel Dungeon Asset Pack
v2.0 and its free Enemy Animations Set (the monsters row of character and tileset/Dungeon_Character.png and the idle
strips); see CREDITS.md for both licences. Two are Ninja Adventure wild
creatures already in art/creatures/ repainted in the Savia colours of the visual language guide (#0e0814 #241030
#3b1d4a, sheen #7dffb0): Mustio from Fulgor and Búho hueco from Ululú. Every one gets the Savia marks: a 1 px dark green
rim and a few drops that fall upwards over the head.

Out come art/creatures/<id>.png (640 x 64: front A/B, back A/B, side-right A/B in 64 px cells, feet at y 60, like the
other wild sheets) and art/faces/mon-<id>.png (38 x 38 close-up on the dark faceset ground). The 0x72 figures look to
the right, which the battle mirrors for foes so they face your team. The creatures are listed in rpg/data-wild.js.
Run it once on clean sheets: the two repaints read their source sheets (fulgor, ululu), which it never overwrites."""
import os, sys, random, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
FACE_BG = (20, 27, 27, 255)
RAMP = [(14, 8, 20), (36, 16, 48), (59, 29, 74), (92, 52, 108), (140, 96, 150)]
BONE = [(176, 156, 180), (222, 208, 222)]
SHEEN = [(46, 140, 96), (125, 255, 176)]

# id: ("0x72", frame name) or ("repaint", source sheet, glow test on the source colour (h, s, v) for eyes and cores)
SAP = {
    "mustio": ("repaint", "fulgor", lambda h, s, v: v < 0.45 and s < 0.5),
    "tiznajo": ("0x72", "imp_idle_anim"),
    "lodoverde": ("0x72", "swampy_anim"),
    "embozado": ("0x72", "necromancer_anim"),
    "legamo": ("0x72", "muddy_anim"),
    "huesillo": ("0x72", "skelet_idle_anim"),
    "buhueco": ("repaint", "ululu", lambda h, s, v: s > 0.5 and v > 0.6 and 0.1 < h < 0.2),
    "escarcho": ("0x72", "ice_zombie_anim"),
    "cuernillo": ("0x72", "chort_idle_anim"),
    # Pixel_Poem (Jose liked its look best, 2026-11-18): the monsters row (column) of Dungeon_Character.png, idle strips
    "fatuo": ("ppsheet", 0),
    "yelmo": ("ppsheet", 1),
    "noctambulo": ("ppsheet", 2),
    "musgoso": ("ppsheet", 3),
    "calavero": ("ppanim", "skeleton1"),
    "segador": ("ppanim", "skeleton2"),
    "velador": ("ppanim", "vampire"),
}


def lum(c): return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


def repaint(im, glow):
    """luminance onto the Savia ramp, near-whites to bone, glow pixels (eyes, cores) to the green sheen"""
    px = im.load(); W, H = im.size
    pts = [(x, y) for y in range(H) for x in range(W) if px[x, y][3] > 0]
    if not pts: return im
    ls = sorted(lum(px[p]) for p in pts); q = [ls[int(len(ls) * f)] for f in (0.10, 0.28, 0.5, 0.72)]
    out = im.copy(); o = out.load()
    for p in pts:
        c = px[p]; h, s, v = colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255)
        if glow(h, s, v) and lum(c) > ls[int(len(ls) * 0.08)]: o[p] = (SHEEN[1] if v > 0.6 else SHEEN[0]) + (c[3],)
        elif s < 0.18 and v > 0.8: o[p] = (BONE[1] if v > 0.92 else BONE[0]) + (c[3],)
        else: o[p] = RAMP[sum(lum(c) > t for t in q)] + (c[3],)
    return out


def marks(cell, seed):
    """the Savia marks on one 64 px cell: dark green rim outside the outline, drops rising over the head"""
    W, H = cell.size; a = cell.load(); out = Image.new("RGBA", (W, H)); o = out.load()
    for y in range(H):
        for x in range(W):
            if a[x, y][3] == 0 and any(0 <= x + dx < W and 0 <= y + dy < H and a[x + dx, y + dy][3] > 200 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[x, y] = SHEEN[0] + (255,)
    out.alpha_composite(cell)
    edge = []
    for x in range(W):
        ys = [y for y in range(H) if a[x, y][3] > 0]
        if ys: edge.append((x, min(ys)))
    edge = edge[2:-2] or edge
    rnd = random.Random(seed); o = out.load()
    for k in range(5):
        if not edge: break
        x, t = rnd.choice(edge); y = t - rnd.randint(3, 9)
        if y < 1: continue
        o[x, y] = (SHEEN[1] if k % 2 == 0 else RAMP[4]) + (255,); o[x, y + 1] = RAMP[2] + (255,)
    return out


def x72_frames(pack, name):
    d = os.path.join(pack, "frames")
    fr = [Image.open(os.path.join(d, "%s_f%d.png" % (name, i))).convert("RGBA") for i in range(4)]
    return [f.crop(f.getbbox()) for f in fr]


def main_body(pixels):
    """keep the biggest 8-connected group of opaque pixels: drops the coloured corner marks of Pixel_Poem's cells"""
    px = pixels.load(); W, H = pixels.size; seen = set(); best = []
    for y in range(H):
        for x in range(W):
            if px[x, y][3] == 0 or (x, y) in seen: continue
            grp, st = [], [(x, y)]; seen.add((x, y))
            while st:
                cx, cy = st.pop(); grp.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in seen and px[nx, ny][3] > 0: seen.add((nx, ny)); st.append((nx, ny))
            if len(grp) > len(best): best = grp
    out = Image.new("RGBA", (W, H)); o = out.load()
    for p in best: o[p] = px[p]
    return out.crop(out.getbbox())


def pp_frames(pp, enemies, spec):
    if spec[0] == "ppsheet":   # 16 px cells, row 1 = frame A, row 3 = frame B
        sh = Image.open(os.path.join(pp, "character and tileset", "Dungeon_Character.png")).convert("RGBA"); c = spec[1]
        px = sh.load()   # the cell corner marks (red and blue L shapes in each corner 2 x 2)
        for y in range(sh.height):
            for x in range(sh.width):
                if x % 16 in (0, 1, 14, 15) and y % 16 in (0, 1, 14, 15) and px[x, y][:3] in ((188, 76, 81), (98, 171, 212)): px[x, y] = (0, 0, 0, 0)
        a, b = (main_body(sh.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16))) for r in (1, 3))
        return [a, a, b, b]
    sh = Image.open(os.path.join(enemies, "enemies-%s_idle.png" % spec[1])).convert("RGBA")   # 32 px frames in a strip
    n = sh.width // 32
    return [main_body(sh.crop((i * 32, 0, i * 32 + 32, 32))) for i in (0, n // 4, n // 2, 3 * n // 4)]


def main(pack, pp=None, enemies=None):
    cdir = os.path.join(ROOT, "art", "creatures"); fdir = os.path.join(ROOT, "art", "faces")
    for n, (cid, spec) in enumerate(SAP.items()):
        out = Image.new("RGBA", (640, 64))
        if spec[0] == "repaint":
            src = Image.open(os.path.join(cdir, spec[1] + ".png")).convert("RGBA")
            body = repaint(src, spec[2]); out.alpha_composite(body)
            front = body.crop((0, 0, 64, 64)); front = front.crop(front.getbbox())
        elif spec[0] in ("ppsheet", "ppanim") and not pp: continue
        else:
            fr = x72_frames(pack, spec[1]) if spec[0] == "0x72" else pp_frames(pp, enemies, spec); k = 4 if spec[1] == "imp_idle_anim" else 3  # the tiny imp at 4x
            while k > 1 and any(f.width * k > 64 or f.height * k > 60 for f in fr): k -= 1
            fr = [f.resize((f.width * k, f.height * k), Image.NEAREST) for f in fr]
            # front A/B = idle frames 0 and 2, back the same (the pack has no back view), side-right 1 and 3
            for cell, i in enumerate((0, 2, 0, 2, 1, 3)):
                out.alpha_composite(fr[i], (cell * 64 + (64 - fr[i].width) // 2, 60 - fr[i].height))
            front = fr[0]
        for cell in range(6):
            c = out.crop((cell * 64, 0, cell * 64 + 64, 64))
            if c.getbbox(): out.paste(marks(c, n * 7 + cell // 2), (cell * 64, 0))
        out.save(os.path.join(cdir, cid + ".png"))
        # the face: the head end of the front frame (top 34 px, middle 34 px wide) on the dark ground
        x0 = max(0, (front.width - 34) // 2); f = front.crop((x0, 0, x0 + min(34, front.width), min(34, front.height)))
        face = Image.new("RGBA", (38, 38), FACE_BG); face.alpha_composite(f, ((38 - f.width) // 2, 38 - 2 - f.height if f.height < 34 else 2))
        face.save(os.path.join(fdir, "mon-" + cid + ".png"))
    print("ok sap wild", len(SAP))


if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__)
    else: main(*sys.argv[1:4])
