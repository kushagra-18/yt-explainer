#!/usr/bin/env node
// build.mjs — video.md -> index.html (+ render segments) for the yt-explainer engine.
//
//   node build.mjs              check + build index.html, .yt/lines.json, .yt/timeline.json, print the plan
//   node build.mjs --plan       print scenes with times + spoken words (cue vocabulary), write nothing but .yt/*
//   node build.mjs --range a b  build only scenes overlapping [a, b) seconds into _range.html (previews)
//   node build.mjs --segments   also write _segNN.html files (one per chapter, split if > 150 s) for render.sh
//
// video.md:  front matter (--- yaml ---), "# Heading" = chapter, "@layout {js object}" = the visual of the next
// paragraph, a paragraph = one scene's narration. A paragraph with no @line above it continues the previous scene.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
const K = path.resolve(ENGINE, '..');
const ROOT = process.cwd();
const args = process.argv.slice(2);
const PLAN = args.includes('--plan');
const RANGE = args.includes('--range') ? [parseFloat(args[args.indexOf('--range') + 1]), parseFloat(args[args.indexOf('--range') + 2])] : null;
const SEGMENTS = args.includes('--segments');
const BRAND = JSON.parse(fs.readFileSync(path.join(K, 'assets/brand.json'), 'utf8'));
const LAYOUTS = JSON.parse(fs.readFileSync(path.join(ENGINE, 'layouts/catalog.json'), 'utf8'));
const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);

