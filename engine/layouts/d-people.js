// d-people.js — story scenes with characters in a flat set (office, store, street, home, city, stage, plain)
(function () {
  var K = Engine.Kit, el = K.el, PE = window.People;

  function set(S, kind, P) {
    var g = '', floorY = 900, R = K.rnd;
    var shelfCols = [P.accent, P.yellow, P.teal, P.card, '#7A2E8E'];
    if (kind === 'store') {
      for (var i = 0; i < 3; i++) { var y = 260 + i * 160; g += '<rect x="80" y="' + y + '" width="1760" height="16" fill="' + P.ink + '" opacity=".2"/>'; for (var j = 0; j < 24; j++) { var h = 50 + Math.floor(R(i * 31 + j) * 5) * 14; g += '<rect x="' + (100 + j * 72) + '" y="' + (y - h) + '" width="52" height="' + h + '" rx="6" fill="' + shelfCols[(i + j * 3) % 5] + '" opacity=".55"/>'; } }
    } else if (kind === 'office') {
      g += '<rect x="1160" y="120" width="620" height="420" rx="10" fill="#CFE6F2"/>';
      for (var b = 0; b < 9; b++) { var bh = 120 + R(b + 5) * 220; g += '<rect x="' + (1180 + b * 66) + '" y="' + (540 - bh) + '" width="54" height="' + bh + '" fill="' + P.ink + '" opacity="' + (0.25 + R(b) * 0.2) + '"/>'; }
      g += '<rect x="1160" y="120" width="620" height="420" rx="10" fill="none" stroke="' + P.ink + '" stroke-width="14"/><line x1="1470" y1="120" x2="1470" y2="540" stroke="' + P.ink + '" stroke-width="10"/>';
      g += '<rect x="180" y="200" width="300" height="200" rx="6" fill="' + P.card + '"/><polyline points="210,360 270,320 330,340 400,260 450,240" fill="none" stroke="' + P.accent + '" stroke-width="10" stroke-linecap="round"/>';
      g += '<path d="M120 900 L120 760 Q120 720 160 720 L220 720" stroke="' + P.teal + '" stroke-width="0"/><ellipse cx="160" cy="880" rx="70" ry="22" fill="' + P.ink + '" opacity=".2"/><rect x="120" y="760" width="80" height="120" rx="10" fill="#C8955C"/><circle cx="160" cy="720" r="70" fill="' + P.teal + '"/>';
    } else if (kind === 'street' || kind === 'city') {
      for (var k = 0; k < 14; k++) { var w = 110 + R(k) * 90, hh = 220 + R(k + 40) * 380, x = k * 140 - 40; g += '<rect x="' + x + '" y="' + (floorY - hh) + '" width="' + w + '" height="' + hh + '" fill="' + (k % 3 ? P.ink : P.teal) + '" opacity="' + (0.16 + R(k + 9) * 0.14) + '"/>'; for (var wy = floorY - hh + 30; wy < floorY - 60; wy += 60) g += '<rect x="' + (x + 20) + '" y="' + wy + '" width="' + (w - 40) + '" height="22" fill="' + P.card + '" opacity=".35"/>'; }
      if (kind === 'street') { g += '<rect x="0" y="' + (floorY - 10) + '" width="1920" height="200" fill="#9AA3AD" opacity=".35"/>'; for (var d = 0; d < 10; d++) g += '<rect x="' + (d * 220 + 40) + '" y="' + (floorY + 70) + '" width="110" height="12" fill="' + P.card + '"/>'; }
    } else if (kind === 'home') {
      g += '<rect x="1240" y="170" width="440" height="380" rx="12" fill="#CFE6F2" stroke="' + P.card + '" stroke-width="18"/><line x1="1460" y1="170" x2="1460" y2="550" stroke="' + P.card + '" stroke-width="14"/>';
      g += '<rect x="160" y="640" width="640" height="200" rx="40" fill="' + P.teal + '"/><rect x="200" y="560" width="560" height="140" rx="36" fill="' + P.teal + '" opacity=".8"/><rect x="180" y="830" width="20" height="70" fill="' + P.ink + '"/><rect x="760" y="830" width="20" height="70" fill="' + P.ink + '"/>';
      g += '<line x1="980" y1="300" x2="980" y2="890" stroke="' + P.ink + '" stroke-width="8"/><path d="M910 300 L1050 300 L1020 220 L940 220Z" fill="' + P.yellow + '"/>';
    } else if (kind === 'stage') {
      g += '<path d="M960 -40 L1380 1000 L540 1000Z" fill="' + P.yellow + '" opacity=".35"/><rect x="760" y="760" width="400" height="160" rx="10" fill="' + P.ink + '"/><rect x="740" y="740" width="440" height="40" rx="8" fill="' + P.accent + '"/>';
    }
    g += '<rect x="0" y="' + floorY + '" width="1920" height="' + (1080 - floorY) + '" fill="' + P.bg2 + '"/>';
    var n = S.add('bg', el('div', '', 'position:absolute;left:0;top:0', K.svg(1920, 1080, g)));
    S.anim(n, 'fade', 0, 0.4);
    return floorY;
  }

  Engine.layout('people', function (S, p, P) {
    var floorY = set(S, p.set || 'plain', P);
    if ((p.set || 'plain') === 'plain') K.blob(S, 1500, 380, 360, P.yellow);
    if (p.title) K.title(S, p.title, p.sub, { y: 70, w: 1100 });
    var cast = (p.cast || []).map(function (c, i) { return typeof c === 'string' ? { id: c, preset: c } : c; });
    var acts = (p.do || []).slice().sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
    var n = cast.length;
    cast.forEach(function (c, i) {
      var id = c.id || c.preset || 'p' + i;
      var x0 = c.x !== undefined ? c.x : (n === 1 ? 960 : 360 + i * (1200 / Math.max(1, n - 1)));
      var scale = c.scale || (n > 3 ? 0.85 : p.title ? 0.9 : 1.0); // head stays >= 260 px from the top so bubbles fit
      var look = Object.assign({ preset: c.preset || 'founder' }, c.look || {});
      if (look.preset && !PE.PRESET[look.preset]) look.preset = 'founder';
      var holder = S.add('mid', el('div', 'person-svg', 'left:0;top:0;width:1920px;height:1080px;filter:url(#paperedge)'));
      var tag = c.tag ? S.add('fg', el('div', 'chip', 'position:absolute;top:' + (floorY + 40) + 'px;font-size:28px;transform:rotate(-2deg);white-space:nowrap', K.esc(c.tag))) : null;
      // this character's keyframes from "do"
      var mine = acts.filter(function (a) { return a.who === id; });
      var enter = c.enter || (i % 2 ? 'right' : 'left');
      var tIn = S.at(c.at, 0.1 + i * 0.15);
      var bubbles = [];
      mine.forEach(function (a) {
        if (a.say) {
          var b = S.add('fg', el('div', 'bubble' + (x0 > 1100 ? ' r' : ''), 'opacity:0', K.rich(a.say)));
          bubbles.push({ el: b, t: a.at || 0, end: (a.at || 0) + (a.hold || 2.6) });
          S.sfx(a.at || 0, 'pop', 0.4);
        }
      });
      var seed = i * 1.37 + 0.4;
      S.every(function (lt) {
        // position: entrance + walks
        var x = x0, walking = false, flip = !!c.flip;
        var ek = K.E.out(K.clamp((lt - tIn) / 0.6, 0, 1));
        var ent = enter === 'none' ? 0 : (1 - ek) * (enter === 'left' ? -500 : enter === 'right' ? 500 : 0);
        var dy = enter === 'up' ? (1 - ek) * 300 : 0;
        var op = enter === 'fade' ? ek : ek > 0 ? 1 : 0;
        mine.forEach(function (a) {
          if (a.move === undefined) return;
          var from = x, to = a.move, d = a.dur || Math.max(0.6, Math.abs(to - from) / 520), t = a.at || 0;
          if (lt >= t + d) x = to; else if (lt > t) { x = K.lerp(from, to, K.E.io((lt - t) / d)); walking = true; flip = to < from; }
        });
        // pose + face at this moment (blend 0.3 s into each new pose)
        var pose = PE.POSES[c.pose || 'idle'], prevPose = pose, face = c.face || 'happy', prop = c.prop, kpose = 1;
        mine.forEach(function (a) {
          var t = a.at || 0;
          if (lt >= t) {
            if (a.pose) { prevPose = pose; pose = PE.POSES[a.pose] || pose; kpose = K.clamp((lt - t) / 0.3, 0, 1); }
            if (a.face) face = a.face;
            if (a.prop !== undefined) prop = a.prop;
          }
        });
        var P2 = PE.mix(prevPose, pose, K.E.io(kpose));
        if (walking || ek < 1 && enter !== 'none' && enter !== 'fade') { var ph = Math.sin(lt * 9 + seed); P2 = PE.mix(PE.POSES.walk1, PE.POSES.walk2, (ph + 1) / 2); }
        // idle life: breathing sway, head tilt
        P2.tilt = (P2.tilt || 0) + Math.sin(lt * 1.6 + seed) * 2;
        P2.l = [P2.l[0] + Math.sin(lt * 2 + seed) * 1.5, P2.l[1]];
        var blink = ((lt + seed * 2.3) % 3.7) < 0.12;
        var talk = bubbles.some(function (b) { return lt >= b.t && lt < b.end; }) && Math.floor(lt * 8) % 2 === 0;
        var bob = walking ? Math.abs(Math.sin(lt * 9 + seed)) * -10 : Math.sin(lt * 1.6 + seed) * 2;
        var X = x + ent;
        holder.style.opacity = op;
        holder.innerHTML = '<svg width="1920" height="1080" style="overflow:visible"><g transform="translate(' + X.toFixed(1) + ' ' + (floorY + 10 + dy + bob).toFixed(1) + ') scale(' + (flip ? -scale : scale) + ' ' + scale + ')">' + PE.svg(look, P2, face, { blink: blink, talk: talk, prop: prop, sign: c.sign }) + '</g></svg>';
        if (tag) { tag.style.left = (X - 90) + 'px'; tag.style.opacity = op; }
        bubbles.forEach(function (b) {
          var k = lt < b.t ? 0 : lt < b.t + 0.25 ? (lt - b.t) / 0.25 : lt < b.end ? 1 : Math.max(0, 1 - (lt - b.end) / 0.2);
          b.el.style.opacity = k; b.el.style.transform = 'scale(' + (0.7 + 0.3 * k) + ')';
          var right = X > 1100;
          b.el.style.left = Math.max(30, Math.min(1890 - 520, right ? X - 520 + 40 : X - 70)) + 'px';
          b.el.style.top = 'auto'; b.el.style.bottom = (1080 - (floorY - 640 * scale - 14)) + 'px'; // sits just above the head
          b.el.style.transformOrigin = right ? '90% 100%' : '10% 100%';
        });
      });
    });
    S.popZone = { x: 1420, y: 90, w: 420 };
  });
})();
