# dates

**Message.** Entries sit on one side of a date or the other; a matrix of dates and a shared axis show it at once.

**Template.** `templates/dates.html`, data in `data.js`, made by `make_data.py` from `data/pdb/<ID>.record.json`.

**Data.** Dates from the RCSB data API (`data.rcsb.org/rest/v1/core/entry/<ID>`), read 2026-10-16. The deposit date of each record was compared with the `HEADER` line of the coordinate file by `tests/test_data.py`.

| Entry | Deposited | Released | Last revised | Description |
|---|---|---|---|---|
| 1VFB | 1993-12-03 | 1994-05-31 | 2024-11-20 | Fv of an IgG1 with lysozyme |
| 1MEL | 1996-06-06 | 1997-06-16 | 2024-10-30 | single-domain antibody with lysozyme |
| 4KRL | 2013-05-16 | 2013-08-28 | 2024-11-20 | nanobody 7D12 with EGFR domain III |
| 7Z0X | 2022-02-23 | 2022-04-13 | 2024-10-23 | Fab with the S1 domain of a spike protein |

The cut-off, 2010-01-01, is chosen for the example. Cells fill pale blue before it and pale pink with a maroon outline on or after it. The last-revised column falls after the cut-off for every entry, which shows why the kind of date matters.

**Claim boundary.** "Entries and dates: RCSB PDB records. The cut-off is chosen for the example."

**QA (normal).** Pass on ink 34.9 %, empty cells 17.5 %, band 3.7 %, blank 3.9 %, type 6.55 pt, words 98. The title and the subtitle share one line so that the page has no empty strip at the top.

**Ten-second sentence.** Two old entries and two recent ones; every entry was revised after the cut-off.
