#!/usr/bin/env python3
"""Inline every local <script src> of index.html into one self-contained HTML file.
Usage: python3 tools/build-single.py out.html   (run from the repo root)"""
import re, sys
h = open('index.html').read()
def inline(m):
    js = open(m.group(1)).read().replace('</script', '<\\/script')
    return '<script>\n' + js + '\n</script>'
h = re.sub(r'<script src="([\w./-]+\.js)"></script>', inline, h)
# PNG art (art.js): inline every file in art/manifest.json as data URIs so the one-file build shows it too
import json, base64, os
try:
    man = json.load(open('art/manifest.json'))
    inl = {f['path']: 'data:image/png;base64,' + base64.b64encode(open(os.path.join('art', f['path']), 'rb').read()).decode() for f in man.get('files', [])}
except (OSError, ValueError):
    inl = {}
if inl:
    h = h.replace('<script>\n/* Evolvlings: PNG art loader', '<script>window.EVART_INLINE = ' + json.dumps(inl) + ';</script>\n<script>\n/* Evolvlings: PNG art loader', 1)
h = re.sub(r'<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?', '', h)
open(sys.argv[1], 'w').write(h)
