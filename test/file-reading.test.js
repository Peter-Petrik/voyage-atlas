// Reading voyage files: one reader shared by both tools, loads that never leave half a voyage, CSV
// pairs that are checked before they replace anything, and the inputs and exports that carry the
// same data.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, pick, findListener } = require('./support.js');

const editor = loadTool(EDITOR);
const viewer = loadTool(VIEWER);
const tools = [editor, viewer];

// ---------------------------------------------------------------------------------------------
// One reader for both tools
// ---------------------------------------------------------------------------------------------

// A hand-edited file with everything the review found the two tools reading differently.
const handEdited = () => ({
  meta: { title: 12, settings: { distanceUnit: 'km' } },
  chapters: [
    { num: 3, name: 'Third', era: 'Current', waypoints: [{ name: 1770, lat: '10', lon: 190 }, { name: 'B', lat: 95, lon: 20 }] },
    { num: 1, name: 'First', padMultiplier: 'abc', notes: { deep: { deeper: 1 } }, when: 2025,
      waypoints: [{ name: 'A', lat: 1, lon: 340, major: 'false', decision: 'false', gateway: 'no', country: 7 }] },
    { num: 1, name: 'Also first', waypoints: [] },
  ],
});

for (const tool of tools) {
  test(`${tool.name}: readVoyage renumbers chapters in order and reports it`, () => {
    const { readVoyage } = pick(tool, ['readVoyage']);
    const v = readVoyage(handEdited());
    assert.deepEqual(v.chapters.map(c => [c.num, c.name]), [[1, 'First'], [2, 'Also first'], [3, 'Third']]);
    assert.equal(v.renumbered, true);
    assert.equal(readVoyage({ chapters: [{ num: 1 }, { num: 2 }] }).renumbered, false);
    // A file with no numbers keeps its order.
    assert.deepEqual(readVoyage({ chapters: [{ name: 'x' }, { name: 'y' }] }).chapters.map(c => [c.num, c.name]), [[1, 'x'], [2, 'y']]);
  });

  test(`${tool.name}: readVoyage reads every text field as text and every flag the same way`, () => {
    const { readVoyage } = pick(tool, ['readVoyage']);
    const v = readVoyage(handEdited());
    const first = v.chapters[0], third = v.chapters[2];
    assert.equal(v.title, '12');
    assert.equal(first.when, '2025');
    assert.equal(first.notes, '');
    assert.equal(third.waypoints[0].name, '1770');
    assert.equal(first.waypoints[0].country, '7');
    assert.deepEqual([first.waypoints[0].major, first.waypoints[0].decision, first.waypoints[0].gateway], [false, false, false]);
    assert.equal(third.era, 'current');
    assert.equal(first.padMultiplier, 1.2);
    assert.equal(v.chapters[1].padMultiplier, 1.2);
    assert.equal(v.settings.distanceUnit, 'km');
  });

  test(`${tool.name}: readVoyage leaves a latitude beyond 90 empty and brings longitudes into range`, () => {
    const { readVoyage } = pick(tool, ['readVoyage']);
    const v = readVoyage(handEdited());
    assert.deepEqual([v.chapters[2].waypoints[0].lat, v.chapters[2].waypoints[0].lon], [10, -170]);
    assert.deepEqual([v.chapters[2].waypoints[1].lat, v.chapters[2].waypoints[1].lon], [null, 20]);
    assert.equal(v.chapters[0].waypoints[0].lon, -20);
    assert.equal(v.latitudesDropped, 1);
  });

  test(`${tool.name}: readVoyage refuses a file that is not a voyage and never changes the file`, () => {
    const { readVoyage } = pick(tool, ['readVoyage']);
    const cases = [
      [null, /no "chapters" list/], [[], /no "chapters" list/], [7, /no "chapters" list/], [{}, /no "chapters" list/],
      [{ chapters: {} }, /no "chapters" list/], [{ chapters: [null] }, /chapter 1 is not a chapter/],
      [{ chapters: [{ waypoints: {} }] }, /the waypoints of chapter 1 are not a list/],
      [{ chapters: [{ waypoints: ['x'] }] }, /waypoint 1 of chapter 1 is not a waypoint/],
    ];
    for (const [bad, message] of cases) assert.throws(() => readVoyage(bad), message, JSON.stringify(bad));
    const file = handEdited();
    const copy = JSON.stringify(file);
    readVoyage(file);
    assert.equal(JSON.stringify(file), copy);
  });

  test(`${tool.name}: splitAtDateline keeps points that sit on the dateline itself finite`, () => {
    const { splitAtDateline } = pick(tool, ['splitAtDateline']);
    const segs = splitAtDateline([[10, 179], [10.5, 180], [11, -180], [11.5, -179]]);
    assert.ok(segs.flat().every(p => Number.isFinite(p[0]) && Number.isFinite(p[1])), JSON.stringify(segs));
    assert.equal(segs.length, 2);
  });

  test(`${tool.name}: normLon leaves a longitude in range exactly as it is`, () => {
    const { normLon } = pick(tool, ['normLon']);
    for (const lon of [16.64429, 13.38135, -179.99999, 0, -180]) assert.equal(normLon(lon), lon);
    assert.equal(normLon(190), -170);
    assert.equal(normLon(340), -20);
    assert.equal(normLon(180), -180);
    assert.equal(normLon(190.12345), -169.87655);
  });

  test(`${tool.name}: toCoord reads only whole numbers`, () => {
    const { toCoord, decimalPoint } = pick(tool, ['toCoord', 'decimalPoint']);
    for (const v of ['12abc', '38,53', '1 2', '--1', '1e999']) assert.equal(toCoord(v), null, v);
    for (const [v, n] of [[' 38.5 ', 38.5], ['+5', 5], ['.5', 0.5], ['-0', -0], ['1e2', 100]]) assert.equal(toCoord(v), n, v);
    assert.equal(decimalPoint('38,53'), '38.53');
    assert.equal(decimalPoint('-28,63'), '-28.63');
    assert.equal(decimalPoint('1,2,3'), '1,2,3');
    assert.equal(decimalPoint(5), 5);
  });

  test(`${tool.name}: list entries lose commas at their ends in a file as in a CSV`, () => {
    const { fileList } = pick(tool, ['fileList']);
    assert.deepEqual(fileList(['Bay,', ', Pico', ',', 3, {}]), ['Bay', 'Pico', '3']);
  });
}

