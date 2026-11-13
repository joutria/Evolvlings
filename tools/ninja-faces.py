#!/usr/bin/env python3
"""Cut the conversation faces from the Ninja Adventure pack (CC0, https://pixel-boy.itch.io/ninja-adventure-asset-pack).
Needs Pillow. Run from the repo root with the pack's folder (the one holding Actor/), then `node tools/art.js`:

  python3 tools/ninja-faces.py ~/Downloads/NinjaAdventure

Out come art/faces/<character>.png for every speaker in rpg/data-faces.js (the pack's 38 x 38 Faceset; "Char~1" and
"Char~2" turn the clothes to other colours and leave skin, hair and outline alone, "Char~d" darkens it), the three
icons for voices without a body, and art/faces/mon-<creature>.png, the face of each creature's adult monster (the
Caretaker's lines show the lead creature's face)."""
import sys, os, re, colorsys, importlib.util
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "art", "faces")

# the pack's skin tones (and the cheeks drawn over them): a recolour never touches these
SKIN = {(239, 145, 79), (242, 173, 125), (215, 139, 74), (241, 196, 113), (163, 117, 78), (150, 83, 64), (207, 115, 109),
        (92, 45, 37), (255, 255, 255), (242, 234, 241)}

def recolour(im, turn, face=True):
    """Turns the hue of every coloured pixel that is not skin: clothes, hats and hair change colour. tools/ninja-scenes.py
    turns the same person's 16 x 16 body with face=False, so the clothes in the scene match the face in the talk."""
    out = im.copy(); px = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if (r, g, b) in SKIN or s < 0.18 or v < 0.2: continue
            # the middle of the face (lips, nose, blush) keeps its warm colours
            if face and (h > 0.9 or h < 0.14) and ((x - 19) / 11) ** 2 + ((y - 21) / 10) ** 2 < 1: continue
            r2, g2, b2 = colorsys.hsv_to_rgb((h + turn) % 1, s, v)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return out

def darken(im):
    out = im.copy(); px = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a: px[x, y] = (int(r * 0.45 + 20), int(g * 0.45 + 24), int(b * 0.55 + 46), a)
    return out

def icon(kind, pack):
    """38 x 38 framed icons: a clear light, a drop of black sap, the cave wall."""
    g = Image.new("RGBA", (38, 38), (0, 0, 0, 0)); d = ImageDraw.Draw(g)
    bg = {"light": (246, 238, 206), "sap": (36, 16, 48), "stone": (92, 96, 104)}[kind]
    d.rectangle([1, 1, 36, 36], fill=bg + (255,), outline=(20, 27, 27, 255))
    if kind == "light":
        for r, c in ((14, (255, 246, 200)), (9, (255, 230, 140)), (5, (255, 255, 255))): d.ellipse([19 - r, 19 - r, 19 + r, 19 + r], fill=c + (255,))
        for a, b in (((19, 3), (19, 35)), ((3, 19), (35, 19))): d.line([a, b], fill=(255, 250, 220, 255))
    elif kind == "sap":
        d.polygon([(19, 30), (11, 18), (19, 6), (27, 18)], fill=(59, 29, 74, 255), outline=(14, 8, 20, 255))
        d.ellipse([11, 14, 27, 31], fill=(59, 29, 74, 255), outline=(14, 8, 20, 255))
        d.line([(15, 18), (15, 24)], fill=(125, 255, 176, 255))
    else:
        rock = Image.open(os.path.join(pack, "Backgrounds", "Tilesets", "TilesetNature.png")).convert("RGBA").crop((288, 144, 304, 160))
        rock = rock.crop(rock.getbbox()).resize((rock.width * 2, rock.height * 2), Image.NEAREST)
        g.alpha_composite(rock.resize((32, 32), Image.NEAREST), (3, 3))
    return g

def main(pack):
    os.makedirs(OUT, exist_ok=True)
    src = open(os.path.join(ROOT, "rpg", "data-faces.js"), encoding="utf8").read()
    wanted = sorted(set(re.findall(r'"[^"]+": "([A-Za-z0-9]+(?:~[12d])?|icon-[a-z]+)"', src)))
    made = 0
    for w in wanted:
        name = w.lower().replace("~", "-")
        if w.startswith("icon-"): icon(w[5:], pack).save(os.path.join(OUT, name + ".png")); made += 1; continue
        ch, _, var = w.partition("~")
        d = os.path.join(pack, "Actor", "Characters", ch)
        f = next((os.path.join(d, n) for n in ("Faceset.png", "Faceset1.png") if os.path.exists(os.path.join(d, n))), None)
        if not f: print("missing", ch); continue
        im = Image.open(f).convert("RGBA")
        if var == "1": im = recolour(im, 0.33)
        elif var == "2": im = recolour(im, 0.62)
        elif var == "d": im = darken(im)
        im.save(os.path.join(OUT, name + ".png")); made += 1
    # the creatures' own faces, from the monster that draws their adult stage (tools/ninja-maps.py)
    spec = importlib.util.spec_from_file_location("ninja_maps", os.path.join(os.path.dirname(__file__), "ninja-maps.py"))
    nm = importlib.util.module_from_spec(spec); spec.loader.exec_module(nm)
    for cid, mons in list(nm.SHEETS.items()) + [(k, (v,)) for k, v in nm.WILD.items()]:
        f = os.path.join(pack, "Actor", "Monsters", mons[-1], "Faceset.png")
        if os.path.exists(f): Image.open(f).convert("RGBA").save(os.path.join(OUT, "mon-" + cid + ".png")); made += 1
        else: print("no face for", cid)
    print("ok faces", made)

if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__)
    else: main(sys.argv[1])
