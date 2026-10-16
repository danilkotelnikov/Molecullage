# ChimeraX

Pinned and tested: ChimeraX 1.10 (the tests ran on 1.10.dev202504170618, Windows 11). Other releases should work; test them before you rely on them.
Set `STRUCTFIG_CHIMERAX` to the executable, or let `struct/run_cx.py` look under `C:/Program Files`, `/Applications` and `/opt`.

## Run it through the wrapper

```
py -3 -B struct/run_cx.py struct/render.py complex name=mel pdb=data/pdb/1MEL.pdb binder=A antigen=L drop=B,M cdr=1mel_vhh
py -3 -B struct/trim.py
```

- A ChimeraX window opens and closes. Do not use `--offscreen`: it has no OpenGL on Windows.
- One run at a time. The wrapper takes a lock folder (`struct/.cx.lock`), waits up to 25 minutes for it, and kills a run after 10 minutes.
- Words with `=` are parameters. Chain lists have no leading slash (`drop=B,M`). Paths use forward slashes.
- `--dry-run` prints the command and runs nothing.
- If the script fails, `struct/last_error_render.txt` holds the traceback and the wrapper prints its tail.

## Groups (`struct/render.py`)

| Group | What it draws | Layers |
|---|---|---|
| `complex` | binder and antigen, antigen left, loop 3 toward the antigen; epitope as sticks | full, ag, ab, inset |
| `poses` | the binder moved as a rigid body to two decoy poses, plus the three overlaid | native, decoy1, decoy2, ens |
| `series` | C-alpha spheres on the straight path from noise to the chain | t0 to t4 |
| `anatomy` | one domain or Fv, loops up | main |
| `chains` | every chain coloured by assignment | full |

Parameters can also sit in `structfig.json` under `structures`; words on the command line win.
Loop spans are chosen by sequence index: `cdr=h1:26-32,h2:52-57,h3:99-122`, or a preset from `struct/style.py`. `contacts=<contacts.csv>` adds sticks for every contact residue, dashed hydrogen bonds and anchors for the inset.

## Style, and why

- `lighting flat`, specular 0, no depth cue, silhouettes (width from the token file, 3.4 px), white background, orthographic camera, `windowsize 900 675`, saved at 2400 x 1800 with a transparent background and supersample 3.
- Flat lighting multiplies colours by about 1.158. `style.comp()` divides the palette by it. Check: `palette/sample_palette.py art/<layer>.png` returns the palette hex values to within one level.
- Lighting resets when a model is opened, so `save_layer` sets it again before every save.
- Assigning coordinates in place does not redraw. The series group writes a PDB per frame and reopens it.
- Read residue names and numbers before `close`: the objects die with the model.

## Anchors

`<name>.anchors.json` holds pixel positions on the full canvas: loop midpoints (`cdr_h1`), the epitope centre, the antigen and binder centres; the inset file adds `ca_<chain>_<number>` for every contact residue and `hbv_`, `hbl_` for the two atoms of each hydrogen bond. `trim.py` crops all layers of a group to one box, so layers stack, and converts anchors to fractions of the cropped image. In a page, `f.image({...}).pt('cdr_h3')` returns the point in millimetres. Look at the PNG: a leader must end on the loop it names.

## Contacts

`struct/contacts.py` uses PDBe Arpeggio from `.venv-tools` when it is there:

```
py -3 -m venv .venv-tools
.venv-tools/Scripts/pip install pdbe-arpeggio openbabel-wheel      # bin/pip on Linux and macOS
py -3 -I struct/contacts.py data/pdb/1MEL.pdb --binder A --antigen L --out examples/contacts/data
```

Hydrogens come from ChimeraX (`addh hbond true`, `struct/contacts_cx.py`). Open Babel's default hydrogens gave no inter-chain hydrogen bond for the example entry. Without Arpeggio the script falls back to ChimeraX `hbonds` and `contacts`; types are then "hbond" or "no specific type". The tool and its version go to `contacts.meta.json`; name them in the figure notes.
