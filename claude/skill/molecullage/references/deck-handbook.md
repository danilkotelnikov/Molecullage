# Deck handbook

Version 1, 2026-11-10.

What was learned while a product deck of 13 slides, its PowerPoint export and a four-page report were built with Molecullage. It is written so that a person or an agent can make the next deck without repeating the mistakes. The drawing rules are in `grammar.md` (rules 62 to 99 are about decks and product pictures); this file says how to work, which numbers to use and where the method stops.

The deck engine is the folder `motion` of a working copy. It is not part of this public repository yet, so its commands below are given as they run in a working copy.

## 1. The result in ten lines

1. A deck is a film file of scenes at 1920 by 1080 px. One build gives the web page, the stills, the PDF, the claim list and the PowerPoint file.
2. Each slide shows the object first: a structure, a photograph, or a render of a model at true scale. Text names the parts.
3. A header is the name of the thing. A slide has no subtitle and no status line.
4. Slide text is 28 px or larger. A paragraph stands 40 px or more from a picture. A label has a line that ends on its part.
5. A product picture comes from a CAD model at true scale, rendered in Cycles with physical material values.
6. Two render passes with procedural materials reached 4.5 of 10 on the way from a CAD picture to a studio photograph. Photographs of real parts close the rest of the gap.
7. A structural formula is drawn from atoms and bonds, and a chemistry toolkit checks it.
8. PowerPoint gets native objects at the places of the web deck. Words in a face that is not installed are the one exception; they become pictures.
9. A report is an HTML page in millimetres that Chrome prints to PDF. The build checks that no page overflows.
10. Every number carries its source and its evidence level. A design is written as a design.

## 2. Order of work

1. Read the request and write each task with a number. Give each task one outcome at the end.
2. List what exists: the earlier decks of the project, the engine primitives, the renders, the notes.
3. Build one prototype slide or one prototype render. Get a yes before you build the batch.
4. Build, then run the automatic check. Fix every finding before you look at the slide by eye.
5. Look at every changed still by eye. Then give the stills to one outside reader, once.
6. Write a notes file beside the deck, named `<deck>.notes.md`: what was asked, what changed, the values, the checks, what was not checked.
7. Keep a scratch copy of pictures that are not in git before you render them again.

## 3. Commands

Run from the folder of the film file. `M` is the Molecullage folder.

| Step | Command |
|---|---|
| Check the film | `node M/motion/cli.mjs check <film.json>` |
| Stills, one per scene | `node M/motion/cli.mjs still <film.json> --lang ru --out out` |
| PDF, web page, claim list | the same tool with `pdf`, `page` and `claims` |
| Prose check | `python <harness>/tools/lint_prose.py <file> --mode slide` |
| Formula check | a project script that reads the drawn atoms and bonds and compares SMILES in RDKit |
| PowerPoint to PNG | PowerPoint automation: open the file, `Export(folder, "PNG", width, height)` |

The film file is JSON: a list of scenes, each with items (`text`, `img`, `path`, `circ`, `rect`, `seq`, `widget`) and steps with a spoken line in each language.

## 4. Slide design

| Item | Value |
|---|---|
| Stage | 1920 by 1080 px |
| Smallest slide text | 28 px |
| Exempt from that limit | letters of a sequence row and atom letters of a formula |
| Band of the spoken line | from y 950 px down; the engine writes the spoken line there, and no slide text ends below y 950 px |
| Scene | centred between the title and y 950 px |
| Paragraph to picture | 40 px or more |
| Part label to its part | 8 to 15 px, with a leader line and an end dot of 5 px |
| Spoken line | two lines at most in each language |
| Product name | bottom right corner of every slide, in the face of its logo |

- Fill the slide. A picture that ends at half the height gets a second row or a larger size.
- Give each step one accent colour and dim the rest.
- Draw an arrow from the text of a step to the part it describes.
- Make the gaps over and under each drawing of a row equal.
- Put no paragraph on a slide that already holds two formulas, a scheme and two renders. Use captions of 28 px and put the sentences in the spoken line.
- Paint order is fixed: blocks, then the vector layer of lines and circles, then pictures, then text. Give a picture item the layer number `z: 1` to put it under the vector layer, so that leader lines stay visible over an opaque render.
- The deck check refuses a lone word on a last line, overlapping label boxes, text under the size limit and a glyph that the face does not have. A typographic prime is missing in many faces; use a straight apostrophe.

