/* HelloWorld hub: the World view.
   Every project is a building on one dotted planet, grouped into regions by category.
   Loaded by hub.js with import('./world.js?v=1') when #/world opens.

   export mount(el, { projects, onOpen }) -> { update(projects), destroy() }

   What each thing stands for (nothing else is drawn):
     planet dots          the planet itself; a region's dots take its category colour
     building             a project; its form is the kind, its height the amount of code
     green beacon         the project has a demo
     mast with a ring     the project has a live site
     amber crane          status: in progress
     grey building        status: paused or retired
     small moons          changes in the last 30 days, up to 5
     violet lock          a private repo
     the bot moon         the hub itself, circling the planet */

import * as THREE from './vendor/three/three.module.min.js';
import { OrbitControls } from './vendor/three/addons/controls/OrbitControls.js';

const R = 10;                       // planet radius
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const W = 0.42;                     // building footprint
const TILT = 0.45;                  // the camera looks at a region from this far nearer the equator (radians)
const DEMO_GREEN = '#2ed47f';
const LIVE_WHITE = '#ffffff';
const CRANE_AMBER = '#f0b440';
const LOCK_VIOLET = '#c4b1ff';
const DOT_VIOLET = '#a98bff';
const MAX_SATELLITES = 5;

let cssLoaded = false;
function loadCss() {
  if (cssLoaded) return;
  cssLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./world.css?v=1', import.meta.url).href;
  document.head.appendChild(link);
}

const hasOwn = (o, k) => o != null && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function cfg() { return window.HW_CONFIG || {}; }
function catColour(id) {
  const cc = cfg().category_colours || {};
  const pair = hasOwn(cc, id) ? cc[id] : (cc._none || ['#8d89a0', '#77738a']);
  return pair[1];
}
function catLabel(id) { const c = cfg().categories || {}; return hasOwn(c, id) ? c[id] : 'Not sorted yet'; }
function kindLabel(id) { const k = cfg().kinds || {}; return hasOwn(k, id) ? k[id] : 'Project'; }
function statusLabel(id) { const s = cfg().statuses || {}; return hasOwn(s, id) ? s[id] : ''; }

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return true;
  } catch (e) { return false; }
}

const ICON_FULL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
const ICON_LIST = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>';
const ICON_KEY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>';

/* ---------------------------------------------------------------- textures */

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowTexture(hex) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const col = new THREE.Color(hex);
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${rgb},0.95)`);
  grad.addColorStop(0.25, `rgba(${rgb},0.45)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// The bot moon: the head and eyes are read from the hub's own logo in the page header.
function botPaths() {
  const head = document.querySelector('.hw-bot path[fill="currentColor"]');
  const eyes = Array.prototype.slice.call(document.querySelectorAll('.hw-bot .eye'), 0, 2);
  if (!head || eyes.length < 2) return null;
  return { head: head.getAttribute('d'), eyes: eyes.map((e) => e.getAttribute('d')) };
}

function drawBot(canvas, paths, blink) {
  const g = canvas.getContext('2d');
  const s = canvas.width / 306;
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.save();
  g.scale(s, s);
  g.translate(0, 13.2);
  if (paths && typeof Path2D === 'function') {
    const parts = paths.head.split(/Z(?=\s*M)/i);
    g.fillStyle = '#2a2340';
    g.fill(new Path2D(parts[0] + 'Z'));
    g.fillStyle = '#efeafc';
    g.fill(new Path2D(paths.head));
    g.fillStyle = DEMO_GREEN;
    paths.eyes.forEach((d) => {
      const p = new Path2D(d);
      if (blink) {
        // Squash the eye about its own middle (the eyes sit near y = 131).
        g.save(); g.translate(0, 131); g.scale(1, 0.12); g.translate(0, -131); g.fill(p); g.restore();
      } else g.fill(p);
    });
  } else {
    g.fillStyle = '#efeafc'; g.beginPath(); g.arc(153, 140, 120, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a2340'; g.beginPath(); g.arc(153, 140, 100, 0, Math.PI * 2); g.fill();
    g.fillStyle = DEMO_GREEN;
    g.fillRect(105, 100, 23, blink ? 6 : 60); g.fillRect(177, 100, 23, blink ? 6 : 60);
  }
  g.restore();
}

/* ---------------------------------------------------------------- layout */

function groupProjects(projects) {
  const ids = Object.keys(cfg().categories || {});
  const groups = [];
  ids.concat(['_none']).forEach((id) => {
    const items = projects.filter((p) => (id === '_none' ? !p.category || !hasOwn(cfg().categories, p.category) : p.category === id));
    if (items.length) {
      items.sort((a, b) => (b.size || 0) - (a.size || 0) || String(a.title).localeCompare(String(b.title)));
      groups.push({ id, items, label: catLabel(id === '_none' ? null : id), colour: catColour(id) });
    }
  });
  return groups;
}

function layoutRegions(groups, spacing) {
  const n = groups.length;
  groups.forEach((g, i) => {
    const y = n === 1 ? 0.18 : 0.62 - 1.24 * (i + 0.5) / n;
    const r = Math.sqrt(1 - y * y), th = i * GOLDEN * 1.4 + 0.9;
    g.dir = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).normalize();
    g.ang = spacing * Math.sqrt(g.items.length) + 0.1;
  });
  const axis = new THREE.Vector3();
  for (let it = 0; it < 120; it++) {
    let moved = false;
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const A = groups[a], B = groups[b];
        const d = A.dir.angleTo(B.dir), want = A.ang + B.ang + 0.1;
        if (d >= want) continue;
        axis.crossVectors(A.dir, B.dir);
        if (axis.lengthSq() < 1e-8) axis.set(0, 1, 0).cross(A.dir);
        axis.normalize();
        const step = (want - d) / 2 + 0.002;
        A.dir.applyAxisAngle(axis, -step).normalize();
        B.dir.applyAxisAngle(axis, step).normalize();
        moved = true;
      }
    }
    groups.forEach((g) => { g.dir.y = clamp(g.dir.y, -0.8, 0.8); g.dir.normalize(); });
    if (!moved) break;
  }
  // Buildings: a sunflower spiral around each region's centre, the biggest project in the middle.
  groups.forEach((g) => {
    const t1 = new THREE.Vector3(0, 1, 0).cross(g.dir);
    if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0);
    t1.normalize();
    const t2 = new THREE.Vector3().crossVectors(g.dir, t1).normalize();
    g.items.forEach((p, i) => {
      const rho = i === 0 ? 0 : spacing * Math.sqrt(i + 0.35);
      const phi = i * GOLDEN;
      const tangent = t1.clone().multiplyScalar(Math.cos(phi)).addScaledVector(t2, Math.sin(phi));
      p._dir = g.dir.clone().multiplyScalar(Math.cos(rho)).addScaledVector(tangent, Math.sin(rho)).normalize();
    });
  });
}

