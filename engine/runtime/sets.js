// sets.js — flat 2D illustrated sets (no 3D, no isometric). A set is a stack of SVG layers drawn in world
// coordinates (WW x 1080, wider than the frame so the camera can pan), each with a depth: far layers fade into
// the time-of-day fog (atmospheric perspective), near ones carry full colour. One lighting model for every set:
// colour = base -> desaturate -> ambient (dusk/night) -> haze by depth. Lit windows / lamps stay emissive.
//
//   Sets.build(name, {time, genre, P, seed, sign, opts}) -> {ww, floor, layers:[{d, svg, cls}], glow:[...]}
//   Sets.vehicle(kind, {color, night, accent, label}) -> svg (side view, facing right, ground contact at 0,0)
//   Sets.light(time, genre, P) -> lighting
// Dynamic bits are tagged in the svg and animated by the scene layout: .dyn-flick (data-s seed),
// .dyn-fan (data-x data-y), .dyn-sway (data-x data-y data-a), .whl (data-x data-y, wheel spin).
(function (G) {
  'use strict';
  var WW = 2400, H = 1080;

  // ───────── colour ─────────
  function rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function hex(c) { return '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function mix(a, b, k) { var x = rgb(a), y = rgb(b); return hex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * k; })); }
  function desat(a, s) { var c = rgb(a), l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; return hex(c.map(function (v) { return l + (v - l) * s; })); }
  function shade(a, k) { return hex(rgb(a).map(function (v) { return v * k; })); }

  function light(time, genre, P) {
    var hor = genre === 'horror';
    var T = {
      day: genre === 'explainer'
        ? { top: mix(P.bg, '#FFFFFF', 0.55), bot: P.bg, fog: P.bg, amb: '#000000', ambK: 0, sat: 0.92, haze: 0.62, win: '#C9DCEB', lit: 0, ground: P.bg2 }
        : { top: '#9CCBE6', bot: '#F2E6D2', fog: '#E8DFCF', amb: '#000000', ambK: 0, sat: 0.9, haze: 0.55, win: '#B7D2E3', lit: 0 },
      dusk: { top: '#2A1F4D', bot: '#F0905F', fog: '#B8716C', amb: '#2B2148', ambK: 0.3, sat: 0.85, haze: 0.6, win: '#FFB45C', lit: 0.35, sun: '#FFD08A' },
      night: hor
        ? { top: '#020305', bot: '#121C24', fog: '#18262B', amb: '#04070A', ambK: 0.8, sat: 0.32, haze: 0.66, win: '#E8B865', lit: 0.12, moon: '#DCE6E6' }
        : { top: '#03060E', bot: '#17223B', fog: '#1B2740', amb: '#070C18', ambK: 0.74, sat: 0.5, haze: 0.62, win: '#FFC066', lit: 0.28, moon: '#F2EEDC' },
    };
    var L = T[time] || T.day;
    L.time = time in T ? time : 'day'; L.genre = genre;
    return L;
  }

  // ───────── drawing context ─────────
  function ctx(o) {
    var L = o.L, seed = o.seed || 1;
    var D = {
      L: L, P: o.P, night: L.time === 'night', dusk: L.time === 'dusk',
      r: function (i) { var x = Math.sin((i + seed * 101.7) * 9301 + 49297) * 233280; return x - Math.floor(x); },
      // base colour at a depth (0 = horizon, 1 = the ground the cast stands on, >1 = foreground)
      c: function (base, d) {
        var c = desat(base, L.sat);
        if (L.ambK) c = mix(c, L.amb, Math.min(0.95, L.ambK * (d > 1 ? 1.12 : 1)));
        var h = L.haze * Math.pow(1 - Math.min(Math.max(d, 0), 1), 1.25);
        return mix(c, L.fog, h);
      },
      lit: function (i, p) { return (D.night || D.dusk) && D.r(i) < (p === undefined ? L.lit : p); },
    };
    return D;
  }
  var f1 = function (v) { return (+v).toFixed(1); };
  function rect(x, y, w, h, fill, extra) { return '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function circ(x, y, r, fill, extra) { return '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(r) + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function path(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function line(x1, y1, x2, y2, stroke, w, extra) { return '<path d="M' + f1(x1) + ' ' + f1(y1) + ' L' + f1(x2) + ' ' + f1(y2) + '" stroke="' + stroke + '" stroke-width="' + w + '" fill="none" stroke-linecap="round"' + (extra || '') + '/>'; }
  function esc(s) { return String(s || '').replace(/[<&>"]/g, ''); }

  // ───────── nature ─────────
  function sky(D, extra) {
    var L = D.L, s = '<defs><linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + L.top + '"/><stop offset="1" stop-color="' + L.bot + '"/></linearGradient>' +
      '<radialGradient id="moong"><stop offset="0" stop-color="' + (L.moon || '#fff') + '" stop-opacity=".45"/><stop offset="1" stop-color="' + (L.moon || '#fff') + '" stop-opacity="0"/></radialGradient></defs>';
    s += rect(0, 0, WW, H, 'url(#skyg)');
    if (D.night) {
      for (var i = 0; i < 90; i++) { var y = D.r(i + 300) * 560; s += circ(D.r(i + 200) * WW, y, 0.8 + D.r(i + 400) * 1.8, '#FFFFFF', ' opacity="' + (0.15 + D.r(i + 500) * 0.55 * (1 - y / 700)).toFixed(2) + '"'); }
      if (!extra || extra.moon !== false) { var mx = (extra && extra.moonX) || 1720, my = (extra && extra.moonY) || 190; s += circ(mx, my, 260, 'url(#moong)') + circ(mx, my, 62, L.moon) + circ(mx + 18, my - 12, 11, shade(L.moon, 0.9)) + circ(mx - 20, my + 16, 8, shade(L.moon, 0.92)); }
    } else if (D.dusk) {
      s += circ(1500, 640, 120, L.sun, ' opacity=".9"') + circ(1500, 640, 220, L.sun, ' opacity=".18"');
    } else {
      for (var c = 0; c < 4; c++) s += cloud(D, 200 + c * 620 + D.r(c) * 200, 120 + D.r(c + 9) * 180, 0.7 + D.r(c + 3) * 0.6);
    }
    return s;
  }
  function cloud(D, x, y, k) {
    var col = D.L.genre === 'explainer' ? '#FFFFFF' : mix('#FFFFFF', D.L.fog, 0.3);
    return '<g opacity=".75">' + [[0, 0, 46], [50, -18, 58], [110, 0, 44], [56, 12, 50]].map(function (p) { return circ(x + p[0] * k, y + p[1] * k, p[2] * k, col); }).join('') + rect(x - 40 * k, y, 190 * k, 40 * k, col, ' rx="' + 20 * k + '"') + '</g>';
  }
  function hills(D, y, amp, seed, base, d) {
    var p = 'M0 ' + H + ' L0 ' + y;
    for (var x = 0; x <= WW; x += 40) {
      var u = x / WW * Math.PI * 2; // whole periods across the world width: layers tile without a seam
      var v = Math.sin(u * 3 + seed) * amp + Math.sin(u * 7 + seed * 2.1) * amp * 0.45 + Math.sin(u * 19 + seed * 5) * amp * 0.07;
      p += ' L' + x + ' ' + f1(y - amp - v);
    }
    return path(p + ' L' + WW + ' ' + H + 'Z', D.c(base, d));
  }
  function treeline(D, y, seed, base, d, rr) {
    rr = rr || 46; var s = '', col = D.c(base, d);
    for (var x = -20; x < WW + 40; x += rr * 0.9) { var r = rr * (0.6 + D.r(x + seed) * 0.8); s += circ(x, y - r * 0.6, r, col); }
    return s + rect(0, y - 4, WW, H - y + 4, col);
  }
  function tree(D, x, y, h, kind, d, seed) {
    seed = seed || x; var s = '', green = D.L.genre === 'horror' ? '#3E5A45' : '#3F8F6B', trunk = D.c('#5B3F2E', d);
    var g1 = D.c(green, d), g2 = D.c(shade(green, 0.8), d);
    if (kind === 'palm') {
      var tx = x + h * 0.12;
      s += path('M' + (x - 7) + ' ' + y + ' Q' + (x + h * 0.02) + ' ' + (y - h * 0.5) + ' ' + tx + ' ' + (y - h) + ' L' + (tx + 8) + ' ' + (y - h) + ' Q' + (x + h * 0.06) + ' ' + (y - h * 0.5) + ' ' + (x + 9) + ' ' + y + 'Z', trunk);
      for (var i = 0; i < 7; i++) { var a = -Math.PI + i * Math.PI / 6 + (D.r(seed + i) - 0.5) * 0.3, L = h * 0.42; s += path('M' + tx + ' ' + (y - h) + ' Q' + f1(tx + Math.cos(a) * L * 0.6) + ' ' + f1(y - h + Math.sin(a) * L * 0.6 - 30) + ' ' + f1(tx + Math.cos(a) * L) + ' ' + f1(y - h + Math.sin(a) * L * 0.5 + 34), 'none', ' stroke="' + (i % 2 ? g1 : g2) + '" stroke-width="' + f1(h * 0.05) + '" stroke-linecap="round"'); }
      return s;
    }
    if (kind === 'dead') return deadTree(D, x, y, h, d, seed);
    if (kind === 'pine') {
      s += rect(x - h * 0.03, y - h * 0.25, h * 0.06, h * 0.25, trunk);
      for (var k = 0; k < 4; k++) { var w = h * (0.42 - k * 0.08), yy = y - h * 0.2 - k * h * 0.2; s += path('M' + f1(x - w) + ' ' + f1(yy) + ' L' + x + ' ' + f1(yy - h * 0.32) + ' L' + f1(x + w) + ' ' + f1(yy) + 'Z', k % 2 ? g1 : g2); }
      return s;
    }
    // round / peepal / banyan: trunk with root flare + clustered canopy, light top-left, shade bottom-right
    var big = kind === 'peepal' || kind === 'banyan', tw = h * (big ? 0.11 : 0.07), cw = h * (big ? 0.62 : 0.36);
    s += path('M' + f1(x - tw * 1.8) + ' ' + y + ' Q' + f1(x - tw * 0.6) + ' ' + f1(y - h * 0.1) + ' ' + f1(x - tw * 0.6) + ' ' + f1(y - h * 0.55) + ' L' + f1(x + tw * 0.6) + ' ' + f1(y - h * 0.55) + ' Q' + f1(x + tw * 0.6) + ' ' + f1(y - h * 0.1) + ' ' + f1(x + tw * 1.9) + ' ' + y + 'Z', trunk);
    if (big) { s += line(x, y - h * 0.5, x - cw * 0.5, y - h * 0.72, trunk, tw * 0.5) + line(x, y - h * 0.48, x + cw * 0.55, y - h * 0.7, trunk, tw * 0.45); if (kind === 'banyan') for (var b = 0; b < 6; b++) { var bx = x - cw * 0.8 + b * cw * 0.32; s += line(bx, y - h * 0.6, bx + (D.r(seed + b) - 0.5) * 10, y, trunk, 3, ' opacity=".8"'); } }
    var n = big ? 11 : 6;
    for (var j = 0; j < n; j++) {
      var ax = x + (D.r(seed + j * 3) - 0.5) * cw * 1.7, ay = y - h * 0.62 - D.r(seed + j * 7) * h * 0.38 + Math.abs(ax - x) / cw * h * 0.12, rr = cw * (0.32 + D.r(seed + j) * 0.22);
      s += circ(ax + rr * 0.12, ay + rr * 0.1, rr, g2) + circ(ax - rr * 0.08, ay - rr * 0.08, rr * 0.86, g1);
    }
    return '<g class="dyn-sway" data-x="' + x + '" data-y="' + y + '" data-a="' + (big ? 0.5 : 0.9) + '">' + s + '</g>';
  }
  function deadTree(D, x, y, h, d, seed) {
    var col = D.c('#3B2E28', d), s = '';
    function br(x0, y0, len, ang, w, depth) {
      var x1 = x0 + Math.sin(ang) * len, y1 = y0 - Math.cos(ang) * len;
      s += line(x0, y0, x1, y1, col, w);
      if (depth > 4 || len < 14) return;
      var k = D.r(seed + depth * 13 + x1);
      br(x1, y1, len * (0.62 + k * 0.18), ang - 0.35 - k * 0.3, w * 0.66, depth + 1);
      br(x1, y1, len * (0.58 + (1 - k) * 0.2), ang + 0.3 + (1 - k) * 0.35, w * 0.62, depth + 1);
    }
    s += path('M' + f1(x - h * 0.08) + ' ' + y + ' Q' + f1(x - h * 0.02) + ' ' + f1(y - h * 0.15) + ' ' + f1(x - h * 0.025) + ' ' + f1(y - h * 0.38) + ' L' + f1(x + h * 0.025) + ' ' + f1(y - h * 0.38) + ' Q' + f1(x + h * 0.02) + ' ' + f1(y - h * 0.15) + ' ' + f1(x + h * 0.09) + ' ' + y + 'Z', col);
    br(x, y - h * 0.36, h * 0.3, -0.15, h * 0.045, 0);
    return '<g class="dyn-sway" data-x="' + x + '" data-y="' + y + '" data-a=".4">' + s + '</g>';
  }
  function grass(D, y, d, seed, base) {
    var s = '', col = D.c(base || (D.L.genre === 'horror' ? '#4A5A3E' : '#5E9B5A'), d);
    for (var x = 0; x < WW; x += 14) { var hh = 8 + D.r(x + seed) * 22; s += path('M' + x + ' ' + y + ' L' + f1(x + 4) + ' ' + f1(y - hh) + ' L' + (x + 8) + ' ' + y + 'Z', col); }
    return s;
  }

  // ───────── built things ─────────
  function win(D, x, y, w, h, d, i, o) {
    o = o || {};
    var lit = o.lit !== undefined ? o.lit : D.lit(i);
    var frame = D.c(o.frame || '#E9E1D4', d), glass = lit ? D.L.win : D.c(o.glass || '#4A5868', d);
    var s = rect(x - 3, y - 3, w + 6, h + 6, frame) + rect(x, y, w, h, glass);
    if (lit) s = rect(x - 10, y - 10, w + 20, h + 20, D.L.win, ' opacity=".14"') + s + rect(x, y + h * 0.55, w, h * 0.45, shade(D.L.win, 0.82), ' class="' + (D.r(i + 77) < 0.25 ? 'dyn-flick' : '') + '" data-s="' + i + '"');
    else if (!D.night) s += path('M' + x + ' ' + (y + h) + ' L' + (x + w * 0.5) + ' ' + y + ' L' + (x + w * 0.75) + ' ' + y + ' L' + (x + w * 0.25) + ' ' + (y + h) + 'Z', '#FFFFFF', ' opacity=".18"');
    return s;
  }
  // Indian city building: flat face, cornice, window grid, balcony rails, black water tank, AC boxes
  function building(D, x, y, w, h, d, o) {
    o = o || {}; var i0 = Math.round(x * 7 + h), s = '';
    var base = o.color || ['#E8C9A0', '#D9B8C4', '#BFCFD8', '#E6D7B8', '#C9B79F', '#D3C1D9'][Math.floor(D.r(i0) * 6)];
    var body = D.c(base, d), dark = D.c(shade(base, 0.82), d);
    s += rect(x, y - h, w, h, body) + rect(x + w - 10, y - h, 10, h, dark) + rect(x - 6, y - h - 14, w + 12, 16, dark);
    if (o.tank !== false && D.r(i0 + 1) < 0.7) { var tx = x + 20 + D.r(i0 + 2) * (w - 90); s += rect(tx, y - h - 66, 52, 54, D.c('#2A2A2A', d), ' rx="8"') + rect(tx + 4, y - h - 14, 6, 14, D.c('#2A2A2A', d)) + rect(tx + 42, y - h - 14, 6, 14, D.c('#2A2A2A', d)); }
    var cols = Math.max(1, Math.floor((w - 30) / 62)), gx = (w - 10 - cols * 34) / (cols + 1), top = y - h + 34, bottom = y - (o.shopH || 0) - 26;
    var rows = Math.max(0, Math.floor((bottom - top) / 74));
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var wx = x + gx + c * (34 + gx), wy = top + r * 74;
      s += win(D, wx, wy, 34, 42, d, i0 + r * 13 + c, { frame: shade(base, 1.08) });
      if (D.r(i0 + r * 3 + c + 50) < 0.18) s += rect(wx + 4, wy + 46, 26, 14, D.c('#E7E7E2', d)); // AC unit
    }
    if (rows > 1 && w > 140 && D.r(i0 + 5) < 0.6) for (var b = 1; b < rows; b += 2) { var by = top + b * 74 + 46; s += rect(x + 8, by, w - 26, 5, dark); for (var bx = x + 12; bx < x + w - 20; bx += 12) s += rect(bx, by - 18, 3, 18, dark); }
    return s;
  }
  // ground-floor shop: shutter (closed) or lit interior + signboard
  function shop(D, x, y, w, h, d, o) {
    o = o || {}; var s = '', i0 = Math.round(x);
    var signC = o.sign || ['#C8372D', '#1F6E8C', '#E0A126', '#2E7D4F', '#7A3E8E'][Math.floor(D.r(i0 + 3) * 5)];
    var open = o.open !== undefined ? o.open : D.night ? D.r(i0) < 0.35 : D.r(i0) < 0.7;
    s += rect(x, y - h, w, h, D.c('#3A3330', d));
    if (open) {
      var inner = D.night || D.dusk ? mix(D.L.win, '#FFFFFF', 0.2) : D.c('#F1E3C8', d);
      s += rect(x + 8, y - h + 40, w - 16, h - 40, inner);
      for (var k = 0; k < 3; k++) { var sy = y - h + 70 + k * ((h - 80) / 3); s += rect(x + 14, sy, w - 28, 5, D.c('#7A5A3A', d)); for (var j = 0; j < (w - 30) / 16; j++) s += rect(x + 16 + j * 16, sy - 18 + D.r(i0 + k * 9 + j) * 6, 11, 18 - D.r(i0 + k * 9 + j) * 6, D.c(['#D9534F', '#F0AD4E', '#5BC0DE', '#5CB85C', '#F7F1E1'][(j + k) % 5], 0.95)); }
    } else {
      s += rect(x + 6, y - h + 40, w - 12, h - 40, D.c('#8C9196', d));
      for (var l = y - h + 48; l < y - 4; l += 10) s += rect(x + 6, l, w - 12, 2, D.c('#6E7378', d));
      s += rect(x + w / 2 - 14, y - 12, 28, 6, D.c('#4C5155', d));
    }
    var sc = D.night && open ? signC : D.c(signC, d);
    s += rect(x - 2, y - h, w + 4, 40, sc);
    if (o.text) s += '<text x="' + f1(x + w / 2) + '" y="' + f1(y - h + 30) + '" text-anchor="middle" font-family="Khand" font-weight="700" font-size="28" fill="' + (D.night && !open ? D.c('#FFFFFF', d) : '#FFF8EE') + '">' + esc(o.text).toUpperCase() + '</text>';
    if (o.awning !== false) s += path('M' + (x - 6) + ' ' + (y - h + 40) + ' L' + (x + w + 6) + ' ' + (y - h + 40) + ' L' + (x + w + 16) + ' ' + (y - h + 66) + ' L' + (x - 16) + ' ' + (y - h + 66) + 'Z', D.c(shade(signC, 0.8), d));
    return s;
  }
  function pole(D, x, y, h, d) { var c = D.c('#5A5148', d); return rect(x - 5, y - h, 10, h, c) + rect(x - 34, y - h + 16, 68, 6, c) + rect(x - 24, y - h + 36, 48, 5, c); }
  function wires(D, xs, y, h, d) {
    var s = '', c = D.c('#2A2622', d);
    for (var k = 0; k < 3; k++) for (var i = 0; i < xs.length - 1; i++) { var a = xs[i], b = xs[i + 1], yy = y - h + 18 + k * 10; s += '<path d="M' + (a - 28 + k * 22) + ' ' + yy + ' Q' + f1((a + b) / 2) + ' ' + (yy + 46 + k * 6) + ' ' + (b - 28 + k * 22) + ' ' + yy + '" stroke="' + c + '" stroke-width="2" fill="none"/>'; }
    return s;
  }
  // street lamp; returns [svg, glow] — glow goes to the light layer (screen blend)
  function lamp(D, x, y, h, d, flick) {
    var c = D.c('#4B4A48', d), on = D.night || D.dusk;
    var s = rect(x - 6, y - h, 12, h, c) + path('M' + x + ' ' + (y - h) + ' Q' + x + ' ' + (y - h - 40) + ' ' + (x + 60) + ' ' + (y - h - 40), 'none', ' stroke="' + c + '" stroke-width="10"') + rect(x + 46, y - h - 44, 46, 14, c, ' rx="6"');
    var g = '';
    if (on) {
      s += rect(x + 50, y - h - 32, 38, 7, '#FFE9B8', ' class="' + (flick ? 'dyn-flick' : '') + '" data-s="' + x + '"');
      g = '<g class="' + (flick ? 'dyn-flick' : '') + '" data-s="' + x + '"><path d="M' + (x + 52) + ' ' + (y - h - 26) + ' L' + (x + 86) + ' ' + (y - h - 26) + ' L' + (x + 230) + ' ' + y + ' L' + (x - 92) + ' ' + y + 'Z" fill="url(#cone)"/><ellipse cx="' + (x + 68) + '" cy="' + (y + 6) + '" rx="190" ry="34" fill="url(#pool)"/><circle cx="' + (x + 69) + '" cy="' + (y - h - 26) + '" r="60" fill="url(#pool)"/></g>';
    }
    return [s, g];
  }
  function lightDefs(color) {
    return '<defs><linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".55"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="pool"><stop offset="0" stop-color="' + color + '" stop-opacity=".55"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="glowR"><stop offset="0" stop-color="' + color + '" stop-opacity=".7"/><stop offset=".4" stop-color="' + color + '" stop-opacity=".25"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></radialGradient></defs>';
  }
  function road(D, y, h, d, o) {
    o = o || {}; var s = rect(-2, y, WW + 4, h, D.c(o.dirt ? '#9C7B5B' : '#43464B', d));
    if (!o.dirt) { s += rect(-2, y, WW + 4, 10, D.c('#B9B2A6', d)); for (var x = 20; x < WW; x += 150) s += rect(x, y + h * 0.5 - 4, 80, 8, D.c(o.yellow ? '#E8B83A' : '#EDEBE4', d)); }
    else for (var i = 0; i < 60; i++) s += '<ellipse cx="' + f1(D.r(i + 31) * WW) + '" cy="' + f1(y + 10 + D.r(i + 61) * (h - 20)) + '" rx="' + f1(6 + D.r(i) * 14) + '" ry="3" fill="' + D.c('#7E6248', d) + '"/>';
    return s;
  }
  function hut(D, x, y, w, h, d, i) {
    var wall = D.c('#B98B5E', d), roof = D.c('#8A6A3A', d), s = '';
    s += rect(x, y - h, w, h, wall) + path('M' + (x - 26) + ' ' + (y - h + 6) + ' L' + (x + w / 2) + ' ' + (y - h - h * 0.75) + ' L' + (x + w + 26) + ' ' + (y - h + 6) + 'Z', roof);
    for (var k = 0; k < 9; k++) { var xx = x - 14 + k * (w + 28) / 8; s += line(x + w / 2, y - h - h * 0.72, xx, y - h + 4, D.c('#6E522A', d), 2, ' opacity=".6"'); }
    s += rect(x + w * 0.38, y - h * 0.62, w * 0.24, h * 0.62, D.c('#2B2018', d));
    if (D.lit(i, 0.5)) s += rect(x + w * 0.38, y - h * 0.62, w * 0.24, h * 0.62, D.L.win, ' opacity=".85" class="dyn-flick" data-s="' + i + '"');
    return s;
  }

  // ───────── sets ─────────
  // each returns {floor, layers: [{d, svg}], light: svg (screen-blended glow layer), fg: svg (dark foreground framing)}
  var SETS = {};

  SETS.street = function (D, o) {
    var floor = 900, far = '', mid = '', near = '', glow = '';
    far += hills(D, 560, 30, 1.3, '#9AA7B5', 0.08);
    for (var i = 0; i < 26; i++) far += building(D, i * 96 - 20, 760, 80 + D.r(i) * 40, 200 + D.r(i + 9) * 260, 0.25, { tank: true });
    var x = -40, k = 0, poles = [];
    while (x < WW) { var w = 220 + D.r(k + 40) * 140, h = 360 + D.r(k + 70) * 240; mid += building(D, x, floor - 40, w, h, 0.7, { shopH: 150 }); mid += shop(D, x + 10, floor - 40, w - 20, 150, 0.85, { text: (o.signs || [])[k] || ['Kirana', 'Medical', 'Chai', 'Mobile', 'Sweets', 'Hardware', 'Tailor', 'Xerox'][Math.floor(D.r(k + 5) * 8)] }); x += w + 6; k++; }
    for (var p = 140; p < WW; p += 520) { near += pole(D, p, floor + 10, 520, 1); poles.push(p); var L = lamp(D, p + 260, floor + 10, 400, 1, D.r(p) < 0.3); near += L[0]; glow += L[1]; }
    near += wires(D, poles, floor + 10, 520, 1);
    var ground = rect(0, floor - 40, WW, 50, D.c('#B9AE9C', 1)) + road(D, floor + 10, 170, 1);
    return { floor: floor + 6, layers: [{ d: 0, svg: sky(D) }, { d: 0.2, svg: far }, { d: 0.6, svg: mid }, { d: 1, svg: ground + near }], light: glow };
  };

  SETS.city = function (D, o) {
    var floor = 900, l1 = '', l2 = '', l3 = '';
    l1 += hills(D, 620, 40, 2.2, '#8E9DB0', 0.05);
    for (var i = 0; i < 30; i++) l1 += building(D, i * 84 - 30, 820, 70 + D.r(i) * 30, 160 + D.r(i + 3) * 260, 0.18, { tank: false });
    for (var j = 0; j < 16; j++) { var w = 120 + D.r(j + 30) * 80; l2 += building(D, j * 160 - 40 + D.r(j) * 30, 860, w, 200 + D.r(j + 50) * 230, 0.45); }
    for (var k = 0; k < 9; k++) { var w2 = 200 + D.r(k + 80) * 90; l3 += building(D, k * 280 - 60, floor, w2, 250 + D.r(k + 90) * 230, 0.8); }
    l3 += rect(0, floor - 4, WW, H - floor + 4, D.c('#9C958B', 1)) + road(D, floor + 30, 150, 1);
    return { floor: floor + 30, layers: [{ d: 0, svg: sky(D) }, { d: 0.12, svg: l1 }, { d: 0.4, svg: l2 }, { d: 1, svg: l3 }] };
  };

  SETS.highway = function (D, o) {
    var floor = 860, far = '', mid = '', near = '', glow = '';
    far += hills(D, 640, 70, 0.6, '#6F7E8C', 0.05) + hills(D, 700, 40, 2.4, '#71856E', 0.25);
    for (var i = 0; i < 9; i++) { var x = 120 + i * 290 + D.r(i) * 80; mid += tree(D, x, 760, 140 + D.r(i + 4) * 90, D.r(i + 7) < 0.4 ? 'dead' : 'round', 0.45, i); }
    for (var p = 60; p < WW; p += 380) mid += rect(p, 560, 6, 200, D.c('#6A6158', 0.5)) + rect(p - 30, 570, 66, 5, D.c('#6A6158', 0.5));
    mid += '<path d="M60 575 ' + Array.from({ length: 7 }, function (_, i) { return 'Q' + (250 + i * 380) + ' 610 ' + (440 + i * 380) + ' 575'; }).join(' ') + '" stroke="' + D.c('#3E3833', 0.5) + '" stroke-width="2" fill="none"/>';
    var g = rect(0, 760, WW, floor - 760, D.c(D.L.genre === 'horror' ? '#5B5A45' : '#8FA46A', 0.8)) + grass(D, 762, 0.8, 3);
    if (o.dhaba !== false) { var hx = 1700; g += rect(hx, 640, 340, 130, D.c('#D7C29A', 0.85)) + path('M' + (hx - 20) + ' 650 L' + (hx + 150) + ' 590 L' + (hx + 320) + ' 650Z', D.c('#8E3B2E', 0.85)) + rect(hx + 40, 690, 90, 80, D.night ? D.L.win : D.c('#3A2E25', 0.85)) + rect(hx + 180, 690, 90, 50, D.night ? D.L.win : D.c('#3A2E25', 0.85)) + rect(hx + 10, 598, 320, 36, D.c('#E3A92B', 0.85)) + '<text x="' + (hx + 170) + '" y="626" text-anchor="middle" font-family="Khand" font-weight="700" font-size="26" fill="' + D.c('#3A1F14', 0.85) + '">' + esc(o.sign || 'SHER-E-PUNJAB DHABA') + '</text>'; if (D.night) glow += '<ellipse cx="' + (hx + 150) + '" cy="740" rx="300" ry="90" fill="url(#pool)"/>'; }
    near += road(D, floor, 140, 1, { yellow: true }) + rect(0, floor + 140, WW, H - floor - 140, D.c('#6E6A55', 1.05));
    for (var m = 300; m < WW; m += 900) near += rect(m, floor - 50, 34, 50, D.c('#F2EFE6', 1), ' rx="14"') + rect(m, floor - 50, 34, 18, D.c('#E3B23C', 1), ' rx="10"');
    return { floor: floor + 70, layers: [{ d: 0, svg: sky(D) }, { d: 0.15, svg: far }, { d: 0.55, svg: mid }, { d: 0.8, svg: g }, { d: 1, svg: near }], light: glow };
  };

  SETS.village = function (D, o) {
    var floor = 880, far = '', mid = '', near = '', fg = '';
    far += hills(D, 650, 60, 1.1, '#7E8C7A', 0.06) + treeline(D, 720, 5, '#4F6B4E', 0.25, 34);
    mid += rect(0, 720, WW, 200, D.c(D.L.genre === 'horror' ? '#6B6A4A' : '#A9B36B', 0.55));
    for (var i = 0; i < 5; i++) mid += hut(D, 160 + i * 430 + D.r(i) * 90, 790, 150 + D.r(i + 2) * 40, 100, 0.6, i);
    for (var h = 0; h < 3; h++) { var hx = 360 + h * 760; mid += path('M' + hx + ' 800 Q' + (hx + 50) + ' 700 ' + (hx + 100) + ' 800Z', D.c('#C9A55A', 0.62)); }
    near += road(D, floor - 30, 130, 1, { dirt: true }) + rect(0, floor + 100, WW, H, D.c(D.L.genre === 'horror' ? '#4E4A36' : '#8C9A55', 1));
    near += tree(D, o.treeX || 1850, floor - 30, 640, o.tree || 'peepal', 1, 7);
    // charpai (cot) + hand pump
    near += rect(520, floor - 70, 220, 14, D.c('#7A5534', 1)) + rect(530, floor - 56, 10, 56, D.c('#5E3F25', 1)) + rect(720, floor - 56, 10, 56, D.c('#5E3F25', 1));
    for (var c = 0; c < 9; c++) near += line(530 + c * 25, floor - 70, 545 + c * 25, floor - 58, D.c('#C8A97A', 1), 2);
    near += rect(2150, floor - 140, 22, 140, D.c('#3E4A52', 1)) + rect(2130, floor - 150, 62, 22, D.c('#3E4A52', 1)) + line(2190, floor - 140, 2260, floor - 180, D.c('#3E4A52', 1), 8);
    fg += grass(D, H, 1.2, 11, '#3E4A30');
    return { floor: floor + 20, layers: [{ d: 0, svg: sky(D) }, { d: 0.12, svg: far }, { d: 0.5, svg: mid }, { d: 1, svg: near }, { d: 1.25, svg: fg }] };
  };

  SETS.haveli = function (D, o) {
    var floor = 900, back = '', hv = '', near = '', glow = '';
    back += treeline(D, 640, 2, '#3E5246', 0.15, 50);
    var x0 = 520, w = 1360, h = 560, y = floor - 40, wall = D.c('#C9A27A', 0.85), dark = D.c('#8D6A4C', 0.85), trim = D.c('#E3CCA8', 0.85);
    hv += rect(x0, y - h, w, h, wall) + rect(x0 - 20, y - h - 30, w + 40, 34, dark) + rect(x0 - 10, y - h * 0.5, w + 20, 18, dark);
    for (var c = 0; c < 4; c++) { var cx = x0 + 120 + c * 370; hv += rect(cx - 50, y - h - 120, 100, 92, trim) + path('M' + (cx - 64) + ' ' + (y - h - 116) + ' Q' + cx + ' ' + (y - h - 210) + ' ' + (cx + 64) + ' ' + (y - h - 116) + 'Z', dark) + rect(cx - 30, y - h - 100, 24, 60, D.c('#2A1E16', 0.85)) + rect(cx + 6, y - h - 100, 24, 60, D.c('#2A1E16', 0.85)); }
    for (var r = 0; r < 2; r++) for (var k = 0; k < 7; k++) {
      var ax = x0 + 70 + k * 186, ay = y - h + 70 + r * 280, aw = 96, ah = 150, id = 900 + r * 10 + k;
      if (r === 1 && (k === 3)) continue;
      var lit = o.glowWindow !== undefined ? o.glowWindow === r * 7 + k : (D.night && D.r(id) < 0.08);
      hv += rect(ax - 18, ay + ah, aw + 36, 14, dark) + path('M' + (ax - 12) + ' ' + (ay + ah) + ' L' + (ax - 12) + ' ' + (ay + 40) + ' Q' + (ax + aw / 2) + ' ' + (ay - 34) + ' ' + (ax + aw + 12) + ' ' + (ay + 40) + ' L' + (ax + aw + 12) + ' ' + (ay + ah) + 'Z', trim);
      hv += path('M' + ax + ' ' + (ay + ah) + ' L' + ax + ' ' + (ay + 44) + ' Q' + (ax + aw / 2) + ' ' + (ay - 18) + ' ' + (ax + aw) + ' ' + (ay + 44) + ' L' + (ax + aw) + ' ' + (ay + ah) + 'Z', lit ? D.L.win : D.c('#1E1712', 0.85), lit ? ' class="dyn-flick" data-s="' + id + '"' : '');
      if (lit) glow += '<circle cx="' + (ax + aw / 2) + '" cy="' + (ay + 90) + '" r="190" fill="url(#glowR)" class="dyn-flick" data-s="' + id + '"/>';
      if (D.r(id + 3) < 0.3) hv += line(ax + 10, ay + 60, ax + aw - 10, ay + ah - 10, D.c('#5A4535', 0.85), 4); // broken shutter
    }
    // gate
    var gx = x0 + w / 2 - 110;
    hv += path('M' + (gx - 30) + ' ' + y + ' L' + (gx - 30) + ' ' + (y - 240) + ' Q' + (gx + 110) + ' ' + (y - 360) + ' ' + (gx + 250) + ' ' + (y - 240) + ' L' + (gx + 250) + ' ' + y + 'Z', trim);
    hv += path('M' + gx + ' ' + y + ' L' + gx + ' ' + (y - 230) + ' Q' + (gx + 110) + ' ' + (y - 320) + ' ' + (gx + 220) + ' ' + (y - 230) + ' L' + (gx + 220) + ' ' + y + 'Z', D.c('#4A3020', 0.85));
    for (var s = 0; s < 6; s++) hv += circ(gx + 40 + (s % 3) * 70, y - 180 + Math.floor(s / 3) * 110, 7, D.c('#B08850', 0.85));
    hv += line(gx + 110, y - 300, gx + 110, y, D.c('#2E1E14', 0.85), 4);
    // cracks + creeper
    for (var q = 0; q < 6; q++) { var qx = x0 + D.r(q + 40) * w, qy = y - D.r(q + 50) * h; hv += '<path d="M' + f1(qx) + ' ' + f1(qy) + ' l' + f1(14 - D.r(q) * 28) + ' 26 l' + f1(10 - D.r(q + 1) * 20) + ' 22 l' + f1(12 - D.r(q + 2) * 24) + ' 30" stroke="' + dark + '" stroke-width="3" fill="none"/>'; }
    for (var v = 0; v < 40; v++) hv += circ(x0 + 30 + D.r(v + 90) * 160, y - h + D.r(v + 91) * h * 0.9, 10 + D.r(v) * 10, D.c('#3D5A3A', 0.85));
    // boundary wall + ground
    near += rect(0, floor - 150, x0 - 40, 150, D.c('#A88664', 1)) + rect(0, floor - 162, x0 - 30, 16, D.c('#7E6248', 1)) + rect(x0 + w + 40, floor - 150, WW, 150, D.c('#A88664', 1)) + rect(x0 + w + 30, floor - 162, WW, 16, D.c('#7E6248', 1));
    near += rect(0, floor, WW, H - floor, D.c('#7A6A50', 1)) + grass(D, floor + 4, 1, 4, '#5A5A3A');
    near += deadTree(D, 220, floor, 520, 1, 3);
    return { floor: floor + 40, layers: [{ d: 0, svg: sky(D, { moonX: 400, moonY: 170 }) }, { d: 0.15, svg: back }, { d: 0.7, svg: hv }, { d: 1, svg: near }], light: glow };
  };

  SETS.forest = function (D, o) {
    var floor = 900, layers = [{ d: 0, svg: sky(D) }];
    [[0.1, '#3C4E4A', 40], [0.35, '#34453F', 26], [0.6, '#2B3833', 16], [0.85, '#232D29', 10]].forEach(function (z, li) {
      var s = treeline(D, 760 + li * 30, li * 9, z[1], z[0], 40);
      for (var i = 0; i < z[2]; i++) { var x = D.r(i * 7 + li * 100) * WW, w = 14 + li * 12 + D.r(i + li) * 10; s += rect(x - w / 2, 0, w, 780 + li * 40, D.c('#3A302A', z[0])); if (D.r(i + 33) < 0.5) s += line(x, 300 + D.r(i) * 300, x + (D.r(i + 2) - 0.5) * 160, 200 + D.r(i + 1) * 200, D.c('#3A302A', z[0]), w * 0.3); }
      layers.push({ d: z[0], svg: s });
    });
    var g = rect(0, floor - 20, WW, H, D.c('#3E3A2C', 1)) + path('M900 ' + H + ' Q1150 ' + (floor + 20) + ' 1300 ' + (floor - 18) + ' L1420 ' + (floor - 18) + ' Q1500 ' + (floor + 40) + ' 1700 ' + H + 'Z', D.c('#6E6047', 1)) + grass(D, floor - 16, 1, 21, '#33402C');
    g += tree(D, 360, floor, 900, 'dead', 1.1, 5) + tree(D, 2100, floor, 760, 'dead', 1.1, 8);
    layers.push({ d: 1, svg: g });
    return { floor: floor + 30, layers: layers };
  };

  // interiors: back wall + floor; the camera mostly pushes in (pan is small)
  function room(D, wallC, floorC, o) {
    var y = o.floorY || 820, s = rect(0, 0, WW, y, D.c(wallC, 1)) + rect(0, y, WW, H - y, D.c(floorC, 1)) + rect(0, y - 14, WW, 14, D.c(shade(wallC, 0.7), 1));
    if (o.lower) s += rect(0, y - 300, WW, 286, D.c(o.lower, 1)) + rect(0, y - 306, WW, 8, D.c(shade(o.lower, 0.8), 1));
    for (var i = 0; i < 18; i++) s += rect(0, y + 10 + i * i * 1.6, WW, 2, D.c(shade(floorC, 0.85), 1), ' opacity=".5"');
    return s;
  }
  function windowView(D, x, y, w, h) { // night/day outside view inside a window frame
    var s = '<defs><clipPath id="wv' + x + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/></clipPath></defs><g clip-path="url(#wv' + x + ')">' + rect(x, y, w, h, D.night ? '#0B1322' : D.L.top);
    if (D.night) s += circ(x + w * 0.7, y + h * 0.28, 34, D.L.moon || '#EEE') + circ(x + w * 0.7, y + h * 0.28, 90, D.L.moon || '#EEE', ' opacity=".12"');
    for (var i = 0; i < 6; i++) { var bh = 80 + D.r(i + x) * 160; s += rect(x + i * w / 6, y + h - bh, w / 6 - 6, bh, D.night ? '#151C2A' : D.c('#9FB0C4', 0.3)); }
    s += tree(D, x + w * 0.2, y + h, h * 0.9, D.night ? 'dead' : 'round', 0.4, x);
    return s + '</g>' + rect(x - 14, y - 14, w + 28, h + 28, 'none', ' stroke="' + D.c('#E8E0D2', 1) + '" stroke-width="16"') + rect(x + w / 2 - 6, y, 12, h, D.c('#E8E0D2', 1)) + rect(x - 30, y + h + 6, w + 60, 18, D.c('#D8CDBB', 1));
  }

  SETS.room = function (D, o) {
    var y = 830, s = room(D, o.wall || '#7F8FA0', '#6B5446', { floorY: y }), glow = '';
    s += windowView(D, 1380, 200, 420, 380);
    s += '<g class="dyn-sway" data-x="1360" data-y="160" data-a="1.6">' + path('M1330 160 Q1360 400 1320 640 L1400 640 Q1420 400 1390 160Z', D.c('#A9443C', 1)) + '</g>' + '<g class="dyn-sway" data-x="1820" data-y="160" data-a="-1.4">' + path('M1790 160 Q1830 400 1800 640 L1880 640 Q1860 400 1850 160Z', D.c('#A9443C', 1)) + '</g>' + rect(1300, 150, 600, 14, D.c('#3A2B22', 1));
    // bed
    s += rect(240, y - 230, 40, 230, D.c('#4E3426', 1)) + rect(240, y - 120, 700, 70, D.c('#5E4030', 1)) + rect(280, y - 150, 640, 50, D.c('#E6DCCB', 1), ' rx="12"') + path('M420 ' + (y - 150) + ' Q520 ' + (y - 196) + ' 920 ' + (y - 160) + ' L920 ' + (y - 100) + ' L420 ' + (y - 100) + 'Z', D.c('#3F6C8A', 1)) + rect(290, y - 196, 120, 50, D.c('#F2EEE6', 1), ' rx="20"') + rect(900, y - 60, 30, 60, D.c('#4E3426', 1));
    // cupboard (door slightly open: dark gap)
    s += rect(1000, 250, 260, y - 250, D.c('#6E4E36', 1)) + rect(1128, 262, 6, y - 270, D.c('#2A1C12', 1)) + rect(1110, 480, 10, 40, D.c('#C8A04A', 1)) + rect(1140, 480, 10, 40, D.c('#C8A04A', 1));
    // door (ajar)
    s += rect(40, 230, 170, y - 230, D.c('#2A221D', 1)) + path('M60 240 L190 260 L190 ' + (y - 10) + ' L60 ' + y + 'Z', D.c('#5C4434', 1));
    // wall clock + switchboard
    s += circ(660, 260, 54, D.c('#EDE6DA', 1)) + circ(660, 260, 54, 'none', ' stroke="' + D.c('#3A2E26', 1) + '" stroke-width="8"') + line(660, 260, 660, 222, D.c('#2A2420', 1), 5) + line(660, 260, 690, 270, D.c('#2A2420', 1), 4) + rect(860, 430, 80, 110, D.c('#EEE8DC', 1), ' rx="6"');
    // ceiling fan
    var fan = '<g class="dyn-fan" data-x="760" data-y="60">' + [0, 120, 240].map(function (a) { return '<path d="M760 60 L' + f1(760 + Math.cos(a * Math.PI / 180) * 210) + ' ' + f1(60 + Math.sin(a * Math.PI / 180) * 30) + '" stroke="' + D.c('#5A5550', 1) + '" stroke-width="22" stroke-linecap="round"/>'; }).join('') + '</g>';
    s += rect(756, 0, 8, 46, D.c('#5A5550', 1)) + fan + circ(760, 60, 22, D.c('#3E3A36', 1));
    if (D.night) glow += '<path d="M1380 200 L1800 200 L1600 ' + y + ' L1000 ' + y + 'Z" fill="url(#cone)" opacity=".35"/>';
    return { floor: y + 40, layers: [{ d: 1, svg: s }], light: glow, interior: true };
  };

  SETS.corridor = function (D, o) {
    // one-point perspective: vanishing point (cx, cy); walls/floor/ceiling are trapezoids; doors along the walls
    var cx = 1200, cy = 470, bw = 300, bh = 360, s = '', glow = '';
    var wallC = o.wall || '#9FB5A6', lowC = o.lower || '#5F7F70';
    var X0 = cx - bw / 2, X1 = cx + bw / 2, Y0 = cy - bh / 2, Y1 = cy + bh / 2;
    s += path('M0 0 L' + WW + ' 0 L' + X1 + ' ' + Y0 + ' L' + X0 + ' ' + Y0 + 'Z', D.c('#D8D6CC', 1));
    s += path('M0 ' + H + ' L' + WW + ' ' + H + ' L' + X1 + ' ' + Y1 + ' L' + X0 + ' ' + Y1 + 'Z', D.c('#8E8A80', 1));
    s += path('M0 0 L' + X0 + ' ' + Y0 + ' L' + X0 + ' ' + Y1 + ' L0 ' + H + 'Z', D.c(wallC, 1)) + path('M' + WW + ' 0 L' + X1 + ' ' + Y0 + ' L' + X1 + ' ' + Y1 + ' L' + WW + ' ' + H + 'Z', D.c(shade(wallC, 0.92), 1));
    var lp = function (x, y, k) { return [x + (cx - x) * k, y + (cy - y) * k]; };
    // lower wall band (dado) along both walls
    var dado = function (sx) { var a = lp(sx, H, 0), b = lp(sx, H * 0.62, 0), c = lp(sx, H * 0.62, 1), d = lp(sx, H, 1); return path('M' + f1(a[0]) + ' ' + f1(a[1]) + ' L' + f1(b[0]) + ' ' + f1(b[1]) + ' L' + f1(sx === 0 ? X0 : X1) + ' ' + f1(cy + bh * 0.12) + ' L' + f1(sx === 0 ? X0 : X1) + ' ' + Y1 + 'Z', D.c(sx === 0 ? lowC : shade(lowC, 0.92), 1)); };
    s += dado(0) + dado(WW);
    s += rect(X0, Y0, bw, bh, D.c('#B9B8AE', 1)) + rect(cx - 50, Y1 - 190, 100, 190, D.c('#2A2622', 1));
    // floor tiles converge
    for (var t = 1; t < 12; t++) { var k = 1 - Math.pow(t / 12, 0.7); s += line(0 + (cx - 0) * (1 - k), H + (cy - H) * (1 - k), WW + (cx - WW) * (1 - k), H + (cy - H) * (1 - k), D.c('#7A766C', 1), 2, ' opacity=".6"'); }
    for (var u = -6; u <= 6; u++) s += line(cx + u * 34, Y1, cx + u * 400, H, D.c('#7A766C', 1), 2, ' opacity=".45"');
    // doors on both walls at 3 depths
    [0.15, 0.45, 0.68].forEach(function (k, i) {
      [-1, 1].forEach(function (side) {
        var sx = side < 0 ? 0 : WW, k2 = k + 0.12;
        var a = lp(sx, H * 0.95, k), b = lp(sx, H * 0.22, k), c = lp(sx, H * 0.22, k2), d = lp(sx, H * 0.95, k2);
        var open = o.openDoor === i * 2 + (side > 0 ? 1 : 0);
        s += path('M' + f1(a[0]) + ' ' + f1(a[1]) + ' L' + f1(b[0]) + ' ' + f1(b[1]) + ' L' + f1(c[0]) + ' ' + f1(c[1]) + ' L' + f1(d[0]) + ' ' + f1(d[1]) + 'Z', open ? '#050606' : D.c('#6E5A48', 1));
        if (!open) { var m = lp(sx, H * 0.6, k2 - 0.02); s += circ(m[0] - side * 4, m[1], 6 * (1 - k), D.c('#C9A54A', 1)); }
      });
    });
    // tube lights on the ceiling (the scene flickers them)
    [0.05, 0.35, 0.6, 0.8].forEach(function (k, i) {
      var a = lp(cx - 260, 0, k), b = lp(cx + 260, 0, k), h2 = 20 * (1 - k) + 4;
      var on = i !== (o.deadLight === undefined ? 2 : o.deadLight);
      s += rect(a[0], a[1] + 30 * (1 - k), b[0] - a[0], h2, on ? '#F4FBF6' : D.c('#8C908C', 1), on ? ' class="dyn-flick" data-s="' + (i * 17 + 3) + '"' : '');
      if (on) glow += '<ellipse class="dyn-flick" data-s="' + (i * 17 + 3) + '" cx="' + f1((a[0] + b[0]) / 2) + '" cy="' + f1(a[1] + 60 * (1 - k)) + '" rx="' + f1((b[0] - a[0]) * 0.9) + '" ry="' + f1(160 * (1 - k) + 20) + '" fill="url(#pool)"/>';
    });
    return { floor: 1010, layers: [{ d: 1, svg: s }], light: glow, interior: true, lightColor: '#DDF5E8' };
  };

  SETS.station = function (D, o) {
    var floor = 860, back = '', mid = '', near = '', glow = '';
    back += hills(D, 650, 30, 3.3, '#7D8796', 0.06);
    back += treeline(D, 700, 4, '#3E4A48', 0.12, 40);
    for (var i = 0; i < 9; i++) back += building(D, i * 290 + D.r(i) * 80, 700, 90, 70 + D.r(i) * 90, 0.12, { tank: true });
    // track below the platform (in front)
    mid += rect(0, 700, WW, 60, D.c('#6F655C', 0.6)) + rect(0, 712, WW, 6, D.c('#A9A39A', 0.6)) + rect(0, 740, WW, 6, D.c('#A9A39A', 0.6));
    for (var s = 0; s < WW; s += 40) mid += rect(s, 708, 18, 46, D.c('#4E4238', 0.6));
    // platform roof + pillars
    var roof = D.c('#7C2F2A', 1), pil = D.c('#3B4C5C', 1);
    near += rect(0, 120, WW, 40, roof) + path('M0 160 L' + WW + ' 160 L' + WW + ' 190 L0 190Z', D.c('#5D221E', 1));
    for (var p = 160; p < WW; p += 480) { near += rect(p - 14, 190, 28, floor - 190, pil) + rect(p - 26, floor - 20, 52, 20, pil); var L = lamp(D, p + 20, 200, 0, 1, false); }
    for (var q = 400; q < WW; q += 960) { near += rect(q - 3, 190, 6, 50, pil) + rect(q - 30, 240, 60, 52, D.c('#EDE6D6', 1), ' rx="6"') + circ(q, 266, 20, 'none', ' stroke="' + D.c('#222', 1) + '" stroke-width="3"') + line(q, 266, q, 252, D.c('#222', 1), 3) + line(q, 266, q + 10, 270, D.c('#222', 1), 3); }
    if (D.night) for (var g = 400; g < WW; g += 480) { near += rect(g - 60, 196, 120, 10, '#F4FBF6', ' class="dyn-flick" data-s="' + g + '"'); glow += '<path class="dyn-flick" data-s="' + g + '" d="M' + (g - 60) + ' 206 L' + (g + 60) + ' 206 L' + (g + 260) + ' ' + floor + ' L' + (g - 260) + ' ' + floor + 'Z" fill="url(#cone)"/>'; }
    // station board
    near += rect(980, 320, 440, 110, D.c('#E9C232', 1), ' rx="6"') + rect(980, 320, 440, 110, 'none', ' stroke="' + D.c('#222', 1) + '" stroke-width="6" rx="6"') + '<text x="1200" y="395" text-anchor="middle" font-family="Khand" font-weight="700" font-size="64" fill="' + D.c('#1B1B1B', 1) + '">' + esc(o.sign || 'BHANGARH').toUpperCase() + '</text>' + rect(1060, 430, 6, 60, pil) + rect(1334, 430, 6, 60, pil);
    // bench
    near += rect(1700, floor - 100, 280, 18, D.c('#5E4A36', 1)) + rect(1700, floor - 150, 280, 14, D.c('#5E4A36', 1)) + rect(1716, floor - 84, 12, 84, pil) + rect(1952, floor - 84, 12, 84, pil);
    near += rect(0, floor, WW, H - floor, D.c('#9A938A', 1)) + rect(0, floor, WW, 16, D.c('#E5C33A', 1));
    return { floor: floor + 60, layers: [{ d: 0, svg: sky(D, { moon: false }) }, { d: 0.15, svg: back }, { d: 0.5, svg: mid }, { d: 1, svg: near }], light: glow };
  };

  SETS.office = function (D, o) {
    var y = 820, s = room(D, '#E9E4DA', '#B9AFA2', { floorY: y });
    s += rect(1150, 130, 900, 470, D.c('#D7E6EF', 1));
    for (var b = 0; b < 12; b++) { var bh = 120 + D.r(b + 5) * 260; s += rect(1170 + b * 74, 600 - bh, 60, bh, D.c('#8FA3B8', 0.3)); }
    s += rect(1150, 130, 900, 470, 'none', ' stroke="' + D.c('#2F3B48', 1) + '" stroke-width="16"') + rect(1592, 130, 14, 470, D.c('#2F3B48', 1));
    s += rect(400, 210, 380, 240, D.c('#FFFFFF', 1)) + '<polyline points="440,400 510,360 580,380 660,290 740,260" fill="none" stroke="' + D.c(D.P.accent, 1) + '" stroke-width="10" stroke-linecap="round"/>';
    [[200, 560], [900, 560]].forEach(function (d) { s += rect(d[0], y - 150, 520, 26, D.c('#6B4E3A', 1)) + rect(d[0] + 20, y - 124, 14, 124, D.c('#4A3628', 1)) + rect(d[0] + 486, y - 124, 14, 124, D.c('#4A3628', 1)) + rect(d[0] + 170, y - 300, 200, 136, D.c('#22262C', 1), ' rx="8"') + rect(d[0] + 180, y - 290, 180, 112, D.c('#9CC9E6', 1)) + rect(d[0] + 258, y - 164, 24, 16, D.c('#22262C', 1)); });
    s += rect(2080, y - 120, 90, 120, D.c('#C8955C', 1), ' rx="10"') + circ(2125, y - 180, 80, D.c('#3E8E6E', 1));
    return { floor: y + 40, layers: [{ d: 1, svg: s }], interior: true };
  };

  SETS.store = function (D, o) {
    var y = 830, s = room(D, '#EFE6D4', '#CBBBA2', { floorY: y });
    for (var u = 0; u < 3; u++) {
      var x0 = 140 + u * 760;
      for (var r = 0; r < 4; r++) {
        var sy = 180 + r * 150; s += rect(x0, sy + 110, 640, 14, D.c('#7A5A3A', 1));
        for (var j = 0; j < 16; j++) { var h = 60 + Math.floor(D.r(u * 70 + r * 17 + j) * 4) * 12; s += rect(x0 + 10 + j * 39, sy + 110 - h, 30, h, D.c(['#D9534F', '#F0AD4E', '#3A86FF', '#2E9E6B', '#7A3E8E', '#F7F1E1'][(j + r * 2 + u) % 6], 1), ' rx="4"'); }
      }
      s += rect(x0 - 12, 160, 14, y - 160, D.c('#5E4430', 1)) + rect(x0 + 638, 160, 14, y - 160, D.c('#5E4430', 1));
    }
    if (o.counter !== false) s += rect(700, y - 170, 900, 170, D.c('#8C5F3C', 1)) + rect(680, y - 186, 940, 20, D.c('#6A4528', 1)) + rect(1380, y - 250, 120, 70, D.c('#2A2E33', 1), ' rx="6"');
    s += rect(0, 40, WW, 70, D.c(D.P.accent, 1)) + '<text x="1200" y="95" text-anchor="middle" font-family="Khand" font-weight="700" font-size="54" fill="#FFF8EE">' + esc(o.sign || 'GENERAL STORE').toUpperCase() + '</text>';
    return { floor: y + 40, layers: [{ d: 1, svg: s }], interior: true };
  };

  SETS.plain = function (D, o) {
    var floor = 900;
    return { floor: floor, layers: [{ d: 0, svg: rect(0, 0, WW, H, D.c(D.L.genre === 'explainer' ? D.P.bg : D.L.bot, 1)) }, { d: 1, svg: rect(0, floor, WW, H - floor, D.c(D.L.genre === 'explainer' ? D.P.bg2 : shade(D.L.bot, 0.7), 1)) }] };
  };

  SETS.black = function (D, o) { return { floor: 940, layers: [{ d: 0, svg: rect(0, 0, WW, H, '#000000') }] }; };

  // ───────── vehicles (side view, facing right, ground contact at 0,0) ─────────
  function wheel(x, r, c) {
    return '<g class="whl" data-x="' + x + '" data-y="' + (-r) + '"><circle cx="' + x + '" cy="' + (-r) + '" r="' + r + '" fill="#1E1E1E"/><circle cx="' + x + '" cy="' + (-r) + '" r="' + (r * 0.55) + '" fill="' + (c || '#9DA3A8') + '"/><path d="M' + (x - r * 0.5) + ' ' + (-r) + ' L' + (x + r * 0.5) + ' ' + (-r) + ' M' + x + ' ' + (-r * 1.5) + ' L' + x + ' ' + (-r * 0.5) + '" stroke="#55595D" stroke-width="' + (r * 0.14) + '"/></g>';
  }
  function rider(x, y, o) { // seated rider: helmet, torso leaning forward, bent leg
    var top = o.top || '#2F3B48', skin = '#9C6239';
    return path('M' + (x - 10) + ' ' + (y) + ' L' + (x + 34) + ' ' + y + ' L' + (x + 40) + ' ' + (y + 44) + ' L' + (x + 26) + ' ' + (y + 46) + ' L' + (x + 20) + ' ' + (y + 12) + ' L' + (x - 6) + ' ' + (y + 14) + 'Z', '#1F2833') +
      path('M' + (x - 16) + ' ' + y + ' L' + (x + 4) + ' ' + (y - 92) + ' L' + (x + 34) + ' ' + (y - 88) + ' L' + (x + 22) + ' ' + y + 'Z', top) +
      line(x + 22, y - 76, x + 62, y - 46, top, 16) + circ(x + 64, y - 44, 8, skin) +
      circ(x + 16, y - 116, 26, o.helmet || '#D93A30') + path('M' + (x + 22) + ' ' + (y - 124) + ' L' + (x + 44) + ' ' + (y - 118) + ' L' + (x + 40) + ' ' + (y - 100) + ' L' + (x + 22) + ' ' + (y - 104) + 'Z', '#1A2533');
  }
  function vehicle(kind, o) {
    o = o || {}; var c = o.color, s = '', night = o.night;
    var beam = function (x, y, len) { return night ? '<path d="M' + x + ' ' + (y - 6) + ' L' + (x + len) + ' ' + (y - 70) + ' L' + (x + len) + ' ' + (y + 60) + 'Z" fill="url(#beam)" opacity=".9"/>' : ''; };
    var defs = night ? '<defs><linearGradient id="beam"><stop offset="0" stop-color="#FFF4C8" stop-opacity=".75"/><stop offset="1" stop-color="#FFF4C8" stop-opacity="0"/></linearGradient></defs>' : '';
    if (kind === 'scooter' || kind === 'bike') {
      c = c || (kind === 'bike' ? '#22252A' : '#E0A126');
      s += wheel(-62, 26) + wheel(64, 26);
      if (kind === 'scooter') s += path('M-92 -40 Q-90 -78 -40 -80 L20 -80 Q30 -60 40 -40 Z', c) + path('M40 -40 L54 -130 L72 -130 L66 -40Z', c) + rect(-60, -92, 74, 14, '#222', ' rx="6"');
      else s += path('M-90 -46 L-20 -86 L40 -86 L70 -50 L40 -40 Z', c) + rect(-40, -96, 84, 16, '#222', ' rx="6"') + line(50, -86, 64, -130, '#333', 7);
      s += line(60, -130, 82, -138, '#222', 7) + rect(66, -112, 18, 14, '#FFE9A8', ' rx="4"');
      if (o.box !== false) s += rect(-118, -158, 72, 70, o.accent || '#7B2FF7', ' rx="8"') + (o.label ? '<text x="-82" y="-115" text-anchor="middle" font-family="Khand" font-weight="700" font-size="20" fill="#fff">' + esc(o.label).toUpperCase() + '</text>' : '');
      s += rider(-34, -86, { top: o.accent || '#2F3B48', helmet: o.helmet });
      return defs + beam(86, -104, 520) + '<g class="vbody">' + s + '</g>';
    }
    if (kind === 'auto') {
      c = c || '#2F7D3A';
      s += wheel(-70, 24) + wheel(80, 24) + path('M-110 -30 L-110 -120 Q-100 -170 -30 -176 L70 -176 Q110 -170 118 -120 L118 -30Z', '#1E1E1E') + rect(-112, -100, 232, 74, '#F2C230', ' rx="10"') + path('M-110 -180 Q0 -205 118 -180 L118 -164 L-110 -164Z', c) + rect(30, -156, 70, 56, '#1A222C', ' rx="6"') + rect(108, -60, 16, 12, '#FFE9A8');
      return defs + beam(124, -52, 480) + '<g class="vbody">' + s + '</g>';
    }
    if (kind === 'truck') {
      c = c || '#C8372D';
      s += wheel(-170, 32) + wheel(-100, 32) + wheel(150, 32) + rect(-230, -230, 300, 190, c, ' rx="6"') + rect(-230, -230, 300, 30, '#E3A92B') + '<text x="-80" y="-112" text-anchor="middle" font-family="Khand" font-weight="700" font-size="34" fill="#FFF3C4">' + esc(o.label || 'HORN OK PLEASE') + '</text>' + path('M80 -40 L80 -190 L170 -190 Q210 -150 214 -100 L214 -40Z', '#2F6E9C') + rect(110, -176, 62, 62, '#1A222C', ' rx="6"') + rect(206, -76, 14, 14, '#FFE9A8') + rect(-236, -46, 456, 12, '#2A2A2A');
      return defs + beam(220, -66, 560) + '<g class="vbody">' + s + '</g>';
    }
    if (kind === 'bus') {
      c = c || '#C0392B';
      s += wheel(-170, 32) + wheel(170, 32) + rect(-260, -250, 520, 214, c, ' rx="18"') + rect(-260, -120, 520, 18, '#F2E2C4');
      for (var i = 0; i < 6; i++) s += rect(-240 + i * 78, -226, 62, 76, '#1A222C', ' rx="6"');
      s += rect(214, -226, 40, 110, '#1A222C', ' rx="6"') + rect(250, -70, 12, 14, '#FFE9A8');
      return defs + beam(262, -62, 560) + '<g class="vbody">' + s + '</g>';
    }
    // car (sedan)
    c = c || '#E6E1D6';
    s += wheel(-92, 30) + wheel(100, 30) + path('M-170 -40 L-170 -84 Q-166 -100 -140 -104 L-80 -108 L-40 -160 Q-30 -168 -10 -168 L70 -168 Q90 -168 104 -150 L140 -108 L182 -100 Q196 -96 196 -80 L196 -40Z', c) + path('M-30 -152 L-6 -158 L40 -158 L40 -112 L-60 -112Z', '#1F2A36') + path('M54 -158 L76 -158 Q88 -158 98 -146 L124 -112 L54 -112Z', '#1F2A36') + rect(180, -94, 16, 12, '#FFE9A8', ' rx="4"') + rect(-172, -94, 10, 12, '#E04040') + rect(-176, -48, 376, 10, shade(c, 0.6));
    return defs + beam(196, -86, 600) + '<g class="vbody">' + s + '</g>';
  }

  var UID = 0;
  function uniq(str, u) { return str ? str.replace(/id="([\w-]+)"/g, 'id="$1-' + u + '"').replace(/url\(#([\w-]+)\)/g, function (m, id) { return /^(tint-|paperedge|duo|rough)/.test(id) ? m : 'url(#' + id + '-' + u + ')'; }) : str; }
  function build(name, o) {
    var L = light(o.time || (o.genre === 'horror' ? 'night' : 'day'), o.genre || 'explainer', o.P);
    var D = ctx({ L: L, P: o.P, seed: o.seed || 1 });
    var fn = SETS[name] || SETS.plain;
    var r = fn(D, o.opts || {});
    r.ww = WW; r.L = L; r.name = name;
    r.horizon = r.horizon || {street: 780, city: 860, highway: 800, village: 820, haveli: 860, forest: 820, room: 830, corridor: 650, station: 860, office: 820, store: 830, plain: 900, black: 900}[name] || 760;
    r.lightDefs = lightDefs(r.lightColor || (D.night ? '#FFD58A' : '#FFE7B0'));
    // every gradient/clip id is made unique: a url(#id) that resolves into a hidden scene paints nothing
    var u = 's' + (++UID);
    r.layers.forEach(function (L) { L.svg = uniq(L.svg, u); });
    r.light = uniq(r.light, u); r.lightDefs = uniq(r.lightDefs, u);
    return r;
  }

  G.Sets = { build: build, vehicle: function (k, o) { return uniq(vehicle(k, o), 'v' + (++UID)); }, light: light, mix: mix, shade: shade, desat: desat, names: Object.keys(SETS), WW: WW };
})(typeof window !== 'undefined' ? window : globalThis);
