#!/usr/bin/env python3
# Guide wireframes — part of Voyage Atlas, https://github.com/Peter-Petrik/voyage-atlas
# Copyright (C) 2026 Peter Petrik
#
# This program is free software: you can redistribute it and/or modify it under the terms of the
# GNU General Public License as published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version. It is distributed in the hope that it will be
# useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details:
# https://www.gnu.org/licenses/
"""Draws the visual guide's screen wireframes (Figures 1.1 to 1.4) in a light and a dark palette.

Run from the repository root, with Python 3 and nothing to install:

    python3 tools/guide-wireframes.py

It writes the eight files docs/images/guide-1-*-light.svg and guide-1-*-dark.svg from the sample
voyage, voyage-data.json. An output folder and a voyage file can be given as two arguments instead.

Both files of a pair come from the same drawing calls, so they differ only in color. The labels are the
tools' own on-screen text and the values are the sample voyage's, as the editor and the viewer show
them; test/docs.test.js checks both against the tools. The labels and the computed values (DIST, SYNC,
the header figures, COUNTRIES) are written here by hand, so a change to the tools or the sample that a
wireframe shows fails those tests until this script follows and is run again. Text that belongs to one
chapter, row or panel is wrapped in a <g data-...> group so the tests can read it back by chapter or row.
"""
import json, sys
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr

ROOT = Path(__file__).resolve().parent.parent
OUT = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / 'docs' / 'images')
SAMPLE = json.load(open(sys.argv[2] if len(sys.argv) > 2 else ROOT / 'voyage-data.json', encoding='utf-8'))
CH = SAMPLE['chapters']

PALETTES = {
    'light': dict(page='#ffffff', bg='#f4efe4', panel='#fbf8f1', line='#cbbfa9', ink='#2a2722', muted='#6b6355',
                  accent='#a32e38', accent_soft='#f3dfe0', chart='#eef0ec', land='#e2e5df', active='#f6e6e6',
                  success='#2d7a3a', success_soft='#e9f1e6', future_soft='#e6e7e6',
                  callout='#a32e38', callout_ink='#ffffff', shade='#00000026', c1='#8e86c4', c2='#6fb3dc',
                  c3='#3f9c8c', c4='#1f7a3c', c5='#9a9a3a', dim='#b9c4c0', gray='#8f8f8f'),
    'dark': dict(page='#0d1117', bg='#1f232b', panel='#262b34', line='#4b5360', ink='#ece8e0', muted='#a9a397',
                 accent='#d4626c', accent_soft='#3a2a2e', chart='#2b3038', land='#343a43', active='#3a2a2e',
                 success='#4caf6a', success_soft='#26352b', future_soft='#30353d',
                 callout='#d4626c', callout_ink='#1f232b', shade='#00000059', c1='#a9a2dc', c2='#88c6ea',
                 c3='#5bb8a6', c4='#4fa86a', c5='#c3c35c', dim='#56606a', gray='#9a9a9a'),
}

MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"
SERIF = "Georgia, 'Times New Roman', serif"
SYMBOL = "'Segoe UI Symbol', 'DejaVu Sans', 'Apple Symbols', sans-serif"

# Values the tools compute for the sample voyage (checked by the tests against the tools' own code).
DIST = ['537 nm', '1,049 nm', '3,059 nm', '1,991 nm', '2,434 nm']
SYNC = ['', '🔗', '🔗', '⇄', '🔗']
EDITOR_STATS = [('9,070', 'NAUTICAL MILES'), ('9', 'NATIONS'), ('3', 'TERRITORIES'), ('5', 'CHAPTERS'),
                ('61', 'WAYPOINTS'), ('78', 'VERTICES')]
VIEWER_STATS = EDITOR_STATS[:5]
COUNTRIES = {1: ['Turkey', 'Greece'], 2: ['Turkey', 'Greece'], 3: ['Greece', 'Malta', 'Italy', 'France', 'Spain']}


