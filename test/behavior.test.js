// Editing and reading behavior: the viewer's selection, framing and drawer; the editor's lookups,
// status line, unsaved marker, overrides and list behavior; and empty chapters in the distance chain.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, pick } = require('./support.js');

const editor = loadTool(EDITOR);
const viewer = loadTool(VIEWER);
const tools = [editor, viewer];

const element = (over = {}) => ({ style: {}, textContent: '', innerHTML: '', value: '', dataset: {}, disabled: false,
  classList: { toggle() {}, add() {}, remove() {}, contains: () => false }, focus() {}, querySelector: () => element(), ...over });
const documentStub = () => {
  const els = {};
  return { els, getElementById: id => (els[id] = els[id] || element()), querySelectorAll: () => [], querySelector: () => null };
};

// ---------------------------------------------------------------------------------------------
// Shared: framing, overrides, the distance chain
// ---------------------------------------------------------------------------------------------

// Spherical Mercator, as Leaflet projects at zoom z (256 px tiles).
const mercator = (h = 600, w = 1000) => ({
  getSize: () => ({ x: w, y: h }),
  project: ([lat], z) => { const W = 256 * 2 ** z, r = lat * Math.PI / 180; return { x: 0, y: (1 - Math.log(Math.tan(Math.PI / 4 + r / 2)) / Math.PI) / 2 * W }; },
  unproject: ([, y], z) => { const W = 256 * 2 ** z; return { lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / W))) * 180 / Math.PI }; },
});

for (const tool of tools) {
  test(`${tool.name}: points that all coincide are framed as a single point`, () => {
    const views = [];
    const bounds = pts => {
      const lats = pts.map(p => p[0]), lons = pts.map(p => p[1]);
      return { getNorth: () => Math.max(...lats), getSouth: () => Math.min(...lats), getEast: () => Math.max(...lons), getWest: () => Math.min(...lons),
        getCenter: () => ({ lat: lats[0], lng: lons[0] }) };
    };
    const map = { ...mercator(600), setView: (c, z) => views.push(z), getBoundsZoom: () => 18 };
    const { fitToCoords, FIT_POINT_ZOOM } = pick(tool, ['fitToCoords', 'FIT_POINT_ZOOM'], { map, L: { latLngBounds: bounds } });
    fitToCoords([[36.5, 27.2], [36.5, 27.2]], true);
    assert.deepEqual(views, [FIT_POINT_ZOOM]);
  });

  test(`${tool.name}: a fit at high latitude keeps the chart filled from top to bottom`, () => {
    const views = [];
    const bounds = pts => {
      const lats = pts.map(p => p[0]), lons = pts.map(p => p[1]);
      return { getNorth: () => Math.max(...lats), getSouth: () => Math.min(...lats), getEast: () => Math.max(...lons), getWest: () => Math.min(...lons),
        getCenter: () => ({ lat: (Math.max(...lats) + Math.min(...lats)) / 2, lng: (Math.max(...lons) + Math.min(...lons)) / 2 }) };
    };
    const map = { ...mercator(600, 1000), setView: (c, z) => views.push([c[0], z]), getBoundsZoom: () => 4 };
    const { fitToCoords } = pick(tool, ['fitToCoords'], { map, L: { latLngBounds: bounds } });
    fitToCoords([[82, -60], [84, 60]]);
    const [lat, z] = views[0];
    const top = map.project([lat, 0], z).y - 300;
    assert.ok(top >= -1e-6, `view top ${top} px above the world`);
    assert.ok(lat < 83, String(lat)); // the middle of the span, 83, moved down to fill the chart
  });

  test(`${tool.name}: a pad multiplier below 1 in a file reads as 1.2`, () => {
    const { readVoyage } = pick(tool, ['readVoyage']);
    const v = readVoyage({ chapters: [{ num: 1, padMultiplier: 0.8 }, { num: 2, padMultiplier: 1 }, { num: 3, padMultiplier: '1.05' }] });
    assert.deepEqual(v.chapters.map(c => c.padMultiplier), [1.2, 1, 1.05]);
  });

  test(`${tool.name}: a Nations or Territories override of 0 is applied and marked`, () => {
    const { computeHeroStats } = pick(tool, ['computeHeroStats'], { STATE: { chapters: [] }, DATA: { chapters: [] } });
    const ch = { num: 1, padMultiplier: 1, waypoints: [{ name: 'A', lat: 1, lon: 1, country: 'France' }, { name: 'B', lat: 2, lon: 2, country: 'Réunion' }] };
    const h = computeHeroStats([ch], { nationsOverride: 0, territoriesOverride: null });
    assert.deepEqual([h.nations, h.nationsOverridden, h.territories, h.territoriesOverridden], [0, true, 1, false]);
  });

  test(`${tool.name}: an empty chapter does not break the distance chain`, () => {
    const v = { chapters: [
      { num: 1, padMultiplier: 1, waypoints: [{ name: 'A', lat: 0, lon: 0 }, { name: 'B', lat: 0, lon: 1 }] },
      { num: 2, padMultiplier: 1, waypoints: [] },
      { num: 3, padMultiplier: 1, waypoints: [{ name: 'C', lat: 0, lon: 2 }] },
    ] };
    const { getPredecessorChapter, chapterApproachNm } = pick(tool, ['getPredecessorChapter', 'chapterApproachNm'], { STATE: v, DATA: v });
    assert.equal(getPredecessorChapter(v.chapters[2]).num, 1);
    assert.equal(chapterApproachNm(v.chapters[2]), 60);
    assert.equal(getPredecessorChapter(v.chapters[0]), null);
  });
}

