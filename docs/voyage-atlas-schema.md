# Voyage Atlas — Data Schema (v2.7)

This document defines the data contract between the **editor** (`voyage-atlas-editor.html`) and the
**viewer** (`voyage-atlas.html`). Any tool that produces data in this schema can feed the
viewer; any tool that consumes this schema can read editor output.

---

## CSV Schema

Two CSV files capture the complete state. PapaParse handles parsing/generation, including
quoted multiline cells.

### `chapters.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `num` | integer | yes | Chapter number (1-indexed, sequential) |
| `name` | string | yes | Display name (e.g., "Med Westward") |
| `when` | string | yes | Time window (e.g., "Feb 2026 – Dec 2026") |
| `era` | enum | yes | One of: `past`, `current`, `future` |
| `notes` | string | no | Free-form chapter notes (routing, bail-out options, summary, etc.) |
| `countries` | string | no | Per-chapter country **override** (comma-separated); blank = auto-derived from waypoint countries |
| `keyDestinations` | string | no | Comma-separated list of key destinations |
| `blogUrl` | string | no | URL to blog post collection for this chapter |
| `padMultiplier` | float | yes | nm padding factor (default 1.20) |

**Derived values (not stored in CSV, computed at runtime):**
- `nmBase` = haversine sum of all chapter waypoints in order (nautical miles)
- `nm` = `nmBase × padMultiplier`

### `waypoints.csv`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `chapter` | integer | yes | Chapter number (foreign key to chapters.csv) |
| `order` | integer | yes | Position within chapter (1-indexed, sequential) |
| `name` | string | no | Waypoint name. Empty = shaping vertex (no marker rendered) |
| `lat` | float | yes | Latitude in decimal degrees |
| `lon` | float | yes | Longitude in decimal degrees |
| `major` | boolean | no | Major provisioning/spares hub (default false) |
| `decision` | boolean | no | Routing decision point / fork (default false) |
| `gateway` | boolean | no | Customs entry point or strategic staging port (default false) |
| `country` | string | no | Country or territory name |
| `notes` | string | no | Free-form notes |

**Waypoint rendering rules:**
- Empty `name` → shaping vertex: contributes to route line geometry, no map marker rendered,
  boolean flags ignored
- Non-empty `name` → waypoint marker rendered on map
- `major=true` → larger marker radius
- `decision=true` → diamond-shaped marker (planned; currently renders as circle with accent)
- `gateway=true` → star/badge marker (planned; currently renders as circle with accent)
- Flags are independent and combinable (a waypoint can be major + gateway, etc.)

**Route line construction:**
The route line for a chapter connects ALL waypoints (including shaping vertices) in `order`
sequence. The line passes through every row regardless of `name` being empty or populated.

**Chapter endpoint convention:**
The last waypoint of chapter N and the first waypoint of chapter N+1 may be the same geographic
point (the transit point between chapters). The connecting leg's distance counts toward chapter
N+1's nm total (captures "getting to the starting point"). The editor may auto-link these
visually but stores them as independent rows.

---

## JSON Schema (v2.3)

The editor exports this format; the viewer consumes it. The JSON is the interchange format —
CSVs are the human-editable source.

```json
{
  "meta": {
    "title": "string — user-defined voyage title, or default 'Voyage Atlas'",
    "version": "2.7",
    "generatedAt": "ISO 8601 datetime",
    "settings": {
      "voyageTitle": "S/Y GRACE Global Voyage",
      "distanceUnit": "nm",
      "nmOverride": null,
      "nationsOverride": null,
      "territoriesOverride": null
    }
  },
  "chapters": [
    {
      "num": 1,
      "name": "Chapter Name",
      "when": "Month Year – Month Year",
      "era": "past | current | future",
      "notes": "Free-form chapter notes",
      "countriesOverride": ["Country1", "Country2"],
      "keyDestinations": ["Dest1", "Dest2"],
      "blogUrl": "https://... | null",
      "padMultiplier": 1.20,
      "waypoints": [
        {
          "order": 1,
          "name": "Waypoint Name",
          "lat": 37.028,
          "lon": 27.988,
          "major": false,
          "decision": false,
          "gateway": false,
          "country": "Country",
          "notes": "Free-form notes"
        }
      ]
    }
  ]
}
```

**Computed figures (v2.7 — not stored).** The hero totals (total nm, chapter count, named-waypoint
count, nations, territories) and every per-chapter distance (`nm`, `nmBase`, `nmApproach`) are **not
written to the file**. Both the editor and the viewer recompute them on load from the chapters and
waypoints, applying any overrides on top. Only source data and explicit overrides are stored, so a
hand-edited file can't drift — the displayed numbers always match the data. (Files through v2.6 may
still carry a `meta.hero` block and per-chapter `nm` fields; these are ignored on load.)

