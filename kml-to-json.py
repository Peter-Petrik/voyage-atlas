#!/usr/bin/env python3
"""
kml-to-json.py — GRACE Global Voyage Framework: KML -> map JSON

Reads grace-voyage-framework.kml and emits grace-voyage-map.json, the data
structure baked into grace-voyage-map.html (Phase 1 interactive map).

WHAT THIS SCRIPT OWNS (geometry, from the KML):
  - Route polylines per chapter (as [lat, lon] for direct Leaflet use)
  - Named waypoints per chapter, de-duplicated within a chapter by location
  - Great-circle base distance per chapter (haversine over the line vertices)

WHAT THIS SCRIPT CARRIES AS CURATED CONSTANTS (not parsed from the KML):
  - CHAPTER_META : name, period ("when"), era, routing one-liner, bail-out,
                   countries, key destinations  (distilled from the framework)
  - PAD          : per-chapter distance multiplier (KML geometry is rhumb-line;
                   real cruising wanders. 1.20 default; more for cruising grounds)
  - MAJOR_PORTS  : strategic hubs that get larger circle markers on the map
  - ROUTING_LABELS : named vertices that are routing geometry, not real stops
                     (still rendered, but flagged so the HTML can style/hide them)
  - PAZ          : the 10 Permanent Avoidance Zone rectangles (framework App. C)

CHAPTER NUMBERING (map scheme, 19 chapters):
  Ch 1  Med Eastward  -> NOT in this KML; arrives in Phase 2 from a NoForeignLand
                         GPX export. Reserved here as a metadata-only stub.
  Ch 2  Med Westward  <- KML folders "0 — Aegean to Ionian" + "Med A".."Med F"  (merged)
  Ch 3..16            <- KML "Ch 1".."Ch 14"        (shifted +2)
  Ch 17               <- KML "Ch 15a — NZ to Japan"
  Ch 18               <- KML "Ch 15b — Japan to Alaska"
  Ch 19               <- KML "Ch 16 — Pacific Coast South and Return"

Usage:
  python3 kml-to-json.py [path/to/grace-voyage-framework.kml] [path/to/out.json]
Defaults: ./grace-voyage-framework.kml  ->  ./grace-voyage-map.json
"""

import json
import math
import re
import sys