/* ---------------------------------------------------------------- buildings */

function heightFor(sizeKB) { return 0.5 + 0.55 * Math.log10(1 + Math.max(0, sizeKB || 0)); }

// A camera direction that shows the point `dir` above the middle of the view, from nearer the
// equator, so buildings there show their sides as well as their roofs.
function viewFrom(dir, tilt) {
  const south = new THREE.Vector3(0, -1, 0).addScaledVector(dir, dir.y);
  if (south.lengthSq() < 1e-6) south.set(0, 0, 1);
  south.normalize();
  return dir.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(south, Math.sin(tilt)).normalize();
}

function makeBuilding(p, mats, reduce) {
  const group = new THREE.Group();
  const h = heightFor(p.size);
  const kind = p.kind;
  const dull = p.status === 'paused' || p.status === 'retired';
  const body = mats.body(p.category || '_none', dull);
  const trim = mats.trim(p.category || '_none', dull);
  const add = (geo, mat, x, y, z, rx, ry, rz) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
    group.add(m);
    return m;
  };
  let top = h;

  add(new THREE.CylinderGeometry(W * 1.2, W * 1.32, 0.05, 18), trim, 0, 0.025, 0);
  switch (kind) {
    case 'web-app': {
      add(new THREE.BoxGeometry(W, h * 0.78, W), body, 0, h * 0.39, 0);
      add(new THREE.BoxGeometry(W * 0.64, h * 0.22, W * 0.64), body, 0, h * 0.89, 0);
      add(new THREE.BoxGeometry(W * 1.02, 0.025, W * 1.02), trim, 0, h * 0.78, 0);
      break;
    }
    case 'website': {
      const hh = h * 0.58;
      add(new THREE.BoxGeometry(W * 1.55, hh, W * 1.15), body, 0, hh / 2, 0);
      add(new THREE.BoxGeometry(W * 1.7, 0.045, W * 1.3), trim, 0, hh + 0.02, 0);
      top = hh + 0.05;
      break;
    }
    case 'plugin': {
      const hh = h * 0.62;
      add(new THREE.BoxGeometry(W * 1.1, hh, W * 1.1), body, 0, hh / 2, 0);
      add(new THREE.ConeGeometry(W * 0.84, h * 0.34, 4), trim, 0, hh + h * 0.17, 0, 0, Math.PI / 4, 0);
      top = hh + h * 0.34;
      break;
    }
    case 'theme': {
      const hh = h * 0.62;
      add(new THREE.CylinderGeometry(W * 0.74, W * 0.74, hh, 6), body, 0, hh / 2, 0);
      add(new THREE.ConeGeometry(W * 0.98, h * 0.3, 6), trim, 0, hh + h * 0.15, 0);
      top = hh + h * 0.3;
      break;
    }
    case 'game': {
      const base = h * 0.3, dome = Math.max(0.2, h * 0.55);
      add(new THREE.CylinderGeometry(W * 0.82, W * 0.82, base, 12), body, 0, base / 2, 0);
      const d = add(new THREE.SphereGeometry(W * 0.82, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), trim, 0, base, 0);
      d.scale.y = dome / (W * 0.82);
      top = base + dome;
      break;
    }
    case 'mobile': {
      add(new THREE.BoxGeometry(W * 0.62, h, W * 0.3), body, 0, h / 2, 0);
      add(new THREE.BoxGeometry(W * 0.5, h * 0.82, 0.01), trim, 0, h * 0.52, W * 0.155);
      break;
    }
    case 'library': {
      const step = h / 3;
      for (let k = 0; k < 3; k++) {
        const s = 1.3 - 0.27 * k;
        add(new THREE.BoxGeometry(W * s, step * 0.9, W * s), k % 2 ? trim : body, 0, step * (k + 0.45), 0);
      }
      break;
    }
    case 'scripts': {
      add(new THREE.CylinderGeometry(W * 0.4, W * 0.5, h * 0.88, 8), body, 0, h * 0.44, 0);
      add(new THREE.ConeGeometry(W * 0.42, h * 0.12, 8), trim, 0, h * 0.94, 0);
      break;
    }
    case 'docs': {
      const hh = h * 0.8;
      add(new THREE.BoxGeometry(0.05, hh, W * 1.15), body, -0.1, hh / 2, 0, 0, 0, 0.32);
      add(new THREE.BoxGeometry(0.05, hh, W * 1.15), trim, 0.1, hh / 2, 0, 0, 0, -0.32);
      top = hh * Math.cos(0.32);
      break;
    }
    case 'template': {
      const s = W * 0.55;
      [[-s, -s], [s, -s], [-s, s], [s, s]].forEach(([x, z]) => add(new THREE.BoxGeometry(0.045, h, 0.045), body, x, h / 2, z));
      add(new THREE.BoxGeometry(W * 1.15, 0.045, 0.045), trim, 0, h, -s);
      add(new THREE.BoxGeometry(W * 1.15, 0.045, 0.045), trim, 0, h, s);
      add(new THREE.BoxGeometry(0.045, 0.045, W * 1.15), trim, -s, h, 0);
      add(new THREE.BoxGeometry(0.045, 0.045, W * 1.15), trim, s, h, 0);
      add(new THREE.BoxGeometry(W * 1.15, 0.03, W * 1.15), trim, 0, h * 0.5, 0);
      break;
    }
    default: {
      add(new THREE.BoxGeometry(W, h * 0.9, W), body, 0, h * 0.45, 0);
      top = h * 0.9;
    }
  }

  const anim = { beacon: null, halo: null, ring: null, sats: [], phase: (hash(p.name) % 1000) / 1000 };

  // A demo: a green beacon on the roof.
  if (p.demo) {
    anim.beacon = add(new THREE.OctahedronGeometry(0.1), mats.basic(DEMO_GREEN), 0, top + 0.2, 0);
    const halo = new THREE.Sprite(mats.sprite('demo').clone());
    halo.userData.ownMaterial = true;
    halo.position.set(0, top + 0.2, 0);
    halo.scale.setScalar(0.75);
    group.add(halo);
    anim.halo = halo;
  }
  // A live site: a mast with a pulsing ring.
  if (p.live_url) {
    const mx = p.demo ? W * 0.42 : 0, mh = 0.5;
    add(new THREE.CylinderGeometry(0.014, 0.018, mh, 6), mats.basic(LIVE_WHITE), mx, top + mh / 2, 0);
    add(new THREE.SphereGeometry(0.04, 10, 8), mats.basic(LIVE_WHITE), mx, top + mh, 0);
    const ring = add(new THREE.RingGeometry(0.07, 0.095, 32), mats.ring(), mx, top + mh, 0, -Math.PI / 2, 0, 0);
    ring.material = mats.ring().clone();
    ring.userData.ownMaterial = true;
    anim.ring = ring;
    if (reduce) ring.scale.setScalar(1.8);
  }
  // In progress: an amber crane beside the building.
  if (p.status === 'in-progress') {
    const cx = -(W * 0.9 + 0.1), ch = top + 0.35, amber = mats.solid(CRANE_AMBER);
    add(new THREE.BoxGeometry(0.035, ch, 0.035), amber, cx, ch / 2, 0);
    add(new THREE.BoxGeometry(W * 1.9, 0.03, 0.03), amber, cx + W * 0.7, ch, 0);
    add(new THREE.BoxGeometry(0.08, 0.06, 0.06), amber, cx - 0.16, ch - 0.02, 0);
    add(new THREE.CylinderGeometry(0.005, 0.005, 0.28, 4), amber, cx + W * 1.45, ch - 0.14, 0);
  }
  // Private: a small violet lock on a corner of the roof.
  if (p.private) {
    const lx = -W * 0.32, lz = W * 0.32, ly = top + 0.04;
    add(new THREE.BoxGeometry(0.085, 0.065, 0.045), mats.solid(LOCK_VIOLET), lx, ly, lz);
    add(new THREE.TorusGeometry(0.028, 0.009, 6, 14, Math.PI), mats.solid(LOCK_VIOLET), lx, ly + 0.032, lz);
  }
  // Changes in the last 30 days: up to five small moons circling the building.
  const n = Math.min(MAX_SATELLITES, Math.max(0, p.recent || 0));
  for (let k = 0; k < n; k++) {
    const s = add(new THREE.SphereGeometry(0.035, 8, 6), mats.basic('#e9e3ff'), 0, 0, 0);
    s.userData.orbit = { r: W * 1.05 + 0.12, y: top * 0.55 + k * 0.07, a: (k / n) * Math.PI * 2 + anim.phase * 6 };
    s.position.set(Math.cos(s.userData.orbit.a) * s.userData.orbit.r, s.userData.orbit.y, Math.sin(s.userData.orbit.a) * s.userData.orbit.r);
    anim.sats.push(s);
  }

  // An invisible box for pointing at the building.
  const hitH = top + 0.45;
  const hit = new THREE.Mesh(new THREE.BoxGeometry(W * 1.9, hitH, W * 1.9), mats.hit());
  hit.position.y = hitH / 2;
  group.add(hit);

  return { group, hit, top, anim };
}

