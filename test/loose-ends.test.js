// v3.9.19: the loose ends the full review of v3.9.14 left open. The header's Waypoints figure counts
// places, not rows; a title of spaces is no title in both tools; the escaper covers the apostrophe;
// the KML tells Major from Gateway; and a phone held sideways keeps the selected chapter in view, with
// the sheet opening at its top and its close button in reach.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, pick } = require('./support.js');

const editor = loadTool(EDITOR);
const viewer = loadTool(VIEWER);
const W = (name, lat, lon) => ({ name, lat, lon, major: false, decision: false, gateway: false, country: '', notes: '' });
const chapter = (num, waypoints) => ({ num, name: `C${num}`, when: '', era: 'future', notes: '', padMultiplier: 1, countriesOverride: null, keyDestinations: [], blogUrl: null, waypoints });

for (const tool of [editor, viewer]) {
  test(`${tool.name}: the Waypoints figure counts a shared handoff once, and only named points with coordinates`, () => {
    const { computeHeroStats } = pick(tool, ['computeHeroStats']);
    const chapters = [
      chapter(1, [W('Kos', 36.9, 27.3), W('', 37, 27.5), W('Symi', 36.6, 27.8)]),
      chapter(2, [W('Symi', 36.6, 27.8), W('Rhodes', 36.4, 28.2), W('Not yet placed', null, null)]),
      // A gap: chapter 3 starts about 69 nm from Rhodes, where chapter 2's placed points end, so its
      // first point is a new place.
      chapter(3, [W('Kastellorizo', 36.15, 29.6), W('Kas', 36.2, 29.65)]),
      // Chapter 4 starts on an unnamed vertex at Kas: a vertex never counts as a waypoint.
      chapter(4, [W('', 36.2, 29.65), W('Fethiye', 36.6, 29.1)]),
      chapter(5, [W('Fethiye', 36.6, 29.1)]),
    ];
    const h = computeHeroStats(chapters, {});
    // Kos, Symi, Rhodes, Kastellorizo, Kas, Fethiye: 8 named rows with coordinates, Symi and Fethiye
    // each once.
    assert.equal(h.namedWaypoints, 6);
    assert.equal(h.shapingVertices, 2);
  });

  test(`${tool.name}: a handoff counts once only when both points are named and the gap rounds to 0 nm`, () => {
    const { computeHeroStats } = pick(tool, ['computeHeroStats']);
    const named = chapters => computeHeroStats(chapters, {}).namedWaypoints;
    const nm = 1 / 60; // a nautical mile of latitude, in degrees
    // The chapter before ends on an unnamed vertex: the next chapter's named first point is a place of its own.
    assert.equal(named([chapter(1, [W('A', 0, 0), W('', 1, 0)]), chapter(2, [W('B', 1, 0), W('C', 2, 0)])]), 3);
    assert.equal(named([chapter(1, [W('A', 0, 0), W('  ', 1, 0)]), chapter(2, [W('B', 1, 0), W('C', 2, 0)])]), 3);
    // Two names 0.4 nm apart round to 0 nm, as the 🔗 shows, and count once; 0.6 nm apart, both count.
    assert.equal(named([chapter(1, [W('A', 0, 0), W('Cove N', 1, 0)]), chapter(2, [W('Cove S', 1 + 0.4 * nm, 0), W('C', 2, 0)])]), 3);
    assert.equal(named([chapter(1, [W('A', 0, 0), W('B', 1, 0)]), chapter(2, [W('B', 1 + 0.6 * nm, 0), W('C', 2, 0)])]), 4);
    // An empty chapter between two that share a handoff is passed over.
    assert.equal(named([chapter(1, [W('A', 0, 0), W('B', 1, 0)]), chapter(2, []), chapter(3, [W('B', 1, 0), W('C', 2, 0)])]), 3);
    // A chapter of the one shared point: B once across all three.
    assert.equal(named([chapter(1, [W('A', 0, 0), W('B', 1, 0)]), chapter(2, [W('B', 1, 0)]), chapter(3, [W('B', 1, 0), W('C', 2, 0)])]), 3);
  });

  test(`${tool.name}: a title of only spaces reads as no title, and a title's own spaces are trimmed`, () => {
    const { readVoyage } = pick(tool, ['readVoyage']);
    assert.equal(readVoyage({ meta: { title: '   ' }, chapters: [] }).title, '');
    assert.equal(readVoyage({ meta: { title: '  S/Y Example  ' }, chapters: [] }).title, 'S/Y Example');
  });

  test(`${tool.name}: the escaper covers the apostrophe`, () => {
    const { esc } = pick(tool, ['esc']);
    assert.equal(esc(`Kirk's Anchorage <&> "x"`), 'Kirk&#39;s Anchorage &lt;&amp;&gt; &quot;x&quot;');
  });
}

test(`${EDITOR}: the KML gives Major a circle, distinct from Gateway's star`, () => {
  const files = [];
  const STATE = { metaTitle: 'T', settings: { distanceUnit: 'nm' },
    chapters: [chapter(1, [{ ...W('Hub', 1, 2), major: true }, { ...W('Gate', 1, 3), gateway: true }])] };
  pick(editor, ['exportKML'], { STATE, downloadFile: (n, body) => files.push(body), closeDropdowns() {}, announce() {} }).exportKML();
  const style = id => (files[0].match(new RegExp(`<Style id="${id}">[^]*?<href>([^<]+)</href>`)) || [])[1];
  assert.equal(style('major'), 'http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png');
  assert.equal(style('gateway'), 'http://maps.google.com/mapfiles/kml/paddle/grn-stars.png');
  assert.notEqual(style('major'), style('gateway'));
});

test(`${VIEWER}: picking a chapter opens the detail sheet at its top`, () => {
  const el = () => ({ style: {}, classList: { add() {}, toggle() {} }, textContent: '', innerHTML: '' });
  const info = { scrollTop: 65, shown: false, classList: { add(c) { if (c === 'show') info.shown = true; } } };
  const DATA = { chapters: [chapter(1, [W('Kos', 36.9, 27.3)]), chapter(2, [W('Symi', 36.6, 27.8)])] };
  const fns = pick(viewer, ['selectChapter'], {
    DATA, polylines: {}, wptMarkers: {}, raiseChapterRoute() {}, revealRow() {}, chartInsets: () => null, viewerUnit: () => 'nm',
    document: { getElementById: id => (id === 'info' ? info : el()), querySelectorAll: () => [] },
    fitToCoords: () => assert.equal(info.scrollTop, 0, 'the sheet is back at its top before the fit'),
  }, { lets: true });
  fns.selectChapter(2);
  assert.equal(info.scrollTop, 0);
  assert.ok(info.shown);
});

test(`${VIEWER}: the detail sheet's close button stays pinned to its top as it scrolls`, () => {
  assert.match(viewer.html, /#info-close \{ position: sticky; top: -7px; float: right; margin: -7px -6px -22px 0;/);
});

test(`${VIEWER}: on a phone held sideways the detail sheet is at most 96 px tall`, () => {
  const rule = viewer.html.match(/@media \(max-width: 640px\) and \(max-height: 560px\) \{([^]*?)\n {2}\}/);
  assert.ok(rule, 'the phone-sideways rule');
  assert.match(rule[1], /#info \{ max-height: min\(calc\(100% - 136px\), 96px\); \}/);
});