**`meta.settings` fields:**
- `voyageTitle` — the voyage title shown in page titles, the viewer header, and exports; if blank, defaults to "Voyage Atlas"
- `distanceUnit` (v2.6) — display unit for all on-screen distances: `"nm"` (default), `"km"`, or `"mi"`. Display-only; `nmOverride` and all exports (JSON, CSV, KML) remain canonical nautical miles, and all distances are computed in nm before conversion
- `nmOverride` — if set (number), replaces the recomputed total nm
- `nationsOverride` — if set (integer), replaces the recomputed nations count
- `territoriesOverride` — if set (integer), replaces the recomputed territories count

**Country handling (v2.7).** A chapter's country list is **derived on load** from its waypoints'
`country` fields (first-appearance order), deduplicated. A chapter may carry an optional
`countriesOverride` (array) that replaces the derived list for that chapter; it is written only when
set. The voyage nations/territories split is the classified union of every chapter's effective list
(override where set, derived otherwise), with `nationsOverride`/`territoriesOverride` capping the
final totals.

**Nation/territory auto-classification:** the editor and viewer share a built-in reference list of
~65 overseas territories (see FAQ for the full list). Each distinct country name is checked against
this list: match = territory, no match = nation. Overrides take precedence over the auto-count.

**Key differences from v1 JSON:**
1. No `routes[]` array — route geometry is derived from the waypoint list in order
2. No `routingLabel` field — replaced by the three independent boolean flags
3. `decision` and `gateway` fields added
4. `country` and `notes` per waypoint
5. Per-chapter distances (`nm`, `nmBase`, `nmApproach`) and the hero totals are computed on load, not stored (v2.7). The math: `nmBase` = haversine sum of a chapter's waypoints in order; `nm` = `nmBase × padMultiplier + nmApproach`.
6. `nmApproach` (v2.5) — the "getting to the start point" leg: raw distance (no pad) from the
   predecessor chapter's last waypoint to this chapter's first waypoint. Zero when chapters share
   an endpoint (the common case); non-zero across a genuine gap (e.g., the NZ→Japan repositioning).
   The predecessor is resolved via `getPredecessorChapter()` — positional (num−1) today, fork-aware
   when variant chapters (#34) are added.
7. The waypoints total counts only named waypoints (non-empty name); shaping vertices excluded
8. Nations/territories classification added (v2.3)
9. `meta.settings` block added (v2.3) — title, nm/nations/territories overrides
10. `routing`, `bailout`, `prose` consolidated into `notes` (v2.0.2)
11. `distanceUnit` added to `meta.settings` (v2.6); `vesselName` removed (v2.6) — titles derive from `voyageTitle`, then `meta.title`, then the default
12. Calculated data is no longer stored (v2.7): `meta.hero` and per-chapter `nm`/`nmBase`/`nmApproach` removed; per-chapter `countries` replaced by an optional `countriesOverride`; data `version` stamped `"2.7"`

**v1 → v2 import logic (handled by the editor):**
1. Route segments concatenated in order; shared endpoints deduplicated (tolerance: 0.0001°)
2. Each route vertex matched to the closest unused named waypoint within 0.01° tolerance
3. Matched vertices get the waypoint name and `major` flag; `routingLabel` is dropped
4. Unmatched route vertices become empty-name shaping rows
5. Unmatched named waypoints appended at end (edge case safeguard)

---

## KML Export Schema

The editor exports KML for Google Earth compatibility. Structure:

```xml
<Document>
  <Folder name="Ch N — Chapter Name">
    <Placemark>  <!-- Route line -->
      <LineString><coordinates>lon,lat,0 ...</coordinates></LineString>
    </Placemark>
    <Placemark>  <!-- One per named waypoint -->
      <name>Waypoint Name</name>
      <Point><coordinates>lon,lat,0</coordinates></Point>
      <styleUrl>#waypoint | #major | #decision | #gateway</styleUrl>
    </Placemark>
  </Folder>
</Document>
```

---

## Future: `zones.csv` (not yet implemented)

Planned for permanent avoidance zones, restricted areas, or user-defined regions. Current PAZ
data (10 rectangles from framework Appendix C) lives in the viewer code; `zones.csv` would
externalize it.

| Column | Type | Description |
|--------|------|-------------|
| `name` | string | Zone display name |
| `south` | float | Southern boundary latitude |
| `west` | float | Western boundary longitude |
| `north` | float | Northern boundary latitude |
| `east` | float | Eastern boundary longitude |
| `type` | string | Zone type (e.g., `avoidance`, `restricted`, `custom`) |
| `color` | string | Hex color for rendering |
| `opacity` | float | Fill opacity (0–1) |
