// v3.11.0: GPX export and import in the editor (backlog #17 and #18). The export writes every named
// waypoint as a waypoint and each chapter as a route of all its points, shaping vertices included; the
// import reads tracks, routes and waypoints, thins tracks, places the file's waypoints along the route
// and adds the result as new chapters or in place of the selected chapter's waypoints.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, loadTool, pick, readRepoFile, findListener } = require('./support.js');

const editor = loadTool(EDITOR);
const W = (name, lat, lon, extra = {}) => Object.assign({ name, lat, lon, major: false, decision: false, gateway: false, country: '', notes: '' }, extra);
const C = (num, name, waypoints) => ({ num, name, when: '', era: 'future', notes: '', countriesOverride: null, keyDestinations: [], blogUrl: '', padMultiplier: 1.2, waypoints });

// ---------------------------------------------------------------------------------------------
// A small XML reader standing in for the browser's DOMParser: elements, attributes, text, CDATA,
// comments, processing instructions, a doctype and the XML entities. A document that is not well
// formed comes back holding a <parsererror> element, as the browser's does.
// ---------------------------------------------------------------------------------------------
class MiniDOMParser {
  parseFromString(text) {
    const ENT = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
    const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      if (!(e in ENT)) throw new Error('entity ' + e);
      return ENT[e];
    });
    const make = (qname, attrs) => {
      const el = { qname, localName: qname.includes(':') ? qname.split(':')[1] : qname, attrs, children: [], nodes: [],
        getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; },
        get textContent() { return this.nodes.map(n => (typeof n === 'string' ? n : n.textContent)).join(''); },
        getElementsByTagName(n) { const out = []; const walk = e => e.children.forEach(c => { if (c.qname === n) out.push(c); walk(c); }); walk(this); return out; } };
      return el;
    };
    const error = () => {
      const root = make('parsererror', {});
      return { documentElement: root, getElementsByTagName: n => (n === 'parsererror' ? [root] : []) };
    };
    try {
      const s = String(text);
      const stack = [], top = () => stack[stack.length - 1];
      let root = null, i = 0;
      while (i < s.length) {
        // The XML declaration is allowed only at the very start, as in the browser's parser.
        if (/^<\?xml\s/.test(s.slice(i, i + 6)) && i > 0) return error();
        if (s.startsWith('<?', i)) { const j = s.indexOf('?>', i); if (j < 0) return error(); i = j + 2; continue; }
        if (s.startsWith('<!--', i)) { const j = s.indexOf('-->', i); if (j < 0) return error(); i = j + 3; continue; }
        if (s.startsWith('<![CDATA[', i)) {
          const j = s.indexOf(']]>', i); if (j < 0 || !top()) return error();
          top().nodes.push(s.slice(i + 9, j)); i = j + 3; continue;
        }
        if (s.startsWith('<!', i)) { const j = s.indexOf('>', i); if (j < 0) return error(); i = j + 1; continue; }
        if (s[i] === '<') {
          const j = s.indexOf('>', i); if (j < 0) return error();
          const tag = s.slice(i + 1, j);
          i = j + 1;
          if (tag[0] === '/') {
            const el = stack.pop();
            if (!el || el.qname !== tag.slice(1).trim()) return error();
            continue;
          }
          const self = tag.endsWith('/');
          const body = self ? tag.slice(0, -1) : tag;
          const m = body.match(/^\s*([\w:.-]+)([\s\S]*)$/);
          if (!m) return error();
          const attrs = {};
          const rest = m[2].replace(/\s*([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g, (all, k, v, d, q) => { attrs[k] = decode(d !== undefined ? d : q); return ''; });
          if (rest.trim()) return error();
          const el = make(m[1], attrs);
          if (top()) { top().children.push(el); top().nodes.push(el); }
          else if (root) return error();
          else root = el;
          if (!self) stack.push(el);
          continue;
        }
        const j = s.indexOf('<', i), chunk = s.slice(i, j < 0 ? s.length : j);
        if (top()) top().nodes.push(decode(chunk));
        else if (chunk.trim()) return error();
        i = j < 0 ? s.length : j;
      }
      if (stack.length || !root) return error();
      return { documentElement: root, getElementsByTagName: n => (root.qname === n ? [root] : []).concat(root.getElementsByTagName(n)) };
    } catch (err) {
      return error();
    }
  }
}

const gpxFns = (globals = {}) => pick(editor, ['gpxText', 'readGPX', 'thinTrack', 'gpxTolerance', 'placeMarks', 'gpxChapters', 'gpxLegDistance', 'significanceOf'],
  Object.assign({ DOMParser: MiniDOMParser, STATE: { metaTitle: '', chapters: [] } }, globals));

// ---------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: the GPX export writes each named waypoint once and each chapter as a route of all its points`, () => {
  const STATE = { metaTitle: 'S/Y Test & Co', chapters: [
    C(1, 'Aegean <East>', [W('Kos', 36.9, 27.3, { major: true, notes: 'Fuel & water' }), W('', 36.95, 27.5, { notes: 'keep clear' }), W('Symi', 36.6, 27.8, { gateway: true, decision: true })]),
    C(2, 'Dodecanese', [W('Symi', 36.6, 27.8, { gateway: true, decision: true }), W('Rhodes', 36.4, 28.2), W('Not placed', null, null)]),
    C(3, 'Pacific', [W('Fiji', -17, 179.9), W('', -16.5, 190), W('Samoa', -14, -172)]),
    C(4, 'Plan', [W('Somewhere', null, null)]),
  ] };
  const { gpxText } = gpxFns({ STATE });
  const text = gpxText();
  const doc = new MiniDOMParser().parseFromString(text);
  assert.equal(doc.getElementsByTagName('parsererror').length, 0, 'a well-formed document');
  const root = doc.documentElement;
  assert.equal(root.qname, 'gpx');
  assert.equal(root.getAttribute('version'), '1.1');
  assert.equal(root.getAttribute('xmlns'), 'http://www.topografix.com/GPX/1/1');
  assert.deepEqual(root.children.map(c => c.qname), ['metadata', 'wpt', 'wpt', 'wpt', 'wpt', 'wpt', 'rte', 'rte', 'rte'],
    'metadata, then the waypoints (Symi once), then one route per chapter with coordinates');
  assert.equal(root.children[0].children[0].textContent, 'S/Y Test & Co');
  const wpts = root.children.filter(c => c.qname === 'wpt');
  assert.deepEqual(wpts.map(w => w.children.find(c => c.qname === 'name').textContent), ['Kos', 'Symi', 'Rhodes', 'Fiji', 'Samoa']);
  const kos = wpts[0];
  assert.deepEqual([kos.getAttribute('lat'), kos.getAttribute('lon')], ['36.9', '27.3']);
  assert.deepEqual(kos.children.map(c => [c.qname, c.textContent]), [['name', 'Kos'], ['desc', 'Fuel & water'], ['type', 'Major']]);
  assert.equal(wpts[1].children.find(c => c.qname === 'type').textContent, 'Decision, Gateway');
  const rtes = root.children.filter(c => c.qname === 'rte');
  assert.deepEqual(rtes.map(r => r.children[0].textContent), ['Ch 1 — Aegean <East>', 'Ch 2 — Dodecanese', 'Ch 3 — Pacific']);
  assert.deepEqual(rtes.map(r => r.children.filter(c => c.qname === 'rtept').length), [3, 2, 3], 'shaping vertices included, unplaced rows left out');
  const vertex = rtes[0].children.filter(c => c.qname === 'rtept')[1];
  assert.deepEqual(vertex.children.map(c => c.qname), ['desc'], 'a shaping vertex has no name, and keeps its notes');
  assert.equal(rtes[2].children.filter(c => c.qname === 'rtept')[1].getAttribute('lon'), '-170', 'longitudes are written within -180 to 180');
});