// ---------------------------------------------------------------------------------------------
// Viewer
// ---------------------------------------------------------------------------------------------

test(`${VIEWER}: a selected chapter's dots and shapes are raised above its route and the other chapters`, () => {
  assert.match(viewer.defs.selectChapter, /raiseChapterRoute\(num\);/);
  assert.match(viewer.defs.raiseChapterRoute, /\(polylines\[num\]\|\|\[\]\)\.forEach\(p => p\.bringToFront\(\)\);\s*raiseChapterMarkers\(num\);/);
  assert.match(viewer.js, /routesLayer\.on\('add', \(\) => \{[\s\S]*?if \(activeNum !== null\) raiseChapterRoute\(activeNum\);\s*\}\);/);
  assert.match(viewer.defs.closeInfo, /raiseChapterMarkers\(null\)/);
  const raised = [], z = [];
  const dot = n => ({ bringToFront: () => raised.push(n) });
  const shape = (k, base) => ({ _baseZ: base, setZIndexOffset: v => z.push([k, v]) });
  const { raiseChapterMarkers } = pick(viewer, ['raiseChapterMarkers'], {
    wptMarkers: { 1: [dot(1)], 2: [dot(2)] }, shapeMarkers: { 1: [shape(1, 1000)], 2: [shape(2, 1000), shape(2, 0)] } });
  raiseChapterMarkers(2);
  assert.deepEqual(raised, [2]);
  assert.deepEqual(z, [[1, 1000], [2, 3000], [2, 2000]]);
  z.length = 0;
  raiseChapterMarkers(null);
  assert.deepEqual(z, [[1, 1000], [2, 1000], [2, 0]]);
});

test(`${VIEWER}: selection dims a chapter's Decision and Gateway shapes with its dots`, () => {
  const seen = [];
  const shape = { setOpacity: o => seen.push(o) };
  const { setChapterWptDim } = pick(viewer, ['setChapterWptDim'], { wptMarkers: {}, shapeMarkers: { 2: [shape] } });
  setChapterWptDim(2, true);
  setChapterWptDim(2, false);
  assert.deepEqual(seen, [0.3, 1]);
});

test(`${VIEWER}: a Decision diamond sits above a Gateway star on the same waypoint`, () => {
  assert.match(viewer.defs.loadVoyageData, /shapeIcon\('decision'[^)]*\), zIndexOffset: 1000 \}/);
  assert.match(viewer.defs.loadVoyageData, /shapeMarkers\[ch\.num\]/);
});

test(`${VIEWER}: the drawer closes after a load and after a chapter is picked at 900 px and below`, () => {
  assert.match(viewer.defs.loadVoyageData, /closeDrawer\(\);/);
  assert.match(viewer.defs.loadVoyageData, /window\.innerWidth <= 900\) closeDrawer\(\)/);
});

