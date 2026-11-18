---
name: yt-explainer
description: Make long-form 16:9 Hinglish YouTube videos end to end in flat 2D animation — business explainers / case studies (8-15 min), spooky ghost / horror stories (4-8 min) and "what if" hypothetical stories (4-8 min). Research or story, script, Sarvam voiceover, illustrated 2D sets with an acting cast, music, SFX, captions, upload pack. Use when the user wants a YouTube explainer, case study, business breakdown, horror / bhoot / ghost story, "kya hoga agar" / what-if video, or to continue / fix one in ~/yt-explainers/videos/.
---

# YT videos (explainer · horror · whatif)

One folder per video: `~/yt-explainers/videos/<slug>/`. The whole video is ONE text file, `video.md`
(narration paragraphs + one `@layout {...}` line per scene). The engine does everything else: voice, timing,
animation, SFX, music, captions, render. Your job per video is research/story, the script and the scenes.

Engine: `~/.claude/skills/yt-explainer` (K). CLI: `yt` (symlinked in ~/.local/bin → K/bin/yt; run it inside
the video folder, e.g. `cd ~/yt-explainers/videos/<slug> && yt plan`).

## Genres (front matter `genre:`)
| genre | length | look | music | script guide |
|---|---|---|---|---|
| `explainer` (default) | 8-15 min | Blush & Navy, Khand, day sets, some data | groove | `references/script-craft.md` |
| `horror` | 4-8 min | night sets, fog, flicker, serif titles (Crimson Pro), typewriter place/time stamps, no charts | dread drone + stingers | `references/story-craft.md` |
| `whatif` | 4-8 min | dusk/night sets, deep indigo + amber | ambient pads | `references/story-craft.md` |

## Locked style (decided with the user; don't re-ask)
- Hinglish in **Roman script**. Explainers: Think School tone. Stories: campfire storyteller tone (story-craft.md).
- Voice for every genre: Sarvam `bulbul:v4-flash`, `aryaman_hi_ads`, pace 1.2 (`assets/brand.json`). Key from
  `SARVAM_API_KEY` (env / .env files) — never print it. The user rejected slow narrator voices.
- **Flat 2D only.** No 3D, no isometric (they looked bad and were removed). The default visual is an `@scene`:
  an illustrated set (street, city, highway, village, haveli, forest, corridor, room, station, office, store)
  with a code-drawn cast acting in it. No stick figures, no AI images, no host.
- **Few charts.** Charts/number cards ≤ 15 % of screen time in explainers, ≤ 10 % whatif, none in horror;
  never two in a row (`yt plan` enforces). Show things happening instead.
- 1920x1080 30 fps. Deliver MP4 + SRT + upload pack.

## Workflow (two user checkpoints: script, 1-min preview)
1. **Brief.** Topic given? Ask only what's open: angle (explainer) / premise, setting and ending (stories),
   whether the user supplies the script, target length, the next video to tease. Don't re-ask the locked style.
2. **Research** (explainer, and whatif facts): WebSearch, every number gets a source in `research.md`.
   Horror: the story can be original or a retelling of a known folk legend (say "kehte hain…", never claim a
   made-up event is real news; no real private people's names).
3. **Script** → `yt new <slug>`, set `genre:`, write narration into `video.md`: front matter + chapters
   (`# Heading`) + paragraphs, **no `@layout` lines yet**. Follow the genre's script guide (≈ 165 words/min).
4. **Checkpoint 1 — script approval.** `yt plan` gives est. length. Show path, hook, chapter outline, length,
   (sources). Same message: name auditions `yt names` → user picks → `yt names pick A=1 B=3`.
5. **Scenes**: add one `@layout {...}` above each paragraph (`references/video-format.md` — read it every time).
   A new shot every 6-12 s (split long paragraphs). Mostly `@scene` with different sets / times / cam / cast
   beats; `@ride` for journeys; `@cash` for money; `@statement` for punch lines; a chart only when the number
   is the point. Time things to words with `at:` cues.
6. `yt plan` → fix every error/warning (unknown cue words print the scene's spoken words).
7. `yt assets` (only if photos/logos are used) → check `qa/assets.jpg`.
8. `yt voice` → voices every line (cached). Bad take: `yt voice 12 14`.
9. `yt qa` → **open every qa/sheet-*.jpg AND the full-size frames in qa/snaps for anything doubtful**:
   overlapping cast, characters standing in props, cut-off text, empty or too-dark frames, a scare that lands
   on the wrong word, wrong logo. Fix, rerun `yt qa <times>` on what you changed. Don't show the user until clean.
10. **Checkpoint 2:** `yt preview 0 60` → send `renders/preview.mp4`. Apply notes.
11. `yt render` → `renders/<slug>.mp4` + `upload/`.
12. Hand over: video path, `upload/UPLOAD.md`, `description.txt`, `captions.srt`, `assets/CREDITS.md`.

## Commands
| | |
|---|---|
| `yt new <slug>` | scaffold folder + template video.md |
| `yt plan` | validate; scenes, times, spoken words per scene, story/chart share |
| `yt build` | plan + index.html |
| `yt names` / `yt names pick A=1 B=word` | pronunciation auditions / save to lexicon |
| `yt voice [ids]` | voiceover (cached) / re-roll ids |
| `yt assets [--redo x] [--sheet]` | fetch `img:` images, cutouts, credits, contact sheet |
| `yt qa [t ...]` | labelled snapshot sheets → qa/ (full frames in qa/snaps) |
| `yt audio` | music + SFX + voice → .yt/mix.wav |
| `yt preview [a] [b]` | render a slice with final audio |
| `yt render` | full video + upload pack |
| `yt pack` | rebuild upload/ only |

## Token-saving rules
- Don't read engine source to make a video. `references/video-format.md` has every layout + example.
- Read only the reference you need: script → `script-craft.md` / `story-craft.md`; scenes → `video-format.md`;
  voice → `voice.md`; something broke → `troubleshooting.md`.
- `yt plan`/`yt qa` output is the feedback loop; fix video.md, never the generated index.html.
- Engine bug or a missing set/preset/prop? Fix it in K (shared by all videos), note it in troubleshooting.md.

## Hard rules
- Numbers in narration as digits are fine (`₹4,700 crore`, `62%`, `2019`) — the converter speaks them.
- Explainer facts: never invent a number, quote or headline. Market-data videos end with "education, not advice".
- Stories are fiction or folklore: frame them that way; no gore, no real victims, no real private people.
- Images: only `wiki:/commons:/openverse:/logo:` sources or the user's files; never AI images.
- Ask the user whenever a creative decision isn't covered here.