## 5. Fonts

- Use the face of the venue for all text and the face of the brand logo for the brand words. Two faces are enough. In the first deck these were HSE Sans and Geist.
- A venue face may have no monospace cut. Then set sequence letters in fixed cells, one cell per letter, each letter centred in its cell.
- Measure the widest letter first. In a 20 px face the widest letters are about 15 px wide, so the cell is 16 px. A cell is at least 0.68 of the type size.
- Mark a special position of a sequence with a rounded cell one letter wide, with a white inset of 1 px, so that the mark does not touch its neighbours.
- A proportional face at one pitch still looks a little uneven. Only a true monospace face cures this.
- PowerPoint on another computer swaps a face that is not installed. Export words in such a face as pictures at four times the size, and export all other text as text. Say in the notes which face the file needs.

## 6. Schematics and formulas

- General rules for schemes are in `grammar.md`: two illustrations at most for a mechanism (rule 81), the form of the Nature Reviews journals (rule 82), spheres with a soft light for particles (rule 83).
- Build a structural formula from one repeated unit: a list of atoms with coordinates and a list of bonds. Draw bonds as lines and atom letters as small cells.
- Write the atoms and bonds to a JSON file at build time: one entry per fragment with `atoms` (symbol, x, y) and `bonds` (two atom numbers and an order). A script turns each fragment into SMILES and compares it with the expected SMILES in RDKit. A drawing that fails the comparison is not shown.
- Draw the bond that breaks in the accent colour and name it on the bond. Draw metal ions as labelled circles. Draw one arrow for the attack.
- Say in the claim list which geometry is published and which is placed by description.
- Show the positive case and the negative case side by side, in the same pose and scale.
- Look at three published figures of the same kind before you draw. Write their DOIs and what they share in the notes.

## 7. Product models

- Model each part at true scale in millimetres, part by part, in a CAD library that writes meshes. Electronic components are their own bodies.
- Fix the geometry before the light. Better light does not repair a poor model.
- Give every box-shaped part an edge radius: 1.0 mm on a shell, 0.7 mm on a lid, 0.3 to 0.6 mm on small parts. Add a bevel node of 0.2 to 0.3 mm in the shader for cut edges.
- Show the inside with a cut along the long side or along the axis. A cut face needs its own material: sawn lines on metal, printed roads on a printed part.
- Check that the parts fit before you draw them together. A part that is longer than the opening it should enter must not be drawn inside it; the picture shows what fits.
- Keep the camera, the frame and the picture size fixed between passes. The slide holds labels whose lines end on the parts.
- Find the place of each named part by a ray from the camera and write it as a fraction of the picture width and height. The deck reads these places for its leader lines.
- Details that need geometry and cannot come from a shader: solder fillets, a liquid meniscus, shrink marks, a holder for a loose part.

## 8. Physics of the materials

- Set the scene unit to 1 mm. Then a subsurface radius is a real length, and a layer line of 0.2 mm is 0.2 units.
- Use measured or published optical values: the index of refraction of the plastic, the wax or the liquid; full metallic for a metal; no subsurface scattering in a metal.
- Light enters wax, foam and thin plastic. Give them subsurface scattering with a radius per colour channel; red travels farthest.
- A thin clear film reflects more at a grazing angle. Mix its reflection by the angle to the camera.
- Procedural textures use object coordinates and need no UV map. A drawn picture, such as a circuit board, needs a box projection or a UV map of that one face.
- Pair each 3D scene with one physical principle and let the picture show it: heat that a wax holds, a liquid that climbs a paper strip.
- A number that comes from a model, such as a warm-up time from a thermal model, is named as a model number on the slide and in the claim list.

## 9. Material profiles

Values of the Principled shader in Cycles, scene unit 1 mm.

