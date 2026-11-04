#!/usr/bin/env python3
"""Versionet e vogla të fotove të produkteve (Raundi 04, f. 24: srcset/sizes për kartat dhe galerinë).

Për çdo foto .webp në assets/products/ (dhe photo/, photo/dark/, real/) krijon:
  <dosja>/480/<emri>.webp  dhe  <dosja>/720/<emri>.webp
Dyqani (media() në js/app.js) i përdor me srcset, që telefoni dhe kartat të mos shkarkojnë foton 1000–1200 px.
Fotot më të vogla se madhësia e kërkuar kopjohen pa zmadhim, që çdo adresë në srcset të ekzistojë.

Ekzekutimi: python3 scripts/build-thumbs.py   (pas importit të fotove të reja)
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "assets" / "products"
DIRS = [ROOT, ROOT / "photo", ROOT / "photo" / "dark", ROOT / "real"]
WIDTHS = (480, 720)


def main():
    made = 0
    for d in DIRS:
        for src in sorted(d.glob("*.webp")):
            im = None
            for w in WIDTHS:
                out = d / str(w) / src.name
                if out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
                    continue
                if im is None:
                    im = Image.open(src)
                    im.load()
                out.parent.mkdir(exist_ok=True)
                if im.width > w:
                    h = round(im.height * w / im.width)
                    im.resize((w, h), Image.LANCZOS).save(out, "WEBP", quality=80, method=6)
                else:
                    im.save(out, "WEBP", quality=84, method=6)
                made += 1
    print(f"versione të krijuara: {made}")


if __name__ == "__main__":
    main()
