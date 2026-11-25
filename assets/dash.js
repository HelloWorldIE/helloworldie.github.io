/* HelloWorld dashboard: four cards on a dark stage (window.HWDash).
   Codebase (an isometric skyline, one tower per project), Languages (a donut of code by
   language), Activity (time since the last change, ticking) and Live (projects with a live
   site or a demo, scrolling). Behind them, the brand's dotted planet turns slowly.

   const ctl = HWDash.mount(element, { mode: 'hero' | 'full', onOpen(route) });
   ctl.update({ projects, hiddenCount, signedIn, account, loading });
   ctl.destroy();

   projects are HWGH.projects() items. Every value from GitHub goes in as text, never as HTML.
   No libraries: canvas 2D and SVG only. */
(function () {
  'use strict';

  var CFG = window.HW_CONFIG || { categories: {}, statuses: {} };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var own = function (o, k) { return o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k); };

  /* ---------- colours ---------- */
  var CAT_FALLBACK = ['#a98bff', '#4fd1d9', '#7aa7ff', '#ff9f68', '#ff7ac6', '#f5c451', '#2ed47f', '#a3b1c6', '#ff8fa3'];

  // The category colour from the shared config: [on light, on dark] for each id, "_none" for none.
  function categoryColour(id, onDark) {
    var cc = CFG.category_colours || {};
    var pair = own(cc, id) ? cc[id] : null;
    if (!pair) {
      var ids = Object.keys(CFG.categories || {});
      var i = ids.indexOf(id);
      if (i >= 0) return CAT_FALLBACK[i % CAT_FALLBACK.length];
      pair = own(cc, '_none') ? cc._none : ['#8d89a0', '#77738a'];
    }
    return onDark ? pair[1] : pair[0];
  }
  function categoryLabel(id) { return own(CFG.categories, id) ? CFG.categories[id] : 'Not sorted yet'; }

  // GitHub's own language colours, used until the hub has loaded them from GitHub.
  var LANG_BASE = {
    'TypeScript': '#3178c6', 'JavaScript': '#f1e05a', 'PHP': '#4F5D95', 'Python': '#3572A5', 'HTML': '#e34c26',
    'CSS': '#563d7c', 'SCSS': '#c6538c', 'Shell': '#89e051', 'Go': '#00ADD8', 'Svelte': '#ff3e00', 'Vue': '#41b883',
    'Astro': '#ff5a03', 'GLSL': '#5686a5', 'Swift': '#F05138', 'Kotlin': '#A97BFF', 'Java': '#b07219', 'Ruby': '#701516',
    'C#': '#178600', 'Dart': '#00B4AB', 'Rust': '#dea584', 'C': '#555555', 'C++': '#f34b7d', 'Hack': '#878787',
    'Blade': '#f7523f', 'Twig': '#c1d026', 'MDX': '#fcb32c', 'Dockerfile': '#384d54', 'PowerShell': '#012456',
    'Jupyter Notebook': '#DA5B0B', 'Less': '#1d365d', 'Handlebars': '#f7931e', 'Liquid': '#67b8de', 'Lua': '#000080'
  };
  var LANG_FALLBACK = ['#a98bff', '#4fd1d9', '#2ed47f', '#f5c451', '#ff7ac6', '#ff9f68', '#7aa7ff'];
  var OTHER_COLOUR = '#6b6680';

  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.replace(/./g, function (c) { return c + c; });
    if (!/^[0-9a-f]{6}$/i.test(h)) return [169, 139, 255];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbToHex(c) { return '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function mix(hex, toHex, t) { var a = hexToRgb(hex), b = hexToRgb(toHex); return rgbToHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }
  function luminance(hex) {
    var c = hexToRgb(hex).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  // Lift a colour that would vanish on the dark stage.
  function onDark(hex) {
    var l = luminance(hex);
    if (l < 0.06) return mix(hex, '#ffffff', 0.45);
    if (l < 0.14) return mix(hex, '#ffffff', 0.28);
    return hex;
  }
  function rgba(hex, a) { var c = hexToRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  function langColour(name, i) {
    var c = (window.HWGH && window.HWGH.langColour && window.HWGH.langColour(name)) || LANG_BASE[name] || LANG_FALLBACK[i % LANG_FALLBACK.length];
    return onDark(c);
  }

  /* ---------- small helpers ---------- */
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svg(tag, attrs) { var e = document.createElementNS(SVGNS, tag); for (var k in attrs) if (own(attrs, k)) e.setAttribute(k, attrs[k]); return e; }
  function fmt(n) { return Number(n || 0).toLocaleString('en-IE'); }
  function plural(n, one, many) { return fmt(n) + ' ' + (n === 1 ? one : (many || one + 's')); }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function ago(ms) {
    var s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 90) return 'just now';
    if (s < 3600) return plural(Math.round(s / 60), 'minute') + ' ago';
    if (s < 86400 * 1.5) return plural(Math.round(s / 3600), 'hour') + ' ago';
    if (s < 86400 * 60) return plural(Math.round(s / 86400), 'day') + ' ago';
    if (s < 86400 * 365 * 1.5) return plural(Math.round(s / (86400 * 30.4)), 'month') + ' ago';
    return plural(Math.round(s / (86400 * 365)), 'year') + ' ago';
  }
  function time(p) { var t = Date.parse(p && p.pushed_at); return isFinite(t) ? t : 0; }
  function easeOut(t) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3); }

  function defaultOpen(route) {
    var onDashPage = /\/dashboard\/?(index\.html)?$/.test(location.pathname);
    if (onDashPage) location.href = '../' + route;
    else location.hash = route;
  }

  /* ---------- the markup (static: no data in it) ---------- */
  var TEMPLATE =
    '<canvas class="hwd-globe" aria-hidden="true"></canvas>' +
    '<div class="hwd-grid">' +
      '<section class="hwd-card hwd-code">' +
        '<button type="button" class="hwd-hit" data-k="code-hit"></button>' +
        '<div class="hwd-head" aria-hidden="true">' +
          '<div class="hwd-eyebrow"><span class="hwd-pip"></span>Codebase</div>' +
          '<div class="hwd-big"><span data-k="code-n">0</span><span class="hwd-unit hwd-unit--word" data-k="code-unit">projects</span></div>' +
          '<div class="hwd-sub" data-k="code-sub"></div>' +
        '</div>' +
        '<div class="hwd-vis"><canvas aria-hidden="true" data-k="code-canvas"></canvas><div class="hwd-caption" aria-hidden="true" data-k="code-cap"></div></div>' +
        '<div class="hwd-cats" aria-hidden="true" data-k="code-cats"></div>' +
      '</section>' +
      '<section class="hwd-card hwd-lang">' +
        '<button type="button" class="hwd-hit" data-k="lang-hit"></button>' +
        '<div class="hwd-head" aria-hidden="true">' +
          '<div class="hwd-eyebrow"><span class="hwd-pip"></span>Languages</div>' +
          '<div class="hwd-big" data-k="lang-top">&nbsp;</div>' +
          '<div class="hwd-sub" data-k="lang-sub"></div>' +
        '</div>' +
        '<div class="hwd-vis"><div class="hwd-langwrap" data-k="lang-wrap"></div></div>' +
      '</section>' +
      '<section class="hwd-card hwd-act">' +
        '<button type="button" class="hwd-hit" data-k="act-hit"></button>' +
        '<div class="hwd-head" aria-hidden="true">' +
          '<div class="hwd-eyebrow"><span class="hwd-pip"></span>Activity</div>' +
          '<div class="hwd-big" data-k="act-clock">&nbsp;</div>' +
          '<div class="hwd-sub" data-k="act-sub"></div>' +
          '<div class="hwd-sub" data-k="act-30" hidden></div>' +
        '</div>' +
        '<div class="hwd-act-body">' +
          '<ul class="hwd-recent" data-k="act-list"></ul>' +
          '<div class="hwd-vis" aria-hidden="true"><div class="hwd-bars" data-k="act-bars"></div><div class="hwd-bars-key"><span>12 weeks ago</span><span>This week</span></div></div>' +
        '</div>' +
      '</section>' +
      '<section class="hwd-card hwd-live">' +
        '<button type="button" class="hwd-hit" data-k="live-hit"></button>' +
        '<div class="hwd-head" aria-hidden="true">' +
          '<div class="hwd-eyebrow"><span class="hwd-pip"></span>Live</div>' +
          '<div class="hwd-big"><span data-k="live-n">0</span><span class="hwd-unit hwd-unit--word">live sites and demos</span></div>' +
          '<div class="hwd-sub" data-k="live-sub"></div>' +
        '</div>' +
        '<div class="hwd-vis"><div class="hwd-marquee" data-k="live-marquee"></div></div>' +
      '</section>' +
    '</div>';

  /* ---------- mount ---------- */
  function mount(root, opts) {
    opts = opts || {};
    var mode = opts.mode === 'full' ? 'full' : 'hero';
    var open = typeof opts.onOpen === 'function' ? opts.onOpen : defaultOpen;
    var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var reduce = !!mq.matches;

    root.classList.add('hwd', 'hwd--' + mode, 'is-loading');
    root.innerHTML = TEMPLATE;
    var $ = function (k) { return root.querySelector('[data-k="' + k + '"]'); };

    var tokens = {};
    function readTokens() {
      var cs = getComputedStyle(root);
      tokens.accent = (cs.getPropertyValue('--stage-accent') || '#a98bff').trim() || '#a98bff';
      tokens.ink = (cs.getPropertyValue('--stage-ink') || '#f6f5fa').trim() || '#f6f5fa';
      tokens.dim = (cs.getPropertyValue('--stage-dim') || '#aaa6b8').trim() || '#aaa6b8';
    }
    readTokens();

    var model = null, firstData = true;
    var visible = true, raf = 0, last = 0, startedAt = performance.now();
    var dpr = Math.min(2, window.devicePixelRatio || 1);

    /* ===== the dotted planet ===== */
    var globe = { canvas: root.querySelector('.hwd-globe'), ctx: null, w: 0, h: 0, pts: [] };
    globe.ctx = globe.canvas.getContext('2d');
    (function makeSphere() {
      var n = mode === 'full' ? 900 : 620, g = Math.PI * (3 - Math.sqrt(5));
      for (var i = 0; i < n; i++) {
        var y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = g * i;
        globe.pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
      }
    })();
    function drawGlobe(t) {
      var c = globe.ctx, W = globe.w, H = globe.h;
      if (!W || !H) return;
      c.clearRect(0, 0, W, H);
      var cx, cy, R;
      if (mode === 'full') { cx = W * 0.5; cy = H * 0.54; R = Math.min(W, H) * 0.47; }
      else { cx = W * 0.84; cy = H * 1.02; R = Math.max(H * 0.95, Math.min(W * 0.32, 520 * dpr)); }
      var rot = t * 0.00004, tilt = 0.42, cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
      var ac = hexToRgb(tokens.accent);
      // orbit ring, behind
      var orx = R * 1.32, ory = R * 0.3, oang = -0.22;
      c.save(); c.translate(cx, cy); c.rotate(oang);
      c.strokeStyle = 'rgba(' + ac[0] + ',' + ac[1] + ',' + ac[2] + ',0.10)'; c.lineWidth = 1 * dpr;
      c.beginPath(); c.ellipse(0, 0, orx, ory, 0, Math.PI, Math.PI * 2); c.stroke();
      c.restore();
      for (var i = 0; i < globe.pts.length; i++) {
        var p = globe.pts[i];
        var x = p[0] * cr + p[2] * sr, z = -p[0] * sr + p[2] * cr, y = p[1];
        var y2 = y * ct - z * st, z2 = y * st + z * ct;
        if (z2 < -0.15) continue;
        var a = z2 > 0 ? 0.07 + 0.30 * z2 : 0.035;
        var s = (0.7 + 0.9 * (z2 + 1) / 2) * dpr;
        c.fillStyle = 'rgba(' + ac[0] + ',' + ac[1] + ',' + ac[2] + ',' + a.toFixed(3) + ')';
        c.fillRect(cx + x * R - s / 2, cy + y2 * R - s / 2, s, s);
      }
      // orbit ring, in front, with a satellite
      c.save(); c.translate(cx, cy); c.rotate(oang);
      c.strokeStyle = 'rgba(' + ac[0] + ',' + ac[1] + ',' + ac[2] + ',0.16)';
      c.beginPath(); c.ellipse(0, 0, orx, ory, 0, 0, Math.PI); c.stroke();
      var sa = t * 0.00035, sx = Math.cos(sa) * orx, sy = Math.sin(sa) * ory, front = Math.sin(sa) > 0;
      c.fillStyle = 'rgba(' + ac[0] + ',' + ac[1] + ',' + ac[2] + ',' + (front ? 0.85 : 0.18) + ')';
      c.beginPath(); c.arc(sx, sy, 2.6 * dpr, 0, Math.PI * 2); c.fill();
      c.restore();
    }

    /* ===== codebase skyline ===== */
    var sky = { canvas: $('code-canvas'), ctx: null, w: 0, h: 0, towers: [], hover: null, dirty: true, geo: null };
    sky.ctx = sky.canvas.getContext('2d');
    var cap = $('code-cap');

    function buildTowers(projects) {
      var prev = Object.create(null);
      sky.towers.forEach(function (t) { prev[t.name] = t.cur; });
      var list = projects.slice().sort(function (a, b) { return (b.size || 0) - (a.size || 0) || String(a.name).localeCompare(b.name); });
      var maxLog = 1;
      list.forEach(function (p) { maxLog = Math.max(maxLog, Math.log(1 + (p.size || 0))); });
      sky.towers = list.map(function (p, i) {
        var target = 0.18 + 0.82 * (Math.log(1 + (p.size || 0)) / maxLog);
        var cur = own(prev, p.name) ? prev[p.name] : 0;
        return {
          name: p.name, title: p.title, category: p.category,
          colour: categoryColour(p.category, true), target: target, cur: reduce ? target : cur,
          delay: firstData ? i * 28 : 0, seed: hash(p.name), poly: null
        };
      });
      layoutSky();
      sky.dirty = true;
    }

    function layoutSky() {
      var n = sky.towers.length, W = sky.w, H = sky.h;
      if (!n || !W || !H) { sky.geo = null; return; }
      var cols = Math.max(1, Math.ceil(Math.sqrt(n * 1.3))), rows = Math.max(1, Math.ceil(n / cols));
      var pad = 4 * dpr, span = cols + rows;
      var aW = (W - 2 * pad) / span;
      var maxH = H * (mode === 'full' ? 0.46 : 0.56);
      var bH = (H - 2 * pad - maxH) / span;
      var a = Math.min(aW, bH * 2, (mode === 'full' ? 64 : 46) * dpr), b = a / 2;
      maxH = Math.min(H - 2 * pad - span * b, a * 7);
      var ox = W / 2 - ((cols - 1) - (rows - 1)) * a / 2;
      var oy = H - pad - (cols + rows - 1) * b;
      // fill back to front by diagonal, so the tallest stand at the back
      var cells = [];
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) cells.push([c, r]);
      cells.sort(function (p, q) { return (p[0] + p[1]) - (q[0] + q[1]) || Math.abs(p[0] - p[1]) - Math.abs(q[0] - q[1]); });
      sky.towers.forEach(function (t, i) { t.c = cells[i][0]; t.r = cells[i][1]; });
      sky.geo = { a: a, b: b, ox: ox, oy: oy, maxH: maxH, cols: cols, rows: rows };
    }

    function stepSky(dt, now) {
      var moving = false;
      sky.towers.forEach(function (t) {
        if (now - startedAt < t.delay && firstRun) { moving = true; return; }
        var d = t.target - t.cur;
        if (Math.abs(d) > 0.002) { t.cur += d * Math.min(1, dt * 0.0055); moving = true; }
        else t.cur = t.target;
      });
      return moving;
    }
    var firstRun = true;

    function drawSky() {
      var c = sky.ctx, W = sky.w, H = sky.h, g = sky.geo;
      c.clearRect(0, 0, W, H);
      if (!g) return;
      var a = g.a, b = g.b;
      // ground plate
      var gx = function (cc, rr) { return g.ox + (cc - rr) * a; }, gy = function (cc, rr) { return g.oy + (cc + rr) * b; };
      c.beginPath();
      c.moveTo(gx(-0.5, -0.5), gy(-0.5, -0.5));
      c.lineTo(gx(g.cols - 0.5, -0.5), gy(g.cols - 0.5, -0.5));
      c.lineTo(gx(g.cols - 0.5, g.rows - 0.5), gy(g.cols - 0.5, g.rows - 0.5));
      c.lineTo(gx(-0.5, g.rows - 0.5), gy(-0.5, g.rows - 0.5));
      c.closePath();
      c.fillStyle = rgba(tokens.accent, 0.07); c.fill();
      c.strokeStyle = rgba(tokens.accent, 0.22); c.lineWidth = 1 * dpr; c.stroke();
      c.strokeStyle = rgba(tokens.accent, 0.08);
      for (var i = 0; i < g.cols; i++) { c.beginPath(); c.moveTo(gx(i + 0.5, -0.5), gy(i + 0.5, -0.5)); c.lineTo(gx(i + 0.5, g.rows - 0.5), gy(i + 0.5, g.rows - 0.5)); if (i < g.cols - 1) c.stroke(); }
      for (var j = 0; j < g.rows - 1; j++) { c.beginPath(); c.moveTo(gx(-0.5, j + 0.5), gy(-0.5, j + 0.5)); c.lineTo(gx(g.cols - 0.5, j + 0.5), gy(g.cols - 0.5, j + 0.5)); c.stroke(); }

      var order = sky.towers.slice().sort(function (p, q) { return (p.c + p.r) - (q.c + q.r) || p.c - q.c; });
      var w = a * 0.74, d = b * 0.74;
      order.forEach(function (t) {
        var x = g.ox + (t.c - t.r) * a, y = g.oy + (t.c + t.r) * b;
        var h = Math.max(0, t.cur) * g.maxH;
        var hot = sky.hover === t;
        var base = hot ? mix(t.colour, '#ffffff', 0.25) : t.colour;
        // left face
        c.beginPath(); c.moveTo(x - w, y - h); c.lineTo(x, y - h + d); c.lineTo(x, y + d); c.lineTo(x - w, y); c.closePath();
        c.fillStyle = mix(base, '#15121d', 0.30); c.fill();
        // right face
        c.beginPath(); c.moveTo(x, y - h + d); c.lineTo(x + w, y - h); c.lineTo(x + w, y); c.lineTo(x, y + d); c.closePath();
        c.fillStyle = mix(base, '#15121d', 0.52); c.fill();
        // lit windows
        if (a > 7 * dpr && h > 10 * dpr) {
          var rowsW = Math.floor((h - 6 * dpr) / (5 * dpr)), seed = t.seed;
          for (var k = 0; k < rowsW; k++) {
            var yy = y - h + d + 5 * dpr + k * 5 * dpr;
            for (var m = 0; m < 2; m++) {
              seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0;
              if ((seed & 7) > 2) continue;
              var fx = 0.28 + m * 0.4;
              var px = x - w + w * fx, py = yy - d * fx + (seed & 1) * 0;
              c.fillStyle = 'rgba(255,240,200,' + (0.28 + (seed & 3) * 0.1) + ')';
              c.fillRect(px, py, 1.6 * dpr, 1.6 * dpr);
              var qx = x + w * fx, qy = yy - d * (1 - fx) + d * 0.0;
              if (((seed >>> 4) & 3) === 0) { c.fillStyle = 'rgba(255,240,200,0.22)'; c.fillRect(qx, qy, 1.6 * dpr, 1.6 * dpr); }
            }
          }
        }
        // top face
        c.beginPath(); c.moveTo(x, y - h - d); c.lineTo(x + w, y - h); c.lineTo(x, y - h + d); c.lineTo(x - w, y - h); c.closePath();
        c.fillStyle = mix(base, '#ffffff', 0.18); c.fill();
        c.strokeStyle = 'rgba(255,255,255,' + (hot ? 0.7 : 0.22) + ')'; c.lineWidth = 1 * dpr; c.stroke();
        t.poly = [[x - w, y - h], [x, y - h - d], [x + w, y - h], [x + w, y], [x, y + d], [x - w, y]];
      });
      sky.dirty = false;
    }

    function inPoly(pt, poly) {
      var inside = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    }
    function towerAt(clientX, clientY) {
      var r = sky.canvas.getBoundingClientRect();
      var pt = [(clientX - r.left) * dpr, (clientY - r.top) * dpr];
      if (pt[0] < 0 || pt[1] < 0 || pt[0] > sky.w || pt[1] > sky.h) return null;
      var order = sky.towers.slice().sort(function (p, q) { return (q.c + q.r) - (p.c + p.r) || q.c - p.c; });
      for (var i = 0; i < order.length; i++) if (order[i].poly && inPoly(pt, order[i].poly)) return order[i];
      return null;
    }
    var codeCard = root.querySelector('.hwd-code');
    function onSkyMove(e) {
      var t = towerAt(e.clientX, e.clientY);
      if (t !== sky.hover) {
        sky.hover = t; sky.dirty = true;
        if (t) { cap.textContent = t.title + ' · ' + categoryLabel(t.category); cap.classList.add('is-on'); }
        else cap.classList.remove('is-on');
        kick();
      }
    }
    function onSkyLeave() { if (sky.hover) { sky.hover = null; sky.dirty = true; cap.classList.remove('is-on'); kick(); } }
    codeCard.addEventListener('pointermove', onSkyMove);
    codeCard.addEventListener('pointerleave', onSkyLeave);
    $('code-hit').addEventListener('click', function (e) {
      var t = e.detail > 0 ? towerAt(e.clientX, e.clientY) : null;
      open(t ? '#/p/' + encodeURIComponent(t.name) : '#/all');
    });

    /* ===== languages ===== */
    var donut = { segs: [], svg: null, paths: [], center: null, progress: 1, focus: null };

    function arcPath(cx, cy, r0, r1, a0, a1) {
      var large = a1 - a0 > Math.PI ? 1 : 0;
      var p = function (r, a) { return (cx + r * Math.cos(a)).toFixed(3) + ' ' + (cy + r * Math.sin(a)).toFixed(3); };
      return 'M' + p(r1, a0) + ' A' + r1 + ' ' + r1 + ' 0 ' + large + ' 1 ' + p(r1, a1) +
        ' L' + p(r0, a1) + ' A' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + p(r0, a0) + ' Z';
    }
    function drawDonut() {
      var total = 0; donut.segs.forEach(function (s) { total += s.value; });
      var sweep = Math.PI * 2 * donut.progress, a = -Math.PI / 2, gap = donut.segs.length > 1 ? 0.025 : 0;
      donut.segs.forEach(function (s, i) {
        var span = total ? (s.value / total) * sweep : 0;
        var a0 = a + gap / 2, a1 = Math.max(a0 + 0.0001, a + span - gap / 2);
        var on = donut.focus === s.name;
        donut.paths[i].setAttribute('d', span > 0.001 ? arcPath(60, 60, on ? 34 : 36, on ? 58 : 55, a0, a1) : '');
        donut.paths[i].classList.toggle('is-on', on);
        a += span;
      });
    }
    function setDonutFocus(name) {
      donut.focus = name;
      if (donut.svg) donut.svg.classList.toggle('is-focus', !!name);
      root.querySelectorAll('.hwd-key').forEach(function (k) { k.classList.toggle('is-on', k.getAttribute('data-lang') === name); });
      var s = null; donut.segs.forEach(function (x) { if (x.name === name) s = x; });
      if (!s) s = donut.segs[0];
      if (donut.center && s) { donut.center.big.textContent = s.pct + '%'; donut.center.small.textContent = s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name; }
      drawDonut();
    }

    function buildLanguages(projects) {
      var sums = Object.create(null), total = 0;
      projects.forEach(function (p) {
        var langs = p.languages || {};
        Object.keys(langs).forEach(function (k) { var v = Number(langs[k]) || 0; if (v > 0) { sums[k] = (sums[k] || 0) + v; total += v; } });
      });
      var names = Object.keys(sums).sort(function (x, y) { return sums[y] - sums[x]; });
      var top = names.slice(0, 6), rest = names.slice(6), other = 0;
      rest.forEach(function (n) { other += sums[n]; });
      var segs = top.map(function (n, i) { return { name: n, value: sums[n], colour: langColour(n, i), lang: true }; });
      if (other > 0) segs.push({ name: 'Other', value: other, colour: OTHER_COLOUR, lang: false, count: rest.length });
      segs.forEach(function (s) { s.pct = total ? Math.max(s.value / total * 100 < 0.5 ? 0 : 1, Math.round(s.value / total * 100)) : 0; });
      donut.segs = segs;

      var wrap = $('lang-wrap'); wrap.textContent = '';
      var topEl = $('lang-top'), sub = $('lang-sub'), hit = $('lang-hit');
      if (!segs.length) {
        topEl.textContent = model && model.loading ? ' ' : 'No code yet';
        sub.textContent = model && model.loading ? '' : 'Languages show once projects have code.';
        hit.setAttribute('aria-label', 'Languages: no code to count yet. Open all projects.');
        donut.svg = null; return;
      }
      topEl.textContent = segs[0].name;
      sub.textContent = segs[0].pct + '% of the code, across ' + plural(names.length, 'language');
      hit.setAttribute('aria-label', 'Languages: ' + segs[0].name + ' leads with ' + segs[0].pct + ' percent of the code, across ' +
        plural(names.length, 'language') + '. Open all projects.');

      var s = svg('svg', { viewBox: '0 0 120 120', class: 'hwd-donut', 'aria-hidden': 'true', focusable: 'false' });
      donut.paths = segs.map(function (seg) {
        var p = svg('path', { fill: seg.colour });
        if (seg.lang) {
          p.addEventListener('click', function (e) { e.stopPropagation(); open('#/all?lang=' + encodeURIComponent(seg.name)); });
        } else {
          p.addEventListener('click', function (e) { e.stopPropagation(); open('#/all'); });
        }
        p.addEventListener('pointerenter', function () { setDonutFocus(seg.name); });
        p.addEventListener('pointerleave', function () { setDonutFocus(null); });
        s.appendChild(p);
        return p;
      });
      var big = svg('text', { x: '60', y: '62', 'text-anchor': 'middle', class: 'hwd-dc-big' });
      var small = svg('text', { x: '60', y: '74', 'text-anchor': 'middle', class: 'hwd-dc-small' });
      s.appendChild(big); s.appendChild(small);
      donut.center = { big: big, small: small };
      donut.svg = s;
      wrap.appendChild(s);

      var ul = el('ul', 'hwd-keys');
      segs.forEach(function (seg) {
        var li = el('li');
        var b = el(seg.lang ? 'button' : 'span', 'hwd-key' + (seg.lang ? '' : ' is-static'));
        if (seg.lang) {
          b.type = 'button';
          b.setAttribute('data-lang', seg.name);
          b.setAttribute('aria-label', seg.name + ', ' + seg.pct + ' percent. Show projects in ' + seg.name + '.');
          b.addEventListener('click', function () { open('#/all?lang=' + encodeURIComponent(seg.name)); });
          b.addEventListener('pointerenter', function () { setDonutFocus(seg.name); });
          b.addEventListener('pointerleave', function () { setDonutFocus(null); });
          b.addEventListener('focus', function () { setDonutFocus(seg.name); });
          b.addEventListener('blur', function () { setDonutFocus(null); });
        } else {
          b.setAttribute('aria-label', 'Other, ' + seg.pct + ' percent, ' + plural(seg.count, 'more language') + '.');
          b.setAttribute('data-lang', 'Other');
        }
        var dot = el('span', 'hwd-dot'); dot.style.background = seg.colour; dot.setAttribute('aria-hidden', 'true');
        var nm = el('span', 'hwd-key-name', seg.name); nm.setAttribute('aria-hidden', 'true');
        var pc = el('span', 'hwd-key-pct', seg.pct + '%'); pc.setAttribute('aria-hidden', 'true');
        b.appendChild(dot); b.appendChild(nm); b.appendChild(pc);
        li.appendChild(b); ul.appendChild(li);
      });
      wrap.appendChild(ul);
      donut.progress = reduce || !firstData ? 1 : 0;
      setDonutFocus(null);
    }
    $('lang-hit').addEventListener('click', function () { open('#/all'); });

    /* ===== activity ===== */
    var act = { latest: 0, latestTitle: '', countFrom: 0, counting: false, countStart: 0 };
    var clockEl = $('act-clock');

    function renderClock(seconds) {
      seconds = Math.max(0, Math.floor(seconds));
      var d = Math.floor(seconds / 86400), h = Math.floor(seconds % 86400 / 3600), m = Math.floor(seconds % 3600 / 60), s = seconds % 60;
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      clockEl.textContent = '';
      var parts = [];
      if (d > 0) parts.push([String(d), 'd']);
      parts.push([d > 0 ? pad(h) : String(h), 'h']);
      parts.push([pad(m), 'm']);
      parts.forEach(function (p) { clockEl.appendChild(document.createTextNode(p[0])); clockEl.appendChild(el('span', 'hwd-unit', p[1])); });
      if (!reduce && d < 100) { var sec = el('span', 'hwd-sec', pad(s)); clockEl.appendChild(sec); clockEl.appendChild(el('span', 'hwd-unit', 's')); }
    }
    function spokenSince(ms) {
      var s = Math.max(0, (Date.now() - ms) / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
      var out = [];
      if (d) out.push(plural(d, 'day'));
      if (h || d) out.push(plural(h, 'hour'));
      if (!d) out.push(plural(m, 'minute'));
      return out.join(' ');
    }
    function tickClock(now) {
      if (!act.latest) return;
      var real = (Date.now() - act.latest) / 1000;
      if (act.counting) {
        var t = (now - act.countStart) / 1400;
        if (t >= 1) { act.counting = false; renderClock(real); }
        else renderClock(real * easeOut(t));
        return act.counting;
      }
      renderClock(real);
      return false;
    }

    function buildActivity(projects) {
      var sorted = projects.filter(function (p) { return time(p) > 0; }).sort(function (a, b) { return time(b) - time(a); });
      var sub = $('act-sub'), thirty = $('act-30'), hit = $('act-hit');
      if (!sorted.length) {
        act.latest = 0;
        clockEl.textContent = model && model.loading ? ' ' : 'No changes yet';
        sub.textContent = ''; thirty.hidden = true;
        hit.setAttribute('aria-label', 'Activity: no changes yet. Open projects by most recent change.');
      } else {
        act.latest = time(sorted[0]); act.latestTitle = sorted[0].title;
        sub.textContent = '';
        sub.appendChild(document.createTextNode('since the last change, in '));
        sub.appendChild(el('strong', null, sorted[0].title));
        var anyRecent = projects.some(function (p) { return typeof p.recent === 'number'; });
        var sum = 0; projects.forEach(function (p) { if (typeof p.recent === 'number') sum += p.recent; });
        thirty.hidden = !anyRecent;
        thirty.textContent = anyRecent ? plural(sum, 'change') + ' in the last 30 days' : '';
        hit.setAttribute('aria-label', 'Activity: the last change was ' + spokenSince(act.latest) + ' ago, in ' + sorted[0].title + '.' +
          (anyRecent ? ' ' + plural(sum, 'change') + ' in the last 30 days.' : '') + ' Open projects by most recent change.');
        if (firstData && !reduce) { act.counting = true; act.countStart = performance.now(); }
        else renderClock((Date.now() - act.latest) / 1000);
      }

      // twelve weeks of last changes
      var weeks = new Array(12).fill(0), now = Date.now();
      sorted.forEach(function (p) { var w = Math.floor((now - time(p)) / (7 * 864e5)); if (w >= 0 && w < 12) weeks[11 - w]++; });
      var max = Math.max(1, Math.max.apply(null, weeks));
      var box = $('act-bars'); box.textContent = '';
      var s = svg('svg', { viewBox: '0 0 240 80', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' });
      weeks.forEach(function (v, i) {
        var bw = 240 / 12, h = v ? Math.max(4, (v / max) * 74) : 2;
        var r = svg('rect', { x: (i * bw + 3).toFixed(2), y: (80 - h).toFixed(2), width: (bw - 6).toFixed(2), height: h.toFixed(2), rx: '3' });
        r.setAttribute('fill', i === 11 ? tokens.accent : rgba(tokens.accent, v ? 0.45 : 0.18));
        s.appendChild(r);
      });
      box.appendChild(s);

      // the five latest (full mode)
      var list = $('act-list'); list.textContent = '';
      if (mode === 'full') {
        sorted.slice(0, 5).forEach(function (p) {
          var li = el('li'), b = el('button', 'hwd-row');
          b.type = 'button';
          b.setAttribute('aria-label', p.title + ', changed ' + ago(time(p)) + '. Open project.');
          var dot = el('span', 'hwd-dot'); dot.style.background = categoryColour(p.category, true); dot.setAttribute('aria-hidden', 'true');
          var n = el('span', 'hwd-row-name', p.title); n.setAttribute('aria-hidden', 'true');
          var w = el('span', 'hwd-row-when', ago(time(p))); w.setAttribute('aria-hidden', 'true');
          b.appendChild(dot); b.appendChild(n); b.appendChild(w);
          b.addEventListener('click', function () { open('#/p/' + encodeURIComponent(p.name)); });
          li.appendChild(b); list.appendChild(li);
        });
      }
    }
    $('act-hit').addEventListener('click', function () { open('#/all?sort=recent'); });

    /* ===== live ===== */
    var marquee = { lanes: [], paused: false, items: [] };
    var liveBox = $('live-marquee');
    liveBox.addEventListener('pointerenter', function () { marquee.paused = true; });
    liveBox.addEventListener('pointerleave', function () { marquee.paused = liveBox.contains(document.activeElement); kick(); });
    liveBox.addEventListener('focusin', function (e) {
      marquee.paused = true;
      marquee.lanes.forEach(function (ln) {
        if (ln.track.contains(e.target) && ln.moving) {
          ln.offset = Math.max(0, Math.min(ln.setWidth - 1, e.target.offsetLeft - 16));
          ln.track.style.transform = 'translateX(' + (-ln.offset) + 'px)';
        }
      });
    });
    liveBox.addEventListener('focusout', function () { setTimeout(function () { marquee.paused = liveBox.contains(document.activeElement) || liveBox.matches(':hover'); kick(); }, 0); });

    function tile(p, copy) {
      var b = el('button', 'hwd-tile');
      b.type = 'button';
      if (copy) { b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); }
      else b.setAttribute('aria-label', p.title + (p.live_url ? ', live' : '') + (p.demo ? ', has a demo' : '') + '. Open project.');
      var name = el('span', 'hwd-tile-name', p.title); name.setAttribute('aria-hidden', 'true');
      var meta = el('span', 'hwd-tile-meta'); meta.setAttribute('aria-hidden', 'true');
      if (p.live_url) meta.appendChild(el('span', 'hwd-tag hwd-tag--live', 'Live'));
      if (p.demo) meta.appendChild(el('span', 'hwd-tag', 'Demo'));
      var dot = el('span', 'hwd-dot'); dot.style.background = categoryColour(p.category, true);
      meta.appendChild(dot);
      meta.appendChild(el('span', null, categoryLabel(p.category)));
      b.appendChild(name); b.appendChild(meta);
      b.addEventListener('click', function () { open('#/p/' + encodeURIComponent(p.name)); });
      return b;
    }

    function buildLive(projects) {
      var items = projects.filter(function (p) { return p.live_url || p.demo; }).sort(function (a, b) { return time(b) - time(a); });
      marquee.items = items;
      var live = items.filter(function (p) { return p.live_url; }).length, demos = items.filter(function (p) { return p.demo; }).length;
      $('live-n').textContent = fmt(items.length);
      var sub = $('live-sub'), hit = $('live-hit');
      sub.textContent = items.length ? plural(live, 'live site') + ', ' + plural(demos, 'demo') : '';
      hit.setAttribute('aria-label', 'Live: ' + plural(items.length, 'project') + ' with a live site or a demo' +
        (items.length ? ', ' + plural(live, 'live site') + ' and ' + plural(demos, 'demo') : '') + '. Open all projects.');
      liveBox.textContent = '';
      marquee.lanes = [];
      if (!items.length) {
        var empty = el('p', 'hwd-empty', model && model.loading ? '' : 'No live sites or demos yet. A project shows here once its hub card has a live_url or a demo.');
        liveBox.appendChild(empty);
        return;
      }
      var laneCount = wantedLanes(items.length);
      for (var l = 0; l < laneCount; l++) {
        var mine = items.filter(function (_, i) { return i % laneCount === l; });
        var lane = el('div', 'hwd-lane'), track = el('div', 'hwd-track');
        mine.forEach(function (p) { track.appendChild(tile(p, false)); });
        lane.appendChild(track); liveBox.appendChild(lane);
        marquee.lanes.push({ lane: lane, track: track, items: mine, offset: 0, setWidth: 0, moving: false, dir: l % 2 ? -1 : 1, speed: 0.022 + l * 0.006 });
      }
      measureLanes();
    }

    // Two lanes in full mode when there are enough tiles and room for both.
    function wantedLanes(n) {
      if (mode !== 'full' || n < 6) return 1;
      var h = liveBox.clientHeight, tileH = 104 + 4;
      return h >= tileH * 2 + 10 ? 2 : 1;
    }
    function measureLanes() {
      marquee.lanes.forEach(function (ln) {
        // drop old copies, then measure one set
        Array.prototype.slice.call(ln.track.querySelectorAll('[aria-hidden="true"].hwd-tile')).forEach(function (n) { n.remove(); });
        var setWidth = ln.track.scrollWidth + 10;
        var fits = setWidth <= ln.lane.clientWidth + 10;
        ln.moving = !reduce && !fits;
        ln.lane.classList.toggle('is-static', !ln.moving);
        ln.setWidth = setWidth;
        if (ln.moving) {
          ln.items.forEach(function (p) { ln.track.appendChild(tile(p, true)); });
          if (ln.dir < 0 && !ln.offset) ln.offset = setWidth * 0.5;
        } else {
          ln.offset = 0; ln.track.style.transform = '';
        }
      });
    }
    function stepMarquee(dt) {
      var any = false;
      marquee.lanes.forEach(function (ln) {
        if (!ln.moving) return;
        any = true;
        if (marquee.paused) return;
        ln.offset += ln.dir * ln.speed * dt;
        if (ln.offset >= ln.setWidth) ln.offset -= ln.setWidth;
        if (ln.offset < 0) ln.offset += ln.setWidth;
        ln.track.style.transform = 'translateX(' + (-ln.offset).toFixed(1) + 'px)';
      });
      return any;
    }
    $('live-hit').addEventListener('click', function () { open('#/all?live=1'); });

    /* ===== codebase text ===== */
    function buildCodeText(projects) {
      var n = projects.length, hidden = (model && model.hiddenCount) || 0;
      $('code-n').textContent = fmt(n);
      $('code-unit').textContent = n === 1 ? 'project' : 'projects';
      var sub = $('code-sub');
      sub.textContent = hidden > 0 ? fmt(hidden) + ' more archived or forked' : (model && model.signedIn === false ? 'Public repos only' : '');
      var counts = Object.create(null);
      projects.forEach(function (p) { var k = p.category || '_none'; counts[k] = (counts[k] || 0) + 1; });
      $('code-hit').setAttribute('aria-label', 'Codebase: ' + plural(n, 'project') +
        (hidden > 0 ? ', ' + fmt(hidden) + ' more archived or forked' : '') + '. Open all projects.');
      var cats = $('code-cats'); cats.textContent = '';
      Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).forEach(function (k) {
        var s = el('span', 'hwd-cat'), dot = el('span', 'hwd-dot');
        dot.style.background = categoryColour(k === '_none' ? null : k, true);
        s.appendChild(dot); s.appendChild(document.createTextNode(categoryLabel(k === '_none' ? null : k) + ' '));
        s.appendChild(el('b', null, String(counts[k])));
        cats.appendChild(s);
      });
    }

    /* ===== sizing, loop, visibility ===== */
    function sizeCanvas(cv, holder) {
      var r = holder.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; return true; }
      return false;
    }
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      sizeCanvas(globe.canvas, root); globe.w = globe.canvas.width; globe.h = globe.canvas.height;
      sizeCanvas(sky.canvas, sky.canvas.parentNode); sky.w = sky.canvas.width; sky.h = sky.canvas.height;
      layoutSky(); sky.dirty = true;
      if (marquee.items.length && wantedLanes(marquee.items.length) !== marquee.lanes.length) buildLive(model.projects || []);
      else measureLanes();
      if (reduce) drawGlobe(9000);
      kick();
    }

    function running() { return visible && !document.hidden; }
    function kick() { if (!raf && running()) raf = requestAnimationFrame(frame); }

    function frame(now) {
      raf = 0;
      var dt = last ? Math.min(64, now - last) : 16; last = now;
      var again = false;
      if (!reduce) { drawGlobe(now); again = true; }
      if (model) {
        if (!reduce && stepSky(dt, now)) { sky.dirty = true; again = true; }
        else if (firstRun && sky.towers.length) firstRun = false;
        if (sky.dirty) drawSky();
        if (donut.progress < 1 && donut.svg) { donut.progress = Math.min(1, donut.progress + dt / 900); drawDonut(); again = again || donut.progress < 1; }
        if (act.counting && tickClock(now)) again = true;
        if (!reduce && stepMarquee(dt)) again = true;
      }
      if (again && running()) raf = requestAnimationFrame(frame); else last = 0;
    }

    var clockTimer = setInterval(function () { if (!act.counting && running()) tickClock(performance.now()); }, reduce ? 30000 : 1000);

    var ro = window.ResizeObserver ? new ResizeObserver(function () { resize(); }) : null;
    if (ro) ro.observe(root); else window.addEventListener('resize', resize);
    var io = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; last = 0; }
    }) : null;
    if (io) io.observe(root);
    function onVis() { if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; last = 0; } } else { tickClock(performance.now()); kick(); } }
    document.addEventListener('visibilitychange', onVis);
    function onMotion() { reduce = !!mq.matches; if (model) update(model); resize(); }
    if (mq.addEventListener) mq.addEventListener('change', onMotion);
    var themeObs = new MutationObserver(function () { readTokens(); if (model) { buildActivity(model.projects || []); } sky.dirty = true; if (reduce) drawGlobe(9000); kick(); });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    /* ===== update ===== */
    function update(m) {
      model = m || { projects: [] };
      var projects = Array.isArray(model.projects) ? model.projects : [];
      root.classList.toggle('is-loading', !!model.loading && !projects.length);
      if (firstData && projects.length) { startedAt = performance.now(); firstRun = true; }
      buildCodeText(projects);
      buildTowers(projects);
      buildLanguages(projects);
      buildActivity(projects);
      buildLive(projects);
      if (projects.length) firstData = false;
      resize();
      if (reduce) { drawSky(); drawGlobe(9000); }
      kick();
    }

    function destroy() {
      if (raf) cancelAnimationFrame(raf);
      clearInterval(clockTimer);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      if (io) io.disconnect();
      themeObs.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      if (mq.removeEventListener) mq.removeEventListener('change', onMotion);
      root.innerHTML = '';
      root.classList.remove('hwd', 'hwd--' + mode, 'is-loading');
    }

    // first paint: an empty, loading stage
    update({ projects: [], loading: true, hiddenCount: 0 });
    return { update: update, destroy: destroy };
  }

  /* ---------- invented demo data (no network, no real names) ---------- */
  function demoModel() {
    var H = 3600 * 1000, D = 24 * H, now = Date.now();
    function p(name, title, category, kind, status, langs, size, ageMs, recent, extra) {
      var o = {
        name: name, title: title, tagline: '', summary: '', category: category, kind: kind, status: status,
        languages: langs, size: size, pushed_at: new Date(now - ageMs).toISOString(), recent: recent,
        private: true, fork: false, archived: false, demo: null, live_url: null, features: [], built_with: []
      };
      for (var k in extra) if (own(extra, k)) o[k] = extra[k];
      return o;
    }
    var projects = [
      p('northwind-notes', 'Northwind Notes', 'products', 'web-app', 'live', { TypeScript: 420000, CSS: 61000, HTML: 9000 }, 5200, 3 * H, 14, { demo: 'hub/demo.html', live_url: 'https://notes.example.com/' }),
      p('kestrel-courses', 'Kestrel Courses', 'products', 'web-app', 'in-progress', { TypeScript: 380000, CSS: 42000 }, 8800, 10 * H, 17, {}),
      p('signal-scanner', 'Signal Scanner', 'ai', 'web-app', 'in-progress', { Python: 260000, TypeScript: 70000 }, 6400, 5 * H, 21, { demo: 'hub/demo.html' }),
      p('orbit-chat', 'Orbit Chat', 'ai', 'web-app', 'experimental', { TypeScript: 150000, CSS: 20000 }, 2100, 20 * D, 1, { demo: 'hub/demo.html' }),
      p('tidewater-bookings', 'Tidewater Bookings', 'client', 'web-app', 'live', { PHP: 300000, JavaScript: 90000, CSS: 30000 }, 7800, 1 * D, 9, { live_url: 'https://bookings.example.net/' }),
      p('fieldnote-portal', 'Fieldnote Portal', 'client', 'web-app', 'in-progress', { TypeScript: 210000, CSS: 40000 }, 3900, 2 * D, 11, {}),
      p('harbour-lights', 'Harbour Lights', 'websites', 'website', 'live', { HTML: 52000, CSS: 38000, JavaScript: 12000 }, 900, 2 * D + 4 * H, 3, { live_url: 'https://harbour.example.org/' }),
      p('brightside-site', 'Brightside Website', 'websites', 'website', 'live', { Astro: 30000, CSS: 22000 }, 700, 25 * D, 0, { live_url: 'https://brightside.example.org/', demo: 'hub/demo.html' }),
      p('lantern-theme', 'Lantern Theme', 'wordpress', 'theme', 'live', { PHP: 120000, CSS: 80000, JavaScript: 15000 }, 1500, 16 * D, 2, {}),
      p('moss-forms', 'Moss Forms', 'wordpress', 'plugin', 'live', { PHP: 90000, JavaScript: 30000 }, 800, 33 * D, 0, {}),
      p('paper-kite', 'Paper Kite', 'games', 'game', 'experimental', { JavaScript: 180000, HTML: 6000 }, 2400, 9 * D, 6, { demo: 'hub/demo.html' }),
      p('pixel-regatta', 'Pixel Regatta', 'games', 'game', 'live', { JavaScript: 140000, GLSL: 12000 }, 3100, 12 * D, 3, { demo: 'hub/demo.html', live_url: 'https://regatta.example.com/' }),
      p('quayside-kit', 'Quayside Kit', 'tools', 'scripts', 'live', { Shell: 40000, Python: 30000 }, 300, 4 * D, 4, {}),
      p('driftwood-docs', 'Driftwood Docs', 'tools', 'docs', 'live', { HTML: 20000 }, 200, 70 * D, 0, {}),
      p('server-garden', 'Server Garden', 'ops', 'scripts', 'live', { Shell: 60000 }, 450, 6 * D, 5, {}),
      p('uplink-monitor', 'Uplink Monitor', 'ops', 'web-app', 'live', { Go: 90000, HTML: 8000 }, 1300, 8 * D, 2, {}),
      p('pocket-atlas', 'Pocket Atlas', 'labs', 'web-app', 'experimental', { Svelte: 70000, TypeScript: 50000 }, 1100, 48 * D, 0, { demo: 'hub/demo.html' }),
      p('sketchpad-lab', 'Sketchpad Lab', 'labs', 'library', 'experimental', { JavaScript: 30000 }, 160, 120 * D, 0, {})
    ];
    return { projects: projects, hiddenCount: 4, signedIn: true, account: (CFG.account || 'HelloWorldIE'), demo: true };
  }

  window.HWDash = { mount: mount, demoModel: demoModel, categoryColour: categoryColour, categoryLabel: categoryLabel };
})();
