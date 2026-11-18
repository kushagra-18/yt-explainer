# video.md format + layout catalog

## File shape
```
---
genre: explainer             # explainer | horror | whatif — palette, fonts, transitions, music, defaults
title: "Zerodha ne *zero ads* se ₹4,700 Cr kaise kamaye?"   # on the title sting; *x* = accent
titles: ["Zerodha: zero ads, ₹4,700 Cr profit", "..."]      # upload title options (<= 60 chars)
brand: Zerodha
accent: "#387ED1"            # featured brand colour (replaces the coral accent everywhere)
next: "Zepto ka 10 minute ka khel"   # teased on the end screen
description: "One or two lines for the YouTube description."
sources:
  - "Zerodha FY24 financials (Entrackr) https://entrackr.com/..."
tags: [zerodha, nithin kamath, discount broker, case study]
hashtags: [zerodha, businesscasestudy, hindi]
say: {Kaivalya: "Kai-val-ya"}  # per-video pronunciation overrides (global ones live in the lexicon)
img:                         # images to fetch (yt assets); name -> source
  nithin: cut wiki:Nithin Kamath        # "cut " = also make a background-removed cutout
  zerodha-logo: wiki:Zerodha             # infobox logo / page image
  zepto-logo: logo:zepto.com             # Commons "<brand> logo", else 256px site icon
  cred-logo: logo:CRED cred.club         # brand first when the domain isn't the name
  street: commons:Mumbai street market   # Commons search ; commons:File:Exact name.jpg for one file
  rider: openverse:delivery rider india  # Openverse (CC) search
  chart: https://example.com/x.png
# optional: channel: "Name" · subscribe: false · endscreen: false · title_card: false
---

# Hook                       <- first chapter named Hook: no chapter card; title sting plays after it

@hook {big: "₹4,700 Cr", ...}
Narration paragraph = what the voice says during this scene.

@statement {text: "..."}
Next scene...
A paragraph with NO @line above it continues the previous scene (same visual, more narration).

# Discount broking ka janam  <- chapter card "01 / Discount broking ka janam"
```
- `<!-- comments -->` lines are ignored. `*word*` in narration = keyword pop on screen at that word.
- Params are a JS object (unquoted keys OK; may span several lines). Text params accept `*accent*` and `<small>`.
- Images by name (`img: "nithin"`) → `assets/img/nithin.cut.png` if it exists, else nithin.jpg/png/webp/svg.
  User files dropped in assets/img win over fetched ones.
- Icons: Phosphor fill names (`assets/icons/NAMES.txt`, 1512): `users-three`, `currency-inr`, `rocket-launch`,
  `chart-line-up`, `storefront`, `truck`, `package`, `bank`, `handshake`, `trophy`, `warning`, `lightning`…
  Check a name with `grep -x name K/assets/icons/NAMES.txt`.

## Cues (`at:`) — timing visuals to the voice
Any `at:` (at any depth) = the moment a spoken word is said, in this scene. `at: "profit"` (first time
said), `"profit#2"` (second time), `"profit+0.4"` / `"profit-0.2"` (offset s), a number = seconds from
scene start. Prefixes of ≥4 letters match (`"custom"` hits "customers"). Arrays allowed where noted.
Unknown word → `yt plan` prints the scene's spoken words. Without `at`, items stagger automatically.

## Params every layout accepts
`min: 6` minimum scene seconds · `trans: cut|push|whip|zoom|fade|dip|wipe|drop|paper` transition INTO this scene
(the genre picks a default rotation: explainer mostly cut/push/whip, horror fade/dip/cut, whatif cut/fade/zoom) ·
`cam: in|out|left|right|up|still|creep` slow camera · `src: "Tofler, FY24"` source tag (every data scene) ·
`lower: {name, role, at}` lower third · `stamp: {place, time, date, at, hold}` typewriter place/time card
(stories: "NH-48, Rajasthan / Raat 2:14 baje") · `pops: false` no keyword pops in this scene.

