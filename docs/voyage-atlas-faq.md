# Voyage Atlas — FAQ & Owner's Manual

Voyage Atlas is a pair of self-contained web tools for charting a long voyage as a sequence of **chapters** — strategic groupings of waypoints by region and season. The **editor** (`voyage-atlas-editor.html`) is where the data is built and maintained; the **viewer** (`voyage-atlas.html`) is the read-only interactive chart that gets shared or hosted.

This document is the reference manual for both. It has four parts:

1. **Concepts** — the shared model both tools rest on (read this first)
2. **Using the editor** — building and maintaining the atlas
3. **Using the viewer** — exploring and hosting the chart
4. **Design principles** — why the tool works the way it does

---

## Why "Atlas," not "Planner"?

In the cruising community, *plan* is a dangerous four-letter word — *"sailors' plans are written in sand and at low tide."* Most trouble at sea comes from being committed to a *planned* activity: a relocation on a date, a fixed arrival to collect crew, a place chosen in advance regardless of what the weather and the boat are saying. Everyone plans, but the word invites the wrong posture.

An **atlas** is a collection of charts. That is exactly what this tool holds: a set of charted routes, organized into chapters, to navigate *by* — not a schedule to be bound *to*. The name reflects and respects how cruising actually works. Routes are options and intentions; the atlas shows what has been charted, and the sailing is always the navigator's to adjust.

This posture runs through the whole tool. **The atlas shows exactly what is entered.** A charted backtrack, a waypoint on land, or a leg that overshoots a harbor is rendered faithfully and counted honestly — the tool does not second-guess or quietly "correct" the data. Accuracy of the data is the navigator's responsibility, by design (see Part 4).

---

# Part 1 — Concepts

These ideas are shared by both the editor and the viewer.

## Why "chapters" instead of "legs"?

A voyage of this scale isn't a flat list of passages — it's a sequence of *phases*, each with its own season, region, and character. A chapter groups the waypoints of one such phase (e.g., "Morocco & Madeira," "Nordic & Svalbard," "Patagonia & Channels"). Chapters carry the strategic metadata that individual legs can't: the season window ("When"), the era (past / current / future), the countries touched, key destinations, and a narrative note.

Thinking in chapters keeps a multi-year, tens-of-thousands-of-mile voyage comprehensible. The chart colors each chapter distinctly so the arc of the voyage reads at a glance.

## What is a "shaping vertex"?

Every chapter is a single ordered list of waypoints. Each waypoint is one of two kinds:

1. **A named waypoint** — it has a name. It renders as a marker on the chart and counts in the named-waypoint total.
2. **A shaping vertex** — it has coordinates but *no name* (the row shows "(shaping vertex)" in the editor). It draws no marker; it only shapes the route line so the path bends correctly (around a cape, along a coast, through a strait).

The route line connects every point in order, named or not. Shaping vertices allow a realistic track without cluttering the chart with markers for every turn. To convert a marker into a shaping vertex, clear its name; to promote a shaping vertex to a marker, give it a name.

## What do the three waypoint flags mean?

Each waypoint has three independent checkboxes — **M**, **G**, **D** — that control emphasis and meaning:

1. **M — Major.** A provisioning hub: spares, repairs, or an extended stay. Renders as a larger circle.
2. **G — Gateway.** A customs entry or strategic staging port. Renders as a star.
3. **D — Decision.** A point where the route forks or a go/no-go choice is made. Renders as a diamond.

They are independent and combinable — a port can be Major *and* Gateway. The columns are shown in the order M, G, D, which is ascending emphasis priority: Major is lowest, Gateway is middle, Decision is highest. When more than one flag is set, the highest-priority flag determines the marker shape — Decision's diamond wins, then Gateway's star — and Major adds size on top. The flags are optional; a plain named waypoint with no flags is a normal circle.

## How is distance (nm) calculated?

Each chapter's distance has two components:

1. **Within-chapter distance** — the sum of great-circle (haversine) legs between the chapter's points, in order, multiplied by the chapter's **Pad Multiplier**. The pad accounts for the real sailing a straight-line track undercounts: tacking, exploration within a cruising ground, detours, and gunkholing. A delivery passage might use 1.05; a season of loch-hopping in Scotland might use 3.00.
2. **Approach leg** — the "getting to the start point" distance: the raw, *unpadded* great-circle distance from the previous chapter's last waypoint to this chapter's first waypoint. It is raw (no pad) because it's a delivery passage between regions, not exploration.

So: **chapter nm = (within-chapter base × pad) + approach leg.** The voyage total is the sum of all chapters.

Distances are always computed and stored in nautical miles; the on-screen unit (nm, kilometers, or miles) is a display-only choice in Voyage Settings and never changes the stored data or exports.

When two chapters share an endpoint (the common case — see the next question), the approach leg is zero, so it adds nothing. It only contributes when there's a genuine gap between chapters.

## Why does the connecting leg count toward the destination chapter?

The transit *to* a new chapter's starting point belongs to that new chapter's planning window and seasonal context — it's the first thing done in that phase, not the last thing done in the previous one. So the approach leg is attributed to the destination (the chapter being arrived into), not the origin.

## How do chapters connect? (Shared endpoints)

Chapters are meant to connect end-to-start: a chapter usually begins exactly where the previous one ended. In the data, this means the **same handoff point appears twice** — as the last row of one chapter and the first row of the next, at identical coordinates. For example, Gibraltar is both the last waypoint of the Mediterranean chapter and the first waypoint of the Morocco chapter.

