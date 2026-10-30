# video.md format + layout catalog

## File shape
```
---
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
`min: 6` minimum scene seconds · `trans: push|drop|zoom|wipe|whip|paper|cut` transition INTO this scene
(auto-rotated otherwise; chapters use paper) · `cam: in|out|left|right|up|still` slow camera (default in) ·
`src: "Tofler, FY24"` small source tag (use on every data scene) · `lower: {name, role, at}` lower third.

## Pacing rules (user decision: ~50 % motion, 30 % data, 20 % text/photo)
- 6-12 s per scene (≈ 15-30 words). Longer → split the paragraph and give it a second layout. Motion scenes
  (ride, cutaway, network, chain, cash, iso, people) may run 10-16 s — they carry the story.
- **Show, don't chart**: whenever the narration describes something happening (a delivery, a store working,
  expansion, money burning, goods moving, a founder deciding), use a motion scene. Charts only when the
  number itself is the point. Never more than 2 data scenes in a row.
- Never the same layout twice in a row; a pattern interrupt every 20-40 s.
- Chapter openers: statement or photo; chapter closers: an open loop line on a statement.
- Brand colours for brands (`color:` in data rows), accent for the brand the video is about.

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

## Motion scenes (isometric world — the default way to SHOW the business)
Colourful isometric city/buildings/vehicles/people; everything moves (traffic, walkers, workers). Brand colour = `accent`.
Node kinds everywhere: darkstore, shop, kirana, restaurant, warehouse, factory, farm, home, tower, office, bank, phone.
Vehicles: scooter, bike, car, auto, van, truck, bus.

**ride** — a vehicle crosses the city A → B, camera follows, route draws, timer counts, "Delivered" stamp.
`vehicle`, `from: {label, kind, icon}`, `to: {label, kind, icon}`, `at: [depart cue, arrive cue]`, `timer: "10 min"` | false,
`dist: "1.8 km"`, `done: "Delivered"`, `city: city|suburb`. Uses: quick delivery, cab ride, logistics speed, a customer journey.
```
@ride {title: "10 minute *delivery*", vehicle: "scooter", from: {label: "Zepto dark store", kind: "darkstore"}, to: {label: "Aapka ghar", kind: "home"}, timer: "8.5 min", dist: "1.8 km", at: ["nikla", "pahunch"]}
```

**cutaway** — building exterior, then the front walls drop and roof lifts: the inside is working.
`kind: darkstore|warehouse|factory|kitchen|office|kirana`, `sign`, `at` (open cue), `labels: [{text, zone, at}]`
(zones — darkstore: shelves packing dispatch pickers · warehouse: racks dock staff · factory: line machines workers ·
kitchen: stoves counter chefs · office: team · kirana: shelves counter customers), `orders: 4 | [{text, title, at}]`
(phone notifications), `count: {value, label, at}`. Uses: how a dark store / cloud kitchen / factory / office works.
```
@cutaway {kind: "darkstore", sign: "Zepto", at: "andar", orders: 3, labels: [{text: "5,000+ items", zone: "shelves", at: "shelves"}, {text: "Packing: 60 sec", zone: "packing", at: "packing"}], count: {value: "1,200", label: "orders / din"}}
```

**network** — city from above; stores pop up with radius rings, riders zip out. `stores: 9 | [{label, at, kind}]`,
`kind`, `radius: "2 km"`, `riders` (per store), `count: {value, label, at}`, `city`, `zoom`. Uses: expansion, coverage, density.
```
@network {title: "Har *2 km* pe ek store", stores: 9, radius: "2 km", count: {value: "350", label: "dark stores"}}
```

**chain** — supply chain on a road, vehicles carry goods node to node, camera pans. `steps: [{kind, label, sub, icon,
edge: "+12%", vehicle, at}]` (2-5), `token: cash` (coin rides along). Uses: farm-to-home, margins at each step, distribution.
```
@chain {title: "Saaman kaise pahunchta hai", steps: [{kind: "farm", label: "Kisaan", at: "kisaan"}, {kind: "warehouse", label: "Warehouse", edge: "+12%"}, {kind: "darkstore", label: "Dark store", edge: "+8%"}, {kind: "home", label: "Aap"}]}
```

**cash** — money in motion. `mode: grow` (stacks pile up) | `burn` (pile on fire, smoke, red counter) | `flow` (coins arc
`from: {label, kind}` → `to: {label, kind}`, `edge` label, `token: coin|cash`); `value`, `label` (corner counter), `at`.
```
@cash {mode: "burn", title: "Cash *burn*", value: "₹1,250 Cr", label: "loss FY24", at: "jal"}
@cash {mode: "flow", from: {label: "Customer", kind: "phone"}, to: {label: "Zepto", kind: "office"}, edge: "Delivery fee + margin"}
```

**iso** — free-form world for anything else. `world: {kind: city|suburb|plain, cols, rows, traffic, people}`,
`place: [{id, model (any node kind), block: [i, j], label, hi, h, color, at}]`, `move: [{model (vehicle), from: id,
to: id, at: [go, arrive], label, color}]`, `cam: {zoom, follow: 0}`. Blocks: i 0..cols-1, j 0..rows-1.
```
@iso {world: {kind: "suburb"}, place: [{id: "k", model: "kirana", block: [1, 1], label: "Kirana"}, {id: "w", model: "warehouse", block: [5, 3], label: "Distributor", hi: true}], move: [{model: "truck", from: "w", to: "k", at: ["truck", "dukaan"], label: "Maal"}], cam: {follow: 0}}
```

## People layout (story beats; paper-cut characters, no host)
`set: store|office|street|city|home|stage|plain` · `title`, `sub` ·
`cast: [{id, preset, x (0-1920), pose, face, flip, prop, sign, tag, enter, look, scale, at}]` ·
`do: [{who, at, pose, face, say, hold, move, dur, prop}]` (keyframes; `say` = speech bubble, `move` = walk to x).
- presets: founder, founder-f, customer, customer-m, rider, investor, employee, employee-f, shopkeeper,
  student, ceo, ceo-f, oldman, auntie, farmer. `look: {topColor, hairColor, skin: s1-s5, glasses, hair, top}` tweaks.
- poses: idle talk present point pointup think celebrate shrug phone worried facepalm wave cross hold sad
- faces: neutral happy grin worried sad shocked angry smirk talk · props: phone cash box sign laptop (`sign: "SALE"`)
- enter: left|right|up|fade|none. Characters blink, breathe and lip-flap while their bubble is up.
```
@people {set: "office", cast: [{id: "nk", preset: "founder", x: 640, tag: "Founder"}, {id: "inv", preset: "investor", x: 1300, tag: "VC"}], do: [{who: "inv", at: "funding", say: "Funding chahiye?", pose: "present"}, {who: "nk", at: "nahi", pose: "cross", face: "smirk", say: "Nahi, *shukriya*!"}, {who: "inv", at: "shocked", face: "shocked", pose: "worried"}]}
```

## Auto scenes (don't write them)
title sting (after the hook) · chapter cards (`# Heading`) · subscribe nudge (~40 %, after a payoff) ·
20 s end screen (`next:` teaser + 2 video slots + subscribe circle).
