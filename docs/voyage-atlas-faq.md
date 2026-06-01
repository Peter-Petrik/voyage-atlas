# Voyage Atlas — FAQ & Owner's Manual

Voyage Atlas is a pair of self-contained web tools for charting a long voyage as a sequence of
**chapters** — strategic groupings of waypoints by region and season. The **editor**
(`voyage-atlas-editor.html`) is where you build and maintain the data; the **viewer**
(`voyage-atlas.html`) is the read-only interactive map you share or host.

This document is the reference manual for both. It has four parts:

1. **Concepts** — the shared model both tools rest on (read this first)
2. **Using the editor** — building and maintaining your atlas
3. **Using the viewer** — exploring and hosting the map
4. **Design principles** — why the tool works the way it does

---

## Why "Atlas," not "Planner"?

In the cruising community, *plan* is a dangerous four-letter word — *"sailors' plans are written
in sand and at low tide."* Most trouble at sea comes from being committed to a *planned* activity:
a relocation on a date, a fixed arrival to collect crew, a place you decided to be regardless of
what the weather and the boat are telling you. We all plan, but the word invites the wrong posture.

An **atlas** is a collection of charts. That is exactly what this tool holds: a set of charted
routes, organized into chapters, that you navigate *by* — not a schedule you are bound *to*. The
name reflects and respects how cruising actually works. Routes are options and intentions; the
atlas shows you what you've charted, and the sailing is always yours to adjust.

This posture runs through the whole tool. **The atlas shows you what you enter.** If you chart a
backtrack, a waypoint on land, or a leg that overshoots a harbor, the tool renders it faithfully
and counts it honestly — it does not second-guess you or quietly "correct" your data. Accuracy of
the data is the navigator's responsibility, by design (see Part 4).

---

# Part 1 — Concepts

These ideas are shared by both the editor and the viewer.

## Why "chapters" instead of "legs"?

A voyage of this scale isn't a flat list of passages — it's a sequence of *phases*, each with its
own season, region, and character. A chapter groups the waypoints of one such phase (e.g.,
"Morocco & Madeira," "Nordic & Svalbard," "Patagonia & Channels"). Chapters carry the strategic
metadata that individual legs can't: the season window ("When"), the era (past / current /
future), the countries touched, key destinations, and a narrative note.

Thinking in chapters keeps a multi-year, tens-of-thousands-of-mile voyage comprehensible. The map
colors each chapter distinctly so the arc of the voyage reads at a glance.

## What is a "shaping vertex"?

Every chapter is a single ordered list of waypoints. Each waypoint is one of two kinds:

1. **A named waypoint** — it has a name. It renders as a marker on the map and counts in the
   named-waypoint total.
2. **A shaping vertex** — it has coordinates but *no name* (the row shows "(shaping vertex)" in
   the editor). It draws no marker; it only shapes the route line so the path bends correctly
   (around a cape, along a coast, through a strait).

The route line connects every point in order, named or not. Shaping vertices let you draw a
realistic track without cluttering the map with markers for every turn. To convert a marker into a
shaping vertex, clear its name; to promote a shaping vertex to a marker, give it a name.

## What do the three waypoint flags mean?

Each waypoint has three independent checkboxes — **M**, **D**, **G** — that control emphasis and
meaning:

1. **M — Major.** A strategic hub (a major port or landfall). Renders as a larger circle.
2. **D — Decision.** A point where the route forks or a go/no-go choice is made. Renders as a
   diamond.
3. **G — Gateway.** A threshold into a new region (a cape, canal, strait, or chokepoint). Renders
   as a star.

They are independent and combinable — a port can be Major *and* Gateway. When more than one is
set, the visual priority is **Decision > Gateway > Major** for the marker shape, and Major adds
size. The flags are optional; a plain named waypoint with no flags is a normal circle.

## How is distance (nm) calculated?

Each chapter's distance has two components:

1. **Within-chapter distance** — the sum of great-circle (haversine) legs between the chapter's
   points, in order, multiplied by the chapter's **Pad Multiplier**. The pad accounts for the real
   sailing a straight-line track undercounts: tacking, exploration within a cruising ground,
   detours, and gunkholing. A delivery passage might use 1.05; a season of loch-hopping in Scotland
   might use 3.00.
2. **Approach leg** — the "getting to the start point" distance: the raw, *unpadded* great-circle
   distance from the previous chapter's last waypoint to this chapter's first waypoint. It is raw
   (no pad) because it's a delivery passage between regions, not exploration.