test(`${EDITOR}: the GPX export escapes names and notes, writes 180° as -180 and names a nameless chapter`, () => {
  const odd = `Tom's "Bay" & <Cove> ]]> \u0007end`;
  const STATE = { metaTitle: '', chapters: [C(1, '', [W(odd, 10, 179.9999999996, { notes: odd }), W('B', 10.5, 20)])] };
  const { gpxText, readGPX, gpxChapters } = gpxFns({ STATE });
  const text = gpxText();
  assert.ok(!text.includes('\u0007') && !text.includes(']]>') && !text.includes(`"Bay"`), 'escaped');
  const doc = new MiniDOMParser().parseFromString(text);
  assert.equal(doc.getElementsByTagName('parsererror').length, 0);
  const wpt = doc.documentElement.children.find(c => c.qname === 'wpt');
  assert.equal(wpt.children[0].textContent, `Tom's "Bay" & <Cove> ]]> end`);
  assert.equal(wpt.getAttribute('lon'), '-180', 'a longitude that rounds to 180 is written as -180');
  const gpx = readGPX(text);
  const out = gpxChapters(gpx, { selected: [0], tolerance: 1, marks: true, each: false, fileName: 'f' });
  assert.equal(out[0].name, 'Voyage Atlas', 'a chapter with no name comes back named after the file (its metadata name), not "Ch 1 —"');
  assert.deepEqual(out[0].points.map(p => p.name), [`Tom's "Bay" & <Cove> ]]> end`, 'B']);
});

test(`${EDITOR}: the GPX export writes two places that share a name as two waypoints`, () => {
  const STATE = { metaTitle: '', chapters: [C(1, 'Bays', [W('Anchorage', 36.9, 27.3), W('Anchorage', 37.2, 26.8)])] };
  const { gpxText } = gpxFns({ STATE });
  const wpts = new MiniDOMParser().parseFromString(gpxText()).documentElement.children.filter(c => c.qname === 'wpt');
  assert.deepEqual(wpts.map(w => [w.getAttribute('lat'), w.getAttribute('lon')]), [['36.9', '27.3'], ['37.2', '26.8']]);
});

test(`${EDITOR}: the GPX export downloads as voyage-route.gpx and is announced`, () => {
  const calls = [];
  const fns = pick(editor, ['exportGPX'], {
    STATE: { metaTitle: '', chapters: [C(1, 'One', [W('A', 1, 2), W('B', 1, 3)])] },
    closeDropdowns() {}, announce: (k, f) => calls.push(['announce', k, f]), downloadFile: (n, body, type) => calls.push(['download', n, type, body.length > 0]),
  });
  fns.exportGPX();
  assert.deepEqual(calls, [['announce', 'export', 'gpx'], ['download', 'voyage-route.gpx', 'application/gpx+xml', true]]);
});

// ---------------------------------------------------------------------------------------------
// Reading a GPX file
// ---------------------------------------------------------------------------------------------

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<!-- written by a chartplotter -->
<gpx version="1.1" creator="Plotter" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Summer 2027</name></metadata>
  <wpt lat="36.5" lon="27.5"><name>Anchorage &amp; cove</name><desc><![CDATA[Good holding <sand>]]></desc><type>Gateway</type></wpt>
  <wpt lat="95" lon="27"><name>Too far north</name></wpt>
  <rte><name>Plan A</name><rtept lat="36.0" lon="27.0"><name>Start</name></rtept><rtept lat="36.1" lon="27.1"/><rtept lat="x" lon="27.2"/></rte>
  <trk><name>Day 1</name>
    <trkseg><trkpt lat="36.2" lon="27.2"><name>0001</name><time>2027-06-01T08:00:00Z</time></trkpt><trkpt lat="36.3" lon="27.3"/></trkseg>
    <trkseg><trkpt lat="36.4" lon="190"/></trkseg>
  </trk>
  <trk><name>Empty</name><trkseg><trkpt lat="" lon="1"/></trkseg></trk>
