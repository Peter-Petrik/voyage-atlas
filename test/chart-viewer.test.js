// Chart and viewer, from the full review of v3.9.14: a library that fails to load says so; ghost
// midpoints sit above the click areas and show only where they clear their leg's ends; the
// viewer's opening view keeps the current chapter in sight, and a short screen frames a chapter
// clear of its corner panels; a chapter of one point opens; a place search that finds nothing or
// fails says so; the distance tile reads in the singular for 1; a page opened from disk says why it
// offers only a file; the dateline seam follows the drawn line and unwrap corrects by as many turns
// as it takes; and the forced-colors, print and right-to-left fixes.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, pick } = require('./support.js');

const editor = loadTool(EDITOR);
const viewer = loadTool(VIEWER);
const tools = [editor, viewer];
const wpt = (name, lat, lon) => ({ name, lat, lon, major: false, decision: false, gateway: false, country: '', notes: '' });

// ---------------------------------------------------------------------------------------------
// A library that does not load
// ---------------------------------------------------------------------------------------------

function noticeDocument() {
  let el = null;
  return {
    get el() { return el; },
    querySelector: () => el,
    createElement: () => ({ textContent: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }),
    body: { prepend: e => { el = e; } },
  };
}

for (const tool of tools) {
  test(`${tool.name}: a library that did not load is named in one notice across the top of the page`, () => {
    const document = noticeDocument();
    const { libraryNotice } = pick(tool, ['libraryNotice'], { document });
    libraryNotice('The chart library (Leaflet)', 'the chart cannot be drawn');
    libraryNotice('The chart library (Leaflet)', 'the chart cannot be drawn');
    assert.equal(document.el.className, 'lib-notice');
    assert.equal(document.el.attrs.role, 'alert');
    assert.equal(document.el.textContent, 'The chart library (Leaflet) could not load from cdnjs.cloudflare.com, so the chart cannot be drawn. Check the connection, then reload the page.');
    libraryNotice('The CSV library (PapaParse)', 'Paste is off');
    assert.match(document.el.textContent, /reload the page\. The CSV library \(PapaParse\) could not load/);
  });

  test(`${tool.name}: without Leaflet the script says so and stops before it first uses it`, () => {
    const guard = tool.js.indexOf("if (typeof L === 'undefined') {");
    assert.ok(guard > 0, 'guard found');
    const firstUse = tool.js.search(/\bL\.(map|tileLayer|layerGroup|polyline|circleMarker|marker|divIcon)\(/);
    assert.ok(guard < firstUse, 'the guard runs before Leaflet is first used');
    assert.match(tool.js.slice(guard, guard + 300),
      /libraryNotice\('The chart library \(Leaflet\)', 'the chart cannot be drawn'\);\s*document\.querySelectorAll\('button, input, select, textarea'\)\.forEach\(el => \{ el\.disabled = true; \}\);\s*throw new Error/);
    assert.match(tool.js, /if \(!leafletStylesLoaded\(\)\) libraryNotice\('The chart styles \(Leaflet\)', 'the chart cannot be drawn properly'\);/);
  });

  test(`${tool.name}: Leaflet's style sheet counts as loaded only when it places the chart's panes`, () => {
    for (const position of ['absolute', 'static']) {
      let removed = 0;
      const document = { createElement: () => ({ remove: () => removed++ }), body: { appendChild() {} } };
      const { leafletStylesLoaded } = pick(tool, ['leafletStylesLoaded'], { document, getComputedStyle: () => ({ position }) });
      assert.equal(leafletStylesLoaded(), position === 'absolute');
      assert.equal(removed, 1);
    }
  });
}

test(`${EDITOR}: without SortableJS rows and chapters keep their order, and the editor still starts`, () => {
  const tbody = { _sortable: null };
  const { initWaypointSortable, initChapterSortable } = pick(editor, ['initWaypointSortable', 'initChapterSortable'], {
    document: { getElementById: () => tbody },
  });
  assert.doesNotThrow(() => initWaypointSortable(1));
  assert.doesNotThrow(() => initChapterSortable());
  assert.equal(tbody._sortable, null);
  assert.match(editor.js, /if \(typeof Sortable === 'undefined'\) libraryNotice\('The reordering library \(SortableJS\)'/);
});

test(`${EDITOR}: without PapaParse, Paste and the CSV import and export say so instead of failing`, () => {
  const document = noticeDocument();
  const opened = [];
  document.getElementById = id => ({ value: '', focus() {}, classList: { add: () => opened.push(id) }, click: () => opened.push('picker') });
  const fns = pick(editor, ['openPasteModal', 'importCSV', 'exportCSVs'], {
    document, closeDropdowns() {}, guardDirty: f => f(), announce() {}, setTimeout() {},
    exportChaptersCSV: () => opened.push('export'), exportWaypointsCSV() {},
  });
  fns.openPasteModal(1);
  fns.importCSV();
  fns.exportCSVs();
  assert.deepEqual(opened, []);
  assert.match(document.el.textContent, /^The CSV library \(PapaParse\) could not load from cdnjs\.cloudflare\.com, so Paste, Import CSVs and the CSV export are off\./);
});

// ---------------------------------------------------------------------------------------------
// Ghost midpoints
// ---------------------------------------------------------------------------------------------

// A chart where one degree is `scale` pixels in both directions.
const flatMap = scale => {
  const on = new Set();
  return {
    on, latLngToLayerPoint: ([lat, lon]) => { const x = lon * scale, y = -lat * scale; return { x, y, distanceTo: o => Math.hypot(x - o.x, y - o.y) }; },
    hasLayer: l => on.has(l), removeLayer: l => on.delete(l),
  };
};

test(`${EDITOR}: a ghost midpoint shows only where it clears both ends of its leg by 16 px`, () => {
  const map = flatMap(10);
  const { ghostClear } = pick(editor, ['ghostClear'], { map });
  assert.equal(ghostClear({ _ends: [[0, 0], [0, 3.1]] }), false); // 31 px apart: 15.5 px from each end
  assert.equal(ghostClear({ _ends: [[0, 0], [0, 3.2]] }), true);  // 32 px apart
  assert.equal(ghostClear({ _ends: [[0, 0], [3, 3]] }), true);
});

test(`${EDITOR}: after a zoom the active chapter's ghosts are shown or hidden, and its layers raised again`, () => {
  const map = flatMap(10);
  const raised = [];
  const ghost = (len, on) => {
    const g = { _ends: [[0, 0], [0, len]], addTo: m => { m.on.add(g); return g; }, bringToFront: () => raised.push('ghost') };
    if (on) map.on.add(g);
    return g;
  };
  const short = ghost(1, true), long = ghost(10, false);
  const mapLayers = { 2: { line: null, ghosts: [short, long], markers: [] } };
  pick(editor, ['syncGhosts'], { map, mapLayers }, { lets: true, prelude: 'activeChapterNum = 2;' }).syncGhosts();
  assert.equal(map.hasLayer(short), false);
  assert.equal(map.hasLayer(long), true);
  assert.deepEqual(raised, ['ghost', 'ghost']);
  assert.match(editor.defs.initMap, /map\.on\('zoomend', syncGhosts\);/);
  assert.match(editor.defs.updateMapChapter, /ghost\._ends = \[\[a\.lat, aLon \+ off\], \[b\.lat, bLon \+ off\]\];\s*if \(ghostClear\(ghost\)\) ghost\.addTo\(map\);/);
});

// ---------------------------------------------------------------------------------------------
// The viewer's framing
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
const GLOBE = [
  { num: 1, era: 'past', waypoints: [wpt('A', 36, 5), wpt('B', 20, -60), wpt('C', -10, -140)] },
  { num: 2, era: 'current', waypoints: [wpt('D', -20, 170), wpt('E', -35, 120), wpt('F', -30, 40)] },
];

test(`${VIEWER}: an opening view that leaves the current chapter off screen frames the chapter instead`, () => {
  const fits = [];
  const run = (inView, natural) => pick(viewer, ['fitVoyageOnLoad'], {
    map: { ...mercator(743, 390), setView() {}, getBoundsZoom: () => natural }, L: { latLngBounds: boundsOf }, window: { innerWidth: 390 },
    chartInsets: () => ({ top: 40, bottom: 0 }), pointInView: inView, fitToCoords: (coords, ease, insets) => fits.push({ coords, ease, insets }),
  }).fitVoyageOnLoad(GLOBE);
  const chapter2 = { coords: [[-20, 170], [-35, 120], [-30, 40]], ease: true, insets: { top: 40, bottom: 0 } };
  // The anchored view of a voyage too wide for one world.
  run(() => true, 0);
  assert.deepEqual(fits, []);
  run((lat, lon) => lon !== 120, 0);
  assert.deepEqual(fits, [chapter2]);
  // The whole-voyage fit, which can clip the ends at the zoom the chart allows.
  fits.length = 0;
  run(() => true, 5);
  assert.equal(fits.length, 1);
  run((lat, lon) => lon !== 120, 5);
  assert.equal(fits.length, 3);
  assert.deepEqual(fits[2], chapter2);
});

// A chart that, like Leaflet, applies an animated view only later (here, when flush() runs) and
// ignores another animated view asked for while one is under way, and applies an unanimated view at
// once. Projection: Mercator, 256 px per world at zoom 0.
function laterMap(w, h) {
  const view = { center: [0, 0], zoom: 2 }, pending = [];
  const W = z => 256 * 2 ** z;
  const project = ([lat, lng], z) => ({ x: (lng + 180) / 360 * W(z), y: (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2 * W(z) });
  return {
    view, flush: () => pending.splice(0).forEach(f => f()),
    getSize: () => ({ x: w, y: h }), getBoundsZoom: () => 0, project,
    unproject: ([x, y], z) => ({ lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / W(z)))) * 180 / Math.PI, lng: x / W(z) * 360 - 180 }),
    latLngToContainerPoint: ([lat, lng]) => {
      const p = project([lat, lng], view.zoom), c = project(view.center, view.zoom);
      return { x: p.x - c.x + w / 2, y: p.y - c.y + h / 2 };
    },
    setView(center, zoom, o) {
      const apply = () => { view.center = center; view.zoom = zoom; };
      if (o && o.animate === false) apply(); else if (!pending.length) pending.push(apply);
    },
  };
}

