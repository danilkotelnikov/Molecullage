<!-- version: p7.3 | date: 2026-11-08 | status: updated for Arc Harness concept v8, Molecullage workspace consolidation, and bd96b6d consolidation -->
# Molecullage Studio, Plan 7: the Arc Science (Arc Harness) pilot deck — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to run this plan task by task. Steps use checkbox (`- [ ]`) syntax. Read `.\docs\superpowers\plans\2026-10-31-studio-00-index.md` first; its executor rules apply to every step here.

**Goal:** Build the first full pilot: an animated pitch deck for Arc Science (now **Arc Harness**, `concept/roadmap.md` v8 and `concept/arc-harness-agent-design.md` v3), 12 slides, in English and Russian. It has one continuous zoom across two scale frames, a short scene that explains the Omniverso model, two lenses, and all four deliveries. A senior manager at Yandex Cloud can watch it.

**Architecture:** This is a content plan. It writes job data under `studio/jobs/arc-science/` and runs engine commands from Plans 1–6. It adds no engine code. If a step needs an engine feature that does not exist, STOP and ask the owner.

**Spec:** `.\docs\superpowers\specs\2026-10-31-engine-design.md` (sections 1, 5, 15) and the Arc Science `concept/` notes (`roadmap.md` v8, `arc-harness-agent-design.md` v3, `arc-native-transition.md`, `tree-hoh.md`, `super-agent-validation.md`). The owner fixed the pilot order: Arc Science first, Miraeles second, the ML explainer as a showcase.

## Global Constraints