This duplication is intentional and correct. The legs don't overlap (one chapter's last leg *arrives* at the handoff; the next chapter's first leg *departs* from it), so nothing is double-counted, and the approach leg between them is zero. The editor's pull-sync feature (Part 2) exists to create and maintain these shared endpoints.

A genuine *gap* — where one chapter ends somewhere the next doesn't begin — is rare and usually intentional (e.g., a long repositioning passage). The tool counts the gap as the destination chapter's approach leg.

## How are nations and territories counted?

The hero stats distinguish **nations** (sovereign countries) from **territories** (overseas territories and dependencies). Each distinct country across all chapters' effective lists is classified automatically against a built-in reference list of territories (the full list is below). Anything not on the territory list counts as a nation. Names are matched however they are written: case, accents, periods, hyphens and spacing are ignored ("Reunion" is Réunion, "Saint-Martin" is Saint Martin), a leading "St" reads as "Saint", and a few other names in common use read as the name the list or Nominatim uses ("Turkey" is Türkiye, "Cape Verde" is Cabo Verde, "Macao" is Macau). A place written two ways counts once, in a chapter's list and in the totals, under the spelling met first.

Both counts can be overridden in Voyage Settings when the automatic classification isn't the desired result. Separately, each chapter's country list is derived from its own waypoints' countries and can be replaced with a per-chapter override (the chapter's Countries / Territories field) — useful for a curated list that differs from what the waypoints imply. The voyage total is the classified union of every chapter's effective list.

**Caveat:** the country values come from Nominatim geocoding, which sometimes returns the *parent nation* rather than the territory — e.g., a waypoint in the Azores may come back as "Portugal," and Réunion as "France." When that happens the auto-count reflects the parent nation, not the territory. Either correct the country value on the waypoint, or set the territory override in Voyage Settings.

The built-in list holds 57 names, as Nominatim's reverse geocoding returns them; a few territories appear under more than one spelling:

1. **UK overseas territories:** Anguilla, Bermuda, British Indian Ocean Territory, British Virgin Islands, Cayman Islands, Falkland Islands, Gibraltar, Montserrat, Pitcairn Islands, Saint Helena, Ascension and Tristan da Cunha, South Georgia and the South Sandwich Islands, Turks and Caicos Islands.
2. **French overseas:** French Guiana, French Polynesia, French Southern Territories, Guadeloupe, Martinique, Mayotte, New Caledonia, Réunion, Saint Barthélemy, Saint Martin, Saint Pierre and Miquelon, Wallis and Futuna.
3. **Dutch overseas:** Aruba, Bonaire, Sint Eustatius and Saba, Curaçao, Sint Maarten.
4. **US territories:** American Samoa, Guam, Northern Mariana Islands, Puerto Rico, U.S. Virgin Islands, United States Minor Outlying Islands, US Virgin Islands.
5. **Danish autonomous territories:** Faroe Islands, Greenland.
6. **Norwegian dependencies:** Svalbard and Jan Mayen, Svalbard, Jan Mayen, Bouvet Island.
7. **Australian external territories:** Christmas Island, Cocos (Keeling) Islands, Norfolk Island.
8. **New Zealand associated states:** Cook Islands, Niue, Tokelau.
9. **Portuguese autonomous regions:** Azores, Madeira.
10. **Spanish autonomous community:** Canary Islands.
11. **Chinese special administrative regions:** Hong Kong, Macau, Macao.
12. **Crown Dependencies:** Isle of Man, Jersey, Guernsey.
13. **Finnish autonomous region:** Åland Islands.

## What's the difference between the JSON and the CSV exports?

1. **JSON** is the complete, authoritative file. It carries the source data — chapters, waypoints, flags, settings, and notes — in one structure. It does **not** store the computed figures (totals, per-chapter distances, derived country lists); both tools recompute those on load, so a hand-edited file never carries a stale number. This is what the viewer loads and what serves as the master file (`voyage-data.json`).
2. **CSV** is a convenience for spreadsheet editing. There are two CSVs — one for chapters, one for waypoints — and the editor exports both together in one action. Round-trip through a spreadsheet for bulk edits, then re-import. Both files start with a UTF-8 byte-order mark, so a spreadsheet such as Excel opens accented names ("Türkiye") as written. A text cell that starts with `=`, `+`, `-`, `@` or a tab is written with a leading apostrophe, so a spreadsheet shows it as text instead of running it as a formula; the import takes the apostrophe off again.

The data schema (field names, types, structure) is documented separately in `voyage-atlas-schema.md` for hand-editing the JSON.

---

# Part 2 — Using the editor

`voyage-atlas-editor.html`. It opens in any modern browser, from the local file system or a host.

## Getting data in

The editor opens to a chooser on every visit, offering three starting points:

1. **Explore the sample voyage.** When a voyage file resolves at the configured path (see below), the chooser offers it as the sample — a complete voyage to open and reshape. This option is hidden when no file resolves. The configured file is never loaded silently; it is always offered as an explicit choice.
2. **Start a new voyage.** Dismisses the chooser to the empty editor, ready for the first chapter.
3. **Load a voyage file.** Opens a v3.0 atlas JSON. Earlier formats are no longer supported. A malformed or non-Voyage-Atlas file is reported with a clear message, not silently swallowed, and the current voyage stays as it was.