test(`${VIEWER}: the opening view looks at the view it set, so the current chapter ends up in sight`, () => {
  // With Leaflet's animated views the check read the old view and its own view was overridden: the
  // current chapter could open off screen. Set without animation, the check sees what it set.
  const inView = map => GLOBE[1].waypoints.every(p => [-360, 0, 360].some(o => {
    const q = map.latLngToContainerPoint([p.lat, p.lon + o]); return q.x >= 0 && q.x <= 390 && q.y >= 0 && q.y <= 743;
  }));
  const run = animated => {
    const map = laterMap(390, 743);
    const fns = pick(viewer, ['fitVoyageOnLoad', 'withoutAnimation'], { map, L: { latLngBounds: boundsOf }, window: { innerWidth: 390 }, chartInsets: () => null },
      { lets: true });
    if (animated) fns.fitVoyageOnLoad(GLOBE); else fns.withoutAnimation(() => fns.fitVoyageOnLoad(GLOBE));
    map.flush();
    return inView(map);
  };
  assert.equal(run(false), true);
  assert.equal(run(true), false, 'the animated path shows the defect this guards against');
});

test(`${VIEWER}: a view set during a running zoom waits for the zoom to end`, () => {
  const handlers = {}, once = [];
  const map = { on: (type, f) => { handlers[type] = f; }, once: (type, f) => once.push(f), setView() {} };
  const ran = [];
  const fns = pick(viewer, ['withoutAnimation'], { map }, { lets: true, prelude: "map.on('zoomstart', () => { zooming = true; }); map.on('zoomend', () => { zooming = false; });" });
  handlers.zoomstart();
  fns.withoutAnimation(() => ran.push('fit'));
  assert.deepEqual(ran, []);
  handlers.zoomend();
  once.forEach(f => f());
  assert.deepEqual(ran, ['fit']);
  assert.match(viewer.js, /map\.on\('zoomstart', \(\) => \{ zooming = true; \}\);\s*map\.on\('zoomend', \(\) => \{ zooming = false; \}\);/);
});

