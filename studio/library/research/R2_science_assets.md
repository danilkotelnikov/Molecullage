<!-- version: w03 | date: 2026-10-30 -->
# R2 — Science asset libraries for the Molecullage prefetch catalogue

Worker: research subagent 1a4fac95. Date: 2026-10-30. No project code was edited. No Cammut retain.

## How to read the evidence marks

- **V** = I fetched the URL in this session and saw the licence text or the fact myself.
- **S** = only a web-search summary said it. The links were Google redirects. Treat as unverified until a direct fetch.
- **U** = unverified, from memory. The fetch failed (403, 404, SSL) or I did not try.
- Probe logs (raw fetched snippets): `<local-path>` … `outF.txt` (outA–E are inside `.system_generated\steps\27\output.txt`).
- Firecrawl had no credits (HTTP 402). Exa results were noisy. Most checks used direct `Invoke-WebRequest` fetches.

Quality tier: **C4D-grade** = can sit next to a studio render without fixes. **good** = clean, needs palette or lighting match. **draft** = idea only, replace before publication.

---

## A. Vector and icon libraries

| Name | Licence (exact) | URL | Formats | Bulk / API | Tier | Best Molecullage use | Ev. |
|---|---|---|---|---|---|---|---|
| Bioicons | Per icon: CC0, CC-BY (3.0/4.0), MIT, CC BY-SA, BSD. README: "Please always cite the individual icons and their respective license." Some Servier icons are mirrored as CC-BY 3.0. | https://bioicons.com/ · https://github.com/duerrsimon/bioicons | SVG | `git clone` of the repo; licence lives per icon folder | good | Lab objects, cells, organisms in schematic panels | V |
| Servier Medical Art (SMART) | CC BY 4.0. Site: "Every image is free to use under the Creative Commons Attribution 4.0 license". Credit line given on site. | https://smart.servier.com/ | SVG, PNG, PPTX kits | Per image or slide-kit download; no public API found | good | Organs, tissues, cell types, medical scenes | V |
| NIAID NIH BioArt Source | Mostly Public Domain; some entries CC-BY. Check each entry. | https://bioart.niaid.nih.gov/ | SVG, PNG, AI, EPS | Per entry download; no API found | good–C4D (many are pro illustrations) | Viruses, immune cells, pathogens, lab kit | S (site JS-rendered, licence text not seen) |
| SciDraw | CC-BY, each drawing with a DOI (site meta: "CC-BY licensed with DOI"). CC0 option per search. | https://scidraw.io/ | SVG, PNG | Per drawing; no API found | good | Neuroscience: rodents, brains, rigs, behaviour set-ups | V (CC-BY+DOI) / S (CC0) |
| Reactome Icon Library | CC BY 4.0 ("distributed under the terms of the Creative Commons Attribution 4.0 International License"). | https://reactome.org/icon-lib · https://github.com/reactome/reactome_illustrations | SVG, PNG, EMF; EHLD diagrams | GitHub repo (SVG exported from Figma) | good | Pathway glyphs: receptors, organelles, membranes, compounds | V |
| PhyloPic | Per image: CC0, PDM, CC BY, CC BY-SA, CC BY-NC. API returns licence per image. | https://www.phylopic.org/ · https://api.phylopic.org/ | SVG, PNG silhouettes | REST API (was 503 during my probe) | good | Organism silhouettes on trees, sample-origin keys | S |
| Health Icons | CC0 ("available in the public domain (CC0)"). | https://healthicons.org/ · https://github.com/resolvetosavelives/healthicons | SVG (outline, filled; 24/48 px) | "Download all" + GitHub | good (flat UI style) | Clinical pictograms, small inline symbols | V |
| DBCLS TogoTV pictures | CC BY 4.0, credit "© DBCLS TogoTV / CC-BY-4.0". | https://togotv.dbcls.jp/en/pics.html | PNG, SVG?, PPTX? | Per picture; bulk unknown | good (cute style; check fit) | Lab and omics workflow pictograms | S |
| Openclipart | CC0 1.0 ("All Clipart are Released into the Public Domain … Creative Commons Zero 1.0"). | https://openclipart.org/share | SVG | Site download; no API checked | draft | Rare generic objects only | V |
| OpenMoji | CC BY-SA 4.0 (share-alike: derived figure may need the same licence). | https://www.openmoji.org/ | SVG, PNG | GitHub/npm | draft | Avoid in papers; ok for internal slides | V |
| Noun Project | Per-icon terms in its Terms of Use §3; free use needs attribution, paid plan removes it. Redistribution of icons is forbidden. | https://thenounproject.com/legal/ | SVG, PNG | API needs key and paid tier | good | Do not prefetch. Use only by hand with recorded credit | V (terms page) / U (exact free-tier wording) |
| RCSB PDB-101 Molecule of the Month art (Goodsell) | CC-BY-4.0; credit "David S. Goodsell and the RCSB PDB". | https://www.rcsb.org/pages/usage-policy | PNG/TIFF | Per article | C4D-grade (Goodsell watercolours) | Mesoscale cell interiors, molecular portraits | V |