| Material | Base colour | Roughness | Other |
|---|---|---|---|
| Steel wall | #D9D9D6, metallic 1 | 0.30 | anisotropy 0.6 |
| Aluminium, bead-blasted | #D9D9D6, metallic 1 | 0.42 | fine isotropic bump; sawn cut faces at 0.46 with lines every 0.25 mm |
| Printed plastic | #8E8E8E | about 0.40, with a slow change of 0.07 | index of refraction 1.48; subsurface weight 0.06 with radius 0.7, 0.5, 0.4 mm; layer lines of 0.2 mm with a random height per layer |
| Clear tube plastic | #FFFFFF | 0.16 | transmission 0.93, index of refraction 1.49; a mould seam as a faint ridge |
| Foam | light neutral grey | 0.95 | subsurface weight 0.15 with radius about 2 mm; cell walls at 0.4 mm |
| Paraffin | pale cream | 0.42 | index of refraction 1.44; subsurface weight 1.0 by random walk with radius 4.0, 2.4, 1.4 mm; cloud noise; a warmer band along the edge, 7 percent of the width, mixed in the shader |
| Clear film | none | 0.07 | reflection weight 0.05 + 0.95 times (1 minus the cosine of the view angle) to the fourth power; creases at two scales; haze 6 percent |
| Circuit board | palette green, darkened; lighter over copper | lower on the mask than on the pads | a drawn picture of traces, pads and vias; outline marks with no letters |

- Use neutral greys. A grey with a blue cast makes cut aluminium read blue.
- Give the body of a device a neutral grey or a metal finish. Keep accent colours for small parts.
- Add wear at two scales: a slow change of roughness for smudges, and hair scratches that lower the roughness.
- A dust or speckle layer on clear film reads as render noise. Keep it very weak or leave it out.

## 10. Light and render settings

The energies and sizes below are the numbers of the project render script, with area lights around an object about 100 mm long. Read them as ratios between the lights and tune the absolute level to the scene.

| Setting | Value |
|---|---|
| Key light | one large soft source from the upper left: energy 95, size 2.6 in the units of the script |
| Other lights | fill 3, front 16 off the axis, top 7, a strip light from behind |
| Reflections | a studio HDRI; light cards that show only in reflections give long highlights on tubes |
| Ground | white, with a soft contact shadow that ends inside the frame |
| Lens | 90 mm for a whole device; f-stop 22, so that the whole object stays sharp |
| Samples | 256 with denoising; a clamp of 3 on indirect light removes bright specks |
| Tone map | Standard, because the step from white to alpha needs white to clip |
| Time | 24 to 223 s for a picture on one desktop GPU |

- Test at a small size and few samples first. Render the final at the size of the present picture.
- Run one render at a time.

## 11. Proteins

- Build a smooth surface from all atoms in a structure program, one mesh per chain or partner group, and render the meshes in Cycles. Never draw a C-alpha tube or a bead cloud.
- Keep the pose, the crop and the palette colours between passes.
- Light, in the numbers of the project script: key 34 with a size of 4.2 molecule radii, rim 22 with a size of 1.4 radii, ambient occlusion at 6 angstrom with a mix of 0.40, a sheen of 0.35.
- Give the name of a protein with no database entry in it. The entry belongs in the claim list.
- A bound and a free form of the same enzyme come from the same set of meshes. Hide the meshes of the partner for the free form; the enzyme mesh is closed, so no hole appears.

## 12. Limit of procedural renders

An outside reader compared the first and the second pass side by side. Each picture moved closer to a photograph, and the mark stayed at 4.5 of 10.

What still betrays a render:
- edges that are too sharp and parts with no mould seam;
- flat board marks with no component height;
- a wax or liquid surface with no meniscus where a part enters it;
- a net that stays flat over the object under it;
- paper pads with the same grain everywhere;
- small parts with a weak contact shadow.

What to do:
1. Photograph the real part when it exists. One afternoon with bought parts closes the gap.
2. Use a render for what does not exist yet, and say in the caption that it is a render of a model.
3. Compare each render with a photograph of the same kind of part before you call it finished. Write the page address of the photograph.

## 13. Assets

