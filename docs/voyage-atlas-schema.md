# Voyage Atlas — Data Schema (v3.0)

This document defines the data contract between the **editor** (`voyage-atlas-editor.html`) and the
**viewer** (`voyage-atlas.html`). Any tool that produces data in this schema can feed the viewer; any tool
that consumes it can read editor output. The editor is the authoring surface and the source of truth;
**JSON** is the save and interchange format the viewer loads; **CSV** and **KML** are import/export
conveniences. The two tools share their core logic (dateline handling, country derivation, distance math),
so they derive identically from the same file.

---

## The v3.0 model in one paragraph

Only **source data** and **explicit overrides** are stored. Every calculated figure — the hero totals
(distance, chapters, named waypoints, nations, territories), each chapter's distance, and each chapter's
country list — is **recomputed on load** by both tools, so a hand-edited file can never show a stale number.
A chapter's countries are **auto-derived** from its waypoints, with an optional per-chapter override. The
user's voyage title lives in one place, `meta.title`. Distances are stored and exchanged in **nautical
miles**; a display-unit preference converts them for the screen only.

---

## JSON Schema (v3.0)

The editor writes this on **Save**; the viewer loads it. This is the canonical interchange format.

```json
{
  "meta": {
    "title": "Mediterranean Circuit",
    "version": "3.0",
    "generatedAt": "2026-05-31T20:00:00.000Z",
    "settings": {
      "distanceUnit": "nm",
      "distanceOverride": 81051,
      "nationsOverride": 39,
      "territoriesOverride": 15
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
  ]
}
```

### `meta`

| Field | Type | Written | Description |
|-------|------|---------|-------------|
| `title` | string | only when set | The single user voyage title — shown in page titles, the viewer header, and the editor's title field. **Omitted entirely when blank**; no default is written to the file. |
| `version` | string | always | Data-model version. v3.0 stamps `"3.0"`. |
| `generatedAt` | ISO 8601 datetime | always | When the file was written. |
| `settings` | object | always | Display preference and override values (below). |

### `meta.settings`

| Field | Type | Written | Description |
|-------|------|---------|-------------|
| `distanceUnit` | enum | always | Display unit for on-screen distances: `"nm"` (default), `"km"`, or `"mi"`. **Display-only** — every stored value and every export stays in nautical miles. |
| `distanceOverride` | number | only when set | Replaces the recomputed total distance. Entered and shown in the selected unit, **stored in nautical miles**. |
| `nationsOverride` | integer | only when set | Replaces the recomputed nations count. A whole number; 0 is a valid count. |
| `territoriesOverride` | integer | only when set | Replaces the recomputed territories count. A whole number; 0 is a valid count. |

Unset overrides are **omitted** from the file (not written as `null`); the loader treats a missing key as
unset.

### `chapters[]`

| Field | Type | Written | Description |
|-------|------|---------|-------------|
| `num` | integer | always | Chapter number (1-indexed, sequential). |
| `name` | string | always | Display name (e.g. "Med Westward"). |
| `when` | string | always | Time window (e.g. "Feb 2026 – Dec 2026"). |
| `era` | enum | always | One of `past`, `current`, `future`. |
| `notes` | string | always | Free-form chapter notes (routing, bail-out, summary). Empty string when blank. |
| `countriesOverride` | string[] | only when set and non-empty | Per-chapter country override that replaces the auto-derived list. **Omitted when empty**, in which case the chapter derives its countries from its waypoints. |
| `keyDestinations` | string[] | always | Key destinations for the chapter. |
| `blogUrl` | string \| null | always | URL to the chapter's blog collection; `null` when blank. The viewer links it only when it is an `http` or `https` address. |
| `padMultiplier` | number | always | Distance padding factor (e.g. 1.2). |
| `waypoints` | object[] | always | Ordered waypoint list (below). |

### `chapters[].waypoints[]`

