# Using ChimeraX for flat renders

Pinned and tested: ChimeraX 1.10 (tried on 1.10.dev202504170618, Windows 11). Other releases should work; test them before you rely on them.
Set `MOLECULLAGE_CHIMERAX` to the executable, or let `struct/run_cx.py` find it in a ChimeraX folder under `C:/Program Files`, `/Applications`, `/usr/lib` or `/opt`.

## Run it through the wrapper

```
py -3 -B struct/run_cx.py struct/render.py complex name=mel pdb=data/pdb/1MEL.pdb binder=A antigen=L drop=B,M cdr=1mel_vhh
py -3 -B struct/trim.py
```

- A ChimeraX window opens and closes. Do not use `--offscreen`: on Windows it has no OpenGL, and the render fails.
- Run one render at a time. The wrapper takes a lock folder (`struct/.cx.lock`) and waits up to 25 minutes for it. It stops a run after 10 minutes, because a script error can leave ChimeraX hanging with its window open.
- Words with `=` are parameters. Write chain lists without a leading slash (`drop=B,M`): Git Bash on Windows rewrites `/B,M` as a Windows path. Write paths with forward slashes, because ChimeraX reads a backslash in a script argument as an escape.
- `--dry-run` prints the command and runs nothing.
- If the script fails, `struct/last_error_render.txt` holds the traceback, and the wrapper prints its last lines.

## Render groups (`struct/render.py`)

| Group | What it draws | Layers |
|---|---|---|
| `complex` | binder and antigen, antigen left, loop 3 toward the antigen; epitope as sticks | full, ag, ab, inset |
| `poses` | the binder moved as a rigid body to two decoy poses, plus the three overlaid | native, decoy1, decoy2, ens |
| `series` | C-alpha spheres on the straight path from noise to the chain | t0 to t4 |
| `anatomy` | one domain or Fv, loops up | main |
| `chains` | every chain coloured by assignment | full |

Parameters can also sit in `molecullage.json` under `structures`; words on the command line win.
Loop spans are chosen by sequence index: `cdr=h1:26-32,h2:52-57,h3:99-122`, or a preset from `struct/style.py`. `contacts=<contacts.csv>` adds sticks for every contact residue, dashed hydrogen bonds, and anchors for the inset.

## The style, and the reason for each setting

- `lighting flat`, specular 0, no depth cue, silhouettes (width from the token file, 3.4 px), white background, orthographic camera, `windowsize 900 675`, saved at 2400 x 1800 with a transparent background and supersample 3. Flat colour keeps every chain the same colour as its key and its text label.
- Flat lighting multiplies colours by about 1.158, so the pixels come out lighter than the palette. `style.comp()` divides the palette by this factor before it goes to ChimeraX. To check, run `palette/sample_palette.py art/<layer>.png`: it returns the palette hex values to within one level.
- Lighting resets when a model is opened, so `save_layer` sets it again before every save. Without this, later layers of a group come out shaded.
- Assigning coordinates in place does not redraw the model. The series group therefore writes a PDB file per frame and reopens it.
- Read residue names and numbers before `close`: the objects are gone once the model is closed.

## Anchors

`<name>.anchors.json` holds pixel positions on the full canvas: loop midpoints (`cdr_h1`), the epitope centre, and the antigen and binder centres. The inset file adds `ca_<chain>_<number>` for every contact residue, and `hbv_` and `hbl_` for the two atoms of each hydrogen bond. `trim.py` crops all layers of a group to one box, so that the layers still stack, and converts the anchors to fractions of the cropped image. In a page, `f.image({...}).pt('cdr_h3')` returns the point in millimetres. Look at the PNG afterwards: a leader must end on the loop it names, and a wrong anchor puts the label on the wrong loop without any error.

## Contacts

`struct/contacts.py` uses PDBe Arpeggio from `.venv-tools` when it is there:

```
py -3 -m venv .venv-tools
.venv-tools/Scripts/pip install pdbe-arpeggio openbabel-wheel      # bin/pip on Linux and macOS
py -3 -I struct/contacts.py data/pdb/1MEL.pdb --binder A --antigen L --out examples/contacts/data
```

Hydrogens come from ChimeraX (`addh hbond true`, `struct/contacts_cx.py`). With Open Babel's default hydrogens, Arpeggio found no inter-chain hydrogen bond in the example entry. Without Arpeggio, the script falls back to the ChimeraX commands `hbonds` and `contacts`; the types are then only "hbond" or "no specific type". The tool and its version go to `contacts.meta.json`; name them in the figure notes.
