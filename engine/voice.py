#!/usr/bin/env python3
"""Voiceover: Sarvam TTS per sentence + word timings, cached by content.

  voice.py                 voice every line of .yt/lines.json that has no take yet (writes .yt/voice.json)
  voice.py --redo 12 14    re-roll lines 12 and 14 (new take, even if cached)
  voice.py names           audition every proper noun not yet in the lexicon -> names/ (mp3 per spelling)
  voice.py pick Zepto=1 Blinkit=2    save the chosen spellings to the global lexicon
  voice.py say "text"      speak any text with the channel voice -> /tmp-ish wav path (quick checks)

.yt/lines.json is written by `yt build`: [{"id": n, "scene": i, "text": display text}, ...].
A take lives in ~/yt-explainers/.cache/vo/<hash>.wav + .json (hash of tts text + voice settings), so editing one
line only re-voices that line, and the same sentence in another video is free.
Word timings: whisper.cpp (multilingual small) on the take, aligned to the TTS words with a phonetic DP, then
mapped back to the display words (a number like "₹41,000 Cr" is one display word but several spoken words).
"""
import base64
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
import hinglish as H  # noqa: E402

ROOT = Path.cwd()
BRAND = json.loads((H.K / "assets" / "brand.json").read_text())
V = dict(BRAND["voice"])
CACHE = H.CACHE / "vo"
SR = 44100
WHISPER_MODEL = Path.home() / ".cache" / "hyperframes" / "whisper" / "models" / "ggml-small.bin"
PAUSE = {".": 0.24, "?": 0.3, "!": 0.24, "।": 0.24}


def meta():
    p = ROOT / ".yt" / "meta.json"
    return json.loads(p.read_text()) if p.exists() else {}


