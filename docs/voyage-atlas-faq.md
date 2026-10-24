# Voyage Atlas — FAQ / Owner's Manual

Voyage Atlas is a pair of self-contained web tools for charting a long voyage as a sequence of **chapters** — strategic groupings of waypoints by region and season. The **editor** (`voyage-atlas-editor.html`) is where a voyage is charted and maintained; the **viewer** (`voyage-atlas.html`) is the read-only interactive chart that gets shared or hosted.

This document is the reference manual for both. It has four parts:

1. **Concepts** — the shared model both tools rest on (read this first)
2. **Using the editor** — charting and maintaining a voyage
3. **Using the viewer** — exploring and hosting the chart
4. **Design principles** — why the tool works the way it does

---

## Why "Atlas," not "Planner"?

In the cruising community, *plan* is a dangerous four-letter word — *"sailors' plans are written in sand and at low tide."* Most trouble at sea comes from being committed to a *planned* activity: a relocation on a date, a fixed arrival to collect crew, a place chosen in advance regardless of what the weather and the boat are saying. Everyone plans, but the word invites the wrong posture.

An **atlas** is a collection of charts. That is exactly what this tool holds: a set of charted routes, organized into chapters, to navigate *by* — not a schedule to be bound *to*. The name reflects and respects how cruising actually works. Routes are options and intentions; the atlas shows what has been charted, and the sailing is always the navigator's to adjust.

This posture runs through the whole tool. **The atlas shows exactly what is entered.** A charted backtrack, a waypoint on land or a leg that overshoots a harbor is rendered faithfully and counted honestly — the tool does not second-guess or quietly "correct" the data. Accuracy of the data is the navigator's responsibility, by design (see Part 4).

---

# Part 1 — Concepts

These ideas are shared by both the editor and the viewer.

## Why "chapters" instead of "legs"?

A voyage of this scale isn't a flat list of passages — it's a sequence of *phases*, each with its own season, region and character. A chapter groups the waypoints of one such phase (e.g., "Morocco & Madeira," "Nordic & Svalbard," "Patagonia & Channels"). Chapters carry the strategic metadata that individual legs can't: the era (past, current or future), the season window ("When"), a narrative note, the countries touched and key destinations.

Thinking in chapters keeps a multi-year, tens-of-thousands-of-mile voyage comprehensible. The chart colors each chapter distinctly so the arc of the voyage reads at a glance.

## What is a "shaping vertex"?

Every chapter is a single ordered list of waypoints. Each waypoint is one of two kinds:

1. **A named waypoint** — it has a name. It renders as a marker on the chart once it has coordinates, and counts in the header's Waypoints figure (see "What do the header stats show?").
2. **A shaping vertex** — it has coordinates but *no name* (the row shows "(shaping vertex)" in the editor). It draws no marker in the viewer or the KML (a GPX export writes it as a route point without a name), and in the editor only a small gray dot in the selected chapter, so it can be dragged or deleted; it shapes the route line so the path bends correctly (around a cape, along a coast, through a strait). Its flags are ignored.

The route line connects every point in order, named or not. Shaping vertices allow a realistic track without cluttering the chart with markers for every turn. To convert a marker into a shaping vertex, clear its name; to promote a shaping vertex to a marker, give it a name.

## What do the three waypoint flags mean?

Each waypoint has three independent checkboxes — **M**, **G**, **D** — that control emphasis and meaning:

1. **M — Major.** A provisioning hub: spares, repairs or an extended stay. Renders as a larger circle.
2. **G — Gateway.** A customs entry or strategic staging port. Renders as a star.
3. **D — Decision.** A routing fork or go/no-go point. Renders as a diamond.

They are independent and combinable — a port can be Major *and* Gateway. The columns are shown in the order M, G, D, which is ascending emphasis priority: Major is lowest, Gateway is middle, Decision is highest. When more than one flag is set, the highest-priority flag determines the marker shape — Decision's diamond wins, then Gateway's star — and Major adds size on top. The flags are optional; a plain named waypoint with no flags is a normal circle.

In the editor the star and diamond show in the selected chapter, and other chapters show plain dots. In the viewer they are drawn over the waypoint's circle when the Decision points and Gateway ports layers are on (both off by default; see Layer toggles).

## How is distance (nm) calculated?

Each chapter's distance has two components:

1. **Within-chapter distance** — the sum of great-circle (haversine) legs between the chapter's points, in order, multiplied by the chapter's **Pad Multiplier**. The pad accounts for the real sailing a straight-line track undercounts: tacking, exploration within a cruising ground, detours and gunkholing. A delivery passage might use 1.05; a season of loch-hopping in Scotland might use 3.00. A new chapter starts at 1.2.
2. **Approach leg** — the "getting to the start point" distance: the raw, *unpadded* great-circle distance from the previous chapter's last waypoint to this chapter's first waypoint. It is raw (no pad) because it's a delivery passage between regions, not exploration.

So: **chapter nm = (within-chapter base × pad) + approach leg.** The voyage total is the sum of all chapters.

Distances are always computed in nautical miles, and the one distance a voyage file holds, the Distance Override, is stored in nautical miles too. The unit chosen in Voyage Settings (nautical miles, kilometers or miles) is saved with the voyage and sets how both tools show every distance; it changes no stored figure.

When two chapters share an endpoint (the common case; see "How do chapters connect?" below), the approach leg is zero, so it adds nothing. It only contributes when there's a genuine gap between chapters.

## Why does the approach leg count toward the destination chapter?

The transit *to* a new chapter's starting point belongs to that new chapter's planning window and seasonal context — it's the first thing done in that phase, not the last thing done in the previous one. So the approach leg is attributed to the destination (the chapter being arrived into), not the origin.

## How do chapters connect? (Shared endpoints)

Chapters are meant to connect end-to-start: a chapter usually begins exactly where the previous one ended. In the data, this means the **same handoff point appears twice** — as the last row of one chapter and the first row of the next, at identical coordinates. For example, Gibraltar is both the last waypoint of the Mediterranean chapter and the first waypoint of the Morocco chapter.

This duplication is intentional and correct. The legs don't overlap (one chapter's last leg *arrives* at the handoff; the next chapter's first leg *departs* from it), so nothing is double-counted, and the approach leg between them is zero. The editor's endpoint sync (the ⇄ button, Part 2) exists to create and maintain these shared endpoints.

A genuine *gap* — where one chapter ends somewhere the next doesn't begin — is rare and usually intentional (e.g., a long repositioning passage). The tool counts the gap as the destination chapter's approach leg.

## How are nations and territories counted?