Notes for A:
- Bioicons repackages third-party art. Keep the original author and licence from each icon, not "Bioicons".
- Reject CC BY-NC and CC BY-ND at the licence gate. Flag CC BY-SA for review.

---

## B. 3D model, material and HDRI libraries

| Name | Licence (exact) | URL | Formats | Bulk / API | Tier | Best Molecullage use | Ev. |
|---|---|---|---|---|---|---|---|
| Poly Haven | CC0 ("Our assets are all licensed as CC0"). | https://polyhaven.com/license | HDRI (EXR/HDR), PBR textures, models (glTF/blend/FBX) | Public API (api.polyhaven.com) | C4D-grade | Studio HDRIs, lab-surface materials, props | V (licence) / U (API) |
| ambientCG | CC0 1.0 Universal, also for preview renders. | https://ambientcg.com/license | PBR materials, HDRI, some models | Short URLs `ambientcg.com/a/<id>`; API | C4D-grade | Glass, metal, plastic, agar, bench materials | V (licence) / U (API) |
| Kenney | CC0 ("all game assets … public domain licensed (CC0)"). | https://kenney.nl/support | glTF, FBX, OBJ | Asset-pack zips | draft–good (low-poly game style) | Stylised compute/servers, simple icons in 3D | V |
| BlenderKit (Blendkit) | Two licences: Royalty Free (no resale as asset) and CC0. "Everything you download is available for commercial use." | https://www.blenderkit.com/docs/licenses/ | .blend via add-on | Blender add-on; account; free vs paid tiers | good–C4D-grade | Lab devices, glassware, furniture inside Blender | V (licences) / U (free-tier limits) |
| Sketchfab | Per model CC licences (CC0, BY, BY-SA, BY-NC…). "over 1 million free models, available under Creative Commons licenses." | https://sketchfab.com/developers/download-api | glTF/GLB, USDZ (zip) | Data API v3 search (`downloadable=true&licenses=cc0,by`), Download API needs OAuth user token; links expire | good–C4D-grade (varies a lot) | Animals, organs, instruments; hand-pick and lock version | V (API exists) / S (OAuth, filters, expiry) |
| NIH 3D (3d.nih.gov) | Per model licence; many CC BY 4.0 or public domain. | https://3d.nih.gov/ | STL, GLB, X3D, WRL | Per entry; "Quick Submit" from PDB/AlphaFold/PubChem | good | Anatomy, cells, lab kit, printable molecules | S |
| Smithsonian 3D (Voyager) | CC0 for Open Access items. | https://3d.si.edu/ | GLB (draco), OBJ, USDZ, STL | Per item; HF mirror `suvadityamuk/smithsonian-open-access-3d` | good–C4D-grade (scans) | Specimens, fossils, skulls, historic instruments | S (site 403 to script) |
| Allen Cell Explorer / Allen Institute | Terms of use: "must be for research or other noncommercial purposes unless otherwise set forth". Academic publication allowed with citation. | https://www.allencell.org/terms-of-use.html | OME-TIFF, meshes, Simularium files | Downloads, Simularium viewer | C4D-grade data | Real 3D hiPSC cell geometry for papers only | V |
| cellPACK (mesoscope) | MIT (repo). Recipes/models may carry their own CC licences. | https://github.com/mesoscope/cellpack | Python, recipes JSON, packed outputs | `pip install cellpack`; GitHub | C4D-grade with good render | Packed virions, cytoplasm crowding | V (MIT) / S (pip, model licences) |
| Mesoscope.io / cellVIEW / CellPAINT 2.0 | Licence not seen. CellPAINT-2.0 is released and can import new molecules. | https://ccsb.scripps.edu/cellpaint/ | Unity app, PNG export | App download | good (Goodsell style) | 2D mesoscale paintings; idea panels | V (exists) / U (licence; mesoscope.io SSL error; cellVIEW page 404) |
| BodyParts3D (DBCLS) | "License CC BY" on the archive page. Version not shown; older notes say CC BY-SA 2.1 JP. | https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html | OBJ | Archive download | good (anatomy meshes) | Human organs and bones in panels | V ("CC BY") / U (version) |
| Z-Anatomy | CC BY-SA 4.0 ("This work is licensed under a Creative Commons Attribution-ShareAlike 4.0"). Models in .blend and FBX. | https://github.com/LluisV/Z-Anatomy | .blend, FBX | Download links in README | C4D-grade (full atlas in Blender) | Organ cut-aways; mark share-alike | V |
| Objaverse | Dataset: ODC-BY. Each object keeps its own Sketchfab licence (mixed). | https://huggingface.co/datasets/allenai/objaverse | GLB | HF dataset, per-object GLB URLs | draft–good | Filter to CC0/CC-BY only; use as search pool | V (ODC-BY) / U (per-object mix detail) |
| Printables / Thingiverse | Per model; many CC BY-NC. | https://www.printables.com/ · https://www.thingiverse.com/ | STL, 3MF | Scraping blocked (403) | draft | Lab adapters only, by hand | U |
| GrabCAD | Own terms; models often not open-licensed for redistribution. | https://grabcad.com/terms | STEP, SLDPRT | 403 to script | good CAD | Do not prefetch. Reference only | U |
| Open3DModel | Not found. | — | — | — | — | Drop | U |

