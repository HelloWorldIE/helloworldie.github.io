# CLAUDE.md

Guidance for Claude Code in the HelloWorld repository hub. The GitHub rules for every HelloWorld
project are in `../CLAUDE.md` (the `helloworldGitub` control folder); this file covers the hub.

## What this is

The **repository hub** for the `HelloWorldIE` GitHub account: one page to find a project, read about
it, try its demo and browse its code. Served by GitHub Pages from `main` at
https://helloworldie.github.io/. **This repo is public.** It holds no project data: everything is
read from GitHub at run time with the viewer's own access, so a signed-out visitor sees public
repos only. Never put client names, private repo names or anything private in this repo.

Not a marketing site: no sales copy. It is HelloWorld-branded (the bot mark, Signal Violet, Plus
Jakarta Sans; tokens in `assets/brand.css`, from the HelloWorld brand guide). Light by default; dark is a full alternative chosen
with the switch and remembered in `localStorage['hw_theme']`; the device setting alone never
switches it.

## Files

| Path | What it is |
|---|---|
| `index.html` | The hub page: header, the dashboard band, the explorer bar, `#hx-view`, dialogs. No inline script. |
| `assets/theme-boot.js` | Runs first: applies the saved theme, hides the page if framed. |
| `assets/hub-config.js` | **Generated** by `hw-gh hub-config` from `../config/github.json` (categories, colours, kinds, statuses, limits). Never edit by hand. |
| `assets/gh.js` | `window.HWGH`: sign-in, repo list, details (card, README, languages, last change), the card check (`cleanCard`), `info()` (one merged picture of a project), files and pictures with the viewer's token. |
| `assets/hub.js` | Router and views: Discover, All, Categories, World, Health, project pages, demo viewer, picture lightbox, guide viewer, code browser, search, sign-in dialog, load status. |
| `assets/dash.js`, `assets/dash.css` | `window.HWDash`: the four-card dashboard (Codebase, Languages, Activity, Live), used as the band on the hub and full window on `dashboard/`. |
| `assets/world.js` | The World view (ES module, three.js), loaded only when `#/world` opens. |
| `dashboard/index.html`, `assets/dashboard-page.js` | The single-screen dashboard page, with Live and Demo data. |
| `assets/brand.css`, `assets/hub.css` | Tokens and base elements; the hub's layout and components. |
| `assets/vendor/` | Pinned copies of marked 12.0.2, DOMPurify 3.1.6, highlight.js 11.9.0 and three.js r169. Each was checked against a second CDN before it was added. Replace a library as a whole, never edit it. |
| `assets/bot.svg` | The favicon (the bot, with a dark-mode variant). |
| `hub/project.json` | This repo's own hub card. |

Cache-busting: the assets load with `?v=N`. Bump N in `index.html` (and `dashboard/index.html`,
the `import('./world.js?v=N')` in `hub.js`, and the `world.css?v=N` that `world.js` loads itself)
whenever a file changes, or Pages may serve old copies.

The World (`assets/world.js`, `assets/world.css`, `hww-` classes) draws a dotted planet with one
region per category and one building per project: shape from the kind, height from code size; a
green beacon for a demo, a mast with a ring for a live site, a crane for in progress, grey for
paused or retired, small moons for changes in the last 30 days, a violet lock for private. The
side list is the accessible way in. Zoom needs Ctrl or Cmd with the wheel (or a pinch), so the
page still scrolls. three.js is vendored (`assets/vendor/three/README.md`: one import line changed).

## Routes

