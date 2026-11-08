# Clean-room method for the Studio (REA protocol)

Version 1, 2026-11-02. Proposal for the owner's yes.

I take "REA" to mean Reverse Engineering Analysis. the owner should confirm this. The Studio's code is written from scratch and is free to sell. It never copies code, licensed file-format code, icons, UI layouts, documentation text or product names. This note is research and is not legal advice. A lawyer should check the final protocol.

## 1. Clean-room design and the cases

Clean-room design splits the work in two. Examiners study the original and write a functional specification. A lawyer screens it. A separate team builds from the specification alone [19]. No law requires it. It shows independent creation and gives no defence against patents [19].

| Case | What matters for us |
|---|---|
| Sega v. Accolade, 9th Cir. 1992 | Disassembling a program for a legitimate reason, with no other way to reach its unprotected functional parts, was fair use [10]. |
| Atari v. Nintendo, Fed. Cir. 1992 | Study of chips in rightful possession was lawful. Source obtained by false statements was not. Copying beyond what compatibility needs likely infringed (preliminary ruling) [12]. |
| Sony v. Connectix, 9th Cir. 2000 | Intermediate copies made during reverse engineering were fair use, because the final product held no copied code [11]. |
| Computer Associates v. Altai, 2d Cir. 1992 | Abstraction, filtration, comparison: strip out parts dictated by efficiency or external factors and public-domain parts, then compare what remains. A rewrite by eight programmers who had not worked on the old version did not infringe [13]. |
| Lotus v. Borland, 1st Cir. 1995 | A menu command hierarchy was an uncopyrightable method of operation [14]. The Supreme Court split 4 to 4 in 1996, so it is First Circuit law only [15]. |
| Google v. Oracle, U.S. 2021 | The Court assumed the API code was copyrightable. Copying only what programmers needed to reuse their skills was fair use, 6 to 2 [16]. |
| SAS v. World Programming, CJEU 2012 | Functionality, programming language and data file formats are not protected expression. A licensee may observe, study and test. Copying from a user manual can infringe the manual [2]. |

## 2. What the statutes say (pointers)

- **EU Directive 2009/24/EC.** Ideas and principles behind a program, including its interfaces, are not protected (art. 1(2)). A person with a right to use a copy may observe, study and test it while loading and running it (art. 5(3)). Decompiling is allowed only for interoperability of an independent program, only for needed parts, and the result may not feed a substantially similar program (art. 6) [1].
- **US.** Copyright never covers an idea, procedure, process, system or method of operation (17 USC 102(b)) [4]. Circumventing an access control is banned, with periodic exemptions. A narrow exemption lets a lawful holder do so only for interoperability (17 USC 1201(f)) [5].
- **Russia, pointer only.** Civil Code art. 1280 lets a lawful user run and back up a program. Its paragraph 3 allows decompiling for interoperability under conditions that mirror EU art. 6 [9]. I read an unofficial mirror. This is no opinion. Ask Russian counsel.

Articles 6 and 1201(f) cover interoperability. Re-implementing features is a different goal. So the Studio never decompiles.

## 3. Contract and licence terms

- EU: contract terms against art. 5(2), 5(3) or 6 are void (art. 8) [1][2]. Art. 5(1) gives way to contract terms [1].
- US: a shrink-wrap ban on reverse engineering was enforced and not pre-empted (Bowers v. Baystate, Fed. Cir. 2003, one judge dissenting) [17][18].
- Trade secrets: studying or testing a lawfully held product is a lawful way to learn secrets, if no valid duty limits it (EU Directive 2016/943 art. 3(1)(b)) [3]. US law excludes reverse engineering from "improper means" [6].

So our rule for Russia, the EU and the US is: observe only a lawfully obtained copy, and only where its licence allows it. Atari shows that an unauthorised copy taints the copying that follows [12]. Read each licence for bans on reverse engineering, competitive use and benchmarking. Check trial and education licences, which may be narrower.

## 4. Other rights

