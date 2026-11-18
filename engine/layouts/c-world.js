// c-world.js — map, timeline, photo, headlines, logos, flow, phone
(function () {
  var L = Engine.layout, K = Engine.Kit, el = K.el;

  // MAP of India (official boundaries): highlight states, drop city pins, draw routes, count up a number
  L('map', function (S, p, P) {
    var M = window.YT_MAP;
    if (p.title) K.title(S, p.title, p.sub, { x: 1040, y: 110, w: 800 });
    var sc = 980 / M.h, ox = p.title ? 130 : 480, oy = 50;
    var alias = { 'Delhi': 'NCT of Delhi', 'Arunachal Pradesh': 'Arunanchal Pradesh', 'Andaman and Nicobar': 'Andaman & Nicobar Island', 'Jammu and Kashmir': 'Jammu & Kashmir', 'Ladakh': 'Jammu & Kashmir', 'Odisha': 'Odisha', 'Orissa': 'Odisha' };
    var hs = (p.states || []).map(function (s) { return alias[s] || s; });
    var g = '<g transform="translate(' + ox + ' ' + oy + ') scale(' + sc + ')">';
    Object.keys(M.states).forEach(function (n) {
      var on = hs.indexOf(n) >= 0;
      g += '<path class="' + (on ? 'st on' : 'st') + '" data-n="' + K.esc(n) + '" d="' + M.states[n] + '" fill="' + (on ? P.accent : P.card) + '" stroke="' + P.ink + '" stroke-width="' + (1.6 / sc).toFixed(2) + '" stroke-linejoin="round"/>';
    });
    g += '</g>';
    var map = S.add('mid', el('div', '', 'position:absolute;left:0;top:0;filter:drop-shadow(0 18px 22px rgba(19,41,61,.25))', K.svg(1920, 1080, g)));
    S.anim(map, 'rise', 0, 0.6, { dist: 40 });
    var on = map.querySelectorAll('.st.on');
    hs.forEach(function (n, i) {
      var node = map.querySelector('.st.on[data-n="' + n + '"]'); if (!node) return;
      node.style.fill = P.card;
      S.tw(S.slot(i, hs.length, 0.05, 0.5), 0.4, function (k) { node.style.fill = k > 0.5 ? P.accent : P.card; node.style.opacity = 1; });
    });
    var where = function (name) {
      var c = M.cities[name];
      if (!c && typeof name === 'object' && name.lat) { var f = M.fit, a = [name.lon, name.lat, name.lon * name.lat, name.lon * name.lon, name.lat * name.lat, 1]; c = [f[0].reduce(function (s, v, i) { return s + v * a[i]; }, 0), f[1].reduce(function (s, v, i) { return s + v * a[i]; }, 0)]; }
      return c ? [ox + c[0] * sc, oy + c[1] * sc] : null;
    };
    var cities = (p.cities || []).map(function (c) { return typeof c === 'string' ? { name: c } : c; });
    cities.forEach(function (c, i) {
      var xy = where(c.lat ? c : c.name); if (!xy) return;
      var t = S.at(c.at, S.slot(i, cities.length, 0.1, 0.7));
      var pin = S.add('fg', el('div', '', 'position:absolute;left:' + (xy[0] - 22) + 'px;top:' + (xy[1] - 58) + 'px;width:44px;height:58px', K.svg(44, 58, '<path d="M22 56 C22 56 4 32 4 21 a18 18 0 1 1 36 0 C40 32 22 56 22 56Z" fill="' + (c.color || P.accent) + '" stroke="' + P.ink + '" stroke-width="4"/><circle cx="22" cy="21" r="7" fill="' + P.card + '"/>')));
      S.anim(pin, 'drop', t, 0.4, { dist: 80, rot: 0 }); S.sfx(t, 'pop', 0.45);
      if (c.label !== false && cities.length <= 12) {
        var lb = S.add('fg', el('div', 'k', 'position:absolute;left:' + (xy[0] + 26) + 'px;top:' + (xy[1] - 50) + 'px;font-size:38px;color:' + P.ink + ';background:rgba(255,248,242,.85);padding:4px 10px 0;border-radius:6px;white-space:nowrap', K.esc(c.label || c.name) + (c.value ? ' <span style="color:' + P.accent + '">' + K.esc(c.value) + '</span>' : '')));
        S.anim(lb, 'fade', t + 0.2, 0.3);
      }
    });
    (p.routes || []).forEach(function (r, i) {
      var a = where(r[0]), b = where(r[1]); if (!a || !b) return;
      K.arrow(S, a[0], a[1] - 20, b[0], b[1] - 20, S.at(r[2], S.slot(i, (p.routes || []).length, 0.4, 0.8)), P.ink);
    });
    if (p.count) {
      var t2 = S.at(p.count.at, S.slot(0, 1, 0.3));
      var box = S.add('mid', el('div', '', 'position:absolute;left:1080px;top:' + (p.title ? 420 : 360) + 'px;width:760px'));
      var bg = el('div', 'big', 'font-size:220px', K.esc(p.count.value)); box.appendChild(bg);
      S.anim(bg, 'pop', t2, 0.4); if (K.parseNum(p.count.value)) S.anim(bg, 'count', t2, 1.4);
      if (p.count.label) { var cl = el('div', '', 'font:600 44px/1.3 var(--fb);color:' + P.ink, K.rich(p.count.label)); box.appendChild(cl); S.anim(cl, 'rise', t2 + 0.4, 0.5); }
    }
    S.popZone = { x: 1100, y: 860, w: 700 };
  });

  // TIMELINE: years along a track; the camera slides with the story
  L('timeline', function (S, p, P) {
    if (p.title) K.title(S, p.title, p.sub, { y: 70 });
    var items = p.items || [], n = items.length, step = n <= 4 ? 1600 / n : 420, y = 600;
    var track = S.add('mid', el('div', '', 'position:absolute;left:0;top:0;width:' + (200 + n * step + 400) + 'px;height:1080px'));
    var line = el('div', '', 'position:absolute;left:120px;top:' + y + 'px;height:8px;width:' + (n * step) + 'px;background:' + P.ink + ';border-radius:4px'); track.appendChild(line);
    var times = items.map(function (it, i) { return S.at(it.at, S.slot(i, n, 0.04, 0.78)); });
    S.anim(line, 'growx', 0, times[n - 1] || 1, { ease: 'lin' });
    items.forEach(function (it, i) {
      var x = 160 + i * step + step / 2 - 40, t = times[i], up = i % 2 === 0;
      var dot = el('div', '', 'position:absolute;left:' + (x - 6) + 'px;top:' + (y - 22) + 'px;width:52px;height:52px;border-radius:50%;background:' + (i === p.highlight || it.hi ? P.accent : P.yellow) + ';border:7px solid ' + P.ink);
      track.appendChild(dot); S.anim(dot, 'pop', t, 0.35);
      var yr = el('div', 'k', 'position:absolute;left:' + (x - 130) + 'px;width:300px;text-align:center;top:' + (up ? y - 150 : y + 60) + 'px;font-size:92px;color:' + (it.hi ? P.accent : P.ink), K.esc(it.year));
      track.appendChild(yr); S.anim(yr, up ? 'rise' : 'drop', t + 0.05, 0.45, { dist: 40, rot: 0 });
      var card = el('div', 'card', 'left:' + (x - 180) + 'px;width:' + Math.min(step - 20, 400) + 'px;top:' + (up ? y + 70 : y - 350) + 'px;padding:22px 24px 18px;font:600 36px/1.22 var(--fb);color:' + P.ink + ';transform:rotate(' + (up ? -1.5 : 1.5) + 'deg)',
        (it.img ? '' : it.icon ? '<div style="margin-bottom:10px">' + K.icon(it.icon, P.accent, 54) + '</div>' : '') + K.rich(it.text || ''));
      if (it.img) { var im = K.image(it.img, { css: 'width:100%;height:150px;margin-bottom:12px' }); card.insertBefore(im, card.firstChild); }
      track.appendChild(card); S.anim(card, up ? 'rise' : 'drop', t + 0.15, 0.45, { dist: 50, rot: 0 }); S.sfx(t, 'pop', 0.5);
    });
    if (n > 4) { // pan so the newest stop stays in view
      S.every(function (lt) {
        var i = 0; while (i < n - 1 && lt >= times[i + 1] - 0.3) i++;
        var prev = i > 0 ? times[i] - 0.3 : 0, k = K.E.io(K.clamp((lt - prev) / 0.6, 0, 1));
        var target = function (j) { return -Math.max(0, Math.min(160 + j * step + step / 2 - 960, 200 + n * step - 1800)); };
        var x = i > 0 ? K.lerp(target(i - 1), target(i), k) : target(0);
        track.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
      });
    }
  });

  // PHOTO collage: 1 big photo (+ up to 2 extras) with hand-drawn notes on it
  L('photo', function (S, p, P) {
    var full = p.frame === 'full';
    if (full) {
      var bgi = S.add('bg', K.image(p.img, { css: 'position:absolute;left:-40px;top:-30px;width:2000px;height:1140px', duo: p.color ? null : 'ink', color: p.color }));
      S.every(function (lt) { var k = lt / S.dur; bgi.style.transform = 'scale(' + (p.kb === 'out' ? 1.12 - 0.08 * k : 1.02 + 0.08 * k) + ')'; });
      S.add('bg', el('div', '', 'position:absolute;inset:0;background:linear-gradient(0deg,rgba(19,41,61,.75),rgba(19,41,61,0) 55%)'));
      if (p.caption) { var cp = S.add('mid', el('div', 'k', 'position:absolute;left:120px;bottom:110px;width:1500px;font-size:110px;color:' + P.card, K.rich(p.caption))); S.anim(cp, 'wipe', 0.4, 0.6); }
      S.popZone = { x: 1400, y: 100, w: 440 };
      return;
    }
    K.blob(S, 1500, 820, 380, P.yellow);
    var big = S.add('mid', el('div', 'card', 'left:150px;top:110px;width:1040px;height:760px;padding:22px 22px 90px;transform:rotate(-2deg)'));
    var im = K.image(p.img, { css: 'width:100%;height:100%', color: p.color }); big.appendChild(im);
    if (p.caption) big.appendChild(el('div', 'k', 'position:absolute;left:30px;bottom:18px;font-size:58px;color:' + P.ink, K.rich(p.caption)));
    S.add('fg', K.tape('left:560px;top:86px;transform:rotate(3deg)'));
    S.anim(big, 'drop', 0.05, 0.6); S.sfx(0.05, 'flip', 0.6);
    S.every(function (lt) { var k = lt / S.dur; im.firstChild && (im.firstChild.style.transform = 'scale(' + (1.04 + 0.06 * k) + ')'); });
    (p.extra ? [].concat(p.extra) : []).slice(0, 2).forEach(function (x, i) {
      var e = S.add('mid', el('div', 'card', 'left:' + (1250 + i * 60) + 'px;top:' + (150 + i * 400) + 'px;width:520px;height:360px;padding:16px;transform:rotate(' + (i ? -4 : 4) + 'deg)'));
      e.appendChild(K.image(x, { css: 'width:100%;height:100%' }));
      S.anim(e, 'drop', S.slot(i, 2, 0.3, 0.6), 0.5);
    });
    (p.notes || []).forEach(function (n, i) {
      var t = S.at(n.at, S.slot(i, p.notes.length, 0.25, 0.8));
      var x = 172 + (n.x || 50) / 100 * 996, y = 132 + (n.y || 50) / 100 * 650;
      if (n.circle) K.annotate(S, x - 110, y - 80, 220, 160, t);
      K.note(S, n.text, Math.min(1500, x + 60), Math.max(80, y - 160), t + 0.2, { rot: i % 2 ? -3 : 3, css: 'font-size:40px;max-width:380px' });
      K.arrow(S, Math.min(1500, x + 60) + 10, Math.max(80, y - 160) + 60, x + 10, y, t + 0.35, P.accent);
    });
    S.popZone = { x: 1300, y: 860, w: 520 };
  });

  // HEADLINES: newspaper clippings land and stack (use real headlines + outlet)
  L('headlines', function (S, p, P) {
    var items = p.items || [];
    if (p.title) K.title(S, p.title, null, { y: 60 });
    K.blob(S, 300, 900, 360, P.yellow);
    var spots = [[220, 230, -4], [880, 170, 3], [520, 520, -2], [1120, 560, 4]];
    items.slice(0, 4).forEach(function (it, i) {
      var t = S.at(it.at, S.slot(i, Math.min(4, items.length), 0.05, 0.7)), s = spots[i];
      var c = S.add('mid', K.card('left:' + s[0] + 'px;top:' + s[1] + 'px;width:700px;padding:30px 36px 26px;transform:rotate(' + s[2] + 'deg);background:#FBF7EE;z-index:' + (i + 1),
        '<div style="display:flex;justify-content:space-between;border-bottom:3px double #1a1a1a;padding-bottom:10px;margin-bottom:14px"><span style="font:700 26px/1 var(--fb);letter-spacing:.1em;color:' + P.accent + ';text-transform:var(--up)">' + K.esc(it.source || '') + '</span><span style="font:500 22px/1 var(--fb);color:#555">' + K.esc(it.date || '') + '</span></div>' +
        '<div class="k" style="font-size:' + ((it.text || '').length > 60 ? 52 : 64) + 'px;line-height:1;color:#1a1a1a">' + K.rich(it.text || '') + '</div>' +
        '<div style="margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:10px"><div style="height:9px;background:#0002"></div><div style="height:9px;background:#0002"></div><div style="height:9px;background:#0002;width:80%"></div><div style="height:9px;background:#0002;width:60%"></div></div>'));
      S.anim(c, 'drop', t, 0.5, { rot: s[2] * 3, dist: 200 }); S.sfx(t, 'flip', 0.8);
    });
    S.popZone = { x: 1420, y: 90, w: 420 };
  });

  // LOGOS: wall of companies (competitors, investors, portfolio)
  L('logos', function (S, p, P) {
    if (p.title) K.title(S, p.title, p.sub);
    var items = (p.items || []).map(function (it) { return typeof it === 'string' ? { name: it } : it; });
    var n = items.length, cols = p.cols || Math.min(5, Math.ceil(Math.sqrt(n * 1.6))), rowsN = Math.ceil(n / cols);
    var top = p.title ? 320 : 180, cw = 1600 / cols, ch = Math.min(240, (1000 - top) / rowsN), hi = [].concat(p.highlight || []);
    items.forEach(function (it, i) {
      var t = S.at(it.at, S.slot(i, n, 0.05, 0.6)), on = hi.indexOf(it.name) >= 0;
      var cell = S.add('mid', el('div', '', 'position:absolute;left:' + (160 + (i % cols) * cw) + 'px;top:' + (top + Math.floor(i / cols) * ch) + 'px;width:' + (cw - 40) + 'px;height:' + (ch - 40) + 'px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;border-radius:24px;' + (on ? 'outline:8px solid ' + P.accent + ';outline-offset:6px;' : '')));
      cell.appendChild(K.logo(it, Math.min(130, ch - 90)));
      if (it.img && it.img.src || it.sub) cell.appendChild(el('div', 'k', 'font-size:36px;color:' + P.ink, K.esc(it.sub || it.name)));
      S.anim(cell, 'pop', t, 0.4); S.sfx(t, 'pop', 0.4);
      if (it.cross) { var x = S.add('fg', el('div', '', 'position:absolute;left:' + (160 + (i % cols) * cw) + 'px;top:' + (top + Math.floor(i / cols) * ch) + 'px;width:' + (cw - 40) + 'px;height:' + (ch - 40) + 'px', K.svg(cw - 40, ch - 40, '<path class="draw" pathLength="1" d="M20 20 L' + (cw - 60) + ' ' + (ch - 60) + ' M' + (cw - 60) + ' 20 L20 ' + (ch - 60) + '" stroke="' + P.bad + '" stroke-width="14" stroke-linecap="round"/>'))); S.anim(x, 'draw', S.at(it.cross === true ? null : it.cross, t + 0.8), 0.4); }
    });
  });

  // FLOW: how money / goods / users move. Steps with arrows; a token travels along.
  L('flow', function (S, p, P) {
    if (p.title) K.title(S, p.title, p.sub);
    var steps = (p.steps || []).map(function (s) { return typeof s === 'string' ? { label: s } : s; });
    var n = steps.length, top = p.title ? 480 : 420, x0 = 200, x1 = 1720, gap = (x1 - x0) / Math.max(1, n - 1);
    var pos = steps.map(function (s, i) { return [n === 1 ? 960 : x0 + gap * i, top + (p.zigzag && i % 2 ? 180 : 0)]; });
    var times = steps.map(function (s, i) { return S.at(s.at, S.slot(i, n, 0.05, 0.7)); });
    steps.forEach(function (s, i) {
      if (i < n - 1) {
        var a = pos[i], b = pos[i + 1];
        K.arrow(S, a[0] + 120, a[1], b[0] - 120, b[1], times[i] + 0.25, P.ink, 'mid');
        if (s.edge || p.money) { var m = S.add('mid', el('div', 'k', 'position:absolute;left:' + ((a[0] + b[0]) / 2 - 120) + 'px;top:' + ((a[1] + b[1]) / 2 - 110) + 'px;width:240px;text-align:center;font-size:40px;color:' + P.accent, K.esc(s.edge || p.money))); S.anim(m, 'pop', times[i] + 0.5, 0.35); }
      }
      var node = S.add('mid', el('div', '', 'position:absolute;left:' + (pos[i][0] - 120) + 'px;top:' + (pos[i][1] - 120) + 'px;width:240px;display:flex;flex-direction:column;align-items:center;text-align:center'));
      var disc = el('div', '', 'width:240px;height:240px;border-radius:50%;background:' + (s.color || (i === n - 1 ? P.accent : i % 2 ? P.teal : P.ink)) + ';display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 16px 30px -12px rgba(0,0,0,.4)');
      if (s.img) disc.appendChild(K.image(s.img, { css: 'width:100%;height:100%', fit: s.img.cut ? 'contain' : 'cover' })); else disc.innerHTML = K.icon(s.icon || 'circle', '#fff', 120);
      node.appendChild(disc);
      node.appendChild(el('div', 'k', 'font-size:56px;color:' + P.ink + ';margin-top:22px;width:320px', K.rich(s.label)));
      if (s.sub) node.appendChild(el('div', '', 'font:500 28px/1.25 var(--fb);color:' + P.ink + ';opacity:.8;width:300px', K.rich(s.sub)));
      S.anim(node, 'pop', times[i], 0.45); S.sfx(times[i], 'pop', 0.55);
    });
    if (n > 1) { // token loops along the chain once everything is visible
      var tok = S.add('fg', el('div', '', 'position:absolute;left:0;top:0;width:54px;height:54px;border-radius:50%;background:' + P.yellow + ';border:6px solid ' + P.ink + ';display:flex;align-items:center;justify-content:center;opacity:0', K.icon(p.token || 'currency-inr', P.ink, 30)));
      var tStart = times[n - 1] + 0.6, per = 1.1;
      S.every(function (lt) {
        if (lt < tStart) { tok.style.opacity = 0; return; }
        var u = ((lt - tStart) / per) % (n - 1), i = Math.floor(u), k = K.E.io(u - i), a = pos[i], b = pos[i + 1];
        tok.style.opacity = 1;
        tok.style.transform = 'translate(' + (K.lerp(a[0] + 120, b[0] - 120, k) - 27).toFixed(1) + 'px,' + (K.lerp(a[1], b[1], k) - 27 - Math.sin(k * Math.PI) * 60).toFixed(1) + 'px)';
      });
    }
  });

  // PHONE: app screenshot or generated notification cards, with points beside it
  L('phone', function (S, p, P) {
    var right = p.side !== 'left', px = right ? 1180 : 220;
    K.blob(S, px + 230, 560, 400, P.yellow);
    var ph = S.add('mid', el('div', '', 'position:absolute;left:' + px + 'px;top:90px;width:470px;height:940px;border-radius:64px;background:#13161C;padding:18px;box-shadow:0 30px 60px -20px rgba(0,0,0,.55);transform:rotate(' + (right ? 4 : -4) + 'deg)'));
    var scr = el('div', '', 'position:relative;width:100%;height:100%;border-radius:48px;overflow:hidden;background:' + (p.screenBg || P.card));
    ph.appendChild(scr);
    scr.appendChild(el('div', '', 'position:absolute;left:50%;top:14px;width:120px;height:32px;margin-left:-60px;border-radius:20px;background:#13161C;z-index:3'));
    S.anim(ph, 'rise', 0.05, 0.6, { dist: 120 });
    if (p.screen) { var im = K.image(p.screen, { css: 'width:100%;height:100%', color: true, fit: 'cover', pos: 'top' }); scr.appendChild(im); }
    (p.cards || []).forEach(function (c, i) {
      var t = S.at(c.at, S.slot(i, p.cards.length, 0.1, 0.7));
      var cd = el('div', '', 'position:absolute;left:18px;right:18px;top:' + (80 + i * 150) + 'px;background:#fff;border-radius:22px;padding:18px 18px 14px;display:flex;gap:14px;align-items:flex-start;box-shadow:0 8px 20px -8px rgba(0,0,0,.3)',
        '<div style="flex:none;width:56px;height:56px;border-radius:14px;background:' + (c.color || P.accent) + ';display:flex;align-items:center;justify-content:center">' + K.icon(c.icon || 'bell-ringing', '#fff', 32) + '</div><div><div style="font:700 24px/1.1 var(--fb);color:#111">' + K.esc(c.title || '') + '</div><div style="font:500 22px/1.25 var(--fb);color:#333;margin-top:4px">' + K.rich(c.text || '') + '</div></div>');
      scr.appendChild(cd); S.anim(cd, 'drop', t, 0.4, { dist: 60, rot: 0 }); S.sfx(t, 'ding', 0.35);
    });
    var col = S.add('mid', el('div', '', 'position:absolute;left:' + (right ? 140 : 820) + 'px;top:150px;width:900px'));
    if (p.title) { var h = el('div', 'k', 'font-size:110px;color:' + P.ink, K.rich(p.title)); col.appendChild(h); S.anim(h, 'wipe', 0.2, 0.55); }
    (p.points || []).forEach(function (pt, i) {
      var t = S.at(pt.at, S.slot(i, p.points.length, 0.2, 0.8));
      var r = el('div', '', 'display:flex;gap:20px;align-items:center;margin-top:34px', '<div style="flex:none;width:58px;height:58px;border-radius:50%;background:' + P.accent + ';display:flex;align-items:center;justify-content:center">' + K.icon('check-circle', '#fff', 36) + '</div><div style="font:600 42px/1.25 var(--fb);color:' + P.ink + '">' + K.rich(pt.text || pt) + '</div>');
      col.appendChild(r); S.anim(r, 'left', t, 0.45, { dist: 60 });
    });
    S.popZone = right ? { x: 140, y: 860, w: 700 } : { x: 1300, y: 860, w: 520 };
  });
})();
