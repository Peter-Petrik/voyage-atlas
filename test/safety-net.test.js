// The safety net from the full review of v3.9.14: tests that run the code paths where a change could
// lose data or draw a wrong chart while every other test still passed. The sample voyage goes
// through both tools' reader and the editor's JSON, CSV and KML exports; the dateline split is
// checked against exact segments and random routes; a name lookup, a country lookup and a paste are
// run on their success paths; every call into the shared distance code is checked for the state it
// passes; and the comment stripping the source checks rely on is checked against both scripts.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, pick, readRepoFile, stripComments, topLevelDefinitions } = require('./support.js');

const editor = loadTool(EDITOR);
const viewer = loadTool(VIEWER);
const tools = [editor, viewer];
const SAMPLE = JSON.parse(readRepoFile('voyage-data.json'));
const copy = o => JSON.parse(JSON.stringify(o));
const allWaypoints = v => v.chapters.flatMap(c => c.waypoints);

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

// A voyage with a value in every field the JSON carries, including the edge values the reader
// treats specially: a coordinate of 0, a negative longitude, a territory name with a comma, flags
// set and unset, and every override.
const RICH = {
  meta: { title: 'Rich voyage', version: '3.0', settings: { distanceOverride: 1234.5, nationsOverride: 0, territoriesOverride: 3, distanceUnit: 'km' } },
  chapters: [
    { num: 1, name: 'First, with a comma', when: 'May 2030 – Sep 2030', era: 'past', notes: 'Line one\nline "two"',
      countriesOverride: ['Portugal', 'Saint Helena, Ascension and Tristan da Cunha'], keyDestinations: ['Horta, Faial', 'Lisbon'],
      blogUrl: 'https://example.com/one', padMultiplier: 1.5,
      waypoints: [
        { order: 1, name: 'Zero', lat: 0, lon: 0, major: true, decision: false, gateway: false, country: 'Gabon', notes: 'n1' },
        { order: 2, name: '', lat: 10.5, lon: -20.25, major: false, decision: false, gateway: false, country: '', notes: '' },
        { order: 3, name: 'Both flags', lat: 38.53, lon: -28.63, major: false, decision: true, gateway: true, country: 'Portugal', notes: '' },
      ] },
    { num: 2, name: 'Second', when: '', era: 'future', notes: '', keyDestinations: [], blogUrl: null, padMultiplier: 1.2,
      waypoints: [
        { order: 1, name: 'Gate', lat: 38.53, lon: -28.63, major: false, decision: false, gateway: true, country: 'Portugal', notes: 'shared point' },
        { order: 2, name: 'Major', lat: -33.9, lon: 151.2, major: true, decision: false, gateway: false, country: 'Australia', notes: '' },
      ] },
  ],
};

// ---------------------------------------------------------------------------------------------
// The sample voyage through both readers
// ---------------------------------------------------------------------------------------------

for (const tool of tools) {
  test(`${tool.name}: the sample voyage reads with every waypoint, flag and country as written`, () => {
    const { readVoyage } = pick(tool, ['readVoyage']);
    const v = readVoyage(copy(SAMPLE));
    assert.equal(v.chapters.length, SAMPLE.chapters.length);
    const read = allWaypoints(v), raw = allWaypoints(SAMPLE);
    assert.equal(read.length, raw.length);
    raw.forEach((w, i) => {
      const r = read[i];
      assert.deepEqual([r.name, r.lat, r.lon, r.major, r.decision, r.gateway, r.country, r.notes],
        [w.name, w.lat, w.lon, w.major, w.decision, w.gateway, w.country, w.notes], `waypoint ${i + 1}`);
    });
    // The sample sets each flag somewhere, so a reader that drops one cannot pass.
    for (const flag of ['major', 'decision', 'gateway']) assert.ok(read.some(w => w[flag] === true), `a ${flag} waypoint`);
  });

  test(`${tool.name}: the sample voyage's header figures`, () => {
    const { readVoyage, computeHeroStats, normalizeSettings } = pick(tool, ['readVoyage', 'computeHeroStats', 'normalizeSettings']);
    const v = readVoyage(copy(SAMPLE));
    const h = computeHeroStats(v.chapters, normalizeSettings(SAMPLE.meta.settings));
    assert.deepEqual([h.totalNm, h.nations, h.territories, h.chapters, h.namedWaypoints, h.shapingVertices], [9070, 11, 1, 5, 63, 78]);
  });
}

