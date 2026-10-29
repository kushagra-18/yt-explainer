#!/usr/bin/env python3
"""Audio for a video: voice track + synthesized SFX + an original music bed, ducked under the voice.

Reads .yt/timeline.json (voice takes, scenes, chapters) and .yt/sfx.json (SFX events the runtime emitted).
Writes .yt/mix.wav (stereo 44.1 kHz). No samples, no licences: everything is synthesized, deterministic.

Music: one groove per chapter (key + chord progression change at every chapter, drums drop out on chapter
cards, a sparse tension bed under the hook), FM electric piano + bass + soft drums + plucks.
  audio.py                 full mix
  audio.py --music-only    write .yt/music.wav only (to audition the bed)
  env YT_MUSIC=0           no music (voice + SFX only)
"""
import json
import os
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

ROOT = Path.cwd()
SR = 44100
RNG = np.random.default_rng(7)
TL = json.loads((ROOT / ".yt" / "timeline.json").read_text())
META = json.loads((ROOT / ".yt" / "meta.json").read_text()) if (ROOT / ".yt" / "meta.json").exists() else {}
TOTAL = TL["total"]
N = int((TOTAL + 0.5) * SR)


# ───────────────────────── basics ─────────────────────────
def t_(d):
    return np.arange(int(d * SR)) / SR


def env(n, a=0.004, k=18.0):
    t = np.arange(n) / SR
    e = np.exp(-k * t)
    att = max(1, int(a * SR))
    e[:att] *= np.linspace(0, 1, att)
    return e


def sweep(f0, f1, d, wave="sine"):
    t = t_(d)
    f = f0 * (f1 / f0) ** (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    if wave == "square":
        return np.sign(np.sin(ph)) * 0.6
    if wave == "tri":
        return 2 / np.pi * np.arcsin(np.sin(ph))
    return np.sin(ph)


def band(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], btype="band", fs=SR, output="sos"), x)


def low(x, hi):
    return sosfilt(butter(2, hi, btype="low", fs=SR, output="sos"), x)


def high(x, lo):
    return sosfilt(butter(2, lo, btype="high", fs=SR, output="sos"), x)


def place(buf, x, t, g=1.0):
    s = int(t * SR)
    if s >= len(buf) or s + len(x) <= 0:
        return
    if s < 0:
        x, s = x[-s:], 0
    e = min(len(buf), s + len(x))
    buf[s:e] += x[: e - s] * g


# ───────────────────────── SFX ─────────────────────────
def pop():
    x = sweep(820, 360, 0.09) * env(int(0.09 * SR), 0.002, 30)
    return x + 0.25 * band(RNG.standard_normal(len(x)), 2000, 6000) * env(len(x), 0.001, 90)


def tick():
    return low(sweep(1250, 1150, 0.035, "square"), 4000) * env(int(0.035 * SR), 0.001, 90)


def thud():
    n = int(0.16 * SR)
    return sweep(170, 70, 0.16) * env(n, 0.002, 22) + 0.5 * low(RNG.standard_normal(n), 900) * env(n, 0.001, 45)


def whoosh(d=0.5, f0=500, f1=3500):
    n = int(d * SR)
    noise = RNG.standard_normal(n)
    lo_b, hi_b = band(noise, f0 * 0.6, f0 * 2.2), band(noise, f1 * 0.5, min(15000, f1 * 1.8))
    p = np.sin(np.pi * np.linspace(0, 1, n))
    return (lo_b * (1 - p) + hi_b * p) * p ** 1.6


def swish():
    return whoosh(0.38, 900, 2600) * 0.7


def whip():
    return whoosh(0.28, 1200, 5000) * 0.9


def ding():
    t = t_(1.2)
    return sum(g * np.sin(2 * np.pi * f * t) for f, g in [(1318.5, 1), (2637, 0.4), (3951, 0.18), (1975.5, 0.3)]) * env(len(t), 0.002, 3.5)


def flip():
    n = int(0.09 * SR)
    return band(RNG.standard_normal(n), 1800, 7000) * env(n, 0.002, 45) + 0.4 * sweep(300, 140, 0.09) * env(n, 0.001, 50)