A hand-edited file is corrected as it loads, and the status bar below the chart lists what changed (for example, "Loaded with corrections: chapters renumbered 1–20"):

1. Chapters are put in number order and numbered 1 to n, so a number skipped, repeated or left out in the file cannot send an edit or a delete to the wrong chapter. A chapter with no number stays after the chapter before it in the file.
2. A latitude beyond ±90 is not a position, so that waypoint loads without coordinates; a longitude outside -180 to 180 (a file written in 0-360, say) is brought into that range, with 180 itself read as -180, the same meridian.
3. A number in a text field, such as a waypoint named 1770, is read as text, and a flag written as text counts only when it reads "true", "1" or "yes".
4. A coordinate or pad multiplier that is not a number ("12abc", or "-9,1" with a decimal comma) reads as empty (a pad as 1.2), and the status bar counts it.
5. A file saved in the older Windows-1252 code page keeps its accented names, and the status bar says it was read that way.
6. A file made with a newer data model than 3.0 loads, and the status bar says so; a field the editor does not know, at any level, is named there, since a save leaves it out. Avoidance zones (`paz`), which the editor does not edit, are kept and saved back with their names and bounds; a zone without four bounds is left out and counted.

The same three actions, plus CSV import, are available on demand from the header **Load** menu once a session is underway: "Load a voyage file," "Import CSVs," "New voyage," and "Sample voyage" (the sample item appears only when a file resolves at the configured path). Any of these replaces the current voyage, so when there are unsaved changes each one warns first with a "Discard unsaved changes?" prompt — the safe choice, "Keep editing," takes focus and is what the Enter key triggers, so a mis-click or stray keystroke cannot discard work. Choosing "Discard changes" proceeds. At arrival, where the editor is empty, these actions proceed without a prompt.

**Importing CSVs** reads `chapters.csv`, then `waypoints.csv`. Each file is checked before anything is replaced: a chapters file without `num` and `name` columns, or with no numbered chapter (often `waypoints.csv` picked first), is refused at the first step, and a waypoints file without `chapter`, `name`, `lat` and `lon` columns at the second, which stays open for the right file. A decimal comma in a number column, as spreadsheets in much of Europe write it, reads as a point ("38,53" is 38.53). A row with every cell empty, as a spreadsheet writes for a cleared row, is skipped. A file saved in the older Windows-1252 code page keeps its accented names. The status bar lists what was corrected, including numbers that could not be read (left unset: an empty coordinate, or a pad multiplier of 1.2), waypoint rows whose chapter is not in the chapters file, and repeated chapter numbers, whose waypoints join the first chapter with that number. A chapter row whose number cannot be read is kept, placed after the chapter before it, and counted. A waypoint row with more cells than the header, usually an unquoted comma inside a value, is skipped and counted rather than read into the wrong columns; a chapter row with more cells keeps only its number and name, so its waypoints still load.

The chooser can be dismissed with its close (×) button, a tap outside the box, or the Escape key — all equivalent. Dismissing loads the sample when one is available; with no sample it starts a new voyage. (At arrival the editor is empty, so starting a new voyage needs no confirmation; the confirm only guards the mid-session "New voyage" path above.)

The voyage file is resolved from a `URL_VOYAGE_DATA` constant in the configuration block at the top of the editor's script — `voyage-data.json` by default. Editing that constant points the editor at a different file, including one in a subdirectory or a sibling folder, since relative paths are honored. A `?data=path` query parameter overrides the constant for a single visit. Both accept relative paths only; see "Can the voyage file be loaded from a web address?" below.

Resolving the file requires the editor to be served over HTTP. Opening it directly from disk (a `file://` URL) cannot fetch a local file, so the sample option does not appear and the chooser offers only "Start a new voyage" and "Load a voyage file." When the file is there but cannot be read, or a `?data=` file is not found, the chooser carries a note saying so.

**On load, the chart frames the whole voyage** — it fits to the combined extent of every chapter's waypoints, so an all-Mediterranean voyage opens on the Mediterranean. A voyage that spans the globe opens on as much of it as fits without the world repeating, centered on the middle of its span, so points at its far ends can sit past the sides of the chart. **No chapter is selected to start:** the status bar below the chart reads "No chapter selected — click a chapter to begin" ("No chapters yet — add a chapter to begin" for a new voyage). This matters because adding a waypoint — whether by clicking the chart, searching, or pasting — adds it to the *active* chapter, so a chapter must be selected (click it in the list) before those actions do anything. A place search with no chapter active pans the chart to the result and prompts for a chapter rather than dropping the point; the query stays in the box, so the result can be picked again once a chapter is selected. Rapid click with no chapter selected says so in the status bar.

## Adding waypoints

Within a chapter, there are five ways to add points:

1. **+ Add row** — appends one blank row to type into directly.
2. **+ Add N rows** — appends several blank rows at once (useful before a paste or bulk entry).
3. **Paste** — paste tabular data (e.g., from a spreadsheet) into the paste dialog; each line becomes a row. Columns are split at tabs when the pasted text contains a tab, and at commas otherwise. The columns, in order: name, lat, lon, then optionally major, decision, gateway, country and notes (the table shows Gateway before Decision). Coordinates are read as the waypoint table reads them, so a decimal comma ("38,53"), a hemisphere letter ("38.53S") or degrees and minutes ("16°30'W") read as decimal degrees. A coordinate that cannot be read, or a latitude beyond ±90, is left empty, the status bar says how many (after any name lookups the paste started have finished), and that row is not looked up by name. A line with every cell empty is skipped. A paste with 30 or more names to look up asks first, as Look up countries does; Cancel keeps the rows, without coordinates. **Cmd/Ctrl+Enter** in the paste box adds the rows (plain Enter inserts a newline).
4. **Click on the chart** — with **Rapid click** mode ON (toggle at the right of the status bar, below the chart), each click on the chart drops a new waypoint at that location. Standard chart navigation still works in this mode: drag to pan and scroll to zoom; only the single click is repurposed to place a waypoint. Turn the mode OFF to return the single click to normal selection.
5. **Search (Nominatim)** — type a place name in the search box and press **Enter** (or click **Search**) to search; typing alone sends nothing, because the Nominatim usage policy forbids client-side autocomplete; use the **arrow keys** to move through results, **Enter** to add the highlighted one (or the top result, when none is highlighted), **Escape** to dismiss. Adding a result drops a waypoint with coordinates (and country, when empty) filled, and selects it.

## Geocoding (name ↔ coordinates)

The editor uses the free Nominatim (OpenStreetMap) service two ways:

1. **Forward** — type a name into a waypoint's Name field (or pick a search result, or paste a name-only row) and the editor looks up the coordinates. Because the country rides along free in that same lookup, it fills the country too — but only when the country field is empty, so a hand-typed value is never overwritten.
2. **Reverse — Look up countries** — for waypoints placed by coordinates (a chart click or typed lat/lon), no country is known yet. The **Look up countries** button reverse-geocodes every such waypoint that has coordinates but no country, filling it from the position. This runs at two scopes — each chapter has its own **Look up countries** button, and a single **🌍 Look up all countries** button above the chapter list does the same sweep across every chapter at once, handy after importing a batch of coordinate-only waypoints. This is the one path that costs a *dedicated* lookup, which is why it's a deliberate button press rather than automatic.

Before a long sweep runs, the editor shows a quick confirmation — how many waypoints it will look up and a rough time estimate at one per second — so a long run is never a surprise. The all-chapters sweep always confirms; a per-chapter sweep confirms only when 30 or more waypoints are eligible. While a sweep runs, the status line shows live progress; when it finishes it shows how many were actually resolved (for example "Geocoded 4/5") and, when some can't be placed — an open-ocean shaping vertex Nominatim has no entry for, say — reports how many were left unresolved rather than implying every one succeeded. A country cell that already holds a value is flagged, so it is clear at a glance which cells a sweep will skip; it never overwrites a hand-typed value.

**Rate limit:** Nominatim's usage policy allows one request per second. The editor sends every geocoding request (searches, name lookups and country lookups) through one queue that spaces them accordingly, so a paste of many named rows will fill in gradually rather than all at once. This is deliberate — firing requests in parallel would get the service to rate-limit or block the requests. A search goes to the front of that queue, so even while a long country lookup runs it is sent next, usually within about a second.

**Caching:** answers are kept in memory for the session, including "nothing found" answers, as the usage policy requires. Repeating a lookup (running **Look up countries** again over points in open water, say) is answered from memory without a new request. Reloading the page clears the cache.

While any look-up is in flight, both the per-chapter **Look up countries** and the global **🌍 Look up all countries** buttons are visibly grayed and disabled, re-enabling only once the queue has drained. That stops a second click from stacking a duplicate sweep onto a queue already running.

## Adjusting waypoint positions

1. **Drag the marker** on the chart to reposition it; lat/lon update live.
2. **Edit lat/lon** directly in the table fields, or use the up and down arrow keys for fine nudges: each step moves 0.01 of a degree, about 0.6 nm of latitude, and keeps the value's other digits. A coordinate can be typed in decimal degrees (38.53, or -28.63 for west), with a hemisphere letter before or after the number (38.53N, 28.63W, S 38.5), in degrees and minutes or degrees, minutes and seconds (38°31.8'N, 28 37 48 W), or with a decimal comma (38,53); it is stored and shown in decimal degrees, and the status bar says what a value typed another way was read as. N or S belongs to a latitude and E or W to a longitude, and a sign with a letter says the direction twice, so these, and anything else that cannot be read, are refused, and the field goes back to its value. A typed latitude beyond ±90 is refused the same way, and a typed longitude outside -180 to 180 is brought into that range (200 becomes -160, and 180 becomes -180, the same meridian). A name or country lookup that answers while an entry is being typed into that row's latitude, longitude or country field leaves the field as it is being typed, and a country lookup answered while a coordinate is being typed is dropped, since it is for the old position; a field the cursor has only moved into still takes the answer.
3. **Drag or click a ghost midpoint** — each leg shows a faint "ghost" marker at its midpoint; drag it to insert a new shaping vertex where it is dropped, bending the route, or click it to insert one at the midpoint. (Ghost midpoints sit *on* the rendered line, even on long ocean legs.)

## Selecting a waypoint (chart ↔ list)

