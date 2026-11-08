# gen-3d verdict (2026-11-02)

Data: `domains/gen-3d.json`, 76 entries. A verdict is "unknown" unless a page says it.

**Short answer.** Many open models make 3D shapes. No page gives a CPU speed for any of them. So no model is marked "yes" for the CPU server. Only about 4 of its 76 cores are free.

## Best for the CPU server (CPU only)
- trellis.cpp (TRELLIS.2 port): CPU works but is very slow and uses much RAM (README). 503 GB RAM covers the memory. Slow.
- SPAR3D: CPU is used automatically and is very slow (README). Slow.
- TripoSR and Stable Fast 3D: code falls back to CPU. No timing. Test first.
- Qwen3-Coder-30B-A3B (3.3B active parameters, llama.cpp listed): untested for CAD scripts.
- Need CUDA: TRELLIS, TRELLIS.2, Hi3D, Idol, MDM.

## Best for the 8 GB laptop
- Yes: TripoSR (6 GB), Stable Fast 3D (6 GB), Zero123++ (5 GB).
- Tight: SPAR3D low-VRAM (7 GB), Idol (7.2 GB), TripoSG, PartCrafter, UniRig (8 GB), MeshAnything (7 GB), Hunyuan3D-2 shape only (6 GB; with texture 16 GB).
- No: TRELLIS.2 (24 GB), Hunyuan3D-2.1 (10 to 29 GB), Step1X-3D (27 GB), HY-Motion (24 GB).

## Licence traps
- Tencent Hunyuan 2.0, 2.1, Omni, World 1.0: EU, UK and South Korea excluded. A licence request is needed above 1 million monthly users. Outputs may not train other models. HY-Motion and HY-World 2.0 texts: not read.
- Stability (SF3D, SPAR3D, SV3D): free only under US$1M yearly revenue.
- Non-commercial weights: Zero123++, MeshAnything, PartPacker, Text2CAD, CAD-Recode, UniForge3D, Apple Sharp.
- TRELLIS.2: weights MIT. The reference pipeline needs nvdiffrast and nvdiffrec (non-commercial, per a ComfyUI post) and gated DINOv3.
- Hi3D: user and revenue limits, and a required credit line.
- Idol and WorldGen: need gated FLUX weights; licence not read.
- SAM 3D: SAM licence; no reverse engineering of redistributed material.

## Models first
Generated shapes are approximate. Hi3D even loses the scale. Use generators for stand-ins, props and background clutter. Do not use them for a tube, a strip or a part with real dimensions. Hunyuan3D-Omni and Cube 3D take a bounding box. That may help scale but gives no tolerances. Expect wrong label text on generated textures (not tested).

## Top 3 for the owner
1. **Code route for exact parts.** An open code model writes CadQuery (Apache-2.0) or OpenSCAD (GPL-2.0) from stated dimensions. Candidates: Qwen3-Coder-30B-A3B, or CAD-Coder (text to CadQuery, Apache-2.0). You give the dimensions, so the tube, strip and parts stay exact. It should run on the CPU server (llama.cpp is listed; speed untested), so time it first. Default to CadQuery; OpenSCAD is GPL-2.0, a copyleft question if bundled in the engine.
2. **TripoSR for stand-ins.** MIT, 6 GB, fast on a GPU, CPU fallback. Good for bench clutter and props. Stable Fast 3D is similar but has the US$1M limit.
3. **MV-Adapter for textures on existing meshes.** Apache-2.0 adapter. The README suggests the SD2.1 variant for cards under 10 GB; an 8 GB fit is not confirmed. Base model licences: not read.