for (const tool of tools) {
  test(`${tool.name}: a distance is shown in the chosen unit, rounded to the nearest whole unit`, () => {
    const { fmtDist } = pick(tool, ['fmtDist']);
    assert.deepEqual([fmtDist(100.5, 'nm'), fmtDist(100.4, 'nm'), fmtDist(100, 'km'), fmtDist(100, 'mi'), fmtDist(null, 'nm')],
      ['101 nm', '100 nm', '185 km', '115 mi', '0 nm']);
  });
}

// ---------------------------------------------------------------------------------------------
// The editor's JSON save
// ---------------------------------------------------------------------------------------------

function exportTextOf(voyage) {
  const { readVoyage, normalizeSettings } = pick(editor, ['readVoyage', 'normalizeSettings']);
  const v = readVoyage(copy(voyage));
  const STATE = { chapters: v.chapters, settings: normalizeSettings((voyage.meta || {}).settings), metaTitle: (voyage.meta || {}).title || '' };
  const { buildExportJSON } = pick(editor, ['buildExportJSON'], { STATE });
  return buildExportJSON();
}
const exportOf = voyage => JSON.parse(exportTextOf(voyage));
const withoutStamp = f => { const c = copy(f); delete c.meta.generatedAt; return c; };
const textWithoutStamp = s => s.replace(/"generatedAt": "[^"]*"/, '"generatedAt": ""');

test(`${EDITOR}: saving the sample voyage writes it back exactly, apart from the time stamp`, () => {
  // Character for character: key order, number forms and indentation, not only the same values.
  assert.equal(textWithoutStamp(exportTextOf(SAMPLE)), textWithoutStamp(readRepoFile('voyage-data.json')));
});

test(`${EDITOR}: saving keeps every field and override, and the saved file reads back the same`, () => {
  const saved = exportOf(RICH);
  assert.deepEqual(withoutStamp(saved), withoutStamp(RICH));
  const { readVoyage } = pick(editor, ['readVoyage']);
  assert.deepEqual(readVoyage(copy(saved)).chapters, readVoyage(copy(RICH)).chapters);
});