| Field | Type | Written | Description |
|-------|------|---------|-------------|
| `order` | integer | always | Position within the chapter (1-indexed, re-derived on export). |
| `name` | string | always | Waypoint name. **Empty = shaping vertex** (route geometry only, no marker). |
| `lat` | number \| null | always | Latitude, decimal degrees; `null` for a row with no coordinates yet. A value of 0 (the equator) is a real coordinate. |
| `lon` | number \| null | always | Longitude, decimal degrees; `null` for a row with no coordinates yet. A value of 0 (the prime meridian) is a real coordinate. |
| `major` | boolean | always | Major provisioning/spares hub. |
| `decision` | boolean | always | Routing decision point / fork. |
| `gateway` | boolean | always | Customs entry or strategic staging port. |
| `country` | string | always | Country or territory name; empty string when blank. |
| `notes` | string | always | Free-form notes; empty string when blank. |

### Computed figures — never stored

These are **recomputed on load** by both tools from the chapters and waypoints, with overrides applied on
top, and are **never written to the file**:

1. The hero totals — total distance, chapter count, named-waypoint count (shaping vertices excluded), nations, and territories.
2. Each chapter's distance — base (haversine sum of its waypoints in order), padded (`base × padMultiplier`), and the approach leg (raw, no pad) from the predecessor chapter's last waypoint to this chapter's first.
3. Each chapter's effective country list and the voyage-wide nations/territories split.

Because none of these is stored, a hand-edited file — an added waypoint, a changed country, a removed
chapter — can never display a stale figure.

### Reading a hand-edited file

Both tools read a voyage file through the same shared code, so one file gives the same chapters, flags and
figures in each. A file is refused, and the voyage already open stays as it was, when it has no `chapters`
array or holds a chapter or waypoint that is not an object. Otherwise these corrections are made on load;
the file itself is not changed until it is saved again, and the editor's status bar lists them:

1. **Chapter numbers.** Chapters are sorted by `num` and renumbered 1 to n. A gap, a repeat or a missing number
   is corrected; chapters with the same number keep their order in the file, and a chapter with no readable
   number (or 0) stays after the chapter before it in the file.
2. **Coordinates.** A `lat` beyond ±90 is read as `null`, so the waypoint has no coordinates. A `lon` outside
   -180 to 180 (a 0-360 file, or 190 for -170) is brought into the range from -180 to just under 180, so 180
   itself reads as -180, the same meridian. A coordinate written as text is read
   only when the whole text is a number (`"38.53"`, not `"38,53"` or `"12abc"`).
3. **Text and flags.** A number or `true`/`false` in a text field is read as its text; any other value (an
   object, a list) reads as empty. A flag is true only for `true`, `"true"`, `"1"` or `"yes"`, in any case.
4. **Era and padding.** `era` is matched case-insensitively and reads as `future` when unrecognized. A missing or
   unreadable `padMultiplier`, or one below 1, reads as 1.2: padding adds sailing distance, and the editor refuses a
   typed value below 1 by the same rule.
5. **Lists.** `countriesOverride` and `keyDestinations` are also read from text (split as in the CSV), with
   spaces and commas trimmed from the ends of each entry.

### Country handling

A chapter's country list is **derived on load** from its waypoints' `country` fields, in first-appearance
order, deduplicated. An optional `countriesOverride` (array) replaces the derived list for that chapter and
is written only when set. The voyage nations/territories split is the classified union of every chapter's
effective list (override where set, derived otherwise), with `nationsOverride`/`territoriesOverride` capping
the final totals.

**Nation vs territory classification:** the editor and viewer share a built-in reference list of overseas
territories (the FAQ has the full list). Each distinct country name is checked against it — a match counts
as a territory, no match as a nation. Overrides take precedence over the auto-count.

### `paz` (avoidance zones)

An optional top-level `paz` array holds permanent avoidance zones, which the viewer draws as dashed rectangles in every world copy, with the zone name and "Permanent avoidance zone" in each popup, under its **Avoidance zones** layer toggle (off by default).