The header stats distinguish **nations** (sovereign countries) from **territories** (overseas territories and dependencies). Each distinct country across all chapters' effective lists is classified automatically against a built-in reference list of territories (the full list is below). Anything not on the territory list counts as a nation. Names are matched however they are written: case, accents, periods, hyphens, dashes and spacing are ignored and "&" reads as "and" ("Reunion" is Réunion, "Saint-Martin" is Saint Martin), a leading "St" reads as "Saint", and a few other names in common use read as the name the list or Nominatim uses ("Turkey" is Türkiye, "Cape Verde" is Cabo Verde, "Macao" is Macau). A place written two ways counts once, in a chapter's list and in the totals, under the spelling met first.

Both counts can be overridden in Voyage Settings when the automatic classification isn't the desired result. Separately, each chapter's country list is derived from its own waypoints' countries and can be replaced with a per-chapter override (the chapter's Countries / Territories field) — useful for a curated list that differs from what the waypoints imply. The voyage total is the classified union of every chapter's effective list.

**Caveat:** the auto-count follows the waypoints' country values. A lookup can fill in the parent nation rather than the territory (a waypoint in the Azores as "Portugal", say), and the count then reflects the parent nation; correct the country value on the waypoint or set the territory override in Voyage Settings.

The built-in list holds 57 names; a few territories appear under more than one spelling. Entries are separated by semicolons, since some names contain commas:

1. **UK overseas territories:** Anguilla; Bermuda; British Indian Ocean Territory; British Virgin Islands; Cayman Islands; Falkland Islands; Gibraltar; Montserrat; Pitcairn Islands; Saint Helena, Ascension and Tristan da Cunha; South Georgia and the South Sandwich Islands; Turks and Caicos Islands.
2. **French overseas:** French Guiana; French Polynesia; French Southern Territories; Guadeloupe; Martinique; Mayotte; New Caledonia; Réunion; Saint Barthélemy; Saint Martin; Saint Pierre and Miquelon; Wallis and Futuna.
3. **Dutch overseas:** Aruba; Bonaire, Sint Eustatius and Saba; Curaçao; Sint Maarten.
4. **US territories:** American Samoa; Guam; Northern Mariana Islands; Puerto Rico; U.S. Virgin Islands; United States Minor Outlying Islands; US Virgin Islands.
5. **Danish autonomous territories:** Faroe Islands; Greenland.
6. **Norwegian dependencies:** Svalbard and Jan Mayen; Svalbard; Jan Mayen; Bouvet Island.
7. **Australian external territories:** Christmas Island; Cocos (Keeling) Islands; Norfolk Island.
8. **New Zealand associated states:** Cook Islands; Niue; Tokelau.
9. **Portuguese autonomous regions:** Azores; Madeira.
10. **Spanish autonomous community:** Canary Islands.
11. **Chinese special administrative regions:** Hong Kong; Macau; Macao.
12. **Crown Dependencies:** Isle of Man; Jersey; Guernsey.
13. **Finnish autonomous region:** Åland Islands.

## What do the header stats show?

Both tools head the chart with the voyage's totals: distance, nations, territories, the chapter count and the waypoint count: named waypoints with coordinates, with a handoff point shared by two chapters (both named, the gap between them rounding to 0 nm, as the 🔗 shows) counted once. **Both tools compute these from the chapters and waypoints every time a file loads** — they are not stored in the file at all, so the headline numbers always match the drawn routes, even after a hand-edit of the voyage file (add a waypoint, change a country, remove a chapter), and the two tools always agree. Any override set in Voyage Settings replaces the computed figure. The editor's header and the viewer's each add a few touches of their own (Part 2, Header stats; Part 3, The chart's panels).

## Light and dark themes

The ◐ button in the header of both tools switches between a light and a dark theme. The route and marker colors are tuned to read on both, and each route at full strength is drawn over a thin casing in the theme's ink color, dark on the light chart and light on the dark one, so every chapter's color keeps a visible edge against the basemap. Waypoint dots have an outline in the same ink color. The chart's zoom buttons, tooltips and popups, and the page's own checkboxes, lists and scrollbars, follow the theme in both tools.

---

# Part 2 — Using the editor

`voyage-atlas-editor.html`. It opens in any modern browser, from the local file system or a host.

## Getting data in

The editor opens to a chooser on every visit, offering three starting points:

1. **Explore the sample voyage.** When a voyage file resolves at the configured path (see below), the chooser offers it as the sample — a complete voyage to open and reshape. This option is hidden when no file resolves. The configured file is never loaded silently; it is always offered as an explicit choice.
2. **Start a new voyage.** "Begin with a blank chart and add the first chapter." Dismisses the chooser to the empty editor, ready for the first chapter.
3. **Load a voyage file.** Opens a voyage file (data model 3.0). Earlier formats are no longer supported. A malformed or non-Voyage-Atlas file is reported with a clear message, not silently swallowed, and the current voyage stays as it was.

On a screen 640 px wide or less, or a touch-only screen of any width, the chooser also carries the note "Voyage Atlas Editor is designed for a desktop or laptop with a mouse."

The chooser can be dismissed with its close (×) button, a tap outside the box or the Escape key — all equivalent. Dismissing loads the sample when one is available; with no sample it starts a new voyage.

The voyage file is resolved from a `URL_VOYAGE_DATA` constant in the configuration block at the top of the editor's script — `voyage-data.json` by default. Editing that constant points the editor at a different file, including one in a subdirectory or a sibling folder. A `?data=path` query parameter overrides the constant for a single visit. Either may be a relative path or a full address on the same site (the same protocol and host); a file on another site is not loaded (see "Can the voyage file be loaded from a web address?" in Part 4). A `?data=` value that points to another site (an absolute address on another host, a `//host` address or a scheme such as `data:`) is refused, and the chooser opens with the note "Voyage files must be on this site."

Opened directly from disk (a `file://` address), the editor does not read the voyage file beside it, so the sample option does not appear and the chooser offers only "Start a new voyage" and "Load a voyage file…", with a note saying why. When the file is there but cannot be read, or a `?data=` file is not found, the chooser carries a note saying so.

The same three actions, plus CSV and GPX import, are available on demand from the header **Load** menu once a session is underway: "Load a voyage file…", "Import CSVs (chapters + waypoints)…", "Import GPX…", "New voyage" and "Sample voyage" (the sample item appears only when a file resolves at the configured path). Each of these but Import GPX replaces the current voyage, so when there are unsaved changes each one warns first with a "Discard unsaved changes?" prompt — the safe choice, "Keep editing," takes focus and is what the Enter key triggers, so a mis-click or stray keystroke cannot discard work. Choosing "Discard changes" proceeds. At arrival, where the editor is empty, these actions proceed without a prompt.