test('the editor load and the viewer load give the same chapters and distances for one hand-edited file', () => {
  let fns;
  const el = () => ({ style: {}, textContent: '', innerHTML: '', value: '', dataset: {}, classList: { toggle() {}, add() {}, remove() {} } });
  const stubs = { document: { getElementById: el, querySelectorAll: () => [], querySelector: () => null },
    renderAllChapters() {}, loadSettings() {}, updateHeroStats() {}, setDirty() {}, setTimeout() {}, map: null };
  fns = pick(editor, ['loadVoyage'], stubs, { lets: true, expose: 'state: () => STATE' });
  fns.loadVoyage(handEdited());
  const e = fns.state();
  const w = pick(viewer, ['normalizeData']).normalizeData(handEdited());
  const strip = chs => chs.map(({ routes, ...c }) => c);
  assert.deepEqual(strip(w.chapters), e.chapters);
  assert.deepEqual([w.meta.title, w.meta.settings], [e.metaTitle, e.settings]);
  const en = pick(editor, ['chapterNm']);
  const vn = pick(viewer, ['chapterNm']);
  assert.deepEqual(w.chapters.map(ch => vn.chapterNm(ch, w.chapters)), e.chapters.map(ch => en.chapterNm(ch, e.chapters)));
});

for (const tool of tools) {
  test(`${tool.name}: a chapter with no number stays after the chapter before it in the file`, () => {
    const { readVoyage } = pick(tool, ['readVoyage']);
    const v = readVoyage({ chapters: [{ num: 1, name: 'a' }, { name: 'b' }, { num: 2, name: 'c' }, { num: 0, name: 'd' }] });
    assert.deepEqual(v.chapters.map(c => [c.num, c.name]), [[1, 'a'], [2, 'b'], [3, 'c'], [4, 'd']]);
  });
}

// ---------------------------------------------------------------------------------------------
// Editor loads
// ---------------------------------------------------------------------------------------------

const element = () => ({ style: {}, textContent: '', innerHTML: '', value: '', dataset: {}, classList: { toggle() {}, add() {}, remove() {} }, focus() {} });
const documentStub = () => {
  const els = {};
  return { els, getElementById: id => (els[id] = els[id] || element()), querySelectorAll: () => [], querySelector: () => null };
};
const uiStubs = over => ({
  document: documentStub(), renderAllChapters() {}, loadSettings() {}, updateHeroStats() {}, setDirty() {},
  announce() {}, hideLanding() {}, guardDirty: fn => fn(), setTimeout() {}, map: null, alert() {}, ...over,
});
const OLD = `STATE = { chapters: [{ num: 1, name: 'Old', waypoints: [] }], metaTitle: 'Old voyage',
  settings: { distanceOverride: 500, nationsOverride: null, territoriesOverride: null, distanceUnit: 'nm' } };`;
