"""Build x3data.html: real coordinates for the 3D scenes, from PDB files on disk (no network).
Coordinates are in 0.1 A integers, centred per object. Sources: data/pdb in the worktree and in the main checkout."""
import json, os, math
OL = os.path.dirname(os.path.abspath(__file__))
PDB = [os.environ.get('PDB_DIR', 'data/pdb')]
def path(n):
    for d in PDB:
        p = os.path.join(d, n)
        if os.path.exists(p): return p
    raise FileNotFoundError(n)

def read_pdb(n, model1=True):
    at = []
    for ln in open(path(n), encoding='utf-8', errors='ignore'):
        if ln.startswith('ENDMDL') and model1: break
        if ln.startswith(('ATOM', 'HETATM')):
            alt = ln[16]
            if alt not in ' A': continue
            el = (ln[76:78].strip() or ln[12:14].strip()[0]).upper()
            if el == 'H': continue
            at.append(dict(rec=ln[:6].strip(), name=ln[12:16].strip(), res=ln[17:20].strip(), ch=ln[21], num=int(ln[22:26]), el=el,
                           x=float(ln[30:38]), y=float(ln[38:46]), z=float(ln[46:54])))
    return at

def read_cif(n):
    at, cols = [], []
    for ln in open(path(n), encoding='utf-8', errors='ignore'):
        if ln.startswith('_atom_site.'): cols.append(ln.strip().split('.', 1)[1]); continue
        if cols and ln.startswith(('ATOM', 'HETATM')):
            f = dict(zip(cols, ln.split()))
            if f.get('type_symbol') == 'H': continue
            at.append(dict(name=f['label_atom_id'].strip('"'), res=f['label_comp_id'], ch=f['auth_asym_id'], num=int(f['auth_seq_id']) if f['auth_seq_id'] != '.' else 0,
                           el=f['type_symbol'], x=float(f['Cartn_x']), y=float(f['Cartn_y']), z=float(f['Cartn_z'])))
    return at

def centre(atoms):
    n = len(atoms); return [sum(a[k] for a in atoms) / n for k in 'xyz']
q = lambda v: int(round(v * 10))
def pts(atoms, c): return [q(a[k] - c[i]) for a in atoms for i, k in enumerate('xyz')]
def ca(atoms, ch): return [a for a in atoms if a['ch'] == ch and a['name'] == 'CA' and a.get('rec', 'ATOM') == 'ATOM']
def d2(a, b): return (a['x'] - b['x']) ** 2 + (a['y'] - b['y']) ** 2 + (a['z'] - b['z']) ** 2
def contact_res(atoms, chA, chB, cut=4.5):
    A = [a for a in atoms if a['ch'] == chA and a.get('rec', 'ATOM') == 'ATOM']; B = [a for a in atoms if a['ch'] == chB and a.get('rec', 'ATOM') == 'ATOM']
    c2 = cut * cut; sa, sb = set(), set()
    for a in A:
        for b in B:
            if d2(a, b) < c2: sa.add(a['num']); sb.add(b['num'])
    return sorted(sa), sorted(sb)
def seqidx(cas, nums): s = set(nums); return [i for i, a in enumerate(cas) if a['num'] in s]
def site(atoms, chains, nums_by_chain, c):
    out = []
    for a in atoms:
        if a['ch'] in nums_by_chain and a['num'] in nums_by_chain[a['ch']] and a.get('rec', 'ATOM') == 'ATOM':
            out += [q(a['x'] - c[0]), q(a['y'] - c[1]), q(a['z'] - c[2]), 'CNOS'.find(a['el']) if a['el'] in 'CNOS' else 0]
    return out

def complex_(name, chs, labels):
    at = read_pdb(name)
    cas = {ch: ca(at, ch) for ch in chs}
    c = centre([a for v in cas.values() for a in v])
    o = {'chains': {ch: pts(v, c) for ch, v in cas.items()}, 'nums': {ch: [a['num'] for a in v] for ch, v in cas.items()}, 'labels': labels}
    if len(chs) == 2:
        ra, rb = contact_res(at, chs[0], chs[1]); o['iface'] = {chs[0]: seqidx(cas[chs[0]], ra), chs[1]: seqidx(cas[chs[1]], rb)}
    return o, at, c