**Importing CSVs** reads `chapters.csv`, then asks for `waypoints.csv` in an "Import waypoints CSV" dialog. Each file is checked before anything is replaced:

1. A chapters file without `num` and `name` columns, or with no numbered chapter (often `waypoints.csv` picked first), is refused at the first step.
2. A waypoints file without `chapter`, `name`, `lat` and `lon` columns is refused at the second step, and the dialog stays open for the right file.
3. A decimal comma in a number column reads as a point ("38,53" is 38.53). Coordinates are read in decimal degrees only: a hemisphere letter or degrees and minutes ("38.53S", "16°30'W"), which the waypoint table and Paste accept, is left empty and counted.
4. A row with every cell empty is skipped.
5. A file saved in the older Windows-1252 code page keeps its accented names.
6. The status bar lists what was corrected: numbers that could not be read (left unset: an empty coordinate, or a pad multiplier of 1.2); waypoint rows whose chapter is not in the chapters file; repeated chapter numbers (both chapters are kept, and the waypoints with that number join the first); chapter rows whose number cannot be read, which are kept, placed after the chapter before them and counted; and waypoint rows with more cells than the header, which are skipped and counted rather than read into the wrong columns. A chapter row with more cells keeps only its number and name, so its waypoints still load.

**Importing a GPX file** ("Import GPX…") adds the tracks, routes and waypoints of a GPX file (from a chartplotter, a phone app or NoForeignLand, for example) to the voyage, as new chapters or in place of the selected chapter's waypoints; it does not replace the voyage. GPX 1.1 and GPX 1.0 files are read. The dialog shows what the file holds, then, top to bottom:

1. The tracks and routes, each with its point count and a checkbox, all ticked to start. A track's segments are joined in order.
2. "Track detail" — a slider from Simple to Detailed that thins a track to fewer points: it keeps the first and last, and drops each point that lies within the slider's distance of the line that replaces it (10 nm at Simple, 0.01 nm at Detailed). The line below the choices gives the count kept as it moves. Routes are never thinned. The slider shows only when a track is ticked.
3. "Include the file's waypoints as named points" — ticked to start. A waypoint the same as a named point of the ticked tracks and routes (the same name, notes and flags, within 0.05 nm), or given twice, comes in once. Otherwise a waypoint within 0.05 nm of a point with the same name adds its flags to that point, and its notes when the point has none; failing that, one within 0.05 nm of a point with no name gives that point its name, notes and flags. Any other goes between the two points of the leg it lies nearest to, or before the first or after the last point when it lies beyond an end, in order along the route. With no track or route ticked, the waypoints alone make the chapter, in file order. A waypoint without a name is left out.
4. "Import into" — "New at the end of the voyage", with the defaults of + Add chapter (era Future, Pad Multiplier 1.2), named after its track or route or, when several are joined or the track or route has no name, after the file (the name written inside it, else the file name), with its place in the list after it when each comes in as a chapter of its own ("Summer 2027 2"); or "Replace the N rows of Chapter N: Name", for the selected chapter, which keeps the chapter's other fields and asks first (Enter there keeps the rows). Replace is available when a chapter is selected.
5. "The chosen tracks and routes" — "All in one chapter" or "One chapter each", shown when more than one is ticked for new chapters. Replacing a chapter's rows joins them into that chapter. With one chapter each, every waypoint goes to the track or route it lies nearest.

Track points come in as shaping vertices, a track's segments joined in order (then any points written outside a segment); route points and waypoints keep their names, notes (`desc`, else `cmt`) and flags as a GPX export writes them, and a route named "Ch N — " by that export is named without the prefix. A file over 2 MB shows "Reading trip.gpx…" in the status bar while it is read, and tracks of more than 20,000 points in all show "Reading the tracks…" while they are measured for thinning. Coordinates are rounded to five decimal places. A point without a usable latitude (beyond ±90 or unreadable) or longitude is skipped and counted, and a longitude outside -180 to 180 is brought into that range. Nothing is looked up: countries stay empty, for Look up countries. A file that is not GPX, or holds no point with usable coordinates, changes nothing and says so.

A hand-edited voyage file is corrected as it loads, and the status bar below the chart lists what changed (for example, "Loaded with corrections: chapters renumbered 1–20 — click a chapter to begin"):

1. Chapters are put in number order and numbered 1 to n, so a number skipped, repeated or left out in the file cannot send an edit or a delete to the wrong chapter. A chapter with no number stays after the chapter before it in the file.
2. A latitude beyond ±90 is not a position, so that waypoint loads without coordinates; a longitude outside -180 to 180 (a file written in 0-360, say) is brought into that range, with 180 itself read as -180, the same meridian.
3. A number in a text field, such as a waypoint named 1770, is read as text, and a flag written as text counts only when it reads "true", "1" or "yes".
4. A coordinate or pad multiplier that is not a number ("12abc", or "-9,1" with a decimal comma) reads as empty (a pad as 1.2), and the status bar counts it.
5. A file saved in the older Windows-1252 code page keeps its accented names, and the status bar says it was read that way.
6. A file made with a newer data model than 3.0 loads, and the status bar says so; a field the editor does not know, at any level, is named there, since a save leaves it out.
7. Avoidance zones (`paz`), which the editor does not edit, are kept and saved back with their names and bounds; a zone without four bounds is left out and counted.

**On load, the chart frames the whole voyage** — it fits to the combined extent of every chapter's waypoints, so an all-Mediterranean voyage opens on the Mediterranean. A voyage that spans the globe opens on as much of it as fits without the world repeating, centered on the middle of its span, so points at its far ends can sit past the sides of the chart. No chapter is selected to start: the status bar below the chart reads "No chapter selected — click a chapter to begin" ("No chapters yet — add a chapter to begin" for a new voyage). Once a chapter is active it shows that chapter, for example "Chapter 3: Aegean Greece · 24 rows · 410 nm".

## Chapters

Above the chapter list, left to right: **📋 ⊞ ⊟** opens or closes every chapter's metadata panel, **📍 ⊞ ⊟** every waypoint table and **🌍 Look up all countries** runs the country lookup across the voyage (see Geocoding). In each pair the **⊞** opens every panel of that kind and the **⊟** closes them all. **+ Add chapter** sits below the list.

Each chapter header holds, left to right, the ≡ drag handle, the chapter number, its name, the era chip, the connection indicator (🔗 or ⇄) and the distance, the 📋 metadata and 📍 waypoints toggles and the ✕ delete button. Clicking a header makes that chapter the active one. On a narrow chapter panel the era, indicator and distance move under the name, and the full name shows on hover. The divider between the chapter panel and the chart can be dragged to widen either.