Notes for B:
- Hard stop: Allen Institute content is non-commercial. Keep it out of pitch or product material.
- Share-alike (Z-Anatomy, OpenMoji, some BodyParts3D) may force the figure licence. Gate them as `needs_review`.

---

## C. Molecular and computational sources and engines

| Name | Licence (exact) | URL | Formats | Bulk / API | Tier | Best Molecullage use | Ev. |
|---|---|---|---|---|---|---|---|
| RCSB PDB / wwPDB | Data CC0 1.0. RCSB software MIT or Apache 2.0. Structure images same as data. | https://www.rcsb.org/pages/usage-policy | mmCIF, BinaryCIF, PDB | REST + GraphQL + file server | data | All experimental structures | V |
| PDB-IHM (integrative) | wwPDB-managed archive; licence not seen on page (likely wwPDB CC0). | https://pdb-ihm.org/ | IHM mmCIF | Search + download | data | Multi-scale assemblies | V (exists) / U (licence) |
| AlphaFold DB | "Data is available for academic and commercial use, under a CC-BY-4.0 licence." | https://alphafold.ebi.ac.uk/ | mmCIF, PDB, PAE JSON | API + FTP + GCS bulk | data | Predicted single chains, pLDDT colouring | V |
| ESM Metagenomic Atlas | CC BY 4.0 (per search). Bulk via `scripts/atlas/README.md`. DOI 10.1126/science.ade2574. | https://esmatlas.com/ · https://github.com/facebookresearch/esm | PDB, Foldseek DB, embeddings | API + tarballs (TB scale) | data | Dark-proteome examples | S (licence) / V (API links in README) |
| EMDB | CC0 1.0 (wwPDB policy). | https://www.ebi.ac.uk/emdb/documentation/policies | MRC/CCP4 maps | FTP + API | data | Density surfaces in ChimeraX/Blender | S |
| PubChem 3D conformers | US gov data; downloads page exists. Licence wording not captured. | https://pubchem.ncbi.nlm.nih.gov/docs/downloads | SDF (3D), JSON | PUG-REST + FTP | data | Ligands, small molecules | V (page) / U (licence) |
| Molecular Nodes (Brady Johnston) | GPL-3.0. Install in Blender 5.2: Edit › Preferences › Get Extensions. | https://github.com/BradyAJohnston/MolecularNodes | Blender add-on; reads PDB/mmCIF/MD/EM | Blender extension + PyPI | C4D-grade | Cinematic molecular renders and films | V |
| Mol* (molstar) | MIT. Has `packages/plugin/headless` for "Node capture". | https://github.com/molstar/molstar | Web viewer, PNG capture | npm `molstar`; `mvs-render` CLI | good | Fast headless previews, web figures | V (MIT, headless pkg) / S (`mvs-render` usage) |
| MolViewSpec (MVS) | MIT. "A generic mechanism for describing views used in molecular visualizations." | https://github.com/molstar/mol-view-spec | `.mvsj`, `.mvsx` | Python + TS builders | — | Store each molecular view as a reproducible JSON scene | V |
| UCSF ChimeraX | Non-commercial at no cost; "COMMERCIAL USE OF UCSF CHIMERAX IS COVERED BY A SEPARATE WRITTEN LICENSE AGREEMENT." | https://www.cgl.ucsf.edu/chimerax/docs/licensing.html | PNG, GLB, STL export | Scriptable (Python, nogui) | C4D-grade (flat journal style) | Current flat renders; check licence for pitch work | V |
| PyMOL open-source | Permissive notice: use, copy, modify, distribute for any purpose, keep copyright notice. | https://github.com/schrodinger/pymol-open-source | PNG, session | Python | good | Fallback renderer | V |
| VMD | Non-commercial; "Commercial use … REQUIRES A COMMERCIAL LICENSE." | https://www.ks.uiuc.edu/Research/vmd/current/LICENSE.html | Tachyon/OptiX renders | Tcl/Python | good | MD trajectories; academic only | V |
| OVITO Basic | "free of charge under an open source license" incl. Python package. Exact licence name not captured. | https://www.ovito.org/about/ovito-licenses/ | PNG, video | Python module | good | Materials/particle simulations | V (open source) / U (licence name) |
| Illustrate (Goodsell) | Licence not captured. Cite Goodsell, Autin, Olson (2019) Structure 27:1716–1720. | https://ccsb.scripps.edu/illustrate/ | PNG/PNM | Fortran CLI, web server | C4D-grade (Goodsell style) | Non-photoreal molecule panels | V (cite) / U (licence) |
| Scientific colour maps (Crameri) | Zenodo record v8.0.1 (2023-10-05). Licence text not captured; widely cited as MIT. | https://zenodo.org/records/8409685 · https://www.fabiocrameri.ch/colourmaps/ | CPT, Python, JSON, etc. | Zenodo zip | — | All continuous colour scales | V (record) / U (licence) |
| matplotlib | PSF-based, BSD-compatible. | https://matplotlib.org/stable/project/license.html | SVG/PDF | pip | good | Data panels | V |
| plotly.js | MIT. | https://github.com/plotly/plotly.js | SVG/PNG | npm | good | Interactive previews | V |
| Vega-Lite | BSD-3-Clause (UW IDL). | https://github.com/vega/vega-lite | SVG | npm | good | Declarative data panels in HTML pages | V |

