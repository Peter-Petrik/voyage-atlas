# Voyage Atlas — Future Enhancements

Forward-looking backlog of features deliberately **not** built yet. The project now comprises two
components: the **editor** (`voyage-atlas-editor.html`, manages chapter and waypoint data) and the
**viewer** (`voyage-atlas.html`, renders the interactive map). Items are grouped by component
and priority tier. Version history lives in `CHANGELOG.md`; build decisions live in
`voyage-atlas-runbook.md`.

> Near-term operational tasks (editor iterations, bug fixes, immediate UI improvements) are tracked
> in the **Near-term** section below. This document is a feature/idea backlog, not a sprint board.

---

## Near-term — Editor improvements (queued for implementation)

### 1. Help text `(i)` icons on all fields
Every field in the editor (chapter metadata and waypoint table columns) gets a small info icon
that reveals contextual help text explaining the field's purpose, expected format, and how it
affects the viewer. First pass: author help text based on existing system knowledge; refine with
user feedback.

### 2. Chapter endpoint synchronization
Currently, the last waypoint of chapter N and the first waypoint of chapter N+1 can be the same
point but are stored independently — editing one doesn't update the other. **Locked decision:** the
connecting leg's nm counts toward the *destination* chapter (captures "getting to the starting
point"). Implementation options: (a) auto-link visual only (route line connects, nm computed
including the leg), or (b) remove the duplicate waypoint from N+1 and auto-connect from N's last
point. Option (a) is simpler and preserves chapter independence.

### 3. Midpoint insertion on route legs
A "ghost" draggable point renders at the midpoint of each leg between consecutive waypoints. Clicking
or dragging the ghost inserts a new waypoint at that position, splitting the leg. This enables
bending a route line, adding detours, or creating intermediate stops without manually entering
coordinates. Standard interaction pattern from chartplotters and route editors.

### 4. Country auto-populate via reverse geocoding
When a waypoint's coordinates are set (by Nominatim search, map click, or manual entry), the
`country` field auto-populates via Nominatim reverse geocoding. User can override. Respects
Nominatim's 1 req/sec rate limit — batch on import, individual on manual edits.

### 5. Chapter countries auto-aggregate
The chapter-level `countries` field auto-populates from the distinct countries of its named waypoints.
User can add/remove entries manually. Updates dynamically as waypoints are added or edited.

### 6. Month/year dropdowns for "When" field
Replace the free-text "When" field with structured start/end month+year dropdowns. Month displays
as 3-letter abbreviation (Jan, Feb, Mar…). The structured format enables future sequence validation
and timeline visualizations.

### 7. Sequence validation (chapter dates and waypoint ordering)
Warn (not block) when chapter date ranges overlap, run out of sequence, or leave gaps. Similarly,
flag waypoints that appear geographically out of order (large bearing reversals). Advisory only —
intentional out-of-sequence routing exists (e.g., Svalbard out-and-back in Ch 7).

### 8. Expand-all toggle
Ability to expand/collapse all chapters' metadata panels, waypoint tables, or both simultaneously.
Useful for bulk review and when exporting screenshots.

### 9. CSV export flow consolidation
Currently, chapters.csv and waypoints.csv are separate export buttons. Consider a single "Export
CSVs" action that downloads both (as sequential downloads, or a combined zip). Alternatively, a
unified export modal that shows all format options (JSON, CSV pair, KML, GPX) in one place.

### 10. Decision (D) and Gateway (G) visual markers
Currently, Major (M) renders as a larger circle marker. Decision and Gateway checkboxes are wired
in the data model but need distinct visual styling in both the editor map and the viewer.
Proposed: Decision = diamond-shaped marker; Gateway = star/badge marker. Help text and FAQ should
explain the semantic distinction: Major = provisioning/spares hub; Decision = routing fork (e.g.,
Costa Brava vs direct, Svalbard go/no-go); Gateway = customs/entry point or strategic staging port.

### 11. Metadata field consolidation
v2.0 consolidates `routing`, `bailout`, and `prose` into a single `notes` field (free-form
textarea). `keyDestinations` is retained as a separate field (useful for viewer summary display).
**Migration required** for existing v1 JSON: routing and bailout text need to be merged into the
new notes field during import. The import function should handle this automatically — concatenate
routing + bailout + prose with labelled sections.

