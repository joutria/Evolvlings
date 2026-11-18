"""Evolvlings: the second wild creature of each zone, drawn from the CC0 MiniWorld Sprites pack (Shade, see CREDITS.md).

  python3 tools/miniworld-wild.py ~/Downloads/MiniWorldSprites

Out come art/creatures/<id>.png (640 x 64: front A/B, back A/B, side-right A/B in 64 px cells, feet at y 60, like the
Ninja wild sheets of tools/ninja-maps.py) and art/faces/mon-<id>.png (38 x 38 close-up on the pack's dark faceset
ground). MiniWorld's people are too small and faceless to sit beside Ninja Adventure's, but its beasts read well at
the same 16 px scale (Jose, 2026-11-18). The creatures themselves are listed in rpg/data-wild.js.

Each sheet of the pack keeps a direction per row and animation frames along it, but the rows differ by beast, so
every entry names its cells as (column, row); a beast with no back view shows its front there too."""
import os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

DRAGON = dict(cell=32, k=2, head="bottom", front=[(0, 0), (1, 0)], back=[(0, 1), (1, 1)], side=[(0, 3), (2, 3)])   # (1, 3) has a stray pixel under it
BIPED = dict(cell=16, k=3, front=[(0, 0), (1, 0)], back=[(0, 0), (1, 0)], side=[(0, 2), (1, 2)])
WILD = {
    "albadrago": ("Characters/Monsters/Dragons/YellowDragon.png", DRAGON),
    "brasadrago": ("Characters/Monsters/Dragons/RedDragon.png", DRAGON),
    "nubedrago": ("Characters/Monsters/Dragons/WhiteDragon.png", DRAGON),
    "ramacuerno": ("Characters/Monsters/Frostborn/Wendigo.png", BIPED),
    "mohin": ("Characters/Monsters/Demons/PurpleDemon.png", BIPED),
    "ventisco": ("Characters/Monsters/Frostborn/Yeti.png", BIPED),
    "pinzote": ("Characters/Monsters/GiantAnimals/GiantCrab.png", BIPED),
    "colmillon": ("Characters/Monsters/Frostborn/Mammoth.png",
                  dict(cell=16, k=3, front=[(0, 2), (1, 2)], back=[(0, 3), (1, 3)], side=[(0, 0), (1, 0)])),
    # the rest of the pack's beasts and monsters (Jose: "usa todos", 2026-11-18)
    "ombradrago": ("Characters/Monsters/Dragons/BlackDragon.png", DRAGON),
    "marejadrago": ("Characters/Monsters/Dragons/BlueDragon.png", DRAGON),
    "fogonero": ("Characters/Monsters/Demons/RedDemon.png", BIPED),
    "acorazado": ("Characters/Monsters/Demons/ArmouredRedDemon.png", BIPED),
    "tortuguin": ("Animals/MarineAnimals.png", dict(cell=16, k=3, front=[(0, 3), (1, 3)], back=[(0, 0), (1, 0)], side=[(0, 2), (1, 2)])),
    "escamin": ("Animals/MarineAnimals.png", dict(cell=16, k=4, front=[(4, 3), (4, 3)], back=[(4, 0), (4, 0)], side=[(4, 2), (4, 2)])),
    "potrillo": ("Animals/Horse(32x32).png", dict(cell=32, k=2, front=[(0, 4), (1, 4)], back=[(0, 0), (1, 0)], side=[(0, 2), (1, 2)])),
    "gotin": ("Characters/Monsters/Slimes/Slime.png", dict(cell=16, k=4, front=[(0, 0), (1, 0)], back=[(0, 0), (1, 0)], side=[(0, 2), (1, 2)])),
    "gelin": ("Characters/Monsters/Slimes/SlimeBlue.png", dict(cell=16, k=4, front=[(0, 0), (1, 0)], back=[(0, 0), (1, 0)], side=[(0, 2), (1, 2)])),
    "flechin": ("Characters/Monsters/Orcs/ArcherGoblin.png", BIPED),
    "porrin": ("Characters/Monsters/Orcs/ClubGoblin.png", BIPED),
    "hortelin": ("Characters/Monsters/Orcs/FarmerGoblin.png", BIPED),
    "petardin": ("Characters/Monsters/Orcs/KamikazeGoblin.png", BIPED),
    "lancin": ("Characters/Monsters/Orcs/SpearGoblin.png", BIPED),
    "torote": ("Characters/Monsters/Orcs/Minotaur.png", BIPED),
    "ogron": ("Characters/Monsters/Orcs/Orc.png", BIPED),
    "brujon": ("Characters/Monsters/Orcs/OrcMage.png", BIPED),
    "chaman": ("Characters/Monsters/Orcs/OrcShaman.png", BIPED),
    "salobre": ("Characters/Monsters/Pirates/PirateCaptain.png", BIPED),
    "polvorin": ("Characters/Monsters/Pirates/PirateGunner.png", BIPED),
    "grumete": ("Characters/Monsters/Pirates/PirateGrunt.png", BIPED),
    "susurro": ("Characters/Monsters/Undead/Necromancer.png", BIPED),
    "huesudo": ("Characters/Monsters/Undead/Skeleton-Soldier.png", BIPED),
}
FACE_BG = (20, 27, 27, 255)


def frame(sh, spec, cr):
    c = spec["cell"]; f = sh.crop((cr[0] * c, cr[1] * c, cr[0] * c + c, cr[1] * c + c))
    return f.crop(f.getbbox())


def main(pack):
    cdir = os.path.join(ROOT, "art", "creatures"); fdir = os.path.join(ROOT, "art", "faces")
    for cid, (path, spec) in WILD.items():
        sh = Image.open(os.path.join(pack, path)).convert("RGBA")
        out = Image.new("RGBA", (640, 64))
        for cell, cr in enumerate(spec["front"] + spec["back"] + spec["side"]):
            f = frame(sh, spec, cr); k = spec["k"]
            while k > 1 and (f.width * k > 64 or f.height * k > 60): k -= 1
            f = f.resize((f.width * k, f.height * k), Image.NEAREST)
            out.alpha_composite(f, (cell * 64 + (64 - f.width) // 2, 60 - f.height))
        out.save(os.path.join(cdir, cid + ".png"))
        # the face: a close-up of the front frame (3x, dragons 2x), the middle 34 px of its head end (the dragons look
        # down at you, tail up, so theirs is the bottom), on the dark ground
        f = frame(sh, spec, spec["front"][0]); k = spec["k"]
        f = f.resize((f.width * k, f.height * k), Image.NEAREST)
        x0 = max(0, (f.width - 34) // 2); y0 = max(0, f.height - 34) if spec.get("head") == "bottom" else 0
        f = f.crop((x0, y0, x0 + min(34, f.width), y0 + min(34, f.height)))
        face = Image.new("RGBA", (38, 38), FACE_BG); face.alpha_composite(f, ((38 - f.width) // 2, 38 - 2 - f.height if f.height < 34 else 2))
        face.save(os.path.join(fdir, "mon-" + cid + ".png"))
    print("ok miniworld wild", len(WILD))


if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__)
    else: main(sys.argv[1])
