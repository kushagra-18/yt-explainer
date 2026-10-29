---
name: yt-explainer
description: Make long-form (8-15 min, 16:9) Hinglish YouTube business explainer / case-study videos end to end — research, Think-School-style script, Sarvam voiceover, editorial-collage + data-motion visuals, music, captions, upload pack. Use when the user wants a YouTube explainer, case study, "business breakdown" video, or to continue / fix one in ~/yt-explainers/videos/.
---

# YT explainer

One folder per video: `~/yt-explainers/videos/<slug>/`. The whole video is ONE text file, `video.md`
(narration paragraphs + one `@layout {...}` line per scene). The engine does everything else: voice, timing,
animation, SFX, music, captions, render. Your job per video is research, the script and picking layouts.

Engine: `~/.claude/skills/yt-explainer` (K). CLI: `yt` (symlinked in ~/.local/bin → K/bin/yt; run it inside
the video folder, e.g. `cd ~/yt-explainers/videos/<slug> && yt plan`).

## Locked style (decided with the user; don't re-ask)
- Hinglish, written in **Roman script**; tone like Think School (curious, story-first, confident, a bit witty, never preachy).
- Voice: Sarvam `bulbul:v4-flash`, `aryaman_hi_ads`, pace 1.2 (in `assets/brand.json`). Key from `SARVAM_API_KEY`
  (env / .env files) — never print it.
- Look: Blush & Navy collage + data motion, Khand/Palanquin, duotone photos, paper-cut characters, no host, no
  stick figures, no AI images. `accent:` in front matter = the featured brand's colour.
- 1920x1080 30 fps, 8-15 min. Deliver MP4 + SRT + upload pack.

## Workflow (two user checkpoints: script, 1-min preview)
1. **Brief.** Topic given? Ask only what's genuinely open: angle/thesis, whether the user supplies the script,
   target length, the next video to tease. Don't re-ask the locked style.
2. **Research** (skip if the user gives a script): WebSearch for filings (Tofler/Entrackr/RoC numbers), annual
   reports, founder interviews, news. Every number gets a source; prefer primary. Note conflicting numbers.
   Keep it in `research.md` (facts + URL per fact).
3. **Script** → `yt new <slug>`, then write the narration straight into its `video.md`: front matter
   (title, titles, sources…) + chapters (`# Heading`) + narration paragraphs, **no `@layout` lines yet**
   (the engine tolerates that). Follow `references/script-craft.md` (retention structure, Hinglish rules,
   ≈ 165 words/min). User-supplied script: paste it in the same shape, fix only Hinglish spelling issues
   the converter needs (ask before changing wording).
4. **Checkpoint 1 — script approval.** `yt plan` gives est. length. Show the user the file path, hook,
   chapter outline, length, sources. In the same message send name auditions: `yt names` → `names/NAMES.md`
   + mp3s; they reply e.g. `Zepto 1, Kaivalya 3` → `yt names pick Zepto=1 Kaivalya=3` (global lexicon, forever).
5. **Layouts**: add one `@layout {...}` line above each paragraph (`references/video-format.md` — read it
   every time you write layouts). Rules: a new visual every 6-12 s of speech (split long paragraphs);
   vary layouts; data appears exactly when it's said (`at:` cues); a pattern interrupt every 20-40 s
   (people scene, map, headlines, photo, statement on ink). Add the `img:` list for photos/logos.
6. `yt plan` → fix every error/warning (unknown cue words print the scene's spoken words).
7. `yt assets` → look at `qa/assets.jpg` (right person? right logo? good crop?). `yt assets --redo <name>`
   for the next search result, or drop the user's own file at `assets/img/<name>.jpg|png` (always wins).
8. `yt voice` → voices every line (cached; edited lines only re-voice). Listen-check names you weren't sure of.
   Bad take: `yt voice 12 14` re-rolls lines 12 and 14 (ids from `yt plan`).
9. `yt qa` → **look at every qa/sheet-*.jpg** (overlaps, cut-off text, empty scenes, wrong logos). Fix, repeat.
   `yt qa 31.5 47` snapshots exact seconds.
10. **Checkpoint 2:** `yt preview 0 60` → send `renders/preview.mp4`. Apply notes.
11. `yt render` → `renders/<slug>.mp4` (segments cached: re-render only re-does changed chapters) + `upload/`.
12. Hand over: video path, `upload/UPLOAD.md` (titles, tags), `description.txt` (chapters + sources),
    `captions.srt`, `assets/CREDITS.md` (attributions for images that need them → add to description).

## Commands
| | |
|---|---|
| `yt new <slug>` | scaffold folder + template video.md |
| `yt plan` | validate; scenes, times, spoken words per scene |
| `yt build` | plan + index.html |
| `yt names` / `yt names pick A=1 B=word` | pronunciation auditions / save to lexicon (value can be any spelling) |
| `yt voice [ids]` | voiceover (cached) / re-roll ids |
| `yt assets [--redo x] [--sheet]` | fetch `img:` images, cutouts, credits, contact sheet |
| `yt qa [t ...]` | labelled snapshot sheets → qa/ |
| `yt audio` | music + SFX + voice → .yt/mix.wav (render does it anyway) |
| `yt preview [a] [b]` | render a slice with final audio (≈1.3x realtime) |
| `yt render` | full video + upload pack |
| `yt pack` | rebuild upload/ only |

## Token-saving rules
- Don't read engine source to make a video. `references/video-format.md` has every layout + example.
- Read only the reference you need: script → `script-craft.md`; layouts → `video-format.md`;
  voice/pronunciation → `voice.md`; something broke → `troubleshooting.md`.
- `yt plan`/`yt qa` output is the feedback loop; fix video.md, never the generated index.html.
- Engine bug or a missing layout? Fix it in K (it's shared by all videos), note it in troubleshooting.md.

## Hard rules
- Numbers in narration as digits are fine (`₹4,700 crore`, `62%`, `2019`, `1.6 Cr`) — the converter speaks them.
- Facts: never invent a number, quote or headline. Headlines/quotes must be real (keep URL in research.md),
  paraphrased quotes are labelled as such. Market-data videos end with "education, not advice" (pack adds it).
- Images: only `wiki:/commons:/openverse:/logo:` sources or the user's files; never AI images.
- Ask the user whenever a creative decision isn't covered here — they asked to be asked, not assumed.
