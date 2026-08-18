import json
import math
import hashlib
import urllib.request
from pathlib import Path

from PIL import Image, ImageChops, ImageOps


ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT / "private-data" / "subscription-products-20260817-options.json"
SOURCE_DIR = ROOT / "public" / "assets" / "subscription-product-images"
OUTPUT_DIR = ROOT / "public" / "assets" / "subscription-product-atlases"
REMOTE_CACHE_DIR = ROOT / ".tmp" / "subscription-official-images"
GRID_SIZE = 10
TILE_SIZE = 320
INNER_SIZE = 300


def create_tile(source_path: Path) -> Image.Image:
    with Image.open(source_path) as source:
        image = ImageOps.exif_transpose(source).convert("RGBA")
        flattened = Image.new("RGBA", image.size, "white")
        flattened.alpha_composite(image)
        image = flattened.convert("RGB")

        difference = ImageChops.difference(image, Image.new("RGB", image.size, "white")).convert("L")
        content_mask = difference.point(lambda value: 255 if value > 10 else 0)
        bounds = content_mask.getbbox()
        if bounds:
            left, top, right, bottom = bounds
            padding = max(8, round(max(right - left, bottom - top) * 0.035))
            image = image.crop((
                max(0, left - padding),
                max(0, top - padding),
                min(image.width, right + padding),
                min(image.height, bottom + padding),
            ))

        image.thumbnail((INNER_SIZE, INNER_SIZE), Image.Resampling.LANCZOS)
        tile = Image.new("RGB", (TILE_SIZE, TILE_SIZE), "white")
        left = (TILE_SIZE - image.width) // 2
        top = (TILE_SIZE - image.height) // 2
        tile.paste(image, (left, top))
        return tile


def resolve_source(image_url: str) -> Path:
    if image_url.startswith("/assets/subscription-product-images/"):
        return ROOT / "public" / image_url.lstrip("/")
    if image_url.startswith("https://www.lge.co.kr/"):
        REMOTE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        suffix = Path(image_url.split("?", 1)[0]).suffix or ".jpg"
        cache_name = hashlib.sha1(image_url.encode("utf-8")).hexdigest() + suffix
        cache_path = REMOTE_CACHE_DIR / cache_name
        if not cache_path.exists():
            request = urllib.request.Request(image_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(request, timeout=30) as response:
                cache_path.write_bytes(response.read())
        return cache_path
    raise ValueError(f"Unsupported product image URL: {image_url}")


catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
source_urls = sorted({
    item.get("imageUrl", "")
    for item in catalog["items"]
    if item.get("imageUrl", "") and not item.get("imageUrl", "").startswith("atlas:")
})

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
atlas_map = {}
per_atlas = GRID_SIZE * GRID_SIZE

for atlas_index in range(math.ceil(len(source_urls) / per_atlas)):
    atlas = Image.new("RGB", (GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE), "white")
    batch = source_urls[atlas_index * per_atlas:(atlas_index + 1) * per_atlas]
    for local_index, image_url in enumerate(batch):
        source_path = resolve_source(image_url)
        if not source_path.exists():
            raise FileNotFoundError(source_path)
        x = local_index % GRID_SIZE
        y = local_index // GRID_SIZE
        atlas.paste(create_tile(source_path), (x * TILE_SIZE, y * TILE_SIZE))
        atlas_map[image_url] = f"atlas:/assets/subscription-product-atlases/atlas-{atlas_index + 1:03d}.webp#{x},{y}"

    output_path = OUTPUT_DIR / f"atlas-{atlas_index + 1:03d}.webp"
    atlas.save(output_path, "WEBP", quality=86, method=6)

for item in catalog["items"]:
    image_url = item.get("imageUrl", "")
    if image_url in atlas_map:
        item["imageUrl"] = atlas_map[image_url]

CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({
    "products": len(catalog["items"]),
    "unique_source_images": len(source_urls),
    "atlas_files": math.ceil(len(source_urls) / per_atlas),
    "grid_size": GRID_SIZE,
    "tile_size": TILE_SIZE,
}, ensure_ascii=False, indent=2))
