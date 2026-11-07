"""Checks that every file referenced by index.html / tuco.css exists. Run from the repo root."""
import os
import re
import sys

html = open("index.html", encoding="utf-8").read()
css = open("assets/css/tuco.css", encoding="utf-8").read()

attrs = r"(?:src|href|poster|data-src|data-src-lg|data-src-sm|data-preview|data-strip-src|data-lazy-src|data-poster)"
refs = {r for r in re.findall(attrs + r'="([^"#]+?)"', html) if "://" not in r and not r.startswith(("mailto:", "tel:"))}
refs |= {os.path.normpath(os.path.join("assets/css", r)) for r in re.findall(r'url\("?(\.\./[^")]+)', css)}

missing = sorted(r for r in refs if not os.path.exists(r))
size = sum(os.path.getsize(r) for r in refs if os.path.exists(r))
print(f"{len(refs)} referenced files, {size / 1e6:.1f} MB in total")
print("missing:", missing or "none")
sys.exit(1 if missing else 0)
