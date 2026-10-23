// v3.10.0: a planned chapter's route is dashed in both tools, with a key in the viewer's Chart & Layers
// and in the editor's era chips (#72); each footer's version links to its own release (#48); the
// viewer's "Chart your own voyage" target is a self-hosting setting, and the head's addresses of the
// published site are marked for self-hosters (#75).

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, pick } = require('./support.js');

const editor = loadTool(EDITOR);
const viewer = loadTool(VIEWER);
const tools = [editor, viewer];
const wpt = (name, lat, lon) => ({ name, lat, lon, major: false, decision: false, gateway: false, country: '', notes: '' });

// A stand-in for any browser or Leaflet object the code only calls into: every property read and
// every call returns the same stand-in.
function chain() {
  const fn = function () { return proxy; };
  const proxy = new Proxy(fn, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k in t ? t[k] : proxy),
    set: (t, k, v) => { t[k] = v; return true; },
    apply: () => proxy,
  });
  return proxy;
}

for (const tool of tools) {
  test(`${tool.name}: a planned chapter's route is dashed with flat ends; a past or current one is solid`, () => {
    const { routeDash, casingStyle } = pick(tool, ['routeDash', 'casingStyle']);
    assert.deepEqual(routeDash({ era: 'future' }), { dashArray: '8 6', lineCap: 'butt' });
    assert.deepEqual(routeDash({ era: 'past' }), { dashArray: null, lineCap: 'round' });
    assert.deepEqual(routeDash({ era: 'current' }), { dashArray: null, lineCap: 'round' });
    // The casing is dashed with its route, so the gaps line up.
    const casing = casingStyle({ weight: 3, opacity: 0.85, ...routeDash({ era: 'future' }) }, '#1d2b3a');
    assert.equal(casing.dashArray, '8 6');
    assert.equal(casing.lineCap, 'butt');
    const { ROUTE_HIT_STYLE } = pick(tool, ['ROUTE_HIT_STYLE']);
    assert.deepEqual(ROUTE_HIT_STYLE, { weight: 8, opacity: 0 });
  });
}

// A stand-in for a Leaflet line that keeps its options and the events bound to it.
const recorder = (lines) => (ll, opts) => {
  const line = { opts, events: [], on(type) { this.events.push(type); return this; }, addTo() { return this; }, setStyle() { return this; } };
  lines.push(line);
  return line;
};
const INK = '#1d2b3a';
const sort = lines => ({
  casings: lines.filter(l => l.opts.color === INK),
  hits: lines.filter(l => l.opts.opacity === 0 && l.opts.weight === 8 && !l.opts.color),
  routes: lines.filter(l => l.opts.color && l.opts.color !== INK),
});

test(`${VIEWER}: planned routes and their casings are dashed, and a planned route answers the pointer in its gaps`, () => {
  const lines = [];
  const L = chain();
  L.polyline = recorder(lines);
  const doc = { createElement: () => chain(), getElementById: () => chain(), querySelector: () => chain(), body: chain() };
  const { loadVoyageData } = pick(viewer, ['loadVoyageData'], {
    document: doc, L, map: chain(), routesLayer: chain(), wptsLayer: chain(), pazLayer: chain(),
    decisionLayer: chain(), gatewayLayer: chain(), setTimeout() {}, window: { innerWidth: 1400 },
    selectChapter() {}, closeInfo() {}, closeDrawer() {}, fitVoyageOnLoad() {},
    getComputedStyle: () => ({ getPropertyValue: () => INK }),
    polylines: {}, casings: {}, wptMarkers: {}, DATA: null, activeNum: null,
  }, { prelude: '' });
  loadVoyageData({ meta: {}, chapters: [
    { num: 1, name: 'Sailed', era: 'past', waypoints: [wpt('A', 36, 28), wpt('B', 36.5, 27)] },
    { num: 2, name: 'Under way', era: 'current', waypoints: [wpt('B', 36.5, 27), wpt('C', 37, 26)] },
    { num: 3, name: 'Planned', era: 'future', waypoints: [wpt('C', 37, 26), wpt('D', 38, 25)] },
  ] });
  // Each route is drawn in three world copies, over a casing in each.
  const { casings, hits, routes } = sort(lines);
  assert.equal(routes.length, 9);
  assert.equal(casings.length, 9);
  assert.deepEqual(routes.map(l => l.opts.dashArray), [null, null, null, null, null, null, '8 6', '8 6', '8 6']);
  assert.deepEqual(casings.map(l => l.opts.dashArray), [null, null, null, null, null, null, '8 6', '8 6', '8 6']);
  assert.ok(routes.slice(6).every(l => l.opts.lineCap === 'butt'));
  // A solid route takes its own clicks and hovers; a dashed one hands them to a hit line over it.
  routes.slice(0, 6).forEach(l => assert.deepEqual(l.events, ['click', 'mouseover', 'mouseout']));
  routes.slice(6).forEach(l => { assert.equal(l.opts.interactive, false); assert.deepEqual(l.events, []); });
  assert.equal(hits.length, 3);
  hits.forEach(l => assert.deepEqual(l.events, ['click', 'mouseover', 'mouseout']));
});

