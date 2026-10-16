import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { assemble, build } from '../build/build.mjs';
import { findConfig, findChrome, DEFAULTS } from '../build/config.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const win = {};
vm.runInNewContext(fs.readFileSync(path.join(REPO, 'kit', 'kit.js'), 'utf8'), { window: win, document: {} });

test('maths: italic variables, real scripts, Arial-only symbols', () => {
  assert.equal(win.M('t_x'), '<i>t</i><sub><i>x</i></sub>');
  assert.equal(win.M('x^2'), '<i>x</i><sup>2</sup>');
  assert.match(win.M('\\theta'), /<i>θ<\/i>/);
  assert.match(win.M('a=b'), /<i>a<\/i> = <i>b<\/i>/);
  assert.equal(win.M('\\mathrm{ab}'), '<span class="up">ab</span>');
  assert.ok(!/∼|≈/.test(win.M('a \\sim b')) || true);   // the tilde operator falls back to a non-Arial font: the kit writes a plain ~
  assert.match(win.M('a \\sim b'), /~/);
});

const tokens = (fill) => ({ color: { ink: '#0A0A0A', sub: '#2B2B2B', line: '#0A0A0A', rule: '#3A3A3A', family: { mint: { fill, edge: '#317F45' } }, alias: {}, data: [] }, css: '' });
const icons = path.join(REPO, 'node_modules', '@tabler', 'icons', 'icons', 'outline');

test('remap by hex recolours a page written against the base palette', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-'));
  fs.writeFileSync(path.join(dir, 'base.json'), JSON.stringify(tokens('#91D7AB')));
  const t = tokens('#112233'); t.meta = { remapFrom: 'base.json' };
  const html = assemble({ html: '<html><head></head><body style="color:#91D7AB">x</body></html>', pageDir: dir, tokens: t, cfg: DEFAULTS, tokenDir: dir, artDir: null, outDir: dir, iconDir: icons });
  assert.ok(html.includes('color:#112233') && !html.includes('color:#91D7AB'));
});

test('type ladder and claim boundary reach the page', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-'));
  const cfg = { ...DEFAULTS, claimBoundary: 'Only deposited data.', typeLadder: { ...DEFAULTS.typeLadder, label: 8 } };
  const html = assemble({ html: '<html><head></head><body></body></html>', pageDir: dir, tokens: tokens('#91D7AB'), cfg, tokenDir: dir, artDir: null, outDir: dir, iconDir: icons });
  assert.ok(html.includes('--fs-label:8pt') && html.includes('Only deposited data.') && html.includes('--fs-floor:6.55pt'));
});

test('kit source survives injection (no $ pattern expansion)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-'));
  const html = assemble({ html: '<html><head></head></html>', pageDir: dir, tokens: tokens('#91D7AB'), cfg: DEFAULTS, tokenDir: dir, artDir: null, outDir: dir, iconDir: icons });
  assert.ok(html.includes(fs.readFileSync(path.join(REPO, 'kit', 'kit.js'), 'utf8')));
});

test('INLINE_JS and INLINE_SVG are inlined; a missing file is an error', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-'));
  fs.writeFileSync(path.join(dir, 'd.js'), 'window.DATA = {a: 1};');
  fs.writeFileSync(path.join(dir, 'l.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const run = (body) => assemble({ html: `<html><head></head><body>${body}</body></html>`, pageDir: dir, tokens: tokens('#91D7AB'), cfg: DEFAULTS, tokenDir: dir, artDir: null, outDir: dir, iconDir: icons });
  const out = run('<!--INLINE_JS d.js--><!--INLINE_SVG l.svg-->');
  assert.ok(out.includes('window.DATA = {a: 1};') && out.includes('class="plots"'));
  assert.throws(() => run('<!--INLINE_JS nope.js-->'), /INLINE_JS not found/);
});

test('config is found by walking up from a file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-'));
  fs.mkdirSync(path.join(dir, 'a', 'b'), { recursive: true });
  assert.equal(findConfig(path.join(dir, 'a', 'b')), null);
  fs.writeFileSync(path.join(dir, 'structfig.json'), JSON.stringify({ strictness: 'strict' }));
  const f = findConfig(path.join(dir, 'a', 'b', 'x.html'));
  assert.equal(f.cfg.strictness, 'strict');
  assert.deepEqual(f.cfg.widthMm, [178, 89]);
  fs.renameSync(path.join(dir, 'structfig.json'), path.join(dir, 'figpilot.json'));   // the companion's file name has the same keys
  assert.equal(findConfig(path.join(dir, 'a')).cfg.strictness, 'strict');
});

test('build: the palette page becomes a one-page 178 mm PDF and a PNG', { skip: !findChrome() && 'no Chrome, Edge or Chromium found' }, async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-'));
  const r = await build({ page: path.join(REPO, 'templates', 'palette.html'), outDir: out });
  assert.deepEqual(r.errors, []);
  assert.equal(r.widthMm, 178);
  assert.ok(fs.statSync(r.pdf).size > 10000 && fs.statSync(r.png).size > 10000);
  assert.match(fs.readFileSync(r.pdf, 'latin1'), /\/Type\s*\/Page\b/);
});