const EXPOSE = `state: () => STATE`;

test(`${EDITOR}: a loaded voyage's settings are in place before its chapters are drawn`, () => {
  let unitWhenDrawn = null, fns;
  const stubs = uiStubs({ renderAllChapters: () => { unitWhenDrawn = fns.state().settings.distanceUnit; } });
  fns = pick(editor, ['loadVoyage'], stubs, { lets: true, prelude: OLD, expose: EXPOSE });
  fns.loadVoyage({ meta: { settings: { distanceUnit: 'km' } }, chapters: [{ num: 1, name: 'New' }] });
  assert.equal(unitWhenDrawn, 'km');
});

test(`${EDITOR}: a voyage whose drawing fails puts the previous voyage back`, () => {
  let draws = 0;
  const stubs = uiStubs({ renderAllChapters: () => { if (++draws === 1) throw new Error('draw failed'); } });
  const fns = pick(editor, ['loadVoyage'], stubs, { lets: true, prelude: OLD, expose: EXPOSE });
  assert.throws(() => fns.loadVoyage({ meta: { title: 'New' }, chapters: [{ num: 1, name: 'New' }] }), /draw failed/);
  assert.equal(fns.state().chapters[0].name, 'Old');
  assert.equal(fns.state().metaTitle, 'Old voyage');
  assert.equal(fns.state().settings.distanceOverride, 500);
});

test(`${EDITOR}: a file that is not a voyage changes nothing and keeps the chooser open`, () => {
  let hidden = 0;
  const fns = pick(editor, ['loadFromJSON'], uiStubs({ hideLanding: () => { hidden++; } }), { lets: true, prelude: OLD, expose: EXPOSE });
  assert.throws(() => fns.loadFromJSON({ chapters: [{ name: 'A', waypoints: [{ name: 'x' }, 'y'] }] }), /waypoint 2 of chapter 1 is not a waypoint/);
  assert.equal(hidden, 0);
  assert.equal(fns.state().chapters[0].name, 'Old');
});

test(`${EDITOR}: the status line says what a load corrected`, () => {
  const stubs = uiStubs();
  const fns = pick(editor, ['loadVoyage'], stubs, { lets: true, prelude: OLD, expose: EXPOSE });
  fns.loadVoyage({ chapters: [{ num: 1 }, { num: 3, waypoints: [{ name: 'x', lat: 95, lon: 1 }, { name: 'y', lat: -91, lon: 1 }] }] });
  assert.equal(stubs.document.getElementById('status-text').textContent,
    'Loaded with corrections: chapters renumbered 1–2; 2 latitudes beyond ±90 left without coordinates — click a chapter to begin');
  fns.loadVoyage({ chapters: [{ num: 1 }] });
  assert.equal(stubs.document.getElementById('status-text').textContent, 'No chapter selected — click a chapter to begin');
});

test(`${EDITOR}: a new chapter takes a number past the highest in use and an empty list`, () => {
  const fns = pick(editor, ['addChapter'], { noteFirstEdit() {}, renderAllChapters() {}, selectChapter() {}, setDirty() {} },
    { lets: true, prelude: `STATE = { chapters: [{ num: 1 }, { num: 3 }], settings: {}, metaTitle: '' };`, expose: EXPOSE });
  fns.addChapter();
  const added = fns.state().chapters[2];
  assert.equal(added.num, 4);
  assert.deepEqual(added.keyDestinations, []);
});

// ---------------------------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: a CSV pair with no chapters is refused and the voyage stays`, () => {
  const alerts = [];
  const fns = pick(editor, ['mergeCSVImport'], uiStubs({ alert: m => alerts.push(m) }), { lets: true, prelude: OLD, expose: EXPOSE });
  assert.equal(fns.mergeCSVImport([{ chapter: '1', name: 'P', lat: '1', lon: '2' }], [{ num: '1', name: 'One' }]), false);
  assert.equal(alerts.length, 1);
  assert.equal(fns.state().chapters[0].name, 'Old');
});

