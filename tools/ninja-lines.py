#!/usr/bin/env python3
"""Evolution lines in the style of the Ninja Adventure pack (CC0, https://pixel-boy.itch.io/ninja-adventure-asset-pack).
Needs Pillow. Run from the repo root with the pack's folder, after tools/ninja-maps.py (it overwrites the creature sheets
that tool writes), then `node tools/art.js`:

  python3 tools/ninja-lines.py ~/Downloads/NinjaAdventure

Until 2026-11-13 each stage was the same 16 px monster drawn bigger. Jose wanted stages that read as an evolution, tried
Tuxemon (PRs #84, #85) and found it too busy on small screens, so the lines went back to the pack's simple drawing:
each stage is a monster of one family of the pack (larva, cocoon, moth; drop, octopus; small mole, big mole), and where
the family runs out, the stage gains features drawn here on all six frames (front, back and side, two steps each):
antennae, a sprout, a flame, a cloud, spikes, stone plates, side fins, a gem. The whole line takes the colour of the
creature's type (tint() of tools/ninja-maps.py). Out come art/creatures/<id>.png (64 px cells, 10 columns: front A/B,
back A/B, side-right A/B, four emotion cells left empty; one row per stage) and art/faces/mon-<id>.png, the adult
monster's Faceset in the type colour."""
import sys, os, importlib.util
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
_spec = importlib.util.spec_from_file_location("ninja_maps", os.path.join(os.path.dirname(__file__), "ninja-maps.py"))
NM = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(NM)

# creature: type colour key of NM.TYPE_COL (None keeps the pack's colours), then (monster, size, features) by stage.
# The size is how many screen pixels make one pack pixel (smaller if the picture would not fit its 64 px cell).
LINES = {
    "lumo": ("light", [("Larva", 2, []), ("Larva2", 3, ["antennae"]), ("ButterflyBlue", 3, ["antennae"])]),   # grub, cocoon, moth
    "fizz": ("air", [("Slime3", 2, []), ("Octopus2", 3, []), ("Octopus2", 3, ["cloud", "fins"])]),             # drop, cloud octopus
    "pebb": ("stone", [("Mole2", 2, []), ("Mole", 3, ["plates1"]), ("Mole", 3, ["plates2", "gem"])]),          # mole of stones
    "unisona": (None, [("GoldRacoon", 2, []), ("GoldRacoon", 3, ["gem"]), ("GoldRacoon", 3, ["spikes3", "gem"])]),
    "fuellito": ("fire", [("DragonYellow", 2, []), ("Dragon", 3, ["flame"]), ("Dragon", 3, ["spikes3", "flame"])]),
    "brotin": ("plant", [("KappaGreen", 2, []), ("KappaGreen", 3, ["sprout"]), ("KappaRed", 3, ["sprout", "fins"])]),
    "remolin": ("water", [("Reptile", 2, []), ("Reptile", 3, ["fins"]), ("Reptile2", 3, ["fins", "spikes3"])]),
    "bostezo": ("dream", [("Slime", 2, []), ("Slime4", 3, []), ("Slime4", 3, ["cloud"])]),
    "mecha": ("light", [("LanternRed", 2, []), ("LanternGreen", 3, ["flame"]), ("LanternRed", 3, ["flame", "fins"])]),
    "yunqueron": ("fire", [("Bear", 2, []), ("Beast", 3, ["plates1"]), ("Beast", 3, ["plates2", "gem"])]),   # an anvil back
    "espinardo": ("plant", [("Octopus", 2, []), ("GreenOctopus", 3, ["spikes2"]), ("GreenOctopus", 3, ["spikes3", "fins"])]),
    "nim": ("shadow", [("YellowsBat", 2, []), ("BlueBat", 3, []), ("BlueBat", 3, ["spikes2", "gem"])]),
    "centinela": ("shadow", [("Skull", 2, []), ("Skull", 3, ["spikes1"]), ("SkullBlue", 3, ["spikes3", "gem"])]),
    "vidriela": ("water", [("Fish", 2, []), ("FishRed", 3, []), ("FishRed", 3, ["fins", "spikes3"])]),
    "ecolito": ("stone", [("Mollusc2", 2, []), ("Mollusc", 3, ["plates1"]), ("Mollusc", 3, ["plates2"])]),
    "relampin": ("bolt", [("Mouse", 2, []), ("MouseBlack", 3, ["antennae"]), ("MouseBlack", 3, ["antennae", "fins"])]),
    "trinilla": ("music", [("Owl", 2, []), ("Owl2", 3, []), ("Owl2", 3, ["spikes3"])]),
    "carambano": ("ice", [("Axolot", 2, []), ("AxolotBlue", 3, ["spikes2"]), ("AxolotBlue", 3, ["spikes3", "gem"])]),
    "capuchon": ("mush", [("Mushroom2", 2, []), ("Mushroom", 3, []), ("Mushroom", 3, ["gem", "fins"])]),
    "guardatumba": ("ice", [("TRex", 2, []), ("Grey Trex", 3, ["plates1"]), ("Grey Trex", 3, ["plates2"])]),
}
CELLS = [(0, 0), (0, 1), (1, 0), (1, 1), (3, 0), (3, 1)]          # pack sheet (direction, step): front, back, right
VIEW = ["front", "front", "back", "back", "side", "side"]