### Adding a chapter

**+ Add chapter**, below the chapter list, adds a chapter named "New Chapter" at the end of the voyage (era Future, Pad Multiplier 1.2) and selects it.

### Chapter metadata

Open a chapter's metadata panel (the 📋 toggle, or double-click the chapter header, which also selects the chapter) to edit, in the order the form shows them:

1. **Name** — the chapter's display name.
2. **Era** — Past, Current or Future (a new chapter starts as Future). The era shows as a chip in the chapter header, with a sample of the route line. On the chart, in both tools, a future chapter's route is dashed and a past or current chapter's is solid. In the viewer a past chapter is dimmed in the Chapters list and the Voyage Chapters drawer, and the opening view keeps the current chapter in sight (see Loading data, Part 3).
3. **When** — the season window, set with four dropdowns: start month and year, then end month and year. Choosing an end month with no end year fills the year in: the start's, or the next one when the end month comes before the start month. It is written as a range with an en dash ("May 2028 – Sep 2028", or "May – Sep 2028" when the start year is left blank); a season that starts and ends on the same month and year, or the same year with no months, is written once ("May 2034", "2034"). The years offered run from ten years before the current year to fifteen after it, widened to any year from 1900 to 2199 the voyage's chapters already use, so an earlier chapter keeps its year.
4. **Pad Multiplier** — the distance multiplier for this chapter (see distance calculation, Part 1). It is 1 or more, since padding adds sailing distance; a smaller value is refused with a note in the status bar, and a blank field resets it to 1.2. A value below 1 in a voyage file or CSV reads as 1.2.
5. **Blog URL** — an optional link to the blog posts covering this chapter, shown in the viewer's detail panel as "Read the posts →". Only a full `http` or `https` address is shown as a link; an address typed without one ("www.example.com/blog") gets `https://` added when the field is left.
6. **Notes** — free-form narrative (routing thoughts, bail-out options, anything).
7. **Countries / Territories** — auto-derived from the chapter's waypoint countries, in first-appearance order. Leave it blank to keep that automatic; type a list, with entries separated by semicolons, to override it with a curated set (the override *replaces* the derived list, it does not add to it). A list typed with commas instead is also read, and the territory names that themselves contain commas, such as "Bonaire, Sint Eustatius and Saba", are recognized whole. A single entry that contains a comma is shown with a trailing semicolon, which keeps it one entry, and an entry cannot contain a semicolon. Each entry is then classified as a nation or a territory against the built-in reference list, exactly as the voyage totals are.
8. **Key Destinations** — highlights shown under the chapter's name in the viewer's **Voyage Chapters** drawer (☰), with entries separated by semicolons as in Countries / Territories, so an entry may contain a comma (e.g., "Horta, Faial; Lajes do Pico"). A list with no semicolon is split at commas.

A When in a voyage file may be written shorter or longer than the dropdowns write it: "Nov – Mar 2026" reads as November 2025 to March 2026, full month names ("June 2025 – August 2025") are read, a When written once fills both ends of the dropdowns, and the same month at both ends ("Jun – Jun 2025") is a full year, from June 2024. A When the dropdowns cannot show, such as "Summer 2025" or a year outside 1900–2199, appears under them as "Saved as “Summer 2025”. Choosing from the lists replaces it."

### Reordering chapters

Drag the **≡** handle on a chapter header to reorder chapters. Because chapter order defines the voyage sequence, reordering chapters changes which chapter is each one's predecessor — and therefore the approach-leg distance and the connection indicators (see Endpoint sync).

### Endpoint sync — the ⇄ button and 🔗 indicator

Because chapters share handoff points (Part 1), the editor shows a connection indicator in each chapter header:

1. **🔗 (linked)** — this chapter's first waypoint is within half a nautical mile of the previous chapter's last waypoint (the gap rounds to 0 nm). They already connect; nothing to do.
2. **⇄ (pull)** — there's a gap of half a nautical mile or more. Its tooltip names the previous chapter and the gap ("Pull start from chapter 3's endpoint (42 nm gap)").

The first chapter, and a chapter with no coordinates yet, shows neither.

The previous chapter is the nearest earlier chapter that has coordinates: a chapter with no waypoints yet, or none with coordinates, such as one still being planned, is skipped, so the chapter after it connects to (and measures its approach leg from) the one before it.

Clicking ⇄ **inserts a copy** of the previous chapter's last waypoint as a new first row in this chapter. It does **not** move or overwrite the existing first waypoint — that point stays exactly where it is, name and coordinates intact. After the pull, this chapter begins precisely where the previous one ended, the gap closes, and the indicator flips to 🔗. The inserted row carries the full identity of the handoff point (name, coordinates, country, notes and any M/G/D flags); if the predecessor ended at an unnamed shaping vertex, the inserted row is an unnamed shaping vertex.

Insertion is deliberate: overwriting the first waypoint's coordinates would silently relocate a named point — "Funchal" could end up well offshore while still labeled "Funchal" — and distort the chapter's distance. Insertion is safe and reversible: an unwanted new row can simply be deleted.

### Deleting a chapter

The ✕ at the right of a chapter header deletes the chapter after a confirmation ("Delete chapter 4, “Azores”? This cannot be undone."); the chapters after it are renumbered.

## Waypoints

Open a chapter's waypoint table with the 📍 toggle in its header. The table's toolbar holds, left to right, **+ Add row**, **+ Add N rows**, **Paste** and **Look up countries**, then a count of rows and named waypoints. The table's columns run ≡ (drag), #, Name, Lat, Lon, M, G, D, Country, Notes and ✕.

### Adding waypoints

A waypoint added by clicking the chart (Rapid click) or from a search goes to the *active* chapter, so a chapter must be selected (click it in the list) first. The **+ Add row**, **+ Add N rows** and **Paste** buttons add to their own chapter. There are five ways to add points (a ghost midpoint on the chart also inserts one; see Adjusting waypoint positions):

