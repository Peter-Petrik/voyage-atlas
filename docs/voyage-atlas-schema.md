# Voyage Atlas — Data Schema (data model 3.0)

This document defines the data contract between the **editor** (`voyage-atlas-editor.html`) and the **viewer** (`voyage-atlas.html`). Any tool that produces data in this schema can feed the viewer; any tool that consumes it can read editor output. The editor is the authoring surface and the source of truth; the **voyage file** (JSON) is the save and interchange format the viewer loads; **CSV** is an import and export convenience for spreadsheets, **KML** an export for Google Earth, and **GPX** an import and export for chartplotters and navigation apps. The two tools share their core logic (file reading, dateline handling, country derivation, distance math), so they read and derive identically from the same file.

---

## The data model in one paragraph

Only **source data** and **explicit overrides** are stored. Every calculated figure — the header stats (distance, nations, territories, chapters and named waypoints), each chapter's distance and each chapter's country list — is **recomputed on load** by both tools, so a hand-edited file can never show a stale number. A chapter's countries are **auto-derived** from its waypoints, with an optional per-chapter override. The user's voyage title lives in one place, `meta.title`. Distances are stored and exchanged in **nautical miles**; a display-unit preference converts them for the screen only.

---

## Voyage file (JSON)

The editor writes this on **Save**; the viewer loads it. This is the canonical interchange format.

```json
{
  "meta": {
    "title": "Mediterranean Circuit",
    "version": "3.0",
    "generatedAt": "2026-05-31T20:00:00.000Z",
    "settings": {
      "distanceOverride": 81051,
      "nationsOverride": 39,
      "territoriesOverride": 15,
      "distanceUnit": "nm"
    }
  },
  "chapters": [
    {
      "num": 1,
      "name": "Med Westward",
      "when": "Feb 2026 – Dec 2026",
      "era": "current",
      "notes": "Free-form chapter notes (routing, bail-out, summary).",
      "countriesOverride": ["Greece", "Italy"],
      "keyDestinations": ["Athens", "Sicily"],
      "blogUrl": "https://example.com/med-westward",
      "padMultiplier": 1.2,
      "waypoints": [
        {
          "order": 1,
          "name": "Kos",
          "lat": 36.893,
          "lon": 27.288,
          "major": false,
          "decision": false,
          "gateway": true,
          "country": "Greece",
          "notes": ""
        }
      ]
    }
  ],
  "paz": [
    {
      "zone": "Example zone",
      "bounds": [12, 43, 15, 51]
    }
  ]
}
```

### Top-level fields

| Field | Type | Written | Description |
|-------|------|---------|-------------|
| `meta` | object | always | Title, data-model version, time written and settings (below). |
| `chapters` | object[] | always | The chapters, in voyage order (below). |
| `paz` | object[] | only when the voyage has zones | Permanent avoidance zones (below). |

### `meta`

| Field | Type | Written | Description |
|-------|------|---------|-------------|
| `title` | string | only when set | The single user voyage title, shown in both tools' headers and page titles, used as the name of the KML document and of the GPX file and edited in the editor's Voyage Settings (Voyage Title). Read with spaces trimmed from its ends, so a title of only spaces is no title. **Omitted entirely when blank**; no default is written to the file. |
| `version` | string | always | The data-model version, `"3.0"`. It changes only when the file format changes, not with each release of the tools. |
| `generatedAt` | ISO 8601 datetime | always | When the file was written. |
| `settings` | object | always | Override values and the display unit (below). |

### `meta.settings`

| Field | Type | Written | Description |
|-------|------|---------|-------------|
| `distanceOverride` | number | only when set | Replaces the recomputed total distance. Entered and shown in the selected unit, **stored in nautical miles**. |
| `nationsOverride` | integer | only when set | Replaces the recomputed nations count. A whole number; 0 is a valid count. |
| `territoriesOverride` | integer | only when set | Replaces the recomputed territories count. A whole number; 0 is a valid count. |
| `distanceUnit` | enum | always | Display unit for distances: `"nm"` (default), `"km"` or `"mi"`, read in any case; any other value reads as `"nm"`. **Display-only** — every stored value stays in nautical miles. |

