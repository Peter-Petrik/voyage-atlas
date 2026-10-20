// Editor and viewer behavior fixed in v3.9.8: the chapter connection indicator built in one place
// and refreshed without rebuilding the list, a selection that follows its waypoint, the bulk-add
// limit, the KML route color, the first-edit signal, and one shadow value for both tools.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, pick } = require('./support.js');

const editor = loadTool(EDITOR);
const viewer = loadTool(VIEWER);

const wpt = (name, lat, lon) => ({ name, lat, lon, major: false, decision: false, gateway: false, country: '', notes: '' });

// ---------------------------------------------------------------------------------------------
// The connection indicator
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: chapterSyncHTML shows a link, a pull button, or nothing for the first chapter`, () => {
  const STATE = { chapters: [
    { num: 1, padMultiplier: 1, waypoints: [wpt('A', 36, 28), wpt('B', 36.5, 27)] },
    { num: 2, padMultiplier: 1, waypoints: [wpt('B', 36.5, 27), wpt('C', 37, 25)] },
    { num: 3, padMultiplier: 1, waypoints: [wpt('D', 38, 20), wpt('E', 38, 15)] },
  ], settings: { distanceUnit: 'nm' } };
  const { chapterSyncHTML } = pick(editor, ['chapterSyncHTML'], { STATE });
  assert.equal(chapterSyncHTML(STATE.chapters[0]), '');
  assert.match(chapterSyncHTML(STATE.chapters[1]), /class="ch-sync linked"/);
  const pull = chapterSyncHTML(STATE.chapters[2]);
  assert.match(pull, /class="ch-sync pull"/);
  assert.match(pull, /pullFromPrevious\(3\)/);
});

test(`${EDITOR}: the chapter header and the light refresh build the indicator from the same helper`, () => {
  assert.match(editor.defs.createChapterElement, /chapterSyncHTML\(ch\)/);
  assert.match(editor.defs.refreshChapterLinks, /chapterSyncHTML\(ch\)/);
  assert.ok(!/class="ch-sync/.test(editor.defs.createChapterElement), 'the header no longer builds the markup itself');
});

// Paths that change a chapter's first or last point refresh the indicators; the coordinate edit and
// the marker drag no longer rebuild the whole list, which destroyed the field being tabbed into.
for (const name of ['updateWpt', 'onMarkerDragEnd', 'onMapClick', 'pickSearchResult', 'processFwdGeoQueue', 'deleteWpt', 'initWaypointSortable', 'doBulkAdd', 'doPaste', 'pullFromPrevious']) {
  test(`${EDITOR}: ${name} refreshes the chapter connections without rebuilding the list`, () => {
    const src = editor.defs[name];
    assert.ok(src, `${name} found`);
    assert.match(src, /refreshChapterLinks\(\)/);
    assert.ok(!/renderAllChapters\(\)/.test(src), `${name} still calls renderAllChapters()`);
  });
}

// ---------------------------------------------------------------------------------------------
// Selection follows its waypoint
// ---------------------------------------------------------------------------------------------

function selectionSandbox() {
  const stubs = {
    selectChapter() {}, updateMapChapter() {}, revealWaypointRow() {}, renderChapterWaypoints() {},
    updateHeroStats() {}, refreshChapterLinks() {}, updateChapterCountries() {}, renderAllChapters() {},
    noteFirstEdit() {}, map: null, document: { querySelectorAll: () => [], getElementById: () => null },
  };
  return pick(editor, ['selectWaypoint', 'deleteWpt', 'addWaypoint', 'selectedIndex'], stubs, {
    lets: true,
    prelude: `STATE.chapters = [{ num: 1, padMultiplier: 1, waypoints: [
      { name: 'A', lat: 1, lon: 1 }, { name: 'B', lat: 2, lon: 2 }, { name: 'C', lat: 3, lon: 3 }] }];
      activeChapterNum = 1;`,
    expose: `sel: () => selectedWpt && selectedWpt.name, rows: () => STATE.chapters[0].waypoints.map(w => w.name)`,
  });
}

test(`${EDITOR}: deleting a row above the selection keeps the same waypoint selected`, () => {
  const s = selectionSandbox();
  s.selectWaypoint(1, 2);
  s.deleteWpt(1, 0);
  assert.equal(s.sel(), 'C');
  assert.equal(s.selectedIndex(), 1);
});

test(`${EDITOR}: deleting the selected waypoint clears the selection`, () => {
  const s = selectionSandbox();
  s.selectWaypoint(1, 1);
  s.deleteWpt(1, 1);
  assert.equal(s.sel(), null);
  assert.equal(s.selectedIndex(), null);
});

test(`${EDITOR}: a new row goes after the selected waypoint wherever it now sits`, () => {
  const s = selectionSandbox();
  s.selectWaypoint(1, 2);       // C
  s.deleteWpt(1, 0);            // C is now row 1
  s.addWaypoint(1);             // inserted after C, and then selected
  assert.deepEqual(s.rows(), ['B', 'C', '']);
});

test(`${EDITOR}: the chart and the table mark the selected waypoint by identity, not by row number`, () => {
  assert.ok(!/selectedWptIdx/.test(editor.js), 'no row-number selection state is left');
  assert.match(editor.defs.renderWaypointRow, /selectedWpt/);
  assert.match(editor.defs.updateMapChapter, /const isSelected = \(chNum === selectedChapterNum && w === selectedWpt\);/);
});

// ---------------------------------------------------------------------------------------------
// Smaller fixes
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: bulk add is limited to 500 rows`, () => {
  const STATE = { chapters: [{ num: 1, waypoints: [] }] };
  const field = { value: '100000' };
  const { doBulkAdd } = pick(editor, ['doBulkAdd'], {
    STATE, document: { getElementById: id => (id === 'bulk-count' ? field : { classList: { remove() {} } }) },
    noteFirstEdit() {}, announce() {}, closeBulkModal() {}, renderChapterWaypoints() {}, refreshChapterLinks() {},
    renderAllChapters() {}, updateHeroStats() {},
  }, { prelude: 'bulkTargetChNum = 1;', lets: true });
  doBulkAdd();
  assert.equal(STATE.chapters[0].waypoints.length, 500);
});

