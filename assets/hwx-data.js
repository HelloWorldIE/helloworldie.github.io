/* HelloWorld hub: the explorer's data side (window.HWX, part two).
   A thin adapter over window.HWGH (gh.js): it renames and shapes what HWGH loads for the explorer,
   the header and the City. It fetches nothing itself except pictures, through HWGH.
   Load after gh.js and hwx-vocab.js.

   API
     HWX.info(x) -> project info, memoised (x: an HWGH repo, an HWGH.info(), an HWX info or a repo name)
       { key, repo, name, tagline, summary, category, stage, kind, kindLabel, status, audience[],
         features[], built_with[], live_url, runs[{site, name}], demo, no_demo, cover, icon,
         gallery[{src, caption, alt}], guides[], same_as, updated, langs[{name, size, color, pct}],
         langTotal, last{date, msg}, recent, issues, hasGuides, hasPics, hasCard, cardError, size,
         private, archived, fork, search }
     HWX.list()  the projects to show (HWX.showExtra = true adds forks and archived repos)
     HWX.all()   every repo, copies included;  HWX.byName(name) (any case) -> info or null
     HWX.isCopy(x) -> true when x's card says it is a second copy of another repo here
     HWX.matches(info, q) -> every word of q is in info.search;  HWX.find(q, list) -> matches, best first
     HWX.index(list) -> { cats, stages, kinds, with, live, langs, aud, status, everywhere }
       (Object.create(null) maps of key -> [info]; `with` keys are built_with names, `live` hosts)
     HWX.everywhere(list) -> built_with names on half the projects or more (left out of "connects")
     HWX.sortFriendly(list) -> a new array: bigger kinds, then pictures, demos, recent, name
     HWX.recent(list, n) -> a new array, newest change first (n optional)
     HWX.image(repo, path, kind) -> Promise of a blob URL, counted by HWGH.trackLoad(kind || 'pics')
     HWX.md(text) -> escaped HTML with **bold** only;  HWX.safePath(p);  HWX.demoFor(info)
     HWX.langColour(name) -> a colour for a language
     HWX.level  get or set 'overview' | 'built' | 'code' (kept in localStorage hw_level; setting it
       fires a 'hwx:level' event on document)
     HWX.onRepos(fn) -> unsubscribe; fn({phase: 'repos' | 'details', state}) after each load step
     HWX.detailsReady  true once cards, READMEs and languages are in
     HWX.whenDetails() / HWX.loadExtras() -> Promise resolved when details are in */