</gpx>`;

test(`${EDITOR}: a GPX file is read as its tracks and routes in file order and its waypoints`, () => {
  const { readGPX } = gpxFns();
  const gpx = readGPX(SAMPLE);
  assert.equal(gpx.name, 'Summer 2027');
  assert.equal(gpx.skipped, 3, 'the point beyond 90°, the unreadable latitude and the empty one');
  assert.deepEqual(gpx.parts.map(p => [p.kind, p.name, p.points.length]), [['route', 'Plan A', 2], ['track', 'Day 1', 3]], 'a track left with no points is dropped');
  assert.deepEqual(gpx.parts[0].points.map(p => p.name), ['Start', '']);
  assert.deepEqual(gpx.parts[1].points.map(p => [p.name, p.lat, p.lon]), [['', 36.2, 27.2], ['', 36.3, 27.3], ['', 36.4, -170]], 'segments joined; track points unnamed; longitude brought into range');
  assert.equal(gpx.marks.length, 1);
  assert.deepEqual([gpx.marks[0].name, gpx.marks[0].notes, gpx.marks[0].gateway, gpx.marks[0].major], ['Anchorage & cove', 'Good holding <sand>', true, false]);
});

test(`${EDITOR}: a GPX file is read with space before its declaration, points outside a segment, notes in cmt and rounding`, () => {
  const { readGPX } = gpxFns();
  const gpx = readGPX(`\n  <?xml version="1.0"?><gpx version="1.1"><wpt lat="36.1234567" lon="+27.0000049"><name>N</name><cmt>From cmt</cmt></wpt>
    <wpt lat="1" lon="2"><name>  </name></wpt><wpt lat="1" lon="2"><desc>no name</desc></wpt>
    <trk><name>T</name><trkseg><trkpt lat="1" lon="1"/></trkseg><trkpt lat="2" lon="2"/></trk></gpx>`);
  assert.ok(gpx, 'read');
  assert.deepEqual(gpx.marks.map(m => [m.name, m.lat, m.lon, m.notes]), [['N', 36.12346, 27, 'From cmt']], 'waypoints without a name are left out; coordinates to five places');
  assert.deepEqual(gpx.parts[0].points.map(p => [p.lat, p.lon]), [[1, 1], [2, 2]]);
});

test(`${EDITOR}: GPX 1.0 and a prefixed GPX file read the same; anything else is not GPX`, () => {
  const { readGPX } = gpxFns();
  const v10 = readGPX('<gpx version="1.0" xmlns="http://www.topografix.com/GPX/1/0"><rte><rtept lat="1" lon="2"/><rtept lat="1.5" lon="2.5"/></rte></gpx>');
  assert.equal(v10.parts[0].points.length, 2);
  const prefixed = readGPX('<g:gpx xmlns:g="http://www.topografix.com/GPX/1/1"><g:wpt lat="1" lon="2"><g:name>P</g:name></g:wpt></g:gpx>');
  assert.equal(prefixed.marks[0].name, 'P');
  assert.equal(readGPX('<kml xmlns="http://www.opengis.net/kml/2.2"><Document/></kml>'), null);
  assert.equal(readGPX('<gpx><wpt lat="1" lon="2"></gpx>'), null, 'a malformed file');
  assert.equal(readGPX('{"meta":{}}'), null);
  assert.equal(readGPX(''), null);
});

// ---------------------------------------------------------------------------------------------
// Thinning
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: a track is thinned to a tolerance in nautical miles, keeping its ends`, () => {
  const { thinTrack, gpxTolerance } = gpxFns();
  const line = Array.from({ length: 101 }, (_, k) => W('', 10 + k / 60, 20));  // a meridian, a point each mile
  assert.equal(thinTrack(line, 0.01).length, 2, 'points on the leg are dropped');
  // A zigzag a mile either side of the meridian: each turn is kept at a tolerance below a mile, none above.
  const zig = Array.from({ length: 21 }, (_, k) => W('', 10 + k * 5 / 60, 20 + (k % 2 ? 1 : -1) / 60 / Math.cos(10 * Math.PI / 180)));
  assert.equal(thinTrack(zig, 0.5).length, 21);
  assert.equal(thinTrack(zig, 3).length, 2);
  // Across the dateline the legs are measured the short way round. Along a parallel the track bows
  // about 0.15 nm from the great circle between its ends, so a tolerance above that keeps the ends alone.
  const cross = Array.from({ length: 41 }, (_, k) => W('', -17, ((179 + k / 20 + 180) % 360) - 180));
  assert.equal(thinTrack(cross, 0.1).length, 3);
  const kept = thinTrack(cross, 0.5);
  assert.deepEqual(kept.map(p => p.lon), [179, -179]);
  assert.equal(thinTrack(line, 0).length, 101, 'no tolerance keeps every point');
  // A point exactly at the tolerance is dropped, as plain Douglas-Peucker drops it.
  const tri = [W('', 10, 20), W('', 10.05, 20.05), W('', 10, 20.1)];
  const exact = gpxFns().significanceOf(tri)[1];
  assert.equal(thinTrack(tri, exact).length, 2);
  assert.equal(thinTrack(tri, exact * 0.999).length, 3);
  assert.equal(thinTrack(line.slice(0, 2), 5).length, 2);
  assert.ok(Math.abs(gpxTolerance(0) - 10) < 1e-9 && Math.abs(gpxTolerance(100) - 0.01) < 1e-9);
  assert.ok(Math.abs(gpxTolerance(50) - Math.pow(10, -0.5)) < 1e-9);
});

test(`${EDITOR}: thinning at any tolerance keeps the points plain Douglas-Peucker keeps, and a straight track is quick`, () => {
  const { thinTrack, gpxLegDistance } = gpxFns();
  const dp = (pts, tol) => {
    const keep = new Set([0, pts.length - 1]);
    const run = (i, j) => {
      let worst = -1, at = -1;
      for (let k = i + 1; k < j; k++) { const d = gpxLegDistance(pts[k], pts[i], pts[j]).nm; if (d > worst) { worst = d; at = k; } }
      if (at >= 0 && worst > tol) { keep.add(at); run(i, at); run(at, j); }
    };
    run(0, pts.length - 1);
    return pts.filter((p, k) => keep.has(k));
  };
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const walk = Array.from({ length: 400 }, (_, k) => W('', 40 + k / 200 + (rnd() - 0.5) / 100, 10 + Math.sin(k / 30) / 10 + (rnd() - 0.5) / 100));
  for (const tol of [0.01, 0.05, 0.2, 1, 5]) assert.deepEqual(thinTrack(walk, tol), dp(walk, tol), `at ${tol} nm`);
  const straight = Array.from({ length: 200000 }, (_, k) => W('', 10 + k / 60000, 20));
  const t0 = Date.now();
  assert.equal(thinTrack(straight, 0.01).length, 2);
  assert.ok(Date.now() - t0 < 2000, `${Date.now() - t0} ms`);
});