# --------------------------------------------------------------------------
# 1. CURATED CHAPTER METADATA  (distilled from global-voyage-framework.md v1.4)
#    Edit freely — this is the source of truth for everything the KML can't carry.
#    Optional field: "blogUrl" — a link to that chapter's blog collection
#    (e.g., "https://sailingamazinggrace.com/2025"). Populate for past/current
#    chapters; leave unset for future ones (defaults to null, no UI yet).
# --------------------------------------------------------------------------
CHAPTER_META = {
    1: {
        "name": "Med Eastward",
        "when": "Sep 2024 – Jan 2026",
        "era": "past",
        "routing": "The first 18 months — France and Monaco eastward through Italy, "
                   "the Adriatic and Greece to the Aegean.",
        "bailout": "Completed. Track arrives in Phase 2 from a NoForeignLand export.",
        "countries": ["France", "Monaco", "Italy", "Croatia", "Montenegro", "Greece", "Turkey"],
        "keyDestinations": ["French Riviera", "Italy", "Croatia", "Montenegro", "Greece", "Aegean"],
    },
    2: {
        "name": "Med Westward",
        "when": "Feb 2026 – Dec 2026",
        "era": "current",
        "routing": "Westward across the central Med via Malta, Sicily, the Aeolians, "
                   "Sardinia and the Balearics to Gibraltar — staging for the Atlantic.",
        "bailout": "A dense all-weather harbour network the whole way; the Costa Brava "
                   "vs direct-Valencia fork stays open.",
        "countries": ["Greece", "Italy", "Malta", "Spain", "Gibraltar (UK)"],
        "keyDestinations": ["Malta", "Sicily", "Aeolian Islands", "Sardinia", "Balearics", "Gibraltar"],
    },
    3: {
        "name": "Morocco & Madeira",
        "when": "Jan – Mar 2027",
        "era": "future",
        "routing": "Southbound down the Moroccan Atlantic coast, then a broad-reach hop "
                   "offshore to Madeira — positioning for the Azores without fighting the "
                   "Portuguese trades northbound.",
        "bailout": "Divert to the Canaries from Agadir if the Madeira approach won't open.",
        "countries": ["Morocco", "Portugal"],
        "keyDestinations": ["Rabat", "Essaouira", "Agadir", "Funchal (Madeira)"],
    },
    4: {
        "name": "Azores",
        "when": "Mar – May 2027",
        "era": "future",
        "routing": "The one weather-window passage in the framework — 450nm from Madeira "
                   "through the Azores High, sailed in the March chaos before the High "
                   "organises and locks against you.",
        "bailout": "The Canaries fishhook (WSW into the trades, then NNE) sails every mile "
                   "if the direct window won't open — adds ~700nm.",
        "countries": ["Portugal"],
        "keyDestinations": ["Horta (Faial)", "Pico", "Terceira", "São Miguel"],
    },
    5: {
        "name": "British Isles",
        "when": "Jun – Sep 2027",
        "era": "future",
        "routing": "Broad-reach ~1,200nm from the Azores to a Cornwall/Scilly landfall, then "
                   "a clockwise loop — south coast, Wales, Ireland, into Scotland.",
        "bailout": "The Caledonian Canal cuts between the coasts, saving a Cape Wrath rounding.",
        "countries": ["United Kingdom", "Ireland"],
        "keyDestinations": ["Cornwall & Scilly", "South Coast England", "Wales", "Ireland", "Inner Hebrides"],
    },
    6: {
        "name": "Scotland & Ireland Winter",
        "when": "Oct 2027 – Apr 2028",
        "era": "future",
        "routing": "Cruise the winter instead of repositioning — Gulf-Stream-moderated sea "
                   "lochs (5–9°C), sheltered anchorages behind the mountains, weekly moves, "
                   "near-zero other boats.",
        "bailout": "Hundreds of deep, protected lochs and sounds — shelter is always to hand "
                   "when the SW gales come through.",
        "countries": ["United Kingdom", "Ireland"],
        "keyDestinations": ["Scottish sea lochs", "Inner & Outer Hebrides", "Orkney", "Irish west coast"],
    },
    7: {
        "name": "Nordic & Svalbard",
        "when": "May – Sep 2028",
        "era": "future",
        "routing": "A 300nm downwind hop from Scotland to Bergen, then north up the sheltered "
                   "leads to Lofoten and Tromsø, with a July out-and-back to Svalbard.",
        "bailout": "Norway's inner leads give all-weather routing behind the island chain; "
                   "the Svalbard side-trip is weather-window and abortable at Tromsø.",
        "countries": ["Norway", "Sweden"],
        "keyDestinations": ["Bergen", "The fjords", "Lofoten", "Tromsø", "Svalbard"],
    },
    8: {
        "name": "Southbound & Staging",
        "when": "Sep 2028 – Feb 2029",
        "era": "future",
        "routing": "All downhill in the prevailing winds — Scandinavia, the Kiel Canal, "
                   "Biscay, the Galician rías, Portugal, the Canaries, to Cape Verde. No motoring.",
        "bailout": "Biscay is a weather-window crossing, not a calendar commitment; the chapter "
                   "has five months of slack to wait out weather.",
        "countries": ["Denmark", "Germany", "Netherlands", "Belgium", "Spain", "Portugal", "Cape Verde"],
        "keyDestinations": ["Galician rías", "Portugal", "Canary Islands", "Mindelo (Cape Verde)"],
    },
    9: {
        "name": "Atlantic Crossing",
        "when": "Feb – Mar 2029",
        "era": "future",
        "routing": "Cape Verde to NE Brazil on a ~200° run in the NE trades — ~1,700nm in "
                   "12–14 days, with an unavoidable day or two of ITCZ motoring near 3–5°N.",
        "bailout": "Fernando de Noronha sits directly on the rhumb line as a natural "
                   "mid-ocean landfall and rest stop.",
        "countries": ["Brazil"],
        "keyDestinations": ["Fernando de Noronha", "Recife / Olinda"],
    },
    10: {
        "name": "Brazil",
        "when": "Mar – Aug 2029",
        "era": "future",
        "routing": "Down the NE Brazilian coast in the SE trades — beam-to-broad reach to "
                   "~25°S, then variable as cold fronts replace the trades. Bay-hopping throughout.",
        "bailout": "The sheltered anchorages of Baía de Todos os Santos and Ilha Grande give "
                   "cover as the southern fronts pick up.",
        "countries": ["Brazil"],
        "keyDestinations": ["Salvador", "Abrolhos", "Rio de Janeiro", "Ilha Grande", "Paraty"],
    },
    11: {
        "name": "River Plate to Patagonia",
        "when": "Sep – Nov 2029",
        "era": "future",
        "routing": "Subtropical-to-Southern-Ocean transition; wind backs from E to WNW past "
                   "35°S, putting the Patagonian coast on a beam reach southbound.",
        "bailout": "The Falklands detour (~500nm) is decided at the time on conditions; "
                   "Ushuaia/Puerto Williams is the full-service staging port before the channels.",
        "countries": ["Uruguay", "Argentina"],
        "keyDestinations": ["Buenos Aires", "Patagonian coast", "Falklands (optional)", "Ushuaia"],
    },
    12: {
        "name": "Patagonia & Channels",
        "when": "Dec 2029 – Feb 2030",
        "era": "future",
        "routing": "The southern-summer window through the Beagle Channel and Chilean fjords — "
                   "williwaws, multi-line anchoring, weeks of demanding cold cruising. The "
                   "'hard passages first' chapter.",
        "bailout": "The Drake/Antarctica attempt is strictly weather-window from Ushuaia, not a "
                   "planned passage; the channels themselves shelter throughout.",
        "countries": ["Argentina", "Chile"],
        "keyDestinations": ["Beagle Channel", "Chilean channels", "Drake attempt"],
    },
    13: {
        "name": "Chilean Coast North",
        "when": "Mar – Sep 2030",
        "era": "future",
        "routing": "North out of the channels with the S/SW winds and Humboldt Current both "
                   "assisting — working a positioning hold until the South Pacific cyclone season ends.",
        "bailout": "How far north you run — Chiloé, Valparaíso, Juan Fernández, even Peru/Ecuador "
                   "— flexes with the wait for the French Polynesia window.",
        "countries": ["Chile"],
        "keyDestinations": ["Chiloé", "Valparaíso", "Juan Fernández"],
    },
    14: {
        "name": "Easter Island & Pitcairn",
        "when": "Oct 2030 – Feb 2031",
        "era": "future",
        "routing": "West into the open Pacific on the SE trades at 27°S, below the cyclone belt — "
                   "Rapa Nui, Pitcairn, then Gambier for French Polynesia entry. Three of the "
                   "world's most remote island groups.",
        "bailout": "Stage through the southern summer at Easter Island and depart as the season "
                   "ends; Pitcairn landings need island-council permission arranged ahead.",
        "countries": ["Chile", "France"],
        "keyDestinations": ["Rapa Nui", "Pitcairn", "Gambier"],
    },
    15: {
        "name": "French Polynesia & Coconut Milk Run",
        "when": "Mar – Oct 2031",
        "era": "future",
        "routing": "Gambier through the Marquesas, Tuamotus and Society Islands and west along "
                   "the chains in steady SE trades — arrive by May, cruise to October, then south "
                   "before cyclone season.",
        "bailout": "Seven months of slack across well-documented island groups; head south to "
                   "NZ before the Nov–Apr cyclone season.",
        "countries": ["France", "Cook Islands", "Tonga", "Fiji"],
        "keyDestinations": ["Marquesas", "Tuamotus", "Tahiti", "Cook Islands", "Tonga", "Fiji"],
    },
    16: {
        "name": "New Zealand",
        "when": "Nov 2031 – Apr 2032",
        "era": "future",
        "routing": "South from Fiji on a ~200° beam reach ahead of cyclone season; North Island "
                   "is cruisable year-round and hosts the major refit (HO3).",
        "bailout": "NZ North Island is all-season cruising, not wintering; Fiordland is an "
                   "optional committed side-trip if conditions allow.",
        "countries": ["New Zealand"],
        "keyDestinations": ["Bay of Islands", "Hauraki Gulf", "Fiordland"],
    },
    17: {
        "name": "NZ → Japan",
        "when": "2032 – 33",
        "era": "future",
        "routing": "North through the tropical Pacific island nations, timing arrival in Japan "
                   "for spring ahead of the Jun–Nov typhoon peak.",
        "bailout": "Multiple island-nation stops (Vanuatu, Solomons, Micronesia) give staging "
                   "flexibility on the long northward haul. Broad projection — refine before commit.",
        "countries": ["Vanuatu", "Solomon Islands", "Marshall Islands",
                      "Federated States of Micronesia", "Japan"],
        "keyDestinations": ["Pacific island nations", "Saipan", "Ogasawara", "Japan"],
    },
    18: {
        "name": "Japan → Alaska",
        "when": "2033 – 34",
        "era": "future",
        "routing": "Japan's Inland Sea and Hokkaido in the May–Jun window, then the Jun–Jul "
                   "light-wind gap to the Aleutians and Alaska — summer-only expedition territory.",
        "bailout": "Tightly weather- and season-gated; the Aleutian corridor stays east of "
                   "Russian waters (see avoidance zones). Broad projection — refine before commit.",
        "countries": ["Japan", "United States", "Canada"],
        "keyDestinations": ["Inland Sea", "Hokkaido", "Aleutians", "Alaska", "British Columbia"],
    },
    19: {
        "name": "Pacific Coast South & Return",
        "when": "2034 – 35",
        "era": "future",
        "routing": "Down the Pacific coast in the NW prevailing — California, Mexico, Central "
                   "America, Ecuador, Galápagos — then a second South Pacific pass collecting the "
                   "Marquesas and islands missed earlier, closing in Sydney.",
        "bailout": "The circumnavigation closes wherever it closes — a Panama return remains an "
                   "alternative to the second Pacific pass. Broad projection — refine before commit.",
        "countries": ["United States", "Mexico", "El Salvador", "Costa Rica", "Panama",
                      "Ecuador", "Tonga", "Fiji", "France", "Australia"],
        "keyDestinations": ["California", "Mexico", "Galápagos", "Marquesas (2nd pass)",
                            "Fiji", "New Caledonia", "Sydney"],
    },
}

