# HelloWorld Repository Hub

One page to find every HelloWorld project, read about it, try its demo and browse its code.

**Live:** https://helloworldie.github.io/ · **Dashboard:** https://helloworldie.github.io/dashboard/

- **Discover, All projects, Categories:** projects grouped and filtered by category, kind, status
  and language, at three detail levels (Overview, How it's built, Code).
- **World:** every project as a building on one dotted planet, grouped by category.
- **Project pages:** pictures, step-by-step guides, the demo in a sealed frame, the README and a
  code browser.
- **Health:** which repos have a hub card, a README, a demo, a category (signed in).
- **Dashboard:** codebase, languages, activity and live projects on one screen.

Signed out, the hub shows public repos only. To see private ones, sign in with a read-only
fine-grained GitHub token; it stays in that browser tab and goes only to GitHub.

## How a project appears here

Each repo carries a hub card, `hub/project.json`, with its pictures under `hub/`. The standard,
the tools that check it (`hw-gh`) and the rules for the account live outside this public repo, in
the `helloworldGitub` folder on Bryan's Mac.

## Run it locally

Open `index.html` through any static server, for example
`python3 -m http.server 8766 --bind 127.0.0.1`, then http://127.0.0.1:8766/. No build step.

## Third-party code

Pinned copies in `assets/vendor/`: marked (MIT), DOMPurify (Apache 2.0 or MPL 2.0),
highlight.js (BSD 3-Clause), three.js (MIT). Each keeps its licence notice.

---

HelloWorld · https://helloworld.ie