test(`${VIEWER}: a point is in view in any world copy and clear of the panels`, () => {
  // A chart 200 px wide showing longitudes -200 to 0.
  const map = { getSize: () => ({ x: 200, y: 300 }), latLngToContainerPoint: ([lat, lon]) => ({ x: lon + 200, y: 150 - lat }) };
  const { pointInView } = pick(viewer, ['pointInView'], { map });
  assert.equal(pointInView(0, -100), true);
  assert.equal(pointInView(0, 200), true);        // the copy 360° west, at -160, is on screen
  assert.equal(pointInView(0, 100), false);
  assert.equal(pointInView(-140, -100, { top: 0, bottom: 20 }), false); // under the bottom panel
  assert.equal(pointInView(140, -100, { top: 20, bottom: 0 }), false);  // under Chart & Layers
});

function panel(top, bottom, visible = true) {
  return { offsetParent: visible ? {} : null, classList: { contains: () => visible }, getBoundingClientRect: () => ({ top, bottom }) };
}
function insets(width, height, els) {
  const map = { getContainer: () => ({ getBoundingClientRect: () => ({ top: 50, bottom: 50 + height - 100 }) }) };
  return pick(viewer, ['chartInsets'], { map, window: { innerWidth: width, innerHeight: height }, document: { getElementById: id => els[id] } }).chartInsets();
}