---

## D. Graph, schematic layout and vectorisation engines

| Name | Licence (exact) | URL | Speed / determinism | Tier | Best Molecullage use | Ev. |
|---|---|---|---|---|---|---|
| ELK.js | Eclipse Public License 2.0 (secondary GPL-3.0+). | https://github.com/kieler/elkjs | Deterministic for fixed input and options (U); layered layout with ports | good | Pipeline and pathway layouts with orthogonal edges | V (licence) |
| Dagre | MIT. | https://github.com/dagrejs/dagre | Fast, deterministic (U); fewer edge controls | good | Simple DAGs | V (licence) |
| Graphviz WASM (@hpcc-js/wasm) | Wrapper Apache 2.0. Graphviz core itself EPL (U; fetch 404). | https://github.com/hpcc-systems/hpcc-js-wasm | Deterministic dot layout (U); runs in Node and Chrome | good | Trees, ontologies | V (wrapper) |
| d3-force | ISC. | https://github.com/d3/d3-force | Non-deterministic unless seeded and tick count fixed (U) | good | Networks (PPI), then freeze positions | V (licence) |
| Penrose (CMU) | MIT. | https://github.com/penrose/penrose | Optimiser-based; seed controls variation (U) | good | Math/set diagrams from notation | V (licence) |
| TikZJax | Licence not captured. Compiles TeX to WebAssembly and turns TikZ into SVG. | https://github.com/kisonecat/tikzjax · https://tikzjax.com/ | Deterministic (U); slow first load | good | Commutative diagrams, equations as SVG | V (function) / U (licence) |
| Mermaid | MIT. | https://github.com/mermaid-js/mermaid | Deterministic; generic look | draft | Reject for final figures (LLM-ish boxes); ok for internal sketches | V (licence) |
| vtracer | Licence not captured (U; LICENSE-MIT path 404). README: colour pipeline, "skips Potrace's expensive optimal-polygon search in favor of a fast, linear" method. | https://github.com/visioncortex/vtracer | Fast, linear; deterministic for fixed params (S) | good | Colour raster → SVG | V (README) |
| Potrace | GPL; non-GPL "Potrace Professional" sold separately. | https://potrace.sourceforge.net/ | 1-bit only; deterministic | good | Clean line art → SVG (call as CLI to keep GPL apart) | V |
| SVGO | MIT. | https://github.com/svg/svgo | Deterministic | — | Optimise every ingested SVG | V |
| Paper.js | MIT. | https://github.com/paperjs/paper.js | Deterministic boolean ops | — | Union/subtract shapes, clean outlines | V |
| SAM 2 (Meta) | Code and checkpoints Apache 2.0 (demo fonts under OFL). | https://github.com/facebookresearch/sam2 | GPU; deterministic at inference (U) | good | Cut objects from photos before tracing | V |
| rembg | MIT (code). Model weights have own licences (U). | https://github.com/danielgatis/rembg | CPU ok; `-m u2netp`; deterministic (U) | good | Fast background removal | V (code) |
| OpenCV | Apache 2.0. | https://github.com/opencv/opencv | Deterministic contours | — | Mask → contour → simplify → SVG path | V |

