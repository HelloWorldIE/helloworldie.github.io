/* HelloWorld hub: the cinematic header (window.HWHero).

   A light home-style hero (paper ground, one violet corner light, one eye pill, the ghost bot)
   with the eyebrow, the display title, one lead sentence and four clickable cards:
     Projects       count-up beside a ring that fills to the share that is live    #/all
     Last changes   eight weeks of bars growing up from the base                   #/new
     Latest update  the brand's answer card, typing the last three updates         #/p/<repo>
     Rules passing  a green ring of repos that pass the hub's rules                #/health
   The live bot (assets/mascot/, GSAP) is perched on the cards' row and narrates the load: busy
   while GitHub data loads, one found moment, a calm failure. Under reduced motion everything
   shows in its final state, nothing types and the bot is still.

   API
     var hero = HWHero.mount(el, {
       mode:     'hero' | 'full',          // 'full' fills the window (dashboard/index.html)
       onOpen:   function (route, info) {}, // a card or link was chosen: route is '#/all',
                                           // '#/new', '#/p/<repo>', '#/health' or '#/city';
                                           // info = { card, demo }. Leave it out and the
                                           // links navigate by their href.
       hrefBase: '',                       // put before every route in an href ('../' on /dashboard/)
       source:   null                      // optional function returning a snapshot (demo data);
                                           // without it the hero reads window.HWGH
     });
     hero.refresh();          // re-read the data (call after HWGH 'repos', 'details', 'error')
     hero.setSource(fn|null); // switch to another snapshot source (null: back to HWGH)
     hero.destroy();          // stop everything and empty el

   A snapshot is { id, demo, repos: [slim repos as in HWGH.state.repos],
   projects: [HWGH.info() objects], signedIn, loading, detailsReady, error }.
   The hero also follows the detail level (HWX.level or localStorage 'hw_level'): the Projects
   card says statuses at Overview, kinds at How it's built and languages at Code. */