The fields are listed in the order the editor writes them; the Voyage Settings panel shows Distance Units first, then the Distance Override, Nations and Territories.

Unset overrides are **omitted** from the file (not written as `null`); the loader treats a missing key as unset. An override is read only when the whole value is a number (`"12abc"` is unset); a distance only when it is above 0, and a count only when it is a whole number of 0 or more. Anything else reads as unset.

### `chapters[]`

| Field | Type | Written | Description |
|-------|------|---------|-------------|
| `num` | integer | always | Chapter number (1-indexed, sequential). |
| `name` | string | always | Display name (e.g. "Med Westward"). |
| `when` | string | always | When (season window), as free text. The editor's When dropdowns write "Mon YYYY – Mon YYYY" with an en dash, leave out a part left blank ("May – Sep 2028") and write a season that starts and ends on the same month and year once ("May 2034"); the FAQ describes the forms read back. |
| `era` | enum | always | One of `past`, `current`, `future`. Both tools draw a `future` chapter's route dashed and the others solid. |
| `notes` | string | always | Free-form chapter notes (routing, bail-out, summary). Empty string when blank. |
| `countriesOverride` | string[] | only when set and non-empty | Per-chapter country override that replaces the auto-derived list. **Omitted when empty**, in which case the chapter derives its countries from its waypoints. |
| `keyDestinations` | string[] | always | Key destinations for the chapter. |
| `blogUrl` | string \| null | always | Link to the blog posts covering this chapter; `null` when blank. The viewer links it only when it is a full `http` or `https` address; the editor adds `https://` to an address typed without a scheme. |
| `padMultiplier` | number | always | Distance padding factor, 1 or more (e.g. 1.2); the editor's default is 1.2. |
| `waypoints` | object[] | always | Ordered waypoint list (below). |

The fields are listed in the order the editor writes them. The editor's chapter form shows them as Name, Era, When, Pad Multiplier, Blog URL, Notes, Countries / Territories (`countriesOverride`) and Key Destinations.

### `chapters[].waypoints[]`

| Field | Type | Written | Description |
|-------|------|---------|-------------|
| `order` | integer | always | The row's position in the chapter, 1-indexed, written on every save. It is not read back: the array order is the route order. |
| `name` | string | always | Waypoint name. **Empty, or only spaces = shaping vertex**: route geometry only, with no marker in the viewer or the KML (a GPX export writes it as a route point without a name) and a small gray dot in the editor's selected chapter; its flags are ignored. |
| `lat` | number \| null | always | Latitude, decimal degrees; `null` for a row with no coordinates yet. A value of 0 (the equator) is a real coordinate. |
| `lon` | number \| null | always | Longitude, decimal degrees; `null` for a row with no coordinates yet. A value of 0 (the prime meridian) is a real coordinate. |
| `major` | boolean | always | Provisioning hub, spares, repairs or an extended stay. |
| `decision` | boolean | always | Routing fork or go/no-go point. |
| `gateway` | boolean | always | Customs entry or strategic staging port. |
| `country` | string | always | Country or territory name; empty string when blank. |
| `notes` | string | always | Free-form notes; empty string when blank. |

The flags are written `major`, `decision`, `gateway`; the editor's waypoint table shows them as M, G, D (Gateway before Decision).

### `paz` (avoidance zones)

An optional top-level `paz` array holds permanent avoidance zones, which the viewer draws as dashed rectangles in every world copy, with the zone name and "Permanent avoidance zone" in each popup, under its **Avoidance zones** layer toggle (off by default).

