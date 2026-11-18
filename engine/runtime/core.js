// core.js — the yt-explainer runtime. Every frame is a pure function of time: Engine.render(t) sets every style
// from t alone (no state carried between frames), so parallel render workers and seeking give identical pixels.
(function (G) {
  'use strict';
  var YT, P, W, H, root, scenes = [], overlays = [], LAYOUT = {}, SFX = [];
  var TR = 0.5; // transition length (s), centred on the cut

  // ───────── maths ─────────
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var E = {
    lin: function (k) { return k; },
    out: function (k) { return 1 - Math.pow(1 - k, 3); },
    in: function (k) { return k * k * k; },
    io: function (k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: function (k) { var c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
    soft: function (k) { var c = 0.9, c3 = c + 1; return 1 + c3 * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
    elastic: function (k) { return k === 0 || k === 1 ? k : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * (2 * Math.PI) / 3) + 1; },
  };
  function prog(t, t0, d) { return d <= 0 ? (t >= t0 ? 1 : 0) : clamp((t - t0) / d, 0, 1); }
  function rnd(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
  function lerp(a, b, k) { return a + (b - a) * k; }

  // ───────── DOM helpers ─────────
  function el(tag, cls, css, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) e.style.cssText = css;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // "*word*" in on-screen text -> marker highlight span
  function rich(s, cls) { return esc(s).replace(/\*([^*]+)\*/g, '<span class="' + (cls || 'mk') + '">$1</span>'); }
  function svg(w, h, inner, css) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" style="' + (css || '') + '">' + inner + '</svg>'; }
  function icon(name, color, size) {
    var d = (G.YT_ICONS || {})[name] || (G.YT_ICONS || {})['lightning'] || '';
    return '<svg class="ic" viewBox="0 0 256 256" width="' + (size || 64) + '" height="' + (size || 64) + '" fill="' + (color || 'currentColor') + '">' + d + '</svg>';
  }
  // number parsing for count-ups: "₹41,000 Cr" -> {pre:"₹", n:41000, dec:0, post:" Cr", comma:true}
  function parseNum(s) {
    s = String(s);
    var m = s.match(/^(.*?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/);
    if (!m) return null;
    var raw = m[2].replace(/,/g, '');
    return { pre: m[1], n: parseFloat(raw), dec: (raw.split('.')[1] || '').length, post: m[3], comma: m[2].indexOf(',') >= 0 || parseFloat(raw) >= 10000 };
  }
  function fmtIN(n, dec) { // Indian grouping 12,34,567
    var s = n.toFixed(dec), parts = s.split('.'), x = parts[0], neg = x[0] === '-';
    if (neg) x = x.slice(1);
    var last3 = x.slice(-3), rest = x.slice(0, -3);
    if (rest) last3 = ',' + last3;
    rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return (neg ? '-' : '') + rest + last3 + (parts[1] ? '.' + parts[1] : '');
  }
  function numAt(pn, k) { var v = pn.n * k; return pn.pre + (pn.comma ? fmtIN(v, pn.dec) : v.toFixed(pn.dec)) + pn.post; }

  // hand-drawn marks (wobbly paths, deterministic)
  function roughEllipse(w, h, color, sw, seed) {
    var pts = [], n = 28, cx = w / 2, cy = h / 2;
    for (var i = 0; i <= n + 3; i++) {
      var a = (i / n) * Math.PI * 2 - 0.4, j = 1 + (rnd(seed + i) - 0.5) * 0.06;
      pts.push([cx + Math.cos(a) * (w / 2 - sw) * j, cy + Math.sin(a) * (h / 2 - sw) * j]);
    }
    var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L');
    return svg(w, h, '<path class="draw" d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>', 'overflow:visible');
  }
  function roughArrow(x1, y1, x2, y2, color, sw, bend) {
    var mx = (x1 + x2) / 2 - (y2 - y1) * (bend || 0.25), my = (y1 + y2) / 2 + (x2 - x1) * (bend || 0.25);
    var ang = Math.atan2(y2 - my, x2 - mx), L = 26;
    var h1 = [x2 - L * Math.cos(ang - 0.5), y2 - L * Math.sin(ang - 0.5)], h2 = [x2 - L * Math.cos(ang + 0.5), y2 - L * Math.sin(ang + 0.5)];
    return '<path class="draw" pathLength="1" d="M' + x1 + ' ' + y1 + ' Q' + mx + ' ' + my + ' ' + x2 + ' ' + y2 + '" fill="none" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round"/>' +
      '<path class="draw2" pathLength="1" d="M' + h1[0] + ' ' + h1[1] + ' L' + x2 + ' ' + y2 + ' L' + h2[0] + ' ' + h2[1] + '" fill="none" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function tornEdge(w, h, seed, side) { // clip-path polygon with a torn edge on one side (for paper sheets)
    var pts = [], n = 40;
    for (var i = 0; i <= n; i++) {
      var y = (i / n) * 100, x = side === 'left' ? (rnd(seed + i) * 2.4) : 100 - rnd(seed + i) * 2.4;
      pts.push(x.toFixed(2) + '% ' + y.toFixed(2) + '%');
    }
    return side === 'left' ? 'polygon(' + pts.join(',') + ',100% 100%,100% 0%)' : 'polygon(0% 0%,' + pts.join(',') + ',0% 100%)';
  }

  // ───────── images ─────────
  // img: {src, name, cut} | {missing: name} | null. Photos get the duotone (ink -> card) unless color:true.
  function image(img, o) {
    o = o || {};
    var wrap = el('div', 'imgw' + (o.cls ? ' ' + o.cls : ''), o.css || '');
    if (!img || img.missing || !img.src) {
      var label = img && img.missing ? img.missing : 'image';
      wrap.className += ' ph';
      wrap.innerHTML = '<div class="phi">' + icon('image', P.ink, 64) + '<div>' + esc(label) + '</div></div>';
      return wrap;
    }
    var logo = o.logo || /logo/i.test(img.name || '') || /\.svg$/i.test(img.src);
    var f = o.color || logo ? '' : (o.duo === 'accent' ? 'url(#duoA)' : 'url(#duo)');
    var i = el('img', '', 'width:100%;height:100%;object-fit:' + (o.fit || (img.cut || logo ? 'contain' : 'cover')) + ';object-position:' + (o.pos || 'center') + ';' + (f ? 'filter:' + f + ';' : ''));
    i.src = img.src;
    wrap.appendChild(i);
    if (img.cut || o.sticker) wrap.className += ' sticker';
    return wrap;
  }

  // ───────── scene context given to layouts ─────────
  function Scene(d) {
    var self = this;
    this.d = d; this.p = d.p || {}; this.dur = d.dur; this.speech = d.speech; this.tws = []; this.fns = [];
    this.el = el('div', 'scene', '');
    this.cam = this.p.cam || 'in';
    this.layers = {};
    ['bg', 'mid', 'fg'].forEach(function (k) { var l = el('div', 'layer L-' + k, ''); self.layers[k] = l; self.el.appendChild(l); });
    this.popZone = { x: 1490, y: 120, w: 380 };
    this.fits = [];
  }
  Scene.prototype = {
    add: function (parent, node) { (typeof parent === 'string' ? this.layers[parent] : parent).appendChild(node); return node; },
    at: function (v, fb) { return typeof v === 'number' && !isNaN(v) ? v : fb; },
    // i-th of n moments spread over the speech window (fractions a..b of it)
    slot: function (i, n, a, b) { a = a === undefined ? 0.04 : a; b = b === undefined ? 0.7 : b; var s0 = this.speech[0], s1 = this.speech[1]; return s0 + (s1 - s0) * (n <= 1 ? a : a + (b - a) * i / (n - 1)); },
    word: function (w) { w = String(w).toLowerCase(); for (var i = 0; i < this.d.words.length; i++) if (this.d.words[i][0] === w || this.d.words[i][0].indexOf(w) === 0) return this.d.words[i][1]; return null; },
    tw: function (t, d, fn, ease) { this.tws.push({ t: t, d: d, fn: fn, e: E[ease || 'out'] || ease }); return this; },
    every: function (fn) { this.fns.push(fn); return this; },
    sfx: function (t, kind, gain, dur) { if (typeof t !== 'number' || isNaN(t) || !kind) return; var e = [+(this.d.start + t).toFixed(3), kind, gain || 1]; if (dur) e.push(+dur.toFixed(3)); SFX.push(e); },
    // appear animations; state before t is the "from" pose (hidden)
    anim: function (node, type, t, d, o) {
      o = o || {}; d = d || 0.5;
      var base = node.style.transform || '', r = o.rot || 0;
      var A = {
        fade: function (k) { node.style.opacity = k; },
        pop: function (k) { node.style.opacity = clamp(k * 3, 0, 1); node.style.transform = base + ' scale(' + (0.4 + 0.6 * k) + ') rotate(' + (r * (1 - k)) + 'deg)'; },
        rise: function (k) { node.style.opacity = clamp(k * 2, 0, 1); node.style.transform = base + ' translateY(' + ((1 - k) * (o.dist || 60)) + 'px)'; },
        drop: function (k) { node.style.opacity = clamp(k * 3, 0, 1); node.style.transform = base + ' translateY(' + (-(1 - k) * (o.dist || 140)) + 'px) rotate(' + ((1 - k) * (o.rot || -8)) + 'deg)'; },
        left: function (k) { node.style.opacity = clamp(k * 2, 0, 1); node.style.transform = base + ' translateX(' + (-(1 - k) * (o.dist || 160)) + 'px)'; },
        right: function (k) { node.style.opacity = clamp(k * 2, 0, 1); node.style.transform = base + ' translateX(' + ((1 - k) * (o.dist || 160)) + 'px)'; },
        stamp: function (k) { node.style.opacity = clamp(k * 4, 0, 1); node.style.transform = base + ' scale(' + (1 + (1 - k) * 0.9) + ') rotate(' + ((1 - k) * (o.rot || 10)) + 'deg)'; },
        wipe: function (k) { node.style.clipPath = 'inset(-10% ' + ((1 - k) * 100) + '% -10% -2%)'; },
        wipeup: function (k) { node.style.clipPath = 'inset(' + ((1 - k) * 100) + '% -5% -5% -5%)'; },
        grow: function (k) { node.style.transformOrigin = '50% 100%'; node.style.transform = base + ' scaleY(' + k + ')'; },
        growx: function (k) { node.style.transformOrigin = '0% 50%'; node.style.transform = base + ' scaleX(' + k + ')'; },
        draw: function (k) { var ps = node.querySelectorAll ? node.querySelectorAll('.draw') : []; if (node.classList && node.classList.contains('draw')) ps = [node]; for (var i = 0; i < ps.length; i++) { ps[i].style.strokeDasharray = '1 1'; ps[i].style.strokeDashoffset = 1 - k; } var h = node.querySelectorAll ? node.querySelectorAll('.draw2') : []; for (var j = 0; j < h.length; j++) { h[j].style.strokeDasharray = '1 1'; h[j].style.strokeDashoffset = 1 - clamp((k - 0.8) / 0.2, 0, 1); } },
        type: function (k) { var full = node.dataset.full || (node.dataset.full = node.textContent); node.textContent = full.slice(0, Math.round(full.length * k)); },
        count: function (k) { var pn = parseNum(node.dataset.value || (node.dataset.value = node.textContent)); if (pn) node.textContent = numAt(pn, k); },
      };
      var ease = { pop: 'back', stamp: 'out', drop: 'soft', count: 'io', draw: 'io', type: 'lin', grow: 'out', growx: 'out', wipe: 'io' }[type] || 'out';
      this.tw(t, d, A[type] || A.fade, o.ease || ease);
      return node;
    },
    // shrink a text node's font-size until it fits w x h (run after fonts load, before the first frame)
    fit: function (node, w, h) { this.fits.push([node, w, h]); return node; },
    float: function (node, amp, speed, seed) { // gentle idle sway so nothing is ever frozen
      var base = null;
      this.every(function (lt) { if (base === null) base = ''; node.style.translate = '0 ' + (Math.sin(lt * (speed || 1.3) + (seed || 0)) * (amp || 4)).toFixed(2) + 'px'; node.style.rotate = (Math.sin(lt * (speed || 1.3) * 0.7 + (seed || 0) * 2) * (amp || 4) * 0.12).toFixed(3) + 'deg'; });
      return node;
    },
    update: function (lt) {
      for (var i = 0; i < this.tws.length; i++) { var w = this.tws[i]; w.fn(w.e(prog(lt, w.t, w.d))); }
      for (var j = 0; j < this.fns.length; j++) this.fns[j](lt);
    },
  };

  // ───────── shared visual pieces (used by many layouts) ─────────
  var Kit = {
    chip: function (text, bg, fg, css) { return el('div', 'chip', 'background:' + (bg || P.ink) + ';color:' + (fg || P.card) + ';' + (css || ''), rich(text)); },
    tape: function (css) { return el('div', 'tape', css || ''); },
    card: function (css, html) { return el('div', 'card', css || '', html || ''); },
    title: function (S, text, sub, o) { // standard scene title (top-left), animated
      o = o || {};
      var box = el('div', 'stitle', 'left:' + (o.x || 120) + 'px;top:' + (o.y || 84) + 'px;max-width:' + (o.w || 1300) + 'px;' + (o.css || ''));
      var h = el('div', 'h', '', rich(text)); box.appendChild(h);
      S.anim(h, 'wipe', o.t || 0.05, 0.55);
      if (sub) { var s = el('div', 'sub', '', rich(sub)); box.appendChild(s); S.anim(s, 'rise', (o.t || 0.05) + 0.25, 0.5, { dist: 24 }); }
      S.add(o.layer || 'mid', box);
      return box;
    },
    blob: function () { return el('div', '', 'display:none'); }, // decorative discs removed (read as template filler)
    logo: function (item, size) { // logo image, or a typographic chip in the brand colour
      size = size || 120;
      if (item && item.img && item.img.src) { var w = image(item.img, { logo: true, css: 'width:' + size + 'px;height:' + size + 'px' }); w.className += ' logoimg'; return w; }
      var name = (item && (item.name || item.label)) || '?';
      return el('div', 'logochip', 'height:' + size + 'px;min-width:' + size + 'px;background:' + ((item && item.color) || P.ink) + ';font-size:' + Math.round(size * 0.42) + 'px', esc(name));
    },
    annotate: function (S, x, y, w, h, t, color) { var n = S.add('fg', el('div', 'anno', 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px', roughEllipse(w, h, color || P.accent, 9, x + y))); S.anim(n, 'draw', t, 0.6); S.sfx(t, 'scribble', 0.7); return n; },
    arrow: function (S, x1, y1, x2, y2, t, color, layer) { var n = S.add(layer || 'fg', el('div', 'arrow', 'left:0;top:0', svg(W, H, roughArrow(x1, y1, x2, y2, color || P.yellow, 10), 'overflow:visible'))); S.anim(n, 'draw', t, 0.6); return n; },
    note: function (S, text, x, y, t, o) { // sticky paper note with tape
      o = o || {};
      var n = S.add('fg', el('div', 'note', 'left:' + x + 'px;top:' + y + 'px;transform:rotate(' + (o.rot || 3) + 'deg);' + (o.css || ''), '<div class="tape" style="left:35%;top:-18px;transform:rotate(-4deg)"></div>' + rich(text)));
      S.anim(n, 'stamp', t, 0.4, { rot: o.rot || 3 }); S.sfx(t, 'stamp', 0.6); S.float(n, 3, 1.1, x);
      return n;
    },
    rich: rich, esc: esc, icon: icon, image: image, svg: svg, parseNum: parseNum, fmtIN: fmtIN, numAt: numAt, roughEllipse: roughEllipse, roughArrow: roughArrow, rnd: rnd, el: el, lerp: lerp, clamp: clamp, E: E, tornEdge: tornEdge,
  };

  // ───────── transitions ─────────
  var TRANS = {
    push: function (o, n, k) { var e = E.io(k); if (o) o.style.transform = 'translateX(' + (-e * W) + 'px)'; n.style.transform = 'translateX(' + ((1 - e) * W) + 'px)'; },
    drop: function (o, n, k) { var e = E.soft(k); n.style.transform = 'translateY(' + (-(1 - e) * H * 1.05) + 'px) rotate(' + ((1 - e) * -5) + 'deg)'; n.style.boxShadow = '0 30px 80px rgba(0,0,0,' + (0.35 * (1 - k)) + ')'; if (o) o.style.filter = 'brightness(' + (1 - 0.25 * k) + ')'; },
    zoom: function (o, n, k) { var e = E.io(k); if (o) { o.style.transform = 'scale(' + (1 + e * 0.5) + ')'; o.style.opacity = 1 - clamp(e * 1.6 - 0.3, 0, 1); } n.style.transform = 'scale(' + (0.82 + 0.18 * e) + ')'; n.style.opacity = clamp(e * 1.6 - 0.2, 0, 1); },
    wipe: function (o, n, k) { var e = E.io(k), x = e * 130 - 15; n.style.clipPath = 'polygon(0 0,' + x + '% 0,' + (x - 15) + '% 100%,0 100%)'; },
    whip: function (o, n, k) { var e = E.io(k), b = Math.sin(k * Math.PI) * 18; if (o) { o.style.transform = 'translateX(' + (-e * W * 1.1) + 'px)'; o.style.filter = 'blur(' + b + 'px)'; } n.style.transform = 'translateX(' + ((1 - e) * W * 1.1) + 'px)'; n.style.filter = 'blur(' + b + 'px)'; },
    paper: null, // drawn with the overlay sheet in render()
    cut: function (o, n, k) { n.style.opacity = k >= 0.5 ? 1 : 0; },
    fade: function (o, n, k) { n.style.opacity = E.io(k); },
    dip: function (o, n, k) { if (o) o.style.opacity = k < 0.5 ? 1 - E.io(k * 2) : 0; n.style.opacity = k < 0.5 ? 0 : E.io((k - 0.5) * 2); },
  };
  var AUTO = ['push', 'cut', 'whip', 'cut', 'zoom', 'cut'];
  var SFX_OF = { push: 'whoosh', drop: 'flip', zoom: 'swish', wipe: 'whoosh', whip: 'whip', paper: 'paper', cut: null, fade: null, dip: 'low' };

  // ───────── init / render ─────────
  function init(data, rootEl) {
    YT = data; P = data.P; W = data.W; H = data.H; root = rootEl;
    G.P = P; G.THEME = data.theme || {}; G.GENRE = data.genre || 'explainer';
    var TH = G.THEME;
    if (TH.trans) AUTO = TH.trans;
    root.style.cssText += ';position:relative;overflow:hidden;width:' + W + 'px;height:' + H + 'px;background:' + P.bg;
    // shared SVG filters: duotone for photos (ink->card), accent duotone, paper edge for cutouts
    var hex = function (h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; }); };
    var duo = function (id, a, b) { var x = hex(a), y = hex(b); return '<filter id="' + id + '" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues="' + x[0] + ' ' + y[0] + '"/><feFuncG type="table" tableValues="' + x[1] + ' ' + y[1] + '"/><feFuncB type="table" tableValues="' + x[2] + ' ' + y[2] + '"/></feComponentTransfer></filter>'; };
    var defs = el('div', '', 'position:absolute;width:0;height:0;overflow:hidden',
      '<svg width="0" height="0"><defs>' + duo('duo', P.ink, P.card) + duo('duoA', P.ink, P.yellow) +
      '<filter id="paperedge" x="-15%" y="-15%" width="130%" height="130%"><feMorphology in="SourceAlpha" operator="dilate" radius="7" result="d"/><feFlood flood-color="' + P.card + '"/><feComposite in2="d" operator="in" result="edge"/><feGaussianBlur in="d" stdDeviation="10" result="b"/><feOffset in="b" dx="6" dy="16" result="o"/><feFlood flood-color="' + P.ink + '" flood-opacity=".28"/><feComposite in2="o" operator="in" result="sh"/><feMerge><feMergeNode in="sh"/><feMergeNode in="edge"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="8"/></filter>' +
      // character lighting inside sets: dusk (warm, dimmer), night (cold, dark), horror night (colder, desaturated), silhouette, ghost
      '<filter id="tint-dusk" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".78 .08 0 0 .02  .05 .62 .05 0 0  .05 .05 .62 0 .03  0 0 0 1 0"/></filter>' +
      '<filter id="tint-night" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".32 .08 .04 0 0  .05 .36 .06 0 .01  .06 .1 .5 0 .04  0 0 0 1 0"/></filter>' +
      '<filter id="tint-horror" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".36 .17 .07 0 .01  .12 .4 .09 0 .02  .12 .17 .42 0 .03  0 0 0 1 0"/></filter>' +
      '<filter id="tint-shadow" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 .02  0 0 0 0 .02  0 0 0 0 .03  0 0 0 1 0"/></filter>' +
      '<filter id="tint-ghost" x="-30%" y="-10%" width="160%" height="120%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".55 .25 .1 0 .12  .2 .62 .1 0 .14  .2 .25 .6 0 .16  0 0 0 .82 0" result="c"/><feGaussianBlur in="c" stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="c"/></feMerge></filter>' +
      '</defs></svg>');
    root.appendChild(defs);
    root.style.setProperty('--fd', "'" + ((TH.fonts && TH.fonts.display) || 'Khand') + "'"); root.style.setProperty('--fb', "'" + ((TH.fonts && TH.fonts.body) || 'Palanquin') + "'");
    root.style.setProperty('--up', TH.fonts && TH.fonts.upper === false ? 'none' : 'uppercase'); root.style.setProperty('--deep', P.deep || P.ink); root.style.setProperty('--ondeep', P.onDeep || P.card);
    root.className += ' g-' + G.GENRE;
    root.style.setProperty('--bg', P.bg); root.style.setProperty('--card', P.card); root.style.setProperty('--ink', P.ink); root.style.setProperty('--ac', P.accent); root.style.setProperty('--y', P.yellow); root.style.setProperty('--teal', P.teal);
    var stage = el('div', 'stage', ''); root.appendChild(stage);
    data.scenes.forEach(function (d, i) {
      var S = new Scene(d);
      S.el.style.visibility = 'hidden'; stage.appendChild(S.el);
      var fn = LAYOUT[d.layout];
      if (!fn) { S.add('mid', el('div', 'stitle', 'left:120px;top:120px', '<div class="h">missing layout ' + esc(d.layout) + '</div>')); }
      else fn(S, d.p || {}, P, Kit);
      overlaysFor(S, d);
      S.fits.forEach(function (f) { var n = f[0], fs = parseFloat(getComputedStyle(n).fontSize), g = 0; while (g++ < 40 && fs > 18 && ((f[1] && n.scrollWidth > f[1] + 1) || (f[2] && n.scrollHeight > f[2] + 1))) { fs *= 0.94; n.style.fontSize = fs.toFixed(1) + 'px'; } });
      S.trans = d.p.trans || (d.layout === 'chapter' ? (TH.chapterTrans || 'paper') : d.layout === 'title' ? (G.GENRE === 'horror' ? 'dip' : 'zoom') : AUTO[d.i % AUTO.length]);
      S.el.style.display = 'none'; S.el.style.visibility = '';
      scenes.push(S);
      if (i > 0 || d.start > 0) { var k = SFX_OF[S.trans]; if (k) SFX.push([+(d.start - 0.18).toFixed(3), k, 0.8]); }
    });
    // paper transition sheet
    var sheet = el('div', 'sheet', 'display:none;background:' + P.accent + ';clip-path:' + tornEdge(W, H, 7, 'left'));
    root.appendChild(sheet); overlays.push({ kind: 'sheet', el: sheet });
    // subscribe nudge
    if (data.nudge !== null && data.nudge !== undefined) {
      var nd = el('div', 'nudge', '', '<div class="nb">' + icon('bell-ringing', P.onDeep || P.card, 46) + '</div><div class="nt">Subscribe<small>' + esc(data.channel || TH.nudge || 'naye case studies har hafte') + '</small></div>');
      root.appendChild(nd); overlays.push({ kind: 'nudge', el: nd, t: data.nudge - data.offset });
      SFX.push([+data.nudge.toFixed(3), 'ding', 0.6]);
    }
    if (TH.vignette) { var vg = el('div', 'vignette', 'opacity:' + TH.vignette); root.appendChild(vg); }
    var grain = el('div', 'grain', TH.grain !== undefined ? 'opacity:' + TH.grain : ''); root.appendChild(grain); overlays.push({ kind: 'grain', el: grain });
    var out = el('script', '', ''); out.type = 'application/json'; out.id = 'yt-sfx'; out.textContent = JSON.stringify(SFX); document.body.appendChild(out);
  }

  // keyword pops, source tags, name lower-thirds
  function overlaysFor(S, d) {
    var z = S.popZone;
    (G.THEME.pops === false || d.p.pops === false ? [] : d.pops || []).forEach(function (pp, i) {
      var t = pp.t, next = d.pops[i + 1], end = Math.min(t + 2.6, next ? next.t - 0.05 : S.dur - 0.3);
      var tilt = 0;
      var n = S.add('fg', el('div', 'pop', 'left:' + z.x + 'px;top:' + z.y + 'px;max-width:' + z.w + 'px;background:' + (i % 2 ? P.ink : P.accent) + ';transform:rotate(' + tilt.toFixed(1) + 'deg)', esc(pp.text)));
      S.tw(t, 0.32, function (k) { n.style.opacity = clamp(k * 4, 0, 1); n.style.scale = String(1 + (1 - k) * 0.8); }, 'out');
      S.tw(end, 0.25, function (k) { if (k > 0) { n.style.opacity = 1 - k; n.style.scale = String(1 - 0.3 * k); } }, 'in');
      S.sfx(t, 'pop', 0.8);
    });
    if (d.p.src) {
      var s = S.add('fg', el('div', 'srctag', '', 'Source: ' + esc(d.p.src)));
      S.anim(s, 'fade', 0.6, 0.5);
    }
    if (d.p.stamp) {
      var st = d.p.stamp, tS = S.at(st.at, 0.4), lines = [st.place, st.time, st.date].filter(Boolean);
      var box = S.add('fg', el('div', 'stamp', ''));
      lines.forEach(function (ln, i) { var r = el('div', i ? 'st2' : 'st1', '', esc(ln)); box.appendChild(r); S.anim(r, 'type', tS + i * 0.7, Math.min(1.2, ln.length * 0.05)); S.sfx(tS + i * 0.7, 'type', 0.5); });
      S.tw(tS + (st.hold || 4.5), 0.6, function (k) { if (k > 0) box.style.opacity = 1 - k; });
    }
    if (d.p.lower) {
      var w = d.p.lower, lt = S.add('fg', el('div', 'lower', '', '<b>' + esc(w.name || w) + '</b>' + (w.role ? '<span>' + esc(w.role) + '</span>' : '')));
      S.anim(lt, 'wipe', S.at(w.at, 0.5), 0.5);
      S.tw(S.at(w.at, 0.5) + 4, 0.4, function (k) { if (k > 0) lt.style.opacity = 1 - k; });
    }
  }

  function camera(S, lt) {
    if (S.camFn) return S.camFn(lt);
    var k = clamp(lt / Math.max(S.dur, 1), 0, 1), c = S.cam, sc = 1, dx = 0, dy = 0;
    if (c === 'in') { sc = 1 + 0.045 * k; dx = -10 * k; }
    else if (c === 'out') { sc = 1.06 - 0.05 * k; }
    else if (c === 'left') { dx = 40 - 80 * k; sc = 1.03; }
    else if (c === 'right') { dx = -40 + 80 * k; sc = 1.03; }
    else if (c === 'up') { dy = 30 - 60 * k; sc = 1.03; }
    var D = { bg: 0.45, mid: 1, fg: 1.35 };
    for (var key in S.layers) {
      var d = D[key];
      S.layers[key].style.transform = 'translate(' + (dx * d).toFixed(2) + 'px,' + (dy * d).toFixed(2) + 'px) scale(' + (1 + (sc - 1) * d).toFixed(4) + ')';
    }
  }

  function render(t) {
    var T = t + YT.offset, half = TR / 2, sheetK = -1;
    for (var i = 0; i < scenes.length; i++) {
      var S = scenes[i], d = S.d, a = d.start, b = d.start + d.dur;
      var vis = T >= a - half && T < b + half;
      var e = S.el;
      if (!vis) { if (e.style.display !== 'none') e.style.display = 'none'; continue; }
      e.style.display = 'block';
      e.style.transform = ''; e.style.opacity = ''; e.style.filter = ''; e.style.clipPath = ''; e.style.boxShadow = ''; e.style.zIndex = String(i);
      var lt = T - a;
      S.update(lt);
      camera(S, lt);
    }
    // transitions: for each boundary in view, style outgoing + incoming
    for (var j = 0; j < scenes.length; j++) {
      var N = scenes[j], s0 = N.d.start;
      if (T < s0 - half || T >= s0 + half) continue;
      var O = j > 0 && Math.abs(scenes[j - 1].d.start + scenes[j - 1].d.dur - s0) < 0.01 ? scenes[j - 1] : null;
      var k = (T - (s0 - half)) / TR;
      if (s0 <= 0.001) continue; // first scene of the video: no transition in
      if (N.trans === 'paper') {
        sheetK = k;
        N.el.style.opacity = k >= 0.5 ? 1 : 0;
        if (O) O.el.style.opacity = k >= 0.5 ? 0 : 1;
      } else {
        (TRANS[N.trans] || TRANS.push)(O ? O.el : null, N.el, k);
      }
    }
    for (var m = 0; m < overlays.length; m++) {
      var ov = overlays[m];
      if (ov.kind === 'sheet') {
        if (sheetK < 0) { ov.el.style.display = 'none'; continue; }
        ov.el.style.display = 'block';
        var x = sheetK < 0.5 ? (1 - E.io(sheetK * 2)) * W : -E.io((sheetK - 0.5) * 2) * W * 1.05;
        ov.el.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
      } else if (ov.kind === 'nudge') {
        var nk = t - ov.t, inK = E.back(prog(nk, 0, 0.5)), outK = E.in(prog(nk, 4.2, 0.4));
        ov.el.style.display = nk >= 0 && nk < 4.7 ? 'flex' : 'none';
        ov.el.style.transform = 'translateX(' + ((1 - inK) * 520 + outK * 520) + 'px)';
        var bell = ov.el.firstChild; bell.style.transform = 'rotate(' + (Math.sin(nk * 18) * 16 * Math.max(0, 1 - nk / 1.5)) + 'deg)';
      } else if (ov.kind === 'grain') { // paper grain that "boils" every 2 frames
        var f = Math.floor(T * 15);
        ov.el.style.backgroundPosition = Math.round(rnd(f) * 300) + 'px ' + Math.round(rnd(f + 99) * 300) + 'px';
      }
    }
  }

  G.Engine = { init: init, render: render, layout: function (name, fn) { LAYOUT[name] = fn; }, Kit: Kit, E: E };
})(typeof window !== 'undefined' ? window : globalThis);
