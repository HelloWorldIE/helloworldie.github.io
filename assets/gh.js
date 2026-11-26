/* HelloWorld hub: the GitHub data layer (window.HWGH).
   Loads the account's repos and each project's details, checks hub cards against the standard,
   and fetches files and pictures with the viewer's own token. Nothing about any project is kept
   in this public repo: it all comes from GitHub at run time.

   Sign-in: "Sign in with GitHub" (the HelloWorld Hub GitHub App, read-only) or a read-only
   fine-grained token the viewer pastes. Tokens go only to api.github.com. A pasted token is kept in
   this tab only (sessionStorage). A GitHub sign-in can stay on this device (Bryan, 2026-11-26):
   localStorage['hw_gh_auth'] keeps the 8-hour token and the worker's sealed session (the refresh
   token, which only the worker can open), so every tab shares one sign-in and it renews itself
   until Sign out, or six months without a visit.

   API (window.HWGH):
     state, on(event, fn), progress, loads, hasToken, preview
       events: progress {stage, done, total, loads}, load {kind, pending, done, failed},
               ratelimit, auth, loading, repos, error, details
     loadRepos(), signIn(token), signInWithGitHub(), signOut(), authReady
     projects({all}), info(repo), findRepo(name, {ci}), isCopy(repo)
     cleanCard(text) -> {card, error}, safePath(p), httpsUrl(u)
     fileText(repo, path), fileBlob(repo, path), image(repo, path) -> blob URL,
     tree(repo) -> {truncated, items [{path, type, size, sha}]} (cached as hw_tree2_<repo>_<pushed_at>)
     api(path, {headers: {Accept}}), apiJson(path), graphql(query, vars): read-only (GET only;
       no mutations), same token, limit and host checks as everything else
     lastCommitFor(repo, path) -> {login, date, verified, message, sha} or null
     trackLoad(kind, promise) -> the same promise, counted in `loads[kind]` (pics, files, trees)
     langColour(name), RateLimit */