test(`${EDITOR}: a planned chapter is dashed whether or not it is selected; an inactive one answers clicks in its gaps`, () => {
  const lines = [];
  const L = {
    polyline: recorder(lines), layerGroup: chain, point: (x, y) => ({ x, y }), divIcon: o => o,
    DomEvent: { stopPropagation() {} }, circleMarker: chain, marker: chain,
  };
  const STATE = { chapters: [
    { num: 1, era: 'past', waypoints: [wpt('A', 10, 10), wpt('B', 11, 11)] },
    { num: 2, era: 'future', waypoints: [wpt('B', 11, 11), wpt('C', 12, 12)] },
  ] };
  const fns = pick(editor, ['updateMapChapter'], {
    STATE, L, ghostClear: () => false, raiseChapterLayers() {}, document: {},
    map: { latLngToLayerPoint: ll => ({ x: ll[1], y: ll[0] }), layerPointToLatLng: p => ({ lat: p.y, lng: p.x }), removeLayer() {} },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
  }, { lets: true, expose: 'select: n => { activeChapterNum = n; }' });
  fns.select(2);
  fns.updateMapChapter(1);
  let drawn = sort(lines.splice(0));
  assert.ok(drawn.routes.every(l => l.opts.dashArray === null && l.opts.weight === 1.5 && l.opts.opacity === 0.35), 'an inactive past chapter is thinner and fainter, not dashed');
  assert.ok(drawn.routes.every(l => l.events.join() === 'click') && !drawn.hits.length, 'it takes its own clicks');
  fns.updateMapChapter(2);
  drawn = sort(lines.splice(0));
  assert.ok(drawn.routes.length && drawn.routes.every(l => l.opts.dashArray === '8 6' && l.opts.lineCap === 'butt' && !l.events.length), 'the selected planned chapter is dashed');
  assert.equal(drawn.hits.length, 0);
  fns.select(1);
  fns.updateMapChapter(2);
  drawn = sort(lines.splice(0));
  assert.ok(drawn.routes.every(l => l.opts.dashArray === '8 6' && l.opts.interactive === false), 'an inactive planned chapter is dashed');
  assert.equal(drawn.hits.length, 3);
  drawn.hits.forEach(l => assert.deepEqual(l.events, ['click']));
});

test(`${EDITOR}: changing a chapter's era updates its chip and redraws the chart`, () => {
  let redraws = 0;
  const chip = { innerHTML: '', className: '' };
  const el = { querySelector: sel => (sel === '.ch-era' ? chip : { textContent: '', title: '' }) };
  const STATE = { settings: { distanceUnit: 'nm' }, chapters: [{ num: 1, name: 'One', era: 'past', padMultiplier: 1, waypoints: [wpt('A', 0, 0), wpt('B', 0, 1)] }] };
  const { updateMeta } = pick(editor, ['updateMeta'], {
    STATE, document: { getElementById: () => el }, setDirty() {}, updateHeroStats() {}, updateMapAll: () => { redraws++; },
  });
  updateMeta(1, 'era', 'future');
  assert.equal(chip.innerHTML, '<span class="route-sample planned"></span>future');
  assert.equal(chip.className, 'ch-era future');
  assert.equal(redraws, 1);
  updateMeta(1, 'name', 'Renamed');
  assert.equal(redraws, 1, 'a rename leaves the chart alone');
});

