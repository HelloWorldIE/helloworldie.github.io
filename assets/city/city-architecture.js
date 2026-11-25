/* ===================================================================
   HelloWorld hub: the City's buildings.
   A generative building vocabulary, drawn in the brand's one shape.
   -------------------------------------------------------------------
   A town of scaled boxes tells you one thing: size. So buildings are
   composed, not scaled. Every building is put together from soft parts
   (rounded slabs, standing eye pills, drums, domes and vaults with soft
   edges), and which parts it gets is worked out from the data:

     family   the kind of project, or the type of a file
     tier     size within its group: plain, a plinth, a collar, a ring of
              pill columns
     crown    from the name and the type: a dome, a vault, a lantern, a
              needle, an antenna (the bot's), or a small statue of the
              file type's glyph
     landmark the biggest file: always fully dressed, always crowned

   Geometry is made per VARIANT, not per building: a few dozen forms are
   instanced across every building, so the variety costs nothing to draw.
   Every variant keeps one contract:
     . footprint inside +-0.5 on x and z
     . base at y = 0, top at y = 1
   so one instance matrix (width, height, depth) places any of them.
   Colour is not here: bodies are paper tones chosen by the City from the
   palette it is given.
   =================================================================== */
import * as THREE from '../vendor/three/three.module.min.js';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';
import { SVGLoader } from '../vendor/three/addons/loaders/SVGLoader.js';

const PI = Math.PI;

/* ---------- soft primitives, already in place ---------- */
function roundRect(w, d, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
  r = Math.max(0.0005, Math.min(r, w / 2, d / 2));
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -PI / 2, 0, false);
  s.lineTo(x + w, y + d - r); s.absarc(x + w - r, y + d - r, r, 0, PI / 2, false);
  s.lineTo(x + r, y + d); s.absarc(x + r, y + d - r, r, PI / 2, PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, PI, PI * 1.5, false);
  return s;
}
/* A rounded slab: rounded corners in plan, soft edges all round. */
export function slab(w, h, d, y = 0, r = 0.12, soft = 0.03, x = 0, z = 0) {
  const b = Math.max(0, Math.min(soft, h * 0.45, w * 0.2, d * 0.2));
  const g = new THREE.ExtrudeGeometry(roundRect(w - 2 * b, d - 2 * b, Math.max(0.001, r - b)), {
    depth: Math.max(0.001, h - 2 * b), bevelEnabled: b > 0.002, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 5
  });
  g.rotateX(-PI / 2);
  return g.translate(x, y + b, z);
}
/* The eye pill standing up: a capsule `h` tall. */
export function pill(r, h, y = 0, x = 0, z = 0, seg = 14) {
  return new THREE.CapsuleGeometry(r, Math.max(0.0001, h - 2 * r), 5, seg).translate(x, y + h / 2, z);
}
/* A round drum with a soft top edge. */
function drum(r, h, y = 0, soft = 0.06, seg = 28) {
  const s = Math.min(soft, h * 0.5, r * 0.5), pts = [new THREE.Vector2(0, 0), new THREE.Vector2(r, 0), new THREE.Vector2(r, h - s)];
  for (let k = 1; k <= 4; k++) { const a = (k / 4) * PI / 2; pts.push(new THREE.Vector2(r - s + Math.cos(a) * s, h - s + Math.sin(a) * s)); }
  pts.push(new THREE.Vector2(0, h));
  return new THREE.LatheGeometry(pts, seg).translate(0, y, 0);
}
function dome(r, h, y) {
  const g = new THREE.SphereGeometry(r, 20, 8, 0, PI * 2, 0, PI / 2);
  g.scale(1, h / r, 1);
  return g.translate(0, y, 0);
}
function ball(r, y, x = 0, z = 0) { return new THREE.SphereGeometry(r, 12, 8).translate(x, y, z); }
function ring(R, tube, y) { return new THREE.TorusGeometry(R, tube, 8, 32).rotateX(PI / 2).translate(0, y, 0); }
/* A rounded vault lying along x: the soft gable. */
function vault(w, h, d, y) {
  const g = new THREE.CylinderGeometry(d / 2, d / 2, w, 18, 1, false, 0, PI);
  g.rotateZ(PI / 2);
  g.scale(1, h / (d / 2), 1);
  return g.translate(0, y, 0);
}