- Executor: Claude Sonnet 5.5 High. Follow the index rules 1–15 (`2026-10-31-studio-00-index.md`, section 3).
- Job folder: `studio/jobs/arc-science/`. Main file: `studio/jobs/arc-science/job.json`. Write no files outside this folder, except the ledger `studio/ledger/plan7.md` and the outputs that engine commands write to `studio/out/`.
- Folders outside `studio/` are read only, and are always named by absolute path: `.\stage\`, `.\film\`, `.\motion\`, `.\data\pdb\`, `.\struct\`, `.\qa\`, `.\tokens\`, and the Arc Science `concept/` folder (`roadmap.md` v8, `arc-harness-agent-design.md` v3, `arc-native-transition.md`, `tree-hoh.md`, `super-agent-validation.md`). The legacy Python port-8080 desktop app and `decks/arc-science-yc` were retired on 2026-11-04 (`concept/roadmap.md` v8); never reference port 8080 or the retired Python service.
- Evidence ceiling for this product: `architecture`, `published`, `target` (`concept/roadmap.md` v8 and `motion/projects/*.json`). Facts about one project also obey that project's own file in `.\motion\projects\`:
  - `omniverso.json`: architecture, published;
  - `snoggo.json` and `rnav-g.json`: read them yourself;
  - `arc-chemistry.json`: target, published.
  No fact may carry `measured` or `simulated` unless its project file allows it. Obey policy section 13 rule 10 by stating which parts run today (Phase 0 and Phase 1 Arc Harness app, Cammut gateway, Molecullage `bd96b6d` 231-source library and eight-domain atlas, Phase 3 local branch modules). Also state which parts are designed (Phase 4 Research session UI, seats, trained Omniverso weights).
- Facts come only from the sources in Task 2 and `studio/library/references.json`. Every 2D icon, 3D model, HDRI, structure and paper must resolve through `studio/library/sources.json` and `studio/library/references.json` (`npm run check:studio`, rule 53). A fact with no source in that list is a GATE question to the owner. Never invent one.
- Cammut, Molecullage, and **Arc Kit** (`arc-core` MCP, the **Shelf**, and **Workshop toolpacks**) are shown as parts of Arc Harness (`concept/roadmap.md` v8, `concept/arc-harness-agent-design.md` v3).
- Every diagram or schematic (including Slide 6 Omniverso model and Slide 10 Tree-HoH and Claim graph) must obey the 56-rule anti-overplating grammar (`.\docs\grammar.md` rules 39 to 56). Use boxes for operations only, keep zero nested boxes (`overplate = 0`), use at most 5 pale tint groups and 80 words on a model schematic, and draw neural layers by shape.
- No slide carries a status mark or a claim badge (house style). The evidence level lives in `facts`, in the speaker notes and in the source line.
- Languages: English and Russian. Russian follows `<local-path>`. No phrase from `refused.en.txt` or `refused.ru.txt` in the same folder may appear.
- Lenses: `journal` and `cinematic` (Plan 1 ships both).
- Roles: use only the 12 roles that both lenses style (Plan 2): `plastic`, `liquid`, `antibody`, `protein`, `nucleic-acid`, `gold`, `strip`, `line`, `diagram`, `tile`, `shape`, `label`. A new role is a STOP: ask the owner.
- The site opens over http only (the Vercel link, or `npm run preview`), never from `file://`.
- Every commit follows the commit GATE of Task 0, and commits stay local unless the owner gives a separate push approval.
- Structures are read from `.\data\pdb\`. Never commit `1A34-assembly1.cif`, `181L*` or `1A34*` from that folder. Any new structure download is a GATE.
- All commands run from the `studio/` folder.

## Review Focus

1. **A number on a slide differs from its source.** For example, the contact counts 24, 18 and 55, or the parameter counts 255,873,676 and 153,102,091. Task 2 records each number once in `facts`, and the story cites it by fact id. The Task 3 check fails when a slide's text holds a number that its cited facts do not contain.
2. **A claim reads stronger than its evidence level.** For example, "Omniverso designs antibodies" when no model is trained. The overclaim read in Task 10 runs before the blind read, and every flagged sentence is rewritten.
3. **Russian text overflows its box.** The export checks of Task 8 must list no `overflow` finding for `ru`.
4. **The zoom jumps or shakes at the frame change between `complex` and `site`.** The Task 6 storyboard frames and the Task 8 stills are compared by eye, and the Plan 1 pixel test is rerun on this job.
5. **A hand edit is lost after a re-render.** Task 12 re-exports after every edit and compares the stills.

---

### Task 0: Start

**Files:**
- Create: `studio/ledger/plan7.md`

- [ ] **Step 0: GATE and branch.** Ask the owner: "May I make local commits on branch `studio/plan7`, and run `npm ci` with the approved versions?" His yes to commits is the commit GATE for every commit in this plan. Stop until he answers. Then create the branch with superpowers:using-git-worktrees, cut from the tip of `studio/plan6`, so the code of Plans 1–6 is present. Write the tip's commit id in `plan7.md`. If `studio/plan6` does not exist, STOP and ask. Then run `npm ci` in `studio/`. It installs only the versions in the lockfile that the owner approved in Plan 1 (gsap in Plan 4, vercel in Plan 6). Expected: exit code 0, and no change to `studio/package.json` or the lockfile.
- [ ] **Step 1: Read.** Read the index, the design, and the hand-overs of Plans 1–6 in their ledgers (`studio/ledger/plan1.md` … `plan6.md`). Note in `plan7.md` the exact job fields that Plans 2–6 added. Index section 2 lists them. If a ledger shows a name that differs from the index, stop and ask (index rule 6).
- [ ] **Step 2: Recall.** Run `hindsight/recall` with the query "Arc Science pitch deck facts, Yandex Cloud deck, approved slide order", the tags `["project:Omniverso"]` and budget `mid`. Paste the ids of the notes you use into `plan7.md`.
- [ ] **Step 3: GATE: time budget.** Ask the owner in one line: "How long may the Arc Science deck take: a few hours, a working day, overnight or a few days? Please give a number of hours." Record the number of hours in `plan7.md`. The brief stores hours (0.5 to 120). If he names only a period, ask him for the hours.

### Task 1: Brief

**Files:**
- Create: `studio/jobs/arc-science/job.json` (field `brief`, plus the Plan 1 fields left empty)

- [ ] **Step 1: Write `brief`** in exactly the shape of the Brief type in `studio/core/brief.ts` (Plan 6): `{ idea, details, concepts, audience, product, langs, lens?, timeBudget: { hours }, files }`. Fill it with these values:
  - **idea:** "Arc Science is a computational platform for designing biomolecules. One shared base serves four projects. Omniverso is the first."
  - **details:** "A 12-slide pitch deck. Lenses: journal and cinematic. Check-ins: one storyboard stop. Outputs: live deck, MP4, PDF, web link."
  - **concepts:** `["four projects on one shared base", "Omniverso and its nanobody target", "the model in brief", "how research is checked", "the request to Yandex Cloud"]`
  - **audience:** "a senior manager of Yandex Cloud and the Yandex Cloud science programme lead".
  - **product:** `"arc-science"`.
  - **langs:** `["en","ru"]`.
  - **lens:** leave it out. Both lenses are delivered, and `details` names them.
  - **timeBudget:** `{ "hours": <the number from Task 0> }`.
  - **files:** `[]`. The figure of Task 9 is added here when the owner gives its path.
- [ ] **Step 2: Validate.** Run `npm run check -- arc-science` (Plan 6, Task 3 Step 4a). Expected: findings only for fields that later tasks fill, and none with the prefix `brief:`. Write the findings in the ledger; they must all be gone by Task 8. If the command does not exist, STOP and ask.

### Task 2: Research ledger

**Files:**
- Modify: `studio/jobs/arc-science/job.json` (field `facts`)

**Sources:** read them, and take text only from them.
- A. `.\motion\films\arc-science-pitch-2.film.json`: the scene steps and claims.
- B. `.\motion\films\arc-science-pitch-2.notes.md`: the sections "Data and sources" and "Claim boundary".
- C. Arc Science `concept/roadmap.md` (v8, 2026-11-08), `concept/arc-harness-agent-design.md` (v3, 2026-11-08), `concept/arc-native-transition.md` (`N0` to `N9`) and `concept/tree-hoh.md` (Tree-HoH likelihood-ratio scoring, Sequential Halving $\eta = 3$, VOI/cost ordering, paired bootstrap patch gate). These supersede the retired `decks/arc-science-yc/` files.
- D. `studio/library/references.json`, `studio/library/sources.json` (231 sources) and `studio/library/atlas/domains/*.json` (eight domains, consolidated at commit `bd96b6d`).
- E. `.\motion\films\assets\contacts_1MEL.json`, `.\data\pdb\1MEL.pdb` and its `.record.json`.
- F. Cammut notes of 2026-10-23 to 2026-11-08 about Cammut, Molecullage and Arc Kit inside Arc Harness (from the Task 0 recall).

- [ ] **Step 1: Write these facts,** one entry each, with `text.en`, `text.ru`, `level`, `source` and `usedBy`. Copy the wording from the source, and shorten only if needed.
  - Each fact has one level only.
  - A `file` source `ref` is the repository path under `.\` (or `concept/`), with the `#` part naming the scene or section. Tools resolve it against that folder, never against `studio/`.
  - `usedBy` lists the layout block ids and world object ids that show the fact. Block ids follow the convention `s<NN>-<role>`, where `<NN>` is the stop number in two digits and `<role>` is `title` or `label-1` to `label-3` (for example `s03-title`, `s03-label-2`). Write each fact's `usedBy` from the story table of Task 3. Task 4 Step 3 creates exactly these blocks.

| id | Content (from source) | level | source |
|---|---|---|---|
| `f-platform` | Arc Science (Arc Harness) is a scientific harness and computational platform for designing biomolecules (A, as-01; C `roadmap.md#direction`) | architecture | `{kind:'file', ref:'motion/films/arc-science-pitch-2.film.json#as-01-title'}` |
| `f-four` | Four projects stand on one shared base: Omniverso, Snöggo, RNAv-G, Arc Chemistry (A as-02) | architecture | file, A `#as-02-platform` |
| `f-proj-omniverso` | Omniverso designs VHH nanobodies and antibodies for a chosen antigen (A as-02) | architecture | file, A `#as-02-platform` |
| `f-proj-snoggo` | Snöggo estimates ΔΔG of binding for β-tubulin mutations (A as-02) | architecture | file, A `#as-02-platform` |
| `f-proj-rnavg` | RNAv-G describes viral capsid assembly and genome placement (A as-02) | architecture | file, A `#as-02-platform` |
| `f-proj-chem` | Arc Chemistry selects extractants to separate neodymium and praseodymium (A as-02) | target | file, A `#as-02-platform` |
| `f-workspaces` | Unified C2 console with four workspaces (Research, Memory, Molecullage, Prose) and four connectors (Servers, Keys, Apps, Audit) (A as-02; C `roadmap.md#phase-1b`) | architecture | file, A `#as-02-platform` |
| `f-cammut` | Cammut keeps memory and connectors; Arc Kit shares `arc-core` MCP, the 231-source Shelf and Workshop toolpacks; Molecullage is the film and figure engine (`bd96b6d`) | architecture | `{kind:'file', ref:'studio/library/sources.json#summary'}` |
| `f-1mel` | PDB 1MEL: camel VH in complex with lysozyme, 2.5 Å | published | `{kind:'doi', ref:'10.1038/nsb0996-803'}`, with `checked` set by Step 1a |
| `f-contacts` | In PDB 1MEL, 24 lysozyme residues and 18 nanobody residues form 55 residue pairs within 4.5 Å (heavy atoms) | published | doi above, same `checked` date; numbers from E |
| `f-cdr3` | One half of CDR3 contacts the VH region; the other half protrudes and penetrates deeply into the active site of lysozyme | published | doi above, same `checked` date |
| `f-ae` | The autoencoder has 255,873,676 parameters, calculated from module shapes (no weights) | architecture | file, A `#om-02-autoencoder` |
| `f-dn` | The denoiser has 153,102,091 parameters, calculated from module shapes (no weights) | architecture | file, A `#om-03-denoiser` |
| `f-path` | Training uses a straight path from noise to data; the denoiser learns the velocity, data minus noise | architecture | file, A `#om-05-path` |
| `f-judge` | A judge compares candidates with the target and an off-target panel; a solver picks exactly N designs | architecture | file, A `#om-07-judging` |
| `f-status` | Arc Harness Phase 0–1, Cammut, the Molecullage 231-source library (`bd96b6d`), and the two base network modules exist in code; Phase 4 Research UI and Omniverso weights are designed and not yet trained | architecture | file, A `#as-99-end` |
| `f-tree` | Tree-HoH tests hypothesis branches by likelihood-ratio support score and value of information per cost, pruning weak branches via Sequential Halving (η = 3) into a claim graph (C `tree-hoh.md`, `roadmap.md#phase-3`) | architecture | file, A `#as-06-tree` |
| `f-gpu` | Request: 8,320 GPU-hours on NVIDIA A100 80 GB in Yandex Cloud over 12 months, in two stages (A 2,080 h pilot, B 6,240 h) | target | file, A `#as-99-end` |

  For `text.ru`, use the Russian wording of the same source where one exists (A and C have Russian text). Otherwise translate with the term list.
- [ ] **Step 1a: Check the DOI against Crossref.** The three `doi` facts (`f-1mel`, `f-contacts`, `f-cdr3`) share one DOI. Fetch `https://api.crossref.org/works/10.1038/nsb0996-803` with WebFetch (curl is denied). The title must name the camel VH-lysozyme complex. If the DOI does not resolve or the title does not match, drop the three facts and ask the owner. If it matches, set `checked` to today's date on all three facts. Record the fetch and the title in `plan7.md`. An unchecked DOI is an error (Plan 6 `checkFacts`).
- [ ] **Step 2: GATE: unconfirmed numbers.** Source D lists items 5 and 6 as unconfirmed. Item 5 is the split of hours, about 2,100 for the other projects; item 6 is the GPU-hour price. Ask the owner: "May the deck show the hour split (4,260 Omniverso and 2,140 others) and a price, or only the total of 8,320 hours?" Add `f-gpu-split` only if he says yes. Never show a price without his yes.
- [ ] **Step 3: GATE: missing project facts.** Slides 7–9 need one more fact each, about Snöggo, RNAv-G and Arc Chemistry, beyond `f-proj-snoggo`, `f-proj-rnavg` and `f-proj-chem`. None is in the sources. Ask the owner for one sourced fact per project: the text, the source, and the level within that project's ceiling. Until he answers, each of these slides uses its own `f-proj-*` fact only. A new `doi` fact needs the same Crossref check as Step 1a.
- [ ] **Step 4: Check the ceiling.** Run from `studio/`:
  ```bash
  node -e 'const j=require("./jobs/arc-science/job.json"),p=require("./motion/projects/arc-science.json");const bad=j.facts.filter(f=>!p.allowed.includes(f.level)||!f.source||(!f.source.ref&&f.source.kind!=="engine")||(f.source.kind==="doi"&&!f.checked));console.log(bad.length?"BAD "+bad.map(f=>f.id).join(","):"ok");process.exit(bad.length?1:0)'
  ```
  Expected: `ok`.

### Task 3: Story in both languages

**Files:**
- Modify: `studio/jobs/arc-science/job.json` (field `story`, and `notes` from Plan 1)

- [ ] **Step 1: Write `story`:** 12 slides with `stop` 0–11 in this order. It follows the approved order of the Yandex deck, merging Omniverso into three slides and Snöggo into one.

| stop | Title (en) | Facts | What the picture does |
|---|---|---|---|
| 0 | Arc Science | f-platform | A cloud of points settles into 1MEL |
| 1 | Four projects, one base | f-four, f-proj-omniverso, f-proj-snoggo, f-proj-rnavg, f-proj-chem | Four project tiles grow from one base |
| 2 | The four workspaces | f-workspaces, f-cammut | Four workspaces (Research, Memory, Molecullage, Prose), with Cammut and Molecullage inside |
| 3 | One result, from source to sentence | f-1mel, f-contacts | 1MEL entry → contacts → contact map → one sentence |
| 4 | Omniverso and its target | f-contacts | The complex turns; 55 orange contact lines appear |
| 5 | The loop that reaches in | f-cdr3 | **Continuous zoom** from frame `complex` into frame `site`: CDR3 in the active site |
| 6 | Inside the model | f-ae, f-dn, f-path | A short ML explainer: autoencoder → latent → denoiser on the straight path (the full version is Plan 9) |
| 7 | Snöggo | f-proj-snoggo (+ the owner's fact) | Project tile opens |
| 8 | RNAv-G | f-proj-rnavg (+ the owner's fact) | Project tile opens |
| 9 | Arc Chemistry | f-proj-chem (+ the owner's fact) | Project tile opens |
| 10 | How research is checked | f-tree, f-judge | A hypothesis tree prunes at a fixed budget |
| 11 | What we ask of Yandex Cloud | f-gpu, f-status | The GPU-hour request in two stages; built and designed parts |

  The Russian titles come from sources A and C where they exist. `say.en` and `say.ru` hold 2–4 sentences per slide, built only from the cited facts. `notes` holds the source line and the evidence level of each cited fact.
  After the story is written, fill each fact's `usedBy` with the blocks of the slides that cite it, by the convention `s<NN>-title` and `s<NN>-label-<k>` (stop 3 gives `s03-title`). Add world object ids in Task 4.
- [ ] **Step 2: Check numbers and fact use.** Run:
  ```bash
  node -e 'const j=require("./jobs/arc-science/job.json");const F=Object.fromEntries(j.facts.map(f=>[f.id,f]));let e=[];for(const s of j.story){for(const id of s.facts)if(!F[id])e.push(s.stop+": unknown fact "+id);for(const l of ["en","ru"]){const txt=s.title[l]+" "+s.say[l];const nums=txt.match(/\d[\d,\.\u00a0 ]*\d|\d/g)||[];const src=s.facts.map(id=>F[id]?F[id].text[l]:"").join(" ");for(const n of nums)if(!src.includes(n.trim()))e.push(s.stop+"/"+l+": number "+n+" not in its facts")}}for(const f of j.facts)if(!j.story.some(s=>s.facts.includes(f.id)))e.push("fact unused: "+f.id);console.log(e.length?e.join("\n"):"ok");process.exit(e.length?1:0)'
  ```
  Expected: `ok`.
- [ ] **Step 3: Check refused words.** Run:
  ```bash
  node -e 'const fs=require("fs"),j=require("./jobs/arc-science/job.json");const L=d=>fs.readFileSync("<local-path>"+d+".txt","utf8").split(/\r?\n/).filter(x=>x&&!x.startsWith("#"));let e=[];for(const l of ["en","ru"]){const w=L(l);for(const s of j.story){const t=(s.title[l]+" "+s.say[l]).toLowerCase();for(const x of w)if(t.includes(x))e.push(s.stop+"/"+l+": "+x)}}console.log(e.length?e.join("\n"):"ok");process.exit(e.length?1:0)'
  ```
  Expected: `ok`.

### Task 4: World

**Files:**
- Create: `studio/jobs/arc-science/make_1mel_glb.cxc`, `studio/jobs/arc-science/1mel.glb`, `studio/jobs/arc-science/1mel_site.glb`, `studio/jobs/arc-science/1mel_contacts.glb`
- Modify: `studio/jobs/arc-science/job.json` (fields `world`, `layout` and a placeholder path)

- [ ] **Step 1: Make the meshes with ChimeraX.** Write `make_1mel_glb.cxc`. It opens `.\data\pdb\1MEL.pdb` and makes three exports:
  - the full complex, as a cartoon, saved to `1mel.glb`;
  - CDR3 of chain A with lysozyme side chains within 6 Å, as sticks, saved to `1mel_site.glb`;
  - the contact lines, as pseudobonds drawn as thin cylinders, saved to `1mel_contacts.glb`.

  Take the CDR3 residue range from the PDB record or the film assets, and write it in the script's first comment with its source. If the range is not stated in a source, STOP and ask.
  For the contact lines, the pairs come from `.\motion\films\assets\contacts_1MEL.json` (field `pairs`: chain A residue, chain L residue). Make the `distance` lines with this one-liner and paste its output into the script:
  `node -e 'for(const [a,l] of require("./motion/films/assets/contacts_1MEL.json").pairs)console.log("distance /A:"+a+"@CA /L:"+l+"@CA")'`

  Expected: 55 lines (the pair count of fact `f-contacts`), each joining the Cα atoms of the two residues as a documented drawing choice in the notes of stop 4. If the count differs, STOP and ask. After the script runs, the ChimeraX log must show 55 distances and no "no atoms" or "not found" error; any such error means a residue number is missing in `1MEL.pdb`, so STOP and ask.
  Then, in the script:
  1. run `distance style radius 0.1 dashes 0`, so the lines are thin solid cylinders;
  2. delete the distance labels;
  3. hide atoms and cartoons of the structure;
  4. run `info models` and save only the model that holds the distances: `save 1mel_contacts.glb models <that model id>`.

  Run:
  `"C:\Program Files\ChimeraX 1.10.dev202504170618\bin\ChimeraX-console.exe" --nogui --script make_1mel_glb.cxc`
  Expected: all three files exist, each under 15 MB.
- [ ] **Step 2: Write `world`.**
  - Frames:
    - `board` (unit 1e-3, root), for slides 1–3 and 6–11;
    - `complex` (unit 1e-9, inside `board`);
    - `site` (unit 1e-10, inside `complex`).
  - Objects:
    - `mel` (molecule, frame `complex`, asset `1mel.glb`, source pdb `1MEL`, level `published`);
    - `mel-site` (molecule, frame `site`, asset `1mel_site.glb`, same source);
    - `contacts` (kind `mesh`, frame `complex`, asset `1mel_contacts.glb`, role `line`, same position and size as `mel`, source pdb `1MEL`, level `published`);
    - one flat `vector` object per tile, diagram and tree, with `frame: null` on the slide layer, at level `architecture`.
  - Roles: only the 12 roles of the Global Constraints. If an object needs another role, STOP and ask. Adding a role to a lens is an engine change.
  - Add each object id to the `usedBy` of the facts it shows.
- [ ] **Step 3: Write `layout`.** Give each stop a title block `s<NN>-title` and up to 3 label blocks `s<NN>-label-1` to `s<NN>-label-3`, in `en` and `ru`, inside the 48 px safe area. Use exactly the ids that the facts' `usedBy` name, and give each block the attribute `data-block` with its id (Plan 1). The size comes from the block role at 1920 px width (Plan 1 Task 7; stage spec 3): `title` 51 px, `label` 42 px, `note` 37 px. Do not set a size by hand.
- [ ] **Step 4: Validate before the storyboard yes.** A job with 12 stops is big (Plan 6), so `npm run export` refuses it until the owner approves the storyboard. Validate with the check command and stills instead:
  - Write a placeholder deck path `deck-main` with 12 stops at t = 0, 6, 12 … 66 s and the camera at the `board` frame. Task 5 replaces its times and keys.
  - Run `npm run check -- arc-science`. Expected: findings only for fields that later tasks fill (`timeline`, the final path times); none for `brief`, `facts` or `story`. Every block with a digit must be named in some fact's `usedBy`.
  - Cut one still per stop with `stillsAt('arc-science', 'journal', 'en', <the 12 stop times>, 'studio/out/stills/arc-science-draft')` (Plan 6, `tools/still.mjs`). Look at the 12 stills. Expected: 12 PNG files and no blank frame.
- [ ] **Step 5: Commit** `job.json`, the `.cxc` script and the three `.glb` files. This follows the commit GATE of Task 0.

### Task 5: Motion and the camera path

**Files:**
- Modify: `studio/jobs/arc-science/job.json` (fields `timeline` and `paths`)

- [ ] **Step 1: Write the deck path** `deck-main` (kind `deck`) with 12 stops, one per story slide.
  - Each stop holds at least 2.0 s plus 0.3 s per word on screen (stage spec 5).
  - Between stops 4 and 5, the camera keys go from 12 nm off `mel` in frame `complex` to 1.5 nm off `mel-site` in frame `site`, over 3.0 s, with ease `power2.inOut`.
  - The closest camera distance of the zoom is 1.5 nm, so set `swapAt` to twice that: `mel-site.standIn` = `{ asset: '1mel.glb', swapAt: 3e-9 }`. The pixel test then needs the distances 1.5, 3 and 6 nm, and the zoom reaches all three. The stand-in sits on `mel-site`, the far object of the zoom, and points at the asset file `1mel.glb`. `standIn.asset` is always an asset file, never an object id. Far from `mel-site` the camera sees the whole-complex mesh; near it, the exact site mesh (Plan 1: `swapAlpha` is 0 for the exact asset and 1 for the stand-in).
- [ ] **Step 2: Write the tracks** for stops 0, 3, 4, 6 and 10, as in Task 3's table. Use the eases `power2.out` and `power2.inOut` only. One focus moves at a time (stage spec 5).
- [ ] **Step 3: Rerun the zoom pixel test on this job.** Run `STUDIO_JOB=arc-science node --test tools/pixels.test.mjs` (Plan 1 Task 7 reads `STUDIO_JOB`). The test reads the stop count from the job, and reads `swapAt` from the first object that has `standIn` (here `mel-site`), and tests the distances `swapAt/2`, `swapAt` and `swapAt·2` (here 1.5, 3 and 6 nm). It uses the page-default path and the consecutive key pair whose camera-distance range contains all three. Expected: PASS. If it fails with `stand-in distances not reached`, STOP and ask. If the test cannot target another job, STOP and ask.
- [ ] **Step 4: Commit** `job.json`. This follows the commit GATE of Task 0.

### Task 6: Storyboard stop (GATE)

- [ ] **Step 1:** Run `npm run storyboard -- arc-science`.
  Expected: a contact sheet with 12 frames and the story text, at the path Plan 6 names.
- [ ] **Step 2: GATE.** Send the contact sheet to the owner (with the file-sending tool if you have one; otherwise give its full path). Ask: "Is this storyboard right, or what should change?" Apply each change, then rerun Step 1 and ask again. Do not start Task 7 before his yes. After his yes, set `storyboard.approvedAt` in `job.json` with his words as `note` (Plan 6 Task 6). Export, PDF and site stay refused until then.

### Task 7: Lenses, live renders and the photoreal shot

- [ ] **Step 1:** Export all four combinations at 30 fps, one at a time:
  - `npm run export -- arc-science --lens journal --lang en --fps 30 --workers 2`
  - the same with `--lang ru`;
  - then both languages with `--lens cinematic`.
  Expected: four MP4s and four `checks.json` files.
- [ ] **Step 2:** Add one shot to `job.json`, in Plan 3's `Shot` shape: `{ "id": "zoom", "path": "deck-main", "t0": <zoom start>, "t1": <zoom end>, "fps": 30, "render": "baked", "settings": <Plan 3 DRAFT values> }`. The times are the zoom segment's times in `timeline`. Then run `npm run bake -- arc-science --shot zoom --draft`.
  Expected: draft frames, with the per-frame time logged. Estimate the full time as frames × time per frame, using the `FINAL` settings (Plan 3).
- [ ] **Step 3: GATE when the estimate is above 30 minutes.** Ask the owner with the estimate. On a yes, switch the shot's `settings` from `DRAFT` to Plan 3's `FINAL` (1920×1080, 256 samples, denoise on) in `job.json`, then run the same bake command without `--draft`, at low priority.
- [ ] **Step 4: Commit** `job.json`. This follows the commit GATE of Task 0.

### Task 8: Fix the export findings

- [ ] **Step 1:** Read all four `checks.json` files. For each `overflow`, shorten the text or enlarge its box in `layout`. For each `small-text`, give the block the role whose size fits (`title` 51 px, `label` 42 px, `note` 37 px at 1920 px width): the size comes from the role. For each `offscreen`, move the block inside the safe area.
- [ ] **Step 2:** Re-export the four combinations.
  Expected: every `checks.json` holds an empty findings list.
- [ ] **Step 3: Commit** `job.json`. This follows the commit GATE of Task 0.

### Task 9: Raster rebuild of the Omniverso architecture figure

The rebuild always goes through a scratch job, never into the pilot job directly (Plan 4, Plan 5). The scratch job here is `arc-science-fig`.

- [ ] **Step 1: GATE: the figure file.** Source B names the manuscript figure `fig_arch_h` and its caption `captions/fig_arch.md`, which are not in the Molecullage repository. Ask the owner for the path of the PNG, and for leave to use it in the deck. It is his own figure, so no outside licence applies, but ask.
- [ ] **Step 2: Write `reading.json`.** Look at the picture. Write `studio/jobs/arc-science-fig/reading.json` by the Plan 4 schema (`studio/tools/rebuild/reading.ts`, Plan 4 Task 4), following the rules of that task and the 56-rule anti-overplating grammar (`.\docs\grammar.md` rules 39 to 56). Keep boxes for operations only, zero nested boxes (`overplate = 0`), at most 5 pale tint groups, at most 80 words, and neural layers drawn by shape. Run `checkReading` on it. Expected: `ok: true`.
- [ ] **Step 3: Rebuild into the scratch job.** Run `npm run rebuild -- <png path> --job arc-science-fig`. Expected: `studio/jobs/arc-science-fig/job.json` with named vector objects, and a `rebuild-report.json`.
- [ ] **Step 4: Score.** Run `npm run score -- arc-science-fig --against <png path>`. Expected: a score at or above the pass level that Plan 4's hand-over recorded. If it is below, fix the listed regions in `reading.json`, rebuild and score again, at most twice. Then STOP and ask.
- [ ] **Step 5: Propose the objects for slide 6.** Run `npm run rebuild -- <png path> --job arc-science-fig --into arc-science --stop 6`. Expected: `studio/jobs/arc-science/proposed.json` with `add` edits for the scratch job's objects and vectors, placed at stop 6, and a printed diff.
- [ ] **Step 6: GATE, then apply.** Show the owner the diff. After his yes, run `npm run edit -- arc-science --apply`. Expected: `proposed.json` is renamed to `proposed.applied-<ms>.json`, and `npm run check -- arc-science` shows no new finding.
- [ ] **Step 7: Commit** `job.json`, `edits.jsonl` and the scratch job folder. This follows the commit GATE of Task 0.

### Task 10: Review: overclaim read, then blind read

**Files:**
- Create: `studio/jobs/arc-science/review/stills/<stop>-<lens>-<lang>.png` (48 files), `studio/jobs/arc-science/review/<stop>.notes.md` (12 files)

- [ ] **Step 1: Cut the stills.** For each stop s at time T (from `paths`), and each lens and language, run:
  `ffmpeg -y -ss <T+hold-0.1> -i out/arc-science-<lens>-<lang>.mp4 -frames:v 1 jobs/arc-science/review/stills/<s>-<lens>-<lang>.png`
- [ ] **Step 2: Overclaim read.** A fresh Sonnet agent reads `story`, `facts` and the English stills. It lists every sentence or picture that claims more than its fact's level allows. Rewrite each one, then redo Task 7 Step 1 and Step 1 of this task.
- [ ] **Step 3: Blind read and anti-overplating check.** Verify that `npm run check:studio` passes and that Slide 6 and Slide 10 schematics have zero nested boxes (`overplate = 0` under `.\docs\grammar.md` rules 39 to 56). Then, for each stop, a fresh agent sees only the journal-en and journal-ru stills of that stop. It answers the three questions of `.\qa\blind_read.md`. Fix every item of questions 2 and 3. Re-export, then repeat until a round finds nothing.
- [ ] **Step 4: Notes files.** Write `review/<stop>.notes.md` for each stop, with:
  - the message in one sentence;
  - facts and sources;
  - the claim boundary;
  - the export-check result;
  - the blind-read date and outcome;
  - the ten-second sentence.
  Add one line: Studio slides are not figure pages, so `build_figure` and `qa_figure` do not apply; the export checks replace them (the same practice as `.\motion\films\arc-science-pitch-2.notes.md`).

### Task 11: Deliveries

- [ ] **Step 1:** Run `npm run narrate -- arc-science --lang en`, then `--lang ru`. Re-export both languages with narration.
- [ ] **Step 2:** Run `npm run pdf -- arc-science --lens journal --lang en`, and the same for `ru`.
  Expected: two PDFs of 12 pages.
- [ ] **Step 3:** Run `npm run site -- arc-science`.
  Expected: the folder `studio/out/site/arc-science/`. Serve it over http (`python -m http.server 4390 --bind 127.0.0.1` in that folder) and check that the deck plays with presenter view. Do not open it from `file://`.
- [ ] **Step 4: GATE.** Ask the owner: "May I publish the Arc Science deck to Vercel?" On a yes, run `npm run publish -- arc-science --approved` and record the link in `plan7.md`. Without his yes, do not run it.
- [ ] **Step 5: Commit** the changed job files and `plan7.md`. This follows the commit GATE of Task 0.

### Task 12: One hand edit in each of the four ways

Make each edit, re-export `journal`/`en`, cut the still of that stop, and confirm by eye that the change is there. Then re-export once more and confirm that it stays.

- [ ] **Step 1: Click and change.** In the studio editor, click the English title block `s01-title` of stop 1 and make the title box 6 px taller and change its text to "Four projects, one shared base" (the wording of fact `f-four`). The inspector's layout row sets only the box and the text (`set /layout/<i>/blocks/<j>/box` and `.../text`). It has no colour or size field: a colour change goes through a role, so this step does not change colour. The box change shows in `edits.jsonl`. Use the in-app browser.
- [ ] **Step 2: Timeline.** Move the entrance of the contact lines on stop 4 0.4 s later.
- [ ] **Step 3: Words.** Run `npm run edit -- arc-science --words "slow the zoom into the loop by one second"`. The command prints a summary. Write the edits to `studio/jobs/arc-science/proposed.json`, run the command again to print the diff, and show the diff to the owner. After his yes, run `npm run edit -- arc-science --apply`.
  Expected: the stop 4→5 segment lasts 4.0 s.
- [ ] **Step 4: 3D camera.** In the editor, move the camera at stop 0, save the view as a shot, and set it as stop 0's key.
- [ ] **Step 5:** Re-export all four combinations.
  Expected: all four edits are visible, and every `checks.json` is empty.
- [ ] **Step 6: Commit** `edits.jsonl` and the changed job files. This follows the commit GATE of Task 0.

### Task 13: Hand-over

- [ ] **Step 1:** Complete `studio/ledger/plan7.md`. List every task, its commands and outcomes, the owner's answers, and every open item.
- [ ] **Step 2:** Run `hindsight/retain` with one note: the Arc Science pilot status, the output paths, the blind-read outcome and the published link if any. Tags: `["project:Omniverso","date:YYYY-MM-DD","source:claude-code","topic:molecullage-studio"]`. Check it with `get_operation`, and read it back with `hindsight/recall`.
- [ ] **Step 3:** Tell the owner in plain English: what was built, where the four deliveries are, what is still open, and that nothing is pushed.
