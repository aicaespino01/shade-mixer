/*
 * Paint mixing engine.
 *
 * Paints are simulated with spectral reflectance curves and mixed with
 * single-constant Kubelka-Munk theory (the physics of how pigments absorb
 * and scatter light). That is why blue + yellow makes green here, just like
 * real paint, instead of grey like on a computer screen.
 *
 *  - Each tube colour (hex) is turned into a smooth reflectance curve
 *    (sigmoid-polynomial spectrum, fitted to the colour).
 *  - Mixing averages K/S (absorption / scattering) per wavelength,
 *    weighted by parts x tinting strength.
 *  - The resulting curve is converted back to a screen colour.
 */
(function (global) {
  'use strict';

  // ---------- Spectral setup ----------
  var WL = [];
  for (var l = 400; l <= 700; l += 10) WL.push(l);
  var N = WL.length;

  // Analytic CIE 1931 colour matching functions (Wyman, Sloan & Shirley 2013)
  function g(x, mu, s1, s2) {
    var t = (x - mu) / (x < mu ? s1 : s2);
    return Math.exp(-0.5 * t * t);
  }
  function cmf(lam) {
    return [
      1.056 * g(lam, 599.8, 37.9, 31.0) + 0.362 * g(lam, 442.0, 16.0, 26.7) - 0.065 * g(lam, 501.1, 20.4, 26.2),
      0.821 * g(lam, 568.8, 46.9, 40.5) + 0.286 * g(lam, 530.9, 16.3, 31.1),
      1.217 * g(lam, 437.0, 11.8, 36.0) + 0.681 * g(lam, 459.0, 26.0, 13.8)
    ];
  }
  // Daylight approximated by a 6504K black body
  function planck(lamNm, T) {
    var lam = lamNm * 1e-9;
    return 1 / (Math.pow(lam, 5) * (Math.exp(1.4388e-2 / (lam * T)) - 1));
  }

  var WX = new Float64Array(N), WY = new Float64Array(N), WZ = new Float64Array(N);
  (function () {
    var sx = 0, sy = 0, sz = 0, i, c, e;
    for (i = 0; i < N; i++) {
      c = cmf(WL[i]); e = planck(WL[i], 6504);
      WX[i] = c[0] * e; WY[i] = c[1] * e; WZ[i] = c[2] * e;
      sx += WX[i]; sy += WY[i]; sz += WZ[i];
    }
    // normalise so a perfect white reflector = D65 white exactly
    for (i = 0; i < N; i++) { WX[i] *= 0.95047 / sx; WY[i] *= 1 / sy; WZ[i] *= 1.08883 / sz; }
  })();

  // ---------- Colour conversions ----------
  function hexToRgb(hex) {
    hex = String(hex).replace('#', '').trim();
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(rgb) {
    return '#' + rgb.map(function (v) {
      v = Math.max(0, Math.min(255, Math.round(v)));
      return (v < 16 ? '0' : '') + v.toString(16);
    }).join('').toUpperCase();
  }
  function toLinear(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function fromLinear(c) { c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055; return c * 255; }

  function rgbToXyz(rgb) {
    var r = toLinear(rgb[0]), gg = toLinear(rgb[1]), b = toLinear(rgb[2]);
    return [
      0.4124564 * r + 0.3575761 * gg + 0.1804375 * b,
      0.2126729 * r + 0.7151522 * gg + 0.0721750 * b,
      0.0193339 * r + 0.1191920 * gg + 0.9503041 * b
    ];
  }
  function xyzToRgb(x) {
    return [
      fromLinear(3.2404542 * x[0] - 1.5371385 * x[1] - 0.4985314 * x[2]),
      fromLinear(-0.9692660 * x[0] + 1.8760108 * x[1] + 0.0415560 * x[2]),
      fromLinear(0.0556434 * x[0] - 0.2040259 * x[1] + 1.0572252 * x[2])
    ];
  }
  function fLab(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
  function xyzToLab(x) {
    var fx = fLab(x[0] / 0.95047), fy = fLab(x[1]), fz = fLab(x[2] / 1.08883);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  function hexToLab(hex) { return xyzToLab(rgbToXyz(hexToRgb(hex))); }

  function dE76(a, b) {
    var d0 = a[0] - b[0], d1 = a[1] - b[1], d2 = a[2] - b[2];
    return Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2);
  }
  function dE2000(l1, l2) {
    var rad = Math.PI / 180, deg = 180 / Math.PI;
    var L1 = l1[0], a1 = l1[1], b1 = l1[2], L2 = l2[0], a2 = l2[1], b2 = l2[2];
    var C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
    var G = 0.5 * (1 - Math.sqrt(Math.pow(Cm, 7) / (Math.pow(Cm, 7) + Math.pow(25, 7))));
    var a1p = a1 * (1 + G), a2p = a2 * (1 + G);
    var C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
    var h1p = (Math.atan2(b1, a1p) * deg + 360) % 360, h2p = (Math.atan2(b2, a2p) * deg + 360) % 360;
    var dLp = L2 - L1, dCp = C2p - C1p, dhp;
    if (C1p * C2p === 0) dhp = 0;
    else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
    else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
    else dhp = h2p - h1p + 360;
    var dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp / 2 * rad);
    var Lpm = (L1 + L2) / 2, Cpm = (C1p + C2p) / 2, hpm;
    if (C1p * C2p === 0) hpm = h1p + h2p;
    else if (Math.abs(h1p - h2p) <= 180) hpm = (h1p + h2p) / 2;
    else if (h1p + h2p < 360) hpm = (h1p + h2p + 360) / 2;
    else hpm = (h1p + h2p - 360) / 2;
    var T = 1 - 0.17 * Math.cos((hpm - 30) * rad) + 0.24 * Math.cos(2 * hpm * rad) +
      0.32 * Math.cos((3 * hpm + 6) * rad) - 0.20 * Math.cos((4 * hpm - 63) * rad);
    var dTheta = 30 * Math.exp(-Math.pow((hpm - 275) / 25, 2));
    var RC = 2 * Math.sqrt(Math.pow(Cpm, 7) / (Math.pow(Cpm, 7) + Math.pow(25, 7)));
    var SL = 1 + 0.015 * Math.pow(Lpm - 50, 2) / Math.sqrt(20 + Math.pow(Lpm - 50, 2));
    var SC = 1 + 0.045 * Cpm, SH = 1 + 0.015 * Cpm * T;
    var RT = -Math.sin(2 * dTheta * rad) * RC;
    var x = dLp / SL, y = dCp / SC, z = dHp / SH;
    return Math.sqrt(x * x + y * y + z * z + RT * y * z);
  }

  // ---------- Spectra ----------
  function sig(x) { return 0.5 + x / (2 * Math.sqrt(1 + x * x)); }
  function spectrumFromCoeffs(c, out) {
    out = out || new Float64Array(N);
    for (var i = 0; i < N; i++) {
      var t = (WL[i] - 550) / 150;
      out[i] = sig(c[0] * t * t + c[1] * t + c[2]);
    }
    return out;
  }
  function spectrumToXyz(R) {
    var x = 0, y = 0, z = 0;
    for (var i = 0; i < N; i++) { x += R[i] * WX[i]; y += R[i] * WY[i]; z += R[i] * WZ[i]; }
    return [x, y, z];
  }

  // Levenberg-Marquardt fit of a smooth reflectance curve to a target colour
  function fitSpectrum(hex) {
    var target = hexToLab(hex);
    var tmp = new Float64Array(N);
    function resid(c) {
      var lab = xyzToLab(spectrumToXyz(spectrumFromCoeffs(c, tmp)));
      return [lab[0] - target[0], lab[1] - target[1], lab[2] - target[2]];
    }
    function cost(r) { return r[0] * r[0] + r[1] * r[1] + r[2] * r[2]; }
    var best = null, bestCost = Infinity;
    var starts = [[0, 0, 0], [0, 0, 3], [0, 0, -3], [-10, 0, 2], [10, 0, -2], [0, 8, 0], [0, -8, 0]];
    for (var s = 0; s < starts.length; s++) {
      var c = starts[s].slice(), r = resid(c), f = cost(r), lambda = 1e-2;
      for (var it = 0; it < 300 && f > 1e-6; it++) {
        // numeric Jacobian
        var J = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], h = 1e-4;
        for (var j = 0; j < 3; j++) {
          var cp = c.slice(); cp[j] += h;
          var rp = resid(cp);
          for (var k = 0; k < 3; k++) J[k][j] = (rp[k] - r[k]) / h;
        }
        // (J^T J + lambda I) d = -J^T r
        var A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], bvec = [0, 0, 0];
        for (var p = 0; p < 3; p++) {
          for (var q = 0; q < 3; q++) {
            var sum = 0;
            for (k = 0; k < 3; k++) sum += J[k][p] * J[k][q];
            A[p][q] = sum;
          }
          var sb = 0;
          for (k = 0; k < 3; k++) sb += J[k][p] * r[k];
          bvec[p] = -sb;
        }
        for (p = 0; p < 3; p++) A[p][p] += lambda * (A[p][p] + 1e-9);
        var d = solve3(A, bvec);
        if (!d) break;
        var cn = [c[0] + d[0], c[1] + d[1], c[2] + d[2]];
        var rn = resid(cn), fn = cost(rn);
        if (fn < f) { c = cn; r = rn; f = fn; lambda = Math.max(lambda / 3, 1e-7); }
        else { lambda *= 4; if (lambda > 1e8) break; }
      }
      if (f < bestCost) { bestCost = f; best = c; }
      if (bestCost < 1e-4) break;
    }
    return spectrumFromCoeffs(best, new Float64Array(N));
  }
  function solve3(A, b) {
    var m = [A[0].concat([b[0]]), A[1].concat([b[1]]), A[2].concat([b[2]])];
    for (var i = 0; i < 3; i++) {
      var piv = i;
      for (var r = i + 1; r < 3; r++) if (Math.abs(m[r][i]) > Math.abs(m[piv][i])) piv = r;
      if (Math.abs(m[piv][i]) < 1e-14) return null;
      var t = m[i]; m[i] = m[piv]; m[piv] = t;
      for (r = 0; r < 3; r++) {
        if (r === i) continue;
        var f = m[r][i] / m[i][i];
        for (var c = i; c < 4; c++) m[r][c] -= f * m[i][c];
      }
    }
    return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
  }

  // ---------- Paints ----------
  function makePaint(def) {
    var R = fitSpectrum(def.hex);
    var KS = new Float64Array(N);
    for (var i = 0; i < N; i++) {
      var r = Math.min(Math.max(R[i], 1e-4), 1 - 1e-4);
      KS[i] = (1 - r) * (1 - r) / (2 * r);
    }
    var xyz = spectrumToXyz(R);
    return {
      id: def.id, name: def.name, hex: def.hex, strength: def.strength || 1,
      note: def.note || '', KS: KS, lab: xyzToLab(xyz), displayHex: rgbToHex(xyzToRgb(xyz))
    };
  }

  // parts: array of {paint, parts}; returns {xyz, lab, hex}
  var bufKS = new Float64Array(N);
  function mixToXyz(paints, weights) {
    var total = 0, i, j;
    for (i = 0; i < N; i++) bufKS[i] = 0;
    for (j = 0; j < paints.length; j++) {
      var w = weights[j] * paints[j].strength;
      if (w <= 0) continue;
      total += w;
      var ks = paints[j].KS;
      for (i = 0; i < N; i++) bufKS[i] += w * ks[i];
    }
    if (total <= 0) return [0.95047, 1, 1.08883];
    var x = 0, y = 0, z = 0;
    for (i = 0; i < N; i++) {
      var k = bufKS[i] / total;
      var R = 1 + k - Math.sqrt(k * k + 2 * k);
      x += R * WX[i]; y += R * WY[i]; z += R * WZ[i];
    }
    return [x, y, z];
  }
  function mix(paints, weights) {
    var xyz = mixToXyz(paints, weights);
    return { lab: xyzToLab(xyz), hex: rgbToHex(xyzToRgb(xyz)) };
  }

  // ---------- Recipe solver ----------
  function combos(n, k, start, prefix, out) {
    if (prefix.length === k) { out.push(prefix.slice()); return out; }
    for (var i = start; i < n; i++) { prefix.push(i); combos(n, k, i + 1, prefix, out); prefix.pop(); }
    return out;
  }
  // all ways to write total as k positive integers
  function compositions(total, k) {
    var out = [];
    (function rec(left, slots, cur) {
      if (slots === 1) { out.push(cur.concat([left])); return; }
      for (var v = 1; v <= left - slots + 1; v++) rec(left - v, slots - 1, cur.concat([v]));
    })(total, k, []);
    return out;
  }
  var COMP = {};
  function comps(total, k) { var key = total + ':' + k; return COMP[key] || (COMP[key] = compositions(total, k)); }

  function gcd(a, b) { while (b) { var t = b; b = a % b; a = t; } return a; }

  /**
   * Find recipes for a target hex using the given paints.
   * Returns up to 3 recipes: [{items:[{paint, parts}], hex, dE, total}]
   */
  function solve(targetHex, paints, opts) {
    opts = opts || {};
    var maxPaints = Math.min(opts.maxPaints || 4, paints.length);
    var target = hexToLab(targetHex);
    var cands = [];

    // Stage 1: coarse search over every paint combination
    for (var k = 1; k <= maxPaints; k++) {
      var sets = combos(paints.length, k, 0, [], []);
      var coarse = k === 1 ? 1 : (k === 4 ? 12 : 16);
      var cs = comps(coarse, k);
      for (var s = 0; s < sets.length; s++) {
        var ps = sets[s].map(function (i) { return paints[i]; });
        var bestE = Infinity, bestW = null;
        for (var c = 0; c < cs.length; c++) {
          var e = dE76(xyzToLab(mixToXyz(ps, cs[c])), target);
          if (e < bestE) { bestE = e; bestW = cs[c]; }
        }
        cands.push({ paints: ps, w: bestW.slice(), e: bestE });
      }
    }
    cands.sort(function (a, b) { return a.e - b.e; });
    var top = cands.slice(0, 30);

    // Stage 2: refine weights continuously, then round to nice whole parts
    var results = [];
    top.forEach(function (cand) {
      var ps = cand.paints, w = cand.w.map(Number);
      function err(wv) { return dE2000(xyzToLab(mixToXyz(ps, wv)), target); }
      var cur = err(w);
      for (var step = 2.0; step > 1.005; step = Math.sqrt(step)) {
        var improved = true, guard = 0;
        while (improved && guard++ < 40) {
          improved = false;
          for (var i = 0; i < w.length; i++) {
            [step, 1 / step].forEach(function (f) {
              var t = w.slice(); t[i] *= f;
              var e2 = err(t);
              if (e2 < cur - 1e-6) { w = t; cur = e2; improved = true; }
            });
          }
        }
      }
      // normalise
      var sum = w.reduce(function (a, b) { return a + b; }, 0);
      w = w.map(function (v) { return v / sum; });
      // drop paints contributing almost nothing
      var keep = [];
      w.forEach(function (v, i) { if (v >= 1 / 500) keep.push(i); });
      var kps = keep.map(function (i) { return ps[i]; });
      var kw = keep.map(function (i) { return w[i]; });
      var minW = Math.min.apply(null, kw);
      // Try whole-number part totals; prefer small, easy numbers
      for (var T = kps.length; T <= 300; T += (T < 40 ? 1 : (T < 100 ? 4 : 10))) {
        var parts = kw.map(function (v) { return Math.max(1, Math.round(v * T)); });
        var g0 = parts.reduce(gcd);
        parts = parts.map(function (v) { return v / g0; });
        var tot = parts.reduce(function (a, b) { return a + b; }, 0);
        var m = mix(kps, parts);
        var de = dE2000(m.lab, target);
        results.push({
          items: kps.map(function (p, i) { return { paint: p, parts: parts[i] }; }),
          hex: m.hex, dE: de, total: tot,
          score: de + 0.3 * Math.log2(tot) + 0.05 * Math.max(0, tot - 24) + 0.3 * kps.length,
          key: kps.map(function (p) { return p.id; }).join('+')
        });
        if (minW * T > 30) break;
      }
    });

    results.sort(function (a, b) { return a.score - b.score; });
    var bestDE = Math.min.apply(null, results.map(function (r) { return r.dE; }));
    var out = [];
    var seen = {};
    // 1) best balanced recipe
    if (results.length) { out.push(results[0]); seen[sig2(results[0])] = 1; }
    // 2) most accurate (if noticeably better)
    var acc = results.filter(function (r) { return r.dE <= bestDE + 0.3; }).sort(function (a, b) { return a.total - b.total || a.dE - b.dE; })[0];
    if (acc && !seen[sig2(acc)] && acc.dE < out[0].dE - 0.8 && acc.total <= 120) { out.push(acc); seen[sig2(acc)] = 1; acc.tag = 'Most accurate'; }
    // 3) simplest (fewest paints / parts) that is still good
    var simple = results.filter(function (r) { return r.dE <= Math.max(bestDE + 3, 4); })
      .sort(function (a, b) { return a.items.length - b.items.length || a.total - b.total || a.dE - b.dE; })[0];
    if (simple && !seen[sig2(simple)]) { simple.tag = 'Easiest'; out.push(simple); seen[sig2(simple)] = 1; }
    // 4) alternative paint set
    var alt = results.filter(function (r) { return r.key !== out[0].key && !seen[sig2(r)]; })[0];
    if (alt && out.length < 3 && alt.dE < out[0].dE + 4) { alt.tag = 'Alternative'; out.push(alt); }
    if (out[0]) out[0].tag = 'Best recipe';
    return out.slice(0, 3);
  }
  function sig2(r) { return r.items.map(function (i) { return i.paint.id + ':' + i.parts; }).join(','); }

  function matchLabel(dE) {
    if (dE < 1.5) return { text: 'Perfect match', pct: 100 - Math.round(dE), level: 5 };
    if (dE < 3) return { text: 'Excellent match', pct: 99 - Math.round(dE * 1.5), level: 4 };
    if (dE < 6) return { text: 'Very close', pct: 96 - Math.round(dE * 1.5), level: 3 };
    if (dE < 10) return { text: 'Close', pct: 92 - Math.round(dE * 1.5), level: 2 };
    return { text: 'Nearest possible with these paints', pct: Math.max(40, 85 - Math.round(dE * 1.5)), level: 1 };
  }

  var api = {
    makePaint: makePaint, mix: mix, solve: solve, hexToLab: hexToLab, hexToRgb: hexToRgb,
    rgbToHex: rgbToHex, dE2000: dE2000, dE76: dE76, matchLabel: matchLabel
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.PaintMix = api;
})(this);
