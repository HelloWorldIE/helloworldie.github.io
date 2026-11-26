# HelloWorld Repository Hub

One page to find every HelloWorld project, read about it, try its demo and browse its code.

**Live:** https://helloworldie.github.io/ · **Dashboard:** https://helloworldie.github.io/dashboard/

- **The City:** every project is a building in a calm 3D model, in a district for its category.
  Its files are the blocks around it. Take a tour, search, or walk through the streets.
- **Discover, All projects, the Map, Idea to live, Connections, Live sites, What's new:** find
  projects by category, kind, status and the tools they use. Choose how much detail to see:
  Overview, How it's built or Code.
- **Project pages:** pictures, step-by-step guides, the demo in a sealed frame, the README and a
  code browser.
- **Health:** which repos have a hub card, a README, a demo, a category (signed in).
- **Dashboard:** projects, recent changes, the latest update and rules passing, on one screen.

Signed out, the hub shows public repos only. To see private ones, sign in with GitHub or with a
read-only fine-grained token. Either way the hub can only read, and the sign-in goes only to GitHub.
A GitHub sign-in can stay on the device until you sign out; a token stays in that browser tab.

## How a project appears here

Each repo carries a hub card, `hub/project.json`, with its pictures under `hub/`. The standard,
the tools that check it (`hw-gh`) and the rules for the account live outside this public repo, in
the `helloworldGitub` folder on Bryan's Mac.

## Run it locally

Open `index.html` through any static server, for example
`python3 -m http.server 8766 --bind 127.0.0.1`, then http://127.0.0.1:8766/. No build step.

## Third-party code

Pinned copies in `assets/vendor/`: marked (MIT), DOMPurify (Apache 2.0 or MPL 2.0),
highlight.js (BSD 3-Clause), three.js (MIT), GSAP (GreenSock standard licence). Each keeps its licence notice.

---

HelloWorld · https://helloworld.ie
