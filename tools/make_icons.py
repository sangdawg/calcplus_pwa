#!/usr/bin/env python3
"""Generate CalcPlus PWA icon PNGs using only the Python stdlib.

Renders a calculator glyph on an indigo->purple vertical gradient
(vertical gradients compress extremely well in PNG, keeping the final
single-file app small). Emits PNGs into assets/ plus assets/icons.json
containing base64 payloads for tools/build.py.
"""
import base64
import json
import math
import os
import struct
import zlib

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
ASSETS = os.path.join(ROOT, "assets")
os.makedirs(ASSETS, exist_ok=True)

BG_TOP = (99, 102, 241)    # #6366F1 indigo
BG_BOT = (168, 85, 247)    # #A855F7 purple
WHITE = (255, 255, 255)
INK = (15, 20, 40)         # dark navy for display + keys
ACC = (124, 58, 237)       # accent key

SS = 2  # supersampling factor (2x2 samples per pixel)


def lerp3(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def in_rrect(x, y, cx, cy, hw, hh, r):
    dx = abs(x - cx)
    dy = abs(y - cy)
    ox = dx - (hw - r)
    oy = dy - (hh - r)
    if ox <= 0 and oy <= 0:
        return True
    return math.hypot(max(ox, 0), max(oy, 0)) <= r


def glyph_color(x, y, g):
    """Color at point (x, y) in unit coords; g scales the glyph box."""
    # background gradient (caller has already decided background coverage)
    col = lerp3(BG_TOP, BG_BOT, y)
    # calculator body
    if in_rrect(x, y, 0.5, 0.5, 0.29 * g, 0.36 * g, 0.09 * g):
        col = WHITE
    # display bar
    if in_rrect(x, y, 0.5, 0.5 - 0.245 * g, 0.21 * g, 0.055 * g, 0.025 * g):
        col = INK
    # 3x3 key grid below the display; bottom-right key is the accent "=" key.
    # Row centers start at display bottom + gap + half key (0.5 - 0.0875g) and
    # step by (key + gap) = 0.16g downward.
    for r in (0, 1, 2):
        for c in (-1, 0, 1):
            if in_rrect(x, y, 0.5 + c * 0.16 * g, 0.5 + (-0.0875 + r * 0.16) * g,
                        0.0575 * g, 0.0575 * g, 0.02 * g):
                col = ACC if (r == 2 and c == 1) else INK
    return col


def render(size, g=1.0, corner=None):
    """Render icon; corner=None -> full-bleed square, else rounded radius fraction."""
    px = bytearray(size * size * 4)
    n = SS * SS
    for y in range(size):
        for x in range(size):
            r = gr = b = a = 0
            for sy in range(SS):
                for sx in range(SS):
                    u = (x + (sx + 0.5) / SS) / size
                    v = (y + (sy + 0.5) / SS) / size
                    if corner is None:
                        inside = True
                    else:
                        inside = in_rrect(u, v, 0.5, 0.5, 0.5, 0.5, corner)
                    if inside:
                        c = glyph_color(u, v, g)
                        r += c[0]
                        gr += c[1]
                        b += c[2]
                        a += 255
            i = (y * size + x) * 4
            px[i] = r // n
            px[i + 1] = gr // n
            px[i + 2] = b // n
            px[i + 3] = a // n
    return px


def encode_png(w, h, px):
    raw = bytearray()
    stride = w * 4
    for yy in range(h):
        raw.append(0)  # filter: none
        raw += px[yy * stride:(yy + 1) * stride]

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))


def main():
    specs = [
        ("icon-192.png", 192, 1.00, 0.22),
        ("icon-512.png", 512, 1.00, 0.22),
        ("icon-512-maskable.png", 512, 0.72, None),  # full bleed, glyph in safe zone
        ("apple-touch-icon-180.png", 180, 0.92, None),  # iOS rounds it itself
    ]
    out = {}
    for name, size, g, corner in specs:
        px = render(size, g, corner)
        png = encode_png(size, size, px)
        path = os.path.join(ASSETS, name)
        with open(path, "wb") as f:
            f.write(png)
        out[name] = base64.b64encode(png).decode()
        print(f"{name:26s} {len(png):7,d} bytes  (b64 {len(out[name]):,})")
    with open(os.path.join(ASSETS, "icons.json"), "w") as f:
        json.dump(out, f)
    print("wrote assets/icons.json")


if __name__ == "__main__":
    main()