test(`the viewer's avoidance zones and the editor's drag guides keep their own dashes`, () => {
  assert.match(viewer.defs.loadVoyageData, /L\.rectangle\([^;]*dashArray: '4 3'/);
  assert.match(editor.defs.onGhostDrag, /const lineOpts = \{ color: color, weight: 2, opacity: 0\.6, dashArray: '6 4' \};/);
});

test(`${EDITOR}: the era chip shows a sample of the chapter's route line, dashed when planned`, () => {
  const { eraChip } = pick(editor, ['eraChip']);
  assert.equal(eraChip('future'), '<span class="route-sample planned"></span>future');
  assert.equal(eraChip('past'), '<span class="route-sample"></span>past');
  assert.match(editor.defs.createChapterElement, /<span class="ch-era \$\{ch\.era\}">\$\{eraChip\(ch\.era\)\}<\/span>/);
});

test(`${VIEWER}: Chart & Layers carries the route key under the Routes toggle`, () => {
  assert.match(viewer.html, /<label class="toggle"><input type="checkbox" id="t-routes" checked> Routes<\/label>\s*<div class="route-key"><span><span class="route-sample"><\/span> Sailed or under way<\/span><span><span class="route-sample planned"><\/span> Planned<\/span><\/div>/);
  // The line samples, in the shared block, and the key's own layout, which nothing later hides.
  for (const tool of tools) {
    assert.match(tool.html, /\.route-sample \{ display: inline-block; width: 16px; height: 2px; background: currentColor; vertical-align: middle; \}/);
    assert.match(tool.html, /\.route-sample\.planned \{ background: repeating-linear-gradient\(90deg, currentColor 0 5px, transparent 5px 8px\); \}/);
  }
  assert.match(viewer.html, /\.route-key \{ display: flex; flex-wrap: wrap;/);
  assert.ok(!/\.route-(?:key|sample)[^{}]*\{[^}]*(?:display: none|visibility: hidden)/.test(viewer.html + editor.html));
});

for (const tool of tools) {
  test(`${tool.name}: the footer's version links to that version's release`, () => {
    const m = tool.html.match(/<span class="footer-ver"><a href="([^"]+)"[^>]*>Voyage Atlas(?: Editor)? (v\d+\.\d+\.\d+)<\/a><\/span>/);
    assert.ok(m, 'the footer version link');
    assert.equal(m[1], `https://github.com/Peter-Petrik/voyage-atlas/releases/tag/${m[2]}`);
  });

  test(`${tool.name}: the head marks its addresses of the published site for self-hosters`, () => {
    assert.match(tool.html, /<!-- Self-hosting: the canonical, og:url, og:image and twitter:image addresses name the published\n {5}site\. A self-hosted copy points them at its own address; the preview image is\n {5}docs\/voyage-atlas-preview\.webp in the repository\. -->\n<link rel="canonical"/);
  });
}

test(`${VIEWER}: the "Chart your own voyage" links open the editor set in the configuration block`, () => {
  const start = viewer.html.indexOf('/* ─── Configuration');
  const stmt = "document.querySelectorAll('#head-cta, .dr-of-cta').forEach(a => { a.href = URL_EDITOR; });";
  const end = viewer.html.indexOf(stmt, start) + stmt.length;
  assert.ok(start > 0 && end > start, 'the assignment follows the configuration block');
  assert.ok(end < viewer.html.indexOf('function tileUrl('), 'and comes first, before the rest of the script');
  const def = viewer.html.slice(start, end).match(/const URL_EDITOR = '([^']+)';/);
  assert.ok(def, 'URL_EDITOR in the configuration block');
  // Run the configuration block and the assignment as the page does.
  const run = src => {
    const links = [{ href: '' }, { href: '' }];
    new Function('document', 'window', src)({ querySelectorAll: sel => (sel === '#head-cta, .dr-of-cta' ? links : []) }, {});
    return links.map(a => a.href);
  };
  const src = viewer.html.slice(start, end);
  assert.deepEqual(run(src), [def[1], def[1]]);
  assert.deepEqual(run(src.replace(def[0], "const URL_EDITOR = 'https://example.test/editor/';")), ['https://example.test/editor/', 'https://example.test/editor/']);
  // The links in the markup carry the same default.
  const hrefs = [...viewer.html.matchAll(/<a (?:id="head-cta"|class="dr-of-cta") href="([^"]+)">Chart your own voyage →<\/a>/g)].map(x => x[1]);
  assert.deepEqual(hrefs, [def[1], def[1]]);
});

test(`${EDITOR}: the status line counts the chapter's rows`, () => {
  assert.match(editor.defs.renderStatus, /\$\{ch\.waypoints\.length === 1 \? 'row' : 'rows'\}/);
  assert.ok(!/'waypoints'/.test(editor.defs.renderStatus));
});

test('the backlog keeps GPX import and export open, and every closed item gives its reason', () => {
  const backlog = require('./support.js').readRepoFile('docs/voyage-atlas-enhancements.md');
  const section = title => backlog.split(/^## /m).find(s => s.startsWith(title));
  const nums = text => [...text.matchAll(/^### (\d+)\. /gm)].map(m => +m[1]);
  assert.deepEqual(nums(section('Open')), [17, 18]);
  const closed = section('Closed');
  assert.equal(nums(closed).length, 31);
  for (const item of closed.split(/^### /m).slice(1)) assert.match(item, /\n\n\*\*Closed:\*\* \S/, `#${item.split('.')[0]} gives its reason`);
  for (const n of [48, 72, 75]) assert.ok(!new RegExp(`^### ${n}\\. `, 'm').test(backlog), `#${n} shipped and is not listed`);
});