## Pacing rules (user decisions, Nov 2026)
- **Show, don't chart.** `yt plan` reports the share of screen time per kind. Charts/number cards
  (bars hbars line donut units stat compare) are capped: explainer ≤ 15 %, whatif ≤ 10 %, horror 0.
  Two data scenes in a row is an error. Use a chart only when the number itself is the point; everything
  that *happens* (a delivery, a store working, money burning, a person deciding, a night on the highway)
  is a `@scene` / `@ride` / `@cash`.
- Story scenes (`@scene`, `@ride`, `@cash`) should carry most of the video: explainer ≥ 45 %, stories ≥ 70 %.
- 6-12 s per scene (≈ 15-30 words); story scenes may run 10-16 s. Longer → split the paragraph.
- Never the same layout twice in a row (except @scene → @scene with a different set/shot).
- Chapter openers: a wide establishing @scene (or statement); closers: an open-loop line on a statement.
- Brand colours for brands (`color:` in data rows), accent for the brand the video is about.
- No 3D / isometric anything. Everything is flat 2D.

---

## Text layouts

**hook** — cold open (first scene). Photo cutout + headline + giant counting number + news clipping.
`big` number · `label` under it · `title` headline · `photo` cutout name · `extra` a second photo behind ·
`chip` small label · `clip: {source, text}` news clipping · `side: "left"|"right"` · `at` number appears.
```
@hook {photo: "nithin", extra: "street", chip: "Case Study · Zerodha", title: "Zero ads. Zero *fees*.", big: "₹4,700 Cr", label: "profit in FY24. Toh paisa aata kahan se hai?", at: "profit", clip: {source: "Business Standard", text: "Zerodha's profit jumps 62% in FY24"}}
```

**statement** — one big idea in type. `text: "line one | line two"` (| = new line, revealed one by one),
`sub`, `icon`, `img` (cutout beside), `chip`, `bg: paper|ink|accent|yellow`, `size` (px), `at`
(array = when each line appears). Ink/accent bg = strongest pattern interrupt; use for questions & twists.
```
@statement {text: "Lekin yeh *possible* kaise hai? | Aaj hum yahi samjhenge.", chip: "Sawaal", bg: "ink", at: ["possible", "samjhenge"]}
```

**quote** — `text`, `who`, `role`, `img` (cutout). Only real quotes (or say "paraphrased" in role).
```
@quote {text: "Hum *kabhi* ads pe paisa nahi lagayenge.", who: "Nithin Kamath", role: "Founder, Zerodha", img: "nithin"}
```

**list** — 2-5 points. `title`, `sub`, `items: ["text", {text, icon, at}]`, `size`.
```
@list {title: "Teen sabak", items: [{text: "Product hi *marketing* hai", icon: "megaphone", at: "marketing"}, {text: "Profit pehle", icon: "chart-line-up", at: "profit"}]}
```

## Data layouts (always add `src:`)

**stat** — 1-3 numbers counting up. `items: [{value: "₹41,000 Cr", label, icon, color, at}]` or `value`+`label`;
`title`, `sub`, `note`. Values: ₹/$ prefix, Cr/L/K/Bn/%/x suffix all count correctly.
```
@stat {items: [{value: "1.6 Cr", label: "active customers", icon: "users-three", at: "crore"}, {value: "₹0", label: "delivery brokerage", icon: "hand-coins", at: "zero"}], src: "Zerodha, 2024"}
```

**bars** — vertical bars, growth over years. `data: {FY21: 1122}` or `[{label, value, at, color}]`, `unit`
("Cr"; a space is added, except for % and x), `prefix` ("₹"), `highlight: "last"|"max"|label|false`, `note: "text"` or `{text, at}` (sticky note),
`circle` (label to circle), `max`.
```
@bars {title: "Net profit, *₹ crore*", data: {FY19: 347, FY20: 442, FY21: 1122, FY22: 2094, FY23: 2907, FY24: 4700}, note: {text: "+62% <small>sirf ek saal mein</small>", at: "saal"}, src: "Zerodha filings via Entrackr"}
```

