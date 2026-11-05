"""Write corpus.json from the three totals of the memory bank.

    py -3 corpus_set.py WORLD EXPERIENCE OBSERVATIONS

Read the totals with the hindsight tool list_memories (limit 1, once per fact type; the key "total" holds the count).
assemble3.py puts the file into the deck as window.CORPUS, so every slide shows the same live numbers.
"""
import json
import os
import sys
from datetime import date

here = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) != 4:
    sys.exit(__doc__)
world, exp, obs = (int(x) for x in sys.argv[1:])
data = {"bank": "shared", "notes": world + exp + obs, "world": world, "experience": exp, "observations": obs,
        "read": date.today().isoformat(),
        "how": "Totals from the hindsight list_memories tool. Refresh with: py -3 corpus_set.py WORLD EXPERIENCE OBSERVATIONS"}
with open(os.path.join(here, "corpus.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)
    f.write("\n")
print(data["notes"], "notes on", data["read"])
