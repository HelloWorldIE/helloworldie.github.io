/* ==========================================================================
   HelloWorld hub: the City's page glue.
   Registers on window.HWX (the explorer, hwx-views.js, calls these only when they are there):

     HWX.views.city(items, route)   the #/city view: the stage, its search, tours, key, the
                                    Projects list (the keyboard way in) and the panel
     HWX.after.city(items, route)   after the view is drawn: loads the City module and builds it
     HWX.citySlide(slot, repo)      the City in a slide: inside `repo` (the project page hero), or
                                    the whole City when `repo` is null. citySlide(null) takes it out
     HWX.cityPreview(slot)          the whole City, watching only, in Discover's City card
     HWX.citySearch(q, {frame})     search the City (the explorer's search box calls it on #/city)

   The City module (assets/city/hwc-city.js, three.js) is loaded only when one of these runs. It
   never reads the token, the page or its CSS: everything goes through the handlers below, and
   colour only through palette(). One canvas and one City for the session; it pauses when nobody
   can see it.

   The bot is the real mascot (assets/mascot), drawn over the canvas, one at a time: he swims the
   HelloWorld line from district to district (in strokes: gather, push, settle; his eyes lead each
   push and he tilts toward it) with a light trail fading behind him, swims to whatever you select with the jellyfish pulse, looks at it, scans
   while you search and is found when something matches. Never a 3D model of him. He is in the
   #/city view only (the header has its own bot on the other views).
   ========================================================================== */