**hbars** — ranking. `data: [{label, value, color, img}]` (img = logo name), `unit`, `prefix`, `highlight`, `note`.
```
@hbars {title: "Active clients, *lakh*", data: [{label: "Groww", value: 130, color: "#5367FF"}, {label: "Zerodha", value: 79, color: "#387ED1"}], highlight: "Zerodha", src: "NSE, Sep 2024"}
```

**line** — trend over time. `data: {2019: 10, 2020: 14}` or `series: {Zepto: {...}, Blinkit: {...}}`,
`events: [{x: "2020", text, at}]` (callouts on the line), `unit`, `prefix`, `highlight` (series name), `note`.
```
@line {title: "Nifty 50", data: {2019: 12000, 2020: 13900, 2021: 17300, 2022: 18100}, events: [{x: "2020", text: "Covid crash, phir retail boom", at: "covid"}], unit: "pts"}
```

**donut** — shares of a whole. `data: {Blinkit: 46, Zepto: 29}`, `unit: "%"`, `highlight`, `center` text.
```
@donut {title: "Quick commerce market share", data: {Blinkit: 46, Zepto: 29, Instamart: 25}, unit: "%", highlight: "Zepto", src: "JM Financial, 2024"}
```

**units** — "x out of y" icon grid. `value`, `total` (≤ 100), `icon`, `label`, `big` (override number), `cols`, `at`.
```
@units {title: "Har 100 traders mein se", value: 89, total: 100, icon: "user", label: "F&O mein *paisa gawate hain*", src: "SEBI study, 2023"}
```

**compare** — A vs B table. `a`/`b: {name, img, color}`, `rows: [[label, aVal, bVal, "a"|"b" winner], {label, a, b, win, at}]`.
```
@compare {title: "Discount vs full-service", a: {name: "Zerodha", img: "zerodha-logo", color: "#387ED1"}, b: {name: "Bank broker", color: "#13293D"}, rows: [["Delivery fee", "₹0", "0.5%", "a"], ["Advice", "Nahi", "Haan", "b"]]}
```

## World layouts

**map** — India (official boundaries). `states: ["Maharashtra"]` (highlighted), `cities: ["Mumbai",
{name, label, value, at, lat, lon}]` (102 known cities; others need lat/lon), `routes: [["Mumbai","Delhi"]]`
(animated arcs), `count: {value, label, at}`.
```
@map {title: "Customers *kahan* hain", states: ["Maharashtra", "Karnataka"], cities: ["Mumbai", {name: "Bengaluru", label: "HQ", at: "bengaluru"}], routes: [["Bengaluru", "Delhi"]], count: {value: "1.6 Cr", label: "customers"}}
```

**timeline** — `items: [{year, text, icon, img, at, hi: true}]`; > 4 items pans along; `highlight`.
```
@timeline {title: "Zerodha ka safar", items: [{year: "2010", text: "Bengaluru mein shuruaat", icon: "rocket-launch", at: "das"}, {year: "2019", text: "India ka number 1 broker", icon: "trophy", hi: true, at: "2019"}]}
```

**photo** — big taped photo, or `frame: "full"` full-bleed duotone. `img`, `caption`, `notes: [{text, x, y
(0-100 %), circle: true, at}]` handwritten callouts, `extra` (second photo), `kb` (Ken Burns), `color` (duotone).
```
@photo {img: "street", caption: "Retail India", notes: [{text: "Naye investors", x: 40, y: 45, circle: true, at: "investors"}]}
```

**headlines** — real news clippings (max 4): `items: [{source, date, text, at}]`. Real headlines only.
```
@headlines {items: [{source: "Economic Times", date: "Jun 2024", text: "Zerodha posts ₹4,700 crore *profit*", at: "record"}, {source: "Mint", date: "Oct 2024", text: "SEBI tightens F&O rules", at: "sebi"}]}
```

**logos** — logo wall. `items: ["Swiggy", {name, img, color, sub, cross: true|"word", at}]`, `highlight: [names]`,
`cols`. Without img a typographic chip in the brand colour is drawn (fine for brands with no logo file).
```
@logos {title: "Competitors", items: [{name: "Groww", img: "groww-logo"}, {name: "Upstox", color: "#6A1B9A"}, {name: "5paisa", color: "#C62828", cross: true}], highlight: ["Groww"]}
```