X = {}
# STMV (PDB 1A34), biological assembly 1: 60 coat proteins and RNA duplex segments
cif = read_cif('1A34-assembly1.cif')
prot = [a for a in cif if a['name'] == 'CA' and len(a['res']) == 3]
rna = [a for a in cif if a['name'] == 'P']
c = centre(prot)
chains = {}
for a in prot: chains.setdefault(a['ch'], []).append(a)
rch = {}
for a in rna: rch.setdefault(a['ch'], []).append(a)
X['stmv'] = {'prot': [pts(v, c) for v in chains.values()], 'rna': [pts(v, c) for v in rch.values()]}
print('STMV', len(chains), 'protein chains', sum(len(v) for v in chains.values()), 'CA;', len(rch), 'RNA chains', len(rna), 'P')

# 1MEL camel VHH (A) with hen lysozyme (L)
o, at, c = complex_('1MEL.pdb', ['A', 'L'], {'A': 'VHH cAb-Lys3', 'L': 'Hen lysozyme'})
X['mel'] = o; print('1MEL', {k: len(v) // 3 for k, v in o['chains'].items()}, {k: len(v) for k, v in o['iface'].items()})
# T4 lysozyme L99A with benzene (181L)
at = read_pdb('181L.pdb'); cas = ca(at, 'A'); c = centre(cas)
bz = [a for a in at if a['res'] == 'BNZ']
bz1 = [a for a in bz if a['ch'] == bz[0]['ch'] and a['num'] == bz[0]['num']]
near = sorted({a['num'] for a in at if a['ch'] == 'A' and a.get('rec') == 'ATOM' and any(d2(a, b) < 25 for b in bz1)})
X['l99a'] = {'chains': {'A': pts(cas, c)}, 'nums': {'A': [a['num'] for a in cas]}, 'lig': pts(bz1, c), 'site': site(at, ['A'], {'A': set(near)}, c), 'siteNums': near}
print('181L', len(cas), 'CA; benzene atoms', len(bz1), 'pocket residues', near)
# D1.3 Fv (VL A, VH B) with hen lysozyme (C), 1VFB
o, at, c = complex_('1VFB.pdb', ['B', 'C'], {'B': 'Fv D1.3 heavy chain', 'C': 'Hen lysozyme'})
o['chains']['A'] = pts(ca(at, 'A'), c); o['nums']['A'] = [a['num'] for a in ca(at, 'A')]
X['vfb'] = o; print('1VFB', {k: len(v) // 3 for k, v in o['chains'].items()}, {k: len(v) for k, v in o['iface'].items()})
# nanobody 7D12 (B) with EGFR domain III (A), 4KRL
o, at, c = complex_('4KRL.pdb', ['B', 'A'], {'B': 'Nanobody 7D12', 'A': 'EGFR domain III'})
X['krl'] = o; print('4KRL', {k: len(v) // 3 for k, v in o['chains'].items()}, {k: len(v) for k, v in o['iface'].items()})
# Fab THSC20.HVTR26 (H, L) with SARS-CoV-2 RBD, 7Z0X
o, at, c = complex_('7Z0X.pdb', ['H', 'R'], {'H': 'Fab THSC20.HVTR26 heavy chain', 'R': 'SARS-CoV-2 RBD'})
o['chains']['L'] = pts(ca(at, 'L'), c); o['nums']['L'] = [a['num'] for a in ca(at, 'L')]
X['z0x'] = o; print('7Z0X', {k: len(v) // 3 for k, v in o['chains'].items()}, {k: len(v) for k, v in o['iface'].items()})
# whole mouse IgG2a (1IGT): the antibody that a test line usually carries
at = read_pdb('1IGT.pdb'); chs = sorted({a['ch'] for a in at if a['name'] == 'CA'}); cas = {ch: ca(at, ch) for ch in chs}; c = centre([a for v in cas.values() for a in v])
X['igg'] = {'chains': {ch: pts(v, c) for ch, v in cas.items()}}; print('1IGT', {ch: len(v) for ch, v in cas.items()})
open(os.path.join(OL, 'x3data.html'), 'w', encoding='utf-8').write('<script>window.X3D=' + json.dumps(X, separators=(',', ':')) + ';</script>\n')
print('x3data.html', os.path.getsize(os.path.join(OL, 'x3data.html')) // 1024, 'KB')