def tts(text, temperature=None):
    body = json.dumps({"text": text, "language_code": V["language"], "speaker": V["speaker"], "model": V["model"], "pace": V["pace"],
                       "temperature": temperature or V["temperature"], "speech_sample_rate": SR}).encode()
    req = urllib.request.Request("https://api.sarvam.ai/text-to-speech", data=body, headers={"api-subscription-key": H._key(), "Content-Type": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = json.loads(r.read())
            break
        except Exception as e:  # noqa: BLE001 — network hiccups: retry twice
            if attempt == 2:
                raise SystemExit(f"Sarvam TTS failed: {e}")
    x, sr = sf.read(io.BytesIO(base64.b64decode("".join(data["audios"]))))
    return (x if x.ndim == 1 else x.mean(axis=1)), sr


def trim(x, sr, floor_db=-40.0):
    """Cut edge silence and a lone breath at either edge (short noisy burst set apart by silence)."""
    n = int(0.01 * sr)
    fr = len(x) // n
    if fr < 3:
        return x
    rms = np.sqrt(np.mean(x[: fr * n].reshape(fr, n) ** 2, axis=1) + 1e-12)
    on = 20 * np.log10(rms / rms.max()) > floor_db
    runs, s0 = [], None
    for i, v in enumerate(on):
        if v and s0 is None:
            s0 = i
        if not v and s0 is not None:
            runs.append([s0, i]); s0 = None
    if s0 is not None:
        runs.append([s0, fr])
    runs = [r for r in runs if r[1] - r[0] >= 3]
    if not runs:
        return x

    def breath(r, gap):
        seg = x[r[0] * n:r[1] * n]
        sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) + 1e-9
        flat = np.exp(np.mean(np.log(sp))) / np.mean(sp)
        return (r[1] - r[0]) <= 30 and gap >= 10 and flat > 0.22

    while len(runs) > 1 and breath(runs[0], runs[1][0] - runs[0][1]):
        runs.pop(0)
    while len(runs) > 1 and runs[-1][1] - runs[-1][0] <= 18 and breath(runs[-1], runs[-1][0] - runs[-2][1]):
        runs.pop()
    a, b = max(0, runs[0][0] * n - int(0.02 * sr)), min(len(x), runs[-1][1] * n + int(0.08 * sr))
    y = x[a:b].copy()
    f = int(0.006 * sr)
    y[:f] *= np.linspace(0, 1, f)
    y[-f:] *= np.linspace(1, 0, f)
    return y


# ── Devanagari -> rough Latin, only to compare whisper's words with ours ──
_C = {"क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n", "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n", "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh",
      "ण": "n", "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n", "प": "p", "फ": "f", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r", "ल": "l",
      "व": "v", "श": "sh", "ष": "sh", "स": "s", "ह": "h", "ज़": "z", "फ़": "f", "ड़": "r", "ढ़": "rh", "क़": "k", "ख़": "kh", "ग़": "g"}
_V = {"अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऑ": "o", "ऋ": "ri"}
_M = {"ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o", "ृ": "ri", "ं": "n", "ँ": "n", "ः": "h", "्": "", "़": ""}


def roman(w):
    w = w.lower()
    out = []
    for ch in w:
        if ch in _C:
            out.append(_C[ch])
        elif ch in _V:
            out.append(_V[ch])
        elif ch in _M:
            out.append(_M[ch])
        elif ch.isascii() and ch.isalnum():
            out.append(ch)
    s = "".join(out)
    s = re.sub(r"(.)\1+", r"\1", s)  # aa->a, ee->e: spelling noise
    return s.replace("w", "v").replace("ph", "f").replace("z", "j")


def lev(a, b):
    if not a or not b:
        return max(len(a), len(b))
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(b) + 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
    return d[-1]


def align(ours, heard):
    """DP alignment of our TTS words to whisper's words. Returns for each of ours an index into heard or None."""
    A, B = [roman(w) for w in ours], [roman(w["text"]) for w in heard]
    n, m = len(A), len(B)
    INF = 1e9
    cost = np.full((n + 1, m + 1), INF)
    back = np.zeros((n + 1, m + 1), dtype=np.int8)
    cost[0, :] = np.arange(m + 1) * 0.7
    cost[:, 0] = np.arange(n + 1) * 0.7
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            sim = lev(A[i - 1], B[j - 1]) / max(len(A[i - 1]), len(B[j - 1]), 1)
            opts = (cost[i - 1, j - 1] + sim, cost[i - 1, j] + 0.7, cost[i, j - 1] + 0.7)
            k = int(np.argmin(opts))
            cost[i, j], back[i, j] = opts[k], k
    out = [None] * n
    i, j = n, m
    while i > 0 and j > 0:
        k = back[i, j]
        if k == 0:
            out[i - 1] = j - 1; i -= 1; j -= 1
        elif k == 1:
            i -= 1
        else:
            j -= 1
    return out


def whisper(wav):
    tmp = wav.with_suffix(".16k.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-ar", "16000", "-ac", "1", str(tmp)], check=True)
    base = wav.with_suffix(".wh")
    subprocess.run(["whisper-cli", "-m", str(WHISPER_MODEL), "-l", "hi", "-f", str(tmp), "-ojf", "-of", str(base), "-ml", "1", "-sow", "-np"],
                   check=True, capture_output=True)
    d = json.loads(Path(str(base) + ".json").read_text())
    tmp.unlink(missing_ok=True); Path(str(base) + ".json").unlink(missing_ok=True)
    out = []
    for s in d["transcription"]:
        t = s["text"].strip()
        if t and re.search(r"\w", t):
            out.append({"text": t, "start": s["offsets"]["from"] / 1000, "end": s["offsets"]["to"] / 1000})
    return out


def weight(w):  # rough syllable weight for interpolation
    return max(1, len(re.findall(r"[aeiouyाीिुूेैोौॉ]|[अ-औ]", w.lower())) or len(w) / 3)


