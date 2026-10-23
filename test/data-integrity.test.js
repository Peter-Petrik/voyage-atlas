// Voyage data that must survive editing, loading and exporting unchanged: coordinates of exactly 0,
// a clean session when one voyage replaces another, When years outside a fixed window, list entries
// that contain commas, and an unsaved marker that only a reloadable save clears.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, pick } = require('./support.js');

const editor = loadTool(EDITOR);
const viewer = loadTool(VIEWER);

// A chapter crossing the equator on 25°W: the first point sits on latitude 0, the second on the
// prime meridian, so a tool that reads 0 as "no coordinate" drops both.
const crossing = () => ({
  num: 2, name: 'Crossing the Line', padMultiplier: 1,
  waypoints: [
    { name: 'On the line', lat: 0, lon: -25 },
    { name: '', lat: 10, lon: -25 },
    { name: 'Greenwich meridian', lat: 10, lon: 0 },
  ],
});
const before = () => ({ num: 1, name: 'Before', padMultiplier: 1, waypoints: [{ name: 'Start', lat: -5, lon: -25 }] });

// ---------------------------------------------------------------------------------------------
// Coordinates of exactly 0
// ---------------------------------------------------------------------------------------------

for (const tool of [editor, viewer]) {
  const voyage = () => ({ chapters: [before(), crossing()] });
  const shared = names => {
    const v = voyage();
    return { v, fns: pick(tool, names, { STATE: v, DATA: v }) };
  };

  test(`${tool.name}: a waypoint at 0° counts in the chapter distance and the approach leg`, () => {
    const { v, fns } = shared(['chapterNmBase', 'chapterApproachNm']);
    // 0°N 25°W to 10°N 25°W is 600 nm; 10°N 25°W to 10°N 0° is about 1,477 nm.
    assert.ok(Math.abs(fns.chapterNmBase(v.chapters[1]) - 2077) <= 3, `chapter ${fns.chapterNmBase(v.chapters[1])} nm`);
    // The approach runs from the previous chapter's last point (5°S 25°W) to this chapter's first (0°).
    assert.equal(fns.chapterApproachNm(v.chapters[1], v.chapters), 300);
  });

  test(`${tool.name}: an unnamed point at 0° counts as a shaping vertex`, () => {
    const v = { chapters: [{ num: 1, padMultiplier: 1, waypoints: [{ name: '', lat: 0, lon: 0 }, { name: '', lat: 1, lon: 0 }] }] };
    const { computeHeroStats } = pick(tool, ['computeHeroStats'], { STATE: v, DATA: v });
    assert.equal(computeHeroStats(v.chapters, {}).shapingVertices, 2);
  });

  test(`${tool.name}: framing the whole voyage includes points at 0°`, () => {
    const v = voyage();
    let framed = null;
    const { fitAllChapters } = pick(tool, ['fitAllChapters'], { fitToCoords: c => { framed = c; } });
    fitAllChapters(v.chapters);
    assert.deepEqual(framed, [[-5, -25], [0, -25], [10, -25], [10, 0]]);
  });

  test(`${tool.name}: hasCoord accepts 0 and rejects missing or non-numeric values`, () => {
    const { hasCoord } = pick(tool, ['hasCoord']);
    assert.equal(hasCoord({ lat: 0, lon: 0 }), true);
    assert.equal(hasCoord({ lat: -0.5, lon: 179.9 }), true);
    for (const w of [{ lat: null, lon: 0 }, { lat: 0, lon: null }, { lat: '12', lon: 3 }, { lat: NaN, lon: 1 }, {}]) {
      assert.equal(hasCoord(w), false, JSON.stringify(w));
    }
  });
}

