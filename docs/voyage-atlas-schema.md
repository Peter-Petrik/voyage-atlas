# Voyage Atlas — Data Schema (v3.0)

This document defines the data contract between the **editor** (`voyage-atlas-editor.html`) and the
**viewer** (`voyage-atlas.html`). Any tool that produces data in this schema can feed the viewer; any tool
that consumes it can read editor output. The editor is the authoring surface and the source of truth;
**JSON** is the save and interchange format the viewer loads; **CSV** and **KML** are import/export
conveniences. The two tools share their core logic (dateline handling, country derivation, distance maths),
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
| `distanceOverride` | number | only when set | Replaces the recomputed total distance. Entered and shown in the selected unit, **stored in nautical miles**. Renamed from `nmOverride` in v3.0; the stored semantics are unchanged. |
| `nationsOverride` | integer | only when set | Replaces the recomputed nations count. |
| `territoriesOverride` | integer | only when set | Replaces the recomputed territories count. |

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
| `blogUrl` | string \| null | always | URL to the chapter's blog collection; `null` when blank. |
| `padMultiplier` | number | always | Distance padding factor (e.g. 1.2). |
| `waypoints` | object[] | always | Ordered waypoint list (below). |

### `chapters[].waypoints[]`

| Field | Type | Written | Description |
|-------|------|---------|-------------|
| `order` | integer | always | Position within the chapter (1-indexed, re-derived on export). |
| `name` | string | always | Waypoint name. **Empty = shaping vertex** (route geometry only, no marker). |
| `lat` | number | always | Latitude, decimal degrees. |
| `lon` | number | always | Longitude, decimal degrees. |
| `major` | boolean | always | Major provisioning/spares hub. |
| `decision` | boolean | always | Routing decision point / fork. |
| `gateway` | boolean | always | Customs entry or strategic staging port. |
| `country` | string | always | Country or territory name; empty string when blank. |
| `notes` | string | always | Free-form notes; empty string when blank. |

### Computed figures — never stored

These are **recomputed on load** by both tools from the chapters and waypoints, with overrides applied on
top, and are **never written to the file**:

1. The hero totals — total distance, chapter count, named-waypoint count (shaping vertices excluded),
   nations, and territories.
2. Each chapter's distance — base (haversine sum of its waypoints in order), padded (`base × padMultiplier`),
   and the approach leg (raw, no pad) from the predecessor chapter's last waypoint to this chapter's first.
3. Each chapter's effective country list and the voyage-wide nations/territories split.

Because none of these is stored, a hand-edited file — an added waypoint, a changed country, a removed
chapter — can never display a stale figure. (Files through v2.6 may still carry a `meta.hero` block and
per-chapter `nm`/`nmBase`/`nmApproach`; these are ignored on load.)

### Country handling

A chapter's country list is **derived on load** from its waypoints' `country` fields, in first-appearance
order, deduplicated. An optional `countriesOverride` (array) replaces the derived list for that chapter and
is written only when set. The voyage nations/territories split is the classified union of every chapter's
effective list (override where set, derived otherwise), with `nationsOverride`/`territoriesOverride` capping
the final totals.

**Nation vs territory classification:** the editor and viewer share a built-in reference list of overseas
territories (the FAQ has the full list). Each distinct country name is checked against it — a match counts
as a territory, no match as a nation. Overrides take precedence over the auto-count.

### Migration from older files

The loader reads files back to v2.5 and migrates them onto the v3.0 model:

1. **Title.** A pre-v3.0 `settings.voyageTitle` is promoted to `meta.title` if non-blank; otherwise
   `meta.title` is used, unless it is the bare `"Voyage Atlas"` constant the old editor wrote (treated as no
   title). `settings.voyageTitle` is then dropped.
2. **Distance override.** A legacy `settings.nmOverride` is read as `distanceOverride`.
3. **Calculated fields.** A stored `meta.hero` and any per-chapter `nm`/`nmBase`/`nmApproach` are ignored.
4. **Countries.** A pre-v2.8 per-chapter `countries` list is **not** promoted to an override — chapters
   start clean and derive from their waypoints.

The bundled `voyage-data.json` is a v2.7 file and loads through this path.

---

## CSV Schema

Two CSV files capture the editable state; PapaParse handles parsing and generation, including quoted
multiline cells. The CSVs are an import/export convenience — distances and other derived figures are never
included (they are recomputed on load). Import is two-step: `chapters.csv` then `waypoints.csv`.