test(`${EDITOR}: a CSV import joins waypoints by the file's numbers, renumbers, and reports what it skipped`, () => {
  const stubs = uiStubs();
  const fns = pick(editor, ['mergeCSVImport'], stubs, { lets: true, prelude: OLD, expose: EXPOSE });
  fns.mergeCSVImport([{ num: '5', name: 'Five' }, { num: '2', name: 'Two' }],
    [{ chapter: '5', name: 'P5', lat: '1', lon: '2' }, { chapter: '2', name: 'P2', lat: '3', lon: '4' }, { chapter: '9', name: 'Lost', lat: '0', lon: '0' }],
    { decimalCommas: true, legacy: true });
  assert.deepEqual(fns.state().chapters.map(c => [c.num, c.name, c.waypoints.map(w => w.name)]), [[1, 'Two', ['P2']], [2, 'Five', ['P5']]]);
  assert.equal(stubs.document.getElementById('status-text').textContent,
    'Loaded with corrections: chapters renumbered 1–2; 1 waypoint row for chapters not in chapters.csv skipped; decimal commas read as points; text read as Windows-1252 — click a chapter to begin');
});

test(`${EDITOR}: a CSV import reports repeated chapter numbers and unreadable numbers`, () => {
  const stubs = uiStubs();
  const fns = pick(editor, ['mergeCSVImport'], stubs, { lets: true, prelude: OLD, expose: EXPOSE });
  fns.mergeCSVImport([{ num: '1', name: 'A' }, { num: '1', name: 'B' }], [{ chapter: '1', name: 'P', lat: '1', lon: '2' }], { unreadable: 2 });
  assert.deepEqual(fns.state().chapters.map(c => [c.num, c.name, c.waypoints.length]), [[1, 'A', 1], [2, 'B', 0]]);
  assert.equal(stubs.document.getElementById('status-text').textContent,
    'Loaded with corrections: chapters renumbered 1–2; 1 repeated chapter number (waypoints joined the first); 2 numbers that could not be read left unset — click a chapter to begin');
});

test(`${EDITOR}: a CSV pair whose drawing fails is reported and the voyage stays`, () => {
  const alerts = [];
  let draws = 0;
  class FileReader { readAsArrayBuffer() { this.onload({ target: { result: new Uint8Array([120]).buffer } }); } }
  const papa = { parse: () => ({ data: [{ chapter: '1', name: 'P', lat: '1', lon: '2' }], meta: { delimiter: ',', fields: ['chapter', 'name', 'lat', 'lon'] } }) };
  const stubs = uiStubs({ alert: m => alerts.push(m), FileReader, Papa: papa, renderAllChapters: () => { if (++draws === 1) throw new Error('draw failed'); } });
  const fns = pick(editor, ['handleCSVWaypointsFile'], stubs, { lets: true,
    prelude: OLD + " pendingCSVChapters = { rows: [{ num: '1', name: 'New' }], legacy: false, decimalCommas: false, unreadable: 0 };", expose: EXPOSE });
  fns.handleCSVWaypointsFile({ target: { files: [{}], value: 'x' } });
  assert.equal(alerts.length, 1);
  assert.match(alerts[0], /current voyage is unchanged[\s\S]*draw failed/);
  assert.equal(fns.state().chapters[0].name, 'Old');
});

test(`${EDITOR}: readCSV reads decimal commas in a semicolon CSV and takes off the formula guard`, () => {
  const papa = { parse: (text, opts) => ({
    data: [{ chapter: '1', name: "'=HYPERLINK(1)", lat: '38,53', lon: '-28,63', notes: 'a,b' }],
    meta: { delimiter: ';', fields: ['chapter', 'name', 'lat', 'lon', 'notes'] } }) };
  const { readCSV } = pick(editor, ['readCSV'], { Papa: papa });
  const csv = readCSV(new TextEncoder().encode('x').buffer, ['chapter', 'order', 'lat', 'lon']);
  assert.deepEqual(csv.rows[0], { chapter: '1', name: '=HYPERLINK(1)', lat: '38.53', lon: '-28.63', notes: 'a,b' });
  assert.equal(csv.decimalCommas, true);
  // A quoted cell in a comma file, or a tab file, reads a decimal comma too; a cell that is still not
  // a number is counted.
  const comma = { parse: () => ({ data: [{ lat: '38,53', lon: '38.5°', notes: '1,2' }], meta: { delimiter: ',', fields: ['lat', 'lon', 'notes'] } }) };
  const csv2 = pick(editor, ['readCSV'], { Papa: comma }).readCSV(new Uint8Array([120]).buffer, ['lat', 'lon']);
  assert.deepEqual(csv2.rows[0], { lat: '38.53', lon: '38.5°', notes: '1,2' });
  assert.equal(csv2.decimalCommas, true);
  assert.equal(csv2.unreadable, 1);
});

