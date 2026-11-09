# Molecullage Studio

One world per job. Camera paths give decks, films and posters. Lenses give the look.

## 1. Where files and presets live

- **Asset catalogue**: `studio/library/sources.json`, `studio/library/references.json`, `studio/library/access.json` and `studio/library/atlas/`. Search verified entries with `node tools/search.mjs <keyword>`.
- **Lenses (colour and material presets)**: `studio/lenses/cinematic.json` (dark stage) and `studio/lenses/journal.json` (light paper and studio mode). Both lenses style the twelve roles: `plastic`, `liquid`, `antibody`, `protein`, `nucleic-acid`, `gold`, `strip`, `line`, `diagram`, `tile`, `shape`, `label`.
- **Core and browser stage**: `studio/core/` (world, frames, timeline, camera, lens, geo, look, bake, vector, edits, brief, facts, story, prose) and `studio/web/` (Three.js stage, deck player, GSAP vector layer, studio editor).
- **Offline GPU path-tracing bridge**: `studio/blender/render_shot.py` and `studio/tools/bake.mjs` export camera-space `.glb` scenes and render baked Cycles frames by time `t`.

## 2. Commands (run from `studio/`)

```bash
npm test
npm run check -- <job>
npm run storyboard -- <job>
npm run export -- <job> --lens journal --lang en --fps 30 --workers 2
npm run bake -- <job> --shot <shot-id> --draft
npm run pdf -- <job> --lens journal --lang en
npm run site -- <job>
```