/* ---------- composable ornament ---------- */
/* A ring of small standing pills just inside the footprint. */
function pillColumns(n, radius, height, y, r = 0.034) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2 + PI / n;
    parts.push(pill(r, height, y, Math.cos(a) * radius, Math.sin(a) * radius, 8));
  }
  return parts;
}

/* The file type's glyph, made solid: the statue on a landmark's roof. */
const ICON_CACHE = new Map();
function iconGeometry(family, height) {
  const key = family + '|' + height;
  if (ICON_CACHE.has(key)) return ICON_CACHE.get(key);
  let g = null;
  try {
    const d = KEY_GLYPH[family];
    if (d) {
      const parsed = new SVGLoader().parse('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="' + d + '"/></svg>');
      const shapes = [];
      parsed.paths.forEach((pp) => SVGLoader.createShapes(pp).forEach((sh) => shapes.push(sh)));
      if (shapes.length) {
        g = new THREE.ExtrudeGeometry(shapes, { depth: 3.2, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.5, bevelSegments: 2, curveSegments: 6 });
        g.scale(1, -1, 1);                       /* SVG y runs down */
        g.computeBoundingBox();
        const bb = g.boundingBox, h = Math.max(bb.max.y - bb.min.y, 1e-3), k = height / h;
        g.translate(-(bb.max.x + bb.min.x) / 2, -bb.min.y, -(bb.max.z + bb.min.z) / 2);
        g.scale(k, k, k);
      }
    }
  } catch (e) { g = null; }
  ICON_CACHE.set(key, g);
  return g;
}

/* ---------- crowns ---------- */
const CROWNS = {
  none: () => [],
  flat: (y) => [slab(0.9, 0.045, 0.9, y, 0.2, 0.015)],
  dome: (y) => [drum(0.34, 0.06, y, 0.02), dome(0.32, 0.22, y + 0.06)],
  vault: (y) => [slab(0.94, 0.03, 0.94, y, 0.2, 0.01), vault(0.86, 0.16, 0.6, y + 0.03)],
  lantern: (y) => [slab(0.5, 0.04, 0.5, y, 0.14, 0.015), drum(0.16, 0.13, y + 0.04, 0.03), dome(0.17, 0.11, y + 0.17)],
  needle: (y) => [pill(0.05, 0.36, y - 0.02, 0, 0, 10)],
  antenna: (y) => [pill(0.018, 0.25, y - 0.02, 0, 0, 8), ball(0.055, y + 0.27)],         /* the bot's antenna */
  statue: (y, family) => {
    const icon = iconGeometry(family, 0.26);
    return icon ? [slab(0.36, 0.05, 0.36, y, 0.1, 0.015), icon.clone().translate(0, y + 0.05, 0)] : [ball(0.1, y + 0.1)];
  }
};
/* Families with a rounded top take only crowns that stand on a point. */
const ON_A_POINT = { none: 'none', flat: 'none', dome: 'none', vault: 'needle', lantern: 'antenna', needle: 'needle', antenna: 'antenna', statue: 'statue' };

/* ---------- families: the body each kind or file type builds ---------- */
/* Each returns { parts, top, round, pointed, w, d }: where a crown sits, whether ornament goes round
   it, whether the top is rounded, and the size of the body for collars. */