test(`${EDITOR}: kmlColor writes a color as KML's aabbggrr`, () => {
  const { kmlColor } = pick(editor, ['kmlColor']);
  assert.equal(kmlColor('#332288'), 'ff882233');
  assert.equal(kmlColor('#12A4F0'), 'ffF0A412');
  assert.match(editor.defs.exportKML, /kmlColor\(chapterColor\(ch\.num\)\)/);
});

test(`${EDITOR}: placing a waypoint from a search result or a ghost midpoint counts as the first edit`, () => {
  assert.match(editor.defs.pickSearchResult, /noteFirstEdit\(\)/);
  assert.match(editor.defs.onGhostDragEnd, /noteFirstEdit\(\)/);
});

test(`${EDITOR}: the lat and lon steppers move 0.01 of a degree`, () => {
  const inputs = editor.html.match(/<input type="number" step="[^"]*"(?: min="-90" max="90")? id="wpt-(lat|lon)-/g) || [];
  assert.equal(inputs.length, 2);
  inputs.forEach(i => assert.match(i, /step="0\.01"/));
});

test('both tools use the same --shadow values', () => {
  const shadows = t => [...t.html.matchAll(/--shadow:\s*([^;]+);/g)].map(m => m[1].trim());
  assert.deepEqual(shadows(editor), shadows(viewer));
  assert.deepEqual(shadows(viewer), ['0 6px 28px rgba(29,43,58,0.18)', '0 6px 28px rgba(0,0,0,0.55)']);
});

test(`${VIEWER}: no CSS is left for the removed theme control, and the footer credit rule appears once`, () => {
  assert.ok(!/\.seg\b/.test(viewer.html), '.seg rules remain');
  assert.equal((viewer.html.match(/\.footer-credit\s*\{/g) || []).length, 1);
});

test(`${VIEWER}: a past chapter with a route is selectable; only a chapter without one is marked No geometry`, () => {
  const src = viewer.js;
  assert.ok(!/ch\.era === 'past' \|\| !hasRoutes/.test(src), 'past still treated as no geometry');
  assert.match(src, /const noGeometry = !hasRoutes;/);
});

// ---------------------------------------------------------------------------------------------
// Behavior checks added from the release review
// ---------------------------------------------------------------------------------------------

// A stand-in for any browser or Leaflet object the code only calls into: every property read and
// every call returns the same stand-in, so chains such as L.polyline(...).addTo(layer).on(...) run.
function chain() {
  const fn = function () { return proxy; };
  const proxy = new Proxy(fn, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k in t ? t[k] : proxy),
    set: (t, k, v) => { t[k] = v; return true; },
    apply: () => proxy,
  });
  return proxy;
}

