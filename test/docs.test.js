// The documents describe each form, menu, table and panel in the order the tools show it, so a field
// added, moved or renamed on screen fails here until the FAQ, README and schema follow. The orders are
// read from the tools' own markup. Statements that have been wrong before are kept out.

const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITOR, VIEWER, loadTool, readRepoFile, pick } = require('./support.js');

const editor = loadTool(EDITOR);
const viewer = loadTool(VIEWER);
const faq = readRepoFile('docs/voyage-atlas-faq.md');
const readme = readRepoFile('README.md');
const schema = readRepoFile('docs/voyage-atlas-schema.md');
const backlog = readRepoFile('docs/voyage-atlas-enhancements.md');
const guide = readRepoFile('docs/voyage-atlas-guide.md');

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
  const docs = { faq, readme, schema, backlog, guide };
  for (const [name, doc] of Object.entries(docs)) {
    assert.ok(!/\bSave As\b/.test(doc), `${name}: there is no Save As`);
    assert.ok(!/relative paths? only/i.test(doc), `${name}: a full address on the same site is accepted too`);
    assert.ok(!/browser replaces/i.test(doc), `${name}: browser download naming is not the tool's to explain`);
    assert.ok(!/\bcap(s|ping)? the (final )?totals\b/i.test(doc), `${name}: overrides replace the totals`);
  }
  for (const [name, doc] of Object.entries({ faq, readme, schema, guide })) {
    assert.ok(!/\bhero (stats|totals)\b/i.test(doc), `${name}: "header stats"`);
    assert.ok(!/status line/i.test(doc), `${name}: "status bar"`);
    assert.ok(!/timeline placement|admiralty chart" theme/i.test(doc), `${name}: the era drives no timeline, and the themes have no names`);
  }
  assert.ok(!/in `order` sequence/.test(schema), 'the route follows the array order');
});

// ── The visual guide ──────────────────────────────────────────────────────────────────────────────
// docs/voyage-atlas-guide.md draws the tools figure by figure. Each figure has a fixed number and its
// own anchor, so other documents can link to it; the screens are SVG wireframes in a light and a dark
// file, drawn with the sample voyage, and the flows are Mermaid blocks. The tests below hold the
// addresses, the pictures, the labels, the sample's values and the figures the guide states to the
// tools, as the tests above hold the FAQ.