Recommended chain for a raster asset: SAM 2 or rembg mask → OpenCV contour or vtracer → Paper.js clean-up → SVGO → palette remap.

---

## E. Generative 3D (draft only; evidence level "draft / architecture", never "measured")

| Name | Licence (exact) | URL | Output | Commercial use of output | Ev. |
|---|---|---|---|---|---|
| TRELLIS (Microsoft) | MIT (code); HF weights tag `mit`. | https://github.com/microsoft/TRELLIS · https://huggingface.co/microsoft/TRELLIS-image-large | Mesh (GLB), 3D Gaussians, radiance fields | Yes under MIT; dependencies (e.g. nvdiffrast) have own licences | V |
| TRELLIS.2 | MIT; "certain dependencies operate under separate license terms" (nvdiffrast named). 4B params; ~60 s at 1536³ on H100. | https://github.com/microsoft/TRELLIS.2 | GLB | Yes, check dependencies | V |
| Hunyuan3D-2 (Tencent) | Tencent Hunyuan 3D 2.0 Community License. "DOES NOT APPLY IN THE EUROPEAN UNION, UNITED KINGDOM AND SOUTH KOREA". MAU cap (S). | https://github.com/Tencent-Hunyuan/Hunyuan3D-2 | GLB with texture | Only inside the Territory; blocked for EU/UK/KR users | V (territory) / S (MAU) |
| TripoSR (Stability + Tripo) | MIT, "includes the source code, pretrained models". | https://github.com/VAST-AI-Research/TripoSR | OBJ/GLB | Yes | V |
| Stable Fast 3D | Stability AI Community License (HF tag `stabilityai-ai-community`, gated). Free under USD 1 M annual revenue (S). | https://huggingface.co/stabilityai/stable-fast-3d | GLB with UV texture | Yes under the revenue cap | V (licence name) / S (cap) |
| InstantMesh (TencentARC) | Apache 2.0 (code). Base model weights may differ (U). | https://github.com/TencentARC/InstantMesh | OBJ/GLB | Code yes; check weights | V (code) |

