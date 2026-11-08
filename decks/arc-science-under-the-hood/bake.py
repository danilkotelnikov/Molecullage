"""Bake real molecular geometry for the 3D scenes, from PDB files on disk (no network, no ChimeraX).
Surface: solvent-excluded surface (probe 1.4 A) from a distance field on a fine grid, marching cubes, gradient normals.
Ribbon: Carson-style cartoon from N, CA, C, O of every residue; helices and strands from the HELIX and SHEET records.
Every vertex carries: ambient light from a blurred solid volume, the residue index, and the screened charge potential
phi = sum lB q exp(-r/lD) / r, in kT/e, with lB 7.1 A and lD 7.85 A (0.15 M salt, water, 298 K).
Output: x3mesh.html, window.X3M = {name: {chain: {surface, ribbon}}}, base64 typed arrays. Frame: same centre as x3data.html.
py -3 bake.py"""
import base64, json, os
import numpy as np
from scipy import ndimage as ni
from scipy.spatial import cKDTree
from skimage import measure
import trimesh

OL = os.path.dirname(os.path.abspath(__file__))
PDB = [os.environ.get('PDB_DIR', 'data/pdb')]
VDW = {'C': 1.7, 'N': 1.55, 'O': 1.52, 'S': 1.8, 'P': 1.8}
LB, LD = 7.1, 7.85
CHG = {('ARG', 'NH1'): .5, ('ARG', 'NH2'): .5, ('LYS', 'NZ'): 1., ('ASP', 'OD1'): -.5, ('ASP', 'OD2'): -.5, ('GLU', 'OE1'): -.5, ('GLU', 'OE2'): -.5}


def path(n):
    for d in PDB:
        p = os.path.join(d, n)
        if os.path.exists(p): return p
    raise FileNotFoundError(n)


def read(name):
    at, hel, sh = [], [], []
    for ln in open(path(name), encoding='utf-8', errors='ignore'):
        if ln.startswith('ENDMDL'): break
        if ln.startswith('HELIX '): hel.append((ln[19], int(ln[21:25]), int(ln[33:37])))
        if ln.startswith('SHEET '): sh.append((ln[21], int(ln[22:26]), int(ln[33:37])))
        if ln.startswith('ATOM') and ln[16] in ' A':
            el = (ln[76:78].strip() or ln[12:14].strip()[0]).upper()
            if el != 'H': at.append((ln[12:16].strip(), ln[17:20].strip(), ln[21], int(ln[22:26]), el, float(ln[30:38]), float(ln[38:46]), float(ln[46:54])))
    return at, hel, sh


def xyz(at): return np.array([a[5:8] for a in at], float)


def field(all_xyz, all_r, h=0.45, pad=7.0):
    """Grid, solid mask of the solvent-excluded volume for a set of atoms, probe 1.4 A."""
    lo = all_xyz.min(0) - pad; dims = np.ceil((all_xyz.max(0) + pad - lo) / h).astype(int) + 1
    g = np.ones(dims, bool)   # True = outside the probe-expanded atoms
    for p, r in zip(all_xyz, all_r):
        R = r + 1.4; i0 = np.maximum(((p - R - lo) / h).astype(int) - 1, 0); i1 = np.minimum(((p + R - lo) / h).astype(int) + 2, dims)
        ax = [np.arange(i0[k], i1[k]) * h + lo[k] - p[k] for k in range(3)]
        d2 = ax[0][:, None, None] ** 2 + ax[1][None, :, None] ** 2 + ax[2][None, None, :] ** 2
        g[i0[0]:i1[0], i0[1]:i1[1], i0[2]:i1[2]] &= d2 > R * R
    # label the outside: keep only solvent connected to the box edge, so closed cavities do not make inner shells
    lab, _ = ni.label(g); g = lab == lab[0, 0, 0]
    d = ni.distance_transform_edt(~g, sampling=h)   # depth below the probe-accessible surface; 1.4 A deep is the molecular surface
    return lo, h, d


def surface(atoms, h=.45):
    p, r = xyz(atoms), np.array([VDW.get(a[4], 1.7) for a in atoms])
    lo, h, d = field(p, r, h)
    d = ni.gaussian_filter(d, 1.15)   # removes grid steps; the level set stays on the molecular surface
    v, f, n, _ = measure.marching_cubes(d, 1.4, spacing=(h, h, h))
    v = v + lo
    m = trimesh.Trimesh(v, f, process=False); trimesh.smoothing.filter_taubin(m, lamb=0.5, nu=0.53, iterations=16)
    v = np.array(m.vertices); n = np.array(m.vertex_normals)
    _, near = cKDTree(p).query(v)
    if ((v - p[near]) * n).sum(1).mean() < 0: n = -n   # normals point away from the atoms
    fn = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
    if (fn * n[f[:, 0]]).sum(1).mean() < 0: f = f[:, ::-1]   # triangles face the same way
    return v, f, n