(function () {
  'use strict';

  var GH = window.HWGH;
  var HWX = window.HWX = window.HWX || {};
  var hasOwn = Object.prototype.hasOwnProperty;
  function own(o, k) { return o != null && typeof k === 'string' && hasOwn.call(o, k); }
  function map() { return Object.create(null); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  if (!GH) { console.error('hwx-data.js needs gh.js first'); return; }
  if (!HWX.cat) { console.error('hwx-data.js needs hwx-vocab.js first'); return; }

  /* ---------- language colours ---------- */
  // GitHub's own colours for common languages, so signed-out views (whose language list has no
  // colours) match signed-in ones. Others fall back to a quiet ramp.
  var LANG = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c', Python: '#3572a5',
    PHP: '#4f5d95', Shell: '#89e051', Svelte: '#ff3e00', Vue: '#41b883', Astro: '#ff5a03', Swift: '#f05138',
    Kotlin: '#a97bff', Dart: '#00b4ab', Go: '#00add8', Rust: '#dea584', Java: '#b07219', 'C#': '#178600', C: '#555555',
    'C++': '#f34b7d', Ruby: '#701516', Lua: '#000080', GLSL: '#5686a5', Dockerfile: '#384d54', MDX: '#fcb32c',
    'Jupyter Notebook': '#da5b0b', PowerShell: '#012456', Batchfile: '#c1f12e', Makefile: '#427819', Handlebars: '#f7931e',
    EJS: '#a91e50', Twig: '#c1d026', Hack: '#878787', 'Objective-C': '#438eff'
  };
  var RAMP = ['#6d44e0', '#8d89a0', '#4a2bb0', '#a98bff', '#5d5a6b', '#b3a6e8', '#3b3747', '#7a6cc4'];
  HWX.langColour = function (name) {
    var c = GH.langColour(name);
    if (c && /^#[0-9a-f]{3,8}$/i.test(c)) return c;
    return own(LANG, name) ? LANG[name] : RAMP[HWX.hash(name) % RAMP.length];
  };

  /* ---------- one project, shaped for the explorer (PORT-PLAN 4.3) ---------- */
  var memo = map();
  function sigOf(r) { return [r, r.card, r.cardError, r.languages, r.last_commit, r.readme, r.recent, r.open_issues, r.pushed_at]; }
  function sameSig(a, b) { for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
  function hostOf(u) { try { return new URL(u).host; } catch (e) { return ''; } }

  function repoOf(x) {
    if (!x) return null;
    if (typeof x === 'string') return GH.findRepo(x, { ci: true });
    if (x.repo && typeof x.repo === 'object' && typeof x.repo.full_name === 'string') return x.repo;
    if (typeof x.full_name === 'string') return x;
    return null;
  }

  function build(r) {
    var g = GH.info(r);
    var cat = g.category && HWX.CAT[g.category] ? g.category : null;
    var st = cat ? HWX.stageOf(cat) : null;
    var langs = [], total = 0;
    var L = g.languages || {};
    for (var k in L) if (own(L, k) && typeof L[k] === 'number' && L[k] > 0) { langs.push({ name: k, size: L[k] }); total += L[k]; }
    langs.sort(function (a, b) { return b.size - a.size; });
    langs.forEach(function (l) { l.color = HWX.langColour(l.name); l.pct = total ? l.size / total : 0; });
    var host = g.live_url ? hostOf(g.live_url) : '';
    var kind = g.kind && HWX.KIND[g.kind] ? g.kind : null;
    var catLabel = cat ? HWX.CAT[cat].label : '';
    var info = {
      key: r.name.toLowerCase(),
      repo: r,
      name: g.title,
      tagline: g.tagline || '',
      summary: g.summary || '',
      category: cat,
      stage: st ? st.id : null,
      kind: kind,
      kindLabel: kind ? HWX.KIND[kind].label : '',
      status: g.status || null,
      audience: (g.audience || []).slice(),
      features: (g.features || []).slice(),
      built_with: (g.built_with || []).slice(),
      live_url: g.live_url || null,
      runs: host ? [{ site: host, name: host }] : [],
      demo: g.demo || null,
      no_demo: g.no_demo || null,
      cover: g.cover || null,
      icon: g.icon || null,
      gallery: (g.gallery || []).map(function (p) { return { src: p.src, caption: p.caption || '', alt: p.alt || null }; }),
      guides: g.guides || [],
      same_as: g.same_as || null,
      updated: (r.card && r.card.updated) || null,
      langs: langs,
      langTotal: total,
      last: { date: g.pushed_at || null, msg: g.last_message || '' },
      recent: typeof g.recent === 'number' ? g.recent : null,
      issues: g.open_issues || 0,
      hasGuides: !!(g.guides && g.guides.length),
      hasPics: !!(g.cover || (g.gallery && g.gallery.length)),
      hasCard: !!g.hasCard,
      cardError: g.cardError || null,
      size: r.size || 0,
      private: !!r.private,
      archived: !!r.archived,
      fork: !!r.fork
    };
    info.search = [info.name, r.name, info.tagline, info.summary, catLabel, info.kindLabel, st ? st.label : '',
      info.built_with.join(' '), host, langs.map(function (l) { return l.name; }).join(' ')].join(' \u0001 ').toLowerCase();
    return info;
  }

  HWX.info = function (x) {
    var r = repoOf(x);
    if (!r || typeof r.name !== 'string') return null;
    var key = r.name.toLowerCase(), sig = sigOf(r), m = memo[key];
    if (m && sameSig(m.sig, sig)) return m.val;
    var val = build(r);
    memo[key] = { sig: sig, val: val };
    return val;
  };

  HWX.showExtra = false;
  HWX.list = function () { return GH.projects({ all: !!HWX.showExtra }).map(function (g) { return HWX.info(g.repo); }); };
  HWX.all = function () { return GH.state.repos.map(function (r) { return HWX.info(r); }); };
  HWX.byName = function (name) { var r = GH.findRepo(name, { ci: true }); return r ? HWX.info(r) : null; };
  HWX.isCopy = function (x) { var r = repoOf(x); return !!(r && GH.isCopy(r)); };
  HWX.demoFor = function (info) { return (info && info.demo) || null; };
  HWX.safePath = GH.safePath;

  /* ---------- search ---------- */
  function terms(q) { return String(q || '').toLowerCase().split(/\s+/).filter(Boolean); }
  HWX.matches = function (info, q) {
    if (!info) return false;
    var t = terms(q);
    for (var i = 0; i < t.length; i++) if (info.search.indexOf(t[i]) < 0) return false;
    return true;
  };
  HWX.find = function (q, list) {
    var t = terms(q);
    list = list || HWX.list();
    if (!t.length) return list.slice();
    return list.filter(function (p) { return HWX.matches(p, q); }).map(function (p) {
      var name = (p.name + ' ' + p.repo.name).toLowerCase(), score = 0;
      t.forEach(function (w) { if (name.indexOf(w) === 0) score += 4; else if (name.indexOf(w) >= 0) score += 2; else if ((p.tagline || '').toLowerCase().indexOf(w) >= 0) score += 1; });
      return { p: p, s: score };
    }).sort(function (a, b) { return b.s - a.s || a.p.name.localeCompare(b.p.name); }).map(function (x) { return x.p; });
  };

  /* ---------- groupings ---------- */
  HWX.everywhere = function (list) {
    list = list || HWX.list();
    if (list.length < 4) return [];
    var n = map(), names = map();
    list.forEach(function (p) {
      var seen = map();
      p.built_with.forEach(function (w) { var k = w.toLowerCase(); if (seen[k]) return; seen[k] = true; n[k] = (n[k] || 0) + 1; if (!names[k]) names[k] = w; });
    });
    return Object.keys(n).filter(function (k) { return n[k] >= list.length / 2; }).map(function (k) { return names[k]; });
  };

  HWX.index = function (list) {
    list = list || HWX.list();
    var ix = { cats: map(), stages: map(), kinds: map(), with: map(), live: map(), langs: map(), aud: map(), status: map(), everywhere: HWX.everywhere(list) };
    var withName = map();
    function add(m, k, p) { if (typeof k !== 'string' || !k) return; (m[k] || (m[k] = [])).push(p); }
    list.forEach(function (p) {
      add(ix.cats, p.category || '_none', p);
      add(ix.stages, p.stage, p);
      add(ix.kinds, p.kind, p);
      add(ix.status, p.status, p);
      p.audience.forEach(function (a) { add(ix.aud, a, p); });
      p.runs.forEach(function (s) { add(ix.live, s.site, p); });
      p.langs.forEach(function (l) { add(ix.langs, l.name, p); });
      var seen = map();
      p.built_with.forEach(function (w) {
        var k = w.toLowerCase();
        if (seen[k]) return; seen[k] = true;
        if (!withName[k]) withName[k] = w;
        add(ix.with, withName[k], p);
      });
    });
    return ix;
  };

  function time(p) { var t = p && p.last && p.last.date ? Date.parse(p.last.date) : NaN; return isNaN(t) ? 0 : t; }
  HWX.recent = function (list, n) {
    var out = (list || HWX.list()).slice().sort(function (a, b) { return time(b) - time(a) || a.name.localeCompare(b.name); });
    return typeof n === 'number' && n >= 0 ? out.slice(0, n) : out;
  };
  HWX.sortFriendly = function (list) {
    return (list || HWX.list()).slice().sort(function (a, b) {
      return (HWX.kindCount(b.kind) - HWX.kindCount(a.kind)) ||
        ((b.hasPics ? 1 : 0) - (a.hasPics ? 1 : 0)) ||
        ((b.demo ? 1 : 0) - (a.demo ? 1 : 0)) ||
        (time(b) - time(a)) || a.name.localeCompare(b.name);
    });
  };

  /* ---------- pictures ---------- */
  var pics = map(), pending = map();
  HWX.image = function (repo, path, kind) {
    var r = repoOf(repo);
    if (!r || !GH.safePath(path)) return Promise.reject(new Error('Not available'));
    var key = r.name + '/' + path;
    if (pics[key]) return Promise.resolve(pics[key]);
    if (pending[key]) return pending[key];
    var p = GH.image(r.name, path).then(function (url) { pics[key] = url; delete pending[key]; return url; }, function (e) { delete pending[key]; throw e; });
    pending[key] = p;
    return GH.trackLoad(kind || 'pics', p);
  };

  /* ---------- text ---------- */
  // Card text is plain; only **bold** (interface labels in guide steps) is kept.
  HWX.md = function (s) { return esc(s).replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>'); };

  /* ---------- detail level ---------- */
  var LEVEL_IDS = ['overview', 'built', 'code'];
  var level = 'overview';
  try { var saved = localStorage.getItem('hw_level'); if (LEVEL_IDS.indexOf(saved) >= 0) level = saved; } catch (e) {}
  Object.defineProperty(HWX, 'level', {
    enumerable: true, configurable: true,
    get: function () { return level; },
    set: function (v) {
      if (LEVEL_IDS.indexOf(v) < 0 || v === level) return;
      level = v;
      try { localStorage.setItem('hw_level', v); } catch (e) {}
      try { document.dispatchEvent(new CustomEvent('hwx:level', { detail: v })); } catch (e) {}
    }
  });

  /* ---------- load events ---------- */
  var subs = [];
  function fire(phase) {
    subs.slice().forEach(function (fn) { try { fn({ phase: phase, state: GH.state }); } catch (e) { console.error(e); } });
  }
  GH.on('repos', function () { fire('repos'); });
  GH.on('details', function () { fire('details'); });
  HWX.onRepos = function (fn) {
    if (typeof fn !== 'function') return function () {};
    subs.push(fn);
    return function () { var i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); };
  };
  Object.defineProperty(HWX, 'detailsReady', { enumerable: true, configurable: true, get: function () { return !!GH.state.detailsReady; } });

  var waiters = [];
  GH.on('details', function () { var w = waiters; waiters = []; w.forEach(function (fn) { fn(GH.state); }); });
  HWX.whenDetails = function () {
    if (GH.state.detailsReady && !GH.state.loading) return Promise.resolve(GH.state);
    return new Promise(function (resolve) { waiters.push(resolve); });
  };
  HWX.loadExtras = function () {
    if (!GH.state.loading && !GH.state.loadedAt && !GH.state.detailsReady) GH.loadRepos();
    return HWX.whenDetails();
  };
})();
