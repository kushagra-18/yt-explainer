# yt-explainer: Hinglish YouTube Video Maker for Claude Code

**Turn a topic into a finished, upload-ready YouTube video, with one sentence in Claude Code.**
yt-explainer is a [Claude Code](https://claude.com/claude-code) skill that researches, writes, voices, animates
and renders long-form **Hinglish** videos in flat 2D animation. You get an MP4, subtitles and a full upload pack.
There is no editing software, no stock footage and no on-camera host.

> "Make a YouTube explainer on how Zepto does 10-minute delivery."

That one prompt is enough. Claude follows the skill, checks in with you twice (script and preview), then renders.

## What you can make

| Genre | Length | Look | Sound |
|---|---|---|---|
| **Business explainer / case study** | 8 to 15 min | Day sets, Blush & Navy palette, a few data scenes | Upbeat groove |
| **Horror / bhoot / ghost story** | 4 to 8 min | Night sets, fog, flicker, typewriter place and time stamps | Dread drone and stingers |
| **"Kya hoga agar" / what-if story** | 4 to 8 min | Dusk and night sets, deep indigo and amber | Ambient pads |

## How it works

1. **Brief.** You give a topic. Claude asks only what is still open: angle, ending, target length.
2. **Research.** Every number gets a source in `research.md`. Horror stories are original or framed as folk legend.
3. **Script.** About 165 words a minute, written in Roman-script Hinglish. **You approve it.**
4. **Scenes.** Each paragraph becomes illustrated 2D sets (street, city, highway, village, haveli, forest, station,
   office, store and more) with a code-drawn cast that acts, plus cash, ride and statement scenes.
5. **Voiceover.** [Sarvam](https://www.sarvam.ai) `bulbul:v4-flash` reads every line, with a pronunciation lexicon
   for Hindi and English names.
6. **Quality check.** Contact sheets and full-size frames are inspected before you see anything.
7. **Preview.** A 60-second render for your notes. **You approve it.**
8. **Render.** 1920x1080, 30 fps, with music, sound effects and captions mixed in.

**Output:** `renders/<slug>.mp4`, `captions.srt`, `description.txt`, chapters and `upload/UPLOAD.md`.

## Install (macOS, one command)

```bash
gh api repos/kushagra-18/yt-explainer/contents/setup.sh -H "Accept: application/vnd.github.raw" | bash
```

Or clone it yourself:

```bash
git clone https://github.com/kushagra-18/yt-explainer ~/.claude/skills/yt-explainer
bash ~/.claude/skills/yt-explainer/setup.sh
```

The setup script is safe to re-run, and re-running it is also how you update. It will:

- clone or update the skill in `~/.claude/skills/yt-explainer`
- install **ffmpeg, whisper-cpp, Node, uv and Google Chrome** through Homebrew if they are missing
- create the Python environment in `~/yt-explainers/.venv`
- download the whisper `small` model once (about 470 MB) for word-level caption timing
- link the `yt` command into `~/.local/bin`
- ask for your **Sarvam API key** once and save it to `~/yt-explainers/.env` (never committed)

**Requirements:** macOS, [Homebrew](https://brew.sh), a [Sarvam AI](https://www.sarvam.ai) API key, and Claude Code.
If the repo is private, run `gh auth login` first.

## Use it

Open Claude Code and ask in plain language:

- *"Make a YouTube explainer on how Swiggy Instamart makes money."*
- *"Write a horror story set in an old haveli in Rajasthan."*
- *"Kya hoga agar UPI ek din ke liye band ho jaye? Make it a what-if video."*
- *"Continue the Zepto video."*

Videos live in `~/yt-explainers/videos/<slug>/`. The whole video is one text file, `video.md`: narration
paragraphs plus one `@layout {...}` line per scene.

## The `yt` command

Run it inside a video folder, except `yt new`.

| Command | What it does |
|---|---|
| `yt new <slug> [genre]` | Scaffold a video (`explainer`, `horror` or `whatif`) |
| `yt plan` | Validate `video.md`, estimate length, list scenes and cue words |
| `yt names` | Audition how the voice says proper nouns, then pick the best take |
| `yt voice [ids]` | Generate the Sarvam voiceover (cached); re-roll single lines |
| `yt assets` | Fetch logos and photos listed in the front matter |
| `yt qa` | Snapshot contact sheets for visual review |
| `yt preview [from] [to]` | Render a short slice with audio |
| `yt audio` | Mix voice, music and sound effects |
| `yt render` | Full render, cached per segment |
| `yt pack` | SRT captions, chapters and the YouTube description |

Run `yt help` for the full list.

## What's inside

```
SKILL.md        the workflow Claude follows
references/     script craft, story craft, video.md format, voice, troubleshooting
engine/         build, layouts, runtime, audio, voice and render
assets/         fonts, Phosphor icons, India map data, pronunciation lexicon, brand.json
examples/       starter templates for each genre
```

Rendering is powered by HyperFrames (HTML to video). Voice is by
Sarvam AI. Word timings come from whisper.cpp.

## FAQ

**Does it work in English or Hindi script?** The skill is built for Hinglish in Roman script, which is what most
Indian YouTube audiences read and search. The voice splits Devanagari and Latin words automatically.

**Do I need to edit video myself?** No. You approve the script and a 60-second preview. Everything else is automatic.

**How long does a render take?** Rendering is cached per segment, so fixing one scene re-renders only that part.

**Does it use AI-generated images or stock footage?** No. All sets and characters are drawn in code, so there are
no licensing surprises.

**Is it Windows or Linux compatible?** Not yet. Setup uses Homebrew and macOS Google Chrome.

**Where is my API key stored?** In `~/yt-explainers/.env`, mode 600, and it is git-ignored.

## Credits and licenses

Fonts: Khand, Palanquin, Crimson Pro (SIL OFL) and Special Elite (Apache 2.0). Icons: Phosphor (MIT).
License texts are in `assets/fonts/`.

---

**Keywords:** YouTube video generator, Hinglish video maker, AI explainer video, faceless YouTube channel,
2D animation automation, Claude Code skill, Sarvam AI voiceover, horror story video, business case study video,
text to video India.