Rule: a generated mesh gets `evidence: "draft"` and `generator` fields. Never place it in a figure as a real specimen or instrument.

---

## Prefetch catalogue design

### Folder layout

```
molecullage-assets/
  catalogue.sqlite            # index built from manifests (ids, tags, licence, embedding ids)
  embeddings/                 # vector index files (e.g. clip-<model>.faiss)
  sources/                    # one YAML per source: base URL, licence policy, fetch method
    bioicons.yaml  smart.yaml  reactome.yaml  polyhaven.yaml ...
  raw/<source>/<source_id>/   # untouched download + original licence file; never edited
  assets/
    svg/<category>/<id>/      # asset.svg (normalised), thumb.png, manifest.json
    3d/<category>/<id>/       # asset.glb, asset.usdz (opt), asset.blend (opt), thumb.png, manifest.json
    materials/<id>/           # PBR maps (2k/4k), manifest.json
    hdri/<id>/                # .exr (2k/4k), manifest.json
    molecular/<pdb|afdb|emdb|pubchem>/<id>/  # mmCIF/BCIF/map + view.mvsj + manifest.json
  quarantine/                 # failed licence gate or needs human review (BY-SA, unknown)
  credits/CREDITS.md          # auto-built from manifests
  logs/ingest-YYYYMMDD.jsonl
```

Categories (first pass): `cell`, `organelle`, `virus`, `protein-glyph`, `organism`, `anatomy`, `lab-device`, `glassware`, `compute`, `chemistry`, `arrow-connector`, `material`, `hdri`.

### Manifest schema (per asset, `manifest.json`)

```json
{
  "id": "smart:mitochondrion-03",
  "version": 1,
  "kind": "svg | mesh | material | hdri | molecule",
  "title": "Mitochondrion, cut-away",
  "source": {
    "name": "Servier Medical Art",
    "url": "https://smart.servier.com/...",
    "source_id": "…",
    "fetched_at": "2026-10-30T00:00:00Z",
    "fetch_method": "http | git | api | manual"
  },
  "licence": {
    "spdx": "CC-BY-4.0",
    "url": "https://creativecommons.org/licenses/by/4.0/",
    "status": "allowed | needs_review | blocked",
    "commercial_ok": true,
    "share_alike": false,
    "non_commercial": false,
    "evidence": "V | S | U",
    "licence_file": "raw/smart/…/LICENSE.txt"
  },
  "credit_line": "Image provided by Servier Medical Art (https://smart.servier.com/), licensed under CC BY 4.0",
  "authors": ["Servier"],
  "doi": null,
  "evidence_level": "published | measured | simulated | architecture | draft",
  "generator": null,
  "formats": [
    {"path": "asset.svg", "mime": "image/svg+xml", "bytes": 0, "sha256": "…"}
  ],
  "geometry": {
    "bbox_mm": [0, 0, 40, 25],
    "bbox_3d_units": null,
    "up_axis": "Z",
    "poly_count": null,
    "real_world_size_m": null
  },
  "palette_slots": [
    {"slot": "primary", "selector": ".cls-1", "default": "#C8553D"},
    {"slot": "outline", "selector": "path[stroke]", "default": "#222222"}
  ],
  "materials_slots": ["membrane", "matrix"],
  "tags": {
    "semantic": ["mitochondrion", "organelle", "cell biology"],
    "ontology": ["GO:0005739"],
    "style": ["flat", "outline"],
    "view": ["cut-away", "side"]
  },
  "embedding": {"model": "clip-vit-l14", "id": "emb_000123", "text_id": "emb_t_000123"},
  "qa": {"thumb": "thumb.png", "render_ok": true, "min_stroke_pt": 0.25, "notes": ""},
  "checksum_sha256": "…"
}
```