// ---------------------------------------------------------------------------------------------
// The editor's CSV export and import
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: the CSV pair exported from a voyage imports back to the same chapters and waypoints`, () => {
  const { readVoyage } = pick(editor, ['readVoyage']);
  const chapters = readVoyage(copy(RICH)).chapters;
  const files = {};
  const exp = pick(editor, ['exportChaptersCSV', 'exportWaypointsCSV'], {
    STATE: { chapters }, Papa: miniPapa, closeDropdowns() {}, downloadFile: (name, text) => { files[name] = text; },
  });
  exp.exportChaptersCSV();
  exp.exportWaypointsCSV();
  let installed = null;
  const imp = pick(editor, ['readCSV', 'mergeCSVImport'], {
    Papa: miniPapa, installVoyage: v => { installed = v; }, announce() {}, alert(m) { throw new Error(m); },
  });
  const enc = s => new TextEncoder().encode(s).buffer;
  const c = imp.readCSV(enc(files['chapters.csv']), ['padMultiplier'], ['num', 'name']);
  const w = imp.readCSV(enc(files['waypoints.csv']), ['chapter', 'order', 'lat', 'lon']);
  imp.mergeCSVImport(c.rows, w.rows, { extra: w.extra, trimmed: c.trimmed, unreadable: c.unreadable + w.unreadable });
  // The CSVs carry everything but the voyage title and settings.
  assert.deepEqual(installed.chapters, chapters);
});

// ---------------------------------------------------------------------------------------------
// The editor's KML export
// ---------------------------------------------------------------------------------------------

function kmlOf(voyage) {
  const { readVoyage } = pick(editor, ['readVoyage']);
  const v = readVoyage(copy(voyage));
  let kml = null;
  pick(editor, ['exportKML'], {
    STATE: { chapters: v.chapters, metaTitle: voyage.meta.title }, closeDropdowns() {}, announce() {},
    downloadFile: (name, text) => { kml = text; },
  }).exportKML();
  return kml;
}

test(`${EDITOR}: the KML export is a closed document with one placemark per named waypoint`, () => {
  const kml = kmlOf(RICH);
  assert.ok(kml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">'));
  assert.ok(kml.endsWith('</Document>\n</kml>'));
  // Every element closes in order.
  const stack = [];
  for (const [, close, name, self] of kml.matchAll(/<(\/?)([A-Za-z]+)[^>]*?(\/?)>/g)) {
    if (self) continue;
    if (close) assert.equal(stack.pop(), name, `</${name}> closes the open element`);
    else stack.push(name);
  }
  assert.deepEqual(stack, []);
  const points = [...kml.matchAll(/<Placemark><name>([^<]*)<\/name><styleUrl>#(\w+)<\/styleUrl>\n<Point><coordinates>([^<]*)<\/coordinates>/g)]
    .map(m => [m[1], m[2], m[3]]);
  // Decision wins over Gateway and Major; coordinates are written longitude first.
  assert.deepEqual(points, [
    ['Zero', 'major', '0,0,0'],
    ['Both flags', 'decision', '-28.63,38.53,0'],
    ['Gate', 'gateway', '-28.63,38.53,0'],
    ['Major', 'major', '151.2,-33.9,0'],
  ]);
  assert.equal((kml.match(/<LineString>/g) || []).length, 2);
});

// ---------------------------------------------------------------------------------------------
// The dateline split and unwrap
// ---------------------------------------------------------------------------------------------

for (const tool of tools) {
  const { splitAtDateline, unwrap } = pick(tool, ['splitAtDateline', 'unwrap']);

  test(`${tool.name}: a route is split at the dateline into exact segments`, () => {
    // Eastbound and westbound across the seam, at its midpoint and off it, and twice in a row.
    assert.deepEqual(splitAtDateline([[0, 170], [10, -170]]), [[[0, 170], [5, 180]], [[5, -180], [10, -170]]]);
    assert.deepEqual(splitAtDateline([[10, -170], [0, 170]]), [[[10, -170], [5, -180]], [[5, 180], [0, 170]]]);
    assert.deepEqual(splitAtDateline([[0, 175], [12, -165]]), [[[0, 175], [3, 180]], [[3, -180], [12, -165]]]);
    assert.deepEqual(splitAtDateline([[0, 170], [10, -170], [20, 170]]),
      [[[0, 170], [5, 180]], [[5, -180], [10, -170], [15, -180]], [[15, 180], [20, 170]]]);
    assert.deepEqual(splitAtDateline([[1, 2], [3, 4]]), [[[1, 2], [3, 4]]]);
    // A leg that runs along the seam itself, from 180 to -180, then on to the west.
    assert.deepEqual(splitAtDateline([[10, 180], [11, -180], [12, -179]]), [[[10, 180], [11, 180]], [[11, -180], [12, -179]]]);
  });

  test(`${tool.name}: unwrap keeps a route continuous across the dateline`, () => {
    assert.deepEqual(unwrap([[0, 170], [10, -170], [20, -150]]), [[0, 170], [10, 190], [20, 210]]);
    assert.deepEqual(unwrap([[0, -170], [10, 170]]), [[0, -170], [10, -190]]);
  });

  test(`${tool.name}: random routes split and unwrap consistently`, () => {
    let seed = 20261023;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const norm = x => ((x + 180) % 360 + 360) % 360 - 180;
    for (let n = 0; n < 400; n++) {
      // A track that drifts less than a full turn east or west, given in -180 to 180.
      const steps = 2 + Math.floor(rand() * 8);
      const path = [[rand() * 140 - 70, rand() * 340 - 170]];
      for (let i = 1; i < steps; i++) {
        const prev = path[i - 1][1];
        let next = prev + (rand() * 340 - 170);
        next = Math.max(-350, Math.min(350, next));
        path.push([rand() * 140 - 70, next]);
      }
      const coords = path.map(([la, lo]) => [la, norm(lo)]);
      const segs = splitAtDateline(coords);
      const crossings = coords.slice(1).filter((p, i) => Math.abs(p[1] - coords[i][1]) > 180).length;
      assert.equal(segs.length, crossings + 1, `segments for ${JSON.stringify(coords)}`);
      assert.deepEqual(segs[0][0], coords[0]);
      assert.deepEqual(segs[segs.length - 1].at(-1), coords.at(-1));
      for (const s of segs) for (let i = 1; i < s.length; i++) assert.ok(Math.abs(s[i][1] - s[i - 1][1]) <= 180, 'no jump inside a segment');
      for (let i = 1; i < segs.length; i++) {
        const end = segs[i - 1].at(-1), start = segs[i][0];
        assert.equal(Math.abs(end[1]), 180);
        assert.equal(start[1], -end[1]);
        assert.equal(start[0], end[0], 'the two sides of the seam meet at one latitude');
      }
      // Unwrapped, the track follows the drift exactly.
      unwrap(coords).forEach(([la, lo], i) => {
        assert.equal(la, path[i][0]);
        assert.ok(Math.abs(lo - (path[i][1] - path[0][1] + coords[0][1])) < 1e-9, `unwrap ${JSON.stringify(coords)}`);
      });
    }
  });
}

// ---------------------------------------------------------------------------------------------
// Lookups and paste on their success paths
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: a name lookup fills in the coordinates and an empty country`, async () => {
  const w = { name: 'Horta', lat: null, lon: null, major: false, decision: false, gateway: false, country: '', notes: '' };
  const ch = { num: 1, waypoints: [w] };
  const fields = {};
  const field = id => (fields[id] = fields[id] || { value: '', defaultValue: '' });
  // The queue entry names the waypoint itself, as forwardGeocodeWaypoint queues it.
  const run = pick(editor, ['processFwdGeoQueue'], {
    WREF: w, geoRequest: () => Promise.resolve([{ lat: '38.5321234', lon: '-28.6267891', address: { country: 'Portugal' } }]),
    chapterOf: () => ch, document: { querySelector: sel => field(sel) }, setDirty() {}, noteGeocodeUse() {},
    updateMapChapter() {}, updateChapterCountries() {}, refreshChapterLinks() {}, renderGeoStatus() {}, syncCountryFlag() {},
  }, { lets: true, prelude: "fwdGeoQueue = [{ wptRef: WREF, name: 'Horta' }];", expose: 'resolved: () => geoResolved' });
  run.processFwdGeoQueue();
  await new Promise(r => setImmediate(r));
  assert.deepEqual([w.lat, w.lon, w.country], [38.53212, -28.62679, 'Portugal']);
  assert.equal(run.resolved(), 1);
  assert.equal(fields['#wpt-lat-1-0'].value, 38.53212);
  assert.equal(fields['#wpt-country-1-0'].value, 'Portugal');
});