| Field | Type | Description |
|-------|------|-------------|
| `zone` | string | Zone display name. |
| `bounds` | number[4] | `[south, west, north, east]`, decimal degrees. A zone across the dateline has a `west` greater than its `east` (`[-20, 170, -10, -170]` spans 20° across 180°). |

The array is hand-authored: the editor neither draws nor edits zones, but keeps them, so a voyage loaded and saved again keeps each zone's `zone` name (when it has one) and `bounds`; any other field of a zone is named in the status bar and not kept. The array is written only when it holds a zone. Both tools read a zone only when `bounds` holds four finite numbers, written as numbers, not text; any other zone, or a `paz` that is not a list, is left out and counted in the editor's status bar. Authoring zones in the editor, as polygons, was backlog item #43, closed in October 2026.

### Computed figures — never stored

These are **recomputed on load** by both tools from the chapters and waypoints, with overrides applied on top, and are **never written to the file**:

1. The header stats, in the order the header shows them: total distance, nations, territories, chapter count and waypoint count: named waypoints with coordinates, with a handoff point shared by two chapters (both named, the gap rounding to 0 nm) counted once. Shaping vertices are excluded; the editor also shows a count of them.
2. Each chapter's distance — base (the haversine sum of the legs between its waypoints that have coordinates, in file order), padded (`base × padMultiplier`) and the approach leg (raw, no pad) from the predecessor chapter's last waypoint to this chapter's first.
3. Each chapter's effective country list and the voyage-wide nations/territories split.

Because none of these is stored, a hand-edited file — an added waypoint, a changed country, a removed chapter — can never display a stale figure.

### Reading a hand-edited file

Both tools read a voyage file through the same shared code, so one file gives the same chapters, flags and figures in each. A file is refused, and the voyage already open stays as it was, when it has no `chapters` array, holds a chapter or waypoint that is not an object or has a chapter whose `waypoints` is present but not a list. Otherwise these corrections are made on load, in the order the file is read; the file itself is not changed until it is saved again, and the editor's status bar lists them:

1. **Encoding.** A file is read as UTF-8, with or without a byte-order mark, or as UTF-16 with one; a file with no byte-order mark that is not valid UTF-8 is read as Windows-1252, as a CSV file is, and the editor's status bar says so.
2. **Version and fields not known.** A file whose `meta.version` names a data model newer than 3.0 is read as far as these fields go, and the editor's status bar says so. A field not listed in this schema, at any level, is named in the status bar (the first five, with a count of any more), since a save leaves it out. Fields of older files that are folded in or recomputed (`routing`, `bailout` and `prose`, folded into a chapter's `notes` when it has none; `meta.hero` and the chapter `nm`, `nmBase` and `nmApproach`; the chapter `countries` list from before overrides) are not named, except `routing`, `bailout` and `prose` in a chapter whose own `notes` take their place. A version is read as a major and an optional minor number, with or without a leading `v`.
3. **Chapter numbers.** Chapters are sorted by `num` and renumbered 1 to n. A gap, a repeat or a missing number is corrected; chapters with the same number keep their order in the file, and a chapter with no readable number (0 or less, a fraction or text such as `"3abc"`) stays after the chapter before it in the file.
4. **Coordinates.** A `lat` beyond ±90 is read as `null`, so the waypoint has no coordinates. A `lon` outside -180 to 180 (a 0-360 file, or 190 for -170) is brought into the range from -180 to just under 180, so 180 itself reads as -180, the same meridian; no longitude is read as 180. A coordinate written as text is read only when the whole text is a number (`"38.53"`, not `"38,53"` or `"12abc"`); one that is present but cannot be read is left empty and counted in the editor's status bar.
5. **Text and flags.** A number or `true`/`false` in a text field is read as its text; any other value (an object, a list) reads as empty. A flag is true for `true` or `1`, or for the text `true`, `1` or `yes` in any case, with spaces at the ends ignored; anything else is false.
6. **Era and padding.** `era` is matched case-insensitively and reads as `future` when unrecognized. A missing or unreadable `padMultiplier`, or one below 1, reads as 1.2: padding adds sailing distance, and the editor refuses a typed value below 1 by the same rule. An unreadable `padMultiplier` is counted in the status bar.
7. **Lists.** `countriesOverride` and `keyDestinations` are read as a list or, in a hand-edited file, as text split as in the CSV. Spaces and commas are trimmed from the ends of each entry and empty entries dropped, and a territory name with commas that an earlier version saved as separate entries ("Bonaire", "Sint Eustatius and Saba") is joined back up. Any other value reads as an empty list.

