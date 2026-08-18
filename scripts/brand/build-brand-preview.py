"""Regenerates the brand review sheets in public/favicons/review/.

Run after scripts/brand/build-favicons.mjs so the sheets always show the icons that
are actually shipping:

    python3 scripts/brand/build-brand-preview.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
FAVICONS = ROOT / "public/favicons"
OUT_DIR = FAVICONS / "review"

BRANDS = [("usam", "USAM"), ("dos", "DOS"), ("kitchen-table-gospel", "KITCHEN TABLE")]
PAPER = (233, 231, 226, 255)
INK = (26, 26, 26)


def load(brand: str, name: str) -> Image.Image:
    return Image.open(FAVICONS / brand / name).convert("RGBA")


def centered(sheet: Image.Image, tile: Image.Image, box: tuple[int, int, int]) -> None:
    x, y, size = box
    sheet.alpha_composite(tile, (x + (size - tile.width) // 2, y + (size - tile.height) // 2))


def brand_comparison() -> Image.Image:
    sheet = Image.new("RGBA", (1040, 360), PAPER)
    draw = ImageDraw.Draw(sheet)

    for index, (brand, label) in enumerate(BRANDS):
        x = 90 + index * 300
        icon = load(brand, "icon-512.png").resize((190, 190), Image.LANCZOS)
        centered(sheet, icon, (x, 60, 190))
        draw.text((x + 95, 280), label, anchor="mm", fill=INK)

    return sheet


def scale_comparison() -> Image.Image:
    """Browser-tab reality check: every emblem at 16/32/48 on light and dark chrome."""
    sheet = Image.new("RGBA", (760, 360), PAPER)
    draw = ImageDraw.Draw(sheet)
    draw.text((30, 22), "16 / 32 / 48 px on light tab chrome, then dark", fill=INK)

    for index, (brand, label) in enumerate(BRANDS):
        y = 70 + index * 92
        draw.text((30, y + 30), label[:13], fill=INK)
        x = 190

        for chrome in ((255, 255, 255, 255), (45, 47, 52, 255)):
            for size in (16, 32, 48):
                tile = Image.new("RGBA", (64, 64), chrome)
                icon = load(brand, f"favicon-{size}x{size}.png")
                tile.alpha_composite(icon, ((64 - size) // 2, (64 - size) // 2))
                sheet.alpha_composite(tile, (x, y))
                x += 72
            x += 24

    return sheet


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    brand_comparison().convert("RGB").save(OUT_DIR / "brand-comparison.png")
    scale_comparison().convert("RGB").save(OUT_DIR / "scale-comparison.png")
    print(f"wrote {OUT_DIR.relative_to(ROOT)}/brand-comparison.png and scale-comparison.png")


if __name__ == "__main__":
    main()