class Svg:
    def __init__(self, w, h, title, desc, p):
        self.w, self.h, self.p = w, h, p
        self.parts = []
        self.head = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
                     f'role="img" aria-labelledby="t d" font-family="{MONO}">\n'
                     f'<title id="t">{escape(title)}</title>\n<desc id="d">{escape(desc)}</desc>\n'
                     f'<rect width="{w}" height="{h}" fill="{p["page"]}"/>\n')

    def group(self, **attrs):
        self.parts.append('<g ' + ' '.join(f'data-{k}={quoteattr(str(v))}' for k, v in attrs.items()) + '>')

    def end(self):
        self.parts.append('</g>')

    def rect(self, x, y, w, h, fill=None, stroke=None, r=4, dash=None, sw=1, **data):
        p = self.p
        a = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{p.get(fill, fill) if fill else "none"}"'
        a += ''.join(f' data-{k}={quoteattr(str(v))}' for k, v in data.items())
        if stroke:
            a += f' stroke="{p.get(stroke, stroke)}" stroke-width="{sw}"'
        if dash:
            a += f' stroke-dasharray="{dash}"'
        self.parts.append(a + '/>')

    def text(self, x, y, s, size=11, fill='ink', anchor='start', weight=None, family=None, italic=False, spacing=None):
        a = f'<text x="{x}" y="{y}" font-size="{size}" fill="{self.p.get(fill, fill)}"'
        if anchor != 'start':
            a += f' text-anchor="{anchor}"'
        if weight:
            a += f' font-weight="{weight}"'
        if family:
            a += f' font-family="{family}"'
        if italic:
            a += ' font-style="italic"'
        if spacing:
            a += f' letter-spacing="{spacing}"'
        self.parts.append(a + f'>{escape(s)}</text>')

    def line(self, pts, color, w=2, dash=None, opacity=1, cap='round'):
        d = ' '.join(f'{x},{y}' for x, y in pts)
        a = (f'<polyline points="{d}" fill="none" stroke="{self.p.get(color, color)}" stroke-width="{w}" '
             f'stroke-linecap="{cap}" stroke-linejoin="round" opacity="{opacity}"')
        if dash:
            a += f' stroke-dasharray="{dash}"'
        self.parts.append(a + '/>')

    def dot(self, x, y, r, fill, stroke='ink', opacity=1, sw=1):
        self.parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{self.p.get(fill, fill)}" '
                          f'stroke="{self.p.get(stroke, stroke)}" stroke-width="{sw}" opacity="{opacity}"/>')

    def button(self, x, y, w, h, label, accent=False, size=11, family=None):
        self.rect(x, y, w, h, 'accent_soft' if accent else 'panel', 'accent' if accent else 'line')
        self.text(x + w / 2, y + h / 2 + size * 0.36, label, size, 'accent' if accent else 'ink', 'middle', family=family)

    def field(self, x, y, w, label, value, h=20, placeholder=False):
        self.text(x, y, label, 8.5, 'muted', spacing='0.08em')
        self.rect(x, y + 5, w, h, 'bg', 'line', r=3)
        if value:
            self.text(x + 7, y + 5 + h / 2 + 4, value, 10.5, 'muted' if placeholder else 'ink')

    def callout(self, x, y, n):
        self.dot(x, y, 11, 'callout', 'page', sw=2)
        self.text(x, y + 4, str(n), 11.5, 'callout_ink', 'middle', weight='bold')

    def save(self, path):
        with open(path, 'w', encoding='utf-8') as f:
            f.write(self.head + '\n'.join(self.parts) + '\n</svg>\n')


def era_chip(s, x, y, era, size=7.5, w=56, h=13):
    """The editor's era chip: a route sample and the era, tinted as the editor tints it."""
    fill, ink = {'past': ('accent_soft', 'accent'), 'current': ('success_soft', 'success'),
                 'future': ('future_soft', 'muted')}[era]
    s.rect(x, y, w, h, fill, r=2)
    s.line([(x + 4, y + h / 2), (x + 4 + h * 0.8, y + h / 2)], ink, 1.5, '3 2' if era == 'future' else None, cap='butt')
    s.text(x + 8 + h * 0.8, y + h / 2 + size * 0.38, era.upper(), size, ink, spacing='0.06em')


def stat_tiles(s, x, y, items, gap=78):
    s.group(part='stats')
    for i, (num, label) in enumerate(items):
        cx = x + i * gap
        s.text(cx, y, num, 16, 'accent', 'middle', family=SERIF)
        s.text(cx, y + 13, label, 7.5, 'muted', 'middle', spacing='0.1em')
    s.end()


def footer(s, y, left_x, right_x, version_label):
    s.rect(0, y, s.w, s.h - y, 'bg', r=0)
    s.line([(0, y), (s.w, y)], 'line', 1)
    s.text(left_x, y + 21, "FAQ / Owner's Manual", 10, 'accent')
    s.text(s.w / 2, y + 21, 'A project of Sailing Grace', 10, 'accent', 'middle')
    s.text(right_x, y + 21, version_label, 10, 'accent', 'end')