const FAMILIES = {
  /* a web app: the eye pill standing up, 2:5, on a soft plinth */
  tower: () => ({ parts: [slab(0.86, 0.05, 0.86, 0, 0.3, 0.02), pill(0.36, 1.0, 0.05, 0, 0, 22)], top: 1.05, round: true, pointed: true, w: 0.72, d: 0.72 }),
  /* a website: a round hall with a soft edge */
  drum: () => ({ parts: [drum(0.5, 0.05, 0, 0.02), drum(0.45, 0.62, 0.05, 0.09)], top: 0.67, round: true, w: 0.9, d: 0.9 }),
  /* a plugin: a soft block with a cornice */
  monolith: () => ({ parts: [slab(0.9, 0.05, 0.9, 0, 0.2, 0.02), slab(0.76, 0.76, 0.76, 0.05, 0.16, 0.05), slab(0.84, 0.045, 0.84, 0.81, 0.18, 0.015)], top: 0.855, w: 0.76, d: 0.76 }),
  /* a theme: a domed pavilion */
  pavilion: () => ({ parts: [drum(0.5, 0.06, 0, 0.02), drum(0.4, 0.5, 0.06, 0.04), dome(0.41, 0.3, 0.56)], top: 0.86, round: true, pointed: true, w: 0.8, d: 0.8 }),
  /* a game: pills stacked and getting smaller */
  spire: () => ({ parts: [pill(0.34, 0.5, 0, 0, 0, 20), pill(0.23, 0.42, 0.4, 0, 0, 18), pill(0.12, 0.36, 0.75, 0, 0, 14)], top: 1.11, round: true, pointed: true, w: 0.68, d: 0.68 }),
  /* a mobile app: a slim slab standing up, like a phone */
  stele: () => ({ parts: [slab(0.52, 0.05, 0.52, 0, 0.14, 0.02), slab(0.36, 0.92, 0.16, 0.05, 0.075, 0.03)], top: 0.97, w: 0.36, d: 0.16 }),
  /* a library: a hall behind a row of pill columns */
  hall: () => {
    const parts = [slab(0.96, 0.05, 0.96, 0, 0.2, 0.02), slab(0.84, 0.58, 0.56, 0.05, 0.12, 0.04, 0, -0.12)];
    for (let i = 0; i < 4; i++) parts.push(pill(0.04, 0.56, 0.05, -0.3 + i * 0.2, 0.3, 8));
    parts.push(slab(0.94, 0.05, 0.9, 0.62, 0.2, 0.02));
    return { parts, top: 0.67, w: 0.84, d: 0.84 };
  },
  /* scripts: a workshop with two stacks */
  works: () => ({ parts: [slab(0.86, 0.05, 0.86, 0, 0.2, 0.02), slab(0.72, 0.48, 0.6, 0.05, 0.14, 0.05), pill(0.09, 0.42, 0.45, -0.17, -0.1, 12), pill(0.07, 0.3, 0.45, 0.16, -0.1, 12)], top: 0.53, w: 0.72, d: 0.6 }),
  /* documents: a house under a soft vault */
  house: () => ({ parts: [slab(0.9, 0.05, 0.9, 0, 0.2, 0.02), slab(0.74, 0.5, 0.74, 0.05, 0.12, 0.04), vault(0.8, 0.28, 0.8, 0.55)], top: 0.83, round: true, pointed: true, w: 0.74, d: 0.74 }),
  /* a template: a silo with a dome */
  silo: () => ({ parts: [drum(0.47, 0.05, 0, 0.02), drum(0.38, 0.78, 0.05, 0.03), dome(0.38, 0.22, 0.83)], top: 1.05, round: true, pointed: true, w: 0.76, d: 0.76 })
};

const FAMILY_BY_EXT = {
  php: 'monolith', inc: 'monolith', phtml: 'monolith', java: 'monolith', kt: 'monolith', cs: 'monolith', swift: 'monolith',
  js: 'tower', mjs: 'tower', cjs: 'tower', jsx: 'tower', ts: 'tower', tsx: 'tower', vue: 'tower', svelte: 'tower',
  css: 'hall', scss: 'hall', sass: 'hall', less: 'hall',
  html: 'house', htm: 'house', twig: 'house', xhtml: 'house', astro: 'house',
  json: 'silo', xml: 'silo', yml: 'silo', yaml: 'silo', csv: 'silo', ini: 'silo', lock: 'silo', toml: 'silo', env: 'silo',
  md: 'stele', mdx: 'stele', txt: 'stele', po: 'stele', pot: 'stele', mo: 'stele', rst: 'stele',
  png: 'pavilion', jpg: 'pavilion', jpeg: 'pavilion', gif: 'pavilion', svg: 'pavilion', webp: 'pavilion', ico: 'pavilion',
  woff: 'spire', woff2: 'spire', ttf: 'spire', eot: 'spire', otf: 'spire',
  sh: 'works', py: 'works', rb: 'works', go: 'works', rs: 'works', sql: 'works', bat: 'works', ps1: 'works', c: 'works', h: 'works',
  mp4: 'drum', webm: 'drum', mp3: 'drum', wav: 'drum', vtt: 'drum', srt: 'drum', zip: 'drum', pdf: 'drum'
};

export function extOf(path) {
  const b = path.slice(path.lastIndexOf('/') + 1);
  const i = b.lastIndexOf('.');
  return i > 0 ? b.slice(i + 1).toLowerCase() : '';
}
export function familyFor(path) { return FAMILY_BY_EXT[extOf(path)] || 'hall'; }

