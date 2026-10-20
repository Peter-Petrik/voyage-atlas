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

// The tool's module-level `let` declarations: each line that starts with `let `, which is how the
// tools write them, one statement per line. `names` lists the variables a line declares.
function moduleLets(tool) {
  return [...tool.js.matchAll(/^let ([^;]*);/gm)].map(m => {
    // Split the declaration list at commas outside brackets; each part starts with its name.
    const parts = [];
    let depth = 0, cur = '';
    for (const c of m[1]) {
      if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) depth--;
      if (c === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += c;
    }
    parts.push(cur);
    return { line: m[0], names: parts.map(p => p.trim().match(/^\w+/)[0]) };
  });
}

// A definition's source with comments removed, for finding the names it refers to. Only used for
// that scan, never run, so a `//` inside a string literal (an address) cutting the rest of its line
// is harmless: at worst a dependency on that line is missed and the test fails on an unknown name.
function withoutComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

// Run the named definitions of a tool in a fresh function scope and return them.
//
// The top-level definitions they refer to are included too, followed transitively, so a test names
// only the function it exercises; a reference is a bare name, not a property such as `.map(`.
// Consts run in file order, as in the page, so a const that reads another const finds it.
// `globals` supplies everything else the code reads (location, fetch, STATE, DOM stubs) as
// parameters, so each test controls them and nothing leaks between tests; a name given in `globals`
// is never taken from the file, which is how a test replaces a definition with a stub or keeps out
// a const that would build the live chart.
//
// `opts.lets` declares the tool's module-level `let` state (STATE, the selection, the lookup
// queues) as the page does, apart from names given in `globals`. `opts.prelude` is code run after
// the definitions and those declarations, typically to set that state up, and `opts.expose` adds
// entries to the returned object (getters over that state, for example), so a test can read the
// state back after a call.
//
// A requested name with no definition throws, which fails the test that asked for it.
function pick(tool, names, globals = {}, opts = {}) {
  names.forEach(n => {
    if (!(n in tool.defs)) throw new Error(`${tool.name}: no top-level definition named ${n}`);
  });
  const all = Object.keys(tool.defs);
  const lets = opts.lets ? moduleLets(tool).filter(l => !l.names.some(n => n in globals)).map(l => l.line) : [];
  const wanted = new Set(names);
  // The let initializers and the prelude may call definitions too (STATE starts from
  // defaultSettings()), so they are scanned along with the requested names.
  const queue = [...names, { src: [...lets, opts.prelude || ''].join('\n') }];
  while (queue.length) {
    const next = queue.shift();
    const src = withoutComments(typeof next === 'string' ? tool.defs[next] : next.src);
    for (const other of all) {
      if (wanted.has(other) || other in globals) continue;
      if (new RegExp(`(?<![.\\w$])${other}(?![\\w$])`).test(src)) { wanted.add(other); queue.push(other); }
    }
  }
  const sources = all.filter(n => wanted.has(n)).map(n => tool.defs[n]);
  const params = Object.keys(globals);
  const exposed = [names.join(', '), opts.expose].filter(Boolean).join(', ');
  // Function declarations are hoisted, so the order that matters is for consts: they run first, in
  // file order, then the state, then the prelude that may read both.
  const body = [...sources, ...lets, opts.prelude || '', `return { ${exposed} };`].join('\n');
  return new Function(...params, body)(...params.map(p => globals[p]));
}

module.exports = { ROOT, EDITOR, VIEWER, readRepoFile, inlineScripts, topLevelDefinitions, moduleLets, loadTool, pick };
