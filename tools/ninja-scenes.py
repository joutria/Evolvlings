#!/usr/bin/env python3
"""Event pictures composed from the Ninja Adventure pack (CC0, https://pixel-boy.itch.io/ninja-adventure-asset-pack).
Needs Pillow. Run from the repo root with the pack's folder, like tools/ninja-maps.py:

  python3 tools/ninja-scenes.py ~/Downloads/NinjaAdventure [zone or scene ...]

Each scene is a small 8 x 6 tile map (128 x 96) painted with the pack's tiles, houses, props and characters (the pack's
people stand in for ours, our creatures come from art/creatures), then lit (day, dusk, dawn, night with glows around
lanterns and windows, fog, caves) and scaled 2x to art/events/<id>.png (256 x 192). The game shows that picture at the
start of the conversation instead of the drawn one; events without a PNG keep the drawn picture.

The scenes themselves live in tools/scenes/<zone>.py, one function per event, registered with @scene("id"); the cards'
lore scenes sit at the end of the zone files with @card("id") and go to art/cards/<id>.png ("cards" or a card id)."""
import sys, os, re, glob, math, json, weakref, importlib.util
from PIL import Image, ImageDraw, ImageChops

ROOT = os.path.join(os.path.dirname(__file__), "..")
_spec = importlib.util.spec_from_file_location("ninja_maps", os.path.join(os.path.dirname(__file__), "ninja-maps.py"))
NM = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(NM)
T, W, H = 16, 128, 96
PACK = None
_cache = {}
# the pictures of people and creatures (char, animal, mon, guardian and their flipped, scaled or dimmed copies): Scene.put
# remembers where they stand, so an ending can place the team and the foes where nobody already stands (Jose, 2026-11-13:
# figures must not be drawn on top of each other)
FIG = {}   # id -> weak reference (pictures cannot go in a set)


def fig(im):
    k = id(im); FIG[k] = weakref.ref(im, lambda r, k=k: FIG.pop(k, None)); return im


def is_fig(im):
    r = FIG.get(id(im)); return r is not None and r() is im


def overlap(a, b):
    """How much two placed pictures (x, y, picture) cover each other: the area shared by their drawn boxes, each box
    trimmed by 1 px at the sides so that figures may stand side by side touching, but not one on another's head."""
    def box(t):
        x, y, im = t; bb = im.getbbox() or (0, 0, 0, 0)
        return x + bb[0] + 1, y + bb[1], x + bb[2] - 1, y + bb[3]
    (ax0, ay0, ax1, ay1), (bx0, by0, bx1, by1) = box(a), box(b)
    return max(0, min(ax1, bx1) - max(ax0, bx0)) * max(0, min(ay1, by1) - max(ay0, by0))


def free_spot(im, x, y, taken, toward=0, w=None, h=None):
    """x, y (feet) moved to the nearest place where im covers no one in taken (a list of (x, y, picture) by top-left
    corner): sideways first (toward -1/1 tries that side first), then a few pixels up or down. Returns the top-left
    corner; the place asked for when there is no free one."""
    w, h = w or W, h or H
    tries = sorted(((dx, dy) for dx in range(-80, 81, 2) for dy in (0, 3, -3)),
                   key=lambda d: (abs(d[0]) + 3 * abs(d[1]), 0 if d[0] * (toward or 1) >= 0 else 1))
    for dx, dy in tries:
        x0, y0 = int(x + dx) - im.width // 2, int(y + dy) - im.height
        if x0 < -2 or x0 + im.width > w + 2 or y0 + im.height > h + 1: continue
        if all(overlap((x0, y0, im), t) <= 2 for t in taken): return x0, y0
    return int(x) - im.width // 2, int(y) - im.height


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


_faces = None
PEOPLE = {}       # while one event's scene is drawn: pack character -> its "~1"/"~2" colours (people_of)


def faces():
    global _faces
    if not _faces:
        spec = importlib.util.spec_from_file_location("ninja_faces", os.path.join(os.path.dirname(__file__), "ninja-faces.py"))
        _faces = importlib.util.module_from_spec(spec); spec.loader.exec_module(_faces)
    return _faces


