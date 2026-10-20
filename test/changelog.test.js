// The CHANGELOG header chain and its comparison links. A header lost or mangled during an insert,
// a link that points at a version the file does not have, or a newest entry the release workflow
// cannot extract all fail here, before a tag is pushed.

const test = require('node:test');
const assert = require('node:assert/strict');
const { readRepoFile } = require('./support.js');

const changelog = readRepoFile('CHANGELOG.md');
const lines = changelog.split('\n');
const HEADER = /^## \[(v\d+(?:\.\d+)*)\] - (\d{4}-\d{2}-\d{2})$/;
const headings = lines.filter(l => l.startsWith('## '));
const versions = headings.map(l => (l.match(HEADER) || [])[1]).filter(Boolean);
const links = [...changelog.matchAll(/^\[(v[\d.]+)\]: (\S+)$/gm)].map(m => ({ version: m[1], url: m[2] }));

// Versions such as v3.9 and v3.9.1 compare part by part, with a missing part read as 0.
function compareVersions(a, b) {
  const pa = a.slice(1).split('.').map(Number), pb = b.slice(1).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

test('every second-level heading is a version header of the form ## [vX.Y.Z] - YYYY-MM-DD', () => {
  assert.ok(versions.length > 0, 'no version headers found');
  assert.deepEqual(headings.filter(l => !HEADER.test(l)), []);
});

test('there is no Unreleased section', () => {
  assert.ok(!/^## \[Unreleased\]/m.test(changelog));
});

test('versions run newest first with no duplicates', () => {
  const outOfOrder = versions.slice(1).filter((v, i) => compareVersions(versions[i], v) <= 0);
  assert.deepEqual(outOfOrder, [], 'versions not lower than the one above them');
});

test('every comparison link names a version that has a header', () => {
  assert.deepEqual(links.filter(l => !versions.includes(l.version)).map(l => l.version), []);
});

test('every comparison link compares against the next older version', () => {
  const wrong = links
    .map(l => ({ ...l, m: l.url.match(/\/compare\/(v[\d.]+)\.\.\.(v[\d.]+)$/) }))
    .filter(l => l.m)
    .filter(l => l.m[2] !== l.version || l.m[1] !== versions[versions.indexOf(l.version) + 1])
    .map(l => `${l.version}: ${l.url}`);
  assert.deepEqual(wrong, []);
});

test('the newest version has a comparison link', () => {
  assert.ok(links.some(l => l.version === versions[0]), `no link for ${versions[0]}`);
});

test('the release workflow extracts a non-empty section for the newest version', () => {
  // The same rule as the awk step in .github/workflows/release.yml: the section starts after the
  // first "## [" line containing "[<tag>]" as a literal substring and ends at the next "## [" line.
  const tag = versions[0];
  const start = lines.findIndex(l => l.startsWith('## [') && l.includes(`[${tag}]`));
  assert.ok(start >= 0, `no header for ${tag}`);
  const next = lines.findIndex((l, i) => i > start && l.startsWith('## ['));
  const section = lines.slice(start + 1, next < 0 ? lines.length : next);
  assert.ok(section.some(l => /^- \*\*[^*]+\*\*: \S/.test(l)), `no "- **Label**: text" bullet in ${tag}`);
});
