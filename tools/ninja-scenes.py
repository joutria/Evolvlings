#!/usr/bin/env python3
"""Event pictures composed from the Ninja Adventure pack (CC0, https://pixel-boy.itch.io/ninja-adventure-asset-pack).
Needs Pillow. Run from the repo root with the pack's folder, like tools/ninja-maps.py:

  python3 tools/ninja-scenes.py ~/Downloads/NinjaAdventure [zone or scene ...]

Each scene is a small 8 x 6 tile map (128 x 96) painted with the pack's tiles, houses, props and characters (the pack's
people stand in for ours, our creatures come from art/creatures), then lit (day, dusk, dawn, night with glows around
lanterns and windows, fog, caves) and scaled 2x to art/events/<id>.png (256 x 192). The game shows that picture at the
start of the conversation instead of the drawn one; events without a PNG keep the drawn picture.

The scenes themselves live in tools/scenes/<zone>.py, one function per event, registered with @scene("id")."""
import sys, os, glob, math, importlib.util
from PIL import Image, ImageDraw, ImageChops

ROOT = os.path.join(os.path.dirname(__file__), "..")
_spec = importlib.util.spec_from_file_location("ninja_maps", os.path.join(os.path.dirname(__file__), "ninja-maps.py"))
NM = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(NM)
T, W, H = 16, 128, 96
PACK = None
_cache = {}


def img(*parts):
    """A PNG of the pack, by its path under the pack folder (cached)."""
    key = os.path.join(*parts)
    if key not in _cache: _cache[key] = Image.open(os.path.join(PACK, key)).convert("RGBA")
    return _cache[key]


def ts(name): return img("Backgrounds", "Tilesets", name + ".png")


def cut(sheet, x, y, w, h, trim=True):
    """A piece of a tileset in pixels, trimmed to what is drawn."""
    im = (ts(sheet) if isinstance(sheet, str) else sheet).crop((x, y, x + w, y + h))
    return im.crop(im.getbbox()) if trim and im.getbbox() else im


def tile(sheet, c, r, w=1, h=1, trim=False): return cut(sheet, c * T, r * T, w * T, h * T, trim)


DIRS = {"down": 0, "up": 1, "left": 2, "right": 3}


def char(name, d="down", row=0):
    """One 16 x 16 frame of a pack character: d is where it faces; row 6 is the arms-up pose of most of them."""
    return img("Actor", "Characters", name, "SpriteSheet.png").crop((DIRS[d] * T, row * T, DIRS[d] * T + T, row * T + T))


def animal(name, sheet="SpriteSheet.png", c=0, r=0, w=16, h=16):
    return img("Actor", "Animals", name, sheet).crop((c * w, r * h, c * w + w, r * h + h))


def item(*path):
    im = img("Items", *path); return im.crop(im.getbbox())