### Country handling

A chapter's country list is **derived on load** from its waypoints' `country` fields, in first-appearance order, deduplicated. An optional `countriesOverride` (array) replaces the derived list for that chapter and is written only when set. The voyage nations/territories split is the classified union of every chapter's effective list (override where set, derived otherwise), with `nationsOverride` and `territoriesOverride`, when set, replacing the final counts.

**Nation vs territory classification:** each distinct country name is counted as a territory when it matches the built-in reference list and as a nation otherwise; the FAQ ("How are nations and territories counted?") gives the list and the matching rules. The stored `country` values are not changed. Overrides take precedence over the counts.

---

## How the data is drawn and measured

These rules apply to the voyage file and to every import and export.

### Waypoint rendering rules

1. A `name` that is empty or only spaces → shaping vertex: it contributes to the route line and renders no marker in the viewer or the KML (a GPX export writes it as a route point without a name), and its flags are ignored; in the editor's selected chapter it shows as a small gray dot, its drag handle.
2. Any other `name`, on a waypoint with coordinates → a marker is drawn on the chart. A row without coordinates draws nothing.
3. `major` → a circle, slightly larger and with a heavier stroke.
4. `gateway` → a star marker.
5. `decision` → a diamond marker.
6. The flags are independent and combinable; the FAQ describes how they combine on the chart. In the viewer the diamond and the star sit on their own layers, Decision points and Gateway ports, both off by default, and are drawn over the waypoint's circle; with both layers on, the diamond is drawn on top. In the editor the shapes show for the selected chapter only.

### Route line construction

A chapter's route line connects its waypoints that have coordinates, shaping vertices included, in the order they appear in the `waypoints` array. The `order` field is not read; each save renumbers it from the array. Dateline-crossing legs are split at the ±180° antimeridian and drawn across three world copies, so a crossing route stays continuous at any chart pan. A chapter whose `era` is `future` is drawn dashed, in both tools; a past or current chapter is solid. Each leg is drawn as a straight line on the chart's Mercator projection (a rhumb line), while distances are measured along the great circle (see Computed figures), so on a long east-west passage the line drawn is the longer of the two. The chart covers latitudes to about ±85.05°, the limit of its projection: a waypoint between there and ±90° is kept and measured, but drawn at the chart's edge, and no view frames it. A chapter with fewer than two waypoints that have coordinates has no route line. A single named point is still drawn as a marker, and in the viewer the chapter opens framed on it; a chapter with no line and no named point shows "No route" in the viewer.

### Chapter endpoint convention

The last waypoint of chapter N and the first waypoint of chapter N+1 may be the same geographic point (the transit point between chapters). The approach leg's distance counts toward chapter N+1's total (it captures "getting to the start point"). When the two chapters genuinely differ — a repositioning gap — the approach leg is non-zero. The editor stores the two rows independently; the predecessor is the nearest earlier chapter, by number, that has coordinates, so a chapter with no waypoints yet, or none with coordinates, is skipped.

---

## CSV Schema

Two CSV files hold the chapters and their waypoints. They leave out the voyage title, the distance unit, the three overrides and any avoidance zones, so an imported CSV pair starts with no title, nautical miles, no overrides and no zones. PapaParse handles parsing and generation, including quoted multiline cells. Distances and other derived figures are never included (they are recomputed on load). The editor writes them as `chapters.csv` and `waypoints.csv`, each with the date and time in front. Import is two-step: the chapters file, then the waypoints file.

