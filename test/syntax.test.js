// Every inline script in both tools parses. The scripts are written to temporary files and checked
// with `node --check`, the same check the release validation runs by hand, so a syntax error fails
// here before it can reach a browser.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { EDITOR, VIEWER, readRepoFile, inlineScripts } = require('./support.js');

for (const name of [EDITOR, VIEWER]) {
  test(`${name}: every inline script passes node --check`, () => {
    const scripts = inlineScripts(readRepoFile(name));
    assert.ok(scripts.length > 0, 'no inline scripts found');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voyage-atlas-syntax-'));
    try {
      scripts.forEach((js, i) => {
        const file = path.join(dir, `script-${i + 1}.js`);
        fs.writeFileSync(file, js);
        try {
          execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
        } catch (err) {
          assert.fail(`inline script ${i + 1} of ${scripts.length}:\n${err.stderr}`);
        }
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}
