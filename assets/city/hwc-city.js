/* ==========================================================================
   HelloWorld hub: the City (#/city).
   An ES module that hwc-ui.js loads only when someone opens the City, so the rest of the hub never
   downloads three.js. A calm architectural model on a paper table, with a grammar that needs no
   code knowledge:

     the table        everything HelloWorld builds
     a district       one category: a low rounded plot, like a card, with the category's icon on
                      a plinth in its square. Districts are told apart by place and name, never
                      by colour
     a block          one project. Its MAIN BUILDING's form is the kind of project (pill towers
                      are web apps, round halls are websites); around it stand its files:
                        code and docs   smaller buildings (form = file type)
                        font files      columns carved in that font
                        SVG files       statues on plinths, its hub/icon.svg the largest
                        pictures        carved into standing stones
                        tests           a hedged garden, a model tree for each test
                        its cover       a billboard
     the roof         two small violet eyes: live; a lilac ring: in progress (paler for an
                      experiment); a small lock: private
     a play sign      a demo: point at the building and a preview of its picture rises
     flags            tools it is built with that other projects use too
     a crane          work in progress;  ruins: a retired project; grey and lower: paused
     the bot's trail  the HelloWorld line: the bot swims from district to district, idea to live,
                      in the order of the stages, in jellyfish strokes, leaving a light trail that
                      fades behind him
     small islands    the live sites, one per address, with a beacon; a ferry for every project
                      that runs there
     people           changes made in the last 30 days, round their block
     birds            open issues and pull requests, round their building
     a cloud          a project nobody has changed for over a year
     a tree by a door the project has step-by-step guides

   Nothing is decoration, apart from the brand's own marks lying on the table (the bot's faint
   shadow and two eye pills at the rim). Violet means live, selected or now, and nothing else.
   Colour reaches this module only through the palette handler, light or dark; it never reads CSS,
   page globals or the sign-in token. It talks to hwc-ui.js only through the handlers given to
   mountCity() and the methods below.
   ========================================================================== */
import * as THREE from '../vendor/three/three.module.min.js';
import { OrbitControls } from '../vendor/three/addons/controls/OrbitControls.js';
import { PointerLockControls } from '../vendor/three/addons/controls/PointerLockControls.js';
import { CSS2DRenderer, CSS2DObject } from '../vendor/three/addons/renderers/CSS2DRenderer.js';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';
import { SVGLoader } from '../vendor/three/addons/loaders/SVGLoader.js';
import { variantGeometry, variantFor, fileTone, familyFor, extOf, signatureOf, KEY, KEY_GLYPH } from './city-architecture.js?v=1';
import { layoutPoly, plotToSite, blobPolygon, polyCentroid, inradiusAt, polyArea, seedPlan, roundPoly } from './city-plan.js?v=1';
import * as P from './city-props.js?v=2';
import { helloworld } from '../mascot/characters/helloworld.js';

export { KEY, KEY_GLYPH };

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
const MAX_H = 26;
const WALK_EYE = 2.0;
const SLAB = 0.5;                  /* a district's plot, edge to top */
const BASE = 0.58;                 /* where buildings stand: on the plot and its lot */
const YAXIS = new THREE.Vector3(0, 1, 0);
/* The standard view: a calm three-quarter view from the south-west, about 32 degrees up. */
const VIEW_DIR = new THREE.Vector3(-0.486, 0.53, 0.695).normalize();
const FACE = Math.atan2(VIEW_DIR.x, VIEW_DIR.z);                    /* statues and boards turn to face it */
const DOWN_DIR = new THREE.Vector3(VIEW_DIR.x * 0.42, 0.9, VIEW_DIR.z * 0.42).normalize();   /* steeper, to see into a garden past tall neighbours */
const RIGHT = new THREE.Vector3(VIEW_DIR.z, 0, -VIEW_DIR.x).normalize();   /* the screen's right, on the table */
const FAR = new THREE.Vector3(-VIEW_DIR.x, 0, -VIEW_DIR.z).normalize();    /* the screen's top, on the table */
const POINTED = { tower: 1, pavilion: 1, spire: 1, house: 1, silo: 1 };
const clamp = THREE.MathUtils.clamp;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const settle = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3.2);                       /* the brand's settle: fast out, long soft landing */
const backOut = (t, s = 1.4) => { t = clamp(t, 0, 1) - 1; return 1 + (s + 1) * t * t * t + s * t * t; };   /* the brand's "alive" ease, a little overshoot */
/* The jellyfish pulse, as an ease: a small gather back, one push that carries a little past, then a
   long settle. The same curve moves the camera and the bot. */
export function pulse(t, a = 0.02) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const g = 0.12, p = 0.6;
  if (t < g) return -a * (1 - Math.cos((t / g) * Math.PI / 2));
  if (t < g + p) { const k = (t - g) / p; return -a + (1 + 2 * a) * (1 - Math.pow(1 - k, 3)); }
  const k = (t - g - p) / (1 - g - p);
  return 1 + a - a * (0.5 - 0.5 * Math.cos(k * Math.PI));
}

/* What each form of main building is (the form comes from kind_details in the config). */
export const FORM = {
  tower:    { tier: [1, 3], crown: ['none', 'antenna'], h: [13, 26], plot: 5, foot: 11, label: 'Pill towers' },
  drum:     { tier: [0, 2], crown: ['none', 'lantern'], h: [6, 10], plot: 4, foot: 12, label: 'Round halls' },
  monolith: { tier: [0, 3], crown: ['flat', 'flat', 'vault', 'lantern'], h: [6, 18], plot: 3, foot: 10, label: 'Soft blocks' },
  pavilion: { tier: [1, 1], crown: ['none'], h: [7, 11], plot: 3, foot: 11, label: 'Domed pavilions' },
  spire:    { tier: [0, 2], crown: ['none', 'needle'], h: [9, 16], plot: 3, foot: 9, label: 'Stacked pills' },
  stele:    { tier: [0, 1], crown: ['none'], h: [6, 11], plot: 2, foot: 8, label: 'Slim slabs' },
  hall:     { tier: [1, 3], crown: ['flat', 'dome'], h: [6, 11], plot: 3, foot: 11, label: 'Columned halls' },
  works:    { tier: [0, 1], crown: ['none'], h: [4, 8], plot: 1.5, foot: 7, label: 'Workshops' },
  house:    { tier: [0, 1], crown: ['none'], h: [4, 7], plot: 1.2, foot: 6.5, label: 'Houses' },
  silo:     { tier: [0, 1], crown: ['none'], h: [6, 10], plot: 2.5, foot: 8, label: 'Silos' }
};

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
const unit = (str, salt) => (hash32(str + '|' + salt) % 10000) / 10000;

export function fmtBytes(n) {
  if (!n) return 'empty';
  if (n < 1024) return n + ' bytes';
  if (n < 1048576) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}
const FAMILY_LABEL = {}; KEY.forEach((k) => { FAMILY_LABEL[k.arch] = k.label; });
export function fileTypeLabel(path) {
  const fam = familyFor(path);
  if (fam === 'hall' && !/^(css|scss|sass|less)$/.test(extOf(path))) return 'Other';   /* unknown types are drawn as halls */
  return FAMILY_LABEL[fam] || 'Other';
}

/* File kinds that become props rather than buildings. */
const IS_FONT = /\.(woff2?|ttf|otf)$/i, IS_SVG = /\.svg$/i, IS_IMG = /\.(png|jpe?g|gif|webp)$/i;
const IS_TEST = /(^|\/)(tests?|spec|__tests__)\//i;
const IS_VENDOR = /(^|\/)(node_modules|vendor|dist|build|\.git|\.github)\//i;
const IS_JUNK = /(^|\/)(license|licence|license\.md|license\.txt|\.gitignore|\.gitattributes|\.editorconfig|package-lock\.json|composer\.lock|yarn\.lock|pnpm-lock\.yaml)$|\.min\.(js|css)$|\.map$/i;
/* A font file's name as people would say it, and how to draw with it. */
function fontInfo(path) {
  const base = path.split('/').pop().replace(/\.(woff2?|ttf|otf)$/i, '');
  const stem = base.split(/[-_]/)[0].toLowerCase();
  const title = base.replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b(latin|normal|ext)\b/gi, '').replace(/\s+/g, ' ').trim();
  const num = /(^|[-_ ])([1-9]00)([-_ ]|$)/.exec(base);
  const weight = num ? +num[2] : /black|heavy/i.test(base) ? 900 : /bold/i.test(base) ? 700 : /light/i.test(base) ? 300 : 400;
  const italic = /italic|oblique/i.test(base);
  return { stem, title: (title.charAt(0).toUpperCase() + title.slice(1)) || base, weight, italic };
}

