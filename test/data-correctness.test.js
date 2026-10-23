// Data correctness, from the full review of v3.9.14: a lookup answer never lands in a field being
// typed in; coordinates typed with a hemisphere letter, in degrees and minutes or with a decimal
// comma are read as written; country names match however they are written, and the overseas
// departments count as territories; CSVs carry a byte-order mark and blank spreadsheet rows are
// skipped; a voyage file from a newer data model, or with fields these tools do not know, says so,
// and avoidance zones are kept on save; long lists and a long When read in one pass; a long paste
// of names asks before looking them up; and a paste counts the latitudes it leaves empty.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, pick, miniPapa } = require('./support.js');

const editor = loadTool(EDITOR);
const viewer = loadTool(VIEWER);
const tools = [editor, viewer];
const copy = o => JSON.parse(JSON.stringify(o));
const settle = () => new Promise(r => setImmediate(r));

// ---------------------------------------------------------------------------------------------
// Lookup answers and fields being typed in
// ---------------------------------------------------------------------------------------------

function nameLookup(focused, typed) {
  const w = { name: 'Horta', lat: null, lon: null, major: false, decision: false, gateway: false, country: '', notes: '' };
  const ch = { num: 1, waypoints: [w] };
  const fields = {};
  const field = id => (fields[id] = fields[id] || { value: id === focused ? typed : '', defaultValue: '' });
  const document = { querySelector: sel => field(sel), get activeElement() { return focused ? field(focused) : null; } };
  const run = pick(editor, ['processFwdGeoQueue'], {
    WREF: w, geoRequest: () => Promise.resolve([{ lat: '38.53212', lon: '-28.62679', address: { country: 'Portugal' } }]),
    chapterOf: () => ch, document, setDirty() {}, noteGeocodeUse() {},
    updateMapChapter() {}, updateChapterCountries() {}, refreshChapterLinks() {}, renderGeoStatus() {}, syncCountryFlag() {},
  }, { lets: true, prelude: "fwdGeoQueue = [{ wptRef: WREF, name: 'Horta' }];" });
  run.processFwdGeoQueue();
  return { w, fields };
}

test(`${EDITOR}: a name lookup answered while a coordinate is being typed in its row leaves the row alone`, async () => {
  for (const focused of ['#wpt-lat-1-0', '#wpt-lon-1-0']) {
    const { w, fields } = nameLookup(focused, '3');
    await settle();
    assert.deepEqual([w.lat, w.lon, w.country], [null, null, ''], focused);
    assert.equal(fields[focused].value, '3', focused);
  }
});

test(`${EDITOR}: a name lookup answered while the cursor only sits in the empty latitude field fills the row`, async () => {
  // Tab after the name moves the cursor into the latitude field before the answer comes.
  const { w, fields } = nameLookup('#wpt-lat-1-0', '');
  await settle();
  assert.deepEqual([w.lat, w.lon, w.country], [38.53212, -28.62679, 'Portugal']);
  assert.equal(fields['#wpt-lat-1-0'].value, 38.53212);
});

test(`${EDITOR}: a name lookup answered while the country is being typed fills the coordinates only`, async () => {
  const { w, fields } = nameLookup('#wpt-country-1-0', 'Gre');
  await settle();
  assert.deepEqual([w.lat, w.lon, w.country], [38.53212, -28.62679, '']);
  assert.equal(fields['#wpt-country-1-0'].value, 'Gre');
});

test(`${EDITOR}: a country lookup answered while the country is being typed leaves the field alone`, async () => {
  const w = { name: 'A', lat: 37.9, lon: 23.7, country: '' };
  const ch = { num: 1, waypoints: [w] };
  const input = { value: 'Gre' };
  const answers = [];
  const run = pick(editor, ['queueChapterCountryLookups'], {
    document: { querySelector: () => input, activeElement: input },
    reverseGeocode: (lat, lon, cb) => answers.push(cb), chapterOf: () => ch, renderGeoStatus() {},
    setDirty() {}, syncCountryFlag() {}, updateChapterCountries() {},
  });
  assert.equal(run.queueChapterCountryLookups(ch), 1);
  answers[0]('Greece');
  assert.equal(w.country, '');
  assert.equal(input.value, 'Gre');
});