| Field | Type | Description |
|-------|------|-------------|
| `zone` | string | Zone display name. |
| `bounds` | number[4] | `[south, west, north, east]`, decimal degrees. |

The array is hand-authored: the editor neither reads nor writes it, so a voyage loaded into the editor and saved again loses its zones. Authoring zones in the editor, as polygons, is backlog item #43.

---

## CSV Schema

Two CSV files capture the editable state; PapaParse handles parsing and generation, including quoted
multiline cells. The CSVs are an import/export convenience — distances and other derived figures are never
included (they are recomputed on load). Import is two-step: `chapters.csv` then `waypoints.csv`.

1. **Required columns.** A chapters file without `num` and `name` columns, or with no row holding a chapter
   number, is refused; so is a waypoints file without `chapter`, `name`, `lat` and `lon` columns. Nothing is
   replaced until both files are read, and a pair that yields no chapters is refused. Waypoint rows whose
   `chapter` matches no chapter are skipped and counted in the status bar. When a chapter number repeats,
   that number's waypoints join the first chapter with it, and the repeat is counted.
2. **Delimiter and decimal commas.** The delimiter is detected. The number columns (`num`, `padMultiplier`,
   `chapter`, `order`, `lat`, `lon`) read a decimal comma as a point, whatever the delimiter; a number that
   still cannot be read is left empty and counted in the status bar.
3. **Encoding.** UTF-8 (with or without a byte-order mark) and UTF-16 with a byte-order mark are read; a file
   with no byte-order mark that is not valid UTF-8 is read as Windows-1252.
4. **Formula guard.** A text cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return is written with
   a leading `'`, so a spreadsheet shows it as text, and so is text that starts with apostrophes before one of
   those characters; on import one leading `'` is removed from such a cell. Number cells, including negative
   coordinates, are written as they are.
5. Chapters are renumbered 1 to n on import, as a voyage file is (above).

### `chapters.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `num` | integer | yes | Chapter number (1-indexed, sequential). |
| `name` | string | yes | Display name. |
| `when` | string | no | Time window. |
| `era` | enum | no | `past`, `current`, or `future`; `future` when blank. |
| `notes` | string | no | Free-form chapter notes. |
| `countries` | string | no | Per-chapter country **override**, entries separated by semicolons; blank = auto-derived from waypoints. Maps to JSON `countriesOverride`. |
| `keyDestinations` | string | no | Key destinations, entries separated by semicolons. |
| `blogUrl` | string | no | Blog collection URL. |
| `padMultiplier` | number | no | Distance padding factor (e.g. 1.2); 1.2 when blank. |

The Required column names the columns an import needs in the file; the editor writes every column.

Both list columns are written with `; ` between entries, so an entry may contain a comma; a single entry that contains a comma is written with a trailing `;` so it reads back as one entry. On import, a value containing a semicolon is split at semicolons only; a value without one is split at commas, which reads CSVs written before the separator changed, and the territory names that contain commas ("Bonaire, Sint Eustatius and Saba", "Saint Helena, Ascension and Tristan da Cunha") are kept whole. An entry cannot contain a semicolon.

### `waypoints.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `chapter` | integer | yes | Chapter number (foreign key to `chapters.csv`). |
| `order` | integer | no | Position within the chapter (1-indexed). Written for reference; import takes the row order. |
| `name` | string | yes | Waypoint name. Empty = shaping vertex (no marker); the column is required, a value is not. |
| `lat` | number | yes | Latitude, decimal degrees. |
| `lon` | number | yes | Longitude, decimal degrees. |
| `major` | boolean | no | Major provisioning/spares hub. |
| `decision` | boolean | no | Routing decision point / fork. |
| `gateway` | boolean | no | Customs entry or strategic staging port. |
| `country` | string | no | Country or territory name. |
| `notes` | string | no | Free-form notes. |