def people_of(eid):
    """The people who speak in event eid (its who list in rpg/events-<zone>.js) whose face in rpg/data-faces.js is a
    recoloured "Char~1"/"Char~2": their pack character is drawn in those same colours in the scene and its endings,
    unless another speaker of the event uses that character in its own colours."""
    if not hasattr(people_of, "who"):
        faces_src = open(os.path.join(ROOT, "rpg", "data-faces.js"), encoding="utf8").read()
        people_of.face = dict(re.findall(r'"([^"]+)": "([A-Za-z0-9]+(?:~[12d])?)"', faces_src))
        people_of.who = {}
        for path in glob.glob(os.path.join(ROOT, "rpg", "events-*.js")):
            if path.endswith(".en.js"): continue
            for e, w in re.findall(r'^\s*(\w+): \{ kind: "[^"]+",[^\n]*?who: \{([^}]*)\}', open(path, encoding="utf8").read(), re.M):
                people_of.who[e] = re.findall(r'"([^"]+)"', w)
    looks = [people_of.face.get(n) for n in people_of.who.get(eid, [])]
    looks = [l for l in looks if l]
    plain = {l for l in looks if "~" not in l}
    out = {}
    for l in looks:
        base, _, var = l.partition("~")
        if var in ("1", "2") and base not in plain: out[base] = l
    return out


def char(name, d="down", row=0):
    """One 16 x 16 frame of a pack character: d is where it faces; row 6 is the arms-up pose of most of them.
    "Char~1"/"Char~2" turns its clothes to the colours of that face (tools/ninja-faces.py); a plain name takes them too
    when the event's speaker drawn by it has a recoloured face (PEOPLE). In an ending where the people have left
    (npc false), an empty frame."""
    if END and END.get("npc") is False: return Image.new("RGBA", (T, T))
    if "~" not in name and name in PEOPLE: name = PEOPLE[name]
    base, _, var = name.partition("~")
    key = ("people", name)
    if key not in _cache:
        sh = img("Actor", "Characters", base, "SpriteSheet.png")
        _cache[key] = faces().recolour(sh, {"1": 0.33, "2": 0.62}[var], face=False) if var else sh
    return fig(_cache[key].crop((DIRS[d] * T, row * T, DIRS[d] * T + T, row * T + T)))


def animal(name, sheet="SpriteSheet.png", c=0, r=0, w=16, h=16):
    return fig(img("Actor", "Animals", name, sheet).crop((c * w, r * h, c * w + w, r * h + h)))


def item(*path):
    im = img("Items", *path); return im.crop(im.getbbox())


