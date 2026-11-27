#!/usr/bin/env python3
"""Rasterise three pixel-art candidates for the Eric Chan boss sprite.

Everything is drawn on a coarse cell grid (1 cell = 4 px in the SVG) so the
result reads as pixel art at the 54px card size and stays crisp when the arena
scales it up. Output: svg/<name>.svg plus a contact sheet at svg/index.html.
"""
import os

CELL = 4
PALETTE = {
    ".": None,
    "#": "#141414",  # hair, outline, frame
    "s": "#F6D6B4",  # skin
    "h": "#DFAE84",  # skin shade
    "w": "#FFFFFF",  # shirt
    "g": "#E4E1D6",  # shirt shade
    "c": "#CFCABB",  # collar shade
    "t": "#3B3A36",  # dark tie (as in the photo)
    "r": "#C4271B",  # boss red tie
    "m": "#8A3B36",  # mouth
    "n": "#C98D6B",  # nose shade
    "l": "#FBF9F2",  # lens
    "i": "#5B5B55",  # hair highlight
}


class Grid:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.cells = [["." for _ in range(w)] for _ in range(h)]

    def put(self, x, y, ch):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.cells[y][x] = ch

    def rect(self, x0, y0, x1, y1, ch):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                self.put(x, y, ch)

    def ellipse(self, cx, cy, rx, ry, ch):
        for y in range(self.h):
            for x in range(self.w):
                dx = (x + 0.5 - cx) / rx
                dy = (y + 0.5 - cy) / ry
                if dx * dx + dy * dy <= 1.0:
                    self.put(x, y, ch)

    def ring(self, cx, cy, rx, ry, thick, ch):
        for y in range(self.h):
            for x in range(self.w):
                dx = (x + 0.5 - cx) / rx
                dy = (y + 0.5 - cy) / ry
                d = dx * dx + dy * dy
                if 0.55 <= d <= 1.0:
                    self.put(x, y, ch)

    def outline(self):
        """Draw a one-cell ink border OUTSIDE the silhouette, the way the app's
        other sprites are drawn — without it a white shirt vanishes on a white card."""
        src = [row[:] for row in self.cells]
        for y in range(self.h):
            for x in range(self.w):
                if src[y][x] != ".":
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < self.w and 0 <= ny < self.h:
                        ch = src[ny][nx]
                        if ch != "." and ch != "#":
                            self.cells[y][x] = "#"
                            break
        return self

    def svg(self):
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w * CELL} {self.h * CELL}" '
               f'shape-rendering="crispEdges">']
        for y, row in enumerate(self.cells):
            x = 0
            while x < self.w:
                ch = row[x]
                if ch == ".":
                    x += 1
                    continue
                run = 1
                while x + run < self.w and row[x + run] == ch:
                    run += 1
                out.append(
                    f'<rect x="{x * CELL}" y="{y * CELL}" width="{run * CELL}" height="{CELL}" '
                    f'fill="{PALETTE[ch]}"/>'
                )
                x += run
        out.append("</svg>")
        return "".join(out)


def glasses(g, left, right, top, w=5, h=4):
    """Two square metal frames: 1-cell frame, light lens, a small pupil each."""
    for x0 in (left, right):
        g.rect(x0 - 1, top - 1, x0 + w, top + h, "#")       # frame block
        g.rect(x0, top, x0 + w - 1, top + h - 1, "l")       # lens
        cx = x0 + (w - 1) // 2
        g.rect(cx - 1, top + 1, cx, top + 2, "#")           # pupil
    g.rect(left + w, top + 1, right - 2, top + 1, "#")      # bridge


