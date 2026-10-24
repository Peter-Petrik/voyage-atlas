// Fixes from the blind review of v3.9.13: editor editing, loading and import, chart framing, look
// and contrast, and wording. Each test fails on v3.9.13.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, pick } = require('./support.js');

const editor = loadTool(EDITOR);
const viewer = loadTool(VIEWER);
const tools = [editor, viewer];
const styleOf = tool => (tool.html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
const wpt = (name, lat, lon, over = {}) => ({ name, lat, lon, major: false, decision: false, gateway: false, country: '', notes: '', ...over });

// A point with the parts of Leaflet's Point the editor uses.
const pt = (x, y) => ({ x, y, subtract: o => pt(x - o.x, y - o.y), distanceTo: o => Math.hypot(x - o.x, y - o.y) });

// ---------------------------------------------------------------------------------------------
// Editor editing
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: every visible marker is raised above every click area and ghost, and the active chapter stays on top`, () => {
  const order = [];
  const layer = name => ({ bringToFront: () => order.push(name) });
  const hit = name => Object.assign(layer(name), { _hit: true });
  const mapLayers = { 2: { line: { eachLayer: cb => [layer('route')].forEach(cb) }, ghosts: [layer('ghost')],
    markers: [hit('hit1'), layer('dot1'), hit('hit2'), layer('dot2')] } };
  pick(editor, ['raiseChapterLayers'], { mapLayers }).raiseChapterLayers(2);
  assert.deepEqual(order, ['route', 'hit1', 'hit2', 'ghost', 'dot1', 'dot2']);
  assert.match(editor.defs.updateMapChapter, /raiseChapterLayers\(chNum\);\s*[\s\S]*if \(chNum !== activeChapterNum && activeChapterNum !== null\) raiseChapterLayers\(activeChapterNum\);\s*\}$/);
  assert.match(editor.defs.updateMapChapter, /hitMarker\._hit = true;/);
});

test(`${EDITOR}: a drag below the tolerance changes nothing, and above it moves the point by the pointer's travel`, () => {
  const ch = { num: 1, waypoints: [wpt('A', 40, 14)] };
  const marks = [];
  // Leaflet reports a small dot's own center as containerPoint, so the pointer comes from the mouse event.
  const ev = (x, y) => ({ containerPoint: pt(150, 400), latlng: { lat: 40, lng: 15 }, originalEvent: { clientX: x, clientY: y } });
  const make = () => pick(editor, ['onMarkerDrag', 'pointerPoint'], {
    getChapter: () => ch, setDirty: v => marks.push(v), updateMapChapter() {}, document: { querySelector: () => null },
    map: { containerPointToLatLng: p => ({ lat: p.y / 10, lng: p.x / 10 }), mouseEventToContainerPoint: o => pt(o.clientX, o.clientY) }, PT: pt,
  }, { lets: true, prelude: 'dragMarkerLink = { chNum: 1, wptIdx: 0, press: PT(160, 400), grab: PT(10, 0) };', expose: 'moved: () => markerDidMove' });
  const fns = make();
  fns.onMarkerDrag(ev(161, 401));
  assert.deepEqual([ch.waypoints[0].lat, ch.waypoints[0].lon, fns.moved(), marks], [40, 14, false, []]);
  fns.onMarkerDrag(ev(170, 400));
  // The marker was grabbed 10 px right of its center, so it is drawn 10 px left of the pointer.
  assert.deepEqual([ch.waypoints[0].lat, ch.waypoints[0].lon, fns.moved(), marks], [40, 16, true, [true]]);
  // A touch event without clientX falls back to Leaflet's containerPoint.
  const p = fns.pointerPoint({ containerPoint: pt(5, 6), originalEvent: {} }); assert.deepEqual([p.x, p.y], [5, 6]);
  assert.match(editor.defs.updateMapChapter, /const press = pointerPoint\(e\);\s*dragMarkerLink = \{ chNum: chNum, wptIdx: idx, press: press, grab: press\.subtract\(map\.latLngToContainerPoint\(m\.getLatLng\(\)\)\) \};/);
});

