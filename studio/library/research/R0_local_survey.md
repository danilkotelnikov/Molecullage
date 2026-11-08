<!-- version: w03 | date: 2026-10-30 -->
# Read-only survey: Molecullage, Cammut, arc-harness (2026-10-30)

I changed nothing. I did not call Cammut retain, because this run is read-only. Please retain the findings yourself if you need them.
Line numbers come from files on disk, read in this session.

## 1. Molecullage (`.`, branch main @61fe87b)

**Git state.** A lot of new work is **uncommitted or untracked**: `AGENTS.md`, `agents/`, `claude/mcp/tools/motion.mjs`, `claude/mcp/tools/filmsound.mjs`, new art/*.png and PDB files. `film/src`, `motion/` and `stage/` also look untracked (`git ls-files` did not return them).
There is also a worktree `.claude/worktrees/deck-engine-80899b` on branch `claude/deck-engine-80899b` (def057b). It has 10 commits that are not merged: a "deck" engine with a manifest, eight layouts, a virtual-clock runtime, a preview server, six deck MCP tools, and `struct/loop.py`. It touches 374 files (+196k lines).

### Engines (there are four, plus the deck worktree)
| Engine | Path | Stack | Clock / seek |
|---|---|---|---|
| **Page kit** (print figures) | `kit/kit.js`, `kit/kit_blocks.js`, `build/build.mjs`, `templates/*.html` | Plain DOM/SVG. The page is in mm. `window.Fig` is a class (kit.js:45, exported at :250). Playwright makes the PDF/PNG | none (static) |
| **Film** (narrated course films) | `film/src/kit/{stage.jsx,episode.jsx,parts.jsx,motion.js,subs.jsx,tokens.js}`, `film/src/kit/viz/*.jsx` (~60 big scene files), beats in `film/src/beats/<id>/{scene.jsx,timeline.json,cues.json,narration.json,engine.json}` | React 19 + Vite + d3-ease/interpolate/scale + KaTeX | `TimeContext` (stage.jsx:9). `mount()` stage.jsx:114 sets `window.SCENE.seek(t)` (:118–124): flushSync setT, then fonts.ready, then image decode + `window.__PENDING` layer preloads (parts.jsx:230–236), then 2 rAF. Step clock `stageOf(t, steps)` is in episode.jsx:27. Renderer: `film/tools/render.mjs:72,85` calls `page.evaluate(SCENE.seek(i/fps))` |
| **Motion** (pitch films, JSON-driven) | `motion/cli.mjs` (page/check/still/video/claims), `motion/core/*`, `motion/runtime/*`, `motion/packs/*`, `motion/checks/*` | Vanilla JS runtime. Node-side layout is frozen with real font metrics. zod schema. Vendored 3Dmol (flat build) + KaTeX in `motion/vendor/` | `motion/core/clock.js`: `stageOf` :8, `appear` :19, `cueTime` :23 (cues are `{at}` ms or bound to narration `{step, after}`), `frameTimes` :30, FPS=30. Easing grammar in `motion/core/motion.js` (`seg`, `win`, `spring` with SPRING_K=5.834 at :27–32, `mulberry32` seeded RNG). Runtime `motion/runtime/runtime.js` `seek(t)` :255 and `window.SCENE = {ready, seek, duration, fps, steps, signature, setLang}` :301. `motion/runtime/render.mjs:25` skips duplicate frames by `signature()` |
| **Stage** (decks/presentations) | `stage/src/{core,engine,blocks,motion,molecule,kit,ui}`, `stage/decks/omniverso-architecture.ts` | TypeScript + React + Vite singlefile. **gsap 3.15** (`stage/src/core/timeline.ts:4`), **molstar 5.13** (`stage/src/blocks/molecule.ts:5-10`), 3dmol, shiki, katex | `Clock` class `stage/src/core/clock.ts:4`: `seek` :19, `play` :25, `fastForward` :40, rAF only in `frame` :56. Window hook `stage/src/ui/Shell.tsx:135` `window.__stage = {ready, duration, steps, unrevealed, seek}`; its seek (:140–150) awaits fonts, `decodeFrames()` and `window.__structReady`. Renderer `stage/tools/render.mjs:30-32` uses a fresh page per frame and stores a SHA-256 per frame |

**Shared contract.** In all three animated engines, a frame is a pure function of t. Each one exposes `window.SCENE.seek(t)` or `window.__stage.seek(t)`, and Playwright screenshots it. All three use the same easing grammar (out / inOut / linear / spring) and the same STAG_S 0.12 and STAG_L 0.30.

### Primitives and blocks
- **Stage author DSL** (`stage/src/engine/author.ts`): nodes `op`:62, `pill`:65, `split`:69, `pic`:75, `tile`:82, `plus`, `dot`, `stage`, `text`, `eq`:104, `brace`, `readout`, `plane`:116, `code`:121, `struct`:137. Containers are `row/col/grid/cell/over/sp`, edges use `edge`:161. Motions: `fade, exit, grow, draw(routeDraw), flow, stack, count, tileBuild, ring, flip, camera, track, morph, play, par`, plus `step/slide/deck` (:165–186).
- **Block registry** `stage/src/blocks/index.ts` `BLOCKS` maps kind → builder: brace, code, equation, misc, molecule (Mol*), opBox, plane, pill, readout, structure(pic), matrixTile. The motion dispatcher is `stage/src/motion/index.ts:12 runMotion`. The layout solver is `stage/src/engine/layout.ts` (`fitScale` :175, `layoutSlide` :323, mm grid 0.5, `hooks.measure` :68). Audit is in `engine/audit.ts:30 auditLayout`.
- **Motion runtime primitives** (`runtime.js` header): rect, circ, text, img, arrow, path (draw-on + flowing dots), mol (C-alpha model), tile. Extension kinds are in `runtime_ext.js` via `window.EXT`: mol3d (3Dmol, flat, silhouette), math, svg, poly, scatter, bars.
- **Film parts** (`film/src/kit/parts.jsx`): Tex/M, Txt/Title/Sub/Caption, Card, Badge, Pill, NumDot, Bracket, Slab, Arrow, Flow, Layer (PNG frame sequences from `film/layers/`), Frame.
- **Page kit** methods (`kit/kit.js`): letter, chip, pictogram, image (ART + anchors), state, band, group, module, route, dot, plus, bracket, legend. `kit_blocks.js` adds tool, pill, stage, badge, note.

### Motion packs (`motion/packs/`)
- `core.mjs`: Text, Card, Counter, Picture, Flow, Bar, Grid, Arrow, Bus, Slots (:33–124). `renderElement` is at :135 and resolves `el.pack/el.component`.
- `art.mjs`: `artItem` :36. Item types: pill, op (stack), panel, label, num, circ, path, img, mol (PDB 1MEL C-alpha), tile (dist/contact).
- `art3.mjs`: `art3Item` :31. Item types: mol3d, math, icon (Tabler), poly, iso (`isoFaces` :22, tensor boxes), plates, cells, scatter, bars.
- Schema: `motion/core/schema.js` (zod; evidence `LEVELS` measured/published/simulated/architecture/target). Honesty gate: `motion/core/evidence.js` + `motion/projects/*.json` (`allowed`). Checks: `motion/checks/{text,plan,glyphs}.mjs`, plus tests in `motion/{core,checks}/test/`.

### MCP tools (`claude/mcp/server.mjs` + `claude/mcp/tools/*`)
- server.mjs: list_templates :53, new_figure :62, build_figure :83, qa_figure :99, palette_sample :112, palette_check :123, render_structure :137.
- audit.mjs: audit_figure. brief.mjs: make_brief. contact.mjs: contact_sheet. inventory.mjs: inventory_figures. plan.mjs: plan_redesign.
- film.mjs: new_film_beat, narrate_film, render_film.
- filmsound.mjs (untracked): film_doctor, film_voice_status, film_master_audio, film_verify_set, film_tidy.
- motion.mjs (untracked): motion_check, motion_build, motion_blind_packet.
- There are no stage/deck tools on main. The proposal is in `stage/PROPOSAL-skill-mcp.md` (planned file `claude/mcp/tools/stage.mjs`). Six deck tools exist only on the worktree branch (commit 4d9eb28).

### Assets
- `art/`: ChimeraX PNG layers (`<key>__{full,ag,ab,inset}_t.png`), `<key>.anchors.json` (normalised anchor points, outline) and `index.<key>.json`. The page kit reads them through `window.ART` (kit.js:96–106).
- `struct/render.py`: ChimeraX script run through `struct/run_cx.py`. Groups: complex :50, poses :137, series :176 (noise to structure), anatomy :231, chains :258. Helpers: `cx_common.py`, `style.py`, `contacts.py`, `contacts_cx.py`, `trim.py`. PDB files are in `data/pdb/`, fetched by `scripts/fetch_pdb.py`.
- Stage assets: `stage/assets/mlgm/1mel.mlgm.json` (vector molecule format), `stage/exporters/pdb_mlgm.py`, `stage/src/molecule/vector/{cartoon,mlgm}.ts`, SAMSON recipe `stage/assets/samson/`. Motion film assets: `motion/films/assets/*.json` (C-alpha, contacts).
- **Blender:** no code uses it. It appears only in `stage/PLAN.md` §10 (:173 says "Blender 5.2 + Molecular Nodes → GLB per colour group"; :289 plans a `molecule_mesh` tool; :305 milestone M2 plans "three.js flat + outline"), in `figs/nature_style_demo.notes.md` and in `figs-yc/DECISIONS.md`.
- **three.js and lottie are not installed anywhere.** framer-motion/"motion" is not installed either.

### QA (`qa/`)
- `qa_fig.py` measures a built figure against the drawing rules.
- `audit_raster.py` audits a raster/PDF/SVG: marks, colours, dpi, type size.
- `contact_sheet.py` puts figures side by side with their marks.
- `inventory.py` finds a project's figures, their scripts and their citations.
- Text guides: `blind_read.md`, `overclaim_read.md`.
- Engine-level checks: `stage/tools/check.mjs`, `stage/src/engine/audit.ts`, `motion/checks/*`, `film/tools/{doctor.py,verify_set.py,qa_frames.py,overlap.mjs,caps_audit.mjs}`.

### Templates
`templates/`: contacts, dates, palette, pipeline, plots2, sequence, series, structures (.html). They are registered in `claude/mcp/lib/templates.mjs`.

### Dependencies
- Root `package.json`: @modelcontextprotocol/sdk, @tabler/icons, playwright-core, zod.
- `film/package.json`: react 19, vite 8, d3-ease/interpolate/scale, katex, playwright-core, vite-plugin-singlefile.
- `stage/package.json`: **gsap ^3.15**, **molstar ^5.13.1**, 3dmol ^2.5.5, katex, react 19, shiki ^4.5, typescript 7, vite 8.
- `motion/` has no package.json. It uses the root deps and the vendored 3Dmol/KaTeX.

### Planning docs
- `stage/SPEC.md` (engine spec v0.1: motion standard, controlled switching, renderer).
- `stage/PLAN.md` (Part B: vector molecules, SAMSON/Blender/ChimeraX samplers, technology choices, QA, agent rules, roadmap M0–M?).
- `stage/PROPOSAL-skill-mcp.md`, `stage/YC-DECK-PLAN.md`, `stage/EXECUTION-GUIDE.md`, `stage/REPORT-phase1-3.md`.
- `figs-yc/SLIDE_SPEC.md`.
- `docs/film-handbook.md`, `docs/film-protocol.md`.
- `agents/` (adapters for antigravity, claude-code, glm, zcode; `agents/tools/check_adapters.mjs`, `export_schemas.mjs`).

## 2. Cammut (`<local-path>`, head aa2aecc "wip: OAuth server, Apps page, Composio key header, new site, console 0.4.0")

**Stack.** Go: one binary `cmd/cammut`, using the official `modelcontextprotocol/go-sdk` and modernc SQLite. The console is React/TS in `web/`, the site is static in `site/`, and the PC adapters are Node in `adapters/`. Deploy is Docker plus `deploy/compose.yaml`.

**Layout.**
- `internal/`: acl, admin, archive, archiveapi, auth (password, TOTP, GitHub, throttle), clientip, gateway, index, memory, memoryapi, memorymcp, netguard, oauth, ratelimit, service, store (+migrate), upstream, vault, web.
- `deploy/` scripts: cammut-secret, hindsight-llm, mem-backup, replicate-archive, smoke.sh, user-steps/*.ps1.
- `dev/` scripts: gate.sh, remote.sh, fmt.sh.

**Gateway tools.** `internal/gateway/gateway.go`:
- `newServer` :186 registers `cammut_servers` :194, `cammut_search` :199, `cammut_describe` :204 and `cammut_call` :209.
- The handlers are servers :220, search :247, describe :274, call :298 and invoke :316.
- `addDirectTools` :343 exposes an upstream's tools directly (the "profile").
- ACL is per token scope (`acl.Allowed`, :216). Each call is audited at :375.
- Search is keyword-based in `internal/index/index.go`. There is no BM25, and the README says Russian queries return nothing; a multilingual TEI index is planned.

**Upstreams.**
- Type `store.Upstream{Name, URL, BearerEnv, BearerSecret, AuthHeader, Enabled}` lives in `internal/store/store.go`, with SSRF checks in `ValidateUpstream`.
- `internal/upstream/manager.go` handles them: `Set` :86, `SetLocal` :78, `Probe` :153, a bearer RoundTripper that sends the secret only to the upstream's own host, `resolveSecret` from vault :136.
- An in-process local upstream `memory` is wired at `cmd/cammut/run.go:251`: `mgr.SetLocal("memory", memorymcp.Connector(memorymcp.New(memSvc)))`.
- README upstreams: hindsight (36 tools), openviking (20), github, and Composio (via the AuthHeader `x-api-key`).

**Memory tiers.** Cammut's own notes store, from the memory-v2 work, is `internal/memory/`:
- `brief.go`: deterministic, exhaustive brief. Each note becomes a full, gist or index line, or goes on a page of at most 40 notes in the "core tier". `RenderBrief` :231, `RenderPage` :360, `CheckCoverage` :390.
- `delta.go`: `Delta` :12, the brief diff since the last version.
- `deliveries.go`: what was sent to which agent session.
- `meaning.go`: meaning-atom guard, so a gist cannot drop "never" or "at least 3". `ValidateGist` :269, `MeaningDiff` :228.
- `rank.go`: hybrid FTS + vector ranker. `RecallQuery` limit is 6, capped at 25. `NewRanker` :40.
- `embed.go`: TEI embeddings client.
- `redact.go`, `store.go`, `service.go`, `view.go`.

The MCP surface is `internal/memorymcp/server.go`: `memory_brief` :45, `memory_recall` :50, `memory_remember` :55, `memory_handoff` :60, `memory_projects` :65. REST is in `internal/memoryapi/api.go`.
**I found no "state card" or "lesson" code in Cammut.** Lessons live in arc-harness and in Hindsight tags.

**Hindsight usage.**
- The adapters call Hindsight REST directly. In `adapters/claude-code/sm.mjs`: retain `POST /v1/default/banks/{bank}/memories` :270, with an idempotent `operationID(bank, chunk)` UUIDv5 at :260; recall `/memories/recall` with budget mid at :481.
- The default bank is `the owner-shared` (`adapters/tools/chain-doctor.mjs:152`). The doctor checks `store_document_text=false` and `recall_include_chunks=false`.
- Tags such as project:Omniverso and lesson:* are set by agents, not by Cammut code.
- Other tools: `adapters/tools/{hs-client,ov-client,snapshot,cammut-archive,ov-purge-archives}.mjs`, plus an encrypted archive (`adapters/archive.mjs`, `internal/archive`).

**Specs** (`docs/superpowers/specs/`):
- gateway-design (10-09), agent-design and console-hooks-design (10-10).
- **memory-v2-design** (10-11). It covers the encrypted raw archive, the scribe distiller, brief by "semantic exhaustiveness", the LLM gateway, and Cammut's own agent.
- oauth-connect-molecullage (10-20), oauth-as-built (10-21).
- **molecullage-in-cammut-design** (10-21). It plans one `molecullage` container on Contabo, workspace tools for web agents, and rules as a server-side ledger.

Plans are in `docs/superpowers/plans/` (memory-v2 parts 1–9 plus errata). `docs/CAMMUT-CORE.md` describes the branch scope and gates.

**Tests.** 84 test files (`*_test.go` and `*.test.mjs/ts`). The Go tests run remotely through `bash dev/remote.sh go test ./...`, because the PC has no Go (memory-v2 spec §2.1).

**migrate-memory.** It is **not inside Cammut**. It is at `<local-path>`:
- deploy and door shell scripts: deploy-cammut.sh, open-memory-door.sh, build-hindsight-chain.sh, connect-*-oauth.sh, install-harness2.sh, restore-to-contabo.sh.
- `work/sync/hsync.py`, a Hindsight bank sync with `state.json`.
- bank backup zips.

**Cammut-replan** (`Documents\Cammut-replan`) is a plain folder, not a repo. It holds ops planning from 23 Oct:
- `PHASE0-INVENTORY.md`: branches and worktrees, and a database-migration slot collision.
- `GATE1.md`: branch `phase1/one-codebase` in `Cammut-wt-phase1` @6ec0f6b. DB steps 1–8 (8 = memory checkpoints); production is at step 5.
- `SNAPSHOT-REVIEW.md`: merge the checkpoint feature from `snap/gpt-union-20261016`.
- `PHASE2-PLAN.md`: staging identity proof. A Cloudflare Worker OAuth provider (`mcp-staging.cammut.cc`) passes a 60 s Ed25519 token over a Cloudflare Tunnel to staging Cammut :7431, with Appwrite GitHub sign-in.
- phase0/phase2 shell scripts and `worktree-notes/`.

**Goal:** one codebase, then multi-vendor OAuth (Claude, ChatGPT, Gemini, Composio) through an edge.

## 3. arc-harness (`<local-path>`)

**What `tools/sync.mjs` installs** (`--check` by default, `--apply` backs up first to `~/.arc-harness-backup/<stamp>/`):
- `shared/rules/common.md` + `routing.md` go between the markers in `~/.claude/CLAUDE.md`, `~/.gemini/GEMINI.md`, `~/.zcode/AGENTS.md` and `~/.codex/AGENTS.md` (`withBlock` :26).
- It copies `surfaces/claude-code/hooks/arc-rules.mjs` to `~/.claude/hooks/`.
- It merges 4 hook entries into `~/.claude/settings.json` (`withHooks` :33): SessionStart, UserPromptSubmit, PostToolUse(Write|Edit), Stop.
- It makes `~/.gemini/antigravity/mcp_config.json` identical to `~/.gemini/config/mcp_config.json`.

**The hook** (`arc-rules.mjs`):
- SessionStart refreshes `~/.cammut/lessons-cache.json` by calling `cammut_call hindsight/recall` with a "lesson:" query and reading the `lesson:<area>` tags (:57–68).
- UserPromptSubmit injects `shared/reminders.json` (research / ask / style) plus the top lessons.
- PostToolUse runs `tools/lint_prose.py`.
- Stop appends candidate lessons to `lessons/inbox.jsonl` (:121).

**Lessons format.** JSONL rows `{at, agent, session, cwd, kind: tool_error|rejected|correction, text (redacted, ≤300 chars)}`. There are 692 rows. They are unreviewed and mostly duplicate tool errors. Reviewed lessons live in Hindsight with the tag `lesson:<area>`.

**Surfaces.** Only `surfaces/claude-code/` exists. Antigravity, ZCode and Codex get the text block only. Lexicon: `shared/lexicon/{terms.en-ru.tsv, refused.*.txt, anglicisms.ru.tsv}`; `motion/cli.mjs` also reads `refused.*.txt`.

## Integration seams

**(a) Molecullage**
1. **Animation adapter interface.** `stage/src/motion/index.ts:12 runMotion(m, t, c)` plus the `Motion` kinds in `stage/src/engine/author.ts:165-182`. Add a kind such as `lottie`, `gsapTL` or `three` there. gsap is already imported in `stage/src/core/timeline.ts:4`. Keep it seek-driven: build paused timelines and set them from t.
2. **Block registry.** `stage/src/blocks/index.ts` `BLOCKS` record. Register new asset blocks there (for example a GLB or three.js `mesh` block, or a lottie block). `molecule.ts` (Mol*) is the template, including its `window.__structReady` wait that `Shell.tsx:148` awaits.
3. **Motion-engine extension kinds.** `motion/runtime/runtime_ext.js` (`window.EXT` with `build(p)` and `draw(e,p,t)` per kind, :10). Add a kind with matching pack items in `motion/packs/art3.mjs:31 art3Item`.
4. **Pack resolver.** `motion/packs/core.mjs:135 renderElement` (pack/component lookup). This is the place for new domain packs, for example `motion/packs/<domain>.mjs`.
5. **Layout solver.** `stage/src/engine/layout.ts`: `layoutSlide` :323, `fitScale` :175 and the `hooks.measure` injection point :68. Audit limits are in `engine/audit.ts:9,30`. Motion's frozen Node layout is `motion/core/layout.js` (`wrapBalanced`) and `motion/core/grid.js`.
6. **Asset catalogue.**
   - Today the catalogue is per-key `art/index.<key>.json` + `<key>.anchors.json`, consumed by `kit.js:96 image()` via `window.ART`.
   - Film layers come from `parts.jsx:237 Layer`; motion assets from `motion/films/assets/`.
   - A single catalogue could live in `claude/mcp/lib/project.mjs`, with a new `assets` tool registered next to `render_structure` (`server.mjs:137`).
   - The Blender/GLB route is planned only (`stage/PLAN.md:173,289` `molecule_mesh`).
7. **The shared seek contract.** `film/src/kit/stage.jsx:116`, `motion/runtime/runtime.js:301`, `stage/src/ui/Shell.tsx:135`. Any new adapter must add its async readiness to these seek promises (the `__PENDING`, `ready` and `__structReady` patterns).

**(b) Cammut**
1. **Tool aggregator / advisor policy.**
   - `internal/gateway/gateway.go`: `search` :247 and `call`/`invoke` :298/:316 are the places to rank tools, rewrite or deny calls, or attach advice.
   - `addDirectTools` :343 is the hook for direct-exposure "profiles".
   - The ACL is in `internal/acl/acl.go`.
2. **Memory index.**
   - `internal/index/index.go` is the keyword tool index; swap it for BM25 or TEI vectors.
   - `internal/memory/rank.go` (`NewRanker` :40) already fuses FTS and vectors through `embed.go:29 NewTEI`, and can be reused for the tool index.
3. **Compression layer.**
   - `internal/memory/brief.go` (`RenderBrief` :231, gist/index tiers, `CheckCoverage` :390).
   - `meaning.go:269 ValidateGist` is the safety guard for any summariser.
   - `delta.go:12` handles incremental delivery.
   - A local MCP for the new layer can be mounted like memory at `cmd/cammut/run.go:251` (`mgr.SetLocal`).
4. **Lessons / state-card.**
   - Nothing exists in Cammut yet. The candidates are a new `memory_*` tool in `internal/memorymcp/server.go:45-65` and a REST route in `internal/memoryapi/api.go`.
   - The checkpoint feature waiting on `snap/gpt-union-20261016` (`internal/memory/checkpoint.go`) is the nearest "state card".
   - The client side is `arc-harness/surfaces/claude-code/hooks/arc-rules.mjs:57-68` (lesson recall) and `lessons/inbox.jsonl` (the review queue).

**Caveat.** Cammut's live code is spread over several branches (`consolidate`, `integrate/20261017`, `phase1/one-codebase` in `Documents\Cammut-wt-phase1`). Check which branch is the target before editing. I did not open `Cammut-wt-phase1`; Phase-0/Gate-1 docs say it exists, and I did not confirm it on disk.

---

Correction to my report: a slower search finished after I sent it. My claim "no code uses Blender" is wrong.

- **Blender code exists:** `.\struct\denoise\render_blender_assets.py`. I did not open it, so I cannot say what it renders.
- **The word "blender" also appears in:** `film/README.md`, `motion/pitch3/notes.md`, `motion/pitch4/make_pitch4.py`, `motion/pitch4/pitch4.film.json`, `stage/src/blocks/molecule.ts`, `stage/src/core/timeline.ts`, `stage/src/motion/util.ts`, `stage/tools/slide7.mjs`, `stage/EXECUTION-GUIDE.md` and `stage/SPEC.md`.
- **The search pattern was mixed.** It matched blender, three.js, lottie, gsap or molstar together. So a hit in a stage file may be gsap or Mol*, not Blender. In molecule.ts and timeline.ts it is surely gsap or Mol*.
- **No change on three.js and lottie.** They are still in no package.json.

Updated seam (a)6: the Blender asset route starts at `struct/denoise/render_blender_assets.py`. It is more than a plan in `stage/PLAN.md`.