/* ---------------------------------------------------------------- materials (shared, disposed together) */

function makeMaterials() {
  const cache = new Map();
  const dot = dotTexture();
  const glows = { demo: glowTexture(DEMO_GREEN) };
  const keep = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
  const grey = new THREE.Color('#6b6878');
  return {
    dotTexture: dot,
    body: (id, dull) => keep('body:' + id + dull, () => {
      const c = new THREE.Color(catColour(id));
      if (dull) c.lerp(grey, 0.75);
      return new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.78), emissive: c, emissiveIntensity: dull ? 0.03 : 0.16, roughness: 0.55, metalness: 0.15, flatShading: true });
    }),
    trim: (id, dull) => keep('trim:' + id + dull, () => {
      const c = new THREE.Color(catColour(id));
      if (dull) c.lerp(grey, 0.75);
      return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: dull ? 0.05 : 0.3, roughness: 0.4, metalness: 0.1, flatShading: true });
    }),
    solid: (hex) => keep('solid:' + hex, () => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.45, roughness: 0.5, flatShading: true })),
    basic: (hex) => keep('basic:' + hex, () => new THREE.MeshBasicMaterial({ color: hex })),
    ring: () => keep('ring', () => new THREE.MeshBasicMaterial({ color: LIVE_WHITE, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })),
    sprite: (k) => keep('sprite:' + k, () => new THREE.SpriteMaterial({ map: glows[k], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })),
    hit: () => keep('hit', () => new THREE.MeshBasicMaterial({ visible: false })),
    select: () => keep('select', () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })),
    dispose() {
      cache.forEach((m) => m.dispose());
      cache.clear();
      dot.dispose();
      Object.keys(glows).forEach((k) => glows[k].dispose());
    }
  };
}

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material && o.userData.ownMaterial) o.material.dispose();
  });
}