test(`${EDITOR}: a country lookup answered while a coordinate of the row is being typed is dropped`, () => {
  // The answer is for the position the row had, and a new one is being typed.
  const w = { name: 'A', lat: 37.9, lon: 23.7, country: '' };
  const ch = { num: 1, waypoints: [w] };
  const inputs = { '#wpt-country-1-0': { value: '' }, '#wpt-lat-1-0': { value: '38' }, '#wpt-lon-1-0': { value: '23.7' } };
  const answers = [];
  pick(editor, ['queueChapterCountryLookups'], {
    document: { querySelector: sel => inputs[sel], activeElement: inputs['#wpt-lat-1-0'] },
    reverseGeocode: (lat, lon, cb) => answers.push(cb), chapterOf: () => ch, renderGeoStatus() {},
    setDirty() {}, syncCountryFlag() {}, updateChapterCountries() {},
  }).queueChapterCountryLookups(ch);
  answers[0]('Greece');
  assert.equal(w.country, '');
});

test(`${EDITOR}: a country lookup answered with the field not in use fills it`, () => {
  const w = { name: 'A', lat: 37.9, lon: 23.7, country: '' };
  const ch = { num: 1, waypoints: [w] };
  const input = { value: '' };
  const answers = [];
  pick(editor, ['queueChapterCountryLookups'], {
    document: { querySelector: () => input, activeElement: null },
    reverseGeocode: (lat, lon, cb) => answers.push(cb), chapterOf: () => ch, renderGeoStatus() {},
    setDirty() {}, syncCountryFlag() {}, updateChapterCountries() {},
  }).queueChapterCountryLookups(ch);
  answers[0]('Greece');
  assert.equal(w.country, 'Greece');
  assert.equal(input.value, 'Greece');
});

