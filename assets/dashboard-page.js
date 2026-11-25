/* HelloWorld dashboard page (dashboard/index.html): the cinematic header full window
   (HWHero, mode 'full'), with Live, Demo and Big demo data, a theme switch and a link back to
   the hub. Live reads GitHub through HWGH; a tab signed in on the hub is signed in here too (same
   address, same tab storage). Demo and Big demo are invented projects and need no network.
   Start on them with ?demo or ?big. */
(function () {
  'use strict';

  var statusEl = document.getElementById('dash-status');
  var themeBtn = document.getElementById('theme-switch');
  var segBtns = Array.prototype.slice.call(document.querySelectorAll('[data-src]'));
  var q = location.search.slice(1);
  var mode = /(^|&)big(=|&|$)/.test(q) ? 'big' : /(^|&)demo(=|&|$)/.test(q) ? 'demo' : 'live';
  var liveStarted = false;

  /* ---------- the status line in the bar ---------- */
  function setStatus(parts) {
    statusEl.textContent = '';
    parts.forEach(function (p) {
      if (typeof p === 'string') { statusEl.appendChild(document.createTextNode(p)); return; }
      var n;
      if (p.href) { n = document.createElement('a'); n.href = p.href; n.textContent = p.text; }
      else { n = document.createElement('button'); n.type = 'button'; n.className = 'hwh-btn-quiet'; n.textContent = p.text; n.addEventListener('click', p.onClick); }
      statusEl.appendChild(n);
    });
  }
  function clock(ms) { try { return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

  function liveStatus() {
    var G = window.HWGH;
    if (!G) return setStatus(['The data layer did not load. Reload the page.']);
    var s = G.state;
    if (s.loading && !s.repos.length) return setStatus(['Loading projects from GitHub.']);
    if (s.error && !s.repos.length) {
      var e = s.error, why = (e && e.name === 'RateLimit') || s.rateLimited
        ? 'Signed-out visits have used up GitHub\u2019s limit until ' + clock((e && e.reset) || s.rateLimited) + '.'
        : 'The dashboard could not reach GitHub.';
      return setStatus([why + ' ', { text: 'Try again', onClick: function () { G.loadRepos(); } }]);
    }
    if (s.preview) return setStatus(['Local preview with real data, signed in as ' + (s.login || 'the local account') + '.']);
    if (s.signedIn) return setStatus(['Signed in as ' + s.login + '. Private repos included.']);
    setStatus(['Public repos only. ', { href: '../', text: 'Sign in on the hub' }, ' to include private repos.']);
  }

  /* ---------- invented data: Demo (18 projects) and Big demo (164) ----------
     Made-up names, nothing from a real repo or client. Dates are relative to now, so the
     weeks and "ago" read the same whenever the page opens. */
  var HOUR = 36e5;
  function iso(hoursAgo) { return new Date(Date.now() - hoursAgo * HOUR).toISOString(); }
  function slug(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function langs(main, total) {
    var sets = {
      TypeScript: [['TypeScript', .72], ['CSS', .16], ['HTML', .12]],
      JavaScript: [['JavaScript', .68], ['CSS', .2], ['HTML', .12]],
      PHP: [['PHP', .64], ['JavaScript', .2], ['CSS', .16]],
      Python: [['Python', .86], ['Shell', .14]],
      Shell: [['Shell', .8], ['Python', .2]],
      Svelte: [['Svelte', .58], ['TypeScript', .3], ['CSS', .12]],
      Markdown: [['HTML', .7], ['CSS', .3]],
      Kotlin: [['Kotlin', .82], ['Java', .18]]
    };
    var o = {};
    (sets[main] || sets.JavaScript).forEach(function (p) { o[p[0]] = Math.round(total * p[1]); });
    return o;
  }
  // [name, category, kind, status, main language, hours since the last change, last change, flags]
  var SMALL = [
    ['Lanternfish', 'products', 'web-app', 'live', 'TypeScript', 3, 'Add the weekly summary email'],
    ['Paper Kite', 'websites', 'website', 'live', 'JavaScript', 9, 'Make the home page load faster'],
    ['Tidewatch', 'tools', 'web-app', 'live', 'TypeScript', 26, 'Show high tide times on the map'],
    ['Kettle Notes', 'products', 'web-app', 'in-progress', 'Svelte', 50, 'Save notes while offline'],
    ['Harbour Lights', 'client', 'website', 'live', 'PHP', 140, 'Update the opening hours page'],
    ['Quillbox', 'wordpress', 'plugin', 'live', 'PHP', 190, 'Check links before publishing'],
    ['Moss Garden', 'games', 'game', 'experimental', 'JavaScript', 230, 'Grow moss after rain', { faulty: true }],
    ['Foxglove', 'tools', 'library', 'live', 'TypeScript', 330, 'Tidy the date helpers'],
    ['Bramble Board', 'ai', 'web-app', 'in-progress', 'Python', 400, 'Sort ideas into themes'],
    ['Larkspur', 'wordpress', 'theme', 'live', 'PHP', 520, 'Add dark mode'],
    ['Driftwood', 'ops', 'scripts', 'live', 'Shell', 610, 'Move the backups to the new server', { noReadme: true }],
    ['Saltmarsh', 'labs', 'docs', 'paused', 'Markdown', 760, 'Write up the first test', { noReadme: true }],
    ['Hazel Ledger', 'products', 'web-app', 'live', 'TypeScript', 880, 'Export invoices as a spreadsheet'],
    ['Puffin Post', 'products', 'mobile', 'in-progress', 'Kotlin', 1010, 'Send a reminder the day before'],
    ['Wren Radio', 'ai', 'web-app', 'experimental', 'Python', 1150, 'Read the news in a calmer voice'],
    ['Thistle Maps', 'websites', 'website', 'paused', 'JavaScript', 1300, 'Draw the walking routes'],
    ['Otter Sync', 'ops', 'scripts', 'live', 'Python', 70, 'Retry uploads that time out'],
    ['Juniper Forms', 'labs', 'template', null, 'JavaScript', 1500, 'Start from a blank form', { noCard: true }],
    ['Old Lighthouse', 'websites', 'website', 'retired', 'PHP', 6000, 'Last update before the move', { archived: true }],
    ['Sketchbook', 'labs', 'library', null, 'JavaScript', 3000, 'Merge upstream changes', { fork: true }]
  ];

  function repoFrom(row, i) {
    var f = row[7] || {}, name = slug(row[0]), date = iso(row[5]);
    var card = f.noCard || f.faulty ? null : { name: row[0], tagline: '', category: row[1], kind: row[2], status: row[3], audience: [], features: [], built_with: [], gallery: [], guides: [] };
    return {
      name: name, full_name: 'demo/' + name, owner: 'demo', private: i % 3 === 0, fork: !!f.fork, archived: !!f.archived,
      description: '', homepage: '', html_url: '#', default_branch: 'main', pushed_at: date, updated_at: date,
      created_at: iso(row[5] + 4000), size: 400 + i * 37, language: row[4] === 'Markdown' ? null : row[4], topics: ['cat-' + row[1]],
      has_pages: false, open_issues: i % 4, stars: 0, permissions: null,
      languages: row[4] === 'Markdown' ? {} : langs(row[4], 20000 + i * 9100),
      card: card, cardError: f.faulty ? 'Card is not valid JSON' : null,
      readme: f.noReadme ? null : '# ' + row[0], last_commit: { date: date, message: row[6] }, recent: Math.max(0, 12 - (i % 13))
    };
  }

  // A small seeded generator, so Big demo looks the same on every visit.
  function seeded(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  var ADJ = ['Amber', 'Brisk', 'Cedar', 'Dune', 'Ember', 'Fable', 'Gentle', 'Harbour', 'Indigo', 'Juniper', 'Kindle', 'Linen', 'Meadow', 'Nimble', 'Opal', 'Pebble', 'Quiet', 'Rowan', 'Sable', 'Tamarind', 'Umber', 'Velvet', 'Willow', 'Yarrow'];
  var NOUN = ['Atlas', 'Beacon', 'Compass', 'Dock', 'Engine', 'Ferry', 'Garden', 'Harvest', 'Island', 'Jetty', 'Kiln', 'Lantern', 'Mill', 'Notebook', 'Orchard', 'Pier', 'Quay', 'Relay', 'Signal', 'Tower', 'Upland', 'Valley', 'Wharf', 'Yard'];
  var CATS = ['products', 'client', 'websites', 'wordpress', 'ai', 'games', 'tools', 'ops', 'labs'];
  var KIND_FOR = { products: ['web-app', 'mobile'], client: ['website', 'web-app'], websites: ['website'], wordpress: ['plugin', 'theme'], ai: ['web-app', 'scripts'], games: ['game'], tools: ['library', 'scripts', 'web-app'], ops: ['scripts', 'docs'], labs: ['template', 'docs', 'web-app'] };
  var LANG_FOR = { 'web-app': ['TypeScript', 'Svelte', 'JavaScript'], website: ['JavaScript', 'PHP'], plugin: ['PHP'], theme: ['PHP'], game: ['JavaScript', 'TypeScript'], mobile: ['Kotlin', 'TypeScript'], library: ['TypeScript', 'Python'], scripts: ['Python', 'Shell'], docs: ['Markdown'], template: ['JavaScript', 'TypeScript'] };
  var VERBS = ['Add', 'Fix', 'Tidy', 'Speed up', 'Rename', 'Test', 'Document', 'Remove', 'Update', 'Check'];
  var THINGS = ['the search box', 'the sign-up form', 'the weekly report', 'the image upload', 'the settings page', 'the export', 'the menu on phones', 'the error messages', 'the backup job', 'the colour contrast'];
  function bigRows() {
    var r = seeded(20261126), rows = [], used = Object.create(null);
    function pick(a) { return a[Math.floor(r() * a.length)]; }
    while (rows.length < 172) {
      var name = pick(ADJ) + ' ' + pick(NOUN);
      if (used[name]) continue;
      used[name] = 1;
      var cat = pick(CATS), kind = pick(KIND_FOR[cat]), x = r();
      var status = x < 0.55 ? 'live' : x < 0.73 ? 'in-progress' : x < 0.83 ? 'experimental' : x < 0.92 ? 'paused' : x < 0.95 ? 'retired' : null;
      var hours = Math.round(-Math.log(1 - r() * 0.98) * 260) + 1;
      var flags = {}, y = r();
      if (y < 0.06) flags.noReadme = true; else if (y < 0.1) flags.noCard = true; else if (y < 0.12) flags.faulty = true;
      if (rows.length >= 164) flags[rows.length % 2 ? 'fork' : 'archived'] = true;
      rows.push([name, cat, kind, status, pick(LANG_FOR[kind]), hours, pick(VERBS) + ' ' + pick(THINGS), flags]);
    }
    return rows;
  }

  function infoOf(r) {
    if (window.HWGH && typeof window.HWGH.info === 'function') { try { return window.HWGH.info(r); } catch (e) {} }
    var c = r.card || {};
    return { repo: r, name: r.name, title: c.name || r.name, tagline: '', category: c.category || null, kind: c.kind || null,
      status: c.status || null, languages: r.languages, pushed_at: r.last_commit.date, last_message: r.last_commit.message, private: r.private };
  }
  var demoCache = Object.create(null);
  function demoSnapshot(which) {
    if (demoCache[which]) return demoCache[which];
    var rows = which === 'big' ? bigRows() : SMALL;
    var repos = rows.map(repoFrom);
    var projects = repos.filter(function (r) { return !r.fork && !r.archived; }).map(infoOf);
    demoCache[which] = { id: 'demo:' + which, demo: which, repos: repos, projects: projects, signedIn: true, loading: false, detailsReady: true, error: null };
    return demoCache[which];
  }

  /* ---------- the header, full window ---------- */
  var hero = HWHero.mount(document.getElementById('dash'), {
    mode: 'full',
    hrefBase: '../',
    source: mode === 'live' ? null : function () { return demoSnapshot(mode); },
    onOpen: function (route, info) {
      if (info && info.demo) {
        setStatus(['Demo data: the cards open the hub when the dashboard shows live data. ', { text: 'Show live data', onClick: function () { setMode('live'); } }]);
        return;
      }
      location.href = '../' + route;
    }
  });

  function startLive() {
    if (!window.HWGH) { liveStatus(); return; }
    if (liveStarted) { hero.refresh(); liveStatus(); return; }
    liveStarted = true;
    ['repos', 'details', 'error', 'auth', 'loading'].forEach(function (ev) {
      HWGH.on(ev, function () { if (mode === 'live') { hero.refresh(); liveStatus(); } });
    });
    liveStatus();
    HWGH.loadRepos();
  }

  function setMode(next) {
    mode = next;
    segBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-src') === mode)); });
    try { history.replaceState(null, '', mode === 'live' ? location.pathname : '?' + mode); } catch (e) {}
    if (mode === 'live') { hero.setSource(null); startLive(); return; }
    hero.setSource(function () { return demoSnapshot(mode); });
    var n = demoSnapshot(mode).projects.length;
    setStatus([(mode === 'big' ? 'Big demo: ' : 'Demo: ') + n + ' invented projects, nothing loaded from GitHub.']);
  }
  segBtns.forEach(function (b) {
    b.addEventListener('click', function () { var m = b.getAttribute('data-src'); if (m !== mode) setMode(m); });
  });

  /* ---------- theme ---------- */
  function applyThemeButton() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeBtn.setAttribute('aria-label', 'Dark theme'); themeBtn.title = dark ? 'Light theme' : 'Dark theme';
  }
  themeBtn.addEventListener('click', function () {
    var dark = document.documentElement.getAttribute('data-theme') !== 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    try { localStorage.setItem('hw_theme', dark ? 'dark' : 'light'); } catch (e) {}
    applyThemeButton();
  });
  applyThemeButton();

  setMode(mode);
})();