def spline(P, m):
    """Catmull-Rom through rows of P; m samples per interval."""
    P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]]); out = []
    t = (np.arange(m) / m)[:, None]
    for i in range(1, len(P) - 2):
        a, b, c, d = P[i - 1:i + 3]
        out.append(.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t ** 2 + (3 * b - a - 3 * c + d) * t ** 3))
    out.append(P[-2][None]); return np.vstack(out)


def ribbon(atoms, hel, sh, ch, m=12, ring=18):
    nums = sorted({a[3] for a in atoms})
    get = {(a[3], a[0]): np.array(a[5:8]) for a in atoms}
    nums = [k for k in nums if all((k, q) in get for q in ('CA', 'C', 'O'))]
    n = len(nums); CA = np.array([get[(k, 'CA')] for k in nums]); O = np.array([get[(k, 'O')] for k in nums]); C = np.array([get[(k, 'C')] for k in nums])
    ss = np.zeros(n, int)   # 0 coil, 1 helix, 2 strand
    for c, a, b in hel:
        if c == ch: ss[[i for i, k in enumerate(nums) if a <= k <= b]] = 1
    for c, a, b in sh:
        if c == ch: ss[[i for i, k in enumerate(nums) if a <= k <= b]] = 2
    # the side vector follows the peptide plane; flip so it never turns over between residues
    fwd = np.gradient(CA, axis=0); side = np.cross(np.cross(fwd, O - C), fwd); side /= np.linalg.norm(side, axis=1, keepdims=True)
    for i in range(1, n):
        if side[i] @ side[i - 1] < 0: side[i] = -side[i]
    # strands run through residue midpoints so the pleat does not show as a zigzag
    Q = CA.copy()
    for i in range(1, n - 1):
        if ss[i] == 2: Q[i] = .25 * CA[i - 1] + .5 * CA[i] + .25 * CA[i + 1]
    for i in range(1, n - 1):
        side[i] = side[i] + .5 * (side[i - 1] + side[i + 1]) if ss[i] == 2 else side[i]
    side /= np.linalg.norm(side, axis=1, keepdims=True)
    S, Y = spline(Q, m), spline(side, m)
    T = np.gradient(S, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True)
    Y = Y - (Y * T).sum(1, keepdims=True) * T; Y /= np.linalg.norm(Y, axis=1, keepdims=True); Z = np.cross(T, Y)
    N = len(S); u = np.arange(N) / m; res = np.minimum(np.round(u).astype(int), n - 1)
    w = np.full(N, .42); t = np.full(N, .42)   # half width, half thickness; loops are round
    for r0, r1, kind in runs(ss):
        a, b = r0, r1 + 1
        ease = np.clip(np.minimum(u - r0 + .5, r1 + .5 - u) / .8, 0, 1) ** .7 if kind == 1 else None
        mask = (u >= r0 - .5) & (u <= r1 + .5)
        if kind == 1:
            w[mask] = .42 + (1.45 - .42) * ease[mask]; t[mask] = .42 + (.34 - .42) * ease[mask]
        if kind == 2:
            head = r1 - .6
            w[mask] = np.where(u[mask] < head, 1.3, np.maximum(2.35 * (r1 + .55 - u[mask]) / (r1 + .55 - head), .42)); t[mask] = .36
    w = ni.gaussian_filter1d(w, .7); t = ni.gaussian_filter1d(t, 1.5)
    th = 2 * np.pi * np.arange(ring) / ring; cs, sn = np.cos(th), np.sin(th)
    sq = lambda x: np.sign(x) * np.abs(x) ** .6   # a rounded box, not an ellipse: ribbons read flat
    V = S[:, None, :] + (w[:, None] * sq(cs))[:, :, None] * Y[:, None, :] + (t[:, None] * sq(sn))[:, :, None] * Z[:, None, :]
    Nn = (cs[None, :] * t[:, None])[:, :, None] * Y[:, None, :] + (sn[None, :] * w[:, None])[:, :, None] * Z[:, None, :]
    Nn /= np.linalg.norm(Nn, axis=2, keepdims=True)
    a = (np.arange(N - 1)[:, None] * ring + np.arange(ring)[None, :]).ravel(); b = (np.arange(N - 1)[:, None] * ring + (np.arange(ring) + 1)[None, :] % ring).ravel()
    F = np.vstack([np.c_[a, a + ring, b], np.c_[b, a + ring, b + ring]])
    cap0 = np.c_[np.full(ring, N * ring), (np.arange(ring) + 1) % ring, np.arange(ring)]; cap1 = np.c_[np.full(ring, N * ring + 1), (N - 1) * ring + np.arange(ring), (N - 1) * ring + (np.arange(ring) + 1) % ring]
    V = np.vstack([V.reshape(-1, 3), S[0], S[-1]]); Nn = np.vstack([Nn.reshape(-1, 3), -T[0], T[-1]]); F = np.vstack([F, cap0, cap1])
    res = np.r_[np.repeat(res, ring), res[0], res[-1]]
    return V, F, Nn, res, nums, ss


