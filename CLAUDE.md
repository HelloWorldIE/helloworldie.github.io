# CLAUDE.md

Guidance for Claude Code in the HelloWorld repository hub. The GitHub rules for every HelloWorld
project are in `../CLAUDE.md` (the `helloworldGitub` control folder); this file covers the hub.

## What this is

The **repository hub** for the `HelloWorldIE` GitHub account: find a project, read about it, try
its demo, follow its guides, browse its code, and walk through the City, where every project is a
building. Served by GitHub Pages from `main` at https://helloworldie.github.io/. **This repo is
public.** It holds no project data: everything is read from GitHub at run time with the viewer's
own access, so a signed-out visitor sees public repos only. Never put client names, private repo
names or anything private in this repo.

The explorer, header and City began as a port of another workspace's hub (Bryan, 2026-11-26), then
redesigned in the HelloWorld brand. Nothing of that company may come back: run `hw-gh gate` before
every commit (it checks the deny list kept outside every repo).

## The brand (read before changing anything you can see)

`../brand/BRAND-BRIEF.md` is the design authority; section 14 is the hub's spec. In short: light by
default and dark as a full peer (role tokens in `assets/tokens.css`; the switch writes
`localStorage['hw_theme']` and fires `hw-theme` on `document`); one accent, Signal Violet
`#6d44e0` (Bright Violet `#a98bff` on dark), about 10 to 13% of a view; categories and stages told
apart by place and words, never hue; the City's buildings (and the header's skyline) each have a soft
colour of their own (Bryan, 2026-11-26; `PALETTE.facades` in `hwc-ui.js`, the same ten tones as
`--hwh-f0` to `--hwh-f9` in `hero.css`, picked by the City's hash of the repo name); Plus Jakarta Sans only (self-hosted in `assets/fonts/`), no
monospace except a file's text in the code browser; no glass, blur, glow, neon, particles, planets
or spinners; motion "organic, natural, living" (the `--ease-*` tokens), with full reduced-motion
support; the eye pill (2:5 capsule) as the only shape; the bot is the real mascot engine, alive and
meaningful, one per view, never 3D, except in the City's overview, where he is a 3D model made
from the mascot's own drawing (Bryan, 2026-11-26; `_makeBot` in `hwc-city.js`) and the flat one
steps aside; a rounded element has a full border or none.

## Files

| Path | What it is | Global |
|---|---|---|
| `index.html` | The page: head and CSP, header, `#hwh-hero`, the explorer bar, `#hwx-view`, dialogs. No inline script. | |
| `assets/theme-boot.js` | First script: applies the saved theme, hides the page if framed. | |
| `assets/tokens.css` | Brand tokens (light `:root`, dark `[data-theme="dark"]`), font faces. Loaded first. | |
| `assets/hub-config.js` | **Generated** by `hw-gh hub-config` from `../config/github.json`. Never edit. | `HW_CONFIG` |
| `assets/gh.js` | Data and sign-in: repos, details, card checks (`cleanCard`), files and pictures with the viewer's token, read-only `api`/`graphql`, trees with `sha`, `lastCommitFor`, `trackLoad`. | `HWGH` |
| `assets/hwx-vocab.js` | Vocabulary built from the config (categories, stages, kinds, audiences, platforms, terms), icons, art helpers and `HWX.coverSVG` (generated covers in helloworld.ie's recipe). | `HWX` |
| `assets/hwx-data.js` | The adapter the views use: `HWX.info`, `list`, `index`, `recent`, `image`, `md`, `level`, `onRepos`, `whenDetails`. | `HWX` |
| `assets/hub-shell.js` | Shell services: theme, sign-in dialog (GitHub App and token), toasts, copy, the sealed demo viewer with its confirm screen, lightbox, guide viewer, `HWLoad` and the bot loader, the capsule curtain. | `HWShell`, `HWLoad` |
| `assets/hwx-views.js`, `assets/hwx.css` | The router and every view (below), cards, project pages, detail levels, search. `hwx.css` also holds the base classes (`.btn`, `.field`, `.eyebrow`, `.cat`, `.badge`, `.decor`). | `HWX.render`, `HWX.go` |
| `assets/hero.js`, `assets/hero.css` | The header: title, the skyline (every project that is not retired as a pill building in its City colour, the live ones with the bot's eyes; pointing names it, selecting opens it) and four animated cards (Projects, Last changes, Latest update, Rules passing) with the bot narrating the load; also full-window mode for `/dashboard/` (no skyline). | `HWHero` |
| `assets/hwc-ui.js`, `assets/hwc.css` | The City's page side: the `#/city` view, panels, key, search, tours, Projects list, the project slide and the Discover card. Loads the City module on demand. | `HWX.views.city`, `HWX.citySlide`, `HWX.citySearch`, `HWX.cityPreview` |
| `assets/city/hwc-city.js`, `city-architecture.js`, `city-plan.js`, `city-props.js` | The City (ES modules, three.js): districts, buildings, file blocks, props, tours, walk mode, the HelloWorld line and the bot in 3D (`_makeBot`, `_stepBot`): he swims the line district to district and swims to whatever is selected, with a stride of overlapping pushes (`strideTable`: he never stops mid-journey, as `assets/mascot/AGENTS.md` 3.4 and Bryan ask), and `_stepTrail` draws his fading light trail from the same sums, starting just behind him, so it is smooth at any frame rate. Colours only through the palette handler from `hwc-ui.js`. Never touches the token. | |
| `assets/mascot/` | The bot's animation engine (HelloWorld's own; needs `window.gsap`; his life at rest, the blink, glances, breathing and the routines in `BOT_ACTS`, runs in `_botLife` and `_botPose`). Read its `README.md` and `AGENTS.md` before using it. | |
| `assets/brand/`, `assets/fonts/`, `assets/bot.svg` | Bot marks and silhouette, app icons, Plus Jakarta Sans, the favicon. | |
| `dashboard/index.html`, `assets/dashboard-page.js` | The one-screen dashboard (`HWHero` in full mode) with Live, Demo (`?demo`) and Big demo (`?big`) data. | |
| `callback.html`, `assets/callback.js` | The sign-in popup's landing page. | |
| `auth/` | The sign-in worker (Cloudflare). Deploy only with `hw-gh deploy auth`. | |
| `assets/vendor/` | Pinned libraries, each checked against a second CDN: marked 12.0.2, DOMPurify 3.1.6, highlight.js 11.9.0, GSAP 3.12.5, three.js r169 with six add-ons (`vendor/three/README.md` records the one changed import line and the hashes). Replace a library as a whole, never edit it. | |
| `hub/` | This repo's own card, pictures and `shots.json`. | |

Script order in `index.html`: `theme-boot.js`, `hub-config.js`, `gh.js`, marked, DOMPurify,
highlight.js, GSAP, `hwx-vocab.js`, `hwx-data.js`, `hub-shell.js`, `hero.js`, `hwx-views.js`,
`hwc-ui.js`. Cache-busting: every asset loads with `?v=N`; bump it on every change, and bump
`CITY_URL` in `hwc-ui.js` and the City files' own `?v=` imports when the City changes.

## Routes

`#/` Discover · `#/city` (`?in=<repo>` looks inside one project) · `#/map` · `#/cat/<id>` ·
`#/line` (Idea to live) · `#/connections` · `#/live`, `#/live/<host>` · `#/new` (what's new) ·
`#/all?cat=&kind=&status=&lang=&aud=&q=&sort=` · `#/with/<tool>` · `#/glossary` · `#/health`
(signed in) · `#/p/<repo>?tab=overview|built|code` · `#/p/<repo>?launch=demo` (asks first).
Old addresses redirect: `#/world`, `#/categories`, `#/journey`, `#/sites`. The detail level
(Overview, How it's built, Code) is `localStorage['hw_level']` and fires `hwx:level`.

## Where a project's details come from

The hub card `hub/project.json` (standard: `../templates/hub/README.md`; a card with `{{`
placeholders is ignored; every field is checked by `HWGH.cleanCard`) → the README (H1 and first
paragraph) → the `cat-*` topic → the description → the repo name. Forks and archived repos are left
out of every list; `same_as` hides a second copy. A project without pictures gets a generated cover.

## Sign-in and security

- **Sign in with GitHub** through the "HelloWorldIE Hub" GitHub App (read-only, 8-hour tokens,
  PKCE, popup to `callback.html`, the `auth/` worker swaps the code), shown only once
  `hub.auth.client_id` and `exchange_url` are set; the **read-only fine-grained token** route stays
  as a fallback. Tokens go only to `api.github.com`.
- **Staying signed in** (Bryan, 2026-11-26): "Stay signed in on this device" (ticked by default)
  keeps `localStorage['hw_gh_auth']` = the 8-hour token and the worker's sealed session (the
  refresh token under AES-256-GCM with the worker's `SESSION_KEY`; the hub cannot open it).
  `resume()` in `gh.js` renews through `/refresh` about ten minutes before the token ends, on a 401
  (then retries once), and on load. One tab renews at a time (`hw_gh_auth_lock`), because each
  session works once; the others take the new token from the `storage` event. Sign out sends the
  token and the session to `/revoke`, which ends both. A pasted token, or a GitHub sign-in with the
  box cleared, stays in `sessionStorage['hw_gh_token']` for that tab only. `hw-gh deploy auth
  --new-session-key` signs every device out. Anything that can run script on this origin can read
  a saved sign-in, which is one more reason only the hub may use Pages on this account and demos
  never run with `allow-same-origin`.
- **CSP** (meta in `index.html`): scripts from this site (plus inline, for demos), connections only
  to `api.github.com`, `raw.githubusercontent.com` and the sign-in worker once configured.
- **Demos never run as the hub:** a `srcdoc` frame, `sandbox` without `allow-same-origin` (never add
  it), the strict demo policy first in the page (no network, no forms), in-memory storage, a
  warning bar. A link (`?launch=demo`) never runs a demo by itself: the confirm screen says who
  last changed it. The City never runs a demo; its preview shows a picture only.
- **The City module never sees the token** or page globals: `hwc-ui.js` hands it fetchers.
- Everything from GitHub is escaped (`HWShell.esc`) or sanitised (marked then DOMPurify) before it
  reaches `innerHTML`; card paths go through `HWGH.safePath`; maps keyed by card values are
  `Object.create(null)`.
- Signed out, GitHub allows 60 API requests an hour: the City loads no file trees then, except for
  Look inside.

## Previewing and pictures

- **Real data, signed in:** `hw-gh preview` (a read-only proxy on http://127.0.0.1:8765/).
- **Signed out:** `python3 -m http.server 8766 --bind 127.0.0.1` in this folder.
- **The hub's own pictures:** `hw-gh shots .` from `hub/shots.json` (the dashboard with demo data,
  so nothing private is in them).
- Check light and dark, 1440 and 390 px, reduced motion, and WebGL off for the City, before
  publishing. Headless Chrome needs SwiftShader flags for WebGL and enforces a 500 px minimum
  window, so use device emulation for phones.

## Deploying

`hw-gh gate`, then commit to `main` and push: Pages serves `main` from the root, no build step.

## Gotchas

- `html, body` use `overflow-x: clip`, never `hidden`, or the sticky header and explorer bar stop
  sticking.
- In full screen, `hwc.css` lifts `#hwx-view` (`z-index: 400`) because the view is its own
  stacking context: keep that id.
- Horizontal scrollers need `overflow-y: hidden`, or the mouse wheel stops scrolling the page.
- The header bot and the shell's loader take turns, so one bot talks at a time.
- **Scroll reveal and hover never share a property.** The reveal (`observeReveals` in
  `hub-shell.js`) hides what is below the fold before it arrives (`.hw-rv-wait`) and rises it in with
  a Web Animation on `opacity` and `translate`, holding nothing afterwards; hover lifts use
  `transform` with symmetric transitions, and the border light fades out on leave. A CSS animation
  with `fill: both` on `transform` once froze the hover lift (it jumped) and showed cards, hid them
  and faded them in again (the flash): do not bring that back.
- Headless Chrome reports `navigator.webdriver`, which turns the reveal, the curtain and the hero's
  motion off; to test them, hide it with `Object.defineProperty(Navigator.prototype, 'webdriver', ...)`
  before the page loads.
- three.js logs an error when a headless browser refuses pointer lock (walk mode); it is caught and
  the keys still work.