test(`${EDITOR}: decodeText reads UTF-8, UTF-16 and Windows-1252 files`, () => {
  const { decodeText: decodeCSV } = pick(editor, ['decodeText']);
  const utf8 = new Uint8Array([0xEF, 0xBB, 0xBF, ...new TextEncoder().encode('Réunion')]);
  assert.deepEqual(decodeCSV(utf8.buffer), { text: 'Réunion', legacy: false });
  assert.deepEqual(decodeCSV(new Uint8Array([0x52, 0xE9, 0x75, 0x6E, 0x69, 0x6F, 0x6E]).buffer), { text: 'Réunion', legacy: true });
  assert.deepEqual(decodeCSV(new Uint8Array([0xFF, 0xFE, 0x52, 0x00, 0xE9, 0x00]).buffer), { text: 'Ré', legacy: false });
  // A byte-order mark keeps a file UTF-8 even with a bad byte, and the mark is not left in the text.
  const bad = decodeCSV(new Uint8Array([0xEF, 0xBB, 0xBF, 0x6E, 0x75, 0x6D, 0xE9]).buffer);
  assert.equal(bad.legacy, false);
  assert.ok(bad.text.startsWith('num'), JSON.stringify(bad.text));
});

// ---------------------------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------------------------

function exportRun(name, chapters, metaTitle = 'T') {
  const files = [];
  const STATE = { metaTitle, settings: { distanceUnit: 'nm' }, chapters };
  const fns = pick(editor, [name], {
    STATE, setDirty() {}, downloadFile: (n, body) => files.push({ n, body }),
    closeDropdowns() {}, announce() {}, setTimeout: fn => fn(), Papa: { unparse: o => o.data },
  });
  fns[name]();
  return files;
}
const oneChapter = () => [{ num: 1, name: '=Bad()', when: '', era: 'future', notes: '+note', padMultiplier: 1.2, blogUrl: null,
  countriesOverride: null, keyDestinations: [], waypoints: [{ name: '@x\u000Bname', lat: -1.5, lon: -25, country: '-', notes: '' }, { name: 'B', lat: 1, lon: -25, country: '' }] }];

test(`${EDITOR}: the CSV exports guard cells a spreadsheet would run as formulas, and import reads them back`, () => {
  const ch = exportRun('exportChaptersCSV', oneChapter())[0].body[0];
  assert.equal(ch.name, "'=Bad()");
  assert.equal(ch.notes, "'+note");
  const w = exportRun('exportWaypointsCSV', oneChapter())[0].body[0];
  assert.equal(w.name, "'@x\u000Bname");
  assert.equal(w.country, "'-");
  assert.equal(w.lat, -1.5);
  const { csvUncell, csvCell } = pick(editor, ['csvUncell', 'csvCell']);
  assert.equal(csvUncell("'=Bad()"), '=Bad()');
  assert.equal(csvUncell("'plain"), "'plain");
  for (const text of ["'=quoted", "''-dash", "'plain", '=x', 'plain', '-', "'"]) assert.equal(csvUncell(csvCell(text)), text, text);
});

test(`${EDITOR}: the KML export carries the voyage title and stays well-formed with control characters`, () => {
  const kml = exportRun('exportKML', oneChapter(), 'Grace & Co')[0].body;
  assert.match(kml, /<Document>\n<name>Grace &amp; Co<\/name>/);
  assert.ok(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(kml), 'no forbidden control characters');
  assert.match(exportRun('exportKML', oneChapter(), '')[0].body, /<Document>\n<name>Voyage Atlas<\/name>/);
  assert.match(exportRun('exportKML', oneChapter())[0].body, /<name>@xname<\/name>/);
});

test(`${EDITOR}: a voyage file writes key destinations as a list`, () => {
  const STATE = { metaTitle: '', settings: { distanceUnit: 'nm' }, chapters: [{ ...oneChapter()[0], keyDestinations: '' }] };
  const { buildExportJSON } = pick(editor, ['buildExportJSON'], { STATE });
  assert.deepEqual(JSON.parse(buildExportJSON()).chapters[0].keyDestinations, []);
});