// ---------------------------------------------------------------------------------------------
// Coordinates as people type them
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: coordinates are read with hemisphere letters, in degrees and minutes and with decimal commas`, () => {
  const { readCoordText } = pick(editor, ['readCoordText']);
  const value = (t, axis) => readCoordText(t, axis).value;
  assert.equal(value('38.5S', 'lat'), -38.5);
  assert.equal(value('S 38.5', 'lat'), -38.5);
  assert.equal(value('38.5 n', 'lat'), 38.5);
  assert.equal(value('16.5W', 'lon'), -16.5);
  assert.equal(value('21.3E', 'lon'), 21.3);
  assert.equal(value("16°30'W", 'lon'), -16.5);
  assert.equal(value('16° 30′ W', 'lon'), -16.5);
  assert.equal(value('38°31.8\'N', 'lat'), 38.53);
  assert.equal(value('28 37 48 W', 'lon'), -28.63);
  assert.equal(value('38°30\'15"N', 'lat'), 38.50417);
  assert.equal(value('21,3', 'lon'), 21.3);
  assert.equal(value('-38,5', 'lat'), -38.5);
  // The Mac's Option-K degree sign, a Unicode minus copied from a page, and a fraction without its 0.
  assert.equal(value("38˚31.8'N", 'lat'), 38.53);
  assert.equal(value('\u221238.5', 'lat'), -38.5);
  assert.equal(value('.5S', 'lat'), -0.5);
  assert.equal(value('5.S', 'lat'), -5);
  // Plain numbers are read as before: in full, 0 included, and an empty field is empty.
  assert.deepEqual(readCoordText('38.532125', 'lat'), { value: 38.532125 });
  assert.deepEqual(readCoordText('0', 'lon'), { value: 0 });
  assert.deepEqual(readCoordText('  ', 'lat'), { value: null });
  assert.equal(readCoordText('38.5S', 'lat').converted, true);
});

test(`${EDITOR}: coordinates that say their direction twice, or in the wrong letter, are refused`, () => {
  const { readCoordText } = pick(editor, ['readCoordText']);
  for (const [t, axis] of [['38.5E', 'lat'], ['16.5N', 'lon'], ['-16.5W', 'lon'], ['N 38 S', 'lat'], ["16.5°30'", 'lon'],
    ["16°60'", 'lon'], ['16 30.5 10', 'lon'], ['abc', 'lat'], ['12abc', 'lat'], ['S', 'lat']]) {
    assert.deepEqual(readCoordText(t, axis), { error: true }, t);
  }
});

function coordField(value, defaultValue = '37.03') {
  const calls = [];
  const status = { textContent: 'Ch 1: One · 2 waypoints', dataset: {} };
  const fns = pick(editor, ['onCoordInput', 'coordKey'], { document: { getElementById: () => status }, updateWpt: (...a) => calls.push(a) });
  const input = { value, defaultValue };
  return { calls, status, input, fns };
}

test(`${EDITOR}: a coordinate typed with a letter is stored and shown in decimal degrees, and the status line says so`, () => {
  const { calls, status, input, fns } = coordField('38.5S');
  fns.onCoordInput(input, 1, 0, 'lat');
  assert.deepEqual(calls, [[1, 0, 'lat', -38.5]]);
  assert.equal(String(input.value), '-38.5');
  assert.equal(String(input.defaultValue), '-38.5');
  assert.equal(status.textContent, 'Latitude 38.5S read as -38.5.');
});

test(`${EDITOR}: a coordinate that cannot be read puts the field back and says what is accepted`, () => {
  const { calls, status, input, fns } = coordField('38.5E');
  fns.onCoordInput(input, 1, 0, 'lat');
  assert.deepEqual(calls, []);
  assert.equal(input.value, '37.03');
  assert.match(status.textContent, /^A latitude is decimal degrees/);
  // The next valid entry puts back what the status line said before.
  fns.onCoordInput({ value: '38', defaultValue: '' }, 1, 0, 'lat');
  assert.equal(status.textContent, 'Ch 1: One · 2 waypoints');
});

test(`${EDITOR}: the arrow keys step a coordinate field by 0.01 and keep its other digits`, () => {
  const { calls, input, fns } = coordField('38.53212');
  let prevented = 0;
  const key = k => ({ key: k, preventDefault: () => prevented++ });
  fns.coordKey(key('ArrowUp'), input, 1, 0, 'lat');
  assert.deepEqual(calls.pop(), [1, 0, 'lat', 38.54212]);
  fns.coordKey(key('ArrowDown'), input, 1, 0, 'lat');
  fns.coordKey(key('ArrowDown'), input, 1, 0, 'lat');
  assert.deepEqual(calls.pop(), [1, 0, 'lat', 38.52212]);
  assert.equal(prevented, 3);
  fns.coordKey(key('a'), input, 1, 0, 'lat');
  assert.equal(prevented, 3);
  // A value with more than five decimals keeps them all.
  const fine = coordField('10.123456789');
  fine.fns.coordKey(key('ArrowUp'), fine.input, 1, 0, 'lat');
  assert.deepEqual(fine.calls, [[1, 0, 'lat', 10.133456789]]);
  const edge = coordField('89.995');
  edge.fns.coordKey(key('ArrowUp'), edge.input, 1, 0, 'lat');
  assert.deepEqual(edge.calls, []);
  assert.equal(edge.input.value, '89.995');
});

test(`${EDITOR}: the lat and lon fields are text fields read by onCoordInput and stepped by coordKey`, () => {
  const inputs = editor.html.match(/<input [^>]*id="wpt-(lat|lon)-\$\{chNum\}-\$\{idx\}"[^>]*>/g) || [];
  assert.equal(inputs.length, 2);
  for (const i of inputs) {
    assert.match(i, /^<input type="text" class="coord"/);
    assert.match(i, /onchange="onCoordInput\(this,\$\{chNum\},\$\{idx\},'(lat|lon)'\)"/);
    assert.match(i, /onkeydown="coordKey\(event,this,\$\{chNum\},\$\{idx\},'(lat|lon)'\)"/);
  }
  assert.match(editor.html, /\.wpt-table input\.coord \{ width: 80px; \}|\.wpt-table input\.coord \{/);
});

// ---------------------------------------------------------------------------------------------
// Country names
// ---------------------------------------------------------------------------------------------

for (const tool of tools) {
  test(`${tool.name}: country names match whatever their case, accents or spelling, and each place counts once`, () => {
    const { classifyCountries } = pick(tool, ['classifyCountries']);
    const { nations, territories } = classifyCountries(['Reunion', 'Réunion', 'Curacao', 'Turkey', 'Türkiye', 'greece', 'Greece',
      'Guadeloupe', 'Martinique', 'French Guiana', 'St. Barthélemy', 'US Virgin Islands', 'U.S. Virgin Islands', 'Cape Verde',
      'Cabo Verde', 'Sint Maarten', 'Saint-Martin', 'Macao', 'Macau', '  ']);
    assert.deepEqual(nations, ['Turkey', 'greece', 'Cape Verde']);
    assert.deepEqual(territories, ['Reunion', 'Curacao', 'Guadeloupe', 'Martinique', 'French Guiana', 'St. Barthélemy',
      'US Virgin Islands', 'Sint Maarten', 'Saint-Martin', 'Macao']);
  });

  test(`${tool.name}: a chapter lists a country written two ways once, as first written`, () => {
    const { chapterCountries } = pick(tool, ['chapterCountries']);
    const ch = { waypoints: [{ country: 'Greece' }, { country: ' greece ' }, { country: 'Türkiye' }, { country: 'Turkey' }, { country: '' }] };
    assert.deepEqual(chapterCountries(ch), ['Greece', 'Türkiye']);
  });

  test(`${tool.name}: a territory name split at its comma is joined however it is written`, () => {
    const { splitList } = pick(tool, ['splitList']);
    assert.deepEqual(splitList('bonaire, sint eustatius and saba, Aruba'), ['bonaire, sint eustatius and saba', 'Aruba']);
  });

  test(`${tool.name}: a list of 1,000 entries and a When of 40,000 spaces are read at once`, () => {
    const { splitList } = pick(tool, ['splitList']);
    const text = Array.from({ length: 1000 }, (_, i) => `Place ${i}`).join(', ');
    let t = Date.now();
    assert.equal(splitList(text).length, 1000);
    assert.ok(Date.now() - t < 500, `splitList took ${Date.now() - t} ms`);
  });
}

test(`${EDITOR}: a When with a long run of spaces is read at once, as before`, () => {
  const { parseWhen } = pick(editor, ['parseWhen']);
  const t = Date.now();
  assert.equal(parseWhen('Jun 2026' + ' '.repeat(40000) + 'x').readable, false);
  assert.ok(Date.now() - t < 500, `parseWhen took ${Date.now() - t} ms`);
  assert.deepEqual(parseWhen('Nov  –  Mar 2026'), { sm: 'Nov', sy: '2025', em: 'Mar', ey: '2026', readable: true });
  assert.deepEqual(parseWhen('Jun 2026 -'), { sm: 'Jun', sy: '2026', em: '', ey: '', readable: true });
});

// ---------------------------------------------------------------------------------------------
// Spreadsheet round trips
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: both CSVs start with a UTF-8 byte-order mark, and an accented name reads back intact`, () => {
  const files = [];
  const STATE = { metaTitle: '', settings: { distanceUnit: 'nm' }, chapters: [{ num: 1, name: 'Türkiye run', when: '', era: 'future',
    notes: '', padMultiplier: 1.2, blogUrl: null, countriesOverride: ['Türkiye'], keyDestinations: [],
    waypoints: [{ name: 'Göcek', lat: 36.75, lon: 28.94, major: false, decision: false, gateway: false, country: 'Türkiye', notes: '' }] }] };
  const fns = pick(editor, ['exportChaptersCSV', 'exportWaypointsCSV'], {
    STATE, Papa: miniPapa, closeDropdowns() {}, downloadFile: (n, body) => files.push({ n, body }),
  });
  fns.exportChaptersCSV();
  fns.exportWaypointsCSV();
  assert.deepEqual(files.map(f => [f.n, f.body.charCodeAt(0)]), [['chapters.csv', 0xFEFF], ['waypoints.csv', 0xFEFF]]);
  const { readCSV } = pick(editor, ['readCSV'], { Papa: miniPapa });
  const chapters = readCSV(new TextEncoder().encode(files[0].body).buffer, ['padMultiplier'], ['num', 'name']);
  const waypoints = readCSV(new TextEncoder().encode(files[1].body).buffer, ['chapter', 'order', 'lat', 'lon']);
  assert.equal(chapters.fields[0], 'num');
  assert.equal(chapters.legacy, false);
  assert.equal(chapters.rows[0].countries, 'Türkiye');
  assert.equal(waypoints.rows[0].name, 'Göcek');
});