(function () {
  'use strict';

  var CFG = window.HW_CONFIG;
  var ACCOUNT = CFG.account;
  var LIMITS = CFG.card_limits || {};
  var TOKEN_KEY = 'hw_gh_token';
  var GH_API = 'https://api.github.com';
  var RAW = 'https://raw.githubusercontent.com';

  // Local preview (hw-gh preview): a proxy on localhost adds the token itself, so the page never
  // holds one. Only honoured on a loopback address.
  var LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var PREVIEW = !!(window.HW_PREVIEW && LOOPBACK);
  var API = PREVIEW ? '/api' : GH_API;

  var token = null;
  var AUTH_LS = 'hw_gh_auth', AUTH_LOCK = 'hw_gh_auth_lock';
  function readSaved() {
    try { var v = JSON.parse(localStorage.getItem(AUTH_LS) || 'null'); return v && typeof v === 'object' && typeof v.session === 'string' ? v : null; } catch (e) { return null; }
  }
  function writeSaved(v) { try { if (v) localStorage.setItem(AUTH_LS, JSON.stringify(v)); else localStorage.removeItem(AUTH_LS); } catch (e) {} }
  if (!PREVIEW) {
    try { token = sessionStorage.getItem(TOKEN_KEY); } catch (e) {}
    if (!token) { var saved0 = readSaved(); if (saved0 && saved0.token && saved0.exp - Date.now() > 120000) token = saved0.token; }
  }

  var listeners = {};
  function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); }
  function emit(ev, data) { (listeners[ev] || []).forEach(function (fn) { try { fn(data); } catch (e) { console.error(e); } }); }

  var state = {
    signedIn: false, login: null, avatar: null, preview: PREVIEW,
    repos: [], detailsReady: false, loading: false, error: null, rateLimited: null, loadedAt: null
  };

  /* ---------- progress (the status beside the title) ---------- */
  var progress = { stage: 'idle', done: 0, total: 0 };
  function setProgress(stage, done, total) { progress = { stage: stage, done: done || 0, total: total || 0, loads: loads }; emit('progress', progress); }

  /* Pictures and files fetched after the list (for the loader): counted per kind. */
  var loads = Object.create(null);
  progress.loads = loads;
  function trackLoad(kind, p) {
    kind = typeof kind === 'string' && /^[a-z]{1,12}$/.test(kind) ? kind : 'pics';
    if (!p || typeof p.then !== 'function') return p;
    var n = loads[kind] || (loads[kind] = { pending: 0, done: 0, failed: 0 });
    n.pending++;
    function settle(ok) {
      n.pending = Math.max(0, n.pending - 1);
      if (ok) n.done++; else n.failed++;
      emit('load', { kind: kind, pending: n.pending, done: n.done, failed: n.failed });
      progress.loads = loads; emit('progress', progress);
    }
    emit('load', { kind: kind, pending: n.pending, done: n.done, failed: n.failed });
    progress.loads = loads; emit('progress', progress);
    p.then(function () { settle(true); }, function () { settle(false); });
    return p;
  }

  /* ---------- fetch ---------- */
  function RateLimit(reset) { this.name = 'RateLimit'; this.reset = reset; this.message = 'GitHub rate limit reached'; }
  RateLimit.prototype = Object.create(Error.prototype);

  function headers(extra) {
    var h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) h[k] = extra[k];
    return h;
  }

  function apiUrl(path) {
    if (!/^\/[A-Za-z0-9_\-./?=&%,:+]*$/.test(path)) throw new Error('Bad API path');
    return API + path;
  }

  async function api(path, opts) {
    opts = opts || {};
    var res = await fetch(apiUrl(path), { headers: headers(opts.headers || {}), method: opts.method || 'GET', body: opts.body, cache: 'no-cache' });
    if ((res.status === 403 || res.status === 429) && res.headers.get('x-ratelimit-remaining') === '0') {
      var reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
      state.rateLimited = reset; emit('ratelimit', reset);
      throw new RateLimit(reset);
    }
    if (res.status === 401 && token) {
      // A remembered sign-in renews itself once, then the request runs again.
      if (!opts.renewed && readSaved() && await resume({ failed: token })) return api(path, Object.assign({}, opts, { renewed: true }));
      clearToken(); emit('auth', state); throw new Error('Your sign-in has ended or was revoked. Sign in again.');
    }
    return res;
  }

  async function apiJson(path) {
    var res = await api(path);
    if (!res.ok) { var e = new Error('GitHub answered ' + res.status + ' for ' + path); e.status = res.status; throw e; }
    return res.json();
  }

  async function apiAll(path) {
    var out = [], url = path, guard = 0;
    while (url && guard++ < 30) {
      var res = await api(url);
      if (!res.ok) { var e = new Error('GitHub answered ' + res.status); e.status = res.status; throw e; }
      out = out.concat(await res.json());
      var link = res.headers.get('link') || '', m = link.match(/<([^>]+)>;\s*rel="next"/);
      url = m ? m[1].replace(/^https:\/\/api\.github\.com/, '').replace(/^\/api/, '') : null;
    }
    return out;
  }

  async function graphql(query, variables) {
    var res = await api('/graphql', { method: 'POST', body: JSON.stringify({ query: query, variables: variables || {} }), headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error('GraphQL ' + res.status);
    var j = await res.json();
    if (j.errors && !j.data) throw new Error(j.errors[0].message);
    return j.data || {};
  }

  /* What other hub files may call (the City, file lists): reads only, through the same token,
     limit and host checks. Only an Accept header may be set. */
  function readApi(path, opts) {
    var h = {}, a = opts && opts.headers && Object.prototype.hasOwnProperty.call(opts.headers, 'Accept') ? opts.headers.Accept : null;
    if (typeof a === 'string' && /^application\/vnd\.github(\.[a-z0-9+.-]+)?$|^application\/json$/.test(a)) h.Accept = a;
    return api(path, { headers: h });
  }
  function readGraphql(query, variables) {
    if (typeof query !== 'string' || /\b(mutation|subscription)\b/i.test(query)) return Promise.reject(new Error('Read-only'));
    return graphql(query, variables);
  }

  /* ---------- sign-in ---------- */
  function clearToken() {
    token = null; clearTimeout(renewTimer);
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
    var sv = readSaved(); if (sv && sv.token) { sv.token = null; sv.exp = 0; writeSaved(sv); }   // keep the session: it can renew
    state.signedIn = false; state.login = null; state.avatar = null;
  }

  /* ---------- staying signed in ----------
     resume() gets a fresh token from the saved session through the worker. One tab renews at a
     time (a short lock in localStorage), because each session works once; the others wait and take
     the new token. A session GitHub has ended (401) is forgotten; a network failure keeps it. */
  var resuming = null, renewTimer = 0;
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function usable(sv, minLeft, failed) { return !!(sv && sv.token && sv.token !== failed && sv.exp - Date.now() > minLeft); }
  function resume(o) {
    o = o || {};
    if (resuming) return resuming;
    var minLeft = o.minLeft == null ? 120000 : o.minLeft;
    resuming = (async function () {
      var sv = readSaved();
      if (!sv || !AUTH_READY || PREVIEW) return false;
      if (usable(sv, minLeft, o.failed)) { token = sv.token; scheduleRenew(); return true; }
      var lock = 0; try { lock = +localStorage.getItem(AUTH_LOCK) || 0; } catch (e) {}
      if (Date.now() - lock < 15000) {
        for (var i = 0; i < 16; i++) {
          await sleep(500);
          var nv = readSaved(); if (!nv) return false;
          if (nv.session !== sv.session) { if (usable(nv, minLeft, o.failed)) { token = nv.token; scheduleRenew(); return true; } sv = nv; break; }
        }
      }
      try { localStorage.setItem(AUTH_LOCK, String(Date.now())); } catch (e) {}
      try {
        var res = await fetch(AUTH_BASE + '/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session: sv.session }) });
        var j = await res.json().catch(function () { return {}; });
        if (res.status === 401) { writeSaved(null); return false; }
        if (!res.ok || !j.access_token) return false;
        token = j.access_token;
        writeSaved(j.session ? { token: j.access_token, exp: Date.now() + (j.expires_in || 28800) * 1000, session: j.session, sexp: Date.now() + (j.session_expires_in || 0) * 1000 } : null);
        if (!j.session) { try { sessionStorage.setItem(TOKEN_KEY, token); } catch (e) {} }
        try { sessionStorage.setItem(METHOD_KEY, 'app'); } catch (e) {}
        scheduleRenew();
        return true;
      } catch (e) { return false; }
      finally { try { localStorage.removeItem(AUTH_LOCK); } catch (e) {} }
    })();
    resuming.then(function () { resuming = null; }, function () { resuming = null; });
    return resuming;
  }
  /* Renew about ten minutes before the token ends, so a tab left open stays signed in. */
  function scheduleRenew() {
    clearTimeout(renewTimer);
    var sv = readSaved(); if (!sv || !sv.exp) return;
    var wait = sv.exp - Date.now() - 600000 - Math.random() * 60000;
    renewTimer = setTimeout(function () {
      resume({ minLeft: 660000 }).then(function (ok) { if (!ok && !usable(readSaved(), 0)) { clearToken(); emit('auth', state); } });
    }, Math.max(5000, Math.min(wait, 2147483000)));
  }
  /* Another tab signed out, or renewed: follow it. A pasted token in this tab is left alone. */
  try {
    window.addEventListener('storage', function (e) {
      if (e.key !== AUTH_LS || PREVIEW) return;
      var tabOnly = false; try { tabOnly = !!sessionStorage.getItem(TOKEN_KEY); } catch (x) {}
      if (tabOnly) return;
      var sv = readSaved();
      if (!sv) { if (token) { clearToken(); emit('auth', state); } return; }
      if (sv.token && sv.token !== token && token) { token = sv.token; scheduleRenew(); }
    });
  } catch (e) {}

  async function checkSession() {
    if (!token && !PREVIEW && AUTH_READY && readSaved()) await resume();
    if (!token && !PREVIEW) { state.signedIn = false; return state; }
    setProgress('auth');
    try {
      var me = await apiJson('/user');
      state.signedIn = true; state.login = me.login; state.avatar = me.avatar_url;
      if (readSaved() && !PREVIEW) scheduleRenew();
      checkApp();
    } catch (e) {
      if (e instanceof RateLimit) throw e;
      clearToken();
    }
    emit('auth', state);
    return state;
  }

  // Checks a token with GitHub, then keeps it: on this device when a session comes with it (a GitHub
  // sign-in with "Stay signed in"), otherwise for this tab only.
  async function adoptToken(t, method, keep) {
    var res = await fetch(GH_API + '/user', { headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + t } });
    if (res.status === 401) throw new Error('GitHub did not accept that token. Check it has not expired.');
    if (!res.ok) throw new Error('GitHub answered ' + res.status + '. Try again in a minute.');
    var me = await res.json();
    token = t;
    try {
      sessionStorage.setItem(METHOD_KEY, method);
      if (keep && keep.session) {
        sessionStorage.removeItem(TOKEN_KEY);
        writeSaved({ token: t, exp: Date.now() + (keep.expires_in || 28800) * 1000, session: keep.session, sexp: Date.now() + (keep.session_expires_in || 0) * 1000 });
        scheduleRenew();
      } else sessionStorage.setItem(TOKEN_KEY, t);
    } catch (e) {}
    state.signedIn = true; state.login = me.login; state.avatar = me.avatar_url;
    emit('auth', state);
    return { login: me.login, broad: /^gh[op]_/.test(t), method: method };
  }

  // A pasted token (a read-only fine-grained token is the safe kind).
  async function signIn(raw) {
    var t = String(raw || '').trim();
    if (!/^(github_pat_[A-Za-z0-9_]{20,255}|gh[opsu]_[A-Za-z0-9]{30,255})$/.test(t)) {
      throw new Error('That does not look like a GitHub token. A fine-grained token starts with github_pat_.');
    }
    return adoptToken(t, 'token');
  }

  /* Sign in with GitHub: the HelloWorld Hub GitHub App (contents read-only), PKCE, a popup that
     lands on callback.html, and the auth worker, which holds the app's secret, swaps the code for
     a token. Call it straight from a click: the popup must open before anything is awaited. */
  var AUTH = (CFG.hub && CFG.hub.auth) || {};
  var AUTH_READY = !!(AUTH.client_id && typeof AUTH.exchange_url === 'string' && /^https:\/\/[a-z0-9.-]+\/?$/i.test(AUTH.exchange_url));
  var AUTH_BASE = AUTH_READY ? AUTH.exchange_url.replace(/\/$/, '') : '';
  var METHOD_KEY = 'hw_gh_method';
  var CALLBACK = (CFG.hub && CFG.hub.url ? CFG.hub.url.replace(/\/?$/, '/') : location.origin + '/') + 'callback.html';
  function b64url(buf) {
    var s = '', b = new Uint8Array(buf);
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function randomString(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a); }

  function signInWithGitHub(opts) {
    var remember = !(opts && opts.remember === false);
    if (!AUTH_READY) return Promise.reject(new Error('Sign in with GitHub is not set up yet. Use a token instead.'));
    var popup = window.open('about:blank', 'hw-signin', 'popup,width=520,height=720');
    if (!popup) return Promise.reject(new Error('The browser blocked the sign-in window. Allow pop-ups for this site, then try again.'));
    var stateValue = randomString(24), verifier = randomString(48);
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(function (digest) {
      popup.location = 'https://github.com/login/oauth/authorize?' + new URLSearchParams({
        client_id: AUTH.client_id, redirect_uri: CALLBACK, state: stateValue,
        code_challenge: b64url(digest), code_challenge_method: 'S256'
      }).toString();
      return new Promise(function (resolve, reject) {
        var timer = setInterval(function () { if (popup.closed) { done(); reject(new Error('The sign-in window was closed before signing in.')); } }, 600);
        function done() { clearInterval(timer); window.removeEventListener('message', onMessage); }
        function onMessage(e) {
          if (e.source !== popup || e.origin !== location.origin) return;
          var m = e.data || {};
          if (m.type !== 'hw-auth') return;
          done();
          try { popup.close(); } catch (x) {}
          if (m.error) return reject(new Error(m.error === 'access_denied' ? 'Sign-in was cancelled.' : 'GitHub refused the sign-in (' + m.error + ').'));
          if (m.state !== stateValue || !m.code) return reject(new Error('The sign-in answer did not match. Try again.'));
          resolve(m.code);
        }
        window.addEventListener('message', onMessage);
      });
    }).then(function (code) {
      return fetch(AUTH.exchange_url.replace(/\/$/, '') + '/exchange', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code, code_verifier: verifier })
      });
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (!res.ok || !j.access_token) throw new Error('The sign-in could not be finished (' + (j.error || res.status) + ').');
        if (j.session && !remember) {        // not staying: spend the session at once, so no copy of it is left anywhere
          fetch(AUTH_BASE + '/revoke', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session: j.session }) }).catch(function () {});
        }
        return adoptToken(j.access_token, 'app', remember && j.session ? j : null);
      });
    }, function (e) { try { popup.close(); } catch (x) {} throw e; });
  }

  function signOut() {
    var method = null, sv = readSaved();
    try { method = sessionStorage.getItem(METHOD_KEY); sessionStorage.removeItem(METHOD_KEY); } catch (e) {}
    if (AUTH_READY && ((method === 'app' && token) || sv)) {
      // Ends the token at GitHub too, and spends the saved session, not only on this device.
      var body = {}; if (method === 'app' && token) body.token = token; if (sv) body.session = sv.session;
      fetch(AUTH_BASE + '/revoke', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(function () {});
    }
    writeSaved(null);
    clearToken(); emit('auth', state);
  }
  function staysSignedIn() { return !!readSaved(); }

  /* A GitHub sign-in reads only what the HelloWorldIE Hub app may read: the repos it is installed
     on, with the permissions it was given. Ask GitHub once after signing in, so the hub can say
     plainly what is missing instead of failing project by project. Emits 'app' with
     { installed, all, contents, manage } (manage: where to change it on GitHub). */
  var appCheck = null;
  function checkApp() {
    if (appCheck || PREVIEW || !token) return appCheck;
    var method = null; try { method = sessionStorage.getItem(METHOD_KEY); } catch (e) {}
    if (method !== 'app') return null;
    appCheck = apiJson('/user/installations?per_page=100').then(function (j) {
      var list = (j && Array.isArray(j.installations)) ? j.installations : [];
      var mine = null;
      list.forEach(function (i) { if (i && i.account && String(i.account.login).toLowerCase() === String(ACCOUNT).toLowerCase()) mine = i; });
      var res = {
        installed: !!mine, all: !!(mine && mine.repository_selection === 'all'),
        contents: !!(mine && mine.permissions && /^(read|write)$/.test(mine.permissions.contents || '')),
        manage: mine && typeof mine.html_url === 'string' && /^https:\/\/github\.com\//.test(mine.html_url) ? mine.html_url : 'https://github.com/settings/installations'
      };
      state.app = res; emit('app', res);
      return res;
    }, function () { appCheck = null; return null; });
    return appCheck;
  }

  /* ---------- repos ---------- */
  function slim(r) {
    return {
      name: r.name, full_name: r.full_name, owner: r.owner && r.owner.login,
      private: !!r.private, fork: !!r.fork, archived: !!r.archived, disabled: !!r.disabled,
      description: r.description || '', homepage: r.homepage || '', html_url: r.html_url,
      default_branch: r.default_branch || 'main', pushed_at: r.pushed_at, updated_at: r.updated_at,
      created_at: r.created_at, size: r.size || 0, language: r.language || null,
      topics: Array.isArray(r.topics) ? r.topics : [], has_pages: !!r.has_pages,
      open_issues: r.open_issues_count || 0, stars: r.stargazers_count || 0,
      permissions: r.permissions || null,
      languages: null, card: null, cardError: null, readme: null, last_commit: null, recent: null
    };
  }

  async function loadRepos() {
    state.loading = true; state.error = null; state.detailsReady = false; emit('loading', state);
    try {
      await checkSession();
      setProgress('repos');
      var list;
      if (state.signedIn) {
        list = await apiAll('/user/repos?affiliation=owner,collaborator&per_page=100&sort=pushed');
        list = list.filter(function (r) { return r.owner && r.owner.login === ACCOUNT; });
      } else {
        list = await apiAll('/users/' + ACCOUNT + '/repos?type=owner&per_page=100&sort=pushed');
      }
      state.repos = list.map(slim);
      state.loadedAt = new Date();
      emit('repos', state);
      await loadDetails(state.repos);
    } catch (e) {
      state.error = e; emit('error', e);
    } finally {
      state.loading = false; state.detailsReady = true; setProgress('ready'); emit('details', state);
    }
    return state;
  }

  /* ---------- details: card, README, languages, last change ---------- */
  var DETAIL_FIELDS =
    'card: object(expression: "HEAD:hub/project.json") { ... on Blob { text byteSize } } ' +
    'readme: object(expression: "HEAD:README.md") { ... on Blob { text byteSize } } ' +
    'readmeLower: object(expression: "HEAD:readme.md") { ... on Blob { text byteSize } } ' +
    'languages(first: 12, orderBy: {field: SIZE, direction: DESC}) { totalSize edges { size node { name color } } } ' +
    'issues(states: OPEN) { totalCount } pullRequests(states: OPEN) { totalCount } ' +
    'defaultBranchRef { target { ... on Commit { committedDate messageHeadline history(since: $since) { totalCount } } } }';

  async function loadDetails(repos) {
    var todo = repos.slice(), total = todo.length, done = 0;
    setProgress('details', 0, total);
    if (state.signedIn) {
      var since = new Date(Date.now() - 30 * 864e5).toISOString();
      var batches = [];
      for (var i = 0; i < todo.length; i += 10) batches.push(todo.slice(i, i + 10));
      await pool(batches, 6, async function (batch) {
        var q = 'query($since: GitTimestamp!) { ' + batch.map(function (r, n) {
          return 'r' + n + ': repository(owner: ' + JSON.stringify(ACCOUNT) + ', name: ' + JSON.stringify(r.name) + ') { ' + DETAIL_FIELDS + ' }';
        }).join(' ') + ' }';
        var data;
        try { data = await graphql(q, { since: since }); }
        catch (e) { try { data = await graphql(q, { since: since }); } catch (e2) { data = {}; } }
        batch.forEach(function (r, n) { applyDetails(r, data['r' + n]); });
        done += batch.length; setProgress('details', done, total);
      });
    } else {
      await pool(todo, 6, async function (r) {
        if (r.fork || r.archived) { r.last_commit = { date: r.pushed_at, message: '' }; done++; setProgress('details', done, total); return; }
        var base = RAW + '/' + ACCOUNT + '/' + encodeURIComponent(r.name) + '/' + encodeURIComponent(r.default_branch) + '/';
        var got = await Promise.all([
          fetchText(base + 'hub/project.json'),
          fetchText(base + 'README.md'),
          apiJson('/repos/' + ACCOUNT + '/' + encodeURIComponent(r.name) + '/languages').catch(function () { return null; })
        ]);
        r.readme = got[1];
        if (got[2]) r.languages = got[2];
        r.last_commit = { date: r.pushed_at, message: '' };
        setCard(r, got[0]);
        done++; setProgress('details', done, total);
      });
    }
  }

  async function fetchText(url) {
    try { var res = await fetch(url, { cache: 'no-cache' }); return res.ok ? await res.text() : null; } catch (e) { return null; }
  }

  function applyDetails(r, d) {
    if (!d) return;
    var readme = (d.readme && d.readme.text) || (d.readmeLower && d.readmeLower.text) || null;
    r.readme = readme && readme.length < 400000 ? readme : null;
    if (d.languages) {
      var langs = {};
      (d.languages.edges || []).forEach(function (e) { langs[e.node.name] = e.size; LANG_COLOURS[e.node.name] = LANG_COLOURS[e.node.name] || e.node.color; });
      r.languages = langs;
    }
    r.open_issues = (d.issues ? d.issues.totalCount : 0) + (d.pullRequests ? d.pullRequests.totalCount : 0);
    var t = d.defaultBranchRef && d.defaultBranchRef.target;
    if (t) { r.last_commit = { date: t.committedDate, message: t.messageHeadline || '' }; r.recent = t.history ? t.history.totalCount : null; }
    setCard(r, d.card && d.card.text);
  }

  function setCard(r, text) {
    r.card = null; r.cardError = null;
    if (text == null) return;
    var res = cleanCard(text);
    r.card = res.card; r.cardError = res.error;
  }

  async function pool(items, size, fn) {
    var i = 0;
    async function worker() { while (i < items.length) { var item = items[i++]; await fn(item); } }
    var workers = [];
    for (var w = 0; w < Math.min(size, items.length); w++) workers.push(worker());
    await Promise.all(workers);
  }

  /* ---------- the card standard (helloworldGitub/templates/hub/README.md) ---------- */
  var own = function (obj, key) { return typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key); };
  // A card value by its own key only: never one inherited from Object.prototype.
  function pick(o, key) { return o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, key) ? o[key] : undefined; }
  function str(v, max) { return typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null; }
  function strList(v, maxItems, maxLen) {
    if (!Array.isArray(v)) return null;
    var out = v.filter(function (s) { return typeof s === 'string' && s.trim() && s.length <= maxLen; }).map(function (s) { return s.trim(); });
    return out.slice(0, maxItems);
  }
  function safePath(p) {
    if (typeof p !== 'string' || !p || p.length > 200) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(p) || p.charAt(0) === '/' || p.indexOf('\\') >= 0) return null;
    var parts = p.split('/');
    for (var i = 0; i < parts.length; i++) if (!parts[i] || parts[i] === '.' || parts[i] === '..') return null;
    if (!/^[A-Za-z0-9._\-\/ ]+$/.test(p)) return null;
    return p;
  }
  function httpsUrl(u) {
    if (typeof u !== 'string' || u.length > 300) return null;
    try { var x = new URL(u); return x.protocol === 'https:' ? x.href : null; } catch (e) { return null; }
  }
  function num(v) { return typeof v === 'number' && isFinite(v) && v >= 0 && v <= 100 ? v : null; }

  // A mark's badge, by its kind's badge rule in the config: a step number 1-99, an area letter.
  function badge(kind, v) {
    var rule = (CFG.mark_kinds[kind] || {}).badge;
    var isNum = typeof v === 'number' && isFinite(v) && v === Math.floor(v) && v >= 1 && v <= 99;
    var isLetter = typeof v === 'string' && /^[A-Za-z]$/.test(v);
    if (rule === 'number') return isNum ? v : null;
    if (rule === 'letter') return isLetter ? v.toUpperCase() : null;
    if (rule === 'none') return null;
    return isNum ? v : isLetter ? v.toUpperCase() : null;
  }
  var SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  function cleanCard(text) {
    var raw;
    if (typeof text !== 'string' || text.length > 200000) return { card: null, error: 'Card is missing or too large' };
    if (text.indexOf('{{') >= 0) return { card: null, error: 'Card still has template placeholders' };
    try { raw = JSON.parse(text); } catch (e) { return { card: null, error: 'Card is not valid JSON' }; }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { card: null, error: 'Card is not an object' };
    var c = Object.create(null), L = LIMITS, P = function (k) { return pick(raw, k); };
    var ALT = L.alt || 200;
    c.name = str(P('name'), L.name || 40);
    if (!c.name) return { card: null, error: 'Card has no name' };
    c.tagline = str(P('tagline'), L.tagline || 90);
    c.summary = str(P('summary'), L.summary || 600);
    c.category = own(CFG.categories, P('category')) ? P('category') : null;
    c.kind = own(CFG.kinds, P('kind')) ? P('kind') : null;
    c.status = own(CFG.statuses, P('status')) ? P('status') : null;
    c.audience = Array.isArray(P('audience')) ? P('audience').filter(function (a, i, all) { return own(CFG.audiences, a) && all.indexOf(a) === i; }) : [];
    c.features = strList(P('features'), L.features || 8, L.feature || 120) || [];
    c.built_with = strList(P('built_with'), L.built_with || 12, 40) || [];
    c.live_url = httpsUrl(P('live_url'));
    c.demo = typeof P('demo') === 'string' && /\.html?$/i.test(P('demo')) ? safePath(P('demo')) : null;
    c.no_demo = str(P('no_demo'), 240);
    /* view: the project itself in one self-contained file, real content included (Bryan,
       2026-11-26: "if you have access to the private repo, you should be able to preview it").
       Opened like a demo, sealed off, with the viewer's own access. */
    var V = P('view');
    c.view = V && typeof V === 'object' && !Array.isArray(V) && typeof V.file === 'string' && /\.html?$/i.test(V.file) && safePath(V.file)
      ? { file: safePath(V.file), label: str(V.label, 40) || 'Open it' } : null;
    c.cover = typeof P('cover') === 'string' && /\.(png|jpe?g|webp)$/i.test(P('cover')) ? safePath(P('cover')) : null;
    c.icon = typeof P('icon') === 'string' && /\.svg$/i.test(P('icon')) ? safePath(P('icon')) : null;
    c.same_as = typeof P('same_as') === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(P('same_as')) ? P('same_as') : null;
    c.updated = typeof P('updated') === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(P('updated')) ? P('updated') : null;
    c.gallery = (Array.isArray(P('gallery')) ? P('gallery') : []).slice(0, L.gallery || 12).map(function (g) {
      if (!g || typeof g !== 'object' || Array.isArray(g)) return null;
      var s = pick(g, 'src');
      var src = typeof s === 'string' && /\.(png|jpe?g|webp|gif)$/i.test(s) ? safePath(s) : null;
      return src ? { src: src, caption: str(pick(g, 'caption'), L.caption || 140) || '', alt: str(pick(g, 'alt'), ALT) } : null;
    }).filter(Boolean);
    var slugs = Object.create(null);
    c.guides = (Array.isArray(P('guides')) ? P('guides') : []).slice(0, L.guides || 6).map(function (g) {
      if (!g || typeof g !== 'object' || Array.isArray(g)) return null;
      var title = str(pick(g, 'title'), 80);
      if (!title) return null;
      var slug = pick(g, 'slug');
      slug = typeof slug === 'string' && slug.length <= (L.slug || 60) && SLUG_RE.test(slug) && !slugs[slug] ? slug : null;
      if (slug) slugs[slug] = true;
      var steps = (Array.isArray(pick(g, 'steps')) ? pick(g, 'steps') : []).slice(0, L.steps || 20).map(function (s) {
        if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
        var text = str(pick(s, 'text'), L.step || 240);
        if (!text) return null;
        var im = pick(s, 'image');
        var image = typeof im === 'string' && /\.(png|jpe?g|webp)$/i.test(im) ? safePath(im) : null;
        var marks = (Array.isArray(pick(s, 'marks')) ? pick(s, 'marks') : []).slice(0, L.marks || 8).map(function (m) {
          if (!m || typeof m !== 'object' || Array.isArray(m)) return null;
          var kind = pick(m, 'kind');
          if (!own(CFG.mark_kinds, kind)) return null;
          var x = num(pick(m, 'x')), y = num(pick(m, 'y')), w = num(pick(m, 'w')), h = num(pick(m, 'h'));
          if ([x, y, w, h].some(function (v) { return v === null; })) return null;
          if (!w || !h || x + w > 100.5 || y + h > 100.5) return null;
          return { kind: kind, n: badge(kind, pick(m, 'n')), x: x, y: y, w: w, h: h, label: str(pick(m, 'label'), L.mark_label || 60) };
        }).filter(Boolean);
        return { text: text, image: image, alt: image ? str(pick(s, 'alt'), ALT) : null, marks: image ? marks : [] };
      }).filter(Boolean);
      var who = pick(g, 'for');
      return steps.length ? { title: title, summary: str(pick(g, 'summary'), 240), for: own(CFG.audiences, who) ? who : null, slug: slug, steps: steps } : null;
    }).filter(Boolean);
    return { card: c, error: null };
  }

  /* ---------- one merged picture of a project ---------- */
  var LANG_COLOURS = Object.create(null);

  function titleCase(slug) {
    return String(slug).replace(/\.github\.io$/i, '').replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); }).trim();
  }
  function readmeIntro(md) {
    if (!md) return { title: null, para: null };
    var lines = md.split(/\r?\n/), title = null, para = [], inCode = false;
    for (var i = 0; i < lines.length && i < 120; i++) {
      var l = lines[i];
      if (/^```/.test(l)) { inCode = !inCode; continue; }
      if (inCode) continue;
      if (!title) { var m = l.match(/^#\s+(.+)/); if (m) { title = m[1].replace(/[`*_]/g, '').trim(); continue; } }
      var t = l.trim();
      if (!t) { if (para.length) break; continue; }
      if (/^(#|>|\||!\[|\[!\[|<|[-*+]\s|\d+\.|---|===)/.test(t)) { if (para.length) break; continue; }
      para.push(t);
    }
    var text = para.join(' ').replace(/<[^>]*>/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim();
    return { title: title, para: text.length > 20 ? text.slice(0, 600) : null };
  }
  function topicCategory(topics) {
    var p = CFG.category_topic_prefix || 'cat-';
    for (var i = 0; i < topics.length; i++) {
      var t = topics[i];
      if (t.indexOf(p) === 0 && own(CFG.categories, t.slice(p.length))) return t.slice(p.length);
    }
    return null;
  }

  function info(r) {
    var c = r.card || Object.create(null);
    var intro = readmeIntro(r.readme);
    var langs = r.languages || (r.language ? (function () { var o = {}; o[r.language] = r.size * 1024 || 1; return o; })() : {});
    var category = c.category || topicCategory(r.topics) || null;
    var demo = c.demo || null;
    var live = c.live_url || null;
    if (!live && r.homepage) live = httpsUrl(r.homepage);
    if (!live && r.has_pages && !r.private) live = 'https://' + ACCOUNT.toLowerCase() + '.github.io/' + (r.name.toLowerCase() === (ACCOUNT.toLowerCase() + '.github.io') ? '' : r.name + '/');
    return {
      repo: r,
      name: r.name,
      title: c.name || intro.title || titleCase(r.name),
      tagline: c.tagline || r.description || '',
      summary: c.summary || intro.para || r.description || '',
      category: category,
      kind: c.kind || null,
      status: c.status || (r.archived ? 'retired' : null),
      audience: c.audience || [],
      features: c.features || [],
      built_with: c.built_with || [],
      languages: langs,
      demo: demo, no_demo: c.no_demo || null, view: c.view || null,
      live_url: live,
      cover: c.cover || null, icon: c.icon || null,
      gallery: c.gallery || [], guides: c.guides || [],
      same_as: c.same_as || null,
      hasCard: !!r.card, cardError: r.cardError,
      private: r.private, fork: r.fork, archived: r.archived,
      pushed_at: (r.last_commit && r.last_commit.date) || r.pushed_at,
      last_message: r.last_commit ? r.last_commit.message : '',
      recent: r.recent, open_issues: r.open_issues, size: r.size
    };
  }

  // The projects to show: no forks, no archived repos, one card per project.
  // A second copy of a project: its card's same_as names another repo here (any case).
  function isCopy(r) {
    var s = r && r.card && r.card.same_as;
    if (!s || s.toLowerCase() === String(r.name).toLowerCase()) return false;
    return !!findRepo(s, { ci: true });
  }
  function projects(opts) {
    opts = opts || {};
    return state.repos.filter(function (r) {
      if (!opts.all && (r.fork || r.archived)) return false;
      return !isCopy(r);
    }).map(info);
  }

  /* ---------- files and pictures ---------- */
  // By exact name; with {ci: true} also in any case (GitHub's names are case-insensitive).
  function findRepo(name, opts) {
    if (typeof name !== 'string' || !name) return null;
    for (var i = 0; i < state.repos.length; i++) if (state.repos[i].name === name) return state.repos[i];
    if (opts && opts.ci) {
      var low = name.toLowerCase();
      for (var j = 0; j < state.repos.length; j++) if (state.repos[j].name.toLowerCase() === low) return state.repos[j];
    }
    return null;
  }
  function contentsPath(repo, path) {
    return '/repos/' + ACCOUNT + '/' + encodeURIComponent(repo) + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
  }

  async function fileBlob(repoName, path) {
    var r = findRepo(repoName, { ci: true }), p = safePath(path);
    if (!r || !p) throw new Error('Not available');
    if (!r.private) {
      var res = await fetch(RAW + '/' + ACCOUNT + '/' + encodeURIComponent(r.name) + '/' + encodeURIComponent(r.default_branch) + '/' + p.split('/').map(encodeURIComponent).join('/'));
      if (!res.ok) throw new Error('Not found');
      return res.blob();
    }
    var res2 = await api(contentsPath(r.name, p), { headers: { 'Accept': 'application/vnd.github.raw' } });
    if (!res2.ok) { var e = new Error(res2.status === 404 ? 'Not found' : 'GitHub answered ' + res2.status); e.status = res2.status; throw e; }
    return res2.blob();
  }

  async function fileText(repoName, path) { return (await fileBlob(repoName, path)).text(); }

  var imageCache = Object.create(null);
  var IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };
  function image(repoName, path) {
    var key = repoName + '/' + path;
    if (imageCache[key]) return imageCache[key];
    var ext = (String(path).split('.').pop() || '').toLowerCase();
    var type = IMAGE_TYPES[ext];
    if (!type) return Promise.reject(new Error('Not a picture'));
    imageCache[key] = fileBlob(repoName, path).then(function (b) {
      return URL.createObjectURL(new Blob([b], { type: type }));
    });
    imageCache[key].catch(function () { delete imageCache[key]; });
    return imageCache[key];
  }

  // A repo's whole file tree, with each item's sha (the City reads blobs by it). Kept for this tab,
  // keyed by the last push, so a new push fetches it again. Signed out, every call costs one of
  // the 60 hourly requests: call it for one project at a time, never for every repo.
  var oldTreesGone = false;
  async function tree(repoName) {
    var r = findRepo(repoName, { ci: true });
    if (!r) throw new Error('Not available');
    if (!oldTreesGone) {
      oldTreesGone = true;
      try { for (var k = sessionStorage.length - 1; k >= 0; k--) { var name = sessionStorage.key(k); if (name && name.indexOf('hw_tree_') === 0) sessionStorage.removeItem(name); } } catch (e) {}
    }
    var key = 'hw_tree2_' + r.name + '_' + (r.pushed_at || '');
    try { var cached = sessionStorage.getItem(key); if (cached) return JSON.parse(cached); } catch (e) {}
    var t = await apiJson('/repos/' + ACCOUNT + '/' + encodeURIComponent(r.name) + '/git/trees/' + encodeURIComponent(r.default_branch) + '?recursive=1');
    var slimTree = { truncated: !!t.truncated, items: (Array.isArray(t.tree) ? t.tree : []).map(function (i) {
      return { path: String(i.path), type: i.type === 'tree' ? 'tree' : i.type === 'commit' ? 'commit' : 'blob', size: typeof i.size === 'number' ? i.size : 0, sha: typeof i.sha === 'string' && /^[0-9a-f]{40,64}$/.test(i.sha) ? i.sha : null };
    }) };
    try { sessionStorage.setItem(key, JSON.stringify(slimTree)); } catch (e) {}
    return slimTree;
  }

  // The last commit that touched one file (the demo confirm screen's provenance line).
  var commitCache = Object.create(null);
  function lastCommitFor(repoName, path) {
    var r = findRepo(repoName, { ci: true }), p = safePath(path);
    if (!r || !p) return Promise.reject(new Error('Not available'));
    var key = r.name + '/' + p + '@' + (r.pushed_at || '');
    if (commitCache[key]) return commitCache[key];
    commitCache[key] = apiJson('/repos/' + ACCOUNT + '/' + encodeURIComponent(r.name) + '/commits?per_page=1&sha=' +
      encodeURIComponent(r.default_branch) + '&path=' + encodeURIComponent(p)).then(function (list) {
      var c = Array.isArray(list) ? list[0] : null;
      if (!c || !c.commit) return null;
      var when = (c.commit.committer && c.commit.committer.date) || (c.commit.author && c.commit.author.date) || null;
      return {
        login: (c.author && typeof c.author.login === 'string') ? c.author.login : null,
        date: when, verified: !!(c.commit.verification && c.commit.verification.verified),
        message: String(c.commit.message || '').split('\n')[0].slice(0, 200),
        sha: typeof c.sha === 'string' ? c.sha : null
      };
    });
    commitCache[key].catch(function () { delete commitCache[key]; });
    return commitCache[key];
  }

  window.HWGH = {
    config: CFG, account: ACCOUNT, state: state, on: on,
    get progress() { return progress; },
    get hasToken() { return !!token || PREVIEW; },
    loadRepos: loadRepos, signIn: signIn, signOut: signOut,
    signInWithGitHub: signInWithGitHub, authReady: AUTH_READY, staysSignedIn: staysSignedIn, checkApp: checkApp,
    projects: projects, info: info, findRepo: findRepo, isCopy: isCopy,
    cleanCard: cleanCard, safePath: safePath, httpsUrl: httpsUrl,
    fileText: fileText, fileBlob: fileBlob, image: image, tree: tree,
    api: readApi, apiJson: function (path) { return apiJson(path); }, graphql: readGraphql,
    lastCommitFor: lastCommitFor, trackLoad: trackLoad,
    get loads() { return loads; },
    get preview() { return PREVIEW; },
    langColour: function (name) { return LANG_COLOURS[name] || null; },
    RateLimit: RateLimit
  };
})();