def chart_routes(s, ox, oy, active=None, scale=1.0, dim_others=False):
    """A stylized voyage: five chapters, east to west, in the palette's chapter colors; the future
    chapters (3 to 5 in the sample) dashed, as both tools draw them."""
    routes = [
        ('c1', False, [(560, 150), (585, 165), (610, 150), (630, 170)]),
        ('c2', False, [(430, 170), (460, 140), (500, 160), (530, 150), (560, 150)]),
        ('c3', True, [(260, 230), (300, 200), (350, 210), (400, 180), (430, 170)]),
        ('c4', True, [(150, 300), (190, 270), (230, 255), (260, 230)]),
        ('c5', True, [(20, 330), (80, 320), (150, 300)]),
    ]
    for i, (color, planned, pts) in enumerate(routes):
        pts = [(ox + x * scale, oy + y * scale) for x, y in pts]
        is_active = active == i
        op = 1 if (is_active or not dim_others) else 0.3
        s.line(pts, color, 4 if is_active else 2.5, '8 6' if planned else None, op, cap='butt' if planned else 'round')
        for j, (x, y) in enumerate(pts):
            s.dot(x, y, 5 if j in (0, len(pts) - 1) else 3.5, color, 'ink', op, 1)


def wrap(text, width):
    """Lines of at most `width` characters, broken at spaces."""
    lines, cur = [], ''
    for word in text.split(' '):
        if cur and len(cur) + 1 + len(word) > width:
            lines.append(cur)
            cur = word
        else:
            cur = f'{cur} {word}' if cur else word
    return lines + [cur] if cur else lines


# ─── Figure 1.1: the editor screen ────────────────────────────────────────────

def fig_1_1(p):
    s = Svg(1000, 640, 'Figure 1.1: The editor screen',
            'Wireframe of the Voyage Atlas editor with the sample voyage and chapter 2 active: the header '
            'with stats and the Load, Save and theme buttons; the chapter panel with Voyage Settings, the '
            'panel controls, the chapter list and the add-chapter button; the search box, the chart and '
            'the status bar with Rapid click; and the footer. Numbered callouts match the list under the '
            'figure.', p)
    s.rect(0, 0, 1000, 640, 'bg', 'line', r=6)
    s.text(16, 26, 'Voyage Atlas — Editor', 19, 'accent', family=SERIF)
    s.text(16, 42, 'Chapter & waypoint management', 9.5, 'muted', spacing='0.04em')
    stat_tiles(s, 494, 26, EDITOR_STATS, gap=60)
    s.button(822, 15, 62, 26, 'Load ▾')
    s.rect(892, 15, 62, 26, 'accent_soft', 'accent')
    s.text(912, 32, 'Save', 11, 'accent', 'middle')
    s.line([(936, 15), (936, 41)], 'accent', 1)
    s.text(945, 32, '▾', 11, 'accent', 'middle')
    s.button(962, 15, 28, 26, '◐', family=SYMBOL)
    s.line([(0, 56), (1000, 56)], 'line', 1)
    s.callout(440, 30, 1)
    s.rect(10, 66, 420, 30, 'panel', 'line')
    s.text(22, 86, '⚙  Voyage Settings', 12.5, 'accent', weight='bold', family=SERIF)
    s.text(418, 86, '▾', 12, 'accent', 'end')
    s.callout(392, 81, 2)
    s.text(12, 120, '📋', 11)
    s.button(30, 108, 18, 16, '⊞', size=9)
    s.button(51, 108, 18, 16, '⊟', size=9)
    s.text(78, 120, '📍', 11)
    s.button(96, 108, 18, 16, '⊞', size=9)
    s.button(117, 108, 18, 16, '⊟', size=9)
    s.button(144, 106, 148, 20, '🌍 Look up all countries', size=10)
    s.callout(306, 116, 3)
    for i, ch in enumerate(CH):
        y = 136 + i * 42
        act = ch['num'] == 2
        name = ch['name'] if len(ch['name']) <= 20 else ch['name'][:19].rstrip(', ') + '…'
        s.rect(10, y, 420, 34, 'active' if act else 'panel', 'accent' if act else 'line')
        s.group(chapter=ch['num'])
        s.text(20, y + 22, '≡', 13, 'muted')
        s.text(38, y + 22, str(ch['num']), 13, 'accent', family=SERIF)
        s.text(60, y + 21, name, 11)
        era_chip(s, 232, y + 11, ch['era'])
        if SYNC[i]:
            s.text(302, y + 21, SYNC[i], 10, 'muted', 'middle')
        s.text(362, y + 21, DIST[i], 9.5, 'muted', 'end')
        s.text(382, y + 22, '📋', 10, anchor='middle')
        s.text(402, y + 22, '📍', 10, anchor='middle')
        s.text(424, y + 22, '✕', 10, 'muted', 'end')
        s.end()
    s.callout(196, 157, 4)
    s.button(10, 352, 102, 20, '+ Add chapter', accent=True, size=10)
    s.callout(126, 362, 5)
    s.rect(438, 56, 6, 544, 'land', r=0)
    s.callout(441, 420, 6)
    s.rect(454, 66, 446, 26, 'bg', 'line', r=3)
    s.text(464, 83, 'Search places (Nominatim)…', 11, 'muted')
    s.button(928, 66, 62, 26, 'Search', size=10)
    s.callout(914, 79, 7)
    s.rect(454, 100, 536, 466, 'chart', 'line', r=0)
    s.button(464, 110, 26, 26, '+', size=14)
    s.button(464, 136, 26, 26, '−', size=14)
    chart_routes(s, 440, 160, active=1, scale=0.85)
    s.dot(440 + 445 * 0.85, 160 + 155 * 0.85, 4, 'page', 'c2', 1, 1.5)   # a ghost midpoint
    s.dot(440 + 515 * 0.85, 160 + 155 * 0.85, 2.5, 'gray', 'gray')     # a shaping vertex
    s.callout(980, 330, 8)
    s.rect(454, 568, 536, 30, 'bg', r=0)
    s.line([(454, 568), (990, 568)], 'line', 1)
    s.group(part='status')
    s.text(464, 587, 'Chapter 2: Aegean Greece', 10, 'accent', weight='bold')
    s.text(640, 587, f"· {len(CH[1]['waypoints'])} rows · {DIST[1]}", 10, 'muted')
    s.end()
    s.button(880, 573, 104, 20, 'Rapid click: OFF', size=9.5)
    s.callout(864, 583, 9)
    footer(s, 600, 16, 984, 'Voyage Atlas Editor vX.Y.Z')
    s.callout(600, 616, 10)
    return s