def frames(pack, mon):
    d = os.path.join(pack, "Actor", "Monsters", mon)
    f = next(n for n in sorted(os.listdir(d)) if n.lower().endswith(".png") and n != "Faceset.png")
    sh = Image.open(os.path.join(d, f)).convert("RGBA")
    return [sh.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)) for c, r in CELLS]


def ink(im):
    """The pack's outline colour in this picture (its darkest one)."""
    return min((p for p in im.getdata() if p[3]), key=lambda p: sum(p[:3]))


def shade(col, k):
    return tuple(max(0, min(255, round(c + k))) for c in col[:3]) + (255,)


def top(im, x):
    for y in range(im.height):
        if im.getpixel((x, y))[3]: return y
    return None


def blob(im, pts, col, o, lit=None):
    """Fills the pixels pts with col (lit on their left edge) and outlines them where they touch empty space."""
    for x, y in pts:
        if 0 <= x < im.width and 0 <= y < im.height: im.putpixel((x, y), col)
    if lit:
        for x, y in pts:
            if (x - 1, y) not in pts and 0 <= x < im.width and 0 <= y < im.height: im.putpixel((x, y), lit)
    for x, y in pts:
        for q in ((x + 1, y), (x - 1, y), (x, y - 1), (x, y + 1)):
            if q not in pts and 0 <= q[0] < im.width and 0 <= q[1] < im.height and im.getpixel(q)[3] == 0: im.putpixel(q, o)


def heads(im, view, n, back=0.0):
    """n x positions spread over the top of the picture (moved back on the side view) and the top row at each."""
    bb = im.getbbox(); w = bb[2] - bb[0]
    xs = [bb[0] + round(w * (i + 1) / (n + 1)) for i in range(n)]
    if view == "side": xs = [x - round(w * back) for x in xs]
    return [(x, top(im, x)) for x in xs if top(im, x) is not None]


def f_spikes(n):
    def f(im, view, col):
        o = ink(im)
        for i, (x, t) in enumerate(heads(im, view, n, 0.15)):
            h = 3 if n > 1 and i == n // 2 else 2
            blob(im, {(x, t - k) for k in range(1, h + 1)}, shade(col, 50), o)
    return f


