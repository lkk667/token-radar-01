// Token Radar dashboard: renders window.RADAR (written by main.ts) with no network.
// Hash routing, so each view has a stable address:
//   #tab=board            the ranked board
//   #tab=live             live-token protocols at market values
//   #tab=model            the formula, the category multiples, the sandbox
//   #detail=<slug>        one protocol's detail view
//   #cat=<category>&wl=1  a filtered board view (also #q= and #chain=)
(function () {
  'use strict';
  var R = window.RADAR;
  var rows = R.rows;
  var bySlug = {};
  rows.forEach(function (r) { bySlug[r.slug] = r; });
  var watchlist = {};
  rows.forEach(function (r) { if (r.watchlist) watchlist[r.slug] = true; });

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function usd(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n;
  }
  function usdFull(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function pct(n) {
    if (n === null || n === undefined) return '<span class="flat">—</span>';
    var cls = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
    return '<span class="' + cls + '">' + (n > 0 ? '+' : '') + n.toFixed(1) + '%</span>';
  }
  function age(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 365) return (n / 365).toFixed(1) + 'y';
    return n + 'd';
  }
  function chains(r) {
    if (!r.chains || r.chains.length === 0) return '—';
    var first = r.chains.slice(0, 2).join(', ');
    return r.chains.length > 2 ? first + ' +' + (r.chains.length - 2) : first;
  }
  function parseHash() {
    var out = { tab: 'board', q: '', cat: '', chain: '', wl: false, sort: 'rank', detail: '' };
    var h = location.hash.replace(/^#/, '');
    h.split('&').forEach(function (part) {
      var kv = part.split('=');
      var k = decodeURIComponent(kv[0] || '');
      var v = decodeURIComponent(kv[1] || '');
      if (k === 'tab' && (v === 'board' || v === 'live' || v === 'model')) out.tab = v;
      if (k === 'q') out.q = v;
      if (k === 'cat') out.cat = v;
      if (k === 'chain') out.chain = v;
      if (k === 'wl') out.wl = v === '1';
      if (k === 'sort') out.sort = v;
      if (k === 'detail') out.detail = v;
    });
    return out;
  }
  function setHash(state) {
    var parts = [];
    if (state.tab !== 'board') parts.push('tab=' + state.tab);
    if (state.q) parts.push('q=' + encodeURIComponent(state.q));
    if (state.cat) parts.push('cat=' + encodeURIComponent(state.cat));
    if (state.chain) parts.push('chain=' + encodeURIComponent(state.chain));
    if (state.wl) parts.push('wl=1');
    if (state.sort && state.sort !== 'rank') parts.push('sort=' + state.sort);
    if (state.detail) parts.push('detail=' + encodeURIComponent(state.detail));
    var h = parts.length ? '#' + parts.join('&') : '#';
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  // ---- header, stats -------------------------------------------------------
  var totalImplied = rows.reduce(function (s, r) { return s + r.implied_value_usd; }, 0);
  document.getElementById('meta').innerHTML =
    'Snapshot ' + esc(R.as_of) + ' · ' + R.board_size + ' ranked<br>' +
    'Model ' + esc(R.model_version) + ' · sealed DefiLlama data';
  document.getElementById('stats').innerHTML =
    '<div class="stat"><b>' + R.board_size + '</b><span>protocols ranked</span></div>' +
    '<div class="stat"><b>' + R.watchlist_size + '</b><span>on the watchlist</span></div>' +
    '<div class="stat"><b>' + R.early_size + '</b><span>early finds below the floor</span></div>' +
    '<div class="stat"><b>' + usd(totalImplied) + '</b><span>total implied value</span></div>' +
    '<div class="stat"><b>×' + R.global_multiple.toFixed(3) + '</b><span>median mcap / TVL</span></div>';

  // ---- filter controls -----------------------------------------------------
  var catSel = document.getElementById('cat');
  var cats = [];
  rows.forEach(function (r) { if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category); });
  cats.sort();
  catSel.innerHTML = '<option value="">All categories</option>' + cats.map(function (c) {
    return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
  }).join('');
  var chainSel = document.getElementById('chain');
  var chainCount = {};
  rows.forEach(function (r) { (r.chains || []).forEach(function (c) { chainCount[c] = (chainCount[c] || 0) + 1; }); });
  var topChains = Object.keys(chainCount).sort(function (a, b) { return chainCount[b] - chainCount[a]; }).slice(0, 14);
  chainSel.innerHTML = '<option value="">All chains</option>' + topChains.map(function (c) {
    return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
  }).join('');

  var state = parseHash();
  var qEl = document.getElementById('q');
  var wlEl = document.getElementById('wl');
  var sortEl = document.getElementById('sort');
  qEl.value = state.q; catSel.value = state.cat; chainSel.value = state.chain;
  wlEl.checked = state.wl; sortEl.value = state.sort;

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var list = rows.filter(function (r) {
      if (state.wl && !watchlist[r.slug]) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    if (state.sort === 'tvl') list.sort(function (a, b) { return b.tvl_usd - a.tvl_usd; });
    else if (state.sort === 'growth') list.sort(function (a, b) { return (b.change_7d || -1e9) - (a.change_7d || -1e9); });
    else if (state.sort === 'age') list.sort(function (a, b) { return (b.age_days || -1) - (a.age_days || -1); });
    else if (state.sort === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    else list.sort(function (a, b) { return a.rank - b.rank; });
    return list;
  }

  function rowHtml(r) {
    return '<tr data-slug="' + esc(r.slug) + '">' +
      '<td>' + r.rank + '</td>' +
      '<td><b>' + esc(r.name) + '</b>' + (watchlist[r.slug] ? ' <span class="pill">WATCHLIST</span>' : '') + '</td>' +
      '<td>' + esc(r.category || '—') + '</td>' +
      '<td>' + esc(chains(r)) + '</td>' +
      '<td class="num">' + usd(r.tvl_usd) + '</td>' +
      '<td class="num">' + pct(r.change_7d) + '</td>' +
      '<td class="num">' + age(r.age_days) + '</td>' +
      '<td class="num"><b>' + usd(r.implied_value_usd) + '</b></td>' +
      '<td class="num">×' + r.multiple.toFixed(3) + '</td>' +
      '<td class="num">›</td></tr>';
  }

  function renderBoard() {
    var list = filtered();
    document.getElementById('rows').innerHTML = list.map(rowHtml).join('') ||
      '<tr><td colspan="10">No protocol matches these filters.</td></tr>';
    document.getElementById('count').textContent =
      list.length + ' of ' + rows.length + ' protocols · ranked by implied value · click a row for its detail and farm plan';
    document.getElementById('board-note').textContent =
      '“Records no token” means the snapshot record carries none — it is not proof the protocol has none. ' +
      'Implied values are this entry’s own claim, from the snapshot’s TVL, 7-day growth, age and category multiple.';
  }

  // ---- live view -----------------------------------------------------------
  document.getElementById('live-rows').innerHTML = R.live.map(function (p) {
    var ratio = p.mcap_usd && p.tvl_usd ? (p.mcap_usd / p.tvl_usd).toFixed(3) : '—';
    return '<tr><td><b>' + esc(p.name) + '</b> <span class="pill live">LIVE</span></td>' +
      '<td>' + esc(p.category || '—') + '</td><td>' + esc(chains(p)) + '</td>' +
      '<td class="num">' + usd(p.tvl_usd) + '</td>' +
      '<td class="num">' + (p.mcap_usd ? usd(p.mcap_usd) : '—') + '</td>' +
      '<td class="num">×' + ratio + '</td><td class="num">' + pct(p.change_7d) + '</td></tr>';
  }).join('');

  // ---- model view ----------------------------------------------------------
  var m = R.model;
  document.getElementById('formula').innerHTML =
    'multiple   = median mcap / TVL of live tokens in the protocol’s category\n' +
    '             (fewer than ' + m.multiple_min_samples + ' live tokens: the snapshot median ×' + R.global_multiple.toFixed(3) + ', clamped ' + m.multiple_floor + '–' + m.multiple_cap + ')\n' +
    'base       = TVL × multiple\n' +
    'growth     = 1 + clamp(7d change, ' + m.growth_floor + '%, ' + m.growth_cap + '%) / 100 × ' + m.growth_weight + '\n' +
    'maturity   = ' + m.maturity_floor + ' + min(age, ' + m.maturity_days + 'd) / ' + m.maturity_days + ' × ' + m.maturity_range + '   (age unknown: ' + m.unknown_age_days + 'd)\n' +
    'breadth    = 1 + ' + m.breadth_per_chain + ' × min(chains, ' + m.breadth_max_chains + ')\n' +
    '<b>implied    = TVL × multiple × growth × maturity × breadth</b>';
  document.getElementById('mult-rows').innerHTML = R.category_multiples.map(function (c) {
    return '<tr><td>' + esc(c.category) + '</td><td class="num">' + c.samples + '</td>' +
      '<td class="num">×' + c.multiple.toFixed(3) + '</td></tr>';
  }).join('');

  // Sandbox: the same formula, live in the browser.
  var sandbox = document.getElementById('sandbox');
  sandbox.innerHTML =
    '<label>TVL multiple scale <output id="sb-mult">×1.00</output>' +
    '<input id="sb-mult-in" type="range" min="0.5" max="2" step="0.05" value="1"></label>' +
    '<label>Growth weight <output id="sb-growth">0.60</output>' +
    '<input id="sb-growth-in" type="range" min="0" max="1.5" step="0.05" value="0.6"></label>' +
    '<label>Maturity floor <output id="sb-mat">0.70</output>' +
    '<input id="sb-mat-in" type="range" min="0.5" max="0.9" step="0.05" value="0.7"></label>' +
    '<button class="reset" id="sb-reset">Reset to the submitted model</button>';
  function sandboxRank() {
    var ms = parseFloat(document.getElementById('sb-mult-in').value);
    var gw = parseFloat(document.getElementById('sb-growth-in').value);
    var mf = parseFloat(document.getElementById('sb-mat-in').value);
    document.getElementById('sb-mult').textContent = '×' + ms.toFixed(2);
    document.getElementById('sb-growth').textContent = gw.toFixed(2);
    document.getElementById('sb-mat').textContent = mf.toFixed(2);
    var scored = rows.map(function (r) {
      var g = Math.min(m.growth_cap, Math.max(m.growth_floor, r.change_7d || 0));
      var growth = 1 + (g / 100) * gw;
      var ageFor = r.age_days === null ? m.unknown_age_days : r.age_days;
      var mat = mf + (Math.min(Math.max(ageFor, 0), m.maturity_days) / m.maturity_days) * (1 - mf);
      var br = 1 + m.breadth_per_chain * Math.min((r.chains || []).length, m.breadth_max_chains);
      return { slug: r.slug, name: r.name, implied: Math.max(1, Math.round(r.tvl_usd * r.multiple * ms * growth * mat * br)) };
    });
    scored.sort(function (a, b) { return b.implied - a.implied; });
    var top = scored.slice(0, 10);
    var submittedTop = rows.slice(0, 10).map(function (r) { return r.slug; });
    var kept = top.filter(function (t) { return submittedTop.indexOf(t.slug) >= 0; }).length;
    document.getElementById('sandbox-note').textContent =
      'Sandbox top 10: ' + top.map(function (t, i) { return (i + 1) + '. ' + t.name + ' (' + usd(t.implied) + ')'; }).join(' · ') +
      ' — ' + kept + ' of 10 match the submitted board’s top 10.';
  }
  ['sb-mult-in', 'sb-growth-in', 'sb-mat-in'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', sandboxRank);
  });
  document.getElementById('sb-reset').addEventListener('click', function () {
    document.getElementById('sb-mult-in').value = '1';
    document.getElementById('sb-growth-in').value = '0.6';
    document.getElementById('sb-mat-in').value = '0.7';
    sandboxRank();
  });
  sandboxRank();

  // ---- detail view ---------------------------------------------------------
  function splitStep(s) {
    var ci = s.lastIndexOf(' Cost: ');
    var ti = s.lastIndexOf(' Time: ');
    if (ci < 0 || ti < ci) return { text: s, ct: '' };
    return {
      text: s.slice(0, ci),
      ct: 'Cost: ' + s.slice(ci + 7, ti) + ' · Time: ' + s.slice(ti + 7).replace(/\.$/, '')
    };
  }
  function renderDetail(slug) {
    var r = bySlug[slug];
    var el = document.getElementById('detail');
    if (!r) {
      el.innerHTML = '<p class="note">No protocol with that slug is on this board.</p>';
      return;
    }
    var base = r.tvl_usd * r.multiple;
    var steps = r.farm_steps.map(function (s) {
      var p = splitStep(s);
      return '<li>' + esc(p.text) + '<span class="ct">' + esc(p.ct) + '</span></li>';
    }).join('');
    el.innerHTML =
      '<div class="detail"><h2>' + esc(r.name) + '</h2>' +
      '<p class="sub">Rank #' + r.rank + ' · ' + esc(r.category || 'Uncategorised') +
      (watchlist[r.slug] ? ' · <span class="pill">WATCHLIST</span>' : ' · early find below the floor') +
      ' · records no token</p>' +
      '<div class="facts">' +
      '<div><b>' + usd(r.implied_value_usd) + '</b><span>implied value</span></div>' +
      '<div><b>' + usd(r.tvl_usd) + '</b><span>TVL</span></div>' +
      '<div><b>' + (r.change_7d === null ? '—' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</b><span>TVL, 7 days</span></div>' +
      '<div><b>' + age(r.age_days) + '</b><span>tracked since ' + esc(r.listed_at || 'unknown') + '</span></div>' +
      '<div><b>' + (r.chains || []).length + '</b><span>chains: ' + esc(chains(r)) + '</span></div>' +
      '<div><b>×' + r.multiple.toFixed(3) + '</b><span>' + esc(r.category || 'category') + ' multiple</span></div>' +
      '</div>' +
      '<h3>How the value is built</h3>' +
      '<table class="breakdown">' +
      '<tr><td>TVL × category multiple</td><td>' + usd(r.tvl_usd) + ' × ' + r.multiple.toFixed(3) + ' = ' + usdFull(base) + '</td></tr>' +
      '<tr><td>× growth (' + (r.change_7d === null ? 'no 7d figure' : r.change_7d.toFixed(1) + '%') + ')</td><td>× ' + r.growth_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td>× maturity (' + age(r.age_days) + ' tracked)</td><td>× ' + r.maturity_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td>× breadth (' + (r.chains || []).length + ' chains)</td><td>× ' + r.breadth_multiplier.toFixed(3) + '</td></tr>' +
      '<tr class="total"><td>Implied value</td><td>' + usdFull(r.implied_value_usd) + '</td></tr>' +
      '</table>' +
      '<h3>How to farm it</h3><ol class="steps">' + steps + '</ol>' +
      '<p class="warn">This protocol records no token in the snapshot — that is not proof it has none, and nothing here predicts whether or when it issues one. Farming costs real gas and locks real capital; never pay anyone to claim an airdrop.</p>' +
      '</div>';
  }

  // ---- view switching ------------------------------------------------------
  function show() {
    var tab = state.detail ? 'detail' : state.tab;
    ['board', 'live', 'model', 'detail'].forEach(function (t) {
      document.getElementById('view-' + t).hidden = t !== tab;
    });
    document.querySelectorAll('#tabs button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-tab') === (tab === 'detail' ? 'board' : tab));
    });
    if (tab === 'board') renderBoard();
    if (tab === 'detail') renderDetail(state.detail);
    setHash(state);
  }
  document.querySelectorAll('#tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.tab = b.getAttribute('data-tab');
      state.detail = '';
      show();
    });
  });
  document.getElementById('back').addEventListener('click', function () {
    state.detail = '';
    show();
  });
  document.getElementById('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (tr) { state.detail = tr.getAttribute('data-slug'); show(); window.scrollTo(0, 0); }
  });
  var deb = null;
  qEl.addEventListener('input', function () {
    clearTimeout(deb);
    deb = setTimeout(function () { state.q = qEl.value; state.detail = ''; show(); }, 200);
  });
  catSel.addEventListener('change', function () { state.cat = catSel.value; show(); });
  chainSel.addEventListener('change', function () { state.chain = chainSel.value; show(); });
  wlEl.addEventListener('change', function () { state.wl = wlEl.checked; show(); });
  sortEl.addEventListener('change', function () { state.sort = sortEl.value; show(); });
  window.addEventListener('hashchange', function () { state = parseHash(); show(); });

  show();
})();