test(`${VIEWER}: Escape with the chooser open leaves the selection, and a click on empty chart clears it`, () => {
  assert.match(viewer.js, /if \(e\.key !== 'Escape' \|\| !document\.getElementById\('landing'\)\.classList\.contains\('hidden'\)\) return;\s*closeInfo\(\);/);
  assert.match(viewer.js, /map\.on\('click', e => \{[\s\S]*closest\('\.leaflet-interactive'\)\)\) return;[\s\S]*setTimeout\(\(\) => \{ if \(activeNum === selected\) closeInfo\(\); \}, 300\);/);
  // A double-click zooms and keeps the selection.
  assert.match(viewer.js, /map\.on\('dblclick zoomstart', \(\) => clearTimeout\(clearSelectionTimer\)\);/);
});

test(`${VIEWER}: a polar voyage's opening view stays inside the chart`, () => {
  const { chartCenterLat } = pick(viewer, ['chartCenterLat'], { map: mercator(600) });
  const lat = chartCenterLat(85, 2);
  assert.ok(lat > 0 && lat < 75, String(lat));
  assert.ok(Math.abs(chartCenterLat(30, 2) - 30) < 1e-9);
  assert.equal(pick(viewer, ['chartCenterLat'], { map: mercator(1200) }).chartCenterLat(80, 2), 0);
  assert.match(viewer.defs.fitVoyageOnLoad, /map\.setView\(\[chartCenterLat\(focusLatMean, z\), centerLon\], z\)/);
});

// ---------------------------------------------------------------------------------------------
// Editor: the unsaved marker
// ---------------------------------------------------------------------------------------------

// Every function that changes voyage data marks the voyage unsaved itself. The scan finds each
// top-level function that writes to a chapter or waypoint; the ones listed in LOADS replace the whole
// voyage and set the marker as a load does.
const MUTATION = /STATE\.settings\.\w+\s*=[^=]|\bs\.(distanceOverride|nationsOverride|territoriesOverride)\s*=[^=]|STATE\.metaTitle\s*=[^=]|waypoints\.(splice|push|unshift)\(|STATE\.chapters(\.push|\.splice|\s*=[^=])|\b(wpt|w|wptRef|ch)\.(lat|lon|name|country|notes|when|era|padMultiplier|blogUrl|keyDestinations|countriesOverride|major|decision|gateway)\s*=[^=]|\[field\]\s*=[^=]/;
const LOADS = ['orderChapters', 'renumberChapters', 'startNewVoyage', 'installVoyage', 'mergeCSVImport', 'readVoyage', 'resetSession'];

test(`${EDITOR}: every function that changes the voyage marks it unsaved`, () => {
  const writers = Object.entries(editor.defs).filter(([n, src]) => !LOADS.includes(n) && MUTATION.test(src.replace(/\/\/[^\n]*/g, '')));
  assert.ok(writers.length >= 15, `only ${writers.length} writers found`);
  for (const name of ['updateSettings', 'changeDistanceUnit', 'updateMeta', 'addChapter']) assert.ok(writers.some(([n]) => n === name), `${name} is scanned`);
  const unmarked = writers.filter(([, src]) => !src.includes('setDirty(true)')).map(([n]) => n);
  assert.deepEqual(unmarked, []);
});

test(`${EDITOR}: drawing the header stats does not mark the voyage unsaved`, () => {
  assert.ok(!/setDirty/.test(editor.defs.updateHeroStats));
  let marked = 0;
  const doc = documentStub();
  const fns = pick(editor, ['fillChapterCountries'], { document: doc, setDirty: v => { if (v) marked++; } }, { lets: true,
    prelude: `STATE = { chapters: [{ num: 1, name: 'One', padMultiplier: 1, countriesOverride: null, waypoints: [{ name: 'A', lat: 1, lon: 1, country: 'France' }] }],
      settings: { distanceUnit: 'nm' }, metaTitle: '' };` });
  fns.fillChapterCountries(1);
  assert.equal(marked, 0);
});

// ---------------------------------------------------------------------------------------------
// Editor: lookups and the status line
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: a country lookup answered after a chapter delete lands on the waypoint's chapter`, () => {
  const callbacks = [], queried = [], refreshed = [];
  const fns = pick(editor, ['queueChapterCountryLookups'], {
    reverseGeocode: (lat, lon, cb) => callbacks.push(cb), renderGeoStatus() {}, setDirty() {}, syncCountryFlag() {},
    updateChapterCountries: n => refreshed.push(n),
    document: { querySelector: sel => { queried.push(sel); return null; } },
  }, { lets: true, prelude: `STATE = { chapters: [{ num: 1, waypoints: [] }, { num: 2, waypoints: [{ name: 'x', lat: 1, lon: 1, country: '' }, { name: 'y', lat: 1, lon: 2, country: '' }] }], settings: {}, metaTitle: '' };`,
    expose: 'state: () => STATE' });
  const ch2 = fns.state().chapters[1];
  fns.queueChapterCountryLookups(ch2);
  // Chapter 1 is deleted and the chapters renumbered while the answers are on their way.
  fns.state().chapters.shift();
  ch2.num = 1;
  callbacks[1]('Testland');
  assert.deepEqual(queried, ['#wpt-country-1-1']);
  assert.deepEqual(refreshed, [1]);
  assert.equal(ch2.waypoints[1].country, 'Testland');
});

