# Templates

`list_templates` returns this list. `new_figure(template, key, dir)` copies the page and a notes stub; data paths in the copy point into the repository's `examples/`, so point them at your own data files.

| Template | Shows | Data it reads | Example entry |
|---|---|---|---|
| `pipeline` | a screening pipeline in three columns: stage strips (coloured bars that name the stages), tool blocks, pills (rounded labels for data) with placeholder sizes, numbered badges, an enlarged block with two zoom lines, a key | placeholders in the page; one render from `art/` | 1MEL (picture only) |
| `sequence` | a letter per cell, tracks for loops and observed residues, three nested sets, gap kinds in the key | `data.js` made by `examples/sequence/make_data.py` | 1MEL chain A |
| `contacts` | typed contact tiles, split tiles, star for backbone, close-up with leaders to real residues | `contacts_layer.svg` and `.js` from `plots/contact_tiles.py`, `contacts.csv` from `struct/contacts.py`, a render with `contacts=` | 1MEL (1VFB table also made) |
| `series` | noise to structure, five frames, t written under each | renders of group `series` | 1MEL chain A |
| `dates` | entries by kind of date against a cut-off, with a shared time axis | `data.js` from the RCSB records | 1VFB, 1MEL, 4KRL, 7Z0X |
| `plots2` | two matplotlib panels under kit labels at shared millimetre boxes | an SVG layer and `.js` from `plots/example_plots2.py` | 1MEL, 4KRL |
| `structures` | separate panels for separate objects, one colour code | renders of groups `complex` and `chains` | 1MEL, 7Z0X, 1IGT |
| `palette` | every family, dark tone, contrast, colour-vision matrix | the token file of the build | none |

Each template's header comment says what to replace. The drawing rules that each one shows are in `grammar.md`: pipeline (2, 3, 6), sequence (5, 10), contacts (13, 14, 15), series (7, 11), dates (9), plots2 (16, 18), structures (1, 12), palette (22).

Data rules for any template: public entries only unless the project says otherwise; record the id, chains, deposit date and the date checked in the notes; name the tool and version of every computed table; state the claim boundary in one line at the foot of the page (`f.boundary()`).
