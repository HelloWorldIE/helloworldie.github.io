# three.js r169 (vendored)

The City view (`assets/city/`) uses these files. They are kept in this repo, not loaded from a
CDN, because the hub page can hold a viewer's GitHub token. Replace them as a set, never edit them
(apart from the one line noted below).

| File | Source (jsDelivr, `three@0.169.0`) | SHA-256 of the downloaded file |
|---|---|---|
| `three.module.min.js` | https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js | `f7cee3c7533449a1505cc12cb5128b89e3d4fd3d7ea62b05f9f5464a217472ee` |
| `addons/controls/OrbitControls.js` | https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/controls/OrbitControls.js | `80efaadea4f8a636a65fb0bd08bfef62f3d93a0bb94e2e7500f23176c5c07f4e` |
| `addons/controls/PointerLockControls.js` | https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/controls/PointerLockControls.js | `3bcdd5827137a5fe531735ad8785d909ba898a904829638c58f1d7961bc38888` |
| `addons/renderers/CSS2DRenderer.js` | https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/renderers/CSS2DRenderer.js | `e900e58dbc428d8d3211f87f3ff0301e514f6dc563655c710bcda15c96397feb` |
| `addons/environments/RoomEnvironment.js` | https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/environments/RoomEnvironment.js | `85869bdd22f7cf0b22e68dcefe6cb710480af0f5c901a76f7a7764fd07fc8014` |
| `addons/utils/BufferGeometryUtils.js` | https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/utils/BufferGeometryUtils.js | `c25b7930e570e9ec56173cd3b866ec8d2e10016630db3937efb439daf1cedbf6` |
| `addons/loaders/SVGLoader.js` | https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/SVGLoader.js | `7839736ad83df8c25d339f2c1e3b7f49c595e4d444b54905f26bece24702f51f` |

Every file was also fetched from unpkg.com (`https://unpkg.com/three@0.169.0/...`) and the
hashes matched: the first two on 2026-11-26 for the World, the other five on 2026-11-26 for the
City.

## The one change

The hub has no import map (it would need an inline script), so each add-on's bare import was made
relative. In every add-on, the one line that closes its `import { ... }` block:

```diff
- } from 'three';
+ } from '../../three.module.min.js';
```

That is line 12 of `OrbitControls.js` and `BufferGeometryUtils.js`, line 5 of
`PointerLockControls.js`, line 6 of `CSS2DRenderer.js`, line 13 of `RoomEnvironment.js` and line 15
of `SVGLoader.js`. Nothing else is changed. SHA-256 after the change:

| File | SHA-256 in this repo |
|---|---|
| `addons/controls/OrbitControls.js` | `02628da7c0a123a41eb5f618a2d740608a806fe0a71eb676a126a487d212690d` |
| `addons/controls/PointerLockControls.js` | `cd9ad8969f5713229248203648c6856fad4902d27c7f7fbb37b1e3e272465682` |
| `addons/renderers/CSS2DRenderer.js` | `c814b0018c8dd8957273742076a50a8c6c15ee6ce9d594233bc84325819beceb` |
| `addons/environments/RoomEnvironment.js` | `192333f7b0f991b1860acf78bebdb0eaa2fd0ecde22886e0e94461c17347fafe` |
| `addons/utils/BufferGeometryUtils.js` | `669381049ccaa95417ff3b5a3b86d9aec517bd18ef7a615c6cf8a4cd1f502f76` |
| `addons/loaders/SVGLoader.js` | `51570ad322af1fbd4e2f3a53a13978e232354199204f7baeb504ac444ee27f28` |

## Updating

1. Download the same seven paths for the new version from jsDelivr and from unpkg, and check the
   hashes match.
2. Make the same one-line change to each add-on, and check nothing else imports `'three'`
   (`grep -rn "from 'three'" addons/` prints nothing).
3. Update both tables in this file and test the City (`#/city`), including Look inside, Walk the
   streets and Connections.

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