Field notes:
- `licence.status` decides use. Only `allowed` assets are visible to agents by default.
- `palette_slots` lets the builder recolour SVG to the Molecullage palette without touching paths.
- `ontology` uses GO/UBERON/CL/NCBITaxon ids where known; helps exact search.
- `evidence_level` follows the owner's house rule. Generated meshes are always `draft`.

### Ingest pipeline

1. **Fetch.** Pull by source adapter (git clone, REST API, or saved manual download). Store the untouched file and the licence text in `raw/`. Record URL, time, and SHA-256.
2. **Licence gate.** Map to SPDX. Allow: CC0, PDM, CC-BY-3.0/4.0, MIT, Apache-2.0, BSD. Review: CC-BY-SA, ODC-BY bundles, unknown. Block: any NC, any ND, "editorial only", Allen non-commercial for pitch use, Hunyuan3D output for EU/UK/KR use. Blocked or review items go to `quarantine/`.
3. **Normalise.**
   - SVG: strip metadata and scripts, convert text to paths only if fonts are not Helvetica/Arial, set `viewBox`, inline styles → classes, SVGO, then tag recolourable fills as palette slots.
   - 3D: convert to glTF 2.0 (GLB) as the master; optional USD/USDZ; keep `.blend` when the source is Blender. Apply scale to metres, Z-up for Blender, centre origin, triangulate a copy, decimate a "preview" LOD.
   - Molecular: keep mmCIF/BCIF plus a `view.mvsj` (MolViewSpec) for the canonical view; ChimeraX script for the flat journal render.
   - Materials/HDRI: keep 2k and 4k; convert to linear EXR where needed.
4. **Thumbnail.** SVG: headless Chrome to 512 px PNG on white and on transparent. 3D: Blender headless render with one fixed studio rig (same HDRI, same camera angle). Molecule: Mol* headless or ChimeraX.
5. **Tag.** Rule tags from source metadata and file names; ontology lookup (OLS) for ids; a vision model pass marked `auto` for style and view; human check for the first 200 assets.
6. **Embed.** Image embedding of the thumbnail plus text embedding of title + tags. Store ids in `catalogue.sqlite` and vectors in `embeddings/`.
7. **Publish.** Write `manifest.json`, regenerate `credits/CREDITS.md`, log to `logs/`. A figure build pulls credit lines for every asset id it used.

Determinism rules: pin source commit or download date; fixed render rig and seed; checksum every output; re-ingest only when the source checksum changes.

### Starter prefetch set (by value per effort)

1. Reactome icon library (GitHub, CC BY 4.0) — pathway glyphs.
2. Servier SMART (CC BY 4.0) — organs and cells.
3. Bioicons repo (per-icon licences) — lab objects.
4. Health Icons (CC0) — small pictograms.
5. Poly Haven + ambientCG (CC0) — HDRIs and materials for one studio rig.
6. Z-Anatomy .blend (CC BY-SA 4.0, review) and BodyParts3D (CC BY) — anatomy.
7. Sketchfab CC0/CC-BY hand-picked list via Download API — animals, instruments.
8. Molecular Nodes + MolViewSpec templates for PDB/AFDB entries.

### Open questions for the owner

- Is any output for pitch or product use? That decides ChimeraX, VMD and Allen content (non-commercial).
- Is share-alike (CC BY-SA) acceptable inside papers? It affects Z-Anatomy and OpenMoji.
- Hunyuan3D-2 licence excludes the EU, UK and South Korea. Check where the work and users are.
