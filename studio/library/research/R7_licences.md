<!-- version: w03 | date: 2026-10-30 -->
# R7 - Licences: "the licence follows the asset"

Worker: research subagent. Date: 2026-10-30. No installs, no downloads, no project code edited. No Cammut retain.
This is a reading of licence texts and official FAQs. It is not legal advice. Ask a lawyer before any commercial release.

## How to read the evidence marks

- **V** = I read the primary text in this session (licence, official FAQ, provider page).
- **S** = a search summary only.
- **U** = unverified: the fetch failed, the page did not say it, or it is my inference. Inferences are marked "inference".
- Numbers in square brackets point to the reference list at the end.
- Quotes are short. Everything else is my paraphrase.

## 0. Summary for the orchestrator

- the owner's idea has a sound core. A free tool can use third-party assets under their owners' licences while its own code keeps its own licence. CC itself and Sketchfab's API rules say the licence and the credit travel with the asset [1][14].
- "Inherit the owner's licence" cannot turn a restricted asset into a free one. A figure that contains an NC part is NC. A figure that is an adaptation of a BY-SA part must be BY-SA. Closed content (BioRender) cannot be extracted at all [3][8][21].
- "Totally free" can describe Molecullage's code. It cannot describe every output.
- The hard block class can be small. See section 8.

---

## 1. "Licence follows the asset"

**Question.** May a free tool ship or use assets under their owners' licences while the tool's code keeps its own licence?

**Answer: yes, for assets whose licence allows copying.** (V)

- The licence sits on the asset. The tool's licence covers the tool's code. They do not mix, because the asset is data that the tool loads. (inference from [1] section 2(a)(5), U for any court view)
- CC BY 4.0 section 2(a)(5)(B): "You may not offer or impose any additional or different terms or conditions on" the Licensed Material if that restricts the rights of any recipient [1] (V). So the tool may not wrap a CC BY asset in a tighter licence. It may ship it with the original licence.
- Sketchfab's Download API rule says the same: "The Creative Commons license and attribution must follow the asset everywhere it is used." If users build their own creations, the original creator attribution "must be accessible to all end users" [14] (V).

**What must travel with a CC BY 4.0 asset** [1] section 3(a) (V):

| Item | Text of the licence (short) | Molecullage field |
|---|---|---|
| Creator name | "identification of the creator(s)" if the licensor supplied it | `authors` |
| Copyright notice | "a copyright notice" if supplied | `credit_line` |
| Licence notice | "a notice that refers to this Public License" | `licence.spdx`, `licence.url` |
| Disclaimer notice | "a notice that refers to the disclaimer of warranties" | `licence.url` (the legal code holds it) |
| Link to the work | "a URI or hyperlink to the Licensed Material to the extent reasonably practicable" | `source.url` |
| Change note | "indicate if You modified the Licensed Material and retain an indication of any previous modifications" | new field `modified` (for example "recoloured to palette") |
| Licence text or link | "include the text of, or the URI or hyperlink to, this Public License" | `licence.url` |

- Form is flexible. Section 3(a)(2): "any reasonable manner based on the medium, means, and context." A link to a page that holds the information is allowed [1] (V).
- CC best practice names four elements: title, author, source, licence. For video and offline media it suggests a web page with a credit list, and it says metadata alone is "not the only place" to credit [10] (V).
- On request of the licensor the credit must be removed "to the extent reasonably practicable" [1] section 3(a)(3) (V).
- The 4.0 licences also cover database rights. Sharing a substantial part of a database triggers the same credit duty [1] section 4 (V).
- CC FAQ: the licence's attribution rules "are the minimum requirement" [5] (V).

**Limit of the idea.** The tool can ship a copy only if the licence allows redistribution. Three cases do not:

- BioRender forbids use outside its app, bulk export and extraction [21] (V).
- Poly Haven's terms forbid scraping the website, though the assets are CC0. Use the routes they offer [22] (V).
- Editorial licences on Sketchfab Store content forbid commercial or promotional use [15] (V).

---

## 2. A composite figure: CC BY + CC BY-SA + CC0 + an NC icon

**Is the figure "adapted material"?** It depends on what the tool did to each asset.

