#!/usr/bin/env python3
"""Pixel-art backdrop for the boss arena: the school courtyard from the photo —
two white colonial blocks with red roofs and the blue laurel ring, the tall pine
between them, lawn, path and the SSC letters.

Rendered on a coarse cell grid so it reads as pixel art behind the fighters.
"""
import os
import random

CELL = 6
W, H = 200, 112

PAL = {
    ".": None,
    "1": "#A9D3F2",  # sky low
    "2": "#93C4EA",  # sky mid
    "3": "#7FB6E4",  # sky high
    "c": "#EDF6FD",  # cloud
    "T": "#24522F",  # far trees
    "t": "#2F6638",
    "p": "#1F4A38",  # pine
    "P": "#2C5F49",
    "w": "#F6F3EA",  # wall
    "W": "#FFFFFF",
    "s": "#DCD6C4",  # wall shade
    "r": "#7C3A2C",  # roof
    "R": "#964838",  # roof light
    "v": "#6B5334",  # ivy brown
    "V": "#405F31",  # ivy green
    "g": "#7FA84F",  # grass
    "G": "#5D8A3C",  # grass shade
    "h": "#4A7838",  # hedge
    "H": "#3A5F2C",
    "n": "#CFC6B2",  # path
    "N": "#B4AB96",  # path shade
    "k": "#2C3A3D",  # window dark
    "K": "#9FC3D4",  # glass glint
    "f": "#BFB9A8",  # window frame
    "b": "#2D6FB0",  # laurel blue
    "B": "#4A90CE",
    "l": "#D9D9D4",  # flagpole
    "e": "#111111",  # ink accents
}


class Scene:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.g = [["." for _ in range(w)] for _ in range(h)]

    def put(self, x, y, ch):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.g[int(y)][int(x)] = ch

    def rect(self, x0, y0, x1, y1, ch):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                self.put(x, y, ch)

    def speckle(self, x0, y0, x1, y1, ch, density=0.35, seed=1):
        rnd = random.Random(seed)
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                if rnd.random() < density:
                    self.put(x, y, ch)

    def blob(self, cx, cy, rx, ry, ch, seed=3, ragged=0.25):
        rnd = random.Random(seed)
        for y in range(self.h):
            for x in range(self.w):
                dx = (x + 0.5 - cx) / rx
                dy = (y + 0.5 - cy) / ry
                if dx * dx + dy * dy <= 1.0 + rnd.uniform(-ragged, ragged):
                    self.put(x, y, ch)

    def gable(self, x0, x1, ytop, ybase, roof="r", shade="R"):
        """Triangular roof between two wall tops."""
        span = x1 - x0
        depth = max(1, ybase - ytop)
        for i in range(ytop, ybase + 1):
            inset = int((ybase - i) * (span / 2) / depth)
            self.rect(x0 + inset, i, x1 - inset, i, roof)
            self.put(x0 + inset, i, shade)
            self.put(x1 - inset, i, shade)

    def ring(self, cx, cy, rx, ry, ch="b"):
        for y in range(self.h):
            for x in range(self.w):
                dx = (x + 0.5 - cx) / rx
                dy = (y + 0.5 - cy) / ry
                d = dx * dx + dy * dy
                if 0.55 <= d <= 1.0:
                    self.put(x, y, ch)

    def rows(self):
        return self.g

    def svg(self):
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w * CELL} {self.h * CELL}" '
               f'shape-rendering="crispEdges" preserveAspectRatio="xMidYMax slice">']
        # merge runs vertically as well, or the speckled dithering makes the
        # file enormous (hundreds of KB of one-cell rectangles)
        covered = [[False] * self.w for _ in range(self.h)]
        for y in range(self.h):
            x = 0
            while x < self.w:
                ch = self.g[y][x]
                if ch == "." or covered[y][x]:
                    x += 1
                    continue
                run = 1
                while x + run < self.w and self.g[y][x + run] == ch and not covered[y][x + run]:
                    run += 1
                tall = 1
                while y + tall < self.h:
                    row = self.g[y + tall]
                    if any(row[x + i] != ch or covered[y + tall][x + i] for i in range(run)):
                        break
                    tall += 1
                for yy in range(y, y + tall):
                    for xx in range(x, x + run):
                        covered[yy][xx] = True
                out.append(
                    f'<rect x="{x * CELL}" y="{y * CELL}" width="{run * CELL}" height="{tall * CELL}" '
                    f'fill="{PAL[ch]}"/>'
                )
                x += run
        out.append("</svg>")
        return "".join(out)