// ---------------------------------------------------------------------------------------------
// Inputs, dialogs and drags
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: a typed latitude beyond 90 is refused and a typed longitude is brought into range`, () => {
  const calls = [];
  const doc = documentStub();
  const { onCoordInput } = pick(editor, ['onCoordInput'], { document: doc, updateWpt: (...a) => calls.push(a) });
  const lat = { value: '95', defaultValue: '37.03' };
  onCoordInput(lat, 1, 0, 'lat');
  assert.equal(lat.value, '37.03');
  assert.deepEqual(calls, []);
  assert.equal(doc.getElementById('status-text').textContent, 'Latitude must be between -90 and 90.');
  const lon = { value: '200', defaultValue: '' };
  onCoordInput(lon, 1, 0, 'lon');
  assert.deepEqual(calls, [[1, 0, 'lon', -160]]);
  assert.equal(String(lon.value), '-160');
  const zero = { value: '0', defaultValue: '5' };
  onCoordInput(zero, 1, 1, 'lat');
  assert.deepEqual(calls[1], [1, 1, 'lat', 0]);
});

test(`${EDITOR}: the latitude note gives way to what the status line said before`, () => {
  const doc = documentStub();
  const status = doc.getElementById('status-text');
  status.dataset = {};
  status.textContent = 'Ch 2: Two · 4 waypoints';
  const { onCoordInput } = pick(editor, ['onCoordInput'], { document: doc, updateWpt() {} });
  onCoordInput({ value: '95', defaultValue: '1' }, 2, 0, 'lat');
  onCoordInput({ value: '96', defaultValue: '1' }, 2, 0, 'lat');
  assert.equal(status.textContent, 'Latitude must be between -90 and 90.');
  onCoordInput({ value: '45', defaultValue: '1' }, 2, 0, 'lat');
  assert.equal(status.textContent, 'Ch 2: Two · 4 waypoints');
});

// The editor's global keydown listener, taken from the page and run against a stub document.
function keydown(open, safeDefault = false) {
  const listener = findListener(editor.js, 'keydown', "'lookup-confirm-modal'");
  assert.ok(listener, 'keydown listener found');
  const calls = [];
  let handler;
  const el = id => ({ classList: { contains: c => (c === 'hidden' ? id === 'landing' : open.includes(id)) }, click: () => calls.push('pick-file') });
  const doc = { getElementById: el, addEventListener: (type, fn) => { handler = fn; } };
  const names = ['closeChooser', 'closeBulkModal', 'closePasteModal', 'closeCSVStep2', 'closeDeleteWptModal', 'closeConfirmModal',
    'closeLookupConfirm', 'proceedLookupConfirm', 'closeDropdowns', 'deselectWaypoint', 'doBulkAdd', 'doDeleteWpt', 'proceedConfirmModal'];
  const stubs = Object.fromEntries(names.map(n => [n, () => calls.push(n)]));
  new Function('document', 'selectedWpt', 'confirmSafeDefault', ...names, listener)(doc, null, safeDefault, ...names.map(n => stubs[n]));
  const target = modal => ({ closest: sel => (modal && sel === `#${modal} button` ? {} : null) });
  return { calls, enterOn: modal => handler({ key: 'Enter', shiftKey: false, target: target(modal), preventDefault() {} }) };
}

for (const [modal, action] of [['confirm-modal', 'proceedConfirmModal'], ['delete-wpt-modal', 'doDeleteWpt'], ['bulk-modal', 'doBulkAdd'], ['csv-step2-modal', 'pick-file']]) {
  test(`${EDITOR}: Enter on a focused button of ${modal} is left to that button`, () => {
    const k = keydown([modal]);
    k.enterOn(modal);
    assert.deepEqual(k.calls, []);
    const k2 = keydown([modal]);
    k2.enterOn(null);
    assert.deepEqual(k2.calls, [action]);
  });
}

test(`${EDITOR}: Enter in the Discard unsaved changes confirm always keeps editing`, () => {
  for (const focus of ['confirm-modal', null]) {
    const k = keydown(['confirm-modal'], true);
    k.enterOn(focus);
    assert.deepEqual(k.calls, ['closeConfirmModal']);
  }
});

test(`${EDITOR}: the Delete Waypoint dialog takes focus on its Delete button`, () => {
  assert.match(editor.html, /<button class="btn btn-danger" id="delete-wpt-ok" onclick="doDeleteWpt\(\)">Delete<\/button>/);
  assert.match(editor.defs.confirmDeleteWaypoint, /getElementById\('delete-wpt-ok'\)\.focus\(\)/);
});

