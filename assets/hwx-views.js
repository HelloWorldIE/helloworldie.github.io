/* ==========================================================================
   HelloWorld hub: the explorer's views, pages and navigation (window.HWX).
   Routes live in the address (#/map, #/p/<repo> ...) so every view and page can be shared as a
   link and the Back button works.
   Data: window.HWX (hwx-data.js, hwx-vocab.js) when present, else window.HWGH directly; the
   vocabulary comes from window.HW_CONFIG. Shell services: window.HWShell. The City's page glue
   (hwc-ui.js) registers HWX.views.city, HWX.after.city, HWX.citySlide and HWX.citySearch; this
   file calls them only when they are there.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.HW_CONFIG, GH = window.HWGH, SH = window.HWShell, ACCOUNT = CFG.account;
  var HWX = window.HWX = window.HWX || {};
  HWX.views = HWX.views || {};
  HWX.after = HWX.after || {};
  var esc = SH.esc, enc = SH.enc, own = SH.own, plural = SH.plural, I = SH.icon, ago = SH.ago;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ---------------- Vocabulary (from the generated config) ---------------- */
  var CATS = CFG.categories || {}, KINDS = CFG.kinds || {}, KD = CFG.kind_details || {}, STATUSES = CFG.statuses || {};
  var AUD = CFG.audiences || {}, PLATFORMS = CFG.platforms || {}, TERMS = CFG.terms || {}, BLURBS = CFG.category_blurbs || {};
  var STAGES = Object.keys(CFG.stages || {}).map(function (id, n) {
    var s = CFG.stages[id];
    return { id: id, n: n + 1, label: s.label || id, blurb: s.blurb || '', icon: s.icon || id, categories: (s.categories || []).filter(function (c) { return own(CATS, c); }) };
  });
  var STAGE_BY = Object.create(null), STAGE_OF = Object.create(null);
  STAGES.forEach(function (s) { STAGE_BY[s.id] = s; s.categories.forEach(function (c) { STAGE_OF[c] = s; }); });
  var CAT_ORDER = [];
  STAGES.forEach(function (s) { s.categories.forEach(function (c) { if (CAT_ORDER.indexOf(c) < 0) CAT_ORDER.push(c); }); });
  Object.keys(CATS).forEach(function (c) { if (CAT_ORDER.indexOf(c) < 0) CAT_ORDER.push(c); });
  var KIND_ORDER = Object.keys(KINDS);
  function catLabel(id) { return own(CATS, id) ? CATS[id] : 'Not sorted yet'; }
  function catBlurb(id) { return own(BLURBS, id) ? BLURBS[id] : ''; }
  function kindLabel(id) { return own(KINDS, id) ? KINDS[id] : 'Project'; }
  function kindPlural(id) { return own(KD, id) && KD[id].plural ? KD[id].plural : kindLabel(id) + 's'; }
  function kindCount(id, n) { return n + ' ' + (n === 1 ? kindLabel(id).toLowerCase() : kindPlural(id).toLowerCase()).replace(/wordpress/g, 'WordPress').replace(/\bcli\b/g, 'CLI'); }
  function kindSize(id) { return own(KD, id) && KD[id].size ? KD[id].size : 2; }
  function kindExplain(id) { return own(KD, id) ? KD[id].explain || '' : ''; }
  function statusLabel(id) { return own(STATUSES, id) ? STATUSES[id] : ''; }
  function aOrAn(w) { return /^[aeiou]/i.test(w) ? 'an' : 'a'; }

  /* ---------------- Icons ---------------- */
  function svg(p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + '</svg>'; }
  var VICON = {
    discover: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    city: '<path d="M3 21h18M5 21V9l5-3v15M10 21V4l9 4v13"/><path d="M14 11h2M14 15h2"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    line: '<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h6a4 4 0 0 0 0-8h-2a4 4 0 0 1 0-8h6" transform="translate(0 2)"/>',
    connections: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="9" cy="18" r="2.5"/><path d="M8.3 7.2 15.7 7.6M7 8.4l1.4 7.2M16.3 10l-5.6 6"/>',
    live: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>',
    'new': '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/>',
    all: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    glossary: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    health: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    // kinds
    'web-app': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 13h8M8 16h5"/>',
    website: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>',
    plugin: '<path d="M9 3v5M15 3v5M6 8h12v4a6 6 0 0 1-12 0zM12 18v3"/>',
    theme: '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="15.5" cy="10" r="1.2"/><path d="M12 21a3 3 0 0 1 0-6h2"/>',
    game: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7 11v3M5.5 12.5h3M15.5 12h.01M18 13.5h.01"/>',
    mobile: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/>',
    library: '<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16 5 3.8-1 2.2 15.5-3.8 1z"/>',
    scripts: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M12.5 15H17"/>',
    docs: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    template: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
    // categories and stages (used when the vocabulary file does not draw its own)
    products: '<path d="m21 8-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
    client: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    websites: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>',
    wordpress: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
    ai: '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8z"/>',
    games: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7 11v3M5.5 12.5h3M15.5 12h.01M18 13.5h.01"/>',
    tools: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    ops: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    labs: '<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
    spark: '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/>',
    build: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    ship: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    run: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    walk: '<circle cx="13" cy="4" r="2"/><path d="m9 21 2-6 3 3v3M7 12l2-4h4l2 4 3 1M11 15l-1-4"/>'
  };
  /* The vocabulary file's icons when it is there (categories, kinds, stages and the rest). */
  var VIEW_ICON = { discover: 'discover', city: 'city', map: 'map', line: 'line', connections: 'connect', live: 'web-app', 'new': 'news', all: 'grid', glossary: 'guide', health: 'activity', users: 'users', walk: 'walk' };
  function vIcon(k) {
    if (typeof HWX.icon === 'function' && HWX.ICON) {
      if (own(CATS, k) && typeof HWX.catIcon === 'function') return HWX.catIcon(k);
      if (own(KINDS, k) && typeof HWX.kindIcon === 'function') return HWX.kindIcon(k);
      var name = own(VIEW_ICON, k) ? VIEW_ICON[k] : k;
      if (own(HWX.ICON, name)) return HWX.icon(name);
    }
    return svg(own(VICON, k) ? VICON[k] : VICON.discover);
  }
  function sized(s, n) { return s.replace('<svg', '<svg width="' + n + '" height="' + n + '"'); }

  /* ---------------- Data (the adapter when present, else HWGH) ---------------- */
  var fbCache = new WeakMap();
  GH.on('repos', function () { fbCache = new WeakMap(); });
  GH.on('details', function () { fbCache = new WeakMap(); });
  function hostOf(u) { try { return new URL(u).host; } catch (e) { return null; } }
  function fbInfo(r) {
    if (fbCache.has(r)) return fbCache.get(r);
    var p = GH.info(r), langs = [], tot = 0;
    Object.keys(p.languages || {}).forEach(function (n) { var s = Number(p.languages[n]) || 0; tot += s; langs.push({ name: n, size: s, color: GH.langColour(n) || null }); });
    langs.sort(function (a, b) { return b.size - a.size; });
    var host = p.live_url ? hostOf(p.live_url) : null;
    var x = {
      key: r.name.toLowerCase(), repo: r, name: p.title, tagline: p.tagline, summary: p.summary,
      category: p.category, stage: p.category && STAGE_OF[p.category] ? STAGE_OF[p.category].id : null,
      kind: p.kind, kindLabel: p.kind ? kindLabel(p.kind) : '', status: p.status, audience: p.audience || [],
      features: p.features || [], built_with: p.built_with || [], live_url: p.live_url, runs: host ? [{ site: host, name: host }] : [],
      demo: p.demo, no_demo: p.no_demo, cover: p.cover, icon: p.icon,
      gallery: (p.gallery || []).map(function (g) { return { src: g.src, caption: g.caption || '', alt: g.alt || '' }; }),
      guides: p.guides || [], same_as: p.same_as, updated: (r.card && r.card.updated) || null,
      langs: langs, langTotal: tot, last: { date: p.pushed_at, msg: p.last_message || '' }, recent: p.recent, issues: p.open_issues,
      hasGuides: !!(p.guides && p.guides.length), private: !!r.private, archived: !!r.archived, fork: !!r.fork,
      hasCard: p.hasCard, cardError: p.cardError
    };
    x.search = [x.name, r.name, x.tagline, x.summary, catLabel(x.category), x.kindLabel, x.built_with.join(' '), host || '', langs.map(function (l) { return l.name; }).join(' '), (r.topics || []).join(' ')].join(' ').toLowerCase();
    fbCache.set(r, x);
    return x;
  }
  function norm(x) {
    if (!x || x._hwxNorm) return x;
    ['audience', 'features', 'built_with', 'runs', 'gallery', 'guides', 'langs'].forEach(function (k) { if (!Array.isArray(x[k])) x[k] = []; });
    if (!x.last) x.last = { date: x.repo.pushed_at, msg: '' };
    if (typeof x.search !== 'string') x.search = String(x.name || x.repo.name).toLowerCase();
    if (!x.kindLabel && x.kind) x.kindLabel = kindLabel(x.kind);
    if (!x.stage && x.category && STAGE_OF[x.category]) x.stage = STAGE_OF[x.category].id;
    if (x.langTotal == null) x.langTotal = x.langs.reduce(function (s, l) { return s + (l.size || 0); }, 0);
    try { Object.defineProperty(x, '_hwxNorm', { value: true }); } catch (e) {}
    return x;
  }
  function info(r) { if (!r) return null; return norm(typeof HWX.info === 'function' ? HWX.info(r) : fbInfo(r)); }
  function list(extra) {
    var out;
    if (typeof HWX.list === 'function') { var was = HWX.showExtra; HWX.showExtra = !!extra; try { out = HWX.list(); } finally { HWX.showExtra = was; } }
    else out = GH.projects({ all: !!extra }).map(function (p) { return info(p.repo); });
    return out.filter(Boolean).map(norm);
  }
  function byName(name) {
    if (typeof HWX.byName === 'function') return norm(HWX.byName(name));
    return info(GH.findRepo(name, { ci: true }));
  }
  function matches(i, q) {
    if (!q) return true;
    if (typeof HWX.matches === 'function') return HWX.matches(i, q);
    return String(q).toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return i.search.indexOf(w) !== -1; });
  }
  function when(i) { return (i.last && i.last.date) || i.repo.pushed_at || i.repo.updated_at; }
  function recent(a, b) { return new Date(when(b) || 0) - new Date(when(a) || 0); }
  function friendly(a, b) { return (kindSize(b.kind) - kindSize(a.kind)) || String(a.name).localeCompare(String(b.name)); }
  function index(items) {
    var cats = Object.create(null), w = Object.create(null), live = Object.create(null), kinds = Object.create(null);
    items.forEach(function (i) {
      var c = i.category || '_none'; cats[c] = (cats[c] || 0) + 1;
      if (i.kind) kinds[i.kind] = (kinds[i.kind] || 0) + 1;
      i.built_with.forEach(function (b) { (w[b] = w[b] || []).push(i); });
      i.runs.forEach(function (s) { var e = live[s.site] = live[s.site] || { site: s.site, name: s.name || s.site, items: [] }; e.items.push(i); });
    });
    return { cats: cats, 'with': w, live: live, kinds: kinds };
  }
  /* Names so common that they say little: used by more than half of the projects (computed). */
  function everywhere(items) {
    var ix = index(items), out = Object.create(null);
    if (items.length < 4) return out;
    Object.keys(ix['with']).forEach(function (n) { if (ix['with'][n].length > items.length / 2) out[n] = 1; });
    return out;
  }
  function hasPics(i) { return !!(i.cover || i.gallery.length || i.guides.length); }
  function topLang(i) { return i.langs[0] ? i.langs[0].name : (i.repo.language || ''); }
  function langColour(l) { return l.color || GH.langColour(l.name) || ['#6d44e0', '#4a2bb0', '#a98bff', '#262430', '#8f72ff'][SH.hash(l.name) % 5]; }

  /* ---------------- Routing ---------------- */
  var VIEWS = [
    { id: 'discover', label: 'Discover' },
    { id: 'city', label: 'The City' },
    { id: 'map', label: 'Map' },
    { id: 'line', label: 'Idea to live' },
    { id: 'connections', label: 'Connections' },
    { id: 'live', label: 'Live sites' },
    { id: 'new', label: 'What’s new' },
    { id: 'all', label: 'All projects' },
    { id: 'glossary', label: 'Words explained' },
    { id: 'health', label: 'Health', signedIn: true }
  ];
  var VIEW_BY = Object.create(null); VIEWS.forEach(function (v) { VIEW_BY[v.id] = v; });
  var DEEP = { p: 1, cat: 1, 'with': 1 };
  var REDIRECT = { world: 'city', categories: 'map', journey: 'line', sites: 'live' };
  var LEVELS = [{ id: 'overview', label: 'Overview' }, { id: 'built', label: 'How it’s built' }, { id: 'code', label: 'Code' }];
  HWX.q = HWX.q || '';
  HWX.level = (function () { var l = SH.store('hw_level'); return ['overview', 'built', 'code'].indexOf(l) >= 0 ? l : 'overview'; })();

  function parseRoute() {
    var h = location.hash.replace(/^#\/?/, '');
    var qi = h.indexOf('?'), path = qi >= 0 ? h.slice(0, qi) : h, qs = qi >= 0 ? h.slice(qi + 1) : '';
    var parts = path.split('/').map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    var params = Object.create(null);
    qs.split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); try { params[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); } catch (e) {} });
    var view = parts[0] || 'discover';
    if (own(REDIRECT, view)) view = REDIRECT[view];
    if (!VIEW_BY[view] && !DEEP[view]) view = 'discover';
    var arg = parts.slice(1).join('/');
    if (view === 'live' && arg) view = 'site';
    return { view: view, arg: arg, params: params, raw: parts[0] || '' };
  }
  function href(path, params) {
    var q = params ? Object.keys(params).filter(function (k) { return params[k] !== '' && params[k] != null && params[k] !== false; }).map(function (k) { return enc(k) + '=' + enc(params[k]); }).join('&') : '';
    return '#/' + path + (q ? '?' + q : '');
  }
  function pHref(i) { return href('p/' + enc(i.repo.name)); }
  function wHref(n) { return href('with/' + enc(n)); }
  function liveHref(h) { return href('live/' + enc(h)); }
  function catHref(c) { return href('cat/' + enc(c)); }
  HWX.parseRoute = parseRoute;
  HWX.href = href;
  HWX.go = function (path, params) { var h = href(path, params); if (location.hash === h) HWX.render(); else location.hash = h; };

  /* ---------------- Small parts ---------------- */
  function heading(route) { return DEEP[route.view] || route.view === 'site' || route.view === 'health' ? 'h1' : 'h2'; }
  function viewHead(route, eyebrow, title, lede, extra) {
    var h = heading(route);
    return '<header class="hwx-head">' + (eyebrow ? '<p class="eyebrow">' + eyebrow + '</p>' : '') +
      '<' + h + ' class="hwx-title">' + title + '</' + h + '>' + (lede ? '<p class="hwx-lede">' + lede + '</p>' : '') + (extra || '') + '</header>';
  }
  function secHead(title, sub, more, moreLabel, h) {
    h = h || 'h2';
    return '<div class="hwx-sec-head"><div><' + h + ' class="hwx-h2">' + esc(title) + '</' + h + '>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>' +
      (more ? '<a class="hwx-more" href="' + more + '">' + esc(moreLabel || 'See all') + I('arrow') + '</a>' : '') + '</div>';
  }
  function statusChip(i) {
    var s = i.status || (i.archived ? 'retired' : '');
    if (!s) return '';
    return '<span class="hwx-status s-' + esc(s) + '"><i aria-hidden="true"></i>' + esc(statusLabel(s) || s) + '</span>';
  }
  function privBadge(i) { return i.private ? '<span class="badge hwx-priv">' + I('lock') + 'Private</span>' : ''; }
  function catPill(i) { return '<span class="cat">' + esc(catLabel(i.category)) + '</span>'; }

  /* Generated cover: the vocabulary file's art when present, else the brand recipe below. */
  var GROUND = { products: 'v', websites: 'v', ai: 'v', tools: 'd', ops: 'd', client: 'p', wordpress: 'p', games: 'i', labs: 'i' };
  function coverArt(i, opts) {
    if (typeof HWX.coverSVG === 'function') { try { return HWX.coverSVG(i, opts || {}); } catch (e) { console.error(e); } }
    return fbCover(i);
  }
  function fbCover(i) {
    var seed = SH.hash(i.repo ? i.repo.name : i.name), R = function (k) { var x = Math.imul((seed ^ (k + 1) * 2654435761) >>> 0, 1597334677) >>> 0; x ^= x >>> 15; return (x % 10000) / 10000; };
    var g = GROUND[i.category] || 'v', id = 'hwxg' + seed + g;
    var stops = { v: ['#6d44e0', '#4a2bb0'], d: ['#1b1726', '#15121d'], p: ['#4a2bb0', '#2a1656'], i: ['#262430', '#4a2bb0'] }[g];
    var cardFill = g === 'd' ? '#211c2e' : '#ffffff', ink = g === 'd' ? '#f2f0f8' : '#262430';
    var tilt = [-1.5, 0, 1.5][seed % 3], left = seed % 2 === 0;
    var bars = '';
    for (var k = 0; k < 4; k++) bars += '<rect x="112" y="' + (86 + k * 15) + '" width="' + Math.round(40 + R(k) * 56) + '" height="7" rx="3.5" fill="' + ink + '" opacity="' + (0.25 + R(k + 9) * 0.5).toFixed(2) + '"/>';
    return '<svg class="hwx-gen" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + stops[0] + '"/><stop offset="1" stop-color="' + stops[1] + '"/></linearGradient></defs>' +
      '<rect width="320" height="200" fill="url(#' + id + ')"/>' +
      '<rect x="' + (left ? -30 : 280) + '" y="-60" width="70" height="175" rx="35" fill="#ffffff" opacity=".09" transform="rotate(' + (left ? -14 : 14) + ' ' + (left ? 5 : 315) + ' 27)"/>' +
      '<rect x="' + (left ? 236 : 34) + '" y="150" width="46" height="115" rx="23" fill="none" stroke="#ffffff" stroke-opacity=".16" stroke-width="5"/>' +
      '<g transform="rotate(' + tilt + ' 160 104)"><rect x="56" y="48" width="208" height="112" rx="12" fill="' + cardFill + '"/>' +
      '<rect x="72" y="66" width="28" height="70" rx="14" fill="#6d44e0" opacity=".14"/><rect x="112" y="66" width="74" height="9" rx="4.5" fill="#6d44e0"/>' + bars + '</g>' +
      '<g transform="translate(222 18) rotate(' + [8, -6, 4][seed % 3] + ' 24 26) scale(.17)">' +
      '<path fill="' + (g === 'd' ? '#f2f0f8' : '#ffffff') + '" transform="translate(0,13.2)" d="' + botHead() + '"/>' +
      '<rect x="105" y="115" width="23" height="58" rx="11.5" fill="#a98bff"/><rect x="178" y="115" width="23" height="58" rx="11.5" fill="#a98bff"/></g></svg>';
  }
  var BOT_HEAD = null;
  function botHead() {
    if (BOT_HEAD) return BOT_HEAD;
    var m = /class="hw-botmark-head" d="([^"]+)"/.exec(SH.botSVG('', ''));
    return (BOT_HEAD = m ? m[1] : '');
  }
  function coverMedia(i) {
    var src = i.cover || (i.gallery[0] && i.gallery[0].src) || '';
    return coverArt(i) + (src ? '<img alt="" data-img="' + esc(i.repo.name + '|' + src) + '">' : '');
  }
  function rowIcon(i) {
    return '<span class="hwx-row-ico" aria-hidden="true">' + vIcon(i.kind && own(KINDS, i.kind) ? i.kind : (i.category && own(CATS, i.category) ? i.category : 'all')) + '</span>';
  }
  function langBar(i) {
    if (!i.langs.length) return '';
    var tot = i.langTotal || i.langs.reduce(function (s, l) { return s + l.size; }, 0) || 1;
    return '<span class="hwx-langbar" role="img" aria-label="' + esc('Languages: ' + i.langs.slice(0, 4).map(function (l) { return l.name + ' ' + Math.round(l.size / tot * 100) + '%'; }).join(', ')) + '">' +
      i.langs.map(function (l) { return '<span style="width:' + (l.size / tot * 100).toFixed(2) + '%;background:' + esc(langColour(l)) + '"></span>'; }).join('') + '</span>';
  }
  function langKey(i) {
    var tot = i.langTotal || i.langs.reduce(function (s, l) { return s + l.size; }, 0) || 1;
    return '<div class="hwx-langkey">' + i.langs.slice(0, 8).map(function (l) {
      var pc = l.size / tot * 100;
      return '<span><i style="background:' + esc(langColour(l)) + '"></i>' + esc(l.name) + ' ' + (pc < 0.1 ? 'under 0.1' : pc.toFixed(pc < 1 ? 1 : 0)) + '%</span>';
    }).join('') + '</div>';
  }
  function delay(i, k) { return Math.round((k % 4) * 45 + (SH.hash(i.repo.name) % 90)); }

  /* The project card: one link, the cover on top, then category, name, a line, status and when. */
  function card(i, k) {
    var lv = HWX.level, meta = statusChip(i);
    if (i.demo) meta += '<span class="badge">Demo</span>';
    if (i.private) meta += privBadge(i);
    if (lv !== 'overview' && i.kind) meta += '<span class="hwx-card-kind">' + esc(kindLabel(i.kind)) + '</span>';
    return '<a class="hwx-card hw-rv" href="' + pHref(i) + '" style="--rv-d:' + delay(i, k || 0) + 'ms">' +
      '<span class="hwx-card-media">' + coverMedia(i) + '</span>' +
      '<span class="hwx-card-body">' + catPill(i) +
        '<h3 class="hwx-card-title">' + esc(i.name) + '</h3>' +
        (lv !== 'overview' ? '<span class="hwx-card-repo">' + esc(i.repo.full_name || ACCOUNT + '/' + i.repo.name) + (lv === 'code' ? ' · ' + esc(SH.size(i.repo.size)) + (topLang(i) ? ' · ' + esc(topLang(i)) : '') : '') + '</span>' : '') +
        '<span class="hwx-card-text">' + esc(i.tagline || i.summary || 'No description yet.') + '</span>' +
        (lv !== 'overview' ? langBar(i) : '') +
        (meta ? '<span class="hwx-card-meta">' + meta + '</span>' : '') +
        '<span class="act"><span class="rt">' + esc(when(i) ? 'Updated ' + ago(when(i)) : 'Not changed yet') + '</span><span class="go">Open project</span></span>' +
      '</span></a>';
  }
  function row(i, sub) {
    return '<a class="hwx-row hw-rv" href="' + pHref(i) + '">' + rowIcon(i) +
      '<span class="hwx-row-main"><span class="hwx-row-t">' + esc(i.name) + '</span><span class="hwx-row-s">' + esc(sub || i.tagline || catLabel(i.category)) + '</span></span>' +
      '<span class="hwx-row-go" aria-hidden="true">' + I('right') + '</span></a>';
  }
  function grid(items) { return '<div class="hwx-grid">' + items.map(card).join('') + '</div>'; }
  function cardsAndRows(items) {
    var big = items.filter(function (i) { return kindSize(i.kind) > 1; }), small = items.filter(function (i) { return kindSize(i.kind) === 1; });
    var out = '';
    if (big.length) out += grid(big);
    if (small.length) out += (big.length ? '<h3 class="hwx-h3 hwx-small-head">' + plural(small.length, 'smaller project') + ' <span>(scripts, documents and templates)</span></h3>' : '') +
      '<div class="hwx-rows">' + small.map(function (i) { return row(i); }).join('') + '</div>';
    return out;
  }
  function shelf(items, wide, label) {
    if (!items.length) return '';
    return '<div class="hwx-shelf' + (wide ? ' wide' : '') + '"><button type="button" class="hwx-shelf-btn prev" data-shelf="-1" aria-label="Scroll back' + (label ? ' through ' + esc(label) : '') + '">' + I('left') + '</button>' +
      '<div class="hwx-shelf-track">' + items.map(card).join('') + '</div>' +
      '<button type="button" class="hwx-shelf-btn next" data-shelf="1" aria-label="Scroll on' + (label ? ' through ' + esc(label) : '') + '">' + I('right') + '</button></div>';
  }
  function needsSignIn() {
    return GH.state.signedIn ? '' : '<div class="hwx-note" role="note">' + SH.botSVG('hwx-note-bot') + '<p>You are seeing <strong>public projects only</strong>. Sign in to see every project your GitHub account can read.</p>' +
      '<button class="btn btn-primary btn-sm" type="button" data-signin>Sign in</button></div>';
  }
  function errorNote() {
    var e = GH.state.error;
    if (!e) return '';
    if (e instanceof GH.RateLimit) {
      var t = new Date(e.reset).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
      return '<div class="hwx-note is-warn" role="alert"><p>GitHub allows 60 requests an hour to signed-out visitors, and that limit is used up. Sign in, or try again after ' + esc(t) + '.</p>' +
        '<button class="btn btn-primary btn-sm" type="button" data-signin>Sign in</button></div>';
    }
    return '<div class="hwx-note is-warn" role="alert"><p>Some project details could not be loaded. ' + esc(e.message || '') + '</p><button class="btn btn-quiet btn-sm" type="button" data-retry>' + I('refresh') + 'Try again</button></div>';
  }
  function empty(title, text, extra) { return '<div class="hwx-empty">' + SH.botSVG('hwx-empty-bot') + '<b>' + title + '</b>' + (text ? '<p>' + text + '</p>' : '') + (extra || '') + '</div>'; }
  function skeleton() {
    var s = '<div class="hwx-grid" aria-hidden="true">';
    for (var i = 0; i < 8; i++) s += '<div class="hwx-card is-skel"><span class="hwx-card-media"></span><span class="hwx-card-body"><span class="hw-skel" style="width:40%;height:14px"></span><span class="hw-skel" style="width:75%;height:20px"></span><span class="hw-skel" style="width:90%;height:14px"></span></span></div>';
    return s + '</div>';
  }

  /* ---------------- Views ---------------- */
  var R = {};

  R.discover = function (items, route) {
    var demos = items.filter(function (i) { return i.demo; }).sort(friendly);
    var ix = index(items), ev = everywhere(items);
    var withN = Object.keys(ix['with']).filter(function (n) { return !ev[n]; }).length;
    var out = viewHead(route, 'Start here', 'Discover', 'Everything HelloWorld builds is here. Pick a way in, then select anything to see more.');
    // The City preview: a way in, drawn from the projects (the live City is one select away).
    out += '<a class="hwx-citycard hw-rv" href="' + href('city') + '"><span class="hwx-citycard-art" id="hwx-city-preview">' + cityArt(items) + '</span>' +
      '<span class="hwx-citycard-body"><span class="cat">The City</span><span class="hwx-citycard-t">Every project is a building</span>' +
      '<span class="hwx-citycard-x">Its shape shows the kind of project and its height shows how much code it holds. Districts group the projects by category, in order from idea to live.</span>' +
      '<span class="act"><span class="rt">' + plural(items.length, 'building') + ' in ' + plural(Object.keys(ix.cats).filter(function (c) { return c !== '_none'; }).length, 'district') + '</span><span class="go">Open the City</span></span></span></a>';
    out += '<div class="hwx-doors">' +
      door(href('line'), 'Idea to live', 'See projects from the first try to running live, stage by stage.', STAGES.length + ' stages', artLine()) +
      door(href('connections'), 'See how it connects', 'See which tools and services each project is built with.', plural(withN, 'tool'), artNodes()) +
      door(href('map'), 'Browse the map', 'Every project as one shape, grouped by category.', plural(items.length, 'project'), artPills(items)) + '</div>';
    var featured = items.filter(function (i) { return i.cover || i.demo || i.status === 'live'; }).sort(function (a, b) { return ((b.cover ? 2 : 0) + (b.demo ? 2 : 0) + (b.status === 'live' ? 1 : 0)) - ((a.cover ? 2 : 0) + (a.demo ? 2 : 0) + (a.status === 'live' ? 1 : 0)) || recent(a, b); }).slice(0, 4);
    if (featured.length) out += '<section class="hwx-sec">' + secHead('Featured', 'Projects with pictures, demos or a live address.', href('all'), 'All projects') + grid(featured) + '</section>';
    if (demos.length) out += '<section class="hwx-sec" id="hwx-try">' + secHead('Try it now', 'Demos that open safely in your browser, with made-up data.', href('all', { demo: 1 }), 'Every demo') + shelf(demos, true, 'the demos') + '</section>';
    out += '<section class="hwx-sec">' + secHead('New and updated', 'The projects that changed most recently.', href('new'), 'See what’s new') + shelf(items.slice().sort(recent).slice(0, 12), false, 'new and updated projects') + '</section>';
    CAT_ORDER.forEach(function (c) {
      var g = items.filter(function (i) { return i.category === c; }).sort(friendly);
      if (!g.length) return;
      out += '<section class="hwx-sec">' + secHead(catLabel(c), catBlurb(c), catHref(c), 'See all ' + g.length) + shelf(g.slice(0, 12), false, catLabel(c)) + '</section>';
    });
    var unsorted = items.filter(function (i) { return !i.category; });
    if (unsorted.length && GH.state.signedIn) out += '<section class="hwx-sec">' + secHead('Not sorted yet', 'Projects without a hub card or a category topic.', href('all', { cat: '_none' }), 'See all ' + unsorted.length) + shelf(unsorted.sort(recent).slice(0, 12), false, 'unsorted projects') + '</section>';
    var words = KIND_ORDER.filter(function (k) { return ix.kinds[k]; }).sort(function (a, b) { return ix.kinds[b] - ix.kinds[a]; }).slice(0, 3)
      .map(function (k) { return { k: 'Kind of project', t: kindLabel(k), x: kindExplain(k), h: href('all', { kind: k }), n: ix.kinds[k] }; })
      .concat(Object.keys(ix['with']).filter(function (n) { return own(PLATFORMS, n); }).sort(function (a, b) { return ix['with'][b].length - ix['with'][a].length; }).slice(0, 3)
        .map(function (n) { return { k: 'Built with', t: n, x: PLATFORMS[n], h: wHref(n), n: ix['with'][n].length }; }));
    if (words.length) out += '<section class="hwx-sec">' + secHead('Words worth knowing', 'Short explanations of the words you see on this page.', href('glossary'), 'All the words') +
      '<div class="hwx-terms">' + words.map(termCard).join('') + '</div></section>';
    return out;
  };
  function door(h, t, x, n, art) {
    return '<a class="hwx-door hw-rv" href="' + h + '"><span class="hwx-door-art" aria-hidden="true">' + art + '</span><span class="hwx-door-body"><span class="hwx-door-t">' + esc(t) + '</span><span class="hwx-door-x">' + esc(x) + '</span>' +
      '<span class="act"><span class="rt">' + esc(n) + '</span><span class="go">Open</span></span></span></a>';
  }
  function termCard(w) {
    return '<div class="hwx-term hw-rv"><span class="k">' + esc(w.k) + '</span><h3>' + esc(w.t) + '</h3><p>' + esc(w.x || '') + '</p>' +
      (w.h && w.n ? '<a href="' + w.h + '">See ' + plural(w.n, 'project') + '<span class="sr-only"> for ' + esc(w.t) + '</span></a>' : '') + '</div>';
  }
  /* Door and preview art: static drawings in the brand's violets (nothing loops). */
  function artLine() {
    var pts = [[34, 112], [112, 70], [190, 104], [268, 58]], d = 'M' + pts[0].join(' ');
    for (var i = 1; i < pts.length; i++) { var mx = (pts[i - 1][0] + pts[i][0]) / 2; d += ' C' + mx + ' ' + pts[i - 1][1] + ' ' + mx + ' ' + pts[i][1] + ' ' + pts[i][0] + ' ' + pts[i][1]; }
    var s = '<svg viewBox="0 0 300 160" preserveAspectRatio="xMidYMid meet"><path d="' + d + '" class="a-track"/><path d="' + d + '" class="a-line"/>';
    pts.forEach(function (p, k) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="15" class="a-stop"/><text x="' + p[0] + '" y="' + (p[1] + 5) + '" class="a-num">' + (k + 1) + '</text>'; });
    return s + '</svg>';
  }
  function artNodes() {
    var hubs = [[96, 70, 16], [204, 56, 12], [226, 118, 14], [134, 122, 10]];
    var dots = [[50, 36], [58, 100], [150, 30], [166, 92], [258, 28], [272, 84], [190, 146], [92, 146], [276, 140], [40, 140]];
    var s = '<svg viewBox="0 0 300 160" preserveAspectRatio="xMidYMid meet">';
    dots.forEach(function (d, i) { var h = hubs[i % hubs.length]; s += '<line x1="' + d[0] + '" y1="' + d[1] + '" x2="' + h[0] + '" y2="' + h[1] + '" class="a-link"/>'; });
    hubs.forEach(function (h) { s += '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="' + h[2] + '" class="a-hub"/>'; });
    dots.forEach(function (d) { s += '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="5" class="a-dot"/>'; });
    return s + '</svg>';
  }
  function artPills(items) {
    var s = '<svg viewBox="0 0 300 160" preserveAspectRatio="xMidYMid meet">', x = 18, y = 22, n = Math.max(items.length, 18);
    for (var k = 0; k < Math.min(n, 30); k++) {
      var it = items[k], sz = it ? kindSize(it.kind) : 1 + (k % 3), w = 6 + sz * 4, h = w * 2.5;
      if (x + w > 286) { x = 18; y += 62; }
      if (y > 140) break;
      s += '<rect x="' + x + '" y="' + (y + (40 - h)) + '" width="' + w + '" height="' + h + '" rx="' + (w / 2) + '" class="' + (it && it.status === 'live' ? 'a-pill-live' : 'a-pill') + '"/>';
      x += w + 9;
    }
    return s + '</svg>';
  }
  /* An isometric model of the City: one plot per category, one block per project. */
  function cityArt(items) {
    var u = 13, ox = 300, oy = 26, s = '', x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    function P(a, b, z) { var x = ox + (a - b) * u, y = oy + (a + b) * u / 2 - z; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; return x.toFixed(1) + ',' + y.toFixed(1); }
    var cats = CAT_ORDER.filter(function (c) { return items.some(function (i) { return i.category === c; }); });
    if (items.some(function (i) { return !i.category; })) cats.push('_none');
    var cols = 3, blocks = [];
    cats.forEach(function (c, ci) {
      var px = (ci % cols) * 7.2, py = Math.floor(ci / cols) * 7.2;
      s += '<polygon class="c-plot" points="' + P(px - .4, py - .4, 0) + ' ' + P(px + 6, py - .4, 0) + ' ' + P(px + 6, py + 6, 0) + ' ' + P(px - .4, py + 6, 0) + '"/>';
      items.filter(function (i) { return (i.category || '_none') === c; }).slice(0, 16).forEach(function (i, k) {
        var a = px + (k % 4) * 1.5, b = py + Math.floor(k / 4) * 1.5;
        var hgt = 10 + kindSize(i.kind) * 9 + Math.min(26, Math.log(1 + (i.repo.size || 1)) * 2.4);
        blocks.push({ a: a, b: b, h: hgt, live: i.status === 'live', dim: i.status === 'paused' || i.status === 'retired' });
      });
    });
    blocks.sort(function (x, y) { return (x.a + x.b) - (y.a + y.b); });
    blocks.forEach(function (o) {
      var a = o.a, b = o.b, h = o.h, cls = o.live ? ' is-live' : o.dim ? ' is-dim' : '';
      s += '<g class="c-block' + cls + '"><polygon class="c-l" points="' + P(a, b + 1, 0) + ' ' + P(a + 1, b + 1, 0) + ' ' + P(a + 1, b + 1, h) + ' ' + P(a, b + 1, h) + '"/>' +
        '<polygon class="c-r" points="' + P(a + 1, b, 0) + ' ' + P(a + 1, b + 1, 0) + ' ' + P(a + 1, b + 1, h) + ' ' + P(a + 1, b, h) + '"/>' +
        '<polygon class="c-t" points="' + P(a, b, h) + ' ' + P(a + 1, b, h) + ' ' + P(a + 1, b + 1, h) + ' ' + P(a, b + 1, h) + '"/></g>';
    });
    // fit the drawing, whatever the number of districts
    var pad = 14, w = Math.max(120, x1 - x0 + pad * 2), hh = Math.max(80, y1 - y0 + pad * 2);
    return '<svg viewBox="' + (x0 - pad).toFixed(0) + ' ' + (y0 - pad).toFixed(0) + ' ' + w.toFixed(0) + ' ' + hh.toFixed(0) + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' + s + '</svg>';
  }

  /* The City is drawn by hwc-ui.js (HWX.views.city). Without it, a short note and the ways round. */
  function cityFallback(items, route) {
    return viewHead(route, 'The City', 'The City', 'Every project as a building. The City is not available on this page yet.') +
      empty('The City could not be opened', 'The map and All projects show the same projects.', '<p><a class="btn btn-primary" href="' + href('map') + '">' + vIcon('map') + 'Open the map</a></p>');
  }

  R.map = function (items, route) {
    var q = HWX.q, k = 0;
    var out = viewHead(route, 'The map', 'The map', 'Each shape is one project, grouped by category. Tall shapes are web apps and larger projects; small ones are scripts and documents. Type in the search box to light up projects.');
    out += '<div class="hwx-legend" aria-hidden="true"><span><i class="hwx-pin k3 s-live"></i>Live</span><span><i class="hwx-pin k3 s-in-progress"></i>In progress</span><span><i class="hwx-pin k3 s-experimental"></i>Experimental</span><span><i class="hwx-pin k3 s-paused"></i>Paused or retired</span><span><i class="hwx-pin k3"></i>No status yet</span></div>';
    out += '<div class="hwx-map">';
    var cats = CAT_ORDER.slice(); if (items.some(function (i) { return !i.category; })) cats.push('_none');
    cats.forEach(function (c) {
      var g = items.filter(function (i) { return (i.category || '_none') === c; }).sort(friendly);
      if (!g.length) return;
      var st = STAGE_OF[c];
      var hits = q ? g.filter(function (i) { return matches(i, q); }).length : 0;
      out += '<section class="hwx-district hw-rv' + (g.length > 26 ? ' span2' : '') + '" aria-label="' + esc(catLabel(c)) + '">' +
        '<a class="hwx-district-head" href="' + (c === '_none' ? href('all', { cat: '_none' }) : catHref(c)) + '"><span class="hwx-district-ico" aria-hidden="true">' + vIcon(c === '_none' ? 'all' : c) + '</span><span><b>' + esc(catLabel(c)) + '</b>' +
        '<small>' + (q ? hits + ' of ' + plural(g.length, 'project') : plural(g.length, 'project')) + (st ? ' · ' + esc(st.label) : '') + '</small></span></a><div class="hwx-pins">' +
        g.map(function (i) {
          var hit = q && matches(i, q), s = i.status || (i.archived ? 'retired' : '');
          return '<button type="button" class="hwx-pin k' + kindSize(i.kind) + (s ? ' s-' + esc(s) : '') + (q ? (hit ? ' hit' : ' dim') : '') + '" style="--d:' + Math.min(900, Math.round((k++) * 9 + (SH.hash(i.repo.name) % 160))) + 'ms" data-go="p/' + esc(enc(i.repo.name)) + '"' +
            ' aria-label="' + esc(i.name + (s ? ', ' + (statusLabel(s) || s) : '')) + '" data-tip-k="' + esc(i.kind ? kindLabel(i.kind) : catLabel(c)) + '" data-tip-title="' + esc(i.name) + '" data-tip="' + esc(i.tagline || '') + '"></button>';
        }).join('') + '</div></section>';
    });
    return out + '</div>';
  };

  R.line = function (items, route) {
    var by = Object.create(null);
    items.forEach(function (i) { var s = i.stage || (i.category && STAGE_OF[i.category] ? STAGE_OF[i.category].id : ''); if (s) (by[s] = by[s] || []).push(i); });
    var out = viewHead(route, 'Idea to live', 'From an idea to a running product', 'HelloWorld’s work moves along one line: ideas are explored, the good ones are built, finished work ships, and what ships has to keep running. Select a stop to open the project, or a category to see the whole area.');
    out += '<div class="hwx-line hw-rv"><div class="hwx-road" id="hwx-road" aria-hidden="true"></div><ol class="hwx-stations">';
    STAGES.forEach(function (s) {
      var g = (by[s.id] || []).sort(friendly), show = g.slice(0, 6);
      out += '<li class="hwx-station"><div class="hwx-station-head"><span class="hwx-station-n" aria-hidden="true">' + s.n + '</span><h2 class="hwx-h3">' + esc(s.label) + '</h2><p>' + esc(s.blurb) + '</p></div><div class="hwx-station-list">' +
        show.map(function (i) { return '<a class="hwx-stop" href="' + pHref(i) + '" data-tip-title="' + esc(i.name) + '" data-tip="' + esc(i.tagline || '') + '"><i aria-hidden="true"></i><span>' + esc(i.name) + '</span></a>'; }).join('') +
        s.categories.map(function (c) { var n = g.filter(function (i) { return i.category === c; }).length; return n ? '<a class="hwx-stop-more" href="' + catHref(c) + '">' + esc(catLabel(c)) + ': ' + n + I('arrow') + '</a>' : ''; }).join('') +
        (g.length ? '' : '<span class="hwx-stop-none">Nothing here yet</span>') + '</div></li>';
    });
    out += '</ol></div>';
    var loose = items.filter(function (i) { return !i.category; });
    if (loose.length) out += '<p class="hwx-aside">' + plural(loose.length, 'project') + ' have no category yet, so they are not on the line. <a href="' + href('all', { cat: '_none' }) + '">See them</a>.</p>';
    return out;
  };
  function drawRoad(items) {
    var box = document.getElementById('hwx-road'); if (!box) return;
    var W = box.clientWidth, H = 120; if (!W) return;
    var counts = Object.create(null);
    items.forEach(function (i) { var s = i.stage || (i.category && STAGE_OF[i.category] ? STAGE_OF[i.category].id : ''); if (s) counts[s] = (counts[s] || 0) + 1; });
    var pts = STAGES.map(function (s, i) { return [(i + .5) * W / STAGES.length, i % 2 ? 78 : 44]; });
    if (!pts.length) return;
    var d = 'M-10 ' + pts[0][1] + ' L' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length; i++) { var mx = (pts[i - 1][0] + pts[i][0]) / 2; d += ' C' + mx + ' ' + pts[i - 1][1] + ' ' + mx + ' ' + pts[i][1] + ' ' + pts[i][0] + ' ' + pts[i][1]; }
    d += ' L' + (W + 10) + ' ' + pts[pts.length - 1][1];
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '"><path d="' + d + '" class="r-track"/><path d="' + d + '" class="r-line" pathLength="1"/>';
    pts.forEach(function (p, k) {
      var st = STAGES[k];
      s += '<g class="r-stop" style="--k:' + k + '" transform="translate(' + p[0].toFixed(1) + ' ' + p[1] + ')"><circle r="24" class="r-halo"/><circle r="18" class="r-ring"/><text y="6" class="r-n">' + st.n + '</text>' +
        '<g transform="translate(20 -18)"><rect x="-13" y="-10" width="26" height="20" rx="10" class="r-count"/><text y="4.5" class="r-count-t">' + (counts[st.id] || 0) + '</text></g></g>';
    });
    box.innerHTML = s + '</svg>';
    if (!SH.reduced()) { box.classList.remove('is-drawn'); box.getBoundingClientRect(); box.classList.add('is-drawn'); } else box.classList.add('is-drawn', 'is-still');
  }

  /* The circles: tools shared by two or more projects, without the near-universal ones, unless
     the viewer asks for every tool (or there are few). */
  function hubFilter(items, all) {
    var ix = index(items), ev = everywhere(items), names = Object.keys(ix['with']);
    if (all || names.length <= 24) return names.filter(function (p) { return all || !ev[p]; });
    return names.filter(function (p) { return !ev[p] && ix['with'][p].length >= 2; });
  }
  R.connections = function (items, route) {
    var total = Object.keys(index(items)['with']).length, shown = hubFilter(items, false).length;
    return viewHead(route, 'Connections', 'How it all connects', 'Each circle is a tool or service that HelloWorld projects are built with; each small dot is one project. Select a circle to see what is built with it. You can drag the circles.') +
      '<div class="hwx-graph-wrap"><div class="hwx-graph" id="hwx-graph"><div class="hwx-graph-tools">' +
      (total > shown ? '<button type="button" class="hwx-toggle" id="hwx-g-all" aria-pressed="' + !!HWX._gAll + '">Show every tool and service (' + total + ')</button>' : '') +
      '</div><span class="hwx-graph-note" id="hwx-g-note"></span></div><aside class="hwx-panel" id="hwx-panel" aria-live="polite"></aside></div>';
  };
  function graphPanel(items, hubName) {
    var panel = document.getElementById('hwx-panel'); if (!panel) return;
    var ix = index(items), ev = everywhere(items);
    if (!hubName) {
      var top = Object.keys(ix['with']).sort(function (a, b) { return (ev[a] ? 1 : 0) - (ev[b] ? 1 : 0) || ix['with'][b].length - ix['with'][a].length || a.localeCompare(b); });
      panel.innerHTML = '<h2 class="hwx-h3">Tools and services</h2><p>Select a circle in the picture, or a name in this list, to see the projects built with it.</p>' +
        (top.length ? '<div class="hwx-with">' + top.map(function (p) { return '<a href="' + wHref(p) + '" data-hub="' + esc(p) + '"><b>' + esc(p) + '</b><span>' + plural(ix['with'][p].length, 'project') + (own(PLATFORMS, p) ? ' · ' + esc(PLATFORMS[p].split('. ')[0]) : '') + '</span></a>'; }).join('') + '</div>'
          : '<p>No project lists what it is built with yet. Cards say it in <code>built_with</code>.</p>');
      return;
    }
    var g = (ix['with'][hubName] || []).slice().sort(friendly);
    panel.innerHTML = '<span class="cat">Built with</span><h2 class="hwx-h3">' + esc(hubName) + '</h2><p>' + esc(own(PLATFORMS, hubName) ? PLATFORMS[hubName] : 'A tool or service that HelloWorld projects are built with.') + '</p>' +
      '<p><a class="btn btn-primary btn-sm" href="' + wHref(hubName) + '">Open the ' + esc(hubName) + ' page' + I('arrow') + '</a></p>' +
      '<div class="hwx-rows one">' + g.map(function (i) { return row(i); }).join('') + '</div>' +
      '<p><a href="#" data-hub="">Show every tool and service</a></p>';
  }
  var graphStop = null;
  function drawGraph(items, withEverywhere) {
    var box = document.getElementById('hwx-graph'); if (!box) return;
    if (graphStop) graphStop();
    var old = box.querySelector('svg'); if (old) old.remove();
    var W = box.clientWidth, H = box.clientHeight;
    if (!W || !H) return;
    var NS = 'http://www.w3.org/2000/svg', ev = everywhere(items);
    var svgEl = document.createElementNS(NS, 'svg'); svgEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svgEl.setAttribute('role', 'group'); svgEl.setAttribute('aria-label', 'Tools and services, and the projects built with them');
    box.insertBefore(svgEl, box.firstChild);
    var ix = index(items), hubNames = hubFilter(items, withEverywhere);
    var nodes = [], links = [], hubBy = Object.create(null);
    hubNames.forEach(function (n, i) {
      var a = i / hubNames.length * Math.PI * 2, rr = Math.min(W, H) * .32;
      var node = { id: 'h:' + n, hub: true, name: n, deg: ix['with'][n].length, x: W / 2 + Math.cos(a) * rr, y: H / 2 + Math.sin(a) * rr, vx: 0, vy: 0 };
      node.r = 12 + Math.sqrt(node.deg) * 4.2; nodes.push(node); hubBy[n] = node;
    });
    var loose = 0;
    items.forEach(function (it) {
      var hs = it.built_with.filter(function (w) { return hubBy[w]; });
      if (!hs.length) { loose++; return; }
      var h0 = hubBy[hs[0]], seed = SH.hash(it.repo.name);
      var node = { id: 'p:' + it.repo.name, info: it, x: h0.x + ((seed % 100) / 100 - .5) * 80, y: h0.y + (((seed >> 8) % 100) / 100 - .5) * 80, vx: 0, vy: 0, r: 3.5 + kindSize(it.kind) * 1.8 };
      nodes.push(node);
      hs.forEach(function (w) { links.push({ s: node, t: hubBy[w] }); });
    });
    var note = document.getElementById('hwx-g-note');
    if (note) note.textContent = plural(nodes.length - hubNames.length, 'project') + ' linked to ' + plural(hubNames.length, 'tool or service', 'tools and services') + (withEverywhere ? '' : ' used by more than one project') + (loose ? ' · ' + loose + ' not shown' : '');
    if (!hubNames.length) { svgEl.remove(); return; }
    var gL = document.createElementNS(NS, 'g'), gN = document.createElementNS(NS, 'g'); svgEl.appendChild(gL); svgEl.appendChild(gN);
    links.forEach(function (l) { l.el = document.createElementNS(NS, 'line'); l.el.setAttribute('class', 'lk'); gL.appendChild(l.el); });
    nodes.forEach(function (n) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
      if (n.hub) {
        g.setAttribute('class', 'nd nd-h'); g.innerHTML = '<circle class="core" r="' + n.r + '"/><text class="lbl" text-anchor="middle" y="' + (n.r + 16) + '">' + esc(n.name) + '</text><text class="deg" text-anchor="middle" y="4">' + n.deg + '</text>';
        g.setAttribute('aria-label', n.name + ': ' + plural(n.deg, 'project') + '. Press Enter to list them.');
        g.setAttribute('data-tip-title', n.name); g.setAttribute('data-tip', own(PLATFORMS, n.name) ? PLATFORMS[n.name] : '');
      } else {
        var s = n.info.status || '';
        g.setAttribute('class', 'nd nd-p' + (s ? ' s-' + s : '')); g.innerHTML = '<circle r="' + n.r + '"/>';
        g.setAttribute('aria-label', n.info.name + '. Press Enter to open the project.');
        g.setAttribute('data-tip-k', catLabel(n.info.category)); g.setAttribute('data-tip-title', n.info.name); g.setAttribute('data-tip', n.info.tagline || '');
      }
      n.el = g; gN.appendChild(g);
    });
    function focus(n) {
      if (!n) { links.forEach(function (l) { l.el.setAttribute('class', 'lk'); }); nodes.forEach(function (m) { m.el.classList.remove('off'); }); return; }
      var near = {}; near[n.id] = 1;
      links.forEach(function (l) { var on = l.s === n || l.t === n; l.el.setAttribute('class', 'lk ' + (on ? 'on' : 'off')); if (on) { near[l.s.id] = 1; near[l.t.id] = 1; } });
      nodes.forEach(function (m) { m.el.classList.toggle('off', !near[m.id]); });
    }
    var selected = null;
    function pick(n) {
      if (n.hub) { selected = n; focus(n); nodes.forEach(function (m) { if (m.hub) m.el.classList.toggle('sel', m === n); }); graphPanel(items, n.name); }
      else location.hash = pHref(n.info);
    }
    nodes.forEach(function (n) {
      n.el.addEventListener('mouseenter', function () { if (!selected) focus(n); });
      n.el.addEventListener('mouseleave', function () { if (!selected) focus(null); });
      n.el.addEventListener('focus', function () { if (!selected) focus(n); });
      n.el.addEventListener('blur', function () { if (!selected) focus(null); });
      n.el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(n); } });
    });
    var alpha = 1, raf = 0, drag = null, moved = false;
    function tick() {
      var i, j, a, b, dx, dy, d2, d, f;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j]; dx = b.x - a.x; dy = b.y - a.y; d2 = dx * dx + dy * dy || 1; d = Math.sqrt(d2);
          var k = (a.hub && b.hub) ? 16000 : (a.hub || b.hub) ? 900 : 260;
          f = Math.min(k / d2, 6) * alpha; var min = a.r + b.r + ((a.hub && b.hub) ? 70 : 3);
          if (d < min) f += (min - d) * .5;
          dx /= d; dy /= d; a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f;
        }
      }
      links.forEach(function (l) {
        dx = l.t.x - l.s.x; dy = l.t.y - l.s.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
        var L = l.t.r + 34 + l.s.r; f = (d - L) * .035 * alpha; dx /= d; dy /= d;
        l.s.vx += dx * f; l.s.vy += dy * f; l.t.vx -= dx * f * .15; l.t.vy -= dy * f * .15;
      });
      nodes.forEach(function (n) {
        n.vx += (W / 2 - n.x) * .0016 * alpha; n.vy += (H / 2 - n.y) * .0022 * alpha;
        if (n === drag) { n.vx = n.vy = 0; return; }
        n.vx *= .78; n.vy *= .78; n.x += n.vx; n.y += n.vy;
        var padX = n.hub ? Math.max(n.r + 6, n.name.length * 3.8) : n.r + 4;
        n.x = Math.max(padX, Math.min(W - padX, n.x)); n.y = Math.max(n.r + 10, Math.min(H - n.r - (n.hub ? 34 : 8), n.y));
      });
      draw(); alpha *= .985;
      if (alpha > .015 || drag) raf = requestAnimationFrame(tick); else raf = 0;
    }
    function draw() {
      links.forEach(function (l) { l.el.setAttribute('x1', l.s.x.toFixed(1)); l.el.setAttribute('y1', l.s.y.toFixed(1)); l.el.setAttribute('x2', l.t.x.toFixed(1)); l.el.setAttribute('y2', l.t.y.toFixed(1)); });
      nodes.forEach(function (n) { n.el.setAttribute('transform', 'translate(' + n.x.toFixed(1) + ' ' + n.y.toFixed(1) + ')'); });
    }
    if (SH.reduced()) { for (var t = 0; t < 320; t++) { tick(); cancelAnimationFrame(raf); } alpha = 0; draw(); }
    else raf = requestAnimationFrame(tick);
    function pt(e) { var r = svgEl.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
    svgEl.addEventListener('pointerdown', function (e) {
      var g = e.target.closest('.nd'); if (!g) return;
      var n = nodes.filter(function (m) { return m.el === g; })[0]; if (!n) return;
      drag = n; moved = false; svgEl.classList.add('dragging'); svgEl.setPointerCapture(e.pointerId);
      if (!raf && !SH.reduced()) { alpha = Math.max(alpha, .25); raf = requestAnimationFrame(tick); }
    });
    svgEl.addEventListener('pointermove', function (e) {
      if (!drag) return; var p = pt(e); if (Math.abs(p.x - drag.x) + Math.abs(p.y - drag.y) > 2) moved = true; drag.x = p.x; drag.y = p.y; alpha = Math.max(alpha, .2);
      if (SH.reduced()) draw();
    });
    svgEl.addEventListener('pointerup', function () {
      if (!drag) return; var n = drag; drag = null; svgEl.classList.remove('dragging');
      if (!moved) pick(n);
    });
    HWX._graphSelect = function (name) {
      selected = name ? hubBy[name] : null; focus(selected);
      nodes.forEach(function (m) { if (m.hub) m.el.classList.toggle('sel', m === selected); });
      graphPanel(items, name);
    };
    graphStop = function () { if (raf) cancelAnimationFrame(raf); raf = 0; };
  }

  R.live = function (items, route) {
    var ix = index(items), sites = Object.keys(ix.live).map(function (k) { return ix.live[k]; }).sort(function (a, b) { return b.items.length - a.items.length || a.name.localeCompare(b.name); });
    var out = viewHead(route, 'Live sites', 'Where it runs', 'Projects with a live address, one card for each address. Select one to see everything that runs there.');
    if (!sites.length) return out + empty('No project has a live address yet', GH.state.signedIn ? 'When a hub card names a <code>live_url</code>, its address appears here.' : 'Sign in to see private projects too.');
    return out + '<div class="hwx-sites">' + sites.map(function (s, k) {
      var kinds = Object.create(null); s.items.forEach(function (it) { if (it.kind) kinds[it.kind] = (kinds[it.kind] || 0) + 1; });
      var ks = KIND_ORDER.filter(function (x) { return kinds[x]; });
      return '<a class="hwx-site hw-rv" href="' + liveHref(s.site) + '" style="--rv-d:' + (k % 3) * 60 + 'ms"><span class="hwx-site-art" aria-hidden="true"><span class="hwx-browser"><span class="hwx-browser-bar"><i></i><i></i><i></i><span class="hwx-browser-url">' + esc(s.site) + '</span></span>' +
        '<span class="hwx-browser-body">' + s.items.slice(0, 3).map(function (it, j) { return '<span class="hwx-browser-line" style="width:' + (88 - j * 18) + '%"></span>'; }).join('') + '</span></span></span>' +
        '<span class="hwx-site-body"><span class="cat">Live site</span><h3 class="hwx-card-title">' + esc(s.name) + '</h3>' +
        '<span class="hwx-card-text">' + esc(s.items.slice(0, 3).map(function (it) { return it.name; }).join(', ') + (s.items.length > 3 ? ' and ' + (s.items.length - 3) + ' more' : '')) + '</span>' +
        '<span class="act"><span class="rt">' + esc(ks.map(function (x) { return kindCount(x, kinds[x]); }).join(', ') || plural(s.items.length, 'project')) + '</span><span class="go">See the projects</span></span></span></a>';
    }).join('') + '</div>';
  };

  R['new'] = function (items, route) {
    var weeks = 26, now = Date.now(), wk = 7 * 864e5, bars = [];
    for (var i = 0; i < weeks; i++) bars.push([]);
    items.forEach(function (it) { var t = new Date(when(it) || 0).getTime(), w = Math.floor((now - t) / wk); if (w >= 0 && w < weeks) bars[weeks - 1 - w].push(it); });
    var max = Math.max.apply(null, bars.map(function (b) { return b.length; })) || 1;
    var strip = '<div class="hwx-strip hw-rv"><h2 class="hwx-h3">Projects changed each week, over the last six months</h2><p>Each project appears once, in the week of its latest change. This week is the last bar.</p>' +
      '<div class="hwx-strip-bars" role="list">' + bars.map(function (b, k) {
        var per = Object.create(null); b.forEach(function (it) { var c = it.category || '_none'; per[c] = (per[c] || 0) + 1; });
        var d = new Date(now - (weeks - 1 - k) * wk), lab = 'Week of ' + d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) + ': ' + plural(b.length, 'project');
        var tip = Object.keys(per).map(function (c) { return catLabel(c === '_none' ? null : c) + ': ' + per[c]; }).join(' · ');
        return '<div class="hwx-strip-bar' + (k === weeks - 1 ? ' is-now' : '') + '" role="listitem" tabindex="' + (b.length ? 0 : -1) + '" aria-label="' + esc(lab + (tip ? '. ' + tip : '')) + '" data-tip-title="' + esc(lab) + '" data-tip="' + esc(tip) + '">' +
          (b.length ? '<span class="hwx-strip-n" aria-hidden="true">' + b.length + '</span>' : '') +
          '<span class="hwx-strip-fill" style="height:' + (b.length / max * 100).toFixed(1) + '%;--d:' + Math.min(900, k * 30) + 'ms"></span></div>';
      }).join('') + '</div><div class="hwx-strip-axis" aria-hidden="true">' + bars.map(function (b, k) {
        var d = new Date(now - (weeks - 1 - k) * wk); return '<span>' + (k % 4 === 1 ? d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) : '') + '</span>';
      }).join('') + '</div></div>';
    var sorted = items.slice().sort(recent), groups = [['This week', 7], ['Earlier this month', 30], ['In the last three months', 91], ['Earlier', 1e9]], prev = 0;
    var out = viewHead(route, 'What’s new', 'What’s new', 'The projects that changed most recently, newest first.') + strip;
    var fresh = items.filter(function (it) { return now - new Date(it.repo.created_at || 0).getTime() < 30 * 864e5; });
    if (fresh.length) out += '<section class="hwx-sec">' + secHead('New on GitHub this month', plural(fresh.length, 'project') + ' added in the last 30 days.') + shelf(fresh.sort(friendly), false, 'new projects') + '</section>';
    groups.forEach(function (g) {
      var gi = sorted.filter(function (it) { var age = (now - new Date(when(it) || 0).getTime()) / 864e5; return age >= prev && age < g[1]; });
      prev = g[1];
      if (!gi.length) return;
      out += '<section class="hwx-feed"><h2 class="hwx-feed-h">' + esc(g[0]) + ' <span>' + gi.length + '</span></h2><div class="hwx-rows">' + gi.map(function (it) {
        var sub = (HWX.level !== 'overview' && it.last && it.last.msg) ? 'Latest change: ' + it.last.msg : (it.tagline || catLabel(it.category));
        return row(it, ago(when(it)) + ' · ' + sub);
      }).join('') + '</div></section>';
    });
    return out;
  };

  /* All projects. One segmented filter (the category), more filters folded away, sort and layout.
     The state lives in the address. */
  var FILTERS = ['cat', 'kind', 'status', 'with', 'live', 'aud', 'lang'];
  function sel(params) {
    var s = { q: params.q || '', demo: params.demo === '1', pics: params.pics === '1', priv: params['private'] === '1', extra: params.extra === '1' };
    FILTERS.forEach(function (k) { s[k] = params[k] || ''; });
    return s;
  }
  function passes(i, s, skip) {
    if (skip !== 'cat' && s.cat && (s.cat === '_none' ? !!i.category : i.category !== s.cat)) return false;
    if (skip !== 'kind' && s.kind && i.kind !== s.kind) return false;
    if (skip !== 'status' && s.status && (i.status || '') !== s.status) return false;
    if (skip !== 'with' && s['with'] && i.built_with.indexOf(s['with']) < 0) return false;
    if (skip !== 'live' && s.live && (s.live === '1' ? !i.live_url : !i.runs.some(function (r) { return r.site === s.live; }))) return false;
    if (skip !== 'aud' && s.aud && i.audience.indexOf(s.aud) < 0) return false;
    if (skip !== 'lang' && s.lang && topLang(i) !== s.lang && !i.langs.some(function (l) { return l.name === s.lang; })) return false;
    if (s.demo && !i.demo) return false;
    if (s.pics && !hasPics(i)) return false;
    if (s.priv && !i.private) return false;
    return matches(i, s.q);
  }
  R.all = function (items, route) {
    var params = route.params, s = sel(params);
    if (!s.q && HWX.q) s.q = HWX.q;
    var shown = items.filter(function (i) { return passes(i, s); });
    var sort = params.sort || 'updated';
    if (sort === 'size' && HWX.level === 'overview') sort = 'updated';
    shown.sort(sort === 'name' ? function (a, b) { return String(a.name).localeCompare(String(b.name)); }
      : sort === 'size' ? function (a, b) { return (b.repo.size || 0) - (a.repo.size || 0); }
      : sort === 'category' ? function (a, b) { return (CAT_ORDER.indexOf(a.category) + 1 || 99) - (CAT_ORDER.indexOf(b.category) + 1 || 99) || friendly(a, b); }
      : recent);
    function count(key, test) { return items.filter(function (i) { return passes(i, s, key) && test(i); }).length; }
    // the one segmented filter: category
    var segs = [{ id: '', label: 'All', n: count('cat', function () { return true; }) }].concat(CAT_ORDER.map(function (c) { return { id: c, label: catLabel(c), n: count('cat', function (i) { return i.category === c; }) }; }));
    if (items.some(function (i) { return !i.category; })) segs.push({ id: '_none', label: 'Not sorted yet', n: count('cat', function (i) { return !i.category; }) });
    var seg = '<div class="hwx-fseg" role="radiogroup" aria-label="Category" id="hwx-fseg">' + segs.map(function (o) {
      var on = s.cat === o.id;
      return '<button type="button" role="radio" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-fcat="' + esc(o.id) + '"' + (!o.n && !on ? ' aria-disabled="true"' : '') + '>' + esc(o.label) + ' <span class="n">' + o.n + '</span></button>';
    }).join('') + '</div>';
    function select(key, label, options) {
      if (!options.length && !s[key]) return '';
      var cur = s[key];
      return '<label class="hwx-fsel"><span>' + esc(label) + '</span><select class="field" id="hwx-f-' + key + '" data-fsel="' + key + '"><option value="">Any</option>' +
        options.map(function (o) { var n = count(key, o.test), on = cur === o.id; return '<option value="' + esc(o.id) + '"' + (on ? ' selected' : '') + (!n && !on ? ' disabled' : '') + '>' + esc(o.label) + ' (' + n + ')</option>'; }).join('') + '</select></label>';
    }
    var ix = index(items);
    var langs = Object.create(null); items.forEach(function (i) { i.langs.forEach(function (l) { langs[l.name] = (langs[l.name] || 0) + 1; }); if (!i.langs.length && i.repo.language) langs[i.repo.language] = (langs[i.repo.language] || 0) + 1; });
    var more =
      select('kind', 'Kind', KIND_ORDER.filter(function (k) { return ix.kinds[k]; }).map(function (k) { return { id: k, label: kindPlural(k), test: function (i) { return i.kind === k; } }; })) +
      select('status', 'Status', Object.keys(STATUSES).map(function (k) { return { id: k, label: STATUSES[k], test: function (i) { return i.status === k; } }; })) +
      select('with', 'Built with', Object.keys(ix['with']).sort(function (a, b) { return ix['with'][b].length - ix['with'][a].length || a.localeCompare(b); }).map(function (n) { return { id: n, label: n, test: function (i) { return i.built_with.indexOf(n) >= 0; } }; })) +
      select('live', 'Live site', [{ id: '1', label: 'Has a live site', test: function (i) { return !!i.live_url; } }].concat(Object.keys(ix.live).sort().map(function (h) { return { id: h, label: h, test: function (i) { return i.runs.some(function (r) { return r.site === h; }); } }; }))) +
      select('aud', 'For', Object.keys(AUD).map(function (a) { return { id: a, label: AUD[a], test: function (i) { return i.audience.indexOf(a) >= 0; } }; })) +
      (HWX.level === 'code' || s.lang ? select('lang', 'Language', Object.keys(langs).sort(function (a, b) { return langs[b] - langs[a] || a.localeCompare(b); }).map(function (l) { return { id: l, label: l, test: function (i) { return topLang(i) === l || i.langs.some(function (x) { return x.name === l; }); } }; })) : '') +
      '<div class="hwx-fchecks" role="group" aria-label="Extras">' +
        check('demo', 'Has a demo', s.demo, items.filter(function (i) { return i.demo; }).length) +
        check('pics', 'Has pictures or guides', s.pics, items.filter(hasPics).length) +
        (GH.state.signedIn ? check('private', 'Private only', s.priv, items.filter(function (i) { return i.private; }).length) : '') +
        check('extra', 'Include archived and forked repos', s.extra) + '</div>';
    var moreOpen = !!(s.kind || s.status || s['with'] || s.live || s.aud || s.lang || s.demo || s.pics || s.priv || s.extra);
    // what is active, as a sentence
    var bits = [];
    if (s.cat) bits.push(catLabel(s.cat === '_none' ? null : s.cat));
    if (s.kind) bits.push(kindPlural(s.kind));
    if (s.status) bits.push(statusLabel(s.status).toLowerCase());
    if (s['with']) bits.push('built with ' + s['with']);
    if (s.live) bits.push(s.live === '1' ? 'with a live site' : 'live at ' + s.live);
    if (s.aud && own(AUD, s.aud)) bits.push('for ' + AUD[s.aud].toLowerCase());
    if (s.lang) bits.push('in ' + s.lang);
    if (s.demo) bits.push('with a demo');
    if (s.pics) bits.push('with pictures or guides');
    if (s.priv) bits.push('private');
    if (s.extra) bits.push('archived and forks included');
    if (s.q) bits.push('matching “' + s.q + '”');
    var layout = params.layout === 'list' ? 'list' : 'cards';
    var head = '<div class="hwx-results-head"><p class="hwx-count" aria-live="polite"><b>' + plural(shown.length, 'project') + '</b>' + (bits.length ? ': ' + esc(bits.join(', ')) + '. <a href="' + href('all', layout === 'list' ? { layout: 'list' } : null) + '" data-fclear>Clear filters</a>' : '') + '</p>' +
      '<label class="hwx-sort"><span class="sr-only">Sort</span><select class="field" id="hwx-sort"><option value="updated"' + (sort === 'updated' ? ' selected' : '') + '>Recently updated</option><option value="name"' + (sort === 'name' ? ' selected' : '') + '>Name, A to Z</option><option value="category"' + (sort === 'category' ? ' selected' : '') + '>By category</option>' + (HWX.level !== 'overview' ? '<option value="size"' + (sort === 'size' ? ' selected' : '') + '>Largest first</option>' : '') + '</select></label>' +
      '<div class="hwx-seg" role="radiogroup" aria-label="Layout" id="hwx-layout"><button type="button" role="radio" data-layout="cards" aria-checked="' + (layout === 'cards') + '" tabindex="' + (layout === 'cards' ? 0 : -1) + '">' + vIcon('all') + 'Cards</button><button type="button" role="radio" data-layout="list" aria-checked="' + (layout === 'list') + '" tabindex="' + (layout === 'list' ? 0 : -1) + '">' + svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>') + 'List</button></div></div>';
    var body = !shown.length ? empty('No projects match', 'Remove a filter or change the search words.', '<p><a class="btn btn-primary" href="' + href('all') + '" data-fclear>Clear filters</a></p>')
      : layout === 'list' ? '<div class="hwx-rows">' + shown.map(function (i) { return row(i, catLabel(i.category) + ' · ' + (i.tagline || '')); }).join('') + '</div>'
      : (sort !== 'category') && shown.length > 12 ? cardsAndRows(shown) : grid(shown);
    return viewHead(route, 'All projects', 'All projects', 'Narrow the list with the category bar, or open more filters. The numbers show how many projects each choice leaves.') +
      '<div class="hwx-filters">' + seg + '<details class="hwx-more-f" id="hwx-more-f"' + (moreOpen ? ' open' : '') + '><summary>More filters</summary><div class="hwx-more-f-in">' + more + '</div></details></div>' +
      head + body;
  };
  function check(key, label, on, n) {
    return '<label class="hwx-check"><input type="checkbox" data-ft="' + key + '" id="hwx-ft-' + key + '"' + (on ? ' checked' : '') + '><span>' + esc(label) + (n != null ? ' <span class="n">(' + n + ')</span>' : '') + '</span></label>';
  }

  R.glossary = function (items, route) {
    var ix = index(items);
    var out = viewHead(route, 'Words explained', 'Words explained', 'Short, plain explanations of the words on this page. Select a link to see the projects each word applies to.');
    out += '<section class="hwx-sec">' + secHead('Kinds of project', 'What form a project takes.') + '<div class="hwx-terms">' +
      KIND_ORDER.map(function (k) { return termCard({ k: 'Kind of project', t: kindLabel(k), x: kindExplain(k), h: href('all', { kind: k }), n: ix.kinds[k] || 0 }); }).join('') + '</div></section>';
    var plats = Object.keys(PLATFORMS).concat(Object.keys(ix['with']).filter(function (n) { return !own(PLATFORMS, n); }).filter(function (n) { return ix['with'][n].length > 1; }));
    plats.sort(function (a, b) { return ((ix['with'][b] || []).length - (ix['with'][a] || []).length) || a.localeCompare(b); });
    out += '<section class="hwx-sec">' + secHead('Tools and services', 'What HelloWorld projects are built with.') + '<div class="hwx-terms">' +
      plats.map(function (p) { return termCard({ k: 'Built with', t: p, x: own(PLATFORMS, p) ? PLATFORMS[p] : 'Used by ' + plural((ix['with'][p] || []).length, 'project') + '.', h: wHref(p), n: (ix['with'][p] || []).length }); }).join('') + '</div></section>';
    out += '<section class="hwx-sec">' + secHead('Idea to live', 'The four stages on the line.', href('line'), 'See the line') + '<div class="hwx-terms">' +
      STAGES.map(function (s) { return termCard({ k: 'Stage ' + s.n, t: s.label, x: s.blurb + ' Categories: ' + s.categories.map(catLabel).join(', ') + '.', h: href('line'), n: items.filter(function (i) { return i.stage === s.id; }).length }); }).join('') + '</div></section>';
    out += '<section class="hwx-sec">' + secHead('Words on this page', '') + '<div class="hwx-terms">' +
      Object.keys(TERMS).map(function (t) { return termCard({ k: 'Word', t: t, x: TERMS[t] }); }).join('') + '</div></section>';
    return out;
  };

  /* ---------------- Deeper pages ---------------- */
  function hero(eyebrow, title, lede, extra) {
    return '<header class="hwx-hero"><span class="decor decor--tr" aria-hidden="true"></span>' + (eyebrow ? '<p class="eyebrow">' + eyebrow + '</p>' : '') +
      '<h1 class="hwx-title">' + title + '</h1>' + (lede ? '<p class="hwx-lead">' + lede + '</p>' : '') + (extra || '') + '</header>';
  }
  function tiles(t) { return '<div class="hwx-tiles">' + t.map(function (x) { return '<a class="hwx-tile" href="' + x.h + '"><span class="k">' + esc(x.k) + '</span><span class="v">' + x.v + '</span></a>'; }).join('') + '</div>'; }
  function often(label, names, counts, hrefFn) {
    if (!names.length) return '';
    return '<p class="hwx-often"><span>' + esc(label) + '</span> ' + names.map(function (n) { return '<a href="' + hrefFn(n) + '">' + esc(n) + '</a> (' + counts[n] + ')'; }).join(', ') + '</p>';
  }

  R.cat = function (items, route) {
    var c = route.arg;
    if (!own(CATS, c)) return R.discover(items, route);
    var st = STAGE_OF[c], g = items.filter(function (i) { return i.category === c; }).sort(friendly);
    var ix = index(g), ev = everywhere(items), plats = Object.keys(ix['with']).filter(function (x) { return !ev[x]; }).sort(function (a, b) { return ix['with'][b].length - ix['with'][a].length; });
    var counts = Object.create(null); plats.forEach(function (p) { counts[p] = ix['with'][p].length; });
    var out = hero((st ? '<a href="' + href('line') + '">Idea to live · ' + esc(st.label) + '</a>' : 'Category'), esc(catLabel(c)), esc(catBlurb(c)),
      tiles([{ k: 'Projects', v: g.length, h: href('all', { cat: c }) }].concat(KIND_ORDER.filter(function (k) { return ix.kinds[k]; }).map(function (k) { return { k: kindPlural(k), v: ix.kinds[k], h: href('all', { cat: c, kind: k }) }; }))) +
      often('Often built with', plats.slice(0, 8), counts, wHref));
    var demos = g.filter(function (i) { return i.demo; });
    if (demos.length) out += '<section class="hwx-sec">' + secHead('Try it', 'Demos in this category.') + shelf(demos, true, 'the demos') + '</section>';
    out += '<section class="hwx-sec">' + secHead('Everything in this category', '') + (g.length ? cardsAndRows(g) : empty('Nothing here yet', GH.state.signedIn ? '' : 'Sign in to see private projects too.')) + '</section>';
    if (st) {
      var si = STAGES.indexOf(st), near = CAT_ORDER.filter(function (x) { var s2 = STAGE_OF[x]; return x !== c && s2 && (s2 === st || STAGES.indexOf(s2) === si + 1) && items.some(function (i) { return i.category === x; }); });
      if (near.length) out += '<section class="hwx-sec">' + secHead('Nearby on the line', 'Categories at this stage and the next one.', href('line'), 'See the line') + '<div class="hwx-doors">' + near.map(function (x) {
        var n = items.filter(function (i) { return i.category === x; }).length;
        return '<a class="hwx-door is-small hw-rv" href="' + catHref(x) + '"><span class="hwx-door-body"><span class="cat">' + esc(STAGE_OF[x].label) + '</span><span class="hwx-door-t">' + esc(catLabel(x)) + '</span><span class="hwx-door-x">' + esc(catBlurb(x)) + '</span>' +
          '<span class="act"><span class="rt">' + plural(n, 'project') + '</span><span class="go">Open</span></span></span></a>';
      }).join('') + '</div></section>';
    }
    return out;
  };

  R['with'] = function (items, route) {
    var name = route.arg, ix = index(items), g = (ix['with'][name] || []).slice().sort(friendly), ev = everywhere(items);
    var co = Object.create(null); g.forEach(function (i) { i.built_with.forEach(function (w) { if (w !== name && !ev[w]) co[w] = (co[w] || 0) + 1; }); });
    var coList = Object.keys(co).sort(function (a, b) { return co[b] - co[a]; });
    var out = hero('<a href="' + href('connections') + '">Built with</a>', esc(name), esc(own(PLATFORMS, name) ? PLATFORMS[name] : 'A tool or service that HelloWorld projects are built with.'),
      tiles([{ k: 'Projects built with it', v: g.length, h: href('all', { 'with': name }) }]) + often('Often used with', coList.slice(0, 8), co, wHref));
    if (!g.length) return out + empty('No project lists ' + esc(name) + ' yet', GH.state.signedIn ? '' : 'Sign in to see private projects too.');
    var cats = CAT_ORDER.slice(); cats.push('_none');
    cats.forEach(function (c) {
      var gi = g.filter(function (i) { return (i.category || '_none') === c; }); if (!gi.length) return;
      out += '<section class="hwx-sec">' + secHead(catLabel(c === '_none' ? null : c), plural(gi.length, 'project')) + cardsAndRows(gi) + '</section>';
    });
    return out;
  };

  R.site = function (items, route) {
    var ix = index(items), s = ix.live[route.arg];
    if (!s) return hero('<a href="' + href('live') + '">Live sites</a>', esc(route.arg), '') + empty('We could not find that address', GH.state.signedIn ? 'No project lists it as its live site.' : 'It may belong to a private project. Sign in to see private projects.');
    var kinds = Object.create(null); s.items.forEach(function (it) { if (it.kind) kinds[it.kind] = (kinds[it.kind] || 0) + 1; });
    var url = (s.items[0] && s.items[0].live_url) || ('https://' + s.site + '/');
    var out = hero('<a href="' + href('live') + '">Live site</a>', esc(s.name), 'The projects that run at this address.',
      tiles([{ k: 'Projects', v: s.items.length, h: href('all', { live: s.site }) }].concat(KIND_ORDER.filter(function (k) { return kinds[k]; }).map(function (k) { return { k: kindPlural(k), v: kinds[k], h: href('all', { live: s.site, kind: k }) }; }))) +
      '<p class="hwx-hero-actions"><a class="btn btn-primary" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + I('ext') + 'Open the site<span class="sr-only"> (opens in a new tab)</span></a></p>');
    var cats = CAT_ORDER.slice(); cats.push('_none');
    cats.forEach(function (c) {
      var g = s.items.filter(function (i) { return (i.category || '_none') === c; }).sort(friendly); if (!g.length) return;
      out += '<section class="hwx-sec">' + secHead(catLabel(c === '_none' ? null : c), plural(g.length, 'project')) + cardsAndRows(g) + '</section>';
    });
    return out;
  };

  /* Health: every repo, its card, README, demo and Pages state (signed in). */
  R.health = function (items, route) {
    if (!GH.state.signedIn) return viewHead(route, 'Health', 'Health', 'Sign in to check every repo’s hub card, README and demo.') + needsSignIn();
    if (!GH.state.detailsReady) return viewHead(route, 'Health', 'Health', 'Checking every repo.') + skeleton();
    var repos = GH.state.repos.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    var cards = 0, faulty = 0, missing = 0;
    var rows = repos.map(function (r) {
      var p = GH.info(r);
      var cardCell = r.card ? '<span class="t-good">Ready</span>' : r.cardError ? '<span class="t-bad" data-tip-title="The card has a problem" data-tip="' + esc(r.cardError) + '" tabindex="0">Faulty: ' + esc(r.cardError) + '</span>' : '<span class="t-warn">Missing</span>';
      if (r.card) cards++; else if (r.cardError) faulty++; else missing++;
      var demoCell = p.demo ? '<span class="t-good">Yes</span>' : p.no_demo ? '<span data-tip="' + esc(p.no_demo) + '" tabindex="0">Not needed</span>' : ((CFG.demo_kinds || []).indexOf(p.kind) >= 0 ? '<span class="t-warn">Expected</span>' : '<span class="hw-muted">No</span>');
      return '<tr><th scope="row"><a href="#/p/' + enc(r.name) + '">' + esc(r.name) + '</a>' + (r.fork ? ' <span class="badge">Fork</span>' : '') + (r.archived ? ' <span class="badge">Archived</span>' : '') + '</th>' +
        '<td>' + (r.private ? 'Private' : '<strong>Public</strong>') + '</td><td>' + cardCell + '</td>' +
        '<td>' + (p.category ? esc(catLabel(p.category)) : '<span class="t-warn">None</span>') + '</td>' +
        '<td>' + esc(p.kind ? kindLabel(p.kind) : 'None') + '</td><td>' + esc(statusLabel(p.status) || 'None') + '</td>' +
        '<td>' + (r.readme ? '<span class="t-good">Yes</span>' : '<span class="t-bad">No</span>') + '</td><td>' + demoCell + '</td>' +
        '<td>' + (r.has_pages ? '<span class="t-warn">Pages on</span>' : 'Off') + '</td><td title="' + esc(SH.dateText(p.pushed_at)) + '">' + esc(ago(p.pushed_at)) + '</td></tr>';
    }).join('');
    var sentence = missing || faulty ? '<span class="t-warn">' + plural(missing + faulty, 'repo') + ' need' + (missing + faulty === 1 ? 's' : '') + ' a hub card</span>' : '<span class="t-good">Every repo has a ready hub card.</span>';
    return viewHead(route, 'Health', 'Health', plural(repos.length, 'repo') + ': ' + cards + ' with a ready hub card, ' + faulty + ' faulty, ' + missing + ' missing. ' + sentence + ' Run <code>hw-gh audit</code> on the Mac for the full check.') +
      '<div class="hwx-table"><table class="hwx-health"><caption class="sr-only">Every repo with its hub card, README, demo and Pages state</caption><thead><tr><th scope="col">Repo</th><th scope="col">Visibility</th><th scope="col">Hub card</th><th scope="col">Category</th><th scope="col">Kind</th><th scope="col">Status</th><th scope="col">README</th><th scope="col">Demo</th><th scope="col">Pages</th><th scope="col">Changed</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  };

  /* ---------------- Project page ---------------- */
  var launchedFor = '';
  R.p = function (items, route) {
    var i = byName(route.arg);
    var ask = (route.params.launch === 'demo' && !GH.state.signedIn && !(i && i.demo))
      ? '<div class="hwx-note" role="note"><p><strong>Sign in to open this demo.</strong> Use a GitHub account that can read this project. After you sign in, the hub asks before it opens the demo.</p><button type="button" class="btn btn-primary btn-sm" data-signin>Sign in</button></div>' : '';
    if (!i) return ask + hero('Project', esc(route.arg), '') + empty('We could not find that project', GH.state.signedIn ? 'It may have a new name, or your sign-in cannot read it.' : 'It may be private. Sign in to see private projects.', GH.state.signedIn ? '' : '<p><button class="btn btn-primary" type="button" data-signin>Sign in</button></p>');
    var r = i.repo, lv = HWX.level;
    var tab = route.params.tab || (lv === 'overview' ? 'overview' : lv);
    if (['overview', 'built', 'code'].indexOf(tab) < 0) tab = 'overview';
    var copyOf = i.same_as && GH.findRepo(i.same_as, { ci: true }) && i.same_as.toLowerCase() !== r.name.toLowerCase();
    var eyebrow = '<a href="' + (i.category ? catHref(i.category) : href('all', { cat: '_none' })) + '">' + esc(catLabel(i.category)) + '</a>' + (i.kind ? ' · ' + esc(kindLabel(i.kind)) : '');
    var note = [statusChip(i), when(i) ? '<span>Updated ' + esc(ago(when(i))) + '</span>' : '', i.updated ? '<span>Card checked ' + esc(SH.dateText(i.updated, true)) + '</span>' : ''].filter(Boolean).join('');
    var actions = '';
    if (i.view && GH.state.signedIn) actions += '<button type="button" class="btn btn-primary" data-open-view="' + esc(r.name) + '">' + I('play') + esc(i.view.label) + '</button>';
    if (i.demo) actions += '<button type="button" class="btn ' + (i.view && GH.state.signedIn ? 'btn-quiet' : 'btn-primary') + '" data-demo="' + esc(r.name) + '">' + I('play') + 'Open the demo</button>';
    if (i.live_url) actions += '<a class="btn ' + (i.demo ? 'btn-quiet' : 'btn-primary') + '" href="' + esc(i.live_url) + '" target="_blank" rel="noopener noreferrer">' + I('ext') + 'Open the live site<span class="sr-only"> (opens in a new tab)</span></a>';
    actions += '<a class="btn ' + (i.demo || i.live_url ? 'btn-quiet' : 'btn-primary') + '" href="' + esc(r.html_url) + '" target="_blank" rel="noopener noreferrer">' + I('gh') + 'Open on GitHub<span class="sr-only"> (opens in a new tab)</span></a>';
    actions += '<button type="button" class="btn btn-quiet" data-copylink>' + I('link') + 'Copy link</button>';
    var thumbs = i.gallery.length ? '<div class="hwx-thumbs">' + i.gallery.map(function (g, k) { return '<button type="button" class="hwx-thumb" data-lb="' + (k + (i.cover ? 1 : 0)) + '" aria-label="' + esc('Open picture: ' + (g.alt || g.caption || 'picture ' + (k + 1))) + '"><img alt="" data-img="' + esc(r.name + '|' + g.src) + '"></button>'; }).join('') + '</div>' : '';
    var out = ask + (copyOf ? '<div class="hwx-note" role="note"><p>This repo is a second copy of <a href="' + href('p/' + enc(i.same_as)) + '">' + esc(i.same_as) + '</a>, which the hub shows instead.</p></div>' : '') +
      '<div class="hwx-proj"><span class="decor decor--tr" aria-hidden="true"></span><div class="hwx-proj-text"><p class="eyebrow">' + eyebrow + '</p><h1 class="hwx-title">' + esc(i.name) + '</h1>' +
      (i.tagline ? '<p class="hwx-lead">' + esc(i.tagline) + '</p>' : '') +
      '<p class="hwx-proj-note">' + note + (i.private ? privBadge(i) : '') + '</p>' +
      (i.private ? '<p class="hwx-priv-note">' + I('lock') + 'Private: you see it because you are signed in.</p>' : '') +
      (i.audience.length ? '<p class="hwx-for">' + sized(vIcon('users'), 16) + 'For ' + esc(i.audience.map(function (a) { return own(AUD, a) ? AUD[a].toLowerCase() : a; }).join(', ')) + '</p>' : '') +
      '<div class="hwx-proj-actions">' + actions + '</div></div>' +
      '<div class="hwx-proj-media"><div class="hwx-proj-cover">' + heroSlides(i) + '</div>' + thumbs + '</div></div>';
    var TABS = [['overview', 'Overview', 'What it does'], ['built', 'How it’s built', 'Languages and files'], ['code', 'Code', 'For developers']];
    out += '<div class="hwx-ptabs" role="tablist" aria-label="Detail">' + TABS.map(function (t) {
      return '<button type="button" role="tab" id="hwx-tab-' + t[0] + '" class="hwx-ptab" aria-selected="' + (tab === t[0]) + '" aria-controls="hwx-ppane" tabindex="' + (tab === t[0] ? 0 : -1) + '" data-ptab="' + t[0] + '">' + t[1] + '<small>' + t[2] + '</small></button>';
    }).join('') + '</div><div id="hwx-ppane" role="tabpanel" aria-labelledby="hwx-tab-' + tab + '" tabindex="0">' + projectPane(i, tab) + '</div>';
    out += related(i, items);
    return out;
  };
  /* The hero slideshow: the picture, the project in the City (when the City is there), and its
     generated cover. It turns only when asked (buttons, dots, arrow keys). */
  function heroSlides(i) {
    var name = i.repo.name, pic = i.cover || (i.gallery[0] && i.gallery[0].src) || '', slides = [];
    if (pic) slides.push({ label: 'Picture', html: '<img alt="' + esc((!i.cover && i.gallery[0] && (i.gallery[0].alt || i.gallery[0].caption)) || 'A picture of ' + i.name) + '" data-img="' + esc(name + '|' + pic) + '">' + coverArtBehind(i) });
    if (typeof HWX.citySlide === 'function' && window.WebGLRenderingContext) slides.push({ label: 'In the City', city: 1, html:
      '<div class="hwx-slide-city" data-city-slot="' + esc(name) + '"><span class="hwx-slide-wait">Opening the City</span></div>' +
      '<a class="hwx-slide-open" href="' + href('city', { 'in': name }) + '">Open in the City</a>' });
    slides.push({ label: 'Generated cover', html: coverArt(i, { hero: true }) });
    if (slides.length === 1) return '<div class="hwx-slides is-one">' + slides[0].html + '</div>';
    var n = slides.length;
    return '<div class="hwx-slides" data-slides role="region" aria-roledescription="carousel" aria-label="' + esc(i.name) + ': pictures">' +
      slides.map(function (sl, k) {
        return '<div class="hwx-slide' + (k ? '' : ' on') + (sl.city ? ' is-city' : '') + '" role="group" aria-roledescription="slide" aria-label="' + (k + 1) + ' of ' + n + ': ' + sl.label + '"' + (k ? ' aria-hidden="true" inert' : '') + '>' +
          sl.html + '<span class="hwx-slide-tag" aria-hidden="true">' + sl.label + '</span></div>';
      }).join('') +
      '<div class="hwx-slide-nav"><button type="button" class="hwx-slide-btn" data-slide="prev" aria-label="Previous slide">' + I('left') + '</button>' +
        '<span class="hwx-slide-dots">' + slides.map(function (sl, k) { return '<button type="button" data-dot="' + k + '" aria-label="Show slide ' + (k + 1) + ': ' + sl.label + '"' + (k ? '' : ' aria-current="true"') + '></button>'; }).join('') + '</span>' +
        '<button type="button" class="hwx-slide-btn" data-slide="next" aria-label="Next slide">' + I('right') + '</button></div></div>';
  }
  function coverArtBehind(i) { return '<span class="hwx-slide-under" aria-hidden="true">' + coverArt(i) + '</span>'; }
  var cityShown = false;
  function cityOff() { if (cityShown && typeof HWX.citySlide === 'function') { cityShown = false; try { HWX.citySlide(null, null); } catch (e) { console.error(e); } } }
  function initSlides() {
    var box = $('[data-slides]', view); if (!box) return;
    var slides = $$('.hwx-slide', box), dots = $$('[data-dot]', box), idx = 0;
    function show(k, announceIt) {
      idx = (k + slides.length) % slides.length;
      slides.forEach(function (sl, j) {
        var on = j === idx; sl.classList.toggle('on', on);
        if (on) { sl.removeAttribute('aria-hidden'); sl.removeAttribute('inert'); } else { sl.setAttribute('aria-hidden', 'true'); sl.setAttribute('inert', ''); }
      });
      dots.forEach(function (d, j) { if (j === idx) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      var c = $('[data-city-slot]', slides[idx]);
      if (c && typeof HWX.citySlide === 'function') { cityShown = true; try { HWX.citySlide(c, c.getAttribute('data-city-slot')); } catch (e) { console.error(e); } }
      else cityOff();
      if (announceIt) SH.announce(slides[idx].getAttribute('aria-label'));
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-slide], [data-dot]'); if (!b) return;
      var a = b.getAttribute('data-slide');
      if (a === 'prev') show(idx - 1, true); else if (a === 'next') show(idx + 1, true); else show(+b.getAttribute('data-dot'), true);
    });
    box.addEventListener('keydown', function (e) {
      if (e.target.closest('input,select,textarea')) return;
      if (e.key === 'ArrowRight') { show(idx + 1, true); e.preventDefault(); } else if (e.key === 'ArrowLeft') { show(idx - 1, true); e.preventDefault(); }
    });
    show(0, false);
  }

  function projectPane(i, tab) {
    var r = i.repo;
    var explain = i.kind && kindExplain(i.kind) ? '<div class="hwx-explain">' + sized(vIcon(i.kind), 26) + '<div><b>This is ' + aOrAn(kindLabel(i.kind)) + ' ' + esc(/^WordPress/.test(kindLabel(i.kind)) ? kindLabel(i.kind) : kindLabel(i.kind).toLowerCase()) + '.</b> ' + esc(kindExplain(i.kind)) +
      (i.kind === 'plugin' || i.kind === 'theme' ? ' It runs on a WordPress site; GitHub keeps the code and its history.' : '') + '</div></div>' : '';
    var side = '';
    var ev = everywhere(list()), w = i.built_with.filter(function (x) { return !ev[x]; }).concat(i.built_with.filter(function (x) { return ev[x]; }));
    if (w.length) side += '<section class="hwx-box"><h2 class="hwx-h3">Built with</h2><div class="hwx-with">' + w.map(function (x) { return '<a href="' + wHref(x) + '"><b>' + esc(x) + '</b>' + (own(PLATFORMS, x) ? '<span>' + esc(PLATFORMS[x]) + '</span>' : '') + '</a>'; }).join('') + '</div></section>';
    if (i.runs.length) side += '<section class="hwx-box"><h2 class="hwx-h3">Where it runs</h2><p class="hwx-runs">' + i.runs.map(function (s) { return '<a href="' + liveHref(s.site) + '">' + esc(s.name || s.site) + '</a>'; }).join(', ') + '</p></section>';
    side += facts(i);
    if (GH.state.signedIn && !i.hasCard && GH.findRepo(r.name, { ci: true })) {
      var cr = GH.findRepo(r.name, { ci: true });
      side += '<section class="hwx-box is-warn"><h2 class="hwx-h3">Hub card</h2><p>' + (cr.cardError ? 'The card has a problem: ' + esc(cr.cardError) + '.' : 'This project has no hub card yet, so the hub guesses its details.') + ' On the Mac, this drafts one:</p>' +
        '<div class="hwx-clone"><span>hw-gh card ' + esc(r.name) + '</span><button class="btn btn-quiet btn-sm" type="button" data-copy="hw-gh card ' + esc(r.name) + '">' + I('copy') + 'Copy</button></div></section>';
    }
    if (tab === 'overview') {
      var main = explain;
      if (i.summary && i.summary !== i.tagline) main += '<p class="hwx-summary">' + esc(i.summary) + '</p>';
      if (i.features.length) main += '<section class="hwx-box"><h2 class="hwx-h3">What it does</h2><ol class="hwx-features">' + i.features.map(function (f, k) { return '<li><i aria-hidden="true">' + (k + 1) + '</i><span>' + SH.boldOnly(f) + '</span></li>'; }).join('') + '</ol></section>';
      if (!i.demo && i.no_demo) main += '<section class="hwx-box"><h2 class="hwx-h3">No demo</h2><p>' + esc(i.no_demo) + '</p></section>';
      var wide = '';
      if (i.guides.length) wide += '<section class="hwx-sec hwx-guide-sec"><div class="hwx-sec-head"><div><h2 class="hwx-h2">Step by step</h2><p>' + plural(i.guides.length, 'guide') + ', with pictures that show where to look.</p></div><button type="button" class="btn btn-quiet btn-sm" data-guide-full>' + I('full') + 'Full screen</button></div><div id="hwx-guide"></div></section>';
      if (i.gallery.length) wide += '<section class="hwx-sec">' + secHead('Pictures', 'Select a picture to see it larger.') + '<div class="hwx-gallery">' + i.gallery.map(function (g, k) {
        return '<figure><button type="button" class="hwx-thumb" data-lb="' + (k + (i.cover ? 1 : 0)) + '" aria-label="' + esc('Open picture: ' + (g.alt || g.caption || 'picture ' + (k + 1))) + '"><img alt="' + esc(g.alt || '') + '" data-img="' + esc(r.name + '|' + g.src) + '"></button>' + (g.caption ? '<figcaption>' + esc(g.caption) + '</figcaption>' : '') + '</figure>';
      }).join('') + '</div></section>';
      else if (!i.cover && GH.state.signedIn) main += '<section class="hwx-box is-quiet"><h2 class="hwx-h3">' + I('image') + 'No pictures yet</h2><p>Screenshots and step-by-step guides make a project easier to understand. Add pictures under <code>hub/</code> (see the hub card standard).</p></section>';
      wide += '<section class="hwx-sec hwx-readme-sec"><h2 class="hwx-h2">From the README</h2><div class="hwx-readme-grid"><div id="hwx-readme" class="hwx-reading"><p class="hw-muted">Loading the README.</p></div><nav class="hwx-toc" id="hwx-toc" aria-label="On this page" hidden></nav></div></section>';
      return '<div class="hwx-cols"><div>' + main + '</div><aside class="hwx-side">' + side + '</aside></div>' + wide;
    }
    if (tab === 'built') {
      var langs = i.langs.length ? '<section class="hwx-box"><h2 class="hwx-h3">What it is written in</h2>' + langBar(i) + langKey(i) + '<p class="hwx-small">Measured by the amount of code: ' + esc(SH.bytes(i.langTotal)) + ' in total.</p></section>' : '';
      return '<div class="hwx-cols"><div>' + explain + langs + '<section class="hwx-box"><h2 class="hwx-h3">Files at the top level</h2><div id="hwx-files" class="hwx-filelist"><span class="hw-skel" style="height:120px"></span></div></section></div><aside class="hwx-side">' + side + '</aside></div>';
    }
    var clone = 'git clone ' + (r.clone_url || ('https://github.com/' + (r.full_name || ACCOUNT + '/' + r.name) + '.git'));
    return '<div class="hwx-cols"><div><section class="hwx-box"><h2 class="hwx-h3">Get the code</h2><div class="hwx-clone"><span>' + esc(clone) + '</span><button type="button" class="btn btn-quiet btn-sm" data-copy="' + esc(clone) + '" data-copy-label="Clone command copied">' + I('copy') + 'Copy</button></div>' +
      '<p class="hwx-links"><a href="' + esc(r.html_url + '/commits') + '" target="_blank" rel="noopener noreferrer">History of changes<span class="sr-only"> (opens in a new tab)</span></a> <a href="' + esc(r.html_url + '/issues') + '" target="_blank" rel="noopener noreferrer">Issues<span class="sr-only"> (opens in a new tab)</span></a></p></section>' +
      (i.langs.length ? '<section class="hwx-box"><h2 class="hwx-h3">Languages</h2>' + langBar(i) + langKey(i) + '</section>' : '') +
      '</div><aside class="hwx-side">' + side + '</aside></div>' +
      '<section class="hwx-sec"><h2 class="hwx-h2">Files and code</h2><div id="hwx-code" data-repo="' + esc(r.name) + '"></div></section>';
  }
  /* Facts as short sentences (information cards). */
  function facts(i) {
    var r = i.repo, rows = [];
    if (i.kind) rows.push(['Kind', esc(kindLabel(i.kind))]);
    if (i.status) rows.push(['Status', esc(statusLabel(i.status))]);
    rows.push(['Last change', '<span title="' + esc(SH.dateText(when(i), true)) + '">' + esc(ago(when(i))) + '</span>' + (HWX.level !== 'overview' && i.last && i.last.msg ? ': ' + esc(i.last.msg) : '')]);
    if (i.recent != null) rows.push(['Last 30 days', plural(i.recent, 'change')]);
    if (GH.state.signedIn && i.issues != null) rows.push(['Open issues', String(i.issues || 0)]);
    if (i.updated) rows.push(['Card updated', esc(SH.dateText(i.updated, true))]);
    rows.push(['Visibility', i.private ? 'Private' : 'Public']);
    rows.push(['Repository', '<span class="hwx-repo">' + esc(r.full_name || ACCOUNT + '/' + r.name) + '</span>']);
    rows.push(['Size', esc(SH.size(r.size))]);
    if (r.created_at) rows.push(['Created', esc(SH.dateText(r.created_at, true))]);
    if (HWX.level !== 'overview') { rows.push(['Main branch', esc(r.default_branch || 'main')]); if ((r.topics || []).length) rows.push(['Topics', esc(r.topics.join(', '))]); }
    return '<section class="hwx-box"><h2 class="hwx-h3">Facts</h2><dl class="hwx-kv">' + rows.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('') + '</dl></section>';
  }
  /* More like this: same category 3, each shared tool 2, same live address 2, same kind 1. */
  function related(i, items) {
    var ev = everywhere(items);
    var scored = items.filter(function (o) { return o.repo.name !== i.repo.name; }).map(function (o) {
      var s = 0;
      if (o.category && o.category === i.category) s += 3;
      o.built_with.forEach(function (w) { if (!ev[w] && i.built_with.indexOf(w) >= 0) s += 2; });
      o.runs.forEach(function (r) { if (i.runs.some(function (x) { return x.site === r.site; })) s += 2; });
      if (o.kind && o.kind === i.kind) s += 1;
      return { o: o, s: s };
    }).filter(function (x) { return x.s >= 3; }).sort(function (a, b) { return b.s - a.s || friendly(a.o, b.o); }).slice(0, 12).map(function (x) { return x.o; });
    return scored.length ? '<section class="hwx-sec hwx-related">' + secHead('More like this', 'Projects in the same category, built with the same tools or at the same address.') + shelf(scored, false, 'similar projects') + '</section>' : '';
  }
  function afterProject(i) {
    initSlides();
    var rd = document.getElementById('hwx-readme');
    if (rd) {
      var box = SH.renderReadme(rd, i.repo.name), toc = document.getElementById('hwx-toc');
      if (box) {
        var h1 = box.querySelector('h1'); if (h1 && box.firstElementChild === h1) h1.remove();
        var hs = $$('h2', box);
        if (toc && hs.length > 1) {
          toc.innerHTML = '<b>On this page</b><ol>' + hs.map(function (h) { return '<li><a href="#" data-md-go="' + esc(h.id) + '">' + esc(h.textContent.trim()) + '</a></li>'; }).join('') + '</ol>';
          toc.hidden = false;
          toc.addEventListener('click', function (e) {
            var a = e.target.closest('[data-md-go]'); if (!a) return; e.preventDefault();
            var h = document.getElementById(a.getAttribute('data-md-go'));
            if (h) { h.setAttribute('tabindex', '-1'); h.scrollIntoView({ behavior: SH.reduced() ? 'auto' : 'smooth', block: 'start' }); h.focus({ preventScroll: true }); }
          });
        }
      }
    }
    var files = document.getElementById('hwx-files');
    if (files) {
      var tp = GH.tree(i.repo.name);
      (GH.trackLoad ? GH.trackLoad('files', tp) : tp).then(function (t) {
        if (!files.isConnected) return;
        var top = (t.items || []).filter(function (f) { return f.path.indexOf('/') < 0; });
        if (!top.length) { files.innerHTML = '<p class="hw-muted">No files to show.</p>'; return; }
        top.sort(function (a, b) { return (a.type === b.type ? 0 : a.type === 'tree' ? -1 : 1) || a.path.localeCompare(b.path); });
        files.innerHTML = '<ul>' + top.slice(0, 40).map(function (f) { return '<li class="hwx-file">' + sized(I(f.type === 'tree' ? 'folder' : 'file'), 15) + '<span>' + esc(f.path) + '</span>' + (f.type === 'blob' ? '<small>' + esc(SH.bytes(f.size)) + '</small>' : '') + '</li>'; }).join('') + '</ul>' +
          (top.length > 40 ? '<p class="hw-muted">And ' + (top.length - 40) + ' more.</p>' : '') +
          '<p><button type="button" class="btn btn-quiet btn-sm" data-ptab="code">' + I('code') + 'Browse every file</button></p>';
      }, function () { if (files.isConnected) files.innerHTML = '<p class="hw-muted">The file list could not be loaded.' + (GH.state.signedIn ? '' : ' Signed out, GitHub allows only a few requests an hour.') + '</p>'; });
    }
    var code = document.getElementById('hwx-code'); if (code) SH.mountCode(code);
    if (document.getElementById('hwx-guide')) guideViewer(i, 0, 0);
  }
  /* The guide, inline: picker, the picture with its marks, Back and Next, and the steps. */
  function guideViewer(i, gi, si) {
    var box = document.getElementById('hwx-guide'); if (!box) return;
    var g = i.guides[gi], steps = (g && g.steps) || [], step = steps[si] || {};
    box.setAttribute('data-gi', gi); box.setAttribute('data-si', si);
    var pick = i.guides.length > 1 ? '<div class="hwx-seg hwx-guide-pick" role="radiogroup" aria-label="Guide">' + i.guides.map(function (x, k) { return '<button type="button" role="radio" aria-checked="' + (k === gi) + '" tabindex="' + (k === gi ? 0 : -1) + '" data-gpick="' + k + '">' + esc(x.title || 'Guide ' + (k + 1)) + '</button>'; }).join('') + '</div>' : '';
    box.innerHTML = pick + '<div class="hwx-guide"><div><div class="hw-shot">' + (step.image ? '<img alt="' + esc(SH.stepAlt(step, si)) + '" data-img="' + esc(i.repo.name + '|' + step.image) + '">' + SH.marksHTML(step.marks, si) : '<div class="hw-shot-none"><p>' + SH.boldOnly(step.text || '') + '</p></div>') + '</div>' +
      '<div class="hwx-guide-nav"><button type="button" class="btn btn-quiet btn-sm" data-gstep="' + (si - 1) + '"' + (si <= 0 ? ' disabled' : '') + '>' + I('left') + 'Back</button><span aria-live="polite">Step ' + (si + 1) + ' of ' + steps.length + '</span><button type="button" class="btn btn-primary btn-sm" data-gstep="' + (si + 1) + '"' + (si >= steps.length - 1 ? ' disabled' : '') + '>Next' + I('right') + '</button></div></div>' +
      '<ol class="hwx-steps" aria-label="Steps">' + (g && g.title ? '' : '') + steps.map(function (s, k) { return '<li><button type="button" class="hwx-step" data-gstep="' + k + '"' + (k === si ? ' aria-current="step"' : '') + '><b>' + (k + 1) + '</b><span>' + SH.boldOnly(s.text || '') + '</span></button></li>'; }).join('') + '</ol></div>';
    SH.watchImages(box);
    box.onclick = function (e) {
      var b = e.target.closest('[data-gstep],[data-gpick]'); if (!b || b.disabled) return;
      if (b.hasAttribute('data-gpick')) guideViewer(i, +b.getAttribute('data-gpick'), 0);
      else { guideViewer(i, gi, +b.getAttribute('data-gstep')); var cur = box.querySelector('[aria-current="step"]'); if (cur && b.classList.contains('hwx-step')) cur.focus(); }
    };
  }

  /* ---------------- Tooltips (hover and focus, linked with aria-describedby) ---------------- */
  var tip = null;
  function showTip(el, x, y) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'hwx-tip'; tip.id = 'hwx-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    var t = el.getAttribute('data-tip') || '', h = el.getAttribute('data-tip-title') || '', k = el.getAttribute('data-tip-k') || '';
    if (!t && !h) return hideTip();
    tip.innerHTML = (k ? '<em>' + esc(k) + '</em>' : '') + (h ? '<b>' + esc(h) + '</b>' : '') + esc(t);
    tip.classList.add('is-on');
    var rr = tip.getBoundingClientRect(), px = Math.min(window.innerWidth - rr.width - 10, Math.max(10, x + 14)), py = y + 18 + rr.height > window.innerHeight ? y - rr.height - 12 : y + 18;
    tip.style.left = px + 'px'; tip.style.top = py + 'px';
  }
  function hideTip() { if (tip) tip.classList.remove('is-on'); }
  document.addEventListener('mouseover', function (e) { var el = e.target.closest && e.target.closest('[data-tip],[data-tip-title]'); if (el) showTip(el, e.clientX, e.clientY); else hideTip(); });
  document.addEventListener('focusin', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip],[data-tip-title]');
    if (el && el === e.target) { var rr = el.getBoundingClientRect(); showTip(el, rr.left, rr.bottom - 10); el.setAttribute('aria-describedby', 'hwx-tip'); } else hideTip();
  });
  document.addEventListener('focusout', function (e) { if (e.target.getAttribute && e.target.getAttribute('aria-describedby') === 'hwx-tip') e.target.removeAttribute('aria-describedby'); });
  document.addEventListener('scroll', hideTip, { passive: true });

  /* ---------------- Navigation bar ---------------- */
  function buildNav() {
    var tabs = document.getElementById('hwx-tabs');
    if (tabs) tabs.innerHTML = VIEWS.map(function (v) { return '<a class="hwx-tab" href="' + href(v.id) + '" data-tab="' + v.id + '"' + (v.signedIn ? ' hidden' : '') + '>' + vIcon(v.id) + '<span>' + esc(v.label) + '</span></a>'; }).join('');
    var seg = document.getElementById('hwx-level');
    if (seg) seg.innerHTML = LEVELS.map(function (l) { return '<button type="button" role="radio" data-level="' + l.id + '" aria-checked="' + (HWX.level === l.id) + '" tabindex="' + (HWX.level === l.id ? 0 : -1) + '">' + esc(l.label) + '</button>'; }).join('');
  }
  function syncTabs() { $$('[data-tab="health"]').forEach(function (t) { t.hidden = !GH.state.signedIn; }); }
  function setNav(route) {
    var cur = VIEW_BY[route.view] ? route.view : route.view === 'site' ? 'live' : '';
    $$('[data-tab]').forEach(function (a) { if (a.getAttribute('data-tab') === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $$('[data-level]').forEach(function (b) { var on = b.getAttribute('data-level') === HWX.level; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    var c = document.getElementById('hwx-crumbs'); if (!c) return;
    var trail = [['Explore', href('discover')]];
    if (VIEW_BY[route.view] && route.view !== 'discover') trail.push([VIEW_BY[route.view].label]);
    if (route.view === 'cat' && own(CATS, route.arg)) { trail.push(['Map', href('map')], [catLabel(route.arg)]); }
    if (route.view === 'with') trail.push(['Connections', href('connections')], [route.arg]);
    if (route.view === 'site') trail.push(['Live sites', href('live')], [route.arg]);
    if (route.view === 'p') { var i = byName(route.arg); if (i) trail.push([catLabel(i.category), i.category ? catHref(i.category) : href('all', { cat: '_none' })], [i.name]); else trail.push([route.arg]); }
    c.innerHTML = '<ol>' + trail.map(function (t, k) { var last = k === trail.length - 1; return '<li>' + (t[1] && !last ? '<a href="' + t[1] + '">' + esc(t[0]) + '</a>' : '<span' + (last ? ' aria-current="page"' : '') + '>' + esc(t[0]) + '</span>') + '</li>'; }).join('') + '</ol>';
  }
  function setLevel(lv) {
    if (lv === HWX.level || ['overview', 'built', 'code'].indexOf(lv) < 0) return;
    HWX.level = lv; SH.store('hw_level', lv);
    var r = parseRoute();
    if (r.view === 'p' && r.params.tab) { delete r.params.tab; history.replaceState(null, '', href('p/' + enc(r.arg), r.params)); }
    HWX.render({ keep: true });
    refreshHero();
    var lab = LEVELS.filter(function (l) { return l.id === lv; })[0];
    SH.announce('Detail level: ' + (lab ? lab.label : lv) + '.');
  }
  HWX.setLevel = setLevel;
  /* A radio group with arrow keys (roving tab index). */
  function radioKeys(group, attr, onPick) {
    group.addEventListener('keydown', function (e) {
      var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: 'first', End: 'last' };
      if (!(e.key in keys)) return;
      var opts = $$('[' + attr + ']', group).filter(function (b) { return b.getAttribute('aria-disabled') !== 'true'; });
      var cur = opts.indexOf(document.activeElement); if (cur < 0) cur = 0;
      var k = keys[e.key], next = k === 'first' ? 0 : k === 'last' ? opts.length - 1 : (cur + k + opts.length) % opts.length;
      e.preventDefault();
      onPick(opts[next]);
    });
  }

  /* ---------------- Search: suggestions everywhere, live lighting on the map, the list and the City ---------------- */
  var qInput = null;
  function wireSearch() {
    var wrap = document.getElementById('hwx-search'), input = qInput = document.getElementById('hwx-q'), sug = document.getElementById('hwx-suggest'), clear = document.getElementById('hwx-q-x');
    if (!input || !sug) return;
    var active = -1, t = null;
    function close() { sug.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; }
    function hasQ() { if (wrap) wrap.classList.toggle('has-q', !!input.value.trim()); }
    function suggest() {
      var q = input.value.trim(); hasQ();
      var route = parseRoute();
      if (route.view === 'city' && typeof HWX.citySearch === 'function') { close(); clearTimeout(t); t = setTimeout(function () { HWX.q = q; try { HWX.citySearch(q); } catch (e) { console.error(e); } }, 140); return; }
      if (route.view === 'map' || route.view === 'all') {
        close(); clearTimeout(t);
        t = setTimeout(function () {
          HWX.q = q;
          if (route.view === 'all') { var p = Object.assign(Object.create(null), route.params); if (q) p.q = q; else delete p.q; history.replaceState(null, '', href('all', p)); }
          HWX.render({ keep: true });
        }, 140);
        return;
      }
      if (!q) return close();
      var hits = list().filter(function (i) { return matches(i, q); }).sort(friendly);
      sug.innerHTML = hits.slice(0, 7).map(function (i, k) {
        return '<li role="option" id="hwx-sg-' + k + '" aria-selected="false" data-href="' + esc(pHref(i)) + '">' + rowIcon(i) + '<span class="hwx-sg-txt"><span class="hwx-sg-t">' + esc(i.name) + '</span><span class="hwx-sg-s">' + esc(i.tagline || catLabel(i.category)) + '</span></span></li>';
      }).join('') + '<li role="option" id="hwx-sg-all" aria-selected="false" class="hwx-sg-all" data-href="' + esc(href('all', { q: q })) + '">' + (hits.length ? 'See every result (' + hits.length + ')' : 'No matches. Search all projects') + '</li>';
      sug.hidden = false; input.setAttribute('aria-expanded', 'true'); active = -1;
      SH.announce(hits.length ? plural(hits.length, 'match', 'matches') + '. Use the arrow keys to choose.' : 'No matches.');
    }
    function move(d) {
      var opts = $$('[role="option"]', sug); if (!opts.length) return;
      active = (active + d + opts.length) % opts.length;
      opts.forEach(function (o, k) { o.setAttribute('aria-selected', String(k === active)); });
      input.setAttribute('aria-activedescendant', opts[active].id);
      opts[active].scrollIntoView({ block: 'nearest' });
    }
    function pick(li) {
      var q = input.value.trim(); close();
      if (li) { location.hash = li.getAttribute('data-href'); if (!li.classList.contains('hwx-sg-all')) { input.value = ''; hasQ(); } }
      else { HWX.q = q; HWX.go('all', q ? { q: q } : null); }
    }
    input.addEventListener('input', suggest);
    input.addEventListener('focus', function () { var v = parseRoute().view; if (input.value.trim() && v !== 'map' && v !== 'all' && v !== 'city') suggest(); });
    input.addEventListener('keydown', function (e) {
      var v = parseRoute().view;
      if (e.key === 'ArrowDown') { if (sug.hidden && v !== 'map' && v !== 'all' && v !== 'city') suggest(); move(1); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { move(-1); e.preventDefault(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (v === 'city' && typeof HWX.citySearch === 'function') { try { HWX.citySearch(input.value.trim(), { frame: true }); } catch (x) {} return; }
        if (v === 'map' || v === 'all') { HWX.q = input.value.trim(); var m = $('#hwx-view .hit, #hwx-view .hwx-grid .hwx-card, #hwx-view .hwx-rows .hwx-row'); if (m) m.focus(); return; }
        pick(active >= 0 ? $$('[role="option"]', sug)[active] : null);
      }
      else if (e.key === 'Escape') { if (!sug.hidden) { close(); e.stopPropagation(); } else if (input.value) { input.value = ''; HWX.q = ''; hasQ(); if (v === 'map' || v === 'all' || v === 'city') suggest(); } }
    });
    input.addEventListener('blur', function () { setTimeout(close, 160); });
    sug.addEventListener('mousedown', function (e) { var li = e.target.closest('[role="option"]'); if (li) { e.preventDefault(); pick(li); } });
    if (clear) clear.addEventListener('click', function () {
      input.value = ''; HWX.q = ''; hasQ(); close();
      var r = parseRoute();
      if (r.view === 'all') { delete r.params.q; history.replaceState(null, '', href('all', r.params)); HWX.render({ keep: true }); }
      else if (r.view === 'city' && typeof HWX.citySearch === 'function') { try { HWX.citySearch(''); } catch (x) {} }
      else HWX.render({ keep: true });
      input.focus();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); input.focus(); }
    });
  }

  /* ---------------- The header band (stream E's HWHero) ---------------- */
  var heroCtl = null;
  function mountHero() {
    var el = document.getElementById('hwh-hero');
    if (!el) return;
    if (!window.HWHero || typeof window.HWHero.mount !== 'function') { el.hidden = true; return; }
    try {
      heroCtl = window.HWHero.mount(el, { mode: 'hero', onOpen: function (route) { var h = String(route || '').replace(/^#?\/?/, '#/'); scrollNext = true; if (location.hash === h) HWX.render(); else location.hash = h; } });
    } catch (e) { console.error('hub: the header could not be drawn', e); el.hidden = true; }
  }
  function refreshHero() { if (heroCtl && typeof heroCtl.refresh === 'function') { try { heroCtl.refresh(); } catch (e) { console.error(e); } } }

  /* ---------------- Render ---------------- */
  var view = null, lastKey = null, firstRender = true, scrollNext = false, userScrolled = 0;
  ['wheel', 'touchmove', 'keydown'].forEach(function (ev) { window.addEventListener(ev, function () { userScrolled++; }, { passive: true }); });
  function group(route) { return route.view === 'p' ? 'p:' + String(route.arg).toLowerCase() : route.view === 'city' ? 'city' : DEEP[route.view] || route.view === 'site' || route.view === 'health' ? 'deep:' + route.view + ':' + route.arg : 'explore'; }
  function heroShown(route) { return !(DEEP[route.view] || route.view === 'site' || route.view === 'health'); }
  function scrollToView(route) {
    var nav = document.getElementById('hwx-nav'), hdr = document.getElementById('hw-hdr');
    var hh = hdr ? hdr.offsetHeight : 64;
    if (!heroShown(route)) { window.scrollTo({ top: 0, behavior: 'auto' }); return; }
    var top = nav ? nav.getBoundingClientRect().top + window.scrollY - hh : 0;
    if (scrollNext || window.scrollY > top || route.view === 'city') window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }
  HWX.scrollToView = function () { scrollToView(parseRoute()); };

  function ready() { return GH.state.repos.length > 0 || (!GH.state.loading && GH.state.loadedAt) || !!GH.state.error; }

  HWX.render = function (opts) {
    opts = opts || {};
    view = view || document.getElementById('hwx-view'); if (!view) return;
    var route = parseRoute();
    // the old names still open the right view
    if (own(REDIRECT, route.raw)) { history.replaceState(null, '', href(REDIRECT[route.raw] + (route.arg ? '/' + route.arg : ''), route.params)); route = parseRoute(); }
    setNav(route); syncTabs();
    var heroEl = document.getElementById('hwh-hero');
    if (heroEl && heroCtl) heroEl.hidden = !heroShown(route);
    document.body.setAttribute('data-view', route.view);
    if (graphStop) { graphStop(); graphStop = null; }
    if (route.view !== 'p') cityOff();
    var key = route.view + '/' + route.arg + (route.view === 'p' ? '?' + (route.params.tab || '') : '');
    var html;
    if (!ready()) html = (route.view === 'discover' || !VIEW_BY[route.view] ? '' : viewHead(route, '', esc(VIEW_BY[route.view] ? VIEW_BY[route.view].label : 'Loading'), '')) + skeleton();
    else {
      var items = list(route.view === 'all' && route.params.extra === '1');
      var fn = route.view === 'city' ? (typeof HWX.views.city === 'function' ? HWX.views.city : cityFallback) : R[route.view] || R.discover;
      try { html = errorNote() + (route.view === 'health' ? '' : needsSignIn()) + fn(items, route); }
      catch (e) {
        console.error('hub: this view could not be drawn', e);
        html = empty('This page could not be shown', 'One project’s details may be faulty. Try another view, or reload the page.', '<p><a class="btn btn-primary" href="#/">Go to Discover</a></p>');
      }
    }
    view.setAttribute('aria-busy', 'true');
    view.innerHTML = html;
    view.setAttribute('aria-busy', 'false');
    SH.watchImages(view);
    SH.observeReveals(view);
    if (ready()) {
      var items2 = list(route.view === 'all' && route.params.extra === '1');
      if (route.view === 'line') drawRoad(items2);
      if (route.view === 'connections') { drawGraph(items2, HWX._gAll); graphPanel(items2, null); }
      if (route.view === 'p') { var pi = byName(route.arg); if (pi) afterProject(pi); }
      if (route.view === 'city' && typeof HWX.after.city === 'function') { try { HWX.after.city(items2, route); } catch (e) { console.error(e); } }
      if (route.view === 'discover' && typeof HWX.cityPreview === 'function') { var slot = document.getElementById('hwx-city-preview'); if (slot) try { HWX.cityPreview(slot); } catch (e) { console.error(e); } }
    }
    var moved = key !== lastKey && lastKey !== null;
    if (!opts.keep && (moved || (firstRender && /^#\//.test(location.hash)))) scrollToView(route);
    if (moved && !opts.keep) {
      var h = $('h1, h2', view);
      SH.announce((h ? h.textContent.trim() : 'Page') + ' shown.');
      if (!firstRender && document.activeElement && (document.activeElement === document.body || !document.activeElement.isConnected || view.contains(document.activeElement) === false && !document.activeElement.closest('#hwx-nav,#hwh-hero,dialog'))) view.focus({ preventScroll: true });
    }
    if (ready() && firstRender) {
      firstRender = false;
      // A direct link to a view lands on it, once the header above has settled.
      if (route.view !== 'discover' && /^#\/./.test(location.hash) && !opts.keep) { scrollNext = true; scrollToView(route); [700, 1600].forEach(function (ms) { setTimeout(function () { var nav = document.getElementById('hwx-nav'), hdr = document.getElementById('hw-hdr'), r2 = parseRoute(); if (!nav || !hdr || r2.view === 'discover' || !heroShown(r2)) return; if (Math.abs(nav.getBoundingClientRect().top - hdr.offsetHeight) > 6 && userScrolled < 2) { scrollNext = true; scrollToView(r2); scrollNext = false; } }, ms); }); }
    }
    lastKey = key; scrollNext = false;
    launchFromRoute();
  };

  /* #/p/<repo>?launch=demo: a link never runs a demo by itself. Once the cards are in, the viewer
     sees the confirm screen; closing it takes launch out of the address. */
  function launchFromRoute() {
    var r = parseRoute();
    if (r.view !== 'p' || r.params.launch !== 'demo') { launchedFor = ''; return; }
    if (!GH.state.detailsReady || !GH.state.repos.length || ($('#full-dlg') && $('#full-dlg').open)) return;
    var i = byName(r.arg), key = String(r.arg).toLowerCase() + (GH.state.signedIn ? '+' : '-');
    if (!i || launchedFor === key) return;
    launchedFor = key;
    var name = i.repo.name;
    if (i.demo) { SH.openDemo(name, { confirmFirst: true, title: i.name, onClose: function () { dropLaunch(name); } }); return; }
    if (GH.state.signedIn) { dropLaunch(name); SH.toast('This project has no demo.', 'warn'); }
  }
  function dropLaunch(name) {
    var r = parseRoute();
    if (r.view !== 'p' || !r.params.launch || String(r.arg).toLowerCase() !== String(name).toLowerCase()) return;
    delete r.params.launch;
    history.replaceState(null, '', href('p/' + enc(r.arg), r.params));
  }

  /* ---------------- Events (delegated, bound once) ---------------- */
  function setParams(p, focusSel) {
    var r = parseRoute(), next = Object.assign(Object.create(null), r.params, p);
    Object.keys(next).forEach(function (k) { if (next[k] === '' || next[k] == null) delete next[k]; });
    if (next.sort === 'updated') delete next.sort;
    if (next.layout === 'cards') delete next.layout;
    history.replaceState(null, '', href('all', next));
    HWX.render({ keep: true });
    if (focusSel) { var el = $(focusSel, view); if (el) el.focus(); }
  }
  function wire() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-signin]')) { e.preventDefault(); SH.openSignIn(); return; }
      if (t.closest('[data-retry]')) { GH.loadRepos(); return; }
      var vw = t.closest('[data-open-view]'); if (vw) { e.preventDefault(); var vn = vw.getAttribute('data-open-view'), vi = byName(vn); SH.openDemo(vn, { view: true, title: vi ? vi.name : '' }); return; }
      var demo = t.closest('[data-demo]'); if (demo) { e.preventDefault(); var di = byName(demo.getAttribute('data-demo')); SH.openDemo(demo.getAttribute('data-demo'), { title: di ? di.name : '' }); return; }
      var lv = t.closest('[data-level]'); if (lv) { setLevel(lv.getAttribute('data-level')); return; }
      var sh = t.closest('[data-shelf]'); if (sh) { var tr = sh.parentNode.querySelector('.hwx-shelf-track'); tr.scrollBy({ left: +sh.getAttribute('data-shelf') * tr.clientWidth * .85, behavior: SH.reduced() ? 'auto' : 'smooth' }); return; }
      var route = parseRoute();
      var fc = t.closest('[data-fcat]'); if (fc) { if (fc.getAttribute('aria-disabled') === 'true') return; setParams({ cat: fc.getAttribute('data-fcat') }, '[data-fcat="' + fc.getAttribute('data-fcat') + '"]'); return; }
      var lay = t.closest('[data-layout]'); if (lay) { setParams({ layout: lay.getAttribute('data-layout') }, '[data-layout="' + lay.getAttribute('data-layout') + '"]'); return; }
      var clr = t.closest('[data-fclear]'); if (clr) { HWX.q = ''; if (qInput) { qInput.value = ''; var w = document.getElementById('hwx-search'); if (w) w.classList.remove('has-q'); } return; }
      var pt = t.closest('[data-ptab]'); if (pt) {
        var p4 = Object.assign(Object.create(null), route.params, { tab: pt.getAttribute('data-ptab') });
        history.replaceState(null, '', href('p/' + enc(route.arg), p4)); HWX.render({ keep: true });
        var nt = document.getElementById('hwx-tab-' + pt.getAttribute('data-ptab')); if (nt) nt.focus();
        return;
      }
      var cp = t.closest('[data-copy]'); if (cp) { SH.copy(cp.getAttribute('data-copy'), cp.getAttribute('data-copy-label') || 'Copied to the clipboard'); return; }
      if (t.closest('[data-copylink]')) { SH.copy(location.href, 'Link copied. Paste it anywhere to share this page.'); return; }
      var lb = t.closest('[data-lb]'); if (lb && route.view === 'p') { SH.openLightbox(route.arg, +lb.getAttribute('data-lb')); return; }
      var gf = t.closest('[data-guide-full]'); if (gf && route.view === 'p') { var gb = document.getElementById('hwx-guide'); SH.openGuide(route.arg, gb ? +gb.getAttribute('data-gi') : 0, gb ? +gb.getAttribute('data-si') : 0); return; }
      var hub = t.closest('[data-hub]'); if (hub && route.view === 'connections') { e.preventDefault(); if (HWX._graphSelect) HWX._graphSelect(hub.getAttribute('data-hub') || null); return; }
      if (t.closest('#hwx-g-all')) { HWX._gAll = !HWX._gAll; HWX.render({ keep: true }); return; }
      var go = t.closest('[data-go]'); if (go && !t.closest('a[href]:not([data-go])')) { e.preventDefault(); location.hash = '#/' + go.getAttribute('data-go'); return; }
    });
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'hwx-sort') { setParams({ sort: t.value }, '#hwx-sort'); return; }
      if (t.hasAttribute('data-fsel')) { var p = {}; p[t.getAttribute('data-fsel')] = t.value; setParams(p, '#' + t.id); return; }
      if (t.hasAttribute('data-ft')) { var p2 = {}; p2[t.getAttribute('data-ft')] = t.checked ? '1' : ''; setParams(p2, '#' + t.id); return; }
    });
    // radio groups with arrow keys: level, category filter, layout, guide picker; project tabs
    var lvg = document.getElementById('hwx-level'); if (lvg) radioKeys(lvg, 'data-level', function (b) { setLevel(b.getAttribute('data-level')); var n = $('[data-level="' + b.getAttribute('data-level') + '"]'); if (n) n.focus(); });
    document.addEventListener('keydown', function (e) {
      var g = e.target.closest && e.target.closest('#hwx-fseg, #hwx-layout, .hwx-guide-pick, .hwx-ptabs');
      if (!g || g._keys) return;
      g._keys = true;
      var attr = g.id === 'hwx-fseg' ? 'data-fcat' : g.id === 'hwx-layout' ? 'data-layout' : g.classList.contains('hwx-ptabs') ? 'data-ptab' : 'data-gpick';
      radioKeys(g, attr, function (b) { b.click(); var again = $('[' + attr + '="' + b.getAttribute(attr) + '"]'); if (again) again.focus(); });
      g.dispatchEvent(new KeyboardEvent('keydown', { key: e.key, bubbles: false }));
    });
    window.addEventListener('hashchange', function () {
      if (location.hash && !/^#\//.test(location.hash)) return;
      var r = parseRoute();
      if (r.view === 'all' && r.params.q != null) { HWX.q = r.params.q; if (qInput && qInput.value !== HWX.q) { qInput.value = HWX.q; var w = document.getElementById('hwx-search'); if (w) w.classList.toggle('has-q', !!HWX.q); } }
      hideTip();
      var from = lastGroup, to = group(r);
      lastGroup = to;
      if (from && from !== to && (from !== 'explore' || to !== 'explore')) SH.curtain(function () { HWX.render(); });
      else HWX.render();
    });
    var rz = null;
    /* the explorer bar's real height, for things sized to the space under the sticky bars */
    var syncBars = function () { var n = document.querySelector('.hwx-nav'); if (n) document.documentElement.style.setProperty('--hwx-nav-h', n.offsetHeight + 'px'); };
    syncBars(); setTimeout(syncBars, 600);
    window.addEventListener('resize', syncBars, { passive: true });
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { var r = parseRoute(); if (!ready()) return; if (r.view === 'line') drawRoad(list()); if (r.view === 'connections') drawGraph(list(), HWX._gAll); }, 200); }, { passive: true });
  }
  var lastGroup = null;

  /* ---------------- Start ---------------- */
  function start() {
    view = document.getElementById('hwx-view');
    buildNav(); wireSearch(); wire(); mountHero();
    var r = parseRoute();
    lastGroup = group(r);
    if (r.params.q) { HWX.q = r.params.q; if (qInput) { qInput.value = HWX.q; var w = document.getElementById('hwx-search'); if (w) w.classList.add('has-q'); } }
    GH.on('auth', function () { syncTabs(); });
    GH.on('repos', function () { HWX.render({ keep: !firstRender, first: firstRender }); refreshHero(); });
    GH.on('details', function () { HWX.render({ keep: true }); refreshHero(); });
    GH.on('error', function () { HWX.render({ keep: true }); });
    HWX.render();
    GH.loadRepos();
  }

  /* Helpers the City glue (hwc-ui.js) and the header may use. */
  HWX.ui = { href: href, pHref: pHref, wHref: wHref, liveHref: liveHref, catHref: catHref, card: card, row: row, shelf: shelf, secHead: secHead, viewHead: viewHead,
    plural: plural, esc: esc, icon: vIcon, needsSignIn: needsSignIn, empty: empty, catLabel: catLabel, kindLabel: kindLabel, statusLabel: statusLabel,
    stages: STAGES, categories: CAT_ORDER, stageOf: function (c) { return STAGE_OF[c] || null; }, everywhere: everywhere, index: index, list: list, byName: byName };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else setTimeout(start, 0);
})();