test(`${VIEWER}: on a short screen a chapter is framed between Chart & Layers and the taller bottom panel`, () => {
  // 740 × 360, a phone held sideways: the chart runs from 50 to 310 px.
  const els = { filter: panel(60, 100), legend: panel(150, 300), info: panel(200, 300) };
  assert.deepEqual(insets(740, 360, els), { top: 50, bottom: 160 });
  els.info = panel(120, 300);
  assert.deepEqual(insets(740, 360, els), { top: 50, bottom: 190 });
  // A tall desktop screen leaves the corner panels to the fit's own ease.
  assert.equal(insets(1400, 900, els), null);
  // A phone held upright: the chapter list is hidden; the detail sheet covers the bottom.
  const phone = { filter: panel(60, 100), legend: panel(0, 0, false), info: panel(500, 743) };
  assert.deepEqual(insets(390, 843, phone), { top: 50, bottom: 293 });
});

// ---------------------------------------------------------------------------------------------
// A chapter of one point
// ---------------------------------------------------------------------------------------------

test(`${VIEWER}: a chapter of one point opens, framed on its point; a chapter with no coordinates does not`, () => {
  const fits = [];
  const el = () => ({ style: {}, classList: { add() {}, toggle() {} }, textContent: '', innerHTML: '' });
  const DATA = { chapters: [{ num: 1, name: 'Marina', when: 'Winter', notes: 'Hauled out', waypoints: [wpt('M', 36.85, 28.27)], routes: [] },
    { num: 2, name: 'Plan', waypoints: [wpt('', null, null)], routes: [] },
    // A lone unnamed point is a shaping vertex, which the viewer does not draw: nothing to frame.
    { num: 3, name: 'Vertex', waypoints: [wpt('', 38, 20)], routes: [] }] };
  const fns = pick(viewer, ['selectChapter'], {
    DATA, polylines: {}, wptMarkers: {}, document: { getElementById: el, querySelectorAll: () => [] }, raiseChapterRoute() {}, revealRow() {},
    fitToCoords: (c, ease) => fits.push(c), chartInsets: () => null, viewerUnit: () => 'nm',
  }, { lets: true, expose: 'active: () => activeNum' });
  fns.selectChapter(2);
  fns.selectChapter(3);
  assert.equal(fns.active(), null);
  fns.selectChapter(1);
  assert.equal(fns.active(), 1);
  assert.deepEqual(fits, [[[36.85, 28.27]]]);
});

// ---------------------------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: a place search that finds nothing, or fails, says so in its results box`, async () => {
  const box = { style: {}, innerHTML: '' };
  const input = { value: 'Nowhere' };
  const document = { getElementById: id => (id === 'search-results' ? box : input) };
  const answer = { value: Promise.resolve([]) };
  const fns = pick(editor, ['nomSearch', 'nomKeydown'], { document, geoRequest: () => answer.value });
  fns.nomSearch();
  await new Promise(r => setImmediate(r));
  assert.equal(box.innerHTML, '<div class="sr-empty">No places found</div>');
  assert.equal(box.style.display, 'block');
  answer.value = Promise.reject(new Error('network'));
  fns.nomSearch();
  await new Promise(r => setImmediate(r));
  assert.match(box.innerHTML, /Search failed — check the connection/);
  // Escape closes the line, as it closes results.
  fns.nomKeydown({ key: 'Escape', stopPropagation() {} });
  assert.equal(box.style.display, 'none');
  assert.equal(input.value, 'Nowhere');
});

