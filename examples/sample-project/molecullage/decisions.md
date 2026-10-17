# Decisions

Every answer of the user goes here, with the date. This sample was run without a user in the chat, so the intake answers were fixed in advance and no checkpoint was answered. Nothing below is an acceptance.

## Intake (2026-10-17)

- Purpose: paper. Target width: 178 mm. Reference figure: none. How much to ask: every batch.
- Written to `project.json`. In a real project these are the four AskUserQuestion answers.

## Checkpoint A: audit and plan

- Shown: `AUDIT.md` and `PLAN.md`. Verdicts: structure REPLACE, pipeline REDRAW, bfactors RESTYLE.
- Answer: not given. In the sample the plan was followed as written.

## Checkpoint B: prototypes

- Prototypes: structure and pipeline, built first. Sheet: `gate.png` (old next to new, with the QA numbers).
- Answer: not given. The third figure was built after the two prototypes, as the plan orders.

## Batch review

| figure | state | change asked | note |
|---|---|---|---|
| structure | unaccepted | none yet | QA checks pass at normal; blind read round 1 fixed; round 2 not run |
| pipeline | unaccepted | none yet | QA checks pass at normal; blind read round 1 fixed; round 2 not run |
| bfactors | unaccepted | none yet | QA checks pass at normal; blind read round 1 fixed; round 2 not run |

A figure stays unaccepted until the user says accept. Originals in `figures/` are untouched; the new files are in `after/` and under `molecullage/figures/`.

## Hand-off

Not done. Copying accepted figures into the project, caption edits and `CHANGELOG.md` wait for the user.
