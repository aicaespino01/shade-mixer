/*
 * Detailed fan-art scenes (Adventure Time). Each scene is a 400 x 500 SVG picture with shading and
 * backgrounds. The paint-by-number generator turns them into kit-style numbered areas.
 * Non-commercial fan art; Adventure Time and its characters belong to Cartoon Network.
 */
(function (global) {
  'use strict';

  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function n1(v) { return Math.round(v * 10) / 10; }
  var OL = 'stroke="#2B2230" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';

  function lin(id, stops, vertical) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (vertical === false ? 1 : 0) + '" y2="' + (vertical === false ? 0 : 1) + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] !== undefined ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</linearGradient>';
  }
  function rad(id, stops) {
    return '<radialGradient id="' + id + '" cx="0.38" cy="0.35" r="0.7">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] !== undefined ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</radialGradient>';
  }
  function cloud(x, y, s, fill) {
    var parts = [[-30, 2, 20], [-10, -12, 25], [16, -8, 22], [36, 4, 15], [2, 6, 22]];
    return '<g fill="' + fill + '">' + parts.map(function (p) {
      return '<circle cx="' + n1(x + p[0] * s) + '" cy="' + n1(y + p[1] * s) + '" r="' + n1(p[2] * s) + '"/>';
    }).join('') + '</g>';
  }
  // Grass blades, drawn back to front; bigger near the bottom
  function grass(r, y0, y1, n, colors) {
    var blades = [];
    for (var i = 0; i < n; i++) blades.push({ x: r() * 420 - 10, y: y0 + (y1 - y0) * Math.pow(r(), 0.8), c: colors[Math.floor(r() * colors.length)], lean: (r() - 0.5) * 8 });
    blades.sort(function (a, b) { return a.y - b.y; });
    return blades.map(function (b) {
      var k = 0.5 + (b.y - y0) / (y1 - y0), h = (9 + r() * 12) * k;
      return '<path d="M' + n1(b.x) + ' ' + n1(b.y) + 'q' + n1(b.lean * 0.4) + ' ' + n1(-h * 0.55) + ' ' + n1(b.lean) + ' ' + n1(-h) + '" stroke="' + b.c + '" stroke-width="' + n1(2.4 * k + 1) + '" fill="none" stroke-linecap="round"/>';
    }).join('');
  }
  function flowers(r, y0, y1, n, colors) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var x = r() * 400, y = y0 + (y1 - y0) * r(), k = 0.6 + (y - y0) / (y1 - y0) * 0.8, c = colors[Math.floor(r() * colors.length)];
      for (var p = 0; p < 5; p++) {
        var a = p / 5 * Math.PI * 2;
        s += '<circle cx="' + n1(x + Math.cos(a) * 4 * k) + '" cy="' + n1(y + Math.sin(a) * 4 * k) + '" r="' + n1(3 * k) + '" fill="' + c + '"/>';
      }
      s += '<circle cx="' + n1(x) + '" cy="' + n1(y) + '" r="' + n1(2.2 * k) + '" fill="#F7D046"/>';
    }
    return s;
  }
  function tree(x, y, s, idp) {
    var t = '<path d="M' + n1(x - 9 * s) + ' ' + y + 'L' + n1(x - 6 * s) + ' ' + n1(y - 70 * s) + 'L' + n1(x + 6 * s) + ' ' + n1(y - 70 * s) + 'L' + n1(x + 9 * s) + ' ' + y + 'Z" fill="#7A4E2D"/>' +
      '<path d="M' + n1(x + 1 * s) + ' ' + y + 'L' + n1(x + 2 * s) + ' ' + n1(y - 70 * s) + 'L' + n1(x + 6 * s) + ' ' + n1(y - 70 * s) + 'L' + n1(x + 9 * s) + ' ' + y + 'Z" fill="#5E3A20"/>';
    [[-26, -78, 26], [24, -80, 24], [0, -104, 30], [-14, -126, 20], [18, -122, 22], [0, -70, 22]].forEach(function (c) {
      t += '<circle cx="' + n1(x + c[0] * s) + '" cy="' + n1(y + c[1] * s) + '" r="' + n1(c[2] * s) + '" fill="url(#' + idp + 'leaf)"/>';
    });
    // light and shadow leaf clusters
    [[-20, -96, 11, '#9BD873'], [6, -122, 10, '#9BD873'], [-30, -76, 8, '#8BCB63'], [22, -70, 12, '#2F6E2E'], [28, -96, 9, '#3A7D35'], [4, -60, 10, '#2F6E2E']].forEach(function (c) {
      t += '<circle cx="' + n1(x + c[0] * s) + '" cy="' + n1(y + c[1] * s) + '" r="' + n1(c[2] * s) + '" fill="' + c[3] + '"/>';
    });
    return t;
  }
  // Light and dark patches on a hill (clipped to the hill shape)
  function patches(r, clipId, y0, y1, n, colors) {
    var s = '<g clip-path="url(#' + clipId + ')">';
    for (var i = 0; i < n; i++) {
      var x = r() * 420 - 10, y = y0 + (y1 - y0) * r(), rx = 14 + r() * 30, ry = 5 + r() * 9;
      s += '<ellipse cx="' + n1(x) + '" cy="' + n1(y) + '" rx="' + n1(rx) + '" ry="' + n1(ry) + '" fill="' + colors[Math.floor(r() * colors.length)] + '"/>';
    }
    return s + '</g>';
  }
  // Two strokes make a cartoon "noodle" arm or leg with an outline
  function noodle(d, color, w) {
    w = w || 7;
    return '<path d="' + d + '" fill="none" stroke="#2B2230" stroke-width="' + (w + 4.4) + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function clip(id, d) { return '<clipPath id="' + id + '"><path d="' + d + '"/></clipPath>'; }
  function wrap(defs, body) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="800" height="1000"><defs>' + defs + '</defs>' + body + '</svg>';
  }

  // ------------------------------------------------------------------ Finn
  function finn() {
    var r = rng(11), p = 'fi';
    var HAT = 'M140 268L140 178Q140 120 200 120Q260 120 260 178L260 268Q260 280 248 280L238 280Q228 280 228 270L228 238L172 238L172 270Q172 280 162 280L152 280Q140 280 140 268Z';
    var SHIRT = 'M168 256Q200 250 232 256L236 352Q200 358 164 352Z';
    var SHORTS = 'M167 348H233L235 388H206L200 374L194 388H165Z';
    var FACE = 'M184 152H216Q240 152 240 176V218Q240 242 216 242H184Q160 242 160 218V176Q160 152 184 152Z';
    var MOUTH = 'M174 203Q200 238 226 203Q200 210 174 203Z';
    var PACK = 'M168 262H232Q252 262 252 282V324Q252 344 232 344H168Q148 344 148 324V282Q148 262 168 262Z';
    var defs = lin(p + 'sky', [[0, '#5DB8EE'], [0.7, '#BDE7FF'], [1, '#E8F7FF']]) +
      lin(p + 'cl', [[0, '#FFFFFF'], [1, '#D3E4F1']]) +
      lin(p + 'h1', [[0, '#A9DDB1'], [1, '#86C78F']]) +
      lin(p + 'h2', [[0, '#82C76D'], [1, '#5DA64E']]) +
      lin(p + 'gr', [[0, '#62B04B'], [1, '#3C8A37']]) +
      rad(p + 'leaf', [[0, '#7FCB5A'], [0.6, '#4E9E3E'], [1, '#2F7231']]) +
      rad(p + 'sun', [[0, '#FFF6C4'], [0.5, '#FFF0A0', 0.8], [1, '#FFF0A0', 0]]) +
      clip(p + 'cHat', HAT) + clip(p + 'cShirt', SHIRT) + clip(p + 'cShorts', SHORTS) + clip(p + 'cFace', FACE) +
      clip(p + 'cMouth', MOUTH) + clip(p + 'cPack', PACK) + clip(p + 'cH1', 'M0 300Q60 255 130 280T260 270T400 262L400 500L0 500Z') + clip(p + 'cH2', 'M0 340Q100 300 210 330T400 318L400 500L0 500Z') + clip(p + 'cG', 'M0 382Q200 360 400 386L400 500L0 500Z');
    var b = '<rect width="400" height="500" fill="url(#' + p + 'sky)"/>' +
      '<circle cx="330" cy="72" r="44" fill="#D9F2FF"/><circle cx="330" cy="72" r="34" fill="#FFF9D9"/><circle cx="330" cy="72" r="24" fill="#FFEE9A"/>' +
      cloud(86, 82, 1.25, 'url(#' + p + 'cl)') + cloud(250, 120, 0.9, 'url(#' + p + 'cl)') + cloud(372, 168, 0.65, 'url(#' + p + 'cl)') +
      '<path d="M0 300Q60 255 130 280T260 270T400 262L400 500L0 500Z" fill="url(#' + p + 'h1)"/>' + patches(r, p + 'cH1', 255, 335, 16, ['#BDE6C3', '#93D09A', '#77BD82']) +
      tree(58, 330, 0.95, p) + tree(352, 318, 0.75, p) +
      '<path d="M0 340Q100 300 210 330T400 318L400 500L0 500Z" fill="url(#' + p + 'h2)"/>' + patches(r, p + 'cH2', 300, 385, 18, ['#9AD77F', '#6CB65A', '#4E9844']) +
      '<path d="M0 382Q200 360 400 386L400 500L0 500Z" fill="url(#' + p + 'gr)"/>' + patches(r, p + 'cG', 365, 500, 26, ['#73BD55', '#4E9A40', '#3A8233', '#2E722B']) +
      grass(r, 372, 500, 380, ['#3F8F36', '#5CAB45', '#77C04F', '#2F7A2E']) +
      flowers(r, 392, 498, 34, ['#FFFFFF', '#F7A1C4', '#F28C28', '#FDE68A']) +
      '<ellipse cx="200" cy="452" rx="58" ry="9" fill="#24561F" fill-opacity=".45"/>' +
      // backpack
      '<path d="' + PACK + '" fill="#3FA34D" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cPack)"><rect x="226" y="255" width="40" height="100" fill="#2E8A3D"/></g>' +
      '<path d="' + PACK + '" fill="none" ' + OL + '/>' +
      // legs, socks, shoes
      '<rect x="184" y="384" width="9" height="14" fill="#FDDCC6" ' + OL + '/><rect x="207" y="384" width="9" height="14" fill="#FDDCC6" ' + OL + '/>' +
      '<rect x="183" y="396" width="11" height="42" rx="3" fill="#FFFFFF" ' + OL + '/><rect x="206" y="396" width="11" height="42" rx="3" fill="#FFFFFF" ' + OL + '/>' +
      '<rect x="190" y="397" width="4" height="40" fill="#D9E1EA"/><rect x="213" y="397" width="4" height="40" fill="#D9E1EA"/>' +
      '<rect x="168" y="436" width="29" height="16" rx="8" fill="#26222B" ' + OL + '/><rect x="203" y="436" width="29" height="16" rx="8" fill="#26222B" ' + OL + '/>' +
      '<ellipse cx="177" cy="441" rx="5" ry="2" fill="#6B6670"/><ellipse cx="212" cy="441" rx="5" ry="2" fill="#6B6670"/>' +
      // shorts
      '<path d="' + SHORTS + '" fill="#23408F" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cShorts)"><rect x="214" y="345" width="30" height="50" fill="#182E6E"/></g>' +
      '<path d="' + SHORTS + '" fill="none" ' + OL + '/>' +
      // arms
      noodle('M158 284Q145 318 150 344', '#FDDCC6') + noodle('M242 284Q255 318 250 344', '#FDDCC6') +
      '<circle cx="150" cy="348" r="7.5" fill="#FDDCC6" ' + OL + '/><circle cx="250" cy="348" r="7.5" fill="#FDDCC6" ' + OL + '/>' +
      // shirt + sleeves
      '<path d="M170 258L151 272L159 293L172 285Z" fill="#5BC3EE" ' + OL + '/><path d="M230 258L249 272L241 293L228 285Z" fill="#3FA6D9" ' + OL + '/>' +
      '<path d="' + SHIRT + '" fill="#5BC3EE" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cShirt)"><rect x="216" y="248" width="30" height="115" fill="#3FA6D9"/><rect x="160" y="336" width="80" height="22" fill="#4AB3E2"/></g>' +
      '<path d="' + SHIRT + '" fill="none" ' + OL + '/>' +
      '<rect x="176" y="258" width="8" height="72" rx="3" fill="#2E8A3D" ' + OL + '/><rect x="216" y="258" width="8" height="72" rx="3" fill="#2E8A3D" ' + OL + '/>' +
      // neck, hat, ears
      '<rect x="188" y="234" width="24" height="24" rx="4" fill="#F4CBB2" ' + OL + '/>' +
      '<circle cx="158" cy="128" r="15" fill="#FFFFFF" ' + OL + '/><circle cx="242" cy="128" r="15" fill="#F1F4F8" ' + OL + '/>' +
      '<path d="' + HAT + '" fill="#FFFFFF" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cHat)"><path d="M228 118Q262 140 262 200V284H226Z" fill="#DCE4EE"/><rect x="138" y="262" width="124" height="22" fill="#E8EEF4"/></g>' +
      '<path d="' + HAT + '" fill="none" ' + OL + '/>' +
      // face
      '<path d="' + FACE + '" fill="#FDE0CC" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cFace)"><rect x="226" y="150" width="20" height="96" fill="#F4CDB6"/><rect x="158" y="150" width="90" height="10" fill="#F1C8AF"/></g>' +
      '<path d="' + FACE + '" fill="none" ' + OL + '/>' +
      '<circle cx="182" cy="188" r="4.6" fill="#1E1E1F"/><circle cx="218" cy="188" r="4.6" fill="#1E1E1F"/>' +
      '<path d="' + MOUTH + '" fill="#3A1F22" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cMouth)"><ellipse cx="200" cy="228" rx="13" ry="8" fill="#E07070"/></g>' +
      '<path d="' + MOUTH + '" fill="none" ' + OL + '/>';
    return wrap(defs, b);
  }

  // ------------------------------------------------------------------ Jake
  function jake() {
    var r = rng(22), p = 'ja';
    var BODY = 'M148 280Q138 340 152 384Q200 396 248 384Q262 340 252 280Z';
    var HEAD = 'M116 215A84 70 0 1 0 284 215A84 70 0 1 0 116 215Z';
    var defs = lin(p + 'sky', [[0, '#7FB6EA'], [0.5, '#F6CBA9'], [1, '#F39C7B']]) +
      lin(p + 'h1', [[0, '#B98BB3'], [1, '#9A78A8']]) +
      lin(p + 'h2', [[0, '#7DB862'], [1, '#5B9E4B']]) +
      lin(p + 'gr', [[0, '#67A94F'], [1, '#3D8236']]) +
      lin(p + 'cl', [[0, '#FFF4EA'], [1, '#F3C7B3']]) +
      rad(p + 'leaf', [[0, '#86C760'], [0.6, '#4E9A3E'], [1, '#2D6A2E']]) +
      rad(p + 'sun', [[0, '#FFE9A8'], [0.5, '#FFD27A', 0.7], [1, '#FFC46A', 0]]) +
      clip(p + 'cBody', BODY) + clip(p + 'cHead', HEAD) + clip(p + 'cH1', 'M0 300Q80 250 160 285T300 270T400 285L400 500L0 500Z') + clip(p + 'cH2', 'M0 345Q110 305 220 338T400 328L400 500L0 500Z') + clip(p + 'cG', 'M0 390Q200 368 400 392L400 500L0 500Z');
    var b = '<rect width="400" height="500" fill="url(#' + p + 'sky)"/>' +
      '<circle cx="300" cy="292" r="95" fill="url(#' + p + 'sun)"/><circle cx="300" cy="292" r="42" fill="#FFE08A"/>' +
      cloud(80, 70, 1.1, 'url(#' + p + 'cl)') + cloud(300, 110, 0.8, 'url(#' + p + 'cl)') +
      '<path d="M0 300Q80 250 160 285T300 270T400 285L400 500L0 500Z" fill="url(#' + p + 'h1)"/>' + patches(r, p + 'cH1', 255, 340, 16, ['#C9A1C1', '#A887B4', '#8E6D9E']) +
      '<path d="M0 345Q110 305 220 338T400 328L400 500L0 500Z" fill="url(#' + p + 'h2)"/>' + patches(r, p + 'cH2', 305, 390, 18, ['#93C976', '#6FAE57', '#558F45']) +
      tree(355, 360, 0.9, p) +
      '<path d="M0 390Q200 368 400 392L400 500L0 500Z" fill="url(#' + p + 'gr)"/>' + patches(r, p + 'cG', 372, 500, 26, ['#78B85A', '#549A43', '#3F8337', '#2F702C']) +
      grass(r, 380, 500, 360, ['#3C8434', '#58A143', '#76B850', '#2D7029']) +
      flowers(r, 398, 498, 30, ['#FFFFFF', '#F7A1C4', '#FDE68A', '#B9A3E3']) +
      '<ellipse cx="200" cy="418" rx="66" ry="10" fill="#2B5A22" fill-opacity=".45"/>' +
      // tail, legs, body
      '<path d="M258 352Q300 346 300 312Q310 352 266 372Z" fill="#F2B12B" ' + OL + '/>' +
      '<rect x="164" y="370" width="23" height="46" rx="10" fill="#E3A12A" ' + OL + '/><rect x="213" y="370" width="23" height="46" rx="10" fill="#D9962A" ' + OL + '/>' +
      '<path d="' + BODY + '" fill="#F2B12B" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cBody)"><path d="M228 270Q262 330 252 400H270V270Z" fill="#D9962A"/><ellipse cx="194" cy="346" rx="24" ry="30" fill="#F8C95A"/></g>' +
      '<path d="' + BODY + '" fill="none" ' + OL + '/>' +
      noodle('M152 300Q124 330 136 362', '#F2B12B', 8) + noodle('M248 300Q276 330 264 362', '#E3A12A', 8) +
      '<circle cx="137" cy="366" r="8.5" fill="#F2B12B" ' + OL + '/><circle cx="263" cy="366" r="8.5" fill="#E3A12A" ' + OL + '/>' +
      // head
      '<path d="' + HEAD + '" fill="#F2B12B" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cHead)"><ellipse cx="262" cy="258" rx="66" ry="52" fill="#E2A12B"/><ellipse cx="168" cy="160" rx="40" ry="18" fill="#F7C24A"/></g>' +
      '<path d="' + HEAD + '" fill="none" ' + OL + '/>' +
      '<path d="M128 190Q96 196 100 262Q118 270 134 236Z" fill="#D98A1E" ' + OL + '/><path d="M272 190Q304 196 300 262Q282 270 266 236Z" fill="#C67A18" ' + OL + '/>' +
      '<path d="M150 238Q150 214 176 218Q200 226 224 218Q250 214 250 238Q250 270 200 270Q150 270 150 238Z" fill="#F6C04A" ' + OL + '/>' +
      '<path d="M206 262Q240 262 248 236Q250 258 232 266Q216 270 200 270Z" fill="#E8AE3C"/>' +
      '<circle cx="170" cy="196" r="17" fill="#FFFFFF" ' + OL + '/><circle cx="230" cy="196" r="17" fill="#FFFFFF" ' + OL + '/>' +
      '<circle cx="174" cy="199" r="9" fill="#1E1E1F"/><circle cx="226" cy="199" r="9" fill="#1E1E1F"/>' +
      '<circle cx="177.5" cy="195" r="3" fill="#FFFFFF"/><circle cx="229.5" cy="195" r="3" fill="#FFFFFF"/>' +
      '<path d="M152 170Q170 162 188 170M212 170Q230 162 248 170" fill="none" stroke="#2B2230" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="200" cy="232" rx="14" ry="9" fill="#1E1E1F"/><ellipse cx="196" cy="229" rx="4.5" ry="2.2" fill="#6A6470"/>' +
      '<path d="M184 252Q200 262 216 252" fill="none" stroke="#2B2230" stroke-width="2.6" stroke-linecap="round"/>';
    return wrap(defs, b);
  }

  // ------------------------------------------------------------------ Princess Bubblegum
  function pb() {
    var r = rng(33), p = 'pb';
    var HAIR = 'M142 170Q140 120 200 116Q260 120 258 170Q270 260 262 330Q272 390 252 430Q236 438 228 420L172 420Q164 438 148 430Q128 390 138 330Q130 260 142 170Z';
    var DRESS = 'M176 226Q200 220 224 226L236 300Q262 380 276 452Q200 466 124 452Q138 380 164 300Z';
    var FACE = 'M160 165A40 44 0 1 0 240 165A40 44 0 1 0 160 165Z';
    var ROOF1 = 'M162 142L200 70L238 142Z';
    var defs = lin(p + 'sky', [[0, '#F9C6E0'], [0.7, '#FDE6F1'], [1, '#FFF4F8']]) +
      lin(p + 'cl', [[0, '#FFFFFF'], [1, '#F6D2E6']]) +
      lin(p + 'gr', [[0, '#F9CADD'], [1, '#EFA3C3']]) +
      lin(p + 't1', [[0, '#F7A7CB'], [1, '#E88AB6']], false) +
      lin(p + 't2', [[0, '#A9E9D7'], [1, '#7FD1BA']], false) +
      lin(p + 't3', [[0, '#FFE9B8'], [1, '#F6CF86']], false) +
      clip(p + 'cHair', HAIR) + clip(p + 'cDress', DRESS) + clip(p + 'cFace', FACE) + clip(p + 'cRoof', ROOF1);
    var gum = '';
    for (var i = 0; i < 46; i++) {
      var gx = r() * 400, gy = 392 + r() * 100, gs = 0.9 + (gy - 392) / 100 * 1.1, gc = ['#6FD1B6', '#F7D046', '#B58BE0', '#F28CB1', '#FF9A5A'][i % 5];
      if (gx > 110 && gx < 290 && gy < 470) continue;
      gum += '<path d="M' + n1(gx - 9 * gs) + ' ' + n1(gy) + 'Q' + n1(gx - 9 * gs) + ' ' + n1(gy - 13 * gs) + ' ' + n1(gx) + ' ' + n1(gy - 13 * gs) + 'Q' + n1(gx + 9 * gs) + ' ' + n1(gy - 13 * gs) + ' ' + n1(gx + 9 * gs) + ' ' + n1(gy) + 'Z" fill="' + gc + '"/>' +
        '<ellipse cx="' + n1(gx - 3 * gs) + '" cy="' + n1(gy - 9 * gs) + '" rx="' + n1(2.5 * gs) + '" ry="' + n1(1.6 * gs) + '" fill="#FFFFFF" fill-opacity=".7"/>';
    }
    var spr = '', sc = ['#F7D046', '#6FD1B6', '#B58BE0', '#FFFFFF', '#FF9A5A', '#5FA8E8'];
    for (var q = 0; q < 70; q++) {
      var qx = r() * 400, qy = 382 + r() * 115, qa = Math.round(r() * 180);
      if (qx > 120 && qx < 280 && qy < 462) continue;
      spr += '<rect x="' + n1(qx - 5) + '" y="' + n1(qy - 1.8) + '" width="10" height="3.6" rx="1.8" fill="' + sc[q % sc.length] + '" transform="rotate(' + qa + ' ' + n1(qx) + ' ' + n1(qy) + ')"/>';
    }
    var dots = '';
    [[95, 140, 190, 340, '#7FD1BA'], [170, 230, 140, 340, '#E88AB6'], [262, 310, 175, 340, '#F6CF86']].forEach(function (t) {
      for (var dy = t[2] + 16; dy < t[3] - 70; dy += 22) for (var dx = t[0] + 10; dx < t[1] - 6; dx += 18) dots += '<circle cx="' + (dx + ((dy / 22) % 2) * 6) + '" cy="' + dy + '" r="4" fill="' + t[4] + '"/>';
    });
    function lolly(x, y, c1, c2) {
      return '<rect x="' + (x - 2) + '" y="' + y + '" width="4" height="70" fill="#FFF6EE"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="24" fill="' + c1 + '"/>' +
        '<path d="M' + x + ' ' + y + 'm0 -18a18 18 0 1 1 -14 7a13 13 0 1 1 10 -3a8 8 0 1 1 -5 2" fill="none" stroke="' + c2 + '" stroke-width="4" stroke-linecap="round"/>';
    }
    var stripes = '';
    for (var s = 0; s < 8; s++) stripes += '<path d="M' + (150 + s * 14) + ' 150L' + (190 + s * 14) + ' 60" stroke="#FFFFFF" stroke-width="5" stroke-opacity=".75"/>';
    var b = '<rect width="400" height="500" fill="url(#' + p + 'sky)"/>' +
      cloud(70, 70, 1.1, 'url(#' + p + 'cl)') + cloud(330, 60, 0.9, 'url(#' + p + 'cl)') + cloud(360, 200, 0.6, 'url(#' + p + 'cl)') +
      // castle
      '<rect x="95" y="190" width="45" height="150" fill="url(#' + p + 't2)"/><path d="M88 192L117 128L147 192Z" fill="#F7D046"/>' +
      '<rect x="262" y="175" width="48" height="165" fill="url(#' + p + 't3)"/><path d="M255 177L286 108L317 177Z" fill="#C69BE3"/>' +
      '<rect x="170" y="140" width="60" height="200" fill="url(#' + p + 't1)"/>' +
      '<path d="' + ROOF1 + '" fill="#E0569B"/><g clip-path="url(#' + p + 'cRoof)">' + stripes + '</g>' +
      '<path d="M200 70V52L214 58L200 64" fill="#F7D046"/><path d="M117 128V112L129 117L117 122" fill="#E0569B"/><path d="M286 108V92L298 97L286 102" fill="#6FD1B6"/>' +
      '<path d="M80 340V280H92V270H104V280H116V270H128V280H140V270H152V280H164V270H176V280H224V270H236V280H248V270H260V280H272V270H284V280H296V270H308V280H320V340Z" fill="#F7B5D3"/>' +
      '<path d="M184 340V306Q200 290 216 306V340Z" fill="#C94C86"/>' + dots +
      '<path d="M108 230Q117 220 126 230V250H108Z M190 180Q200 170 210 180V200H190Z M277 215Q286 205 295 215V235H277Z" fill="#B04A7C"/>' +
      lolly(40, 300, '#FF8FB8', '#FFFFFF') + lolly(362, 290, '#7FD7C0', '#FFFFFF') +
      '<path d="M0 372Q200 350 400 374L400 500L0 500Z" fill="url(#' + p + 'gr)"/>' +
      '<path d="M0 410Q200 392 400 412" fill="none" stroke="#FBE0EB" stroke-width="5"/><path d="M0 448Q200 430 400 450" fill="none" stroke="#FBE0EB" stroke-width="5"/>' +
      gum + spr +
      '<ellipse cx="200" cy="458" rx="82" ry="8" fill="#B5527F" fill-opacity=".35"/>' +
      // hair back
      '<path d="' + HAIR + '" fill="#E8579B" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cHair)"><path d="M140 160Q128 300 150 440L170 440Q150 300 160 160Z M240 160Q252 300 236 440L262 440Q276 300 262 160Z" fill="#C93F82"/></g>' +
      '<path d="' + HAIR + '" fill="none" ' + OL + '/>' +
      // dress
      '<path d="' + DRESS + '" fill="#9B59B6" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cDress)"><path d="M214 220Q240 330 282 462H300V220Z" fill="#7E3F9D"/><path d="M186 300Q172 380 150 456L160 458Q180 380 192 302Z" fill="#7E3F9D"/></g>' +
      '<path d="' + DRESS + '" fill="none" ' + OL + '/>' +
      '<path d="M178 228Q200 248 222 228L224 236Q200 258 176 236Z" fill="#F5C518" ' + OL + '/>' +
      '<ellipse cx="166" cy="236" rx="16" ry="13" fill="#B57BD0" ' + OL + '/><ellipse cx="234" cy="236" rx="16" ry="13" fill="#9B62BD" ' + OL + '/>' +
      noodle('M158 246Q146 290 166 322', '#F9B9CF') + noodle('M242 246Q254 290 234 322', '#F0A1BE') +
      '<circle cx="167" cy="325" r="7" fill="#F9B9CF" ' + OL + '/><circle cx="233" cy="325" r="7" fill="#F0A1BE" ' + OL + '/>' +
      // head
      '<rect x="192" y="198" width="16" height="32" rx="5" fill="#F0A1BE" ' + OL + '/>' +
      '<path d="' + FACE + '" fill="#F9B9CF" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cFace)"><ellipse cx="238" cy="178" rx="22" ry="40" fill="#F0A1BE"/></g>' +
      '<path d="' + FACE + '" fill="none" ' + OL + '/>' +
      '<path d="M160 160Q156 118 200 116Q244 118 240 160Q230 138 214 134Q208 150 200 152Q192 150 186 134Q170 138 160 160Z" fill="#E8579B" ' + OL + '/>' +
      '<path d="M180 122L180 102L190 112L200 94L210 112L220 102L220 122Z" fill="#F5C518" ' + OL + '/>' +
      '<path d="M206 104L210 112L220 102L220 122L206 122Z" fill="#D9A80F"/>' +
      '<circle cx="200" cy="113" r="4.5" fill="#2F7FD6" ' + OL + '/>' +
      '<ellipse cx="186" cy="172" rx="3.6" ry="5" fill="#1E1E1F"/><ellipse cx="214" cy="172" rx="3.6" ry="5" fill="#1E1E1F"/>' +
      '<circle cx="177" cy="187" r="6" fill="#F48FB8"/><circle cx="223" cy="187" r="6" fill="#F48FB8"/>' +
      '<path d="M192 193Q200 199 208 193" fill="none" stroke="#2B2230" stroke-width="2.2" stroke-linecap="round"/>';
    return wrap(defs, b);
  }

  // ------------------------------------------------------------------ Marceline
  function marceline() {
    var r = rng(44), p = 'ma';
    var HAIR = 'M150 140Q146 92 200 88Q256 92 252 140Q270 220 286 300Q300 380 332 430Q292 442 262 420Q250 380 240 330L170 330Q160 380 140 420Q112 442 76 428Q112 370 122 300Q134 220 150 140Z';
    var FACE = 'M160 138Q160 106 200 106Q240 106 240 138V158Q240 192 200 194Q160 192 160 158Z';
    var TOP = 'M176 206Q200 200 224 206L230 280Q200 288 170 280Z';
    var JEANS = 'M172 278Q200 286 228 278L236 330Q240 358 262 370L256 392Q222 380 210 342L200 314L190 342Q180 372 160 398L144 388Q160 360 166 330Z';
    var defs = lin(p + 'sky', [[0, '#141235'], [0.55, '#3B2F6E'], [1, '#6A4C8F']]) +
      rad(p + 'glow', [[0, '#FFF6C9', 0.9], [0.45, '#F6E9B0', 0.35], [1, '#F6E9B0', 0]]) +
      lin(p + 'moon', [[0, '#FBF2C8'], [1, '#EAD994']]) +
      clip(p + 'cHair', HAIR) + clip(p + 'cFace', FACE) + clip(p + 'cTop', TOP) + clip(p + 'cJeans', JEANS);
    var stars = '';
    for (var i = 0; i < 60; i++) {
      var sx = r() * 400, sy = r() * 330, sr = 1.4 + r() * 2;
      if (Math.hypot(sx - 300, sy - 105) < 70) continue;
      stars += '<circle cx="' + n1(sx) + '" cy="' + n1(sy) + '" r="' + n1(sr) + '" fill="#FFF6D6"/>';
    }
    [[60, 60], [120, 210], [350, 250], [40, 300]].forEach(function (s) {
      stars += '<path d="M' + s[0] + ' ' + (s[1] - 7) + 'L' + (s[0] + 2) + ' ' + (s[1] - 2) + 'L' + (s[0] + 7) + ' ' + s[1] + 'L' + (s[0] + 2) + ' ' + (s[1] + 2) + 'L' + s[0] + ' ' + (s[1] + 7) + 'L' + (s[0] - 2) + ' ' + (s[1] + 2) + 'L' + (s[0] - 7) + ' ' + s[1] + 'L' + (s[0] - 2) + ' ' + (s[1] - 2) + 'Z" fill="#FFF6D6"/>';
    });
    var b = '<rect width="400" height="500" fill="url(#' + p + 'sky)"/>' + stars +
      '<circle cx="300" cy="105" r="95" fill="url(#' + p + 'glow)"/>' +
      '<circle cx="300" cy="105" r="48" fill="url(#' + p + 'moon)"/>' +
      '<circle cx="284" cy="92" r="8" fill="#E2CF85"/><circle cx="314" cy="122" r="11" fill="#E2CF85"/><circle cx="318" cy="88" r="5" fill="#E2CF85"/>' +
      '<path d="M0 300Q100 280 200 300T400 296L400 330Q300 316 200 330T0 330Z" fill="#4A3B80" fill-opacity=".55"/>' +'<path d="M0 236Q120 214 240 236T400 230L400 252Q280 240 160 256T0 256Z" fill="#2C2660" fill-opacity=".6"/>' +'<path d="M0 370L50 320L95 352L150 300L205 350L255 296L320 344L370 310L400 330L400 500L0 500Z" fill="#3A2D63"/>' +'<path d="M0 400L60 340L110 380L170 322L230 392L290 332L350 372L400 342L400 500L0 500Z" fill="#2A2148"/>' +
      '<path d="M0 440Q200 420 400 446L400 500L0 500Z" fill="#1D1736"/>' +
      grass(r, 436, 500, 200, ['#2E2550', '#3A2F63', '#251E45']) +
      // hair back
      '<path d="' + HAIR + '" fill="#1B1922" stroke="#0D0C12" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<g clip-path="url(#' + p + 'cHair)"><path d="M150 150Q128 280 92 424M252 150Q276 280 318 426M170 120Q150 240 120 400M236 124Q262 250 292 404" fill="none" stroke="#3A3F5C" stroke-width="5"/><path d="M160 160Q140 290 108 418M244 160Q266 290 304 418" fill="none" stroke="#2A2E44" stroke-width="7"/></g>' +
      // jeans + boots
      '<path d="' + JEANS + '" fill="#3E5F9A" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cJeans)"><path d="M214 276L240 330Q244 360 270 372V400H214Z" fill="#2E4A7D"/></g>' +
      '<path d="' + JEANS + '" fill="none" ' + OL + '/>' +
      '<path d="M140 384L162 394L156 418Q140 422 130 412Z" fill="#B8242C" ' + OL + '/><path d="M254 366L276 376L272 400Q256 403 248 394Z" fill="#9C1E26" ' + OL + '/>' +
      // axe bass, held in front of her
      '<path d="M190 318L330 188" stroke="#2B2230" stroke-width="13" stroke-linecap="round"/><path d="M190 318L330 188" stroke="#5A3A2A" stroke-width="8" stroke-linecap="round"/>' +
      '<rect x="322" y="172" width="16" height="22" rx="3" transform="rotate(45 330 183)" fill="#3A2A2A" ' + OL + '/>' +
      '<path d="M150 312Q170 286 206 300L226 348Q194 372 158 356Q138 330 150 312Z" fill="#C0392B" ' + OL + '/>' +
      '<path d="M206 300L226 348Q218 354 210 356L194 308Z" fill="#E3E6EA" ' + OL + '/>' +
      '<path d="M158 322Q174 310 190 318" fill="none" stroke="#8E2A20" stroke-width="2.5"/>' +
      // top
      '<path d="' + TOP + '" fill="#4A4F5A" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cTop)"><rect x="210" y="198" width="30" height="92" fill="#3A3E47"/></g>' +
      '<path d="' + TOP + '" fill="none" ' + OL + '/>' +
      noodle('M176 214Q150 252 162 292', '#A7B6C9') + noodle('M224 214Q250 236 262 256', '#93A3B8') +
      '<circle cx="163" cy="296" r="7" fill="#A7B6C9" ' + OL + '/><circle cx="264" cy="258" r="7" fill="#93A3B8" ' + OL + '/>' +
      // head
      '<rect x="191" y="184" width="18" height="26" rx="5" fill="#93A3B8" ' + OL + '/>' +
      '<circle cx="196" cy="200" r="1.9" fill="#B8242C"/><circle cx="204" cy="200" r="1.9" fill="#B8242C"/>' +
      '<path d="M162 140L140 122L164 162Z" fill="#A7B6C9" ' + OL + '/><path d="M238 140L260 122L236 162Z" fill="#93A3B8" ' + OL + '/>' +
      '<path d="' + FACE + '" fill="#A7B6C9" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cFace)"><rect x="224" y="100" width="22" height="100" fill="#93A3B8"/></g>' +
      '<path d="' + FACE + '" fill="none" ' + OL + '/>' +
      '<path d="M156 150Q150 92 200 90Q250 92 244 150Q236 116 218 108Q200 126 170 116Q160 130 156 150Z" fill="#1B1922" stroke="#0D0C12" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M176 104Q196 98 214 104" fill="none" stroke="#3A3F5C" stroke-width="2.5"/>' +
      '<ellipse cx="184" cy="150" rx="3.6" ry="5.6" fill="#1E1E1F"/><ellipse cx="216" cy="150" rx="3.6" ry="5.6" fill="#1E1E1F"/>' +
      '<path d="M188 172Q201 180 214 169" fill="none" stroke="#2B2230" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M205 175L211 173L208 181Z" fill="#FFFFFF" stroke="#2B2230" stroke-width="1"/>';
    return wrap(defs, b);
  }

  // ------------------------------------------------------------------ BMO
  function bmo() {
    var r = rng(55), p = 'bm';
    var FRONT = 'M156 170H244Q260 170 260 186V354Q260 370 244 370H156Q140 370 140 354V186Q140 170 156 170Z';
    var SCREEN = 'M166 188H234Q244 188 244 198V250Q244 260 234 260H166Q156 260 156 250V198Q156 188 166 188Z';
    var defs = lin(p + 'win', [[0, '#8FD0F5'], [1, '#D5F0FF']]) +
      lin(p + 'floor', [[0, '#9A6A40'], [1, '#6E4426']]) +
      lin(p + 'scr', [[0, '#E2FADB'], [1, '#B9E8B0']]) +
      rad(p + 'leaf', [[0, '#8AD063'], [0.6, '#4E9A3E'], [1, '#2D6A2E']]) +
      clip(p + 'cFront', FRONT) + clip(p + 'cWin', 'M262 72H358V168H262Z');
    var planks = '';
    var pc = ['#B07A4A', '#A26C3F', '#B9844F', '#A87244'];
    for (var i = 0; i < 10; i++) {
      planks += '<rect x="' + i * 40 + '" y="0" width="40" height="400" fill="' + pc[i % 4] + '"/>' +
        '<rect x="' + (i * 40 + 34) + '" y="0" width="6" height="400" fill="#8A5A33"/>';
      for (var g = 0; g < 6; g++) {
        var gy = r() * 380, gx = i * 40 + 6 + r() * 24;
        planks += '<path d="M' + n1(gx) + ' ' + n1(gy) + 'q4 14 0 28q-4 14 0 28" fill="none" stroke="#7E5030" stroke-width="3"/>';
      }
      if (r() < 0.5) planks += '<ellipse cx="' + n1(i * 40 + 18) + '" cy="' + n1(60 + r() * 280) + '" rx="4" ry="6" fill="#7A4C2A"/>';
    }
    var leaves = '';
    for (var l = 0; l < 9; l++) leaves += '<circle cx="' + n1(262 + r() * 96) + '" cy="' + n1(72 + r() * 50) + '" r="' + n1(12 + r() * 12) + '" fill="url(#' + p + 'leaf)"/>';
    var floor = '<rect x="0" y="400" width="400" height="100" fill="url(#' + p + 'floor)"/>';
    for (var f = 0; f < 5; f++) {
      var fy = 400 + f * 20 + f * f * 2;
      for (var fx = (f % 2) * -40; fx < 400; fx += 90) floor += '<rect x="' + fx + '" y="' + fy + '" width="88" height="' + (20 + f * 4) + '" fill="' + (((fx / 90 + f) % 2 === 0) ? '#8E5E37' : '#7A4D2B') + '"/>';
      floor += '<path d="M0 ' + fy + 'H400" stroke="#5A361D" stroke-width="2"/>';
    }
    var b = planks +
      // window
      '<rect x="254" y="64" width="112" height="112" rx="6" fill="#6E4426"/>' +
      '<rect x="262" y="72" width="96" height="96" fill="url(#' + p + 'win)"/>' +
      '<g clip-path="url(#' + p + 'cWin)">' + cloud(300, 140, 0.6, '#FFFFFF') + leaves + '</g>' +
      '<rect x="307" y="72" width="6" height="96" fill="#6E4426"/><rect x="262" y="117" width="96" height="6" fill="#6E4426"/>' +
      '<rect x="248" y="174" width="124" height="10" rx="3" fill="#5A361D"/>' +
      // shelf with books
      '<rect x="24" y="150" width="130" height="10" rx="2" fill="#5A361D"/>' +
      '<rect x="34" y="108" width="14" height="42" fill="#C0392B"/><rect x="50" y="114" width="12" height="36" fill="#2F7FD6"/><rect x="64" y="104" width="16" height="46" fill="#F5C518"/>' +
      '<rect x="82" y="118" width="11" height="32" fill="#3A9B37"/><path d="M98 150L108 112L120 116L110 150Z" fill="#9B59B6"/>' +
      '<circle cx="138" cy="138" r="12" fill="#E8EEF4"/><rect x="131" y="138" width="14" height="12" fill="#C9D3DD"/>' +
      floor +
      '<ellipse cx="200" cy="440" rx="150" ry="30" fill="#C8574A"/><ellipse cx="200" cy="440" rx="118" ry="21" fill="#E59A57"/><ellipse cx="200" cy="440" rx="84" ry="13" fill="#C8574A"/>' + (function () { var z = ''; for (var zi = 0; zi < 16; zi++) { var za = zi / 16 * Math.PI * 2; z += '<circle cx="' + n1(200 + Math.cos(za) * 134) + '" cy="' + n1(440 + Math.sin(za) * 25.5) + '" r="4" fill="#F3D37A"/>'; } return z; })() +'<path d="M30 470L40 432H74L84 470Z" fill="#C0603A"/><path d="M36 432H78V424H36Z" fill="#A84F2E"/>' +'<path d="M57 424Q40 390 26 380Q46 384 57 410Q60 372 74 352Q70 384 62 412Q78 386 96 384Q76 398 60 424Z" fill="#4E9A3E"/><path d="M57 424Q52 400 44 388Q56 396 60 418Z" fill="#2F7231"/>' +
      '<ellipse cx="208" cy="426" rx="72" ry="10" fill="#3B2412" fill-opacity=".45"/>' +
      // legs + arms
      noodle('M178 368Q176 396 172 420', '#5FBFAE') + noodle('M226 368Q228 396 232 420', '#48A897') +
      '<ellipse cx="168" cy="423" rx="11" ry="6" fill="#5FBFAE" ' + OL + '/><ellipse cx="236" cy="423" rx="11" ry="6" fill="#48A897" ' + OL + '/>' +
      noodle('M142 252Q112 284 118 318', '#5FBFAE') + noodle('M276 252Q302 286 296 318', '#48A897') +
      '<circle cx="118" cy="322" r="7" fill="#5FBFAE" ' + OL + '/><circle cx="296" cy="322" r="7" fill="#48A897" ' + OL + '/>' +
      // body (side + front)
      '<path d="M170 178H262Q278 178 278 194V360Q278 376 262 376H170Z" fill="#3E9C8B" ' + OL + '/>' +
      '<path d="' + FRONT + '" fill="#5FBFAE" ' + OL + '/>' +
      '<g clip-path="url(#' + p + 'cFront)"><rect x="138" y="168" width="124" height="10" fill="#7FD3C3"/><rect x="138" y="346" width="124" height="26" fill="#52B0A0"/></g>' +
      '<path d="' + FRONT + '" fill="none" ' + OL + '/>' +
      '<path d="' + SCREEN + '" fill="url(#' + p + 'scr)" ' + OL + '/>' +
      '<circle cx="183" cy="214" r="4.6" fill="#1E1E1F"/><circle cx="217" cy="214" r="4.6" fill="#1E1E1F"/>' +
      '<path d="M186 228H214Q212 246 200 246Q188 246 186 228Z" fill="#1E3B36" ' + OL + '/>' +
      '<path d="M192 241Q200 236 208 241Q204 246 200 246Q196 246 192 241Z" fill="#E07070"/>' +
      '<rect x="164" y="272" width="54" height="7" rx="3.5" fill="#1E3B36"/>' +
      '<path d="M172 292H184V302H194V314H184V324H172V314H162V302H172Z" fill="#F5C518" ' + OL + '/>' +
      '<circle cx="224" cy="294" r="6" fill="#2F55B4" ' + OL + '/>' +
      '<path d="M232 318L246 318L239 306Z" fill="#3A9B37" ' + OL + '/>' +
      '<circle cx="226" cy="336" r="11" fill="#D7262A" ' + OL + '/><ellipse cx="222" cy="332" rx="3.5" ry="2.2" fill="#FF8A8A"/>' +
      '<rect x="160" y="344" width="16" height="6" rx="3" fill="#1E3B36"/><rect x="182" y="344" width="16" height="6" rx="3" fill="#1E3B36"/>';
    return wrap(defs, b);
  }

  var SERIES = 'Adventure Time fan art';
  global.KIT_SCENES = [
    { id: 'kit-finn', title: 'Finn in the meadow', series: SERIES, blurb: 'Finn in his bear hat on a sunny day, with hills, trees and flowers.', svg: finn },
    { id: 'kit-jake', title: 'Jake at sunset', series: SERIES, blurb: 'Jake standing in the grass with a warm sunset behind him.', svg: jake },
    { id: 'kit-pb', title: 'Princess Bubblegum in the Candy Kingdom', series: SERIES, blurb: 'PB in front of her candy castle, with gumdrops and lollipops.', svg: pb },
    { id: 'kit-marceline', title: 'Marceline under the moon', series: SERIES, blurb: 'Marceline floating at night with her axe bass and the stars.', svg: marceline },
    { id: 'kit-bmo', title: 'BMO in the Tree Fort', series: SERIES, blurb: 'BMO standing on a rug inside the wooden Tree Fort.', svg: bmo }
  ];
})(this);
