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
    renderLab(); refreshResult(); projectsPaintsChanged();
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
  function solveLocal(hex, maxPaints, cb) {
    setTimeout(function () {
      var use = PAINTS.filter(function (p) { return owned.indexOf(p.id) !== -1; });
      cb(PM.solve(hex, use, { maxPaints: maxPaints }).map(function (r) {
        return { tag: r.tag, hex: r.hex, dE: r.dE, total: r.total, items: r.items.map(function (i) { return { id: i.paint.id, parts: i.parts }; }) };
      }));
    }, 20);
  }
  // A solver backed by its own worker; falls back to the main thread if workers are unavailable
  function makeSolver() {
    var w = null, seq = 0, pend = {};
    try {
      w = new Worker('js/worker.js');
      w.onmessage = function (e) {
        var job = pend[e.data.reqId]; delete pend[e.data.reqId];
        if (job) job.cb(e.data.recipes);
      };
      w.onerror = function () {
        w = null;
        Object.keys(pend).forEach(function (k) { var job = pend[k]; delete pend[k]; solveLocal(job.hex, job.max, job.cb); });
      };
    } catch (err) { w = null; }
    return function (hex, maxPaints, cb) {
      var id = ++seq;
      if (w) {
        pend[id] = { hex: hex, max: maxPaints, cb: cb };
        w.postMessage({ reqId: id, hex: hex, enabled: owned.slice(), custom: custom.slice(), maxPaints: maxPaints });
      } else solveLocal(hex, maxPaints, cb);
    };
  }
  var shadeSolve = makeSolver(), reqId = 0;
  function getRecipes(hex, cb) {
    var id = ++reqId;
    shadeSolve(hex, 4, function (r) { if (id === reqId) cb(r); });
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

  // ---------- Paint projects ----------
  var PROJECTS = window.PAINT_PROJECTS || [];
  var DIFF = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
  var projFilter = 'All', projSortBy = 'easy', projSolve = makeSolver();
  var projCheck = {}, projCheckToken = 0;
  var openProj = null, projView = { mode: 'color', grid: false, gridN: 4, size: 20, highlight: 0 };
  var projRecipes = {}, projRecipeToken = 0;
  var traceState = { zoom: 1, grid: true, nums: false }, wakeLock = null;
  try { var savedSize = store('canvasSize'); if (savedSize) projView.size = savedSize; } catch (e) { /* ignore */ }

  function projById(id) { return PROJECTS.filter(function (p) { return p.id === id; })[0]; }

  // Draw a project as SVG: mode 'color' (finished look), 'numbers' (paint-by-number) or 'lines' (outlines only)
  function artSvg(p, o) {
    o = o || {};
    var mode = o.mode || 'color', s = '';
    p.shapes.forEach(function (sh) {
      var c = sh[0], hex = p.palette[c - 1][1];
      if (mode === 'color') {
        s += '<path d="' + sh[1] + '" fill="' + hex + '"' + (p.outline ? ' stroke="#1E1E1F" stroke-width="2.2" stroke-linejoin="round"' : '') + '/>';
      } else {
        var fill = o.highlight && o.highlight === c ? hex : '#FFFFFF';
        s += '<path d="' + sh[1] + '" fill="' + fill + '" stroke="#2A2420" stroke-width="1.1" stroke-linejoin="round"/>';
      }
    });
    (p.lines || []).forEach(function (l) {
      var col = mode === 'color' ? p.palette[l[1] - 1][1] : '#2A2420';
      var wdt = mode === 'color' ? l[2] : Math.min(l[2], 1.3);
      s += '<path d="' + l[0] + '" fill="none" stroke="' + col + '" stroke-width="' + wdt + '" stroke-linecap="round" stroke-linejoin="round"/>';
    });
    if (mode === 'numbers' && o.labels) {
      o.labels.forEach(function (lb) {
        var on = o.highlight && o.highlight === lb.c;
        s += '<text x="' + lb.x + '" y="' + lb.y + '" font-size="' + lb.size + '" class="num' + (on ? ' on' : '') + '">' + lb.c + '</text>';
      });
    }
    if (o.grid) {
      var n = o.grid, step = 300 / n, g = '';
      for (var i = 1; i < n; i++) {
        g += '<line x1="' + f2(i * step) + '" y1="0" x2="' + f2(i * step) + '" y2="300"/>';
        g += '<line x1="0" y1="' + f2(i * step) + '" x2="300" y2="' + f2(i * step) + '"/>';
      }
      g += '<rect x="0.6" y="0.6" width="298.8" height="298.8" fill="none"/>';
      for (var j = 0; j < n; j++) {
        g += '<text class="gl" x="' + f2(j * step + step / 2) + '" y="7">' + String.fromCharCode(65 + j) + '</text>';
        g += '<text class="gl" x="6" y="' + f2(j * step + step / 2) + '">' + (j + 1) + '</text>';
      }
      s += '<g class="grid">' + g + '</g>';
    }
    return '<svg class="art" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(p.title) + '">' + s + '</svg>';
  }
  function f2(n) { return Math.round(n * 10) / 10; }

  // Find where to put each number: render every shape in a unique color, then pick the
  // point deepest inside each visible area. Also measures how much of the canvas each color covers.
  function analyze(p) {
    if (p._labels) return p;
    var S = 2, W = 300 * S, cv = document.createElement('canvas');
    cv.width = W; cv.height = W;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    var keyToShape = {};
    p.shapes.forEach(function (sh, i) {
      var r = (i * 37 + 20) % 256, g = (i * 91 + 50) % 256, b = (i * 53 + 100) % 256;
      keyToShape[(r << 16) | (g << 8) | b] = i;
      ctx.setTransform(S, 0, 0, S, 0, 0);
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.fill(new Path2D(sh[1]));
    });
    var data = ctx.getImageData(0, 0, W, W).data, N = W * W;
    var id = new Int16Array(N);
    for (var k = 0; k < N; k++) {
      var key = (data[k * 4] << 16) | (data[k * 4 + 1] << 8) | data[k * 4 + 2];
      id[k] = key in keyToShape ? keyToShape[key] : -1;
    }
    var seen = new Uint8Array(N), labels = [], area = {}, queue = new Int32Array(N);
    var dist = new Float32Array(N);
    for (var start = 0; start < N; start++) {
      if (seen[start] || id[start] < 0) continue;
      var sid = id[start], qh = 0, qt = 0, minX = W, minY = W, maxX = 0, maxY = 0;
      queue[qt++] = start; seen[start] = 1;
      while (qh < qt) {
        var q = queue[qh++], x = q % W, y = (q / W) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (x > 0 && !seen[q - 1] && id[q - 1] === sid) { seen[q - 1] = 1; queue[qt++] = q - 1; }
        if (x < W - 1 && !seen[q + 1] && id[q + 1] === sid) { seen[q + 1] = 1; queue[qt++] = q + 1; }
        if (y > 0 && !seen[q - W] && id[q - W] === sid) { seen[q - W] = 1; queue[qt++] = q - W; }
        if (y < W - 1 && !seen[q + W] && id[q + W] === sid) { seen[q + W] = 1; queue[qt++] = q + W; }
      }
      var cnum = p.shapes[sid][0];
      area[cnum] = (area[cnum] || 0) + qt;
      if (qt < 16) continue;
      // chamfer distance transform inside the bounding box
      var bx0 = minX - 1, by0 = minY - 1, bx1 = maxX + 1, by1 = maxY + 1, best = 0, bxp = 0, byp = 0, xx, yy, idx, v;
      var inComp = function (xq, yq) { return xq >= 0 && yq >= 0 && xq < W && yq < W && id[yq * W + xq] === sid; };
      for (yy = by0; yy <= by1; yy++) for (xx = bx0; xx <= bx1; xx++) {
        if (xx < 0 || yy < 0 || xx >= W || yy >= W) continue;
        idx = yy * W + xx;
        dist[idx] = inComp(xx, yy) ? 1e6 : 0;
      }
      var D = function (xq, yq) { return (xq < 0 || yq < 0 || xq >= W || yq >= W) ? 0 : dist[yq * W + xq]; };
      for (yy = by0; yy <= by1; yy++) for (xx = bx0; xx <= bx1; xx++) {
        if (xx < 0 || yy < 0 || xx >= W || yy >= W) continue;
        idx = yy * W + xx; v = dist[idx]; if (!v) continue;
        v = Math.min(v, D(xx - 1, yy) + 1, D(xx, yy - 1) + 1, D(xx - 1, yy - 1) + 1.414, D(xx + 1, yy - 1) + 1.414);
        dist[idx] = v;
      }
      for (yy = by1; yy >= by0; yy--) for (xx = bx1; xx >= bx0; xx--) {
        if (xx < 0 || yy < 0 || xx >= W || yy >= W) continue;
        idx = yy * W + xx; v = dist[idx]; if (!v) continue;
        v = Math.min(v, D(xx + 1, yy) + 1, D(xx, yy + 1) + 1, D(xx + 1, yy + 1) + 1.414, D(xx - 1, yy + 1) + 1.414);
        dist[idx] = v;
        if (v > best && inComp(xx, yy)) { best = v; bxp = xx; byp = yy; }
      }
      if (best < 2.5) continue;
      var size = Math.max(4, Math.min(13, best / S * 1.15));
      labels.push({ c: cnum, x: f2((bxp + 0.5) / S), y: f2((byp + 0.5) / S), size: f2(size) });
    }
    p._labels = labels;
    p._area = {};
    Object.keys(area).forEach(function (c) { p._area[c] = area[c] / N; });
    return p;
  }

  function amountWord(frac) {
    if (frac < 0.015) return 'a tiny dab';
    if (frac < 0.07) return 'a little';
    if (frac < 0.25) return 'a medium amount';
    return 'a lot';
  }

  function paintsKey() { return owned.join(',') + '|' + custom.map(function (c) { return c.id + c.hex; }).join(','); }

  // Quick check (simple mixes of up to 2 paints) of how many of a project's colors the user can make
  function checkProjects() {
    var token = ++projCheckToken, key = paintsKey();
    PROJECTS.forEach(function (p) {
      if (projCheck[p.id] && projCheck[p.id].key === key) return;
      var res = { key: key, done: 0, ok: 0, total: p.palette.length };
      projCheck[p.id] = res;
      p.palette.forEach(function (col) {
        projSolve(col[1], 2, function (r) {
          if (token !== projCheckToken) return;
          res.done++;
          if (r[0] && r[0].dE < 8) res.ok++;
          if (res.done === res.total) updateCheck(p);
        });
      });
    });
    PROJECTS.forEach(updateCheck);
  }
  function checkHtml(p) {
    var r = projCheck[p.id];
    if (!r || r.done < r.total) return '<span class="chk wait">Checking your paints…</span>';
    if (r.ok === r.total) return '<span class="chk ok">✓ You can mix all ' + r.total + ' colors</span>';
    return '<span class="chk part">You can mix ' + r.ok + ' of ' + r.total + ' colors</span>';
  }
  function updateCheck(p) {
    $$('[data-check="' + p.id + '"]').forEach(function (el) { el.innerHTML = checkHtml(p); });
  }
  function projectsPaintsChanged() {
    checkProjects();
    if (openProj) loadProjRecipes(openProj);
  }

  function renderProjChips() {
    $('#projChips').innerHTML = ['All', 'Easy', 'Medium', 'Hard', 'Adventure Time'].map(function (g) {
      return '<button class="chip' + (g === projFilter ? ' is-active' : '') + '" data-pf="' + g + '">' + g + '</button>';
    }).join('');
  }
  $('#projChips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pf]'); if (!b) return;
    projFilter = b.dataset.pf; renderProjChips(); renderProjGrid();
  });
  $('#projSort').addEventListener('change', function () { projSortBy = this.value; renderProjGrid(); });

  function renderProjGrid() {
    var list = PROJECTS.filter(function (p) {
      if (projFilter === 'All') return true;
      if (projFilter === 'Adventure Time') return !!p.series;
      return DIFF[p.difficulty] === projFilter;
    }).slice();
    list.sort(function (a, b) {
      if (projSortBy === 'fewest') return a.palette.length - b.palette.length || a.difficulty - b.difficulty;
      if (projSortBy === 'hard') return b.difficulty - a.difficulty || b.palette.length - a.palette.length;
      return a.difficulty - b.difficulty || a.palette.length - b.palette.length;
    });
    $('#projGrid').innerHTML = list.map(function (p) {
      return '<button class="proj-card" data-proj="' + p.id + '">' +
        '<span class="proj-thumb">' + artSvg(p, { mode: 'color' }) + '</span>' +
        '<span class="proj-body">' +
        (p.series ? '<span class="proj-series">' + esc(p.series) + '</span>' : '') +
        '<span class="proj-title">' + esc(p.title) + '</span>' +
        '<span class="proj-meta"><span class="diff d' + p.difficulty + '">' + DIFF[p.difficulty] + '</span>' +
        '<span>' + p.palette.length + ' colors</span><span>' + esc(p.time) + '</span></span>' +
        '<span class="proj-check" data-check="' + p.id + '">' + checkHtml(p) + '</span>' +
        '</span></button>';
    }).join('');
  }
  $('#projGrid').addEventListener('click', function (e) {
    var b = e.target.closest('[data-proj]'); if (!b) return;
    openProject(b.dataset.proj);
  });

  function openProject(id) {
    var p = projById(id); if (!p) return;
    analyze(p);
    openProj = p;
    projView.highlight = 0; projView.mode = 'color';
    try { history.replaceState(null, '', '#project=' + p.id); } catch (e) { /* ignore */ }
    $('#projList').hidden = true; $('#projMaker').hidden = true; $('#projDetail').hidden = false;
    renderDetail();
    loadProjRecipes(p);
    window.scrollTo({ top: 0 });
  }
  function closeProject() {
    openProj = null;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
    $('#projDetail').hidden = true; $('#projList').hidden = false;
    renderProjGrid();
  }

  var SIZES = [[20, '20 × 20 cm (8 × 8 in)'], [25, '25 × 25 cm (10 × 10 in)'], [30, '30 × 30 cm (12 × 12 in)'],
    [40, '40 × 40 cm (16 × 16 in)'], [21, 'A4 paper (a 21 × 21 cm square)']];

  function gridText() {
    var n = projView.gridN, cm = projView.size / n, inch = cm / 2.54;
    return 'Draw a ' + n + ' × ' + n + ' grid on your canvas: a light pencil line every <b>' +
      (Math.round(cm * 10) / 10) + ' cm</b> (' + (Math.round(inch * 100) / 100) + ' in) across and down.';
  }

  function renderArt() {
    var p = openProj; if (!p) return;
    $('#artBox').innerHTML = artSvg(p, {
      mode: projView.mode, labels: p._labels, highlight: projView.highlight,
      grid: projView.mode !== 'color' && projView.grid ? projView.gridN : 0
    });
    $$('[data-view]').forEach(function (b) { b.classList.toggle('is-active', b.dataset.view === projView.mode); });
    $('#gridTools').hidden = projView.mode === 'color';
    $('#gridHelp').hidden = !projView.grid;
    $('#gridHelp').innerHTML = gridText();
    $$('.pcolor').forEach(function (row) { row.classList.toggle('is-on', +row.dataset.color === projView.highlight); });
    $('#hlNote').innerHTML = projView.highlight
      ? 'Showing where color <b>' + projView.highlight + '</b> goes. <button class="link-btn" data-clear-hl>Show all</button>'
      : 'Tip: tap a color to see everywhere it goes.';
  }

  function renderDetail() {
    var p = openProj;
    var html = '<button class="link-btn back-link" data-back>← All projects</button>' +
      '<div class="pd-layout"><div class="pd-art">' +
      '<div class="seg" role="tablist"><button class="seg-btn" data-view="color">Finished look</button>' +
      '<button class="seg-btn" data-view="numbers">Numbers</button></div>' +
      '<div class="art-box card" id="artBox"></div>' +
      '<div class="art-tools" id="gridTools">' +
      '<label class="tool-check"><input type="checkbox" id="gridToggle"' + (projView.grid ? ' checked' : '') + '> Show grid</label>' +
      '<label class="tool-sel">Squares <select id="gridN">' + [3, 4, 5, 6].map(function (n) {
        return '<option value="' + n + '"' + (n === projView.gridN ? ' selected' : '') + '>' + n + ' × ' + n + '</option>';
      }).join('') + '</select></label>' +
      '<label class="tool-sel">My canvas <select id="canvasSize">' + SIZES.map(function (s) {
        return '<option value="' + s[0] + '"' + (s[0] === projView.size ? ' selected' : '') + '>' + s[1] + '</option>';
      }).join('') + '</select></label>' +
      '<p class="grid-help" id="gridHelp"></p></div>' +
      '<p class="hl-note" id="hlNote"></p>' +
      '<div class="art-actions"><button class="btn btn-primary" data-trace>Tracing mode</button>' +
      '<button class="btn btn-ghost" data-share-proj>Share project</button></div>' +
      '</div><div class="pd-info">' +
      (p.series ? '<p class="proj-series">' + esc(p.series) + '</p>' : '') +
      '<h2 class="pd-title">' + esc(p.title) + '</h2>' +
      '<div class="proj-meta"><span class="diff d' + p.difficulty + '">' + DIFF[p.difficulty] + '</span><span>' + p.palette.length +
      ' colors</span><span>' + esc(p.time) + '</span></div>' +
      '<p class="pd-blurb">' + esc(p.blurb) + '</p>' +
      '<h3 class="pd-h">Colors and how to mix them</h3>' +
      '<p class="pd-sub" id="projSummary">Working out recipes from your paints…</p>' +
      '<ul class="pcolors">' + p.palette.map(function (col, i) {
        var n = i + 1;
        return '<li class="pcolor" data-color="' + n + '"><button class="pcolor-main" data-hl="' + n + '">' +
          '<span class="pnum">' + n + '</span><span class="blob" style="background:' + col[1] + '"></span>' +
          '<span class="pcolor-text"><span class="pcolor-name">' + esc(col[0]) + '</span>' +
          '<span class="pcolor-amt">Covers ' + Math.max(1, Math.round((p._area[n] || 0) * 100)) + '% of the picture · you need ' + amountWord(p._area[n] || 0) + '</span></span></button>' +
          '<div class="precipe" id="precipe-' + n + '"><span class="spinner sm"></span> Finding a mix…</div></li>';
      }).join('') + '</ul>' +
      '<h3 class="pd-h">Before you paint</h3><ol class="steps">' +
      '<li>Draw the lines on your canvas. Use the <b>grid</b> (tap <b>Numbers</b>, then <b>Show grid</b>) or <b>Tracing mode</b>. See “How it works” on the projects page for details.</li>' +
      '<li>Write each area’s number lightly in pencil.</li>' +
      '<li>Mix all the colors on a plate using the recipes above.</li></ol>' +
      '<h3 class="pd-h">Painting steps</h3><ol class="steps">' + p.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      (p.series ? '<p class="hint">Non-commercial fan art for personal use, which we consider fair use. Adventure Time and its characters belong to Cartoon Network. Please don’t sell paintings made from it.</p>' : '') +
      '</div></div>';
    $('#projDetail').innerHTML = html;
    renderArt();
    renderProjRecipes();
  }

  function loadProjRecipes(p) {
    var token = ++projRecipeToken;
    projRecipes = {};
    p.palette.forEach(function (col, i) {
      projSolve(col[1], 3, function (r) {
        if (token !== projRecipeToken || openProj !== p) return;
        projRecipes[i + 1] = r[0] || null;
        renderProjRecipes();
      });
    });
    renderProjRecipes();
  }

  function recipeLine(r) {
    var items = r.items.map(function (i) { return { paint: BY_ID[i.id], parts: i.parts }; })
      .filter(function (i) { return i.paint; })
      .sort(function (a, b) { return b.parts - a.parts; });
    if (items.length === 1) return 'Use <b>' + esc(items[0].paint.name) + '</b> straight from the tube';
    return 'Mix ' + items.map(function (i) {
      return '<span class="rpart"><span class="dot" style="background:' + i.paint.displayHex + '"></span><b>' + i.parts + '</b> ' + esc(i.paint.name) + '</span>';
    }).join(' + ');
  }

  function renderProjRecipes() {
    var p = openProj; if (!p || $('#projDetail').hidden) return;
    var done = 0, good = 0;
    p.palette.forEach(function (col, i) {
      var n = i + 1, el = $('#precipe-' + n); if (!el) return;
      if (!(n in projRecipes)) return;
      done++;
      var r = projRecipes[n];
      if (!r) { el.innerHTML = 'No recipe found.'; return; }
      var m = PM.matchLabel(r.dE);
      if (r.dE < 8) good++;
      el.innerHTML = '<div class="rline">' + recipeLine(r) + '</div>' +
        '<div class="rmeta"><span class="rmatch l' + m.level + '">' + esc(m.text) + '</span>' +
        '<button class="link-btn" data-fullrecipe="' + n + '">More options</button></div>' +
        (r.dE >= 8 ? '<div class="rwarn">Your paints can’t make this exactly. This is the closest mix, or pick a similar color you like.</div>' : '');
    });
    var sum = $('#projSummary');
    if (!sum) return;
    if (done < p.palette.length) sum.innerHTML = '<span class="spinner sm"></span> Working out recipes from your paints… (' + done + ' of ' + p.palette.length + ')';
    else if (good === p.palette.length) sum.innerHTML = '<span class="chk ok">✓ You can mix every color with your paints.</span> Parts are equal amounts: drops, spoonfuls or brush-loads.';
    else sum.innerHTML = '<span class="chk part">You can mix ' + good + ' of ' + p.palette.length + ' colors closely.</span> Tick more paints in <button class="link-btn" data-goto-paints>My paints</button> for better matches.';
  }

  $('#projDetail').addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-back]')) { closeProject(); return; }
    var v = t.closest('[data-view]');
    if (v) { projView.mode = v.dataset.view; renderArt(); return; }
    var hl = t.closest('[data-hl]');
    if (hl) {
      var n = +hl.dataset.hl;
      projView.highlight = projView.highlight === n ? 0 : n;
      projView.mode = 'numbers'; renderArt();
      if (window.matchMedia('(max-width: 960px)').matches) $('#artBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (t.closest('[data-clear-hl]')) { projView.highlight = 0; renderArt(); return; }
    if (t.closest('[data-trace]')) { openTrace(); return; }
    if (t.closest('[data-share-proj]')) { copy(location.href, 'Link copied, ready to send'); return; }
    if (t.closest('[data-goto-paints]')) { showTab('paints'); return; }
    var fr = t.closest('[data-fullrecipe]');
    if (fr) {
      var col = openProj.palette[+fr.dataset.fullrecipe - 1];
      showTab('find');
      selectTarget({ name: col[0] + ' (' + openProj.title + ')', hex: col[1] }, true);
    }
  });
  $('#projDetail').addEventListener('change', function (e) {
    if (e.target.id === 'gridToggle') { projView.grid = e.target.checked; renderArt(); }
    if (e.target.id === 'gridN') { projView.gridN = +e.target.value; projView.grid = true; $('#gridToggle').checked = true; renderArt(); }
    if (e.target.id === 'canvasSize') { projView.size = +e.target.value; store('canvasSize', projView.size); renderArt(); }
  });

  // ---------- Make a paint-by-number from any picture ----------
  var MK_SIZES = [[40, 50, '40 × 50 cm (16 × 20 in), most kits'], [30, 40, '30 × 40 cm (12 × 16 in)'], [20, 25, '20 × 25 cm (8 × 10 in)'],
    [20, 20, '20 × 20 cm (8 × 8 in)'], [30, 30, '30 × 30 cm (12 × 12 in)'], [21, 29.7, 'A4 paper (21 × 29.7 cm)']];
  var MK_DETAIL = {
    simple: { long: 260, minArea: 90, blur: 2, smooth: 2, hint: 'Big areas, quicker to paint. A good first try.' },
    medium: { long: 360, minArea: 60, blur: 1, smooth: 2, hint: 'A good balance, like an easier store kit.' },
    detailed: { long: 480, minArea: 40, blur: 1, smooth: 1, hint: 'Lots of small areas, like your store-bought kit. Takes many hours.' }
  };
  var mk = { img: null, size: 0, orient: 'portrait', detail: 'medium', colors: 16, mine: true, busy: false };
  var saved0 = store('makerSettings');
  if (saved0 && typeof saved0 === 'object') {
    if (MK_SIZES[saved0.size]) mk.size = saved0.size;
    if (saved0.orient === 'landscape') mk.orient = 'landscape';
    if (MK_DETAIL[saved0.detail]) mk.detail = saved0.detail;
    if ([8, 12, 16, 24].indexOf(saved0.colors) !== -1) mk.colors = saved0.colors;
    if (saved0.mine === false) mk.mine = false;
  }
  var gen = null, genView = { mode: 'numbers', grid: false, cell: 5, highlight: 0 };
  var genToken = 0;

  function mkCanvasCm() {
    var s = MK_SIZES[mk.size], a = s[0], b = s[1];
    return mk.orient === 'landscape' ? [Math.max(a, b), Math.min(a, b)] : [Math.min(a, b), Math.max(a, b)];
  }
  function renderMakerSettings() {
    $('#mkSize').innerHTML = MK_SIZES.map(function (s, i) { return '<option value="' + i + '"' + (i === mk.size ? ' selected' : '') + '>' + s[2] + '</option>'; }).join('');
    var square = MK_SIZES[mk.size][0] === MK_SIZES[mk.size][1];
    $('#mkOrient').hidden = square;
    $$('#mkOrient [data-orient]').forEach(function (b) { b.classList.toggle('is-active', b.dataset.orient === mk.orient); });
    $$('#mkDetail [data-detail]').forEach(function (b) { b.classList.toggle('is-active', b.dataset.detail === mk.detail); });
    $$('#mkColors [data-colors]').forEach(function (b) { b.classList.toggle('is-active', +b.dataset.colors === mk.colors); });
    $('#mkDetailHint').textContent = MK_DETAIL[mk.detail].hint;
    $('#mkMine').checked = mk.mine;
    $('#mkGo').disabled = !mk.img || mk.busy;
    store('makerSettings', { size: mk.size, orient: mk.orient, detail: mk.detail, colors: mk.colors, mine: mk.mine });
  }
  $('#mkSize').addEventListener('change', function () { mk.size = +this.value; renderMakerSettings(); renderMkThumb(); });
  $('#mkOrient').addEventListener('click', function (e) { var b = e.target.closest('[data-orient]'); if (b) { mk.orient = b.dataset.orient; renderMakerSettings(); renderMkThumb(); } });
  $('#mkDetail').addEventListener('click', function (e) { var b = e.target.closest('[data-detail]'); if (b) { mk.detail = b.dataset.detail; renderMakerSettings(); } });
  $('#mkColors').addEventListener('click', function (e) { var b = e.target.closest('[data-colors]'); if (b) { mk.colors = +b.dataset.colors; renderMakerSettings(); } });
  $('#mkMine').addEventListener('change', function () { mk.mine = this.checked; renderMakerSettings(); });

  function openMaker() {
    $('#projList').hidden = true; $('#projDetail').hidden = true; $('#projMaker').hidden = false;
    renderMakerSettings();
    window.scrollTo({ top: 0 });
  }
  function closeMaker() {
    $('#projMaker').hidden = true; $('#projList').hidden = false;
    renderSaved();
  }
  $('#openMaker').addEventListener('click', openMaker);
  $('#projMaker').addEventListener('click', function (e) { if (e.target.closest('[data-maker-back]')) closeMaker(); });

  function onMkFile(e) {
    var file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    if (file.type && file.type.indexOf('image/') !== 0) { toast('That file is not a picture'); return; }
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      mk.img = img;
      mk.name = (file.name || 'My picture').replace(/\.[a-z0-9]+$/i, '').slice(0, 30);
      renderMakerSettings(); renderMkThumb();
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast('Could not open that picture. Try a JPG or PNG.'); };
    img.src = url;
  }
  $('#mkCam').addEventListener('change', onMkFile);
  $('#mkFile').addEventListener('change', onMkFile);

  // The part of the picture that fits the canvas shape (cut from the middle)
  function cropRect(img) {
    var cm = mkCanvasCm(), r = cm[0] / cm[1], iw = img.naturalWidth, ih = img.naturalHeight;
    if (iw / ih > r) { var w = ih * r; return [(iw - w) / 2, 0, w, ih]; }
    var h = iw / r; return [0, (ih - h) / 2, iw, h];
  }
  function renderMkThumb() {
    var box = $('#mkThumb');
    if (!mk.img) { box.hidden = true; return; }
    var c = cropRect(mk.img), cv = document.createElement('canvas'), tw = 240;
    cv.width = tw; cv.height = Math.round(tw * c[3] / c[2]);
    cv.getContext('2d').drawImage(mk.img, c[0], c[1], c[2], c[3], 0, 0, cv.width, cv.height);
    box.hidden = false; box.innerHTML = '';
    box.appendChild(cv);
    box.insertAdjacentHTML('beforeend', '<span class="mk-thumb-note">This part of your picture fits your canvas.</span>');
  }

  function setMkStatus(msg) {
    $('#mkResult').innerHTML = '<div class="mk-empty card"><div class="loading"><span class="spinner"></span>' + esc(msg) + '</div></div>';
  }

  $('#mkGo').addEventListener('click', function () {
    if (!mk.img || mk.busy) return;
    mk.busy = true; renderMakerSettings();
    var token = ++genToken, d = MK_DETAIL[mk.detail], cm = mkCanvasCm();
    setMkStatus('Finding the main colors in your picture…');
    setTimeout(function () {
      var c = cropRect(mk.img), w, h;
      if (cm[0] >= cm[1]) { w = d.long; h = Math.round(d.long * cm[1] / cm[0]); } else { h = d.long; w = Math.round(d.long * cm[0] / cm[1]); }
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      var ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(mk.img, c[0], c[1], c[2], c[3], 0, 0, w, h);
      var res;
      try { res = PBN.process(ctx.getImageData(0, 0, w, h).data, w, h, { colors: mk.colors, minArea: d.minArea, blur: d.blur, smooth: d.smooth }); }
      catch (err) { mk.busy = false; renderMakerSettings(); setMkStatus('Something went wrong reading that picture.'); return; }
      var hexes = res.palette.map(function (p) { return PM.rgbToHex(p); });
      var recipes = [], done = 0;
      setMkStatus('Working out how to mix ' + hexes.length + ' colors from your paints… (0 of ' + hexes.length + ')');
      hexes.forEach(function (hx, i) {
        projSolve(hx, 3, function (r) {
          if (token !== genToken) return;
          recipes[i] = r[0] || null; done++;
          if (done < hexes.length) { setMkStatus('Working out how to mix ' + hexes.length + ' colors from your paints… (' + done + ' of ' + hexes.length + ')'); return; }
          finishGen(res, hexes, recipes, cm, d);
        });
      });
    }, 30);
  });

  function finishGen(res, hexes, recipes, cm, d) {
    var colors = hexes.map(function (hx, i) {
      return { hex: mk.mine && recipes[i] ? recipes[i].hex : hx, picture: hx, recipe: recipes[i] };
    });
    if (mk.mine) {
      // colors that became (almost) the same mix are merged into one number
      res.palette = colors.map(function (c) { return PM.hexToRgb(c.hex); });
      res = PBN.remap(res, res.palette, function (a, b) { return PM.dE2000(PM.hexToLab(PM.rgbToHex(a)), PM.hexToLab(PM.rgbToHex(b))) < 3; });
      colors = res.extra.map(function (orig) { return colors[orig]; });
    }
    gen = buildGen({
      title: mk.name || 'My picture', w: res.w, h: res.h, labels: res.labels, colors: colors,
      cm: cm, detail: mk.detail, mine: mk.mine, key: paintsKey(), savedId: null
    });
    mk.busy = false; renderMakerSettings();
    renderGen();
    if (window.matchMedia('(max-width: 960px)').matches) $('#mkResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function buildGen(g) {
    g.s = Math.max(2, Math.round(1500 / Math.max(g.w, g.h)));
    g.W = g.w * g.s; g.H = g.h * g.s;
    g.up = PBN.upscale(g.labels, g.w, g.h, g.s);
    g.spots = PBN.numberSpots(g.labels, g.w, g.h);
    g.area = g.colors.map(function () { return 0; });
    for (var i = 0; i < g.labels.length; i++) g.area[g.labels[i]]++;
    g.area = g.area.map(function (a) { return a / g.labels.length; });
    g.areas = g.spots.length;
    g.difficulty = g.areas < 150 ? 1 : (g.areas < 450 ? 2 : 3);
    var mins = 30 + g.areas * 1.2;
    g.time = mins < 90 ? 'About ' + Math.round(mins / 15) * 15 + ' minutes' : 'About ' + Math.round(mins / 60) + ' hours';
    return g;
  }

  // Draw the generated picture: mode 'color' (finished look) or 'numbers' (lines + numbers)
  function drawGen(cv, mode, o) {
    var g = gen; o = o || {};
    cv.width = g.W; cv.height = g.H + (o.legend ? legendHeight() : 0);
    var ctx = cv.getContext('2d'), img = ctx.createImageData(g.W, g.H), d = img.data, up = g.up, W = g.W, H = g.H;
    var rgb = g.colors.map(function (c) { return PM.hexToRgb(c.hex); });
    var hl = o.highlight ? o.highlight - 1 : -1;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var i = y * W + x, l = up[i], p = i * 4, col;
        if (mode === 'color') col = rgb[l];
        else {
          var edge = (x < W - 1 && up[i + 1] !== l) || (y < H - 1 && up[i + W] !== l) || (x > 0 && up[i - 1] !== l) || (y > 0 && up[i - W] !== l);
          col = edge ? [140, 130, 121] : (l === hl ? rgb[l] : [255, 255, 255]);
        }
        d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2]; d[p + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    if (mode !== 'color' && o.nums !== false) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      g.spots.forEach(function (s) {
        var size = Math.max(8, Math.min(30, s.d * g.s * 1.05));
        ctx.font = '600 ' + Math.round(size) + 'px "DM Sans", sans-serif';
        ctx.fillStyle = s.label === hl ? '#2A2420' : '#8C8279';
        ctx.fillText(String(s.label + 1), (s.x + 0.5) * g.s, (s.y + 0.5) * g.s + 1);
      });
    }
    if (o.grid) drawGrid(ctx, g, genView.cell);
    if (o.legend) drawLegend(ctx, g);
  }
  function drawGrid(ctx, g, cellCm) {
    var pxPerCm = g.W / g.cm[0], step = cellCm * pxPerCm, cols = Math.ceil(g.cm[0] / cellCm), rows = Math.ceil(g.cm[1] / cellCm);
    ctx.save();
    ctx.strokeStyle = 'rgba(47,127,214,.75)'; ctx.lineWidth = Math.max(2, g.W / 700);
    ctx.fillStyle = 'rgba(47,127,214,.95)'; ctx.font = '700 ' + Math.round(Math.max(14, step * 0.16)) + 'px "DM Sans", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 1; i < cols; i++) { ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, g.H); ctx.stroke(); }
    for (var j = 1; j < rows; j++) { ctx.beginPath(); ctx.moveTo(0, j * step); ctx.lineTo(g.W, j * step); ctx.stroke(); }
    for (i = 0; i < cols; i++) ctx.fillText(String.fromCharCode(65 + (i % 26)), Math.min(g.W - 10, i * step + step / 2), 14);
    for (j = 0; j < rows; j++) ctx.fillText(String(j + 1), 12, Math.min(g.H - 10, j * step + step / 2));
    ctx.restore();
  }
  function legendHeight() { return Math.ceil(gen.colors.length / 4) * 70 + 30; }
  function drawLegend(ctx, g) {
    var top = g.H + 20, colW = g.W / 4;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, g.H, g.W, legendHeight());
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    g.colors.forEach(function (c, i) {
      var x = (i % 4) * colW + 20, y = top + Math.floor(i / 4) * 70 + 25;
      ctx.fillStyle = c.hex; ctx.beginPath(); ctx.arc(x + 22, y, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8C8279'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#2A2420'; ctx.font = '700 26px "DM Sans", sans-serif';
      ctx.fillText(String(i + 1), x + 56, y - 10);
      ctx.font = '500 18px "DM Sans", sans-serif'; ctx.fillStyle = '#6B615A';
      ctx.fillText(nearestName(c.hex).color.name + ' ' + c.hex, x + 56, y + 16);
    });
  }

  function renderGen() {
    var g = gen; if (!g) return;
    var cellOpts = [2.5, 5, 10];
    var html = '<div class="gen card">' +
      '<div class="gen-head"><input class="gen-title" id="genTitle" value="' + esc(g.title) + '" maxlength="40" aria-label="Picture name">' +
      '<div class="proj-meta"><span class="diff d' + g.difficulty + '">' + DIFF[g.difficulty] + '</span><span>' + g.areas + ' areas</span>' +
      '<span>' + g.colors.length + ' colors</span><span>' + esc(g.time) + '</span><span>' + g.cm[0] + ' × ' + g.cm[1] + ' cm</span></div></div>' +
      '<div class="seg" role="tablist"><button class="seg-btn" data-gview="color">Finished look</button><button class="seg-btn" data-gview="numbers">Numbers</button></div>' +
      '<div class="gen-canvas-wrap"><canvas id="genCanvas"></canvas></div>' +
      '<div class="art-tools" id="genGridTools"><label class="tool-check"><input type="checkbox" id="genGrid"' + (genView.grid ? ' checked' : '') + '> Show grid</label>' +
      '<label class="tool-sel">Squares every <select id="genCell">' + cellOpts.map(function (c) { return '<option value="' + c + '"' + (c === genView.cell ? ' selected' : '') + '>' + c + ' cm</option>'; }).join('') + '</select></label>' +
      '<p class="grid-help" id="genGridHelp"></p></div>' +
      '<p class="hl-note" id="genHl"></p>' +
      '<div class="art-actions"><button class="btn btn-primary" data-gtrace>Tracing mode</button>' +
      '<button class="btn btn-ghost" data-gsave>' + (g.savedId ? 'Saved ✓' : 'Save to My pictures') + '</button>' +
      '<button class="btn btn-ghost" data-gdl="numbers">Download numbers sheet</button>' +
      '<button class="btn btn-ghost" data-gdl="color">Download finished look</button></div>' +
      '</div>' +
      '<div class="gen card"><h3 class="pd-h">Colors and how to mix them</h3>' +
      '<p class="pd-sub">' + (g.mine ? 'These colors were picked so you can mix every one from your paints.' : 'These are the picture’s own colors. Some may be hard to mix exactly.') +
      ' Number 1 is the lightest. Tap a color to see where it goes.</p>' +
      '<ul class="pcolors">' + g.colors.map(function (c, i) {
        var n = i + 1, r = c.recipe, m = r ? PM.matchLabel(PM.dE2000(PM.hexToLab(c.hex), PM.hexToLab(r.hex))) : null;
        return '<li class="pcolor" data-gcolor="' + n + '"><button class="pcolor-main" data-ghl="' + n + '">' +
          '<span class="pnum">' + n + '</span><span class="blob" style="background:' + c.hex + '"></span>' +
          '<span class="pcolor-text"><span class="pcolor-name">' + esc(nearestName(c.hex).color.name) + ' <small>' + c.hex + '</small></span>' +
          '<span class="pcolor-amt">Covers ' + Math.max(1, Math.round(g.area[i] * 100)) + '% · you need ' + amountWord(g.area[i]) + '</span></span></button>' +
          '<div class="precipe">' + (r ? '<div class="rline">' + recipeLine(r) + '</div>' +
            (!g.mine ? '<div class="rmeta"><span class="rmatch l' + m.level + '">' + esc(m.text) + '</span></div>' : '') : 'No recipe found.') + '</div></li>';
      }).join('') + '</ul></div>' +
      '<div class="gen card"><h3 class="pd-h">How to paint it</h3><ol class="steps">' +
      '<li><b>Draw the lines.</b> Use <b>Tracing mode</b>: zoom in and trace one part at a time, using the grid to line the parts up. Or draw the grid on your canvas and copy square by square. Small squares (2.5 cm) make detailed pictures much easier.</li>' +
      '<li><b>Write the numbers</b> small and light in pencil as you go.</li>' +
      '<li><b>Mix the colors.</b> Put each one in its own spot and write its number next to it. Bottle caps or an egg carton make great paint cups. Cover them with plastic wrap between sessions.</li>' +
      '<li><b>Paint one color at a time</b>, everywhere it appears. Start with 1 (lightest) and finish with ' + g.colors.length + ' (darkest).</li>' +
      '<li><b>Fix and finish.</b> Add a second coat where pencil or numbers show through, and touch up the edges with a small brush.</li>' +
      '</ol><p class="hint">Download the numbers sheet to keep it on a tablet or print it later. Pictures you save stay on this device.</p></div>';
    $('#mkResult').innerHTML = html;
    renderGenArt();
  }
  function renderGenArt() {
    var g = gen; if (!g || !$('#genCanvas')) return;
    drawGen($('#genCanvas'), genView.mode, { highlight: genView.highlight, grid: genView.mode === 'numbers' && genView.grid });
    $$('[data-gview]').forEach(function (b) { b.classList.toggle('is-active', b.dataset.gview === genView.mode); });
    $('#genGridTools').hidden = genView.mode === 'color';
    var cols = Math.ceil(g.cm[0] / genView.cell), rows = Math.ceil(g.cm[1] / genView.cell);
    $('#genGridHelp').hidden = !genView.grid;
    $('#genGridHelp').innerHTML = 'Draw a light pencil line every <b>' + genView.cell + ' cm</b> across and down your ' + g.cm[0] + ' × ' + g.cm[1] + ' cm canvas (' + cols + ' × ' + rows + ' squares).';
    $$('[data-gcolor]').forEach(function (row) { row.classList.toggle('is-on', +row.dataset.gcolor === genView.highlight); });
    $('#genHl').innerHTML = genView.highlight
      ? 'Showing where color <b>' + genView.highlight + '</b> goes. <button class="link-btn" data-gclear>Show all</button>'
      : 'Tip: tap a color in the list to see everywhere it goes.';
  }

  $('#mkResult').addEventListener('click', function (e) {
    var t = e.target, g = gen; if (!g) return;
    var v = t.closest('[data-gview]');
    if (v) { genView.mode = v.dataset.gview; renderGenArt(); return; }
    var hl = t.closest('[data-ghl]');
    if (hl) {
      var n = +hl.dataset.ghl;
      genView.highlight = genView.highlight === n ? 0 : n; genView.mode = 'numbers'; renderGenArt();
      if (window.matchMedia('(max-width: 960px)').matches) $('#genCanvas').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (t.closest('[data-gclear]')) { genView.highlight = 0; renderGenArt(); return; }
    if (t.closest('[data-gtrace]')) { openTrace('gen'); return; }
    if (t.closest('[data-gsave]')) { saveGen(); return; }
    var dl = t.closest('[data-gdl]');
    if (dl) {
      var cv = document.createElement('canvas');
      drawGen(cv, dl.dataset.gdl, { legend: true, grid: dl.dataset.gdl === 'numbers' && genView.grid });
      cv.toBlob(function (blob) {
        if (!blob) { toast('Could not make the image'); return; }
        var a = document.createElement('a'), u = URL.createObjectURL(blob);
        a.href = u; a.download = (g.title || 'paint-by-number').replace(/[^a-z0-9 _-]/gi, '') + (dl.dataset.gdl === 'numbers' ? ' - numbers.png' : ' - finished look.png');
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 5000);
      }, 'image/png');
    }
  });
  $('#mkResult').addEventListener('change', function (e) {
    if (!gen) return;
    if (e.target.id === 'genGrid') { genView.grid = e.target.checked; renderGenArt(); }
    if (e.target.id === 'genCell') { genView.cell = +e.target.value; genView.grid = true; $('#genGrid').checked = true; renderGenArt(); }
    if (e.target.id === 'genTitle') {
      gen.title = e.target.value.trim().slice(0, 40) || 'My picture'; e.target.value = gen.title;
      if (gen.savedId) saveGen(true);
    }
  });

  // ---------- Saved pictures ----------
  function loadSaved() { var s = store('myPictures'); return Array.isArray(s) ? s : []; }
  function saveGen(quiet) {
    var g = gen; if (!g) return;
    var list = loadSaved();
    var rec = {
      id: g.savedId || 'pic-' + Date.now().toString(36), title: g.title, w: g.w, h: g.h, cm: g.cm, detail: g.detail, mine: g.mine,
      key: g.key, created: Date.now(), rle: PBN.rleEncode(g.labels),
      colors: g.colors.map(function (c) { return { hex: c.hex, picture: c.picture, recipe: c.recipe ? { hex: c.recipe.hex, dE: c.recipe.dE, total: c.recipe.total, items: c.recipe.items } : null }; })
    };
    list = list.filter(function (x) { return x.id !== rec.id; });
    list.unshift(rec);
    try { localStorage.setItem('myPictures', JSON.stringify(list.slice(0, 20))); }
    catch (err) { toast('Not enough space to save. Delete an old picture first.'); return; }
    g.savedId = rec.id;
    if (!quiet) { toast('Saved to My pictures'); renderGen(); }
  }
  function renderSaved() {
    var list = loadSaved();
    $('#savedSection').hidden = !list.length;
    $('#savedGrid').innerHTML = list.map(function (rec) {
      var areasNote = rec.detail ? rec.detail.charAt(0).toUpperCase() + rec.detail.slice(1) + ' detail' : '';
      var src = savedThumb(rec);
      return '<div class="proj-card saved-card"><button class="saved-open" data-open-saved="' + esc(rec.id) + '">' +
        '<span class="proj-thumb">' + (src ? '<img alt="" src="' + src + '">' : '') + '</span>' +
        '<span class="proj-body"><span class="proj-title">' + esc(rec.title) + '</span>' +
        '<span class="proj-meta"><span>' + rec.colors.length + ' colors</span><span>' + esc(areasNote) + '</span><span>' + rec.cm[0] + ' × ' + rec.cm[1] + ' cm</span></span></span></button>' +
        '<button class="icon-btn saved-del" data-del-saved="' + esc(rec.id) + '" aria-label="Delete ' + esc(rec.title) + '" title="Delete">×</button></div>';
    }).join('');
  }
  // Small preview image of a saved picture (null if it can't be drawn)
  function savedThumb(rec) {
    try {
      var labels = PBN.rleDecode(rec.rle, rec.w * rec.h), cv = document.createElement('canvas');
      cv.width = rec.w; cv.height = rec.h;
      var ctx = cv.getContext('2d'), im = ctx.createImageData(rec.w, rec.h), rgb = rec.colors.map(function (c) { return PM.hexToRgb(c.hex); });
      for (var i = 0; i < labels.length; i++) { var c = rgb[labels[i]] || [255, 255, 255]; im.data[i * 4] = c[0]; im.data[i * 4 + 1] = c[1]; im.data[i * 4 + 2] = c[2]; im.data[i * 4 + 3] = 255; }
      ctx.putImageData(im, 0, 0);
      return cv.toDataURL('image/jpeg', 0.8);
    } catch (err) { return null; }
  }
  $('#savedGrid').addEventListener('click', function (e) {
    var del = e.target.closest('[data-del-saved]');
    if (del) {
      var rec = loadSaved().filter(function (x) { return x.id === del.dataset.delSaved; })[0];
      if (!rec || !window.confirm('Delete "' + rec.title + '"? This can’t be undone.')) return;
      try { localStorage.setItem('myPictures', JSON.stringify(loadSaved().filter(function (x) { return x.id !== rec.id; }))); } catch (err) { /* ignore */ }
      renderSaved(); toast('Picture deleted');
      return;
    }
    var op = e.target.closest('[data-open-saved]');
    if (op) openSaved(op.dataset.openSaved);
  });
  function openSaved(id) {
    var rec = loadSaved().filter(function (x) { return x.id === id; })[0]; if (!rec) return;
    var labels;
    try { labels = PBN.rleDecode(rec.rle, rec.w * rec.h); } catch (err) { toast('That picture could not be opened'); return; }
    gen = buildGen({
      title: rec.title, w: rec.w, h: rec.h, labels: labels, cm: rec.cm, detail: rec.detail, mine: rec.mine, key: rec.key, savedId: rec.id,
      colors: rec.colors.map(function (c) { return { hex: c.hex, picture: c.picture, recipe: c.recipe }; })
    });
    genView.highlight = 0;
    openMaker();
    renderGen();
    // paints changed since saving? refresh the recipes
    if (rec.key !== paintsKey()) {
      var g = gen, done = 0;
      g.colors.forEach(function (c, i) {
        projSolve(c.hex, 3, function (r) {
          if (gen !== g) return;
          c.recipe = r[0] || null; done++;
          if (done === g.colors.length) { g.key = paintsKey(); renderGen(); }
        });
      });
    }
  }

  // ---------- Tracing mode ----------
  var ZOOMS = [1, 1.5, 2, 3, 4];
  var traceSource = 'project';
  function renderTrace() {
    var availW = window.innerWidth - 16, availH = window.innerHeight - 120;
    if (traceSource === 'gen' && gen) {
      var ratio = gen.W / gen.H, bw = Math.min(availW, availH * ratio);
      var cv = document.createElement('canvas');
      drawGen(cv, 'numbers', { nums: traceState.nums, grid: traceState.grid });
      cv.style.width = Math.round(bw * traceState.zoom) + 'px';
      cv.className = 'trace-canvas';
      $('#traceArea').innerHTML = '';
      $('#traceArea').appendChild(cv);
    } else {
      var p = openProj; if (!p) return;
      var wpx = Math.round(Math.min(availW, availH) * traceState.zoom);
      $('#traceArea').innerHTML = '<div class="trace-sheet" style="width:' + wpx + 'px;height:' + wpx + 'px">' +
        artSvg(p, { mode: traceState.nums ? 'numbers' : 'lines', labels: p._labels, grid: traceState.grid ? projView.gridN : 0 }) + '</div>';
    }
    $('#traceZoom').textContent = Math.round(traceState.zoom * 100) + '%';
  }
  function openTrace(source) {
    traceSource = source || 'project';
    $('#trace').hidden = false;
    document.body.classList.add('no-scroll');
    $('#traceGrid').checked = traceState.grid; $('#traceNums').checked = traceState.nums;
    renderTrace();
    try {
      if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; }, function () { /* ignore */ });
    } catch (e) { /* ignore */ }
  }
  function closeTrace() {
    $('#trace').hidden = true;
    document.body.classList.remove('no-scroll');
    try { if (wakeLock) wakeLock.release(); } catch (e) { /* ignore */ }
    wakeLock = null;
  }
  $('#traceClose').addEventListener('click', closeTrace);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#trace').hidden) closeTrace(); });
  $$('[data-zoom]').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = ZOOMS.indexOf(traceState.zoom) + (+b.dataset.zoom);
      traceState.zoom = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i))];
      renderTrace();
    });
  });
  $('#traceGrid').addEventListener('change', function () { traceState.grid = this.checked; renderTrace(); });
  $('#traceNums').addEventListener('change', function () { traceState.nums = this.checked; renderTrace(); });
  window.addEventListener('resize', function () { if (!$('#trace').hidden) renderTrace(); });

  // ---------- Start ----------
  renderOwned(); renderChips(); renderLibrary(); renderLab();
  renderProjChips(); renderProjGrid(); renderSaved();
  $('#result').classList.add('is-idle');
  // Check which projects the user's paints can make the first time they open Projects
  var checkedOnce = false;
  $$('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      if (t.dataset.tab === 'projects' && !checkedOnce) { checkedOnce = true; checkProjects(); }
    });
  });
  function fromHash() {
    var pm = /project=([a-z0-9-]+)/i.exec(location.hash);
    if (pm && projById(pm[1])) {
      if (openProj && openProj.id === pm[1]) return;
      showTab('projects');
      if (!checkedOnce) { checkedOnce = true; checkProjects(); }
      openProject(pm[1]);
      return;
    }
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
