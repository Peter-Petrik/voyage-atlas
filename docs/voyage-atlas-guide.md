# Voyage Atlas — Visual Guide

This guide draws Voyage Atlas: the two tools, their screens, the steps of charting a voyage and what happens beneath each step. It is a companion to the [FAQ / Owner's Manual](voyage-atlas-faq.md), which describes every feature in full; each figure links to the FAQ sections it illustrates.

The figures are arranged in four layers, numbered from 0, each a level deeper than the one before:

| Layer | What it draws |
|-------|---------------|
| 0 — The whole | The two tools and the voyage file between them. |
| 1 — The screens | Each tool's layout, with numbered callouts. |
| 2 — Charting a voyage | The steps from a blank chart to a published one. |
| 3 — Beneath the surface | The model and the rules each step follows. |

Figure numbers are fixed. Each figure has its own address, such as `voyage-atlas-guide.md#fig-2-4` for Figure 2.4, which stays the same when figures are added: a new figure takes the next free number in its layer, and the number of a figure taken out is not used again. The screens in Layer 1 are drawn with the sample voyage that comes with the tools (`voyage-data.json`), with the version in their footers written as vX.Y.Z, and follow the light or dark theme of the page they are read on.

## Figures

**Layer 0 — The whole**

1. [Figure 0.1: The two tools and the voyage file](#fig-0-1)

**Layer 1 — The screens**

1. [Figure 1.1: The editor screen](#fig-1-1)
2. [Figure 1.2: A chapter, part by part](#fig-1-2)
3. [Figure 1.3: The viewer screen](#fig-1-3)
4. [Figure 1.4: The viewer on a narrow screen](#fig-1-4)

**Layer 2 — Charting a voyage**

1. [Figure 2.1: Start to finish](#fig-2-1)
2. [Figure 2.2: Getting data in](#fig-2-2)
3. [Figure 2.3: Voyage Settings](#fig-2-3)
4. [Figure 2.4: Adding a chapter and its fields](#fig-2-4)
5. [Figure 2.5: Adding waypoints](#fig-2-5)
6. [Figure 2.6: Shaping the route](#fig-2-6)
7. [Figure 2.7: Joining chapters](#fig-2-7)
8. [Figure 2.8: Saving and exporting](#fig-2-8)
9. [Figure 2.9: Opening the voyage in the viewer](#fig-2-9)

**Layer 3 — Beneath the surface**

1. [Figure 3.1: Voyage, chapters and waypoints](#fig-3-1)
2. [Figure 3.2: Flags and marker shapes](#fig-3-2)
3. [Figure 3.3: How a chapter's distance is built](#fig-3-3)
4. [Figure 3.4: Which action looks up what](#fig-3-4)
5. [Figure 3.5: Countries, nations and territories](#fig-3-5)
6. [Figure 3.6: Era and the route line](#fig-3-6)
7. [Figure 3.7: Selecting a chapter in the viewer](#fig-3-7)

---

## Layer 0 — The whole

<a name="fig-0-1"></a>

### Figure 0.1: The two tools and the voyage file

```mermaid
flowchart TD
  subgraph IN["Brought into the editor"]
    J1["Voyage file (JSON)<br/>Load a voyage file…"]
    C1["CSVs: chapters + waypoints<br/>Import CSVs…"]
    G1["GPX file<br/>Import GPX…"]
  end
  E["Editor · voyage-atlas-editor.html<br/>charts and maintains the voyage"]
  F[("voyage-data.json")]
  V["Viewer · voyage-atlas.html<br/>the read-only chart to share or host"]
  subgraph OUT["Exported from the editor, ▾ beside Save"]
    J2["JSON (timestamped)"]
    C2["CSVs"]
    K2["KML: Google Earth"]
    G2["GPX: chartplotters and apps"]
  end
  IN --> E
  E -- "Save" --> F
  E --> OUT
  F -- "opens on arrival, or Load…" --> V
```

The editor is where a voyage is charted and maintained; the viewer is the read-only chart that is shared or hosted. They meet in one file, the voyage file, which the editor saves as `voyage-data.json` and the viewer loads. CSV and GPX also bring data into the editor, and CSV, KML and GPX carry it out to spreadsheets, Google Earth and chartplotters. The voyage file, saved with Save or as a dated copy, is the one format that carries the whole voyage; CSV, KML and GPX each carry a part of it (Figure 2.8).

FAQ: [Getting data in](voyage-atlas-faq.md#getting-data-in) · [Saving and exporting](voyage-atlas-faq.md#saving-and-exporting) · [Loading data](voyage-atlas-faq.md#loading-data) · [Why is the data separate from the tool?](voyage-atlas-faq.md#why-is-the-data-separate-from-the-tool)

---

## Layer 1 — The screens

<a name="fig-1-1"></a>

### Figure 1.1: The editor screen

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="images/guide-1-1-editor-dark.svg">
  <img alt="Wireframe of the editor: header, chapter panel with Voyage Settings and the chapter list, search box, chart, status bar and footer, with numbered callouts" src="images/guide-1-1-editor-light.svg">
</picture>

Drawn with chapter 2 selected.

1. **Header** — the title, the voyage's header stats, **Load ▾**, **Save** with its **▾** menu, and **◐** for the light or dark theme. On a screen 900 px wide or less the stats are hidden.
2. **⚙ Voyage Settings** — the voyage-level settings; a click on its header opens or closes it (Figure 2.3).
3. **Panel controls** — **📋 ⊞ ⊟** opens or closes every chapter's metadata form, **📍 ⊞ ⊟** every waypoint table, and **🌍 Look up all countries** fills in missing countries across the voyage (Figure 3.4).
4. **Chapter list** — one header per chapter; a click on a header selects that chapter (Figure 1.2).
5. **+ Add chapter** — adds a chapter at the end of the voyage (Figure 2.4).
6. **Divider** — dragged to widen the chapter panel or the chart.
7. **Search** — place search through Nominatim for a name of two or more characters, sent on Enter or **Search** (Figure 2.5).
8. **Chart** — every chapter's route and markers, the selected chapter on top with its shaping vertices and ghost midpoints (Figure 2.6).
9. **Status bar** — what the editor has just done, or the selected chapter's rows and distance; the **Rapid click** toggle at its right, when ON, turns a click on the chart into a new waypoint (Figure 2.5).
10. **Footer** — links to the FAQ, the project site and the version's release notes.

FAQ: [Part 2 — Using the editor](voyage-atlas-faq.md#part-2--using-the-editor) · [Chapters](voyage-atlas-faq.md#chapters) · [Header stats](voyage-atlas-faq.md#header-stats)

<a name="fig-1-2"></a>

### Figure 1.2: A chapter, part by part

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="images/guide-1-2-chapter-dark.svg">
  <img alt="Wireframe of one chapter: its header, its metadata form and its waypoint table, with numbered callouts" src="images/guide-1-2-chapter-light.svg">
</picture>

Drawn for chapter 2 of the sample voyage, with its metadata form and waypoint table open. The chapter header, left to right:

1. **≡** — the drag handle, to reorder chapters.
2. **Chapter number.**
3. **Name.**
4. **Era chip** — Past, Current or Future, with a sample of the route line (Figure 3.6).
5. **Connection indicator** — 🔗 when the chapter starts where the one before ends, ⇄ when there is a gap to pull closed (Figure 2.7).
6. **Distance** — in the unit chosen in Voyage Settings (Figure 3.3).
7. **📋** — opens or closes the metadata form (10).
8. **📍** — opens or closes the waypoint table (11 to 13).
9. **✕** — deletes the chapter, after a confirmation.

The panels below it:

10. **Metadata form** — the chapter's eight fields, in the order of Figure 2.4.
11. **Waypoint toolbar** — **+ Add row**, **+ Add N rows**, **Paste** and **Look up countries**, then the count of rows and named waypoints (Figure 2.5).
12. **Columns** — ≡ (drag), #, Name, Lat, Lon, M, G, D, Country, Notes and ✕. M, G and D are the flags (Figure 3.2); a country cell that already holds a value is flagged, since a lookup leaves it alone (Figure 3.4).
13. **Shaping vertices** — rows with no name, shown as "(shaping vertex)"; they bend the route without drawing a marker (Figure 3.1).

FAQ: [Chapters](voyage-atlas-faq.md#chapters) · [Chapter metadata](voyage-atlas-faq.md#chapter-metadata) · [Waypoints](voyage-atlas-faq.md#waypoints)

<a name="fig-1-3"></a>

### Figure 1.3: The viewer screen

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="images/guide-1-3-viewer-dark.svg">
  <img alt="Wireframe of the viewer: header, chart with zoom controls, Chart and Layers, the Chapters list and the detail panel in the four corners, and footer, with numbered callouts" src="images/guide-1-3-viewer-light.svg">
</picture>

Drawn with chapter 1 selected.

1. **Header** — **☰** opens the Voyage Chapters drawer; then the title, the header stats, **Load…**, **Chart your own voyage →**, which opens the editor, and **◐**.
2. **Zoom** — top-left.
3. **Chart & Layers** — top-right: the five layer toggles, with the key to solid and dashed routes under Routes (Figures 3.2 and 3.6).
4. **Chapters** — bottom-left: one row per chapter; a click selects it (Figure 3.7).
5. **Detail panel** — bottom-right, for the selected chapter: its When, name and distance, its notes when it has any, its countries and territories, and **Read the posts →** when its blog URL is a full http or https address.
6. **Chart** — the selected chapter at full strength, the others dimmed.
7. **Footer** — links to the FAQ, the project site and the version's release notes.

FAQ: [The chart's panels](voyage-atlas-faq.md#the-charts-panels) · [Layer toggles](voyage-atlas-faq.md#layer-toggles) · [Selecting a chapter](voyage-atlas-faq.md#selecting-a-chapter)

<a name="fig-1-4"></a>

### Figure 1.4: The viewer on a narrow screen

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="images/guide-1-4-viewer-narrow-dark.svg">
  <img alt="Two wireframes of the viewer: at 900 px wide or less with the Voyage Chapters drawer open, and on a phone with Chart and Layers collapsed and the detail panel as a bottom sheet, with numbered callouts" src="images/guide-1-4-viewer-narrow-light.svg">
</picture>

On a screen 900 px wide or less:

1. **Header** — keeps **☰**, the title and **◐**.
2. **Chart your own voyage →** — moves into the Voyage Chapters drawer.
3. **Header stats** — move into the drawer, in two columns.
4. **Load…** — moves into the drawer.
5. **Chapter rows** — each with its When, name and key destinations; a past chapter is dimmed. Picking a chapter closes the drawer.

On a phone, 640 px wide or less:

6. **Chart & Layers** — runs across the top below the zoom control, starting collapsed. The Chapters list gives way to the ☰ drawer.
7. **Detail panel** — a sheet along the bottom, drawn for chapter 3.
8. **Footer** — stacks on three lines.

FAQ: [The chart's panels](voyage-atlas-faq.md#the-charts-panels) · [Selecting a chapter](voyage-atlas-faq.md#selecting-a-chapter)

---

## Layer 2 — Charting a voyage

<a name="fig-2-1"></a>

### Figure 2.1: Start to finish

```mermaid
flowchart TD
  S1(["1. Open the editor"]) --> S2["2. Pick a starting point in the chooser<br/>Figure 2.2"]
  S2 --> S3["3. Set the title and units in ⚙ Voyage Settings<br/>Figure 2.3"]
  S3 --> S4["4. + Add chapter and fill in its fields<br/>Figure 2.4"]
  S4 --> S5["5. Add the chapter's waypoints<br/>Figure 2.5"]
  S5 --> J{"Is there a chapter before it?"}
  J -- "yes" --> S6["6. Join it to that chapter: ⇄ when there is a gap,<br/>nothing to do when 🔗 shows · Figure 2.7"]
  S6 --> S7["7. Shape the route between the points<br/>Figure 2.6"]
  J -- "no" --> S7
  S7 --> Q{"Another chapter?"}
  Q -- "yes" --> S4
  Q -- "no" --> S8["8. Save the voyage file<br/>Figure 2.8"]
  S8 --> S9(["9. Open it in the viewer<br/>Figure 2.9"])
```

A voyage is charted one chapter at a time: each chapter gets its fields and its waypoints, joins the chapter before it once it has a point with coordinates, and has its route shaped. The voyage file is saved at any point and as often as needed; the Save button reads `Save *` while changes are unsaved.

FAQ: [Part 1 — Concepts](voyage-atlas-faq.md#part-1--concepts) · [Part 2 — Using the editor](voyage-atlas-faq.md#part-2--using-the-editor)

<a name="fig-2-2"></a>

### Figure 2.2: Getting data in

```mermaid
flowchart TD
  subgraph ARR["On arrival"]
    A(["Editor opens"]) --> CH{"Chooser"}
    CH -- "shown when a voyage file resolves" --> O1["Explore the sample voyage"]
    CH --> O2["Start a new voyage"]
    CH --> O3["Load a voyage file…"]
    CH -- "× · a tap outside · Escape" --> D["the sample when there is one,<br/>else a new voyage"]
  end
  subgraph LATER["At any time"]
    M["Load ▾ menu<br/>1. Load a voyage file…<br/>2. Import CSVs (chapters + waypoints)…<br/>3. Import GPX…<br/>4. New voyage<br/>5. Sample voyage, shown when a voyage file resolves"]
    M -- "1, 2, 4 and 5 replace the voyage" --> G{"Unsaved changes?"}
    G -- "yes" --> P["Discard unsaved changes?<br/>Keep editing · Discard changes"]
    P -- "Keep editing" --> K["nothing changes"]
    P -- "Discard changes" --> R["the action goes ahead: the voyage is replaced<br/>once a file is read, or by the new or sample voyage"]
    G -- "no" --> R
    M -- "3 adds to the voyage" --> GP["Import GPX dialog: new chapters at the end,<br/>or in place of the selected chapter's rows"]
  end
  ARR ~~~ LATER
```

The chooser opens on every visit. The same actions, with CSV and GPX import, stay on the **Load ▾** menu. Every action that replaces the voyage asks first when there are unsaved changes, and Enter there keeps editing. GPX import adds to the voyage instead of replacing it. A voyage file that cannot be read is reported, and the voyage on screen stays as it was.

FAQ: [Getting data in](voyage-atlas-faq.md#getting-data-in)

<a name="fig-2-3"></a>

### Figure 2.3: Voyage Settings

```mermaid
flowchart LR
  VS["⚙ Voyage Settings"] --> T["Voyage Title"]
  VS --> U["Distance Units"]
  VS --> DO["Distance Override"]
  VS --> N["Nations"]
  VS --> TE["Territories"]
  T --> T1["both tools' headers and page titles,<br/>the KML document and the GPX file"]
  U --> U1["every distance shown, in both tools;<br/>stored distances stay in nautical miles"]
  DO --> D1["replaces the computed total distance"]
  N --> N1["replaces the computed nations count"]
  TE --> TE1["replaces the computed territories count"]
```

The settings belong to the whole voyage and are saved in the voyage file. A blank override leaves the computed figure. In the editor's header a set override is marked with a ⚙, and a Nations or Territories override of 0 still shows its tile; the viewer shows the figure without the mark, and no tile for 0. A Distance Override of 0 or less clears it. A blank title falls back to "Voyage Atlas".

FAQ: [Voyage Settings (⚙)](voyage-atlas-faq.md#voyage-settings-) · [How is distance (nm) calculated?](voyage-atlas-faq.md#how-is-distance-nm-calculated) · [How are nations and territories counted?](voyage-atlas-faq.md#how-are-nations-and-territories-counted)

<a name="fig-2-4"></a>

### Figure 2.4: Adding a chapter and its fields

```mermaid
flowchart TD
  ADD["+ Add chapter"] --> NEW["New Chapter at the end of the voyage<br/>era Future · Pad Multiplier 1.2 · selected"]
  NEW --> FORM["📋 metadata form, top to bottom"]
  FORM --> F1["1. Name<br/>→ the viewer's Chapters list, drawer and detail panel"]
  F1 --> F2["2. Era — Past, Current or Future<br/>→ a solid or dashed route, Figure 3.6"]
  F2 --> F3["3. When — start and end month and year<br/>→ the viewer's drawer, detail panel and popups"]
  F3 --> F4["4. Pad Multiplier — 1 or more<br/>→ the chapter's distance, Figure 3.3"]
  F4 --> F5["5. Blog URL<br/>→ the viewer's Read the posts link"]
  F5 --> F6["6. Notes<br/>→ the viewer's detail panel"]
  F6 --> F7["7. Countries / Territories — blank means automatic<br/>→ nations and territories, Figure 3.5"]
  F7 --> F8["8. Key Destinations<br/>→ under the chapter's name in the viewer's drawer"]
```

The fields are drawn in the order the form shows them, each with what it drives elsewhere after the →. A double-click on a chapter header also opens or closes its form.

FAQ: [Adding a chapter](voyage-atlas-faq.md#adding-a-chapter) · [Chapter metadata](voyage-atlas-faq.md#chapter-metadata)

<a name="fig-2-5"></a>

### Figure 2.5: Adding waypoints

```mermaid
flowchart TD
  ROOT["Five ways to add points"] --> W1["+ Add row"]
  ROOT --> W2["+ Add N rows"]
  ROOT --> W3["Paste"]
  ROOT --> W4["Rapid click: ON"]
  ROOT --> W5["Search places (Nominatim)…"]
  W1 --> R1["one blank row after the selected row,<br/>or at the end; the new row is selected"]
  W2 --> R2["Add multiple rows:<br/>10 by default, up to 500,<br/>at the end"]
  W3 --> R3["Paste waypoints:<br/>name, lat, lon and more per line;<br/>Cmd/Ctrl+Enter adds the rows"]
  W4 --> R4["each click on the chart<br/>adds a point at the end<br/>of the selected chapter"]
  W5 --> R5["Enter or Search, then a result:<br/>a named waypoint with coordinates<br/>and country, in the selected chapter"]
  R1 & R2 & R3 -.-> LK["a name typed or pasted into a row with no coordinates<br/>is looked up · Figure 3.4"]
```

The toolbar buttons add to their own chapter. Rapid click and search add to the selected chapter, so a chapter is selected first; with none selected, a search pans the chart to the result and asks for a chapter. A ghost midpoint on the chart also adds a point (Figure 2.6), and Import GPX brings whole tracks and routes (Figure 2.2).

FAQ: [Adding waypoints](voyage-atlas-faq.md#adding-waypoints) · [Geocoding (name ↔ coordinates)](voyage-atlas-faq.md#geocoding-name--coordinates)

<a name="fig-2-6"></a>

### Figure 2.6: Shaping the route

```mermaid
flowchart TD
  subgraph KIND["What a row is"]
    NW["Named waypoint<br/>a marker on the chart"] -- "clear the name" --> SV["Shaping vertex<br/>bends the route; a small gray dot<br/>in the editor's selected chapter only"]
    SV -- "give it a name" --> NW
  end
  subgraph MOVE["Moving and adding points"]
    M1["Drag a marker or a gray dot<br/>of the selected chapter"] --> M1a["the point moves;<br/>Lat and Lon follow"]
    M2["Type Lat or Lon,<br/>or step with ↑ ↓"] --> M2a["the point moves;<br/>↑ ↓ step 0.01°"]
    M3["Click or drag a ghost midpoint<br/>of the selected chapter"] --> M3a["a new shaping vertex<br/>on that leg"]
    M4["Drag ≡ in the table"] --> M4a["a new place in<br/>the route's order"]
  end
  subgraph DEL["Taking points out"]
    D1["✕ at the end of the row"] --> D1a["removed at once"]
    D2["Right-click a marker<br/>of the selected chapter"] --> D2a["removed after a confirmation"]
  end
  KIND ~~~ MOVE ~~~ DEL
```

The route line joins every row of a chapter that has coordinates, in order, named or not. Shaping vertices bend it around a cape or along a coast without adding markers. A ghost midpoint is the faint marker halfway along each leg of the selected chapter, shown where the leg is long enough on screen to grab.

FAQ: [What is a "shaping vertex"?](voyage-atlas-faq.md#what-is-a-shaping-vertex) · [Adjusting waypoint positions](voyage-atlas-faq.md#adjusting-waypoint-positions) · [Reordering waypoints](voyage-atlas-faq.md#reordering-waypoints) · [Deleting waypoints](voyage-atlas-faq.md#deleting-waypoints)

<a name="fig-2-7"></a>

### Figure 2.7: Joining chapters

```mermaid
flowchart TD
  P["The previous chapter: the nearest earlier chapter with coordinates"] --> Q{"Is this chapter's first point within<br/>half a nautical mile of that chapter's last?"}
  Q -- "yes" --> L["🔗 linked: the approach leg is 0"]
  Q -- "no" --> G["⇄ pull: its tooltip names the gap"]
  G -- "click ⇄" --> I["A copy of the previous chapter's last point<br/>is inserted as this chapter's first row"]
  I --> L
  F["The first chapter, or one with no coordinates yet"] --> NONE["no indicator"]
```

Chapters normally share their handoff point: the same point is the last row of one chapter and the first row of the next. The ⇄ button inserts that point rather than moving the existing first row, so a named waypoint is never moved. A gap left open is counted as the next chapter's approach leg (Figure 3.3).

FAQ: [How do chapters connect? (Shared endpoints)](voyage-atlas-faq.md#how-do-chapters-connect-shared-endpoints) · [Endpoint sync — the ⇄ button and 🔗 indicator](voyage-atlas-faq.md#endpoint-sync--the--button-and--indicator)

<a name="fig-2-8"></a>

### Figure 2.8: Saving and exporting

```mermaid
flowchart LR
  SAVE["Save"] --> VF["voyage-data.json<br/>the whole voyage"]
  MENU["▾ beside Save"] --> E1["JSON (timestamped)"]
  MENU --> E2["CSVs (chapters + waypoints)"]
  MENU --> E3["KML"]
  MENU --> E4["GPX"]
  E1 --> X1["a dated copy of the voyage file"]
  E2 --> X2["chapters and waypoints for a spreadsheet;<br/>no title, settings or avoidance zones"]
  E3 --> X3["the title, the routes and the named waypoints<br/>with their flags, for Google Earth"]
  E4 --> X4["every point with coordinates, as a route per chapter;<br/>the named ones also as waypoints, for chartplotters and apps"]
  VF & X1 --> CLEAR["Save * returns to Save"]
  X2 & X3 & X4 --> KEEP["Save * stays: these do not reload<br/>as the same voyage"]
```

Only the voyage file is the complete record, and it holds only source data and overrides: every total, chapter distance and country list is computed again when a file loads. Each file from the ▾ menu carries the date and time in its name.

FAQ: [Saving and exporting](voyage-atlas-faq.md#saving-and-exporting) · [What do the header stats show?](voyage-atlas-faq.md#what-do-the-header-stats-show)

<a name="fig-2-9"></a>

### Figure 2.9: Opening the voyage in the viewer

```mermaid
flowchart TD
  O(["Viewer opens"]) --> F{"Does the configured voyage file resolve,<br/>without ?import=yes?"}
  F -- "yes" --> SHOW["The voyage is displayed"]
  F -- "no" --> CH["Chooser"]
  SHOW --> FIT{"Does the whole voyage fit<br/>one view of the world?"}
  FIT -- "yes" --> W["framed whole"]
  FIT -- "no" --> CUR["a world-wide view anchored on the current chapter,<br/>opening toward the route ahead"]
  W & CUR --> K{"Any of the current chapter's points<br/>off the chart or under a panel?"}
  K -- "yes" --> KC["framed on the current chapter"]
  K -- "no" --> KS["the opening view stays"]
  LOAD["Load…, at any time"] --> CH
  CH -- "when the file resolved" --> C1["Explore this voyage"]
  CH --> C2["Load a voyage file…"]
  C1 & C2 --> SHOW
```

The viewer reads its voyage file the same way the editor does, from `voyage-data.json` beside it by default. The current chapter is, among the chapters with coordinates, the one whose era is Current, else the first Future chapter, else the last. To publish a voyage, `voyage-atlas.html` and the saved `voyage-data.json` go in one folder on a web host; replacing the file updates the chart. No chapter is selected on opening.

FAQ: [Loading data](voyage-atlas-faq.md#loading-data) · [Self-hosting](voyage-atlas-faq.md#self-hosting)

---

## Layer 3 — Beneath the surface

<a name="fig-3-1"></a>

### Figure 3.1: Voyage, chapters and waypoints

```mermaid
flowchart TD
  V["Voyage file"] --> META["meta: the title, the data model version,<br/>when the file was written, and the settings"]
  V --> CHS["chapters, in voyage order"]
  V --> PAZ["paz: avoidance zones, when present"]
  CHS --> CH["A chapter: name, era, When, pad multiplier,<br/>blog URL, notes, countries override, key destinations"]
  CH --> WPS["waypoints, in route order"]
  WPS --> WP{"A waypoint row: name, lat, lon,<br/>flags, country, notes"}
  WP -- "has a name" --> NAMED["Named waypoint: a marker<br/>once it has coordinates"]
  WP -- "no name, with coordinates" --> SHAPE["Shaping vertex: route geometry only"]
  WPS --> LINE["The route line joins every row<br/>with coordinates, in order"]
  V -.-> CALC["Never stored: totals, chapter distances,<br/>chapter country lists; computed on load"]
```

Only source data and explicit overrides are stored; everything calculated is worked out again each time a file loads, so a hand-edited file never shows a stale number. The full field list is in the [data schema](voyage-atlas-schema.md).

FAQ: [Why "chapters" instead of "legs"?](voyage-atlas-faq.md#why-chapters-instead-of-legs) · [What is a "shaping vertex"?](voyage-atlas-faq.md#what-is-a-shaping-vertex)

<a name="fig-3-2"></a>

### Figure 3.2: Flags and marker shapes

```mermaid
flowchart TD
  W["A named waypoint"] --> D{"D — Decision?"}
  D -- "yes" --> DIA["◆ diamond"]
  D -- "no" --> G{"G — Gateway?"}
  G -- "yes" --> STAR["★ star"]
  G -- "no" --> CIR["● circle"]
  W --> M{"M — Major?"}
  M -- "yes" --> BIG["a larger marker"]
```

The three flags are independent. When more than one is set, the highest decides the shape: Decision, then Gateway. Major adds size. In the editor the diamond and the star show in the selected chapter; in the viewer they are drawn over the waypoint's circle when the **Decision points** and **Gateway ports** layers are on, which they are not by default. A shaping vertex ignores its flags.

FAQ: [What do the three waypoint flags mean?](voyage-atlas-faq.md#what-do-the-three-waypoint-flags-mean) · [Layer toggles](voyage-atlas-faq.md#layer-toggles)

<a name="fig-3-3"></a>

### Figure 3.3: How a chapter's distance is built

```mermaid
flowchart TD
  LEGS["The great-circle legs between<br/>the chapter's points, summed"] --> PAD["× the Pad Multiplier"]
  PAD --> SUM["The chapter's distance"]
  APP["Approach leg: from the previous chapter's<br/>last point to this chapter's first, unpadded;<br/>0 when they share a point"] --> SUM
  SUM --> TOT["The voyage total: the sum of the chapters"]
  OV["Distance Override"] -. "replaces" .-> TOT
  TOT --> SHOWN["Shown in nm, km or mi, as Distance Units sets;<br/>stored in nautical miles"]
```

The pad accounts for the sailing a straight track undercounts, such as tacking and exploring a cruising ground; a new chapter starts at 1.2. The approach leg belongs to the chapter being sailed into, since the passage to its start is the first thing done in that chapter. A Distance Override replaces the total.

FAQ: [How is distance (nm) calculated?](voyage-atlas-faq.md#how-is-distance-nm-calculated) · [Why does the approach leg count toward the destination chapter?](voyage-atlas-faq.md#why-does-the-approach-leg-count-toward-the-destination-chapter)

<a name="fig-3-4"></a>

### Figure 3.4: Which action looks up what

```mermaid
flowchart TD
  S["Search: Enter or Search"] --> MEM
  N["A name typed into a row with no coordinates"] --> MEM
  P["Paste: rows with a name and no coordinates"] --> CONF
  C["Look up countries for a chapter,<br/>or 🌍 Look up all countries"] --> CONF{"Many to look up?"}
  CONF -- "all chapters always; 30 or more otherwise" --> ASK["A confirmation with the count and the time;<br/>Cancel looks nothing up"]
  CONF -- "fewer than 30" --> MEM
  ASK -- "Proceed" --> MEM
  MEM{"Already answered in this session?"} -- "yes" --> R["Search and name lookups: coordinates,<br/>and the country when its cell is empty.<br/>Country lookups: the country of each point<br/>with coordinates and no country."]
  MEM -- "no" --> Q["One queue to Nominatim: one request a second,<br/>a search at the front; the answer is kept"]
  Q --> R
  K["A chart click, a drag or typed coordinates"] --> NONE["no lookup: the country waits<br/>for Look up countries"]
```

The country comes free with every search and name lookup; a lookup made only for countries runs only from the Look up countries buttons. A value typed by hand is never overwritten. A repeated lookup, such as Look up countries run again over points in open water, is answered from memory without a new request.

FAQ: [Geocoding (name ↔ coordinates)](voyage-atlas-faq.md#geocoding-name--coordinates) · [What leaves the browser?](voyage-atlas-faq.md#what-leaves-the-browser)

<a name="fig-3-5"></a>

### Figure 3.5: Countries, nations and territories

```mermaid
flowchart TD
  WC["Each waypoint's Country"] --> AUTO["The chapter's list: its waypoints' countries,<br/>in first-appearance order"]
  OVR["The chapter's Countries / Territories field"] -- "when filled in, replaces" --> AUTO
  AUTO --> ALL["Every chapter's list, each place once"]
  ALL --> CL{"On the built-in territory list?"}
  CL -- "yes" --> TER["Territories<br/>or the Territories override"]
  CL -- "no" --> NAT["Nations<br/>or the Nations override"]
```

Names are matched however they are written, so a place spelled two ways counts once. The overrides in Voyage Settings replace the counts. A lookup can return the parent nation for a territory, such as Portugal for the Azores; the fix is the waypoint's Country or an override.

FAQ: [How are nations and territories counted?](voyage-atlas-faq.md#how-are-nations-and-territories-counted) · [Chapter metadata](voyage-atlas-faq.md#chapter-metadata)

<a name="fig-3-6"></a>

### Figure 3.6: Era and the route line

```mermaid
flowchart LR
  P["Past"] --> P1["solid route<br/>dimmed in the viewer's Chapters list and drawer"]
  C["Current"] --> C1["solid route<br/>kept in sight by the viewer's opening view"]
  F["Future"] --> F1["dashed route: planned"]
```

Both tools draw a future chapter's route dashed and the others solid, in the chapter's own color. The viewer's Chart & Layers panel shows the key under Routes, and each era chip in the editor shows a sample of its line. With no Current chapter among those with coordinates, the opening view keeps the first Future chapter in sight, else the last.

FAQ: [Chapter metadata](voyage-atlas-faq.md#chapter-metadata) · [Layer toggles](voyage-atlas-faq.md#layer-toggles)

<a name="fig-3-7"></a>

### Figure 3.7: Selecting a chapter in the viewer

```mermaid
flowchart TD
  CLICK["A click on a chapter in the Chapters list,<br/>in the drawer, or on its route"] --> SEL["The chapter is selected"]
  SEL --> A1["its route and waypoints at full strength,<br/>every other chapter dimmed"]
  SEL --> A2["the chart eases to the chapter's extent"]
  SEL --> A3["the detail panel opens"]
  A1 & A2 & A3 --> CLR(["× on the detail panel, Escape,<br/>or a click on empty chart"])
  CLR --> ALL["the selection clears:<br/>every chapter at full strength again"]
  NR["A chapter with no route and no named point"] --> BADGE["No route: it cannot be selected"]
```

A selected chapter's waypoints sit above its route, so each can be clicked for its popup. On a phone, the chapter is framed between Chart & Layers and the detail sheet.

FAQ: [Selecting a chapter](voyage-atlas-faq.md#selecting-a-chapter) · [Reading the chart](voyage-atlas-faq.md#reading-the-chart)

---

*Companion documents: the [FAQ / Owner's Manual](voyage-atlas-faq.md) (every feature in full), the [data schema](voyage-atlas-schema.md) (the data format) and the [changelog](../CHANGELOG.md) (version history).*
