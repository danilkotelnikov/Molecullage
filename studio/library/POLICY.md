# Grounded source policy of the Studio

Version 2, 2026-11-01. It joins two earlier policies of the owner:
- the source policy of 2026-10-19: read every source in full text; an abstract, a title or a snippet is not evidence; a work whose full text cannot be had is ungrounded;
- the licence policy of 2026-10-30: the licence follows the asset; an asset with no licence, or a licence that forbids the use, is blocked.

It is a first version and the owner may change it.

## The rules

1. **Models first.** A real object comes from an existing 3D model of it (maker CAD, a public model library, or a structure from the PDB). Nobody draws it from dimensions.
2. **Dimensions only check.** A data sheet gives numbers to check a model against. It is never the source of a shape.
3. **Ground every claim.** A number, an arrangement or a fact in a scene may rest only on a source read in full text, or on a primary data file that was read. The entry says `grounding`:
   - `full-text`: the whole text was read, from where and on what date (`readFrom`, `read`);
   - `primary-data`: the data file itself was read (a structure);
   - `abstract-only`: only the abstract or an excerpt was read. Its numbers are `claimedValues` and no scene may use them;
   - `not-obtained`: no full text could be had. Ungrounded;
   - `n/a`: nothing to read (a model file, a lighting image).
4. **Check the file you read.** A full text counts only if its body matches its title and authors. (One open archive file held a different paper under the right cover page.)
5. **Every real object has an entry** in `references.json` with its source, licence, status and check date. A test fails when a job object cites a PDB structure or a DOI with no grounded entry.
6. **An unknown licence is a candidate only.** the owner may approve one download by name, to inspect the shape. The file is then marked `useBlocked` and no scene may use it until its terms are read. A non-commercial or no-derivatives licence is blocked for a pitch.
7. **Downloads need the owner's yes,** per file, with its name, source and size. An account or a login is the owner's to make. The engine never creates accounts or enters passwords. A key or token is read from an environment variable named in `access.json`. It is never written to a file.
8. **Live shapes are low-poly and accurate.** The live page uses a light mesh. It must stay within a stated distance of the full source surface, and the test records the distance. The full source is used at render time.
9. **Papers carry a DOI** checked against PubMed or Crossref.
10. **An illustration is marked as one.** A count, a pose or a size that is not measured is stated as an illustration on the slide.

## Where things live

| What | File | Made by |
|---|---|---|
| Sources: every place we can get assets, models, vectors, structures, papers, schematics, tools | `sources.json` | `node tools/build-sources.mjs` from the research tables R1, R2, R4, R5, R6 and `sources.extra.json` |
| References: the items chosen or considered for a job, with licence, status and grounding | `references.json` | by hand, or `--add` from a live search |
| Files in the library, with size and checksum | `manifest.json` | by hand; `node tools/library.mjs fetch` downloads and checks (an entry with `manual` has no fetch link) |
| Sources that need a sign-in or a key, and whether a script can use them | `access.json` | by hand; `node tools/access.mjs` prints the queue |

## How to search

```
node tools/search.mjs pcr tube                          # offline: sources and references, ranked
node tools/search.mjs 3d models --no-login --usable     # filters: --kind --class --status --grounded --usable --no-login
node tools/search.mjs gold antibody --live pubmed,sketchfab,polyhaven,rcsb   # live: lists candidates, downloads nothing
node tools/search.mjs gold antibody --live pubmed --add # also records the hits as candidates (not read yet)
```

A live hit is always a candidate with `grounding: not-obtained`. To use it, someone reads its full text or file, and the entry changes.

## Statuses

candidate (found, not checked), needs-login (only an account can download it), approved (the owner said yes), fetched (in the library with size and checksum), verified (read and checked, nothing to download), rejected (not usable).

## Checks that run

```
node --test tools/references.test.mjs tools/sources.test.mjs tools/search.test.mjs tools/library.test.mjs tools/access.test.mjs
```
