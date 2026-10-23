// The shared core stays byte-identical between the editor and the viewer. A top-level definition
// present in both tools is shared, and its source text must match exactly, so a fix made in one tool
// and not the other fails here. KNOWN_DIFFERENCES lists the shared names that differ today; the test
// also fails when one of them becomes identical, so the list is kept to what is actually true.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, topLevelDefinitions } = require('./support.js');

const KNOWN_DIFFERENCES = [
  'closeChooser',
  'loadSampleFromChooser',
  'openChooser',
  'selectChapter',
  'toggleTheme',
];

const editor = loadTool(EDITOR);
const viewer = loadTool(VIEWER);
// Compared with their comments: a comment inside a shared definition is part of the shared core.
const editorSource = topLevelDefinitions(editor.rawJs);
const viewerSource = topLevelDefinitions(viewer.rawJs);
const shared = Object.keys(editorSource).filter(n => n in viewerSource).sort();
const differing = shared.filter(n => editorSource[n] !== viewerSource[n]);

test('shared definitions are found in both tools', () => {
  // A sanity floor: a broken extraction that finds almost nothing would otherwise pass.
  assert.ok(shared.length >= 40, `only ${shared.length} shared definitions found`);
});

test('shared definitions are byte-identical apart from the known differences', () => {
  const unexpected = differing.filter(n => !KNOWN_DIFFERENCES.includes(n));
  assert.deepEqual(unexpected, [], 'shared definitions that differ between the tools');
});

test('every known difference is still shared and still differs', () => {
  const stale = KNOWN_DIFFERENCES.filter(n => !differing.includes(n));
  assert.deepEqual(stale, [], 'known differences that are now identical or no longer shared; remove them from the list');
});
