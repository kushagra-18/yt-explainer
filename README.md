# yt-explainer

Claude Code skill: long-form Hinglish YouTube business explainers / case studies, end to end —
research → script → Sarvam voiceover → collage + data-motion visuals → music/SFX → MP4 + SRT + upload pack.

## Install / update (one command, macOS)
```bash
gh api repos/kushagra-18/yt-explainer/contents/setup.sh -H "Accept: application/vnd.github.raw" | bash
```
Needs Homebrew and a GitHub login with access to this repo (`gh auth login`). It clones the skill to
`~/.claude/skills/yt-explainer` (or pulls if already there), installs ffmpeg / whisper-cpp / node / uv / Chrome
if missing, makes the Python env `~/yt-explainers/.venv`, downloads the whisper model, links `yt` into
`~/.local/bin`, and asks for your Sarvam API key once (saved to `~/yt-explainers/.env`, never committed).

## Use
In Claude Code: *"make a YouTube explainer on how Zepto does 10-minute delivery"*. Claude follows `SKILL.md`.
Videos live in `~/yt-explainers/videos/<slug>/`. CLI reference: `yt help`.

## Layout
`SKILL.md` workflow · `references/` script craft, video.md format, voice, troubleshooting · `engine/` build,
voice, audio, assets, render · `assets/` fonts (Khand, Palanquin — OFL), Phosphor icons (MIT), India map data,
pronunciation lexicon · `examples/template.md` new-video template.
