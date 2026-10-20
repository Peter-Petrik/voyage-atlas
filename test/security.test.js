// The checks that keep a voyage file's contents from running as code: the data path stays on this
// site, text and settings are escaped or reduced to known values before they reach markup, and a
// chapter's blog link is http(s) only. A voyage file is untrusted input, since a crafted link can
// hand either tool any file the link names, so each check is run against hostile values.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, pick } = require('./support.js');

const PAGE = 'https://example.org/resources/voyage-atlas/viewer/';
const at = search => new URL(PAGE + search);

for (const name of [EDITOR, VIEWER]) {
  const tool = loadTool(name);
  const dataPath = search =>
    pick(tool, ['URL_VOYAGE_DATA', 'resolveDataPath', 'isSameSitePath'], { location: at(search) }).resolveDataPath();

  test(`${name}: the data path defaults to the site's own file`, () => {
    assert.equal(dataPath(''), 'voyage-data.json');
    assert.equal(dataPath('?data='), 'voyage-data.json');
  });

  test(`${name}: a same-site ?data= address is returned as the absolute address that was checked`, () => {
    assert.equal(dataPath('?data=sub/voyage-data.json'), PAGE + 'sub/voyage-data.json');
    assert.equal(dataPath('?data=/other/voyage.json'), 'https://example.org/other/voyage.json');
    assert.equal(dataPath('?data=https://example.org/v.json'), 'https://example.org/v.json');
  });

  test(`${name}: a ?data= address off this site is rejected`, () => {
    for (const value of [
      'https://evil.test/x.json',
      '//evil.test/x.json',
      '/\\evil.test/x.json',
      'http://example.org/x.json',
      'https://example.org:8443/x.json',
      'https://user:pass@example.org/x.json',
      'https://user@example.org/x.json',
      'data:application/json,{"chapters":[]}',
      'javascript:alert(1)',
    ]) {
      assert.equal(dataPath('?data=' + encodeURIComponent(value)), null, value);
    }
  });

  test(`${name}: esc neutralizes markup and quotes`, () => {
    const { esc } = pick(tool, ['esc']);
    assert.equal(esc('<img src=x onerror="alert(1)">&'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;');
    assert.equal(esc(null), '');
    assert.equal(esc(undefined), '');
    assert.equal(esc(42), '42');
  });

  test(`${name}: header stat tiles escape their values and labels`, () => {
    const { heroTilesHTML } = pick(tool, ['esc', 'heroTilesHTML']);
    const out = heroTilesHTML([['<img src=x>', '<b>Label</b>', false]]);
    assert.ok(!out.includes('<img') && !out.includes('<b>'), out);
    assert.ok(out.includes('&lt;img src=x&gt;') && out.includes('&lt;b&gt;Label&lt;/b&gt;'), out);
  });

  test(`${name}: settings are reduced to known units, a positive distance and whole counts`, () => {
    const { normalizeSettings } = pick(tool, ['NM_TO', 'normalizeSettings']);
    assert.deepEqual(normalizeSettings({
      distanceOverride: '<img src=x>', nationsOverride: '<script>', territoriesOverride: -3, distanceUnit: '<b>',
    }), { distanceOverride: null, nationsOverride: null, territoriesOverride: null, distanceUnit: 'nm' });
    // A count of 0 is a real override (a voyage with no territories); a distance must be positive.
    assert.deepEqual(normalizeSettings({ distanceOverride: '1200', nationsOverride: 14, territoriesOverride: 0, distanceUnit: 'km' }),
      { distanceOverride: 1200, nationsOverride: 14, territoriesOverride: 0, distanceUnit: 'km' });
    assert.deepEqual(normalizeSettings({ distanceOverride: 0, nationsOverride: 2.5, territoriesOverride: '3' }),
      { distanceOverride: null, nationsOverride: null, territoriesOverride: 3, distanceUnit: 'nm' });
    assert.equal(normalizeSettings({ distanceUnit: 'toString' }).distanceUnit, 'nm', 'inherited property names are not units');
    assert.deepEqual(normalizeSettings(undefined),
      { distanceOverride: null, nationsOverride: null, territoriesOverride: null, distanceUnit: 'nm' });
    assert.deepEqual(normalizeSettings('nm'),
      { distanceOverride: null, nationsOverride: null, territoriesOverride: null, distanceUnit: 'nm' });
  });
}

test(`${VIEWER}: a chapter's blog link is kept only when it is http(s)`, () => {
  const { safeHttpUrl } = pick(loadTool(VIEWER), ['safeHttpUrl'], { location: at('') });
  assert.equal(safeHttpUrl('https://example.com/ch2'), 'https://example.com/ch2');
  assert.equal(safeHttpUrl('http://example.com/ch2'), 'http://example.com/ch2');
  assert.equal(safeHttpUrl('/blog/ch2'), 'https://example.org/blog/ch2');
  for (const value of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', '', null, undefined]) {
    assert.equal(safeHttpUrl(value), '', String(value));
  }
});

test(`${EDITOR}: coordinates, chapter numbers and eras from a file are read as numbers and known values`, () => {
  const { toCoord, toChapterNum, toEra } = pick(loadTool(EDITOR), ['toCoord', 'toChapterNum', 'toEra']);
  assert.equal(toCoord(12.5), 12.5);
  assert.equal(toCoord('-61.25'), -61.25);
  assert.equal(toCoord(0), 0);
  for (const value of ['<img src=x>', '', null, undefined, Infinity, NaN, {}]) assert.equal(toCoord(value), null, String(value));
  assert.equal(toChapterNum('3'), 3);
  assert.equal(toChapterNum(7), 7);
  assert.equal(toChapterNum('1);alert(1)//'), 1);
  assert.equal(toChapterNum('<img>'), 0);
  assert.equal(toEra('PAST'), 'past');
  assert.equal(toEra('current'), 'current');
  assert.equal(toEra('<img src=x>'), 'future');
  assert.equal(toEra(undefined), 'future');
});
