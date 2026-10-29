#!/bin/bash
# Runs index.html once in headless Chrome and saves the SFX events the layouts registered -> .yt/sfx.json
set -euo pipefail
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=20000 --dump-dom "file://$PWD/index.html" 2>/dev/null \
  | python3 -c '
import re, sys, html, json
m = re.search(r"<script[^>]*id=\"yt-sfx\"[^>]*>(.*?)</script>", sys.stdin.read(), re.S)
ev = json.loads(html.unescape(m.group(1))) if m else []
open(".yt/sfx.json", "w").write(json.dumps(ev))
print(f"sfx events: {len(ev)}")'
