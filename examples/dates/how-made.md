# How the dates example was made

- Page: `templates/dates.html`. `make_data.py` writes `data.js` from the RCSB records in `data/pdb/<ID>.record.json`.
- Entries and deposit dates: 1VFB (1993-12-03), 1MEL (1996-06-06), 4KRL (2013-05-16), 7Z0X (2022-02-23). Release and last-revision dates are in the same records.
- The records came from the RCSB data API (`data.rcsb.org/rest/v1/core/entry/<ID>`) on 2026-10-16, through `scripts/fetch_pdb.py`.
- The cut-off, 2010-01-01, is chosen for the example.
