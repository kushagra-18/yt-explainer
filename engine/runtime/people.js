// people.js — flat paper-cut characters (SVG). People.svg(look, pose, face, o) -> markup in local coords:
// feet centre at (0,0), y down, ~640 units tall. Poses are joint angles, so two poses can be blended (People.mix).
(function (G) {
  'use strict';
  var rad = function (d) { return d * Math.PI / 180; };
  function chain(x, y, side, a1, a2, l1, l2) {
    var t1 = rad(a1), t2 = rad(a1 + a2);
    var ex = x + side * Math.sin(t1) * l1, ey = y + Math.cos(t1) * l1;
    return { ex: ex, ey: ey, hx: ex + side * Math.sin(t2) * l2, hy: ey + Math.cos(t2) * l2 };
  }
  var SKIN = { s1: '#6E4026', s2: '#9C6239', s3: '#B97A4B', s4: '#D9A06E', s5: '#EBC296' };
  function shade(hex, k) { var n = parseInt(hex.slice(1), 16); var f = function (v) { return Math.max(0, Math.min(255, Math.round(v * k))); }; return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(function (v) { return v.toString(16).padStart(2, '0'); }).join(''); }

  // l/r: [shoulder, elbow] degrees from straight down, + = away from body. legs: [left, right] hip swing. lean: torso degrees.
  var POSES = {
    idle: { l: [10, -6], r: [10, -6], tilt: 0, legs: [0, 0] },
    talk: { l: [14, 30], r: [24, 50], tilt: -3, legs: [0, 0] },
    present: { l: [10, -6], r: [55, 55], tilt: -3, legs: [0, 0] },
    point: { l: [10, -6], r: [96, 4], tilt: -4, legs: [0, 0] },
    pointup: { l: [10, -6], r: [150, 10], tilt: -5, legs: [0, 0] },
    think: { l: [6, -4], r: [-12, -150], tilt: 5, legs: [0, 0] },
    celebrate: { l: [158, 10], r: [158, 10], tilt: 0, legs: [0, 0] },
    shrug: { l: [38, -100], r: [38, -100], tilt: 6, legs: [0, 0] },
    phone: { l: [10, -6], r: [-6, -128], tilt: 6, legs: [0, 0], prop: 'phone' },
    worried: { l: [150, 120], r: [150, 120], tilt: 0, legs: [0, 0] },
    facepalm: { l: [10, -6], r: [-20, -155], tilt: 10, legs: [0, 0] },
    wave: { l: [10, -6], r: [130, 40], tilt: -3, legs: [0, 0] },
    cross: { l: [-28, -112], r: [-28, -112], tilt: 0, legs: [0, 0] },
    hold: { l: [-10, -95], r: [-10, -95], tilt: 0, legs: [0, 0] },
    walk1: { l: [-22, -10], r: [22, -20], tilt: 0, legs: [-14, 14] },
    walk2: { l: [22, -20], r: [-22, -10], tilt: 0, legs: [14, -14] },
    sad: { l: [4, -2], r: [4, -2], tilt: 12, legs: [0, 0] },
    cower: { l: [-24, -150], r: [-24, -150], tilt: 9, legs: [6, -4], lean: -7 },
    reach: { l: [80, 6], r: [86, 2], tilt: -4, legs: [0, 0], lean: 4 },
    float: { l: [14, 4], r: [14, 4], tilt: 10, legs: [2, -2] },
    run1: { l: [-40, -60], r: [50, -80], tilt: -4, legs: [-26, 24], lean: 8 },
    run2: { l: [50, -80], r: [-40, -60], tilt: -4, legs: [24, -26], lean: 8 },
    look: { l: [10, -6], r: [10, -6], tilt: -5, legs: [0, 0] },
    torch: { l: [10, -6], r: [84, -6], tilt: -3, legs: [0, 0], prop: 'torch' },
    pray: { l: [-6, -138], r: [-6, -138], tilt: 6, legs: [0, 0] },
  };
  var FACES = { // m: mouth path, b: [outer, inner] brow offsets, fill: open mouth
    neutral: { m: 'M-14 26 Q0 31 14 26', b: [0, 0] },
    happy: { m: 'M-18 22 Q0 38 18 22', b: [-2, -2] },
    grin: { m: 'M-20 20 Q0 46 20 20 Z', fill: 1, b: [-4, -4] },
    worried: { m: 'M-12 30 Q0 22 12 30', b: [4, -9] },
    sad: { m: 'M-14 32 Q0 22 14 32', b: [5, -8] },
    shocked: { m: 'M-9 28 a9 11 0 1 0 18 0 a9 11 0 1 0 -18 0', fill: 1, b: [-12, -12] },
    angry: { m: 'M-14 30 Q0 24 14 30', b: [-6, 8] },
    smirk: { m: 'M-14 28 Q4 32 18 20', b: [0, -5] },
    talk: { m: 'M-14 22 Q0 40 14 22 Z', fill: 1, b: [-2, -2] },
    scared: { m: 'M-8 30 a8 9 0 1 0 16 0 a8 9 0 1 0 -16 0', fill: 1, b: [-10, -16], wide: 1 },
    blank: { m: '', b: [0, 0] },
    flat: { m: 'M-12 28 L12 28', b: [2, -2] },
    evil: { m: 'M-22 18 Q0 40 22 18', b: [-8, 10] },
  };
  var PRESET = {
    founder: { skin: 's3', hair: 'side', top: 'blazer', topColor: '#13293D', innerColor: '#FFF8F2', bottomColor: '#2B3A55', glasses: true },
    'founder-f': { skin: 's4', hair: 'long', top: 'blazer', topColor: '#2F8F83', innerColor: '#FFF8F2', bottomColor: '#13293D', fem: true },
    customer: { skin: 's4', hair: 'bun', top: 'kurti', topColor: '#2F8F83', bottomColor: '#F2E3D5', dupatta: '#FFC233', fem: true, bindi: true },
    'customer-m': { skin: 's3', hair: 'short', top: 'tshirt', topColor: '#3A86FF', bottomColor: '#2B3A55' },
    rider: { skin: 's2', hair: 'curly', top: 'tshirt', topColor: '#7A2E8E', bottomColor: '#1B2233', bag: '#5B1F6B', cap: '#7A2E8E' },
    investor: { skin: 's5', hair: 'bald', hairColor: '#8A8580', top: 'shirt', topColor: '#FF5A36', bottomColor: '#13293D', beard: true },
    employee: { skin: 's3', hair: 'short', top: 'shirt', topColor: '#FFF8F2', bottomColor: '#2B3A55', lanyard: '#FF5A36' },
    'employee-f': { skin: 's3', hair: 'long', top: 'shirt', topColor: '#FFC233', bottomColor: '#13293D', fem: true, lanyard: '#13293D' },
    shopkeeper: { skin: 's2', hair: 'short', hairColor: '#5A5550', top: 'kurta', topColor: '#FFF1D6', bottomColor: '#FFF1D6', mustache: true },
    student: { skin: 's4', hair: 'curly', top: 'hoodie', topColor: '#2F8F83', bottomColor: '#1B2233' },
    ceo: { skin: 's4', hair: 'side', hairColor: '#4A4540', top: 'blazer', topColor: '#1B1512', innerColor: '#3A86FF', bottomColor: '#1B1512', beard: true },
    'ceo-f': { skin: 's3', hair: 'bun', top: 'blazer', topColor: '#7A2E8E', innerColor: '#FFF8F2', bottomColor: '#13293D', fem: true, glasses: true },
    oldman: { skin: 's3', hair: 'bald', hairColor: '#D8D2C8', top: 'kurta', topColor: '#FFFFFF', bottomColor: '#F2E3D5', mustache: true, glasses: true },
    auntie: { skin: 's3', hair: 'bun', hairColor: '#2B2320', top: 'kurti', topColor: '#C1121F', bottomColor: '#FFC233', dupatta: '#FFC233', fem: true, bindi: true },
    farmer: { skin: 's1', hair: 'short', top: 'kurta', topColor: '#FFF8F2', bottomColor: '#F2E3D5', mustache: true, turban: '#FF5A36' },
    // story / horror cast
    watchman: { skin: 's2', hair: 'short', top: 'shirt', topColor: '#5B6B4A', bottomColor: '#3E4A33', mustache: true, cap: '#3E4A33' },
    trucker: { skin: 's2', hair: 'short', top: 'kurta', topColor: '#8A6E52', bottomColor: '#3A3A3A', mustache: true, turban: '#C8372D' },
    nurse: { skin: 's4', hair: 'bun', top: 'shirt', topColor: '#EDEFF1', bottomColor: '#EDEFF1', fem: true },
    doctor: { skin: 's3', hair: 'side', top: 'blazer', topColor: '#F2F2F0', innerColor: '#6B8CAE', bottomColor: '#2B3A55', glasses: true },
    baba: { skin: 's2', hair: 'bald', hairColor: '#E8E4DC', top: 'kurta', topColor: '#E0782A', bottomColor: '#E0782A', beard: true, tilak: true },
    dadi: { skin: 's3', hair: 'bun', hairColor: '#D8D2C8', top: 'kurti', topColor: '#F1EEE6', bottomColor: '#F1EEE6', dupatta: '#E8E2D6', fem: true, glasses: true },
    kid: { skin: 's3', hair: 'short', top: 'tshirt', topColor: '#E0A126', bottomColor: '#2B3A55', kid: true },
    'kid-f': { skin: 's4', hair: 'long', top: 'kurti', topColor: '#C8372D', bottomColor: '#2B3A55', fem: true, kid: true },
    'ghost-f': { skin: '#D9D6CF', hair: 'veil', hairColor: '#0B0B0C', top: 'gown', topColor: '#ECEAE4', bottomColor: '#ECEAE4', fem: true, noFeet: true },
    shadow: { skin: '#0A0A0C', hair: 'bald', hairColor: '#0A0A0C', top: 'gown', topColor: '#0A0A0C', bottomColor: '#0A0A0C', shoes: '#0A0A0C', eyes: '#FF3B2F', noFace: true, tall: true },
  };

  function hair(style, c) {
    switch (style) {
      case 'short': return '<path d="M-62 -10 C-66 -62 -30 -84 4 -82 C44 -82 68 -56 62 -8 C56 -30 40 -44 14 -46 C-8 -36 -40 -40 -62 -10Z" fill="' + c + '"/>';
      case 'side': return '<path d="M-63 0 C-70 -60 -26 -88 10 -84 C52 -80 72 -50 63 0 C58 -28 50 -38 34 -44 C10 -40 -24 -50 -40 -40 C-52 -30 -58 -18 -63 0Z" fill="' + c + '"/>';
      case 'curly': return '<g fill="' + c + '">' + [[-52, -30], [-36, -58], [-8, -70], [22, -66], [46, -50], [58, -22], [-60, -4], [60, 2]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="26"/>'; }).join('') + '</g>';
      case 'bun': return '<g fill="' + c + '"><circle cx="0" cy="-92" r="30"/><path d="M-64 6 C-72 -58 -30 -84 0 -84 C34 -84 72 -58 64 6 C60 -24 40 -46 0 -48 C-38 -46 -60 -24 -64 6Z"/></g>';
      case 'longback': return '<path d="M-66 90 C-80 20 -76 -78 0 -84 C76 -78 80 20 66 90 L46 90 C56 30 52 -34 30 -46 C6 -30 -30 -36 -48 -24 C-56 10 -52 50 -46 90Z" fill="' + c + '"/>';
      case 'longfront': return '<path d="M-56 -8 C-50 -50 -20 -70 6 -66 C34 -64 54 -46 56 -14 C40 -40 14 -44 -8 -40 C-30 -36 -46 -26 -56 -8Z" fill="' + c + '"/>';
      case 'veil': return '<path d="M-64 -10 C-70 -70 -30 -88 0 -88 C30 -88 70 -70 64 -10 L70 200 C40 214 20 190 8 214 C-6 190 -30 216 -46 196 C-60 210 -70 190 -72 200Z" fill="' + c + '"/>';
      case 'bald': return '<path d="M-62 -6 C-64 -20 -60 -30 -54 -34 L-52 -6Z M62 -6 C64 -20 60 -30 54 -34 L52 -6Z" fill="' + c + '"/>';
      default: return '';
    }
  }

  function svgPerson(look, pose, faceName, o) {
    o = o || {};
    var L = Object.assign({ skin: 's3', hair: 'short', hairColor: '#1B1512', top: 'tshirt', topColor: '#2F8F83', bottomColor: '#13293D', shoes: '#1B1512' }, PRESET[look.preset] || {}, look);
    var Pp = pose || POSES.idle, F = FACES[faceName] || FACES.happy;
    var skin = SKIN[L.skin] || L.skin, skinD = shade(skin, 0.86), top = L.topColor, topD = shade(top, 0.82), arm = shade(top, 0.84);
    var gown = L.top === 'gown';
    var long = L.top === 'kurta' || L.top === 'kurti' || gown;
    var hipY = -262, shY = -468, shX = 60, s = '';
    var lean = Pp.lean || 0;
    // legs (hip swing for walking)
    var legs = Pp.legs || [0, 0];
    if (!L.noFeet && !gown) [-1, 1].forEach(function (side, i) {
      var hx = side * 26, a = rad(legs[i]);
      var fx = hx + side * 4 + Math.sin(a) * 246, fy = -16 - (1 - Math.cos(a)) * 246;
      s += '<path d="M' + hx + ' ' + hipY + ' L' + fx.toFixed(1) + ' ' + fy.toFixed(1) + '" stroke="' + L.bottomColor + '" stroke-width="46" stroke-linecap="round" fill="none"/>';
      s += '<ellipse cx="' + (fx + side * 12).toFixed(1) + '" cy="' + (fy + 8).toFixed(1) + '" rx="34" ry="16" fill="' + L.shoes + '"/>';
    });
    s += '<g transform="rotate(' + lean + ' 0 ' + hipY + ')">';
    if (L.bag) s += '<rect x="' + (-shX - 40) + '" y="' + (shY - 6) + '" width="150" height="170" rx="16" fill="' + L.bag + '"/><rect x="' + (-shX - 30) + '" y="' + (shY + 40) + '" width="130" height="10" fill="' + shade(L.bag, 0.75) + '"/>';
    var hemY = gown ? -6 : long ? -120 : -238, hemX = gown ? 96 : long ? 74 : 60;
    if (gown) { var sw = Math.sin((o.t || 0) * 2.2) * 10; s += '<path d="M' + (-hemX - 4) + ' -6 Q' + (-hemX / 2) + ' ' + (14 + sw) + ' 0 -4 Q' + (hemX / 2) + ' ' + (14 - sw) + ' ' + (hemX + 4) + ' -6 L' + hemX + ' -40 L' + (-hemX) + ' -40Z" fill="' + top + '"/>'; }
    s += '<path d="M' + (-shX) + ' ' + (shY + 8) + ' C' + (-shX - 8) + ' ' + (shY + 60) + ' ' + (-hemX - 2) + ' ' + (hemY - 80) + ' ' + (-hemX) + ' ' + hemY + ' L' + hemX + ' ' + hemY + ' C' + (hemX + 2) + ' ' + (hemY - 80) + ' ' + (shX + 8) + ' ' + (shY + 60) + ' ' + shX + ' ' + (shY + 8) + ' C' + (shX - 20) + ' ' + (shY - 12) + ' ' + (-shX + 20) + ' ' + (shY - 12) + ' ' + (-shX) + ' ' + (shY + 8) + 'Z" fill="' + top + '"/>';
    if (!long) s += '<path d="M' + (-hemX) + ' ' + hemY + ' L' + hemX + ' ' + hemY + ' L' + (hemX - 4) + ' ' + (hemY + 22) + ' L' + (-hemX + 4) + ' ' + (hemY + 22) + 'Z" fill="' + L.bottomColor + '"/>';
    if (L.top === 'blazer') {
      s += '<path d="M-22 ' + (shY - 2) + ' L0 ' + (shY + 70) + ' L22 ' + (shY - 2) + ' L18 ' + hemY + ' L-18 ' + hemY + 'Z" fill="' + (L.innerColor || '#FFF8F2') + '"/>';
      s += '<path d="M-22 ' + (shY - 2) + ' L-6 ' + (shY + 120) + ' L-30 ' + (shY + 40) + 'Z M22 ' + (shY - 2) + ' L6 ' + (shY + 120) + ' L30 ' + (shY + 40) + 'Z" fill="' + topD + '"/>';
    } else if (L.top === 'shirt') {
      s += '<path d="M-24 ' + (shY - 4) + ' L0 ' + (shY + 26) + ' L24 ' + (shY - 4) + ' L14 ' + (shY + 30) + ' L0 ' + (shY + 22) + ' L-14 ' + (shY + 30) + 'Z" fill="' + shade(top, 1.12) + '"/><path d="M0 ' + (shY + 26) + ' L0 ' + hemY + '" stroke="' + topD + '" stroke-width="3"/>';
    } else if (long) {
      s += '<path d="M0 ' + (shY - 6) + ' L0 ' + (shY + 90) + '" stroke="' + topD + '" stroke-width="5"/>' + [0, 1, 2].map(function (i) { return '<circle cx="0" cy="' + (shY + 26 + i * 24) + '" r="4" fill="' + topD + '"/>'; }).join('');
      if (L.dupatta) s += '<path d="M' + (-shX + 6) + ' ' + (shY + 4) + ' C-10 ' + (shY + 90) + ' 30 ' + (shY + 160) + ' ' + (shX + 6) + ' ' + (shY + 220) + ' L' + (shX + 14) + ' ' + (shY + 170) + ' C30 ' + (shY + 120) + ' 10 ' + (shY + 70) + ' ' + (-shX + 30) + ' ' + (shY - 6) + 'Z" fill="' + L.dupatta + '"/>';
    } else if (L.top === 'hoodie') {
      s += '<path d="M-44 ' + (shY - 6) + ' Q0 ' + (shY + 40) + ' 44 ' + (shY - 6) + ' L30 ' + (shY + 10) + ' Q0 ' + (shY + 30) + ' -30 ' + (shY + 10) + 'Z" fill="' + topD + '"/><rect x="-42" y="' + (hemY - 90) + '" width="84" height="56" rx="10" fill="' + topD + '"/>';
    } else {
      s += '<path d="M-24 ' + (shY - 6) + ' Q0 ' + (shY + 18) + ' 24 ' + (shY - 6) + '" stroke="' + topD + '" stroke-width="7" fill="none"/>';
      if (L.logo) s += '<circle cx="28" cy="' + (shY + 70) + '" r="16" fill="' + L.logo + '"/>';
    }
    if (L.lanyard) s += '<path d="M-20 ' + (shY - 2) + ' L0 ' + (shY + 90) + ' L20 ' + (shY - 2) + '" stroke="' + L.lanyard + '" stroke-width="6" fill="none"/><rect x="-16" y="' + (shY + 88) + '" width="32" height="40" rx="4" fill="#FFF8F2" stroke="' + L.lanyard + '" stroke-width="4"/>';
    // head
    var headY = shY - 78, blink = o.blink ? 0.12 : 1;
    s += '<rect x="-15" y="' + (shY - 34) + '" width="30" height="40" rx="10" fill="' + skinD + '"/>';
    s += '<g transform="translate(0 ' + headY + ') rotate(' + (Pp.tilt || 0) + ' 0 60)">';
    if (L.hair === 'long') s += hair('longback', L.hairColor);
    s += '<ellipse cx="-58" cy="8" rx="11" ry="16" fill="' + skinD + '"/><ellipse cx="58" cy="8" rx="11" ry="16" fill="' + skinD + '"/>';
    s += '<path d="M-56 -10 C-58 -58 -30 -72 0 -72 C30 -72 58 -58 56 -10 C56 34 34 64 0 64 C-34 64 -56 34 -56 -10Z" fill="' + skin + '"/>';
    if (L.beard) s += '<path d="M-54 6 C-50 52 -24 72 0 72 C24 72 50 52 54 6 C44 30 30 36 0 34 C-30 36 -44 30 -54 6Z" fill="' + L.hairColor + '"/><path d="M-14 22 Q0 28 14 22 L12 30 Q0 26 -12 30Z" fill="' + skin + '"/>';
    if (L.hair !== 'veil') s += hair(L.hair === 'long' ? 'longfront' : L.hair, L.hairColor);
    if (L.cap) s += '<path d="M-60 -24 C-58 -70 -24 -86 4 -86 C40 -86 62 -64 60 -24Z" fill="' + L.cap + '"/><path d="M20 -30 L96 -22 L92 -10 L18 -16Z" fill="' + shade(L.cap, 0.8) + '"/>';
    if (L.turban) s += '<path d="M-64 -14 C-70 -74 -24 -96 4 -96 C40 -96 72 -72 64 -14 C40 -30 -40 -30 -64 -14Z" fill="' + L.turban + '"/><path d="M-60 -40 C-20 -60 30 -60 62 -36" stroke="' + shade(L.turban, 0.8) + '" stroke-width="8" fill="none"/>';
    var bo = F.b[0], bi = F.b[1];
    if (L.noFace) {
      s += '<g fill="' + L.eyes + '"><ellipse cx="-22" cy="2" rx="9" ry="5"/><ellipse cx="22" cy="2" rx="9" ry="5"/></g><g fill="' + L.eyes + '" opacity=".35"><circle cx="-22" cy="2" r="22"/><circle cx="22" cy="2" r="22"/></g>';
      s += '</g>';
    } else {
    if (F.wide) s += '<g fill="#FFFFFF"><ellipse cx="-22" cy="2" rx="12" ry="' + (13 * blink).toFixed(2) + '"/><ellipse cx="22" cy="2" rx="12" ry="' + (13 * blink).toFixed(2) + '"/></g><g fill="#1B1512"><circle cx="-22" cy="3" r="4.5"/><circle cx="22" cy="3" r="4.5"/></g>';
    else s += '<g fill="#1B1512"><ellipse cx="-22" cy="2" rx="6.5" ry="' + (8 * blink).toFixed(2) + '"/><ellipse cx="22" cy="2" rx="6.5" ry="' + (8 * blink).toFixed(2) + '"/></g>';
    s += '<g stroke="#1B1512" stroke-width="5" stroke-linecap="round"><path d="M-34 ' + (-18 + bo) + ' L-12 ' + (-20 + bi) + '"/><path d="M12 ' + (-20 + bi) + ' L34 ' + (-18 + bo) + '"/></g>';
    s += '<path d="M-2 6 Q-8 20 2 22" stroke="' + shade(skin, 0.7) + '" stroke-width="4" fill="none" stroke-linecap="round"/>';
    if (L.mustache) s += '<path d="M-24 22 Q0 10 24 22 Q12 18 0 22 Q-12 18 -24 22Z" fill="' + L.hairColor + '" stroke="' + L.hairColor + '" stroke-width="5" stroke-linejoin="round"/>';
    var mouth = o.talk ? FACES.talk : F;
    if (mouth.m) s += mouth.fill ? '<path d="' + mouth.m + '" fill="#5A1E1E"/>' : '<path d="' + mouth.m + '" stroke="#1B1512" stroke-width="5" fill="none" stroke-linecap="round"/>';
    s += '<g fill="#FF8A7A" opacity=".35"><ellipse cx="-34" cy="22" rx="11" ry="6"/><ellipse cx="34" cy="22" rx="11" ry="6"/></g>';
    if (L.glasses) s += '<g stroke="#1B1512" stroke-width="4.5" fill="none"><rect x="-40" y="-10" width="32" height="24" rx="8"/><rect x="8" y="-10" width="32" height="24" rx="8"/><path d="M-8 0 L8 0"/></g>';
    if (L.bindi) s += '<circle cx="0" cy="-26" r="4" fill="#C1121F"/>';
    if (L.tilak) s += '<path d="M-8 -40 L-8 -20 M0 -42 L0 -18 M8 -40 L8 -20" stroke="#F2EEE6" stroke-width="3"/><circle cx="0" cy="-30" r="4" fill="#C1121F"/>';
    if (L.hair === 'veil') s += hair('veil', L.hairColor);
    s += '</g>';
    }
    // arms
    var sleeveLong = L.top !== 'tshirt';
    [-1, 1].forEach(function (side) {
      var A = side < 0 ? Pp.l : Pp.r;
      var sx = side * (shX - 6), sy = shY + 18;
      var c = chain(sx, sy, side, A[0], A[1], 112, 104);
      s += '<path d="M' + sx + ' ' + sy + ' L' + c.ex.toFixed(1) + ' ' + c.ey.toFixed(1) + '" stroke="' + arm + '" stroke-width="40" stroke-linecap="round" fill="none"/>';
      s += '<path d="M' + c.ex.toFixed(1) + ' ' + c.ey.toFixed(1) + ' L' + c.hx.toFixed(1) + ' ' + c.hy.toFixed(1) + '" stroke="' + (sleeveLong ? arm : skin) + '" stroke-width="' + (sleeveLong ? 36 : 30) + '" stroke-linecap="round" fill="none"/>';
      var prop = side > 0 ? (o.prop || Pp.prop) : o.propL;
      if (prop === 'phone') s += '<rect x="' + (c.hx - 22).toFixed(1) + '" y="' + (c.hy - 58).toFixed(1) + '" width="44" height="80" rx="8" fill="#1B1512"/><rect x="' + (c.hx - 17).toFixed(1) + '" y="' + (c.hy - 52).toFixed(1) + '" width="34" height="64" rx="4" fill="' + (L.accent || '#FFC233') + '"/>';
      if (prop === 'torch' && A[0] > 50) s += '<g transform="translate(' + c.hx.toFixed(1) + ' ' + c.hy.toFixed(1) + ') rotate(' + (A[0] - 90) * side + ')"><rect x="-10" y="-14" width="58" height="26" rx="6" fill="#2A2A2A"/><rect x="44" y="-18" width="14" height="34" rx="4" fill="#FFE9A8"/></g>';
      if (prop === 'cash') s += '<g transform="translate(' + c.hx.toFixed(1) + ' ' + (c.hy - 10).toFixed(1) + ') rotate(-12)"><rect x="-46" y="-26" width="92" height="50" rx="5" fill="#6BBF59"/><rect x="-40" y="-20" width="80" height="38" rx="3" fill="none" stroke="#3E8A33" stroke-width="3"/><circle r="10" fill="#3E8A33"/></g>';
      if (prop === 'box') s += '<rect x="' + (c.hx - 50).toFixed(1) + '" y="' + (c.hy - 70).toFixed(1) + '" width="100" height="80" rx="6" fill="#C8955C"/><rect x="' + (c.hx - 50).toFixed(1) + '" y="' + (c.hy - 46).toFixed(1) + '" width="100" height="10" fill="#A87A45"/>';
      if (prop === 'sign' && o.sign) s += '<g transform="translate(' + c.hx.toFixed(1) + ' ' + (c.hy - 120).toFixed(1) + ')"><rect x="-4" y="40" width="8" height="90" fill="#7A5A3A"/><rect x="-110" y="-50" width="220" height="100" rx="8" fill="#FFF8F2" stroke="#13293D" stroke-width="5"/><text y="14" text-anchor="middle" font-family="Khand" font-weight="700" font-size="46" fill="#13293D">' + String(o.sign).replace(/</g, '') + '</text></g>';
      s += '<circle cx="' + c.hx.toFixed(1) + '" cy="' + c.hy.toFixed(1) + '" r="20" fill="' + skin + '"/>';
    });
    if (o.prop === 'laptop') s += '<g transform="translate(0 ' + (shY + 150) + ')"><rect x="-90" y="-70" width="180" height="110" rx="8" fill="#2B3A55"/><rect x="-80" y="-62" width="160" height="92" rx="4" fill="#9FD3F5"/><rect x="-110" y="38" width="220" height="16" rx="6" fill="#13293D"/></g>';
    s += '</g>';
    return s;
  }

  function mix(a, b, k) { // blend two poses (joint angles)
    var f = function (x, y) { return x + (y - x) * k; };
    return { l: [f(a.l[0], b.l[0]), f(a.l[1], b.l[1])], r: [f(a.r[0], b.r[0]), f(a.r[1], b.r[1])], tilt: f(a.tilt || 0, b.tilt || 0), legs: [f((a.legs || [0, 0])[0], (b.legs || [0, 0])[0]), f((a.legs || [0, 0])[1], (b.legs || [0, 0])[1])], lean: f(a.lean || 0, b.lean || 0), prop: k < 0.5 ? a.prop : b.prop };
  }
  function bodyScale(look) { var L = Object.assign({}, PRESET[look.preset] || {}, look); return L.kid ? 0.68 : L.tall ? 1.18 : 1; }
  G.People = { bodyScale: bodyScale, svg: svgPerson, POSES: POSES, FACES: FACES, PRESET: PRESET, SKIN: SKIN, mix: mix, shade: shade };
})(typeof window !== 'undefined' ? window : globalThis);