test(`${EDITOR}: blank spreadsheet rows add no chapters and are not reported as waypoints for missing chapters`, () => {
  const { readCSV } = pick(editor, ['readCSV'], { Papa: miniPapa });
  const buf = s => new TextEncoder().encode(s).buffer;
  const ch = readCSV(buf('num,name,when\r\n1,One,\r\n,,\r\n , ,\r\n2,Two,\r\n,,,,\r\n'), ['padMultiplier'], ['num', 'name']);
  assert.deepEqual(ch.rows.map(r => r.name), ['One', 'Two']);
  assert.equal(ch.trimmed, 0);
  const wp = readCSV(buf('chapter,name,lat,lon\r\n1,A,1,2\r\n,,,\r\n2,B,3,4\r\n'), ['chapter', 'lat', 'lon']);
  let notes = null;
  pick(editor, ['mergeCSVImport'], {
    installVoyage: (v, n) => { notes = n; }, announce() {}, alert() {}, defaultSettings: () => ({}),
  }).mergeCSVImport(ch.rows, wp.rows, {});
  assert.deepEqual(notes, []);
});

// ---------------------------------------------------------------------------------------------
// Data model version, fields not known, avoidance zones
// ---------------------------------------------------------------------------------------------

const FUTURE = {
  meta: { version: '3.1', title: 'T', generatedAt: 'x', hero: { nm: 1 }, theme: 'dark', settings: { distanceUnit: 'nm', vessel: 'G' } },
  chapters: [{ num: 1, name: 'A', color: 'red', routing: 'r', nm: 10, countries: ['X'],
    waypoints: [{ order: 1, name: 'x', lat: 1, lon: 2, depth: 3 }, { name: 'y', lat: 1, lon: 3, depth: 4 }] }],
  paz: [{ zone: 'Z', bounds: [1, 2, 3, 4], kind: 'firing' }, { zone: 'Bad', bounds: [1, 2, 3] }],
  route: [],
};

