<!-- version: d1 | date: 2026-10-31 | status: draft for the owner's approval -->
# Molecullage Studio: design

This is the design for a new engine. It turns an idea into finished visual work: decks, films, posters, infographics and 3D scenes. It comes from the owner's brief and five rounds of questions on 31 October 2026 (prompts D-20261031-06 to -14).

Marks used below:
- **the owner** means he decided it.
- **Claude's call** means the author chose it, and the owner can overrule it.
- **Open** means only the owner can answer it.

The engine is called **Molecullage Studio** (the owner). Its code lives in a new `studio/` folder of the Molecullage repository (folder name: Claude's call). Below, "the engine" means Molecullage Studio.

---

## 1. Intent

the owner gives the engine an idea, a few technical details and the main concepts. The engine returns finished, designed work that he can show to a senior manager at a cloud company such as Yandex (the owner).

The engine is general. It serves any field: machine learning, devices, lab methods, business, chemistry, biology (the owner). Science is one field among many.

The reason: the owner builds several products (Arc Science, Omniverso, Snoggo, RNAv-G, Miraeles). Each needs pitch decks, explainer films and figures. Today each piece is drawn by hand or with tools that each do one part. The engine joins the parts.

The engine has its own character. It is a synthesis: it takes the best ideas from GSAP, motion-design tools, 3D programs and the Molecullage kit, and rethinks them (the owner). It is not the Molecullage deck rules with extra parts. Square corners and a fixed list of required elements are not the house look (the owner, 31 Oct).

### Two examples from the owner

**A machine-learning model.**
- The engine draws diagrams that explain every part of the model, as NVIDIA's explainer videos do.
- Each part has a short note on the background idea beside it.
- It shows how the model runs on the hardware, and why.
- The animated result shows how each step adds to the outcome.
- It is delivered as a demo, a deck and an animation.

**The MIRA-NALFIA mechanism (Miraeles).**
- The mechanism comes from drawings in the literature.
- It plays inside a photorealistic 0.2 mL PCR tube, with real proteins (from PDB or predicted), nucleic acids and buffer.
- Then the camera zooms out to the whole test. It shows a textured lateral-flow strip and gold nanoparticles carrying antibodies.
- The output is a styled still image and a motion-design scene in the web studio.

Every example must reach this depth (the owner): real objects, real data, and a camera that goes from inside to the whole.

## 2. Who uses it and how a job starts

- **Users:** the owner and his team first, in a private web studio. Outside clients later. Build for the owner first, and keep the design ready to grow (the owner).
- **Starting a job:** in chat with Claude, or in the web studio page. Both see the same projects (the owner).
- **Check-ins:** they depend on the job. Small jobs run alone to the end. Big pitches stop once at a storyboard for his approval (the owner).
- **Languages:** English and Russian. A job can come out in one language or both (the owner).

## 3. Goals, non-goals, anti-goals

**Goals**
1. Idea in, finished work out, with research, story, narration, design, 3D, motion and checks done by the engine (the owner).
2. First product: the animated pitch deck (the owner).
3. Photorealistic and cartoon 3D in the same job, chosen per scene (the owner).
4. Faithful rebuild of raster pictures as vectors or 3D models, either projected to 2D or used as 3D (the owner).
5. Four delivery forms from one job: live browser deck, video file, PDF handout, private web link (the owner).
6. Every part can be changed by hand afterwards (the owner).

**Non-goals (for the first version)**
- Accounts, billing and client separation. These come with the client stage (Claude's call, matching "built for you first").
- A general 3D modelling program for humans. The 3D tools serve the engine and its editor.
- Live multi-user editing.

**Anti-goals: the engine fails if any of these happens, even when it technically works (the owner)**
1. The result looks generic, like a template or a typical AI picture.
2. A fact, number, protein or part is wrong and shown with confidence.
3. One slide, colour or camera move is hard to change by hand.
4. A full deck or film takes too long to come back.

## 4. The core idea: one world per job

The engine builds one **world** for each job (Claude's idea, approved by the owner on 31 Oct).

- **World:** every object of the job in one shared space with one clock. Objects are proteins, tubes, strips, diagrams, labels, numbers and charts. Each object knows its size, its source and how sure we are of it.
- **Camera path:** a route through the world over time. A deck is a camera path that stops at slides. A film is a camera path that does not stop. A poster is one frozen frame. The web page is a path the viewer drives.
- **Lens:** the look. A lens restyles the whole world: colour, light, materials, type, corner radius, line weight and motion feel. The world stays the same.

Why this shape:
- One change made in the world shows up in the deck, the film and the poster together. This answers anti-goal 3.
- A zoom from a molecule to the whole test is a camera move in one space, with no cut between separate pictures. This is what the MIRA-NALFIA example needs.
- The same world can wear any lens. This gives "a new look per project" without a new drawing per look.

Scale is the one place where a single world is not enough. A protein is about 5 nm, a PCR tube is about 2 cm, and a test strip is about 6 cm. That is seven orders of magnitude, and ordinary 32-bit numbers shake at that range. The world therefore holds **nested scale frames**:
- Each frame has its own unit.
- Each frame is drawn relative to the camera, so the numbers stay small and the picture stays steady.
- The camera passes from one frame to the next with a labelled scale change.
- A scene marks when sizes are stretched for clarity (the owner: exact close-ups, simpler stand-ins in wide shots).
- The swap from an exact close-up to a stand-in is a designed, visible moment, such as a cross-fade at a scale label. It is the hardest visual problem of the engine, so the pilot tests it first (Claude's call, after review).

Two limits found in review (Claude's calls):
- **A lens is more than colour.** A photoreal gold particle and a cartoon one need different meshes, light and detail. A lens therefore swaps the asset for each role, as well as its colour and material.
- **A slide is more than a camera stop.** Each stop of a deck path carries a flat layout layer for titles, labels and notes. It is laid out once per language, because Russian text runs longer. The world owns its content; the lens owns its look.

## 5. A job from start to end

| Stage | What happens | Who checks |
|---|---|---|
| 1. Brief | Read the idea, details, concepts, attached papers and pictures. List what is missing. | The engine asks the owner only when a gap changes the result. |
| 2. Research | Find facts and numbers with sources. Fetch structures (PDB, AlphaFold DB), object references and figure drawings. Every fact gets a source and an evidence level. | Fact check against the source. |
| 3. Story | Write the slide-by-slide story, the words on screen, the narration and speaker notes, in both languages. | Plain-language and style check. |
| 4. Storyboard (big jobs only) | Rough frames of every step, with the story. | the owner approves (the owner). |
| 5. World | Build every object: 3D models, molecules, diagrams, charts, rebuilt raster pictures. Place them in scale frames. | Shape and size check against references. |
| 6. Motion | Write the motion of every object and camera on the one clock. | Motion check: timing, readability, no motion without meaning. |
| 7. Lens | Apply the chosen look preset, or design a new one for this job. | Look check against the anti-goals. |
| 8. Render | Live preview in the browser. Final frames on the graphics card; extra work on the home server. | Pixel checks: cut-off, overlap, text size, contrast. |
| 9. Review | A fresh reviewer sees only the result and says what it shows, what is unclear and what looks wrong. | Fix everything, then render again. |
| 10. Delivery | Live deck, video, PDF and web link, in the chosen languages. | Final check of each form. |
| 11. Edits | the owner changes things by hand or in words. The engine updates the world and renders again. | Same checks on what changed. |

## 6. The world model

Each object in the world has:
- an id that never changes, so motion, edits and checks can name it;
- a kind: molecule, mesh, surface, vector drawing, text, number, chart, image, group;
- a scale frame and a size in real units;
- a source (DOI, PDB id, URL, file, or "drawn by the engine") and an evidence level;
- a time window, when it exists on the clock;
- its look roles (for example "antibody", "gold", "plastic", "label"), which the lens turns into colours and materials.

Evidence levels reuse the existing scheme in `motion/core/schema.js`: measured, published, simulated, architecture, target (Claude's call). A picture never shows a higher level than its source has (house rule "Honesty in pitch material").

The clock reuses the rule all current engines share: every frame is a pure function of time t. The same t always gives the same picture. This makes preview, video and PDF agree (Claude's call; the deck, film, stage and motion engines already work this way).

## 7. The 3D toolkit

the owner asked for four abilities from the large 3D programs. Each gets its own module and its own documentation (the owner). Each is a clean-room rebuild: we study public manuals and observed behaviour, write our own code, and copy no code, file formats behind a licence, icons or names (Claude's call, needed to keep the engine free to sell).

| Module | What it does | Known from | First use |
|---|---|---|---|
| Surfaces | Exact smooth shapes with real sizes: tubes, caps, housings, cassettes, strips | Rhino | The 0.2 mL PCR tube from its drawing dimensions |
| Copies and effects | Many copies of an object that move and react together: arrays, scatter, fields that push or fade them | Cinema 4D | Gold particles, buffer molecules, many amplicons |
| Moving parts | Joints, hinges, bending, constrained motion | Maya | A tube lid that opens, an antibody arm that flexes, a strip that bends |
| Materials, light and camera | Plastic, glass, liquid, metal and gold that look real; studio light; a film camera with lens, focus and depth | All three plus Blender | The photorealistic tube and the strip close-up |

Each module's documentation has:
- what it does;
- every setting, with its unit and range;
- a live demo;
- a test that checks the result by numbers.

**Blender's role:** start with Blender for final photorealistic frames, then replace it step by step with the engine's own tools (the owner). The first bridge sends the world to Blender as glTF 2.0 with materials and camera, renders with Cycles from the command line, and brings frames back (Claude's call). Headless Blender 5.2.2 rendering already works on this machine (`struct/denoise/render_blender_assets.py`). The bridge from the world to Blender is new work.

## 8. Rebuilding a raster picture

Input: a picture from an image model or a figure from a paper. Output: the same picture rebuilt so it can move, with nothing cut off and everything aligned (the owner, 30 Oct).

1. **Read** the picture: find its parts (shapes, arrows, text, molecules, objects, backgrounds) and their positions.
2. **Decide** each part's best form:
   - a vector drawing for diagrams and icons;
   - a real structure for a molecule that matters;
   - a 3D model for an object;
   - text for words;
   - the original pixels for texture that adds nothing as vector.
3. **Rebuild** each part in the world at its measured position and size.
4. **Measure** the match: overlay the rebuild on the original and score the difference. Report what differs, and where.
5. **Adapt** with care: fix misaligned parts and wrong labels, and keep everything else as the picture had it.

The match score is stored with the job, so a rebuild is never called faithful without a number (Claude's call). The w03 design (WIKI.md A.3) already describes this with a measured residual. Its test set needs five mock-ups from the owner.

## 9. Looks

The engine picks a look per project; there is no single house style (the owner). It ships with presets:

1. Soft, deep and glowing (rounded shapes, soft light, depth, smooth motion)
2. Bold magazine (big type, strong colour blocks)
3. Engineering blueprint (precise lines, measured drawings, exploded views)
4. Journal figure (calm and exact, top-journal figure style)
5. Playful cartoon (rounded, friendly, bright)
6. Dark cinematic (dark stage, dramatic light, product-launch feel)
7. Clean corporate (calm and tidy, for boardrooms)

All seven are the owner's choices. More presets can follow.

A lens is a set of values: colours by role, materials by role, type, sizes, corner radius, line weights, shadow and glow, and the motion feel (speed, easing, how much things overlap in time). The Molecullage kit becomes one lens, close to "journal figure" (Claude's call). It stops being the rule for every job.

Readability rules hold under every lens: minimum text size, contrast, colour-blind safety and no motion without meaning (Claude's call; these protect anti-goal 2 whatever the look).

Works the owner admires, to study for each lens:
- the GSAP site;
- NVIDIA explainer videos;
- Apple launch films;
- Kurzgesagt;
- 3Blue1Brown;
- Stripe-style web pages.

## 10. Editing by hand

the owner wants all four ways, and every one of them edits the same world (the owner):

1. **Click and change:** click any object on a slide or in a scene, then change text, colour, size or position.
2. **Timeline:** tracks like a video editor, to move when things appear and how they move.
3. **Words:** "make the tube bigger and slow the zoom". The engine turns this into world edits and shows what it changed.
4. **3D camera:** drag the camera in a scene, then save that view as a shot.

Every edit is stored as a small change to the world, with undo. The engine never loses a hand edit when it renders again (Claude's call; this protects anti-goal 3).

## 11. Rendering and machines

- **Preview:** live in the browser while working (the owner).
- **Final frames:** on the graphics card, photorealistic where the lens asks for it (the owner).
- **Home server:** a Linux PC with many CPU cores and no large graphics card. It takes CPU-heavy work: video encoding, rebuild matching, research fetching, and CPU path tracing for frames that can wait (the owner gave the machine; the split of work is Claude's call).
- At most two heavy processes at once on the laptop (house rule).

## 12. Delivery

From one job (the owner):
- a live browser deck, clicked through in a meeting, with presenter notes;
- a video file, with or without narration;
- a PDF handout of still pages;
- a private web link the manager can open later.

Narration uses the existing voice paths (Fish Audio through Composio, or the Windows voice) in English and Russian (Claude's call, reusing `film/tools/narrate.py` and `film/tools/fishvoice.py`).

## 13. What exists and how it is used

the owner's machine already holds four engines. Each one does part of the job. The new engine takes the working parts and leaves their limits behind (Claude's call).

| Existing | Where | What the new engine takes |
|---|---|---|
| Deck engine | `deck/` (branch `claude/deck-engine-80899b`) | Slide manifest, presenter view, exports to HTML, PDF, PNG, MP4 and GIF, deck QA |
| Film engine | `film/` | Beats as pure functions of t, frame-exact render in headless Chrome, narration with word times, ffmpeg joining, ChimeraX and Blender picture layers |
| Stage engine (spec and code) | `stage/` (`SPEC.md`, `src/`, `exporters/`, `tools/`, `voice/`) | One self-contained HTML file; GSAP timelines held paused and set by `seek(t)`; edit mode that saves a copy. Stage chose 3Dmol.js for live molecules; this design moves to molecule meshes in one three.js world (section 14a.6). |
| Motion engine | `motion/` | Evidence levels and claims with DOIs (`core/schema.js`), product projects, the Miraeles film as a starting story |
| Figure kit and QA | `kit/`, `qa/`, `struct/` | Becomes the "journal figure" lens; QA checks; ChimeraX structure renders |
| w03 research | `arc-harness/workflows/w03-molecullage-cammut/research/` | Sources, licences and pinned library versions for 3D, 2D, UI and animation |

## 14. Technology (Claude's calls, for review)

- **Language and app:** TypeScript, React 19 and Vite, as the stage spec chose.
- **Motion:** the engine keeps its own timeline data: tracks, keys and easing per object. GSAP 3.15 only plays that data back, held paused and set from the one clock.
  - The GSAP Standard Licence (effective 30 April 2025) is free and covers all plugins.
  - It forbids tools that let users build animations visually without code in competition with Webflow, and Webflow may change it.
  - The studio's timeline editor is exactly that kind of tool. So the editor writes our own data, and GSAP stays a replaceable player (Claude's call, after review).
- **3D in the browser:** three.js, pinned to one release.
  - WebGL 2 is the reference path for the live deck, because a manager's laptop must play it.
  - The WebGPU renderer is used where the browser supports it, and both paths are tested.
- **3D files:** glTF 2.0 between all parts.
- **Molecules:** Mol* or ChimeraX make the shapes from PDB and AlphaFold DB structures. The engine imports them as meshes (section 14a.6).
- **Surfaces:** our own surface code. openNURBS through rhino3dm (MIT, checked) is used only to read and write Rhino files. The word "Rhino" is a trademark and stays out of product text.
- **Layout of diagrams:** ELK for graphs and kiwi.js (Cassowary) for constraints. Both are shown working in w03.
- **Vector tracing for raster rebuild:** vtracer (MIT, checked). Potrace is GPL; it may run as a separate program under licence policy P10, and never inside the product code. Tracers make many unnamed paths, which are hard to edit by hand. So they are used for icons and textures, and diagrams are rebuilt as named objects (section 8).
- **Final photoreal:** Blender Cycles from the command line first. An in-engine path tracer later.
- **Voice:** the existing narration tools.

Every version is pinned, and every library's licence is recorded before use. New installs need the owner's yes (house rule).

## 14a. Settled after the builder check (Claude's calls)

A builder read this design cold and asked where they would have to guess. These answers settle the points that do not need the owner.

1. **Live look and photoreal.** Each scene has two render paths.
   - The live path runs in the browser in real time, for the clicked deck and the web link.
   - The photoreal path bakes frames with Blender and plays them back by t.
   - In a photoreal shot, the live deck shows the baked frames, so the camera follows the saved path there. Free camera moves work in live scenes only.
   - "The same t gives the same picture" holds inside each path. The live path is a stand-in for the photoreal look; it does not match it pixel for pixel.
2. **Where the language model runs.** In the pilot the engine is a library with a command line. A Claude Code session drives the research, story, review and "words" edits. The studio page views the job and makes hand edits. Starting a job from the studio page alone needs a server that calls a model; that comes after the pilot.
3. **Raster rebuild.** The rebuild is agent-assisted. Claude reads the picture, measures the layout and writes the world objects. A tracer turns marked regions into vector shapes. Objects come from the surfaces module or a model library, with no image-to-3D model in the pilot. The overlay score checks the result. The pilot reports the score and sets a pass level after seeing the first five mock-ups.
4. **Surfaces in the pilot.** The pilot builds the tube and the strip from exact profiles: revolve, loft and extrude, with true dimensions, turned into smooth meshes. A full NURBS kernel with trims, fillets and Rhino file exchange comes later.
5. **Copies, effects and simulation.** Motion of many copies is seeded and computed from t, so seeking works. A real physical simulation is baked once into a cache keyed by t, and the frames read the cache.
6. **Molecules.** Mol* or ChimeraX produces the molecule shapes. The engine brings them into the one world as meshes, so they take the lens materials, the shared light and the camera. There is no second canvas.
7. **Existing engines.** The new engine replaces deck, film, stage and motion for new work. The old folders stay as they are, so old decks still build with their own tools. The pilot reuses old tools and schemas: the narration tools, the evidence schema and the ChimeraX and Blender render scripts. It does not import old stories or slide files; the Miraeles story is rewritten in the new format.

## 14b. Review record

- **Builder check (31 Oct):** a fresh Claude Sonnet agent read the design cold. Its questions are settled in 14a, or they are open in section 16.
- **Hard review (31 Oct):** Codex (Astra, Sol) refuses these models on the current ChatGPT account. Argon was refused twice by the server's location check. So a fresh Claude Sonnet agent did the hard review, with web checks of the licences.
- **Changes from the hard review:**
  - camera-relative scale frames and the designed stand-in swap;
  - the lens as an asset swap, and the slide layout layer;
  - our own timeline data with GSAP as the player;
  - WebGL 2 as the live reference path;
  - licences marked checked, and the tracer use narrowed;
  - the Blender bridge marked as new work;
  - the stage engine described correctly;
  - the reuse rule reworded.
- **The hard review's smaller proof:** the owner chose the full pilots instead (31 Oct).

## 15. First milestone

The animated pitch deck (the owner). The pilots are full pilots, with no smaller proof first (the owner, 31 Oct):

1. **Arc Science** first: the whole platform and how its parts fit (the owner).
2. **Miraeles** second: MIRA-NALFIA inside the PCR tube, then the zoom out to the test strip (the owner). `motion/miraeles/` holds a short story to start from.
3. **An ML model explainer** as a showcase: one model explained part by part, NVIDIA style, down to the hardware (the owner). It can be a scene inside the Arc Science deck (Claude's call).

The build still tests the deep zoom in a few frames before anything else, because it is the largest risk (Claude's call).

Each pilot is done when:
1. A 10 to 14 slide deck in English and Russian, from the brief to delivery, with the storyboard stop.
2. At least one continuous zoom across two or more scale frames. For Miraeles this runs from inside the PCR tube to the whole lateral-flow test.
3. Photorealistic objects from the surfaces and materials modules. Proteins come from real structures.
4. At least one figure rebuilt from a literature raster, with its match score.
5. Two lenses applied to the same world, to show the world and the look are separate.
6. All four delivery forms.
7. Every fact with a source and an evidence level. The reviewer finds nothing wrong.
8. A hand edit made in each of the four ways and kept after a new render.

**Time limit (the owner):** it depends on the job. A few hours, a working day, overnight or a few days are all acceptable. At the brief, the engine states a time budget for the job. Anti-goal 4 is measured against that budget.

**Code home (the owner):** inside the Molecullage repository, in a new folder next to `deck/`, `film/`, `stage/` and `motion/`.

**Web link (the owner):** hosted on Vercel. Anyone with the long secret link can open it. Each publish still needs the owner's yes (house rule).

**Main risks and what is done about them (from the hard review):**
1. **Shaking or clipping in the deep zoom, and an ugly stand-in swap.** Build camera-relative scale frames from day one. Test the tube-to-strip zoom in a few frames before anything else.
2. **Photoreal render time.** Set a time budget per frame. Proof at 720p with denoising, and choose early which shots may be stills.
3. **Too many proteins at tube scale.** Use surface meshes with less detail at a distance, and copies drawn in one pass. Label the crowd "sampled".
4. **Two languages double the checks.** Freeze the Russian term list first. Blind-read both languages after the first lens.
5. **Scope.** The full pilot stacks the world, four modules, the Blender bridge, rebuild, two lenses, four deliveries and four edit ways. Question 2 asks whether to start with a smaller first proof.

## 16. Questions for the owner

None are open. Answered on 31 Oct:
- the name, Molecullage Studio (top of the document);
- the full pilots, with no smaller proof;
- the pilot order;
- the time limit;
- the code home;
- the web link host and access.

## 17. Left to the builder

- The file layout of the world format, within section 6.
- The order of building inside each module.
- Test tools and how checks report.
- How the home server receives work (queue or simple file drop), within section 11.
