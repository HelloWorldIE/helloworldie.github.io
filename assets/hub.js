/* HelloWorld hub: router, views, project pages, demo viewer, code browser, sign-in.
   Data comes from window.HWGH (gh.js); the four-card band is window.HWDash (dash.js). */
(function () {
  'use strict';

  var GH = window.HWGH, CFG = window.HW_CONFIG, ACCOUNT = CFG.account;
  var view = document.getElementById('hx-view');
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var own = function (o, k) { return o != null && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k); };

  /* ---------- small helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function enc(s) { return encodeURIComponent(s); }
  function store(key, val) { try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; } }
  var rtf = new Intl.RelativeTimeFormat('en-IE', { numeric: 'auto' });
  function ago(iso) {
    if (!iso) return '';
    var s = (new Date(iso).getTime() - Date.now()) / 1000;
    var units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (var i = 0; i < units.length; i++) if (Math.abs(s) >= units[i][1]) return rtf.format(Math.round(s / units[i][1]), units[i][0]);
    return 'just now';
  }
  function dateText(iso) { return iso ? new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; }
  function sizeText(kb) { return kb >= 1024 ? (kb / 1024).toFixed(kb >= 10240 ? 0 : 1) + ' MB' : Math.max(1, kb) + ' KB'; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function boldOnly(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }

  function catColours(id) { var c = CFG.category_colours || {}; return c[own(c, id) ? id : '_none'] || ['#8d89a0', '#77738a']; }
  function catStyle(id) { var c = catColours(id); return '--c1:' + c[0] + ';--c2:' + c[1]; }
  function catLabel(id) { return own(CFG.categories, id) ? CFG.categories[id] : 'Not sorted yet'; }
  function kindLabel(id) { return own(CFG.kinds, id) ? CFG.kinds[id] : ''; }
  function statusLabel(id) { return own(CFG.statuses, id) ? CFG.statuses[id] : ''; }
  var FALLBACK_LANG = ['#6d44e0', '#0f7b8a', '#c2410c', '#2563c9', '#b0237a', '#a16207', '#0a8043', '#475569'];
  function langColour(name) { return GH.langColour(name) || FALLBACK_LANG[hash(name) % FALLBACK_LANG.length]; }

  function botSVG(cls) {
    return '<svg class="hw-bot ' + (cls || '') + '" viewBox="0 0 306 306" aria-hidden="true"><g transform="translate(0,13.2)">' +
      '<path fill="currentColor" d="M131.31,279.37c-6.6.45-11.16-4.09-11.17-10.59l-.06-34.37-.5-3.43-12.83-.14-12.64-1.34c-31.71-4.98-58.72-27.8-69.35-58.06-.59-1.58-.69-3.34-2.7-3.64-14.52-2.11-24.11-15.27-21.68-30.31,1.43-8.82,8.4-16.93,17.26-19.68,2.17-.67,4.28-1.19,6.28-2.07,9.86-31.08,36.59-54.94,68.47-60.52,1.81-.42,4.52-1.13,6.44-1.14l46.72-.32.02-16.89c-9.61-4.53-13.45-12.73-11.29-23.15,1.28-6.2,7.84-12.48,14.03-13.35,2.85-.4,6.45-.61,9.3.02,18.07,4.41,19.41,29.92,2.17,36.33l-.02,17.09,47.34.17s4.47,1,4.47,1c32.61,4.96,60.14,29.63,70.11,61l4.97,1.33c26.47,7.07,25.21,45.22-1.67,50.19-1.04.14-3.21.72-3.49,1.63-3.32,10.75-8.65,20.02-15.58,28.66-13.9,17.09-33.17,28.38-55.07,31.75l-12.15,1.26-11.79.27-49.29,45.98c-1.83,1.7-4.12,2.16-6.27,2.31ZM209,208.38c27.22-4.7,49.31-26.66,54.16-53.54l1.06-6.51c1.16-5.76-.33-13.23-1.23-18.98l-.93-4.62-1.05-3.72c-1.62-6.19-5.22-11.91-8.76-17.21-11.47-16.01-29.55-26.72-49.19-28.61,0,0-100.23.02-100.23.02-2.74,0-5.76.8-8.27,1.32-34.3,6.79-58.62,41.43-52.63,76.02,4.05,27.73,27.19,52.09,55.09,55.95,0,0,10.74,1.19,10.74,1.19l24.96.26c5.05.05,8.43,5.22,8.49,10.03l.3,24.27c2.7-2.43,8.44-7.64,11.03-10.09,0,0,21.47-19.92,21.47-19.92,1.89-1.75,3.96-4.22,6.72-4.27,0,0,17.41-.27,17.41-.27l10.87-1.31Z"/><g class="eyes"><path class="eye" d="M128.28,149.5c-.3,6.21-5.91,10.22-11.06,10.17-6.58-.06-11.35-4.64-11.51-11.39-.29-12.09-.48-24.24.1-36.29.29-6.13,6.2-10.25,11.44-10.15,5.94.11,10.87,4.61,11.1,11.13.41,12.06.53,24.21-.06,36.51Z"/><path class="eye" d="M200.23,150.4c-1.48,6.96-7.65,10.57-14.52,8.93-3.39-1.44-7.71-4.87-7.74-9.18l-.25-35.95c-.04-6.43,3.86-11.52,10.33-12.26,5.18-.6,11.98,3.5,12.01,9.69l.17,38.77Z"/></g></g></svg>';
  }

  var ICON = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    gh: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" style="width:12px;height:12px"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
    files: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 5a1 1 0 0 1 1-1h5l2 2h7a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/></svg>'
  };

  /* ---------- toasts and announcements ---------- */
  function toast(msg, warn) {
    var t = document.createElement('div');
    t.className = 'toast' + (warn ? ' is-warn' : '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, warn ? 7000 : 3500);
  }
  function announce(msg) { var a = $('#announce'); a.textContent = ''; setTimeout(function () { a.textContent = msg; }, 50); }
  function copyText(text, label) {
    var done = function () { toast((label || 'Copied') + ' to the clipboard'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { toast('Copying was blocked by the browser', true); });
    else toast('Copying is not available in this browser', true);
  }

  /* ---------- generated cover art: a dotted planet in the category colour ---------- */
  function artSVG(p) {
    var r = rng(hash(p.name)), W = 320, H = 200;
    var cx = 120 + r() * 80, cy = 92 + r() * 24, R = 58 + r() * 16, step = 9.5 + r() * 2;
    var dots = '';
    for (var y = cy - R; y <= cy + R; y += step) {
      for (var x = cx - R; x <= cx + R; x += step) {
        var dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 > R * R) continue;
        var z = Math.sqrt(R * R - d2) / R;
        var shade = Math.max(0, (-dx * 0.45 - dy * 0.55) / R + z * 0.75);
        var rad = 0.7 + 2.5 * Math.min(1, shade);
        dots += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + rad.toFixed(2) + '"/>';
      }
    }
    var tilt = -18 + r() * 36, rx = R * (1.55 + r() * 0.3), ry = R * (0.32 + r() * 0.14);
    var sat = r() * Math.PI * 2, sx = cx + Math.cos(sat) * rx, sy = cy + Math.sin(sat) * ry;
    var stars = '';
    for (var i = 0; i < 14; i++) stars += '<circle cx="' + (r() * W).toFixed(0) + '" cy="' + (r() * H).toFixed(0) + '" r="' + (0.6 + r() * 1.1).toFixed(1) + '"/>';
    return '<svg class="art" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="' + catStyle(p.category) + '">' +
      '<rect class="bg" width="' + W + '" height="' + H + '"/><g class="stars">' + stars + '</g>' +
      '<g class="ink">' + dots + '</g>' +
      '<g transform="rotate(' + tilt.toFixed(1) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')"><ellipse class="ring" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '"/>' +
      '<circle class="sat" cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="5"/></g></svg>';
  }

  /* ---------- pictures: loaded when they come into view ---------- */
  var pics = { pending: 0, done: 0 };
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); loadImg(e.target); } });
  }, { rootMargin: '300px' }) : null;
  function watchImages(root) { $$('img[data-img]', root).forEach(function (img) { if (io) io.observe(img); else loadImg(img); }); }
  function loadImg(img) {
    var spec = img.getAttribute('data-img'), i = spec.indexOf('|');
    img.removeAttribute('data-img');
    pics.pending++; updateLoad();
    GH.image(spec.slice(0, i), spec.slice(i + 1)).then(function (url) { img.src = url; img.classList.add('is-loaded'); }, function () {
      var fb = img.getAttribute('data-fallback');
      if (fb === 'art') { var p = GH.projects({ all: true }).find(function (x) { return x.name === spec.slice(0, i); }); if (p) img.outerHTML = artSVG(p); }
      else img.remove();
    }).finally(function () { pics.done++; updateLoad(); });
  }

  /* ---------- the loading status beside the title ---------- */
  var loadEl = $('#hub-load'), loadTimer = null, hideTimer = null, loadShown = false;
  var STAGE = { auth: 'Checking sign-in', repos: 'Loading projects', details: 'Loading details' };
  function updateLoad() {
    var pr = GH.progress, label = null;
    if (GH.state.error) {
      loadEl.className = 'hub-load is-on is-fail';
      $('.lbl', loadEl).textContent = GH.state.error instanceof GH.RateLimit ? 'GitHub limit reached' : 'Could not load everything';
      return;
    }
    if (own(STAGE, pr.stage)) label = STAGE[pr.stage] + (pr.stage === 'details' && pr.total ? ' ' + Math.round(100 * pr.done / pr.total) + '%' : '');
    else if (pics.done < pics.pending) label = 'Loading pictures ' + pics.done + ' of ' + pics.pending;
    clearTimeout(hideTimer);
    if (label) {
      $('.lbl', loadEl).textContent = label;
      loadEl.classList.remove('is-done');
      if (!loadShown && !loadTimer) loadTimer = setTimeout(function () { loadShown = true; loadEl.classList.add('is-on'); }, 300);
    } else {
      clearTimeout(loadTimer); loadTimer = null;
      if (loadShown) {
        $('.lbl', loadEl).textContent = 'Ready';
        loadEl.classList.add('is-done');
        hideTimer = setTimeout(function () { loadEl.classList.remove('is-on'); loadShown = false; pics.pending = pics.done = 0; }, 2500);
      }
    }
  }

  /* ---------- detail level ---------- */
  var level = store('hw_level');
  if (['overview', 'built', 'code'].indexOf(level) < 0) level = 'overview';
  function syncLevel() { $$('.seg [data-level]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-level') === level)); }); }
  function setLevel(l) { level = l; store('hw_level', l); syncLevel(); render(); }
  $$('.seg [data-level]').forEach(function (b) { b.addEventListener('click', function () { setLevel(b.getAttribute('data-level')); }); });
  syncLevel();

  /* ---------- theme ---------- */
  var themeBtn = $('#theme-btn');
  function syncThemeBtn() { var dark = document.documentElement.getAttribute('data-theme') === 'dark'; themeBtn.setAttribute('aria-pressed', String(dark)); themeBtn.title = dark ? 'Light mode' : 'Dark mode'; $('.sr-only', themeBtn).textContent = themeBtn.title; }
  themeBtn.addEventListener('click', function () {
    var dark = document.documentElement.getAttribute('data-theme') !== 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    store('hw_theme', dark ? 'dark' : 'light');
    syncThemeBtn();
  });
  syncThemeBtn();

  /* ---------- project card ---------- */
  function chipsFor(p, small) {
    var out = '<span class="chip" style="' + catStyle(p.category) + '"><span class="dot cdot"></span>' + esc(catLabel(p.category)) + '</span>';
    if (p.status && p.status !== 'live') out += '<span class="chip chip-dim">' + esc(statusLabel(p.status)) + '</span>';
    if (p.private && (level !== 'overview' || !small)) out += '<span class="chip chip-dim">' + ICON.lock + 'Private</span>';
    return out;
  }

  function card(p) {
    var media = p.cover
      ? '<img alt="" data-img="' + esc(p.name + '|' + p.cover) + '" data-fallback="art">'
      : artSVG(p);
    var href = '#/p/' + enc(p.name);
    var html = '<article class="card">' +
      '<div class="cover">' + media +
      '<a class="cover-link" href="' + href + '" tabindex="-1" aria-hidden="true"></a>' +
      '<div class="tags">' + chipsFor(p, true) + '</div>' +
      (p.demo ? '<button class="play" type="button" data-demo="' + esc(p.name) + '">' + ICON.play + 'Demo</button>' : '') +
      '</div><div class="card-body">' +
      '<h3 class="card-title"><a href="' + href + '">' + esc(p.title) + '</a></h3>';
    if (level !== 'overview') html += '<span class="slug">' + esc(ACCOUNT + '/' + p.name) + '</span>';
    html += '<p class="card-tag">' + esc(p.tagline || p.summary || 'No description yet.') + '</p>';
    if (level === 'built') {
      html += langBar(p.languages);
      if (p.last_message) html += '<span class="lastmsg" title="' + esc(p.last_message) + '">' + esc(p.last_message) + '</span>';
    }
    if (level === 'code') {
      html += '<div class="clone"><code>git clone https://github.com/' + esc(ACCOUNT + '/' + p.name) + '.git</code>' +
        '<button class="btn btn-sm btn-icon" type="button" data-clone="' + esc(p.name) + '" aria-label="Copy the clone command for ' + esc(p.title) + '">' + ICON.copy + '</button></div>';
    }
    html += '<div class="card-meta">';
    if (p.live_url) html += '<span class="chip chip-ok">Live</span>';
    if (level !== 'overview') {
      var top = topLang(p.languages);
      if (top) html += '<span class="chip"><span class="dot" style="background:' + esc(langColour(top)) + '"></span>' + esc(top) + '</span>';
      if (level === 'code') html += '<span class="chip chip-dim">' + sizeText(p.size) + '</span>';
    }
    if (p.pushed_at) html += '<span class="when" title="Last change ' + esc(dateText(p.pushed_at)) + '">' + esc(ago(p.pushed_at)) + '</span>';
    html += '</div></div></article>';
    return html;
  }

  function topLang(langs) { var best = null, n = -1; for (var k in langs) if (own(langs, k) && langs[k] > n) { best = k; n = langs[k]; } return best; }
  function langShares(langs) {
    var total = 0, list = [];
    for (var k in langs) if (own(langs, k)) { total += langs[k]; list.push([k, langs[k]]); }
    list.sort(function (a, b) { return b[1] - a[1]; });
    return list.map(function (x) { return { name: x[0], share: total ? x[1] / total : 0 }; });
  }
  function langBar(langs) {
    var shares = langShares(langs);
    if (!shares.length) return '';
    return '<div class="langbar" role="img" aria-label="' + esc(shares.slice(0, 4).map(function (s) { return s.name + ' ' + Math.round(s.share * 100) + '%'; }).join(', ')) + '">' +
      shares.map(function (s) { return '<span style="width:' + (s.share * 100).toFixed(2) + '%;background:' + esc(langColour(s.name)) + '"></span>'; }).join('') + '</div>';
  }

  function grid(list) { return '<div class="grid">' + list.map(card).join('') + '</div>'; }
  function shelf(title, list, more, note) {
    if (!list.length) return '';
    return '<section class="shelf"><div class="shelf-head"><h3>' + esc(title) + '</h3><span class="count">' + plural(list.length, 'project') + '</span>' +
      (note ? '<span class="count">' + esc(note) + '</span>' : '') +
      (more ? '<a class="more" href="' + more + '">See all</a>' : '') + '</div>' +
      '<div class="shelf-track">' + list.map(card).join('') + '</div></section>';
  }

  /* ---------- data helpers ---------- */
  function list() { return GH.projects(); }
  function hiddenCount() { return GH.state.repos.length - GH.projects().length; }
  function byRecent(a, b) { return new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0); }
  function matches(p, q) {
    if (!q) return true;
    var hay = [p.title, p.name, p.tagline, p.summary, catLabel(p.category), kindLabel(p.kind), p.built_with.join(' '),
      Object.keys(p.languages || {}).join(' '), (p.repo.topics || []).join(' ')].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return hay.indexOf(w) >= 0; });
  }

  function signedOutNotice() {
    if (GH.state.signedIn) return '';
    return '<div class="notice"><p>You are seeing <strong>public projects only</strong>. Sign in to see every project your GitHub account can read.</p>' +
      '<button class="btn btn-primary btn-sm" type="button" data-action="signin">Sign in</button></div>';
  }
  function errorNotice() {
    var e = GH.state.error;
    if (!e) return '';
    if (e instanceof GH.RateLimit) {
      var t = new Date(e.reset).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
      return '<div class="notice is-warn"><p>GitHub allows 60 requests an hour to signed-out visitors, and that limit is used up. Sign in, or try again after ' + esc(t) + '.</p>' +
        '<button class="btn btn-sm" type="button" data-action="signin">Sign in</button></div>';
    }
    return '<div class="notice is-warn"><p>Some project details could not be loaded (' + esc(e.message) + ').</p><button class="btn btn-sm" type="button" data-action="retry">Try again</button></div>';
  }
  function loadingSkeleton(n) {
    var s = '';
    for (var i = 0; i < (n || 6); i++) s += '<div class="card" aria-hidden="true"><div class="cover skel"></div><div class="card-body"><div class="skel" style="height:18px;width:60%"></div><div class="skel" style="height:14px;width:90%"></div><div class="skel" style="height:14px;width:75%"></div></div></div>';
    return '<div class="grid">' + s + '</div>';
  }
  function emptyState(msg) { return '<div class="empty">' + botSVG('is-alive') + '<p>' + msg + '</p></div>'; }
  function ready() { return GH.state.repos.length > 0 || (!GH.state.loading && GH.state.loadedAt); }

  /* ---------- views ---------- */
  var R = {};

  R.discover = function () {
    if (!ready()) return '<div class="v-head"><h2>Discover</h2></div>' + loadingSkeleton(6);
    var all = list();
    var html = errorNotice() + signedOutNotice() +
      '<div class="v-head"><h2>Discover</h2><p>' + plural(all.length, 'project') + (hiddenCount() ? ', plus ' + hiddenCount() + ' archived or forked' : '') + '</p></div>';
    if (!all.length) return html + emptyState('No projects to show yet.');
    html += shelf('Changed recently', all.slice().sort(byRecent).slice(0, 10), '#/all?sort=recent');
    html += shelf('Try a demo', all.filter(function (p) { return p.demo; }), '#/all?demo=1');
    html += shelf('Live now', all.filter(function (p) { return p.live_url; }), '#/all?live=1');
    Object.keys(CFG.categories).forEach(function (id) {
      html += shelf(CFG.categories[id], all.filter(function (p) { return p.category === id; }).sort(byRecent), '#/all?cat=' + enc(id));
    });
    var unsorted = all.filter(function (p) { return !p.category; });
    if (unsorted.length && unsorted.length < all.length) html += shelf('Not sorted yet', unsorted.sort(byRecent), '#/all?cat=_none', 'no hub card or category topic');
    else if (unsorted.length && GH.state.signedIn) {
      html += '<div class="notice"><p><strong>No project has a hub card yet</strong>, so the hub guesses names and summaries from each README. ' +
        'A card (<code>hub/project.json</code>) gives a project its category, pictures and demo. On the Mac, <code>hw-gh card &lt;repo&gt;</code> drafts one.</p></div>';
    }
    return html;
  };

  R.all = function (route) {
    var q = route.q;
    if (!ready()) return '<div class="v-head"><h2>All projects</h2></div>' + loadingSkeleton(9);
    var all = list();
    var f = { cat: q.get('cat') || '', kind: q.get('kind') || '', status: q.get('status') || '', lang: q.get('lang') || '',
      demo: q.get('demo') === '1', live: q.get('live') === '1', priv: q.get('private') === '1', text: q.get('q') || '', sort: q.get('sort') || 'recent' };
    var langs = {};
    all.forEach(function (p) { var t = topLang(p.languages); if (t) langs[t] = (langs[t] || 0) + 1; });
    var shown = all.filter(function (p) {
      if (f.cat && (f.cat === '_none' ? p.category : p.category !== f.cat)) return false;
      if (f.kind && p.kind !== f.kind) return false;
      if (f.status && p.status !== f.status) return false;
      if (f.lang && !own(p.languages || {}, f.lang)) return false;
      if (f.demo && !p.demo) return false;
      if (f.live && !p.live_url) return false;
      if (f.priv && !p.private) return false;
      return matches(p, f.text);
    });
    shown.sort(f.sort === 'name' ? function (a, b) { return a.title.localeCompare(b.title); } : f.sort === 'size' ? function (a, b) { return b.size - a.size; } : byRecent);
    function sel(name, label, options, value) {
      return '<label class="sr-only" for="f-' + name + '">' + label + '</label><select class="field" id="f-' + name + '" data-filter="' + name + '">' +
        '<option value="">' + label + ': all</option>' +
        options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === value ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    }
    var catOpts = Object.keys(CFG.categories).map(function (k) { return [k, CFG.categories[k]]; }).concat([['_none', 'Not sorted yet']]);
    var kindOpts = Object.keys(CFG.kinds).map(function (k) { return [k, CFG.kinds[k]]; });
    var statusOpts = Object.keys(CFG.statuses).map(function (k) { return [k, CFG.statuses[k]]; });
    var langOpts = Object.keys(langs).sort(function (a, b) { return langs[b] - langs[a]; }).map(function (k) { return [k, k + ' (' + langs[k] + ')']; });
    function tog(name, label, on) { return '<button type="button" class="chip" data-toggle="' + name + '" aria-pressed="' + on + '">' + label + '</button>'; }
    var title = f.cat ? catLabel(f.cat === '_none' ? null : f.cat) : f.text ? 'Results for “' + f.text + '”' : 'All projects';
    return errorNotice() + signedOutNotice() +
      '<div class="v-head"><h2>' + esc(title) + '</h2></div>' +
      '<div class="filters">' + sel('cat', 'Category', catOpts, f.cat) + sel('kind', 'Kind', kindOpts, f.kind) + sel('status', 'Status', statusOpts, f.status) +
      sel('lang', 'Language', langOpts, f.lang) +
      tog('demo', 'Has a demo', f.demo) + tog('live', 'Live', f.live) + (GH.state.signedIn ? tog('private', 'Private', f.priv) : '') +
      '<label class="sr-only" for="f-sort">Sort</label><select class="field" id="f-sort" data-filter="sort">' +
      [['recent', 'Recently changed'], ['name', 'Name'], ['size', 'Size']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === f.sort ? ' selected' : '') + '>Sort: ' + o[1] + '</option>'; }).join('') + '</select>' +
      '<span class="result">' + plural(shown.length, 'project') + '</span></div>' +
      (shown.length ? grid(shown) : emptyState('No project matches these filters. <a href="#/all">Clear them</a>.'));
  };

  R.categories = function () {
    if (!ready()) return '<div class="v-head"><h2>Categories</h2></div>' + loadingSkeleton(6);
    var all = list();
    var ids = Object.keys(CFG.categories).concat(['_none']);
    var tiles = ids.map(function (id) {
      var ps = all.filter(function (p) { return id === '_none' ? !p.category : p.category === id; }).sort(byRecent);
      if (!ps.length && id === '_none') return '';
      return '<a class="card cat-tile" href="#/all?cat=' + enc(id) + '" style="' + catStyle(id) + '">' +
        '<div class="cat-band"></div><div class="card-body"><h3 class="card-title">' + esc(catLabel(id === '_none' ? null : id)) + '</h3>' +
        '<p class="card-tag">' + (ps.length ? esc(ps.slice(0, 3).map(function (p) { return p.title; }).join(', ')) + (ps.length > 3 ? ' and more' : '') : 'Nothing here yet.') + '</p>' +
        '<div class="card-meta"><span class="chip">' + plural(ps.length, 'project') + '</span></div></div></a>';
    }).join('');
    return signedOutNotice() + '<div class="v-head"><h2>Categories</h2><p>Every project belongs to one category, set on its hub card.</p></div><div class="grid">' + tiles + '</div>';
  };

  R.health = function () {
    if (!GH.state.signedIn) return '<div class="v-head"><h2>Health</h2></div>' + signedOutNotice();
    if (!ready() || !GH.state.detailsReady) return '<div class="v-head"><h2>Health</h2></div>' + loadingSkeleton(3);
    var repos = GH.state.repos.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    var cards = 0, faulty = 0;
    var rows = repos.map(function (r) {
      var p = GH.info(r);
      var cardCell = r.card ? '<span class="ok">Ready</span>' : r.cardError ? '<span class="no" title="' + esc(r.cardError) + '">Faulty</span>' : '<span class="meh">Missing</span>';
      if (r.card) cards++; if (r.cardError) faulty++;
      var demoCell = p.demo ? '<span class="ok">Yes</span>' : p.no_demo ? '<span title="' + esc(p.no_demo) + '">Not needed</span>' : (CFG.demo_kinds.indexOf(p.kind) >= 0 ? '<span class="meh">Expected</span>' : '<span class="chip-dim">-</span>');
      return '<tr><td><a href="#/p/' + enc(r.name) + '">' + esc(r.name) + '</a>' + (r.fork ? ' <span class="chip chip-dim">fork</span>' : '') + (r.archived ? ' <span class="chip chip-dim">archived</span>' : '') + '</td>' +
        '<td>' + (r.private ? 'Private' : '<strong>Public</strong>') + '</td><td>' + cardCell + '</td>' +
        '<td>' + (p.category ? '<span class="chip" style="' + catStyle(p.category) + '"><span class="dot cdot"></span>' + esc(catLabel(p.category)) + '</span>' : '<span class="meh">None</span>') + '</td>' +
        '<td>' + esc(kindLabel(p.kind) || '-') + '</td><td>' + esc(statusLabel(p.status) || '-') + '</td>' +
        '<td>' + (r.readme ? '<span class="ok">Yes</span>' : '<span class="no">No</span>') + '</td><td>' + demoCell + '</td>' +
        '<td>' + (r.has_pages ? '<span class="meh">Pages</span>' : '-') + '</td><td title="' + esc(dateText(p.pushed_at)) + '">' + esc(ago(p.pushed_at)) + '</td></tr>';
    }).join('');
    return '<div class="v-head"><h2>Health</h2><p>' + plural(repos.length, 'repo') + ': ' + cards + ' with a ready hub card, ' + faulty + ' faulty. Run <code>hw-gh audit</code> on the Mac for the full check.</p></div>' +
      '<div class="table-wrap"><table class="health"><thead><tr><th>Repo</th><th>Visibility</th><th>Hub card</th><th>Category</th><th>Kind</th><th>Status</th><th>README</th><th>Demo</th><th>Pages</th><th>Changed</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  };

  R.world = function () {
    if (!ready()) return '<div class="v-head"><h2>World</h2></div><div class="world-host skel"></div>';
    return '<div class="v-head"><h2>World</h2><p>Every project as a building on one planet, grouped by category. Drag to turn it; select a building, or a name in the list, to open the project.</p></div>' +
      '<div id="world-host" class="world-host"></div>';
  };

  /* ---------- project page ---------- */
  R.p = function (route) {
    var name = route.parts[1];
    if (!ready()) return '<div class="skel" style="height:320px;border-radius:18px"></div>';
    var r = GH.findRepo(name);
    if (!r) {
      return '<div class="crumbs"><a href="#/">Discover</a><span>/</span><span>' + esc(name) + '</span></div>' +
        emptyState('We could not find <strong>' + esc(name) + '</strong>.' + (GH.state.signedIn ? ' It may have been renamed or deleted, or your token cannot read it.' : ' It may be private: sign in to see it.') +
          (GH.state.signedIn ? '' : '<br><br><button class="btn btn-primary" type="button" data-action="signin">Sign in</button>'));
    }
    var p = GH.info(r);
    var tab = route.q.get('tab') || (level === 'code' ? 'code' : level === 'built' ? 'built' : 'overview');
    if (['overview', 'built', 'code'].indexOf(tab) < 0) tab = 'overview';
    var base = '#/p/' + enc(name);
    var slides = [];
    if (p.cover) slides.push({ src: p.cover, alt: p.title + ': cover picture' });
    p.gallery.forEach(function (g) { slides.push({ src: g.src, alt: g.caption || p.title }); });
    var media = slides.length
      ? slides.slice(0, 6).map(function (s, i) { return '<div class="slide' + (i === 0 ? ' is-on' : '') + '"><img alt="' + esc(s.alt) + '" data-img="' + esc(name + '|' + s.src) + '" data-fallback="art"></div>'; }).join('') +
        (slides.length > 1 ? '<div class="slide-nav">' + slides.slice(0, 6).map(function (s, i) { return '<button type="button" data-slide="' + i + '" aria-label="Picture ' + (i + 1) + '"' + (i === 0 ? ' aria-current="true"' : '') + '></button>'; }).join('') + '</div>' : '')
      : artSVG(p);
    var copyOf = p.same_as && GH.findRepo(p.same_as);
    var html = '<div class="crumbs"><a href="#/">Discover</a><span>/</span><a href="#/all?cat=' + enc(p.category || '_none') + '">' + esc(catLabel(p.category)) + '</a><span>/</span><span>' + esc(p.title) + '</span></div>' +
      (copyOf ? '<div class="notice"><p>This repo is a second copy of <a href="#/p/' + enc(p.same_as) + '">' + esc(p.same_as) + '</a>, which the hub shows instead.</p></div>' : '') +
      '<div class="p-hero"><div class="p-media" id="p-media">' + media + '</div><div>' +
      '<span class="eyebrow">' + esc([kindLabel(p.kind), p.private ? 'Private' : 'Public'].filter(Boolean).join(' · ')) + '</span>' +
      '<h2 class="p-title">' + esc(p.title) + '</h2>' +
      (p.tagline ? '<p class="p-tag">' + esc(p.tagline) + '</p>' : '') +
      '<div class="p-chips">' + chipsFor(p, false) + (p.archived ? '<span class="chip chip-dim">Archived</span>' : '') + (p.fork ? '<span class="chip chip-dim">Fork</span>' : '') + '</div>' +
      '<div class="p-actions">' +
      (p.demo ? '<button class="btn btn-primary" type="button" data-demo="' + esc(name) + '">' + ICON.play + 'Open the demo</button>' : '') +
      (p.live_url ? '<a class="btn" href="' + esc(p.live_url) + '" target="_blank" rel="noopener noreferrer">' + ICON.ext + 'Visit the live site</a>' : '') +
      '<a class="btn" href="' + esc(r.html_url) + '" target="_blank" rel="noopener noreferrer">' + ICON.gh + 'GitHub</a>' +
      '<button class="btn" type="button" data-clone="' + esc(name) + '">' + ICON.copy + 'Copy clone command</button>' +
      '</div></div></div>' +
      '<nav class="p-tabs" aria-label="Project sections">' +
      [['overview', 'Overview'], ['built', 'How it’s built'], ['code', 'Code']].map(function (t) {
        return '<a href="' + base + '?tab=' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + t[1] + '</a>';
      }).join('') + '</nav>';
    if (tab === 'code') return html + '<div id="code-host" data-repo="' + esc(name) + '"></div>';
    html += '<div class="p-body"><div>' + (tab === 'built' ? builtTab(p) : overviewTab(p)) + '</div>' + sidePanel(p) + '</div>';
    return html;
  };

  function overviewTab(p) {
    var html = '<p class="summary">' + esc(p.summary || p.tagline || 'This project has no summary yet.') + '</p>';
    if (p.features.length) html += '<h3 class="sec-title">What it does</h3><ul class="features">' + p.features.map(function (f) { return '<li>' + ICON.check + '<span>' + esc(f) + '</span></li>'; }).join('') + '</ul>';
    if (p.guides.length) {
      html += '<h3 class="sec-title">Step-by-step guides</h3><div class="guides">' + p.guides.map(function (g, i) {
        return '<button type="button" class="guide-link" data-guide="' + i + '"><span class="n">' + (i + 1) + '</span><span><b>' + esc(g.title) + '</b><small>' + plural(g.steps.length, 'step') + (g.summary ? ' · ' + esc(g.summary) : '') + '</small></span></button>';
      }).join('') + '</div>';
    }
    if (p.gallery.length) {
      html += '<h3 class="sec-title">Pictures</h3><div class="gallery">' + p.gallery.map(function (g, i) {
        return '<button type="button" data-lightbox="' + i + '"><img alt="' + esc(g.caption || p.title) + '" data-img="' + esc(p.name + '|' + g.src) + '">' + (g.caption ? '<span>' + esc(g.caption) + '</span>' : '') + '</button>';
      }).join('') + '</div>';
    }
    if (!p.demo && p.no_demo) html += '<div class="panel"><span class="eyebrow">No demo</span><p style="margin:6px 0 0">' + esc(p.no_demo) + '</p></div>';
    if (!p.hasCard && !p.features.length && p.repo.readme) html += '<h3 class="sec-title">From the README</h3>' + '<div data-readme="' + esc(p.name) + '"></div>';
    return html;
  }

  function builtTab(p) {
    var shares = langShares(p.languages);
    var html = '';
    if (shares.length) {
      html += '<h3 class="sec-title">Languages</h3>' + langBar(p.languages) + '<div class="lang-legend">' + shares.slice(0, 8).map(function (s) {
        return '<span><span class="dot" style="background:' + esc(langColour(s.name)) + '"></span>' + esc(s.name) + ' ' + (s.share < 0.001 ? '&lt;0.1' : (s.share * 100).toFixed(s.share < 0.01 ? 1 : 0)) + '%</span>';
      }).join('') + '</div>';
    }
    if (p.built_with.length) html += '<h3 class="sec-title" style="margin-top:24px">Built with</h3><div class="p-chips">' + p.built_with.map(function (b) { return '<span class="chip">' + esc(b) + '</span>'; }).join('') + '</div>';
    html += '<h3 class="sec-title" style="margin-top:24px">README</h3>' + (p.repo.readme ? '<div data-readme="' + esc(p.name) + '"></div>' : '<p class="chip-dim">This repo has no README.md.</p>');
    return html;
  }

  function sidePanel(p) {
    var r = p.repo, rows = [];
    rows.push(['Category', esc(catLabel(p.category))]);
    if (p.kind) rows.push(['Kind', esc(kindLabel(p.kind))]);
    if (p.status) rows.push(['Status', esc(statusLabel(p.status))]);
    if (p.audience.length) rows.push(['For', esc(p.audience.map(function (a) { return CFG.audiences[a]; }).join(', '))]);
    rows.push(['Last change', '<span title="' + esc(dateText(p.pushed_at)) + '">' + esc(ago(p.pushed_at)) + '</span>' + (p.last_message ? '<br><small class="chip-dim">' + esc(p.last_message) + '</small>' : '')]);
    if (p.recent != null) rows.push(['Last 30 days', plural(p.recent, 'change')]);
    if (GH.state.signedIn) rows.push(['Open issues', String(p.open_issues || 0)]);
    rows.push(['Repo', '<span class="slug">' + esc(r.full_name) + '</span>']);
    rows.push(['Size', sizeText(r.size)]);
    rows.push(['Created', esc(dateText(r.created_at))]);
    var html = '<aside class="p-side"><div class="panel"><h3 class="eyebrow">About</h3><dl class="facts">' +
      rows.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('') + '</dl></div>';
    if (GH.state.signedIn && !p.hasCard) {
      html += '<div class="panel"><h3 class="eyebrow">Hub card</h3><p style="margin:0 0 8px">' + (p.cardError ? 'The card has a problem: ' + esc(p.cardError) + '.' : 'This project has no hub card yet, so the hub guesses its details.') + '</p>' +
        '<div class="clone"><code>hw-gh card ' + esc(p.name) + '</code><button class="btn btn-sm btn-icon" type="button" data-copy="hw-gh card ' + esc(p.name) + '" aria-label="Copy the command">' + ICON.copy + '</button></div></div>';
    }
    return html + '</aside>';
  }

  /* ---------- README rendering ---------- */
  if (window.hljs) window.hljs.configure({ ignoreUnescapedHTML: true });
  function resolvePath(base, rel) {
    try {
      var u = new URL(rel, 'https://x.invalid/' + (base ? base.replace(/[^/]*$/, '') : ''));
      return decodeURIComponent(u.pathname.slice(1));
    } catch (e) { return null; }
  }
  function renderMarkdown(md, repoName, path) {
    var r = GH.findRepo(repoName);
    var html = window.marked ? window.marked.parse(md, { gfm: true, async: false }) : '<pre>' + esc(md) + '</pre>';
    var clean = window.DOMPurify ? window.DOMPurify.sanitize(html, {
      FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'textarea', 'select', 'video', 'audio', 'object', 'embed'],
      FORBID_ATTR: ['style'], SANITIZE_NAMED_PROPS: true
    }) : esc(md);
    var box = document.createElement('div');
    box.className = 'md';
    box.innerHTML = clean;
    $$('a[href]', box).forEach(function (a) {
      var h = a.getAttribute('href');
      if (/^#/.test(h)) { a.removeAttribute('href'); a.setAttribute('role', 'link'); return; }
      if (/^(https?:|mailto:)/i.test(h)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
      var target = resolvePath(path, h);
      if (target && r) { a.href = 'https://github.com/' + ACCOUNT + '/' + enc(r.name) + '/blob/' + enc(r.default_branch) + '/' + target.split('/').map(enc).join('/'); a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      else a.removeAttribute('href');
    });
    var ownPic = new RegExp('^https://(?:github\\.com/' + ACCOUNT + '/([^/]+)/(?:raw|blob)/[^/]+|raw\\.githubusercontent\\.com/' + ACCOUNT + '/([^/]+)/[^/]+)/(.+)$', 'i');
    $$('img[src]', box).forEach(function (img) {
      var s = img.getAttribute('src');
      if (/^data:image\//i.test(s)) return;
      var m = s.match(ownPic);
      if (m && GH.findRepo(m[1] || m[2])) {
        // A picture in one of our repos: load it with the viewer's access (works for private repos too).
        var p2 = null; try { p2 = decodeURIComponent(m[3].split(/[?#]/)[0]); } catch (e) {}
        img.removeAttribute('src');
        if (p2 && GH.safePath(p2)) { img.setAttribute('data-img', (m[1] || m[2]) + '|' + p2); img.loading = 'lazy'; } else img.remove();
        return;
      }
      if (/^https:\/\/(raw|avatars)\.githubusercontent\.com\//i.test(s)) return;
      if (/^https?:\/\//i.test(s)) {
        // Pictures from other sites are blocked by this page's policy: show a link instead.
        var a = document.createElement('a');
        a.href = s; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.textContent = img.getAttribute('alt') || 'Picture on another site';
        img.replaceWith(a);
        return;
      }
      var target = resolvePath(path, s);
      img.removeAttribute('src');
      if (target && GH.safePath(target)) { img.setAttribute('data-img', repoName + '|' + target); img.loading = 'lazy'; }
      else img.remove();
    });
    if (window.hljs) $$('pre code', box).forEach(function (el) { try { window.hljs.highlightElement(el); } catch (e) {} });
    watchImages(box);
    return box;
  }
  function fillReadmes(root) {
    $$('[data-readme]', root).forEach(function (el) {
      var r = GH.findRepo(el.getAttribute('data-readme'));
      if (r && r.readme) el.replaceWith(renderMarkdown(r.readme, r.name, 'README.md'));
    });
  }

  /* ---------- code browser ---------- */
  var LANG_BY_EXT = { js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', json: 'json', html: 'xml', htm: 'xml', xml: 'xml', svg: 'xml', css: 'css', scss: 'scss', less: 'less', php: 'php', py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin', swift: 'swift', c: 'c', h: 'c', cpp: 'cpp', cs: 'csharp', sh: 'bash', zsh: 'bash', bash: 'bash', yml: 'yaml', yaml: 'yaml', toml: 'ini', ini: 'ini', sql: 'sql', md: 'markdown', vue: 'xml', svelte: 'xml', lua: 'lua' };
  var IMG_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
  var BIN_EXT = /\.(zip|gz|tgz|rar|7z|pdf|docx?|xlsx?|pptx?|mp3|mp4|mov|wav|ogg|webm|woff2?|ttf|otf|eot|ico|exe|dll|so|dylib|bin|sav|gb|gbc|gba|nes|sfc|smc|z64|jar|class|psd|ai|sketch|fig)$/i;

  function mountCode(host) {
    var name = host.getAttribute('data-repo'), r = GH.findRepo(name);
    host.innerHTML = '<div class="code"><div class="tree" role="tree" aria-label="Files"><div class="skel" style="height:14px;margin:8px"></div><div class="skel" style="height:14px;margin:8px;width:70%"></div></div>' +
      '<div class="viewer"><div class="viewer-head"><span class="path">Select a file</span><a class="btn btn-sm" href="' + esc(r.html_url) + '" target="_blank" rel="noopener noreferrer">' + ICON.gh + 'Open on GitHub</a></div><div class="viewer-body"></div></div></div>';
    var treeEl = $('.tree', host), body = $('.viewer-body', host), head = $('.viewer-head .path', host);
    GH.tree(name).then(function (t) {
      var root = { dirs: {}, files: [] };
      t.items.forEach(function (i) {
        var parts = i.path.split('/'), node = root;
        for (var k = 0; k < parts.length - 1; k++) node = node.dirs[parts[k]] = node.dirs[parts[k]] || { dirs: {}, files: [] };
        if (i.type === 'tree') node.dirs[parts[parts.length - 1]] = node.dirs[parts[parts.length - 1]] || { dirs: {}, files: [] };
        else if (i.type === 'blob') node.files.push(i);
      });
      function ul(node, prefix, depth) {
        var out = '<ul role="' + (depth ? 'group' : 'none') + '">';
        Object.keys(node.dirs).sort().forEach(function (d) {
          var path = prefix + d;
          out += '<li role="none"><span role="treeitem" class="dir" tabindex="-1" aria-expanded="false" data-dir="' + esc(path) + '">' + esc(d) + '</span>' +
            '<div hidden>' + ul(node.dirs[d], path + '/', depth + 1) + '</div></li>';
        });
        node.files.sort(function (a, b) { return a.path.localeCompare(b.path); }).forEach(function (f) {
          out += '<li role="none"><span role="treeitem" tabindex="-1" aria-selected="false" data-file="' + esc(f.path) + '" data-size="' + f.size + '">' + esc(f.path.split('/').pop()) + '</span></li>';
        });
        return out + '</ul>';
      }
      treeEl.innerHTML = ul(root, '', 0) + (t.truncated ? '<p class="chip-dim" style="padding:8px">This repo is too large to list in full.</p>' : '');
      var items = function () { return $$('[role="treeitem"]', treeEl).filter(function (x) { return x.offsetParent !== null; }); };
      var first = items()[0]; if (first) first.tabIndex = 0;
      function toggle(dir, open) {
        var sub = dir.nextElementSibling;
        open = open == null ? dir.getAttribute('aria-expanded') !== 'true' : open;
        dir.setAttribute('aria-expanded', String(open)); sub.hidden = !open;
      }
      function select(el) {
        $$('[aria-selected="true"]', treeEl).forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
        el.setAttribute('aria-selected', 'true');
        openFile(el.getAttribute('data-file'), Number(el.getAttribute('data-size')));
      }
      function focusItem(el) { items().forEach(function (x) { x.tabIndex = -1; }); el.tabIndex = 0; el.focus(); }
      treeEl.addEventListener('click', function (e) {
        var it = e.target.closest('[role="treeitem"]'); if (!it) return;
        focusItem(it);
        if (it.hasAttribute('data-dir')) toggle(it); else select(it);
      });
      treeEl.addEventListener('keydown', function (e) {
        var it = e.target.closest('[role="treeitem"]'); if (!it) return;
        var list = items(), i = list.indexOf(it);
        if (e.key === 'ArrowDown' && list[i + 1]) { focusItem(list[i + 1]); e.preventDefault(); }
        else if (e.key === 'ArrowUp' && list[i - 1]) { focusItem(list[i - 1]); e.preventDefault(); }
        else if (e.key === 'ArrowRight' && it.hasAttribute('data-dir')) { toggle(it, true); e.preventDefault(); }
        else if (e.key === 'ArrowLeft' && it.hasAttribute('data-dir')) { toggle(it, false); e.preventDefault(); }
        else if (e.key === 'Enter' || e.key === ' ') { if (it.hasAttribute('data-dir')) toggle(it); else select(it); e.preventDefault(); }
      });
      var readme = $('[data-file="README.md"]', treeEl) || $('[data-file="readme.md"]', treeEl);
      if (readme) select(readme);
    }, function (e) {
      treeEl.innerHTML = '<p style="padding:12px">The file list could not be loaded (' + esc(e.message) + ').</p>';
    });

    function openFile(path, size) {
      head.textContent = path;
      body.innerHTML = '<div class="skel" style="height:200px;margin:16px"></div>';
      var ext = (path.split('.').pop() || '').toLowerCase();
      if (IMG_EXT.test(path)) {
        body.innerHTML = '<div class="img-view"><img alt="' + esc(path) + '" data-img="' + esc(name + '|' + path) + '"></div>';
        return watchImages(body);
      }
      if (BIN_EXT.test(path)) { body.innerHTML = '<p style="padding:16px">This is a binary file. Open it on GitHub to download it.</p>'; return; }
      if (size > 400 * 1024) { body.innerHTML = '<p style="padding:16px">This file is ' + sizeText(Math.round(size / 1024)) + ', too large to show here. Open it on GitHub.</p>'; return; }
      GH.fileText(name, path).then(function (text) {
        if (ext === 'md') { body.innerHTML = ''; body.appendChild(renderMarkdown(text, name, path)); return; }
        var pre = document.createElement('pre'), code = document.createElement('code');
        code.textContent = text; pre.appendChild(code);
        body.innerHTML = ''; body.appendChild(pre);
        if (window.hljs && text.length < 200000) {
          var lang = LANG_BY_EXT[ext];
          try {
            var res = lang && window.hljs.getLanguage(lang) ? window.hljs.highlight(text, { language: lang, ignoreIllegals: true }) : (text.length < 60000 ? window.hljs.highlightAuto(text) : null);
            if (res) { code.innerHTML = res.value; code.className = 'hljs'; }
          } catch (e) {}
        }
      }, function (e) { body.innerHTML = '<p style="padding:16px">This file could not be loaded (' + esc(e.message) + ').</p>'; });
    }
  }

  /* ---------- full-window viewer: demo, pictures, guides ---------- */
  var full = $('#full-dlg'), fullClose = null;
  function openFull(html, label, onClose) {
    full.innerHTML = html; full.setAttribute('aria-label', label);
    fullClose = onClose || null;
    if (!full.open) full.showModal();
    var c = $('[data-close]', full); if (c) c.focus();
  }
  function closeFull() { if (full.open) full.close(); }
  full.addEventListener('close', function () { var f = fullClose; fullClose = null; full.innerHTML = ''; full.onkeydown = full.onclick = null; if (f) f(); });
  full.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeFull(); });

  // The demo runs in a sealed frame: no access to this page, its address or its storage.
  var DEMO_POLICY = "default-src 'none'; script-src 'unsafe-inline' blob:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src data: https://fonts.gstatic.com; img-src data: blob:; media-src data: blob:; connect-src 'none'; form-action 'none'; worker-src blob:";
  var DEMO_SHIM = '(function(){function m(){var d={};return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}' +
    'try{Object.defineProperty(window,"localStorage",{value:m(),configurable:true})}catch(e){}try{Object.defineProperty(window,"sessionStorage",{value:m(),configurable:true})}catch(e){}})();';

  function openDemo(name) {
    var r = GH.findRepo(name); if (!r) return;
    var p = GH.info(r);
    if (!p.demo) return toast('This project has no demo', true);
    openFull('<div class="full-bar"><span class="t">Demo: ' + esc(p.title) + '</span><span class="note">Runs sealed, with no access to the hub or your sign-in</span>' +
      '<a class="btn btn-sm" href="#/p/' + enc(name) + '" data-close>Project page</a><button class="btn btn-sm" type="button" data-close>' + ICON.close + 'Close</button></div>' +
      '<div class="skel" style="height:calc(100vh - 55px);border-radius:0"></div>', 'Demo of ' + p.title, function () {
      var rt = parseRoute();
      if (rt.view === 'p' && rt.q.get('launch') === 'demo') { rt.q.delete('launch'); history.replaceState(null, '', '#' + rt.path + (rt.q.toString() ? '?' + rt.q : '')); }
    });
    GH.fileText(name, p.demo).then(function (html) {
      if (!full.open) return;
      var head = '<meta http-equiv="Content-Security-Policy" content="' + DEMO_POLICY + '"><script>' + DEMO_SHIM + '<\/script>';
      var m = html.match(/^\s*<!doctype[^>]*>/i);
      var doc = m ? m[0] + head + html.slice(m[0].length) : '<!doctype html>' + head + html;
      var frame = document.createElement('iframe');
      frame.className = 'demo-frame';
      frame.title = 'Demo of ' + p.title;
      frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-modals allow-downloads allow-pointer-lock');
      frame.setAttribute('allow', 'fullscreen; gamepad; clipboard-write');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.srcdoc = doc;
      var sk = $('.skel', full); if (sk) sk.replaceWith(frame);
    }, function (e) {
      var sk = $('.skel', full);
      if (sk) sk.outerHTML = '<div class="empty" style="color:var(--stage-dim)">' + (e.status === 404 ? 'The demo file ' + esc(p.demo) + ' is not in the repo.' : 'The demo could not be loaded (' + esc(e.message) + ').') + '</div>';
    });
  }

  function openLightbox(name, index) {
    var p = GH.info(GH.findRepo(name)), items = p.gallery;
    if (!items.length) return;
    function draw(i) {
      index = (i + items.length) % items.length;
      var g = items[index];
      openFull('<div class="full-bar"><span class="t">' + esc(p.title) + '</span><span class="note">' + (index + 1) + ' of ' + items.length + '</span><button class="btn btn-sm" type="button" data-close>' + ICON.close + 'Close</button></div>' +
        '<div class="lightbox-body"><div class="lightbox-img">' +
        (items.length > 1 ? '<button class="btn btn-icon lb-prev" type="button" data-lb="-1" aria-label="Previous picture">' + ICON.left + '</button><button class="btn btn-icon lb-next" type="button" data-lb="1" aria-label="Next picture">' + ICON.right + '</button>' : '') +
        '<img alt="' + esc(g.caption || p.title) + '" data-img="' + esc(name + '|' + g.src) + '"></div><div class="lightbox-cap">' + esc(g.caption) + '</div></div>', 'Pictures of ' + p.title);
      watchImages(full);
    }
    full.onkeydown = function (e) { if (!$('.lightbox-body', full)) return; if (e.key === 'ArrowRight') draw(index + 1); if (e.key === 'ArrowLeft') draw(index - 1); };
    full.onclick = function (e) { var b = e.target.closest('[data-lb]'); if (b) draw(index + Number(b.getAttribute('data-lb'))); };
    draw(index);
  }

  function openGuide(name, gi, si) {
    var p = GH.info(GH.findRepo(name)), g = p.guides[gi];
    if (!g) return;
    function draw(i) {
      si = Math.max(0, Math.min(g.steps.length - 1, i));
      var s = g.steps[si], letters = 'ABCDEFGH';
      var marks = s.marks.map(function (m, k) {
        var mk = CFG.mark_kinds[m.kind] || {}, badge = m.label || (mk.badge === 'number' ? String(si + 1) : mk.badge === 'letter' ? letters[k] : '');
        return '<span class="mark ' + esc(m.kind) + '" style="--mk:' + esc(mk.colour || '#6d44e0') + ';left:' + m.x + '%;top:' + m.y + '%;width:' + m.w + '%;height:' + m.h + '%">' + (badge ? '<span class="badge">' + esc(badge) + '</span>' : '') + '</span>';
      }).join('');
      openFull('<div class="full-bar"><span class="t">' + esc(g.title) + '</span><span class="note">Step ' + (si + 1) + ' of ' + g.steps.length + '</span>' +
        '<button class="btn btn-sm" type="button" data-step="-1"' + (si === 0 ? ' disabled' : '') + '>' + ICON.left + 'Back</button>' +
        '<button class="btn btn-sm" type="button" data-step="1"' + (si === g.steps.length - 1 ? ' disabled' : '') + '>Next' + ICON.right + '</button>' +
        '<button class="btn btn-sm" type="button" data-close>' + ICON.close + 'Close</button></div>' +
        '<div class="guide-body"><ol class="guide-steps">' + g.steps.map(function (st, k) {
          return '<li data-goto="' + k + '"' + (k === si ? ' aria-current="step"' : '') + '><span class="n">' + (k + 1) + '</span><span>' + boldOnly(st.text) + '</span></li>';
        }).join('') + '</ol><div class="guide-pic">' + (s.image ? '<div class="stage-img" style="position:relative"><img alt="Step ' + (si + 1) + '" data-img="' + esc(name + '|' + s.image) + '" style="max-height:calc(100vh - 110px)">' + marks + '</div>' : '<p style="color:var(--stage-dim);max-width:46ch">' + boldOnly(s.text) + '</p>') + '</div></div>', g.title);
      watchImages(full);
    }
    full.onkeydown = function (e) { if (!$('.guide-body', full)) return; if (e.key === 'ArrowRight') draw(si + 1); if (e.key === 'ArrowLeft') draw(si - 1); };
    full.onclick = function (e) {
      var b = e.target.closest('[data-step]'); if (b) return draw(si + Number(b.getAttribute('data-step')));
      var li = e.target.closest('[data-goto]'); if (li) draw(Number(li.getAttribute('data-goto')));
    };
    draw(si || 0);
  }

  /* ---------- sign-in ---------- */
  var dlg = $('#signin-dlg'), tokenInput = $('#token-input'), tokenErr = $('#token-err');
  $('#token-link').href = 'https://github.com/settings/personal-access-tokens/new?' + new URLSearchParams({
    name: 'HelloWorld Hub', description: 'Read-only sign-in for ' + (CFG.hub && CFG.hub.url || 'the hub'),
    target_name: ACCOUNT, expires_in: '90', contents: 'read', metadata: 'read'
  }).toString();
  // With the GitHub App set up, "Sign in with GitHub" leads and the token route folds away.
  if (GH.authReady) {
    $('#app-signin').hidden = false;
    $('#token-summary').hidden = false;
    $('#token-way').open = false;
  }
  $('#gh-signin').addEventListener('click', function () {
    var btn = this, err = $('#gh-err');
    err.textContent = ''; btn.disabled = true;
    GH.signInWithGitHub().then(function (res) {
      dlg.close();
      toast('Signed in as ' + res.login);
      GH.loadRepos();
    }, function (e) { err.textContent = e.message; }).finally(function () { btn.disabled = false; });
  });
  function openSignIn() {
    tokenErr.textContent = ''; tokenInput.value = ''; $('#gh-err').textContent = '';
    dlg.showModal();
    (GH.authReady ? $('#gh-signin') : tokenInput).focus();
  }
  $('#signin-form').addEventListener('submit', function (e) {
    if (e.submitter && e.submitter.value === 'cancel') return;
    e.preventDefault();
    tokenErr.textContent = '';
    $('#token-go').disabled = true;
    GH.signIn(tokenInput.value).then(function (res) {
      tokenInput.value = '';
      dlg.close();
      toast('Signed in as ' + res.login);
      if (res.broad) toast('This token can also change your repos. A read-only fine-grained token is safer.', true);
      GH.loadRepos();
    }, function (err) { tokenErr.textContent = err.message; }).finally(function () { $('#token-go').disabled = false; });
  });
  $('#signin-btn').addEventListener('click', openSignIn);
  $('#signout-btn').addEventListener('click', function () { GH.signOut(); toast('Signed out. The sign-in is gone from this tab.'); GH.loadRepos(); });

  function syncAuth() {
    var s = GH.state, who = $('#who');
    $('#signin-btn').hidden = s.signedIn;
    $('#signout-btn').hidden = !s.signedIn || s.preview;
    who.hidden = !s.signedIn;
    who.innerHTML = s.signedIn ? (s.avatar ? '<img alt="" src="' + esc(s.avatar) + '">' : '') + '<span class="hdr-label">' + esc(s.login) + (s.preview ? ' (local preview)' : '') + '</span>' : '';
    $('[data-tab="health"]').hidden = !s.signedIn;
  }

  /* ---------- search with suggestions ---------- */
  var qInput = $('#q'), sugg = $('#suggest'), suggIndex = -1, suggItems = [];
  function closeSugg() { sugg.hidden = true; qInput.setAttribute('aria-expanded', 'false'); qInput.removeAttribute('aria-activedescendant'); suggIndex = -1; }
  function showSugg() {
    var text = qInput.value.trim();
    if (!text) return closeSugg();
    suggItems = list().filter(function (p) { return matches(p, text); }).sort(byRecent).slice(0, 8);
    sugg.innerHTML = suggItems.map(function (p, i) {
      return '<li id="sg-' + i + '" role="option" aria-selected="false" data-go="' + esc(p.name) + '"><span class="dot cdot" style="' + catStyle(p.category) + '"></span><span style="min-width:0"><span class="s-t">' + esc(p.title) + '</span><br><span class="s-d">' + esc(p.tagline || p.name) + '</span></span></li>';
    }).join('') + '<li id="sg-all" role="option" aria-selected="false" data-all="1"><span class="s-t">See every result for “' + esc(text) + '”</span></li>';
    sugg.hidden = false; qInput.setAttribute('aria-expanded', 'true'); suggIndex = -1;
  }
  function moveSugg(d) {
    var opts = $$('[role="option"]', sugg); if (!opts.length) return;
    suggIndex = (suggIndex + d + opts.length) % opts.length;
    opts.forEach(function (o, i) { o.setAttribute('aria-selected', String(i === suggIndex)); });
    qInput.setAttribute('aria-activedescendant', opts[suggIndex].id);
  }
  function pickSugg(li) {
    var text = qInput.value.trim();
    closeSugg();
    if (li && li.hasAttribute('data-go')) { location.hash = '#/p/' + enc(li.getAttribute('data-go')); qInput.value = ''; }
    else location.hash = '#/all' + (text ? '?q=' + enc(text) : '');
  }
  qInput.addEventListener('input', showSugg);
  qInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { if (sugg.hidden) showSugg(); moveSugg(1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { moveSugg(-1); e.preventDefault(); }
    else if (e.key === 'Enter') { pickSugg(suggIndex >= 0 ? $$('[role="option"]', sugg)[suggIndex] : null); e.preventDefault(); }
    else if (e.key === 'Escape') closeSugg();
  });
  qInput.addEventListener('blur', function () { setTimeout(closeSugg, 150); });
  sugg.addEventListener('mousedown', function (e) { var li = e.target.closest('[role="option"]'); if (li) { e.preventDefault(); pickSugg(li); } });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); qInput.focus(); }
  });

  /* ---------- the dashboard band ---------- */
  var dash = null;
  function dashModel() { return { projects: list(), hiddenCount: hiddenCount(), signedIn: GH.state.signedIn, account: ACCOUNT, loading: !GH.state.detailsReady }; }
  function updateHero() {
    var n = list().length, priv = list().filter(function (p) { return p.private; }).length;
    var sub = $('#hero-sub'), note = $('#hero-note');
    if (GH.state.repos.length) sub.textContent = plural(n, 'project') + (GH.state.signedIn ? ', ' + priv + ' of them private.' : ' you can see without signing in.') + ' Find one, read about it, try its demo and browse its code.';
    note.hidden = GH.state.signedIn || !GH.state.repos.length;
    note.innerHTML = 'Public projects only. <a href="#" data-action="signin">Sign in</a> to include private ones.';
    if (window.HWDash && !dash) {
      try { dash = window.HWDash.mount($('#hero-dash'), { mode: 'hero', onOpen: function (route) { location.hash = route.replace(/^#/, ''); } }); } catch (e) { console.error(e); }
    }
    if (dash && GH.state.repos.length) { try { dash.update(dashModel()); } catch (e) { console.error(e); } }
    if (!window.HWDash) $('#hero-dash').hidden = true;
  }

  /* ---------- router ---------- */
  function parseRoute() {
    var h = location.hash.replace(/^#/, '') || '/';
    var i = h.indexOf('?'), path = i >= 0 ? h.slice(0, i) : h, qs = i >= 0 ? h.slice(i + 1) : '';
    var parts = path.split('/').filter(Boolean).map(function (s) { try { return decodeURIComponent(s); } catch (e) { return s; } });
    var v = parts[0] || 'discover';
    if (v === 'cat' && parts[1]) { history.replaceState(null, '', '#/all?cat=' + enc(parts[1])); return parseRoute(); }
    return { path: path, parts: parts, q: new URLSearchParams(qs), view: v };
  }
  var lastPath = null, worldCtl = null;

  function render() {
    var route = parseRoute();
    var fn = own(R, route.view) ? R[route.view] : null;
    if (worldCtl && route.view !== 'world') { try { worldCtl.destroy(); } catch (e) {} worldCtl = null; }
    var html;
    try { html = fn ? fn(route) : emptyState('That page does not exist. <a href="#/">Go to Discover</a>.'); }
    catch (e) { console.error(e); html = emptyState('Something went wrong drawing this page. <a href="#/">Go to Discover</a>.'); }
    view.innerHTML = html;
    document.body.classList.toggle('is-compact', ['p', 'health', 'world'].indexOf(route.view) >= 0);
    $$('.tabs [data-tab]').forEach(function (t) {
      var on = t.getAttribute('data-tab') === route.view || (route.view === 'discover' && t.getAttribute('data-tab') === 'discover');
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    watchImages(view);
    fillReadmes(view);
    var code = $('#code-host', view); if (code) mountCode(code);
    var wh = $('#world-host', view);
    if (wh) {
      // The World is an ES module with three.js; it loads only when this view opens.
      import('./world.js?v=1').then(function (m) {
        if (!wh.isConnected) return;
        if (worldCtl) { try { worldCtl.destroy(); } catch (e) {} }
        worldCtl = m.mount(wh, { projects: list(), onOpen: function (rt) { location.hash = rt.replace(/^#/, ''); } });
      }).catch(function (e) {
        console.error(e);
        if (wh.isConnected) wh.innerHTML = emptyState('The World could not be loaded. <a href="#/all">See every project as a list</a>.');
      });
    }
    initSlides();
    if (route.path !== lastPath) {
      var moved = lastPath !== null;
      lastPath = route.path;
      var top = route.view === 'p' ? 0 : $('.xbar').offsetTop;
      if (moved && (route.view === 'p' || window.scrollY > top)) window.scrollTo({ top: top });
      var h2 = $('h2', view);
      if (moved) announce((h2 ? h2.textContent : 'Page') + ' loaded');
      if (moved && route.view === 'p') view.focus({ preventScroll: true });
    }
    if (route.view === 'p' && route.q.get('launch') === 'demo' && !full.open && GH.state.detailsReady) {
      var r = GH.findRepo(route.parts[1]);
      if (r && GH.info(r).demo) openDemo(r.name);
    }
  }

  var slideTimer = null;
  function initSlides() {
    clearInterval(slideTimer);
    var box = $('#p-media', view); if (!box) return;
    var slides = $$('.slide', box), dots = $$('[data-slide]', box), i = 0;
    if (slides.length < 2) return;
    function show(n) { i = (n + slides.length) % slides.length; slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); }); dots.forEach(function (d, k) { if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); }); }
    dots.forEach(function (d) { d.addEventListener('click', function () { show(Number(d.getAttribute('data-slide'))); }); });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      slideTimer = setInterval(function () { if (!box.matches(':hover') && !box.contains(document.activeElement)) show(i + 1); }, 6000);
    }
  }

  /* ---------- clicks and changes inside the view ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-demo],[data-clone],[data-copy],[data-action],[data-toggle],[data-lightbox],[data-guide]');
    if (!t) return;
    if (t.hasAttribute('data-demo')) { e.preventDefault(); openDemo(t.getAttribute('data-demo')); }
    else if (t.hasAttribute('data-clone')) copyText('git clone https://github.com/' + ACCOUNT + '/' + t.getAttribute('data-clone') + '.git', 'Clone command copied');
    else if (t.hasAttribute('data-copy')) copyText(t.getAttribute('data-copy'), 'Command copied');
    else if (t.getAttribute('data-action') === 'signin') { e.preventDefault(); openSignIn(); }
    else if (t.getAttribute('data-action') === 'retry') GH.loadRepos();
    else if (t.hasAttribute('data-toggle')) setFilter(t.getAttribute('data-toggle'), t.getAttribute('aria-pressed') === 'true' ? '' : '1');
    else if (t.hasAttribute('data-lightbox')) openLightbox(parseRoute().parts[1], Number(t.getAttribute('data-lightbox')));
    else if (t.hasAttribute('data-guide')) openGuide(parseRoute().parts[1], Number(t.getAttribute('data-guide')), 0);
  });
  view.addEventListener('change', function (e) {
    var s = e.target.closest('[data-filter]'); if (s) setFilter(s.getAttribute('data-filter'), s.value);
  });
  function setFilter(name, value) {
    var rt = parseRoute();
    if (value) rt.q.set(name, value); else rt.q.delete(name);
    if (name === 'sort' && value === 'recent') rt.q.delete('sort');
    history.replaceState(null, '', '#/all' + (rt.q.toString() ? '?' + rt.q : ''));
    var focusId = document.activeElement && document.activeElement.id;
    var toggle = document.activeElement && document.activeElement.getAttribute('data-toggle');
    render();
    if (focusId && document.getElementById(focusId)) document.getElementById(focusId).focus();
    else if (toggle) { var b = $('[data-toggle="' + toggle + '"]', view); if (b) b.focus(); }
  }

  window.addEventListener('hashchange', function () { closeSugg(); render(); });

  /* ---------- data events ---------- */
  GH.on('auth', syncAuth);
  GH.on('progress', updateLoad);
  GH.on('error', function () { updateLoad(); });
  GH.on('repos', function () { syncAuth(); updateHero(); render(); });
  GH.on('details', function () { syncAuth(); updateHero(); updateLoad(); render(); });

  $('[data-tab="world"]').hidden = false;
  syncAuth();
  render();
  GH.loadRepos();
})();
