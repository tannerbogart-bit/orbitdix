"""
generate_icons.py — creates placeholder PNG icons for the Orbit Six extension.
Run once from orbit-extension/: python generate_icons.py

No external libraries required — uses only stdlib struct + zlib.
"""

import os
import struct
import zlib


def _chunk(name: bytes, data: bytes) -> bytes:
    c = name + data
    return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)


def make_png(width: int, height: int, bg: tuple, fg: tuple, text_size: int = 0) -> bytes:
    """Solid color PNG with an optional centered accent square."""
    br, bg_, bb = bg   # background RGB
    fr, fg_, fb = fg   # foreground / accent RGB

    rows = bytearray()
    for y in range(height):
        rows += b"\x00"  # filter: None
        for x in range(width):
            # Draw a centered square (≈ 60% of size) in accent color
            margin = int(width * 0.2)
            if margin <= x < width - margin and margin <= y < height - margin:
                rows += bytes([fr, fg_, fb])
            else:
                rows += bytes([br, bg_, bb])

    ihdr = _chunk(
        b"IHDR",
        struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0),
    )
    idat = _chunk(b"IDAT", zlib.compress(bytes(rows)))
    iend = _chunk(b"IEND", b"")
    return b"\x89PNG\r\n\x1a\n" + ihdr + idat + iend


BG = (10, 14, 26)    # #0a0e1a
FG = (232, 255, 71)  # #e8ff47

os.makedirs("icons", exist_ok=True)

for size in (16, 48, 128):
    data = make_png(size, size, BG, FG)
    path = f"icons/icon-{size}.png"
    with open(path, "wb") as f:
        f.write(data)
    print(f"  {path}  ({size}×{size})")

print("Done.")