// ───────── tiny YAML subset (front matter): maps by indent, "- " lists, inline {..}/[..], quoted strings ─────────
function scalar(v) {
  v = v.trim();
  if (v === '') return '';
  if (/^[{[]/.test(v)) { try { return obj(v); } catch (e) { return flow(v, e); } }
  if (/^".*"$|^'.*'$/.test(v)) return v.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(v)) return +v;
  if (v === 'true' || v === 'false') return v === 'true';
  return v;
}
// YAML flow style with bare words: [zerodha, nithin kamath] / {Kaivalya: Kai-val-ya} (one level)
function flow(v, e) {
  const inner = v.slice(1, -1).trim(); if (!inner) return v[0] === '[' ? [] : {};
  const parts = inner.match(/("[^"]*"|'[^']*'|[^,])+/g).map((x) => x.trim());
  if (parts.some((x) => /^[{[]/.test(x))) throw e;
  if (v[0] === '[') return parts.map(scalar);
  return Object.fromEntries(parts.map((x) => { const m = x.match(/^("[^"]+"|'[^']+'|[^:]+):\s*(.*)$/); if (!m) throw e; return [m[1].replace(/^["']|["']$/g, '').trim(), scalar(m[2])]; }));
}
function yaml(src) {
  const lines = src.split('\n').map((l) => l.replace(/\s+#\s(?=[^"']*$).*$/, '')).filter((l) => l.trim() && !l.trim().startsWith('#'));
  const root = {}; const stack = [{ ind: -1, val: root }];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]; const ind = l.search(/\S/); const s = l.trim();
    while (stack.length > 1 && ind <= stack[stack.length - 1].ind) stack.pop();
    const parent = stack[stack.length - 1].val;
    if (s.startsWith('- ')) { if (Array.isArray(parent)) parent.push(scalar(s.slice(2))); continue; }
    const m = s.match(/^("[^"]+"|[^:]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1].replace(/^"|"$/g, '').trim();
    if (m[2] === '') {
      const next = lines[i + 1];
      const child = next && next.trim().startsWith('- ') ? [] : {};
      parent[key] = child; stack.push({ ind, val: child });
    } else parent[key] = scalar(m[2]);
  }
  return root;
}
// relaxed JS object literal: {title: "x", data: {FY19: 347}} (unquoted keys, trailing commas, single quotes)
function obj(src) {
  try { return Function(`"use strict"; return (${src});`)(); }
  catch (e) { throw new Error(`bad object ${src.slice(0, 80)}…: ${e.message}`); }
}

// ───────── parse video.md ─────────
const mdPath = path.join(ROOT, 'video.md');
if (!fs.existsSync(mdPath)) { console.error('no video.md in this folder'); process.exit(1); }
let md = fs.readFileSync(mdPath, 'utf8').replace(/\r/g, '');
let meta = {};
const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
if (fm) { meta = yaml(fm[1]); md = md.slice(fm[0].length); }
const P = Object.assign({}, BRAND.palette, meta.accent ? { accent: meta.accent } : {});

const scenes = []; const chapters = [];
let chapter = null, pending = null, lineNo = 0;
const src = md.split('\n');
for (let i = 0; i < src.length; i++) {
  const raw = src[i]; const s = raw.trim();
  if (!s || s.startsWith('<!--')) continue;
  if (/^#\s+/.test(s)) {
    const title = s.replace(/^#\s+/, '').trim();
    chapter = { title, n: chapters.length, hook: /^hook$/i.test(title), scenes: [] };
    chapters.push(chapter);
    continue;
  }
  if (s.startsWith('@')) {
    const m = s.match(/^@([a-z-]+)\s*(.*)$/);
    if (!m) { err(`line ${i + 1}: cannot read directive "${s.slice(0, 40)}"`); continue; }
    let body = m[2];
    // multi-line object: keep reading until the braces balance
    const bal = (t) => [...t].reduce((a, c) => a + (c === '{' || c === '[' ? 1 : c === '}' || c === ']' ? -1 : 0), 0);
    while (body && bal(body) > 0 && i + 1 < src.length) body += '\n' + src[++i];
    let params = {};
    try { params = body.trim() ? obj(body.trim()) : {}; } catch (e) { err(`line ${i + 1} @${m[1]}: ${e.message}`); }
    if (!LAYOUTS[m[1]]) err(`line ${i + 1}: unknown layout "@${m[1]}". Layouts: ${Object.keys(LAYOUTS).join(', ')}`);
    pending = { layout: m[1], params, srcLine: i + 1 };
    continue;
  }
  // narration paragraph (consecutive non-empty lines join)
  let text = s;
  while (i + 1 < src.length && src[i + 1].trim() && !/^[#@]/.test(src[i + 1].trim())) text += ' ' + src[++i].trim();
  if (!chapter) { chapter = { title: 'Hook', n: 0, hook: true, scenes: [] }; chapters.push(chapter); }
  if (pending || !scenes.length || scenes[scenes.length - 1].chapter !== chapter) {
    // draft scripts have no @layout lines yet: show the first sentence as a statement
    const first = text.replace(/\*/g, '').split(/(?<=[.?!])\s/)[0];
    const sc = pending || { layout: 'statement', params: { text: first.length > 70 ? first.slice(0, first.lastIndexOf(' ', 67)) + '…' : first }, srcLine: i + 1, auto: true };
    if (!pending) warn(`line ${i + 1}: paragraph has no @layout above it; using @statement (fine for a draft script)`);
    Object.assign(sc, { chapter, lines: [] });
    scenes.push(sc); chapter.scenes.push(sc); pending = null;
  }
  scenes[scenes.length - 1].lines.push({ id: ++lineNo, text });
}
if (pending) err(`@${pending.layout} at line ${pending.srcLine} has no narration paragraph under it`);

// ───────── voice timings ─────────
const CACHE = process.env.YT_CACHE || path.join(process.env.HOME, 'yt-explainers', '.cache');
let vindex = {};
try { vindex = JSON.parse(fs.readFileSync(path.join(ROOT, '.yt/voice.json'), 'utf8')); } catch {}
const display = (t) => t.replace(/\*/g, '');
function estimate(text) { // ~2.75 words/s at pace 1.2, numbers count more
  let t = 0; const words = [];
  for (const w of display(text).split(/\s+/)) {
    const d = /\d/.test(w) ? 0.75 : 0.18 + w.replace(/[^\p{L}]/gu, '').length * 0.045;
    words.push({ w, start: +t.toFixed(3), end: +(t + d).toFixed(3) });
    t += d + (/[.?!]$/.test(w) ? 0.26 : /[,;:]$/.test(w) ? 0.12 : 0.03);
  }
  return { dur: +t.toFixed(3), words };
}
let voiced = 0;
for (const sc of scenes) for (const L of sc.lines) {
  const key = vindex[L.id];
  const f = key && path.join(CACHE, 'vo', key + '.json');
  if (f && fs.existsSync(f)) {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (d.text === display(L.text)) { Object.assign(L, { dur: d.dur, words: d.words, wav: path.join(CACHE, 'vo', key + '.wav'), real: true }); voiced++; continue; }
  }
  Object.assign(L, estimate(L.text), { real: false });
}

// ───────── timeline ─────────
const LEAD = 0.18, TAIL = 0.38, LINE_GAP = 0.32, TRANS = 0.5;
const CH_CARD = 2.4, TITLE_CARD = 2.2, END = meta.endscreen === false ? 0 : 20;
const timeline = []; let t = 0;
const mk = (layout, params, dur, extra = {}) => { const s = { layout, params, start: t, dur, lines: [], ...extra }; timeline.push(s); t += dur; return s; };
chapters.forEach((ch, ci) => {
  if (!ch.scenes.length) return;
  if (!ch.hook) {
    if (ci > 0 && chapters[ci - 1].hook && meta.title_card !== false) mk('title', { title: meta.title || '', channel: (meta.channel || BRAND.channel.name || '') }, TITLE_CARD, { auto: true });
    const num = chapters.filter((c) => !c.hook).indexOf(ch) + 1;
    ch.start = t; mk('chapter', { n: num, title: ch.title }, CH_CARD, { auto: true, chapter: ch });
  } else ch.start = t;
  for (const sc of ch.scenes) {
    const s = { ...sc, start: t, lines: [] };
    let lt = LEAD;
    for (const L of sc.lines) { s.lines.push({ ...L, start: lt }); lt += L.dur + LINE_GAP; }
    lt += TAIL - LINE_GAP;
    s.dur = Math.max(lt, sc.params.min || LAYOUTS[sc.layout].min || 3.2);
    timeline.push(s); t += s.dur;
  }
});
if (END) mk('end', { next: meta.next || '', channel: meta.channel || BRAND.channel.name || '' }, END, { auto: true });
const TOTAL = +t.toFixed(3);

// subscribe nudge: at the first chapter boundary after 38% of the runtime
let nudge = null;
if (meta.subscribe !== false) {
  const after = timeline.find((s) => s.layout === 'chapter' && s.start > TOTAL * 0.38);
  const mid = timeline.find((s) => s.start > TOTAL * 0.4 && s.lines.length);
  nudge = after ? +(after.start - 7).toFixed(2) : mid ? +mid.start.toFixed(2) : null;
}

// ───────── cues: word -> scene-local seconds ─────────
const norm = (w) => w.toLowerCase().replace(/[’‘]/g, "'").replace(/[*"“”()[\]]/g, '').replace(/[.,!?;:…]+$/g, '').replace(/^[^\p{L}\p{N}₹$]+/u, '');
for (const s of timeline) {
  s.words = [];
  for (const L of s.lines) for (const w of L.words) s.words.push({ w: norm(w.w), raw: w.w, t: +(L.start + w.start).toFixed(3), e: +(L.start + w.end).toFixed(3) });
  // keyword pops: *word* or *two words* in the narration
  s.pops = [];
  for (const L of s.lines) {
    const disp = L.words.map((w) => w.w);
    let k = 0;
    for (const m of L.text.matchAll(/\*([^*]+)\*/g)) {
      const first = norm(m[1].split(/\s+/)[0]);
      while (k < disp.length && norm(disp[k]) !== first) k++;
      if (k < disp.length) { s.pops.push({ text: m[1].replace(/[.,!?;:]+$/, ''), t: +(L.start + L.words[k].start).toFixed(3) }); k++; }
      else warn(`scene @${s.layout} (line ${s.srcLine}): keyword *${m[1]}* not found in the spoken words`);
    }
  }
}
function cue(s, spec, fallback) {
  if (spec === undefined || spec === null) return fallback;
  if (typeof spec === 'number') return spec;
  const m = String(spec).match(/^(.+?)(?:#(\d+))?([+-]\d*\.?\d+)?$/);
  const word = norm(m[1]), nth = +(m[2] || 1), off = +(m[3] || 0);
  const hits = s.words.filter((w) => w.w === word || w.w.startsWith(word) && word.length >= 4);
  if (hits.length >= nth) return +(hits[nth - 1].t + off).toFixed(3);
  err(`scene @${s.layout} (line ${s.srcLine}): cue "${spec}" is not spoken in this scene. Spoken: ${s.words.map((w) => w.w).join(' ')}`);
  return fallback;
}
// resolve every `at:` in params (any depth) to seconds
function resolve(s, v) {
  if (Array.isArray(v)) return v.map((x) => resolve(s, x));
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = k === 'at' ? (Array.isArray(x) ? x.map((c) => cue(s, c, null)) : cue(s, x, null)) : resolve(s, x); return o; }
  return v;
}
for (const s of timeline) {
  s.p = resolve(s, s.params || {});
  const L = LAYOUTS[s.layout];
  for (const r of L.required || []) if (s.p[r] === undefined) err(`scene @${s.layout} (line ${s.srcLine}): needs "${r}". ${L.doc}`);
  for (const k of Object.keys(s.p)) if (!L.params.includes(k) && !['min', 'trans', 'src', 'lower', 'cam', 'bg'].includes(k)) warn(`scene @${s.layout} (line ${s.srcLine}): unknown param "${k}" (known: ${L.params.join(', ')})`);
  s.speech = s.words.length ? [s.words[0].t, s.words[s.words.length - 1].e] : [0.2, s.dur - 0.3];
}

// ───────── assets referenced by scenes ─────────
const imgDir = path.join(ROOT, 'assets/img');
const imgs = fs.existsSync(imgDir) ? fs.readdirSync(imgDir) : [];
const used = new Set(); const missing = new Set();
function imgPath(name) {
  if (!name) return null;
  if (/^(https?:|data:)/.test(name)) return name;
  const base = String(name).replace(/\.(png|jpe?g|webp|svg|gif)$/i, '');
  const pref = [`${base}.cut.png`, `${base}.png`, `${base}.jpg`, `${base}.jpeg`, `${base}.webp`, `${base}.svg`];
  const hit = pref.find((f) => imgs.includes(f)) || (imgs.includes(name) ? name : null);
  if (!hit) { missing.add(base); return null; }
  used.add(hit); return `assets/img/${hit}`;
}
const IMG_KEYS = new Set(['img', 'photo', 'logo', 'screen', 'extra', 'imgs']);
function mapImgs(v, key) {
  if (Array.isArray(v)) return v.map((x) => mapImgs(x, key));
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = mapImgs(x, k); return o; }
  if (IMG_KEYS.has(key) && typeof v === 'string') { const p = imgPath(v); return p ? { src: p, name: v, cut: /\.cut\.png$/.test(p) } : { missing: v }; }
  return v;
}
for (const s of timeline) s.p = mapImgs(s.p);
if (missing.size) warn(`images not in assets/img yet (placeholders used): ${[...missing].join(', ')} — run: yt assets`);

// icons used anywhere
const ICONS = JSON.parse(fs.readFileSync(path.join(K, 'assets/icons/phosphor-fill.json'), 'utf8'));
const iconSet = {};
JSON.stringify(timeline.map((s) => s.p)).replace(/"icon":"([a-z0-9-]+)"/g, (_, n) => { if (ICONS[n]) iconSet[n] = ICONS[n]; else err(`icon "${n}" does not exist. Search: grep <word> ${path.join(K, 'assets/icons/NAMES.txt')}`); });
for (const n of ['play-circle', 'bell-ringing', 'arrow-right', 'user', 'storefront', 'currency-inr', 'chart-line-up', 'trophy', 'warning', 'check-circle', 'x-circle', 'lightning']) iconSet[n] = ICONS[n];
const needMap = timeline.some((s) => s.layout === 'map');

// ───────── outputs ─────────
fs.mkdirSync(path.join(ROOT, '.yt'), { recursive: true });
const lines = timeline.flatMap((s) => s.lines.map((L) => ({ id: L.id, scene: s.srcLine, text: display(L.text) })));
fs.writeFileSync(path.join(ROOT, '.yt/lines.json'), JSON.stringify(lines, null, 0));
fs.writeFileSync(path.join(ROOT, '.yt/meta.json'), JSON.stringify(meta, null, 1));
const tl = {
  total: TOTAL, nudge,
  chapters: [{ title: chapters[0]?.hook ? 'Intro' : chapters[0]?.title, start: 0 }, ...chapters.filter((c) => !c.hook && c.start !== undefined).map((c) => ({ title: c.title, start: +c.start.toFixed(2) }))],
  scenes: timeline.map((s) => ({ layout: s.layout, start: +s.start.toFixed(3), dur: +s.dur.toFixed(3), line: s.srcLine, chapter: s.chapter?.title, pops: s.pops.length, trans: s.p.trans })),
  vo: timeline.flatMap((s) => s.lines.filter((L) => L.real).map((L) => ({ id: L.id, wav: L.wav, at: +(s.start + L.start).toFixed(3), dur: L.dur }))),
  words: timeline.flatMap((s) => s.lines.flatMap((L) => L.words.map((w) => ({ w: display(w.w), t: +(s.start + L.start + w.start).toFixed(3), e: +(s.start + L.start + w.end).toFixed(3) })))),
};
fs.writeFileSync(path.join(ROOT, '.yt/timeline.json'), JSON.stringify(tl));

// plan print
const fmt = (x) => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, '0')}`;
if (PLAN || !RANGE) {
  for (const s of timeline) {
    const head = `${fmt(s.start)} ${s.dur.toFixed(1).padStart(5)}s  @${s.layout.padEnd(10)}`;
    if (s.auto) { console.log(`${head} ${s.layout === 'chapter' ? '── ' + s.p.title : ''}`); continue; }
    console.log(`${head} L${s.srcLine}` + (PLAN ? `\n      ${s.words.map((w) => w.w).join(' ')}` : ''));
  }
}
const long = timeline.filter((s) => !s.auto && s.dur > 16);
if (long.length) warn(`${long.length} scene(s) longer than 16 s (pattern interrupt every ~8-15 s): lines ${long.map((s) => s.srcLine).join(', ')} — split the paragraph or add another @layout`);

if (warns.length) console.log('\nwarnings:\n  ' + [...new Set(warns)].join('\n  '));
if (errors.length) { console.log('\nERRORS (fix video.md):\n  ' + [...new Set(errors)].join('\n  ')); process.exit(1); }
console.log(`\n${timeline.length} scenes, ${fmt(TOTAL)} total, voice ${voiced}/${lines.length} lines${voiced < lines.length ? ' (rest estimated: run yt voice)' : ''}`);
if (PLAN) process.exit(0);

// ───────── HTML ─────────
const RT = ['core.js', 'people.js'].map((f) => fs.readFileSync(path.join(ENGINE, 'runtime', f), 'utf8')).join('\n');
const LAY = fs.readdirSync(path.join(ENGINE, 'layouts')).filter((f) => f.endsWith('.js')).sort().map((f) => fs.readFileSync(path.join(ENGINE, 'layouts', f), 'utf8')).join('\n');
const MAP = needMap ? fs.readFileSync(path.join(K, 'assets/data/india.json'), 'utf8') : 'null';
function html(from, to, offset) {
  const sel = timeline.filter((s) => s.start < to + TRANS && s.start + s.dur > from - TRANS); // neighbours too: transitions straddle cuts
  const data = {
    W: BRAND.video.width, H: BRAND.video.height, P, fonts: BRAND.fonts, total: to - from, offset,
    nudge: nudge !== null && nudge >= from && nudge < to ? nudge : null, title: meta.title || '', channel: meta.channel || BRAND.channel.name || '',
    scenes: sel.map((s) => ({ layout: s.layout, start: +(s.start).toFixed(3), dur: +s.dur.toFixed(3), p: s.p, pops: s.pops, words: s.words.map((w) => [w.w, w.t, w.e]), speech: s.speech, i: timeline.indexOf(s) })),
  };
  return `<!doctype html>
<html lang="hi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${data.W}, height=${data.H}" />
<title>${(meta.title || 'explainer').replace(/</g, '')}</title>
<!-- GENERATED by yt build from video.md: edit video.md, not this file. -->
<style>
${['Khand-Medium:500', 'Khand-SemiBold:600', 'Khand-Bold:700'].map((f) => `@font-face{font-family:'Khand';src:url('assets/fonts/${f.split(':')[0]}.ttf');font-weight:${f.split(':')[1]}}`).join('\n')}
${['Palanquin-Regular:400', 'Palanquin-Medium:500', 'Palanquin-SemiBold:600', 'Palanquin-Bold:700'].map((f) => `@font-face{font-family:'Palanquin';src:url('assets/fonts/${f.split(':')[0]}.ttf');font-weight:${f.split(':')[1]}}`).join('\n')}
${fs.readFileSync(path.join(ENGINE, 'runtime', 'style.css'), 'utf8')}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${(to - from).toFixed(3)}" data-width="${data.W}" data-height="${data.H}" data-fps="${BRAND.video.fps}"></div>
<script>
window.YT = ${JSON.stringify(data)};
window.YT_ICONS = ${JSON.stringify(iconSet)};
window.YT_MAP = ${MAP};
${RT}
${LAY}
(function () {
  var root = document.getElementById('root');
  function go() {
    Engine.init(window.YT, root);
    var clock = { v: 0, t: function (x) { if (x === undefined) return this.v; this.v = x; Engine.render(x); } };
    var tl = window.gsap ? gsap.timeline({ paused: true }) : null;
    window.__timelines = window.__timelines || {};
    if (tl) { tl.fromTo(clock, { t: 0 }, { t: window.YT.total, duration: window.YT.total, ease: 'none' }, 0); window.__timelines['main'] = tl; }
    Engine.render(0);
  }
  var imgs = Array.prototype.slice.call(document.images);
  Promise.all(["700 60px Khand", "600 60px Khand", "500 40px Palanquin", "600 40px Palanquin", "700 40px Palanquin"].map(function (f) { return document.fonts.load(f).catch(function () {}); }))
    .then(function () { return document.fonts.ready; }).then(go);
})();
</script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
</body>
</html>
`;
}
// gsap must exist before go(); load order: put gsap first
const withGsap = (h) => h.replace('<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>\n</body>', '</body>').replace('<script>\nwindow.YT =', '<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>\n<script>\nwindow.YT =');
const segFiles = fs.readdirSync(ROOT).filter((f) => /^_seg\d+\.html$|^_range\.html$/.test(f));
if (RANGE) {
  fs.writeFileSync(path.join(ROOT, '_range.html'), withGsap(html(RANGE[0], Math.min(RANGE[1], TOTAL), RANGE[0])));
  console.log(`wrote _range.html (${RANGE[0]}-${Math.min(RANGE[1], TOTAL)} s)`);
} else {
  fs.writeFileSync(path.join(ROOT, 'index.html'), withGsap(html(0, TOTAL, 0)));
  console.log('wrote index.html');
}
if (SEGMENTS) {
  for (const f of segFiles.filter((f) => f.startsWith('_seg'))) fs.unlinkSync(path.join(ROOT, f));
  // cut points: chapter starts, splitting anything over 150 s at the nearest scene start
  const cuts = [0];
  for (const s of timeline) {
    if (s.start - cuts[cuts.length - 1] >= 150 || (s.layout === 'chapter' && s.start - cuts[cuts.length - 1] >= 40)) cuts.push(s.start);
  }
  cuts.push(TOTAL);
  for (let i = 0; i < cuts.length; i++) cuts[i] = Math.round(cuts[i] * BRAND.video.fps) / BRAND.video.fps; // frame-exact cuts: segments concat without drift
  const segs = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const name = `_seg${String(i + 1).padStart(2, '0')}.html`;
    const h = withGsap(html(cuts[i], cuts[i + 1], cuts[i]));
    fs.writeFileSync(path.join(ROOT, name), h);
    segs.push({ file: name, from: +cuts[i].toFixed(3), to: +cuts[i + 1].toFixed(3), hash: hash(h) });
  }
  fs.writeFileSync(path.join(ROOT, '.yt/segments.json'), JSON.stringify(segs, null, 1));
  console.log(`wrote ${segs.length} segments`);
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