def timings(tts_words, heard, dur):
    """start/end for every tts word: aligned whisper times, unaligned words interpolated by syllable weight."""
    idx = align(tts_words, heard)
    st = [heard[k]["start"] if k is not None else None for k in idx]
    en = [heard[k]["end"] if k is not None else None for k in idx]
    n = len(tts_words)
    i = 0
    while i < n:
        if st[i] is not None:
            i += 1; continue
        j = i
        while j < n and st[j] is None:
            j += 1
        t0 = en[i - 1] if i > 0 and en[i - 1] is not None else 0.0
        t1 = st[j] if j < n else dur
        ws = [weight(w) for w in tts_words[i:j]]
        tot = sum(ws); acc = t0
        for k, wv in zip(range(i, j), ws):
            st[k] = acc; acc += (t1 - t0) * wv / tot; en[k] = acc
        i = j
    for k in range(1, n):  # monotonic
        st[k] = max(st[k], st[k - 1] + 0.02)
        en[k] = max(en[k], st[k] + 0.05)
    return [round(min(s, dur), 3) for s in st], [round(min(e, dur), 3) for e in en]


def take(text, lex, force=False):
    """Voice one line (display text). Returns cache key; files: CACHE/<key>.wav and .json."""
    toks = H.tokens(text, lex)
    sents, cur = [], []
    for t in toks:  # one TTS request per sentence: steadier prosody, cheap re-rolls
        cur.append(t)
        if t["post"] and t["post"][-1] in ".?!":
            sents.append(cur); cur = []
    if cur:
        sents.append(cur)
    spoken = " ".join(w for t in toks for w in t["tts"])
    key = hashlib.sha1(json.dumps([spoken, V["speaker"], V["model"], V["pace"], 3]).encode()).hexdigest()[:16]
    CACHE.mkdir(parents=True, exist_ok=True)
    wav, js = CACHE / f"{key}.wav", CACHE / f"{key}.json"
    if wav.exists() and js.exists() and not force:
        return key
    parts, words, t0 = [], [], 0.0
    for si, sent in enumerate(sents):
        tw = [w for t in sent for w in t["tts"]]
        best = None
        for attempt in range(3):
            x, sr = tts(" ".join(tw), temperature=None if attempt == 0 else 0.45 + 0.1 * attempt)
            y = trim(x, sr)
            tmp = CACHE / f"{key}.s{si}.wav"
            sf.write(tmp, y, SR)
            heard = whisper(tmp)
            tmp.unlink(missing_ok=True)
            miss = abs(len(heard) - len(tw)) / max(len(tw), 1)
            if best is None or miss < best[0]:
                best = (miss, y, heard)
            if miss <= 0.2 or abs(len(heard) - len(tw)) <= 2:
                break
            print(f"   re-roll: whisper heard {len(heard)} words, expected {len(tw)}", flush=True)
        _, y, heard = best
        st, en = timings(tw, heard, len(y) / SR)
        k = 0
        for t in sent:
            n = len(t["tts"])
            if n:
                words.append({"w": t["w"], "start": round(t0 + st[k], 3), "end": round(t0 + en[k + n - 1], 3)})
            else:
                words.append({"w": t["w"], "start": round(t0 + (st[k] if k < len(st) else len(y) / SR), 3), "end": round(t0 + (st[k] if k < len(st) else len(y) / SR), 3)})
            k += n
        parts.append(y)
        t0 += len(y) / SR
        if si + 1 < len(sents):
            gap = PAUSE.get(sent[-1]["post"][-1:], 0.24)
            parts.append(np.zeros(int(gap * SR)))
            t0 += gap
    y = np.concatenate(parts)
    y = y / (np.max(np.abs(y)) + 1e-9) * 0.89
    sf.write(wav, y, SR)
    js.write_text(json.dumps({"text": text, "tts": spoken, "dur": round(len(y) / SR, 3), "words": words}, ensure_ascii=False))
    return key


def run(redo):
    lines = json.loads((ROOT / ".yt" / "lines.json").read_text())
    lex = meta().get("say") or {}
    vp = ROOT / ".yt" / "voice.json"
    index = json.loads(vp.read_text()) if vp.exists() else {}
    for L in lines:
        lid = str(L["id"])
        force = L["id"] in redo
        key = take(L["text"], lex, force=force)
        new = index.get(lid) != key or force
        index[lid] = key
        if new:
            d = json.loads((CACHE / f"{key}.json").read_text())
            print(f"line {lid:>3} {d['dur']:5.1f}s  {L['text'][:70]}", flush=True)
        vp.write_text(json.dumps(index, indent=0))
    print(f"voiced {len(lines)} lines -> .yt/voice.json")


