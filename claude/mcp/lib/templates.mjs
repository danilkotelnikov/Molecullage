// One line per template and the public entry it is built on in examples/.
export const TEMPLATES = {
  pipeline: { line: 'Screening pipeline in three columns: stage strips, tool blocks, data pills with placeholder sizes, badges, an enlarged block with two zoom lines, a key.', example: '1MEL (picture only)' },
  sequence: { line: 'Sequence viewer: a letter per cell, tracks for loops and observed residues, nested sets, gap kinds in the key.', example: '1MEL chain A' },
  contacts: { line: 'Typed contact tile map with a structure close-up: split tiles, star for backbone, leaders to real residues.', example: '1MEL (also 1VFB table)' },
  series: { line: 'Noise-to-structure strip: C-alpha spheres on a straight path, five frames, t written under each.', example: '1MEL chain A' },
  dates: { line: 'Date matrix: entries by kind of date against a cut-off, with a shared time axis.', example: '1VFB, 1MEL, 4KRL, 7Z0X' },
  plots2: { line: 'Two matplotlib panels under kit labels at shared millimetre boxes.', example: '1MEL, 4KRL' },
  structures: { line: 'Separate panels for separate objects, one style and one colour code.', example: '1MEL, 7Z0X, 1IGT' },
  palette: { line: 'Palette sheet: every family, dark tone, contrast and colour-vision distances of a token file.', example: 'none (reads the token file)' },
};

export const NOTES_STUB = (key, template) => `# ${key}

**Message.** One sentence of 20 words or fewer.

**Template.** ${template}. Build and QA commands are in the molecullage skill.

**Data.** Every PDB entry with id, chains, deposit date and the date you checked it against data.rcsb.org. Every computed table with the tool and its version.

**Claim boundary.** The one-line footnote, 14 words or fewer: what is data, what is illustration.

**QA.** The marks, and the reason for each one that fails.

**Reads.** Blind read: date, reader, what was fixed. Overclaim read: date, reader, what was fixed.

**Ten-second sentence.** What a stranger says the figure shows.
`;