Clicking a **marker** on the chart selects that waypoint (a press that moves less than 3 px counts as a click, so a slight shake of the hand selects rather than moves it): the marker grows and turns crimson, and its row in the table is highlighted, scrolled into view, and briefly flashed. Clicking a waypoint's **sequence number** in the table does the same and also zooms the chart to that point and makes its chapter active — handy for jumping straight to a point on a long leg. Focusing any field in a different row also selects that row's waypoint, lighting its marker on the chart without moving the chart or stealing focus from the field being edited. Adding a single waypoint — with **+ Add row**, from a search result, or by dragging a ghost midpoint — selects the new row too; Rapid click and paste do not, so a run of additions doesn't keep moving the table, and a search or ghost-midpoint addition leaves a collapsed table collapsed. Focusing a row's ✕ to delete it leaves the selection where it was. Only one waypoint is selected at a time, and the selection stays on that waypoint when other rows are deleted, added or reordered around it.

Editing a latitude or longitude updates the chapter connection indicators (🔗 / ⇄) and the distances in place, so **Tab** moves straight on to the next field.

The selection clears on switching to another chapter (a click on its own chapter, or a chapter reorder, keeps it), on pressing **Escape** (outside the search box), or on clicking empty chart space away from any marker — any of which removes the row highlight and returns the marker to its normal style.

## Reordering

Drag the **≡** handle on a row to reorder waypoints within a chapter. Drag the **≡** handle on a chapter header to reorder chapters. Because chapter order defines the voyage sequence, reordering chapters changes which chapter is each one's predecessor — and therefore the approach-leg nm and the sync indicators (below).

## Endpoint sync — the ⇄ button and 🔗 indicator

Because chapters share handoff points (Part 1), the editor shows the connection state in each chapter header:

1. **🔗 (linked)** — this chapter's first waypoint is within half a nautical mile of the previous chapter's last waypoint (the gap rounds to 0 nm). They already connect; nothing to do.
2. **⇄ (pull)** — there's a gap of half a nautical mile or more. The tooltip shows the gap distance, and the button always pulls.

The previous chapter is the nearest earlier chapter that has coordinates: a chapter with no waypoints yet, or none with coordinates, such as one still being planned, is skipped, so the chapter after it connects to (and measures its approach leg from) the one before it.

Clicking ⇄ **inserts a copy** of the previous chapter's last waypoint as a new first row in this chapter. It does **not** move or overwrite the existing first waypoint — that point stays exactly where it is, name and coordinates intact. After the pull, this chapter begins precisely where the previous one ended, the gap closes, and the indicator flips to 🔗. The inserted row carries the full identity of the handoff point (name, coordinates, country, notes, and any M/G/D flags); if the predecessor ended at an unnamed shaping vertex, the inserted row is an unnamed shaping vertex.

**Why insert rather than overwrite?** Overwriting the first waypoint's coordinates would silently relocate a named point — "Funchal" could end up well offshore while still labeled "Funchal" — and distort the chapter's distance. Insertion is safe and reversible: an unwanted new row can simply be deleted. Pulling when already synced does nothing.

## Deleting waypoints

1. **Row ✕** — click the ✕ at the end of a waypoint row to remove it (no confirmation).
2. **Right-click the marker** on the chart — opens a confirmation dialog, then removes the waypoint. This works on the selected chapter's markers; on another chapter's, right-click does nothing, so select that chapter first.

## Chapter metadata

Open a chapter's metadata panel (the 📋 toggle, or double-click the chapter header, which also selects the chapter) to edit:

1. **Name** — the chapter's display name.
2. **When** — the season window, set with the start and end month and year dropdowns and written as a range with an en dash (e.g., "May 2028 – Sep 2028", or "May – Sep 2028" when the start year is left blank). A season that starts and ends on the same month and year, or the same year with no months, is written once ("May 2034", "2034"), and a When written once fills both ends of the dropdowns when read back. The years offered run from ten years before the current year to fifteen after it, and widen to include any year from 1900 to 2199 that the voyage's chapters already use, so an earlier chapter keeps its year. A file's When may be written shorter or longer: "Nov – Mar 2026" reads as November 2025 to March 2026, and full month names ("June 2025 – August 2025") are read. A When the dropdowns cannot show, such as "Summer 2025" or a year outside 1900–2199, is shown as saved under them, and choosing from them replaces it. The same month at both ends ("Jun – Jun 2025") is a full year, from June 2024. Choosing an end month with no end year fills the year in: the start's, or the next one when the end month comes before the start month.
3. **Era** — past, current, or future (controls styling and timeline placement).
4. **Pad Multiplier** — the distance multiplier for this chapter (see distance calculation, Part 1). It is 1 or more, since padding adds sailing distance; a smaller value is refused with a note in the status bar, and a blank field resets it to 1.2. A value below 1 in a voyage file or CSV reads as 1.2.
5. **Countries / Territories** — auto-derived from the chapter's waypoint countries, in first-appearance order. Leave it blank to keep that automatic; type a list, with entries separated by semicolons, to override it with a curated set (the override *replaces* the derived list, it does not add to it). A list typed with commas instead is also read, and the territory names that themselves contain commas, such as "Bonaire, Sint Eustatius and Saba", are recognized whole. A single entry that contains a comma is shown with a trailing semicolon, which keeps it one entry, and an entry cannot contain a semicolon. Each entry is then classified as a nation or a territory against the built-in reference list, exactly as the voyage totals are.
6. **Key Destinations** — highlights for the viewer's chapter summary, with entries separated by semicolons, so an entry may contain a comma (e.g., "Horta, Faial; Lajes do Pico"). A list with no semicolon is split at commas. A single entry that contains a comma is shown with a trailing semicolon, which keeps it one entry, and an entry cannot contain a semicolon.
7. **Blog URL** — an optional link to a post about this chapter, surfaced in the viewer. Only a full `http` or `https` address is shown as a link; an address typed without one ("www.example.com/blog") gets `https://` added when the field is left.
8. **Notes** — free-form narrative (routing thoughts, bail-out options, anything).