test(`${EDITOR}: refreshChapterLinks replaces each indicator once and updates the distance, leaving the list in place`, () => {
  const STATE = { settings: { distanceUnit: 'nm' }, chapters: [
    { num: 1, padMultiplier: 1, waypoints: [wpt('A', 36, 28), wpt('B', 36.5, 27)] },
    { num: 2, padMultiplier: 1, waypoints: [wpt('C', 38, 20), wpt('D', 38, 15)] },
  ] };
  const headers = {}, looked = [];
  const header = num => {
    const h = { removed: 0, inserted: [], nm: { textContent: '', insertAdjacentHTML(pos, html) { h.inserted.push([pos, html]); } } };
    h.el = { querySelector: sel => (sel === '.ch-nm' ? h.nm : sel === '.ch-header .ch-sync' ? { remove() { h.removed++; } } : null) };
    return (headers[num] = h);
  };
  header(1); header(2);
  let heroUpdates = 0;
  const { refreshChapterLinks } = pick(editor, ['refreshChapterLinks'], {
    STATE, updateHeroStats() { heroUpdates++; },
    document: { getElementById: id => { looked.push(id); const m = id.match(/^ch-(\d+)$/); return m ? headers[m[1]].el : null; } },
  });
  refreshChapterLinks();
  assert.deepEqual(looked, ['ch-1', 'ch-2'], 'only the chapter headers are touched');
  assert.equal(headers[1].removed, 1);
  assert.deepEqual(headers[1].inserted, [], 'the first chapter has no indicator');
  assert.equal(headers[2].inserted.length, 1);
  assert.equal(headers[2].inserted[0][0], 'beforebegin');
  assert.match(headers[2].inserted[0][1], /class="ch-sync pull"/);
  assert.match(headers[1].nm.textContent, /^\d[\d,]* nm$/);
  assert.notEqual(headers[2].nm.textContent, '');
  assert.equal(heroUpdates, 1);
});

test(`${EDITOR}: a coordinate edit neither rebuilds the list nor redraws its own table`, () => {
  const calls = [];
  const stub = name => () => calls.push(name);
  const STATE = { chapters: [{ num: 1, waypoints: [wpt('A', 1, 1), wpt('B', 2, 2)] }] };
  const { updateWpt } = pick(editor, ['updateWpt'], {
    STATE, updateMapChapter: stub('updateMapChapter'), refreshChapterLinks: stub('refreshChapterLinks'),
    renderAllChapters: stub('renderAllChapters'), renderChapterWaypoints: stub('renderChapterWaypoints'),
    updateHeroStats: stub('updateHeroStats'), document: { querySelector: () => null, getElementById: () => null },
  });
  updateWpt(1, 1, 'lat', 0);
  assert.equal(STATE.chapters[0].waypoints[1].lat, 0);
  assert.ok(calls.includes('refreshChapterLinks'));
  assert.ok(!calls.includes('renderAllChapters') && !calls.includes('renderChapterWaypoints'), calls.join());
});

test(`${EDITOR}: a name edit keeps the row's selection highlight`, () => {
  const row = { classes: new Set(['wpt-row-selected', 'shaping']) };
  row.classList = { toggle: (c, on) => (on ? row.classes.add(c) : row.classes.delete(c)) };
  Object.defineProperty(row, 'className', { set: v => { row.classes = new Set(v.split(' ').filter(Boolean)); }, get: () => [...row.classes].join(' ') });
  const STATE = { chapters: [{ num: 1, waypoints: [wpt('', 1, 1)] }] };
  const { updateWpt } = pick(editor, ['updateWpt'], {
    STATE, updateMapChapter() {}, updateHeroStats() {}, forwardGeocodeWaypoint() {},
    document: { querySelector: sel => (sel.includes('tr[data-idx') ? row : null), getElementById: () => null },
  });
  updateWpt(1, 0, 'name', 'Horta');
  assert.deepEqual([...row.classes], ['wpt-row-selected']);
});