test(`${VIEWER}: the route runs through points at 0° and through coordinates written as text`, () => {
  const { normalizeData } = pick(viewer, ['normalizeData']);
  const data = normalizeData({ chapters: [{ num: 1, waypoints: [
    { name: 'A', lat: 0, lon: -25 }, { name: 'B', lat: '10.5', lon: '-25' }, { name: 'C', lat: 'x', lon: 1 },
  ] }] });
  assert.deepEqual(data.chapters[0].routes, [[[0, -25], [10.5, -25]]]);
  assert.equal(data.chapters[0].waypoints[1].lat, 10.5);
  assert.equal(data.chapters[0].waypoints[2].lat, null);
});

test(`${EDITOR}: a coordinate of 0 from a CSV row or the waypoint table is kept`, () => {
  const { normalizeWaypoint } = pick(editor, ['normalizeWaypoint']);
  const w = normalizeWaypoint({ name: 'On the line', lat: '0', lon: '-25' });
  assert.equal(w.lat, 0);
  assert.equal(w.lon, -25);
  assert.equal(normalizeWaypoint({ lat: '', lon: 'x' }).lat, null);
  // The table's lat and lon inputs read their value through onCoordInput, which reads it through
  // readCoordText and so toCoord, so typing 0 stores 0.
  const inputs = editor.html.match(/id="wpt-(lat|lon)-\$\{chNum\}-\$\{idx\}"[^>]*>/g) || [];
  assert.equal(inputs.length, 2, 'lat and lon inputs found');
  inputs.forEach(i => assert.ok(i.includes("onCoordInput(this,${chNum},${idx},'lat')") || i.includes("onCoordInput(this,${chNum},${idx},'lon')"), i));
  assert.match(editor.defs.onCoordInput, /readCoordText\(typed, field\)/);
  assert.match(editor.defs.readCoordText, /const plain = toCoord\(s\);/);
});

// ---------------------------------------------------------------------------------------------
// A clean session when one voyage replaces another
// ---------------------------------------------------------------------------------------------

const element = () => ({ style: {}, textContent: '', innerHTML: '', value: '', classList: { toggle() {}, add() {}, remove() {} } });
const documentStub = () => {
  const els = {};
  return { els, getElementById: id => (els[id] = els[id] || element()), querySelectorAll: () => [], querySelector: () => null };
};
const uiStubs = () => ({
  document: documentStub(), renderAllChapters() {}, loadSettings() {}, updateHeroStats() {}, setDirty() {},
  announce() {}, hideLanding() {}, guardDirty: fn => fn(), setTimeout() {}, map: null,
});
// The previous voyage's session, as the review reproduced it: chapter 3 active, a waypoint selected,
// Rapid-click on, a title and a 99,999 nm distance override, and lookups waiting.
const DIRTY_SESSION = `
  STATE = { chapters: [{ num: 3, waypoints: [] }], metaTitle: 'Old voyage',
            settings: { distanceOverride: 99999, nationsOverride: 40, territoriesOverride: 9, distanceUnit: 'km' } };
  activeChapterNum = 3; selectedChapterNum = 3; selectedWpt = {}; rapidClickMode = true;
  revGeoQueue = [{}, {}]; fwdGeoQueue = [{}]; geoTotal = 3; geoDone = 1; geoResolved = 1;`;
const SESSION_STATE = `session: () => ({ settings: STATE.settings, metaTitle: STATE.metaTitle, activeChapterNum,
  selectedChapterNum, selectedWpt, rapidClickMode, queued: revGeoQueue.length + fwdGeoQueue.length, geoTotal }),
  chapters: () => STATE.chapters`;
const CLEAN = {
  settings: { distanceOverride: null, nationsOverride: null, territoriesOverride: null, distanceUnit: 'nm' },
  metaTitle: '', activeChapterNum: null, selectedChapterNum: null, selectedWpt: null, rapidClickMode: false,
  queued: 0, geoTotal: 0,
};

test(`${EDITOR}: importing CSVs starts a clean session`, () => {
  const fns = pick(editor, ['mergeCSVImport'], uiStubs(), { lets: true, prelude: DIRTY_SESSION, expose: SESSION_STATE });
  fns.mergeCSVImport([{ num: '3', name: 'New' }], [{ chapter: '3', name: 'P', lat: '1', lon: '2' }]);
  assert.deepEqual(fns.session(), CLEAN);
  assert.equal(fns.chapters()[0].name, 'New');
});