`#/` Discover (shelves: changed recently, demos, live, one per category) · `#/all?cat=&kind=&status=&lang=&demo=1&live=1&private=1&q=&sort=recent|name|size`
· `#/categories` · `#/world` · `#/health` (signed in) · `#/p/<repo>?tab=overview|built|code`
· `#/p/<repo>?launch=demo` opens the demo over the project page. The detail level (Overview, How
it's built, Code) is kept in `localStorage['hw_level']`.

## Where a project's details come from (`HWGH.info`)

First match wins: the hub card `hub/project.json` (standard: `../templates/hub/README.md`; a card
with `{{` placeholders is ignored) → the README (H1 = name, first paragraph = summary) → the
`cat-*` topic → the repo description → the repo name. Forks and archived repos are left out of
every list; a card with `same_as` hides a second copy of a project.

## Sign-in and security

- **Sign in with GitHub** (`HWGH.signInWithGitHub`, shown only when `hub.auth.client_id` and
  `hub.auth.exchange_url` are set in the config): the "HelloWorld Hub" GitHub App (contents and
  metadata read-only, 8-hour tokens). A popup opens on the click (before anything is awaited, so
  browsers allow it) at `github.com/login/oauth/authorize` with `state` and a PKCE challenge; it
  lands on `callback.html` (+ `assets/callback.js`), which posts the code to its opener on this
  origin only and closes. The page checks the message's source, origin and state, then the
  sign-in worker (`auth/worker.js`: `/exchange`, `/revoke`; CORS for this origin only; the client
  secret never leaves it; the refresh token is dropped) returns the token. Sign out calls
  `/revoke`. The worker's address must also be in the page's `connect-src`: `hw-gh auth-config`
  adds it. Deploy only with `hw-gh deploy auth` (see `../CLAUDE.md`).
- **The token route stays as a fallback:** a pasted read-only fine-grained token. The dialog links
  to GitHub's token page with the name, 90-day expiry and read-only contents filled in. A classic
  or gh token is accepted with a warning.
- Either way the token is checked with `/user`, kept in `sessionStorage['hw_gh_token']` (this tab
  only, gone when it closes) and sent only to `api.github.com`.
- **Signed in**, repos come from `/user/repos?affiliation=owner,collaborator` (owner `HelloWorldIE`)
  and details from GraphQL, ten repos a query, six at once. **Signed out**, from
  `/users/HelloWorldIE/repos` and `raw.githubusercontent.com` (GitHub allows 60 API requests an
  hour per address; the page says so when the limit is hit).
- **Content-Security-Policy** (meta): scripts from this site only, plus inline (needed by demos,
  see below); connections only to `api.github.com` and `raw.githubusercontent.com`; no plugins,
  no forms. Pages cannot send headers, so there is no `frame-ancestors`: `theme-boot.js` hides the
  page when it is framed instead.
- **Demos run sealed:** a `srcdoc` iframe with `sandbox="allow-scripts allow-popups allow-modals
  allow-downloads allow-pointer-lock"` and **never `allow-same-origin`**, so a demo cannot reach this
  page, its storage or the token. A stricter policy is put first in the demo (no network, no
  forms, data and blob pictures only) and an in-memory `localStorage` stands in. Never add
  `allow-same-origin`.
- **README and Markdown** go through marked, then DOMPurify (no style, forms, frames or media),
  then links are made safe (external in a new tab, relative to GitHub) and relative pictures load
  through the viewer's access. Everything else from GitHub is escaped (`esc()`) before it reaches
  `innerHTML`.
- **Card paths are checked** (`HWGH.safePath`): relative, inside the repo, no `..`, no scheme.
- **The origin is shared** with every other Pages site of `HelloWorldIE`. See rule 3 in `../CLAUDE.md`.

## Previewing

- **With real data, signed in:** `hw-gh preview` (from anywhere), then http://127.0.0.1:8765/. A
  read-only local proxy adds the token; the page shows "(local preview)" beside the account.
- **As a signed-out visitor:** `python3 -m http.server 8766 --bind 127.0.0.1` in this folder.
- Headless Chrome screenshots work for both; a WebGL flag is needed for the World.

## Deploying

Commit to `main` and push: Pages serves `main` from the root, no build step. Commits use the
HelloWorld identity automatically. Check first with both previews, light and dark, at 1440 and
390 px wide.

## Gotchas

- `.btn` sets `display`, so `brand.css` has `[hidden] { display: none !important; }`. Keep it, or
  hidden buttons show.
- `hub.js` defines `own()` before everything else and the first `render()` runs at the end of the
  file. Code that renders during start-up runs before the views exist.
- Horizontal shelves use `overflow-y: hidden`, or the mouse wheel stops scrolling the page.