/* ---------- assembling a variant ---------- */
function buildVariant(family, tier, crownName) {
  const f = (FAMILIES[family] || FAMILIES.hall)();
  const parts = f.parts.slice();
  const top = f.top;
  if (tier >= 1) parts.push(slab(1.0, 0.035, 1.0, 0, 0.28, 0.012));                     /* a plinth */
  if (tier >= 2) {                                                                        /* a collar */
    if (f.round) parts.push(ring(Math.max(f.w, f.d) * 0.5 + 0.015, 0.022, top * 0.5));
    else parts.push(slab(f.w + 0.06, 0.035, f.d + 0.06, top * 0.52, 0.16, 0.012));
  }
  if (tier >= 3) parts.push(...pillColumns(f.round ? 6 : 8, 0.465, top * 0.62, 0.035));   /* pill columns */
  const crown = f.pointed ? (ON_A_POINT[crownName] || 'none') : crownName;
  parts.push(...(CROWNS[crown] || CROWNS.none)(f.pointed ? top - 0.03 : top, family));

  /* ExtrudeGeometry is non-indexed and the rest are indexed; merging needs one or the other. */
  const prepared = parts.filter(Boolean).map((x) => {
    const g = x.index ? x.toNonIndexed() : x;
    if (g.getAttribute('uv')) g.deleteAttribute('uv');
    return g;
  });
  const g = mergeGeometries(prepared, false);
  if (!g) return slab(1, 1, 1, 0, 0.2, 0.05);

  /* into the contract: footprint +-0.5, base 0, top 1 */
  g.computeBoundingBox();
  const bb = g.boundingBox;
  g.translate(-(bb.max.x + bb.min.x) / 2, -bb.min.y, -(bb.max.z + bb.min.z) / 2);
  g.scale(1 / Math.max(bb.max.x - bb.min.x, 1e-3), 1 / Math.max(bb.max.y - bb.min.y, 1e-3), 1 / Math.max(bb.max.z - bb.min.z, 1e-3));
  g.computeVertexNormals();
  return g;
}

const VARIANTS = new Map();
export function variantGeometry(key) {
  if (!VARIANTS.has(key)) {
    const bits = key.split(':');
    VARIANTS.set(key, buildVariant(bits[0], +bits[1], bits[2]));
  }
  return VARIANTS.get(key);
}

/* Which variant a file becomes. `pct` is its size percentile inside its own
   group, so ornament follows importance rather than raw bytes. */
export function variantFor(path, pct, isLandmark, sig, depth) {
  const family = familyFor(path);
  let tier = pct > 0.93 ? 3 : pct > 0.72 ? 2 : pct > 0.38 ? 1 : 0;
  if (isLandmark) tier = 3;
  if (sig && sig.files <= 6) tier = Math.max(tier, 2);        /* a project with almost nothing in it makes a monument of what it has */
  if (depth >= 4) tier = Math.min(tier, 1);                   /* files buried deep stay plain */

  const base = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  let crown = 'flat';
  if (isLandmark) crown = family === 'pavilion' ? 'dome' : family === 'tower' ? 'antenna' : 'statue';
  else if (/^(index|main|readme|license|plugin|functions|style|app|bootstrap)\b/.test(base)) crown = 'statue';
  else if (tier === 3) crown = family === 'house' ? 'vault' : 'lantern';
  else if (tier === 2) crown = (family === 'silo' || family === 'pavilion') ? 'dome' : 'vault';
  else if (tier === 1) crown = (family === 'spire' || family === 'tower') ? 'needle' : 'flat';
  return family + ':' + tier + ':' + crown;
}

/* ---------- tones: which paper tone a file's building takes (0, 1 or 2) ---------- */
const FAMILY_TONE = { monolith: 1, tower: 0, hall: 2, house: 0, silo: 1, stele: 2, pavilion: 0, spire: 1, works: 2, drum: 1 };
export function fileTone(path) { const t = FAMILY_TONE[familyFor(path)]; return t == null ? 1 : t; }

export const KEY = [
  { arch: 'monolith', label: 'PHP and other server code' }, { arch: 'tower', label: 'JavaScript and TypeScript' },
  { arch: 'hall', label: 'CSS' }, { arch: 'house', label: 'HTML' },
  { arch: 'silo', label: 'Data and settings' }, { arch: 'stele', label: 'Docs and text' },
  { arch: 'pavilion', label: 'Pictures' }, { arch: 'spire', label: 'Fonts' },
  { arch: 'works', label: 'Scripts' }, { arch: 'drum', label: 'Media and downloads' }
];

