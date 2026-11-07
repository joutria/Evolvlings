#!/usr/bin/env python3
"""Turn images generated outside the game (Gemini, an artist) into game-ready pixel art in art/.
Needs Pillow (pip install pillow). Run from the repo root, then `node tools/art.js` to refresh the manifest.

  python3 tools/art-import.py creature lumo row1.png [row2.png row3.png]   one image per stage, 10 poses in a 5x2 grid
  python3 tools/art-import.py guardian farol sheet.png                    same, one image
  python3 tools/art-import.py scene events/farolero in.png                256x192: events/<id>, events/<id>--<end>, pause/<zone>-<kind>, cards/<id>
  python3 tools/art-import.py map home in.png [front.png]                 720x528 (+ the front layer, green where empty)
  python3 tools/art-import.py battle aurora-day in.png                    360x240

What it does: keys out the flat green background (#00FF00 or close), finds each pose, scales every pose of a sheet by
the same factor so sizes match, stands the feet on y = 60 of the cell, keeps only opaque or empty pixels, and reduces
the colours to one shared palette without dithering, so the result reads as clean pixel art. Poses are read left to
right, top to bottom: front, front B, back, back B, side, side B, happy, sad, surprised, asleep."""
import sys, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
POSES = 10

def is_key(r, g, b):
    # the green screen: green clearly above red and blue (tolerates the off-greens image models produce)
    return g > 150 and g > r + 60 and g > b + 60

def key_out(im):
    im = im.convert("RGBA"); px = im.load(); w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 128 or is_key(r, g, b): px[x, y] = (0, 0, 0, 0)
            elif g > r + 25 and g > b + 25 and g > 120:  # green fringe on the edges: pull it back to neutral
                px[x, y] = (r, (r + b) // 2, b, 255)
    return im

def blobs(im, min_area):
    """Bounding boxes of the opaque islands (8-connected), merged when close, sorted in reading order."""
    a = im.split()[3]; w, h = im.size
    small = a.resize((max(1, w // 4), max(1, h // 4)), Image.NEAREST); sw, sh = small.size; sp = small.load()
    seen = [[False] * sw for _ in range(sh)]; boxes = []
    for y in range(sh):
        for x in range(sw):
            if sp[x, y] and not seen[y][x]:
                st = [(x, y)]; seen[y][x] = True; x0 = x1 = x; y0 = y1 = y; n = 0
                while st:
                    cx, cy = st.pop(); n += 1
                    x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < sw and 0 <= ny < sh and not seen[ny][nx] and sp[nx, ny]:
                                seen[ny][nx] = True; st.append((nx, ny))
                if n * 16 >= min_area: boxes.append([x0 * 4, y0 * 4, (x1 + 1) * 4, (y1 + 1) * 4])
    # merge boxes that overlap or nearly touch (a wing or antenna split off its body)
    merged = True
    while merged:
        merged = False
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                A, B = boxes[i], boxes[j]; pad = 6
                if A[0] - pad < B[2] and B[0] - pad < A[2] and A[1] - pad < B[3] and B[1] - pad < A[3]:
                    boxes[i] = [min(A[0], B[0]), min(A[1], B[1]), max(A[2], B[2]), max(A[3], B[3])]; boxes.pop(j); merged = True; break
            if merged: break
    rows = sorted(boxes, key=lambda b: (b[1] + b[3]) / 2)
    out, line = [], []
    for b in rows:
        if line and (b[1] + b[3]) / 2 > max(l[3] for l in line):
            out += sorted(line, key=lambda b: b[0]); line = []
        line.append(b)
    return out + sorted(line, key=lambda b: b[0])

def quantize_all(images, colors):
    """One palette for a whole set (all poses of a sheet), opaque-or-empty alpha."""
    W = sum(i.width for i in images); H = max(i.height for i in images)
    strip = Image.new("RGBA", (W, H)); x = 0
    for i in images: strip.paste(i, (x, 0)); x += i.width
    alpha = strip.split()[3].point(lambda v: 255 if v >= 128 else 0)
    rgb = Image.new("RGB", strip.size, (0, 0, 0)); rgb.paste(strip.convert("RGB"), mask=alpha)
    q = rgb.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    out = q.convert("RGBA"); out.putalpha(alpha)
    res, x = [], 0
    for i in images: res.append(out.crop((x, 0, x + i.width, i.height))); x += i.width
    return res

def sheet(kind, folder, cell, rows_in):
    stage_scale = [0.72, 0.86, 1.0] if len(rows_in) == 3 else [1.0] * len(rows_in)
    rows = []
    for si, path in enumerate(rows_in):
        im = key_out(Image.open(path))
        bs = blobs(im, (im.width * im.height) // 400)
        if len(bs) < POSES: print(f"! {path}: encontré {len(bs)} poses, faltan {POSES - len(bs)} (las vacías usarán la de frente)")
        bs = bs[:POSES]
        crops = [im.crop(b) for b in bs]
        tallest = max(c.height for c in crops); widest = max(c.width for c in crops)
        k = min((cell - 6) * stage_scale[si] / tallest, (cell - 4) / widest)
        rows.append([c.resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.LANCZOS) for c in crops])
    flat = quantize_all([c for r in rows for c in r], 32)
    out = Image.new("RGBA", (cell * POSES, cell * len(rows)), (0, 0, 0, 0)); n = 0
    for ri, r in enumerate(rows):
        for ci in range(len(r)):
            c = flat[n]; n += 1
            out.paste(c, (ci * cell + (cell - c.width) // 2, ri * cell + cell - 4 - c.height), c)
    dest = os.path.join(ROOT, "art", folder, kind + ".png"); os.makedirs(os.path.dirname(dest), exist_ok=True)
    out.save(dest); print("ok", dest, out.size)

def flat_image(dest_rel, path, size, colors=48, keep_alpha=False):
    im = Image.open(path).convert("RGBA")
    if keep_alpha: im = key_out(im)
    W, H = size; tw = im.height * W / H
    if tw <= im.width: x0 = (im.width - tw) / 2; im = im.crop((round(x0), 0, round(x0 + tw), im.height))
    else: th = im.width * H / W; y0 = (im.height - th) / 2; im = im.crop((0, round(y0), im.width, round(y0 + th)))
    sm = im.resize(size, Image.LANCZOS)
    if keep_alpha: sm = quantize_all([sm], colors)[0]
    else: sm = sm.convert("RGB").quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    dest = os.path.join(ROOT, "art", dest_rel + ".png"); os.makedirs(os.path.dirname(dest), exist_ok=True)
    sm.save(dest); print("ok", dest, sm.size)

def main(a):
    if len(a) < 3: print(__doc__); return
    what, name, files = a[0], a[1], a[2:]
    if what == "creature": sheet(name, "creatures", 64, files)
    elif what == "guardian": sheet(name, "guardians", 96, files[:1])
    elif what == "scene": flat_image(name, files[0], (256, 192))
    elif what == "battle": flat_image("battle/" + name, files[0], (360, 240))
    elif what == "map":
        flat_image("maps/" + name, files[0], (720, 528), 64)
        if len(files) > 1: flat_image("maps/" + name + "-front", files[1], (720, 528), 48, keep_alpha=True)
    else: print(__doc__)

main(sys.argv[1:])