So: **chapter nm = (within-chapter base × pad) + approach leg.** The voyage total is the sum of all
chapters.

Distances are always computed and stored in nautical miles; the on-screen unit (nm, kilometers, or
miles) is a display-only choice in Voyage Settings and never changes the stored data or exports.

When two chapters share an endpoint (the common case — see the next question), the approach leg is
zero, so it adds nothing. It only contributes when there's a genuine gap between chapters.

## Why does the connecting leg count toward the destination chapter?

The transit *to* a new chapter's starting point belongs to that new chapter's planning window and
seasonal context — it's the first thing you do in that phase, not the last thing you did in the
previous one. So the approach leg is attributed to the destination (the chapter you're arriving
into), not the origin.

## How do chapters connect? (Shared endpoints)

Chapters are meant to connect end-to-start: a chapter usually begins exactly where the previous one
ended. In the data, this means the **same handoff point appears twice** — as the last row of one
chapter and the first row of the next, at identical coordinates. For example, Gibraltar is both
the last waypoint of the Mediterranean chapter and the first waypoint of the Morocco chapter.

This duplication is intentional and correct. The legs don't overlap (one chapter's last leg
*arrives* at the handoff; the next chapter's first leg *departs* from it), so nothing is
double-counted, and the approach leg between them is zero. The editor's pull-sync feature (Part 2)
exists to create and maintain these shared endpoints.

A genuine *gap* — where one chapter ends somewhere the next doesn't begin — is rare and usually
intentional (e.g., a long repositioning passage). The tool counts the gap as the destination
chapter's approach leg.

## How are nations and territories counted?

The hero stats distinguish **nations** (sovereign countries) from **territories** (overseas
territories and dependencies). Each distinct country across all chapters' effective lists is classified
automatically against a built-in reference list of ~65 territories (UK, French, Dutch, US, Danish,
Norwegian, Australian, NZ, Portuguese, Spanish, and Chinese overseas territories, plus the Crown
Dependencies). Anything not on the territory list counts as a nation.

Both counts can be overridden in Voyage Settings if the automatic classification isn't what you
want. Separately, each chapter's country list is derived from its own waypoints' countries and can be
replaced with a per-chapter override (the chapter's Countries / Territories field) — useful for a curated list that
differs from what the waypoints imply. The voyage total is the classified union of every chapter's
effective list.

**Caveat:** the country values come from Nominatim geocoding, which sometimes returns the
*parent nation* rather than the territory — e.g., a waypoint in the Azores may come back as
"Portugal," and Réunion as "France." When that happens the auto-count reflects the parent nation,
not the territory. Either correct the country value on the waypoint, or set the territory override
in Voyage Settings.

## What's the difference between the JSON and the CSV exports?

1. **JSON** is the complete, authoritative file. It carries the source data — chapters, waypoints,
   flags, settings, and notes — in one structure. It does **not** store the computed figures (totals,
   per-chapter distances, derived country lists); both tools recompute those on load, so a hand-edited
   file never carries a stale number. This is what the viewer loads and what you keep as your master
   file (`voyage-data.json`).
2. **CSV** is a convenience for spreadsheet editing. There are two CSVs — one for chapters, one for
   waypoints — and the editor exports both together in one action. Round-trip through a spreadsheet
   when you want to bulk-edit, then re-import.

The data schema (field names, types, structure) is documented separately in
`voyage-atlas-schema.md` if you ever hand-edit the JSON.

---

# Part 2 — Using the editor

`voyage-atlas-editor.html`. Open it in any modern browser, from your file system or a host.

## Getting your data in

There are several ways to populate the atlas:

1. **Auto-load.** If a file named `voyage-data.json` sits in the same directory as the editor, it
   loads automatically on open — the normal way to resume work on a hosted or local copy. A file that
   is present but unreadable now shows a clear error rather than silently opening empty.
2. **Load JSON.** Open any atlas JSON (v2 or v3; a v2 file is migrated to the v3.0 model on load). The
   legacy v1 baked-map format is no longer supported — the editor rejects a v1 file with a clear
   message rather than risk mangling its geometry. A malformed file is reported, not silently swallowed.
3. **Import CSV.** Load the chapters and waypoints CSVs.
4. **Start fresh.** With no `voyage-data.json` present, the editor opens empty; add a chapter and
   begin.

## Adding waypoints

Within a chapter, there are five ways to add points:

1. **+ Add row** — appends one blank row to type into directly.
2. **+ Add N rows** — appends several blank rows at once (useful before a paste or bulk entry).
3. **Paste** — paste tabular data (e.g., from a spreadsheet) into the paste dialog; each line
   becomes a row.
4. **Click on the map** — with **Rapid click** mode ON (toggle above the map), each click on the
   map drops a new waypoint at that location. Turn it OFF to return to normal map interaction.
5. **Search (Nominatim)** — type a place name in the search box and press **Enter** to search; use
   the **arrow keys** to move through results, **Enter** to add the highlighted one, **Escape** to
   dismiss. Adding a result drops a waypoint with coordinates (and country, when empty) filled.

## Geocoding (name ↔ coordinates)

The editor uses the free Nominatim (OpenStreetMap) service two ways:

1. **Forward** — type a name into a waypoint's Name field (or pick a search result, or paste a
   name-only row) and the editor looks up the coordinates. Because the country rides along free in
   that same lookup, it fills the country too — but only when the country field is empty, so a value
   you typed by hand is never overwritten.
