// The editor's shared geocoder queue: one request at a time, at a fixed spacing, with a session
// cache, a front-of-queue place search that replaces an older waiting one, and a timeout on requests
// that never answer. These are the Nominatim usage-policy rules the queue exists to keep, so each
// one is checked against a stubbed fetch with the spacing and timeout shortened to keep the run fast.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, loadTool } = require('./support.js');

const SPACING = 120;
const TIMEOUT = 400;

// A fresh queue per test, with its own stubbed fetch. URLs containing "empty" answer [], URLs in
// `fail` reject once, URLs in `status` answer with that HTTP status, and URLs in `hang` never
// answer until the request's abort signal fires.
function freshQueue() {
  const { js } = loadTool(EDITOR);
  const start = js.indexOf('GEOCODER REQUESTS');
  const end = js.indexOf('REVERSE GEOCODING (country auto-populate)');
  assert.ok(start >= 0 && end > start, 'geocoder queue section not found');
  const spacing = 'const GEO_SPACING_MS = 1100;', timeout = 'const GEO_TIMEOUT_MS = 20000;';
  let block = js.slice(js.lastIndexOf('/*', start), js.lastIndexOf('/*', end));
  assert.ok(block.includes(spacing) && block.includes(timeout), 'queue constants not found');
  block = block.replace(spacing, `const GEO_SPACING_MS = ${SPACING};`).replace(timeout, `const GEO_TIMEOUT_MS = ${TIMEOUT};`);
  const net = { sent: [], fail: new Set(), status: {}, hang: new Set() };
  const fetch = (url, opts) => {
    net.sent.push({ url, t: performance.now() });
    if (net.hang.has(url)) {
      return new Promise((_, reject) => opts.signal.addEventListener('abort', () => reject(new Error('timeout'))));
    }
    if (net.fail.has(url)) { net.fail.delete(url); return Promise.reject(new Error('network')); }
    const status = net.status[url] || 200;
    return Promise.resolve({ ok: status === 200, status, json: () => Promise.resolve(url.includes('empty') ? [] : { url }) });
  };
  const api = new Function('fetch', block + '\nreturn { geoRequest, geoCache, get jobs() { return geoJobs; } };')(fetch);
  return { api, net, urls: () => net.sent.map(s => s.url) };
}

// The timeout signal's timer does not hold the process open, so a test waiting only on it would
// end early; this interval keeps the event loop alive for the length of each test.
let keepAlive;
test.beforeEach(() => { keepAlive = setInterval(() => {}, 1000); });
test.afterEach(() => clearInterval(keepAlive));

test('requests go out in order, at least the spacing apart', async () => {
  const { api, net, urls } = freshQueue();
  await Promise.all(['a1', 'a2', 'a3', 'a4', 'a5'].map(u => api.geoRequest(u)));
  assert.deepEqual(urls(), ['a1', 'a2', 'a3', 'a4', 'a5']);
  const gaps = net.sent.slice(1).map((s, i) => s.t - net.sent[i].t);
  assert.ok(gaps.every(g => g >= SPACING - 5), `gaps ${JSON.stringify(gaps)}`);
});

test('a place search goes ahead of queued lookups', async () => {
  const { api, urls } = freshQueue();
  const lookups = ['b1', 'b2', 'b3'].map(u => api.geoRequest(u));
  const search = api.geoRequest('search-now', true);
  await Promise.all([...lookups, search]);
  assert.ok(urls().indexOf('search-now') <= 1, urls().join());
});

test('a repeated request, including an empty answer, is answered from the cache', async () => {
  const { api, net } = freshQueue();
  const first = await api.geoRequest('empty-1');
  const again = await api.geoRequest('empty-1');
  assert.deepEqual(first, []);
  assert.equal(again, first);
  assert.equal(net.sent.length, 1);
});

test('duplicate requests waiting together send once', async () => {
  const { api, net } = freshQueue();
  await Promise.all([api.geoRequest('dup'), api.geoRequest('dup'), api.geoRequest('dup')]);
  assert.equal(net.sent.length, 1);
});

test('a network failure rejects, is not cached, and is sent again next time', async () => {
  const { api, net } = freshQueue();
  net.fail.add('flaky');
  await assert.rejects(api.geoRequest('flaky'));
  assert.deepEqual(await api.geoRequest('flaky'), { url: 'flaky' });
  assert.equal(net.sent.length, 2);
});

test('a refused request rejects and is not cached', async () => {
  const { api, net } = freshQueue();
  net.status.refused = 429;
  await assert.rejects(api.geoRequest('refused'));
  assert.ok(!api.geoCache.has('refused'));
});

test('a newer search replaces an older one still waiting, which settles as null and is never sent', async () => {
  const { api, urls } = freshQueue();
  const lookups = ['c1', 'c2', 'c3'].map(u => api.geoRequest(u));
  const results = await Promise.all([
    api.geoRequest('search-old', true), api.geoRequest('search-mid', true), api.geoRequest('search-new', true),
  ]);
  await Promise.all(lookups);
  assert.equal(results[0], null);
  assert.equal(results[1], null);
  assert.deepEqual(results[2], { url: 'search-new' });
  assert.ok(!urls().includes('search-old') && !urls().includes('search-mid'), urls().join());
  assert.equal(urls().length, 4);
});

test('a request that never answers is abandoned after the timeout and the queue moves on', async () => {
  const { api, net } = freshQueue();
  net.hang.add('stuck');
  const t0 = performance.now();
  const [stuck, after] = await Promise.all([
    api.geoRequest('stuck').then(() => 'answered', () => 'rejected'),
    api.geoRequest('after-stuck'),
  ]);
  assert.equal(stuck, 'rejected');
  assert.deepEqual(after, { url: 'after-stuck' });
  assert.ok(!api.geoCache.has('stuck'));
  assert.ok(performance.now() - t0 < TIMEOUT * 5, `took ${Math.round(performance.now() - t0)} ms`);
  assert.equal(api.jobs.length, 0);
});