test(`${EDITOR}: a name lookup finds its chapter from the waypoint, and queueing draws the status line once`, () => {
  assert.match(editor.defs.processFwdGeoQueue, /const ch = chapterOf\(wptRef\);/);
  assert.ok(!/getChapter\(chNum\)/.test(editor.defs.processFwdGeoQueue));
  assert.ok(!/renderGeoStatus/.test(editor.defs.reverseGeocode));
  let draws = 0;
  const fns = pick(editor, ['queueChapterCountryLookups'], { reverseGeocode() {}, renderGeoStatus: () => { draws++; } }, { lets: true });
  fns.queueChapterCountryLookups({ num: 1, waypoints: Array.from({ length: 50 }, (_, i) => ({ lat: 1, lon: i, country: '' })) });
  assert.equal(draws, 1);
});

test(`${EDITOR}: a chapter's lookup button is drawn disabled while lookups are pending`, () => {
  assert.match(editor.js, /class="btn btn-sm lookup-btn"\$\{geoPending\(\) > 0 \? ' disabled' : ''\} onclick="fillChapterCountries/);
});

test(`${EDITOR}: the status line follows the active chapter and stays out of a lookup run`, () => {
  const doc = documentStub();
  const fns = pick(editor, ['renderStatus'], { document: doc }, { lets: true,
    prelude: `STATE = { chapters: [{ num: 2, name: 'Two', padMultiplier: 1, waypoints: [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }] }], settings: { distanceUnit: 'nm' }, metaTitle: '' };`,
    expose: `set: (a, q) => { activeChapterNum = a; revGeoQueue = q; }` });
  const el = doc.getElementById('status-text');
  fns.renderStatus();
  assert.equal(el.innerHTML, 'No chapter selected — click a chapter to begin');
  fns.set(2, []);
  fns.renderStatus();
  assert.equal(el.innerHTML, '<span class="status-active">Chapter 2: Two</span> · 2 waypoints · 60 nm');
  fns.set(null, [{}]);
  fns.renderStatus();
  assert.match(el.innerHTML, /Chapter 2: Two/);
  assert.match(editor.defs.updateHeroStats, /renderStatus\(\);/);
});

test(`${EDITOR}: a typed country refreshes the chapter's derived list`, () => {
  const refreshed = [];
  const fns = pick(editor, ['updateWpt'], { setDirty() {}, updateHeroStats() {}, updateChapterCountries: n => refreshed.push(n) }, { lets: true,
    prelude: `STATE = { chapters: [{ num: 1, waypoints: [{ name: 'A', lat: 1, lon: 1, country: '' }] }], settings: {}, metaTitle: '' };` });
  fns.updateWpt(1, 0, 'country', 'Portugal');
  assert.deepEqual(refreshed, [1]);
});

// ---------------------------------------------------------------------------------------------
// Editor: the pull, overrides and the pad multiplier
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: the pull works for every gap the pull button shows`, () => {
  const fns = pick(editor, ['pullFromPrevious'], { setDirty() {}, renderChapterWaypoints() {}, updateMapChapter() {}, updateChapterCountries() {},
    refreshChapterLinks() {}, selectChapter() {} }, { lets: true,
    prelude: `STATE = { chapters: [{ num: 1, waypoints: [{ name: 'A', lat: 0, lon: 0 }] }, { num: 2, waypoints: [{ name: 'B', lat: ${0.7 / 60}, lon: 0 }] }], settings: {}, metaTitle: '' };`,
    expose: 'state: () => STATE' });
  fns.pullFromPrevious(2);
  assert.equal(fns.state().chapters[1].waypoints.length, 2);
  // A gap under half a mile shows the link and the pull does nothing.
  fns.state().chapters[1].waypoints = [{ name: 'C', lat: 0.3 / 60, lon: 0 }];
  fns.pullFromPrevious(2);
  assert.equal(fns.state().chapters[1].waypoints.length, 1);
});

function settingsRun(values, unit = 'nm') {
  const doc = documentStub();
  Object.entries(values).forEach(([id, v]) => { doc.getElementById(id).value = v; });
  doc.querySelector = () => element();
  const fns = pick(editor, ['updateSettings'], { document: doc, updateHeroStats() {}, setDirty() {} }, { lets: true,
    prelude: `STATE = { chapters: [], settings: { distanceOverride: null, nationsOverride: null, territoriesOverride: null, distanceUnit: '${unit}' }, metaTitle: '' };`,
    expose: 'state: () => STATE' });
  fns.updateSettings('distance');
  return { s: fns.state().settings, doc };
}

test(`${EDITOR}: overrides take 0 for the counts, refuse a distance of 0 or less, and keep the typed figure`, () => {
  let r = settingsRun({ 'set-title': '', 'set-nm': '-5', 'set-nations': '0', 'set-territories': 'x' });
  assert.deepEqual([r.s.distanceOverride, r.s.nationsOverride, r.s.territoriesOverride], [null, 0, null]);
  assert.deepEqual([r.doc.getElementById('set-nm').value, r.doc.getElementById('set-nations').value, r.doc.getElementById('set-territories').value], ['', 0, '']);
  r = settingsRun({ 'set-title': '', 'set-nm': '1001', 'set-nations': '', 'set-territories': '3' }, 'km');
  assert.equal(r.s.distanceOverride, 540.497);
  assert.equal(r.doc.getElementById('set-nm').value, 1001);
  const STATE = { metaTitle: '', settings: { distanceUnit: 'nm', nationsOverride: 0, territoriesOverride: null }, chapters: [] };
  const json = JSON.parse(pick(editor, ['buildExportJSON'], { STATE }).buildExportJSON());
  assert.deepEqual(json.meta.settings, { nationsOverride: 0, distanceUnit: 'nm' });
});

test(`${EDITOR}: an override of 0 keeps its header tile, marked`, () => {
  const doc = documentStub();
  const fns = pick(editor, ['updateHeroStats'], { document: doc, renderStatus() {} }, { lets: true,
    prelude: `STATE = { chapters: [{ num: 1, padMultiplier: 1, waypoints: [{ name: 'A', lat: 1, lon: 1, country: 'France' }] }],
      settings: { distanceOverride: null, nationsOverride: 0, territoriesOverride: null, distanceUnit: 'nm' }, metaTitle: '' };` });
  fns.updateHeroStats();
  const html = doc.getElementById('hero-stats').innerHTML;
  assert.match(html, />0 ⚙<\/span><span class="stat-lbl">Nations</);
  assert.ok(!/Territor/.test(html), 'no territory tile without territories or an override');
});

test(`${EDITOR}: a Pad Multiplier below 1 is refused, and a blank one resets to 1.2`, () => {
  const updates = [];
  const doc = documentStub();
  const fns = pick(editor, ['onPadInput'], { document: doc, updateMeta: (n, f, v) => updates.push([n, f, v]) }, { lets: true,
    prelude: `STATE = { chapters: [{ num: 1, padMultiplier: 1.3, waypoints: [] }], settings: {}, metaTitle: '' };` });
  const input = { value: '0.8' };
  fns.onPadInput(input, 1);
  assert.equal(input.value, 1.3);
  assert.equal(doc.getElementById('status-text').textContent, 'Pad Multiplier must be 1 or more.');
  fns.onPadInput({ value: '' }, 1);
  fns.onPadInput({ value: '2' }, 1);
  assert.deepEqual(updates, [[1, 'padMultiplier', 1.2], [1, 'padMultiplier', 2]]);
});

// ---------------------------------------------------------------------------------------------
// Editor: list and search behavior
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: a chapter reorder keeps the chart where it is, and open panels follow their chapter`, () => {
  assert.match(editor.defs.initChapterSortable, /selectChapter\(activeCh\.num, true\)/);
  assert.match(editor.defs.createChapterElement, /div\._chapter = ch;/);
  assert.match(editor.defs.renderAllChapters, /item\._chapter/);
  assert.ok(!/el\.id\.match/.test(editor.defs.renderAllChapters), 'panels are not remembered by number');
});

