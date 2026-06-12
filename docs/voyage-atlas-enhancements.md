# Voyage Atlas — Enhancement Backlog

The forward-looking backlog for the **editor** (`voyage-atlas-editor.html`) and **viewer**
(`voyage-atlas.html`). Shipped work is **not** listed here — it lives in `CHANGELOG.md` under its
version. (The ~21 previously-"queued" items that had already shipped were pruned from this doc; all
were confirmed present in the CHANGELOG first. The v3.0 release then pruned #53, #56, and #62 — shipped, and
confirmed in the CHANGELOG — and dropped #52 as moot, since the CSV carries no distance figures to
label. The v3.1.1 patch then pruned #66, and the v3.1.2 patch pruned #67 — both shipped, and confirmed in the CHANGELOG. The v3.2–v3.4 releases then pruned #16, #49, #51, #55, #57, #58, and #61 — all shipped, and confirmed in the CHANGELOG. The v3.7 release pruned #38 and #39 — shipped, and confirmed in the CHANGELOG — and retired #40 as superseded by the Cloudflare-served deployment at `sailingamazinggrace.com/resources/voyage-atlas`, which provides the one-click live demo #40 sought without GitHub Pages. The v3.7 release also delivered the Open Graph / Twitter Card half of #32 and the favicon/manifest groundwork of #31, both of which remain open for their unshipped scope.) Build decisions live in `voyage-atlas-runbook.md`.

Items keep their **original numbers** — cross-references and the runbook depend on them, so the numbers
are stable IDs, not sequence. They're grouped into **phases** meant to be worked roughly in order, each
a mostly self-contained chunk so a fresh chat can pick one up and run. Every item carries a tag:

> `Effort S/M/L · Impact Low/Med/High · code-area · deps`

Phases 1–4 are the incremental near-term work; 5–7 are the larger high-value pieces; the two side
tracks sit off the main line.

---

## Phase 1 — Quick-win polish

Small, mostly independent tweaks; largely the v2.7/v2.8 test-pass captures, so this clears that loop.
One or two sessions.

### 48. Footer version → CHANGELOG link
`Effort S · Impact Low · both footers · —`
The footer version label in both tools now links to the GitHub repository (added in v3.7.1). The
original intent of this item was a link to the *matching CHANGELOG entry* specifically; if that
deep-link is still wanted, it remains as the unshipped variant (the repo link is the simpler form now
in place).

### 50. Editor → Viewer preview link
`Effort S · Impact Low · editor UI · —`
A subtle link in the editor to `voyage-atlas.html` (same directory) so an editing user can preview the
rendered result.

---

## Phase 2 — Editor interaction & state

Cohesive editor work centered on selection/feedback and editing robustness. The shared selection
state shipped in v3.0 (#56); #35 reuses it, and #19 remains the meatier item.

### 35. Bulk waypoint select + delete
`Effort M · Impact Med · editor waypoint table (selection state) · selection model shipped in #56`
Multi-select rows via CTRL/⌘-click (non-adjacent) and SHIFT-click (range), then delete the selection in
one action. The single-selection state model shipped with #56 (v3.0); this extends it to multi-select
plus a "Delete selected (N)" affordance.

### 54. Re-geocode a named waypoint by name
`Effort M · Impact Med · editor geocode + waypoint row · —`
For named waypoints imported without coordinates, populate lat/lon (and country) from the name; editing
an existing name should re-trigger the lookup. There's no path today to geocode a coord-less named row.

### 7. Sequence validation (chapter dates and waypoint ordering)
`Effort M · Impact Med · editor (When fields, waypoint order) · —`
Warn (not block) when chapter date ranges overlap, run out of sequence, or leave gaps; flag waypoints
that appear geographically out of order (large bearing reversals). Advisory only — intentional
out-of-sequence routing exists (e.g. the Svalbard out-and-back).

### 19. Undo/redo
`Effort M/L · Impact Med · editor state (all mutations) · —`
State-snapshot stack with Ctrl/Cmd+Z (undo) and Ctrl/Cmd+Shift+Z (redo). Captures snapshots on waypoint
add/delete/move, chapter add/delete/reorder, and bulk operations. Implementation: serialized snapshots
in a fixed-size ring buffer (~50 actions). Particularly valuable for an accidental move or deletion.

### 64. Split / duplicate a chapter
`Effort M · Impact Med · editor chapter ops + identity · relates to #63`
Duplicate a chapter (all waypoints + metadata) as a new chapter, then prune each copy to taste — which
covers "split" without a dedicated split tool. Duplicate alone is likely sufficient. Needs a new
chapter created with a fresh identity (see #63) and an insert-after-current placement; on a positional
numbering scheme the trailing chapters renumber.

### 68. Editor structural draw / z-order — adopt the viewer's named-layer-group model
`Effort M · Impact Med · editor map rendering (layer architecture) · —`
The editor draws routes, waypoint markers, and ghost midpoints **directly onto the map** (`.addTo(map)`) and then corrects stacking after the fact — each chapter re-runs a `markers.forEach(m => m.bringToFront())` pass so the markers sit above their ghosts. The viewer, by contrast, owns a small set of **named layer groups** (`routesLayer`, `wptsLayer`, `pazLayer`, `decisionLayer`, `gatewayLayer`) added to the map in a deliberate order, so z-order is correct *by construction* and a layer toggle is just add/remove of one group. The two tools reach correct layering by different mechanisms; the editor's is order-of-insertion plus post-hoc fix-ups, which is fragile — any new element type, or any code path that adds after the `bringToFront` pass, can land in the wrong stratum. Adopt the viewer's model in the editor: create explicit layer groups (routes below markers below ghosts/overlays, in a fixed declared order), draw each element into its group instead of onto the map, and retire the `bringToFront` correction pass. Net effect: layering becomes deterministic regardless of draw order, the two tools converge on one rendering architecture (audit discipline), and future overlays (PAZ authoring #43, connection rendering #37) have a clean home. Watch-outs: ghost-midpoint drag lines and the rapid-click interaction still need their current event wiring; the dark/light tile swap and `worldCopyJump` three-copy rendering must be preserved; verify marker interactivity (drag, click-to-select) is unchanged after the move into groups.

---

## Phase 3 — Save / load / interchange

The file-I/O and export-format machinery; all touch the export/import + `buildExportJSON` path. The GPX
import/export pair naturally.

### 17. GPX import (past chapters)
`Effort M · Impact Med · editor import + track reduction · —`
Import a GPX track to populate/replace a chapter's waypoints — chiefly to update a chapter from
"planned" to "traveled" using an actual chartplotter / NoForeignLand track. A reduction algorithm
(Douglas–Peucker or similar) simplifies dense GPS tracks to a manageable waypoint count; the user then
trims/adjusts.

### 18. GPX export
`Effort S/M · Impact Med · editor export · pairs with #17`
Export the route as GPX (waypoints + route, or track). Complement to the existing KML export.

### 21. KML fly-over export configuration
`Effort M · Impact Med · editor KML export + config UI · —`
Extend KML export with a Google Earth tour: an animated camera (configurable speed, altitude, tilt,
heading, and per-waypoint pause) via `<gx:Tour>` / `<gx:FlyTo>`. A settings panel sets the parameters
before export.

### 20. Self-contained HTML export (bake JSON into viewer)
`Effort M · Impact Med · editor (reads viewer template) · relates to #24`
A "Download as single HTML" option that injects the current JSON into a copy of the viewer template,
producing a standalone file to host, email, or open locally — the sharing complement to the two-file
auto-load model.

### 36. True in-place Save via File System Access API
`Effort M · Impact Med · editor save · Chromium-only (progressive enhancement)`
`showSaveFilePicker` / writable streams let the editor write back to the *same file on disk* after a
one-time permission grant — Save behaves like a desktop app. Feature-detect and fall back to the
download model on Safari/Firefox.

---

## Phase 4 — Viewer presentation

Viewer-render enhancements; mostly independent display features.

### 26. Voyage-highlights layer
`Effort M · Impact Med · viewer layers · —`
Furthest north/south, equator crossings, the antipode, longest passage, etc. — a toggleable overlay.

### 27. Tabbed info-panel sections
`Effort M · Impact Med · viewer info panel · —`
Split the chapter info panel into tabs (e.g. Routing / Wind / Resources / References) rather than
stacked prose.

### 28. Narrow-window passage timeline
`Effort M · Impact Med · viewer · —`
A linear timeline strip for time-constrained legs: Patagonia channel-by-channel, the Svalbard
out-and-back, the Drake Passage attempt, the Cape Verde → Brazil tradewind window.

### 29. Marker declutter at low zoom
`Effort M · Impact Med · viewer markers · —`
Clustered markers or zoom-dependent thinning for dense waypoint regions.

### 30. Chapter card grid / map+narrative split
`Effort M/L · Impact Med · viewer layout · —`
Chapter cards below the map, or a split layout. Today the viewer is map-only.

### 33. Waypoint search
`Effort M · Impact Med · viewer · —`
Search/filter waypoints across all chapters from the viewer.

### 65. Deep-link to a pre-selected chapter
`Effort S/M · Impact Med · viewer URL hash + selectChapter · needs #63`
A shareable URL that opens the viewer with one chapter already selected and framed, e.g.
`voyage-atlas.html#<chapter>`. The identifier scheme is the open question — a sequence number is
brittle across edits, the chapter name is readable but mutable, a UUID (see #63) is stable but opaque.
Resolving #63 (stable chapter identity) is the natural prerequisite.

---

## Phase 5 — Wind overlay (flagship)

### 22. Wind data overlay toggle
`Effort L · Impact High · viewer layers + wind-data parsing · dep: wind-data files (in project knowledge)`
A toggleable viewer layer visualizing prevailing wind along route legs, selectable by month, drawing
from the structured wind-data files (SeaWinds/QuikSCAT 10-year averages — five ocean-basin files plus a
methodology guide). **Not** departure-decision weather routing (that's LuckGrib's job) — this is
strategic validation that a chapter's seasonal window aligns with favorable prevailing winds.
Presentation ranges from simple (color-coded leg segments: green = favorable, yellow = marginal,
red = headwind) to rich (wind-rose icons at waypoints showing the month's direction/speed
distribution). Inspired by Horizory.com. **Open question:** viewer-only visualization, or does it feed
back into the editor (flagging legs with unfavorable wind angles for the specified travel month)?

---

## Phase 6 — Fork epic (variant chapters)

The major architectural piece, tightly coupled. Build in order: identity (#63) → variants (#34) →
connectors (#37). The `getPredecessorChapter()` seam is already in place for it.

### 63. Chapter identity: UUID, not positional number
`Effort M · Impact High · data model + editor (identity) · prerequisite for #34`
Chapters are identified today by an integer `num` that doubles as identity *and* implied order — the
source of the "deleted Ch 1 left the first as #2" oddity. Forks must reference a chapter by a stable id
that survives delete/reorder and is never reused, so the identifier should become a **UUID**, with
ordering taken from array position and the human label being the chapter **name** (no second visible
number). Deferred, not speculative plumbing: only worth doing when #34 is actually built, since nothing
references chapters by id until forks exist.

### 34. Mutually exclusive / variant chapters
`Effort L · Impact High · data model + editor + viewer · needs #63`
Alternative routings for the same time window (e.g. "Patagonia via channels" vs "via offshore"). A
"variant group" / `follows` field links the alternatives; the viewer shows them as toggleable branches
(one visible at a time); the editor marks chapters as variants of each other and computes hero stats
per combination. **Fork-readiness (built since v2.5):** distance attribution and endpoint sync already
run on a single `getPredecessorChapter()` helper rather than positional `num − 1` logic — two chapters
declaring the same predecessor *is* the fork definition; switching that helper from positional lookup
to an explicit `follows` field is the only routing change needed (approach-leg nm math and the ⇄
pull-sync both adapt). Total nm becomes a **range** (e.g. "75,000–78,000 nm") since mutually-exclusive
variants must not both be summed. **Open design question — branch labels:** alpha suffix (12a/12b,
intuitive but collapses under nesting) vs decimal (12.1, handles nesting but reads as a version number)
vs a label decoupled from the sequence number — unresolved. Chapter *identity* itself is settled by #63.

### 37. Viewer inter-chapter connection rendering (fork-aware)
`Effort M · Impact Med/High · viewer rendering · build with #34`
The viewer renders each chapter's route independently, so a genuine inter-chapter gap (e.g. the 628 nm
NZ→Japan repositioning) shows as two disconnected segments. Draw a faint/dashed connector from each
chapter's last waypoint to its successor's first. **Fork-aware from the start:** keyed off the same
`getPredecessorChapter()` seam, a fork (one endpoint feeding multiple successors) produces *branching*
connectors — the visual signature of a fork on the map. Variant connectors get distinct styling (dash
pattern or color) from normal handoffs, and reconvergence (two branches rejoining one chapter) needs a
rule.

---

## Phase 7 — PAZ authoring (standalone)

### 43. PAZ (avoidance-zone) authoring in the editor
`Effort M/L · Impact Med · editor (net-new UI + paz data) · design resolved; viewer already renders paz`
The viewer already renders a `DATA.paz` array (`{zone, bounds:[s,w,n,e]}`) as dashed bounding-box
rectangles (dateline-aware), but the editor has no authoring UI — zones must be hand-written into the
JSON. Add visual authoring. **Design (resolved at kickoff):** (1) rectangles to start (bounding boxes,
matching what the viewer renders and the schema documents; polygons later if needed); (2) draw-on-map
plus an editable zone table (name + editable bounds), mirroring the chapter/waypoint authoring pattern;
(3) storage as the top-level `paz` array the viewer already consumes — a `zones.csv` import/export can
follow later. Net-new UI with its own data-model surface; deserves its own cycle.

---

## Side track — Publishing & distribution

Operational tasks for the public release; mostly non-code; can run anytime; some blocked.

### 32. Social / SEO metadata — JSON-LD remaining
`Effort S · Impact Low · both heads · OG/Twitter shipped in v3.7`
The Open Graph and Twitter Card tags (with a WebP `og:image`) shipped in v3.7 for both tools. What
remains is JSON-LD structured data for richer search-result presentation; lower priority than the
social-unfurl tags already in place.

### 31. PWA manifest + iframe embed — manifest shipped
`Effort M · Impact Low · viewer · trades against the single-file goal`
A web manifest (`site.webmanifest`) and the editor's mobile/standalone meta tags shipped in v3.7,
bringing both tools to basic installable-PWA parity. What remains is fuller PWA support (e.g. a service
worker for offline use) and iframe embedding — the latter still traded against the single-file goal.

---

## Side track — Blocked / long-horizon

Large, gated on external prerequisites.

### 23. Cornell's World Cruising Routes — reference data layer
`Effort L · Impact High · viewer layer + editor import + data acquisition · blocked: print data must be digitized`
~6,000 waypoints across ~1,000 routes (Jimmy Cornell, *World Cruising Routes*, 9th ed.) — the
circumnavigator's reference for 25+ years. **The data exists only in print** — no GPX, no digital
download. Two uses: a read-only reference overlay in the viewer ("what the bible says for this basin"),
and import-as-starting-point in the editor (load a region's waypoints, reshape into chapters).
Acquisition paths: community digitization of the ~50–100 most-sailed routes (AMEL 50/60 group, OCC,
Ocean Posse), OCR + cleanup, or per-user manual entry. **Open:** copyright (coordinates are facts;
route organization/naming is editorial), whether to support Cornell's route-ID taxonomy (e.g. "AN161"),
and whether *Ocean Atlas* pilot-chart data could feed #22.

### 24. Hosted sharing with stable URLs
`Effort L · Impact Med · hosting infra · blocked: a real demand signal; relates to #20`
Users upload CSV/JSON via a simple form and get a stable URL (subdomain or path, e.g.
`grace.voyagemap.dev` or `voyagemap.dev/grace`) serving their interactive viewer — keeping the
zero-friction creator experience but adding discoverability. Inspired by TravelMap.net. **Open:**
subdomain vs path URLs; static hosting (GitHub / Cloudflare Pages with user-submitted data) vs a
dynamic backend; whether edit capability lives in the hosted version or stays local-only.
**Prerequisite:** a real demand signal from the AMEL group, OCC, or a similar community.

---

## Explicitly out of scope

### 41. Live GPS position / "where are we now" tracking
This is the *framework* atlas (the routes), not a live tracker. Current position belongs elsewhere.

### 42. Tactical passage planning
The editor manages strategic chapter/waypoint data. Detailed passage planning (weather windows, tidal
gates, anchorage selection) is a different tool category — that's LuckGrib, Navily, NoForeignLand, and
Adrienne's domain.
