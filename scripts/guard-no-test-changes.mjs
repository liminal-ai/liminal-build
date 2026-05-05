#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const baseRef = process.env.TEST_CHANGE_BASE_REF ?? 'HEAD';
const testPathPattern =
  /(^|\/)(tests|test|__tests__|__fixtures__|fixtures)\/|(\.(test|spec)\.[cm]?[jt]sx?$)/;

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

const changedFiles = git(['diff', '--name-only', '--diff-filter=ACMR', baseRef, '--'])
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);
const changedTestFiles = changedFiles.filter((file) => testPathPattern.test(file));

if (changedTestFiles.length > 0) {
  console.error(`guard:no-test-changes failed: test changes detected relative to ${baseRef}.`);
  for (const file of changedTestFiles) {
    console.error(`- ${file}`);
  }
  console.error('Set TEST_CHANGE_BASE_REF to the intended immutable baseline when needed.');
  process.exit(1);
}

console.log(`guard:no-test-changes passed: no test changes relative to ${baseRef}.`);