test(`${EDITOR}: a country lookup hands the country to its waypoint`, async () => {
  const got = [];
  const run = pick(editor, ['processRevGeoQueue'], {
    GOT: got, geoRequest: () => Promise.resolve({ address: { country: 'Cabo Verde' } }), noteGeocodeUse() {}, renderGeoStatus() {},
  }, { lets: true, prelude: 'revGeoQueue = [{ lat: 16.9, lon: -25, callback: c => GOT.push(c) }];', expose: 'resolved: () => geoResolved' });
  run.processRevGeoQueue();
  await new Promise(r => setImmediate(r));
  assert.deepEqual(got, ['Cabo Verde']);
  assert.equal(run.resolved(), 1);
});

test(`${EDITOR}: pasted columns land in their fields, and a name without coordinates is looked up`, () => {
  const ch = { num: 1, waypoints: [] };
  const looked = [];
  const doc = { getElementById: id => (id === 'paste-area'
    ? { value: 'Horta\t38,53\t-28.63\ttrue\tfalse\ttrue\tPortugal\tFuel dock\nPonta Delgada\t\t\tfalse\ttrue\tfalse\t\t\n' }
    : { textContent: '' }) };
  const run = pick(editor, ['doPaste'], {
    document: doc, Papa: miniPapa, getChapter: () => ch, setDirty() {}, noteFirstEdit() {}, announce() {}, closePasteModal() {},
    renderChapterWaypoints() {}, updateMapChapter() {}, updateChapterCountries() {}, refreshChapterLinks() {},
    forwardGeocodeWaypoint: (n, i, name) => looked.push([n, i, name]), geoPending: () => 0,
  }, { lets: true, prelude: 'pasteTargetChNum = 1;' });
  run.doPaste();
  const pick8 = w => [w.name, w.lat, w.lon, w.major, w.decision, w.gateway, w.country, w.notes];
  assert.deepEqual(ch.waypoints.map(pick8), [
    ['Horta', 38.53, -28.63, true, false, true, 'Portugal', 'Fuel dock'],
    ['Ponta Delgada', null, null, false, true, false, '', ''],
  ]);
  assert.deepEqual(looked, [[1, 1, 'Ponta Delgada']]);
});

