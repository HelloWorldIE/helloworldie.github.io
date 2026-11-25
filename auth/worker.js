/* HelloWorld Hub sign-in: a Cloudflare Worker that holds the GitHub App's client secret.
   It does two things only, for the hub's own address:
     POST /exchange { code, code_verifier }  ->  { access_token, expires_in }
     POST /revoke   { token }                ->  204 (ends that token at GitHub)
   Settings (wrangler.toml): GITHUB_CLIENT_ID, ALLOWED_ORIGIN, REDIRECT_URI.
   Secret (set with `hw-gh worker-secret`, never in this repo): GITHUB_CLIENT_SECRET. */

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const c = cors(env, origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: origin === env.ALLOWED_ORIGIN ? 204 : 403, headers: c });
    if (request.method !== 'POST' || !['/exchange', '/revoke'].includes(url.pathname)) return reply(404, { error: 'not_found' }, c);
    if (origin !== env.ALLOWED_ORIGIN) return reply(403, { error: 'origin' }, c);
    if (!env.GITHUB_CLIENT_SECRET) return reply(503, { error: 'not_configured' }, c);

    const body = await readJson(request);
    if (!body) return reply(400, { error: 'bad_request' }, c);

    if (url.pathname === '/exchange') {
      const code = String(body.code || ''), verifier = String(body.code_verifier || '');
      if (!/^[A-Za-z0-9_-]{10,64}$/.test(code) || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return reply(400, { error: 'bad_request' }, c);
      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'helloworld-hub-auth' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET,
          code, code_verifier: verifier, redirect_uri: env.REDIRECT_URI
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.access_token) return reply(400, { error: data.error || 'exchange_failed' }, c);
      // The refresh token stays here: the hub signs in again when a token ends.
      return reply(200, { access_token: data.access_token, expires_in: data.expires_in || null, token_type: data.token_type || 'bearer' }, c);
    }

    // /revoke
    const token = String(body.token || '');
    if (!/^gh[ousr]_[A-Za-z0-9_]{20,255}$/.test(token)) return reply(400, { error: 'bad_request' }, c);
    const res = await fetch(`https://api.github.com/applications/${env.GITHUB_CLIENT_ID}/token`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'helloworld-hub-auth',
        'Authorization': 'Basic ' + btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`)
      },
      body: JSON.stringify({ access_token: token })
    });
    return reply(res.status === 204 || res.status === 404 ? 204 : 502, null, c);
  }
};