**flow** — how money/goods move, 2-5 steps. `steps: [{label, icon, img, sub, edge: "text on arrow after me", at}]`,
`money` (token label travelling the chain), `token` (icon), `zigzag: true`.
```
@flow {title: "Paisa kaise ghoomta hai", steps: [{label: "Trader", icon: "user"}, {label: "Zerodha", icon: "buildings", edge: "₹20"}, {label: "Exchange", icon: "bank"}], money: "₹20"}
```

**phone** — app mockup. `screen` (screenshot image name) or `cards: [{title, text, icon, color, at}]`
(notifications), `points: ["..."]` beside it, `side`, `screenBg`.
```
@phone {title: "Kite app", cards: [{title: "Kite", text: "Order executed: 10 shares", icon: "check-circle", color: "#387ED1"}], points: ["Simple design", "Zero ads"]}
```

## Story scenes (flat 2D sets — the default way to SHOW anything)
Illustrated sets drawn in layers with real depth (far layers fade into the time-of-day haze), lit windows,
street lamps with light cones, swaying trees, a ceiling fan that spins, tube lights that flicker. The camera
moves through the layers (parallax). A cast of code-drawn characters acts on top.

**scene** — `set` + `time` + `cast` + `do` + `fx` + `vehicles` + `cam` (+ explainer extras `title`, `labels`, `count`, `cards`).
- `set`: street (shops, wires, lamps) · city (skyline, road) · highway (hills, poles, dhaba, milestones) ·
  village (huts, peepal tree, charpai, hand pump) · haveli (old mansion, arched windows, gate, dead tree) ·
  forest (layered trunks, path) · corridor (one-point hospital/hostel corridor, tube lights, doors) ·
  room (bed, window, fan, cupboard, door ajar) · station (platform, roof, board, bench, track) ·
  office · store (shelves, counter, signboard) · plain · black.
- `time`: day | dusk | night (genre default: explainer day, whatif dusk, horror night). Night = dark,
  desaturated, windows/lamps glow; characters are lit to match automatically.
- `sign: "Bhangarh"` text on the set's board (station, store, dhaba) · `opts: {glowWindow: 9}` (haveli: which
  window glows), `{openDoor: 3, deadLight: 2}` (corridor), `{dhaba: false, sign}` (highway), `{tree: "banyan"}` (village).
- `cam`: in | out | creep (slow push, horror default) | left | right | still | `{pan: [140, -140], zoom: [1, 1.1]}`;
  `focus: 1300` = push in toward that screen x.
- `cast: [{id, preset, x (0-1920), depth (0 front … 1 far back), pose, face, flip, prop, tone, enter, at, scale, tag, look}]`
  - presets: founder founder-f customer customer-m rider investor employee employee-f shopkeeper student ceo ceo-f
    oldman auntie farmer · story: watchman trucker nurse doctor baba dadi kid kid-f · horror: ghost-f (white saree,
    hair over the face, floats, glows) shadow (black figure, red eyes).
  - poses: idle talk present point pointup think celebrate shrug phone worried facepalm wave cross hold sad
    cower reach float look torch pray · faces: neutral happy grin worried sad shocked angry smirk talk scared flat evil blank
  - props: phone cash box sign laptop torch · `tone`: ghost | shadow (silhouette) | none (no night lighting)
  - `enter`: left | right | up | fade | none (ghosts and shadows fade in by default). `depth` puts a figure further
    back (smaller, higher up, drawn behind).
- `do: [{who, at, pose, face, say, hold, move, run: true, dur, prop, flip, appear: 0.2, vanish: 0.4}]` — keyframes;
  `say` = speech bubble (use sparingly in stories, the narrator tells it), `move` = walk/run to x,
  `appear`/`vanish` = pop in / fade out at `at` (ghosts).
- `fx`: fog · mist · rain · wind · dust · fireflies · embers · flicker (lights die and stutter) · crickets ·
  `{kind: "lightning", at: [...]}` (flash + thunder) · `{kind: "shake", at, amp}` · `{kind: "scare", at}` (punch-in,
  red flash, stinger — max 1-2 per video) · `{kind: "lightsout", at}` · `{kind: "dark", at, level}` ·
  `{kind: "torch", who}` (only a torch circle around that character is lit) · `{kind: "heartbeat", at, n}`.
  Night exteriors in horror get crickets automatically.