test(`${EDITOR}: loading a voyage file starts a clean session apart from the file's own settings`, () => {
  const fns = pick(editor, ['loadVoyage'], uiStubs(), { lets: true, prelude: DIRTY_SESSION, expose: SESSION_STATE });
  fns.loadVoyage({ meta: { title: 'New voyage', settings: { distanceUnit: 'mi' } }, chapters: [{ num: 3, name: 'New' }] });
  assert.deepEqual(fns.session(), {
    ...CLEAN, metaTitle: 'New voyage', settings: { ...CLEAN.settings, distanceUnit: 'mi' },
  });
});

test(`${EDITOR}: starting a new voyage starts a clean session`, () => {
  const fns = pick(editor, ['startNewVoyage'], uiStubs(), { lets: true, prelude: DIRTY_SESSION, expose: SESSION_STATE });
  fns.startNewVoyage();
  assert.deepEqual(fns.session(), CLEAN);
  assert.deepEqual(fns.chapters(), []);
});

test(`${EDITOR}: a country lookup still in flight when the voyage changes writes nothing on return`, async () => {
  let answer;
  const stubs = { ...uiStubs(), geoRequest: () => new Promise(r => { answer = r; }), noteGeocodeUse() {} };
  const fns = pick(editor, ['reverseGeocode', 'resetSession'], stubs, { lets: true, expose: 'counts: () => [geoTotal, geoDone, geoResolved]' });
  const written = [];
  fns.reverseGeocode(10, -25, country => written.push(country));
  fns.resetSession();
  answer({ address: { country: 'Cabo Verde' } });
  await new Promise(r => setImmediate(r));
  assert.deepEqual(written, []);
  assert.deepEqual(fns.counts(), [0, 0, 0], 'progress counts belong to the new session');
});

// ---------------------------------------------------------------------------------------------
// When years
// ---------------------------------------------------------------------------------------------

// A fixed clock, so the year window does not move with the date the tests run on.
class FixedDate extends Date { constructor(...a) { super(...(a.length ? a : ['2026-06-01T12:00:00Z'])); } }
const years = html => [...html.matchAll(/<option value="(\d{4})"/g)].map(m => Number(m[1]));

test(`${EDITOR}: the year dropdowns span the years around the current one`, () => {
  const { yearOptions } = pick(editor, ['yearOptions'], { Date: FixedDate, STATE: { chapters: [] } });
  const y = years(yearOptions(''));
  assert.equal(y[0], 2016);
  assert.equal(y[y.length - 1], 2041);
});

test(`${EDITOR}: the year dropdowns widen to every year the voyage's When fields use`, () => {
  const STATE = { chapters: [{ when: 'Jun 2008 – Aug 2008' }, { when: 'May – Sep 2052' }, { when: '' }] };
  const { yearOptions } = pick(editor, ['yearOptions'], { Date: FixedDate, STATE });
  const html = yearOptions('2008');
  const y = years(html);
  assert.equal(y[0], 2008);
  assert.equal(y[y.length - 1], 2052);
  assert.ok(html.includes('<option value="2008" selected>'), 'the chapter year is selected');
});

// ---------------------------------------------------------------------------------------------
// Lists that contain commas
// ---------------------------------------------------------------------------------------------