# --------------------------------------------------------------------------
# 2. DISTANCE PADDING  (KML lines are rhumb-line; real cruising wanders)
#    base_nm (great-circle from the KML) * PAD[n] = displayed nm.
#    1.20 default. Heavier where the KML line is a stripped through-route and
#    the chapter is months of local cruising-ground exploring (Scotland winter,
#    Brazil bays, Patagonian channels). TUNE THESE — they drive the hero total.
# --------------------------------------------------------------------------
PAD_DEFAULT = 1.20
PAD = {
    2: 1.15,   # Med Westward — 64 waypoints; line already wanders
    3: 1.20,   # Morocco & Madeira
    4: 1.35,   # Azores — inter-island hopping across 9 islands
    5: 1.25,   # British Isles — detailed clockwise loop already
    6: 3.00,   # Scotland & Ireland Winter — 6-mo loch-hopping; line stripped to 5 pts
    7: 1.25,   # Nordic & Svalbard — 27 pts incl. Svalbard out-and-back
    8: 1.20,   # Southbound & Staging
    9: 1.05,   # Atlantic Crossing — pure ocean passage
    10: 2.00,  # Brazil — heavy bay-hopping (Ilha Grande, Salvador)
    11: 1.25,  # River Plate to Patagonia
    12: 2.50,  # Patagonia & Channels — months of fjord exploring; line stripped to 4 pts
    13: 1.40,  # Chilean Coast North — coastal + Juan Fernández + positioning hold
    14: 1.15,  # Easter Island & Pitcairn — remote passages
    15: 1.45,  # French Polynesia — heavy atoll/island cruising over 7 months
    16: 1.40,  # New Zealand — Bay of Islands + Hauraki + Fiordland
    17: 1.20,  # NZ -> Japan — island passages
    18: 1.30,  # Japan -> Alaska — Japan coastal + Aleutians/Alaska
    19: 1.20,  # Pacific Coast South & Return — 34 pts; line already detailed
}

