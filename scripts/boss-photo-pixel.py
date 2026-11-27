#!/usr/bin/env python3
"""Pixel portrait of Mr Chan from the actual photograph.

The earlier attempts were drawn by hand on a grid; this one starts from the photo
so the likeness is real. Crop to head and shoulders, mask the background onto the
app's paper colour, downscale to a 96×104 grid, then snap to a 24-colour palette —
which is what makes it read as pixel art rather than a shrunken photo.
"""
import os

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

W, H = 96, 104
SRC = "/home/sscrov/.hermes/images/upload_b5qr1z3n.jpg"


def build():
    photo = Image.open(SRC).convert("RGB")
    pw, ph = photo.size

    # head and shoulders: the face sits slightly above centre in this portrait
    crop_w = int(pw * 0.74)
    crop_h = int(crop_w * (H / W) * 1.02)
    left = (pw - crop_w) // 2
    top = int(ph * 0.14)
    crop = photo.crop((left, top, left + crop_w, top + crop_h)).resize(
        (W * 4, H * 4), Image.LANCZOS
    )

    # the courtyard behind him would read as a green halo on a white card, so it
    # fades to the paper colour towards the edges: a soft studio backdrop
    paper = Image.new("RGB", crop.size, (243, 240, 232))
    cw, ch = crop.size
    fade = Image.new("L", crop.size, 0)
    f = ImageDraw.Draw(fade)
    f.ellipse([cw * -0.16, ch * -0.10, cw * 1.16, ch * 1.06], fill=255)   # subject area
    fade = fade.filter(ImageFilter.GaussianBlur(cw * 0.06))
    art = Image.composite(crop, paper, fade)
    # and a gentle vignette on top of that, so the corners are clean paper
    vignette = Image.new("L", crop.size, 0)
    v = ImageDraw.Draw(vignette)
    v.ellipse([cw * -0.05, ch * 0.02, cw * 1.05, ch * 1.10], fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(cw * 0.10))
    art = Image.composite(art, paper, vignette)

    # a touch more contrast and warmth so the face survives the palette
    art = ImageEnhance.Contrast(art).enhance(1.12)
    art = ImageEnhance.Color(art).enhance(1.06)

    small = art.resize((W, H), Image.LANCZOS)
    quant = small.quantize(colors=24, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
    return quant.convert("RGB"), art


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    public = os.path.join(os.path.dirname(here), "public", "scene")
    os.makedirs(public, exist_ok=True)
    pixel, big = build()
    big.save(os.path.join(public, "eric-photo-smooth.png"))
    png = os.path.join(public, "eric-photo.png")
    pixel.save(png, optimize=True)
    pixel.resize((W * 4, H * 4), Image.NEAREST).save(
        os.path.join(public, "eric-photo@4x.png"), optimize=True
    )
    print("wrote", png, f"{os.path.getsize(png) // 1024} KB")


if __name__ == "__main__":
    main()