for (const tool of [editor, viewer]) {
  test(`${tool.name}: splitList reads semicolon lists, old comma lists and territory names with commas`, () => {
    const { splitList } = pick(tool, ['splitList']);
    assert.deepEqual(splitList('France; Spain'), ['France', 'Spain']);
    assert.deepEqual(splitList('France, Spain'), ['France', 'Spain']);
    assert.deepEqual(splitList('Bonaire, Sint Eustatius and Saba, Curaçao'), ['Bonaire, Sint Eustatius and Saba', 'Curaçao']);
    assert.deepEqual(splitList('Saint Helena, Ascension and Tristan da Cunha'), ['Saint Helena, Ascension and Tristan da Cunha']);
    assert.deepEqual(splitList('Horta, Faial; Lajes, Pico'), ['Horta, Faial', 'Lajes, Pico']);
    assert.deepEqual(splitList('Horta, Faial;'), ['Horta, Faial']);
    assert.deepEqual(splitList(' ; '), []);
    assert.deepEqual(splitList(''), []);
    assert.deepEqual(splitList(null), []);
  });
}

test(`${EDITOR}: joinList writes lists that splitList reads back unchanged`, () => {
  const { joinList, splitList } = pick(editor, ['joinList', 'splitList']);
  assert.equal(joinList(['France', 'Spain']), 'France; Spain');
  assert.equal(joinList(['Horta, Faial']), 'Horta, Faial;');
  assert.equal(joinList(['Horta']), 'Horta');
  assert.equal(joinList([]), '');
  assert.equal(joinList(null), '');
  for (const list of [['France', 'Spain'], ['Horta, Faial'], ['Bonaire, Sint Eustatius and Saba', 'Curaçao'], ['Horta, Faial', 'Pico'], ['Horta']]) {
    assert.deepEqual(splitList(joinList(list)), list);
  }
});

test(`${EDITOR}: a CSV chapter row keeps a territory name that contains commas as one entry`, () => {
  const { normalizeChapter } = pick(editor, ['normalizeChapter']);
  const ch = normalizeChapter({ num: '1', countries: 'Bonaire, Sint Eustatius and Saba', keyDestinations: 'Horta, Faial; Pico' }, { csv: true });
  assert.deepEqual(ch.countriesOverride, ['Bonaire, Sint Eustatius and Saba']);
  assert.deepEqual(ch.keyDestinations, ['Horta, Faial', 'Pico']);
  assert.equal(normalizeChapter({ num: '1', countries: '' }, { csv: true }).countriesOverride, null);
});

test(`${VIEWER}: lists held as text in a hand-edited file split the same way`, () => {
  const { normalizeData } = pick(viewer, ['normalizeData']);
  const data = normalizeData({ chapters: [{ num: 1, countriesOverride: 'Bonaire, Sint Eustatius and Saba, Aruba', keyDestinations: 'Horta, Faial;' }] });
  assert.deepEqual(data.chapters[0].countriesOverride, ['Bonaire, Sint Eustatius and Saba', 'Aruba']);
  assert.deepEqual(data.chapters[0].keyDestinations, ['Horta, Faial']);
});

// ---------------------------------------------------------------------------------------------
// The unsaved marker
// ---------------------------------------------------------------------------------------------

// The rows a CSV export handed the stub writer, read back past the byte-order mark the export adds.
const csvBody = body => (typeof body === 'string' && body.startsWith('\uFEFF') ? JSON.parse(body.slice(1)) : body);
function exportRun(name) {
  const marks = [], files = [];
  const STATE = {
    metaTitle: 'T', settings: { distanceUnit: 'nm' },
    chapters: [{ num: 1, name: 'One', when: '', era: 'future', notes: '', padMultiplier: 1.2, blogUrl: null,
      countriesOverride: ['Bonaire, Sint Eustatius and Saba', 'Curaçao'], keyDestinations: ['Horta, Faial'],
      waypoints: [{ name: 'A', lat: 0, lon: -25, country: '' }, { name: 'B', lat: 1, lon: -25, country: '' }] }],
  };
  const fns = pick(editor, [name], {
    STATE, setDirty: v => marks.push(v), downloadFile: (n, body) => files.push({ n, body: csvBody(body) }),
    closeDropdowns() {}, announce() {}, setTimeout: fn => fn(), Papa: { unparse: o => JSON.stringify(o.data) },
  });
  fns[name]();
  return { marks, files };
}

