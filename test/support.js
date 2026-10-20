// Shared helpers for the test suite. The tools are single self-contained HTML files with no modules,
// so the tests read the files as text, take the inline scripts out of them, and pick named top-level
// definitions out of those scripts to run in isolation. This file defines no tests; Node's test
// runner loads it as a test file because it sits under test/, and it reports nothing.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const EDITOR = 'voyage-atlas-editor.html';
const VIEWER = 'voyage-atlas.html';

function readRepoFile(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

// The inline scripts of an HTML file, in document order. Script tags with a src attribute (the CDN
// libraries) are not matched, because the pattern requires the bare <script> tag.
function inlineScripts(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
}

// Every top-level `function name(` and `const name =` definition in a script, keyed by name, with its
// full source text. A definition is recognized only at the start of a line, which is how the tools
// write their top-level code; nested functions are indented and are not picked up. A function ends
// at the brace that closes its body, found after the closing parenthesis of its parameter list; a
// const ends at the first semicolon outside brackets. The scan
// counts brackets without parsing strings, which holds for the tools' current code: a definition
// whose strings contain unbalanced brackets would be cut short, and the parity and behavior tests
// would then fail rather than pass silently.
function topLevelDefinitions(js) {
  const defs = {};
  const re = /^(?:function\s+(\w+)\s*\(|const\s+(\w+)\s*=)/gm;
  let m;
  while ((m = re.exec(js)) !== null) {
    const name = m[1] || m[2];
    let end = js.length - 1;
    if (m[1]) {
      // Skip the parameter list first, so a default value such as `opts = {}` is not taken for the
      // body.
      let depth = 1, j = re.lastIndex;
      for (; j < js.length && depth > 0; j++) {
        if (js[j] === '(') depth++;
        else if (js[j] === ')') depth--;
      }
      depth = 0;
      for (j = js.indexOf('{', j); j < js.length; j++) {
        if (js[j] === '{') depth++;
        else if (js[j] === '}' && --depth === 0) { end = j; break; }
      }
    } else {
      let depth = 0;
      for (let j = re.lastIndex; j < js.length; j++) {
        const c = js[j];
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') depth--;
        else if (c === ';' && depth === 0) { end = j; break; }
      }
    }
    defs[name] = js.slice(m.index, end + 1);
  }
  return defs;
}

// The joined inline script and its top-level definitions for one tool.
function loadTool(name) {
  const html = readRepoFile(name);
  const js = inlineScripts(html).join('\n');
  return { name, html, js, defs: topLevelDefinitions(js) };
}

// Run the named definitions of a tool in a fresh function scope and return them. `globals` supplies
// the browser objects the definitions read (location, fetch and the like) as parameters, so each
// test controls them and nothing leaks between tests. A missing definition throws, which fails the
// test that asked for it.
function pick(tool, names, globals = {}) {
  const sources = names.map(n => {
    if (!(n in tool.defs)) throw new Error(`${tool.name}: no top-level definition named ${n}`);
    return tool.defs[n];
  });
  const params = Object.keys(globals);
  const body = sources.join('\n') + `\nreturn { ${names.join(', ')} };`;
  return new Function(...params, body)(...params.map(p => globals[p]));
}

module.exports = { ROOT, EDITOR, VIEWER, readRepoFile, inlineScripts, topLevelDefinitions, loadTool, pick };