### Waypoint rendering rules

1. Empty `name` → shaping vertex: contributes to the route line, renders no marker, and its flags are ignored.
2. Non-empty `name` → a marker is rendered on the chart.
3. `major` → a circle, slightly larger and with a heavier stroke.
4. `gateway` → a star marker.
5. `decision` → a diamond marker.
6. The flags are independent and combinable. The editor columns are shown in the order M, G, D — ascending emphasis priority, Major lowest and Decision highest. **On the chart, when more than one flag is set the highest-priority flag wins the marker shape: a Decision diamond over a Gateway star**, while `major` affects size rather than shape. KML export uses the same priority (see the KML section).

### Route line construction

A chapter's route line connects **all** its waypoints — shaping vertices included — in `order` sequence,
passing through every row whether or not it has a name. Dateline-crossing legs are split at the ±180°
antimeridian and drawn across three world copies, so a crossing route stays continuous at any chart pan.

### Chapter endpoint convention

The last waypoint of chapter N and the first waypoint of chapter N+1 may be the same geographic point (the
transit point between chapters). The connecting leg's distance counts toward chapter N+1's total (it
captures "getting to the start point"). When the two chapters genuinely differ — a repositioning gap — the
approach leg is non-zero. The editor stores the two rows independently; the predecessor is the nearest
earlier chapter, by number, that has coordinates, so a chapter with no waypoints yet is skipped.

---

## KML Export Schema

The editor exports KML (`voyage-route.kml`, date-prefixed) for Google Earth and similar tools.

```xml
<Document>
  <name>Voyage Title</name>                  <!-- meta.title, or "Voyage Atlas" when blank -->
  <!-- Four icon styles: #waypoint #major #decision #gateway -->
  <Folder>
    <name>Ch N — Chapter Name</name>
    <Placemark>                              <!-- Route line, colored per chapter -->
      <LineString><coordinates>lon,lat,0 ...</coordinates></LineString>
    </Placemark>
    <Placemark>                              <!-- One per named waypoint -->
      <name>Waypoint Name</name>
      <styleUrl>#waypoint | #major | #decision | #gateway</styleUrl>
      <Point><coordinates>lon,lat,0</coordinates></Point>
    </Placemark>
  </Folder>
</Document>
```

1. **Styles.** `#waypoint` (white circle), `#major` (yellow stars), `#decision` (red diamond), `#gateway` (green stars), using Google's hosted paddle icons.
2. **Folders.** One per chapter, named `Ch N — Chapter Name`. The document is named for the voyage title.
   Control characters that XML 1.0 forbids (such as a vertical tab pasted from a spreadsheet cell) are dropped
   from every name, so the file stays well-formed.
3. **Route.** One `LineString` Placemark per chapter through all coordinate-bearing waypoints; its color is the chapter's palette color (written in KML `aabbggrr` order).
4. **Waypoints.** A `Point` Placemark per **named** waypoint (shaping vertices are skipped).
5. **Icon priority.** The `styleUrl` is assigned in the order major → gateway → decision, so the **last applicable flag wins: decision, then gateway, then major**, the same priority as the on-chart shape (where Decision wins).

---

## Future: `zones.csv` (not yet implemented)

Planned for permanent avoidance zones, restricted areas, or user-defined regions. Avoidance zones are
read today from the voyage file's hand-authored `paz` array (see above). The columns below predate backlog
item #43, which moves zone authoring to polygons, so this layout is provisional.

| Column | Type | Description |
|--------|------|-------------|
| `name` | string | Zone display name. |
| `south` | float | Southern boundary latitude. |
| `west` | float | Western boundary longitude. |
| `north` | float | Northern boundary latitude. |
| `east` | float | Eastern boundary longitude. |
| `type` | string | Zone type (e.g. `avoidance`, `restricted`, `custom`). |
| `color` | string | Hex color for rendering. |
| `opacity` | float | Fill opacity (0–1). |