def bust(tie="t", glint=False, smirk=False):
    """Head and shoulders, the shape the boss card actually shows."""
    g = Grid(32, 40)
    # shirt as a solid block, then the neck and head on top of it
    g.rect(4, 30, 27, 39, "w")
    g.rect(4, 30, 6, 39, "g")
    g.rect(25, 30, 27, 39, "g")
    g.rect(13, 23, 17, 31, "s")
    g.rect(13, 27, 17, 31, "h")
    g.ellipse(16, 15, 8.2, 8.4, "s")
    g.rect(7, 13, 8, 18, "s")
    g.rect(23, 13, 24, 18, "s")
    # hair: low fringe, sideburns down past the ears
    g.ellipse(16, 8, 8.6, 5.4, "#")
    g.rect(8, 6, 23, 9, "#")
    for x in range(9, 24, 4):
        g.rect(x, 10, x + 1, 10, "#")
    g.rect(7, 9, 8, 19, "#")
    g.rect(23, 9, 24, 19, "#")
    for x in (11, 16, 21):
        g.put(x, 4, "i")
    glasses(g, left=10, right=18, top=12, w=5, h=4)
    if glint:
        g.put(10, 12, "w"); g.put(11, 12, "w")
    # nose, smile with teeth, chin
    g.rect(15, 17, 16, 18, "n")
    g.rect(13, 20, 17, 21, "m")
    g.rect(14, 20, 16, 20, "w")
    if smirk:
        g.put(17, 19, "m")
    else:
        g.put(12, 19, "m"); g.put(18, 19, "m")
    g.rect(14, 22, 16, 22, "h")
    # collar wings, knot, tie down over the shirt
    g.rect(11, 29, 14, 31, "c")
    g.rect(17, 29, 20, 31, "c")
    g.rect(11, 31, 14, 31, "w")
    g.rect(17, 31, 20, 31, "w")
    g.rect(15, 31, 16, 32, "#")       # knot
    g.rect(14, 33, 17, 39, tie)       # blade, widens
    return g


def fullbody(tie="t"):
    """Whole teacher: white shirt, dark tie, shoes, a pointer in one hand."""
    g = Grid(28, 44)
    # shoes, trousers, waistband
    g.rect(10, 41, 13, 42, "#")
    g.rect(15, 41, 18, 42, "#")
    g.rect(10, 31, 12, 40, "t")
    g.rect(15, 31, 17, 40, "t")
    g.rect(9, 30, 18, 31, "t")
    # torso + tie + collar
    g.rect(8, 19, 19, 30, "w")
    g.rect(8, 29, 19, 30, "g")
    g.rect(13, 20, 14, 29, tie)
    g.rect(12, 19, 13, 21, "c")
    g.rect(14, 19, 15, 21, "c")
    # arms + hands
    g.rect(6, 20, 7, 29, "w")
    g.rect(20, 20, 21, 28, "w")
    g.rect(6, 30, 7, 31, "s")
    g.rect(20, 29, 21, 30, "s")
    # pointer held up in the right hand
    g.rect(22, 14, 23, 28, "#")
    # neck + head
    g.rect(12, 15, 15, 19, "s")
    g.ellipse(13.5, 10.5, 6.6, 7.0, "s")
    g.rect(6, 9, 7, 13, "s")
    g.rect(20, 9, 21, 13, "s")
    # hair
    g.ellipse(13.5, 5.4, 7.0, 4.2, "#")
    g.rect(7, 4, 20, 6, "#")
    for x in range(8, 21, 4):
        g.rect(x, 7, x + 1, 7, "#")
    g.rect(6, 6, 7, 14, "#")
    g.rect(20, 6, 21, 14, "#")
    glasses(g, left=8, right=15, top=8, w=4, h=3)
    g.rect(12, 12, 15, 12, "m")
    g.put(13, 12, "w")
    return g


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "svg")
    os.makedirs(out, exist_ok=True)
    variants = {
        "a-bust": (bust(tie="t"), "A · Bust — white shirt, dark tie, round glasses"),
        "b-full": (fullbody(tie="t"), "B · Full body — standing with a pointer"),
        "c-boss": (bust(tie="r", glint=True, smirk=True), "C · Boss — red tie, glint on the glasses, smirk"),
    }
    for name, (grid, _) in variants.items():
        grid.outline()
        open(os.path.join(out, f"{name}.svg"), "w", encoding="utf8").write(grid.svg())
    print("wrote", ", ".join(variants))


if __name__ == "__main__":
    main()
