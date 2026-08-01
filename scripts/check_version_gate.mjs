import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const APP_PATH = 'frontend/src/App.jsx';
const STATUS_PATH = 'docs/handoff/CURRENT_STATUS.md';
const VERSION_PATTERN = /v(\d+)\.(\d+)/g;

function fail(message) {
  console.error(`[version-gate] FAIL: ${message}`);
  process.exit(1);
}

function uniqueVersions(text) {
  return [...new Set([...text.matchAll(VERSION_PATTERN)].map((match) => match[0]))];
}

function currentAppVersion(text) {
  const matches = [...text.matchAll(VERSION_PATTERN)].map((match) => match[0]);
  if (matches.length !== 2) {
    fail(`${APP_PATH} must contain exactly two visible versions, but found ${matches.length}.`);
  }
  const versions = [...new Set(matches)];
  if (versions.length !== 1) {
    fail(`${APP_PATH} has mismatched versions: ${versions.join(', ')}`);
  }
  return versions[0];
}

function statusVersion(text) {
  const line = text.split(/\r?\n/).find((value) => /^- Version:\s*v\d+\.\d+/.test(value));
  if (!line) {
    fail(`${STATUS_PATH} does not have a "- Version: vX.Y" line.`);
  }
  const versions = uniqueVersions(line);
  if (versions.length !== 1) {
    fail(`${STATUS_PATH} has an invalid Version line.`);
  }
  return versions[0];
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function versionNumber(version) {
  const [, major, minor] = /^v(\d+)\.(\d+)$/.exec(version) ?? [];
  return Number(major) * 1_000_000 + Number(minor);
}

const appText = readFileSync(APP_PATH, 'utf8');
const statusText = readFileSync(STATUS_PATH, 'utf8');
const appVersion = currentAppVersion(appText);
const currentStatusVersion = statusVersion(statusText);

if (appVersion !== currentStatusVersion) {
  fail(`App version ${appVersion} does not match CURRENT_STATUS ${currentStatusVersion}.`);
}

const requestedBase = process.argv[2];
if (requestedBase && !/^0+$/.test(requestedBase)) {
  try {
    git('cat-file', '-e', `${requestedBase}^{commit}`);
    const changedFiles = git('diff', '--name-only', `${requestedBase}..HEAD`)
      .split(/\r?\n/)
      .filter(Boolean);
    const productChanged = changedFiles.some((file) => {
      if (/^frontend\/src\/.*\.(test|spec)\.[jt]sx?$/.test(file)) return false;
      if (/^backend\/(test_|.*_test\.py$)/.test(file)) return false;
      return file.startsWith('frontend/src/') || file.startsWith('backend/');
    });

    if (productChanged) {
      const baseText = git('show', `${requestedBase}:${APP_PATH}`);
      const baseVersion = currentAppVersion(baseText);
      if (versionNumber(appVersion) <= versionNumber(baseVersion)) {
        fail(`Product code changed, but version did not advance (${baseVersion} -> ${appVersion}).`);
      }
    }
  } catch (error) {
    fail(`Base commit ${requestedBase} could not be checked: ${error.message}`);
  }
}

console.log(`[version-gate] PASS: App and CURRENT_STATUS are ${appVersion}.`);
