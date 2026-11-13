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
tools/ninja-maps.py). Licences: each monster is CC BY-SA, as listed in Tuxemon's ATTRIBUTIONS.md or, for the ones it does
not list, on its page of the Tuxemon wiki (credit in CREDITS.md; the recoloured pictures stay CC BY-SA 4.0)."""
import sys, os, colorsys, importlib.util
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
_spec = importlib.util.spec_from_file_location("ninja_maps", os.path.join(os.path.dirname(__file__), "ninja-maps.py"))
NM = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(NM)

# creature: (baby, young, adult) Tuxemon slugs, type colour key of NM.TYPE_COL (None keeps the colours). Each line was
# picked for the creature's lore (rpg/data-lore-mons.js) and type. A line of two monsters shows its second one as young and
# adult (Tuxemon has no third stage for them).
LINES = {
    "lumo": (("vamporm", "dracune", "fluttaflap"), "light"),     # a grub, its cocoon, a moth of light
    "fizz": (("cardiling", "cardiwing", "cardinale"), "air"),    # a chick that grows into a crested bird
    "pebb": (("lambert", "legko", "moloch"), "stone"),           # a lizard that ends spiked like a rock
    "fuellito": (("agnite", "agnidon", "agnigon"), None),        # a coal lizard that ends a forge dragon
    "brotin": (("chloragon", "sapragon", "dragarbor"), "plant"), # a sprout that grows into a tree
    "espinardo": (("rosarin", "toxiris", "ninjasmine"), "plant"),  # a bud of the Hedge that ends all thorns
    "remolin": (("dollfin", "bigfin", "sharpfin"), None),        # a little fish of the currents
    "vidriela": (("nudiflot_female", "nudimind", "nudimind"), "water"),  # a pale glassy slug of still water
    "bostezo": (("cairfrey", "possessun", "possessun"), "dream"),  # a soft sleepy puff
    "mecha": (("waysprite", "angesnow", "seraphice"), "light"),  # a little flame-sprite that grows tall and thin
    "yunqueron": (("furnursus", "statursus", "coaldiak"), "fire"),  # a forge bear hard as an anvil
    "nim": (("noctula", "noctalo", "noctalo"), "shadow"),        # a bat of empty houses
    "centinela": (("claymorior", "regalance", "regalance"), "shadow"),  # a sworn knight with a lance
    "ecolito": (("selket", "selmatek", "selmatek"), "stone"),   # a pebble that grows into a rock of echoes
    "relampin": (("nut", "bolt", "arthrobolt"), "bolt"),         # a spark machine that runs on lightning
    "trinilla": (("tweesher", "heronquak", "eaglace"), "music"), # a chirping bird of the eaves
    "carambano": (("cohldrabi", "lettice", "frostuce"), "ice"),  # a frozen root that digs
    "capuchon": (("hoodoll", "wolololl", "wolololl"), "mush"),   # a little hood that grows its cap
    "guardatumba": (("chillimp", "snowrilla", "snowrilla"), "ice"),  # an ice guard that sits by a door
    "unisona": (("nebufin", "galasces", "novaquarius"), None),   # a star creature that hums
}
# wild foes: one monster each, one row
WILD = {"fulgor": ("foxfire", "light"), "chisporro": ("djinnbo", None), "canin": ("bamboon", "plant"),
        "ojuelo": ("eyenemy", "shadow"), "ajolin": ("axolightl", None), "topacio": ("tarpeur", "stone"),
        "ululu": ("flacono", "air"), "sombrerin": ("cowpignon", "mush")}
# The author(s) of every monster used here are in CREDITS.md (from ATTRIBUTIONS.md, or the Contributors of its wiki page).


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


def face(sheet, t, cid=None):
    """Tuxemon's own 24 x 24 head picture (the menu icon), recoloured, in the middle of a 38 x 38 face at 1x."""
    icon = Image.open(sheet).convert("RGBA").crop((0, 64, 24, 88))
    if t: icon = NM.tint(icon, NM.TYPE_COL[t])
    if cid in WASH: icon = wash(icon, NM.TYPE_COL[t])
    out = Image.new("RGBA", (38, 38)); out.alpha_composite(icon, (7, 8)); return out


WASH = {"mecha", "relampin", "trinilla", "fulgor"}   # mostly grey or white monsters: tint() has no main colour to move, so
                                                      # their greys are washed with the type colour too


def wash(im, col):
    """Gives the greys of a picture (not the outline, not pure white) the hue of `col`, keeping their light."""
    h0, l0, s0 = colorsys.rgb_to_hls(*(int(col[i:i + 2], 16) / 255 for i in (1, 3, 5)))
    out = im.copy(); px = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if s < 0.22 and 0.18 < l < 0.95:
                rr, gg, bb = colorsys.hls_to_rgb(h0, l, s0 * 0.55)
                px[x, y] = (round(rr * 255), round(gg * 255), round(bb * 255), a)
    return out


def row(out, y, sheet, t, cid=None):
    """One stage: front A/B, back A/B, side-right A/B in 64 px cells at height y."""
    fr, bk = cells(sheet)
    if t: fr, bk = NM.tint(fr, NM.TYPE_COL[t]), NM.tint(bk, NM.TYPE_COL[t])   # each by its own main colour: the backs are
                                                                         # often painted in other colours
    if cid in WASH: fr, bk = wash(fr, NM.TYPE_COL[t]), wash(bk, NM.TYPE_COL[t])
    fr, bk = feet(fr), feet(bk)
    side = fr.transpose(Image.FLIP_LEFT_RIGHT)
    for col, im in enumerate((fr, up1(fr), bk, up1(bk), side, up1(side))):
        out.alpha_composite(im, (col * 64, y))


def main(tux):
    bat = os.path.join(tux, "mods", "tuxemon", "gfx", "sprites", "battle")
    for cid, (slugs, t) in LINES.items():
        out = Image.new("RGBA", (640, 192))
        for r, slug in enumerate(slugs):
            row(out, r * 64, os.path.join(bat, slug + "-sheet.png"), t, cid)
            if r == 2: face(os.path.join(bat, slug + "-sheet.png"), t, cid).save(os.path.join(ROOT, "art", "faces", "mon-" + cid + ".png"))
        out.save(os.path.join(ROOT, "art", "creatures", cid + ".png"))
    for cid, (slug, t) in WILD.items():
        out = Image.new("RGBA", (640, 64)); row(out, 0, os.path.join(bat, slug + "-sheet.png"), t, cid)
        face(os.path.join(bat, slug + "-sheet.png"), t, cid).save(os.path.join(ROOT, "art", "faces", "mon-" + cid + ".png"))
        out.save(os.path.join(ROOT, "art", "creatures", cid + ".png"))
    print("ok tuxemon lines:", len(LINES), "creatures +", len(WILD), "wild")


if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__)
    else: main(sys.argv[1])
