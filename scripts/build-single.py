#!/usr/bin/env python3
"""Bundle index.html + css + js + favicon into one self-contained HTML file.

Usage: python3 scripts/build-single.py OUT.html [--fragment]
--fragment drops <!doctype>/<html>/<head>/<body> wrappers (for hosts that add their own skeleton).
"""
import base64, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1])
fragment = "--fragment" in sys.argv

html = (root / "index.html").read_text()
css = (root / "css/styles.css").read_text()
favicon = "data:image/svg+xml;base64," + base64.b64encode((root / "assets/favicon.svg").read_bytes()).decode()

html = html.replace('<link rel="stylesheet" href="css/styles.css" />', f"<style>\n{css}\n</style>")
for js in ("js/products.js", "js/brands.js", "js/art.js", "js/app.js", "js/builder.js"):
    html = html.replace(f'<script src="{js}"></script>', f"<script>\n{(root / js).read_text()}\n</script>")
html = html.replace('href="assets/favicon.svg"', f'href="{favicon}"').replace('src="assets/favicon.svg"', f'src="{favicon}"')

if fragment:
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    head = re.sub(r'\s*<meta (charset|name="viewport")[^>]*>', "", head)
    title = re.search(r"<title>.*?</title>", head).group(0)
    head = head.replace(title, "")
    html = f'{title}\n<meta name="claude:viewport-fit-sides" content="cover">{head}\n{body}'

out.write_text(html)
print(f"wrote {out} ({out.stat().st_size // 1024} KB)")