def runs(ss):
    i, out = 0, []
    while i < len(ss):
        j = i
        while j + 1 < len(ss) and ss[j + 1] == ss[i]: j += 1
        if ss[i]: out.append((i, j, ss[i]))
        i = j + 1
    return out


def ambient(v, n, solid, lo, h):
    """Ambient light at each vertex: how empty the space is along the normal, at four distances. solid: list of (sigma, blurred volume)."""
    total = np.zeros(len(v)); weight = 0
    for dist, vol in solid:
        q = (v + n * dist * 1.1 - lo) / h
        total += ni.map_coordinates(vol, q.T, order=1, mode='constant') / (dist ** .35); weight += 1 / (dist ** .35)
    occ = total / weight
    here = sum(ni.map_coordinates(vol, ((v - lo) / h).T, order=1, mode='constant') for _, vol in solid[:2]) / 2
    return np.clip(1 - occ * 1.5, 0, 1) * np.clip(1.28 - here * 1.25, .12, 1)


def b64(a): return base64.b64encode(a.tobytes()).decode()


def pack(v, f, n, ao, phi, res, s=0.01):
    idx = (f.astype(np.uint16) if len(v) < 65536 else f.astype(np.uint32)).ravel()
    return {'s': s, 'nv': len(v), 'P': b64(np.round(v / s).astype(np.int16)), 'N': b64(np.round(n * 127).astype(np.int8)), 'A': b64(np.round(ao * 255).astype(np.uint8)),
            'Q': b64(np.clip(np.round(phi * 20), -127, 127).astype(np.int8)), 'R': b64(res.astype(np.uint16)), 'I': b64(idx), 'i32': len(v) >= 65536}


def charges(atoms):
    """Formal charges on the charged atoms: Arg, Lys, Asp, Glu, and the phosphate oxygens of RNA."""
    X, q = [], []
    for a in atoms:
        c = CHG.get((a[1], a[0])) if len(a[1]) == 3 else (-.5 if a[0] in ('OP1', 'OP2', 'O1P', 'O2P') else None)
        if c: X.append(a[5:8]); q.append(c)
    return np.array(X, float), np.array(q)


def potential(v, X, q, cut=30.):
    """Screened potential at each vertex, kT/e. Far charges add nothing: exp(-30/7.85) is about 2 percent."""
    phi = np.zeros(len(v)); t = cKDTree(X)
    for i, near in enumerate(t.query_ball_point(v, cut)):
        if near:
            r = np.maximum(np.linalg.norm(X[near] - v[i], axis=1), 2.0); phi[i] = (LB * q[near] * np.exp(-r / LD) / r).sum()
    return phi


def volumes(P, h=0.9, pad=16):
    lo = P.min(0) - pad; dims = np.ceil((P.max(0) + pad - lo) / h).astype(int) + 1
    def solid_of(Q):
        vol = np.zeros(dims, np.float32); ix = ((Q - lo) / h).round().astype(int); np.add.at(vol, tuple(ix.T), 1.0)
        vol *= (4 / 3 * np.pi * 1.8 ** 3) / h ** 3   # voxels that hold an atom add up to the volume the atom fills
        return [(d, np.clip(ni.gaussian_filter(vol, d * .62 / h), 0, 1)) for d in (1.6, 3.2, 6.4, 12.)]
    return lo, h, solid_of