def paper():  # a big sheet sliding across: long papery swoosh + a soft slap
    n = int(0.55 * SR)
    p = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.2
    x = band(RNG.standard_normal(n), 1200, 7500) * p * (0.7 + 0.3 * np.sin(2 * np.pi * 23 * np.arange(n) / SR))
    out = np.concatenate([x, np.zeros(int(0.1 * SR))])
    place(out, flip(), 0.42, 0.8)
    return out


def stamp():
    n = int(0.22 * SR)
    return sweep(130, 60, 0.22) * env(n, 0.001, 18) + 0.6 * band(RNG.standard_normal(n), 500, 4000) * env(n, 0.0005, 70)


def scribble():
    n = int(0.3 * SR)
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 14 * np.arange(n) / SR)
    return band(RNG.standard_normal(n), 2500, 8000) * am * np.sin(np.pi * np.linspace(0, 1, n)) * 0.6


def counter():
    out = np.zeros(int(1.1 * SR))
    tt = 0.0
    while tt < 1.0:
        place(out, tick(), tt, 0.7)
        tt += max(0.025, 0.11 * (1 - tt) ** 1.5)
    return out


def riser():
    return sweep(220, 1400, 0.55, "tri") * np.linspace(0.2, 1, int(0.55 * SR)) * env(int(0.55 * SR), 0.01, 1.5)


def cash():
    out = np.zeros(int(1.1 * SR))
    c = band(RNG.standard_normal(int(0.05 * SR)), 1500, 6000) * env(int(0.05 * SR), 0.001, 60)
    out[: len(c)] += c * 0.8
    for i, f in enumerate([2093.0, 2637.0]):
        x = sum(g * np.sin(2 * np.pi * f * k * t_(0.9)) for k, g in [(1, 1), (2.7, 0.3)]) * env(int(0.9 * SR), 0.002, 5)
        place(out, x, 0.06 + i * 0.08, 0.6)
    return out


def impact():  # hook opener: sub boom + noise burst
    n = int(1.2 * SR)
    return sweep(90, 35, 1.2) * env(n, 0.002, 3.2) * 1.2 + band(RNG.standard_normal(n), 200, 3000) * env(n, 0.001, 14) * 0.5


SFX = {"pop": (pop, 0.32), "tick": (tick, 0.22), "thud": (thud, 0.5), "whoosh": (whoosh, 0.32), "swish": (swish, 0.32), "whip": (whip, 0.3),
       "ding": (ding, 0.22), "flip": (flip, 0.42), "paper": (paper, 0.45), "stamp": (stamp, 0.45), "scribble": (scribble, 0.22),
       "counter": (counter, 0.2), "riser": (riser, 0.25), "cash": (cash, 0.3), "impact": (impact, 0.55)}


def sfx_track():
    out = np.zeros(N)
    p = ROOT / ".yt" / "sfx.json"
    ev = json.loads(p.read_text()) if p.exists() else []
    ev.append([0.0, "impact", 1.0])
    ev.sort()
    last = {}
    cache = {}
    for t, kind, g in ev:
        if kind not in SFX or t < 0 or t >= TOTAL:
            continue
        if t - last.get(kind, -9) < 0.09:  # identical sounds closer than 90 ms smear: keep the first
            continue
        last[kind] = t
        fn, base = SFX[kind]
        if kind not in cache:
            x = fn()
            cache[kind] = x / (np.max(np.abs(x)) + 1e-9)
        place(out, cache[kind], t, base * g)
    return out


# ───────────────────────── music ─────────────────────────
BPM = float(META.get("bpm", 94))
BEAT = 60 / BPM
BAR = 4 * BEAT
SWING = 0.09  # fraction of an 8th note the off-beats are late
NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
# progressions as (scale degree semitones from key root, chord quality)
PROG = {
    "lift": [(0, "maj7"), (7, "dom"), (9, "m7"), (5, "maj7")],      # I V vi IV
    "curious": [(9, "m7"), (5, "maj7"), (0, "maj7"), (7, "sus")],   # vi IV I V
    "drive": [(5, "maj7"), (7, "dom"), (4, "m7"), (9, "m7")],       # IV V iii vi
    "tension": [(9, "m7"), (5, "maj7"), (0, "add9"), (7, "dom")],   # minor feel
    "warm": [(0, "add9"), (4, "m7"), (5, "maj7"), (7, "sus")],
}
QUAL = {"maj7": [0, 4, 7, 11], "m7": [0, 3, 7, 10], "dom": [0, 4, 7, 10], "sus": [0, 5, 7, 10], "add9": [0, 4, 7, 14]}
KEYS = ["C", "F", "D", "G", "Eb", "A", "Bb"]
ORDER = ["lift", "curious", "drive", "warm", "curious", "lift", "drive"]


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


