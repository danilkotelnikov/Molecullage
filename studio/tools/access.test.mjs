// Checks the sign-in queue against the real index.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { signInQueue, AUTONOMOUS } from './access.mjs';

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../library/${f}`, import.meta.url), 'utf8'));
const { sources } = read('sources.json');
const { sources: access } = read('access.json');

test('every access entry names a source in the index and carries its checks', () => {
  for (const a of access) {
    assert.ok(sources.some((s) => s.id === a.id), `${a.id} is not in sources.json`);
    assert.ok(AUTONOMOUS.includes(a.autonomous), `${a.id}: autonomous is ${a.autonomous}`);
    for (const k of ['signIn', 'signUpUrl', 'how', 'limits', 'verified']) assert.ok(a[k], `${a.id}: ${k} is empty`);
  }
});

test('every source the index marks as login-only has an access entry', () => {
  const marked = sources.filter((s) => /login to download|account/i.test(s.access ?? '')).map((s) => s.id);
  for (const id of marked) assert.ok(access.some((a) => a.id === id), `${id} needs a sign-in but has no access entry`);
});

test('no key or token value is stored in the file', () => {
  assert.ok(!/(sk-|token=|Bearer [A-Za-z0-9]{12,})/.test(fs.readFileSync(new URL('../library/access.json', import.meta.url), 'utf8')));
});

test('the queue puts sources a script can use first and "no" last', () => {
  const q = signInQueue(sources, access);
  assert.equal(q[0].autonomous.startsWith('yes'), true);
  assert.equal(q.at(-1).autonomous, 'no');
});