- **Patents.** Study is allowed. Making, using or selling a patented invention during its term infringes [8]. A term runs 20 years from filing [7]. A paper can describe a patented method. A patent on an implementation of marching cubes issued in 1987 and expired in 2005 [20]. Record a patent check for every algorithm.
- **Trademarks.** Product names stay out of code and product text. Vendors guard them [24][29]. The atlas is internal and may use names.
- **Documentation, icons, UI look, sample content.** These are copyright works (icons are usually pictorial works [4]). Manual text can be infringed [2]. Never copy them. Never use product sample files as test inputs.
- **Trade secrets.** Never use leaked or stolen material.

## 5. Open-source code

- Reading open-source code is allowed. Copying or adapting its expression needs permission. GPLv3 defines "modify" as copying or adapting in a way that needs copyright permission [21]. A modified source version must be licensed whole under GPL [21]. Blender source is GPL v2 or later. Cycles is Apache 2.0 [22].
- MIT, BSD and Apache allow reuse with notices. LGPL covers the library. MPL covers the file. GPL covers the whole work [23]. The Studio copies none of it. A dependency needs a separate licence review.
- The split lowers the risk. The spec team reads and writes behaviour as words and numbers. The implementers never see the code, so they cannot copy it from memory.
- The method in a paper lies outside copyright [4]. Implement it from the maths, never from the paper's text or code. Cite the paper and check patents.

## 6. File formats

| Format | Safe route | Avoid |
|---|---|---|
| 3DM | openNURBS reads and writes 3DM without Rhino. Its developer page says use is free and commercial use is welcome [25]. The 8.x LICENSE is a short custom notice. It does not contain the MIT text [24]. This corrects the brief. A lawyer should confirm it before we bundle it. | Parsing 3DM by trial and error. |
| FBX | The FBX SDK, under Autodesk's agreement. It allows reader and writer products and requires an attribution notice, and it bans reverse engineering of the SDK [26]. Terms may differ by version. the owner must accept them. | Parsing FBX without the SDK. |
| PSD | Adobe's public specification (2019) is for third parties. It is copyright and informational. The cloud format is private [27]. | Private variants. |
| BLEND | Blender's DNA description is self-describing [28]. Source is GPL, so this is T3, spec team only. | Copying DNA headers. |
| C4D, AI, DRP | Route not verified. Check at T1. | Guessing. |
| USD, glTF, Assimp, OpenTimelineIO | OpenUSD is Apache 2.0-style with a trademark clause [29]. glTF is a royalty-free spec [30]. Assimp is BSD [31]. OpenTimelineIO is Apache 2.0 [32]. | Dropping the notices the licences require. |

Prefer open exchange (glTF, USD) for output and import.

## 7. Our protocol (the owner plus AI agents)

### Tiers

| Tier | Work | the owner's yes |
|---|---|---|
| T1 | Public manuals, papers, SDK docs, format specifications. | None per product. Ask first if a page needs a login or accepting terms. |
| T2 | Black-box tests of a lawfully obtained copy. Inputs and outputs only. No decompiling. Record each test. | Yes per product. the owner gets the copy himself and checks the licence. Agents do not download, install or sign in. |
| T3 | Reading open-source code, spec team only. | Yes per repository, after its licence is logged. |

### Roles and wall

- **Spec team:** agents that read sources and write specs in our words. They may see product material.
- **Implementation team:** fresh agents. They see only `spec/` and `tests/`. They never see product material, the atlas or REA notes.
- Keep separate folders: `rea/` (notes, sources, test logs) and `spec/` (released specs). No agent works on both sides of one feature.
- A reviewer (a third fresh agent, or the owner) releases each spec. The reviewer checks the wall from session logs: implementers opened only `spec/` and `tests/`. The reviewer also searches the code for product names, identifiers and comments.
- **The AI gap.** A wall controls what an agent is shown. It cannot erase what a model learned in training, which may include GPL code. So the reviewer compares each implementation with the public open-source code for that feature.

### Feature-spec template

```
Spec <id>, version, date
Name: neutral words, no product names
Purpose: one sentence
Inputs / outputs: type, unit, range
Parameters: name | unit | range | our default
Edge cases: list
Tests: our own inputs as numbers -> expected numbers, tolerance
  (expected values come from maths, a paper or a recorded T2 run)
Provenance: per fact: URL | tier | date | reader
Patent check: result, date
Reviewer: name, date
```