1. **Required columns.** A chapters file without `num` and `name` columns, or with no row holding a chapter number, is refused; so is a waypoints file without `chapter`, `name`, `lat` and `lon` columns. Nothing is replaced until both files are read, and a pair that yields no chapters is refused. Waypoint rows whose `chapter` matches no chapter are skipped and counted in the status bar. When a chapter number repeats, both chapters are kept, numbered in turn; the waypoints with that number all join the first, and the repeat is counted. A chapter row whose `num` is not a whole number is kept, after the chapter before it, as in a voyage file, and counted; no waypoint row can name it. A waypoint row with more cells than the header is skipped and counted, since its values would land in the wrong columns; a chapter row with more cells keeps only `num` and `name`, and is counted.
2. **Delimiter and decimal commas.** The delimiter is detected. The number columns (`padMultiplier`, `chapter`, `order`, `lat`, `lon`) read a decimal comma as a point, whatever the delimiter. A number that still cannot be read is counted in the status bar: a coordinate is left empty, a pad multiplier reads as 1.2, and a waypoint row whose `chapter` cannot be read is skipped. An unreadable `order` is counted too, though the column is not read. Coordinates in a CSV are read as in a voyage file, in decimal degrees only. A hemisphere letter or degrees and minutes ("38.53S", "16°30'W"), which the waypoint table and Paste accept, is not read in a CSV: such a cell is left empty and counted.
3. **Encoding.** Both files are written as UTF-8 with a byte-order mark. UTF-8 (with or without a byte-order mark) and UTF-16 with a byte-order mark are read; a file with no byte-order mark that is not valid UTF-8 is read as Windows-1252.
4. **Blank rows.** A row whose cells are all empty or only spaces is skipped in both files.
5. **Formula guard.** A text cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return is written with a leading `'`, and so is text that starts with apostrophes before one of those characters; on import one leading `'` is removed from such a cell. Number cells, including negative coordinates, are written as they are.
6. Chapters are renumbered 1 to n on import, as a voyage file is (above).

### `chapters.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `num` | integer | yes | Chapter number (1-indexed, sequential). |
| `name` | string | yes | Display name. |
| `when` | string | no | When (season window). |
| `era` | enum | no | `past`, `current` or `future`; `future` when blank or not one of the three. |
| `notes` | string | no | Free-form chapter notes. |
| `countries` | string | no | Per-chapter country **override**, entries separated by semicolons; blank = auto-derived from waypoints. Read and written as `countriesOverride` in the voyage file. |
| `keyDestinations` | string | no | Key destinations, entries separated by semicolons. |
| `blogUrl` | string | no | Link to the blog posts covering this chapter. |
| `padMultiplier` | number | no | Distance padding factor (e.g. 1.2); 1.2 when blank, unreadable or below 1. |

The Required column names the columns an import needs in the file; the editor writes every column, and the header row even when the file has no rows.

Both list columns are written with `; ` between entries, so an entry may contain a comma; a single entry that contains a comma is written with a trailing `;` so it reads back as one entry. On import, a value containing a semicolon is split at semicolons only; a value without one is split at commas, which reads CSVs written before the separator changed, and the territory names that contain commas ("Bonaire, Sint Eustatius and Saba", "Saint Helena, Ascension and Tristan da Cunha") are kept whole. An entry cannot contain a semicolon.