test(`${EDITOR}: a right or middle click on a ghost midpoint inserts nothing`, () => {
  assert.match(editor.defs.updateMapChapter, /ghost\.on\('mousedown', function\(e\) \{\s*L\.DomEvent\.stopPropagation\(e\);\s*if \(e\.originalEvent && e\.originalEvent\.button > 0\) return;/);
});

test(`${EDITOR}: a country answer keeps a country typed meanwhile and skips a waypoint that has moved`, () => {
  const ch = { num: 1, waypoints: [wpt('A', 30, 10), wpt('B', 31, 11), wpt('C', 32, 12)] };
  const callbacks = [];
  pick(editor, ['queueChapterCountryLookups'], {
    reverseGeocode: (lat, lon, cb) => callbacks.push(cb), chapterOf: () => ch, renderGeoStatus() {}, setDirty() {},
    document: { querySelector: () => null }, syncCountryFlag() {}, updateChapterCountries() {},
  }).queueChapterCountryLookups(ch);
  ch.waypoints[0].country = 'Typed';
  ch.waypoints[1].lat = 35;
  callbacks.forEach(cb => cb('Answer'));
  assert.deepEqual(ch.waypoints.map(w => w.country), ['Typed', '', 'Answer']);
});

test(`${EDITOR}: a name answer is dropped when the name has changed since the lookup`, () => {
  assert.match(editor.defs.processFwdGeoQueue, /if \(\(w\.name \|\| ''\)\.trim\(\) !== name\.trim\(\)\) return;/);
});

function settingsRun(values, field, unit = 'nm', override = null) {
  const els = {};
  const doc = { getElementById: id => (els[id] = els[id] || { value: '' }), querySelector: () => ({}) };
  Object.entries(values).forEach(([id, v]) => { doc.getElementById(id).value = v; });
  const fns = pick(editor, ['updateSettings'], { document: doc, updateHeroStats() {}, setDirty() {} }, { lets: true,
    prelude: `STATE = { chapters: [], settings: { distanceOverride: ${override}, nationsOverride: null, territoriesOverride: null, distanceUnit: '${unit}' }, metaTitle: '' };`,
    expose: 'state: () => STATE' });
  fns.updateSettings(field);
  return fns.state().settings;
}

test(`${EDITOR}: a change to the title or a count leaves the Distance Override as stored`, () => {
  // 1000.4 nm shows as 1000; 1000 nm shows as 1151 mi.
  assert.equal(settingsRun({ 'set-title': 'T', 'set-nm': '1000', 'set-nations': '', 'set-territories': '' }, undefined, 'nm', 1000.4).distanceOverride, 1000.4);
  assert.equal(settingsRun({ 'set-title': '', 'set-nm': '1151', 'set-nations': '3', 'set-territories': '' }, undefined, 'mi', 1000).distanceOverride, 1000);
  assert.equal(settingsRun({ 'set-title': '', 'set-nm': '1200', 'set-nations': '', 'set-territories': '' }, 'distance', 'nm', 1000).distanceOverride, 1200);
  assert.match(editor.html, /id="set-nm" value="" placeholder="AUTO:" onchange="updateSettings\('distance'\)"/);
});

test(`${EDITOR}: a click on the selected waypoint's own chapter keeps the selection; another chapter clears it`, () => {
  const sel = { name: 'X' };
  const fns = pick(editor, ['selectChapter'], {
    document: { querySelectorAll: () => [] }, updateMapAll() {}, focusMapOnChapter() {}, renderStatus() {}, SEL: sel,
  }, { lets: true, prelude: 'activeChapterNum = 2; selectedChapterNum = 2; selectedWpt = SEL;', expose: 'sel: () => [selectedChapterNum, selectedWpt]' });
  fns.selectChapter(2, true);
  assert.deepEqual(fns.sel(), [2, sel]);
  fns.selectChapter(3, true);
  assert.deepEqual(fns.sel(), [null, null]);
  assert.match(editor.defs.initChapterSortable, /const selCh = selectedChapterNum !== null \? getChapter\(selectedChapterNum\) : null;[\s\S]*renumberChapters\(\);\s*if \(selCh\) selectedChapterNum = selCh\.num;/);
});

test(`${EDITOR}: a chapter with no coordinates shows no connection indicator`, () => {
  const STATE = { chapters: [{ num: 1, padMultiplier: 1, waypoints: [wpt('A', 36, 28)] }, { num: 2, padMultiplier: 1, waypoints: [] },
    { num: 3, padMultiplier: 1, waypoints: [wpt('B', null, null)] }], settings: { distanceUnit: 'nm' } };
  const { chapterSyncHTML } = pick(editor, ['chapterSyncHTML'], { STATE });
  assert.equal(chapterSyncHTML(STATE.chapters[1]), '');
  assert.equal(chapterSyncHTML(STATE.chapters[2]), '');
});

test(`${EDITOR}: a typed longitude that is wrapped into range is noted in the status line`, () => {
  const status = { textContent: 'before', dataset: {} };
  const input = { value: '370.3', defaultValue: '' };
  const seen = [];
  pick(editor, ['onCoordInput'], { document: { getElementById: () => status }, updateWpt: (c, i, f, v) => seen.push(v) })
    .onCoordInput(input, 1, 0, 'lon');
  assert.deepEqual(seen, [10.3]);
  assert.equal(status.textContent, 'Longitude 370.3 read as 10.3: longitudes run from -180 to 180.');
});

// ---------------------------------------------------------------------------------------------
// Loading and import
// ---------------------------------------------------------------------------------------------

for (const tool of tools) {
  test(`${tool.name}: longitudes are never brought to exactly 180, and numbers from a file read whole`, () => {
    const { normLon, toChapterNum, normalizeSettings, readVoyage } = pick(tool, ['normLon', 'toChapterNum', 'normalizeSettings', 'readVoyage']);
    assert.equal(normLon(-180.0000000001), -180);
    assert.equal(normLon(539.9999999999), -180);
    assert.equal(normLon(200), -160);
    assert.equal(toChapterNum('3abc'), 0);
    assert.equal(toChapterNum('4'), 4);
    assert.equal(toChapterNum(2.5), 0);
    const s = normalizeSettings({ distanceOverride: '12abc', nationsOverride: '3abc', territoriesOverride: '0x10', distanceUnit: 'KM' });
    assert.deepEqual(s, { distanceOverride: null, nationsOverride: null, territoriesOverride: null, distanceUnit: 'km' });
    const v = readVoyage({ chapters: [{ num: 1, padMultiplier: '1,5', waypoints: [{ lat: '-9,1', lon: 10 }, { lat: 'NaN', lon: 'x' }, { lat: 40, lon: '' }, { lat: null, lon: 12 }] }] });
    assert.equal(v.unreadableNumbers, 4);
  });

  test(`${tool.name}: a voyage file saved in Windows-1252 is read as such`, () => {
    const { decodeText } = pick(tool, ['decodeText']);
    assert.deepEqual(decodeText(new Uint8Array([0x52, 0xE9, 0x75, 0x6E, 0x69, 0x6F, 0x6E]).buffer), { text: 'Réunion', legacy: true });
    assert.deepEqual(decodeText(new TextEncoder().encode('Réunion').buffer), { text: 'Réunion', legacy: false });
  });
}

test('both tools read a voyage file through the shared decoder', () => {
  assert.match(editor.defs.handleJSONFile, /decodeText\(ev\.target\.result\)[\s\S]*readAsArrayBuffer\(file\)/);
  assert.match(viewer.defs.handleFile, /decodeText\(ev\.target\.result\)\.text[\s\S]*readAsArrayBuffer\(file\)/);
  for (const tool of tools) assert.match(tool.js, /return r\.arrayBuffer\(\);/);
  assert.match(editor.defs.loadVoyage, /if \(v\.unreadableNumbers\) notes\.push\(unreadableNote\(v\.unreadableNumbers\)\);/);
  assert.match(editor.defs.loadVoyage, /if \(opts\.legacy\) notes\.push\('text read as Windows-1252'\);/);
});

test(`${EDITOR}: CSV rows with more cells than the header are skipped and counted`, () => {
  const Papa = { parse: () => ({ data: [{ chapter: '1', lat: '38', lon: '53', __parsed_extra: ['-9', '15'] }, { chapter: '1', lat: '38.5', lon: '-9' }], meta: { fields: ['chapter', 'lat', 'lon'] } }) };
  const csv = pick(editor, ['readCSV'], { Papa }).readCSV(new Uint8Array([120]).buffer, ['lat', 'lon']);
  assert.equal(csv.rows.length, 1);
  assert.equal(csv.rows[0].lat, '38.5');
  assert.equal(csv.extra, 1);
  // A chapter row with more cells keeps its number and name, so the chapter and its waypoints still load.
  const Papa2 = { parse: () => ({ data: [{ num: '1', name: 'A', when: 'Jun', notes: 'x', __parsed_extra: ['y'] }, { num: '2', name: 'B' }], meta: { fields: ['num', 'name', 'when', 'notes'] } }) };
  const ch = pick(editor, ['readCSV'], { Papa: Papa2 }).readCSV(new Uint8Array([120]).buffer, ['padMultiplier'], ['num', 'name']);
  assert.deepEqual(ch.rows, [{ num: '1', name: 'A' }, { num: '2', name: 'B' }]);
  assert.deepEqual([ch.extra, ch.trimmed], [0, 1]);
  assert.match(editor.js, /const csv = readCSV\(ev\.target\.result, \['padMultiplier'\], \['num', 'name'\]\);/);
  assert.match(editor.js, /extra: csv\.extra, trimmed: chapters\.trimmed \}\);/);
});