// A track whose farthest point is always near the end of its leg (a zigzag growing along the way)
// is thinned quickly, and at every tolerance each dropped point lies within it of the leg that
// replaces it, the points kept at a coarser tolerance being kept at every finer one.
test(`${EDITOR}: a track that would split a point at a time is thinned quickly and within the tolerance`, () => {
  const { thinTrack, gpxLegDistance } = gpxFns();
  const n = 20000;
  const growing = Array.from({ length: n }, (_, k) => W('', 36 + (k % 2 ? 1 : -1) * (k / n) * 0.1, 27 + k / n));
  const t0 = Date.now();
  const kept = [10, 1, 0.3, 0.05, 0.01].map(tol => [tol, thinTrack(growing, tol)]);
  assert.ok(Date.now() - t0 < 5000, `${Date.now() - t0} ms`);
  const index = new Map(growing.map((p, k) => [p, k]));
  let coarser = null;
  kept.forEach(([tol, pts]) => {
    const at = pts.map(p => index.get(p));
    for (let s = 0; s < at.length - 1; s++) {
      for (let k = at[s] + 1; k < at[s + 1]; k++) {
        const d = gpxLegDistance(growing[k], growing[at[s]], growing[at[s + 1]]).nm;
        assert.ok(d <= tol + 1e-9, `point ${k} is ${d} nm from its leg at ${tol} nm`);
      }
    }
    if (coarser) { const now = new Set(pts); assert.ok(coarser.every(p => now.has(p)), `the points kept coarser than ${tol} nm are kept`); }
    coarser = pts;
  });
});

// ---------------------------------------------------------------------------------------------
// Placing the file's waypoints
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: a file's waypoints join a matching point or go into the leg they lie nearest`, () => {
  const { placeMarks } = gpxFns();
  const route = () => [W('A', 10, 20), W('', 10, 21), W('C', 10, 22)];
  // At an unnamed point: it takes the name, notes and flags.
  let out = placeMarks(route(), [W('Bay', 10.0001, 21, { notes: 'n', major: true })]);
  assert.deepEqual(out.map(p => p.name), ['A', 'Bay', 'C']);
  assert.ok(out[1].major && out[1].notes === 'n');
  // At a point of the same name: no double.
  out = placeMarks(route(), [W('c', 10, 22, { gateway: true })]);
  assert.deepEqual(out.map(p => p.name), ['A', '', 'C']);
  assert.ok(out[2].gateway);
  // Another name at the same spot goes beside it; off the route, into the nearest leg.
  out = placeMarks(route(), [W('Other', 10, 20), W('Mid', 10.2, 21.5)]);
  assert.deepEqual(out.map(p => p.name), ['A', 'Other', '', 'Mid', 'C']);
  // Beyond either end.
  out = placeMarks(route(), [W('Before', 10, 19), W('After', 10, 23)]);
  assert.deepEqual(out.map(p => p.name), ['Before', 'A', '', 'C', 'After']);
  // Two waypoints in one leg keep their order along it.
  out = placeMarks(route(), [W('Second', 10, 20.8), W('First', 10, 20.2)]);
  assert.deepEqual(out.map(p => p.name), ['A', 'First', 'Second', '', 'C']);
  // The same name within 0.05 nm wins over a nearer point with another name.
  out = placeMarks([W('A', 10, 20), W('Kos', 10.0003, 20), W('C', 10, 21)], [W('Kos', 10.00015, 20)]);
  assert.deepEqual(out.map(p => p.name), ['A', 'Kos', 'C']);
  // Farther than 0.05 nm from a point of the same name, it is a place of its own.
  out = placeMarks(route(), [W('C', 10, 22 + 0.1 / 60 / Math.cos(10 * Math.PI / 180))]);
  assert.deepEqual(out.map(p => p.name), ['A', '', 'C', 'C']);
  // A point's own notes are kept.
  out = placeMarks([W('A', 10, 20, { notes: 'mine' }), W('C', 10, 22)], [W('A', 10, 20, { notes: 'theirs', decision: true })]);
  assert.equal(out[0].notes, 'mine');
  assert.ok(out[0].decision);
  // Several beyond an end come in order along the route: before the start the farthest first, after
  // the end the nearest first, whatever the file's order.
  out = placeMarks(route(), [W('Near', 10, 19.5), W('Far', 10, 19)]);
  assert.deepEqual(out.map(p => p.name), ['Far', 'Near', 'A', '', 'C']);
  out = placeMarks(route(), [W('Far', 10, 23), W('Near', 10, 22.5)]);
  assert.deepEqual(out.map(p => p.name), ['A', '', 'C', 'Near', 'Far']);
  // With one point or none.
  assert.deepEqual(placeMarks([W('A', 1, 1)], [W('B', 2, 2)]).map(p => p.name), ['A', 'B']);
  assert.deepEqual(placeMarks([], [W('B', 2, 2), W('C', 3, 3)]).map(p => p.name), ['B', 'C']);
});

// ---------------------------------------------------------------------------------------------
// The chapters an import makes
// ---------------------------------------------------------------------------------------------

const TWO = `<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="10" lon="21"><name>Mid one</name></wpt>
  <wpt lat="20" lon="31"><name>Mid two</name></wpt>
  <rte><name>Ch 3 — Leg one</name><rtept lat="10" lon="20"><name>A</name></rtept><rtept lat="10" lon="22"><name>B</name></rtept></rte>
  <trk><name>Leg two</name><trkseg>${Array.from({ length: 50 }, (_, k) => `<trkpt lat="20" lon="${30 + k / 25}"/>`).join('')}</trkseg></trk>
</gpx>`;

test(`${EDITOR}: an import makes one chapter of the chosen parts, or one chapter each`, () => {
  const { readGPX, gpxChapters } = gpxFns();
  const gpx = readGPX(TWO);
  const base = { selected: [0, 1], tolerance: 0.5, marks: true, each: false, fileName: 'trip' };
  let out = gpxChapters(gpx, base);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, 'trip', 'two parts joined take the file name');
  assert.deepEqual(out[0].points.filter(p => p.name).map(p => p.name), ['A', 'Mid one', 'B', 'Mid two']);
  assert.equal(out[0].points.length, 2 + 2 + 2, 'a straight track thinned to its ends');
  out = gpxChapters(gpx, Object.assign({}, base, { each: true }));
  assert.deepEqual(out.map(g => [g.name, g.points.filter(p => p.name).map(p => p.name)]),
    [['Leg one', ['A', 'Mid one', 'B']], ['Leg two', ['Mid two']]], 'each waypoint goes to the part it lies nearest; "Ch 3 — " is dropped from the name');
  out = gpxChapters(gpx, Object.assign({}, base, { selected: [1], marks: false }));
  assert.deepEqual(out.map(g => [g.name, g.points.length]), [['Leg two', 2]]);
  out = gpxChapters(gpx, Object.assign({}, base, { selected: [1], tolerance: 0 }));
  assert.equal(out[0].points.length, 51, 'every track point, and the nearer waypoint');
  out = gpxChapters(gpx, Object.assign({}, base, { selected: [] }));
  assert.deepEqual(out.map(g => g.points.map(p => p.name)), [['Mid one', 'Mid two']], 'the waypoints alone, in file order');
  assert.deepEqual(gpxChapters(gpx, Object.assign({}, base, { selected: [], marks: false })), []);
  // The parts read from the file are left as they were.
  assert.equal(gpx.parts[0].points[0].name, 'A');
  assert.equal(gpx.marks.length, 2);
});