2. **Reverse — Look up countries** — for waypoints you placed by coordinates (a map click or typed
   lat/lon), no country is known yet. The **Look up countries** button reverse-geocodes every such
   waypoint that has coordinates but no country, filling it from the position. This runs at two
   scopes — each chapter has its own **Look up countries** button, and a single
   **🌍 Look up all countries** button above the chapter list does the same sweep across every
   chapter at once, handy after importing a batch of coordinate-only waypoints. This is the one path
   that costs a *dedicated* lookup, which is why it's a deliberate button press rather than automatic.

Before a long sweep runs, the editor shows a quick confirmation — how many waypoints it will look up
and a rough time estimate at one per second — so a long run is never a surprise. The
all-chapters sweep always confirms; a per-chapter sweep confirms only when 30 or more waypoints are
eligible. While a sweep runs, the status line shows live progress; when it finishes it shows how many
were actually resolved (for example "Geocoded 4/5") and, when some can't be placed — an open-ocean
shaping vertex Nominatim has no entry for, say — reports how many were left unresolved rather than
implying every one succeeded. A country cell that already holds a value is flagged, so it is clear at
a glance which cells a sweep will skip; it never overwrites a value you typed.

**Rate limit:** Nominatim's usage policy allows one request per second. The editor queues all
geocoding requests and spaces them accordingly, so a paste of many named rows will fill in
gradually rather than all at once. This is deliberate — firing requests in parallel would get the
service to rate-limit or block you.

While any look-up is in flight, both the per-chapter **Look up countries** and the global
**🌍 Look up all countries** buttons are visibly greyed and disabled, re-enabling only once the queue
has drained. That stops a second click from stacking a duplicate sweep onto a queue already running.

## Adjusting waypoint positions

1. **Drag the marker** on the map to reposition it; lat/lon update live.
2. **Edit lat/lon** directly in the table fields, or use the small steppers for fine nudges.
3. **Drag a ghost midpoint** — each leg shows a faint "ghost" marker at its midpoint; drag it to
   insert a new shaping vertex on that leg, bending the route. (Ghost midpoints sit *on* the
   rendered line, even on long ocean legs.)

## Selecting a waypoint (map ↔ list)

Clicking a **marker** on the map selects that waypoint: the marker grows and turns crimson, and its
row in the table is highlighted, scrolled into view, and briefly flashed. Clicking a waypoint's
**sequence number** in the table does the same and also zooms the map to that point and makes its
chapter active — handy for jumping straight to a point on a long leg. Adding a waypoint selects the
new row too. Only one waypoint is selected at a time, and the selection clears when you switch to
another chapter.

## Reordering

Drag the **≡** handle on a row to reorder waypoints within a chapter. Drag the **≡** handle on a
chapter header to reorder chapters. Because chapter order defines the voyage sequence, reordering
chapters changes which chapter is each one's predecessor — and therefore the approach-leg nm and
the sync indicators (below).

## Endpoint sync — the ⇄ button and 🔗 indicator

Because chapters share handoff points (Part 1), the editor shows the connection state in each
chapter header:

1. **🔗 (linked)** — this chapter's first waypoint is within 1 nm of the previous chapter's last
   waypoint. They already connect; nothing to do.
2. **⇄ (pull)** — there's a gap (more than 1 nm). The tooltip shows the gap distance.

Clicking ⇄ **inserts a copy** of the previous chapter's last waypoint as a new first row in this
chapter. It does **not** move or overwrite your existing first waypoint — that point stays exactly
where it is, name and coordinates intact. After the pull, this chapter begins precisely where the
previous one ended, the gap closes, and the indicator flips to 🔗. The inserted row carries the
full identity of the handoff point (name, coordinates, country, and any M/D/G flags); if the
predecessor ended at an unnamed shaping vertex, the inserted row is an unnamed shaping vertex.