def f_plates(n):
    def f(im, view, col):
        o = ink(im); c = shade(col, 10)
        for x, t in heads(im, view, n, 0.2):
            t = min(top(im, xx) or 99 for xx in range(x - 1, x + 3))
            blob(im, {(x + dx, t - dy) for dx, dy in [(-1, 0), (0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (2, 1), (0, 2), (1, 2)]},
                 c, o, shade(c, 45))
    return f


def antennae(im, view, col):
    o = ink(im); bb = im.getbbox(); cx = (bb[0] + bb[2]) // 2
    tip = shade(col, 70)
    for x, dx in ([(cx - 3, -1), (cx + 2, 1)] if view != "side" else [(cx + 1, 1)]):
        t = top(im, x) or bb[1]
        for p in ((x, t - 1), (x + dx, t - 2)): im.putpixel(p, o)
        blob(im, {(x + dx, t - 3)}, tip, o)


def sprout(im, view, col):
    o = ink(im); (x, t), = heads(im, view, 1, 0.1)
    im.putpixel((x, t - 1), o)
    blob(im, {(x - 1, t - 2), (x - 2, t - 2), (x - 2, t - 3), (x + 1, t - 2), (x + 2, t - 2), (x + 2, t - 3)}, (110, 190, 80, 255), o)


def flame(im, view, col):
    o = ink(im); (x, t), = heads(im, view, 1, 0.1)
    blob(im, {(x, t - 1), (x - 1, t - 1), (x + 1, t - 1), (x, t - 2), (x - 1, t - 2), (x, t - 3)}, (246, 170, 60, 255), o)
    im.putpixel((x, t - 1), (255, 236, 150, 255))


def cloud(im, view, col):
    o = ink(im); bb = im.getbbox(); cx = (bb[0] + bb[2]) // 2 - (2 if view == "side" else 0)
    t = top(im, cx) or bb[1]
    pts = {(cx + dx, t - 1 - dy) for dx, dy in [(-3, 0), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (3, 0), (-2, 1), (-1, 1), (0, 1),
                                                 (1, 1), (2, 1), (-1, 2), (0, 2), (1, 2), (2, 2)]}
    blob(im, pts, (240, 246, 255, 255), o)


def fins(im, view, col):
    """Small side fins or wings, one each side (one on the side view, at the back)."""
    o = ink(im); bb = im.getbbox(); y = (bb[1] + bb[3]) // 2 - 1; c = shade(col, 40)
    for x, dx in ([(bb[0] - 1, -1), (bb[2], 1)] if view != "side" else [(bb[0] - 1, -1)]):
        blob(im, {(x, y), (x, y + 1), (x, y + 2)}, c, o)


def gem(im, view, col):
    if view != "front": return
    o = ink(im); bb = im.getbbox(); cx = (bb[0] + bb[2]) // 2; y = bb[3] - 5
    for dx, dy in ((0, 0), (-1, 0), (0, 1), (-1, 1)): im.putpixel((cx + dx, y + dy), (130, 210, 240, 255))
    im.putpixel((cx - 1, y), (235, 250, 255, 255))


FEATURES = {"antennae": antennae, "sprout": sprout, "flame": flame, "cloud": cloud, "fins": fins, "gem": gem,
            "spikes1": f_spikes(1), "spikes2": f_spikes(2), "spikes3": f_spikes(3), "plates1": f_plates(1), "plates2": f_plates(2)}


def stage(pack, mon, k, feats, t):
    """One row: front A/B, back A/B, side-right A/B in 64 px cells, feet on y = 60."""
    out = Image.new("RGBA", (640, 64))
    col = NM.TYPE_COL[t] if t else None
    rgb = tuple(int(col[i:i + 2], 16) for i in (1, 3, 5)) if col else None
    for cell, (fr, view) in enumerate(zip(frames(pack, mon), VIEW)):
        if col: fr = NM.tint(fr, col)
        big = Image.new("RGBA", (26, 26)); big.alpha_composite(fr, (5, 6)); fr = big
        for f in feats: FEATURES[f](fr, view, rgb or (226, 174, 46))   # a line without a type colour: gold features
        fr = fr.crop(fr.getbbox()); kk = k
        while kk > 1 and (fr.height * kk > 60 or fr.width * kk > 64): kk -= 1
        fr = fr.resize((fr.width * kk, fr.height * kk), Image.NEAREST)
        out.alpha_composite(fr, (cell * 64 + (64 - fr.width) // 2, 60 - fr.height))
    return out


def main(pack):
    for cid, (t, stages) in LINES.items():
        out = Image.new("RGBA", (640, 192))
        for row, (mon, k, feats) in enumerate(stages): out.alpha_composite(stage(pack, mon, k, feats, t), (0, row * 64))
        out.save(os.path.join(ROOT, "art", "creatures", cid + ".png"))
        face = Image.open(os.path.join(pack, "Actor", "Monsters", stages[-1][0], "Faceset.png")).convert("RGBA")
        (NM.tint(face, NM.TYPE_COL[t]) if t else face).save(os.path.join(ROOT, "art", "faces", "mon-" + cid + ".png"))
    print("ok ninja lines:", len(LINES))


if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__)
    else: main(sys.argv[1])