- Definition, CC BY 4.0: material "translated, altered, arranged, transformed, or otherwise modified in a manner requiring permission under the Copyright and Similar Rights" [1] section 1 (V).
- CC FAQ: whether a change is an adaptation "depends primarily on the applicable copyright law." A change that adds enough new creativity to be copyrightable is usually an adaptation [5] (V).
- CC FAQ: a change of file format is not an adaptation [5] (V).
- CC FAQ: all CC licences allow a work to be included in a collection. The licence of the collection does not change the licence of the original [5] (V).
- CC ShareAlike guide: ShareAlike "applies only for works considered adaptations." Placing an SA work unmodified beside unrelated material is not an adaptation. If the larger work is not an adaptation, it "may be licensed under any terms" [8] (V). The same page says the answer "may differ across jurisdictions" [8] (V).

**Reading for Molecullage** (inference, U for the exact line):

| Operation | Probably | Why |
|---|---|---|
| Place an asset unmodified as a separate element | collection | CC FAQ and ShareAlike guide [5][8] |
| Scale, move, crop | unclear; treat as modified (needs a change note) | no CC text names these |
| Recolour to the palette (`palette_slots`) | adaptation of that asset | the tool alters the artwork |
| Merge, overlap or redraw several assets into one drawing | adaptation of all merged assets | "arranged, transformed" [1] |
| Change file format only | not an adaptation | [5] |

**What BY-SA forces.** CC BY-SA 4.0 section 3(b) (V) [2]:

1. The Adapter's License must be a CC licence "with the same License Elements, this version or later, or a BY-SA Compatible License."
2. You must include the text or link of that licence.
3. You may not add terms or technical measures that restrict the rights under it.

It applies only when you share the adapted material. Private work is free of it [8] (V).
The Adapter's License covers "Your contributions" to the adapted material [2] section 1 (V). Other creators' parts keep their own licences.

**Compatible licences.** The BY-SA 4.0 list names BY-SA 4.0 or later, ported versions, Free Art License 1.3 and GNU GPLv3. GPLv3 compatibility "is one-way only": you may license BY-SA adaptations under GPLv3. You may not license GPLv3 adaptations under BY-SA [6][9] (V).
CC FAQ: when a remix uses ShareAlike material, all contributed material must be under the same licence or one that CC named as compatible [5] (V). Material under CC BY goes into a BY-SA work [5] (V, from the Wikipedia question).

**What the figure can carry, case by case:**

| Figure content | The figure's own parts (layout, text, data) can be | Note |
|---|---|---|
| CC0 + CC BY, each unmodified in a collection | any licence the author picks; the credits list carries the rest | each asset keeps its licence [5] |
| CC0 + CC BY, merged | CC BY 4.0 or any licence that does not stop BY recipients | [1] 2(a)(5)(B) |
| CC BY-SA merged in | CC BY-SA 4.0 (or later, or compatible) for the adapter's parts | [2] 3(b) |
| An NC asset anywhere in the shared figure | the figure is usable for NonCommercial purposes only | [3][5] |
| NC asset merged with a BY-SA asset | cannot be shared lawfully (inference): BY-SA needs all contributions under SA or compatible terms, and CC names no non-CC licence compatible with BY-NC-SA | [5][6] |
| ND asset modified | cannot be shared at all; private use only | [4] |

A practical output licence is an SPDX expression. `AND` means all conditions apply together [27] (V). Example for a collection: `CC-BY-4.0 AND CC-BY-SA-4.0 AND CC0-1.0` for the parts, plus the author's own licence for the layout. Keep one line per asset in the credits file; the expression is only a summary.

---

## 3. NC and ND assets

**NonCommercial, CC's own words.**

- Text: NonCommercial "means not primarily intended for or directed towards commercial advantage or monetary compensation." Exchanging files by file-sharing for other protected material is NC if no money changes hands [3] section 1 (V).
- CC FAQ: the test does not depend on who the user is. A nonprofit "could still run afoul"; a company "does not necessarily" violate it. It depends on "the specifics of the situation and the intentions of the user." "CC cannot advise you on what is and is not commercial use." If unsure, contact the rights holder or pick a work that allows commercial use [5] (V).
- CC NC guide: only "the primary purpose of the reuse" counts. A for-profit user is not automatically commercial. "Not all educational uses are necessarily NonCommercial uses" [7] (V). The guide does not cover journals, ads or personal blogs [7] (V, read as absent).