test(`${EDITOR}: an import leaves the file as read, and a waypoint already in the route or given twice comes in once`, () => {
  const { readGPX, gpxChapters } = gpxFns();
  const gpx = readGPX(`<gpx version="1.1"><wpt lat="10" lon="21"><name>Bay</name></wpt><wpt lat="10" lon="21"><name>Bay</name></wpt>
    <wpt lat="10" lon="22"><name>B</name></wpt>
    <rte><rtept lat="10" lon="20"><name>A</name></rtept><rtept lat="10" lon="21"/><rtept lat="10" lon="22"><name>B</name></rtept></rte></gpx>`);
  const opts = { selected: [0], tolerance: 1, marks: true, each: false, fileName: 'f' };
  const first = JSON.stringify(gpxChapters(gpx, opts));
  assert.deepEqual(JSON.parse(first)[0].points.map(p => p.name), ['A', 'Bay', 'B'], 'the two Bays name the unnamed point once; B is already there');
  assert.equal(gpx.parts[0].points[1].name, '', 'the point read from the file keeps no name');
  assert.equal(JSON.stringify(gpxChapters(gpx, opts)), first, 'a second run gives the same chapters');
});

test(`${EDITOR}: a place visited twice keeps each visit's notes and flags through export and import`, () => {
  const home = (extra) => W('Home', 40, 10, extra);
  const cases = {
    'a loop chapter': [C(1, 'Loop', [home({}), W('Cove', 40.5, 10.5), home({ notes: 'Return', decision: true })])],
    'start and end of two chapters': [C(1, 'Out', [home({}), W('Isle', 41, 11)]), C(2, 'Back', [W('Isle', 41, 11), home({ notes: 'Season ends', major: true })])],
  };
  const shape = w => [w.name, w.lat, w.lon, w.notes, w.major, w.decision, w.gateway];
  for (const [label, chapters] of Object.entries(cases)) {
    const { gpxText, readGPX, gpxChapters } = gpxFns({ STATE: { metaTitle: '', chapters } });
    const gpx = readGPX(gpxText());
    const out = gpxChapters(gpx, { selected: gpx.parts.map((p, k) => k), tolerance: 1, marks: true, each: true, fileName: 'f' });
    assert.deepEqual(out.map(g => g.points.map(shape)), chapters.map(ch => ch.waypoints.map(shape)), label);
  }
});

test(`${EDITOR}: the sample voyage exported to GPX and imported one chapter each comes back the same`, () => {
  const { readVoyage } = pick(editor, ['readVoyage']);
  const v = readVoyage(JSON.parse(readRepoFile('voyage-data.json')));
  const STATE = { metaTitle: v.title, chapters: v.chapters };
  const { gpxText, readGPX, gpxChapters } = gpxFns({ STATE });
  const gpx = readGPX(gpxText());
  const out = gpxChapters(gpx, { selected: gpx.parts.map((p, k) => k), tolerance: 1, marks: true, each: true, fileName: 'x' });
  const placed = v.chapters.filter(ch => ch.waypoints.some(w => Number.isFinite(w.lat) && Number.isFinite(w.lon)));
  assert.deepEqual(out.map(g => g.name), placed.map(ch => ch.name));
  const r5 = n => Math.round(n * 1e5) / 1e5;
  const shape = w => [w.name, r5(w.lat), r5(w.lon), w.major, w.decision, w.gateway, w.notes];
  out.forEach((g, k) => assert.deepEqual(g.points.map(shape), placed[k].waypoints.filter(w => Number.isFinite(w.lat) && Number.isFinite(w.lon)).map(shape), placed[k].name));
});

// ---------------------------------------------------------------------------------------------
// Import into the voyage
// ---------------------------------------------------------------------------------------------

function importRig(state, choices) {
  const calls = [], els = {};
  const el = id => els[id] || (els[id] = { id, value: '', checked: false, textContent: '', disabled: false, style: {}, classList: { add() {}, remove() {} } });
  el('gpx-detail').value = choices.detail === undefined ? 50 : choices.detail;
  el('gpx-marks').checked = choices.marks !== false;
  el('gpx-split-each').checked = !!choices.each;
  el('gpx-into-replace').checked = !!choices.replace;
  const picks = (choices.selected || []).map(k => ({ checked: true, dataset: { k: String(k) } }));
  const document = { getElementById: el, querySelectorAll: sel => (sel === '#gpx-list .gpx-pick' ? picks : []) };
  const fns = pick(editor, ['doGPXImport'], Object.assign({
    STATE: state, document, DOMParser: MiniDOMParser,
    setDirty: v => calls.push(['dirty', v]), noteFirstEdit: () => calls.push(['firstedit']), announce: (k, f) => calls.push(['announce', k, f]),
    renderAllChapters: () => calls.push(['render']), selectChapter: n => calls.push(['select', n]),
    confirmModal: (title, msg, ok, okLabel, cancelLabel, safe) => calls.push(['confirm', msg, okLabel, cancelLabel, safe, ok]),
  }, choices.globals || {}), { lets: true, expose: 'set: (g, a, sel) => { gpxImport = g; activeChapterNum = a; if (sel) { selectedChapterNum = sel[0]; selectedWpt = sel[1]; } }, ' +
    'state: () => ({ gpxImport, selectedWpt, selectedChapterNum })' });
  return { fns, calls, el };
}

test(`${EDITOR}: an import adds new chapters at the end with the defaults of a new chapter`, () => {
  const STATE = { chapters: [C(1, 'Old', [W('X', 0, 0)])] };
  const { readGPX } = gpxFns();
  const { fns, calls, el } = importRig(STATE, { selected: [0, 1], each: true });
  fns.set({ fileName: 'trip', gpx: readGPX(TWO) }, 1);
  fns.doGPXImport();
  assert.deepEqual(STATE.chapters.map(c => [c.num, c.name, c.era, c.padMultiplier]), [[1, 'Old', 'future', 1.2], [2, 'Leg one', 'future', 1.2], [3, 'Leg two', 'future', 1.2]]);
  assert.deepEqual(calls.filter(c => c[0] !== 'confirm'), [['dirty', true], ['firstedit'], ['announce', 'import', 'gpx'], ['render'], ['select', 2]]);
  assert.match(el('status-text').textContent, /^Imported \d+ points from trip\.gpx as 2 new chapters$/);
  assert.equal(fns.state().gpxImport, null, 'the dialog is closed');
});

