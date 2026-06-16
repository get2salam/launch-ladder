import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDigest, priority, renderDigest } from './launch-digest.mjs';
import { writeDigestArtifact } from './launch-digest-artifact.mjs';

const fixture = {
  items: [
    { title: 'A', state: 'Building', score: 9, effort: 4, metric: 7, textOne: 'X', textTwo: 'Y', date: '2026-04-27' },
    { title: 'B', state: 'Ready',    score: 8, effort: 2, metric: 8, textOne: 'X', textTwo: 'Y', date: '2026-04-25' },
    { title: 'C', state: 'Released', score: 5, effort: 1, metric: 6, textOne: 'X', textTwo: 'Y', date: '2026-04-20' },
  ],
};

test('buildDigest splits released items out of the active queue', () => {
  const digest = buildDigest(fixture, '2026-04-25');
  assert.equal(digest.active.length, 2);
  assert.equal(digest.released.length, 1);
  assert.equal(digest.total, 3);
});

test('active queue is sorted by priority desc, then due date asc', () => {
  const digest = buildDigest(fixture, '2026-04-25');
  // B is Ready (weight 10) and due today (dueBoost 16); A is Building due in 2 days.
  assert.deepEqual(digest.active.map((i) => i.title), ['B', 'A']);
  assert.ok(digest.active[0].priority > digest.active[1].priority);
});

test('priority withholds the due-date boost from released items', () => {
  const today = '2026-04-25';
  const released = { state: 'Released', score: 9, metric: 9, effort: 1, date: today };
  const pending  = { state: 'Ready',    score: 9, metric: 9, effort: 1, date: today };
  assert.ok(priority(pending, today) > priority(released, today));
});

test('buildDigest tolerates a backup with no items array', () => {
  const digest = buildDigest({}, '2026-04-25');
  assert.deepEqual(digest.active, []);
  assert.equal(digest.total, 0);
  assert.equal(digest.soonest, null);
  assert.equal(digest.ready, null);
});

test('renderDigest produces a digest for the bundled sample backup', async () => {
  const samplePath = fileURLToPath(new URL('../examples/sample-backup.json', import.meta.url));
  const sample = JSON.parse(await readFile(samplePath, 'utf8'));
  const output = renderDigest(buildDigest(sample, '2026-04-25'));
  assert.match(output, /Launch Ladder — digest as of 2026-04-25/);
  assert.match(output, /Active queue \(3\):/);
  assert.match(output, /Launch checklist walkthrough/);
  assert.match(output, /Released: 1/);
});

test('writeDigestArtifact creates nested CI artifact directories', async () => {
  const samplePath = fileURLToPath(new URL('../examples/sample-backup.json', import.meta.url));
  const outputDir = join(tmpdir(), `launch-ladder-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const outputPath = join(outputDir, 'nested', 'launch-digest.txt');

  try {
    const result = await writeDigestArtifact(samplePath, outputPath, '2026-04-25');
    const output = await readFile(outputPath, 'utf8');

    assert.equal(result.outputPath, outputPath);
    assert.equal(result.bytes, Buffer.byteLength(output));
    assert.match(output, /Launch Ladder — digest as of 2026-04-25/);
    assert.match(output, /Soonest launch: 25 Apr — Launch checklist walkthrough/);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