/* The same forms as flat glyphs (24 x 24), for the key and for the statues on landmarks. */
export const KEY_GLYPH = {
  monolith: 'M5 21h14a1.5 1.5 0 0 0 1.5-1.5V19h-17v.5A1.5 1.5 0 0 0 5 21ZM6.5 18h11V6a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2Z',
  tower: 'M12 2.5a4 4 0 0 1 4 4v11a4 4 0 0 1-8 0v-11a4 4 0 0 1 4-4Z',
  hall: 'M4 21.5h16a1 1 0 0 0 1-1v-1H3v1a1 1 0 0 0 1 1ZM6 17.5a1 1 0 0 0 2 0V11a1 1 0 0 0-2 0ZM11 17.5a1 1 0 0 0 2 0V11a1 1 0 0 0-2 0ZM16 17.5a1 1 0 0 0 2 0V11a1 1 0 0 0-2 0ZM4 9.5h16a1.5 1.5 0 0 0 0-3H4a1.5 1.5 0 0 0 0 3Z',
  house: 'M6 21h12a1 1 0 0 0 1-1v-8.5H5V20a1 1 0 0 0 1 1ZM4 10.5h16a8 6.5 0 0 0-16 0Z',
  silo: 'M6.5 21h11a1 1 0 0 0 1-1V10h-13v10a1 1 0 0 0 1 1ZM5.5 9h13a6.5 5.5 0 0 0-13 0Z',
  stele: 'M9.5 21.5h5a1.5 1.5 0 0 0 1.5-1.5V4a1.5 1.5 0 0 0-1.5-1.5h-5A1.5 1.5 0 0 0 8 4v16a1.5 1.5 0 0 0 1.5 1.5Z',
  pavilion: 'M5 21h14a1 1 0 0 0 1-1v-6H4v6a1 1 0 0 0 1 1ZM4 13h16a8 8 0 0 0-16 0Z',
  spire: 'M7.5 21.5h9a2 2 0 0 0 0-4h-9a2 2 0 0 0 0 4ZM9 16h6a1.75 1.75 0 0 0 0-3.5H9A1.75 1.75 0 0 0 9 16ZM12 2.5a2 2 0 0 0-2 2V9a2 2 0 0 0 4 0V4.5a2 2 0 0 0-2-2Z',
  works: 'M5 21h14a1 1 0 0 0 1-1v-7.5H4V20a1 1 0 0 0 1 1ZM7 11.5h3V5a1.5 1.5 0 0 0-3 0ZM14 11.5h3V7.5a1.5 1.5 0 0 0-3 0Z',
  drum: 'M4 18.5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V8.5H4ZM4 8c0-1.4 3.6-2.5 8-2.5s8 1.1 8 2.5-3.6 2.5-8 2.5S4 9.4 4 8Z'
};

/* ===================================================================
   SIGNATURE: every project builds a little differently, from its own files.
   =================================================================== */
function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function signatureOf(name, files) {
  const n = files.length || 1;
  let sumDepth = 0, maxDepth = 0;
  const sizes = [];
  const counts = {};
  files.forEach((f) => {
    const d = (f.p.match(/\//g) || []).length;
    sumDepth += d; if (d > maxDepth) maxDepth = d;
    sizes.push(Math.max(1, f.s || 1));
    const a = familyFor(f.p);
    counts[a] = (counts[a] || 0) + 1;
  });
  sizes.sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)] || 1;
  const biggest = sizes[sizes.length - 1] || 1;

  const avgDepth = sumDepth / n;
  const skew = Math.log10(1 + biggest / median);
  const variety = Object.keys(counts).length;
  let dominant = 'hall', best = 0;
  Object.keys(counts).forEach((k) => { if (counts[k] > best) { best = counts[k]; dominant = k; } });

  const seed = hash32(name);
  const r1 = ((seed >>> 3) % 1000) / 1000;
  const r2 = ((seed >>> 13) % 1000) / 1000;

  return {
    avgDepth, maxDepth, skew, variety, dominant, seed, files: n,
    verticality: clamp(0.55 + avgDepth * 0.16 + skew * 0.18, 0.55, 1.9),
    slender: clamp(0.94 - avgDepth * 0.055, 0.52, 0.94),
    twist: clamp((variety - 3) * 0.055 + r1 * 0.10, 0, 0.32) * (r2 > 0.5 ? 1 : -1),
    shade: (r1 - 0.5) * 0.06
  };
}
