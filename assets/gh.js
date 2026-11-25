/* HelloWorld hub: the GitHub data layer (window.HWGH).
   Loads the account's repos and each project's details, checks hub cards against the standard,
   and fetches files and pictures with the viewer's own token. Nothing about any project is kept
   in this public repo: it all comes from GitHub at run time.

   Sign-in is a read-only fine-grained token the viewer pastes. It is kept in this tab only
   (sessionStorage) and sent only to api.github.com. */
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
  if (!PREVIEW) { try { token = sessionStorage.getItem(TOKEN_KEY); } catch (e) {} }

  var listeners = {};
  function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); }
  function emit(ev, data) { (listeners[ev] || []).forEach(function (fn) { try { fn(data); } catch (e) { console.error(e); } }); }

  var state = {
    signedIn: false, login: null, avatar: null, preview: PREVIEW,
    repos: [], detailsReady: false, loading: false, error: null, rateLimited: null, loadedAt: null
  };

  /* ---------- progress (the status beside the title) ---------- */
  var progress = { stage: 'idle', done: 0, total: 0 };
  function setProgress(stage, done, total) { progress = { stage: stage, done: done || 0, total: total || 0 }; emit('progress', progress); }

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
    if (res.status === 401 && token) { clearToken(); emit('auth', state); throw new Error('Your token has ended or was revoked. Sign in again.'); }
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

  /* ---------- sign-in ---------- */
  function clearToken() { token = null; try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} state.signedIn = false; state.login = null; state.avatar = null; }

  async function checkSession() {
    if (!token && !PREVIEW) { state.signedIn = false; return state; }
    setProgress('auth');
    try {
      var me = await apiJson('/user');
      state.signedIn = true; state.login = me.login; state.avatar = me.avatar_url;
    } catch (e) {
      if (e instanceof RateLimit) throw e;
      clearToken();
    }
    emit('auth', state);
    return state;
  }

  // Accepts a pasted token, checks it with GitHub, then keeps it for this tab only.
  async function signIn(raw) {
    var t = String(raw || '').trim();
    if (!/^(github_pat_[A-Za-z0-9_]{20,255}|gh[opsu]_[A-Za-z0-9]{30,255})$/.test(t)) {
      throw new Error('That does not look like a GitHub token. A fine-grained token starts with github_pat_.');
    }
    var res = await fetch(GH_API + '/user', { headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + t } });
    if (res.status === 401) throw new Error('GitHub did not accept that token. Check it has not expired.');
    if (!res.ok) throw new Error('GitHub answered ' + res.status + '. Try again in a minute.');
    var me = await res.json();
    token = t;
    try { sessionStorage.setItem(TOKEN_KEY, t); } catch (e) {}
    state.signedIn = true; state.login = me.login; state.avatar = me.avatar_url;
    emit('auth', state);
    return { login: me.login, broad: /^gh[opsu]_/.test(t), scopes: res.headers.get('x-oauth-scopes') };
  }

  function signOut() { clearToken(); emit('auth', state); }

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

  function cleanCard(text) {
    var raw;
    if (typeof text !== 'string' || text.length > 200000) return { card: null, error: 'Card is missing or too large' };
    if (text.indexOf('{{') >= 0) return { card: null, error: 'Card still has template placeholders' };
    try { raw = JSON.parse(text); } catch (e) { return { card: null, error: 'Card is not valid JSON' }; }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { card: null, error: 'Card is not an object' };
    var c = Object.create(null), L = LIMITS;
    c.name = str(raw.name, L.name || 40);
    if (!c.name) return { card: null, error: 'Card has no name' };
    c.tagline = str(raw.tagline, L.tagline || 90);
    c.summary = str(raw.summary, L.summary || 600);
    c.category = own(CFG.categories, raw.category) ? raw.category : null;
    c.kind = own(CFG.kinds, raw.kind) ? raw.kind : null;
    c.status = own(CFG.statuses, raw.status) ? raw.status : null;
    c.audience = Array.isArray(raw.audience) ? raw.audience.filter(function (a) { return own(CFG.audiences, a); }) : [];
    c.features = strList(raw.features, L.features || 8, L.feature || 120) || [];
    c.built_with = strList(raw.built_with, L.built_with || 12, 40) || [];
    c.live_url = httpsUrl(raw.live_url);
    c.demo = /\.html?$/i.test(raw.demo || '') ? safePath(raw.demo) : null;
    c.no_demo = str(raw.no_demo, 240);
    c.cover = /\.(png|jpe?g|webp)$/i.test(raw.cover || '') ? safePath(raw.cover) : null;
    c.icon = /\.svg$/i.test(raw.icon || '') ? safePath(raw.icon) : null;
    c.same_as = typeof raw.same_as === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(raw.same_as) ? raw.same_as : null;
    c.updated = typeof raw.updated === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.updated) ? raw.updated : null;
    c.gallery = (Array.isArray(raw.gallery) ? raw.gallery : []).slice(0, L.gallery || 12).map(function (g) {
      if (!g || typeof g !== 'object') return null;
      var src = /\.(png|jpe?g|webp|gif)$/i.test(g.src || '') ? safePath(g.src) : null;
      return src ? { src: src, caption: str(g.caption, L.caption || 140) || '' } : null;
    }).filter(Boolean);
    c.guides = (Array.isArray(raw.guides) ? raw.guides : []).slice(0, L.guides || 6).map(function (g) {
      if (!g || typeof g !== 'object') return null;
      var title = str(g.title, 80);
      if (!title) return null;
      var steps = (Array.isArray(g.steps) ? g.steps : []).slice(0, L.steps || 20).map(function (s) {
        if (!s || typeof s !== 'object') return null;
        var text = str(s.text, L.step || 240);
        if (!text) return null;
        var image = /\.(png|jpe?g|webp)$/i.test(s.image || '') ? safePath(s.image) : null;
        var marks = (Array.isArray(s.marks) ? s.marks : []).slice(0, L.marks || 8).map(function (m) {
          if (!m || typeof m !== 'object' || !own(CFG.mark_kinds, m.kind)) return null;
          var x = num(m.x), y = num(m.y), w = num(m.w), h = num(m.h);
          if ([x, y, w, h].some(function (v) { return v === null; })) return null;
          return { kind: m.kind, x: x, y: y, w: w, h: h, label: str(m.label, 12) };
        }).filter(Boolean);
        return { text: text, image: image, marks: image ? marks : [] };
      }).filter(Boolean);
      return steps.length ? { title: title, summary: str(g.summary, 240), steps: steps } : null;
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
      demo: demo, no_demo: c.no_demo || null,
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
  function projects(opts) {
    opts = opts || {};
    var names = Object.create(null);
    state.repos.forEach(function (r) { names[r.name] = true; });
    return state.repos.filter(function (r) {
      if (!opts.all && (r.fork || r.archived)) return false;
      if (r.card && r.card.same_as && names[r.card.same_as] && r.card.same_as !== r.name) return false;
      return true;
    }).map(info);
  }

  /* ---------- files and pictures ---------- */
  function findRepo(name) { for (var i = 0; i < state.repos.length; i++) if (state.repos[i].name === name) return state.repos[i]; return null; }
  function contentsPath(repo, path) {
    return '/repos/' + ACCOUNT + '/' + encodeURIComponent(repo) + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
  }

  async function fileBlob(repoName, path) {
    var r = findRepo(repoName), p = safePath(path);
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

  async function tree(repoName) {
    var r = findRepo(repoName);
    if (!r) throw new Error('Not available');
    var key = 'hw_tree_' + r.name + '_' + (r.pushed_at || '');
    try { var cached = sessionStorage.getItem(key); if (cached) return JSON.parse(cached); } catch (e) {}
    var t = await apiJson('/repos/' + ACCOUNT + '/' + encodeURIComponent(r.name) + '/git/trees/' + encodeURIComponent(r.default_branch) + '?recursive=1');
    var slimTree = { truncated: !!t.truncated, items: (t.tree || []).map(function (i) { return { path: i.path, type: i.type, size: i.size || 0 }; }) };
    try { sessionStorage.setItem(key, JSON.stringify(slimTree)); } catch (e) {}
    return slimTree;
  }

  window.HWGH = {
    config: CFG, account: ACCOUNT, state: state, on: on,
    get progress() { return progress; },
    get hasToken() { return !!token || PREVIEW; },
    loadRepos: loadRepos, signIn: signIn, signOut: signOut,
    projects: projects, info: info, findRepo: findRepo,
    cleanCard: cleanCard, safePath: safePath, httpsUrl: httpsUrl,
    fileText: fileText, fileBlob: fileBlob, image: image, tree: tree,
    langColour: function (name) { return LANG_COLOURS[name] || null; },
    RateLimit: RateLimit
  };
})();