1. **+ Add row** — adds one blank row after the selected row (or at the end when no row in this chapter is selected) and selects it, ready to type into.
2. **+ Add N rows** — opens "Add multiple rows", which appends the number of blank rows asked for (10 by default, up to 500) to the end of the table (useful before a paste or bulk entry).
3. **Paste** — paste tabular data (e.g., from a spreadsheet) into the paste dialog; each line becomes a row. Columns are split at tabs when the pasted text contains a tab, and at commas otherwise. The columns, in order: name, lat, lon, then optionally major, decision, gateway, country and notes (the table shows Gateway before Decision). Coordinates are read as the waypoint table reads them, so a decimal comma ("38,53"), a hemisphere letter ("38.53S") or degrees and minutes ("16°30'W") read as decimal degrees. A coordinate that cannot be read, or a latitude beyond ±90, is left empty, the status bar says how many (after any name lookups the paste started have finished), and that row is not looked up by name. A line with every cell empty is skipped. A paste with 30 or more names to look up asks first, in a "Look up coordinates" dialog like the one Look up countries shows; Cancel keeps the rows, without coordinates.
4. **Click on the chart** — with **Rapid click** ON (the toggle at the right of the status bar, below the chart; its tooltip reads "Each click on the chart adds a waypoint at the end of the selected chapter"), each click on the chart drops a new waypoint at that location. Standard chart navigation still works in this mode: drag to pan and scroll to zoom; only the single click is repurposed to place a waypoint. Turn the mode OFF to return the single click to normal selection. Rapid click with no chapter selected says so in the status bar.
5. **Search (Nominatim)** — type a place name of two or more characters in the search box and press **Enter** (or click **Search**) to search; typing alone sends nothing. A result is added with a click or from the keyboard (see Keyboard shortcuts). Adding a result appends a waypoint named after the place, with its coordinates and country filled in, and selects it. A search that finds nothing says "No places found" in the results box, and one that fails says so there too. A search with no chapter active pans the chart to the result and prompts for a chapter rather than dropping the point; the query stays in the box, so the result can be picked again once a chapter is selected.

### Geocoding (name ↔ coordinates)

The editor uses the free Nominatim (OpenStreetMap) service two ways:

1. **Forward** — type a name into the Name field of a row that has no coordinates (or paste a name-only row) and the editor looks up the coordinates. Because the country rides along free in that same lookup (and in a search result), it fills the country too — but only when the country field is empty, so a hand-typed value is never overwritten.
2. **Reverse — Look up countries** — for waypoints placed by coordinates (a chart click or typed lat/lon), no country is known yet. The **Look up countries** button reverse-geocodes every such waypoint that has coordinates but no country, filling it from the position. This runs at two scopes — each chapter has its own **Look up countries** button, and a single **🌍 Look up all countries** button above the chapter list does the same sweep across every chapter at once, handy after importing a batch of coordinate-only waypoints. This is the one path that costs a *dedicated* lookup, which is why it's a deliberate button press rather than automatic.

Before a long sweep runs, the editor shows a quick confirmation — how many waypoints it will look up and a rough time estimate at one per second — so a long run is never a surprise. The all-chapters sweep always confirms; a per-chapter sweep confirms only when 30 or more waypoints are eligible. While a sweep runs, the status bar shows live progress ("Looking up 3 of 40… ~1 min remaining"); when it finishes it shows how many were found and, when some can't be placed — an open-ocean shaping vertex Nominatim has no entry for, say — how many were not found ("Found 38 of 40 — 2 not found"), rather than implying every one succeeded. A country cell that already holds a value is flagged, so it is clear at a glance which cells a sweep will skip; it never overwrites a hand-typed value.

While any lookup is in flight, both the per-chapter **Look up countries** and the global **🌍 Look up all countries** buttons are visibly grayed and disabled, re-enabling only once the queue has drained. That stops a second click from stacking a duplicate sweep onto a queue already running.

A name or country lookup that answers while an entry is being typed into that row's latitude, longitude or country field leaves the field as it is being typed, and a country lookup answered while a coordinate is being typed is dropped, since it is for the old position; a field the cursor has only moved into still takes the answer.

**Rate limit:** Nominatim's usage policy allows one request per second. The editor sends every geocoding request (searches, name lookups and country lookups) through one queue that spaces them accordingly, so a paste of many named rows fills in gradually rather than all at once. A search goes to the front of that queue, so even while a long country lookup runs it is sent next, usually within about a second.

**Caching:** answers are kept in memory for the session, including "nothing found" answers, as the usage policy requires. Repeating a lookup (running **Look up countries** again over points in open water, say) is answered from memory without a new request. Reloading the page clears the cache.

### Adjusting waypoint positions

