#!/usr/bin/env node
// Molecullage auto-trigger for Claude Code: the one reminder hook. Event: UserPromptSubmit.
// Reads the hook payload from stdin. When the prompt mentions illustrative work (figure, panel, schematic, diagram, infographic,
// graphical abstract, plot, chart, render, ChimeraX, palette, poster figure, redo the figures), it prints one line of additionalContext:
//   Molecullage skill covers figure work: load it before drawing.
// Otherwise it prints nothing. Any bad input ends with exit code 0 and no output. It needs no control file and writes no file.
// Off: set "autotrigger": false in molecullage.json (nearest one above the working directory), or remove the entry from settings.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findConfig } from '../mcp/lib/core.mjs';

const WORDS = /\b(figures?|panels?|schematics?|diagrams?|infographics?|graphical abstracts?|plots?|charts?|renders?|chimerax|palettes?|poster figures?)\b/i;
export const LINE = 'Molecullage skill covers figure work: load it before drawing.';

/** The text to print for a hook payload, or '' for silence. Never throws. */
export function reply(payload) {
  try {
    if (!payload || typeof payload.prompt !== 'string' || !WORDS.test(payload.prompt)) return '';
    let cfg = null;
    try { cfg = findConfig(typeof payload.cwd === 'string' ? payload.cwd : process.cwd()); } catch { /* a bad control file does not stop the reminder */ }
    if (cfg && cfg.cfg.autotrigger === false) return '';
    return JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: LINE } }) + '\n';
  } catch { return ''; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let text = '';
  try { for await (const c of process.stdin) text += c; } catch { /* no input */ }
  let payload = null;
  try { payload = JSON.parse(text); } catch { /* not our payload */ }
  const out = reply(payload);
  if (out) process.stdout.write(out);
  process.exit(0);
}