for (const tool of tools) {
  test(`${tool.name}: the distance tile reads in the singular for a total of 1`, () => {
    const { heroItems } = pick(tool, ['heroItems']);
    assert.equal(heroItems({ displayNm: 1, chapters: 1 }, 'nm', false)[0][1], 'Nautical Mile');
    assert.equal(heroItems({ displayNm: 1.2, chapters: 1 }, 'nm', false)[0][1], 'Nautical Mile');
    assert.equal(heroItems({ displayNm: 2, chapters: 1 }, 'nm', false)[0][1], 'Nautical Miles');
    assert.equal(heroItems({ displayNm: 1 / 1.852, chapters: 1 }, 'km', false)[0][1], 'Kilometer');
    assert.equal(heroItems({ displayNm: 100, chapters: 1 }, 'mi', false)[0][1], 'Miles');
  });

  test(`${tool.name}: a page opened from disk says why the chooser offers only a file`, () => {
    assert.match(tool.js, /dataNote = dataPath === null \? DATA_NOTES\.offSite : location\.protocol === 'file:' \? DATA_NOTES\.fromDisk : \(named \? DATA_NOTES\.notFound : ''\)/);
    const { DATA_NOTES } = pick(tool, ['DATA_NOTES']);
    assert.match(DATA_NOTES.fromDisk, /^Opened from this computer, the page cannot read the voyage file beside it on its own\./);
  });

  // -------------------------------------------------------------------------------------------
  // Dateline geometry
  // -------------------------------------------------------------------------------------------

  test(`${tool.name}: the dateline seam lies on the straight line the Mercator chart draws`, () => {
    const { splitAtDateline } = pick(tool, ['splitAtDateline']);
    // Mercator y written another way, asinh(tan φ), so the check does not repeat the code's formula.
    const y = lat => Math.asinh(Math.tan(lat * Math.PI / 180));
    for (const [a, b] of [[[-21.14, -175.2], [-35.31, 174.12]], [[-60, 170], [-70, -170]], [[50, 175], [55, -160]], [[0, 170], [10, -170]]]) {
      const segs = splitAtDateline([a, b]);
      const seam = segs[0][1][0];
      // In the frame where b is on a's side: x runs on through the seam at 180 (or -180).
      const bx = b[1] + (b[1] - a[1] > 0 ? -360 : 360), sx = segs[0][1][1];
      const t = (sx - a[1]) / (bx - a[1]);
      assert.ok(Math.abs(y(seam) - (y(a[0]) + (y(b[0]) - y(a[0])) * t)) < 1e-9, `${a} → ${b}: ${seam}`);
      assert.equal(segs[1][0][0], seam);
    }
    // Interpolating the latitude itself put the seam off the line: here by 0.23°, about 14 nm.
    const tonga = splitAtDateline([[-21.14, -175.2], [-35.31, 174.12]])[0][1][0];
    assert.ok(Math.abs(tonga - (-21.14 + (-35.31 + 21.14) * (4.8 / 10.68))) > 0.2, `${tonga}`);
    // A leg along a parallel crosses at its own latitude.
    assert.deepEqual(splitAtDateline([[-20, 170], [-20, -170]]), [[[-20, 170], [-20, 180]], [[-20, -180], [-20, -170]]]);
  });

  test(`${tool.name}: unwrap corrects a voyage that has circled the globe by as many turns as it takes`, () => {
    const { unwrap } = pick(tool, ['unwrap']);
    const u = unwrap([[0, 0], [0, 120], [0, -120], [0, 0], [0, 120], [0, 135.39], [0, -179.99999]]);
    assert.deepEqual(u.map(p => Math.round(p[1] * 1e5) / 1e5), [0, 120, 240, 360, 480, 495.39, 540.00001]);
    // Within one turn, as before: a step of exactly 180° is left as it is.
    assert.deepEqual(unwrap([[0, 0], [0, 180]]), [[0, 0], [0, 180]]);
    assert.deepEqual(unwrap([[0, 0], [0, -180]]), [[0, 0], [0, -180]]);
  });
}

