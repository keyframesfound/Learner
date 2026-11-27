#!/usr/bin/env python3
"""A realistic pixel portrait of Mr Chan, drawn as vector shapes at 4× and then
snapped down to a pixel grid and a fixed 20-colour palette.

The trick is the other way round from the usual: draw smooth, then quantise. At
128×140 with a limited palette it reads as hand-placed pixel art, and it keeps
the likeness (round face, low fringe, round spectacles, white shirt, dark tie)
that a 32-cell grid could not hold.
"""
import os

from PIL import Image, ImageDraw

SS = 4                      # supersample factor
W, H = 128, 140             # final pixel grid
DW, DH = W * SS, H * SS

SKIN = (247, 217, 188)
SKIN_MID = (240, 201, 168)
SKIN_SHADE = (226, 174, 134)
SKIN_DEEP = (201, 141, 104)
HAIR = (20, 20, 20)
HAIR_MID = (38, 38, 38)
HAIR_LIGHT = (58, 58, 58)
SHIRT = (255, 255, 255)
SHIRT_SHADE = (238, 235, 226)
SHIRT_FOLD = (214, 210, 197)
TIE = (59, 58, 54)
TIE_DARK = (35, 34, 32)
GLASS = (43, 43, 40)
GLASS_LIGHT = (107, 107, 99)
LENS = (223, 236, 242)
LENS_TINT = (196, 216, 226)
LIP = (194, 127, 114)
LIP_DARK = (168, 92, 80)
MOUTH = (138, 59, 54)
TEETH = (252, 250, 245)
EYE = (42, 30, 24)
BROW = (26, 26, 26)

PALETTE = [
    SKIN, SKIN_MID, SKIN_SHADE, SKIN_DEEP,
    HAIR, HAIR_MID, HAIR_LIGHT,
    SHIRT, SHIRT_SHADE, SHIRT_FOLD,
    TIE, TIE_DARK,
    GLASS, GLASS_LIGHT,
    LENS, LENS_TINT,
    LIP, LIP_DARK, MOUTH, TEETH,
    EYE, BROW, (255, 255, 255),
]


def s(v):
    """scale a coordinate from the final grid into the supersampled canvas"""
    return v * SS


def ell(d, cx, cy, rx, ry, fill, outline=None, width=0):
    d.ellipse([s(cx - rx), s(cy - ry), s(cx + rx), s(cy + ry)], fill=fill, outline=outline, width=width)


def poly(d, pts, fill):
    d.polygon([(s(x), s(y)) for x, y in pts], fill=fill)


def rect(d, x0, y0, x1, y1, fill):
    d.rectangle([s(x0), s(y0), s(x1), s(y1)], fill=fill)


def line(d, pts, fill, width):
    d.line([(s(x), s(y)) for x, y in pts], fill=fill, width=width * SS, joint="curve")