### Provenance record

One line per fact: fact id, spec id, source URL, tier, date read, reader agent, licence or terms checked (where), note.

### Audit checklist

1. Every fact has a provenance line.
2. Each T2 fact has the owner's yes, a licence check and a test record.
3. No source needed a login or terms without a yes.
4. No 8-word run in a spec matches its source.
5. No product name, icon, layout, sample file or code appears in specs, tests or code.
6. Session logs show the wall held.
7. Code was compared with open-source code for the feature.
8. Patent and trademark checks are recorded.
9. Every dependency's licence is recorded.

### Never allowed

- Copying text, code, assets or names.
- Putting product names, marks or icons in code or product text.
- Decompiling, disassembling or inspecting memory of a product.
- Breaking protections, keys, trial limits or encryption.
- Reading leaked source or specs, or posts that quote them.
- Using cracked copies, shared accounts or any copy the owner did not acquire.
- Showing spec-side material to an implementer.

### By product type

| Type | Rule |
|---|---|
| Proprietary desktop program | T1 first. T2 only with the owner's yes and a licence check. |
| Open-source program | T1 first. T3 only if the docs fall short. Check the licence. Spec team only. |
| Public algorithm in a paper | T1. Implement the maths. Cite it. Check patents. Reference code is T3. |
| Web service | Read the terms first. Observe only as a normal user or through the public API. No hidden endpoints, no scraping beyond the terms. No sign-up without the owner. A lawyer should check this row. |

## Sources

[1] https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32009L0024
[2] https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:62010CJ0406
[3] https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016L0943
[4] https://www.law.cornell.edu/uscode/text/17/102
[5] https://www.law.cornell.edu/uscode/text/17/1201
[6] https://www.law.cornell.edu/uscode/text/18/1839
[7] https://www.law.cornell.edu/uscode/text/35/154
[8] https://www.law.cornell.edu/uscode/text/35/271
[9] https://legalacts.ru/kodeks/GK-RF-chast-4/razdel-vii/glava-70/statja-1280/ (unofficial mirror)
[10] https://www.copyright.gov/fair-use/summaries/segaenters-accolade-9thcir1992.pdf
[11] https://www.copyright.gov/fair-use/summaries/sony-connectix-9thcir2000.pdf
[12] https://www.copyright.gov/fair-use/summaries/atari-nintendo-fedcir1992.pdf
[13] https://www.bitlaw.com/source/cases/copyright/altai.html
[14] https://law.resource.org/pub/us/case/reporter/F3/049/49.F3d.807.93-2214.html
[15] https://en.wikipedia.org/wiki/Lotus_Development_Corp._v._Borland_International,_Inc. (secondary)
[16] https://www.supremecourt.gov/opinions/20pdf/18-956_d18f.pdf
[17] https://en.wikipedia.org/wiki/Bowers_v._Baystate_Technologies,_Inc. (secondary)
[18] https://www.wilmerhale.com/en/insights/publications/shrink-wrap-licenses-and-reverse-engineering-april-16-2003 (secondary)
[19] https://en.wikipedia.org/wiki/Clean-room_design (secondary)
[20] https://en.wikipedia.org/wiki/Marching_cubes (secondary)
[21] https://www.gnu.org/licenses/gpl-3.0.html
[22] https://www.blender.org/about/license/
[23] https://choosealicense.com/licenses/
[24] https://raw.githubusercontent.com/mcneel/opennurbs/8.x/LICENSE
[25] https://developer.rhino3d.com/guides/opennurbs/what-is-opennurbs/
[26] https://unity.com/legal/autodesk-fbx (Unity-hosted copy of Autodesk's agreement)
[27] https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/
[28] https://developer.blender.org/docs/features/core/dna/
[29] https://raw.githubusercontent.com/PixarAnimationStudios/OpenUSD/release/LICENSE.txt
[30] https://github.com/KhronosGroup/glTF
[31] https://raw.githubusercontent.com/assimp/assimp/master/LICENSE
[32] https://raw.githubusercontent.com/AcademySoftwareFoundation/OpenTimelineIO/main/LICENSE.txt