### 12. Unsaved-changes warning
`beforeunload` handler warns the user before closing/navigating away from a tab with unsaved
changes. Standard browser pattern.

### 13. Date-prefixed export filenames
All exported files prepend `YYYY-MM-DD-` to the filename (e.g., `2026-05-28-voyage-data.json`)
so iterative exports don't overwrite each other.

---

## Near-term — Viewer improvements

### 14. Runtime JSON loading
Refactor the viewer to load JSON data at runtime (file picker or URL parameter) instead of
baked-in `const DATA = {...}`. The baked-in model becomes a "Save as self-contained HTML" export
option from the editor.

### 15. Settings panel (palette, hero overrides)
A viewer-side panel for adjusting chapter palette colors, overriding derived hero stats
(nations/territories counts), and toggling display options. Settings export as part of the
self-contained HTML save.

### 16. Blog-post links in viewer UI
The `blogUrl` field is built (v1.1) but has no viewer UI. Add a "Read the posts →" link in the info
panel and/or drawer row, shown only when `blogUrl` is present.

---

## Medium-term — Data interchange

### 17. GPX import (past chapters)
Import a GPX track to populate or replace a chapter's waypoints. Primary use case: updating a
chapter from "future" (planned) to "past" (traveled) using actual track data from a chartplotter,
NoForeignLand, or similar. The GPX track translates to waypoints in the editor; the user can then
remove or adjust points as needed. A track reduction algorithm (Douglas-Peucker or similar) should
simplify dense GPS tracks to a manageable number of waypoints.

### 18. GPX export
Export the route as a GPX file (waypoints + route, or track). Complement to the existing KML export.

### 19. Undo/redo
State snapshot stack with keyboard shortcut (Ctrl/Cmd+Z for undo, Ctrl/Cmd+Shift+Z for redo).
Captures snapshots on waypoint add/delete/move, chapter add/delete/reorder, and bulk operations.
Particularly valuable when accidentally moving a waypoint or deleting a row. Implementation:
store serialized state snapshots in a fixed-size ring buffer (e.g., last 50 actions).

### 20. Self-contained HTML export (bake JSON into viewer)
Export a single HTML file with the voyage data baked in — no separate JSON file needed. The
viewer currently loads JSON at runtime (file picker or auto-load from same directory). This
feature would add a "Download as single HTML" option that injects the current JSON into a copy
of the viewer template, producing a standalone file the user can host, email, or open locally.
This is the complement to the auto-load model: auto-load is for the user's own server (two
files), baked HTML is for sharing (one file). Implementation: the editor reads the viewer
template, injects `const DATA = {...}` into a script tag, downloads the combined file.