test(`${EDITOR}: CSV chapters without a number are kept after the chapter before them, and counted`, () => {
  let installed = null;
  const { mergeCSVImport } = pick(editor, ['mergeCSVImport'], { installVoyage: (v, notes) => { installed = { v, notes }; }, announce() {}, alert() {} });
  mergeCSVImport([{ num: '1', name: 'A' }, { num: '', name: 'B' }, { num: 'x', name: 'C' }, { num: '2', name: 'D' }],
    [{ chapter: '2', name: 'p', lat: '1', lon: '2' }], { extra: 2, trimmed: 1 });
  assert.deepEqual(installed.v.chapters.map(c => [c.num, c.name]), [[1, 'A'], [2, 'B'], [3, 'C'], [4, 'D']]);
  assert.equal(installed.v.chapters[3].waypoints.length, 1);
  assert.ok(installed.notes.includes('2 chapters without a number placed after the one before'), installed.notes.join(' | '));
  assert.ok(installed.notes.includes('2 waypoint rows with more cells than the header skipped'), installed.notes.join(' | '));
  assert.ok(installed.notes.includes('1 chapter row with more cells than the header: only the number and name read'), installed.notes.join(' | '));
});

test(`${EDITOR}: the CSV exports write their header row even with no rows`, () => {
  const seen = [];
  const STATE = { chapters: [{ num: 1, name: 'A', when: '', era: 'future', notes: '', padMultiplier: 1.2, countriesOverride: null, keyDestinations: [], waypoints: [] }] };
  const fns = pick(editor, ['exportChaptersCSV', 'exportWaypointsCSV'], { STATE, closeDropdowns() {}, downloadFile() {}, Papa: { unparse: o => { seen.push(o); return ''; } } });
  fns.exportWaypointsCSV();
  fns.exportChaptersCSV();
  assert.deepEqual(seen[0].fields, ['chapter', 'order', 'name', 'lat', 'lon', 'major', 'decision', 'gateway', 'country', 'notes']);
  assert.deepEqual(seen[0].data, []);
  assert.deepEqual(seen[1].fields, Object.keys(seen[1].data[0]));
});

