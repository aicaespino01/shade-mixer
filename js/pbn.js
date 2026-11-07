/*
 * Paint-by-number generator: turns any picture into numbered paint areas, like a store-bought kit.
 *  1. shrink + soften the picture
 *  2. find the N main colors (k-means in Lab color space)
 *  3. give every pixel its nearest color, smooth the edges
 *  4. merge areas that are too small to paint into their neighbors
 *  5. find a good spot for each number (the point deepest inside each area)
 */
(function (global) {
  'use strict';

  var LIN = new Float64Array(256);
  for (var i = 0; i < 256; i++) { var c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function fl(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
  function rgbToLab(r, g, b) {
    var R = LIN[r], G = LIN[g], B = LIN[b];
    var x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
    var y = 0.2126729 * R + 0.7151522 * G + 0.0721750 * B;
    var z = (0.0193339 * R + 0.1191920 * G + 0.9503041 * B) / 1.08883;
    var fx = fl(x), fy = fl(y), fz = fl(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  // Box blur (radius r) on an RGB(A) buffer, in place on a copy
  function blur(rgb, w, h, r) {
    if (!r) return rgb;
    var tmp = new Float32Array(w * h * 3), out = new Uint8ClampedArray(w * h * 3), x, y, k, c, acc, n;
    for (y = 0; y < h; y++) for (c = 0; c < 3; c++) {
      acc = 0; n = 0;
      for (k = -r; k <= r; k++) { var xx = Math.min(w - 1, Math.max(0, k)); acc += rgb[(y * w + xx) * 3 + c]; n++; }
      for (x = 0; x < w; x++) {
        tmp[(y * w + x) * 3 + c] = acc / n;
        var xo = Math.max(0, x - r), xi = Math.min(w - 1, x + r + 1);
        acc += rgb[(y * w + xi) * 3 + c] - rgb[(y * w + xo) * 3 + c];
      }
    }
    for (x = 0; x < w; x++) for (c = 0; c < 3; c++) {
      acc = 0; n = 0;
      for (k = -r; k <= r; k++) { var yy = Math.min(h - 1, Math.max(0, k)); acc += tmp[(yy * w + x) * 3 + c]; n++; }
      for (y = 0; y < h; y++) {
        out[(y * w + x) * 3 + c] = acc / n;
        var yo = Math.max(0, y - r), yi = Math.min(h - 1, y + r + 1);
        acc += tmp[(yi * w + x) * 3 + c] - tmp[(yo * w + x) * 3 + c];
      }
    }
    return out;
  }

  // Simple seeded random so the same picture always gives the same result
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

  function kmeans(lab, n, k) {
    var rand = rng(12345), S = Math.min(n, 30000), idx = new Int32Array(S), i, j, t;
    for (i = 0; i < S; i++) idx[i] = S === n ? i : Math.floor(rand() * n);
    var cent = [], d2 = new Float64Array(S);
    var first = idx[Math.floor(rand() * S)];
    cent.push([lab[first * 3], lab[first * 3 + 1], lab[first * 3 + 2]]);
    for (i = 0; i < S; i++) d2[i] = Infinity;
    while (cent.length < k) {
      var last = cent[cent.length - 1], sum = 0;
      for (i = 0; i < S; i++) {
        var p = idx[i] * 3, dl = lab[p] - last[0], da = lab[p + 1] - last[1], db = lab[p + 2] - last[2];
        var dd = dl * dl + da * da + db * db;
        if (dd < d2[i]) d2[i] = dd;
        sum += d2[i];
      }
      if (sum === 0) break;
      var target = rand() * sum, pick = 0;
      for (i = 0; i < S; i++) { target -= d2[i]; if (target <= 0) { pick = i; break; } }
      var q = idx[pick] * 3;
      cent.push([lab[q], lab[q + 1], lab[q + 2]]);
    }
    k = cent.length;
    var assign = new Int32Array(S);
    for (var it = 0; it < 16; it++) {
      var acc = [], cnt = new Int32Array(k), moved = 0;
      for (j = 0; j < k; j++) acc.push([0, 0, 0]);
      for (i = 0; i < S; i++) {
        var pp = idx[i] * 3, best = 0, bd = Infinity;
        for (j = 0; j < k; j++) {
          var e0 = lab[pp] - cent[j][0], e1 = lab[pp + 1] - cent[j][1], e2 = lab[pp + 2] - cent[j][2];
          t = e0 * e0 + e1 * e1 + e2 * e2;
          if (t < bd) { bd = t; best = j; }
        }
        if (assign[i] !== best) { moved++; assign[i] = best; }
        acc[best][0] += lab[pp]; acc[best][1] += lab[pp + 1]; acc[best][2] += lab[pp + 2]; cnt[best]++;
      }
      for (j = 0; j < k; j++) {
        if (cnt[j]) cent[j] = [acc[j][0] / cnt[j], acc[j][1] / cnt[j], acc[j][2] / cnt[j]];
      }
      if (it > 2 && moved < S * 0.002) break;
    }
    return cent;
  }

  function assignAll(lab, n, cent) {
    var labels = new Uint8Array(n), k = cent.length;
    for (var i = 0; i < n; i++) {
      var p = i * 3, best = 0, bd = Infinity;
      for (var j = 0; j < k; j++) {
        var e0 = lab[p] - cent[j][0], e1 = lab[p + 1] - cent[j][1], e2 = lab[p + 2] - cent[j][2];
        var t = e0 * e0 + e1 * e1 + e2 * e2;
        if (t < bd) { bd = t; best = j; }
      }
      labels[i] = best;
    }
    return labels;
  }

  // Majority filter: each pixel takes the most common label around it (smooths jagged edges)
  function majority(labels, w, h, k, r) {
    var out = new Uint8Array(labels.length), cnt = new Int32Array(k);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var best = labels[y * w + x], bc = 0, dx, dy;
        for (dy = -r; dy <= r; dy++) {
          var yy = y + dy; if (yy < 0 || yy >= h) continue;
          for (dx = -r; dx <= r; dx++) {
            var xx = x + dx; if (xx < 0 || xx >= w) continue;
            cnt[labels[yy * w + xx]]++;
          }
        }
        for (dy = -r; dy <= r; dy++) {
          var y2 = y + dy; if (y2 < 0 || y2 >= h) continue;
          for (dx = -r; dx <= r; dx++) {
            var x2 = x + dx; if (x2 < 0 || x2 >= w) continue;
            var l = labels[y2 * w + x2];
            if (cnt[l] > bc || (cnt[l] === bc && l === labels[y * w + x])) { bc = cnt[l]; best = l; }
            cnt[l] = 0;
          }
        }
        out[y * w + x] = best;
      }
    }
    return out;
  }

  // Connected areas of the same label
  function components(labels, w, h) {
    var n = w * h, comp = new Int32Array(n).fill(-1), queue = new Int32Array(n), list = [];
    for (var s = 0; s < n; s++) {
      if (comp[s] !== -1) continue;
      var id = list.length, lab = labels[s], qh = 0, qt = 0;
      queue[qt++] = s; comp[s] = id;
      while (qh < qt) {
        var q = queue[qh++], x = q % w;
        if (x > 0 && comp[q - 1] === -1 && labels[q - 1] === lab) { comp[q - 1] = id; queue[qt++] = q - 1; }
        if (x < w - 1 && comp[q + 1] === -1 && labels[q + 1] === lab) { comp[q + 1] = id; queue[qt++] = q + 1; }
        if (q >= w && comp[q - w] === -1 && labels[q - w] === lab) { comp[q - w] = id; queue[qt++] = q - w; }
        if (q < n - w && comp[q + w] === -1 && labels[q + w] === lab) { comp[q + w] = id; queue[qt++] = q + w; }
      }
      list.push({ label: lab, size: qt, first: s });
    }
    return { comp: comp, list: list };
  }

  // Merge areas smaller than minArea into the neighbor they share the longest edge with
  function mergeSmall(labels, w, h, minArea, centLab) {
    for (var pass = 0; pass < 8; pass++) {
      var cc = components(labels, w, h), comp = cc.comp, list = cc.list, n = w * h;
      var small = list.map(function (c) { return c.size < minArea; });
      if (small.indexOf(true) === -1) break;
      var border = {};
      for (var i = 0; i < n; i++) {
        var a = comp[i]; if (!small[a]) continue;
        var x = i % w, nb = [];
        if (x > 0) nb.push(i - 1); if (x < w - 1) nb.push(i + 1); if (i >= w) nb.push(i - w); if (i < n - w) nb.push(i + w);
        for (var j = 0; j < nb.length; j++) {
          var b = comp[nb[j]]; if (b === a) continue;
          var m = border[a] || (border[a] = {});
          var lb = labels[nb[j]];
          // prefer bigger neighbors: weight by whether neighbor itself is big
          m[lb] = (m[lb] || 0) + (small[b] ? 0.25 : 1);
        }
      }
      var newLabel = list.map(function (c, id) {
        if (!small[id] || !border[id]) return c.label;
        var m = border[id], best = c.label, bv = -1;
        Object.keys(m).forEach(function (lb) {
          var v = m[lb];
          if (centLab) { // tie-break by color closeness
            var A = centLab[c.label], B = centLab[lb];
            v -= Math.sqrt(Math.pow(A[0] - B[0], 2) + Math.pow(A[1] - B[1], 2) + Math.pow(A[2] - B[2], 2)) * 0.001;
          }
          if (v > bv) { bv = v; best = +lb; }
        });
        return best;
      });
      for (i = 0; i < n; i++) labels[i] = newLabel[comp[i]];
    }
    return labels;
  }

  // Number positions: point deepest inside each area (chamfer distance transform)
  function numberSpots(labels, w, h) {
    var n = w * h, dist = new Float32Array(n), i, x, y;
    for (i = 0; i < n; i++) {
      x = i % w; y = (i / w) | 0;
      var edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
        labels[i - 1] !== labels[i] || labels[i + 1] !== labels[i] || labels[i - w] !== labels[i] || labels[i + w] !== labels[i];
      dist[i] = edge ? 1 : 1e6;
    }
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
      i = y * w + x; if (dist[i] === 1) continue;
      dist[i] = Math.min(dist[i], dist[i - 1] + 1, dist[i - w] + 1, dist[i - w - 1] + 1.414, dist[i - w + 1] + 1.414);
    }
    for (y = h - 2; y > 0; y--) for (x = w - 2; x > 0; x--) {
      i = y * w + x; if (dist[i] === 1) continue;
      dist[i] = Math.min(dist[i], dist[i + 1] + 1, dist[i + w] + 1, dist[i + w + 1] + 1.414, dist[i + w - 1] + 1.414);
    }
    var cc = components(labels, w, h), spots = cc.list.map(function (c) { return { label: c.label, size: c.size, x: 0, y: 0, d: 0 }; });
    for (i = 0; i < n; i++) {
      var s = spots[cc.comp[i]];
      if (dist[i] > s.d) { s.d = dist[i]; s.x = i % w; s.y = (i / w) | 0; }
    }
    return spots;
  }

  /**
   * rgba: Uint8ClampedArray from getImageData at working size.
   * opts: { colors, minArea, blur, smooth }
   * returns { w, h, labels, palette: [[r,g,b]] }
   */
  function process(rgba, w, h, opts) {
    var n = w * h, rgb = new Uint8ClampedArray(n * 3), i;
    for (i = 0; i < n; i++) {
      // flatten transparency onto white
      var a = rgba[i * 4 + 3] / 255;
      rgb[i * 3] = rgba[i * 4] * a + 255 * (1 - a);
      rgb[i * 3 + 1] = rgba[i * 4 + 1] * a + 255 * (1 - a);
      rgb[i * 3 + 2] = rgba[i * 4 + 2] * a + 255 * (1 - a);
    }
    rgb = blur(rgb, w, h, opts.blur || 0);
    var lab = new Float32Array(n * 3);
    for (i = 0; i < n; i++) {
      var L = rgbToLab(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]);
      lab[i * 3] = L[0]; lab[i * 3 + 1] = L[1]; lab[i * 3 + 2] = L[2];
    }
    var cent = kmeans(lab, n, opts.colors || 12);
    var labels = assignAll(lab, n, cent);
    for (var s = 0; s < (opts.smooth || 1); s++) labels = majority(labels, w, h, cent.length, 1);
    labels = mergeSmall(labels, w, h, opts.minArea || 40, cent);
    // average real picture color of each final label
    var acc = cent.map(function () { return [0, 0, 0, 0]; });
    for (i = 0; i < n; i++) { var c = acc[labels[i]]; c[0] += rgb[i * 3]; c[1] += rgb[i * 3 + 1]; c[2] += rgb[i * 3 + 2]; c[3]++; }
    var palette = acc.map(function (c, j) {
      if (!c[3]) return null;
      return [Math.round(c[0] / c[3]), Math.round(c[1] / c[3]), Math.round(c[2] / c[3])];
    });
    return compact({ w: w, h: h, labels: labels, palette: palette });
  }

  // Remove unused colors and renumber light → dark (number 1 = lightest)
  function compact(res) {
    var used = res.palette.map(function (p) { return !!p; });
    var counts = new Int32Array(res.palette.length);
    for (var i = 0; i < res.labels.length; i++) counts[res.labels[i]]++;
    var order = [];
    res.palette.forEach(function (p, j) { if (p && counts[j] > 0) order.push(j); });
    order.sort(function (a, b) {
      var A = res.palette[a], B = res.palette[b];
      return rgbToLab(B[0], B[1], B[2])[0] - rgbToLab(A[0], A[1], A[2])[0];
    });
    var map = new Uint8Array(res.palette.length);
    order.forEach(function (old, nw) { map[old] = nw; });
    for (i = 0; i < res.labels.length; i++) res.labels[i] = map[res.labels[i]];
    res.palette = order.map(function (j) { return res.palette[j]; });
    if (res.extra) res.extra = order.map(function (j) { return res.extra[j]; });
    void used;
    return res;
  }

  // Replace palette colors (e.g. with mixable colors), merging ones that became the same
  function remap(res, newColors, same) {
    var groups = [], map = new Uint8Array(res.palette.length);
    newColors.forEach(function (c, j) {
      for (var g = 0; g < groups.length; g++) if (same(groups[g].color, c)) { map[j] = g; groups[g].members.push(j); return; }
      map[j] = groups.length; groups.push({ color: c, members: [j] });
    });
    for (var i = 0; i < res.labels.length; i++) res.labels[i] = map[res.labels[i]];
    res.palette = groups.map(function (g) { return g.color; });
    res.extra = groups.map(function (g) { return g.members[0]; });
    return compact(res);
  }

  // Bigger, smoother label map for display (bilinear vote between neighboring pixels)
  function upscale(labels, w, h, s) {
    var W = w * s, H = h * s, out = new Uint8Array(W * H);
    for (var Y = 0; Y < H; Y++) {
      var fy = (Y + 0.5) / s - 0.5, y0 = Math.max(0, Math.floor(fy)), y1 = Math.min(h - 1, y0 + 1), ty = Math.min(1, Math.max(0, fy - y0));
      for (var X = 0; X < W; X++) {
        var fx = (X + 0.5) / s - 0.5, x0 = Math.max(0, Math.floor(fx)), x1 = Math.min(w - 1, x0 + 1), tx = Math.min(1, Math.max(0, fx - x0));
        var a = labels[y0 * w + x0], b = labels[y0 * w + x1], c = labels[y1 * w + x0], d = labels[y1 * w + x1];
        if (a === b && b === c && c === d) { out[Y * W + X] = a; continue; }
        var wa = (1 - tx) * (1 - ty), wb = tx * (1 - ty), wc = (1 - tx) * ty, wd = tx * ty;
        var best = a, bw = -1, cand = [a, b, c, d];
        for (var k = 0; k < 4; k++) {
          var l = cand[k], sum = (a === l ? wa : 0) + (b === l ? wb : 0) + (c === l ? wc : 0) + (d === l ? wd : 0);
          if (sum > bw) { bw = sum; best = l; }
        }
        out[Y * W + X] = best;
      }
    }
    return out;
  }

  // Run-length encoding so a picture can be saved in the browser
  function rleEncode(labels) {
    var out = [], i = 0, n = labels.length;
    while (i < n) {
      var v = labels[i], run = 1;
      while (i + run < n && labels[i + run] === v && run < 255) run++;
      out.push(v, run); i += run;
    }
    var bin = '';
    for (var j = 0; j < out.length; j++) bin += String.fromCharCode(out[j]);
    return btoa(bin);
  }
  function rleDecode(str, n) {
    var bin = atob(str), labels = new Uint8Array(n), p = 0;
    for (var i = 0; i + 1 < bin.length; i += 2) {
      var v = bin.charCodeAt(i), run = bin.charCodeAt(i + 1);
      for (var k = 0; k < run && p < n; k++) labels[p++] = v;
    }
    return labels;
  }

  var api = { process: process, remap: remap, compact: compact, upscale: upscale, numberSpots: numberSpots, components: components, rleEncode: rleEncode, rleDecode: rleDecode, rgbToLab: rgbToLab };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.PBN = api;
})(this);