### `chapters.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `num` | integer | yes | Chapter number (1-indexed, sequential). |
| `name` | string | yes | Display name. |
| `when` | string | yes | Time window. |
| `era` | enum | yes | `past`, `current`, or `future`. |
| `notes` | string | no | Free-form chapter notes. |
| `countries` | string | no | Per-chapter country **override** (comma-separated); blank = auto-derived from waypoints. Maps to JSON `countriesOverride`. |
| `keyDestinations` | string | no | Comma-separated key destinations. |
| `blogUrl` | string | no | Blog collection URL. |
| `padMultiplier` | number | yes | Distance padding factor (e.g. 1.2). |

### `waypoints.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `chapter` | integer | yes | Chapter number (foreign key to `chapters.csv`). |
| `order` | integer | yes | Position within the chapter (1-indexed). |
| `name` | string | no | Waypoint name. Empty = shaping vertex (no marker). |
| `lat` | number | yes | Latitude, decimal degrees. |
| `lon` | number | yes | Longitude, decimal degrees. |
| `major` | boolean | no | Major provisioning/spares hub. |
| `decision` | boolean | no | Routing decision point / fork. |
| `gateway` | boolean | no | Customs entry or strategic staging port. |
| `country` | string | no | Country or territory name. |
| `notes` | string | no | Free-form notes. |

### Waypoint rendering rules

1. Empty `name` → shaping vertex: contributes to the route line, renders no marker, and its flags are
   ignored.
2. Non-empty `name` → a marker is rendered on the map.
3. `major` → a circle, slightly larger and with a heavier stroke.
4. `decision` → a diamond marker.
5. `gateway` → a star marker.
6. The flags are independent and combinable. **On the map, a Decision diamond takes priority over a Gateway
   star when both are set**, and `major` affects size rather than shape. (KML uses the opposite icon
   priority — see the KML section.)

### Route line construction

A chapter's route line connects **all** its waypoints — shaping vertices included — in `order` sequence,
passing through every row whether or not it has a name. Dateline-crossing legs are split at the ±180°
antimeridian and drawn across three world copies, so a crossing route stays continuous at any map pan.

### Chapter endpoint convention

The last waypoint of chapter N and the first waypoint of chapter N+1 may be the same geographic point (the
transit point between chapters). The connecting leg's distance counts toward chapter N+1's total (it
captures "getting to the start point"). When the two chapters genuinely differ — a repositioning gap — the
approach leg is non-zero. The editor stores the two rows independently; the predecessor is resolved
positionally (chapter num − 1).

---

## KML Export Schema

The editor exports KML (`voyage-route.kml`, date-prefixed) for Google Earth and similar tools.

```xml
<Document>
  <name>Voyage Atlas</name>
  <!-- Four icon styles: #waypoint #major #decision #gateway -->
  <Folder>
    <name>Ch N — Chapter Name</name>
    <Placemark>                              <!-- Route line, coloured per chapter -->
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

1. **Styles.** `#waypoint` (white circle), `#major` (yellow stars), `#decision` (red diamond), `#gateway`
   (green stars), using Google's hosted paddle icons.
2. **Folders.** One per chapter, named `Ch N — Chapter Name`.
3. **Route.** One `LineString` Placemark per chapter through all coordinate-bearing waypoints; its colour is
   the chapter's palette colour (written in KML `aabbggrr` order).
4. **Waypoints.** A `Point` Placemark per **named** waypoint (shaping vertices are skipped).
5. **Icon priority.** The `styleUrl` is assigned in the order major → decision → gateway, so the **last
   applicable flag wins: gateway, then decision, then major**. This is the reverse of the on-map shape
   priority (where Decision wins), and is the one place the two presentations disagree.

---

## Future: `zones.csv` (not yet implemented)

Planned for permanent avoidance zones, restricted areas, or user-defined regions. Current PAZ data
(rectangles from the framework appendix) lives in the viewer code; `zones.csv` would externalise it.

| Column | Type | Description |
|--------|------|-------------|
| `name` | string | Zone display name. |
| `south` | float | Southern boundary latitude. |
| `west` | float | Western boundary longitude. |
| `north` | float | Northern boundary latitude. |
| `east` | float | Eastern boundary longitude. |
| `type` | string | Zone type (e.g. `avoidance`, `restricted`, `custom`). |
| `color` | string | Hex colour for rendering. |
| `opacity` | float | Fill opacity (0–1). |
