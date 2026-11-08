# Brief for the atlas writers

You fill one domain file of the Studio's software atlas. Read `PROPOSAL.md` in this folder first (two minutes). Then follow this brief.

## What the owner asked for

the owner is building Molecullage Studio: an engine that makes animated decks, motion graphics, posters, figures, 3D scenes and vector pictures. He wants an indexed list of ALL software and engines that do motion, graphics, 3D design and vector imaging: every capability, function, feature and typical outcome. Later the capabilities are re-specified from public sources in our own words (a clean-room feature package). You write the first layer: the atlas.

## Where to write

`.\studio\library\atlas\domains\<domain>.json`

Write the file in several passes if it is long (write a first valid version early, then extend it). Do not touch any other file in the repository. Do not commit. Do not run `git`.

## The shape (a test checks it)

Run `node tools/atlas.mjs check` from `.\studio` to see problems in all files; ignore the lines about other domains. The rules are in `tools/atlas.mjs` (`validateDomain`). Short version:

```json
{
  "domain": "<your domain id>",
  "title": "...",
  "checked": "2026-11-02",
  "enumeration": {
    "frames": [{ "name": "Wikipedia: List of ...", "url": "https://..." }],
    "searched": ["query you ran", "..."],
    "excluded": [{ "name": "X", "reason": "discontinued 2014, no public documentation" }]
  },
  "entries": [
    {
      "id": "kebab-case-id", "name": "Product", "vendor": "...", "kind": "application|library|engine|model|format|service",
      "status": "active|discontinued|unknown",
      "licence": { "type": "proprietary|open-source|source-available|freemium|unknown", "name": "GPL-3.0-or-later or the commercial model" },
      "url": "https://official page",
      "platforms": ["windows", "macos", "linux", "web"],
      "engines": [{ "name": "Cycles", "does": "own words", "source": "https://..." }],
      "capabilities": [
        { "area": "<one value from AREAS in tools/atlas.mjs>", "feature": "kebab-case-slug",
          "does": "what the function does, in your own words, 45 words at most",
          "inputs": "what goes in", "outputs": "what comes out",
          "source": "https://page that shows it", "basis": "manual|paper|source|patent|observed|release-notes|model-card|search-excerpt" }
      ],
      "formats": [{ "name": "FBX", "role": "import|export|native", "open": "open|documented|proprietary|unknown" }],
      "scripting": ["Python API"],
      "outcomes": ["typical deliverables"],
      "rea": { "studyable": "open-source-readable|public-docs-only|closed|unknown", "public_sources": ["https://..."], "restrictions": "what the licence or EULA says about study or reverse engineering, if you read it, else null", "notes": "" },
      "verified": "2026-11-02, how: manual page read | search excerpt only | ..."
    }
  ]
}
```

A `model` entry also has `"model": { "task": "...", "params": "...", "released": "YYYY-MM", "weights_licence": "...", "outputs": ["..."], "hardware": { "min_vram_gb": 8, "cpu_ok": "yes|slow|no|unknown", "cpu_notes": "..." }, "home_srv": "yes|slow|no|unknown", "laptop_gpu_8gb": "yes|tight|no|unknown", "evidence": ["https://..."] } }`.

## How to sweep (this is what "ALL" means)

1. Start from public lists, then follow them. Good starting points: the Wikipedia comparison and list pages for your area, the vendors' own product pages, GitHub topic and "awesome" lists, and category pages of software directories. Record each list in `enumeration.frames`.
2. Cover the field breadth-first. First list every product you find with its category (the `entries` can start small and grow), then go deep on each in this order: the market leaders, the open-source leaders, then the rest. Aim for the full list of products that a working professional in your area would name, plus the notable open-source tools and libraries. Leave out a product only with a reason in `enumeration.excluded`.
3. For each product list the engines (its major subsystems) and its capabilities. Cover the whole product, not only the headline feature: modelling, animation, simulation, rendering, materials, scripting, interchange, output, and so on, where they apply. A manager-level feature list is not enough; go down to the level of single functions and their parameters when the manual lists them (for example "loft: takes curves, gives a surface, parameters: continuity, closed, rebuild"). Use `inputs` and `outputs` for that.
4. Use the official manual or documentation as the source for a capability. Release notes and papers are fine. A search excerpt is allowed only when the page could not be opened; mark it `search-excerpt` and keep those below one third of a product's capabilities.
5. Do not read or fetch the same page twice. Keep a list of the pages you have read and reuse your notes.
6. Fill `rea.studyable` honestly: `open-source-readable` if the source code is public and its licence lets a person read it; `public-docs-only` if only manuals, SDK docs, papers and file-format specs are public; `closed` if nothing useful is public; `unknown` if you did not check. Quote what the licence says about reverse engineering only if you read it.

## Hard rules

- Own words. Never copy a sentence from a manual, a website or a README. No quotes. A short product name or a parameter name is fine.
- Cite real pages you opened. Never invent a URL, a version number, a parameter or a feature. If you are not sure, write `unknown` or leave the field out.
- No downloads, no installs, no accounts, no keys, no sign-in. If a page needs a login, skip it and say so in `notes`.
- Do not run anything on the CPU server. Do not start heavy processes.
- Plain facts. No marketing words in `does`.
- Today is 2026-11-02. Prefer recent sources; note the version a fact belongs to when it matters.

## What to send back

Your final message is at most 200 words: how many entries and capabilities, which frames you used, what you left out and why, and anything you could not verify. The work is in the file, not in the message.
