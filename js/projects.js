/*
 * Paint-by-number projects.
 * Every picture is 300 x 300 units. Shapes are painted in order (later shapes sit on top).
 *   shapes: [colorNumber, svgPath]
 *   lines:  [svgPath, colorNumber, width]   thin detail lines (mouths, birds, spines...)
 * Colour numbers start at 1 and match the palette order.
 */
(function (global) {
  'use strict';

  function f(n) { return Math.round(n * 100) / 100; }
  function circle(cx, cy, r) {
    return 'M' + f(cx - r) + ' ' + f(cy) + 'A' + r + ' ' + r + ' 0 1 0 ' + f(cx + r) + ' ' + f(cy) +
      'A' + r + ' ' + r + ' 0 1 0 ' + f(cx - r) + ' ' + f(cy) + 'Z';
  }
  function ellipse(cx, cy, rx, ry) {
    return 'M' + f(cx - rx) + ' ' + f(cy) + 'A' + rx + ' ' + ry + ' 0 1 0 ' + f(cx + rx) + ' ' + f(cy) +
      'A' + rx + ' ' + ry + ' 0 1 0 ' + f(cx - rx) + ' ' + f(cy) + 'Z';
  }
  function rrect(x, y, w, h, r) {
    r = Math.min(r || 0, w / 2, h / 2);
    if (!r) return 'M' + x + ' ' + y + 'H' + (x + w) + 'V' + (y + h) + 'H' + x + 'Z';
    return 'M' + f(x + r) + ' ' + y + 'H' + f(x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + f(x + w) + ' ' + f(y + r) +
      'V' + f(y + h - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + f(x + w - r) + ' ' + f(y + h) +
      'H' + f(x + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + f(y + h - r) +
      'V' + f(y + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + f(x + r) + ' ' + y + 'Z';
  }
  // Move and scale a path made only of absolute M/L/C/Q points
  function place(d, dx, dy, s) {
    var i = 0;
    return d.replace(/-?\d+(\.\d+)?/g, function (num) {
      var v = parseFloat(num), out = (i % 2 === 0) ? dx + v * s : dy + v * s;
      i++;
      return f(out);
    });
  }
  var BG = rrect(0, 0, 300, 300, 0);

  var P = [];

  // ---------------------------------------------------------------- Sunset Hills
  P.push({
    id: 'sunset-hills', title: 'Sunset Hills', difficulty: 1, time: 'About 1 hour',
    blurb: 'Big, simple shapes. A great first painting.',
    palette: [['Sunset orange', '#F6A35E'], ['Soft yellow', '#FCE38A'], ['Dusty pink', '#C8587E'], ['Deep plum', '#4E2F5E']],
    shapes: [
      [1, BG],
      [2, circle(150, 165, 58)],
      [3, 'M0 185C60 150 115 158 165 182S255 168 300 155L300 300L0 300Z'],
      [4, 'M0 238C70 205 150 212 210 238S275 246 300 232L300 300L0 300Z']
    ],
    lines: [['M62 82Q70 74 78 82Q86 74 94 82', 4, 2.4], ['M104 62Q110 56 116 62Q122 56 128 62', 4, 2]],
    steps: [
      'Paint the sun (2) first. Light colors go on before dark ones, because dark paint easily covers light paint but not the other way round.',
      'Paint the sky (1) around the sun. Use your biggest brush and long side-to-side strokes.',
      'Paint the far hill (3). Let it dry for about 10 minutes, then paint the near hill (4).',
      'With your smallest brush and the plum (4), paint the two little birds.',
      'Add a second coat anywhere the paint looks see-through.'
    ]
  });

  // ---------------------------------------------------------------- Happy Cactus
  P.push({
    id: 'happy-cactus', title: 'Happy Cactus', difficulty: 1, time: '1 to 1.5 hours',
    blurb: 'A cute cactus with a smile. Only 5 colors.',
    palette: [['Cream', '#F6E9D4'], ['Cactus green', '#5FA35A'], ['Terracotta', '#C8623F'], ['Pink', '#F28CB1'], ['Black', '#1E1E1F']],
    shapes: [
      [1, BG],
      [2, 'M124 172L101 172Q86 172 86 157L86 126Q86 113 98 113Q110 113 110 126L110 150L124 150Z'],
      [2, 'M176 152L196 152L196 117Q196 104 208 104Q220 104 220 117L220 162Q220 178 204 178L176 178Z'],
      [2, 'M118 232L118 108Q118 70 150 70Q182 70 182 108L182 232Z'],
      [4, circle(150, 53, 9)], [4, circle(162.4, 62, 9)], [4, circle(157.6, 76.5, 9)], [4, circle(142.4, 76.5, 9)], [4, circle(137.6, 62, 9)],
      [1, circle(150, 66, 6)],
      [3, 'M102 230L198 230L186 290L114 290Z'],
      [3, rrect(92, 214, 116, 22, 5)],
      [5, circle(137, 140, 5)], [5, circle(163, 140, 5)],
      [4, circle(127, 153, 6)], [4, circle(173, 153, 6)]
    ],
    lines: [
      ['M141 152Q150 161 159 152', 5, 2.5],
      ['M131 102L124 99', 5, 1.6], ['M170 122L177 119', 5, 1.6], ['M132 196L125 198', 5, 1.6],
      ['M168 206L175 208', 5, 1.6], ['M97 140L91 138', 5, 1.6], ['M209 130L215 128', 5, 1.6]
    ],
    steps: [
      'Paint the cream background (1). Go slowly around the edges of the cactus and pot.',
      'Paint the cactus and both arms green (2).',
      'Paint the pot and its rim terracotta (3).',
      'Paint the flower petals and the cheeks pink (4), then the flower center cream (1).',
      'When everything is dry, use your smallest brush to paint the eyes, smile and little spines black (5).'
    ]
  });

  // ---------------------------------------------------------------- Tulip Trio
  function tulip(x, y, c) {
    return [c, 'M' + (x - 22) + ' ' + (y - 8) + 'Q' + (x - 25) + ' ' + (y - 38) + ' ' + (x - 13) + ' ' + (y - 46) +
      'L' + (x - 6) + ' ' + (y - 28) + 'L' + x + ' ' + (y - 48) + 'L' + (x + 6) + ' ' + (y - 28) + 'L' + (x + 13) + ' ' + (y - 46) +
      'Q' + (x + 25) + ' ' + (y - 38) + ' ' + (x + 22) + ' ' + (y - 8) + 'Q' + x + ' ' + (y + 14) + ' ' + (x - 22) + ' ' + (y - 8) + 'Z'];
  }
  function stem(x, y) { return [6, rrect(x - 3, y, 6, 262 - y, 3)]; }
  function leaves(x) {
    return [
      [6, 'M' + (x - 2) + ' 258Q' + (x - 38) + ' 225 ' + (x - 30) + ' 182Q' + (x - 12) + ' 222 ' + (x - 2) + ' 238Z'],
      [6, 'M' + (x + 2) + ' 258Q' + (x + 38) + ' 228 ' + (x + 28) + ' 192Q' + (x + 12) + ' 228 ' + (x + 2) + ' 242Z']
    ];
  }
  P.push({
    id: 'tulip-trio', title: 'Tulip Trio', difficulty: 1, time: '1.5 to 2 hours',
    blurb: 'Three bright tulips in the grass.',
    palette: [['Sky blue', '#CFE3F2'], ['Red', '#D7262A'], ['Pink', '#F28CB1'], ['Yellow', '#F5C518'], ['Grass green', '#7DBA4A'], ['Leaf green', '#2F7A3B']],
    shapes: [[1, BG], stem(85, 150), stem(150, 118), stem(215, 155),
      [5, 'M0 250Q150 228 300 250L300 300L0 300Z']]
      .concat(leaves(85), leaves(150), leaves(215))
      .concat([tulip(85, 150, 2), tulip(150, 118, 3), tulip(215, 155, 4)]),
    lines: [],
    steps: [
      'Paint the sky (1) first, working around the flowers and leaves.',
      'Paint the tulips: red (2), pink (3) and yellow (4).',
      'Paint the stems and leaves dark green (6).',
      'Paint the grass (5), then touch up any edges with a small brush.'
    ]
  });

  // ---------------------------------------------------------------- Mountain Lake
  function pine(x, base, h) {
    return [5, 'M' + x + ' ' + (base - h) + 'L' + f(x - 0.28 * h) + ' ' + f(base - 0.55 * h) + 'L' + f(x - 0.16 * h) + ' ' + f(base - 0.55 * h) +
      'L' + f(x - 0.36 * h) + ' ' + base + 'L' + f(x + 0.36 * h) + ' ' + base + 'L' + f(x + 0.16 * h) + ' ' + f(base - 0.55 * h) +
      'L' + f(x + 0.28 * h) + ' ' + f(base - 0.55 * h) + 'Z'];
  }
  P.push({
    id: 'mountain-lake', title: 'Mountain Lake', difficulty: 2, time: '2 to 3 hours',
    blurb: 'A snowy mountain, a calm lake and pine trees.',
    palette: [['Sky blue', '#BFE0F0'], ['Snow white', '#F7F7F2'], ['Mountain blue', '#5F7096'], ['Misty blue', '#A3B4CF'],
      ['Pine green', '#2F5D50'], ['Lake blue', '#4F8FB8'], ['Meadow green', '#7FB069']],
    shapes: [
      [1, BG],
      [2, 'M60 62Q58 48 74 47Q80 34 96 38Q106 28 120 38Q138 36 138 52Q150 55 146 66L64 68Q56 68 60 62Z'],
      [4, 'M0 168L50 112L88 148L132 98L184 150L228 114L300 162L300 205L0 205Z'],
      [3, 'M58 205L150 68L242 205Z'],
      [2, 'M150 68L121 111L134 104L145 116L157 103L169 112L179 111Z'],
      [6, rrect(0, 198, 300, 52, 0)],
      [7, 'M0 242Q80 226 160 246T300 238L300 300L0 300Z'],
      pine(34, 262, 80), pine(66, 268, 62), pine(250, 258, 84), pine(280, 266, 60)
    ],
    lines: [['M110 214H150', 2, 2], ['M168 224H210', 2, 2], ['M126 232H160', 2, 2]],
    steps: [
      'Paint the sky (1), then the cloud (2).',
      'Paint the misty far mountains (4), then the big mountain (3). When it is dry, paint the snow cap (2).',
      'Paint the lake (6), then the meadow (7).',
      'Paint the pine trees (5).',
      'Use a tiny brush and the snow white (2) for the shiny lines on the lake.'
    ]
  });

  // ---------------------------------------------------------------- Hot Air Balloons
  var ENV = 'M0 0C65 0 70 80 25 120L10 135L-10 135L-25 120C-70 80 -65 0 0 0Z';
  var LENS_W = 'M0 0C-40 20 -38 95 -10 135L10 135C38 95 40 20 0 0Z';
  var LENS_N = 'M0 0C-15 30 -14 100 -4 135L4 135C14 100 15 30 0 0Z';
  function balloon(cx, top, s, a, b) {
    return {
      shapes: [[a, place(ENV, cx, top, s)], [b, place(LENS_W, cx, top, s)], [a, place(LENS_N, cx, top, s)],
        [8, rrect(f(cx - 12 * s), f(top + 150 * s), f(24 * s), f(18 * s), f(3 * s))]],
      lines: [[place('M-10 135L-10 150', cx, top, s), 8, 1.4], [place('M10 135L10 150', cx, top, s), 8, 1.4]]
    };
  }
  var b1 = balloon(150, 30, 1, 3, 4), b2 = balloon(66, 104, 0.5, 5, 7), b3 = balloon(240, 58, 0.58, 6, 7);
  P.push({
    id: 'hot-air-balloons', title: 'Hot Air Balloons', difficulty: 3, time: '3 to 4 hours',
    blurb: 'Striped balloons over green hills. Lots of colors and careful edges.',
    palette: [['Sky blue', '#A9D6F0'], ['Cloud white', '#F7F7F2'], ['Red', '#D7262A'], ['Sunny yellow', '#F5C518'], ['Teal', '#2A9D8F'],
      ['Orange', '#F28C28'], ['Purple', '#7F4FB5'], ['Basket brown', '#8B5A2B'], ['Hill green', '#7DBA5B'], ['Forest green', '#3E7D4A']],
    shapes: [[1, BG],
      [2, 'M16 66Q14 52 30 52Q36 40 52 44Q62 36 74 46Q90 46 88 60L22 70Q14 70 16 66Z'],
      [2, 'M196 170Q194 158 208 158Q214 147 228 151Q238 143 250 153Q266 153 264 166L202 174Q194 174 196 170Z']]
      .concat(b2.shapes, b3.shapes, b1.shapes,
        [[9, 'M0 228Q80 190 160 222T300 212L300 300L0 300Z'], [10, 'M0 266Q100 236 200 262T300 256L300 300L0 300Z']]),
    lines: [].concat(b1.lines, b2.lines, b3.lines),
    steps: [
      'Paint the sky (1). Take your time around the balloons and ropes.',
      'Paint the clouds (2).',
      'Paint the balloon stripes one color at a time: yellow (4), orange (6), red (3), teal (5), then purple (7). Let each stripe dry before painting the one next to it.',
      'Paint the baskets and ropes brown (8) with your smallest brush.',
      'Paint the light hill (9), then the dark front hill (10).'
    ]
  });

  // ---------------------------------------------------------------- Adventure Time fan art
  var AT = 'Adventure Time fan art';

  P.push({
    id: 'bmo', title: 'BMO', series: AT, outline: true, difficulty: 1, time: '1.5 to 2 hours',
    blurb: 'The little game console friend. Simple shapes, lots of tiny buttons.',
    palette: [['Butter yellow', '#FBE7A1'], ['BMO teal', '#5FB8A6'], ['Screen green', '#CDEFC4'], ['Yellow', '#F5C518'],
      ['Red', '#D7262A'], ['Blue', '#2F55B4'], ['Green', '#3A9B37'], ['Black', '#1E1E1F']],
    shapes: [
      [1, BG],
      [2, rrect(118, 236, 11, 44, 4)], [2, rrect(171, 236, 11, 44, 4)],
      [2, 'M92 160L60 178L65 187L95 171Z'], [2, 'M208 160L240 178L235 187L205 171Z'],
      [2, rrect(88, 58, 124, 182, 14)],
      [3, rrect(104, 76, 92, 76, 9)],
      [8, circle(131, 106, 4.5)], [8, circle(169, 106, 4.5)],
      [8, 'M134 119L166 119Q164 138 150 138Q136 138 134 119Z'],
      [8, rrect(108, 164, 54, 7, 3.5)],
      [4, 'M119 182H131V192H141V204H131V214H119V204H109V192H119Z'],
      [6, circle(170, 186, 6)],
      [7, 'M186 192L200 192L193 180Z'],
      [5, circle(182, 210, 11)],
      [8, rrect(108, 224, 16, 6, 3)], [8, rrect(130, 224, 16, 6, 3)]
    ],
    lines: [],
    steps: [
      'Paint the background (1).',
      "Paint BMO's body, arms and legs teal (2). Two thin coats look smoother than one thick coat.",
      'Paint the screen light green (3).',
      'Paint the buttons: yellow cross (4), red circle (5), blue circle (6) and green triangle (7).',
      'Paint the eyes, mouth, slot and small buttons black (8).',
      'For the cartoon look, go over all the outlines in black (8) with your smallest brush once everything is dry.'
    ]
  });

  P.push({
    id: 'finn', title: 'Finn the Human', series: AT, outline: true, difficulty: 2, time: '2 to 3 hours',
    blurb: 'Finn in his white bear hat and blue shirt.',
    palette: [['Mint green', '#BFE3B4'], ['Hat white', '#F7F7F2'], ['Skin peach', '#FBDCC8'], ['Shirt blue', '#6EC3EA'],
      ['Backpack green', '#4CA84C'], ['Black', '#1E1E1F']],
    shapes: [
      [1, BG],
      [5, rrect(68, 178, 164, 140, 30)],
      [4, 'M82 300L82 232Q82 196 120 192L180 192Q218 196 218 232L218 300Z'],
      [5, 'M100 204L118 198L118 300L100 300Z'], [5, 'M182 198L200 204L200 300L182 300Z'],
      [3, rrect(138, 168, 24, 30, 4)],
      [2, circle(110, 64, 15)], [2, circle(190, 64, 15)],
      [2, 'M94 194L94 112Q94 56 150 56Q206 56 206 112L206 194Q192 204 178 194L178 172L122 172L122 194Q108 204 94 194Z'],
      [3, 'M114 106Q114 92 128 92L172 92Q186 92 186 106L186 148Q186 172 150 172Q114 172 114 148Z'],
      [6, circle(135, 122, 5)], [6, circle(165, 122, 5)],
      [6, 'M128 138Q150 168 172 138Q150 146 128 138Z']
    ],
    lines: [],
    steps: [
      'Paint the background (1).',
      'Paint the hat and bear ears white (2). White usually needs two or three coats to cover well.',
      'Paint the face and neck peach (3).',
      'Paint the shirt blue (4), then the backpack and straps green (5).',
      'Paint the eyes and mouth black (6).',
      'For the cartoon look, outline everything in black (6) with your smallest brush once it is dry.'
    ]
  });

  P.push({
    id: 'jake', title: 'Jake the Dog', series: AT, outline: true, difficulty: 2, time: '2 to 3 hours',
    blurb: 'Jake with his big eyes and droopy ears.',
    palette: [['Sky blue', '#BFDDF2'], ['Jake yellow', '#F2B124'], ['Ear orange', '#D98A1C'], ['Muzzle light', '#F8D27A'],
      ['Black', '#1E1E1F'], ['White', '#FFFFFF']],
    shapes: [
      [1, BG],
      [2, 'M82 300Q78 222 150 214Q222 222 218 300Z'],
      [2, ellipse(150, 138, 80, 70)],
      [3, 'M86 104Q52 112 58 176Q76 182 92 150Z'], [3, 'M214 104Q248 112 242 176Q224 182 208 150Z'],
      [4, 'M104 168Q104 142 134 146Q150 152 166 146Q196 142 196 168Q196 198 150 198Q104 198 104 168Z'],
      [6, circle(120, 116, 16)], [6, circle(180, 116, 16)],
      [5, circle(123, 119, 8)], [5, circle(177, 119, 8)],
      [6, circle(126, 115, 2.6)], [6, circle(180, 115, 2.6)],
      [5, ellipse(150, 152, 14, 9)]
    ],
    lines: [['M136 182Q150 190 164 182', 5, 2.5], ['M106 94Q120 88 134 94', 5, 2.5], ['M166 94Q180 88 194 94', 5, 2.5]],
    steps: [
      'Paint the background (1).',
      "Paint Jake's head and body yellow (2), then his ears orange (3).",
      'Paint the muzzle light yellow (4). You can make it by mixing the Jake yellow (2) with some white.',
      'Paint the eye whites (6). When dry, paint the pupils and nose black (5).',
      'Add the tiny white shine dots (6) in the eyes last. They make him look alive.',
      'Paint the mouth and eyebrows black (5), and outline everything for the cartoon look.'
    ]
  });

  P.push({
    id: 'princess-bubblegum', title: 'Princess Bubblegum', series: AT, outline: true, difficulty: 3, time: '3 to 4 hours',
    blurb: 'PB with her bubblegum hair and golden crown. Lots of pinks to mix.',
    palette: [['Mint', '#CFEFE3'], ['Bubblegum pink', '#E85C9E'], ['Plum dress', '#9B5AB8'], ['Skin pink', '#F9C0D2'],
      ['Gold', '#F5C518'], ['Blue gem', '#2F7FD6'], ['Black', '#1E1E1F'], ['Blush pink', '#F28CB1']],
    shapes: [
      [1, BG],
      [2, 'M78 300L84 140Q90 54 150 50Q210 54 216 140L222 300Z'],
      [3, 'M96 300L96 246Q102 214 150 212Q198 214 204 246L204 300Z'],
      [4, rrect(136, 176, 28, 44, 6)],
      [5, 'M118 214Q150 240 182 214L190 219Q150 254 110 219Z'],
      [4, ellipse(150, 138, 50, 54)],
      [2, 'M100 136Q98 78 150 76Q202 78 200 136Q188 108 166 102Q160 118 150 120Q140 118 134 102Q112 108 100 136Z'],
      [5, 'M124 82L124 56L137 69L150 47L163 69L176 56L176 82Z'],
      [6, circle(150, 71, 5)],
      [7, ellipse(132, 146, 4, 5.5)], [7, ellipse(168, 146, 4, 5.5)],
      [8, circle(121, 162, 7)], [8, circle(179, 162, 7)]
    ],
    lines: [['M140 168Q150 176 160 168', 7, 2.5]],
    steps: [
      'Paint the background (1).',
      'Paint all the hair bubblegum pink (2): the long hair at the back and the bangs.',
      'Paint the face and neck skin pink (4), then the dress plum (3).',
      'Paint the crown and dress trim gold (5), then the gem blue (6).',
      'Dab on the blush pink (8) cheeks.',
      'Paint the eyes and smile black (7), then outline everything for the cartoon look.',
      'Tip: skin, blush and hair are all pinks. Mix each one in its own spot on your plate so they don’t get mixed up.'
    ]
  });

  P.push({
    id: 'marceline', title: 'Marceline the Vampire Queen', series: AT, outline: true, difficulty: 3, time: '3 to 4 hours',
    blurb: 'Marceline under the moon with her long black hair.',
    palette: [['Night purple', '#4B3A72'], ['Moon yellow', '#F6E9B0'], ['Black', '#1E1E1F'], ['Dark gray top', '#4A4F5A'],
      ['Blue-gray skin', '#A9B6C6'], ['Red', '#C0392B'], ['White', '#FFFFFF']],
    shapes: [
      [1, BG],
      [2, circle(222, 72, 42)],
      [3, 'M68 300L76 150Q84 48 150 46Q216 48 224 150L236 300Z'],
      [5, 'M90 300L90 246Q96 218 150 216Q204 218 210 246L210 300Z'],
      [4, 'M108 300L108 250Q150 266 192 250L192 300Z'],
      [4, rrect(110, 220, 11, 34, 3)], [4, rrect(179, 220, 11, 34, 3)],
      [5, rrect(137, 172, 26, 50, 6)],
      [6, circle(143, 202, 2.6)], [6, circle(155, 202, 2.6)],
      [5, 'M106 128L80 108L108 152Z'], [5, 'M194 128L220 108L192 152Z'],
      [5, 'M104 120Q104 84 150 84Q196 84 196 120L196 150Q196 190 150 192Q104 190 104 150Z'],
      [3, 'M98 142Q93 68 150 64Q207 68 202 142Q192 100 172 92Q150 112 118 100Q106 116 98 142Z'],
      [3, ellipse(132, 140, 4, 6)], [3, ellipse(168, 140, 4, 6)],
      [7, 'M155 167L161 166L158 174Z']
    ],
    lines: [['M138 164Q151 172 166 161', 3, 2.5]],
    steps: [
      'Paint the night sky (1), working around the moon and hair.',
      'Paint the moon (2). It may need two coats over a dark background.',
      'Paint her skin blue-gray (5): face, ears, neck and shoulders.',
      'Paint the top and straps dark gray (4).',
      'Paint the hair and eyes black (3). Dark colors go last because they cover everything.',
      'Add the two tiny red bite marks (6) on her neck and the white fang (7).',
      'Paint the smile line and outline everything in black (3) for the cartoon look.'
    ]
  });

  global.PAINT_PROJECTS = P;
})(this);