### 21. KML fly-over export configuration
Export KML with Google Earth tour/fly-over capability. Based on the approach developed in
[prior session](https://claude.ai/chat/86e41592-62d5-41e5-8ebb-c3edfb1d6cdb): animated camera
following the route with configurable speed, altitude, tilt, and heading. A settings panel in
the editor would allow the user to configure fly-over parameters (camera altitude, speed,
pause duration at waypoints) before exporting. The KML would include `<gx:Tour>` and
`<gx:FlyTo>` elements for Google Earth Pro playback.

---

## Future — Reference data overlays

### 22. Wind data overlay toggle
**Inspired by:** [Horizory.com](https://horizory.com) — a free web app by Bosse (German cruiser)
that overlays ERA5 climatology wind roses on an interactive map, shows wind angle/Beaufort
distribution per leg by month, supports boat polar uploads, and displays ocean currents and
tropical storm risk zones.
**Forum discussion:** https://forums.sailboatowners.com/threads/new-voyage-planning-tool-for-cruisers.1249943395/

**Concept:** Toggleable layer in the viewer that visualizes prevailing wind conditions along route
legs, selectable by month. Draws from the existing structured wind data files (SeaWinds/QuikSCAT
10-year averages, five ocean basin files + methodology guide in project knowledge). Not for
departure-decision weather routing (that's LuckGrib's job) — for strategic validation that a given
chapter's seasonal window aligns with favorable prevailing winds.

**Presentation options:** range from simple (color-coded leg segments by wind favorability: green =
favorable, yellow = marginal, red = headwind) to complex (wind rose icons at waypoints showing
direction/speed distribution for the selected month).

**Open question:** Whether this is viewer-only visualization or whether it feeds back into the
editor (e.g., flagging legs with unfavorable wind angles for the specified travel month).

**Dependencies:** v2.0 data model pivot (done); wind data parsing/structuring.

### 23. Cornell's World Cruising Routes — reference data layer
**Source:** Jimmy Cornell, *World Cruising Routes* (9th ed., 2022). ~6,000 waypoints across ~1,000
routes covering all oceans, with seasonal timing, wind/current data, and port-of-entry information.
The definitive reference for circumnavigators for 25+ years.

**The data exists only in print** — no GPX, no digital download, no app. Early editions (1990s)
offered a floppy disk with coordinates; nothing comparable exists for the current edition. The
companion *Cornell's Ocean Atlas* (3rd ed., 2023) contains pilot chart wind data, not route
waypoints.

**Two use cases:**
1. **Reference layer in the viewer.** Cornell routes as a toggleable overlay — "here's what the
   bible says for this ocean basin" alongside the user's own chapter routing. Read-only.
2. **Import-as-starting-point in the editor.** Load Cornell waypoints for a region, reshape into
   chapters — delete what doesn't apply, add custom stops, assign seasonal windows. Turns a flat
   route list into a strategic framework.

**Data acquisition paths:**
1. Community contribution — shared effort to digitize the most-sailed routes (~50–100 of ~1,000).
   Natural communities: AMEL 50/60 owners group, OCC, Ocean Posse.
2. OCR + manual cleanup — structured, repetitive waypoint format is tractable.
3. Per-user manual entry — each sailor digitizes only routes relevant to their own voyage.

**Open questions:** Copyright implications (coordinates are facts, but route organization and naming
convention are editorial work); whether to support Cornell's route-ID taxonomy (e.g., "AN161") as a
first-class field; whether Ocean Atlas pilot chart data could feed the wind overlay feature.

**Publisher links:** [Noonsite (book)](https://www.noonsite.com/book/world-cruising-routes/) ·
[Nautical Mind (atlas)](https://www.nauticalmind.com/81346/cornells-ocean-atlas/)

---

## Future — Sharing & distribution

### 24. Hosted sharing with stable URLs
**Inspired by:** [TravelMap.net](https://travelmap.net) — each user gets a custom subdomain
(e.g., `captaindarwin.travelmap.net`). Zero infrastructure for the creator. 350,000+ users.
**Example:** https://captaindarwin.travelmap.net

**Concept:** Users upload CSV/JSON via a simple web form, get a stable URL (subdomain or path-based,
e.g., `grace.voyagemap.dev` or `voyagemap.dev/grace`) that serves their interactive viewer. No
accounts needed — could be token-authenticated for edits.

**Current model:** self-contained HTML + JSON, host anywhere or open locally. Right model for now.
Subdomain hosting is the next step up — keeps the zero-friction creator experience but adds
discoverability and stable shareable URLs.

**Open questions:** Subdomain vs path-based URLs; static hosting (GitHub Pages / Cloudflare Pages
with user-submitted data) vs dynamic backend; whether edit capability lives in the hosted version
or stays local-only.

**Prerequisites:** v2.0 data model (done), generic viewer (decoupled from GRACE-specific data), and
a real demand signal from the AMEL group, OCC, or similar community.

---

## Future — Viewer features (carried from v1.x backlog)

### 25. Decision-point and gateway-port markers
Diamond icons for decision points, badge/star icons for gateways. Layer and legend toggles are wired
and empty in the v1.1 viewer — populate when the editor data model includes these flags (v2.0 does).

### 26. Voyage-highlights layer
Furthest north/south, equator crossings, the antipode, longest passage, etc. Toggleable overlay.

### 27. Tabbed info-panel sections
Split the viewer's chapter info panel into tabs (e.g., Routing / Wind / Resources / References)
rather than stacked prose.

### 28. Narrow-window passage timeline
Linear timeline strip for time-constrained legs: Patagonia channel-by-channel, the Svalbard
out-and-back, the Drake Passage attempt sequence, the Cape Verde → Brazil tradewind window.

### 29. Marker declutter at low zoom
Clustered markers or zoom-dependent thinning for dense waypoint regions.

### 30. Chapter card grid / map+narrative split
Chapter cards below the map, or a split layout. v1.x is map-only.

### 31. PWA manifest + iframe embed
Full PWA support (currently basic mobile meta only). Trades against single-file goal.

### 32. Social / SEO metadata
`og:image` and JSON-LD structured data for shared links.

### 33. Waypoint search
Search/filter waypoints across all chapters from the viewer.

### 34. Mutually exclusive / variant chapters
Support for alternative chapter routing — two or more chapters that represent different options
for the same time window (e.g., "Patagonia via channels" vs "Patagonia via offshore"). The data
model would need a "variant group" field that links alternative chapters. The viewer would show
them as toggleable branches (only one visible at a time). The editor would allow marking chapters
as variants of each other and computing hero stats for each combination. Requires careful UX
design: how do variant chapters affect nm totals, country counts, and timeline display?

**Fork-readiness (as of v2.5):** distance attribution and endpoint sync are built on a single
`getPredecessorChapter()` helper rather than hard-coded `num − 1` positional logic. This is the
seam for forks: when variant chapters arrive, two chapters declaring the same predecessor *is*
the fork definition. Switching `getPredecessorChapter()` from positional lookup to an explicit
`follows` field is the only routing change needed — the approach-leg nm math and the ⇄ pull-sync
both adapt automatically. Total nm will need to become a range (e.g., "75,000–78,000 nm") since
mutually-exclusive variants must not both be summed. Explicit-pull sync (not auto-bidirectional)
was chosen specifically because a forked endpoint feeds multiple successors, which has no
coherent auto-sync answer.

**Open design question — chapter naming/numbering under forks (resolve when building):** flat
alphabetic suffixes (12a, 12b) are intuitive and visually flag forks, but break down in the hard
cases: forks that don't readily rejoin; a fork whose branches each fork again (12a → two
successors, 12b → two successors); deep nesting. Candidate models to weigh, none chosen yet:
(1) alpha suffix (12a/12b) — intuitive but collapses under nesting; (2) decimal/dotted (12.1,
12.1.1) — handles nesting but reads as version numbers; (3) a **variant label decoupled from the
sequence number** — the chapter keeps a stable id while a separate label expresses its branch
position. This is a fork-feature decision; capture only, do not resolve here.

---

## Near-term — additional editor/viewer features

### 35. Bulk waypoint select + delete
Multi-select waypoint rows via CTRL/⌘-click (non-adjacent) and SHIFT-click (range), then delete
the selection in one action. Needs a selection-state model and a "Delete selected (N)" affordance.
Raised during testing; medium effort, primarily selection-UI design.

### 36. True in-place Save via File System Access API
Today "Save" downloads `voyage-data.json` with a fixed filename (browser overwrites the prior
download). The File System Access API (`showSaveFilePicker` / writable streams) would allow the
editor to write back to the *same file on disk* after a one-time permission grant, making Save
behave like a desktop app. **Constraint:** Chromium-only (Chrome/Edge); not supported in Safari or
Firefox. Would be a progressive enhancement — feature-detect and fall back to the download model.

### 37. Viewer inter-chapter connection rendering (fork-aware)
The viewer currently renders each chapter's route independently, so a genuine inter-chapter gap
(e.g., the 628 nm NZ→Japan repositioning) shows as two disconnected segments. Draw a faint/dashed
connector from each chapter's last waypoint to its successor's first waypoint. **Must be designed
fork-aware from the start:** keyed off the same `getPredecessorChapter()` seam as the editor, a
fork (one endpoint feeding multiple successors) produces *branching* dashed connectors — which
becomes the visual signature of a fork on the map. Variant connectors should get distinct styling
(dash pattern or color) from normal handoffs, and reconvergence (two branches rejoining one
chapter) needs a rule. Build alongside the fork feature (#34) since the two are visually
intertwined.

### 43. PAZ (avoidance-zone) authoring in the editor — targeted v2.7
The viewer already renders a `DATA.paz` array (`{zone, bounds:[s,w,n,e]}`) as dashed bounding-box
rectangles via the avoidance-zones toggle (dateline-aware), but the editor has no authoring UI —
zones must be hand-written into the JSON. Add visual authoring so PAZ can be created and edited in
the editor. **Design (resolved at kickoff, deferred from the v2.6 batch):**
1. **Geometry — rectangles to start.** Bounding boxes match what the viewer renders today and what
   the schema documents; polygons can follow later if a real need appears.
2. **Authoring — draw-on-map + an editable zone table.** Drag a rectangle on the map; a table lists
   zones with a name and editable bounds, mirroring the chapter/waypoint authoring pattern.
3. **Storage — a top-level `paz` JSON array** (`[{zone, bounds:[s,w,n,e]}, …]`), the exact shape the
   viewer already consumes. A `zones.csv` import/export can follow later, paralleling the
   chapters/waypoints CSVs.
> **Why deferred from v2.6:** v2.6 was scoped to fixes plus the generalization (units, single Voyage
> Title, v1 removal); PAZ authoring is net-new UI with its own data-model surface and is better given
> its own cycle. Hand-authored `paz` keeps rendering in the viewer in the meantime.

---

## Publishing & distribution (repo TODOs)

These are operational tasks for the public GitHub release, not tool features. The repo scaffolding
(README, GPL-3.0 LICENSE, `docs/` layout, sample `voyage-data.json`) is done; these remain.

### 38. Live example URL
Once the full atlas is published on sailingamazinggrace.com, insert its URL into the README (the
"full live example" line, currently a `TODO`) and anywhere the FAQ would benefit from pointing at a
rich, real example. The repo ships a minimal sample `voyage-data.json` (a short Greek Ionian
cruise) for an immediate working demo; the live URL is the "see a real voyage" companion.

### 39. README screenshot
Add a viewer screenshot to the README (placeholder `TODO` comment is in place). A light + dark pair,
or a single light-theme shot of a populated map, communicates the tool faster than prose.

### 40. GitHub Pages live demo (optional)
Host `voyage-atlas.html` + the sample `voyage-data.json` on GitHub Pages so the repo has a
one-click live demo (the viewer auto-loads the co-located data). Low effort given the two-file,
no-build architecture; mainly a Pages config + a link from the README.

---

## From the v2.6.1 test pass — v2.7 candidates

Surfaced during the v2.6.1 test pass. The first four (44–47) **shipped in v2.7**; the rest are
captured ideas. The recompute model, the Load/Import verb, and the waypoint/vertex naming formed a
natural v2.7 cluster.

### 44. Recompute derived stats on load (stop trusting stored hero figures) — ✓ shipped v2.7
`meta.hero` (distance, chapters, waypoints, nations, territories) is *derived* data; storing it lets
it drift the moment anyone hand-edits the JSON. Approach: editor and viewer recompute all base figures
from chapters/waypoints on load, apply the explicit overrides (`nmOverride` / `nationsOverride` /
`territoriesOverride`) on top, and treat `meta.hero` as a generated snapshot — written on save, never
trusted for display. Mirrors the on-the-fly unit conversion already in place. Net: only the overrides
are authoritative; everything else is always live.

### 45. Unify "Load" vs "Import" nomenclature — ✓ shipped v2.7
Pick one verb. **Load** = opening a JSON file (both tools); **Import** = merging tabular CSV data.
Today the editor says "Import" for JSON while the viewer's landing says "Load JSON…" — inconsistent.
Rename so JSON is always "Load." Ties to #49 (the `?import=yes` override must match the chosen verb).
**Shipped:** the editor's data menu reads **Load ▾ → Load JSON…**; **Import CSVs…** is unchanged.

### 46. Waypoint / named-waypoint / shaping-vertex nomenclature — ✓ shipped v2.7
Keep **waypoint** as the generic term for any row/point on the map. Use **named waypoint** for labeled
rows that render as markers and **shaping vertex** for the unnamed route-benders. Stats and help text
should say which they count (the chapter row-count toggle, the hero "waypoints" figure). Apply
consistently across UI labels, tooltips, and docs.
**Shipped:** the editor status line reads "N named waypoints · M shaping vertices" and unnamed-point
labels say "shaping vertex"; the viewer hero stat keeps the generic "Waypoints" (it renders no vertices).

### 47. Brand colour `#a32e38` as the accent — ✓ shipped v2.7
Adopt the sailingamazinggrace.com brand crimson `#a32e38` as the light-theme accent (replacing
`#8e622b`). Contrast (computed): on light backgrounds `#a32e38` is **6.1–6.6:1** — passes AA-normal
with *more* headroom than the current brass (4.7–5.0:1); white-on-crimson is 7.0:1, so accent-filled
buttons are fine. On the dark theme `#a32e38` **fails** (2.4–2.6:1, below the 3:1 floor), so dark must
keep a *lightened* crimson rather than the raw brand colour — candidate `#d4626c` (5.0:1 bg / 4.7:1
panel, AA-normal) or `#de7882` (6.2 / 5.8, more headroom), replacing the current gold `#d8b15a`.
**Shipped:** light `#a32e38`, dark `#d4626c` (the AA-passing lightened crimson); accent-derived
tints and the dark theme's borders follow the new hue.

### 48. Footer version → CHANGELOG link
Make the version footer in both tools a link to the matching CHANGELOG entry (per the approach used on
the Turkey Pump-Out project — implementation details to be supplied or rebuilt; not in this project's
context). (Test #2.)

### 49. `?import=yes` power-user override
A query-param that forces the load/import UI even when `voyage-data.json` is present and auto-loaded,
so a user can open a different file without removing the default. Must use whichever verb #45 settles
on. (Test #4 — the "Easter egg.")

### 50. Editor → Viewer preview link
A subtle link in the editor to `voyage-atlas.html` (same directory) so an editing user can preview the
rendered result. (Test #4.)

### 51. "Project of S/Y GRACE" website backlink
A prominent-but-restrained backlink in the viewer (and editor) to the project website (URL TBD),
giving users a "home" to learn more about the project. (Test #4.)

### 52. CSV distance-unit note
Label the exported CSV distances as nautical miles (a header note or column suffix) so the unit is
unambiguous outside the app. (Test #16.)

### 53. Visual flag for a manually-set country
Indicate when a country was hand-entered (and so will be skipped by "Look up countries"), so the user
can see which cells the automation won't touch. (Tests #21 / #26.)

### 54. Re-geocode a named waypoint by name
For named waypoints imported without coordinates, provide a way to populate lat/lon (and country) from
the name; editing an existing name should re-trigger the lookup. Currently there's no path to geocode a
coord-less named row. (Test #23.)

### 55. CMD/CTRL+Enter = Add Rows in the paste box
In the bulk-paste textarea, Enter inserts a newline; bind CMD/CTRL+Enter to the "Add Rows" action so
keyboard users don't have to reach for the button. (Test #28.)

### 56. Selected-waypoint feedback — focus, row highlight, and map-marker highlight
Past ~15 rows, adding a waypoint (map or table) should focus the *new* row, not jump to the first. A
single "selected waypoint" state should show in two places at once: (1) a persistent, high-visibility
row highlight in the list (e.g. inverted colours), and (2) a matching highlight of that waypoint's
marker on the map — a temporary colour/size change or a distinct pin — so that with many nearby points
it's obvious which one is selected. The state is shared by add, sequence-number click, row focus, and
marker click: clicking a sequence number both centres the map *and* highlights the marker; clicking a
marker both highlights it *and* scrolls/flashes the row. (Tests #28 / #34 — #34 specifically asked for
the on-map discernment, "pin temporarily? change colour? both?", which the original row-only capture
missed.)

### 57. Second Escape clears the search box
In the place search, a first Escape dismisses the results; a second Escape should clear the typed
query. (Test #37.)

### 58. Rethink the default chapter selection
On load the first chapter is auto-selected, so map clicks / searches silently add to chapter 1. Find a
more intuitive default (e.g. no selection until the user picks a chapter, with a clear prompt).
(Test #37.)

### 59. Visible unsaved-changes indicator
The editor only warns about unsaved changes on page-leave; add a persistent visual indicator (e.g. a
dot or "unsaved" badge) when `isDirty` is true. (Test #36.)

---

## Explicitly out of scope

### 41. Live GPS position / "where are we now" tracking
This is the *framework* atlas (the routes), not a live tracker. Current position belongs elsewhere.

### 42. Tactical passage planning
The editor manages strategic chapter/waypoint data. Detailed passage planning (weather windows,
tidal gates, anchorage selection) is a different tool category — that's LuckGrib, Navily,
NoForeignLand, and Adrienne's domain.