for (const tool of tools) {
  test(`${tool.name}: a voyage file names the fields these tools do not know, and a newer data model`, () => {
    const { readVoyage } = pick(tool, ['readVoyage']);
    const v = readVoyage(copy(FUTURE));
    assert.deepEqual(v.unknownFields, ['route', 'meta.theme', 'meta.settings.vessel', 'chapter color', 'waypoint depth', 'zone kind']);
    assert.equal(v.newerVersion, '3.1');
    assert.deepEqual(v.paz, [{ zone: 'Z', bounds: [1, 2, 3, 4] }]);
    assert.equal(v.zonesDropped, 1);
    for (const version of ['3.0', '2.7', '', undefined, 'three']) {
      assert.equal(readVoyage({ meta: { version }, chapters: [] }).newerVersion, null, String(version));
    }
    assert.equal(readVoyage({ meta: { version: '4.0' }, chapters: [] }).newerVersion, '4.0');
    assert.equal(readVoyage({ meta: { version: '4' }, chapters: [] }).newerVersion, '4');
    assert.equal(readVoyage({ meta: { version: 'v3.1' }, chapters: [] }).newerVersion, 'v3.1');
    assert.equal(readVoyage({ meta: { version: 'v3.0' }, chapters: [] }).newerVersion, null);
    assert.equal(readVoyage({ meta: { version: '3' }, chapters: [] }).newerVersion, null);
    // Routing, bail-out and prose fold into a chapter's notes only when it has none of its own.
    assert.deepEqual(readVoyage({ chapters: [{ notes: 'n', routing: 'R', prose: '' }] }).unknownFields, ['chapter routing']);
    assert.deepEqual(readVoyage({ chapters: [{ routing: 'R' }] }).unknownFields, []);
    // A zone without a name is read without one, so it is saved without one.
    assert.deepEqual(readVoyage({ chapters: [], paz: [{ bounds: [1, 2, 3, 4] }] }).paz, [{ bounds: [1, 2, 3, 4] }]);
    assert.equal(readVoyage({ chapters: [], paz: 'none' }).zonesDropped, 1);
  });
}

test(`${VIEWER}: the viewer draws the avoidance zones the shared reader keeps`, () => {
  const { normalizeData } = pick(viewer, ['normalizeData']);
  assert.deepEqual(normalizeData(copy(FUTURE)).paz, [{ zone: 'Z', bounds: [1, 2, 3, 4] }]);
});

test(`${EDITOR}: loading such a file says what will not be kept on save`, () => {
  let shown = null;
  pick(editor, ['loadVoyage'], { installVoyage: (v, notes) => { shown = { v, notes }; } }).loadVoyage(copy(FUTURE));
  assert.deepEqual(shown.notes, [
    '1 avoidance zone without four bounds left out',
    'made with data model 3.1; this editor reads 3.0',
    '6 fields this editor does not know, not kept on save: route, meta.theme, meta.settings.vessel, chapter color, waypoint depth, and 1 more',
  ]);
  assert.deepEqual(shown.v.paz, [{ zone: 'Z', bounds: [1, 2, 3, 4] }]);
  const { unknownFieldsNote } = pick(editor, ['unknownFieldsNote']);
  assert.equal(unknownFieldsNote(['chapter color']), '1 field this editor does not know, not kept on save: chapter color');
});