@lru_cache(maxsize=4096)
def ep(midi, dur):  # FM electric piano
    t = t_(dur + 0.6)
    f = hz(midi)
    idx = 1.8 * np.exp(-t * 3.0) + 0.25
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t)) + 0.18 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6)
    x *= env(len(t), 0.004, 1.6) * (1 + 0.05 * np.sin(2 * np.pi * 4.6 * t))
    rel = np.ones(len(t))
    r0 = int(dur * SR)
    rel[r0:] = np.exp(-np.arange(len(t) - r0) / SR * 9)
    return (x * rel).astype(np.float32)


@lru_cache(maxsize=512)
def bass(midi, dur):
    t = t_(dur + 0.15)
    f = hz(midi)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    x = np.tanh(1.6 * x) * env(len(t), 0.006, 2.2)
    rel = np.ones(len(t)); r0 = int(dur * SR); rel[r0:] = np.exp(-np.arange(len(t) - r0) / SR * 25)
    return (low(x * rel, 900)).astype(np.float32)


@lru_cache(maxsize=512)
def pluck(midi):  # Karplus-Strong
    f = hz(midi)
    n = int(SR / f)
    buf = RNG.uniform(-1, 1, n)
    out = np.zeros(int(0.9 * SR))
    for i in range(len(out)):
        out[i] = buf[i % n]
        buf[i % n] = 0.5 * (buf[i % n] + buf[(i + 1) % n]) * 0.996
    return (out * env(len(out), 0.002, 3)).astype(np.float32)


KICK = (sweep(125, 42, 0.32) * env(int(0.32 * SR), 0.001, 9)).astype(np.float32)
_sn = int(0.2 * SR)
SNARE = (band(RNG.standard_normal(_sn), 1200, 6500) * env(_sn, 0.001, 24) * 0.8 + sweep(220, 160, 0.2) * env(_sn, 0.001, 30) * 0.5).astype(np.float32)
_h = int(0.05 * SR)
HAT = (high(RNG.standard_normal(_h), 7000) * env(_h, 0.0005, 80)).astype(np.float32)
SHAKER = (band(RNG.standard_normal(int(0.08 * SR)), 5000, 11000) * np.sin(np.pi * np.linspace(0, 1, int(0.08 * SR))) ** 2).astype(np.float32)


def sections():
    """[(t0, t1, kind, key_root_midi, progression)] from chapters; hook = tension; cards = breaks."""
    out = []
    chs = TL["chapters"]
    starts = [c["start"] for c in chs] + [TOTAL]
    for i, c in enumerate(chs):
        prog = "tension" if i == 0 else ORDER[(i - 1) % len(ORDER)]
        key = 48 + NOTE[KEYS[i % len(KEYS)]]
        out.append((starts[i], starts[i + 1], "hook" if i == 0 else "groove", key, prog))
    return out


