// The documents describe each form, menu, table and panel in the order the tools show it, so a field
// added, moved or renamed on screen fails here until the FAQ, README and schema follow. The orders are
// read from the tools' own markup. Statements that have been wrong before are kept out.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, readRepoFile } = require('./support.js');

const editor = loadTool(EDITOR);
const viewer = loadTool(VIEWER);
const faq = readRepoFile('docs/voyage-atlas-faq.md');
const readme = readRepoFile('README.md');
const schema = readRepoFile('docs/voyage-atlas-schema.md');
const backlog = readRepoFile('docs/voyage-atlas-enhancements.md');

// The text of a section, from its heading to the next heading of the same or a higher level.
function section(doc, heading) {
  const lines = doc.split('\n');
  const start = lines.findIndex(l => l.replace(/^#+\s*/, '') === heading && /^#+ /.test(l));
  assert.ok(start >= 0, `no section "${heading}"`);
  const level = lines[start].match(/^#+/)[0].length;
  const end = lines.findIndex((l, i) => i > start && /^#+ /.test(l) && l.match(/^#+/)[0].length <= level);
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
}
// The bold labels of a numbered list's top-level items, in order.
const boldItems = text => [...text.matchAll(/^\d+\. \*\*([^*]+?)\*\*/gm)].map(m => m[1].replace(/[.:]$/, '').trim());
// The text of an element of the markup, without its tags, help tips and spacing.
const plain = s => s.replace(/<span class="hi"[^>]*>i<\/span>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const inside = (html, open, close) => { const i = html.indexOf(open); assert.ok(i >= 0, open); return html.slice(i, html.indexOf(close, i)); };
// True when every word appears after the one before it.
function inOrder(text, words) {
  let at = -1;
  for (const w of words) {
    const i = text.indexOf(w, at + 1);
    if (i < 0) return `"${w}" missing or out of order`;
    at = i;
  }
  return true;
}

const formLabels = [...editor.defs.renderMetaForm.matchAll(/<label for="[^"]*">([^<]+?) <span/g)].map(m => m[1]);

test('the chapter form has the eight fields the documents list', () => {
  assert.deepEqual(formLabels, ['Name', 'Era', 'When', 'Pad Multiplier', 'Blog URL', 'Notes', 'Countries / Territories', 'Key Destinations']);
});

test('the FAQ lists the chapter fields in the order of the form', () => {
  assert.deepEqual(boldItems(section(faq, 'Chapter metadata')), formLabels);
});

test('the schema names the chapter form in its order, and the README lists the fields in that order', () => {
  assert.ok(schema.includes(`The editor's chapter form shows them as ${formLabels.slice(0, -2).join(', ')}, Countries / Territories (\`countriesOverride\`) and Key Destinations.`));
  const item = readme.split('\n').find(l => l.startsWith('4. **Chapters**'));
  assert.equal(inOrder(item, ['era', 'When', 'pad multiplier', 'blog link', 'notes', 'countries', 'key destinations']), true);
});

test('the FAQ lists the Voyage Settings in the order of the panel', () => {
  const panel = [...inside(editor.html, '<div id="settings-body">', '</div>\n      </div>').matchAll(/<label for="set-[^"]*">([^<]+?) <span/g)].map(m => m[1]);
  assert.deepEqual(panel, ['Voyage Title', 'Distance Units', 'Distance Override', 'Nations', 'Territories']);
  assert.deepEqual(boldItems(section(faq, 'Voyage Settings (⚙)')), panel);
});

test('the FAQ gives the waypoint toolbar and table columns in screen order', () => {
  const panel = editor.defs.renderWaypointPanel;
  // The text just before each closing tag, since a button's attributes may hold a template expression with ">".
  const toolbar = [...inside(panel, '<div class="wpt-toolbar">', '</div>').matchAll(/>([^<>]+)<\/button>/g)].map(m => m[1].trim());
  assert.deepEqual(toolbar, ['+ Add row', '+ Add N rows', 'Paste', 'Look up countries']);
  assert.ok(faq.includes(`The table's toolbar holds, left to right, ${toolbar.slice(0, -1).map(b => `**${b}**`).join(', ')} and **${toolbar.at(-1)}**`));
  const columns = [...inside(panel, '<thead>', '</thead>').matchAll(/<th[^>]*>([^]*?)<\/th>/g)].map(m => plain(m[1])).filter(Boolean);
  assert.deepEqual(columns, ['#', 'Name', 'Lat', 'Lon', 'M', 'G', 'D', 'Country', 'Notes']);
  assert.ok(faq.includes(`The table's columns run ≡ (drag), ${columns.join(', ')} and ✕.`));
});

test('the FAQ gives the Load and export menus and the editor chooser in screen order', () => {
  const menu = id => [...inside(editor.html, `<div id="${id}" class="dropdown-menu">`, '</div>').matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map(m => m[1]);
  const load = menu('import-menu');
  assert.ok(faq.includes(load.slice(0, -1).map(b => `"${b}"`).join(', ') + ` and "${load.at(-1)}"`), 'Load menu');
  assert.deepEqual(boldItems(section(faq, 'Saving and exporting').split('\n').filter(l => /^\s+\d+\. /.test(l)).map(l => l.trim()).join('\n')), menu('export-menu'));
  const chooser = [...inside(editor.html, '<div class="landing-actions">', '\n    </div>').matchAll(/<span class="lb-title">([^<]+)<\/span>/g)].map(m => m[1].replace('…', ''));
  assert.deepEqual(boldItems(section(faq, 'Getting data in')), chooser);
});

test('the FAQ lists the viewer layers and the detail panel in screen order', () => {
  const layers = [...inside(viewer.html, '<div class="panel" id="filter"', '</div>\n</div>').matchAll(/<label class="toggle"><input[^>]*> ([^<]+)<\/label>/g)].map(m => m[1].trim());
  assert.deepEqual(layers, ['Routes', 'Waypoints', 'Avoidance zones', 'Decision points', 'Gateway ports']);
  assert.deepEqual(boldItems(section(faq, 'Layer toggles')), layers);
  const ids = [...inside(viewer.html, '<div class="panel" id="info">', '</div>\n\n').matchAll(/id="(info-(?:when|name|meta|notes|countries|blog-link))"/g)].map(m => m[1]);
  assert.deepEqual(ids, ['info-when', 'info-name', 'info-meta', 'info-notes', 'info-countries', 'info-blog-link']);
  const line = faq.split('\n').find(l => l.startsWith('The detail panel shows, top to bottom,'));
  assert.equal(inOrder(line, ['When', 'name', 'distance', 'notes', 'countries and territories', 'Read the posts']), true);
});

test('the FAQ gives the viewer chooser and the drawer\'s extra items in screen order', () => {
  const chooser = [...inside(viewer.html, '<div class="landing-actions">', '\n    </div>').matchAll(/<span class="lb-title">([^<]+)<\/span>/g)].map(m => m[1]);
  assert.deepEqual(chooser, ['Explore this voyage', 'Load a voyage file…']);
  const item = faq.split('\n').find(l => l.startsWith('2. **Chooser.**'));
  assert.equal(inOrder(item, chooser.map(c => `"${c}"`)), true);
  const overflow = inside(viewer.html, '<div id="drawer-overflow"', '</div>\n  </div>');
  assert.equal(inOrder(overflow, ['Chart your own voyage →', 'id="drawer-hero"', 'Load…']), true);
  const line = faq.split('\n').find(l => l.startsWith('The ☰ button at the left of the header opens'));
  assert.equal(inOrder(line, ['**Chart your own voyage →**', 'the header stats', '**Load…**']), true);
});

test('the documents do not bring back statements that were wrong', () => {
  const docs = { faq, readme, schema, backlog };
  for (const [name, doc] of Object.entries(docs)) {
    assert.ok(!/\bSave As\b/.test(doc), `${name}: there is no Save As`);
    assert.ok(!/relative paths? only/i.test(doc), `${name}: a full address on the same site is accepted too`);
    assert.ok(!/browser replaces/i.test(doc), `${name}: browser download naming is not the tool's to explain`);
    assert.ok(!/\bcap(s|ping)? the (final )?totals\b/i.test(doc), `${name}: overrides replace the totals`);
  }
  for (const [name, doc] of Object.entries({ faq, readme, schema })) {
    assert.ok(!/\bhero (stats|totals)\b/i.test(doc), `${name}: "header stats"`);
    assert.ok(!/status line/i.test(doc), `${name}: "status bar"`);
    assert.ok(!/timeline placement|admiralty chart" theme/i.test(doc), `${name}: the era drives no timeline, and the themes have no names`);
  }
  assert.ok(!/in `order` sequence/.test(schema), 'the route follows the array order');
});
