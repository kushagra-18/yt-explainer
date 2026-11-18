# Story craft — horror (bhoot kahani) and what-if videos

Same engine, same voice (aryaman 1.2), 4-8 min (≈ 650-1,300 words). `genre: horror` or `genre: whatif`.
Hinglish rules for the voice are in `script-craft.md` ("Writing Hinglish for the voice") — they apply here too.

## Horror structure
```
# Hook                0-25 s   in medias res: the scariest moment first, cut off mid-sentence.
                               "Raat ke 2:14 baje… highway pe ek aurat khadi thi." Then: "Yeh kahani shuru
                               hoti hai teen din pehle." (auto title sting after the hook)
# Chapter 1           setup    who, where, why they're there. Normal life. One odd detail planted.
# Chapter 2           unease   small wrong things, escalating (a sound, a light, a door). Each scene one beat.
# Chapter 3           the night the worst happens; the hook moment returns, now we see the rest.
# Last chapter        aftermath + the twist / unanswered question. Last line lands, then silence.
                      Tease the next story in one line.
```
- **Specific, sensory, local**: a real-sounding place type (NH-48 ka dhaba, Shimla ka hostel, purani haveli,
  sarkari hospital ka teesra floor), a time ("raat ke 2:14"), a sound ("payal ki chhan chhan"), a smell.
- **Short sentences when it gets scary.** 4-8 words. Full stops are breaths; the voice slows naturally.
- Let the viewer imagine: show less than you describe. The ghost is a shape at the edge, a figure behind.
- 1-2 real scares per video, earned by a slow build. Never a scare in the first 10 s.
- Folklore is fine (chudail with ulte pair, pishach, the woman asking for a lift); frame it as "kehte hain…".
  No gore, no real victims, no real private people, no "this really happened" claims for invented stories.
- End on an image, not a moral.

### Scene language for horror (video-format.md has the params)
- Establish every location wide first (`@scene` with the set, no cast, `cam: "creep"`, `fx: ["fog"]`), with a
  `stamp: {place, time}` the first time we arrive somewhere.
- Then medium shots with the cast (`depth`, `focus`), one beat per scene.
- Dread tools: `flicker`, `lightsout`, `torch` (only a circle is lit), `fog`, `rain` + `lightning` on a cue word,
  a `shadow` figure at `depth: 0.5` appearing (`at:`) behind someone, `ghost-f` fading in.
- The scare: `fx: [{kind: "scare", at: "<word>"}]` on the exact word + the figure `appear`s on the same cue.
- Breathing room: a `@statement {bg: "black"}` line, or `@scene {set: "black"}` with just a sound.
- No charts. Photos only if the story is about a real, well-known place (Bhangarh fort, Commons photo).

## What-if structure ("Kya hoga agar…")
```
# Hook        the premise as a scene ("Sochiye, kal subah…") + the stakes in one line.
# Din 1 / Hafta 1 / Saal 1 …   chapters move forward in time; each chapter = what changes for ONE
              ordinary person (the cast) + one bigger-picture consequence.
# The turn    the non-obvious consequence (the "aha"), backed by one real number (@stat, with src).
# Ending      what it tells us about the real world today + tease the next question.
```
- Grounded speculation: every jump is "kyunki…" + a real fact (source in research.md). Mark guesses as guesses.
- Show it on people: the auto driver, the sabziwala, the student — reuse the same cast across chapters.
- Max 2-3 data scenes in the whole video.

## Script checkpoint message (stories)
Path to video.md · the hook lines verbatim · chapter list with one-line beats · est. length · where the 1-2
scares land (horror) or the main "aha" (whatif) · name auditions. Ask: approve / change / edit lines.