def music():
    L, R = np.zeros(N, np.float32), np.zeros(N, np.float32)
    breaks = [(s["start"], s["start"] + s["dur"]) for s in TL["scenes"] if s["layout"] in ("chapter", "title")]
    end_scene = [s for s in TL["scenes"] if s["layout"] == "end"]
    in_break = lambda t: any(a - 0.05 <= t < b - 0.1 for a, b in breaks)
    for (t0, t1, kind, key, pname) in sections():
        prog = PROG[pname]
        bar = 0
        t = t0
        while t < t1 - 0.05:
            root, q = prog[bar % 4]
            chord = [key + 12 + root + iv for iv in QUAL[q]]
            bassn = key - 12 + root
            sparse = kind == "hook" and bar < 2
            # keys: syncopated stabs (1, 2&, 4) ; long pad under the hook
            hits = [(0, 1.4), (1.5, 0.45), (3, 0.9)] if not sparse else [(0, 3.8)]
            for b, d in hits:
                tt = t + b * BEAT + (SWING * BEAT / 2 if b % 1 else 0)
                if tt >= t1:
                    continue
                for k, m in enumerate(chord):
                    x = ep(m, round(d * BEAT, 2)) * (0.16 if k else 0.2)
                    place(L, x, tt + k * 0.006, 0.9); place(R, x, tt + k * 0.006 + 0.004, 0.75)
            # bass
            if not sparse:
                for b, d, iv in [(0, 1.2, 0), (2.5, 0.4, 0), (3.5, 0.4, 7 if bar % 2 else 12)]:
                    tt = t + b * BEAT
                    if tt < t1:
                        x = bass(bassn + iv, round(d * BEAT, 2)) * 0.55
                        place(L, x, tt); place(R, x, tt)
            # drums (none on chapter/title cards, none in the first 2 hook bars)
            for b in range(8):
                tt = t + b * BEAT / 2 + (SWING * BEAT / 2 if b % 2 else 0)
                if tt >= t1 or in_break(tt) or sparse:
                    continue
                if b in (0, 4) or (b == 5 and bar % 2):
                    place(L, KICK, tt, 0.55); place(R, KICK, tt, 0.55)
                if b in (2, 6) and kind != "hook":
                    place(L, SNARE, tt, 0.22); place(R, SNARE, tt, 0.26)
                if kind != "hook" or bar >= 4:
                    place(R, HAT, tt, 0.12 if b % 2 else 0.07); place(L, SHAKER, tt + BEAT / 4, 0.04)
            # plucks on every other bar in grooves: a light arpeggio for sparkle
            if kind == "groove" and bar % 2 == 1:
                for k in range(8):
                    m = chord[[0, 1, 2, 3, 2, 1, 2, 3][k]] + 12
                    tt = t + k * BEAT / 2
                    if tt < t1 and not in_break(tt):
                        place(L, pluck(m), tt, 0.07); place(R, pluck(m), tt + 0.012, 0.04)
            t += BAR
            bar += 1
    st = np.stack([L, R], axis=1)
    st /= np.max(np.abs(st)) + 1e-9
    # end screen: music swells a little; final 2 s fade out
    if end_scene:
        e0 = int(end_scene[0]["start"] * SR)
        st[e0:] *= 1.35
    f = int(2.0 * SR)
    st[-f:] *= np.linspace(1, 0, f)[:, None]
    st[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
    return st


# ───────────────────────── voice + mix ─────────────────────────
def voice_track():
    out = np.zeros(N)
    for v in TL["vo"]:
        x, sr = sf.read(v["wav"])
        if x.ndim > 1:
            x = x.mean(axis=1)
        if sr != SR:
            raise SystemExit(f"{v['wav']}: sample rate {sr}, expected {SR}")
        place(out, x, v["at"])
    return out


def duck_env(v):
    """1 where silent, ~0.32 under speech; 60 ms attack, 450 ms release."""
    hop = int(0.01 * SR)
    fr = len(v) // hop
    rms = np.sqrt(np.mean(v[: fr * hop].reshape(fr, hop) ** 2, axis=1) + 1e-12)
    on = (rms > 0.02).astype(float)
    g = np.ones(fr)
    lvl = 1.0
    for i in range(fr):
        target = 0.32 if on[i] or (i + 8 < fr and on[i + 1:i + 8].any()) else 1.0  # start ducking just before words
        lvl += (target - lvl) * (0.35 if target < lvl else 0.025)
        g[i] = lvl
    return np.interp(np.arange(len(v)), np.arange(fr) * hop, g)


def main():
    if "--music-only" in sys.argv:
        sf.write(ROOT / ".yt" / "music.wav", music(), SR); print(ROOT / ".yt" / "music.wav"); return
    v = voice_track()
    fx = sfx_track()
    mono = v * 1.0 + fx
    st = np.stack([mono, mono], axis=1)
    if os.environ.get("YT_MUSIC", "1") != "0" and META.get("music", True) is not False:
        m = music()
        g = duck_env(v)
        st += m[: len(st)] * (0.2 * g)[:, None]
    st /= max(1.0, np.max(np.abs(st)) / 0.95)
    sf.write(ROOT / ".yt" / "mix.wav", st.astype(np.float32), SR, subtype="FLOAT")
    print(f"mix: {ROOT / '.yt' / 'mix.wav'}  ({len(st) / SR:.1f}s, voice lines {len(TL['vo'])})")


if __name__ == "__main__":
    main()