test(`${EDITOR}: KML coordinates are written in plain decimals`, () => {
  const { kmlNum } = pick(editor, ['kmlNum']);
  assert.deepEqual([1e-7, 5e-324, -25, 0, -0, 36.12345, 100.5, -179.999999999].map(kmlNum),
    ['0.0000001', '0', '-25', '0', '0', '36.12345', '100.5', '-179.999999999']);
  // Both the route lines and the waypoint points are written through it.
  assert.match(editor.defs.exportKML, /pts\.map\(w => `\$\{kmlNum\(w\.lon\)\},\$\{kmlNum\(w\.lat\)\},0`\)/);
  assert.match(editor.defs.exportKML, /<Point><coordinates>\$\{kmlNum\(w\.lon\)\},\$\{kmlNum\(w\.lat\)\},0<\/coordinates><\/Point>/);
});

// ---------------------------------------------------------------------------------------------
// Chart framing
// ---------------------------------------------------------------------------------------------

const mercator = (h, w) => ({
  getSize: () => ({ x: w, y: h }),
  project: ([lat], z) => { const W = 256 * 2 ** z, r = lat * Math.PI / 180; return { x: 0, y: (1 - Math.log(Math.tan(Math.PI / 4 + r / 2)) / Math.PI) / 2 * W }; },
  unproject: ([, y], z) => { const W = 256 * 2 ** z; return { lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / W))) * 180 / Math.PI }; },
});
const boundsOf = pts => {
  const lats = pts.map(p => p[0]), lons = pts.map(p => p[1]);
  return { getNorth: () => Math.max(...lats), getSouth: () => Math.min(...lats), getEast: () => Math.max(...lons), getWest: () => Math.min(...lons),
    getCenter: () => ({ lat: (Math.max(...lats) + Math.min(...lats)) / 2, lng: (Math.max(...lons) + Math.min(...lons)) / 2 }) };
};

