"""Make the 480 px (cards) and 192 px (thumbnails) copies of the 800 x 600 crop photos.

Run from frontend/ after adding or replacing a photo in src/assets/crops/:
    python3 scripts/resize-crop-photos.py
Needs Pillow (pip install pillow). See src/lib/cropPhotos.ts.
"""

from pathlib import Path

from PIL import Image

CROPS = Path(__file__).resolve().parent.parent / "src" / "assets" / "crops"
WIDTHS = {480: 74, 192: 72}  # width -> WebP quality

for width, quality in WIDTHS.items():
    out_dir = CROPS / str(width)
    out_dir.mkdir(exist_ok=True)
    for source in sorted(CROPS.glob("*.webp")):
        image = Image.open(source).convert("RGB")
        height = round(image.height * width / image.width)
        image.resize((width, height), Image.LANCZOS).save(
            out_dir / source.name, "WEBP", quality=quality, method=6
        )
    print(f"{width}px: {len(list(out_dir.glob('*.webp')))} photos in {out_dir}")