def chain_rec(name, sub, hel, sh, ch, lo, vh, solid, own, h, m, ring, surf=True, rib=True, Xq=None):
    tree = cKDTree(xyz(sub)); nums = sorted({a[3] for a in sub}); rid = {k: i for i, k in enumerate(nums)}; ar = np.array([rid[a[3]] for a in sub])
    rec = {'nums': nums, 'names': [next(a[1] for a in sub if a[3] == k) for k in nums]}; keep = None
    rec['at'] = {'s': 0.01, 'P': b64(np.round(xyz(sub) / 0.01).astype(np.int16)), 'E': ''.join(a[4][0] for a in sub), 'R': b64(ar.astype(np.uint16))}
    if surf:
        v, f, n = surface(sub, h)
        ao = ambient(v, n, own, lo, vh); shut = ambient(v, n, solid, lo, vh) / np.maximum(ao, .02)
        X, q = Xq if Xq else charges(sub)
        phi = potential(v, X, q) if len(X) else np.zeros(len(v))
        _, near = tree.query(v)
        rec['surface'] = pack(v, f, n, ao, phi, ar[near]); rec['surface']['C'] = b64(np.round(np.clip(shut, 0, 1) * 255).astype(np.uint8)); keep = (v, phi)
        print(name, ch, 'surface', len(v), 'verts', len(f), 'tris, phi', round(float(phi.min()), 2), round(float(phi.max()), 2))
    if rib:
        rv, rf, rn, rres, rnums, ss = ribbon(sub, hel, sh, ch, m, ring)
        rao = np.maximum(ambient(rv, rn, solid, lo, vh), .7)
        rec['ribbon'] = pack(rv, rf, rn, rao, np.zeros(len(rv)), rres); rec['ribbon']['C'] = b64(np.full(len(rv), 255, np.uint8)); rec['ss'] = ss.tolist()
        print(name, ch, 'ribbon', len(rv), 'verts, helix', int((ss == 1).sum()), 'strand', int((ss == 2).sum()))
    return rec, keep


def complex_mesh(name, chs, h=.45, frame=None, m=12, ring=18, rib=True):
    """frame: chains whose CA centre is the origin, the same centre as x3data.html."""
    at, hel, sh = read(name); at = [a for a in at if a[2] in chs]
    c = np.mean([a[5:8] for a in at if a[0] == 'CA' and a[2] in (frame or chs)], 0)
    atoms = [a[:5] + tuple(np.array(a[5:8]) - c) for a in at]
    lo, vh, solid_of = volumes(xyz(atoms)); solid = solid_of(xyz(atoms)); out, keep = {}, {}
    for ch in chs:
        sub = [a for a in atoms if a[2] == ch]
        out[ch], keep[ch] = chain_rec(name, sub, hel, sh, ch, lo, vh, solid, solid_of(xyz(sub)), h, m, ring, rib=rib)
    if len(chs) == 2:
        (va, pa), (vb, pb) = keep[chs[0]], keep[chs[1]]; d, j = cKDTree(vb).query(va); on = d < 1.6
        print(name, 'contact points', int(on.sum()), 'charge complementarity', round(float(-np.corrcoef(pa[on], pb[j[on]])[0, 1]), 3))
    return out


def read_cif(n):
    at, cols = [], []
    for ln in open(path(n), encoding='utf-8', errors='ignore'):
        if ln.startswith('_atom_site.'): cols.append(ln.strip().split('.', 1)[1]); continue
        if cols and ln.startswith(('ATOM', 'HETATM')):
            g = dict(zip(cols, ln.split()))
            if g.get('type_symbol') == 'H' or g.get('label_alt_id', '.') not in '.A': continue
            at.append((g['label_atom_id'].strip('"'), g['label_comp_id'], g['auth_asym_id'], int(g['auth_seq_id']), g['type_symbol'], float(g['Cartn_x']), float(g['Cartn_y']), float(g['Cartn_z'])))
    return at


def kabsch(A, B):
    """Rotation about the origin that takes A onto B."""
    U, _, Vt = np.linalg.svd(A.T @ B); d = np.sign(np.linalg.det(U @ Vt)); return (U @ np.diag([1, 1, d]) @ Vt).T