test(`${EDITOR}: Escape in the place search does not reach the selection`, () => {
  let stopped = 0;
  const doc = documentStub();
  doc.getElementById('search-results').style.display = 'none';
  doc.getElementById('nom-input').value = 'Horta';
  const { nomKeydown } = pick(editor, ['nomKeydown'], { document: doc, hideSearchResults() {} });
  nomKeydown({ key: 'Escape', stopPropagation: () => { stopped++; }, preventDefault() {} });
  assert.equal(stopped, 1);
});

test(`${EDITOR}: focus on a row's delete button does not select that row`, () => {
  const selected = [];
  const fns = pick(editor, ['onWptRowFocus'], { selectWaypoint: (c, i) => selected.push([c, i]) }, { lets: true });
  fns.onWptRowFocus(1, 2, { target: { closest: sel => (sel === '.wpt-del' ? {} : null) } });
  fns.onWptRowFocus(1, 3, { target: { closest: () => null } });
  assert.deepEqual(selected, [[1, 3]]);
});

function searchRun(active) {
  const doc = documentStub();
  const results = doc.getElementById('search-results');
  results._results = [{ lat: '38.53', lon: '-28.63', display_name: 'Horta, Faial', address: { country: 'Portugal' } }];
  doc.getElementById('nom-input').value = 'Horta';
  const selected = [];
  const fns = pick(editor, ['pickSearchResult'], { document: doc, map: { setView() {} }, hideSearchResults() {}, noteFirstEdit() {}, setDirty() {},
    renderChapterWaypoints() {}, updateMapChapter() {}, updateChapterCountries() {}, refreshChapterLinks() {}, selectWaypoint: (c, i) => selected.push([c, i]) },
    { lets: true, prelude: `STATE = { chapters: [{ num: 1, waypoints: [{ name: 'A', lat: 0, lon: 0 }] }], settings: {}, metaTitle: '' }; activeChapterNum = ${active};` });
  fns.pickSearchResult(0);
  return { query: doc.getElementById('nom-input').value, selected };
}

