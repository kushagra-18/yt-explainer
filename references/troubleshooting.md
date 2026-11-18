# Troubleshooting

| Symptom | Fix |
|---|---|
| `yt plan`: cue "x" is not spoken | It prints the scene's spoken words — use one of them (prefix ≥ 4 letters OK, `word#2` for repeats). |
| `unknown param` warning | Typo or param not in the layout; see video-format.md. Generic: min trans src lower cam. |
| `bad object` error | The `@layout {...}` isn't valid JS: missing comma/quote/brace. Multi-line objects are fine. |
| Scene too long warning (> 16 s) | Split the paragraph and add a second layout. |
| Image missing (typographic chip or blank) | `yt assets`; check `qa/assets.jpg`; `--redo name` for the next result; or drop a file in `assets/img/`. |
| Wrong person/logo in an image | `yt assets --redo name` or change the query; `commons:File:Exact.jpg` pins one file. |
| No Wikipedia logo for a brand | `logo:brand.com` (Commons "<brand> logo" → site icon). Only a tiny favicon → user's file or no img (chip). |
| Wikimedia 429 | Retries with backoff automatically; if it persists wait a minute. |
| Openverse slow / timeout | Use `commons:` search instead. |
| Cutout bad (hair/edges) | Use a different photo (`--redo`), or drop `cut ` and use the taped photo frame. |
| Name mispronounced | references/voice.md (lexicon / say: / rephrase / re-roll). |
| Text overflows / overlaps in qa sheet | Shorter text (titles ≤ 40 chars, list items ≤ 45, labels ≤ 30), fewer items, or `size:` on statement. |
| Data scene feels empty | Add `note:` (sticky note), `src:`, `sub:`; or use stat/compare instead. |
| render failed | Shows the last 25 lines of the hyperframes log. Retry once; check disk (needs ≥ 4 GB). |
| Music too loud/quiet | `audio.py` music gain 0.2, ducks to 0.32 under voice. Per run: `YT_MUSIC=0 yt audio` = no music. |
| `unknown layout "@cutaway/@network/@chain/@iso"` | Isometric layouts were removed (2D only). The error names the replacement (`@scene`, `@map`, `@flow`, `@ride`). |
| `two data scenes in a row` / chart budget warning | Replace all but the key number with a story scene (`@scene`, `@ride`, `@cash`, `@photo`). |
| Character stands inside a prop (pump, bench, cot) | Move its `x`, or `depth: 0.3` to push it back; props are listed per set in video-format.md. |
| Frame too dark (night / torch / lightsout) | Fewer stacked darkening fx; `torch` with `r: 480`; `dark` with `level: 0.6`; or `time: "dusk"`. |
| A gradient / glow / headlight missing in a scene | Ids inside sets must be unique per scene (sets.js `uniq`); new set code must go through `build`/`vehicle`. |
| Scare lands early/late | `at:` must be the exact word; check with `yt plan` (spoken words) and `yt qa <t>` at that second. |
| Snapshot/render can't load fonts | `yt build` copies fonts into assets/fonts; run it once. |

## Paths
- Engine K: `~/.claude/skills/yt-explainer` (engine/, layouts/, runtime/, assets/, bin/yt)
- Videos: `~/yt-explainers/videos/<slug>/` (video.md, assets/img, .yt/ generated, qa/, renders/, upload/)
- Caches: `~/yt-explainers/.cache/` (vo takes, translit). Python venv: `~/yt-explainers/.venv`.
- Generated per video: `.yt/lines.json, voice.json, timeline.json, meta.json, sfx.json, mix.wav`, `index.html`.

## Engine notes (for fixing K)
- build.mjs: parse → timeline → cues → index.html. Layout JS = `engine/layouts/*.js` registered via
  `Engine.layout(name, fn(S, p, P))`; add params to `layouts/catalog.json` (validation + docs) and this repo's
  video-format.md when you add/change a layout.
- 2D sets: `engine/runtime/sets.js` (one lighting model: base colour → desaturate → time-of-day ambient →
  haze by depth; add a set as `SETS.name = function (D, o) {...}` returning layers [{d, svg}] + floor + light).
  Scene/ride/cash layouts: `engine/layouts/d-scene.js`. Cast rig + presets: `engine/runtime/people.js`.
  Genre themes (palette, fonts, transitions, music, grain, vignette): `assets/brand.json` → `genres`.
- Rendering: hyperframes@0.8.162 (pinned). Snapshots: `yt qa`. Segments are cached by content hash.