for (const tool of tools) {
  test(`${tool.name}: a tall set of points is centered on its middle as the chart draws it, not its mean latitude`, () => {
    const views = [];
    const map = { ...mercator(1300, 1440), setView: (c, z) => views.push([c[0], z]), getBoundsZoom: () => 4 };
    pick(tool, ['fitToCoords'], { map, L: { latLngBounds: boundsOf } }).fitToCoords([[36, -5], [78, 15]]);
    const [lat, z] = views[0];
    const y = l => map.project([l, 0], z).y;
    assert.ok(Math.abs(y(lat) - (y(36) + y(78)) / 2) < 1e-6, `${lat}`);
    assert.ok(lat > 60, `${lat} should sit well north of the mean, 57`);
  });
}

test(`${VIEWER}: a voyage too wide for the zoom that fills a phone's chart opens on its current chapter`, () => {
  let fitAll = 0;
  const views = [];
  const map = { ...mercator(743, 390), setView: (c, z) => views.push(z), getBoundsZoom: () => 1 };
  pick(viewer, ['fitVoyageOnLoad'], { map, L: { latLngBounds: boundsOf }, window: { innerWidth: 390 }, fitToCoords: () => { fitAll++; },
    chartInsets: () => null, pointInView: () => true })
    .fitVoyageOnLoad([{ num: 1, era: 'current', waypoints: [wpt('a', 37, 25), wpt('b', 39, 20)] },
                      { num: 2, era: 'future', waypoints: [wpt('c', 36, -6), wpt('d', -9, -140)] }]);
  assert.equal(fitAll, 0, 'the whole-voyage fit was not used');
  assert.deepEqual(views, [2]);
});

test(`${VIEWER}: a zone across the dateline is drawn across it, and the dots come back above the routes`, () => {
  assert.match(viewer.defs.loadVoyageData, /const e = e0 < w \? e0 \+ 360 : e0;/);
  assert.match(viewer.js, /routesLayer\.on\('add', \(\) => \{\s*wptsLayer\.eachLayer\(m => m\.bringToFront && m\.bringToFront\(\)\);\s*if \(activeNum !== null\) raiseChapterRoute\(activeNum\);\s*\}\);/);
});

