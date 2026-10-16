// Shared by build.mjs, the hook and the MCP server: find and read structfig.json, locate Chrome and the Python launcher.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const DEFAULTS = {
  strictness: 'normal',
  palette: 'tokens/tokens.base.json',
  typeLadder: { letter: 9, title: 7.5, label: 7, floor: 6.5, math: 8.4 },
  words: { schematic: 130, plate: 90, box: 6, arrow: 3, footnote: 14 },
  widthMm: [178, 89],
  review: 'none',
  claimBoundary: '',
  chimerax: 'auto',
  art: 'art',
  hook: true,
  hookBlocks: false,
};

/** Walk up from `start` (a file or folder) to the nearest structfig.json, or figpilot.json (same keys, written by the companion repository). Returns { file, dir, cfg } or null. */
export function findConfig(start) {
  let dir = path.resolve(start);
  if (fs.existsSync(dir) && fs.statSync(dir).isFile()) dir = path.dirname(dir);
  for (;;) {
    const f = ['structfig.json', 'figpilot.json'].map((n) => path.join(dir, n)).find((p) => fs.existsSync(p));
    if (f) return { file: f, dir, cfg: { ...DEFAULTS, ...JSON.parse(fs.readFileSync(f, 'utf8')) } };
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

/** Resolve a path from the config: relative to the config folder, falling back to this repository. */
export function resolveIn(base, p) {
  const a = path.resolve(base, p);
  return fs.existsSync(a) ? a : path.resolve(REPO, p);
}

export function findChrome() {
  const env = process.env.STRUCTFIG_CHROME;
  if (env && fs.existsSync(env)) return env;
  const c = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
  ];
  return c.find((p) => fs.existsSync(p)) || null;
}

/** [command, ...leading args] for Python 3. $STRUCTFIG_PYTHON wins; Windows uses the py launcher. */
export function pythonCmd() {
  if (process.env.STRUCTFIG_PYTHON) return [process.env.STRUCTFIG_PYTHON];
  return process.platform === 'win32' ? ['py', '-3'] : ['python3'];
}

export function findChimeraX(cfgValue = 'auto') {
  const env = process.env.STRUCTFIG_CHIMERAX;
  if (env && fs.existsSync(env)) return env;
  if (cfgValue && cfgValue !== 'auto' && fs.existsSync(cfgValue)) return cfgValue;
  const roots = ['C:/Program Files', '/Applications', '/usr/lib', '/opt'];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    for (const d of fs.readdirSync(r)) {
      if (!/^ChimeraX/i.test(d)) continue;
      for (const rel of ['bin/ChimeraX.exe', 'Contents/MacOS/ChimeraX', 'bin/ChimeraX']) {
        const f = path.join(r, d, rel);
        if (fs.existsSync(f)) return f;
      }
    }
  }
  return null;
}