def draw_portrait():
    img = Image.new("RGB", (DW, DH), SHIRT)
    d = ImageDraw.Draw(img)

    # ── body: white shirt with a soft fold, collar and tie ────────────────
    rect(d, 0, 104, W, H, SHIRT)
    poly(d, [(16, H), (24, 106), (104, 106), (112, H)], SHIRT)
    poly(d, [(16, H), (30, 118), (34, H)], SHIRT_FOLD)
    poly(d, [(112, H), (98, 118), (94, H)], SHIRT_SHADE)
    # collar wings
    poly(d, [(50, 108), (64, 122), (40, 128)], SHIRT)
    poly(d, [(78, 108), (64, 122), (88, 128)], SHIRT)
    poly(d, [(50, 108), (64, 122), (58, 110)], SHIRT_SHADE)
    poly(d, [(78, 108), (64, 122), (70, 110)], SHIRT_SHADE)
    # tie: knot then blade
    poly(d, [(57, 114), (71, 114), (73, 123), (55, 123)], TIE)
    poly(d, [(55, 123), (73, 123), (78, H), (50, H)], TIE)
    poly(d, [(55, 123), (59, 123), (57, H), (50, H)], TIE_DARK)
    poly(d, [(57, 114), (61, 114), (57, 121)], TIE_DARK)

    # ── neck ──────────────────────────────────────────────────────────────
    rect(d, 52, 88, 76, 110, SKIN_MID)
    poly(d, [(52, 96), (76, 96), (76, 110), (52, 110)], SKIN_SHADE)
    ell(d, 64, 96, 14, 8, SKIN_SHADE)

    # ── ears ──────────────────────────────────────────────────────────────
    ell(d, 28, 62, 5.4, 8.2, SKIN_MID)
    ell(d, 100, 62, 5.4, 8.2, SKIN_MID)
    ell(d, 28, 62, 3.2, 5.6, SKIN_SHADE)
    ell(d, 100, 62, 3.2, 5.6, SKIN_SHADE)

    # ── face ──────────────────────────────────────────────────────────────
    ell(d, 64, 62, 37, 40, SKIN)
    # cheeks and jaw shading
    ell(d, 36, 74, 13, 16, SKIN_MID)
    ell(d, 92, 74, 13, 16, SKIN_MID)
    ell(d, 64, 92, 26, 12, SKIN_MID)
    ell(d, 64, 96, 20, 8, SKIN_SHADE)
    # forehead light
    ell(d, 64, 40, 26, 12, SKIN_MID)

    # ── hair: back mass, then the low straight fringe ─────────────────────
    ell(d, 64, 40, 42, 34, HAIR)                 # crown behind the face
    poly(d, [(22, 44), (26, 22), (102, 22), (106, 44), (106, 56), (22, 56)], HAIR)
    # fringe: a solid band with ragged tips sitting just above the glasses
    poly(d, [(24, 48), (30, 24), (98, 24), (104, 48), (102, 56), (96, 48),
             (92, 58), (86, 50), (80, 58), (74, 50), (68, 58), (62, 50),
             (56, 58), (50, 50), (44, 57), (38, 49), (32, 56), (27, 50)], HAIR)
    # sideburns
    poly(d, [(24, 44), (30, 44), (32, 78), (26, 78)], HAIR)
    poly(d, [(104, 44), (98, 44), (96, 78), (102, 78)], HAIR)
    # a little sheen so the hair is not a flat black blob
    for (x, y, rx, ry) in ((46, 32, 9, 3), (66, 30, 11, 2.6), (84, 33, 7, 2.2)):
        ell(d, x, y, rx, ry, HAIR_MID)
    for (x, y) in ((52, 27), (74, 26), (88, 29)):
        ell(d, x, y, 3.2, 1.4, HAIR_LIGHT)

    # ── eyebrows (mostly lost under the fringe) ──────────────────────────
    line(d, [(40, 54), (52, 52)], BROW, 2)
    line(d, [(76, 52), (88, 54)], BROW, 2)

    # ── glasses: round metal frames, light lenses ────────────────────────
    for cx in (45, 83):
        ell(d, cx, 66, 12.5, 10.0, LENS, outline=GLASS, width=SS + 1)
        ell(d, cx, 66, 12.5, 10.0, None, outline=LENS_TINT, width=1)
    line(d, [(58, 64), (70, 64)], GLASS, 2)          # bridge
    line(d, [(34, 62), (26, 58)], GLASS, 2)           # temple, left
    line(d, [(94, 62), (102, 58)], GLASS, 2)          # temple, right
    # lens reflections
    line(d, [(38, 58), (46, 72)], (240, 248, 252), 2)
    line(d, [(76, 58), (84, 72)], (240, 248, 252), 2)
    ell(d, 36, 74, 3.4, 1.6, LENS_TINT)

    # ── eyes behind the lenses ───────────────────────────────────────────
    for cx in (45, 83):
        ell(d, cx, 66, 5.6, 3.9, TEETH)                # sclera
        ell(d, cx + 0.6, 66, 3.0, 3.4, EYE)            # iris
        ell(d, cx + 1.0, 65.6, 1.2, 1.2, (12, 10, 9))  # pupil
        ell(d, cx + 2.0, 64.8, 1.0, 1.0, (245, 245, 240))  # catchlight
    line(d, [(40, 71), (50, 71)], SKIN_SHADE, 1)
    line(d, [(78, 71), (88, 71)], SKIN_SHADE, 1)

    # ── nose ─────────────────────────────────────────────────────────────
    poly(d, [(61, 68), (67, 68), (68.5, 82), (59.5, 82)], SKIN_MID)
    ell(d, 62.6, 82, 3.2, 2.4, SKIN_SHADE)
    ell(d, 65.4, 82, 3.2, 2.4, SKIN_SHADE)
    ell(d, 62.8, 81, 1.6, 1.0, SKIN_DEEP)
    ell(d, 65.2, 81, 1.6, 1.0, SKIN_DEEP)

    # ── mouth: closed, warm, a hint of teeth ─────────────────────────────
    ell(d, 64, 93, 10, 4.6, LIP)
    poly(d, [(55, 92.6), (73, 92.6), (71, 95.4), (57, 95.4)], MOUTH)
    poly(d, [(57, 92.8), (71, 92.8), (70, 94.2), (58, 94.2)], TEETH)
    line(d, [(55, 91), (73, 91)], LIP_DARK, 1)
    ell(d, 64, 100, 8, 2.8, SKIN_SHADE)               # chin shadow
    ell(d, 64, 89, 7, 2.0, SKIN_MID)                  # philtrum

    return img


def snap(img):
    """downscale to the pixel grid, then map every pixel to the palette"""
    small = img.resize((W, H), Image.LANCZOS)
    px = small.load()
    out = Image.new("RGB", (W, H))
    q = out.load()
    for y in range(H):
        for x in range(W):
            r, g, b = px[x, y]
            best, bestd = None, 1e9
            for c in PALETTE:
                d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2
                if d < bestd:
                    best, bestd = c, d
            q[x, y] = best
    return out


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    public = os.path.join(os.path.dirname(here), "public", "scene")
    os.makedirs(public, exist_ok=True)

    big = draw_portrait()
    big.save(os.path.join(public, "eric-smooth.png"))

    small = snap(big)
    png = os.path.join(public, "eric-real.png")
    small.save(png, optimize=True)
    # a 4× nearest-neighbour copy for the picker page, so it is sharp on screen
    small.resize((W * 4, H * 4), Image.NEAREST).save(
        os.path.join(public, "eric-real@4x.png"), optimize=True
    )
    print("wrote", png, f"{os.path.getsize(png) // 1024} KB")


if __name__ == "__main__":
    main()