def virus():
    cif = read_cif('1A34-assembly1.cif'); order, by = [], {}
    for a in cif:
        if a[2] not in by: by[a[2]] = []; order.append(a[2])
        by[a[2]].append(a)
    prot = [k for k in order if any(a[0] == 'CA' and len(a[1]) == 3 for a in by[k])]; rna = [k for k in order if any(a[0] == 'P' for a in by[k])]
    c = np.mean([a[5:8] for k in prot for a in by[k] if a[0] == 'CA' and len(a[1]) == 3], 0)
    print('1A34 protein chains', len(prot), 'RNA chains', len(rna), 'first', prot[0], rna[:2], 'atoms', len(cif))
    shift = lambda L: [a[:5] + tuple(np.array(a[5:8]) - c) for a in L]
    p0 = shift(by[prot[0]]); r0, r1 = shift(by[rna[0]]), shift(by[rna[1]])
    allp = [a for k in prot for a in shift(by[k])]; allr = [a for k in rna for a in shift(by[k])]
    P = xyz(allp + allr); lo, vh, solid_of = volumes(P); solid = solid_of(P); own = solid_of(xyz(p0))
    _, hel, sh = read('1A34.pdb'); hel = [(p0[0][2], a, b) for ch, a, b in hel]; sh = [(p0[0][2], a, b) for ch, a, b in sh]
    Xq = charges(allp)
    coat, ck = chain_rec('1A34', p0, hel, sh, p0[0][2], lo, vh, solid, own, .6, 8, 12, Xq=Xq)
    dn, _ = cKDTree(xyz(allr)).query(ck[0]); dr = np.linalg.norm(ck[0], axis=1); print('coat potential: within 8 A of RNA', round(float(ck[1][dn < 8].mean()), 2), 'n', int((dn < 8).sum()), '; outer face', round(float(ck[1][dr > np.percentile(dr, 85)].mean()), 2), '; inner face', round(float(ck[1][dr < np.percentile(dr, 15)].mean()), 2))
    pieces = []
    for r in (r0, r1):
        rec, _ = chain_rec('1A34 RNA', r, [], [], r[0][2], lo, vh, solid, solid_of(xyz(r)), .45, 8, 12, rib=False); pieces.append(rec)
    ca0 = xyz([a for a in p0 if a[0] == 'CA']); ops = []
    for k in prot:
        cak = xyz([a for a in shift(by[k]) if a[0] == 'CA']); Rm = kabsch(ca0, cak); ops.append(np.round(Rm, 5).ravel().tolist())
        err = np.sqrt(((ca0 @ Rm.T - cak) ** 2).sum(1).mean())
        if err > .05: print('copy', k, 'rmsd', round(float(err), 3))
    # every RNA piece repeats pieces 0 and 1 under the same 60 rotations; test that before a scene relies on it
    worst = 0
    for i in range(len(ops)):
        Rm = np.array(ops[i]).reshape(3, 3)
        for j in (0, 1):
            a = xyz([x for x in (r0, r1)[j] if x[0] == 'P']); b = xyz([x for x in shift(by[rna[2 * i + j]]) if x[0] == 'P'])
            if len(a) == len(b): worst = max(worst, float(np.sqrt(((a @ Rm.T - b) ** 2).sum(1).mean())))
    print('RNA under coat rotations, worst rmsd', round(worst, 3))
    arm = [(a[3], a[1]) for a in p0 if a[0] == 'CA'][:15]; print('first 15 residues', arm, 'Arg and Lys', sum(r in ('ARG', 'LYS') for _, r in arm))
    return {'coat': coat, 'rna': pieces, 'ops': ops}


def ligand():
    """Benzene of 181L as atoms, in the frame of x3data.html (centre of the CA atoms of chain A)."""
    at, _, _ = read('181L.pdb'); c = np.mean([a[5:8] for a in at if a[0] == 'CA' and a[2] == 'A'], 0); out = []
    for ln in open(path('181L.pdb'), errors='ignore'):
        if ln.startswith('HETATM') and ln[17:20] == 'BNZ' and ln[22:26].strip() == first_bnz(): out.extend(np.round(np.array([float(ln[30:38]), float(ln[38:46]), float(ln[46:54])]) - c, 3).tolist())
    return out


def first_bnz():
    for ln in open(path('181L.pdb'), errors='ignore'):
        if ln.startswith('HETATM') and ln[17:20] == 'BNZ': return ln[22:26].strip()


M = {'mel': complex_mesh('1MEL.pdb', ['A', 'L']),
     'vfb': complex_mesh('1VFB.pdb', ['A', 'B', 'C'], .8, ['B', 'C'], 6, 10),
     'krl': complex_mesh('4KRL.pdb', ['A', 'B'], .55, None, 8, 12),
     'z0x': complex_mesh('7Z0X.pdb', ['H', 'L', 'R'], .85, ['H', 'R'], 6, 10),
     'l99a': complex_mesh('181L.pdb', ['A']),
     'igg': complex_mesh('1IGT.pdb', ['A', 'B', 'C', 'D'], 1.5, None, 6, 10, rib=False),
     'stmv': virus()}
M['l99a']['lig'] = ligand()
txt = '<script>window.X3M=' + json.dumps(M, separators=(',', ':')) + ';</script>\n'
open(os.path.join(OL, 'x3mesh.html'), 'w', encoding='utf-8').write(txt)
print('x3mesh.html', round(len(txt) / 1e6, 2), 'MB')
