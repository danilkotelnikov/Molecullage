"""Write gallery/README.md and the small preview images from gallery/index.json.

Run from the repository root:   py -3 -I gallery/make_index.py
A piece without a built PNG is listed as 'in progress' and gets no preview.
"""
import json
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ENTRIES = json.loads((HERE / "index.json").read_text(encoding="utf-8"))
THUMB_W = 760


def thumb(slug: str) -> bool:
    src = HERE / slug / f"{slug}.png"
    if not src.exists():
        return False
    dst = HERE / slug / f"{slug}.thumb.png"
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return True
    with Image.open(src) as im:
        im = im.convert("RGB")
        h = round(im.height * THUMB_W / im.width)
        im.resize((THUMB_W, h), Image.Resampling.LANCZOS).save(dst, optimize=True)
    return True


def cell_image(slug: str, ok: bool) -> str:
    if not ok:
        return "in progress"
    return f"[![{slug}]({slug}/{slug}.thumb.png)]({slug}/{slug}.png)"


def cell_text(e: dict, ok: bool) -> str:
    lines = [f"**{e['kind']}**", ""]
    lines.append(f"Redesign of {e['original']} of {e['paper']}, [doi:{e['doi']}](https://doi.org/{e['doi']}).")
    lines.append("")
    lines.append(e["change"])
    if ok:
        s = e["slug"]
        lines.append("")
        lines.append(f"[PDF]({s}/{s}.pdf) · [how it was made]({s}/how.md) · [page source]({s}/page/{s}.html)")
    return "<br>".join(x if x else "" for x in lines).replace("<br><br>", "<br><br>")


def main() -> None:
    rows = []
    done = 0
    for e in ENTRIES:
        if e.get("hold"):          # a piece still in review: not listed yet
            continue
        ok = thumb(e["slug"])
        done += ok
        rows.append(f"| {cell_image(e['slug'], ok)} | {cell_text(e, ok)} |")

    text = f"""# Gallery

{done} figures from open-access papers, redrawn with Molecullage. Each one keeps the data of the paper it comes from and says on the figure where the original is. The originals are not copied here: follow the DOI to see them. Every paper is published under CC BY 4.0, and each redesign carries a credit line for it.

How a piece got here: the original figure and its legend were read first, then the figure was rebuilt from the paper's data or from the PDB entry. After each build, one reader saw only the picture and said what they could not decode, and another reader checked every number, label and claim against the paper and the data file. The builder fixed what they found. Where a figure says "computed", the number comes from the data and not from the paper; where the paper and its own data disagree, the figure says so.

| Redesign | What it is and what changed |
|---|---|
{chr(10).join(rows)}

## Rebuild a piece

Each folder has a `fetch_data.py` that downloads the inputs (PDB files and the paper's source-data file) into `data/`, prints their size and SHA-256 and stops if a file has changed. No third-party data file is stored in the repository. Then follow the commands in the folder's `how.md`. ChimeraX is needed only to redo the structure renders; the renders are included.

## Credit and licence

The papers are under CC BY 4.0 (read from the Europe PMC record and from the article itself). The redesigned figures are under CC BY 4.0 as well, with the credit line printed on each. The code in the folders is under the MIT licence. The word counts that the QA script flags as warnings come from gene names, residue labels and numbers, which a figure of this kind has to print.
"""
    (HERE / "README.md").write_text(text, encoding="utf-8", newline="\n")
    print(f"{done} of {len(ENTRIES)} pieces listed")


if __name__ == "__main__":
    main()
