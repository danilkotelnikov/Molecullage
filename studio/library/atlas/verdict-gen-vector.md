# Verdict: vector generation (gen-vector), 2026-11-02

## What runs on the CPU server today
- **Yes (CPU programs):** VTracer (MIT), Potrace (GPL), AutoTrace (GPL), PaddleOCR PP-OCRv6 (Apache-2.0).
- **CPU path documented, speed not measured:** PaddleOCR-VL-1.6 (1B), Surya, MiniCPM-V 4.7, Florence-2, Depth Anything 3 base. The dots.mocr-svg card points to a CPU guide that I did not read.
- **No documented CPU path:** every generative SVG model (StarVector, OmniSVG, InternSVG, SVGen, IntroSVG, OmniLottie). SAM 3 lists a CUDA GPU as required.
- The box runs at 72 of 76 load. Time one real job first.

## What runs on the 8 GB laptop
- Sourced "no": OmniSVG (17 to 26 GB) and OmniLottie (15.2 GB).
- No other model has a stated VRAM figure. StarVector-1B, dots.mocr-svg (3B), Florence-2 and PaddleOCR models are likely fits, unmeasured.

## Licence traps
- OmniSVG 3B and 4B, and SVGen's Qwen 3B model, sit on a Qwen 3B base with a research-only licence. The Apache tag on the fine-tune does not remove it. OmniLottie probably shares this base (inferred).
- OmniSVG, OmniLottie and SVGen train on non-commercial data (CC BY-NC-SA, IconFont).
- Surya weights are free only below $5M funding or revenue.
- Potrace and AutoTrace are GPL. Use VTracer (MIT) for tracing.
- Depth Anything 3 licences differ per checkpoint. RMBG-2.0 has a custom licence I did not read. dots.mocr has a separate agreement file I did not read.
- SAM 3 has no non-commercial clause but is gated and bars reverse engineering. SAM 2 and BiRefNet are clean.
- No licence at all: Chat2SVG, AniClipart, IconShop, ChartCoder.

## Top 3 to rebuild a raster picture as vectors
1. **Parts pipeline:** SAM 2 or BiRefNet for regions, PaddleOCR for text, VTracer per region, a small vision model to name parts. FigEdit and AutoFigure-Edit (both MIT) show the pattern. Result: real text and exact shapes. Parts get names only from the vision step. AutoFigure-Edit needs SAM 3 and RMBG-2.0.
2. **dots.mocr-svg (3B, MIT tag):** one step from chart, UI or figure image to SVG code. Editable, but geometry is approximate and the authors call picture parsing unreliable.
3. **StarVector, InternSVG-8B or OmniSVG 1.1 8B:** write SVG code for icons and logos. Not for photos. Geometry is approximate. No documented CPU path.

## Top 3 for clean diagrams
1. **An open LLM writes Mermaid or D2** (Qwen3.6-35B-A3B or Qwen3.8-27B, Apache-2.0). The layout engine gives exact alignment and attached connectors. Parts carry the names the model writes. It suits flowcharts and architecture boxes only.
2. **DeTikZify v2.5:** figure image to TikZ. Output is editable and named by you. Needs TeX Live. Weights licence unread.
3. **Direct LLM-written SVG** only behind a render check (IntroSVG-style loop or Visual-ERM). The GeoSVG-RL paper reports missed connector anchors and overflowing text.

Benchmarks: SVGenius (mid 2025) put proprietary models ahead, reasoning-tuned open models closest, and a 3B code model last. I could not read a Rapidata ranking.

## Gaps
Reason-SVG, UniSVG and RefineSVG were not checked. Canva pages returned 403.