To open or close every chapter's panels in one go, use the compact controls above the chapter list: **📋 ⊞ ⊟** for the metadata panels and **📍 ⊞ ⊟** for the waypoint tables. In each pair the **⊞** opens every panel of that kind and the **⊟** closes them all.

## Voyage Settings (⚙)

The ⚙ panel above the chapter list holds voyage-level settings, saved into the JSON and reloaded on import:

1. **Voyage Title** — the title shown in the page titles and the viewer header, saved in the JSON file and used as the KML document's name. Free text: include a vessel, a vehicle, or anything else, or leave it blank to fall back to the default "Voyage Atlas".
2. **Distance Units** — the display unit for every on-screen distance: nautical miles (default), kilometers, or miles. Display-only; the stored data and all exports stay in nautical miles.
3. **Distance Override** — force the displayed total to a specific number, overriding the computed sum. Entered and shown in the selected display unit, stored as nautical miles, so the tile shows the figure as typed. A value of 0 or less, or a blank field, clears it. The header stat tile marks an active override with a ⚙.
4. **Nations / Territories overrides** — force these counts, overriding the automatic classification. Each is a whole number, and 0 is a valid count (a voyage with no territories, say); a blank field clears it. In the editor's header an override of 0 still shows its tile, marked with the ⚙; the viewer shows no tile for a count of 0.

## Saving and exporting

1. **Save** — downloads the master file as `voyage-data.json` (a fixed filename; the browser replaces the prior download). This is the file the viewer auto-loads.
2. **▾** beside Save (its tooltip reads "Export as JSON, CSV or KML") — a dropdown for everything else: a timestamped JSON (a dated snapshot), the two CSVs together, and a KML.
3. **KML** export produces a Google Earth–compatible file, `…-voyage-route.kml`, whose document takes the voyage title as its name (waypoints + route lines per chapter, with styled markers for Major/Decision/Gateway). Useful for viewing the voyage in Google Earth Pro.

The **Save** button reads `Save *` (with an "Unsaved changes" tooltip) whenever the document holds edits not yet written out — adding, moving, reordering or deleting a waypoint, or changing any chapter or voyage setting all set it. It returns to plain `Save` the moment the document is saved as JSON (**Save**, or the timestamped JSON under **Save As**) or a different file is loaded. The CSV and KML exports leave it showing: neither carries the voyage title or settings, and KML also leaves out notes, era and When, so neither reloads as the same voyage. The same unsaved state guards every action that would replace the current voyage — loading a file, importing CSVs, starting a new voyage, or loading the sample all warn before discarding it. As a further backstop, the browser's own "leave site?" prompt fires on any attempt to close or reload the tab while there are unsaved changes, so an accidental close won't quietly discard the work.

> Browsers can't silently write to a fixed file on disk, so "Save" downloads with a fixed name as
> the practical equivalent of overwriting. (A future enhancement may use the File System Access API
> for true in-place save on Chrome/Edge.)

## Keyboard shortcuts

1. In any dialog (bulk add, paste, CSV import, delete confirmation, Look up countries): **Enter** confirms, **Escape** cancels. Enter on a focused button does what that button says, so a focused Cancel cancels. The one exception is "Discard unsaved changes?", where Enter always keeps editing.
2. In the paste box specifically: **Cmd/Ctrl+Enter** adds the rows, while plain **Enter** inserts a newline (allowing multi-line content to be pasted or typed first).
3. In the Nominatim search box: **Enter** searches; once results show, **↑/↓** move through them, **Enter** adds the highlighted result (or the top one, when none is highlighted), **Escape** dismisses the results. A **second Escape** (once the results are already dismissed) clears the typed query.
4. With a waypoint selected and no dialog open: **Escape** clears the selection, except in the search box, where it only dismisses the results and then the query.

## Header stats

The editor header shows the live totals as tiles — distance, nations, territories, chapter count, named-waypoint count, and (when any exist) a shaping-vertex count. These recompute on every edit, using the same logic the viewer uses for its header, so the two tools always agree. A ⚙ marker on a tile means that figure is a manual override set in Voyage Settings rather than the computed value. On a screen 900 px wide or less the tiles are hidden, as in the viewer, leaving room for the title and buttons; each chapter's header still shows its distance. On a narrow chapter panel a chapter's era, link and distance move under its name, and the full name shows on hover. The footer carries the version and a link back to the project site, not the stats.

---

# Part 3 — Using the viewer

`voyage-atlas.html`. A read-only, interactive chart of a finished atlas — what gets published or shared.

## Loading data

The viewer resolves its voyage from a `URL_VOYAGE_DATA` constant in the configuration block at the top of its script — `voyage-data.json` by default. Editing that constant, or passing a `?data=path` query parameter, points the viewer at a different file, including one in a subdirectory or sibling folder, since relative paths are honored. Both accept relative paths only; see "Can the voyage file be loaded from a web address?" below.