// The anchor GitHub gives a heading: lower case, every character that is not a letter, a number, a
// space, a hyphen or an underscore removed, spaces made hyphens, and a repeat numbered -1, -2 and so
// on. Headings inside code fences are not headings.
function headingAnchors(doc) {
  const seen = new Map();
  const anchors = new Set();
  let fenced = false;
  for (const line of doc.split('\n')) {
    if (/^```/.test(line)) { fenced = !fenced; continue; }
    const m = !fenced && line.match(/^#{1,6} (.+?)\s*$/);
    if (!m) continue;
    const slug = m[1].replace(/[`*]/g, '').toLowerCase().replace(/[^\p{L}\p{N}\p{M} _-]/gu, '').replace(/ /g, '-');
    const n = seen.get(slug) || 0;
    seen.set(slug, n + 1);
    anchors.add(n ? `${slug}-${n}` : slug);
  }
  return anchors;
}
// The guide's figures, in document order: the anchor's numbers, the heading's numbers and title, and
// the text from the anchor to the next one.
const figureAnchors = [...guide.matchAll(/<a name="([^"]*)"><\/a>/g)];
const figures = figureAnchors.map((m, i) => {
  const text = guide.slice(m.index, i + 1 < figureAnchors.length ? figureAnchors[i + 1].index : undefined);
  const id = m[1].match(/^fig-(\d+)-(\d+)$/);
  const head = text.match(/^<a name="[^"]*"><\/a>\n\n### Figure (\d+)\.(\d+): (.+)$/m);
  return { name: m[1], id, head, text, number: head && `${head[1]}.${head[2]}`, title: head && head[3] };
});
const figure = number => {
  const f = figures.find(x => x.number === number);
  assert.ok(f, `no Figure ${number}`);
  return f;
};
const mermaid = number => {
  const m = figure(number).text.match(/```mermaid\n([\s\S]*?)```/);
  assert.ok(m, `Figure ${number} has no Mermaid block`);
  return m[1];
};
const caption = number => figure(number).text.replace(/```[\s\S]*?```/g, '').replace(/<picture>[\s\S]*?<\/picture>/g, '');
const unescapeXml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'").replace(/&amp;/g, '&');
// The text of an SVG wireframe, in drawing order; its numbered callouts; and its data groups, each
// with its data- attributes and the text drawn inside it.
const svgTexts = svg => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => unescapeXml(m[1]));
const svgCallouts = svg => [...svg.matchAll(/<text[^>]*font-weight="bold"[^>]*>(\d+)<\/text>/g)].map(m => Number(m[1]));
const svgGroups = svg => [...svg.matchAll(/<g ((?:data-[\w-]+="[^"]*" ?)+)>([\s\S]*?)<\/g>/g)].map(m => ({
  data: Object.fromEntries([...m[1].matchAll(/data-([\w-]+)="([^"]*)"/g)].map(a => [a[1], unescapeXml(a[2])])),
  texts: svgTexts(m[2]),
  // The flag checkboxes drawn in a waypoint row: which flag each is, whether it is ticked, and its fill.
  boxes: [...m[2].matchAll(/<rect [^>]*fill="([^"]+)"[^>]*data-box="(\w)" data-checked="(true|false)"/g)].map(b => ({ box: b[2], checked: b[3] === 'true', fill: b[1] })),
}));
const svgGroup = (svg, match) => {
  const g = svgGroups(svg).find(x => Object.entries(match).every(([k, v]) => x.data[k] === String(v)));
  assert.ok(g, `a group ${JSON.stringify(match)}`);
  return g.texts;
};
// The picture of a Layer 1 figure: the dark source and the light fallback.
function pictureOf(number) {
  const text = figure(number).text;
  const dark = text.match(/<source media="\(prefers-color-scheme: dark\)" srcset="([^"]+)">/);
  const light = text.match(/<img alt="([^"]+)" src="([^"]+)">/);
  assert.ok(dark && light, `Figure ${number} has a <picture> with a dark source and a light image`);
  return { alt: light[1], light: readRepoFile(`docs/${light[2]}`), dark: readRepoFile(`docs/${dark[1]}`), lightPath: light[2], darkPath: dark[1] };
}
const menuItems = (html, id) => [...inside(html, `<div id="${id}" class="dropdown-menu">`, '</div>').matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map(m => m[1]);
const chooserTitles = html => [...inside(html, '<div class="landing-actions">', '\n    </div>').matchAll(/<span class="lb-title">([^<]+)<\/span>/g)].map(m => m[1]);
const upper = list => list.map(s => s.toUpperCase());
const toolbarButtons = () => [...inside(editor.defs.renderWaypointPanel, '<div class="wpt-toolbar">', '</div>').matchAll(/>([^<>]+)<\/button>/g)].map(m => m[1].trim());
const searchPlaceholder = () => editor.html.match(/id="nom-input" placeholder="([^"]+)"/)[1];

// The sample voyage the wireframes are drawn with, and the figures the tools compute for it.
const sample = JSON.parse(readRepoFile('voyage-data.json'));
const computed = (tool, author) => {
  const state = { chapters: sample.chapters };
  const f = pick(tool, ['computeHeroStats', 'heroItems', 'chapterNm', 'chapterApproachNm', 'getPredecessorChapter', 'fmtDist', 'chapterCountries', 'hasCoord'], { STATE: state, DATA: state });
  const unit = sample.meta.settings.distanceUnit;
  const stats = f.heroItems(f.computeHeroStats(sample.chapters, sample.meta.settings), unit, author).flatMap(([v, l]) => [String(v), l.toUpperCase()]);
  const dist = ch => f.fmtDist(f.chapterNm(ch, sample.chapters), unit);
  // The editor's connection indicator: none for the first chapter or one with no coordinates, 🔗 when
  // the approach leg rounds to 0 nm, ⇄ otherwise (chapterSyncHTML).
  const sync = ch => (!f.getPredecessorChapter(ch, sample.chapters) || !ch.waypoints.some(f.hasCoord)) ? null
    : f.chapterApproachNm(ch, sample.chapters) < 1 ? '🔗' : '⇄';
  return { stats, dist, sync, countries: ch => f.chapterCountries(ch) };
};
const ed = computed(editor, true);
const vw = computed(viewer, false);
const truncated = (shown, full) => shown === full || (shown.endsWith('…') && full.startsWith(shown.slice(0, -1)));