Two kinds of picture reach the deck.

- A part picture: the render is cut to the part, and its white ground becomes alpha. The deck places it by its own edges.
- A studio picture: the whole frame stays, and the soft shadow lives in the alpha channel. Fade its edge over the last 2 to 10 percent, so that a shadow does not end in a hard line.

One file, `spots.json`, holds for each picture its aspect and the places of its named parts as fractions. A re-render must keep every key and the picture size.

## 14. PowerPoint

1. Export the finished frame of every slide from the plan of the engine: texts, lines, circles, polygons, pictures and letter rows with the numbers that the page draws.
2. A free HTML block is laid out by Chrome; read its boxes, vector paths and text lines back from the page.
3. Build the file with native objects in the paint order of section 4.
4. Open the file in PowerPoint, export every slide as PNG and compare it with the still. A share of 0.2 to 2.4 percent of strongly different pixels is the level of edge smoothing.
5. The owner may return the file with pen notes. PowerPoint draws the ink into its PNG export; read each exported slide by eye and write every note as a task.

## 15. Reports

- Write the report as one HTML page with a section of 210 by 297 mm per page, type in points, charts as inline SVG in millimetres. Chrome prints it to PDF.
- The build measures every page: the last block must end above the footer, nothing may enter the margin, every picture must load. The build fails when a page overflows.
- Number figures in the build, so that a moved section never breaks a number.
- Compute every derived number in the build from named inputs. Print the inputs in the caption.
- A map: an equal-area conic projection, regions shaded by one measure, a few named dots with leader lines into empty ground. Natural Earth is public domain. Say in the caption whose borders the map draws.
- A table of companies with logos: take each logo from the company's own site and show it unchanged. Put a white logo on a dark plate. Say in the caption that the marks belong to the companies and whether any company is a client.
- A roadmap with no dates: an axis of months from the start, a solid bar for the fastest path, a dashed outline for the slow one, the cost range at the right.
- Name an optimistic case as optimistic. State its price, its share and its rate as assumptions in the same paragraph.

## 16. Evidence and wording

- Give every picture and number one level: measured, published, simulated, design or target.
- Write a product that is not built as a design: "we design it to find", "is designed to hold". Never write "finds", "holds" or "works" for it.
- Say for which case a cost holds when the text speaks of another case.
- Read the source before you use its number. Write what you read: the page, an excerpt or a summary.
- Market reports of vendors can differ fifty times for one year. Show the spread and count from a measured base, such as an area or a volume.
- Money facts come from documents: filed accounts in a state register, purchase notices, statistics of an official body. Keep every page address and quote in one data file beside the report.

## 17. Checks

| Check | What it catches |
|---|---|
| Deck check of the engine | small text, text in the band of the spoken line, overlapping labels, lone words, missing glyphs |
| Formula check in RDKit | a wrong atom or bond in a drawn fragment |
| PowerPoint export and pixel comparison | a shifted or missing object in the PowerPoint file |
| Report build check | an overflowing page, a broken picture |
| Prose check | refused words, slogan headers, clipped status lines |
| One outside read of the stills | a label on the wrong part, a mark that touches a letter, a design that reads as a fact, wrong arithmetic |

Give the outside reader the pictures and plain questions. Ask it to name the page and the element for every point. One read per deliverable is enough; fix what it finds and say what you kept.

## 18. Helpers

- Give a helper one goal, the files, what the first pass got wrong, the rules that stay and what done looks like.
- Tell it what to report: a table, the changed values, the page addresses it looked at, what it could not do.
- A helper's report is a claim. Look at its pictures and check two of its numbers against the source yourself.
- Split work only when it is truly parallel: renders in one helper, facts in another, layout in the main session.

## 19. Shell traps

- A here-document that holds an apostrophe or a backtick fails, and a quoted one can turn a double backslash into a single one. Write such text to a file with the editor tool and run the file.
- Patch a long script with a small Python file that asserts each old string occurs once. A failed assert changes nothing.
- A file can hold non-breaking spaces and Windows line ends. Match short, unique strings.
- Do not start two heavy processes at once on one desktop.