- `vehicles: [{kind: scooter|bike|car|auto|truck|bus, x, to, at: [go, arrive], color, label, accent, scale, y}]`
  — side view, wheels turn, headlights at dusk/night.
- explainer extras: `title`, `sub`, `labels: [{text, x, y, at, icon, sub, ac: true}]` (callout chips),
  `count: {value, label, at, bad}` (corner counter), `cards: 3 | [{title, text, icon, at}]` (phone notifications).
```
@scene {set: "highway", time: "night", fx: ["fog", {kind: "lightning", at: "bijli"}], vehicles: [{kind: "truck", x: -300, to: 1500, at: ["truck", "ruka"]}], stamp: {place: "NH-48, Rajasthan", time: "Raat 2:14 baje"}}
@scene {set: "highway", time: "night", cam: "creep", focus: 1300, fx: ["fog"], cast: [{id: "r", preset: "trucker", x: 700, pose: "torch", prop: "torch"}, {id: "g", preset: "ghost-f", x: 1350, at: "safed"}], do: [{who: "r", at: "dekha", face: "scared", pose: "cower"}]}
@scene {set: "corridor", fx: ["flicker", "dust", {kind: "scare", at: "peeche"}], cast: [{id: "n", preset: "nurse", x: 960, pose: "look"}, {id: "s", preset: "shadow", x: 1130, depth: 0.55, at: "peeche"}], do: [{who: "n", at: "peeche", face: "scared"}]}
@scene {set: "store", sign: "Zepto dark store", cast: [{id: "a", preset: "employee", x: 520, prop: "box"}], do: [{who: "a", at: "uthate", move: 900}], labels: [{text: "5,000+ items", x: 160, y: 140, at: "shelves"}], cards: 3}
@scene {set: "office", cast: [{id: "f", preset: "founder", x: 600, tag: "Founder"}, {id: "v", preset: "investor", x: 1250, tag: "VC"}], do: [{who: "v", at: "funding", say: "Aur *funding* chahiye?", pose: "present"}]}
```

**ride** — a journey A → B: the vehicle drives while the set scrolls past in layers (loops, so any length works).
`set` (street | city | highway | village), `time`, `vehicle`, `from: {label, icon}`, `to: {label, icon}`,
`at: [depart cue, arrive cue]`, `timer: "8.5 min"` (counts up) | false, `dist: "1.8 km"`, `done: "Delivered"`,
`label` (text on the delivery box / truck), `accent` (rider/box colour), `color` (vehicle), `title`.
```
@ride {set: "street", vehicle: "scooter", label: "Zepto", from: {label: "Zepto dark store"}, to: {label: "Aapka ghar"}, timer: "8.5 min", dist: "1.8 km", done: "Delivered", at: ["nikla", "pahunch"]}
@ride {set: "highway", time: "night", vehicle: "car", timer: false, at: ["gaadi", "pahunche"]}
```

**cash** — money in motion (flat 2D bundles of notes). `mode: grow` (stacks rise) | `burn` (layered flames, smoke,
red counter) | `flow` (notes fly `from: {label, icon}` → `to: {label, icon}`, `edge` label); `value`, `label`
(corner counter), `at`, `title`, `set`/`time` (default plain).
```
@cash {mode: "burn", title: "Cash *burn*", value: "₹1,250 Cr", label: "loss FY24", at: "jal"}
@cash {mode: "flow", from: {label: "Customer", icon: "user"}, to: {label: "Zepto", icon: "storefront"}, edge: "Delivery fee + margin"}
```

**people** — same as `@scene` with `set: plain` by default (paper-cut look on the brand background; older videos).

## Auto scenes (don't write them)
title sting (after the hook) · chapter cards (`# Heading`) · subscribe nudge (~40 %, after a payoff) ·
20 s end screen (`next:` teaser + 2 video slots + subscribe circle).
