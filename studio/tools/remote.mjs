import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');

export function runRemote(opts) {
  const {
    jobId,
    shotId,
    task,
    dry = false,
    studioDir = STUDIO_DIR,
    remoteConfigPath = path.join(studioDir, 'remote.json'),
  } = opts;

  if (!fs.existsSync(remoteConfigPath)) {
    const msg = `remote stopped at step config: missing ${remoteConfigPath}`;
    console.error(msg);
    return { code: 1, lines: [msg] };
  }

  const remote = JSON.parse(fs.readFileSync(remoteConfigPath, 'utf8'));
  const { host, user, folder, blender = 'blender' } = remote;
  const runId = `r-${Date.now()}`;
  const remoteWork = `${folder}/${jobId}/${shotId}/${runId}`;
  const cacheDir = path.join(studioDir, 'cache', jobId, shotId);
  const outMp4 = path.join(studioDir, 'out', `${jobId}-${shotId}.mp4`);

  const jobFile = path.join(studioDir, 'jobs', jobId, 'job.json');
  const job = fs.existsSync(jobFile) ? JSON.parse(fs.readFileSync(jobFile, 'utf8')) : {};
  const shot = (job.shots ?? []).find((s) => s.id === shotId) ?? { fps: 30 };

  const commands = [];
  commands.push({
    step: 'connect',
    cmd: 'ssh',
    args: ['-o', 'BatchMode=yes', `${user}@${host}`, `mkdir -p "${remoteWork}"`],
  });

  if (task === 'encode') {
    commands.push({
      step: 'upload',
      cmd: 'scp',
      args: ['-B', `${cacheDir}/*.png`, `${user}@${host}:${remoteWork}/`],
    });
    commands.push({
      step: 'encode',
      cmd: 'ssh',
      args: [
        '-o',
        'BatchMode=yes',
        `${user}@${host}`,
        `cd "${remoteWork}" && nice -n 10 ffmpeg -y -framerate ${shot.fps} -i %05d.png -c:v libx264 -pix_fmt yuv420p -crf 18 out.mp4`,
      ],
    });
    commands.push({
      step: 'download',
      cmd: 'scp',
      args: ['-B', `${user}@${host}:${remoteWork}/out.mp4`, outMp4],
    });
  } else if (task === 'render') {
    commands.push({
      step: 'upload',
      cmd: 'scp',
      args: ['-B', `${cacheDir}/*.glb`, `${cacheDir}/*.camera.json`, `${user}@${host}:${remoteWork}/`],
    });
    commands.push({
      step: 'render',
      cmd: 'ssh',
      args: [
        '-o',
        'BatchMode=yes',
        `${user}@${host}`,
        `cd "${remoteWork}" && nice -n 10 "${blender}" -b --factory-startup -P render_world.py -- --device CPU`,
      ],
    });
    commands.push({
      step: 'download',
      cmd: 'scp',
      args: ['-B', `${user}@${host}:${remoteWork}/*.png`, `${cacheDir}/`],
    });
  } else {
    const msg = `remote stopped at step args: unknown task "${task}"`;
    console.error(msg);
    return { code: 1, lines: [msg] };
  }

  const lines = commands.map((c) => `${c.cmd} ${c.args.join(' ')}`);
  if (dry) {
    for (const l of lines) console.log(l);
    return { code: 0, lines };
  }

  for (const step of commands) {
    const res = spawnSync(step.cmd, step.args, { encoding: 'utf8', timeout: 15000 });
    if (res.status !== 0 || res.error) {
      const reason = (res.stderr || res.stdout || res.error?.message || 'command failed').trim();
      const msg = `remote stopped at step ${step.step}: ${reason}`;
      console.error(msg);
      return { code: 1, lines: [msg] };
    }
  }

  return { code: 0, lines };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  let jobId = 'bake-test';
  let shotId = '';
  let task = 'encode';
  let dry = false;
  let remoteConfigPath;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--shot') shotId = argv[++i];
    else if (a === '--task') task = argv[++i];
    else if (a === '--dry') dry = true;
    else if (a === '--config') remoteConfigPath = argv[++i];
    else if (!a.startsWith('--')) jobId = a;
  }

  const res = runRemote({ jobId, shotId, task, dry, ...(remoteConfigPath ? { remoteConfigPath } : {}) });
  process.exit(res.code);
}
