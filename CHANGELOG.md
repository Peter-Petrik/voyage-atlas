# Changelog — Voyage Map

All notable changes to the voyage map project (editor + viewer) are recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com); versioning is SemVer-lite (`vMAJOR.MINOR`). The
framework document (`global-voyage-framework.md`) carries its own separate version line.

## [Unreleased]

Queued improvements tracked in `grace-voyage-map-future-enhancements.md`:
1. Help text (i) icons on all editor fields
2. Chapter endpoint synchronization
3. Midpoint insertion on route legs (ghost draggable points)
4. Country auto-populate via reverse geocoding
5. Chapter countries auto-aggregate from waypoints
6. Month/year dropdowns for "When" field
7. Decision/Gateway visual marker styles in editor and viewer
8. Viewer refactor to runtime JSON loading
9. GPX import and export

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
