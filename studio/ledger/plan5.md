# Plan 5 Ledger: Live Stage Editor, JSON-Pointer Edits & Rebuild-Into Proposals

- **Date:** 2026-11-09
- **Core & Store Tests (`core/test/edits.test.ts`, `tools/edits-store.test.mjs`):** 22/22 pass (`applyEdits`, `undo`, `diffJobs`, `readEdits`, `appendEdit`, `undoLast`).
- **Stage Picking (`tools/pick.test.mjs`):** 4/4 pass (layout block pick at title center, SVG vector pick on `v-arrow`, 3D raycast pick on `igg` at `t = 8`, `null` on empty corner).
- **Inspector & Undo (`tools/inspector.test.mjs`):** 8/8 pass (title text edit, block box height edit, safe-area refusal, lens role dropdown options, zero-size refusal, `Ctrl+Z` undo, `400` on invalid job id).
- **Timeline Retime Panel (`tools/timeline-panel.test.mjs`):** 4/4 pass (one row per track, 60 px drag retimes key 1 from `t = 8` to `t = 8.6`, drag past next key refused with snap-back, ruler click seeks).
- **3D Free Camera & Shot Saving (`tools/camera-shot.test.mjs`):** 4/4 pass (`C` free camera toggle leaves job unchanged, `Save shot` at `t = 5` inserts sorted key at `/paths/0/keys/2`, `Save shot` at `t = 4` sets `/paths/0/keys/1`, saved shot replays after reload with `< 1%` pixel diff).
- **Words & Rebuild-Into CLI (`tools/words.test.mjs`, `tools/rebuild/test/into.test.mjs`):** 15/15 pass (`proposeInto` stop windowing, group child prefixing, `--only` filtering, unknown part refusal, `--apply` appending `by: 'agent'`).
