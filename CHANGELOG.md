# Changelog — Voyage Map

All notable changes to the voyage map project (editor + viewer) are recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com); versioning is SemVer-lite (`vMAJOR.MINOR`). The
framework document (`global-voyage-framework.md`) carries its own separate version line.

## [Unreleased]

Queued improvements tracked in `grace-voyage-map-future-enhancements.md`:
1. Chapter endpoint synchronization
2. Viewer refactor to runtime JSON loading
3. GPX import and export

## [v2.3] - 2026-05-29

### Added — Editor
1. Voyage Settings panel — collapsible section above chapters with: vessel name (drives page
   titles), voyage title, global NM override, nations count (auto-calculated with override),
   and territories count. Settings persist in JSON exports and load on import.
2. Right-click waypoint delete on map — right-click any marker on the active chapter to open a
   confirmation modal. Enter confirms, ESC cancels.
3. Delete confirmation modal with keyboard support (Enter/ESC).

### Changed
1. Page title dynamically updates to "[Vessel Name] Voyage Planner" when vessel name is set.
2. JSON export meta block now includes settings (vessel name, overrides) and enriched hero stats
   (nations, territories). Schema version bumped to 2.2.
3. Editor and viewer footer versions now consistently on the right side.
4. v1 JSON import extracts nations/territories from hero stats into Voyage Settings.

### Changed — Viewer
1. Page title uses vessel name from settings: "[Vessel Name] Voyage" when available.
2. Footer layout: data version on left, viewer version on right (matches editor).

## [v2.2] - 2026-05-29

### Added
1. Forward geocode on name entry — typing a waypoint name into an empty row (no lat/lon)
   triggers Nominatim lookup to auto-populate coordinates and country.
2. Country auto-populate on rapid-click — waypoints added via map click now auto-reverse-geocode.
3. Geocoding completion message — status bar shows "Geocoded X/Y waypoints" when batch finishes.
4. Modal keyboard shortcuts — Enter = submit, ESC = cancel on all modals (bulk add, paste, CSV).

### Fixed
1. Help text tooltips — replaced CSS pseudo-elements with JS-based fixed-position tooltips that
   escape scroll container overflow. Tips auto-flip to show above when near viewport bottom.
2. Viewer footer — removed redundant "Load different file" link (same as header button).
   Footer now shows viewer version and data version.
3. Editor and viewer footers now show consistent version numbers.

## [v2.1] - 2026-05-28

### Added — Voyage Map Viewer (`voyage-viewer.html`)
1. New generic viewer that loads JSON at runtime via file picker — no baked-in data.
   Replaces the GRACE-specific `grace-voyage-map.html` (retained in repo as the v1.1 archive).
2. Landing state with "Load JSON" prompt when no data is loaded.
3. Supports both v1 JSON (separate routes/waypoints, routing/bailout fields) and v2 JSON
   (unified waypoints, notes field). Schema auto-detected and normalized on load.
4. Decision markers (diamond) and Gateway markers (star) rendered as toggleable layers —
   no longer stubs. Layers populate from waypoint flags in the loaded data.
5. Title, hero stats, and footer version populate dynamically from the loaded JSON's meta block.
6. "Load different file" link in footer for switching datasets without refreshing.
7. 707 lines (vs 4,479 for the baked viewer) — generic, data-independent, reusable.

## [v2.0.11] - 2026-05-28

### Added
1. Ghost legs during midpoint drag — temporary dashed lines draw from the two adjacent waypoints
   to the ghost marker as it's dragged, showing where the new route segments will go. Lines use
   the chapter's palette color. Removed on drop when the waypoint is inserted.
2. Resizable split panel — a draggable divider between the chapter list and the map. Drag left
   to expand the map, right to expand the chapter panel. Min width 240px for the panel, 300px
   reserved for the map. Leaflet auto-resizes on drag.

## [v2.0.10] - 2026-05-28

### Added
1. Double-click chapter header opens metadata panel (single click still selects on map).

### Changed
1. Expand/collapse redesigned as two toggle buttons ("📋 Expand all" / "📋 Collapse all" and
   "📍 Expand all" / "📍 Collapse all"). Same button toggles between states — replaces the
   previous three-button layout.