# Ch 1 (Med Eastward) distance is the ACTUAL sailed track, supplied directly
# (no rhumb-line padding applies). Phase 2 will replace this with the real GPX sum.
CH1_ACTUAL_NM = 6000

# --------------------------------------------------------------------------
# 3. MAJOR PORTS — strategic hubs/gateways shown with larger circle markers.
#    Matched against KML waypoint names exactly. Edit to taste.
# --------------------------------------------------------------------------
MAJOR_PORTS = {
    "Gibraltar", "Valletta, Malta", "Funchal, Madeira", "Horta, Faial", "Tromsø",
    "Mindelo, Cape Verde", "Recife", "Rio de Janeiro", "Ushuaia", "Valparaíso",
    "Papeete, Tahiti", "Suva, Fiji", "Auckland", "Yokohama", "Dutch Harbor, Unalaska",
    "San Francisco", "Panama City (Balboa)", "Sydney",
}

# --------------------------------------------------------------------------
# 4. ROUTING LABELS — named vertices that are routing geometry, not destinations.
#    Still rendered, but flagged "routingLabel": true so the HTML can mute/hide them.
# --------------------------------------------------------------------------
ROUTING_LABELS = {
    "Cape Sounion", "Corinth Canal East", "Corinth Canal West",
    "Bear Island approach", "Southbound", "Tromsø (return)", "Harstad",
    "Helgeland (southbound)", "Trondheim (southbound)", "Bergen (southbound)",
    "Canal Cockburn", "South toward NZ", "Wellington (return)",
    "Bay of Islands (refit)", "Kuril Islands approach", "Attu area",
    "El Salvador coast",
}

