#!/usr/bin/env node
// Write a deterministic Launch Ladder digest artifact for CI runs.
// Usage: node scripts/launch-digest-artifact.mjs <backup.json> <output.txt> [--asof YYYY-MM-DD]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { buildDigest, renderDigest } from './launch-digest.mjs';

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = { input: null, output: null, asof: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--asof') args.asof = argv[++i];
    else if (arg === '-h' || arg === '--help') args.help = true;
    else if (!args.input) args.input = arg;
    else if (!args.output) args.output = arg;
  }
  return args;
}

export async function writeDigestArtifact(inputPath, outputPath, today = isoToday()) {
  const raw = await readFile(inputPath, 'utf8');
  const state = JSON.parse(raw);
  const rendered = `${renderDigest(buildDigest(state, today))}\n`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, rendered, 'utf8');
  return { outputPath, bytes: Buffer.byteLength(rendered), today };
}

const isEntry = import.meta.url === `file://${process.argv[1]}`;
if (isEntry) {
  const { input, output, asof, help } = parseArgs(process.argv.slice(2));
  if (help || !input || !output) {
    const stream = help ? process.stdout : process.stderr;
    stream.write('Usage: node scripts/launch-digest-artifact.mjs <backup.json> <output.txt> [--asof YYYY-MM-DD]\n');
    process.exit(help ? 0 : 1);
  }

  const result = await writeDigestArtifact(input, output, asof || isoToday());
  console.log(`Wrote ${result.outputPath} (${result.bytes} bytes) for ${result.today}`);
}