# ─── Figure 1.2: a chapter, part by part ──────────────────────────────────────

def fig_1_2(p):
    ch = CH[1]
    named = sum(1 for w in ch['waypoints'] if w['name'].strip())
    m1, y1, m2, y2 = ch['when'].replace('–', ' ').split()
    s = Svg(1000, 780, 'Figure 1.2: A chapter, part by part',
            'Wireframe of chapter 2 of the sample voyage in the editor: its header, its metadata form '
            'opened with the clipboard toggle, and its waypoint table opened with the pin toggle, with the '
            'toolbar, the columns and shaping vertex rows. Numbered callouts match the list under the figure.', p)
    s.rect(0, 0, 1000, 780, 'bg', 'line', r=6)
    s.text(20, 22, 'CHAPTER HEADER', 9, 'muted', spacing='0.1em')
    y = 62
    s.rect(20, y, 960, 48, 'active', 'accent')
    s.group(chapter=ch['num'])
    s.text(40, y + 31, '≡', 18, 'muted', 'middle')
    s.text(76, y + 31, str(ch['num']), 18, 'accent', 'middle', family=SERIF)
    s.text(110, y + 30, ch['name'], 14)
    era_chip(s, 512, y + 15, ch['era'], size=10, w=100, h=18)
    s.text(690, y + 30, SYNC[1], 14, anchor='middle')
    s.text(770, y + 30, DIST[1], 12, 'muted', 'middle')
    s.rect(836, y + 11, 28, 26, 'panel', 'line')
    s.text(850, y + 30, '📋', 13, anchor='middle')
    s.rect(886, y + 11, 28, 26, 'panel', 'line')
    s.text(900, y + 30, '📍', 13, anchor='middle')
    s.text(950, y + 30, '✕', 13, 'muted', 'middle')
    s.end()
    for x, n in [(40, 1), (76, 2), (110, 3), (562, 4), (690, 5), (770, 6), (850, 7), (900, 8), (950, 9)]:
        s.callout(x, y - 14 if n % 2 else y + 62, n)
    # Metadata form: Name and Era, When, Pad Multiplier and Blog URL in pairs; the rest full width.
    y = 152
    s.text(20, y, 'METADATA FORM  (📋)', 9, 'muted', spacing='0.1em')
    s.rect(20, y + 10, 960, 310, 'panel', 'line')
    s.group(part='form')
    s.field(36, y + 34, 450, 'NAME', ch['name'])
    s.field(510, y + 34, 450, 'ERA', ch['era'].capitalize() + ' ▾')
    s.text(36, y + 76, 'WHEN', 8.5, 'muted', spacing='0.08em')
    for i, (x, v) in enumerate([(36, m1), (96, y1), (186, m2), (246, y2)]):
        s.rect(x, y + 81, 54 if i % 2 == 0 else 62, 20, 'bg', 'line', r=3)
        s.text(x + 6, y + 95, v + ' ▾', 10)
    s.text(166, y + 95, 'to', 9.5, 'muted')
    s.field(36, y + 122, 450, 'PAD MULTIPLIER', str(ch['padMultiplier']))
    s.field(510, y + 122, 450, 'BLOG URL', ch['blogUrl'] or '')
    s.text(36, y + 164, 'NOTES', 8.5, 'muted', spacing='0.08em')
    s.rect(36, y + 169, 924, 54, 'bg', 'line', r=3)
    s.field(36, y + 242, 924, 'COUNTRIES / TERRITORIES', 'AUTO: ' + '; '.join(COUNTRIES[2]), placeholder=True)
    s.field(36, y + 286, 924, 'KEY DESTINATIONS', '; '.join(ch['keyDestinations']))
    s.end()
    s.callout(984, y + 22, 10)
    # Waypoint table
    y = 492
    s.text(20, y, 'WAYPOINT TABLE  (📍)', 9, 'muted', spacing='0.1em')
    s.rect(20, y + 10, 960, 270, 'panel', 'line')
    tx = 36
    s.group(part='toolbar')
    for label, w in [('+ Add row', 76), ('+ Add N rows', 100), ('Paste', 52), ('Look up countries', 132)]:
        s.button(tx, y + 22, w, 22, label, size=10)
        tx += w + 8
    s.text(964, y + 37, f"{len(ch['waypoints'])} rows · {named} named", 10, 'muted', 'end')
    s.end()
    s.callout(tx + 6, y + 33, 11)
    hy = y + 70
    s.line([(20, hy + 8), (980, hy + 8)], 'line', 1)
    s.group(part='columns')
    for x, c in [(66, '#'), (96, 'NAME'), (300, 'LAT'), (400, 'LON'), (500, 'M'), (540, 'G'), (580, 'D'),
                 (620, 'COUNTRY'), (760, 'NOTES')]:
        s.text(x, hy, c, 9, 'muted', 'middle' if len(c) == 1 else 'start', spacing='0.06em')
    s.end()
    s.callout(984, hy - 4, 12)
    for i, w in enumerate(ch['waypoints'][:5]):
        ry = hy + 32 + i * 34
        shaping = not w['name'].strip()
        if shaping:
            s.rect(21, ry - 20, 958, 34, 'bg', r=0)
        flags = ''.join(f for f, k in (('M', 'major'), ('G', 'gateway'), ('D', 'decision')) if w[k])
        s.group(row=i + 1)
        s.text(40, ry, '≡', 12, 'muted', 'middle')
        s.text(66, ry, str(i + 1), 10.5, 'ink', 'middle')
        s.text(96, ry, '(shaping vertex)' if shaping else w['name'], 11, 'muted' if shaping else 'ink', italic=shaping)
        s.text(300, ry, str(w['lat']), 10.5)
        s.text(400, ry, str(w['lon']), 10.5)
        for f, x in (('M', 500), ('G', 540), ('D', 580)):
            s.rect(x - 6, ry - 10, 12, 12, 'accent' if f in flags else 'bg', 'line', r=2, box=f, checked=str(f in flags).lower())
        s.rect(612, ry - 16, 3, 22, 'c4', r=0)
        s.text(620, ry, w['country'], 10.5, 'muted' if shaping else 'ink', italic=shaping)
        s.text(960, ry, '✕', 10, 'muted', 'middle')
        s.end()
    s.callout(250, hy + 32 + 2 * 34 - 4, 13)
    return s