test(`${EDITOR}: only the selected waypoint's row, in its own chapter, is marked selected`, () => {
  const a = wpt('A', 1, 1), b = wpt('B', 2, 2);
  const fns = pick(editor, ['renderWaypointRow'], { __b: b }, { lets: true, prelude: 'selectedChapterNum = 1; selectedWpt = __b;' });
  const rowClass = html => (html.match(/<tr class="([^"]*)"/) || [])[1];
  assert.equal(rowClass(fns.renderWaypointRow(1, b, 1)), 'wpt-row-selected');
  assert.equal(rowClass(fns.renderWaypointRow(1, a, 0)), '');
  assert.equal(rowClass(fns.renderWaypointRow(2, b, 1)), '', 'the same object in another chapter number is not marked');
});

test(`${EDITOR}: focusing another field in the selected row does not reselect it`, () => {
  let selects = 0;
  const fns = pick(editor, ['onWptRowFocus'], { selectWaypoint() { selects++; } }, {
    lets: true,
    prelude: `STATE.chapters = [{ num: 1, waypoints: [{ name: 'A' }, { name: 'B' }] }]; selectedChapterNum = 1; selectedWpt = STATE.chapters[0].waypoints[1];`,
  });
  fns.onWptRowFocus(1, 1);
  assert.equal(selects, 0);
  fns.onWptRowFocus(1, 0);
  assert.equal(selects, 1);
});

test(`${EDITOR}: deleting an earlier chapter keeps the active chapter and the selection on their chapters`, () => {
  const fns = pick(editor, ['deleteChapter'], { confirmModal: (t, m, action) => action(), renderAllChapters() {}, setDirty() {} }, {
    lets: true,
    prelude: `STATE.chapters = [1, 2, 3].map(n => ({ num: n, waypoints: [{ name: 'W' + n }] }));
      activeChapterNum = 3; selectedChapterNum = 3; selectedWpt = STATE.chapters[2].waypoints[0];`,
    expose: 'state: () => ({ active: activeChapterNum, sel: selectedChapterNum, wpt: selectedWpt && selectedWpt.name })',
  });
  fns.deleteChapter(1);
  assert.deepEqual(fns.state(), { active: 2, sel: 2, wpt: 'W3' });
  fns.deleteChapter(2);
  assert.deepEqual(fns.state(), { active: null, sel: null, wpt: null });
});

// The editor's global keydown listener, taken from the page and run against a stub document.
function editorKeydown(open, overrides = {}) {
  const start = editor.js.indexOf("/* Global modal keyboard");
  assert.ok(start >= 0, 'keydown listener found');
  const from = editor.js.indexOf("document.addEventListener('keydown'", start);
  let depth = 0, end = from;
  for (let i = editor.js.indexOf('{', from); i < editor.js.length; i++) {
    if (editor.js[i] === '{') depth++;
    else if (editor.js[i] === '}' && --depth === 0) { end = editor.js.indexOf(';', i) + 1; break; }
  }
  const calls = [];
  let handler;
  const el = id => ({ classList: { contains: c => (c === 'hidden' ? id === 'landing' : open.includes(id)) } });
  const doc = { getElementById: el, addEventListener: (type, fn) => { handler = fn; } };
  const names = ['closeChooser', 'closeBulkModal', 'closePasteModal', 'closeCSVStep2', 'closeDeleteWptModal', 'closeConfirmModal',
    'closeLookupConfirm', 'proceedLookupConfirm', 'closeDropdowns', 'deselectWaypoint', 'doBulkAdd', 'doDeleteWpt', 'proceedConfirmModal'];
  const stubs = Object.fromEntries(names.map(n => [n, () => calls.push(n)]));
  new Function('document', 'selectedWpt', 'confirmSafeDefault', ...names, editor.js.slice(from, end))(doc, overrides.selectedWpt ?? {}, false, ...names.map(n => stubs[n]));
  return { calls, press: (key, target) => handler({ key, shiftKey: false, target, preventDefault() {} }) };
}

