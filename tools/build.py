#!/usr/bin/env python3
"""Build the single-file CalcPlus PWA.

Injects base64 icon data URIs from assets/icons.json into
src/app.template.html and writes CalcPlus.html (plus index.html so
`python3 -m http.server` serves it at the root).
"""
import json
import os

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

def main():
    with open(os.path.join(ROOT, "assets", "icons.json")) as f:
        icons = json.load(f)
    with open(os.path.join(ROOT, "src", "app.template.html")) as f:
        html = f.read()

    subs = {
        "__ICON180__": "data:image/png;base64," + icons["apple-touch-icon-180.png"],
        "__ICON192__": "data:image/png;base64," + icons["icon-192.png"],
        "__ICON512__": "data:image/png;base64," + icons["icon-512.png"],
        "__ICON512M__": "data:image/png;base64," + icons["icon-512-maskable.png"],
    }
    for token, value in subs.items():
        if token not in html:
            raise SystemExit(f"template is missing token {token}")
        html = html.replace(token, value)

    for name in ("CalcPlus.html", "index.html"):
        path = os.path.join(ROOT, name)
        with open(path, "w") as f:
            f.write(html)
        print(f"wrote {name}  ({len(html):,} bytes)")

if __name__ == "__main__":
    main()