### `waypoints.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `chapter` | integer | yes | Chapter number (foreign key to `chapters.csv`). |
| `order` | integer | no | Position within the chapter (1-indexed). Written for reference; import takes the row order. |
| `name` | string | yes | Waypoint name. Empty or only spaces = shaping vertex (see Waypoint rendering rules); the column is required, a value is not. |
| `lat` | number | yes | Latitude, decimal degrees. The column is required; an empty value leaves the row without coordinates. |
| `lon` | number | yes | Longitude, decimal degrees. The column is required; an empty value leaves the row without coordinates. |
| `major` | boolean | no | Provisioning hub, spares, repairs or an extended stay. |
| `decision` | boolean | no | Routing fork or go/no-go point. |
| `gateway` | boolean | no | Customs entry or strategic staging port. |
| `country` | string | no | Country or territory name. |
| `notes` | string | no | Free-form notes. |

---

## KML Export Schema

The editor exports KML for Google Earth and similar tools, as `voyage-route.kml` with the date and time in front (`2026-10-23-14-05-voyage-route.kml`).

```xml
<Document>
  <name>Voyage Title</name>                  <!-- meta.title, or "Voyage Atlas" when blank -->
  <description>Exported from Voyage Atlas</description>
  <!-- Four icon styles: #waypoint #major #decision #gateway -->
  <Folder>
    <name>Ch N — Chapter Name</name>
    <Placemark>                              <!-- Route line, colored per chapter -->
      <name>Chapter Name route</name>
      <LineString><coordinates>lon,lat,0 ...</coordinates></LineString>
    </Placemark>
    <Placemark>                              <!-- One per named waypoint with coordinates -->
      <name>Waypoint Name</name>
      <styleUrl>#waypoint | #major | #decision | #gateway</styleUrl>
      <Point><coordinates>lon,lat,0</coordinates></Point>
    </Placemark>
  </Folder>
</Document>
```

1. **Styles.** `#waypoint` (white circle), `#major` (yellow circle), `#decision` (red diamond), `#gateway` (green stars), using Google's hosted paddle icons.
2. **Folders.** One per chapter, named `Ch N — Chapter Name`. The document is named for the voyage title. Control characters that XML 1.0 forbids (such as a vertical tab pasted from a spreadsheet cell) are dropped from every name, so the file stays well-formed.
3. **Route.** One `LineString` Placemark per chapter, named for the chapter, through its waypoints that have coordinates, written when there are at least two; its color is the chapter's palette color (written in KML `aabbggrr` order).
4. **Waypoints.** A `Point` Placemark per **named** waypoint with coordinates (shaping vertices are skipped).
5. **Coordinates.** Written in plain decimals, up to nine places, never in exponent form.
6. **Icon priority.** The `styleUrl` is assigned in the order major → gateway → decision, so the **last applicable flag wins: decision, then gateway, then major**, the same priority as the on-chart shape (where Decision wins).
7. **Contents.** KML carries the voyage title, the chapter and waypoint names, positions, route colors and the flag icon only: no notes, countries, era, When, key destinations, other settings or avoidance zones, so it does not load back as the same voyage.

---

## GPX Export and Import Schema

The editor exports GPX 1.1 for chartplotters and navigation apps, as `voyage-route.gpx` with the date and time in front (`2026-10-23-14-05-voyage-route.gpx`), and imports GPX 1.1 and 1.0.

```xml
<gpx version="1.1" creator="Voyage Atlas" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Voyage Title</name><desc>Exported from Voyage Atlas</desc></metadata>
  <wpt lat="36.9" lon="27.3">                <!-- One per named waypoint with coordinates -->
    <name>Waypoint Name</name>
    <desc>Notes</desc>                        <!-- When the waypoint has notes -->
    <type>Major, Decision, Gateway</type>     <!-- The flags it carries, when any -->
  </wpt>
  <rte>                                      <!-- One per chapter with coordinates -->
    <name>Ch N — Chapter Name</name>
    <number>N</number>
    <rtept lat="36.9" lon="27.3"><name>Waypoint Name</name></rtept>
    <rtept lat="36.95" lon="27.5"/>          <!-- A shaping vertex: no name -->
  </rte>
</gpx>
```