**Why insert rather than overwrite?** Overwriting the first waypoint's coordinates would silently
relocate a named point — "Funchal" could end up well offshore while still labeled "Funchal" — and
distort the chapter's distance. Insertion is safe and reversible: if you don't want the new row,
delete it. Pulling when already synced does nothing.

## Deleting waypoints

1. **Row ✕** — click the ✕ at the end of a waypoint row to remove it (no confirmation).
2. **Right-click the marker** on the map — opens a confirmation dialog, then removes the waypoint.

## Chapter metadata

Open a chapter's metadata panel (the 📋 toggle, or double-click the chapter header) to edit:

1. **Name** — the chapter's display name.
2. **When** — the season window. Enter it as a range; the editor normalizes separators to an
   en-dash (e.g., "May – Sep 2028"). Month/year dropdowns assist entry.
3. **Era** — past, current, or future (controls styling and timeline placement).
4. **Pad Multiplier** — the distance multiplier for this chapter (see distance calculation, Part 1).
5. **Countries / Territories** — auto-derived from the chapter's waypoint countries, in
   first-appearance order. Leave it blank to keep that automatic; type a comma-separated list to
   override it with a curated set (the override *replaces* the derived list, it does not add to it).
   Each entry is then classified as a nation or a territory against the built-in reference list,
   exactly as the voyage totals are.
6. **Key Destinations** — highlights for the viewer's chapter summary.
7. **Blog URL** — an optional link to a post about this chapter, surfaced in the viewer.
8. **Notes** — free-form narrative (routing thoughts, bail-out options, anything).

To open or close every chapter's panels in one go, use the compact controls above the chapter list:
**📋 ⊞ ⊟** for the metadata panels and **📍 ⊞ ⊟** for the waypoint tables. In each pair the **⊞** opens
every panel of that kind and the **⊟** closes them all.

## Voyage Settings (⚙)

The ⚙ panel above the chapter list holds voyage-level settings, saved into the JSON and reloaded on
import:

1. **Voyage Title** — the title shown in the page titles, the viewer header, and exports. Free
   text: include a vessel, a vehicle, or anything you like, or leave it blank to fall back to the
   default "Voyage Atlas".
2. **Distance Units** — the display unit for every on-screen distance: nautical miles (default),
   kilometers, or miles. Display-only; the stored data and all exports stay in nautical miles.
3. **Distance Override** — force the displayed total to a specific number, overriding the computed
   sum. Entered and shown in the selected display unit, stored as nautical miles. The footer marks
   an active override.
4. **Nations / Territories overrides** — force these counts, overriding the automatic
   classification.

## Saving and exporting

1. **Save** — downloads the master file as `voyage-data.json` (a fixed filename; your browser
   replaces the prior download). This is the file the viewer auto-loads.
2. **Save As ▾** — a dropdown for everything else: a timestamped JSON (a dated snapshot), the two
   CSVs together, and a KML.
3. **KML** export produces a Google Earth–compatible file (waypoints + route lines per chapter,
   with styled markers for Major/Decision/Gateway). Useful for viewing the voyage in Google Earth
   Pro.

The **Save** button reads `Save *` (with an "Unsaved changes" tooltip) whenever the document holds
edits you haven't written out yet — adding, moving, reordering or deleting a waypoint, or changing any
chapter or voyage setting all set it. It returns to plain `Save` the moment you Save (or load a
different file). As a backstop, the browser's own "leave site?" prompt fires if you try to close or
reload the tab while there are unsaved changes, so an accidental close won't quietly discard your work.

> Browsers can't silently write to a fixed file on disk, so "Save" downloads with a fixed name as
> the practical equivalent of overwriting. (A future enhancement may use the File System Access API
> for true in-place save on Chrome/Edge.)

## Keyboard shortcuts

1. In any dialog (bulk add, paste, CSV import, delete confirmation): **Enter** confirms, **Escape**
   cancels.
2. In the Nominatim search box: **Enter** searches; once results show, **↑/↓** move through them,
   **Enter** adds the highlighted result, **Escape** dismisses.

## Footer stats

The footer shows the live totals: distance, nations, territories, chapter count, named-waypoint
count, and shaping-vertex count. These recompute as you edit. An override from Voyage Settings is marked.

---

# Part 3 — Using the viewer