# ── proper-noun auditions ──
def candidates():
    """Names in the script that the lexicon has not settled yet."""
    lines = json.loads((ROOT / ".yt" / "lines.json").read_text())
    lex = H.lexicon(meta().get("say") or {})
    eng = H.english()
    seen = {}
    for L in lines:
        for t in H.tokens(L["text"], online=False):
            c = re.sub(r"['’]s$", "", t["core"])
            if t["lang"] == "en" and c[:1].isupper() and c.lower() not in eng and c.lower() not in lex and not c.isupper():
                seen.setdefault(c, L["text"])
            elif t["lang"] == "en" and c.isupper() and 2 <= len(c) <= 6 and c.lower() not in lex:
                seen.setdefault(c, L["text"])
    return seen


def syllables(w):
    parts = re.findall(r"[^aeiouy]*[aeiouy]+(?:[^aeiouy](?=[^aeiouy]))?", w.lower())
    s = "-".join(parts) if parts else w
    rest = w.lower()[len(s.replace("-", "")):]
    return (s + rest).capitalize()


def names():
    c = candidates()
    if not c:
        print("every name in the script is already in the lexicon"); return
    out = ROOT / "names"
    out.mkdir(exist_ok=True)
    md = ["# Name check", "", "Listen, then tell Claude the number per name (e.g. `Zepto 1, Kaivalya 3`). Saved forever in the lexicon.", ""]
    for name in c:
        deva = H.translit([name])[0]
        opts = [name, syllables(name), deva] if not name.isupper() else [name, " ".join(name), deva]
        opts = list(dict.fromkeys(opts))
        md.append(f"- **{name}**: " + " · ".join(f"{i}=`{o}`" for i, o in enumerate(opts, 1)))
        for i, o in enumerate(opts, 1):
            x, sr = tts(f"आज की कहानी {o} की है, और {o} ने सबको चौंका दिया।")
            y = trim(x, sr)
            f = out / f"{name}-{i}.wav"
            sf.write(f, y, SR)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(f), "-b:a", "128k", str(f.with_suffix(".mp3"))], check=True)
            f.unlink()
        print(f"{name}: " + "  ".join(f"{i}={o}" for i, o in enumerate(opts, 1)), flush=True)
    (out / "NAMES.md").write_text("\n".join(md) + "\n")
    (out / "options.json").write_text(json.dumps({n: (lambda n: [n, syllables(n) if not n.isupper() else " ".join(n), H.translit([n])[0]])(n) for n in c}, ensure_ascii=False))
    print(f"\nauditions: {out}  (open it, listen, then: yt names pick Name=N ...)")


def pick(args):
    f = ROOT / "names" / "options.json"
    opts = json.loads(f.read_text()) if f.exists() else {}
    p = H.DATA / "lexicon.json"
    lex = json.loads(p.read_text())
    for a in args:
        name, _, val = a.partition("=")
        if val.isdigit():
            if name not in opts:
                raise SystemExit(f"no audition for {name}: run yt names first, or give a spelling: {name}=Spelling")
            o = list(dict.fromkeys(opts[name]))
            val = o[int(val) - 1]
        lex[name] = val
        print(f"lexicon: {name} -> {val}")
    p.write_text(json.dumps(lex, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["names"]:
        pick(a[2:]) if a[1:2] == ["pick"] else names()
    elif a[:1] == ["pick"]:
        pick(a[1:])
    elif a[:1] == ["say"]:
        k = take(" ".join(a[1:]), meta().get("say") or {}, force=True)
        print(CACHE / f"{k}.wav")
    else:
        redo = {int(x) for x in a if x.isdigit()}
        run(redo)