def mon(cid, d="down", stage=0):
    """One of our creatures at the pack's own size: read back from art/creatures/<id>.png (64 px cells; the stage
    rows are the monster at 2x, 3x, 4x and the wild ones at 3x), facing d."""
    key = ("mon", cid, d, stage)
    if key in _cache: return _cache[key]
    sh = Image.open(os.path.join(ROOT, "art", "creatures", cid + ".png")).convert("RGBA")
    col = {"down": 0, "up": 2, "right": 4, "left": 4}[d]
    row = min(stage, sh.height // 64 - 1)
    cell = sh.crop((col * 64, row * 64, col * 64 + 64, row * 64 + 64))
    cell = cell.crop(cell.getbbox())
    s = pixel_size(cell)
    out = cell.resize((max(1, cell.width // s), max(1, cell.height // s)), Image.NEAREST)
    if d == "left": out = out.transpose(Image.FLIP_LEFT_RIGHT)
    _cache[key] = out; return out


def pixel_size(im):
    """How many screen pixels make one art pixel (4, 3 or 2), found by checking that blocks are uniform."""
    px = im.load()
    for s in (4, 3, 2):
        if im.width % s or im.height % s: continue
        ok = True
        for y in range(0, im.height, s):
            for x in range(0, im.width, s):
                v = px[x, y]
                if any(px[x + i, y + j] != v for i in range(s) for j in range(s)): ok = False; break
            if not ok: break
        if ok: return s
    return 1


def dim(im, f=0.45, grey=False):
    """The same picture darker (an unlit lamp), or greyed out (flowers losing their colour)."""
    if grey:
        g = im.convert("LA").convert("RGBA"); g = ImageChops.multiply(g, Image.new("RGBA", im.size, (int(255 * f),) * 3 + (255,)))
        g.putalpha(im.getchannel("A")); return g
    rgb = ImageChops.multiply(im.convert("RGB"), Image.new("RGB", im.size, (int(255 * f), int(255 * f), min(255, int(255 * f * 1.2)))))
    out = rgb.convert("RGBA"); out.putalpha(im.getchannel("A")); return out


def frame(im, w, i=0):
    """Frame i of a strip of frames w pixels wide."""
    return im.crop((i * w, 0, i * w + w, im.height))


def flip(im): return im.transpose(Image.FLIP_LEFT_RIGHT)


def scale(im, k): return im.resize((im.width * k, im.height * k), Image.NEAREST)


# ground kinds: the row of the pack's floor sheet that holds its plain tiles, and the 4 x 4 path block 5 rows above
FLOORS = {"sand": 5, "grass": 12, "snow": 19}
WATERS = {"grass": (4, 6), "sand": (4, 0), "snow": (15, 0), "swamp": (15, 6)}

WARM = (255, 214, 150)
COLD = (214, 236, 255)     # the Meadow lanterns burn Savia, not oil: their light is pale and cold
FIRE = (255, 170, 90)
MOON = (190, 205, 255)
SAP = (150, 90, 200)

LIGHTS = {"day": (1.0, 1.0, 1.0), "dusk": (0.84, 0.70, 0.82), "dawn": (0.92, 0.78, 0.82), "night": (0.30, 0.34, 0.58),
          "deep": (0.36, 0.34, 0.52), "cave": (0.40, 0.38, 0.50), "storm": (0.50, 0.54, 0.66), "cold": (0.86, 0.92, 1.0),
          "gloom": (0.62, 0.60, 0.72)}


class Scene:
    """An 8 x 6 tile picture. rows: 6 strings of 8 characters:
    '.' plain ground  '=' path  '~' water  '*' flower  ',' grass tuft  'o' pebble  'x' a grey (dead) flower"""

    def __init__(self, floor="grass", rows=None, var=0, water=None, seed=11, path=True):
        self.g = Image.new("RGBA", (W, H))
        rows = rows or ["........"] * 6
        rb = FLOORS[floor]; off = 11 * var
        plain = [tile("TilesetFloor", off, rb)] * 5 + [tile("TilesetFloor", off + c, rb) for c in (1, 2, 3, 4)]
        if not var and floor == "grass": plain += [tile("TilesetFloor", 2, rb - 1), tile("TilesetFloor", 3, rb - 1)]
        blocks = {"=": (ts("TilesetFloor"), off + 4, rb - 5), "~": (ts("TilesetWater"),) + WATERS[water or floor]}
        nat = ts("TilesetNature")
        fd = ts("TilesetFloorDetail")
        deco = {"*": tile(fd, 5, 3), ",": tile(fd, 0, 2), "o": tile(fd, 0, 0), "x": dim(tile(fd, 5, 3), 0.75, grey=True)}
        for y, line in enumerate(rows):
            for x, ch in enumerate(line):
                seed = (seed * 9301 + 49297) % 233280
                self.g.alpha_composite(plain[0], (x * T, y * T))          # some variants have see-through corners
                self.g.alpha_composite(plain[seed % len(plain)], (x * T, y * T))
                if ch in blocks:
                    same = lambda dx, dy: rows[min(5, max(0, y + dy))][min(7, max(0, x + dx))] == ch
                    self.g.alpha_composite(NM.auto(blocks[ch], same), (x * T, y * T))
                elif ch in deco: self.g.alpha_composite(deco[ch], (x * T, y * T))
        self.d = ImageDraw.Draw(self.g)
        self.glows = []

    def put(self, im, x, y):
        """Draw im with its feet (bottom centre) at x, y."""
        NM.paste_clip(self.g, im, int(x) - im.width // 2, int(y) - im.height)
        return self

    def at(self, im, x, y):
        """Draw im with its top-left corner at x, y."""
        NM.paste_clip(self.g, im, int(x), int(y))
        return self

    def row(self, im, y, x0=-8, step=None, x1=W + 8):
        x = x0
        while x < x1: self.put(im, x, y); x += step or im.width
        return self

    def glow(self, x, y, r=24, col=WARM, s=1.0):
        self.glows.append((int(x), int(y), r, col, s)); return self

    def sap(self, x, y, w=10, h=4):
        """A pool of Black Sap: glossy black with a purple sheen, and its glow."""
        d = self.d
        d.ellipse([x - w // 2, y - h // 2, x + w // 2, y + h // 2], fill=(18, 12, 26, 255))
        d.line([(x - w // 4, y - h // 4), (x, y - h // 4)], fill=(120, 80, 170, 255))
        d.point((x + w // 4, y), fill=(200, 160, 240, 255))
        return self

    def stem(self, pts, col=(20, 14, 30, 255)):
        """Black sap-stained stems or a rope: a polyline."""
        self.d.line(pts, fill=col); return self

    def lit(self, preset="day", tint=None):
        """Light the scene (see LIGHTS) with the glows added so far."""
        t = tint or LIGHTS[preset]
        if t != (1.0, 1.0, 1.0) or self.glows: self.g = light(self.g, t, self.glows)
        self.d = ImageDraw.Draw(self.g)
        return self

    def fog(self, a=0.45, col=(206, 210, 222), hole=None):
        """Fog over everything; hole=(x, y, r) keeps a clearer patch around what the scene is about."""
        mask = Image.new("L", self.g.size, int(255 * a))
        if hole:
            md = ImageDraw.Draw(mask); x, y, r = hole
            for i, f in enumerate((0.85, 0.7, 0.55, 0.42, 0.3)):
                rr = r * (1 - i * 0.16); md.ellipse([x - rr, y - rr * 0.8, x + rr, y + rr * 0.8], fill=int(255 * a * f))
        self.g = Image.composite(Image.new("RGBA", self.g.size, col + (255,)), self.g, mask)
        self.d = ImageDraw.Draw(self.g); return self

    def rain(self, n=70, seed=3, col=(200, 214, 240, 255)):
        for i in range(n):
            seed = (seed * 9301 + 49297) % 233280; x = seed % (W + 20) - 10
            seed = (seed * 9301 + 49297) % 233280; y = seed % H
            self.d.line([(x, y), (x - 2, y + 5)], fill=col)
        return self

    def snow(self, n=40, seed=5):
        for i in range(n):
            seed = (seed * 9301 + 49297) % 233280; x = seed % W
            seed = (seed * 9301 + 49297) % 233280; y = seed % H
            self.d.point((x, y), fill=(250, 252, 255, 255))
        return self


def light(g, tint, glows):
    """Light the picture like a lamp would: a light map starts at the tint (r, g, b multipliers) and every glow
    (x, y, radius, (r, g, b), strength) raises it towards its colour; the picture is multiplied by it, so under a lamp
    the true colours come back, and the very centre of a glow gets a little extra shine on top."""
    base = tuple(min(255, int(255 * t)) for t in tint)
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


SCENES = {}
ZONE_OF = {}


def scene(eid):
    def reg(fn):
        SCENES[eid] = fn; ZONE_OF[eid] = fn.__module__; return fn
    return reg


def load_scenes():
    api = {k: v for k, v in globals().items() if not k.startswith("_")}
    for path in sorted(glob.glob(os.path.join(os.path.dirname(__file__), "scenes", "*.py"))):
        zone = os.path.splitext(os.path.basename(path))[0]
        ns = dict(api, __name__=zone)
        exec(compile(open(path, encoding="utf8").read(), path, "exec"), ns)


def main(pack, names):
    global PACK
    PACK = pack
    load_scenes()
    out = os.path.join(ROOT, "art", "events"); os.makedirs(out, exist_ok=True)
    todo = [e for e in SCENES if not names or e in names or ZONE_OF[e] in names]
    for eid in todo:
        s = SCENES[eid]()
        im = s.g if isinstance(s, Scene) else s
        im.convert("RGB").resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(out, eid + ".png"))
    print("ok", len(todo), "scenes:", " ".join(todo))


if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__)
    else: main(sys.argv[1], sys.argv[2:])