`voyage-atlas.html`. A read-only, interactive map of a finished atlas — what you publish or share.

## Loading data

1. **Auto-load.** If `voyage-data.json` is in the same directory as the viewer, it loads
   automatically on open — the basis of the self-hosting model (below). A file that is present but
   unreadable shows an error rather than the empty landing screen.
2. **File picker.** With no data present, the viewer shows a landing screen; pick a voyage JSON
   (v2 or v3) to load it. Loading lives only on this landing screen — once an atlas is shown the viewer
   is read-only. The legacy v1 format is no longer supported, and a malformed file is reported rather
   than silently swallowed.

## Reading the map

Each chapter is drawn in its own color, with named waypoints as markers and the route line tracing
all points in order. Click a waypoint for its name and the chapter's season; major ports are
marked. The hero stats at the top summarize the whole voyage.

## Layer toggles

Five layers can be switched on and off:

1. **Routes** — the chapter route lines (on by default).
2. **Waypoints** — the waypoint markers (on by default).
3. **Avoidance zones** — piracy/avoidance-zone rectangles, if present (off by default).
4. **Decision points** — diamonds at decision waypoints (off by default).
5. **Gateway ports** — stars at gateway waypoints (off by default).

The Decision and Gateway layers add their markers *on top of* the normal waypoint circles — so the
circle stays visible whether or not those layers are on. Turning a layer off hides its markers but
leaves the underlying waypoint circle.

## Day / night

A ◐ toggle flips the map between the light "admiralty chart" theme and a dark "deep sea" theme. The
route and marker colors are tuned to read on both.

## What the hero stats mean

The header shows total distance, the nations and territories touched, the chapter count, and the
named-waypoint count. **Both tools compute these from the chapters and waypoints every time a file
loads** — they are not stored in the file at all (as of v2.7), so the headline numbers always match
the drawn routes, even if you hand-edit the JSON (add a waypoint, change a country, remove a chapter).
Any explicit override set in Voyage Settings is applied on top. (Files saved before v2.7 may still
contain a `meta.hero` block; it is ignored on load.)

## Self-hosting

The viewer is designed to host as two files. Put `voyage-atlas.html` and `voyage-data.json` in the
same directory on any static web host (or open the HTML locally) and the map loads automatically —
no build step, no server code, no database. To update the published map, replace
`voyage-data.json` with a fresh export.

---

# Part 4 — Design principles

## Why self-contained HTML files?

Each tool is a single HTML file with all its CSS and JavaScript inline, pulling only well-known
libraries (Leaflet, PapaParse, SortableJS) from a CDN. No build step, no framework, no server.
This means the exact same file runs identically whether you open it from your file system, host it
on a static server, or hand it to someone else. One file, one behavior, nothing to install.

The editor and viewer are deliberately *vanilla* (not React or another framework): a framework
would need a build pipeline to host, defeating the "open it anywhere" goal.

## Why is the data separate from the tool?

The tools are generic; your voyage lives in `voyage-data.json`. Separating data from code means the
same editor and viewer work for any voyage, the data is portable and inspectable, and you can
version, back up, or share just the data file. The viewer loads data at runtime rather than having
it baked in.

## Why is data correctness my responsibility?

The atlas is a faithful instrument, not a nanny. It draws what you enter and counts what you
chart — including backtracks, overshoots, or a waypoint that lands on a beach. Sometimes those are
mistakes; just as often they're deliberate (a planned dogleg, a waypoint placed on a headland as a
visual reference). The tool can't tell the difference, and trying to "protect" you from your own
data would mean overriding intent it can't read. The detail level, and the accuracy, are yours. If
something looks wrong on the map, the fix is in your data.

This is the same posture as the name (see the top of this document): the atlas shows you what
you've charted. The judgment stays with the navigator.

## Where does this tool stop?

Voyage Atlas manages *strategic* chapter-and-waypoint data — the shape and sequence of a voyage. It
is **not**:

1. A **live tracker** — it doesn't show where the boat is now.
2. A **tactical passage planner** — weather windows, tidal gates, and anchorage selection live in
   dedicated tools (LuckGrib, Navily, NoForeignLand).

It's the framework atlas: the charted intentions you navigate by, kept deliberately separate from
the day-to-day tactics of actually sailing them.

---

*Companion documents: [`voyage-atlas-schema.md`](voyage-atlas-schema.md) (the data format),
[`voyage-atlas-enhancements.md`](voyage-atlas-enhancements.md) (planned features), and the
[changelog](../CHANGELOG.md) (version history).*