def sky(s):
    for y in range(0, 62):
        ch = "3" if y < 18 else "2" if y < 40 else "1"
        s.rect(0, y, W - 1, y, ch)
    # wispy clouds
    for (cx, cy, rx, ry, seed) in ((40, 20, 18, 2.4, 5), (150, 14, 22, 2.0, 7), (96, 26, 12, 1.6, 9)):
        s.blob(cx, cy, rx, ry, "c", seed=seed, ragged=0.5)


def back_trees(s):
    for (cx, cy, rx, ry, ch, seed) in (
        (46, 54, 16, 11, "T", 51), (96, 50, 13, 9, "t", 53), (172, 46, 18, 12, "T", 55),
        (12, 60, 14, 9, "t", 57), (140, 52, 12, 8, "T", 59),
    ):
        s.blob(cx, cy, rx, ry, ch, seed=seed, ragged=0.35)


def far_trees(s):
    for x in range(0, W, 6):
        h = 8 + (x * 37 % 9)
        s.blob(x + 3, 74 - h * 0.35, 5.5, h * 0.55, "T", seed=x, ragged=0.5)
    for x in range(3, W, 9):
        s.blob(x, 72, 4.0, 6.0, "t", seed=x + 1, ragged=0.45)


def building(s, x0, x1, wall_top, ground, roof_h, ring_x):
    """A white block: gable roof, laurel ring, window band, ivy on the ground floor."""
    roof_base = wall_top + roof_h
    s.gable(x0 - 2, x1 + 2, wall_top - roof_h, roof_base)
    s.rect(x0, roof_base, x1, ground, "w")
    # eave shadow and corner shading
    s.rect(x0, roof_base, x1, roof_base + 1, "s")
    s.rect(x0, roof_base, x0 + 1, ground, "s")
    s.rect(x1 - 1, roof_base, x1, ground, "s")
    # laurel ring on the gable
    s.ring(ring_x, wall_top - 2, 5.2, 4.4, "b")
    s.ring(ring_x, wall_top - 2, 3.4, 2.8, "1")
    # window band
    win_y = roof_base + 5
    for wx in range(x0 + 6, x1 - 8, 12):
        s.rect(wx, win_y, wx + 7, win_y + 9, "f")
        s.rect(wx + 1, win_y + 1, wx + 6, win_y + 8, "k")
        s.rect(wx + 1, win_y + 1, wx + 3, win_y + 3, "K")
        s.rect(wx + 3, win_y + 1, wx + 3, win_y + 8, "f")
    # ivy climbing the ground floor
    ivy_top = win_y + 12
    s.rect(x0 + 1, ivy_top, x1 - 1, ground, "V")
    s.speckle(x0 + 1, ivy_top + 2, x1 - 1, ground, "v", density=0.34, seed=x0)
    s.speckle(x0 + 1, ivy_top + 2, x1 - 1, ground, "H", density=0.18, seed=x0 + 3)
    for x in range(x0 + 1, x1):          # the ragged top edge of the ivy
        if (x * 7 + x0) % 4 == 0:
            s.put(x, ivy_top - 1, "V")
        if (x * 5 + x0) % 3 == 0:
            s.put(x, ivy_top - 2, "V")