/* ---------------------------------------------------------------- mount */

export function mount(el, opts) {
  opts = opts || {};
  const onOpen = typeof opts.onOpen === 'function' ? opts.onOpen : (route) => { location.hash = route.replace(/^#/, ''); };
  loadCss();
  el.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'hww';
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'World: every project as a building on a planet');
  el.appendChild(root);

  if (!webglAvailable()) {
    root.innerHTML = '<div class="hww-msg"><p>This browser cannot draw the World (WebGL is off or not supported).<br><a href="#/all">See every project as a list</a>.</p></div>';
    return { update() {}, destroy() { el.innerHTML = ''; } };
  }

  const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = reduceMq.matches;

  /* three.js basics */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    root.innerHTML = '<div class="hww-msg"><p>The World could not start a WebGL view here.<br><a href="#/all">See every project as a list</a>.</p></div>';
    return { update() {}, destroy() { el.innerHTML = ''; } };
  }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  root.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xd9ceff, 0x15121d, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(6, 9, 12);
  camera.add(sun);

  const mats = makeMaterials();

  /* the planet: an occluding core, the dots, a faint rim */
  const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.992, 64, 48), new THREE.MeshBasicMaterial({ color: '#17131f' }));
  core.userData.ownMaterial = true;
  scene.add(core);

  const DOTS = 5200;
  const dotPos = new Float32Array(DOTS * 3), dotCol = new Float32Array(DOTS * 3);
  const dotDirs = [];
  for (let i = 0; i < DOTS; i++) {
    const y = 1 - (i / (DOTS - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * GOLDEN;
    const d = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
    dotDirs.push(d);
    dotPos[i * 3] = d.x * R; dotPos[i * 3 + 1] = d.y * R; dotPos[i * 3 + 2] = d.z * R;
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
  dotGeo.setAttribute('color', new THREE.BufferAttribute(dotCol, 3));
  const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({ size: 0.15, sizeAttenuation: true, map: mats.dotTexture, alphaTest: 0.5, vertexColors: true }));
  dots.userData.ownMaterial = true;
  scene.add(dots);

  const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 48, 32), new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(DOT_VIOLET) } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 c; varying vec3 vN; void main(){ float k = pow(max(0.0, 0.66 - dot(vN, vec3(0.0, 0.0, 1.0))), 3.4); gl_FragColor = vec4(c, k * 0.38); }',
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
  }));
  rim.userData.ownMaterial = true;
  scene.add(rim);

  /* the bot moon */
  const paths = botPaths();
  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = moonCanvas.height = 256;
  drawBot(moonCanvas, paths, false);
  const moonTex = new THREE.CanvasTexture(moonCanvas);
  moonTex.colorSpace = THREE.SRGBColorSpace;
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true }));
  moon.userData.ownMaterial = true;
  moon.scale.setScalar(2.6);
  scene.add(moon);
  const MOON_ORBIT = { r: R * 1.95, tilt: 0.42 };
  function placeMoon(a) {
    moon.position.set(Math.cos(a) * MOON_ORBIT.r, Math.sin(a) * MOON_ORBIT.r * Math.sin(MOON_ORBIT.tilt), Math.sin(a) * MOON_ORBIT.r * Math.cos(MOON_ORBIT.tilt));
  }
  let moonAngle = 2.2;
  placeMoon(moonAngle);

  /* the selection ring, moved to whichever building is highlighted */
  const selRing = new THREE.Mesh(new THREE.RingGeometry(W * 1.5, W * 1.7, 40), mats.select());
  selRing.rotation.x = -Math.PI / 2;
  selRing.position.y = 0.06;
  selRing.visible = false;

  /* controls */
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.8;
  controls.minPolarAngle = 0.22;
  controls.maxPolarAngle = Math.PI - 0.22;
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = 0.35;
  let idleTimer = null;
  const pauseSpin = () => { controls.autoRotate = false; clearTimeout(idleTimer); };
  const resumeSpinLater = () => { clearTimeout(idleTimer); if (!reduce) idleTimer = setTimeout(() => { controls.autoRotate = true; }, 8000); };
  controls.addEventListener('start', () => { pauseSpin(); fly = null; });
  controls.addEventListener('end', resumeSpinLater);

  /* HTML: labels, tooltip, toolbar, panel, key, hint */
  const labels = document.createElement('div');
  labels.className = 'hww-labels';
  root.appendChild(labels);
  const tip = document.createElement('div');
  tip.className = 'hww-tip';
  tip.setAttribute('aria-hidden', 'true');
  root.appendChild(tip);
  const hint = document.createElement('div');
  hint.className = 'hww-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.textContent = 'Ctrl + scroll to zoom, or pinch';
  root.appendChild(hint);

  const uid = 'hww' + Math.random().toString(36).slice(2, 8);
  const tools = document.createElement('div');
  tools.className = 'hww-tools';
  tools.innerHTML =
    `<button type="button" class="hww-btn" data-act="panel" aria-controls="${uid}-panel" aria-expanded="true">${ICON_LIST}Projects</button>` +
    `<button type="button" class="hww-btn" data-act="key" aria-controls="${uid}-key" aria-expanded="true">${ICON_KEY}Key</button>` +
    (root.requestFullscreen ? `<button type="button" class="hww-btn" data-act="full" aria-pressed="false">${ICON_FULL}<span>Full screen</span></button>` : '');
  root.appendChild(tools);

  const panel = document.createElement('div');
  panel.className = 'hww-panel';
  panel.id = uid + '-panel';
  root.appendChild(panel);

  const key = document.createElement('div');
  key.className = 'hww-key';
  key.id = uid + '-key';
  key.innerHTML = '<h3>Key</h3><ul>' +
    '<li><span class="hww-sw" style="background:linear-gradient(180deg,#a98bff 0 40%,#6d44e0 40%)"></span><span><b>Building</b>: a project. Its shape is the kind; its height, the amount of code.</span></li>' +
    `<li><span class="hww-sw" style="background:${DEMO_GREEN};border-radius:50%"></span><span><b>Green beacon</b>: has a demo.</span></li>` +
    '<li><span class="hww-sw" style="border:2px solid #fff;border-radius:50%"></span><span><b>Mast and ring</b>: has a live site.</span></li>' +
    `<li><span class="hww-sw" style="background:${CRANE_AMBER}"></span><span><b>Crane</b>: in progress.</span></li>` +
    '<li><span class="hww-sw" style="background:#6b6878"></span><span><b>Grey</b>: paused or retired.</span></li>' +
    '<li><span class="hww-sw" style="background:#e9e3ff;border-radius:50%;transform:scale(.6)"></span><span><b>Small moons</b>: changes in the last 30 days, up to 5.</span></li>' +
    `<li><span class="hww-sw" style="background:${LOCK_VIOLET}"></span><span><b>Violet lock</b>: a private repo.</span></li>` +
    '<li><span class="hww-sw" style="background:#a98bff;border-radius:50%;opacity:.5"></span><span><b>Coloured ground</b>: the category.</span></li>' +
    '</ul>';
  root.appendChild(key);

  if (el.clientWidth < 720) {
    panel.hidden = true; key.hidden = true;
    tools.querySelector('[data-act="panel"]').setAttribute('aria-expanded', 'false');
    tools.querySelector('[data-act="key"]').setAttribute('aria-expanded', 'false');
  }

  /* state */
  let groups = [], items = [], hitboxes = [], regionLabels = [], hovered = -1, pinned = -1, fly = null;
  let world = new THREE.Group();
  scene.add(world);
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let fitDistance = R * 3.6;

  function build(projects) {
    // Clear the last build.
    clearHighlight();
    scene.remove(world);
    disposeTree(world);
    world = new THREE.Group();
    scene.add(world);
    labels.innerHTML = '';
    regionLabels = []; items = []; hitboxes = [];

    const list = (projects || []).filter((p) => p && p.name);
    if (!list.length) {
      panel.innerHTML = '';
      showMessage('No projects to show yet.');
      paintDots([]);
      return;
    }
    hideMessage();
    const spacing = Math.min(0.12, Math.sqrt(2.0 / list.length));
    groups = groupProjects(list);
    layoutRegions(groups, spacing);
    paintDots(groups);

    const up = new THREE.Vector3(0, 1, 0);
    groups.forEach((g) => {
      let maxTop = 0;
      g.items.forEach((p) => {
        const b = makeBuilding(p, mats, reduce);
        b.group.position.copy(p._dir).multiplyScalar(R);
        b.group.quaternion.setFromUnitVectors(up, p._dir);
        b.group.rotateY((hash(p.name) % 628) / 100);
        b.hit.userData.idx = items.length;
        world.add(b.group);
        hitboxes.push(b.hit);
        items.push({ p, g, b, dir: p._dir.clone() });
        maxTop = Math.max(maxTop, b.top);
      });
      const lab = document.createElement('div');
      lab.className = 'hww-region';
      lab.innerHTML = `<span class="hww-dot" style="background:${esc(g.colour)}"></span>${esc(g.label)} <small>${g.items.length}</small>`;
      labels.appendChild(lab);
      const lift = R + maxTop + 0.9;
      regionLabels.push({ el: lab, pos: g.dir.clone().multiplyScalar(lift), dir: g.dir.clone() });
    });
    buildPanel();
    // Frame the biggest region on first build.
    if (!camera.userData.placed) {
      const big = groups.slice().sort((a, b) => b.items.length - a.items.length)[0];
      camera.position.copy(viewFrom(big.dir, TILT).multiplyScalar(fitDistance));
      camera.userData.placed = true;
      controls.update();
    }
  }

  function paintDots(gs) {
    const base = new THREE.Color(DOT_VIOLET).multiplyScalar(0.36);
    const tint = gs.map((g) => new THREE.Color(g.colour).multiplyScalar(0.95));
    const c = new THREE.Color();
    for (let i = 0; i < DOTS; i++) {
      c.copy(base);
      let best = 0, bi = -1;
      for (let k = 0; k < gs.length; k++) {
        const d = dotDirs[i].angleTo(gs[k].dir);
        const f = 1 - smooth(gs[k].ang * 0.7, gs[k].ang + 0.06, d);
        if (f > best) { best = f; bi = k; }
      }
      if (bi >= 0) c.lerp(tint[bi], best);
      dotCol[i * 3] = c.r; dotCol[i * 3 + 1] = c.g; dotCol[i * 3 + 2] = c.b;
    }
    dotGeo.attributes.color.needsUpdate = true;
  }

  function buildPanel() {
    let html = `<div class="hww-panel-head"><h3>Projects</h3><span class="hww-count">${items.length}</span></div><div class="hww-list">`;
    groups.forEach((g) => {
      html += `<div class="hww-group"><span class="hww-dot" style="background:${esc(g.colour)}"></span>${esc(g.label)}</div>`;
      g.items.forEach((p) => {
        const i = items.findIndex((it) => it.p === p);
        const flags = (p.demo ? '<span class="hww-flag demo" title="Has a demo"></span>' : '') +
          (p.live_url ? '<span class="hww-flag live" title="Live site"></span>' : '') +
          (p.status === 'in-progress' ? '<span class="hww-flag wip" title="In progress"></span>' : '');
        html += `<button type="button" class="hww-item" data-i="${i}" aria-label="${esc(describe(p))}. Open the project."><span class="hww-t">${esc(p.title)}</span><span class="hww-flags" aria-hidden="true">${flags}</span></button>`;
      });
    });
    panel.innerHTML = html + '</div>';
  }

  function describe(p) {
    const bits = [p.title, catLabel(p.category), kindLabel(p.kind)];
    if (p.status) bits.push(statusLabel(p.status));
    if (p.demo) bits.push('has a demo');
    if (p.live_url) bits.push('live site');
    if (p.private) bits.push('private');
    if (p.recent) bits.push(p.recent + (p.recent === 1 ? ' change' : ' changes') + ' in 30 days');
    return bits.filter(Boolean).join(', ');
  }

  let msgEl = null;
  function showMessage(text) {
    if (!msgEl) { msgEl = document.createElement('div'); msgEl.className = 'hww-msg'; root.appendChild(msgEl); }
    msgEl.innerHTML = `<p>${esc(text)}</p>`;
  }
  function hideMessage() { if (msgEl) { msgEl.remove(); msgEl = null; } }

  /* highlight, tooltip, flying to a building */
  function setHighlight(i, how) {
    if (i === hovered && !how.fly) return;
    clearHighlight();
    if (i < 0 || !items[i]) return;
    hovered = i;
    const it = items[i];
    it.b.group.scale.setScalar(1.18);
    it.b.group.add(selRing);
    selRing.visible = true;
    const btn = panel.querySelector(`[data-i="${i}"]`);
    if (btn) btn.classList.add('is-on');
    const p = it.p;
    tip.innerHTML = `<b>${esc(p.title)}</b><span>${esc([catLabel(p.category), kindLabel(p.kind), statusLabel(p.status)].filter(Boolean).join(' · '))}</span>` +
      (p.demo || p.live_url || p.private || p.recent ? `<span><em>${esc([p.demo ? 'Has a demo' : '', p.live_url ? 'Live site' : '', p.private ? 'Private' : '', p.recent ? p.recent + ' changes in 30 days' : ''].filter(Boolean).join(' · '))}</em></span>` : '');
    tip.classList.add('is-on');
    root.classList.toggle('is-hover', how.pointer === true);
    if (how.pointer) placeTip(how.x, how.y);
    else pinned = i;
    if (how.fly) flyTo(it.dir);
  }
  function clearHighlight() {
    if (hovered >= 0 && items[hovered]) {
      items[hovered].b.group.scale.setScalar(1);
      const btn = panel.querySelector(`[data-i="${hovered}"]`);
      if (btn) btn.classList.remove('is-on');
    }
    if (selRing.parent) selRing.parent.remove(selRing);
    selRing.visible = false;
    hovered = -1; pinned = -1;
    tip.classList.remove('is-on');
    root.classList.remove('is-hover');
  }
  function placeTip(x, y) {
    const w = root.clientWidth, h = root.clientHeight, tw = tip.offsetWidth || 200, th = tip.offsetHeight || 60;
    tip.style.transform = `translate(${clamp(x + 16, 8, w - tw - 8)}px, ${clamp(y + 16, 8, h - th - 8)}px)`;
  }
  const tmpV = new THREE.Vector3();
  function project(v) {
    tmpV.copy(v).project(camera);
    return { x: (tmpV.x * 0.5 + 0.5) * root.clientWidth, y: (-tmpV.y * 0.5 + 0.5) * root.clientHeight };
  }
  function flyTo(dir) {
    pauseSpin();
    const dist = camera.position.length();
    const from = camera.position.clone().normalize();
    const to = viewFrom(dir, TILT * 0.9);
    if (reduce) { camera.position.copy(to.multiplyScalar(dist)); controls.update(); resumeSpinLater(); return; }
    fly = { q: new THREE.Quaternion().setFromUnitVectors(from, to), from, dist, t0: performance.now(), dur: 850 };
    resumeSpinLater();
  }

  /* pointer and wheel */
  let downAt = null;
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(hitboxes.concat([core]), false);
    if (!hits.length || hits[0].object === core) return -1;
    return hits[0].object.userData.idx;
  }
  function onMove(e) {
    if (e.buttons) { if (hovered >= 0 && pinned < 0) clearHighlight(); return; }
    const i = pick(e.clientX, e.clientY);
    const rect = root.getBoundingClientRect();
    if (i >= 0) setHighlight(i, { pointer: true, x: e.clientX - rect.left, y: e.clientY - rect.top });
    else if (hovered >= 0) clearHighlight();
  }
  function onDown(e) { downAt = { x: e.clientX, y: e.clientY }; }
  function onUp(e) {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 6) return;
    const i = pick(e.clientX, e.clientY);
    if (i >= 0) onOpen('#/p/' + encodeURIComponent(items[i].p.name));
  }
  function onLeave() { if (pinned < 0) clearHighlight(); }
  let hintTimer = null;
  function onWheel(e) {
    if (e.ctrlKey || e.metaKey) { pauseSpin(); resumeSpinLater(); return; }
    // A plain wheel scrolls the page: the controls never see it.
    e.stopPropagation();
    hint.classList.add('is-on');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hint.classList.remove('is-on'), 1400);
  }
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  root.addEventListener('wheel', onWheel, { capture: true, passive: true });

  /* panel and toolbar */
  function onPanelOver(e) {
    const b = e.target.closest('.hww-item');
    if (!b) return;
    const i = Number(b.getAttribute('data-i'));
    if (i !== hovered) setHighlight(i, { fly: true });
  }
  function onPanelFocus(e) { onPanelOver(e); }
  function onPanelOut(e) {
    const b = e.target.closest('.hww-item');
    if (b && !panel.contains(e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.hww-item') : null)) clearHighlight();
  }
  function onPanelClick(e) {
    const b = e.target.closest('.hww-item');
    if (b) { const it = items[Number(b.getAttribute('data-i'))]; if (it) onOpen('#/p/' + encodeURIComponent(it.p.name)); }
  }
  panel.addEventListener('mouseover', onPanelOver);
  panel.addEventListener('focusin', onPanelFocus);
  panel.addEventListener('mouseout', onPanelOut);
  panel.addEventListener('focusout', onPanelOut);
  panel.addEventListener('click', onPanelClick);

  function onTools(e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.getAttribute('data-act');
    if (act === 'panel' || act === 'key') {
      const box = act === 'panel' ? panel : key;
      box.hidden = !box.hidden;
      b.setAttribute('aria-expanded', String(!box.hidden));
      if (act === 'panel') resize();
    } else if (act === 'full') {
      if (document.fullscreenElement === root) document.exitFullscreen();
      else if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
    }
  }
  tools.addEventListener('click', onTools);
  function onFullChange() {
    const b = tools.querySelector('[data-act="full"]');
    if (!b) return;
    const on = document.fullscreenElement === root;
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('span').textContent = on ? 'Exit full screen' : 'Full screen';
  }
  document.addEventListener('fullscreenchange', onFullChange);

  /* size */
  // With the project list open on a wide stage, the planet is centred in the space beside it.
  function sideShift() {
    return !panel.hidden && root.clientWidth >= 720 ? Math.round((panel.offsetWidth + 12) / 2) : 0;
  }
  function resize() {
    const w = Math.max(1, root.clientWidth), h = Math.max(1, root.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const shift = sideShift();
    if (shift) camera.setViewOffset(w, h, -shift, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * Math.max(0.2, (w - 2 * shift) / h));
    fitDistance = (R + 3.0) / Math.sin(Math.min(vfov, hfov) / 2) * (w - 2 * shift < h * 0.8 ? 0.86 : 0.98);
    controls.minDistance = R * 1.45;
    controls.maxDistance = fitDistance * 1.6;
    if (!camera.userData.placed) camera.position.set(0, 0.35, 1).normalize().multiplyScalar(fitDistance);
    renderNow();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(root);

  /* the loop: runs only while the World is on screen and the tab is visible */
  let raf = 0, last = performance.now(), visible = true, blinkUntil = 0, nextBlink = performance.now() + 3000;
  const io = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; sync(); });
  io.observe(root);
  function onVis() { sync(); }
  document.addEventListener('visibilitychange', onVis);
  function onReduce() { reduce = reduceMq.matches; controls.autoRotate = !reduce; renderNow(); }
  if (reduceMq.addEventListener) reduceMq.addEventListener('change', onReduce);

  function sync() {
    const run = visible && !document.hidden;
    if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function animate(now, dt) {
    const t = now / 1000;
    if (!reduce) {
      moonAngle += dt * 0.06;
      placeMoon(moonAngle);
      if (now > nextBlink) { blinkUntil = now + 140; nextBlink = now + 3500 + Math.random() * 3500; drawBot(moonCanvas, paths, true); moonTex.needsUpdate = true; }
      else if (blinkUntil && now > blinkUntil) { blinkUntil = 0; drawBot(moonCanvas, paths, false); moonTex.needsUpdate = true; }
    }
    for (let i = 0; i < items.length; i++) {
      const a = items[i].b.anim;
      if (reduce) continue;
      if (a.halo) { const k = 0.5 + 0.5 * Math.sin(t * 2.6 + a.phase * 6); a.halo.scale.setScalar(0.6 + 0.35 * k); a.halo.material.opacity = 0.55 + 0.45 * k; }
      if (a.beacon) a.beacon.rotation.y = t * 1.4;
      if (a.ring) { const k = ((t / 2.2) + a.phase) % 1; a.ring.scale.setScalar(1 + 2.4 * k); a.ring.material.opacity = 0.85 * (1 - k); }
      for (let s = 0; s < a.sats.length; s++) {
        const o = a.sats[s].userData.orbit;
        const ang = o.a + t * 1.1;
        a.sats[s].position.set(Math.cos(ang) * o.r, o.y, Math.sin(ang) * o.r);
      }
    }
  }

  const camDir = new THREE.Vector3();
  function placeLabels() {
    camDir.copy(camera.position).normalize();
    for (let i = 0; i < regionLabels.length; i++) {
      const l = regionLabels[i];
      const facing = l.dir.dot(camDir);
      const op = smooth(0.25, 0.5, facing);
      if (op <= 0.01) { l.el.style.opacity = '0'; continue; }
      const s = project(l.pos);
      l.el.style.opacity = String(op);
      l.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
    if (pinned >= 0 && items[pinned]) {
      const it = items[pinned];
      const top = it.dir.clone().multiplyScalar(R + it.b.top + 0.3);
      const s = project(top);
      placeTip(s.x, s.y);
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (fly) {
      const k = ease(clamp((now - fly.t0) / fly.dur, 0, 1));
      const q = new THREE.Quaternion().slerp(fly.q, k);
      camera.position.copy(fly.from).applyQuaternion(q).multiplyScalar(fly.dist);
      if (k >= 1) fly = null;
    }
    controls.update(dt);
    animate(now, dt);
    placeLabels();
    renderer.render(scene, camera);
  }
  function renderNow() {
    controls.update();
    placeLabels();
    renderer.render(scene, camera);
  }

  resize();
  build(opts.projects || []);
  renderNow();
  sync();

  return {
    update(projects) { build(projects || []); renderNow(); },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(idleTimer); clearTimeout(hintTimer);
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('fullscreenchange', onFullChange);
      if (reduceMq.removeEventListener) reduceMq.removeEventListener('change', onReduce);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('wheel', onWheel, { capture: true });
      if (document.fullscreenElement === root) document.exitFullscreen().catch(() => {});
      controls.dispose();
      if (selRing.parent) selRing.parent.remove(selRing);
      selRing.geometry.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material && o.userData.ownMaterial) o.material.dispose();
      });
      moonTex.dispose();
      mats.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      el.innerHTML = '';
    }
  };
}
