// b-data.js — stat, bars, hbars, line, donut, units, compare
(function () {
  var L = Engine.layout, K = Engine.Kit, el = K.el;
  // data as {a: 1, b: 2} or [[a, 1], ...] or [{label, value, ...}] -> [{label, value, ...}]
  function rows(d) {
    if (Array.isArray(d)) return d.map(function (r) { return Array.isArray(r) ? { label: String(r[0]), value: +r[1] } : Object.assign({}, r, { label: String(r.label), value: +r.value }); });
    return Object.keys(d || {}).map(function (k) { var v = d[k]; return typeof v === 'object' ? Object.assign({ label: k }, v, { value: +v.value }) : { label: k, value: +v }; });
  }
  function hiIndex(rs, h) {
    if (h === undefined || h === null || h === false) return -1;
    if (h === 'last') return rs.length - 1;
    if (h === 'max') { var m = 0; rs.forEach(function (r, i) { if (r.value > rs[m].value) m = i; }); return m; }
    if (h === 'min') { var n = 0; rs.forEach(function (r, i) { if (r.value < rs[n].value) n = i; }); return n; }
    for (var i = 0; i < rs.length; i++) if (rs[i].label === String(h)) return i;
    return -1;
  }
  function val(v, p) { var s = (p.prefix || '') + K.fmtIN(v, (String(v).split('.')[1] || '').length) + (p.unit ? (/^[%x]/.test(p.unit) ? '' : ' ') + p.unit : ''); return s; }

  // STAT: 1-3 big numbers that count up
  L('stat', function (S, p, P) {
    if (p.title) K.title(S, p.title, p.sub);
    var items = (p.items || [{ value: p.value, label: p.label, icon: p.icon }]).slice(0, 3);
    var n = items.length, size = n === 1 ? 260 : n === 2 ? 200 : 170, colW = 1680 / n;
    if (n === 1) K.blob(S, 960, 600, 430, P.yellow);
    items.forEach(function (it, i) {
      var t = S.at(it.at, S.slot(i, n, 0.12, 0.6));
      var col = S.add('mid', el('div', '', 'position:absolute;left:' + (120 + i * colW) + 'px;width:' + colW + 'px;top:' + (p.title ? 340 : (n === 1 ? 250 : 300)) + 'px;text-align:center;display:flex;flex-direction:column;align-items:center'));
      if (it.icon) { var ic = el('div', '', 'width:120px;height:120px;border-radius:50%;background:' + (it.color || (i % 2 ? P.teal : P.ink)) + ';display:flex;align-items:center;justify-content:center;margin-bottom:24px', K.icon(it.icon, '#fff', 66)); col.appendChild(ic); S.anim(ic, 'pop', t - 0.15, 0.4); }
      var b = el('div', 'big', 'font-size:' + size + 'px;color:' + (it.color || (n === 1 || i === n - 1 ? P.accent : P.ink)), K.esc(it.value));
      col.appendChild(b); S.anim(b, 'pop', t, 0.4);
      if (K.parseNum(it.value)) { S.anim(b, 'count', t, 1.2); S.sfx(t, 'counter', 0.6); }
      if (it.label) { var lb = el('div', '', 'font:600 40px/1.25 Palanquin;color:' + P.ink + ';margin-top:18px;max-width:' + (colW - 60) + 'px', K.rich(it.label)); col.appendChild(lb); S.anim(lb, 'rise', t + 0.35, 0.5, { dist: 20 }); }
    });
    if (p.note) K.note(S, p.note.text || p.note, 1440, 820, S.at(p.note.at, S.slot(0, 1, 0.75)), { rot: -3 });
  });

  // BARS: vertical bars (years, categories), highlight one, sticky note
  L('bars', function (S, p, P) {
    K.title(S, p.title || '', p.sub, { w: 1200 });
    var rs = rows(p.data), n = rs.length, hi = hiIndex(rs, p.highlight === undefined ? 'last' : p.highlight);
    var max = Math.max.apply(null, rs.map(function (r) { return r.value; }).concat([p.max || 0]));
    var x0 = 200, x1 = p.note ? 1380 : 1720, base = 930, maxH = p.sub ? 520 : 580;
    var slotW = (x1 - x0) / n, bw = Math.min(150, slotW * 0.62);
    S.add('mid', el('div', '', 'position:absolute;left:' + (x0 - 30) + 'px;top:' + base + 'px;width:' + (x1 - x0 + 60) + 'px;height:5px;background:' + P.ink));
    rs.forEach(function (r, i) {
      var t = S.at(r.at, S.slot(i, n, 0.03, p.note ? 0.5 : 0.65));
      var h = Math.max(4, r.value / max * maxH), x = x0 + slotW * i + (slotW - bw) / 2, on = i === hi;
      var bar = S.add('mid', el('div', '', 'position:absolute;left:' + x + 'px;top:' + (base - h) + 'px;width:' + bw + 'px;height:' + h + 'px;border-radius:8px 8px 0 0;background:' + (r.color || (on ? P.accent : P.ink))));
      S.anim(bar, 'grow', t, 0.6);
      var v = S.add('mid', el('div', 'k', 'position:absolute;left:' + (x - 40) + 'px;width:' + (bw + 80) + 'px;text-align:center;top:' + (base - h - 70) + 'px;font-size:' + (n > 8 ? 42 : 58) + 'px;color:' + (on ? P.accent : P.ink), K.esc(val(r.value, p))));
      S.anim(v, 'rise', t + 0.25, 0.4, { dist: 20 }); S.anim(v, 'count', t, 0.85);
      var lb = S.add('mid', el('div', '', 'position:absolute;left:' + (x - 50) + 'px;width:' + (bw + 100) + 'px;text-align:center;top:' + (base + 18) + 'px;font:600 ' + (n > 8 ? 26 : 32) + 'px/1.1 Palanquin;color:' + P.ink, K.esc(r.label)));
      S.anim(lb, 'fade', t, 0.4);
      S.sfx(t, 'tick', 0.45);
      if (on && p.circle !== false) K.annotate(S, x - 60, base - h - 96, bw + 120, 120, S.at(p.at, t + 0.7));
    });
    if (p.note) K.note(S, p.note.text || p.note, 1480, 360, S.at(p.note.at, S.slot(0, 1, 0.72)), { rot: 3 });
    K.blob(S, 1840, 60, 240, P.yellow);
  });

  // HBARS: ranked horizontal bars, logos or labels on the left
  L('hbars', function (S, p, P) {
    K.title(S, p.title || '', p.sub);
    var rs = rows(p.data), n = rs.length, hi = hiIndex(rs, p.highlight);
    var max = Math.max.apply(null, rs.map(function (r) { return r.value; }));
    var top = p.sub ? 330 : 290, rowH = Math.min(130, (1010 - top) / n), x0 = 520, maxW = p.note ? 900 : 1160;
    rs.forEach(function (r, i) {
      var t = S.at(r.at, S.slot(i, n, 0.05, 0.65)), y = top + i * rowH, on = i === hi;
      var lab = S.add('mid', el('div', '', 'position:absolute;left:120px;top:' + y + 'px;width:370px;height:' + (rowH - 26) + 'px;display:flex;align-items:center;justify-content:flex-end;gap:16px'));
      if (r.img || r.color) { var lg = K.logo({ img: r.img, name: r.label, color: r.color }, rowH - 34); lab.appendChild(lg); if (!(r.img && r.img.src)) lg.style.fontSize = Math.min(44, (rowH - 34) * 0.42) + 'px'; }
      else lab.appendChild(el('div', 'k', 'font-size:' + Math.min(64, rowH * 0.5) + 'px;color:' + P.ink + ';text-align:right', K.esc(r.label)));
      var w = Math.max(6, r.value / max * maxW);
      var bar = S.add('mid', el('div', '', 'position:absolute;left:' + x0 + 'px;top:' + (y + 6) + 'px;width:' + w + 'px;height:' + (rowH - 38) + 'px;border-radius:0 10px 10px 0;background:' + (r.color && !on ? r.color : on ? P.accent : P.ink)));
      S.anim(lab, 'left', t - 0.1, 0.4, { dist: 60 }); S.anim(bar, 'growx', t, 0.7);
      var v = S.add('mid', el('div', 'k', 'position:absolute;left:' + (x0 + w + 20) + 'px;top:' + (y + 2) + 'px;font-size:' + Math.min(70, rowH * 0.6) + 'px;line-height:' + (rowH - 30) + 'px;color:' + (on ? P.accent : P.ink), K.esc(val(r.value, p))));
      S.anim(v, 'fade', t + 0.4, 0.3); S.anim(v, 'count', t, 0.9); S.sfx(t, 'tick', 0.45);
    });
    if (p.note) K.note(S, p.note.text || p.note, 1500, 700, S.at(p.note.at, S.slot(0, 1, 0.75)), { rot: -3 });
  });

  // LINE: one or more series drawn over time, events marked on the line
  L('line', function (S, p, P) {
    K.title(S, p.title || '', p.sub, { w: 1200 });
    var series = p.series ? Object.keys(p.series).map(function (k) { return { name: k, rs: rows(p.series[k]) }; }) : [{ name: '', rs: rows(p.data) }];
    var xs = series[0].rs.map(function (r) { return r.label; });
    var all = [].concat.apply([], series.map(function (s) { return s.rs.map(function (r) { return r.value; }); }));
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    var span = (hi - Math.min(0, lo)) / 3, mag = Math.pow(10, Math.floor(Math.log10(span || 1))), stepv = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).find(function (s) { return s >= span; });
    var min = Math.min(0, Math.floor(lo / stepv) * stepv), max = Math.ceil(hi / stepv) * stepv;
    var X0 = 220, X1 = p.note ? 1380 : 1700, Y0 = 920, Y1 = p.sub ? 360 : 320;
    var px = function (i) { return X0 + (X1 - X0) * (xs.length === 1 ? 0.5 : i / (xs.length - 1)); };
    var py = function (v) { return Y0 - (Y0 - Y1) * (v - min) / (max - min || 1); };
    var g = '';
    for (var gv = min, gi = 0; gv <= max + 1e-9; gv += stepv, gi++) { var gy = py(gv); g += '<line x1="' + (X0 - 20) + '" x2="' + (X1 + 20) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + P.ink + '" stroke-opacity="' + (gi ? 0.12 : 0.8) + '" stroke-width="' + (gi ? 2 : 5) + '"/><text x="' + (X0 - 34) + '" y="' + (gy + 10) + '" text-anchor="end" font-family="Palanquin" font-weight="600" font-size="26" fill="' + P.ink + '" opacity=".6">' + K.esc(val(+gv.toFixed(2), p)) + '</text>'; }
    xs.forEach(function (x, i) { if (xs.length <= 12 || i % Math.ceil(xs.length / 10) === 0 || i === xs.length - 1) g += '<text x="' + px(i) + '" y="' + (Y0 + 46) + '" text-anchor="middle" font-family="Palanquin" font-weight="600" font-size="28" fill="' + P.ink + '" opacity=".8">' + K.esc(x) + '</text>'; });
    var cols = P.series || [P.ink, P.accent, P.teal];
    var t0 = S.slot(0, 1, 0.03), t1 = S.slot(0, 1, p.note ? 0.6 : 0.75);
    series.forEach(function (s, si) {
      var pts = s.rs.map(function (r, i) { return [px(i), py(r.value)]; });
      var d = 'M' + pts.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' L');
      var c = series.length === 1 ? P.accent : (s.rs[0].color || cols[(si + 1) % cols.length]);
      if (series.length === 1) g += '<path class="area" d="' + d + ' L' + pts[pts.length - 1][0] + ' ' + Y0 + ' L' + pts[0][0] + ' ' + Y0 + 'Z" fill="' + P.accent + '" opacity=".14"/>';
      g += '<path class="draw" pathLength="1" d="' + d + '" fill="none" stroke="' + c + '" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>';
      g += '<circle class="endpt" data-s="' + si + '" cx="' + pts[pts.length - 1][0] + '" cy="' + pts[pts.length - 1][1] + '" r="16" fill="' + c + '" stroke="' + P.card + '" stroke-width="6"/>';
      if (s.name) g += '<text class="sname" x="' + (pts[pts.length - 1][0] + 26) + '" y="' + (pts[pts.length - 1][1] + 10) + '" font-family="Khand" font-weight="700" font-size="44" fill="' + c + '">' + K.esc(s.name.toUpperCase()) + '</text>';
    });
    var chart = S.add('mid', el('div', '', 'position:absolute;left:0;top:0;width:1920px;height:1080px', K.svg(1920, 1080, g)));
    S.anim(chart, 'draw', t0, t1 - t0);
    var area = chart.querySelectorAll('.area, .endpt, .sname');
    S.tw(t0, t1 - t0, function (k) { for (var i = 0; i < area.length; i++) area[i].style.opacity = area[i].classList.contains('area') ? 0.14 * k : (k > 0.97 ? 1 : 0); });
    S.sfx(t0, 'scribble', 0.5);
    var last = series[0].rs[series[0].rs.length - 1];
    if (p.highlight !== false && series.length === 1) {
      var tag = S.add('fg', el('div', 'k', 'position:absolute;left:' + (px(xs.length - 1) - 120) + 'px;top:' + (py(last.value) - 110) + 'px;width:240px;text-align:center;font-size:62px;color:' + P.accent, K.esc(val(last.value, p))));
      S.anim(tag, 'pop', t1, 0.4);
    }
    (p.events || []).forEach(function (ev, i) {
      var idx = xs.indexOf(String(ev.x)); if (idx < 0) return;
      var t = S.at(ev.at, t0 + (t1 - t0) * idx / Math.max(1, xs.length - 1));
      var v = series[0].rs[idx].value, x = px(idx), y = py(v);
      var dot = S.add('fg', el('div', '', 'position:absolute;left:' + (x - 14) + 'px;top:' + (y - 14) + 'px;width:28px;height:28px;border-radius:50%;background:' + P.yellow + ';border:5px solid ' + P.ink));
      S.anim(dot, 'pop', t, 0.35);
      var up = y > 560;
      var card = S.add('fg', K.card('left:' + Math.min(1560, Math.max(100, x - 170)) + 'px;top:' + (up ? y - 200 : y + 50) + 'px;width:340px;padding:16px 20px 12px;font:600 34px/1.2 Palanquin;color:' + P.ink + ';transform:rotate(' + (i % 2 ? 2 : -2) + 'deg)', K.rich(ev.text)));
      S.anim(card, 'drop', t + 0.1, 0.45); S.sfx(t, 'pop', 0.5);
    });
    if (p.note) K.note(S, p.note.text || p.note, 1480, 380, S.at(p.note.at, S.slot(0, 1, 0.78)), { rot: 3 });
  });

  // DONUT: shares of a whole
  L('donut', function (S, p, P) {
    K.title(S, p.title || '', p.sub);
    var rs = rows(p.data), tot = rs.reduce(function (a, r) { return a + r.value; }, 0), hi = hiIndex(rs, p.highlight);
    var cols = P.series || [P.ink, P.accent, P.teal, P.yellow], R = 300, cx = 560, cy = 640, acc = 0, g = '';
    rs.forEach(function (r, i) {
      var f = r.value / tot, c = r.color || (i === hi ? P.accent : cols[i % cols.length] === P.accent ? P.ink : cols[i % cols.length]);
      var a0 = acc * 2 * Math.PI - Math.PI / 2, a1 = (acc + f) * 2 * Math.PI - Math.PI / 2, large = f > 0.5 ? 1 : 0;
      g += '<path class="seg" data-i="' + i + '" pathLength="1" d="M' + (cx + R * Math.cos(a0)) + ' ' + (cy + R * Math.sin(a0)) + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + (cx + R * Math.cos(a1)) + ' ' + (cy + R * Math.sin(a1)) + '" fill="none" stroke="' + c + '" stroke-width="' + (i === hi ? 150 : 120) + '"/>';
      r._c = c; acc += f;
    });
    var ch = S.add('mid', el('div', '', 'position:absolute;left:0;top:0', K.svg(1920, 1080, g)));
    var segs = ch.querySelectorAll('.seg');
    rs.forEach(function (r, i) {
      var t = S.at(r.at, S.slot(i, rs.length, 0.05, 0.6));
      S.tw(t, 0.6, function (k) { segs[i].style.strokeDasharray = '1 1'; segs[i].style.strokeDashoffset = 1 - k; }, 'io');
      var row = S.add('mid', el('div', '', 'position:absolute;left:1080px;top:' + (330 + i * 120) + 'px;display:flex;align-items:center;gap:26px'));
      row.innerHTML = '<div style="width:56px;height:56px;border-radius:12px;background:' + r._c + '"></div><div class="k" style="font-size:64px;color:' + P.ink + '">' + K.esc(r.label) + '</div><div class="k" style="font-size:64px;color:' + (i === hi ? P.accent : P.ink) + ';opacity:.85">' + K.esc(val(r.value, p)) + '</div>';
      S.anim(row, 'left', t, 0.45, { dist: 60 }); S.sfx(t, 'tick', 0.45);
    });
    if (p.center) { var c = S.add('mid', el('div', 'k', 'position:absolute;left:' + (cx - 220) + 'px;top:' + (cy - 70) + 'px;width:440px;text-align:center;font-size:110px;color:' + P.ink, K.rich(p.center))); S.anim(c, 'pop', S.slot(0, 1, 0.65), 0.4); }
  });

  // UNITS: icon grid, N of total filled ("37 out of 100 people")
  L('units', function (S, p, P) {
    if (p.title) K.title(S, p.title, p.sub);
    var tot = p.total || 100, v = p.value, cols = p.cols || (tot <= 20 ? 5 : 10), rowsN = Math.ceil(tot / cols);
    var size = Math.min(84, 640 / rowsN), gx = 150, gy = p.title ? 330 : 220;
    var t0 = S.at(p.at, S.slot(0, 1, 0.15)), dur = Math.min(2.2, (S.speech[1] - t0) * 0.6);
    var grid = S.add('mid', el('div', '', 'position:absolute;left:' + gx + 'px;top:' + gy + 'px;display:grid;grid-template-columns:repeat(' + cols + ',' + size + 'px);gap:' + size * 0.18 + 'px'));
    var cells = [];
    for (var i = 0; i < tot; i++) { var c = el('div', '', 'width:' + size + 'px;height:' + size + 'px;color:' + P.ink + ';opacity:.22', K.icon(p.icon || 'user', null, size)); grid.appendChild(c); cells.push(c); }
    S.anim(grid, 'fade', 0, 0.4);
    S.tw(t0, dur, function (k) { var on = Math.round(v * k); for (var i = 0; i < cells.length; i++) { var a = i < on; cells[i].style.opacity = a ? 1 : 0.22; cells[i].style.color = a ? P.accent : P.ink; } }, 'io');
    var bx = gx + cols * size * 1.18 + 80;
    var big = S.add('mid', el('div', 'big', 'position:absolute;left:' + bx + 'px;top:' + (gy + 40) + 'px;font-size:240px', K.esc(p.big || String(v) + (tot === 100 ? '%' : '/' + tot))));
    S.anim(big, 'pop', t0, 0.4); S.anim(big, 'count', t0, dur); S.sfx(t0, 'counter', 0.6);
    if (p.label) { var lb = S.add('mid', el('div', '', 'position:absolute;left:' + bx + 'px;top:' + (gy + 300) + 'px;width:' + (1800 - bx) + 'px;font:600 44px/1.3 Palanquin;color:' + P.ink, K.rich(p.label))); S.anim(lb, 'rise', t0 + 0.5, 0.5); }
  });

  // COMPARE: A vs B with rows of facts; each row lands on a cue
  L('compare', function (S, p, P) {
    if (p.title) K.title(S, p.title, null, { y: 60 });
    var A = p.a || {}, B = p.b || {}, top = p.title ? 230 : 120;
    [[A, 520, 'a'], [B, 1400, 'b']].forEach(function (x, i) {
      var o = x[0], cx = x[1];
      var head = S.add('mid', el('div', '', 'position:absolute;left:' + (cx - 300) + 'px;top:' + top + 'px;width:600px;display:flex;flex-direction:column;align-items:center;gap:14px'));
      head.appendChild(K.logo({ img: o.img, name: o.name, color: o.color }, 130));
      if (o.img) head.appendChild(el('div', 'k', 'font-size:66px;color:' + (o.color || P.ink), K.esc(o.name || ''))); // no logo: the chip already shows the name
      S.anim(head, i ? 'right' : 'left', 0.1 + i * 0.15, 0.5);
    });
    var vs = S.add('mid', el('div', 'k', 'position:absolute;left:900px;top:' + (top + 40) + 'px;width:120px;height:120px;border-radius:50%;background:' + P.accent + ';color:#fff;font-size:64px;display:flex;align-items:center;justify-content:center;padding-top:8px', 'VS'));
    S.anim(vs, 'stamp', 0.4, 0.35); S.sfx(0.4, 'stamp', 0.7);
    var R = p.rows || [], rh = Math.min(120, (1040 - top - 260) / Math.max(1, R.length));
    R.forEach(function (r, i) {
      var t = S.at(Array.isArray(r) ? null : r.at, S.slot(i, R.length, 0.12, 0.75));
      var lab = Array.isArray(r) ? r[0] : r.label, av = Array.isArray(r) ? r[1] : r.a, bv = Array.isArray(r) ? r[2] : r.b, win = Array.isArray(r) ? r[3] : r.win;
      var y = top + 260 + i * rh;
      var row = S.add('mid', el('div', '', 'position:absolute;left:150px;top:' + y + 'px;width:1620px;height:' + (rh - 14) + 'px;background:' + (i % 2 ? 'transparent' : 'rgba(255,248,242,.7)') + ';border-radius:14px'));
      row.innerHTML = '<div style="position:absolute;left:0;width:1620px;text-align:center;top:' + (rh / 2 - 30) + 'px;font:600 28px/1 Palanquin;color:' + P.ink + ';opacity:.6;text-transform:uppercase;letter-spacing:.08em">' + K.esc(lab) + '</div>' +
        '<div class="k" style="position:absolute;left:70px;width:600px;text-align:center;top:' + (rh / 2 - 36) + 'px;font-size:' + Math.min(72, rh * 0.62) + 'px;color:' + (win === 'a' ? P.accent : P.ink) + '">' + K.rich(av) + '</div>' +
        '<div class="k" style="position:absolute;left:950px;width:600px;text-align:center;top:' + (rh / 2 - 36) + 'px;font-size:' + Math.min(72, rh * 0.62) + 'px;color:' + (win === 'b' ? P.accent : P.ink) + '">' + K.rich(bv) + '</div>';
      S.anim(row, 'rise', t, 0.45, { dist: 30 }); S.sfx(t, 'tick', 0.5);
    });
  });
})();
