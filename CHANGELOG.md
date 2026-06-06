# Changelog — Voyage Atlas

All notable changes to the Voyage Atlas project (editor + viewer) are recorded here.
File and product names in entries before v2.5.2 have been updated to current names for
consistency; the rename itself is recorded in the v2.5.2 entry. Format follows
[Keep a Changelog](https://keepachangelog.com); versioning is SemVer-lite (`vMAJOR.MINOR[.PATCH]`). The
framework document (`global-voyage-framework.md`) carries its own separate version line.

## [Unreleased]

Queued improvements tracked in `voyage-atlas-enhancements.md`:

1. PAZ (avoidance-zone) authoring in the editor
2. GPX import and export

## [v3.4] - 2026-06-06

### Added
1. **Voyage stats in the editor header (#61).** The totals (distance, nations, territories, chapters, named waypoints) now appear in the editor header, mirroring the viewer's prominent placement, instead of only in the footer status line. The footer no longer shows the stats. Editor and viewer compute the figures through one shared `computeHeroStats(chapters, settings)` helper (byte-identical in both files; the state source is the only difference) and render through one shared `heroTilesHTML` tile builder, so the two tools cannot drift. The editor's header tiles match the viewer's while retaining the author-facing extras the viewer omits: the ⚙ marker on manually-overridden figures and a shaping-vertices tile.
2. **Fit-to-all-chapters on load, in both tools (#58).** When a voyage loads, the map now frames the combined extent of every chapter's waypoints — an all-Mediterranean voyage opens on the Mediterranean, a global voyage on the world — rather than the editor jumping into chapter 1 or the viewer always opening on the whole world. Dateline-aware (each chapter is unwrapped in its own frame). An empty voyage leaves the default world view.
3. **Cmd/Ctrl+Enter adds rows in the paste box (#55).** In the bulk-paste textarea, Cmd/Ctrl+Enter triggers "Add rows"; plain Enter still inserts a newline.

### Changed
4. **The editor no longer auto-selects chapter 1 on load (#58).** Previously a chapter was always active on load, so map clicks and place searches silently added waypoints to chapter 1. Now no chapter is selected until the user picks one; the map-status line reads "No chapter selected — click a chapter to begin," and a place search with no chapter active pans to the result and hints "Select a chapter to add this waypoint" rather than silently dropping it.
5. **Second Escape clears the place search box (#57).** The first Escape dismisses the results dropdown; a second Escape (results already hidden) clears the typed query.
6. **Sequence-number zoom is less tight.** Clicking a waypoint's sequence number now zooms to level 7 instead of 9 — two steps further out — so more surrounding context is visible.
7. **`?import` matching is case-insensitive.** The viewer load-override query param now accepts `yes`/`YES`/`Yes` (previously lowercase `yes` only).

## [v3.3] - 2026-06-06

### Added
1. **Blog-post link in the viewer info panel (#16).** When a chapter carries a `blogUrl`, the info panel now shows a "Read the posts →" link (opens in a new tab). The field has existed in the data since v1.1 but had no viewer surface; it is now displayed when present and hidden when absent. No data-model change.
2. **`?import=yes` load-screen override in the viewer (#49).** Opening the viewer with `?import=yes` forces the landing screen even when a co-located `voyage-data.json` would otherwise auto-load, so a user can open a different file without removing the default.
3. **"A project of Sailing Grace" backlink in both footers (#51).** A restrained link to `https://sailingamazinggrace.com/plans`, centered in the footer of both the editor and the viewer (between the data/stats span on the left and the version on the right). Opens in a new tab.

## [v3.2.1] - 2026-06-06

### Fixed
1. **Removed a dead waypoint sort in CSV import.** `mergeCSVImport` ran a "sort waypoints by order" step that had never functioned — the imported waypoint object never carried the `order` field, so the sort key was always undefined and the rows kept CSV file order regardless. The no-op sort is removed and the contract is now explicit: waypoints take CSV row order on import, and the exported `order` column is positional metadata that is not read back. No behavior change for any tool-produced CSV (where file order already matches the `order` column); the change removes misleading code that implied the column drove ordering.

## [v3.2] - 2026-06-06

A duplicate-functionality reconciliation pass across both tools, from a line-by-line / function-by-function audit. The shared core (the logic the editor and viewer must keep in step) is now extracted into single, byte-identical helpers rather than hand-copied, the marker rendering is unified so a waypoint looks the same in both tools, and one import bug is fixed. No data-schema change (still 3.0).

### Fixed
1. **CSV import silently dropped uppercase boolean flags.** A `major`/`decision`/`gateway` value of `TRUE` (uppercase) in a waypoints CSV imported as `false`, because the CSV path matched only `true`/`1` while the paste path also accepted `TRUE`. Both import paths now share one case-insensitive `parseBool` helper, so `true`/`TRUE`/`True`/`1`/`yes` all parse truthy regardless of import route.
2. **Editor and viewer drew the same waypoint at different sizes.** Major waypoint circles, and Decision/Gateway shape markers, used different dimensions in the two tools (editor radius 7 / shapes 20·16; viewer radius 6 / shapes 18·14), so the editor preview and the published viewer disagreed. The viewer now adopts the editor's sizes, so a waypoint renders identically in both.

### Changed
3. **Marker shape SVG is now a shared pair of helpers.** The Decision-diamond and Gateway-star SVG builders, previously inlined four times (twice per tool), are now `decisionMarkerSVG` / `gatewayMarkerSVG` — byte-identical definitions in both files, taking the shape's appearance as parameters. Rendered output is unchanged from before (verified equivalent).
4. **Longitude canonicalization is a shared `normLon` helper.** The `[-180,180)` wrap formula, previously inlined in three places (and a named helper only in the editor), is now `normLon` in both tools, called at every site.
5. **`chapterColor` uses a hoisted `COLOR_ASSIGN` constant in both tools.** The editor previously rebuilt the color-assignment array on every call; it now reads the same module-level constant the viewer uses, making `chapterColor` byte-identical across the files.
6. **Editor import normalization consolidated.** The JSON loader and the CSV merge previously each built the chapter/waypoint object shape (including the legacy routing/bail-out/prose → notes fallback); both now go through shared `normalizeChapter` / `normalizeWaypoint` helpers. Behavior is unchanged; the CSV-only differences (comma-split lists, string-to-number coordinates) are handled by an option.
7. **Chapter delete uses the styled confirmation modal.** The native browser `confirm()` for deleting a chapter is replaced by the same in-app modal pattern used for waypoint delete, via a reusable `confirmModal(title, message, onConfirm)`. Wired into the existing Esc-cancel / Enter-confirm keyboard handling.
8. **`saveDefault` reuses the shared `downloadFile` helper.** The inline blob-download in Save is gone; `downloadFile` gained an optional `timestamp` flag (default on), and Save calls it with the flag off to keep the no-timestamp `voyage-data.json` overwrite behavior.
9. **Distance-coordinate rounding via a shared `round5` helper.** The repeated `Math.round(x * 100000) / 100000` idiom (map click, marker drag, ghost insert, search pick, geocode) is now one helper.
10. **Defensive array guards unified across the shared distance functions.** `getPredecessorChapter`, `chapterApproachNm`, and `chapterNmBase` now carry the same `|| []` guards in both tools; the only intended per-tool difference left in the shared core is the state source (the editor reads `STATE.chapters`, the viewer `DATA.chapters`).
11. **`dblClickChapter` delegates to `toggleMeta`.** The duplicated panel-toggle body is removed; `toggleMeta` gained a defensive button guard.

### Removed
12. **Redundant viewer theme control.** The `Light`/`Dark` segmented control in the viewer's Map & Layers panel is removed; it duplicated the header `◐` theme toggle (both drove the same light/dark tile swap). The header button is now the single theme control. The editor was already single-control and is unchanged here.

## [v3.1.2] - 2026-06-05

### Changed
1. **Spelling standardized to American English across both tools and the docs (#67).** Prose, code comments, and user-visible strings were swept for British forms (color, center, behavior, favor, -ize/-ization, gray, and similar) and converted; code identifiers and CSS/JS keywords were left untouched. No functional change — the only editor-file edits are two code comments, and the viewer footer bumps for version parity. Reverses the earlier British-spelling docs convention.

## [v3.1.1] - 2026-06-05

### Fixed
1. **KML export icon priority now matches the map.** A waypoint carrying more than one of Major/Decision/Gateway now exports with a single icon chosen by the priority Decision > Gateway > Major; previously the `exportKML` style assignment let Gateway override Decision, disagreeing with the map (which already drew Decision over Gateway). The reorder applies the `decision` style last; the map shape logic and the additive tooltip glyphs are unchanged. A KML placemark carries only one icon, so a Major-only waypoint exports as the major icon while the map shows it as a sized plain marker — the winning icon is aligned across map and export, but the map's combined shape-and-size styling cannot be reproduced in KML.

## [v3.1] - 2026-06-05

### Fixed
1. **Map selection regression — routes and markers were no longer reliably selectable.** Clicking an inactive chapter's route now activates that chapter; every marker is clickable to select its waypoint, with the active chapter drawn last so its markers sit on top; and the active route stays non-interactive so it never intercepts its own marker clicks. A chapter's last waypoint is selectable again.
2. **Dateline-crossing chapters: the route vanished after switching away and back.** A longitude returned by a map click near the antimeridian could fall outside [-180, 180] (for example +200 instead of -160), which left the crossing leg unsplit and render-fragile, so it dropped out when re-selecting re-centered the view. Longitudes are now canonicalized both where they are entered (map click, marker drag, ghost-drag insert) and where the route is drawn, so a crossing chapter always splits correctly across the dateline.
3. **Dateline-crossing chapters: waypoints, vertices, and ghost midpoints disappeared depending on the viewing side.** The markers were drawn in a single world copy, so the far side of the antimeridian sat a full world off-screen and vanished when the view was centered on the near side. They now render in all three world copies (see Changed below).

### Changed
4. **Adding a waypoint inserts after the selected row.** With a waypoint selected, the new row is inserted directly after it and selected; with nothing selected it still appends. Map-click and geocode adds continue to append.
5. **Editor markers and ghost midpoints now render in all three world copies.** This reverses the earlier single-world-marker model and matches the viewer: a dateline-crossing chapter's markers and insert handles stay visible from either side of the antimeridian. Every copy carries the same handlers and commits through the longitude canonicalizer, so clicking, dragging, or deleting any copy edits the one underlying waypoint. The sequence-number zoom centers on the canonical copy, so selection from the list is unaffected.

### Removed
6. **Pre-v3 import paths.** The legacy v1 rejection and the v2 migration (promoting `settings.voyageTitle` and reading `nmOverride`) are gone; both tools now load v3 files only, reading `meta.title` and `distanceOverride` directly. The sample `voyage-data.json` was re-saved as a clean v3.0 file. Loading a non-v3 file now relies on the branded load error rather than a format-specific rejection.

## [v3.0] - 2026-06-01

### Fixed
1. **Country look-up "nothing to do" reported a spurious "1/1" (testing 8/19).** The status numerator counted every geocode attempt, so a point Nominatim cannot resolve — for example an open-ocean shaping vertex — still incremented it, showing "1/1" when nothing was actually resolved. The status now counts only the waypoints actually resolved: it reads, for example, "Geocoded 4/5" and names how many could not be resolved. Because the count lives in the shared status line, the forward (name → coordinates) look-up reports honestly too. The "all waypoints with coordinates already have countries" message (nothing eligible) is unchanged.
2. **Named-waypoint map clicks were hit-or-miss.** A click on a marker could fall through to the map's "add waypoint" handler or be swallowed by an overlapping route line. Marker clicks now route through the selection model and the route lines are non-interactive, so a click reliably reaches the marker beneath.
3. **Two chapters could stay highlighted at once.** Activating a chapter now redraws every chapter, so only the active chapter's route is drawn in the highlighted style.
4. **Sequence-number zoom fit the whole chapter (useless on long legs).** Clicking a waypoint's sequence number now zooms to a fixed level centered on that waypoint and activates its chapter, rather than fitting the chapter's full extent.
5. **A stored `meta.title` no longer fails to import.** Folded into the single-title change below — the loader now reads the stored title into the editable title field.

### Added
6. **Waypoint selection model (#56).** Clicking a marker on the map, or a waypoint's sequence number in the list, now selects that waypoint: the marker grows and turns the accent color, and its row is tinted, scrolled into view, and briefly flashed. One waypoint is selected at a time, replaced by the next and cleared when the active chapter changes. Adding a waypoint selects the new row.
7. **Country look-up pre-flight estimate.** Before a long reverse-geocode run, a confirmation modal shows how many waypoints will be looked up and a rough time estimate (the queue runs at one per second). The all-chapters look-up always confirms; a per-chapter look-up confirms only when 30 or more waypoints are eligible. The running status shows progress with a live "minutes remaining".
8. **Filled-country cells are flagged (#53).** A country cell that already holds a value carries a small marker, so it is visible at a glance which cells the look-up will skip.

### Changed
9. **The unsaved-changes marker moved onto the Save button.** The separate header "● Unsaved" indicator is gone; the Save button itself reads `Save *` (tooltip "Unsaved changes") whenever there are unsaved edits.
10. **Country look-up buttons show disabled styling.** While a geocode run is queued or in flight, the look-up buttons are visibly grayed with a not-allowed cursor, on top of the existing re-click guard.
11. **Expand-all / collapse-all is now an icon pair.** Each control is a compact `⊞` (expand all) / `⊟` (collapse all) pair behind its glyph — `📋 ⊞ ⊟` for metadata panels, `📍 ⊞ ⊟` for waypoint tables — replacing the single state-aware toggle.
12. **Single voyage title at `meta.title`.** The user's voyage title now lives only at `meta.title`; the older `settings.voyageTitle` is dropped, and a blank title is no longer written.
13. **`nmOverride` renamed to `distanceOverride`.** A key-only rename — the value is still stored as nautical miles and converted only for entry and display.
14. **Data version stamped `3.0`.** Aligned with the app version; files from 2.5–2.7 still load through the migrations.
15. **Friendlier JSON load errors (#62).** A malformed or non-Voyage-Atlas file now shows a branded message in both tools instead of a raw parse error, and the viewer's auto-load distinguishes a missing file (the landing screen) from a present-but-broken one (an error).

### Migration
16. On load, a pre-v3.0 `settings.voyageTitle` is promoted to the single title — it wins if non-blank, otherwise `meta.title` is used unless it is the bare "Voyage Atlas" constant the old editor wrote — and a legacy `nmOverride` is read as `distanceOverride`. Files saved by 2.5–2.7 continue to load.

## [v2.9] - 2026-05-31

### Fixed
1. **Dateline-crossing chapters fit tightly when selected.** Selecting a chapter that crosses the antimeridian (e.g. a North Pacific leg) zoomed the map almost fully out, exposing the route's world copies. The fit now unwraps the coordinates first — matching the viewer — so it frames the crossing tightly across the antimeridian. (World-copy rendering itself is unchanged; the bug was the fit.)
2. **Ghost midpoint handles stay on the route and no longer double.** On a dateline-crossing leg the midpoint handle was computed between the raw endpoints and landed mid-map; it is now dateline-aware. Separately, a full map redraw (`updateMapAll`) left the previous handles orphaned, so they accumulated as duplicates after editing — the redraw now clears them.
3. **Marker tooltip flag glyphs match the marker shapes.** The tooltip showed ★ for Major and ⚑ for Gateway, but the markers draw Major as a circle, Decision as a diamond, and Gateway as a star. The tooltip now reads ● Major / ◆ Decision / ★ Gateway.

### Added
4. **Unsaved-changes indicator.** The editor header shows an "● Unsaved" marker whenever there are edits not yet saved, alongside the existing on-close warning.
5. **"Look up all countries" button.** A global action beside the expand/collapse controls reverse-geocodes the country for every coordinate-bearing, country-less waypoint across all chapters, using the same single 1/sec queue as the per-chapter button (already-filled waypoints are skipped).

### Changed
6. **Country-lookup buttons guard against re-clicks.** The lookup buttons disable while any geocoding is queued or running, and a second click no longer re-queues the same waypoints (previously three clicks queued the work three times over).
7. **Expand-all / collapse-all is a single state-aware toggle.** The control now expands if any panel is closed and collapses otherwise, so one click does the right thing from a mixed state instead of requiring expand-then-collapse.
8. **Viewer label "Waters" → "Countries / Territories,"** matching the editor field and keeping the tool sailing-agnostic.
9. **Exported JSON omits unset overrides.** The settings overrides (`nmOverride`, `nationsOverride`, `territoriesOverride`) are written only when set, rather than as `null` placeholders — matching how `countriesOverride` already behaves. Data version is unchanged (2.7); the loader treats missing as unset, so older files still load.
10. **Meta-form layout and tooltip polish.** Blog URL now shares a row with Pad Multiplier to use the vertical space better, and the marker tooltip's "right-click to delete" hint is italicized.
11. **Button labels standardized to sentence case** ("Add chapter", "Add row", "Add N rows", "Add rows"), matching the rest of the UI.

## [v2.8.1] - 2026-05-31

### Fixed
1. **Chapter Countries / Territories placeholder now refreshes after "Look up countries."** The auto-derived placeholder was only updated while the chapter's metadata panel was open, so a lookup run with the panel collapsed left a stale value the next time it was opened. The placeholder now refreshes regardless of panel state.
2. **Editor route lines stay continuous across the dateline at any map pan.** Dateline-crossing chapters are now drawn across world copies (matching the viewer) rather than in a single world, so a crossing route no longer breaks at the antimeridian depending on how the map is panned.

### Changed
3. **Consistent "AUTO:" labeling.** The auto-derived hints on Distance, Nations, Territories, and the chapter Countries / Territories field now share an `AUTO:` prefix followed by the computed value (e.g. `AUTO: 7`, `AUTO: Greece, Italy`). The Distance hint now also shows the computed total.
4. **Chapter field relabeled "Countries / Territories"** (was "Countries"), matching the hero's nations/territories split.

## [v2.8] - 2026-05-30

### Changed
1. **Calculated data is no longer stored in the file (completes #44).** Building on v2.7's recompute-on-load, the editor now stops *writing* derived figures entirely: `meta.hero` (the totals) and every per-chapter `nm`/`nmBase`/`nmApproach` are gone from the JSON. Both tools compute them on load. Files saved before v2.8 keep working — the old fields are ignored.
2. **Chapter countries auto-derive, with a per-chapter override.** A chapter's country list is now derived on load from its waypoints' `country` fields. The chapter's Countries field is an override: blank means automatic (shown as a grayed placeholder), and typing a list stores a `countriesOverride` that replaces the derived list for that chapter. The voyage total is the classified union of every chapter's effective list, and the editor and viewer derive identically.
3. **Data version 2.6 → 2.7.** The JSON shape changed (calculated fields removed, `countries` replaced by an optional `countriesOverride`), so the stamped data version moves to 2.7.

### Migration
1. On load, a pre-existing chapter `countries` list is **ignored, not promoted to an override** — chapters start clean and derive from waypoints (reading zero until "Look up countries" populates the per-waypoint countries, or an override is set).

### Fixed
1. Removed a redundant duplicate pair from the editor's territory reference list — no functional effect (it's a `Set`), but the editor and viewer lists are now byte-identical.

## [v2.7.1] - 2026-05-30

### Fixed
1. **Dateline-crossing routes no longer draw "the long way" in the editor (#38).** The editor's route preview now splits each leg at the ±180° antimeridian (matching the viewer), so a chapter that crosses the dateline (e.g. a North Pacific passage) is drawn as two segments meeting the map edges rather than a straight line streaking back across the whole map. The viewer was already correct.
2. **Marker tooltip "right-click to delete" hint moved to its own line (#22).** The hint used a newline character, which a Leaflet tooltip collapses to a space; it now uses `<br>`, so for both named waypoints and shaping vertices the hint sits on a second line instead of running on.

## [v2.7] - 2026-05-30

### Changed
1. **Derived stats are recomputed on load, never trusted from the file (#44).** The viewer now recomputes the hero totals (distance, chapters, waypoints, nations, territories) and every per-chapter distance directly from the chapters and waypoints when a file loads, applying any explicit overrides (`nmOverride` / `nationsOverride` / `territoriesOverride`) on top — matching the editor, which already recomputed on load. The stored `meta.hero` and per-chapter `nm` / `nmBase` / `nmApproach` are now write-on-save snapshots only and are never read for display, so a hand-edited JSON (added waypoint, changed country, removed chapter) can no longer show stale figures. The JSON format is unchanged (data version stays 2.6).
2. **"Load" vs "Import" verb unified (#45).** Opening a JSON file is now consistently called **Load** in both tools — the editor's data-input menu offers "Load JSON…" (was "Import JSON…"), matching the viewer's "Load JSON…". **Import** is reserved for merging tabular CSV data, so the editor's "Import CSVs (chapters + waypoints)…" is unchanged.
3. **Waypoint / shaping-vertex nomenclature clarified (#46).** "Waypoint" stays the generic term for any point on the map. Where a count or an unnamed point is shown, the editor now names the subtype: the status line reads "N named waypoints · M shaping vertices" (was "N waypoints · M vertices"), and an unnamed point's marker tooltip and name-field placeholder read "shaping vertex" (was "routing vertex"), matching the Name column's help text. Generic labels (Paste Waypoints, the waypoint-table toggle, the CSV columns) are unchanged. The viewer hero stat still reads "Waypoints" (the viewer renders no shaping vertices, so the count is unambiguous there).
4. **Brand color adopted (#47).** The accent is now the sailingamazinggrace.com brand crimson: `#a32e38` in the light theme (replacing the brass `#8e622b`) and a lightened `#d4626c` in the dark theme (replacing the gold `#d8b15a` — the raw brand crimson is too dark on the deep-sea background). Accent-derived tints (soft hover fills, and the dark theme's borders and row shading) follow the new hue; the light theme's ink-based borders are unchanged. Contrast is AA-compliant in both themes: accent text and links run 6.1–6.6:1 (light) and 5.0:1 (dark); accent-filled buttons 6.3:1 (light) and 4.7:1 (dark).

## [v2.6.1] - 2026-05-30

### Fixed
1. **Editor page/tab title fallback.** The page header and the browser-tab title now share the viewer's full precedence (voyage title → imported `meta.title` → default). A file with a blank Voyage Title but a populated `meta.title` (e.g. a v2.5 export) now shows that title consistently in both the header and the tab instead of the two disagreeing; the editable Voyage Title field still stays blank in that case (the computed title is never written back into it).
2. **Viewer landing flash.** The "Load JSON…" landing panel no longer flashes on load when a `voyage-data.json` is present to auto-load — the landing starts hidden and is shown only if the auto-load finds no file.
3. **Duplicate column-header tooltips.** The Major / Decision / Gateway header cells no longer show two overlapping tooltips (a native browser tooltip on top of the custom one); only the descriptive custom tooltip remains.

## [v2.6] - 2026-05-30

A consolidated fix-and-feature batch. Distance is now unit-agnostic (nm/km/mi), the editor's
interaction rough edges are smoothed, the settings model and palette are generalized, and legacy
v1 data support is retired. Two long-standing editor bugs (right-click delete, voyage-title sync)
are fixed.

### Added
1. **Distance units (nm / km / mi).** A Distance Units selector in Voyage Settings switches every on-screen distance — hero total, per-chapter figures, the gap tooltip, the status line, and the Distance Override field — between nautical miles, kilometers, and miles. Storage is unaffected: the canonical unit is always nautical miles, and exported JSON, CSV, and KML always carry nm. The selected unit is saved in `meta.settings.distanceUnit` (default `nm`).
2. **Map ↔ list focus sync.** Clicking a waypoint's sequence number centers the map on it; clicking a map marker scrolls to and flashes its row (when that chapter's list is open) and focuses the name field.
3. **Keyboard navigation in the place search.** Arrow keys move through Nominatim results (no wrap), Enter adds the highlighted result (or the top one if none is highlighted), Escape dismisses.
4. **Open-source release.** The project is now public on GitHub under the **GPL-3.0-or-later** license — `LICENSE` carries the verbatim GPLv3 text, and the README's apply-boilerplate elects "version 3 … or (at your option) any later version". The release also adds a `README`, a `docs/` layout, and a sample `voyage-data.json`.

### Changed
1. **Distance nomenclature standardized.** The nautical-mile unit is lowercase `nm` throughout, with "distance" used for the unit-agnostic concept. The editor's "NM Override" field is now "Distance Override".
2. **Country auto-fill is now free-only.** A country is filled automatically only when it already rides along in a geocoding response the action triggers anyway — typing a place name, pasting name-only rows (each forward-geocoded for coordinates), or picking a search result. Actions that would need a *dedicated* reverse-geocode (adding a point by map click, editing coordinates) leave the country to the **Look up countries** button (renamed from "Fill countries"). In every case the country is filled only when the field is empty — a hand-entered value is never overwritten.
3. **Unified geocoding status.** Forward and reverse geocoding now share one progress indicator ("Geocoding X/Y… (1/sec rate limit)"), so coordinate lookups show progress that was previously silent.
4. **Voyage Settings consolidated to a single "Voyage Title".** The separate "Vessel Name" field is gone; the title is free text that can include a vessel, vehicle, or anything the user likes — or nothing, in which case it defaults to "Voyage Atlas". This completes the move to a vehicle-agnostic atlas begun by the distance-units work. See Removed for the data-model effect.
5. **Light and dark palette meets WCAG AA.** Text/background pairs that fell short of the 4.5:1 normal-text ratio were darkened (light theme: `--muted`, `--faint`, `--accent`) or lightened (dark theme: `--faint`) while preserving the ink › muted › faint hierarchy and the admiralty-chart character.
6. **Viewer loading simplified.** The redundant toolbar "Load JSON…" button was removed; loading a file lives only on the no-data landing screen.

### Fixed
1. **Right-click delete no longer corrupts the next waypoint.** Deleting via right-click previously left a drag armed, so the next (shifted) waypoint would begin dragging on the following interaction. Marker mousedown now ignores non-primary buttons, and any pending drag is canceled on delete.
2. **Voyage Title updates live and round-trips cleanly.** Editing the title now updates the page header and browser tab immediately. Separately, the computed display title no longer copies itself back into the editable field on export→import, which had made the auto-title "sticky".
3. **Ghost (midpoint) drag cleanup.** A dragged midpoint handle is now explicitly removed when the drag ends, eliminating stray off-route segments when the layer list was briefly out of sync.
4. **⇄ pull keeps panels open.** Pulling a chapter's start from the previous chapter's endpoint no longer collapses any open chapter panels.
5. **Vertex → waypoint refresh.** Giving a shaping vertex a name (promoting it to a waypoint) now updates the chapter's waypoint count and redraws the route immediately.
6. **Marker click no longer dirties the project.** Clicking a marker without moving it no longer marks the project as having unsaved changes.

### Removed
1. **Legacy v1 JSON support.** The v1 format (per-chapter `routes[]` + `waypoints[]`) is no longer converted on load. Both editor and viewer now reject a v1 file with a clear message instead of silently mangling its geometry. Work uses the unified v2 waypoint model exclusively.
2. **`vesselName` removed from the data model.** Titles derive from `voyageTitle`, then `meta.title`, then the default. Files that still contain `vesselName` are read without error and the field is dropped on the next save; a voyage whose title had been auto-built from a vessel name shows the default until a title is set.
3. **Dead code.** The unused `reverseGeocodeWaypoint` function (editor) and `#load-btn` styles (viewer) were removed.

## [v2.5.2] - 2026-05-29

### Changed — project-wide rename to Voyage Atlas
1. The project is renamed from "Voyage Planner / Voyage Map" to **Voyage Atlas**. Rationale: in the cruising community "plan/planner" carries the wrong posture (*"sailors' plans are written in sand and at low tide"*); an atlas is a collection of charts, which is what this tool holds.
2. File renames:
   - `voyage-editor.html` → `voyage-atlas-editor.html`
   - `voyage-viewer.html` → `voyage-atlas.html`
   - `voyage-editor-schema.md` → `voyage-atlas-schema.md`
   - `voyage-editor-faq.md` → `voyage-atlas-faq.md` (also consolidated — now covers editor + viewer)
   - `grace-voyage-map-future-enhancements.md` → `voyage-atlas-enhancements.md`
   - `grace-voyage-map-runbook.md` → `voyage-atlas-runbook.md`
3. Page titles and footers updated: editor "[Vessel] Voyage Atlas — Editor" (default "Voyage Atlas — Editor"); viewer "[Vessel] Voyage Atlas" (default "Voyage Atlas"). All internal "Voyage Planner / Voyage Route Editor / Voyage Map Viewer" strings scrubbed.
4. Unchanged: the data filename `voyage-data.json`, all JSON field names, and the archived v1.1 baked viewer `grace-voyage-map.html` (keeps its historical name).
5. The FAQ is consolidated into a single owner's manual with four parts (Concepts · Editor · Viewer · Design principles), opening with the Atlas-not-Planner / sand-at-low-tide framing.

## [v2.5.1] - 2026-05-29

### Fixed
1. Endpoint pull-sync now **inserts** a copy of the predecessor's last waypoint as a new first row instead of **overwriting** the existing first waypoint's coordinates. The overwrite behavior could silently relocate a named waypoint by a large distance (e.g., moving "Funchal" 23 nm offshore onto a routing vertex) and distort the within-chapter distance. Insertion preserves the existing waypoint and matches the shared-handoff data model (the handoff point legitimately appears as the last row of the prior chapter and the first row of this one). Added a guard so pulling when already synced (endpoint within 1 nm) is a no-op.

## [v2.5] - 2026-05-29

### Added — Editor
1. Inter-chapter distance attribution — each chapter's total now includes the "approach leg" from the predecessor chapter's last waypoint to its own first waypoint (raw distance, no pad multiplier — it's a delivery passage, not cruising-ground exploration). Zero for chapters that share an endpoint (the common case); for GRACE this correctly adds the previously-uncounted 628 nm NZ→Japan repositioning to Ch 17.
2. Endpoint sync — explicit ⇄ "pull from previous" button on each chapter (except the first). When a chapter's start point doesn't match the predecessor's endpoint, the button snaps it into place (copying coordinates, and name/country if blank). A 🔗 indicator shows when the endpoint already matches.
3. `getPredecessorChapter()` helper — single seam for "which chapter precedes this one." Returns the num−1 chapter today (linear chain); becomes fork-aware when variant chapters (#34) are added, without touching the nm or sync logic built on top of it.

### Changed
1. Ghost midpoints now land on the rendered leg line — computed in pixel space (Mercator-correct) instead of arithmetic lat/lon mean, which drifted off-line on long/high-latitude legs.
2. JSON export adds `nmApproach` per chapter for transparency. Schema version bumped to 2.5. `nm` = `nmBase` × `padMultiplier` + `nmApproach`.

### Verified (no change needed)
1. Viewer D/G markers — circles always render in the waypoint layer; diamond/star layer on top when toggled. Circle remains visible when D/G is unchecked, as intended.

## [v2.4.4] - 2026-05-29

### Fixed — Editor (from deep structural review)
1. HIGH — Forward geocode now rate-limited through a 1-req/sec queue (`processFwdGeoQueue`), matching the reverse-geocode queue. Previously fired simultaneous direct fetches; pasting multiple name-only rows would hit Nominatim's rate limit (429) or risk an IP ban.
2. MEDIUM — Async geocode DOM race fixed. `forwardGeocodeWaypoint` and `reverseGeocodeWaypoint` now capture the waypoint by object reference and locate its current index after the fetch resolves (`indexOf`), so reordering or deleting rows during the ~1 sec fetch no longer writes the result to the wrong row's input field.

### Removed
1. Dead code — unused `_origSetBase` constant in the viewer.

### Notes
1. Added structural HTML/JS validation tooling to the review process: DOM-ID-vs-reference cross-checking, inline-handler-vs-function-definition checking, tag-balance, duplicate-function and dead-code detection, and async-race analysis. This catches the class of bug (modal nesting, z-order) that syntax-only checking missed.

## [v2.4.3] - 2026-05-29

### Changed — Editor
1. CSV export consolidated — single "CSVs (chapters + waypoints)" action downloads both files sequentially instead of two separate menu items.
2. Routing vertex count added to footer stats (e.g., "27 vertices") — previously only named waypoints were shown.

### Investigated
1. KML Svalbard criss-cross — confirmed correct. Ch 7 out-and-back route (Tromsø → Bear Island → Longyearbyen → west Svalbard → return) naturally produces overlapping lines. The three-line appearance in Google Earth was from two separate KML exports loaded simultaneously.
2. CSV When format — composeWhen consistently outputs en-dash (–). Parser accepts en-dash, em-dash, and hyphen on input, normalizing all to en-dash. No inconsistency.

### Documentation
1. Added to backlog: self-contained HTML export (#20) — bake JSON into viewer for single-file hosting/sharing.
2. Added to backlog: KML fly-over export configuration (#21) — animated Google Earth tour with configurable camera parameters.
3. Backlog renumbered 1–36.

## [v2.4.2] - 2026-05-29

### Fixed
1. Singular/plural sweep — all count displays now handle singular forms: waypoint toolbar ("1 row · 1 named"), chapter status bar ("1 waypoint"), geocoding completion ("1 waypoint"), fill-countries message ("1 row has no coordinates"). Completes the fix started in v2.4.1 which covered footer stats and viewer hero stats.

## [v2.4.1] - 2026-05-29

### Fixed — Editor
1. Right-click delete now works — delete confirmation modal was nested inside the CSV import modal (invisible). Moved to top-level.
2. Waypoint click regression fixed — ghost midpoint markers were rendering on top of waypoints, intercepting clicks. Waypoint markers now brought to front after ghost creation.
3. Status bar now reflects Voyage Settings overrides immediately after JSON import.
4. Singular/plural throughout — "1 nation" not "1 nations", "1 territory" not "1 territories", same for chapters and waypoints.
5. Save button redesigned as split button — single "Save" with adjacent ▾ dropdown for timestamped JSON, CSVs, KML.
6. Voyage Settings header enlarged and bolded for visual prominence.

### Fixed — Viewer
1. Singular/plural in hero stats.

### Added — Viewer
1. Day/night theme toggle button (◐) in header.

## [v2.4] - 2026-05-29

### Added
1. Auto-load — both editor and viewer attempt to load `voyage-data.json` from the same directory on page load. If found, data loads silently. If not found, editor starts empty and viewer shows the landing prompt. This enables the hosting model: drop voyage-data.json + viewer HTML in a directory → working map with no code changes.
2. Save button — primary "Save" button downloads `voyage-data.json` (fixed name, browser overwrites previous). "Save As ▾" dropdown exposes timestamped JSON, CSVs, KML.
3. Override indicator — footer stats show ⚙ next to any value overridden in Voyage Settings (nm, nations, or territories).
4. Export JSON refactored to shared `buildExportJSON()` function — Save and Save As use the same serialization logic (no duplication).

## [v2.3.2] - 2026-05-29

### Fixed — Editor
1. Distance (nm) display now updates after forward geocode populates coordinates — chapter header and footer stats reflect the new distance immediately.
2. Ghost midpoint no longer persists after rapid-click — added guard to skip rapid-click add when ghost drag is active.
3. Nations and territories recalculate when waypoints are deleted — deleteWpt now calls updateChapterCountries to rebuild the country list.
4. "Fill countries" message clarified — shows "All waypoints with coordinates already have countries (N rows have no coordinates)" when empty rows exist.
5. Paste from clipboard now triggers geocoding — forward geocode for names without coordinates, reverse geocode for coordinates without country.
6. Right-click delete now works — native browser context menu prevented on map container so Leaflet's contextmenu event fires on markers.
7. Stats order standardized: nm, Nations, Territories, Chapters, Waypoints (editor footer and viewer header).

### Fixed — Viewer
1. Vessel name now appears in viewer title — title priority: custom voyageTitle > vessel name derived > meta.title > default. Previously meta.title always took precedence.
2. Hero stats order matches editor: nm, Nations, Territories, Chapters, Waypoints.

## [v2.3.1] - 2026-05-29

### Added
1. Territory auto-classification — built-in reference list of ~65 overseas territories (UK, France, Netherlands, US, Denmark, Norway, Australia, NZ, Portugal, Spain, China). Waypoint countries are auto-classified as nation or territory. Both counts show in footer stats and Voyage Settings with dynamic placeholder showing auto-calculated values.
2. Right-click delete tooltip hint — marker tooltips now show "right-click to delete" on the active chapter's waypoints.

### Changed
1. Nations and Territories fields in Voyage Settings are now both auto-calculated with override. Previously territories was manual-only. Settings field renamed from `territories` to `territoriesOverride` for consistency.

## [v2.3] - 2026-05-29

### Added — Editor
1. Voyage Settings panel — collapsible section above chapters with: vessel name (drives page titles), Voyage Title, global Distance Override, Nations count (auto-calculated with override), and Territories count. Settings persist in JSON exports and load on import.
2. Right-click waypoint delete on map — right-click any marker on the active chapter to open a confirmation modal. Enter confirms, ESC cancels.
3. Delete confirmation modal with keyboard support (Enter/ESC).

### Changed
1. Page title dynamically updates to include the vessel name when set.
2. JSON export meta block now includes settings (vessel name, overrides) and enriched hero stats (nations, territories). Schema version bumped to 2.2.
3. Editor and viewer footer versions now consistently on the right side.
4. v1 JSON import extracts nations/territories from hero stats into Voyage Settings.

### Changed — Viewer
1. Page title uses vessel name from settings: "[Vessel Name] Voyage" when available.
2. Footer layout: data version on left, viewer version on right (matches editor).

## [v2.2] - 2026-05-29

### Added
1. Forward geocode on name entry — typing a waypoint name into an empty row (no lat/lon) triggers Nominatim lookup to auto-populate coordinates and country.
2. Country auto-populate on rapid-click — waypoints added via map click now auto-reverse-geocode.
3. Geocoding completion message — status bar shows "Geocoded X/Y waypoints" when batch finishes.
4. Modal keyboard shortcuts — Enter = submit, ESC = cancel on all modals (bulk add, paste, CSV).

### Fixed
1. Help text tooltips — replaced CSS pseudo-elements with JS-based fixed-position tooltips that escape scroll container overflow. Tips auto-flip to show above when near viewport bottom.
2. Viewer footer — removed redundant "Load different file" link (same as header button). Footer now shows viewer version and data version.
3. Editor and viewer footers now show consistent version numbers.

## [v2.1] - 2026-05-28

### Added — Viewer (`voyage-atlas.html`)
1. New generic viewer that loads JSON at runtime via file picker — no baked-in data. Replaces the GRACE-specific `grace-voyage-map.html` (retained in repo as the v1.1 archive).
2. Landing state with "Load JSON" prompt when no data is loaded.
3. Supports both v1 JSON (separate routes/waypoints, routing/bailout fields) and v2 JSON (unified waypoints, notes field). Schema auto-detected and normalized on load.
4. Decision markers (diamond) and Gateway markers (star) rendered as toggleable layers — no longer stubs. Layers populate from waypoint flags in the loaded data.
5. Title, hero stats, and footer version populate dynamically from the loaded JSON's meta block.
6. "Load different file" link in footer for switching datasets without refreshing.
7. 707 lines (vs 4,479 for the baked viewer) — generic, data-independent, reusable.

## [v2.0.11] - 2026-05-28

### Added
1. Ghost legs during midpoint drag — temporary dashed lines draw from the two adjacent waypoints to the ghost marker as it's dragged, showing where the new route segments will go. Lines use the chapter's palette color. Removed on drop when the waypoint is inserted.
2. Resizable split panel — a draggable divider between the chapter list and the map. Drag left to expand the map, right to expand the chapter panel. Min width 240px for the panel, 300px reserved for the map. Leaflet auto-resizes on drag.

## [v2.0.10] - 2026-05-28

### Added
1. Double-click chapter header opens metadata panel (single click still selects on map).

### Changed
1. Expand/collapse redesigned as two toggle buttons ("📋 Expand all" / "📋 Collapse all" and "📍 Expand all" / "📍 Collapse all"). Same button toggles between states — replaces the previous three-button layout.

## [v2.0.9] - 2026-05-28

### Fixed
1. Help text tooltips now display below the icon (prevents off-screen overflow at top of viewport) and use sentence case (inherits from label's uppercase was making them hard to read).
2. Ghost midpoint tooltip clears on mousedown so it doesn't obscure waypoint placement during drag.
3. Export filenames now include HH-MM: `YYYY-MM-DD-HH-MM-filename.ext` to differentiate iterative saves within the same day.

## [v2.0.8] - 2026-05-28

### Fixed
1. CSV import now clears isDirty flag — no more false unsaved-changes warning after importing CSVs.
2. CSV and KML exports now clear isDirty flag — all export paths treated as save events.
3. Chapter reorder now tracks the active chapter object through renumbering — previously selected the wrong chapter after drag-to-reorder.
4. Removed duplicate Era dropdown that appeared in the metadata form after the When field layout change. Reorganized form: Name + Era share row 1, When (full-width dropdowns) on row 2.
5. Footer version updated from v2.0 to v2.0.8.

## [v2.0.7] - 2026-05-28

### Added
1. Help text (i) icons on all chapter metadata fields and waypoint table column headers. Hover to see contextual guidance: field purpose, expected format, how it affects the viewer. Styled as small circled-i buttons matching the admiralty-chart aesthetic.

## [v2.0.6] - 2026-05-28

### Changed
1. Decision and Gateway waypoints now render as distinct shapes on the map. Decision = diamond, Gateway = 5-point star. Regular and Major remain as circles (Major slightly larger with heavier stroke). Shapes use the chapter's palette color with white outline. When both Decision and Gateway are set, diamond (Decision) takes visual priority. Inactive chapters still render all waypoints as small circle dots.

## [v2.0.5] - 2026-05-28

### Added
1. Midpoint insertion on route legs — ghost markers appear at the midpoint of each leg between consecutive waypoints for the active chapter. Hover to highlight, click or drag to insert a new waypoint at that position. Dragging allows precise placement before the waypoint is committed. Ghost markers automatically update when waypoints are added, removed, or reordered.

## [v2.0.4] - 2026-05-28

### Added
1. Month/year dropdowns for "When" field — replaces free-text input with structured start/end month + year selects. 3-letter month abbreviations. Parses existing free-text values on import (handles "Feb 2026 – Dec 2026", "2032 – 33", "Jan – Mar 2027" formats). Composes back to "Mon YYYY – Mon YYYY" string for storage.
2. Expand/collapse all — three buttons above the chapter list: "All 📋" (expand all metadata), "All 📍" (expand all waypoints), "Collapse" (collapse everything).

## [v2.0.3] - 2026-05-28

### Added
1. Country auto-populate — reverse geocoding via Nominatim when waypoint coordinates are set and country field is empty. Rate-limited queue (1 req/sec per Nominatim policy).
2. "Fill countries" button on waypoint toolbar — batches all empty-country rows for the chapter.
3. Chapter-level countries auto-aggregate from distinct waypoint countries, updating dynamically.

## [v2.0.2] - 2026-05-28

### Changed
1. Chapter metadata consolidation — `routing`, `bailout`, and `prose` fields replaced by a single `notes` textarea. Import from v1 JSON and older CSVs auto-merges the three fields into `notes` with labeled sections (e.g., "Routing: …", "Bail-out: …"). Schema doc updated.

## [v2.0.1] - 2026-05-28

### Added
1. Unsaved-changes warning — browser prompts before closing/navigating away when edits exist.
2. Date-prefixed export filenames — all exports prepend `YYYY-MM-DD-` to prevent overwrites.

## [v2.0] - 2026-05-28

### Added — Editor (`voyage-atlas-editor.html`)
1. New self-contained HTML/JS editor for managing chapters and waypoints. Replaces the prior workflow of editing via Claude prompts and Python converter scripts.
2. Accordion-style chapter list with independent metadata and waypoint expand toggles.
3. Waypoint table per chapter: inline editing, three boolean flags (Major, Decision, Gateway), drag-to-reorder via SortableJS.
4. Embedded Leaflet map: active chapter highlighted with route line and draggable markers, inactive chapters shown as muted lines.
5. Nominatim (OpenStreetMap) place search — type a name, pick from results, waypoint added with coordinates and country.
6. Rapid-click mode — toggle ON, click the map to add waypoints in sequence.
7. Bulk operations: add N empty rows, paste from clipboard (tab/comma-separated).
8. Chapter reordering via drag handles, auto-renumbering.
9. Import: v1 JSON (separate routes[] + waypoints[], auto-merged into unified model) and v2 JSON (unified waypoints). CSV import (chapters.csv + waypoints.csv, two-step file picker).
10. Export: JSON (v2 schema with unified waypoints), chapters.csv, waypoints.csv, KML (folders per chapter, LineStrings + Placemarks with style-mapped icons).
11. Paul Tol "muted" palette carried forward from viewer, chapter color assignment preserved.
12. Light/dark theme toggle matching the viewer's admiralty-chart aesthetic (Fraunces + Spline Sans Mono typography, CartoDB Positron/Dark Matter tiles).

### Changed — Data model
1. **Source of truth pivoted from KML to CSV/JSON.** The KML is archived as the one-time bootstrap source. Editing now happens in the editor; KML/GPX are derived exports.
2. **Unified waypoint model.** Route line vertices and named waypoints merged into a single ordered list per chapter. No more separate `routes[]` and `waypoints[]` arrays. Blank-name rows are shaping vertices (no marker); named rows are waypoints (rendered as markers).
3. **Type flags replaced.** The v1 `major` (boolean) and `routingLabel` (boolean) fields replaced by three independent checkboxes: `major`, `decision`, `gateway`. `routingLabel` concept dropped — those waypoints become regular named waypoints with no flags.
4. **Schema:** `waypoints.csv` columns: chapter, order, name, lat, lon, major, decision, gateway, country, notes. `chapters.csv` columns: num, name, when, era, routing, bailout, countries, keyDestinations, blogUrl, padMultiplier, prose. Full schema in `voyage-atlas-schema.md`.

### Fixed
1. Editor layout — body missing `display: flex; flex-direction: column`, causing chapter panel to not scroll and map to render at minimal height. Fixed by adding flex column to body.
2. Map rendering after import — added `map.invalidateSize()` after data load so Leaflet recalculates container dimensions.

### Deprecated
1. `kml-to-json.py` — retained in the repo for reference but no longer part of the build pipeline. The editor replaces its functionality.
2. `grace-voyage-framework.kml` — archived as the bootstrap source. Route editing now happens in the editor; KML is a derived export.

## [v1.1] - 2026-05-21

### Added
1. `blogUrl` field on every chapter in the data model (forward-design; `null` default, no UI yet).

### Fixed
1. Route lines split across the map at the antimeridian — replaced per-polyline `unwrap()` drawing with `splitAtDateline()`, so each line stays in the native frame aligned with its markers.
2. Info and filter panels — and the info-panel close button — sat hidden behind the header. Added a positioned `#stage` wrapper so the panels sit in the map area.
3. The world stopped repeating when scrolling sideways, cutting off the circumnavigation. Removed `noWrap`, enabled `worldCopyJump`, and drew routes, waypoints, and zones in three world copies.

## [v1.0] - 2026-05-20

### Added
1. Initial release. 18 framework chapters (Ch 2–19) rendered from `grace-voyage-map.json`; Ch 1 (Med Eastward) reserved as a metadata-only stub for Phase 2.
2. Adaptive light/dark base maps, chapter legend, slide-out chapter drawer, click-to-focus info panel, and a toggleable permanent-avoidance-zone overlay.
3. Paul Tol "muted" palette assigned across chapters by geographic opposition; padded great-circle distances; hero stats of ~81,051 nm across 39 nations and 15 territories.
