// Structural checks on both tools: balanced markup, inline handlers and element lookups that resolve,
// and footers that carry the release version. The counts run over the whole file, including the
// markup the scripts build in template strings, because both kinds end up in the same document.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, readRepoFile, loadTool } = require('./support.js');

// Names that can open an inline handler without being one of the tool's functions.
const HANDLER_BUILTINS = new Set(['if', 'document', 'event', 'this', 'setTimeout']);

const count = (s, re) => (s.match(re) || []).length;

for (const name of [EDITOR, VIEWER]) {
  const tool = loadTool(name);
  const html = tool.html;

  test(`${name}: div, script, head and body tags are balanced`, () => {
    assert.equal(count(html, /<div\b/g), count(html, /<\/div>/g), 'div');
    assert.equal(count(html, /<script\b/g), count(html, /<\/script>/g), 'script');
    assert.equal(count(html, /<head>/g), 1, 'one <head>');
    assert.equal(count(html, /<\/head>/g), 1, 'one </head>');
    assert.equal(count(html, /<body>/g), 1, 'one <body>');
    assert.equal(count(html, /<\/body>/g), 1, 'one </body>');
  });

  test(`${name}: every inline handler calls a function the tool defines`, () => {
    const defined = new Set([
      ...[...tool.js.matchAll(/function\s+(\w+)\s*\(/g)].map(m => m[1]),
      ...[...tool.js.matchAll(/(?:const|let|var)\s+(\w+)\s*=/g)].map(m => m[1]),
    ]);
    const called = new Set(
      [...html.matchAll(/on\w+="\s*(?:event\.stopPropagation\(\);)?\s*([A-Za-z_]\w*)\s*\(/g)].map(m => m[1])
    );
    const unresolved = [...called].filter(n => !HANDLER_BUILTINS.has(n) && !defined.has(n)).sort();
    assert.ok(called.size > 0, 'no inline handlers found');
    assert.deepEqual(unresolved, []);
  });

  test(`${name}: every getElementById lookup names an id in the markup`, () => {
    const ids = new Set([...html.matchAll(/\bid="([^"$]+)"/g)].map(m => m[1]));
    const looked = new Set([...tool.js.matchAll(/getElementById\('([^'$`]+)'\)/g)].map(m => m[1]));
    const missing = [...looked].filter(id => !ids.has(id)).sort();
    assert.ok(looked.size > 0, 'no lookups found');
    assert.deepEqual(missing, []);
  });
}

test('both footers carry the newest CHANGELOG version', () => {
  const editor = [...readRepoFile(EDITOR).matchAll(/Voyage Atlas Editor (v[\d.]+)<\/a>/g)].map(m => m[1]);
  const viewer = [...readRepoFile(VIEWER).matchAll(/Voyage Atlas (v[\d.]+)<\/a>/g)].map(m => m[1]);
  const newest = (readRepoFile('CHANGELOG.md').match(/^## \[(v[\d.]+)\]/m) || [])[1];
  assert.equal(editor.length, 1, 'one editor footer version');
  assert.equal(viewer.length, 1, 'one viewer footer version');
  assert.equal(editor[0], newest, 'editor footer');
  assert.equal(viewer[0], newest, 'viewer footer');
});