1. **Waypoints.** A `wpt` per named waypoint with coordinates, in chapter order, written once where the same point (name, position, notes and flags) appears more than once in the voyage, as where one chapter hands off to the next.
2. **Routes.** A `rte` per chapter with at least one point with coordinates, named `Ch N — Chapter Name` and numbered with the chapter number, through every point with coordinates in table order, shaping vertices included as route points without a name. A named route point carries the waypoint's name, notes and flags as its `wpt` does; a shaping vertex carries its notes when it has any.
3. **Text.** Names and notes are escaped for XML, and characters XML 1.0 forbids are dropped, as in the KML. The title is `meta.title`, or "Voyage Atlas" when blank.
4. **Coordinates.** Written in plain decimals, up to nine places, with longitudes from -180 up to but not including 180 (a value that rounds to 180 is written as -180, the same meridian).
5. **Contents.** GPX carries the title, the chapter and waypoint names, every point with coordinates, notes and flags: no countries, era, When, key destinations, chapter notes, settings or avoidance zones, so it does not load back as the same voyage.

**Import.** Elements are read by their local name, so a GPX 1.0 file or one written with a prefix reads the same.

1. **Read.** Every `trk` (its `trkseg` segments joined in order, then any `trkpt` written outside a segment), `rte` (`rtept` points) and `wpt` with a name; space before the XML declaration is ignored. A point needs a `lat` from -90 to 90 and a `lon`, written as numbers; a longitude outside -180 to 180 is brought into it, and any other point is skipped and counted. Coordinates are rounded to five decimal places. A track or route with no usable point is left out.
2. **Points.** A track point becomes a shaping vertex. A route point and a waypoint keep their `name`, their `desc` (else their `cmt`) as notes and their `type` as flags: the words Major, Decision and Gateway, in any case and order, set the matching flags. Time, elevation and the other GPX fields are not read.
3. **Thinning.** A track is thinned at the tolerance the import dialog's Track detail sets, from 10 nm (Simple) to 0.01 nm (Detailed): Douglas–Peucker on great-circle legs, so a point within the tolerance of the leg that replaces it is dropped; the first and last points are kept. Routes are not thinned.
4. **Waypoints along the route.** A waypoint the same as a named point of the chosen tracks and routes, or as an earlier waypoint (the same name in any case, the same notes and flags, within 0.05 nm), is already there and is left out. Otherwise a waypoint within 0.05 nm of a point with the same name adds its flags to the nearest such point, and its notes when the point has none; failing that, one within 0.05 nm of a point with no name gives the nearest such point its name, notes and flags. Any other is placed between the two points of the leg it lies nearest to, or before the first or after the last point, in order along the route. With no track or route chosen, the waypoints make the chapter in file order.
5. **Chapters.** The chosen tracks and routes are joined in file order into one chapter, or made one chapter each, and are added at the end of the voyage with the defaults of a new chapter, named after the track or route (less a leading `Ch N — `) or after the file's `metadata` name or file name, with its place in the list after it when one without a name is made a chapter of its own; or they replace the selected chapter's rows, keeping its other fields. No country is looked up.

---

## `zones.csv` (not implemented)

A proposed layout for permanent avoidance zones, restricted areas or user-defined regions, kept with backlog item #43, which was closed in October 2026. Avoidance zones are read today from the voyage file's hand-authored `paz` array (see above). The columns below predate #43's move of zone authoring to polygons, so this layout is provisional.

| Column | Type | Description |
|--------|------|-------------|
| `zone` | string | Zone display name (`zone` in the voyage file). |
| `south` | float | Southern boundary latitude. |
| `west` | float | Western boundary longitude. |
| `north` | float | Northern boundary latitude. |
| `east` | float | Eastern boundary longitude. |
| `type` | string | Zone type (e.g. `avoidance`, `restricted`, `custom`). |
| `color` | string | Hex color for rendering. |
| `opacity` | float | Fill opacity (0–1). |
