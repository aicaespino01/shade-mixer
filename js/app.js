(function () {
  'use strict';

  var PM = window.PaintMix;
  var TUBES = window.PAINT_DATA.TUBES;
  var COLORS = window.PAINT_DATA.COLORS;
  var PAINTS = TUBES.map(PM.makePaint);
  var BY_ID = {};
  PAINTS.forEach(function (p) { BY_ID[p.id] = p; });
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
  var owned = store('ownedPaints');
  if (!Array.isArray(owned) || !owned.length) owned = PAINTS.map(function (p) { return p.id; });
  owned = owned.filter(function (id) { return BY_ID[id]; });

  function renderOwned() {
    var grid = $('#ownedGrid');
    grid.innerHTML = PAINTS.map(function (p) {
      return '<label class="owned"><input type="checkbox" value="' + p.id + '"' + (owned.indexOf(p.id) !== -1 ? ' checked' : '') + '>' +
        '<span class="blob" style="background:' + p.displayHex + '"></span>' +
        '<span><span class="owned-name">' + esc(p.name) + '</span></span></label>';
    }).join('');
    $('#paintCount').textContent = owned.length;
  }
  $('#ownedGrid').addEventListener('change', function () {
    var next = $$('#ownedGrid input:checked').map(function (i) { return i.value; });
    if (!next.length) { toast('Keep at least one paint ticked'); renderOwned(); return; }
    owned = next; store('ownedPaints', owned);
    $('#paintCount').textContent = owned.length;
    renderLab(); refreshResult();
  });
  $$('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () {
      owned = b.dataset.preset === 'basic'
        ? TUBES.filter(function (t) { return t.basic; }).map(function (t) { return t.id; })
        : PAINTS.map(function (p) { return p.id; });
      store('ownedPaints', owned); renderOwned(); renderLab(); refreshResult();
      toast(b.dataset.preset === 'basic' ? 'Using the basic 5 paints' : 'Using all paints');
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
    if (worker) { pending[id] = wrapped; worker.postMessage({ reqId: id, hex: hex, enabled: owned.slice() }); }
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
