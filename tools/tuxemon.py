#!/usr/bin/env python3
"""Creatures with real evolution lines, from the Tuxemon project's monsters (https://github.com/Tuxemon/Tuxemon).
Needs Pillow. Run from the repo root with a Tuxemon checkout (the folder holding mods/ and ATTRIBUTIONS.md), then
`node tools/art.js`:

  python3 tools/tuxemon.py ~/src/Tuxemon

Ninja Adventure has no evolution lines, so every stage of a creature was the same 16 px monster drawn bigger. Jose asked
for stages that look like an evolution (2026-11-13) and chose Tuxemon: each stage below is a different monster of one
Tuxemon line. Out come art/creatures/<id>.png (64 px cells, 10 columns: front A/B, back A/B, side-right A/B, then the
four emotion cells left empty so the game shows the front; one row per stage, baby, young, adult) and
art/faces/mon-<id>.png, the adult's own 24 x 24 head picture in a 38 x 38 face, shown beside the Caretaker's lines.

The monsters are 64 x 64 front and back pictures at 1x (no walking frames): frame B is frame A one pixel higher, and the
side view is the front turned to face right. Each line is recoloured to its creature's type colour (tint() of
tools/ninja-maps.py). Licences: only monsters listed in Tuxemon's ATTRIBUTIONS.md are used; the ones here are CC BY-SA 4.0
(credit in CREDITS.md, and the recoloured pictures stay CC BY-SA 4.0)."""
import sys, os, importlib.util
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
_spec = importlib.util.spec_from_file_location("ninja_maps", os.path.join(os.path.dirname(__file__), "ninja-maps.py"))
NM = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(NM)

# creature: (baby, young, adult) Tuxemon slugs, type colour key of NM.TYPE_COL (None keeps the colours)
LINES = {
    "lumo": (("vamporm", "dracune", "fluttaflap"), "light"),     # a grub, its cocoon, a moth of light
    "fizz": (("cardiling", "cardiwing", "cardinale"), "air"),    # a chick that grows into a crested bird
    "pebb": (("lambert", "legko", "moloch"), "stone"),           # a lizard that ends spiked like a rock
}
CREDIT = {  # slug: author(s) as in Tuxemon's ATTRIBUTIONS.md
    "vamporm": "Leo", "dracune": "Leo", "fluttaflap": "Leo", "cardiling": "Spalding004", "cardiwing": "Spalding004",
    "cardinale": "Spalding004", "lambert": "Sanglorian", "legko": "Sanglorian", "moloch": "Sanglorian",
}


def cells(sheet):
    sh = Image.open(sheet).convert("RGBA")
    return sh.crop((0, 0, 64, 64)), sh.crop((64, 0, 128, 64))


def feet(im):
    """The same 64 x 64 picture moved so its lowest pixel sits on y = 60 (where the game puts the feet)."""
    bb = im.getbbox(); out = Image.new("RGBA", (64, 64))
    if bb: out.alpha_composite(im.crop(bb), ((64 - (bb[2] - bb[0])) // 2, 60 - (bb[3] - bb[1])))
    return out


def up1(im):
    out = Image.new("RGBA", im.size); out.alpha_composite(im.crop((0, 1, im.width, im.height)), (0, 0)); return out


def face(sheet, t):
    """Tuxemon's own 24 x 24 head picture (the menu icon), recoloured, in the middle of a 38 x 38 face at 1x."""
    icon = Image.open(sheet).convert("RGBA").crop((0, 64, 24, 88))
    if t: icon = NM.tint(icon, NM.TYPE_COL[t])
    out = Image.new("RGBA", (38, 38)); out.alpha_composite(icon, (7, 8)); return out


def main(tux):
    bat = os.path.join(tux, "mods", "tuxemon", "gfx", "sprites", "battle")
    for cid, (slugs, t) in LINES.items():
        out = Image.new("RGBA", (640, 192))
        for row, slug in enumerate(slugs):
            fr, bk = cells(os.path.join(bat, slug + "-sheet.png"))
            if t: fr, bk = NM.tint(fr, NM.TYPE_COL[t]), NM.tint(bk, NM.TYPE_COL[t])   # each by its own main colour: the backs
                                                                                 # are often painted in other colours
            fr, bk = feet(fr), feet(bk)
            side = fr.transpose(Image.FLIP_LEFT_RIGHT)
            for col, im in enumerate((fr, up1(fr), bk, up1(bk), side, up1(side))):
                out.alpha_composite(im, (col * 64, row * 64))
            if row == 2: face(os.path.join(bat, slug + "-sheet.png"), t).save(os.path.join(ROOT, "art", "faces", "mon-" + cid + ".png"))
        out.save(os.path.join(ROOT, "art", "creatures", cid + ".png"))
    print("ok tuxemon lines:", ", ".join(LINES))


if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__)
    else: main(sys.argv[1])