**the owner's contexts** (inference from the test above; U for each verdict, because CC gives no list):

| Context | Reading | Tool action |
|---|---|---|
| Own talk at a university or conference, no fee | likely NC use | allow, mark figure "NC" |
| Teaching slides inside a university | likely NC | allow, mark NC |
| Academic paper | unclear. The publisher may sell the journal. CC gives no ruling. The Allen terms allow a "limited set" in a scholarly journal with citation [33] (V) | warn, ask; allow only on a yes |
| Grant application | unclear. The aim is money, but the figure itself is not sold | warn, ask |
| Startup pitch to investors | the primary aim is commercial advantage | block |
| Product page, ad, paid course, sold report | commercial | block |

Allen Institute terms: use is for "research or other noncommercial purposes"; redistribution for commercial purposes needs written permission [33] (V).

**NoDerivatives.** CC BY-ND 4.0 section 2(a)(1) (V) [4]:

- (A) "reproduce and Share the Licensed Material, in whole or in part";
- (B) "produce and reproduce, but not Share, Adapted Material."
- Format changes and technical changes needed to use the work in other media are allowed [4] 2(a)(4) (V).
- The 4.0 FAQ says the NoDerivatives licences do not allow remixing except for private use [5] (V).

Tool rule: an ND asset may sit unmodified in a figure (collection). The tool blocks recolour, crop-and-merge or redraw when the output will be shared. Private drafts are fine.

---

## 4. Code libraries: does the output inherit?

**Output of a GPL program.** FSF FAQ (V) [11]:

- "The output of a program is not, in general, covered by the copyright on the code of the program."
- Exception: text or art that comes from the program and is copied into the output. That copied text stays under its licence in the source.
- A GPL editor or compiler does not make your own code GPL.

So output of GPL tools run as separate programs (Potrace, Molecular Nodes, as in policy P10) is free of their licence. This holds unless the tool copies its own code or art into the output.

**Bundling a library into the output page.** A deck page that embeds a GPL JavaScript file copies that file into the output.

