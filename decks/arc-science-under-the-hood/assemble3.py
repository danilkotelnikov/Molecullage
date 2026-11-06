"""Assemble the maths copy. Usage: python assemble3.py OUT.html [KEY,KEY]  (with keys, only those fragments are included)."""
import sys, os, re
d = os.path.dirname(os.path.abspath(__file__))
R = lambda n: open(os.path.join(d, n), encoding='utf-8').read()
t = R('base-m.html')
corpus = R('corpus.json').strip() if os.path.exists(os.path.join(d, 'corpus.json')) else '{}'
t = t.replace('<!--dg-->', '<script>window.CORPUS=' + corpus + ';</script>\n<!--dg-->', 1)   # live memory totals for every slide
LIGHT = bool(os.environ.get('NO3D'))   # NO3D=1: no 3D kit and no meshes, for a small deck of 2D slides
for m, f in [('dg', 'dg.html'), ('mk', 'mk.html'), ('rt', 'rt.html'), ('x3', 'x3.html'), ('x3data', 'x3data.html'), ('x3mesh', 'x3mesh.html')]:
    t = t.replace(f'<!--{m}-->', '' if LIGHT and m.startswith('x3') else R(f), 1)
only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
missing = []
def frag(m):
    k = m.group(1)
    if only and k not in only: return ''
    f = os.path.join(d, k + '.html')
    if not os.path.exists(f): missing.append(k); return ''
    return R(k + '.html')
t = re.sub(r'<!--frag:(\w+)-->', frag, t)
open(os.path.join(d, sys.argv[1] if len(sys.argv) > 1 else 'deck-m.html'), 'w', encoding='utf-8').write(t)
print('written', len(t) // 1024, 'KB')
if missing and not only: print('MISSING fragments:', ','.join(missing)); sys.exit(2)
if not only:
    keys = re.findall(r'<section class="slide" data-k="(\w+)"', t)
    print('slides', len(keys), ' '.join(keys))
