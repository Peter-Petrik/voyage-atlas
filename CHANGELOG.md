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

## [v3.9] - 2026-06-16

### Added
- **Configurable voyage-data source in both tools.** Both the editor and the viewer now resolve their voyage file from a single `VOYAGE_DATA_PATH` constant declared near the top of the script, replacing the hardcoded `./voyage-data.json` fetch. A `?data=path` query parameter overrides the constant per visit. Both accept relative paths only — the JSON may live in a subdirectory or a sibling folder and still load. Remote `http(s)` sources are deliberately not supported: a single static file cannot guarantee a cross-origin fetch will succeed, because the allow rule is set by the remote server, not by the tool.
- **Unified arrival chooser in both tools.** The two tools' separate landing overlays are replaced by one chooser modal with stacked, full-width options carrying a title and a one-line description. The viewer offers "Explore the sample voyage" (shown only when the configured file resolves) and "Load a voyage file"; the editor adds "Start a new voyage". The chooser is the single entry point — the header Load control, a cold start, and `?import=yes` all open it.
- **Persistent Load control and editor call-to-action in the viewer header.** The viewer header now carries a "Load…" button beside the voyage stats (opening the chooser, so a different voyage can be opened without editing the URL) and a "Chart your own voyage" call-to-action linking to the editor. On narrow screens both relocate, with the full stat set, into the chapter drawer; the theme toggle stays in the header.
- **Small-screen advisory in the chooser.** On viewports at or below the component breakpoint the chooser shows an advisory: prominent in the editor, where charting on a phone is impractical, and gentle in the viewer, where viewing works but a larger screen is better. The advisory is driven by a CSS media query, so it appears and disappears live as the viewport crosses the breakpoint.

### Changed
- **Editor opens to the chooser on every arrival.** The editor previously auto-loaded a co-located `voyage-data.json` silently and showed a landing prompt only when none was found. It now opens the chooser on every visit; the configured file, when it resolves, is offered as the sample rather than loaded silently, so the starting point is always an explicit choice. The Load menu gained "New voyage" and "Sample voyage" items (the sample item appears only when the configured file resolves), at parity with the chooser.
- **Header stat tiles brought to parity across both tools.** The editor and viewer rendered the same computed stat tiles at different sizes and spacing. Both now use one canonical set of sizes, spacing, and header padding, and both scope the tile styles under the stats container so the markup cannot leak styling elsewhere. The shared stat computation and tile markup are unchanged.
- **Footer brought to parity across both tools.** Both footers now carry a "FAQ / Owner's Manual" link to the repository's FAQ document. The viewer's left footer cell, which displayed the data-schema version, now holds that link.
- **Responsive breakpoints aligned across both tools.** The shared header, chooser, and footer now respond at one common component breakpoint (640px) in both tools, so identical elements behave identically. The editor retains its separate 768px layout breakpoint for the column-to-stack panel switch, which is structural and specific to the editor.

### Removed
- **Viewer data-schema version string.** The viewer footer no longer displays the loaded file's data-schema version; the dead code that wrote it was removed when the FAQ link took its place.

### Fixed
- **Editor header no longer overflows on small screens.** The editor header placed the title, voyage stats, and the Load/Save controls in one row with no narrow-width handling, so on a phone the row crowded or overflowed. At the component breakpoint the author-facing stats now hide (the chapter panel still shows counts), the title shrinks, and the Load/Save controls stay reachable.

## [v3.8] - 2026-06-12

### Added
- **Complete social and SEO metadata in both tools.** The `<head>` of each tool now carries a full Open Graph and Twitter Card set — including `og:image:width`/`og:image:height` (1200×630), `og:image:alt` and `twitter:image:alt`, `og:locale`, and a `rel="canonical"` link — so shared links unfurl correctly on first fetch across social platforms and the canonical URL is declared for search engines. The `og:url` and canonical URLs were aligned (with trailing slashes) so the social-aggregation target and the search-engine signal match.

### Changed
- **Favicon set reconciled to the modern minimal standard.** Both tools now reference an SVG favicon as the primary icon (crisp at any size, dark-mode capable), with 32px and 16px PNG fallbacks, a multi-size `favicon.ico` (16/32/48) carrying `sizes="32x32"` to keep browsers from preferring it over the SVG, and a 180×180 Apple touch icon. The icon filenames were corrected to match the repository's assets.

### Fixed
- **Endpoint sync indicators now refresh after reorder, bulk add, and paste.** The 🔗 / ⇄ connection indicators already refreshed on waypoint delete, coordinate edit, and marker drag (v3.7); they now also refresh when a waypoint reorder, a bulk add, or a paste changes a chapter's first or last waypoint, completing the coverage so the indicator never lags the real connection state.

## [v3.7.1] - 2026-06-12

### Added
- **Favicon and home-screen icons for both tools.** The editor and viewer now reference a favicon, an Apple touch icon, and a web manifest (`site.webmanifest`), so a browser tab shows the project icon and the tools can be saved to a mobile home screen with a proper icon. The icon assets are optional repository files; a copy hosted without them runs identically and falls back to the browser's default tab icon.
- **Mobile/standalone meta tags in the editor.** The editor gained the `theme-color` and `apple-mobile-web-app-*` tags the viewer already carried, bringing the two tools to parity for mobile appearance and standalone (home-screen) launch.

### Changed
- **Preview image switched to WebP.** The shared social preview image referenced by both tools' `og:image` and the README is now a WebP (`voyage-atlas-preview.webp`) rather than a PNG, cutting the file to roughly a third of the size with no visible difference at link-thumbnail scale. Both tools also gained an `og:image:type` hint for the WebP.
- **Footer version links to the repository.** The version label in both footers (e.g. "Voyage Atlas v3.7") now links to the project's GitHub repository.
- **Documentation:** The README and FAQ note the optional icon assets and `site.webmanifest` alongside the two HTML files, framed as cosmetic additions that do not change the no-build-step, runs-anywhere model.

## [v3.7] - 2026-06-11