def pine(s, cx, top, base):
    """One tall araucaria: stacked fronds, widest near the ground."""
    s.rect(cx, top + 8, cx, base, "P")
    y = top
    step = 0
    while y < base:
        width = min(1 + step // 3, 7)
        s.rect(cx - width, y, cx + width, y + 1, "p")
        if width > 2:
            s.rect(cx - width + 1, y + 2, cx + width - 1, y + 2, "P")
        step += 1
        y += 3


def courtyard(s):
    # lawn bands
    s.rect(0, 78, W - 1, 88, "g")
    s.speckle(0, 78, W - 1, 88, "G", density=0.22, seed=11)
    s.rect(0, 89, W - 1, H - 1, "G")
    s.speckle(0, 89, W - 1, H - 1, "g", density=0.20, seed=13)
    # clipped hedges along the buildings
    s.rect(4, 79, 92, 84, "h")
    s.speckle(4, 79, 92, 84, "H", density=0.30, seed=17)
    s.rect(104, 81, 196, 86, "h")
    s.speckle(104, 81, 196, 86, "H", density=0.30, seed=19)
    # the drive: a pale band swinging in from the right foreground
    for y in range(88, H):
        t = (y - 88) / (H - 88)
        left = int(96 - 46 * t)
        right = int(150 + 34 * t)
        s.rect(left, y, right, y, "n")
    s.speckle(80, 92, 150, H - 1, "N", density=0.12, seed=23)


def flagpoles(s):
    for x in (18, 24, 30):
        s.rect(x, 30, x, 76, "l")


def ssc_letters(s):
    """The white SSC sign standing on the bank at the left of the drive."""
    base, hL = 101, 11

    def letter(kind, x, y):
        if kind == "C":
            s.rect(x, y - hL, x + 6, y - hL + 1, "W")
            s.rect(x, y - 1, x + 6, y, "W")
            s.rect(x, y - hL, x + 1, y, "W")
        else:
            s.rect(x, y - hL, x + 8, y - hL + 1, "W")
            s.rect(x, y - hL // 2 - 1, x + 8, y - hL // 2 + 1, "W")
            s.rect(x, y - 1, x + 8, y, "W")
            s.rect(x, y - hL, x + 1, y - hL // 2, "W")
            s.rect(x + 7, y - hL // 2, x + 8, y, "W")

    for kind, x in (("S", 9), ("S", 24), ("C", 39)):
        saved = [row[:] for row in s.g]
        letter(kind, x + 1, base + 1)     # shadow pass, then recolour it blue
        for yy in range(s.h):
            for xx in range(s.w):
                if s.g[yy][xx] == "W" and saved[yy][xx] != "W":
                    s.g[yy][xx] = "b"
        letter(kind, x, base)


def foreground(s):
    # a small tree bottom-right and bushes
    s.blob(186, 92, 12, 9, "h", seed=31, ragged=0.4)
    s.blob(190, 84, 9, 7, "H", seed=37, ragged=0.45)
    s.blob(14, 86, 10, 6, "h", seed=41, ragged=0.4)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    s = Scene(W, H)
    sky(s)
    back_trees(s)
    far_trees(s)
    building(s, 58, 108, 44, 80, 9, ring_x=83)
    building(s, 126, 190, 36, 82, 11, ring_x=158)
    pine(s, 116, 6, 78)
    courtyard(s)
    flagpoles(s)
    ssc_letters(s)
    foreground(s)
    out = os.path.join(here, "svg")
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, "boss-scene.svg"), "w", encoding="utf8").write(s.svg())

    # the app ships the PNG (a few tens of KB, gzip-friendly) rather than 200 KB
    # of <rect> elements in the client bundle
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (W * CELL, H * CELL), "#A9D3F2")
    pen = ImageDraw.Draw(img)
    for y, row in enumerate(s.rows()):
        x = 0
        while x < W:
            ch = row[x]
            if ch == ".":
                x += 1
                continue
            run = 1
            while x + run < W and row[x + run] == ch:
                run += 1
            pen.rectangle(
                [x * CELL, y * CELL, (x + run) * CELL - 1, (y + 1) * CELL - 1],
                fill=PAL[ch],
            )
            x += run
    public = os.path.join(os.path.dirname(here), "public", "scene")
    os.makedirs(public, exist_ok=True)
    png = os.path.join(public, "boss-campus.png")
    img.save(png, optimize=True)
    print("wrote", png, f"{os.path.getsize(png) // 1024} KB")


if __name__ == "__main__":
    main()
