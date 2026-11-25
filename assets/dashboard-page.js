/* HelloWorld dashboard page (dashboard/index.html): the four cards full window, with a Live and
   Demo switch and a theme switch. Live reads GitHub through HWGH; a tab signed in on the hub is
   signed in here too (same address, same tab storage). Demo is invented data and needs no
   network. Start on Demo with ?demo. */
(function () {
  'use strict';

  var statusEl = document.getElementById('dash-status');
  var liveBtn = document.getElementById('data-live');
  var demoBtn = document.getElementById('data-demo');
  var themeBtn = document.getElementById('theme-switch');
  var ctl = HWDash.mount(document.getElementById('dash'), { mode: 'full' });

  var mode = /(^|[?&])demo(=|&|$)/.test(location.search.slice(1)) ? 'demo' : 'live';
  var liveModel = null, loadingLive = null, lastError = null;

  /* ---------- status line ---------- */
  function setStatus(parts) {
    statusEl.textContent = '';
    parts.forEach(function (p) {
      if (typeof p === 'string') { statusEl.appendChild(document.createTextNode(p)); return; }
      var n;
      if (p.href) { n = document.createElement('a'); n.href = p.href; n.textContent = p.text; }
      else { n = document.createElement('button'); n.type = 'button'; n.className = 'btn btn-sm'; n.textContent = p.text; n.addEventListener('click', p.onClick); }
      statusEl.appendChild(n);
    });
  }
  function clock(ms) { return new Date(ms).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' }); }

  function liveStatus() {
    var s = HWGH.state;
    if (s.preview) return setStatus(['Local preview with real data, signed in as ' + (s.login || 'the local account') + '.']);
    if (s.signedIn) return setStatus(['Signed in as ' + s.login + '. Private repos included.']);
    setStatus(['Public repos only. ', { href: '../', text: 'Sign in on the hub' }, ' to include private repos.']);
  }

  /* ---------- the data ---------- */
  function modelFromState(loading) {
    var s = HWGH.state;
    return {
      projects: HWGH.projects(),
      hiddenCount: s.repos.filter(function (r) { return r.fork || r.archived; }).length,
      signedIn: s.signedIn, account: HWGH.account, loading: !!loading
    };
  }

  HWGH.on('repos', function () { if (mode === 'live') ctl.update(modelFromState(true)); });

  function loadLive() {
    if (loadingLive) return loadingLive;
    setStatus(['Loading projects from GitHub.']);
    loadingLive = HWGH.loadRepos().then(function (s) {
      loadingLive = null;
      if (s.error && !s.repos.length) { lastError = s.error; liveModel = null; return null; }
      lastError = null;
      liveModel = modelFromState(false);
      return liveModel;
    }, function (e) { loadingLive = null; lastError = e; liveModel = null; return null; });
    return loadingLive;
  }

  function showDemo(reason) {
    ctl.update(HWDash.demoModel());
    if (reason) setStatus([reason + ' Showing demo data instead. ', { text: 'Try again', onClick: function () { setMode('live', true); } }]);
    else setStatus(['Demo data: invented projects, nothing loaded from GitHub.']);
  }

  function failReason(e) {
    if (e && e.name === 'RateLimit') return 'GitHub’s limit for signed-out visits is used up until ' + clock(e.reset) + '.';
    return 'GitHub could not be reached' + (e && e.message ? ' (' + e.message + ')' : '') + '.';
  }

  function setMode(next, force) {
    mode = next;
    liveBtn.setAttribute('aria-pressed', String(mode === 'live'));
    demoBtn.setAttribute('aria-pressed', String(mode === 'demo'));
    try { history.replaceState(null, '', mode === 'demo' ? '?demo' : location.pathname); } catch (e) {}
    if (mode === 'demo') { showDemo(); return; }
    if (liveModel && !force) { ctl.update(liveModel); liveStatus(); return; }
    ctl.update({ projects: [], loading: true, hiddenCount: 0 });
    loadLive().then(function (m) {
      if (mode !== 'live') return;
      if (m) { ctl.update(m); liveStatus(); }
      else showDemo(failReason(lastError));
    });
  }

  liveBtn.addEventListener('click', function () { if (mode !== 'live') setMode('live'); });
  demoBtn.addEventListener('click', function () { if (mode !== 'demo') setMode('demo'); });

  /* ---------- theme ---------- */
  function applyThemeButton() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeBtn.setAttribute('aria-pressed', String(dark));
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
