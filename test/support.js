// Shared helpers for the test suite. The tools are single self-contained HTML files with no modules,
// so the tests read the files as text, take the inline scripts out of them, and pick named top-level
// definitions out of those scripts to run in isolation. This file defines no tests. The suite runs as
// `node --test test/*.test.js`; a bare `node --test` also loads this file, because it sits under
// test/, and counts it as one passing test.

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

// The script with its comments taken out, newlines kept so line numbers stay the same. Strings,
// template literals (with their ${} expressions) and regular expression literals are copied as they
// are, so a `//` inside an address or a pattern is not taken for a comment. A `/` starts a regular
// expression where an expression may begin: at the start, after an operator or opening bracket, or
// after a keyword such as `return`. A `/` after `)` is taken for division, as in `(a) / b`; a regular
// expression placed there would be misread, and the tests in safety-net.test.js that compile the
// stripped scripts and count their lines and definitions fail if one ever is.
function stripComments(js) {
  const KEYWORDS = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);
  let out = '', i = 0, last = '';         // last: the previous significant character of code
  const braces = [];                      // for each open ${, the brace depth at which it closes
  let depth = 0;
  const n = js.length;
  const lastWord = () => { const m = out.match(/([A-Za-z_$][\w$]*)\s*$/); return m ? m[1] : ''; };
  const regexAllowed = () => last === '' || '(,=:[!&|?{};+-*%<>~^'.includes(last) || KEYWORDS.has(lastWord());
  function copyQuoted(q) {               // a ' or " string, from i at the opening quote
    out += js[i++];
    while (i < n && js[i] !== q) {
      if (js[i] === '\\') out += js[i++];
      out += js[i++];
    }
    out += js[i++] || '';
  }
  function copyTemplate() {              // from i at the opening backtick or after a closing }
    while (i < n) {
      const c = js[i];
      if (c === '\\') { out += js[i] + (js[i + 1] || ''); i += 2; continue; }
      if (c === '`') { out += c; i++; return false; }
      if (c === '$' && js[i + 1] === '{') { out += '${'; i += 2; braces.push(depth); depth++; return true; }
      out += c; i++;
    }
    return false;
  }
  while (i < n) {
    const c = js[i], d = js[i + 1];
    if (c === '/' && d === '/') { while (i < n && js[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') {
      const end = js.indexOf('*/', i + 2);
      const body = js.slice(i, end < 0 ? n : end + 2);
      out += body.includes('\n') ? body.replace(/[^\n]/g, '').replace(/^/, ' ') : ' ';
      i += body.length; continue;
    }
    if (c === '\'' || c === '"') { copyQuoted(c); last = c; continue; }
    if (c === '`') { out += c; i++; copyTemplate(); last = '`'; continue; }
    if (c === '/' && regexAllowed()) {
      out += js[i++]; let inClass = false;
      while (i < n) {
        const r = js[i];
        if (r === '\\') { out += r + js[i + 1]; i += 2; continue; }
        if (r === '[') inClass = true; else if (r === ']') inClass = false;
        else if (r === '/' && !inClass) { out += r; i++; break; }
        out += r; i++;
      }
      while (i < n && /[a-z]/i.test(js[i])) out += js[i++];
      last = '/'; continue;
    }
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (braces.length && braces[braces.length - 1] === depth) {
        braces.pop(); out += c; i++;
        copyTemplate(); last = '`'; continue;
      }
    }
    out += c; i++;
    if (!/\s/.test(c)) last = c;
  }
  return out;
}

// The source of the `document.addEventListener(type, ...)` call whose text includes `marker`, so a
// test finds a listener by what it handles rather than by a comment near it.
function findListener(js, type, marker) {
  const call = `document.addEventListener('${type}'`;
  for (let at = js.indexOf(call); at >= 0; at = js.indexOf(call, at + 1)) {
    let depth = 0, stop = -1;
    for (let i = js.indexOf('{', at); i < js.length; i++) {
      if (js[i] === '{') depth++;
      else if (js[i] === '}' && --depth === 0) { stop = js.indexOf(';', i) + 1; break; }
    }
    if (stop > at && js.slice(at, stop).includes(marker)) return js.slice(at, stop);
  }
  return null;
}

// The joined inline script and its top-level definitions for one tool. `js` and `defs` are the code
// with its comments taken out, so a test that matches the source sees only code: a call that was
// removed but is still named in a comment no longer passes. `rawJs` keeps the comments.
function loadTool(name) {
  const html = readRepoFile(name);
  const rawJs = inlineScripts(html).join('\n');
  const js = stripComments(rawJs);
  return { name, html, rawJs, js, defs: topLevelDefinitions(js) };
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

// A small CSV writer and reader in the shape of the two PapaParse calls the editor makes, so the
// CSV round trip runs without the library: fields quoted when they hold a comma, quote or line
// break, and rows read back as objects keyed by the header, or as arrays without one.
const miniPapa = {
  unparse({ fields, data }) {
    const cell = v => {
      const s = v == null ? '' : String(v);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [fields.map(cell).join(','), ...data.map(r => fields.map(f => cell(r[f])).join(','))].join('\r\n');
  },
  parse(text, opts = {}) {
    const delim = opts.delimiter || ',';
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    const kept = opts.skipEmptyLines ? rows.filter(r => r.some(c => c !== '')) : rows;
    if (!opts.header) return { data: kept, meta: {} };
    const fields = kept[0].map(h => (opts.transformHeader ? opts.transformHeader(h) : h));
    return { data: kept.slice(1).map(r => Object.fromEntries(fields.map((f, i) => [f, r[i] ?? '']))), meta: { fields } };
  },
};

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

module.exports = { ROOT, EDITOR, VIEWER, readRepoFile, inlineScripts, stripComments, topLevelDefinitions, moduleLets, loadTool, pick, findListener, miniPapa };