test(`${EDITOR}: Escape closes the Look Up Countries dialog and leaves the selection`, () => {
  const k = editorKeydown(['lookup-confirm-modal']);
  k.press('Escape');
  assert.ok(k.calls.includes('closeLookupConfirm'), k.calls.join());
  assert.ok(!k.calls.includes('deselectWaypoint'), k.calls.join());
});

test(`${EDITOR}: Enter proceeds with the Look Up Countries dialog, unless one of its buttons has focus`, () => {
  const k = editorKeydown(['lookup-confirm-modal']);
  k.press('Enter', { closest: () => null });
  assert.deepEqual(k.calls, ['proceedLookupConfirm']);
  const k2 = editorKeydown(['lookup-confirm-modal']);
  k2.press('Enter', { closest: sel => (sel === '#lookup-confirm-modal button' ? {} : null) });
  assert.deepEqual(k2.calls, [], 'a focused button handles its own Enter');
});

test(`${EDITOR}: the theme switch sets the browser theme color and the marker accent follows the dark theme`, () => {
  let content = null, redraws = 0;
  const { toggleTheme } = pick(editor, ['toggleTheme'], {
    map: { removeLayer() {} }, tileLight: { addTo() {} }, tileDark: { addTo() {} }, updateMapAll() { redraws++; },
    document: { body: { classList: { toggle() {} } }, querySelector: () => ({ setAttribute: (a, v) => { content = v; } }) },
  }, { lets: true, prelude: 'let isDark = false;' });   // isDark shares its declaration line with the stubbed map and tile layers
  toggleTheme();
  assert.equal(content, '#0b1622');
  toggleTheme();
  assert.equal(content, '#f4efe4');
  assert.equal(redraws, 2);
  assert.match(editor.defs.updateMapChapter, /getComputedStyle\(document\.body\)\.getPropertyValue\('--accent'\)/);
});