1. **Drag the marker** on the chart to reposition it; lat/lon update live. The selected chapter's markers drag, shaping vertices included.
2. **Edit lat/lon** directly in the table fields, or use the up and down arrow keys for fine nudges: each step moves 0.01 of a degree, about 0.6 nm of latitude, and keeps the value's other digits.
   1. A coordinate can be typed in decimal degrees (38.53, or -28.63 for west), with a hemisphere letter before or after the number (38.53N, 28.63W, S 38.5), in degrees and minutes or degrees, minutes and seconds (38°31.8'N, 28 37 48 W), or with a decimal comma (38,53); it is stored and shown in decimal degrees, and the status bar says what a value typed another way was read as.
   2. N or S belongs to a latitude and E or W to a longitude, and a sign with a letter says the direction twice, so these, and anything else that cannot be read, are refused, and the field goes back to its value.
   3. A typed latitude beyond ±90 is refused the same way, and a typed longitude outside -180 to 180 is brought into that range (200 becomes -160, and 180 becomes -180, the same meridian).
   4. Editing a latitude or longitude updates the connection indicators (🔗 or ⇄) and the distances in place, so **Tab** moves straight on to the next field.
3. **Drag or click a ghost midpoint** — each leg of the selected chapter shows a faint "ghost" marker at its midpoint (its tooltip reads "Click or drag to add a vertex here"); drag it to insert a new shaping vertex where it is dropped, bending the route, or click it to insert one at the midpoint. (Ghost midpoints sit *on* the rendered line, even on long ocean legs.) A ghost shows only where its leg is at least 32 px long on screen, so it clears the dots at both ends: on a shorter leg it would sit on a waypoint's dot, and a press could take the waypoint instead. Zooming in brings it back.

### Selecting a waypoint (chart ↔ list)

Clicking a **marker** on the chart selects that waypoint (a press that moves less than 3 px counts as a click, so a slight shake of the hand selects rather than moves it): the marker grows and turns crimson, and its row in the table is highlighted, scrolled into view and briefly flashed. Clicking a waypoint's **sequence number** in the table does the same and also zooms the chart to that point and makes its chapter active — handy for jumping straight to a point on a long leg. Focusing any field in a different row also selects that row's waypoint, lighting its marker on the chart without moving the chart or stealing focus from the field being edited. Adding a single waypoint — with **+ Add row**, from a search result or by dragging or clicking a ghost midpoint — selects the new row too; Rapid click and paste do not, so a run of additions doesn't keep moving the table, and a search or ghost-midpoint addition leaves a collapsed table collapsed. Focusing a row's ✕ to delete it leaves the selection where it was. Only one waypoint is selected at a time, and the selection stays on that waypoint when other rows are deleted, added or reordered around it.

The selection clears on switching to another chapter (a click on its own chapter, or a chapter reorder, keeps it), on pressing **Escape** (outside the search box), or on clicking empty chart space away from any marker — any of which removes the row highlight and returns the marker to its normal style.

### Reordering waypoints

Drag the **≡** handle on a row to reorder waypoints within a chapter.

### Deleting waypoints

1. **Row ✕** — click the ✕ at the end of a waypoint row to remove it (no confirmation).
2. **Right-click the marker** on the chart — opens a confirmation ("Delete “Horta” from chapter 3? This cannot be undone."), then removes the waypoint. This works on the selected chapter's markers; on another chapter's, right-click does nothing, so select that chapter first.

## Voyage Settings (⚙)

The ⚙ **Voyage Settings** panel at the top of the chapter panel (a click on its header opens or closes it) holds voyage-level settings, saved in the voyage file and restored when it is loaded; a CSV import starts from the defaults:

1. **Voyage Title** — the title shown in both tools' headers and page titles, saved in the voyage file and used as the name of the KML document and of the GPX file. Free text: include a vessel, a vehicle or anything else, or leave it blank to fall back to the default "Voyage Atlas".
2. **Distance Units** — the unit for every distance shown, in the editor and in the viewer, which reads it from the voyage file: nautical miles (default), kilometers or miles. Stored distances stay in nautical miles whatever the unit.
3. **Distance Override** — force the displayed total to a specific number, replacing the computed sum. Entered and shown in the selected unit, stored as nautical miles, so the tile shows the figure as typed. A value of 0 or less, or a blank field, clears it. The header stat tile marks an active override with a ⚙.
4. **Nations** — force the nations count, replacing the automatic classification. A whole number, and 0 is a valid count; a blank field clears it.
5. **Territories** — the same for the territories count (0 for a voyage with no territories, say).

In the editor's header an override of 0 still shows its tile, marked with the ⚙; the viewer shows no tile for a count of 0.

## Header stats

The editor header shows the live totals as tiles: distance, Nations, Territories, Chapters, Waypoints (named waypoints with coordinates, a shared handoff point counted once) and Vertices (shaping vertices). A tile with nothing to count is left out, except Chapters and an override, which shows even at 0. These recompute on every edit, using the same logic the viewer uses (see "What do the header stats show?" in Part 1). A ⚙ marker on a tile means that figure is a manual override set in Voyage Settings rather than the computed value. On a screen 900 px wide or less the editor hides the tiles, leaving room for the title and buttons (the viewer moves its stats into the Voyage Chapters drawer); each chapter's header still shows its distance.

The footer carries, left to right, a link to this manual, a link to the project site and the version, which links to that version's release notes on GitHub; the stats are not repeated there.

## Saving and exporting

1. **Save** — downloads the voyage file as `voyage-data.json`, the file the viewer loads automatically. Its tooltip reads "Download voyage-data.json".
2. **▾** beside Save (its tooltip reads "Export as JSON, CSV, KML or GPX") opens a menu:
   1. **JSON (timestamped)** — a dated snapshot of the voyage file.
   2. **CSVs (chapters + waypoints)** — the two CSVs together.
   3. **KML** — a Google Earth–compatible file whose document takes the voyage title as its name (waypoints and route lines per chapter, with styled markers for Major, Gateway and Decision), for viewing the voyage in Google Earth Pro.
   4. **GPX** — a GPX 1.1 file for chartplotters and navigation apps: each named waypoint once as a waypoint, and each chapter as a route of all its points in order, shaping vertices included.

Every file from this menu carries the date and time in its name (`2026-10-23-14-05-voyage-data.json`, `…-chapters.csv`, `…-waypoints.csv`, `…-voyage-route.kml`, `…-voyage-route.gpx`).

What each format carries:

1. **The voyage file (JSON)** is the complete, authoritative file. It carries the source data — chapters, waypoints, flags, settings and notes — in one structure. It does **not** store the computed figures (totals, per-chapter distances, derived country lists); both tools recompute those on load, so a hand-edited file never carries a stale number. This is what the viewer loads and what serves as the master file (`voyage-data.json`).
2. **The CSVs** are a convenience for spreadsheet editing: one for chapters, one for waypoints, exported together. Round-trip through a spreadsheet for bulk edits, then re-import. They carry no voyage title, settings or avoidance zones, so an import starts from the defaults. Both files start with a UTF-8 byte-order mark. A text cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return is written with a leading apostrophe, which the import takes off again.
3. **The KML** carries only the title, the routes and the named waypoints with their flags.
4. **The GPX** carries the title, every point with coordinates (named waypoints with their notes and flags, and shaping vertices) and the chapters as routes named "Ch N — Chapter Name". Imported back one chapter each, it gives the same chapters, names, points, notes and flags, a place visited twice included, for every chapter with a point with coordinates (a chapter with no name comes back named after the file's title with its place in the file after it, "Voyage Atlas 4"); the other chapter fields, the countries, the settings and the avoidance zones are not carried.

The data schema (field names, types, structure) is documented separately in [`voyage-atlas-schema.md`](voyage-atlas-schema.md) for hand-editing the voyage file.

The **Save** button reads `Save *` (with an "Unsaved changes" tooltip) whenever the voyage holds changes not yet saved — any edit to a chapter, a waypoint or a setting, including a country or coordinates filled in by a lookup. It returns to plain `Save` the moment the voyage is saved as JSON (**Save**, or **JSON (timestamped)** from the ▾ menu) or a different file is loaded. The CSV, KML and GPX exports leave it showing, since none of them reloads as the same voyage. Every action that would replace the current voyage warns first (see Getting data in). Closing or reloading the page with unsaved changes asks for confirmation first.

## Keyboard shortcuts

1. In the + Add N rows, CSV import, GPX import, delete (waypoint or chapter) and lookup dialogs: **Enter** confirms, **Escape** cancels. Enter on a focused button does what that button says, so a focused Cancel cancels. In "Discard unsaved changes?" Enter always keeps editing, and in the GPX import's Replace confirmation it keeps the rows, and in the paste dialog Enter inserts a newline (item 2).
2. In the paste box: **Cmd/Ctrl+Enter** adds the rows, while plain **Enter** inserts a newline (allowing multi-line content to be pasted or typed first). **Escape** closes the dialog.
3. In the Nominatim search box: **Enter** searches; once results show, **↑/↓** move through them, **Enter** adds the highlighted result (or the top one, when none is highlighted), **Escape** dismisses the results, or the line saying none were found. A **second Escape** (once the results are already dismissed) clears the typed query.
4. In a Lat or Lon field: **↑/↓** step the value by 0.01°.
5. On the arrival chooser: **Escape** dismisses it, as its × does.
6. With the Load or ▾ menu open: **Escape** closes it.
7. With a waypoint selected and no dialog open: **Escape** clears the selection, except in the search box, where it only dismisses the results and then the query.

---

# Part 3 — Using the viewer

`voyage-atlas.html`. A read-only, interactive chart of a voyage — what gets published or shared.

## Loading data

The viewer finds its voyage file the same way the editor does: the `URL_VOYAGE_DATA` constant in the configuration block at the top of its script (`voyage-data.json` by default), or `?data=path` for a single visit; either may be a relative path or a full address on the same site (see "Getting data in" in Part 2).

1. **Auto-display.** When the configured file resolves, the viewer loads and displays it on open — the basis of the self-hosting model (below). A file that is present but unreadable opens the chooser with a note saying so rather than being treated as absent, and a `?data=` file that is not found gets a note too. The viewer reads a file exactly as the editor does, including the corrections a hand-edited file gets on load (see "Getting data in" under the editor); it applies them without listing them.
2. **Chooser.** When the configured file resolved, the chooser opened later with **Load…**, or with `?import=yes`, offers "Explore this voyage" ("Open the voyage published on this site.") and then "Load a voyage file…"; when no file resolves, the viewer opens the chooser with "Load a voyage file…" only. Earlier formats are no longer supported. A malformed file is reported rather than silently swallowed; the voyage already on screen stays as it was.
3. **Load button.** The header carries a **Load…** button (in the ☰ drawer on a screen 900 px wide or less) that opens the chooser at any time, so a different voyage can be opened without editing the URL. Once a voyage is shown the viewer remains read-only; the Load button only swaps which voyage is displayed. When a voyage is already on screen, the chooser can be dismissed without choosing — its close (×) button, a tap outside the box or the Escape key all return to the current voyage. At a cold start, with no voyage behind it, the chooser stays open until an option is picked, and the header reads "Load a voyage file to explore".
4. **Force the chooser.** Adding `?import=yes` to the viewer's URL opens the chooser on arrival even when the configured file would otherwise auto-display — handy for opening a different file without removing the default. The match is case-insensitive (`yes`/`YES`/`Yes`).

On load, how the viewer frames the chart depends on the voyage's span. A voyage that fits within a single (non-repeating) view of the world — a coastal cruise, one ocean, a season — is framed whole, so it opens on its own region. A voyage that wraps most or all of the way around the globe can't be shown complete in one view without the world repeating, so instead the viewer anchors on the **current chapter** (taken from each chapter's era, falling back to the first upcoming chapter, then the last) and shifts the frame so the route opens toward where the voyage is heading — the point it departs from sits near the trailing edge, with the rest of the width given to the passages ahead. That view opens one step wider than the widest single view of the world, for breathing room, so a sliver of the world's next copy can show at the sides. Where that view would leave the world shorter than the chart, as on a phone held upright, it opens closer instead, so the world always fills the chart from top to bottom.

In either case, where the opening view would leave any of the current chapter's points off the screen or under a panel, as a narrow screen can, the viewer frames the current chapter instead. No chapter is selected to start.

## The chart's panels

The on-chart panels sit in the four corners: zoom controls top-left, **Chart & Layers** top-right, the **Chapters** list bottom-left and the chapter's **detail panel** bottom-right. Clicking the title of Chart & Layers or of the Chapters list collapses or expands that panel. (On a phone, 640 px or less, Chart & Layers runs across the top of the chart below the zoom control, starting collapsed so it does not cover the chart; the Chapters list gives way to the ☰ drawer; and the detail panel becomes a sheet along the bottom.) On a short screen, such as a phone held sideways, Chart & Layers also starts collapsed and the detail panel stays below its collapsed bar; opened, Chart & Layers shows above the detail panel. On a phone held sideways the detail sheet is at most 96 px tall, showing the chapter's When, name and distance with the rest scrolling, and it opens at its top for each chapter picked.

The ☰ button at the left of the header opens the **Voyage Chapters** drawer: one row per chapter with its When, name and key destinations, and a "No route" badge on a chapter with nothing to chart. On a screen 900 px wide or less the drawer also holds, top to bottom, **Chart your own voyage →**, the header stats and **Load…**; on a phone it takes the place of the Chapters list. In the header, **Chart your own voyage →** opens the editor.

The header stats follow the shared rules (Part 1); the viewer leaves out a tile with nothing to count, an override of 0 included.

## Reading the chart

Each chapter is drawn in its own color, with named waypoints as markers and the route line tracing all points in order. Click a waypoint for its name and the chapter's When; a major port is marked "Major port".

## Selecting a chapter

Click a chapter in the Chapters list or the drawer (or its route on the chart) to focus it. The selected chapter's route and waypoints stay at full strength while every other chapter dims, so the active one stands out; the chart eases to that chapter's extent (one step wider than a tight fit, so it isn't pinned to the edges or hidden under the corner panels), and the detail panel opens. A chapter picked on the chart is scrolled into view in the Chapters list. The selected chapter's waypoints sit above its route, so each can be clicked for its popup, and the Decision and Gateway shapes of the other chapters dim with their dots.

The detail panel shows, top to bottom, the chapter's When, its name, its distance, its notes, its countries and territories and a "Read the posts →" link when a blog URL is set.

Past chapters are dimmed in the Chapters list and the drawer (a muted name and a faded swatch) but open like any other, and a chapter of a single named point, such as a season at one marina, opens framed on that point; only a chapter with nothing on the chart, no route and no named point, shows "No route" and cannot be selected.

On a screen 900 px wide or less, picking a chapter in the drawer closes the drawer, as loading a voyage from it does. On a phone (640 px or less) the chapter is framed in the part of the chart between the Chart & Layers panel and the detail panel, and on a short screen of any width (560 px tall or less, such as a phone held sideways) between Chart & Layers and the taller of the Chapters list and the detail panel, as far as that band allows.

Clearing the selection — with the detail panel's ×, Escape or a click on empty chart (a double-click zooms and keeps it) — restores all chapters to full strength. Escape while the chooser is open only closes the chooser.

## Layer toggles

Five layers can be switched on and off:

1. **Routes** — the chapter route lines (on by default): solid for past and current chapters, dashed for planned ones, as the key under the toggle shows.
2. **Waypoints** — the waypoint markers (on by default).
3. **Avoidance zones** — piracy/avoidance-zone rectangles, if present (off by default).
4. **Decision points** — diamonds at decision waypoints (off by default).
5. **Gateway ports** — stars at gateway waypoints (off by default).

The Decision and Gateway layers add their shapes *on top of* the normal waypoint circles. Turning the Decision or Gateway layer off hides its shapes and leaves the waypoint circle. A waypoint that is both a Decision and a Gateway shows the Decision diamond on top when both layers are on.

## Self-hosting

Put `voyage-atlas.html` and `voyage-data.json` (and `voyage-atlas-editor.html`, when the editor is offered too) in the same directory on any static web host, or serve the folder locally over HTTP, and the chart loads automatically — no build step, no server code, no database. (Opened straight from disk as a `file://` page, the viewer cannot read the voyage file beside it, so it opens to its chooser, with a note saying why, where a voyage file can be picked instead.) To update the published chart, replace `voyage-data.json` with a fresh export. The repository also ships optional icon assets and `site.webmanifest` for the favicon and home-screen icons; they sit alongside the HTML when wanted and can be omitted without affecting how the tool runs.

### Pointing the links at a self-hosted copy

The viewer's "Chart your own voyage" links, in the header and the Voyage Chapters drawer, take their address from `URL_EDITOR` in the viewer's configuration block, the published editor by default; a copy that offers its own editor points it there. The canonical, `og:url`, `og:image` and `twitter:image` tags at the top of each page also name the published site, under a comment that marks them; a self-hosted copy points them at its own address, serving the preview image from its copy of `docs/voyage-atlas-preview.webp`.

### Changing the basemap or the geocoder

Both settings live in a labeled configuration block at the top of each tool's script, alongside the voyage-file path. The basemap tile layers are `URL_TILE_LIGHT` (light theme) and `URL_TILE_DARK` (dark theme), in both tools; the default is CARTO's Positron and Dark Matter. CARTO serves these tiles only with an API key, set as `TILE_KEY` in the same block; without one the chart still works, but every tile carries an "API key required" watermark. A key is free for most sites and is requested at [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/); each site needs its own. A hosting server can supply the key at run time as `window.VOYAGE_ATLAS_CONFIG.tileKey`, set in a plain inline script (not `async`, `defer` or a module) placed before the tool's own script, which takes precedence over the constant, so the key never has to be written into the file. Replacing those URLs with another tile provider's template changes the chart's appearance — and if the provider is changed, the attribution on the two tile layers (the configuration block's comment points to them) should be updated to match that provider's terms. The editor additionally has `URL_GEOCODE`, the base URL of the geocoder used for name-to-coordinate search and reverse country lookup; it defaults to the public Nominatim service and can be pointed at a different Nominatim-compatible instance. The one-request-per-second pacing on geocoding is fixed in the code rather than exposed as a setting, because it is what the public Nominatim usage policy requires; a private instance with a different policy would still be reached at that pace.

---

# Part 4 — Design principles

## Why self-contained HTML files?

Each tool is a single HTML file with all its CSS and JavaScript inline, pulling only well-known libraries from a CDN (Leaflet in both tools; SortableJS and PapaParse in the editor), each pinned to an exact version with an integrity hash. When one does not arrive (a marina network, a captive portal, a content blocker or a file refused by its hash), a notice across the top of the page names it and says what cannot work without it: without Leaflet there is no chart and the page's controls are off; without Leaflet's style sheet the chart draws badly; without SortableJS rows and chapters cannot be dragged into a new order; and without PapaParse Paste and the CSV import and export are off. No build step, no framework, no server. The same file works whether opened from the local file system, hosted on a static server or handed to someone else; opened from disk, it loads a voyage from the chooser rather than on its own. One file, one behavior, nothing to install.

The editor and viewer are deliberately *vanilla* (not React or another framework): a framework would need a build pipeline to host, defeating the "open it anywhere" goal.

## Why is the data separate from the tool?

The tools are generic; the voyage lives in `voyage-data.json`. Separating data from code means the same editor and viewer work for any voyage, the data is portable and inspectable and the data file can be versioned, backed up or shared on its own. The viewer loads data at runtime rather than having it baked in.

## Can the voyage file be loaded from a web address?

Only from an address on the same site as the tool: a relative path, or a full address with the same protocol and host, whether through the `URL_VOYAGE_DATA` constant or the `?data=` parameter. A file on another site is not loaded. This is a deliberate choice, not an oversight. Whether a file on another site can be read depends on that site's settings, which a static page cannot control, so web addresses on other sites would work for some hosts and fail for most, which is worse than not offering them. Loading from the same site keeps it predictable: the file travels with the tool. A voyage file from another site could also carry script that would run in this site's pages. (Opt-in loading from other sites is noted in the enhancements backlog.)

## What leaves the browser?

The voyage itself stays in the browser: nothing is uploaded, and a voyage file is read from this computer or from the same site. Both tools load their fonts from Google Fonts (`fonts.googleapis.com` and `fonts.gstatic.com`), their libraries from cdnjs (`cdnjs.cloudflare.com`; Leaflet in both, SortableJS and PapaParse in the editor) and the basemap tiles from CARTO (`basemaps.cartocdn.com`). Each of these requests carries the visitor's address. The editor also sends the configured geocoder (`URL_GEOCODE`, Nominatim by default) the place names typed into search or into the Name of a row with no coordinates, and the coordinates of each point whose country it looks up. The tools send nothing anywhere else; a site that publishes them may add services of its own.

## Why is data correctness the navigator's responsibility?

The atlas is a faithful instrument, not a nanny. It draws what is entered and counts what is charted — including backtracks, overshoots or a waypoint that lands on a beach. Sometimes those are mistakes; just as often they're deliberate (a planned dogleg, a waypoint placed on a headland as a visual reference). The tool can't tell the difference, and trying to "protect" the navigator from their own data would mean overriding intent it can't read. The detail level, and the accuracy, belong to the navigator. When something looks wrong on the chart, the fix is in the data.

This is the same posture as the name (see the top of this document): the atlas shows what has been charted. The judgment stays with the navigator.

## Where does this tool stop?

Voyage Atlas manages *strategic* chapter-and-waypoint data — the shape and sequence of a voyage. It is **not**:

1. A **live tracker** — it doesn't show where the boat is now.
2. A **tactical passage planner** — weather windows, tidal gates and anchorage selection live in dedicated tools (LuckGrib, Navily, NoForeignLand).

It's the framework atlas: the charted intentions to navigate by, kept deliberately separate from the day-to-day tactics of actually sailing them.

---

*Companion documents: [`voyage-atlas-schema.md`](voyage-atlas-schema.md) (the data format), [`voyage-atlas-enhancements.md`](voyage-atlas-enhancements.md) (closed ideas with the reason for each) and the [changelog](../CHANGELOG.md) (version history).*
