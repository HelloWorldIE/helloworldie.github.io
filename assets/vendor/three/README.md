# three.js r169 (vendored)

The World view (`assets/world.js`) uses these files. They are kept in this repo, not loaded from a
CDN, because the hub page can hold a viewer's GitHub token. Replace them as a set, never edit them
(apart from the one line noted below).

| File | Source | SHA-256 of the downloaded file |
|---|---|---|
| `three.module.min.js` | https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js | `f7cee3c7533449a1505cc12cb5128b89e3d4fd3d7ea62b05f9f5464a217472ee` |
| `addons/controls/OrbitControls.js` | https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/controls/OrbitControls.js | `80efaadea4f8a636a65fb0bd08bfef62f3d93a0bb94e2e7500f23176c5c07f4e` |

Both files were also fetched from unpkg.com (`https://unpkg.com/three@0.169.0/...`) on 2026-11-26 and
the hashes matched.

## The one change

The hub has no import map, so the addon's bare import was made relative. Line 12 of
`addons/controls/OrbitControls.js`:

```diff
- } from 'three';
+ } from '../../three.module.min.js';
```

After that change the file's SHA-256 is `02628da7c0a123a41eb5f618a2d740608a806fe0a71eb676a126a487d212690d`.

## Updating

1. Download the same two paths for the new version from jsDelivr and from unpkg, and check the hashes match.
2. Make the same one-line change to `OrbitControls.js`.
3. Update this file and test the World view (`#/world`).

## Licence

The MIT License

Copyright © 2010-2024 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