/* A file list ({p: path, s: size, h: sha}) as a folder tree. */
function toTree(files) {
  const root = { dirs: new Map(), files: [], value: 0, count: 0 };
  files.forEach((f) => {
    const parts = f.p.split('/');
    const v = Math.max(120, f.s || 120);
    let node = root;
    node.value += v; node.count++;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node.dirs.has(parts[i])) node.dirs.set(parts[i], { dirs: new Map(), files: [], value: 0, count: 0, name: parts[i] });
      node = node.dirs.get(parts[i]);
      node.value += v; node.count++;
    }
    node.files.push({ path: f.p, name: parts[parts.length - 1], size: f.s || 0, sha: f.h, value: v });
  });
  return root;
}
function descend(node, path) {
  let n = node;
  for (const p of path.split('/')) { if (!n || !n.dirs.has(p)) return null; n = n.dirs.get(p); }
  return n;
}
function inPoly(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
/* A flat 2:5 capsule (the eye pill) lying on the table; `line` > 0 makes it an outline that wide. */
function pillShape(w, h, line) {
  const r = w / 2, s = new THREE.Shape();
  s.absarc(0, h / 2 - r, r, 0, Math.PI, false); s.absarc(0, -h / 2 + r, r, Math.PI, Math.PI * 2, false); s.closePath();
  if (line > 0) {
    const ri = r - line, hole = new THREE.Path();
    hole.absarc(0, h / 2 - r, ri, 0, Math.PI, false); hole.absarc(0, -h / 2 + r, ri, Math.PI, Math.PI * 2, false); hole.closePath();
    s.holes.push(hole);
  }
  return s;
}
/* The bot's outline, filled: his shadow, from the mascot's own drawing. */
function ghostGeometry() {
  try {
    const d = helloworld.head.paths[0].d, outer = d.split(/Z(?=\s*M)/i)[0] + 'Z';
    const data = new SVGLoader().parse('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 306 306"><path d="' + outer + '"/></svg>');
    const shapes = [];
    data.paths.forEach((p) => SVGLoader.createShapes(p).forEach((s) => shapes.push(s)));
    if (!shapes.length) return null;
    const g = new THREE.ShapeGeometry(shapes, 10);
    g.translate(-153, -153 + 13.2, 0);
    g.scale(1 / 306, -1 / 306, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  } catch (e) { return null; }
}

/* One material for every building. Floor lines are drawn in the shader from the building's real
   height. `aLit` turns the cap Signal Violet (1, hover) and tints the body too (2, selected); the
   change eases over about 0.6 s on the CPU side. No emission, no glow: matte paper. */
function towerMaterial(uniforms) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAccent = uniforms.uAccent;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aLit; attribute float aH; attribute float aSeed;
        varying float vLit; varying float vH; varying float vSeed;
        varying vec3 vLocal; varying vec3 vObjN;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLit = aLit; vH = aH; vSeed = aSeed; vLocal = position; vObjN = normal;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uAccent;
        varying float vLit; varying float vH; varying float vSeed;
        varying vec3 vLocal; varying vec3 vObjN;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float rows = max(2.0, floor(vH / 2.8));
        float band = fract(vLocal.y * rows + vSeed * 0.37);
        float floorLine = (1.0 - smoothstep(0.0, 0.07, band)) * (1.0 - step(0.5, abs(vObjN.y))) * step(0.06, vLocal.y);
        diffuseColor.rgb *= 1.0 - 0.035 * floorLine;
        diffuseColor.rgb *= mix(0.93, 1.0, clamp(vLocal.y * 3.0, 0.0, 1.0));
        float cap = smoothstep(0.74, 0.8, vLocal.y);
        float tint = max(clamp(vLit, 0.0, 1.0) * cap, clamp(vLit - 1.0, 0.0, 1.0) * 0.55);
        diffuseColor.rgb = mix(diffuseColor.rgb, uAccent, tint);`);
  };
  mat.customProgramCacheKey = () => 'hwc-tower';
  return mat;
}

/* The palette, as colours and numbers, so it can be eased from one theme to the other. */
const FACADE_FB = ['#f2a9b8', '#f6be94', '#f0d27e', '#9fd8b4', '#95c9ec', '#aab6f2', '#c6b0f2', '#ef9f8e', '#b7d2a0', '#8fd2ca'];
/* A project's own colour: the same in every view, picked from its name. */
const facadeOf = (key) => hash32(String(key) + '|facade') % FACADE_FB.length;
const C = (v, fb) => new THREE.Color(typeof v === 'string' || typeof v === 'number' ? v : fb);
const N = (v, fb) => (typeof v === 'number' && isFinite(v) ? v : fb);
function readPalette(p) {
  p = p || {};
  const t = p.tones || {}, out = { dark: !!p.dark, tones: {} };
  const fb = { body: '#ffffff', body2: '#efedf5', body3: '#e3e0ec', card: '#ffffff', edge: '#e2e0e8', lot: '#faf9fd', statue: '#cfcadb', ink: '#262430',
    accent: '#6d44e0', accentSoft: '#a98bff', accentFaint: '#d9cffb', lawn: '#f1eff7', tree: '#dedbe8', dim: '#e3e0ec', frame: '#ffffff', stone: '#ffffff' };
  P.TONES.forEach((n) => { out.tones[n] = C(t[n], fb[n]); });
  const pair = (a, c, i) => ({ color: C(a && a[0], c), i: N(a && a[1], i) });
  out.key = pair(p.key, '#ffffff', 1.25);
  out.fill = pair(p.fill, '#6d44e0', 0);
  out.hemi = { sky: C(p.hemi && p.hemi[0], '#ffffff'), ground: C(p.hemi && p.hemi[1], '#dcd9e4'), i: N(p.hemi && p.hemi[2], 2.3) };
  out.shadow = pair(p.shadow, '#262430', 0.14);
  out.ghost = pair(p.ghost, '#262430', 0.05);
  out.pillFill = pair(p.pillFill, '#6d44e0', 0.11);
  out.pillLine = pair(p.pillLine, '#6d44e0', 0.22);
  out.link = pair(p.link, '#262430', 0.16);
  out.route = pair(p.route, '#6d44e0', 0.85);
  out.flags = (Array.isArray(p.flags) && p.flags.length ? p.flags : ['#262430', '#6b6880', '#a19fb0', '#cfcbdc']).map((c) => C(c, '#6b6880'));
  /* the buildings' own colours (Bryan, 2026-11-26: "colourful and diverse"): soft tones from the
     brand's confetti, one per project, its files in lighter shades of it */
  out.facades = (Array.isArray(p.facades) && p.facades.length ? p.facades : FACADE_FB).map((c) => C(c, '#ffffff'));
  return out;
}
function lerpPalette(a, b, k) {
  const out = { dark: k < 0.5 ? a.dark : b.dark, tones: {} };
  P.TONES.forEach((n) => { out.tones[n] = a.tones[n].clone().lerp(b.tones[n], k); });
  ['key', 'fill', 'shadow', 'ghost', 'pillFill', 'pillLine', 'link', 'route'].forEach((x) => { out[x] = { color: a[x].color.clone().lerp(b[x].color, k), i: a[x].i + (b[x].i - a[x].i) * k }; });
  out.hemi = { sky: a.hemi.sky.clone().lerp(b.hemi.sky, k), ground: a.hemi.ground.clone().lerp(b.hemi.ground, k), i: a.hemi.i + (b.hemi.i - a.hemi.i) * k };
  out.flags = b.flags.map((c, i) => (a.flags[i] ? a.flags[i].clone().lerp(c, k) : c.clone()));
  out.facades = b.facades.map((c, i) => (a.facades[i] ? a.facades[i].clone().lerp(c, k) : c.clone()));
  return out;
}

export class City {
  constructor(host, handlers = {}) {
    this.host = host;
    this.h = Object.assign({
      palette() { return {}; }, botSize() { return 48; },
      onSelect() {}, onLevel() {}, onWalk() {}, onOpen() {}, onOpenSite() {}, onTour() {}, onAnchor() {},
      fetchBlob() { return Promise.resolve(null); }, loadImage() { return Promise.resolve(null); }, preview() { return Promise.resolve(null); }
    }, handlers);
    this.items = []; this.hoods = []; this.platforms = []; this.sites = [];
    this.files = new Map(); this.roots = new Map(); this.sigs = new Map(); this.names = new Map();
    this.level = { kind: 'estate' };
    this.districts = []; this.towers = []; this.batches = new Map(); this.labels = [];
    this.pickables = []; this.anims = []; this.swings = []; this.later = []; this.movers = []; this.painters = []; this.roofs = [];
    this.filter = null; this._filterSig = null;
    this.selected = null; this.hoodSel = null; this.hover = null; this.focusAt = null;
    this.linksOn = false; this.walking = false; this.interactive = true;
    this.running = false; this.userMoved = false; this.flight = null;
    this.pointer = new THREE.Vector2(-10, -10); this.hasPointer = false;
    this.plate = 160; this.frame = 0; this.gen = 0;
    this.jobs = []; this.active = 0; this.fontFaces = new Map(); this.fontBytes = 0;
    this.uniforms = { uTime: { value: 0 }, uAccent: { value: new THREE.Color(0x6d44e0) }, uTones: { value: P.TONES.map(() => new THREE.Color(1, 1, 1)) } };
    this.P = readPalette(this.h.palette());
    this._initScene();
    this._paint();
    this._bind();
  }

  /* ================= scene ================= */
  _initScene() {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    r.setClearColor(0x000000, 0);          /* the sky is the page: paper and the violet corner light, or void */
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NoToneMapping;
    r.domElement.className = 'hwc-gl';
    r.domElement.setAttribute('aria-hidden', 'true');      /* the Projects list is the accessible way in */
    this.host.appendChild(r.domElement);
    this.renderer = r;

    const l = new CSS2DRenderer();
    l.domElement.className = 'hwc-labels';
    l.domElement.setAttribute('aria-hidden', 'true');
    this.host.appendChild(l.domElement);
    this.labelRenderer = l;

    this.tip = document.createElement('div');
    this.tip.className = 'hwc-tip';
    this.tip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.tip);
    this.hint = document.createElement('div');
    this.hint.className = 'hwc-hint';
    this.hint.textContent = 'To zoom, hold Ctrl and scroll, pinch, or use the + and − buttons.';
    this.host.appendChild(this.hint);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 1, 8000);     /* a narrow lens, so it reads as a model */
    this.camera.position.copy(VIEW_DIR).multiplyScalar(500);
    const c = new OrbitControls(this.camera, r.domElement);
    c.enableDamping = true; c.dampingFactor = 0.055;            /* drags coast and settle */
    c.rotateSpeed = 0.5; c.zoomSpeed = 0.8; c.panSpeed = 0.7;
    c.screenSpacePanning = false;
    c.minDistance = 8; c.maxDistance = 1600;
    c.minPolarAngle = 0.2; c.maxPolarAngle = Math.PI / 2 - 0.12;
    c.target.set(0, 4, 0);
    c.addEventListener('start', () => { this.userMoved = true; this.flight = null; if (this.tour && !this.tour.paused) this.pauseTour(true); });
    this.controls = c;

    /* one soft key light from the top-right (the brand's light corner), a paper hemisphere fill,
       and in dark a faint violet fill from the same corner */
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0008; key.shadow.normalBias = 0.35;
    key.shadow.intensity = 0.62;
    this.scene.add(key, key.target);
    this.key = key;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xdcd9e4, 2.3);
    this.scene.add(this.hemi);
    this.fill = new THREE.DirectionalLight(0x6d44e0, 0);
    this.scene.add(this.fill);

    /* the table: only its shadows are drawn, so it is exactly the page's own ground */
    this.shadowMat = new THREE.ShadowMaterial({ color: 0x262430, opacity: 0.14 });
    const table = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), this.shadowMat);
    table.rotation.x = -Math.PI / 2; table.receiveShadow = true;
    this.scene.add(table);

    this.rig = new THREE.Group();
    this.scene.add(this.rig);
    this.props = new THREE.Group();
    this.rig.add(this.props);

    /* the brand's marks lying on the table: the bot's faint shadow, and two eye pills at the rim */
    const flat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    const gg = ghostGeometry();
    this.ghostMat = flat(0x262430, 0.05);
    this.ghost = gg ? new THREE.Mesh(gg, this.ghostMat) : new THREE.Group();
    this.ghost.position.y = 0.02;
    this.scene.add(this.ghost);
    this.pillFillMat = flat(0x6d44e0, 0.11);
    this.pillLineMat = flat(0x6d44e0, 0.22);
    this.pillA = new THREE.Mesh(new THREE.ShapeGeometry(pillShape(0.4, 1, 0), 24).rotateX(-Math.PI / 2), this.pillFillMat);
    this.pillB = new THREE.Mesh(new THREE.ShapeGeometry(pillShape(0.4, 1, 0.035), 24).rotateX(-Math.PI / 2), this.pillLineMat);
    this.pillA.position.y = this.pillB.position.y = 0.03;
    this.scene.add(this.pillA, this.pillB);

    /* the selection: one thin violet ring and one dashed ring round it (the films' orbit rings) */
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0x6d44e0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.035, 96), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.rig.add(this.ring);
    const dash = [];
    for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; dash.push(new THREE.Vector3(Math.cos(a) * 1.22, 0, Math.sin(a) * 1.22)); }
    this.dashMat = new THREE.LineDashedMaterial({ color: 0x6d44e0, dashSize: 0.05, gapSize: 0.045, transparent: true, opacity: 0 });
    this.dashRing = new THREE.Line(new THREE.BufferGeometry().setFromPoints(dash), this.dashMat);
    this.dashRing.computeLineDistances();
    this.rig.add(this.dashRing);
    this.ringA = 0; this.ringTarget = 0;

    this.towerMat = towerMaterial(this.uniforms);
    this.propMat = P.propMaterial(this.uniforms); this.propMat.userData.keep = true;
    this.propMat2 = P.propMaterial(this.uniforms, { side: THREE.DoubleSide }); this.propMat2.userData.keep = true;
    this.treeGeo = P.treeGeometry(); this.treeGeo.userData.keep = true;
    this.plinthGeo = P.plinthGeometry(); this.plinthGeo.userData.keep = true;
    this.eyesGeo = P.liveEyesGeometry(); this.eyesGeo.userData.keep = true;
    this.lockGeo = P.lockGeometry(); this.lockGeo.userData.keep = true;
    this.roofRingGeo = P.roofRingGeometry(); this.roofRingGeo.userData.keep = true;
    const cp = P.columnParts(); this.colRest = cp.rest; this.colShaft = cp.shaft; cp.rest.userData.keep = cp.shaft.userData.keep = true;
    /* single-colour materials that follow the palette */
    this.statueMat = this._toneMat('statue', { roughness: 0.82, side: THREE.DoubleSide }, true);
    this.accentMat = this._toneMat('accent', {}, true);
    this.softMat = this._toneMat('accentSoft', {}, true);
    this.faintMat = this._toneMat('accentFaint', {}, true);
    this.stoneMat = this._toneMat('body2', {}, true);
    this.edgeMat = new THREE.LineBasicMaterial({ color: 0xe2e0e8 });
    this.linkMat = new THREE.LineBasicMaterial({ color: 0x262430, transparent: true, opacity: 0.16, depthWrite: false });
    this.linkSelMat = new THREE.LineBasicMaterial({ color: 0x6d44e0, transparent: true, opacity: 0.85, depthWrite: false });
    this.routeMat = new THREE.LineDashedMaterial({ color: 0x6d44e0, dashSize: 1.4, gapSize: 1.0, transparent: true, opacity: 0.85 });
    this.raycaster = new THREE.Raycaster();

    /* the preview that rises over a demo building: its own picture, never the demo itself */
    const he = document.createElement('div');
    he.className = 'hwc-preview';
    he.innerHTML = '<div class="hwc-preview-in"><div class="hwc-preview-pic"></div><div class="hwc-preview-cap"></div></div>';
    this.prevObj = new CSS2DObject(he);
    this.prevObj.visible = false;
    this.scene.add(this.prevObj);
    this.prev = { el: he, pic: he.querySelector('.hwc-preview-pic'), cap: he.querySelector('.hwc-preview-cap'), t: null, a: 0, cache: new Map() };
    this._av = new THREE.Vector3();
    this._resize();
  }

  /* A material whose colour is one palette tone; `keep` survives rebuilds. */
  _toneMat(tone, opts, keep) {
    const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, opts || {}));
    m.userData.keep = !!keep;
    this._onPaint((Pl) => { m.color.copy(Pl.tones[tone]); }, keep);
    return m;
  }
  /* Register something to repaint when the palette changes. Kept painters live for the session;
     the others go with the level they were built for. */
  _onPaint(fn, keep) { this.painters.push({ fn, keep: !!keep, gen: this.gen }); if (this.P) fn(this.P); }

  /* ================= colour ================= */
  setPalette(raw) {
    const to = readPalette(raw);
    if (REDUCED.matches || !this.running) { this.fade = null; this.P = to; this._paint(); return; }
    this.fade = { from: this.P, to, t0: performance.now() };      /* the world cross-fades with the page, 0.25 s */
  }
  _paint() {
    const Pl = this.P;
    P.TONES.forEach((n, i) => this.uniforms.uTones.value[i].copy(Pl.tones[n]));
    this.uniforms.uAccent.value.copy(Pl.tones.accent);
    this.key.color.copy(Pl.key.color); this.key.intensity = Pl.key.i;
    this.fill.color.copy(Pl.fill.color); this.fill.intensity = Pl.fill.i;
    this.hemi.color.copy(Pl.hemi.sky); this.hemi.groundColor.copy(Pl.hemi.ground); this.hemi.intensity = Pl.hemi.i;
    this.shadowMat.color.copy(Pl.shadow.color); this.shadowMat.opacity = Pl.shadow.i;
    this.ghostMat.color.copy(Pl.ghost.color); this.ghostMat.opacity = Pl.ghost.i;
    this.pillFillMat.color.copy(Pl.pillFill.color); this.pillFillMat.opacity = Pl.pillFill.i;
    this.pillLineMat.color.copy(Pl.pillLine.color); this.pillLineMat.opacity = Pl.pillLine.i;
    this.ringMat.color.copy(Pl.tones.accent); this.dashMat.color.copy(Pl.tones.accent);
    this.edgeMat.color.copy(Pl.tones.edge);
    this.linkMat.color.copy(Pl.link.color); this.linkMat.opacity = Pl.link.i;
    this.linkSelMat.color.copy(Pl.tones.accent);
    this.routeMat.color.copy(Pl.route.color); this.routeMat.opacity = Pl.route.i;
    this.painters.forEach((p) => p.fn(Pl));
    this._recolour();
  }
  /* A building's colour now: its paper tone, a small shade, and the faded tone when the search
     has sent it down. */
  _towerColour(t, out) {
    const Pl = this.P;
    if (t.facade != null && t.tone !== 'dim' && Pl.facades && Pl.facades.length) {
      out.copy(Pl.facades[t.facade % Pl.facades.length]);
      if (t.mix) out.lerp(Pl.tones.body, t.mix);                  /* a file: a lighter shade of its project's colour */
      out.multiplyScalar(t.shade || 1);
    } else out.copy(Pl.tones[t.tone] || Pl.tones.body).multiplyScalar(t.shade || 1);
    if (t.sinkE > 0.001) out.lerp(Pl.tones.dim, Math.min(1, t.sinkE) * 0.7);
    return out;
  }
  _recolour() {
    const col = new THREE.Color();
    this.batches.forEach((b) => {
      if (b.toneBatch) return;
      for (let i = 0; i < b.n; i++) { const t = b.towers[i]; if (t) b.mesh.setColorAt(i, this._towerColour(t, col)); }
      if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
    });
  }

  /* ================= data ================= */
  /* items: [{key, name, tagline, category, catLabel, kind, kindLabel, form, statusLabel, size, demo, works[], status,
              retired, archived, paused, private, live, runs[], cover, icon, recent, issues, guides, lastChange, stale}]
     hoods: [{id, label, icon, stage, stageLabel}] in stage order;  platforms: [{id, label}];  sites: [{id, name, count}] */
  setProjects(items, hoods, platforms, sites) {
    const sig = items.map((i) => [i.key, i.category, i.form, i.demo ? 1 : 0, Math.round((i.size || 0) / 4096), i.status, i.retired ? 1 : 0, i.private ? 1 : 0, i.live ? 1 : 0,
      (i.runs || []).join('+'), (i.works || []).join('+'), i.cover, i.icon, i.recent, i.issues, i.stale ? 1 : 0, i.guides ? 1 : 0].join(':')).sort().join('|') +
      '#' + (sites || []).map((s) => s.id).join(',') + '#' + (hoods || []).map((h) => h.id).join(',') + '#' + (platforms || []).map((p) => p.id).join(',');
    this.items = items; this.hoods = hoods; this.platforms = platforms || []; this.sites = sites || [];
    this.byKey = new Map(items.map((i) => [i.key, i]));
    items.forEach((i) => this.names.set(i.key, i.name));
    if (sig === this._sig) return false;
    this._sig = sig;
    if (this.level.kind === 'estate') this._build();
    return true;
  }
  /* A project's file list, as it arrives: its block fills in round the main building. An empty
     list still brings the parts that need no files (the cover's billboard, the icon's statue). */
  addFiles(key, files) {
    if (!files) return;
    this.files.set(key, files);
    if (this.level.kind !== 'estate') return;
    const t = this.towers.find((x) => x.type === 'project' && x.item.key === key);
    if (t) this._fillBlock(t, files, false);
  }
  enterProject(key, files, name) {
    this.files.set(key, files || []);
    this.roots.set(key, toTree(files || []));
    this.sigs.set(key, signatureOf(key, files || []));
    if (name) this.names.set(key, name);
    this.go({ kind: 'repo', repo: key });
  }

  /* ================= levels ================= */
  go(level) {
    if (this.walking) this.exitWalk(true);
    this.level = level;
    this._build();
    this.resetView();
  }
  home() { this.go({ kind: 'estate' }); }
  up() {
    const lv = this.level;
    if (lv.kind === 'estate') return false;
    if (lv.kind === 'repo') { this.home(); return true; }
    const parts = lv.path.split('/'); parts.pop();
    this.go(parts.length ? { kind: 'dir', repo: lv.repo, path: parts.join('/') } : { kind: 'repo', repo: lv.repo });
    return true;
  }
  crumbs() {
    const lv = this.level, out = [{ label: 'The City', level: { kind: 'estate' } }];
    if (lv.kind === 'estate') return out;
    out.push({ label: this.names.get(lv.repo) || lv.repo, level: { kind: 'repo', repo: lv.repo } });
    if (lv.kind === 'dir') {
      const parts = lv.path.split('/');
      parts.forEach((p, i) => out.push({ label: p, level: { kind: 'dir', repo: lv.repo, path: parts.slice(0, i + 1).join('/') } }));
    }
    return out;
  }
  goCrumb(i) { const c = this.crumbs()[i]; if (c) this.go(c.level); }
  _summary() {
    if (this.level.kind === 'estate') {
      /* count as the lists do (archived repos are not projects there); the ruins come after */
      const n = this.districts.length, all = this.towers.filter((t) => t.type === 'project');
      const gone = all.filter((t) => t.item && t.item.archived).length, p = all.length - gone;
      return p + (p === 1 ? ' project' : ' projects') + ' in ' + n + (n === 1 ? ' district' : ' districts') +
        (gone ? ', plus ' + gone + ' archived, shown as ruins' : '');
    }
    const dirs = this.districts.filter((d) => d.target).length, f = this.towers.length + (this._propFiles || 0);
    return (dirs ? dirs + (dirs === 1 ? ' folder, ' : ' folders, ') : '') + f + (f === 1 ? ' file' : ' files');
  }

  _build() {
    this._clear();
    if (this.level.kind === 'estate') this._buildEstate(); else this._buildInside();
    this._buildGround();
    this._buildTrees();
    if (this.level.kind === 'estate') {
      if (this.linksOn) this._buildLinks();
      if (this.filter) this._applyFilter(false);
      this._buildLine();
      this._buildSites();
      this._buildLife();
      this._stepMovers(performance.now(), 0);          /* placed at once; they move only when motion is allowed */
      this.later.push({ at: performance.now() + (REDUCED.matches ? 0 : 2400), fn: () => { this._buildFlags(); this._buildCranes(); } });
    }
    this._paint();
    if (!this.userMoved && !this.walking && !this.ride) this.resetView(true);
    this.h.onSelect(null);
    this.h.onLevel(this.crumbs(), this._summary(), this.level);
  }

  _setPlate(size) {
    this.plate = size;
    const s = size * 0.72, k = this.key;
    k.shadow.camera.left = -s; k.shadow.camera.right = s; k.shadow.camera.top = s; k.shadow.camera.bottom = -s;
    k.shadow.camera.near = 10; k.shadow.camera.far = size * 4;
    k.shadow.camera.updateProjectionMatrix();
    k.position.copy(RIGHT).multiplyScalar(0.5).addScaledVector(FAR, 0.55).multiplyScalar(size).setY(size * 1.15);
    k.target.position.set(0, 0, 0);
    this.fill.position.copy(k.position);
    /* the bot's shadow, huge and faint, partly off the edge of the town (bottom left), and the two pills
       at the rim, filled at the light's corner (top right) and outlined across from it */
    this.ghost.scale.setScalar(size * 1.15);
    this.ghost.position.set(-RIGHT.x * size * 0.2 - FAR.x * size * 0.22, 0.02, -RIGHT.z * size * 0.2 - FAR.z * size * 0.22);
    this.ghost.rotation.y = FACE + 0.14;
    const at = (o, rx, fz, len, rot) => {
      o.scale.set(len, 1, len);
      o.position.set(RIGHT.x * rx * size + FAR.x * fz * size, 0.03, RIGHT.z * rx * size + FAR.z * fz * size);
      o.rotation.y = FACE + rot;
    };
    at(this.pillA, 0.6, 0.38, size * 0.42, 0.24);
    at(this.pillB, -0.62, -0.18, size * 0.3, -0.24);
  }

  /* ---- the estate: districts of project blocks ---- */
  _buildEstate() {
    const now = performance.now();
    const byForm = {};
    this.items.forEach((it) => { (byForm[it.form] = byForm[it.form] || []).push(it); });
    Object.keys(byForm).forEach((k) => {
      const list = byForm[k].slice().sort((a, b) => (a.size || 0) - (b.size || 0));
      list.forEach((it, i) => { it._pct = list.length > 1 ? i / (list.length - 1) : 0.5; });
    });
    /* a block's ground grows with its code, so a project with many files has room for them */
    const weight = (it) => it.retired ? 1.4 : (FORM[it.form] || FORM.monolith).plot * (0.8 + 0.4 * (it._pct || 0)) + 1.3 * clamp(Math.log10((it.size || 0) + 1) - 3, 0, 3);
    const hoods = this.hoods
      .map((h) => ({ ...h, items: this.items.filter((i) => (i.category || '_none') === h.id) }))
      .filter((h) => h.items.length)
      .map((h) => ({ ...h, value: Math.max(6, h.items.reduce((s, i) => s + weight(i), 0)) }));
    /* the town's size follows what it holds, so a small account is not lost on a big table */
    const total = hoods.reduce((s, h) => s + h.value * 1.25, 0);
    this._setPlate(clamp(Math.sqrt(total * 150 / Math.PI) / 0.47, 110, 240));
    const CAP = this.plate;
    const town = blobPolygon(CAP * 0.47, 30, 0.12, 0x2B6D44E0);
    seedPlan(0x6D44E0);
    this.trees_ = [];
    let order = 0;
    layoutPoly(town, hoods, (h, poly) => {
      const c = polyCentroid(poly);
      const d = {
        key: 'hood:' + h.id, hood: h, label: h.label, plot: poly, cx: c[0], cz: c[1],
        radius: Math.max(inradiusAt(poly, c), Math.sqrt(polyArea(poly)) * 0.42),
        towers: [], lots: [], count: h.items.filter((i) => !i.archived).length,
        t0: REDUCED.matches ? now - 9999 : now + order++ * 160
      };
      this.districts.push(d);
      const entries = h.items.slice().sort((a, b) => weight(b) - weight(a)).map((it) => ({ it, value: weight(it) }));
      entries.splice(Math.floor(entries.length / 2), 0, { plaza: true, value: Math.max(3, h.value * 0.09) });
      layoutPoly(poly, entries, (x, plot) => (x.plaza ? this._addPlaza(d, plot) : this._addProject(d, x.it, plot)),
        { pad: 1.8, leafPad: 1.2, jitter: 0.5 });
      this._hoodLabel(d);
    }, { pad: 5.2, leafPad: 3.4, jitter: 0.3 });
  }

  /* The square at the heart of a district: the category's icon on a plinth. */
  _addPlaza(d, plot) {
    const s = plotToSite(plot);
    d.plaza = { x: s.x, z: s.z, r: s.r, plot };
    const grp = new THREE.Group();
    grp.position.set(s.x, BASE, s.z);
    const ped = new THREE.Mesh(this.plinthGeo, this.propMat);
    ped.scale.set(2.4, 2.2, 2.4); ped.castShadow = true; ped.receiveShadow = true;
    grp.add(ped);
    let top = 2.2;
    const geo = d.hood.icon ? P.svgGeometry(d.hood.icon) : null;
    if (geo) {
      const st = new THREE.Mesh(geo, this.statueMat);
      st.scale.setScalar(4.4); st.position.y = 2.2; st.rotation.y = FACE; st.castShadow = true;
      grp.add(st);
      top += 4.4;
    }
    d.monumentTop = BASE + top;
    this._pickable(grp, { type: 'hood', id: d.hood.id, kindLabel: 'District', title: d.label, text: 'Select it to list the projects here.' });
    this._pop(grp, d.t0 + 300);
    this.props.add(grp);
  }

  _addProject(d, it, plot) {
    const f = FORM[it.form] || FORM.monolith;
    d.lots.push(plot);
    /* the main building takes part of the block; its files fill the rest */
    let mainPlot = plot, rest = null;
    if (!it.retired) {
      const share = it.form === 'house' || it.form === 'works' ? 0.5 : 0.42, parts = {};
      layoutPoly(plot, [{ k: 'main', value: share }, { k: 'rest', value: 1 - share }], (x, p) => { parts[x.k] = p; }, { pad: 0, leafPad: 0.3, jitter: 0.4 });
      if (parts.main) { mainPlot = parts.main; rest = parts.rest || null; }
    }
    const site = plotToSite(mainPlot);
    const pct = it._pct || 0;
    let arch, geoFn = null, h, foot, tone = 'body', shade = 1;
    if (it.retired) {
      const v = hash32(it.key) % 4;
      arch = 'ruin:' + v; geoFn = () => P.ruinGeometry(v + 1);
      foot = Math.max(1.4, Math.min(Math.sqrt(site.area) * 0.6, site.r * 1.8, 7)); h = 3 + pct * 2;
    } else {
      const tier = Math.round(f.tier[0] + (f.tier[1] - f.tier[0]) * pct);
      const crown = f.crown[Math.min(f.crown.length - 1, Math.round(pct * (f.crown.length - 1)))];
      arch = (FORM[it.form] ? it.form : 'monolith') + ':' + tier + ':' + crown;
      foot = Math.max(1.4, Math.min(Math.sqrt(site.area) * 0.66, site.r * 1.85, f.foot));
      h = Math.min(f.h[0] + (f.h[1] - f.h[0]) * Math.pow(pct, 0.9), foot * 3.2);
      if (it.paused) { h *= 0.85; tone = 'dim'; }                  /* paused: mist, a little lower, no cap */
      shade = 0.985 + unit(it.key, 'l') * 0.03;
    }
    const t = this._place(arch, { type: 'project', item: it, district: d, x: site.x, z: site.z, w: foot, dd: foot,
      rot: site.angle, h, tone, shade, facade: facadeOf(it.key), pointed: !!POINTED[it.form] && !it.retired, order: d.towers.length / Math.max(1, d.count), seed: unit(it.key, 's'),
      jitter: unit(it.key, 'j') * 320 }, geoFn);
    t.rest = rest; t.plot = plot; t.mainPlot = mainPlot; t.extras = [];
    for (let k = 0; k < (it.guides && !it.retired ? mainPlot.length : 0); k++) {   /* a tree by the door: it has guides */
      const q = mainPlot[(k + (hash32(it.key) % mainPlot.length)) % mainPlot.length];
      const x = site.x + (q[0] - site.x) * 0.74, z = site.z + (q[1] - site.z) * 0.74;
      if (Math.hypot(x - site.x, z - site.z) > foot * 0.78 + 0.9) { this.trees_.push({ x, z, s: 1.3 + unit(it.key, 'ts') * 1.0, rnd: unit(it.key, 'tc') }); break; }
    }
    if (!it.retired) this._addRoof(t);
    if (it.demo && !it.retired) {
      const sign = P.demoSign(this.propMat);
      const sx = site.x + VIEW_DIR.x * (foot * 0.55 + 0.9), sz = site.z + VIEW_DIR.z * (foot * 0.55 + 0.9);
      sign.scale.setScalar(clamp(foot * 0.22, 1.1, 2.2));
      sign.position.set(sx, BASE, sz); sign.rotation.y = FACE;
      this.props.add(sign);
      t.sign = sign; t.extras.push(sign);
      this._pickable(sign, { type: 'project', main: t, kindLabel: 'Demo to try', title: it.name, text: 'Point at the building to see a preview. Select it to try the demo.' });
      this._pop(sign, d.t0 + 900 + t.jitter);
    }
    this._buildingLabel(t);
    if (this.files.has(it.key)) this._fillBlock(t, this.files.get(it.key), true);
  }

  /* What stands on the roof, carried up and down with the building: the bot's eyes (live), a lock
     (private), a ring (in progress, paler for an experiment). */
  _addRoof(t) {
    const it = t.item, grp = new THREE.Group(), s = clamp(t.w * 0.2, 0.9, 2.2);
    let any = false;
    if (it.live && !it.paused) {
      const e = new THREE.Mesh(this.eyesGeo, this.propMat);
      e.scale.setScalar(s * 1.3); e.rotation.y = FACE; e.position.y = -0.1 * s; e.castShadow = true;
      grp.add(e); any = true;
      this._pickable(e, { type: 'project', main: t, roof: true, kindLabel: 'Live', title: it.name, text: 'The bot’s two eyes on the roof: this project runs for real' + (it.runs && it.runs[0] ? ' at ' + it.runs[0] + '.' : '.') });
    }
    if (it.private) {
      const l = new THREE.Mesh(this.lockGeo, this.propMat);
      l.scale.setScalar(s * 0.9); l.rotation.y = FACE;
      l.position.set(RIGHT.x * t.w * 0.26, t.pointed ? -t.h * 0.16 : 0, RIGHT.z * t.w * 0.26);
      if (t.pointed) l.position.addScaledVector(VIEW_DIR, t.w * 0.2);
      l.castShadow = true;
      grp.add(l); any = true;
      this._pickable(l, { type: 'project', main: t, roof: true, kindLabel: 'Private', title: it.name, text: 'A private repo: you see it because you are signed in.' });
    }
    if (/^(in-progress|experimental)$/.test(it.status || '')) {
      const r = new THREE.Mesh(this.roofRingGeo, it.status === 'experimental' ? this.faintMat : this.softMat);
      const rr = t.w * (t.pointed ? 0.34 : 0.42);
      r.scale.set(rr * 2, 1, rr * 2);
      r.position.y = t.pointed ? -t.h * 0.07 : 0.06;
      grp.add(r); any = true;
    }
    if (!any) return;
    grp.position.set(t.x, BASE, t.z);
    grp.scale.setScalar(0.001);
    this.props.add(grp);
    t.roof = grp; t.extras.push(grp);
    this.roofs.push(t);
  }

  /* Fill a block with the project's files: buildings, columns, statues, a garden, a billboard. */
  _fillBlock(t, files, withIntro) {
    if (t.filled || !t.rest || t.item.retired) return;
    t.filled = true;
    const it = t.item, t0 = withIntro ? t.district.t0 + 650 : performance.now();
    const area = polyArea(t.rest);
    const fonts = [], svgs = [], imgs = [], code = [];
    let tests = 0;
    const seen = new Set();
    files.forEach((f) => {
      if (IS_FONT.test(f.p)) { const n = f.p.split('/').pop(); if (!seen.has(n)) { seen.add(n); fonts.push(f); } return; }
      if (IS_TEST.test(f.p)) { tests++; return; }
      if (IS_VENDOR.test(f.p) || IS_JUNK.test(f.p)) return;
      if (/^hub\//.test(f.p)) return;                       /* the card's own pictures and shot list */
      if (IS_SVG.test(f.p)) svgs.push(f);
      else if (IS_IMG.test(f.p)) imgs.push(f);
      else code.push(f);
    });
    fonts.sort((a, b) => (a.s || 0) - (b.s || 0));
    code.sort((a, b) => (b.s || 0) - (a.s || 0));
    const cells = [];
    if (it.icon) cells.push({ kind: 'icon', value: 1.7 });
    if (it.cover) cells.push({ kind: 'cover', value: 2.0 });
    if (tests || imgs.length) cells.push({ kind: 'garden', value: 1.3 + 0.07 * Math.min(tests, 12) + 0.7 * Math.min(imgs.length, 3), tests, imgs: imgs.slice(0, 3) });
    fonts.slice(0, 8).forEach((f) => cells.push({ kind: 'font', value: 0.8, file: f }));
    svgs.slice(0, 3).forEach((f) => cells.push({ kind: 'svg', value: 1.0, file: f }));
    const maxCells = Math.round(clamp(area / 2.4, 2, 17));
    const room = Math.max(0, maxCells - cells.length);
    const maxS = Math.max(1, ...code.map((f) => f.s || 0));
    code.slice(0, Math.max(room, Math.min(2, code.length))).forEach((f, i, arr) => cells.push({ kind: 'code', file: f, value: 0.55 + 1.3 * Math.sqrt((f.s || 0) / maxS), rank: arr.length > 1 ? 1 - i / (arr.length - 1) : 1 }));
    if (!cells.length) return;
    const list = cells.slice(0, Math.max(maxCells, 2)).sort((a, b) => b.value - a.value);
    let n = 0;
    layoutPoly(t.rest, list, (c, plot) => this._fillCell(t, c, plot, t0 + (n++) * 60), { pad: 0, leafPad: 0.28, jitter: 0.55 });
  }

  _fillCell(t, c, plot, t0) {
    const site = plotToSite(plot), it = t.item, d = t.district;
    const foot = Math.max(0.35, Math.min(Math.sqrt(site.area) * 0.62, site.r * 1.85));
    const owner = { main: t, repo: it.key };
    if (c.kind === 'code') {
      const f = c.file, depth = (f.p.match(/\//g) || []).length;
      const arch = variantFor(f.p, c.rank, false, { files: 20 }, depth);
      const h = Math.max(1.1, Math.min(t.h * (0.2 + 0.45 * c.rank), foot * 4, MAX_H * 0.6));
      this._place(arch, { type: 'file', item: it, main: t, file: f, district: d, x: site.x, z: site.z, w: foot * 0.92, dd: foot * 0.92,
        rot: site.angle, h, tone: fileTone(f.p), shade: 0.99 + unit(f.p, 'l') * 0.02, order: 0, seed: unit(f.p, 's'), t0,
        facade: unit(f.p, 'fv') < 0.22 ? t.facade + 1 + (hash32(f.p) % 3) : t.facade, mix: 0.18 + unit(f.p, 'fm') * 0.5 });
    } else if (c.kind === 'font') this._column(c.file, site, foot, t0, owner);
    else if (c.kind === 'svg') this._statue({ sha: c.file.h, path: c.file.p }, site, t0, owner, 2.2);
    else if (c.kind === 'icon') this._statue({ path: it.icon }, site, t0, owner, 3.4);
    else if (c.kind === 'garden') this._garden(t, plot, c, t0);
    else if (c.kind === 'cover') this._billboard(t, site, t0);
  }

  /* ---------------- props ---------------- */
  _pickable(obj, ref) { if (!ref.obj) ref.obj = obj; obj.traverse((o) => { if (o.isMesh) { o.userData.ref = ref; this.pickables.push(o); } }); }
  _pop(obj, t0) {
    obj.userData.full = obj.scale.clone();
    if (REDUCED.matches) return;
    obj.scale.multiplyScalar(0.001);
    this.anims.push({ o: obj, t0 });
  }
  _job(fn) {
    const gen = this.gen;
    this.jobs.push(() => fn().catch((e) => { if (gen === this.gen) console.warn('City: a prop could not load', e); }));
    this._pump();
  }
  /* Eight props at a time: each is a download of about a second and a few milliseconds of drawing. */
  _pump() {
    while (this.active < 8 && this.jobs.length) {
      const run = this.jobs.shift();
      this.active++;
      Promise.resolve().then(run).finally(() => { this.active--; this._pump(); });
    }
  }
  _ownerRef(owner, kindLabel, title, text, file) {
    return owner.main ? { type: 'project', main: owner.main, kindLabel, title, text, file } : { type: 'file', repo: owner.repo, kindLabel, title, text, file };
  }

  /* A font file: a fluted column, its own letters carved round the shaft. */
  _column(file, site, foot, t0, owner) {
    const fi = fontInfo(file.p);
    const h = 5 + clamp(Math.log2((file.s || 1) / 15000 + 1), 0, 4);
    const R = clamp(foot * 0.45, 0.7, 1.15);
    const css = (fam) => (fi.italic ? 'italic ' : '') + fi.weight + ' {size} ' + fam;
    const aspect = (h * 0.78) / (2 * Math.PI * R * 1.05);          /* shaft height over its circumference */
    const tex0 = P.carvedTexture(css('"Plus Jakarta Sans", sans-serif'), fi.title, aspect);
    const mat = new THREE.MeshStandardMaterial({ map: tex0.map, bumpMap: tex0.bump, bumpScale: 3.2, roughness: 0.8, metalness: 0 });
    this._onPaint((Pl) => { mat.color.copy(Pl.tones.stone); });
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(this.colRest, this.propMat), new THREE.Mesh(this.colShaft, mat));
    grp.children.forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
    grp.scale.set(R * 2, h, R * 2);
    grp.position.set(site.x, BASE, site.z);
    grp.rotation.y = site.angle;
    this._pickable(grp, this._ownerRef(owner, 'Font column', fi.title, 'A font file in ' + (this.names.get(owner.repo) || 'this project') + ': ' + file.p, file));
    this._pop(grp, t0);
    this.props.add(grp);
    this._propFiles = (this._propFiles || 0) + 1;
    const gen = this.gen;
    this._loadFont(file, fi, owner.repo).then((family) => {
      if (!family || gen !== this.gen) return;
      const oldMap = mat.map, oldBump = mat.bumpMap, tex = P.carvedTexture(css('"' + family + '"'), fi.title, aspect);
      mat.map = tex.map; mat.bumpMap = tex.bump;
      mat.needsUpdate = true;
      if (oldMap) oldMap.dispose();
      if (oldBump) oldBump.dispose();
    });
  }
  /* One face per family name, the smallest file of each, and no more than about 4 MB in all. */
  _loadFont(file, fi, repo) {
    if (this.fontFaces.has(fi.stem)) return this.fontFaces.get(fi.stem);
    if ((file.s || 0) > 1400000 || this.fontBytes + (file.s || 0) > 4200000) return Promise.resolve(null);
    this.fontBytes += file.s || 0;
    /* fetched directly, not through the prop queue, so a rebuild never strands it */
    const p = this.h.fetchBlob(repo, file.h || null, file.p).then((buf) => {
      if (!buf) return null;
      const family = 'hwcf-' + (file.h || hash32(repo + file.p).toString(16)).slice(0, 10);
      return new FontFace(family, buf).load().then((f) => { document.fonts.add(f); return family; });
    }).catch(() => null);
    this.fontFaces.set(fi.stem, p);
    return p;
  }

  /* An SVG: made solid, on a plinth. `src` has a blob sha and a path in the repo. */
  _statue(src, site, t0, owner, size) {
    const grp = new THREE.Group();
    grp.position.set(site.x, BASE, site.z);
    const ped = new THREE.Mesh(this.plinthGeo, this.propMat);
    ped.scale.set(size * 0.55, size * 0.6, size * 0.55); ped.castShadow = true;
    grp.add(ped);
    const isIcon = owner.main && src.path === owner.main.item.icon;
    const ref = this._ownerRef(owner, isIcon ? 'The project’s icon' : 'Statue', src.path.split('/').pop(), 'An SVG picture in ' + (this.names.get(owner.repo) || 'this project') + ': ' + src.path, { p: src.path, s: 0, h: src.sha });
    this._pickable(grp, ref);
    this._pop(grp, t0);
    this.props.add(grp);
    this._propFiles = (this._propFiles || 0) + 1;
    const gen = this.gen;
    this._job(() => this.h.fetchBlob(owner.repo, src.sha || null, src.path).then((buf) => {
      if (!buf || gen !== this.gen) return;
      const text = typeof buf === 'string' ? buf : new TextDecoder().decode(buf);
      if (text.length > 200000) return;   /* a statue is a small icon; a huge SVG from a repo must not stall the City */
      const geo = P.svgGeometry(text);
      if (!geo) return;
      const st = new THREE.Mesh(geo, this.statueMat);
      st.scale.setScalar(size); st.position.y = size * 0.6; st.rotation.y = FACE; st.castShadow = true;
      grp.add(st);
      this._pickable(st, ref);
    }));
  }

  /* Tests and pictures: a hedged garden, a model tree for each test, the pictures carved in stone. */
  _garden(t, plot, c, t0) {
    const s = plotToSite(plot), y = BASE;
    const k = 0.9, poly = plot.map((q) => [s.x + (q[0] - s.x) * k, s.z + (q[1] - s.z) * k]);
    const grp = new THREE.Group();
    const shape = new THREE.Shape();
    const soft = roundPoly(poly, 0.6, 3);
    soft.forEach((q, i) => (i ? shape.lineTo(q[0], q[1]) : shape.moveTo(q[0], q[1])));
    const lawn = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
    lawn.rotateX(Math.PI / 2); lawn.translate(0, y + 0.06, 0);
    const lawnM = new THREE.Mesh(P.paint(lawn, 'lawn'), this.propMat);
    lawnM.receiveShadow = true;
    grp.add(lawnM);
    const hedge = P.hedgeGeometry(poly, y);
    if (hedge) { const hm = new THREE.Mesh(hedge, this.propMat); hm.castShadow = true; hm.receiveShadow = true; grp.add(hm); }
    const spots = [], stones = c.imgs || [];
    stones.forEach((f, i) => {
      const along = (i - (stones.length - 1) / 2) * 3.4;
      const x = s.x + Math.cos(s.angle) * along, z = s.z + Math.sin(s.angle) * along;
      if (!inPoly(poly, x, z)) return;
      spots.push([x, z, 1.8]);
      this._stone(f, x, z, t0 + i * 120, { main: t, repo: t.item.key }, grp);
    });
    const want = Math.min(Math.max(c.tests, stones.length ? 2 : 0), 12);
    const trees = [];
    let tries = 0;
    const bb = poly.reduce((m, q) => [Math.min(m[0], q[0]), Math.min(m[1], q[1]), Math.max(m[2], q[0]), Math.max(m[3], q[1])], [1e9, 1e9, -1e9, -1e9]);
    while (trees.length < want && tries++ < 200) {
      const x = bb[0] + unit(t.item.key, 'gx' + tries) * (bb[2] - bb[0]), z = bb[1] + unit(t.item.key, 'gz' + tries) * (bb[3] - bb[1]);
      if (!inPoly(poly, x, z)) continue;
      if (spots.some((p) => Math.hypot(p[0] - x, p[1] - z) < p[2] + 0.6)) continue;
      if (trees.some((p) => Math.hypot(p[0] - x, p[1] - z) < 1.1)) continue;
      trees.push([x, z]);
    }
    if (trees.length) {
      const im = new THREE.InstancedMesh(this.treeGeo, this.propMat, trees.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
      trees.forEach(([x, z], i) => {
        const r = unit(t.item.key, 'gt' + i), sz = 0.9 + r * 0.7;
        p.set(x, y + 0.06, z); sc.set(sz, sz * (0.9 + r * 0.3), sz); q.setFromAxisAngle(YAXIS, r * 6.28);
        m.compose(p, q, sc); im.setMatrixAt(i, m);
      });
      im.castShadow = true;
      grp.add(im);
    }
    this._pickable(grp, { type: 'project', main: t, kindLabel: 'Garden', title: t.item.name, at: new THREE.Vector3(s.x, y + 1, s.z),
      text: (c.tests ? c.tests + (c.tests === 1 ? ' test checks' : ' tests check') + ' that this project works: a tree for each. ' : '') + (stones.length ? 'The stones carry its pictures.' : '') });
    this._pop(grp, t0);
    this.props.add(grp);
  }
  /* A picture from the repo, carved into a standing stone. */
  _stone(file, x, z, t0, owner, parent) {
    const holder = new THREE.Group();
    holder.position.set(x, BASE + (parent ? 0.06 : 0), z);
    holder.rotation.y = FACE;
    (parent || this.props).add(holder);
    if (!parent) this._propFiles = (this._propFiles || 0) + 1;
    const gen = this.gen;
    if ((file.s || 0) > 900000) return;
    this._job(() => this.h.fetchBlob(owner.repo, file.h || null, file.p).then((buf) => {
      if (!buf || gen !== this.gen) return null;
      const type = /\.png$/i.test(file.p) ? 'image/png' : /\.gif$/i.test(file.p) ? 'image/gif' : /\.webp$/i.test(file.p) ? 'image/webp' : 'image/jpeg';
      return P.engraveImage(new Blob([buf], { type }));
    }).then((tex) => {
      if (!tex || gen !== this.gen) return;
      const face = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
      this._onPaint((Pl) => { face.color.copy(Pl.tones.stone); });
      const st = P.carvedStone(tex, this.stoneMat, face);
      holder.add(st);
      this._pickable(st, this._ownerRef(owner, 'Carved stone', file.p.split('/').pop(), 'A picture in ' + (this.names.get(owner.repo) || 'this project') + ', carved in stone: ' + file.p, file));
      this._pop(st, performance.now());
    }));
  }
  /* The project's cover picture on a billboard. */
  _billboard(t, site, t0) {
    const gen = this.gen;
    this._job(() => this.h.loadImage(t.item.key, t.item.cover).then((url) => {
      if (!url || gen !== this.gen) return null;
      return new Promise((resolve) => new THREE.TextureLoader().load(url, resolve, undefined, () => resolve(null)));
    }).then((tex) => {
      if (!tex || gen !== this.gen) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      const w = clamp(Math.sqrt(site.area) * 1.2, 4, 9), h = w / ((tex.image && tex.image.width / tex.image.height) || 1.6);
      const b = P.billboard(tex, w, h, this.propMat);
      b.position.set(site.x, BASE, site.z); b.rotation.y = FACE;
      this._pickable(b, { type: 'project', main: t, kindLabel: 'Billboard', title: t.item.name, text: 'The project’s own picture.' });
      this._pop(b, Math.max(t0, performance.now()));
      this.props.add(b);
      t.extras.push(b);
    }));
  }

  /* ---- flags (tools shared by several projects) and cranes (work in progress), after the town has risen ---- */
  _buildFlags() {
    if (this.level.kind !== 'estate') return;
    const index = new Map(this.platforms.map((p, i) => [p.id, i]));
    const spots = [];
    this.towers.forEach((t) => {
      if (t.type !== 'project' || t.item.retired) return;
      const ws = (t.item.works || []).filter((w) => index.has(w)).slice(0, 3);
      const fx = Math.cos(t.rot), fz = Math.sin(t.rot), sx = -fz, sz = fx;
      const out = t.w * 0.5 + 0.9;
      ws.forEach((w, i) => {
        const lat = (i - (ws.length - 1) / 2) * 1.25;
        spots.push({ x: t.x + fx * out + sx * lat, z: t.z + fz * out + sz * lat, n: index.get(w), h: t.h < 6 ? 3.8 : 5.4, w, t });
      });
    });
    if (!spots.length) return;
    const poles = new THREE.InstancedMesh(P.poleGeometry(), this.propMat, spots.length);
    const cloth = new THREE.InstancedMesh(P.flagGeometry(), P.flagMaterial(this.uniforms), spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    const wind = -0.7;
    spots.forEach((s, i) => {
      p.set(s.x, BASE, s.z); sc.set(1, s.h, 1); q.identity(); m.compose(p, q, sc); poles.setMatrixAt(i, m);
      const fw = s.h * 0.3;
      p.set(s.x, BASE + s.h - fw * 0.36, s.z); sc.set(fw, fw, fw); q.setFromAxisAngle(YAXIS, wind); m.compose(p, q, sc); cloth.setMatrixAt(i, m);
      cloth.setColorAt(i, new THREE.Color(1, 1, 1));
    });
    this._onPaint((Pl) => { spots.forEach((s, i) => cloth.setColorAt(i, Pl.flags[s.n % Pl.flags.length])); if (cloth.instanceColor) cloth.instanceColor.needsUpdate = true; });
    poles.castShadow = cloth.castShadow = true;
    this.props.add(poles, cloth);
    this._pickable(cloth, { type: 'flags', spots });
    this._pickable(poles, { type: 'flags', spots });
    this._pop(poles, performance.now()); this._pop(cloth, performance.now() + 150);
  }
  _buildCranes() {
    if (this.level.kind !== 'estate') return;
    this.towers.forEach((t) => {
      if (t.type !== 'project' || t.item.retired || !/in-progress|experimental/.test(t.item.status || '')) return;
      const cr = P.crane(this.propMat);
      const corner = t.mainPlot.reduce((best, q) => (Math.hypot(q[0] - t.x, q[1] - t.z) > Math.hypot(best[0] - t.x, best[1] - t.z) ? q : best), t.mainPlot[0]);
      cr.position.set(t.x + (corner[0] - t.x) * 0.7, BASE, t.z + (corner[1] - t.z) * 0.7);
      cr.scale.setScalar(clamp(t.h / 16, 0.5, 1.3));
      cr.userData.jib.rotation.y = unit(t.item.key, 'jib') * 6.28;
      this.swings.push({ o: cr.userData.jib, base: cr.userData.jib.rotation.y, ph: unit(t.item.key, 'sw') * 6.28 });
      this._pickable(cr, { type: 'project', main: t, kindLabel: 'Crane', title: t.item.name, text: t.item.status === 'experimental' ? 'An experiment: work on it still goes on.' : 'Work in progress: not finished yet.' });
      this._pop(cr, performance.now());
      this.props.add(cr);
      t.extras.push(cr);
    });
  }

  /* ---- the HelloWorld line: a car between the districts' squares, from idea to live ---- */
  _buildLine() {
    const stops = this.hoods.map((h) => this.districts.find((d) => d.hood && d.hood.id === h.id)).filter((d) => d && d.plaza);
    if (stops.length < 2) return;
    const pts = [];
    stops.forEach((d, i) => {
      pts.push(new THREE.Vector3(d.plaza.x, d.monumentTop + 4.5, d.plaza.z));
      if (i < stops.length - 1) {
        const n = stops[i + 1];
        pts.push(new THREE.Vector3((d.plaza.x + n.plaza.x) / 2, MAX_H * 0.8, (d.plaza.z + n.plaza.z) / 2));
      }
    });
    /* No cable and no car (Bryan, 2026-11-26): the bot himself flies the route, leaving a light
       trail that fades behind him. The curve is his path; `car` is only the point he is at. */
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const NS = 900, samples = [];
    for (let i = 0; i <= NS; i++) samples.push(curve.getPointAt(i / NS));
    const stopU = pts.filter((_, i) => i % 2 === 0).map((p) => {
      let bi = 0, bd = Infinity;
      samples.forEach((q, i) => { const dd = q.distanceToSquared(p); if (dd < bd) { bd = dd; bi = i; } });
      return bi / NS;
    });
    const car = new THREE.Object3D();
    this.props.add(car);
    this._buildTrail();
    this.cable = { curve, stopU, car, i: 0, dir: 1, t0: performance.now(), phase: 'wait', u: stopU[0], length: curve.getLength(),
      stroke: 0, strokeAt: -1, strokeDir: [0, 0], strokeMs: 0,
      names: stops.map((d) => d.label), stages: stops.map((d) => d.hood.stageLabel || ''), counts: stops.map((d) => d.count) };
    this._stepLine(performance.now());
  }
  /* ---- the bot's light trail: a soft ribbon along the last 2.8 s of his path, facing the camera,
     narrowing and fading to nothing behind him. A faint wide band under a brighter core. It is
     worked out from the route itself (where he was at each moment of the last 2.8 s), not from past
     frames, so it is just as smooth on a slow machine. A stop lasts longer than the trail, so the
     trail only ever lies along one leg: the one he is on, or the one he has just finished. ---- */
  _buildTrail() {
    const MAX = 96;
    const mk = (opacity) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX * 2 * 4), 4).setUsage(THREE.DynamicDrawUsage));
      const idx = [];
      for (let i = 0; i < MAX - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      g.setIndex(idx); g.setDrawRange(0, 0);
      const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, opacity });
      const mesh = new THREE.Mesh(g, m);
      mesh.frustumCulled = false; mesh.renderOrder = 5; mesh.visible = false;
      this.props.add(mesh);
      return mesh;
    };
    this.trail = { MAX, halo: mk(1), core: mk(1), ms: 2800 };
  }
  _stepTrail(now) {
    const tr = this.trail, c = this.cable, leg = c && c.leg;
    const hide = () => { tr.core.visible = false; tr.halo.visible = false; };
    if (!tr) return;
    if (!leg || REDUCED.matches || this.walking) return hide();
    const from = Math.max(leg.t0, now - tr.ms), to = Math.min(leg.t0 + leg.ms, now);
    if (to - from < 30) return hide();
    const n = tr.MAX, pts = [];
    /* He is drawn over the canvas, and his face has see-through parts, so the trail must start behind
       him, not under him: it begins just outside his outline (measured on screen) and fades in from
       there. */
    const W = this._w || 1, H = this._h || 1, R = Math.max(12, (this.h.botSize ? this.h.botSize() : 48) / 2);
    const scr = (v) => { const q = v.clone().project(this.camera); return [(q.x + 1) / 2 * W, (1 - q.y) / 2 * H]; };
    const at = scr(c.car.position);
    for (let j = 0; j < n; j++) {
      const tau = from + (to - from) * (j / (n - 1));
      const p = c.curve.getPointAt(clamp(this._legU(leg, tau), 0, 1)), s = scr(p);
      const dist = Math.hypot(s[0] - at[0], s[1] - at[1]);
      const edge = clamp((dist - R * 0.92) / (R * 0.9), 0, 1);           /* 0 under him, 1 clear of him */
      pts.push({ p, life: 1 - (now - tau) / tr.ms, edge: edge * edge * (3 - 2 * edge) });
    }
    const Pl = this.P, head = Pl.tones.accent, tail = Pl.tones.accentSoft;
    const cam = this.camera.position, side = new THREE.Vector3(), tg = new THREE.Vector3(), view = new THREE.Vector3(), col = new THREE.Color();
    /* widths in screen pixels (half of each band), turned into world units at each point's distance */
    const perPx = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) / Math.max(1, this._h || 600);
    [[tr.core, 5, 1], [tr.halo, 16, 0.26]].forEach(([mesh, width, alpha]) => {
      const pos = mesh.geometry.attributes.position, cl = mesh.geometry.attributes.color;
      for (let i = 0; i < n; i++) {
        const p = pts[i].p, a = pts[Math.max(0, i - 1)].p, b = pts[Math.min(n - 1, i + 1)].p;
        tg.subVectors(b, a); if (tg.lengthSq() < 1e-8) tg.set(1, 0, 0);
        view.subVectors(cam, p);
        side.crossVectors(tg, view).normalize();
        const life = Math.max(0, pts[i].life);                             /* 1 where he is now, 0 at the end */
        const w = width * perPx * view.length() * Math.pow(life, 0.8) * (0.35 + 0.65 * pts[i].edge);
        pos.setXYZ(i * 2, p.x + side.x * w, p.y + side.y * w, p.z + side.z * w);
        pos.setXYZ(i * 2 + 1, p.x - side.x * w, p.y - side.y * w, p.z - side.z * w);
        col.copy(tail).lerp(head, Math.pow(life, 1.4));
        const A = alpha * Math.pow(life, 1.5) * pts[i].edge;
        cl.setXYZW(i * 2, col.r, col.g, col.b, A); cl.setXYZW(i * 2 + 1, col.r, col.g, col.b, A);
      }
      mesh.geometry.setDrawRange(0, (n - 1) * 6);
      pos.needsUpdate = true; cl.needsUpdate = true;
      mesh.visible = true;
    });
  }
  /* ---- how the bot swims the line ----
     The way he swims everywhere (assets/mascot/AGENTS.md 3.4 and life.js): pulse and glide, never a
     constant slide. A leg between two districts is one to four strokes. Each stroke gathers (a small
     pull back against the travel, sine in, 0.36 s), pushes hard (power3 out, about 2.6 s, carrying a
     little past its mark) and settles back from that carry (sine in-out, 1.1 s). Only his position
     moves: no squash or stretch while travelling. Where he is at any moment is worked out from the
     time alone, so the trail behind him can be drawn from the same sums. */
  _legPlan(a, b, t0) {
    const c = this.cable, len = Math.abs(b - a) * c.length;
    const n = clamp(Math.round(len / 40), 1, 4), strokes = [];
    let t = t0;
    for (let k = 0; k < n; k++) {
      const ua = a + (b - a) * k / n, ub = a + (b - a) * (k + 1) / n;
      const gather = 360, push = 2600 + (len / n) * 14, settle = 1100;
      strokes.push({ ua, ub, span: ub - ua, t0: t, gather, push, settle, ms: gather + push + settle });
      t += gather + push + settle;
    }
    return { a, b, t0, strokes, ms: t - t0 };
  }
  _legU(leg, tau) {
    const ss = leg.strokes;
    let s = ss[ss.length - 1];
    for (let i = 0; i < ss.length; i++) if (tau < ss[i].t0 + ss[i].ms) { s = ss[i]; break; }
    const t = tau - s.t0, back = s.span * 0.035, over = s.span * 0.05;
    if (t <= 0) return s.ua;
    if (t < s.gather) return s.ua - back * (1 - Math.cos((t / s.gather) * Math.PI / 2));              /* gather */
    if (t < s.gather + s.push) {                                                                     /* push and carry */
      const p = (t - s.gather) / s.push;
      return (s.ua - back) + (s.ub + over - (s.ua - back)) * (1 - Math.pow(1 - p, 3));
    }
    if (t < s.ms) return s.ub + over - over * (0.5 - 0.5 * Math.cos(((t - s.gather - s.push) / s.settle) * Math.PI));   /* settle */
    return s.ub;
  }
  _stepLine(now) {
    const c = this.cable;
    if (!c) return;
    const wait = 3200;                                  /* longer than the trail, so it fades out at each stop */
    let u = c.stopU[c.i];
    if (!REDUCED.matches) {
      if (c.phase === 'wait' && now - c.t0 > wait) {
        if (c.i + c.dir < 0 || c.i + c.dir >= c.stopU.length) c.dir = -c.dir;
        c.phase = 'move'; c.t0 = now;
        c.leg = this._legPlan(c.stopU[c.i], c.stopU[c.i + c.dir], now);
      }
      if (c.phase === 'move' && c.leg) {
        const leg = c.leg;
        u = this._legU(leg, now);
        /* a new stroke: tell the page which way it goes on screen, so his eyes lead and he tilts */
        let si = leg.strokes.length - 1;
        for (let i = 0; i < leg.strokes.length; i++) if (now < leg.strokes[i].t0 + leg.strokes[i].ms) { si = i; break; }
        const key = leg.t0 + ':' + si;
        if (key !== c.strokeAt && now < leg.t0 + leg.ms) {
          c.strokeAt = key; c.stroke++;
          const s = leg.strokes[si], A = c.curve.getPointAt(clamp(s.ua, 0, 1)).project(this.camera), B = c.curve.getPointAt(clamp(s.ub, 0, 1)).project(this.camera);
          const dx = (B.x - A.x) * (this._w || 1), dy = -(B.y - A.y) * (this._h || 1), d = Math.hypot(dx, dy) || 1;
          c.strokeDir = [dx / d, dy / d]; c.strokeMs = s.ms;
        }
        if (now >= leg.t0 + leg.ms) { c.i += c.dir; c.phase = 'wait'; c.t0 = now; u = leg.b; }
      }
    }
    const uu = clamp(u, 0, 1), p = c.curve.getPointAt(uu), tg = c.curve.getTangentAt(uu);
    c.u = uu;
    c.car.position.set(p.x, p.y, p.z);
    c.car.rotation.y = Math.atan2(tg.x, tg.z) - Math.PI / 2;
    this._stepTrail(now);
    if (this.ride) {
      /* ride along: sit just behind the car, looking down the line */
      const dir = tg.clone().multiplyScalar(c.dir), car = c.car.position;
      const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      const eye = car.clone().addScaledVector(dir, -22).addScaledVector(side, 6); eye.y += 9;
      const look = car.clone().addScaledVector(dir, 30); look.y -= 11;
      const k = REDUCED.matches ? 1 : 0.06;
      this.camera.position.lerp(eye, k);
      this.controls.target.lerp(look, k);
      this.camera.lookAt(this.controls.target);
      const at = c.phase === 'wait' ? c.i : -1;
      if (at !== this.ride.at) {
        this.ride.at = at;
        const next = c.i + c.dir >= 0 && c.i + c.dir < c.names.length ? c.i + c.dir : c.i;
        this.h.onTour({ kind: 'line', ride: true, i: Math.max(0, c.i), n: c.stopU.length, moving: at < 0,
          title: at < 0 ? 'On the way to ' + c.names[next] : c.names[at],
          kindLabel: at < 0 ? (c.stages[next] || '') : (c.stages[at] || ''),
          text: at < 0 ? 'The next stop on the line from idea to live.' : 'Stop ' + (at + 1) + ' of ' + c.stopU.length + (c.stages[at] ? ', ' + c.stages[at] : '') + ': ' + c.counts[at] + (c.counts[at] === 1 ? ' project' : ' projects') + ' here.' });
      }
    }
  }

  /* ---- the live sites: small islands with beacons, and a ferry to each ---- */
  _buildSites() {
    this.siteObjs = new Map();
    const n = this.sites.length;
    if (!n) return;
    const CAP = this.plate, R = CAP * 0.68;
    const geos = [], edges = [];
    this.sites.forEach((s, i) => {
      const a = (i / n) * Math.PI * 2 + 0.35, x = Math.cos(a) * R, z = Math.sin(a) * R;
      const r = 6 + Math.min(8, s.count || 1) * 0.55;
      const blob = roundPoly(blobPolygon(r, 12, 0.22, hash32(s.id)), r * 0.35, 4);
      const shape = new THREE.Shape();
      blob.forEach((q, k) => (k ? shape.lineTo(q[0], q[1]) : shape.moveTo(q[0], q[1])));
      const g = new THREE.ExtrudeGeometry(shape, { depth: SLAB - 0.16, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.14, bevelSegments: 2 });
      g.rotateX(Math.PI / 2); g.translate(x, SLAB - 0.08, z);
      geos.push(P.paint(g, 'card'));
      blob.forEach((q, k) => { const b = blob[(k + 1) % blob.length]; edges.push(x + q[0] * 1.02, SLAB + 0.01, z + q[1] * 1.02, x + b[0] * 1.02, SLAB + 0.01, z + b[1] * 1.02); });
      const lh = P.beacon(this.propMat, this.accentMat);
      lh.position.set(x, SLAB, z);
      this.props.add(lh);
      this._pickable(lh, { type: 'site', id: s.id, kindLabel: 'Live site', title: s.name, text: (s.count || 0) + ((s.count || 0) === 1 ? ' project runs here.' : ' projects run here.') + ' Select it to see them.' });
      const el = document.createElement('a');
      el.className = 'hwc-chip hwc-chip-site';
      el.href = '#/live/' + encodeURIComponent(s.id);
      el.tabIndex = -1;
      el.innerHTML = '<span class="hwc-dot" aria-hidden="true"></span><span class="hwc-chip-name"></span><span class="hwc-chip-n">' + (s.count || 0) + '</span>';
      el.querySelector('.hwc-chip-name').textContent = s.name;
      this._addLabel(el, x, 10.5, z, { role: 'site', site: s });
      this.siteObjs.set(s.id, { cap: lh.userData.cap, x, z, a, r, name: s.name });
    });
    const land = new THREE.Mesh(mergeGeometries(geos, false), this.propMat);
    land.receiveShadow = true; land.castShadow = true;
    this.props.add(land);
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3));
    this.props.add(new THREE.LineSegments(eg, this.edgeMat));
    /* a ferry for every project that runs on a site, gliding over the table */
    const trips = [];
    this.towers.forEach((t) => {
      if (t.type !== 'project' || t.item.retired) return;
      (t.item.runs || []).forEach((id) => { const o = this.siteObjs.get(id); if (o) trips.push({ t, o, id }); });
    });
    if (!trips.length) return;
    const boats = new THREE.InstancedMesh(P.boatGeometry(), this.propMat, trips.length);
    trips.forEach((tr) => {
      const k = trips.filter((x) => x.id === tr.id).indexOf(tr), side = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 2.2;
      const nx = -Math.sin(tr.o.a), nz = Math.cos(tr.o.a);
      tr.from = new THREE.Vector3(Math.cos(tr.o.a) * CAP * 0.5 + nx * side, 0.02, Math.sin(tr.o.a) * CAP * 0.5 + nz * side);
      tr.to = new THREE.Vector3(tr.o.x - Math.cos(tr.o.a) * (tr.o.r + 2) + nx * side * 0.4, 0.02, tr.o.z - Math.sin(tr.o.a) * (tr.o.r + 2) + nz * side * 0.4);
      tr.period = 20000 + unit(tr.t.item.key + tr.id, 'b') * 10000; tr.phase = unit(tr.t.item.key + tr.id, 'p');
    });
    boats.castShadow = true; boats.frustumCulled = false;
    this.props.add(boats);
    this._pickable(boats, { type: 'boats', trips });
    this.movers.push({ kind: 'boats', o: boats, trips });
  }
  /* The selected project's site grows its cap a little, with a dashed route from its building. */
  _lightSites(t) {
    if (this.siteRoutes) { this.props.remove(this.siteRoutes); this.siteRoutes.geometry.dispose(); this.siteRoutes = null; }
    if (!this.siteObjs) return;
    const on = new Set(t && t.type === 'project' ? (t.item.runs || []) : []);
    this.siteObjs.forEach((o, id) => { o.cap.userData.target = on.has(id) ? 1.35 : 1; });
    if (!on.size) return;
    const pts = [];
    on.forEach((id) => {
      const o = this.siteObjs.get(id);
      if (!o) return;
      const a = new THREE.Vector3(t.x, BASE + t.h, t.z), b = new THREE.Vector3(o.x, 8.5, o.z);
      const mid = a.clone().lerp(b, 0.5); mid.y += 16;
      const cv = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(40);
      for (let i = 0; i < cv.length - 1; i++) pts.push(cv[i], cv[i + 1]);
    });
    if (!pts.length) return;
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    this.siteRoutes = new THREE.LineSegments(g, this.routeMat);
    this.siteRoutes.computeLineDistances();
    this.props.add(this.siteRoutes);
  }

  /* ---- life in the town, all from the data ----
     people: changes in the last 30 days, walking round their project's block
     birds:  open issues and pull requests, gliding round the project's building
     clouds: a project nobody has changed for over a year */
  _buildLife() {
    const projects = this.towers.filter((t) => t.type === 'project' && !t.item.retired);
    const walkers = [];
    projects.forEach((t) => {
      const n = Math.min(t.item.recent || 0, 6);
      if (!n) return;
      const s = plotToSite(t.plot), c = [s.x, s.z];
      const pts = t.plot.map((q) => { const dx = q[0] - c[0], dz = q[1] - c[1], L = Math.hypot(dx, dz) || 1; return [q[0] + dx / L * 0.75, q[1] + dz / L * 0.75]; });
      const lens = [0];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; lens.push(lens[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
      const loop = { pts, lens, total: lens[lens.length - 1] };
      if (loop.total < 4) return;
      for (let i = 0; i < n; i++) walkers.push({ t, loop, s: unit(t.item.key, 'w' + i), v: (0.5 + unit(t.item.key, 'v' + i) * 0.5) * (i % 2 ? 1 : -1), off: (unit(t.item.key, 'o' + i) - 0.5) * 0.5 });
    });
    if (walkers.length) {
      const people = new THREE.InstancedMesh(P.personGeometry(), this.propMat, walkers.length);
      people.castShadow = true; people.frustumCulled = false;
      this.props.add(people);
      this._pickable(people, { type: 'people', walkers });
      this.movers.push({ kind: 'people', o: people, walkers });
    }
    const flock = [];
    projects.forEach((t) => { for (let i = 0; i < Math.min(t.item.issues || 0, 5); i++) flock.push({ t, i, n: Math.min(t.item.issues, 5), sp: 0.7 + unit(t.item.key, 'bs' + i) * 0.5 }); });
    if (flock.length) {
      const birds = new THREE.InstancedMesh(P.birdGeometry(), this.propMat2, flock.length);
      birds.frustumCulled = false;
      this.props.add(birds);
      this._pickable(birds, { type: 'birds', flock });
      this.movers.push({ kind: 'birds', o: birds, flock });
    }
    projects.filter((t) => t.item.stale).forEach((t) => {
      const cl = new THREE.Mesh(P.cloudGeometry(hash32(t.item.key) % 997), this.propMat);
      cl.scale.setScalar(0.32);
      const y = BASE + t.h + 7;
      cl.position.set(t.x, y, t.z);
      cl.castShadow = true;
      this.props.add(cl);
      t.extras.push(cl);
      const when = t.item.lastChange ? new Date(t.item.lastChange).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'over a year ago';
      this._pickable(cl, { type: 'project', main: t, kindLabel: 'A cloud', title: t.item.name, text: 'Nobody has changed it for over a year. The last change was in ' + when + '.' });
      this.movers.push({ kind: 'cloud', o: cl, x: t.x, z: t.z, y, ph: unit(t.item.key, 'c') * 6 });
    });
  }
  _stepMovers(now, dt) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
    this.movers.forEach((mv) => {
      if (mv.kind === 'cloud') {
        mv.o.position.set(mv.x + Math.sin(now * 0.00018 + mv.ph) * 1.2, mv.y + Math.sin(now * 0.0004 + mv.ph) * 0.25, mv.z + Math.cos(now * 0.00015 + mv.ph) * 1.2);
      } else if (mv.kind === 'boats') {
        mv.trips.forEach((tr, i) => {
          const k = ((now / tr.period) + tr.phase) % 1, back = k > 0.5, u = back ? (1 - k) * 2 : k * 2;
          p.lerpVectors(tr.from, tr.to, easeInOut(u));
          const dx = (tr.to.x - tr.from.x) * (back ? -1 : 1), dz = (tr.to.z - tr.from.z) * (back ? -1 : 1);
          q.setFromAxisAngle(YAXIS, Math.atan2(-dz, dx)); s.set(1.3, 1.3, 1.3);
          m.compose(p, q, s); mv.o.setMatrixAt(i, m);
        });
        mv.o.instanceMatrix.needsUpdate = true;
        mv.o.boundingSphere = null;
      } else if (mv.kind === 'birds') {
        mv.flock.forEach((b, i) => {
          const t = b.t, a = now * 0.00028 * b.sp + (b.i / b.n) * Math.PI * 2, r = t.w * 0.7 + 2.5 + (b.i % 2) * 1.2;
          p.set(t.x + Math.cos(a) * r, BASE + t.h + 3 + Math.sin(now * 0.0007 + b.i) * 0.7 + b.i * 0.4, t.z + Math.sin(a) * r);
          q.setFromAxisAngle(YAXIS, -a);
          s.set(0.9, 0.45 + Math.abs(Math.sin(now * 0.0035 * b.sp + b.i * 1.3)) * 0.55, 0.9);   /* slow, uneven wingbeats */
          m.compose(p, q, s); mv.o.setMatrixAt(i, m);
        });
        mv.o.instanceMatrix.needsUpdate = true;
        mv.o.boundingSphere = null;
      } else if (mv.kind === 'people') {
        mv.walkers.forEach((w, i) => {
          const L = w.loop;
          w.s = (w.s + (w.v * dt) / L.total + 1) % 1;
          const d = w.s * L.total;
          let k = 1; while (k < L.lens.length - 1 && L.lens[k] < d) k++;
          const a = L.pts[k - 1], b = L.pts[k % L.pts.length], f = (d - L.lens[k - 1]) / Math.max(1e-6, L.lens[k] - L.lens[k - 1]);
          const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
          p.set(a[0] + dx * f - dz / len * w.off, BASE - 0.06, a[1] + dz * f + dx / len * w.off);
          q.setFromAxisAngle(YAXIS, Math.atan2(dx * Math.sign(w.v), dz * Math.sign(w.v)));
          s.set(1.2, 1.2, 1.2);
          m.compose(p, q, s); mv.o.setMatrixAt(i, m);
        });
        mv.o.instanceMatrix.needsUpdate = true;
        mv.o.boundingSphere = null;
      }
    });
  }

  /* ---- inside a project: folders are blocks, files are buildings ---- */
  _plateFor(n) { return clamp(Math.sqrt(Math.max(1, n)) * 5.4, 72, 240); }

  _layoutSubtree(node, poly, out, depth = 0) {
    const items = [];
    node.dirs.forEach((dd) => items.push({ kind: 'dir', node: dd, value: dd.value }));
    node.files.forEach((f) => items.push({ kind: 'file', file: f, value: f.value }));
    if (!items.length) return;
    items.sort((a, b) => b.value - a.value);
    const PL = this.plate;
    layoutPoly(poly, items, (it, plot) => {
      if (it.kind === 'dir') this._layoutSubtree(it.node, plot, out, depth + 1);
      else out.push({ file: it.file, site: plotToSite(plot) });
    }, { pad: depth === 0 ? PL * 0.010 : PL * 0.005, leafPad: PL * 0.004, jitter: 0.55 });
  }

  _buildInside() {
    const lv = this.level, root = this.roots.get(lv.repo);
    this.trees_ = [];
    this._propFiles = 0;
    if (!root) return;
    const node = lv.kind === 'repo' ? root : descend(root, lv.path);
    if (!node) return;
    const items = [];
    node.dirs.forEach((dd, name) => items.push({ kind: 'dir', name, node: dd, value: dd.value }));
    if (node.files.length) items.push({ kind: 'files', name: lv.kind === 'repo' ? 'Top level' : 'In this folder', files: node.files, value: node.files.reduce((s, f) => s + f.value, 0) });
    if (!items.length) return;
    items.sort((a, b) => b.value - a.value);
    const PL = this._plateFor(node.count);
    this._setPlate(PL);
    const town = blobPolygon(PL * 0.47, 22, 0.14, 0x6D44E0);
    seedPlan(0x2B6D44E0);
    const sig = this.sigs.get(lv.repo) || { verticality: 1, slender: 0.9, twist: 0, shade: 0 };
    const now = performance.now();
    let order = 0;
    layoutPoly(town, items, (it, plot) => {
      const cells = [];
      if (it.kind === 'dir') this._layoutSubtree(it.node, plot, cells);
      else layoutPoly(plot, it.files.map((f) => ({ file: f, value: f.value })),
        (x, fp) => cells.push({ file: x.file, site: plotToSite(fp) }), { pad: PL * 0.010, leafPad: PL * 0.006, jitter: 0.55 });
      if (!cells.length) return;
      const c = polyCentroid(plot);
      const path = (lv.kind === 'repo' ? '' : lv.path + '/') + it.name;
      const d = {
        key: path, label: it.kind === 'dir' ? it.name + '/' : it.name,
        sub: (it.kind === 'dir' ? it.node.count : it.files.length) + ' files',
        loose: it.kind !== 'dir', plot, cx: c[0], cz: c[1],
        radius: Math.max(inradiusAt(plot, c), Math.sqrt(polyArea(plot)) * 0.42),
        target: it.kind === 'dir' ? { kind: 'dir', repo: lv.repo, path } : null,
        towers: [], lots: [], count: cells.length,
        t0: REDUCED.matches ? now - 9999 : now + order++ * 90
      };
      this.districts.push(d);
      this._addFiles(d, cells, sig);
      this._dirLabel(d);
    }, { pad: PL * 0.020, leafPad: PL * 0.014, jitter: 0.42 });
    this._rankLabels();
  }

  _addFiles(d, cells, sig) {
    let maxSize = 1;
    cells.forEach((c) => { maxSize = Math.max(maxSize, c.file.size || 0); });
    const ranked = cells.slice().sort((a, b) => (a.file.size || 0) - (b.file.size || 0));
    const pctOf = new Map();
    ranked.forEach((c, i) => pctOf.set(c, ranked.length > 1 ? i / (ranked.length - 1) : 1));
    const landmark = ranked[ranked.length - 1];
    const owner = { repo: this.level.repo };
    cells.forEach((c) => {
      const f = c.file, raw = { p: f.path, s: f.size, h: f.sha };
      const foot = Math.min(13, Math.max(0.4, Math.min(Math.sqrt(c.site.area) * 0.62, c.site.r * 1.9) * (sig.slender || 0.9)));
      /* the same props as in the town: fonts are columns, SVGs statues, pictures carved stones */
      if (IS_FONT.test(f.path)) { this._column(raw, c.site, foot, d.t0, owner); return; }
      if (IS_SVG.test(f.path)) { this._statue({ sha: f.sha, path: f.path }, c.site, d.t0, owner, clamp(foot * 0.8, 1.2, 3)); return; }
      if (IS_IMG.test(f.path) && (f.size || 0) <= 900000) { this._stone(raw, c.site.x, c.site.z, d.t0, owner, null); return; }
      const depth = (f.path.match(/\//g) || []).length;
      const arch = variantFor(f.path, pctOf.get(c), c === landmark, sig, depth);
      const mag = Math.pow((f.size || 0) / maxSize, 0.38);
      const h = Math.min((1.4 + mag * MAX_H) * (sig.verticality || 1), foot * 4.5, MAX_H * 1.4);
      this._place(arch, { type: 'file', item: f, district: d, x: c.site.x, z: c.site.z, w: foot, dd: foot,
        rot: c.site.angle + (sig.twist || 0) * (unit(f.path, 'tw') - 0.5), h, tone: fileTone(f.path), shade: 1 + (sig.shade || 0) * 0.5,
        facade: facadeOf(lv.repo + '/' + (d.label || d.key || '')) + (unit(f.path, 'fv') < 0.18 ? 1 : 0), mix: 0.08 + unit(f.path, 'fm') * 0.42,
        order: d.towers.length / Math.max(1, cells.length), seed: unit(f.path, 's'), jitter: unit(f.path, 'j') * 200 });
    });
  }

  /* Put one building into the instanced batch for its form. */
  _place(arch, t, geoFn) {
    const b = this._batch(arch, 1, geoFn);
    const i = b.n++;
    b.hs[i] = t.h; b.seeds[i] = t.seed || 0;
    Object.assign(t, { batch: b, i, lit: 0, litTarget: 0, lift: 0, liftTarget: 0, sink: 0, sinkTarget: 0, sinkE: 0, curH: 0.03 });
    if (!b.toneBatch) b.mesh.setColorAt(i, this._towerColour(t, new THREE.Color()));
    b.towers[i] = t;
    t.district.towers.push(t);
    this.towers.push(t);
    b.dirty = true;
    return t;
  }

  _batch(arch, want, geoFn) {
    let b = this.batches.get(arch);
    const need = (b ? b.n : 0) + want;
    if (!b || b.cap < need) {
      const cap = Math.max(need * 2, 32);
      const geo = geoFn ? geoFn() : variantGeometry(arch).clone();
      const toneBatch = !!geoFn;                         /* ruins are painted props, with no windows and no instance colour */
      const mesh = new THREE.InstancedMesh(geo, toneBatch ? this.propMat : this.towerMat, cap);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      const lit = new Float32Array(cap), hs = new Float32Array(cap), seeds = new Float32Array(cap);
      geo.setAttribute('aLit', new THREE.InstancedBufferAttribute(lit, 1));
      geo.setAttribute('aH', new THREE.InstancedBufferAttribute(hs, 1));
      geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
      const next = { arch, mesh, cap, lit, hs, seeds, towers: [], n: 0, litAttr: geo.getAttribute('aLit'), dirty: true, toneBatch };
      if (!toneBatch) mesh.setColorAt(0, new THREE.Color(1, 1, 1));
      if (b) {
        const c = new THREE.Color();
        for (let i = 0; i < b.n; i++) {
          next.hs[i] = b.hs[i]; next.seeds[i] = b.seeds[i]; next.lit[i] = b.lit[i];
          next.towers[i] = b.towers[i]; b.towers[i].batch = next;
          if (!toneBatch) { b.mesh.getColorAt(i, c); mesh.setColorAt(i, c); }
        }
        next.n = b.n;
        this.rig.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.dispose();
      }
      mesh.count = next.n;
      this.rig.add(mesh);
      this.batches.set(arch, next);
      b = next;
    }
    return b;
  }

  /* District plots like cards: rounded, low, soft-edged, with a hairline; a faint lot under each
     project and a square in the middle. */
  _buildGround() {
    const geos = [], edges = [];
    const slab = (poly, y0, depth, tone, rad, soft) => {
      if (!poly || poly.length < 3) return null;
      const rp = roundPoly(poly, rad, 4), shape = new THREE.Shape();
      rp.forEach((q, i) => (i ? shape.lineTo(q[0], q[1]) : shape.moveTo(q[0], q[1])));
      shape.closePath();
      const b = Math.min(soft, depth * 0.45);
      const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, depth - 2 * b), bevelEnabled: b > 0.005, bevelThickness: b, bevelSize: b * 1.6, bevelSegments: 2, curveSegments: 4 });
      g.rotateX(Math.PI / 2);
      g.translate(0, y0 + depth - b, 0);
      geos.push(P.paint(g, tone));
      return rp;
    };
    const estate = this.level.kind === 'estate';
    this.districts.forEach((d) => {
      const rp = slab(d.plot, 0, SLAB, d.loose ? 'lot' : 'card', estate ? 3.2 : 2, 0.12);
      if (rp) {
        const k = 1 + 0.1 / Math.max(1, d.radius);     /* the hairline sits just outside the top edge */
        rp.forEach((q, i) => {
          const b = rp[(i + 1) % rp.length];
          edges.push(d.cx + (q[0] - d.cx) * k, SLAB + 0.012, d.cz + (q[1] - d.cz) * k, d.cx + (b[0] - d.cx) * k, SLAB + 0.012, d.cz + (b[1] - d.cz) * k);
        });
      }
      if (estate) {
        d.lots.forEach((p) => slab(p, SLAB - 0.02, 0.1, 'lot', 1.2, 0.03));
        if (d.plaza) slab(d.plaza.plot, SLAB - 0.02, 0.12, 'lot', 1.2, 0.03);
      }
    });
    if (!geos.length) return;
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) return;
    this.ground = new THREE.Mesh(merged, this.propMat);
    this.ground.receiveShadow = true; this.ground.castShadow = true;
    this.rig.add(this.ground);
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3));
    this.groundEdge = new THREE.LineSegments(eg, this.edgeMat);
    this.rig.add(this.groundEdge);
  }

  _buildTrees() {
    const list = this.trees_ || [];
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(this.treeGeo, this.propMat, list.length);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    list.forEach((t, i) => {
      p.set(t.x, BASE, t.z); s.set(t.s, t.s, t.s); q.setFromAxisAngle(YAXIS, t.rnd * 6.28);
      m.compose(p, q, s); mesh.setMatrixAt(i, m);
    });
    this.treeMesh = mesh;
    this.rig.add(mesh);
    this._pickable(mesh, { type: 'info', kindLabel: 'A tree by the door', title: 'Step-by-step guides', text: 'A tree by a building’s door: that project has step-by-step guides on its page.' });
  }

  /* ================= labels ================= */
  _addLabel(el, x, y, z, data) {
    const o = new CSS2DObject(el);
    o.position.set(x, y, z);
    o.userData = Object.assign({ a: -1 }, data);
    el.style.visibility = 'hidden'; el.style.opacity = '0';
    this.rig.add(o); this.labels.push(o);
    return o;
  }
  _setA(o, a) {
    if (Math.abs(o.userData.a - a) < 0.02) return;
    o.userData.a = a;
    const s = o.element.style;
    s.opacity = a.toFixed(2);
    s.visibility = a > 0.02 ? 'visible' : 'hidden';
    s.pointerEvents = a > 0.5 && this.interactive ? 'auto' : 'none';
  }
  /* A district's name as a site eyebrow (the gradient pill, then sentence case), lying at the plot's
     front edge. */
  _hoodLabel(d) {
    const el = document.createElement('button');
    el.type = 'button';
    el.tabIndex = -1;
    el.className = 'hwc-eyebrow';
    el.innerHTML = '<span class="hwc-eb-pill" aria-hidden="true"></span><span class="hwc-eb-name"></span><span class="hwc-eb-n"></span>';
    el.querySelector('.hwc-eb-name').textContent = d.label;
    el.querySelector('.hwc-eb-n').textContent = d.count;
    el.addEventListener('click', (e) => { e.stopPropagation(); this.selectHood(d.hood.id); });
    d.label_ = this._addLabel(el, d.cx, SLAB + 0.2, d.cz, { role: 'hood', district: d });
    this._placeHoodLabel(d);
  }
  _placeHoodLabel(d) {
    if (!d.label_) return;
    const cam = this.camera.position, tg = this.controls.target;
    let vx = cam.x - tg.x, vz = cam.z - tg.z;
    const L = Math.hypot(vx, vz) || 1; vx /= L; vz /= L;
    let best = null, bv = -Infinity;
    d.plot.forEach((q) => { const v = (q[0] - d.cx) * vx + (q[1] - d.cz) * vz; if (v > bv) { bv = v; best = q; } });
    if (!best) return;
    const k = 0.86;
    d.label_.position.set(d.cx + (best[0] - d.cx) * k, SLAB + 0.2, d.cz + (best[1] - d.cz) * k);
  }
  /* A project's chip, like the films' orbit chips. Selected, it opens into a small card. */
  _buildingLabel(t) {
    const it = t.item, el = document.createElement('button');
    el.type = 'button';
    el.tabIndex = -1;
    el.className = 'hwc-chip hwc-chip-b' + (it.retired ? ' is-ruin' : '') + (it.paused ? ' is-paused' : '');
    el.innerHTML = '<span class="hwc-chip-cat"></span><span class="hwc-chip-row">' +
      (it.demo && !it.retired ? '<span class="hwc-play" aria-hidden="true"></span>' : '') +
      (it.live && !it.paused ? '<span class="hwc-dot" aria-hidden="true"></span>' : '') +
      '<span class="hwc-chip-name"></span></span><span class="hwc-chip-status"></span>';
    el.querySelector('.hwc-chip-name').textContent = it.name;
    el.querySelector('.hwc-chip-cat').textContent = it.catLabel || '';
    el.querySelector('.hwc-chip-status').textContent = it.statusLabel || '';
    el.addEventListener('click', (e) => { e.stopPropagation(); this.select(it.key); });
    t.label = this._addLabel(el, t.x, BASE + t.h + 2.4, t.z, { role: 'building', tower: t });
  }
  _dirLabel(d) {
    const el = document.createElement('button');
    el.type = 'button';
    el.tabIndex = -1;
    el.className = 'hwc-chip hwc-chip-dir' + (d.target ? '' : ' is-leaf');
    el.innerHTML = (d.target ? '<span class="hwc-folder" aria-hidden="true"></span>' : '') + '<span class="hwc-chip-name"></span><span class="hwc-chip-n"></span>';
    el.querySelector('.hwc-chip-name').textContent = d.label;
    el.querySelector('.hwc-chip-n').textContent = d.sub;
    el.addEventListener('click', (e) => { e.stopPropagation(); if (d.target) this.go(d.target); else this._flyTo(new THREE.Vector3(d.cx, 6, d.cz), Math.max(30, d.radius * 3.6)); });
    const top = d.towers.reduce((m, t) => Math.max(m, t.h), 0);
    d.label_ = this._addLabel(el, d.cx, BASE + Math.min(top, MAX_H * 0.6) + 3, d.cz, { role: 'dir', district: d, area: d.radius * d.radius });
  }

  _updateLabels() {
    const cam = this.camera.position, tg = this.controls.target;
    const dist = cam.distanceTo(tg);
    if (!this.interactive) {            /* a preview: the districts' names only */
      if (this.frame % 6 === 0 || !this._shown) {
        this.districts.forEach((d) => this._placeHoodLabel(d));
        this._shown = this._declutter(this.labels.filter((o) => o.userData.role === 'hood'));
      }
      this.labels.forEach((o) => this._setA(o, this._shown.has(o) ? 1 : 0));
      return;
    }
    if (this.walking) {
      if (this.frame % 6 === 0 || !this._shown) {
        const near = this.labels.filter((o) => o.userData.role === 'building')
          .map((o) => [o, Math.hypot(o.position.x - cam.x, o.position.z - cam.z)]).filter((x) => x[1] < 34)
          .sort((a, b) => a[1] - b[1]).map((x) => x[0]);
        this._shown = this._declutter(near);
      }
      this.labels.forEach((o) => this._setA(o, this._shown.has(o) ? 1 : 0));
      return;
    }
    if (this.level.kind === 'estate') {
      const CAP = this.plate;
      const hoodA = clamp((dist - CAP * 0.45) / (CAP * 0.3), 0, 1);
      if (this.frame % 6 === 0 || !this._shown) {
        this.districts.forEach((d) => this._placeHoodLabel(d));
        this.towers.forEach((t) => { if (t.label) t.label.position.y = BASE + (t.curH || t.h) + 2.4; });
        const want = [];
        const hov = this.hover && this.hover.tower;
        if (this.selected && this.selected.label) want.push(this.selected.label);
        if (hov && hov.label && hov !== this.selected) want.push(hov.label);
        const hoods = this.labels.filter((o) => o.userData.role === 'hood')
          .sort((a, b) => (this.hoodSel === b.userData.district.hood.id) - (this.hoodSel === a.userData.district.hood.id) || b.userData.district.count - a.userData.district.count);
        const hoodList = hoodA > 0.05 ? hoods : hoods.filter((o) => this.hoodSel === o.userData.district.hood.id);
        const sites = this.labels.filter((o) => o.userData.role === 'site').sort((a, b) => (b.userData.site.count || 0) - (a.userData.site.count || 0));
        let pool = this.towers.filter((t) => t.type === 'project');
        if (this.filter) pool = pool.filter((t) => this.filter[t.item.key]);
        const K = dist < CAP * 5 ? Math.round(clamp(5600 / dist, 4, 18)) : 0;
        const near = pool.map((t) => [t, Math.hypot(t.x - tg.x, t.z - tg.z)]).sort((a, b) => a[1] - b[1]);
        const bl = [];
        if (this.filter && pool.length <= 12) near.forEach(([t]) => bl.push(t.label));
        else near.slice(0, K).forEach(([t, dd]) => { if (dd < CAP * 0.5) bl.push(t.label); });
        const hubs = (this.hubLabels || []).slice().sort((a, b) => b.userData.count - a.userData.count);
        if (dist < CAP * 2.2) want.push(...bl, ...hubs, ...hoodList, ...sites); else want.push(...hubs, ...hoodList, ...bl, ...sites);
        this._shown = this._declutter(want);
      }
      (this.hubLabels || []).forEach((o) => this._setA(o, this._shown.has(o) ? 1 : 0));
      this.labels.forEach((o) => {
        const u = o.userData;
        if (!this._shown.has(o)) { this._setA(o, 0); return; }
        if (u.role === 'hood') {
          let a = this.hoodSel === u.district.hood.id ? 1 : hoodA;
          if (this.filter && !u.matches) a *= 0.5;
          this._setA(o, a);
        } else this._setA(o, 1);
      });
      return;
    }
    const k = Math.round(clamp(2400 / Math.max(dist, 1), 4, 30));
    const near = this.plate * 0.34;
    const hoverD = this.hover && this.hover.tower ? this.hover.tower.district : null;
    if (this.frame % 6 === 0 || !this._shown) {
      const want = this.labels.filter((o) => {
        const d2 = Math.hypot(o.position.x - tg.x, o.position.z - tg.z);
        return o.userData.district === hoverD || o.userData.rank < k || (dist < this.plate * 0.8 && d2 < near);
      }).sort((a, b) => (b.userData.district === hoverD) - (a.userData.district === hoverD) || a.userData.rank - b.userData.rank);
      this._shown = this._declutter(want);
    }
    const a = clamp((dist - 10) / 30, 0, 1);
    this.labels.forEach((o) => this._setA(o, this._shown.has(o) ? a : 0));
  }
  /* Keep labels from sitting on each other: earlier in the list wins. */
  _declutter(list) {
    const placed = [], ok = new Set(), v = new THREE.Vector3();
    for (const o of list) {
      if (!o || ok.has(o)) continue;
      v.copy(o.position).project(this.camera);
      if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue;
      const x = (v.x + 1) / 2 * this._w, y = (1 - v.y) / 2 * this._h;
      const el = o.element;
      if (el.offsetWidth) { o.userData.ew = el.offsetWidth; o.userData.eh = el.offsetHeight; }
      const w = (o.userData.ew || 150) / 2 + 3, h = (o.userData.eh || 28) / 2 + 2;
      const r = [x - w, y - h, x + w, y + h];
      if (r[0] < -8 || r[2] > this._w + 8 || r[1] < -8 || r[3] > this._h + 8) continue;
      if (placed.some((p) => r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1])) continue;
      placed.push(r); ok.add(o);
    }
    return ok;
  }
  _rankLabels() {
    const dirs = this.labels.filter((o) => o.userData.role === 'dir').sort((a, b) => b.userData.area - a.userData.area);
    dirs.forEach((o, i) => { o.userData.rank = i; });
  }

  /* ================= selection ================= */
  select(key, fly = true) {
    if (this.tour || this.ride) this.stopTour(true), this.h.onTour(null);
    const t = this.towers.find((x) => x.type === 'project' && x.item.key === key) || null;
    this.hoodSel = null; this.focusAt = null;
    this._setSelected(t);
    if (!t) { this.h.onSelect(null); return; }
    if (fly) this._flyTo(new THREE.Vector3(t.x, BASE + t.h * 0.45, t.z), Math.max(56, t.h * 3.6 + 34), 2400);
    this.h.onSelect({ type: 'project', key });
  }
  selectHood(id) {
    const d = this.districts.find((x) => x.hood && x.hood.id === id);
    if (!d) return;
    this._setSelected(null);
    this.hoodSel = id; this.focusAt = null;
    this._flyTo(new THREE.Vector3(d.cx, 4, d.cz), Math.max(110, d.radius * 6.5), 2600);
    this.h.onSelect({ type: 'hood', id });
  }
  _selectFile(file) {
    const path = file.path || file.p, size = file.size != null ? file.size : file.s;
    this.h.onSelect({ type: 'file', repo: this.level.repo, path, name: path.split('/').pop(), size, sizeText: fmtBytes(size), typeLabel: fileTypeLabel(path) });
  }
  clearSelection() { this._setSelected(null); this.hoodSel = null; this.focusAt = null; if (!this.tour) this.tourRing = false; this.h.onSelect(null); }
  _setSelected(t) {
    if (this.selected && this.selected !== t) { this.selected.litTarget = 0; if (this.selected.label) this.selected.label.element.classList.remove('is-sel'); }
    this.selected = t;
    this._shown = null;
    if (t) {
      t.litTarget = 2; t.delay = 0;
      this._ringAt(t.x, t.z, t.w * 0.82 + 1.6);
      if (t.label) t.label.element.classList.add('is-sel');
    } else if (!this.tourRing) this.ringTarget = 0;
    if (this.level.kind === 'estate') { this._lightSites(t); this._linkSel(t); }
    this._previewPick();
  }
  _ringAt(x, z, r) {
    this.ring.position.set(x, BASE + 0.05, z); this.ring.scale.setScalar(r);
    this.dashRing.position.set(x, BASE + 0.06, z); this.dashRing.scale.setScalar(r);
    this.dashMat.dashSize = 0.05; this.dashMat.gapSize = 0.045;
    this.ringTarget = 1;
  }

  /* ================= the demo preview ================= */
  /* Point at a demo building (or select it) and its own picture rises over it, in a card. The demo
     never runs here: only Try the demo runs it, in the hub's sealed frame. */
  _previewPick() {
    const hov = this.hover && this.hover.tower;
    const sel = this.selected;
    const want = hov && hov.type === 'project' && hov.item.demo && !hov.item.retired ? hov : (sel && sel.type === 'project' && sel.item.demo ? sel : null);
    if (want === this.prev.t) return;
    this.prev.t = want;
    this.prev.a = 0;
    clearTimeout(this._prevT);
    if (!want) return;
    this.prev.cap.textContent = want.item.name;
    this.prev.pic.innerHTML = '<div class="hwc-preview-wait">Loading the preview</div>';
    this._prevT = setTimeout(() => this._previewFill(want), want === sel ? 0 : 280);
  }
  _previewFill(t) {
    const key = t.item.key, cached = this.prev.cache.get(key);
    const show = (node) => { if (this.prev.t !== t) return; this.prev.pic.textContent = ''; this.prev.pic.appendChild(node); };
    if (cached) { show(cached); return; }
    this.h.preview(key).then((pv) => {
      let node = null;
      if (pv && pv.img) { node = document.createElement('img'); node.alt = ''; node.src = pv.img; }   /* a picture only: pointing never runs a demo */
      if (!node) { node = document.createElement('div'); node.className = 'hwc-preview-wait'; node.textContent = 'Select the building, then Try the demo'; }
      this.prev.cache.set(key, node);
      show(node);
    }).catch(() => {});
  }
  _stepPreview(now, dt) {
    const H = this.prev, t = H.t;
    const visible = t && !this.walking && this.level.kind === 'estate' && this.interactive;
    H.a = clamp(H.a + (visible ? dt * 3.3 : -dt * 4), 0, 1);          /* fades in by opacity, about 0.3 s */
    const on = H.a > 0.01 && t;
    this.prevObj.visible = !!on;
    if (!on) { H.el.style.opacity = '0'; return; }
    const top = BASE + (t.curH || t.h) + 6;
    this.prevObj.position.set(t.x, top, t.z);
    H.el.style.opacity = String(settle(H.a));
    /* keep the card inside the stage: slide it down over the building if it would be cut off */
    const v = this.prevObj.position.clone().project(this.camera), y = (1 - v.y) / 2 * this._h;
    const inner = H.inner || (H.inner = H.el.firstElementChild), hh = inner.offsetHeight || 200;
    const shift = Math.max(0, 12 - (y - hh));
    if (Math.abs((H.shift || 0) - shift) > 0.5) { H.shift = shift; inner.style.transform = 'translateY(calc(-50% + ' + shift.toFixed(1) + 'px))'; }
  }

  /* ================= search ================= */
  setFilter(set) {
    const sig = set ? Object.keys(set).sort().join('|') : null;
    if (sig === this._filterSig) return;
    this._filterSig = sig;
    this.filter = set;
    if (this.level.kind !== 'estate') return;
    this._applyFilter(true);
  }
  /* Physical, like cards on air that is switched off for some of them: the ones that do not match
     let go at their own moment, sink and fade; the ones that come back rise into their plots one by one. */
  _applyFilter(animate) {
    const set = this.filter, now = performance.now();
    this.towers.forEach((t) => {
      const key = t.item && (t.main ? t.main.item.key : t.item.key);
      const out = !!set && !(t.type === 'project' ? set[t.item.key] : set[t.main ? t.main.item.key : '']);
      t.sinkTarget = out ? 1 : 0;
      t.sinkAt = now + (animate && !REDUCED.matches ? unit(String(key), 'sink') * 400 : 0);
      if (!animate || REDUCED.matches) { t.sink = t.sinkTarget; t.sinkE = t.sink; }
    });
    this.districts.forEach((d) => {
      if (!d.label_) return;
      const m = set ? d.towers.filter((t) => t.type === 'project' && set[t.item.key]).length : d.count;
      d.label_.userData.matches = m;
      d.label_.element.querySelector('.hwc-eb-n').textContent = set ? m + ' of ' + d.count : d.count;
    });
    this.batches.forEach((b) => { b.dirty = true; });
    this._recolour();
    this._shown = null;
    if (set && animate) this.frameMatches();
  }
  frameMatches() {
    const projects = this.towers.filter((t) => t.type === 'project');
    const hits = projects.filter((t) => !this.filter || this.filter[t.item.key]);
    if (!hits.length || hits.length === projects.length) return;
    const box = new THREE.Box3();
    hits.forEach((t) => {
      box.expandByPoint(new THREE.Vector3(t.x - t.w, 0, t.z - t.w));
      box.expandByPoint(new THREE.Vector3(t.x + t.w, t.h, t.z + t.w));
    });
    const c = box.getCenter(new THREE.Vector3());
    this.userMoved = true;
    this._flyTo(c, Math.max(box.getSize(new THREE.Vector3()).length() * 0.5, 30) * 3.6, 2400);
  }

  /* ================= connections ================= */
  setLinks(on) {
    this.linksOn = !!on;
    if (this.level.kind !== 'estate') return;
    if (this.linksOn && !this.links) { this._buildLinks(); if (!this.userMoved && !this.selected) this.resetView(true); }
    if (!this.linksOn) this._clearLinks();
    this._shown = null;
  }
  /* Each shared tool is a point in the air round the town; a thin line runs to it from the roof of
     every project built with it. Lines are quiet ink; the selected project's lines turn violet. */
  _buildLinks() {
    this._clearLinks();
    const plats = this.platforms;
    if (!plats.length) return;
    const R = this.plate * 0.5, Y = MAX_H * 1.4;
    const hubs = plats.map((p, i) => {
      const a = (i / plats.length) * Math.PI * 2 - Math.PI / 2;
      return { ...p, pos: new THREE.Vector3(Math.cos(a) * R, Y + (i % 2) * 7, Math.sin(a) * R), count: 0 };
    });
    const byId = new Map(hubs.map((h) => [h.id, h]));
    const verts = [];
    this.linkCurves = [];
    this.towers.forEach((t) => {
      if (t.type !== 'project') return;
      (t.item.works || []).forEach((w) => {
        const hub = byId.get(w);
        if (!hub) return;
        hub.count++;
        const from = new THREE.Vector3(t.x, BASE + t.h, t.z);
        const mid = from.clone().lerp(hub.pos, 0.5); mid.y += 16;
        const pts = new THREE.QuadraticBezierCurve3(from, mid, hub.pos).getPoints(20);
        for (let k = 0; k < pts.length - 1; k++) verts.push(pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z);
        this.linkCurves.push({ t, pts });
      });
    });
    if (!verts.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    this.links = new THREE.LineSegments(g, this.linkMat);
    this.links.frustumCulled = false;
    this.rig.add(this.links);
    this.hubLabels = [];
    hubs.filter((h) => h.count).forEach((h) => {
      const el = document.createElement('a');
      el.className = 'hwc-chip hwc-chip-hub';
      el.href = '#/with/' + encodeURIComponent(h.id);
      el.tabIndex = -1;
      el.innerHTML = '<span class="hwc-chip-name"></span><span class="hwc-chip-n">' + h.count + '</span>';
      el.querySelector('.hwc-chip-name').textContent = h.label;
      const o = new CSS2DObject(el);
      o.position.copy(h.pos);
      o.userData = { a: -1, role: 'hub', count: h.count };
      el.style.visibility = 'hidden';
      this.rig.add(o);
      this.hubLabels.push(o);
    });
    this._linkSel(this.selected);
  }
  _linkSel(t) {
    if (this.linkSel) { this.rig.remove(this.linkSel); this.linkSel.geometry.dispose(); this.linkSel = null; }
    if (!this.links || !t) return;
    const verts = [];
    this.linkCurves.forEach((c) => { if (c.t !== t) return; for (let k = 0; k < c.pts.length - 1; k++) verts.push(c.pts[k].x, c.pts[k].y, c.pts[k].z, c.pts[k + 1].x, c.pts[k + 1].y, c.pts[k + 1].z); });
    if (!verts.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    this.linkSel = new THREE.LineSegments(g, this.linkSelMat);
    this.linkSel.frustumCulled = false;
    this.rig.add(this.linkSel);
  }
  _clearLinks() {
    [this.links, this.linkSel].forEach((o) => { if (o) { this.rig.remove(o); o.geometry.dispose(); } });
    this.links = null; this.linkSel = null; this.linkCurves = null;
    (this.hubLabels || []).forEach((o) => { this.rig.remove(o); if (o.element.parentNode) o.element.remove(); });
    this.hubLabels = [];
  }

  /* ================= tours: the town's collections, one by one ================= */
  collections() {
    const out = { statues: [], stones: [], columns: [], gardens: [], demos: [], ruins: [], sites: [], cranes: [], clouds: [] };
    const seen = new Set();
    this.pickables.forEach((m) => {
      const r = m.userData.ref;
      if (!r || !r.obj || seen.has(r) || !m.parent) return;
      seen.add(r);
      const pos = r.at ? r.at.clone() : r.obj.getWorldPosition(new THREE.Vector3());
      const it = { pos, title: r.title, kindLabel: r.kindLabel, text: r.text, main: r.main || null, ref: r, size: 6 };
      if (/Statue|icon|District/.test(r.kindLabel || '')) out.statues.push({ ...it, size: r.type === 'hood' ? 9 : 5 });
      else if (r.kindLabel === 'Carved stone') out.stones.push({ ...it, size: 3.5 });
      else if (r.kindLabel === 'Font column') out.columns.push({ ...it, size: 7 });
      else if (r.kindLabel === 'Garden') out.gardens.push({ ...it, size: 7 });
      else if (r.kindLabel === 'Crane') out.cranes.push({ ...it, size: 16 });
      else if (r.kindLabel === 'A cloud') out.clouds.push({ ...it, size: 10 });
      else if (r.type === 'site') out.sites.push({ ...it, size: 16 });
    });
    this.towers.forEach((t) => {
      if (t.type !== 'project') return;
      const it = { pos: new THREE.Vector3(t.x, BASE + t.h * 0.5, t.z), title: t.item.name, text: t.item.tagline, main: t, size: Math.max(9, t.h) };
      if (t.item.demo && !t.item.retired) out.demos.push({ ...it, kindLabel: 'Demo to try' });
      if (t.item.retired) out.ruins.push({ ...it, kindLabel: 'Retired project' });
    });
    return out;
  }
  tourCounts() {
    const c = this.collections();
    return { sculptures: c.statues.length + c.stones.length, columns: c.columns.length, demos: c.demos.length, gardens: c.gardens.length,
      ruins: c.ruins.length, sites: c.sites.length, clouds: c.clouds.length, line: this.cable ? this.cable.stopU.length : 0 };
  }
  startTour(kind) {
    this.stopTour(true);
    if (this.level.kind !== 'estate') return false;
    if (kind === 'line') {
      if (!this.cable) return false;
      this.clearSelection();
      this.ride = { at: -2 };
      this.userMoved = true; this.flight = null;
      this.controls.enabled = false;
      return true;
    }
    const c = this.collections();
    let list = kind === 'sculptures' ? c.statues.concat(c.stones) : (c[kind] || []);
    if (!list.length) return false;
    /* a path, not a jumble: start nearest the view and always go on to the nearest next one */
    const tg = this.controls.target, path = [];
    let here = new THREE.Vector3(tg.x, 0, tg.z);
    list = list.slice();
    while (list.length) {
      let bi = 0, bd = Infinity;
      list.forEach((it, i) => { const d = Math.hypot(it.pos.x - here.x, it.pos.z - here.z); if (d < bd) { bd = d; bi = i; } });
      const it = list.splice(bi, 1)[0]; path.push(it); here = it.pos;
    }
    this.tour = { kind, list: path, i: -1, t0: 0, paused: false };
    this.tourStep(1);
    return true;
  }
  tourStep(d) {
    const T = this.tour;
    if (!T) return;
    T.i = (T.i + d + T.list.length) % T.list.length;
    T.t0 = performance.now();
    const it = T.list[T.i];
    this.userMoved = true;
    if (it.main && (T.kind === 'demos' || T.kind === 'ruins')) {
      this._setSelected(it.main); this.focusAt = null;
      this.h.onSelect({ type: 'project', key: it.main.item.key });
    } else {
      this._setSelected(null);
      this.h.onSelect(null);
      this._ringAt(it.pos.x, it.pos.z, it.size * 0.42 + 1.4);
      this.tourRing = true;
      this.focusAt = it.pos.clone().setY(it.pos.y + it.size * 0.5 + 1.5);
    }
    /* things on the ground (gardens, stones, statues, columns) are seen from higher up, so tall
       neighbours do not hide them; buildings and islands from the usual angle */
    const low = /^(gardens|sculptures|columns)$/.test(T.kind);
    const at = new THREE.Vector3(it.pos.x, Math.max(it.pos.y, 2), it.pos.z);
    this._flyTo(at, low ? this._clearView(at, Math.max(30, it.size * 5)) : Math.max(20, it.size * 3.4), 2200, false, low ? DOWN_DIR : null);
    this._tourNotify();
  }
  _tourNotify() {
    const T = this.tour;
    if (!T) return;
    const it = T.list[T.i];
    this.h.onTour({ kind: T.kind, i: T.i, n: T.list.length, paused: T.paused, title: it.title, kindLabel: it.kindLabel, text: it.text, key: it.main ? it.main.item.key : null });
  }
  pauseTour(p) { if (this.tour) { this.tour.paused = p; this.tour.t0 = performance.now(); this._tourNotify(); } }
  stopTour(quiet) {
    const was = this.tour || this.ride;
    if (this.ride) { this.ride = null; this.controls.enabled = this.interactive; }
    this.tour = null; this.focusAt = null;
    if (this.tourRing) { this.tourRing = false; if (!this.selected) this.ringTarget = 0; }
    if (was && !quiet) { this.h.onTour(null); this.resetView(); }
  }

  /* How far back to look down at a spot so the camera is above every building round it. */
  _clearView(at, dist) {
    const around = this.towers.reduce((m, t) => (Math.hypot(t.x - at.x, t.z - at.z) < 22 ? Math.max(m, t.h) : m), 0);
    return Math.max(dist, (BASE + around + 9 - at.y) / DOWN_DIR.y);
  }

  /* ================= search: things in the town, not only projects ================= */
  searchThings(q) {
    q = String(q || '').toLowerCase().trim();
    if (q.length < 2) return [];
    const out = [], seen = new Set();
    this.pickables.forEach((m) => {
      const r = m.userData.ref;
      if (!r || seen.has(r) || !r.title || !r.obj || r.type === 'flags' || r.type === 'info' || r.roof) return;   /* roof marks repeat the project */
      seen.add(r);
      if (((r.kindLabel || '') + ' ' + r.title + ' ' + (r.text || '')).toLowerCase().indexOf(q) >= 0) out.push(r);
    });
    this.towers.forEach((t) => {
      if (t.type === 'file' && t.file && t.file.p.toLowerCase().indexOf(q) >= 0)
        out.push({ kindLabel: fileTypeLabel(t.file.p) + ' file', title: t.file.p.split('/').pop(), text: t.item.name + ': ' + t.file.p, tower: t, main: t.main });
    });
    return out.slice(0, 40);
  }
  focusThing(r) {
    if (!r) return;
    this.stopTour(true);
    const pos = new THREE.Vector3();
    if (r.tower) pos.set(r.tower.x, BASE + r.tower.h * 0.5, r.tower.z);
    else if (r.at) pos.copy(r.at);
    else if (r.obj) r.obj.getWorldPosition(pos);
    if (r.type === 'hood') { this.selectHood(r.id); return; }
    if (r.main) { this._setSelected(r.main); this.h.onSelect({ type: 'project', key: r.main.item.key }); }
    this._ringAt(pos.x, pos.z, r.tower ? r.tower.w * 0.8 + 1.3 : 3.2);
    this.tourRing = true;
    this.focusAt = pos.clone().setY(pos.y + 3);
    this.userMoved = true;
    const at = new THREE.Vector3(pos.x, Math.max(pos.y, 2), pos.z);
    this._flyTo(at, r.type === 'site' ? 60 : this._clearView(at, 34), 2200, false, r.type === 'site' ? null : DOWN_DIR);
  }

  /* ================= camera ================= */
  /* Measure, don't estimate: project the town's rim, the tallest buildings and (with Connections
     on) the tools in the air, then move the camera until they fill the stage, centred. */
  _frame() {
    /* on a wide stage the live sites' islands are in the picture too; on a narrow one, the town fills it */
    const wide = (this._w || 1) / (this._h || 1) >= 1.1;
    const pts = [], R = this.plate * (this.level.kind === 'estate' && this.sites.length && wide ? 0.74 : 0.5);
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
      pts.push(new THREE.Vector3(x, 0, z));
    }
    this.towers.slice().sort((a, b) => b.h - a.h).slice(0, 80)
      .forEach((t) => pts.push(new THREE.Vector3(t.x, BASE + t.h, t.z)));
    (this.hubLabels || []).forEach((o) => pts.push(o.position.clone().setY(o.position.y + 4)));
    const cam = this.camera.clone(), v = new THREE.Vector3(), up = new THREE.Vector3();
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const target = new THREE.Vector3(0, 0, 0);
    let dist = this.plate * 4;
    for (let k = 0; k < 6; k++) {
      cam.position.copy(target).addScaledVector(VIEW_DIR, dist);
      cam.lookAt(target);
      cam.updateMatrixWorld(true);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      pts.forEach((p) => { v.copy(p).project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); });
      up.setFromMatrixColumn(cam.matrixWorld, 1);
      target.y += ((y0 + y1) / 2) * tanV * dist / Math.max(0.3, up.y);
      dist *= Math.max(Math.max(-x0, x1) / 0.92, ((y1 - y0) / 2) / 0.84);
    }
    this.controls.maxDistance = Math.max(200, dist * 1.7);       /* zoomed out, the town still fills a good part of the stage */
    return { target, dist: clamp(dist, this.controls.minDistance, this.controls.maxDistance) };
  }
  resetView(soft) {
    this.userMoved = false;
    this.focusAt = null;
    const f = this._frame();
    this._flyTo(f.target, f.dist, soft ? 1800 : 2600, true);
  }
  zoom(f) {
    const tg = this.controls.target, dist = this.camera.position.distanceTo(tg);
    this.userMoved = true;
    this._flyTo(tg.clone(), clamp(dist * f, this.controls.minDistance, this.controls.maxDistance), 700, false, null, easeInOut);
  }
  /* Every focus move follows the jellyfish pulse; under reduced motion it is a cut. */
  _flyTo(target, dist, ms, standard, look, ease) {
    let dir = this.camera.position.clone().sub(this.controls.target).normalize();
    if (look) dir = look.clone();
    else if (standard || !isFinite(dir.x)) dir = VIEW_DIR.clone();
    if (dir.y < 0.3) { dir.y = 0.5; dir.normalize(); }
    this.flight = {
      t0: performance.now(), ms: REDUCED.matches ? 1 : (ms || 2400), ease: ease || ((t) => pulse(t, 0.015)),
      fromT: this.controls.target.clone(), toT: target.clone(),
      fromP: this.camera.position.clone(), toP: target.clone().addScaledVector(dir, dist)
    };
  }

  /* ================= walk the streets ================= */
  enterWalk() {
    if (this.walking || !this.towers.length || !this.interactive) return;
    if (!this.fp) {
      this.fp = new PointerLockControls(this.camera, this.renderer.domElement);
      this.scene.add(this.fp.object);
      this.keys = {};
      this._onKey = (e) => {
        const k = e.code;
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].indexOf(k) < 0) return;
        this.keys[k] = e.type === 'keydown';
        e.preventDefault();
      };
      this.fp.addEventListener('unlock', () => { if (this.walking) this.exitWalk(); });
    }
    this.stopTour(true); this.h.onTour(null);
    const t = this.controls.target, cp = this.camera.position;
    let sx = t.x + (cp.x - t.x) * 0.3, sz = t.z + (cp.z - t.z) * 0.3;
    const lim = this.plate * 0.44, dd = Math.hypot(sx, sz);
    if (dd > lim) { sx *= lim / dd; sz *= lim / dd; }
    const spot = this._freeSpotNear(sx, sz, 2.2);
    this.walking = true;
    this._shown = null;
    this.controls.enabled = false;
    this.flight = null;
    this.camera.position.set(spot.x, BASE + WALK_EYE, spot.z);
    this.camera.lookAt(t.x, BASE + WALK_EYE + 1, t.z);
    this.camera.near = 0.3; this.camera.updateProjectionMatrix();
    document.addEventListener('keydown', this._onKey);
    document.addEventListener('keyup', this._onKey);
    try {                                   /* the browser may refuse pointer lock; walking still works with the keys */
      const el = this.renderer.domElement, p = el.requestPointerLock && el.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* as above */ }
    this._setHover(null);
    this.h.onWalk(true);
  }
  exitWalk(quiet) {
    if (!this.walking) return;
    this.walking = false;
    this._shown = null;
    this.keys = {};
    document.removeEventListener('keydown', this._onKey);
    document.removeEventListener('keyup', this._onKey);
    if (this.fp && this.fp.isLocked) this.fp.unlock();
    this.controls.enabled = this.interactive;
    this.camera.near = 1; this.camera.updateProjectionMatrix();
    if (!quiet) this.resetView();
    this.h.onWalk(false);
  }
  _freeSpotNear(x, z, pad = 1.0) {
    for (let ring = 0; ring < 16; ring++) {
      const rad = ring * this.plate * 0.03, n = Math.max(1, ring * 6);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, px = x + Math.cos(a) * rad, pz = z + Math.sin(a) * rad;
        if (!this._blocked(px, pz, pad)) return { x: px, z: pz };
      }
    }
    return { x, z };
  }
  _blocked(x, z, pad) {
    for (const t of this.towers) {
      const half = t.w * 0.5 + pad;
      if (Math.abs(x - t.x) < half && Math.abs(z - t.z) < half) return true;
    }
    return false;
  }
  _stepWalk(dt) {
    const speed = (this.keys.ShiftLeft || this.keys.ShiftRight ? 30 : 13) * dt;
    let f = 0, r = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) f += 1;
    if (this.keys.KeyS || this.keys.ArrowDown) f -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) r += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) r -= 1;
    if (!f && !r) return;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
    const side = new THREE.Vector3().crossVectors(dir, YAXIS).normalize();
    const step = dir.multiplyScalar(f).add(side.multiplyScalar(r)).normalize().multiplyScalar(speed);
    const p = this.camera.position;
    if (!this._blocked(p.x + step.x, p.z, 0.6)) p.x += step.x;
    if (!this._blocked(p.x, p.z + step.z, 0.6)) p.z += step.z;
    const lim = this.plate * 0.5, d = Math.hypot(p.x, p.z);
    if (d > lim) { p.x *= lim / d; p.z *= lim / d; }
    p.y = BASE + WALK_EYE;
  }

  /* ================= interaction ================= */
  _bind() {
    const el = this.renderer.domElement;
    el.addEventListener('pointermove', (ev) => {
      const r = el.getBoundingClientRect();
      this.pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      this.pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      this.hasPointer = ev.pointerType === 'mouse' && this.interactive; this.lastEv = ev;
    });
    el.addEventListener('pointerleave', () => { this.hasPointer = false; this.pointer.set(-10, -10); this._setHover(null); });
    let down = null, moved = 0;
    el.addEventListener('pointerdown', (ev) => {
      down = { x: ev.clientX, y: ev.clientY }; moved = 0;
      if (ev.pointerType !== 'mouse') {
        const r = el.getBoundingClientRect();
        this.pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
        this.pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      }
    });
    el.addEventListener('pointermove', (ev) => { if (down) moved = Math.max(moved, Math.hypot(ev.clientX - down.x, ev.clientY - down.y)); });
    el.addEventListener('pointerup', (ev) => {
      if (down && moved < 6 && !this.walking && this.interactive) {
        if (ev.pointerType !== 'mouse') this._pick();
        if (this.hover) this._activate(this.hover);
        else this.clearSelection();
        if (ev.pointerType !== 'mouse') this._setHover(null);
      }
      down = null;
    });
    el.addEventListener('dblclick', () => {
      if (this.walking || !this.hover || !this.interactive) return;
      const t = this.hover.tower;
      if (t && t.type === 'project') this.h.onOpen(t.item.key);
    });
    this.host.addEventListener('wheel', (e) => {
      if (this.walking || this.full || e.ctrlKey || e.metaKey || !this.interactive) { if (!this.interactive) e.stopPropagation(); return; }   /* full screen: nothing else to scroll, so the wheel zooms */
      e.stopPropagation();
      this.hint.classList.add('on');
      clearTimeout(this._hintT);
      this._hintT = setTimeout(() => this.hint.classList.remove('on'), 1500);
    }, { capture: true, passive: true });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !this.host.isConnected || !this.interactive) return;
      if (this.walking) { this.exitWalk(); return; }
      if (this.tour || this.ride) { this.stopTour(); return; }
      const tag = (e.target && e.target.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag) || document.querySelector('dialog[open]')) return;
      if (this.selected || this.hoodSel) this.clearSelection();
      else this.up();
    });
    new ResizeObserver(() => this._resize()).observe(this.host);
    this._io = new IntersectionObserver((es) => { es.forEach((e) => { this.onScreen = e.isIntersecting; this._sync(); }); }, { rootMargin: '80px' });
    this._io.observe(this.host);
    document.addEventListener('visibilitychange', () => this._sync());
    this.onScreen = true;
    this._sync();
  }

  setFull(on) { this.full = !!on; }
  setInset(frac) { this.inset = frac || 0; this._applyInset(); }
  /* A preview (the Discover card) only watches: no picking, no dragging, no labels but the districts'. */
  setInteractive(on) {
    this.interactive = !!on;
    this.controls.enabled = this.interactive && !this.ride && !this.walking;
    this.renderer.domElement.style.pointerEvents = this.interactive ? '' : 'none';
    if (!on) { this._setHover(null); this.hasPointer = false; }
    this._shown = null;
    this.labels.forEach((o) => { o.userData.a = -1; });
  }
  _applyInset() {
    if (this.inset && this._w && this._h) this.camera.setViewOffset(this._w, this._h, 0, Math.round(this._h * this.inset * 0.66), this._w, this._h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }
  attach() {
    this._io.disconnect(); this._io.observe(this.host);
    this._resize(true); this._sync();
  }

  _activate(h) {
    const t = h.tower, ref = h.ref;
    if (ref) {
      if (ref.type === 'hood') return this.selectHood(ref.id);
      if (ref.type === 'site') return this.h.onOpenSite(ref.id);
      if (ref.type === 'flags') return ref.spot ? this.select(ref.spot.t.item.key) : null;
      if (ref.type === 'people' || ref.type === 'birds' || ref.type === 'boats') return t ? this.select(t.item.key) : null;
      if (ref.type === 'file' && ref.file) return this._selectFile(ref.file);
      if (ref.main) return this.select(ref.main.item.key);
      return null;
    }
    if (!t) return null;
    if (this.level.kind === 'estate') return this.select((t.main || t).item.key);
    if (t.district.target) return this.go(t.district.target);
    return this._selectFile(t.item);
  }
  _setHover(h) {
    const prev = this.hover;
    if (prev && h && prev.tower === h.tower && prev.ref === h.ref && prev.inst === h.inst && prev.file === h.file) { this._moveTip(); return; }
    if (prev && prev.tower && prev.tower !== this.selected) { prev.tower.litTarget = 0; prev.tower.liftTarget = 0; }
    this.hover = h;
    this._shown = null;
    if (h && h.tower) { if (h.tower !== this.selected) h.tower.litTarget = 1; h.tower.liftTarget = 1; }
    this.renderer.domElement.style.cursor = h ? 'pointer' : 'grab';
    this._previewPick();
    if (!h) { this.tip.classList.remove('on'); return; }
    const t = h.tower, ref = h.ref, file = h.file;
    let kind = '', title = '', text = '';
    if (ref && ref.type === 'flags') { if (ref.spot) { kind = 'Flag'; title = ref.spot.w; text = ref.spot.t.item.name + ' is built with ' + ref.spot.w + ', like other projects here.'; } }
    else if (ref && ref.type === 'people') { const w = ref.walkers[h.inst]; if (w) { kind = 'A recent change'; title = w.t.item.name; text = 'Each person is a change made in the last 30 days. ' + w.t.item.recent + (w.t.item.recent === 1 ? ' change' : ' changes') + ' here.'; } }
    else if (ref && ref.type === 'birds') { const b = ref.flock[h.inst]; if (b) { kind = 'Open issues'; title = b.t.item.name; text = b.t.item.issues + (b.t.item.issues === 1 ? ' issue or pull request is' : ' issues or pull requests are') + ' open. Each bird is one.'; } }
    else if (ref && ref.type === 'boats') { const tr = ref.trips[h.inst]; if (tr) { kind = 'Ferry to a live site'; title = tr.t.item.name; text = 'It runs at ' + tr.o.name + '.'; } }
    else if (ref) { kind = ref.kindLabel || ''; title = ref.title || ''; text = ref.text || ''; }
    else if (file) { kind = fileTypeLabel(file.file.p) + ' file · ' + fmtBytes(file.file.s); title = t.item.name; text = file.file.p; }
    else if (t && t.type === 'project') { kind = t.item.retired ? 'Retired: no longer in use' : (t.item.kindLabel || 'Project') + (t.item.demo ? ' · demo to try' : ''); title = t.item.name; text = t.item.tagline || ''; }
    else if (t) { kind = fileTypeLabel(t.item.path) + ' · ' + fmtBytes(t.item.size); title = t.item.name; text = t.district.target ? 'In ' + t.district.label + ' Select to go into the folder.' : t.item.path; }
    this.tip.textContent = '';
    const em = document.createElement('em'), b = document.createElement('b'), p = document.createElement('span');
    em.textContent = kind; b.textContent = title; p.textContent = text;
    this.tip.append(em, b, p);
    this.tip.classList.add('on');
    this._moveTip();
  }
  _moveTip() {
    const ev = this.lastEv;
    if (!ev) return;
    const w = this.tip.offsetWidth, x = ev.clientX + 16 + w > innerWidth - 8 ? ev.clientX - w - 14 : ev.clientX + 16;
    this.tip.style.left = Math.max(8, x) + 'px';
    this.tip.style.top = Math.max(8, ev.clientY + 16) + 'px';
  }
  _pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [];
    this.batches.forEach((b) => meshes.push(b.mesh));
    this.pickables.forEach((m) => { if (m.visible && m.parent) meshes.push(m); });
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    if (!hit) { this._setHover(null); return; }
    const ref = hit.object.userData.ref;
    if (ref) {
      if (ref.type === 'flags') { const spot = ref.spots[hit.instanceId]; this._setHover({ tower: spot ? spot.t : null, ref: { type: 'flags', spot }, inst: hit.instanceId }); return; }
      if (ref.type === 'people' || ref.type === 'birds' || ref.type === 'boats') {
        const e = (ref.walkers || ref.flock || ref.trips)[hit.instanceId];
        this._setHover({ tower: e ? e.t : null, ref, inst: hit.instanceId });
        return;
      }
      this._setHover({ tower: ref.main || null, ref });
      return;
    }
    let batch = null;
    this.batches.forEach((b) => { if (b.mesh === hit.object) batch = b; });
    const t = batch && batch.towers[hit.instanceId];
    if (!t || t.sinkTarget) { this._setHover(null); return; }
    this._setHover(t.main ? { tower: t.main, file: t } : { tower: t });
  }

  /* ================= the bot's anchor ================= */
  /* Where the bot (drawn by the page, over the canvas) should be: over the selected thing, or on the
     line's car. Sent in stage pixels whenever it moves. */
  _anchorKind(out) {
    if (this.walking || !this.interactive) return null;
    if (this.focusAt) { out.copy(this.focusAt); return 'focus'; }
    if (this.selected) { const t = this.selected; out.set(t.x, BASE + (t.curH || t.h) + 2.4, t.z); return 'focus'; }
    if (this.hoodSel) { const d = this.districts.find((x) => x.hood && x.hood.id === this.hoodSel); if (d && d.label_) { out.copy(d.label_.position); return 'focus'; } }
    if (this.level.kind === 'estate' && this.cable) { out.copy(this.cable.car.position); return 'car'; }
    return null;
  }
  _emitAnchor() {
    const kind = this._anchorKind(this._av);
    let msg = null;
    if (kind && this._w) {
      const v = this._av.clone().project(this.camera);
      msg = { kind, x: (v.x + 1) / 2 * this._w, y: (1 - v.y) / 2 * this._h, front: v.z < 1, flying: !!this.flight, ride: !!this.ride };
      if (kind === 'car' && this.cable) { msg.stroke = this.cable.stroke; msg.sdx = this.cable.strokeDir[0]; msg.sdy = this.cable.strokeDir[1]; msg.sms = this.cable.strokeMs; }
    }
    const a = this._lastAnchor;
    if (!msg && !a) return;
    if (msg && a && a.kind === msg.kind && Math.abs(a.x - msg.x) < 0.4 && Math.abs(a.y - msg.y) < 0.4 && a.flying === msg.flying && a.ride === msg.ride && a.stroke === msg.stroke) return;
    this._lastAnchor = msg;
    this.h.onAnchor(msg);
  }

  /* ================= loop ================= */
  _resize(force) {
    const r = this.host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (!force && w === this._w && h === this._h) return;
    this._w = w; this._h = h;
    this.renderer.setSize(w, h, false);
    this.labelRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    this._applyInset();
    if (!this.userMoved && !this.walking && !this.ride) this.resetView(true);
  }
  _sync() {
    const want = this.onScreen && document.visibilityState === 'visible' && this.host.isConnected;
    if (want && !this.running) { this.running = true; this._last = performance.now(); this._loop(); }
    else if (!want && this.running) {
      this.running = false;
      this.tip.classList.remove('on');
      if (this.walking && !this.host.isConnected) this.exitWalk(true);
    }
  }
  _writeBatches(now, dt) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    const kLift = 1 - Math.exp(-dt / 0.14), kLit = 1 - Math.exp(-dt / 0.17);
    this.batches.forEach((b) => {
      let animating = false, colours = false, lit = false;
      for (let i = 0; i < b.n; i++) {
        const t = b.towers[i];
        if (!t) continue;
        /* the cap eases to violet and back, about 0.6 s; the building lifts 5% under the pointer */
        const nl = t.lit + (t.litTarget - t.lit) * kLit;
        if (Math.abs(nl - t.lit) > 0.0005) { t.lit = nl; lit = true; } else if (t.lit !== t.litTarget && Math.abs(t.lit - t.litTarget) < 0.001) { t.lit = t.litTarget; lit = true; }
        b.lit[i] = t.lit;
        const nf = t.lift + (t.liftTarget - t.lift) * kLift;
        if (Math.abs(nf - t.lift) > 0.0005) { t.lift = nf; animating = true; }
        if (t.sink !== t.sinkTarget && now >= (t.sinkAt || 0)) {
          t.sink = REDUCED.matches ? t.sinkTarget : clamp(t.sink + Math.sign(t.sinkTarget - t.sink) * dt / 0.7, 0, 1);
          t.sinkE = t.sinkTarget ? settle(t.sink) : 1 - settle(1 - t.sink);
          animating = true; colours = true;
          if (t.extras) t.extras.forEach((o) => { o.visible = t.sink < 0.5; });
        }
        if (!b.dirty && !b.animating && !animating) continue;
        const intro = REDUCED.matches ? 1 : clamp((now - (t.t0 != null ? t.t0 : t.district.t0) - (t.jitter || 0)) / 1100, 0, 1);
        if (intro < 1) animating = true;
        const stg = clamp(intro * 1.6 - t.order * 0.4, 0, 1);
        const e = settle(stg);
        const hh = t.h * e * (1 + 0.05 * t.lift) * (1 - 0.58 * t.sinkE);
        t.curH = Math.max(0.03, hh);
        p.set(t.x, BASE, t.z);
        sc.set(t.w, t.curH, t.dd);
        q.setFromAxisAngle(YAXIS, t.rot || 0);
        m.compose(p, q, sc);
        b.mesh.setMatrixAt(i, m);
        if (t.roof) { t.roof.position.y = BASE + t.curH; const s = Math.max(0.001, backOut(clamp((e - 0.8) / 0.2, 0, 1))); if (Math.abs(t.roof.scale.x - s) > 0.0005) t.roof.scale.setScalar(s); }
        if (colours && !b.toneBatch) b.mesh.setColorAt(i, this._towerColour(t, col));
      }
      if (lit) b.litAttr.needsUpdate = true;
      if (!b.dirty && !b.animating && !animating) return;
      b.mesh.count = b.n;
      b.mesh.instanceMatrix.needsUpdate = true;
      if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
      b.mesh.boundingSphere = null;              /* picking tests against it: work it out again once the buildings move */
      b.dirty = false; b.animating = animating;
    });
  }
  _loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._loop());
    const now = performance.now();
    const dt = Math.min(0.05, (now - (this._last || now)) / 1000);
    this.frame++;
    if (this.fade) {
      const k = clamp((now - this.fade.t0) / 250, 0, 1);
      this.P = k >= 1 ? this.fade.to : lerpPalette(this.fade.from, this.fade.to, (0.5 - 0.5 * Math.cos(k * Math.PI)));
      this._paint();
      if (k >= 1) this.fade = null;
    }
    if (this.walking) this._stepWalk(dt);
    else if (this.flight) {
      const f = this.flight, t = Math.min(1, (now - f.t0) / f.ms), e = f.ease(t);
      this.controls.target.lerpVectors(f.fromT, f.toT, e);
      this.camera.position.lerpVectors(f.fromP, f.toP, e);
      if (t >= 1) this.flight = null;
    } else if (!this.userMoved && !REDUCED.matches && !this.selected && !this.hoodSel && !this.ride && !this.focusAt) {
      /* idle: an almost still drift, a few degrees over about 18 s, eased in and out */
      const w = (Math.PI * 2) / 18000, a = 0.05 * (Math.sin(now * w) - Math.sin((now - dt * 1000) * w));
      const off = this.camera.position.clone().sub(this.controls.target);
      off.applyAxisAngle(YAXIS, a);
      this.camera.position.copy(this.controls.target).add(off);
    }
    this._last = now;
    if (!this.walking) {
      const tg = this.controls.target, lim = this.plate * 0.82, d = Math.hypot(tg.x, tg.z);   /* the islands are inside it */
      if (d > lim) { tg.x *= lim / d; tg.z *= lim / d; }
      if (!this.ride) this.controls.update();
      /* the lowest view is street level: never under the table */
      if (tg.y < 0) tg.y = 0;
      const floor = BASE + WALK_EYE;
      if (this.camera.position.y < floor) this.camera.position.y = floor;
    }
    for (let i = this.later.length - 1; i >= 0; i--) if (now >= this.later[i].at) { const j = this.later.splice(i, 1)[0]; j.fn(); }
    this._writeBatches(now, dt);
    if (!REDUCED.matches) {
      this.uniforms.uTime.value = now / 1000;
      this.swings.forEach((s) => { s.o.rotation.y = s.base + Math.sin(now * 0.00022 + s.ph) * 0.4; });   /* a crane's jib swings slowly, back and forth */
      this._stepMovers(now, dt);
    }
    this._stepLine(now);
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i], k = clamp((now - a.t0) / 550, 0, 1);
      if (k <= 0) continue;
      a.o.scale.copy(a.o.userData.full).multiplyScalar(Math.max(0.001, backOut(k)));
      if (k >= 1) { a.o.scale.copy(a.o.userData.full); this.anims.splice(i, 1); }
    }
    if (this.siteObjs) this.siteObjs.forEach((o) => { const tgt = o.cap.userData.target || 1, s = o.cap.scale.x; if (Math.abs(tgt - s) > 0.002) o.cap.scale.setScalar(REDUCED.matches ? tgt : s + (tgt - s) * (1 - Math.exp(-dt / 0.2))); });
    const rt = (this.selected || this.tourRing) ? this.ringTarget : 0;
    this.ringA += (rt - this.ringA) * (REDUCED.matches ? 1 : 1 - Math.exp(-dt / 0.2));
    this.ringMat.opacity = 0.28 * this.ringA; this.dashMat.opacity = 0.3 * this.ringA;
    if (this.tour && !this.tour.paused && !this.flight && now - this.tour.t0 > 7000) this.tourStep(1);
    if (this.hasPointer && !this.flight && !this.walking && this.frame % 2 === 0) this._pick();
    else if (this.hover && this.hasPointer) this._moveTip();
    this._stepPreview(now, dt);
    this._updateLabels();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    if (this.prevObj.visible) this.prev.el.style.zIndex = '100000';
    this._emitAnchor();
  }

  _clear() {
    if (this.tour || this.ride) { this.tour = null; this.ride = null; this.tourRing = false; this.controls.enabled = this.interactive; this.h.onTour(null); }
    this.gen++;
    this.jobs = [];
    this._propFiles = 0;
    this._clearLinks();
    this.batches.forEach((b) => { this.rig.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.dispose(); });
    this.batches.clear();
    if (this.ground) { this.rig.remove(this.ground); this.ground.geometry.dispose(); this.ground = null; }
    if (this.groundEdge) { this.rig.remove(this.groundEdge); this.groundEdge.geometry.dispose(); this.groundEdge = null; }
    if (this.treeMesh) { this.rig.remove(this.treeMesh); this.treeMesh.dispose(); this.treeMesh = null; }
    this.props.traverse((o) => {
      if (!o.isMesh && !o.isLineSegments && !o.isLine) return;
      if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (!m || m.userData.keep || m === this.edgeMat || m === this.routeMat) return;
        if (m.map) m.map.dispose();
        if (m.bumpMap) m.bumpMap.dispose();
        m.dispose();
      });
    });
    this.rig.remove(this.props);
    this.props = new THREE.Group();
    this.rig.add(this.props);
    this.labels.forEach((o) => { this.rig.remove(o); if (o.element.parentNode) o.element.remove(); });
    this.painters = this.painters.filter((p) => p.keep);
    this.districts = []; this.towers = []; this.labels = []; this.pickables = []; this.anims = []; this.swings = []; this.later = []; this.movers = []; this.roofs = [];
    this.cable = null; this.trail = null; this.siteObjs = null; this.siteRoutes = null;
    this.selected = null; this.hoodSel = null; this.hover = null; this._shown = null; this.focusAt = null;
    this.prev.t = null; this.prev.a = 0;
    this.ringTarget = 0; this.ringA = 0;
    this.tip.classList.remove('on');
  }
}

/* Returns null when the browser cannot draw WebGL; the page then points to the Map. */
export function mountCity(host, handlers) {
  try {
    const p = document.createElement('canvas');
    if (!(p.getContext('webgl2') || p.getContext('webgl'))) return null;
  } catch (e) { return null; }
  try { return new City(host, handlers); }
  catch (e) { console.warn('The City could not start:', e); return null; }
}
