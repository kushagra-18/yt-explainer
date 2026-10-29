#!/usr/bin/env python3
"""Fetch the images a video needs (front matter `img:`), make cutouts, keep a credits log, show a contact sheet.

video.md front matter:
  img:
    kamath: cut wiki:Nithin Kamath            # Wikipedia page image (people: photo, companies: often the logo)
    zerodha-logo: commons:File:Zerodha logo.svg   # an exact Commons file
    street: commons:Mumbai street market       # Commons search, first good result
    rider: openverse:delivery rider india       # Openverse search (CC licensed, many sources)
    groww: logo:groww.in                        # brand logo: Commons "<brand> logo" file, else site icon 256px
    cred: logo:CRED cred.club                   # brand name first when the domain isn't the name
    chart: https://example.com/x.png            # direct URL
  "cut " in front = also remove the background -> <name>.cut.png (used automatically by layouts)

  yt assets            fetch what is missing (files you drop in assets/img/ with the same name always win)
  yt assets --sheet    contact sheet of every image -> qa/assets.jpg (look at it: right person? right logo?)
  yt assets --redo X   fetch X again (next search result)
Credits go to assets/CREDITS.md; put the ones that need attribution in the video description.
"""
import json
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path.cwd()
IMG = ROOT / "assets" / "img"
UA = {"User-Agent": "yt-explainer/1.0 (personal YouTube research; contact via GitHub)"}
HF = ["npx", "-y", "hyperframes@0.8.162"]
EXTS = (".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif")


def get(url, raw=False, tries=4):
    import time
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                data = r.read()
            return data if raw else json.loads(data)
        except urllib.error.HTTPError as e:  # Wikimedia rate-limits bursts: back off and retry
            if e.code not in (429, 500, 502, 503, 504) or i == tries - 1:
                raise
            time.sleep(int(e.headers.get("Retry-After") or 0) or 3 * (i + 1))


def meta():
    p = ROOT / ".yt" / "meta.json"
    if not p.exists():
        subprocess.run(["node", str(Path(__file__).parent / "build.mjs"), "--plan"], capture_output=True)
    return json.loads(p.read_text()) if p.exists() else {}


def commons_info(title):
    q = urllib.parse.urlencode({"action": "query", "titles": title, "prop": "imageinfo", "iiprop": "url|size|extmetadata|mime", "iiurlwidth": 1800, "format": "json"})
    pages = get("https://commons.wikimedia.org/w/api.php?" + q)["query"]["pages"]
    for p in pages.values():
        if "imageinfo" in p:
            i = p["imageinfo"][0]; m = i.get("extmetadata", {})
            url = i["url"] if i.get("mime") == "image/svg+xml" else i.get("thumburl", i["url"])
            return {"url": url, "license": m.get("LicenseShortName", {}).get("value", "?"), "author": re.sub("<[^>]+>", "", m.get("Artist", {}).get("value", "?"))[:80], "page": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(p["title"])}
    return None


def commons_search(q, skip=0):
    p = urllib.parse.urlencode({"action": "query", "generator": "search", "gsrnamespace": 6, "gsrsearch": q + " filetype:bitmap|drawing", "gsrlimit": 12, "prop": "imageinfo", "iiprop": "size|mime", "format": "json"})
    pages = sorted(get("https://commons.wikimedia.org/w/api.php?" + p).get("query", {}).get("pages", {}).values(), key=lambda x: x.get("index", 0))
    good = [x["title"] for x in pages if x.get("imageinfo") and x["imageinfo"][0].get("mime", "").startswith("image/") and x["imageinfo"][0].get("width", 0) >= 500]
    return commons_info(good[skip]) if len(good) > skip else None


def wiki_file(fname, article):
    info = commons_info("File:" + fname)
    if info:
        return info
    # non-free logos live on en.wikipedia only (fair use: fine for commentary, credit the owner)
    q = urllib.parse.urlencode({"action": "query", "titles": "File:" + fname, "prop": "imageinfo", "iiprop": "url|mime", "iiurlwidth": 1200, "format": "json"})
    for f in get("https://en.wikipedia.org/w/api.php?" + q)["query"]["pages"].values():
        if "imageinfo" in f:
            i = f["imageinfo"][0]
            return {"url": i["url"] if i.get("mime") == "image/svg+xml" else i.get("thumburl", i["url"]), "license": "non-free (Wikipedia, fair use)", "author": article, "page": "https://en.wikipedia.org/wiki/" + urllib.parse.quote(article)}
    return None