for (const name of ['exportChaptersCSV', 'exportWaypointsCSV', 'exportCSVs', 'exportKML']) {
  test(`${EDITOR}: ${name} leaves the unsaved marker as it is`, () => {
    const { marks, files } = exportRun(name);
    assert.ok(files.length > 0, 'a file was written');
    assert.deepEqual(marks, []);
  });
}

for (const name of ['exportJSON', 'saveDefault']) {
  test(`${EDITOR}: ${name} clears the unsaved marker`, () => {
    assert.deepEqual(exportRun(name).marks, [false]);
  });
}

test(`${EDITOR}: the chapters CSV writes lists with semicolons`, () => {
  const row = exportRun('exportChaptersCSV').files[0].body[0];
  assert.equal(row.countries, 'Bonaire, Sint Eustatius and Saba; Curaçao');
  assert.equal(row.keyDestinations, 'Horta, Faial;');
});

test(`${EDITOR}: the KML export includes points at 0°`, () => {
  const kml = exportRun('exportKML').files[0].body;
  assert.ok(kml.includes('<Point><coordinates>-25,0,0</coordinates></Point>'), 'placemark at 0°');
  assert.ok(/<coordinates>\n-25,0,0\n-25,1,0\n<\/coordinates>/.test(kml), 'route through 0°');
});

// ---------------------------------------------------------------------------------------------
// Checks added from the release review
// ---------------------------------------------------------------------------------------------

for (const tool of [editor, viewer]) {
  test(`${tool.name}: no coordinate is tested as true or false`, () => {
    // Any `x.lat &&`, `x.lon ||` or `!x.lat` reads 0 as missing; hasCoord or a null check is used instead.
    const hits = tool.js.split('\n').filter(l => /\.(lat|lon)\s*(&&|\|\|)|!\s*\w+\.(lat|lon)\b|parseFloat\([^)]*\)\s*\|\|\s*null/.test(l));
    assert.deepEqual(hits.map(l => l.trim()), []);
  });
}

