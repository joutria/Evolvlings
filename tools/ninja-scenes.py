#!/usr/bin/env python3
"""Event pictures composed from the Ninja Adventure pack (CC0, https://pixel-boy.itch.io/ninja-adventure-asset-pack).
Needs Pillow. Run from the repo root with the pack's folder, like tools/ninja-maps.py:

  python3 tools/ninja-scenes.py ~/Downloads/NinjaAdventure [scene ...]

Each scene is a small 8 x 6 tile map (128 x 96) painted with the pack's tiles, houses, props and characters, then lit
(day, dusk or night with warm glows around lanterns and windows) and scaled 2x to art/events/<id>.png (256 x 192),
which the game shows instead of the drawn start picture of that conversation."""
import sys, os, importlib.util, math
from PIL import Image, ImageDraw, ImageChops

ROOT = os.path.join(os.path.dirname(__file__), "..")
_spec = importlib.util.spec_from_file_location("ninja_maps", os.path.join(os.path.dirname(__file__), "ninja-maps.py"))
NM = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(NM)
T, W, H = 16, 128, 96


class Kit:
    """The pack's pieces, cut once."""
    def __init__(self, pack):
        self.pack = pack
        ts = lambda n: Image.open(os.path.join(pack, "Backgrounds", "Tilesets", n + ".png")).convert("RGBA")
        self.floor, self.nature, self.house, self.el = ts("TilesetFloor"), ts("TilesetNature"), ts("TilesetHouse"), ts("TilesetElement")
        tile = lambda im, c, r, w=1, h=1: im.crop((c * T, r * T, (c + w) * T, (r + h) * T))
        self.grass = [tile(self.floor, 0, 12)] * 5 + [tile(self.floor, c, 12) for c in (1, 2, 3, 4)] + [tile(self.floor, 2, 11), tile(self.floor, 3, 11)]
        self.dirt = (self.floor, 4, 7)
        self.flower = tile(self.nature, 6, 11)
        self.tree = tile(self.nature, 16, 0, 2, 2)
        trim = lambda im: im.crop(im.getbbox())
        # houses of the top row of the house tileset, 64 x 48 each
        self.houses = {k: self.house.crop((x, 0, x + 64, 48)) for k, x in (("orange", 0), ("beige", 64), ("orange2", 128), ("red", 192))}
        self.lamp = trim(self.el.crop((96, 48, 112, 80)))
        self.bush = self.nature.crop((256, 0, 288, 32))              # round green bush, the Hedge is a row of them
        self.hut = trim(self.house.crop((48, 128, 96, 160)))          # straw hut
        self.stump = trim(self.nature.crop((32, 128, 64, 160)))
        self.tuft = [tile(self.nature, c, 10) for c in (0, 1, 2, 4)]

    def char(self, name, col=0, row=0):
        """One 16 x 16 frame of a character sheet: columns face down, up, left, right."""
        sh = Image.open(os.path.join(self.pack, "Actor", "Characters", name, "SpriteSheet.png")).convert("RGBA")
        return sh.crop((col * T, row * T, col * T + T, row * T + T))


def ground(k, rows):
    """Paint a 8 x 6 row map: '.' grass, '=' dirt road (autotiled), '*' grass with a flower."""
    g = Image.new("RGBA", (W, H))
    seed = 11
    for y, line in enumerate(rows):
        for x, ch in enumerate(line):
            seed = (seed * 9301 + 49297) % 233280
            g.alpha_composite(k.grass[seed % len(k.grass)], (x * T, y * T))
            if ch == "=":
                same = lambda dx, dy: rows[min(len(rows) - 1, max(0, y + dy))][min(len(line) - 1, max(0, x + dx))] == "="
                g.alpha_composite(NM.auto(k.dirt, same), (x * T, y * T))
            if ch == "*": g.alpha_composite(k.flower, (x * T, y * T))
    return g


