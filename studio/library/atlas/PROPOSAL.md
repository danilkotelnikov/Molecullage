# Software atlas and clean-room feature package: HoH proposal

Version 1, 2026-11-02. Prompt D-20261102 (50 of the day) from the owner. The cycle is the Harness of Harness cycle (`~/.dsh/local-plugins/dsh-hoh/docs/policy.md`). Its tools `hoh_propose`, `hoh_freeze` and `hoh_gate` run in the DeepSeek harness and are not in this session, so this run applies the same cycle by hand: a proposal, a frozen file list, a fresh reviewer who did not build the work, and a gate the reviewer fills in from checks it ran itself.

## Goal

Make one indexed atlas of the software that makes motion, graphics, 3D design and vector images. Then roll its capabilities up into a list of features, each written in our own words. This is the base for the clean-room feature package of the Studio. Also find out which open models can make 3D models and SVG, and whether they can run on the CPU server.

## Hypothesis

A sweep that starts from public comparison lists, writes one structured entry per product, and checks every entry against a shape test, reaches near-complete coverage of the products that matter. It also shows which capabilities nearly every product has (the core) and which belong to one product only (the extras).

## Boundary (what the run does not do)

- No download, no install, no account, no key. The sweep only reads public pages.
- No code or text of a product is copied. Every `does` field is our own words, 45 words at most.
- No decompiling and no probing of closed programs. "Studyable" records what a person may read: public manuals, papers, open-source code.
- No product name goes into the engine code or product text (design section 7). The atlas is internal research.
- Nothing is pushed. Nothing is run on the CPU server.

## "All" means this

A sweep cannot reach every program ever made. Each domain file records:
- `enumeration.frames`: the public lists the sweep started from (for example the Wikipedia comparison pages);
- `enumeration.excluded`: each product that was seen and left out, with the reason (discontinued, no public documentation, a near-duplicate).
So the gaps are visible and a later pass can fill them.

## Steps and acceptance checks

| # | Step | Acceptance check |
|---|---|---|
| 1 | Write the shape rules and the test first | `node --test tools/atlas.test.mjs` runs; the five unit tests pass and the real-data test fails until the data exists |
| 2 | Eight research agents each fill one domain file (and one writes the clean-room method) | `node tools/atlas.mjs check` prints `atlas ok` |
| 3 | Roll the capabilities up into features; print the report | `node tools/atlas.mjs report` shows every domain with at least 12 entries (models: at least 8) |
| 4 | Freeze the files | the list of paths and their hashes is stored in `library/atlas/FREEZE.json` |
| 5 | A fresh reviewer checks a sample against the cited pages | the reviewer samples 6 capabilities per domain, opens each source, and reports how many the source supports |
| 6 | Fix what the reviewer finds; freeze again | at least 90% of the sample is supported, and every unsupported entry is fixed or removed |
| 7 | Record the evidence in Cammut and read it back | a recall returns the note |

## Probes

- Recall probe: Blender, Rhino, Cinema 4D, Maya, DaVinci Resolve, Photoshop, Illustrator and Houdini are each present in their domain.
- Honesty probe: no entry has `basis: search-excerpt` for more than a third of its capabilities.
- Overlap probe: at least one feature slug is shared by three or more products (the core exists).

## Rules for the writers

- Start from the public lists; record what was searched.
- Cite the page that shows each capability. Prefer the official manual. A search excerpt is allowed but marked `search-excerpt`.
- Never copy a sentence from a manual. Say what the function does in a short plain sentence.
- Mark the licence of the product, and what may be studied (`rea.studyable`).
- A fact you are unsure of is marked `unknown`. A guess is never written as a fact.