test(`${VIEWER}: on a short screen Chart & Layers starts collapsed, and the detail panel stays below it`, () => {
  assert.match(viewer.js, /window\.matchMedia\('\(max-width: 640px\), \(max-height: 560px\)'\)\.matches/);
  const css = styleOf(viewer);
  assert.match(css, /#filter \{[^}]*z-index: 1001; \}/);
  assert.match(css, /#info \{[^}]*max-height: min\(60vh, calc\(100% - 220px\)\);/);
  assert.match(css, /@media \(min-width: 641px\) and \(max-height: 560px\) \{\s*#info \{ max-height: calc\(100% - 100px\); \}/);
  // A phone held sideways: the sheet stops below the collapsed bar (74 px down, about 40 px tall).
  assert.match(css, /@media \(max-width: 640px\) and \(max-height: 560px\) \{\s*#info \{ max-height: min\(calc\(100% - 136px\), 96px\); \}/);
  assert.match(css, /@media \(max-width: 640px\) \{\s*#filter \{ top: 74px;/);
});

// ---------------------------------------------------------------------------------------------
// Look and contrast
// ---------------------------------------------------------------------------------------------

test('waypoint dots are outlined in the ink color at the casing opacity in both tools', () => {
  assert.match(viewer.defs.loadVoyageData, /color: ink,\s*opacity: CASING_OPACITY,/);
  assert.match(viewer.defs.refreshMarkerStrokes, /wptsLayer\.eachLayer\(l => l\.setStyle && l\.setStyle\(\{ color: ink \}\)\)/);
  assert.match(editor.defs.updateMapChapter, /let strokeColor = isActive \? ink : color;\s*let cOpacity = isActive \? CASING_OPACITY : opacity/);
  const styled = [];
  pick(viewer, ['setChapterWptDim'], { wptMarkers: { 1: [{ _baseFill: 0.8, setStyle: s => styled.push(s) }] }, shapeMarkers: {} }).setChapterWptDim(1, false);
  assert.deepEqual(styled, [{ opacity: 0.6, fillOpacity: 0.8 }]);
});

test(`${VIEWER}: past and routeless rows are dimmed by color, and the badge is 9 px`, () => {
  const css = styleOf(viewer);
  assert.ok(!/\.(leg|dr)-row\.(past|no-geo)[^{]*\{[^}]*opacity/.test(css.replace(/\.(leg|dr)-row\.(past|no-geo) \.(leg|dr)-sw[^{]*\{[^}]*\}/g, '')), 'no row is dimmed with opacity');
  assert.match(css, /\.leg-row\.past \.leg-name, \.leg-row\.no-geo \.leg-name \{ color: var\(--muted\); \}/);
  assert.match(css, /\.dr-row\.past \.dr-name, \.dr-row\.no-geo \.dr-name \{ color: var\(--muted\); \}/);
  assert.match(css, /\.dr-badge \{ font-size: 9px;/);
  assert.match(css, /\.leg-row\.past \.leg-sw, \.leg-row\.no-geo \.leg-sw \{ opacity: 0\.55; \}/);
  assert.match(css, /\.dr-row\.past \.dr-sw, \.dr-row\.no-geo \.dr-sw \{ opacity: 0\.55; \}/);
});

test('the header has the same structure in both tools: titles, stats, then actions ending in the theme button', () => {
  const shape = tool => {
    const h = tool.html.match(/<div id="header">([\s\S]*?)\n<\/div>/)[1];
    const actions = h.match(/<div class="head-actions">([\s\S]*?)\n  <\/div>/)[1];
    return { stats: /<div id="hero-stats" class="head-stats"><\/div>/.test(h),
      order: [...h.matchAll(/class="(head-titles|head-stats|head-actions)"/g)].map(m => m[1]),
      lastAction: /<button id="theme-btn" class="theme-btn"[^>]*>◐<\/button>\s*$/.test(actions) };
  };
  assert.deepEqual(shape(editor), { stats: true, order: ['head-titles', 'head-stats', 'head-actions'], lastAction: true });
  assert.deepEqual(shape(viewer), shape(editor));
  const fade = tool => (styleOf(tool).match(/html, body \{[^}]*transition: ([^;]*);/) || [])[1];
  assert.equal(fade(viewer), fade(editor));
});

const tokens = tool => {
  const css = styleOf(tool);
  const read = sel => Object.fromEntries([...css.matchAll(new RegExp(`(?:^|\\n)\\s*${sel} \\{([^}]*)\\}`, 'g'))]
    .flatMap(m => [...m[1].matchAll(/--([\w-]+):\s*([^;]+);/g)].map(t => [t[1], t[2].trim()])));
  const light = read(':root');
  return { light, dark: { ...light, ...read('body\\.dark') } };
};
const rgb = h => [0, 2, 4].map(i => parseInt(h.slice(1 + i, 3 + i), 16) / 255);
const lum = c => { const [r, g, b] = c.map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('the popup close button and the advisory "!" meet the contrast minimum; form fields have a visible border', () => {
  const leaflet = styleOf(viewer).match(/shared:leaflet[\s\S]*?end shared:leaflet/)[0];
  assert.match(leaflet, /\.leaflet-container a\.leaflet-popup-close-button \{ color: var\(--muted\); \}/);
  assert.match(styleOf(viewer), /\.adv-icon \{[^}]*background: var\(--advisory-ink\); color: var\(--panel-solid\);/);
  assert.match(styleOf(editor), /\.meta-field input, \.meta-field select, \.meta-field textarea \{[^}]*border: 1px solid var\(--faint\);/);
  for (const [name, t] of Object.entries(tokens(viewer))) {
    assert.ok(ratio(t['panel-solid'], t['advisory-ink']) >= 4.5, `${name}: the "!"`);
    assert.ok(ratio(t.muted, t['panel-solid']) >= 4.5, `${name}: the popup ×`);
    assert.ok(ratio(t.faint, t.bg) >= 3, `${name}: a field's border`);
  }
  // The When selects carry their style inline, so they name the same border.
  const when = editor.defs.renderMetaForm.match(/<select id="when-(sm|sy|em|ey)-[^>]*>/g);
  assert.equal(when.length, 4);
  for (const s of when) assert.match(s, /border:1px solid var\(--faint\);/);
});

test(`${EDITOR}: the chapter form fits a narrow panel, and the Country field is wider`, () => {
  assert.match(styleOf(editor), /\.meta-grid \{\s*display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);/);
  assert.match(styleOf(editor), /\.meta-field input, \.meta-field select, \.meta-field textarea \{\s*font-family: inherit; font-size: 11px; min-width: 0;/);
  assert.match(styleOf(editor), /\.wpt-table td\.col-country input \{ min-width: 110px; \}/);
});

test(`${VIEWER}: on a phone the drawer's stats sit in two columns and the attribution stays above the detail sheet`, () => {
  assert.match(styleOf(viewer), /#drawer-overflow \.dr-of-stats \{[^}]*display: grid; grid-template-columns: 1fr 1fr;/);
  assert.match(styleOf(viewer), /top: auto; bottom: 18px; left: 0; right: 0; width: auto;/);
});

// ---------------------------------------------------------------------------------------------
// Wording and the behavior behind it
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: the When field keeps what the lists cannot show, and a season never ends without a year`, () => {
  const { parseWhen } = pick(editor, ['parseWhen']);
  assert.equal(parseWhen('Jun 1850 – Aug 1850').readable, false);
  assert.equal(parseWhen('Jun 2025 – Aug 2025').readable, true);
  const r = parseWhen('Jun – Jun 2025');
  assert.deepEqual([r.sm, r.sy, r.em, r.ey], ['Jun', '2024', 'Jun', '2025']);
  const els = { 'when-sm-1': { value: 'Nov' }, 'when-sy-1': { value: '2025' }, 'when-em-1': { value: 'Mar' }, 'when-ey-1': { value: '' } };
  els['when-ey-1'] = { _v: '', get value() { return this._v; }, set value(v) { this._v = ['2025', '2026'].includes(v) ? v : ''; } };
  const saved = [];
  pick(editor, ['onWhenChange'], { document: { getElementById: id => els[id] || null }, updateMeta: (c, f, v) => saved.push(v) }).onWhenChange(1);
  assert.deepEqual(saved, ['Nov 2025 – Mar 2026']);
});

test(`${EDITOR}: a paste's corrections note joins the lookup summary instead of being overwritten`, () => {
  assert.match(editor.defs.doPaste, /if \(note && geoPending\(\) > 0\) geoNote = note;/);
  const statusEl = { innerHTML: '' };
  pick(editor, ['renderGeoStatus'], { document: { getElementById: () => statusEl, querySelectorAll: () => [] }, geoPending: () => 0 },
    { lets: true, prelude: "geoTotal = 2; geoDone = 2; geoResolved = 2; geoNote = 'Pasted with corrections: 1 number that could not be read left unset';" })
    .renderGeoStatus();
  assert.match(statusEl.innerHTML, /Found 2 of 2<\/span> · Pasted with corrections: 1 number that could not be read left unset$/);
  // A new voyage starts without the last paste's note.
  assert.match(editor.defs.resetSession, /geoTotal = 0; geoDone = 0; geoResolved = 0;\s*geoNote = '';/);
  assert.equal(pick(editor, ['unreadableNote']).unreadableNote(2), '2 numbers that could not be read left unset');
});

test(`${EDITOR}: a sample voyage file read as Windows-1252 says so when it is loaded`, () => {
  assert.match(editor.js, /decoded = decodeText\(buffer\); parsed = JSON\.parse\(decoded\.text\); readVoyage\(parsed\);[\s\S]*?sampleLegacy = decoded\.legacy;/);
  let opts = null;
  pick(editor, ['loadSampleFromChooser'], { closeDropdowns() {}, guardDirty: f => f(), loadVoyage: (v, o) => { opts = o; }, hideLanding() {} },
    { lets: true, prelude: 'sampleVoyage = { chapters: [] }; sampleLegacy = true;' }).loadSampleFromChooser();
  assert.deepEqual(opts, { legacy: true });
});

test(`${EDITOR}: the status line with no chapters asks for a chapter`, () => {
  const run = chapters => pick(editor, ['idleStatus'], { STATE: { chapters } }).idleStatus();
  assert.equal(run([]), 'No chapters yet — add a chapter to begin');
  assert.equal(run([{}]), 'No chapter selected — click a chapter to begin');
  assert.match(editor.defs.renderStatus, /`<span class="status-active">Chapter \$\{ch\.num\}: /);
});

test('the chooser reads the same in both tools, and errors, quotes and chapter references are consistent', () => {
  for (const tool of tools) {
    assert.match(tool.html, /<h2>Voyage Atlas<\/h2>/);
    assert.match(tool.html, /<span class="lb-desc">Open a saved voyage, or one shared by someone else\.<\/span>/);
    assert.ok(!/Voyage Atlas JSON/.test(tool.html), `${tool.name}: errors say "file"`);
  }
  assert.ok(!/\bCh \$\{/.test(editor.js.replace(/<Folder><name>Ch \$\{ch\.num\}/, '').replace(/`Ch \$\{ch\.num\} — \$\{ch\.name\}`/, '')), 'chapter references say "chapter"');
  assert.match(editor.defs.confirmDeleteWaypoint, /`Delete “\$\{name\}” from chapter \$\{chNum\}\? This cannot be undone\.`/);
  assert.match(editor.html, /placeholder="\(defaults to “Voyage Atlas”\)"/);
  assert.match(editor.html, /Optional extra columns, in this order: major, decision, gateway, country, notes \(the table shows Gateway before Decision\)\./);
  assert.ok(!/Drives timeline ordering|summary displays/.test(editor.html));
});

test('a Blog URL typed without a scheme gets https://, and the viewer links only a full http(s) address', () => {
  const { blogAddress } = pick(editor, ['blogAddress']);
  assert.equal(blogAddress('www.example.com/blog'), 'https://www.example.com/blog');
  assert.equal(blogAddress(' https://example.com/x '), 'https://example.com/x');
  assert.equal(blogAddress('notes about it'), 'notes about it');
  assert.equal(blogAddress(''), '');
  // A port after the host is not a scheme.
  assert.equal(blogAddress('www.example.com:8080/blog'), 'https://www.example.com:8080/blog');
  assert.equal(blogAddress('mailto:x@example.com'), 'mailto:x@example.com');
  assert.match(editor.defs.renderMetaForm, /onchange="this\.value=blogAddress\(this\.value\);updateMeta\(\$\{ch\.num\},'blogUrl',this\.value\|\|null\)"/);
  const { safeHttpUrl } = pick(viewer, ['safeHttpUrl'], { location: { href: 'https://example.org/viewer/' } });
  assert.equal(safeHttpUrl('www.example.com/blog'), '');
  assert.equal(safeHttpUrl('/blog'), '');
  assert.equal(safeHttpUrl('https://example.com/x'), 'https://example.com/x');
});

test(`${EDITOR}: every label is tied to its field`, () => {
  const ids = new Set([...editor.html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  const labels = [...editor.html.matchAll(/<label\b([^>]*)>/g)].map(m => m[1]);
  assert.ok(labels.length >= 14, String(labels.length));
  for (const attrs of labels) {
    const f = (attrs.match(/for="([^"]+)"/) || [])[1];
    assert.ok(f, `a label without for: <label${attrs}>`);
    assert.ok(ids.has(f), `no field with id ${f}`);
  }
});