test(`${EDITOR}: replacing the selected chapter's waypoints asks first, and changes nothing until confirmed`, () => {
  const old = [W('X', 0, 0), W('Y', 0, 1)];
  const STATE = { chapters: [C(1, 'Mine', old)] };
  const { readGPX } = gpxFns();
  const gpx = readGPX(SAMPLE);
  const { fns, calls, el } = importRig(STATE, { selected: [0, 1], replace: true, each: true });
  fns.set({ fileName: 'day', gpx }, 1, [1, 1]);
  fns.doGPXImport();
  const confirm = calls.find(c => c[0] === 'confirm');
  assert.ok(confirm, 'a confirmation');
  assert.match(confirm[1], /^Replace the 2 rows of Chapter 1: Mine with \d+ points from day\.gpx\?$/);
  assert.deepEqual(confirm.slice(2, 5), ['Replace', 'Keep them', true]);
  assert.equal(STATE.chapters[0].waypoints, old, 'unchanged before the answer');
  confirm[5]();
  assert.equal(STATE.chapters.length, 1, 'replace joins the chosen parts into the one chapter');
  assert.deepEqual(STATE.chapters[0].waypoints.filter(w => w.name).map(w => w.name), ['Start', 'Anchorage & cove']);
  assert.match(el('status-text').textContent, /^Imported \d+ points from day\.gpx into Chapter 1; 3 without usable coordinates skipped$/);
  assert.deepEqual([fns.state().selectedChapterNum, fns.state().selectedWpt], [null, null], 'the old row selection is cleared');
});

// Replace joins the chosen parts even with One chapter each ticked, so a waypoint lying on the leg
// between the end of one part and the start of the next goes there, not into the part nearest it.
test(`${EDITOR}: replacing with One chapter each ticked still joins the parts, and places waypoints on the joined route`, () => {
  const JOIN = `<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="0.5" lon="1"><name>Between</name></wpt>
  <rte><name>A</name><rtept lat="0" lon="0"/><rtept lat="0" lon="1"/><rtept lat="0" lon="2"/></rte>
  <rte><name>B</name><rtept lat="1" lon="0"/><rtept lat="2" lon="0"/></rte>
</gpx>`;
  const STATE = { chapters: [C(1, 'Mine', [W('X', 0, 0)])] };
  const { readGPX } = gpxFns();
  const { fns, calls } = importRig(STATE, { selected: [0, 1], replace: true, each: true });
  fns.set({ fileName: 'join', gpx: readGPX(JOIN) }, 1);
  fns.doGPXImport();
  calls.find(c => c[0] === 'confirm')[5]();
  assert.equal(STATE.chapters.length, 1);
  assert.deepEqual(STATE.chapters[0].waypoints.map(w => [w.name, w.lat, w.lon]),
    [['', 0, 0], ['', 0, 1], ['', 0, 2], ['Between', 0.5, 1], ['', 1, 0], ['', 2, 0]]);
});

// The dialog opens on the defaults each time, whatever was chosen for the last file, with focus on
// the first track or route.
test(`${EDITOR}: the GPX dialog opens on its defaults with focus on the first track or route`, () => {
  const els = {}, focused = [];
  const el = id => els[id] || (els[id] = { id, value: 7, checked: false, textContent: '', innerHTML: '', disabled: false, style: {},
    classList: { add() {}, remove() {} }, focus() { focused.push(id); } });
  el('gpx-into-replace').checked = true;
  el('gpx-split-each').checked = true;
  const { readGPX } = gpxFns();
  const fns = pick(editor, ['openGPXModal'], {
    STATE: { chapters: [C(1, 'Mine', [W('X', 0, 0)])] }, document: { getElementById: el }, gpxRefresh: () => {}, setTimeout: () => {},
  }, { lets: true });
  fns.openGPXModal('trip', readGPX(TWO));
  assert.deepEqual([el('gpx-marks').checked, el('gpx-into-new').checked, el('gpx-split-one').checked, Number(el('gpx-detail').value)], [true, true, true, 50]);
  assert.deepEqual(focused, ['gpx-pick-0']);
  assert.equal(el('gpx-marks-text').textContent, "Include the file's 2 waypoints as named points");
  // A file of waypoints alone: focus goes to Import, once the refresh has enabled it.
  el('gpx-ok').disabled = true;
  const refresh = () => { el('gpx-ok').disabled = false; };
  const alone = pick(editor, ['openGPXModal'], {
    STATE: { chapters: [] }, document: { getElementById: el }, gpxRefresh: refresh, setTimeout: () => {},
  }, { lets: true });
  el('gpx-ok').focus = function () { if (!this.disabled) focused.push('gpx-ok'); };
  alone.openGPXModal('marks', readGPX('<gpx version="1.1"><wpt lat="1" lon="2"><name>Only</name></wpt></gpx>'));
  assert.equal(el('gpx-marks-text').textContent, "Include the file's 1 waypoint as a named point");
  assert.deepEqual(focused, ['gpx-pick-0', 'gpx-ok'], 'focus lands on the enabled Import button');
});

// Tracks long enough together to take a moment show a message first and measure afterwards.
test(`${EDITOR}: the GPX dialog says it is reading tracks of more than 20,000 points in all`, () => {
  const run = sizes => {
    const els = {}, timers = [], refreshed = [];
    const el = id => els[id] || (els[id] = { id, value: 0, checked: false, textContent: '', innerHTML: '', disabled: false, style: {},
      classList: { add() {}, remove() {} }, focus() {} });
    const fns = pick(editor, ['openGPXModal'], {
      STATE: { chapters: [] }, document: { getElementById: el }, gpxRefresh: () => refreshed.push(1), setTimeout: (f, ms) => timers.push([f, ms]),
    }, { lets: true });
    const parts = sizes.map((n, k) => ({ kind: 'track', name: `T${k}`, points: Array.from({ length: n }, () => W('', 0, 0)) }));
    fns.openGPXModal('big', { parts, marks: [], skipped: 0, name: '' });
    return { text: el('gpx-result').textContent, disabled: el('gpx-ok').disabled, timers: timers.length, refreshed: refreshed.length };
  };
  assert.deepEqual(run([15000, 15000]), { text: 'Reading the tracks…', disabled: true, timers: 1, refreshed: 0 });
  assert.deepEqual(run([20000]), { text: '', disabled: false, timers: 0, refreshed: 1 });
});