# ─── Figure 1.3: the viewer screen ────────────────────────────────────────────

def fig_1_3(p):
    ch = CH[0]
    s = Svg(1000, 640, 'Figure 1.3: The viewer screen',
            'Wireframe of the Voyage Atlas viewer with the sample voyage and chapter 1 selected: the header '
            'with the drawer button, title, stats, Load, Chart your own voyage and theme buttons; the chart '
            'with zoom controls top-left, Chart & Layers top-right, the Chapters list bottom-left and the '
            'detail panel bottom-right; and the footer. Numbered callouts match the list under the figure.', p)
    s.rect(0, 0, 1000, 640, 'bg', 'line', r=6)
    s.button(14, 14, 30, 28, '☰', size=14)
    s.text(56, 28, 'Voyage Atlas', 18, 'accent', family=SERIF)
    s.text(56, 44, 'Click any route, waypoint, or chapter to explore', 9.5, 'muted')
    stat_tiles(s, 452, 26, VIEWER_STATS, gap=64)
    s.button(736, 15, 56, 26, 'Load…')
    s.button(800, 15, 152, 26, 'Chart your own voyage →', accent=True, size=9.5)
    s.button(960, 15, 30, 26, '◐', family=SYMBOL)
    s.line([(0, 56), (1000, 56)], 'line', 1)
    s.callout(392, 28, 1)
    s.rect(0, 57, 1000, 543, 'chart', r=0)
    chart_routes(s, 40, 150, active=0, scale=1.05, dim_others=True)
    s.callout(560, 300, 6)
    s.button(12, 68, 28, 28, '+', size=15)
    s.button(12, 96, 28, 28, '−', size=15)
    s.callout(54, 82, 2)
    s.rect(800, 68, 188, 190, 'panel', 'line')
    s.group(part='layers')
    s.text(814, 90, 'CHART & LAYERS', 10, 'accent', spacing='0.08em', family=SERIF)
    s.text(976, 90, '▾', 9, 'muted', 'end')
    s.line([(814, 98), (976, 98)], 'line', 1)
    ly = 116
    for i, (name, on) in enumerate([('Routes', True), ('Waypoints', True), ('Avoidance zones', False),
                                    ('Decision points', False), ('Gateway ports', False)]):
        s.rect(814, ly - 9, 11, 11, 'accent' if on else 'bg', 'line', r=2)
        s.text(834, ly, name, 10.5)
        ly += 22
        if i == 0:
            s.line([(836, ly - 6), (852, ly - 6)], 'ink', 1.5)
            s.text(858, ly - 2, 'Sailed or under way', 9, 'muted')
            s.line([(836, ly + 9), (852, ly + 9)], 'ink', 1.5, '4 3', cap='butt')
            s.text(858, ly + 13, 'Planned', 9, 'muted')
            ly += 32
    s.end()
    s.callout(788, 82, 3)
    s.rect(12, 392, 200, 192, 'panel', 'line')
    s.text(24, 414, 'CHAPTERS', 10, 'accent', spacing='0.08em', family=SERIF)
    s.text(200, 414, '▾', 9, 'muted', 'end')
    s.line([(24, 422), (200, 422)], 'line', 1)
    yy = 442
    for i, c in enumerate(CH):
        lines = wrap(c['name'], 23)
        h = 13 * len(lines) + 10
        if c['num'] == ch['num']:
            s.rect(20, yy - 13, 186, h, 'active', r=2)
        s.rect(26, yy - 7, 18, 6, f'c{i + 1}', r=3)
        s.group(chapter=c['num'], part='list')
        for k, t in enumerate(lines):
            s.text(52, yy + k * 13, t, 9.5, 'muted' if c['era'] == 'past' else 'ink')
        s.end()
        yy += h + 4
    s.callout(226, 404, 4)
    # Detail panel: Turkey has no notes, so the Notes block is not shown; its blog URL gives the link.
    s.rect(708, 426, 280, 158, 'panel', 'line')
    s.text(974, 450, '×', 15, 'muted', 'end')
    s.group(chapter=ch['num'], part='detail')
    s.text(724, 450, ch['when'].upper(), 8.5, 'muted', spacing='0.12em')
    s.text(724, 474, ch['name'], 14, 'accent', family=SERIF)
    s.rect(724, 486, 62, 17, 'accent_soft', 'accent', r=2)
    s.text(755, 498, DIST[0], 9.5, 'accent', 'middle')
    s.text(724, 526, 'COUNTRIES / TERRITORIES', 8.5, 'muted', spacing='0.1em')
    s.text(724, 542, ' · '.join(COUNTRIES[1]), 10)
    s.text(724, 568, 'Read the posts →', 10.5, 'accent')
    s.end()
    s.callout(696, 440, 5)
    footer(s, 600, 16, 984, 'Voyage Atlas vX.Y.Z')
    s.callout(600, 616, 7)
    return s


