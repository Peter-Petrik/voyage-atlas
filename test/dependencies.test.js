// The libraries both tools load from the CDN: an exact version on every tag, and a sha512 integrity
// hash with crossorigin="anonymous", so the browser refuses any file that differs from the pinned one.
// The hashes themselves are checked against the files when a version changes; this suite does not
// fetch from the network.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, readRepoFile } = require('./support.js');

const PINNED = {
  'leaflet/1.9.4/leaflet.min.css': 'sha512-h9FcoyWjHcOcmEVkxOfTLnmZFWIH0iZhZT1H2TbOq55xssQGEJHEaIm+PgoUaZbRvQTNTluNOEfb1ZRy6D3BOw==',
  'leaflet/1.9.4/leaflet.min.js': 'sha512-puJW3E/qXDqYp9IfhAI54BJEaWIfloJ7JWs7OeD5i6ruC9JZL1gERT1wjtwXFlh7CjE7ZJ+/vcRZRkIYIb6p4g==',
  'Sortable/1.15.7/Sortable.min.js': 'sha512-ri8dokds012Oxz+iFzMs4KNJXVc+h7J1zq6unM1NTtzBLj4jD1R5BWiK6QycK0TdSdkt7zYcIcv6sUPhmYkbdQ==',
  'PapaParse/5.7.0/papaparse.min.js': 'sha512-wyNDcNr/iqpMDH6ud/BVoy2SoWXnBZ6Bnq3kZa5XXYq7HZ4l8/ECCZkauMv5HDScNBYSl99P1fkiNOo74zig1Q==',
};
const EXPECTED = {
  [EDITOR]: ['leaflet/1.9.4/leaflet.min.css', 'leaflet/1.9.4/leaflet.min.js', 'Sortable/1.15.7/Sortable.min.js', 'PapaParse/5.7.0/papaparse.min.js'],
  [VIEWER]: ['leaflet/1.9.4/leaflet.min.css', 'leaflet/1.9.4/leaflet.min.js'],
};

// Every external script and stylesheet, from any host; only the Google Fonts stylesheet, which
// changes with the requesting browser and so cannot carry a fixed hash, is exempt.
const externalTags = html => (html.match(/<script\b[^>]*\ssrc="https?:[^"]*"[^>]*>|<link\b[^>]*\srel="stylesheet"[^>]*>/g) || [])
  .filter(t => /\s(?:src|href)="https?:/.test(t) && !/fonts\.googleapis\.com/.test(t));
const cdnTags = externalTags;
const pathOf = tag => (tag.match(/\s(?:src|href)="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/([^"]+)"/) || [])[1];
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];

for (const name of [EDITOR, VIEWER]) {
  const tags = cdnTags(readRepoFile(name));

  test(`${name}: loads exactly the pinned library files`, () => {
    assert.deepEqual(tags.map(pathOf), EXPECTED[name]);
  });

  test(`${name}: every library tag carries its integrity hash and crossorigin="anonymous"`, () => {
    tags.forEach(tag => {
      const path = pathOf(tag);
      assert.ok(path, `not a pinned cdnjs file: ${tag}`);
      assert.equal(attr(tag, 'integrity'), PINNED[path], `${path}: integrity`);
      assert.equal(attr(tag, 'crossorigin'), 'anonymous', `${path}: crossorigin`);
    });
  });
}

test('the two tools load Leaflet with identical tags', () => {
  const leaflet = name => cdnTags(readRepoFile(name)).filter(t => /\/leaflet\//.test(t));
  assert.deepEqual(leaflet(EDITOR), leaflet(VIEWER));
});

// Opt-in: with VA_NETWORK=1 the pinned files are downloaded from cdnjs and their sha512 compared
// with the hashes above, the check to run whenever a library version changes. Skipped otherwise,
// so CI does not depend on the network.
test('the pinned hashes match the files on cdnjs', { skip: process.env.VA_NETWORK !== '1' && 'set VA_NETWORK=1 to run' }, async () => {
  const crypto = require('node:crypto');
  for (const [path, sri] of Object.entries(PINNED)) {
    const res = await fetch(`https://cdnjs.cloudflare.com/ajax/libs/${path}`);
    assert.equal(res.status, 200, path);
    const digest = 'sha512-' + crypto.createHash('sha512').update(Buffer.from(await res.arrayBuffer())).digest('base64');
    assert.equal(digest, sri, path);
  }
});
