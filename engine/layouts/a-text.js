// a-text.js — hook, statement, title, chapter, quote, list, end
(function () {
  var L = Engine.layout, K = Engine.Kit, el = K.el;

  // HOOK: photo cutout + headline + giant number + news clipping. The first frame already moves.
  L('hook', function (S, p, P) {
    var left = p.side !== 'right';
    K.blob(S, left ? 400 : 1520, 600, 470, P.accent);
    var px = left ? 40 : 1160;
    if (p.photo) {
      var ph = S.add('mid', K.image(p.photo, { css: 'position:absolute;left:' + px + 'px;bottom:-40px;width:720px;height:1000px', fit: 'contain', pos: 'bottom', sticker: true }));
      S.anim(ph, 'rise', 0.05, 0.7, { dist: 120 }); S.float(ph, 3, 0.8, 1);
    }
    if (p.extra) {
      var ex = S.add('mid', K.image(p.extra, { css: 'position:absolute;left:' + (left ? 600 : 830) + 'px;top:640px;width:440px;height:320px;border:10px solid ' + P.card + ';transform:rotate(5deg);box-shadow:0 18px 30px -12px rgba(0,0,0,.35)' }));
      S.add('fg', K.tape('left:' + (left ? 740 : 970) + 'px;top:622px;transform:rotate(-6deg)'));
      S.anim(ex, 'drop', 0.5, 0.5);
    }
    var col = el('div', '', 'position:absolute;left:' + (left ? 1040 : 120) + 'px;top:110px;width:820px');
    S.add('mid', col);
    if (p.chip) { var c = K.chip(p.chip, P.teal, '#fff', 'transform:rotate(-2deg)'); col.appendChild(c); S.anim(c, 'stamp', 0.15, 0.35, { rot: -2 }); }
    if (p.title) { var t = el('div', 'k', 'font-size:' + (p.title.length > 40 ? 104 : 132) + 'px;margin-top:30px;color:' + P.ink, K.rich(p.title)); col.appendChild(t); S.anim(t, 'wipe', 0.3, 0.6); }
    if (p.big) {
      var b = el('div', 'big', 'font-size:' + (String(p.big).length > 9 ? 150 : 196) + 'px;margin-top:16px', K.esc(p.big));
      col.appendChild(b);
      var tb = S.at(p.at, S.slot(0, 1, 0.3));
      S.anim(b, 'pop', tb, 0.45); if (K.parseNum(p.big)) { S.anim(b, 'count', tb, 1.1); S.sfx(tb, 'counter', 0.6); }
    }
    if (p.label) { var lb = el('div', '', 'font:500 40px/1.3 Palanquin;margin-top:10px;max-width:760px;color:' + P.ink, K.rich(p.label)); col.appendChild(lb); S.anim(lb, 'rise', S.at(p.at, S.slot(0, 1, 0.3)) + 0.4, 0.5, { dist: 20 }); }
    if (p.clip) {
      var tc = S.at(p.clip.at, S.slot(0, 1, 0.65));
      var cl = S.add('fg', K.card('left:' + (left ? 1300 : 160) + 'px;top:790px;width:520px;padding:24px 30px;transform:rotate(-3deg)',
        '<div style="font:700 22px/1 Palanquin;letter-spacing:.12em;color:' + P.accent + ';text-transform:uppercase">' + K.esc(p.clip.source || '') + '</div>' +
        '<div class="k" style="font-size:46px;line-height:1.02;color:#1a1a1a;margin-top:10px">' + K.rich(p.clip.text || '') + '</div>' +
        '<div style="height:10px;background:#0002;margin-top:16px;width:90%"></div><div style="height:10px;background:#0002;margin-top:10px;width:66%"></div>'));
      S.anim(cl, 'drop', tc, 0.5); S.sfx(tc, 'flip', 0.7);
      if (left) K.arrow(S, 1270, 820, 1120, 700, tc + 0.4);
    }
    S.popZone = left ? { x: 120, y: 80, w: 600 } : { x: 1300, y: 80, w: 520 };
  });

  // STATEMENT: one big idea in type, optional icon or photo; bg: paper | ink | accent
  L('statement', function (S, p, P) {
    var bg = p.bg || 'paper';
    var fg = bg === 'paper' ? P.ink : bg === 'yellow' ? P.ink : P.card;
    if (bg !== 'paper') S.el.style.background = bg === 'ink' ? P.ink : bg === 'yellow' ? P.yellow : P.accent;
    var side = p.icon || p.img;
    var cx = side ? 120 : 160, w = side ? 1060 : 1600;
    var box = S.add('mid', el('div', '', 'position:absolute;left:' + cx + 'px;top:0;height:1080px;width:' + w + 'px;display:flex;flex-direction:column;justify-content:center;' + (p.align === 'center' && !side ? 'align-items:center;text-align:center;' : '')));
    if (p.chip) { var c = K.chip(p.chip, bg === 'paper' ? P.ink : P.card, bg === 'paper' ? P.card : P.ink, 'align-self:flex-start;margin-bottom:28px;transform:rotate(-2deg)'); box.appendChild(c); S.anim(c, 'stamp', 0.1, 0.35, { rot: -2 }); }
    var text = String(p.text || '');
    var size = p.size || (text.length > 70 ? 96 : text.length > 40 ? 120 : 150);
    var lines = text.split(/\s*\|\s*/); // "|" forces a line break and reveals line by line
    lines.forEach(function (ln, i) {
      var d = el('div', 'k', 'font-size:' + size + 'px;line-height:.95;color:' + fg + (bg !== 'paper' ? ';--y:' + (bg === 'ink' ? P.accent : P.ink) : ''), K.rich(ln, bg === 'accent' ? 'mk' : 'mk'));
      box.appendChild(d);
      S.anim(d, 'wipe', S.at(p.at && p.at[i], 0.15 + i * Math.max(0.35, (S.speech[1] - S.speech[0]) * 0.5 / lines.length)), 0.55);
    });
    if (p.sub) { var s = el('div', '', 'font:500 40px/1.35 Palanquin;margin-top:26px;max-width:1000px;color:' + fg + ';opacity:.85', K.rich(p.sub)); box.appendChild(s); S.anim(s, 'rise', 0.6, 0.5, { dist: 24 }); }
    if (p.icon) {
      K.blob(S, 1500, 540, 300, bg === 'paper' ? P.yellow : bg === 'ink' ? P.accent : P.ink);
      var ic = S.add('mid', el('div', '', 'position:absolute;left:1300px;top:340px;width:400px;height:400px;color:' + (bg === 'paper' ? P.ink : P.card), K.icon(p.icon, null, 400)));
      S.anim(ic, 'pop', 0.25, 0.6); S.float(ic, 6, 1, 2);
    } else if (p.img) {
      var im = S.add('mid', K.image(p.img, { css: 'position:absolute;left:1240px;top:170px;width:560px;height:' + (p.img.cut ? 900 : 700) + 'px;' + (p.img.cut ? '' : 'border:12px solid ' + P.card + ';transform:rotate(3deg);box-shadow:0 22px 40px -14px rgba(0,0,0,.4)'), fit: p.img.cut ? 'contain' : 'cover', pos: 'bottom' }));
      if (!p.img.cut) S.add('fg', K.tape('left:1450px;top:150px;transform:rotate(-5deg)'));
      S.anim(im, 'drop', 0.2, 0.55); S.float(im, 3, 0.9, 3);
    } else if (bg === 'paper') {
      K.blob(S, 1820, 120, 260, P.yellow);
    }
    S.popZone = side ? { x: 140, y: 80, w: 700 } : { x: 1380, y: 840, w: 440 };
  });

  // TITLE sting (auto, between hook and chapter 1)
  L('title', function (S, p, P) {
    S.el.style.background = P.ink;
    K.blob(S, 1580, 220, 380, P.accent); K.blob(S, 260, 980, 300, P.yellow);
    var t = S.add('mid', el('div', '', 'position:absolute;left:150px;top:0;height:1080px;width:1500px;display:flex;align-items:center', '<div class="k" style="font-size:' + (p.title.length > 40 ? 120 : 150) + 'px;color:' + P.card + '">' + K.rich(p.title) + '</div>'));
    S.anim(t, 'stamp', 0.1, 0.45, { rot: -3 });
    if (p.channel) { var c = S.add('mid', K.chip(p.channel, P.yellow, P.ink, 'position:absolute;left:150px;top:180px;transform:rotate(-2deg)')); S.anim(c, 'drop', 0.35, 0.4); }
    S.sfx(0.1, 'riser', 0.6); S.sfx(0.45, 'thud', 0.8);
    S.cam = 'in';
  });

  // CHAPTER card (auto from "# Heading")
  L('chapter', function (S, p, P) {
    S.el.style.background = P.ink;
    var n = S.add('bg', el('div', 'k', 'position:absolute;right:-30px;top:-120px;font-size:900px;line-height:1;color:transparent;-webkit-text-stroke:6px ' + P.accent + ';opacity:.9', String(p.n).padStart(2, '0')));
    S.anim(n, 'right', 0, 0.8, { dist: 300 });
    var lab = S.add('mid', K.chip('Chapter ' + p.n, P.yellow, P.ink, 'position:absolute;left:150px;top:330px;font-size:40px;transform:rotate(-2deg)'));
    S.anim(lab, 'stamp', 0.2, 0.35, { rot: -2 });
    var t = S.add('mid', el('div', 'k', 'position:absolute;left:150px;top:420px;width:1200px;font-size:' + (p.title.length > 28 ? 120 : 150) + 'px;color:' + P.card, K.rich(p.title)));
    S.anim(t, 'wipe', 0.4, 0.6);
    S.add('fg', K.tape('left:140px;top:300px;transform:rotate(-8deg);width:120px'));
    S.sfx(0.2, 'stamp', 0.9);
    S.cam = 'out';
  });

  // QUOTE card with the person
  L('quote', function (S, p, P) {
    K.blob(S, 1500, 560, 420, P.yellow);
    if (p.img) { var im = S.add('mid', K.image(p.img, { css: 'position:absolute;left:1160px;bottom:-30px;width:700px;height:960px', fit: 'contain', pos: 'bottom', sticker: true })); S.anim(im, 'rise', 0.1, 0.6, { dist: 100 }); S.float(im, 3, 0.8, 5); }
    var q = S.add('mid', el('div', 'k', 'position:absolute;left:110px;top:90px;font-size:420px;line-height:1;color:' + P.accent, '“'));
    S.anim(q, 'pop', 0.05, 0.5);
    var tx = S.add('mid', el('div', '', 'position:absolute;left:170px;top:300px;width:' + (p.img ? 1000 : 1500) + 'px;font:600 ' + (String(p.text).length > 120 ? 62 : 76) + 'px/1.2 Palanquin;color:' + P.ink, K.rich(p.text)));
    S.anim(tx, 'wipeup', 0.3, 0.9);
    if (p.who) { var w = S.add('mid', el('div', '', 'position:absolute;left:170px;bottom:150px', '<div class="k" style="font-size:64px;color:' + P.ink + '">— ' + K.esc(p.who) + '</div>' + (p.role ? '<div style="font:500 32px/1.3 Palanquin;color:' + P.ink + ';opacity:.8;margin-left:44px">' + K.esc(p.role) + '</div>' : ''))); S.anim(w, 'left', 0.9, 0.5); }
    S.popZone = { x: 170, y: 120, w: 600 };
  });

  // LIST: 2-5 points with icons, each lands on a cue (or spread over the speech)
  L('list', function (S, p, P) {
    if (p.title) K.title(S, p.title, p.sub);
    var items = (p.items || []).map(function (it) { return typeof it === 'string' ? { text: it } : it; });
    var n = items.length, top = p.title ? 300 : 180, gap = Math.min(170, (1000 - top) / n);
    items.forEach(function (it, i) {
      var t = S.at(it.at, S.slot(i, n, 0.08, 0.7));
      var row = S.add('mid', el('div', '', 'position:absolute;left:150px;top:' + (top + i * gap) + 'px;display:flex;align-items:center;gap:36px;width:1500px'));
      var badge = el('div', '', 'flex:none;width:110px;height:110px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:' + (i % 2 ? P.ink : P.accent) + ';color:#fff',
        it.icon ? K.icon(it.icon, '#fff', 60) : '<span class="k" style="font-size:72px;line-height:1;margin-top:10px">' + (i + 1) + '</span>');
      var tx = el('div', 'k', 'font-size:' + (p.size || 76) + 'px;color:' + P.ink, K.rich(it.text));
      row.appendChild(badge); row.appendChild(tx);
      S.anim(badge, 'pop', t, 0.4); S.anim(tx, 'wipe', t + 0.1, 0.5); S.sfx(t, 'pop', 0.6);
    });
    K.blob(S, 1800, 980, 280, P.yellow);
  });

  // END screen: 20 s with slots for YouTube end-screen elements (two videos left/right, subscribe centre)
  L('end', function (S, p, P) {
    S.el.style.background = P.ink;
    K.blob(S, 960, 1150, 520, P.accent);
    var h = S.add('mid', el('div', 'k', 'position:absolute;left:0;width:1920px;top:80px;text-align:center;font-size:110px;color:' + P.card, K.rich(p.title || 'Agla case study *yahan* hai')));
    S.anim(h, 'wipe', 0.2, 0.6);
    [[150, 300], [1010, 300]].forEach(function (xy, i) {
      var b = S.add('mid', el('div', '', 'position:absolute;left:' + xy[0] + 'px;top:' + xy[1] + 'px;width:760px;height:428px;border:6px dashed rgba(255,248,242,.5);border-radius:18px;display:flex;align-items:center;justify-content:center;color:rgba(255,248,242,.6);font:600 32px Palanquin', K.icon('play-circle', 'rgba(255,248,242,.6)', 90)));
      S.anim(b, 'pop', 0.4 + i * 0.15, 0.5);
    });
    var sub = S.add('mid', el('div', '', 'position:absolute;left:840px;top:800px;width:240px;height:240px;border-radius:50%;border:6px dashed rgba(255,248,242,.55)'));
    S.anim(sub, 'pop', 0.8, 0.5);
    if (p.next) K.note(S, 'Next: ' + p.next, 1350, 820, 1.2, { rot: -3 });
    S.cam = 'still';
  });
})();