# ─── Figure 1.4: the viewer on narrow screens ─────────────────────────────────

def fig_1_4(p):
    s = Svg(1000, 660, 'Figure 1.4: The viewer on a narrow screen',
            'Two wireframes of the viewer with the sample voyage. Left, 900 px wide or less, with the Voyage '
            'Chapters drawer open: Chart your own voyage, the header stats and Load move into the drawer above '
            'the chapter rows. Right, a phone 640 px wide or less: Chart & Layers runs across the top, '
            'collapsed, and the detail panel for chapter 3 is a sheet along the bottom. Numbered callouts match '
            'the list under the figure.', p)
    s.text(10, 18, '900 PX WIDE OR LESS — DRAWER OPEN', 9, 'muted', spacing='0.1em')
    fx, fy, fw, fh = 10, 28, 600, 620
    s.rect(fx, fy, fw, fh, 'chart', 'line', r=6)
    s.rect(fx, fy, fw, 50, 'bg', r=6)
    s.button(fx + 12, fy + 11, 30, 28, '☰', size=14)
    s.text(fx + 54, fy + 31, 'Voyage Atlas', 16, 'accent', family=SERIF)
    s.button(fx + fw - 42, fy + 11, 30, 28, '◐', family=SYMBOL)
    s.line([(fx, fy + 50), (fx + fw, fy + 50)], 'line', 1)
    s.callout(fx + 180, fy + 25, 1)
    # At 641 to 900 px Chart & Layers starts open; the drawer's overlay dims the chart and the panel.
    cx = fx + fw - 196
    s.rect(cx, fy + 62, 184, 190, 'panel', 'line')
    s.text(cx + 12, fy + 82, 'CHART & LAYERS', 10, 'accent', spacing='0.08em', family=SERIF)
    s.text(cx + 172, fy + 82, '▾', 9, 'muted', 'end')
    s.line([(cx + 12, fy + 90), (cx + 172, fy + 90)], 'line', 1)
    ly = fy + 108
    for i, (name, on) in enumerate([('Routes', True), ('Waypoints', True), ('Avoidance zones', False),
                                    ('Decision points', False), ('Gateway ports', False)]):
        s.rect(cx + 12, ly - 9, 11, 11, 'accent' if on else 'bg', 'line', r=2)
        s.text(cx + 32, ly, name, 10.5)
        ly += 22
        if i == 0:
            s.line([(cx + 34, ly - 6), (cx + 50, ly - 6)], 'ink', 1.5)
            s.text(cx + 56, ly - 2, 'Sailed or under way', 9, 'muted')
            s.line([(cx + 34, ly + 9), (cx + 50, ly + 9)], 'ink', 1.5, '4 3', cap='butt')
            s.text(cx + 56, ly + 13, 'Planned', 9, 'muted')
            ly += 32
    dx, dy, dw = fx, fy + 50, 300
    s.rect(fx + dw, fy + 50, fw - dw, fh - 80, 'shade', r=0)
    s.rect(dx, dy, dw, fh - 50 - 30, 'bg', 'line', r=0)
    s.text(dx + 16, dy + 28, 'Voyage Chapters', 15, 'accent', family=SERIF)
    s.text(dx + dw - 16, dy + 28, '×', 16, 'muted', 'end')
    s.line([(dx, dy + 44), (dx + dw, dy + 44)], 'line', 1)
    s.button(dx + 16, dy + 56, dw - 32, 30, 'Chart your own voyage →', accent=True)
    s.callout(dx + dw + 14, dy + 71, 2)
    s.group(part='stats')
    for i, (num, label) in enumerate(VIEWER_STATS):
        gx = dx + 16 + (i % 2) * 140
        gy = dy + 114 + (i // 2) * 26
        s.text(gx, gy, num, 15, 'accent', family=SERIF)
        s.text(gx + 14 + len(num) * 7, gy, label, 7.5, 'muted', spacing='0.1em')
    s.end()
    s.callout(dx + dw + 14, dy + 128, 3)
    s.line([(dx, dy + 182), (dx + dw, dy + 182)], 'line', 1)
    s.button(dx + 16, dy + 194, dw - 32, 30, 'Load…')
    s.callout(dx + dw + 14, dy + 209, 4)
    s.line([(dx, dy + 238), (dx + dw, dy + 238)], 'line', 1)
    ry = dy + 238
    for i, c in enumerate(CH):
        keys = wrap(' · '.join(c['keyDestinations']), 40)
        h = 50 + 14 * len(keys)
        past = c['era'] == 'past'
        s.rect(dx + 14, ry + 9, 5, h - 18, f'c{i + 1}', r=2)
        s.group(chapter=c['num'], part='drawer')
        s.text(dx + 30, ry + 20, c['when'], 8.5, 'muted', spacing='0.04em')
        s.text(dx + 30, ry + 38, c['name'], 13, 'muted' if past else 'ink', family=SERIF)
        for k, t in enumerate(keys):
            s.text(dx + 30, ry + 54 + 14 * k, t, 9, 'muted')
        s.end()
        ry += h
        s.line([(dx, ry), (dx + dw, ry)], 'line', 1)
    s.callout(dx + dw + 14, dy + 280, 5)
    s.rect(fx, fy + fh - 30, fw, 30, 'bg', r=0)
    s.line([(fx, fy + fh - 30), (fx + fw, fy + fh - 30)], 'line', 1)
    s.text(fx + 12, fy + fh - 11, "FAQ / Owner's Manual", 9, 'accent')
    s.text(fx + fw / 2, fy + fh - 11, 'A project of Sailing Grace', 9, 'accent', 'middle')
    s.text(fx + fw - 12, fy + fh - 11, 'Voyage Atlas vX.Y.Z', 9, 'accent', 'end')
    # Right frame: a phone, chapter 3 selected
    ch = CH[2]
    s.text(650, 18, '640 PX WIDE OR LESS — A PHONE', 9, 'muted', spacing='0.1em')
    px, py, pw, ph = 650, 28, 300, 620
    s.rect(px, py, pw, ph, 'chart', 'line', r=6)
    s.rect(px, py, pw, 50, 'bg', r=6)
    s.button(px + 12, py + 11, 30, 28, '☰', size=14)
    s.text(px + 54, py + 31, 'Voyage Atlas', 16, 'accent', family=SERIF)
    s.button(px + pw - 42, py + 11, 30, 28, '◐', family=SYMBOL)
    s.line([(px, py + 50), (px + pw, py + 50)], 'line', 1)
    s.button(px + 10, py + 60, 26, 26, '+', size=14)
    s.button(px + 10, py + 86, 26, 26, '−', size=14)
    s.rect(px + 8, py + 120, pw - 16, 30, 'panel', 'line')
    s.text(px + 20, py + 140, 'CHART & LAYERS', 10, 'accent', spacing='0.08em', family=SERIF)
    s.text(px + pw - 20, py + 140, '▸', 9, 'muted', 'end')
    s.callout(px + pw + 14, py + 135, 6)
    chart_routes(s, px - 10, py + 150, active=2, scale=0.48, dim_others=True)
    notes = wrap(ch['notes'], 34)
    sh = 166 + 16 * len(notes)
    sy = py + ph - 64 - sh
    s.rect(px, sy, pw, sh, 'panel', 'line', r=6)
    s.text(px + pw - 14, sy + 22, '×', 15, 'muted', 'end')
    s.group(chapter=ch['num'], part='sheet')
    s.text(px + 16, sy + 22, ch['when'].upper(), 8.5, 'muted', spacing='0.12em')
    s.text(px + 16, sy + 44, ch['name'], 13.5, 'accent', family=SERIF)
    s.rect(px + 16, sy + 54, 62, 17, 'accent_soft', 'accent', r=2)
    s.text(px + 47, sy + 66, DIST[2], 9.5, 'accent', 'middle')
    s.text(px + 16, sy + 92, 'NOTES', 8.5, 'muted', spacing='0.1em')
    for k, t in enumerate(notes):
        s.text(px + 16, sy + 110 + 16 * k, t, 10.5, family=SERIF)
    cy = sy + 110 + 16 * len(notes) + 14
    s.text(px + 16, cy, 'COUNTRIES / TERRITORIES', 8.5, 'muted', spacing='0.1em')
    s.text(px + 16, cy + 18, ' · '.join(COUNTRIES[3]), 10)
    s.end()
    s.callout(px + pw + 14, sy + 30, 7)
    fy2 = py + ph - 64
    s.rect(px, fy2, pw, 64, 'bg', r=0)
    s.line([(px, fy2), (px + pw, fy2)], 'line', 1)
    for i, t in enumerate(["FAQ / Owner's Manual", 'A project of Sailing Grace', 'Voyage Atlas vX.Y.Z']):
        s.text(px + pw / 2, fy2 + 18 + i * 17, t, 9, 'accent', 'middle')
    s.callout(px + pw + 14, fy2 + 32, 8)
    return s


FIGS = {'guide-1-1-editor': fig_1_1, 'guide-1-2-chapter': fig_1_2, 'guide-1-3-viewer': fig_1_3,
        'guide-1-4-viewer-narrow': fig_1_4}
for name, fn in FIGS.items():
    for mode, pal in PALETTES.items():
        fn(pal).save(f'{OUT}/{name}-{mode}.svg')
print('written', len(FIGS) * 2)
