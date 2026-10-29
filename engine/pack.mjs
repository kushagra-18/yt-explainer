#!/usr/bin/env node
// pack.mjs — upload/ folder: captions.srt (Roman Hinglish, from the voice word timings), chapters.txt,
// description.txt (hook line + chapters + sources + hashtags), UPLOAD.md (titles, tags, checklist).
// Reads .yt/timeline.json + .yt/meta.json (front matter: titles, description, sources, tags, hashtags).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const tl = JSON.parse(fs.readFileSync(path.join(ROOT, '.yt/timeline.json'), 'utf8'));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, '.yt/meta.json'), 'utf8'));
fs.mkdirSync(path.join(ROOT, 'upload'), { recursive: true });

// captions: words grouped into cues of <= 42 chars / 3 s, broken at sentence ends
const ts = (x) => { const ms = Math.round(x * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const cues = []; let cur = null;
for (const w of tl.words) {
  if (!cur || (cur.text + ' ' + w.w).length > 42 || w.t - cur.t0 > 3.2 || w.t - cur.t1 > 0.6) { if (cur) cues.push(cur); cur = { t0: w.t, t1: w.e, text: w.w }; }
  else { cur.text += ' ' + w.w; cur.t1 = w.e; }
  if (/[.?!]$/.test(w.w)) { cues.push(cur); cur = null; }
}
if (cur) cues.push(cur);
fs.writeFileSync(path.join(ROOT, 'upload/captions.srt'), cues.map((c, i) => `${i + 1}\n${ts(c.t0)} --> ${ts(Math.max(c.t1, c.t0 + 0.8))}\n${c.text}\n`).join('\n'));

// chapters (YouTube needs the first at 0:00, >= 3 chapters, each >= 10 s)
const mmss = (x) => { const s = Math.floor(x); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
let ch = tl.chapters.filter((c, i, a) => i === 0 || c.start - a[i - 1].start >= 10);
ch[0] = { ...ch[0], start: 0 };
const chapters = ch.map((c) => `${mmss(c.start)} ${c.title.replace(/\*/g, '')}`).join('\n');
fs.writeFileSync(path.join(ROOT, 'upload/chapters.txt'), chapters + '\n');

const src = [].concat(meta.sources || []).map((s) => typeof s === 'string' ? s : `${s.name || ''} ${s.url || ''}`.trim());
const tags = [].concat(meta.tags || []);
const hashtags = [].concat(meta.hashtags || []).map((h) => (h.startsWith('#') ? h : '#' + h));
const desc = [
  meta.description || '',
  '',
  'Chapters:',
  chapters,
  src.length ? '\nSources:\n' + src.map((s) => '- ' + s).join('\n') : '',
  '\nThis video is for education, not investment advice.',
  hashtags.length ? '\n' + hashtags.slice(0, 5).join(' ') : '',
].join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
fs.writeFileSync(path.join(ROOT, 'upload/description.txt'), desc);

const titles = [].concat(meta.titles || [meta.title || '']).map((t) => t.replace(/\*/g, ''));
const md = `# Upload pack — ${(meta.title || '').replace(/\*/g, '')}

**Video:** renders/${path.basename(ROOT)}.mp4 (${mmss(tl.total)})

## Title options (pick one, <= 60 chars shows fully)
${titles.map((t) => `- ${t}  (${t.length} chars)`).join('\n')}

## Description
See description.txt (chapters + sources already inside).

## Tags (paste into YouTube tags, comma-separated)
${tags.join(', ')}

## Captions
Upload captions.srt as "Hindi (Latin)" or "Hinglish" subtitles.

## End screen
The last 20 s leave two video slots (left, right) and a subscribe circle (bottom centre). Add them in YouTube Studio > End screen.
`;
fs.writeFileSync(path.join(ROOT, 'upload/UPLOAD.md'), md);
console.log(`upload/: captions.srt (${cues.length} cues), chapters.txt (${ch.length}), description.txt, UPLOAD.md`);