1. **Auto-display.** When the configured file resolves, the viewer loads and displays it on open — the basis of the self-hosting model (below). A file that is present but unreadable opens the chooser with a note saying so rather than being treated as absent, and a `?data=` file that is not found gets a note too. The viewer reads a file exactly as the editor does, including the corrections a hand-edited file gets on load (see "Getting data in" under the editor).
2. **Chooser.** When no file resolves, the viewer shows the chooser: "Explore the sample voyage" (when a file resolves) and "Load a voyage file" (pick a v3.0 voyage JSON). Earlier formats are no longer supported, and a malformed file is reported rather than silently swallowed; the voyage already on screen stays as it was.
3. **Load button.** The header carries a persistent **Load…** button that opens the chooser at any time, so a different voyage can be opened without editing the URL. Once an atlas is shown the viewer remains read-only; the Load button only swaps which voyage is displayed. When a voyage is already on screen, the chooser can be dismissed without choosing — its close (×) button, a tap outside the box, or the Escape key all return to the current voyage. At a cold start, with no voyage behind it, the chooser stays open until an option is picked.
4. **Force the chooser.** Adding `?import=yes` to the viewer's URL opens the chooser on arrival even when the configured file would otherwise auto-display — handy for opening a different file without removing the default. The match is case-insensitive (`yes`/`YES`/`Yes`).