def mon(cid, d="down", stage=0):
    """One of our creatures at the size of the pack's people: read back from art/creatures/<id>.png (64 px cells, one row
    per stage), facing d. The sheets draw the pack's monsters at 2x-3x (tools/ninja-lines.py), read back here at 1x; a
    picture drawn at 1x and bigger than the pack's 16 px people is shrunk to SMALL[stage] pixels high instead."""
    key = ("mon", cid, d, stage)
    if key in _cache: return _cache[key]
    sh = Image.open(os.path.join(ROOT, "art", "creatures", cid + ".png")).convert("RGBA")
    col = {"down": 0, "up": 2, "right": 4, "left": 4}[d]
    row = min(stage, sh.height // 64 - 1)
    cell = sh.crop((col * 64, row * 64, col * 64 + 64, row * 64 + 64))
    cell = cell.crop(cell.getbbox())
    s = pixel_size(cell)
    if s > 1: out = cell.resize((max(1, cell.width // s), max(1, cell.height // s)), Image.NEAREST)
    else: out = shrink(cell, SMALL[min(stage, 2)])
    if d == "left": out = out.transpose(Image.FLIP_LEFT_RIGHT)
    _cache[key] = fig(out); return out


SMALL = (16, 20, 24)   # creature height in a scene by stage (the pack's people are 16 px)


def shrink(im, h):
    """A big picture made h pixels high (or as wide, if it is wider than high), keeping pixel-art edges."""
    k = h / max(im.width, im.height)
    if k >= 1: return im
    w2, h2 = max(1, round(im.width * k)), max(1, round(im.height * k))
    small = im.resize((w2, h2), Image.BOX)
    a = small.getchannel("A").point(lambda v: 255 if v >= 110 else 0)
    rgb = Image.new("RGBA", small.size); rgb.paste(small.convert("RGB"), (0, 0)); rgb.putalpha(a)
    # un-premultiply the edge colours the box filter pulled towards black
    px, src = rgb.load(), small.load()
    for y in range(h2):
        for x in range(w2):
            r, g, b, al = src[x, y]
            if al and px[x, y][3]: px[x, y] = (r, g, b, 255)
    return rgb


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
        g.putalpha(im.getchannel("A")); return keep(im, g)
    rgb = ImageChops.multiply(im.convert("RGB"), Image.new("RGB", im.size, (int(255 * f), int(255 * f), min(255, int(255 * f * 1.2)))))
    out = rgb.convert("RGBA"); out.putalpha(im.getchannel("A")); return keep(im, out)


def frame(im, w, i=0):
    """Frame i of a strip of frames w pixels wide."""
    return im.crop((i * w, 0, i * w + w, im.height))


def tint(im, col, a=0.5):
    """The same picture washed towards a colour (autumn leaves, leaves going black), keeping its shape."""
    out = Image.blend(im.convert("RGBA"), Image.new("RGBA", im.size, col + (255,)), a); out.putalpha(im.getchannel("A")); return out


def keep(im, out):
    """out is a copy of im: a figure stays a figure."""
    return fig(out) if is_fig(im) else out


def flip(im): return keep(im, im.transpose(Image.FLIP_LEFT_RIGHT))


def scale(im, k): return keep(im, im.resize((im.width * k, im.height * k), Image.NEAREST))


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

    def __init__(self, floor="grass", rows=None, var=0, water=None, seed=11, path=True, size=(W, H)):
        self.w, self.h = size
        self.g = Image.new("RGBA", size)
        rows = rows or ["." * -(-self.w // T)] * -(-self.h // T)
        ry, rx = len(rows) - 1, len(rows[0]) - 1
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
                    same = lambda dx, dy: rows[min(ry, max(0, y + dy))][min(rx, max(0, x + dx))] == ch
                    self.g.alpha_composite(NM.auto(blocks[ch], same), (x * T, y * T))
                elif ch in deco: self.g.alpha_composite(deco[ch], (x * T, y * T))
        self.d = ImageDraw.Draw(self.g)
        self.glows = []
        self.figs = []      # (x, y, picture) of every person and creature put down, by top-left corner

    def put(self, im, x, y):
        """Draw im with its feet (bottom centre) at x, y. A person or creature that would cover one already standing
        there moves to the nearest free spot instead."""
        x0, y0 = int(x) - im.width // 2, int(y) - im.height
        if is_fig(im):
            if any(overlap((x0, y0, im), t) > 2 for t in self.figs): x0, y0 = free_spot(im, x, y, self.figs, 1, self.w, self.h)
            self.figs.append((x0, y0, im))
        NM.paste_clip(self.g, im, x0, y0)
        return self

    def at(self, im, x, y):
        """Draw im with its top-left corner at x, y."""
        NM.paste_clip(self.g, im, int(x), int(y))
        return self

    def row(self, im, y, x0=-8, step=None, x1=None):
        x = x0; x1 = self.w + 8 if x1 is None else x1
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
        """Light the scene (see LIGHTS) with the glows added so far; in an ending, its mood re-lights it."""
        t = tint or LIGHTS[preset]
        if END:
            t, extra = mood(t, END.get("m"), END.get("p") or [])
            self.glows += extra
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
            seed = (seed * 9301 + 49297) % 233280; x = seed % (self.w + 20) - 10
            seed = (seed * 9301 + 49297) % 233280; y = seed % self.h
            self.d.line([(x, y), (x - 2, y + 5)], fill=col)
        return self

    def snow(self, n=40, seed=5):
        for i in range(n):
            seed = (seed * 9301 + 49297) % 233280; x = seed % self.w
            seed = (seed * 9301 + 49297) % 233280; y = seed % self.h
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


# ---------- Endings: the start scene again, re-lit by the ending's mood, with your team and what the outcome brings ----------
# tools/scenes/endings.json holds the drawn endings' specs (EVSCENE.endSpec in scenes.js): mood m, team pose, props p,
# z (a second look: the scene mirrored), npc false (the people have gone), foes. Written to art/events/<id>--<key>.png.
END = None


def mood(t, m, props):
    """The light of an ending: a new tint and extra glows."""
    g = []
    if "fire" in props: g.append((64, 84, 34, FIRE, 0.9))
    if "lamp" in props: g.append((32 if END and END.get("z") else 96, 62, 28, COLD, 0.9))     # the scene is mirrored afterwards
    if m in ("dusk", "night", "cold"): t = LIGHTS[m] if m != "dusk" or min(t) > 0.5 else t
    elif m == "red": t = (t[0], t[1] * 0.78, t[2] * 0.8)
    elif m == "warm": g.append((64, 80, 60, FIRE, 0.55))
    elif m == "bright": t = tuple(min(1.0, v * 1.2 + 0.08) for v in t); g.append((64, 24, 70, (255, 240, 200), 0.5))
    elif m == "sap": t = (t[0] * 0.8, t[1] * 0.7, t[2] * 0.9); g += [(x, y, 16, SAP, 0.8) for x, y in ((20, 70), (70, 66), (112, 74))]
    elif m == "tense": t = tuple(v * 0.85 for v in t)
    return t, g


TEAM = [("lumo", 14, 88), ("pebb", 30, 94), ("fizz", 46, 86)]


def end_front(g, spec, figs=()):
    """Your team (Lumo, Pebb, Fizz), the foes and the props of the outcome, over the lit scene. Each of them moves
    sideways to the nearest spot where it covers none of the scene's people (figs) and none of the others."""
    d = ImageDraw.Draw(g)
    right = spec.get("side") == "right" or (not spec.get("foes") and spec.get("z"))
    team, foes, P = spec.get("team"), spec.get("foes") or [], spec.get("p") or []
    if foes: right = False
    taken = list(figs)
    if "lamp" in P: taken.append((96 - 8, 88 - 30, cut("TilesetElement", 96, 48, 16, 32)))   # drawn below, keep it clear
    for i, (c, x, y) in enumerate(TEAM):
        if team == "away":
            im = mon(c, "up"); x, y = (96 + i * 14, 88 + (i % 2) * 3) if right else (32 - i * 14, 88 + (i % 2) * 3)
        else:
            im = mon(c, "right" if team == "ready" or not right else "left")
            if right: x = W - x
            if team == "happy": y -= 3 if i % 2 == 0 else 1
            if team in ("sleep", "closed"): im = dim(im, 0.8)
        x0, y0 = free_spot(im, x, y, taken, -1 if x < W // 2 else 1); NM.paste_clip(g, im, x0, y0); taken.append((x0, y0, im))
    for i, f in enumerate(foes[:3]):
        im = mon(f, "left", 1); x0, y0 = free_spot(im, 92 + i * 18, 88 + (i % 2) * 6, taken, 1)
        NM.paste_clip(g, im, x0, y0); taken.append((x0, y0, im))
    star = lambda x, y: [d.point((x + dx, y + dy), fill=(255, 226, 120, 255)) for dx, dy in ((0, -1), (-1, 0), (0, 0), (1, 0), (0, 1))]
    def card(x, y):
        for dx, dy in ((0, -10), (8, -6), (-8, -6), (10, 1), (-10, 1)): d.point((x + dx, y + dy), fill=(255, 236, 160, 255))
        d.rectangle([x - 4, y - 6, x + 4, y + 5], fill=(246, 238, 216, 255), outline=(70, 52, 60, 255))
        d.rectangle([x - 3, y - 5, x + 3, y + 1], fill=(110, 170, 200, 255)); star(x, y - 2)
    if "card" in P: card(64, 56)
    if "glint" in P: card(64, 34)
    if "coins" in P:
        for x, y in ((58, 90), (62, 89), (66, 90), (60, 87), (64, 86)): d.ellipse([x - 2, y - 1, x + 2, y + 1], fill=(250, 210, 80, 255), outline=(150, 100, 30, 255))
    if "letter" in P: d.rectangle([58, 80, 70, 87], fill=(246, 238, 216, 255), outline=(90, 70, 60, 255)); d.line([(58, 80), (64, 84), (70, 80)], fill=(120, 80, 90, 255))
    if "scroll" in P: d.rectangle([56, 82, 72, 88], fill=(246, 238, 216, 255), outline=(90, 70, 60, 255)); d.rectangle([54, 81, 56, 89], fill=(130, 90, 56, 255)); d.rectangle([72, 81, 74, 89], fill=(130, 90, 56, 255))
    if "stone" in P: d.ellipse([60, 82, 68, 88], fill=(24, 16, 32, 255)); d.point((62, 84), fill=(180, 140, 230, 255))
    if "bread" in P: d.ellipse([58, 85, 70, 91], fill=(200, 140, 70, 255), outline=(110, 70, 30, 255))
    if "sprout" in P: d.ellipse([58, 89, 70, 92], fill=(100, 70, 44, 255)); d.line([(64, 89), (64, 82)], fill=(80, 150, 60, 255)); d.point((62, 82), fill=(110, 190, 80, 255)); d.point((66, 81), fill=(110, 190, 80, 255))
    if "flower" in P:
        for x, y in ((60, 88), (64, 86), (68, 88)): d.line([(x, y + 4), (x, y)], fill=(80, 150, 60, 255)); d.point((x, y), fill=(250, 240, 230, 255))
    if "cup" in P: d.rectangle([60, 84, 66, 90], fill=(220, 224, 236, 255), outline=(90, 90, 110, 255))
    if "bowl" in P: d.chord([56, 82, 72, 92], 0, 180, fill=(150, 100, 60, 255), outline=(70, 46, 28, 255)); [d.line([(x, 84), (x + 1, 79)], fill=(240, 240, 240, 255)) for x in (61, 64, 67)]
    if "tube" in P: d.rectangle([60, 72, 63, 90], fill=(140, 200, 230, 255), outline=(60, 90, 120, 255)); d.rectangle([61, 82, 62, 89], fill=(250, 220, 90, 255))
    if "zzz" in P:
        for x, y, r in ((56, 70, 1), (62, 64, 2), (69, 57, 2)): d.line([(x - r, y - r), (x + r, y - r), (x - r, y + r), (x + r, y + r)], fill=(240, 240, 250, 255))
    if "notes" in P:
        for i, (x, y) in enumerate(((52, 50), (62, 42), (74, 48), (84, 38))): d.ellipse([x - 2, y - 1, x + 1, y + 1], fill=(250, 220, 110, 255) if i % 2 else (246, 238, 216, 255)); d.line([(x + 1, y), (x + 1, y - 5)], fill=(40, 30, 40, 255))
    if "scratch" in P:
        for x, y in ((24, 70), (27, 68), (30, 66)): d.line([(x, y), (x + 4, y - 5)], fill=(220, 90, 100, 255))
    if "calm" in P:
        for x, y in ((18, 74), (40, 70)): d.arc([x - 5, y - 5, x + 5, y + 5], 200, 330, fill=(110, 180, 220, 255))
    if "eyes" in P:
        for x in (90, 94): d.point((x, 92), fill=(255, 226, 120, 255))
    if "drops-blue" in P:
        for x, y in ((30, 60), (52, 52), (78, 58)): d.rectangle([x, y, x + 1, y + 1], fill=(110, 180, 230, 255))
    if "lamp" in P: NM.paste_clip(g, cut("TilesetElement", 96, 48, 16, 32), 96 - 8, 88 - 30)
    if "fire" in P: NM.paste_clip(g, frame(img("FX", "Particle", "Fire.png"), 12, 1), 58, 80)
    if spec.get("m") == "tense":
        v = Image.new("RGBA", g.size); vd = ImageDraw.Draw(v)
        for i in range(12): vd.line([(i, 0), (i, H)], fill=(20, 14, 30, int(150 - i * 12))); vd.line([(W - 1 - i, 0), (W - 1 - i, H)], fill=(20, 14, 30, int(150 - i * 12)))
        g = Image.alpha_composite(g.convert("RGBA"), v)
    return g


def render_end(eid, key, spec):
    global END
    END = spec
    try:
        s = SCENES[eid]()
    finally:
        END = None
    g = (s.g if isinstance(s, Scene) else s).copy()
    figs = list(s.figs) if isinstance(s, Scene) else []
    if spec.get("z"):
        g = flip(g); figs = [(g.width - x - im.width, y, im.transpose(Image.FLIP_LEFT_RIGHT)) for x, y, im in figs]
    return end_front(g, spec, figs)


SCENES = {}
ZONE_OF = {}
PLACES = {}
ZONES = ["aurora", "crater", "forest", "hollow", "lake", "caves", "heights", "deep", "heart"]
PAUSES = ["camino", "pelea", "cofre", "descanso", "jefe", "victoria", "regreso"]


def scene(eid):
    def reg(fn):
        SCENES[eid] = fn; ZONE_OF[eid] = fn.__module__; return fn
    return reg


CARDS = {}


def card(cid):
    """A card's lore scene (art/cards/<id>.png). The card box shows the middle 5:3 of it (about y 10 to 86), so the
    subject stays between those rows; the thumbnails show all of it."""
    def reg(fn):
        CARDS[cid] = fn; ZONE_OF["card:" + cid] = fn.__module__; return fn
    return reg


def guardian(gid, k=1):
    """A zone guardian at the pack's own size (art/guardians/<id>.png, 96 px cells), k times bigger."""
    sh = Image.open(os.path.join(ROOT, "art", "guardians", gid + ".png")).convert("RGBA")
    c = sh.crop((0, 0, 96, 96)); c = c.crop(c.getbbox()); p = pixel_size(c)
    c = c.resize((c.width // p, c.height // p), Image.NEAREST)
    return fig(scale(c, k) if k > 1 else c)


def load_scenes():
    api = {k: v for k, v in globals().items() if not k.startswith("_")}
    for path in sorted(glob.glob(os.path.join(os.path.dirname(__file__), "scenes", "*.py"))):
        zone = os.path.splitext(os.path.basename(path))[0]
        ns = dict(api, __name__=zone)
        exec(compile(open(path, encoding="utf8").read(), path, "exec"), ns)
        if "PLACES" in ns: PLACES.update(ns["PLACES"])


def main(pack, names):
    global PACK
    PACK = pack
    load_scenes()
    if not names or "battle" in names:          # art/battle/<zone>-day|night.png, 360 x 240
        bo = os.path.join(ROOT, "art", "battle"); os.makedirs(bo, exist_ok=True)
        for z in ZONES:
            for night in (False, True):
                PLACES["battle"](z, night).convert("RGB").resize((360, 240), Image.NEAREST).save(os.path.join(bo, z + ("-night" if night else "-day") + ".png"))
        print("ok battle backgrounds:", len(ZONES) * 2)
    if not names or "pause" in names:           # art/pause/<zone>-<kind>.png, 256 x 192
        po = os.path.join(ROOT, "art", "pause"); os.makedirs(po, exist_ok=True)
        for z in ZONES:
            for k in PAUSES: PLACES["pause"](z, k).convert("RGB").resize((256, 192), Image.NEAREST).save(os.path.join(po, z + "-" + k + ".png"))
        print("ok pauses:", len(ZONES) * len(PAUSES))
    if not names or "cards" in names or any(n in CARDS for n in names):   # art/cards/<id>.png, 256 x 192
        co = os.path.join(ROOT, "art", "cards"); os.makedirs(co, exist_ok=True)
        todo = [c for c in CARDS if not names or "cards" in names or c in names]
        for cid in todo:
            s = CARDS[cid]()
            (s.g if isinstance(s, Scene) else s).convert("RGB").resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(co, cid + ".png"))
        print("ok cards:", len(todo))
    names = [n for n in names if n not in ("battle", "pause", "cards") and n not in CARDS] if names else names
    if names == []: return
    out = os.path.join(ROOT, "art", "events"); os.makedirs(out, exist_ok=True)
    todo = [e for e in SCENES if not names or e in names or ZONE_OF[e] in names]
    global PEOPLE
    for eid in todo:
        PEOPLE = people_of(eid)
        s = SCENES[eid]()
        im = s.g if isinstance(s, Scene) else s
        im.convert("RGB").resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(out, eid + ".png"))
    ends = json.load(open(os.path.join(os.path.dirname(__file__), "scenes", "endings.json"), encoding="utf8"))
    n = 0
    for eid in todo:
        PEOPLE = people_of(eid)
        for key, spec in (ends.get(eid) or {}).items():
            if not spec: continue
            render_end(eid, key, spec).convert("RGB").resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(out, eid + "--" + key + ".png")); n += 1
    PEOPLE = {}
    print("ok", len(todo), "scenes and", n, "endings:", " ".join(todo))


if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__)
    else: main(sys.argv[1], sys.argv[2:])
