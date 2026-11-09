import fs from 'node:fs';
import path from 'node:path';

export function readEdits(jobDir) {
  const file = path.join(jobDir, 'edits.jsonl');
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, 'utf8');
  if (!raw.trim()) return [];
  const lines = raw.replace(/\r?\n$/, '').split(/\r?\n/);
  const edits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    try {
      edits.push(JSON.parse(line));
    } catch {
      throw new Error(`${file}:${i + 1}: bad edit line`);
    }
  }
  return edits;
}

export function appendEdit(jobDir, edit) {
  const file = path.join(jobDir, 'edits.jsonl');
  fs.appendFileSync(file, JSON.stringify(edit) + '\n', 'utf8');
}

export function undoLast(jobDir) {
  const file = path.join(jobDir, 'edits.jsonl');
  if (!fs.existsSync(file)) return null;
  const edits = readEdits(jobDir);
  if (edits.length === 0) return null;
  const removed = edits[edits.length - 1];
  const remaining = edits.slice(0, -1);
  const tmp = path.join(jobDir, 'edits.jsonl.tmp');
  const body = remaining.length > 0 ? remaining.map((e) => JSON.stringify(e)).join('\n') + '\n' : '';
  fs.writeFileSync(tmp, body, 'utf8');
  fs.renameSync(tmp, file);
  return removed;
}
