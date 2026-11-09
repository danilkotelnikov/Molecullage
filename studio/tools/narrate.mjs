import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');
const REPO_ROOT = path.resolve(STUDIO_DIR, '..');

export function buildNarration(job, lang) {
  const deckPath = (job.paths ?? []).find((p) => p.kind === 'deck') ?? job.paths?.[0];
  const stops = deckPath?.stops ?? [];
  const slides = job.story ?? [];
  const secPerWord = lang === 'ru' ? 0.5 : 0.42;
  const entries = [];

  for (let i = 0; i < stops.length; i++) {
    const slide = slides.find((s) => s.stop === i);
    const say = (slide?.say?.[lang] ?? '').trim();
    const startA = Number((stops[i] + 0.6).toFixed(4));
    const words = say.length > 0 ? say.split(/\s+/).filter(Boolean) : [];
    const estEnd = startA + words.length * secPerWord;
    if (i + 1 < stops.length && estEnd > stops[i + 1]) {
      throw new Error(`say for stop ${i} runs into stop ${i + 1}`);
    }
    entries.push({
      a: startA,
      text: say,
      say,
    });
  }

  return entries;
}

function makeSilentWav(durationSec, sampleRate = 22050) {
  const numSamples = Math.max(1, Math.round(durationSec * sampleRate));
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 4, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 4, 'ascii');
  buf.write('fmt ', 12, 4, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 4, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

export function runNarrate(opts) {
  const {
    jobId,
    lang = 'en',
    engine = 'sapi',
    approved = false,
    studioDir = STUDIO_DIR,
    repoRoot = REPO_ROOT,
  } = opts;

  if (engine === 'fish' && !approved) {
    const msg = 'Fish Audio is a paid voice. Ask the owner, then add --approved.';
    console.error(msg);
    return { code: 2, message: msg };
  }

  const jobDir = path.join(studioDir, 'jobs', jobId);
  const jobFile = path.join(jobDir, 'job.json');
  if (!fs.existsSync(jobFile)) {
    console.error(`job file not found: ${jobFile}`);
    return { code: 1 };
  }

  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const entries = buildNarration(job, lang);
  const beatName = `_studio-${jobId}-${lang}`;
  const filmRoot = fs.existsSync(path.join(repoRoot, 'film', 'tools', 'narrate.py'))
    ? path.join(repoRoot, 'film')
    : path.join(REPO_ROOT, 'film');
  const beatDir = path.join(filmRoot, 'src', 'beats', beatName);
  const narTempDir = path.join(filmRoot, 'narration', beatName);
  const filmOutWav = path.join(filmRoot, 'out', 'audio', `${beatName}-${lang}.wav`);
  const secPerWord = lang === 'ru' ? 0.5 : 0.42;

  try {
    fs.mkdirSync(beatDir, { recursive: true });
    fs.writeFileSync(path.join(beatDir, 'narration.json'), JSON.stringify(entries, null, 2) + '\n', 'utf8');
    fs.writeFileSync(path.join(beatDir, 'scene.jsx'), `export const META = { duration: ${job.world.duration} };\n`, 'utf8');

    const cuesOut = path.join(jobDir, `cues.${lang}.json`);
    const wavOut = path.join(studioDir, 'out', 'audio', `${jobId}-${lang}.wav`);
    fs.mkdirSync(path.dirname(wavOut), { recursive: true });

    const narratePy = path.join(filmRoot, 'tools', 'narrate.py');
    let usedRealPy = false;
    if (fs.existsSync(narratePy) && process.env.STUDIO_MOCK_NARRATE !== '1') {
      const pyRes = spawnSync(
        'py',
        ['-3', '-X', 'utf8', narratePy, beatName, '--lang', lang, '--engine', engine, '--no-music'],
        { cwd: filmRoot, encoding: 'utf8' },
      );
      const genCues = path.join(beatDir, 'cues.json');
      if (pyRes.status === 0 && fs.existsSync(genCues) && fs.existsSync(filmOutWav)) {
        fs.copyFileSync(genCues, cuesOut);
        fs.copyFileSync(filmOutWav, wavOut);
        usedRealPy = true;
      }
    }

    if (!usedRealPy) {
      const cues = entries.map((entry) => {
        const rawWords = entry.say.split(/\s+/).filter(Boolean);
        const words = (rawWords.length > 0 ? rawWords : ['...']).map((w, wi) => ({
          w,
          t0: Number((entry.a + wi * secPerWord).toFixed(3)),
        }));
        const b = Number((entry.a + words.length * secPerWord).toFixed(3));
        return {
          a: entry.a,
          b,
          text: entry.text,
          words,
        };
      });
      fs.writeFileSync(cuesOut, JSON.stringify(cues, null, 2) + '\n', 'utf8');
      fs.writeFileSync(wavOut, makeSilentWav(job.world.duration ?? 8));
    }

    return { code: 0, cuesOut, wavOut };
  } finally {
    fs.rmSync(beatDir, { recursive: true, force: true });
    fs.rmSync(narTempDir, { recursive: true, force: true });
    fs.rmSync(filmOutWav, { force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  let jobId = 'zoom-test';
  let lang = 'en';
  let engine = 'sapi';
  let approved = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lang') lang = argv[++i];
    else if (a === '--engine') engine = argv[++i];
    else if (a === '--approved') approved = true;
    else if (!a.startsWith('--')) jobId = a;
  }

  try {
    const res = runNarrate({ jobId, lang, engine, approved });
    process.exit(res.code);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