# --------------------------------------------------------------------------
# 5. PERMANENT AVOIDANCE ZONES — framework Appendix C (9 zones, 10 polygons).
#    Rough whole-degree bounds; rendered as red-shaded rectangles (toggle group).
#    Bounds are [south, west, north, east].
# --------------------------------------------------------------------------
PAZ = [
    {"zone": "Red Sea / Bab el-Mandeb / Gulf of Aden", "bounds": [11, 32, 30, 55]},
    {"zone": "Somali Basin / Western Indian Ocean", "bounds": [-5, 42, 15, 65]},
    {"zone": "Persian Gulf / Strait of Hormuz", "bounds": [24, 48, 30, 58]},
    {"zone": "Gulf of Guinea / West African Coast", "bounds": [-5, -5, 10, 12]},
    {"zone": "Venezuela", "bounds": [9, -72, 13, -60]},
    {"zone": "NW Pacific — Russian Far East", "bounds": [42, 135, 65, 170]},
    {"zone": "NW Pacific — North Korea", "bounds": [38, 124, 43, 131]},
    {"zone": "Singapore Strait", "bounds": [0.5, 103, 2, 105]},
    {"zone": "Sulu Sea / Mindanao Coast", "bounds": [4, 119, 10, 126]},
    {"zone": "Myanmar Coast", "bounds": [9, 92, 21, 98]},
]

# --------------------------------------------------------------------------
# 5b. CURATED ROUTE INSERTIONS — stops not yet in the master KML.
#     Each insertion adds a waypoint AND splices its vertex into the chapter's
#     route line, right after the named reference vertex (matched by lon,lat).
#     Applied in list order, so an insertion may reference a prior insertion's
#     vertex. major/routingLabel flags come from MAJOR_PORTS/ROUTING_LABELS by name.
#     De-dupes safely. RECONCILIATION NOTE: the master KML will be sunset once the
#     interactive map is finished, so these insertions are the permanent home.
# --------------------------------------------------------------------------
CURATED_INSERTIONS = [
    {
        "chapter": 19,
        "name": "Panama City (Balboa)",      # Pacific side: provisioning/spares pre-Pacific
        "lat": 8.95, "lon": -79.53,
        "after_lonlat": (-83.165, 8.64),      # splice after Golfito, Costa Rica
    },
    {
        "chapter": 19,
        "name": "Las Perlas, Panama",         # staging anchorage before the offshore hop
        "lat": 8.40, "lon": -79.05,
        "after_lonlat": (-79.53, 8.95),       # splice after Panama City (Balboa)
    },
]