def wiki_image(article):
    q = urllib.parse.urlencode({"action": "query", "titles": article, "prop": "pageimages|revisions", "piprop": "name", "pilicense": "any",
                                "rvprop": "content", "rvslots": "main", "rvsection": 0, "redirects": 1, "format": "json", "formatversion": 2})
    for p in get("https://en.wikipedia.org/w/api.php?" + q)["query"].get("pages", []):
        names = [p["pageimage"]] if "pageimage" in p else []
        # pageimages skips many company logos: fall back to the infobox logo / image field
        text = (p.get("revisions") or [{}])[0].get("slots", {}).get("main", {}).get("content", "")
        for key in ("logo", "image"):
            m = re.search(r"\|\s*" + key + r"\s*=\s*(?:\[\[)?(?:File:|Image:)?([^\n|\]{}]+\.(?:svg|png|jpe?g|webp|gif))", text, re.I)
            if m:
                names.append(m.group(1).strip())
        for n in dict.fromkeys(names):
            info = wiki_file(n.replace("_", " "), article)
            if info:
                return info
    return None


def brand_logo(q):
    """logo:groww.in (or logo:Groww groww.in): Commons "<brand> logo" file, else the site icon at 256 px. Tiny favicons are refused."""
    parts = q.split()
    domain = re.sub(r"^https?://", "", parts[-1]).strip("/") if "." in parts[-1] else ""
    brand = " ".join(parts[:-1]) if domain and len(parts) > 1 else (domain.split(".")[0] if domain else q)
    p = urllib.parse.urlencode({"action": "query", "list": "search", "srnamespace": 6, "srsearch": brand + " logo", "srlimit": 8, "format": "json"})
    for r in get("https://commons.wikimedia.org/w/api.php?" + p).get("query", {}).get("search", []):
        t = r["title"].lower()
        if re.match(r"file:\s*" + re.escape(brand.lower()) + r"[\s_.\-(]", t) and "logo" in t:
            info = commons_info(r["title"])
            if info:
                return info
    if not domain:
        return None
    for url in (f"https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://{domain}&size=256",
                f"https://www.google.com/s2/favicons?domain={domain}&sz=256"):
        try:
            from PIL import Image
            import io
            if min(Image.open(io.BytesIO(get(url, raw=True))).size) >= 128:
                return {"url": url, "license": "trademark (logo, editorial use)", "author": domain, "page": "https://" + domain}
        except Exception:  # noqa: BLE001
            pass
    print(f"  (only a tiny favicon exists for {domain}: drop a logo file in assets/img/, or let the layout use its typographic logo chip)")
    return None


def openverse(q, skip=0):
    p = urllib.parse.urlencode({"q": q, "license_type": "commercial,modification", "page_size": 12})
    rs = get("https://api.openverse.org/v1/images/?" + p).get("results", [])
    rs = [r for r in rs if (r.get("width") or 0) >= 600]
    if len(rs) <= skip:
        return None
    r = rs[skip]
    return {"url": r["url"], "license": f"{r.get('license', '?').upper()} {r.get('license_version', '')}".strip(), "author": (r.get("creator") or "?")[:80], "page": r.get("foreign_landing_url", r["url"])}


def resolve(spec, skip=0):
    kind, _, q = spec.partition(":")
    if spec.startswith("http"):
        return {"url": spec, "license": "?", "author": "?", "page": spec}
    if kind == "wiki":
        return wiki_image(q)
    if kind == "commons":
        return commons_info(q) if q.startswith("File:") else commons_search(q, skip)
    if kind == "logo":
        return brand_logo(q)
    if kind == "openverse":
        return openverse(q, skip)
    raise SystemExit(f"unknown image source '{spec}' (use wiki:, commons:, openverse:, logo: or a URL)")


def existing(name):
    return [p for p in IMG.glob(name + ".*") if p.suffix.lower() in EXTS or p.name.endswith(".cut.png")]


