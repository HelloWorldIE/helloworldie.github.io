/* HelloWorld Hub sign-in: a Cloudflare Worker that holds the GitHub App's client secret.
   It does three things only, for the hub's own address:
     POST /exchange { code, code_verifier }  ->  { access_token, expires_in, session?, session_expires_in? }
     POST /refresh  { session }              ->  the same shape, with a new session (401 when it has ended)
     POST /revoke   { token?, session? }     ->  204 (ends that token at GitHub, and spends the session)
   Settings (wrangler.toml): GITHUB_CLIENT_ID, ALLOWED_ORIGIN, REDIRECT_URI.
   Secrets (never in this repo): GITHUB_CLIENT_SECRET (`hw-gh worker-secret`) and SESSION_KEY (32 random
   bytes, base64, made and stored by `hw-gh deploy auth`; `--new-session-key` signs every device out).

   Staying signed in (Bryan, 2026-11-26). GitHub gives an 8-hour access token and a refresh token that
   lasts six months. The refresh token never leaves this worker in the clear: it is sealed with
   AES-256-GCM under SESSION_KEY into an opaque "session" that the hub keeps on the device and hands
   back here for a new access token. GitHub replaces the refresh token on every refresh, so each
   session works once. Without SESSION_KEY the worker issues no session and the hub falls back to
   signing in again after 8 hours. */

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const SEAL_AD = new TextEncoder().encode('helloworld-hub-session-v1');
const SIX_MONTHS = 15897600;                        // GitHub's refresh token life, in seconds

function cors(env, origin) {
  return origin === env.ALLOWED_ORIGIN
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', 'Vary': 'Origin' }
    : { 'Vary': 'Origin' };
}

function reply(status, body, extra) {
  return new Response(body == null ? null : JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } });
}

async function readJson(request) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > 4096) return null;
  const text = await request.text();
  if (text.length > 4096) return null;
  try { const v = JSON.parse(text); return v && typeof v === 'object' ? v : null; } catch { return null; }
}

/* ---------- sealing: AES-256-GCM, a fresh 96-bit IV each time, bound to this purpose ---------- */
const b64u = (u8) => { let s = ''; for (const b of u8) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (s) => { const t = s.replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(t + '='.repeat((4 - t.length % 4) % 4)), (c) => c.charCodeAt(0)); };
async function sealKey(env) {
  const raw = unb64u(String(env.SESSION_KEY || '').trim().replace(/=+$/, ''));
  if (raw.length !== 32) throw new Error('SESSION_KEY must be 32 bytes');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function seal(env, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: SEAL_AD }, await sealKey(env), new TextEncoder().encode(JSON.stringify(obj))));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return b64u(out);
}
async function unseal(env, s) {
  if (typeof s !== 'string' || !/^[A-Za-z0-9_-]{60,2000}$/.test(s) || !env.SESSION_KEY) return null;
  try {
    const b = unb64u(s);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12), additionalData: SEAL_AD }, await sealKey(env), b.slice(12));
    const v = JSON.parse(new TextDecoder().decode(pt));
    return v && typeof v.r === 'string' && typeof v.e === 'number' ? v : null;
  } catch { return null; }
}

/* ---------- GitHub ---------- */
async function ghToken(env, params) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'helloworld-hub-auth' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, ...params })
  });
  const data = await res.json().catch(() => ({}));
  return res.ok && data.access_token ? data : { error: data.error || 'github_' + res.status };
}
async function ghRevoke(env, token) {
  const res = await fetch(`https://api.github.com/applications/${env.GITHUB_CLIENT_ID}/token`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'helloworld-hub-auth',
      'Authorization': 'Basic ' + btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`)
    },
    body: JSON.stringify({ access_token: token })
  });
  return res.status === 204 || res.status === 404;
}
/* What the hub gets: the access token, and (when a session key is set) the sealed refresh token. */
async function answer(env, data, c) {
  const out = { access_token: data.access_token, expires_in: data.expires_in || null, token_type: data.token_type || 'bearer' };
  if (data.refresh_token && env.SESSION_KEY) {
    const ttl = Number(data.refresh_token_expires_in) || SIX_MONTHS;
    out.session = await seal(env, { r: data.refresh_token, e: Date.now() + ttl * 1000 });
    out.session_expires_in = ttl;
  }
  return reply(200, out, c);
}
const TOKEN = /^gh[ousr]_[A-Za-z0-9_]{20,255}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const c = cors(env, origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: origin === env.ALLOWED_ORIGIN ? 204 : 403, headers: c });
    if (request.method !== 'POST' || !['/exchange', '/refresh', '/revoke'].includes(url.pathname)) return reply(404, { error: 'not_found' }, c);
    if (origin !== env.ALLOWED_ORIGIN) return reply(403, { error: 'origin' }, c);
    if (!env.GITHUB_CLIENT_SECRET) return reply(503, { error: 'not_configured' }, c);

    const body = await readJson(request);
    if (!body) return reply(400, { error: 'bad_request' }, c);

    if (url.pathname === '/exchange') {
      const code = String(body.code || ''), verifier = String(body.code_verifier || '');
      if (!/^[A-Za-z0-9_-]{10,64}$/.test(code) || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return reply(400, { error: 'bad_request' }, c);
      const data = await ghToken(env, { code, code_verifier: verifier, redirect_uri: env.REDIRECT_URI });
      if (!data.access_token) return reply(400, { error: data.error || 'exchange_failed' }, c);
      return answer(env, data, c);
    }

    if (url.pathname === '/refresh') {
      const s = await unseal(env, body.session);
      if (!s || s.e < Date.now()) return reply(401, { error: 'session_ended' }, c);
      const data = await ghToken(env, { grant_type: 'refresh_token', refresh_token: s.r });
      if (!data.access_token) return reply(data.error === 'bad_refresh_token' || data.error === 'unauthorized' ? 401 : 502, { error: data.error === 'bad_refresh_token' ? 'session_ended' : data.error }, c);
      return answer(env, data, c);
    }

    // /revoke: end the access token, and spend the session so the copy on the device is worthless.
    // Spending it means refreshing once (GitHub then refuses the old refresh token) and ending the
    // access token that the refresh gives; the new refresh token is never sent anywhere.
    const token = body.token == null ? '' : String(body.token);
    if (token && !TOKEN.test(token)) return reply(400, { error: 'bad_request' }, c);
    let ok = true;
    if (body.session != null) {
      const s = await unseal(env, body.session);
      if (s) {
        const data = await ghToken(env, { grant_type: 'refresh_token', refresh_token: s.r });
        if (data.access_token) ok = (await ghRevoke(env, data.access_token)) && ok;
      }
    }
    if (token) ok = (await ghRevoke(env, token)) && ok;
    return reply(ok ? 204 : 502, null, c);
  }
};