// The result line, the slider's spoken value and Import's state follow the choices.
test(`${EDITOR}: the GPX dialog's result line, slider value and Import button follow the choices`, () => {
  const { readGPX } = gpxFns();
  const run = (choices) => {
    const els = {}, attrs = {};
    const el = id => els[id] || (els[id] = { id, value: '', checked: false, textContent: '', disabled: false, style: {},
      setAttribute(k, v) { attrs[id + ' ' + k] = v; } });
    el('gpx-detail').value = choices.detail;
    el('gpx-marks').checked = choices.marks;
    el('gpx-split-each').checked = !!choices.each;
    el('gpx-into-replace').checked = !!choices.replace;
    const picks = choices.selected.map(k => ({ checked: true, dataset: { k: String(k) } }));
    const fns = pick(editor, ['gpxRefresh'], { DOMParser: MiniDOMParser,
      document: { getElementById: el, querySelectorAll: sel => (sel === '#gpx-list .gpx-pick' ? picks : []) } },
    { lets: true, expose: 'set: g => { gpxImport = g; }' });
    fns.set({ fileName: 'day', gpx: readGPX(SAMPLE) });
    fns.gpxRefresh();
    return [attrs['gpx-detail aria-valuetext'], el('gpx-result').textContent, el('gpx-ok').disabled, el('gpx-detail-row').style.display, el('gpx-split').style.display];
  };
  let r = run({ detail: 50, marks: true, selected: [0, 1] });
  assert.equal(r[0], '0.3 nm');
  assert.match(r[1], /^Import \d+ points as a new chapter, "Summer 2027"\. Tracks: \d+ points, kept \d+\.$/);
  assert.deepEqual(r.slice(2), [false, '', '']);
  assert.equal(run({ detail: 0, marks: true, selected: [0, 1] })[0], '10 nm');
  assert.equal(run({ detail: 100, marks: true, selected: [0, 1] })[0], '0.01 nm');
  assert.match(run({ detail: 50, marks: true, selected: [0, 1], each: true })[1], /^Import \d+ points as 2 new chapters\./);
  r = run({ detail: 50, marks: true, selected: [0, 1], replace: true });
  assert.match(r[1], /^Import \d+ points, replacing the selected chapter's waypoints\./);
  assert.equal(r[4], 'none', 'the split choice is hidden when replacing');
  r = run({ detail: 50, marks: false, selected: [] });
  assert.deepEqual(r.slice(1, 4), ['Nothing to import: choose a track or route, or include the waypoints.', true, 'none']);
});

// The Replace confirmation hands focus back to the dialog when it closes.
test(`${EDITOR}: closing the Replace confirmation puts focus back on the GPX dialog's Import button`, () => {
  const focused = [], open = new Set(['gpx-modal', 'confirm-modal']);
  const el = id => ({ classList: { contains: c => c === 'open' && open.has(id), remove: c => { if (c === 'open') open.delete(id); } }, focus: () => focused.push(id) });
  const fns = pick(editor, ['closeConfirmModal'], { document: { getElementById: el } }, { lets: true });
  fns.closeConfirmModal();
  assert.deepEqual(focused, ['gpx-ok']);
  open.clear();
  fns.closeConfirmModal();
  assert.deepEqual(focused, ['gpx-ok'], 'with no GPX dialog open, focus is left alone');
});

// The checks that tell a waypoint already in the route from one to merge into it.
test(`${EDITOR}: a waypoint with other notes or flags merges into its point; one given twice off the route comes in once; the same name wins over a nearer unnamed point`, () => {
  const { gpxChapters, placeMarks } = gpxFns();
  const part = { kind: 'route', name: 'R', points: [W('Kos', 36.9, 27.3), W('Rhodes', 36.4, 28.2)] };
  const mk = (extra) => W('Kos', 36.9, 27.3, extra);
  let out = gpxChapters({ parts: [part], marks: [mk({ notes: 'Fuel' }), mk({ major: true })], skipped: 0, name: '' }, { selected: [0], tolerance: 1, marks: true, each: false, fileName: 'f' });
  assert.deepEqual(out[0].points.map(p => [p.name, p.notes, p.major]), [['Kos', 'Fuel', true], ['Rhodes', '', false]], 'notes and flags fill in');
  const off = W('Lindos', 36.09, 28.09, { notes: 'x' });
  out = gpxChapters({ parts: [part], marks: [off, Object.assign({}, off)], skipped: 0, name: '' }, { selected: [0], tolerance: 1, marks: true, each: false, fileName: 'f' });
  assert.deepEqual(out[0].points.map(p => p.name), ['Kos', 'Rhodes', 'Lindos'], 'given twice, comes in once');
  const elsewhere = W('Kos', 36.6, 27.8);
  out = gpxChapters({ parts: [part], marks: [elsewhere], skipped: 0, name: '' }, { selected: [0], tolerance: 1, marks: true, each: false, fileName: 'f' });
  assert.deepEqual(out[0].points.map(p => [p.name, p.lat]), [['Kos', 36.9], ['Kos', 36.6], ['Rhodes', 36.4]], 'the same name in another place is another point');
  const pts = [W('', 10.0001, 20), W('Kos', 10.0005, 20), W('', 11, 20)];
  const placed = placeMarks(pts, [W('Kos', 10, 20, { notes: 'here' })]);
  assert.deepEqual(placed.map(p => [p.name, p.notes]), [['', ''], ['Kos', 'here'], ['', '']], 'the same name within 0.05 nm wins over a nearer unnamed point');
});

test(`${EDITOR}: a file that is not GPX, or holds nothing usable, changes nothing and says so`, () => {
  const alerts = [], opened = [];
  const run = text => {
    const fns = pick(editor, ['handleGPXFile'], {
      DOMParser: MiniDOMParser, alert: m => alerts.push(m), openGPXModal: (n, g) => opened.push([n, g]),
      FileReader: class { readAsArrayBuffer() { this.onload({ target: { result: new TextEncoder().encode(text).buffer } }); } },
    });
    fns.handleGPXFile({ target: { files: [{ name: 'trip.GPX' }], value: 'x' } });
  };
  run('<kml/>');
  run('<gpx version="1.1"><trk><trkseg><trkpt lat="99" lon="0"/></trkseg></trk></gpx>');
  assert.deepEqual(alerts, ["Couldn't read this file as GPX. Nothing was changed.",
    'This GPX file has no tracks, routes or waypoints with usable coordinates. Nothing was changed.']);
  run(SAMPLE);
  assert.equal(opened.length, 1);
  assert.equal(opened[0][0], 'trip', 'the file name without .gpx');
});

test(`${EDITOR}: a large GPX file shows a message on the status line while it is read, then puts the line back`, () => {
  const run = (size, pending) => {
    const opened = [], timers = [], calls = [];
    const status = { textContent: 'Chapter 1' };
    const fns = pick(editor, ['handleGPXFile'], {
      DOMParser: MiniDOMParser, alert: () => {}, openGPXModal: n => opened.push(n), geoPending: () => pending,
      document: { getElementById: id => (id === 'status-text' ? status : null) }, renderStatus: () => { calls.push('render'); status.textContent = 'Chapter 1'; },
      setTimeout: (f, ms) => timers.push(f),
      FileReader: class { readAsArrayBuffer() { this.onload({ target: { result: new TextEncoder().encode(SAMPLE).buffer } }); } },
    });
    fns.handleGPXFile({ target: { files: [{ name: 'big.gpx', size }], value: 'x' } });
    const shown = status.textContent;
    const before = opened.length;
    timers.forEach(f => f());
    return { shown, before, after: opened.length, calls, timers: timers.length };
  };
  assert.deepEqual(run(3000000, 0), { shown: 'Reading big.gpx…', before: 0, after: 1, calls: ['render'], timers: 1 });
  assert.deepEqual(run(3000000, 2), { shown: 'Chapter 1', before: 0, after: 1, calls: ['render'], timers: 1 }, 'a lookup in progress keeps its line');
  assert.deepEqual(run(1000, 0), { shown: 'Chapter 1', before: 1, after: 1, calls: [], timers: 0 }, 'a small file is read at once');
});

// ---------------------------------------------------------------------------------------------
// Menus and keys
// ---------------------------------------------------------------------------------------------

test(`${EDITOR}: GPX is in the Load and Save menus`, () => {
  assert.match(editor.html, /<button onclick="importCSV\(\)">Import CSVs \(chapters \+ waypoints\)…<\/button>\s*<button onclick="importGPX\(\)">Import GPX…<\/button>/);
  assert.match(editor.html, /<button onclick="exportKML\(\)">KML<\/button>\s*<button onclick="exportGPX\(\)">GPX<\/button>/);
  assert.match(editor.html, /title="Export as JSON, CSV, KML or GPX"/);
  assert.match(editor.html, /<input type="file" id="file-gpx" accept="\.gpx,application\/gpx\+xml,application\/xml,text\/xml" style="display:none" onchange="handleGPXFile\(event\)">/);
});

// The editor's keydown listener, run against a page whose open dialogs are the set `open`. A stub
// that opens or closes a dialog changes the set, as the real one would.
function keyRig(open, opts = {}) {
  const listener = findListener(editor.js, 'keydown', "'gpx-modal'");
  assert.ok(listener, 'keydown listener found');
  const calls = [];
  let handler;
  const el = id => ({ classList: { contains: c => (c === 'hidden' ? id === 'landing' : open.has(id)) } });
  const doc = { getElementById: el, addEventListener: (type, fn) => { handler = fn; } };
  const closing = { closeGPXModal: 'gpx-modal', closeConfirmModal: 'confirm-modal', closeBulkModal: 'bulk-modal', closePasteModal: 'paste-modal',
    closeCSVStep2: 'csv-step2-modal', closeDeleteWptModal: 'delete-wpt-modal', closeLookupConfirm: 'lookup-confirm-modal' };
  const names = ['closeChooser', ...Object.keys(closing), 'proceedLookupConfirm', 'closeDropdowns', 'deselectWaypoint', 'doBulkAdd', 'doDeleteWpt',
    'proceedConfirmModal', 'doGPXImport'];
  const stubs = names.map(n => () => {
    calls.push(n);
    if (closing[n]) open.delete(closing[n]);
    if (n === 'proceedConfirmModal') open.delete('confirm-modal');
    if (n === 'doGPXImport' && opts.importAsks) open.add('confirm-modal');
  });
  new Function('document', 'selectedWpt', 'confirmSafeDefault', ...names, listener)(doc, null, !!opts.safe, ...stubs);
  // `button` names the dialog whose button has focus when the key is pressed.
  return { calls, press: (key, button) => handler({ key, shiftKey: false, target: { closest: sel => (button && sel === `#${button} button` ? {} : null) }, preventDefault() {} }) };
}

test(`${EDITOR}: in the GPX dialog Enter imports and Escape cancels; over it, the Replace confirmation takes both keys alone`, () => {
  let k = keyRig(new Set(['gpx-modal']));
  k.press('Enter');
  assert.deepEqual(k.calls, ['doGPXImport']);
  k = keyRig(new Set(['gpx-modal']));
  k.press('Enter', 'gpx-modal');
  assert.deepEqual(k.calls, [], 'Enter on a focused button (Cancel) is left to the button');
  k = keyRig(new Set(['gpx-modal']));
  k.press('Escape');
  assert.ok(k.calls.includes('closeGPXModal'), k.calls.join());
  // The Enter that opens the Replace confirmation does not also answer it.
  const open = new Set(['gpx-modal']);
  k = keyRig(open, { importAsks: true, safe: true });
  k.press('Enter');
  assert.deepEqual(k.calls, ['doGPXImport']);
  assert.ok(open.has('confirm-modal'));
  // With the confirmation open: Escape closes it alone, and Enter (the safe choice) keeps the rows
  // without starting the import again.
  k = keyRig(new Set(['gpx-modal', 'confirm-modal']), { safe: true });
  k.press('Escape');
  assert.ok(k.calls.includes('closeConfirmModal') && !k.calls.includes('closeGPXModal'), k.calls.join());
  const both = new Set(['gpx-modal', 'confirm-modal']);
  k = keyRig(both, { safe: true });
  k.press('Enter');
  assert.deepEqual(k.calls, ['closeConfirmModal']);
  assert.ok(both.has('gpx-modal'));
});
