"""One command for the deck: check the parts, assemble, test autoplay, optionally walk every step.

    py -3 build_deck.py [--out deck.html] [--steps]

Needs Node with playwright-core in the repository root. The 3D slides need meshes from bake.py (see README.md);
without them run the flat slides only: NO3D=1 py -3 assemble3.py flat.html m1,m2,m3,m4,m5
If ARC_HARNESS_TOOLS is set, the word check (deckgate.py) also runs.
"""
import argparse
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
H = os.environ.get('ARC_HARNESS_TOOLS', '')


def sh(cmd, env=None, timeout=3600):
    p = subprocess.run(cmd, cwd=HERE, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=timeout, env={**os.environ, **(env or {})})
    return p.returncode, (p.stdout or '') + (p.stderr or '')


def step(name, ok, note):
    print(('PASS ' if ok else 'FAIL ') + name + ' ' + note[:160])
    if not ok:
        sys.exit(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='deck.html')
    ap.add_argument('--steps', action='store_true')
    ns = ap.parse_args()
    base = open(os.path.join(HERE, 'base-m.html'), encoding='utf-8').read()
    keys = re.findall(r'<!--frag:(\w+)-->', base)
    missing = [k for k in keys if not os.path.exists(os.path.join(HERE, k + '.html'))]
    step('fragments', bool(keys) and not missing, '%d markers; missing %s' % (len(keys), missing))
    code, out = sh([sys.executable, 'assemble3.py', ns.out])
    step('assemble', code == 0, out.strip().splitlines()[-1] if out.strip() else 'no output')
    if H:
        code, out = sh([sys.executable, '-I', os.path.join(H, 'deckgate.py'), HERE])
        step('deckgate', code == 0, '%d slides fail' % len([l for l in out.splitlines() if ' fail ' in l[:30]]))
    code, out = sh([sys.executable, 'assemble3.py', 'deck-t.html', 'cq,m3,m4,m5'], env={'NO3D': '1'})
    step('test deck', code == 0, out.strip().splitlines()[-1] if out.strip() else 'no output')
    code, out = sh(['node', 'autoplay.mjs', os.path.join(HERE, 'deck-t.html').replace('\\', '/')], timeout=300)
    bad = [l for l in out.splitlines() if l.startswith('FAIL')]
    step('autoplay', code == 0 and not bad, '%d failed checks' % len(bad))
    code, out = sh(['node', 'smoke.mjs', os.path.join(HERE, ns.out).replace('\\', '/')], timeout=900)
    flagged = [l for l in out.splitlines() if l.startswith('FLAG')]
    step('smoke', code == 0, '%d slides flagged' % len(flagged))
    if ns.steps:
        os.makedirs(os.path.join(HERE, 'shots'), exist_ok=True)
        code, out = sh(['node', 'steps.mjs', os.path.join(HERE, ns.out).replace('\\', '/'), os.path.join(HERE, 'shots').replace('\\', '/')], timeout=7200)
        flags = [l for l in out.splitlines() if re.search(r'OVERLAP|LONG|FORBIDDEN|NOMATCH|pageerror|console|PKSPILL|BLEED', l)]
        step('steps', code == 0 and not flags, '%d flagged lines; frames are in shots/' % len(flags))
    print('ALL PASS', ns.out)


if __name__ == '__main__':
    main()