test('the heading anchors match the ones GitHub gave the FAQ', () => {
  // As GitHub rendered docs/voyage-atlas-faq.md on October 24, 2026.
  const anchors = headingAnchors(faq);
  for (const a of ['voyage-settings-', 'endpoint-sync--the--button-and--indicator', 'geocoding-name--coordinates',
    'how-do-chapters-connect-shared-endpoints', 'selecting-a-waypoint-chart--list', 'what-is-a-shaping-vertex',
    'the-charts-panels', 'part-2--using-the-editor', 'voyage-atlas--faq--owners-manual']) {
    assert.ok(anchors.has(a), a);
  }
});

test('every figure has one anchor, numbered as its heading, in its layer and in order', () => {
  assert.ok(figures.length > 0);
  const seen = new Set();
  let last = [-1, 0];
  for (const f of figures) {
    assert.ok(f.id, `${f.name}: an anchor is named fig-L-N`);
    assert.ok(f.head, `${f.name}: the anchor is followed by a blank line and a "### Figure L.N: Title" heading`);
    assert.deepEqual([f.id[1], f.id[2]], [f.head[1], f.head[2]], `${f.name}: the anchor and the heading carry the same number`);
    assert.ok(!seen.has(f.name), `${f.name} appears once`);
    seen.add(f.name);
    const n = [Number(f.id[1]), Number(f.id[2])];
    assert.ok(n[0] > last[0] || (n[0] === last[0] && n[1] > last[1]), `${f.name} follows ${last.join('.')}`);
    last = n;
    const layer = guide.slice(0, guide.indexOf(`<a name="${f.name}">`)).match(/^## Layer (\d+) — .+$/gm);
    assert.ok(layer && layer.at(-1).startsWith(`## Layer ${n[0]} —`), `${f.name} sits under "## Layer ${n[0]}"`);
  }
  assert.equal((guide.match(/<a name="/g) || []).length, figures.length);
});

test('the guide\'s index lists every figure under its layer, in order, by its number and title', () => {
  const index = section(guide, 'Figures');
  const listed = [...index.matchAll(/\[Figure (\d+\.\d+): ([^\]]+)\]\(#(fig-[\d-]+)\)/g)].map(m => [m[1], m[2], m[3]]);
  assert.deepEqual(listed, figures.map(f => [f.number, f.title, f.name]));
  for (const f of figures) {
    const layer = index.slice(0, index.indexOf(`(#${f.name})`)).match(/^\*\*Layer (\d+) — [^*]+\*\*$/gm);
    assert.ok(layer && layer.at(-1).startsWith(`**Layer ${f.id[1]} —`), `${f.name} is listed under Layer ${f.id[1]}`);
  }
});

test('every link to a figure, from any document, reaches it', () => {
  const docs = { 'README.md': readme, 'docs/voyage-atlas-faq.md': faq, 'docs/voyage-atlas-schema.md': schema,
    'docs/voyage-atlas-enhancements.md': backlog, 'CHANGELOG.md': readRepoFile('CHANGELOG.md') };
  const targets = new Set([...figures.map(f => f.name), ...headingAnchors(guide)]);
  for (const [name, doc] of Object.entries(docs)) {
    for (const m of doc.matchAll(/voyage-atlas-guide\.md#([^)\s"]+)/g)) assert.ok(targets.has(m[1]), `${name}: #${m[1]}`);
  }
  for (const m of guide.matchAll(/\]\(#([^)]+)\)/g)) assert.ok(targets.has(m[1]), `guide: #${m[1]}`);
  // A link to the guide's file, from the README or a document beside it, reaches the file.
  const links = { 'README.md': [readme, ''], 'docs/voyage-atlas-faq.md': [faq, 'docs/'], 'docs/voyage-atlas-schema.md': [schema, 'docs/'] };
  for (const [name, [doc, dir]] of Object.entries(links)) {
    for (const m of doc.matchAll(/\]\(([^)#\s]*voyage-atlas-guide\.md)(?:#[^)]*)?\)/g)) assert.equal(require('node:path').normalize(dir + m[1]), 'docs/voyage-atlas-guide.md', `${name}: ${m[1]}`);
  }
  assert.ok(/\]\(docs\/voyage-atlas-guide\.md\)/.test(readme) && (faq.match(/\]\(voyage-atlas-guide\.md\)/g) || []).length === 2, 'the README and the FAQ point to the guide');
  for (const m of guide.matchAll(/Figures? ((?:\d+\.\d+(?:,| and)? ?)+)/g)) {
    for (const n of m[1].match(/\d+\.\d+/g)) assert.ok(figures.some(f => f.number === n), `guide mentions Figure ${n}`);
  }
});

test('every figure links to the FAQ, and every link from the guide reaches its file and heading', () => {
  const faqAnchors = headingAnchors(faq);
  for (const f of figures) assert.ok(/\]\(voyage-atlas-faq\.md#[^)]+\)/.test(f.text), `${f.name} links to the FAQ`);
  for (const m of guide.matchAll(/\]\(voyage-atlas-faq\.md#([^)]+)\)/g)) assert.ok(faqAnchors.has(m[1]), `FAQ #${m[1]}`);
  for (const m of guide.matchAll(/\]\(((?:\.\.\/)?[\w./-]+\.md)\)/g)) assert.doesNotThrow(() => readRepoFile(`docs/${m[1]}`), m[1]);
});

test('each screen figure has a light and a dark wireframe with the same text and a callout for each item', () => {
  const screens = figures.filter(f => f.text.includes('<picture>'));
  assert.deepEqual(screens.map(f => f.number), ['1.1', '1.2', '1.3', '1.4']);
  for (const f of screens) {
    const p = pictureOf(f.number);
    assert.equal(p.darkPath, p.lightPath.replace('-light.svg', '-dark.svg'), `${f.number}: the dark file is the light file's twin`);
    for (const svg of [p.light, p.dark]) {
      assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'), `${f.number}: an SVG file`);
      assert.ok(svg.includes(`<title id="t">Figure ${f.number}: ${f.title}</title>`), `${f.number}: the SVG's title is the figure's`);
      assert.equal((svg.match(/<text\b/g) || []).length, (svg.match(/<\/text>/g) || []).length);
      assert.equal((svg.match(/<g\b/g) || []).length, (svg.match(/<\/g>/g) || []).length);
    }
    assert.deepEqual(svgTexts(p.dark), svgTexts(p.light), `${f.number}: light and dark say the same`);
    const shape = svg => svgGroups(svg).map(g => ({ ...g, boxes: g.boxes.map(({ box, checked }) => ({ box, checked })) }));
    assert.deepEqual(shape(p.dark), shape(p.light), `${f.number}: light and dark group the same, colors aside`);
    assert.ok(p.alt.length > 20, `${f.number}: the image has alt text`);
    const items = [...f.text.matchAll(/^(\d+)\. \*\*/gm)].map(m => Number(m[1]));
    const callouts = svgCallouts(p.light);
    assert.deepEqual([...callouts].sort((a, b) => a - b), items, `${f.number}: one callout for each numbered item, 1 to ${items.length}`);
  }
});

test('the editor wireframes carry the editor\'s own labels, in screen order', () => {
  const header = [...inside(editor.html, '<div class="head-actions">', '<!-- ═══════════ MAIN').matchAll(/<button[^>]*class="head-btn[^"]*"[^>]*>([^<]+)<\/button>|<button id="theme-btn"[^>]*>([^<]+)<\/button>/g)].map(m => m[1] || m[2]);
  assert.deepEqual(header, ['Load ▾', 'Save', '▾', '◐']);
  const rapid = editor.html.match(/<button id="rapid-click-toggle"[^>]*>([^<]+)<\/button>/)[1];
  const screen = svgTexts(pictureOf('1.1').light).join('\n');
  assert.equal(inOrder(screen, [...header, 'Voyage Settings', '⊞', '⊟', '⊞', '⊟', '🌍 Look up all countries', '+ Add chapter', searchPlaceholder(), 'Search', rapid, "FAQ / Owner's Manual", 'A project of Sailing Grace']), true);
  for (const label of ['<span>Voyage Settings</span>', '>🌍 Look up all countries</button>', '>+ Add chapter</button>', '>Search</button>', ">FAQ / Owner's Manual</a>", '>A project of Sailing Grace</a>']) {
    assert.ok(editor.html.includes(label), `the editor shows ${label}`);
  }
  const columns = [...inside(editor.defs.renderWaypointPanel, '<thead>', '</thead>').matchAll(/<th[^>]*>([^]*?)<\/th>/g)].map(m => plain(m[1])).filter(Boolean);
  const chapter = svgTexts(pictureOf('1.2').light).join('\n');
  assert.equal(inOrder(chapter, upper(formLabels)), true, 'the chapter form');
  assert.equal(inOrder(chapter, toolbarButtons()), true, 'the waypoint toolbar');
  assert.deepEqual(svgGroup(pictureOf('1.2').light, { part: 'columns' }), upper(columns), 'the column headings');
  // The chapter header's parts, in the order of the .ch-header markup.
  // The caption's first nine items name the header's parts in that order.
  const parts = [['≡', 'ch-drag'], ['Chapter number', 'ch-num'], ['Name', 'ch-name'], ['Era chip', 'ch-era'], ['Connection indicator', '${syncEl}'],
    ['Distance', 'ch-nm'], ['📋', 'Chapter metadata'], ['📍', 'title="Waypoints"'], ['✕', 'ch-delete']];
  assert.equal(inOrder(editor.defs.createChapterElement, parts.map(p => p[1])), true, 'the chapter header markup');
  assert.deepEqual(boldItems(caption('1.2')).slice(0, 9), parts.map(p => p[0]), 'the caption names the header\'s parts in screen order');
  assert.ok(editor.js.includes('<span class="ch-sync linked"') && editor.defs.chapterSyncHTML.includes('approach < 1'));
});

test('the editor wireframes show the sample voyage as the editor computes it', () => {
  const p11 = pictureOf('1.1').light, p12 = pictureOf('1.2').light;
  assert.deepEqual(svgGroup(p11, { part: 'stats' }), ed.stats, 'the header stats');
  for (const ch of sample.chapters) {
    const t = svgGroup(p11, { chapter: ch.num });
    const expected = ['≡', String(ch.num), null, ch.era.toUpperCase(), ...(ed.sync(ch) ? [ed.sync(ch)] : []), ed.dist(ch), '📋', '📍', '✕'];
    assert.equal(t.length, expected.length, `chapter ${ch.num}: its parts, with an indicator only where the editor shows one`);
    expected.forEach((e, i) => assert.ok(e === null ? truncated(t[i], ch.name) : t[i] === e, `chapter ${ch.num}: ${t[i]} for ${e ?? ch.name}`));
  }
  const active = sample.chapters[1];
  assert.deepEqual(svgGroup(p11, { part: 'status' }), [`Chapter ${active.num}: ${active.name}`, `· ${active.waypoints.length} rows · ${ed.dist(active)}`]);
  assert.ok(editor.js.includes("'row' : 'rows'} · ${namedCount} named"), 'the waypoint count the toolbar shows');
  // Figure 1.2: the same chapter, part by part.
  assert.deepEqual(svgGroup(p12, { chapter: active.num }), ['≡', String(active.num), active.name, active.era.toUpperCase(), ed.sync(active), ed.dist(active), '📋', '📍', '✕']);
  const form = svgGroup(p12, { part: 'form' });
  const [m1, y1, m2, y2] = active.when.replace('–', ' ').split(/\s+/);
  const values = [active.name, `${active.era[0].toUpperCase()}${active.era.slice(1)} ▾`, `${m1} ▾`, `${y1} ▾`, `${m2} ▾`, `${y2} ▾`, String(active.padMultiplier),
    ...(active.blogUrl ? [active.blogUrl] : []), `AUTO: ${ed.countries(active).join('; ')}`, ...(active.keyDestinations.length ? [active.keyDestinations.join('; ')] : [])];
  assert.equal(inOrder(form.join('\n'), values), true, 'the form shows the chapter\'s values');
  const named = active.waypoints.filter(w => w.name.trim()).length;
  assert.equal(svgGroup(p12, { part: 'toolbar' }).at(-1), `${active.waypoints.length} rows · ${named} named`);
  const fills = { true: new Set(), false: new Set() };
  active.waypoints.slice(0, 5).forEach((w, i) => {
    const row = svgGroups(p12).find(g => g.data.row === String(i + 1));
    assert.ok(row, `row ${i + 1}`);
    assert.deepEqual(row.texts, ['≡', String(i + 1), w.name.trim() ? w.name : '(shaping vertex)', String(w.lat), String(w.lon), w.country, '✕'], `row ${i + 1}`);
    assert.deepEqual(row.boxes.map(b => [b.box, b.checked]), [['M', w.major], ['G', w.gateway], ['D', w.decision]], `row ${i + 1}: the M, G and D boxes`);
    row.boxes.forEach(b => fills[b.checked].add(b.fill));
  });
  assert.ok(fills.true.size === 1 && fills.false.size === 1 && ![...fills.true].some(f => fills.false.has(f)), 'a ticked box is drawn filled, an empty one not');
});

test('the viewer wireframes carry the viewer\'s own labels, in screen order', () => {
  const actions = inside(viewer.html, '<div class="head-actions">', '</div>');
  const header = [...actions.matchAll(/>([^<>]+)<\/(?:button|a)>/g)].map(m => m[1]);
  assert.deepEqual(header, ['Load…', 'Chart your own voyage →', '◐']);
  const layers = [...inside(viewer.html, '<div class="panel" id="filter"', '</div>\n</div>').matchAll(/<label class="toggle"><input[^>]*> ([^<]+)<\/label>/g)].map(m => m[1].trim());
  const key = [...viewer.html.matchAll(/<span class="route-sample[^"]*"><\/span> ([^<]+)<\/span>/g)].map(m => m[1]);
  assert.deepEqual(key, ['Sailed or under way', 'Planned']);
  const screen = svgTexts(pictureOf('1.3').light).join('\n');
  assert.equal(inOrder(screen, ['☰', ...header]), true, 'the header');
  assert.deepEqual(svgGroup(pictureOf('1.3').light, { part: 'layers' }), ['CHART & LAYERS', '▾', layers[0], ...key, ...layers.slice(1)], 'Chart & Layers');
  assert.equal(inOrder(screen, ['Gateway ports', 'CHAPTERS', ...sample.chapters.map(c => c.name.split(' ')[0])]), true, 'the Chapters list');
  for (const label of ['<span>Chart &amp; Layers</span>', '<span>Chapters</span>', '>Notes</div>', '>Countries / Territories</div>', '>Read the posts →</a>']) {
    assert.ok(viewer.html.includes(label), `the viewer shows ${label}`);
  }
  assert.ok(viewer.html.includes('<h2>Voyage Chapters</h2>'));
  const narrow = svgTexts(pictureOf('1.4').light);
  const phone = narrow.slice(narrow.findIndex(t => t.startsWith('640 PX')));
  const wide = narrow.slice(0, narrow.findIndex(t => t.startsWith('640 PX')));
  assert.equal(inOrder(wide.join('\n'), ['☰', 'Voyage Atlas', '◐', 'CHART & LAYERS', 'Voyage Chapters', 'Chart your own voyage →', vw.stats[0], 'Load…', sample.chapters[0].name]), true, 'the drawer at 900 px');
  assert.ok(!wide.includes('Load…') || wide.indexOf('Load…') > wide.indexOf('Voyage Chapters'), 'Load… only in the drawer at 900 px');
  assert.equal(inOrder(phone.join('\n'), ['☰', 'Voyage Atlas', '◐', 'CHART & LAYERS', '▸', 'NOTES', "FAQ / Owner's Manual", 'A project of Sailing Grace']), true, 'the phone');
  assert.ok(!phone.includes('CHAPTERS') && !phone.includes('Load…'), 'no Chapters list and no header Load… on a phone');
  // The breakpoints and layer defaults the guide states.
  const widths = html => new Set([...html.matchAll(/@media[^{]*\(max-width: (\d+)px\)/g)].map(m => Number(m[1])));
  assert.deepEqual([...widths(viewer.html)].sort((x, y) => x - y), [640, 900], 'the viewer\'s breakpoints');
  assert.ok(widths(editor.html).has(900), 'the editor hides its header stats at 900 px');
  assert.ok(guide.includes('900 px wide or less') && guide.includes('640 px wide or less'));
  for (const id of ['t-routes', 't-wpts']) assert.match(viewer.html, new RegExp(`id="${id}" checked`), `${id} is on by default`);
  for (const id of ['t-dec', 't-gate']) assert.doesNotMatch(viewer.html, new RegExp(`id="${id}" checked`), `${id} is off by default`);
});

test('the viewer wireframes show the sample voyage as the viewer computes it', () => {
  const p13 = pictureOf('1.3').light, p14 = pictureOf('1.4').light;
  assert.deepEqual(svgGroup(p13, { part: 'stats' }), vw.stats, 'the header stats');
  assert.deepEqual(svgGroup(p14, { part: 'stats' }), vw.stats, 'the drawer stats');
  for (const ch of sample.chapters) {
    assert.equal(svgGroup(p13, { chapter: ch.num, part: 'list' }).join(' '), ch.name, `Chapters list: ${ch.name}`);
    const row = svgGroup(p14, { chapter: ch.num, part: 'drawer' });
    assert.deepEqual(row.slice(0, 2), [ch.when, ch.name], `drawer: ${ch.name}`);
    assert.equal(row.slice(2).join(' '), ch.keyDestinations.join(' · '), `drawer: ${ch.name}'s key destinations`);
  }
  const detailed = svgGroups(p13).find(g => g.data.part === 'detail');
  const ch = sample.chapters.find(c => String(c.num) === detailed.data.chapter);
  assert.deepEqual(detailed.texts, [ch.when.toUpperCase(), ch.name, vw.dist(ch), ...(ch.notes ? ['NOTES', ch.notes] : []), 'COUNTRIES / TERRITORIES',
    vw.countries(ch).join(' · '), ...(/^https?:\/\//i.test(ch.blogUrl || '') ? ['Read the posts →'] : [])], 'the detail panel');
  const sheet = svgGroups(p14).find(g => g.data.part === 'sheet');
  const sc = sample.chapters.find(c => String(c.num) === sheet.data.chapter);
  assert.deepEqual(sheet.texts.slice(0, 4), [sc.when.toUpperCase(), sc.name, vw.dist(sc), 'NOTES'], 'the phone sheet');
  const at = sheet.texts.indexOf('COUNTRIES / TERRITORIES');
  assert.ok(at > 4, 'the phone sheet shows the countries after the notes');
  assert.equal(sheet.texts.slice(4, at).join(' '), sc.notes, 'the phone sheet\'s notes');
  assert.deepEqual(sheet.texts.slice(at + 1), [vw.countries(sc).join(' · ')], 'the phone sheet\'s countries');
});

test('the figures the guide states match the tools', () => {
  const ed2 = editor.js;
  assert.match(ed2, /const LOOKUP_CONFIRM_THRESHOLD = 30;/);
  assert.ok(caption('3.4').includes('30') || mermaid('3.4').includes('30 or more'));
  assert.ok(/id="bulk-count" value="10" min="1" max="500"/.test(editor.html));
  assert.ok(mermaid('2.5').includes('10 by default, up to 500'));
  assert.match(ed2, /const DEFAULT_PAD = 1\.2;/);
  assert.ok(mermaid('2.4').includes('Pad Multiplier 1.2') && caption('3.3').includes('1.2'));
  assert.ok(editor.defs.makeChapter.includes('DEFAULT_PAD') && editor.defs.makeChapter.includes("era: 'future'") && editor.defs.makeChapter.includes("name: 'New Chapter'"));
  assert.ok(editor.defs.addChapter.includes('STATE.chapters.push(makeChapter(num))') && editor.defs.addChapter.includes('selectChapter(num)'), 'a new chapter goes at the end and is selected');
  assert.ok(ed2.includes("e.key === 'ArrowUp' ? 0.01 : -0.01") && mermaid('2.6').includes('↑ ↓ step 0.01°'));
  // Half a nautical mile: the approach leg is rounded to whole miles, and the 🔗 shows below 1.
  const { chapterApproachNm } = pick(editor, ['chapterApproachNm']);
  const nm = 1 / 60;
  const pair = gap => [{ num: 1, waypoints: [{ name: 'A', lat: 0, lon: 0 }] }, { num: 2, waypoints: [{ name: 'B', lat: gap * nm, lon: 0 }] }];
  assert.equal(chapterApproachNm(pair(0.45)[1], pair(0.45)), 0);
  assert.equal(chapterApproachNm(pair(0.55)[1], pair(0.55)), 1);
  assert.ok(mermaid('2.7').includes('half a nautical mile'));
  // The unsaved-changes prompt and its buttons.
  for (const s of ["'Discard unsaved changes?'", "'Discard changes'", "'Keep editing'"]) assert.ok(editor.defs.guardDirty.includes(s), s);
  assert.ok(mermaid('2.2').includes('Discard unsaved changes?') && mermaid('2.2').includes('Keep editing · Discard changes'));
});

test('the flows name the tools\' menus, forms and choices in screen order', () => {
  assert.equal(inOrder(mermaid('2.2'), chooserTitles(editor.html)), true, 'the editor chooser');
  const load = menuItems(editor.html, 'import-menu');
  assert.deepEqual(load, ['Load a voyage file…', 'Import CSVs (chapters + waypoints)…', 'Import GPX…', 'New voyage', 'Sample voyage']);
  assert.equal(inOrder(mermaid('2.2'), load.map((b, i) => `${i + 1}. ${b}`)), true, 'the Load menu');
  const settings = [...inside(editor.html, '<div id="settings-body">', '</div>\n      </div>').matchAll(/<label for="set-[^"]*">([^<]+?) <span/g)].map(m => m[1]);
  assert.equal(inOrder(mermaid('2.3'), settings.map(s => `["${s}"]`)), true, 'Voyage Settings');
  assert.equal(inOrder(mermaid('2.4'), formLabels.map((l, i) => `${i + 1}. ${l}`)), true, 'the chapter form');
  assert.equal(inOrder(mermaid('2.5'), [...toolbarButtons().slice(0, 3).map(b => `["${b}"]`), 'Rapid click', searchPlaceholder()]), true, 'the ways to add points');
  assert.equal(inOrder(mermaid('2.8'), ['["Save"]', ...menuItems(editor.html, 'export-menu').map(b => `["${b}"]`)]), true, 'Save and its menu');
  assert.equal(inOrder(mermaid('2.9'), chooserTitles(viewer.html)), true, 'the viewer chooser');
});

test('the guide says chart, not map, and every Mermaid block is a flowchart without color or links', () => {
  const prose = guide.replace(/```[\s\S]*?```/g, '').replace(/<picture>[\s\S]*?<\/picture>/g, '');
  assert.ok(!/\bmaps?\b/i.test(prose), 'charts, not maps, in the prose');
  for (const f of figures.filter(x => x.text.includes('```mermaid'))) {
    const block = mermaid(f.number);
    assert.ok(!/\bmaps?\b/i.test(block), `${f.number}: charts, not maps`);
    assert.ok(/^flowchart (TD|LR)\n/.test(block), `${f.number}: a flowchart`);
    assert.ok(!/^\s*(classDef|style|click|linkStyle)\b/m.test(block), `${f.number}: no colors or click links, so GitHub's theme and security settings apply`);
  }
  for (const n of ['1.1', '1.2', '1.3', '1.4']) {
    const p = pictureOf(n);
    assert.ok(!/\bmaps?\b/i.test(unescapeXml(p.light.replace(/<[^>]+>/g, ' ')) + ' ' + p.alt), `${n}: charts, not maps, in the text, title and description`);
  }
});