// ---------------------------------------------------------------------------------------------
// Forced colors, print, right-to-left text
// ---------------------------------------------------------------------------------------------

test(`${VIEWER}: in a forced-colors mode the swatches keep their colors and the selected row is outlined`, () => {
  assert.match(viewer.html, /@media \(forced-colors: active\) \{\s*\.leg-sw, \.dr-sw \{ forced-color-adjust: none; \}\s*\.leg-row\.active, \.dr-row\.active \{ outline: 2px solid Highlight; outline-offset: -2px; \}/);
});

test(`${VIEWER}: a print is framed for the paper and the header figures print at any width`, () => {
  const calls = [];
  const map = { invalidateSize: () => calls.push('size'), setView: (c, z, o) => calls.push(['view', z, o]), getCenter: () => 'C', getZoom: () => 7 };
  const original = map.setView;
  const fns = pick(viewer, ['reframeChart', 'withoutAnimation'], {
    map, DATA: { chapters: ['c'] },
    selectChapter: n => calls.push(['select', n]), fitVoyageOnLoad: c => { calls.push(['load', c]); map.setView([0, 0], 3); },
  }, { lets: true });
  fns.reframeChart({ matches: true });
  // The fit's view is set without animation, and setView is put back afterwards.
  assert.deepEqual(calls, ['size', ['load', ['c']], ['view', 3, { animate: false }]]);
  assert.equal(map.setView, original);
  // When printing ends, the reader's view comes back.
  calls.length = 0;
  fns.reframeChart({ matches: false });
  assert.deepEqual(calls, ['size', ['view', 7, { animate: false }]]);
  // The opening view is set the same way: a second view set during an animated zoom would be lost.
  assert.match(viewer.js, /setTimeout\(\(\) => \{ map\.invalidateSize\(\); withoutAnimation\(\(\) => fitVoyageOnLoad\(DATA\.chapters\)\); \}, 100\);/);
  assert.match(viewer.js, /window\.matchMedia\('print'\)\.addEventListener\('change', reframeChart\);/);
  for (const tool of tools) assert.match(tool.html, /@media print \{\s*\.head-stats \{ display: flex; \}\s*\}\s*\/\* end shared:header \*\//);
});

test(`${VIEWER}: names and lists keep their order when right-to-left and left-to-right text mix`, () => {
  const { bidiList } = pick(viewer, ['bidiList']);
  assert.equal(bidiList(['ישראל', 'Cyprus', '<b>']), '<bdi>ישראל</bdi> · <bdi>Cyprus</bdi> · <bdi>&lt;b&gt;</bdi>');
  assert.equal(bidiList(null), '');
  for (const src of ['<div class="leg-name"><bdi>${esc(ch.name)}</bdi></div>', '<div class="dr-name"><bdi>${esc(ch.name)}</bdi></div>',
    '<div class="dr-dest">${bidiList(ch.keyDestinations)}</div>', '<div class="pop-name"><bdi>${esc(w.name)}</bdi></div>',
    "getElementById('info-countries').innerHTML = bidiList(chapterCountries(ch));", "getElementById('page-title').innerHTML = `<bdi>${esc(title)}</bdi>`;"]) {
    assert.ok(viewer.js.includes(src), src);
  }
});

test(`${EDITOR}: every text field for a name, a country, a list or notes takes the direction of its text`, () => {
  for (const id of ['set-title', 'meta-name-${ch.num}', 'meta-countries-${ch.num}', 'meta-keydest-${ch.num}', 'wpt-name-${chNum}-${idx}', 'wpt-country-${chNum}-${idx}']) {
    assert.ok(editor.html.includes(`id="${id}" dir="auto"`), id);
  }
  assert.ok(editor.html.includes('<textarea id="meta-notes-${ch.num}" dir="auto"'));
  assert.ok(editor.html.includes(`<td class="col-notes"><input type="text" dir="auto" value=`));
  assert.ok(editor.html.includes('<span class="ch-name" title="${esc(ch.name)}"><bdi>${esc(ch.name)}</bdi></span>'));
});