## [v2.0.9] - 2026-05-28

### Fixed
1. Help text tooltips now display below the icon (prevents off-screen overflow at top of viewport)
   and use sentence case (inherits from label's uppercase was making them hard to read).
2. Ghost midpoint tooltip clears on mousedown so it doesn't obscure waypoint placement during drag.
3. Export filenames now include HH-MM: `YYYY-MM-DD-HH-MM-filename.ext` to differentiate iterative
   saves within the same day.

## [v2.0.8] - 2026-05-28

### Fixed
1. CSV import now clears isDirty flag — no more false unsaved-changes warning after importing CSVs.
2. CSV and KML exports now clear isDirty flag — all export paths treated as save events.
3. Chapter reorder now tracks the active chapter object through renumbering — previously selected
   the wrong chapter after drag-to-reorder.
4. Removed duplicate Era dropdown that appeared in the metadata form after the When field layout
   change. Reorganized form: Name + Era share row 1, When (full-width dropdowns) on row 2.
5. Footer version updated from v2.0 to v2.0.8.

## [v2.0.7] - 2026-05-28

### Added
1. Help text (i) icons on all chapter metadata fields and waypoint table column headers. Hover to
   see contextual guidance: field purpose, expected format, how it affects the viewer. Styled as
   small circled-i buttons matching the admiralty-chart aesthetic.

## [v2.0.6] - 2026-05-28

### Changed
1. Decision and Gateway waypoints now render as distinct shapes on the map. Decision = diamond,
   Gateway = 5-point star. Regular and Major remain as circles (Major slightly larger with heavier
   stroke). Shapes use the chapter's palette color with white outline. When both Decision and
   Gateway are set, diamond (Decision) takes visual priority. Inactive chapters still render all
   waypoints as small circle dots.

## [v2.0.5] - 2026-05-28

### Added
1. Midpoint insertion on route legs — ghost markers appear at the midpoint of each leg between
   consecutive waypoints for the active chapter. Hover to highlight, click or drag to insert a new
   waypoint at that position. Dragging allows precise placement before the waypoint is committed.
   Ghost markers automatically update when waypoints are added, removed, or reordered.

## [v2.0.4] - 2026-05-28

### Added
1. Month/year dropdowns for "When" field — replaces free-text input with structured start/end
   month + year selects. 3-letter month abbreviations. Parses existing free-text values on import
   (handles "Feb 2026 – Dec 2026", "2032 – 33", "Jan – Mar 2027" formats). Composes back to
   "Mon YYYY – Mon YYYY" string for storage.
2. Expand/collapse all — three buttons above the chapter list: "All 📋" (expand all metadata),
   "All 📍" (expand all waypoints), "Collapse" (collapse everything).

## [v2.0.3] - 2026-05-28

### Added
1. Country auto-populate — reverse geocoding via Nominatim when waypoint coordinates are set and
   country field is empty. Rate-limited queue (1 req/sec per Nominatim policy).
2. "Fill countries" button on waypoint toolbar — batches all empty-country rows for the chapter.
3. Chapter-level countries auto-aggregate from distinct waypoint countries, updating dynamically.

## [v2.0.2] - 2026-05-28

### Changed
1. Chapter metadata consolidation — `routing`, `bailout`, and `prose` fields replaced by a single
   `notes` textarea. Import from v1 JSON and older CSVs auto-merges the three fields into `notes`
   with labelled sections (e.g., "Routing: …", "Bail-out: …"). Schema doc updated.

## [v2.0.1] - 2026-05-28

### Added
1. Unsaved-changes warning — browser prompts before closing/navigating away when edits exist.
2. Date-prefixed export filenames — all exports prepend `YYYY-MM-DD-` to prevent overwrites.

## [v2.0] - 2026-05-28

### Added — Voyage Route Editor (`voyage-editor.html`)
1. New self-contained HTML/JS editor for managing chapters and waypoints. Replaces the prior
   workflow of editing via Claude prompts and Python converter scripts.
2. Accordion-style chapter list with independent metadata and waypoint expand toggles.
3. Waypoint table per chapter: inline editing, three boolean flags (Major, Decision, Gateway),
   drag-to-reorder via SortableJS.
4. Embedded Leaflet map: active chapter highlighted with route line and draggable markers,
   inactive chapters shown as muted lines.
5. Nominatim (OpenStreetMap) place search — type a name, pick from results, waypoint added
   with coordinates and country.
6. Rapid-click mode — toggle ON, click the map to add waypoints in sequence.
7. Bulk operations: add N empty rows, paste from clipboard (tab/comma-separated).
8. Chapter reordering via drag handles, auto-renumbering.
9. Import: v1 JSON (separate routes[] + waypoints[], auto-merged into unified model) and v2
   JSON (unified waypoints). CSV import (chapters.csv + waypoints.csv, two-step file picker).
10. Export: JSON (v2 schema with unified waypoints), chapters.csv, waypoints.csv, KML
    (folders per chapter, LineStrings + Placemarks with style-mapped icons).
11. Paul Tol "muted" palette carried forward from viewer, chapter colour assignment preserved.
12. Light/dark theme toggle matching the viewer's admiralty-chart aesthetic (Fraunces + Spline
    Sans Mono typography, CartoDB Positron/Dark Matter tiles).

