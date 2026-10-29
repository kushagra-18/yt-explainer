# Voice + pronunciation

Settings (assets/brand.json `voice`): Sarvam `bulbul:v4-flash`, speaker `aryaman_hi_ads`, pace 1.2, hi-IN.
The user rejected slow/"documentary" voices — don't lower the pace or swap speakers without asking.
Key: `SARVAM_API_KEY` from env or `./.env`, `~/yt-explainers/.env`, `~/insta-reel/.env`, `~/stick-reel/.env`.
Never print, echo or copy the key.

## How a line becomes audio
`video.md` paragraph → split into sentences → `hinglish.to_tts` (Hindi → Devanagari, English + names → Latin,
numbers → Hindi words, lexicon substitutions) → Sarvam per sentence → silence/breath trim → joined with
pauses (. 0.24 s, ? 0.3 s) → whisper.cpp word timings → mapped back to the written words (for cues, pops, SRT).
Takes are cached by text + settings in `~/yt-explainers/.cache/vo/`: editing one line re-voices only that line;
the same sentence in another video is free.

## Pronunciation fixes, in order of preference
1. **Lexicon** (global, forever): `yt names` auditions every proper noun not yet in
   `K/assets/data/lexicon.json` in 3 spellings (as written · syllabified · Devanagari) inside a carrier sentence →
   `names/NAMES.md` + mp3s. User picks → `yt names pick Zepto=1 Kaivalya=3`. A custom spelling also works:
   `yt names pick "Nykaa=Nai-kaa"`.
2. **Per-video** override in front matter: `say: {Kaivalya: "Kai-val-ya", "F&O": "F and O"}`.
3. Rephrase the line (best for ambiguous Hindi words — check with `yt tts "line"`).
4. Re-roll a take that sounds off (prosody, glitch): `yt voice 12` (line ids from `yt plan`).
Quick listen to anything: `yt say "Nykaa ki kahani"` → prints the wav path.

## Known behaviour
- Latin brand names are said right ("Zepto"); Devanagari brand spellings are not ("ज़ेप्टो" → "zay-pto").
- hi-IN reads raw digits one by one, so the converter spells every number (years: दो हज़ार इक्कीस;
  1.5 → डेढ़, 2.5 → ढाई, 3.5 → साढ़े तीन; ₹ → रुपये; % → percent; x → गुना; Cr/L/K/Bn scales).
- Unknown Roman Hindi words go through Sarvam transliteration (cached in `~/yt-explainers/.cache/translit.json`).
  A wrong one: add it to the `HI` dict in `engine/hinglish.py` (shared by all videos).
- Each sentence is checked by whisper: if the heard word count is off by > 20 %, it's re-rolled automatically
  (up to 3 takes, best kept — you'll see `re-roll:` lines). Words whisper misses get interpolated timings.
