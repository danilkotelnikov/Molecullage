# Plan 3 Ledger: Photorealistic Baking & Camera-Space glTF Export

- **Date:** 2026-11-09
- **Core Unit Tests (`core/test/bake.test.ts`):** 8/8 pass (`validateShots`, `estimateMinutes`, `frameCount`, `frameAt`, `shotAt`, `cacheKey`, `frameUrl`).
- **glTF Camera-Space Snapshot (`tools/gltf.test.mjs`):** 5/5 pass (`GLTFExporter` with `trs: true` rescales target `igg` at `t = 8` to camera-space distance 1, omits hidden `:standIn` nodes, carries lens background and `[36, 24]` sensorMm, deterministic byte output).
- **Bake CLI & Budget Gates (`tools/bake.test.mjs`):** 4/4 pass (content-addressed `.png`/`.key` cache, selective re-bake on lens change, 30-minute `--approved` gate, 1.5x per-frame budget stop).
- **Baked Playback & Live Fallback (`tools/baked.test.mjs`):** 3/3 pass (`baked` mode inside shot window, `/cache/` static serving, automatic fallback to `live` WebGL with `missingBake` checkPage warning when a baked frame is absent).
- **Blender 5.2.2 Note:** `studio/blender/render_world.py` is implemented and syntax-checked; `blender.exe` is resolved via `BLENDER_CMD` or `%LOCALAPPDATA%\ArcScience\tools\blender-5.2.2\blender-5.2.2-windows-x64\blender.exe`, and `bake.test.mjs` / `baked.test.mjs` verify CLI caching, browser frame playback, and live fallback directly.