On load, how the viewer frames the chart depends on the voyage's span. A voyage that fits within a single (non-repeating) view of the world — a coastal cruise, one ocean, a season — is framed whole, so it opens on its own region. A voyage that wraps most or all of the way around the globe can't be shown complete in one view without the world repeating, so instead the viewer anchors on the **current chapter** (taken from each chapter's era, falling back to the first upcoming chapter, then the last) and shifts the frame so the route opens toward where the voyage is heading — the point it departs from sits near the trailing edge, with the rest of the width given to the passages ahead. That view opens one step wider than the widest single view of the world, for breathing room, so a sliver of the world's next copy can show at the sides. Where that view would leave the world shorter than the chart, as on a phone held upright, it opens closer instead, so the world always fills the chart from top to bottom. Either way no chapter is selected to start.

## Reading the chart

Each chapter is drawn in its own color, with named waypoints as markers and the route line tracing all points in order. Click a waypoint for its name and the chapter's season; major ports are marked. A waypoint that is both a Decision and a Gateway shows the Decision diamond on top when both layers are on. The hero stats at the top summarize the whole voyage. When a chapter has a blog URL set, its detail panel shows a "Read the posts →" link.

**Selecting a chapter** — click a chapter in the list (or its route on the chart) to focus it. Past chapters are dimmed in the lists (a muted name and a faded swatch) but open like any other; only a chapter with fewer than two points shows "No route" and cannot be selected. On a screen 900 px wide or less, picking a chapter in the drawer closes the drawer, as loading a voyage from it does. The selected chapter's route and waypoints stay at full strength while every other chapter dims, so the active one stands out; the chart eases to that chapter's extent (one step wider than a tight fit, so it isn't pinned to the edges or hidden under the corner panels), and the detail panel opens. On a phone (640 px or less) the chapter is framed in the part of the chart between the Chart & Layers panel and the detail panel, as far as that band allows on a short screen. A chapter picked on the chart is scrolled into view in the chapter list. The selected chapter's waypoints sit above its route, so each can be clicked for its popup, and the Decision and Gateway shapes of the other chapters dim with their dots. Clearing the selection — with the detail panel's ×, Escape, or a click on empty chart (a double-click zooms and keeps it) — restores all chapters to full strength. Escape while the chooser is open only closes the chooser.

The on-chart panels sit in the four corners: zoom controls top-left, **Chart & Layers** top-right, the **chapter list** bottom-left, and the chapter's **detail panel** bottom-right. Clicking the title of Chart & Layers or of the chapter list collapses or expands that panel. (On a narrow/mobile screen they stack instead: Chart & Layers below the zoom control, starting collapsed on a phone so it does not cover the chart, and the detail panel as a sheet along the bottom.) On a short screen, such as a phone held sideways, Chart & Layers also starts collapsed and the detail panel stays below its collapsed bar; opened, Chart & Layers shows above the detail panel.

## Layer toggles

Five layers can be switched on and off:

1. **Routes** — the chapter route lines (on by default).
2. **Waypoints** — the waypoint markers (on by default).
3. **Avoidance zones** — piracy/avoidance-zone rectangles, if present (off by default).
4. **Decision points** — diamonds at decision waypoints (off by default).
5. **Gateway ports** — stars at gateway waypoints (off by default).

The Decision and Gateway layers add their markers *on top of* the normal waypoint circles — so the circle stays visible whether or not those layers are on. Turning a layer off hides its markers but leaves the underlying waypoint circle.

## Day / night

A ◐ toggle flips the chart between the light "admiralty chart" theme and a dark "deep sea" theme. The route and marker colors are tuned to read on both, and each route at full strength is drawn over a thin casing in the theme's ink color, dark on the light chart and light on the dark one, so every chapter's color keeps a visible edge against the basemap. Waypoint dots have an outline in the same ink color. The chart's zoom buttons, tooltips and popups, and the browser's own checkboxes, lists and scrollbars, follow the theme in both tools.

## What the hero stats mean

The header shows total distance, the nations and territories touched, the chapter count, and the named-waypoint count. **Both tools compute these from the chapters and waypoints every time a file loads** — they are not stored in the file at all, so the headline numbers always match the drawn routes, even after a hand-edit of the JSON (add a waypoint, change a country, remove a chapter). Any explicit override set in Voyage Settings is applied on top.

## Self-hosting

The viewer is designed to host as two files. Put `voyage-atlas.html` and `voyage-data.json` in the same directory on any static web host, or serve the folder locally over HTTP, and the chart loads automatically — no build step, no server code, no database. (Opened straight from disk as a `file://` page, the browser blocks the fetch, so the viewer opens to its chooser, where a voyage file can be picked instead.) To update the published chart, replace `voyage-data.json` with a fresh export. The repository also ships optional icon assets and `site.webmanifest` for the favicon and home-screen icons; they sit alongside the HTML when wanted and can be omitted without affecting how the tool runs.

---

# Part 4 — Design principles

## Why self-contained HTML files?

Each tool is a single HTML file with all its CSS and JavaScript inline, pulling only well-known libraries (Leaflet, PapaParse, SortableJS) from a CDN, each pinned to an exact version with an integrity hash, so the browser refuses any file that differs from that version. No build step, no framework, no server. This means the exact same file runs identically whether opened from the local file system, hosted on a static server, or hand it to someone else. One file, one behavior, nothing to install. The optional icon assets and `site.webmanifest` that ship alongside add a favicon and home-screen icons but change none of this — they are cosmetic, and a copy hosted without them behaves exactly the same.

The editor and viewer are deliberately *vanilla* (not React or another framework): a framework would need a build pipeline to host, defeating the "open it anywhere" goal.

## Why is the data separate from the tool?

The tools are generic; the voyage lives in `voyage-data.json`. Separating data from code means the same editor and viewer work for any voyage, the data is portable and inspectable, and the data file can be versioned, backed up, or shared on its own. The viewer loads data at runtime rather than having it baked in.

## Can the voyage file be loaded from a web address?

No — the voyage file is loaded by relative path only, whether through the `URL_VOYAGE_DATA` constant or the `?data=` parameter. A full `http(s)` address is not supported. This is a deliberate choice, not an oversight. A browser only permits a page to fetch a file from another origin when that remote server returns the headers that allow it (the cross-origin resource sharing, or CORS, rules), and a self-contained static file has no control over those headers on a server it does not own. Supporting arbitrary web addresses would therefore work for some hosts and fail silently for most, which is worse than not offering it. The relative-path model keeps loading predictable: the file travels with the tool. A `?data=` value that points to another site (an absolute address on another host, a `//host` address, or a scheme such as `data:`) is refused, and the chooser opens with a note that voyage files must be on this site; a voyage file from another site could otherwise carry script that would run in this site's pages. (The technical groundwork for opt-in remote loading from CORS-permissive hosts is noted in the enhancements backlog.)

## How do I change the basemap or use a different geocoder?

Both settings live in a labeled configuration block at the top of each tool's script, alongside the data-file path. The basemap tile layers are `URL_TILE_LIGHT` (day) and `URL_TILE_DARK` (night), in both tools; the default is CARTO's Positron and Dark Matter. CARTO serves these tiles only with an API key, set as `TILE_KEY` in the same block; without one the chart still works, but every tile carries an "API key required" watermark. A key is free for most sites and is requested at [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/); each site needs its own. A hosting server can supply the key at run time as `window.VOYAGE_ATLAS_CONFIG.tileKey`, set in a plain inline script (not `async`, `defer` or a module) placed before the tool's own script, which takes precedence over the constant, so the key never has to be written into the file. Replacing those URLs with another tile provider's template changes the chart's appearance — and if the provider is changed, the attribution string just below the configuration block should be updated to match that provider's terms. The editor additionally has `URL_GEOCODE`, the base URL of the geocoder used for name-to-coordinate search and reverse country lookup; it defaults to the public Nominatim service and can be pointed at a different Nominatim-compatible instance. The one-request-per-second pacing on geocoding is fixed in the code rather than exposed as a setting, because it is what the public Nominatim usage policy requires; a private instance with a different policy would still be reached at that pace.

## Why is data correctness my responsibility?

The atlas is a faithful instrument, not a nanny. It draws what is entered and counts what is charted — including backtracks, overshoots, or a waypoint that lands on a beach. Sometimes those are mistakes; just as often they're deliberate (a planned dogleg, a waypoint placed on a headland as a visual reference). The tool can't tell the difference, and trying to "protect" the navigator from their own data would mean overriding intent it can't read. The detail level, and the accuracy, belong to the navigator. When something looks wrong on the chart, the fix is in the data.

This is the same posture as the name (see the top of this document): the atlas shows what has been charted. The judgment stays with the navigator.

## Where does this tool stop?

Voyage Atlas manages *strategic* chapter-and-waypoint data — the shape and sequence of a voyage. It is **not**:

1. A **live tracker** — it doesn't show where the boat is now.
2. A **tactical passage planner** — weather windows, tidal gates, and anchorage selection live in dedicated tools (LuckGrib, Navily, NoForeignLand).

It's the framework atlas: the charted intentions to navigate by, kept deliberately separate from the day-to-day tactics of actually sailing them.

---

*Companion documents: [`voyage-atlas-schema.md`](voyage-atlas-schema.md) (the data format), [`voyage-atlas-enhancements.md`](voyage-atlas-enhancements.md) (planned features), and the [changelog](../CHANGELOG.md) (version history).*