### Added
- **Active-row waypoint selection in the editor.** Focusing any field in a waypoint row now selects that waypoint and lights its marker on the chart, so editing a name or coordinate shows which point is being edited. Selection fires only when focus crosses into a different row than the one already selected, so tabbing between fields within a row does nothing, and it neither moves the chart nor steals focus from the field being edited.
- **Deselect a waypoint without switching chapters.** A waypoint selection can now be cleared by pressing **Escape** (when no dialog is open) or by clicking empty chart space away from any marker, in addition to the existing clear-on-chapter-switch. Both remove the row highlight and return the marker to its normal style.
- **Larger click target on circle waypoint markers.** Named-waypoint circles are small (radius 2–10), so their clickable area was a hard target for a mouse. Each circle now carries an invisible larger hit-circle behind it that responds to the same click, drag, and right-click actions, widening the target without changing how the marker looks. Applies to circle markers; diamond and star markers are unchanged.
- **Editor landing prompt.** When no co-located `voyage-data.json` auto-loads — including when the editor is opened from disk, where browsers block the local fetch — the editor now shows a landing prompt offering to load an atlas JSON or to dismiss and begin a new atlas, matching the viewer's existing landing screen instead of silently opening empty.
- **Social and search metadata in both tools (#32).** The editor and viewer now carry a meta description, Open Graph tags, and Twitter Card tags in their `<head>`, so a shared link unfurls with a title, description, and preview image rather than a bare URL.

### Changed
- **Waypoint emphasis columns reordered to M, G, D.** The editor's waypoint table previously showed the flag columns as M, D, G. They now read M, G, D — ascending emphasis priority (Major lowest, Gateway middle, Decision highest) — so the column order matches the priority by which overlapping marker shapes resolve. The underlying marker-shape resolution (Decision's diamond wins, then Gateway's star, with Major adding size) is unchanged; only the column order and the documentation that describes it were aligned.
- **"Chart" replaces "map" in user-facing text.** In the marine domain the surface is a chart, not a map. All user-facing strings and documentation that refer to the tool's own surface now say "chart" — the viewer's "Chart & Layers" panel, tooltips, the README, the FAQ, and the schema. References to external tools keep their own terminology (Leaflet as a mapping library, Google Earth, basemap tiles), and code identifiers (the Leaflet `map` object and related names) are unchanged.
- **Footer backlink target updated (#51).** The "A project of Sailing Grace" link in both footers now points to `https://sailingamazinggrace.com/resources/voyage-atlas`, the project's resource hub, rather than the prior `/plans` destination.
- **Documentation:** The README gained a live-example link to the published viewer (#38), a screenshot of the viewer (#39), a "Using the editor" section covering the chapter metadata and waypoint layers, the emphasis flags, the country lookups, expand/collapse-all, and Rapid-click navigation, and an explicit note that auto-loading `voyage-data.json` requires the files to be served over HTTP — a `file://` open falls back to the landing picker. The FAQ documents the new row-focus selection and Escape/click-empty deselect, the Rapid-click pan and zoom gestures, and the landing prompt. The README, FAQ, and schema were swept to the M, G, D order and the chart terminology.

### Fixed
- **Endpoint sync indicators now refresh when a chapter's first or last waypoint changes.** The 🔗 / ⇄ connection indicators are derived from each chapter's start and end coordinates, but several editor actions redrew only the affected chapter's waypoint table and not the chapter list where the indicators live, so an indicator could go stale — most visibly, deleting a pulled-in handoff waypoint left the 🔗 showing as if the chapters were still linked. Deleting a waypoint, editing a waypoint's latitude or longitude, and dragging a marker to a new position now refresh the chapter list, so the indicator reflects the real connection state. The connection itself was never stored; only the on-screen indicator lagged.

## [v3.6] - 2026-06-11

### Added
- **Editor lifecycle events.** The editor now announces four kinds of meaningful moment as a generic custom DOM event (`voyage:action`) carrying a `kind` and an optional `format`: a voyage file produced for download (`export`, with `json`/`csv`/`kml`), external data brought in (`import`, with `json`/`csv`/`paste`/`bulk`), the first content-creating action of a session (`firstedit`, once per page load), and the first geocode lookup of a session (`geocode`, once per page load). The editor only dispatches; it adds no listener and references no analytics vendor, so the events are inert unless an external listener is present. The JSON-import event fires only on a user file-pick, not on the startup auto-load of the co-located `voyage-data.json`, so a plain page visit produces no false import. The CSV-pair export reports a single `export`/`csv` event rather than one per file. Shared map logic is untouched.

## [v3.5.1] - 2026-06-10

### Changed
- **Documentation:** Applied a consistent technical-prose house style across the repository docs. The README and FAQ were rewritten from second-person address to a third-person, neutral register (Quick Start imperatives retained, and the FAQ's user-voice "my responsibility?" question left as a question); the GPL boilerplate in the README was left verbatim.
- **Documentation:** Corrected a British spelling (`externalise` to `externalize`) in the data-schema doc.
- **Documentation:** Converted this changelog to the canonical Keep a Changelog structure — bulleted entries with bold labels, sections ordered Added, Changed, Deprecated, Removed, Fixed, Security, and the former per-tool and narrative sub-section headings (Editor/Viewer suffixes, Migration, Documentation, Notes, Investigated, Verified) folded into the canonical sections with their context preserved as line-item labels. No release content was altered.

## [v3.5] - 2026-06-06

### Changed
- **The two tools share one identical map-fit function again.** The viewer's `fitToCoords` had gained a one-step zoom-ease option (used when selecting a chapter) that the editor's copy didn't have, so the shared function had drifted apart. The editor now carries the identical function. Its behavior is unchanged — it doesn't use the ease, because the editor's map has no floating corner panels for a selected chapter to clear, unlike the viewer.
- **Documentation:** Updated the FAQ to describe the viewer's current behavior: how it frames the map on load (the whole voyage when it fits, otherwise anchored on the current chapter and opening toward the route ahead), the four-corner panel layout, and how selecting a chapter focuses it while the others dim.
- **Documentation:** Brought the runbook up to date through v3.5 (the viewer framing, layout, and selection work, and the fit-function re-sync, with rationale).

## [v3.4.9] - 2026-06-06

### Changed
- **The viewer opens one zoom step wider on load.** Globe-spanning voyages were framed at the tightest no-tile zoom, which felt cramped; the on-load view now eases out one step for more breathing room around the route.
- **Selecting a chapter no longer frames it edge-to-edge.** The chapter-zoom now eases out one step so the selected chapter isn't pinned to the viewport edges and clears the corner panels, while still never zooming out far enough to tile the map.

## [v3.4.8] - 2026-06-06

### Fixed
- **Selecting a chapter now dims the other chapters' waypoints, not just their route lines.** When a chapter was selected, the unselected chapters' route lines faded correctly but their waypoint dots stayed at full color, so several chapters still looked active at once. The viewer now tracks each chapter's waypoint markers and fades the unselected ones alongside their routes, then restores them when the selection is cleared.
- **Hovering an unselected chapter's route no longer leaves it looking active.** While a chapter was selected, moving the cursor across another chapter's route brightened it and then, on leaving, restored it to the normal (undimmed) appearance instead of the dimmed one — so any route the cursor brushed stayed looking active, and which chapters appeared active changed with each pass of the mouse. Hover now keeps unselected chapters dimmed while a selection is active, and only brightens routes on hover when nothing is selected.

## [v3.4.7] - 2026-06-06

### Changed
- **The viewer's on-load framing now suits globe-spanning voyages.** A circumnavigation's route wraps the whole planet, so it cannot be shown complete in a single non-tiling world — the previous fit-the-whole-voyage approach left such a voyage either tiled or floating tiny. The viewer now frames on load in one of two ways. If the whole voyage fits one non-tiling world (a regional or single-ocean voyage), it is framed whole as before. If it does not (a circumnavigation or other near-global span), the view anchors on the current chapter — taken from the chapter era flags, falling back to the first upcoming chapter, then the final chapter — and shifts so the route opens toward where the voyage is heading: the point the voyage departs from (e.g. the easternmost point of a westabout voyage) sits about 12% in from the usable edge, clear of the on-map panels, leaving the rest of the width for the route ahead. The zoom is the no-repeat minimum, so the map never tiles. This is a viewer-only change; the editor's on-load behavior is unchanged.

## [v3.4.6] - 2026-06-06

### Fixed
- **The viewer's zoom buttons are no longer hidden behind the Map & Layers panel, and the on-map panels are now grouped by purpose.** The zoom control and the Map & Layers panel both sat in the top-left corner, so the panel covered the + / − buttons. The panels were rearranged into four corners: map controls along the top (zoom top-left, Map & Layers top-right) and voyage content along the bottom (the chapter list bottom-left, the selected-chapter detail bottom-right, moved from the top-right). The detail panel gained a height cap with scrolling so a long entry can't run off the top of the map. Mobile keeps its stacked layout (full-width Map & Layers below the zoom control, detail as a bottom sheet).

## [v3.4.5] - 2026-06-06

### Fixed
- **The on-load fit no longer tiles the world (showing a voyage two or three times) and no longer floats a voyage tiny in an empty map.** v3.4.4 lowered the zoom floor far enough that a globe-spanning voyage could zoom out past the point where one world copy fills the map, so Leaflet's world-wrap drew the continents — and the route — repeated across the map. The fixed floor is replaced by a minimum zoom **computed from the map pane's actual width**: the fit never zooms out past the point where a single world fills the pane, so the map never tiles, in either tool's differently-sized map. The redundant extra zoom-out step (a full level beyond the framing zoom) was removed; framing margin now comes from the fit padding alone.
- **A voyage too wide to fit one world clips symmetrically.** When a near-global span can't fit without tiling, the view sits at the no-tile zoom centered on the route's midpoint, so the eastern and western ends fall off by roughly equal amounts rather than the whole voyage shifting to one side. Regional and single-ocean voyages are unaffected — they fit fully as before. Dateline handling is unchanged.

## [v3.4.4] - 2026-06-06

### Fixed
- **A wide voyage in the editor's narrower map pane is no longer cut off at the edges.** The shared fit eased the zoom out one level for breathing room but then floored it at a minimum that, for a globe-spanning voyage in the editor's half-width map pane, was one to two levels tighter than the zoom that actually fits the route — so the eastern and western ends (e.g. Europe on a Pacific-centered circumnavigation) fell off the edges. The floor was lowered so it never clamps a fit tighter than the zoom that frames the full extent; the viewer, with its full-width map, was already close and is unchanged in practice. Centering and dateline handling are unchanged.

## [v3.4.3] - 2026-06-06

### Changed
- **All map framing now uses one shared "fill, then ease out one level" routine.** The whole-voyage fit, the chapter-select fit, and the editor's chapter focus previously each had their own fixed maximum-zoom cap (and those caps had drifted between the tools). They now all route through one shared `fitToCoords` helper (byte-identical in both tools) that frames the points to fill the screen and then steps back one zoom level for breathing room, with a floor so a round-the-world voyage can't ease too far out. Because the real-world span of a chapter or voyage is unknown — it could be 50 nm or 5,000 nm — framing-then-easing adapts to any size, where a fixed cap was always wrong for some. Dateline handling is unchanged and still graceful: a crossing chapter or voyage frames tightly on its populated arc, never across three world copies.

### Fixed
- **The editor's on-load map fit is no longer too zoomed out.** The fit ran before the map container had been sized to its final layout (the editor's map shares width with the chapter panel, which settles a moment after load), so it measured the wrong viewport and chose too low a zoom — the global voyage didn't fill the map vertically. The load now sizes the map (`invalidateSize`) and then fits, in that order, on all three load paths (open JSON, CSV import — which previously had no size step at all — and the viewer's load).
- **Selecting a chapter no longer zooms further out than the whole-voyage view.** The chapter-select fit was capped at a fixed zoom that could be wider than the all-voyage fit, so picking a single chapter — a smaller area — sometimes zoomed out. Fixed by a related change in this release.

## [v3.4.2] - 2026-06-06

### Changed
- **The viewer's on-load fit zooms in one step closer.** The viewer's fit-to-all max zoom was raised from 6 to 8 (matching the editor), so a compact voyage — e.g. a single cruising ground — fills more of the map instead of sitting small in a wide view.

### Fixed
- **Fit-to-all-chapters no longer zooms out across three world copies for a dateline-crossing voyage.** The on-load fit unwrapped each chapter's longitudes in its own frame and then pooled the points, so chapters on opposite sides of the antimeridian landed in mismatched frames and produced an artificial near-global span — the map zoomed fully out and showed three world copies. The fit now collects every waypoint in travel order (chapter order, then waypoint order) into one sequence and unwraps it once, the same way route lines are drawn, so the whole voyage lives in a single continuous longitude frame and frames on its populated arc. A genuine round-the-world voyage still frames wide (its route really does span more than half the globe); a regional or single-ocean voyage now frames tightly.

## [v3.4.1] - 2026-06-06

### Changed
- **Fit-to-all-chapters is now a single shared function across both tools.** v3.4 introduced the on-load fit as two separate definitions (one per tool) that had drifted: different zoom caps and a missing array guard in the editor copy. It is now one byte-identical `fitAllChapters(chapters, maxZoom)` in both files, with each tool passing its own state source and its own max-zoom cap at the call site (the editor fits tighter, matching its single-chapter fit). The editor's tighter framing and the viewer's wider framing are unchanged; only the duplicated logic is removed.

### Fixed
- **Editor `fitAllChapters` no longer assumes every chapter has a waypoints array.** The shared version guards waypoint access, so a chapter without a waypoints list is skipped rather than throwing.
- **Paste box keyboard handler no longer leaks an implicit global.** The Cmd/Ctrl+Enter shortcut now references the event explicitly instead of assigning the global `event` to an undeclared variable. No behavior change.

## [v3.4] - 2026-06-06

### Added
- **Voyage stats in the editor header (#61).** The totals (distance, nations, territories, chapters, named waypoints) now appear in the editor header, mirroring the viewer's prominent placement, instead of only in the footer status line. The footer no longer shows the stats. Editor and viewer compute the figures through one shared `computeHeroStats(chapters, settings)` helper (byte-identical in both files; the state source is the only difference) and render through one shared `heroTilesHTML` tile builder, so the two tools cannot drift. The editor's header tiles match the viewer's while retaining the author-facing extras the viewer omits: the ⚙ marker on manually-overridden figures and a shaping-vertices tile.
- **Fit-to-all-chapters on load, in both tools (#58).** When a voyage loads, the map now frames the combined extent of every chapter's waypoints — an all-Mediterranean voyage opens on the Mediterranean, a global voyage on the world — rather than the editor jumping into chapter 1 or the viewer always opening on the whole world. Dateline-aware (each chapter is unwrapped in its own frame). An empty voyage leaves the default world view.
- **Cmd/Ctrl+Enter adds rows in the paste box (#55).** In the bulk-paste textarea, Cmd/Ctrl+Enter triggers "Add rows"; plain Enter still inserts a newline.

### Changed
- **The editor no longer auto-selects chapter 1 on load (#58).** Previously a chapter was always active on load, so map clicks and place searches silently added waypoints to chapter 1. Now no chapter is selected until the user picks one; the map-status line reads "No chapter selected — click a chapter to begin," and a place search with no chapter active pans to the result and hints "Select a chapter to add this waypoint" rather than silently dropping it.
- **Second Escape clears the place search box (#57).** The first Escape dismisses the results dropdown; a second Escape (results already hidden) clears the typed query.
- **Sequence-number zoom is less tight.** Clicking a waypoint's sequence number now zooms to level 7 instead of 9 — two steps further out — so more surrounding context is visible.
- **`?import` matching is case-insensitive.** The viewer load-override query param now accepts `yes`/`YES`/`Yes` (previously lowercase `yes` only).

## [v3.3] - 2026-06-06

### Added
- **Blog-post link in the viewer info panel (#16).** When a chapter carries a `blogUrl`, the info panel now shows a "Read the posts →" link (opens in a new tab). The field has existed in the data since v1.1 but had no viewer surface; it is now displayed when present and hidden when absent. No data-model change.
- **`?import=yes` load-screen override in the viewer (#49).** Opening the viewer with `?import=yes` forces the landing screen even when a co-located `voyage-data.json` would otherwise auto-load, so a user can open a different file without removing the default.
- **"A project of Sailing Grace" backlink in both footers (#51).** A restrained link to `https://sailingamazinggrace.com/plans`, centered in the footer of both the editor and the viewer (between the data/stats span on the left and the version on the right). Opens in a new tab.

## [v3.2.1] - 2026-06-06

### Fixed
- **Removed a dead waypoint sort in CSV import.** `mergeCSVImport` ran a "sort waypoints by order" step that had never functioned — the imported waypoint object never carried the `order` field, so the sort key was always undefined and the rows kept CSV file order regardless. The no-op sort is removed and the contract is now explicit: waypoints take CSV row order on import, and the exported `order` column is positional metadata that is not read back. No behavior change for any tool-produced CSV (where file order already matches the `order` column); the change removes misleading code that implied the column drove ordering.

## [v3.2] - 2026-06-06

A duplicate-functionality reconciliation pass across both tools, from a line-by-line / function-by-function audit. The shared core (the logic the editor and viewer must keep in step) is now extracted into single, byte-identical helpers rather than hand-copied, the marker rendering is unified so a waypoint looks the same in both tools, and one import bug is fixed. No data-schema change (still 3.0).

### Changed
- **Marker shape SVG is now a shared pair of helpers.** The Decision-diamond and Gateway-star SVG builders, previously inlined four times (twice per tool), are now `decisionMarkerSVG` / `gatewayMarkerSVG` — byte-identical definitions in both files, taking the shape's appearance as parameters. Rendered output is unchanged from before (verified equivalent).
- **Longitude canonicalization is a shared `normLon` helper.** The `[-180,180)` wrap formula, previously inlined in three places (and a named helper only in the editor), is now `normLon` in both tools, called at every site.
- **`chapterColor` uses a hoisted `COLOR_ASSIGN` constant in both tools.** The editor previously rebuilt the color-assignment array on every call; it now reads the same module-level constant the viewer uses, making `chapterColor` byte-identical across the files.
- **Editor import normalization consolidated.** The JSON loader and the CSV merge previously each built the chapter/waypoint object shape (including the legacy routing/bail-out/prose → notes fallback); both now go through shared `normalizeChapter` / `normalizeWaypoint` helpers. Behavior is unchanged; the CSV-only differences (comma-split lists, string-to-number coordinates) are handled by an option.
- **Chapter delete uses the styled confirmation modal.** The native browser `confirm()` for deleting a chapter is replaced by the same in-app modal pattern used for waypoint delete, via a reusable `confirmModal(title, message, onConfirm)`. Wired into the existing Esc-cancel / Enter-confirm keyboard handling.
- **`saveDefault` reuses the shared `downloadFile` helper.** The inline blob-download in Save is gone; `downloadFile` gained an optional `timestamp` flag (default on), and Save calls it with the flag off to keep the no-timestamp `voyage-data.json` overwrite behavior.
- **Distance-coordinate rounding via a shared `round5` helper.** The repeated `Math.round(x * 100000) / 100000` idiom (map click, marker drag, ghost insert, search pick, geocode) is now one helper.
- **Defensive array guards unified across the shared distance functions.** `getPredecessorChapter`, `chapterApproachNm`, and `chapterNmBase` now carry the same `|| []` guards in both tools; the only intended per-tool difference left in the shared core is the state source (the editor reads `STATE.chapters`, the viewer `DATA.chapters`).
- **`dblClickChapter` delegates to `toggleMeta`.** The duplicated panel-toggle body is removed; `toggleMeta` gained a defensive button guard.

### Removed
- **Redundant viewer theme control.** The `Light`/`Dark` segmented control in the viewer's Map & Layers panel is removed; it duplicated the header `◐` theme toggle (both drove the same light/dark tile swap). The header button is now the single theme control. The editor was already single-control and is unchanged here.

### Fixed
- **CSV import silently dropped uppercase boolean flags.** A `major`/`decision`/`gateway` value of `TRUE` (uppercase) in a waypoints CSV imported as `false`, because the CSV path matched only `true`/`1` while the paste path also accepted `TRUE`. Both import paths now share one case-insensitive `parseBool` helper, so `true`/`TRUE`/`True`/`1`/`yes` all parse truthy regardless of import route.
- **Editor and viewer drew the same waypoint at different sizes.** Major waypoint circles, and Decision/Gateway shape markers, used different dimensions in the two tools (editor radius 7 / shapes 20·16; viewer radius 6 / shapes 18·14), so the editor preview and the published viewer disagreed. The viewer now adopts the editor's sizes, so a waypoint renders identically in both.

## [v3.1.2] - 2026-06-05

### Changed
- **Spelling standardized to American English across both tools and the docs (#67).** Prose, code comments, and user-visible strings were swept for British forms (color, center, behavior, favor, -ize/-ization, gray, and similar) and converted; code identifiers and CSS/JS keywords were left untouched. No functional change — the only editor-file edits are two code comments, and the viewer footer bumps for version parity. Reverses the earlier British-spelling docs convention.

## [v3.1.1] - 2026-06-05

### Fixed
- **KML export icon priority now matches the map.** A waypoint carrying more than one of Major/Decision/Gateway now exports with a single icon chosen by the priority Decision > Gateway > Major; previously the `exportKML` style assignment let Gateway override Decision, disagreeing with the map (which already drew Decision over Gateway). The reorder applies the `decision` style last; the map shape logic and the additive tooltip glyphs are unchanged. A KML placemark carries only one icon, so a Major-only waypoint exports as the major icon while the map shows it as a sized plain marker — the winning icon is aligned across map and export, but the map's combined shape-and-size styling cannot be reproduced in KML.

## [v3.1] - 2026-06-05

### Changed
- **Adding a waypoint inserts after the selected row.** With a waypoint selected, the new row is inserted directly after it and selected; with nothing selected it still appends. Map-click and geocode adds continue to append.
- **Editor markers and ghost midpoints now render in all three world copies.** This reverses the earlier single-world-marker model and matches the viewer: a dateline-crossing chapter's markers and insert handles stay visible from either side of the antimeridian. Every copy carries the same handlers and commits through the longitude canonicalizer, so clicking, dragging, or deleting any copy edits the one underlying waypoint. The sequence-number zoom centers on the canonical copy, so selection from the list is unaffected.

### Removed
- **Pre-v3 import paths.** The legacy v1 rejection and the v2 migration (promoting `settings.voyageTitle` and reading `nmOverride`) are gone; both tools now load v3 files only, reading `meta.title` and `distanceOverride` directly. The sample `voyage-data.json` was re-saved as a clean v3.0 file. Loading a non-v3 file now relies on the branded load error rather than a format-specific rejection.

### Fixed
- **Map selection regression — routes and markers were no longer reliably selectable.** Clicking an inactive chapter's route now activates that chapter; every marker is clickable to select its waypoint, with the active chapter drawn last so its markers sit on top; and the active route stays non-interactive so it never intercepts its own marker clicks. A chapter's last waypoint is selectable again.
- **Dateline-crossing chapters: the route vanished after switching away and back.** A longitude returned by a map click near the antimeridian could fall outside [-180, 180] (for example +200 instead of -160), which left the crossing leg unsplit and render-fragile, so it dropped out when re-selecting re-centered the view. Longitudes are now canonicalized both where they are entered (map click, marker drag, ghost-drag insert) and where the route is drawn, so a crossing chapter always splits correctly across the dateline.
- **Dateline-crossing chapters: waypoints, vertices, and ghost midpoints disappeared depending on the viewing side.** The markers were drawn in a single world copy, so the far side of the antimeridian sat a full world off-screen and vanished when the view was centered on the near side. They now render in all three world copies (see the related change in this release).

## [v3.0] - 2026-06-01

### Added
- **Waypoint selection model (#56).** Clicking a marker on the map, or a waypoint's sequence number in the list, now selects that waypoint: the marker grows and turns the accent color, and its row is tinted, scrolled into view, and briefly flashed. One waypoint is selected at a time, replaced by the next and cleared when the active chapter changes. Adding a waypoint selects the new row.
- **Country look-up pre-flight estimate.** Before a long reverse-geocode run, a confirmation modal shows how many waypoints will be looked up and a rough time estimate (the queue runs at one per second). The all-chapters look-up always confirms; a per-chapter look-up confirms only when 30 or more waypoints are eligible. The running status shows progress with a live "minutes remaining".
- **Filled-country cells are flagged (#53).** A country cell that already holds a value carries a small marker, so it is visible at a glance which cells the look-up will skip.

### Changed
- **The unsaved-changes marker moved onto the Save button.** The separate header "● Unsaved" indicator is gone; the Save button itself reads `Save *` (tooltip "Unsaved changes") whenever there are unsaved edits.
- **Country look-up buttons show disabled styling.** While a geocode run is queued or in flight, the look-up buttons are visibly grayed with a not-allowed cursor, on top of the existing re-click guard.
- **Expand-all / collapse-all is now an icon pair.** Each control is a compact `⊞` (expand all) / `⊟` (collapse all) pair behind its glyph — `📋 ⊞ ⊟` for metadata panels, `📍 ⊞ ⊟` for waypoint tables — replacing the single state-aware toggle.
- **Single voyage title at `meta.title`.** The user's voyage title now lives only at `meta.title`; the older `settings.voyageTitle` is dropped, and a blank title is no longer written.
- **`nmOverride` renamed to `distanceOverride`.** A key-only rename — the value is still stored as nautical miles and converted only for entry and display.
- **Data version stamped `3.0`.** Aligned with the app version; files from 2.5–2.7 still load through the migrations.
- **Friendlier JSON load errors (#62).** A malformed or non-Voyage-Atlas file now shows a branded message in both tools instead of a raw parse error, and the viewer's auto-load distinguishes a missing file (the landing screen) from a present-but-broken one (an error).
- **Migration:** On load, a pre-v3.0 `settings.voyageTitle` is promoted to the single title — it wins if non-blank, otherwise `meta.title` is used unless it is the bare "Voyage Atlas" constant the old editor wrote — and a legacy `nmOverride` is read as `distanceOverride`. Files saved by 2.5–2.7 continue to load.

### Fixed
- **Country look-up "nothing to do" reported a spurious "1/1" (testing 8/19).** The status numerator counted every geocode attempt, so a point Nominatim cannot resolve — for example an open-ocean shaping vertex — still incremented it, showing "1/1" when nothing was actually resolved. The status now counts only the waypoints actually resolved: it reads, for example, "Geocoded 4/5" and names how many could not be resolved. Because the count lives in the shared status line, the forward (name → coordinates) look-up reports honestly too. The "all waypoints with coordinates already have countries" message (nothing eligible) is unchanged.
- **Named-waypoint map clicks were hit-or-miss.** A click on a marker could fall through to the map's "add waypoint" handler or be swallowed by an overlapping route line. Marker clicks now route through the selection model and the route lines are non-interactive, so a click reliably reaches the marker beneath.
- **Two chapters could stay highlighted at once.** Activating a chapter now redraws every chapter, so only the active chapter's route is drawn in the highlighted style.
- **Sequence-number zoom fit the whole chapter (useless on long legs).** Clicking a waypoint's sequence number now zooms to a fixed level centered on that waypoint and activates its chapter, rather than fitting the chapter's full extent.
- **A stored `meta.title` no longer fails to import.** Folded into the related single-title change in this release — the loader now reads the stored title into the editable title field.

## [v2.9] - 2026-05-31

### Added
- **Unsaved-changes indicator.** The editor header shows an "● Unsaved" marker whenever there are edits not yet saved, alongside the existing on-close warning.
- **"Look up all countries" button.** A global action beside the expand/collapse controls reverse-geocodes the country for every coordinate-bearing, country-less waypoint across all chapters, using the same single 1/sec queue as the per-chapter button (already-filled waypoints are skipped).

### Changed
- **Country-lookup buttons guard against re-clicks.** The lookup buttons disable while any geocoding is queued or running, and a second click no longer re-queues the same waypoints (previously three clicks queued the work three times over).
- **Expand-all / collapse-all is a single state-aware toggle.** The control now expands if any panel is closed and collapses otherwise, so one click does the right thing from a mixed state instead of requiring expand-then-collapse.
- **Viewer label "Waters" → "Countries / Territories,"** matching the editor field and keeping the tool sailing-agnostic.
- **Exported JSON omits unset overrides.** The settings overrides (`nmOverride`, `nationsOverride`, `territoriesOverride`) are written only when set, rather than as `null` placeholders — matching how `countriesOverride` already behaves. Data version is unchanged (2.7); the loader treats missing as unset, so older files still load.
- **Meta-form layout and tooltip polish.** Blog URL now shares a row with Pad Multiplier to use the vertical space better, and the marker tooltip's "right-click to delete" hint is italicized.
- **Button labels standardized to sentence case** ("Add chapter", "Add row", "Add N rows", "Add rows"), matching the rest of the UI.

### Fixed
- **Dateline-crossing chapters fit tightly when selected.** Selecting a chapter that crosses the antimeridian (e.g. a North Pacific leg) zoomed the map almost fully out, exposing the route's world copies. The fit now unwraps the coordinates first — matching the viewer — so it frames the crossing tightly across the antimeridian. (World-copy rendering itself is unchanged; the bug was the fit.)
- **Ghost midpoint handles stay on the route and no longer double.** On a dateline-crossing leg the midpoint handle was computed between the raw endpoints and landed mid-map; it is now dateline-aware. Separately, a full map redraw (`updateMapAll`) left the previous handles orphaned, so they accumulated as duplicates after editing — the redraw now clears them.
- **Marker tooltip flag glyphs match the marker shapes.** The tooltip showed ★ for Major and ⚑ for Gateway, but the markers draw Major as a circle, Decision as a diamond, and Gateway as a star. The tooltip now reads ● Major / ◆ Decision / ★ Gateway.

## [v2.8.1] - 2026-05-31

### Changed
- **Consistent "AUTO:" labeling.** The auto-derived hints on Distance, Nations, Territories, and the chapter Countries / Territories field now share an `AUTO:` prefix followed by the computed value (e.g. `AUTO: 7`, `AUTO: Greece, Italy`). The Distance hint now also shows the computed total.
- **Chapter field relabeled "Countries / Territories"** (was "Countries"), matching the hero's nations/territories split.

### Fixed
- **Chapter Countries / Territories placeholder now refreshes after "Look up countries."** The auto-derived placeholder was only updated while the chapter's metadata panel was open, so a lookup run with the panel collapsed left a stale value the next time it was opened. The placeholder now refreshes regardless of panel state.
- **Editor route lines stay continuous across the dateline at any map pan.** Dateline-crossing chapters are now drawn across world copies (matching the viewer) rather than in a single world, so a crossing route no longer breaks at the antimeridian depending on how the map is panned.

## [v2.8] - 2026-05-30

### Changed
- **Calculated data is no longer stored in the file (completes #44).** Building on v2.7's recompute-on-load, the editor now stops *writing* derived figures entirely: `meta.hero` (the totals) and every per-chapter `nm`/`nmBase`/`nmApproach` are gone from the JSON. Both tools compute them on load. Files saved before v2.8 keep working — the old fields are ignored.
- **Chapter countries auto-derive, with a per-chapter override.** A chapter's country list is now derived on load from its waypoints' `country` fields. The chapter's Countries field is an override: blank means automatic (shown as a grayed placeholder), and typing a list stores a `countriesOverride` that replaces the derived list for that chapter. The voyage total is the classified union of every chapter's effective list, and the editor and viewer derive identically.
- **Data version 2.6 → 2.7.** The JSON shape changed (calculated fields removed, `countries` replaced by an optional `countriesOverride`), so the stamped data version moves to 2.7.
- **Migration:** On load, a pre-existing chapter `countries` list is **ignored, not promoted to an override** — chapters start clean and derive from waypoints (reading zero until "Look up countries" populates the per-waypoint countries, or an override is set).

### Fixed
- Removed a redundant duplicate pair from the editor's territory reference list — no functional effect (it's a `Set`), but the editor and viewer lists are now byte-identical.

## [v2.7.1] - 2026-05-30

### Fixed
- **Dateline-crossing routes no longer draw "the long way" in the editor (#38).** The editor's route preview now splits each leg at the ±180° antimeridian (matching the viewer), so a chapter that crosses the dateline (e.g. a North Pacific passage) is drawn as two segments meeting the map edges rather than a straight line streaking back across the whole map. The viewer was already correct.
- **Marker tooltip "right-click to delete" hint moved to its own line (#22).** The hint used a newline character, which a Leaflet tooltip collapses to a space; it now uses `<br>`, so for both named waypoints and shaping vertices the hint sits on a second line instead of running on.

## [v2.7] - 2026-05-30

### Changed
- **Derived stats are recomputed on load, never trusted from the file (#44).** The viewer now recomputes the hero totals (distance, chapters, waypoints, nations, territories) and every per-chapter distance directly from the chapters and waypoints when a file loads, applying any explicit overrides (`nmOverride` / `nationsOverride` / `territoriesOverride`) on top — matching the editor, which already recomputed on load. The stored `meta.hero` and per-chapter `nm` / `nmBase` / `nmApproach` are now write-on-save snapshots only and are never read for display, so a hand-edited JSON (added waypoint, changed country, removed chapter) can no longer show stale figures. The JSON format is unchanged (data version stays 2.6).
- **"Load" vs "Import" verb unified (#45).** Opening a JSON file is now consistently called **Load** in both tools — the editor's data-input menu offers "Load JSON…" (was "Import JSON…"), matching the viewer's "Load JSON…". **Import** is reserved for merging tabular CSV data, so the editor's "Import CSVs (chapters + waypoints)…" is unchanged.
- **Waypoint / shaping-vertex nomenclature clarified (#46).** "Waypoint" stays the generic term for any point on the map. Where a count or an unnamed point is shown, the editor now names the subtype: the status line reads "N named waypoints · M shaping vertices" (was "N waypoints · M vertices"), and an unnamed point's marker tooltip and name-field placeholder read "shaping vertex" (was "routing vertex"), matching the Name column's help text. Generic labels (Paste Waypoints, the waypoint-table toggle, the CSV columns) are unchanged. The viewer hero stat still reads "Waypoints" (the viewer renders no shaping vertices, so the count is unambiguous there).
- **Brand color adopted (#47).** The accent is now the sailingamazinggrace.com brand crimson: `#a32e38` in the light theme (replacing the brass `#8e622b`) and a lightened `#d4626c` in the dark theme (replacing the gold `#d8b15a` — the raw brand crimson is too dark on the deep-sea background). Accent-derived tints (soft hover fills, and the dark theme's borders and row shading) follow the new hue; the light theme's ink-based borders are unchanged. Contrast is AA-compliant in both themes: accent text and links run 6.1–6.6:1 (light) and 5.0:1 (dark); accent-filled buttons 6.3:1 (light) and 4.7:1 (dark).

## [v2.6.1] - 2026-05-30

### Fixed
- **Editor page/tab title fallback.** The page header and the browser-tab title now share the viewer's full precedence (voyage title → imported `meta.title` → default). A file with a blank Voyage Title but a populated `meta.title` (e.g. a v2.5 export) now shows that title consistently in both the header and the tab instead of the two disagreeing; the editable Voyage Title field still stays blank in that case (the computed title is never written back into it).
- **Viewer landing flash.** The "Load JSON…" landing panel no longer flashes on load when a `voyage-data.json` is present to auto-load — the landing starts hidden and is shown only if the auto-load finds no file.
- **Duplicate column-header tooltips.** The Major / Decision / Gateway header cells no longer show two overlapping tooltips (a native browser tooltip on top of the custom one); only the descriptive custom tooltip remains.

## [v2.6] - 2026-05-30

A consolidated fix-and-feature batch. Distance is now unit-agnostic (nm/km/mi), the editor's
interaction rough edges are smoothed, the settings model and palette are generalized, and legacy
v1 data support is retired. Two long-standing editor bugs (right-click delete, voyage-title sync)
are fixed.

### Added
- **Distance units (nm / km / mi).** A Distance Units selector in Voyage Settings switches every on-screen distance — hero total, per-chapter figures, the gap tooltip, the status line, and the Distance Override field — between nautical miles, kilometers, and miles. Storage is unaffected: the canonical unit is always nautical miles, and exported JSON, CSV, and KML always carry nm. The selected unit is saved in `meta.settings.distanceUnit` (default `nm`).
- **Map ↔ list focus sync.** Clicking a waypoint's sequence number centers the map on it; clicking a map marker scrolls to and flashes its row (when that chapter's list is open) and focuses the name field.
- **Keyboard navigation in the place search.** Arrow keys move through Nominatim results (no wrap), Enter adds the highlighted result (or the top one if none is highlighted), Escape dismisses.
- **Open-source release.** The project is now public on GitHub under the **GPL-3.0-or-later** license — `LICENSE` carries the verbatim GPLv3 text, and the README's apply-boilerplate elects "version 3 … or (at your option) any later version". The release also adds a `README`, a `docs/` layout, and a sample `voyage-data.json`.

### Changed
- **Distance nomenclature standardized.** The nautical-mile unit is lowercase `nm` throughout, with "distance" used for the unit-agnostic concept. The editor's "NM Override" field is now "Distance Override".
- **Country auto-fill is now free-only.** A country is filled automatically only when it already rides along in a geocoding response the action triggers anyway — typing a place name, pasting name-only rows (each forward-geocoded for coordinates), or picking a search result. Actions that would need a *dedicated* reverse-geocode (adding a point by map click, editing coordinates) leave the country to the **Look up countries** button (renamed from "Fill countries"). In every case the country is filled only when the field is empty — a hand-entered value is never overwritten.
- **Unified geocoding status.** Forward and reverse geocoding now share one progress indicator ("Geocoding X/Y… (1/sec rate limit)"), so coordinate lookups show progress that was previously silent.
- **Voyage Settings consolidated to a single "Voyage Title".** The separate "Vessel Name" field is gone; the title is free text that can include a vessel, vehicle, or anything the user likes — or nothing, in which case it defaults to "Voyage Atlas". This completes the move to a vehicle-agnostic atlas begun by the distance-units work. See Removed for the data-model effect.
- **Light and dark palette meets WCAG AA.** Text/background pairs that fell short of the 4.5:1 normal-text ratio were darkened (light theme: `--muted`, `--faint`, `--accent`) or lightened (dark theme: `--faint`) while preserving the ink › muted › faint hierarchy and the admiralty-chart character.
- **Viewer loading simplified.** The redundant toolbar "Load JSON…" button was removed; loading a file lives only on the no-data landing screen.

### Removed
- **Legacy v1 JSON support.** The v1 format (per-chapter `routes[]` + `waypoints[]`) is no longer converted on load. Both editor and viewer now reject a v1 file with a clear message instead of silently mangling its geometry. Work uses the unified v2 waypoint model exclusively.
- **`vesselName` removed from the data model.** Titles derive from `voyageTitle`, then `meta.title`, then the default. Files that still contain `vesselName` are read without error and the field is dropped on the next save; a voyage whose title had been auto-built from a vessel name shows the default until a title is set.
- **Dead code.** The unused `reverseGeocodeWaypoint` function (editor) and `#load-btn` styles (viewer) were removed.

### Fixed
- **Right-click delete no longer corrupts the next waypoint.** Deleting via right-click previously left a drag armed, so the next (shifted) waypoint would begin dragging on the following interaction. Marker mousedown now ignores non-primary buttons, and any pending drag is canceled on delete.
- **Voyage Title updates live and round-trips cleanly.** Editing the title now updates the page header and browser tab immediately. Separately, the computed display title no longer copies itself back into the editable field on export→import, which had made the auto-title "sticky".
- **Ghost (midpoint) drag cleanup.** A dragged midpoint handle is now explicitly removed when the drag ends, eliminating stray off-route segments when the layer list was briefly out of sync.
- **⇄ pull keeps panels open.** Pulling a chapter's start from the previous chapter's endpoint no longer collapses any open chapter panels.
- **Vertex → waypoint refresh.** Giving a shaping vertex a name (promoting it to a waypoint) now updates the chapter's waypoint count and redraws the route immediately.
- **Marker click no longer dirties the project.** Clicking a marker without moving it no longer marks the project as having unsaved changes.

## [v2.5.2] - 2026-05-29

Project-wide rename from "Voyage Planner / Voyage Map" to Voyage Atlas.

### Changed
- The project is renamed from "Voyage Planner / Voyage Map" to **Voyage Atlas**. Rationale: in the cruising community "plan/planner" carries the wrong posture (*"sailors' plans are written in sand and at low tide"*); an atlas is a collection of charts, which is what this tool holds.
- File renames:
  - `voyage-editor.html` → `voyage-atlas-editor.html`
  - `voyage-viewer.html` → `voyage-atlas.html`
  - `voyage-editor-schema.md` → `voyage-atlas-schema.md`
  - `voyage-editor-faq.md` → `voyage-atlas-faq.md` (also consolidated — now covers editor + viewer)
  - `grace-voyage-map-future-enhancements.md` → `voyage-atlas-enhancements.md`
  - `grace-voyage-map-runbook.md` → `voyage-atlas-runbook.md`
- Page titles and footers updated: editor "[Vessel] Voyage Atlas — Editor" (default "Voyage Atlas — Editor"); viewer "[Vessel] Voyage Atlas" (default "Voyage Atlas"). All internal "Voyage Planner / Voyage Route Editor / Voyage Map Viewer" strings scrubbed.
- Unchanged: the data filename `voyage-data.json`, all JSON field names, and the archived v1.1 baked viewer `grace-voyage-map.html` (keeps its historical name).
- The FAQ is consolidated into a single owner's manual with four parts (Concepts · Editor · Viewer · Design principles), opening with the Atlas-not-Planner / sand-at-low-tide framing.

## [v2.5.1] - 2026-05-29

### Fixed
- Endpoint pull-sync now **inserts** a copy of the predecessor's last waypoint as a new first row instead of **overwriting** the existing first waypoint's coordinates. The overwrite behavior could silently relocate a named waypoint by a large distance (e.g., moving "Funchal" 23 nm offshore onto a routing vertex) and distort the within-chapter distance. Insertion preserves the existing waypoint and matches the shared-handoff data model (the handoff point legitimately appears as the last row of the prior chapter and the first row of this one). Added a guard so pulling when already synced (endpoint within 1 nm) is a no-op.

## [v2.5] - 2026-05-29

### Added
- **Editor:** Inter-chapter distance attribution — each chapter's total now includes the "approach leg" from the predecessor chapter's last waypoint to its own first waypoint (raw distance, no pad multiplier — it's a delivery passage, not cruising-ground exploration). Zero for chapters that share an endpoint (the common case); for GRACE this correctly adds the previously-uncounted 628 nm NZ→Japan repositioning to Ch 17.
- **Editor:** Endpoint sync — explicit ⇄ "pull from previous" button on each chapter (except the first). When a chapter's start point doesn't match the predecessor's endpoint, the button snaps it into place (copying coordinates, and name/country if blank). A 🔗 indicator shows when the endpoint already matches.
- **Editor:** `getPredecessorChapter()` helper — single seam for "which chapter precedes this one." Returns the num−1 chapter today (linear chain); becomes fork-aware when variant chapters (#34) are added, without touching the nm or sync logic built on top of it.

### Changed
- Ghost midpoints now land on the rendered leg line — computed in pixel space (Mercator-correct) instead of arithmetic lat/lon mean, which drifted off-line on long/high-latitude legs.
- JSON export adds `nmApproach` per chapter for transparency. Schema version bumped to 2.5. `nm` = `nmBase` × `padMultiplier` + `nmApproach`.
- **Verified (no change needed):** Viewer D/G markers — circles always render in the waypoint layer; diamond/star layer on top when toggled. Circle remains visible when D/G is unchecked, as intended.

## [v2.4.4] - 2026-05-29

### Changed
- **Notes:** Added structural HTML/JS validation tooling to the review process: DOM-ID-vs-reference cross-checking, inline-handler-vs-function-definition checking, tag-balance, duplicate-function and dead-code detection, and async-race analysis. This catches the class of bug (modal nesting, z-order) that syntax-only checking missed.

### Removed
- Dead code — unused `_origSetBase` constant in the viewer.

### Fixed
- **Editor:** HIGH — Forward geocode now rate-limited through a 1-req/sec queue (`processFwdGeoQueue`), matching the reverse-geocode queue. Previously fired simultaneous direct fetches; pasting multiple name-only rows would hit Nominatim's rate limit (429) or risk an IP ban.
- **Editor:** MEDIUM — Async geocode DOM race fixed. `forwardGeocodeWaypoint` and `reverseGeocodeWaypoint` now capture the waypoint by object reference and locate its current index after the fetch resolves (`indexOf`), so reordering or deleting rows during the ~1 sec fetch no longer writes the result to the wrong row's input field.

## [v2.4.3] - 2026-05-29

### Changed
- **Editor:** CSV export consolidated — single "CSVs (chapters + waypoints)" action downloads both files sequentially instead of two separate menu items.
- **Editor:** Routing vertex count added to footer stats (e.g., "27 vertices") — previously only named waypoints were shown.
- **Investigated:** KML Svalbard criss-cross — confirmed correct. Ch 7 out-and-back route (Tromsø → Bear Island → Longyearbyen → west Svalbard → return) naturally produces overlapping lines. The three-line appearance in Google Earth was from two separate KML exports loaded simultaneously.
- **Investigated:** CSV When format — composeWhen consistently outputs en-dash (–). Parser accepts en-dash, em-dash, and hyphen on input, normalizing all to en-dash. No inconsistency.
- **Documentation:** Added to backlog: self-contained HTML export (#20) — bake JSON into viewer for single-file hosting/sharing.
- **Documentation:** Added to backlog: KML fly-over export configuration (#21) — animated Google Earth tour with configurable camera parameters.
- **Documentation:** Backlog renumbered 1–36.

## [v2.4.2] - 2026-05-29

### Fixed
- Singular/plural sweep — all count displays now handle singular forms: waypoint toolbar ("1 row · 1 named"), chapter status bar ("1 waypoint"), geocoding completion ("1 waypoint"), fill-countries message ("1 row has no coordinates"). Completes the fix started in v2.4.1 which covered footer stats and viewer hero stats.

## [v2.4.1] - 2026-05-29

### Added
- **Viewer:** Day/night theme toggle button (◐) in header.

### Fixed
- **Editor:** Right-click delete now works — delete confirmation modal was nested inside the CSV import modal (invisible). Moved to top-level.
- **Editor:** Waypoint click regression fixed — ghost midpoint markers were rendering on top of waypoints, intercepting clicks. Waypoint markers now brought to front after ghost creation.
- **Editor:** Status bar now reflects Voyage Settings overrides immediately after JSON import.
- **Editor:** Singular/plural throughout — "1 nation" not "1 nations", "1 territory" not "1 territories", same for chapters and waypoints.
- **Editor:** Save button redesigned as split button — single "Save" with adjacent ▾ dropdown for timestamped JSON, CSVs, KML.
- **Editor:** Voyage Settings header enlarged and bolded for visual prominence.
- **Viewer:** Singular/plural in hero stats.

## [v2.4] - 2026-05-29

### Added
- Auto-load — both editor and viewer attempt to load `voyage-data.json` from the same directory on page load. If found, data loads silently. If not found, editor starts empty and viewer shows the landing prompt. This enables the hosting model: drop voyage-data.json + viewer HTML in a directory → working map with no code changes.
- Save button — primary "Save" button downloads `voyage-data.json` (fixed name, browser overwrites previous). "Save As ▾" dropdown exposes timestamped JSON, CSVs, KML.
- Override indicator — footer stats show ⚙ next to any value overridden in Voyage Settings (nm, nations, or territories).
- Export JSON refactored to shared `buildExportJSON()` function — Save and Save As use the same serialization logic (no duplication).

## [v2.3.2] - 2026-05-29

### Fixed
- **Editor:** Distance (nm) display now updates after forward geocode populates coordinates — chapter header and footer stats reflect the new distance immediately.
- **Editor:** Ghost midpoint no longer persists after rapid-click — added guard to skip rapid-click add when ghost drag is active.
- **Editor:** Nations and territories recalculate when waypoints are deleted — deleteWpt now calls updateChapterCountries to rebuild the country list.
- **Editor:** "Fill countries" message clarified — shows "All waypoints with coordinates already have countries (N rows have no coordinates)" when empty rows exist.
- **Editor:** Paste from clipboard now triggers geocoding — forward geocode for names without coordinates, reverse geocode for coordinates without country.
- **Editor:** Right-click delete now works — native browser context menu prevented on map container so Leaflet's contextmenu event fires on markers.
- **Editor:** Stats order standardized: nm, Nations, Territories, Chapters, Waypoints (editor footer and viewer header).
- **Viewer:** Vessel name now appears in viewer title — title priority: custom voyageTitle > vessel name derived > meta.title > default. Previously meta.title always took precedence.
- **Viewer:** Hero stats order matches editor: nm, Nations, Territories, Chapters, Waypoints.

## [v2.3.1] - 2026-05-29

### Added
- Territory auto-classification — built-in reference list of ~65 overseas territories (UK, France, Netherlands, US, Denmark, Norway, Australia, NZ, Portugal, Spain, China). Waypoint countries are auto-classified as nation or territory. Both counts show in footer stats and Voyage Settings with dynamic placeholder showing auto-calculated values.
- Right-click delete tooltip hint — marker tooltips now show "right-click to delete" on the active chapter's waypoints.

### Changed
- Nations and Territories fields in Voyage Settings are now both auto-calculated with override. Previously territories was manual-only. Settings field renamed from `territories` to `territoriesOverride` for consistency.

## [v2.3] - 2026-05-29

### Added
- **Editor:** Voyage Settings panel — collapsible section above chapters with: vessel name (drives page titles), Voyage Title, global Distance Override, Nations count (auto-calculated with override), and Territories count. Settings persist in JSON exports and load on import.
- **Editor:** Right-click waypoint delete on map — right-click any marker on the active chapter to open a confirmation modal. Enter confirms, ESC cancels.
- **Editor:** Delete confirmation modal with keyboard support (Enter/ESC).

### Changed
- Page title dynamically updates to include the vessel name when set.
- JSON export meta block now includes settings (vessel name, overrides) and enriched hero stats (nations, territories). Schema version bumped to 2.2.
- Editor and viewer footer versions now consistently on the right side.
- v1 JSON import extracts nations/territories from hero stats into Voyage Settings.
- **Viewer:** Page title uses vessel name from settings: "[Vessel Name] Voyage" when available.
- **Viewer:** Footer layout: data version on left, viewer version on right (matches editor).

## [v2.2] - 2026-05-29

### Added
- Forward geocode on name entry — typing a waypoint name into an empty row (no lat/lon) triggers Nominatim lookup to auto-populate coordinates and country.
- Country auto-populate on rapid-click — waypoints added via map click now auto-reverse-geocode.
- Geocoding completion message — status bar shows "Geocoded X/Y waypoints" when batch finishes.
- Modal keyboard shortcuts — Enter = submit, ESC = cancel on all modals (bulk add, paste, CSV).

### Fixed
- Help text tooltips — replaced CSS pseudo-elements with JS-based fixed-position tooltips that escape scroll container overflow. Tips auto-flip to show above when near viewport bottom.
- Viewer footer — removed redundant "Load different file" link (same as header button). Footer now shows viewer version and data version.
- Editor and viewer footers now show consistent version numbers.

## [v2.1] - 2026-05-28

### Added
- **Viewer:** New generic viewer that loads JSON at runtime via file picker — no baked-in data. Replaces the GRACE-specific `grace-voyage-map.html` (retained in repo as the v1.1 archive).
- **Viewer:** Landing state with "Load JSON" prompt when no data is loaded.
- **Viewer:** Supports both v1 JSON (separate routes/waypoints, routing/bailout fields) and v2 JSON (unified waypoints, notes field). Schema auto-detected and normalized on load.
- **Viewer:** Decision markers (diamond) and Gateway markers (star) rendered as toggleable layers — no longer stubs. Layers populate from waypoint flags in the loaded data.
- **Viewer:** Title, hero stats, and footer version populate dynamically from the loaded JSON's meta block.
- **Viewer:** "Load different file" link in footer for switching datasets without refreshing.
- **Viewer:** 707 lines (vs 4,479 for the baked viewer) — generic, data-independent, reusable.

## [v2.0.11] - 2026-05-28

### Added
- Ghost legs during midpoint drag — temporary dashed lines draw from the two adjacent waypoints to the ghost marker as it's dragged, showing where the new route segments will go. Lines use the chapter's palette color. Removed on drop when the waypoint is inserted.
- Resizable split panel — a draggable divider between the chapter list and the map. Drag left to expand the map, right to expand the chapter panel. Min width 240px for the panel, 300px reserved for the map. Leaflet auto-resizes on drag.

## [v2.0.10] - 2026-05-28

### Added
- Double-click chapter header opens metadata panel (single click still selects on map).

### Changed
- Expand/collapse redesigned as two toggle buttons ("📋 Expand all" / "📋 Collapse all" and "📍 Expand all" / "📍 Collapse all"). Same button toggles between states — replaces the previous three-button layout.

## [v2.0.9] - 2026-05-28

### Fixed
- Help text tooltips now display below the icon (prevents off-screen overflow at top of viewport) and use sentence case (inherits from label's uppercase was making them hard to read).
- Ghost midpoint tooltip clears on mousedown so it doesn't obscure waypoint placement during drag.
- Export filenames now include HH-MM: `YYYY-MM-DD-HH-MM-filename.ext` to differentiate iterative saves within the same day.

## [v2.0.8] - 2026-05-28

### Fixed
- CSV import now clears isDirty flag — no more false unsaved-changes warning after importing CSVs.
- CSV and KML exports now clear isDirty flag — all export paths treated as save events.
- Chapter reorder now tracks the active chapter object through renumbering — previously selected the wrong chapter after drag-to-reorder.
- Removed duplicate Era dropdown that appeared in the metadata form after the When field layout change. Reorganized form: Name + Era share row 1, When (full-width dropdowns) on row 2.
- Footer version updated from v2.0 to v2.0.8.

## [v2.0.7] - 2026-05-28

### Added
- Help text (i) icons on all chapter metadata fields and waypoint table column headers. Hover to see contextual guidance: field purpose, expected format, how it affects the viewer. Styled as small circled-i buttons matching the admiralty-chart aesthetic.

## [v2.0.6] - 2026-05-28

### Changed
- Decision and Gateway waypoints now render as distinct shapes on the map. Decision = diamond, Gateway = 5-point star. Regular and Major remain as circles (Major slightly larger with heavier stroke). Shapes use the chapter's palette color with white outline. When both Decision and Gateway are set, diamond (Decision) takes visual priority. Inactive chapters still render all waypoints as small circle dots.

## [v2.0.5] - 2026-05-28

### Added
- Midpoint insertion on route legs — ghost markers appear at the midpoint of each leg between consecutive waypoints for the active chapter. Hover to highlight, click or drag to insert a new waypoint at that position. Dragging allows precise placement before the waypoint is committed. Ghost markers automatically update when waypoints are added, removed, or reordered.

## [v2.0.4] - 2026-05-28

### Added
- Month/year dropdowns for "When" field — replaces free-text input with structured start/end month + year selects. 3-letter month abbreviations. Parses existing free-text values on import (handles "Feb 2026 – Dec 2026", "2032 – 33", "Jan – Mar 2027" formats). Composes back to "Mon YYYY – Mon YYYY" string for storage.
- Expand/collapse all — three buttons above the chapter list: "All 📋" (expand all metadata), "All 📍" (expand all waypoints), "Collapse" (collapse everything).

## [v2.0.3] - 2026-05-28

### Added
- Country auto-populate — reverse geocoding via Nominatim when waypoint coordinates are set and country field is empty. Rate-limited queue (1 req/sec per Nominatim policy).
- "Fill countries" button on waypoint toolbar — batches all empty-country rows for the chapter.
- Chapter-level countries auto-aggregate from distinct waypoint countries, updating dynamically.

## [v2.0.2] - 2026-05-28

### Changed
- Chapter metadata consolidation — `routing`, `bailout`, and `prose` fields replaced by a single `notes` textarea. Import from v1 JSON and older CSVs auto-merges the three fields into `notes` with labeled sections (e.g., "Routing: …", "Bail-out: …"). Schema doc updated.

## [v2.0.1] - 2026-05-28

### Added
- Unsaved-changes warning — browser prompts before closing/navigating away when edits exist.
- Date-prefixed export filenames — all exports prepend `YYYY-MM-DD-` to prevent overwrites.

## [v2.0] - 2026-05-28

### Added
- **Editor:** New self-contained HTML/JS editor for managing chapters and waypoints. Replaces the prior workflow of editing via Claude prompts and Python converter scripts.
- **Editor:** Accordion-style chapter list with independent metadata and waypoint expand toggles.
- **Editor:** Waypoint table per chapter: inline editing, three boolean flags (Major, Decision, Gateway), drag-to-reorder via SortableJS.
- **Editor:** Embedded Leaflet map: active chapter highlighted with route line and draggable markers, inactive chapters shown as muted lines.
- **Editor:** Nominatim (OpenStreetMap) place search — type a name, pick from results, waypoint added with coordinates and country.
- **Editor:** Rapid-click mode — toggle ON, click the map to add waypoints in sequence.
- **Editor:** Bulk operations: add N empty rows, paste from clipboard (tab/comma-separated).
- **Editor:** Chapter reordering via drag handles, auto-renumbering.
- **Editor:** Import: v1 JSON (separate routes[] + waypoints[], auto-merged into unified model) and v2 JSON (unified waypoints). CSV import (chapters.csv + waypoints.csv, two-step file picker).
- **Editor:** Export: JSON (v2 schema with unified waypoints), chapters.csv, waypoints.csv, KML (folders per chapter, LineStrings + Placemarks with style-mapped icons).
- **Editor:** Paul Tol "muted" palette carried forward from viewer, chapter color assignment preserved.
- **Editor:** Light/dark theme toggle matching the viewer's admiralty-chart aesthetic (Fraunces + Spline Sans Mono typography, CartoDB Positron/Dark Matter tiles).

### Changed
- **Data model:** **Source of truth pivoted from KML to CSV/JSON.** The KML is archived as the one-time bootstrap source. Editing now happens in the editor; KML/GPX are derived exports.
- **Data model:** **Unified waypoint model.** Route line vertices and named waypoints merged into a single ordered list per chapter. No more separate `routes[]` and `waypoints[]` arrays. Blank-name rows are shaping vertices (no marker); named rows are waypoints (rendered as markers).
- **Data model:** **Type flags replaced.** The v1 `major` (boolean) and `routingLabel` (boolean) fields replaced by three independent checkboxes: `major`, `decision`, `gateway`. `routingLabel` concept dropped — those waypoints become regular named waypoints with no flags.
- **Data model:** **Schema:** `waypoints.csv` columns: chapter, order, name, lat, lon, major, decision, gateway, country, notes. `chapters.csv` columns: num, name, when, era, routing, bailout, countries, keyDestinations, blogUrl, padMultiplier, prose. Full schema in `voyage-atlas-schema.md`.

### Deprecated
- `kml-to-json.py` — retained in the repo for reference but no longer part of the build pipeline. The editor replaces its functionality.
- `grace-voyage-framework.kml` — archived as the bootstrap source. Route editing now happens in the editor; KML is a derived export.

### Fixed
- Editor layout — body missing `display: flex; flex-direction: column`, causing chapter panel to not scroll and map to render at minimal height. Fixed by adding flex column to body.
- Map rendering after import — added `map.invalidateSize()` after data load so Leaflet recalculates container dimensions.

## [v1.1] - 2026-05-21

### Added
- `blogUrl` field on every chapter in the data model (forward-design; `null` default, no UI yet).

### Fixed
- Route lines split across the map at the antimeridian — replaced per-polyline `unwrap()` drawing with `splitAtDateline()`, so each line stays in the native frame aligned with its markers.
- Info and filter panels — and the info-panel close button — sat hidden behind the header. Added a positioned `#stage` wrapper so the panels sit in the map area.
- The world stopped repeating when scrolling sideways, cutting off the circumnavigation. Removed `noWrap`, enabled `worldCopyJump`, and drew routes, waypoints, and zones in three world copies.

## [v1.0] - 2026-05-20

### Added
- Initial release. 18 framework chapters (Ch 2–19) rendered from `grace-voyage-map.json`; Ch 1 (Med Eastward) reserved as a metadata-only stub for Phase 2.
- Adaptive light/dark base maps, chapter legend, slide-out chapter drawer, click-to-focus info panel, and a toggleable permanent-avoidance-zone overlay.
- Paul Tol "muted" palette assigned across chapters by geographic opposition; padded great-circle distances; hero stats of ~81,051 nm across 39 nations and 15 territories.