// ---------------------------------------------------------------------------------------------
// The calls into the shared distance code
// ---------------------------------------------------------------------------------------------

// The arguments of the call whose opening parenthesis is at `open`, split at top-level commas.
function callArgs(js, open) {
  const args = [];
  let depth = 0, from = open + 1;
  for (let i = open; i < js.length; i++) {
    const c = js[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (--depth === 0) { args.push(js.slice(from, i).trim()); return args; }
    } else if (c === ',' && depth === 1) { args.push(js.slice(from, i).trim()); from = i + 1; }
  }
  throw new Error(`unclosed call at ${open}`);
}

// Every call to the shared distance code passes its state: the page's unit and chapters from a
// tool's own code, and the arguments it was given from inside the shared code. A call that leaves
// one out still runs, and gives a wrong figure, so the parity test alone does not catch it.
const STATE_OF = { [EDITOR]: { unit: 'distUnit()', chapters: 'STATE.chapters' }, [VIEWER]: { unit: 'viewerUnit()', chapters: 'DATA.chapters' } };
const sharedNames = Object.keys(editor.defs).filter(n => n in viewer.defs && editor.defs[n] === viewer.defs[n]);
for (const tool of tools) {
  test(`${tool.name}: every call to the shared distance code passes the unit and the chapters`, () => {
    const ranges = Object.entries(tool.defs).map(([name, src]) => {
      const start = tool.js.indexOf(src);
      return { name, start, end: start + src.length };
    });
    const bad = [];
    let seen = 0;
    const re = /\b(fmtDist|chapterNm|chapterApproachNm|getPredecessorChapter)\(/g;
    let m;
    while ((m = re.exec(tool.js)) !== null) {
      if (/function\s+$/.test(tool.js.slice(Math.max(0, m.index - 12), m.index))) continue;
      seen++;
      const inside = ranges.find(r => r.start <= m.index && m.index < r.end);
      const inShared = inside && sharedNames.includes(inside.name);
      const args = callArgs(tool.js, m.index + m[1].length);
      const want = m[1] === 'fmtDist' ? (inShared ? 'u' : STATE_OF[tool.name].unit) : (inShared ? 'chapters' : STATE_OF[tool.name].chapters);
      if (args.length !== 2 || args[1] !== want) bad.push(`${m[1]}(${args.join(', ')}) in ${inside ? inside.name : 'top-level code'}, expected ${want}`);
    }
    assert.ok(seen >= 5, `only ${seen} calls found`);
    assert.deepEqual(bad, []);
  });
}

// ---------------------------------------------------------------------------------------------
// Reading code without its comments
// ---------------------------------------------------------------------------------------------

test('comments are taken out, and strings, templates and patterns that look like comments are kept', () => {
  assert.equal(stripComments("const a = 'x // y'; // c"), "const a = 'x // y'; ");
  assert.equal(stripComments("const u = `${'/*'}` /* c */;"), "const u = `${'/*'}`  ;");
  assert.equal(stripComments("const t = `a ${ {k: '//'}.k } b`; // c"), "const t = `a ${ {k: '//'}.k } b`; ");
  assert.equal(stripComments('const r = /\\/\\*x/g; f(a / b); // c'), 'const r = /\\/\\*x/g; f(a / b); ');
  assert.equal(stripComments('function f(s) { return /a\\/\\/b/.test(s); } // c'), 'function f(s) { return /a\\/\\/b/.test(s); } ');
  assert.equal(stripComments('a();\n/* one\ntwo */\nb();'), 'a();\n \n\nb();');
});

for (const tool of tools) {
  test(`${tool.name}: the script without its comments still compiles, with the same lines and definitions`, () => {
    // A misread pattern would swallow code as a comment: the script would stop compiling, or lose a
    // definition, here rather than in a test that reads the code.
    assert.doesNotThrow(() => new Function(tool.js));
    assert.equal(tool.js.split('\n').length, tool.rawJs.split('\n').length);
    assert.deepEqual(Object.keys(tool.defs), Object.keys(topLevelDefinitions(tool.rawJs)));
  });
}