### Changed — Data model
1. **Source of truth pivoted from KML to CSV/JSON.** The KML is archived as the one-time bootstrap
   source. Editing now happens in the editor; KML/GPX are derived exports.
2. **Unified waypoint model.** Route line vertices and named waypoints merged into a single ordered
   list per chapter. No more separate `routes[]` and `waypoints[]` arrays. Blank-name rows are
   shaping vertices (no marker); named rows are waypoints (rendered as markers).
3. **Type flags replaced.** The v1 `major` (boolean) and `routingLabel` (boolean) fields replaced
   by three independent checkboxes: `major`, `decision`, `gateway`. `routingLabel` concept dropped —
   those waypoints become regular named waypoints with no flags.
4. **Schema:** `waypoints.csv` columns: chapter, order, name, lat, lon, major, decision, gateway,
   country, notes. `chapters.csv` columns: num, name, when, era, routing, bailout, countries,
   keyDestinations, blogUrl, padMultiplier, prose. Full schema in `voyage-editor-schema.md`.

### Fixed
1. Editor layout — body missing `display: flex; flex-direction: column`, causing chapter panel
   to not scroll and map to render at minimal height. Fixed by adding flex column to body.
2. Map rendering after import — added `map.invalidateSize()` after data load so Leaflet
   recalculates container dimensions.

### Deprecated
1. `kml-to-json.py` — retained in the repo for reference but no longer part of the build pipeline.
   The editor replaces its functionality.
2. `grace-voyage-framework.kml` — archived as the bootstrap source. Route editing now happens in
   the editor; KML is a derived export.

## [v1.1] - 2026-05-21

### Added
1. `blogUrl` field on every chapter in the data model (forward-design; `null` default, no UI yet).

### Fixed
1. Route lines split across the map at the antimeridian — replaced per-polyline `unwrap()` drawing
   with `splitAtDateline()`, so each line stays in the native frame aligned with its markers.
2. Info and filter panels — and the info-panel close button — sat hidden behind the header. Added a
   positioned `#stage` wrapper so the panels sit in the map area.
3. The world stopped repeating when scrolling sideways, cutting off the circumnavigation. Removed
   `noWrap`, enabled `worldCopyJump`, and drew routes, waypoints, and zones in three world copies.

## [v1.0] - 2026-05-20

### Added
1. Initial release. 18 framework chapters (Ch 2–19) rendered from `grace-voyage-map.json`; Ch 1
   (Med Eastward) reserved as a metadata-only stub for Phase 2.
2. Adaptive light/dark base maps, chapter legend, slide-out chapter drawer, click-to-focus info
   panel, and a toggleable permanent-avoidance-zone overlay.
3. Paul Tol "muted" palette assigned across chapters by geographic opposition; padded great-circle
   distances; hero stats of ~81,051 nm across 39 nations and 15 territories.
