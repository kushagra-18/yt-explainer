// d-scene.js — 2D story scenes: an illustrated set (sets.js) + a cast that acts + vehicles + atmosphere fx + a
// layered camera. Also @ride (side-scrolling journey) and @cash (money in motion), both flat 2D.
// @people is the same as @scene (kept so older video.md files still build).
(function () {
  var K = Engine.Kit, el = K.el, PE = window.People, SE = window.Sets;
  var WW = SE.WW, OFF = (WW - 1920) / 2;
  var LEGACY = { home: 'room', stage: 'plain' };

  function noise(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  // light flicker: mostly on, occasional drops; heavy = horror "dying tube light"
  function flick(lt, seed, heavy) {
    var f = Math.floor(lt * 14), v = noise(f * 0.37 + seed * 3.1);
    if (heavy) { var burst = noise(Math.floor(lt * 1.3) + seed) < 0.45; return burst ? (v < 0.45 ? 0.08 : v < 0.6 ? 0.5 : 1) : (v < 0.05 ? 0.3 : 1); }
    return v < 0.025 ? 0.35 : 1;
  }
  function genre() { return window.GENRE || 'explainer'; }
  function th() { return window.THEME || {}; }

  // ───────── world: set layers + camera ─────────
  function world(S, p, P, o) {
    o = o || {};
    var name = LEGACY[p.set] || p.set || 'plain';
    var time = p.time || (genre() === 'explainer' && (name === 'plain' || name === 'office' || name === 'store') ? 'day' : th().time || 'day');
    var R = SE.build(name, { time: time, genre: genre(), P: P, seed: p.seed || (S.d.i + 3), opts: Object.assign({ sign: p.sign }, p.opts || {}) });
    var Wd = { R: R, layers: [], time: time, name: name, floor: R.floor, night: time === 'night', fx: {}, shakes: [], punches: [], darks: [] };
    var ww = o.loop ? WW * 2 : WW;
    R.layers.forEach(function (L, i) {
      var inner = o.loop ? L.svg + '<g transform="translate(' + WW + ' 0)">' + L.svg + '</g>' : L.svg;
      var d = el('div', 'wl', 'left:' + (-OFF) + 'px;width:' + ww + 'px;transform-origin:' + (OFF + 960) + 'px 540px', K.svg(ww, 1080, (i === 0 ? R.lightDefs : '') + inner));
      if (L.d > 1) Wd.fgLayers = (Wd.fgLayers || []).concat([{ d: L.d, el: d }]);
      else { S.add('bg', d); Wd.layers.push({ d: L.d, el: d }); }
    });
    // depth-1 stage for cast + vehicles (moves with the ground)
    Wd.stage = el('div', 'wl', 'left:' + (-OFF) + 'px;width:' + ww + 'px;transform-origin:' + (OFF + 960) + 'px 540px');
    S.add('bg', Wd.stage); Wd.layers.push({ d: 1, el: Wd.stage });
    if (R.light) { var lg = el('div', 'wl lightL', 'left:' + (-OFF) + 'px;width:' + ww + 'px;transform-origin:' + (OFF + 960) + 'px 540px', K.svg(ww, 1080, R.lightDefs + (o.loop ? R.light + '<g transform="translate(' + WW + ' 0)">' + R.light + '</g>' : R.light))); S.add('bg', lg); Wd.layers.push({ d: 1, el: lg }); }
    (Wd.fgLayers || []).forEach(function (f) { S.add('bg', f.el); Wd.layers.push(f); });
    // dynamic parts
    Wd.flick = [].slice.call(S.el.querySelectorAll('.dyn-flick'));
    Wd.fans = [].slice.call(S.el.querySelectorAll('.dyn-fan'));
    Wd.sways = [].slice.call(S.el.querySelectorAll('.dyn-sway'));
    fx(S, p, P, Wd);
    // camera
    var cam = p.cam !== undefined ? p.cam : genre() === 'horror' ? 'creep' : 'in';
    var C = typeof cam === 'object' ? cam : {
      still: { zoom: [1, 1] }, in: { zoom: [1, 1.06] }, out: { zoom: [1.1, 1] }, creep: { zoom: [1, 1.13] },
      left: { pan: [140, -140], zoom: [1.04, 1.04] }, right: { pan: [-140, 140], zoom: [1.04, 1.04] }, up: { zoom: [1.03, 1.06], y: [30, -30] },
    }[cam] || { zoom: [1, 1.05] };
    var focus = p.focus !== undefined ? p.focus : null;
    Wd.cam = function (lt) {
      var k = K.E.io(K.clamp(lt / Math.max(S.dur, 1), 0, 1));
      var pan = C.pan ? K.lerp(C.pan[0], C.pan[1], k) : 0, z = C.zoom ? K.lerp(C.zoom[0], C.zoom[1], k) : 1, y = C.y ? K.lerp(C.y[0], C.y[1], k) : 0;
      if (focus !== null) pan += (focus - 960) * (z - 1) / z * 1.2;
      if (o.scroll) pan += o.scroll(lt);
      var sx = 0, sy = 0;
      Wd.shakes.forEach(function (s) { var u = lt - s.t; if (u > 0 && u < s.d) { var a = s.a * (1 - u / s.d); sx += (noise(Math.floor(lt * 30) + 1) - 0.5) * 2 * a; sy += (noise(Math.floor(lt * 30) + 7) - 0.5) * 2 * a; } });
      Wd.punches.forEach(function (s) { var u = lt - s.t; if (u > 0) z *= 1 + 0.12 * Math.exp(-u * 3) * K.clamp(u / 0.08, 0, 1); });
      Wd.layers.forEach(function (L) {
        var d = L.d, zz = 1 + (z - 1) * Math.min(d, 1.3), px = -pan * d;
        if (o.loop) { px = -(((pan * d) % WW) + WW) % WW; }
        L.el.style.transform = 'translate(' + (px + sx).toFixed(1) + 'px,' + (y * d + sy).toFixed(1) + 'px) scale(' + zz.toFixed(4) + ')';
      });
    };
    S.camFn = Wd.cam;
    S.every(function (lt) {
      var heavy = Wd.fx.flicker;
      for (var i = 0; i < Wd.flick.length; i++) Wd.flick[i].style.opacity = flick(lt, +Wd.flick[i].getAttribute('data-s') || i, heavy);
      for (var j = 0; j < Wd.fans.length; j++) { var f = Wd.fans[j]; f.setAttribute('transform', 'rotate(' + ((lt * 380) % 360).toFixed(1) + ' ' + f.getAttribute('data-x') + ' ' + f.getAttribute('data-y') + ')'); }
      var wind = Wd.fx.wind ? 3 : 1;
      for (var m = 0; m < Wd.sways.length; m++) { var w = Wd.sways[m], x = +w.getAttribute('data-x'); w.setAttribute('transform', 'rotate(' + (Math.sin(lt * (0.9 + wind * 0.4) + x * 0.01) * (+w.getAttribute('data-a')) * wind).toFixed(2) + ' ' + x + ' ' + w.getAttribute('data-y') + ')'); }
    });
    return Wd;
  }

  // ───────── atmosphere ─────────
  function fx(S, p, P, Wd) {
    var list = (p.fx || []).map(function (f) { return typeof f === 'string' ? { kind: f } : f; });
    var L = Wd.R.L, fogC = SE.mix(L.fog, '#FFFFFF', Wd.night ? 0.25 : 0.4);
    list.forEach(function (f, i) {
      var k = f.kind; Wd.fx[k] = true;
      var ats = f.at === undefined || f.at === null ? [] : Array.isArray(f.at) ? f.at : [f.at];
      if (k === 'fog' || k === 'mist') {
        var bands = [0, 1, 2].map(function (j) {
          var b = S.add('mid', el('div', 'fx', 'top:' + (520 + j * 150) + 'px;height:' + (380 - j * 40) + 'px;left:-600px;width:3200px;opacity:' + (f.amount || 0.5) * (0.55 + j * 0.2) + ';background:radial-gradient(ellipse 50% 50% at 25% 50%,' + fogC + ' 0,rgba(0,0,0,0) 70%),radial-gradient(ellipse 40% 50% at 70% 50%,' + fogC + ' 0,rgba(0,0,0,0) 70%)'));
          return b;
        });
        S.every(function (lt) { bands.forEach(function (b, j) { b.style.transform = 'translateX(' + ((Math.sin(lt * 0.08 + j * 2) * 260) - lt * (12 + j * 10)).toFixed(1) + 'px)'; }); });
      } else if (k === 'rain') {
        var g = ''; for (var r = 0; r < 220; r++) { var x = noise(r) * 2100, y = noise(r + 400) * 1300 - 200, l = 30 + noise(r + 800) * 40; g += '<path d="M' + x.toFixed(0) + ' ' + y.toFixed(0) + ' l-' + (l * 0.18).toFixed(0) + ' ' + l.toFixed(0) + '" stroke="#C9D6E8" stroke-opacity="' + (0.18 + noise(r + 9) * 0.35).toFixed(2) + '" stroke-width="2"/>'; }
        var rn = S.add('mid', el('div', 'fx', 'height:2400px;top:-1300px', K.svg(1920, 1300, g) + K.svg(1920, 1300, g)));
        var dim = S.add('bg', el('div', 'fx', 'background:#0A1018;opacity:.18;z-index:5'));
        S.every(function (lt) { rn.style.transform = 'translate(' + ((lt * 260) % 230).toFixed(0) + 'px,' + ((lt * 1500) % 1300).toFixed(0) + 'px)'; });
        S.sfx(0.05, 'rain', f.vol || 1, S.dur);
      } else if (k === 'lightning') {
        var fl = S.add('fg', el('div', 'fx', 'background:#E9F0FF;opacity:0;mix-blend-mode:screen'));
        if (!ats.length) ats = [S.slot(0, 1, 0.3)];
        S.every(function (lt) { var o = 0; ats.forEach(function (t) { var u = lt - t; if (u >= 0 && u < 0.9) o = Math.max(o, u < 0.06 ? 0.85 : u < 0.12 ? 0.15 : u < 0.2 ? 0.7 : 0.7 * Math.exp(-(u - 0.2) * 6)); }); fl.style.opacity = o.toFixed(3); });
        ats.forEach(function (t) { S.sfx(t + 0.25, 'thunder', 1); });
      } else if (k === 'shake') { (ats.length ? ats : [S.slot(0, 1, 0.4)]).forEach(function (t) { Wd.shakes.push({ t: t, d: f.dur || 0.8, a: f.amp || 14 }); });
      } else if (k === 'scare') {
        (ats.length ? ats : [S.slot(0, 1, 0.5)]).forEach(function (t) { Wd.punches.push({ t: t }); Wd.shakes.push({ t: t, d: 0.5, a: 18 }); S.sfx(t - 0.05, 'stinger', 1); });
        var rf = S.add('fg', el('div', 'fx', 'background:#9E1B14;mix-blend-mode:multiply;opacity:0'));
        S.every(function (lt) { var o = 0; ats.forEach(function (t) { var u = lt - t; if (u >= 0) o = Math.max(o, 0.55 * Math.exp(-u * 4)); }); rf.style.opacity = o.toFixed(3); });
      } else if (k === 'dark' || k === 'lightsout') {
        var dk = S.add('fg', el('div', 'fx', 'background:#000;opacity:0'));
        var t0 = ats[0] !== undefined ? ats[0] : S.slot(0, 1, 0.6), lvl = f.level || 0.88;
        S.every(function (lt) { var u = lt - t0; dk.style.opacity = u < 0 ? 0 : (k === 'lightsout' ? (u < 0.5 ? (noise(Math.floor(lt * 20)) < 0.5 ? lvl : 0.1) : lvl) : lvl * K.clamp(u / 1.2, 0, 1)).toFixed(3); });
        if (k === 'lightsout') S.sfx(t0, 'switch', 1);
      } else if (k === 'torch') {
        Wd.torch = { who: f.who, x: f.x, y: f.y, r: f.r || 380, el: S.add('mid', el('div', 'fx', '')) };
      } else if (k === 'heartbeat') {
        var hb = ats[0] !== undefined ? ats[0] : 0.2;
        for (var h = 0; h < (f.n || 6); h++) S.sfx(hb + h * 0.85, 'heart', 1);
      } else if (k === 'dust' || k === 'fireflies' || k === 'embers') {
        var n = k === 'dust' ? 40 : 26, dots = '';
        var col = k === 'fireflies' ? '#E9F27A' : k === 'embers' ? '#FF8A3C' : '#FFFFFF';
        for (var q = 0; q < n; q++) dots += '<circle class="pt" cx="0" cy="0" r="' + (k === 'dust' ? 1.5 + noise(q) * 2 : 3 + noise(q) * 3) + '" fill="' + col + '"/>';
        var box = S.add('mid', el('div', 'fx', '', K.svg(1920, 1080, (k !== 'dust' ? '<defs><filter id="glow' + S.d.i + '"><feGaussianBlur stdDeviation="4"/></filter></defs>' : '') + '<g' + (k !== 'dust' ? ' style="filter:url(#glow' + S.d.i + ')"' : '') + '>' + dots + '</g>')));
        var pts = [].slice.call(box.querySelectorAll('.pt'));
        S.every(function (lt) { pts.forEach(function (c, q) { var x = (noise(q + 1) * 1920 + Math.sin(lt * 0.3 + q) * 60 + lt * (k === 'embers' ? 10 : 6)) % 1920, y = k === 'embers' ? 1080 - ((noise(q + 2) * 1080 + lt * 60) % 1080) : noise(q + 2) * 900 + 80 + Math.sin(lt * 0.5 + q * 2) * 40; c.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')'); c.setAttribute('opacity', (k === 'dust' ? 0.25 : 0.4 + 0.6 * Math.max(0, Math.sin(lt * 2 + q * 1.7))).toFixed(2)); }); });
      } else if (k === 'wind') { S.sfx(0.05, 'wind', f.vol || 1, S.dur); }
      if (k === 'crickets') S.sfx(0.05, 'crickets', f.vol || 1, S.dur);
    });
    if (Wd.night && genre() === 'horror' && !Wd.fx.nocrickets && (Wd.name === 'village' || Wd.name === 'forest' || Wd.name === 'highway' || Wd.name === 'haveli') && !Wd.fx.crickets && !Wd.fx.rain) S.sfx(0.05, 'crickets', 0.6, S.dur);
  }

  // ───────── cast ─────────
  function cast(S, p, P, Wd) {
    var people = (p.cast || []).map(function (c) { return typeof c === 'string' ? { id: c, preset: c } : c; });
    var acts = (p.do || []).slice().sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
    var n = people.length, interior = Wd.R.interior, plain = Wd.name === 'plain' || Wd.name === 'black';
    var tint = Wd.time === 'night' ? (genre() === 'horror' ? 'tint-horror' : 'tint-night') : Wd.time === 'dusk' ? 'tint-dusk' : '';
    var pos = {};
    people.forEach(function (c, i) {
      var id = c.id || c.preset || 'p' + i;
      var x0 = c.x !== undefined ? c.x : (n === 1 ? 960 : 420 + i * (1080 / Math.max(1, n - 1)));
      var look = Object.assign({ preset: c.preset || 'founder' }, c.look || {});
      if (!PE.PRESET[look.preset]) look.preset = 'founder';
      var depth = K.clamp(c.depth || 0, 0, 1); // 0 = front, 1 = far back: smaller and higher up the ground
      var scale = (c.scale || (plain ? (p.title ? 0.9 : 1) : interior ? 0.88 : 0.66)) * PE.bodyScale(look) * (1 - depth * 0.62);
      var tone = c.tone || (look.preset === 'ghost-f' ? 'ghost' : look.preset === 'shadow' ? 'none' : '');
      var filt = tone === 'ghost' ? 'url(#tint-ghost)' : tone === 'shadow' || tone === 'silhouette' ? 'url(#tint-shadow)' : tone === 'none' || !tint ? '' : 'url(#' + tint + ')';
      var floor = c.y !== undefined ? c.y : Wd.floor - depth * (Wd.floor - (Wd.R.horizon || 700)) * 0.85;
      var holder = el('div', 'person-svg', 'left:0;top:0;width:' + WW + 'px;height:1080px;z-index:' + Math.round(50 - depth * 40) + ';' + (filt ? 'filter:' + filt : ''));
      Wd.stage.appendChild(holder);
      var tag = c.tag ? el('div', 'chip', 'position:absolute;top:' + (floor + 26) + 'px;font-size:26px;white-space:nowrap') : null;
      if (tag) { tag.innerHTML = K.esc(c.tag); Wd.stage.appendChild(tag); }
      var mine = acts.filter(function (a) { return a.who === id; });
      var enter = c.enter || (tone === 'ghost' || look.preset === 'shadow' ? 'fade' : i % 2 ? 'right' : 'left');
      var tIn = S.at(c.at, 0.1 + i * 0.15);
      var bubbles = [];
      mine.forEach(function (a) {
        if (a.say) {
          var b = el('div', 'bubble', 'opacity:0', K.rich(a.say)); Wd.stage.appendChild(b);
          bubbles.push({ el: b, t: a.at || 0, end: (a.at || 0) + (a.hold || 2.6) });
          S.sfx(a.at || 0, genre() === 'horror' ? null : 'pop', 0.4);
        }
        if (a.appear !== undefined || a.vanish !== undefined) S.sfx(a.at || 0, 'whoosh-low', 0.8);
      });
      var seed = i * 1.37 + 0.4;
      S.every(function (lt) {
        var x = x0, walking = false, running = false, flip = !!c.flip;
        var ek = K.E.out(K.clamp((lt - tIn) / (enter === 'fade' ? 1.2 : 0.6), 0, 1));
        var ent = enter === 'none' || enter === 'fade' ? 0 : (1 - ek) * (enter === 'left' ? -560 : enter === 'right' ? 560 : 0);
        var dy = enter === 'up' ? (1 - ek) * 300 : 0;
        var op = enter === 'fade' ? ek : ek > 0 ? 1 : 0;
        mine.forEach(function (a) {
          if (a.move !== undefined) {
            var from = x, to = a.move, sp = a.run ? 980 : 520, d = a.dur || Math.max(0.6, Math.abs(to - from) / sp), t = a.at || 0;
            if (lt >= t + d) x = to; else if (lt > t) { x = K.lerp(from, to, a.run ? K.clamp((lt - t) / d, 0, 1) : K.E.io((lt - t) / d)); walking = true; running = !!a.run; flip = to < from; }
          }
          if (a.flip !== undefined && lt >= (a.at || 0)) flip = a.flip;
          if (a.vanish !== undefined && lt >= (a.at || 0)) op = Math.min(op, 1 - K.clamp((lt - a.at) / (a.vanish || 0.4), 0, 1));
          if (a.appear !== undefined && lt < (a.at || 0)) op = 0;
          if (a.appear !== undefined && lt >= (a.at || 0)) op = Math.min(op, K.clamp((lt - a.at) / (a.appear || 0.15), 0, 1));
        });
        var pose = PE.POSES[c.pose || (tone === 'ghost' ? 'float' : 'idle')], prevPose = pose, face = c.face || (genre() === 'horror' ? 'flat' : 'happy'), prop = c.prop, kpose = 1;
        mine.forEach(function (a) {
          var t = a.at || 0;
          if (lt >= t) {
            if (a.pose) { prevPose = pose; pose = PE.POSES[a.pose] || pose; kpose = K.clamp((lt - t) / 0.3, 0, 1); }
            if (a.face) face = a.face;
            if (a.prop !== undefined) prop = a.prop;
          }
        });
        var P2 = PE.mix(prevPose, pose, K.E.io(kpose));
        if (tone !== 'ghost' && (walking || (ek < 1 && enter !== 'none' && enter !== 'fade' && enter !== 'up'))) { var ph = Math.sin(lt * (running ? 15 : 9) + seed); P2 = PE.mix(PE.POSES[running ? 'run1' : 'walk1'], PE.POSES[running ? 'run2' : 'walk2'], (ph + 1) / 2); }
        P2.tilt = (P2.tilt || 0) + Math.sin(lt * 1.6 + seed) * 2;
        P2.l = [P2.l[0] + Math.sin(lt * 2 + seed) * 1.5, P2.l[1]];
        var blink = ((lt + seed * 2.3) % 3.7) < 0.12;
        var talk = bubbles.some(function (b) { return lt >= b.t && lt < b.end; }) && Math.floor(lt * 8) % 2 === 0;
        var bob = walking ? Math.abs(Math.sin(lt * (running ? 15 : 9) + seed)) * -10 : Math.sin(lt * 1.6 + seed) * 2;
        if (tone === 'ghost') { bob = -40 + Math.sin(lt * 1.3 + seed) * 12; op *= 0.72 + 0.28 * flick(lt, seed * 9, false) * (0.85 + 0.15 * Math.sin(lt * 7)); }
        var X = x + ent + OFF, Y = floor + dy + bob;
        pos[id] = { x: X - OFF, y: Y - 330 * scale };
        holder.style.opacity = op;
        var shadowE = tone === 'ghost' || plain && genre() === 'explainer' ? '' : '<ellipse cx="0" cy="' + (-bob + 4).toFixed(1) + '" rx="' + (110 * scale / 0.66).toFixed(0) + '" ry="' + (16 * scale / 0.66).toFixed(0) + '" fill="#000" opacity=".28"/>';
        holder.innerHTML = '<svg width="' + WW + '" height="1080" style="overflow:visible"><g transform="translate(' + X.toFixed(1) + ' ' + Y.toFixed(1) + ')">' + shadowE + '<g transform="scale(' + (flip ? -scale : scale) + ' ' + scale + ')">' + PE.svg(look, P2, face, { blink: blink, talk: talk, prop: prop, sign: c.sign, t: lt }) + '</g></g></svg>';
        if (plain && genre() === 'explainer') holder.style.filter = 'url(#paperedge)';
        if (tag) { tag.style.left = (X - 80) + 'px'; tag.style.opacity = op; }
        bubbles.forEach(function (b) {
          var k = lt < b.t ? 0 : lt < b.t + 0.25 ? (lt - b.t) / 0.25 : lt < b.end ? 1 : Math.max(0, 1 - (lt - b.end) / 0.2);
          b.el.style.opacity = k * (op > 0 ? 1 : 0); b.el.style.transform = 'scale(' + (0.7 + 0.3 * k) + ')';
          var right = X - OFF > 1100;
          b.el.className = 'bubble' + (right ? ' r' : '');
          b.el.style.left = (Math.max(30, Math.min(1890 - 520, right ? X - OFF - 520 + 40 : X - OFF - 70)) + OFF) + 'px';
          b.el.style.top = 'auto'; b.el.style.bottom = (1080 - (Y - 640 * scale - 14)) + 'px';
          b.el.style.transformOrigin = right ? '90% 100%' : '10% 100%';
        });
      });
    });
    if (Wd.torch) {
      var T = Wd.torch;
      S.every(function (lt) { var q = T.who && pos[T.who] ? pos[T.who] : { x: T.x || 960, y: T.y || 540 }; var r = T.r * (1 + 0.03 * Math.sin(lt * 9)); T.el.style.background = 'radial-gradient(circle at ' + (q.x + (T.dx || 140)).toFixed(0) + 'px ' + q.y.toFixed(0) + 'px,rgba(0,0,0,0) 0,rgba(0,0,0,0) ' + (r * 0.5).toFixed(0) + 'px,rgba(0,0,0,.82) ' + r.toFixed(0) + 'px)'; });
    }
    return pos;
  }

  // ───────── vehicles inside a scene ─────────
  var VSCALE = { scooter: 1.4, bike: 1.4, auto: 1.5, car: 1.5, truck: 1.6, bus: 1.5 };
  function litVehicle(node, Wd) { // body takes the scene's light; headlight beams stay bright
    var f = Wd.time === 'night' ? (genre() === 'horror' ? 'tint-horror' : 'tint-night') : Wd.time === 'dusk' ? 'tint-dusk' : '';
    if (f) [].forEach.call(node.querySelectorAll('.vbody'), function (b) { b.style.filter = 'url(#' + f + ')'; });
  }
  function vehicles(S, p, Wd) {
    (p.vehicles || []).forEach(function (v, i) {
      var sc = v.scale || VSCALE[v.kind || 'car'] || 1.5, flip = v.flip || (v.to !== undefined && v.to < v.x);
      var holder = el('div', '', 'position:absolute;left:0;top:0'); Wd.stage.appendChild(holder);
      holder.innerHTML = K.svg(1, 1, '<g class="veh">' + SE.vehicle(v.kind || 'car', { color: v.color, accent: v.accent, label: v.label, night: Wd.night || Wd.time === 'dusk' }) + '</g>', 'overflow:visible;position:absolute;left:0;top:0');
      var g = holder.querySelector('.veh'), wheels = [].slice.call(holder.querySelectorAll('.whl'));
      litVehicle(holder, Wd);
      var ats = Array.isArray(v.at) ? v.at : [v.at === undefined ? 0.3 : v.at];
      var t0 = ats[0] === null || ats[0] === undefined ? 0.3 : ats[0], t1 = ats[1] !== undefined && ats[1] !== null ? ats[1] : t0 + Math.abs((v.to || v.x) - v.x) / 700;
      var y = v.y !== undefined ? v.y : Wd.floor - 40;
      S.every(function (lt) {
        var k = v.to === undefined ? 0 : K.E.io(K.clamp((lt - t0) / Math.max(0.3, t1 - t0), 0, 1));
        var x = K.lerp(v.x, v.to === undefined ? v.x : v.to, k) + OFF, dist = Math.abs(x - v.x - OFF);
        var bob = Math.sin(lt * 23 + i) * (k > 0 && k < 1 ? 1.5 : 0);
        g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + (y + bob).toFixed(1) + ') scale(' + (flip ? -sc : sc) + ' ' + sc + ')');
        wheels.forEach(function (w) { w.setAttribute('transform', 'rotate(' + (dist * 2.4 % 360).toFixed(1) + ' ' + w.getAttribute('data-x') + ' ' + w.getAttribute('data-y') + ')'); });
      });
      if (v.to !== undefined) S.sfx(t0, v.kind === 'scooter' || v.kind === 'bike' ? 'engine' : 'carpass', 0.8);
    });
  }

  // ───────── screen overlays: title, labels, counter, notification cards ─────────
  function overlays(S, p, P) {
    if (p.title) {
      var t = S.add('mid', el('div', 'k', 'position:absolute;left:96px;top:72px;max-width:1300px;font-size:84px;line-height:1;padding:16px 26px 8px;background:var(--deep);color:var(--ondeep);border-radius:6px', K.rich(p.title)));
      S.fit(t, 1300); S.anim(t, 'wipe', 0.1, 0.5);
      if (p.sub) { var s = S.add('mid', el('div', '', 'position:absolute;left:96px;top:190px;font:500 34px/1.3 var(--fb);color:var(--ondeep);background:rgba(0,0,0,.55);padding:8px 18px;border-radius:6px', K.rich(p.sub))); S.anim(s, 'rise', 0.4, 0.5, { dist: 20 }); }
    }
    (p.labels || []).forEach(function (L, i) {
      var t = S.at(L.at, S.slot(i, (p.labels || []).length, 0.1, 0.6));
      var n = S.add('mid', el('div', 'lab' + (L.ac ? ' ac' : ''), 'left:' + (L.x || 200) + 'px;top:' + (L.y || 300) + 'px', (L.icon ? K.icon(L.icon, 'currentColor', 34) : '') + '<span>' + K.rich(L.text) + (L.sub ? ' <small>' + K.esc(L.sub) + '</small>' : '') + '</span>'));
      S.anim(n, 'pop', t, 0.4); S.sfx(t, 'pop', 0.5);
    });
    if (p.count) {
      var c = p.count, tc = S.at(c.at, S.slot(0, 1, 0.35));
      var box = S.add('mid', el('div', 'counter' + (c.bad ? ' bad' : ''), '', '<b>' + K.esc(c.value) + '</b><small>' + K.esc(c.label || '') + '</small>'));
      S.anim(box, 'pop', tc, 0.45); if (K.parseNum(c.value)) { S.anim(box.firstChild, 'count', tc, 1.2); S.sfx(tc, 'counter', 0.5); }
    }
    var cards = typeof p.cards === 'number' ? Array.from({ length: p.cards }, function (_, i) { return { title: 'New order', text: ['Milk, bread, eggs', 'Chips x2, Coke', 'Atta 5 kg', 'Maggi x4'][i % 4] }; }) : p.cards || [];
    cards.forEach(function (o, i) {
      var t = S.at(o.at, S.slot(i, cards.length, 0.12, 0.65));
      var n = S.add('fg', el('div', 'ncard', 'right:64px;top:' + (180 + i * 112) + 'px', '<div class="dot">' + K.icon(o.icon || 'bell-ringing', '#fff', 30) + '</div><div><b>' + K.esc(o.title || '') + '</b>' + K.esc(o.text || '') + '</div>'));
      S.anim(n, 'right', t, 0.45, { dist: 220 }); S.sfx(t, 'ding', 0.35);
    });
  }

  function scene(S, p, P) {
    var Wd = world(S, p, P);
    vehicles(S, p, Wd);
    cast(S, p, P, Wd);
    overlays(S, p, P);
    S.popZone = { x: 96, y: 860, w: 700 };
  }
  Engine.layout('scene', scene);
  Engine.layout('people', function (S, p, P) { if (!p.set) p = Object.assign({ set: 'plain' }, p); scene(S, p, P); });

  // ───────── RIDE: side-scrolling journey A -> B ─────────
  Engine.layout('ride', function (S, p, P) {
    var ats = Array.isArray(p.at) ? p.at : [p.at];
    var go = ats[0] !== undefined && ats[0] !== null ? ats[0] : S.slot(0, 1, 0.12), arrive = ats[1] !== undefined && ats[1] !== null ? ats[1] : Math.max(go + 2.5, S.speech[1] - 0.6);
    var D = arrive - go, V = 900; // px/s cruising at depth 1
    var dist = function (lt) { // ease in / cruise / ease out
      var u = K.clamp((lt - go) / D, 0, 1), a = 0.18;
      var full = 1 - a; // area under the trapezoid profile, normalised
      var s = u < a ? (u * u) / (2 * a) : u > 1 - a ? (full - Math.pow(1 - u, 2) / (2 * a)) : (u - a / 2);
      return s / full * D * V * 0.82;
    };
    var Wd = world(S, Object.assign({ cam: 'still' }, p, { set: p.set || (genre() === 'horror' ? 'highway' : 'street'), opts: Object.assign({ dhaba: false }, p.opts || {}) }), P, { loop: true, scroll: dist });
    var night = Wd.night || Wd.time === 'dusk';
    var vk = p.vehicle || 'scooter', sc = p.scale || VSCALE[vk] || 1.4;
    var vh = S.add('mid', el('div', '', 'position:absolute;left:0;top:0', K.svg(1, 1, '<g class="veh">' + SE.vehicle(vk, { color: p.color, accent: p.accent || P.accent, label: p.label, night: night, helmet: p.helmet }) + '</g>', 'overflow:visible;position:absolute;left:0;top:0')));
    var g = vh.querySelector('.veh'), wheels = [].slice.call(vh.querySelectorAll('.whl'));
    litVehicle(vh, Wd);
    var vx = p.x || 700, vy = Wd.floor - 30;
    S.every(function (lt) {
      var s = dist(lt), moving = lt > go && lt < arrive;
      var lean = moving ? K.clamp((lt - go) / 0.4, 0, 1) * (1 - K.clamp((lt - arrive + 0.5) / 0.5, 0, 1)) : 0;
      var bob = moving ? Math.sin(lt * 26) * 1.6 : 0;
      g.setAttribute('transform', 'translate(' + (vx + lean * 40).toFixed(1) + ' ' + (vy + bob).toFixed(1) + ') scale(' + sc + ')');
      wheels.forEach(function (w) { w.setAttribute('transform', 'rotate(' + ((s / sc) * 2.2 % 360).toFixed(1) + ' ' + w.getAttribute('data-x') + ' ' + w.getAttribute('data-y') + ')'); });
    });
    S.sfx(go, vk === 'scooter' || vk === 'bike' || vk === 'auto' ? 'engine' : 'drive', 1, arrive - go + 0.4);
    // from / to markers ride with the ground
    var mk = function (o, x0, ac) {
      var n = S.add('mid', el('div', 'lab' + (ac ? ' ac' : ''), 'left:0;top:' + (Wd.floor - 330) + 'px', (o.icon ? K.icon(o.icon, 'currentColor', 32) : K.icon(ac ? 'map-pin' : 'storefront', 'currentColor', 32)) + '<span>' + K.esc(o.label || '') + '</span>'));
      return function (lt) { n.style.transform = 'translateX(' + (x0 - dist(lt)).toFixed(1) + 'px)'; };
    };
    var moveFrom = p.from ? mk(p.from, vx - 120, false) : null;
    var total = dist(arrive + 5);
    var moveTo = p.to ? mk(p.to, vx + 260 + total, true) : null;
    S.every(function (lt) { if (moveFrom) moveFrom(lt); if (moveTo) moveTo(lt); });
    if (p.title) overlays(S, { title: p.title, sub: p.sub }, P);
    if (p.timer !== false && p.timer !== undefined) {
      var tm = S.add('mid', el('div', 'counter', '', K.icon('clock', 'currentColor', 44) + '<b>0:00</b><small>' + K.esc(p.timerLabel || '') + '</small>'));
      var pn = String(p.timer).match(/([\d.]+)\s*(min|m|s|hr|h)?/), secs = pn ? parseFloat(pn[1]) * ((pn[2] || 'min')[0] === 'h' ? 3600 : (pn[2] || 'min')[0] === 'm' ? 60 : 1) : 600;
      S.every(function (lt) { var k = K.clamp((lt - go) / D, 0, 1), v = secs * k; tm.children[1].textContent = v >= 3600 ? Math.floor(v / 3600) + ':' + String(Math.floor(v % 3600 / 60)).padStart(2, '0') + 'h' : Math.floor(v / 60) + ':' + String(Math.floor(v % 60)).padStart(2, '0'); });
    }
    if (p.dist) { var dd = S.add('mid', el('div', 'lab', 'right:64px;top:170px;left:auto', K.icon('path', 'currentColor', 30) + '<span>' + K.esc(p.dist) + '</span>')); dd.style.position = 'absolute'; S.anim(dd, 'pop', go + 0.3, 0.4); }
    if (p.done !== false && p.done !== undefined) { var st = S.add('fg', el('div', 'lab ac', 'left:' + (vx + 170) + 'px;top:' + (Wd.floor - 470) + 'px;font-size:44px', K.icon('check-circle', '#fff', 44) + '<span>' + K.esc(p.done) + '</span>')); S.anim(st, 'stamp', arrive + 0.15, 0.4); S.sfx(arrive + 0.15, 'ding', 0.6); }
    S.popZone = { x: 96, y: 860, w: 700 };
  });

  // ───────── CASH: grow | burn | flow (flat 2D) ─────────
  function bundle(x, y, w, note, band) { return '<g><rect x="' + x + '" y="' + y + '" width="' + w + '" height="26" rx="4" fill="' + note + '"/><rect x="' + (x + 4) + '" y="' + (y + 4) + '" width="' + (w - 8) + '" height="18" rx="2" fill="none" stroke="' + SE.shade(note, 0.75) + '" stroke-width="2"/><rect x="' + (x + w * 0.42) + '" y="' + y + '" width="' + (w * 0.16) + '" height="26" fill="' + band + '"/></g>'; }
  Engine.layout('cash', function (S, p, P) {
    var mode = p.mode || 'grow', note = '#8FBF7A', band = '#E9E2C8';
    var Wd = world(S, Object.assign({}, p, { set: p.set || 'plain', cam: p.cam || 'in' }), P);
    var holder = el('div', '', 'position:absolute;left:0;top:0'); Wd.stage.appendChild(holder);
    var cx = 960 + OFF, base = Wd.floor - 10, tv = S.at(p.at, S.slot(0, 1, 0.15));
    if (p.title) overlays(S, { title: p.title, sub: p.sub }, P);
    if (p.value) overlays(S, { count: { value: p.value, label: p.label, at: tv, bad: mode === 'burn' } }, P);
    if (mode === 'flow') {
      var A = p.from || { label: 'Customer' }, B = p.to || { label: 'Company' }, ax = 420, bx = 1500, ny = 560;
      [[A, ax], [B, bx]].forEach(function (q, i) {
        var n = S.add('mid', el('div', '', 'position:absolute;left:' + (q[1] - 150) + 'px;top:' + (ny - 150) + 'px;width:300px;text-align:center', '<div style="width:220px;height:220px;margin:0 auto;border-radius:50%;background:' + (i ? P.accent : 'var(--deep)') + ';display:flex;align-items:center;justify-content:center">' + K.icon(q[0].icon || (i ? 'buildings' : 'user'), '#fff', 110) + '</div><div class="k" style="font-size:54px;margin-top:22px;color:var(--ink)">' + K.esc(q[0].label) + '</div>'));
        S.fit(n.lastChild, 300); S.anim(n, 'pop', 0.15 + i * 0.25, 0.45);
      });
      var arc = 'M' + (ax + 130) + ' ' + (ny - 40) + ' Q960 ' + (ny - 330) + ' ' + (bx - 130) + ' ' + (ny - 40);
      var notes = '';
      for (var i = 0; i < 6; i++) notes += '<g class="fn"><rect x="-44" y="-24" width="88" height="48" rx="5" fill="' + note + '"/><circle r="11" fill="' + SE.shade(note, 0.75) + '"/></g>';
      var svgN = S.add('mid', el('div', 'fx', '', K.svg(1920, 1080, '<path d="' + arc + '" stroke="var(--ink)" stroke-opacity=".25" stroke-width="5" stroke-dasharray="4 16" stroke-linecap="round" fill="none"/>' + notes)));
      var fns = [].slice.call(svgN.querySelectorAll('.fn'));
      var qp = function (u) { var x0 = ax + 130, y0 = ny - 40, x2 = bx - 130, y2 = y0; return [(1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * 960 + u * u * x2, (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * (ny - 330) + u * u * y2]; };
      S.every(function (lt) { fns.forEach(function (f, i) { var u = (lt - tv) * 0.55 - i / 6; if (u < 0) { f.setAttribute('opacity', 0); return; } u = u % 1; var q = qp(u); f.setAttribute('opacity', Math.min(1, Math.sin(u * Math.PI) * 3).toFixed(2)); f.setAttribute('transform', 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ') rotate(' + ((u - 0.5) * 40).toFixed(1) + ')'); }); });
      if (p.edge) { var e = S.add('mid', el('div', 'lab ac', 'left:760px;top:' + (ny - 300) + 'px', '<span>' + K.esc(p.edge) + '</span>')); S.fit(e, 600); S.anim(e, 'pop', tv + 0.6, 0.4); }
      S.sfx(tv, 'cash', 0.7);
      return;
    }
    // grow / burn: stacks of bundles on the floor
    var stacks = mode === 'burn' ? [[-240, 6], [-120, 8], [0, 9], [120, 8], [240, 6]] : [[-360, 6], [-180, 9], [0, 12], [180, 15], [360, 19]];
    S.every(function (lt) {
      var g = '';
      stacks.forEach(function (st, j) {
        var n = mode === 'grow' ? Math.floor(st[1] * K.clamp((lt - tv - j * 0.18) / 1.4, 0, 1)) : st[1];
        if (mode === 'burn') n = Math.ceil(st[1] * (1 - 0.55 * K.clamp((lt - tv) / Math.max(2, S.dur - tv), 0, 1)));
        for (var b = 0; b < n; b++) g += bundle(cx + st[0] - 46 + (b % 2) * 3, base - 28 - b * 27 - (mode === 'burn' && Math.abs(st[0]) > 150 ? 0 : 0), 92, note, band);
      });
      if (mode === 'burn' && lt > tv) {
        var fl = '';
        var grow = K.clamp((lt - tv) / 0.6, 0, 1), fb = base - 120;
        var tongue = function (x0, h, w, sw, col) { var tipx = x0 + sw; return '<path d="M' + (x0 - w / 2).toFixed(1) + ' ' + fb + ' C' + (x0 - w * 0.62).toFixed(1) + ' ' + (fb - h * 0.45).toFixed(1) + ' ' + (tipx - w * 0.15).toFixed(1) + ' ' + (fb - h * 0.7).toFixed(1) + ' ' + tipx.toFixed(1) + ' ' + (fb - h).toFixed(1) + ' C' + (tipx + w * 0.18).toFixed(1) + ' ' + (fb - h * 0.62).toFixed(1) + ' ' + (x0 + w * 0.62).toFixed(1) + ' ' + (fb - h * 0.4).toFixed(1) + ' ' + (x0 + w / 2).toFixed(1) + ' ' + fb + ' Q' + x0 + ' ' + (fb + w * 0.35).toFixed(1) + ' ' + (x0 - w / 2).toFixed(1) + ' ' + fb + 'Z" fill="' + col + '"/>'; };
        [['#E8451E', 1.0, 120], ['#FF8A1F', 0.72, 90], ['#FFD04A', 0.42, 60]].forEach(function (layer, li) {
          for (var f = 0; f < 6; f++) { var fx0 = cx - 230 + f * 92 + (li % 2) * 30, h = (230 + noise(f + li * 7) * 190) * layer[1] * (0.85 + 0.18 * Math.sin(lt * (7 + f * 1.3) + f + li)) * grow; fl += tongue(fx0, h, layer[2], Math.sin(lt * 4.2 + f * 1.7 + li) * 22, layer[0]); }
        });
        fl = '<g opacity=".95">' + fl + '</g>';
        for (var q = 0; q < 6; q++) { var u = ((lt - tv) * 0.35 + q / 6) % 1; fl += '<circle cx="' + (cx - 120 + q * 50 + Math.sin(u * 6 + q) * 40) + '" cy="' + (base - 260 - u * 520) + '" r="' + (40 + u * 70) + '" fill="#5A5A5A" opacity="' + (0.35 * (1 - u)).toFixed(2) + '"/>'; }
        g += fl;
      }
      holder.innerHTML = K.svg(WW, 1080, g, 'position:absolute;left:0;top:0');
    });
    if (mode === 'burn') S.sfx(tv, 'fire', 1, S.dur - tv); else S.sfx(tv, 'cash', 0.7);
  });
})();