- FSF: "when the organization transfers copies to other organizations or individuals, that is distribution." Copies for your own use are not distribution [11] (V).
- Sending a page with an embedded library to a viewer is a transfer of a copy. This is my inference (U). The FSF essay on JavaScript was not read.
- The FSF also says JavaScript "is often non-trivial, it is worth copylefting" [11] (V, in the context of the FSF's own advice).
- Result (inference): a shipped HTML bundle that contains a GPL library must meet the GPL, with source offer and licence text. Whether the whole page becomes GPL depends on how tightly the page is combined with the library. The FSF reads linking as a combination [32] (V, as stated by the ASF). Treat bundling as GPL for the whole bundle.

**AGPL.** Section 13 applies when you modify the program and let users interact with it over a network. You must offer them the source [12] (V). A tool that only runs on the owner's machine and produces files does not trigger it (inference).

**LGPL.** I did not read the LGPL text this session (U). From memory it allows use inside a non-free program if users can swap the library. That is hard to meet in a minified HTML bundle. Keep LGPL libraries out of shipped bundles unless a separate check passes.

**MPL-2.0.** File-level copyleft. New files that contain no MPL code are not modifications and need not be MPL. MPL code may sit in a larger proprietary program [31] (V).

**Fonts under SIL OFL 1.1** [26] (V):

- Embedding in a document is allowed, "either in full or a subset" (FAQ 1.12).
- "Referencing or embedding an OFL font in any document does not change the license of the document itself" (1.13).
- Selling designs made with OFL fonts is allowed (1.1). The author remains the copyright holder (1.1.1).
- Bundling fonts with software does not make the program free software; only the font parts stay OFL (1.3). The fonts may not be sold alone (1.6).
- Reserved Font Names limit renaming of modified fonts (5.1).

---

## 5. Special licences, one by one

| Source | What I found | Mark | Tool consequence |
|---|---|---|---|
| **GSAP Standard "No Charge"** (Webflow) | Grant: "use, reproduce, display, and implement GSAP Products" for Permitted Uses. Permitted Uses: any website, web application or digital interface by any person or entity. Prohibited Use: use "in tools that allow users to build visual animations without code" that compete with Webflow's visual animation building. No reverse engineering to build competing products. No removal of notices. Webflow may end the licence if you break a term. Webflow may amend the licence by posting; you may keep using earlier versions under their old terms. FAQ: AI-generated GSAP code is allowed; visual tools "that don't directly compete" are welcome; contact them if unsure. Plugins such as SplitText and MorphSVG are free for commercial projects. Effective 2025-04-30, last modified 2025-05-30. [13] | V | Decks and films built with GSAP are Permitted Uses. Risk: a Molecullage feature that lets people build animations visually with no code could be a Prohibited Use (inference). Keep animation authoring declarative (JSON or code). Pin a version. Keep anime.js (MIT) as the fallback, as in R1. No SPDX id: use `LicenseRef-GSAP-Standard`. |
| **Sketchfab models** | Each model has its own licence set by its author. The download API demands that "the license and attribution must follow the asset," that the app "clearly display the license of the model as well as author attribution," and that the app say models come from Sketchfab [14] (V). Sketchfab's search summary says downloadable models are under a Standard licence or a CC licence, CC BY is the default, credit is needed unless CC0 [16] (S). The Sketchfab Store licence page defines Editorial (no commercial or promotional use) and Standard (no sublicensing, no standalone redistribution) [15] (V). | V / S | Read the licence per model. Store it in the manifest. Credit line: title, author, link, licence. Block Editorial for promotional work. |
| **Servier Medical Art** | CC BY 4.0, not 3.0. Site text: "licensed under CC BY 4.0." Credit text given: "Image(s) provided by Servier Medical Art (https://smart.servier.com), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)." The site allows remix and adaptation, also commercial. No older version is mentioned [17][18] (V). Some Bioicons copies may carry CC BY 3.0 (R2 note, S). | V | Use + auto credit with that string. Add "modified" when recoloured. Check the version per Bioicons copy. |
| **Bioicons** | Mixed per icon. README: "Please always cite the individual icons and their respective license." "If the icon is licensed as CC BY you still need attribute and state the modifications made." Contributors are asked to use CC0 or MIT [19]. The README does not say where each icon's licence sits [19] (V). | V | Read licence per icon from its folder. Do not credit "Bioicons" in place of the author. |
| **Reactome icons** | CC BY 4.0, "correctly attributed to CSHL, OICR and EBI" [20] (V). | V | Use + auto credit. |
| **BioRender** | Closed. Free plan: no publishing of figures with BioRender content and no commercial use. Academic plan: use in figures for academic, research, teaching and not-for-profit purposes. Industry plan: commercial use. All plans: no use "outside the BioRender application"; no bulk export; no "attempt to extract BioRender Content from Science Figures (including via segmentation, vectorization, or similar techniques)"; no standalone redistribution [21] (V). | V | Block as an ingest source. Do not vectorise exported BioRender images. A user may place a finished BioRender figure as one image only if their plan allows (inference, U). |
| **Poly Haven** | "Our assets are all licensed as CC0"; "You do not need to give credit"; any purpose, may redistribute. Other site content (logos, user renders, text) is protected. Scraping or data mining the site is forbidden [22] (V). | V | Use freely. Fetch through the routes the site offers, not by scraping (U whether its API qualifies; R2 marks the API U). |
| **Smithsonian Open Access** | The page returned 403 to me. R2 says CC0 (S). | U | Treat as CC0 only after a direct read of the page for each item. Some items carry rights notes (U). |
| **PDB / wwPDB data** | Archive data under "CC0 1.0 Universal." Structure Summary images follow the same terms. Authors' credit is encouraged, not required. Molecule of the Month illustrations are CC-BY-4.0 credited to David S. Goodsell and RCSB PDB. Molecule of the Month text may be reprinted only with permission and unchanged [24] (V). | V | Use freely. Credit the PDB entry authors and RCSB as courtesy. Treat Goodsell art as CC BY (auto credit). |
| **AlphaFold DB** | "Data is available for academic and commercial use, under a CC-BY-4.0 licence." EMBL-EBI "expects attribution." The page lists papers to cite [25] (V). | V | Use + auto credit + citation of the AlphaFold DB paper. |
| **Fonts, SIL OFL 1.1** | See section 4. PDF embedding is allowed and does not change the document's licence [26] (V). | V | Use freely; ship the OFL text beside bundled font files. |
| **Allen Cell** | Noncommercial research use; a limited set may go into a scholarly journal with citation; commercial redistribution needs written permission [33] (V). | V | NC class: warn and ask. |
| **NIAID BioArt** | The page I fetched gave no licence text [R2: public domain or CC BY per entry, S]. | U | Read per entry. |

---

## 6. Tools

**SPDX identifiers and expressions** [27] (V, spec 2.3.1):

- Operators `AND`, `OR`, `WITH` are case-sensitive. `+` takes no space before it. `WITH` and `AND`/`OR` need spaces or brackets around them.
- Order of use: `+`, then `WITH`, then `AND`, then `OR`. Brackets override.
- `OR` is a choice; `AND` means all licences apply together.
- A licence that is not on the SPDX list gets `LicenseRef-<id>`.
- Useful ids (names as in the SPDX list; the list itself was not fetched, so the id strings are U except where they appear in the sources): `CC0-1.0`, `CC-BY-4.0`, `CC-BY-3.0`, `CC-BY-SA-4.0`, `CC-BY-NC-4.0`, `CC-BY-ND-4.0`, `OFL-1.1`, `MIT`, `Apache-2.0`, `MPL-2.0`. `GPL-3.0-or-later` appears in the REUSE spec [28] (V). Custom: `LicenseRef-GSAP-Standard`, `LicenseRef-BioRender-Terms`.

**REUSE specification, version 3.3, dated 2024-11-14** [28] (V):

- Recommended method: comment headers with `SPDX-FileCopyrightText` and `SPDX-License-Identifier`.
- Files that cannot hold comments (images, models) get a sidecar `<file>.license`, for example `cat.jpg.license`. The sidecar takes precedence over a header.
- `REUSE.toml` maps paths and glob patterns to copyright and licence values through `[[annotations]]`. `.reuse/dep5` is deprecated. Do not use both.
- A `LICENSES/` folder at the root holds one text file per licence, named by SPDX id, such as `GPL-3.0-or-later.txt`. Non-SPDX licences use `LicenseRef-`. Only licences that apply to a file belong there.
- Snippet tags can license part of a file differently.

Fit for Molecullage: `assets/<kind>/<id>/asset.svg.license` next to each asset, holding the licence id and copyright text; `LICENSES/` at the repo root. The manifest keeps the same data for the builder. A `reuse` command-line checker exists (U; the spec page I read does not describe it).

**Detection.**

- **ScanCode Toolkit** detects copyright, licence and dependency origin. Output: JSON, YAML, HTML, CycloneDX, SPDX. Code is Apache-2.0; the licence-rules datasets are CC-BY-4.0 [29] (V). Use it on `node_modules` and on vendored asset folders.
- **licensee** is a Ruby gem and CLI. It reads a project's `LICENSE` file, compares it with known licences (exact match, then Sørensen-Dice score) and reports the SPDX id. MIT licence [30] (V). It reads project-level licence files. It is a poor fit for single asset files.
- Neither tool detects an unusual custom licence reliably. They report a low match score. Send such cases to the `review` class.

**Auto credits block** (design, no code written):

1. Each figure build lists the asset ids it used. The builder already knows them (R2 ingest step 7).
2. For each asset, print one line: `Title - Author - Source URL - Licence name and URL - changes made`. This is the CC "TASL" pattern plus the change note [1][10].
3. Write the lines to `<key>.credits.md` beside `<key>.notes.md`, and show a short credit line on the figure or the slide notes. A link to the credits page satisfies 3(a)(2) [1].
4. Print one SPDX summary line for the output (see section 2).
5. For decks: one credits slide at the end, or a credits page linked from the slide. For film: credits in the description and as a final card [10].
6. Add a warning list: NC parts, ND parts, SA parts, `LicenseRef` parts, with the use context that was chosen.

---

## 7. Licence for Molecullage's own code

Assets are loaded data, so their licences do not set the code licence. Bundled code libraries do (section 4). Facts used: [31][32] (V).

| Licence | Pros | Cons |
|---|---|---|
| **MIT** | Shortest text. Anyone may use it for anything. Fits every asset above. | No patent grant. Anyone may close a fork. |
| **Apache-2.0** | MIT-like freedom plus an explicit patent grant. Compatible with GPLv3 [32]. | Not compatible with GPLv2-only code [32]. Longer text; needs a NOTICE file. |
| **MPL-2.0** | Changes to MPL files stay open. New files may use other licences. Can sit in a larger proprietary program [31]. | Users must track which files are MPL. Mixed repos need per-file headers. |
| **GPL-3.0** | Keeps every fork open. | Blocks use inside closed products. It likely conflicts with GSAP's use limits, since the GPL forbids extra restrictions (inference; I did not read GPLv3 or an FSF view on GSAP). Bundled GPL code spreads to the shipped bundle. |

My reading: **Apache-2.0** (or MIT) for the code. It keeps Molecullage free to use, takes in every asset class in section 8 and does not clash with GSAP or anime.js. Original figures, templates and documents made by the owner could use CC BY 4.0 or CC0 (the owner's call). Keep REUSE headers so that each file states its own licence.

---

## 8. Proposed soft policy: "licence follows the asset"

The tool tags every asset with a licence class when it enters the catalogue. The class decides what happens at build time. "Context" means the question "Who sees this figure and for what purpose?" The tool asks it once per project and stores the answer.

| Licence class (examples) | What the tool does | Why (refs) |
|---|---|---|
| **A. Public domain** - CC0, PDM, wwPDB data, Poly Haven, Health Icons, Kenney | Use freely. Optional courtesy credit line. | No credit duty; Poly Haven says credit not needed [22]; PDB data CC0 [24] |
| **B. Permissive code** - MIT, BSD, ISC, Apache-2.0 | Use freely as a dependency. Keep the notice files in shipped bundles. | Licence texts; Apache/GPLv3 note [32] |
| **C. Attribution** - CC BY 3.0/4.0, ODC-BY, AlphaFold DB, Servier, Reactome, Goodsell art, OFL fonts | Use + auto credit (title, author, link, licence, change note). Add a changed-by-tool note on recolour. Ship font licence text. | CC BY 4.0 section 3(a) [1]; Servier [18]; Reactome [20]; AlphaFold [25]; OFL [26] |
| **D. Share-alike** - CC BY-SA, OpenMoji, Z-Anatomy | Use + auto credit. Mark the asset "SA". Ask: merged or separate? Separate (collection): the figure's own parts take any licence. Merged or recoloured (adaptation): tag the output CC BY-SA 4.0 or later, and refuse to merge it with NC or ND parts. | BY-SA 3(b) [2]; ShareAlike guide [8]; FAQ [5] |
| **E. Weak copyleft code** - MPL-2.0, EPL, LGPL | Use unmodified as a dependency. Keep notices. LGPL inside a shipped HTML bundle: review first. | MPL FAQ [31]; LGPL not read (U) |
| **F. NonCommercial** - CC BY-NC*, Allen Cell | Warn and ask for the use context. Allow for talks, teaching and (after a yes) papers. Tag the figure "NC". Block if context is pitch, product, ad or paid. Offer "ask the rights holder". | NC definition and CC FAQ [3][5][7]; Allen [33] |
| **G. NoDerivatives** - CC BY-ND | Allow only unmodified placement as a separate element, or private drafts. Block recolour, redraw or merge when the output will be shared. | BY-ND 2(a)(1) [4]; FAQ [5] |
| **H. Custom terms with a rule** - GSAP Standard, Sketchfab Standard, Sketchfab Editorial | Apply the rule written for that licence. GSAP: allow in decks and films; warn if a feature builds animations visually without code; pin the version. Sketchfab Standard: use per model terms, no standalone redistribution. Editorial: block for promotional use. | GSAP text [13]; Sketchfab [14][15] |
| **I. GPL/AGPL code** | Separate program, output used: allow. Bundled into a shipped output: block unless the output is released under the GPL. AGPL service: warn. | FSF output FAQ [11]; AGPL 13 [12] |
| **J. Block** - closed content with extraction bans (BioRender); unknown or missing licence; Hunyuan3D output in EU/UK/KR (from R2) | Block. Quarantine. Ask the owner or the rights holder. | BioRender terms [21]; Hunyuan territory (R2, V in R2) |

**Rule of thumb for the block class:** the tool blocks only (1) content whose own terms forbid the tool's use, (2) uses that the licence forbids in the chosen context, and (3) assets with no licence at all. Everything else gets a label and a duty.

Three tags travel with every output: `credits` (the lines), `restrictions` (NC, SA, ND parts) and `licence summary` (SPDX expression). The tool refuses to export an output whose `restrictions` conflict with the chosen context.

---

## 9. What holds and what does not in the owner's idea

| Part of the idea | Holds? | One reason |
|---|---|---|
| The tool's code licence is separate from asset licences | Holds | Assets are loaded data; each keeps its own licence [1][14] |
| A free tool may use CC BY and CC0 assets with credit | Holds | CC BY 4.0 section 3(a) asks only for credit, links and a change note [1] |
| The credit and licence should travel with the asset into the output | Holds | CC and Sketchfab say so [1][14] |
| Output of a tool does not inherit the tool's licence | Holds, with an exception | FSF: output is not covered unless the program copies its own text into it [11] |
| A gate that blocks all of BY-SA, NC and custom licences is too blunt | Holds | BY-SA applies only to adaptations [8]; NC depends on context [5][7]; GSAP is allowed in decks [13] |
| "We can inherit the owner's licence, so everything is free" | Does not hold | The tool cannot grant more than the owner granted; an NC part makes the figure NC [3][5] |
| Share-alike is soft | Does not hold | If the figure is an adaptation, BY-SA 4.0 or a compatible licence is required for the adapter's parts [2] |
| ND assets can be used like any other if credited | Does not hold | Adapted ND material cannot be shared [4] |
| Closed libraries (BioRender) can be inherited | Does not hold | Their terms forbid extraction and use outside the app [21] |
| GPL libraries can go in shipped bundles under "inherit" | Does not hold | Copied code stays under its licence; the bundle then needs GPL compliance [11] (inference for the whole-bundle effect) |
| The whole of Molecullage is "totally free" | Holds for the code only | Outputs carry their parts' restrictions |

## 10. Open items for a later check

- GNU licence list page (Apache, MPL, MIT entries) returned HTTP 429 five times. I used the ASF and Mozilla pages instead [31][32].
- LGPL text and the FSF essay on JavaScript licences were not read (U).
- Smithsonian Open Access page returned 403 (U).
- The SPDX licence list itself was not fetched; id spellings in section 6 are from memory except those quoted in [27][28].
- NIAID BioArt licence text, Noun Project, PhyloPic, OpenMoji and other sources in R2 were not re-checked here.
- CC gives no ruling for journals, grants or pitches. Ask the licensor for any case that matters.
- Whether a recolour is an adaptation is a legal question that differs by country [5][8].

## References

1. Creative Commons. Attribution 4.0 International - legal code. Creative Commons. https://creativecommons.org/licenses/by/4.0/legalcode.en. Accessed 2026-10-30. (V)
2. Creative Commons. Attribution-ShareAlike 4.0 International - legal code. https://creativecommons.org/licenses/by-sa/4.0/legalcode.en. Accessed 2026-10-30. (V)
3. Creative Commons. Attribution-NonCommercial 4.0 International - legal code. https://creativecommons.org/licenses/by-nc/4.0/legalcode.en. Accessed 2026-10-30. (V)
4. Creative Commons. Attribution-NoDerivatives 4.0 International - legal code. https://creativecommons.org/licenses/by-nd/4.0/legalcode.en. Accessed 2026-10-30. (V)
5. Creative Commons. Frequently asked questions. https://creativecommons.org/faq/. Accessed 2026-10-30. (V)
6. Creative Commons. Compatible licenses (BY-SA 4.0). https://creativecommons.org/share-your-work/licensing-considerations/compatible-licenses/. Accessed 2026-10-30. (V)
7. Creative Commons Wiki. NonCommercial interpretation. https://wiki.creativecommons.org/wiki/NonCommercial_interpretation. Accessed 2026-10-30. (V)
8. Creative Commons Wiki. ShareAlike interpretation. https://wiki.creativecommons.org/wiki/ShareAlike_interpretation. Accessed 2026-10-30. (V)
9. Creative Commons Wiki. ShareAlike compatibility: GPLv3. https://wiki.creativecommons.org/wiki/ShareAlike_compatibility:_GPLv3. Accessed 2026-10-30. (V)
10. Creative Commons Wiki. Best practices for attribution. https://wiki.creativecommons.org/wiki/Best_practices_for_attribution. Accessed 2026-10-30. (V)
11. Free Software Foundation. Frequently asked questions about the GNU licenses (GPL FAQ). https://www.gnu.org/licenses/gpl-faq.html. Accessed 2026-10-30. (V; the page was read in parts through a summariser, so quotes are as returned)
12. Free Software Foundation. GNU Affero General Public License v3, section 13. https://www.gnu.org/licenses/agpl-3.0.html. Accessed 2026-10-30. (V)
13. Webflow. GSAP Standard "No Charge" License (effective 2025-04-30, modified 2025-05-30). https://gsap.com/standard-license/. Accessed 2026-10-30. (V)
14. Sketchfab. Download API guidelines. https://sketchfab.com/developers/download-api/guidelines. Accessed 2026-10-30. (V)
15. Sketchfab. Licenses (Store licence terms: Standard and Editorial). https://sketchfab.com/licenses. Accessed 2026-10-30. (V)
16. Sketchfab. Help articles and blog on downloadable models and Creative Commons (search summary). https://sketchfab.com/blogs/community/an-introduction-to-creative-commons-licenses ; https://help.sketchfab.com/en/articles/16152215-crediting-users-for-3d-model-downloads. Accessed 2026-10-30. (S)
17. Servier. Servier Medical Art. https://smart.servier.com/. Accessed 2026-10-30. (V)
18. Servier. How to cite Servier Medical Art. https://smart.servier.com/how-to-cite-servier-medical-art/. Accessed 2026-10-30. (V)
19. Duerr S. Bioicons (README). https://github.com/duerrsimon/bioicons. Accessed 2026-10-30. (V)
20. Reactome. Icon library. https://reactome.org/icon-lib. Accessed 2026-10-30. (V)
21. BioRender. Terms of service. https://www.biorender.com/terms-of-service. Accessed 2026-10-30. (V)
22. Poly Haven. License. https://polyhaven.com/license. Accessed 2026-10-30. (V)
23. Smithsonian Institution. Open Access. https://www.si.edu/openaccess. Accessed 2026-10-30. (U; HTTP 403)
24. RCSB PDB. Usage policy. https://www.rcsb.org/pages/usage-policy. Accessed 2026-10-30. (V)
25. EMBL-EBI. AlphaFold Protein Structure Database. https://alphafold.ebi.ac.uk/. Accessed 2026-10-30. (V)
26. SIL International. OFL FAQ. https://openfontlicense.org/ofl-faq/. Accessed 2026-10-30. (V)
27. SPDX. SPDX specification 2.3.1, Annex D: SPDX license expressions. https://spdx.github.io/spdx-spec/v2.3.1/SPDX-license-expressions/. Accessed 2026-10-30. (V)
28. REUSE. REUSE specification 3.3 (2024-11-14). https://reuse.software/spec-3.3/. Accessed 2026-10-30. (V)
29. AboutCode. ScanCode Toolkit (README). https://github.com/aboutcode-org/scancode-toolkit. Accessed 2026-10-30. (V)
30. Licensee project. licensee (README). https://github.com/licensee/licensee. Accessed 2026-10-30. (V)
31. Mozilla. MPL 2.0 FAQ. https://www.mozilla.org/en-US/MPL/2.0/FAQ/. Accessed 2026-10-30. (V)
32. Apache Software Foundation. GPL compatibility. https://www.apache.org/licenses/GPL-compatibility.html. Accessed 2026-10-30. (V)
33. Allen Institute for Cell Science. Terms of use. https://www.allencell.org/terms-of-use.html. Accessed 2026-10-30. (V)
34. Internal. R2_science_assets.md (w02); R1_motion_libraries.md (w02), section 1d on GSAP; policy.md, section P10. Read 2026-10-30. (V)
