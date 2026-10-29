# Script craft — research, structure, Hinglish

## Length budget
Voice runs ≈ 165 words/min (aryaman at 1.2). 8 min ≈ 1,300 words · 10 min ≈ 1,650 · 12 min ≈ 2,000 · 15 min ≈ 2,450.
Auto scenes add ~25 s (title, chapter cards, 20 s end screen). `yt plan` prints the estimate.

## Research (before writing a word)
- Sources by strength: company filings / annual reports / RHP-DRHP (IPO docs are gold) → regulator data (SEBI,
  RBI, NSE, MCA via Tofler/Entrackr/Inc42 coverage) → founder interviews/podcasts → reputable news
  (ET, Mint, Business Standard, Moneycontrol, The Ken / Morning Context for angles) → everything else.
- Write `research.md`: one line per fact → number, period (FY24 = Apr 23–Mar 24), unit, source URL.
  Conflicting numbers: pick the primary source, mention "reports ke hisaab se" in narration.
- Find the **non-obvious insight** (the "aha" the viewer will repeat to a friend): unit economics, a hidden
  revenue line, a regulatory edge, a distribution trick, a counter-intuitive decision. The video is built
  around 1 main insight + 2-3 supporting ones. No insight yet → keep researching or ask the user for the angle.
- Collect real headlines (source + date + exact text) and real quotes for headlines/quote scenes.

## Structure (retention, decided with the user)
```
# Hook                    0-30 s
  0-3 s   shock line: the most surprising number / contradiction. No greeting, no "aaj ki video mein".
  ≤10 s   open loop: the question the whole video answers ("toh paisa aata kahan se hai?")
  10-30 s stakes (why it matters to the viewer) + roadmap (what we'll cover, 1 line)
  [auto title sting ≤ 2 s]
# Chapter 1..N            3-6 chapters, each 1.5-3 min
  every 20-40 s           pattern interrupt (new visual type, a story beat, a question to the viewer)
  25 / 50 / 75 %          "Lekin yahan ek catch hai…" turn: a complication that resets curiosity
  ~40 %                   first big payoff (answer part of the hook) → [auto subscribe nudge after it]
  chapter end             open loop into the next: "…aur yahin se kahani palat gayi."
# Last chapter            the answer + the insight in one line + what it means for the viewer
  last 20 s               [auto end screen] tease `next:` video in the final narration line
```
Chapter titles are short and intriguing (2-5 words), not labels: "Zero ads ka jugaad", not "Marketing strategy".

## Think School-ish tone
- Story first: a person, a moment, a decision ("2010 mein Nithin Kamath ek trader the…"), then the numbers.
- Talk to one viewer: "aap", "sochiye", "ab aap kahenge…". Questions they'd ask → ask them first, then answer.
- Confident and specific: numbers, dates, names. No hedging fluff, no moralising, no "dosto".
- Analogies from daily Indian life (kirana, chai stall, Ola auto, EMI, shaadi budget) for every hard concept.
- A little wit, never cringe; one-line punches at chapter ends.
- Explain jargon the first time in 1 line (GMV, take rate, CAC, float, EBITDA).
- End with a takeaway the viewer can use or repeat.

## Writing Hinglish for the voice (the converter's rules)
Write Roman Hinglish the way people text. The engine sends Hindi words to Sarvam in Devanagari and keeps
English words and every name in Latin (that's what makes "Zepto" sound right). Check any line: `yt tts "line"`.
- **Numbers as digits are good**: `₹4,700 crore`, `₹41,000 Cr`, `62%`, `2.5x`, `1.6 Cr`, `$5 bn`, `FY24`, years.
  They become Hindi number words (Indian system, डेढ़/ढाई/साढ़े). Keep `₹` / `$` / `%` attached.
- Use common spellings: hai, hain, nahi, yeh, woh, kyunki, lekin, toh, mein, sirf, bahut, zyada, kaise, kyun.
  Odd spellings fall back to transliteration and may sound off.
- "do" is read as दो (two / give). For English "do" write "karo". "the" before an English noun stays English;
  otherwise it's थे. Short ambiguous words (is, in, us, to, main, me, par, use…) are resolved by neighbours —
  if `yt tts` shows the wrong one, rephrase.
- English words stay English: market, profit, growth, customer, delivery, startup, funding, valuation.
- Sentences ≤ 20 words; one idea each. Commas = small pauses, full stops = breaths. `?` lifts the voice.
- Names: anything not in the lexicon gets auditioned (`yt names`) at the script checkpoint.
  Acronyms: write as said — `SEBI` (word), `F&O` → write "F and O", `IPO`, `CEO` (spelled) are fine.
- `*word*` marks a keyword pop on screen — 1-2 per scene max, on the punch word.

## Script checkpoint message (to the user)
Path to video.md · hook (first 3 lines verbatim) · chapter list with one-line beats · est. length ·
the main insight · sources (top 5) · name auditions folder. Ask: approve / change angle / edit lines.
