/* HelloWorld hub: shell services (window.HWShell) and the loading status (window.HWLoad).
   Everything the page needs around the views: small helpers, toasts and announcements, the
   theme switch, the living bot in the header (it narrates loading), sign-in, the full-window
   viewer (demo, pictures, guides), README rendering, the code browser, lazy pictures, scroll
   reveals and the capsule curtain between major views.
   Data comes from window.HWGH (gh.js). Nothing here holds or sees the token. */
(function () {
  'use strict';

  var GH = window.HWGH, CFG = window.HW_CONFIG, ACCOUNT = CFG.account;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var own = function (o, k) { return o != null && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k); };

  /* ---------- small helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function enc(s) { return encodeURIComponent(s); }
  function store(key, val) { try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; } return val; }
  var rtf = new Intl.RelativeTimeFormat('en-IE', { numeric: 'auto' });
  function ago(iso) {
    if (!iso) return '';
    var t = new Date(iso).getTime(); if (isNaN(t)) return '';
    var s = (t - Date.now()) / 1000;
    var units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (var i = 0; i < units.length; i++) if (Math.abs(s) >= units[i][1]) return rtf.format(Math.round(s / units[i][1]), units[i][0]);
    return 'just now';
  }
  function dateText(iso, long) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IE', { day: 'numeric', month: long ? 'long' : 'short', year: 'numeric' });
  }
  function size(kb) { kb = Number(kb) || 0; return kb >= 1024 ? (kb / 1024).toFixed(kb >= 10240 ? 0 : 1) + ' MB' : Math.max(1, Math.round(kb)) + ' KB'; }
  function bytes(b) { b = Number(b) || 0; return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b > 1024 ? Math.round(b / 1024) + ' KB' : b + ' bytes'; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function hash(s) { var h = 2166136261; s = String(s || ''); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function boldOnly(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  function reduced() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function automated() { return !!navigator.webdriver; }

  /* ---------- line icons (Lucide geometry, stroke 2) ---------- */
  function svg(p, fill) {
    return '<svg viewBox="0 0 24 24" ' + (fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') + ' aria-hidden="true" focusable="false">' + p + '</svg>';
  }
  var ICONS = {
    play: ['<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/>', 1],
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    gh: ['<path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/>', 1],
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    left: '<path d="m15 5-7 7 7 7"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    folder: '<path d="M4 5a1 1 0 0 1 1-1h5l2 2h7a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5"/>',
    warn: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17v.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    full: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'
  };
  function icon(k) { var v = ICONS[k] || ICONS.info; return Array.isArray(v) ? svg(v[0], true) : svg(v); }

  var BOT_PATH = 'M131.31,279.37c-6.6.45-11.16-4.09-11.17-10.59l-.06-34.37-.5-3.43-12.83-.14-12.64-1.34c-31.71-4.98-58.72-27.8-69.35-58.06-.59-1.58-.69-3.34-2.7-3.64-14.52-2.11-24.11-15.27-21.68-30.31,1.43-8.82,8.4-16.93,17.26-19.68,2.17-.67,4.28-1.19,6.28-2.07,9.86-31.08,36.59-54.94,68.47-60.52,1.81-.42,4.52-1.13,6.44-1.14l46.72-.32.02-16.89c-9.61-4.53-13.45-12.73-11.29-23.15,1.28-6.2,7.84-12.48,14.03-13.35,2.85-.4,6.45-.61,9.3.02,18.07,4.41,19.41,29.92,2.17,36.33l-.02,17.09,47.34.17s4.47,1,4.47,1c32.61,4.96,60.14,29.63,70.11,61l4.97,1.33c26.47,7.07,25.21,45.22-1.67,50.19-1.04.14-3.21.72-3.49,1.63-3.32,10.75-8.65,20.02-15.58,28.66-13.9,17.09-33.17,28.38-55.07,31.75l-12.15,1.26-11.79.27-49.29,45.98c-1.83,1.7-4.12,2.16-6.27,2.31ZM209,208.38c27.22-4.7,49.31-26.66,54.16-53.54l1.06-6.51c1.16-5.76-.33-13.23-1.23-18.98l-.93-4.62-1.05-3.72c-1.62-6.19-5.22-11.91-8.76-17.21-11.47-16.01-29.55-26.72-49.19-28.61,0,0-100.23.02-100.23.02-2.74,0-5.76.8-8.27,1.32-34.3,6.79-58.62,41.43-52.63,76.02,4.05,27.73,27.19,52.09,55.09,55.95,0,0,10.74,1.19,10.74,1.19l24.96.26c5.05.05,8.43,5.22,8.49,10.03l.3,24.27c2.7-2.43,8.44-7.64,11.03-10.09,0,0,21.47-19.92,21.47-19.92,1.89-1.75,3.96-4.22,6.72-4.27,0,0,17.41-.27,17.41-.27l10.87-1.31Z';
  var EYE_L = 'M128.28,149.5c-.3,6.21-5.91,10.22-11.06,10.17-6.58-.06-11.35-4.64-11.51-11.39-.29-12.09-.48-24.24.1-36.29.29-6.13,6.2-10.25,11.44-10.15,5.94.11,10.87,4.61,11.1,11.13.41,12.06.53,24.21-.06,36.51Z';
  var EYE_R = 'M200.23,150.4c-1.48,6.96-7.65,10.57-14.52,8.93-3.39-1.44-7.71-4.87-7.74-9.18l-.25-35.95c-.04-6.43,3.86-11.52,10.33-12.26,5.18-.6,11.98,3.5,12.01,9.69l.17,38.77Z';
  /* The static bot mark: head in the text colour, eyes in the accent (flips with the theme). */
  function botSVG(cls, label) {
    return '<svg class="hw-botmark ' + (cls || '') + '" viewBox="0 0 306 306" ' + (label ? 'role="img" aria-label="' + esc(label) + '"' : 'aria-hidden="true"') + ' focusable="false"><g transform="translate(0,13.2)"><path class="hw-botmark-head" d="' + BOT_PATH + '"/><path class="hw-botmark-eye" d="' + EYE_L + '"/><path class="hw-botmark-eye" d="' + EYE_R + '"/></g></svg>';
  }

  /* ---------- announcements and toasts ---------- */
  var annT = null, annMsg = '';
  function announce(msg) {
    var a = $('#announce'); if (!a) return;
    annMsg = msg; clearTimeout(annT);
    annT = setTimeout(function () { a.textContent = ''; setTimeout(function () { a.textContent = annMsg; }, 40); }, 160);
  }
  function toast(msg, tone) {
    var host = $('#toasts'); if (!host) return;
    var warn = tone === true || tone === 'warn';
    var t = document.createElement('div');
    t.className = 'hw-toast' + (warn ? ' is-warn' : '');
    t.setAttribute('role', warn ? 'alert' : 'status');
    t.innerHTML = '<span class="hw-toast-i">' + icon(warn ? 'warn' : 'check') + '</span><span class="hw-toast-t"></span>';
    $('.hw-toast-t', t).textContent = msg;
    host.appendChild(t);
    setTimeout(function () {
      t.classList.add('is-out');
      setTimeout(function () { t.remove(); }, reduced() ? 0 : 420);
    }, warn ? 7000 : 4200);
  }
  function copy(text, label) {
    var done = function () { toast(label || 'Copied to the clipboard'); };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { done(); return true; }, function () { toast('The browser blocked copying. Select the text and copy it instead.', 'warn'); return false; });
    toast('Copying is not available in this browser.', 'warn');
    return Promise.resolve(false);
  }

  /* ---------- the living bot (assets/mascot, GSAP) ---------- */
  var mascotP = null;
  function mascotModule() {
    if (!mascotP) {
      mascotP = window.gsap
        ? import(new URL('assets/mascot/index.js', document.baseURI).href)
        : Promise.reject(new Error('GSAP is not loaded'));
      mascotP.catch(function () {});
    }
    return mascotP;
  }
  /* Mounts the real mascot in `el` (which sizes it). Returns a promise of the Mascot, or null when
     it cannot load (the static mark stays). Colours follow the theme through CSS. */
  function makeBot(el, mood) {
    return mascotModule().then(function (m) {
      if (!el.isConnected) return null;
      el.innerHTML = '';
      var bot = new m.Mascot({ mount: el, character: m.helloworld, mood: reduced() ? 'still' : (mood || 'calm') });
      ['--m-eye', '--m-type', '--m-accent'].forEach(function (p) { el.style.setProperty(p, 'var(--accent)'); });
      el.classList.add('hw-mascot');
      return bot;
    }).catch(function () { return null; });
  }
  /* A narrator for loading: performs a busy cycle while work goes on, then one outcome. */
  var BUSY = ['scan', 'thinking', 'working', 'look'];
  function narrator(botP) {
    var on = false, timer = null, i = 0, bot = null;
    botP.then(function (b) { bot = b; if (on) step(); });
    function step() {
      clearTimeout(timer);
      if (!on || !bot || reduced()) return;
      bot.play(BUSY[i++ % BUSY.length]);
      timer = setTimeout(step, 2400 + Math.random() * 1600);
    }
    return {
      busy: function () { if (on) return; on = true; i = 0; timer = setTimeout(step, 250); },
      done: function (outcome) {
        var was = on; on = false; clearTimeout(timer);
        if (bot && was && outcome && !reduced()) setTimeout(function () { bot.play(outcome); }, 120);
      }
    };
  }

  /* The header mark. It is the logo, alive (calm), and it narrates the data load. */
  var headerBot = null, headerNarr = null;
  /* The header band has its own bot, which narrates the load while it is on screen; the header
     mark narrates only when the band is hidden or scrolled away, so one bot speaks at a time. */
  function heroInSight() {
    var h = document.getElementById('hwh-hero');
    if (!h || h.hidden || !h.firstElementChild) return false;
    var r = h.getBoundingClientRect();
    return r.bottom > 80 && r.top < window.innerHeight;
  }
  (function () {
    var el = $('#hw-bot'); if (!el) return;
    headerBot = makeBot(el, 'calm');
    headerNarr = narrator(headerBot);
  })();

  /* A bot loader for a panel or the full-window viewer: one bot with a sentence under it. */
  function loader(el, label) {
    el.innerHTML = '<div class="hw-loader"><div class="hw-loader-bot">' + botSVG('', '') + '</div><p class="hw-loader-t" role="status"></p></div>';
    $('.hw-loader-t', el).textContent = label || 'Loading';
    var bp = makeBot($('.hw-loader-bot', el), reduced() ? 'still' : 'float');
    var n = narrator(bp); n.busy();
    return {
      say: function (t) { var p = $('.hw-loader-t', el); if (p) p.textContent = t; },
      done: function (ok) { n.done(ok === false ? 'notfound' : null); bp.then(function (b) { if (b && !el.contains(b.root)) b.destroy(); }); },
      destroy: function () { n.done(null); bp.then(function (b) { if (b) try { b.destroy(); } catch (e) {} }); }
    };
  }

  /* ---------- the loading status (HWLoad) ----------
     Stages, the first unfinished one wins: auth, repos, details, pics, files. Shows after 300 ms,
     says Ready 500 ms after the last load, hides 2.5 s later. fail(msg) shows Try again. Only the
     stage is announced (role=status); numbers are aria-hidden. */
  var HWLoad = (function () {
    var ORDER = ['auth', 'repos', 'details', 'pics', 'files'];
    var LABEL = { auth: 'Checking sign-in', repos: 'Loading projects', details: 'Loading details', pics: 'Loading pictures', files: 'Loading the City' };
    var st = {}, gen = 0, failMsg = '', shown = false, last = '', showT = null, idleT = null, hideT = null, everDone = false;
    ORDER.forEach(function (k) { st[k] = { n: 0, done: 0 }; });
    function active() { for (var i = 0; i < ORDER.length; i++) { var s = st[ORDER[i]]; if (s.done < s.n) return ORDER[i]; } return ''; }
    function amount(k) { var s = st[k]; return k === 'details' && s.n ? Math.floor(s.done / s.n * 100) + '%' : k === 'pics' && s.n > 1 ? s.done + ' of ' + s.n : ''; }
    function parts() { var box = $('#hw-load'); return box && { box: box, txt: $('.hw-load-txt', box), num: $('.hw-load-n', box), retry: $('#hw-load-retry') }; }
    function fit() {
      var P = parts(); if (!P || !P.box.classList.contains('is-on')) return;
      P.box.title = (P.txt.textContent + ' ' + P.num.textContent).trim();
      P.box.classList.remove('is-tight');
      if (P.txt.scrollWidth > P.txt.clientWidth + 1) P.box.classList.add('is-tight');
    }
    window.addEventListener('resize', fit, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    function showBox(P, on) { P.box.classList.toggle('is-on', on); P.box.setAttribute('aria-hidden', on ? 'false' : 'true'); }
    function paint() {
      var P = parts(); if (!P) return;
      var k = active();
      if (k) {
        clearTimeout(idleT); idleT = null; clearTimeout(hideT);
        last = k;
        P.box.classList.remove('is-done', 'is-fail');
        if (P.txt.textContent !== LABEL[k]) P.txt.textContent = LABEL[k];
        P.num.textContent = amount(k);
        if (P.retry) P.retry.hidden = true;
        if (headerNarr && (k === 'auth' || k === 'repos' || k === 'details' || k === 'files') && !heroInSight()) headerNarr.busy();
        fit();
        if (!shown && !showT) showT = setTimeout(function () { showT = null; if (active()) { shown = true; showBox(P, true); fit(); } }, 300);
        return;
      }
      clearTimeout(showT); showT = null;
      if (last) { P.num.textContent = amount(last); fit(); }
      if (!idleT) idleT = setTimeout(settle, 500);
    }
    function settle() {
      idleT = null;
      var P = parts(); if (!P || active()) return;
      clearTimeout(hideT); hideT = null;
      ORDER.forEach(function (x) { st[x].n = st[x].done = 0; });
      last = ''; P.num.textContent = '';
      if (failMsg) {
        P.box.classList.remove('is-done'); P.box.classList.add('is-fail'); P.txt.textContent = failMsg; showBox(P, true); shown = true;
        if (P.retry) P.retry.hidden = false;
        if (headerNarr) headerNarr.done('notfound');
        fit();
        return;
      }
      if (P.retry) P.retry.hidden = true;
      if (headerNarr) headerNarr.done(everDone ? null : 'found');
      everDone = true;
      if (!shown) return;
      P.box.classList.remove('is-fail'); P.box.classList.add('is-done'); P.txt.textContent = 'Ready'; fit();
      hideT = setTimeout(function () { hideT = null; if (active() || failMsg) return; showBox(P, false); shown = false; }, 2500);
    }
    function start(kind, weight) {
      if (!own(st, kind)) kind = 'pics';
      var g = gen, w = weight || 1, ended = false;
      st[kind].n += w; paint();
      return function () { if (ended || g !== gen) return; ended = true; st[kind].done += w; paint(); };
    }
    return {
      reset: function () { gen++; failMsg = ''; ORDER.forEach(function (k) { st[k].n = st[k].done = 0; }); paint(); },
      start: start,
      track: function (kind, p, weight) {
        var end = start(kind, weight);
        return Promise.resolve(p).then(function (v) { end(); return v; }, function (e) { end(); throw e; });
      },
      /* set the count of a stage outright (used by the bridge from HWGH events) */
      set: function (kind, done, n) { if (!own(st, kind)) return; st[kind].n = Math.max(0, n); st[kind].done = Math.max(0, Math.min(done, n)); paint(); },
      fail: function (msg) { failMsg = msg || 'Could not load everything'; paint(); },
      clear: function () { failMsg = ''; paint(); }
    };
  })();
  window.HWLoad = HWLoad;

  /* Bridge: HWGH progress (auth, repos, details) and load events (pics, files, trees) to HWLoad. */
  (function () {
    var base = Object.create(null);
    GH.on('loading', function () { HWLoad.reset(); });
    GH.on('progress', function (p) {
      if (!p) return;
      if (p.stage === 'auth') HWLoad.set('auth', 0, 1);
      else if (p.stage === 'repos') { HWLoad.set('auth', 1, 1); HWLoad.set('repos', 0, 1); }
      else if (p.stage === 'details') { HWLoad.set('auth', 1, 1); HWLoad.set('repos', 1, 1); HWLoad.set('details', p.done, p.total || 1); }
      else if (p.stage === 'ready') { HWLoad.set('auth', 1, 1); HWLoad.set('repos', 1, 1); HWLoad.set('details', 1, 1); }
    });
    GH.on('load', function (e) {
      if (!e || typeof e.kind !== 'string') return;
      var kind = e.kind === 'trees' || e.kind === 'files' ? 'files' : 'pics';
      var key = e.kind, total = (e.pending || 0) + (e.done || 0) + (e.failed || 0), fin = (e.done || 0) + (e.failed || 0);
      if (!(key in base)) base[key] = 0;
      HWLoad.set(kind, fin - base[key], total - base[key]);
      if (!e.pending) base[key] = fin;
    });
    GH.on('error', function (e) {
      HWLoad.fail(e instanceof GH.RateLimit ? 'GitHub limit reached' : 'Could not load everything');
    });
    var retry = $('#hw-load-retry');
    if (retry) retry.addEventListener('click', function () { HWLoad.clear(); GH.loadRepos(); });
  })();

  /* ---------- pictures: loaded when they come near the screen ---------- */
  function image(repoName, path) {
    var p = GH.image(repoName, path);
    return GH.trackLoad ? GH.trackLoad('pics', p) : HWLoad.track('pics', p);
  }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); loadImg(e.target); } });
  }, { rootMargin: '300px' }) : null;
  function watchImages(root) { $$('img[data-img]', root || document).forEach(function (img) { if (io) io.observe(img); else loadImg(img); }); }
  function loadImg(img) {
    var spec = img.getAttribute('data-img'); if (!spec) return;
    var i = spec.indexOf('|');
    img.removeAttribute('data-img');
    image(spec.slice(0, i), spec.slice(i + 1)).then(function (url) {
      img.addEventListener('load', function () { img.classList.add('is-on'); }, { once: true });
      img.src = url;
    }, function () { img.remove(); });
  }

  /* ---------- scroll reveal ----------
     Anything below the fold waits, already hidden, before it reaches the screen, so nothing shows and
     then blinks out (the old flash). As it arrives it rises in softly, a few at a time in reading
     order. The rise runs on the `translate` property through the Web Animations API and holds nothing
     once it ends, so a card's own `transform` stays free and its hover lift eases in and out on its
     own curve. Things already on screen when a view draws arrive with the view. Reduced motion,
     automated browsers and old browsers: everything is simply there. */
  var revealObs = null;
  function revealDone(el) { el.classList.remove('hw-rv-wait'); el.classList.add('hw-rv-done'); }
  function rise(el, k) {
    var delay = Math.min(k, 7) * 75;
    try {
      el.animate([{ opacity: 0, translate: '0 28px' }, { opacity: 1, translate: '0 0' }],
        { duration: 950, delay: delay, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    } catch (e) {}
    revealDone(el);                 // the animation's backwards fill keeps it hidden through the delay
  }
  function observeReveals(scope) {
    var all = $$('.hw-rv:not(.hw-rv-done)', scope || document);
    if (reduced() || automated() || !('IntersectionObserver' in window) || !Element.prototype.animate) { all.forEach(revealDone); return; }
    if (revealObs) revealObs.disconnect();
    revealObs = new IntersectionObserver(function (entries) {
      var come = entries.filter(function (en) { return en.isIntersecting; }).map(function (en) { return en.target; });
      come.sort(function (a, b) { var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return (ra.top - rb.top) || (ra.left - rb.left); });
      come.forEach(function (el, k) { revealObs.unobserve(el); rise(el, k); });
    }, { threshold: 0.06, rootMargin: '0px 0px -3% 0px' });
    var vh = window.innerHeight;
    all.forEach(function (el) {
      if (el.getBoundingClientRect().top < vh * 0.97) { revealDone(el); return; }
      el.classList.add('hw-rv-wait');
      revealObs.observe(el);
    });
  }

  /* ---------- the capsule curtain between major views ----------
     Two violet 2:5 pills close over 0.4 s, the page changes behind them, they open over 0.4 s.
     The header bar stays above. Reduced motion: the page changes at once. */
  var curtainBusy = false;
  function curtain(swap) {
    var c = $('#hw-curtain');
    if (!c || reduced() || automated() || curtainBusy) { swap(); return Promise.resolve(); }
    curtainBusy = true;
    return new Promise(function (resolve) {
      c.hidden = false;
      c.getBoundingClientRect();
      c.classList.add('is-closed');
      setTimeout(function () {
        try { swap(); } catch (e) { console.error(e); }
        requestAnimationFrame(function () {
          c.classList.remove('is-closed');
          setTimeout(function () { c.hidden = true; curtainBusy = false; resolve(); }, 430);
        });
      }, 420);
    });
  }

  /* ---------- theme ---------- */
  (function () {
    var btn = $('#theme-btn'); if (!btn) return;
    function sync() {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      btn.setAttribute('aria-pressed', String(dark));
      var label = dark ? 'Switch to light mode' : 'Switch to dark mode';
      btn.title = label; btn.setAttribute('aria-label', label);
      btn.innerHTML = icon(dark ? 'sun' : 'moon');
      var meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', dark ? '#15121d' : '#f7f6fb');
    }
    btn.addEventListener('click', function () {
      var dark = document.documentElement.getAttribute('data-theme') !== 'dark';
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      store('hw_theme', dark ? 'dark' : 'light');
      sync();
      document.dispatchEvent(new CustomEvent('hw-theme', { detail: { theme: dark ? 'dark' : 'light' } }));
    });
    sync();
  })();

  /* ---------- sign-in (the GitHub App route and the token route, as before) ---------- */
  var dlg = $('#signin-dlg'), tokenInput = $('#token-input'), tokenErr = $('#token-err');
  var signLoader = null;
  function afterSignIn(res) {
    dlg.close();
    toast('Signed in as ' + res.login + '.');
    if (res.broad) toast('This token can also change your repos. A read-only fine-grained token is safer.', 'warn');
    signLoader = fullLoader('Loading your projects');
    GH.loadRepos();
  }
  if (dlg) {
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
      GH.signInWithGitHub({ remember: !!($('#gh-remember') && $('#gh-remember').checked) }).then(afterSignIn, function (e) { err.textContent = e.message; }).finally(function () { btn.disabled = false; });
    });
    $('#signin-form').addEventListener('submit', function (e) {
      if (e.submitter && e.submitter.value === 'cancel') return;
      e.preventDefault();
      tokenErr.textContent = '';
      $('#token-go').disabled = true;
      GH.signIn(tokenInput.value).then(function (res) { tokenInput.value = ''; afterSignIn(res); },
        function (err) { tokenErr.textContent = err.message; }).finally(function () { $('#token-go').disabled = false; });
    });
    $('#signin-btn').addEventListener('click', openSignIn);
    $('#signout-btn').addEventListener('click', function () {
      var everywhere = GH.staysSignedIn && GH.staysSignedIn();
      GH.signOut();
      toast(everywhere ? 'Signed out on this device. The sign-in is ended at GitHub too.' : 'Signed out. The sign-in is gone from this tab.');
      GH.loadRepos();
    });
  }
  function openSignIn() {
    if (!dlg) return;
    tokenErr.textContent = ''; tokenInput.value = ''; $('#gh-err').textContent = '';
    dlg.showModal();
    (GH.authReady ? $('#gh-signin') : tokenInput).focus();
  }
  function syncAuth() {
    var s = GH.state, who = $('#who'); if (!who) return;
    $('#signin-btn').hidden = s.signedIn;
    $('#signout-btn').hidden = !s.signedIn || s.preview;
    who.hidden = !s.signedIn;
    who.innerHTML = s.signedIn ? (s.avatar ? '<img alt="" width="28" height="28" src="' + esc(s.avatar) + '">' : '') + '<span class="hw-hdr-label">' + esc(s.login) + (s.preview ? ' (local preview)' : '') + '</span>' : '';
  }
  GH.on('auth', syncAuth);
  GH.on('repos', function () { syncAuth(); if (signLoader) { signLoader(); signLoader = null; } });
  GH.on('error', function () { if (signLoader) { signLoader(); signLoader = null; } });
  syncAuth();

  /* A full-window bot loader (after signing in, while the projects reload). Returns close(). */
  function fullLoader(label) {
    var ov = document.createElement('div');
    ov.className = 'hw-fullload';
    document.body.appendChild(ov);
    var l = loader(ov, label);
    requestAnimationFrame(function () { ov.classList.add('is-on'); });
    var closed = false;
    return function () {
      if (closed) return; closed = true;
      ov.classList.remove('is-on');
      setTimeout(function () { l.destroy(); ov.remove(); }, reduced() ? 0 : 450);
    };
  }

  /* ---------- the full-window viewer: demo, pictures, guides ---------- */
  var full = $('#full-dlg'), fullClose = null, fullOpener = null;
  function openFull(html, label, onClose) {
    if (!full.open) fullOpener = document.activeElement;
    full.innerHTML = html; full.setAttribute('aria-label', label);
    fullClose = onClose || null;
    if (!full.open) full.showModal();
    var f = $('[data-autofocus]', full) || $('[data-close]', full); if (f) f.focus();
  }
  function closeFull() { if (full.open) full.close(); }
  if (full) {
    full.addEventListener('close', function () {
      var f = fullClose; fullClose = null;
      $$('.hw-loader', full).forEach(function () {});
      full.innerHTML = ''; full.onkeydown = null; full.onclick = null;
      if (f) f();
      if (fullOpener && fullOpener.isConnected) try { fullOpener.focus({ preventScroll: true }); } catch (e) {}
      fullOpener = null;
    });
    full.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) { e.preventDefault(); closeFull(); } });
  }
  function bar(title, note, extra) {
    return '<div class="hw-full-bar"><span class="hw-full-t">' + esc(title) + '</span>' + (note ? '<span class="hw-full-note">' + note + '</span>' : '') +
      '<span class="hw-full-sp"></span>' + (extra || '') +
      '<button class="btn btn-quiet btn-sm" type="button" data-close>' + icon('close') + 'Close</button></div>';
  }

  /* Demos run sealed: no access to this page, its address or its storage. One strict tier. */
  var DEMO_POLICY = "default-src 'none'; script-src 'unsafe-inline' blob:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src data: https://fonts.gstatic.com; img-src data: blob:; media-src data: blob:; connect-src 'none'; form-action 'none'; worker-src blob:";
  var DEMO_SHIM = '(function(){function m(){var d={};return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}' +
    'try{Object.defineProperty(window,"localStorage",{value:m(),configurable:true})}catch(e){}try{Object.defineProperty(window,"sessionStorage",{value:m(),configurable:true})}catch(e){}})();';
  var DEMO_WARN = 'This is a demo, not the hub. Never type a password or a sign-in code here.';

  /* openDemo(repoName, {confirmFirst, onClose, title}). confirmFirst: a link alone never runs a
     demo; the viewer sees whose page it is and who last changed it, and clicks. */
  function openDemo(name, opts) {
    opts = opts || {};
    var r = GH.findRepo(name, { ci: true }); if (!r) return;
    var p = GH.info(r);
    if (!p.demo) { toast('This project has no demo.', 'warn'); return; }
    var title = opts.title || p.title || r.name;
    var extra = '<a class="btn btn-quiet btn-sm" href="' + esc(r.html_url) + '" target="_blank" rel="noopener noreferrer">' + icon('gh') + 'Open on GitHub<span class="sr-only"> (opens in a new tab)</span></a>';
    openFull(bar('Demo: ' + title, '<span class="hw-badge">Demo</span>', extra) +
      '<div class="hw-demo-warn" role="note">' + icon('warn') + '<span>' + esc(DEMO_WARN) + '</span></div>' +
      '<div class="hw-demo-stage" id="hw-demo-stage"></div>', 'Demo of ' + title, opts.onClose);
    var stage = $('#hw-demo-stage', full);
    if (!opts.confirmFirst) return loadDemo();
    stage.innerHTML = '<div class="hw-demo-confirm" role="group" aria-labelledby="hw-demo-q">' +
      '<span class="eyebrow">Demo</span><h2 id="hw-demo-q"></h2>' +
      '<p>A demo is a page made for this project. It opens inside the hub, but it is not the hub, and it runs sealed off: it cannot reach your sign-in or send anything anywhere.</p>' +
      '<p class="hw-demo-prov" aria-live="polite">Checking who last changed it.</p>' +
      '<p class="hw-demo-never">' + icon('warn') + '<span>Never type a password or a sign-in code into a demo.</span></p>' +
      '<div class="hw-demo-actions"><button type="button" class="btn btn-primary" data-autofocus data-demo-go>' + icon('play') + 'Open the demo</button>' +
      '<button type="button" class="btn btn-quiet" data-close>Back to the project</button></div></div>';
    $('#hw-demo-q', stage).textContent = 'Open the demo of ' + title + '?';
    var go = $('[data-demo-go]', stage); go.focus();
    go.addEventListener('click', loadDemo);
    var prov = $('.hw-demo-prov', stage);
    if (GH.lastCommitFor) {
      Promise.resolve(GH.lastCommitFor(r.name, p.demo)).then(function (c) {
        if (!prov.isConnected) return;
        prov.textContent = c && (c.login || c.date)
          ? 'The demo was last changed' + (c.login ? ' by ' + c.login : '') + (c.date ? ' on ' + dateText(c.date, true) : '') + '.'
          : 'GitHub did not say who last changed the demo.';
      }, function () { if (prov.isConnected) prov.textContent = 'GitHub did not say who last changed the demo.'; });
    } else prov.textContent = 'The project was last changed ' + ago(p.pushed_at) + '.';

    function loadDemo() {
      var st = $('#hw-demo-stage', full); if (!st) return;
      var l = loader(st, 'Opening the demo');
      GH.fileText(r.name, p.demo).then(function (html) {
        if (!full.open || !st.isConnected) return;
        var head = '<meta http-equiv="Content-Security-Policy" content="' + DEMO_POLICY + '"><script>' + DEMO_SHIM + '<\/script>';
        var m = html.match(/^\s*<!doctype[^>]*>/i);
        var doc = m ? m[0] + head + html.slice(m[0].length) : '<!doctype html>' + head + html;
        var frame = document.createElement('iframe');
        frame.className = 'hw-demo-frame';
        frame.title = 'Demo of ' + title;
        // SECURITY: never add allow-same-origin. The demo must not run as this page.
        frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-modals allow-downloads allow-pointer-lock');
        frame.setAttribute('allow', 'fullscreen; gamepad; clipboard-write');
        frame.setAttribute('referrerpolicy', 'no-referrer');
        frame.srcdoc = doc;
        l.destroy();
        st.innerHTML = ''; st.appendChild(frame);
        frame.focus();
      }, function (e) {
        if (!st.isConnected) return;
        l.done(false);
        l.say(e.status === 404 ? 'The demo file ' + p.demo + ' is not in the repo.' : 'The demo could not be loaded. ' + (GH.state.signedIn ? 'Try again in a minute.' : 'It may be private: sign in to open it.'));
      });
    }
  }

  /* Pictures: the cover first, then the gallery. Arrow keys move, Escape closes. */
  function openLightbox(name, index) {
    var r = GH.findRepo(name, { ci: true }); if (!r) return;
    var p = GH.info(r), items = [];
    if (p.cover) items.push({ src: p.cover, caption: '', alt: p.title + ': cover picture' });
    (p.gallery || []).forEach(function (g) { items.push({ src: g.src, caption: g.caption || '', alt: g.alt || g.caption || p.title }); });
    if (!items.length) return;
    index = Math.max(0, Math.min(items.length - 1, index || 0));
    function draw(i, first) {
      index = (i + items.length) % items.length;
      var g = items[index];
      var html = bar(p.title, esc(index + 1 + ' of ' + items.length)) +
        '<div class="hw-lb"><figure class="hw-lb-fig">' +
        (items.length > 1 ? '<button class="btn btn-icon hw-lb-prev" type="button" data-lb="-1" aria-label="Previous picture">' + icon('left') + '</button>' : '') +
        '<div class="hw-lb-img"><img alt="' + esc(g.alt) + '" data-img="' + esc(r.name + '|' + g.src) + '"></div>' +
        (items.length > 1 ? '<button class="btn btn-icon hw-lb-next" type="button" data-lb="1" aria-label="Next picture">' + icon('right') + '</button>' : '') +
        '<figcaption class="hw-lb-cap">' + esc(g.caption) + '</figcaption></figure></div>';
      if (first) openFull(html, 'Pictures of ' + p.title);
      else { full.innerHTML = html; var b = $('[data-lb="' + (lastDir > 0 ? 1 : -1) + '"]', full); if (b) b.focus(); }
      watchImages(full);
      announce('Picture ' + (index + 1) + ' of ' + items.length + (g.caption ? ': ' + g.caption : ''));
    }
    var lastDir = 1;
    draw(index, true);
    full.onkeydown = function (e) { if (!$('.hw-lb', full)) return; if (e.key === 'ArrowRight') { lastDir = 1; draw(index + 1); } if (e.key === 'ArrowLeft') { lastDir = -1; draw(index - 1); } };
    full.onclick = function (e) { var b = e.target.closest('[data-lb]'); if (b) { lastDir = Number(b.getAttribute('data-lb')); draw(index + lastDir); } };
  }

  /* Guide marks (hub card standard): n is the badge, label is the control's interface label and
     the text alternative. A box per mark, kept inside the picture; badges and labels move inside
     when the mark touches an edge. They fade in one at a time. */
  var LETTERS = 'ABCDEFGHIJ';
  function clamp(v) { v = Number(v); return isFinite(v) ? Math.max(0, Math.min(100, v)) : 0; }
  function marksHTML(marks, si) {
    return (marks || []).map(function (m, k) {
      var mk = (CFG.mark_kinds && own(CFG.mark_kinds, m.kind)) ? CFG.mark_kinds[m.kind] : {};
      var x = clamp(m.x), y = clamp(m.y), w = Math.min(clamp(m.w), 100 - x), h = Math.min(clamp(m.h), 100 - y);
      var label = m.label ? String(m.label) : '';
      var n = m.n != null && m.n !== '' ? String(m.n).slice(0, 3) : '';
      if (!n && label && label.length <= 3 && m.kind !== 'focus') { n = label; label = ''; }
      if (!n && m.kind !== 'focus') n = mk.badge === 'number' ? String((si || 0) + 1) : mk.badge === 'letter' ? LETTERS[k] || '' : '';
      var edge = (y < 6 ? ' at-top' : '') + (x < 4 ? ' at-left' : '') + (x + w > 80 ? ' at-right' : '') + (y + h > 88 ? ' at-bottom' : '');
      return '<span class="hw-mark k-' + esc(m.kind) + edge + '" style="--mk:' + esc(mk.colour || '#6d44e0') + ';--mi:' + k + ';left:' + x + '%;top:' + y + '%;width:' + w + '%;height:' + h + '%">' +
        (n && m.kind !== 'focus' ? '<span class="hw-mark-n" aria-hidden="true">' + esc(n) + '</span>' : '') +
        (label ? '<span class="hw-mark-l" role="note">' + esc(label) + '</span>' : '') + '</span>';
    }).join('');
  }
  function stepAlt(s, si) { return s.alt || ('Step ' + (si + 1) + ': ' + String(s.text || '').replace(/\*\*/g, '')); }

  /* The full-window guide: a step list (each step a button), the picture with its marks, Back and Next. */
  function openGuide(name, gi, si) {
    var r = GH.findRepo(name, { ci: true }); if (!r) return;
    var p = GH.info(r), g = (p.guides || [])[gi];
    if (!g || !g.steps.length) return;
    function draw(i, first) {
      si = Math.max(0, Math.min(g.steps.length - 1, i));
      var s = g.steps[si];
      var html = bar(g.title, esc('Step ' + (si + 1) + ' of ' + g.steps.length),
        '<button class="btn btn-quiet btn-sm" type="button" data-step="-1"' + (si === 0 ? ' disabled' : '') + '>' + icon('left') + 'Back</button>' +
        '<button class="btn btn-primary btn-sm" type="button" data-step="1"' + (si === g.steps.length - 1 ? ' disabled' : '') + '>Next' + icon('right') + '</button>') +
        '<div class="hw-guide-full"><ol class="hw-guide-steps">' + g.steps.map(function (st, k) {
          return '<li><button type="button" data-goto="' + k + '"' + (k === si ? ' aria-current="step"' : '') + '><span class="n">' + (k + 1) + '</span><span>' + boldOnly(st.text) + '</span></button></li>';
        }).join('') + '</ol><div class="hw-guide-pic">' +
        (s.image ? '<div class="hw-shot"><img alt="' + esc(stepAlt(s, si)) + '" data-img="' + esc(r.name + '|' + s.image) + '">' + marksHTML(s.marks, si) + '</div>' : '<p class="hw-guide-text">' + boldOnly(s.text) + '</p>') +
        '</div></div>';
      if (first) openFull(html, g.title);
      else { full.innerHTML = html; var cur = $('[aria-current="step"]', full); if (cur) cur.focus(); }
      watchImages(full);
      announce('Step ' + (si + 1) + ' of ' + g.steps.length + ': ' + String(s.text || '').replace(/\*\*/g, ''));
    }
    draw(si || 0, true);
    full.onkeydown = function (e) {
      if (!$('.hw-guide-full', full)) return;
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && e.target === full)) { draw(si + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { draw(si - 1); e.preventDefault(); }
    };
    full.onclick = function (e) {
      var b = e.target.closest('[data-step]'); if (b && !b.disabled) return draw(si + Number(b.getAttribute('data-step')));
      var li = e.target.closest('[data-goto]'); if (li) draw(Number(li.getAttribute('data-goto')));
    };
  }

  /* ---------- README and Markdown (marked, then DOMPurify, then safe links and pictures) ---------- */
  if (window.hljs) window.hljs.configure({ ignoreUnescapedHTML: true });
  function resolvePath(base, rel) {
    try {
      var u = new URL(rel, 'https://x.invalid/' + (base ? base.replace(/[^/]*$/, '') : ''));
      return decodeURIComponent(u.pathname.slice(1));
    } catch (e) { return null; }
  }
  function slug(t) { return 'md-' + String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }
  function renderMarkdown(md, repoName, path) {
    var r = GH.findRepo(repoName, { ci: true });
    var html = window.marked ? window.marked.parse(md, { gfm: true, async: false }) : '<pre>' + esc(md) + '</pre>';
    var clean = window.DOMPurify ? window.DOMPurify.sanitize(html, {
      FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'textarea', 'select', 'video', 'audio', 'object', 'embed'],
      FORBID_ATTR: ['style', 'id', 'name'], SANITIZE_NAMED_PROPS: true
    }) : esc(md);
    var box = document.createElement('div');
    box.className = 'hw-md';
    box.innerHTML = clean;
    // Headings get ids (prefixed, so they cannot clash with the page), and in-page links work.
    var seen = Object.create(null);
    $$('h1,h2,h3,h4', box).forEach(function (h) { var id = slug(h.textContent); if (seen[id]) id += '-' + (++seen[id]); else seen[id] = 1; h.id = id; });
    $$('a[href]', box).forEach(function (a) {
      var h = a.getAttribute('href');
      if (/^#/.test(h)) {
        var target = slug(decodeURIComponent(h.slice(1)).replace(/-/g, ' '));
        a.setAttribute('href', '#'); a.setAttribute('data-md-go', target);
        return;
      }
      if (/^(https?:|mailto:)/i.test(h)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
      var t2 = resolvePath(path, h);
      if (t2 && r) { a.href = 'https://github.com/' + ACCOUNT + '/' + enc(r.name) + '/blob/' + enc(r.default_branch) + '/' + t2.split('/').map(enc).join('/'); a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      else a.removeAttribute('href');
    });
    var ownPic = new RegExp('^https://(?:github\\.com/' + ACCOUNT + '/([^/]+)/(?:raw|blob)/[^/]+|raw\\.githubusercontent\\.com/' + ACCOUNT + '/([^/]+)/[^/]+)/(.+)$', 'i');
    $$('img[src]', box).forEach(function (img) {
      var s = img.getAttribute('src');
      if (/^data:image\//i.test(s)) return;
      var m = s.match(ownPic);
      if (m && GH.findRepo(m[1] || m[2], { ci: true })) {
        // A picture in one of our repos: load it with the viewer's access (private repos too).
        var p2 = null; try { p2 = decodeURIComponent(m[3].split(/[?#]/)[0]); } catch (e) {}
        img.removeAttribute('src');
        if (p2 && GH.safePath(p2)) { img.setAttribute('data-img', GH.findRepo(m[1] || m[2], { ci: true }).name + '|' + p2); img.loading = 'lazy'; } else img.remove();
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
      if (target && GH.safePath(target) && r) { img.setAttribute('data-img', r.name + '|' + target); img.loading = 'lazy'; }
      else img.remove();
    });
    if (window.hljs) $$('pre code', box).forEach(function (el) { try { window.hljs.highlightElement(el); } catch (e) {} });
    box.addEventListener('click', function (e) {
      var a = e.target.closest('[data-md-go]'); if (!a) return;
      e.preventDefault();
      var h = document.getElementById(a.getAttribute('data-md-go'));
      if (h) { h.setAttribute('tabindex', '-1'); h.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); h.focus({ preventScroll: true }); }
    });
    watchImages(box);
    return box;
  }
  /* Renders a repo's README into el (replacing its content). Returns the rendered box or null. */
  function renderReadme(el, repoName) {
    var r = GH.findRepo(repoName, { ci: true });
    if (!r || !r.readme) { el.innerHTML = '<p class="hw-muted">' + (GH.state.detailsReady ? 'This project has no README yet.' : 'The README is still loading.') + '</p>'; return null; }
    var box = renderMarkdown(r.readme, r.name, 'README.md');
    el.innerHTML = ''; el.appendChild(box);
    return box;
  }

  /* ---------- code browser: an ARIA tree of files and a viewer ---------- */
  var LANG_BY_EXT = { js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', json: 'json', html: 'xml', htm: 'xml', xml: 'xml', svg: 'xml', css: 'css', scss: 'scss', less: 'less', php: 'php', py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin', swift: 'swift', c: 'c', h: 'c', cpp: 'cpp', cs: 'csharp', sh: 'bash', zsh: 'bash', bash: 'bash', yml: 'yaml', yaml: 'yaml', toml: 'ini', ini: 'ini', sql: 'sql', md: 'markdown', vue: 'xml', svelte: 'xml', lua: 'lua' };
  var IMG_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
  var BIN_EXT = /\.(zip|gz|tgz|rar|7z|pdf|docx?|xlsx?|pptx?|mp3|mp4|mov|wav|ogg|webm|woff2?|ttf|otf|eot|ico|exe|dll|so|dylib|bin|sav|gb|gbc|gba|nes|sfc|smc|z64|jar|class|psd|ai|sketch|fig)$/i;

  function mountCode(host) {
    var name = host.getAttribute('data-repo'), r = GH.findRepo(name, { ci: true });
    if (!r) return;
    host.innerHTML = '<div class="hw-code"><div class="hw-tree" role="tree" aria-label="Files of ' + esc(r.name) + '"><div class="hw-skel" style="height:14px;margin:8px"></div><div class="hw-skel" style="height:14px;margin:8px;width:70%"></div></div>' +
      '<div class="hw-viewer"><div class="hw-viewer-head"><span class="path">Select a file</span><a class="btn btn-quiet btn-sm" href="' + esc(r.html_url) + '" target="_blank" rel="noopener noreferrer">' + icon('gh') + 'Open on GitHub<span class="sr-only"> (opens in a new tab)</span></a></div><div class="hw-viewer-body" tabindex="0" aria-label="File contents"></div></div></div>';
    var treeEl = $('.hw-tree', host), body = $('.hw-viewer-body', host), head = $('.hw-viewer-head .path', host);
    var tp = GH.tree(r.name);
    (GH.trackLoad ? GH.trackLoad('files', tp) : tp).then(function (t) {
      var root = { dirs: {}, files: [] };
      t.items.forEach(function (i) {
        var parts = i.path.split('/'), node = root;
        for (var k = 0; k < parts.length - 1; k++) { if (!own(node.dirs, parts[k])) node.dirs[parts[k]] = { dirs: {}, files: [] }; node = node.dirs[parts[k]]; }
        var last = parts[parts.length - 1];
        if (i.type === 'tree') { if (!own(node.dirs, last)) node.dirs[last] = { dirs: {}, files: [] }; }
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
          out += '<li role="none"><span role="treeitem" tabindex="-1" aria-selected="false" data-file="' + esc(f.path) + '" data-size="' + (Number(f.size) || 0) + '">' + esc(f.path.split('/').pop()) + '</span></li>';
        });
        return out + '</ul>';
      }
      treeEl.innerHTML = ul(root, '', 0) + (t.truncated ? '<p class="hw-muted" style="padding:8px">This repo is too large to list in full.</p>' : '');
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
        else if (e.key === 'Home' && list[0]) { focusItem(list[0]); e.preventDefault(); }
        else if (e.key === 'End' && list.length) { focusItem(list[list.length - 1]); e.preventDefault(); }
        else if (e.key === 'Enter' || e.key === ' ') { if (it.hasAttribute('data-dir')) toggle(it); else select(it); e.preventDefault(); }
      });
      var readme = $('[data-file="README.md"]', treeEl) || $('[data-file="readme.md"]', treeEl);
      if (readme) select(readme);
    }, function (e) {
      treeEl.innerHTML = '<p style="padding:12px">The file list could not be loaded (' + esc(e.message) + ').</p>';
    });

    function openFile(path, sz) {
      head.textContent = path;
      body.innerHTML = '<div class="hw-skel" style="height:200px;margin:16px"></div>';
      var ext = (path.split('.').pop() || '').toLowerCase();
      if (IMG_EXT.test(path)) {
        body.innerHTML = '<div class="hw-img-view"><img alt="' + esc(path) + '" data-img="' + esc(r.name + '|' + path) + '"></div>';
        return watchImages(body);
      }
      if (BIN_EXT.test(path)) { body.innerHTML = '<p style="padding:16px">This is a binary file. Open it on GitHub to download it.</p>'; return; }
      if (sz > 400 * 1024) { body.innerHTML = '<p style="padding:16px">This file is ' + size(Math.round(sz / 1024)) + ', too large to show here. Open it on GitHub.</p>'; return; }
      GH.fileText(r.name, path).then(function (text) {
        if (ext === 'md') { body.innerHTML = ''; body.appendChild(renderMarkdown(text, r.name, path)); return; }
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

  /* ---------- Escape: close the open viewer first (native dialogs do this themselves) ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var tipEl = document.getElementById('hwx-tip'); if (tipEl) tipEl.classList.remove('is-on');
  });

  window.HWShell = {
    esc: esc, enc: enc, own: own, store: store, ago: ago, timeAgo: ago, dateText: dateText, size: size, bytes: bytes,
    plural: plural, hash: hash, boldOnly: boldOnly, reduced: reduced, icon: icon, botSVG: botSVG,
    announce: announce, toast: toast, copy: copy,
    makeBot: makeBot, loader: loader, fullLoader: fullLoader, headerBot: function () { return headerBot; },
    openSignIn: openSignIn, syncAuth: syncAuth,
    openFull: openFull, closeFull: closeFull, openDemo: openDemo, openLightbox: openLightbox, openGuide: openGuide,
    marksHTML: marksHTML, stepAlt: stepAlt,
    renderMarkdown: renderMarkdown, renderReadme: renderReadme, mountCode: mountCode,
    image: image, watchImages: watchImages, observeReveals: observeReveals, curtain: curtain
  };
})();
