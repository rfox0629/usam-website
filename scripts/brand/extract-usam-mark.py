"""Extract the approved USAM mark from the website logo for use in circular icons.

The website logo is a rounded-rectangle badge containing the USAM wordmark, three
flag stripes, and a base bar. Circular icon treatments supply their own frame, so
this pulls out the badge contents (wordmark + stripes + bar) as a white-on-
transparent mark plus a wordmark-only variant.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "public/brand/logo/usam-website-logo.png"
OUT_DIR = Path(__file__).resolve().parent / "marks"


def trim(image: Image.Image) -> Image.Image:
    alpha = np.array(image)[:, :, 3]
    ys, xs = np.nonzero(alpha > 30)
    return image.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def downscale(image: Image.Image, max_width: int = 384) -> Image.Image:
    """Icons never render the mark wider than ~300px, so keep the source lean."""
    if image.width <= max_width:
        return image

    height = round(image.height * max_width / image.width)
    return image.resize((max_width, height), Image.LANCZOS)


def whiten(image: Image.Image) -> Image.Image:
    """Force the mark to pure white, keeping the original alpha as the shape."""
    data = np.array(image)
    data[:, :, 0:3] = 255
    return Image.fromarray(data)


def save(image: Image.Image, path: Path) -> None:
    """White-on-transparent needs only luminance + alpha, which keeps the inlined
    base64 copy inside favicon.svg small."""
    image.convert("LA").save(path, optimize=True)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    logo = Image.open(SOURCE).convert("RGBA")

    # Drop the badge frame stroke, then trim to the contents.
    contents = trim(logo.crop((40, 40, logo.width - 40, logo.height - 40)))
    contents = whiten(contents)
    save(downscale(contents), OUT_DIR / "usam-mark-full.png")

    # Wordmark only: measured above the base bar, the stripes block begins at the
    # first empty column after the letters.
    # Wordmark only: measured above the base bar, the widest empty column run is
    # the gutter between the letters and the stripes block.
    upper_height = int(contents.height * 0.8)
    columns = (np.array(contents)[:upper_height, :, 3] > 30).mean(axis=0)
    gaps = []
    run_start = None
    for index, coverage in enumerate(columns):
        if coverage == 0 and run_start is None:
            run_start = index
        elif coverage > 0 and run_start is not None:
            gaps.append((index - run_start, run_start))
            run_start = None
    letters_end = max(gaps)[1]
    wordmark = downscale(trim(contents.crop((0, 0, letters_end, upper_height))))
    save(wordmark, OUT_DIR / "usam-mark-wordmark.png")

    print(f"full     {contents.size}  aspect {contents.width / contents.height:.2f}")
    print(f"wordmark {wordmark.size}  aspect {wordmark.width / wordmark.height:.2f}")


if __name__ == "__main__":
    main()
