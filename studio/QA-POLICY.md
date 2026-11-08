# QA policy of the Studio

Version 1, 2026-11-02. the owner asked for a review policy on 2026-11-01. This is the first written version. the owner may change it.

## Principle

The size of a check matches the cost of being wrong. A small risk gets a small check. A strong check is for what reaches a client, or what shows a wrong fact with confidence.

## Levels

| Level | What | Check | Who checks |
|---|---|---|---|
| L0 | Notes, plans, documents for the owner | Read once. The word check runs by itself. | The author |
| L1 | Code | A test written first. The test passes. One real run. | The author |
| L2 | A fact, number, licence or source | Read the source itself (grounded policy in `library/POLICY.md`). A sample is checked, not every row. | A fresh reviewer samples |
| L3 | A picture, slide, figure or scene | Build with the engine tool. Full figure QA. One blind read by a fresh agent. A notes file. | A fresh agent |
| L4 | Anything that leaves this machine | L1 to L3 for what is shown, plus the owner's yes. | A fresh reviewer and the owner |

## Rules

1. Write the pass mark before the work starts. A pass mark is a number or a command.
2. When the pass mark holds, stop. A fix round happens only when a mark fails.
3. From L2 up, the author does not judge their own work.
4. Run automatic checks first (shape, links, copy test, unit tests). Use agents only for what a machine cannot judge.
5. Sampling rule for lists: the reviewer takes 8 rows per file, half from rows the machine flagged and half at random. If 90% or more of the sample is supported, accept the file and remove the unsupported rows. If less, the author rechecks that file once and the reviewer samples again once. A second fail goes to the owner.
6. One task uses at most 3 builders and 1 reviewer at a time. More agents need the owner's yes, with the reason and a token estimate.
7. Every task states a time budget at the start. At twice the budget, stop and tell the owner.
8. Every result is saved as a file in the task folder, and one line goes to Cammut. Nothing is called done without both.
9. A failed check or a correction from the owner is a lesson. Retain it with the tag `lesson:<area>`.
10. No level skips these: the licence check before an asset is used, and the owner's yes for downloads, accounts, sends and pushes.

## Pass marks in force

- Atlas (L2): `node tools/atlas.mjs check` prints `atlas ok`. `node tools/atlas-gate.mjs links` shows no row that copies 10 or more words from its page. At least 90% of the reviewer's sample is supported.
- Meshes (L1): maximum deviation of 3 Å or less, and volume within 5% of the reference.
- Studio code (L1): `node --test tools/` passes, and the pixel tests pass.
- Figures (L3): the figure rule in the global instructions.