def put(g, im, x, y):
    """Draw im with its feet (bottom centre) at x, y."""
    NM.paste_clip(g, im, x - im.width // 2, y - im.height)


def dim(im, f=0.45):
    """An unlit lamp: the same picture, darker and greyer."""
    rgb = ImageChops.multiply(im.convert("RGB"), Image.new("RGB", im.size, (int(255 * f), int(255 * f), int(255 * f * 1.2))))
    out = rgb.convert("RGBA"); out.putalpha(im.getchannel("A")); return out


def light(g, tint, glows):
    """Light the picture like a lamp would: a light map starts at the night tint (r, g, b multipliers) and every glow
    (x, y, radius, (r, g, b), strength) raises it towards its colour; the picture is multiplied by it, so under a lamp
    the true colours come back warm, and the very centre of a glow gets a little extra shine on top."""
    base = tuple(int(255 * t) for t in tint)
    lm = Image.new("RGB", g.size, base); px = lm.load()
    shine = Image.new("RGB", g.size, (0, 0, 0)); sp = shine.load()
    for gx, gy, rad, col, s in glows:
        for y in range(max(0, gy - rad), min(g.height, gy + rad + 1)):
            for x in range(max(0, gx - rad), min(g.width, gx + rad + 1)):
                d = math.hypot(x - gx, (y - gy) * 1.15) / rad
                if d >= 1: continue
                f = round(s * (1 - d) ** 1.3 * 6) / 6          # stepped falloff keeps the pixel-art look
                r0, g0, b0 = px[x, y]
                px[x, y] = tuple(min(255, int(c0 + (cc - c0) * f)) for c0, cc in zip((r0, g0, b0), col))
                if f > 0.6:
                    q = sp[x, y]; sp[x, y] = tuple(min(255, v + int(cc * (f - 0.6) * 0.5)) for v, cc in zip(q, col))
    rgb = ImageChops.add(ImageChops.multiply(g.convert("RGB"), lm), shine)
    return rgb.convert("RGBA")


WARM = (255, 214, 150)
COLD = (214, 236, 255)     # the Meadow lanterns burn Savia, not oil: their light is pale and cold


def farolero(k):
    """Aurora: a street of the Meadow at night; old Pabilo lights one more lantern with his pole."""
    g = ground(k, ["........", "........", "........", "========", "========", "........"])
    g.alpha_composite(k.houses["red"], (-20, -2)); g.alpha_composite(k.houses["orange"], (44, -2))
    put(g, k.tree, 124, 44)
    lamps = [(12, 60, True), (60, 60, True), (100, 60, False)]
    for x, y, on in lamps: put(g, k.lamp if on else dim(k.lamp), x, y)
    # Pabilo (the pack's OldMan, arms up) under the last lantern, his pole reaching its flame
    put(g, k.char("OldMan", 0, 6), 92, 74)
    glows = [(x, y - 24, 30, COLD, 1.0) for x, y, on in lamps if on] + [(100, 36, 18, COLD, 0.9), (93, 66, 12, COLD, 0.5)]
    glows += [(76, 38, 10, COLD, 0.7), (12, 38, 10, COLD, 0.7)]      # doors and windows
    g = light(g, (0.30, 0.34, 0.58), glows)
    d = ImageDraw.Draw(g)                               # the pole and its little flame, drawn over the night
    d.line([(95, 62), (100, 37)], fill=(150, 104, 66, 255))
    d.point((100, 36), fill=(240, 248, 255, 255)); d.point((101, 35), fill=(190, 220, 255, 255))
    return g


def fuera(k):
    """Forest: outside the Hedge at dusk, a Shadow family has made a shelter; the father picks up fallen twigs."""
    g = ground(k, ["........"] * 6)
    for i, x in enumerate(range(-12, 140, 22)): put(g, k.bush, x, 30 + (i % 2) * 3)      # the Hedge, a wall of bushes
    put(g, k.hut, 26, 66)
    put(g, k.stump, 110, 82)
    for x, y, i in ((60, 88, 0), (8, 90, 1), (122, 50, 2), (84, 56, 3)): put(g, k.tuft[i], x, y)
    # the unlit fire: a ring of stones with a few twigs
    d = ImageDraw.Draw(g)
    for dx, dy in ((-5, 0), (5, 0), (-4, 3), (4, 3), (0, 5), (-3, -3), (3, -3), (0, -4)): d.rectangle([64 + dx, 72 + dy, 65 + dx, 73 + dy], fill=(140, 136, 128, 255), outline=(60, 56, 60, 255))
    d.line([(62, 71), (67, 73)], fill=(110, 74, 44, 255)); d.line([(62, 73), (67, 70)], fill=(96, 64, 38, 255))
    # Bruma's family: the father bent over the twigs, the mother at the hut, two children watching you
    put(g, k.char("Villager3", 2, 0), 86, 74)
    d.line([(78, 70), (81, 73)], fill=(120, 80, 48, 255)); d.line([(77, 72), (81, 71)], fill=(120, 80, 48, 255))
    put(g, k.char("Woman", 3, 0), 44, 70)
    put(g, k.char("Child", 0, 0), 30, 90); put(g, k.char("Child", 0, 1), 44, 92)
    return light(g, (0.62, 0.56, 0.80), [(124, 0, 70, (255, 214, 170), 0.7)])


SCENES = {"farolero": farolero, "fuera": fuera}


def main(pack, names):
    k = Kit(pack)
    out = os.path.join(ROOT, "art", "events"); os.makedirs(out, exist_ok=True)
    for name in names or SCENES:
        im = SCENES[name](k)
        im.resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(out, name + ".png"))
        print("ok", name)


if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__)
    else: main(sys.argv[1], sys.argv[2:])