(function () {
  'use strict';

  var SCRIPT = (document.currentScript && document.currentScript.src) || '';
  var ASSETS = SCRIPT ? SCRIPT.replace(/[^/]*$/, '') : new URL('assets/', document.baseURI).href;
  var QUERY = SCRIPT.indexOf('?') >= 0 ? SCRIPT.slice(SCRIPT.indexOf('?')) : '';
  var NS = 'http://www.w3.org/2000/svg';
  var SEEN_KEY = 'hw_hero_seen', FOUND_KEY = 'hw_hero_found';
  var RING_C = 2 * Math.PI * 34;
  var WEEK = 7 * 864e5;
  var count = 0;

  /* ---------- small helpers ---------- */
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svg(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]); return e; }
  function own(o, k) { return o != null && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function lowerFirst(s) { return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function store(kind, key, val) {
    try {
      var st = kind === 'local' ? localStorage : sessionStorage;
      if (val === undefined) return st.getItem(key);
      st.setItem(key, val);
    } catch (e) { return null; }
    return null;
  }
  function reducedMotion() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function enc(s) { return encodeURIComponent(s); }
  function clip(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/[\s,.;:]+$/, '') + '\u2026' : s; }
  function ago(t, now) {
    var m = Math.max(0, Math.round((now - t) / 60000));
    if (m < 1) return 'just now';
    if (m < 60) return plural(m, 'minute') + ' ago';
    var hr = Math.round(m / 60);
    if (hr < 24) return plural(hr, 'hour') + ' ago';
    var d = Math.round(hr / 24);
    if (d === 1) return 'yesterday';
    if (d < 7) return d + ' days ago';
    if (d < 45) return plural(Math.round(d / 7), 'week') + ' ago';
    var mo = Math.round(d / 30.4);
    if (mo < 12) return plural(mo, 'month') + ' ago';
    return plural(Math.round(d / 365), 'year') + ' ago';
  }
  function dayMonth(t) { try { return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
  function clock(t) { try { return new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function weekStart(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); }

  /* ---------- one shared tween loop (count-ups, rings, bars) ---------- */
  var tweens = [], raf = 0;
  function OUT3(p) { return 1 - Math.pow(1 - p, 3); }
  function SINE(p) { return (1 - Math.cos(Math.PI * p)) / 2; }
  function frame(now) {
    raf = 0;
    for (var i = tweens.length - 1; i >= 0; i--) {
      var t = tweens[i];
      if (t.dead) { tweens.splice(i, 1); continue; }
      if (now < t.start) continue;
      var p = t.dur > 0 ? Math.min(1, (now - t.start) / t.dur) : 1;
      try { t.fn(t.from + (t.to - t.from) * t.ease(p)); } catch (e) { t.dead = true; }
      if (p >= 1) { tweens.splice(i, 1); t.dead = true; }
    }
    if (tweens.length) raf = requestAnimationFrame(frame);
  }
  function tween(from, to, dur, delay, ease, fn) {
    var t = { from: from, to: to, dur: dur, start: performance.now() + (delay || 0), ease: ease || OUT3, fn: fn, dead: false };
    if (dur <= 0 && !delay) { fn(to); t.dead = true; return t; }
    tweens.push(t);
    if (!raf) raf = requestAnimationFrame(frame);
    return t;
  }

  /* ---------- the bot mark, drawn before the live mascot takes over (and if it never does) ---------- */
  var HEAD = 'M131.31,279.37c-6.6.45-11.16-4.09-11.17-10.59l-.06-34.37-.5-3.43-12.83-.14-12.64-1.34c-31.71-4.98-58.72-27.8-69.35-58.06-.59-1.58-.69-3.34-2.7-3.64-14.52-2.11-24.11-15.27-21.68-30.31,1.43-8.82,8.4-16.93,17.26-19.68,2.17-.67,4.28-1.19,6.28-2.07,9.86-31.08,36.59-54.94,68.47-60.52,1.81-.42,4.52-1.13,6.44-1.14l46.72-.32.02-16.89c-9.61-4.53-13.45-12.73-11.29-23.15,1.28-6.2,7.84-12.48,14.03-13.35,2.85-.4,6.45-.61,9.3.02,18.07,4.41,19.41,29.92,2.17,36.33l-.02,17.09,47.34.17s4.47,1,4.47,1c32.61,4.96,60.14,29.63,70.11,61l4.97,1.33c26.47,7.07,25.21,45.22-1.67,50.19-1.04.14-3.21.72-3.49,1.63-3.32,10.75-8.65,20.02-15.58,28.66-13.9,17.09-33.17,28.38-55.07,31.75l-12.15,1.26-11.79.27-49.29,45.98c-1.83,1.7-4.12,2.16-6.27,2.31ZM209,208.38c27.22-4.7,49.31-26.66,54.16-53.54l1.06-6.51c1.16-5.76-.33-13.23-1.23-18.98l-.93-4.62-1.05-3.72c-1.62-6.19-5.22-11.91-8.76-17.21-11.47-16.01-29.55-26.72-49.19-28.61,0,0-100.23.02-100.23.02-2.74,0-5.76.8-8.27,1.32-34.3,6.79-58.62,41.43-52.63,76.02,4.05,27.73,27.19,52.09,55.09,55.95,0,0,10.74,1.19,10.74,1.19l24.96.26c5.05.05,8.43,5.22,8.49,10.03l.3,24.27c2.7-2.43,8.44-7.64,11.03-10.09,0,0,21.47-19.92,21.47-19.92,1.89-1.75,3.96-4.22,6.72-4.27,0,0,17.41-.27,17.41-.27l10.87-1.31Z';
  var EYE_L = 'M128.28,149.5c-.3,6.21-5.91,10.22-11.06,10.17-6.58-.06-11.35-4.64-11.51-11.39-.29-12.09-.48-24.24.1-36.29.29-6.13,6.2-10.25,11.44-10.15,5.94.11,10.87,4.61,11.1,11.13.41,12.06.53,24.21-.06,36.51Z';
  var EYE_R = 'M200.23,150.4c-1.48,6.96-7.65,10.57-14.52,8.93-3.39-1.44-7.71-4.87-7.74-9.18l-.25-35.95c-.04-6.43,3.86-11.52,10.33-12.26,5.18-.6,11.98,3.5,12.01,9.69l.17,38.77Z';
  function markSVG() {
    var s = svg('svg', { viewBox: '0 0 306 306', class: 'hwh-mark', 'aria-hidden': 'true', focusable: 'false' });
    var g = svg('g', { transform: 'translate(0,13.2)' });
    g.appendChild(svg('path', { class: 'hwh-mark-head', d: HEAD }));
    g.appendChild(svg('path', { class: 'hwh-mark-eye', d: EYE_L }));
    g.appendChild(svg('path', { class: 'hwh-mark-eye', d: EYE_R }));
    s.appendChild(g);
    return s;
  }

  /* ---------- loading the mascot engine (GSAP first, then the ES module) ---------- */
  var gsapReady = null;
  function needGsap() {
    if (window.gsap) return Promise.resolve(window.gsap);
    if (gsapReady) return gsapReady;
    gsapReady = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = ASSETS + 'vendor/gsap-3.12.5.min.js' + QUERY;
      s.onload = function () { window.gsap ? resolve(window.gsap) : reject(new Error('GSAP did not load')); };
      s.onerror = function () { reject(new Error('GSAP did not load')); };
      document.head.appendChild(s);
    });
    return gsapReady;
  }
  function needStyles() {
    [['hero.css', 'hwh-css'], ['mascot/mascot.css', 'hwh-mascot-css']].forEach(function (pair) {
      var file = pair[0];
      var have = Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
        return (l.getAttribute('href') || '').split('?')[0].slice(-file.length) === file;
      });
      if (have) return;
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = ASSETS + file + QUERY; l.id = pair[1];
      document.head.appendChild(l);
    });
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- the data: a snapshot, then the model the cards draw ---------- */
  function liveSnapshot() {
    var G = window.HWGH;
    if (!G || !G.state) return { id: 'none', repos: [], projects: [], loading: true, detailsReady: false };
    var s = G.state, projects = [];
    try { projects = G.projects(); } catch (e) { projects = []; }
    var started = !!(s.loading || s.loadedAt || s.error);
    return {
      id: 'live:' + (s.signedIn ? 1 : 0) + ':' + (s.loadedAt ? +s.loadedAt : 0),
      demo: null, repos: s.repos || [], projects: projects, signedIn: !!s.signedIn, preview: !!s.preview,
      loading: !!s.loading || !started, detailsReady: !!s.detailsReady && !s.loading,
      error: s.error || null, rateLimited: s.rateLimited || null
    };
  }

  function langList(p) {
    if (Array.isArray(p.langs)) return p.langs.map(function (l) { return { name: l.name, size: +l.size || 0 }; });
    var out = [], o = p.languages || {};
    for (var k in o) if (own(o, k)) out.push({ name: k, size: +o[k] || 0 });
    return out;
  }
  // Accepts HWGH.info() objects (name = repo name, title = display) and HWX.info() objects
  // (name = display, repo.name = repo name).
  function norm(p) {
    var repo = p.repo || {};
    var name = repo.name || p.name || '';
    var date = p.pushed_at || (p.last && p.last.date) || repo.pushed_at || null;
    var t = date ? Date.parse(date) : NaN;
    return {
      repo: name, title: p.title || p.name || name, status: p.status || null, kind: p.kind || null,
      t: isNaN(t) ? 0 : t, msg: p.last_message || (p.last && p.last.msg) || '',
      tagline: p.tagline || '', category: p.category || null, langs: langList(p)
    };
  }

  function statusSentence(list, CFG) {
    var labels = CFG.statuses || {}, counts = Object.create(null), parts = [];
    list.forEach(function (p) { var k = own(labels, p.status) ? p.status : '_none'; counts[k] = (counts[k] || 0) + 1; });
    Object.keys(labels).forEach(function (k) { if (counts[k]) parts.push(counts[k] + ' ' + lowerFirst(labels[k])); });
    if (counts._none) parts.push(counts._none + ' with no status yet');
    return parts.length ? parts.join(', ') + '.' : 'No projects yet.';
  }
  function kindSentence(list, CFG) {
    var labels = CFG.kinds || {}, det = CFG.kind_details || {}, counts = Object.create(null);
    list.forEach(function (p) { if (own(labels, p.kind)) counts[p.kind] = (counts[p.kind] || 0) + 1; });
    var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    if (!keys.length) return 'No kinds set on the hub cards yet.';
    var parts = keys.slice(0, 3).map(function (k) {
      var n = counts[k], pl = own(det, k) && det[k].plural ? det[k].plural : labels[k] + 's';
      return n + ' ' + lowerFirst(n === 1 ? labels[k] : pl);
    });
    var rest = list.length - keys.slice(0, 3).reduce(function (s, k) { return s + counts[k]; }, 0);
    return parts.join(', ') + (rest > 0 ? ', ' + rest + ' more' : '') + '.';
  }
  function langSentence(list) {
    var bytes = Object.create(null), total = 0;
    list.forEach(function (p) { p.langs.forEach(function (l) { bytes[l.name] = (bytes[l.name] || 0) + l.size; total += l.size; }); });
    var keys = Object.keys(bytes).sort(function (a, b) { return bytes[b] - bytes[a]; });
    if (!keys.length || !total) return 'Languages show once the details load.';
    return keys.slice(0, 3).map(function (k) { return k + ' ' + Math.max(1, Math.round(bytes[k] / total * 100)) + '%'; }).join(', ') + '.';
  }

  function healthOf(snap, byName) {
    var repos = (snap.repos || []).filter(function (r) { return r && !r.fork && !r.archived; });
    var pass = 0, need = { readme: 0, card: 0, faulty: 0, category: 0 };
    repos.forEach(function (r) {
      var p = byName[r.name], ok = true;
      if (!r.readme) { need.readme++; ok = false; }
      if (r.cardError) { need.faulty++; ok = false; }
      else if (!r.card) { need.card++; ok = false; }
      if (!(p && p.category) && !(r.card && r.card.category)) { need.category++; ok = false; }
      if (ok) pass++;
    });
    var phrases = [];
    if (need.readme) phrases.push([need.readme, plural(need.readme, 'repo') + (need.readme === 1 ? ' needs' : ' need') + ' a README']);
    if (need.card) phrases.push([need.card, plural(need.card, 'repo') + (need.card === 1 ? ' needs' : ' need') + ' a hub card']);
    if (need.faulty) phrases.push([need.faulty, plural(need.faulty, 'hub card') + (need.faulty === 1 ? ' needs' : ' need') + ' fixing']);
    if (need.category) phrases.push([need.category, plural(need.category, 'repo') + (need.category === 1 ? ' needs' : ' need') + ' a category']);
    phrases.sort(function (a, b) { return b[0] - a[0]; });
    var say, tone;
    if (!repos.length) { say = 'No repos to check yet.'; tone = 'wait'; }
    else if (!phrases.length) { say = 'Every repo passes.'; tone = 'good'; }
    else {
      var others = phrases.slice(1).reduce(function (s, x) { return s + x[0]; }, 0);
      say = phrases[0][1] + (others ? ', and ' + plural(others, 'other fix', 'other fixes') + (others === 1 ? ' is' : ' are') + ' waiting.' : '.');
      tone = 'warn';
    }
    return { pass: pass, total: repos.length, say: say, tone: tone };
  }

  function buildModel(snap, level, CFG) {
    var now = Date.now();
    var repos = snap.repos || [];
    var phase = snap.error && !repos.length ? 'error' : (snap.loading && !repos.length ? 'loading' : 'ready');
    var list = (snap.projects || []).map(norm);
    var byName = Object.create(null);
    list.forEach(function (p) { byName[p.repo] = p; });
    var live = list.filter(function (p) { return p.status === 'live'; }).length;

    var ws = weekStart(now), weeks = [0, 0, 0, 0, 0, 0, 0, 0];
    list.forEach(function (p) {
      if (!p.t) return;
      var back = Math.round((ws - weekStart(p.t)) / WEEK);
      if (back >= 0 && back < 8) weeks[7 - back]++;
    });
    var latest = list.filter(function (p) { return p.t; }).sort(function (a, b) { return b.t - a.t; });
    /* the skyline: every project that is not retired, by stage then category, as in the City */
    var sizes = Object.create(null);
    repos.forEach(function (r) { if (r && r.name) sizes[r.name] = +r.size || 0; });
    var catAt = Object.create(null), at = 0, stages = (CFG && CFG.stages) || {};
    Object.keys(stages).forEach(function (s) { (stages[s].categories || []).forEach(function (c) { if (!(c in catAt)) catAt[c] = at++; }); });
    var sky = list.filter(function (p) { return p.status !== 'retired'; }).map(function (p) {
      return { repo: p.repo, title: p.title, status: p.status, size: sizes[p.repo] || 0, at: p.category in catAt ? catAt[p.category] : 99 };
    }).sort(function (a, b) { return (a.at - b.at) || a.title.localeCompare(b.title); });
    var thisWeek = weeks[7], before = Math.max.apply(null, weeks.slice(0, 7)), act;
    if (!list.length) act = 'No changes to show yet.';
    else if (!thisWeek) act = latest.length ? 'Quiet this week. The last change was ' + ago(latest[0].t, now) + '.' : 'Quiet this week.';
    else if (thisWeek > before && thisWeek > 1) act = plural(thisWeek, 'project') + ' changed this week, the most in eight weeks.';
    else act = plural(thisWeek, 'project') + ' changed this week.';

    var projSay = level === 'code' ? langSentence(list) : level === 'built' ? kindSentence(list, CFG) : statusSentence(list, CFG);
    if (level !== 'overview' && !snap.detailsReady) projSay = 'Reading the hub cards.';
    if (level === 'overview' && !snap.detailsReady) projSay = 'Reading the hub cards for each status.';

    return {
      phase: phase, id: snap.id || '', demo: snap.demo || null, signedIn: !!snap.signedIn, preview: !!snap.preview,
      detailsReady: !!snap.detailsReady, error: snap.error || null, rateLimited: snap.rateLimited || null,
      total: list.length, live: live, livePct: list.length ? live / list.length : 0, projSay: projSay,
      weeks: weeks, firstWeek: ws - 7 * WEEK, actSay: act,
      latest: latest.slice(0, 3), health: healthOf(snap, byName), now: now, sky: sky
    };
  }

  function failSentence(m) {
    var e = m.error;
    if (e && (e.name === 'RateLimit' || m.rateLimited)) {
      var at = (e && e.reset) || m.rateLimited;
      return 'Signed-out visits have used up GitHub\u2019s limit' + (at ? ' until ' + clock(at) : '') + '. Sign in to carry on, or come back then.';
    }
    return 'The hub could not reach GitHub, so no projects loaded. Check the connection, then reload the page.';
  }

  /* ================================================================== */
  function mount(root, opts) {
    if (!root) throw new Error('HWHero.mount needs an element');
    opts = opts || {};
    needStyles();
    var CFG = window.HW_CONFIG || {};
    var mode = opts.mode === 'full' ? 'full' : 'hero';
    var hrefBase = typeof opts.hrefBase === 'string' ? opts.hrefBase : '';
    var onOpen = typeof opts.onOpen === 'function' ? opts.onOpen : null;
    var source = typeof opts.source === 'function' ? opts.source : null;
    var RM = reducedMotion();
    var K = RM ? 0 : (store('session', SEEN_KEY) === '1' ? 0.55 : 1);   // repeat visits run about twice as fast
    var alive = true, timers = [], mine = [], cleanups = [];
    var n = ++count, uid = 'hwh' + n;
    var model = null, snap = null, lastLevel = null, onScreen = true;

    function later(fn, ms) {
      var id = setTimeout(function () { var i = timers.indexOf(id); if (i >= 0) timers.splice(i, 1); if (alive) fn(); }, Math.max(0, ms));
      timers.push(id); return id;
    }
    function tw(from, to, dur, delay, ease, fn) { var t = tween(from, to, RM ? 0 : dur, RM ? 0 : delay, ease, fn); mine.push(t); if (mine.length > 64) mine = mine.filter(function (x) { return !x.dead; }); return t; }
    var byKey = Object.create(null);
    function twk(key, from, to, dur, delay, ease, fn) { if (byKey[key]) byKey[key].dead = true; byKey[key] = tw(from, to, dur, delay, ease, fn); return byKey[key]; }
    function listen(target, ev, fn, o) { target.addEventListener(ev, fn, o); cleanups.push(function () { target.removeEventListener(ev, fn, o); }); }

    /* ----- the frame ----- */
    var sec = h('section', 'hwh' + (mode === 'full' ? ' hwh--full' : ''));
    sec.setAttribute('aria-labelledby', uid + '-title');
    var decor = h('span', 'hwh-decor'); decor.setAttribute('aria-hidden', 'true');
    var ghost = h('span', 'hwh-ghost'); ghost.setAttribute('aria-hidden', 'true');
    sec.appendChild(decor); sec.appendChild(ghost);
    var inner = h('div', 'hwh-in'); sec.appendChild(inner);

    var head = h('div', 'hwh-head');
    var eyebrow = h('p', 'hwh-eyebrow', 'HelloWorld on GitHub');
    var title = h('h1', 'hwh-title'); title.id = uid + '-title';
    title.appendChild(document.createTextNode('Every project, '));
    title.appendChild(h('em', null, 'saying hello'));
    title.appendChild(document.createTextNode('.'));
    var lead = h('p', 'hwh-lead', mode === 'full'
      ? 'Projects, recent changes and the health of every repo, on one screen.'
      : 'Find a project, read about it, try its demo and browse its code.');
    var actions = null;
    var stateLine = h('p', 'hwh-state');
    head.appendChild(eyebrow); head.appendChild(title); head.appendChild(lead);
    head.appendChild(stateLine);
    var top = h('div', 'hwh-top' + (mode === 'hero' ? ' has-sky' : ''));
    top.appendChild(head);
    var sky = mode === 'hero' ? makeSky() : null;
    if (sky) { top.appendChild(sky.el); actions = sky.el; }
    inner.appendChild(top);

    /* ----- the skyline: every project as a pill building in its City colour, the live ones with
       the bot's two eyes on top. They grow up from the ground once, in order; pointing at one says
       its name and lifts it; selecting it opens the project. ----- */
    function hash32(str) {           // the City's own hash (assets/city/hwc-city.js), so colours match
      var x = 2166136261 >>> 0;
      for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; }
      return x >>> 0;
    }
    function makeSky() {
      var el = h('div', 'hwh-sky');
      var fig = svg('svg', { 'class': 'hwh-sky-svg', viewBox: '0 0 640 200', preserveAspectRatio: 'xMidYMax meet', 'aria-hidden': 'true', focusable: 'false' });
      var cap = h('p', 'hwh-sky-cap');
      var capT = h('span', 'hwh-sky-t', 'Every project is a building in the City');
      var go = h('a', 'hwh-quiet', 'Walk through the City');
      go.href = hrefBase + '#/city'; go.setAttribute('data-hwh-route', '#/city'); go.setAttribute('data-card', 'city');
      cap.appendChild(capT); cap.appendChild(go);
      el.appendChild(fig); el.appendChild(cap);
      var drawnSig = '', grown = false, rest = capT.textContent, labels = (window.HW_CONFIG && window.HW_CONFIG.statuses) || {};
      function draw(m) {
        var list = (m && m.sky) || [];
        var sig = list.map(function (b) { return b.repo + ':' + b.status + ':' + b.size; }).join('|');
        if (sig === drawnSig) return;
        drawnSig = sig;
        while (fig.firstChild) fig.removeChild(fig.firstChild);
        if (!list.length) return;
        var VW = 640, base = 192, n = list.length;
        var w = Math.max(9, Math.min(30, (VW - 8) / (n * 1.34))), gap = w * 0.34;
        var span = n * w + (n - 1) * gap, x0 = (VW - span) / 2;
        var lmax = Math.log10(Math.max.apply(null, list.map(function (b) { return b.size; }).concat([10])) + 10);
        fig.appendChild(svg('rect', { 'class': 'hwh-sky-ground', x: Math.max(0, x0 - 14), y: base, width: Math.min(VW, span + 28), height: 6, rx: 3 }));
        var animate = !grown && !RM;
        list.forEach(function (b, i) {
          var k = (Math.log10(b.size + 10) - 1) / Math.max(0.5, lmax - 1);
          var hgt = Math.round(40 + 136 * Math.max(0, Math.min(1, k)));
          var x = x0 + i * (w + gap), y = base - hgt;
          var g = svg('g', { 'class': 'hwh-b' + (b.status === 'paused' ? ' is-paused' : '') + (animate ? ' is-growing' : ''), 'data-repo': b.repo, 'data-i': i });
          g.style.setProperty('--d', Math.round(i * 45 + (hash32(b.repo) % 90)) + 'ms');
          g.appendChild(svg('rect', { 'class': 'hwh-b-body', x: x.toFixed(1), y: y, width: w.toFixed(1), height: hgt, rx: (w / 2).toFixed(1), fill: 'var(--hwh-f' + (hash32(b.repo + '|facade') % 10) + ')' }));
          if (b.status === 'live') {
            var ew = Math.max(2, w * 0.17), eh = Math.max(4, w * 0.4), ey = y + w * 0.42;
            g.appendChild(svg('rect', { 'class': 'hwh-b-eye', x: (x + w * 0.29 - ew / 2).toFixed(1), y: ey.toFixed(1), width: ew.toFixed(1), height: eh.toFixed(1), rx: (ew / 2).toFixed(1) }));
            g.appendChild(svg('rect', { 'class': 'hwh-b-eye', x: (x + w * 0.71 - ew / 2).toFixed(1), y: ey.toFixed(1), width: ew.toFixed(1), height: eh.toFixed(1), rx: (ew / 2).toFixed(1) }));
          }
          g.__b = b;
          fig.appendChild(g);
        });
        if (animate) grown = true;
      }
      fig.addEventListener('mouseover', function (e) {
        var g = e.target.closest && e.target.closest('.hwh-b'); if (!g || !g.__b) return;
        var b = g.__b, st = b.status && own(labels, b.status) ? labels[b.status] : '';
        capT.textContent = b.title + (st ? ', ' + lowerFirst(st) : '');
        el.classList.add('is-pointing');
      });
      fig.addEventListener('mouseleave', function () { capT.textContent = rest; el.classList.remove('is-pointing'); });
      fig.addEventListener('click', function (e) {
        var g = e.target.closest && e.target.closest('.hwh-b'); if (!g || !g.__b) return;
        var route = '#/p/' + enc(g.__b.repo);
        if (onOpen) onOpen(route, { card: 'sky', demo: !!(model && model.demo) });
        else location.href = hrefBase + route;
      });
      return { el: el, draw: draw };
    }

    var deck = h('div', 'hwh-deck');
    inner.appendChild(deck);
    var perch = h('div', 'hwh-perch'); perch.setAttribute('aria-hidden', 'true');
    var botEl = h('div', 'hwh-bot'); botEl.appendChild(markSVG()); perch.appendChild(botEl);
    deck.appendChild(perch);

    function cardShell(key, label, route, go) {
      var a = h('a', 'hwh-card');
      a.setAttribute('data-card', key);
      var k = h('p', 'hwh-k'); k.appendChild(document.createTextNode(label));
      a.appendChild(k);
      var goEl = h('span', 'hwh-go', go);
      var c = { key: key, a: a, k: k, go: goEl, gate: false, next: null };
      c.route = function (r) { a.href = hrefBase + r; a.setAttribute('data-hwh-route', r); };
      c.route(route);
      deck.appendChild(a);
      return c;
    }
    function setSay(el, text, tone, animate) {
      var cls = 'hwh-say' + (tone ? ' is-' + tone : '');
      if (el.textContent === text && el.className === cls) return;
      el.textContent = text; el.className = cls;
      if (animate && !RM && el.animate) { try { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.37,0,.63,1)' }); } catch (e) {} }
    }
    function ring(kind, small) {
      var w = h('span', 'hwh-ring' + (kind ? ' hwh-ring--' + kind : ''));
      var s = svg('svg', { viewBox: '0 0 80 80', 'aria-hidden': 'true', focusable: 'false' });
      s.appendChild(svg('circle', { class: 'hwh-ring-track', cx: 40, cy: 40, r: 34 }));
      var arc = svg('circle', { class: 'hwh-ring-arc', cx: 40, cy: 40, r: 34, transform: 'rotate(-90 40 40)', 'stroke-dasharray': RING_C.toFixed(2) + ' ' + RING_C.toFixed(2), 'stroke-dashoffset': RING_C.toFixed(2), opacity: 0 });
      s.appendChild(arc); w.appendChild(s);
      var v = h('span', 'hwh-ring-v'); v.setAttribute('aria-hidden', 'true');
      var b = h('b', null, ''); v.appendChild(b);
      if (small) v.appendChild(h('small', null, small));
      w.appendChild(v);
      var shown = 0;
      return {
        el: w,
        get: function () { return shown; },
        wait: function () { shown = 0; arc.setAttribute('opacity', 0); arc.setAttribute('stroke-dashoffset', RING_C.toFixed(2)); b.textContent = ''; },
        set: function (p) {
          shown = p;
          arc.setAttribute('stroke-dashoffset', (RING_C * (1 - Math.max(0, Math.min(1, p)))).toFixed(2));
          arc.setAttribute('opacity', p > 0.004 ? 1 : 0);
          b.textContent = Math.round(p * 100) + '%';
        }
      };
    }
    function countTo(key, node, from, to, dur, delay, fmt) {
      fmt = fmt || function (v) { return String(Math.round(v)); };
      if (byKey[key]) byKey[key].dead = true;
      if (from === to) { node.firstChild.nodeValue = fmt(to); return; }
      twk(key, from, to, dur, delay, OUT3, function (v) { node.firstChild.nodeValue = fmt(v); });
    }

    /* ----- card 1: Projects ----- */
    var cP = cardShell('projects', 'Projects', '#/all', 'See all projects');
    var figP = h('div', 'hwh-fig'); figP.setAttribute('aria-hidden', 'true');
    var numP = h('span', 'hwh-num is-wait'); numP.appendChild(document.createTextNode('0'));
    var ringP = ring('', 'live');
    figP.appendChild(numP); figP.appendChild(ringP.el);
    var sayP = h('p', 'hwh-say is-wait', 'Loading projects from GitHub.');
    cP.a.appendChild(figP); cP.a.appendChild(sayP); cP.a.appendChild(cP.go);
    cP.shownN = 0;
    cP.play = function (first) {
      var m = cP.next; if (!m) return;
      if (m.phase !== 'ready') {
        numP.classList.add('is-wait'); if (byKey.numP) byKey.numP.dead = true; if (byKey.ringP) byKey.ringP.dead = true; numP.firstChild.nodeValue = '0'; cP.shownN = 0; ringP.wait();
        setSay(sayP, m.phase === 'error' ? 'Nothing loaded yet.' : 'Loading projects from GitHub.', 'wait', false);
        cP.a.setAttribute('aria-label', 'Projects: ' + (m.phase === 'error' ? 'nothing loaded yet' : 'loading') + '. See all projects.');
        return;
      }
      numP.classList.remove('is-wait');
      countTo('numP', numP, cP.shownN, m.total, 1100 * K, 0);
      cP.shownN = m.total;
      if (m.detailsReady) { var from = ringP.get(); twk('ringP', from, m.livePct, 1100 * K, 120 * K, OUT3, ringP.set); }
      else { if (byKey.ringP) byKey.ringP.dead = true; ringP.wait(); }
      setSay(sayP, m.projSay, m.detailsReady ? null : 'wait', !first);
      cP.a.setAttribute('aria-label', 'Projects: ' + m.total + '. ' + (m.detailsReady ? Math.round(m.livePct * 100) + '% live. ' : '') + m.projSay + ' See all projects.');
    };

    /* ----- card 2: Last changes ----- */
    var cA = cardShell('activity', 'Last changes, 8 weeks', '#/new', 'See what changed');
    var figA = h('div', 'hwh-fig'); figA.setAttribute('aria-hidden', 'true');
    var chart = h('div', 'hwh-chart'), barsEl = h('div', 'hwh-bars'), bars = [];
    for (var bi = 0; bi < 8; bi++) {
      var bar = h('span', 'hwh-bar' + (bi === 7 ? ' is-now' : '')), fill = h('i');
      bar.appendChild(fill); barsEl.appendChild(bar);
      bars.push({ el: fill, shown: 0 });
    }
    var axis = h('div', 'hwh-axis'), axisFrom = h('span', null, ''), axisTo = h('span', null, 'this week');
    axis.appendChild(axisFrom); axis.appendChild(axisTo);
    chart.appendChild(barsEl); chart.appendChild(axis); figA.appendChild(chart);
    var sayA = h('p', 'hwh-say is-wait', 'Reading the latest changes.');
    cA.a.appendChild(figA); cA.a.appendChild(sayA); cA.a.appendChild(cA.go);
    function setBar(b, v) { b.shown = v; b.el.style.transform = 'scaleY(' + Math.max(0, Math.min(1, v)).toFixed(4) + ')'; }
    cA.play = function (first) {
      var m = cA.next; if (!m) return;
      axisFrom.textContent = dayMonth(m.firstWeek);
      if (m.phase !== 'ready') {
        setSay(sayA, m.phase === 'error' ? 'Nothing loaded yet.' : 'Reading the latest changes.', 'wait', false);
        bars.forEach(function (b, i) { if (b.shown) twk('bar' + i, b.shown, 0, 500 * K, 0, SINE, function (v) { setBar(b, v); }); });
        cA.a.setAttribute('aria-label', 'Last changes over eight weeks: ' + (m.phase === 'error' ? 'nothing loaded yet' : 'loading') + '. See what changed.');
        return;
      }
      var max = Math.max(1, Math.max.apply(null, m.weeks));
      bars.forEach(function (b, i) {
        var to = m.weeks[i] / max;
        if (Math.abs(to - b.shown) < 0.001) return;
        // Bars grow up from the base: 0.9s each, 0.1s apart (the film's chart rhythm).
        twk('bar' + i, b.shown, to, (first ? 900 : 600) * K, (first ? i * 100 : i * 40) * K, SINE, function (v) { setBar(b, v); });
      });
      setSay(sayA, m.actSay, null, !first);
      cA.a.setAttribute('aria-label', 'Last changes over eight weeks, by the week each project last changed: ' + m.weeks.join(', ') + '. ' + m.actSay + ' See what changed.');
    };

    /* ----- card 3: Latest update (the answer card) ----- */
    var cL = cardShell('latest', '', '#/new', 'See what changed');
    var dot = h('span', 'hwh-dot'); dot.setAttribute('aria-hidden', 'true');
    cL.k.insertBefore(dot, cL.k.firstChild);
    cL.k.appendChild(document.createTextNode('Latest update'));
    var ac = h('div', 'hwh-ac'); ac.setAttribute('aria-hidden', 'true');
    var qEl = h('p', 'hwh-q', 'what changed last?');
    var aEl = h('p', 'hwh-a is-wait', 'Reading the latest changes.');
    var srcEl = h('p', 'hwh-src');
    ac.appendChild(qEl); ac.appendChild(aEl); ac.appendChild(srcEl);
    cL.a.appendChild(ac); cL.a.appendChild(cL.go);

    var QUESTIONS = ['what changed last?', 'and before that?', 'and before that?'];
    function segsFor(it, i, now) {
      var when = ago(it.t, now), msg = clip(it.msg, 84), tag = clip(it.tagline, 90).replace(/\.$/, '');
      var tail = msg ? ': \u201c' + msg.replace(/\.$/, '') + '\u201d.' : '.' + (tag ? ' ' + tag + '.' : '');
      if (i === 0) return [{ t: 'The latest change was to ' }, { pill: it.title }, { t: ', ' + when + tail }];
      return [{ t: (i === 1 ? 'Before that, ' : 'Earlier, ') }, { pill: it.title }, { t: ' changed ' + when + tail }];
    }
    function segsText(segs) { return segs.map(function (s) { return s.t || s.pill; }).join(''); }
    function renderSegs(target, segs, count, caret) {
      target.textContent = '';
      var left = count == null ? Infinity : count;
      for (var i = 0; i < segs.length && left > 0; i++) {
        var s = segs[i], str = s.t || s.pill, part = str.slice(0, left);
        if (s.pill) {
          target.appendChild(h('span', 'hwh-pill' + (str.length > 24 ? ' hwh-pill--long' : ''), part));
          if (part.length === str.length) target.appendChild(h('span', 'hwh-cite', '[1]'));
        } else target.appendChild(document.createTextNode(part));
        left -= str.length;
      }
      if (caret) target.appendChild(caret);
    }
    function srcFor(target, it) {
      target.textContent = '';
      target.appendChild(document.createTextNode('Source: '));
      target.appendChild(h('b', null, it.repo));
      target.appendChild(document.createTextNode(' on GitHub'));
    }

    var typer = (function () {
      var items = [], sig = '', idx = 0, timer = 0, cont = null, paused = false, running = false;
      var caret = h('span', 'hwh-caret'); caret.setAttribute('aria-hidden', 'true');
      function sched(fn, ms) {
        clearTimeout(timer);
        timer = setTimeout(function () { timer = 0; if (!alive) return; if (paused) { cont = fn; return; } fn(); }, ms);
      }
      function linkTo(it, segs) {
        cL.route('#/p/' + enc(it.repo));
        cL.go.textContent = 'Open ' + it.title;
        cL.a.setAttribute('aria-label', 'Latest update: ' + segsText(segs) + ' Open ' + it.title + '.');
      }
      // Reserve the tallest answer's height first, so nothing below jumps while it types.
      function reserve() {
        if (!items.length || !aEl.clientWidth) return;
        var now = Date.now();
        [[aEl, function (c, it, i) { renderSegs(c, segsFor(it, i, now)); }], [qEl, function (c, it, i) { c.textContent = QUESTIONS[i]; }]].forEach(function (pair) {
          var node = pair[0], clone = node.cloneNode(false), max = 0;
          clone.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;height:auto;min-height:0;width:' + node.clientWidth + 'px';
          node.parentNode.appendChild(clone);
          items.forEach(function (it, i) { pair[1](clone, it, i); max = Math.max(max, clone.offsetHeight); });
          clone.parentNode.removeChild(clone);
          node.style.minHeight = max + 'px';
        });
      }
      function showStill(i) {
        var it = items[i], segs = segsFor(it, i, Date.now());
        qEl.textContent = QUESTIONS[i]; aEl.className = 'hwh-a';
        renderSegs(aEl, segs); srcFor(srcEl, it); srcEl.classList.add('is-on'); linkTo(it, segs);
      }
      function typeItem() {
        var it = items[idx], segs = segsFor(it, idx, Date.now()), len = segsText(segs).length, pos = 0;
        qEl.textContent = QUESTIONS[idx]; aEl.className = 'hwh-a';
        srcEl.classList.remove('is-on'); linkTo(it, segs);
        renderSegs(aEl, segs, 0, caret);
        var step = Math.max(12, 26 * Math.max(K, 0.55));
        (function next() {
          pos = Math.min(len, pos + 1 + (Math.random() < 0.5 ? 1 : 0));
          renderSegs(aEl, segs, pos, caret);
          if (pos < len) { sched(next, step); return; }
          sched(function () {
            if (caret.parentNode) caret.parentNode.removeChild(caret);
            srcFor(srcEl, it); srcEl.classList.add('is-on');
            if (items.length < 2) { running = false; return; }
            // Hold 2.6 s, then the next of the last three updates.
            sched(function () {
              srcEl.classList.remove('is-on');
              sched(function () { idx = (idx + 1) % items.length; typeItem(); }, 500);
            }, 2600);
          }, 350);
        })();
      }
      function start() {
        clearTimeout(timer); cont = null;
        if (!items.length) return;
        reserve();
        if (RM) { showStill(0); return; }
        running = true; idx = 0; typeItem();
      }
      return {
        set: function (list, waitText) {
          if (!list || !list.length) {
            items = []; sig = ''; clearTimeout(timer); cont = null; running = false;
            qEl.textContent = QUESTIONS[0]; aEl.className = 'hwh-a is-wait'; aEl.textContent = waitText;
            srcEl.classList.remove('is-on'); cL.route('#/new'); cL.go.textContent = 'See what changed';
            cL.a.setAttribute('aria-label', 'Latest update: ' + waitText + ' See what changed.');
            return;
          }
          var s = list.map(function (x) { return x.repo + '@' + x.t + '@' + x.msg; }).join('|');
          if (s === sig) return;
          sig = s; items = list.slice(0, 3); start();
        },
        reserve: reserve,
        pause: function () { paused = true; },
        resume: function () { paused = false; if (cont) { var f = cont; cont = null; f(); } },
        stop: function () { clearTimeout(timer); cont = null; running = false; }
      };
    })();
    cL.play = function () {
      var m = cL.next; if (!m) return;
      if (m.phase === 'error') { typer.set(null, 'Nothing to show until GitHub answers.'); return; }
      if (m.phase !== 'ready' || !m.detailsReady) { typer.set(null, 'Reading the latest changes.'); return; }
      typer.set(m.latest, 'No changes to show yet.');
    };

    /* ----- card 4: Rules passing ----- */
    var cH = cardShell('health', 'Rules passing', '#/health', 'Open Health');
    var figH = h('div', 'hwh-fig'); figH.setAttribute('aria-hidden', 'true');
    var ringH = ring('good', 'pass');
    var numH = h('span', 'hwh-num is-wait'); numH.appendChild(document.createTextNode('0'));
    var ofH = h('small', null, ''); numH.appendChild(ofH);
    figH.appendChild(ringH.el); figH.appendChild(numH);
    var sayH = h('p', 'hwh-say is-wait', 'Checking READMEs and hub cards.');
    cH.a.appendChild(figH); cH.a.appendChild(sayH); cH.a.appendChild(cH.go);
    cH.shownN = 0;
    cH.play = function (first) {
      var m = cH.next; if (!m) return;
      if (m.phase !== 'ready' || !m.detailsReady) {
        numH.classList.add('is-wait'); if (byKey.numH) byKey.numH.dead = true; if (byKey.ringH) byKey.ringH.dead = true; numH.firstChild.nodeValue = '0'; ofH.textContent = ''; cH.shownN = 0; ringH.wait();
        setSay(sayH, m.phase === 'error' ? 'Nothing checked yet.' : 'Checking READMEs and hub cards.', 'wait', false);
        cH.a.setAttribute('aria-label', 'Rules passing: ' + (m.phase === 'error' ? 'nothing checked yet' : 'checking') + '. Open Health.');
        return;
      }
      var hl = m.health;
      numH.classList.remove('is-wait');
      ofH.textContent = 'of ' + hl.total;
      numH.classList.toggle('is-long', String(hl.total).length + String(hl.pass).length >= 5);
      countTo('numH', numH, cH.shownN, hl.pass, 1100 * K, 0);
      cH.shownN = hl.pass;
      twk('ringH', ringH.get(), hl.total ? hl.pass / hl.total : 0, 1100 * K, 120 * K, OUT3, ringH.set);
      setSay(sayH, hl.say, hl.tone, !first);
      cH.a.setAttribute('aria-label', 'Rules passing: ' + hl.pass + ' of ' + hl.total + ' repos. ' + hl.say + ' Open Health.');
    };

    var cards = [cP, cA, cL, cH];
    root.appendChild(sec);

    /* ----- the words that carry the state (always, and alone under reduced motion) ----- */
    function setState(m) {
      var text = '', bad = false;
      if (m.phase === 'loading') text = 'Loading projects from GitHub.';
      else if (m.phase === 'error') { text = failSentence(m); bad = true; }
      else if (!m.detailsReady) text = 'Reading each project\u2019s details from GitHub.';
      else if (mode === 'hero') {
        if (m.demo) text = 'Demo data: invented projects.';
        else if (m.signedIn) text = 'Signed in: the private repos show here too.';
        else text = 'Public repos only. Sign in to see the private ones too.';
      }
      if (stateLine.textContent !== text) stateLine.textContent = text;
      stateLine.classList.toggle('is-bad', bad);
    }

    /* ----- clicks: a card opens the records behind it ----- */
    listen(sec, 'click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-hwh-route]');
      if (!a || !sec.contains(a) || !onOpen) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      onOpen(a.getAttribute('data-hwh-route'), { card: a.getAttribute('data-card'), demo: !!(model && model.demo) });
    });

    /* ----- the bot: narrates the load ----- */
    var bot = null, loop = { on: false, stop: false }, narrated = null, chain = Promise.resolve();
    function enqueue(fn) { chain = chain.then(function () { if (alive && bot) return fn(); }).catch(function () {}); }
    async function busyLoop(tokens) {
      if (RM || loop.on || !bot) return;
      loop.on = true; loop.stop = false;
      try {
        for (var i = 0; !loop.stop && alive; i++) {
          await bot.play(tokens[i % tokens.length]);
          var until = Date.now() + 900 + Math.random() * 1400;
          while (Date.now() < until && !loop.stop && alive) await sleep(100);
        }
      } catch (e) { /* a broken timeline never breaks the page */ }
      loop.on = false;
    }
    async function outcome(tokens) {
      loop.stop = true;
      while (loop.on) await sleep(120);
      if (RM || !alive || !bot) return;
      for (var i = 0; i < tokens.length; i++) { try { await bot.play(tokens[i]); } catch (e) {} }
    }
    function narrate(m) {
      if (!bot || RM || !m) return;
      if (m.phase === 'loading' || (m.phase === 'ready' && !m.detailsReady)) {
        if (!loop.on && narrated !== 'busy:' + m.id) { narrated = 'busy:' + m.id; void busyLoop(['scan', 'thinking', 'working', 'look']); }
        return;
      }
      var key = m.phase + ':' + m.id;
      if (narrated === key) return;
      narrated = key;
      if (m.phase === 'error') { enqueue(function () { return outcome(['notfound', 'shrug']); }); return; }
      if (!m.total) { enqueue(function () { return outcome(['notfound']); }); return; }
      // One typed "found" per visit; later loads in the same tab just land.
      var typed = store('session', FOUND_KEY) !== '1';
      if (typed) store('session', FOUND_KEY, '1');
      var tok = typed ? 'found & "Found ' + plural(m.total, 'project') + '"' : 'found';
      enqueue(function () { return outcome([tok]); });
    }

    function bootBot() {
      needGsap().then(function () {
        return import(ASSETS + 'mascot/index.js' + QUERY);
      }).then(function (mod) {
        if (!alive) return;
        var b = new mod.Mascot({ mount: botEl, character: mod.helloworld, gsap: window.gsap, mood: RM ? 'still' : 'calm', autoblink: !RM });
        bot = b;
        // Pause him off screen: when a performance ends, the engine restarts his idle life.
        b._onBusy = function (busy) { if (!busy && !onScreen) { try { b.life.stop(); } catch (e) {} } };
        if (!onScreen) { try { b.life.stop(); } catch (e) {} }
        if (model) narrate(model);
      }).catch(function (e) {
        // Fails soft: the static mark stays where he would be.
        if (window.console) console.warn('HWHero: the live bot is unavailable (' + (e && e.message) + ')');
      });
    }

    /* ----- level (Overview, How it's built, Code) ----- */
    function level() {
      var l = window.HWX && typeof window.HWX.level === 'string' ? window.HWX.level : store('local', 'hw_level');
      return l === 'built' || l === 'code' ? l : 'overview';
    }
    function onLevel() { if (alive && level() !== lastLevel) refresh(); }
    listen(document, 'click', function (e) { if (e.target.closest && e.target.closest('[data-level], #hwx-level')) setTimeout(onLevel, 0); });
    listen(document, 'change', function (e) { if (e.target.closest && e.target.closest('#hwx-level')) setTimeout(onLevel, 0); });
    listen(window, 'storage', function (e) { if (e.key === 'hw_level') onLevel(); });
    listen(document, 'hwx:level', function () { setTimeout(onLevel, 0); });

    /* ----- refresh: read the data, let each card play what changed ----- */
    function refresh() {
      if (!alive) return;
      try { snap = source ? source() : liveSnapshot(); } catch (e) { snap = { id: 'none', repos: [], projects: [], error: e }; }
      if (!snap) snap = liveSnapshot();
      lastLevel = level();
      model = buildModel(snap, lastLevel, window.HW_CONFIG || CFG);
      setState(model);
      if (sky) sky.draw(model);
      cards.forEach(function (c) { c.next = model; if (c.gate) { c.play(!c.played); c.played = true; } });
      narrate(model);
    }

    /* ----- off screen: the typing and the bot pause ----- */
    function setOnScreen(v) {
      if (v === onScreen) return;
      onScreen = v;
      if (v) { typer.resume(); if (bot && !bot.busy) { try { bot.life.start(); } catch (e) {} } }
      else { typer.pause(); if (bot && !bot.busy) { try { bot.life.stop(); } catch (e) {} } }
    }
    var io = null, seenOnScreen = true;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { seenOnScreen = en.isIntersecting; setOnScreen(seenOnScreen && !document.hidden); });
      }, { threshold: 0.05 });
      io.observe(sec);
    }
    listen(document, 'visibilitychange', function () { setOnScreen(!document.hidden && seenOnScreen); });

    var ro = null;
    if ('ResizeObserver' in window) {
      var rt = 0, lastW = 0;
      ro = new ResizeObserver(function () {
        var w = aEl.clientWidth; if (w === lastW) return; lastW = w;
        clearTimeout(rt); rt = setTimeout(function () { if (alive) typer.reserve(); }, 150);
      });
      ro.observe(cL.a);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (alive) typer.reserve(); });

    /* ----- the entrance: words, then cards, by opacity only; the data a beat later ----- */
    function fadeIn(node, delay, dur) {
      if (!node || RM || !node.animate) return;
      try { node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, delay: delay, easing: 'cubic-bezier(.37,0,.63,1)', fill: 'backwards' }); } catch (e) {}
    }
    var words = [eyebrow, title, lead, actions, stateLine].filter(Boolean);
    words.forEach(function (node, i) { fadeIn(node, Math.min(i, 4) * 150 * K, 800 * K); });
    var CARDS_AT = 600;
    cards.forEach(function (c, i) {
      var at = (CARDS_AT + i * 150) * K;
      fadeIn(c.a, at, 800 * K);
      later(function () { c.gate = true; if (c.next) { c.play(true); c.played = true; } }, at + 400 * K);
    });
    fadeIn(perch, (CARDS_AT + 300) * K, 900 * K);
    later(function () { store('session', SEEN_KEY, '1'); }, (CARDS_AT + 1500) * K);

    refresh();
    bootBot();

    return {
      refresh: refresh,
      setSource: function (fn) {
        source = typeof fn === 'function' ? fn : null;
        narrated = null;
        refresh();
      },
      destroy: function () {
        if (!alive) return;
        alive = false;
        typer.stop();
        timers.forEach(clearTimeout); timers = [];
        mine.forEach(function (t) { t.dead = true; }); mine = [];
        cleanups.forEach(function (f) { f(); }); cleanups = [];
        if (io) io.disconnect();
        if (ro) ro.disconnect();
        loop.stop = true;
        if (bot) { try { bot.destroy(); } catch (e) {} bot = null; }
        if (sec.parentNode) sec.parentNode.removeChild(sec);
      }
    };
  }

  window.HWHero = { mount: mount, version: 1 };
})();
