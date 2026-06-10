# Voyage Atlas

A pair of self-contained, dependency-light web tools for charting a long voyage as a sequence of
**chapters** — strategic groupings of waypoints by region and season. Built for cruisers planning
ocean passages and multi-year voyages, but generic enough for any voyage.

In the cruising community, *plan* is a dangerous four-letter word — *"sailors' plans are written
in sand and at low tide."* This isn't a planner. An **atlas** is a collection of charts: routes
routes to navigate *by*, not a schedule to be bound *to*.

<!-- TODO: add a screenshot of the viewer here, e.g. ![Voyage Atlas viewer](docs/screenshot.png) -->

## What's in the box

1. **Editor** (`voyage-atlas-editor.html`) — builds and maintains an atlas: chapters, waypoints, route geometry, and voyage metadata. Map-based and table-based editing, geocoding, drag-to-reorder, and JSON / CSV / KML export.
2. **Viewer** (`voyage-atlas.html`) — a read-only interactive map of a finished atlas. This is what is published or shared.

Both are single HTML files. No build step, no framework, no server — open them in any modern
browser, host them on any static server, or hand them to someone else, and they behave identically.

## Quick start

1. Download `voyage-atlas-editor.html`, `voyage-atlas.html`, and (optionally) the sample `voyage-data.json` into the same folder.
2. **To explore the sample:** open `voyage-atlas.html` in a browser. If `voyage-data.json` is alongside it, the map loads automatically.
3. **To build a new atlas:** open `voyage-atlas-editor.html`, add a chapter, and start placing waypoints (click the map, search by name, or type coordinates). Click **Save** to download `voyage-data.json`.
4. **To view a finished atlas:** put the `voyage-data.json` next to `voyage-atlas.html` and open the viewer — or load the file from the viewer's landing screen.

The repository ships with a small sample `voyage-data.json` (a short Greek Ionian cruise) so the
tools open to a working example. <!-- TODO: link to the full live example once published, e.g.
"See a full voyage at https://sailingamazinggrace.com/..." -->

## Features

1. **Chapters** group waypoints by region and season, each with its own color, season window, era (past / current / future), countries, key destinations, notes, and an optional blog link.
2. **Unified waypoint model** — one ordered list per chapter; named rows render as markers, unnamed rows act as shaping vertices that bend the route line without cluttering the map.
3. **Three independent emphasis flags** per waypoint — Major (M), Decision (D), Gateway (G) — each with distinct map rendering.
4. **Distance with a pad multiplier** per chapter (accounting for tacking and cruising-ground exploration a straight-line track undercounts), plus an inter-chapter "approach leg" attributed to the destination chapter. All distances can display in nautical miles, kilometers, or miles (stored canonically as nm).
5. **Endpoint sync** — chapters connect end-to-start; a one-click pull keeps shared handoff points aligned, and an indicator shows when a real gap exists.
6. **Geocoding** via OpenStreetMap / Nominatim (rate-limited per their usage policy) — type a name to get coordinates, or fill countries from positions.
7. **Automatic nation / territory classification** against a built-in reference list, with manual overrides.
8. **Exports** — JSON (the master file), CSV (chapters + waypoints, for spreadsheet editing), and KML (for Google Earth).
9. **Self-hosting** — two files in a directory; the viewer auto-loads its data.
10. **Viewer niceties** — on load the map frames the whole voyage when it fits, or for a voyage that wraps the globe it opens on the current chapter and the passages ahead; a chapter's info panel links out to its blog post when one is set; and `?import=yes` forces the file picker for opening a different atlas.

## Documentation

1. [FAQ & Owner's Manual](docs/voyage-atlas-faq.md) — the full reference for both tools (concepts, editor, viewer, and design principles). **Start here.**
2. [Data schema](docs/voyage-atlas-schema.md) — the JSON / CSV / KML format contract, for hand-editing data or building on the format.
3. [Changelog](CHANGELOG.md) — version history.

## A note on data correctness

The atlas shows exactly what is entered. A charted backtrack, a waypoint on land, or a leg that
overshoots a harbor is rendered faithfully and counted honestly — no second-guessing, no
silent "corrections." Accuracy of the data is the navigator's responsibility, by design.

## Contributing

Issues and feature suggestions are welcome via the issue tracker. Contributions to the code are
best raised in an issue first to discuss the change. The design rationale behind the architecture (why
chapters, the predecessor seam, the distance model) is documented for maintainers; non-trivial work
is worth a question in an issue before starting.

## License

Copyright (C) 2026 Peter Petrik

This program is free software: you can redistribute it and/or modify it under the terms of the GNU
General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
General Public License for more details.

You should have received a copy of the GNU General Public License along with this program (see the
[`LICENSE`](LICENSE) file). If not, see <https://www.gnu.org/licenses/>.
