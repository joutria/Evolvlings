#!/usr/bin/env python3
"""Inline every local <script src> of index.html into one self-contained HTML file.
Usage: python3 tools/build-single.py out.html   (run from the repo root)"""
import re, sys
h = open('index.html').read()
def inline(m):
    js = open(m.group(1)).read().replace('</script', '<\\/script')
    return '<script>\n' + js + '\n</script>'
h = re.sub(r'<script src="([\w./-]+\.js)"></script>', inline, h)
h = re.sub(r'<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?', '', h)
open(sys.argv[1], 'w').write(h)
