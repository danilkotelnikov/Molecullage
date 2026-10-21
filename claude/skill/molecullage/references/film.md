# Narrated films

The engine is the `film/` folder of the repository. This page holds the workflow and the style rules in one place, so the skill can be read without the repository.

## What a film is

A film is a set of beats. A beat is `src/beats/<id>/scene.jsx`: `export const META = { width: 1920, height: 1080, fps: 30, duration, title, notes, holds }` and a default `Scene`. Every part reads the clock through `useT()` and takes its own window `a..b` in seconds, so a frame is a pure function of `t`. The renderer moves the clock, photographs every frame in headless Chrome, audits the page and joins the frames with the soundtrack through ffmpeg.

Kit parts (`src/kit/parts.jsx`): `Title`, `Sub`, `Txt`, `SText`, `Card`, `Pill`, `Badge`, `NumDot`, `Slab`, `Arrow`, `Flow`, `Bracket`, `Frame`, `Layer`, `G`, `Tex`. Motion (`src/kit/motion.js`): `out`, `inOut`, `linear`, `seg`, `win`, `stag`, `lerp`, `pointAt`, `mulberry32`. Tokens (`src/kit/tokens.js`): `FAM`, `ALIAS`, `RADIUS`, `ring`, `FONT`, `LINE`, `SUBS_TOP`.

A picture is a layer: a folder `layers/<name>/0000.png ...` of transparent PNGs, or one flat ChimeraX render (`render_structure`) as `0000.png` with `frames={1}`.

## Voice-over and subtitles

`narration.json` is `[{ "a": <start second>, "text": "<sentence>" }]`. `narrate_film` speaks it, writes `cues.json` with a time for every word (the kit draws them as subtitles below y = 950) and `out/audio/<id>-en.wav`. It reports every sentence that ends less than 0.25 s before the next or less than 0.3 s before the end. The Windows voice speaks about 2 words per second and reads numbers slowly.

## Style rules

1. Wording: plain present tense, positive statements. A sentence of the form "X, not Y", "never X", "no X", "only X" or "without X" becomes a positive statement. No hedges and no status captions on the page.
2. Invented values are "concept" values (pill "Concept values", tile "Concept R1"). `META.notes` lists the seed (mulberry32), formula or section of each, and the source of each narration sentence.
3. Radii: `RADIUS.l` = 22 for cards and frames, `RADIUS.m` = 14 for tiles and chips, `RADIUS.s` = 8 for cells and slabs, capsules for pills. A ring around a shape is `ring(inner, gap)`. No other `rx`.
4. Layout: content ends above y = 950. Title 64 px, one headline of at most seven words that does not repeat the narration. Text at least 28 px. Token colours only; no pink.
5. Holds: a scene holds 6 to 8 s after its last element arrives. No near-empty frame during a hand-over.
6. Statements match the real state of the work: a plan is a plan, a result is a result with its source.
7. Draft while working, `--exact` for the final file. Look at the stills sheet and single frames at every scene change, every hold and with a subtitle on screen. The audit is clean. A second reader checks the narration against its sources; the author does not certify the beat.

## Commands without the server

```
node film/tools/new_beat.mjs <id> [seconds]
py -3 -X utf8 film/tools/narrate.py <id>
node film/tools/render.mjs <id> [--exact] [--lang en] [--from s] [--to s]
```
