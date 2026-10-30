// iso.js — isometric world kit (shared by the iso layouts): projection, shaded boxes, a parts library
// (buildings, vehicles, people, props) and World: ground + roads + objects + moving actors + labels + camera.
// Like everything in the engine, a frame is a pure function of scene time (World.draw(lt) rebuilds from lt).
(function (G) {
  'use strict';
  var U = 40; // px per grid unit at zoom 1
  var W = 1920, H = 1080;
  function pr(x, y, z) { return [(x - y) * U, (x + y) * U * 0.5 - (z || 0) * U]; }
  function pts(a) { return a.map(function (p) { var q = pr(p[0], p[1], p[2]); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); }
  function rgb(h) { var m = String(h).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); if (m) return [+m[1], +m[2], +m[3]]; h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  // a > 0: toward white, a < 0: toward ink
  function sh(h, a) {
    if (!a) return h;
    var c = rgb(h), t = a > 0 ? [255, 255, 255] : [19, 41, 61], k = Math.abs(a);
    return 'rgb(' + c.map(function (v, i) { return Math.round(v + (t[i] - v) * k); }).join(',') + ')';
  }
  function poly(a, fill, o) { return '<polygon points="' + pts(a) + '" fill="' + fill + '"' + (o || '') + '/>'; }
  var EDGE = ' stroke="rgba(19,41,61,.35)" stroke-width="1.1" stroke-linejoin="round"';

  // shaded box: top light, +y face (left on screen) base colour, +x face (right) darker
  function box(x, y, z, w, d, h, c, o) {
    o = o || {};
    var x1 = x + w, y1 = y + d, z1 = z + h, s = '', e = o.edge === false ? '' : EDGE;
    s += poly([[x, y1, z], [x1, y1, z], [x1, y1, z1], [x, y1, z1]], o.left || c, e);
    s += poly([[x1, y, z], [x1, y1, z], [x1, y1, z1], [x1, y, z1]], o.right || sh(c, -0.24), e);
    if (!o.noTop) s += poly([[x, y, z1], [x1, y, z1], [x1, y1, z1], [x, y1, z1]], o.top || sh(c, 0.22), e);
    return s;
  }
  // window grid on the +x face (x = const) and +y face (y = const)
  function winX(x, y0, y1, z0, z1, rows, cols, c, lit, seed) {
    var s = '', dy = (y1 - y0) / cols, dz = (z1 - z0) / rows;
    for (var r = 0; r < rows; r++) for (var k = 0; k < cols; k++) {
      var a = y0 + k * dy + dy * 0.22, b = a + dy * 0.56, za = z0 + r * dz + dz * 0.25, zb = za + dz * 0.5;
      s += poly([[x, a, za], [x, b, za], [x, b, zb], [x, a, zb]], lit && rnd(seed + r * 7 + k) < lit ? '#FFD66B' : c);
    }
    return s;
  }
  function winY(y, x0, x1, z0, z1, rows, cols, c, lit, seed) {
    var s = '', dx = (x1 - x0) / cols, dz = (z1 - z0) / rows;
    for (var r = 0; r < rows; r++) for (var k = 0; k < cols; k++) {
      var a = x0 + k * dx + dx * 0.22, b = a + dx * 0.56, za = z0 + r * dz + dz * 0.25, zb = za + dz * 0.5;
      s += poly([[a, y, za], [b, y, za], [b, y, zb], [a, y, zb]], lit && rnd(seed + r * 5 + k * 3) < lit ? '#FFD66B' : c);
    }
    return s;
  }
  function rnd(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function back(k) { var c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
  // world-space circle on the ground -> ellipse
  function ring(x, y, z, r, stroke, fill, sw, op) {
    var c = pr(x, y, z);
    return '<ellipse cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" rx="' + (r * U * 1.414).toFixed(1) + '" ry="' + (r * U * 0.707).toFixed(1) + '" fill="' + (fill || 'none') + '" stroke="' + (stroke || 'none') + '" stroke-width="' + (sw || 3) + '" opacity="' + (op === undefined ? 1 : op) + '"/>';
  }
  function shadow(x, y, w, d, h) { // soft shadow cast toward +x on the ground
    var o = Math.min(h * 0.45, 2.2);
    return poly([[x + w, y, 0.01], [x + w + o, y + o * 0.2, 0.01], [x + w + o, y + d + o * 0.2, 0.01], [x + w, y + d, 0.01]], 'rgba(19,41,61,.13)');
  }
  function sortJoin(list) { list.sort(function (a, b) { return a.k - b.k; }); return list.map(function (i) { return i.s; }).join(''); }

  // local (along, side) box for things that face a direction: dir 0:+x 1:+y 2:-x 3:-y
  var SC = 1, ACT = 1.7; // actors (people, vehicles) are drawn bigger than life so they read on screen
  function dbox(px, py, dir, a0, a1, s0, s1, z, h, c, o) {
    a0 *= SC; a1 *= SC; s0 *= SC; s1 *= SC; z *= SC; h *= SC;
    var X0, X1, Y0, Y1;
    if (dir === 0) { X0 = px + a0; X1 = px + a1; Y0 = py + s0; Y1 = py + s1; }
    else if (dir === 2) { X0 = px - a1; X1 = px - a0; Y0 = py - s1; Y1 = py - s0; }
    else if (dir === 1) { X0 = px - s1; X1 = px - s0; Y0 = py + a0; Y1 = py + a1; }
    else { X0 = px + s0; X1 = px + s1; Y0 = py - a1; Y1 = py - a0; }
    return { k: X0 + X1 + Y0 + Y1 + z * 0.02, s: box(X0, Y0, z, X1 - X0, Y1 - Y0, h, c, o) };
  }

  var SKIN = ['#8D5A3B', '#A86B45', '#C68863', '#7A4A2E'];
  var BLD = ['#FFF8F2', '#F7B9A8', '#FFD98A', '#9ED3CA', '#B9C6E8', '#E8A0B8', '#F4E3C9'];

  // ───────── parts library: each returns {k: depth key, s: svg} or a list of them ─────────
  var M = {
    // buildings: o = {x, y, w, d, h, c, seed, sign, signColor}
    tower: function (o) {
      var c = o.c || BLD[o.seed % BLD.length], h = o.h || 5, s = shadow(o.x, o.y, o.w, o.d, h);
      s += box(o.x, o.y, 0, o.w, o.d, h, c);
      var rows = Math.max(2, Math.round(h * 1.1)), win = sh(c, -0.45);
      s += winX(o.x + o.w, o.y, o.y + o.d, 0.3, h - 0.2, rows, Math.max(2, Math.round(o.d * 1.4)), win, 0.18, o.seed);
      s += winY(o.y + o.d, o.x, o.x + o.w, 0.3, h - 0.2, rows, Math.max(2, Math.round(o.w * 1.4)), win, 0.18, o.seed + 3);
      s += box(o.x + o.w * 0.25, o.y + o.d * 0.25, h, o.w * 0.3, o.d * 0.3, 0.35, sh(c, -0.15));
      return { k: o.x + o.y + o.w + o.d, s: s };
    },
    office: function (o) {
      var c = o.c || '#B9C6E8', h = o.h || 6, s = shadow(o.x, o.y, o.w, o.d, h), glass = '#7FA6D6';
      s += box(o.x, o.y, 0, o.w, o.d, h, c);
      for (var r = 0; r < Math.round(h * 1.3); r++) {
        var za = 0.4 + r * 0.75, zb = za + 0.42; if (zb > h - 0.15) break;
        s += poly([[o.x + o.w, o.y + 0.12, za], [o.x + o.w, o.y + o.d - 0.12, za], [o.x + o.w, o.y + o.d - 0.12, zb], [o.x + o.w, o.y + 0.12, zb]], sh(glass, -0.25));
        s += poly([[o.x + 0.12, o.y + o.d, za], [o.x + o.w - 0.12, o.y + o.d, za], [o.x + o.w - 0.12, o.y + o.d, zb], [o.x + 0.12, o.y + o.d, zb]], glass);
      }
      return { k: o.x + o.y + o.w + o.d, s: s };
    },
    house: function (o) {
      var c = o.c || BLD[(o.seed + 2) % BLD.length], h = o.h || 1.2, roof = o.roof || ['#C8553D', '#13293D', '#2F8F83'][o.seed % 3];
      var x = o.x, y = o.y, w = o.w, d = o.d, ym = y + d / 2, rh = Math.min(w, d) * 0.45, s = shadow(x, y, w, d, h + rh);
      s += box(x, y, 0, w, d, h, c, { noTop: true });
      s += poly([[x, ym, h + rh], [x + w, ym, h + rh], [x + w, y + d + 0.08, h - 0.05], [x, y + d + 0.08, h - 0.05]], roof, EDGE);
      s += poly([[x + w, y - 0.04, h], [x + w, y + d + 0.04, h], [x + w, ym, h + rh]], sh(c, -0.18), EDGE);
      s += poly([[x + w * 0.42, y + d, 0], [x + w * 0.58, y + d, 0], [x + w * 0.58, y + d, h * 0.62], [x + w * 0.42, y + d, h * 0.62]], sh(roof, -0.2));
      s += winX(x + w, y + 0.1, y + d - 0.1, h * 0.35, h * 0.85, 1, 2, '#7FA6D6');
      return { k: x + y + w + d, s: s };
    },
    shop: function (o) { // kirana / restaurant / any storefront: awning + sign
      var c = o.c || '#FFF8F2', h = o.h || 1.5, x = o.x, y = o.y, w = o.w, d = o.d, aw = o.signColor || '#FF5A36', s = shadow(x, y, w, d, h);
      s += box(x, y, 0, w, d, h, c);
      s += poly([[x + 0.15, y + d, 0], [x + w - 0.15, y + d, 0], [x + w - 0.15, y + d, h * 0.62], [x + 0.15, y + d, h * 0.62]], '#3B4A63');
      for (var i = 0; i < 6; i++) { // striped awning sloping out over the +y face
        var a = x + 0.05 + i * (w - 0.1) / 6, b = a + (w - 0.1) / 6;
        s += poly([[a, y + d, h * 0.82], [b, y + d, h * 0.82], [b, y + d + 0.55, h * 0.6], [a, y + d + 0.55, h * 0.6]], i % 2 ? '#FFF8F2' : aw, EDGE);
      }
      s += box(x + 0.1, y + d - 0.06, h, w - 0.2, 0.06, 0.55, aw);
      return { k: x + y + w + d + 0.6, s: s };
    },
    darkstore: function (o) { // plain box, brand band, roller shutters, sign
      var c = o.c || '#F4E3C9', h = o.h || 1.7, x = o.x, y = o.y, w = o.w, d = o.d, b = o.signColor || '#FF5A36', s = shadow(x, y, w, d, h);
      s += box(x, y, 0, w, d, h, c);
      s += poly([[x, y + d, h - 0.42], [x + w, y + d, h - 0.42], [x + w, y + d, h - 0.08], [x, y + d, h - 0.08]], b);
      s += poly([[x + w, y, h - 0.42], [x + w, y + d, h - 0.42], [x + w, y + d, h - 0.08], [x + w, y, h - 0.08]], sh(b, -0.2));
      for (var i = 0; i < 2; i++) {
        var a = x + 0.3 + i * (w / 2), e = a + w / 2 - 0.6;
        s += poly([[a, y + d, 0], [e, y + d, 0], [e, y + d, h * 0.55], [a, y + d, h * 0.55]], '#9AA3AD');
        for (var j = 1; j < 5; j++) { var zz = j * h * 0.11; s += '<polyline points="' + pts([[a, y + d, zz], [e, y + d, zz]]) + '" stroke="#6E7885" stroke-width="1.5" fill="none"/>'; }
      }
      return { k: x + y + w + d, s: s };
    },
    warehouse: function (o) {
      var c = o.c || '#C9D3DE', h = o.h || 2.2, x = o.x, y = o.y, w = o.w, d = o.d, ym = y + d / 2, s = shadow(x, y, w, d, h + 0.6);
      s += box(x, y, 0, w, d, h, c, { noTop: true });
      s += poly([[x, ym, h + 0.6], [x + w, ym, h + 0.6], [x + w, y + d, h], [x, y + d, h]], '#2F8F83', EDGE);
      s += poly([[x + w, y, h], [x + w, y + d, h], [x + w, ym, h + 0.6]], sh(c, -0.2), EDGE);
      for (var i = 0; i < 3; i++) { var a = x + 0.4 + i * (w - 0.6) / 3, e = a + (w - 0.6) / 3 - 0.4; s += poly([[a, y + d, 0], [e, y + d, 0], [e, y + d, 1.2], [a, y + d, 1.2]], '#6E7885'); }
      return { k: x + y + w + d, s: s };
    },
    factory: function (o) {
      var c = o.c || '#E7C6A5', h = o.h || 1.8, x = o.x, y = o.y, w = o.w, d = o.d, s = shadow(x, y, w, d, h + 2);
      s += box(x, y, 0, w, d, h, c, { noTop: true });
      var n = Math.max(2, Math.round(w / 1.3)), step = w / n;
      for (var i = 0; i < n; i++) { // saw-tooth roof
        var a = x + i * step;
        s += poly([[a, y, h], [a, y + d, h], [a + step, y + d, h + 0.7], [a + step, y, h + 0.7]], sh(c, 0.2), EDGE);
        s += poly([[a + step, y, h + 0.7], [a + step, y + d, h + 0.7], [a + step, y + d, h], [a + step, y, h]], '#7FA6D6', EDGE);
      }
      s += box(x + w * 0.15, y + 0.3, 0, 0.5, 0.5, h + 2.2, '#9AA3AD') + box(x + w * 0.15 - 0.05, y + 0.25, h + 2, 0.6, 0.6, 0.25, '#C8553D');
      s += winY(y + d, x, x + w, 0.3, h - 0.3, 1, Math.round(w), '#7FA6D6');
      return { k: x + y + w + d, s: s };
    },
    bank: function (o) {
      var c = o.c || '#FFF8F2', h = o.h || 2.2, x = o.x, y = o.y, w = o.w, d = o.d, s = shadow(x, y, w, d, h + 0.8);
      s += box(x, y, 0, w, d, 0.25, '#D9CDBE') + box(x + 0.2, y + 0.2, 0.25, w - 0.4, d - 0.5, h, c);
      for (var i = 0; i < 4; i++) s += box(x + 0.35 + i * (w - 0.9) / 3, y + d - 0.45, 0.25, 0.2, 0.2, h - 0.1, '#FFFFFF');
      s += poly([[x + 0.15, y + d - 0.3, h + 0.15], [x + w - 0.15, y + d - 0.3, h + 0.15], [x + w / 2, y + d - 0.3, h + 0.9]], sh(c, -0.1), EDGE);
      s += box(x + 0.15, y + 0.15, h + 0.15, w - 0.3, d - 0.45, 0.12, sh(c, -0.08));
      return { k: x + y + w + d, s: s };
    },
    farm: function (o) {
      var x = o.x, y = o.y, w = o.w, d = o.d, s = poly([[x, y, 0.02], [x + w, y, 0.02], [x + w, y + d, 0.02], [x, y + d, 0.02]], '#B5D98C');
      for (var i = 0; i < 5; i++) { var yy = y + 0.3 + i * (d - 0.6) / 4; s += '<polyline points="' + pts([[x + 0.3, yy, 0.03], [x + w * 0.55, yy, 0.03]]) + '" stroke="#7FB069" stroke-width="7" stroke-linecap="round" fill="none"/>'; }
      var b = M.house({ x: x + w * 0.62, y: y + 0.4, w: w * 0.32, d: d * 0.5, h: 1.1, c: '#C8553D', roof: '#7A2E1D', seed: 1 });
      return [{ k: x + y, s: s }, b];
    },
    phone: function (o) { // a giant phone lying on the ground: "the app"
      var x = o.x, y = o.y, s = shadow(x, y, 1.6, 2.8, 0.5);
      s += box(x, y, 0, 1.6, 2.8, 0.18, '#13293D');
      s += poly([[x + 0.1, y + 0.18, 0.19], [x + 1.5, y + 0.18, 0.19], [x + 1.5, y + 2.62, 0.19], [x + 0.1, y + 2.62, 0.19]], o.signColor || '#FF5A36');
      return { k: x + y + 4.4, s: s };
    },

    // props
    tree: function (o) {
      var c = pr(o.x, o.y, 0), r = (o.r || 0.45) * U, g = o.c || ['#2F8F83', '#4FA88E', '#7FB069'][o.seed % 3], h = (o.h || 1.1) * U;
      var s = '<ellipse cx="' + (c[0] + r * 0.4).toFixed(1) + '" cy="' + (c[1] + 2).toFixed(1) + '" rx="' + (r * 1.1).toFixed(1) + '" ry="' + (r * 0.45).toFixed(1) + '" fill="rgba(19,41,61,.14)"/>';
      s += '<rect x="' + (c[0] - 3).toFixed(1) + '" y="' + (c[1] - h * 0.55).toFixed(1) + '" width="6" height="' + (h * 0.55).toFixed(1) + '" fill="#7A4A2E"/>';
      s += '<circle cx="' + c[0].toFixed(1) + '" cy="' + (c[1] - h * 0.7).toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + g + '" stroke="rgba(19,41,61,.3)" stroke-width="1.1"/>';
      s += '<circle cx="' + (c[0] - r * 0.3).toFixed(1) + '" cy="' + (c[1] - h * 0.7 - r * 0.3).toFixed(1) + '" r="' + (r * 0.45).toFixed(1) + '" fill="' + sh(g, 0.25) + '"/>';
      return { k: o.x + o.y + 0.5, s: s };
    },
    shelf: function (o) { // long shelf along x with coloured products on 3 tiers
      var x = o.x, y = o.y, w = o.w || 3, d = o.d || 0.5, h = o.h || 1.3, s = box(x, y, 0, w, d, h, '#D9CDBE');
      var cols = ['#FF5A36', '#FFC233', '#2F8F83', '#3A86FF', '#7A2E8E', '#E8A0B8'];
      for (var t = 0; t < 3; t++) for (var i = 0; i < Math.round(w * 2.5); i++) {
        var a = x + 0.08 + i * (w - 0.16) / Math.round(w * 2.5), zt = 0.12 + t * h / 3, ph = h / 3 * (0.45 + 0.4 * rnd(o.seed + i * 3 + t));
        s += poly([[a, y + d, zt], [a + 0.28, y + d, zt], [a + 0.28, y + d, zt + ph], [a, y + d, zt + ph]], cols[Math.floor(rnd(o.seed + i + t * 11) * cols.length)], ' stroke="rgba(19,41,61,.25)" stroke-width=".8"');
      }
      return { k: x + y + w + d, s: s };
    },
    rack: function (o) { // tall warehouse rack with pallets
      var x = o.x, y = o.y, w = o.w || 3, d = o.d || 0.7, h = o.h || 2.6, s = '';
      for (var t = 0; t < 3; t++) { s += box(x, y, t * h / 3, w, d, 0.08, '#FF8A3D'); for (var i = 0; i < Math.round(w / 0.9); i++) if (rnd(o.seed + t * 9 + i) > 0.25) s += box(x + 0.1 + i * 0.9, y + 0.08, t * h / 3 + 0.08, 0.7, d - 0.16, h / 3 * 0.6, ['#C9A27A', '#D9B48F', '#B98D62'][i % 3]); }
      s += box(x, y + d - 0.06, 0, 0.08, 0.06, h, '#3A86FF') + box(x + w - 0.08, y + d - 0.06, 0, 0.08, 0.06, h, '#3A86FF');
      return { k: x + y + w + d, s: s };
    },
    table: function (o) { return { k: o.x + o.y + (o.w || 1.6) + (o.d || 0.8), s: box(o.x, o.y, 0, o.w || 1.6, o.d || 0.8, 0.75, o.c || '#C9A27A') }; },
    crate: function (o) { var z = o.z || 0, w = o.w || 0.45; return { k: o.x + o.y + w * 2 + z * 0.02, s: box(o.x, o.y, z, w, w, w * 0.8, o.c || '#C9A27A') + poly([[o.x + w * 0.4, o.y + w, z], [o.x + w * 0.6, o.y + w, z], [o.x + w * 0.6, o.y + w, z + w * 0.8], [o.x + w * 0.4, o.y + w, z + w * 0.8]], 'rgba(255,248,242,.75)') }; },
    bag: function (o) { var z = o.z || 0; return { k: o.x + o.y + 0.7 + z * 0.02, s: box(o.x, o.y, z, 0.3, 0.22, 0.38, o.c || '#FF5A36') }; },
    cash: function (o) { // bundle of notes: o.n stacked bundles
      var s = '', z = o.z || 0;
      for (var i = 0; i < (o.n || 1); i++) s += box(o.x, o.y, z + i * 0.16, 0.8, 0.4, 0.15, '#7FB069', { top: '#A8D08D' }) + poly([[o.x + 0.33, o.y + 0.4, z + i * 0.16], [o.x + 0.47, o.y + 0.4, z + i * 0.16], [o.x + 0.47, o.y + 0.4, z + i * 0.16 + 0.15], [o.x + 0.33, o.y + 0.4, z + i * 0.16 + 0.15]], '#FFF8F2');
      return { k: o.x + o.y + 1.2 + z * 0.02, s: s };
    },
    coin: function (o) { var c = pr(o.x, o.y, o.z || 0); return { k: o.x + o.y + 0.6 + (o.z || 0) * 0.02, s: '<ellipse cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" rx="13" ry="7" fill="#D99A1E"/><ellipse cx="' + c[0].toFixed(1) + '" cy="' + (c[1] - 4).toFixed(1) + '" rx="13" ry="7" fill="#FFC233" stroke="#D99A1E" stroke-width="1.5"/>' }; },
    conveyor: function (o) { return { k: o.x + o.y + (o.w || 4) + 0.6, s: box(o.x, o.y, 0, o.w || 4, 0.6, 0.55, '#3B4A63') + box(o.x, o.y + 0.05, 0.55, o.w || 4, 0.5, 0.04, '#13293D') }; },
    machine: function (o) { return { k: o.x + o.y + 2.4, s: box(o.x, o.y, 0, 1.2, 1.2, 1.5, o.c || '#3A86FF') + box(o.x + 0.2, o.y + 0.2, 1.5, 0.5, 0.5, 0.3, '#9AA3AD') }; },
    stove: function (o) { return { k: o.x + o.y + 2.6, s: box(o.x, o.y, 0, 1.8, 0.8, 0.85, '#9AA3AD', { top: '#3B4A63' }) }; },
    desk: function (o) { return { k: o.x + o.y + 2.4, s: box(o.x, o.y, 0, 1.4, 0.8, 0.7, '#C9A27A') + box(o.x + 0.45, o.y + 0.2, 0.7, 0.5, 0.05, 0.35, '#13293D') }; },
    counter: function (o) { return { k: o.x + o.y + (o.w || 2) + 0.7, s: box(o.x, o.y, 0, o.w || 2, 0.7, 0.95, o.c || '#FF5A36', { top: '#FFF8F2' }) }; },
    lamp: function (o) { var c = pr(o.x, o.y, 0); return { k: o.x + o.y + 0.3, s: '<rect x="' + (c[0] - 2) + '" y="' + (c[1] - 70) + '" width="4" height="70" fill="#3B4A63"/><circle cx="' + c[0] + '" cy="' + (c[1] - 72) + '" r="6" fill="#FFD66B"/>' }; },

    // people: o = {x, y, z, dir, phase (walk), shirt, skin, hair, carry}
    person: function (o) {
      var x = o.x, y = o.y, z = o.z || 0, dir = o.dir || 0, ph = o.phase || 0, sw = Math.sin(ph) * 0.09, bob = Math.abs(Math.cos(ph)) * 0.03;
      var shirt = o.shirt || '#2F8F83', skin = o.skin || SKIN[(o.seed || 0) % 4], L = [];
      L.push(dbox(x, y, dir, -0.06 + sw, 0.06 + sw, -0.11, -0.01, z, 0.38, '#13293D', { edge: false }));
      L.push(dbox(x, y, dir, -0.06 - sw, 0.06 - sw, 0.01, 0.11, z, 0.38, '#13293D', { edge: false }));
      L.push(dbox(x, y, dir, -0.09, 0.09, -0.13, 0.13, z + 0.38 + bob, 0.36, shirt));
      L.push(dbox(x, y, dir, -0.08, 0.08, -0.08, 0.08, z + 0.76 + bob, 0.17, skin));
      L.push(dbox(x, y, dir, -0.09, 0.07, -0.09, 0.09, z + 0.9 + bob, 0.06, o.hair || '#1B1512'));
      if (o.carry) L.push(dbox(x, y, dir, 0.1, 0.36, -0.12, 0.12, z + 0.5 + bob, 0.24, o.carry));
      L.forEach(function (b) { b.k = 0; });
      return { k: x + y + 0.35 + z * 0.02, s: L.map(function (b) { return b.s; }).join('') };
    },
    // vehicles: o = {x, y, dir, c (brand), t (for wheel bob)}
    scooter: function (o) {
      var x = o.x, y = o.y, d = o.dir || 0, c = o.c || '#FF5A36', b = Math.sin((o.t || 0) * 30) * 0.015, L = [];
      L.push(dbox(x, y, d, -0.42, -0.24, -0.04, 0.04, 0, 0.2, '#13293D'));
      L.push(dbox(x, y, d, 0.24, 0.42, -0.04, 0.04, 0, 0.2, '#13293D'));
      L.push(dbox(x, y, d, -0.4, 0.4, -0.13, 0.13, 0.16 + b, 0.18, '#FFF8F2'));
      L.push(dbox(x, y, d, 0.3, 0.42, -0.06, 0.06, 0.32 + b, 0.38, '#3B4A63'));
      L.push(dbox(x, y, d, -0.5, -0.12, -0.2, 0.2, 0.34 + b, 0.38, c));
      L.push(dbox(x, y, d, -0.08, 0.14, -0.12, 0.12, 0.34 + b, 0.36, o.shirt || c));
      L.push(dbox(x, y, d, -0.05, 0.11, -0.08, 0.08, 0.7 + b, 0.16, '#A86B45'));
      L.push(dbox(x, y, d, -0.07, 0.13, -0.1, 0.1, 0.84 + b, 0.12, c));
      return { k: x + y + 0.5, s: sortJoin(L) };
    },
    bike: function (o) { var r = M.scooter(Object.assign({}, o, { c: o.c || '#3A86FF' })); return r; },
    car: function (o) {
      var x = o.x, y = o.y, d = o.dir || 0, c = o.c || BLD[(o.seed || 1) % BLD.length], L = [];
      [[-0.55, -0.28], [0.35, -0.28], [-0.55, 0.2], [0.35, 0.2]].forEach(function (w) { L.push(dbox(x, y, d, w[0], w[0] + 0.22, w[1], w[1] + 0.08, 0, 0.18, '#13293D')); });
      L.push(dbox(x, y, d, -0.65, 0.65, -0.3, 0.3, 0.1, 0.3, c));
      L.push(dbox(x, y, d, -0.35, 0.3, -0.27, 0.27, 0.4, 0.26, '#9CC3E6', { top: sh(c, 0.2) }));
      return { k: x + y + 0.7, s: sortJoin(L) };
    },
    auto: function (o) {
      var x = o.x, y = o.y, d = o.dir || 0, L = [];
      L.push(dbox(x, y, d, 0.35, 0.5, -0.04, 0.04, 0, 0.18, '#13293D'));
      L.push(dbox(x, y, d, -0.45, -0.3, -0.3, -0.22, 0, 0.18, '#13293D'));
      L.push(dbox(x, y, d, -0.45, -0.3, 0.22, 0.3, 0, 0.18, '#13293D'));
      L.push(dbox(x, y, d, -0.5, 0.5, -0.28, 0.28, 0.12, 0.42, '#3FA34D', { top: '#FFC233' }));
      L.push(dbox(x, y, d, -0.5, 0.35, -0.3, 0.3, 0.54, 0.34, '#13293D', { left: '#1F3550' }));
      return { k: x + y + 0.6, s: sortJoin(L) };
    },
    van: function (o) {
      var x = o.x, y = o.y, d = o.dir || 0, c = o.c || '#FFF8F2', L = [];
      [[-0.6, -0.3], [0.4, -0.3], [-0.6, 0.22], [0.4, 0.22]].forEach(function (w) { L.push(dbox(x, y, d, w[0], w[0] + 0.24, w[1], w[1] + 0.08, 0, 0.2, '#13293D')); });
      L.push(dbox(x, y, d, -0.75, 0.75, -0.32, 0.32, 0.12, 0.75, c));
      L.push(dbox(x, y, d, 0.55, 0.77, -0.28, 0.28, 0.45, 0.3, '#9CC3E6'));
      L.push(dbox(x, y, d, -0.6, 0.4, 0.3, 0.33, 0.4, 0.22, o.stripe || '#FF5A36', { edge: false }));
      return { k: x + y + 0.8, s: sortJoin(L) };
    },
    truck: function (o) {
      var x = o.x, y = o.y, d = o.dir || 0, c = o.c || '#FF5A36', L = [];
      [[-1.05, -0.36], [-0.5, -0.36], [0.55, -0.36], [-1.05, 0.28], [-0.5, 0.28], [0.55, 0.28]].forEach(function (w) { L.push(dbox(x, y, d, w[0], w[0] + 0.26, w[1], w[1] + 0.08, 0, 0.22, '#13293D')); });
      L.push(dbox(x, y, d, -1.2, 0.35, -0.38, 0.38, 0.15, 1.0, o.cargo || '#FFF8F2'));
      L.push(dbox(x, y, d, -1.15, 0.3, 0.36, 0.39, 0.45, 0.35, c, { edge: false }));
      L.push(dbox(x, y, d, 0.42, 0.95, -0.36, 0.36, 0.15, 0.72, c));
      L.push(dbox(x, y, d, 0.8, 0.96, -0.3, 0.3, 0.5, 0.3, '#9CC3E6'));
      return { k: x + y + 1.0, s: sortJoin(L) };
    },
    bus: function (o) {
      var x = o.x, y = o.y, d = o.dir || 0, c = o.c || '#C8553D', L = [];
      [[-1.2, -0.38], [0.9, -0.38], [-1.2, 0.3], [0.9, 0.3]].forEach(function (w) { L.push(dbox(x, y, d, w[0], w[0] + 0.26, w[1], w[1] + 0.08, 0, 0.22, '#13293D')); });
      L.push(dbox(x, y, d, -1.4, 1.4, -0.4, 0.4, 0.15, 0.95, c));
      L.push(dbox(x, y, d, -1.3, 1.3, 0.39, 0.42, 0.6, 0.3, '#9CC3E6', { edge: false }));
      return { k: x + y + 1.2, s: sortJoin(L) };
    },
  };
  ['person', 'scooter', 'car', 'auto', 'van', 'truck', 'bus'].forEach(function (k) {
    var f = M[k];
    M[k] = function (o) { var prev = SC; SC = o.s || (k === 'person' ? Math.min(ACT, 1.45) : ACT); try { var r = f(o); r.k += (SC - 1) * 0.6; return r; } finally { SC = prev; } };
  });
  M.restaurant = function (o) { return M.shop(Object.assign({ c: '#FFF8F2' }, o)); };
  M.kirana = function (o) { return M.shop(Object.assign({ signColor: '#2F8F83' }, o)); };
  M.home = M.house;
  M.store = M.shop;
  var VEHICLES = { scooter: 1, bike: 1, car: 1, auto: 1, van: 1, truck: 1, bus: 1 };

  // ───────── World ─────────
  // o: {kind: city|suburb|plain|none, cols, rows, block (3), road (1), seed, reserve: {"i,j": true}}
  function World(S, o) {
    o = o || {};
    this.S = S; this.o = o; this.act = ACT; // actor scale chosen by the layout (setActor before new World)
    this.B = o.block || 3; this.R = o.road === undefined ? 1 : o.road;
    this.cols = o.cols || 6; this.rows = o.rows || 4; this.seed = o.seed || 1;
    this.items = []; this.dyn = []; this.ground = []; this.labels = []; this.camFn = null;
    this.wrap = S.add('mid', document.createElement('div'));
    this.wrap.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;filter:drop-shadow(0 10px 18px rgba(19,41,61,.10))';
    this.wrap.innerHTML = '<svg width="1920" height="1080" style="position:absolute;left:0;top:0;overflow:visible"><g class="cam"><g class="gr"></g><g class="gd"></g><g class="ob"></g></g></svg>';
    this.gCam = this.wrap.querySelector('.cam'); this.gGr = this.wrap.querySelector('.gr'); this.gGd = this.wrap.querySelector('.gd'); this.gOb = this.wrap.querySelector('.ob');
    this.lab = S.add('fg', document.createElement('div'));
    this.lab.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;pointer-events:none';
    var self = this;
    S.every(function (lt) { self.draw(lt); });
  }
  World.prototype = {
    size: function () { return [this.cols * (this.B + this.R) + this.R, this.rows * (this.B + this.R) + this.R]; },
    block: function (i, j) { var s = this.B + this.R; return { x: this.R + i * s, y: this.R + j * s, w: this.B, d: this.B, cx: this.R + i * s + this.B / 2, cy: this.R + j * s + this.B / 2 }; },
    roadX: function (k) { return k * (this.B + this.R) + this.R / 2; }, // vertical road centre (x = const)
    roadY: function (k) { return k * (this.B + this.R) + this.R / 2; },
    // ground, roads, blocks; then fill blocks not reserved with the city kind
    build: function (reserve) {
      reserve = reserve || {};
      var sz = this.size(), g = '', kind = this.o.kind || 'city', self = this;
      var road = kind === 'plain' ? '#E9D3C2' : '#55607A', pad = 2.5;
      g += poly([[-pad, -pad, 0], [sz[0] + pad, -pad, 0], [sz[0] + pad, sz[1] + pad, 0], [-pad, sz[1] + pad, 0]], kind === 'plain' ? '#EED9C4' : '#F3CFDC');
      if (kind !== 'plain' && kind !== 'none') {
        g += poly([[0, 0, 0], [sz[0], 0, 0], [sz[0], sz[1], 0], [0, sz[1], 0]], road);
        for (var k = 0; k <= this.cols; k++) g += '<polyline points="' + pts([[this.roadX(k), 0, 0.01], [this.roadX(k), sz[1], 0.01]]) + '" stroke="#FFC233" stroke-width="2.2" stroke-dasharray="14 16" fill="none" opacity=".8"/>';
        for (var r = 0; r <= this.rows; r++) g += '<polyline points="' + pts([[0, this.roadY(r), 0.01], [sz[0], this.roadY(r), 0.01]]) + '" stroke="#FFC233" stroke-width="2.2" stroke-dasharray="14 16" fill="none" opacity=".8"/>';
      }
      for (var i = 0; i < this.cols; i++) for (var j = 0; j < this.rows; j++) {
        var b = this.block(i, j), green = kind === 'suburb' && rnd(this.seed + i * 13 + j * 7) < 0.25;
        if (kind !== 'plain' && kind !== 'none') g += box(b.x - 0.08, b.y - 0.08, 0, b.w + 0.16, b.d + 0.16, 0.08, green ? '#A8D5B5' : '#FFF0F4', { edge: false });
        if (reserve[i + ',' + j] || kind === 'none') continue;
        this.fill(b, i, j, this.o.low && this.o.low[i + ',' + j] ? 'suburb' : kind);
      }
      this.gGr.innerHTML = g;
      return this;
    },
    fill: function (b, i, j, kind) {
      var sd = this.seed * 31 + i * 17 + j * 5, r = rnd(sd), mh = this.o.maxH || 9, cap = function (v) { return Math.min(v, mh); };
      if (kind === 'city') {
        if (r < 0.12) { this.tree(b.x + 0.7, b.y + 0.7, sd); this.tree(b.x + 2.2, b.y + 1.6, sd + 1); this.tree(b.x + 1.2, b.y + 2.4, sd + 2); return; }
        if (r < 0.55) { // 2-4 towers
          var hs = [cap(2 + rnd(sd + 1) * 5), cap(2 + rnd(sd + 2) * 4), cap(1.5 + rnd(sd + 3) * 3)];
          this.add('tower', { x: b.x + 0.15, y: b.y + 0.15, w: 1.25, d: 1.25, h: hs[0], seed: sd });
          this.add(rnd(sd + 4) < 0.5 ? 'office' : 'tower', { x: b.x + 1.6, y: b.y + 0.15, w: 1.25, d: 1.25, h: hs[1], seed: sd + 1 });
          this.add('shop', { x: b.x + 0.15, y: b.y + 1.65, w: 1.3, d: 1.1, h: 1.1, seed: sd + 2, signColor: ['#FF5A36', '#2F8F83', '#3A86FF', '#7A2E8E'][sd % 4] });
          this.add('tower', { x: b.x + 1.6, y: b.y + 1.65, w: 1.25, d: 1.1, h: hs[2], seed: sd + 3 });
        } else this.add(rnd(sd + 5) < 0.5 ? 'office' : 'tower', { x: b.x + 0.25, y: b.y + 0.25, w: 2.5, d: 2.5, h: cap(3 + rnd(sd + 6) * 5), seed: sd });
      } else if (kind === 'suburb') {
        this.add('house', { x: b.x + 0.25, y: b.y + 0.3, w: 1.2, d: 1.1, seed: sd }); this.add('house', { x: b.x + 1.65, y: b.y + 0.3, w: 1.1, d: 1.1, seed: sd + 1 });
        this.add(r < 0.5 ? 'house' : 'shop', { x: b.x + 0.25, y: b.y + 1.7, w: 1.2, d: 1.0, seed: sd + 2 });
        this.tree(b.x + 2.2, b.y + 2.3, sd);
      } else if (kind === 'plain') {
        if (r < 0.6) this.tree(b.x + 0.5 + rnd(sd) * 2, b.y + 0.5 + rnd(sd + 1) * 2, sd);
      }
    },
    tree: function (x, y, seed) { this.items.push(M.tree({ x: x, y: y, seed: seed || 0 })); },
    // static part; o.at = time it rises out of the ground (0 = already there)
    add: function (model, o) {
      var r = M[model](o), list = Array.isArray(r) ? r : [r];
      var self = this;
      list.forEach(function (it) { if (o.at !== undefined && o.at !== null) { it.at = o.at; it.mk = function (k) { return M[model](Object.assign({}, o, { h: (o.h || 1.6) * k })); }; } self.items.push(it); });
      return list[0];
    },
    // something drawn fresh every frame: fn(lt) -> {k, s} | [..] | null
    live: function (fn) { this.dyn.push(fn); return this; },
    groundLive: function (fn) { this.ground.push(fn); return this; },
    // label chip that follows a world point; o: {t0, t1, cls, css, html}
    label: function (html, x, y, z, o) {
      o = o || {};
      var n = document.createElement('div');
      n.className = o.cls || 'isolab'; n.innerHTML = html;
      n.style.cssText = 'position:absolute;left:0;top:0;opacity:0;' + (o.css || '');
      this.lab.appendChild(n);
      var L = { n: n, x: x, y: y, z: z || 0, t0: o.t0 || 0, t1: o.t1 === undefined ? 1e9 : o.t1, pos: o.pos };
      this.labels.push(L);
      return L;
    },
    camera: function (fn) { this.camFn = fn; return this; }, // fn(lt) -> {x, y, z, zoom}
    toScreen: function (x, y, z, cam) { var a = pr(x, y, z), c = pr(cam.x, cam.y, cam.z || 0); return [W / 2 + (a[0] - c[0]) * cam.zoom, H / 2 + (a[1] - c[1]) * cam.zoom]; },
    draw: function (lt) { var prev = ACT; ACT = this.act; try { this.draw2(lt); } finally { ACT = prev; } },
    draw2: function (lt) {
      var sz = this.size(), cam = this.camFn ? this.camFn(lt) : { x: sz[0] / 2, y: sz[1] / 2, z: 0, zoom: 1 };
      var c = pr(cam.x, cam.y, cam.z || 0);
      this.gCam.setAttribute('transform', 'translate(' + (W / 2) + ' ' + (H / 2) + ') scale(' + cam.zoom.toFixed(4) + ') translate(' + (-c[0]).toFixed(1) + ' ' + (-c[1]).toFixed(1) + ')');
      var gd = '';
      for (var g = 0; g < this.ground.length; g++) gd += this.ground[g](lt) || '';
      this.gGd.innerHTML = gd;
      var list = [];
      for (var i = 0; i < this.items.length; i++) {
        var it = this.items[i];
        if (it.at !== undefined) {
          if (lt < it.at) continue;
          var k = clamp((lt - it.at) / 0.6, 0, 1);
          if (k < 1) { var r = it.mk(back(k)); (Array.isArray(r) ? r : [r]).forEach(function (q) { list.push(q); }); continue; }
        }
        list.push(it);
      }
      for (var j = 0; j < this.dyn.length; j++) {
        var d = this.dyn[j](lt);
        if (!d) continue;
        if (Array.isArray(d)) d.forEach(function (q) { if (q) list.push(q); }); else list.push(d);
      }
      this.gOb.innerHTML = sortJoin(list);
      for (var l = 0; l < this.labels.length; l++) {
        var L = this.labels[l], p = L.pos ? L.pos(lt) : [L.x, L.y, L.z];
        var s = this.toScreen(p[0], p[1], p[2], cam), on = lt >= L.t0 && lt < L.t1;
        var kk = on ? clamp((lt - L.t0) / 0.3, 0, 1) : 0;
        L.n.style.opacity = on ? Math.min(1, kk * 2) : 0;
        L.n.style.transform = 'translate(' + s[0].toFixed(1) + 'px,' + s[1].toFixed(1) + 'px) translate(-50%,-100%) scale(' + (on ? 0.6 + 0.4 * back(kk) : 0.6).toFixed(3) + ')';
      }
    },
  };

  // path helpers: points [[x,y],..] -> position/direction at fraction f (by length)
  function Path(points) {
    this.p = points; this.len = [0];
    for (var i = 1; i < points.length; i++) this.len.push(this.len[i - 1] + Math.abs(points[i][0] - points[i - 1][0]) + Math.abs(points[i][1] - points[i - 1][1]));
    this.L = this.len[this.len.length - 1] || 1;
  }
  Path.prototype.at = function (f) {
    var s = clamp(f, 0, 1) * this.L, i = 1;
    while (i < this.p.length - 1 && this.len[i] < s) i++;
    var a = this.p[i - 1], b = this.p[i], seg = (this.len[i] - this.len[i - 1]) || 1, k = clamp((s - this.len[i - 1]) / seg, 0, 1);
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var dir = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : 2) : (dy >= 0 ? 1 : 3);
    return { x: a[0] + dx * k, y: a[1] + dy * k, dir: dir, seg: i };
  };
  // polyline of the first fraction f of the path (for "route travelled" lines)
  Path.prototype.part = function (f0, f1) {
    var a = this.at(f0), b = this.at(f1), out = [[a.x, a.y]];
    for (var i = 1; i < this.p.length - 1; i++) if (this.len[i] > f0 * this.L && this.len[i] < f1 * this.L) out.push(this.p[i]);
    out.push([b.x, b.y]);
    return out;
  };
  function line(points, z, stroke, sw, dash, op) {
    return '<polyline points="' + pts(points.map(function (p) { return [p[0], p[1], z || 0.02]; })) + '" fill="none" stroke="' + stroke + '" stroke-width="' + (sw || 6) + '" stroke-linecap="round" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' opacity="' + (op === undefined ? 1 : op) + '"/>';
  }

  G.Iso = { U: U, pr: pr, pts: pts, poly: poly, box: box, sh: sh, ring: ring, M: M, World: World, Path: Path, line: line, rnd: rnd, ease: ease, back: back, clamp: clamp, VEHICLES: VEHICLES, setActor: function (v) { ACT = v; }, BLD: BLD, SKIN: SKIN, sortJoin: sortJoin };
})(window);
