// e-iso.js — isometric motion scenes built on runtime/iso.js: ride, cutaway, network, cash, chain, iso (free-form)
(function () {
  var K = Engine.Kit, el = K.el, L = Engine.layout;
  var I = window.Iso;
  function sp(S, f) { return S.speech[0] + (S.speech[1] - S.speech[0]) * f; }
  function chip(html, cls) { return '<div class="isolab ' + (cls || '') + '">' + html + '</div>'; }
  function ic(name, c, s) { return K.icon(name, c || 'currentColor', s || 30); }
  function mmss(m) { var s = Math.round(m * 60); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function num(v) { var n = parseFloat(String(v).replace(/[^\d.]/g, '')); return isNaN(n) ? 0 : n; }
  var NODE = { darkstore: 'darkstore', store: 'shop', shop: 'shop', kirana: 'kirana', restaurant: 'restaurant', warehouse: 'warehouse', factory: 'factory',
    farm: 'farm', home: 'house', house: 'house', tower: 'tower', office: 'office', bank: 'bank', phone: 'phone' };
  function nodeModel(k) { return NODE[k] || (I.M[k] ? k : 'shop'); }
  // big fixed chip (timer / counter) in the top-right corner
  function corner(S, html, t, cls) {
    var n = S.add('fg', el('div', 'isocorner ' + (cls || ''), '', html));
    S.anim(n, 'pop', t, 0.45);
    return n;
  }
  // lane offset so vehicles keep to one side of the road
  function lane(pos, off) { var o = off === undefined ? 0.22 : off; return pos.dir === 0 ? [pos.x, pos.y + o] : pos.dir === 2 ? [pos.x, pos.y - o] : pos.dir === 1 ? [pos.x - o, pos.y] : [pos.x + o, pos.y]; }
  // ambient traffic: cars driving along horizontal / vertical roads, looping
  function traffic(Wd, n, seed, P) {
    var sz = Wd.size();
    for (var i = 0; i < n; i++) (function (i) {
      var horiz = i % 2 === 0, r = 1 + Math.floor(I.rnd(seed + i) * (horiz ? Wd.rows - 1 : Wd.cols - 1)), sp = 1.2 + I.rnd(seed + i * 3) * 1.4, off = I.rnd(seed + i * 5) * 40;
      var model = ['car', 'car', 'auto', 'van', 'bus', 'car'][i % 6], fwd = I.rnd(seed + i * 7) < 0.5;
      Wd.live(function (lt) {
        var L = horiz ? sz[0] : sz[1], s = ((lt * sp + off) % L + L) % L, a = fwd ? s : L - s;
        var x = horiz ? a : Wd.roadX(r) + (fwd ? -0.22 : 0.22), y = horiz ? Wd.roadY(r) + (fwd ? 0.22 : -0.22) : a;
        return I.M[model]({ x: x, y: y, dir: horiz ? (fwd ? 0 : 2) : (fwd ? 1 : 3), seed: i + 2, c: I.BLD[(i + 3) % I.BLD.length], t: lt });
      });
    })(i);
  }
  // pedestrians walking around a block's edge
  function walkers(Wd, n, seed) {
    for (var i = 0; i < n; i++) (function (i) {
      var b = Wd.block(Math.floor(I.rnd(seed + i) * Wd.cols), Math.floor(I.rnd(seed + i * 2) * Wd.rows));
      var path = new I.Path([[b.x - 0.25, b.y - 0.25], [b.x + b.w + 0.25, b.y - 0.25], [b.x + b.w + 0.25, b.y + b.d + 0.25], [b.x - 0.25, b.y + b.d + 0.25], [b.x - 0.25, b.y - 0.25]]);
      var speed = 0.05 + I.rnd(seed + i * 9) * 0.03, off = I.rnd(seed + i * 4);
      Wd.live(function (lt) {
        var q = path.at(((lt * speed + off) % 1 + 1) % 1);
        return I.M.person({ x: q.x, y: q.y, dir: q.dir, phase: lt * 9 + i, shirt: ['#FF5A36', '#2F8F83', '#3A86FF', '#FFC233', '#7A2E8E'][i % 5], seed: i });
      });
    })(i);
  }
  function title(S, p) { if (p.title) K.title(S, p.title, p.sub, { layer: 'fg', css: 'background:rgba(251,230,238,.86);padding:10px 22px 14px;border-radius:14px' }); }

  // ───────── RIDE: a vehicle goes from A to B through a moving city ─────────
  L('ride', function (S, p, P) {
    title(S, p);
    var sd = (S.d.i || 1) * 7 + 3, ats = [].concat(p.at || []);
    var t0 = S.at(ats[0], sp(S, 0.15)), t1 = Math.max(t0 + 2, S.at(ats[1], sp(S, 0.88)));
    I.setActor(1.9);
    var low = {}; [[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [5, 3], [5, 4], [6, 4], [4, 4], [6, 3]].forEach(function (c) { low[c[0] + ',' + c[1]] = 1; });
    var Wd = new I.World(S, { kind: p.city || 'city', cols: 7, rows: 5, seed: sd, maxH: 3.4, low: low });
    Wd.build({ '1,1': 1, '5,3': 1, '5,2': 1, '1,2': 1, '2,2': 1 });
    var ba = Wd.block(1, 1), bb = Wd.block(5, 3);
    var from = p.from || {}, to = p.to || {}, veh = I.VEHICLES[p.vehicle] ? p.vehicle : 'scooter';
    Wd.add(nodeModel(from.kind || 'darkstore'), { x: ba.x + 0.2, y: ba.y + 0.4, w: 2.6, d: 2.2, h: 1.7, seed: 3, signColor: P.accent });
    Wd.add(nodeModel(to.kind || 'home'), { x: bb.x + 0.5, y: bb.y + 0.5, w: 2, d: 1.8, seed: 5, c: '#FFF8F2', signColor: P.accent });
    var b2 = Wd.block(5, 2); Wd.tree(b2.x + 0.8, b2.y + 1, 1); Wd.tree(b2.x + 2, b2.y + 2, 2); Wd.tree(bb.x + 2.7, bb.y + 0.4, 4);
    var path = new I.Path([[ba.cx, ba.y + ba.d + 0.05], [ba.cx, Wd.roadY(2)], [Wd.roadX(5), Wd.roadY(2)], [Wd.roadX(5), Wd.roadY(4)], [bb.cx, Wd.roadY(4)], [bb.cx, bb.y + bb.d + 0.05]]);
    var f = function (lt) { return I.ease(I.clamp((lt - t0) / (t1 - t0), 0, 1)); };
    traffic(Wd, 6, sd, P); walkers(Wd, 6, sd);
    Wd.groundLive(function (lt) {
      if (lt < t0 - 0.8) return '';
      var a = I.clamp((lt - t0 + 0.8) / 0.6, 0, 1);
      return I.line(path.p, 0.03, P.accent, 7, '2 14', 0.55 * a) + (lt > t0 ? I.line(path.part(0, f(lt)), 0.04, P.accent, 8) : '') +
        I.ring(bb.cx, bb.y + bb.d + 0.4, 0.03, 0.8 + 0.15 * Math.sin(lt * 4), P.accent, 'none', 4, 0.8 * a);
    });
    Wd.live(function (lt) { var q = path.at(f(lt)), l = lane(q, lt > t0 && lt < t1 ? 0.22 : 0); return I.M[veh]({ x: l[0], y: l[1], dir: q.dir, c: P.accent, t: lt }); });
    Wd.groundLive(function (lt) { var q = path.at(f(lt)), l = lane(q, lt > t0 && lt < t1 ? 0.22 : 0); return I.ring(l[0], l[1], 0.03, 0.9 + 0.12 * Math.sin(lt * 6), P.accent, P.accent, 4, 0.55).replace('fill="' + P.accent + '"', 'fill="' + P.accent + '" fill-opacity=".25"'); });
    Wd.label(chip(ic(from.icon || 'storefront', P.card, 28) + ' ' + K.esc(from.label || 'Dark store'), 'ac'), ba.cx, ba.cy, 2.6, { t0: 0.2 });
    Wd.label(chip(ic(to.icon || 'house-line', P.ink, 28) + ' ' + K.esc(to.label || 'Customer'), 'lt'), bb.cx + 0.5, bb.cy, 2.9, { t0: t0 + 0.2 });
    if (p.dist) Wd.label(chip(ic('path', P.ink, 26) + ' ' + K.esc(p.dist), 'lt sm'), Wd.roadX(5), Wd.roadY(3), 0.3, { t0: t0 + (t1 - t0) * 0.3, t1: t1 });
    Wd.label(chip(ic('check-circle', P.card, 30) + ' ' + K.esc(p.done || 'Delivered'), 'ok'), bb.cx, bb.y + bb.d, 1.4, { t0: t1 + 0.1 });
    if (p.timer !== false) {
      var tv = num(p.timer || 10), unit = (String(p.timer || '').match(/[a-z]+/i) || ['min'])[0];
      var tn = corner(S, ic('timer', P.card, 44) + '<b>0:00</b><small>' + K.esc(unit) + '</small>', Math.max(0.2, t0 - 0.5), 'ink');
      var b = tn.querySelector('b');
      S.every(function (lt) { b.textContent = unit === 'min' ? mmss(tv * f(lt)) : (Math.round(tv * f(lt) * 10) / 10).toString(); });
    }
    Wd.camera(function (lt) {
      var q = path.at(f(lt)), z = 1.35 - 0.22 * Math.sin(Math.PI * I.clamp((lt - t0 + 0.6) / (t1 - t0 + 1.2), 0, 1));
      return { x: q.x, y: q.y, z: 0.4, zoom: z };
    });
    var b12 = Wd.block(1, 2), b22 = Wd.block(2, 2); Wd.tree(b12.x + 1, b12.y + 1, 7); Wd.tree(b12.x + 2.3, b12.y + 2.2, 8); Wd.add('house', { x: b22.x + 0.4, y: b22.y + 0.5, w: 1.3, d: 1.2, seed: 9 }); Wd.tree(b22.x + 2.3, b22.y + 1.6, 9);
    S.sfx(t0, 'whoosh', 0.6); S.sfx(t1 + 0.1, 'ding', 0.7);
  });

  // ───────── CUTAWAY: a building whose front walls drop and roof lifts to show the inside ─────────
  var INSIDE = {
    darkstore: function (Wd, b, P, sd, S) {
      for (var r = 0; r < 3; r++) Wd.add('shelf', { x: b.x + 0.5, y: b.y + 0.6 + r * 1.55, w: 4.6, d: 0.5, h: 1.25, seed: sd + r });
      Wd.add('table', { x: b.x + 5.8, y: b.y + 1.2, w: 1.4, d: 2.6 });
      for (var i = 0; i < 3; i++) (function (i) { // pickers: walk an aisle, carry a crate to the packing table
        var y = b.y + 1.3 + i * 1.55, path = new I.Path([[b.x + 0.7, y], [b.x + 5.1, y], [b.x + 5.5, b.y + 2.5]]), per = 5 + i;
        Wd.live(function (lt) {
          var k = ((lt / per + i * 0.3) % 1), f = k < 0.5 ? k * 2 : 2 - k * 2, q = path.at(f);
          return I.M.person({ x: q.x, y: q.y, dir: k < 0.5 ? q.dir : (q.dir + 2) % 4, phase: lt * 9 + i, shirt: P.accent, carry: k < 0.5 ? null : '#FFC233', seed: i });
        });
      })(i);
      Wd.live(function (lt) { return I.M.person({ x: b.x + 7.5, y: b.y + 2.4, dir: 2, phase: 0, shirt: P.accent, seed: 3 }); });
      Wd.live(function (lt) { var n = Math.floor(lt / 1.6) % 5, out = []; for (var j = 0; j < n; j++) out.push(I.M.bag({ x: b.x + 6 + (j % 2) * 0.5, y: b.y + 1.5 + Math.floor(j / 2) * 0.6, z: 0.75, c: P.accent })); return out; });
      return { shelves: [b.x + 2.5, b.y + 2, 1.4], packing: [b.x + 6.5, b.y + 2.5, 1.2], dispatch: [b.x + b.w / 2, b.y + b.d + 1.2, 0.6], pickers: [b.x + 2.5, b.y + 3.6, 1.2] };
    },
    warehouse: function (Wd, b, P, sd) {
      for (var r = 0; r < 3; r++) Wd.add('rack', { x: b.x + 0.5, y: b.y + 0.5 + r * 1.6, w: 5, d: 0.7, h: 2.4, seed: sd + r });
      for (var i = 0; i < 2; i++) (function (i) {
        var y = b.y + 1.5 + i * 1.6, path = new I.Path([[b.x + 0.6, y], [b.x + 6.6, y]]), per = 7 + i * 2;
        Wd.live(function (lt) { var k = (lt / per + i * 0.4) % 1, f = k < 0.5 ? k * 2 : 2 - k * 2, q = path.at(f); return I.M.person({ x: q.x, y: q.y, dir: k < 0.5 ? 0 : 2, phase: lt * 9, shirt: '#FFC233', carry: '#C9A27A', seed: i }); });
      })(i);
      for (var c = 0; c < 6; c++) Wd.add('crate', { x: b.x + 6.4 + (c % 2) * 0.55, y: b.y + 3.5 + Math.floor(c / 2) * 0.55, seed: c });
      return { racks: [b.x + 3, b.y + 2, 2.6], dock: [b.x + b.w / 2, b.y + b.d + 1.3, 0.8], staff: [b.x + 3, b.y + 3.4, 1.3] };
    },
    factory: function (Wd, b, P, sd) {
      Wd.add('conveyor', { x: b.x + 0.6, y: b.y + 2.6, w: 6.6 });
      Wd.add('machine', { x: b.x + 1.4, y: b.y + 0.6, c: '#3A86FF' }); Wd.add('machine', { x: b.x + 4.4, y: b.y + 0.6, c: P.accent });
      Wd.live(function (lt) { var out = []; for (var j = 0; j < 8; j++) { var x = b.x + 0.7 + (((lt * 0.9 + j * 0.82) % 6.4) + 6.4) % 6.4; out.push(I.M.crate({ x: x, y: b.y + 2.68, z: 0.6, w: 0.4, c: j % 2 ? '#C9A27A' : '#FFC233' })); } return out; });
      [[b.x + 2.2, b.y + 3.6], [b.x + 4.6, b.y + 3.6], [b.x + 6.2, b.y + 1.9]].forEach(function (q, i) { Wd.live(function (lt) { return I.M.person({ x: q[0], y: q[1], dir: 3, phase: Math.sin(lt * 2 + i) * 0.4, shirt: '#3A86FF', seed: i }); }); });
      return { line: [b.x + 4, b.y + 2.9, 1], machines: [b.x + 3, b.y + 1.2, 2], workers: [b.x + 4.6, b.y + 3.8, 1.3] };
    },
    kitchen: function (Wd, b, P, sd) {
      Wd.add('stove', { x: b.x + 0.6, y: b.y + 0.5 }); Wd.add('stove', { x: b.x + 2.8, y: b.y + 0.5 }); Wd.add('stove', { x: b.x + 5, y: b.y + 0.5 });
      Wd.add('counter', { x: b.x + 1, y: b.y + 3.6, w: 5, c: P.accent });
      Wd.live(function (lt) { var out = []; [0.6, 2.8, 5].forEach(function (x, i) { for (var f = 0; f < 3; f++) { var c = I.pr(b.x + x + 0.4 + f * 0.5, b.y + 0.9, 0.86), h = 14 + 8 * Math.abs(Math.sin(lt * 9 + f + i * 2)); out.push({ k: b.x + x + b.y + 3, s: '<path d="M' + (c[0] - 7) + ' ' + c[1] + ' Q' + c[0] + ' ' + (c[1] - h * 1.4) + ' ' + (c[0] + 7) + ' ' + c[1] + 'Z" fill="' + (f % 2 ? '#FFC233' : '#FF5A36') + '"/>' }); } }); return out; });
      [[b.x + 1.2, b.y + 1.9], [b.x + 3.4, b.y + 1.9], [b.x + 5.6, b.y + 1.9]].forEach(function (q, i) { Wd.live(function (lt) { return I.M.person({ x: q[0] + Math.sin(lt * 1.5 + i) * 0.3, y: q[1], dir: 3, phase: lt * 4 + i, shirt: '#FFF8F2', hair: '#FFF8F2', seed: i }); }); });
      Wd.live(function (lt) { var n = Math.floor(lt / 1.4) % 6, out = []; for (var j = 0; j < n; j++) out.push(I.M.bag({ x: b.x + 1.3 + j * 0.7, y: b.y + 3.8, z: 0.95, c: P.accent })); return out; });
      return { stoves: [b.x + 3.5, b.y + 1, 1.6], counter: [b.x + 3.5, b.y + 4, 1.4], chefs: [b.x + 3.4, b.y + 2, 1.4] };
    },
    office: function (Wd, b, P, sd) {
      for (var r = 0; r < 2; r++) for (var c = 0; c < 3; c++) (function (r, c) {
        Wd.add('desk', { x: b.x + 0.8 + c * 2.2, y: b.y + 0.8 + r * 2 });
        Wd.live(function (lt) { return I.M.person({ x: b.x + 1.5 + c * 2.2, y: b.y + 1.95 + r * 2, dir: 3, phase: Math.sin(lt * 3 + r + c) * 0.3, shirt: ['#3A86FF', '#2F8F83', P.accent, '#7A2E8E'][(r + c) % 4], seed: r + c }); });
      })(r, c);
      return { team: [b.x + 3.5, b.y + 2, 1.6] };
    },
    kirana: function (Wd, b, P, sd) {
      Wd.add('shelf', { x: b.x + 0.4, y: b.y + 0.4, w: 6.8, d: 0.5, h: 1.6, seed: sd });
      Wd.add('counter', { x: b.x + 2, y: b.y + 3.2, w: 3.4, c: '#2F8F83' });
      Wd.live(function () { return I.M.person({ x: b.x + 3.6, y: b.y + 2.6, dir: 1, shirt: '#FFC233', seed: 2 }); });
      for (var i = 0; i < 3; i++) (function (i) { Wd.live(function (lt) { return I.M.person({ x: b.x + 3 + i * 0.7, y: b.y + 4.6 + Math.sin(lt + i) * 0.05, dir: 3, phase: 0, shirt: ['#FF5A36', '#3A86FF', '#7A2E8E'][i], seed: i + 1 }); }); })(i);
      return { shelves: [b.x + 3.8, b.y + 0.7, 1.9], counter: [b.x + 3.7, b.y + 3.5, 1.2], customers: [b.x + 3.7, b.y + 4.7, 1.2] };
    },
  };
  L('cutaway', function (S, p, P) {
    title(S, p);
    I.setActor(1.45);
    var kind = INSIDE[p.kind] ? p.kind : 'darkstore', sd = (S.d.i || 1) * 5;
    var tOpen = S.at(p.at, sp(S, 0.22));
    var Wd = new I.World(S, { kind: 'none', cols: 3, rows: 3, seed: sd }).build();
    var b = { x: 3, y: 2, w: 8, d: 5.4 }, h = kind === 'warehouse' ? 3.2 : 2.4, wall = p.color || (kind === 'darkstore' ? '#F4E3C9' : '#FFF8F2'), band = P.accent;
    Wd.gGr.innerHTML += I.poly([[b.x - 1.5, b.y - 1.5, 0], [b.x + b.w + 1.5, b.y - 1.5, 0], [b.x + b.w + 1.5, b.y + b.d + 3, 0], [b.x - 1.5, b.y + b.d + 3, 0]], '#E9D7CC') +
      I.box(b.x, b.y, 0, b.w, b.d, 0.06, '#EFE6DA', { edge: false });
    Wd.add('tree', { x: b.x - 0.8, y: b.y + b.d + 1.5, seed: 1 }); Wd.add('tree', { x: b.x + b.w + 1, y: b.y + 0.6, seed: 2 }); Wd.add('tree', { x: b.x + b.w + 1.1, y: b.y + b.d + 2.2, seed: 3 });
    // back walls (always there)
    Wd.items.push({ k: 0.1, s: I.box(b.x - 0.15, b.y - 0.15, 0, 0.15, b.d + 0.15, h, wall, { right: I.sh(wall, -0.06) }) + I.box(b.x, b.y - 0.15, 0, b.w, 0.15, h, wall, { left: I.sh(wall, -0.1) }) });
    var zones = INSIDE[kind](Wd, b, P, sd, S);
    // riders / trucks waiting outside the front
    var out = kind === 'warehouse' ? 'truck' : kind === 'darkstore' || kind === 'kitchen' ? 'scooter' : null;
    if (out) for (var v = 0; v < 2; v++) (function (v) {
      Wd.live(function (lt) {
        var leave = tOpen + 2 + v * 2.5, k = I.clamp((lt - leave) / 2.2, 0, 1), x = b.x + 2 + v * 3 + I.ease(k) * 9;
        return I.M[out]({ x: x, y: b.y + b.d + 1.2, dir: 0, c: P.accent, t: lt });
      });
    })(v);
    // front walls drop, roof lifts away
    var op = function (lt) { return I.ease(I.clamp((lt - tOpen) / 1.1, 0, 1)); };
    Wd.live(function (lt) {
      var k = op(lt), hh = Math.max(0.35, h * (1 - k)), s = '';
      s += I.box(b.x, b.y + b.d, 0, b.w, 0.15, hh, wall);
      if (k < 0.5) s += I.poly([[b.x + 0.4, b.y + b.d + 0.15, hh - 0.6], [b.x + b.w - 0.4, b.y + b.d + 0.15, hh - 0.6], [b.x + b.w - 0.4, b.y + b.d + 0.15, hh - 0.15], [b.x + 0.4, b.y + b.d + 0.15, hh - 0.15]], band);
      return { k: 2 * b.x + b.w + 2 * b.y + 2 * b.d + 0.3, s: s };
    });
    Wd.live(function (lt) { var k = op(lt); return { k: 2 * b.x + 2 * b.w + 2 * b.y + b.d + 0.2, s: I.box(b.x + b.w, b.y - 0.15, 0, 0.15, b.d + 0.3, Math.max(0.35, h * (1 - k)), wall) }; });
    Wd.live(function (lt) {
      var k = op(lt); if (k >= 1) return null;
      return { k: 1e3, s: '<g opacity="' + (1 - k).toFixed(3) + '">' + I.box(b.x - 0.2, b.y - 0.2, h + k * 5, b.w + 0.55, b.d + 0.55, 0.22, I.sh(wall, -0.12)) + '</g>' };
    });
    Wd.label(chip(K.esc(p.sign || (kind === 'darkstore' ? 'Dark store' : kind)), 'ac'), b.x + b.w / 2, b.y + b.d, h + 1.2, { t0: 0.2, t1: tOpen + 0.3 });
    (p.labels || []).forEach(function (l, i) {
      var z = zones[l.zone] || zones[Object.keys(zones)[i % Object.keys(zones).length]];
      Wd.label(chip(K.rich(l.text), i % 2 ? 'lt' : ''), z[0], z[1], z[2] + 0.6, { t0: S.at(l.at, tOpen + 1.2 + i * 1.2) });
      S.sfx(S.at(l.at, tOpen + 1.2 + i * 1.2), 'pop', 0.5);
    });
    // order notifications stacking in the top-right
    var orders = typeof p.orders === 'number' ? Array.apply(null, Array(p.orders)).map(function (_, i) { return {}; }) : (p.orders || []);
    orders.forEach(function (o, i) {
      var t = S.at(o.at, tOpen + 0.9 + i * 1.1);
      var n = S.add('fg', el('div', 'isonote', 'right:70px;top:' + (150 + (i % 4) * 118) + 'px', '<span class="dot">' + ic('bell-ringing', P.card, 26) + '</span><div><b>' + K.esc(o.title || p.sign || 'New order') + '</b><br>' + K.rich(o.text || ('#' + (4800 + Math.round(I.rnd(i + 3) * 900)) + ' · ' + (3 + i * 2) + ' items')) + '</div>'));
      S.anim(n, 'right', t, 0.45, { dist: 260 }); S.tw(t + 2.8, 0.35, function (k) { if (k > 0) n.style.opacity = 1 - k; });
      S.sfx(t, 'ding', 0.45);
    });
    if (p.count) { var c = corner(S, '<b>' + K.esc(p.count.value) + '</b><small>' + K.esc(p.count.label || '') + '</small>', S.at(p.count.at, tOpen + 0.6), 'ink'); S.anim(c.querySelector('b'), 'count', S.at(p.count.at, tOpen + 0.6), 1.6); }
    Wd.camera(function (lt) { var k = op(lt); return { x: b.x + b.w / 2 + 0.4, y: b.y + b.d / 2 + 0.6, z: 0.8 - k * 0.3, zoom: 1.45 + k * 0.4 + lt * 0.006 }; });
    S.sfx(tOpen, 'swish', 0.7);
  });

  // ───────── NETWORK: stores pop up across a city, riders zip out of each ─────────
  L('network', function (S, p, P) {
    title(S, p);
    var sd = (S.d.i || 1) * 11 + 1, list = typeof p.stores === 'number' || p.stores === undefined ? Array.apply(null, Array(p.stores || 8)).map(function () { return {}; }) : p.stores;
    I.setActor(2.2);
    var Wd = new I.World(S, { kind: p.city || 'city', cols: 9, rows: 6, seed: sd, maxH: 2.6 }), cells = [], reserve = {};
    for (var i = 0; i < list.length; i++) { // spread stores over the grid, deterministic
      var tries = 0, c;
      do { c = [Math.floor(I.rnd(sd + i * 7 + tries * 3) * 9), Math.floor(I.rnd(sd + i * 13 + tries * 5) * 6)]; tries++; } while ((reserve[c] || cells.some(function (q) { return Math.abs(q[0] - c[0]) + Math.abs(q[1] - c[1]) < 2; })) && tries < 40);
      reserve[c[0] + ',' + c[1]] = 1; cells.push(c);
    }
    Wd.build(reserve);
    var R = num(p.radius) ? Math.min(4, 1.2 * num(p.radius)) : 2.6, a0 = sp(S, 0.05), a1 = sp(S, 0.8);
    list.forEach(function (st, i) {
      var t = S.at(st.at, a0 + (a1 - a0) * (list.length > 1 ? i / (list.length - 1) : 0)), b = Wd.block(cells[i][0], cells[i][1]);
      Wd.add(nodeModel(st.kind || p.kind || 'darkstore'), { x: b.x + 0.4, y: b.y + 0.5, w: 2.2, d: 1.9, h: 1.4, seed: i, signColor: P.accent, at: t });
      Wd.groundLive(function (lt) { if (lt < t) return ''; var k = I.clamp((lt - t) / 0.9, 0, 1), e = I.back(k); return I.ring(b.cx, b.cy, 0.02, R * e, P.accent, P.accent, 3, 1) .replace('fill="' + P.accent + '"', 'fill="' + P.accent + '" fill-opacity=".18"').replace('stroke-width="3"', 'stroke-width="6"') + (k < 1 ? I.ring(b.cx, b.cy, 0.02, R * (1 + k * 0.6), P.accent, 'none', 4, 1 - k) : ''); });
      for (var r = 0; r < (p.riders === undefined ? 2 : p.riders); r++) (function (r) {
        var dx = (r % 2 ? 1 : -1) * (3 + I.rnd(sd + i + r) * 4), path = new I.Path([[b.cx, b.y + b.d + 0.05], [b.cx, Wd.roadY(cells[i][1] + 1)], [b.cx + dx, Wd.roadY(cells[i][1] + 1)]]), per = 3 + r;
        Wd.live(function (lt) { if (lt < t + 0.8) return null; var k = ((lt - t - 0.8) / per) % 1, f = k < 0.5 ? I.ease(k * 2) : I.ease(2 - k * 2), q = path.at(f), dir = k < 0.5 ? q.dir : (q.dir + 2) % 4, l = lane({ x: q.x, y: q.y, dir: dir }); return I.M.scooter({ x: l[0], y: l[1], dir: dir, c: P.accent, t: lt }); });
      })(r);
      Wd.label(chip(ic('storefront', P.card, 24) + (st.label ? ' ' + K.esc(st.label) : ''), 'ac sm'), b.cx, b.cy, 2.2, { t0: t + 0.3 });
      S.sfx(t, 'pop', 0.5);
    });
    traffic(Wd, 6, sd, P);
    if (p.count) { var c = corner(S, '<b>' + K.esc(p.count.value) + '</b><small>' + K.esc(p.count.label || '') + '</small>', S.at(p.count.at, a0), 'ink'); S.anim(c.querySelector('b'), 'count', S.at(p.count.at, a0), Math.max(1.5, a1 - a0)); }
    var sz = Wd.size();
    Wd.camera(function (lt) { var k = I.clamp(lt / S.dur, 0, 1); return { x: sz[0] / 2, y: sz[1] / 2, z: 0, zoom: (p.zoom || 0.72) * (1.12 - 0.12 * I.ease(k)) }; });
  });

  // ───────── CASH: money piles up, burns, or flows from A to B ─────────
  L('cash', function (S, p, P) {
    title(S, p); I.setActor(1.7);
    var mode = p.mode || 'grow', t = S.at(p.at, sp(S, 0.1)), te = sp(S, 0.9);
    var Wd = new I.World(S, { kind: 'none', cols: 2, rows: 2 }).build();
    Wd.gGr.innerHTML += I.ring(6, 5, 0, 6.5, 'none', '#F3CFDC', 0, 1);
    if (mode === 'flow') {
      var A = p.from || {}, B = p.to || {};
      Wd.add(nodeModel(A.kind || 'phone'), { x: 0.5, y: 3, w: 2.6, d: 2.4, h: 2, signColor: P.accent, seed: 2 });
      Wd.add(nodeModel(B.kind || 'bank'), { x: 8.5, y: 3, w: 2.8, d: 2.4, h: 2, signColor: P.accent, seed: 4 });
      Wd.label(chip(K.esc(A.label || ''), 'lt'), 1.8, 4.2, 3, { t0: 0.2 }); Wd.label(chip(K.esc(B.label || ''), 'ac'), 9.9, 4.2, 3.4, { t0: 0.4 });
      Wd.live(function (lt) {
        if (lt < t) return null; var out = [];
        for (var j = 0; j < 7; j++) { var k = ((lt - t) * 0.45 + j / 7) % 1, x = 3.3 + k * 5, z = 1.4 + Math.sin(k * Math.PI) * 3; out.push(p.token === 'cash' ? I.M.cash({ x: x, y: 4, z: z }) : I.M.coin({ x: x, y: 4.2, z: z })); }
        return out;
      });
      if (p.edge) Wd.label(chip(K.rich(p.edge), 'ink'), 6, 4, 4.8, { t0: t + 0.8 });
    } else {
      var n = 12;
      for (var i = 0; i < n; i++) (function (i) {
        var gx = 3 + (i % 4) * 1.05, gy = 2.6 + Math.floor(i / 4) * 0.62, full = 3 + Math.round(I.rnd(i + 5) * 6) - Math.floor(i / 4);
        Wd.live(function (lt) {
          var k;
          if (mode === 'grow') k = I.clamp((lt - t - i * (te - t) / n * 0.6) / 0.8, 0, 1);
          else k = 1 - I.clamp((lt - t - 0.8 - I.rnd(i) * 2) / Math.max(2, te - t - 2), 0, 0.92);
          var m = Math.max(0, Math.round(full * k));
          return m ? I.M.cash({ x: gx, y: gy, n: m }) : null;
        });
      })(i);
      if (mode === 'burn') {
        Wd.live(function (lt) {
          if (lt < t) return null; var out = [], a = I.clamp((lt - t) / 0.8, 0, 1);
          for (var f = 0; f < 14; f++) {
            var x = 3.2 + (f % 7) * 0.6, y = 2.9 + Math.floor(f / 7) * 0.9, c = I.pr(x, y, 1.1 - 0.3 * I.clamp((lt - t) / (te - t), 0, 1)), hh = (26 + 22 * Math.abs(Math.sin(lt * 7 + f * 1.7))) * a;
            var fl = function (w, hgt, col) { return '<path d="M' + (c[0] - w) + ' ' + c[1] + ' C' + (c[0] - w * 1.2) + ' ' + (c[1] - hgt * 0.5) + ' ' + (c[0] - w * 0.2) + ' ' + (c[1] - hgt * 0.7) + ' ' + (c[0] + Math.sin(lt * 5 + f) * w * 0.4) + ' ' + (c[1] - hgt) + ' C' + (c[0] + w * 0.3) + ' ' + (c[1] - hgt * 0.6) + ' ' + (c[0] + w * 1.2) + ' ' + (c[1] - hgt * 0.45) + ' ' + (c[0] + w) + ' ' + c[1] + ' Z" fill="' + col + '"/>'; };
            out.push({ k: x + y + 3, s: fl(16, hh, '#FF5A36') + fl(9, hh * 0.6, '#FFC233') });
            var sm = ((lt - t) * 0.35 + f / 14) % 1, s2 = I.pr(x, y, 1.5 + sm * 5);
            out.push({ k: 99, s: '<circle cx="' + (s2[0] + Math.sin(sm * 6 + f) * 14).toFixed(1) + '" cy="' + s2[1].toFixed(1) + '" r="' + (8 + sm * 22).toFixed(1) + '" fill="#13293D" opacity="' + (0.22 * (1 - sm) * a).toFixed(3) + '"/>' });
          }
          return out;
        });
        S.sfx(t, 'impact', 0.5);
      }
    }
    if (p.value) { var c = corner(S, '<b>' + K.esc(p.value) + '</b><small>' + K.esc(p.label || '') + '</small>', t, mode === 'burn' ? 'bad' : 'ink'); S.anim(c.querySelector('b'), 'count', t, Math.max(1.2, te - t)); }
    Wd.camera(function (lt) { return { x: mode === 'flow' ? 6 : 4.8, y: mode === 'flow' ? 4.2 : 3.4, z: 0.6, zoom: (mode === 'flow' ? 1.6 : 2.3) + lt * 0.008 }; });
  });

  // ───────── CHAIN: goods / money move step by step (farm -> factory -> warehouse -> store -> home) ─────────
  L('chain', function (S, p, P) {
    title(S, p); I.setActor(1.9);
    var steps = p.steps || [], n = steps.length, gap = 6.5;
    var Wd = new I.World(S, { kind: 'none', cols: 2, rows: 2 }).build();
    var pos = steps.map(function (s, i) { return [1 + i * gap, 1 + (i % 2) * 2.2]; });
    var road = [];
    pos.forEach(function (q, i) { road.push([q[0] + 1.3, q[1] + 3.2]); if (i < n - 1) road.push([q[0] + 1.3 + gap * 0.5, q[1] + 3.2], [q[0] + 1.3 + gap * 0.5, pos[i + 1][1] + 3.2]); });
    var R = new I.Path(road);
    Wd.gGr.innerHTML += I.line(road, 0.01, '#C9B8AE', 42) + I.line(road, 0.02, '#FFF8F2', 3, '10 14');
    var a0 = sp(S, 0.04), a1 = sp(S, 0.92), seg = (a1 - a0) / Math.max(1, n);
    steps.forEach(function (st, i) {
      var t = S.at(st.at, a0 + seg * i), q = pos[i];
      Wd.add(nodeModel(st.kind || 'shop'), { x: q[0], y: q[1], w: 2.6, d: 2.4, h: st.kind === 'tower' ? 4 : 1.8, seed: i + 2, signColor: st.color || P.accent, at: t });
      Wd.label(chip((st.icon ? ic(st.icon, P.card, 26) + ' ' : '') + K.esc(st.label || '') + (st.sub ? '<small>' + K.rich(st.sub) + '</small>' : ''), i === n - 1 ? 'ac' : ''), q[0] + 1.3, q[1] + 1.2, 3.2, { t0: t + 0.3 });
      S.sfx(t, 'pop', 0.5);
      if (i < n - 1) {
        var v = st.vehicle || p.vehicle || (i === n - 2 ? 'scooter' : 'truck'), ts = t + 0.6, te = S.at((steps[i + 1] || {}).at, a0 + seg * (i + 1)) - 0.1;
        var f0 = R.len[i * 3] / R.L, f1 = R.len[Math.min(i * 3 + 3, R.len.length - 1)] / R.L;
        Wd.live(function (lt) {
          if (lt < ts - 0.2 || lt > te + 0.5) return null;
          var k = I.ease(I.clamp((lt - ts) / Math.max(0.6, te - ts), 0, 1)), qq = R.at(f0 + (f1 - f0) * k), l = lane(qq, 0.3);
          var o = [I.M[I.VEHICLES[v] ? v : 'truck']({ x: l[0], y: l[1], dir: qq.dir, c: P.accent, t: lt })];
          if (p.token === 'cash') o.push(I.M.coin({ x: l[0], y: l[1], z: 1.6 + Math.abs(Math.sin(lt * 5)) * 0.3 }));
          return o;
        });
        if (st.edge) Wd.label(chip(K.rich(st.edge), 'lt sm'), q[0] + 1.3 + gap * 0.5, (q[1] + pos[i + 1][1]) / 2 + 3.2, 0.4, { t0: ts + 0.4 });
      }
    });
    Wd.camera(function (lt) {
      var k = I.clamp((lt - a0) / (a1 - a0), 0, 1) * Math.max(1, n - 1), i = Math.min(n - 2, Math.floor(k)), e = I.ease(k - i);
      if (n < 2) return { x: pos[0][0] + 1.3, y: pos[0][1] + 2, z: 0.6, zoom: 1.5 };
      return { x: pos[i][0] + 1.3 + (pos[i + 1][0] - pos[i][0]) * e + gap * 0.25, y: pos[i][1] + 2 + (pos[i + 1][1] - pos[i][1]) * e, z: 0.6, zoom: 1.45 };
    });
  });

  // ───────── ISO: free-form world for stories the presets don't cover ─────────
  // place: [{id, model, block: [i, j] | x, y, w, d, h, color, label, at}], move: [{model, from: id, to: id, at: [go, arrive], label}],
  // cam: {zoom, follow: index into move}
  L('iso', function (S, p, P) {
    title(S, p); I.setActor(1.8);
    var w = p.world || {}, sd = (S.d.i || 1) * 3 + (w.seed || 0);
    var Wd = new I.World(S, { kind: w.kind || 'city', cols: w.cols || 7, rows: w.rows || 5, seed: sd }), reserve = {}, ids = {};
    (p.place || []).forEach(function (o) { if (o.block) reserve[o.block[0] + ',' + o.block[1]] = 1; });
    Wd.build(reserve);
    (p.place || []).forEach(function (o, i) {
      var b = o.block ? Wd.block(o.block[0], o.block[1]) : { x: o.x || 0, y: o.y || 0, w: o.w || 2, d: o.d || 2, cx: (o.x || 0) + (o.w || 2) / 2, cy: (o.y || 0) + (o.d || 2) / 2 };
      var m = nodeModel(o.model || 'shop');
      Wd.add(m, { x: b.x + 0.3, y: b.y + 0.3, w: (o.w || b.w) - 0.6, d: (o.d || b.d) - 0.6, h: o.h, c: o.color, signColor: o.sign || P.accent, seed: i, at: o.at === undefined ? undefined : S.at(o.at, 0) });
      ids[o.id || 'p' + i] = { door: [b.cx, b.y + b.d + 0.05], road: [b.cx, b.y + b.d + Wd.R / 2], b: b };
      if (o.label) Wd.label(chip(K.esc(o.label), o.hi ? 'ac' : ''), b.cx, b.cy, (o.h || 2) + 0.8, { t0: S.at(o.at, 0.2) + 0.2 });
    });
    var paths = (p.move || []).map(function (mv, i) {
      var A = ids[mv.from], B = ids[mv.to]; if (!A || !B) return null;
      var xv = Wd.roadX(Math.round((B.b.x - Wd.R) / (Wd.B + Wd.R)));
      var path = new I.Path([A.door, A.road, [xv, A.road[1]], [xv, B.road[1]], B.road, B.door]);
      var ats = [].concat(mv.at || []), t0 = S.at(ats[0], sp(S, 0.15)), t1 = Math.max(t0 + 1.5, S.at(ats[1], sp(S, 0.85)));
      var f = function (lt) { return I.ease(I.clamp((lt - t0) / (t1 - t0), 0, 1)); };
      Wd.live(function (lt) { var q = path.at(f(lt)), l = lane(q, lt > t0 && lt < t1 ? 0.22 : 0); return I.M[I.VEHICLES[mv.model] ? mv.model : 'scooter']({ x: l[0], y: l[1], dir: q.dir, c: mv.color || P.accent, t: lt }); });
      if (mv.label) Wd.label(chip(K.esc(mv.label), 'sm'), 0, 0, 1.6, { t0: t0, t1: t1 + 0.6, pos: function (lt) { var q = path.at(f(lt)); return [q.x, q.y, 1.6]; } });
      Wd.groundLive(function (lt) { return lt > t0 ? I.line(path.part(0, f(lt)), 0.04, mv.color || P.accent, 7) : ''; });
      return { path: path, f: f };
    });
    if (w.traffic !== false) traffic(Wd, 5, sd, P);
    if (w.people !== false) walkers(Wd, 5, sd);
    var sz = Wd.size(), cam = p.cam || {}, fol = paths[cam.follow];
    Wd.camera(function (lt) { if (fol) { var q = fol.path.at(fol.f(lt)); return { x: q.x, y: q.y, z: 0.4, zoom: cam.zoom || 1.4 }; } return { x: sz[0] / 2, y: sz[1] / 2, z: 0, zoom: (cam.zoom || 0.95) * (1 + lt * 0.006) }; });
  });
})();