test(`${EDITOR}: avoidance zones are saved back as they were read, and a voyage without them writes none`, () => {
  const STATE = { chapters: [], settings: { distanceUnit: 'nm' }, metaTitle: '', paz: [{ zone: 'Z', bounds: [-20, 170, -10, -170] }] };
  const out = JSON.parse(pick(editor, ['buildExportJSON'], { STATE }).buildExportJSON());
  assert.deepEqual(out.paz, [{ zone: 'Z', bounds: [-20, 170, -10, -170] }]);
  assert.deepEqual(Object.keys(out), ['meta', 'chapters', 'paz']);
  assert.equal(out.meta.version, '3.0');
  STATE.paz = [];
  assert.ok(!('paz' in JSON.parse(pick(editor, ['buildExportJSON'], { STATE }).buildExportJSON())));
});

// ---------------------------------------------------------------------------------------------
// Paste
// ---------------------------------------------------------------------------------------------

function paste(text, over = {}) {
  const ch = { num: 1, waypoints: [] };
  const looked = [], confirms = [];
  const status = { textContent: '' };
  const doc = { getElementById: id => (id === 'paste-area' ? { value: text } : id === 'status-text' ? status : { textContent: '' }) };
  const run = pick(editor, ['doPaste'], {
    document: doc, Papa: miniPapa, getChapter: () => ch, setDirty() {}, noteFirstEdit() {}, announce() {}, closePasteModal() {},
    renderChapterWaypoints() {}, updateMapChapter() {}, updateChapterCountries() {}, refreshChapterLinks() {},
    forwardGeocodeWaypoint: (n, i, name) => looked.push(name), geoPending: () => 0,
    showLookupConfirm: (n, action, what) => confirms.push({ n, action, what }), ...over,
  }, { lets: true, prelude: 'pasteTargetChNum = 1;' });
  run.doPaste();
  return { ch, looked, confirms, status };
}

test(`${EDITOR}: a paste of 30 or more names to look up asks first; Cancel keeps the rows`, () => {
  const names = n => Array.from({ length: n }, (_, i) => `Place ${i}`).join('\n');
  const many = paste(names(30));
  assert.equal(many.ch.waypoints.length, 30);
  assert.deepEqual(many.looked, []);
  assert.deepEqual(many.confirms.map(c => [c.n, c.what]), [[30, 'coordinates']]);
  many.confirms[0].action();
  assert.equal(many.looked.length, 30);
  assert.equal(many.looked[29], 'Place 29');
  const few = paste(names(29));
  assert.equal(few.looked.length, 29);
  assert.deepEqual(few.confirms, []);
});

test(`${EDITOR}: Cmd/Ctrl+Enter in the paste box goes no further, so it cannot answer the lookup dialog it opens`, () => {
  const box = (editor.html.match(/<textarea id="paste-area" onkeydown="([^"]*)"/) || [])[1] || '';
  assert.match(box, /event\.preventDefault\(\);event\.stopPropagation\(\);doPaste\(\);/);
});

test(`${EDITOR}: the lookup dialog names what it looks up`, () => {
  const els = { 'lookup-confirm-title': { textContent: '' }, 'lookup-confirm-msg': { textContent: '' },
    'lookup-confirm-modal': { classList: { add() {} } }, 'lookup-confirm-ok': { focus() {} } };
  const { showLookupConfirm } = pick(editor, ['showLookupConfirm'], { document: { getElementById: id => els[id] } });
  showLookupConfirm(300, () => {}, 'coordinates');
  assert.equal(els['lookup-confirm-title'].textContent, 'Look up coordinates');
  assert.equal(els['lookup-confirm-msg'].textContent, 'This will look up coordinates for 300 waypoints at about one per second — roughly 6 minutes.');
  showLookupConfirm(1, () => {});
  assert.equal(els['lookup-confirm-title'].textContent, 'Look up countries');
  assert.match(editor.html, /<h2 id="lookup-confirm-title">Look up countries<\/h2>/);
});

test(`${EDITOR}: a paste counts the latitudes beyond ±90 it leaves empty, reads letters and skips blank rows`, () => {
  const { ch, looked, status } = paste('A\t95\t10\nB\t38.5S\t16°30\'W\n \t \t \nC\t\t\n');
  assert.deepEqual(ch.waypoints.map(w => [w.name, w.lat, w.lon]), [['A', null, 10], ['B', -38.5, -16.5], ['C', null, null]]);
  assert.deepEqual(looked, ['C']);
  assert.equal(status.textContent, 'Pasted with corrections: 1 latitude beyond ±90 left without coordinates');
});