# --------------------------------------------------------------------------
# 6. FOLDER -> CHAPTER MAPPING
# --------------------------------------------------------------------------
def folder_to_chapter(folder_name):
    """Map a KML folder name to a map chapter number, or None to skip."""
    n = folder_name.strip()
    if n.startswith("0 ") or n.startswith("Med "):
        return 2                      # all Med legs merge into Ch 2 (Westward)
    m = re.match(r"Ch (\d+)([ab]?) ", n)
    if not m:
        return None
    base, suffix = int(m.group(1)), m.group(2)
    if base <= 14:
        return base + 2               # KML Ch 1..14 -> map Ch 3..16
    if base == 15:
        return 17 if suffix == "a" else 18   # 15a -> 17, 15b -> 18
    if base == 16:
        return 19                     # KML Ch 16 -> map Ch 19
    return None


# --------------------------------------------------------------------------
# 7. GEOMETRY HELPERS
# --------------------------------------------------------------------------
def haversine_nm(lon1, lat1, lon2, lat2):
    R = 3440.065  # nautical miles
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def line_nm(coords_lonlat):
    """Sum great-circle distance over a list of (lon, lat) vertices."""
    return sum(
        haversine_nm(coords_lonlat[i][0], coords_lonlat[i][1],
                     coords_lonlat[i + 1][0], coords_lonlat[i + 1][1])
        for i in range(len(coords_lonlat) - 1)
    )


def parse_coords(coordstr):
    """KML coordinate string -> list of (lon, lat) tuples."""
    out = []
    for triple in coordstr.split():
        parts = triple.split(",")
        out.append((float(parts[0]), float(parts[1])))
    return out


