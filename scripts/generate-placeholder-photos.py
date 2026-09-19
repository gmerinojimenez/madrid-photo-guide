#!/usr/bin/env python3
"""Genera los JPG de marcador de la semilla (D-009).

Sin dependencias fuera de la librería estándar: escribe PNG a mano (zlib + struct)
y usa `sips` (incluido en macOS) para convertir a JPEG. Se ejecuta una sola vez;
los JPG resultantes se versionan y CI nunca vuelve a correr este script.
"""

import shutil
import struct
import subprocess
import zlib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PHOTOS_ROOT = REPO_ROOT / "assets" / "content" / "photos"

# Fuente de bloques 5x7 propia (no transcrita de ninguna fuente real), para no
# arriesgar errores de píxel al copiar datos de memoria.
FONT: dict[str, list[str]] = {
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
    "C": [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
    "D": ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
    "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    "G": [".####", "#....", "#....", "#.###", "#...#", "#...#", ".####"],
    "I": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
    "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
    "M": ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
    "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
    "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "Y": ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
    "Z": ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
    " ": ["." * 5] * 7,
}

GLYPH_W = 5
GLYPH_H = 7
GLYPH_GAP = 1


def render_text_mask(text: str) -> list[list[bool]]:
    """Devuelve una máscara de píxeles (filas x columnas) para el texto en mayúsculas."""
    rows: list[list[bool]] = [[] for _ in range(GLYPH_H)]
    for i, char in enumerate(text.upper()):
        glyph = FONT.get(char, FONT[" "])
        for r in range(GLYPH_H):
            rows[r].extend(c == "#" for c in glyph[r])
        if i < len(text) - 1:
            for r in range(GLYPH_H):
                rows[r].extend([False] * GLYPH_GAP)
    return rows


def write_png(path: Path, width: int, height: int, pixels: bytes) -> None:
    """Escribe un PNG RGB de 8 bits sin filtrar, a mano."""

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    raw = bytearray()
    stride = width * 3
    for y in range(height):
        raw.append(0)  # filter type 0 (none) por fila
        raw.extend(pixels[y * stride : (y + 1) * stride])
    idat = zlib.compress(bytes(raw), level=9)

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", idat))
        f.write(chunk(b"IEND", b""))


def make_placeholder(width: int, height: int, bg: tuple[int, int, int], label: str) -> bytes:
    fg = (255, 255, 255)
    pixels = bytearray(bg * (width * height))

    mask = render_text_mask(label)
    mask_h = len(mask)
    mask_w = len(mask[0]) if mask_h else 0

    # Escala el texto para que ocupe aproximadamente el 70% del ancho de la imagen.
    scale = max(1, int((width * 0.7) / max(mask_w, 1)))
    scaled_w = mask_w * scale
    scaled_h = mask_h * scale
    origin_x = (width - scaled_w) // 2
    origin_y = (height - scaled_h) // 2

    for row_index, row in enumerate(mask):
        for col_index, on in enumerate(row):
            if not on:
                continue
            for dy in range(scale):
                py = origin_y + row_index * scale + dy
                if py < 0 or py >= height:
                    continue
                for dx in range(scale):
                    px = origin_x + col_index * scale + dx
                    if px < 0 or px >= width:
                        continue
                    offset = (py * width + px) * 3
                    pixels[offset : offset + 3] = bytes(fg)

    return bytes(pixels)


# (id, rótulo, color, es_gratis). El rótulo evita letras que no existen en la
# fuente 5x7 de este script (F, H, J, K, Q, V, W, X).
LOCATIONS: list[tuple[str, str, tuple[int, int, int], bool]] = [
    ("debod", "TEMPLO DE DEBOD", (0x2E, 0x5A, 0x88), True),
    ("castilla", "PUERTA DE EUROPA", (0x8A, 0x4B, 0x2E), True),
    ("torres", "CUATRO TORRES", (0x3C, 0x3C, 0x3C), True),
    ("sol", "PUERTA DEL SOL", (0x7A, 0x2E, 0x5A), True),
    ("mayor", "PLAZA MAYOR", (0x2E, 0x6E, 0x3C), True),
    # Localizaciones de pago añadidas por 003-app-navigation-flows (D-010).
    # Solo llevan miniatura: el validador de la constitución prohíbe empaquetar
    # el detalle (ni ninguna imagen extra) de una localización de pago.
    ("tiopio", "CERRO TIO PIO", (0x8A, 0x5A, 0x2E), False),
    ("circulo", "BELLAS ARTES", (0x5A, 0x3C, 0x7A), False),
    ("metropolis", "METROPOLIS", (0x2E, 0x4A, 0x6E), False),
    ("matadero", "MATADERO", (0x6E, 0x3C, 0x2E), False),
    ("faro", "TORRE MONCLOA", (0x2E, 0x6E, 0x6E), False),
    ("toledo", "PUENTE TOLEDO", (0x3C, 0x2E, 0x5A), False),
    ("retiro", "PALACIO CRISTAL", (0x2E, 0x5A, 0x3C), False),
    ("campo", "CASA DE CAMPO", (0x5A, 0x6E, 0x2E), False),
    ("lavapies", "CALLE COLORIDA", (0x8A, 0x2E, 0x4B), False),
]

SIZES = [("thumb", 400, 300), ("detail", 1600, 1200)]


def main() -> None:
    if not shutil.which("sips"):
        raise SystemExit("Este script necesita `sips` (incluido en macOS).")

    for location_id, label, color, is_free in LOCATIONS:
        out_dir = PHOTOS_ROOT / location_id
        out_dir.mkdir(parents=True, exist_ok=True)
        sizes = SIZES if is_free else SIZES[:1]
        for usage, width, height in sizes:
            png_path = out_dir / f"{usage}.png"
            jpg_path = out_dir / f"{usage}.jpg"
            pixels = make_placeholder(width, height, color, label)
            write_png(png_path, width, height, pixels)
            subprocess.run(
                ["sips", "-s", "format", "jpeg", str(png_path), "--out", str(jpg_path)],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            png_path.unlink()
            print(f"generado {jpg_path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