test(`${EDITOR}: the list fields' help says entries are separated by semicolons`, () => {
  const tips = [...editor.html.matchAll(/<label for="[^"]*">(Countries \/ Territories|Key Destinations) <span class="hi" data-tip="([^"]*)"/g)];
  assert.equal(tips.length, 2);
  tips.forEach(t => {
    assert.ok(/semicolon/.test(t[2]), `${t[1]}: ${t[2]}`);
    assert.ok(!/comma-separated/.test(t[2]), `${t[1]}: ${t[2]}`);
  });
});

test(`${EDITOR}: a coordinate lookup in flight when the voyage changes writes nothing on return`, async () => {
  let answer;
  const stubs = { ...uiStubs(), geoRequest: () => new Promise(r => { answer = r; }), noteGeocodeUse() {},
    updateMapChapter() {}, updateChapterCountries() {}, syncCountryFlag() {} };
  const fns = pick(editor, ['forwardGeocodeWaypoint', 'resetSession'], stubs, {
    lets: true,
    prelude: `STATE.chapters = [{ num: 1, padMultiplier: 1, waypoints: [{ name: 'Horta', lat: null, lon: null, country: '' }] }];`,
    expose: 'wpt: () => STATE.chapters[0].waypoints[0], counts: () => [geoTotal, geoDone, geoResolved]',
  });
  fns.forwardGeocodeWaypoint(1, 0, 'Horta');
  fns.resetSession();
  answer([{ lat: '38.53', lon: '-28.63', address: { country: 'Portugal' } }]);
  await new Promise(r => setImmediate(r));
  assert.deepEqual(fns.wpt(), { name: 'Horta', lat: null, lon: null, country: '' });
  assert.deepEqual(fns.counts(), [0, 0, 0]);
});

test(`${EDITOR}: lookups made after a voyage change still run`, async () => {
  const answers = [];
  const stubs = { ...uiStubs(), geoRequest: () => new Promise(r => answers.push(r)), noteGeocodeUse() {} };
  const fns = pick(editor, ['reverseGeocode', 'resetSession'], stubs, { lets: true });
  const written = [];
  fns.reverseGeocode(10, -25, c => written.push('old ' + c));   // in flight across the reset
  fns.resetSession();
  fns.reverseGeocode(38.5, -28.6, c => written.push('new ' + c));
  assert.equal(answers.length, 2, 'the new lookup was sent without waiting for the old one');
  answers[1]({ address: { country: 'Portugal' } });
  answers[0]({ address: { country: 'Cabo Verde' } });
  await new Promise(r => setImmediate(r));
  assert.deepEqual(written, ['new Portugal']);
  // The status line reports the new session's one lookup, not the old one.
  assert.match(stubs.document.getElementById('status-text').innerHTML, /Found 1 of 1</);
});

test(`${EDITOR}: a voyage file that fails to read leaves the current voyage untouched`, () => {
  const fns = pick(editor, ['loadVoyage'], uiStubs(), { lets: true, prelude: DIRTY_SESSION, expose: SESSION_STATE });
  assert.throws(() => fns.loadVoyage({ chapters: [null] }), /chapter 1 is not a chapter/);
  const s = fns.session();
  assert.equal(s.metaTitle, 'Old voyage');
  assert.equal(s.settings.distanceOverride, 99999);
  assert.equal(s.activeChapterNum, 3);
  assert.equal(fns.chapters()[0].num, 3);
});

test(`${EDITOR}: a voyage change collapses the previous voyage's open chapter panels`, () => {
  const stubs = uiStubs();
  const list = stubs.document.getElementById('chapter-list');
  list.innerHTML = '<div class="ch-meta open" id="ch-meta-1"></div>';
  const fns = pick(editor, ['resetSession'], stubs, { lets: true });
  fns.resetSession();
  assert.equal(list.innerHTML, '');
});

for (const tool of [editor, viewer]) {
  test(`${tool.name}: fileList reads arrays and text, and rejoins territory names split by earlier versions`, () => {
    const { fileList } = pick(tool, ['fileList']);
    assert.deepEqual(fileList(['Bonaire', 'Sint Eustatius and Saba', 'Aruba']), ['Bonaire, Sint Eustatius and Saba', 'Aruba']);
    assert.deepEqual(fileList([' France ', '', null, 'Spain']), ['France', 'Spain']);
    assert.deepEqual(fileList('France, Spain'), ['France', 'Spain']);
    assert.deepEqual(fileList('Horta, Faial; Pico'), ['Horta, Faial', 'Pico']);
    assert.deepEqual(fileList(undefined), []);
    assert.deepEqual(fileList(42), []);
  });

  test(`${tool.name}: commas at the ends of a semicolon entry are dropped`, () => {
    const { splitList } = pick(tool, ['splitList']);
    assert.deepEqual(splitList('Horta, Faial;, Pico'), ['Horta, Faial', 'Pico']);
    assert.deepEqual(splitList('France; Spain,'), ['France', 'Spain']);
  });
}

test(`${EDITOR}: a voyage file's lists are read whether saved as arrays or written as text`, () => {
  const { normalizeChapter } = pick(editor, ['normalizeChapter']);
  const a = normalizeChapter({ num: 1, countriesOverride: ['Bonaire', 'Sint Eustatius and Saba'], keyDestinations: ['Horta'] });
  assert.deepEqual(a.countriesOverride, ['Bonaire, Sint Eustatius and Saba']);
  assert.deepEqual(a.keyDestinations, ['Horta']);
  const t = normalizeChapter({ num: 1, countriesOverride: 'France, Spain', keyDestinations: 'Horta, Faial;' });
  assert.deepEqual(t.countriesOverride, ['France', 'Spain']);
  assert.deepEqual(t.keyDestinations, ['Horta, Faial']);
  const e = normalizeChapter({ num: 1 });
  assert.equal(e.countriesOverride, null);
  assert.deepEqual(e.keyDestinations, []);
});
