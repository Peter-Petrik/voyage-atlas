# Voyage Atlas — Enhancement Backlog

The forward-looking backlog for the **editor** (`voyage-atlas-editor.html`) and **viewer** (`voyage-atlas.html`). Shipped work is **not** listed here — it lives in `CHANGELOG.md` under its version. The decisions behind each change live in `voyage-atlas-runbook.md`.

Items keep their **original numbers** — cross-references and the runbook depend on them, so the numbers are stable IDs, not sequence. Every item carries a tag:

> `Effort S/M/L · Impact Low/Med/High · code-area · deps`

Closed items keep their number, tag and description with the reason each was closed, so one can be reopened by moving it back to Open.

---

## Open

No item is open. GPX import and export (#17, #18) shipped in v3.11.0.

---

## Closed (October 2026)

Closed in the October 2026 backlog review, each with the reason.

### 50. Editor → Viewer preview link
`Effort S · Impact Low · editor UI · —`
A subtle link in the editor to the viewer (`voyage-atlas.html` in the same directory when self-hosted; the published site serves the two at sibling paths, so the target belongs in the self-hosting configuration block) so an editing user can preview the rendered result.

**Closed:** The viewer opens its own voyage file, not the one being edited, so the link would show the last file saved beside it, and on the published site Grace's voyage. Saving the voyage and loading it in the viewer covers a preview today; a real preview would hand the editor's voyage to the viewer directly.

### 35. Bulk waypoint select + delete
`Effort M · Impact Med · editor waypoint table (selection state) · selection model shipped in #56`
Multi-select rows via CTRL/⌘-click (non-adjacent) and SHIFT-click (range), then delete the selection in one action. The single-selection state model shipped with #56 (v3.0); this extends it to multi-select plus a "Delete selected (N)" affordance.

**Closed:** Deleting rows one at a time works, and without undo (#19) a delete of many rows puts more work at risk in one click.

### 54. Re-geocode a named waypoint by name
`Effort M · Impact Med · editor geocode + waypoint row · relates to #73`
For named waypoints imported without coordinates, populate lat/lon (and country) from the name. A name typed or retyped into a row with no coordinates is already looked up, as are pasted name-only rows; a voyage file or CSV import does not look up its coordinate-less rows, and renaming a row that has coordinates does not move it. **Open:** a lookup pass for imported rows, through the confirmation used for long runs, and whether a rename should offer to re-geocode a row that already has coordinates.

**Closed:** A name typed or retyped into a row without coordinates is already looked up, as are pasted name-only rows; only a file import leaves name-only rows.

### 7. Sequence validation (chapter dates and waypoint ordering)
`Effort M · Impact Med · editor (When fields, waypoint order) · —`
Warn (not block) when chapter date ranges overlap, run out of sequence or leave gaps; flag waypoints that appear geographically out of order (large bearing reversals). Advisory only — intentional out-of-sequence routing exists (e.g. the Svalbard out-and-back).

**Closed:** The tools leave real-world routing to the user, and an out-of-sequence route is often intended, as the Svalbard out-and-back shows.

### 19. Undo/redo
`Effort M/L · Impact Med · editor state (all mutations) · —`
State-snapshot stack with Ctrl/Cmd+Z (undo) and Ctrl/Cmd+Shift+Z (redo). Captures snapshots on waypoint add/delete/move, chapter add/delete/reorder and bulk operations. Implementation: serialized snapshots in a fixed-size ring buffer (~50 actions). Particularly valuable for an accidental move or deletion.

**Closed:** It would touch every edit path in the editor; the saved voyage file is the fallback after a mistake.

### 64. Split / duplicate a chapter
`Effort M · Impact Med · editor chapter ops + identity · relates to #63`
Duplicate a chapter (all waypoints + metadata) as a new chapter, then prune each copy to taste — which covers "split" without a dedicated split tool. Duplicate alone is likely sufficient. Needs a new chapter created with a fresh identity (see #63) and an insert-after-current placement; on a positional numbering scheme the trailing chapters renumber.

**Closed:** Rarely needed: adding a chapter and copying rows into it covers it.

### 68. Editor structural draw / z-order — adopt the viewer's named-layer-group model
`Effort M · Impact Med · editor chart rendering (layer architecture) · —`
The editor draws routes, waypoint markers and ghost midpoints **directly onto the chart** (`.addTo(map)`) and then corrects stacking after the fact: `raiseChapterLayers` brings each chapter's route, click areas, ghosts and markers to the front in turn, and the active chapter is raised again whenever another chapter is redrawn (Decision 40). The viewer, by contrast, owns a small set of **named layer groups** (`routesLayer`, `wptsLayer`, `pazLayer`, `decisionLayer`, `gatewayLayer`) added to the chart in a deliberate order, so z-order is correct *by construction* and a layer toggle is just add/remove of one group. The two tools reach correct layering by different mechanisms; the editor's is order-of-insertion plus post-hoc fix-ups, which is fragile — any new element type, or any code path that adds after the `raiseChapterLayers` pass, can land in the wrong stratum. Adopt the viewer's model in the editor: create explicit layer groups (routes below markers below ghosts/overlays, in a fixed declared order), draw each element into its group instead of onto the chart, and retire the `raiseChapterLayers` correction pass. Net effect: layering becomes deterministic regardless of draw order, the two tools converge on one rendering architecture (audit discipline), and future overlays (PAZ authoring #43, connection rendering #37) have a clean home. Watch-outs: ghost-midpoint drag lines and the rapid-click interaction still need their current event wiring; the dark/light tile swap and `worldCopyJump` three-copy rendering must be preserved; verify marker interactivity (drag, click-to-select) is unchanged after the move into groups.

**Closed:** An internal restructuring with no visible change; the editor's layering works today (runbook Decision 40).

### 73. Geocoder choice
`Effort S/M · Impact Med · editor geocoding (URL_GEOCODE, request queue) · relates to #54`
The editor geocodes through the public Nominatim service, for place search, name-to-coordinate lookups and country lookups. Its usage policy sets an absolute maximum of one request per second, forbids client-side autocomplete and requires caching, so the editor sends every request through one paced queue, searches only on Enter or the Search button, and caches answers for the session (v3.9.6). A long "Look up all countries" run therefore takes about a minute per 55 waypoints, and the first run still sends a lookup for every unnamed shaping vertex in open water, where nothing is found. The policy covers only the public server, so another provider or a self-hosted Nominatim instance could lift the pace limit or allow search while typing. The change was held back during the October 2026 fix releases so that it would not add a new variable midstream; Nominatim stays until this item is taken up. **Open:** which service (a hosted geocoder with its own key and terms, or a self-hosted Nominatim instance, which `URL_GEOCODE` already supports); whether a key can stay out of the repository the way the basemap key does, injected at the edge; whether the country lookup should skip unnamed shaping vertices; and whether another service's country names match the territory list, which follows Nominatim's.

**Closed:** Nominatim serves the editor's lookups within its usage policy, and `URL_GEOCODE` already accepts a self-hosted instance.

### 74. Touch and keyboard access to help and dialogs
`Effort M · Impact Med · both tools: help tips, modals, chapter rows, messages · —`
The editor's help tips and the titles in both tools appear on mouse hover only, and the editor's chart editing (marker and ghost drags, the panel divider) responds to the mouse only, so neither works by touch; the editor's arrival note recommends a desktop or laptop with a mouse. The modals have no dialog role and no focus trap, and the editor's chapter header and the viewer's drawer and legend rows are click-only elements that the keyboard cannot reach. Load and import errors use the browser's unstyled `alert()`, outside the theme; they belong in the tools' own dialog, which the viewer does not have yet. **Open:** tap-to-show versus an always-visible help line; whether the modals move to the native `<dialog>` element; and touch behavior tested on a real tablet.

**Closed:** The editor is made for a desktop or laptop with a mouse, as its arrival note says, and the viewer already works by touch.

### 76. Speed at thousands of waypoints
`Effort M/L · Impact Low now, Med for large voyages · editor rendering (chapter list, chart layers), viewer chart layers · relates to #68`
The October 2026 review timed the editor on a 60-chapter, 5,000-waypoint voyage in headless Chromium: selecting a chapter took 1.1 to 2.9 s, adding a chapter 4.1 s, and each frame of a marker drag 56 ms. A 20-chapter voyage of about 330 waypoints takes 0.1 to 0.24 s for the same actions, with drag frames of 26 to 50 ms, near the threshold of visible lag on a slower machine. The causes: every chapter's metadata form and waypoint table is built up front, collapsed or not (about 134,000 elements at 5,000 waypoints); `selectChapter` redraws every chapter's layers; and each drag frame rebuilds the chapter's markers, hit targets and ghost midpoints in all three world copies. Queueing a whole-voyage country lookup, which froze the page for 14 s, was fixed in v3.9.12. The viewer stays usable at 5,000 waypoints, but slowly: the blind review of v3.9.13 timed selecting a chapter at 1.2–2.0 s and switching the theme at 2.7 s, with 10,362 chart layers, since markers and routes are drawn in three world copies with the SVG renderer. **Open:** building a chapter's form and table when it is first opened; redrawing only the chapters whose style changes on a selection; and moving the dragged marker alone during a drag, redrawing the rest on release, which #68's layer groups would make simpler; for the viewer, Leaflet's canvas renderer (`preferCanvas`) for the dots and routes.

**Closed:** A voyage of realistic size (about 330 waypoints) responds in a quarter second or less; the slowdowns appear only at thousands of waypoints.

### 21. KML fly-over export configuration
`Effort M · Impact Med · editor KML export + config UI · —`
Extend KML export with a Google Earth tour: an animated camera (configurable speed, altitude, tilt, heading and per-waypoint pause) via `<gx:Tour>` / `<gx:FlyTo>`. A settings panel sets the parameters before export.

**Closed:** Map Animator already turns the editor's KML export into a fly-along video.

### 20. Self-contained HTML export (bake JSON into viewer)
`Effort M · Impact Med · editor (reads viewer template) · relates to #24`
A "Download as single HTML" option that injects the current JSON into a copy of the viewer template, producing a standalone file to host, email or open locally — the sharing complement to the two-file auto-load model.

**Closed:** The published or self-hosted viewer is the sharing path, and a baked copy would not pick up later releases.

### 36. True in-place Save via File System Access API
`Effort M · Impact Med · editor save · Chromium-only (progressive enhancement)`
`showSaveFilePicker` / writable streams let the editor write back to the *same file on disk* after a one-time permission grant — Save behaves like a desktop app. Feature-detect and fall back to the download model on Safari/Firefox.

**Closed:** Chromium-only, where saving a download works in every browser.

### 69. Opt-in remote-source loading from CORS-permissive hosts
`Effort S · Impact Low/Med · editor + viewer load path · deferred; relates to #24`
The v3.9 `URL_VOYAGE_DATA` constant and `?data=` parameter accept only an address on the same site as the tools: a relative path, or a full address on the same host, fetched in same-origin mode. An address on another host is refused, and the arrival chooser says "Voyage files must be on this site." Two reasons stand behind that: the allow rule for a cross-origin fetch (CORS) is set by the remote server, not the tool, and a voyage file from another site would be read with this site's privileges. A scoped version is viable: accept an absolute URL only from hosts known to send permissive CORS headers (raw GitHub, for instance), with the limitation stated plainly in the UI rather than implying any URL works. **Open:** whether to allowlist known-good hosts or attempt-and-report; how the same-origin safeguard is kept for every other address. **Prerequisite:** a real demand signal — same-site loading covers the realistic self-hosting cases today.

**Closed:** No demand: same-site loading covers self-hosting.

### 26. Voyage-highlights layer
`Effort M · Impact Med · viewer layers · —`
Furthest north/south, equator crossings, the antipode, longest passage, etc. — a toggleable overlay.

**Closed:** Nice to have, with nothing depending on it.

### 27. Tabbed detail-panel sections
`Effort M · Impact Med · viewer detail panel · —`
Split the chapter detail panel into tabs (e.g. Routing / Wind / Resources / References) rather than stacked prose.

**Closed:** The detail panel is short, and tabs would add a click to reach each part of it.

### 28. Narrow-window passage timeline
`Effort M · Impact Med · viewer · —`
A linear timeline strip for time-constrained legs: Patagonia channel-by-channel, the Svalbard out-and-back, the Drake Passage attempt, the Cape Verde → Brazil tradewind window.

**Closed:** Nice to have, with nothing depending on it.

### 29. Marker declutter at low zoom
`Effort M · Impact Med · viewer markers · —`
Clustered markers or zoom-dependent thinning for dense waypoint regions.

**Closed:** No voyage has needed it yet.

### 30. Chapter card grid / chart+narrative split
`Effort M/L · Impact Med · viewer layout · —`
Chapter cards below the chart, or a split layout. Today the viewer is chart-only.

**Closed:** A redesign of the viewer's chart-only layout, for no present need.

### 33. Waypoint search
`Effort M · Impact Med · viewer · —`
Search/filter waypoints across all chapters from the viewer.

**Closed:** The Chapters list and the drawer already lead to every chapter, and each waypoint is a click away on the chart.

### 70. Play the voyage
`Effort M · Impact Med · viewer animation (routes + chart framing) · relates to #28, #21, #72`
A Play control in the viewer that draws the voyage chapter by chapter in travel order, with the chart following the tip of the line and a boat glyph at the tip. Each chapter boundary pauses briefly on the chapter's name and When. Pause, stop, and a speed setting complete the controls. It builds on the existing dateline split and three world copies, and reuses the direction-of-travel framing from the on-load view. No video export: Map Animator (mapanimator.baldinger.se) already turns the editor's KML export into an MP4, reading one route per chapter and the named waypoints as signs, so video stays with a dedicated tool. **Open:** the whole voyage versus one chapter at a time; how past / current / future styling shows during playback (era styling shipped in v3.10.0 as #72, with planned chapters dashed); and whether playback pace follows distance, so a long ocean crossing does not dominate the run time.

**Closed:** Map Animator already animates the KML export, and the Chapters list steps through the voyage chapter by chapter.

### 22. Wind data overlay toggle
`Effort L · Impact High · viewer layers + wind-data parsing · dep: wind-data files, held outside this project and sourced when the item is taken up`
A toggleable viewer layer visualizing prevailing wind along route legs, selectable by month, drawing from the structured wind-data files (SeaWinds/QuikSCAT 10-year averages — five ocean-basin files plus a methodology guide). **Not** departure-decision weather routing (that's LuckGrib's job) — this is strategic validation that a chapter's seasonal window aligns with favorable prevailing winds. Presentation ranges from simple (color-coded leg segments: green = favorable, yellow = marginal, red = headwind) to rich (wind-rose icons at waypoints showing the month's direction/speed distribution). Inspired by Horizory.com. **Open:** whether the overlay stays viewer-only or also feeds back into the editor, flagging legs with unfavorable wind angles for the chapter's travel month.

**Closed:** It needs wind data held outside this project and a reader for it; it would be a project of its own.

### 63. Chapter identity: UUID, not positional number
`Effort M · Impact High · data model + editor (identity) · prerequisite for #34`
Chapters are identified today by an integer `num` that doubles as identity *and* implied order; the tools renumber chapters 1 to n after every delete, reorder and load, so a number does not survive an edit. Forks must reference a chapter by a stable id that survives delete/reorder and is never reused, so the identifier should become a **UUID**, with ordering taken from array position and the human label being the chapter **name** (no second visible number). Deferred, not speculative plumbing: only worth doing when #34 is taken up, since nothing references chapters by id until forks exist.

**Closed:** Only needed for variant chapters (#34), which are closed.

### 34. Mutually exclusive / variant chapters
`Effort L · Impact High · data model + editor + viewer · needs #63`
Alternative routings for the same time window (e.g. "Patagonia via channels" vs "via offshore"). A "variant group" / `follows` field links the alternatives; the viewer shows them as toggleable branches (one visible at a time); the editor marks chapters as variants of each other and computes hero stats per combination. **Fork-readiness (in place since v2.5):** distance attribution and endpoint sync already run on a single `getPredecessorChapter()` helper rather than positional `num − 1` logic — two chapters declaring the same predecessor *is* the fork definition; switching that helper from positional lookup to an explicit `follows` field is the only routing change needed (approach-leg nm math and the ⇄ pull-sync both adapt). Total nm becomes a **range** (e.g. "75,000–78,000 nm") since mutually-exclusive variants must not both be summed. **Open — branch labels:** alpha suffix (12a/12b, intuitive but collapses under nesting) vs decimal (12.1, handles nesting but reads as a version number) vs a label decoupled from the sequence number — unresolved. Chapter *identity* itself is settled by #63.

**Closed:** A data-model change across both tools, for a need no voyage has yet.

### 37. Viewer inter-chapter connection rendering (fork-aware)
`Effort M · Impact Med/High · viewer rendering · with #34; relates to #72, shipped in v3.10.0`
The viewer renders each chapter's route independently, so a genuine inter-chapter gap (e.g. the 628 nm NZ→Japan repositioning) shows as two disconnected segments. Draw a faint/dashed connector from each chapter's last waypoint to its successor's first. **Fork-aware from the start:** keyed off the same `getPredecessorChapter()` seam, a fork (one endpoint feeding multiple successors) produces *branching* connectors — the visual signature of a fork on the chart. Variant connectors get distinct styling (dash pattern or color) from normal handoffs, and reconvergence (two branches rejoining one chapter) needs a rule.

**Closed:** Built for variant chapters (#34), which are closed.

### 43. PAZ (avoidance-zone) authoring in the editor
`Effort L · Impact Med · editor (net-new UI + paz data) + viewer polygon rendering · design resolved; relates to #72, shipped in v3.10.0`
The viewer renders a top-level `paz` array (`{zone, bounds:[s,w,n,e]}`) as dashed, dateline-aware rectangles, but the editor has no authoring UI, so zones are hand-written into the JSON. Add visual authoring. **Design (resolved October 2026):** (1) polygons, not rectangles: real avoidance zones such as high-risk areas and ice limits are irregular, and no known voyage data uses the rectangle form (neither the sample nor the published voyage carries `paz`), so the shape changes without a migration; (2) chapter-style authoring: a zone is a named, ordered vertex list edited the way a chapter's waypoints are (a vertex table, chart clicks, dragging, midpoint handles, the dateline split); (3) storage stays the top-level `paz` array, with each zone holding its vertices in place of `bounds`, and the viewer's rectangle drawing is replaced by a dateline-aware polygon renderer; a `zones.csv` import/export can follow later. The schema's `paz` section changes to the polygon form when this ships. Net-new UI with its own data-model surface; deserves its own cycle. **Superseded:** the May 2026 kickoff design of rectangles first, polygons later if needed.

**Closed:** The viewer still draws avoidance zones written into the voyage file by hand. Authoring them is a large piece of new UI, and no voyage uses zones yet.

### 32. Social / SEO metadata — JSON-LD remaining
`Effort S · Impact Low · both heads · OG/Twitter shipped in v3.7`
The Open Graph and Twitter Card tags (with a WebP `og:image`) shipped in v3.7 for both tools. What remains is JSON-LD structured data for richer search-result presentation; lower priority than the social-unfurl tags already in place.

**Closed:** Google's rich result for an app requires a price and a rating or review, which the tools do not have, so structured data would change nothing visible in search; the social link previews already ship.

### 31. PWA manifest + iframe embed — manifest shipped
`Effort M · Impact Low · viewer · trades against the single-file goal`
A web manifest (`site.webmanifest`) and the editor's mobile/standalone meta tags shipped in v3.7.1, bringing both tools to basic installable-PWA parity. What remains is fuller PWA support (e.g. a service worker for offline use) and iframe embedding — the latter still traded against the single-file goal.

**Closed:** Offline use needs a service worker beside each tool, against the single-file design, and embedding is not needed in the published site's architecture.

### 23. Cornell's World Cruising Routes — reference data layer
`Effort L · Impact High · viewer layer + editor import + data acquisition · blocked: print data must be digitized`
~6,000 waypoints across ~1,000 routes (Jimmy Cornell, *World Cruising Routes*, 9th ed.) — the circumnavigator's reference for 25+ years. **The data exists only in print** — no GPX, no digital download. Two uses: a read-only reference overlay in the viewer ("what the bible says for this basin"), and import-as-starting-point in the editor (load a region's waypoints, reshape into chapters). Acquisition paths: community digitization of the ~50–100 most-sailed routes (AMEL 50/60 group, OCC, Ocean Posse), OCR + cleanup or per-user manual entry. **Open:** copyright (coordinates are facts; route organization/naming is editorial), whether to support Cornell's route-ID taxonomy (e.g. "AN161"), and whether *Ocean Atlas* pilot-chart data could feed #22.

**Closed:** Blocked: the data exists only in print.

### 24. Hosted sharing with stable URLs
`Effort L · Impact Med · hosting infra · blocked: a real demand signal; relates to #20`
Users upload CSV/JSON via a simple form and get a stable URL (subdomain or path, e.g. `grace.voyagemap.dev` or `voyagemap.dev/grace`) serving their interactive viewer — keeping the zero-friction creator experience but adding discoverability. Inspired by TravelMap.net. **Open:** subdomain vs path URLs; static hosting (GitHub / Cloudflare Pages with user-submitted data) vs a dynamic backend; whether edit capability lives in the hosted version or stays local-only. **Prerequisite:** a real demand signal from the AMEL group, OCC or a similar community.

**Closed:** Blocked: it needs a real demand signal and a hosting backend.

### 71. Vector basemap with globe view (MapLibre GL + OpenFreeMap)
`Effort L · Impact High · both tools: chart engine (Leaflet → MapLibre GL) + basemap · major-version candidate`
Replace the Leaflet raster chart with MapLibre GL drawing OpenFreeMap vector tiles, which need no API key, carry no request limits, and allow commercial use. This removes the basemap's key dependency, which arrived with CARTO's key requirement in September 2026. A self-hosted custom style can carry the admiralty-chart palette with depth bands, closer to the intended chart look than any stock raster style. MapLibre's globe projection can show a circumnavigation whole, which the flat Web Mercator chart cannot (runbook Decision 49). **Costs:** a rewrite of every rendering path in both tools (markers, routes, world copies, dateline split, fit logic) and of the shared core built around them; a much larger library; and a WebGL requirement. The tile URL constants in the self-hosting configuration become a style URL, which changes that contract, so this is a major-version (4.0) candidate. The voyage data schema is unaffected. Inspired by Map Animator, which runs this stack in production. **Open:** whether the globe is the default view or a toggle; the style JSON must be hosted alongside the tools, since OpenFreeMap requires a modified style to be self-hosted. **Prerequisite:** a decision to start a 4.0 cycle.

**Closed:** A rewrite of every rendering path in both tools, a 4.0 cycle that has not been started.

---

## Explicitly out of scope

### 65. Deep-link to a pre-selected chapter — rejected
`Effort S/M · Impact Med · viewer URL hash + selectChapter · needs #63`
A shareable URL that opens the viewer with one chapter already selected and framed, e.g. `voyage-atlas.html#<chapter>`. The identifier scheme is the open question — a sequence number is brittle across edits, the chapter name is readable but mutable, a UUID (see #63) is stable but opaque. Resolving #63 (stable chapter identity) is the natural prerequisite. **Rejected**, as runbook Decision 47 records; kept here so the number stays reserved.

### 41. Live GPS position / "where are we now" tracking
This is the *framework* atlas (the routes), not a live tracker. Current position belongs elsewhere.

### 42. Tactical passage planning
The editor manages strategic chapter/waypoint data. Detailed passage planning (weather windows, tidal gates, anchorage selection) is a different tool category — that's LuckGrib, Navily, NoForeignLand and Adrienne's domain.

---

## Backlog history

The ~21 previously-"queued" items that had already shipped were pruned from this doc; all were confirmed present in the CHANGELOG first. The v3.0 release then pruned #53, #56 and #62 — shipped, and confirmed in the CHANGELOG — and dropped #52 as moot, since the CSV carries no distance figures to label. The v3.1.1 patch then pruned #66, and the v3.1.2 patch pruned #67 — both shipped, and confirmed in the CHANGELOG. The v3.2–v3.4 releases then pruned #16, #49, #51, #55, #57, #58 and #61 — all shipped, and confirmed in the CHANGELOG. The v3.7 release pruned #38 and #39 — shipped, and confirmed in the CHANGELOG — and retired #40 as superseded by the Cloudflare-served deployment at `sailingamazinggrace.com/resources/voyage-atlas`, which provides the one-click live demo #40 sought without GitHub Pages. The v3.7 release also delivered the Open Graph / Twitter Card half of #32 and the favicon/manifest groundwork of #31, both of which remain open for their unshipped scope. The v3.9 release added #69 (opt-in remote-source loading), the deferred remainder of the configurable-data-path work that shipped in that release. The October 2026 review added #70 (play the voyage in the viewer) and #71 (vector basemap with globe view), both drawn from a look at Map Animator. In the same month #72 (era styling on the chart) recorded the open design for showing past, current and future chapters on the chart, and #43 moved its zone shape from rectangles to polygons. Later in October 2026, #73 (geocoder choice), #74 (touch and keyboard access to help and dialogs) and #75 (self-hosting identity links) were added, and #72 gained the inactive chapter as a third state to tell apart. The same month's docs pass moved #65 to "Explicitly out of scope" as rejected, and corrected #22's data dependency and the release #31 names. The v3.9.13 release added #76 (editor speed at thousands of waypoints), from the October 2026 agent review, and the v3.9.14 release widened it to the viewer and added the styled messages to #74, from the blind review that followed. The v3.9.18 docs pass brought #54, #63, #68, #69, #72 and #74 up to date with the tools, and joined the file's hard-wrapped lines. The v3.10.0 release shipped #48 (the footer's version links to its release), #72 (planned chapters dashed on the chart) and #75 (the editor link setting and the head's addresses marked for self-hosters). The October 2026 backlog review that came with it closed every other open item except #17 and #18 (GPX import and export, planned for the next release), each with its reason, and removed the phase grouping, which no longer had open items to sequence. The v3.11.0 release shipped #17 and #18 (GPX import and export), leaving no item open.