def fetch(name, spec, skip=0):
    cut = spec.startswith("cut ")
    spec = spec[4:].strip() if cut else spec.strip()
    info = resolve(spec, skip)
    if not info:
        print(f"  {name}: nothing found for '{spec}' — drop a file at assets/img/{name}.jpg or change the query"); return False
    data = get(info["url"], raw=True)
    ext = Path(urllib.parse.urlparse(info["url"]).path).suffix.lower()
    ext = ext if ext in EXTS else (".png" if data[:4] == b"\x89PNG" else ".svg" if b"<svg" in data[:500] else ".jpg")
    for old in existing(name):
        old.unlink()
    out = IMG / f"{name}{ext}"
    out.write_bytes(data)
    if ext == ".svg":  # render SVG logos to PNG so filters / sizing behave the same
        png = IMG / f"{name}.png"
        chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        html = IMG / f".{name}.html"
        html.write_text(f'<html><body style="margin:0;background:transparent"><img src="{out.name}" style="width:1200px;height:auto;display:block"></body></html>')
        subprocess.run([chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000", "--allow-file-access-from-files", "--window-size=1200,1200", f"--screenshot={png}", html.as_uri()], capture_output=True)
        html.unlink()
        if png.exists():
            out.unlink(); out = png
            trim_png(png)
    if cut:
        r = subprocess.run(HF + ["remove-background", str(out), "-o", str(IMG / f"{name}.cut.png")], capture_output=True, text=True)
        if r.returncode:
            print(f"  {name}: background removal failed: {r.stderr[-300:]}")
    credit(name, info)
    print(f"  {name}: {out.name}{' + cut' if cut else ''}  [{info['license']}, {info['author']}]")
    return True


def trim_png(p):
    try:
        from PIL import Image
        im = Image.open(p).convert("RGBA")
        bb = im.getbbox()
        if bb:
            im.crop(bb).save(p)
    except Exception:  # noqa: BLE001
        pass


def credit(name, info):
    p = ROOT / "assets" / "CREDITS.md"
    lines = p.read_text().splitlines() if p.exists() else ["# Image credits", "", "| name | license | author | source |", "|---|---|---|---|"]
    lines = [l for l in lines if not l.startswith(f"| {name} |")]
    lines.append(f"| {name} | {info['license']} | {info['author']} | {info['page']} |")
    p.write_text("\n".join(lines) + "\n")


def sheet():
    from PIL import Image, ImageDraw, ImageFont
    files = sorted(p for p in IMG.iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp") and not p.name.startswith("."))
    if not files:
        print("no images"); return
    K = Path(__file__).resolve().parent.parent
    font = ImageFont.truetype(str(K / "assets/fonts/Palanquin-SemiBold.ttf"), 20)
    C, W, H = 5, 360, 300
    R = (len(files) + C - 1) // C
    s = Image.new("RGB", (C * W, R * H), (40, 40, 40))
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGBA")
        im.thumbnail((W - 16, H - 46))
        bg = Image.new("RGBA", im.size, (251, 230, 238, 255)); bg.alpha_composite(im)
        x, y = (i % C) * W, (i // C) * H
        s.paste(bg.convert("RGB"), (x + 8, y + 38))
        ImageDraw.Draw(s).text((x + 8, y + 6), f.name, font=font, fill="white")
    (ROOT / "qa").mkdir(exist_ok=True)
    s.save(ROOT / "qa" / "assets.jpg", quality=85)
    print(ROOT / "qa" / "assets.jpg")


def main():
    IMG.mkdir(parents=True, exist_ok=True)
    a = sys.argv[1:]
    if "--sheet" in a:
        return sheet()
    specs = meta().get("img") or {}
    if not specs:
        print("no img: section in video.md front matter"); return
    redo = a[a.index("--redo") + 1:] if "--redo" in a else []
    skips = json.loads((ROOT / ".yt" / "img-skip.json").read_text()) if (ROOT / ".yt" / "img-skip.json").exists() else {}
    for name, spec in specs.items():
        if name in redo:
            skips[name] = skips.get(name, 0) + 1
        elif existing(name):
            continue
        try:
            fetch(name, str(spec), skips.get(name, 0))
        except Exception as e:  # noqa: BLE001
            print(f"  {name}: failed ({e}) — drop a file at assets/img/{name}.jpg")
    (ROOT / ".yt").mkdir(exist_ok=True)
    (ROOT / ".yt" / "img-skip.json").write_text(json.dumps(skips))
    sheet()


if __name__ == "__main__":
    main()
