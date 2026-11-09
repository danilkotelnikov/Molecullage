import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isBig } from '../core/job.ts';
import { BIG_JOB_REFUSAL } from './export.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');
const FORBIDDEN_RE = /\.(env|pem|key|p12)$|\.notes\.md$|ledger|\.pdb$|\.cif$/i;

function walkRelFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        out.push(path.relative(rootDir, full).replace(/\\/g, '/'));
      }
    }
  };
  walk(rootDir);
  return out.sort();
}

export function siteFiles(jobId, studioDir = STUDIO_DIR) {
  const siteRoot = path.join(studioDir, 'out', 'site', jobId);
  return walkRelFiles(siteRoot);
}

function copyDirRecursive(srcDir, dstDir, filterFn = () => true) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(dstDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath, filterFn);
    } else if (filterFn(entry.name, srcPath)) {
      fs.mkdirSync(path.dirname(dstPath), { recursive: true });
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function ensureNoindex(htmlFile) {
  if (!fs.existsSync(htmlFile)) return;
  const html = fs.readFileSync(htmlFile, 'utf8');
  if (!html.includes('name="robots"') && !html.includes("name='robots'")) {
    const updated = html.replace('<head>', '<head>\n<meta name="robots" content="noindex">');
    fs.writeFileSync(htmlFile, updated, 'utf8');
  }
}

export function buildSite(jobId, studioDir = STUDIO_DIR) {
  const jobDir = path.join(studioDir, 'jobs', jobId);
  const jobFile = path.join(jobDir, 'job.json');
  if (!fs.existsSync(jobFile)) {
    console.error(`job file not found: ${jobFile}`);
    return { code: 1 };
  }

  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  if (isBig(job) && !job.storyboard?.approvedAt) {
    console.error(BIG_JOB_REFUSAL);
    return { code: 2, message: BIG_JOB_REFUSAL };
  }

  // Scan jobs/<job>/ (excluding internal review/ subfolder) and out/ for forbidden files
  for (const rel of walkRelFiles(jobDir)) {
    if (rel.startsWith('review/')) continue;
    if (FORBIDDEN_RE.test(rel)) {
      const msg = `refused forbidden file in jobs/${jobId}: ${rel}`;
      console.error(msg);
      return { code: 2, message: msg };
    }
  }

  const outDir = path.join(studioDir, 'out');
  if (fs.existsSync(outDir)) {
    for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.startsWith(`${jobId}-`) && FORBIDDEN_RE.test(entry.name)) {
        const msg = `refused forbidden file in out: ${entry.name}`;
        console.error(msg);
        return { code: 2, message: msg };
      }
    }
  }

  const distDir = path.join(studioDir, 'web', 'dist');
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    const buildRes = spawnSync('npm', ['run', 'build'], { cwd: studioDir, shell: true, encoding: 'utf8' });
    if (buildRes.status !== 0) {
      console.error(buildRes.stderr || buildRes.stdout);
      return { code: 1 };
    }
  }

  const siteDir = path.join(studioDir, 'out', 'site', jobId);
  fs.rmSync(siteDir, { recursive: true, force: true });
  fs.mkdirSync(siteDir, { recursive: true });

  // 1. Copy web/dist -> deck/
  const deckDir = path.join(siteDir, 'deck');
  copyDirRecursive(distDir, deckDir);
  for (const rel of walkRelFiles(deckDir)) {
    if (rel.endsWith('.html')) ensureNoindex(path.join(deckDir, rel));
  }

  // 2. Copy jobs/<job>/ -> deck/jobs/<job>/ (job.json, edits.jsonl, assets, crops/, cues.*.json)
  const dstJobDir = path.join(deckDir, 'jobs', jobId);
  fs.mkdirSync(dstJobDir, { recursive: true });
  for (const entry of fs.readdirSync(jobDir, { withFileTypes: true })) {
    const name = entry.name;
    if (entry.isDirectory()) {
      if (name === 'crops') {
        copyDirRecursive(path.join(jobDir, name), path.join(dstJobDir, name));
      }
      continue;
    }
    if (
      name === 'job.json' ||
      name === 'edits.jsonl' ||
      name.endsWith('.glb') ||
      name.endsWith('.gltf') ||
      name.endsWith('.png') ||
      name.endsWith('.svg') ||
      /^cues\.[a-z]+\.json$/i.test(name)
    ) {
      fs.copyFileSync(path.join(jobDir, name), path.join(dstJobDir, name));
    }
  }

  // 3. Copy lenses/ -> deck/lenses/
  copyDirRecursive(
    path.join(studioDir, 'lenses'),
    path.join(deckDir, 'lenses'),
    (name) => name.endsWith('.json'),
  );

  // 4. Copy cache/<job>/ (*.png only, skip *.key)
  const cacheJobDir = path.join(studioDir, 'cache', jobId);
  if (fs.existsSync(cacheJobDir)) {
    copyDirRecursive(
      cacheJobDir,
      path.join(deckDir, 'cache', jobId),
      (name) => name.toLowerCase().endsWith('.png'),
    );
  }

  // 5. Copy media/<job>-*.mp4 and <job>-*.pdf
  const mediaFiles = [];
  if (fs.existsSync(outDir)) {
    for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
      if (
        entry.isFile() &&
        entry.name.startsWith(`${jobId}-`) &&
        (entry.name.endsWith('.mp4') || entry.name.endsWith('.pdf'))
      ) {
        const mediaDir = path.join(siteDir, 'media');
        fs.mkdirSync(mediaDir, { recursive: true });
        fs.copyFileSync(path.join(outDir, entry.name), path.join(mediaDir, entry.name));
        mediaFiles.push(entry.name);
      }
    }
  }

  // 6. robots.txt
  fs.writeFileSync(path.join(siteDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');

  // 7. index.html
  const mediaLinks = mediaFiles.map((f) => `<li><a href="media/${f}">${f}</a></li>`).join('\n');
  const rootHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>${jobId} — Molecullage Studio</title>
</head>
<body>
<h1>${jobId}</h1>
<p><a href="deck/index.html?job=${jobId}">Open interactive deck</a></p>
<ul>
${mediaLinks}
</ul>
</body>
</html>
`;
  fs.writeFileSync(path.join(siteDir, 'index.html'), rootHtml, 'utf8');

  return { code: 0, siteDir, files: siteFiles(jobId, studioDir) };
}

export function publishSite(jobId, approved = false, studioDir = STUDIO_DIR) {
  if (!approved) {
    const msg = "Publishing needs the owner's yes. Ask him, then add --approved.";
    console.error(msg);
    return { code: 2, message: msg };
  }
  const siteDir = path.join(studioDir, 'out', 'site', jobId);
  const res = spawnSync('npx', ['vercel', 'deploy', siteDir, '--yes'], { cwd: studioDir, shell: true, encoding: 'utf8' });
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout);
    return { code: 1 };
  }
  const url = (res.stdout ?? '').trim().split(/\r?\n/).pop() ?? '';
  const ledgerFile = path.join(studioDir, 'ledger', `job-${jobId}.md`);
  fs.mkdirSync(path.dirname(ledgerFile), { recursive: true });
  fs.appendFileSync(ledgerFile, `publish ${new Date().toISOString()} ${url}\n`, 'utf8');
  console.log(url);
  return { code: 0, url };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  const approved = argv.includes('--approved');
  const positional = argv.filter((a) => !a.startsWith('--'));
  let subcmd = 'build';
  let jobId = 'zoom-test';
  if (positional[0] === 'build' || positional[0] === 'publish') {
    subcmd = positional[0];
    jobId = positional[1] ?? 'zoom-test';
  } else {
    jobId = positional[0] ?? 'zoom-test';
  }
  const isPublish =
    subcmd === 'publish' || argv.includes('--publish') || process.env.npm_lifecycle_event === 'publish';

  if (isPublish) {
    const res = publishSite(jobId, approved);
    process.exit(res.code);
  } else {
    const res = buildSite(jobId);
    process.exit(res.code);
  }
}