(function () {
  'use strict';

  var HWX = window.HWX = window.HWX || {};
  HWX.views = HWX.views || {};
  HWX.after = HWX.after || {};
  var GH = window.HWGH, CFG = window.HW_CONFIG || {};
  if (!GH) return;
  var OWNER = CFG.account || GH.account;
  var CITY_URL = 'assets/city/hwc-city.js?v=4';

  /* ---------------- small helpers ---------------- */
  var own = function (o, k) { return o != null && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var enc = encodeURIComponent;
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function SH() { return window.HWShell || null; }
  function UI() { return HWX.ui || {}; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function reduced() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function href(path, params) {
    if (UI().href) return UI().href(path, params);
    var q = params ? Object.keys(params).filter(function (k) { return params[k] !== '' && params[k] != null; }).map(function (k) { return enc(k) + '=' + enc(params[k]); }).join('&') : '';
    return '#/' + path + (q ? '?' + q : '');
  }
  function go(path, params) { if (HWX.go) HWX.go(path, params); else location.hash = href(path, params); }
  function toast(msg, tone) { var s = SH(); if (s && s.toast) s.toast(msg, tone); }
  function announce(msg) { var s = SH(); if (s && s.announce) s.announce(msg); }
  function track(kind, p) { return GH.trackLoad ? GH.trackLoad(kind, p) : p; }
  function route() {
    if (HWX.parseRoute) { try { return HWX.parseRoute(); } catch (e) {} }
    var h = location.hash.replace(/^#\/?/, ''), qi = h.indexOf('?'), path = qi >= 0 ? h.slice(0, qi) : h, params = {};
    (qi >= 0 ? h.slice(qi + 1) : '').split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); try { params[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); } catch (e) {} });
    return { view: path.split('/')[0] || 'discover', arg: path.split('/').slice(1).join('/'), params: params };
  }
  function inCity() { return route().view === 'city'; }

  /* Line icons (Lucide geometry, stroke 2) for the City's own controls. */
  var ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    tours: '<path d="M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"/>',
    full: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    links: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><circle cx="12" cy="5" r="2.5"/><path d="M7.5 16 11 7.2M16.5 16 13 7.2"/>',
    walk: '<path d="M4 16v-2.4C4 11.5 3 10.5 3 8c0-2.7 1.5-6 4.5-6C9.4 2 10 3.8 10 5.5c0 3.1-2 5.7-2 8.7V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.4c0-2.1 1-3.1 1-5.6 0-2.7-1.5-6-4.5-6C14.6 6 14 7.8 14 9.5c0 3.1 2 5.7 2 8.7V20a2 2 0 1 0 4 0Z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>', left: '<path d="m15 5-7 7 7 7"/>', right: '<path d="m9 5 7 7-7 7"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    folder: '<path d="M4 5a1 1 0 0 1 1-1h5l2 2h7a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/>',
    play: '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor"/>',
    key: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
  };
  function I(k) { return '<svg class="hwc-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[k] || ICONS.key) + '</svg>'; }

  /* ---------------- vocabulary ---------------- */
  function catOf(id) { return HWX.cat ? HWX.cat(id) : { id: id || '_none', label: own(CFG.categories, id) ? CFG.categories[id] : 'Not sorted yet', blurb: '' }; }
  function stageOf(catId) { return HWX.stageOf ? HWX.stageOf(catId) : null; }
  function kindOf(id) { return HWX.kind ? HWX.kind(id) : { id: id, label: own(CFG.kinds, id) ? CFG.kinds[id] : '', plural: '', form: own(CFG.kind_details, id) ? CFG.kind_details[id].form : '' }; }
  function statusText(id) { return own(CFG.statuses, id) ? CFG.statuses[id] : ''; }
  function catIcon(id) { return HWX.catIcon ? HWX.catIcon(id) : ''; }
  function listAll() { return HWX.list ? HWX.list() : []; }
  function byName(n) { return HWX.byName ? HWX.byName(n) : null; }
  function matches(info, q) { return HWX.matches ? HWX.matches(info, q) : String(info.search || info.name || '').toLowerCase().indexOf(String(q).toLowerCase()) >= 0; }
  function friendly(list) { return HWX.sortFriendly ? HWX.sortFriendly(list) : list.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }); }
  function index(list) { return HWX.index ? HWX.index(list) : { live: {}, 'with': {}, everywhere: [] }; }

  /* ---------------- the palette: brand tokens, light and dark ----------------
     The City's colours, by role. Light: paper and ink, matte white bodies. Dark: void, raised void
     bodies. Violet (lilac on dark) only for live, selected or now. Values from assets/tokens.css. */
  var PALETTE = {
    light: {
      dark: false,
      tones: {
        body: '#ffffff', body2: '#f1eff7', body3: '#e3e0ec',             /* white, paper-2, mist: the model's bodies */
        card: '#ffffff', edge: '#e1dfe7', lot: '#faf9fd',                 /* district plots: white cards, ink 12% hairline */
        statue: '#cfcadb', ink: '#262430',                                /* statues; small ink parts (locks, the line) */
        accent: '#6d44e0', accentSoft: '#a98bff', accentFaint: '#d9cffb', /* Signal Violet; lilac; the violet eye tone */
        lawn: '#f1eff7', tree: '#dedbe8', dim: '#e3e0ec', frame: '#ffffff', stone: '#ffffff'
      },
      key: ['#ffffff', 1.3], fill: ['#6d44e0', 0], hemi: ['#ffffff', '#d9d6e3', 2.25],
      shadow: ['#262430', 0.15], ghost: ['#262430', 0.05], pillFill: ['#6d44e0', 0.11], pillLine: ['#6d44e0', 0.22],
      link: ['#262430', 0.18], route: ['#6d44e0', 0.85], flags: ['#6b6880', '#8f8ba3', '#b3afc4', '#d6d2e2'],
      /* each project's own colour (Bryan, 2026-11-26): soft tones of the brand's confetti; files are lighter shades */
      facades: ['#f2a9b8', '#f6be94', '#f0d27e', '#9fd8b4', '#95c9ec', '#aab6f2', '#c6b0f2', '#ef9f8e', '#b7d2a0', '#8fd2ca']
    },
    dark: {
      dark: true,
      tones: {
        body: '#4a4364', body2: '#423c5c', body3: '#3a3452',              /* raised void tones, lit so they read on void */
        card: '#1b1726', edge: '#3a3646', lot: '#211c2e',                 /* void-2 plots, white 12% hairline */
        statue: '#5a5374', ink: '#f2f0f8',
        accent: '#a98bff', accentSoft: '#8f72ff', accentFaint: '#5e5194', /* Bright Violet on dark */
        lawn: '#262035', tree: '#4a4362', dim: '#2c2738', frame: '#211c2e', stone: '#7a7394'
      },
      key: ['#f2f0f8', 1.35], fill: ['#6d44e0', 0.5], hemi: ['#c4bce6', '#241f34', 2.3],
      shadow: ['#000000', 0.34], ghost: ['#f7f6fb', 0.07], pillFill: ['#a98bff', 0.09], pillLine: ['#a98bff', 0.2],
      link: ['#f7f6fb', 0.16], route: ['#a98bff', 0.85], flags: ['#f2f0f8', '#b9b5c9', '#7d7891', '#4a4460'],
      facades: ['#9a5c70', '#a06c50', '#9c8648', '#4f8a6a', '#4d7ea4', '#5f6cab', '#7a62ad', '#a25e52', '#6c8858', '#4a8682']
    }
  };
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function palette() { return isDark() ? PALETTE.dark : PALETTE.light; }

  /* ---------------- state ---------------- */
  var city = null, host = null, mod = null, modP = null, cityFail = false, cityLinks = false, busy = false, cityIn = null;
  var lastSel = null, lastTour = null, lastLevel = null, keyOpen = false, listOpen = false, slideOn = false;
  var blobs = Object.create(null), previews = Object.create(null), treesAsked = Object.create(null);

  function loadModule() {
    if (!modP) {
      modP = import(new URL(CITY_URL, document.baseURI).href).then(function (m) { mod = m; return m; });
      modP.catch(function () {});
    }
    return modP;
  }
  function hostEl() {
    if (!host) { host = document.createElement('div'); host.className = 'hwc-host'; }
    return host;
  }
  function ensureCity(m) {
    if (city || cityFail) return city;
    city = m.mountCity(hostEl(), handlers());
    if (!city) cityFail = true;
    else HWX._city = city;
    return city;
  }

  /* ---------------- data for the City ---------------- */
  function isStale(d) { var t = Date.parse(d || ''); return !isNaN(t) && Date.now() - t > 365 * 864e5; }
  function itemOf(i, shared) {
    var gone = !!i.archived || i.status === 'retired';
    var k = kindOf(i.kind), form = k && k.form ? k.form : 'monolith';
    var last = (i.last && i.last.date) || (i.repo && i.repo.pushed_at) || '';
    var st = i.status ? statusText(i.status) : '';
    return {
      key: i.repo.name, name: i.name, tagline: i.tagline || '', category: i.category || '_none', catLabel: catOf(i.category).label,
      kind: i.kind, kindLabel: i.kindLabel || (k && k.label) || 'Project', form: form,
      statusLabel: gone ? 'Retired' : st || (i.private ? 'Private' : ''),
      size: i.langTotal || (i.repo.size || 0) * 1024, demo: !!i.demo && !gone,
      works: (i.built_with || []).filter(function (w) { return shared[w]; }),
      status: i.status, retired: gone, archived: !!i.archived, paused: i.status === 'paused', private: !!i.private,
      live: !gone && i.status !== 'paused' && (i.status === 'live' || (!i.status && !!i.live_url)),
      runs: (i.runs || []).map(function (r) { return r.site; }), cover: i.cover || '', icon: i.icon || '',
      recent: i.recent || 0, issues: i.issues || 0, guides: !!i.hasGuides,
      lastChange: last, stale: isStale(last)
    };
  }
  /* Everything the City draws: the listed projects, plus archived ones, which stand as ruins. */
  function cityItems(list) {
    var seen = Object.create(null), shared = sharedTools(list);
    list.forEach(function (i) { seen[i.repo.name] = 1; });
    var ruins = (GH.state.repos || []).filter(function (r) { return r.archived && !r.fork && !seen[r.name]; })
      .map(function (r) { return HWX.info ? HWX.info(r) : null; })
      .filter(function (i) { return i && !(HWX.isCopy && HWX.isCopy(i)); });
    return list.concat(ruins).map(function (i) { return itemOf(i, shared); });
  }
  /* Districts: one per category, in the order of the stages (idea to live), then the rest. */
  function cityHoods() {
    var cats = HWX.CATS || Object.keys(CFG.categories || {}).map(function (id) { return { id: id, label: CFG.categories[id] }; });
    var out = cats.map(function (c) {
      var st = stageOf(c.id);
      return { id: c.id, label: c.label, icon: catIcon(c.id), stage: st ? st.id : null, stageLabel: st ? st.label : '' };
    });
    out.push({ id: '_none', label: 'Not sorted yet', icon: catIcon('_none'), stage: null, stageLabel: '' });
    return out;
  }
  /* Tools that two or more projects are built with (not the ones nearly everything uses): flags and Connections. */
  function sharedTools(list) {
    var ix = index(list), ev = Object.create(null), out = Object.create(null);
    (ix.everywhere || []).forEach(function (n) { ev[n] = 1; });
    Object.keys(ix['with'] || {}).filter(function (n) { return !ev[n] && ix['with'][n].length >= 2; })
      .sort(function (a, b) { return ix['with'][b].length - ix['with'][a].length || a.localeCompare(b); }).slice(0, 10)
      .forEach(function (n) { out[n] = ix['with'][n].length; });
    return out;
  }
  function cityPlatforms(list) {
    var s = sharedTools(list);
    return Object.keys(s).map(function (n) { return { id: n, label: n }; });
  }
  /* Live sites: one island per live address host. */
  function citySites(list) {
    var live = index(list).live || {};
    return Object.keys(live).sort(function (a, b) { return live[b].length - live[a].length || a.localeCompare(b); })
      .map(function (k) { return { id: k, name: k, count: live[k].length }; });
  }
  /* A file's contents for the City's props (fonts, SVGs, pictures): through the viewer's own access.
     By path first (public repos come from raw.githubusercontent.com, so a signed-out visitor spends no
     API requests); by blob sha through the API when the path is not a plain one. Kept per session. */
  function cityBlob(key, sha, path) {
    var id = key + ':' + (path || sha);
    if (blobs[id]) return blobs[id];
    var p;
    if (path && GH.safePath && GH.safePath(path)) p = GH.fileBlob(key, path).then(function (b) { return b.arrayBuffer(); });
    else if (sha && /^[0-9a-f]{40,64}$/i.test(sha) && GH.api && GH.hasToken) {
      p = GH.api('/repos/' + OWNER + '/' + enc(key) + '/git/blobs/' + sha, { headers: { Accept: 'application/vnd.github.raw+json' } })
        .then(function (r) { return r.ok ? r.arrayBuffer() : null; });
    } else return Promise.resolve(null);
    return (blobs[id] = track('files', p.catch(function () { return null; })));
  }
  /* What rises over a demo building: the project's own picture, never the demo itself. Pointing
     must never run a page; the demo runs only from Try the demo, in the hub's sealed frame. */
  function cityPreviewPic(key) {
    if (previews[key]) return previews[key];
    var info = byName(key); if (!info) return Promise.resolve(null);
    var pic = info.cover || (info.gallery && info.gallery[0] && info.gallery[0].src) || '';
    return (previews[key] = pic && HWX.image ? HWX.image(info.repo, pic, 'files').then(function (u) { return { img: u }; }, function () { return null; }) : Promise.resolve(null));
  }
  function filesOf(t) { return ((t && t.items) || []).filter(function (n) { return n.type === 'blob'; }).map(function (n) { return { p: n.path, s: n.size || 0, h: n.sha || null }; }); }
  function cityTree(name) { return track('files', GH.tree(name)).then(filesOf); }
  /* Signed in: every project's file list, twelve at a time; each block fills in as its list lands.
     Signed out: none (GitHub allows 60 requests an hour), so blocks show only what needs no files. */
  function loadTrees(items) {
    if (!city) return;
    var q = items.filter(function (it) { return !it.retired && !treesAsked[it.key]; });
    q.forEach(function (it) { treesAsked[it.key] = 1; });
    var empty = function (it) { var r = GH.findRepo && GH.findRepo(it.key); return !!(r && !r.size); };   /* GitHub has no tree for an empty repo */
    if (!GH.hasToken) { q.forEach(function (it) { city.addFiles(it.key, []); }); return; }
    q = q.filter(function (it) { if (!empty(it)) return true; city.addFiles(it.key, []); return false; });
    var i = 0;
    function next() {
      if (i >= q.length || !city) return;
      var it = q[i++];
      cityTree(it.key).then(function (files) { if (city) city.addFiles(it.key, files); }, function () { if (city) city.addFiles(it.key, []); }).then(next);
    }
    for (var k = 0; k < 12; k++) next();
  }
  function cityFilter(list) {
    var q = HWX.q || '';
    if (!q || q.length < 2) return null;
    var set = Object.create(null); list.forEach(function (i) { if (matches(i, q)) set[i.repo.name] = 1; });
    return set;
  }

  /* ---------------- the bot over the City ----------------
     One mascot for the session. It swims the line in strokes (its route and light trail are the City's; each stroke's direction
     comes with the anchor so his eyes can lead it), swims to what you select with the
     jellyfish pulse (gather, one long push that carries a little past, a soft settle), eyes leading,
     then looks at it. Under reduced motion it is still and every move is a cut. */
  var bot = { wrap: null, m: null, p: null, x: 0, y: 0, placed: false, kind: null, target: null, swim: null, raf: 0, seen: false };
  function botSize() { return bot.wrap ? (bot.wrap.offsetWidth || 96) : 96; }
  function botWrap() {
    if (bot.wrap) return bot.wrap;
    var w = document.createElement('div');
    w.className = 'hwc-bot'; w.setAttribute('aria-hidden', 'true');
    w.innerHTML = '<div class="hwc-bot-in"></div>';
    bot.wrap = w;
    return w;
  }
  function ensureGsap() {
    if (window.gsap) return Promise.resolve(window.gsap);
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = new URL('assets/vendor/gsap-3.12.5.min.js', document.baseURI).href;
      s.onload = function () { window.gsap ? res(window.gsap) : rej(new Error('GSAP did not load')); };
      s.onerror = function () { rej(new Error('GSAP did not load')); };
      document.head.appendChild(s);
    });
  }
  function ensureMascotCss() {
    if ($('link[href*="mascot/mascot.css"]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('assets/mascot/mascot.css', document.baseURI).href;
    document.head.appendChild(l);
  }
  function makeBot() {
    if (bot.p) return bot.p;
    ensureMascotCss();
    bot.p = ensureGsap().then(function () { return import(new URL('assets/mascot/index.js', document.baseURI).href); }).then(function (M) {
      var el = $('.hwc-bot-in', botWrap());
      var m = new M.Mascot({ mount: el, character: M.helloworld, mood: reduced() ? 'still' : 'calm' });
      ['--m-eye', '--m-type', '--m-accent'].forEach(function (p) { el.style.setProperty(p, 'var(--accent)'); });
      bot.m = m;
      return m;
    }).catch(function (e) { console.warn('City: the bot could not start', e); return null; });
    return bot.p;
  }
  function play(seq) { if (bot.m && !reduced()) { try { bot.m.play(seq); } catch (e) {} } }
  var narr = { on: false, t: null };
  function narrate(on) {
    clearTimeout(narr.t);
    narr.on = on;
    if (!on || reduced()) return;
    var BUSY = ['scan', 'thinking', 'working', 'look'], i = 0;
    (function step() { if (!narr.on) return; makeBot().then(function () { play(BUSY[i++ % BUSY.length]); }); narr.t = setTimeout(step, 2400 + Math.random() * 1600); })();
  }
  function placeBot(stage) {
    var w = botWrap();
    if (w.parentNode !== stage) stage.appendChild(w);
    makeBot();
  }
  function stageBox() { var s = $('#hwc-stage'); return s ? { w: s.clientWidth, h: s.clientHeight } : { w: 0, h: 0 }; }
  /* Where the bot should be, in stage pixels, from the City's anchor. */
  function botTarget() {
    var b = stageBox(), s = botSize(), a = bot.target, x, y;
    if (!b.w) return null;
    if (bot.kind === '3d' && !bot.boot) return null;                                   /* he is in the world */
    if (bot.boot) { x = b.w / 2; y = b.h / 2 - s / 2 - 48; }                           /* over the sentence while the City is built, or cannot be */
    else if (!a) { x = b.w - s / 2 - 28; y = s / 2 + 78; }                              /* at rest, in the light's corner */
    else if (a.kind === 'car') { x = a.x; y = a.y; }                                      /* flying the line: the trail starts under him */
    else {
      x = a.x; y = a.y - s / 2 - 34;                                                  /* just above the label, looking down at it */
      if (y < s / 2 + 8) { y = Math.max(s / 2 + 8, a.y); x = a.x + (a.x < b.w / 2 ? 1 : -1) * (s / 2 + 110); }   /* no room above: beside it */
    }
    return { x: Math.max(s / 2 + 8, Math.min(b.w - s / 2 - 8, x)), y: Math.max(s / 2 + 8, Math.min(b.h - s / 2 - 8, y)) };
  }
  function botDraw() {
    if (!bot.wrap) return;
    var s = botSize();
    bot.wrap.style.transform = 'translate3d(' + (bot.x - s / 2).toFixed(1) + 'px,' + (bot.y - s / 2).toFixed(1) + 'px,0)';
  }
  /* The pulse (same curve as the camera's, with a little more carry). */
  function pulse(t, a) {
    a = a == null ? 0.03 : a;
    if (t <= 0) return 0; if (t >= 1) return 1;
    var g = 0.12, p = 0.6, k;
    if (t < g) return -a * (1 - Math.cos((t / g) * Math.PI / 2));
    if (t < g + p) { k = (t - g) / p; return -a + (1 + 2 * a) * (1 - Math.pow(1 - k, 3)); }
    k = (t - g - p) / (1 - g - p);
    return 1 + a - a * (0.5 - 0.5 * Math.cos(k * Math.PI));
  }
  function botSwim() {
    var to = botTarget(); if (!to) return;
    if (!bot.placed || reduced()) { bot.x = to.x; bot.y = to.y; bot.placed = true; bot.swim = null; botDraw(); return; }
    var dx = to.x - bot.x, dy = to.y - bot.y, dist = Math.hypot(dx, dy);
    if (dist < 4) { bot.swim = null; return; }
    var ms = Math.min(4200, 2700 + dist * 1.6);
    bot.swim = { fx: bot.x, fy: bot.y, t0: performance.now(), ms: ms };
    /* eyes lead toward where he is going, and the whole bot tips a little that way, then both drift back */
    if (bot.m && window.gsap) {
      var ux = dx / (dist || 1), uy = dy / (dist || 1), k = Math.min(1, dist / 260), T = ms / 1000;
      gsap.timeline().to(bot.m.EYE, { xPercent: ux * 22 * k, yPercent: uy * 13 * k, duration: T * 0.32, ease: 'power2.out' })
        .to(bot.m.EYE, { xPercent: 0, yPercent: 0, duration: T * 0.68, ease: 'sine.inOut' });
      gsap.timeline().to(bot.m.bot, { rotation: ux * 3 * k, duration: T * 0.32, ease: 'power2.out' })
        .to(bot.m.bot, { rotation: 0, duration: T * 0.68, ease: 'sine.inOut' });
    }
    if (!bot.raf) bot.raf = requestAnimationFrame(botStep);
  }
  function botStep() {
    bot.raf = 0;
    var sw = bot.swim, to = botTarget();
    if (!sw || !to) return;
    var k = Math.min(1, (performance.now() - sw.t0) / sw.ms), e = pulse(k, 0.03);
    bot.x = sw.fx + (to.x - sw.fx) * e; bot.y = sw.fy + (to.y - sw.fy) * e;
    botDraw();
    if (k >= 1) {
      bot.swim = null;
      if (bot.kind === 'focus' && bot.m && window.gsap && !reduced()) {      /* he settles and looks down at it */
        gsap.timeline().to(bot.m.EYE, { yPercent: 12, xPercent: 0, duration: 0.45, ease: 'back.out(2)' })
          .to(bot.m.EYE, { yPercent: 0, duration: 0.7, ease: 'sine.inOut' }, '+=1.4');
      }
      return;
    }
    bot.raf = requestAnimationFrame(botStep);
  }
  /* The City says where its anchor is (every frame it moves). A change of what he is following
     starts a swim; otherwise he stays with it. */
  function onAnchor(a) {
    if (!bot.wrap) return;
    /* Across the whole City the bot lives in the world, in 3D (hwc-city.js _makeBot): this flat one
       steps aside. Inside a project he is still drawn here. */
    var in3d = !!(a && a.kind === '3d');
    bot.wrap.classList.toggle('is-3d', in3d);
    if (in3d) { bot.kind = '3d'; bot.target = null; bot.swim = null; return; }
    if (bot.boot) { bot.target = a; bot.kind = a ? a.kind : null; return; }
    var kind = a ? a.kind : null;
    if (a && !a.front) return;                         /* behind the camera: stay where he is */
    var was = bot.kind;
    bot.target = a; bot.kind = kind;
    if (kind !== was) { botSwim(); return; }
    if (bot.swim) return;                              /* the swim reads the moving target each frame */
    var to = botTarget(); if (!to) return;
    if (kind === 'focus' && Math.hypot(to.x - bot.x, to.y - bot.y) > 160 && !a.flying) { botSwim(); return; }
    bot.x = to.x; bot.y = to.y; botDraw();
  }
  function botShow(on) { if (bot.wrap) bot.wrap.classList.toggle('is-off', !on); }

  /* ---------------- the #/city view ---------------- */
  HWX.views.city = function (items, r) {
    var coarse = matchMedia('(pointer: coarse)').matches, full = document.body.classList.contains('hwc-full');
    var head = UI().viewHead ? UI().viewHead(r || route(), 'Every project as a building', 'The City',
      'Each building is one project. Its shape shows the kind of project and its height shows how much code it holds. Districts group the projects by category, in the order work moves from idea to live. Select a building to find out more.')
      : '<div class="hwc-head"><h1>The City</h1><p class="hwc-lede">Each building is one project. Districts group the projects by category, in order from idea to live.</p></div>';
    return head + '<section class="hwc-sec" aria-label="The City">' +
      '<div class="hwc-stage" id="hwc-stage">' +
        '<div class="hwc-slot" id="hwc-slot"></div>' +
        '<div class="hwc-boot" id="hwc-boot" role="status"><b>Building the City</b><span>Laying out ' + plural(items.length, 'project') + '</span></div>' +
        '<div class="hwc-topwrap"><div class="hwc-top" id="hwc-top"></div>' +
          '<button type="button" class="hwc-btn hwc-listbtn" data-hwc="list" aria-expanded="' + listOpen + '" aria-controls="hwc-list">' + I('list') + '<span>Projects list</span></button></div>' +
        '<nav class="hwc-list" id="hwc-list" aria-label="Projects in the City"' + (listOpen ? '' : ' hidden') + '></nav>' +
        '<div class="hwc-find" id="hwc-find" role="search">' + I('search') + '<input id="hwc-q" type="search" autocomplete="off" spellcheck="false" placeholder="Search the City" aria-label="Search the City: projects, fonts, statues, pictures and files" aria-controls="hwc-res" aria-expanded="false" value="' + esc(HWX.q || '') + '"><div class="hwc-res" id="hwc-res" role="listbox" aria-label="Found in the City" hidden></div></div>' +
        '<div class="hwc-tours" id="hwc-tours" role="menu" aria-label="Tours" hidden></div>' +
        '<div class="hwc-tourbar" id="hwc-tourbar" aria-live="polite" hidden></div>' +
        '<aside class="hwc-panel" id="hwc-panel" aria-live="polite" hidden></aside>' +
        '<div class="hwc-key" id="hwc-key"></div>' +
        '<div class="hwc-ctrl">' +
          '<div class="hwc-zoom" role="group" aria-label="Zoom"><button type="button" data-hwc="zoomin" aria-label="Zoom in">' + I('plus') + '</button><button type="button" data-hwc="zoomout" aria-label="Zoom out">' + I('minus') + '</button></div>' +
          '<button type="button" class="hwc-btn" data-hwc="tours" aria-expanded="false" aria-controls="hwc-tours">' + I('tours') + '<span>Tours</span></button>' +
          '<button type="button" class="hwc-btn" data-hwc="full" aria-pressed="' + full + '">' + I('full') + '<span>' + (full ? 'Exit full screen' : 'Full screen') + '</span></button>' +
          '<button type="button" class="hwc-btn" data-hwc="reset">' + I('reset') + '<span>Reset view</span></button>' +
          '<button type="button" class="hwc-btn" id="hwc-links" data-hwc="links" aria-pressed="' + cityLinks + '">' + I('links') + '<span>Connections</span></button>' +
          (coarse ? '' : '<button type="button" class="hwc-btn" data-hwc="walk">' + I('walk') + '<span>Walk the streets</span></button>') +
        '</div>' +
        '<div class="hwc-walk" id="hwc-walk" hidden><b>Walking</b> Use W, A, S and D or the arrow keys to move, and the mouse to look. Hold Shift to run. Press Esc to stop.</div>' +
        '<p class="hwc-help">' + (coarse ? 'Drag to turn the City. Pinch to zoom.' : 'Drag to turn the City. Right-drag to move it. Hold Ctrl and scroll to zoom.') + '</p>' +
      '</div>' +
      '<p class="hwc-alt">Prefer a list? The <button type="button" class="hwc-text" data-hwc="list">Projects list</button> on the stage, <a href="' + href('map') + '">the map</a> and <a href="' + href('all') + '">All projects</a> show the same projects.' +
      (GH.hasToken ? '' : ' Signed out, the City shows each project’s main building and its pictures, not its files. <button type="button" class="hwc-text" data-hwc="signin">Sign in</button> to see the files.') + '</p></section>';
  };

  function boot(title, sub, show) {
    var b = $('#hwc-boot'); if (!b) return;
    var stage = $('#hwc-stage');
    if (!show) { b.hidden = true; narrate(false); if (stage) stage.classList.remove('is-boot'); if (bot.boot) { bot.boot = false; botSwim(); } return; }
    b.hidden = false; b.classList.remove('is-fail');
    b.innerHTML = '<b>' + esc(title) + '</b><span>' + esc(sub) + '</span>';
    if (stage) stage.classList.add('is-boot');
    bot.boot = true; bot.placed = false; makeBot().then(function () { botSwim(); });
    narrate(true);
  }
  function noGL() {
    var b = $('#hwc-boot'); if (!b) return;
    narrate(false);
    b.hidden = false; b.classList.add('is-fail');
    var stg = $('#hwc-stage'); if (stg) stg.classList.add('is-boot');
    bot.boot = true; bot.placed = false;
    b.innerHTML = '<b>This browser cannot show the 3D City</b><span>The <a href="' + href('map') + '">map</a> and <a href="' + href('all') + '">All projects</a> show the same projects.</span>';
    $$('.hwc-ctrl, .hwc-find, .hwc-topwrap, .hwc-key, .hwc-help', $('#hwc-stage')).forEach(function (el) { el.hidden = true; });
    makeBot().then(function () { botSwim(); setTimeout(function () { play('notfound'); }, 400); });
  }

  HWX.after.city = function (items, r) {
    var stage = $('#hwc-stage'); if (!stage) return;
    r = r || route();
    placeBot(stage); botShow(true);
    if (cityFail) { noGL(); return; }
    if (!GH.state.detailsReady) { boot('Building the City', 'Reading the details of ' + plural(items.length, 'project'), true); return; }
    loadModule().then(function (m) {
      var slot = $('#hwc-slot'); if (!slot || !slot.isConnected) return;     /* left the view meanwhile */
      if (!ensureCity(m)) { noGL(); return; }
      slideOn = false;
      slot.appendChild(hostEl());
      city.setInteractive(true);
      city.attach();
      city.setFull(document.body.classList.contains('hwc-full'));
      var list = cityItems(items);
      var rebuilt = city.setProjects(list, cityHoods(), cityPlatforms(items), citySites(items));
      loadTrees(list);
      city.setLinks(cityLinks);
      if (city.level.kind === 'estate') city.setFilter(cityFilter(items));
      var wasBooting = !$('#hwc-boot').hidden;
      boot('', '', false);
      if (wasBooting) setTimeout(function () { play('found'); }, 300);
      var want = r.params['in'] || '';
      if (want !== cityIn) {
        cityIn = want;
        if (want && city.level.repo !== want) cityInside(want);
        else if (!want && city.level.kind !== 'estate') city.home();
      }
      if (!rebuilt) { cityLevel(city.crumbs(), city._summary(), city.level); cityPanel(lastSel); cityTourBar(lastTour); }
      renderList(items);
      var inp = $('#hwc-q'); if (inp && HWX.q) citySearch(HWX.q);
      onAnchor(city._lastAnchor || null);
    }).catch(function (e) { console.warn('The City could not load:', e); cityFail = true; noGL(); });
  };

  /* The City in a slide (the project page hero) or in Discover's card. slot null: take it out. */
  HWX.citySlide = function (slot, name, opts) {
    opts = opts || {};
    if (!slot) {
      if (host && host.parentNode && slideOn) { host.remove(); if (city) city._sync(); }
      slideOn = false;
      return;
    }
    if (cityFail) { slot.classList.add('hwc-nogl'); var w = $('.hwx-slide-wait', slot); if (w) w.textContent = 'This browser cannot show the 3D City.'; return; }
    if (!GH.state.detailsReady) return;                 /* the page draws again once every project's details are in */
    loadModule().then(function (m) {
      if (!slot.isConnected) return;
      if (!ensureCity(m)) { slot.classList.add('hwc-nogl'); return; }
      slot.classList.add(opts.preview ? 'hwc-in-preview' : 'hwc-in-slide');
      var h = hostEl();
      if (h.parentNode !== slot) { h.classList.add('is-fresh'); slot.appendChild(h); requestAnimationFrame(function () { requestAnimationFrame(function () { h.classList.remove('is-fresh'); }); }); }
      slideOn = true;
      city.setInteractive(!opts.preview);
      city.setFull(false);
      city.attach();
      var items = listAll();
      var list = cityItems(items);
      city.setProjects(list, cityHoods(), cityPlatforms(items), citySites(items));
      if (!opts.preview) loadTrees(list);
      city.setFilter(null);
      if (name) { if (city.level.repo !== name) { cityIn = name; cityInside(name); } }
      else if (city.level.kind !== 'estate') { cityIn = ''; city.home(); }
      var wt = $('.hwx-slide-wait', slot); if (wt) wt.remove();
    }).catch(function (e) { console.warn('The City could not load:', e); cityFail = true; });
  };
  /* Discover's City card: the whole City, watching only, once the card is on screen. */
  HWX.cityPreview = function (slot) {
    if (!slot || !window.WebGLRenderingContext || cityFail) return;
    if (!('IntersectionObserver' in window)) { HWX.citySlide(slot, null, { preview: true }); return; }
    var io = new IntersectionObserver(function (es) {
      if (!es.some(function (e) { return e.isIntersecting; })) return;
      io.disconnect();
      if (slot.isConnected && !inCity()) HWX.citySlide(slot, null, { preview: true });
    }, { rootMargin: '120px' });
    io.observe(slot);
  };

  /* ---------------- the stage's parts ---------------- */
  function cityInside(name) {
    var info = byName(name); if (!info || !city || busy) return;
    busy = true;
    if (!slideOn) boot('Opening ' + info.name, 'Reading the list of files', true);
    track('files', GH.tree(info.repo.name)).then(function (t) {
      busy = false; boot('', '', false);
      var files = filesOf(t);
      if (!files.length) { toast('This project has no files to show yet.'); return; }
      city.enterProject(info.repo.name, files, info.name);
      if (!slideOn) play('found');
    }).catch(function (e) {
      busy = false; boot('', '', false);
      console.warn('City: could not read the files of ' + name, e);
      var limit = GH.RateLimit && e instanceof GH.RateLimit;
      toast(limit ? 'GitHub’s limit for signed-out visitors is reached. Sign in, or try again later.' : 'The files of this project could not be read. Try again in a minute.', 'warn');
      if (!slideOn) play('notfound');
    });
  }
  function glyph(family) {
    var d = mod && mod.KEY_GLYPH[family];
    return d ? '<svg class="hwc-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="currentColor"/></svg>' : '';
  }
  function sym(paths, cls) { return '<svg class="hwc-glyph' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + paths + '</svg>'; }
  function cityKey(level) {
    var el = $('#hwc-key'); if (!el || !mod) return;
    var rows = '', row = function (icon, b, t) { return '<li>' + icon + '<span><b>' + esc(b) + '</b> ' + esc(t) + '</span></li>'; };
    if (level.kind === 'estate') {
      var forms = Object.create(null);
      cityItems(listAll()).forEach(function (it) { if (!it.retired) (forms[it.form] = forms[it.form] || []).push(it.kind); });
      var kinds = HWX.KINDS || [];
      rows = '<li class="hwc-keyh">Each project’s main building</li>' +
        Object.keys(mod.FORM).filter(function (f) { return forms[f]; }).map(function (f) {
          var names = kinds.filter(function (k) { return k.form === f && forms[f].indexOf(k.id) >= 0; }).map(function (k) { return k.plural.toLowerCase(); });
          return row(glyph(f), mod.FORM[f].label + ':', names.join(', ') || 'projects');
        }).join('') +
        '<li class="hwc-keynote"><span>Height shows how much code it holds.</span></li>' +
        '<li class="hwc-keyh">On and round it</li>' +
        row(sym('<rect x="7" y="5" width="4" height="10" rx="2" fill="var(--accent)"/><rect x="13" y="5" width="4" height="10" rx="2" fill="var(--accent)"/><rect x="5" y="17" width="14" height="3" rx="1.5" fill="currentColor"/>'), 'Two violet eyes on the roof:', 'live') +
        row(sym('<rect x="6" y="3" width="12" height="18" rx="6" fill="currentColor" opacity=".35"/><path d="M6 9a6 6 0 0 1 12 0Z" fill="var(--accent)"/>'), 'A violet cap:', 'the project you selected or point at') +
        row(sym('<ellipse cx="12" cy="12" rx="9" ry="4" fill="none" stroke="var(--accent)" stroke-width="2.2"/>'), 'A ring on the roof:', 'in progress (paler: an experiment)') +
        row(sym('<path d="M5 22h3V5H5zM3 5h18V3H3zM17 5v8h1V5zM15.5 13h4v2h-4z" fill="currentColor"/>'), 'A crane:', 'work in progress') +
        row(sym('<rect x="6" y="8" width="12" height="13" rx="3" fill="currentColor" opacity=".35"/>'), 'Grey and lower:', 'paused') +
        row(sym('<path d="M3 21h18v-2H3zM5 19h3v-7a1.5 1.5 0 0 0-3 0zM10.5 19h3v-4a1.5 1.5 0 0 0-3 0zM16 19h3V9a1.5 1.5 0 0 0-3 0z" fill="currentColor"/>'), 'Ruins:', 'retired projects') +
        row(sym('<rect x="6" y="11" width="12" height="9" rx="2" fill="currentColor"/><path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" fill="none" stroke="currentColor" stroke-width="2"/>'), 'A small lock:', 'a private repo') +
        row(sym('<circle cx="12" cy="11" r="7" fill="currentColor" opacity=".3"/><path d="M10 8v6l5-3z" fill="currentColor"/><rect x="11" y="18" width="2" height="4" rx="1" fill="currentColor"/>'), 'A play sign:', 'a demo to try: point at the building for a preview') +
        row(glyph('monolith'), 'Smaller buildings:', 'its biggest files') +
        row(sym('<path d="M6 21h12v-2H6zM8 19h8V7H8zM6 7h12V5H6z" fill="currentColor"/>'), 'Columns:', 'font files, carved in that font') +
        row(sym('<path d="M7 22h10v-3H7zM9 19h6v-2H9zM12 3.5a2.2 2.2 0 1 0 0 4.4a2.2 2.2 0 1 0 0-4.4zM9 9h6l1.2 8H7.8z" fill="currentColor"/>'), 'Statues:', 'its SVG pictures and its icon') +
        row(sym('<circle cx="8" cy="10" r="4" fill="currentColor"/><circle cx="16" cy="12" r="3.4" fill="currentColor"/><path d="M7 14h2v6H7zM15 15h2v5h-2zM3 20h18v2H3z" fill="currentColor"/>'), 'Gardens:', 'a tree for each test, pictures carved in stone') +
        row(sym('<rect x="3" y="4" width="18" height="11" rx="2" fill="currentColor" opacity=".35"/><path d="M7 15v6M17 15v6" stroke="currentColor" stroke-width="2"/>'), 'A billboard:', 'its cover picture') +
        row(sym('<path d="M5 2h2v20H5zM7 3h11l-3 4 3 4H7z" fill="currentColor"/>'), 'Flags:', 'tools it is built with that other projects use too') +
        row(sym('<circle cx="12" cy="9" r="5.5" fill="currentColor"/><rect x="11" y="13" width="2" height="9" rx="1" fill="currentColor"/>'), 'A tree by the door:', 'it has step-by-step guides') +
        '<li class="hwc-keyh">Life in the City</li>' +
        row(sym('<circle cx="12" cy="5" r="2.6" fill="currentColor"/><rect x="9" y="9" width="6" height="12" rx="3" fill="currentColor"/>'), 'People:', 'a change made in the last 30 days') +
        row(sym('<path d="M2 9c3 0 5.5 1.2 7 3.2C10.5 10.2 13 9 16 9c-2.4 1.1-4.7 3.4-7 6.6C6.7 12.4 4.4 10.1 2 9z" fill="currentColor"/>'), 'Birds:', 'open issues and pull requests') +
        row(sym('<path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 9.2A4.4 4.4 0 0 0 7 18z" fill="currentColor" opacity=".45"/>'), 'A cloud:', 'nobody has changed it for a year') +
        row(sym('<path d="M3 16h18l-2.5 4h-13z" fill="currentColor"/><rect x="9" y="11" width="6" height="4" rx="1.5" fill="currentColor" opacity=".5"/>'), 'Ferries:', 'projects with a live site') +
        '<li class="hwc-keyh">Round the City</li>' +
        row(sym('<path d="M2 17c5-1 8-7 13-9" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" opacity=".35"/><path d="M9 13.4c2.4-1.9 4-4.1 6-5.4" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" opacity=".8"/><rect x="15" y="4" width="7" height="7" rx="3.5" fill="currentColor"/>'), 'The HelloWorld line:', 'the bot swims from district to district, idea to live, with a light trail behind him') +
        row(sym('<ellipse cx="12" cy="19" rx="9" ry="3" fill="currentColor" opacity=".3"/><rect x="10" y="5" width="4" height="13" rx="2" fill="currentColor"/><circle cx="12" cy="5" r="2.4" fill="var(--accent)"/>'), 'Small islands:', 'the live sites, one for each address') +
        '<li class="hwc-keynote"><span>Districts: one for each category, told apart by place and name, not by colour. Violet means live, selected or now.</span></li>' +
        (GH.hasToken ? '' : '<li class="hwc-keynote"><span>Signed out, blocks show only what needs no files: the cover and the icon.</span></li>');
    } else {
      rows = mod.KEY.map(function (k) { return '<li>' + glyph(k.arch) + '<span><b>' + esc(k.label) + '</b></span></li>'; }).join('') +
        '<li class="hwc-keynote"><span>Each building is one file. Taller buildings are bigger files. Blocks are folders. Fonts are columns, SVG pictures are statues and pictures are carved stones.</span></li>';
    }
    var was = $('details', el), open = was ? was.open : keyOpen;     /* folded at first: it is long, and the City is the point */
    el.innerHTML = '<details' + (open ? ' open' : '') + '><summary>' + I('key') + 'Key: what you are looking at</summary><ul>' + rows + '</ul></details>';
  }
  function cityLevel(crumbs, summary, level) {
    lastLevel = level;
    var el = $('#hwc-top');
    if (el) {
      el.innerHTML = '<div class="hwc-crumbs">' + crumbs.map(function (c, i) {
        return i < crumbs.length - 1 ? '<button type="button" data-hwc="crumb" data-i="' + i + '">' + esc(c.label) + '</button><span class="sep" aria-hidden="true">' + I('right') + '</span>' : '<b>' + esc(c.label) + '</b>';
      }).join('') + '</div><div class="hwc-sum">' + esc(summary) + '</div>' +
        (level.kind !== 'estate' ? '<button type="button" class="hwc-btn hwc-up" data-hwc="up">' + I('left') + '<span>' + (level.kind === 'repo' ? 'Back to the City' : 'Up one folder') + '</span></button>' : '');
    }
    var lk = $('#hwc-links'); if (lk) lk.hidden = level.kind !== 'estate';
    cityKey(level);
    var r = route();
    if (r.view === 'city' && !busy && cityIn !== null && !slideOn) {
      var want = level.kind === 'estate' ? '' : level.repo;
      cityIn = want;
      if ((r.params['in'] || '') !== want) history.replaceState(null, '', href('city', want ? { 'in': want } : null));
    }
  }
  function catTag(info) { return '<span class="hwc-cat">' + esc(catOf(info.category).label) + '</span>'; }
  function statusLine(info) {
    var bits = [], st = info.status ? statusText(info.status) : '';
    if (st) bits.push('<span class="hwc-status is-' + esc(info.status) + '"><i aria-hidden="true"></i>' + esc(st) + '</span>');
    if (info.private) bits.push('<span class="hwc-badge">' + I('lock') + 'Private</span>');
    var d = info.last && info.last.date, ago = d && SH() && SH().ago ? SH().ago(d) : '';
    if (ago) bits.push('<span class="hwc-when">Updated ' + esc(ago) + '</span>');
    return bits.length ? '<div class="hwc-cp-st">' + bits.join('') + '</div>' : '';
  }
  function cityPanel(sel) {
    lastSel = sel;
    var el = $('#hwc-panel'); if (!el) return;
    var html = '';
    if (sel && sel.type === 'project') {
      var info = byName(sel.key);
      if (info) {
        var tools = (info.built_with || []).slice(0, 3).map(function (w) { return '<a class="hwc-pill" href="' + href('with/' + enc(w)) + '">' + esc(w) + '</a>'; }).join('');
        html = catTag(info) + '<h3 class="hwc-cp-t">' + esc(info.name) + '</h3>' +
          (info.tagline ? '<p class="hwc-cp-s">' + esc(info.tagline) + '</p>' : '') + statusLine(info) +
          '<div class="hwc-cp-pills"><span class="hwc-pill is-kind">' + esc(info.kindLabel || 'Project') + '</span>' + tools + '</div>' +
          '<div class="hwc-cp-act"><a class="hwc-primary" href="' + href('p/' + enc(info.repo.name)) + '">Open the project page' + I('arrow') + '</a>' +
          (info.demo ? '<button type="button" class="hwc-text" data-hwc="demo" data-repo="' + esc(info.repo.name) + '">' + I('play') + 'Try the demo</button>' : '') +
          '<button type="button" class="hwc-text" data-hwc="inside" data-repo="' + esc(info.repo.name) + '">' + I('folder') + 'Look inside</button>' +
          (info.live_url ? '<a class="hwc-text" href="' + esc(info.live_url) + '" target="_blank" rel="noopener noreferrer">' + I('ext') + 'Open the live site</a>' : '') + '</div>' +
          '<p class="hwc-cp-note">Look inside shows each file in the project as a building.</p>';
      }
    } else if (sel && sel.type === 'hood') {
      var c = catOf(sel.id), st = stageOf(sel.id);
      var items = friendly(listAll().filter(function (i) { return (i.category || '_none') === sel.id; }));
      html = '<span class="hwc-cat">' + esc(st ? 'Idea to live: ' + st.label : 'District') + '</span><h3 class="hwc-cp-t">' + esc(c.label) + '</h3>' +
        (c.blurb ? '<p class="hwc-cp-s">' + esc(c.blurb) + '</p>' : '') +
        '<div class="hwc-cp-list">' + items.map(function (i) { return '<button type="button" class="hwc-row" data-hwc="select" data-repo="' + esc(i.repo.name) + '"><span><b>' + esc(i.name) + '</b><small>' + esc(i.kindLabel || 'Project') + '</small></span>' + I('right') + '</button>'; }).join('') + '</div>' +
        (sel.id !== '_none' ? '<div class="hwc-cp-act"><a class="hwc-text" href="' + href('cat/' + enc(sel.id)) + '">See them as cards' + I('arrow') + '</a></div>' : '');
    } else if (sel && sel.type === 'file') {
      var fi = byName(sel.repo);
      var url = fi ? fi.repo.html_url + '/blob/' + enc(fi.repo.default_branch || 'main') + '/' + sel.path.split('/').map(enc).join('/') : '';
      html = '<span class="hwc-cat">' + esc(sel.typeLabel) + ' file · ' + esc(sel.sizeText) + '</span><h3 class="hwc-cp-t hwc-cp-file">' + esc(sel.name) + '</h3>' +
        '<p class="hwc-cp-s hwc-cp-path">' + esc(sel.path) + '</p>' +
        (url ? '<div class="hwc-cp-act"><a class="hwc-primary" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Open the file on GitHub' + I('ext') + '</a></div>' : '');
    }
    var stage = $('#hwc-stage'); if (stage) stage.classList.toggle('has-panel', !!html);
    if (city) city.setInset(html && matchMedia('(max-width: 760px)').matches ? 0.5 : 0);
    $$('#hwc-list [data-repo]').forEach(function (b) { b.setAttribute('aria-current', String(!!(sel && sel.type === 'project' && b.getAttribute('data-repo') === sel.key))); });
    if (!html) { el.hidden = true; el.innerHTML = ''; return; }
    el.innerHTML = '<button type="button" class="hwc-x" data-hwc="close" aria-label="Close">' + I('close') + '</button>' + html;
    el.hidden = false;
  }
  /* The Projects list: every project in the City as a button, by district: the keyboard and
     screen-reader way in (the 3D stage itself is hidden from assistive technology). */
  function describe(i) {
    var bits = [i.name, catOf(i.category).label, i.kindLabel];
    if (i.status) bits.push(statusText(i.status));
    if (i.demo) bits.push('has a demo');
    if (i.live_url) bits.push('live site');
    if (i.private) bits.push('private');
    if (i.recent) bits.push(plural(i.recent, 'change') + ' in 30 days');
    return bits.filter(Boolean).join(', ');
  }
  function renderList(items) {
    var el = $('#hwc-list'); if (!el) return;
    items = items || listAll();
    var by = Object.create(null);
    items.forEach(function (i) { (by[i.category || '_none'] = by[i.category || '_none'] || []).push(i); });
    var html = '<div class="hwc-list-h"><h3>Projects</h3><span>' + items.length + '</span><button type="button" class="hwc-x" data-hwc="list" aria-label="Close the list">' + I('close') + '</button></div><div class="hwc-list-in">';
    cityHoods().forEach(function (h) {
      var g = by[h.id]; if (!g || !g.length) return;
      html += '<div class="hwc-list-g"><button type="button" class="hwc-list-d" data-hwc="hood" data-id="' + esc(h.id) + '"><span class="hwc-eb-pill" aria-hidden="true"></span>' + esc(h.label) + ' <small>' + g.length + '</small></button>';
      friendly(g).forEach(function (i) {
        html += '<button type="button" class="hwc-list-p" data-hwc="select" data-repo="' + esc(i.repo.name) + '" aria-label="' + esc(describe(i)) + '. Show it in the City." aria-current="false"><span>' + esc(i.name) + '</span>' +
          (i.demo ? '<i class="hwc-play" aria-hidden="true"></i>' : '') + ((i.status === 'live' || i.live_url) && i.status !== 'paused' ? '<i class="hwc-dot" aria-hidden="true"></i>' : '') + '</button>';
      });
      html += '</div>';
    });
    el.innerHTML = html + '</div>';
  }
  function listToggle(open) {
    var el = $('#hwc-list'); if (!el) return;
    listOpen = open === undefined ? el.hidden : !!open;
    el.hidden = !listOpen;
    $$('[data-hwc="list"][aria-controls]').forEach(function (b) { b.setAttribute('aria-expanded', String(listOpen)); });
    var stage = $('#hwc-stage'); if (stage) stage.classList.toggle('has-list', listOpen);
    if (listOpen) { renderList(); var f = $('.hwc-list-p, .hwc-list-d', el); if (f) f.focus(); }
  }

  var TOURS = [
    { id: 'line', label: 'Follow the bot on the HelloWorld line', text: 'From idea to live, district by district' },
    { id: 'demos', label: 'Demos to try', text: 'Each project with a demo, and its preview' },
    { id: 'sites', label: 'Live sites', text: 'Each live site, and what runs on it' },
    { id: 'sculptures', label: 'Statues and stones', text: 'Statues and pictures carved in stone, one after another' },
    { id: 'columns', label: 'Font columns', text: 'Every font file, carved in its own letters' },
    { id: 'gardens', label: 'Gardens', text: 'Projects with tests that check they work' },
    { id: 'clouds', label: 'Quiet for a year', text: 'Projects nobody has changed for over a year' },
    { id: 'ruins', label: 'Retired projects', text: 'Projects no longer in use' }
  ];
  function toursMenu(open) {
    var m = $('#hwc-tours'), b = $('[data-hwc="tours"]');
    if (!m || !city) return;
    if (open === undefined) open = m.hidden;
    if (b) b.setAttribute('aria-expanded', String(open));
    if (!open) { m.hidden = true; return; }
    var n = city.tourCounts();
    m.innerHTML = '<div class="hwc-tours-h">Take a tour</div>' + TOURS.map(function (t) {
      var c = n[t.id] || 0;
      return '<button type="button" role="menuitem" data-hwc="tour" data-tour="' + t.id + '"' + (c ? '' : ' disabled') + '><b>' + esc(t.label) + '<span>' + c + '</span></b><small>' + esc(c ? t.text : 'Nothing here yet') + '</small></button>';
    }).join('');
    m.hidden = false;
    var first = $('button:not([disabled])', m); if (first) first.focus();
  }
  function cityTourBar(st) {
    lastTour = st;
    var el = $('#hwc-tourbar'), stage = $('#hwc-stage');
    if (stage) stage.classList.toggle('touring', !!st);
    if (!el) return;
    if (!st) { el.hidden = true; el.innerHTML = ''; return; }
    var t = TOURS.filter(function (x) { return x.id === st.kind; })[0] || { label: 'Tour' };
    el.innerHTML = '<div class="hwc-tb-k">' + esc(t.label) + (st.ride ? '' : ' · ' + (st.i + 1) + ' of ' + st.n) + '</div>' +
      '<b>' + esc(st.title || '') + '</b>' + (st.kindLabel ? '<span class="hwc-tb-kind">' + esc(st.kindLabel) + '</span>' : '') +
      '<p>' + esc(st.text || '') + '</p><div class="hwc-tb-btns">' +
      (st.ride ? '' : '<button type="button" class="hwc-btn" data-hwc="tprev" aria-label="Back">' + I('left') + '</button><button type="button" class="hwc-btn" data-hwc="tpause">' + (st.paused ? 'Play' : 'Pause') + '</button><button type="button" class="hwc-btn" data-hwc="tnext" aria-label="Next">' + I('right') + '</button>') +
      (st.key && !st.ride ? '<a class="hwc-text" href="' + href('p/' + enc(st.key)) + '">Project page</a>' : '') +
      '<button type="button" class="hwc-btn hwc-tb-stop" data-hwc="tstop">' + (st.ride ? 'Get off' : 'End the tour') + '</button></div>';
    el.hidden = false;
  }

  /* ---------------- search the City ---------------- */
  var hits = [], scanQ = '', foundQ = '', settleT = null;
  function citySearch(q, opts) {
    q = String(q == null ? '' : q).trim();
    HWX.q = q;
    var res = $('#hwc-res'), inp = $('#hwc-q');
    if (inp && inp.value.trim() !== q && document.activeElement !== inp) inp.value = q;
    var nav = $('#hwx-q'); if (nav && nav.value.trim() !== q && document.activeElement !== nav) nav.value = q;
    var things = city && q.length >= 2 && city.level.kind === 'estate' ? city.searchThings(q) : (city && q.length >= 2 ? city.searchThings(q) : []);
    var items = listAll();
    if (city) {
      /* light the projects that match, and those whose fonts, statues, pictures or files match */
      var set = cityFilter(items);
      if (set) things.forEach(function (r) { if (r.main) set[r.main.item.key] = 1; });
      city.setFilter(set);
      if (opts && opts.frame) city.frameMatches();
    }
    var projects = q.length >= 2 ? friendly(items.filter(function (i) { return matches(i, q); })).slice(0, 6) : [];
    things = things.slice(0, 10);
    /* the bot scans while you type, and is found once when something matches */
    clearTimeout(settleT);
    if (q.length >= 2 && !reduced()) {
      if (!scanQ) { scanQ = q; play('scan'); }
      settleT = setTimeout(function () { scanQ = ''; if (q !== foundQ) { foundQ = q; play(projects.length || things.length ? 'found' : 'notfound'); } }, 900);
    } else { scanQ = ''; }
    if (!res) return;
    if (q.length < 2) { res.hidden = true; if (inp) inp.setAttribute('aria-expanded', 'false'); return; }
    hits = projects.map(function (i) { return { project: i }; }).concat(things.map(function (r) { return { thing: r }; }));
    res.innerHTML = (hits.length ? '' : '<div class="hwc-res-none">Nothing in the City matches. Try another word.</div>') +
      (projects.length ? '<div class="hwc-res-h">Projects</div>' : '') +
      hits.map(function (h, k) {
        if (h.project) return '<button type="button" role="option" data-hwc="hit" data-i="' + k + '"><span><b>' + esc(h.project.name) + '</b><small>' + esc(h.project.kindLabel || '') + '</small></span></button>';
        return (k === projects.length ? '<div class="hwc-res-h">In the City</div>' : '') +
          '<button type="button" role="option" data-hwc="hit" data-i="' + k + '"><span class="hwc-res-k">' + esc(h.thing.kindLabel || '') + '</span><span><b>' + esc(h.thing.title || '') + '</b><small>' + esc(h.thing.text || '') + '</small></span></button>';
      }).join('');
    res.hidden = false;
    if (inp) inp.setAttribute('aria-expanded', 'true');
    announce(hits.length ? plural(hits.length, 'match', 'matches') + ' in the City.' : 'Nothing in the City matches.');
  }
  HWX.citySearch = citySearch;
  function cityHit(k) {
    var h = hits[k]; if (!h || !city) return;
    var res = $('#hwc-res'); if (res) res.hidden = true;
    if (h.project) city.select(h.project.repo.name); else city.focusThing(h.thing);
  }

  /* ---------------- full screen ---------------- */
  /* The stage fills the window (it stays in the page, so every control and panel still works), and
     the browser goes full screen too where it allows it. */
  function cityFull(on) {
    document.body.classList.toggle('hwc-full', on);
    document.documentElement.classList.toggle('hwc-full', on);   /* no page scrolling underneath */
    if (city) city.setFull(on);
    var b = $('[data-hwc="full"]');
    if (b) { b.setAttribute('aria-pressed', String(on)); var s = $('span', b); if (s) s.textContent = on ? 'Exit full screen' : 'Full screen'; }
    var d = document, el = d.documentElement;
    try {
      if (on && !d.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(function () {});
      if (!on && d.fullscreenElement && d.exitFullscreen) d.exitFullscreen().catch(function () {});
    } catch (e) { /* the window-filling stage still works without the browser's full screen */ }
  }
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && document.body.classList.contains('hwc-full')) cityFull(false); });

  /* ---------------- events (delegated, bound once) ---------------- */
  function action(a, el) {
    if (a === 'signin') { var s = SH(); if (s && s.openSignIn) s.openSignIn(); return; }
    if (a === 'list') { listToggle(); return; }
    if (!city) return;
    if (a === 'zoomin') city.zoom(0.68);
    else if (a === 'zoomout') city.zoom(1.45);
    else if (a === 'reset') { city.clearSelection(); city.resetView(); }
    else if (a === 'links') { cityLinks = !cityLinks; city.setLinks(cityLinks); el.setAttribute('aria-pressed', String(cityLinks)); }
    else if (a === 'walk') city.enterWalk();
    else if (a === 'close') city.clearSelection();
    else if (a === 'select') { var n = el.getAttribute('data-repo'); if (city.level.kind !== 'estate') city.home(); city.select(n); if (matchMedia('(max-width: 760px)').matches) listToggle(false); }
    else if (a === 'hood') { if (city.level.kind !== 'estate') city.home(); city.selectHood(el.getAttribute('data-id')); }
    else if (a === 'inside') cityInside(el.getAttribute('data-repo'));
    else if (a === 'demo') { var sh = SH(), rn = el.getAttribute('data-repo'); if (sh && sh.openDemo) sh.openDemo(rn, { confirmFirst: false }); else go('p/' + enc(rn), { launch: 'demo' }); }
    else if (a === 'crumb') city.goCrumb(+el.getAttribute('data-i'));
    else if (a === 'up') city.up();
    else if (a === 'full') cityFull(!document.body.classList.contains('hwc-full'));
    else if (a === 'tours') toursMenu();
    else if (a === 'tour') { toursMenu(false); if (!city.startTour(el.getAttribute('data-tour'))) toast('There is nothing to visit on that tour yet.'); }
    else if (a === 'tnext') city.tourStep(1);
    else if (a === 'tprev') city.tourStep(-1);
    else if (a === 'tpause') city.pauseTour(!(city.tour && city.tour.paused));
    else if (a === 'tstop') city.stopTour();
    else if (a === 'hit') cityHit(+el.getAttribute('data-i'));
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    var m = $('#hwc-tours');
    if (m && !m.hidden && !t.closest('#hwc-tours') && !t.closest('[data-hwc="tours"]')) toursMenu(false);
    var r = $('#hwc-res');
    if (r && !r.hidden && !t.closest('#hwc-find')) r.hidden = true;
    var c = t.closest('[data-hwc]'); if (!c) return;
    e.preventDefault(); e.stopPropagation();
    action(c.getAttribute('data-hwc'), c);
  });
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'hwc-q') return;
    clearTimeout(citySearch.t); var v = e.target.value.trim();
    citySearch.t = setTimeout(function () { citySearch(v); }, 140);
  });
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t.id === 'hwc-q') {
      if (e.key === 'ArrowDown') { var o = $('#hwc-res button'); if (o) { e.preventDefault(); o.focus(); } }
      else if (e.key === 'Enter') { e.preventDefault(); if (hits.length) cityHit(0); else if (city) city.frameMatches(); }
      else if (e.key === 'Escape') { e.stopPropagation(); t.value = ''; citySearch(''); }
      return;
    }
    if (t && t.closest && t.closest('#hwc-res') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      var list = $$('#hwc-res button'), i = list.indexOf(t) + (e.key === 'ArrowDown' ? 1 : -1);
      if (i < 0) $('#hwc-q').focus(); else if (list[i]) list[i].focus();
      return;
    }
    if (t && t.closest && t.closest('#hwc-tours')) {
      var items = $$('#hwc-tours button:not([disabled])'), k = items.indexOf(t);
      if (e.key === 'Escape') { e.stopPropagation(); toursMenu(false); var b = $('[data-hwc="tours"]'); if (b) b.focus(); }
      else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && items.length) { e.preventDefault(); items[(k + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
      return;
    }
    if (t && t.closest && t.closest('#hwc-list')) {
      var bs = $$('#hwc-list button'), j = bs.indexOf(t);
      if (e.key === 'Escape') { e.stopPropagation(); listToggle(false); var lb = $('.hwc-listbtn'); if (lb) lb.focus(); }
      else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && j >= 0) { e.preventDefault(); var nb = bs[j + (e.key === 'ArrowDown' ? 1 : -1)]; if (nb) nb.focus(); }
      return;
    }
    if (e.key === 'Escape' && document.body.classList.contains('hwc-full') && !document.fullscreenElement && !(city && (city.walking || city.tour || city.ride))) cityFull(false);
  });
  document.addEventListener('toggle', function (e) { if (e.target && e.target.closest && e.target.closest('#hwc-key')) keyOpen = e.target.open; }, true);
  /* Leaving the City: stop walking, leave full screen, take the bot off the stage. */
  window.addEventListener('hashchange', function () {
    if (inCity()) return;
    if (city && city.walking) city.exitWalk(true);
    if (city && (city.tour || city.ride)) city.stopTour(true);
    if (document.body.classList.contains('hwc-full')) cityFull(false);
    narrate(false);
  });
  /* The theme switch: the City cross-fades with the page. */
  new MutationObserver(function () { if (city) city.setPalette(palette()); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  /* Signing in or out changes what the City can show. */
  if (GH.on) GH.on('auth', function () { treesAsked = Object.create(null); blobs = Object.create(null); });

  function handlers() {
    return {
      palette: palette,
      onSelect: cityPanel,
      onLevel: cityLevel,
      onWalk: function (on) { var w = $('#hwc-walk'), c = $('#hwc-stage'); if (w) w.hidden = !on; if (c) c.classList.toggle('walking', on); botShow(!on); },
      onOpen: function (key) { go('p/' + enc(key)); },
      onOpenSite: function (host) { go('live/' + enc(host)); },
      fetchBlob: cityBlob,
      loadImage: function (key, path) { return path && HWX.image ? HWX.image(key, path, 'files').catch(function () { return null; }) : Promise.resolve(null); },
      preview: cityPreviewPic,
      onTour: cityTourBar,
      onAnchor: function (a) { if (!slideOn) onAnchor(a); },
      botSize: function () { return botSize(); }
    };
  }
})();