test(`${EDITOR}: the lat and lon fields keep their stepper base with their value`, () => {
  const inputs = editor.html.match(/id="wpt-(lat|lon)-\$\{chNum\}-\$\{idx\}"[^>]*>/g) || [];
  assert.equal(inputs.length, 2);
  inputs.forEach(i => assert.match(i, /onCoordInput\(this,/));
  assert.match(editor.defs.onCoordInput, /input\.defaultValue = input\.value/);
  assert.match(editor.defs.onMarkerDrag, /latInput\.value = latInput\.defaultValue = w\.lat/);
  assert.match(editor.defs.processFwdGeoQueue, /latInput\.value = latInput\.defaultValue = w\.lat/);
});

test(`${EDITOR}: a typed 0 in bulk add makes one row`, () => {
  const STATE = { chapters: [{ num: 1, waypoints: [] }] };
  const { doBulkAdd } = pick(editor, ['doBulkAdd'], {
    STATE, document: { getElementById: () => ({ value: '0' }) }, noteFirstEdit() {}, announce() {}, closeBulkModal() {},
    renderChapterWaypoints() {}, refreshChapterLinks() {}, updateHeroStats() {},
  }, { lets: true, prelude: 'bulkTargetChNum = 1;' });
  doBulkAdd();
  assert.equal(STATE.chapters[0].waypoints.length, 1);
});

test(`${VIEWER}: the theme switch rebuilds Decision and Gateway icons with the new stroke`, () => {
  const icons = [];
  const marker = (kind) => ({ _vaShape: { kind, size: 16, color: '#332288' }, setIcon: i => icons.push(i) });
  const layer = items => ({ eachLayer: cb => items.forEach(cb) });
  const { refreshMarkerStrokes } = pick(viewer, ['refreshMarkerStrokes'], {
    document: { body: { classList: { contains: () => true } } }, getComputedStyle: () => ({ getPropertyValue: () => '#eaf0f7' }),
    wptsLayer: layer([]), decisionLayer: layer([marker('decision')]), gatewayLayer: layer([marker('gateway')]),
    L: { divIcon: o => o },
  });
  refreshMarkerStrokes();
  assert.equal(icons.length, 2);
  icons.forEach(i => assert.match(i.html, /stroke="#0b1622"/));
});

test(`${VIEWER}: past chapters with a route open from the legend and the drawer; a chapter without one does not`, () => {
  const rows = [];
  const element = () => {
    const e = chain();
    e.listeners = [];
    e.addEventListener = (type, fn) => e.listeners.push(fn);
    return e;
  };
  const body = () => { const b = chain(); b.appendChild = el => rows.push(el); return b; };
  const doc = { createElement: () => element(), getElementById: id => (id === 'legend-body' || id === 'drawer-body' ? body() : chain()),
    querySelector: () => chain(), body: chain() };
  const selected = [];
  const { loadVoyageData } = pick(viewer, ['loadVoyageData'], {
    document: doc, L: chain(), map: chain(), routesLayer: chain(), wptsLayer: chain(), pazLayer: chain(),
    decisionLayer: chain(), gatewayLayer: chain(), setTimeout() {}, window: { innerWidth: 1400 },
    selectChapter: n => selected.push(n), closeInfo() {}, closeDrawer() {}, fitVoyageOnLoad() {},
    getComputedStyle: () => ({ getPropertyValue: () => '#1d2b3a' }),
    polylines: {}, casings: {}, wptMarkers: {}, DATA: null, activeNum: null,
  }, { prelude: '' });
  loadVoyageData({ meta: {}, chapters: [
    { num: 1, name: 'Sailed', era: 'past', waypoints: [wpt('A', 36, 28), wpt('B', 36.5, 27)] },
    { num: 2, name: 'Stub', era: 'future', waypoints: [wpt('C', 37, 26)] },
  ] });
  const legend = rows.filter(r => r.id && String(r.id).startsWith('leg-'));
  const drawer = rows.filter(r => r.id && String(r.id).startsWith('dr-'));
  assert.equal(legend.length, 2);
  assert.equal(legend[0].listeners.length, 1, 'the past chapter opens from the legend');
  assert.equal(drawer[0].listeners.length, 1, 'the past chapter opens from the drawer');
  assert.equal(legend[1].listeners.length, 0, 'a chapter without a route does not open');
  assert.ok(!/No route/.test(drawer[0].innerHTML) && /No route/.test(drawer[1].innerHTML));
  legend[0].listeners[0]();
  assert.deepEqual(selected, [1]);
});

test(`${EDITOR}: the Paste dialog splits at tabs when the text holds one, otherwise at commas`, () => {
  const seen = [];
  const STATE = { chapters: [{ num: 1, waypoints: [] }] };
  const area = { value: '' };
  const { doPaste } = pick(editor, ['doPaste'], {
    STATE, Papa: { parse: (text, opts) => { seen.push(opts.delimiter); return { data: [] }; } },
    document: { getElementById: id => (id === 'paste-area' ? area : { classList: { remove() {} } }) },
    closePasteModal() {}, noteFirstEdit() {}, announce() {}, renderChapterWaypoints() {}, updateMapChapter() {},
    updateChapterCountries() {}, refreshChapterLinks() {}, forwardGeocodeWaypoint() {},
  }, { lets: true, prelude: 'pasteTargetChNum = 1;' });
  area.value = 'Lisbon\t38.70\t-9.14\nHorta\t38.53\t-28.63\ttrue\tfalse\tfalse\tPT\tFuel; water';
  doPaste();
  area.value = 'Lisbon,38.70,-9.14\nHorta,38.53,-28.63,true,false,false,PT,Fuel; water';
  doPaste();
  assert.deepEqual(seen, ['\t', ',']);
});

test(`${EDITOR}: the Nations help gives the territory list's real size`, () => {
  const { TERRITORIES } = pick(editor, ['TERRITORIES']);
  const tip = (editor.html.match(/<label for="set-nations">Nations <span class="hi" data-tip="([^"]*)"/) || [])[1] || '';
  const n = (tip.match(/\((\d+) names\)/) || [])[1];
  assert.equal(Number(n), TERRITORIES.size, tip);
});

test('both tools use American spelling in their source, comments included', () => {
  const british = /\b(neighbour\w*|behaviour\w*|favour\w*|colour\w*|centre[sd]?|initialis\w*|organis\w*|recognis\w*|normalis\w*|labelled|cancelled|travelling|modelling|maths)\b/gi;
  for (const tool of [editor, viewer]) {
    assert.deepEqual(tool.html.match(british) || [], [], tool.name);
  }
});