test(`${EDITOR}: a drag released anywhere on the page ends`, () => {
  const ended = [];
  const listeners = [];
  const doc = { removeEventListener: (t, fn) => listeners.push(['remove', t]) };
  const fns = pick(editor, ['endDragOnRelease'], { document: doc, onMarkerDragEnd: () => ended.push('marker'), onGhostDragEnd: () => ended.push('ghost') },
    { lets: true, prelude: 'dragMarkerLink = { chNum: 1, wptIdx: 0 }; ghostDragTarget = null;' });
  fns.endDragOnRelease();
  assert.deepEqual(ended, ['marker']);
  assert.deepEqual(listeners, [['remove', 'mouseup']]);
  // Both drags listen for the release on the page, not only on the chart.
  const handlers = editor.defs.updateMapChapter;
  assert.equal((handlers.match(/document\.addEventListener\('mouseup', endDragOnRelease\)/g) || []).length, 2);
  assert.match(editor.defs.onMarkerDrag, /if \(!markerDidMove\) setDirty\(true\)/);
});

test(`${EDITOR}: longitudes from the chart are stored at five decimals and inside -180 to 180`, () => {
  for (const name of ['onMapClick', 'onMarkerDrag', 'onGhostDragEnd']) assert.match(editor.defs[name], /normLon\(round5\(/, name);
  const { normLon, round5 } = pick(editor, ['normLon', 'round5']);
  for (const lng of [16.644289999, 13.381349999, -180.000003, 179.999996, 200.123456, -539.99999, 0.1 + 0.2]) {
    const lon = normLon(round5(lng));
    assert.ok(lon >= -180 && lon < 180, `${lng} -> ${lon}`);
    assert.equal(lon, Number(lon.toFixed(5)), `${lng} -> ${lon}`);
  }
});

test(`${EDITOR}: the latitude field has no min, so its stepper keeps the value's other digits`, () => {
  const input = (editor.html.match(/<input type="number"[^>]*id="wpt-lat-[^>]*>/) || [''])[0];
  assert.ok(input, 'latitude input found');
  assert.ok(!/\bmin=|\bmax=/.test(input), input);
});

test(`${EDITOR}: a tab-separated paste reads decimal commas`, () => {
  const STATE = { chapters: [{ num: 1, waypoints: [] }] };
  const area = { value: 'Horta\t38,53\t-28,63\nTypo\t95\t200' };
  const { doPaste } = pick(editor, ['doPaste'], {
    STATE, Papa: { parse: text => ({ data: text.split('\n').map(l => l.split('\t')) }) },
    document: { getElementById: id => (id === 'paste-area' ? area : { classList: { remove() {} } }) },
    closePasteModal() {}, noteFirstEdit() {}, announce() {}, renderChapterWaypoints() {}, updateMapChapter() {},
    updateChapterCountries() {}, refreshChapterLinks() {}, forwardGeocodeWaypoint() {},
  }, { lets: true, prelude: 'pasteTargetChNum = 1;' });
  doPaste();
  assert.deepEqual(STATE.chapters[0].waypoints.map(w => [w.name, w.lat, w.lon]), [['Horta', 38.53, -28.63], ['Typo', null, -160]]);
});

test(`${EDITOR}: a pasted coordinate that cannot be read is left empty, noted, and not looked up by name`, () => {
  const STATE = { chapters: [{ num: 1, waypoints: [] }] };
  const area = { value: 'A,"38,5",-9\nB,38.5\u00b0,x\nC' };
  const looked = [];
  const doc = documentStub();
  doc.els['paste-area'] = area;
  const { doPaste } = pick(editor, ['doPaste'], {
    STATE, Papa: { parse: () => ({ data: [['A', '38,5', '-9'], ['B', '38.5\u00b0', 'x'], ['C']] }) }, document: doc,
    closePasteModal() {}, noteFirstEdit() {}, announce() {}, renderChapterWaypoints() {}, updateMapChapter() {},
    updateChapterCountries() {}, refreshChapterLinks() {}, forwardGeocodeWaypoint: (c, i, name) => looked.push(name),
  }, { lets: true, prelude: 'pasteTargetChNum = 1;' });
  doPaste();
  assert.deepEqual(STATE.chapters[0].waypoints.map(w => [w.name, w.lat, w.lon]), [['A', 38.5, -9], ['B', null, null], ['C', null, null]]);
  assert.deepEqual(looked, ['C']);
  assert.equal(doc.getElementById('status-text').textContent, 'Pasted with corrections: 2 numbers that could not be read left unset');
});

// ---------------------------------------------------------------------------------------------
// The When field
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: the When parser reads year-crossing seasons, full month names and says what it cannot read`, () => {
  const { parseWhen } = pick(editor, ['parseWhen']);
  const p = s => { const r = parseWhen(s); return [r.sm, r.sy, r.em, r.ey, r.readable]; };
  assert.deepEqual(p('Nov – Mar 2026'), ['Nov', '2025', 'Mar', '2026', true]);
  assert.deepEqual(p('May – Sep 2028'), ['May', '2028', 'Sep', '2028', true]);
  assert.deepEqual(p('June 2025 – August 2025'), ['Jun', '2025', 'Aug', '2025', true]);
  assert.deepEqual(p('2032 – 33'), ['', '2032', '', '2033', true]);
  assert.deepEqual(p('Jun 2019 – Aug 2019'), ['Jun', '2019', 'Aug', '2019', true]);
  assert.deepEqual(p('Summer 2025'), ['', '2025', '', '', false]);
  assert.deepEqual(p(''), ['', '', '', '', true]);
  assert.deepEqual(p(2025), ['', '2025', '', '2025', true]);
});

test(`${EDITOR}: a When the lists cannot show is shown as saved`, () => {
  assert.match(editor.defs.renderMetaForm, /parseWhen\(ch\.when\)\.readable \? '' :/);
  assert.match(editor.defs.renderMetaForm, /Choosing from the lists replaces it\./);
  assert.match(editor.defs.onWhenChange, /when-note-\$\{chNum\}/);
});

// ---------------------------------------------------------------------------------------------
// Viewer loads
// ---------------------------------------------------------------------------------------------

test(`${VIEWER}: normalizeData keeps only avoidance zones with four numeric bounds`, () => {
  const { normalizeData } = pick(viewer, ['normalizeData']);
  const d = normalizeData({ chapters: [], paz: [{ zone: 'A', bounds: [1, 2, 3, 4] }, { zone: 'B' }, { zone: 'C', bounds: [1, 2, 'x', 4] }, null] });
  assert.deepEqual(d.paz, [{ zone: 'A', bounds: [1, 2, 3, 4] }]);
});

test(`${VIEWER}: a file that fails to load leaves the chart drawn`, () => {
  let cleared = 0;
  const layer = { clearLayers: () => { cleared++; } };
  const { loadVoyageData } = pick(viewer, ['loadVoyageData'], {
    document: { getElementById: () => ({ innerHTML: '' }) }, routesLayer: layer, wptsLayer: layer, pazLayer: layer,
    decisionLayer: layer, gatewayLayer: layer, closeInfo() {}, polylines: {}, wptMarkers: {}, DATA: { chapters: [] }, activeNum: null,
    L: {}, map: {},
  }, { prelude: '' });
  assert.throws(() => loadVoyageData({ type: 'FeatureCollection', features: [] }), /no "chapters" list/);
  assert.equal(cleared, 0);
});

test(`${VIEWER}: hovering a route under chapter 0's selection keeps the dimming`, () => {
  assert.ok(!/activeNum \? /.test(viewer.defs.loadVoyageData), 'no truthiness test on activeNum');
  assert.match(viewer.defs.loadVoyageData, /activeNum !== null \? 2 : 5/);
});

test(`${VIEWER}: a published file that reads but fails to draw is reported as unreadable, not missing`, () => {
  assert.match(viewer.js, /try \{ loadVoyageData\(parsed\); \}\s*catch \(err\) \{ sampleAvailable = false; dataNote = DATA_NOTES\.unreadable; openChooser\(\); \}/);
});

for (const tool of tools) {
  test(`${tool.name}: the arrival chooser names why the voyage file named for the visit was not used`, () => {
    assert.match(tool.html, /<span id="landing-data-note-text">Voyage files must be on this site\.<\/span>/);
    assert.match(tool.defs.openChooser, /getElementById\('landing-data-note-text'\)\.textContent = dataNote/);
    assert.match(tool.js, /dataNote = dataPath === null \? DATA_NOTES\.offSite : \(named \? DATA_NOTES\.notFound : ''\)/);
    assert.match(tool.js, /dataNote = DATA_NOTES\.unreadable/);
  });
}
