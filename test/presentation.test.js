// Look and parity: the style blocks both tools share, text contrast in both themes, the route casing,
// framing that fills the chart, the header tiles, the phone layout of the viewer, and wording.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, pick } = require('./support.js');

const editor = loadTool(EDITOR);
const viewer = loadTool(VIEWER);
const tools = [editor, viewer];

// The style sheet of a tool, and its `shared:` blocks by name, each line without its indentation.
const styleOf = tool => (tool.html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
function sharedBlocks(tool) {
  const blocks = {};
  for (const m of styleOf(tool).matchAll(/\/\* shared:(\w+)([\s\S]*?)\/\* end shared:\1 \*\//g)) {
    blocks[m[1]] = m[2].split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  }
  return blocks;
}

// ---------------------------------------------------------------------------------------------
// Shared style blocks
// ---------------------------------------------------------------------------------------------

test('the shared style blocks are identical in both tools', () => {
  const e = sharedBlocks(editor), v = sharedBlocks(viewer);
  assert.deepEqual(Object.keys(e).sort(), ['chooser', 'footer', 'header', 'leaflet', 'notice', 'theme']);
  assert.deepEqual(Object.keys(v).sort(), Object.keys(e).sort());
  for (const name of Object.keys(e)) assert.equal(e[name], v[name], `shared:${name}`);
});

test('the header, footer and chooser are styled only by their shared blocks', () => {
  for (const tool of tools) {
    // Outside the shared blocks, no rule may restyle the shared header classes or the chooser.
    // Each rule outside the blocks, from the start of its line, so a viewer-only rule that hides a
    // shared element inside a longer selector (#header .head-actions .head-btn) is not counted.
    const rest = '\n' + styleOf(tool).replace(/\/\* shared:(\w+)[\s\S]*?\/\* end shared:\1 \*\//g, '').split('\n').map(l => l.trim()).join('\n');
    for (const sel of ['#header {', '#header h1 {', '.head-sub', '.head-stats', '.head-btn', '.theme-btn', '#footer {', '.landing-advisory', '.landing-btn', '.leaflet-control-zoom']) {
      assert.ok(!rest.includes('\n' + sel), `${tool.name}: ${sel} outside the shared blocks`);
    }
    assert.ok(!/hdr-/.test(tool.html), `${tool.name}: the old hdr- classes`);
  }
});

test('both headers use the shared markup: titles, stats, actions, and the theme button by class', () => {
  for (const tool of tools) {
    assert.match(tool.html, /<div class="head-titles">/);
    assert.match(tool.html, /class="head-stats"/);
    assert.match(tool.html, /<div class="head-actions">/);
    assert.match(tool.html, /<button id="theme-btn" class="theme-btn" onclick="toggleTheme\(\)" title="Toggle light\/dark theme">◐<\/button>/);
  }
  assert.match(editor.html, /<button class="head-btn" onclick="toggleDropdown\('import-menu'\)">Load ▾<\/button>/);
  assert.match(editor.html, /<button class="head-btn btn-accent" id="save-btn"/);
  assert.match(viewer.html, /<button class="head-btn" onclick="openChooser\(\)">Load…<\/button>/);
});

test('both tools set color-scheme for the theme, so native controls follow it', () => {
  const theme = sharedBlocks(editor).theme;
  assert.match(theme, /:root \{\ncolor-scheme: light;/);
  assert.match(theme, /body\.dark \{\ncolor-scheme: dark;/);
});

test('the editor hides the header stats and the panel divider where they no longer fit', () => {
  assert.match(sharedBlocks(editor).header, /@media \(max-width: 900px\) \{\n\.head-sub, \.head-stats \{ display: none; \}/);
  assert.match(styleOf(editor), /@media \(max-width: 768px\) \{[^}]*\{[^}]*\}[^}]*\{[^}]*\}[^}]*\{[^}]*\}\s*#panel-divider \{ display: none; \}/);
  assert.match(sharedBlocks(editor).header, /#header h1 \{[^}]*overflow: hidden; text-overflow: ellipsis;/);
  assert.match(sharedBlocks(editor).header, /\.head-sub \{[^}]*text-overflow: ellipsis;/);
});

// ---------------------------------------------------------------------------------------------
// Contrast
// ---------------------------------------------------------------------------------------------

function parseColor(c) {
  c = c.trim();
  let m = c.match(/^#([0-9a-f]{6})$/i);
  if (m) return { rgb: [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255), a: 1 };
  m = c.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (m) return { rgb: [m[1], m[2], m[3]].map(v => v / 255), a: Number(m[4]) };
  throw new Error(`unreadable color ${c}`);
}
const over = (fg, bg) => {
  const f = typeof fg === 'string' ? parseColor(fg) : fg, b = typeof bg === 'string' ? parseColor(bg) : bg;
  return { rgb: f.rgb.map((v, i) => f.a * v + (1 - f.a) * b.rgb[i]), a: 1 };
};
const luminance = c => {
  const [r, g, b] = c.rgb.map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [luminance(typeof a === 'string' ? parseColor(a) : a), luminance(typeof b === 'string' ? parseColor(b) : b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
// The theme tokens, light and dark, from a style sheet's `:root` and `body.dark` rules (the editor's
// own tokens are in a second pair of rules after the shared block).
function tokens(tool) {
  const css = styleOf(tool);
  const read = sel => Object.fromEntries([...css.matchAll(new RegExp(`(?:^|\\n)\\s*${sel} \\{([^}]*)\\}`, 'g'))]
    .flatMap(m => [...m[1].matchAll(/--([\w-]+):\s*([^;]+);/g)].map(t => [t[1], t[2].trim()])));
  const light = read(':root');
  return { light, dark: { ...light, ...read('body\\.dark') } };
}

test('accent text on the pale accent tint meets 4.5:1 in both themes, in both tools', () => {
  for (const tool of tools) {
    for (const [name, t] of Object.entries(tokens(tool))) {
      const panel = over(t.panel, t.bg);
      for (const base of [t['panel-solid'], t.bg, panel]) {
        const tint = over(t['accent-soft'], base);
        assert.ok(ratio(t['accent-ink'], tint) >= 4.5, `${tool.name} ${name}: ${ratio(t['accent-ink'], tint).toFixed(2)}`);
      }
      assert.ok(ratio(t['panel-solid'], t.accent) >= 4.5, `${tool.name} ${name}: text on an accent hover`);
      assert.ok(ratio(t.muted, t.bg) >= 4.5 && ratio(t.muted, t['panel-solid']) >= 4.5, `${tool.name} ${name}: muted text`);
    }
  }
});

test('no rule sets the plain accent as text on the accent tint', () => {
  for (const tool of tools) {
    const rules = [...styleOf(tool).matchAll(/([^{}]+)\{([^}]*)\}/g)];
    const bad = rules.filter(m => /background:\s*var\(--accent-soft\)/.test(m[2]) && /(^|;|\s)color:\s*var\(--accent\)/.test(m[2])).map(m => m[1].trim());
    assert.deepEqual(bad, [], tool.name);
  }
  assert.match(styleOf(editor), /\.ch-era\.past \{ background: linear-gradient\(var\(--accent-soft\), var\(--accent-soft\)\), var\(--panel-solid\); color: var\(--accent-ink\); \}/);
  assert.match(styleOf(viewer), /\.info-chip \{[^}]*color: var\(--accent-ink\)/);
  assert.match(sharedBlocks(viewer).chooser, /\.landing-btn \.lb-title \{[^}]*color: var\(--accent-ink\)/);
});

test(`${EDITOR}: Rapid click ON, a danger hover, placeholders, the CURRENT chip and shaping rows meet 4.5:1`, () => {
  const css = styleOf(editor);
  assert.match(css, /#rapid-click-toggle\.active \{\s*background: var\(--success\); color: var\(--panel-solid\);/);
  assert.match(css, /\.btn-danger:hover \{ background: var\(--hazard\); color: var\(--panel-solid\); \}/);
  assert.match(css, /input::placeholder, textarea::placeholder \{ color: var\(--muted\); opacity: 1; \}/);
  assert.match(css, /tr\.shaping input\[type="text"\]:not\(\.coord\) \{ font-style: italic; color: var\(--muted\); \}/);
  assert.match(css, /\.ch-header:hover \.ch-num \{ color: var\(--accent-ink\); \}/);
  assert.match(css, /\.wpt-row-num:hover \{ color: var\(--accent-ink\); \}/);
  assert.match(css, /\.ch-sync\.pull:hover \{ background: linear-gradient\(var\(--accent-soft\), var\(--accent-soft\)\), var\(--panel-solid\);/);
  // The chips' tints are laid on the opaque panel color, so a hovered header leaves them as they are.
  const tint = re => css.match(re)[1];
  const chip = { light: tint(/\.ch-era\.current \{ background: linear-gradient\((rgba\([^)]*\)), \1\), var\(--panel-solid\);/),
                 dark: tint(/body\.dark \.ch-era\.current \{ background: linear-gradient\((rgba\([^)]*\)), \1\), var\(--panel-solid\);/) };
  for (const [name, t] of Object.entries(tokens(editor))) {
    const panel = over(t.panel, t.bg);
    assert.ok(ratio(t['panel-solid'], t.success) >= 4.5, `${name}: Rapid click ON`);
    assert.ok(ratio(t['panel-solid'], t.hazard) >= 4.5, `${name}: danger hover`);
    assert.ok(ratio(t.success, over(chip[name], t['panel-solid'])) >= 4.5, `${name}: CURRENT chip ${ratio(t.success, over(chip[name], t['panel-solid'])).toFixed(2)}`);
    assert.ok(ratio(t['accent-ink'], over(t['accent-soft'], t['panel-solid'])) >= 4.5, `${name}: PAST chip`);
    // A hovered chapter header and waypoint number: accent text on the hover tint.
    assert.ok(ratio(t['accent-ink'], over(t['row-hover'], panel)) >= 4.5, `${name}: hovered number ${ratio(t['accent-ink'], over(t['row-hover'], panel)).toFixed(2)}`);
    assert.ok(ratio(t.muted, over(t['shaping-bg'], panel)) >= 4.5, `${name}: shaping row`);
  }
});

// ---------------------------------------------------------------------------------------------
// Route casing
// ---------------------------------------------------------------------------------------------

for (const tool of tools) {
  test(`${tool.name}: a route's casing is 2 px wider, at a share of its opacity, dashed with it, and not clickable`, () => {
    const { casingStyle, CASING_OPACITY } = pick(tool, ['casingStyle', 'CASING_OPACITY']);
    assert.deepEqual(casingStyle({ weight: 3, opacity: 0.85 }, '#1d2b3a'), { color: '#1d2b3a', weight: 5, opacity: 0.85 * CASING_OPACITY, dashArray: null, interactive: false });
    assert.equal(casingStyle({ weight: 3, opacity: 0.9, dashArray: '4 4' }, '#eaf0f7').dashArray, '4 4');
    // A faded route (the editor's inactive chapters, the viewer's dimmed ones) gets no casing.
    assert.equal(casingStyle({ weight: 1.5, opacity: 0.35, dashArray: '4 4' }, '#eaf0f7').opacity, 0);
    assert.equal(casingStyle({ weight: 2, opacity: 0.25 }, '#eaf0f7').opacity, 0);
  });
}

test('the casing gives every route at least 3:1 against both basemaps', () => {
  // The CARTO tiles' luminance, from the review's measurements: about 0.956 for the light basemap and
  // 0.0196 for the dark one. A gray of each luminance stands in for the tiles.
  const gray = L => { const v = L <= 0.0031308 ? 12.92 * L : 1.055 * L ** (1 / 2.4) - 0.055; return { rgb: [v, v, v], a: 1 }; };
  const { CASING_OPACITY } = pick(viewer, ['CASING_OPACITY']);
  const t = tokens(viewer);
  for (const [name, tile] of [['light', gray(0.956)], ['dark', gray(0.0196)]]) {
    const ink = parseColor(t[name].ink);
    const casing = over({ rgb: ink.rgb, a: 0.85 * CASING_OPACITY }, tile);
    assert.ok(ratio(casing, tile) >= 3, `${name}: ${ratio(casing, tile).toFixed(2)}`);
  }
});

test(`${VIEWER}: every casing is drawn before the routes, styled with its route, and recolored with the theme`, () => {
  const src = viewer.defs.loadVoyageData;
  assert.ok(src.indexOf('casings[ch.num].push(L.polyline(') < src.indexOf('polylines[ch.num] = [];'), 'casings first');
  const styled = [];
  const { setChapterStyle } = pick(viewer, ['setChapterStyle'], {
    polylines: { 2: [{ setStyle: s => styled.push(['route', s]) }] }, casings: { 2: [{ setStyle: s => styled.push(['casing', s]) }] } });
  setChapterStyle(2, { weight: 5, opacity: 1 });
  setChapterStyle(2, { weight: 2, opacity: 0.25 });
  assert.deepEqual(styled, [['route', { weight: 5, opacity: 1 }], ['casing', { weight: 7, opacity: 0.6 }], ['route', { weight: 2, opacity: 0.25 }], ['casing', { weight: 4, opacity: 0 }]]);
  assert.match(viewer.defs.setBase, /casings\[k\]\.forEach\(c => c\.setStyle\(\{ color: ink \}\)\)/);
  const order = [];
  const item = (k, n) => ({ bringToFront: () => order.push(`${k}${n}`) });
  const { raiseChapterRoute } = pick(viewer, ['raiseChapterRoute'], {
    casings: { 3: [item('casing', 3)] }, polylines: { 3: [item('route', 3)] }, raiseChapterMarkers: n => order.push(`dots${n}`) });
  raiseChapterRoute(3);
  assert.deepEqual(order, ['casing3', 'route3', 'dots3']);
});

test(`${EDITOR}: each route is drawn over its casing`, () => {
  assert.match(editor.defs.updateMapChapter, /under\.push\(L\.polyline\(shiftLon\(seg, off\), casingStyle\(lineOpts, ink\)\)\);/);
  assert.match(editor.defs.updateMapChapter, /line = L\.layerGroup\(under\.concat\(parts\)\)\.addTo\(map\);/);
  assert.match(editor.defs.updateMapChapter, /const ink = getComputedStyle\(document\.body\)\.getPropertyValue\('--ink'\)\.trim\(\)/);
});

// ---------------------------------------------------------------------------------------------
// Framing
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
  test(`${tool.name}: a fit never zooms out so far that the world is shorter than the chart`, () => {
    const views = [];
    // A phone held upright: 390 px wide, 743 px of chart. The world is 743 px tall or more from zoom 2.
    const map = { ...mercator(743, 390), setView: (c, z) => views.push(z), getBoundsZoom: () => 0 };
    const { fitToCoords, fillMinZoom } = pick(tool, ['fitToCoords', 'fillMinZoom'], { map, L: { latLngBounds: boundsOf } });
    assert.equal(fillMinZoom(), 2);
    fitToCoords([[-40, -170], [60, 170]]);
    assert.deepEqual(views, [2]);
  });

  test(`${tool.name}: a fit with panels over the chart frames the points in the band between them`, () => {
    const views = [], pads = [];
    const map = { ...mercator(743, 390), setView: (c, z) => views.push([c[0], z]), getBoundsZoom: (b, inside, pad) => { pads.push(pad); return 7; } };
    const { fitToCoords } = pick(tool, ['fitToCoords'], { map, L: { latLngBounds: boundsOf } });
    fitToCoords([[36, 26], [38, 28]], false, { top: 100, bottom: 300 });
    assert.deepEqual(pads, [[80, 480]]);
    const [lat, z] = views[0];
    // The middle of the points is at the middle of the band: 100 px from the top, 300 from the bottom.
    const offset = map.project([37, 0], z).y - map.project([lat, 0], z).y;
    assert.ok(Math.abs(offset - (100 - 300) / 2) < 1, String(offset));
    views.length = 0;
    fitToCoords([[36, 26], [38, 28]], false);
    const mid = map.unproject([0, (map.project([36, 0], 7).y + map.project([38, 0], 7).y) / 2], 7).lat;
    assert.ok(Math.abs(views[0][0] - mid) < 1e-6, 'no insets, centered on the points');
  });
}

test(`${VIEWER}: the opening view of a globe-spanning voyage fills a phone's chart from top to bottom`, () => {
  const views = [], lons = [];
  const map = { ...mercator(743, 390), setView: (c, z) => { views.push(z); lons.push(c[1]); }, getBoundsZoom: () => 0 };
  const { fitVoyageOnLoad } = pick(viewer, ['fitVoyageOnLoad'], { map, L: { latLngBounds: boundsOf }, window: { innerWidth: 390 }, chartInsets: () => null, pointInView: () => true });
  const w = (lat, lon) => ({ name: 'P', lat, lon });
  fitVoyageOnLoad([
    { num: 1, era: 'past', waypoints: [w(36, 5), w(20, -60), w(-10, -140)] },
    { num: 2, era: 'current', waypoints: [w(-20, 170), w(-35, 120), w(-30, 40)] },
  ]);
  assert.deepEqual(views, [2]);
  // Heading west, the departure point (longitude 5) sits 12% in from the right edge: on a phone
  // Chart & Layers spans the top, so the full width is used. 360° is 1024 px at zoom 2.
  const expected = 5 - (390 * 0.88 - 195) * 360 / 1024;
  assert.ok(Math.abs(lons[0] - expected) < 1e-6, `${lons[0]} against ${expected}`);
});

// ---------------------------------------------------------------------------------------------
// Header tiles
// ---------------------------------------------------------------------------------------------

test('one header-tile builder serves both tools: the viewer\'s plain tiles, the editor\'s author view', () => {
  const h = { displayNm: 1234.4, totalNm: 1234.4, nations: 0, territories: 2, chapters: 3, namedWaypoints: 1, shapingVertices: 4,
    nmOverridden: true, nationsOverridden: true, territoriesOverridden: false };
  const fromEditor = pick(editor, ['heroItems']).heroItems, fromViewer = pick(viewer, ['heroItems']).heroItems;
  assert.deepEqual(fromViewer(h, 'nm', false), [['1,234', 'Nautical Miles', false], [2, 'Territories', false], [3, 'Chapters'], [1, 'Waypoint']]);
  assert.deepEqual(fromEditor(h, 'nm', true), [['1,234', 'Nautical Miles', true], [0, 'Nations', true], [2, 'Territories', false], [3, 'Chapters'], [1, 'Waypoint'], [4, 'Vertices']]);
  assert.deepEqual(fromEditor({ ...h, chapters: 0 }, 'km', false), fromViewer({ ...h, chapters: 0 }, 'km', false));
  assert.match(viewer.defs.loadVoyageData, /heroItems\(computeHeroStats\(DATA\.chapters, settings\), viewerUnit\(\), false\)/);
  assert.match(editor.defs.updateHeroStats, /heroTilesHTML\(heroItems\(h, distUnit\(\), true\)\)/);
});

// ---------------------------------------------------------------------------------------------
// The viewer on a phone, and its lists
// ---------------------------------------------------------------------------------------------

test(`${VIEWER}: Chart & Layers starts collapsed at 640 px and below`, () => {
  assert.match(viewer.js, /if \(window\.matchMedia\('\(max-width: 640px\), \(max-height: 560px\)'\)\.matches\) document\.getElementById\('filter'\)\.classList\.add\('collapsed'\);/);
});

test(`${VIEWER}: on a phone a chapter is framed clear of the panels over the chart`, () => {
  const rect = r => ({ getBoundingClientRect: () => r });
  const els = {
    filter: { offsetParent: {}, ...rect({ bottom: 160 }) },
    info: { classList: { contains: c => c === 'show' }, ...rect({ top: 500 }) },
  };
  const make = width => pick(viewer, ['chartInsets'], {
    window: { innerWidth: width }, document: { getElementById: id => els[id] },
    map: { getContainer: () => rect({ top: 60, bottom: 803 }) },
  }).chartInsets;
  assert.deepEqual(make(390)(), { top: 100, bottom: 303 });
  assert.equal(make(1024)(), null);
  const sel = viewer.defs.selectChapter;
  assert.ok(sel.indexOf("classList.add('show')") < sel.indexOf('fitToCoords(coords, true, chartInsets());'), 'the fit follows the detail panel');
});

test(`${VIEWER}: picking a chapter scrolls the legend and the drawer to its row`, () => {
  const { revealRow } = pick(viewer, ['revealRow']);
  const list = { offsetTop: 40, scrollTop: 0, clientHeight: 100 };
  revealRow(list, { offsetTop: 240, offsetHeight: 20 });
  assert.equal(list.scrollTop, 120); // the row's bottom (220 below the list's top) at the list's bottom
  revealRow(list, { offsetTop: 60, offsetHeight: 20 });
  assert.equal(list.scrollTop, 20);
  revealRow(list, { offsetTop: 80, offsetHeight: 20 });
  assert.equal(list.scrollTop, 20, 'a row already in view leaves the list where it is');
  assert.match(viewer.defs.selectChapter, /revealRow\(document\.getElementById\('legend-body'\), document\.getElementById\(`leg-\$\{num\}`\)\);/);
  assert.match(viewer.defs.selectChapter, /revealRow\(document\.getElementById\('drawer-body'\), document\.getElementById\(`dr-\$\{num\}`\)\);/);
});

test(`${VIEWER}: the detail and drawer close buttons carry a title`, () => {
  assert.match(viewer.html, /<button id="info-close" onclick="closeInfo\(\)" title="Close">×<\/button>/);
  assert.match(viewer.html, /<button id="drawer-close" onclick="toggleDrawer\(\)" title="Close">×<\/button>/);
});

// ---------------------------------------------------------------------------------------------
// The editor on narrow panels, and wording
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: a chapter name keeps the header's width on a narrow panel, with the full name as its title`, () => {
  assert.match(editor.defs.createChapterElement, /<div class="ch-title">\s*<span class="ch-name" title="\$\{esc\(ch\.name\)\}"><bdi>\$\{esc\(ch\.name\)\}<\/bdi><\/span>\s*<span class="ch-info">\s*<span class="ch-era/);
  assert.match(styleOf(editor), /\.ch-title \{[^}]*flex-wrap: wrap;/);
  assert.match(editor.defs.updateMeta, /el\.querySelector\('\.ch-name'\)\.title = ch\.name;/);
});

test(`${EDITOR}: Rapid click, the Load menu and the title field fit without wrapping or clipping`, () => {
  assert.match(styleOf(editor), /#rapid-click-toggle \{[^}]*white-space: nowrap; flex-shrink: 0;/);
  assert.match(styleOf(editor), /\.dropdown-menu button \{[^}]*white-space: nowrap;/);
  assert.match(editor.html, /<div class="meta-field full">\s*<label for="set-title">Voyage Title/);
});

test(`${EDITOR}: a season that starts and ends on the same date is written once`, () => {
  const { composeWhen } = pick(editor, ['composeWhen']);
  assert.equal(composeWhen('', '2034', '', '2034'), '2034');
  assert.equal(composeWhen('May', '2034', 'May', '2034'), 'May 2034');
  assert.equal(composeWhen('May', '2034', 'Sep', '2034'), 'May 2034 – Sep 2034');
  assert.equal(composeWhen('Nov', '2025', 'Mar', '2026'), 'Nov 2025 – Mar 2026');
  // Read back, a season written once fills both ends of the lists, so a later edit keeps its year.
  const { parseWhen } = pick(editor, ['parseWhen']);
  for (const [sm, sy, em, ey] of [['', '2034', '', '2034'], ['May', '2034', 'May', '2034'], ['May', '2034', 'Sep', '2034'], ['Nov', '2025', 'Mar', '2026']]) {
    const r = parseWhen(composeWhen(sm, sy, em, ey));
    assert.deepEqual([r.sm, r.sy, r.em, r.ey], [sm, sy, em, ey]);
  }
  const once = parseWhen('May 2034');
  assert.equal(composeWhen(once.sm, once.sy, 'Sep', once.ey), 'May 2034 – Sep 2034');
});

test(`${EDITOR}: dialog titles are in sentence case, and Delete chapter's button says Delete`, () => {
  const titles = [...editor.html.matchAll(/<h2(?: id="[^"]*")?>([^<]+)<\/h2>/g)].map(m => m[1]).filter(t => t !== 'Voyage Atlas');
  assert.ok(titles.length >= 6, titles.join(', '));
  for (const t of titles) assert.ok(!/ [A-Z][a-z]/.test(t.replace(/\bCSV\b/, '')), t);
  assert.match(editor.defs.deleteChapter, /confirmModal\('Delete chapter', [\s\S]*\}, 'Delete'\);\s*\}$/);
});

test('status and dialog text use an em dash, not a spaced hyphen; the notes and help read consistently', () => {
  assert.match(editor.defs.renderGeoStatus, /` — \$\{unresolved\} couldn't be resolved`/);
  assert.match(editor.defs.showLookupConfirm, /at about one per second — roughly/);
  assert.ok(!/<span class="adv-lead">Note:<\/span> [a-z]/.test(viewer.html), 'a note starts with a capital');
  assert.match(editor.html, /Adds a “Read the posts →” link to the viewer's detail panel\./);
  assert.match(viewer.html, />Read the posts →<\/a>/);
});

// ---------------------------------------------------------------------------------------------
// Fixes from the browser checks
// ---------------------------------------------------------------------------------------------

for (const tool of tools) {
  test(`${tool.name}: under a panel the view may reach past the world's edge, so a chapter far south stays in the band`, () => {
    const { chartCenterLat } = pick(tool, ['chartCenterLat'], { map: mercator(743, 390) });
    const y = lat => mercator(743, 390).project([lat, 0], 2).y;
    // Without insets the center is held so the chart's bottom edge stays on the world (y <= 1024 - 371.5).
    assert.ok(Math.abs(y(chartCenterLat(-60, 2)) - (1024 - 743 / 2)) < 1e-6);
    // With the bottom 311 px covered, it may go 311 px further, under the sheet.
    assert.ok(Math.abs(y(chartCenterLat(-85, 2, { top: 112, bottom: 311 })) - (1024 - 743 / 2 + 311)) < 1e-6);
    assert.ok(Math.abs(y(chartCenterLat(-60, 2, { top: 112, bottom: 311 })) - y(-60)) < 1e-6, 'within the wider range, not held');
    assert.equal(chartCenterLat(10, 2, { top: 112, bottom: 311 }), chartCenterLat(10, 2));
  });
}

test('the header stat labels are blocks of their own, so both headers are the same height', () => {
  assert.match(sharedBlocks(editor).header, /\.head-stats \.stat-lbl \{ display: block;/);
});

test(`${EDITOR}: the name column fits its placeholder, and on a phone the header menus open from the right end`, () => {
  assert.match(styleOf(editor), /\.wpt-table td\.col-name input \{ min-width: 124px; \}/);
  assert.match(styleOf(editor), /@media \(max-width: 640px\) \{\s*\.head-actions \{ position: relative; \}\s*\.head-actions \.dropdown \{ position: static; \}\s*\}/);
});

test(`${VIEWER}: the legend and drawer swatches carry a ring, as the routes carry a casing`, () => {
  assert.match(styleOf(viewer), /\.leg-sw \{[^}]*box-shadow: 0 0 0 1px var\(--muted\);/);
  assert.match(styleOf(viewer), /\.dr-sw \{[^}]*box-shadow: 0 0 0 1px var\(--muted\);/);
});