# --------------------------------------------------------------------------
# 8. MAIN
# --------------------------------------------------------------------------
def build(kml_path, out_path):
    kml = open(kml_path, encoding="utf-8").read()

    # Accumulate geometry per chapter from the KML folders.
    geom = {}  # chapter -> {"routes": [...], "waypoints": [...]}
    for chunk in re.split(r"<Folder><name>", kml)[2:]:
        folder = chunk.split("</name>", 1)[0]
        ch = folder_to_chapter(folder)
        if ch is None:
            continue
        body = chunk.split("</Folder>", 1)[0]
        bucket = geom.setdefault(ch, {"routes": [], "waypoints": []})

        # The route LineString for this folder.
        ls = re.search(r"<LineString>.*?<coordinates>([^<]+)</coordinates>", body, re.S)
        if ls:
            lonlat = parse_coords(ls.group(1))
            bucket["routes"].append({
                "lonlat": lonlat,                                # for nm calc
                "latlon": [[lat, lon] for lon, lat in lonlat],   # for Leaflet
            })

        # Named Point waypoints.
        for name, coord in re.findall(
            r"<Placemark><name>([^<]+)</name><styleUrl>[^<]+</styleUrl>"
            r"<Point><coordinates>([^<]+)</coordinates>", body
        ):
            lon, lat = parse_coords(coord)[0]
            bucket["waypoints"].append({"name": name, "lat": lat, "lon": lon})

    # Apply curated route insertions (stops not yet in the master KML).
    for ins in CURATED_INSERTIONS:
        bucket = geom.setdefault(ins["chapter"], {"routes": [], "waypoints": []})
        ref = ins["after_lonlat"]
        # Splice the vertex into whichever route line contains the reference vertex.
        for route in bucket["routes"]:
            for i, (lon, lat) in enumerate(route["lonlat"]):
                if abs(lon - ref[0]) < 1e-6 and abs(lat - ref[1]) < 1e-6:
                    route["lonlat"].insert(i + 1, (ins["lon"], ins["lat"]))
                    route["latlon"].insert(i + 1, [ins["lat"], ins["lon"]])
                    break
        # Add the waypoint right after the reference waypoint (or append).
        wp = {"name": ins["name"], "lat": ins["lat"], "lon": ins["lon"]}
        pos = len(bucket["waypoints"])
        for j, w in enumerate(bucket["waypoints"]):
            if abs(w["lon"] - ref[0]) < 1e-6 and abs(w["lat"] - ref[1]) < 1e-6:
                pos = j + 1
                break
        bucket["waypoints"].insert(pos, wp)

    # Assemble chapters.
    chapters = []
    drawn_nm_total = 0
    for n in sorted(CHAPTER_META):
        meta = CHAPTER_META[n]
        g = geom.get(n, {"routes": [], "waypoints": []})

        # Distance.
        if n == 1:
            base_nm = CH1_ACTUAL_NM
            mult = 1.0
            nm = CH1_ACTUAL_NM
        else:
            base_nm = round(sum(line_nm(r["lonlat"]) for r in g["routes"]))
            mult = PAD.get(n, PAD_DEFAULT)
            nm = round(base_nm * mult)
            drawn_nm_total += nm

        # De-duplicate waypoints within the chapter by rounded location.
        seen, wpts = set(), []
        for w in g["waypoints"]:
            key = (round(w["lat"], 4), round(w["lon"], 4))
            if key in seen:
                continue
            seen.add(key)
            wpts.append({
                "name": w["name"],
                "lat": w["lat"],
                "lon": w["lon"],
                "major": w["name"] in MAJOR_PORTS,
                "routingLabel": w["name"] in ROUTING_LABELS,
            })

        chapters.append({
            "num": n,
            "name": meta["name"],
            "when": meta["when"],
            "era": meta["era"],
            "routing": meta["routing"],
            "bailout": meta["bailout"],
            "countries": meta["countries"],
            "keyDestinations": meta["keyDestinations"],
            "blogUrl": meta.get("blogUrl"),   # forward-design: null until populated (past/current chapters)
            "nm": nm,
            "nmBase": base_nm,
            "padMultiplier": mult,
            "routes": [r["latlon"] for r in g["routes"]],
            "waypoints": wpts,
        })

    hero_nm = drawn_nm_total + CH1_ACTUAL_NM  # drawn chapters + Ch1's supplied track
    data = {
        "meta": {
            "title": "S/Y GRACE — Global Voyage Framework",
            "frameworkVersion": "v1.4",
            "mapVersion": "v1.0",
            "hero": {
                "nm": hero_nm,
                "years": "10+",
                "nations": 39,
                "territories": 15,
            },
            "note": "Chapter 1 (Med Eastward) is a metadata-only stub; its track "
                    "arrives in Phase 2 from a NoForeignLand GPX export.",
        },
        "paz": PAZ,
        "chapters": chapters,
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # ---- console summary ----
    print(f"Wrote {out_path}\n")
    print(f"{'Ch':>2}  {'Chapter':30s} {'base':>6s} {'x':>5s} {'nm':>7s}  "
          f"{'wpts':>4s} {'maj':>3s} {'rtlbl':>5s}")
    print("-" * 78)
    for c in chapters:
        maj = sum(1 for w in c["waypoints"] if w["major"])
        rtl = sum(1 for w in c["waypoints"] if w["routingLabel"])
        base = "—" if c["num"] == 1 else f"{c['nmBase']:>6d}"
        print(f"{c['num']:>2}  {c['name'][:30]:30s} {base:>6s} "
              f"{c['padMultiplier']:>5.2f} {c['nm']:>7d}  "
              f"{len(c['waypoints']):>4d} {maj:>3d} {rtl:>5d}")
    print("-" * 78)
    drawn = sum(c["nm"] for c in chapters if c["num"] != 1)
    print(f"Drawn (Ch 2–19):     {drawn:>7,} nm")
    print(f"Ch 1 (Phase 2):      {CH1_ACTUAL_NM:>7,} nm")
    print(f"HERO TOTAL:          {hero_nm:>7,} nm  ·  10+ years  ·  39 nations  ·  15 territories")
    print(f"PAZ rectangles:      {len(PAZ)}")
    return data


if __name__ == "__main__":
    kml_in = sys.argv[1] if len(sys.argv) > 1 else "grace-voyage-framework.kml"
    json_out = sys.argv[2] if len(sys.argv) > 2 else "grace-voyage-map.json"
    build(kml_in, json_out)
