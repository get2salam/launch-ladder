#!/usr/bin/env node
// Print a prioritized digest from a Launch Ladder JSON backup.
// Usage: node scripts/launch-digest.mjs <backup.json> [--asof YYYY-MM-DD]

import { readFile } from 'node:fs/promises';

const COMPLETED_STATES = new Set(['Released']);
const STATE_WEIGHTS = { Planned: 2, Building: 7, Ready: 10, Released: 3 };
const METRIC_MAX = 10;

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(today, value) {
  if (!value) return 999;
  const a = new Date(`${today}T00:00:00Z`);
  const b = new Date(`${value}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function priority(item, today) {
  const completed = COMPLETED_STATES.has(item.state);
  const due = Math.max(0, daysBetween(today, item.date));
  const dueBoost = completed ? 0 : Math.max(0, 4 - due) * 4;
  const weight = STATE_WEIGHTS[item.state] ?? 0;
  return item.score * 6 + item.metric * 5 + dueBoost + weight - item.effort * 4;
}

export function buildDigest(state, today = isoToday()) {
  const items = Array.isArray(state?.items) ? state.items : [];
  const active = items
    .filter((item) => !COMPLETED_STATES.has(item.state))
    .map((item) => ({ ...item, priority: priority(item, today), days: daysBetween(today, item.date) }))
    .sort((a, b) => b.priority - a.priority || a.days - b.days);
  const released = items.filter((item) => COMPLETED_STATES.has(item.state));
  const soonest = [...active].sort((a, b) => a.days - b.days)[0] || null;
  const ready = items.length ? [...items].sort((a, b) => b.metric - a.metric)[0] : null;
  return { today, active, released, soonest, ready, total: items.length };
}

function formatDate(value) {
  if (!value) return 'No date';
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', timeZone: 'UTC',
  });
}

function dueLabel(days) {
  if (days === 0) return 'today';
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`;
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

export function renderDigest(digest) {
  const lines = [];
  lines.push(`Launch Ladder — digest as of ${digest.today}`);
  lines.push('='.repeat(40));
  lines.push('');
  lines.push(`Active queue (${digest.active.length}):`);
  if (digest.active.length === 0) {
    lines.push('  (nothing pending)');
  } else {
    digest.active.forEach((item, index) => {
      lines.push(`  ${index + 1}. ${item.title} [${item.state}] — owner: ${item.textOne}`);
      lines.push(`     Launch ${formatDate(item.date)} (${dueLabel(item.days)})  Readiness ${item.metric}/${METRIC_MAX}  Friction ${item.effort}/10  Priority ${item.priority}`);
      lines.push(`     Blocker: ${item.textTwo}`);
    });
  }
  lines.push('');
  lines.push(`Released: ${digest.released.length}`);
  lines.push(`Total tracked: ${digest.total}`);
  if (digest.soonest) lines.push(`Soonest launch: ${formatDate(digest.soonest.date)} — ${digest.soonest.title}`);
  if (digest.ready) lines.push(`Strongest readiness: ${digest.ready.metric}/${METRIC_MAX} — ${digest.ready.title}`);
  return lines.join('\n');
}

function parseArgs(argv) {
  const args = { path: null, asof: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--asof') args.asof = argv[++i];
    else if (arg === '-h' || arg === '--help') args.help = true;
    else if (!args.path) args.path = arg;
  }
  return args;
}

const isEntry = import.meta.url === `file://${process.argv[1]}`;
if (isEntry) {
  const { path, asof, help } = parseArgs(process.argv.slice(2));
  if (help || !path) {
    const stream = help ? process.stdout : process.stderr;
    stream.write('Usage: node scripts/launch-digest.mjs <backup.json> [--asof YYYY-MM-DD]\n');
    process.exit(help ? 0 : 1);
  }
  const raw = await readFile(path, 'utf8');
  const state = JSON.parse(raw);
  console.log(renderDigest(buildDigest(state, asof || isoToday())));
}
