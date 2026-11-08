# Building a talk with the deck module

Use this when the user wants slides, a talk, a pitch, a poster video or an animated walk through a structure. The rules for figures apply to slides too: one message for each slide, one claim-boundary line, Arial, the token palette. The full manual is `docs/deck.md` in the repository; this page is the short path for you.

## The steps

1. Ask for the audience (cloud, academic, industry or neutral), the language and the length of the talk, unless the request says. Write the message of each slide as one sentence before you write any slide.
2. `new_deck(dir)` writes a starter `deck.json`. Write the rest with the Write and Edit tools, never through a shell heredoc. Russian text with quotes and backslashes is mangled by a shell.
3. `preview_deck(deck)` starts a live page with hot reload. Open it in a browser, go through every slide with the arrow keys, and press `P` for the presenter window. Stop the process with its pid when you are done.
4. `build_deck(deck)` checks the manifest, renders the ChimeraX loops (a window opens; do other ChimeraX work later) and writes the standalone HTML. Read the log: it says when a scene fell back to the WebGL viewer.
5. `audit_deck(deck)`. Fix every failure. A warning about words or the type ladder is a prompt to cut text, not to shrink it.
6. `deck_contact_sheet(deck)`, then a blind read: a fresh reader gets that one PNG and `references/blind-read.md` (the deck section). Then give a second fresh reader `<deck>/out/overclaim-pack.md` and `references/overclaim-read.md`.
7. `export_deck(deck, format)` for `pdf`, `png`, `mp4`, `gif`, `notes` or `all`. Open at least the PDF pages and a few video frames and look at them before you say it is done. An MP4 of a few minutes takes minutes to make; run it with the tool's timeout in mind, or run `node deck/cli.mjs export <deck> --format mp4` in the background.

## What goes in deck.json

The layouts are `title`, `section`, `two-column`, `figure`, `number`, `timeline`, `table`, `molecule`, `cards` and `page` (a finished figure as the slide; see `docs/deck.md`). Pick the layout from the sentence the slide must carry:

| The slide says | Layout |
|---|---|
| who and what | `title` |
| a new part begins | `section` |
| a claim and its evidence side by side | `two-column` |
| look at this picture (a Molecullage figure, a screenshot of the product) | `figure` with an `image` or `device` block |
| one to four numbers | `number` |
| a sequence of events or stages | `timeline` (up to 7) |
| a comparison | `table` (up to 6 columns, 8 rows) |
| a structure, with a point to make about it | `molecule` with a scene |
| a gallery of projects or a status board, each with one picture | `cards` (2 to 6; `chip` and `kind` for a status) |

Limits that the checker enforces: 2 to 6 cards, 4 number items, 7 timeline events, 6 table columns, 8 table rows. The word budget is 70 words on a slide, 12 in a title, 16 in a list item, 14 in the boundary line. Text is at least 25 px at 1920 x 1080.

- Every slide gets `notes`: what to say, in the voice of the speaker. They go to the presenter view and to the notes PDF.
- Put the point in `title` as a statement ("Петля CDR3 входит в карман"), not a topic ("Структура").
- `"build": true` on a list gives one step for each item. Do not build a slide whose point is the whole picture.
- Scenes: `kind: "chimerax"` for a clean flat loop in the Molecullage style (this is what goes in a video and a PDF); `kind: "webgl"` for a viewer that the audience can use. `motion` is `rotate`, `pocket`, `highlight` or `morph`; `target` is `A:99-122` or `A:99-122,130;L:30`. Write chain lists without a leading slash. Check every PDB id and residue range against the RCSB record before you write it in a slide.
- `boundary` names what is data (a deposited structure) and what is a drawing. A figure redrawn from a paper says so there.
- A screenshot of a live interface goes in a `device` block. `node deck/cli.mjs shot <url> <file.png>` makes the screenshot. Exports use the screenshot, never the live page.
- `audience` picks the accent colours. A slide with `"only": ["academic"]` is left out of the other versions.

## Rules for you

- Never invent a number, a date or a structure for a slide. Cite it, fetch it or leave it out. The same holds for every claim in speaker notes.
- A deck is not finished until you have looked at the sheet, the PDF pages and some video frames. The audit passing is not a look.
- Say plainly what you did not check: a ChimeraX loop that fell back to the viewer, a motion you did not render, a live `url` you did not load, Cyrillic glyphs that the audit does not measure.
- Authors do not certify their own decks: the blind read and the overclaim read go to a fresh reader.
- Everything stays inside the project folder. The tools write under the deck folder (`dist/`, `out/`, `media/`).

## Without the MCP server

```
node deck/cli.mjs new <folder> --title "…" --audience cloud
node deck/cli.mjs preview <deck>                        # http://127.0.0.1:4177/
node deck/cli.mjs build <deck>
node deck/cli.mjs audit <deck> --sheet sheet.png
node deck/cli.mjs export <deck> --format html|pdf|png|mp4|gif|notes|sheet|all
node deck/test.mjs                                      # the manifest checker, the virtual clock and a frame test
```

## What the video does

The exporter does not record the screen. It sets the time of the page (`DECK.seekGlobal(ms)`), waits for the 3D viewer and the videos to settle, takes the frame and sends it to ffmpeg. The same time always draws the same pixels, so two runs of the same deck give the same video. A slide's length is its `duration`, made longer when the builds and scenes need it; `--duration` overrides it for every slide.
- A drawing that builds in steps or runs on its own timeline (a lane-by-lane scheme, a growing tree) is an `svg` block: `data-s="k"` for key-press steps, `data-step="0"` with `data-at`/`data-dur`/`data-effect` for the timeline, effects `draw` and `data-out` for lines and exits. Draw it at slide size (at most 1680 px wide). See `docs/deck.md`.
