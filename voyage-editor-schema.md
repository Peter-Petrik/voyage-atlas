# Voyage Editor — Data Schema (v2.0)

This document defines the data contract between the **editor** (`voyage-editor.html`) and the
**viewer** (`grace-voyage-map.html`). Any tool that produces data in this schema can feed the
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
| `routing` | string | no | Routing summary (v2.0; consolidating to `notes` in future) |
| `bailout` | string | no | Bail-out options (v2.0; consolidating to `notes` in future) |
| `countries` | string | no | Comma-separated list of countries/territories |
| `keyDestinations` | string | no | Comma-separated list of key destinations |
| `blogUrl` | string | no | URL to blog post collection for this chapter |
| `padMultiplier` | float | yes | NM padding factor (default 1.20) |
| `prose` | string | no | Short summary paragraph (quoted multiline OK) |

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
N+1's NM total (captures "getting to the starting point"). The editor may auto-link these
visually but stores them as independent rows.

---

## JSON Schema (v2.0)

The editor exports this format; the viewer consumes it. The JSON is the interchange format —
CSVs are the human-editable source.

```json
{
  "meta": {
    "title": "string — user-defined voyage title",
    "version": "2.0",
    "generatedAt": "ISO 8601 datetime",
    "hero": {
      "nm": 81051,
      "chapters": 19,
      "waypoints": 275
    }
  },
  "chapters": [
    {
      "num": 1,
      "name": "Chapter Name",
      "when": "Month Year – Month Year",
      "era": "past | current | future",
      "routing": "Routing summary text",
      "bailout": "Bail-out options text",
      "countries": ["Country1", "Country2"],
      "keyDestinations": ["Dest1", "Dest2"],
      "blogUrl": "https://... | null",
      "padMultiplier": 1.20,
      "prose": "Short summary paragraph",
      "nm": 6000,
      "nmBase": 5000,
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

**Key differences from v1 JSON:**
1. No `routes[]` array — route geometry is derived from the waypoint list in order
2. No `routingLabel` field — replaced by the three independent boolean flags
3. `decision` and `gateway` fields added
4. `country` and `notes` per waypoint
5. `nm` and `nmBase` are included for convenience but are always recomputable from waypoints +
   `padMultiplier`
6. `hero.waypoints` counts only named waypoints (non-empty name); shaping vertices excluded

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
