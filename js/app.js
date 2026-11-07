(function () {
  'use strict';

  var PM = window.PaintMix;
  var TUBES = window.PAINT_DATA.TUBES;
  var COLORS = window.PAINT_DATA.COLORS;
  var STANDARD = TUBES.map(PM.makePaint);
  // Paints the user scanned from photos: [{id, name, hex}]
  var custom = [];
  var PAINTS = [], BY_ID = {};
  function rebuildPaints() {
    PAINTS = STANDARD.concat(custom.map(function (c) {
      var p = PM.makePaint({ id: c.id, name: c.name, hex: c.hex, strength: 1 });
      p.custom = true;
      return p;
    }));
    BY_ID = {};
    PAINTS.forEach(function (p) { BY_ID[p.id] = p; });
  }
  var GROUPS = [];
  COLORS.forEach(function (c) {
    if (GROUPS.indexOf(c.group) === -1) GROUPS.push(c.group);
    c.lab = PM.hexToLab(c.hex);
  });

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function partWord(n) { return n === 1 ? 'part' : 'parts'; }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
  }

  // ---------- Owned paints ----------
  var saved = store('customPaints');
  if (Array.isArray(saved)) {
    custom = saved.filter(function (c) { return c && typeof c.id === 'string' && /^#[0-9A-F]{6}$/i.test(c.hex); })
      .map(function (c) { return { id: c.id, name: String(c.name || 'My paint').slice(0, 40), hex: c.hex.toUpperCase() }; });
  }
  rebuildPaints();
  var owned = store('ownedPaints');
  if (!Array.isArray(owned)) owned = [];
  owned = owned.filter(function (id) { return BY_ID[id]; });
  if (!owned.length) owned = STANDARD.map(function (p) { return p.id; });
  function idsOf(list) { return list.map(function (p) { return p.id; }); }
  function isOwned(id) { return owned.indexOf(id) !== -1; }

  // Which standard paint and which named shade a color is closest to
  function identify(hex) {
    var lab = PM.hexToLab(hex), best = null, bd = Infinity;
    STANDARD.forEach(function (p) { var d = PM.dE2000(lab, p.lab); if (d < bd) { bd = d; best = p; } });
    var shade = nearestName(hex).color;
    if (bd >= 8) {
      // Maybe a ready-mixed tint: white plus a bit of one paint (common in craft kits)
      var white = BY_ID.white, tint = null, td = Infinity, tr = 0;
      STANDARD.forEach(function (p) {
        if (p === white) return;
        [1, 2, 3, 5, 8, 12, 20].forEach(function (k) {
          var d = PM.dE2000(lab, PM.mix([white, p], [k, 1]).lab);
          if (d < td) { td = d; tint = p; tr = k; }
        });
      });
      if (td < 10 && td < bd - 2) {
        var amount = tr >= 5 ? 'a little' : 'some';
        return {
          paint: tint, shade: shade,
          text: 'Looks like white + ' + amount + ' <b>' + esc(tint.name) + '</b> (already mixed) · Color: ' + esc(shade.name),
          short: 'White + ' + amount + ' ' + esc(tint.name)
        };
      }
    }
    var how = bd < 8 ? 'Looks like' : (bd < 16 ? 'Similar to' : 'Closest standard paint:');
    return {
      paint: best, shade: shade,
      text: how + ' <b>' + esc(best.name) + '</b> · Color: ' + esc(shade.name),
      short: how + ' ' + esc(best.name)
    };
  }

  function renderOwned() {
    $('#ownedGrid').innerHTML = STANDARD.map(function (p) {
      return '<label class="owned"><input type="checkbox" value="' + p.id + '"' + (isOwned(p.id) ? ' checked' : '') + '>' +
        '<span class="blob" style="background:' + p.displayHex + '"></span>' +
        '<span><span class="owned-name">' + esc(p.name) + '</span></span></label>';
    }).join('');
    var mine = PAINTS.filter(function (p) { return p.custom; });
    $('#customSection').hidden = !mine.length;
    $('#customCount').textContent = mine.length ? mine.length + (mine.length === 1 ? ' paint' : ' paints') : '';
    $('#customGrid').innerHTML = mine.map(function (p) {
      return '<div class="owned owned-custom"><input type="checkbox" value="' + p.id + '" aria-label="Use ' + esc(p.name) + '"' + (isOwned(p.id) ? ' checked' : '') + '>' +
        '<span class="blob" style="background:' + p.displayHex + '"></span>' +
        '<span class="owned-text"><input class="rename" data-rename="' + p.id + '" value="' + esc(p.name) + '" maxlength="40" aria-label="Paint name">' +
        '<span class="owned-sub">' + identify(p.hex).short + '</span></span>' +
        '<button class="icon-btn" data-del="' + p.id + '" aria-label="Delete ' + esc(p.name) + '" title="Delete">×</button></div>';
    }).join('');
    $('[data-preset="mine"]').hidden = !mine.length;
    $('#paintCount').textContent = owned.length;
  }
  function ownedChanged() {
    store('ownedPaints', owned);
    $('#paintCount').textContent = owned.length;
    renderLab(); refreshResult();
  }
  function onTick(e) {
    if (e.target.type !== 'checkbox') return;
    var next = $$('#ownedGrid input[type=checkbox]:checked, #customGrid input[type=checkbox]:checked').map(function (i) { return i.value; });
    if (!next.length) { toast('Keep at least one paint ticked'); renderOwned(); return; }
    owned = next; ownedChanged();
  }
  $('#ownedGrid').addEventListener('change', onTick);
  $('#customGrid').addEventListener('change', onTick);
  $('#customGrid').addEventListener('change', function (e) {
    var r = e.target.closest('[data-rename]'); if (!r) return;
    var c = custom.filter(function (x) { return x.id === r.dataset.rename; })[0]; if (!c) return;
    var v = r.value.trim().slice(0, 40) || c.name;
    c.name = v; r.value = v; BY_ID[c.id].name = v;
    store('customPaints', custom);
    renderLab();
    if (current && currentRecipes.length) renderResult();
  });
  $('#customGrid').addEventListener('click', function (e) {
    var d = e.target.closest('[data-del]'); if (!d) return;
    var c = custom.filter(function (x) { return x.id === d.dataset.del; })[0]; if (!c) return;
    if (!window.confirm('Delete "' + c.name + '" from your paints?')) return;
    custom = custom.filter(function (x) { return x.id !== c.id; });
    owned = owned.filter(function (id) { return id !== c.id; });
    if (!owned.length) owned = idsOf(STANDARD);
    store('customPaints', custom);
    rebuildPaints(); renderOwned(); ownedChanged();
    toast('Paint deleted');
  });
  $$('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () {
      var p = b.dataset.preset;
      if (p === 'basic') owned = TUBES.filter(function (t) { return t.basic; }).map(function (t) { return t.id; });
      else if (p === 'mine') owned = custom.map(function (c) { return c.id; });
      else owned = idsOf(PAINTS);
      renderOwned(); ownedChanged();
      toast(p === 'basic' ? 'Using the basic 5 paints' : (p === 'mine' ? 'Using only your scanned paints' : 'Using all paints'));
    });
  });

  // ---------- Tabs ----------
  function showTab(name) {
    $$('.tab').forEach(function (t) {
      var on = t.dataset.tab === name;
      t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on);
    });
    $$('.panel').forEach(function (p) {
      var on = p.id === 'tab-' + name;
      p.hidden = !on; p.classList.toggle('is-active', on);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $$('.tab').forEach(function (t) { t.addEventListener('click', function () { showTab(t.dataset.tab); }); });

  // ---------- Library ----------
  var activeGroup = 'All';
  function renderChips() {
    $('#chips').innerHTML = ['All'].concat(GROUPS).map(function (g) {
      return '<button class="chip' + (g === activeGroup ? ' is-active' : '') + '" data-group="' + esc(g) + '">' + esc(g) + '</button>';
    }).join('');
  }
  $('#chips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    activeGroup = b.dataset.group; renderChips(); renderLibrary();
  });

  var selectedHex = null;
  function renderLibrary() {
    var q = $('#search').value.trim().toLowerCase();
    var html = '';
    GROUPS.forEach(function (g) {
      if (activeGroup !== 'All' && activeGroup !== g) return;
      var list = COLORS.filter(function (c) {
        return c.group === g && (!q || c.name.toLowerCase().indexOf(q) !== -1 || g.toLowerCase().indexOf(q) !== -1 || c.hex.toLowerCase().indexOf(q) !== -1);
      });
      if (!list.length) return;
      html += '<h3 class="group-title">' + esc(g) + ' <small>' + list.length + ' shades</small></h3><div class="swatch-grid">' +
        list.map(function (c) {
          return '<button class="swatch' + (c.hex === selectedHex ? ' is-selected' : '') + '" data-hex="' + c.hex + '" data-name="' + esc(c.name) + '">' +
            '<span class="swatch-chip" style="background:' + c.hex + '"></span>' +
            '<span class="swatch-name">' + esc(c.name) + '</span><span class="swatch-hex">' + c.hex + '</span></button>';
        }).join('') + '</div>';
    });
    $('#library').innerHTML = html || '<p class="no-results">No shades match that search. Try the color picker above to choose any color.</p>';
  }
  $('#search').addEventListener('input', renderLibrary);
  $('#library').addEventListener('click', function (e) {
    var b = e.target.closest('.swatch'); if (!b) return;
    selectTarget({ name: b.dataset.name, hex: b.dataset.hex }, true);
  });

  // ---------- Custom colour ----------
  function normHex(v) {
    v = String(v || '').trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(v)) v = v.replace(/(.)/g, '$1$1');
    return /^[0-9a-f]{6}$/i.test(v) ? '#' + v.toUpperCase() : null;
  }
  function nearestName(hex) {
    var lab = PM.hexToLab(hex), best = null, bd = Infinity;
    COLORS.forEach(function (c) { var d = PM.dE2000(lab, c.lab); if (d < bd) { bd = d; best = c; } });
    return { color: best, dE: bd };
  }
  function customName(hex) {
    var n = nearestName(hex);
    return n.dE < 2 ? n.color.name : 'Custom shade (near ' + n.color.name + ')';
  }
  $('#customColor').addEventListener('input', function () { $('#customHex').value = this.value.toUpperCase(); });
  $('#customHex').addEventListener('input', function () { var h = normHex(this.value); if (h) $('#customColor').value = h.toLowerCase(); });
  function goCustom() {
    var h = normHex($('#customHex').value);
    if (!h) { toast('Please enter a color code like #A1B2C3'); return; }
    $('#customHex').value = h;
    selectTarget({ name: customName(h), hex: h }, true);
  }
  $('#customGo').addEventListener('click', goCustom);
  $('#customHex').addEventListener('keydown', function (e) { if (e.key === 'Enter') goCustom(); });
  $('#customColor').addEventListener('change', goCustom);

  // ---------- Solver (Web Worker, with fallback) ----------
  var worker = null, reqId = 0, pending = {};
  try {
    worker = new Worker('js/worker.js');
    worker.onmessage = function (e) {
      var cb = pending[e.data.reqId]; delete pending[e.data.reqId];
      if (cb) cb(e.data.recipes);
    };
    worker.onerror = function () { worker = null; Object.keys(pending).forEach(function (k) { var cb = pending[k]; delete pending[k]; solveLocal(cb.hex, cb); }); };
  } catch (err) { worker = null; }

  function solveLocal(hex, cb) {
    setTimeout(function () {
      var use = PAINTS.filter(function (p) { return owned.indexOf(p.id) !== -1; });
      cb(PM.solve(hex, use).map(function (r) {
        return { tag: r.tag, hex: r.hex, dE: r.dE, total: r.total, items: r.items.map(function (i) { return { id: i.paint.id, parts: i.parts }; }) };
      }));
    }, 40);
  }
  function getRecipes(hex, cb) {
    var id = ++reqId;
    var wrapped = function (r) { if (id === reqId) cb(r); };
    wrapped.hex = hex;
    if (worker) { pending[id] = wrapped; worker.postMessage({ reqId: id, hex: hex, enabled: owned.slice(), custom: custom.slice() }); }
    else solveLocal(hex, wrapped);
  }

  // ---------- Result ----------
  var current = null, currentRecipes = [], activeRecipe = 0;

  function selectTarget(t, scroll) {
    current = t; selectedHex = t.hex;
    $$('.swatch').forEach(function (s) { s.classList.toggle('is-selected', s.dataset.hex === t.hex); });
    try { history.replaceState(null, '', '#shade=' + t.hex.slice(1)); } catch (e) { /* ignore */ }
    $('#result').classList.remove('is-idle');
    $('#resultEmpty').hidden = true;
    var body = $('#resultBody'); body.hidden = false;
    body.innerHTML = headerHtml(t, null) + '<div class="loading"><span class="spinner"></span>Working out the best paint recipe…</div>';
    if (scroll && window.matchMedia('(max-width: 960px)').matches) $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    getRecipes(t.hex, function (recipes) {
      currentRecipes = recipes; activeRecipe = 0; renderResult();
    });
  }
  function refreshResult() { if (current) selectTarget(current, false); }

  function headerHtml(t, mixHex) {
    return '<div class="compare">' +
      '<div style="background:' + t.hex + '"><span class="compare-label">Your shade</span></div>' +
      '<div style="background:' + (mixHex || t.hex) + '"><span class="compare-label">' + (mixHex ? 'Your mix' : 'Mixing…') + '</span></div></div>' +
      '<h2 class="target-name">' + esc(t.name) + '</h2>' +
      '<div class="target-meta"><span>' + t.hex + '</span><button class="copy-hex" data-copy="' + t.hex + '">Copy code</button></div>';
  }

  function renderResult() {
    var t = current, body = $('#resultBody');
    if (!currentRecipes.length) { body.innerHTML = headerHtml(t, null) + '<p>Sorry, no recipe found.</p>'; return; }
    var r = currentRecipes[activeRecipe];
    var m = PM.matchLabel(r.dE);
    var items = r.items.map(function (i) { return { paint: BY_ID[i.id], parts: i.parts }; });
    var total = r.total;

    var html = headerHtml(t, r.hex);
    html += '<div class="match l' + m.level + '"><span class="match-dots">' +
      [1, 2, 3, 4, 5].map(function (n) { return '<i class="' + (n <= m.level ? 'on' : '') + '"></i>'; }).join('') +
      '</span>' + esc(m.text) + ' · ' + m.pct + '%</div>';

    if (currentRecipes.length > 1) {
      html += '<div class="recipe-tabs" role="tablist">' + currentRecipes.map(function (x, i) {
        return '<button class="recipe-tab' + (i === activeRecipe ? ' is-active' : '') + '" data-recipe="' + i + '">' + esc(x.tag || ('Option ' + (i + 1))) + '</button>';
      }).join('') + '</div>';
    } else html += '<div style="height:16px"></div>';

    html += '<div class="prop-bar" aria-hidden="true">' + items.map(function (i) {
      return '<span style="width:' + (i.parts / total * 100) + '%;background:' + i.paint.displayHex + '"></span>';
    }).join('') + '</div>';

    html += '<ul class="ingredients">' + items.map(function (i) {
      var pct = Math.round(i.parts / total * 100);
      return '<li class="ingredient"><span class="blob" style="background:' + i.paint.displayHex + '"></span>' +
        '<span><span class="ing-name">' + esc(i.paint.name) + '</span><br><span class="ing-sub">' + (pct < 1 ? 'less than 1' : pct) + '% of the mix</span></span>' +
        '<span class="ing-parts">' + i.parts + '<small>' + partWord(i.parts) + '</small></span></li>';
    }).join('') + '</ul>';

    // How-to steps: lightest paint first
    var ordered = items.slice().sort(function (a, b) { return b.paint.lab[0] - a.paint.lab[0]; });
    html += '<p class="steps-title">How to mix it</p><ol class="steps">';
    if (ordered.length === 1) {
      html += '<li>Use ' + esc(ordered[0].paint.name) + ' straight from the tube. No mixing needed!</li>';
    } else {
      ordered.forEach(function (i, idx) {
        html += idx === 0
          ? '<li>Put <b>' + i.parts + ' ' + partWord(i.parts) + '</b> of ' + esc(i.paint.name) + ' on your palette.</li>'
          : '<li>Add <b>' + i.parts + ' ' + partWord(i.parts) + '</b> of ' + esc(i.paint.name) + ', a little at a time, mixing well.</li>';
      });
      html += '<li>Mix until there are no streaks, then compare with the swatch above.</li>';
    }
    html += '</ol>';

    var maxP = Math.max.apply(null, items.map(function (i) { return i.parts; }));
    var minI = items.reduce(function (a, b) { return a.parts <= b.parts ? a : b; });
    var tip;
    if (items.length > 1 && maxP / minI.parts >= 8) {
      tip = '<b>' + esc(minI.paint.name) + '</b> is strong here, so add it in tiny amounts. It’s much easier to darken a light mix than to lighten a dark one.';
    } else if (m.level <= 2 && owned.length < PAINTS.length) {
      tip = 'For a closer match, tick more paints in <b>My paints</b>. A magenta, purple, phthalo blue or phthalo green opens up many more shades.';
    } else if (m.level <= 2) {
      tip = 'This shade is hard to reach exactly with standard paints. This recipe is the closest mix; a ready-made paint in this color may match better.';
    } else {
      tip = '“1 part” is any equal amount: a drop, a teaspoon or a cup. Paint often dries slightly darker, so test on a scrap first.';
    }
    html += '<div class="tip">' + tip + '</div>';
    html += '<div class="result-actions"><button class="btn btn-primary" data-open-lab>Try it in the Mixing lab</button>' +
      '<button class="btn btn-ghost" data-share>Share this shade</button></div>';
    body.innerHTML = html;
  }

  $('#resultBody').addEventListener('click', function (e) {
    var rt = e.target.closest('[data-recipe]');
    if (rt) { activeRecipe = +rt.dataset.recipe; renderResult(); return; }
    var cp = e.target.closest('[data-copy]');
    if (cp) { copy(cp.dataset.copy, 'Color code copied'); return; }
    if (e.target.closest('[data-share]')) { copy(location.href, 'Link copied, ready to send'); return; }
    if (e.target.closest('[data-open-lab]')) {
      var r = currentRecipes[activeRecipe];
      labCounts = {};
      r.items.forEach(function (i) { labCounts[i.id] = i.parts; });
      renderLab(); showTab('lab');
    }
  });
  function copy(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(msg); }, function () { toast(text); });
    } else toast(text);
  }

  // ---------- Mixing lab ----------
  var labCounts = {};
  function renderLab() {
    // Only show the paints ticked in "My paints"; forget amounts of paints no longer owned
    Object.keys(labCounts).forEach(function (id) { if (owned.indexOf(id) === -1) delete labCounts[id]; });
    var mine = PAINTS.filter(function (p) { return owned.indexOf(p.id) !== -1; });
    $('#labOwned').innerHTML = 'Showing the ' + mine.length + ' ' + (mine.length === 1 ? 'paint' : 'paints') + ' you own.' +
      ' <button class="link-btn" data-goto="paints">Change my paints</button>';
    $('#labTubes').innerHTML = mine.map(function (p) {
      var n = labCounts[p.id] || 0;
      return '<div class="tube' + (n ? ' has-parts' : '') + '"><span class="blob" style="background:' + p.displayHex + '"></span>' +
        '<div><div class="tube-name">' + esc(p.name) + '</div><div class="stepper">' +
        '<button data-lab="' + p.id + '" data-d="-1" aria-label="Remove 1 part ' + esc(p.name) + '">−</button>' +
        '<output>' + n + ' ' + partWord(n) + '</output>' +
        '<button data-lab="' + p.id + '" data-d="1" aria-label="Add 1 part ' + esc(p.name) + '">+</button></div></div></div>';
    }).join('');
    var ps = [], ws = [];
    PAINTS.forEach(function (p) { if (labCounts[p.id]) { ps.push(p); ws.push(labCounts[p.id]); } });
    var sw = $('#labSwatch');
    if (!ps.length) {
      sw.style.background = ''; sw.innerHTML = '<span>Add some paint</span>';
      $('#labHex').textContent = '—';
      $('#labNear').textContent = 'Use the + buttons to add paint.';
      $('#labBar').innerHTML = '';
      return;
    }
    var m = PM.mix(ps, ws), total = ws.reduce(function (a, b) { return a + b; }, 0);
    sw.style.background = m.hex; sw.innerHTML = '';
    $('#labHex').textContent = m.hex;
    var n = nearestName(m.hex);
    $('#labNear').innerHTML = (n.dE < 5 ? 'Looks like: <b>' : 'Closest named shade: <b>') + esc(n.color.name) + '</b>';
    $('#labBar').innerHTML = ps.map(function (p, i) {
      return '<span style="width:' + (ws[i] / total * 100) + '%;background:' + p.displayHex + '"></span>';
    }).join('');
  }
  $('#labTubes').addEventListener('click', function (e) {
    var b = e.target.closest('[data-lab]'); if (!b) return;
    var id = b.dataset.lab;
    labCounts[id] = Math.max(0, (labCounts[id] || 0) + (+b.dataset.d));
    if (!labCounts[id]) delete labCounts[id];
    renderLab();
  });
  $('#labReset').addEventListener('click', function () { labCounts = {}; renderLab(); });
  $('#labOwned').addEventListener('click', function (e) {
    if (e.target.closest('[data-goto]')) showTab('paints');
  });

  // ---------- Photo scanner ----------
  var photos = [], activePhoto = -1, samples = [], whiteMode = false, sampleSeq = 0;
  var MAX_SIDE = 1600;
  function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function unlin(v) { v = Math.max(0, Math.min(1, v)); return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); }

  function openScanner() {
    $('#scanner').hidden = false; $('#scanCta').hidden = true;
    $('#scanner').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function closeScanner() { setWhiteMode(false); $('#scanner').hidden = true; $('#scanCta').hidden = false; }
  $('#openScanner').addEventListener('click', openScanner);
  $('#closeScanner').addEventListener('click', closeScanner);

  function onFiles(e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    e.target.value = '';
    files.forEach(loadPhoto);
  }
  $('#camInput').addEventListener('change', onFiles);
  $('#fileInput').addEventListener('change', onFiles);

  function loadPhoto(file) {
    if (file.type && file.type.indexOf('image/') !== 0) { toast('That file is not a photo'); return; }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var s = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * s));
      c.height = Math.max(1, Math.round(img.naturalHeight * s));
      var ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, c.width, c.height);
      var data;
      try { data = ctx.getImageData(0, 0, c.width, c.height); } catch (err) { toast('Could not read that photo'); return; }
      photos.push({ canvas: c, data: data, white: null, thumb: url });
      activePhoto = photos.length - 1;
      $('#howto').open = false;
      renderScan();
      $('#photoWrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast('Could not open that photo. Try a JPG or PNG.'); };
    img.src = url;
  }

  function sampleRadius(ph) { return Math.max(3, Math.round(Math.min(ph.canvas.width, ph.canvas.height) * 0.012)); }

  // Average color around a tap, ignoring the shiniest and darkest pixels (glare, shadows)
  function sampleAt(ph, x, y) {
    var w = ph.canvas.width, h = ph.canvas.height, d = ph.data.data, r = sampleRadius(ph), px = [];
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        var xx = Math.round(x) + dx, yy = Math.round(y) + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        var i = (yy * w + xx) * 4;
        px.push([d[i], d[i + 1], d[i + 2], 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]]);
      }
    }
    px.sort(function (a, b) { return a[3] - b[3]; });
    var lo = Math.floor(px.length * 0.1), hi = Math.max(lo + 1, Math.ceil(px.length * 0.85));
    var acc = [0, 0, 0], n = 0;
    for (var k = lo; k < hi && k < px.length; k++) { acc[0] += lin(px[k][0]); acc[1] += lin(px[k][1]); acc[2] += lin(px[k][2]); n++; }
    return [unlin(acc[0] / n), unlin(acc[1] / n), unlin(acc[2] / n)];
  }

  // Color of a sample, corrected with the photo's white paper if one was tapped
  function sampleHex(s) {
    var ph = photos[s.photo], rgb = s.raw;
    if (ph && ph.white) {
      var W = ph.white.raw;
      rgb = rgb.map(function (v, i) { return unlin(lin(v) * 0.86 / Math.max(lin(W[i]), 0.02)); });
    }
    return PM.rgbToHex(rgb);
  }

  function setWhiteMode(on) {
    whiteMode = on;
    $('#whiteBtn').classList.toggle('is-on', on);
    $('#whiteBtn').textContent = on ? 'Cancel' : 'Tap white paper';
    $('#modeBanner').hidden = !on;
  }
  $('#whiteBtn').addEventListener('click', function () { setWhiteMode(!whiteMode); });
  $('#whiteStatus').addEventListener('click', function (e) {
    if (!e.target.closest('[data-undo-white]')) return;
    if (photos[activePhoto]) photos[activePhoto].white = null;
    renderScan();
  });

  $('#photoCanvas').addEventListener('click', function (e) {
    var ph = photos[activePhoto]; if (!ph) return;
    var rect = this.getBoundingClientRect();
    var x = (e.clientX - rect.left) * this.width / rect.width;
    var y = (e.clientY - rect.top) * this.height / rect.height;
    var raw = sampleAt(ph, x, y);
    if (whiteMode) {
      var lab = PM.hexToLab(PM.rgbToHex(raw));
      if (lab[0] < 45 || Math.hypot(lab[1], lab[2]) > 30) {
        toast('That spot looks too dark or colorful. Tap plain white paper.');
        return;
      }
      ph.white = { x: x, y: y, raw: raw };
      setWhiteMode(false);
      toast('Colors corrected using the white paper');
    } else {
      samples.push({ id: ++sampleSeq, photo: activePhoto, x: x, y: y, raw: raw, name: null });
    }
    renderScan();
  });

  function drawMarker(ctx, x, y, r, fill, label) {
    ctx.lineWidth = Math.max(2, r * 0.18);
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath(); ctx.arc(x, y, r + ctx.lineWidth * 0.6, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    var br = r * 0.75, bx = x + r * 0.95, by = y - r * 0.95;
    ctx.fillStyle = '#2A2420';
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 ' + Math.round(br * 1.1) + 'px "DM Sans", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, bx, by + br * 0.05);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1.5, r * 0.08);
      ctx.beginPath(); ctx.arc(bx - br * 1.9, by, br * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }

  function renderScan() {
    $('#scanWork').hidden = !photos.length;
    $('#photoStrip').innerHTML = photos.length > 1 ? photos.map(function (ph, i) {
      var count = samples.filter(function (s) { return s.photo === i; }).length;
      return '<button class="thumb' + (i === activePhoto ? ' is-active' : '') + '" data-photo="' + i + '" aria-label="Photo ' + (i + 1) + '">' +
        '<img src="' + ph.thumb + '" alt="">' + (count ? '<span class="thumb-badge">' + count + '</span>' : '') + '</button>';
    }).join('') : '';
    var ph = photos[activePhoto];
    if (ph) {
      var cv = $('#photoCanvas'), ctx = cv.getContext('2d');
      cv.width = ph.canvas.width; cv.height = ph.canvas.height;
      ctx.drawImage(ph.canvas, 0, 0);
      // Size markers for how big the photo is on screen (about 14px rings)
      var shown = cv.getBoundingClientRect().width || Math.min(cv.width, 600);
      var r = Math.max(sampleRadius(ph) * 1.3, 14 * cv.width / shown);
      samples.forEach(function (s, i) { if (s.photo === activePhoto) drawMarker(ctx, s.x, s.y, r, sampleHex(s), String(i + 1)); });
      if (ph.white) drawMarker(ctx, ph.white.x, ph.white.y, r, null, 'W');
      $('#whiteStatus').innerHTML = ph.white ? '✓ Colors corrected <button class="link-btn" data-undo-white>Undo</button>' : '';
    }
    $('#foundCount').textContent = samples.length ? '(' + samples.length + ')' : '';
    $('#foundList').innerHTML = samples.length ? samples.map(function (s, i) {
      var hex = sampleHex(s), info = identify(hex);
      var name = s.name !== null ? s.name : info.shade.name;
      return '<li class="found"><span class="found-num">' + (i + 1) + '</span>' +
        '<span class="blob" style="background:' + hex + '"></span>' +
        '<div><input class="found-name" data-sname="' + s.id + '" value="' + esc(name) + '" maxlength="40" aria-label="Name for paint ' + (i + 1) + '">' +
        '<div class="found-id">' + info.text + ' · ' + hex + '</div></div>' +
        '<button class="icon-btn" data-sdel="' + s.id + '" aria-label="Remove paint ' + (i + 1) + '" title="Remove">×</button></li>';
    }).join('') : '<li class="found-empty">No paints yet. Tap a paint in the photo above.</li>';
    $('#saveFound').disabled = !samples.length;
    $('#saveFound').textContent = samples.length ? 'Add ' + samples.length + (samples.length === 1 ? ' paint' : ' paints') + ' to my paints' : 'Add to my paints';
  }

  $('#photoStrip').addEventListener('click', function (e) {
    var b = e.target.closest('[data-photo]'); if (!b) return;
    activePhoto = +b.dataset.photo; setWhiteMode(false); renderScan();
  });
  $('#foundList').addEventListener('input', function (e) {
    var inp = e.target.closest('[data-sname]'); if (!inp) return;
    samples.forEach(function (s) { if (s.id === +inp.dataset.sname) s.name = inp.value; });
  });
  $('#foundList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-sdel]'); if (!b) return;
    samples = samples.filter(function (s) { return s.id !== +b.dataset.sdel; });
    renderScan();
  });

  $('#saveFound').addEventListener('click', function () {
    if (!samples.length) return;
    var stamp = Date.now().toString(36);
    var usedNames = custom.map(function (c) { return c.name.toLowerCase(); });
    var added = samples.map(function (s, i) {
      var hex = sampleHex(s);
      var base = ((s.name !== null ? s.name : identify(hex).shade.name) || '').trim().slice(0, 36) || 'My paint';
      var name = base, n = 2;
      while (usedNames.indexOf(name.toLowerCase()) !== -1) name = base + ' ' + (n++);
      usedNames.push(name.toLowerCase());
      return { id: 'my-' + stamp + '-' + i, name: name, hex: hex };
    });
    custom = custom.concat(added);
    if ($('#onlyMine').checked) owned = custom.map(function (c) { return c.id; });
    else owned = owned.concat(idsOf(added));
    store('customPaints', custom);
    rebuildPaints();
    photos = []; samples = []; activePhoto = -1;
    renderScan(); closeScanner(); renderOwned(); ownedChanged();
    toast('Added ' + added.length + (added.length === 1 ? ' paint' : ' paints') + ' to My paints');
    $('#customSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---------- Start ----------
  renderOwned(); renderChips(); renderLibrary(); renderLab();
  $('#result').classList.add('is-idle');
  function fromHash() {
    var hm = /shade=([0-9a-f]{6})/i.exec(location.hash);
    if (!hm) return;
    var hx = '#' + hm[1].toUpperCase();
    if (current && current.hex === hx) return;
    var known = COLORS.filter(function (c) { return c.hex === hx; })[0];
    $('#customHex').value = hx; $('#customColor').value = hx.toLowerCase();
    selectTarget({ name: known ? known.name : customName(hx), hex: hx }, false);
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