test(`${EDITOR}: a search result added to a chapter is selected, and with no chapter active the query stays`, () => {
  assert.deepEqual(searchRun(1), { query: '', selected: [[1, 1]] });
  assert.deepEqual(searchRun(null), { query: 'Horta', selected: [] });
  assert.match(editor.defs.onGhostDragEnd, /selectWaypoint\(chNum, insertAfter \+ 1, \{ keepFocus: true, keepPanel: true \}\)/);
  assert.match(editor.defs.pickSearchResult, /keepPanel: true/);
  // A collapsed table stays collapsed for these additions.
  let opened = 0;
  const panel = element({ classList: { contains: () => false, add: () => { opened++; }, remove() {}, toggle() {} } });
  const { revealWaypointRow } = pick(editor, ['revealWaypointRow'], {
    document: { getElementById: () => panel, querySelector: () => null, querySelectorAll: () => [] }, initWaypointSortable() {} });
  revealWaypointRow(1, 0, true, true);
  assert.equal(opened, 0);
  revealWaypointRow(1, 0, true, false);
  assert.equal(opened, 1);
});

test(`${EDITOR}: a double-click on a chapter header fits the chart once`, () => {
  assert.match(editor.defs.createChapterElement, /onclick="selectChapter\(\$\{ch\.num\}, event\.detail > 1\)"/);
});

test(`${EDITOR}: Rapid click with no chapter selected says to select one`, () => {
  const doc = documentStub();
  const fns = pick(editor, ['onMapClick'], { document: doc }, { lets: true, prelude: 'rapidClickMode = true; activeChapterNum = null;' });
  fns.onMapClick({ latlng: { lat: 1, lng: 1 } });
  assert.match(doc.getElementById('status-text').innerHTML, /Select a chapter first/);
});
