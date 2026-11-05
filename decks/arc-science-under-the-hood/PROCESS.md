<!-- version: 3 | date: 2026-11-05 -->
# How the deck is built

This is the working method that made the deck. Each step has a tool, so the next round can run it again.

## 1. Task files
Write one task file for each slide or pair of slides. A task file lists what the viewer should be able to say, what to keep, what to remove and the acceptance checks. It names the facts that the slide may use. Every builder also gets the same written rules. The task files and the rules are private.

## 2. Build with the check first
A builder writes the acceptance checks into a note before the first line of the slide. Then it builds the smallest slide that passes. It looks at every frame by eye, on a desktop and a phone screen, and writes down what it saw. After three failed rounds it stops and asks. The notes of the builders are private.

## 3. The slide contract
- A slide is a fragment, joined into `base-m.html` at a marker `<!--frag:key-->`.
- The steps of a slide are `window.STEPS[key]`: a caption and a selector. The selected parts are lit and the rest is dimmed.
- `data-film` marks a slide that plays itself. `data-hold` marks an area that the viewer can touch. A touch stops autoplay.
- The header is the name of the thing. The caption has at most 16 words. A number comes from a source or from `corpus.json`.
- 3D is used when a shape is the fact. A protein is drawn from all atoms, never as a thread or a cloud of beads.

## 4. Checks
`build_deck.py` runs the fragment check, the assembly, the word check, the autoplay test, the smoke test and, with `--steps`, the walk of every step. `palcheck.py` compares the colours of a frame with the palette. One fresh reader looks at all frames and says what each slide shows, what was unclear and what looks wrong.

## 5. Gates and the log
Every check can write a row to a gate log: gate, subject, decision, features. A later model can learn from these rows which slides a person accepts. The rows come from the word check, the publish scan and the human labels.

## 6. Publish
Build the public copy from a clean branch. Replace private paths and partner names. Scan for secrets, personal data, private addresses and unpublished numbers. Then let independent readers audit the branch for what a scan cannot see: private examples, project topics, quoted feedback, settings and budgets of unpublished work. Hold back every slide and note that fails the audit. Commit in groups, open a pull request and ask for review.

## 7. Lessons
- Inactive slides are `visibility:hidden`. A child with `visibility:visible` shows through on every later slide. Use `visibility:inherit`. `steps.mjs` and `smoke.mjs` flag this as `BLEED`.
- A test of one slide cannot find a fault of the whole deck. Walk the whole deck before you call it done.
- A slide that plays itself moves the deck while a script walks it. The walker stops autoplay at the start of each slide.
- A phone number check must not match base64. A real number has ten digits after +7.
- A pattern scan finds paths and keys. It cannot find a project topic in an example sentence. Only a reader can.

## 8. Video
`record.mjs` plays a range of slides with the deck's own autoplay in a browser on the GPU and writes an MP4. Close other heavy work first, because a busy machine drops frames.
